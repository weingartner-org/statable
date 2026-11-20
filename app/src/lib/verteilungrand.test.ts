import { describe, it, expect } from 'vitest';
import { artText, paarSchluessel, paarText, verteilungAbsaetze } from './verteilungrand';
import { links, quantil, rechts, type Verteilung } from './verteilungen';
import type { Art, Modus } from '../bausteine/VerstehenVerteilungen.svelte';

const ARTEN: Art[] = ['normal', 't', 'chi2', 'f', 'binom', 'poisson', 'hyper', 'eigen'];
const MODI: Modus[] = ['links', 'linksStreng', 'rechts', 'rechtsStreng', 'zwischen', 'quantil'];
const t10: Verteilung = { art: 't', df: 10 };

describe('Seitenleiste Verteilungen (Meldung 31.10.)', () => {
  it('Jede Verteilung, jede Frage und jedes Paar hat einen eigenen Text', () => {
    const frage = new Set<string>();
    for (const a of ARTEN) {
      expect(artText(a).length).toBeGreaterThan(40);
      if (a !== 'eigen') for (const m of MODI) frage.add(verteilungAbsaetze(a, m, null, 'modus')[0]!.text);
      for (const b of ARTEN) if (a !== b) expect(paarText(a, b).length, `${a}-${b}`).toBeGreaterThan(40);
    }
    expect(frage.size).toBe(7 * 6);
  });
  it('Reihenfolge: das zuletzt Geänderte steht oben, das Paar nur nach einem Wechsel', () => {
    expect(verteilungAbsaetze('poisson', 'links', 't', 'art').map(x => x.titel)[1]).toContain('t-Verteilung');
    expect(verteilungAbsaetze('poisson', 'links', 't', 'art')).toHaveLength(3);
    expect(verteilungAbsaetze('poisson', 'links', null, 'art')).toHaveLength(2);
    expect(verteilungAbsaetze('poisson', 'rechts', null, 'modus')[0]!.titel).toContain('≥');
    expect(paarSchluessel('poisson', 't')).toBe(paarSchluessel('t', 'poisson'));
  });
  it('Die genannten Zahlen stimmen', () => {
    expect(quantil(t10, 0.975).x).toBeCloseTo(2.228, 3);
    expect(quantil({ art: 't', df: 30 }, 0.975).x).toBeCloseTo(2.042, 3);
    expect(quantil({ art: 'normal', mu: 0, sigma: 1 }, 0.975).x).toBeCloseTo(1.96, 2);
    expect(quantil({ art: 'chi2', df: 10 }, 0.95).x).toBeCloseTo(18.31, 2);
    expect(quantil({ art: 'f', d1: 3, d2: 12 }, 0.95).x).toBeCloseTo(3.49, 2);
    expect(quantil({ art: 'f', d1: 1, d2: 10 }, 0.95).x).toBeCloseTo(2.228 ** 2, 1);
    const n: Verteilung = { art: 'normal', mu: 0, sigma: 1 };
    expect(links(n, 1) - links(n, -1)).toBeCloseTo(0.68, 2);
    expect(links(n, 2) - links(n, -2)).toBeCloseTo(0.95, 2);
  });
  it('Die genannten Brücken stimmen: t² = F, χ² und Poisson, Binomial und F', () => {
    for (const x of [0.5, 1.3, 2.7]) expect(rechts(t10, x) * 2).toBeCloseTo(rechts({ art: 'f', d1: 1, d2: 10 }, x * x), 6);
    for (const [k, l] of [[0, 1], [3, 4.5], [8, 6.2]] as const) expect(links({ art: 'poisson', lambda: l }, k)).toBeCloseTo(rechts({ art: 'chi2', df: 2 * k + 2 }, 2 * l), 6);
    // P(X ≥ k) bei B(n; p) = P(F(2k; 2(n - k + 1)) < (n - k + 1) / k · p / (1 - p))
    for (const [n, p, k] of [[20, 0.3, 5], [12, 0.5, 9]] as const) expect(rechts({ art: 'binom', n, p }, k)).toBeCloseTo(links({ art: 'f', d1: 2 * k, d2: 2 * (n - k + 1) }, ((n - k + 1) / k) * (p / (1 - p))), 6);
  });
});
