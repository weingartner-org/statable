import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { artikelListe } from './artikel';
import { ladeGlossar, glossarEintrag } from './glossar';
import { baueIndex, finde } from './begriffsfinder';

/**
 * Field-Stufe 2b (05.11.2026): Die Fachbegriffe der neuen Texte (LogistikPruefen, MehrebenenZusatz, MehrebenenModelle, mehrebenensaetze) müssen im Glossar stehen und anklickbar werden.
 * (REML, AIC und BIC sind zu kurz für den Verlinker und stehen dort über ihr Glossar-Stichwort.) Zwei Prüfungen je Begriff: (1) der Verlinker findet das Wort in einem Satz und führt zum richtigen Eintrag; (2) der Quelltext der Bausteine enthält das Wort wirklich.
 * Johannes: nur Deutsch und Englisch; die übrigen Sprachen fallen auf Englisch zurück (Ausnahmeliste NUR_DE_EN in glossar.test.ts).
 */
const WOERTER: Record<'de' | 'en', [string, string][]> = {
  de: [['Hosmer-Lemeshow-Test', 'hosmer-lemeshow'], ['Box-Tidwell-Test', 'box-tidwell'], ['Linearität des Logits', 'linearitaet-des-logits'], ['Devianzresiduum', 'devianzresiduum'],
    ['Block', 'block-hierarchisch'], ['Likelihood-Quotienten-Test', 'likelihood-quotienten-test'], ['Gruppenmittelwert-Zentrierung', 'gruppenmittelwertzentrierung'],
    ['Gesamtmittelwert-Zentrierung', 'gesamtmittelwertzentrierung'], ['Ebenen-übergreifende Wechselwirkung', 'ebenenuebergreifende-wechselwirkung'], ['Maximum-Likelihood-Schätzung', 'maximum-likelihood'],
    ['Zufällige Steigung', 'zufaellige-steigung'], ['Wachstumsmodell', 'wachstumsmodell'], ['Intraklassenkorrelation', 'intraklassenkorrelation'],
    ['Cooks Distanz', 'cooks-distanz'], ['Hebelwert', 'hebelwert'], ['Varianzinflationsfaktor', 'vif'], ['Modellvergleich', 'modellvergleich']],
  en: [['Hosmer-Lemeshow test', 'hosmer-lemeshow'], ['Box-Tidwell test', 'box-tidwell'], ['Linearity of the logit', 'linearitaet-des-logits'], ['deviance residual', 'devianzresiduum'],
    ['Block', 'block-hierarchisch'], ['Likelihood ratio test for nested models', 'likelihood-quotienten-test'], ['Group mean centring', 'gruppenmittelwertzentrierung'],
    ['Grand mean centring', 'gesamtmittelwertzentrierung'], ['Cross-level interaction', 'ebenenuebergreifende-wechselwirkung'], ['Maximum likelihood estimation', 'maximum-likelihood'],
    ['Random slope', 'zufaellige-steigung'], ['Growth model', 'wachstumsmodell'],
    ["Cook's distance", 'cooks-distanz'], ['leverage', 'hebelwert'], ['variance inflation factor', 'vif'], ['Model comparison', 'modellvergleich']]
};
/** Diese Wörter stehen wörtlich in den Texten der Bausteine (de bzw. en); das Wort „Block“ steht dort als eigenes Wort im Satz. */
const IM_TEXT: Record<'de' | 'en', string[]> = {
  de: ['Hosmer-Lemeshow-Test', 'Box-Tidwell-Test', 'Linearität des Logits', 'Devianzresiduum', 'Likelihood-Quotient-Test', 'Gruppenmittel-Zentrierung', 'Wachstumsmodell', 'Cooks Distanz', 'Hebelwert', 'Varianzinflationsfaktor', 'Modellvergleich', 'zufällige Steigung', 'Maximum-Likelihood-Schätzung', 'Ebenen-übergreifende Wechselwirkung', 'Wechselwirkung über die Ebenen'],
  en: ['Hosmer-Lemeshow test', 'Box-Tidwell test', 'linearity of the logit', 'deviance residual', 'likelihood ratio test', 'group mean centring', 'growth model', "Cook's distance", 'leverage', 'variance inflation factor', 'model comparison', 'random slope', 'maximum likelihood', 'cross-level interaction', 'grand mean']
};
const dateien = ['bausteine/LogistikPruefen.svelte', 'bausteine/MehrebenenZusatz.svelte', 'bausteine/MehrebenenModelle.svelte', 'lib/mehrebenensaetze.ts'];
const quelltext = dateien.map(f => readFileSync(join(import.meta.dirname, '..', f), 'utf8')).join('\n');

describe('Neue Fachbegriffe (Field-Stufe 2b) sind im Glossar und im Text anklickbar', () => {
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
    it(`${sp}: die Wörter stehen wirklich in den Texten der Bausteine`, () => {
      for (const w of IM_TEXT[sp]) expect(quelltext.toLowerCase(), w).toContain(w.toLowerCase());
    });
  }
  it('Die sieben neuen Einträge haben Titel, Kurztext, Beispiel, Vorsicht und gültige Verweise in de und en', () => {
    const alle = new Set(artikelListe('en').map(a => a.id));
    for (const id of ['box-tidwell', 'linearitaet-des-logits', 'devianzresiduum', 'block-hierarchisch', 'gesamtmittelwertzentrierung', 'ebenenuebergreifende-wechselwirkung', 'likelihood-quotienten-test']) {
      for (const sp of ['de', 'en'] as const) {
        const e = glossarEintrag(id, sp)!;
        expect(e, `${sp} ${id}`).toBeTruthy();
        expect(e.beispiel && e.vorsicht, `${sp} ${id}`).toBeTruthy();
        for (const z of e.siehe ?? []) expect(alle.has(z), `${sp} ${id} → ${z}`).toBe(true);
      }
    }
  });
});
