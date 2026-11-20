/**
 * Referenzbereiche (2,5. bis 97,5. Perzentil) mit 90-%-Konfidenzintervall der Grenzen (Später, Welle S-D, M7; Fachblatt docs/fachblaetter/SPAETER-D-PSYCHOLOGIE-MIXED-RECHNER.md, Abschnitt 4 und „Entscheidungen Opus“ 4).
 * Reine Funktionen ohne Oberfläche und ohne PSPP (Sätze und Tabellen: referenzsaetze.ts). Quellen: CLSI EP28-A3c (2010); Horn & Pesce (2005), Reference Intervals: A User's Guide; Owen (1968), Technometrics 10(3), 445-478 (nichtzentrale t);
 * Box & Cox (1964), JRSS B 26(2), 211-252; Bland & Altman (1999), Statistical Methods in Medical Research 8(2), 135-160; Reed, Henry & Mason (1971), Clinical Chemistry 17(4), 275-284 (Dixon-Verhältnis D/R).
 *
 * Festlegungen (Opus 17.10.):
 *  - A, Rangmethode: Perzentil nach Typ 6 (r = p·(n + 1); CLSI und SPSS „gewichteter Durchschnitt“). NIE `quantil7` aus diagrammdaten.ts: dieselben 120 Werte geben oben 75,26 (Typ 6) gegen 69,84 (Typ 7).
 *    Das 90-%-Konfidenzintervall der Ränge gibt es erst ab n = 119 (0,975^119 = 0,0492), die Punktschätzung ab n = 39 (Rang p·(n + 1) ≥ 1).
 *  - B, parametrisch: Mittel ∓ 1,959964·SD mit EXAKTEM Konfidenzintervall über die nichtzentrale t-Verteilung (nicht die Näherung von Bland & Altman; sie steht nur als Gegenprobe da).
 *  - Box-Cox ist eine Option: λ MIT Intervall der Profil-Likelihood, nie still transformiert; das Intervall der Grenzen behandelt λ als bekannt.
 *  - Harrell-Davis (C) und Horn-Pesce (D) werden nicht gebaut. Ausreißer: nur Hinweis (D/R ≥ 1/3, Tukey 1,5), die Bereiche werden immer mit allen Werten gerechnet.
 */
import { L } from './sitzung.svelte';
import { dbinomRaw, lnGamma, normal, tNichtzentral, tQuantil } from './verteilung';
import { zahlDe } from './format';
import { shapiroWilk } from './normalitaet';

export const RANG_MIN_N_PUNKT = 39, RANG_MIN_N_KI = 119, NORMAL_MIN_N = 20;
/** qnorm(0,975) auf 16 Stellen (die Rechnung in R nimmt `qnorm`, nicht 1,96). */
const Z975 = 1.959963984540054;
/** qchisq(0,95; 1) */
const CHI95 = 3.841458820694124;

const endlich = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);
const sortiert = (x: number[]) => [...x].sort((a, b) => a - b);
const mittelVon = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
const sdVon = (x: number[], m = mittelVon(x)) => Math.sqrt(x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - 1));

/** Perzentil nach Typ 6 (SPSS HAVERAGE, CLSI): r = p·(n + 1), lineare Interpolation; ist r < 1 oder r > n: NaN (kein stiller Randwert). */
export function quantil6(x: number[], p: number): number {
  const s = sortiert(x), n = s.length, r = p * (n + 1);
  if (!(r >= 1 - 1e-12) || r > n + 1e-12) return NaN;
  const k = Math.floor(r + 1e-12), f = r - k;
  return k >= n ? s[n - 1]! : s[k - 1]! + f * (s[k]! - s[k - 1]!);
}

/**
 * Ränge des verteilungsfreien Konfidenzintervalls einer Grenze: B ~ Bin(n, p) zählt die Werte unter der wahren Grenze;
 * l = GRÖSSTER Rang mit P(B ≤ l − 1) ≤ (1 − niveau)/2, u = KLEINSTER Rang mit P(B ≤ u − 1) ≥ 1 − (1 − niveau)/2. `null`, wenn es kein l ≥ 1 gibt (n ≤ 118 bei p = 0,025) oder u über n läge.
 */
