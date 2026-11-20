import { describe, expect, it } from 'vitest';
import { csv } from './testdaten/field3';
import { robusteSE, type RobustErgebnis, type RobustFehler } from './robustse';

/* Sollwerte: Rscript am Mac (R 4.6.1, sandwich): vcovHC(lm(y ~ x1 + x2), type = "HC3"); t, p (t-Verteilung, df = n − 3) und 95-%-Intervall daraus. */
const X1 = [44.1, 50.3, 34.8, 36.4, 61.8, 40.7, 63.2, 56.2, 49.5, 40, 41.7, 46.5, 34.6, 47.4, 38.5, 50.1, 47.8, 58.9, 44.1, 43.4, 43.2, 49.8, 45.6, 53.5];
const X2 = [5.3, 8.3, 5, 6, 4.3, 3.1, 2.2, 4.4, 4.1, 8.2, 1.6, 6, 1.3, 7.5, 1.7, 5.8, 7.5, 1.8, 0.6, 5, 1.9, 6.2, 6.9, 4.3];
const Y = [15.44, 22.92, 10.61, 11, 14.83, 17.65, 33.04, 17.4, 24.29, 9.72, 10.28, 20.55, 20.01, 16.01, 21.58, 16.93, 11.17, 29.25, 22.64, 18.79, 19.3, 19.67, 21.88, 21.56];
const nah = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b) / Math.abs(b), `${a} gegen ${b}`).toBeLessThan(tol);
const g = (r: RobustErgebnis | RobustFehler): RobustErgebnis => { if ('fehler' in r) throw new Error(r.fehler); return r; };

describe('Robuste Standardfehler (HC3) gegen R sandwich', () => {
  const r = g(robusteSE(X1.map((v, i) => [v, X2[i]!]), Y));
  it('Koeffizienten, gewöhnliche und robuste Standardfehler', () => {
    nah(r.zeilen[0]!.b, 4.486387319498); nah(r.zeilen[1]!.b, 0.397900994150); nah(r.zeilen[2]!.b, -0.987504598201);
    nah(r.zeilen[0]!.seOls, 6.002086140016); nah(r.zeilen[1]!.seOls, 0.120673695055); nah(r.zeilen[2]!.seOls, 0.408254798337);
    nah(r.zeilen[0]!.se, 8.222312983572); nah(r.zeilen[1]!.se, 0.179872766685); nah(r.zeilen[2]!.se, 0.461292847356);
  });
  it('t, p und Konfidenzintervall', () => {
    nah(r.zeilen[1]!.t, 2.212124722839); nah(r.zeilen[2]!.t, -2.140732517014); nah(r.zeilen[0]!.p, 0.5910658212841, 1e-6); nah(r.zeilen[1]!.p, 0.0381746756980, 1e-6); nah(r.zeilen[2]!.p, 0.0441863641399, 1e-6);
    nah(r.zeilen[1]!.lo, 0.0238350982618, 1e-6); nah(r.zeilen[1]!.hi, 0.7719668900386, 1e-6); nah(r.zeilen[2]!.lo, -1.9468155900358, 1e-6); expect(r.df).toBe(21);
  });
  it('Fehler: zu wenig Fälle, doppelte Spalte', () => {
    expect(robusteSE([[1], [2], [3]], [1, 2, 3])).toEqual({ fehler: 'zu-wenig-faelle' });
    expect(robusteSE(X1.map(v => [v, v]), Y)).toEqual({ fehler: 'singulaer' });
  });
});

/* HC4: Sollwert aus R (sandwich::vcovHC(lm(mpg ~ wt + hp + disp, mtcars), type = "HC4")), vom Bauer per Rscript abgefragt, nicht aus dem eigenen Code. */
describe('Robuste Standardfehler (HC4) gegen R sandwich', () => {
  const mt = csv('mtcars.csv');
  const x = mt.map(r => [r.wt as number, r.hp as number, r.disp as number]), y = mt.map(r => r.mpg as number);
  it('HC4 an mtcars: Standardfehler von Konstante, wt, hp, disp', () => {
    const r = g(robusteSE(x, y, 'HC4')), soll = [2.8684147018, 1.03548834576, 0.0261211408346, 0.0136310541715];
    soll.forEach((v, i) => nah(r.zeilen[i]!.se, v, 1e-8));
    nah(r.zeilen[1]!.b, -3.80089058264, 1e-8);
  });
  it('HC3 an mtcars bleibt wie R (2,71026981081 ...) und HC4 weicht ab', () => {
    const r = g(robusteSE(x, y)), soll = [2.71026981081, 1.0808620678, 0.0143745700776, 0.0101213754444];
    soll.forEach((v, i) => nah(r.zeilen[i]!.se, v, 1e-8));
    expect(g(robusteSE(x, y, 'HC4')).zeilen[2]!.se).not.toBeCloseTo(r.zeilen[2]!.se, 3);
  });
});
