import { afterEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { ladeSprache } from '../i18n/laufzeit';
import { karteGrenzenHinweise, landNamenSatz, geoFehlerSatz } from './karte';

/* Leitfaden Falle 12: Die neuen Sätze der Weltkarte stehen in jeder Sprache ohne deutschen oder englischen Rest, sobald sie übersetzt sind.
 * Bis zur Übersetzung (Sprachdateien) ist dieser Test rot - das ist erwartet. */
/** Wörter mit unverändertem Buchstaben (die Prüfsprache ersetzt a e i o u A E O U c n y durch Akzentbuchstaben): wie in sprachrest-f2.test.ts */
const rest = (t: string): string[] => (t.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) ?? []).filter(w => /[aeiouAEOUcny]/.test(w));
const vorher = s.einst.sprache;
afterEach(() => { s.einst.sprache = vorher; });
const pruefe = (name: string, t: string) => { expect(t, name).toMatch(/^\[/); expect(rest(t), `${name}: Rest außerhalb der Klammern in „${t}“`).toEqual([]); };

describe('Prüfsprache xx: Sätze der Weltkarte', () => {
  it('Hinweise zu den Grenzen, Namen der Gebiete und Fehlersätze beim Laden', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    karteGrenzenHinweise().forEach((t, i) => pruefe(`hinweis ${i}`, t));
    pruefe('namen', landNamenSatz());
    for (const f of ['karten-laden', 'karten-pruefsumme', 'karten-form'] as const) pruefe(f, geoFehlerSatz(f));
  });
});
