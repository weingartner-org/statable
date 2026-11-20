/** Welle 6, Kachel „Verteilungen berechnen“: Normal-, t-, χ²-, F-, Binomial-, Poisson-, hypergeometrische und eigene diskrete Verteilung.
 *  Reine Funktionen (kein DOM, kein Projektzustand). Obere Schwänze werden DIREKT gerechnet (nie 1 − P). Diskrete Schwänze: Summe vom Gipfel nach außen
 *  mit der Dichte nach Loader (wie R `dbinom`/`dpois`/`dhyper`), darum auch bei n = 1 000 000 genau. Quelle der Sollwerte: scripts/welle6-erwartet.R. */
import { dbinomRaw, dpoisRaw, lnGamma, normal, normalOben, tQuantil, tSchwaenze } from './verteilung';
import { chi2Oben, chi2Quantil, chi2Verteilung, fOben, fQuantil, fVerteilung } from './power';
import { qnorm } from './diagrammdaten';
import { L } from './sitzung.svelte';

export type Verteilung =
  | { art: 'normal'; mu: number; sigma: number }
  | { art: 't'; df: number }
  | { art: 'chi2'; df: number }
  | { art: 'f'; d1: number; d2: number }
  | { art: 'binom'; n: number; p: number }
  | { art: 'poisson'; lambda: number }
  | { art: 'hyper'; N: number; K: number; n: number }
  | { art: 'eigen'; x: number[]; p: number[] };

export const GRENZE_BINOM = 1_000_000;
export const GRENZE_POISSON = 100_000;
export const GRENZE_HYPER = 10_000_000;

export const istDiskret = (v: Verteilung) => v.art === 'binom' || v.art === 'poisson' || v.art === 'hyper' || v.art === 'eigen';

/* ------------------------------------------------------------------ diskrete Kerne */

interface Diskret {
  min: number; max: number; mode: number;
  pmf: (k: number) => number;
  /** pmf(k + 1) / pmf(k), für k ≥ mode kleiner als 1 */
  hoch: (k: number) => number;
  /** pmf(k − 1) / pmf(k), für k ≤ mode kleiner als 1 */
  runter: (k: number) => number;
}

function kern(v: Verteilung): Diskret {
  if (v.art === 'binom') {
    const { n, p } = v, q = 1 - p;
    return {
      min: 0, max: n, mode: Math.min(n, Math.floor((n + 1) * p)),
      pmf: k => (k < 0 || k > n ? 0 : dbinomRaw(k, n, p, q)),
      hoch: k => ((n - k) * p) / ((k + 1) * q),
      runter: k => (k * q) / ((n - k + 1) * p)
    };
  }
  if (v.art === 'poisson') {
    const { lambda } = v;
    return {
      min: 0, max: Infinity, mode: Math.floor(lambda),
      pmf: k => (k < 0 ? 0 : dpoisRaw(k, lambda)),
      hoch: k => lambda / (k + 1),
      runter: k => k / lambda
    };
  }
  if (v.art === 'hyper') {
    const { N, K, n } = v, M = N - K, pp = n / N, qq = (N - n) / N;
    const min = Math.max(0, n - M), max = Math.min(n, K);
    return {
      min, max, mode: Math.min(max, Math.max(min, Math.floor(((n + 1) * (K + 1)) / (N + 2)))),
      pmf: k => (k < min || k > max ? 0 : (dbinomRaw(k, K, pp, qq) * dbinomRaw(n - k, M, pp, qq)) / dbinomRaw(n, N, pp, qq)),
      hoch: k => ((K - k) * (n - k)) / ((k + 1) * (M - n + k + 1)),
      runter: k => (k * (M - n + k)) / ((K - k + 1) * (n - k + 1))
    };
  }
  throw new Error('kein Rechenkern für ' + v.art);
}

