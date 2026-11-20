import { describe, expect, it } from 'vitest';
import { artikelListe } from './artikel';
import { ladeSprache } from '../i18n/laufzeit';

/** 07.11.2026: 19 Begriffe hatten dieselbe Kennung wie ein Artikel; die Suche (Schlüssel = id) brach bei „Regression“, „Power“ … ab. */
describe('Hilfe: jede Kennung nur einmal', () => {
  it('de und en', async () => {
    for (const sp of ['de', 'en'] as const) {
      const ids = artikelListe(sp).map(a => a.id);
      const doppelt = ids.filter((x, i) => ids.indexOf(x) !== i);
      expect(doppelt, sp).toEqual([]);
    }
  });
});
