/** Welle 6, Kachel „Aus Kennzahlen rechnen“: Anteil (Wilson-Intervall, Score-Test), Mittelwert (t-Test, Intervall, Cohens d) und Stichprobenumfang für eine gewünschte Breite.
 *  Reine Funktionen. Kein Wald-Intervall als Ergebnis (Entscheidung Opus F5); die Formel für n ist die Wald-Schätzung der Breite, das Intervall der Stichprobe bleibt Wilson.
 *  Sollwerte: R `prop.test(…, correct = FALSE)` (= Wilson ohne Stetigkeitskorrektur), `t.test`, `qnorm` (scripts/welle6-erwartet.R). */
import { normal, normalOben, tQuantil, tSchwaenze } from './verteilung';
import { qnorm } from './diagrammdaten';
import { L } from './sitzung.svelte';

export type Seite = 'zwei' | 'links' | 'rechts';

/** z-Wert zum Niveau: z = qnorm(1 − (1 − niveau)/2) (1,96 bei 95 %). */
export const zZumNiveau = (niveau: number) => -qnorm((1 - niveau) / 2);

/** Wilson-Score-Intervall OHNE Stetigkeitskorrektur (= `prop.test(x, n, correct = FALSE)$conf.int`). x darf nicht ganzzahlig sein. Bei x = 0 ist die untere Grenze genau 0, bei x = n die obere genau 1. */
export function wilsonIntervall(x: number, n: number, niveau: number): { lo: number; hi: number } {
  const z = zZumNiveau(niveau), z2 = z * z, p = x / n;
  const mitte = (p + z2 / (2 * n)) / (1 + z2 / n);
  const halb = (z / (1 + z2 / n)) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return { lo: x === 0 ? 0 : Math.max(0, mitte - halb), hi: x === n ? 1 : Math.min(1, mitte + halb) };
}

/** Score-Test für einen Anteil: z = (p̂ − p0)/√(p0(1−p0)/n). Zweiseitig 2·Φ(−|z|); links Φ(z); rechts P(Z ≥ z) - die obere Seite direkt, nicht 1 − Φ. */
export function scoreTest(x: number, n: number, p0: number, seite: Seite): { z: number; p: number } {
  const z = (x / n - p0) / Math.sqrt((p0 * (1 - p0)) / n);
  const p = seite === 'zwei' ? Math.min(1, 2 * normalOben(Math.abs(z))) : seite === 'links' ? normal(z) : normalOben(z);
  return { z, p };
}

export interface AnteilErgebnis { phat: number; lo: number; hi: number; z: number; p: number; naeherungGrob: boolean }
/** Wilson-Intervall (immer zweiseitig) und Score-Test in einem Aufruf. `naeherungGrob` = n·p0·(1−p0) ≤ 9: dann ist die Normalnäherung des Tests grob, der exakte Test steht in „Anteilstest verstehen“. */
export function anteilAusKennzahlen(e: { x: number; n: number; p0: number; niveau: number; seite: Seite }): AnteilErgebnis {
  const { lo, hi } = wilsonIntervall(e.x, e.n, e.niveau), { z, p } = scoreTest(e.x, e.n, e.p0, e.seite);
  return { phat: e.x / e.n, lo, hi, z, p, naeherungGrob: e.n * e.p0 * (1 - e.p0) <= 9 };
}

/** x = p̂·n. Liegt das Ergebnis innerhalb 1e-9 (relativ) an einer ganzen Zahl (0,07·100 ist in Gleitkomma 7,000000000000001), wird auf sie gerundet; sonst bleibt x ungerundet und `ganzzahlig` ist false. */
export function eingabeAnteil(phat: number, n: number): { x: number; ganzzahlig: boolean } {
  const x = phat * n, r = Math.round(x);
  return Math.abs(x - r) <= 1e-9 * Math.max(1, Math.abs(r)) ? { x: r, ganzzahlig: true } : { x, ganzzahlig: false };
}

