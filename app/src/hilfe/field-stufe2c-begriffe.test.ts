import { beforeAll, describe, expect, it } from 'vitest';
import { artikelListe } from './artikel';
import { ladeGlossar } from './glossar';
import { baueIndex, finde } from './begriffsfinder';

/**
 * Field-Stufe 2c (05.11.2026, Lernpfad „Regression prüfen“): Die Fachbegriffe der neuen Einheiten müssen im Glossar stehen (Deutsch und Englisch) und im Text anklickbar werden.
 * Der Verlinker (lib/begriffsverlinker.ts) nimmt das Titelwort jedes Glossar-Eintrags (Titel bis zur Klammer, nur ganze Wörter) - die Texte benutzen genau diese Schreibweisen.
 * Neu angelegt in dieser Stufe: schrumpfung, korrelationen-vergleichen; die übrigen waren schon da (Stufe 1 oder früher).
 */
const WOERTER: Record<'de' | 'en', [string, string][]> = {
  de: [['Hebelwert', 'hebelwert'], ['Cooks Distanz', 'cooks-distanz'], ['studentisiertes Residuum', 'studentisiertes-residuum'], ['Semipartialkorrelation', 'semipartialkorrelation'], ['Partialkorrelation', 'partialkorrelation'],
    ['Venn-Diagramm', 'venn-diagramm'], ['Korrigiertes R²', 'korrigiertes-r2'], ['Überanpassung', 'overfitting'], ['Kreuzvalidierung', 'kreuzvalidierung'], ['Schrittweise Regression', 'schrittweise-regression'],
    ['Schrumpfung', 'schrumpfung'], ['Zwei Korrelationen vergleichen', 'korrelationen-vergleichen'], ['Varianzinflationsfaktor', 'vif'], ['Toleranz', 'toleranz'], ['Kollinearität', 'kollinearitaet'], ['Kovarianzanalyse', 'ancova']],
  en: [['leverage', 'hebelwert'], ["Cook's distance", 'cooks-distanz'], ['studentised residual', 'studentisiertes-residuum'], ['semipartial correlation', 'semipartialkorrelation'], ['partial correlation', 'partialkorrelation'],
    ['Venn diagram', 'venn-diagramm'], ['adjusted R²', 'korrigiertes-r2'], ['overfitting', 'overfitting'], ['cross-validation', 'kreuzvalidierung'], ['stepwise regression', 'schrittweise-regression'],
    ['shrinkage', 'schrumpfung'], ['Comparing two correlations', 'korrelationen-vergleichen'], ['variance inflation factor', 'vif'], ['Tolerance', 'toleranz'], ['collinearity', 'kollinearitaet'], ['analysis of covariance', 'ancova']]
};

describe('Fachbegriffe des Lernpfads „Regression prüfen“', () => {
  beforeAll(async () => { await ladeGlossar('de'); await ladeGlossar('en'); });
  for (const sp of ['de', 'en'] as const) {
    it(`${sp}: jeder Begriff steht in der Hilfe (Glossar oder Artikel) und führt im Satz zum richtigen Eintrag`, () => {
      const ix = baueIndex(artikelListe(sp), sp);
      for (const [wort, id] of WOERTER[sp]) {
        expect(artikelListe(sp).some(x => x.id === id), `${sp} ${id}: Eintrag fehlt`).toBe(true);
        const text = `Im Ergebnis steht ${wort} als Zahl.`;
        const f = finde(text, ix);
        expect(f.map(x => `${text.slice(x.von, x.bis)}=${x.id}`).map(x => x.toLowerCase()), wort).toContain(`${wort}=${id}`.toLowerCase());
      }
    });
  }
  it('die vier neuen Artikel gibt es in Deutsch und Englisch mit Kurzfassung, Beispiel von Hand und „So geht es in Statable“', () => {
    for (const sp of ['de', 'en'] as const) for (const id of ['rp-einfluss', 'rp-beitrag', 'rp-ueberanpassung', 'rp-korrelationen-vergleichen']) {
      const art = artikelListe(sp).find(x => x.id === id);
      expect(art, `${sp} ${id}`).toBeTruthy();
      const text = JSON.stringify(art!.inhalt);
      expect(text, `${sp} ${id}`).toContain(sp === 'de' ? 'Ein Beispiel von Hand' : 'An example by hand');
      expect(text, `${sp} ${id}`).toContain(sp === 'de' ? 'So geht es in Statable' : 'How it works in Statable');
    }
  });
});
