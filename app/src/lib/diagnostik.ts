/**
 * Diagnostische Güte eines Tests gegen einen Referenzstandard aus einer Vierfeldertafel.
 *   Referenz positiv: richtig positiv (RP, Test +) und falsch negativ (FN, Test −);
 *   Referenz negativ: falsch positiv (FP, Test +) und richtig negativ (RN, Test −).
 * Sensitivität = RP/(RP+FN), Spezifität = RN/(RN+FP), positiver Vorhersagewert (PPV) = RP/(RP+FP), negativer (NPV) = RN/(RN+FN),
 * Genauigkeit = (RP+RN)/N, Likelihood-Quotienten LR+ = Se/(1−Sp) und LR− = (1−Se)/Sp, Odds Ratio der Tafel (diagnostisches Odds Ratio).
 * Entscheidung: Anteile mit Wilson-Intervall (Newcombe 1998; gute Abdeckung auch bei kleinem n und Werten nahe 0 oder 1, rechnet bei 0 und n ohne Sonderfall);
 * LR mit dem Log-Intervall nach Simel, Samsa & Matchar (1991); Odds Ratio mit Wald-Intervall wie bisher in Statable.
 * Geprüft gegen R `epiR::epi.tests(method = "wilson")` (scripts/diagnostik-erwartet.R). ⚠ von der Fachperson abzunehmen.
 */
import { oddsRatio2x2 } from './effektki';
import { L, mitFlag } from './sitzung.svelte';

const Z = 1.959963984540054;
export interface Anteil { wert: number; lo: number; hi: number; zaehler: number; nenner: number }
export interface Quotient { wert: number; lo: number; hi: number }
export interface Diagnose {
  rp: number; fp: number; fn: number; rn: number; n: number;
  se: Anteil; sp: Anteil; ppv: Anteil; npv: Anteil; genauigkeit: Anteil; praevalenz: Anteil;
  lrPlus: Quotient; lrMinus: Quotient; or: { or: number; lo: number; hi: number } | null;
}

