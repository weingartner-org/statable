/**
 * Später S-F, Teil 1: Sterbetafel (versicherungsmathematisch, „wie SPSS SURVIVAL“) - reine Rechnung in JavaScript, kein R, kein PSPP.
 * Fachblatt: docs/fachblaetter/SPAETER-F-UEBERLEBEN-MEDIZIN.md Abschnitt 1 und „Entscheidungen Opus (18.10.)“ 2. Tests: sterbetafel.test.ts (Sollwerte aus R: KMsurv::lifetab, coin, Paar-für-Paar-Rechnung).
 *
 * Quelle: IBM SPSS Statistics Algorithms 14.0, Kapitel SURVIVAL (Gehan 1975; Lee & Desu 1972). Statable rechnet die in sich stimmige Fassung; an vier Stellen weicht sie vom gedruckten IBM-Text ab
 * (die Hilfe sagt es): (a) Punktzahl bei gleichen Zeiten mit „+ CE_k“ (nur so ist die Summe aller Punktzahlen 0), (b) Median mit der Breite h_i des Intervalls, in dem die Kurve
 * die 50 % kreuzt (IBM druckt h_(i-1)), (c) Standardfehler der Dichte mit P_(i-1) (Anteil am Anfang des Intervalls; wie Lee & Wang und KMsurv::lifetab). (d) ein nicht erreichter Median heißt „nicht erreicht“ (IBM: „t_k +“). Ein SPSS-Ausdruck entscheidet (Liste für Johannes).
 * Gehan-Wilcoxon nur NÄHERUNGSWEISE (die Zeit jedes Falls wird durch den Anfang seines Intervalls ersetzt), wie SPSS; kein exakter Test.
 * Fallgewicht: gesperrt (lib/gewichte.ts, `kaplanmeier:sterbetafel`); gerechnet wird mit dem Gewicht 1 je Fall.
 * ⚠ von der Fachperson abzunehmen: die Schwellen der Hinweise (sterbetafelHinweise) und die Wortlaute.
 */
import { chiQuadratP } from './verteilung';
import { holm, type Kaplan } from './ueberleben';

export interface TafelZeile {
  anfang: number; breite: number | null;
  /** l_i: am Anfang des Intervalls dabei */
  amAnfang: number;
  /** c_i: im Intervall ausgeschieden (zensiert) */
  ausgeschieden: number;
  /** d_i: Ereignisse im Intervall */
  ereignisse: number;
  /** r_i = l_i - c_i/2: dem Risiko ausgesetzt (Ausgeschiedene zählen halb) */
  risiko: number;
  /** q_i = d_i / r_i */
  q: number;
  /** P_i: kumulierter Anteil ohne Ereignis am ENDE des Intervalls */
  kum: number;
  dichte: number | null; hazard: number | null; seKum: number; seDichte: number | null; seHazard: number | null;
}
export interface TafelMedian { wert: number | null; erreicht: boolean; imOffenen: boolean }
export interface TafelErgebnis { ok: true; zeilen: TafelZeile[]; median: TafelMedian; n: number; ereignisse: number; zensiert: number; ausgeschlossen: number }
export type TafelFehlerCode = 'zu-wenige-intervalle' | 'zu-viele-intervalle' | 'anfaenge' | 'keine-faelle' | 'kein-ereignis' | 'alle-zeiten-gleich';
export interface TafelFehler { ok: false; code: TafelFehlerCode }

export const TAFEL_MIN_INTERVALLE = 2;
export const TAFEL_MAX_INTERVALLE = 50;

const gueltigeZeit = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const gueltigesEreignis = (v: unknown): v is 0 | 1 => v === 0 || v === 1;

/** Anfänge prüfen: t_1 = 0, aufsteigend, endlich. */
function anfaengeFehler(a: number[]): TafelFehlerCode | null {
  if (a.length < TAFEL_MIN_INTERVALLE) return 'zu-wenige-intervalle';
  if (a.length > TAFEL_MAX_INTERVALLE) return 'zu-viele-intervalle';
  if (!a.every(x => typeof x === 'number' && Number.isFinite(x)) || a[0] !== 0) return 'anfaenge';
  for (let i = 1; i < a.length; i++) if (!(a[i]! > a[i - 1]!)) return 'anfaenge';
  return null;
}

