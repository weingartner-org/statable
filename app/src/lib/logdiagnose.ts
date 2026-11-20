/**
 * Logistische Regression prüfen (Field-Stufe 2b, 05.11.2026). Reine Rechnung im Browser, wie regdiagnose.ts, aus Zeilen der Vorhersagegrößen (ohne Konstante) und y (0/1):
 *   Anpassung per IRLS (Fisher-Scoring, wie R `glm(family = binomial)`), daraus
 *   je Fall: Hebelwert h = w·x'(X'WX)⁻¹x, standardisiertes Devianzresiduum (R `rstandard(type = "deviance")`; das Pearson-Residuum, das R 4.6 voreinstellt, liegt daneben), Cooks Distanz (R `cooks.distance`: (Pearson/(1 − h))² · h / k),
 *            DFBETA (Rohwerte wie `dfbeta`: (X'WX)⁻¹ x (y − μ) / (1 − h));
 *   je Vorhersagegröße: VIF aus der Korrelationsmatrix der Koeffizienten (wie `car::vif` bei glm, je Spalte);
 *   Hosmer-Lemeshow-Test mit 10 Gruppen: Dezile der vorhergesagten Wahrscheinlichkeit (R `quantile` Typ 7), Gruppen als Intervalle (a, b], erste Gruppe einschließlich der unteren Grenze
 *            (R `cut(p, quantile(p, seq(0, 1, .1)), include.lowest = TRUE)`); χ² = Σ (beobachtet − erwartet)² / (erwartet · (1 − erwartet / n_g)), df = Gruppen − 2;
 *   Box-Tidwell: je Zahlen-Vorhersagegröße mit nur positiven Werten der Term x·ln(x) zusätzlich im Modell (alle Terme gemeinsam), Wald-z und p dieses Terms;
 *   Blöcke: Likelihood-Quotienten-Test zwischen Modell ohne und mit dem zweiten Block, χ² = Devianz ohne − Devianz mit.
 * Sollwerte: R (MASS::birthwt, docs/fachblaetter/sollwerte/field-stufe2.json, Abschnitt logistisch), Test logdiagnose.test.ts.
 * Grenzen (Faustregeln, keine Gesetze, wie DiagnoseBlock): |standardisiertes Devianzresiduum| > 2, Cook > 4/n (stärker > 1), Hebel > 2k/n (k = Zahl der Koeffizienten mit Konstante), VIF 5 bzw. 10.
 */
import { invers } from './robustse';
import { chiQuadratP, normalOben } from './verteilung';

/** `w`: Arbeitsgewichte der letzten Runde (R: `fit$weights`, vor dem letzten Schritt berechnet), `cov` dazu passend (R: `vcov`); `mu`: angepasste Wahrscheinlichkeiten nach dem letzten Schritt. */
export interface LogitAnpassung { b: number[]; cov: number[][]; w: number[]; dev: number; loglik: number; mu: number[]; iter: number }
export type LogitFehler = { fehler: 'zu-wenig-faelle' | 'singulaer' | 'trennung' | 'keine-streuung' };

/** Abbruchgrenze wie `glm.control()$epsilon` (R: 1e-8): dieselben Schritte wie R, darum auch dieselben Zahlen bis in die Stellen, die R selbst nicht mehr trennt. */
const EPS = 1e-8;
const sicher = (x: number) => 1 / (1 + Math.exp(-x));

/** IRLS wie `glm.fit`: Start μ = (y + 0,5) / 2, Abbruch wie R bei |Δ Devianz| / (|Devianz| + 0,1) < 1e-8. `x` ohne Konstante. */
export function logitAnpassen(x: number[][], y: number[]): LogitAnpassung | LogitFehler {
  const n = y.length, p = x[0]?.length ?? 0, k = p + 1;
  if (n < k + 2) return { fehler: 'zu-wenig-faelle' };
  const ereignisse = y.reduce((a, v) => a + v, 0);
  if (ereignisse === 0 || ereignisse === n) return { fehler: 'keine-streuung' };
  const X = x.map(r => [1, ...r]);
  let mu = y.map(v => (v + 0.5) / 2), eta = mu.map(m => Math.log(m / (1 - m))), devAlt = Infinity, b = new Array<number>(k).fill(0), cov: number[][] | null = null, w: number[] = [], iter = 0;
  const devianz = (m: number[]) => m.reduce((s, mi, i) => s - 2 * (y[i]! === 1 ? Math.log(mi) : Math.log(1 - mi)), 0);
  for (iter = 1; iter <= 100; iter++) {
    w = mu.map(m => m * (1 - m));
    const z = eta.map((e, i) => e + (y[i]! - mu[i]!) / w[i]!);
    const xtwx = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, c) => X.reduce((s, r, i) => s + w[i]! * r[a]! * r[c]!, 0)));
    cov = invers(xtwx);
    if (!cov) return { fehler: 'singulaer' };
    const xtwz = Array.from({ length: k }, (_, a) => X.reduce((s, r, i) => s + w[i]! * r[a]! * z[i]!, 0));
    b = cov.map(r => r.reduce((s, v, c) => s + v * xtwz[c]!, 0));
    eta = X.map(r => r.reduce((s, v, c) => s + v * b[c]!, 0));
    mu = eta.map(sicher);
    if (mu.some(m => m < 1e-10 || m > 1 - 1e-10)) { if (iter > 25) return { fehler: 'trennung' }; mu = mu.map(m => Math.min(Math.max(m, 1e-12), 1 - 1e-12)); }
    const dev = devianz(mu);
    if (Math.abs(dev - devAlt) / (Math.abs(dev) + 0.1) < EPS) { devAlt = dev; break; }
    devAlt = dev;
  }
  if (iter > 100 || !cov) return { fehler: 'trennung' };
  if (b.some(v => Math.abs(v) > 30)) return { fehler: 'trennung' };
  return { b, cov, w, dev: devAlt, loglik: -devAlt / 2, mu, iter };
}

