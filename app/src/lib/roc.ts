/**
 * Fläche unter der ROC-Kurve (AUC) aus der Ausgabe von PSPP `ROC` (Tabelle „Area Under the Curve“).
 * Fläche, Standardfehler (asymptotisch, „distribution free“) und p kommen aus PSPP. Das Intervall rechnet Statable selbst aus Fläche ± 1,96 · SE:
 * Die Spalte „Asymp. 95% Confidence Interval“ von PSPP 2.1.1 ist nur 90 % breit (sie benutzt z = 1,645; an zwei Datensätzen nachgemessen). Ein Intervall über 1 wird bei 1 begrenzt.
 * Gegen R geprüft (pROC::auc, ci.auc(method = "delong")): die Fläche stimmt exakt; der Standardfehler weicht leicht von DeLong ab (roc.test.ts), das Intervall damit auch.
 */
import type { OutputItem, TableItem } from '../engine/types';

export interface Auc { auc: number; se: number; p: number; lo: number; hi: number; /** Obere Grenze wurde von PSPP über 1 berechnet und bei 1 begrenzt. */ begrenzt: boolean }

const Z975 = 1.959963984540054;

export function aucAus(items: OutputItem[]): Auc | null {
  const t = items.find((i): i is TableItem => i.type === 'table' && i.label === 'Area Under the Curve');
  if (!t) return null;
  const z = (c: number) => t.cells.find(x => x.r === 2 && x.c === c)?.n;
  const [auc, se, p] = [z(1), z(2), z(3)];
  if ([auc, se, p].some(v => typeof v !== 'number' || !Number.isFinite(v))) return null;
  const lo = auc! - Z975 * se!, hi = auc! + Z975 * se!;
  return { auc: auc!, se: se!, p: p!, lo: Math.max(0, lo), hi: Math.min(1, hi), begrenzt: hi > 1 || lo < 0 };
}

/* ---------- Kurve und bester Schwellenwert aus den Rohwerten ---------- */
export interface RocBeste { /** Wer diesen Wert oder mehr hat, gilt als „positiv“ (ein beobachteter Wert). */ schwelle: number; sens: number; spez: number; /** Youden-Index J = Sensitivität + Spezifität − 1 */ j: number }
export interface RocKurve {
  /** Punkte (1 − Spezifität, Sensitivität) von (0, 0) bis (1, 1), je beobachtetem Wert einer; gleiche Werte bilden einen Schritt. */
  punkte: [number, number][];
  /** Fläche unter der Kurve (Trapezregel = Mann-Whitney-Wahrscheinlichkeit, Bindungen zählen halb). */
  auc: number; beste: RocBeste; nPositiv: number; nNegativ: number;
}
/**
 * ROC-Kurve für „hohe Werte sprechen für positiv“. Der beste Schwellenwert maximiert den Youden-Index J (Sensitivität + Spezifität − 1); bei Gleichstand gilt der höchste Wert.
 * Rechnung aus den Rohwerten, damit Kurve, Schwelle, Sensitivität und Spezifität aus einer Hand stehen; getestet gegen R pROC (roc.test.ts, scripts/roc-erwartet.R):
 * Fläche und J stimmen; pROC nennt als Schwelle die Mitte zwischen zwei Werten, Statable den beobachteten Wert, ab dem „positiv“ gilt.
 * ⚠ von der Fachperson abzunehmen: Youden-Index als Kriterium, Gleichstand-Regel, „Wert oder mehr“.
 * `null`, wenn eine der beiden Gruppen leer ist.
 */
export function rocKurve(positiv: number[], negativ: number[]): RocKurve | null {
  const p = positiv.filter(Number.isFinite).sort((a, b) => b - a), n = negativ.filter(Number.isFinite).sort((a, b) => b - a);
  if (!p.length || !n.length) return null;
  const werte = [...new Set([...p, ...n])].sort((a, b) => b - a);
  const punkte: [number, number][] = [[0, 0]];
  let ip = 0, in_ = 0, beste: RocBeste | null = null, auc = 0, vorX = 0, vorY = 0;
  for (const c of werte) {
    while (ip < p.length && p[ip]! >= c) ip++;
    while (in_ < n.length && n[in_]! >= c) in_++;
    const sens = ip / p.length, fpr = in_ / n.length;
    punkte.push([fpr, sens]);
    auc += (fpr - vorX) * (sens + vorY) / 2; vorX = fpr; vorY = sens;
    const j = sens - fpr;
    if (!beste || j > beste.j + 1e-12) beste = { schwelle: c, sens, spez: 1 - fpr, j };
  }
  return { punkte, auc, beste: beste!, nPositiv: p.length, nNegativ: n.length };
}
