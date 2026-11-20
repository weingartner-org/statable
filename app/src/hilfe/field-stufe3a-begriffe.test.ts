import { beforeAll, describe, expect, it } from 'vitest';
import { artikelListe } from './artikel';
import { ladeGlossar } from './glossar';
import { baueIndex, finde } from './begriffsfinder';

/**
 * Field-Stufe 3a (05.11.2026): Die Fachbegriffe der neuen Blöcke (zwei Messwiederholungsfaktoren, gemischtes Design, Kontraste mit eigenem Fehlerterm, einfache Haupteffekte,
 * dreifaktorielle Varianzanalyse) müssen im Text anklickbar werden und den Satz „So geht es in Statable“ tragen (Deutsch und Englisch).
 */
const WOERTER: Record<'de' | 'en', [string, string][]> = {
  de: [['Sphärizität', 'sphaerizitaet'], ['Huynh-Feldt-Korrektur', 'huynh-feldt'], ['Generalisiertes Eta-Quadrat', 'generalisiertes-eta'], ['Einfacher Haupteffekt', 'einfacher-haupteffekt'],
    ['Dreifach-Wechselwirkung', 'dreifach-wechselwirkung'], ['Innersubjektfaktor', 'innersubjektfaktor'], ['Zwischensubjektfaktor', 'zwischensubjektfaktor'],
    ['Kontrast mit eigenem Fehlerterm', 'kontrast-eigener-fehlerterm'], ['Dreifaktorielle Varianzanalyse', 'dreifaktorielle-varianzanalyse']],
  en: [['Sphericity', 'sphaerizitaet'], ['Huynh-Feldt correction', 'huynh-feldt'], ['Generalised eta squared', 'generalisiertes-eta'], ['Simple main effect', 'einfacher-haupteffekt'],
    ['Three-way interaction', 'dreifach-wechselwirkung'], ['Within-subject factor', 'innersubjektfaktor'], ['Between-subject factor', 'zwischensubjektfaktor'],
    ['Contrast with its own error term', 'kontrast-eigener-fehlerterm'], ['Three-way analysis of variance', 'dreifaktorielle-varianzanalyse']]
};
const MIT_SATZ = ['sphaerizitaet', 'greenhouse-geisser', 'huynh-feldt', 'generalisiertes-eta', 'einfacher-haupteffekt', 'dreifach-wechselwirkung', 'innersubjektfaktor', 'zwischensubjektfaktor', 'kontrast-eigener-fehlerterm', 'dreifaktorielle-varianzanalyse'];

describe('Neue Fachbegriffe (Stufe 3a) sind im Text anklickbar', () => {
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
  it('Die Texte der Blöcke benutzen genau diese Schreibweisen und sind verlinkbar (Deutsch)', () => {
    const ix = baueIndex(artikelListe('de'), 'de');
    for (const [text, id] of [['die Dreifach-Wechselwirkung ist bedeutsam', 'dreifach-wechselwirkung'], ['ein Zwischensubjektfaktor kommt dazu', 'zwischensubjektfaktor'], ['ein Innersubjektfaktor', 'innersubjektfaktor'], ['die Sphärizität ist verletzt', 'sphaerizitaet']] as const)
      expect(finde(text, ix).map(x => x.id), text).toContain(id);
  });
});
