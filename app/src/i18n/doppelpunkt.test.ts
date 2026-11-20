import { afterEach, describe, expect, it } from 'vitest';
import { s } from '../lib/sitzung.svelte';
import { dp } from './profil';

/** Abnahme 31.10. F13: Französisch setzt vor den Doppelpunkt ein geschütztes Leerzeichen („Exemple :“), die übrigen Sprachen nicht. */
describe('Doppelpunkt nach Beschriftungen', () => {
  afterEach(() => { s.einst.sprache = 'de'; });
  it('fr mit geschütztem Leerzeichen, sonst ohne', () => {
    s.einst.sprache = 'fr'; expect(dp()).toBe(' :');
    for (const sp of ['de', 'en', 'uk', 'el'] as const) { s.einst.sprache = sp; expect(dp()).toBe(':'); }
  });
});
