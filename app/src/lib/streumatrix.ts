/**
 * Streudiagramm-Matrix für 3 bis 6 Zahlenspalten: unten links die Punktwolken, auf der Diagonale die Namen, oben rechts die Korrelation r mit n.
 * Paarweise mit allen Personen, die beide Angaben haben (wie die Korrelationsmatrix). Das Bild: bausteine/Streumatrix.svelte. Test: streumatrix.test.ts.
 */
import { gerade } from './streugruppen';
import { zieheStichprobe } from './stichprobe';

export const STREUMATRIX_MIN = 3, STREUMATRIX_MAX = 6;
/** Höchstens so viele Punkte je Feld gezeichnet (feste Auswahl); r und n rechnen mit allen. */
export const STREUMATRIX_PUNKTE = 150;
export interface MatrixFeld { i: number; j: number; n: number; r: number | null; punkte: [number, number][]; gekuerzt: boolean }

/** `zeilen[p][k]`: Wert der Person p in Spalte k (null/NaN = Lücke). Feld (i, j) mit i < j: x = Spalte i, y = Spalte j. `null` bei weniger als 3 oder mehr als 6 Spalten. */
export function streuMatrix(namen: string[], zeilen: (number | null | undefined)[][]): { namen: string[]; felder: MatrixFeld[]; gekuerzt: boolean } | null {
  const k = namen.length;
  if (k < STREUMATRIX_MIN || k > STREUMATRIX_MAX) return null;
  const felder: MatrixFeld[] = [];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const p: [number, number][] = [];
    for (const z of zeilen) { const a = z[i], b = z[j]; if (typeof a === 'number' && typeof b === 'number' && Number.isFinite(a) && Number.isFinite(b)) p.push([a, b]); }
    const s = zieheStichprobe(p, STREUMATRIX_PUNKTE);
    felder.push({ i, j, n: p.length, r: gerade(p)?.r ?? null, punkte: s.auswahl, gekuerzt: s.gekuerzt });
  }
  return { namen, felder, gekuerzt: felder.some(f => f.gekuerzt) };
}
