/**
 * Instrumentvariablen, zweistufige Kleinste Quadrate (2SLS) (B2 Teil 2a, 14.11.2026). Reine Rechnung, kein R.
 *   Modell: y = Konstante + endogene Größen (x) + andere Merkmale (w) + Fehler; Instrumente z von außen (nicht im Modell).
 *   Schätzer:  b = (X'P X)⁻¹ X'P y  mit  P = Z(Z'Z)⁻¹Z', Z = Konstante, w, z.  Fehler e = y − X b (mit den ECHTEN x, nicht den Vorhersagen).
 *   Klassisch:  V = s² (X'P X)⁻¹,  s² = e'e/(n − k).   Robust (HC1):  n/(n − k) · (X'P X)⁻¹ [Σ ê²·x̂x̂'] (X'P X)⁻¹.
 *   Erste Stufe je endogene Größe: F-Test der Instrumente (alle z zusammen) in der Regression x ~ Konstante + w + z.
 *   Wu-Hausman (Kontrollfunktion): Residuen der ersten Stufen als zusätzliche Merkmale in der OLS-Regression; F-Test dieser Zusatzgrößen.
 *   Sargan (nur bei mehr Instrumenten als endogenen Größen): n·R² der Regression von e auf Z, χ² mit (Instrumente − endogene Größen).
 * Sollwerte: scripts/iv-erwartet.R (AER::ivreg, sandwich, zweiter Weg von Hand), iv.test.ts.
 */
import { betai, chiQuadratP, tSchwaenze } from './verteilung';
import { invers } from './robustse';

export interface IvKoef { name: string; b: number; se: number; seRobust: number; t: number; p: number; tR: number; pR: number }
export interface IvErststufe { name: string; F: number; df1: number; df2: number; p: number; r2: number }
export interface IvErgebnis {
  n: number; k: number; koef: IvKoef[]; sigma: number; r2: number;
  ersteStufen: IvErststufe[];
  wuHausman: { F: number; df1: number; df2: number; p: number };
  sargan: { chi2: number; df: number; p: number } | null;
  ols: { name: string; b: number; se: number }[];
}
export type IvFehler = { fehler: 'zu-wenig-faelle' | 'zu-wenig-instrumente' | 'singulaer' | 'schwach' };

const mal = (a: number[][], b: number[][]) => a.map(r => b[0]!.map((_, c) => r.reduce((s, v, j) => s + v * b[j]![c]!, 0)));
const trans = (a: number[][]) => a[0]!.map((_, c) => a.map(r => r[c]!));
const matVek = (a: number[][], v: number[]) => a.map(r => r.reduce((s, x, j) => s + x * v[j]!, 0));
function ols(X: number[][], y: number[]): { b: number[]; inv: number[][]; e: number[]; rss: number } | null {
  const inv = invers(mal(trans(X), X)); if (!inv) return null;
  const b = matVek(inv, matVek(trans(X), y));
  const e = y.map((v, i) => v - X[i]!.reduce((s, x, j) => s + x * b[j]!, 0));
  return { b, inv, e, rss: e.reduce((s, v) => s + v * v, 0) };
}
const fP = (F: number, d1: number, d2: number) => (F <= 0 ? 1 : betai(d2 / 2, d1 / 2, d2 / (d2 + d1 * F)));

/**
 * `y`: Ziel; `endo`: Zeilen der endogenen Größen; `exo`: Zeilen der übrigen Merkmale (darf leer sein, je Zeile []); `inst`: Zeilen der Instrumente.
 * Namen: endoNamen, exoNamen. Nur vollständige Zeilen übergeben.
 */
