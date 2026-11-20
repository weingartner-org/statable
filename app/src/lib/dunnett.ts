/**
 * Dunnett-Test: alle Gruppen gegen EINE Kontrollgruppe, zweiseitig, p-Werte und Intervalle für alle Vergleiche zugleich (single-step wie multcomp::glht(mcp(Dunnett))).
 *
 * Die Differenzen (Gruppe i minus Kontrolle) sind gemeinsam multivariat t-verteilt. Ihre Korrelation hat die Form ρij = λi·λj mit λi = √(ni / (ni + n0))
 * (die Kontrollgruppe steckt in jeder Differenz) - das gilt auch bei ungleich großen Gruppen. Damit lässt sich die Wahrscheinlichkeit, dass ALLE |Ti| unter c bleiben,
 * als doppeltes Integral schreiben (Dunnett 1955; Genz & Bretz 2009, Fall mit einem gemeinsamen Faktor):
 *   P(max|Ti| < c) = ∫ f(s) ∫ φ(z) · Πi [ Φ((c·s − λi·z)/√(1−λi²)) − Φ((−c·s − λi·z)/√(1−λi²)) ] dz ds,
 * s = √(χ²df/df) mit seiner Dichte f. Beide Integrale rechnet dieses Modul mit zusammengesetzter Gauß-Legendre-Quadratur (feste Knoten, keine Zufallszahlen).
 * Sollwerte: R multcomp (docs/fachblaetter/sollwerte/field-stufe2.json, Abschnitt kontraste.dunnett), Toleranz 1e-4 (multcomp rechnet selbst mit numerischer Integration).
 */
import { lnGamma, normal } from './verteilung';

/** Knoten und Gewichte der n-Punkt-Gauß-Legendre-Formel auf [-1, 1] (Newton-Verfahren auf dem Legendre-Polynom). */
function glKnoten(n: number): { x: number[]; w: number[] } {
  const x: number[] = [], w: number[] = [];
  for (let i = 0; i < n; i++) {
    let z = Math.cos(Math.PI * (i + 0.75) / (n + 0.5)), pp = 1;
    for (let it = 0; it < 100; it++) {
      let p1 = 1, p2 = 0;
      for (let j = 0; j < n; j++) { const p3 = p2; p2 = p1; p1 = ((2 * j + 1) * z * p2 - j * p3) / (j + 1); }
      pp = (n * (z * p1 - p2)) / (z * z - 1);
      const z1 = z; z = z1 - p1 / pp;
      if (Math.abs(z - z1) < 1e-15) break;
    }
    x.push(z); w.push(2 / ((1 - z * z) * pp * pp));
  }
  return { x, w };
}
const GL = glKnoten(16);

/** ∫ f über [a, b] mit `felder` Teilstücken zu je 16 Knoten. */
function integral(f: (t: number) => number, a: number, b: number, felder: number): number {
  const h = (b - a) / felder; let summe = 0;
  for (let k = 0; k < felder; k++) {
    const m = a + (k + 0.5) * h;
    for (let i = 0; i < GL.x.length; i++) summe += GL.w[i]! * f(m + 0.5 * h * GL.x[i]!);
  }
  return summe * 0.5 * h;
}

const SQ2PI = Math.sqrt(2 * Math.PI);
/** Wilson-Hilferty-Näherung des Quantils der χ²-Verteilung (nur für die Grenzen des Integrals). */
const chiQ = (df: number, z: number) => { const a = 2 / (9 * df); return df * Math.max(0, 1 - a + z * Math.sqrt(a)) ** 3; };

/** P(|T1| < c, …, |Tm| < c) für Differenzen gegen eine Kontrollgruppe mit Korrelationsfaktoren `lambda` und `df` Freiheitsgraden. */
export function pMaxT(c: number, lambda: number[], df: number): number {
  if (!(c > 0)) return 0;
  const tau = lambda.map(l => Math.sqrt(1 - l * l));
  const innen = (s: number): number => integral(z => {
    let p = Math.exp(-0.5 * z * z) / SQ2PI;
    for (let i = 0; i < lambda.length; i++) { p *= normal((c * s - lambda[i]! * z) / tau[i]!) - normal((-c * s - lambda[i]! * z) / tau[i]!); if (p === 0) break; }
    return p;
  }, -9, 9, 6);
  const lnK = Math.LN2 + (df / 2) * Math.log(df / 2) - lnGamma(df / 2);
  const dichte = (s: number) => Math.exp(lnK + (df - 1) * Math.log(s) - (df * s * s) / 2);
  const lo = Math.sqrt(chiQ(df, -7.2) / df), hi = Math.sqrt(chiQ(df, 7.2) / df);
  return Math.min(1, integral(s => (s > 0 ? dichte(s) * innen(s) : 0), Math.max(lo, 1e-9), hi, 24));
}

/** Zweiseitiges p für den beobachteten Betrag |t| eines Vergleichs, angepasst für alle Vergleiche (single-step). */
export const dunnettP = (absT: number, lambda: number[], df: number): number => Math.max(0, 1 - pMaxT(absT, lambda, df));

/** Kritischer Wert c mit P(max|Ti| < c) = 1 − alpha (Bisektion). */
export function dunnettKrit(lambda: number[], df: number, alpha = 0.05): number {
  let lo = 0, hi = 2;
  while (pMaxT(hi, lambda, df) < 1 - alpha && hi < 1e3) { lo = hi; hi *= 2; }
  for (let i = 0; i < 45; i++) { const m = (lo + hi) / 2; if (pMaxT(m, lambda, df) < 1 - alpha) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/** Die Korrelationsfaktoren λi = √(ni / (ni + n0)) der Vergleiche gegen die Kontrollgruppe. */
export const dunnettLambda = (n: number[], n0: number): number[] => n.map(ni => Math.sqrt(ni / (ni + n0)));