/** Index des Intervalls: das letzte i mit anfaenge[i] <= x (Zeit genau auf der Grenze gehört ins obere Intervall). */
function intervallVon(x: number, anfaenge: number[]): number {
  let lo = 0, hi = anfaenge.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (anfaenge[mid]! <= x) lo = mid; else hi = mid - 1; }
  return lo;
}

/**
 * Sterbetafel. `anfaenge` = Anfänge t_1 < … < t_k, t_1 = 0; das letzte Intervall ab t_k ist OFFEN. Ungültige Zeilen (Zeit fehlend oder < 0, Ereignis nicht 0/1) zählen als `ausgeschlossen`.
 * Rechnung in der stabilen Form: bei q = 0 und q = 1 nie NaN (Standardfehler 0, wo der Grenzwert 0 ist).
 */
export function sterbetafel(zeit: (number | null)[], ereignis: (number | null)[], anfaenge: number[]): TafelErgebnis | TafelFehler {
  const f = anfaengeFehler(anfaenge);
  if (f) return { ok: false, code: f };
  const k = anfaenge.length, c = new Array<number>(k).fill(0), dd = new Array<number>(k).fill(0);
  let n = 0, ereignisse = 0, zensiert = 0, ausgeschlossen = 0, minZ = Infinity, maxZ = -Infinity;
  const m = Math.min(zeit.length, ereignis.length);
  for (let j = 0; j < m; j++) {
    const x = zeit[j], e = ereignis[j];
    if (!gueltigeZeit(x) || !gueltigesEreignis(e)) { ausgeschlossen++; continue; }
    n++; if (x < minZ) minZ = x; if (x > maxZ) maxZ = x;
    const i = intervallVon(x, anfaenge);
    if (e === 1) { dd[i]!++; ereignisse++; } else { c[i]!++; zensiert++; }
  }
  ausgeschlossen += Math.abs(zeit.length - ereignis.length);
  if (n === 0) return { ok: false, code: 'keine-faelle' };
  if (ereignisse === 0) return { ok: false, code: 'kein-ereignis' };
  if (minZ === maxZ) return { ok: false, code: 'alle-zeiten-gleich' };

  const zeilen: TafelZeile[] = [];
  let l = n, vorigP = 1, summeVor = 0;   // summeVor = Σ_{j<i} q_j / (r_j p_j)
  for (let i = 0; i < k; i++) {
    if (l <= 0) break;
    const offen = i === k - 1, h = offen ? null : anfaenge[i + 1]! - anfaenge[i]!;
    const ci = c[i]!, di = dd[i]!, r = l - ci / 2;
    if (!(r > 0)) break;
    const q = di / r, p = 1 - q;
    const kum = vorigP * p;
    // stabile Formen (nie durch p oder q teilen): se(P) = P_(i-1)·√(p²·Σ_(j<i) + p·q/r); se(f) = P_(i-1)/h·√(q²·Σ_(j<i) + q·p/r)
    const seKum = vorigP * Math.sqrt(Math.max(0, p * p * summeVor + (p * q) / r));
    let dichte: number | null = null, hazard: number | null = null, seDichte: number | null = null, seHazard: number | null = null;
    if (h !== null) {
      dichte = (vorigP - kum) / h;
      hazard = (2 * q) / (h * (1 + p));
      seDichte = q === 0 ? 0 : (vorigP / h) * Math.sqrt(Math.max(0, q * q * summeVor + (q * p) / r));
      seHazard = q === 0 ? 0 : Math.sqrt(Math.max(0, ((hazard * hazard) / (r * q)) * (1 - (hazard * h / 2) ** 2)));
    }
    zeilen.push({ anfang: anfaenge[i]!, breite: h, amAnfang: l, ausgeschieden: ci, ereignisse: di, risiko: r, q, kum, dichte, hazard, seKum, seDichte, seHazard });
    if (p > 0) summeVor += q / (r * p);
    vorigP = kum; l = l - ci - di;
  }
  return { ok: true, zeilen, median: tafelMedian(zeilen), n, ereignisse, zensiert, ausgeschlossen };
}