/** Σ_{i=lo..k} P(X = i) für k ≤ Gipfel: von k nach unten, die Glieder fallen. */
function runterSumme(d: Diskret, k: number, lo: number): number {
  let t = d.pmf(k), s = t;
  for (let i = k; i > lo; i--) { t *= d.runter(i); s += t; if (t <= s * 1e-18) break; }
  return s;
}
/** Σ_{i=k..hi} P(X = i) für k ≥ Gipfel: von k nach oben, die Glieder fallen. */
function hochSumme(d: Diskret, k: number, hi: number): number {
  let t = d.pmf(k), s = t;
  for (let i = k; i < hi; i++) { t *= d.hoch(i); s += t; if (t <= s * 1e-18) break; }
  return s;
}
const k01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** P(X ≤ k) für ganzes k. */
function dLinks(d: Diskret, k: number): number {
  if (k < d.min) return 0;
  if (k >= d.max) return 1;
  return k01(k <= d.mode ? runterSumme(d, k, d.min) : 1 - hochSumme(d, k + 1, d.max));
}
/** P(X ≥ k) für ganzes k. */
function dRechts(d: Diskret, k: number): number {
  if (k <= d.min) return 1;
  if (k > d.max) return 0;
  return k01(k >= d.mode ? hochSumme(d, k, d.max) : 1 - runterSumme(d, k - 1, d.min));
}
/** P(A ≤ X ≤ B) für ganze A, B: ohne Auslöschung, immer vom Gipfel her summiert. Liegt das Ergebnis nahe 1, wird es als 1 − (beide Ränder) gerechnet: bei vollem Träger genau 1, sonst
 *  ohne Rundungsrest der Summe (nie „1 − 2,78 · 10⁻¹⁵“ für etwas, das exakt 1 ist). */
function dZwischen(d: Diskret, a: number, b: number): number {
  const A = Math.max(a, d.min), B = Math.min(b, d.max);
  if (B < A) return 0;
  let s: number;
  if (B <= d.mode) s = runterSumme(d, B, A);
  else if (A >= d.mode) s = hochSumme(d, A, B);
  else s = runterSumme(d, d.mode, A) + hochSumme(d, d.mode + 1, B);
  if (s > 0.999999 && A <= d.mode && B >= d.mode) {
    const unten = A > d.min ? runterSumme(d, A - 1, d.min) : 0, oben = B < d.max ? hochSumme(d, B + 1, d.max) : 0;
    return k01(1 - unten - oben);
  }
  return k01(s);
}

/* ------------------------------------------------------------------ eigene Verteilung */

function sortiert(x: number[], p: number[]): { x: number[]; p: number[] } {
  const idx = x.map((_, i) => i).sort((a, b) => x[a]! - x[b]!);
  return { x: idx.map(i => x[i]!), p: idx.map(i => p[i]!) };
}
const summiere = (xs: number[], ps: number[], ok: (x: number) => boolean) => { let s = 0; for (let i = 0; i < xs.length; i++) if (ok(xs[i]!)) s += ps[i]!; return k01(s); };

/* ------------------------------------------------------------------ stetige Verteilungen */

function stetigLinksOben(v: Verteilung, x: number): { links: number; oben: number } {
  switch (v.art) {
    case 'normal': { const z = (x - v.mu) / v.sigma; return { links: normal(z), oben: normalOben(z) }; }
    case 't': { const s = tSchwaenze(x, v.df); return { links: s.unten, oben: s.oben }; }
    case 'chi2': return x <= 0 ? { links: 0, oben: 1 } : { links: chi2Verteilung(x, v.df), oben: chi2Oben(x, v.df) };
    case 'f': return x <= 0 ? { links: 0, oben: 1 } : { links: fVerteilung(x, v.d1, v.d2), oben: fOben(x, v.d1, v.d2) };
    default: throw new Error('nicht stetig');
  }
}

/* ------------------------------------------------------------------ Wahrscheinlichkeiten */

