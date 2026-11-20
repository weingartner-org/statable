import { beforeAll, describe, expect, it } from 'vitest';
import { artikelListe } from './artikel';
import { ladeGlossar } from './glossar';
import { baueIndex, finde } from './begriffsfinder';

/**
 * Field-Stufe 3a (05.11.2026, Lernpfad „Varianzanalyse vertiefen“): Die Fachbegriffe der sechs neuen Einheiten müssen im Glossar stehen (Deutsch und Englisch) und im Text anklickbar werden.
 * Der Verlinker (lib/begriffsverlinker.ts) nimmt das Titelwort jedes Glossar-Eintrags (Titel bis zur Klammer, nur ganze Wörter) - die Texte benutzen genau diese Schreibweisen.
 * Neu angelegt in dieser Stufe (familienfehlerrate teilt sich der Pfad mit „Sauber forschen“): wechselwirkung, differenz-der-differenzen, einfache-effekte, familienfehlerrate, varianz-der-differenzen, epsilon, greenhouse-geisser-korrektur, kontrastwert,
 * linearer-trend, quadratischer-trend; die übrigen waren schon da.
 */
const WOERTER: Record<'de' | 'en', [string, string][]> = {
  de: [['Kontrastgewicht', 'kontrastgewicht'], ['Kontrastwert', 'kontrastwert'], ['Geplanter Vergleich', 'geplanter-kontrast'], ['Kontrast', 'kontrast'], ['Trendanalyse', 'trendanalyse'], ['Linearer Trend', 'linearer-trend'],
    ['Quadratischer Trend', 'quadratischer-trend'], ['Wechselwirkung', 'wechselwirkung'], ['Differenz der Differenzen', 'differenz-der-differenzen'], ['Haupteffekt', 'haupteffekt'], ['Einfache Effekte', 'einfache-effekte'],
    ['Einfacher Haupteffekt', 'einfacher-haupteffekt'], ['Sphärizität', 'sphaerizitaet'], ['Varianz der Differenzen', 'varianz-der-differenzen'], ['Mauchly-Test', 'mauchly'], ['Epsilon', 'epsilon'],
    ['Greenhouse-Geisser-Korrektur', 'greenhouse-geisser-korrektur'], ['Huynh-Feldt-Korrektur', 'huynh-feldt'], ['Dunnett-Test', 'dunnett'], ['Kontrollgruppe', 'kontrollgruppe'], ['Familienfehlerrate', 'familienfehlerrate'],
    ['Alpha-Kumulierung', 'alpha-kumulierung'], ['Holm-Verfahren', 'holm'], ['Bonferroni-Korrektur', 'bonferroni'], ['Tukey-Test', 'tukey'], ['Scheffé-Test', 'scheffe'], ['Post-hoc-Test', 'post-hoc'], ['Orthogonal', 'orthogonal']],
  en: [['Contrast weight', 'kontrastgewicht'], ['Contrast value', 'kontrastwert'], ['Planned comparison', 'geplanter-kontrast'], ['Contrast', 'kontrast'], ['Trend analysis', 'trendanalyse'], ['Linear trend', 'linearer-trend'],
    ['Quadratic trend', 'quadratischer-trend'], ['Interaction effect', 'wechselwirkung'], ['Difference of the differences', 'differenz-der-differenzen'], ['Main effect', 'haupteffekt'], ['Simple effects', 'einfache-effekte'],
    ['Simple main effect', 'einfacher-haupteffekt'], ['Variance of the differences', 'varianz-der-differenzen'], ["Mauchly's test", 'mauchly'], ['Epsilon', 'epsilon'],
    ['Greenhouse-Geisser correction', 'greenhouse-geisser-korrektur'], ['Huynh-Feldt correction', 'huynh-feldt'], ['Dunnett test', 'dunnett'], ['Control group', 'kontrollgruppe'], ['Familywise error rate', 'familienfehlerrate'],
    ['Alpha accumulation', 'alpha-kumulierung'], ['Holm procedure', 'holm'], ['Bonferroni correction', 'bonferroni'], ['Tukey test', 'tukey'], ['Scheffé test', 'scheffe'], ['Post hoc test', 'post-hoc'], ['Orthogonal', 'orthogonal']]
};
const ARTIKEL = ['vv-kontraste', 'vv-trend', 'vv-wechselwirkung', 'vv-einfache-effekte', 'vv-sphaerizitaet', 'vv-dunnett'];

describe('Fachbegriffe des Lernpfads „Varianzanalyse vertiefen“', () => {
  beforeAll(async () => { await ladeGlossar('de'); await ladeGlossar('en'); });
  for (const sp of ['de', 'en'] as const) {
    it(`${sp}: jeder Begriff steht in der Hilfe (Glossar oder Artikel) und führt im Satz zum richtigen Eintrag`, () => {
      const ix = baueIndex(artikelListe(sp), sp);
      for (const [wort, id] of WOERTER[sp]) {
        expect(artikelListe(sp).some(x => x.id === id), `${sp} ${id}: Eintrag fehlt`).toBe(true);
        const text = `Im Ergebnis steht ${wort} als Zahl.`;
        const f = finde(text, ix);
        expect(f.map(x => `${text.slice(x.von, x.bis)}=${x.id}`.toLowerCase()), wort).toContain(`${wort}=${id}`.toLowerCase());
      }
    });
    it(`${sp}: die sechs Artikel haben Beispiel von Hand, „So geht es in Statable“, einen Block „Stimmt nicht - so ist es“ und „Zum Mitnehmen“ mit drei bis fünf Merksätzen`, () => {
      for (const id of ARTIKEL) {
        const art = artikelListe(sp).find(x => x.id === id);
        expect(art, `${sp} ${id}`).toBeTruthy();
        const text = JSON.stringify(art!.inhalt);
        expect(text, `${sp} ${id}`).toContain(sp === 'de' ? 'Ein Beispiel von Hand' : 'An example by hand');
        expect(text, `${sp} ${id}`).toContain(sp === 'de' ? 'So geht es in Statable' : 'How it works in Statable');
        const bl = art!.inhalt;
        expect(bl.some(b => typeof b === 'object' && 'falsch' in b), `${sp} ${id}: falsch-Block`).toBe(true);
        const mn = bl.find(b => typeof b === 'object' && 'mitnehmen' in b) as { mitnehmen: { kopf: string; punkte: string[] } } | undefined;
        expect(mn, `${sp} ${id}: mitnehmen-Block`).toBeTruthy();
        expect(mn!.mitnehmen.punkte.length, `${sp} ${id}`).toBeGreaterThanOrEqual(3);
        expect(mn!.mitnehmen.punkte.length, `${sp} ${id}`).toBeLessThanOrEqual(5);
        expect(bl.at(-1), `${sp} ${id}: Mitnehmen steht am Ende`).toBe(mn);
      }
    });
  }
});
