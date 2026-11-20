/** Abnahme F2 (Opus): Fälle aus der Stichprobe, die die Sollwerte nicht abdeckten. */
import { describe, expect, it } from 'vitest';
import { findeDeutungsmarker } from './deutungsmarker';

describe('Deutungsmarker, Abnahme', () => {
  it('„Zum Wohl“ ist ein Hauptwort, keine Vermutung', () => {
    expect(findeDeutungsmarker('Zum Wohl! Alle hoben das Glas.', 'de')).toEqual([]);
  });
  it('„Wohl“ am Satzanfang bleibt eine Vermutung', () => {
    expect(findeDeutungsmarker('Wohl war sie müde.', 'de').map(s => s.treffer)).toEqual(['Wohl']);
  });
  it('reine Beobachtung bleibt ohne Markierung', () => {
    expect(findeDeutungsmarker('Er sah auf die Uhr und gähnte.', 'de')).toEqual([]);
  });
});
