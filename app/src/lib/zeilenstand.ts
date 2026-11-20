/** Zeile und Spalte der Schreibmarke in einem Textfeld (Befehlsfeld): für „Wo bin ich?“ (Alt+W) und die Anzeige unter dem Feld. */
import { L } from './sitzung.svelte';

export interface ZeilenStand { zeile: number; spalte: number; von: number }

export function zeilenStand(text: string, pos: number): ZeilenStand {
  const vor = text.slice(0, Math.max(0, pos));
  return { zeile: vor.split('\n').length, spalte: pos - (vor.lastIndexOf('\n') + 1) + 1, von: text.split('\n').length };
}
export const zeilenSatz = (st: ZeilenStand) => L(`Zeile ${st.zeile} von ${st.von}, Spalte ${st.spalte}`, `line ${st.zeile} of ${st.von}, column ${st.spalte}`);