/** P(X ≤ x). */
export function links(v: Verteilung, x: number): number {
  if (v.art === 'eigen') return summiere(v.x, v.p, xi => xi <= x);
  if (istDiskret(v)) return dLinks(kern(v), Math.floor(x));
  return stetigLinksOben(v, x).links;
}
/** P(X < x). */
export function linksStreng(v: Verteilung, x: number): number {
  if (v.art === 'eigen') return summiere(v.x, v.p, xi => xi < x);
  if (istDiskret(v)) return dLinks(kern(v), Math.ceil(x) - 1);
  return stetigLinksOben(v, x).links;
}
/** P(X ≥ x), oberer Schwanz direkt. */
export function rechts(v: Verteilung, x: number): number {
  if (v.art === 'eigen') return summiere(v.x, v.p, xi => xi >= x);
  if (istDiskret(v)) return dRechts(kern(v), Math.ceil(x));
  return stetigLinksOben(v, x).oben;
}
/** P(X > x), oberer Schwanz direkt. */
export function rechtsStreng(v: Verteilung, x: number): number {
  if (v.art === 'eigen') return summiere(v.x, v.p, xi => xi > x);
  if (istDiskret(v)) return dRechts(kern(v), Math.floor(x) + 1);
  return stetigLinksOben(v, x).oben;
}
/** P(a ≤ X ≤ b) für a ≤ b. */
export function zwischen(v: Verteilung, a: number, b: number): number {
  if (b < a) return 0;
  if (v.art === 'eigen') return summiere(v.x, v.p, xi => xi >= a && xi <= b);
  if (istDiskret(v)) return dZwischen(kern(v), Math.ceil(a), Math.floor(b));
  const A = stetigLinksOben(v, a), B = stetigLinksOben(v, b);
  return k01((A.links + B.links) / 2 > 0.5 ? A.oben - B.oben : B.links - A.links);
}

/** Dichte (stetig) bzw. Wahrscheinlichkeit P(X = x) (diskret; 0 bei nicht ganzzahligem x). */
export function dichte(v: Verteilung, x: number): number {
  switch (v.art) {
    case 'normal': { const z = (x - v.mu) / v.sigma; return Math.exp(-z * z / 2) / (v.sigma * Math.sqrt(2 * Math.PI)); }
    case 't': {
      if (!Number.isFinite(x)) return 0;
      const df = v.df;
      return Math.exp(lnGamma((df + 1) / 2) - lnGamma(df / 2) - 0.5 * Math.log(df * Math.PI) - ((df + 1) / 2) * Math.log1p((x * x) / df));
    }
    case 'chi2': {
      if (x < 0 || !Number.isFinite(x)) return 0;
      const a = v.df / 2;
      if (x === 0) return v.df < 2 ? Infinity : v.df === 2 ? 0.5 : 0;
      return a < 1 ? (dpoisRaw(a, x / 2) * a) / x : dpoisRaw(a - 1, x / 2) / 2;
    }
    case 'f': {
      const { d1: m, d2: n } = v;
      if (x < 0 || !Number.isFinite(x)) return 0;
      if (x === 0) return m > 2 ? 0 : m === 2 ? 1 : Infinity;
      let f = 1 / (n + x * m);
      const q = n * f, p = x * m * f;
      let dens: number;
      if (m >= 2) { f = (m * q) / 2; dens = dbinomRaw((m - 2) / 2, (m + n - 2) / 2, p, q); }
      else { f = (m * m * q) / (2 * p * (m + n)); dens = dbinomRaw(m / 2, (m + n) / 2, p, q); }
      return f * dens;
    }
    case 'eigen': return summiere(v.x, v.p, xi => xi === x);
    default: {
      if (!Number.isInteger(x)) return 0;
      return kern(v).pmf(x);
    }
  }
}

/* ------------------------------------------------------------------ Quantile */

/** Quantil nach R-Definition (diskret: kleinstes x mit P(X ≤ x) ≥ p). `erreicht` = P(X ≤ x), null bei unendlichem x. p = 0 und 1 geben den Rand, p außerhalb [0; 1] NaN. */
export function quantil(v: Verteilung, p: number): { x: number; erreicht: number | null } {
  if (!(p >= 0 && p <= 1)) return { x: NaN, erreicht: null };
  const fertig = (x: number) => ({ x, erreicht: Number.isFinite(x) ? links(v, x) : null });
  switch (v.art) {
    case 'normal': return fertig(v.mu + v.sigma * qnorm(p));
    case 't': return fertig(tQuantil(p, v.df));
    case 'chi2': return fertig(chi2Quantil(p, v.df));
    case 'f': return fertig(fQuantil(p, v.d1, v.d2));
    case 'eigen': {
      const s = sortiert(v.x, v.p), ziel = p * (1 - 1e-12);
      let cum = 0;
      for (let i = 0; i < s.x.length; i++) { cum += s.p[i]!; if (cum >= ziel) return { x: s.x[i]!, erreicht: cum }; }
      return { x: s.x[s.x.length - 1]!, erreicht: cum };
    }
    default: {
      const d = kern(v);
      if (p === 1) return d.max === Infinity ? { x: Infinity, erreicht: null } : { x: d.max, erreicht: 1 };
      const ziel = p * (1 - 64 * Number.EPSILON);
      let lo = d.min, hi = d.max;
      if (hi === Infinity) { hi = Math.ceil(d.mode + 10 * Math.sqrt(d.mode) + 10); while (dLinks(d, hi) < ziel) hi *= 2; }
      while (lo < hi) { const m = Math.floor((lo + hi) / 2); if (dLinks(d, m) >= ziel) hi = m; else lo = m + 1; }
      return { x: lo, erreicht: dLinks(d, lo) };
    }
  }
}

