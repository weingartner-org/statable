/**
 * B2 Teil 2b: Daten für den Instrumentvariablen-Block (vollständige Fälle, Fehler) und das R-Skript in echtem R 4.6.1 (wenn da)
 * gegen die Sollwerte aus Desktop-R (scripts/iv-erwartet.R: AER::ivreg, sandwich, zweiter Weg von Hand), auch mit bösem Spaltennamen und Fehlend-Code.
 * Beispieldatei public/beispiel/zigaretten-steuern.csv (Logarithmen aus zigaretten.csv).
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { ivDaten, ivBlockRechne, baueIvSkript } from './ivblock';
import type { IvErgebnis } from './iv';
import type { RSpalte } from './rskript';
import soll from './iv-erwartet.json';

const S = soll as any;
const csv = readFileSync(join(__dirname, '..', '..', 'public', 'beispiel', 'zigaretten-steuern.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map(z => z.split(';').map((v, i) => (i === 0 ? v : Number(v.replace(',', '.')))));
const sp = (name: string, art: RSpalte['art'] = 'zahl', fehlend: number[] = []): RSpalte => ({ name, bezeichnung: '', art, werteLabels: {}, fehlend });
const nah = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b) / Math.max(1, Math.abs(b))).toBeLessThan(tol);
const SPALTEN = [sp('staat', 'text'), sp('lpackungen'), sp('lpreis', 'zahl', [-9]), sp('leinkommen'), sp('steuerdifferenz'), sp('steuer')];

describe('Daten für den Instrumentvariablen-Block', () => {
  it('vollständige Fälle; Fehlend-Code und Lücke zählen als Lücke', () => {
    const z: (string | number | null)[][] = csv.map(r => [...r]); z[3]![2] = -9; z[4]![4] = null;
    const d = ivDaten(SPALTEN, z, 'lpackungen', ['lpreis'], ['leinkommen'], ['steuerdifferenz']);
    if ('fehler' in d) throw new Error(d.fehler);
    expect(d.y.length).toBe(46); expect(d.weg).toBe(2); expect(d.endoNamen).toEqual(['lpreis']); expect(d.exoNamen).toEqual(['leinkommen']);
  });
  it('Fehler: nichts gewählt, Text-Spalte, doppelte Wahl', () => {
    expect(ivDaten(SPALTEN, csv, 'lpackungen', ['lpreis'], [], [])).toEqual({ fehler: 'keine-auswahl' });
    expect(ivDaten(SPALTEN, csv, 'lpackungen', ['staat'], [], ['steuer'])).toEqual({ fehler: 'keine-auswahl' });
    expect(ivDaten(SPALTEN, csv, 'lpackungen', ['lpreis'], ['steuer'], ['steuer'])).toEqual({ fehler: 'doppelt' });
  });
  it('weniger Instrumente als endogene Größen', () => {
    const d = ivDaten(SPALTEN, csv, 'lpackungen', ['lpreis', 'leinkommen'], [], ['steuer']);
    if ('fehler' in d) throw new Error(d.fehler);
    expect(ivBlockRechne(d)).toEqual({ fehler: 'zu-wenig-instrumente' });
  });
  it('rechnet wie der Kern (Sollwerte aus R)', () => {
    const d = ivDaten(SPALTEN, csv, 'lpackungen', ['lpreis'], ['leinkommen'], ['steuerdifferenz', 'steuer']);
    if ('fehler' in d) throw new Error(d.fehler);
    const e = ivBlockRechne(d) as IvErgebnis; nah(e.koef[1]!.b, S.zweiIV.b[1]); nah(e.sargan!.chi2, S.zweiIV.sargan.chi2);
  });
});

const RSCRIPT = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
const mitR = existsSync(RSCRIPT);
const tmp = mitR ? mkdtempSync(join(tmpdir(), 'iv-')) : '';
afterAll(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });
const BOESE = 'Wert"1\'\\n# system("x")';

describe.skipIf(!mitR)('R-Skript des Instrumentvariablen-Blocks in echtem R', () => {
  for (const [fall, inst, f] of [['ein Instrument', ['steuerdifferenz'], S.einIV], ['zwei Instrumente (Sargan)', ['steuerdifferenz', 'steuer'], S.zweiIV]] as const) {
    it(`${fall}: Skript trifft die Sollwerte (böser Spaltenname, Fehlend-Code)`, () => {
      const spalten: RSpalte[] = [sp('staat', 'text'), sp('lpackungen'), sp(BOESE, 'zahl', [-9]), sp('leinkommen'), sp('steuerdifferenz'), sp('steuer')];
      const zeilen: (string | number | null)[][] = csv.map(r => [...r]);
      zeilen.push(['XX', 4, -9, 2, 1, 1]);   // fällt durch den Fehlend-Code weg
      const d = ivDaten(spalten, zeilen, 'lpackungen', [BOESE], ['leinkommen'], [...inst]);
      if ('fehler' in d) throw new Error(d.fehler);
      const e = ivBlockRechne(d) as IvErgebnis;
      expect(e.n).toBe(48);
      const sk = baueIvSkript({ spalten, zeilen, ziel: 'lpackungen', endo: [BOESE], exo: ['leinkommen'], inst: [...inst], r: e, titel: 'IV', datum: '2026-11-14' });
      expect(sk.r).not.toContain('system("x")\n');
      writeFileSync(join(tmp, sk.csvName), sk.csv.replace(/-9(?=,|\n)/g, ''), 'utf8');
      writeFileSync(join(tmp, 'p.R'), sk.r + '\nf15 <- function(x) format(x, digits = 15); cat("N", n, "\\n"); cat("B", f15(iv$b), "\\n"); cat("SE", f15(iv$se), "\\n"); cat("SER", f15(iv$se_robust), "\\n"); cat("OB", f15(ols$b), "\\n"); cat("OSE", f15(ols$se), "\\n"); cat("EF", f15(erste$F), "\\n"); cat("EDF", erste$df1, erste$df2, "\\n"); cat("ER2", f15(erste$r2), "\\n"); cat("WU", f15(wu$F), f15(wu$p), "\\n"); cat("SIG", f15(sigma), f15(r2), "\\n"); if (!is.null(sargan)) cat("SA", f15(sargan$chi2), sargan$df, f15(sargan$p), "\\n")\n', 'utf8');
      const lauf = spawnSync(RSCRIPT, ['p.R'], { cwd: tmp, encoding: 'utf8' });
      expect(lauf.status, lauf.stderr).toBe(0);
      const z = (k: string) => (lauf.stdout.split('\n').find(l => l.startsWith(k + ' ')) ?? '').slice(k.length + 1).trim().split(/\s+/).map(Number);
      expect(z('N')[0]).toBe(f.n);
      z('B').forEach((v, i) => nah(v, f.b[i], 1e-9)); z('SE').forEach((v, i) => nah(v, f.se[i], 1e-9)); z('SER').forEach((v, i) => nah(v, f.seRobust[i], 1e-9));
      z('OB').forEach((v, i) => nah(v, f.ols.b[i], 1e-9)); z('OSE').forEach((v, i) => nah(v, f.ols.se[i], 1e-9));
      nah(z('EF')[0]!, f.ersteStufe.F, 1e-9); expect(z('EDF')).toEqual([f.ersteStufe.df1, f.ersteStufe.df2]); nah(z('ER2')[0]!, f.ersteStufe.r2, 1e-9);
      nah(z('WU')[0]!, f.wuHausman.t ** 2, 1e-9); nah(z('WU')[1]!, f.wuHausman.p, 1e-7);
      nah(z('SIG')[0]!, f.sigma, 1e-9); nah(z('SIG')[1]!, f.r2, 1e-9);
      if (f.sargan && f.sargan.chi2 !== undefined) { nah(z('SA')[0]!, f.sargan.chi2, 1e-8); expect(z('SA')[1]).toBe(1); nah(z('SA')[2]!, f.sargan.p, 1e-7); }
      else expect(lauf.stdout).not.toContain('SA ');
    }, 120000);
  }
});
