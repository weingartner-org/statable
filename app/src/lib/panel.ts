/**
 * Paneldaten (B2 Teil 1a, 14.11.2026): feste Effekte (Within), zufällige Effekte (Swamy-Arora), Pooled-OLS, Between,
 * Hausman-Test, F-Test auf Gruppen-Effekte und cluster-robuste Standardfehler (CR1). Reine Rechnung, kein R.
 *   Within:  y_it − ȳ_i = (x_it − x̄_i)'b + e;  σ²_e = RSS/(N − n − k);  Konstante und zeitkonstante Merkmale fallen weg.
 *   Zufällig (nur ausgewogen):  σ²_u = s²_between − σ²_e/T,  θ = 1 − √(σ²_e / (σ²_e + T σ²_u)),  OLS auf  y − θȳ_i  und  x − θx̄_i  (Konstante mit 1 − θ).
 *   Hausman:  H = (b_FE − b_RE)' [V_FE − V_RE]⁻¹ (b_FE − b_RE) ~ χ²(k) (klassische Varianzen, nur Steigungen).
 *   Cluster-robust (CR1, wie Stata `vce(cluster)` und sandwich::vcovCL(type = "HC1")):  V = G/(G−1) · (N−1)/(N−k) · (X'X)⁻¹ [Σ_g X_g'e_g e_g'X_g] (X'X)⁻¹,  k = geschätzte Regressoren
 *   (bei Within ohne die Gruppen-Indikatoren, weil sie in den Clustern verschachtelt sind). plm `vcovHC(type = "HC1")` rechnet bei Within nur N/(N−k) und weicht ab.
 * Sollwerte: scripts/panel-erwartet.R (plm, sandwich), panel.test.ts.
 */
import { betai, chiQuadratP, tQuantil, tSchwaenze } from './verteilung';
import { invers } from './robustse';

export interface Koef { name: string; b: number; se: number; seCluster: number; t: number; p: number; tC: number; pC: number; lo: number; hi: number; loC: number; hiC: number }
export interface Modell { koef: Koef[]; r2: number; n: number; N: number; df: number; sigmaE2: number }
export interface HausmanErgebnis { chi2: number; df: number; p: number }
export interface PanelErgebnis {
  N: number; n: number; k: number; ausgewogen: boolean; T: number; minT: number; maxT: number;
  within: Modell; pooled: Modell; between: Modell | null;
  zufaellig: (Modell & { theta: number; sigmaU2: number; sigmaE2: number }) | null;
  hausman: HausmanErgebnis | null;
  ftest: { F: number; df1: number; df2: number; p: number };
  /** Anteil der Varianz, der auf die Gruppen entfällt (Intraklassen-Anteil ρ = σ²_u / (σ²_u + σ²_e)); nur bei zufälligen Effekten. */
  rho: number | null;
}
export type PanelFehler = { fehler: 'zu-wenig-gruppen' | 'zu-wenig-faelle' | 'singulaer' | 'konstant' | 'nichts-variiert' };

const mal = (a: number[][], b: number[][]) => a.map(r => b[0]!.map((_, c) => r.reduce((s, v, j) => s + v * b[j]![c]!, 0)));
const trans = (a: number[][]) => a[0]!.map((_, c) => a.map(r => r[c]!));
const kreuz = (X: number[][]) => mal(trans(X), X);

interface OlsErg { b: number[]; inv: number[][]; e: number[]; rss: number }
function ols(X: number[][], y: number[]): OlsErg | null {
  const inv = invers(kreuz(X));
  if (!inv) return null;
  const xty = trans(X).map(c => c.reduce((s, v, i) => s + v * y[i]!, 0));
  const b = inv.map(r => r.reduce((s, v, j) => s + v * xty[j]!, 0));
  const e = X.map((r, i) => y[i]! - r.reduce((s, v, j) => s + v * b[j]!, 0));
  return { b, inv, e, rss: e.reduce((s, v) => s + v * v, 0) };
}

