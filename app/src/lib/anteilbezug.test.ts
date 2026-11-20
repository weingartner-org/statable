import { describe, expect, it } from 'vitest';
import { anteilBezug } from './anteilbezug';
import { ablehnungsbereich } from './anteilstest';
import { quantil } from './verteilungen';

describe('Anteilstest: Befehle', () => {
  it('rechts: Ablehnungsgrenze = BINOM.INV + 1 stimmt mit dem Bereich von Statable überein', () => {
    for (const [n, p0, alpha] of [[100, 0.5, 5], [20, 0.3, 5], [50, 0.1, 1], [200, 0.25, 10]] as const) {
      const c = ablehnungsbereich(n, p0, alpha / 100, 'rechts').rechts!;
      const q = quantil({ art: 'binom', n, p: p0 }, 1 - alpha / 100);
      expect(c).toBe(q.x + 1);
    }
  });
  it('Zeilen für Excel (englisch und deutsch), TI-84 und R', () => {
    const e = anteilBezug(100, 0.5, 'rechts', 5, 60, false);
    expect(e.excel).toEqual(['=BINOM.INV(100, 0.5, 0.95) + 1', '=1 - BINOM.DIST(59, 100, 0.5, TRUE)']);
    expect(e.ti).toEqual(['1 - binomcdf(100, 0.5, 59)']);
    expect(e.r).toContain('binom.test(60, 100, 0.5, alternative = "greater")');
    expect(anteilBezug(100, 0.5, 'rechts', 5, 60, true).excel[0]).toBe('=BINOM.INV(100; 0,5; 0,95) + 1');
    expect(anteilBezug(100, 0.5, 'zwei', 5, 60, false).ti).toEqual([]);
  });
});
