import { describe, expect, it } from 'vitest';
import { PROBIER_TEILE, PROBIER_ZIELE, VERSTEHEN_KACHELN } from './probierziele';
import { artikelListe } from '../hilfe/artikel';
import { ladeGlossar } from '../hilfe/glossar';

await ladeGlossar('de');

describe('Ausprobieren: Ziele der Hilfe', () => {
  it('jedes Ziel gibt es, und jeder Artikel oder Begriff auch', () => {
    const ids = new Set(artikelListe('de').map(a => a.id));
    for (const [id, ziel] of Object.entries(PROBIER_ZIELE)) {
      const [kachel, teil] = ziel.split('/');
      expect(VERSTEHEN_KACHELN, ziel).toContain(kachel);
      if (kachel === 'probieren') expect(PROBIER_TEILE, ziel).toContain(teil);
      expect(ids.has(id), id).toBe(true);
    }
  });
});