/** `devRest`: standardisiertes Devianzresiduum (R `rstandard(type = "deviance")`), `pearsonRest`: standardisiertes Pearson-Residuum (R 4.6: Voreinstellung von `rstandard` bei glm). */
export interface LogDiagnoseFall { hebel: number; devRest: number; pearsonRest: number; cook: number; dfbeta: number[] }
export interface LogDiagnoseErgebnis {
  n: number; k: number; b: number[]; se: number[]; vif: number[]; faelle: LogDiagnoseFall[]; grenzen: { hebel: number; cook: number; rest: number };
}

/** `x` ohne Konstante, `y` 0/1. `dfbeta[j]` eines Falls: j = 0 Konstante, danach die Vorhersagegrößen. */
export function logDiagnose(x: number[][], y: number[]): LogDiagnoseErgebnis | LogitFehler | { fehler: 'hebel' } {
  const fit = logitAnpassen(x, y);
  if ('fehler' in fit) return fit;
  const n = y.length, p = x[0]!.length, k = p + 1, X = x.map(r => [1, ...r]), { cov, mu, w } = fit;
  const h = X.map((r, i) => { let s = 0; for (let a = 0; a < k; a++) for (let c = 0; c < k; c++) s += r[a]! * cov[a]![c]! * r[c]!; return w[i]! * s; });
  if (h.some(v => v >= 1 - 1e-9)) return { fehler: 'hebel' };
  const faelle = X.map((r, i) => {
    const hi = h[i]!, m = mu[i]!, res = y[i]! - m, arbeitsRest = res / (m * (1 - m));
    const devI = Math.sign(res) * Math.sqrt(-2 * (y[i]! === 1 ? Math.log(m) : Math.log(1 - m)));
    const pearson = res / Math.sqrt(m * (1 - m));
    return {
      hebel: hi, devRest: devI / Math.sqrt(1 - hi), pearsonRest: pearson / Math.sqrt(1 - hi), cook: ((pearson / (1 - hi)) ** 2 * hi) / k,
      dfbeta: Array.from({ length: k }, (_, j) => (cov[j]!.reduce((s, v, c) => s + v * r[c]!, 0) * w[i]! * arbeitsRest) / (1 - hi))
    };
  });
  const se = cov.map((r, j) => Math.sqrt(r[j]!));
  // VIF: Diagonale der Inversen der Korrelationsmatrix der Koeffizienten ohne Konstante (wie car::vif bei glm, je Spalte)
  let vif: number[] = [];
  if (p === 1) vif = [1];
  else {
    const kc = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, c) => cov[a + 1]![c + 1]! / (se[a + 1]! * se[c + 1]!)));
    const ki = invers(kc);
    if (!ki) return { fehler: 'singulaer' };
    vif = ki.map((r, j) => r[j]!);
  }
  return { n, k, b: fit.b, se, vif, faelle, grenzen: { hebel: (2 * k) / n, cook: 4 / n, rest: 2 } };
}

export interface LogAuffaellig { index: number; grund: { resid: boolean; cook: boolean; cook1: boolean; hebel: boolean } }
export function logAuffaellige(r: LogDiagnoseErgebnis): LogAuffaellig[] {
  const aus: LogAuffaellig[] = [];
  r.faelle.forEach((f, index) => {
    const grund = { resid: Math.abs(f.devRest) > r.grenzen.rest, cook: f.cook > r.grenzen.cook, cook1: f.cook > 1, hebel: f.hebel > r.grenzen.hebel };
    if (grund.resid || grund.cook || grund.hebel) aus.push({ index, grund });
  });
  return aus;
}

