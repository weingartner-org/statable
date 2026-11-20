import { describe, expect, it } from 'vitest';
import { bayesMehrfaktor, type MehrBayes, type MehrFehler } from './bayesmehr';

/* Sollwerte: Rscript am Mac (R 4.6.1, BayesFactor 0.9.12-4): anovaBF(y ~ A * B, whichModels = "all", iterations = 500000); Daten 3 × 2, 8 je Zelle, set.seed(8).
 * Modelle mit einem Effekt sind in R fast exakt (Fehler unter 0,03 %); mit mehreren Effekten Monte-Carlo (Fehler 0,25 % bis 1 %). */
const A = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3].map(v => v - 1);
const B = [1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2].map(v => v - 1);
const Y = [9.83,11.68,9.07,8.9,11.47,9.78,9.66,7.82,4.88,9.71,9.38,11.48,11.74,8.31,11.04,9.27,14.22,10.66,14.32,10.73,13.77,11.18,10.4,11.24,15.59,9.89,9.98,16,13.31,8.06,15.11,14.03,7.29,8.85,12.92,11.26,12.09,9,10.27,11.34,13.53,11.57,13.26,12.28,14.03,8.88,11.47,13.37];
const g = (r: MehrBayes | MehrFehler): MehrBayes => { if ('fehler' in r) throw new Error(r.fehler); return r; };
const rel = (a: number, b: number) => Math.abs(a - b) / b;
const bf = (r: MehrBayes, n: string) => r.modelle.find(m => m.name === n)!.bf10;

describe('Bayes-Faktoren der zweifaktoriellen Varianzanalyse gegen R BayesFactor', () => {
  const r = g(bayesMehrfaktor(Y, A, B));
  it('Modelle mit einem Effekt (deterministisch in R): A, B, A:B', () => {
    expect(rel(bf(r, 'A'), 22.34413529)).toBeLessThan(2e-3); expect(rel(bf(r, 'B'), 0.48994329)).toBeLessThan(2e-3); expect(rel(bf(r, 'A:B'), 0.4157881)).toBeLessThan(2e-3);
  });
  it('Modelle mit mehreren Effekten (R: Monte Carlo, Fehler bis 1 %): Toleranz 3 %', () => {
    expect(rel(bf(r, 'A + B'), 12.41674954)).toBeLessThan(0.03); expect(rel(bf(r, 'A + A:B'), 10.8651114)).toBeLessThan(0.03); expect(rel(bf(r, 'B + A:B'), 0.20672107)).toBeLessThan(0.03); expect(rel(bf(r, 'A + B + A:B'), 6.20263259)).toBeLessThan(0.03);
  });
  it('Wechselwirkung, A und B als Verhältnis der Modelle', () => {
    expect(rel(r.wechsel, 6.20263259 / 12.41674954)).toBeLessThan(0.04); expect(rel(r.a, 12.41674954 / 0.48994329)).toBeLessThan(0.04); expect(rel(r.b, 12.41674954 / 22.34413529)).toBeLessThan(0.04);
  });
  it('ungleich besetzt (drei Fälle weniger): wie R', () => {
    const u = g(bayesMehrfaktor(Y.slice(3), A.slice(3), B.slice(3)));
    expect(rel(bf(u, 'A'), 15.08041024)).toBeLessThan(2e-3); expect(rel(bf(u, 'A + B'), 9.76823416)).toBeLessThan(0.03); expect(rel(bf(u, 'A + B + A:B'), 4.39289066)).toBeLessThan(0.03);
  });
  it('Fehler', () => {
    expect(bayesMehrfaktor(Y.slice(0, 4), A.slice(0, 4), B.slice(0, 4))).toEqual({ fehler: 'zu-wenig' });
    expect(bayesMehrfaktor(Y, A.map(() => 0), B)).toEqual({ fehler: 'stufen' });
    expect(bayesMehrfaktor(Y.slice(0, 16), A.slice(0, 16), B.slice(0, 16))).toEqual({ fehler: 'stufen' });
  });
});
