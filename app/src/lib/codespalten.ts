/**
 * Spalten aus dem Import qualitativer Codierungen (Code-Matrix, Segmenttabelle; lib/qdaimport.ts) und die Hinweise, wenn eine Auswertung mit ihnen rechnet
 * (Fachblatt docs/erheben/FACHBLATT-STUFE-1.md, Paket 1E). Quelle für den Lehrtext: Sandelowski, Voils & Knafl (2009), „On quantitizing“, Journal of Mixed Methods Research 3(3), 208-222.
 *
 * Das Kennzeichen `Spalte.herkunft = 'codes'` kommt aus dem Verzeichnis der Engine nicht zurück (die Engine kennt es nicht): Das Projekt merkt sich die Namen (`codeSpalten`, in der Projektdatei erhalten),
 * und beim Einlesen der Spalten werden sie wieder aufgesetzt. Alte Dateien ohne das Feld haben keine Code-Spalte.
 */
import { L } from './sitzung.svelte';
import type { Spalte } from './verzeichnis';

/** Das Feld aus einer Projektdatei: nur eine Liste von Texten (geprüft, höchstens 2000 Namen), alles andere ist „keine Code-Spalte“. */
export const leseCodeSpalten = (x: unknown): string[] => (Array.isArray(x) ? x.filter((n): n is string => typeof n === 'string' && n.length > 0 && n.length <= 200).slice(0, 2000) : []);

/** Setzt `herkunft: 'codes'` an die Spalten mit diesen Namen (Groß- und Kleinschreibung wie in PSPP gleich); die übrigen Spalten bleiben, wie sie sind. */
export function markiereCodeSpalten(spalten: Spalte[], namen: readonly string[]): Spalte[] {
  if (!namen.length) return spalten;
  const menge = new Set(namen.map(n => n.toLowerCase()));
  return spalten.map(sp => (menge.has(sp.name.toLowerCase()) ? { ...sp, herkunft: 'codes' as const } : sp));
}

/** Rechnet die Auswertung mit mindestens einer Code-Spalte? `benutzt`: Spaltennamen der Auswertung. */
export const nutztCodeSpalte = (spalten: readonly Spalte[], benutzt: readonly string[]): boolean => {
  const b = new Set(benutzt.map(n => n.toLowerCase()));
  return spalten.some(sp => sp.herkunft === 'codes' && b.has(sp.name.toLowerCase()));
};

export const nullSatz = () => L('0 heißt hier: nicht erwähnt. Das ist nicht dasselbe wie: trifft nicht zu.', '0 means here: not mentioned. That is not the same as: does not apply.');
export const gezieltSatz = () => L('Die Fälle wurden gezielt ausgewählt, nicht zufällig. p-Werte lassen sich dann nicht auf eine Grundgesamtheit übertragen.', 'The cases were selected on purpose, not at random. p values then cannot be transferred to a population.');

/** Ab so vielen Fällen entfällt der Satz zur gezielten Auswahl. */
export const N_KLEIN = 30;

/** Der Hinweis zu einer Auswertung (einmal, nie je Tabelle): `null`, wenn keine Code-Spalte benutzt wird. `text`: der erste Satz; `klein`: bei n < 30 der zweite. Keine Sperre. */
export function codeSpaltenHinweis(spalten: readonly Spalte[], benutzt: readonly string[], n: number): { text: string; klein: string } | null {
  if (!nutztCodeSpalte(spalten, benutzt)) return null;
  return { text: nullSatz(), klein: n < N_KLEIN ? gezieltSatz() : '' };
}
