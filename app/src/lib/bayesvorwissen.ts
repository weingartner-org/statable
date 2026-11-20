/**
 * Bayes mit Vorwissen (Lernlabor, Field-Stufe 3b, 05.11.2026): zwei konjugierte Fälle, in geschlossener Form, ohne Zufallszahlen.
 *  (a) Anteil: Prior Beta(a, b), Daten k von n, Posterior Beta(a + k, b + n − k); Mittel (a + k) / (a + b + n); 95-%-Glaubwürdigkeitsintervall mit gleichen Enden
 *      (2,5 % und 97,5 % der Posterior-Verteilung); P(Anteil > 0,5) = 1 − I_0,5(a + k, b + n − k). Likelihood x^k (1 − x)^(n − k), auf Fläche 1 skaliert (= Beta(k + 1, n − k + 1)).
 *  (b) Mittelwert, Normal-Prior N(μ₀, τ₀²), bekanntes σ, n Werte mit Mittel x̄: Präzisionen addieren sich, 1/τ² = 1/τ₀² + n/σ²; Posterior-Mittel = τ² · (μ₀/τ₀² + n·x̄/σ²).
 * Sollwerte: R (qbeta, pbeta, qnorm), docs/fachblaetter/sollwerte/field-stufe3.json, Abschnitt bayes_vorwissen (Opus); siehe bayesvorwissen.test.ts.
 */
import { betai, lnGamma, normal } from './verteilung';
import { qnorm } from './diagrammdaten';

/** Dichte der Beta(a, b)-Verteilung. */
export function betaDichte(x: number, a: number, b: number): number {
  if (x <= 0 || x >= 1) return x === 0 ? (a < 1 ? Infinity : a === 1 ? b : 0) : x === 1 ? (b < 1 ? Infinity : b === 1 ? a : 0) : 0;
  return Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x));
}
/** Verteilungsfunktion der Beta(a, b)-Verteilung. */
export const betaVerteilung = (x: number, a: number, b: number) => betai(a, b, x);
/** Quantil der Beta(a, b)-Verteilung (Halbieren auf der Verteilungsfunktion). */
export function betaQuantil(p: number, a: number, b: number): number {
  let lo = 0, hi = 1;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (betai(a, b, m) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
export const normalDichte = (x: number, m: number, sd: number) => Math.exp(-0.5 * ((x - m) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));

export interface AnteilVorwissen {
  prior: [number, number]; k: number; n: number; post: [number, number];
  priorMittel: number; mittel: number; datenAnteil: number; lo: number; hi: number; pUeberHalb: number; niveau: number;
  /** Anteil des Posterior-Mittels, der vom Prior stammt: (a + b) / (a + b + n) */ priorGewicht: number;
}
export function anteilVorwissen(a: number, b: number, k: number, n: number, niveau = 0.95): AnteilVorwissen | null {
  if (!(a > 0 && b > 0) || !Number.isInteger(k) || !Number.isInteger(n) || k < 0 || n < 0 || k > n || !(niveau > 0 && niveau < 1)) return null;
  const pa = a + k, pb = b + n - k, rand = (1 - niveau) / 2;
  return { prior: [a, b], k, n, post: [pa, pb], priorMittel: a / (a + b), mittel: pa / (pa + pb), datenAnteil: n > 0 ? k / n : NaN, lo: betaQuantil(rand, pa, pb), hi: betaQuantil(1 - rand, pa, pb), pUeberHalb: 1 - betai(pa, pb, 0.5), niveau, priorGewicht: (a + b) / (a + b + n) };
}
export interface Kurve { x: number[]; prior: number[]; likelihood: number[]; posterior: number[] }
/** Kurven über [0, 1] (Rand ausgespart, wenn die Dichte dort unendlich wird): Prior, Likelihood (auf Fläche 1 skaliert), Posterior. */
export function anteilKurven(a: number, b: number, k: number, n: number, punkte = 201): Kurve {
  const x = Array.from({ length: punkte }, (_, i) => Math.min(1 - 1e-6, Math.max(1e-6, i / (punkte - 1))));
  const grenz = (v: number) => (Number.isFinite(v) ? v : 0);
  return { x, prior: x.map(v => grenz(betaDichte(v, a, b))), likelihood: x.map(v => grenz(betaDichte(v, k + 1, n - k + 1))), posterior: x.map(v => grenz(betaDichte(v, a + k, b + n - k))) };
}

export interface MittelVorwissen {
  priorMittel: number; priorSd: number; n: number; datenMittel: number; sigma: number; datenSe: number;
  mittel: number; sd: number; lo: number; hi: number; niveau: number; priorGewicht: number; pUeberPrior: number;
}
export function mittelVorwissen(mu0: number, tau0: number, n: number, xbar: number, sigma: number, niveau = 0.95): MittelVorwissen | null {
  if (![mu0, tau0, xbar, sigma].every(Number.isFinite) || !(tau0 > 0 && sigma > 0) || !Number.isInteger(n) || n < 1 || !(niveau > 0 && niveau < 1)) return null;
  const vp = 1 / (1 / tau0 ** 2 + n / sigma ** 2), mp = vp * (mu0 / tau0 ** 2 + (n * xbar) / sigma ** 2), sd = Math.sqrt(vp), rand = (1 - niveau) / 2;
  return { priorMittel: mu0, priorSd: tau0, n, datenMittel: xbar, sigma, datenSe: sigma / Math.sqrt(n), mittel: mp, sd, lo: mp + qnorm(rand) * sd, hi: mp + qnorm(1 - rand) * sd, niveau,
    priorGewicht: (1 / tau0 ** 2) / (1 / tau0 ** 2 + n / sigma ** 2), pUeberPrior: 1 - normal((mu0 - mp) / sd) };
}
/** Kurven für den Mittelwert: Prior, Likelihood (Dichte von x̄ als Funktion von μ, Fläche 1) und Posterior über [von, bis]. */
export function mittelKurven(m: MittelVorwissen, von: number, bis: number, punkte = 201): Kurve {
  const x = Array.from({ length: punkte }, (_, i) => von + ((bis - von) * i) / (punkte - 1));
  return { x, prior: x.map(v => normalDichte(v, m.priorMittel, m.priorSd)), likelihood: x.map(v => normalDichte(v, m.datenMittel, m.datenSe)), posterior: x.map(v => normalDichte(v, m.mittel, m.sd)) };
}