/** CR1-Varianz: Brot (X'X)⁻¹, Fleisch aus den Gruppensummen X_g'e_g. */
function clusterV(X: number[][], e: number[], gruppe: number[], G: number, inv: number[][], N: number, k: number): number[][] {
  const kk = X[0]!.length, fl = Array.from({ length: kk }, () => new Array<number>(kk).fill(0));
  const summen = Array.from({ length: G }, () => new Array<number>(kk).fill(0));
  X.forEach((r, i) => { for (let j = 0; j < kk; j++) summen[gruppe[i]!]![j]! += r[j]! * e[i]!; });
  for (const s of summen) for (let a = 0; a < kk; a++) for (let c = 0; c < kk; c++) fl[a]![c]! += s[a]! * s[c]!;
  const korr = (G / (G - 1)) * ((N - 1) / (N - k));
  const V = mal(mal(inv, fl), inv);
  return V.map(r => r.map(v => v * korr));
}

function koefZeilen(namen: string[], b: number[], V: number[][], VC: number[][], df: number, dfC: number): Koef[] {
  const q = tQuantil(0.975, df), qC = tQuantil(0.975, dfC);
  return b.map((bi, i) => {
    const se = Math.sqrt(V[i]![i]!), sc = Math.sqrt(VC[i]![i]!), t = bi / se, tc = bi / sc;
    return { name: namen[i]!, b: bi, se, seCluster: sc, t, p: 2 * tSchwaenze(Math.abs(t), df).oben, tC: tc, pC: 2 * tSchwaenze(Math.abs(tc), dfC).oben, lo: bi - q * se, hi: bi + q * se, loC: bi - qC * sc, hiC: bi + qC * sc };
  });
}

