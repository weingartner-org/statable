/**
 * B4 Teil 3b: latente Klassen (lib/klassen.ts) gegen Sollwerte aus Desktop-R (scripts/klassen-erwartet.R: poLCA und ein eigener EM in Basis-R;
 * der eigene EM darf nicht schlechter sein als poLCA). Gleiche log-Likelihood, BIC, Entropie, Klassengrößen und Antwortwahrscheinlichkeiten.
 */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { baueKlassenSkript, klassenDaten, klassenFit, klassenRechne, type KlassenErgebnis } from './klassen';
import type { RSpalte } from './rskript';
import soll from './klassen-erwartet.json';

type K = { K: number; ll: number; npar: number; bic: number; aic: number; entropie: number | null; modal: number[]; anteil: number[]; wahrsch: number[][][]; polca_ll: number; polca_bic: number; polca_npar: number };
type Fall = { n: number; spalten: string[]; kategorien: Record<string, number>; loesungen: K[]; daten: Record<string, number>[] };
const S = soll as unknown as { carcinoma: Fall; gss82: Fall };

const rel = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
const matrix = (f: Fall) => f.daten.map(r => f.spalten.map(s => r[s]! - 1));
const stufen = (f: Fall) => f.spalten.map(s => f.kategorien[s]!);

function vergleiche(f: Fall, ks: number[]) {
  const X = matrix(f), J = stufen(f);
  expect(X.length).toBe(f.n);
  for (const k of ks) {
    const s = f.loesungen[k - 1]!, l = klassenFit(X, J, k, 1)!;
    expect(l, `K=${k}`).not.toBeNull();
    expect(l.npar).toBe(s.npar);
    rel(l.ll, s.ll, 1e-7); rel(l.bic, s.bic, 1e-7);
    if (k > 1) rel(l.entropie, s.entropie!, 5e-4);
    expect(l.ll).toBeGreaterThanOrEqual(s.polca_ll - 1e-6 * Math.abs(s.polca_ll));
    expect(l.zahl).toEqual(s.modal.map(Number));
    l.wahrsch.forEach((kl, g) => kl.forEach((sp, j) => sp.forEach((v, c) => expect(Math.abs(v - s.wahrsch[g]![j]![c]!)).toBeLessThan(2e-3))));
  }
}

describe('Latente Klassen gegen R', () => {
  it('Carcinoma (118 Schnitte, 7 Gutachter): K = 1 bis 3', () => vergleiche(S.carcinoma, [1, 2, 3]), 60000);
  it('Carcinoma: K = 4 (poLCA-Wert wird erreicht)', () => vergleiche(S.carcinoma, [4]), 60000);
  it('GSS 1982 (Umfrage, 4 Fragen mit 3 bis 4 Stufen): K = 1 bis 3', () => vergleiche(S.gss82, [1, 2, 3]), 120000);
  it('Carcinoma: BIC wählt zwei Klassen, alle 118 zugeordnet', () => {
    const e = klassenRechne(matrix(S.carcinoma), stufen(S.carcinoma), 4, 1) as KlassenErgebnis;
    expect(e.bestK).toBe(S.carcinoma.loesungen.reduce((a, b) => (b.bic < a.bic ? b : a)).K);
    const l = e.loesungen[1]!;
    expect(l.zahl.reduce((a, b) => a + b, 0)).toBe(118);
    expect(l.gruppe.length).toBe(118);
  }, 60000);
  it('gleicher Startwert = gleiches Ergebnis', () => {
    const X = matrix(S.carcinoma), J = stufen(S.carcinoma);
    expect(klassenFit(X, J, 2, 5)!.ll).toBe(klassenFit(X, J, 2, 5)!.ll);
  });
});

