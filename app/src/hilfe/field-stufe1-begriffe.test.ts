import { beforeAll, describe, expect, it } from 'vitest';
import { artikelListe } from './artikel';
import { ladeGlossar } from './glossar';
import { baueIndex, finde } from './begriffsfinder';

/**
 * Field-Stufe 1 (05.11.2026): Die Fachbegriffe in den neuen Texten (DiagnoseBlock, KreuzResiduen, FaktorKmoBlock) müssen anklickbar werden.
 * Der Verlinker (lib/begriffsverlinker.ts) nimmt das Titelwort jedes Glossar-Eintrags (Titel bis zur Klammer, nur ganze Wörter) - die Texte benutzen genau diese Schreibweisen.
 */
const WOERTER: Record<'de' | 'en', [string, string][]> = {
  de: [['Toleranz', 'toleranz'], ['Varianzinflationsfaktor', 'vif'], ['Semipartialkorrelation', 'semipartialkorrelation'], ['Hebelwert', 'hebelwert'], ['Cooks Distanz', 'cooks-distanz'], ['DFBETAS', 'dfbetas-dffits'],
    ['studentisiertes Residuum', 'studentisiertes-residuum'], ['Durbin-Watson-Test', 'durbin-watson'], ['Angepasstes Residuum', 'angepasstes-residuum'], ['Standardisiertes Residuum', 'standardisiertes-residuum'],
    ['Likelihood-Quotient-Test', 'likelihood-quotient-test'], ['Yates-Korrektur', 'yates'], ['KMO-Maß', 'kmo'], ['Anti-Image-Korrelationsmatrix', 'anti-image-korrelationsmatrix'], ['Determinante der Korrelationsmatrix', 'determinante-korrelationsmatrix']],
  en: [['Tolerance', 'toleranz'], ['variance inflation factor', 'vif'], ['semipartial correlation', 'semipartialkorrelation'], ['leverage', 'hebelwert'], ["Cook's distance", 'cooks-distanz'], ['DFBETAS', 'dfbetas-dffits'],
    ['studentised residual', 'studentisiertes-residuum'], ['Durbin-Watson test', 'durbin-watson'], ['adjusted residual', 'angepasstes-residuum'], ['standardized residual', 'standardisiertes-residuum'],
    ['likelihood ratio test', 'likelihood-quotient-test'], ['Yates correction', 'yates'], ['KMO measure', 'kmo'], ['anti-image correlation matrix', 'anti-image-korrelationsmatrix'], ['determinant of the correlation matrix', 'determinante-korrelationsmatrix']]
};

describe('Neue Fachbegriffe sind im Text anklickbar', () => {
  beforeAll(async () => { await ladeGlossar('de'); await ladeGlossar('en'); });
  for (const sp of ['de', 'en'] as const) {
    it(`${sp}: jeder Begriff in einem Satz führt zum richtigen Eintrag`, () => {
      const ix = baueIndex(artikelListe(sp), sp);
      for (const [wort, id] of WOERTER[sp]) {
        const text = `Im Ergebnis steht ${wort} als Zahl.`;
        const f = finde(text, ix);
        expect(f.map(x => `${text.slice(x.von, x.bis)}=${x.id}`), wort).toContain(`${wort}=${id}`);
      }
    });
  }
  it('Hilfe-Artikel Kollinearität und Ausreißer haben den Satz „So geht es in Statable“ (de und en)', () => {
    for (const sp of ['de', 'en'] as const) for (const id of ['kollinearitaet', 'ausreisser']) {
      const a = artikelListe(sp).find(x => x.id === id)!;
      const zeile = a.inhalt.find(b => typeof b === 'string' && b.startsWith(sp === 'de' ? 'So geht es in Statable: ' : 'How it works in Statable: '));
      expect(zeile, `${sp} ${id}`).toBeTruthy();
      expect(String(zeile)).toContain(sp === 'de' ? 'Regression prüfen' : 'Checking the regression');
    }
  });
});
