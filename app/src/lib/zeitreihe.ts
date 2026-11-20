/**
 * Zeitreihen einfach (Später, Welle S-E, Teil L7; Fachblatt SPAETER-E Abschnitt 3 und „Entscheidungen Opus (18.10.)“ 6).
 * Alles rechnet in JavaScript (kein R): Raster erkennen, Reihe aufbauen (Lücken bleiben Lücken, nie aufgefüllt), gleitender Mittelwert, linearer Trend mit 95-%-Intervall,
 * Autokorrelation (wie stats::acf), Ljung-Box, Durbin-Watson, Intervall mit effektiver Fallzahl (Santer et al. 2000) und klassische Zerlegung (wie stats::decompose).
 * Die Prognose (ARIMA, Glättung) rechnet R: engine/statable-prognose.R, Wahl und Sätze in prognose.ts. Die Sätze stehen in zeitreihesaetze.ts (hier mit ausgegeben, damit der Import einfach bleibt).
 * Sollwerte: scripts/spaeter-e-erwartet.R (R 4.6.1), Tests: zeitreihe.test.ts.
 */
import { tQuantil, chiQuadratP } from './verteilung';

export * from './zeitreihesaetze';
export * from './zeitreiheccf';
export type { ZeitCode } from './zeitreihesaetze';

export type Raster = 'monatlich' | 'vierteljaehrlich' | 'jaehrlich' | 'woechentlich' | 'taeglich' | 'ungleich' | 'zeilen';

/** Höchstzahl der Rasterplätze (Zeit). */
export const ZEIT_MAX = 50_000;

const PERIODE: Record<Raster, number> = { monatlich: 12, vierteljaehrlich: 4, jaehrlich: 1, woechentlich: 52, taeglich: 7, ungleich: 1, zeilen: 1 };

