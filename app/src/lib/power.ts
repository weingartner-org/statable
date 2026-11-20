/**
 * Poweranalyse („Studie planen“): Stichprobengröße a priori und kleinster nachweisbarer Effekt (Sensitivität).
 * Rechenweg wie G*Power: t-Tests über die nichtzentrale t-Verteilung, ANOVA und Regression über die nichtzentrale F-Verteilung
 * (λ = f² · N), Chi² über die nichtzentrale χ²-Verteilung (λ = w² · N), Korrelation exakt über die Verteilung von r
 * (bivariates Normalmodell, Hotelling 1953) - nicht über die Fisher-z-Näherung. Prüfwerte: `power.test.ts` (R `pwr`, G*Power).
 * Keine Post-hoc-Power: die Seite fragt immer nach dem Effekt, den man erwartet bzw. finden will, nie nach dem beobachteten.
 */
import { betai, betaiXY, dpoisRaw, lnGamma, normal, tNichtzentral, tQuantil } from './verteilung';
import { L, Lp, d, aktuelleSprache, mitFlag } from './sitzung.svelte';
import { dez, ganzZahl as gz, mitNull, proz } from '../i18n/profil';
import { qnorm } from './diagrammdaten';

export type Test = 'unabhaengig' | 'gepaart' | 'korrelation' | 'anova' | 'chi2' | 'regression';
export const KLASSISCHE_TESTS: Test[] = ['unabhaengig', 'gepaart', 'korrelation', 'anova', 'chi2', 'regression'];
/** Später S-D (M9): Fallzahl für Anteile, Überleben (Log-Rank) und AUC - sie haben eigene Eingaben und Formeln (unten) und stehen nicht in `Plan`. */
export type NeuerTest = 'anteile' | 'ueberleben' | 'auc' | 'anovaplus' | 'r2zuwachs' | 'partiell';
/** Karten der Seite. 'r2zuwachs' und 'partiell' (S-F2) sind keine eigenen Karten, sondern die Antworten auf „Was soll geprüft werden?“ bei „Etwas vorhersagen“; 'anovaplus' (S-F2) ist eine eigene Karte. */
export const NEUE_TESTS: NeuerTest[] = ['anteile', 'ueberleben', 'auc', 'anovaplus'];
/** Die Fälle der Welle S-F2 (eigene Oberfläche bausteine/PlanenF2.svelte). */
export const F2_TESTS: NeuerTest[] = ['anovaplus', 'r2zuwachs', 'partiell'];
export const TESTS: (Test | NeuerTest)[] = [...KLASSISCHE_TESTS, ...NEUE_TESTS];

export interface Plan {
  test: Test;
  /** Erwarteter Effekt: d, r, f, w oder f² (je nach Test). Beim gepaarten t-Test d wie in Studien berichtet (d_av); gerechnet wird mit d_z (dzAus). */
  effekt: number;
  /** Nur „gepaart“: erwartete Korrelation r der Messungen vorher und nachher (Standard ,50 - dann ist d_z = d). */
  rPaar: number;
  alpha: number;
  /** 1 oder 2; gilt nur für t-Tests und Korrelation (ANOVA, Chi², Regression prüfen immer den oberen Rand). */
  seiten: 1 | 2;
  /** Nur „unabhängig“: n₂ : n₁. */
  verhaeltnis: number;
  /** Nur ANOVA: Anzahl Gruppen k. */
  gruppen: number;
  /** Nur Chi²: Freiheitsgrade, (Zeilen − 1) · (Spalten − 1). */
  df: number;
  /** Nur Regression: Anzahl Prädiktoren. */
  praediktoren: number;
}

export const hatSeiten = (t: Test) => t === 'unabhaengig' || t === 'gepaart' || t === 'korrelation';

/** Cohens Marken (klein, mittel, groß) und sinnvolle Reglerbereiche je Test. */
export const MARKEN: Record<Test, { symbol: string; marken: [number, number, number]; min: number; max: number; schritt: number }> = {
  unabhaengig: { symbol: 'd', marken: [0.2, 0.5, 0.8], min: 0.05, max: 1.5, schritt: 0.01 },
  gepaart: { symbol: 'd', marken: [0.2, 0.5, 0.8], min: 0.05, max: 1.5, schritt: 0.01 },
  korrelation: { symbol: 'r', marken: [0.1, 0.3, 0.5], min: 0.05, max: 0.8, schritt: 0.01 },
  anova: { symbol: 'f', marken: [0.1, 0.25, 0.4], min: 0.05, max: 0.8, schritt: 0.01 },
  chi2: { symbol: 'w', marken: [0.1, 0.3, 0.5], min: 0.05, max: 0.8, schritt: 0.01 },
  regression: { symbol: 'f²', marken: [0.02, 0.15, 0.35], min: 0.01, max: 0.6, schritt: 0.01 }
};

export function standardPlan(test: Test): Plan {
  return { test, effekt: MARKEN[test].marken[1], rPaar: 0.5, alpha: 0.05, seiten: 2, verhaeltnis: 1, gruppen: 3, df: 1, praediktoren: 3 };
}

/** Wo liegt der Effekt in Cohens Einteilung? 0 = unter klein, 1 = klein bis mittel, 2 = mittel bis groß, 3 = ab groß. */
export function einordnung(test: Test, e: number): 0 | 1 | 2 | 3 {
  const [k, m, g] = MARKEN[test].marken;
  return e < k ? 0 : e < m ? 1 : e < g ? 2 : 3;
}

/* ---------------------------------------------------------------- Verteilungen */

