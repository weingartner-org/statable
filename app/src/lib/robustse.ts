/**
 * Robuste Standardfehler der linearen Regression (HC3, S-H, 22.10.2026). Reine Rechnung.
 *   b = (X'X)⁻¹X'y;  V_HC3 = (X'X)⁻¹ · Σ [ x_i x_i' · e_i² / (1 − h_i)² ] · (X'X)⁻¹ mit Hebelwert h_i = x_i'(X'X)⁻¹x_i (MacKinnon und White 1985; Long und Ervin 2000: HC3 für kleine Stichproben).
 *   t = b/se_HC3, p und Konfidenzintervall mit der t-Verteilung (df = n − k).
 * Sollwerte: R `sandwich::vcovHC(type = "HC3")`, siehe robustse.test.ts.
 * HC4 (Cribari-Neto 2004, Field-Stufe 3b): Gewicht e_i² / (1 − h_i)^δ_i mit δ_i = min(4, n·h_i/k), k = Zahl der Koeffizienten (mit Konstante);
 * schützt besser bei Fällen mit hohem Hebelwert. Sollwert: R `sandwich::vcovHC(type = "HC4")`, siehe robustse.test.ts.
 */
import { tQuantil, tSchwaenze } from './verteilung';
export interface RobustZeile { b: number; seOls: number; se: number; t: number; p: number; lo: number; hi: number }
export interface RobustErgebnis { n: number; k: number; df: number; zeilen: RobustZeile[]; hebelMax: number }
export type RobustFehler = { fehler: 'zu-wenig-faelle' | 'singulaer' | 'hebel' };

export function invers(a: number[][]): number[][] | null {
  const n = a.length, m = a.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r]![c]!) > Math.abs(m[p]![c]!)) p = r;
    if (Math.abs(m[p]![c]!) < 1e-12) return null;
    [m[c], m[p]] = [m[p]!, m[c]!];
    const d = m[c]![c]!; for (let j = 0; j < 2 * n; j++) m[c]![j]! /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = m[r]![c]!; if (f) for (let j = 0; j < 2 * n; j++) m[r]![j]! -= f * m[c]![j]!; }
  }
  return m.map(r => r.slice(n));
}

/** `x`: Zeilen der Entwurfsmatrix OHNE Konstante (die Konstante kommt als erste Spalte dazu). */
export type HcArt = 'HC3' | 'HC4';
export function robusteSE(x: number[][], y: number[], art: HcArt = 'HC3'): RobustErgebnis | RobustFehler {
  const n = y.length, k = (x[0]?.length ?? 0) + 1;
  if (n < k + 2) return { fehler: 'zu-wenig-faelle' };
  const X = x.map(r => [1, ...r]);
  const xtx = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((s, r) => s + r[i]! * r[j]!, 0)));
  const inv = invers(xtx);
  if (!inv) return { fehler: 'singulaer' };
  const b = inv.map(r => r.reduce((s, _v, j) => s + r[j]! * X.reduce((t, row, i) => t + row[j]! * y[i]!, 0), 0));
  const e = X.map((r, i) => y[i]! - r.reduce((s, v, j) => s + v * b[j]!, 0));
  const h = X.map(r => { let s = 0; for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) s += r[i]! * inv[i]![j]! * r[j]!; return s; });
  if (h.some(v => v >= 1 - 1e-9)) return { fehler: 'hebel' };
  const meat = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  X.forEach((r, i) => { const delta = art === 'HC4' ? Math.min(4, (n * h[i]!) / k) : 2, w = (e[i]! * e[i]!) / (1 - h[i]!) ** delta; for (let a = 0; a < k; a++) for (let c = 0; c < k; c++) meat[a]![c]! += r[a]! * r[c]! * w; });
  const tmp = inv.map(r => Array.from({ length: k }, (_, c) => r.reduce((s, v, j) => s + v * meat[j]![c]!, 0)));
  const V = tmp.map(r => Array.from({ length: k }, (_, c) => r.reduce((s, v, j) => s + v * inv[j]![c]!, 0)));
  const df = n - k, rss = e.reduce((s, v) => s + v * v, 0), s2 = rss / df, q = tQuantil(0.975, df);
  const zeilen = b.map((bi, i) => { const se = Math.sqrt(V[i]![i]!), t = bi / se; return { b: bi, seOls: Math.sqrt(s2 * inv[i]![i]!), se, t, p: 2 * tSchwaenze(Math.abs(t), df).oben, lo: bi - q * se, hi: bi + q * se }; });
  return { n, k, df, zeilen, hebelMax: Math.max(...h) };
}
