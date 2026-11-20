import { describe, expect, it } from 'vitest';
import { verteilungBezug } from './verteilungbezug';

describe('Verteilungen: Befehle in Excel, TI-84, SPSS und R', () => {
  it('Normalverteilung: höchstens, mindestens, zwischen, Quantil', () => {
    const v = { art: 'normal' as const, mu: 100, sigma: 15 };
    const l = verteilungBezug(v, 'links', 115, 0, 0, 0, false)!;
    expect(l.excel[0]).toBe('=NORM.DIST(115, 100, 15, TRUE)'); expect(l.ti[0]).toBe('normalcdf(-1E99, 115, 100, 15)'); expect(l.spss[0]).toBe('COMPUTE p = CDF.NORMAL(115, 100, 15).'); expect(l.r[0]).toBe('pnorm(115, 100, 15)');
    const de = verteilungBezug(v, 'links', 115.5, 0, 0, 0, true)!;
    expect(de.excel[0]).toBe('=NORM.VERT(115,5; 100; 15; WAHR)'); expect(de.spss[0]).toBe('COMPUTE p = CDF.NORMAL(115.5, 100, 15).');
    expect(verteilungBezug(v, 'rechts', 115, 0, 0, 0, false)!.ti[0]).toBe('normalcdf(115, 1E99, 100, 15)');
    expect(verteilungBezug(v, 'zwischen', 0, 85, 115, 0, false)!.ti[0]).toBe('normalcdf(85, 115, 100, 15)');
    expect(verteilungBezug(v, 'quantil', 0, 0, 0, 0.975, false)!.ti[0]).toBe('invNorm(0.975, 100, 15)');
    expect(l.geogebra[0]).toBe('Normal(100, 15, 115, true)'); expect(verteilungBezug(v, 'quantil', 0, 0, 0, 0.975, false)!.geogebra[0]).toBe('InverseNormal(100, 15, 0.975)');
  });
  it('Binomialverteilung: strenge Grenzen rücken um 1', () => {
    const v = { art: 'binom' as const, n: 20, p: 0.3 };
    expect(verteilungBezug(v, 'linksStreng', 5, 0, 0, 0, false)!.ti[0]).toBe('binomcdf(20, 0.3, 4)');
    expect(verteilungBezug(v, 'rechts', 5, 0, 0, 0, false)!.r[0]).toBe('1 - pbinom(4, 20, 0.3)');
    expect(verteilungBezug(v, 'zwischen', 0, 3, 8, 0, false)!.excel[0]).toBe('=BINOM.DIST(8, 20, 0.3, TRUE) - BINOM.DIST(2, 20, 0.3, TRUE)');
  });
  it('ohne TI-Befehl: Hinweis; eigene Verteilung: null', () => {
    expect(verteilungBezug({ art: 'chi2', df: 4 }, 'quantil', 0, 0, 0, 0.95, false)!.hinweise).toContain('ti-kein-quantil');
    expect(verteilungBezug({ art: 'hyper', N: 49, K: 6, n: 6 }, 'links', 1, 0, 0, 0, false)!.hinweise).toContain('ti-keine-verteilung');
    expect(verteilungBezug({ art: 'eigen', x: [1], p: [1] }, 'links', 1, 0, 0, 0, false)).toBeNull();
  });
});

describe('GeoGebra: Namen nach dem Handbuch', () => {
  it('Binomialverteilung heißt BinomialDist (Binomial ist der Binomialkoeffizient)', () => {
    const b = verteilungBezug({ art: 'binom', n: 20, p: 0.3 }, 'links', 5, 0, 0, 0, false)!;
    expect(b.geogebra[0]).toBe('BinomialDist(20, 0.3, 5, true)');
    expect(verteilungBezug({ art: 'hyper', N: 49, K: 6, n: 6 }, 'links', 1, 0, 0, 0, false)!.geogebra[0]).toBe('HyperGeometric(49, 6, 6, 1, true)');
  });
});