export function ivRechnen(y: number[], endo: number[][], exo: number[][], inst: number[][], endoNamen: string[], exoNamen: string[]): IvErgebnis | IvFehler {
  const n = y.length, q = endo[0]?.length ?? 0, w = exo[0]?.length ?? 0, m = inst[0]?.length ?? 0;
  const k = 1 + q + w;
  if (n < k + m + 1) return { fehler: 'zu-wenig-faelle' };
  if (m < q || q < 1) return { fehler: 'zu-wenig-instrumente' };
  const X = y.map((_, i) => [1, ...endo[i]!, ...exo[i]!]);
  const Z = y.map((_, i) => [1, ...exo[i]!, ...inst[i]!]);
  // erste Stufen und angepasste X
  const Xh = X.map(r => [...r]);
  const ersteStufen: IvErststufe[] = []; const vres: number[][] = [];
  const Zr = y.map((_, i) => [1, ...exo[i]!]);   // ohne Instrumente (eingeschränktes Modell)
  for (let j = 0; j < q; j++) {
    const xj = endo.map(r => r[j]!);
    const voll = ols(Z, xj), eing = ols(Zr, xj); if (!voll || !eing) return { fehler: 'singulaer' };
    const df1 = m, df2 = n - Z[0]!.length, F = ((eing.rss - voll.rss) / df1) / (voll.rss / df2);
    const mittel = xj.reduce((s, v) => s + v, 0) / n, tss = xj.reduce((s, v) => s + (v - mittel) ** 2, 0);
    ersteStufen.push({ name: endoNamen[j]!, F, df1, df2, p: fP(F, df1, df2), r2: 1 - voll.rss / tss });
    xj.forEach((v, i) => { Xh[i]![1 + j] = v - voll.e[i]!; });
    vres.push(voll.e);
  }
  const inv = invers(mal(trans(Xh), Xh)); if (!inv) return { fehler: 'singulaer' };
  // b = (X̂'X̂)⁻¹ X̂'y  (gleich (X'PX)⁻¹X'Py)
  const b = matVek(inv, matVek(trans(Xh), y));
  const e = y.map((v, i) => v - X[i]!.reduce((s, x, j) => s + x * b[j]!, 0));
  const rss = e.reduce((s, v) => s + v * v, 0), df = n - k, s2 = rss / df;
  const fl = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  Xh.forEach((r, i) => { for (let a = 0; a < k; a++) for (let c = 0; c < k; c++) fl[a]![c]! += r[a]! * r[c]! * e[i]! * e[i]!; });
  const VR = mal(mal(inv, fl), inv).map(r => r.map(v => (v * n) / df));
  const namen = ['(Konstante)', ...endoNamen, ...exoNamen];
  const koef: IvKoef[] = b.map((bi, i) => {
    const se = Math.sqrt(s2 * inv[i]![i]!), sr = Math.sqrt(VR[i]![i]!), t = bi / se, tr = bi / sr;
    return { name: namen[i]!, b: bi, se, seRobust: sr, t, p: 2 * tSchwaenze(Math.abs(t), df).oben, tR: tr, pR: 2 * tSchwaenze(Math.abs(tr), df).oben };
  });
  const mean = y.reduce((s, v) => s + v, 0) / n, tss = y.reduce((s, v) => s + (v - mean) ** 2, 0);
  // OLS zum Vergleich und Wu-Hausman (Kontrollfunktion)
  const o = ols(X, y); if (!o) return { fehler: 'singulaer' };
  const olsKoef = o.b.map((bi, i) => ({ name: namen[i]!, b: bi, se: Math.sqrt((o.rss / (n - k)) * o.inv[i]![i]!) }));
  const Xk = X.map((r, i) => [...r, ...vres.map(v => v[i]!)]);
  const ku = ols(Xk, y); if (!ku) return { fehler: 'singulaer' };
  const wdf2 = n - k - q, wF = ((o.rss - ku.rss) / q) / (ku.rss / wdf2);
  let sargan: IvErgebnis['sargan'] = null;
  if (m > q) {
    const h = ols(Z, e); if (!h) return { fehler: 'singulaer' };
    const chi2 = n * (1 - h.rss / (rss || 1));   // e hat Mittel 0 (Konstante im Modell), also ist die zentrierte Quadratsumme gleich rss
    sargan = { chi2, df: m - q, p: chiQuadratP(chi2, m - q) };
  }
  return { n, k, koef, sigma: Math.sqrt(s2), r2: 1 - rss / tss, ersteStufen, wuHausman: { F: wF, df1: q, df2: wdf2, p: fP(wF, q, wdf2) }, sargan, ols: olsKoef };
}