/** `id`: Gruppenkennung je Zeile (beliebiger Text oder Zahl); `x`: Zeilen der Regressoren OHNE Konstante; nur vollständige Zeilen übergeben. */
export function panelRechnen(id: (string | number)[], x: number[][], y: number[], namen: string[]): PanelErgebnis | PanelFehler {
  const N = y.length, k = x[0]?.length ?? 0;
  const karte = new Map<string | number, number>(); const gr = id.map(v => { if (!karte.has(v)) karte.set(v, karte.size); return karte.get(v)!; });
  const n = karte.size;
  if (n < 2) return { fehler: 'zu-wenig-gruppen' };
  if (k < 1 || N < n + k + 1) return { fehler: 'zu-wenig-faelle' };
  const zahl = new Array<number>(n).fill(0); gr.forEach(g => { zahl[g]!++; });
  const minT = Math.min(...zahl), maxT = Math.max(...zahl), ausgewogen = minT === maxT;
  // Mittel je Gruppe
  const mx = Array.from({ length: n }, () => new Array<number>(k).fill(0)), my = new Array<number>(n).fill(0);
  gr.forEach((g, i) => { for (let j = 0; j < k; j++) mx[g]![j]! += x[i]![j]!; my[g]! += y[i]!; });
  mx.forEach((r, g) => { for (let j = 0; j < k; j++) r[j]! /= zahl[g]!; my[g]! /= zahl[g]!; });
  const xw = x.map((r, i) => r.map((v, j) => v - mx[gr[i]!]![j]!)), yw = y.map((v, i) => v - my[gr[i]!]!);
  if (xw.some(r => r.every(v => v === 0)) && xw.every(r => r.every(v => Math.abs(v) < 1e-12))) return { fehler: 'nichts-variiert' };
  for (let j = 0; j < k; j++) if (xw.every(r => Math.abs(r[j]!) < 1e-12)) return { fehler: 'konstant' };

  // Within
  const w = ols(xw, yw); if (!w) return { fehler: 'singulaer' };
  const dfW = N - n - k, s2W = w.rss / dfW, tssW = yw.reduce((s, v) => s + v * v, 0);
  const VW = w.inv.map(r => r.map(v => v * s2W));
  const VWC = clusterV(xw, w.e, gr, n, w.inv, N, k);
  const within: Modell = { koef: koefZeilen(namen, w.b, VW, VWC, dfW, n - 1), r2: 1 - w.rss / tssW, n, N, df: dfW, sigmaE2: s2W };

  // Pooled
  const Xp = x.map(r => [1, ...r]), p = ols(Xp, y); if (!p) return { fehler: 'singulaer' };
  const dfP = N - k - 1, s2P = p.rss / dfP, mw = y.reduce((s, v) => s + v, 0) / N, tssP = y.reduce((s, v) => s + (v - mw) ** 2, 0);
  const VP = p.inv.map(r => r.map(v => v * s2P)), VPC = clusterV(Xp, p.e, gr, n, p.inv, N, k + 1);
  const pooled: Modell = { koef: koefZeilen(['(Konstante)', ...namen], p.b, VP, VPC, dfP, n - 1), r2: 1 - p.rss / tssP, n, N, df: dfP, sigmaE2: s2P };

  // Between (n Gruppenmittel)
  let between: Modell | null = null; let s2B = NaN;
  if (n > k + 1) {
    const Xb = mx.map(r => [1, ...r]), b = ols(Xb, my);
    if (b) {
      const dfB = n - k - 1; s2B = b.rss / dfB; const mb = my.reduce((s, v) => s + v, 0) / n, tssB = my.reduce((s, v) => s + (v - mb) ** 2, 0);
      const VB = b.inv.map(r => r.map(v => v * s2B));
      between = { koef: koefZeilen(['(Konstante)', ...namen], b.b, VB, VB, dfB, dfB), r2: 1 - b.rss / tssB, n, N: n, df: dfB, sigmaE2: s2B };
    }
  }

  // Zufällige Effekte (Swamy-Arora, nur ausgewogen)
  let zufaellig: PanelErgebnis['zufaellig'] = null, hausman: HausmanErgebnis | null = null, rho: number | null = null;
  if (ausgewogen && between) {
    const T = minT, sigmaU2 = Math.max(0, s2B - s2W / T), theta = 1 - Math.sqrt(s2W / (s2W + T * sigmaU2));
    const Xr = x.map((r, i) => [1 - theta, ...r.map((v, j) => v - theta * mx[gr[i]!]![j]!)]), yr = y.map((v, i) => v - theta * my[gr[i]!]!);
    const r = ols(Xr, yr);
    if (r) {
      const dfR = N - k - 1, s2R = r.rss / dfR, VR = r.inv.map(rr => rr.map(v => v * s2R));
      const VRC = clusterV(Xr, r.e, gr, n, r.inv, N, k + 1);
      const mr = yr.reduce((s, v) => s + v, 0) / N, tssR = yr.reduce((s, v) => s + (v - mr) ** 2, 0);
      // R² wie plm: aus den transformierten Daten
      zufaellig = { koef: koefZeilen(['(Konstante)', ...namen], r.b, VR, VRC, dfR, n - 1), r2: 1 - r.rss / tssR, n, N, df: dfR, sigmaE2: s2W, theta, sigmaU2 };
      rho = sigmaU2 + s2W > 0 ? sigmaU2 / (sigmaU2 + s2W) : null;
      if (theta > 1e-9) {
        const d = w.b.map((bi, i) => bi - r.b[i + 1]!);
        const D = VW.map((row, i) => row.map((v, j) => v - VR[i + 1]![j + 1]!));
        const Di = invers(D);
        if (Di) { const h = d.reduce((s, di, i) => s + di * Di[i]!.reduce((t, v, j) => t + v * d[j]!, 0), 0); if (h >= 0) hausman = { chi2: h, df: k, p: chiQuadratP(h, k) }; }
      }
    }
  }

  // F-Test: gibt es Gruppen-Effekte?
  const df1 = n - 1, F = ((p.rss - w.rss) / df1) / (w.rss / dfW), pF = betai(dfW / 2, df1 / 2, dfW / (dfW + df1 * F));
  return { N, n, k, ausgewogen, T: N / n, minT, maxT, within, pooled, between, zufaellig, hausman, ftest: { F, df1, df2: dfW, p: pF }, rho };
}