/** Regularisierte unvollständige Gammafunktion als unterer P(a, x) UND oberer Schwanz Q(a, x), beide direkt (Reihe bzw. Kettenbruch, Numerical Recipes; Vorfaktor über die Poisson-Dichte nach Loader, ohne Auslöschung). */
export function gammaPQ(a: number, x: number): { unten: number; oben: number } {
  if (!(x > 0)) return { unten: 0, oben: 1 };
  if (x === Infinity) return { unten: 1, oben: 0 };
  const vor = a * dpoisRaw(a, x);                          // x^a e^−x / Γ(a)
  if (x < a + 1) {
    let ap = a, summe = 1 / a, del = summe;
    for (let i = 0; i < 100000; i++) { ap += 1; del *= x / ap; summe += del; if (Math.abs(del) < Math.abs(summe) * 1e-16) break; }
    const u = Math.min(1, summe * vor);
    return { unten: u, oben: 1 - u };
  }
  const tiny = 1e-300;
  let b = x + 1 - a, c = 1 / tiny, d = 1 / b, h = d;
  for (let i = 1; i < 100000; i++) {
    const an = -i * (i - a); b += 2;
    d = an * d + b; if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  const o = Math.min(1, vor * h);
  return { unten: 1 - o, oben: o };
}

/** Regularisierte untere unvollständige Gammafunktion P(a, x). */
export function gammaP(a: number, x: number): number { return gammaPQ(a, x).unten; }

export const chi2Verteilung = (x: number, df: number) => gammaPQ(df / 2, x / 2).unten;
/** P(χ² ≥ x), oberer Schwanz direkt. */
export const chi2Oben = (x: number, df: number) => gammaPQ(df / 2, x / 2).oben;
const fSchwaenze = (x: number, d1: number, d2: number) => {
  if (!(x > 0)) return { unten: 0, oben: 1 };
  if (x === Infinity) return { unten: 1, oben: 0 };
  const u = d1 * x, nenner = u + d2;
  return betaiXY(d1 / 2, d2 / 2, Number.isFinite(nenner) ? u / nenner : 1, d2 / nenner);
};
export const fVerteilung = (x: number, d1: number, d2: number) => fSchwaenze(x, d1, d2).unten;
/** P(F ≥ x), oberer Schwanz direkt. */
export const fOben = (x: number, d1: number, d2: number) => fSchwaenze(x, d1, d2).oben;

/** Σ_j Poisson(j; m) · f(j), vom Gipfel nach beiden Seiten, bis die Gewichte verschwinden. */
function poissonMischung(m: number, f: (j: number) => number): number {
  if (m < 1e-12) return f(0);
  const j0 = Math.floor(m), lm = Math.log(m);
  const gew = (j: number) => Math.exp(-m + j * lm - lnGamma(j + 1));
  let summe = 0;
  for (let j = j0; j < j0 + 200000; j++) { const w = gew(j); summe += w * f(j); if (w < 1e-17 && j > m) break; }
  for (let j = j0 - 1; j >= 0; j--) { const w = gew(j); summe += w * f(j); if (w < 1e-17) break; }
  return Math.min(1, summe);
}

/** P(X ≤ x) der nichtzentralen χ²-Verteilung (Poisson-Mischung zentraler χ²; wie R `pchisq(x, df, ncp)`). */
export const chi2Nichtzentral = (x: number, df: number, ncp: number) => poissonMischung(ncp / 2, j => chi2Verteilung(x, df + 2 * j));
/** P(F ≤ x) der nichtzentralen F-Verteilung (wie R `pf(x, d1, d2, ncp)`). */
export const fNichtzentral = (x: number, d1: number, d2: number, ncp: number) =>
  x <= 0 ? 0 : poissonMischung(ncp / 2, j => betai(d1 / 2 + j, d2 / 2, (d1 * x) / (d1 * x + d2)));

/** Quantil einer Verteilung auf [0, ∞) aus unterem und oberem Schwanz: p ≤ 0,5 löst den unteren Schwanz, sonst den oberen mit 1 − p (exakt) - kein Verlust an den Rändern; Einschließung in Zweierschritten, dann Bisektion. */
function quantilPositiv(unten: (x: number) => number, oben: (x: number) => number, p: number): number {
  if (!(p >= 0 && p <= 1)) return NaN;
  if (p === 0) return 0; if (p === 1) return Infinity;
  const links = p <= 0.5, ziel = links ? p : 1 - p;
  const zuKlein = (x: number) => (links ? unten(x) < ziel : oben(x) > ziel);
  let lo: number, hi: number;
  if (zuKlein(1)) { lo = 1; hi = 2; while (zuKlein(hi) && hi < 1e300) { lo = hi; hi *= 2; } }
  else { hi = 1; lo = 0.5; while (!zuKlein(lo) && lo > 1e-320) { hi = lo; lo /= 2; } if (lo <= 1e-320) lo = 0; }
  for (let i = 0; i < 110; i++) { const m = (lo + hi) / 2; if (zuKlein(m)) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
export const chi2Quantil = (p: number, df: number) => quantilPositiv(x => chi2Verteilung(x, df), x => chi2Oben(x, df), p);
export const fQuantil = (p: number, d1: number, d2: number) => quantilPositiv(x => fVerteilung(x, d1, d2), x => fOben(x, d1, d2), p);

/* ---------------------------------------------------------------- Power je Test */

/** Power des t-Tests bei Nichtzentralität ncp (ein- oder zweiseitig). */
function powerT(ncp: number, df: number, alpha: number, seiten: 1 | 2): number {
  const tk = tQuantil(1 - alpha / seiten, df);
  if (ncp > 36) return normal(ncp - tk);                  // AS 243 wird dort ungenau; die Power liegt ohnehin bei 1
  const oben = 1 - tNichtzentral(tk, df, ncp);
  return seiten === 1 ? oben : oben + tNichtzentral(-tk, df, ncp);
}

export const powerTUnabhaengig = (d: number, n1: number, n2: number, alpha: number, seiten: 1 | 2) =>
  powerT(d * Math.sqrt((n1 * n2) / (n1 + n2)), n1 + n2 - 2, alpha, seiten);
export const powerTGepaart = (dz: number, n: number, alpha: number, seiten: 1 | 2) => powerT(dz * Math.sqrt(n), n - 1, alpha, seiten);
/** d_z aus d (d_av, wie in Studien berichtet) und der erwarteten Korrelation r vorher-nachher: d_z = d / √(2 (1 − r)) (Lakens 2013, Formel 9; Cohen 1988, Kap. 2.3.5).
 *  Abschlusstest F4: Cohens Grenzen ,2/,5/,8 gelten für d, nicht für d_z - darum fragt die Seite nach d und r. */
export const dzAus = (d: number, r: number) => d / Math.sqrt(2 * (1 - r));
/** Erlaubter Bereich der erwarteten Korrelation vorher-nachher. */
export const R_PAAR_MIN = -0.5, R_PAAR_MAX = 0.95;

/** Dichte von r (n Paare, Korrelation ρ in der Grundgesamtheit) in Fisher-z-Koordinaten, mal dr/dz: Hotelling (1953), vgl. Wikipedia „Pearson correlation coefficient“. */
function dichteRZ(z: number, rho: number, n: number): number {
  const r = Math.tanh(z), x = (1 + rho * r) / 2;
  // 2F1(1/2, 1/2; n − 1/2; x), Reihe
  const c = n - 0.5;
  let term = 1, f = 1;
  for (let k = 0; k < 50000; k++) { term *= ((0.5 + k) * (0.5 + k) * x) / ((c + k) * (k + 1)); f += term; if (term < 1e-17 * f) break; }
  const lnVor = Math.log(n - 2) + lnGamma(n - 1) - 0.5 * Math.log(2 * Math.PI) - lnGamma(n - 0.5)
    + ((n - 1) / 2) * Math.log(1 - rho * rho) + ((n - 2) / 2) * Math.log(1 - r * r) - (n - 1.5) * Math.log(1 - rho * r);
  return Math.exp(lnVor + Math.log(f));
}

/** P(r > rk) bei Korrelation ρ in der Grundgesamtheit, n Paare: Integral der exakten Dichte (Simpson in z = artanh r). */
function schwanzR(rk: number, rho: number, n: number): number {
  const z0 = Math.atanh(rk), z1 = Math.max(Math.atanh(rho) + 12 / Math.sqrt(n - 3), z0 + 1.5);
  const N = 600, h = (z1 - z0) / N;
  let s = dichteRZ(z0, rho, n) + dichteRZ(z1, rho, n);
  for (let i = 1; i < N; i++) s += (i % 2 ? 4 : 2) * dichteRZ(z0 + i * h, rho, n);
  return Math.min(1, (s * h) / 3);
}

/** Power der Korrelation (H0: ρ = 0), exakt über die Verteilung von r - wie G*Power „Correlation: Bivariate normal model“. */
export function powerKorrelation(rho: number, n: number, alpha: number, seiten: 1 | 2): number {
  const tk = tQuantil(1 - alpha / seiten, n - 2), rk = tk / Math.sqrt(n - 2 + tk * tk);
  return seiten === 1 ? schwanzR(rk, rho, n) : Math.min(1, schwanzR(rk, rho, n) + schwanzR(rk, -rho, n));
}

export const powerAnova = (f: number, k: number, gesamt: number, alpha: number) => {
  const d1 = k - 1, d2 = gesamt - k;
  return 1 - fNichtzentral(fQuantil(1 - alpha, d1, d2), d1, d2, f * f * gesamt);
};
export const powerChi2 = (w: number, df: number, gesamt: number, alpha: number) => 1 - chi2Nichtzentral(chi2Quantil(1 - alpha, df), df, w * w * gesamt);
/** Lineare Regression, R² ≠ 0 (G*Power „Fixed model, R² deviation from zero“): λ = f² · N. */
export const powerRegression = (f2: number, p: number, gesamt: number, alpha: number) => {
  const d1 = p, d2 = gesamt - p - 1;
  return 1 - fNichtzentral(fQuantil(1 - alpha, d1, d2), d1, d2, f2 * gesamt);
};

/** Gruppengrößen: unabhängig [n₁, n₂], ANOVA [n, n, …], sonst [N]. */
export function leistung(p: Plan, je: number[]): number {
  const N = je.reduce((a, b) => a + b, 0), e = p.effekt;
  switch (p.test) {
    case 'unabhaengig': return powerTUnabhaengig(e, je[0]!, je[1]!, p.alpha, p.seiten);
    case 'gepaart': return powerTGepaart(dzAus(e, p.rPaar ?? 0.5), N, p.alpha, p.seiten);
    case 'korrelation': return powerKorrelation(e, N, p.alpha, p.seiten);
    case 'anova': return powerAnova(e, p.gruppen, N, p.alpha);
    case 'chi2': return powerChi2(e, p.df, N, p.alpha);
    case 'regression': return powerRegression(e, p.praediktoren, N, p.alpha);
  }
}

/* ---------------------------------------------------------------- Suche */

/** Gruppengrößen zur Planungsgröße m: unabhängig n₁ = m und n₂ = ⌈Verhältnis · m⌉; ANOVA je Gruppe m; sonst N = m. */
export function groessen(p: Plan, m: number): number[] {
  if (p.test === 'unabhaengig') return [m, Math.ceil(p.verhaeltnis * m - 1e-9)];
  if (p.test === 'anova') return Array<number>(p.gruppen).fill(m);
  return [m];
}
/** Kleinste zulässige Planungsgröße (Freiheitsgrade ≥ 1). */
function kleinsteGroesse(p: Plan): number {
  switch (p.test) {
    case 'unabhaengig': return 2;
    case 'gepaart': return 3;
    case 'korrelation': return 4;
    case 'anova': return 2;
    case 'chi2': return 2;
    case 'regression': return p.praediktoren + 2;
  }
}
const MAX_M = 500000;

export interface Ergebnis { m: number; je: number[]; gesamt: number; power: number }
const summe = (je: number[]) => je.reduce((a, b) => a + b, 0);

/** A priori: die kleinste Stichprobe, deren Power mindestens `ziel` beträgt (aufgerundet). `null`, wenn sie über 500 000 läge. */
export function stichprobe(p: Plan, ziel: number): Ergebnis | null {
  const ok = (m: number) => leistung(p, groessen(p, m)) >= ziel;
  let lo = kleinsteGroesse(p) - 1, hi = lo + 1;
  while (!ok(hi)) { lo = hi; hi *= 2; if (hi > MAX_M) return null; }
  while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (ok(mid)) hi = mid; else lo = mid; }
  const je = groessen(p, hi);
  return { m: hi, je, gesamt: summe(je), power: leistung(p, je) };
}

/** N Personen auf Gruppen verteilen (für die Sensitivität). */
export function verteilen(p: Plan, N: number): number[] {
  if (p.test === 'unabhaengig') { const n1 = Math.round(N / (1 + p.verhaeltnis)); return [n1, N - n1]; }
  if (p.test === 'anova') { const q = Math.floor(N / p.gruppen), rest = N - q * p.gruppen; return Array.from({ length: p.gruppen }, (_, i) => q + (i < rest ? 1 : 0)); }
  return [N];
}
/** Kleinste zulässige Gesamtzahl für die Sensitivität. */
export function kleinsteGesamt(p: Plan): number {
  const m = kleinsteGroesse(p);
  return summe(groessen(p, m));
}

export const EFFEKT_MAX: Record<Test, number> = { unabhaengig: 6, gepaart: 6, korrelation: 0.99, anova: 3, chi2: 3, regression: 10 };

/** Sensitivität: der kleinste Effekt, den N Personen mit der Power `ziel` nachweisen. `null`, wenn N zu klein ist oder selbst der größte Effekt nicht reicht. */
export function kleinsterEffekt(p: Plan, N: number, ziel: number): number | null {
  if (!Number.isInteger(N) || N < kleinsteGesamt(p)) return null;
  const je = verteilen(p, N), mit = (e: number) => leistung({ ...p, effekt: e }, je);
  let lo = 1e-4, hi = EFFEKT_MAX[p.test];
  if (mit(hi) < ziel) return null;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (mit(m) < ziel) lo = m; else hi = m; }
  return hi;
}

/** Punkte für die Kurve „Power gegen N“ (gesamt auf x); reicht bis etwa das 1,6-Fache des gefundenen Umfangs. */
export function kurveN(p: Plan, erg: Ergebnis, punkte = 36): { x: number; y: number }[] {
  const m0 = kleinsteGroesse(p), m1 = Math.max(m0 + 4, Math.ceil(erg.m * 1.6));
  const ms = new Set<number>();
  for (let i = 0; i < punkte; i++) ms.add(Math.round(m0 + ((m1 - m0) * i) / (punkte - 1)));
  ms.add(erg.m);
  return [...ms].sort((a, b) => a - b).map(m => { const je = groessen(p, m); return { x: summe(je), y: leistung(p, je) }; });
}
/** Punkte für die Kurve „Power gegen Effekt“ bei festem N (Sensitivität). */
export function kurveEffekt(p: Plan, N: number, bis: number, punkte = 36): { x: number; y: number }[] {
  const je = verteilen(p, N), lo = MARKEN[p.test].min / 2;
  return Array.from({ length: punkte }, (_, i) => { const e = lo + ((bis - lo) * i) / (punkte - 1); return { x: e, y: leistung({ ...p, effekt: e }, je) }; });
}

/* ---------------------------------------------------------------- Sätze für den Methodenteil */

/** `en`: true = Englisch, false = Deutsch, wenn gerade Englisch gilt, sonst die gewählte Sprache (mitFlag). `punkt`: Dezimalpunkt erzwingen. */
export interface Fmt { en: boolean; punkt: boolean }
const zahl = (v: number, st: number, f: Fmt) => { const t = v.toFixed(st).replace('-', '−'); return f.punkt ? t : dez(t); };
/** Ohne führende Null, wie APA es für Größen verlangt, die nicht über 1 gehen (p, α, Power). */
const ohneNull = (v: number, st: number, f: Fmt) => (mitNull() ? zahl(v, st, f) : zahl(v, st, f).replace(/^(−?)0(?=[.,])/, '$1'));
export const effektText = (v: number, f: Fmt) => zahl(v, Math.abs(Math.round(v * 100) / 100 - v) < 1e-9 ? 2 : 3, f);
/** Aufrunden (Sensitivität): der angezeigte Effekt reicht sicher aus. */
export const effektAuf = (v: number) => Math.ceil(v * 100 - 1e-9) / 100;

const name = (t: Test): string => ({
  unabhaengig: L('einen t-Test für unabhängige Stichproben', 'an independent-samples t test'),
  gepaart: L('einen t-Test für gepaarte Stichproben', 'a paired-samples t test'),
  korrelation: L('eine Produkt-Moment-Korrelation (Pearson)', 'a Pearson product-moment correlation'),
  anova: L('eine einfaktorielle Varianzanalyse', 'a one-way analysis of variance'),
  chi2: L('einen Chi²-Test', 'a chi-square test'),
  regression: L('eine multiple lineare Regression', 'a multiple linear regression')
})[t];
const weg = (t: Test): string => ({
  unabhaengig: L('die nichtzentrale t-Verteilung', 'the noncentral t distribution'),
  gepaart: L('die nichtzentrale t-Verteilung', 'the noncentral t distribution'),
  korrelation: L('die exakte Verteilung von r (bivariates Normalmodell)', 'the exact distribution of r (bivariate normal model)'),
  anova: L('die nichtzentrale F-Verteilung', 'the noncentral F distribution'),
  chi2: L('die nichtzentrale χ²-Verteilung', 'the noncentral χ² distribution'),
  regression: L('die nichtzentrale F-Verteilung', 'the noncentral F distribution')
})[t];
const SYMBOL_TEXT: Record<Test, string> = { unabhaengig: 'd', gepaart: 'd', korrelation: 'r', anova: 'f', chi2: 'w', regression: 'f²' };

/** Die Angaben in Klammern: Effekt, α, Power, Seitigkeit, ggf. k / df / Prädiktoren. */
function angaben(p: Plan, ziel: number, f: Fmt, mitEffekt: boolean, gesamt?: number): string {
  const teile: string[] = [];
  const stellen = Math.abs(Math.round(p.effekt * 100) / 100 - p.effekt) < 1e-9 ? 2 : 3;
  if (gesamt !== undefined) teile.push(`N = ${gz(gesamt)}`);
  // Sprache: APA schreibt r im Englischen ohne führende Null; Deutsch (und alle anderen Sprachen vorerst) mit - Fachperson klärt je Sprache
  if (mitEffekt) teile.push(`${SYMBOL_TEXT[p.test]} = ${aktuelleSprache() === 'en' && p.test === 'korrelation' ? ohneNull(p.effekt, stellen, f) : effektText(p.effekt, f)}`);
  // F4: beim gepaarten t-Test die erwartete Korrelation und das d_z, mit dem gerechnet wird (A priori: hinter d; Sensitivität: r hier, d_z am Ergebnis)
  if (p.test === 'gepaart') teile.push(L(`erwartete Korrelation vorher-nachher r = ${ohneNull(p.rPaar, 2, f)}`, `expected before-after correlation r = ${ohneNull(p.rPaar, 2, f)}`)
    + (mitEffekt ? L(`, also dz = ${zahl(dzAus(p.effekt, p.rPaar), 2, f)}`, `, hence dz = ${zahl(dzAus(p.effekt, p.rPaar), 2, f)}`) : ''));
  teile.push(`α = ${ohneNull(p.alpha, p.alpha < 0.01 ? 3 : 2, f)}`, `1 − β = ${ohneNull(ziel, 2, f)}`);
  if (p.test === 'anova') teile.push(Lp(p.gruppen, `${p.gruppen} Gruppe`, `${p.gruppen} Gruppen`, `${p.gruppen} group`, `${p.gruppen} groups`));
  if (p.test === 'chi2') teile.push(`df = ${p.df}`);
  if (p.test === 'regression') teile.push(Lp(p.praediktoren, `${p.praediktoren} Prädiktor`, `${p.praediktoren} Prädiktoren`, `${p.praediktoren} predictor`, `${p.praediktoren} predictors`));
  if (hatSeiten(p.test)) teile.push(p.seiten === 2 ? L('zweiseitig', 'two-tailed') : L('einseitig', 'one-tailed'));
  if (p.test === 'unabhaengig' && p.verhaeltnis !== 1) { const v = zahl(p.verhaeltnis, Math.abs(p.verhaeltnis - Math.round(p.verhaeltnis)) < 1e-9 ? 0 : 2, f); teile.push(L(`Gruppenverhältnis 1 : ${v}`, `allocation ratio 1:${v}`)); }
  return teile.join(', ');
}

/** Satz für den Methodenteil (A priori). */
export function satzAPriori(p: Plan, ziel: number, erg: Ergebnis, f: Fmt): string {
  return mitFlag(f.en, () => {
    let ueber: string;
    if (p.test === 'unabhaengig') ueber = erg.je[0] === erg.je[1] ? L(` (${erg.je[0]} je Gruppe)`, ` (${erg.je[0]} per group)`) : L(` (${erg.je[0]} und ${erg.je[1]})`, ` (${erg.je[0]} and ${erg.je[1]})`);
    else if (p.test === 'anova') ueber = L(` (${erg.m} je Gruppe)`, ` (${erg.m} per group)`);
    else ueber = '';
    const test = name(p.test), verteilung = weg(p.test), ang = angaben(p, ziel, f, true);
    return L(`Eine A-priori-Poweranalyse für ${test} (${ang}) ergab einen Stichprobenumfang von N = ${gz(erg.gesamt)}${ueber}. Die Berechnung erfolgte in Statable über ${verteilung}, im Rechenweg wie G*Power.`,
      `An a priori power analysis for ${test} (${ang}) yielded a required sample size of N = ${gz(erg.gesamt)}${ueber}. It was computed in Statable using ${verteilung}, following the procedure of G*Power.`);
  });
}

/** Satz für den Methodenteil (Sensitivität). */
export function satzSensitivitaet(p: Plan, ziel: number, N: number, effekt: number, f: Fmt): string {
  return mitFlag(f.en, () => {
    const test = name(p.test), verteilung = weg(p.test), sym = SYMBOL_TEXT[p.test], ang = angaben(p, ziel, f, false, N), ef = effektText(effekt, f);
    const dz = p.test === 'gepaart' ? ` (dz = ${zahl(dzAus(effekt, p.rPaar), 2, f)})` : '';
    return L(`Eine Sensitivitätsanalyse für ${test} (${ang}) ergab, dass sich Effekte ab ${sym} = ${ef}${dz} nachweisen lassen. Die Berechnung erfolgte in Statable über ${verteilung}, im Rechenweg wie G*Power.`,
      `A sensitivity analysis for ${test} (${ang}) showed that effects of ${sym} ≥ ${ef}${dz} can be detected. It was computed in Statable using ${verteilung}, following the procedure of G*Power.`);
  });
}

/** Eingabe mit Dezimalkomma oder -punkt lesen; `NaN`, wenn keine Zahl. */
export function leseZahl(t: string): number {
  const x = t.trim().replace(/\s/g, '').replace(',', '.').replace('−', '-');
  return /^-?\d*\.?\d+$|^-?\d+\.$/.test(x) ? Number(x) : NaN;
}

/* =====================================================================================================================================================
 * Später, Welle S-D, M9: Fallzahl für Anteile, Überleben (Log-Rank) und AUC.
 * Fachblatt docs/fachblaetter/SPAETER-D-PSYCHOLOGIE-MIXED-RECHNER.md, Abschnitt 5 und „Entscheidungen Opus“ 5. Keine Daten, kein Post-hoc: die Seite fragt nach dem ERWARTETEN Effekt.
 * Immer aufrunden auf ganze Personen (nie runden); die Seite zeigt die erreichte Power zur aufgerundeten Zahl.
 * Zwei Anteile: die Zahl hängt vom späteren Test ab (Pearson-χ² ohne Korrektur = gepoolt, Yates = Stetigkeitskorrektur nach Fleiss-Tytun-Ury, Fisher exakt durch Aufzählung bis n = 400,
 * Cohens h wie `pwr.2p.test`). Fisher: Die Power steigt nicht streng mit n (Sägezahn); `n1` ist das DAUERHAFTE n, `erstes` das erste n mit Power ≥ Ziel.
 * Log-Rank: Schoenfeld (Voreinstellung), Freedman als Gegenprobe; die Ereignisse sind die Größe, dann Personen über die Ereigniswahrscheinlichkeit (proportionale Hazards).
 * AUC: Hanley-McNeil (Voreinstellung) und Obuchowski (= pROC::power.roc.test); beides Näherungen. Geprüft gegen R (power.prop.test, pwr, pROC, Aufzählung): power-spaeter-d.test.ts.
 * ===================================================================================================================================================== */

const zq = (alpha: number, seiten: 1 | 2) => qnorm(1 - alpha / seiten);
const auf = (x: number) => Math.ceil(x - 1e-9);

/** ln n! als wachsende Tabelle (Summe der Logarithmen). */
const lfTab: number[] = [0];
function lf(n: number): number { for (let k = lfTab.length; k <= n; k++) lfTab.push(lfTab[k - 1]! + Math.log(k)); return lfTab[n]!; }
/** Binomial-Wahrscheinlichkeiten P(X = x), x = 0 … n. */
function binVerteilung(n: number, p: number): Float64Array {
  const a = new Float64Array(n + 1), lp = Math.log(p), lq = Math.log(1 - p);
  for (let x = 0; x <= n; x++) a[x] = Math.exp(lf(n) - lf(x) - lf(n - x) + x * lp + (n - x) * lq);
  return a;
}
const WINZIG = 1e-18;

export type AnteilTest = 'pearson' | 'yates' | 'fisher';

/**
 * Power zweier Anteile durch Aufzählung aller Tafeln (x1, x2): P = Σ Bin(x1; n1, p1) · Bin(x2; n2, p2) über die Tafeln, bei denen der Test p ≤ α ergibt.
 * Pearson und Yates nur für Tafeln mit zwei von null verschiedenen Spaltensummen; Fisher zweiseitig wie R `fisher.test` (Tafeln mit p ≤ den beobachteten · (1 + 1e-7)).
 * Einseitig gilt die Richtung von p1 gegen p2.
 */
export function powerZweiAnteile(p1: number, p2: number, n1: number, n2: number, o: { alpha?: number; seiten?: 1 | 2; test: AnteilTest }): number {
  const alpha = o.alpha ?? 0.05, seiten = o.seiten ?? 2, N = n1 + n2, richt = p2 >= p1 ? 1 : -1;
  const b1 = binVerteilung(n1, p1), b2 = binVerteilung(n2, p2), zc = zq(alpha, seiten);
  let summe = 0;
  if (o.test === 'fisher') {
    const cache = new Map<number, Uint8Array>();
    const ablehnen = (s: number): Uint8Array => {
      let r = cache.get(s); if (r) return r;
      const lo = Math.max(0, s - n2), hi = Math.min(n1, s), m = hi - lo + 1, pm = new Float64Array(m);
      for (let i = 0; i < m; i++) { const x = lo + i; pm[i] = Math.exp(lf(n1) - lf(x) - lf(n1 - x) + lf(n2) - lf(s - x) - lf(n2 - s + x) - (lf(N) - lf(s) - lf(N - s))); }
      r = new Uint8Array(m);
      if (seiten === 2) {
        const ord = Array.from({ length: m }, (_, i) => i).sort((a, b) => pm[a]! - pm[b]!), kum = new Float64Array(m);
        let acc = 0; for (let i = 0; i < m; i++) { acc += pm[ord[i]!]!; kum[i] = acc; }
        let j = 0;
        for (let i = 0; i < m; i++) { const d = pm[ord[i]!]! * (1 + 1e-7); if (j < i) j = i; while (j + 1 < m && pm[ord[j + 1]!]! <= d) j++; if (kum[j]! <= alpha) r[ord[i]!] = 1; }
      } else if (richt > 0) { let acc = 0; for (let i = 0; i < m; i++) { acc += pm[i]!; if (acc <= alpha) r[i] = 1; } }   // p1 < p2: wenig in Gruppe 1, unterer Schwanz
      else { let acc = 0; for (let i = m - 1; i >= 0; i--) { acc += pm[i]!; if (acc <= alpha) r[i] = 1; } }
      cache.set(s, r); return r;
    };
    for (let x1 = 0; x1 <= n1; x1++) {
      if (b1[x1]! < WINZIG) continue;
      for (let x2 = 0; x2 <= n2; x2++) {
        const w = b1[x1]! * b2[x2]!; if (w < WINZIG) continue;
        const s = x1 + x2, lo = Math.max(0, s - n2);
        if (ablehnen(s)[x1 - lo]) summe += w;
      }
    }
    return Math.min(1, summe);
  }
  const korr = o.test === 'yates' ? 0.5 * (1 / n1 + 1 / n2) : 0;
  for (let x1 = 0; x1 <= n1; x1++) {
    if (b1[x1]! < WINZIG) continue;
    for (let x2 = 0; x2 <= n2; x2++) {
      const w = b1[x1]! * b2[x2]!; if (w < WINZIG) continue;
      const s = x1 + x2; if (s === 0 || s === N) continue;
      const pb = s / N, se = Math.sqrt(pb * (1 - pb) * (1 / n1 + 1 / n2)), diff = x2 / n2 - x1 / n1, z = Math.max(0, Math.abs(diff) - korr) / se;
      if (seiten === 2 ? z >= zc - 1e-12 : richt * diff > 0 && z >= zc - 1e-12) summe += w;
    }
  }
  return Math.min(1, summe);
}

export type AnteilVerfahren = 'gepoolt' | 'korrigiert' | 'ungepoolt' | 'h' | 'fisher';
export interface AnteilOpt { alpha?: number; power?: number; seiten?: 1 | 2; /** n2 / n1 */ k?: number; verfahren?: AnteilVerfahren }
export interface AnteilErg { exakt: number | null; n1: number; n2: number; gesamt: number; erreicht: number | null; erstes?: number }
/** Höchstes n je Gruppe für die Fisher-Aufzählung. */
export const FISHER_MAX = 400;

/** Formelwert (vor dem Aufrunden) für n1; `k` = n2 / n1. */
function nAnteileFormel(p1: number, p2: number, v: Exclude<AnteilVerfahren, 'fisher'>, alpha: number, power: number, seiten: 1 | 2, k: number): number {
  const z1 = zq(alpha, seiten), z2 = qnorm(power), q1 = 1 - p1, q2 = 1 - p2, dp = p1 - p2;
  const gepoolt = () => { const pk = (p1 + k * p2) / (k + 1); return (z1 * Math.sqrt((k + 1) * pk * (1 - pk)) + z2 * Math.sqrt(k * p1 * q1 + p2 * q2)) ** 2 / (k * dp * dp); };
  switch (v) {
    case 'gepoolt': return gepoolt();
    // Stetigkeitskorrektur (Fleiss, Tytun & Ury 1980): n' = n/4 · [1 + √(1 + (k + 1)/(k · n · |Δ|))]²; bei k = 1 gleich 2/(n · |Δ|)
    case 'korrigiert': { const na = gepoolt(); return (na / 4) * (1 + Math.sqrt(1 + (k + 1) / (k * na * Math.abs(dp)))) ** 2; }
    case 'ungepoolt': return (z1 + z2) ** 2 * (p1 * q1 + (p2 * q2) / k) / (dp * dp);
    case 'h': { const h = 2 * Math.asin(Math.sqrt(p2)) - 2 * Math.asin(Math.sqrt(p1)); return ((z1 + z2) / h) ** 2 * (1 + 1 / k); }
  }
}

/** Die Fisher-Suche als Schrittfolge: `yield n` nach jeder Power-Rechnung (für Fortschritt und Abbruch); Ergebnis: erstes und dauerhaftes n. */
function* fisherSucheGen(p1: number, p2: number, alpha: number, power: number, seiten: 1 | 2, k: number): Generator<number, { erstes: number; dauerhaft: number; power: number }> {
  const start = Math.max(2, Math.floor(0.5 * nAnteileFormel(p1, p2, 'gepoolt', alpha, power, seiten, k)) - 1);
  let erstes = 0, kandidat = 0, lauf = 0, pw = 0;
  for (let n = start; n <= FISHER_MAX; n++) {
    const n2 = Math.max(1, auf(k * n)), p = powerZweiAnteile(p1, p2, n, n2, { alpha, seiten, test: 'fisher' });
    if (p >= power) { if (!kandidat) { kandidat = n; pw = p; } if (!erstes) erstes = n; lauf++; if (lauf > 30) return { erstes, dauerhaft: kandidat, power: pw }; } else { kandidat = 0; lauf = 0; }
    yield n;
  }
  if (kandidat && erstes) return { erstes, dauerhaft: kandidat, power: pw };
  throw new Error(d(`Die Rechnung für Fishers exakten Test geht nur bis ${FISHER_MAX} Personen je Gruppe. Nimm die Normalnäherung oder einen größeren Unterschied.`, `Die Rechnung für Fishers exakten Test geht nur bis ${FISHER_MAX} Personen je Gruppe. Nehmen Sie die Normalnäherung oder einen größeren Unterschied.`, `The calculation for Fisher's exact test goes only up to ${FISHER_MAX} people per group. Use the normal approximation or a larger difference.`));
}
const fisherErg = (o: { k: number }, r: { erstes: number; dauerhaft: number; power: number }): AnteilErg => {
  const n2 = Math.max(1, auf(o.k * r.dauerhaft));
  return { exakt: null, n1: r.dauerhaft, n2, gesamt: r.dauerhaft + n2, erreicht: r.power, erstes: r.erstes };
};

/** Personen je Gruppe für zwei Anteile (bei gleich großen Gruppen; `k` = n2 / n1). */
export function nZweiAnteile(p1: number, p2: number, o: AnteilOpt = {}): AnteilErg {
  const alpha = o.alpha ?? 0.05, power = o.power ?? 0.8, seiten = o.seiten ?? 2, k = o.k ?? 1, v = o.verfahren ?? 'gepoolt';
  if (v === 'fisher') { const g = fisherSucheGen(p1, p2, alpha, power, seiten, k); let r = g.next(); while (!r.done) r = g.next(); return fisherErg({ k }, r.value); }
  const exakt = nAnteileFormel(p1, p2, v, alpha, power, seiten, k), n1 = auf(exakt), n2 = Math.max(1, auf(k * n1));
  const erreicht = v === 'gepoolt' ? powerZweiAnteile(p1, p2, n1, n2, { alpha, seiten, test: 'pearson' }) : v === 'korrigiert' ? powerZweiAnteile(p1, p2, n1, n2, { alpha, seiten, test: 'yates' }) : null;
  return { exakt, n1, n2, gesamt: n1 + n2, erreicht };
}
/** Wie `nZweiAnteile` für Fisher, aber in Häppchen für die Oberfläche: Fortschritt (0 bis 1) und Abbruch (`abbruch()` wahr ⇒ `null`); gibt die Hand an die Oberfläche zurück, sobald ~40 ms vergangen sind. */
export async function nZweiAnteileFisherAsync(p1: number, p2: number, o: AnteilOpt = {}, fortschritt?: (anteil: number) => void, abbruch?: () => boolean): Promise<AnteilErg | null> {
  const alpha = o.alpha ?? 0.05, power = o.power ?? 0.8, seiten = o.seiten ?? 2, k = o.k ?? 1, g = fisherSucheGen(p1, p2, alpha, power, seiten, k);
  let t0 = performance.now(); const schaetz = Math.max(20, auf(nAnteileFormel(p1, p2, 'gepoolt', alpha, power, seiten, k)) * 1.3);
  for (;;) {
    const r = g.next();
    if (r.done) return fisherErg({ k }, r.value);
    if (performance.now() - t0 > 40) { if (abbruch?.()) return null; fortschritt?.(Math.min(0.97, r.value / schaetz)); await new Promise(res => setTimeout(res, 0)); t0 = performance.now(); }
  }
}

/* ---------------------------------------------------------------- Ein Anteil */

/** P(X = x) einer Binomialverteilung als Feld; Binomialtest zweiseitig wie R `binom.test` (Minimum-Likelihood, relErr 1e-7), einseitig in Richtung von p1 gegen p0. */
function binomAblehnung(p0: number, n: number, alpha: number, seiten: 1 | 2, richt: 1 | -1): Uint8Array {
  const d = binVerteilung(n, p0), r = new Uint8Array(n + 1);
  if (seiten === 2) {
    const ord = Array.from({ length: n + 1 }, (_, i) => i).sort((a, b) => d[a]! - d[b]!), kum = new Float64Array(n + 1);
    let acc = 0; for (let i = 0; i <= n; i++) { acc += d[ord[i]!]!; kum[i] = acc; }
    let j = 0;
    for (let i = 0; i <= n; i++) { const g = d[ord[i]!]! * (1 + 1e-7); if (j < i) j = i; while (j + 1 <= n && d[ord[j + 1]!]! <= g) j++; if (kum[j]! <= alpha) r[ord[i]!] = 1; }
  } else if (richt > 0) { let acc = 0; for (let x = n; x >= 0; x--) { acc += d[x]!; if (acc <= alpha) r[x] = 1; } }
  else { let acc = 0; for (let x = 0; x <= n; x++) { acc += d[x]!; if (acc <= alpha) r[x] = 1; } }
  return r;
}
/** Power des exakten Binomialtests (H0: p0) bei wahrem Anteil p1 und n Personen. */
export function powerEinAnteilExakt(p0: number, p1: number, n: number, alpha = 0.05, seiten: 1 | 2 = 2): number {
  const r = binomAblehnung(p0, n, alpha, seiten, p1 >= p0 ? 1 : -1), d = binVerteilung(n, p1);
  let summe = 0; for (let x = 0; x <= n; x++) if (r[x]) summe += d[x]!;
  return Math.min(1, summe);
}
export interface EinAnteilErg { exakt: number | null; n: number; erstes?: number }
const EIN_MAX = 5000;
/** Personen für einen Anteil gegen einen Sollwert p0: Normalnäherung, Cohens h oder exakt (dauerhaftes n wegen des Sägezahns; `erstes` = erstes n mit Power ≥ Ziel). */
export function nEinAnteil(p0: number, p1: number, o: { alpha?: number; power?: number; seiten?: 1 | 2; verfahren?: 'normal' | 'h' | 'exakt' } = {}): EinAnteilErg {
  const alpha = o.alpha ?? 0.05, power = o.power ?? 0.8, seiten = o.seiten ?? 2, v = o.verfahren ?? 'normal', z1 = zq(alpha, seiten), z2 = qnorm(power);
  const normal_ = ((z1 * Math.sqrt(p0 * (1 - p0)) + z2 * Math.sqrt(p1 * (1 - p1))) ** 2) / ((p1 - p0) ** 2);
  if (v === 'normal') return { exakt: normal_, n: auf(normal_) };
  if (v === 'h') { const h = 2 * Math.asin(Math.sqrt(p1)) - 2 * Math.asin(Math.sqrt(p0)); const e = ((z1 + z2) / h) ** 2; return { exakt: e, n: auf(e) }; }
  let erstes = 0, kandidat = 0, lauf = 0;
  for (let n = Math.max(2, Math.floor(0.5 * normal_) - 1); n <= EIN_MAX; n++) {
    if (powerEinAnteilExakt(p0, p1, n, alpha, seiten) >= power) { if (!kandidat) kandidat = n; if (!erstes) erstes = n; lauf++; if (lauf > 30) return { exakt: null, n: kandidat, erstes }; } else { kandidat = 0; lauf = 0; }
  }
  if (kandidat && erstes) return { exakt: null, n: kandidat, erstes };
  throw new Error(d('Der exakte Test braucht hier mehr als 5000 Personen. Nimm die Normalnäherung.', 'Der exakte Test braucht hier mehr als 5000 Personen. Nehmen Sie die Normalnäherung.', 'The exact test needs more than 5000 people here. Use the normal approximation.'));
}

/* ---------------------------------------------------------------- Log-Rank */

/** Ereignisse für den Log-Rank-Test. `k` = Personen im Behandlungsarm je Person im Kontrollarm (n_B / n_K). Schoenfeld: (z₁ + z₂)² / (π_K · π_B · ln² HR); Freedman: (z₁ + z₂)² (1 + k · HR)² / (k (1 − HR)²). */
export function ereignisseLogRank(hr: number, o: { alpha?: number; power?: number; seiten?: 1 | 2; k?: number; formel?: 'schoenfeld' | 'freedman' } = {}): { exakt: number; d: number } {
  const alpha = o.alpha ?? 0.05, power = o.power ?? 0.8, seiten = o.seiten ?? 2, k = o.k ?? 1, zz = (zq(alpha, seiten) + qnorm(power)) ** 2;
  const exakt = (o.formel ?? 'schoenfeld') === 'freedman' ? (zz * (1 + k * hr) ** 2) / (k * (1 - hr) ** 2) : zz / ((1 / (1 + k)) * (k / (1 + k)) * Math.log(hr) ** 2);
  return { exakt, d: auf(exakt) };
}
/** Von Ereignissen zu Personen: feste Nachbeobachtungszeit, keine Verluste, proportionale Hazards. S_B = S_K^HR; P = 1 − (π_K · S_K + π_B · S_B); N = d / P, aufgerundet. */
export function personenLogRank(d: number, sK: number, hr: number, k = 1): { sB: number; P: number; N: number; nExakt: number } {
  const sB = sK ** hr, P = 1 - (sK / (1 + k) + (k * sB) / (1 + k)), nExakt = d / P;
  return { sB, P, N: auf(nExakt), nExakt };
}
/** HR aus zwei Medianen der Überlebenszeit (exponentiell): Median_K / Median_B. */
export const hrAusMedianen = (medianK: number, medianB: number) => medianK / medianB;
/** HR aus zwei Überlebensanteilen zum selben Zeitpunkt: ln S_B / ln S_K. */
export const hrAusUeberleben = (sK: number, sB: number) => Math.log(sB) / Math.log(sK);

/* ---------------------------------------------------------------- AUC */

/** Hanley-McNeil (1982): Var(A) = [A(1 − A) + (n_A − 1)(Q₁ − A²) + (n_N − 1)(Q₂ − A²)] / (n_A · n_N). */
export function hmVarianz(A: number, nA: number, nN: number): number {
  const q1 = A / (2 - A), q2 = (2 * A * A) / (1 + A);
  return (A * (1 - A) + (nA - 1) * (q1 - A * A) + (nN - 1) * (q2 - A * A)) / (nA * nN);
}
/** Obuchowski (1994): Var(A) · n_A = 0,0099 · e^(−a²/2) · [(5a² + 8) + (a² + 8)/R], a = Φ⁻¹(A) · 1,414, R = n_N / n_A. */
export function obuchowskiV(A: number, R: number): number {
  const a = qnorm(A) * 1.414;
  return 0.0099 * Math.exp((-a * a) / 2) * ((5 * a * a + 8) + (a * a + 8) / R);
}
export interface AucOpt { auc0?: number; alpha?: number; power?: number; /** Kontrollen je Fall */ R?: number; verfahren?: 'hm' | 'obuchowski' }
/** Personen für den Test AUC₁ gegen AUC₀: z₁ · SE₀ + z₂ · SE₁ = AUC₁ − AUC₀ (zweiseitig; Nullstellensuche, weil SE von n_A abhängt). */
export function nAuc(auc1: number, o: AucOpt = {}): { nA: number; nN: number; nCases: number; nControls: number } {
  const A0 = o.auc0 ?? 0.5, alpha = o.alpha ?? 0.05, power = o.power ?? 0.8, R = o.R ?? 1, v = o.verfahren ?? 'hm', zz1 = zq(alpha, 2), zz2 = qnorm(power);
  const se = (A: number, nA: number) => (v === 'hm' ? Math.sqrt(hmVarianz(A, nA, R * nA)) : Math.sqrt(obuchowskiV(A, R) / nA));
  const f = (nA: number) => zz1 * se(A0, nA) + zz2 * se(auc1, nA) - (auc1 - A0);
  let lo = 1 + 1e-9, hi = 4;
  while (f(hi) > 0 && hi < 1e12) { lo = hi; hi *= 2; }
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
  const nA = (lo + hi) / 2, nN = R * nA;
  return { nA, nN, nCases: auf(nA), nControls: auf(nN) };
}
/** Mit dem Anteil der Kranken π: R = (1 − π)/π; Gesamtzahl N = n_A / π, aufgerundet. */
export function nAucGesamt(auc1: number, praevalenz: number, o: AucOpt = {}): { R: number; nCases: number; nControls: number; N: number } {
  const R = (1 - praevalenz) / praevalenz, r = nAuc(auc1, { ...o, R });
  return { R, nCases: r.nCases, nControls: r.nControls, N: auf(r.nA / praevalenz) };
}
/** Ausfallzuschlag: n / (1 − Ausfall), aufgerundet. */
export const ausfallZuschlag = (n: number, ausfall: number): number => auf(n / (1 - ausfall));

/* ---------------------------------------------------------------- Eingaben prüfen */

export type PlanFehler = 'gleich' | 'rand' | 'hr' | 'auc';
export type PlanHinweis = 'normalnaeherung' | 'gross' | 'sehr-gross' | 'auc-klein';
type PlanEingabe = { art: 'anteile'; p1: number; p2: number; n?: number; alpha?: number; power?: number; gesamt?: number } | { art: 'ueberleben'; hr: number; alpha?: number; power?: number; gesamt?: number }
  | { art: 'auc'; auc1: number; auc0?: number; nCases?: number; alpha?: number; power?: number; gesamt?: number };
/** Fehlercode (die Rechnung bleibt aus) und Hinweise. Anteile in (0; 1) und verschieden; HR > 0 und ≠ 1; AUC₁ > AUC₀ ≥ ,5; Normalnäherung nur, wenn n·p und n·q ≥ 5 sind. */
export function planPruefung(p: PlanEingabe): { fehler: PlanFehler | null; hinweise: PlanHinweis[] } {
  const hinweise: PlanHinweis[] = [];
  const gross = () => { if ((p.power ?? 0) >= 0.99 || (p.alpha ?? 1) <= 0.001) hinweise.push('gross'); if ((p.gesamt ?? 0) > 1_000_000) hinweise.push('sehr-gross'); };
  if (p.art === 'anteile') {
    if (![p.p1, p.p2].every(x => Number.isFinite(x) && x > 0 && x < 1)) return { fehler: 'rand', hinweise };
    if (p.p1 === p.p2) return { fehler: 'gleich', hinweise };
    if (p.n !== undefined && [p.p1, p.p2].some(x => p.n! * x < 5 || p.n! * (1 - x) < 5)) hinweise.push('normalnaeherung');
    gross(); return { fehler: null, hinweise };
  }
  if (p.art === 'ueberleben') {
    if (!Number.isFinite(p.hr) || p.hr <= 0 || p.hr === 1) return { fehler: 'hr', hinweise };
    gross(); return { fehler: null, hinweise };
  }
  const a0 = p.auc0 ?? 0.5;
  if (!Number.isFinite(p.auc1) || !Number.isFinite(a0) || a0 < 0.5 || p.auc1 <= a0 || p.auc1 >= 1) return { fehler: 'auc', hinweise };
  if (p.nCases !== undefined && p.nCases < 10) hinweise.push('auc-klein');
  gross(); return { fehler: null, hinweise };
}

/* ---------------------------------------------------------------- Sätze (Fachblatt 5.6) */

export interface PlanSatzOpt { alpha?: number; power?: number; seiten?: 1 | 2; k?: number; verfahren?: AnteilVerfahren; ausfall?: number;
  /** n je Gruppe für Fisher, schon gerechnet (null: Satz weglassen); fehlt: wird gerechnet */ fisherN?: number | null;
  /** das schon gerechnete Ergebnis dieses Tests (spart die Rechnung, bei Fisher die Aufzählung) */ ergebnis?: AnteilErg }
const proz0 = (v: number, f: Fmt) => proz(zahl(v * 100, 0, f));

/** Satz für den Methodenteil: zwei Anteile. */
export function satzAnteile(p1: number, p2: number, o: PlanSatzOpt, f: Fmt): string {
  return mitFlag(f.en, () => {
    const alpha = o.alpha ?? 0.05, power = o.power ?? 0.8, seiten = o.seiten ?? 2, k = o.k ?? 1, v = o.verfahren ?? 'gepoolt';
    const r = o.ergebnis ?? nZweiAnteile(p1, p2, { alpha, power, seiten, k, verfahren: v });
    const a = ohneNull(alpha, alpha < 0.01 ? 3 : 2, f), P = proz0(power, f), A = ohneNull(p1, 2, f), B = ohneNull(p2, 2, f);
    const gleich = r.n1 === r.n2, n1 = gz(r.n1), n2 = gz(r.n2), ges = gz(r.gesamt), hW = zahl(2 * Math.asin(Math.sqrt(p2)) - 2 * Math.asin(Math.sqrt(p1)), 2, f);
    // Ganze Sätze je Fall: Test und Gruppengrößen stehen fest im Satz, nie als eingesetztes Wort.
    let satz: string;
    switch (v) {
      case 'korrigiert': satz = gleich
        ? L(`Um einen Unterschied von ${A} gegen ${B} mit einem χ²-Test mit Stetigkeitskorrektur mit ${P} Power nachzuweisen, braucht es ${n1} Personen je Gruppe (${ges} insgesamt).`, `To detect a difference of ${A} versus ${B} with a chi-square test with continuity correction with ${P} power, ${n1} people per group are needed (${ges} in total).`)
        : L(`Um einen Unterschied von ${A} gegen ${B} mit einem χ²-Test mit Stetigkeitskorrektur mit ${P} Power nachzuweisen, braucht es ${n1} Personen in der ersten und ${n2} in der zweiten Gruppe (${ges} insgesamt).`, `To detect a difference of ${A} versus ${B} with a chi-square test with continuity correction with ${P} power, ${n1} people are needed in the first and ${n2} in the second group (${ges} in total).`); break;
      case 'fisher': satz = gleich
        ? L(`Um einen Unterschied von ${A} gegen ${B} mit Fishers exaktem Test mit ${P} Power nachzuweisen, braucht es ${n1} Personen je Gruppe (${ges} insgesamt).`, `To detect a difference of ${A} versus ${B} with Fisher's exact test with ${P} power, ${n1} people per group are needed (${ges} in total).`)
        : L(`Um einen Unterschied von ${A} gegen ${B} mit Fishers exaktem Test mit ${P} Power nachzuweisen, braucht es ${n1} Personen in der ersten und ${n2} in der zweiten Gruppe (${ges} insgesamt).`, `To detect a difference of ${A} versus ${B} with Fisher's exact test with ${P} power, ${n1} people are needed in the first and ${n2} in the second group (${ges} in total).`); break;
      case 'ungepoolt': satz = gleich
        ? L(`Um einen Unterschied von ${A} gegen ${B} mit einem z-Test mit getrennten Varianzen mit ${P} Power nachzuweisen, braucht es ${n1} Personen je Gruppe (${ges} insgesamt).`, `To detect a difference of ${A} versus ${B} with a z test with unpooled variances with ${P} power, ${n1} people per group are needed (${ges} in total).`)
        : L(`Um einen Unterschied von ${A} gegen ${B} mit einem z-Test mit getrennten Varianzen mit ${P} Power nachzuweisen, braucht es ${n1} Personen in der ersten und ${n2} in der zweiten Gruppe (${ges} insgesamt).`, `To detect a difference of ${A} versus ${B} with a z test with unpooled variances with ${P} power, ${n1} people are needed in the first and ${n2} in the second group (${ges} in total).`); break;
      case 'h': satz = gleich
        ? L(`Um einen Unterschied von ${A} gegen ${B} (Cohens h = ${hW}) mit ${P} Power nachzuweisen, braucht es ${n1} Personen je Gruppe (${ges} insgesamt).`, `To detect a difference of ${A} versus ${B} (Cohen's h = ${hW}) with ${P} power, ${n1} people per group are needed (${ges} in total).`)
        : L(`Um einen Unterschied von ${A} gegen ${B} (Cohens h = ${hW}) mit ${P} Power nachzuweisen, braucht es ${n1} Personen in der ersten und ${n2} in der zweiten Gruppe (${ges} insgesamt).`, `To detect a difference of ${A} versus ${B} (Cohen's h = ${hW}) with ${P} power, ${n1} people are needed in the first and ${n2} in the second group (${ges} in total).`); break;
      default: satz = gleich
        ? L(`Um einen Unterschied von ${A} gegen ${B} mit einem χ²-Test mit ${P} Power nachzuweisen, braucht es ${n1} Personen je Gruppe (${ges} insgesamt).`, `To detect a difference of ${A} versus ${B} with a chi-square test with ${P} power, ${n1} people per group are needed (${ges} in total).`)
        : L(`Um einen Unterschied von ${A} gegen ${B} mit einem χ²-Test mit ${P} Power nachzuweisen, braucht es ${n1} Personen in der ersten und ${n2} in der zweiten Gruppe (${ges} insgesamt).`, `To detect a difference of ${A} versus ${B} with a chi-square test with ${P} power, ${n1} people are needed in the first and ${n2} in the second group (${ges} in total).`);
    }
    satz += ' ' + (seiten === 2 ? L(`Der Test ist zweiseitig, das Signifikanzniveau α = ${a}.`, `The test is two-tailed, the significance level α = ${a}.`) : L(`Der Test ist einseitig, das Signifikanzniveau α = ${a}.`, `The test is one-tailed, the significance level α = ${a}.`));
    if (v !== 'fisher' && v !== 'h' && v !== 'ungepoolt' && gleich && o.fisherN !== null) {
      let fn: number | null | undefined = o.fisherN;
      if (fn === undefined) { try { fn = nZweiAnteile(p1, p2, { alpha, power, seiten, k, verfahren: 'fisher' }).n1; } catch { fn = null; } }
      if (fn) satz += ' ' + L(`Mit Fishers exaktem Test sind es ${gz(fn)} je Gruppe.`, `With Fisher's exact test it is ${gz(fn)} per group.`);
    }
    if (o.ausfall && o.ausfall > 0) { const z1 = ausfallZuschlag(r.n1, o.ausfall), z2 = ausfallZuschlag(r.n2, o.ausfall); satz += ' ' + (gleich ? L(`Bei ${proz0(o.ausfall, f)} Ausfällen sind es ${gz(z1)} Personen je Gruppe (${gz(z1 + z2)} insgesamt).`, `With ${proz0(o.ausfall, f)} dropout it is ${gz(z1)} people per group (${gz(z1 + z2)} in total).`) : L(`Bei ${proz0(o.ausfall, f)} Ausfällen sind es ${gz(z1)} Personen in der ersten und ${gz(z2)} in der zweiten Gruppe (${gz(z1 + z2)} insgesamt).`, `With ${proz0(o.ausfall, f)} dropout it is ${gz(z1)} people in the first and ${gz(z2)} in the second group (${gz(z1 + z2)} in total).`)); }
    return satz;
  });
}

/** Satz für den Methodenteil: Log-Rank (Ereignisse nach Schoenfeld, Freedman als Gegenprobe; Personen über den Überlebensanteil im Kontrollarm). */
export function satzLogRank(hr: number, sK: number, o: PlanSatzOpt, f: Fmt): string {
  return mitFlag(f.en, () => {
    const alpha = o.alpha ?? 0.05, power = o.power ?? 0.8, seiten = o.seiten ?? 2, k = o.k ?? 1;
    const a = ereignisseLogRank(hr, { alpha, power, seiten, k }), fr = ereignisseLogRank(hr, { alpha, power, seiten, k, formel: 'freedman' }), pers = personenLogRank(a.d, sK, hr, k);
    const A = ohneNull(alpha, alpha < 0.01 ? 3 : 2, f), P = proz0(power, f), H = ohneNull(hr, 2, f), S = proz0(sK, f), dd = gz(a.d), df = gz(fr.d), pn = gz(pers.N);
    let satz = L(`Um mit dem Log-Rank-Test bei einem Hazard Ratio von ${H} mit ${P} Power einen Unterschied nachzuweisen, braucht es ${dd} Ereignisse (Schoenfeld; nach Freedman ${df}). Bei einem Überlebensanteil von ${S} im Kontrollarm nach der festen Nachbeobachtungszeit und HR = ${H} sind dafür etwa ${pn} Personen nötig. Die Rechnung setzt proportionale Hazards, keine Verluste und keine verzögerte Aufnahme voraus.`,
      `To detect a difference with the log-rank test at a hazard ratio of ${H} with ${P} power, ${dd} events are needed (Schoenfeld; by Freedman ${df}). With a survival proportion of ${S} in the control arm after the fixed follow-up time and HR = ${H}, about ${pn} people are needed. The calculation assumes proportional hazards, no dropout and no delayed entry.`);
    satz += ' ' + (seiten === 2 ? L(`Der Test ist zweiseitig, das Signifikanzniveau α = ${A}.`, `The test is two-tailed, the significance level α = ${A}.`) : L(`Der Test ist einseitig, das Signifikanzniveau α = ${A}.`, `The test is one-tailed, the significance level α = ${A}.`));
    if (o.ausfall && o.ausfall > 0) satz += ' ' + L(`Bei ${proz0(o.ausfall, f)} Ausfällen sind es ${gz(ausfallZuschlag(pers.N, o.ausfall))} Personen.`, `With ${proz0(o.ausfall, f)} dropout it is ${gz(ausfallZuschlag(pers.N, o.ausfall))} people.`);
    return satz;
  });
}

/** Satz für den Methodenteil: AUC (Hanley-McNeil, nach Obuchowski daneben). */
export function satzAuc(auc1: number, o: PlanSatzOpt & { auc0?: number; R?: number }, f: Fmt): string {
  return mitFlag(f.en, () => {
    const alpha = o.alpha ?? 0.05, power = o.power ?? 0.8, R = o.R ?? 1, auc0 = o.auc0 ?? 0.5, h = nAuc(auc1, { auc0, alpha, power, R }), ob = nAuc(auc1, { auc0, alpha, power, R, verfahren: 'obuchowski' });
    const A = ohneNull(alpha, alpha < 0.01 ? 3 : 2, f), P = proz0(power, f), T1 = ohneNull(auc1, 2, f), T0 = ohneNull(auc0, 2, f);
    const gleich = h.nCases === h.nControls && ob.nCases === ob.nControls;
    let satz = gleich
      ? L(`Um eine AUC von ${T1} gegen ${T0} (α = ${A} zweiseitig) mit ${P} Power nachzuweisen, braucht es ${gz(h.nCases)} Personen mit und ${gz(h.nControls)} ohne den Zustand (Hanley-McNeil; nach Obuchowski ${gz(ob.nCases)} und ${gz(ob.nControls)}). Beide Rechnungen sind Näherungen.`,
        `To detect an AUC of ${T1} versus ${T0} (α = ${A} two-tailed) with ${P} power, ${gz(h.nCases)} people with and ${gz(h.nControls)} without the condition are needed (Hanley-McNeil; by Obuchowski ${gz(ob.nCases)} and ${gz(ob.nControls)}). Both calculations are approximations.`)
      : L(`Um eine AUC von ${T1} gegen ${T0} (α = ${A} zweiseitig) mit ${P} Power nachzuweisen, braucht es ${gz(h.nCases)} Personen mit und ${gz(h.nControls)} ohne den Zustand, also ${zahl(R, 1, f)} Kontrollen je Fall (Hanley-McNeil; nach Obuchowski ${gz(ob.nCases)} und ${gz(ob.nControls)}). Beide Rechnungen sind Näherungen.`,
        `To detect an AUC of ${T1} versus ${T0} (α = ${A} two-tailed) with ${P} power, ${gz(h.nCases)} people with and ${gz(h.nControls)} without the condition are needed, that is ${zahl(R, 1, f)} controls per case (Hanley-McNeil; by Obuchowski ${gz(ob.nCases)} and ${gz(ob.nControls)}). Both calculations are approximations.`);
    if (o.ausfall && o.ausfall > 0) satz += ' ' + L(`Bei ${proz0(o.ausfall, f)} Ausfällen sind es ${gz(ausfallZuschlag(h.nCases, o.ausfall))} Personen mit und ${gz(ausfallZuschlag(h.nControls, o.ausfall))} ohne den Zustand.`, `With ${proz0(o.ausfall, f)} dropout it is ${gz(ausfallZuschlag(h.nCases, o.ausfall))} people with and ${gz(ausfallZuschlag(h.nControls, o.ausfall))} without the condition.`);
    return satz;
  });
}

/* =====================================================================================================================================================
 * Später, Welle S-F2, Teil A: Fallzahl ergänzen - R²-Zuwachs, partielle Korrelation, mehrfaktorielle Varianzanalyse (Haupteffekte, Wechselwirkungen, Kontraste),
 * Kovarianzanalyse und Messwiederholung. Fachblatt docs/fachblaetter/SPAETER-F2-ERGAENZUNGEN.md, Abschnitt A und „Entscheidungen Opus (19.10.)“ 1 bis 5.
 * Rechenweg wie G*Power (nichtzentrale F-Verteilung, λ = f² · N, festes Modell) bzw. Faul et al. 2007 (Messwiederholung). Alles reine Funktionen, kein R, keine Daten.
 * Immer aufrunden auf ganze Personen; Suche nach dem kleinsten N (bis 500 000, sonst null). Geprüft: power-spaeter-f2.test.ts.
 * ===================================================================================================================================================== */

/** Kleinste ganze Zahl ab `start`, bei der `ok` gilt (Zweierschritte, dann Bisektion); null, wenn auch 500 000 nicht reichen. */
function kleinstesN(ok: (n: number) => boolean, start: number): number | null {
  if (ok(start)) return start;
  let lo = start, hi = start * 2;
  for (;;) {
    if (hi > MAX_M) { hi = MAX_M; if (!ok(hi)) return null; break; }
    if (ok(hi)) break;
    lo = hi; hi *= 2;
  }
  while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (ok(mid)) hi = mid; else lo = mid; }
  return hi;
}

