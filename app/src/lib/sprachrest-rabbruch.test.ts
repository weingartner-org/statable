import { afterEach, describe, expect, it, vi } from 'vitest';
import { ladeSprache, text } from '../i18n/laufzeit';
import { RAbgebrochen } from '../engine/webr';

/* Leitfaden Falle 12 für den R-Schutz (Stufe 1 große Dateien): Die Sätze zum Abbruch stehen in der Prüfsprache „xx“ ganz in [Klammern], also kommt kein fester deutscher oder englischer Rest dazu.
 * Der Satz nimmt die Sprache aus <html lang>, darum wird `document` hier gespielt. Muster: lib/sprachrest-zeitreihen-abrunden.test.ts. */
afterEach(() => { vi.unstubAllGlobals(); });

describe('Prüfsprache xx: kein Rest in den Sätzen des R-Schutzes', () => {
  it.each(['person', 'zeit', 'tot'] as const)('RAbgebrochen, Grund %s', async grund => {
    await ladeSprache('xx');
    vi.stubGlobal('document', { documentElement: { lang: 'xx' } });
    const t = new RAbgebrochen(grund).message;
    expect(t).toMatch(/^\[.*\]$/);
    expect(t.match(/\]/g)).toHaveLength(1);
  });

  it('jede Sprache kennt die Sätze (kein Rückfall auf Englisch)', async () => {
    for (const sp of ['fr', 'es', 'it', 'pt', 'nl', 'el', 'hu', 'sv', 'pl', 'uk', 'ro', 'cs', 'bg'] as const) {
      await ladeSprache(sp);
      vi.stubGlobal('document', { documentElement: { lang: sp } });
      expect(new RAbgebrochen('tot').message, sp).not.toMatch(/^R crashed/);
      expect(new RAbgebrochen('zeit').message, sp).not.toMatch(/^R gave no answer/);
    }
    const lang = 'This is taking longer. With large data that is normal. You can wait or cancel: the data stay unchanged.';
    expect(text('fr', 'Das dauert länger. Bei großen Daten ist das normal. Warten oder abbrechen ist beides möglich: Die Daten bleiben unverändert.', lang, 'k48382c1a')).not.toBe(lang);
  });
});