export interface MittelwertErgebnis { se: number; t: number; df: number; p: number; lo: number; hi: number; d: number }
/** t-Test und Intervall für einen Mittelwert aus m, s, n: SE = s/√n, t = (m − μ0)/SE, df = n − 1, Intervall m ± t(1 − α/2; df)·SE (zweiseitig), d = (m − μ0)/s. */
export function mittelwertAusKennzahlen(e: { m: number; s: number; n: number; mu0: number; niveau: number; seite: Seite }): MittelwertErgebnis {
  const se = e.s / Math.sqrt(e.n), t = (e.m - e.mu0) / se, df = e.n - 1;
  const sw = tSchwaenze(t, df);
  const p = e.seite === 'zwei' ? Math.min(1, 2 * tSchwaenze(-Math.abs(t), df).unten) : e.seite === 'links' ? sw.unten : sw.oben;
  const kt = tQuantil(1 - (1 - e.niveau) / 2, df);
  return { se, t, df, p, lo: e.m - kt * se, hi: e.m + kt * se, d: (e.m - e.mu0) / e.s };
}

const niveauFehler = () => L('Das Niveau muss zwischen 0 und 1 liegen (zum Beispiel 0,95 für 95 %).', 'The level must lie between 0 and 1 (for example 0.95 for 95 %).');
/** null = in Ordnung, sonst ein Satz. Gesperrt: x < 0 oder x > n, n < 1, p0 ≤ 0 oder ≥ 1, Niveau ≤ 0 oder ≥ 1. */
export function pruefeAnteil(e: { x: number; n: number; p0: number; niveau: number }): string | null {
  if (![e.x, e.n, e.p0, e.niveau].every(Number.isFinite)) return L('Bitte alle Felder mit Zahlen füllen.', 'Please fill in all fields with numbers.');
  if (e.n < 1 || !Number.isInteger(e.n)) return L('Der Stichprobenumfang n muss eine ganze Zahl ab 1 sein.', 'The sample size n must be a whole number of at least 1.');
  if (e.x < 0 || e.x > e.n) return L('Die Anzahl x muss zwischen 0 und n liegen.', 'The count x must lie between 0 and n.');
  if (e.p0 <= 0 || e.p0 >= 1) return L('Der Vergleichswert p0 muss zwischen 0 und 1 liegen (ohne die Grenzen).', 'The comparison value p0 must lie between 0 and 1 (excluding the limits).');
  if (e.niveau <= 0 || e.niveau >= 1) return niveauFehler();
  return null;
}
/** null = in Ordnung. Gesperrt: n < 2 oder nicht ganzzahlig, s ≤ 0 (t und d wären nicht definiert), Niveau ≤ 0 oder ≥ 1. */
export function pruefeMittelwert(e: { m: number; s: number; n: number; niveau: number }): string | null {
  if (![e.m, e.s, e.n, e.niveau].every(Number.isFinite)) return L('Bitte alle Felder mit Zahlen füllen.', 'Please fill in all fields with numbers.');
  if (e.n < 2 || !Number.isInteger(e.n)) return L('Der Stichprobenumfang n muss eine ganze Zahl ab 2 sein.', 'The sample size n must be a whole number of at least 2.');
  if (e.s <= 0) return L('Die Standardabweichung s muss größer als 0 sein, sonst sind t und d nicht definiert.', 'The standard deviation s must be greater than 0, otherwise t and d are not defined.');
  if (e.niveau <= 0 || e.niveau >= 1) return niveauFehler();
  return null;
}

/** Stichprobenumfang für einen Anteil bei Halbbreite d („± d“): ⌈z²·p(1−p)/d²⌉. p = 0,5 ist der ungünstigste Fall und der Standard; immer aufgerundet. */
export function umfangAnteil(niveau: number, d: number, p = 0.5): number {
  const z = zZumNiveau(niveau);
  return Math.ceil((z * z * p * (1 - p)) / (d * d));
}
/** Dasselbe, wenn die Länge L des ganzen Intervalls vorgegeben ist (d = L/2). */
export function umfangAnteilLaenge(niveau: number, laenge: number, p = 0.5): number { return umfangAnteil(niveau, laenge / 2, p); }
/** Stichprobenumfang für einen Mittelwert bei Halbbreite d und geschätztem σ: ⌈(z·σ/d)²⌉ (mit t wird es etwas mehr). */
export function umfangMittelwert(niveau: number, d: number, sigma: number): number {
  const z = zZumNiveau(niveau);
  return Math.ceil((z * sigma / d) ** 2);
}