export interface FPower { power: number; lambda: number; krit: number; df1: number; df2: number }
/** Power des F-Tests bei Nichtzentralität λ und df1, df2 (df2 < 1: keine Rechnung, Power 0). */
function powerF(lambda: number, df1: number, df2: number, alpha: number): FPower {
  if (!(df1 > 0) || !(df2 >= 1 - 1e-9)) return { power: 0, lambda, krit: Infinity, df1, df2 };
  const krit = fQuantil(1 - alpha, df1, df2);
  return { power: Math.min(1, Math.max(0, 1 - fNichtzentral(krit, df1, df2, lambda))), lambda, krit, df1, df2 };
}

/* ---------------------------------------------------------------- R²-Zuwachs (G*Power „Linear multiple regression: Fixed model, R² increase“) */

/** f² = (R²voll − R²alt) / (1 − R²alle). Ohne r2alle (Fall 1) ist r2alle = r2voll; Fall 2: R² mit allen Blöcken (ein Block C wirkt nur auf die Fehlervarianz). */
export const f2AusR2 = (r2voll: number, r2alt: number, r2alle?: number): number => (r2voll - r2alt) / (1 - (r2alle ?? r2voll));
/** Festes Modell: λ = f² · N, df1 = q (getestete Prädiktoren), df2 = N − m − 1 (m = ALLE Prädiktoren im vollen Modell). */
export const powerR2Zuwachs = (f2: number, N: number, q: number, m: number, alpha = 0.05): FPower => powerF(f2 * N, q, N - m - 1, alpha);
/** Kleinste ganze Gesamtzahl mit Power ≥ ziel (mindestens m + 2); null, wenn sie über 500 000 läge. */
export function nR2Zuwachs(f2: number, q: number, m: number, ziel = 0.8, alpha = 0.05): { N: number; power: number } | null {
  const N = kleinstesN(n => powerR2Zuwachs(f2, n, q, m, alpha).power >= ziel, m + 2);
  return N === null ? null : { N, power: powerR2Zuwachs(f2, N, q, m, alpha).power };
}
/** Sensitivität: kleinstes f² bei N (Bisektion); null, wenn N ≤ m + 1 oder selbst f² = 10 nicht reicht. */
export function kleinstesF2R2Zuwachs(N: number, q: number, m: number, ziel = 0.8, alpha = 0.05): number | null {
  if (!(N > m + 1)) return null;
  const mit = (f2: number) => powerR2Zuwachs(f2, N, q, m, alpha).power;
  let lo = 1e-9, hi = 10;
  if (mit(hi) < ziel) return null;
  for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (mit(mid) < ziel) lo = mid; else hi = mid; }
  return hi;
}