/* ------------------------------------------------------------------ Kennzahlen */

export interface Momente { mittel: number | null; varianz: number | null; sigma: number | null }
const mitSigma = (mittel: number | null, varianz: number | null): Momente => ({ mittel, varianz, sigma: varianz === null ? null : Math.sqrt(varianz) });

/** Erwartungswert, Varianz und Standardabweichung; null = existiert nicht (nie „NaN“ ausgeben). */
export function momente(v: Verteilung): Momente {
  switch (v.art) {
    case 'normal': return mitSigma(v.mu, v.sigma * v.sigma);
    case 't': return mitSigma(v.df > 1 ? 0 : null, v.df > 2 ? v.df / (v.df - 2) : null);
    case 'chi2': return mitSigma(v.df, 2 * v.df);
    case 'f': {
      const { d1, d2 } = v;
      return mitSigma(d2 > 2 ? d2 / (d2 - 2) : null, d2 > 4 ? (2 * d2 * d2 * (d1 + d2 - 2)) / (d1 * (d2 - 2) * (d2 - 2) * (d2 - 4)) : null);
    }
    case 'binom': return mitSigma(v.n * v.p, v.n * v.p * (1 - v.p));
    case 'poisson': return mitSigma(v.lambda, v.lambda);
    case 'hyper': {
      const { N, K, n } = v, a = K / N;
      return mitSigma(n * a, N > 1 ? n * a * (1 - a) * ((N - n) / (N - 1)) : 0);
    }
    case 'eigen': { const k = eigeneKennzahlen(v.x, v.p); return mitSigma(k.mittel, k.varianz); }
  }
}

/* ------------------------------------------------------------------ Eingaben prüfen */

const ganz = (z: number) => Number.isInteger(z);
/** null = in Ordnung, sonst ein Satz, der sagt, was zu ändern ist. */
export function pruefeVerteilung(v: Verteilung): string | null {
  const zahl = (z: number) => Number.isFinite(z);
  switch (v.art) {
    case 'normal':
      if (!zahl(v.mu) || !zahl(v.sigma)) return L('Bitte μ und σ als Zahlen eingeben.', 'Please enter μ and σ as numbers.');
      if (v.sigma <= 0) return L('Die Standardabweichung σ muss größer als 0 sein.', 'The standard deviation σ must be greater than 0.');
      return null;
    case 't': case 'chi2':
      if (!zahl(v.df) || v.df <= 0) return L('Die Freiheitsgrade müssen größer als 0 sein.', 'The degrees of freedom must be greater than 0.');
      return null;
    case 'f':
      if (!zahl(v.d1) || !zahl(v.d2) || v.d1 <= 0 || v.d2 <= 0) return L('Beide Freiheitsgrade müssen größer als 0 sein.', 'Both degrees of freedom must be greater than 0.');
      return null;
    case 'binom':
      if (!zahl(v.n) || !ganz(v.n) || v.n < 1) return L('Die Anzahl der Versuche n muss eine ganze Zahl ab 1 sein.', 'The number of trials n must be a whole number of at least 1.');
      if (v.n > GRENZE_BINOM) return L('Für n über 1 000 000 rechnet Statable nicht (Rechenzeit und Genauigkeit). Bitte ein kleineres n wählen.', 'Statable does not calculate for n above 1,000,000 (run time and accuracy). Please choose a smaller n.');
      if (!zahl(v.p) || v.p < 0 || v.p > 1) return L('Die Trefferwahrscheinlichkeit p muss zwischen 0 und 1 liegen.', 'The probability of a hit p must lie between 0 and 1.');
      return null;
    case 'poisson':
      if (!zahl(v.lambda) || v.lambda <= 0) return L('Der Erwartungswert λ muss größer als 0 sein.', 'The mean λ must be greater than 0.');
      if (v.lambda > GRENZE_POISSON) return L('Für λ über 100 000 rechnet Statable nicht (Rechenzeit und Genauigkeit). Bitte ein kleineres λ wählen.', 'Statable does not calculate for λ above 100,000 (run time and accuracy). Please choose a smaller λ.');
      return null;
    case 'hyper':
      if (![v.N, v.K, v.n].every(z => zahl(z) && ganz(z) && z >= 0) || v.N < 1) return L('N, K und n müssen ganze Zahlen sein (N mindestens 1, die anderen mindestens 0).', 'N, K and n must be whole numbers (N at least 1, the others at least 0).');
      if (v.N > GRENZE_HYPER) return L('Für N über 10 000 000 rechnet Statable nicht (Rechenzeit und Genauigkeit). Bitte ein kleineres N wählen.', 'Statable does not calculate for N above 10,000,000 (run time and accuracy). Please choose a smaller N.');
      if (v.K > v.N) return L('K (die Treffer in der Gesamtheit) darf nicht größer sein als N.', 'K (the hits in the population) must not be greater than N.');
      if (v.n > v.N) return L('n (die gezogenen Elemente) darf nicht größer sein als N.', 'n (the number drawn) must not be greater than N.');
      return null;
    case 'eigen': return pruefeEigene(v.x, v.p);
  }
}

