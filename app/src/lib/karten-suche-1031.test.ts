import { describe, expect, it } from 'vitest';
import { kartenSuche, kartenStichwoerter } from './fach';
import { artikelListe } from '../hilfe/artikel';
import { suche } from '../hilfe/suche';

/** Abnahme 31.10. F9, F10: Tippfehler und ganze Fragen finden die Karte, und der Treffer im Titel steht vor dem in der Beschreibung. */
const sw = () => kartenStichwoerter(artikelListe('de'));
describe('Suche in „Neue Auswertung“', () => {
  it('Tippfehler: „faktoranalyse“ und „regresion“ finden ihre Karte', () => {
    expect(kartenSuche('faktoranalyse', 'bildung', sw()).map(k => k.id)).toContain('faktor');
    expect(kartenSuche('regresion', 'bildung', sw()).map(k => k.id)).toContain('vorhersage');
  });
  it('eine Alltagsfrage findet die Zusammenhang-Karte', () => {
    expect(kartenSuche('wie stark hängen zwei dinge zusammen', 'bildung', sw()).map(k => k.id)).toContain('zusammenhang');
  });
  it('„cronbach“: die Karte der Skala steht vor „Hat sich etwas verändert?“', () => {
    const ids = kartenSuche('cronbach', 'bildung', sw()).map(k => k.id);
    expect(ids).toContain('skala'); expect(ids.indexOf('skala')).toBe(0);
  });
  it('Unsinn findet weiter nichts', () => { expect(kartenSuche('xyzxyzxyz', 'bildung', sw())).toEqual([]); });
});
describe('Suche in der Hilfe', () => {
  it('„faktoranalyse“ (ohne „en“) findet den Artikel zur Faktorenanalyse', () => {
    expect(suche(artikelListe('de'), 'faktoranalyse', 'de').map(t => t.artikel.id)).toContain('frage-faktor');
  });
});