/* ---------------------------------------------------------------- Partielle Korrelation */

export interface PartiellOpt { alpha?: number; seiten?: 1 | 2; weg?: 'exakt' | 'fest' }
/**
 * Power für ρp nach Kontrolle von k Variablen. 'exakt' (Voreinstellung, Opus 3): die Stichproben-ρp ist verteilt wie ein gewöhnliches r aus N − k Paaren.
 * 'fest' („wie G*Power“): R²-Zuwachs mit einem Prädiktor, f² = ρp²/(1 − ρp²), m = k + 1, df2 = N − k − 2; einseitig ein nichtzentraler t-Test. ρp gilt als Betrag.
 */
export function powerPartiell(rp: number, N: number, k: number, o: PartiellOpt = {}): number {
  const alpha = o.alpha ?? 0.05, seiten = o.seiten ?? 2, r = Math.abs(rp);
  if ((o.weg ?? 'exakt') === 'exakt') return N - k < 4 ? 0 : powerKorrelation(r, N - k, alpha, seiten);
  const f2 = (r * r) / (1 - r * r), df2 = N - k - 2;
  if (df2 < 1) return 0;
  return seiten === 2 ? powerR2Zuwachs(f2, N, 1, k + 1, alpha).power : powerT(Math.sqrt(f2 * N), df2, alpha, 1);
}
/** Kleinste ganze Zahl N (mindestens k + 4) mit Power ≥ ziel; null, wenn sie über 500 000 läge. */
export function nPartiell(rp: number, k: number, o: PartiellOpt & { ziel?: number } = {}): number | null {
  const ziel = o.ziel ?? 0.8;
  return kleinstesN(n => powerPartiell(rp, n, k, o) >= ziel, k + 4);
}

