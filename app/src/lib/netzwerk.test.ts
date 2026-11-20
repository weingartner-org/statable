/**
 * B4 Teil 2: Partialkorrelationsnetz (lib/netzwerk.ts) gegen Sollwerte aus Desktop-R (scripts/netzwerk-erwartet.R, zwei Wege: Inverse und Regressionsreste, dritter: corpcor).
 * Punktschätzer, p-Werte, Holm und Stärke müssen bis 1e-9 stimmen; der Bootstrap zieht andere Fälle als R, darum Toleranz 0,04 gegen 20000 Ziehungen in R.
 * Das erzeugte R-Skript läuft in echtem R 4.6.1 (wenn da) und trifft dieselben Zahlen, auch mit bösem Spaltennamen und Fehlend-Code.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { baueNetzSkript, netzDaten, netzRechne, partialMatrix, ziehungenFuer, type NetzErgebnis } from './netzwerk';
import type { RSpalte } from './rskript';
import soll from './netzwerk-erwartet.json';

type Fall = { n: number[]; k: number[]; namen: string[]; von: number[]; nach: number[]; partial: number[]; p: number[]; p_holm: number[]; staerke: number[]; einfluss: number[]; kante_lo?: number[]; kante_hi?: number[]; staerke_lo?: number[]; staerke_hi?: number[] };
const S = soll as unknown as { A: Fall; B: Fall; C: Fall; simdaten: number[][] };

const csv = readFileSync(join(__dirname, 'testdaten', 'bfi-ausschnitt.csv'), 'utf8').trim().split(/\r?\n/).map(z => z.split(';'));
const kopf = csv[0]!;
const bfi = csv.slice(1).map(z => z.map(v => (v === '' ? null : Number(v.replace(',', '.'))))).filter(z => z.every(v => v !== null)) as number[][];
// simdaten: Liste von 6 Spalten (jsonlite schreibt jede Spalte als Liste von Zahlen)
const simSpalten = S.simdaten.map(sp => (Array.isArray(sp) ? sp : [sp]).map(Number));
const simZeilen = Array.from({ length: simSpalten[0]!.length }, (_, i) => simSpalten.map(sp => sp[i]!));
const nah = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);

function vergleich(e: NetzErgebnis, f: Fall) {
  expect(e.n).toBe(f.n[0]); expect(e.k).toBe(f.k[0]);
  expect(e.kanten.length).toBe(f.partial.length);
  e.kanten.forEach((c, q) => {
    expect(c.i + 1).toBe(f.von[q]); expect(c.j + 1).toBe(f.nach[q]);
    nah(c.r, f.partial[q]!); nah(c.p, f.p[q]!, 1e-8); nah(c.pHolm, f.p_holm[q]!, 1e-8);
  });
  e.staerke.forEach((v, i) => { nah(v, f.staerke[i]!); nah(e.einfluss[i]!, f.einfluss[i]!); });
}

describe('Partialkorrelationsnetz gegen R', () => {
  it('Fall A (BFI, Pearson): Kanten, p, Holm, Stärke, erwarteter Einfluss', () => {
    expect(bfi.length).toBe(S.A.n[0]);
    const e = netzRechne(bfi, 'pearson', 1, 100) as NetzErgebnis; expect('fehler' in e).toBe(false); vergleich(e, S.A);
  });
  it('Fall B (BFI, Spearman)', () => { vergleich(netzRechne(bfi, 'spearman', 1, 100) as NetzErgebnis, S.B); });
  it('Fall C (Simulation, 6 Spalten)', () => { vergleich(netzRechne(simZeilen, 'pearson', 1, 100) as NetzErgebnis, S.C); });
  it('Bootstrap-Intervalle liegen nahe an R (20000 Ziehungen) und bei gleichem Startwert genau gleich', () => {
    const e = netzRechne(bfi, 'pearson', 3, 1000) as NetzErgebnis, e2 = netzRechne(bfi, 'pearson', 3, 1000) as NetzErgebnis;
    expect(e.gueltig).toBe(1000);
    e.kanten.forEach((c, q) => { nah(c.lo, S.A.kante_lo![q]!, 0.04); nah(c.hi, S.A.kante_hi![q]!, 0.04); expect(c.lo).toBe(e2.kanten[q]!.lo); });
    e.staerke.forEach((_, i) => { nah(e.staerkeLo[i]!, S.A.staerke_lo![i]!, 0.08); nah(e.staerkeHi[i]!, S.A.staerke_hi![i]!, 0.08); });
    const es = netzRechne(bfi, 'spearman', 3, 1000) as NetzErgebnis;
    es.kanten.forEach((c, q) => { nah(c.lo, S.B.kante_lo![q]!, 0.04); nah(c.hi, S.B.kante_hi![q]!, 0.04); });
  });
  it('Einzelmatrix: symmetrisch, Diagonale 0; keine Streuung oder abhängige Spalte gibt null', () => {
    const M = partialMatrix(bfi, 'pearson')!; expect(M[2]![5]).toBe(M[5]![2]); expect(M[3]![3]).toBe(0);
    expect(partialMatrix(bfi.map(z => [z[0]!, z[1]!, 5]), 'pearson')).toBeNull();
    expect(partialMatrix(bfi.map(z => [z[0]!, z[1]!, z[0]! * 2]), 'pearson')).toBeNull();
    expect('fehler' in netzRechne(bfi.map(z => [z[0]!, z[1]!, z[0]! * 2]), 'pearson', 1, 50)).toBe(true);
  });
  it('Ziehungen werden bei großen Daten weniger', () => { expect(ziehungenFuer(400, 9)).toBe(1000); expect(ziehungenFuer(3000, 9)).toBe(500); expect(ziehungenFuer(20000, 15)).toBe(200); });
});

const sp = (name: string, art: RSpalte['art'] = 'zahl', fehlend: number[] = []): RSpalte => ({ name, bezeichnung: '', art, werteLabels: {}, fehlend });
describe('Daten für das Netz', () => {
  it('nur vollständige Fälle mit Zahlen; Fehlend-Codes zählen als Lücke', () => {
    const spalten = [sp('a'), sp('b'), sp('c', 'zahl', [99]), sp('t', 'text')];
    const z: (string | number | null)[][] = Array.from({ length: 60 }, (_, i) => [i, (i * 7) % 11, (i * 5) % 13, 'x']);
    z[3]![1] = null; z[4]![2] = 99;
    const d = netzDaten(spalten, z, ['a', 'b', 'c']); expect('fehler' in d).toBe(false);
    if (!('fehler' in d)) { expect(d.X.length).toBe(58); expect(d.weg).toBe(2); }
  });
  it('Fehler: zu wenige Spalten, Text, zu wenige Fälle', () => {
    const spalten = [sp('a'), sp('b'), sp('c'), sp('t', 'text')];
    const z: (string | number | null)[][] = Array.from({ length: 60 }, (_, i) => [i, i % 5, i % 7, 'x']);
    expect(netzDaten(spalten, z, ['a', 'b'])).toEqual({ fehler: 'zu-wenig-spalten' });
    expect(netzDaten(spalten, z, ['a', 'b', 't'])).toEqual({ fehler: 'zu-wenig-spalten' });
    expect(netzDaten(spalten, z.slice(0, 20), ['a', 'b', 'c'])).toEqual({ fehler: 'zu-wenig-faelle' });
  });
});

const RSCRIPT = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
const mitR = existsSync(RSCRIPT);
const tmp = mitR ? mkdtempSync(join(tmpdir(), 'netz-')) : '';
afterAll(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });
const BOESE = 'Item"1\'\\n# system("x")';

describe.skipIf(!mitR)('R-Skript des Netzes in echtem R', () => {
  for (const art of ['pearson', 'spearman'] as const) {
    it(`${art}: Skript trifft die Sollwerte (böser Spaltenname, Fehlend-Code)`, () => {
      const spalten: RSpalte[] = kopf.map((n, j) => sp(j === 2 ? BOESE : n, 'zahl', [9999]));
      const zeilen = bfi.map(z => [...z]); zeilen[0]![0] = 9999;   // eine Person fällt durch den Fehlend-Code weg
      const e = netzRechne(bfi.slice(1), art, 7, 200) as NetzErgebnis;
      const sk = baueNetzSkript({ spalten, zeilen, benutzt: spalten.map(c => c.name), r: e, titel: 'Netz', datum: '2026-11-14' });
      expect(sk.r).not.toContain('system("x")\n');
      writeFileSync(join(tmp, sk.csvName), sk.csv.replace(/9999/g, ''), 'utf8');
      writeFileSync(join(tmp, 'netz.R'), sk.r + '\nf15 <- function(x) format(x, digits = 15); cat("KANTEN", f15(kanten$partial), "\\n"); cat("STAERKE", f15(zentral$staerke), "\\n"); cat("PH", f15(kanten$p_holm), "\\n"); cat("N", n, "\\n")\n', 'utf8');
      const lauf = spawnSync(RSCRIPT, ['netz.R'], { cwd: tmp, encoding: 'utf8' });
      expect(lauf.status, lauf.stderr).toBe(0);
      const z = (k: string) => (lauf.stdout.split('\n').find(l => l.startsWith(k + ' ')) ?? '').slice(k.length + 1).trim().split(/\s+/).map(Number);
      const f = art === 'pearson' ? S.A : S.B;
      expect(z('N')[0]).toBe(f.n[0]! - 1);
      // Die Skript-Ausgabe steht zweimal (vor und nach dem Bootstrap); cat der letzten Zeilen sind die Werte nach cbind, partial bleibt gleich
      z('KANTEN').forEach((v, q) => nah(v, e.kanten[q]!.r, 1e-9)); z('STAERKE').forEach((v, i) => nah(v, e.staerke[i]!, 1e-9)); z('PH').forEach((v, q) => nah(v, e.kanten[q]!.pHolm, 1e-8));
    }, 120000);
  }
});