/** Median aus der Tafel: Md = t_i + h_i·(P_(i-1) - 0,5)/(P_(i-1) - P_i) für das erste Intervall mit P_i <= 0,5 (h_i, nicht h_(i-1) wie im gedruckten IBM-Text). */
function tafelMedian(zeilen: TafelZeile[]): TafelMedian {
  let voriges = 1;
  for (const z of zeilen) {
    if (z.kum <= 0.5) {
      if (z.breite === null) return { wert: null, erreicht: false, imOffenen: true };
      return { wert: z.anfang + (z.breite * (voriges - 0.5)) / (voriges - z.kum), erreicht: true, imOffenen: false };
    }
    voriges = z.kum;
  }
  return { wert: null, erreicht: false, imOffenen: false };
}

/* ------------------------------------------------------------ Intervalle */

export type IntervallErgebnis = { ok: true; breite: number; ende: number; anfaenge: number[]; aufgerundet: boolean } | { ok: false; code: 'breite' | 'zu-wenige-intervalle' | 'zu-viele-intervalle' };

/** Der Wert aus {1, 2, 5}·10^k, der `ziel` auf der Log-Skala am nächsten liegt (bei Gleichstand der kleinere). */
function glatteBreite(ziel: number): number {
  const e = Math.floor(Math.log10(ziel));
  let beste = NaN, abst = Infinity;
  for (let k = e - 1; k <= e + 1; k++) for (const m of [1, 2, 5]) {
    const w = m * 10 ** k, a = Math.abs(Math.log(w / ziel));
    if (a < abst - 1e-12) { abst = a; beste = w; }
  }
  return Number(beste.toPrecision(12));
}
const gerundet = (x: number) => Number(x.toPrecision(12));

/**
 * Anfänge der Intervalle: 0, breite, …, ende (das Ende ist der Anfang des offenen Intervalls). Voreinstellung der Breite: so, dass etwa zehn Intervalle entstehen (glatter Wert aus 1, 2, 5 · 10^k);
 * Ende = größtes Vielfaches der Breite <= größte Zeit. Ein angegebenes Ende, das kein Vielfaches ist, wird AUFGERUNDET (die Breite bleibt, wie vom Menschen gewählt).
 */
export function intervallAnfaenge(zeit: number[], opt: { breite?: number; ende?: number } = {}): IntervallErgebnis {
  const ok = zeit.filter(gueltigeZeit), maxZ = ok.length ? Math.max(...ok) : 0;
  let breite = opt.breite;
  if (breite === undefined) { if (!(maxZ > 0)) return { ok: false, code: 'zu-wenige-intervalle' }; breite = glatteBreite(maxZ / 10); }
  if (typeof breite !== 'number' || !Number.isFinite(breite) || breite <= 0) return { ok: false, code: 'breite' };
  let aufgerundet = false, schritte: number;
  if (opt.ende === undefined) schritte = Math.floor(maxZ / breite + 1e-9);
  else {
    if (!Number.isFinite(opt.ende) || opt.ende < 0) return { ok: false, code: 'zu-wenige-intervalle' };
    schritte = Math.ceil(opt.ende / breite - 1e-9); aufgerundet = Math.abs(schritte * breite - opt.ende) > 1e-9 * Math.max(1, opt.ende);
  }
  if (schritte < 1) return { ok: false, code: 'zu-wenige-intervalle' };
  if (schritte + 1 > TAFEL_MAX_INTERVALLE) return { ok: false, code: 'zu-viele-intervalle' };
  const anfaenge = Array.from({ length: schritte + 1 }, (_, i) => gerundet(i * breite!));
  return { ok: true, breite, ende: anfaenge[schritte]!, anfaenge, aufgerundet };
}

/* ------------------------------------------------------------ Wilcoxon (Gehan), näherungsweise */

export interface GehanErgebnis { D: number; df: number; p: number; summeS: number }

