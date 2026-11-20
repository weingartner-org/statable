/**
 * Bayes-Faktoren als Zusatz zu t-Test (unabhängig, gepaart) und Pearson-Korrelation. Eigener Code, alles im Log-Raum.
 *
 * t-Test: JZS-Bayes-Faktor nach Rouder, Speckman, Sun, Morey & Iverson (2009), Gl. 1: Effektstärke δ ~ Cauchy(0, r), r = √2/2
 *   (Standard in JASP und R-Paket BayesFactor, „medium“). Die Cauchy-Verteilung ist eine Mischung aus Normalverteilungen mit
 *   g ~ Inverse-Gamma(1/2, r²/2); das Integral über g wird numerisch gelöst (Gauß-Legendre über ln g).
 *   Eine Stichprobe/gepaart: N = n, ν = n − 1. Zwei Stichproben: N = n₁n₂/(n₁+n₂), ν = n₁ + n₂ − 2 (Student-t, gleiche Streuung angenommen).
 * Korrelation: Jeffreys' Bayes-Faktor für Pearson-r nach Ly, Verhagen & Wagenmakers (2016) mit gestreckter Beta-Verteilung
 *   Beta(1/κ, 1/κ) auf (−1, 1), κ = 1 (gleichverteilt über ρ), wie JASP. Die Wahrscheinlichkeitsdichte von r gegeben ρ ist die exakte
 *   (Fisher 1915; Hotelling 1953) mit der Gaußschen hypergeometrischen Funktion ₂F₁(½, ½; n − ½; (1 + ρr)/2). Das Integral über ρ
 *   wird über ζ = artanh ρ numerisch gelöst. ⚠ R::BayesFactor::correlationBF rechnet mit einem anderen Prior (siehe scripts/bayes-erwartet.R).
 * Einordnung nach Lee & Wagenmakers (2013), Tab. 7.1 (Jeffreys 1961). ⚠ Schreibweise und Schwellen von der Fachperson abzunehmen.
 */
import { lnGamma } from './verteilung';
import { kleinste, groesste } from './menge';

/** Standard-Skala des Cauchy-Priors (JASP, BayesFactor „medium“). */
export const R_STANDARD = Math.SQRT2 / 2;

/* ---------- Gauß-Legendre ---------- */
function glKnoten(n: number): { x: number[]; w: number[] } {
  const x: number[] = [], w: number[] = [];
  for (let i = 0; i < n; i++) {
    let z = Math.cos(Math.PI * (i + 0.75) / (n + 0.5)), pp = 1;
    for (let it = 0; it < 100; it++) {
      let p1 = 1, p2 = 0;
      for (let j = 0; j < n; j++) { const p3 = p2; p2 = p1; p1 = ((2 * j + 1) * z * p2 - j * p3) / (j + 1); }
      pp = n * (z * p1 - p2) / (z * z - 1);
      const z1 = z; z = z1 - p1 / pp;
      if (Math.abs(z - z1) < 1e-15) break;
    }
    x.push(z); w.push(2 / ((1 - z * z) * pp * pp));
  }
  return { x, w };
}
const GL = glKnoten(10);

/** ln ∫ₐᵇ exp(lf(u)) du mit zusammengesetzter Gauß-Legendre-Regel (Teilstücke der Breite `breite`). */
function logIntegral(lf: (u: number) => number, a: number, b: number, breite: number): number {
  const teile = Math.max(1, Math.ceil((b - a) / breite)), h = (b - a) / teile;
  const terme: number[] = [];
  for (let k = 0; k < teile; k++) {
    const m = a + (k + 0.5) * h;
    for (let i = 0; i < GL.x.length; i++) { const v = lf(m + GL.x[i]! * h / 2); if (Number.isFinite(v)) terme.push(v + Math.log(GL.w[i]! * h / 2)); }
  }
  const mx = Math.max(groesste(terme));
  return mx + Math.log(terme.reduce((s, v) => s + Math.exp(v - mx), 0));
}

/* ---------- t-Test ---------- */
/** ln BF₁₀ für einen t-Wert: `nEff` = n (eine Stichprobe/gepaart) bzw. n₁n₂/(n₁+n₂), `nu` = Freiheitsgrade des Student-t. Zweiseitige Alternative. */
export function logBF10T(t: number, nEff: number, nu: number, r = R_STANDARD): number {
  const t2 = t * t, kopf = (nu + 1) / 2 * Math.log(1 + t2 / nu), konst = Math.log(r) - 0.5 * Math.log(2 * Math.PI);
  // Integration über u = ln g; dg = g du
  const lf = (u: number) => {
    const g = Math.exp(u), q = 1 + nEff * g;
    return -0.5 * Math.log(q) - (nu + 1) / 2 * Math.log(1 + t2 / (nu * q)) + kopf + konst - 1.5 * u - r * r / (2 * g) + u;
  };
  return logIntegral(lf, -40, 40, 1);
}
export const bfUnabhaengig = (t: number, n1: number, n2: number, r = R_STANDARD) => Math.exp(logBF10T(t, n1 * n2 / (n1 + n2), n1 + n2 - 2, r));
export const bfGepaart = (t: number, n: number, r = R_STANDARD) => Math.exp(logBF10T(t, n, n - 1, r));