export function rangGrenzen(n: number, p: number, niveau = 0.9): { l: number; u: number; abdeckung: number } | null {
  if (p > 0.5) {                                   // Spiegelung: n − B ~ Bin(n, 1 − p); spart die lange Summe bei großem n
    const s = rangGrenzen(n, 1 - p, niveau);
    return s ? { l: n + 1 - s.u, u: n + 1 - s.l, abdeckung: s.abdeckung } : null;
  }
  const a = (1 - niveau) / 2, eps = 1e-12, q = 1 - p;
  let l = 0, u = 0, lauf = 0, cdfL = 0, cdfU = 0;
  for (let r = 1; r <= n; r++) {
    lauf += dbinomRaw(r - 1, n, p, q);              // lauf = P(B ≤ r − 1)
    if (!u && l === r - 1 && lauf <= a + eps) { l = r; cdfL = lauf; }
    if (lauf >= 1 - a - eps) { u = r; cdfU = Math.min(1, lauf); break; }
  }
  if (l < 1 || !u) return null;
  return { l, u, abdeckung: cdfU - cdfL };
}

/* ------------------------------------------------------------ A Rangmethode */
export type RangHinweis = 'n-zu-klein' | 'ki-nicht-moeglich' | 'ganzzahlig';
export interface RangErgebnis {
  n: number; ausgeschlossen: number; unten: number | null; oben: number | null;
  ki: { rangUnten: [number, number]; rangOben: [number, number]; unten: [number, number]; oben: [number, number]; abdeckung: [number, number] } | null;
  hinweise: RangHinweis[]; fehler: null | 'alle-gleich' | 'keine-werte';
}
export function referenzRang(x: (number | null)[]): RangErgebnis {
  const w = x.filter(endlich), n = w.length, aus: RangErgebnis = { n, ausgeschlossen: x.length - n, unten: null, oben: null, ki: null, hinweise: [], fehler: null };
  if (!n) { aus.fehler = 'keine-werte'; return aus; }
  const s = sortiert(w);
  if (s[n - 1] === s[0]) { aus.fehler = 'alle-gleich'; return aus; }
  if (n < RANG_MIN_N_PUNKT) aus.hinweise.push('n-zu-klein');
  else {
    aus.unten = quantil6(w, 0.025); aus.oben = quantil6(w, 0.975);
    const lo = n >= RANG_MIN_N_KI ? rangGrenzen(n, 0.025) : null, hi = n >= RANG_MIN_N_KI ? rangGrenzen(n, 0.975) : null;
    if (lo && hi) aus.ki = { rangUnten: [lo.l, lo.u], rangOben: [hi.l, hi.u], unten: [s[lo.l - 1]!, s[lo.u - 1]!], oben: [s[hi.l - 1]!, s[hi.u - 1]!], abdeckung: [lo.abdeckung, hi.abdeckung] };
    else aus.hinweise.push('ki-nicht-moeglich');
  }
  if (w.every(v => v === Math.round(v))) aus.hinweise.push('ganzzahlig');
  return aus;
}

