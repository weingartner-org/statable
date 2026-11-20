import { describe, expect, it } from 'vitest';
import { blandAltman } from './blandaltman';

/* Vergleichswerte aus R (scripts/blandaltman-erwartet.R): BlandAltmanLeh::bland.altman.stats (Bias und sein Intervall; die Grenzen dort mit 1,96),
 * qt(p, df, ncp) für die exakten Intervalle der Grenzen (Carkeet 2015) und summary(lm(Differenz ~ Mittelwert)) für die Steigung. */
const A = [9, 6, 8, 7, 10, 6, 5, 8, 7, 9, 4, 6, 7, 8, 5];
const B = [7, 6, 9, 6, 10, 7, 6, 9, 7, 10, 6, 8, 6, 9, 4];
const f = (v: number, s = 6) => v.toFixed(s);

describe('Bland-Altman', () => {
  const r = blandAltman(A.map((a, i) => [a, B[i]!]));
  it('Bias und Streuung der Differenzen', () => { expect(r.n).toBe(15); expect(f(r.bias)).toBe(f(-0.3333333333)); });
  it('Bias-Intervall wie R', () => { expect([f(r.biasLo), f(r.biasHi)]).toEqual(['-0.984104', '0.317437']); });
  it('Übereinstimmungsgrenzen: ±1,959964·s (R mit 1,96: -2.636606 / 1.969940)', () => {
    expect([f(r.untere.wert), f(r.obere.wert)]).toEqual(['-2.636564', '1.969897']);
  });
  it('exakte Intervalle der Grenzen (Carkeet 2015) wie R qt mit ncp', () => {
    expect([f(r.obere.lo), f(r.obere.hi)]).toEqual(['1.172646', '3.507257']);
    expect([f(r.untere.lo), f(r.untere.hi)]).toEqual(['-4.173924', '-1.839312']);
  });
  it('proportionaler Fehler: Steigung und p wie lm', () => { expect([f(r.steigung), f(r.steigungP)]).toEqual(['-0.045249', '0.824998']); });
  it('Fehler bei zu wenigen Fällen und bei gleichen Differenzen', () => {
    expect(() => blandAltman([[1, 2], [2, 3]])).toThrow();
    expect(() => blandAltman([[1, 2], [2, 3], [3, 4]])).toThrow();
  });
  it('großes n (ab 234): Näherung von 1999, Intervall bleibt zutreffend und endlich', () => {
    const paare = Array.from({ length: 300 }, (_, i) => [50 + (i % 17), 50 + (i % 17) + Math.sin(i) * 2] as [number, number]);
    const g = blandAltman(paare);
    expect(g.obere.lo).toBeLessThan(g.obere.wert); expect(g.obere.hi).toBeGreaterThan(g.obere.wert);
    expect(g.obere.hi - g.obere.lo).toBeLessThan(0.6 * g.sd);
  });
});
