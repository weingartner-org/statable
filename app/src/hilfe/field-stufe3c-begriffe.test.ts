import { beforeAll, describe, expect, it } from 'vitest';
import { artikelListe } from './artikel';
import { ladeGlossar } from './glossar';
import { baueIndex, finde } from './begriffsfinder';

/**
 * Field-Stufe 3c (05.11.2026): Die Fachbegriffe der MANOVA-Folgeanalyse und der Daten-Bedienung müssen im Glossar stehen und in den Texten anklickbar werden
 * (Box-M-Test, Levene-Test, Strukturmatrix, Diskriminanzfunktion, Gruppenzentroid, Pillai-Spur, Spaltentyp, Wertelabel, Dezimalstellen, Teiltext). Deutsch und Englisch tragen den Satz „So geht es in Statable“.
 */
const WOERTER: Record<'de' | 'en', [string, string][]> = {
  de: [['Box-M-Test', 'box-m'], ['Levene-Test', 'levene-test'], ['Strukturmatrix', 'strukturmatrix'], ['Diskriminanzfunktion', 'diskriminanzfunktion'], ['Diskriminanzfunktionen', 'diskriminanzfunktion'], ['Gruppenzentroid', 'gruppenzentroid'],
    ['Gruppenzentroide', 'gruppenzentroid'], ['Pillai-Spur', 'pillai'], ['Spaltentyp', 'spaltentyp'], ['Wertelabel', 'wertelabel'], ['Wertelabels', 'wertelabel'], ['Dezimalstellen', 'dezimalstellen'], ['Teiltext', 'teiltext']],
  en: [["Box's M test", 'box-m'], ['Levene test', 'levene-test'], ['Structure matrix', 'strukturmatrix'], ['Discriminant function', 'diskriminanzfunktion'], ['Group centroid', 'gruppenzentroid'],
    ["Pillai's trace", 'pillai'], ['Column type', 'spaltentyp'], ['Value label', 'wertelabel'], ['Decimal places', 'dezimalstellen'], ['Partial text', 'teiltext']]
};
const MIT_SATZ = ['box-m', 'strukturmatrix', 'diskriminanzfunktion', 'gruppenzentroid', 'pillai', 'spaltentyp', 'wertelabel', 'dezimalstellen', 'teiltext'];

describe('Neue Fachbegriffe (Stufe 3c) sind im Text anklickbar', () => {
  beforeAll(async () => { await ladeGlossar('de'); await ladeGlossar('en'); });
  for (const sp of ['de', 'en'] as const) {
    it(`${sp}: jeder Begriff in einem Satz führt zum richtigen Eintrag`, () => {
      const ix = baueIndex(artikelListe(sp), sp);
      for (const [wort, id] of WOERTER[sp]) {
        const text = `Im Ergebnis steht ${wort} als Zahl.`;
        expect(finde(text, ix).map(x => `${text.slice(x.von, x.bis)}=${x.id}`), wort).toContain(`${wort}=${id}`);
      }
    });
    it(`${sp}: die Begriffe haben den Satz „So geht es in Statable“`, () => {
      const vor = sp === 'de' ? 'So geht es in Statable: ' : 'How it works in Statable: ';
      for (const id of MIT_SATZ) {
        const a = artikelListe(sp).find(x => x.id === id);
        expect(a, `${sp} ${id}`).toBeDefined();
        expect(a!.inhalt.some(b => typeof b === 'string' && b.startsWith(vor)), `${sp} ${id}`).toBe(true);
      }
    });
  }
});