/** Eigene Wertetabelle prüfen: gleich lange Spalten, mindestens zwei Zeilen, keine Zahl doppelt, 0 ≤ P ≤ 1. Die Summe prüft `eigeneKennzahlen` (nicht still normieren). */
export function pruefeEigene(x: number[], p: number[]): string | null {
  if (x.length !== p.length) return L('Zu jedem Wert gehört genau eine Wahrscheinlichkeit.', 'Every value needs exactly one probability.');
  if (x.length < 2) return L('Bitte mindestens zwei Zeilen eingeben.', 'Please enter at least two rows.');
  for (let i = 0; i < x.length; i++) {
    if (!Number.isFinite(x[i]!)) return L(`In Zeile ${i + 1} fehlt eine Zahl für den Wert x.`, `Row ${i + 1} has no number for the value x.`);
    if (!Number.isFinite(p[i]!)) return L(`In Zeile ${i + 1} fehlt eine Zahl für die Wahrscheinlichkeit.`, `Row ${i + 1} has no number for the probability.`);
    if (p[i]! < 0 || p[i]! > 1) return L(`In Zeile ${i + 1} liegt die Wahrscheinlichkeit nicht zwischen 0 und 1.`, `In row ${i + 1} the probability is not between 0 and 1.`);
  }
  if (new Set(x).size !== x.length) return L('Ein Wert kommt doppelt vor. Jeder Wert darf nur einmal in der Tabelle stehen.', 'A value appears twice. Each value may appear only once in the table.');
  return null;
}

/** E(X) = Σ x·P(x), Var(X) = Σ x²·P(x) − E(X)², σ. Die Summe der P(x) wird NICHT still auf 1 gebracht: summeOk sagt, ob |Σ − 1| ≤ 1e-9. */
export function eigeneKennzahlen(x: number[], p: number[]): { summe: number; summeOk: boolean; mittel: number; varianz: number; sigma: number } {
  let summe = 0, m1 = 0, m2 = 0;
  for (let i = 0; i < x.length; i++) { summe += p[i]!; m1 += x[i]! * p[i]!; m2 += x[i]! * x[i]! * p[i]!; }
  const varianz = m2 - m1 * m1;
  return { summe, summeOk: Math.abs(summe - 1) <= 1e-9, mittel: m1, varianz, sigma: Math.sqrt(Math.max(0, varianz)) };
}

/** Zahl aus einem Eingabefeld: „0,25“, „0.25“, „1/6“, „ 1 / 4 “, „-1/4“, „1,5/3“. NaN bei Unsinn, leer, Nenner 0, mehreren Strichen. */
export function liesZahl(text: string): number {
  const teile = text.trim().split('/');
  if (teile.length > 2) return NaN;
  const eine = (t: string) => {
    const s = t.trim().replace(',', '.');
    return /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s) ? Number(s) : NaN;
  };
  if (teile.length === 1) return eine(teile[0]!);
  const z = eine(teile[0]!), n = eine(teile[1]!);
  return n === 0 ? NaN : z / n;
}

