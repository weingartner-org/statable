/**
 * Bedingte und serielle Mediation (PROCESS-Modelle 7, 14 und 6 von Hayes) als Option der Karte Mediation (Später, Welle S-D, G14).
 * Fachblatt: docs/fachblaetter/SPAETER-D-PSYCHOLOGIE-MIXED-RECHNER.md, Abschnitt 1 und „Entscheidungen Opus“ 1.
 *
 * - PSPP `REGRESSION` rechnet die Gleichungen (je Gleichung ein Lauf, nur vollständige Fälle, zentrierte Hilfsspalten per TEMPORARY wie bei der Moderation).
 * - Die Effekte (bedingte indirekte Effekte, Index der moderierten Mediation, Wege und Kontraste bei zwei Mediatoren) rechnet dieses Modul in JS aus den Koeffizienten.
 * - EIN gemeinsamer Bootstrap über alle Gleichungen: dieselben Ziehungen (Fall-Bootstrap, alle Gleichungen in jeder Ziehung neu) liefern alle Effekte;
 *   B = 5000, Startwert 20261008, Perzentil-Intervall, BCa wählbar (Quantile und BCa wie das R-Paket boot, lib/bootstrap.ts). Die W-Werte bleiben in allen Ziehungen fest.
 * - Der Index der moderierten Mediation ist der Test, die bedingten Effekte sind Beschreibung (Hayes 2015). Für indirekte Effekte, Index und Kontraste gibt es kein p, nur das Intervall.
 * - Zentrierung: beide Faktoren eines Produkts am Mittelwert der vollständigen Fälle; sie ändert die Effekte nicht, aber die Einzelkoeffizienten (sie gelten dann bei W = Mittelwert).
 * - Moderatorwerte: 16./50./84. Perzentil nach Typ 6 (nie Typ 7), Mittelwert ± 1 SD oder eigene Werte.
 * Geprüft gegen R (lm, boot, lavaan) und PSPP: prozess.test.ts, scripts/spaeter-d-erwartet.R.
 */
import type { OutputItem } from '../engine/types';
import { Ziehung, intervall, hesterberg, type BootArt, type BootIntervall, type BootWarnung } from './bootstrap';
import { quantilTyp6 } from './klassieren';
import { regressionsModelle, type RegModell } from './regressionlesen';
import { tSchwaenze } from './verteilung';
import { L } from './sitzung.svelte';

export type Modell = 6 | 7 | 14;
export interface ProzessDaten { x: number[]; m: number[]; y: number[]; w?: number[]; m2?: number[] }
export type Rolle = 'x' | 'm' | 'y' | 'w' | 'm2';

export const PROZESS_B = 5000;
export const PROZESS_STARTWERT = 20261008;

/** Namen der Effekte in der Reihenfolge, in der sie berechnet und im Bootstrap gezogen werden. */
export function effektNamen(modell: Modell, nW = 0): string[] {
  if (modell === 6) return ['ind1', 'ind2', 'ind3', 'summe', 'c1', 'c2', 'c3', 'direkt', 'gesamt'];
  return ['index', ...Array.from({ length: nW }, (_, i) => `bedingt${i + 1}`)];
}

const mittel = (a: ArrayLike<number>) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]!; return s / a.length; };
const streuung = (a: number[]) => { const m = mittel(a); let s = 0; for (const v of a) s += (v - m) ** 2; return Math.sqrt(s / (a.length - 1)); };

/* ------------------------------------------------------------------ Kleinste Quadrate */

interface Anpassung { n: number; b: number[]; b0: number; mw: number[]; my: number; S: number[][]; syy: number; Lm: number[][]; r: number[] }

