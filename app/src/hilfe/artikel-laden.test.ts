import { describe, it, expect } from 'vitest';
import { artikelModul } from './artikel-laden';
import { BEREICHE, artikelText } from './kern';

describe('Hilfe: Artikel erst bei Bedarf', () => {
  it('artikelModul liefert immer dasselbe Modul mit den Artikeln', async () => {
    const [a, b] = await Promise.all([artikelModul(), artikelModul()]);
    expect(a).toBe(b);
    expect(a.artikelListe('de').length).toBeGreaterThan(50);
  });
  it('der Kern (Bereiche, artikelText) braucht die Artikel nicht', () => {
    expect(BEREICHE.length).toBe(9);
    expect(artikelText({ id: 'x', bereich: 'start', titel: 't', stichwoerter: [], inhalt: ['a', { h: 'b' }, { ul: ['c', 'd'] }], verwandt: [] })).toBe('a b c d');
  });
});
