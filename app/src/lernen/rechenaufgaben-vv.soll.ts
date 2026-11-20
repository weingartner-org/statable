/**
 * Nachrechnung der Aufgaben aus `rechenaufgaben-vv.ts` (nur vom Wächter `rechenaufgaben.test.ts` gelesen): Die Sollwerte kommen aus R
 * (`scripts/ueben-erwartet-varianzanalyse-vertiefen.R`: lm(), vcov(), anova(), emmeans(), var(), dbinom()), also auf einem anderen Weg als die Formeln der App.
 */
import erw from '../lib/testdaten/ueben-erwartet-varianzanalyse-vertiefen.json';

const AUFGABEN = (erw as unknown as { aufgaben: Record<string, Record<string, number>> }).aufgaben;

export function sollVV(id: string): Record<string, number> | undefined {
  return AUFGABEN[id];
}