/** z = (x − μ)/σ und zurück. */
export const zuZ = (x: number, mu: number, sigma: number) => (x - mu) / sigma;
export const vonZ = (z: number, mu: number, sigma: number) => mu + z * sigma;

/* ------------------------------------------------------------------ Normalnäherung der Binomialverteilung */

/** Differenz Φ(b) − Φ(a) ohne Auslöschung (im oberen Teil über die oberen Schwänze). */
const phiDiff = (a: number, b: number) => ((a + b) / 2 > 0 ? normalOben(a) - normalOben(b) : normal(b) - normal(a));

/** P(a ≤ X ≤ b) für B(n; p): exakt, Normalnäherung ohne und mit Stetigkeitskorrektur (±½); Laplace-Bedingung σ > 3 (streng). */
export function normalnaeherung(n: number, p: number, a: number, b: number): { exakt: number; ohneKorrektur: number; mitKorrektur: number; mu: number; sigma: number; laplace: boolean } {
  const mu = n * p, sigma = Math.sqrt(n * p * (1 - p));
  return {
    exakt: zwischen({ art: 'binom', n, p }, a, b),
    ohneKorrektur: k01(phiDiff((a - mu) / sigma, (b - mu) / sigma)),
    mitKorrektur: k01(phiDiff((a - 0.5 - mu) / sigma, (b + 0.5 - mu) / sigma)),
    mu, sigma, laplace: sigma > 3
  };
}

export interface SigmaZeile { name: string; k: number; kExakt: number | null; naeherung: number; von: number; bis: number; exakt: number }
/** Sigma-Regeln: 1σ, 2σ, 3σ und die Schulwerte 1,64σ, 1,96σ, 2,58σ. `naeherung` = Φ(k) − Φ(−k) mit dem Schulwert; `kExakt` = exaktes Quantil; von/bis = ganzzahlige Randwerte; `exakt` = P(von ≤ X ≤ bis) der Binomialverteilung. */
export function sigmaTabelle(n: number, p: number): SigmaZeile[] {
  const mu = n * p, sigma = Math.sqrt(n * p * (1 - p));
  const zeilen: [string, number, number | null][] = [['1σ', 1, null], ['2σ', 2, null], ['3σ', 3, null], ['1,64σ', 1.64, qnorm(0.95)], ['1,96σ', 1.96, qnorm(0.975)], ['2,58σ', 2.58, qnorm(0.995)]];
  return zeilen.map(([name, k, kExakt]) => {
    const von = Math.max(0, Math.ceil(mu - k * sigma - 1e-9)), bis = Math.min(n, Math.floor(mu + k * sigma + 1e-9));
    return { name, k, kExakt, naeherung: k01(normal(k) - normal(-k)), von, bis, exakt: zwischen({ art: 'binom', n, p }, von, bis) };
  });
}

/** Liegt ein Teil des Ereignisses im Träger der Verteilung? Wenn nicht, ist die Wahrscheinlichkeit wirklich 0; sonst bedeutet eine 0 nur „zu klein für die Zahlendarstellung“. */
export function ereignisImTraeger(v: Verteilung, modus: 'links' | 'linksStreng' | 'rechts' | 'rechtsStreng' | 'zwischen', x: number, a = x, b = x): boolean {
  let lo = -Infinity, hi = Infinity;
  if (v.art === 'chi2' || v.art === 'f') lo = 0;
  else if (v.art === 'eigen') { const t = v.x.filter((_, i) => v.p[i]! > 0); if (!t.length) return false; lo = Math.min(...t); hi = Math.max(...t); }
  else if (istDiskret(v)) { const d = kern(v); lo = d.min; hi = d.max; }
  const stetig = !istDiskret(v);
  switch (modus) {
    case 'links': return stetig ? x > lo : x >= lo;
    case 'linksStreng': return x > lo;
    case 'rechts': return x <= hi;
    case 'rechtsStreng': return x < hi;
    default: return b >= a && b >= lo && a <= hi;
  }
}
