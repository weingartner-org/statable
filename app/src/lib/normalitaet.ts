/**
 * Normalverteilungstest nach Shapiro-Wilk (W und p) - eigener Code, weil PSPP 2.1.1 ihn nicht ausgibt.
 * Rechnung: Royston (1995), Algorithmus AS R94 - dieselbe wie in R `shapiro.test` (C-Datei swilk.c). Gültig für 3 bis 5000 Werte.
 * Die Zahlen sind gegen R geprüft (normalitaet.test.ts, Vergleichswerte aus scripts/normalitaet-erwartet.R).
 * ⚠ von der Fachperson abzunehmen: dass Shapiro-Wilk der Test der Wahl ist, die Grenze p < ,05 und der Wortlaut „weicht von der Normalverteilung ab“.
 */
import { qnorm, sortiert } from './diagrammdaten';
import { normal } from './verteilung';

export interface Shapiro { w: number; p: number; n: number }
/** Mehr Werte als dies rechnet R (und dieser Code) nicht mehr. */
export const SHAPIRO_MAX = 5000;

const poly = (c: number[], x: number) => { let r = c[0]!; if (c.length > 1) { let p = x * c[c.length - 1]!; for (let j = c.length - 2; j >= 1; j--) p = (p + c[j]!) * x; r += p; } return r; };
const C1 = [0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056];
const C2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
const C3 = [0.544, -0.39978, 0.025054, -6.714e-4];
const C4 = [1.3822, -0.77857, 0.062767, -0.0020322];
const C5 = [-1.5861, -0.31082, -0.083751, 0.0038915];
const C6 = [-0.4803, -0.082676, 0.0030302];
const G = [-2.273, 0.459];

/** Shapiro-Wilk-Test; `null` bei weniger als 3 oder mehr als 5000 gültigen Werten oder wenn alle Werte gleich sind. */
export function shapiroWilk(werte: number[]): Shapiro | null {
  const x = sortiert(werte.filter(Number.isFinite)), n = x.length;
  if (n < 3 || n > SHAPIRO_MAX || x[n - 1]! - x[0]! === 0) return null;
  const nn2 = n >> 1, a = new Array<number>(nn2 + 1).fill(0);   // a[1..nn2]
  if (n === 3) a[1] = Math.SQRT1_2;
  else {
    const m = new Array<number>(nn2 + 1).fill(0);
    let summ2 = 0;
    for (let i = 1; i <= nn2; i++) { m[i] = qnorm((i - 0.375) / (n + 0.25)); summ2 += m[i]! * m[i]!; }
    summ2 *= 2;
    const ssumm2 = Math.sqrt(summ2), rsn = 1 / Math.sqrt(n);
    const a1 = poly(C1, rsn) - m[1]! / ssumm2;
    let i1: number, fac: number;
    if (n > 5) {
      i1 = 3;
      const a2 = -m[2]! / ssumm2 + poly(C2, rsn);
      fac = Math.sqrt((summ2 - 2 * m[1]! ** 2 - 2 * m[2]! ** 2) / (1 - 2 * a1 * a1 - 2 * a2 * a2));
      a[2] = a2;
    } else { i1 = 2; fac = Math.sqrt((summ2 - 2 * m[1]! ** 2) / (1 - 2 * a1 * a1)); }
    a[1] = a1;
    for (let i = i1; i <= nn2; i++) a[i] = -m[i]! / fac;
  }
  // W = (Σ aᵢ·x₍ᵢ₎)² / Σ (xᵢ − x̄)²; die Koeffizienten sind antisymmetrisch (unten negativ, oben positiv).
  const mw = x.reduce((s, v) => s + v, 0) / n;
  let zaehler = 0, nenner = 0;
  for (let i = 0; i < nn2; i++) zaehler += a[i + 1]! * (x[n - 1 - i]! - x[i]!);
  for (const v of x) nenner += (v - mw) ** 2;
  const w = Math.min(1, zaehler * zaehler / nenner);
  let p: number;
  if (n === 3) p = Math.max(0, 6 / Math.PI * (Math.asin(Math.sqrt(w)) - Math.PI / 3));
  else {
    const xx = Math.log(n);
    let y = Math.log(1 - w), mu: number, sigma: number;
    if (n <= 11) {
      const gamma = poly(G, n);
      if (y >= gamma) return { w, p: 1e-99, n };
      y = -Math.log(gamma - y);
      mu = poly(C3, n); sigma = Math.exp(poly(C4, n));
    } else { mu = poly(C5, xx); sigma = Math.exp(poly(C6, xx)); }
    p = normal(-(y - mu) / sigma);
  }
  return { w, p: Math.min(1, Math.max(0, p)), n };
}
