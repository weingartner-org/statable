import { describe, expect, it } from 'vitest';
import { FARBEN, farbName, kontrast } from './kodieren-farben';

describe('Codefarben', () => {
  it('zehn benannte Farben, Namen und Werte einmalig', () => {
    expect(FARBEN).toHaveLength(10);
    expect(new Set(FARBEN.map(f => f.wert)).size).toBe(10);
    expect(new Set(FARBEN.map(f => f.de)).size).toBe(10);
  });
  it('jede Farbe hat auf Weiß mindestens 3:1', () => {
    for (const f of FARBEN) expect(kontrast(f.wert, '#ffffff'), f.de).toBeGreaterThanOrEqual(3);
  });
  it('Kontrast Schwarz/Weiß ist 21', () => { expect(Math.round(kontrast('#000000', '#ffffff'))).toBe(21); });
  it('Namen in beiden Sprachen, Fremdfarbe mit Wert', () => {
    expect(farbName('#1F5FA8', 'de')).toBe('Blau');
    expect(farbName('#1f5fa8', 'en')).toBe('Blue');
    expect(farbName('#2a9d8f', 'de')).toBe('ähnlich Petrol');
    expect(farbName('#2a9d8f', 'en')).toBe('similar to Teal');
    expect(farbName('#2a9d8f', 'de')).not.toContain('#');
    expect(farbName(undefined, 'en')).toBe('none');
  });
});
