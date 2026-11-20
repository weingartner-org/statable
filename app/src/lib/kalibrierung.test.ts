import { describe, expect, it } from 'vitest';
import { kalibrierung, type Kalibrierung, type KalibrierFehler } from './kalibrierung';

/* Sollwerte: Rscript am Mac (R 4.6.1, chemCal): lm(y ~ x), lod(m, alpha, beta = alpha, method = "din"), loq(m, alpha, k = 3). Die Erfassungsgrenze ist dort 2·Nachweisgrenze; loq sucht numerisch (Toleranz min(x)/1000 = 5e-4). */
const P: [number, number][] = [[0.5, 1.12], [1, 2.31], [1.5, 3.02], [2, 4.28], [2.5, 5.05], [3, 6.22], [3.5, 6.98], [4, 8.31], [4.5, 9.07], [5, 10.2]];
const g = (r: Kalibrierung | KalibrierFehler): Kalibrierung => { if ('fehler' in r) throw new Error(r.fehler); return r; };
const nah = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b) / Math.abs(b), `${a} gegen ${b}`).toBeLessThan(tol);

describe('Kalibriergerade gegen R chemCal', () => {
  it('Gerade und Reststreuung', () => { const r = g(kalibrierung(P)); nah(r.a, 0.164); nah(r.b, 1.99709090909); nah(r.s, 0.131370399323); });
  it('α = 0,01: Erfassungsgrenze = 2 · Nachweisgrenze wie chemCal lod, Bestimmungsgrenze wie loq', () => {
    const r = g(kalibrierung(P, 0.01)); nah(r.eg, 0.461490583966); nah(r.ng, 0.461490583966 / 2); nah(r.bg!, 0.753007596566, 2e-3);
  });
  it('α = 0,05', () => { const r = g(kalibrierung(P, 0.05)); nah(r.eg, 0.296280312307); nah(r.bg!, 0.526694151966, 2e-3); });
  it('Fehler: zu wenige Punkte, kein x-Bereich, falsches α', () => {
    expect(kalibrierung(P.slice(0, 3))).toEqual({ fehler: 'zu-wenig-punkte' });
    expect(kalibrierung([[1, 1], [1, 2], [1, 3], [1, 4]])).toEqual({ fehler: 'keine-streuung' });
    expect(kalibrierung(P, 0.9)).toEqual({ fehler: 'alpha' });
  });
});
