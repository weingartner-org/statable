/**
 * V5 Teil 3: Block „k-nächste Nachbarn“ mit eigenen Daten (lib/knnblock.ts).
 * Gegenprobe: Das erzeugte R-Skript läuft in ECHTEM R 4.6.1 (nur wenn Rscript da ist) und rechnet mit derselben Aufteilung nach;
 * Fehlerraten aller k, bestes k, Konfusionsmatrix, Trefferquote und Raten müssen gleich sein. Die R-Funktion ist ein zweiter, unabhängiger Weg
 * (in scripts/ml-erwartet.R gegen class::knn geprüft). Daten: Palmer-Pinguine (CC0) aus lib/ml-pinguine.ts.
 */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { baueKnnSkript, knnDaten, knnRechne, type KnnDaten } from './knnblock';
import type { RSpalte } from './rskript';
import { PINGUIN_ART, PINGUIN_GESCHLECHT, PINGUIN_MASSE, PINGUIN_SCHNABEL_LAENGE, PINGUIN_SCHNABEL_TIEFE, PINGUIN_FLOSSE } from './ml-pinguine';

const RSCRIPT = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
const mitR = existsSync(RSCRIPT);
const tmp = mitR ? mkdtempSync(join(tmpdir(), 'knnblock-')) : '';
afterAll(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });

/** Spalten wie in einem Projekt: Art als Code 1-3 mit Beschriftung, Geschlecht als Text, Maße als Zahl; Körpermasse mit Fehlend-Code 9999; ein böser Spaltenname. */
const BOESE = 'Schnabel\'tiefe"\\\n# system("x")';
const spalten: RSpalte[] = [
  { name: 'art', bezeichnung: 'Art', art: 'zahl', werteLabels: { '1': 'Adelie', '2': "Zügel'pinguin", '3': 'Esels' }, fehlend: [] },
  { name: 'geschlecht', bezeichnung: '', art: 'text', werteLabels: {}, fehlend: [] },
  { name: 'schnabel_laenge', bezeichnung: '', art: 'zahl', werteLabels: {}, fehlend: [] },
  { name: BOESE, bezeichnung: '', art: 'zahl', werteLabels: {}, fehlend: [] },
  { name: 'flosse', bezeichnung: '', art: 'zahl', werteLabels: {}, fehlend: [] },
  { name: 'masse', bezeichnung: '', art: 'zahl', werteLabels: {}, fehlend: [9999] }
];
const zeilen: (string | number | null)[][] = PINGUIN_ART.map((a, i) => [
  a === null ? null : a + 1,
  PINGUIN_GESCHLECHT[i] === null ? null : PINGUIN_GESCHLECHT[i] === 0 ? 'weiblich' : 'männlich',
  PINGUIN_SCHNABEL_LAENGE[i] ?? null, PINGUIN_SCHNABEL_TIEFE[i] ?? null, PINGUIN_FLOSSE[i] ?? null,
  i % 37 === 5 ? 9999 : (PINGUIN_MASSE[i] ?? null)
]);

function daten(ziel: string, m: string[]): KnnDaten {
  const d = knnDaten(spalten, zeilen, ziel, m);
  if ('fehler' in d) throw new Error(d.fehler);
  return d;
}

describe('knnDaten', () => {
  it('nimmt nur vollständige Fälle, Fehlend-Code zählt als Lücke, Klassen sortiert', () => {
    const d = daten('geschlecht', [BOESE, 'masse']);
    const soll = zeilen.filter(z => z[1] !== null && z[3] !== null && z[5] !== null && z[5] !== 9999).length;
    expect(d.X.length).toBe(soll);
    expect(d.weg).toBe(zeilen.length - soll);
    expect(d.klassen).toEqual(['männlich', 'weiblich']);
    const a = daten('art', ['schnabel_laenge', 'flosse']);
    expect(a.klassen).toEqual(['Adelie', "Zügel'pinguin", 'Esels']);
    expect(a.klassenWerte).toEqual([1, 2, 3]);
  });
  it('meldet zu wenige Fälle, eine Gruppe, keine Zahlen-Merkmale', () => {
    expect(knnDaten(spalten, zeilen.slice(0, 20), 'art', ['flosse'])).toEqual({ fehler: 'eine-klasse' });
    expect(knnDaten(spalten, zeilen.slice(140, 165), 'art', ['flosse'])).toEqual({ fehler: 'zu-wenig-faelle' });
    expect(knnDaten(spalten, zeilen, 'art', ['geschlecht'])).toEqual({ fehler: 'keine-merkmale' });
  });
  it('bleibt bei gleichem Startwert gleich, anderer Startwert teilt anders', () => {
    const d = daten('art', ['schnabel_laenge', 'flosse']);
    const a = knnRechne(d, 7, true), b = knnRechne(d, 7, true), c = knnRechne(d, 8, true);
    expect(a.training).toEqual(b.training);
    expect(a.erg.fehlerCV).toEqual(b.erg.fehlerCV);
    expect(c.training).not.toEqual(a.training);
    expect(a.training.length).toBe(Math.round(d.X.length * 0.7));
    expect(a.erg.fehlerTraining[0]).toBeLessThan(0.02);   // k = 1: fast kein Trainingsfehler (Überanpassung)
  });
});