/** Wilson-Score-Intervall für x von n. Bei n = 0 sind alle Werte NaN. */
export function wilson(x: number, n: number): Anteil {
  if (!(n > 0)) return { wert: NaN, lo: NaN, hi: NaN, zaehler: x, nenner: n };
  const p = x / n, z2 = Z * Z, mitte = (p + z2 / (2 * n)) / (1 + z2 / n), halb = (Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return { wert: p, lo: Math.max(0, mitte - halb), hi: Math.min(1, mitte + halb), zaehler: x, nenner: n };
}

/** Likelihood-Quotient mit Log-Intervall; ist der Wert 0, ∞ oder nicht bestimmt, bleibt das Intervall NaN. */
function quotient(wert: number, seLog: number): Quotient {
  if (!(wert > 0) || !Number.isFinite(wert) || !Number.isFinite(seLog)) return { wert, lo: NaN, hi: NaN };
  return { wert, lo: Math.exp(Math.log(wert) - Z * seLog), hi: Math.exp(Math.log(wert) + Z * seLog) };
}

export function diagnose(rp: number, fp: number, fn: number, rn: number): Diagnose {
  const n = rp + fp + fn + rn, krank = rp + fn, gesund = fp + rn;
  const se = wilson(rp, krank), sp = wilson(rn, gesund);
  const lrP = se.wert / (1 - sp.wert), lrM = (1 - se.wert) / sp.wert;
  // Standardfehler von ln LR: ln LR+ = ln(Se) − ln(1−Sp): 1/RP − 1/(RP+FN) + 1/FP − 1/(FP+RN); ln LR− = ln(1−Se) − ln(Sp): 1/FN − 1/(RP+FN) + 1/RN − 1/(FP+RN)
  const seP = Math.sqrt(1 / rp - 1 / krank + 1 / fp - 1 / gesund), seM = Math.sqrt(1 / fn - 1 / krank + 1 / rn - 1 / gesund);
  return {
    rp, fp, fn, rn, n, se, sp, ppv: wilson(rp, rp + fp), npv: wilson(rn, rn + fn), genauigkeit: wilson(rp + rn, n), praevalenz: wilson(krank, n),
    lrPlus: quotient(lrP, seP), lrMinus: quotient(lrM, seM), or: oddsRatio2x2([[rp, fn], [fp, rn]])
  };
}

/** Welche Spalte der Kreuztabelle der Referenzstandard ist und welcher Wert je Spalte als „positiv“ gilt (Index in `zeilen` bzw. `spalten`). */
export interface DiagnoseWahl { ref: 'zeilen' | 'spalten'; refPos: number; testPos: number }

/** Vierfelder RP, FP, FN, RN aus der Zähltabelle (Zeilen = Gruppen, Spalten = Antworten, je genau zwei). */
export function vierfelder(tab: number[][], w: DiagnoseWahl): [number, number, number, number] {
  const t = w.ref === 'zeilen' ? tab : [[tab[0]![0]!, tab[1]![0]!], [tab[0]![1]!, tab[1]![1]!]];   // Zeilen = Referenz, Spalten = Test
  const r = w.refPos, k = w.testPos;
  return [t[r]![k]!, t[1 - r]![k]!, t[r]![1 - k]!, t[1 - r]![1 - k]!];
}

/** Verneinte Antwort: „kein Rückfall“, „keine Angabe“, „nicht bestanden“, „ohne Förderung“, „no relapse“, „not passed“, „non-smoker“. */
export const verneint = (w: string): boolean => /(^|\s)(kein\w*|nicht|ohne|no|not)(\s|$)|^non[- ]?\w/i.test(w.trim());
/** Vorschlag, welcher von zwei Werten „positiv“ (bei den Risikomaßen: das Ereignis) ist: eine Antwort mit Verneinung nie, wenn die andere keine hat („Rückfall“ statt „kein Rückfall“, „bestanden“ statt „nicht bestanden“);
 *  sonst ein erkennbar positives Wort („ja“, „positiv“, „krank“ …), sonst der zweite (bei Zahlen der größere, bei 0/1 die 1). */
export function positivVorschlag(werte: string[]): number {
  if (werte.length === 2) { const v = werte.map(verneint); if (v[0] !== v[1]) return v[0] ? 1 : 0; }
  const wort = /^(1|ja|yes|pos|positiv|positive|krank|auffällig|erkrankt|vorhanden|true|wahr)\b/i;
  const i = werte.findIndex(w => wort.test(w.trim()));
  return i >= 0 ? i : werte.length > 1 ? 1 : 0;
}
export function standardWahl(zeilen: string[], spalten: string[]): DiagnoseWahl {
  return { ref: 'zeilen', refPos: positivVorschlag(zeilen), testPos: positivVorschlag(spalten) };
}

/** Likelihood-Quotient in Worten nach Jaeschke, Guyatt & Sackett (1994): LR+ ab 10 stark, 5-10 mäßig, 2-5 gering, unter 2 kaum; LR− unter 0,1 stark, 0,1-0,2 mäßig, 0,2-0,5 gering, über 0,5 kaum. */
/** Stärke einer Verschiebung (Jaeschke et al. 1994). `en`: weggelassen = gewählte Sprache; true/false erzwingt Englisch/Deutsch. */
const lrWorte = (i: number) => [L('starke', 'strong'), L('mäßige', 'moderate'), L('geringe', 'small'), L('kaum eine', 'hardly any')][i]!;
const inFlag = <T>(en: boolean | undefined, f: () => T): T => (en === undefined ? f() : mitFlag(en, f));
export function lrPlusWort(x: number, en?: boolean): string {
  const i = x >= 10 ? 0 : x >= 5 ? 1 : x >= 2 ? 2 : 3;
  return inFlag(en, () => lrWorte(i));
}
export function lrMinusWort(x: number, en?: boolean): string {
  const i = x <= 0.1 ? 0 : x <= 0.2 ? 1 : x <= 0.5 ? 2 : 3;
  return inFlag(en, () => lrWorte(i));
}