/** OLS mit Konstante für die Zeilen `idx` (oder alle). `null` bei Rangmangel (Spalte ohne Streuung, fast gleiche Spalten), nie eine Ausnahme. */
function ols(cols: number[][], y: number[], idx?: Int32Array): Anpassung | null {
  const p = cols.length, n = idx ? idx.length : y.length;
  if (n < p + 2) return null;
  const mw = new Array<number>(p).fill(0); let my = 0;
  for (let a = 0; a < n; a++) { const i = idx ? idx[a]! : a; my += y[i]!; for (let c = 0; c < p; c++) mw[c]! += cols[c]![i]!; }
  for (let c = 0; c < p; c++) mw[c]! /= n; my /= n;
  const S: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0)), r = new Array<number>(p).fill(0), roh = new Array<number>(p).fill(0), dd = new Array<number>(p).fill(0);
  let syy = 0;
  for (let a = 0; a < n; a++) {
    const i = idx ? idx[a]! : a, dy = y[i]! - my; syy += dy * dy;
    for (let c = 0; c < p; c++) { const v = cols[c]![i]!; roh[c]! += v * v; dd[c] = v - mw[c]!; r[c]! += dd[c]! * dy; }
    for (let c = 0; c < p; c++) for (let e = c; e < p; e++) S[c]![e]! += dd[c]! * dd[e]!;
  }
  for (let c = 0; c < p; c++) {
    if (!(S[c]![c]! > 1e-20 * roh[c]!) || !Number.isFinite(S[c]![c]!)) return null;   // Spalte ohne Streuung (auch „fast konstant“ durch Rundung)
    for (let e = 0; e < c; e++) S[c]![e] = S[e]![c]!;
  }
  const Lm: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0)), diag = S.map((z, c) => z[c]!);
  for (let c = 0; c < p; c++) {
    for (let e = 0; e <= c; e++) {
      let sum = S[c]![e]!; for (let k = 0; k < e; k++) sum -= Lm[c]![k]! * Lm[e]![k]!;
      if (c === e) { if (!(sum > 1e-10 * diag[c]!)) return null; Lm[c]![c] = Math.sqrt(sum); } else Lm[c]![e] = sum / Lm[e]![e]!;
    }
  }
  const zw = new Array<number>(p).fill(0), b = new Array<number>(p).fill(0);
  for (let c = 0; c < p; c++) { let sum = r[c]!; for (let k = 0; k < c; k++) sum -= Lm[c]![k]! * zw[k]!; zw[c] = sum / Lm[c]![c]!; }
  for (let c = p - 1; c >= 0; c--) { let sum = zw[c]!; for (let k = c + 1; k < p; k++) sum -= Lm[k]![c]! * b[k]!; b[c] = sum / Lm[c]![c]!; }
  let b0 = my; for (let c = 0; c < p; c++) b0 -= b[c]! * mw[c]!;
  return { n, b, b0, mw, my, S, syy, Lm, r };
}

/** Inverse der Kreuzproduktmatrix S aus der Cholesky-Zerlegung (p ≤ 4). */
function inverse(a: Anpassung): number[][] {
  const p = a.b.length, inv: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  for (let j = 0; j < p; j++) {
    const z = new Array<number>(p).fill(0), x = new Array<number>(p).fill(0);
    for (let c = 0; c < p; c++) { let sum = c === j ? 1 : 0; for (let k = 0; k < c; k++) sum -= a.Lm[c]![k]! * z[k]!; z[c] = sum / a.Lm[c]![c]!; }
    for (let c = p - 1; c >= 0; c--) { let sum = z[c]!; for (let k = c + 1; k < p; k++) sum -= a.Lm[k]![c]! * x[k]!; x[c] = sum / a.Lm[c]![c]!; }
    for (let c = 0; c < p; c++) inv[c]![j] = x[c]!;
  }
  return inv;
}

/* ------------------------------------------------------------------ Modelle: Spalten je Gleichung */

type GlKey = 'm' | 'm2' | 'y';
interface Gleichung { ziel: GlKey; terme: string[]; spalten: number[][]; y: number[] }

const mal = (a: number[], b: number[]) => a.map((v, i) => v * b[i]!);
const minus = (a: number[], c: number) => a.map(v => v - c);

/** Die Gleichungen des Modells. `zentriert`: die beiden Faktoren eines Produkts am Mittelwert (Anzeige, PSPP); roh: für den Bootstrap (gleiche Effekte, schneller). */
function gleichungen(modell: Modell, d: ProzessDaten, zentriert: boolean): Gleichung[] {
  const z = (v: number[]) => (zentriert ? minus(v, mittel(v)) : v);
  if (modell === 7) {
    const w = d.w!, xz = z(d.x), wz = z(w);
    return [{ ziel: 'm', terme: ['x', 'w', 'xw'], spalten: [xz, wz, mal(xz, wz)], y: d.m }, { ziel: 'y', terme: ['x', 'm'], spalten: [d.x, d.m], y: d.y }];
  }
  if (modell === 14) {
    const w = d.w!, mz = z(d.m), wz = z(w);
    return [{ ziel: 'm', terme: ['x'], spalten: [d.x], y: d.m }, { ziel: 'y', terme: ['x', 'm', 'w', 'mw'], spalten: [d.x, mz, wz, mal(mz, wz)], y: d.y }];
  }
  return [{ ziel: 'm', terme: ['x'], spalten: [d.x], y: d.m }, { ziel: 'm2', terme: ['x', 'm'], spalten: [d.x, d.m], y: d.m2! }, { ziel: 'y', terme: ['x', 'm', 'm2'], spalten: [d.x, d.m, d.m2!], y: d.y }];
}