describe.skipIf(!mitR)('Gegenprobe in R 4.6.1', () => {
  const faelle: { name: string; ziel: string; m: string[]; std: boolean; seed: number }[] = [
    { name: 'Art aus Schnabellänge und Flosse, standardisiert', ziel: 'art', m: ['schnabel_laenge', 'flosse'], std: true, seed: 1 },
    { name: 'Geschlecht aus Schnabeltiefe (böser Name) und Masse, standardisiert', ziel: 'geschlecht', m: [BOESE, 'masse'], std: true, seed: 42 },
    { name: 'Geschlecht aus Schnabeltiefe und Masse, ohne Standardisieren', ziel: 'geschlecht', m: [BOESE, 'masse'], std: false, seed: 3 },
    { name: 'Art aus vier Maßen', ziel: 'art', m: ['schnabel_laenge', BOESE, 'flosse', 'masse'], std: true, seed: 2026 }
  ];
  for (const f of faelle) it(f.name, () => {
    const d = daten(f.ziel, f.m), r = knnRechne(d, f.seed, f.std);
    const sk = baueKnnSkript({ spalten, zeilen, ziel: f.ziel, merkmale: f.m, d, r, standardisieren: f.std, startwert: f.seed, titel: 'Gegenprobe kNN', datum: '14.11.2026' });
    const ordner = mkdtempSync(join(tmp, 'f-'));
    const aus = `.a <- function(n, x) cat("@@", n, "=", paste(sprintf("%.12g", as.numeric(x)), collapse = ","), "\\n", sep = "")
.a("training", fehler$training); .a("cv", fehler$kreuzvalidierung); .a("test", fehler$test); .a("k", bestes_k)
.a("konf", t(unclass(konfusion))); .a("treffer", trefferquote); .a("raten", raten); .a("ntr", length(tr)); .a("nte", length(te))
.a("richtig", richtig_erkannt)\n`;
    writeFileSync(join(ordner, sk.csvName), sk.csv, 'utf8');
    writeFileSync(join(ordner, sk.rName), sk.r + '\n' + aus, 'utf8');
    const l = spawnSync(RSCRIPT, [sk.rName], { cwd: ordner, encoding: 'utf8' });
    expect(l.status, `Rscript: ${l.stderr}\n${sk.r}`).toBe(0);
    const w: Record<string, number[]> = {};
    for (const z of l.stdout.split(/\r?\n/)) { const m = /^@@(\w+)=(.*)$/.exec(z); if (m) w[m[1]!] = m[2]!.split(',').map(Number); }
    // Der böse Name darf keine Codezeile werden
    expect(l.stdout).not.toMatch(/system/);
    expect(w.ntr).toEqual([r.training.length]); expect(w.nte).toEqual([r.test.length]);
    const nah = (a: number[], b: number[]) => { expect(a.length).toBe(b.length); a.forEach((v, i) => expect(Math.abs(v - b[i]!)).toBeLessThan(1e-12)); };
    nah(w.training!, r.erg.fehlerTraining); nah(w.cv!, r.erg.fehlerCV); nah(w.test!, r.erg.fehlerTest);
    expect(w.k).toEqual([r.erg.bestesK]);
    expect(w.konf).toEqual(r.konf.flat());
    nah(w.treffer!, [r.trefferquote]); nah(w.raten!, [r.raten]);
    nah(w.richtig!.map(v => (Number.isFinite(v) ? v : -1)), r.richtig.map(v => (Number.isFinite(v) ? v : -1)));
  }, 120_000);
});