/** R `quantile(x, probs, type = 7)`, genau wie `quantile.default` (bei gleichen Nachbarwerten der Wert selbst, ohne Rundung). */
export function quantil7(x: number[], probs: number[]): number[] {
  const s = [...x].sort((a, b) => a - b), n = s.length;
  return probs.map(pr => {
    const index = 1 + (n - 1) * pr, lo = Math.floor(index), hi = Math.ceil(index), qs = s[lo - 1]!;
    if (index > lo && s[hi - 1]! !== qs) { const hh = index - lo; return (1 - hh) * qs + hh * s[hi - 1]!; }
    return qs;
  });
}

export interface HLGruppe { n: number; beobachtet: number; erwartet: number }
export interface HosmerLemeshow { chi2: number; df: number; p: number; gruppen: HLGruppe[] }
/** Hosmer-Lemeshow-Test mit `g` (Standard 10) Gruppen nach Quantilen der vorhergesagten Wahrscheinlichkeiten. Doppelte Grenzen (viele gleiche Vorhersagen) lassen die Zahl der Gruppen schrumpfen; df = Gruppen − 2. */
export function hosmerLemeshow(mu: number[], y: number[], g = 10): HosmerLemeshow | null {
  const breaks = [...new Set(quantil7(mu, Array.from({ length: g + 1 }, (_, i) => i / g)))];   // R `cut` verlangt verschiedene Grenzen
  if (breaks.length < 4) return null;
  const gr: HLGruppe[] = Array.from({ length: breaks.length - 1 }, () => ({ n: 0, beobachtet: 0, erwartet: 0 }));
  mu.forEach((m, i) => {
    let j = breaks.findIndex((b, c) => c > 0 && m <= b) - 1;   // Intervall (b_j, b_(j+1)]; die kleinste Grenze gehört zur ersten Gruppe (include.lowest)
    if (j < 0) j = 0;
    const t = gr[j]!; t.n++; t.beobachtet += y[i]!; t.erwartet += m;
  });
  const vollstaendig = gr.filter(t => t.n > 0);
  const chi2 = vollstaendig.reduce((s, t) => s + (t.beobachtet - t.erwartet) ** 2 / (t.erwartet * (1 - t.erwartet / t.n)), 0);
  const df = vollstaendig.length - 2;
  if (df < 1) return null;
  return { chi2, df, p: chiQuadratP(chi2, df), gruppen: vollstaendig };
}

export interface BoxTidwellTerm { spalte: number; z: number; p: number }
/** Box-Tidwell: `spalten` = Indizes der Spalten von `x`, die Zahlen mit nur positiven Werten sind. Terme x·ln(x) kommen alle gemeinsam ins Modell. */
export function boxTidwell(x: number[][], y: number[], spalten: number[]): BoxTidwellTerm[] | LogitFehler | null {
  if (!spalten.length) return null;
  const erweitert = x.map(r => [...r, ...spalten.map(j => r[j]! * Math.log(r[j]!))]);
  const fit = logitAnpassen(erweitert, y);
  if ('fehler' in fit) return fit;
  const p0 = x[0]!.length;
  return spalten.map((j, i) => {
    const idx = 1 + p0 + i, z = fit.b[idx]! / Math.sqrt(fit.cov[idx]![idx]!);
    return { spalte: j, z, p: 2 * normalOben(Math.abs(z)) };
  });
}
/** Welche Spalten dürfen in den Box-Tidwell-Test: nur Zahlen, alle Werte größer als 0 (ln) und mehr als zwei verschiedene Werte (0/1-Spalten und Hilfsspalten von Gruppen fallen so heraus). */
export function boxTidwellSpalten(x: number[][], zahl: boolean[]): number[] {
  return zahl.flatMap((z, j) => (z && x.every(r => r[j]! > 0) && new Set(x.map(r => r[j])).size > 2 ? [j] : []));
}

export interface LogBlock { chi2: number; df: number; p: number; devEins: number; devZwei: number; nagelkerkeEins: number; nagelkerkeZwei: number }
/** Block-χ²: Modell nur mit den Spalten `block1` gegen Modell mit allen Spalten (Likelihood-Quotienten-Test). */
export function logBlock(x: number[][], y: number[], block1: number[]): LogBlock | LogitFehler | null {
  const p = x[0]!.length;
  if (!block1.length || block1.length >= p) return null;
  const klein = logitAnpassen(x.map(r => block1.map(j => r[j]!)), y), gross = logitAnpassen(x, y);
  if ('fehler' in klein) return klein;
  if ('fehler' in gross) return gross;
  const n = y.length, e = y.reduce((a, v) => a + v, 0), dev0 = -2 * (e * Math.log(e / n) + (n - e) * Math.log(1 - e / n));
  const nk = (dev: number) => (1 - Math.exp((dev - dev0) / n)) / (1 - Math.exp(-dev0 / n));
  const chi2 = klein.dev - gross.dev, df = p - block1.length;
  return { chi2, df, p: chiQuadratP(chi2, df), devEins: klein.dev, devZwei: gross.dev, nagelkerkeEins: nk(klein.dev), nagelkerkeZwei: nk(gross.dev) };
}
