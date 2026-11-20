import { describe, expect, it } from 'vitest';
import { planeBeschriftung, spreize } from './beschriftung';

describe('Beschriftungen (Meldung 01.11.: Namen überdecken sich)', () => {
  it('weit auseinander: Höhe bleibt, alle Namen stehen da', () => {
    const p = planeBeschriftung([{ x: 10, yAnteil: 0.1, text: 'eins' }, { x: 10, yAnteil: 0.6, text: 'zwei' }], { flaeche: 300, oben: 20 });
    expect(p.faktor).toBe(1); expect(p.zeigen).toEqual([true, true]); expect(p.gekuerzt).toBe(false);
  });
  it('eng: das Bild wird höher, bis nichts mehr überdeckt', () => {
    const p = planeBeschriftung([{ x: 10, yAnteil: 0.50, text: 'Aufgabe A' }, { x: 10, yAnteil: 0.53, text: 'Aufgabe B' }], { flaeche: 300, oben: 20 });
    expect(p.faktor).toBeGreaterThan(1); expect(p.zeigen).toEqual([true, true]); expect(p.gekuerzt).toBe(false);
  });
  it('gleiche Lage: Höhe hilft nicht, Texte entfallen', () => {
    const p = planeBeschriftung(Array.from({ length: 10 }, () => ({ x: 10, yAnteil: 0.5, text: 'gleich' })), { flaeche: 300, oben: 20 });
    expect(p.gekuerzt).toBe(true); expect(p.zeigen.every(z => !z)).toBe(true);
  });
  it('spreize: Mindestabstand, Reihenfolge und Grenzen bleiben', () => {
    const r = spreize([100, 100, 101, 400], 15, 20, 420);
    const s = [...r].sort((a, b) => a - b);
    for (let i = 1; i < s.length; i++) expect(s[i]! - s[i - 1]!).toBeGreaterThanOrEqual(15 - 1e-9);
    expect(Math.min(...r)).toBeGreaterThanOrEqual(20); expect(Math.max(...r)).toBeLessThanOrEqual(420);
  });
});
