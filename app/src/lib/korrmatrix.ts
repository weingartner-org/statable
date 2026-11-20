/**
 * Korrelationsmatrix: alle Paare aus drei und mehr Zahlenspalten auf einmal, nach Pearson oder Spearman, mit n und p je Paar, auf Wunsch Holm-korrigiert.
 * Eigener Code (PSPP CORRELATIONS liefert nur Pearson; Spearman kennt PSPP 2.1.1 nicht) - dieselben Formeln wie bei „Hängen zwei Dinge zusammen?“:
 *   - Lücken paarweise (wie SPSS/PSPP CORRELATIONS und R cor(use = "pairwise.complete.obs")): je Paar zählen die Personen mit beiden Angaben, n kann je Paar verschieden sein;
 *   - Pearson: p über t mit n − 2 Freiheitsgraden (R cor.test), 95 %-KI über Fisher-z;
 *   - Spearman: Pearson der mittleren Ränge, p über t (R cor.test(method = "spearman", exact = FALSE)), KI nach Bonett & Wright (wie rangkorrelation.ts);
 *   - Holm (R p.adjust(method = "holm")) über alle Paare mit einem Wert.
 * Vergleichswerte: scripts/korrmatrix-erwartet.R, Tests: korrmatrix.test.ts.
 * ⚠ von der Fachperson abzunehmen: eine Art für die ganze Matrix (Spearman, sobald eine Spalte ordinal ist oder höchstens 7 Werte hat), paarweiser Ausschluss als Standard,
 *   Holm nur auf Wunsch (aus = wie SPSS), keine Sterne.
 */
import { pearsonKorrelation, spearman, type Rangkorrelation } from './rangkorrelation';
import { holm } from './rangtests';
import type { KorrelationsGrund } from './ergebnis';

export type MatrixArt = 'pearson' | 'spearman';
/** Ein Paar (i < j, Indizes in `spalten`). `null`, wenn es sich nicht rechnen lässt (weniger als 3 Personen mit beiden Angaben oder keine Streuung). */
export interface KorrPaar { i: number; j: number; n: number; pearson: Rangkorrelation | null; spearman: Rangkorrelation | null; holmPearson: number; holmSpearman: number }
export interface KorrMatrix {
  art: 'korrmatrix'; spalten: string[]; methode: MatrixArt; empfohlen: MatrixArt; grund?: KorrelationsGrund; holm: boolean;
  paare: KorrPaar[]; /** Zeilen der Daten (für „n je Paar 112 bis 120 von 120“) */ zeilen: number;
}
/** Höchstens so viele Spalten (Paare: k(k − 1)/2; 20 Spalten = 190 Paare). */
export const MATRIX_GRENZE = 20;

/** `zeilen[p][k]`: Wert der Person p in Spalte k (null = Lücke). */
export function korrMatrix(spalten: string[], zeilen: (number | null | undefined)[][], o: { methode: MatrixArt; grund?: KorrelationsGrund; holm?: boolean }): KorrMatrix {
  const k = spalten.length, paare: KorrPaar[] = [];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const pp: [number, number][] = [];
    for (const z of zeilen) { const a = z[i], b = z[j]; if (typeof a === 'number' && typeof b === 'number' && Number.isFinite(a) && Number.isFinite(b)) pp.push([a, b]); }
    const gut = (r: Rangkorrelation | null) => (r && Number.isFinite(r.r) ? r : null);
    const ok = pp.length >= 3;
    paare.push({ i, j, n: pp.length, pearson: ok ? gut(pearsonKorrelation(pp)) : null, spearman: ok ? gut(spearman(pp)) : null, holmPearson: NaN, holmSpearman: NaN });
  }
  for (const m of ['pearson', 'spearman'] as const) {
    const mit = paare.filter(q => q[m]), adj = holm(mit.map(q => q[m]!.p));
    mit.forEach((q, x) => { if (m === 'pearson') q.holmPearson = adj[x]!; else q.holmSpearman = adj[x]!; });
  }
  return { art: 'korrmatrix', spalten, methode: o.methode, empfohlen: o.methode, grund: o.grund, holm: !!o.holm, paare, zeilen: zeilen.length };
}

/** Wert eines Paars in der gewählten Art: r, p (ohne bzw. mit Holm, je nach Wahl), KI, n. */
export function paarWert(m: KorrMatrix, q: KorrPaar): { r: number; p: number; pRoh: number; kiLo: number; kiHi: number; n: number } | null {
  const w = q[m.methode]; if (!w) return null;
  const pHolm = m.methode === 'pearson' ? q.holmPearson : q.holmSpearman;
  return { r: w.r, p: m.holm ? pHolm : w.p, pRoh: w.p, kiLo: w.kiLo, kiHi: w.kiHi, n: q.n };
}