/* ---------------------------------------------------------------- Varianzanalyse mehrfaktoriell, Kovariate, Kontraste */

export interface AnovaOpt { alpha?: number; kovariaten?: number; r2kov?: number }
/** λ = f_korr² · N mit f_korr = f / √(1 − R²_Kov); df2 = N − Zellen − Kovariaten. Gilt für Haupteffekte, Wechselwirkungen, Kontraste (df1 = 1) und die Kovarianzanalyse. */
export function powerAnovaEffekt(f: number, N: number, df1: number, zellen: number, o: AnovaOpt = {}): FPower {
  const fk2 = (f * f) / (1 - (o.r2kov ?? 0));
  return powerF(fk2 * N, df1, N - zellen - (o.kovariaten ?? 0), o.alpha ?? 0.05);
}
export interface AnovaErg { N: number; power: number; jeZelle: number; NGleich: number; powerGleich: number }
/** Kleinste Gesamtzahl (wie G*Power: nicht auf Zellen aufgerundet) und, daneben, die Zahl bei gleich großen Zellen mit der dann erreichten Power (Opus 4). */
export function nAnovaEffekt(f: number, df1: number, zellen: number, o: AnovaOpt & { ziel?: number } = {}): AnovaErg | null {
  const ziel = o.ziel ?? 0.8, kov = o.kovariaten ?? 0;
  const N = kleinstesN(n => powerAnovaEffekt(f, n, df1, zellen, o).power >= ziel, zellen + kov + 1);
  if (N === null) return null;
  const jeZelle = Math.ceil(N / zellen), NGleich = zellen * jeZelle;
  return { N, power: powerAnovaEffekt(f, N, df1, zellen, o).power, jeZelle, NGleich, powerGleich: powerAnovaEffekt(f, NGleich, df1, zellen, o).power };
}
/** Mehrere Effekte am selben Plan: der ungünstigste (größte Zahl) bestimmt (Opus 4). */
export function nAnovaMehrere(effekte: { name: string; f: number; df1: number }[], zellen: number, o: AnovaOpt & { ziel?: number } = {}):
  { N: number; jeZelle: number; NGleich: number; ungünstigster: string; je: { name: string; N: number }[] } | null {
  const je: { name: string; N: number }[] = [];
  for (const e of effekte) { const r = nAnovaEffekt(e.f, e.df1, zellen, o); if (!r) return null; je.push({ name: e.name, N: r.N }); }
  let wo = 0; je.forEach((x, i) => { if (x.N > je[wo]!.N) wo = i; });
  const N = je[wo]!.N, jeZelle = Math.ceil(N / zellen);
  return { N, jeZelle, NGleich: zellen * jeZelle, ungünstigster: je[wo]!.name, je };
}
/** Kontrast: f = |Σ cᵢ μᵢ| / √(N Σ cᵢ²/n) / σ mit N = n · Zahl der Gruppen (gleich große Gruppen n). Die Gewichte c summieren zu 0. */
export function kontrastF(c: number[], mu: number[], n: number, sigma: number): number {
  const N = n * c.length, summeC2 = c.reduce((a, v) => a + v * v, 0), l = c.reduce((a, v, i) => a + v * mu[i]!, 0);
  return Math.abs(l) / Math.sqrt((N * summeC2) / n) / sigma;
}
/** Partielles η² der SPSS-Ausgabe aus f² (G*Power): e = f²/(1 + f²); e·N/(N − Zellen + Zellen·e) (Handbuch: η²_SPSS ist stichprobenbasiert). */
export function etaSpssAusF2(f2: number, N: number, zellen: number): number { const e = f2 / (1 + f2); return (e * N) / (N - zellen + zellen * e); }
/** Zurück: f² = g · df2 / N0 mit g = η²/(1 − η²) (η² und N0 aus der Vorstudie, df2 = Fehler-Freiheitsgrade dort). */
export const f2AusEtaSpss = (eta2spss: number, N0: number, df2: number): number => (eta2spss / (1 - eta2spss)) * (df2 / N0);

