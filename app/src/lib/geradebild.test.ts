import { describe, expect, it } from 'vitest';
import { ANSCOMBE, SIMPSON, anpassen, mitAusreisser } from './geradebild';

describe('geradebild', () => {
  it('Anscombe: alle vier Wolken haben fast gleiche Kennzahlen', () => {
    for (const w of ANSCOMBE) {
      const g = anpassen(w);
      expect(g.steigung).toBeCloseTo(0.5, 2);
      expect(g.achse).toBeCloseTo(3.0, 1);
      expect(g.r).toBeCloseTo(0.8165, 3);
    }
  });
  it('Simpson: gesamt fallend, in jeder Gruppe steigend', () => {
    expect(anpassen(SIMPSON).steigung).toBeLessThan(0);
    for (const k of [0, 1, 2]) expect(anpassen(SIMPSON.filter((p) => p.g === k)).steigung).toBeGreaterThan(0.5);
  });
  it('Ausreißer verändert r stark', () => {
    expect(anpassen(mitAusreisser(2 + 0.6 * 14)).r).toBeGreaterThan(0.97);
    expect(anpassen(mitAusreisser(0)).r).toBeLessThan(0.6);
  });
});
