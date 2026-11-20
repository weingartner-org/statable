/**
 * Bland-Altman-Analyse für zwei Zahlenspalten (zwei Messmethoden, zwei Beurteilende mit Punkten).
 * Differenz d = erste Spalte − zweite Spalte, Mittelwert m = (erste + zweite) / 2.
 * Bias = mittleres d mit t-Intervall; Übereinstimmungsgrenzen = Bias ± 1,96·s.
 * Entscheidung: Das 95-%-Intervall jeder Grenze ist die exakte Methode nach Carkeet (2015) mit der nichtzentralen t-Verteilung:
 * d̄ + (s/√n)·t'(p; n−1, ncp = 1,96·√n) für die obere Grenze, gespiegelt für die untere (p = 0,025 und 0,975). Sie bleibt auch bei kleinem n zutreffend;
 * die verbreitete Näherung von Bland & Altman (1999), SE = s·√(1/n + 1,96²/(2(n−1))), ist bei kleinem n zu eng. Sie gilt hier nur, wo die nichtzentrale t-Verteilung
 * numerisch endet (ncp > 30, d. h. n > 233); dort sind beide Verfahren praktisch gleich.
 * R `BlandAltmanLeh::bland.altman.stats` rechnet mit der gröberen Näherung SE = s·√(3/n) und weicht deshalb in den Intervallen der Grenzen ab (Bias und Grenzen selbst stimmen).
 * ⚠ von der Fachperson abzunehmen.
 * Proportionaler Fehler: Steigung der Regression von d auf m mit t-Test (Bland & Altman 1999, S. 150).
 * Geprüft gegen R (scripts/blandaltman-erwartet.R).
 */
import { tNichtzentral, tQuantil, tVerteilung } from './verteilung';

export interface BlandAltman {
  n: number; bias: number; sd: number; biasLo: number; biasHi: number;
  /** untere und obere Übereinstimmungsgrenze, je mit 95-%-Intervall */
  untere: { wert: number; lo: number; hi: number }; obere: { wert: number; lo: number; hi: number };
  /** Steigung von d auf m und ihr p-Wert (zweiseitig); `NaN`, wenn alle Mittelwerte gleich sind */
  steigung: number; steigungP: number;
}
/** Die Punkte des Diagramms: Mittelwert (x) und Differenz erste − zweite Spalte (y). */
export const baPunkte = (paare: [number, number][]): [number, number][] => paare.map(([a, b]) => [(a + b) / 2, a - b]);
const Z = 1.959963984540054;

/** `paare`: [erste Spalte, zweite Spalte] je Fall (nur vollständige). Wirft bei weniger als 3 Fällen oder ohne Streuung der Differenzen. */
export function blandAltman(paare: [number, number][]): BlandAltman {
  const n = paare.length;
  if (n < 3) throw new Error('Zu wenige Fälle');
  const punkte = baPunkte(paare);
  const bias = punkte.reduce((s, p) => s + p[1], 0) / n;
  const sd = Math.sqrt(punkte.reduce((s, p) => s + (p[1] - bias) ** 2, 0) / (n - 1));
  if (!(sd > 0)) throw new Error('Alle Differenzen sind gleich');
  const t = tQuantil(0.975, n - 1), seBias = sd / Math.sqrt(n), seGrenze = sd * Math.sqrt(1 / n + (Z * Z) / (2 * (n - 1)));
  const ncp = Z * Math.sqrt(n), exakt = ncp <= 30;
  const q = (p: number) => { let lo = -1e5, hi = 1e5; for (let i = 0; i < 120; i++) { const m = (lo + hi) / 2; if (tNichtzentral(m, n - 1, ncp) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
  const qa = exakt ? q(0.025) : 0, qb = exakt ? q(0.975) : 0;
  const grenze = (w: number, oben: boolean) => (exakt
    ? { wert: w, lo: oben ? bias + seBias * qa : bias - seBias * qb, hi: oben ? bias + seBias * qb : bias - seBias * qa }
    : { wert: w, lo: w - t * seGrenze, hi: w + t * seGrenze });
  const mm = punkte.reduce((s, p) => s + p[0], 0) / n, sxx = punkte.reduce((s, p) => s + (p[0] - mm) ** 2, 0);
  let steigung = NaN, steigungP = NaN;
  if (sxx > 1e-12 && n > 2) {
    steigung = punkte.reduce((s, p) => s + (p[0] - mm) * (p[1] - bias), 0) / sxx;
    const sse = punkte.reduce((s, p) => s + (p[1] - bias - steigung * (p[0] - mm)) ** 2, 0);
    const se = Math.sqrt(sse / (n - 2) / sxx);
    steigungP = se > 0 ? 2 * (1 - tVerteilung(Math.abs(steigung / se), n - 2)) : (Math.abs(steigung) > 0 ? 0 : 1);
  }
  return { n, bias, sd, biasLo: bias - t * seBias, biasHi: bias + t * seBias, untere: grenze(bias - Z * sd, false), obere: grenze(bias + Z * sd, true), steigung, steigungP };
}
