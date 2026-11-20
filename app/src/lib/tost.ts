/**
 * Äquivalenztest (TOST, two one-sided tests) - G15, Fachblatt Welle 2, Paket D (docs/fachblaetter/WELLE2-PSYCHOLOGIE.md).
 * Sollwerte: scripts/tost-rci-erwartet.R (R 4.6.1, TOSTER 0.8.6, zweite Quelle zwei t.test(mu = ∓Δ)), Tests: tost-rci.test.ts.
 *
 * Zwei Gruppen: Welch (ungleiche Streuung erlaubt), Differenz = Gruppe 1 minus Gruppe 2. Gepaart: t-Test der Differenzen, Differenz = nachher minus vorher.
 * Untere Grenze testet H0: Differenz <= -Δ (einseitig „größer“), obere Grenze H0: Differenz >= +Δ (einseitig „kleiner“); Äquivalenz, wenn beide p < ,05 (= das größere p < ,05).
 * Intervall: 90 % der Differenz (α = ,05 je Seite, Lakens 2017). Nur symmetrische Grenzen ±Δ in Rohwerten; Δ als d: Δ / s_p (zwei Gruppen, ohne Hedges-Korrektur) bzw. Δ / SD der Differenzen (d_z).
 * ⚠ von der Fachperson abzunehmen: nur symmetrische Grenzen, Welch statt gepoolter Varianz.
 */
import { betai, tQuantil } from './verteilung';

export interface TostErgebnis {
  n1: number; n2: number; differenz: number; se: number; df: number;
  tUnten: number; pUnten: number; tOben: number; pOben: number; pTost: number;
  ki90: [number, number]; aequivalent: boolean; delta: number; deltaD: number; dBeob: number; tNull: number; pNull: number;
}

/** Niveau je Seite. */
export const TOST_ALPHA = 0.05;

const endlich = (a: number[]) => a.every(v => typeof v === 'number' && Number.isFinite(v));
const mittel = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const varianz = (a: number[], m = mittel(a)) => a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1);
/** Obere und untere Wahrscheinlichkeit der t-Verteilung (T ab t bzw. T bis t), auch für sehr kleine Werte genau. */
const pGroesser = (t: number, df: number) => { const h = 0.5 * betai(df / 2, 0.5, df / (df + t * t)); return t >= 0 ? h : 1 - h; };
const pKleiner = (t: number, df: number) => pGroesser(-t, df);
const pZweiseitig = (t: number, df: number) => betai(df / 2, 0.5, df / (df + t * t));

/** Gemeinsamer Teil: Differenz, Standardfehler, Freiheitsgrade und der Maßstab für d. `null` bei ungültigen Grenzen. */
function tost(differenz: number, se: number, df: number, delta: number, skala: number, n1: number, n2: number): TostErgebnis | null {
  if (!Number.isFinite(delta) || delta <= 0 || !(se > 0) || !Number.isFinite(se) || !(df > 0) || !(skala > 0)) return null;
  const tUnten = (differenz + delta) / se, tOben = (differenz - delta) / se;
  const pUnten = pGroesser(tUnten, df), pOben = pKleiner(tOben, df), pTost = Math.max(pUnten, pOben);
  const k = tQuantil(1 - TOST_ALPHA, df) * se;
  const tNull = differenz / se;
  return { n1, n2, differenz, se, df, tUnten, pUnten, tOben, pOben, pTost, ki90: [differenz - k, differenz + k], aequivalent: pTost < TOST_ALPHA, delta, deltaD: delta / skala, dBeob: differenz / skala, tNull, pNull: pZweiseitig(tNull, df) };
}

/** Zwei unabhängige Gruppen (Welch), Δ in Rohwerten; `null` bei ungültigen Daten oder Grenzen. */
export function tostGruppen(x: number[], y: number[], delta: number): TostErgebnis | null {
  if (x.length < 2 || y.length < 2 || !endlich(x) || !endlich(y)) return null;
  const n1 = x.length, n2 = y.length, m1 = mittel(x), m2 = mittel(y), v1 = varianz(x, m1), v2 = varianz(y, m2);
  const a = v1 / n1, b = v2 / n2, se = Math.sqrt(a + b);
  if (!(se > 0)) return null;
  const df = (a + b) ** 2 / (a ** 2 / (n1 - 1) + b ** 2 / (n2 - 1));
  const sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  return tost(m1 - m2, se, df, delta, sp, n1, n2);
}

/** Gepaart: t-Test der Differenzen (nachher minus vorher); `null` bei ungleich langen Listen, weniger als 2 Paaren, ohne Streuung der Differenzen oder bei ungültigem Δ. */
export function tostGepaart(nachher: number[], vorher: number[], delta: number): TostErgebnis | null {
  if (nachher.length !== vorher.length || nachher.length < 2 || !endlich(nachher) || !endlich(vorher)) return null;
  const n = nachher.length, dif = nachher.map((v, i) => v - vorher[i]!), m = mittel(dif), sd = Math.sqrt(varianz(dif, m));
  if (!(sd > 0)) return null;
  return tost(m, sd / Math.sqrt(n), n - 1, delta, sd, n, n);
}
