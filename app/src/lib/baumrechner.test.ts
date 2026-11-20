/* Baumrechner: Sollwerte aus R (scripts/baumrechner-erwartet.R), mit den ausgezählten Titanic-Daten als zweitem Weg. */
import { describe, expect, it } from 'vitest';
import { baumrechnung } from './baumrechner';
import SOLL from './testdaten/baumrechner-erwartet.json';

type S = { pA: number; pBgA: number; pBgN: number; pAB: number; pAN: number; pNB: number; pNN: number; pB: number; pAgB: number | string; pAgNB: number | string; unabhaengig: boolean };
describe('Baumrechner', () => {
  for (const [name, s] of Object.entries(SOLL as unknown as Record<string, S>)) {
    it(name, () => {
      const b = baumrechnung(s.pA, s.pBgA, s.pBgN);
      for (const k of ['pAB', 'pAN', 'pNB', 'pNN', 'pB'] as const) expect(b[k], k).toBeCloseTo(s[k], 12);
      for (const k of ['pAgB', 'pAgNB'] as const) typeof s[k] === 'number' ? expect(b[k], k).toBeCloseTo(s[k], 12) : expect(b[k], k).toBeNaN();
      expect(b.unabhaengig).toBe(s.unabhaengig);
      expect(b.pAB + b.pAN + b.pNB + b.pNN).toBeCloseTo(1, 12);
    });
  }
  it('Bezugsgröße: Titanic mit 2092 Fällen und Urne mit 90 Fällen geben die echten ganzen Zahlen', () => {
    const t = baumrechnung(425 / 2092, 316 / 425, 338 / 1667, 2092).v;
    expect([t.rp, t.fn, t.fp, t.rn, t.ganzzahlig]).toEqual([316, 109, 338, 1329, true]);
    const u = baumrechnung(3 / 10, 2 / 9, 3 / 9, 90).v;
    expect([u.rp, u.fn, u.fp, u.rn, u.ganzzahlig]).toEqual([6, 21, 21, 42, true]);
  });
  it('natürliche Häufigkeiten: 1 %, 90 %, 9 % gibt ganze Zahlen bei 1000 oder mehr Fällen', () => {
    const { v } = baumrechnung(0.01, 0.9, 0.09);
    expect(v.ganzzahlig).toBe(true);
    expect(v.rp / v.n).toBeCloseTo(0.009, 12);
    expect(v.fp / v.n).toBeCloseTo(0.0891, 12);
  });
});
