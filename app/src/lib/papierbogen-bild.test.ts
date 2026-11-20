import { describe, it, expect } from 'vitest';
import { grauAusRgba, skaliert, MAX_SEITE_PX } from './papierbogen-bild';

describe('papierbogen-bild', () => {
  it('Graustufen: Weiß, Schwarz, durchsichtig = Papier', () => {
    const d = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 0]);
    const g = grauAusRgba(d, 3, 1);
    expect([...g.grau]).toEqual([255, 0, 255]);
  });
  it('verkleinert nur große Bilder, Seitenverhältnis bleibt', () => {
    expect(skaliert(800, 1000)).toEqual({ b: 800, h: 1000 });
    const s = skaliert(3600, 5400);
    expect(Math.max(s.b, s.h)).toBe(MAX_SEITE_PX);
    expect(Math.abs(s.b / s.h - 3600 / 5400)).toBeLessThan(0.01);
  });
});
