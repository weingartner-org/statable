/**
 * Nachrechnung der Aufgaben aus `rechenaufgaben-nutzen-b.ts` (nur vom Wächter `rechenaufgaben.test.ts` gelesen). Die Sollwerte schreibt kein Bauer von Hand:
 * Ein Prüfer rechnet sie in R auf anderem Weg (Auftrag: `docs/nutzen/RECHENAUFGABEN-NUTZEN-B-AUFTRAG.md`) und trägt sie in
 * `lib/testdaten/ueben-erwartet-nutzen-b.json` ein (Form wie `ueben-erwartet-varianzanalyse-vertiefen.json`: `{ "quelle", "aufgaben": { "<Aufgabe>": { "<Schritt>": Zahl } } }`).
 * Solange ein Eintrag fehlt, gilt die Aufgabe im Wächter als bekannte Lücke (siehe `rechenaufgaben.test.ts`, „Sollwerte noch offen“).
 */
import erw from '../lib/testdaten/ueben-erwartet-nutzen-b.json';

const AUFGABEN = (erw as unknown as { aufgaben: Record<string, Record<string, number>> }).aufgaben;

export function sollNB(id: string): Record<string, number> | undefined {
  return AUFGABEN[id];
}
