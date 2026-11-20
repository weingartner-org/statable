/**
 * Nachrechnung der Aufgaben aus `rechenaufgaben-psych.ts` (nur vom Wächter `rechenaufgaben.test.ts` gelesen): Die Sollwerte kommen aus R
 * (`lib/testdaten/ueben-erwartet-psych-rechnen.json`), also auf einem anderen Weg als die Formeln der App. Sie stehen noch aus: Ein Prüfer füllt die JSON
 * nach `docs/nutzen/RECHENAUFGABEN-PSYCH-AUFTRAG.md` (Form: `{ "quelle", "aufgaben": { "<Aufgabe>": { "<Schritt>": Zahl } } }`).
 * Solange ein Eintrag fehlt, gilt die Aufgabe als bekannte Lücke (`sollFehltPsych`), der Wächter vergleicht sie nicht; alle übrigen Prüfungen laufen.
 */
import erw from '../lib/testdaten/ueben-erwartet-psych-rechnen.json';

const AUFGABEN = (erw as unknown as { aufgaben: Record<string, Record<string, number>> }).aufgaben;

/** Die Kennungen der Aufgaben dieser Datei (zum Prüfen, ob die Sollwerte vollständig sind). */
export const AUFGABEN_PSYCH_IDS = ['ps-mittel-sd', 'ps-t-gepaart', 'ps-cohen-d', 'ps-r', 'ps-alpha', 'ps-chi2', 'ps-rci', 'ps-z-t', 'ps-eta2', 'ps-spearman-brown'];

export function sollPsych(id: string): Record<string, number> | undefined {
  return AUFGABEN[id];
}
/** Wahr, solange der Prüfer für diese Aufgabe noch keinen R-Sollwert eingetragen hat (bekannte Lücke). */
export const sollFehltPsych = (id: string): boolean => AUFGABEN_PSYCH_IDS.includes(id) && !AUFGABEN[id];
