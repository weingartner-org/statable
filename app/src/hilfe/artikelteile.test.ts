import { describe, it, expect } from 'vitest';
import { artikelTeile } from './artikel';
import { VERFAHREN } from '../lib/verfahren';

describe('Rand: Teile der Hilfe-Artikel', () => {
  it('jede Frageart hat einen Artikel mit „Kurz“ in beiden Sprachen', () => {
    for (const v of VERFAHREN) for (const s of ['de', 'en'] as const) expect(artikelTeile(`frage-${v.id}`, ['kurz'], s).length, `${v.id} ${s}`).toBeGreaterThan(0);
  });
  it('Teile in der gewünschten Reihenfolge, mit Überschrift', () => {
    const b = artikelTeile('frage-gruppen', ['voraus', 'beispiele'], 'de');
    expect(b[0]).toEqual({ h: 'Voraussetzungen' });
    expect(b.some(x => typeof x === 'object' && 'h' in x && x.h === 'Typische Beispiele')).toBe(true);
    expect(b.some(x => typeof x === 'object' && 'h' in x && x.h === 'Ergebnis lesen')).toBe(false);
  });
  it('unbekannter Artikel: leer', () => { expect(artikelTeile('gibt-es-nicht', ['kurz'], 'de')).toEqual([]); });
});