/**
 * Wilcoxon (Gehan) wie SPSS SURVIVAL („approximativ“): die Zeit jedes Falls wird durch den Anfang seines Intervalls ersetzt, bei gleicher Zeit gilt „Ereignis kürzer als zensiert“.
 * Punktzahl S_k = ULE_k (zensierter Fall) bzw. A1 - A2 - A3 mit A2 = W_c - CLE_k + CE_k (Summe aller S = 0); D = (W - 1)·Σ_j SS_j²/W_j / Σ S_i², χ² mit g - 1 Freiheitsgraden.
 * `gruppe` = Gruppennummern (ganze Zahlen); weniger als zwei verschiedene → null. Sind alle Punktzahlen 0 (zum Beispiel alle Zeiten im selben Intervall): D = 0, p = 1 - nie NaN.
 */
export function gehanNaeherung(zeit: number[], ereignis: number[], gruppe: number[], anfaenge: number[]): GehanErgebnis | null {
  const n = Math.min(zeit.length, ereignis.length, gruppe.length);
  const gr = [...new Set(gruppe.slice(0, n))].sort((a, b) => a - b);
  if (gr.length < 2 || n < 2) return null;
  const t = new Array<number>(n), e = new Array<number>(n);
  for (let j = 0; j < n; j++) { t[j] = anfaenge[intervallVon(zeit[j]!, anfaenge)]!; e[j] = ereignis[j] ? 1 : 0; }
  // Häufigkeiten je (angenäherter) Zeit: Ereignisse und Zensierte; kumulierte Summen über aufsteigende Zeit
  const zeiten = [...new Set(t)].sort((a, b) => a - b), ix = new Map(zeiten.map((z, i) => [z, i]));
  const ev = new Array<number>(zeiten.length).fill(0), ze = new Array<number>(zeiten.length).fill(0);
  for (let j = 0; j < n; j++) (e[j] ? ev : ze)[ix.get(t[j]!)!]!++;
  const uleKum: number[] = [], cleKum: number[] = [];
  let a = 0, b = 0;
  for (let i = 0; i < zeiten.length; i++) { a += ev[i]!; b += ze[i]!; uleKum.push(a); cleKum.push(b); }
  const Wu = a, Wc = b, W = n;
  const ss = new Map<number, number>(), ww = new Map<number, number>(); let T = 0, summe = 0;
  for (let j = 0; j < n; j++) {
    const i = ix.get(t[j]!)!;
    let S: number;
    if (!e[j]) S = uleKum[i]!;
    else { const A1 = uleKum[i]! - ev[i]!, A2 = Wc - cleKum[i]! + ze[i]!, A3 = Wu - uleKum[i]!; S = A1 - A2 - A3; }
    const g = gruppe[j]!; ss.set(g, (ss.get(g) ?? 0) + S); ww.set(g, (ww.get(g) ?? 0) + 1); T += S * S; summe += S;
  }
  const df = gr.length - 1;
  if (!(T > 0)) return { D: 0, df, p: 1, summeS: summe };
  let B = 0; for (const g of gr) B += (ss.get(g) ?? 0) ** 2 / (ww.get(g) ?? 1);
  const D = ((W - 1) * B) / T;
  return { D, df, p: chiQuadratP(D, df), summeS: summe };
}

/** Alle Paare von Gruppen a < b, jedes mit der Rechnung der zwei Gruppen allein (ohne Korrektur für mehrere Vergleiche). */
export function gehanPaarweise(zeit: number[], ereignis: number[], gruppe: number[], anfaenge: number[]): { a: number; b: number; D: number; df: number; p: number }[] {
  const gr = [...new Set(gruppe)].sort((x, y) => x - y), aus: { a: number; b: number; D: number; df: number; p: number }[] = [];
  for (let i = 0; i < gr.length; i++) for (let j = i + 1; j < gr.length; j++) {
    const idx = gruppe.map((g, k) => (g === gr[i] || g === gr[j] ? k : -1)).filter(k => k >= 0);
    const r = gehanNaeherung(idx.map(k => zeit[k]!), idx.map(k => ereignis[k]!), idx.map(k => gruppe[k]!), anfaenge);
    aus.push({ a: gr[i]!, b: gr[j]!, D: r?.D ?? 0, df: 1, p: r?.p ?? 1 });
  }
  return aus;
}

