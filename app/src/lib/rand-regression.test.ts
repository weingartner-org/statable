import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { artikelTeile } from '../hilfe/artikel';

/** Abnahme 31.10. F6: Bei Probit und gewichteter Regression stand im Rand „Linear: Ergebnis lesen“ (die Erklärung des linearen Modells). */
describe('Rand neben Probit, gewichteter und nichtlinearer Regression', () => {
  const quelle = readFileSync(new URL('../seiten/Blatt.svelte', import.meta.url), 'utf8');
  it('verweist auf den eigenen Artikel, und der hat einen Teil „Ergebnis lesen“', () => {
    for (const [typ, id] of [['probit', 'probit-regression'], ['wls', 'gewichtete-regression'], ['nls', 'nichtlineare-regression']] as const) {
      expect(quelle, typ).toContain(`a === '${typ}' ? '${id}'`);
      const teile = artikelTeile(id, ['lesen'], 'de');
      expect(teile.length, id).toBeGreaterThan(1);
      expect(JSON.stringify(teile)).not.toContain('Linear: Ergebnis lesen');
    }
  });
});