/* ---------- Korrelation ---------- */
/** ln ₂F₁(½, ½; c; z) für 0 ≤ z < 1 (Reihe, Summe im Log-Raum nicht nötig: alle Terme positiv). */
function ln2F1(c: number, z: number): number {
  let term = 1, summe = 1;
  for (let k = 0; k < 200000; k++) {
    term *= (k + 0.5) * (k + 0.5) / ((k + c) * (k + 1)) * z;
    summe += term;
    if (term < 1e-17 * summe) break;
  }
  return Math.log(summe);
}
/** ln BF₁₀ für Pearson-r bei n Paaren, Prior gleichverteilt über ρ ∈ (−1, 1) (κ = 1). Gilt ab n ≥ 3 (n = 3: r = ±1 trivial, hier nicht berechnet). */
export function logBF10Korr(r: number, n: number): number {
  if (n < 4) return NaN;
  const c = n - 0.5, l0 = ln2F1(c, 0.5);
  // ρ = tanh ζ; dρ = (1 − ρ²) dζ; Gewicht der Gleichverteilung 1/2
  const lf = (zeta: number) => {
    const rho = Math.tanh(zeta), lq2 = -2 * Math.log(Math.cosh(zeta));   // ln(1 − ρ²)
    return Math.log(0.5) + lq2 + (n - 1) / 2 * lq2 - (n - 1.5) * Math.log(1 - rho * r) + ln2F1(c, (1 + rho * r) / 2) - l0;
  };
  const breite = Math.min(1, 2 / Math.sqrt(n));
  return logIntegral(lf, -9, 9, breite);
}
export const bfKorrelation = (r: number, n: number) => Math.exp(logBF10Korr(r, n));

/* ---------- Lineare Regression ---------- */
/** Standard-Skala für Regressionskoeffizienten (BayesFactor „medium“ für rscaleCont, JASP: √2/4 ≈ 0,354). */
export const R_REGRESSION = Math.SQRT2 / 4;
/**
 * ln BF₁₀ für ein lineares Modell mit p Prädiktoren gegen das Modell nur mit Konstante: JZS-Prior nach Liang, Paulo, Molina, Clyde & Berger (2008) in der Fassung
 * von Rouder & Morey (2012): g ~ Inverse-Gamma(1/2, n·r²/2) auf der g-Prior-Varianz der standardisierten Koeffizienten (multivariate Cauchy), flacher Prior auf Konstante und σ².
 *   BF₁₀ = ∫ (1+g)^((n−1−p)/2) · (1+(1−R²)·g)^(−(n−1)/2) · IG(g) dg,  numerisch über u = ln g gelöst (wie beim t-Test).
 * Sollwerte: R `BayesFactor::lmBF` (rscaleCont = „medium“), siehe bayes.test.ts. Nur für Zahlen-Prädiktoren; Gruppen-Prädiktoren haben in BayesFactor und JASP einen anderen Prior.
 */
export function logBF10Regression(r2: number, n: number, p: number, r = R_REGRESSION): number {
  if (!(n > p + 1) || p < 1 || !(r2 >= 0 && r2 < 1)) return NaN;
  const alpha = 0.5, beta = (n * r * r) / 2, lKonst = alpha * Math.log(beta) - lnGamma(alpha);
  const lf = (u: number) => {
    const g = Math.exp(u);
    return 0.5 * ((n - 1 - p) * Math.log1p(g) - (n - 1) * Math.log1p((1 - r2) * g)) + lKonst - (alpha + 1) * u - beta / g + u;
  };
  return logIntegral(lf, -40, 40, 1);
}
export const bfRegression = (r2: number, n: number, p: number, r = R_REGRESSION) => Math.exp(logBF10Regression(r2, n, p, r));

