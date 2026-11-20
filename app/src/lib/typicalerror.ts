/**
 * Typical Error (Typischer Messfehler) aus zwei Messungen derselben Personen ohne Eingriff (Test-Retest) - Hopkins (2000), Sports Med 30:1-15.
 * Differenz d = zweite − erste Messung (so rechnet Hopkins; ⚠ Bland-Altman in Statable rechnet erste − zweite: das Vorzeichen der Änderung ist umgekehrt).
 * TE = SD(d)/√2 (SD mit n − 1) mit Intervall über χ² (df = n − 1): TE·√(df/χ²₀,₉₇₅) bis TE·√(df/χ²₀,₀₂₅).
 * Änderung des Mittelwerts = Mittel von d mit t-Intervall.
 * Variationskoeffizient (CV, %) aus den ln-Werten: 100·(exp(TE_ln) − 1) (Rücktransformation nach Hopkins; die Näherung 100·TE_ln steht nur zum Vergleich),
 * nur wenn alle Werte > 0 sind. Intervall: dieselbe χ²-Umrechnung auf TE_ln, dann 100·(exp(·) − 1).
 * TE ist nicht der SEM aus der Reliabilität und nicht die Within-subject-SD nach Bland (die die Mittelwertänderung enthält).
 * Geprüft gegen R (scripts/welle7-erwartet.R, Abschnitt typicalerror). ⚠ von der Fachperson abzunehmen.
 */
import { chi2Quantil } from './power';
import { tQuantil } from './verteilung';

export interface TeKi { wert: number; lo: number; hi: number }
export interface TypicalError {
  n: number; df: number; sdDiff: number;
  te: TeKi; aenderung: TeKi;
  cv: TeKi | null; cvNaeherung: TeKi | null; teLn: number | null;
}

const sdVon = (d: number[]) => {
  const n = d.length, m = d.reduce((s, v) => s + v, 0) / n;
  return { m, sd: Math.sqrt(d.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1)) };
};

/** `paare`: [Messung 1, Messung 2] je Person (nur vollständige). Wirft bei weniger als 3 Paaren oder wenn alle Differenzen gleich sind. */
export function typicalError(paare: [number, number][]): TypicalError {
  const n = paare.length, df = n - 1;
  if (n < 3) throw new Error('Zu wenige Fälle');
  const { m, sd } = sdVon(paare.map(([a, b]) => b - a));
  if (!(sd > 0)) throw new Error('Alle Differenzen sind gleich');
  const qLo = chi2Quantil(0.025, df), qHi = chi2Quantil(0.975, df);
  const teKi = (s: number): TeKi => { const t = s / Math.SQRT2; return { wert: t, lo: t * Math.sqrt(df / qHi), hi: t * Math.sqrt(df / qLo) }; };
  const t = tQuantil(0.975, df), se = sd / Math.sqrt(n);
  let cv: TeKi | null = null, cvNaeherung: TeKi | null = null, teLn: number | null = null;
  if (paare.every(([a, b]) => a > 0 && b > 0)) {
    const k = teKi(sdVon(paare.map(([a, b]) => Math.log(b) - Math.log(a))).sd);
    teLn = k.wert;
    cv = { wert: 100 * (Math.exp(k.wert) - 1), lo: 100 * (Math.exp(k.lo) - 1), hi: 100 * (Math.exp(k.hi) - 1) };
    cvNaeherung = { wert: 100 * k.wert, lo: 100 * k.lo, hi: 100 * k.hi };
  }
  return { n, df, sdDiff: sd, te: teKi(sd), aenderung: { wert: m, lo: m - t * se, hi: m + t * se }, cv, cvNaeherung, teLn };
}
