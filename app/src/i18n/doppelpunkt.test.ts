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

/** 23.11. Meldung Statable (Polen): „Dalej:: …“ - der Knopf „Weiter mit“ hängt selbst einen Doppelpunkt an, die Übersetzung darf keinen haben (cs, hu, pl, uk hatten ihn). */
describe('Beschriftung „Weiter mit“ ohne eigenen Doppelpunkt', () => {
  it('in keiner Sprache endet die Übersetzung auf einen Doppelpunkt', () => {
    const dateien = import.meta.glob('./sprachen/??.json', { eager: true, import: 'default' }) as Record<string, Record<string, string>>;
    for (const [datei, tabelle] of Object.entries(dateien)) {
      const t = tabelle['k2bde8d01'];
      if (t) expect(t.trim().endsWith(':') || t.trim().endsWith('：'), datei).toBe(false);
    }
  });
});
