/**
 * B2 Teil 1a: Panel (feste/zufällige Effekte, Hausman, F-Test, cluster-robust CR1) gegen Sollwerte aus Desktop-R
 * (scripts/panel-erwartet.R: plm, sandwich::vcovCL, zweiter Weg von Hand), Grunfeld-Daten (10 Firmen x 20 Jahre), Fall B unausgewogen.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { panelRechnen, type PanelErgebnis } from './panel';
import soll from './panel-erwartet.json';

const csv = readFileSync(join(__dirname, 'testdaten', 'grunfeld.csv'), 'utf8').trim().split(/\r?\n/).map(z => z.split(';').map(v => Number(v.replace(',', '.'))));
const S = soll as any;
function lauf(drop: number[]): PanelErgebnis {
  const zeilen = csv.slice(1).filter((_, i) => !drop.includes(i + 1));
  const e = panelRechnen(zeilen.map(z => z[0]!), zeilen.map(z => [z[3]!, z[4]!]), zeilen.map(z => z[2]!), ['value', 'capital']);
  if ('fehler' in e) throw new Error(e.fehler);
  return e;
}
const nah = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b) / Math.max(1, Math.abs(b))).toBeLessThan(tol);
const arr = (v: number | number[]) => (Array.isArray(v) ? v : [v]);

function vergleich(e: PanelErgebnis, f: any) {
  expect(e.N).toBe(f.N); expect(e.n).toBe(f.n); expect(e.ausgewogen).toBe(f.balanciert);
  arr(f.within.b).forEach((v: number, i: number) => { nah(e.within.koef[i]!.b, v); nah(e.within.koef[i]!.se, arr(f.within.se)[i]!); nah(e.within.koef[i]!.seCluster, arr(f.within.seCluster)[i]!); });
  nah(e.within.r2, f.within.r2); nah(e.within.sigmaE2, f.within.sigmaE2); expect(e.within.df).toBe(f.within.dfRest);
  arr(f.pooled.b).forEach((v: number, i: number) => { nah(e.pooled.koef[i]!.b, v); nah(e.pooled.koef[i]!.se, arr(f.pooled.se)[i]!); nah(e.pooled.koef[i]!.seCluster, arr(f.pooled.seCluster)[i]!); });
  arr(f.between.b).forEach((v: number, i: number) => nah(e.between!.koef[i]!.b, v)); nah(e.between!.r2, f.between.r2);
  nah(e.ftest.F, f.ftestEffekte.F); expect(e.ftest.df1).toBe(f.ftestEffekte.df1); expect(e.ftest.df2).toBe(f.ftestEffekte.df2); nah(e.ftest.p, f.ftestEffekte.p, 1e-7);
}
describe('Panel gegen R (plm, sandwich)', () => {
  it('Fall A ausgewogen: Within, Pooled, Between, F-Test, cluster-robust, zufällige Effekte, Hausman', () => {
    const e = lauf([]); vergleich(e, S.A);
    arr(S.A.random.b).forEach((v: number, i: number) => { nah(e.zufaellig!.koef[i]!.b, v); nah(e.zufaellig!.koef[i]!.se, arr(S.A.random.se)[i]!); });
    nah(e.zufaellig!.theta, S.A.random.theta); nah(e.zufaellig!.sigmaU2, S.A.random.sigmaU2); nah(e.zufaellig!.sigmaE2, S.A.random.sigmaE2);
    nah(e.hausman!.chi2, S.A.hausman.chi2); expect(e.hausman!.df).toBe(S.A.hausman.df); nah(e.hausman!.p, S.A.hausman.p, 1e-7);
  });
  it('Fall B unausgewogen: Within, Pooled, Between, F-Test, cluster-robust; keine zufälligen Effekte', () => {
    const e = lauf(arr(S.B.zeilenEntfernt)); vergleich(e, S.B);
    expect(e.zufaellig).toBeNull(); expect(e.hausman).toBeNull();
  });
  it('Fehler: eine Gruppe, konstanter Regressor', () => {
    expect(panelRechnen([1, 1, 1, 1], [[1], [2], [3], [4]], [1, 2, 3, 4], ['x'])).toEqual({ fehler: 'zu-wenig-gruppen' });
    const r = panelRechnen([1, 1, 2, 2, 3, 3], [[1], [2], [1], [2], [1], [2]].map((z, i) => [5, ...z]), [1, 2, 3, 5, 4, 7], ['a', 'x']);
    expect(r).toEqual({ fehler: 'konstant' });
  });
});