/** Effekte aus den Koeffizienten (in der Reihenfolge von effektNamen). Bei 7 und 14 ist `wc` = W − (Mittelwert, wenn W in der Gleichung zentriert war); 6 braucht kein W. */
function effekteAus(modell: Modell, b: Record<GlKey, number[] | undefined>, wc: number[]): { effekte: number[]; direkt: number } {
  if (modell === 7) {
    const A = b.m!, B = b.y!, a1 = A[0]!, a3 = A[2]!, bb = B[1]!;
    return { effekte: [a3 * bb, ...wc.map(w => (a1 + a3 * w) * bb)], direkt: B[0]! };
  }
  if (modell === 14) {
    const a = b.m![0]!, B = b.y!, b1 = B[1]!, b3 = B[3]!;
    return { effekte: [a * b3, ...wc.map(w => a * (b1 + b3 * w))], direkt: B[0]! };
  }
  const A = b.m!, A2 = b.m2!, B = b.y!;
  const a1 = A[0]!, a2 = A2[0]!, d21 = A2[1]!, cp = B[0]!, b1 = B[1]!, b2 = B[2]!;
  const i1 = a1 * b1, i2 = a2 * b2, i3 = a1 * d21 * b2, su = i1 + i2 + i3;
  return { effekte: [i1, i2, i3, su, i1 - i2, i1 - i3, i2 - i3, cp, cp + su], direkt: cp };
}

export interface GleichungsErgebnis {
  terme: string[]; b: number[]; se: number[]; t: number[]; p: number[];
  konstante: { b: number; se: number; t: number; p: number }; r2: number; df: number;
}
export interface Schaetzung {
  modell: Modell; n: number; mittelW?: number; namen: string[]; effekte: number[]; direkt: number;
  /** Schlüssel „m2“ gibt es nur bei Modell 6 */
  gleichungen: Record<GlKey, GleichungsErgebnis>;
}

const pZwei = (t: number, df: number) => 2 * tSchwaenze(Math.abs(t), df).oben;

/** OLS in JS, zentriert wie das Fachblatt 1.3: Koeffizienten mit Standardfehler, t, p; dazu die Effekte. */
export function schaetze(modell: Modell, d: ProzessDaten, wWerte: number[] = []): Schaetzung {
  const n = d.x.length, gl = gleichungen(modell, d, true), ergebnisse = {} as Record<GlKey, GleichungsErgebnis>, b: Record<GlKey, number[] | undefined> = { m: undefined, m2: undefined, y: undefined };
  for (const g of gl) {
    const f = ols(g.spalten, g.y);
    if (!f) throw new Error(L('Die Gleichung lässt sich nicht berechnen (Spalte ohne Streuung oder fast gleiche Spalten).', 'The equation cannot be calculated (a column without variation or nearly identical columns).'));
    const p = g.spalten.length, df = f.n - p - 1, inv = inverse(f);
    let sse = f.syy; for (let c = 0; c < p; c++) sse -= f.b[c]! * f.r[c]!;
    sse = Math.max(sse, 0);
    const s2 = sse / df, se = f.b.map((_, c) => Math.sqrt(s2 * inv[c]![c]!));
    let q = 1 / f.n; for (let c = 0; c < p; c++) for (let e = 0; e < p; e++) q += f.mw[c]! * f.mw[e]! * inv[c]![e]!;
    const se0 = Math.sqrt(s2 * q), t = f.b.map((v, c) => v / se[c]!);
    ergebnisse[g.ziel] = { terme: g.terme, b: f.b, se, t, p: t.map(v => pZwei(v, df)), konstante: { b: f.b0, se: se0, t: f.b0 / se0, p: pZwei(f.b0 / se0, df) }, r2: f.syy > 0 ? 1 - sse / f.syy : NaN, df };
    b[g.ziel] = f.b;
  }
  const mw = modell === 6 ? undefined : mittel(d.w!);
  const { effekte, direkt } = effekteAus(modell, b, wWerte.map(w => w - (mw ?? 0)));
  return { modell, n, mittelW: mw, namen: effektNamen(modell, wWerte.length), effekte, direkt, gleichungen: ergebnisse };
}

/* ------------------------------------------------------------------ Bootstrap */