/* ---------------------------------------------------------------- Datum lesen (naiv, wie datumrechnen.ts) */
interface Dat { j: number; m: number; t: number; sek: number; tage: number; text: string }
const tageImMonat = (j: number, m: number) => [31, (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;
const vor1582 = (j: number, m: number, t: number) => j < 1582 || (j === 1582 && (m < 10 || (m === 10 && t < 15)));
function lies(x: unknown): Dat | null {
  if (typeof x !== 'string') return null;
  const r = /^\s*(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?\s*$/.exec(x);
  if (!r) return null;
  const [j, m, t] = [Number(r[1]), Number(r[2]), Number(r[3])], h = Number(r[4] ?? 0), mi = Number(r[5] ?? 0), se = Number(r[6] ?? 0);
  if (m < 1 || m > 12 || t < 1 || t > tageImMonat(j, m) || h > 23 || mi > 59 || se > 59 || vor1582(j, m, t)) return null;
  return { j, m, t, sek: h * 3600 + mi * 60 + se, tage: Math.round(Date.UTC(j, m - 1, t) / 86_400_000), text: `${r[1]}-${r[2]}-${r[3]}` };
}
const ggT = (a: number, b: number): number => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };
const monatPos = (d: Dat) => 12 * d.j + d.m;
const letzterTag = (d: Dat) => d.t === tageImMonat(d.j, d.m);

interface Lage { monat: boolean; g: number; tageSchritte: number[]; }
/** Abstände der sortierten, verschiedenen Zeitpunkte: monatsweise (gleicher Tag oder alle am Monatsende) mit größtem gemeinsamem Teiler, sonst in Tagen. */
function lageVon(d: Dat[]): Lage {
  const monat = d.length >= 2 && (d.every(x => x.t === d[0]!.t) || d.every(letzterTag));
  let g = 0;
  const tageSchritte: number[] = [];
  for (let i = 1; i < d.length; i++) { g = ggT(g, monatPos(d[i]!) - monatPos(d[i - 1]!)); tageSchritte.push(d[i]!.tage - d[i - 1]!.tage); }
  return { monat, g, tageSchritte };
}
function rasterAus(l: Lage): Raster {
  if (!l.tageSchritte.length) return 'ungleich';
  if (l.monat) { if (l.g > 0 && l.g % 12 === 0) return 'jaehrlich'; if (l.g > 0 && l.g % 3 === 0) return 'vierteljaehrlich'; return l.g === 1 ? 'monatlich' : 'ungleich'; }
  const n = l.tageSchritte.length, eins = l.tageSchritte.filter(x => x === 1).length, sieben = l.tageSchritte.filter(x => x === 7).length;
  if (eins >= 0.9 * n) return 'taeglich';
  if (sieben >= 0.9 * n && l.tageSchritte.every(x => x % 7 === 0)) return 'woechentlich';
  return 'ungleich';
}
/** Das Raster der Zeitpunkte (aufsteigend, verschieden; ISO-Text, mit Uhrzeit möglich) und die Periode der Saison (12, 4, 1, 52, 7; ungleich: 1). Wirft nie. */
export function rasterErkennen(datum: string[]): { raster: Raster; periode: number } {
  const d = datum.map(lies).filter((x): x is Dat => !!x);
  const raster = rasterAus(lageVon(d));
  return { raster, periode: PERIODE[raster] };
}
/** Passt ein erzwungenes Raster zu den Zeitpunkten? */
function rasterPasst(r: Raster, l: Lage): boolean {
  if (r === 'ungleich') return true;
  if (r === 'taeglich') return true;
  if (r === 'woechentlich') return l.tageSchritte.every(x => x % 7 === 0);
  if (!l.monat) return false;
  if (r === 'monatlich') return l.g >= 1;
  if (r === 'vierteljaehrlich') return l.g > 0 && l.g % 3 === 0;
  if (r === 'jaehrlich') return l.g > 0 && l.g % 12 === 0;
  return false;
}

/* ---------------------------------------------------------------- Reihe aufbauen */
export type ReiheCode = 'zu-kurz' | 'doppelt' | 'zu-viele-ungueltig' | 'uhrzeit' | 'periode' | 'raster-passt-nicht' | 'zu-lang';
export interface ReiheOk { ok: true; raster: Raster; periode: number; t: number[]; y: (number | null)[]; n: number; luecken: number; anteilLuecken: number; ausgeschlossen: number; rueckwaerts: boolean; erster: string; letzter: string }
export type ReiheErg = ReiheOk | { ok: false; code: ReiheCode; ausgeschlossen?: number };
const zahlOderNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * Baut die Reihe: `datum` null heißt „Reihenfolge der Zeilen“ (Periode aus `opt.periode`, 1 ≤ Periode ≤ n/2). Mit Datum: ungültige, leere und Daten vor dem 15.10.1582 sind ausgeschlossen (gezählt;
 * mehr als 5 % ungültig sperrt), die Zeilen werden stabil aufsteigend sortiert, Zeitpunkte auf dem Raster, fehlende Plätze sind Lücken (`null`), nie aufgefüllt.
 * Reihenfolge der Prüfungen: ungültig, Uhrzeit, doppelt, zu kurz. Ungleiche Abstände: `t` = Tage seit dem ersten Zeitpunkt, `y` ohne Lücken.
 */
export function reiheAufbauen(datum: (string | null)[] | null, wert: (number | null)[], opt: { raster?: Raster; periode?: number } = {}): ReiheErg {
  const y0 = wert.map(zahlOderNull);
  if (datum === null) {
    const n = y0.length, nWerte = y0.filter(v => v !== null).length;
    if (nWerte < 10) return { ok: false, code: 'zu-kurz' };
    if (n > ZEIT_MAX) return { ok: false, code: 'zu-lang' };
    const p = opt.periode ?? 1;
    if (!Number.isInteger(p) || p < 1 || p > n / 2) return { ok: false, code: 'periode' };
    return { ok: true, raster: 'zeilen', periode: p, t: y0.map((_, i) => i + 1), y: y0, n: nWerte, luecken: n - nWerte, anteilLuecken: n ? (n - nWerte) / n : 0, ausgeschlossen: 0, rueckwaerts: false, erster: '1', letzter: String(n) };
  }
  const zeilen: { d: Dat; y: number | null; i: number }[] = [];
  let aus = 0;
  datum.forEach((x, i) => { const d = lies(x); if (!d) aus++; else zeilen.push({ d, y: y0[i] ?? null, i }); });
  if (aus > 0.05 * datum.length) return { ok: false, code: 'zu-viele-ungueltig', ausgeschlossen: aus };
  if (new Set(zeilen.map(z => z.d.sek)).size > 1) return { ok: false, code: 'uhrzeit' };
  let rueck = false;
  if (zeilen.length > 1) { let fallend = false, steigend = false; for (let k = 1; k < zeilen.length; k++) { if (zeilen[k]!.d.tage < zeilen[k - 1]!.d.tage) fallend = true; else if (zeilen[k]!.d.tage > zeilen[k - 1]!.d.tage) steigend = true; } rueck = fallend && !steigend; }
  const sortiert = [...zeilen].sort((a, b) => a.d.tage - b.d.tage || a.i - b.i);
  for (let k = 1; k < sortiert.length; k++) if (sortiert[k]!.d.tage === sortiert[k - 1]!.d.tage) return { ok: false, code: 'doppelt' };
  const nWerte = sortiert.filter(z => z.y !== null).length;
  if (nWerte < 10) return { ok: false, code: 'zu-kurz' };
  const ds = sortiert.map(z => z.d), lage = lageVon(ds);
  const raster = opt.raster ?? rasterAus(lage);
  if (opt.raster && !rasterPasst(opt.raster, lage)) return { ok: false, code: 'raster-passt-nicht' };
  const erster = ds[0]!.text, letzter = ds[ds.length - 1]!.text;
  if (raster === 'ungleich') {
    const t = sortiert.map(z => z.d.tage - ds[0]!.tage), y = sortiert.map(z => z.y);
    return { ok: true, raster, periode: 1, t, y, n: nWerte, luecken: 0, anteilLuecken: 0, ausgeschlossen: aus, rueckwaerts: rueck, erster, letzter };
  }
  const pos = (d: Dat) => (raster === 'monatlich' ? monatPos(d) - monatPos(ds[0]!) : raster === 'vierteljaehrlich' ? (monatPos(d) - monatPos(ds[0]!)) / 3 : raster === 'jaehrlich' ? (monatPos(d) - monatPos(ds[0]!)) / 12
    : raster === 'woechentlich' ? (d.tage - ds[0]!.tage) / 7 : d.tage - ds[0]!.tage);
  const T = pos(ds[ds.length - 1]!) + 1;
  if (!Number.isInteger(T) || T > ZEIT_MAX) return { ok: false, code: T > ZEIT_MAX ? 'zu-lang' : 'raster-passt-nicht' };
  const y: (number | null)[] = Array(T).fill(null);
  for (const z of sortiert) y[pos(z.d)] = z.y;
  const luecken = y.filter(v => v === null).length;
  return { ok: true, raster, periode: PERIODE[raster], t: y.map((_, i) => i + 1), y, n: nWerte, luecken, anteilLuecken: luecken / T, ausgeschlossen: aus, rueckwaerts: rueck, erster, letzter };
}

/* ---------------------------------------------------------------- Gleitender Mittelwert */
/** Zentrierter gleitender Mittelwert. k ungerade: Mittel von k Werten; k gerade: 2 × k-Mittel (Randgewichte ½, wie decompose). Ränder und Fenster mit Lücke: null (nie aufgefüllt). */
export function gleitenderMittelwert(y: (number | null)[], k: number): (number | null)[] {
  const n = y.length;
  if (!Number.isInteger(k) || k < 1) return y.map(() => null);
  if (k === 1) return y.map(v => (v === null || !Number.isFinite(v) ? null : v));
  const aus: (number | null)[] = Array(n).fill(null);
  const h = Math.floor(k / 2), gerade = k % 2 === 0;
  for (let i = h; i < n - h; i++) {
    let summe = 0, ok = true;
    for (let j = -h; j <= h; j++) {
      const v = y[i + j];
      if (v === null || v === undefined || !Number.isFinite(v)) { ok = false; break; }
      summe += gerade && (j === -h || j === h) ? 0.5 * v : v;
    }
    if (ok) aus[i] = summe / k;
  }
  return aus;
}

/* ---------------------------------------------------------------- Linearer Trend */
export interface ZeitTrend { n: number; a: number; b: number; seA: number; seB: number; df: number; kiB: [number, number]; r2: number; resid: (number | null)[] }
/** y = a + b·t mit t = Position (Standard 1 … Länge, bei Lücken die WAHRE Position); 95-%-Intervall aus t(n − 2). Lücken (null) bleiben Lücken. Wirft nie. */
export function zeitTrend(y: (number | null)[], t?: number[]): ZeitTrend {
  const pos = t ?? y.map((_, i) => i + 1);
  const pt: { x: number; v: number; i: number }[] = [];
  y.forEach((v, i) => { if (v !== null && v !== undefined && Number.isFinite(v)) pt.push({ x: pos[i] ?? i + 1, v, i }); });
  const n = pt.length, resid: (number | null)[] = Array(y.length).fill(null);
  if (n < 2) return { n, a: n ? pt[0]!.v : 0, b: 0, seA: NaN, seB: NaN, df: n - 2, kiB: [NaN, NaN], r2: 0, resid };
  const xm = pt.reduce((s, p) => s + p.x, 0) / n, ym = pt.reduce((s, p) => s + p.v, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of pt) { sxx += (p.x - xm) ** 2; sxy += (p.x - xm) * (p.v - ym); syy += (p.v - ym) ** 2; }
  const b = sxx > 0 ? sxy / sxx : 0, a = ym - b * xm;
  let sse = 0;
  for (const p of pt) { const e = p.v - a - b * p.x; resid[p.i] = e; sse += e * e; }
  const df = n - 2;
  if (df < 1 || sxx <= 0) return { n, a, b, seA: NaN, seB: NaN, df, kiB: [NaN, NaN], r2: syy > 0 ? 1 - sse / syy : 0, resid };
  const s2 = sse / df, seB = Math.sqrt(s2 / sxx), seA = Math.sqrt(s2 * (1 / n + (xm * xm) / sxx)), tq = tQuantil(0.975, df);
  return { n, a, b, seA, seB, df, kiB: [b - tq * seB, b + tq * seB], r2: syy > 0 ? 1 - sse / syy : 0, resid };
}

/* ---------------------------------------------------------------- Autokorrelation */
/** Autokorrelation r_1 … r_lagMax wie stats::acf (Mittel ohne Lücken; bei Lücken Summe der Paare / (Paare + Lag), „na.pass“). Nie NaN: ohne Paare oder ohne Streuung 0. */
export function zeitAcf(x: (number | null)[], lagMax: number): number[] {
  const n = x.length;
  if (!n || lagMax < 1) return [];
  const gut = x.map(v => (v !== null && v !== undefined && Number.isFinite(v) ? v : null));
  const nv = gut.filter(v => v !== null).length;
  if (!nv) return Array(lagMax).fill(0);
  const m = gut.reduce<number>((s, v) => s + (v ?? 0), 0) / nv, z = gut.map(v => (v === null ? null : v - m));
  const ck = (k: number) => {
    let summe = 0, paare = 0;
    for (let i = 0; i + k < n; i++) { const a = z[i + k], b = z[i]; if (a !== null && a !== undefined && b !== null && b !== undefined) { paare++; summe += a * b; } }
    return paare ? summe / (paare + k) : NaN;
  };
  const c0 = ck(0);
  return Array.from({ length: lagMax }, (_, j) => { const c = ck(j + 1); return Number.isFinite(c) && Number.isFinite(c0) && c0 > 0 ? c / c0 : 0; });
}
/**
 * Partielle Autokorrelation aus den Werten von `zeitAcf` (Durbin-Levinson, wie stats::pacf): der Zusammenhang bei einer Verzögerung, nachdem die kürzeren herausgerechnet sind.
 * Gibt null, wenn ein Wert nicht endlich ist oder einen Betrag von 1 oder mehr hat (bei Lücken passen die vorhandenen Paare dann nicht zusammen); dann zeigt Statable keine PACF.
 */
export function zeitPacf(acf: number[]): number[] | null {
  const K = acf.length;
  if (!K) return [];
  if (acf.some(v => !Number.isFinite(v))) return null;
  const aus: number[] = [];
  let phi: number[] = [];
  for (let k = 1; k <= K; k++) {
    let zaehler = acf[k - 1]!, nenner = 1;
    for (let j = 1; j < k; j++) { zaehler -= phi[j - 1]! * acf[k - j - 1]!; nenner -= phi[j - 1]! * acf[j - 1]!; }
    const a = zaehler / nenner;
    if (!Number.isFinite(a) || Math.abs(a) >= 1) return null;
    const neu = phi.map((v, j) => v - a * phi[k - 2 - j]!);
    neu.push(a); phi = neu; aus.push(a);
  }
  return aus;
}
/** Grenze der Stäbe im Korrelogramm: ±1,96/√n (für weißes Rauschen). */
export const acfGrenze = (n: number): number => 1.96 / Math.sqrt(n);
/** Zahl der Verzögerungen im Korrelogramm: min(⌊n/4⌋, 36), bei Saison mindestens 2·Periode, mindestens 5, höchstens n − 1. */
export const acfLagMax = (n: number, periode: number): number => Math.max(1, Math.min(Math.max(Math.min(Math.floor(n / 4), 36), periode > 1 ? 2 * periode : 0, 5), n - 1));
/** Verzögerungen für Ljung-Box: ohne Saison min(10, ⌊n/5⌋), mit Saison min(2·Periode, ⌊n/5⌋), mindestens 1. */
export const ljungBoxH = (n: number, periode: number): number => Math.max(1, periode > 1 ? Math.min(2 * periode, Math.floor(n / 5)) : Math.min(10, Math.floor(n / 5)));
/** Ljung-Box: Q = n(n + 2)·Σ r_k²/(n − k), χ² mit h = Länge von r Freiheitsgraden (wie Box.test mit fitdf = 0). */
export function ljungBox(r: number[], n: number): { q: number; h: number; p: number } {
  const h = r.length;
  let summe = 0;
  r.forEach((v, i) => { summe += (v * v) / (n - (i + 1)); });
  const q = n * (n + 2) * summe;
  return { q, h, p: h ? chiQuadratP(q, h) : 1 };
}
/** Durbin-Watson d = Σ(e_t − e_{t−1})² / Σ e_t² (nahe 2: keine Autokorrelation, nahe 0: starke positive). Kein p. */
export function durbinWatson(e: number[]): number {
  let z = 0, nenner = 0;
  e.forEach((v, i) => { nenner += v * v; if (i) z += (v - e[i - 1]!) ** 2; });
  return nenner > 0 ? z / nenner : 2;
}
/** Intervall der Steigung mit effektiver Fallzahl (Santer et al. 2000): nEff = min(n, n(1 − r₁)/(1 + r₁)), mindestens 3; SE·√(n/nEff); t(nEff − 2). Bei r₁ ≤ 0 keine Korrektur. */
export function trendKiEff(trend: Pick<ZeitTrend, 'b' | 'seB' | 'kiB' | 'df'>, r1: number, n: number): { nEff: number; seB: number; kiB: [number, number] } {
  if (!(r1 > 0)) {
    const tq = tQuantil(0.975, n - 2), se = trend.seB;
    return { nEff: n, seB: se, kiB: [trend.b - tq * se, trend.b + tq * se] };
  }
  const nEff = Math.min(n, Math.max(3, (n * (1 - r1)) / (1 + r1))), se = trend.seB * Math.sqrt(n / nEff), tq = tQuantil(0.975, nEff - 2);
  return { nEff, seB: se, kiB: [trend.b - tq * se, trend.b + tq * se] };
}

/* ---------------------------------------------------------------- Klassische Zerlegung */
export interface Zerlegung { figur: number[]; trend: (number | null)[]; rest: (number | null)[] }
/**
 * Klassische Zerlegung wie stats::decompose (Trend = zentriertes gleitendes Mittel der Periodenlänge, Figur = Mittel je Position von y − Trend bzw. y / Trend, danach zentriert bzw. auf Mittel 1).
 * Wirft bei Lücken, Periode unter 2, weniger als zwei vollen Perioden und (multiplikativ) bei Werten ≤ 0.
 */
export function zerlegung(y: number[], periode: number, art: 'additiv' | 'multiplikativ'): Zerlegung {
  const n = y.length;
  if (!Number.isInteger(periode) || periode < 2) throw new Error('Periode unter 2');
  if (n < 2 * periode) throw new Error('weniger als zwei volle Perioden');
  if (y.some(v => typeof v !== 'number' || !Number.isFinite(v))) throw new Error('Lücken');
  if (art === 'multiplikativ' && y.some(v => v <= 0)) throw new Error('Werte kleiner oder gleich 0');
  const trend = gleitenderMittelwert(y, periode);
  const saison = y.map((v, i) => { const t = trend[i]; return t === null || t === undefined ? null : art === 'additiv' ? v - t : v / t; });
  const figur = Array.from({ length: periode }, (_, j) => {
    let s = 0, c = 0;
    for (let i = j; i < n; i += periode) { const v = saison[i]; if (v !== null && v !== undefined) { s += v; c++; } }
    return c ? s / c : 0;
  });
  const m = figur.reduce((a, b) => a + b, 0) / periode, f = figur.map(v => (art === 'additiv' ? v - m : v / m));
  const rest = y.map((v, i) => { const t = trend[i]; return t === null || t === undefined ? null : art === 'additiv' ? v - f[i % periode]! - t : v / (f[i % periode]! * t); });
  return { figur: f, trend, rest };
}
/** Additiv oder multiplikativ? r = Korrelation von Jahresmittel und Jahresspannweite über die vollen Perioden; multiplikativ nur, wenn alle Werte > 0 und r > 0,5. */
export function zerlegungsArt(y: number[], periode: number): { r: number; art: 'additiv' | 'multiplikativ' } {
  const volle = periode > 0 ? Math.floor(y.length / periode) : 0;
  let r = 0;
  if (volle >= 3) {
    const mw: number[] = [], sp: number[] = [];
    for (let j = 0; j < volle; j++) { const teil = y.slice(j * periode, (j + 1) * periode); mw.push(teil.reduce((a, b) => a + b, 0) / periode); sp.push(Math.max(...teil) - Math.min(...teil)); }
    const am = mw.reduce((a, b) => a + b, 0) / volle, bm = sp.reduce((a, b) => a + b, 0) / volle;
    let sab = 0, saa = 0, sbb = 0;
    for (let j = 0; j < volle; j++) { sab += (mw[j]! - am) * (sp[j]! - bm); saa += (mw[j]! - am) ** 2; sbb += (sp[j]! - bm) ** 2; }
    r = saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0;
  }
  return { r, art: y.every(v => v > 0) && r > 0.5 ? 'multiplikativ' : 'additiv' };
}

/* ---------------------------------------------------------------- Was die Karte kann */
import type { ZeitCode } from './zeitreihesaetze';
export interface KannEin { raster: Raster; periode: number; n: number; T: number; luecken: number; anteilLuecken: number; minWert: number; alleGleich?: boolean }
export interface Kann {
  trend: boolean; acf: boolean; ljungBox: boolean; durbinWatson: boolean; zerlegung: boolean; multiplikativ: boolean;
  hinweise: ZeitCode[]; gruende: Partial<Record<'trend' | 'acf' | 'ljungBox' | 'durbinWatson' | 'zerlegung' | 'multiplikativ', ZeitCode>>;
}
/** Welche Teile der Karte laufen, welche gesperrt sind (mit Grund) und welche Hinweise gelten. Fachblatt 3.3, 3.5. */
export function zeitreiheKann(e: KannEin): Kann {
  const gruende: Kann['gruende'] = {}, hinweise: ZeitCode[] = [];
  const o: Kann = { trend: true, acf: true, ljungBox: true, durbinWatson: true, zerlegung: true, multiplikativ: true, hinweise, gruende };
  const sperre = (f: keyof Kann['gruende'], c: ZeitCode) => { o[f] = false; gruende[f] = gruende[f] ?? c; };
  if (e.n < 10) { for (const f of ['trend', 'acf', 'ljungBox', 'durbinWatson', 'zerlegung'] as const) sperre(f, 'zu-kurz'); }
  else if (e.alleGleich) { for (const f of ['trend', 'acf', 'ljungBox', 'durbinWatson', 'zerlegung'] as const) sperre(f, 'alle-gleich'); }
  if (e.raster === 'ungleich') { for (const f of ['acf', 'ljungBox', 'durbinWatson', 'zerlegung'] as const) sperre(f, 'ungleich'); }
  if (e.anteilLuecken > 0.1) sperre('acf', 'zu-viele-luecken');
  if (e.luecken > 0) { for (const f of ['ljungBox', 'durbinWatson', 'zerlegung'] as const) sperre(f, 'luecken'); }
  if (e.anteilLuecken > 0.1) { for (const f of ['ljungBox', 'durbinWatson'] as const) sperre(f, 'zu-viele-luecken'); }
  if (e.periode < 2 || e.raster === 'jaehrlich') sperre('zerlegung', 'keine-saison');
  if (e.raster === 'woechentlich') { o.zerlegung = false; gruende.zerlegung = 'woche'; }
  if (e.T < 2 * e.periode) sperre('zerlegung', 'zu-kurz-fuer-zerlegung');
  if (!o.zerlegung) o.multiplikativ = false;
  else if (!(e.minWert > 0)) { o.multiplikativ = false; gruende.multiplikativ = 'nicht-positiv'; }
  if (e.n >= 10 && e.n < 20) hinweise.push('kurz');
  if (e.luecken > 0 && o.acf) hinweise.push('acf-luecken');
  if (o.zerlegung && e.T / e.periode < 3) hinweise.push('wenige-perioden');
  return o;
}