/* ---------------------------------------------------------------- Messwiederholung (Faul, Erdfelder, Lang & Buchner 2007, Tabelle 3) */

export type MesswTyp = 'innerhalb' | 'zwischen' | 'wechsel';
/**
 * k Gruppen, m Messungen, ρ Korrelation zwischen den Messungen, ε Nichtsphärizität (1 = Sphärizität). f wie G*Power: σ = Streuung EINER Messung innerhalb einer Gruppe.
 * zwischen: u = m/(1 + (m − 1)ρ), λ = f²uN, df1 = k − 1, df2 = N − k. innerhalb: u = m/(1 − ρ), λ = f²uNε, df1 = (m − 1)ε, df2 = (N − k)(m − 1)ε. Wechselwirkung: df1 = (k − 1)(m − 1)ε.
 */
export function powerMessw(f: number, N: number, k: number, m: number, rho: number, eps: number, typ: MesswTyp, alpha = 0.05): FPower {
  if (typ === 'zwischen') return powerF(f * f * (m / (1 + (m - 1) * rho)) * N, k - 1, N - k, alpha);
  const u = m / (1 - rho), df2 = (N - k) * (m - 1) * eps, lambda = f * f * u * N * eps;
  return powerF(lambda, typ === 'innerhalb' ? (m - 1) * eps : (k - 1) * (m - 1) * eps, df2, alpha);
}
/** Kleinste ganze Zahl N (mindestens k + 2) mit Power ≥ ziel; null, wenn sie über 500 000 läge (oder der Effekt nicht prüfbar ist, etwa „zwischen“ mit einer Gruppe). */
export function nMessw(f: number, k: number, m: number, rho: number, eps: number, typ: MesswTyp, o: { ziel?: number; alpha?: number } = {}): { N: number; power: number } | null {
  const ziel = o.ziel ?? 0.8, alpha = o.alpha ?? 0.05;
  const N = kleinstesN(n => powerMessw(f, n, k, m, rho, eps, typ, alpha).power >= ziel, k + 2);
  return N === null ? null : { N, power: powerMessw(f, N, k, m, rho, eps, typ, alpha).power };
}
/** G*Power-f (innerhalb) aus dem partiellen η² von SPSS: g = η²/(1 − η²); f_S² = g (m − 1)(N0 − k)/(m N0); f_G² = f_S² (1 − ρ). */
export function fMessAusSpss(eta2p: number, N0: number, k: number, m: number, rho: number): number {
  const g = eta2p / (1 - eta2p), fS2 = (g * (m - 1) * (N0 - k)) / (m * N0);
  return Math.sqrt(fS2 * (1 - rho));
}