interface Plan { gl: Gleichung[] }
const plaene = new WeakMap<ProzessDaten, Map<Modell, Plan>>();
function planFuer(modell: Modell, d: ProzessDaten): Plan {
  let m = plaene.get(d); if (!m) plaene.set(d, (m = new Map()));
  let p = m.get(modell); if (!p) m.set(modell, (p = { gl: gleichungen(modell, d, false) }));
  return p;
}

/** Die Effekte für eine Ziehung (Zeilennummern mit Zurücklegen); Rangmangel: lauter NaN, nie 0 und keine Ausnahme. Rohe Spalten: gleiche Effekte wie zentriert. */
export function prozessEffekte(modell: Modell, d: ProzessDaten, indizes: Int32Array, wWerte: number[] = []): number[] {
  const { gl } = planFuer(modell, d), b: Record<GlKey, number[] | undefined> = { m: undefined, m2: undefined, y: undefined };
  for (const g of gl) { const f = ols(g.spalten, g.y, indizes); if (!f) return effektNamen(modell, wWerte.length).map(() => NaN); b[g.ziel] = f.b; }
  return effekteAus(modell, b, wWerte).effekte;
}

/** Jackknife: L[k][i] = (n − 1)(t0[k] − Effekt k ohne Fall i), die W-Werte fest - wie boot::empinf(type = "jack"). */
export function prozessJackknife(modell: Modell, d: ProzessDaten, wWerte: number[] = []): { t0: number[]; L: number[][] } {
  const n = d.x.length, t0 = prozessEffekte(modell, d, Int32Array.from({ length: n }, (_, i) => i), wWerte), L = t0.map(() => new Array<number>(n));
  const ohne = new Int32Array(n - 1);
  for (let i = 0; i < n; i++) {
    let k = 0; for (let j = 0; j < n; j++) if (j !== i) ohne[k++] = j;
    const e = prozessEffekte(modell, d, ohne, wWerte);
    for (let q = 0; q < t0.length; q++) L[q]![i] = (n - 1) * (t0[q]! - e[q]!);
  }
  return { t0, L };
}

/** EINE gemeinsame Ziehung für alle Effekte (Muster mediationZiehung): `ziehung.t` ist der erste Effekt, die übrigen stehen in `spalten`, Ziehung für Ziehung dieselben. */
export function prozessZiehung(modell: Modell, d: ProzessDaten, opt: { startwert?: number; B?: number; wWerte?: number[] } = {}): { ziehung: Ziehung; spalten: number[][]; namen: string[] } {
  const wWerte = opt.wWerte ?? [], namen = effektNamen(modell, wWerte.length), spalten: number[][] = namen.map(() => []);
  let erste = true;
  const ziehung = new Ziehung(d.x.length, idx => {
    const e = prozessEffekte(modell, d, idx, wWerte);
    if (erste) return e[0]!;   // der Aufruf für den Schätzer t0 zählt nicht als Ziehung
    for (let k = 1; k < e.length; k++) spalten[k]!.push(e[k]!);
    return e[0]!;
  }, { startwert: opt.startwert ?? PROZESS_STARTWERT, B: opt.B ?? PROZESS_B });
  erste = false;
  spalten[0] = ziehung.t;
  return { ziehung, spalten, namen };
}

export interface EffektIntervall { name: string; wert: number; lo: number | null; hi: number | null; art: BootArt; wunsch: BootArt; ungueltig: number; B: number; warnungen: BootWarnung[]; /** Standardabweichung der gültigen Ziehungen (Bootstrap-SE) */ se: number }

/** Je Effekt ein Intervall wie lib/bootstrap.ts `intervall`; BCa, das sich nicht berechnen lässt, fällt auf das Perzentil zurück (die Warnung bleibt stehen). */
export function intervalleAus(namen: string[], t0: number[], t: number[][], L: number[][] | null, art: BootArt, niveau = 0.95): EffektIntervall[] {
  return namen.map((name, k) => {
    let iv: BootIntervall = intervall(t[k]!, t0[k]!, art, niveau, L?.[k]);
    let effektiv: BootArt = art;
    if (art === 'bca' && (iv.lo === null || iv.hi === null)) {
      const p = intervall(t[k]!, t0[k]!, 'perzentil', niveau);
      effektiv = 'perzentil'; iv = { ...p, warnungen: [...new Set([...iv.warnungen, ...p.warnungen])] };
    }
    const gueltig = t[k]!.filter(Number.isFinite);
    return { name, wert: t0[k]!, lo: iv.lo, hi: iv.hi, art: effektiv, wunsch: art, ungueltig: iv.ungueltig, B: iv.B, warnungen: iv.warnungen, se: gueltig.length > 1 ? streuung(gueltig) : NaN };
  });
}

