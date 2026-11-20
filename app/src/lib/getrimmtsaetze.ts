/** Sätze zu den robusten Verfahren (Field-Stufe 3b): wann robust statt Rangtest, und die Berichtssätze (APA) zu Yuen, Yuen gepaart und der getrimmten Varianzanalyse. Keine Du-Form. */
import { L } from './sitzung.svelte';
import { komma, pWert } from './ergebnis';
import type { LinconPaar, T1wayErgebnis, YuendErgebnis, YuenErgebnis } from './getrimmt';

export const trimText = (tr: number) => `${komma(Math.round(tr * 100), 0)} %`;
const pTeil = (p: number) => pWert(p);

/** Der Satz zur Wahl: wann robust, wann Rangtest. */
export const wannRobust = () => L(
  'Robust statt Rangtest passt, wenn weiter über Mittelwerte gesprochen werden soll (die Differenz steht in Einheiten der Messgröße, mit Intervall), die Daten aber schief sind oder Ausreißer enthalten. Der Rangtest vergleicht nur die Ordnung der Werte; er passt, wenn die Messgröße nur gestuft ist oder die Abstände zwischen den Werten nichts bedeuten. Bei sehr kleinen Gruppen bleiben beide Verfahren unsicher.',
  'Robust instead of a rank test fits when the discussion should stay with means (the difference is given in units of the measure, with an interval) but the data are skewed or contain outliers. The rank test compares only the order of the values; it fits when the measure is only ordinal or the distances between values mean nothing. With very small groups both procedures remain uncertain.');

/** Was getrimmt wird, in einem Satz. */
export const trimErklaerung = (tr: number, n?: number) => L(
  `Getrimmtes Mittel: Von den geordneten Werten jeder Gruppe fallen an beiden Enden ${trimText(tr)} weg${n ? ` (bei ${n} Werten je ${Math.floor(tr * n)} Werte)` : ''}, aus dem Rest wird das Mittel gebildet. Die Streuung wird winsorisiert (die weggelassenen Werte werden durch den nächsten verbleibenden Wert ersetzt). Nichts wird gelöscht; die Wahl der Trimmung gehört in den Bericht.`,
  `Trimmed mean: from the ordered values of each group ${trimText(tr)} are dropped at both ends${n ? ` (with ${n} values ${Math.floor(tr * n)} values each)` : ''}, the mean is formed from the rest. The spread is winsorized (the dropped values are replaced by the nearest remaining value). Nothing is deleted; the choice of trimming belongs in the report.`);

export function yuenSatz(e: YuenErgebnis, a: string, b: string): string {
  return L(`Yuen-Test (${trimText(e.tr)} getrimmt), ${a} gegen ${b}: Differenz der getrimmten Mittel = ${komma(e.diff, 2)} (95-%-Intervall [${komma(e.lo, 2)}; ${komma(e.hi, 2)}]), t(${komma(e.df, 2)}) = ${komma(e.t, 2)}, p ${pTeil(e.p)}.`,
    `Yuen test (${trimText(e.tr)} trimmed), ${a} versus ${b}: difference of the trimmed means = ${komma(e.diff, 2)} (95% interval [${komma(e.lo, 2)}; ${komma(e.hi, 2)}]), t(${komma(e.df, 2)}) = ${komma(e.t, 2)}, p ${pTeil(e.p)}.`);
}
export function yuendSatz(e: YuendErgebnis, a: string, b: string): string {
  return L(`Yuen-Test für gepaarte Werte (${trimText(e.tr)} getrimmt), ${a} gegen ${b}: Differenz der getrimmten Mittel = ${komma(e.diff, 2)} (95-%-Intervall [${komma(e.lo, 2)}; ${komma(e.hi, 2)}]), t(${komma(e.df, 0)}) = ${komma(e.t, 2)}, p ${pTeil(e.p)}.`,
    `Yuen test for paired values (${trimText(e.tr)} trimmed), ${a} versus ${b}: difference of the trimmed means = ${komma(e.diff, 2)} (95% interval [${komma(e.lo, 2)}; ${komma(e.hi, 2)}]), t(${komma(e.df, 0)}) = ${komma(e.t, 2)}, p ${pTeil(e.p)}.`);
}
export function t1waySatz(e: T1wayErgebnis): string {
  return L(`Robuste Varianzanalyse (t1way, ${trimText(e.tr)} getrimmt): F(${komma(e.df1, 0)}; ${komma(e.df2, 2)}) = ${komma(e.F, 2)}, p ${pTeil(e.p)}.`,
    `Robust analysis of variance (t1way, ${trimText(e.tr)} trimmed): F(${komma(e.df1, 0)}, ${komma(e.df2, 2)}) = ${komma(e.F, 2)}, p ${pTeil(e.p)}.`);
}
export const linconSatz = (p: LinconPaar, a: string, b: string) => L(`${a} gegen ${b}: Differenz ${komma(p.psihat, 2)}, p (nach Hochberg) ${pTeil(p.p)}.`, `${a} versus ${b}: difference ${komma(p.psihat, 2)}, p (Hochberg-adjusted) ${pTeil(p.p)}.`);
