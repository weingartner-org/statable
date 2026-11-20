import { beforeAll, describe, expect, it } from 'vitest';
import { artikelListe } from './artikel';
import { ladeGlossar } from './glossar';
import { baueIndex, finde } from './begriffsfinder';

/**
 * Field-Stufe 2 (05.11.2026): Die Fachbegriffe in den neuen Texten (KontrasteBlock, Paarvergleiche, Omega-Quadrat, Randmittel, Kovarianzanalyse mit mehreren Kontrollvariablen)
 * müssen anklickbar werden. Der Verlinker nimmt das Titelwort jedes Glossar-Eintrags (Titel bis zur Klammer, nur ganze Wörter); die Texte benutzen genau diese Schreibweisen.
 * Dazu: Die Begriffe tragen den Satz „So geht es in Statable“ in Deutsch und Englisch.
 */
const WOERTER: Record<'de' | 'en', [string, string][]> = {
  de: [['Kontrastgewicht', 'kontrastgewicht'], ['Geplanter Vergleich', 'geplanter-kontrast'], ['Kontrast', 'kontrast'], ['Helmert-Kontrast', 'helmert'], ['Trendanalyse', 'trendanalyse'],
    ['Dunnett-Test', 'dunnett'], ['Scheffé-Test', 'scheffe'], ['Holm-Verfahren', 'holm'], ['Omega-Quadrat', 'omega-quadrat'], ['Geschätzte Randmittel', 'geschaetzte-randmittel'],
    ['Adjustierte Mittelwerte', 'adjustierter-mittelwert'], ['Steigungshomogenität', 'steigungshomogenitaet'], ['Typ-III-Quadratsumme', 'typ-iii-quadratsumme'], ['orthogonal', 'orthogonal']],
  en: [['Contrast weight', 'kontrastgewicht'], ['Planned comparison', 'geplanter-kontrast'], ['Contrast', 'kontrast'], ['Helmert contrast', 'helmert'], ['Trend analysis', 'trendanalyse'],
    ['Dunnett test', 'dunnett'], ['Scheffé test', 'scheffe'], ['Holm procedure', 'holm'], ['Omega squared', 'omega-quadrat'], ['Estimated marginal means', 'geschaetzte-randmittel'],
    ['Adjusted means', 'adjustierter-mittelwert'], ['Homogeneity of slopes', 'steigungshomogenitaet'], ['Type III sum of squares', 'typ-iii-quadratsumme'], ['orthogonal', 'orthogonal']]
};
const MIT_SATZ = ['kontrastgewicht', 'geplanter-kontrast', 'kontrast', 'helmert', 'trendanalyse', 'dunnett', 'scheffe', 'holm', 'omega-quadrat', 'geschaetzte-randmittel', 'adjustierter-mittelwert', 'steigungshomogenitaet', 'typ-iii-quadratsumme', 'ancova', 'regressionshomogenitaet'];

describe('Neue Fachbegriffe (Stufe 2) sind im Text anklickbar', () => {
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
  it('Die Hilfe-Artikel zu den Paarvergleichen, zur zweifaktoriellen Varianzanalyse und zur Kovarianzanalyse nennen die neuen Möglichkeiten (de und en)', () => {
    const text = (sp: 'de' | 'en', id: string) => JSON.stringify(artikelListe(sp).find(x => x.id === id)!.inhalt);
    for (const sp of ['de', 'en'] as const) {
      expect(text(sp, 'frage-posthoc')).toMatch(/Dunnett/); expect(text(sp, 'frage-posthoc')).toMatch(/Scheff/); expect(text(sp, 'frage-posthoc')).toMatch(sp === 'de' ? /Geplante Vergleiche/ : /Planned comparisons/);
      expect(text(sp, 'zweifaktorielle-varianzanalyse')).toMatch(sp === 'de' ? /Omega-Quadrat/ : /omega squared/);
      expect(text(sp, 'kovarianzanalyse')).toMatch(sp === 'de' ? /bis zu vier/ : /up to four/);
    }
  });
});