/* ---------------------------------------------------------------- Eingaben prüfen */

export type PlanEingabeF2 =
  | { art: 'r2zuwachs'; r2voll: number; r2alt: number; q: number; m: number; N?: number }
  | { art: 'partiell'; rp: number; k: number; N?: number }
  | { art: 'messw'; m: number; rho: number; eps: number; k: number; N?: number }
  | { art: 'anovaplus'; zellen: number; df1: number; kovariaten?: number; r2kov?: number; N?: number };
/** Fehlercode (die Rechnung bleibt aus) und Hinweise ('zufall' bei R²-Zuwachs immer; 'epsilon-naeherung' bei ε < 1; 'sehr-gross' bei N über 1 000 000). */
export function planPruefungF2(p: PlanEingabeF2): { fehler: string | null; hinweise: string[] } {
  const hinweise: string[] = [];
  const ganz = (x: number) => Number.isInteger(x);
  const fertig = (fehler: string | null) => ({ fehler, hinweise });
  if (p.N !== undefined && p.N > 1_000_000) hinweise.push('sehr-gross');
  switch (p.art) {
    case 'r2zuwachs':
      if (!(Number.isFinite(p.r2voll) && Number.isFinite(p.r2alt) && p.r2alt >= 0 && p.r2alt < p.r2voll && p.r2voll < 1)) return fertig('r2');
      if (!(ganz(p.q) && p.q >= 1 && p.q <= p.m) || !ganz(p.m)) return fertig('q');
      if (p.N !== undefined && !(p.N > p.m + 1)) return fertig('n');
      hinweise.push('zufall'); return fertig(null);
    case 'partiell':
      if (!(Number.isFinite(p.rp) && Math.abs(p.rp) > 0 && Math.abs(p.rp) < 1)) return fertig('rp');
      if (!(ganz(p.k) && p.k >= 0)) return fertig('k');
      if (p.N !== undefined && !(p.N - p.k >= 4)) return fertig('n');
      return fertig(null);
    case 'messw':
      if (!(ganz(p.m) && p.m >= 2)) return fertig('m');
      if (!(Number.isFinite(p.rho) && p.rho >= -1 / (p.m - 1) - 1e-12 && p.rho < 1)) return fertig('rho');
      if (!(Number.isFinite(p.eps) && p.eps >= 1 / (p.m - 1) - 1e-12 && p.eps <= 1)) return fertig('eps');
      if (p.N !== undefined && !(p.N > p.k + 1)) return fertig('n');
      if (p.eps < 1) hinweise.push('epsilon-naeherung');
      return fertig(null);
    case 'anovaplus': {
      const kov = p.kovariaten ?? 0;
      if (!(ganz(p.zellen) && p.zellen >= 2)) return fertig('zellen');
      if (!(ganz(p.df1) && p.df1 >= 1 && p.df1 <= p.zellen - 1)) return fertig('df1');
      if (p.r2kov !== undefined && !(p.r2kov >= 0 && p.r2kov < 1)) return fertig('r2kov');
      if (p.N !== undefined && !(p.N > p.zellen + kov)) return fertig('n');
      return fertig(null);
    }
  }
}

/* ---------------------------------------------------------------- Sätze für den Methodenteil (Teil A) */

/** Ohne führende Null für Größen unter 1 (f, ρp, ε, α, Power), Stellen wie `effektText`. */
const kleinOhneNull = (v: number, f: Fmt) => ohneNull(v, Math.abs(Math.round(v * 100) / 100 - v) < 1e-9 ? 2 : 3, f);
/** Eigener Sprachtext (Leitfaden Falle 12): nie als Konstante in ein anderes `L` einsetzen. */
const wieGPower = () => L('im Rechenweg wie G*Power', 'following the procedure of G*Power');
const alphaT = (a: number, f: Fmt) => `α = ${ohneNull(a, a < 0.01 ? 3 : 2, f)}`;
const zielT = (z: number, f: Fmt) => `1 − β = ${ohneNull(z, 2, f)}`;