const sp = (name: string, art: RSpalte['art'] = 'zahl', fehlend: number[] = []): RSpalte => ({ name, bezeichnung: '', art, werteLabels: {}, fehlend });
describe('Daten für Klassen', () => {
  it('nur vollständige Fälle; Fehlend-Code ist Lücke; Stufen geordnet; Fehler', () => {
    const spalten = [sp('a'), sp('b', 'zahl', [9]), sp('c', 'text')];
    const z: (string | number | null)[][] = Array.from({ length: 60 }, (_, i) => [i % 2, i === 3 ? 9 : i % 3, i % 2 ? 'ja' : 'nein']);
    const d = klassenDaten(spalten, z, ['a', 'b', 'c']);
    if ('fehler' in d) throw new Error(d.fehler);
    expect(d.weg).toBe(1); expect(d.X.length).toBe(59);
    expect(d.stufen[0]).toEqual([0, 1]); expect(d.stufen[2]).toEqual(['ja', 'nein']);
    expect(klassenDaten(spalten, z, ['a', 'b'])).toEqual({ fehler: 'zu-wenig-spalten' });
    expect(klassenDaten(spalten, z.slice(0, 20), ['a', 'b', 'c'])).toEqual({ fehler: 'zu-wenig-faelle' });
    const flach = z.map(r => [0, r[1], r[2]]);
    expect(klassenDaten(spalten, flach, ['a', 'b', 'c'])).toEqual({ fehler: 'keine-streuung' });
    const viele = Array.from({ length: 60 }, (_, i) => [i % 2, i % 9, 'x' + (i % 2)]);
    expect(klassenDaten([sp('a'), sp('b'), sp('c', 'text')], viele, ['a', 'b', 'c'])).toEqual({ fehler: 'zu-viele-stufen' });
  });
});

const RSCRIPT = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
const mitR = existsSync(RSCRIPT);
const tmp = mitR ? mkdtempSync(join(tmpdir(), 'klassen-')) : '';
afterAll(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });
const BOESE = 'Item"1\'\n# system("x")';

describe.skipIf(!mitR)('R-Skript der Klassen in echtem R', () => {
  it('Carcinoma: Skript findet die besten log-Likelihoods (böser Spaltenname, Fehlend-Code)', () => {
    const f = S.carcinoma, namen = f.spalten.map((n, j) => (j === 1 ? BOESE : n));
    const spalten: RSpalte[] = namen.map(n => sp(n, 'zahl', [9999]));
    const zeilen: (string | number | null)[][] = f.daten.map(r => f.spalten.map(s => r[s]!));
    zeilen[0]![0] = 9999;   // eine Person fällt durch den Fehlend-Code weg
    const d = klassenDaten(spalten, zeilen, namen);
    if ('fehler' in d) throw new Error(d.fehler);
    const e = klassenRechne(d.X, d.stufen.map(l => l.length), 3, 7) as KlassenErgebnis;
    const sk = baueKlassenSkript({ spalten, zeilen, benutzt: namen, r: e, k: 2, titel: 'Klassen', datum: '2026-11-14' });
    expect(sk.r).not.toContain('system("x")\n');
    writeFileSync(join(tmp, sk.csvName), sk.csv.replace(/9999/g, ''), 'utf8');
    writeFileSync(join(tmp, 'p.R'), sk.r + '\nf15 <- function(x) format(x, digits = 15); cat("LL", f15(vergleich$ll), "\\n"); cat("BIC", f15(vergleich$bic), "\\n"); cat("N", n, "\\n"); cat("ZAHL", klassen$anzahl, "\\n"); cat("ZUORD", length(zuordnung), "\\n")\n', 'utf8');
    const lauf = spawnSync(RSCRIPT, ['p.R'], { cwd: tmp, encoding: 'utf8' });
    expect(lauf.status, lauf.stderr).toBe(0);
    const z = (k: string) => (lauf.stdout.split('\n').find(l => l.startsWith(k + ' ')) ?? '').slice(k.length + 1).trim().split(/\s+/).map(Number);
    expect(z('N')[0]).toBe(117); expect(z('ZUORD')[0]).toBe(117);
    z('LL').forEach((v, i) => rel(v, e.loesungen[i]!.ll, 1e-6)); z('BIC').forEach((v, i) => rel(v, e.loesungen[i]!.bic, 1e-6));
    expect(z('ZAHL')).toEqual(e.loesungen[1]!.zahl);
  }, 600000);
});