/* ------------------------------------------------------------ Ergebnis für die Karte */

export interface SterbetafelGruppe { name: string; tafel: TafelErgebnis | null; fehler?: TafelFehlerCode }
export interface SterbetafelPaar { a: number; b: number; name: string; D: number; df: number; p: number; pHolm: number }
/** Alles, was die Karte zeigt und speichert: die Tafel (gesamt und je Gruppe), der Test von Gehan und die Wahl der Intervalle. */
export interface SterbetafelAnzeige {
  zeit: string; ereignis: string; gruppe: string;
  /** Zeiteinheit im Satz („Tagen“); leer = „Zeiteinheiten“ */
  einheit: string;
  breite: number; ende: number; anfaenge: number[]; aufgerundet: boolean;
  gesamt: TafelErgebnis;
  /** je Gruppe eine Tafel (nur bei zwei oder mehr Gruppen) */
  gruppen: SterbetafelGruppe[];
  gehan: GehanErgebnis | null; paarweise: SterbetafelPaar[];
  /** Zeilen, die die Karte schon vorher ausgelassen hat (ohne Zeit, Ereignis oder Gruppe) */
  ausgeschlossen: number;
}
export type SterbetafelFehler = { fehler: 'breite' | TafelFehlerCode };

/**
 * Die Sterbetafel aus dem Ergebnis der Kaplan-Meier-Karte (gleiche Fälle, gleiches Ereignis). `breite`/`ende` leer = Voreinstellung (etwa zehn Intervalle).
 * Wilcoxon (Gehan) nur bei zwei oder mehr Gruppen; paarweise bei mehr als zwei, mit Holm.
 */
export function sterbetafelAusKaplan(k: Kaplan, opt: { breite?: number | null; ende?: number | null; einheit?: string } = {}): SterbetafelAnzeige | SterbetafelFehler {
  const zeit = k.roh.map(r => r[1]), ereignis = k.roh.map(r => (r[2] === k.ereignisIndex ? 1 : 0)), gr = k.roh.map(r => r[0]);
  const iv = intervallAnfaenge(zeit, { ...(opt.breite != null ? { breite: opt.breite } : {}), ...(opt.ende != null ? { ende: opt.ende } : {}) });
  if (!iv.ok) return { fehler: iv.code };
  const ges = sterbetafel(zeit, ereignis, iv.anfaenge);
  if (!ges.ok) return { fehler: ges.code };
  const mitG = k.gruppen.length >= 2;
  const gruppen: SterbetafelGruppe[] = mitG ? k.gruppen.map((g, gi) => {
    const idx = gr.map((x, i) => (x === gi ? i : -1)).filter(i => i >= 0);
    const t = sterbetafel(idx.map(i => zeit[i]!), idx.map(i => ereignis[i]!), iv.anfaenge);
    return t.ok ? { name: g.name, tafel: t } : { name: g.name, tafel: null, fehler: t.code };
  }) : [];
  const gehan = mitG ? gehanNaeherung(zeit, ereignis, gr, iv.anfaenge) : null;
  let paarweise: SterbetafelPaar[] = [];
  if (mitG && k.gruppen.length > 2) {
    const roh = gehanPaarweise(zeit, ereignis, gr, iv.anfaenge), adj = holm(roh.map(x => x.p));
    paarweise = roh.map((x, i) => ({ ...x, name: `${k.gruppen[x.a]!.name} - ${k.gruppen[x.b]!.name}`, pHolm: adj[i]! }));
  }
  return { zeit: k.zeit, ereignis: k.ereignis, gruppe: k.gruppe, einheit: opt.einheit ?? '', breite: iv.breite, ende: iv.ende, anfaenge: iv.anfaenge, aufgerundet: iv.aufgerundet, gesamt: ges, gruppen, gehan, paarweise, ausgeschlossen: k.ausgelassen };
}