/** Pflichtsatz zum Zufallsmodell (Opus 2). */
export function hinweisFestesModell(f: Fmt): string {
  return mitFlag(f.en, () => d('Gerechnet wird mit festen Prädiktoren (wie in G*Power). Bei gemessenen statt festgelegten Prädiktoren ist die Power etwas niedriger; plane einen kleinen Sicherheitszuschlag ein.',
    'Gerechnet wird mit festen Prädiktoren (wie in G*Power). Bei gemessenen statt festgelegten Prädiktoren ist die Power etwas niedriger; planen Sie einen kleinen Sicherheitszuschlag ein.',
    'The calculation uses fixed predictors (as in G*Power). With measured rather than fixed predictors the power is somewhat lower; allow for a small safety margin.'));
}
/** „4 getestete von 9 Prädiktoren“ / „4 tested of 9 predictors“: Zahlwörter je als eigenes `Lp`, der Rahmen als eigenes `L`. */
const predText = (q: number, m: number) => {
  const t = Lp(q, '1 getesteter', `${q} getestete`, '1 tested', `${q} tested`), pr = Lp(m, '1 Prädiktor', `${m} Prädiktoren`, '1 predictor', `${m} predictors`);
  return L(`${t} von ${pr}`, `${t} of ${pr}`);
};
type E1 = { f2: number; q: number; m: number; alpha: number; ziel: number; N: number };
export function satzR2Zuwachs(e: E1, f: Fmt): string {
  return mitFlag(f.en, () => {
    const wie = wieGPower(), p = predText(e.q, e.m), ang = `${p}; f² = ${effektText(e.f2, f)}, ${alphaT(e.alpha, f)}, ${zielT(e.ziel, f)}`;
    return L(`Eine A-priori-Poweranalyse für den Zuwachs an erklärter Varianz (${ang}) ergab einen Stichprobenumfang von N = ${gz(e.N)}. Die Berechnung erfolgte in Statable über die nichtzentrale F-Verteilung, ${wie} (festes Modell, Prädiktoren als vorgegeben angenommen).`,
      `An a priori power analysis for the increase in explained variance (${ang}) yielded a required sample size of N = ${gz(e.N)}. It was computed in Statable using the noncentral F distribution, ${wie} (fixed model, predictors assumed to be given).`);
  });
}
export function satzR2ZuwachsSens(e: E1, f: Fmt): string {
  return mitFlag(f.en, () => {
    const wie = wieGPower(), p = predText(e.q, e.m), ang = `${p}; N = ${gz(e.N)}, ${alphaT(e.alpha, f)}, ${zielT(e.ziel, f)}`;
    return L(`Eine Sensitivitätsanalyse für den Zuwachs an erklärter Varianz (${ang}) ergab, dass sich Effekte ab f² = ${effektText(e.f2, f)} nachweisen lassen. Die Berechnung erfolgte in Statable über die nichtzentrale F-Verteilung, ${wie} (festes Modell).`,
      `A sensitivity analysis for the increase in explained variance (${ang}) showed that effects of f² ≥ ${effektText(e.f2, f)} can be detected. It was computed in Statable using the noncentral F distribution, ${wie} (fixed model).`);
  });
}
export function satzPartiell(e: { rp: number; k: number; alpha: number; ziel: number; seiten: 1 | 2; weg: 'exakt' | 'fest'; N: number }, f: Fmt): string {
  return mitFlag(f.en, () => {
    const wie = wieGPower();
    const kon = e.k === 0 ? '' : Lp(e.k, ` nach Kontrolle von ${e.k} Variable`, ` nach Kontrolle von ${e.k} Variablen`, ` after controlling for ${e.k} variable`, ` after controlling for ${e.k} variables`);
    const seite = e.seiten === 2 ? L('zweiseitig', 'two-tailed') : L('einseitig', 'one-tailed');
    const ang = `ρp = ${ohneNull(Math.abs(e.rp), 2, f)}${kon}, ${alphaT(e.alpha, f)}, ${zielT(e.ziel, f)}, ${seite}`;
    const weg = e.weg === 'exakt'
      ? L(`über die exakte Verteilung von r (bivariates Normalmodell) mit N − ${e.k} Paaren`, `using the exact distribution of r (bivariate normal model) with N − ${e.k} pairs`)
      : L(`über die nichtzentrale F-Verteilung, ${wie} (R²-Zuwachs mit einem Prädiktor)`, `using the noncentral F distribution, ${wie} (R² increase with one predictor)`);
    return L(`Eine A-priori-Poweranalyse für eine partielle Korrelation (${ang}) ergab einen Stichprobenumfang von N = ${gz(e.N)}. Die Berechnung erfolgte in Statable ${weg}.`,
      `An a priori power analysis for a partial correlation (${ang}) yielded a required sample size of N = ${gz(e.N)}. It was computed in Statable ${weg}.`);
  });
}
export function satzAnovaFaktoren(e: { a: number; b: number; /** dritter Faktor (optional) */ c?: number; effekt: 'A' | 'B' | 'A×B'; /** Name des Effekts bei drei Faktoren (z. B. „A×C“) */ effektName?: string; f: number; df1: number; alpha: number; ziel: number; N: number; jeZelle: number; NGleich: number }, f: Fmt): string {
  return mitFlag(f.en, () => {
    const wie = wieGPower();
    const en_ = e.effektName ?? e.effekt, was = en_.includes('×') ? L(`die Wechselwirkung ${en_}`, `the interaction ${en_}`) : L(`den Haupteffekt von Faktor ${en_}`, `the main effect of factor ${en_}`);
    const plan = `${e.a} × ${e.b}${e.c ? ` × ${e.c}` : ''}`;
    const df = Lp(e.df1, `${e.df1} Zähler-Freiheitsgrad`, `${e.df1} Zähler-Freiheitsgrade`, `${e.df1} numerator degree of freedom`, `${e.df1} numerator degrees of freedom`);
    const ang = `f = ${kleinOhneNull(e.f, f)}, ${df}, ${alphaT(e.alpha, f)}, ${zielT(e.ziel, f)}`;
    return L(`Eine A-priori-Poweranalyse für ${was} in einer Varianzanalyse mit ${plan} Gruppen (${ang}) ergab einen Stichprobenumfang von N = ${gz(e.N)} (${e.jeZelle} je Zelle, bei gleich großen Zellen ${gz(e.NGleich)}). Die Berechnung erfolgte in Statable über die nichtzentrale F-Verteilung, ${wie}.`,
      `An a priori power analysis for ${was} in an analysis of variance with ${plan} groups (${ang}) yielded a required sample size of N = ${gz(e.N)} (${e.jeZelle} per cell, ${gz(e.NGleich)} with equal cells). It was computed in Statable using the noncentral F distribution, ${wie}.`);
  });
}
export function satzAncova(e: { f: number; r2kov: number; kovariaten: number; df1: number; zellen: number; alpha: number; ziel: number; N: number }, f: Fmt): string {
  return mitFlag(f.en, () => {
    const wie = wieGPower();
    const fw = e.f / Math.sqrt(1 - e.r2kov), proz_ = Math.round(e.r2kov * 100);
    const kov = Lp(e.kovariaten, 'einer Kovariate', `${e.kovariaten} Kovariaten`, 'one covariate', `${e.kovariaten} covariates`);
    const ang = `f = ${kleinOhneNull(e.f, f)}, ${alphaT(e.alpha, f)}, ${zielT(e.ziel, f)}`;
    return L(`Eine A-priori-Poweranalyse für eine Varianzanalyse mit ${e.zellen} Gruppen und ${kov}, die ${proz_} % der Streuung innerhalb der Gruppen erklärt (${ang}; wirksames f = ${ohneNull(fw, 2, f)}), ergab einen Stichprobenumfang von N = ${gz(e.N)}. Die Berechnung erfolgte in Statable über die nichtzentrale F-Verteilung, ${wie}.`,
      `An a priori power analysis for an analysis of variance with ${e.zellen} groups and ${kov}, which explains ${proz_}% of the variance within the groups (${ang}; effective f = ${ohneNull(fw, 2, f)}), yielded a required sample size of N = ${gz(e.N)}. It was computed in Statable using the noncentral F distribution, ${wie}.`);
  });
}
export function satzMessw(e: { typ: MesswTyp; k: number; m: number; f: number; rho: number; eps: number; alpha: number; ziel: number; N: number }, f: Fmt): string {
  return mitFlag(f.en, () => {
    const was = e.typ === 'innerhalb' ? L('den Effekt der Messzeitpunkte', 'the effect of the measurement occasions') : e.typ === 'zwischen' ? L('den Unterschied zwischen den Gruppen', 'the difference between the groups') : L('die Wechselwirkung von Gruppe und Messzeitpunkt', 'the interaction of group and measurement occasion');
    const gr = Lp(e.k, 'eine Gruppe', `${e.k} Gruppen`, 'one group', `${e.k} groups`), me = Lp(e.m, `${e.m} Messung`, `${e.m} Messungen`, `${e.m} measurement`, `${e.m} measurements`);
    const epsT = e.eps === 1 ? '1' : ohneNull(e.eps, 2, f);
    const rhoT = `r = ${ohneNull(e.rho, 2, f)}`;
    const wie = wieGPower(), erwKorr = L('erwartete Korrelation zwischen den Messungen', 'expected correlation between the measurements');
    const ang = `${gr}, ${me}, f = ${kleinOhneNull(e.f, f)}, ${erwKorr} ${rhoT}, ε = ${epsT}, ${alphaT(e.alpha, f)}, ${zielT(e.ziel, f)}`;
    const naeh = e.eps < 1 ? L(' Bei ε < 1 ist die Rechnung eine Näherung, die eher etwas zu optimistisch ist.', ' With ε < 1 the calculation is an approximation that tends to be somewhat optimistic.') : '';
    return L(`Eine A-priori-Poweranalyse für ${was} in einer Varianzanalyse mit Messwiederholung (${ang}) ergab einen Stichprobenumfang von N = ${gz(e.N)}. Die Berechnung erfolgte in Statable über die nichtzentrale F-Verteilung, ${wie}.${naeh} Die Effektgröße f ist wie in G*Power gemeint, nicht wie in SPSS oder WebPower.`,
      `An a priori power analysis for ${was} in a repeated measures analysis of variance (${ang}) yielded a required sample size of N = ${gz(e.N)}. It was computed in Statable using the noncentral F distribution, ${wie}.${naeh} The effect size f is meant as in G*Power, not as in SPSS or WebPower.`);
  });
}

/** Satz für einen Kontrast (Varianzanalyse, df1 = 1). */
export function satzKontrast(e: { f: number; gruppen: number; alpha: number; ziel: number; N: number }, f: Fmt): string {
  return mitFlag(f.en, () => {
    const wie = wieGPower();
    const ang = `f = ${kleinOhneNull(e.f, f)}, ${alphaT(e.alpha, f)}, ${zielT(e.ziel, f)}`;
    return L(`Eine A-priori-Poweranalyse für einen geplanten Kontrast in einer Varianzanalyse mit ${e.gruppen} Gruppen (${ang}, 1 Zähler-Freiheitsgrad) ergab einen Stichprobenumfang von N = ${gz(e.N)}. Die Berechnung erfolgte in Statable über die nichtzentrale F-Verteilung, ${wie}.`,
      `An a priori power analysis for a planned contrast in an analysis of variance with ${e.gruppen} groups (${ang}, 1 numerator degree of freedom) yielded a required sample size of N = ${gz(e.N)}. It was computed in Statable using the noncentral F distribution, ${wie}.`);
  });
}
