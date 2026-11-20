import { describe, it, expect } from 'vitest';
import { ARTIKEL_BEISPIELE } from './artikel-beispiele';
import { BEISPIELE } from '../lib/beispiele';
import { artikelListe } from './artikel';

describe('Hilfe: Ausprobieren mit dem Beispiel', () => {
  it('jede Kennung ist ein Beispiel, jeder Artikel ist vorhanden', () => {
    const artikel = new Set(artikelListe('de').map(a => a.id));
    const kaputt: string[] = [];
    for (const [a, ids] of Object.entries(ARTIKEL_BEISPIELE)) {
      if (!artikel.has(a)) kaputt.push(`Artikel ${a} fehlt`);
      for (const id of ids) if (!BEISPIELE.some(b => b.id === id && b.datei)) kaputt.push(`${a}: Beispiel ${id} fehlt oder hat keine Daten`);
    }
    expect(kaputt).toEqual([]);
  });
});