/* ------------------------------------------------------------------ Moderatorwerte */

export interface ModeratorWerte {
  regel: 'perzentil' | 'sd' | 'eigen' | 'zwei'; werte: number[]; perzentile?: number[]; beobachtet: boolean[]; ausserhalb: boolean[];
  /** die Perzentile fielen zusammen */ zusammen: boolean; /** nur EIN verschiedener Wert */ einzig: boolean; zwei: boolean;
}
const EPS = 1e-9;
const verschieden = (a: number[]) => { const s = [...a].sort((p, q) => p - q), aus: number[] = []; for (const v of s) if (!aus.length || Math.abs(v - aus.at(-1)!) > 1e-12 * Math.max(1, Math.abs(v))) aus.push(v); return aus; };

/**
 * 16./50./84. Perzentil nach Typ 6 (nie Typ 7), Mittelwert ± 1 SD oder eigene Werte.
 * Hat W genau zwei verschiedene Werte und liefern die Perzentile beide, gilt die Regel „zwei“ (die beiden Werte, kein Perzentil).
 * Fallen die Perzentile zusammen, stehen die VERSCHIEDENEN Werte da (`zusammen`); bei nur einem Wert ist `einzig` wahr (das Modell ist dann nicht sinnvoll).
 */
export function moderatorWerte(w: number[], regel: 'perzentil' | 'sd' | 'eigen', eigen: number[] = []): ModeratorWerte {
  const ver = verschieden(w), mn = ver[0] ?? NaN, mx = ver.at(-1) ?? NaN;
  const perzentile = [0.16, 0.5, 0.84].map(p => quantilTyp6(w, p));
  let werte: number[], r: ModeratorWerte['regel'] = regel, zusammen = false, zwei = false;
  if (regel === 'eigen') werte = verschieden(eigen.filter(Number.isFinite));
  else if (regel === 'sd') { const m = mittel(w), s = ver.length > 1 ? streuung(w) : 0; werte = verschieden([m - s, m, m + s]); }
  else {
    werte = verschieden(perzentile); zusammen = werte.length < 3;
    zwei = ver.length === 2 && werte.length === 2 && werte.every((v, i) => Math.abs(v - ver[i]!) <= EPS * Math.max(1, Math.abs(v)));
    if (zwei) r = 'zwei';
  }
  return {
    regel: r, werte, perzentile, zwei, zusammen, einzig: werte.length === 1,
    beobachtet: werte.map(v => ver.some(x => Math.abs(x - v) <= EPS * Math.max(1, Math.abs(v)))),
    ausserhalb: werte.map(v => v < mn - EPS * Math.max(1, Math.abs(mn)) || v > mx + EPS * Math.max(1, Math.abs(mx)))
  };
}

/** Die Wahl der Oberfläche: wie `moderatorWerte`, aber ein Moderator mit genau zwei Werten (zum Beispiel eine 0/1-Gruppe) zeigt immer BEIDE Werte (Regel „zwei“), auch wenn die Perzentile zusammenfallen. */
export function moderatorWerteWahl(w: number[], regel: 'perzentil' | 'sd' | 'eigen', eigen: number[] = []): ModeratorWerte {
  const ver = verschieden(w);
  if (regel !== 'eigen' && ver.length === 2) return { regel: 'zwei', werte: ver, perzentile: [0.16, 0.5, 0.84].map(p => quantilTyp6(w, p)), zwei: true, zusammen: false, einzig: false, beobachtet: [true, true], ausserhalb: [false, false] };
  return moderatorWerte(w, regel, eigen);
}

/* ------------------------------------------------------------------ Prüfung, vollständige Fälle, Befehl */

export type ProzessFehler = 'n-zu-klein' | 'w-konstant' | 'm-zwei-werte' | 'y-zwei-werte' | 'rolle-doppelt';
export type ProzessHinweis = 'n-unter-30' | 'n-unter-50';

