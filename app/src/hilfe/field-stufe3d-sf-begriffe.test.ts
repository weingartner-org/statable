import { beforeAll, describe, expect, it } from 'vitest';
import { artikelListe } from './artikel';
import { ladeGlossar } from './glossar';
import { baueIndex, finde } from './begriffsfinder';

/**
 * Field-Stufe 3, Lernpfad „Sauber forschen“ (05.11.2026): Die Fachbegriffe der fünf neuen Einheiten müssen im Glossar stehen (Deutsch und Englisch) und im Text anklickbar werden.
 * Der Verlinker (lib/begriffsverlinker.ts) nimmt das Titelwort jedes Glossar-Eintrags (Titel bis zur Klammer, nur ganze Wörter) - die Texte benutzen genau diese Schreibweisen.
 * Neu angelegt in dieser Stufe: forschungskreislauf, forschungsfreiheitsgrade, registrierter-bericht, familienfehlerrate, optionales-stoppen, beta-binomial-modell, prior-staerke.
 */
const WOERTER: Record<'de' | 'en', [string, string][]> = {
  de: [['Forschungskreislauf', 'forschungskreislauf'], ['Forschungsfreiheitsgrade', 'forschungsfreiheitsgrade'], ['Registrierter Bericht', 'registrierter-bericht'], ['Familienfehlerrate', 'familienfehlerrate'],
    ['Optionales Stoppen', 'optionales-stoppen'], ['Beta-Binomial-Modell', 'beta-binomial-modell'], ['Prior-Stärke', 'prior-staerke'], ['p-Hacking', 'p-hacking'], ['HARKing', 'harking'], ['Präregistrierung', 'praeregistrierung'],
    ['Prior', 'prior'], ['Posterior', 'posterior'], ['Beta-Verteilung', 'beta-verteilung'], ['Hypothese', 'hypothese'], ['Theorie', 'theorie'], ['Unabhängige Variable', 'unabhaengige-variable'], ['Abhängige Größe', 'abhaengige-groesse'],
    ['Signifikanzniveau', 'signifikanzniveau'], ['Bonferroni-Korrektur', 'bonferroni'], ['Alpha-Kumulierung', 'alpha-kumulierung'], ['Effektstärke', 'effektstaerke'], ['Falsifikation', 'falsifikation']],
  en: [['Research cycle', 'forschungskreislauf'], ['Researcher degrees of freedom', 'forschungsfreiheitsgrade'], ['Registered report', 'registrierter-bericht'], ['Familywise error rate', 'familienfehlerrate'],
    ['Optional stopping', 'optionales-stoppen'], ['Beta-binomial model', 'beta-binomial-modell'], ['Prior strength', 'prior-staerke'], ['p-hacking', 'p-hacking'], ['HARKing', 'harking'], ['Preregistration', 'praeregistrierung'],
    ['Prior', 'prior'], ['Posterior', 'posterior'], ['Beta distribution', 'beta-verteilung'], ['Hypothesis', 'hypothese'], ['Theory', 'theorie'], ['Independent variable', 'unabhaengige-variable'], ['Dependent variable', 'abhaengige-groesse'],
    ['Significance level', 'signifikanzniveau'], ['Bonferroni correction', 'bonferroni'], ['Alpha accumulation', 'alpha-kumulierung'], ['Effect size', 'effektstaerke'], ['Falsification', 'falsifikation']]
};
const ARTIKEL = ['sf-kreislauf', 'sf-p-hacking', 'sf-vorregistrierung', 'sf-p-grundsaetze', 'sf-bayes-vorwissen'];

describe('Fachbegriffe des Lernpfads „Sauber forschen“', () => {
  beforeAll(async () => { await ladeGlossar('de'); await ladeGlossar('en'); });
  for (const sp of ['de', 'en'] as const) {
    it(`${sp}: jeder Begriff steht in der Hilfe (Glossar oder Artikel) und führt im Satz zum richtigen Eintrag`, () => {
      const ix = baueIndex(artikelListe(sp), sp);
      for (const [wort, id] of WOERTER[sp]) {
        expect(artikelListe(sp).some(x => x.id === id), `${sp} ${id}: Eintrag fehlt`).toBe(true);
        const text = `Im Bericht steht ${wort} als Begriff.`;
        const f = finde(text, ix);
        expect(f.map(x => `${text.slice(x.von, x.bis)}=${x.id}`).map(x => x.toLowerCase()), wort).toContain(`${wort}=${id}`.toLowerCase());
      }
    });
    it(`${sp}: die fünf Artikel haben Kurzfassung, Beispiel von Hand, „So geht es in Statable“, mindestens einen Block „Stimmt nicht - so ist es“ und „Zum Mitnehmen“ mit 3 bis 5 Punkten`, () => {
      for (const id of ARTIKEL) {
        const art = artikelListe(sp).find(x => x.id === id);
        expect(art, `${sp} ${id}`).toBeTruthy();
        const text = JSON.stringify(art!.inhalt);
        expect(text, `${sp} ${id}`).toContain(sp === 'de' ? 'Ein Beispiel von Hand' : 'An example by hand');
        expect(text, `${sp} ${id}`).toContain(sp === 'de' ? 'So geht es in Statable' : 'How it works in Statable');
        const falsch = art!.inhalt.filter(b => typeof b === 'object' && 'falsch' in b);
        expect(falsch.length, `${sp} ${id}: falsch-Block`).toBeGreaterThanOrEqual(1);
        const mit = art!.inhalt.filter(b => typeof b === 'object' && 'mitnehmen' in b);
        expect(mit, `${sp} ${id}: mitnehmen-Block`).toHaveLength(1);
        const m = mit[0] as { mitnehmen: { kopf: string; punkte: string[] } };
        expect(m.mitnehmen.punkte.length, `${sp} ${id}`).toBeGreaterThanOrEqual(3); expect(m.mitnehmen.punkte.length, `${sp} ${id}`).toBeLessThanOrEqual(5);
        expect(m.mitnehmen.kopf).toBe(sp === 'de' ? 'Zum Mitnehmen' : 'Take away');
        expect(art!.inhalt.at(-1), `${sp} ${id}: Mitnehmen steht am Ende`).toBe(mit[0]);
      }
    });
  }
});