/* ---------- Einfaktorielle Varianzanalyse ---------- */
/** Standard-Skala für feste Faktoren (BayesFactor „medium“ für rscaleFixed, JASP: 0,5). */
export const R_ANOVA = 0.5;
/** Log-Determinante und q = b'M⁻¹b einer kleinen symmetrisch-positiv-definiten Matrix (Gauß mit Spaltenpivot); null bei Singularität. */
function detUndForm(m: number[][], b: number[]): { logdet: number; q: number } | null {
  const k = m.length, a = m.map((z, i) => [...z, b[i]!]);
  let logdet = 0;
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(a[r]![c]!) > Math.abs(a[p]![c]!)) p = r;
    if (Math.abs(a[p]![c]!) < 1e-300) return null;
    [a[c], a[p]] = [a[p]!, a[c]!];
    logdet += Math.log(Math.abs(a[c]![c]!));
    for (let r = c + 1; r < k; r++) { const f = a[r]![c]! / a[c]![c]!; for (let j = c; j <= k; j++) a[r]![j]! -= f * a[c]![j]!; }
  }
  const x = Array(k).fill(0);
  for (let r = k - 1; r >= 0; r--) { let sum = a[r]![k]!; for (let j = r + 1; j < k; j++) sum -= a[r]![j]! * x[j]!; x[r] = sum / a[r]![r]!; }
  return { logdet, q: b.reduce((s, v, i) => s + v * x[i]!, 0) };
}
/**
 * ln BF₁₀ der einfaktoriellen Varianzanalyse (alle Gruppenmittel gleich gegen verschieden), auch bei ungleichen Gruppengrößen. Nach Rouder, Morey, Speckman & Province (2012):
 * die Stufeneffekte stehen in orthonormalen Summe-null-Koordinaten mit α/σ ~ N(0, g), g ~ Inverse-Gamma(1/2, r²/2) (also Cauchy mit Skala r = 0,5), flacher Prior auf Mittel und σ².
 *   BF(g) = |I + g·Z'Z|^(−1/2) · (1 − g·b'(I + g·Z'Z)⁻¹b / SST)^(−(N−1)/2),  Z = D·C (D Zuordnung, C Helmert-Kontraste), b = Z'(y − ȳ), Z'Z um die Konstante bereinigt;  BF₁₀ = ∫ BF(g)·p(g) dg.
 * Eingabe aus den Gruppenkennzahlen: n je Gruppe, Mittel je Gruppe, η² (SSB/SST). Sollwerte: R `BayesFactor::anovaBF` (rscaleFixed = „medium“ = 0,5), siehe bayes.test.ts.
 */
export function logBF10Anova(n: number[], mittel: number[], eta2: number, r = R_ANOVA): number {
  const K = n.length, N = n.reduce((a, b) => a + b, 0);
  if (K < 2 || !(N > K) || n.some(v => !(v >= 1)) || !(eta2 >= 0 && eta2 < 1)) return NaN;
  const gesamt = n.reduce((a, v, i) => a + v * mittel[i]!, 0) / N;
  const ssb = n.reduce((a, v, i) => a + v * (mittel[i]! - gesamt) ** 2, 0), sst = eta2 > 0 ? ssb / eta2 : 1;
  // Helmert-Kontraste (orthonormal, Summe null): Spalte j hat j Einträge 1/√(j(j+1)), dann −j/√(j(j+1))
  const C = Array.from({ length: K }, (_, i) => Array.from({ length: K - 1 }, (_, j) => { const f = Math.sqrt((j + 1) * (j + 2)); return i <= j ? 1 / f : i === j + 1 ? -(j + 1) / f : 0; }));
  // Z'Z um die Konstante bereinigt (Spalten von Z zentrieren): bei ungleich großen Gruppen ist Z'1 = C'n ≠ 0
  const cn = Array.from({ length: K - 1 }, (_, a) => n.reduce((s, v, i) => s + v * C[i]![a]!, 0));
  const ZZ = Array.from({ length: K - 1 }, (_, a) => Array.from({ length: K - 1 }, (_, b) => n.reduce((s, v, i) => s + v * C[i]![a]! * C[i]![b]!, 0) - cn[a]! * cn[b]! / N));
  const bv = Array.from({ length: K - 1 }, (_, a) => n.reduce((s, v, i) => s + C[i]![a]! * v * (mittel[i]! - gesamt), 0));
  const beta = (r * r) / 2, lKonst = 0.5 * Math.log(beta) - lnGamma(0.5);
  const lf = (u: number) => {
    const g = Math.exp(u), M = ZZ.map((z, a) => z.map((v, b) => (a === b ? 1 : 0) + g * v));
    const dq = detUndForm(M, bv); if (!dq) return -Infinity;
    const inner = 1 - g * dq.q / sst; if (!(inner > 0)) return -Infinity;
    return -0.5 * dq.logdet - (N - 1) / 2 * Math.log(inner) + lKonst - 1.5 * u - beta / g + u;
  };
  return logIntegral(lf, -40, 40, 1);
}
export const bfAnova = (n: number[], mittel: number[], eta2: number, r = R_ANOVA) => Math.exp(logBF10Anova(n, mittel, eta2, r));

/* ---------- Einordnung ---------- */
export type BfStufe = 'extrem' | 'sehr-stark' | 'stark' | 'moderat' | 'anekdotisch';
/** Lee & Wagenmakers (2013): <1 spricht für H₀ (Kehrwert einordnen), 1-3 anekdotisch, 3-10 moderat, 10-30 stark, 30-100 sehr stark, >100 extrem. */
export function bfStufe(bf10: number): { stufe: BfStufe; fuer: 'H1' | 'H0' | 'keins' } {
  const f = bf10 >= 1 ? bf10 : 1 / bf10;
  const stufe: BfStufe = f < 3 ? 'anekdotisch' : f < 10 ? 'moderat' : f < 30 ? 'stark' : f < 100 ? 'sehr-stark' : 'extrem';
  return { stufe, fuer: f === 1 ? 'keins' : bf10 > 1 ? 'H1' : 'H0' };
}