/** Ränder: gesperrt mit Code, dazu Hinweise. n < 10 gesperrt, n < 30 Hinweis, n < 50 Hinweis bei Wechselwirkung (7, 14); M, M2 oder Y mit nur zwei Werten gesperrt (X mit zwei Werten ist erlaubt). */
export function prozessPruefung(modell: Modell, d: Partial<ProzessDaten>, namen?: Partial<Record<Rolle, string>>): { fehler: ProzessFehler | null; hinweise: ProzessHinweis[] } {
  const hinweise: ProzessHinweis[] = [];
  if (namen) { const gew = (Object.keys(namen) as Rolle[]).filter(k => namen[k] && (modell === 6 ? k !== 'w' : k !== 'm2')).map(k => namen[k]!); if (new Set(gew).size < gew.length) return { fehler: 'rolle-doppelt', hinweise }; }
  const n = d.x?.length ?? 0;
  if (n < 10) return { fehler: 'n-zu-klein', hinweise };
  const anz = (a?: number[]) => new Set(a ?? []).size;
  if (modell !== 6 && anz(d.w) < 2) return { fehler: 'w-konstant', hinweise };
  if (anz(d.m) === 2 || (modell === 6 && anz(d.m2) === 2)) return { fehler: 'm-zwei-werte', hinweise };
  if (anz(d.y) === 2) return { fehler: 'y-zwei-werte', hinweise };
  if (n < 30) hinweise.push('n-unter-30');
  if (n < 50 && modell !== 6) hinweise.push('n-unter-50');
  return { fehler: null, hinweise };
}

/** Listenweiser Ausschluss über die Spalten des Modells (7, 14: x m y w · 6: x m m2 y); `zeilen` 1-basiert. */
export function vollstaendigeFaelle(modell: Modell, spalten: Partial<Record<Rolle, (number | null)[]>>): { daten: ProzessDaten; n: number; ausgeschlossen: number; zeilen: number[] } {
  const rollen: Rolle[] = modell === 6 ? ['x', 'm', 'm2', 'y'] : ['x', 'm', 'y', 'w'], n0 = spalten.x?.length ?? 0;
  const ok = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v), daten: Record<string, number[]> = {}, zeilen: number[] = [];
  for (const r of rollen) daten[r] = [];
  for (let i = 0; i < n0; i++) {
    if (rollen.every(r => ok(spalten[r]?.[i]))) for (const r of rollen) daten[r]!.push(spalten[r]![i] as number);
    else zeilen.push(i + 1);
  }
  return { daten: daten as unknown as ProzessDaten, n: n0 - zeilen.length, ausgeschlossen: zeilen.length, zeilen };
}

/** Namen der Hilfsspalten (nur für diese Rechnung), die in den Daten nicht vorkommen. */
export function prozessHilfsNamen(vergeben: string[]): { a: string; b: string; ab: string } {
  const bes = new Set(vergeben.map(n => n.toUpperCase()));
  let k = 0, namen: string[];
  do { const s = k ? String(k) : ''; namen = [`PZ_A${s}`, `PZ_B${s}`, `PZ_AB${s}`]; k++; } while (namen.some(n => bes.has(n)));
  return { a: namen[0]!, b: namen[1]!, ab: namen[2]! };
}

/** PSPP-Syntax: je Gleichung ein REGRESSION-Lauf (7, 14: zwei, 6: drei) mit denselben vollständigen Fällen; die zentrierten Hilfsspalten gibt es nur für die Rechnung (TEMPORARY). */
export function prozessBefehl(modell: Modell, sp: { x: string; m: string; y: string; w?: string; m2?: string }, d: ProzessDaten, vergeben: string[] = []): string {
  const h = prozessHilfsNamen(vergeben), w = sp.w!, m2 = sp.m2!;
  const rollen = modell === 6 ? [sp.x, sp.m, m2, sp.y] : [sp.x, sp.m, sp.y, w];
  const voll = `TEMPORARY.\nSELECT IF (${rollen.map(r => `NOT MISSING(${r})`).join(' AND ')}).\n`;
  const lauf = (vorab: string, vars: string[], ziel: string) => `${voll}${vorab}REGRESSION /VARIABLES=${vars.join(' ')} ${ziel} /STATISTICS=COEFF R ANOVA CI(95) /DEPENDENT=${ziel} /METHOD=ENTER.`;
  const kopf = `* ${L('Hilfsspalten (am Mittelwert zentriert) gibt es nur für diese Rechnung (TEMPORARY); die Daten bleiben unverändert.', 'Helper columns (centered at the mean) exist only for this calculation (TEMPORARY); the data stay unchanged.')}\n`;
  const zahl = (v: number) => String(v);
  if (modell === 7) {
    const vorab = `COMPUTE ${h.a} = ${sp.x} - ${zahl(mittel(d.x))}.\nCOMPUTE ${h.b} = ${w} - ${zahl(mittel(d.w!))}.\nCOMPUTE ${h.ab} = ${h.a} * ${h.b}.\n`;
    return `${kopf}* ${L('Gleichung für M: X, W und das Produkt', 'Equation for M: X, W and the product')}\n${lauf(vorab, [h.a, h.b, h.ab], sp.m)}\n* ${L('Gleichung für Y: X und M', 'Equation for Y: X and M')}\n${lauf('', [sp.x, sp.m], sp.y)}`;
  }
  if (modell === 14) {
    const vorab = `COMPUTE ${h.a} = ${sp.m} - ${zahl(mittel(d.m))}.\nCOMPUTE ${h.b} = ${w} - ${zahl(mittel(d.w!))}.\nCOMPUTE ${h.ab} = ${h.a} * ${h.b}.\n`;
    return `${kopf}* ${L('Gleichung für M: X', 'Equation for M: X')}\n${lauf('', [sp.x], sp.m)}\n* ${L('Gleichung für Y: X, M, W und das Produkt von M und W', 'Equation for Y: X, M, W and the product of M and W')}\n${lauf(vorab, [sp.x, h.a, h.b, h.ab], sp.y)}`;
  }
  return `* ${L('Gleichung für M1: X', 'Equation for M1: X')}\n${lauf('', [sp.x], sp.m)}\n* ${L('Gleichung für M2: X und M1', 'Equation for M2: X and M1')}\n${lauf('', [sp.x, sp.m], m2)}\n* ${L('Gleichung für Y: X, M1 und M2', 'Equation for Y: X, M1 and M2')}\n${lauf('', [sp.x, sp.m, m2], sp.y)}`;
}

