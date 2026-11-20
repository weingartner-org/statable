/**
 * B4 Teil 3: latente Profile (lib/latent.ts) gegen Sollwerte aus Desktop-R (scripts/profile-erwartet.R: mclust EEI/VVI und ein eigener EM in Basis-R; der eigene EM darf nicht schlechter sein als mclust).
 * Gleiche log-Likelihood, BIC, Entropie, Gruppengrößen und Mittelwerte; das erzeugte R-Skript läuft in echtem R 4.6.1 (wenn da) und trifft dieselben Zahlen, auch mit bösem Spaltennamen und Fehlend-Code.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { baueProfilSkript, profilDaten, profilFit, profilRechne, type ProfilErgebnis, type LatentModell } from './latent';
import type { RSpalte } from './rskript';
import soll from './profile-erwartet.json';

type K = { K: number; ll: number; npar: number; bic: number; entropie: number | null; modal: number[]; mittel: Record<string, number>[]; mclust_ll: number; mclust_bic: number; mclust_npar: number };
type Fall = { n: number; gleich: K[]; frei: K[] };
const S = soll as unknown as { pinguine: Fall; sim: Fall & { daten: Record<string, number>[] } };

const csv = readFileSync(join(__dirname, '..', '..', 'public', 'beispiel', 'pinguine-antarktis.csv'), 'utf8').trim().split(/\r?\n/).map(z => z.split(';'));
const kopf = csv[0]!, ix = ['schnabel_laenge_mm', 'schnabel_tiefe_mm', 'flosse_mm', 'koerpermasse_g'].map(n => kopf.indexOf(n));
const pin = csv.slice(1).map(z => ix.map(i => (z[i] === '' || z[i] === 'NA' ? NaN : Number(z[i]!.replace(',', '.'))))).filter(z => z.every(Number.isFinite));
const sim = S.sim.daten.map(r => [r.a!, r.b!, r.c!]);
const rel = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));

function vergleiche(X: number[][], f: Fall, modell: LatentModell, ks: number[]) {
  expect(X.length).toBe(f.n);
  for (const k of ks) {
    const soll = f[modell][k - 1]!, l = profilFit(X, k, modell, 1)!;
    expect(l, `K=${k}`).not.toBeNull();
    expect(l.npar).toBe(soll.npar);
    rel(l.ll, soll.ll, 1e-7); rel(l.bic, soll.bic, 1e-7);
    if (k > 1) rel(l.entropie, soll.entropie!, 1e-5);
    // mclust darf nicht besser sein als die eigene Lösung
    expect(l.ll).toBeGreaterThanOrEqual(soll.mclust_ll - 1e-6 * Math.abs(soll.mclust_ll));
    expect([...l.zahl].sort((a, b) => b - a)).toEqual(soll.modal.map(Number));
    expect(l.zahl).toEqual(soll.modal.map(Number));
    l.mittel.forEach((m, g) => m.forEach((v, j) => rel(v, Object.values(soll.mittel[g]!)[j]!, 1e-4)));
  }
}

describe('Latente Profile gegen R', () => {
  it('Simulation (drei Gruppen), gleich: K = 1 bis 5', () => vergleiche(sim, S.sim, 'gleich', [1, 2, 3, 4, 5]));
  it('Simulation, frei: K = 1 bis 4', () => vergleiche(sim, S.sim, 'frei', [1, 2, 3, 4]));
  it('Pinguine (342), gleich: K = 1 bis 4', () => vergleiche(pin, S.pinguine, 'gleich', [1, 2, 3, 4]), 60000);
  it('Pinguine, frei: K = 2 bis 4', () => vergleiche(pin, S.pinguine, 'frei', [2, 3, 4]), 60000);
  it('Die Simulation hat drei Gruppen: BIC wählt 3 (frei), 300 Personen zugeordnet', () => {
    const e = profilRechne(sim, 'frei', 5, 1) as ProfilErgebnis;
    expect(e.bestK).toBe(3);
    expect(e.loesungen[2]!.zahl.reduce((a, b) => a + b, 0)).toBe(300);
    expect(e.loesungen[2]!.gruppe.length).toBe(300);
  });
  it('gleicher Startwert = gleiches Ergebnis', () => {
    expect(profilFit(sim, 3, 'gleich', 5)!.ll).toBe(profilFit(sim, 3, 'gleich', 5)!.ll);
  });
});

const sp = (name: string, art: RSpalte['art'] = 'zahl', fehlend: number[] = []): RSpalte => ({ name, bezeichnung: '', art, werteLabels: {}, fehlend });
describe('Daten für Profile', () => {
  it('nur vollständige Fälle; Fehlend-Code ist Lücke; Fehler', () => {
    const spalten = [sp('a'), sp('b', 'zahl', [99]), sp('t', 'text')];
    const z: (string | number | null)[][] = Array.from({ length: 60 }, (_, i) => [i, (i * 7) % 11, 'x']);
    z[3]![0] = null; z[4]![1] = 99;
    const d = profilDaten(spalten, z, ['a', 'b']); expect('fehler' in d).toBe(false);
    if (!('fehler' in d)) { expect(d.X.length).toBe(58); expect(d.weg).toBe(2); }
    expect(profilDaten(spalten, z, ['a'])).toEqual({ fehler: 'zu-wenig-spalten' });
    expect(profilDaten(spalten, z.slice(0, 20), ['a', 'b'])).toEqual({ fehler: 'zu-wenig-faelle' });
    const k = z.map(r => [5, r[1] ?? null, 'x']) as (string | number | null)[][]; expect(profilDaten(spalten, k, ['a', 'b'])).toEqual({ fehler: 'keine-streuung' });
  });
});

const RSCRIPT = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
const mitR = existsSync(RSCRIPT);
const tmp = mitR ? mkdtempSync(join(tmpdir(), 'profil-')) : '';
afterAll(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });
const BOESE = 'Item"1\'\n# system("x")';

describe.skipIf(!mitR)('R-Skript der Profile in echtem R', () => {
  for (const modell of ['gleich', 'frei'] as const) {
    it(`${modell}: Skript findet die besten log-Likelihoods (böser Spaltenname, Fehlend-Code)`, () => {
      const spalten: RSpalte[] = ['a', 'b', 'c'].map((n, j) => sp(j === 1 ? BOESE : n, 'zahl', [9999]));
      const zeilen = sim.map(z => [...z]); zeilen[0]![0] = 9999;   // eine Person fällt durch den Fehlend-Code weg
      const e = profilRechne(sim.slice(1), modell, 4, 7) as ProfilErgebnis;
      const sk = baueProfilSkript({ spalten, zeilen, benutzt: spalten.map(c => c.name), r: e, k: 3, titel: 'Profile', datum: '2026-11-14' });
      expect(sk.r).not.toContain('system("x")\n');
      writeFileSync(join(tmp, sk.csvName), sk.csv.replace(/9999/g, ''), 'utf8');
      writeFileSync(join(tmp, 'p.R'), sk.r + '\nf15 <- function(x) format(x, digits = 15); cat("LL", f15(vergleich$ll), "\n"); cat("BIC", f15(vergleich$bic), "\n"); cat("N", n, "\n"); cat("ZAHL", profil$anzahl, "\n"); cat("ZUORD", length(zuordnung), "\n")\n', 'utf8');
      const lauf = spawnSync(RSCRIPT, ['p.R'], { cwd: tmp, encoding: 'utf8' });
      expect(lauf.status, lauf.stderr).toBe(0);
      const z = (k: string) => (lauf.stdout.split('\n').find(l => l.startsWith(k + ' ')) ?? '').slice(k.length + 1).trim().split(/\s+/).map(Number);
      expect(z('N')[0]).toBe(299); expect(z('ZUORD')[0]).toBe(299);
      z('LL').forEach((v, i) => rel(v, e.loesungen[i]!.ll, 1e-6)); z('BIC').forEach((v, i) => rel(v, e.loesungen[i]!.bic, 1e-6));
      expect(z('ZAHL')).toEqual(e.loesungen[2]!.zahl);
    }, 300000);
  }
});
