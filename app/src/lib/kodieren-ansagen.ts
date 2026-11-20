/**
 * Ansagen des Kodier-Arbeitsplatzes nach einem Fokuswechsel (Stufe 6c, Befunde VO2 und VO3 aus docs/erheben/VOICEOVER-STUFE-6B.md).
 * VoiceOver in Safari verschluckt eine Ansage, die gleichzeitig mit dem Fokuswechsel kommt. Darum ruft die Seite diese Sätze
 * über `sageSpaeter(…, NACH_FOKUS_MS)` auf, wie „Code … gegeben“.
 */
import { L } from './sitzung.svelte';

/** „Ansicht Sätze. Satz 3 von 53.“ oder „Ansicht Text.“ */
export function ansichtSatz(ansicht: 'text' | 'saetze', fokusNr = 1, anzahl = 0): string {
  return ansicht === 'saetze'
    ? L(`Ansicht Sätze. Satz ${fokusNr} von ${anzahl}.`, `View sentences. Sentence ${fokusNr} of ${anzahl}.`)
    : L('Ansicht Text.', 'View text.');
}

/** „Code bearbeiten: Planung.“ - nach Enter oder F2 im Codebaum, wenn der Fokus im Feld „Name“ steht. */
export function codeBearbeitenSatz(name: string): string {
  return L(`Code bearbeiten: ${name}.`, `Edit code: ${name}.`);
}
