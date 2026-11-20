/**
 * Nachrechnung der Aufgaben aus `rechenaufgaben-nutzen.ts` (nur vom Wächter `rechenaufgaben.test.ts` gelesen): Die Sollwerte kommen aus R
 * (`lib/testdaten/ueben-erwartet-nutzen.json`), also auf einem anderen Weg als die Formeln der App. Sie stehen noch aus: Ein Prüfer füllt die JSON
 * nach `docs/nutzen/RECHENAUFGABEN-NUTZEN-AUFTRAG.md`. Solange ein Eintrag fehlt, gilt die Aufgabe als bekannte Lücke (`sollFehlt`), der Wächter vergleicht sie nicht.
 */
import erw from '../lib/testdaten/ueben-erwartet-nutzen.json';

const AUFGABEN = (erw as unknown as { aufgaben: Record<string, Record<string, number>> }).aufgaben;

/** Die Kennungen der Aufgaben dieser Datei (zum Prüfen, ob die Sollwerte vollständig sind). */
export const AUFGABEN_NUTZEN_IDS = ['irt-wahrscheinlichkeit', 'omega-ladungen', 'invarianz-cfi', 'pfad-indirekt', 'spearman-brown'];

export function sollNutzen(id: string): Record<string, number> | undefined {
  return AUFGABEN[id];
}
/** Wahr, solange der Prüfer für diese Aufgabe noch keinen R-Sollwert eingetragen hat (bekannte Lücke). */
export const sollFehlt = (id: string): boolean => AUFGABEN_NUTZEN_IDS.includes(id) && !AUFGABEN[id];
