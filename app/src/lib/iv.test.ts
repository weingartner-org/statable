/**
 * B2 Teil 2a: Instrumentvariablen (2SLS) gegen Sollwerte aus Desktop-R (scripts/iv-erwartet.R: AER::ivreg, sandwich, zweiter Weg von Hand),
 * CigarettesSW 1995 (48 Staaten), ein Instrument und zwei Instrumente (Sargan).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ivRechnen, type IvErgebnis } from './iv';
import soll from './iv-erwartet.json';

const zeilen = readFileSync(join(__dirname, 'testdaten', 'zigaretten.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map(z => z.split(';').map(v => v.replace(',', '.'))).map(z => z.slice(1).map(Number));
// Spalten: packs, rprice, rincome, tdiff, rtax
const y = zeilen.map(z => Math.log(z[0]!)), lp = zeilen.map(z => [Math.log(z[1]!)]), li = zeilen.map(z => [Math.log(z[2]!)]);
const S = soll as any;
const nah = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b) / Math.max(1, Math.abs(b))).toBeLessThan(tol);
function lauf(inst: number[][]): IvErgebnis {
  const e = ivRechnen(y, lp, li, inst, ['Preis'], ['Einkommen']);
  if ('fehler' in e) throw new Error(e.fehler);
  return e;
}
function vergleich(e: IvErgebnis, f: any) {
  expect(e.n).toBe(f.n);
  f.b.forEach((v: number, i: number) => { nah(e.koef[i]!.b, v); nah(e.koef[i]!.se, f.se[i]); nah(e.koef[i]!.seRobust, f.seRobust[i]); });
  nah(e.sigma, f.sigma); nah(e.r2, f.r2);
  nah(e.ersteStufen[0]!.F, f.ersteStufe.F); expect(e.ersteStufen[0]!.df1).toBe(f.ersteStufe.df1); expect(e.ersteStufen[0]!.df2).toBe(f.ersteStufe.df2); nah(e.ersteStufen[0]!.r2, f.ersteStufe.r2);
  nah(e.wuHausman.F, f.wuHausman.t ** 2); nah(e.wuHausman.p, f.wuHausman.p, 1e-7);
  f.ols.b.forEach((v: number, i: number) => { nah(e.ols[i]!.b, v); nah(e.ols[i]!.se, f.ols.se[i]); });
}
describe('Instrumentvariablen (2SLS) gegen R (AER)', () => {
  it('ein Instrument: Schätzer, klassische und robuste Fehler, erste Stufe, Wu-Hausman, OLS', () => {
    const e = lauf(zeilen.map(z => [z[3]!])); vergleich(e, S.einIV); expect(e.sargan).toBeNull();
  });
  it('zwei Instrumente: wie oben und Sargan', () => {
    const e = lauf(zeilen.map(z => [z[3]!, z[4]!])); vergleich(e, S.zweiIV);
    nah(e.sargan!.chi2, S.zweiIV.sargan.chi2); expect(e.sargan!.df).toBe(1); nah(e.sargan!.p, S.zweiIV.sargan.p, 1e-7);
  });
  it('Fehler: weniger Instrumente als endogene Größen', () => {
    expect(ivRechnen(y, lp, li, [], ['Preis'], ['Einkommen'])).toEqual({ fehler: 'zu-wenig-instrumente' });
  });
});
