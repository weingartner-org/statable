/**
 * Partialkorrelation: Zusammenhang von x und y, nachdem der lineare Einfluss einer oder mehrerer Kontrollspalten aus beiden herausgerechnet ist.
 * Warum eigener Code: PSPP 2.1.1 hat kein PARTIAL CORR. Gerechnet wird über die Umkehrung der Korrelationsmatrix (P = R⁻¹, r = −P₁₂ / √(P₁₁·P₂₂)),
 * das ist dieselbe Zahl wie die Korrelation der Reste zweier Regressionen (Vergleich mit R `lm` in partialkorrelation.test.ts, scripts/partial-erwartet.R).
 * Nur Personen mit Zahlen in allen Spalten (listwise). Spearman = dieselbe Rechnung mit den Rängen (R ppcor `method = "spearman"`).
 * ⚠ von der Fachperson abzunehmen:
 *   - p-Wert: t = r·√(df/(1−r²)) mit df = n − 2 − k (k = Zahl der Kontrollspalten), wie SPSS PARTIAL CORR und R ppcor;
 *   - 95 %-Bereich über Fisher-z mit SE = 1/√(n − 3 − k); bei Spearman SE = √((1 + r²/2)/(n − 3 − k)) (Bonett & Wright 2000, wie bei der einfachen Spearman-Korrelation);
 *   - keine Kendall-Variante.
 */
import { tVerteilung } from './verteilung';
import { raenge, type Rangkorrelation } from './rangkorrelation';

const Z975 = 1.959963984540054;
export type PartialArt = 'pearson' | 'spearman';

/** Umkehrung einer kleinen symmetrischen Matrix (Gauss-Jordan mit Zeilentausch); `null`, wenn sie (fast) singulär ist. */
export function umkehren(m: number[][]): number[][] | null {
  const n = m.length, a = m.map((z, i) => [...z, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let s = 0; s < n; s++) {
    let best = s; for (let i = s + 1; i < n; i++) if (Math.abs(a[i]![s]!) > Math.abs(a[best]![s]!)) best = i;
    if (Math.abs(a[best]![s]!) < 1e-10) return null;
    [a[s], a[best]] = [a[best]!, a[s]!];
    const p = a[s]![s]!; for (let j = 0; j < 2 * n; j++) a[s]![j]! /= p;
    for (let i = 0; i < n; i++) if (i !== s) { const f = a[i]![s]!; if (f) for (let j = 0; j < 2 * n; j++) a[i]![j]! -= f * a[s]![j]!; }
  }
  return a.map(z => z.slice(n));
}

/** Korrelationsmatrix der Spalten (Zeilen = Personen, Spalten = [x, y, kontrolle…]). */
export function korrMatrix(spalten: number[][]): number[][] | null {
  const k = spalten.length, n = spalten[0]!.length, mw = spalten.map(c => c.reduce((s, v) => s + v, 0) / n);
  const ab = spalten.map((c, j) => c.map(v => v - mw[j]!)), ss = ab.map(c => c.reduce((s, v) => s + v * v, 0));
  if (ss.some(v => !(v > 0))) return null;
  return Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j ? 1 : ab[i]!.reduce((s, v, t) => s + v * ab[j]![t]!, 0) / Math.sqrt(ss[i]! * ss[j]!))));
}

/** Wie viele Kontrollspalten höchstens zu `n` Personen passen: n − k − 2 Freiheitsgrade, mindestens 3. */
export const partialMindestPersonen = (k: number) => k + 5;

/**
 * `zeilen[i] = [x, y, kontrolle1, …]`; Zeilen mit Lücken (null/NaN) fallen weg.
 * Gibt zurück: die Partialkorrelation (`partial`), die einfache Korrelation von x und y bei denselben Personen (`einfach`) und die Freiheitsgrade.
 * `null`, wenn es zu wenige Personen gibt, eine Spalte nicht streut oder die Kontrollspalten sich (fast) vollständig ersetzen.
 */
export function partialKorrelation(zeilen: (number | null | undefined)[][], art: PartialArt = 'pearson'): { partial: Rangkorrelation; einfach: Rangkorrelation; df: number; k: number } | null {
  const voll = zeilen.filter(z => z.length >= 3 && z.every(v => typeof v === 'number' && Number.isFinite(v))) as number[][];
  if (!voll.length) return null;
  const spaltenZahl = voll[0]!.length, k = spaltenZahl - 2, n = voll.length;
  if (n < partialMindestPersonen(k)) return null;
  let sp = Array.from({ length: spaltenZahl }, (_, j) => voll.map(z => z[j]!));
  if (art === 'spearman') sp = sp.map(raenge);
  const R = korrMatrix(sp); if (!R) return null;
  const P = umkehren(R); if (!P) return null;
  const r = -P[0]![1]! / Math.sqrt(P[0]![0]! * P[1]![1]!);
  if (!Number.isFinite(r) || Math.abs(r) > 1 + 1e-9) return null;
  const df = n - 2 - k;
  const mach = (r: number, nn: number, kk: number): Rangkorrelation => {
    const d = nn - 2 - kk, t = Math.abs(r) >= 1 ? Infinity : r * Math.sqrt(d / (1 - r * r));
    const p = Number.isFinite(t) ? 2 * (1 - tVerteilung(Math.abs(t), d)) : 0;
    const z = Math.atanh(Math.max(-0.999999999, Math.min(0.999999999, r)));
    const se = art === 'spearman' ? Math.sqrt((1 + r * r / 2) / (nn - 3 - kk)) : 1 / Math.sqrt(nn - 3 - kk);
    return { r, p, n: nn, kiLo: Math.tanh(z - Z975 * se), kiHi: Math.tanh(z + Z975 * se) };
  };
  return { partial: mach(Math.max(-1, Math.min(1, r)), n, k), einfach: mach(R[0]![1]!, n, 0), df, k };
}

/** Die Punkte für das Streudiagramm: Reste von x und von y nach Abzug der Kontrollspalten (Added-Variable-Plot). Bei Spearman mit den Rängen. */
export function partialPunkte(zeilen: (number | null | undefined)[][], art: PartialArt = 'pearson'): [number, number][] {
  const voll = zeilen.filter(z => z.length >= 3 && z.every(v => typeof v === 'number' && Number.isFinite(v))) as number[][];
  if (voll.length < partialMindestPersonen(voll[0]?.length ? voll[0].length - 2 : 1)) return [];
  const m = voll[0]!.length;
  let sp = Array.from({ length: m }, (_, j) => voll.map(z => z[j]!));
  if (art === 'spearman') sp = sp.map(raenge);
  const reste = (ziel: number[], kon: number[][]): number[] | null => {
    const spaltenX = [new Array<number>(ziel.length).fill(1), ...kon], p = spaltenX.length;
    const XtX = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => spaltenX[i]!.reduce((s, v, t) => s + v * spaltenX[j]![t]!, 0)));
    const inv = umkehren(XtX); if (!inv) return null;
    const Xty = spaltenX.map(c => c.reduce((s, v, t) => s + v * ziel[t]!, 0));
    const b = inv.map(z => z.reduce((s, v, j) => s + v * Xty[j]!, 0));
    return ziel.map((y, t) => y - spaltenX.reduce((s, c, j) => s + b[j]! * c[t]!, 0));
  };
  const kon = sp.slice(2), rx = reste(sp[0]!, kon), ry = reste(sp[1]!, kon);
  return rx && ry ? rx.map((v, i) => [v, ry[i]!] as [number, number]) : [];
}