/* ------------------------------------------------------------------ Gesamtrechnung */

export interface ProzessRechnung {
  modell: Modell; n: number; wWerte?: number[]; schaetzung: Schaetzung; intervalle: EffektIntervall[]; B: number; startwert: number; art: BootArt; ungueltig: number;
  /** Regel der W-Werte (7, 14); ohne Angabe: drei Werte = Perzentil, zwei = zwei Werte, sonst eigene */
  regel?: ModeratorWerte['regel'];
  /** je W-Wert: kommt er in den Daten vor? liegt er außerhalb von [Minimum; Maximum] von W? */
  wBeobachtet?: boolean[]; wAusserhalb?: boolean[];
  /** Standardabweichungen von X und Y (Modell 6: vollständig standardisierte Werte) */
  sd?: { x: number; y: number };
}
export interface ProzessOpt { startwert?: number; B?: number; wWerte?: number[]; art?: BootArt; regel?: ModeratorWerte['regel'] }

function wFuer(modell: Modell, d: ProzessDaten, opt: ProzessOpt): number[] | undefined {
  if (modell === 6) return undefined;
  return opt.wWerte ?? moderatorWerte(d.w!, 'perzentil').werte;
}
/** Regel samt Angaben zu den W-Werten (Perzentil ohne Angabe: drei Werte = Perzentil, zwei = zwei Werte, sonst eigene). */
function wMerkmale(d: ProzessDaten, opt: ProzessOpt, wWerte: number[] | undefined): Pick<ProzessRechnung, 'regel' | 'wBeobachtet' | 'wAusserhalb'> {
  if (!wWerte) return {};
  const m = moderatorWerte(d.w!, 'eigen', wWerte), regel = opt.regel ?? (opt.wWerte ? (wWerte.length === 3 ? 'perzentil' : wWerte.length === 2 ? 'zwei' : 'eigen') : moderatorWerte(d.w!, 'perzentil').regel);
  return { regel, wBeobachtet: m.beobachtet, wAusserhalb: m.ausserhalb };
}
function abschluss(modell: Modell, d: ProzessDaten, opt: ProzessOpt, wWerte: number[] | undefined, z: ReturnType<typeof prozessZiehung>, jackknife?: { t0: number[]; L: number[][] }): ProzessRechnung {
  const art = opt.art ?? 'perzentil', jk = art === 'bca' ? (jackknife ?? prozessJackknife(modell, d, wWerte)) : null;
  const sc = schaetze(modell, d, wWerte), ungueltig = z.ziehung.t.filter(v => !Number.isFinite(v)).length;
  const intervalle = intervalleAus(z.namen, sc.effekte, z.spalten, jk ? jk.L : null, art);
  return { modell, n: d.x.length, wWerte, schaetzung: sc, intervalle, B: z.ziehung.B, startwert: z.ziehung.startwert, art, ungueltig, ...wMerkmale(d, opt, wWerte), ...(modell === 6 ? { sd: { x: streuung(d.x), y: streuung(d.y) } } : {}) };
}