/* ------------------------------------------------------------ B Parametrisch */
/** Ab dieser Nichtzentralität rechnet `tNichtzentral` (AS 243) nicht mehr zuverlässig; darüber gilt die Integration unten (n ab etwa 235). */
const NCP_ALGORITHMUS = 30;
/** P(T ≤ t) der nichtzentralen t-Verteilung durch Integration über S = √(χ²/df): P = ∫ Φ(t·s − δ)·f_S(s) ds (Simpson, 4000 Schritte über ±14 Standardabweichungen von S). Für große δ, wo AS 243 versagt. */
export function nctIntegral(t: number, df: number, delta: number): number {
  const sd = 1 / Math.sqrt(2 * df), lo = Math.max(1e-9, 1 - 14 * sd), hi = 1 + 14 * sd, m = 4000, h = (hi - lo) / m;
  const logC = (df / 2) * Math.log(df) - ((df / 2 - 1) * Math.LN2) - lnGamma(df / 2);
  const f = (s: number) => Math.exp(logC + (df - 1) * Math.log(s) - (df * s * s) / 2) * normal(t * s - delta);
  let sum = f(lo) + f(hi);
  for (let i = 1; i < m; i++) sum += f(lo + i * h) * (i % 2 ? 4 : 2);
  return Math.min(1, Math.max(0, (sum * h) / 3));
}
/** P(T ≤ t) der nichtzentralen t-Verteilung: AS 243 bis |δ| = 30, darüber die Integration. */
export const nctVerteilung = (t: number, df: number, delta: number): number => (Math.abs(delta) <= NCP_ALGORITHMUS ? tNichtzentral(t, df, delta) : nctIntegral(t, df, delta));
/** Quantil der nichtzentralen t-Verteilung (df Freiheitsgrade, Nichtzentralität delta) zur Wahrscheinlichkeit `prob` durch Einschließen und Halbieren. */
function nctQuantil(prob: number, df: number, delta: number): number {
  const F = (x: number) => nctVerteilung(x, df, delta);
  let lo = delta - 5, hi = delta + 5;
  while (F(lo) > prob) lo -= (hi - lo);
  while (F(hi) < prob) hi += (hi - lo);
  for (let i = 0; i < 200 && hi - lo > 1e-13 * Math.max(1, Math.abs(hi)); i++) { const m = (lo + hi) / 2; if (F(m) < prob) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/** Exaktes 90-%-Konfidenzintervall der Grenze mittel + z·sd (z = qnorm(p)): T = √n·(x̄ − θ)/s ist nichtzentral t-verteilt mit n − 1 Freiheitsgraden und δ = −z·√n (Owen 1968). */
export function nctIntervall(mittel: number, sd: number, n: number, z: number, niveau = 0.9): [number, number] {
  const a = (1 - niveau) / 2, delta = -z * Math.sqrt(n), f = sd / Math.sqrt(n);
  return [mittel - nctQuantil(1 - a, n - 1, delta) * f, mittel - nctQuantil(a, n - 1, delta) * f];
}
/** Näherung von Bland & Altman (1999): SE = s·√(1/n + z²/(2(n − 1))), Intervall = Grenze ± t(0,95; n − 1)·SE. Nur als Gegenprobe. */
export function naeherungIntervall(grenze: number, sd: number, n: number, z: number, niveau = 0.9): [number, number] {
  const se = sd * Math.sqrt(1 / n + (z * z) / (2 * (n - 1))), t = tQuantil(1 - (1 - niveau) / 2, n - 1);
  return [grenze - t * se, grenze + t * se];
}
export interface NormalErgebnis {
  n: number; ausgeschlossen: number; mittel: number; sd: number; unten: number; oben: number;
  kiUnten: [number, number]; kiOben: [number, number]; naeherungUnten: [number, number]; naeherungOben: [number, number];
  shapiroP: number; hinweise: 'nicht-normal'[]; fehler: null | 'n-zu-klein' | 'alle-gleich' | 'keine-werte';
}
export function referenzNormal(x: (number | null)[]): NormalErgebnis {
  const w = x.filter(endlich), n = w.length, leer: NormalErgebnis = { n, ausgeschlossen: x.length - n, mittel: 0, sd: 0, unten: 0, oben: 0, kiUnten: [0, 0], kiOben: [0, 0], naeherungUnten: [0, 0], naeherungOben: [0, 0], shapiroP: 1, hinweise: [], fehler: null };
  if (!n) return { ...leer, fehler: 'keine-werte' };
  if (n < NORMAL_MIN_N) return { ...leer, fehler: 'n-zu-klein' };
  const m = mittelVon(w), sd = sdVon(w, m);
  if (!(sd > 0)) return { ...leer, mittel: m, fehler: 'alle-gleich' };
  const unten = m - Z975 * sd, oben = m + Z975 * sd, sw = shapiroWilk(w), p = sw ? sw.p : 1;
  return {
    ...leer, mittel: m, sd, unten, oben, kiUnten: nctIntervall(m, sd, n, -Z975), kiOben: nctIntervall(m, sd, n, Z975),
    naeherungUnten: naeherungIntervall(unten, sd, n, -Z975), naeherungOben: naeherungIntervall(oben, sd, n, Z975), shapiroP: p, hinweise: p < 0.05 ? ['nicht-normal'] : []
  };
}

/* ------------------------------------------------------------ Box-Cox */
const transformiere = (x: number[], l: number): number[] => (Math.abs(l) < 1e-12 ? x.map(Math.log) : x.map(v => (v ** l - 1) / l));
const rueck = (z: number, l: number): number => {
  if (Math.abs(l) < 1e-12) return Math.exp(z);
  const b = l * z + 1;
  return b > 0 ? b ** (1 / l) : l > 0 ? 0 : Infinity;
};
/** Profil-Log-Likelihood L(λ) = −(n/2)·ln σ̂²(λ) + (λ − 1)·Σ ln xᵢ; σ̂² = Varianz mit Nenner n der transformierten Werte. */
function profil(x: number[], l: number, slog: number): number {
  const z = transformiere(x, l), m = mittelVon(z), v = z.reduce((a, b) => a + (b - m) ** 2, 0) / x.length;
  return -(x.length / 2) * Math.log(v) + (l - 1) * slog;
}
export interface BoxCox { lambda: number; lambdaKi: [number, number]; loglik: number }
/**
 * λ aus der Profil-Likelihood auf [−3; 3] mit dem 95-%-Intervall der Likelihood (L(λ) ≥ L(λ̂) − qchisq(0,95; 1)/2).
 * Als Schrittfolge geschrieben (`yield` nach jeder Auswertung der Likelihood): `boxCox` läuft sie in einem Zug, `boxCoxAsync` in Häppchen mit Pausen für die Lade-Animation.
 */
function* boxCoxLauf(x: number[]): Generator<void, BoxCox | { fehler: 'nicht-positiv' }> {
  if (!x.length || x.some(v => !(v > 0))) return { fehler: 'nicht-positiv' };
  const slog = x.reduce((a, v) => a + Math.log(v), 0), f = (l: number) => profil(x, l, slog);
  // grob suchen, dann Goldener Schnitt im besten Teilstück
  let best = -3, bw = f(-3);
  yield;
  const N = 240;
  for (let i = 1; i <= N; i++) { const l = -3 + (6 * i) / N, w = f(l); if (w > bw) { bw = w; best = l; } yield; }
  let a = Math.max(-3, best - 6 / N), b = Math.min(3, best + 6 / N);
  const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a), d = a + g * (b - a), fc = f(c), fd = f(d);
  for (let i = 0; i < 200 && b - a > 1e-13; i++) { if (fc > fd) { b = d; d = c; fd = fc; c = b - g * (b - a); fc = f(c); } else { a = c; c = d; fc = fd; d = a + g * (b - a); fd = f(d); } yield; }
  const lh = (a + b) / 2, lmax = f(lh), ziel = lmax - CHI95 / 2;
  function* nullstelle(innen: number, aussen: number): Generator<void, number> {
    if (f(aussen) >= ziel) return aussen;                   // das Intervall reicht bis an den Rand
    let i0 = innen, a0 = aussen;
    for (let i = 0; i < 200 && Math.abs(i0 - a0) > 1e-13; i++) { const m = (i0 + a0) / 2; if (f(m) >= ziel) i0 = m; else a0 = m; yield; }
    return (i0 + a0) / 2;
  }
  const lo = yield* nullstelle(lh, -3), hi = yield* nullstelle(lh, 3);
  return { lambda: lh, lambdaKi: [lo, hi], loglik: lmax };
}
export function boxCox(x: number[]): BoxCox | { fehler: 'nicht-positiv' } {
  const lauf = boxCoxLauf(x);
  let r = lauf.next();
  while (!r.done) r = lauf.next();
  return r.value;
}
/** Wie `boxCox`, aber in Häppchen von etwa 25 ms mit Pausen dazwischen (die Seite bleibt bedienbar, die Lade-Animation läuft). `weiter() === false` bricht ab (Ergebnis `null`). */
export async function boxCoxAsync(x: number[], weiter: () => boolean = () => true): Promise<BoxCox | { fehler: 'nicht-positiv' } | null> {
  const lauf = boxCoxLauf(x);
  let uhr = Date.now(), r = lauf.next();
  while (!r.done) {
    if (Date.now() - uhr > 25) { await new Promise<void>(res => setTimeout(res, 0)); if (!weiter()) return null; uhr = Date.now(); }
    r = lauf.next();
  }
  return r.value;
}
export interface Grenze { zt: number; ztKi: [number, number]; orig: number; origKi: [number, number] }
export interface BoxCoxErgebnis { lambda: number; mittelZ: number; sdZ: number; shapiroP: number; unten: Grenze; oben: Grenze }
/**
 * Die Grenzen nach Box-Cox mit gegebenem oder geschätztem λ: auf der transformierten Skala mittelZ ∓ z·sdZ mit exaktem Konfidenzintervall, dann zurückgerechnet (monoton, also gültig).
 * (x^λ − 1)/λ ist für jedes λ streng steigend (auch bei λ < 0): unten bleibt unten, die Reihenfolge wird nie getauscht.
 * Das Konfidenzintervall behandelt λ als bekannt (die Unsicherheit der Schätzung von λ steckt nicht darin).
 */
export function referenzBoxCox(x: (number | null)[], lambda?: number): BoxCoxErgebnis | { fehler: 'nicht-positiv' | 'n-zu-klein' } {
  const w = x.filter(endlich);
  if (w.some(v => !(v > 0))) return { fehler: 'nicht-positiv' };
  if (w.length < NORMAL_MIN_N) return { fehler: 'n-zu-klein' };
  const l = lambda ?? (boxCox(w) as BoxCox).lambda, z = transformiere(w, l), m = mittelVon(z), sd = sdVon(z, m), n = z.length;
  const grenze = (p: number): Grenze => {
    const zz = p < 0.5 ? -Z975 : Z975, g = m + zz * sd, ki = nctIntervall(m, sd, n, zz);
    return { zt: g, ztKi: ki, orig: rueck(g, l), origKi: [rueck(ki[0], l), rueck(ki[1], l)] };
  };
  const unten = grenze(0.025), oben = grenze(0.975);
  const sw = shapiroWilk(z);
  return { lambda: l, mittelZ: m, sdZ: sd, shapiroP: sw ? sw.p : 1, unten, oben };
}

/* ------------------------------------------------------------ Ausreißer-Hinweis */
export interface AusreisserHinweis { dr: { oben: number; unten: number }; verdacht: boolean; tukey: { unten: number[]; oben: number[] } }
/**
 * Nur ein HINWEIS nach CLSI: das Dixon-Verhältnis D/R (Abstand des verdächtigen Wertes zum Nachbarn geteilt durch die Spannweite; Verdacht ab 1/3) und die Tukey-Zäune (Q1 − 1,5·IQR, Q3 + 1,5·IQR, Quartile nach Typ 6),
 * mit `lambda` auf der Box-Cox-Skala. Er entfernt nie etwas; der Bereich wird immer mit allen Werten gerechnet. `tukey` nennt die Zeilen (1-basiert) außerhalb der Zäune.
 */
export function ausreisserHinweis(x: number[], o: { lambda?: number } = {}): AusreisserHinweis {
  const s = sortiert(x), n = s.length, spanne = n ? s[n - 1]! - s[0]! : 0;
  const dr = spanne > 0 && n >= 3 ? { oben: (s[n - 1]! - s[n - 2]!) / spanne, unten: (s[1]! - s[0]!) / spanne } : { oben: 0, unten: 0 };
  const werte = o.lambda === undefined ? x : transformiere(x, o.lambda);
  const q1 = quantil6(werte, 0.25), q3 = quantil6(werte, 0.75), iqr = q3 - q1, lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  const zeilen = (f: (v: number) => boolean) => werte.flatMap((v, i) => (f(v) ? [i + 1] : []));
  return { dr, verdacht: Math.max(dr.oben, dr.unten) >= 1 / 3 - 1e-12, tukey: Number.isFinite(iqr) ? { unten: zeilen(v => v < lo), oben: zeilen(v => v > hi) } : { unten: [], oben: [] } };
}

/* ------------------------------------------------------------ Gruppen */
/** Bereiche je Gruppe (Reihenfolge des ersten Auftretens); jede Gruppe mit eigenem n und eigener Mindestzahl. Zeilen ohne Wert oder ohne Gruppe fallen weg. */
export function referenzGruppen(x: (number | null)[], gruppe: string[]): { gruppe: string; rang: RangErgebnis; normal: NormalErgebnis }[] {
  const namen: string[] = [], je = new Map<string, (number | null)[]>();
  x.forEach((v, i) => {
    const g = gruppe[i]; if (g === undefined || g === null || g === '') return;
    if (!je.has(g)) { namen.push(g); je.set(g, []); }
    je.get(g)!.push(v);
  });
  return namen.map(g => ({ gruppe: g, rang: referenzRang(je.get(g)!), normal: referenzNormal(je.get(g)!) }));
}

/* ------------------------------------------------------------ Sätze */
/** Der Hinweis zu den Referenzpersonen (feste deutsche Fassung für Tests und Vergleiche; angezeigt wird `referenzHinweis()` in der Sprache der Seite). */
export const REFERENZ_HINWEIS = 'Der Bereich gilt nur, wenn die Werte von gesunden Referenzpersonen stammen, die nach festen Ein- und Ausschlusskriterien ausgewählt wurden. Werte von Patientinnen und Patienten geben keinen Referenzbereich.';
export const referenzHinweis = (): string => L('Der Bereich gilt nur, wenn die Werte von gesunden Referenzpersonen stammen, die nach festen Ein- und Ausschlusskriterien ausgewählt wurden. Werte von Patientinnen und Patienten geben keinen Referenzbereich.', 'The range only applies if the values come from healthy reference individuals who were selected by fixed inclusion and exclusion criteria. Values of patients do not give a reference range.');

/** Eine Zahl mit einer Stelle in der Sprache der Seite. */
const eins = (v: number): string => zahlDe(Number.isFinite(v) ? v : 0, 1);

/** Der ganze Satz zur Rangmethode (Fachblatt 4.9). */
export function satzReferenzRang(e: RangErgebnis, einheit = ''): string {
  const u = einheit ? ` ${einheit}` : '';
  if (e.fehler === 'keine-werte') return L('Es gibt keine Werte, aus denen sich ein Referenzbereich bestimmen ließe.', 'There are no values from which a reference range could be determined.');
  if (e.fehler === 'alle-gleich') return L('Alle Werte sind gleich. Daraus lässt sich kein Referenzbereich bestimmen.', 'All values are equal. No reference range can be determined from them.');
  if (e.unten === null || e.oben === null) return L(`Mit n = ${e.n} Referenzpersonen lässt sich nach der Rangmethode keine Grenze bestimmen: Dafür braucht es mindestens ${RANG_MIN_N_PUNKT} Werte.`, `With n = ${e.n} reference individuals no limit can be determined by the rank method: it needs at least ${RANG_MIN_N_PUNKT} values.`);
  const kopf = L(`Der Referenzbereich (2,5. bis 97,5. Perzentil) liegt bei ${eins(e.unten)} bis ${eins(e.oben)}${u} (n = ${e.n} Referenzpersonen; Rangmethode nach CLSI EP28-A3c).`,
    `The reference range (2.5th to 97.5th percentile) is ${eins(e.unten)} to ${eins(e.oben)}${u} (n = ${e.n} reference individuals; rank method after CLSI EP28-A3c).`);
  if (!e.ki) return `${kopf} ${L(`Ein 90-%-Konfidenzintervall der Grenzen nach der Rangmethode braucht mindestens ${RANG_MIN_N_KI} Werte; bei n = ${e.n} ist es nicht möglich.`, `A 90% confidence interval of the limits by the rank method needs at least ${RANG_MIN_N_KI} values; with n = ${e.n} it is not possible.`)}`;
  const k = e.ki;
  return `${kopf} ${L(`Das 90-%-Konfidenzintervall der unteren Grenze reicht von ${eins(k.unten[0])} bis ${eins(k.unten[1])}, das der oberen Grenze von ${eins(k.oben[0])} bis ${eins(k.oben[1])} (Ränge ${k.rangUnten[0]} bis ${k.rangUnten[1]} und ${k.rangOben[0]} bis ${k.rangOben[1]}).`,
    `The 90% confidence interval of the lower limit ranges from ${eins(k.unten[0])} to ${eins(k.unten[1])}, that of the upper limit from ${eins(k.oben[0])} to ${eins(k.oben[1])} (ranks ${k.rangUnten[0]} to ${k.rangUnten[1]} and ${k.rangOben[0]} to ${k.rangOben[1]}).`)}`;
}
