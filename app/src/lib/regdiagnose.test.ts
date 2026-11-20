import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { regDiagnose, auffaelligeFaelle, residuenUeberZwei, type DiagnoseErgebnis, type DiagnoseFehler } from './regdiagnose';

/* Sollwerte: docs/fachblaetter/sollwerte/field-stufe1.json (R: lm(mpg ~ wt + hp + disp, mtcars), Opus 05.11.2026). Daten mtcars: mpg, wt, hp, disp. */
const MT: number[][] = [[21,2.62,110,160],[21,2.875,110,160],[22.8,2.32,93,108],[21.4,3.215,110,258],[18.7,3.44,175,360],[18.1,3.46,105,225],[14.3,3.57,245,360],[24.4,3.19,62,146.7],[22.8,3.15,95,140.8],[19.2,3.44,123,167.6],[17.8,3.44,123,167.6],[16.4,4.07,180,275.8],[17.3,3.73,180,275.8],[15.2,3.78,180,275.8],[10.4,5.25,205,472],[10.4,5.424,215,460],[14.7,5.345,230,440],[32.4,2.2,66,78.7],[30.4,1.615,52,75.7],[33.9,1.835,65,71.1],[21.5,2.465,97,120.1],[15.5,3.52,150,318],[15.2,3.435,150,304],[13.3,3.84,245,350],[19.2,3.845,175,400],[27.3,1.935,66,79],[26,2.14,91,120.3],[30.4,1.513,113,95.1],[15.8,3.17,264,351],[19.7,2.77,175,145],[15,3.57,335,301],[21.4,2.78,109,121]];
const soll = JSON.parse(readFileSync(join(__dirname, '../../../docs/fachblaetter/sollwerte/field-stufe1.json'), 'utf8')).regression;
const nah = (a: number, b: number, tol = 1e-6, was = '') => expect(Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-12) + 1e-12, `${was} ${a} gegen ${b}`).toBe(true);
const g = (r: DiagnoseErgebnis | DiagnoseFehler): DiagnoseErgebnis => { if ('fehler' in r) throw new Error(r.fehler); return r; };

describe('Regression prüfen gegen R (mtcars)', () => {
  const r = g(regDiagnose(MT.map(z => z.slice(1)), MT.map(z => z[0]!)));
  it('Toleranz, VIF, sr²', () => {
    r.groessen.forEach((q, j) => { nah(q.vif, soll.vif[j], 1e-6, 'VIF'); nah(q.toleranz, soll.toleranz[j], 1e-6, 'Toleranz'); nah(q.sr2, soll.sr2[j], 1e-5, 'sr2'); });
  });
  it('Hebelwert, Residuen, Cook, DFFITS', () => {
    expect(r.faelle).toHaveLength(32);
    r.faelle.forEach((f, i) => {
      nah(f.hebel, soll.hebel[i], 1e-6, 'h'); nah(f.rstandard, soll.rstandard[i], 1e-6, 'rstandard'); nah(f.rstudent, soll.rstudent[i], 1e-6, 'rstudent');
      nah(f.cook, soll.cook[i], 1e-6, 'cook'); nah(f.dffits, soll.dffits[i], 1e-6, 'dffits');
    });
  });
  it('DFBETAS (Konstante und drei Vorhersagegrößen)', () => {
    r.faelle.forEach((f, i) => f.dfbetas.forEach((v, j) => nah(v, soll.dfbetas[i][j], 1e-5, `dfbetas ${i},${j}`)));
  });
  it('Durbin-Watson', () => { nah(r.durbinWatson, soll.durbinWatson, 1e-8); });
  it('Auffällige Fälle: Zeilen 17, 18, 20 (Residuum über 2), 31 (Hebel)', () => {
    const a = auffaelligeFaelle(r);
    expect(a.filter(q => q.grund.resid).map(q => q.index + 1)).toEqual([17, 18, 20]);
    expect(a.find(q => q.index === 30)?.grund.hebel).toBe(true);
    expect(a.every(q => !q.grund.cook1)).toBe(true);
    expect(residuenUeberZwei(r).anzahl).toBe(3);
  });
  it('Eine Vorhersagegröße: VIF 1; Fehler bei zu wenig Fällen und doppelter Spalte', () => {
    const e = g(regDiagnose(MT.map(z => [z[1]!]), MT.map(z => z[0]!)));
    nah(e.groessen[0]!.vif, 1); nah(e.groessen[0]!.toleranz, 1);
    expect(regDiagnose([[1], [2], [3]], [1, 2, 3])).toEqual({ fehler: 'zu-wenig-faelle' });
    expect(regDiagnose(MT.map(z => [z[1]!, z[1]!]), MT.map(z => z[0]!))).toEqual({ fehler: 'singulaer' });
  });
});
