/**
 * Regressions-Diskontinuität, scharf (B2 Teil 2d, 14.11.2026). Reine Rechnung, kein R.
 *   Fenster |x − Schwelle| ≤ h, Gewichte K(u) mit u = |x − Schwelle|/h: dreieckig 1 − u oder gleich 1.
 *   Modell links und rechts getrennt (Ordnung 1 oder 2): y = b0 + b1·D + b2·u + b3·D·u (+ b4·u² + b5·D·u²), D = 1 ab der Schwelle, u = x − Schwelle.
 *   Der Sprung ist b1 (Wert rechts der Schwelle minus Wert links, beide an der Schwelle).
 *   Standardfehler klassisch (s² = Σw·e²/(n − k)) und robust HC1 (n/(n − k)); n zählt nur Fälle mit Gewicht über 0; p über t(n − k).
 *   Bewusst nicht gerechnet: automatische Bandbreite nach MSE und Bias-Korrektur (rdrobust) - die Bandbreite wählt die Person, Statable zeigt mehrere nebeneinander.
 * Sollwerte: scripts/rd-erwartet.R (lm mit Gewichten + sandwich HC1; Punktschätzung zusätzlich gegen rdrobust bei fester Bandbreite), rd.test.ts.
 */
import { tSchwaenze } from './verteilung';
import { invers } from './robustse';

export type RdKern = 'dreieck' | 'gleich';
export interface RdErgebnis { n: number; nLinks: number; nRechts: number; k: number; h: number; ordnung: 1 | 2; kern: RdKern; b: number; se: number; seRobust: number; t: number; p: number; tR: number; pR: number; alle: number[] }
export type RdFehler = { fehler: 'zu-wenig-faelle' | 'eine-seite' | 'bandbreite' | 'singulaer' };

const mal = (a: number[][], b: number[][]) => a.map(r => b[0]!.map((_, c) => r.reduce((s, v, j) => s + v * b[j]![c]!, 0)));
const trans = (a: number[][]) => a[0]!.map((_, c) => a.map(r => r[c]!));

export function rdRechnen(y: number[], x: number[], schwelle: number, h: number, ordnung: 1 | 2 = 1, kern: RdKern = 'dreieck'): RdErgebnis | RdFehler {
  if (!(h > 0) || !Number.isFinite(h)) return { fehler: 'bandbreite' };
  const k = ordnung === 1 ? 4 : 6;
  const Z: number[][] = [], w: number[] = [], yy: number[] = []; let nl = 0, nr = 0;
  y.forEach((v, i) => {
    const u = x[i]! - schwelle, a = Math.abs(u) / h;
    const g = kern === 'dreieck' ? 1 - a : (a <= 1 ? 1 : 0);
    if (!(g > 0)) return;
    const D = u >= 0 ? 1 : 0; if (D) nr++; else nl++;
    Z.push(ordnung === 1 ? [1, D, u, D * u] : [1, D, u, D * u, u * u, D * u * u]); w.push(g); yy.push(v);
  });
  if (nl === 0 || nr === 0) return { fehler: 'eine-seite' };
  const n = Z.length, df = n - k;
  if (nl < ordnung + 1 || nr < ordnung + 1 || df < 2) return { fehler: 'zu-wenig-faelle' };
  const ZtW = trans(Z).map(r => r.map((v, i) => v * w[i]!));
  const inv = invers(mal(ZtW, Z)); if (!inv) return { fehler: 'singulaer' };
  const zy = ZtW.map(r => r.reduce((s, v, i) => s + v * yy[i]!, 0));
  const b = inv.map(r => r.reduce((s, v, j) => s + v * zy[j]!, 0));
  const e = yy.map((v, i) => v - Z[i]!.reduce((s, z, j) => s + z * b[j]!, 0));
  const s2 = e.reduce((s, v, i) => s + w[i]! * v * v, 0) / df;
  const fl = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  Z.forEach((r, i) => { for (let a = 0; a < k; a++) for (let c = 0; c < k; c++) fl[a]![c]! += w[i]! * w[i]! * r[a]! * r[c]! * e[i]! * e[i]!; });
  const VR = mal(mal(inv, fl), inv).map(r => r.map(v => (v * n) / df));
  const se = Math.sqrt(s2 * inv[1]![1]!), sr = Math.sqrt(VR[1]![1]!), t = b[1]! / se, tr = b[1]! / sr;
  return { n, nLinks: nl, nRechts: nr, k, h, ordnung, kern, b: b[1]!, se, seRobust: sr, t, p: 2 * tSchwaenze(Math.abs(t), df).oben, tR: tr, pR: 2 * tSchwaenze(Math.abs(tr), df).oben, alle: b };
}