/** Alles zusammen ohne Pause (Tests, Werkzeuge). */
export function prozessRechne(modell: Modell, d: ProzessDaten, opt: ProzessOpt = {}): ProzessRechnung {
  const wWerte = wFuer(modell, d, opt), z = prozessZiehung(modell, d, { startwert: opt.startwert, B: opt.B, wWerte });
  z.ziehung.weiter(z.ziehung.B);
  return abschluss(modell, d, opt, wWerte, z);
}

/** Der Jackknife in Häppchen nach der Uhr (wie die Ziehungen); `null`, wenn `abbruch()` wahr wird. Nur für BCa nötig. */
async function prozessJackknifeAsync(modell: Modell, d: ProzessDaten, wWerte: number[] | undefined, abbruch?: () => boolean): Promise<{ t0: number[]; L: number[][] } | null> {
  const n = d.x.length, t0 = prozessEffekte(modell, d, Int32Array.from({ length: n }, (_, i) => i), wWerte), L = t0.map(() => new Array<number>(n)), ohne = new Int32Array(n - 1);
  let i = 0;
  while (i < n) {
    if (abbruch?.()) return null;
    const uhr = performance.now();
    do {
      let k = 0; for (let j = 0; j < n; j++) if (j !== i) ohne[k++] = j;
      const e = prozessEffekte(modell, d, ohne, wWerte);
      for (let q = 0; q < t0.length; q++) L[q]![i] = (n - 1) * (t0[q]! - e[q]!);
      i++;
    } while (i < n && performance.now() - uhr < 40);
    if (i < n) await new Promise(r => setTimeout(r, 0));
  }
  return { t0, L };
}

/** Wie `prozessRechne`, aber in Häppchen: die Oberfläche bekommt Fortschritt (0 bis 1) und kann abbrechen (`abbruch()` wahr ⇒ Ergebnis `null`). */
export async function prozessRechneAsync(modell: Modell, d: ProzessDaten, opt: ProzessOpt & { fortschritt?: (anteil: number) => void; abbruch?: () => boolean } = {}): Promise<ProzessRechnung | null> {
  const wWerte = wFuer(modell, d, opt), z = prozessZiehung(modell, d, { startwert: opt.startwert, B: opt.B, wWerte }), B = z.ziehung.B;
  // Häppchen nach der Uhr (etwa 40 ms), nicht nach Zahl der Ziehungen: Bei großen Dateien oder vollem Rechner bleibt „Abbrechen“ trotzdem schnell erreichbar.
  let fertig = 0;
  while (fertig < B) {
    if (opt.abbruch?.()) return null;
    const t0 = performance.now();
    do { const n = Math.min(10, B - fertig); z.ziehung.weiter(n); fertig += n; } while (fertig < B && performance.now() - t0 < 40);
    opt.fortschritt?.(Math.min(1, fertig / B));
    if (fertig < B) await new Promise(r => setTimeout(r, 0));
  }
  if (opt.abbruch?.()) return null;
  let jk: { t0: number[]; L: number[][] } | undefined;
  if ((opt.art ?? 'perzentil') === 'bca') { const r = await prozessJackknifeAsync(modell, d, wWerte, opt.abbruch); if (!r) return null; jk = r; }
  const erg = abschluss(modell, d, opt, wWerte, z, jk);
  if (erg.ungueltig > B * 0.5) throw new Error(L('Bootstrap nicht möglich', 'Bootstrap not possible'));
  return erg;
}

/* ------------------------------------------------------------------ Ergebnis für das Blatt */

/** Was das Blatt speichert: die Rechnung, die Namen der Spalten, die PSPP-Gleichungen (Pfadtabelle mit KI) und die Angaben zu W. */
export interface Prozess extends ProzessRechnung {
  /** Kennung des Ergebnisses im Blatt (`art` ist schon die Intervallart) */
  prozess: true;
  spalten: { x: string; m: string; y: string; w?: string; m2?: string };
  gesamt: number;
  regressionen: RegModell[];
  kleinN: boolean;
}

/** Aus der Rechnung und der PSPP-Ausgabe (Läufe von `prozessBefehl`) das Ergebnis fürs Blatt. */
export function prozessErgebnis(rech: ProzessRechnung, items: OutputItem[], spalten: Prozess['spalten'], gesamt: number): Prozess {
  const ms = regressionsModelle(items), soll = rech.modell === 6 ? 3 : 2;
  if (ms.length !== soll) throw new Error(L(`${soll} Regressionen erwartet`, `${soll} regressions expected`));
  return { ...rech, prozess: true, spalten, gesamt, regressionen: ms, kleinN: hesterberg(rech.n) };
}

export { prozessSaetze } from './prozesssaetze';
