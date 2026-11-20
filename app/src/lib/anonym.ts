/**
 * Mikrodaten anonymisieren (k-Anonymität), Paket M3, Fachblatt docs/fachblaetter/MIKRODATEN-2026-10-24.md, Abschnitt M3. Reines TS, keine Oberfläche.
 *
 * Häufigkeiten wie R sdcMicro `freqCalc` (alpha = 1): fk = Zahl der Fälle mit derselben Kombination der Schlüsselmerkmale, Fk = Summe der Gewichte dieser Fälle.
 * Fehlend passt zu jeder Kategorie (in beide Richtungen).
 * Lokales Unterdrücken folgt `sdcMicro::localSuppression(k, importance)` Schritt für Schritt (suppSubset in sdcMicro 5.8.2): gleiche Reihenfolge der Fälle,
 * gleiche Wahl des Merkmals (am wenigsten wichtiges zuerst, aber nur eines, in dem der Fall von einem nächstgelegenen Fall abweicht), gleiche Vorstufe für zu große Gruppen.
 * Sollwerte: pruefdaten/mikro/anonym-soll.R -> anonym-soll.json (anonym.test.ts).
 * Alle Funktionen liefern neue Spalten; die Eingabe bleibt unverändert (das Original bleibt).
 */
import { zitat } from '../i18n/profil';
import { L, Lp } from './sitzung.svelte';
import { zahlDe } from './format';

export type Wert = string | number | null;
export type Gewicht = (number | null)[] | null | undefined;

const fehlt = (v: unknown): boolean => v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v));

/* ---------------------------------------------------------------------------------------------------------------------------- Häufigkeiten */

export interface Haeufigkeiten { fk: number[]; Fk: number[] }

/** Kennzahlen je Fall: Spalten = Schlüsselmerkmale. Fehlendes Gewicht zählt 0; ohne Gewicht ist Fk = fk. */
export function haeufigkeiten(schluessel: Wert[][], gewicht?: Gewicht): Haeufigkeiten {
  const m = schluessel.length, N = m ? schluessel[0]!.length : (gewicht?.length ?? 0);
  const { code } = kodiere(schluessel);
  const w = new Float64Array(N);
  for (let i = 0; i < N; i++) { const g = gewicht ? gewicht[i] : 1; w[i] = typeof g === 'number' && Number.isFinite(g) ? g : 0; }
  return zaehle(code, m, N, w);
}

/** Werte je Spalte als Zahlen 0 … c − 1; fehlend = −1. Zeilenweise abgelegt (N × m). */
function kodiere(schluessel: Wert[][]): { code: Int32Array; m: number; N: number } {
  const m = schluessel.length, N = m ? schluessel[0]!.length : 0;
  const code = new Int32Array(N * m);
  for (let j = 0; j < m; j++) {
    const idx = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      const v = schluessel[j]![i];
      if (fehlt(v)) { code[i * m + j] = -1; continue; }
      const t = typeof v + ':' + String(v);
      let c = idx.get(t); if (c === undefined) { c = idx.size; idx.set(t, c); }
      code[i * m + j] = c;
    }
  }
  return { code, m, N };
}

/** fk und Fk mit Fehlend als Joker. Gleiche Muster werden zusammengefasst; Vergleiche nur zwischen Mustern, wo Fehlendes im Spiel ist. */
function zaehle(code: Int32Array, m: number, N: number, w: Float64Array): Haeufigkeiten {
  const fk = new Array<number>(N).fill(0), Fk = new Array<number>(N).fill(0);
  if (!m) { for (let i = 0; i < N; i++) { fk[i] = N; Fk[i] = w.reduce((a, v) => a + v, 0); } return { fk, Fk }; }
  const muster = new Map<string, number>(), mus: number[] = [], anzahl: number[] = [], gew: number[] = [], zeile = new Int32Array(N), hatNa: boolean[] = [];
  for (let i = 0; i < N; i++) {
    let key = '', na = false;
    for (let j = 0; j < m; j++) { const c = code[i * m + j]!; key += c + ','; if (c < 0) na = true; }
    let u = muster.get(key);
    if (u === undefined) { u = mus.length; muster.set(key, u); mus.push(i); anzahl.push(0); gew.push(0); hatNa.push(na); }
    anzahl[u]!++; gew[u]! += w[i]!; zeile[i] = u;
  }
  const U = mus.length, ufk = new Float64Array(U), uFk = new Float64Array(U);
  const passt = (a: number, b: number): boolean => { for (let j = 0; j < m; j++) { const x = code[mus[a]! * m + j]!, y = code[mus[b]! * m + j]!; if (x >= 0 && y >= 0 && x !== y) return false; } return true; };
  const unvollst: number[] = []; for (let u = 0; u < U; u++) if (hatNa[u]) unvollst.push(u);
  for (let u = 0; u < U; u++) {
    let a = anzahl[u]!, g = gew[u]!;
    if (hatNa[u]) { a = 0; g = 0; for (let v = 0; v < U; v++) if (passt(u, v)) { a += anzahl[v]!; g += gew[v]!; } }
    else for (const v of unvollst) if (passt(u, v)) { a += anzahl[v]!; g += gew[v]!; }
    ufk[u] = a; uFk[u] = g;
  }
  for (let i = 0; i < N; i++) { fk[i] = ufk[zeile[i]!]!; Fk[i] = uFk[zeile[i]!]!; }
  return { fk, Fk };
}

export interface AnonymKennzahlen {
  /** Zahl der Fälle */
  n: number;
  k: number;
  /** Fälle mit fk < k, und ihr Anteil (0 bis 1) */
  unterK: number; anteilUnterK: number;
  kleinsterFk: number;
  /** Erwartete Zahl der Wiedererkennungen: Σ 1/Fk (Näherung; ohne Gewicht Σ 1/fk, das ist die Zahl der verschiedenen Kombinationen) */
  wiedererkennung: number;
  /** Mit Gewicht gerechnet (Fk weicht von fk ab)? Nur dann ist Σ 1/Fk eine Schätzung der Wiedererkennungen; ohne Gewicht zeigt der Satz sie nicht. */
  gewichtet?: boolean;
}
/** Kennzahlen für k (Standard 3). Fälle mit Fk ≤ 0 (Gewicht 0) tragen zur Näherung nichts bei. */
export function kennzahlen(h: Haeufigkeiten, k = 3): AnonymKennzahlen {
  const n = h.fk.length;
  let unter = 0, wr = 0, klein = Infinity, gewichtet = false;
  for (let i = 0; i < n; i++) { if (h.fk[i]! < k) unter++; if (h.fk[i]! < klein) klein = h.fk[i]!; if (h.Fk[i]! > 0) wr += 1 / h.Fk[i]!; if (h.Fk[i] !== h.fk[i]) gewichtet = true; }
  return { n, k, unterK: unter, anteilUnterK: n ? unter / n : 0, kleinsterFk: n ? klein : 0, wiedererkennung: wr, gewichtet };
}

/* ---------------------------------------------------------------------------------------------------------------------------- Kappen */

/** Perzentil wie R `quantile(type = 7)` (Voreinstellung); fehlende Werte bleiben außen vor. NaN, wenn nichts da ist. */
export function perzentil(spalte: Wert[], prozent: number): number {
  const x = spalte.filter((v): v is number => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (!x.length) return NaN;
  const h = (x.length - 1) * (prozent / 100), lo = Math.floor(h + 1e-12), hi = Math.min(lo + 1, x.length - 1);
  return x[lo]! + (h - lo) * (x[hi]! - x[lo]!);
}

export interface KappenErgebnis { werte: Wert[]; grenze: number; geaendert: number }
/** Oben kappen: Werte über der Grenze werden auf die Grenze gesetzt. Standard: 99-%-Perzentil. */
export function kappenOben(spalte: Wert[], opt: { grenze?: number; prozent?: number } = {}): KappenErgebnis {
  const grenze = opt.grenze ?? perzentil(spalte, opt.prozent ?? 99);
  let geaendert = 0;
  const werte = spalte.map(v => { if (typeof v === 'number' && Number.isFinite(grenze) && v > grenze) { geaendert++; return grenze; } return v; });
  return { werte, grenze, geaendert };
}
/** Unten kappen: Werte unter der Grenze werden auf die Grenze gesetzt. Standard: 1-%-Perzentil. */
export function kappenUnten(spalte: Wert[], opt: { grenze?: number; prozent?: number } = {}): KappenErgebnis {
  const grenze = opt.grenze ?? perzentil(spalte, opt.prozent ?? 1);
  let geaendert = 0;
  const werte = spalte.map(v => { if (typeof v === 'number' && Number.isFinite(grenze) && v < grenze) { geaendert++; return grenze; } return v; });
  return { werte, grenze, geaendert };
}

/* ---------------------------------------------------------------------------------------------------------------------------- Lokal unterdrücken */

export interface LokalOk {
  ok: true;
  /** neue Spalten (Schlüsselmerkmale, in der Reihenfolge der Eingabe); unterdrückte Angaben sind null */
  spalten: Wert[][];
  /** neu unterdrückte Angaben je Merkmal, und Zahl der Fälle mit mindestens einer neuen Unterdrückung */
  unterdrueckt: number[]; faelle: number; durchgaenge: number;
}
export interface LokalFehler { ok: false; code: 'zu-wenig-faelle' | 'k' | 'nicht-erreichbar' }
export type LokalErgebnis = LokalOk | LokalFehler;

/**
 * Lokal unterdrücken wie sdcMicro `localSuppression(k, importance)`: Fälle mit fk < k verlieren nacheinander das am wenigsten wichtige Merkmal
 * (nur eines, in dem sie von einem ihnen nächstgelegenen Fall abweichen), bis fk ≥ k für alle gilt.
 * `schluessel`: Spalten, das WICHTIGSTE Merkmal zuerst (Reihenfolge der Auswahl). `wichtigkeit` wie in sdcMicro (1 = wichtigstes) überschreibt das.
 * Wirft nie; zu wenig Fälle (weniger als k) oder k < 1 geben einen Fehlercode.
 */
export function lokalUnterdruecken(schluessel: Wert[][], k = 3, wichtigkeit?: number[]): LokalErgebnis {
  const m = schluessel.length, N = m ? schluessel[0]!.length : 0;
  if (!(k >= 1) || !m) return { ok: false, code: 'k' };
  if (N < k) return { ok: false, code: 'zu-wenig-faelle' };
  const imp = wichtigkeit && wichtigkeit.length === m ? wichtigkeit : Array.from({ length: m }, (_, j) => j + 1);
  // Reihenfolge, in der Merkmale versucht werden: wenigstes Gewicht zuerst (sdcMicro: order((m + 1) - importance), stabil)
  const reihenfolge = Array.from({ length: m }, (_, j) => j).sort((a, b) => ((m + 1) - imp[a]!) - ((m + 1) - imp[b]!) || a - b);
  const { code } = kodiere(schluessel);
  // Vorstufe von sdcMicro: Gruppen gleicher Kombination, die größer als k sind, werden auf ihre ersten k Fälle verkleinert (die übrigen laufen unverändert mit).
  // Fehlend ist dabei ein eigener Wert (gemessen an sdcMicro 5.8.2: der Ersatz durch unique(x)[1] im Quelltext greift nicht).
  const gruppen = new Map<string, number[]>();
  for (let i = 0; i < N; i++) {
    let key = '';
    for (let j = 0; j < m; j++) { key += code[i * m + j]! + ','; }
    const g = gruppen.get(key); if (g) g.push(i); else gruppen.set(key, [i]);
  }
  const weg = new Uint8Array(N);
  for (const g of gruppen.values()) if (g.length > k) for (let t = k; t < g.length; t++) weg[g[t]!] = 1;
  const behalten: number[] = []; for (let i = 0; i < N; i++) if (!weg[i]) behalten.push(i);
  const n = behalten.length;
  if (n < k) return { ok: false, code: 'zu-wenig-faelle' };
  const mat = new Int32Array(n * m);
  for (let r = 0; r < n; r++) for (let j = 0; j < m; j++) mat[r * m + j] = code[behalten[r]! * m + j]!;
  const vorher = Int32Array.from(mat);
  let durchgaenge = 0;
  for (;;) {
    const { fk } = zaehle(mat, m, n, new Float64Array(n).fill(1));
    const problem: number[] = []; for (let r = 0; r < n; r++) if (fk[r]! < k) problem.push(r);
    if (!problem.length) break;
    if (++durchgaenge > 10000) return { ok: false, code: 'nicht-erreichbar' };
    // Individuelles Risiko ohne Gewicht = 1/fk: größtes Risiko zuerst, bei Gleichstand der kleinere Index (sdcMicro: order(decreasing = TRUE) ist stabil)
    problem.sort((a, b) => fk[a]! - fk[b]! || a - b);
    for (const i of problem) {
      // Fälle mit der kleinsten Zahl von Abweichungen > 0 (nur Stellen, an denen beide Werte vorhanden sind)
      let minD = m; const dist = new Int32Array(n);
      for (let r = 0; r < n; r++) {
        let c = 0;
        for (let j = 0; j < m; j++) { const x = mat[r * m + j]!, y = mat[i * m + j]!; if (x >= 0 && y >= 0 && x !== y) c++; }
        dist[r] = c; if (c > 0 && c < minD) minD = c;
      }
      let spalte = -1;
      for (const j of reihenfolge) {
        const y = mat[i * m + j]!;
        if (y < 0) continue;
        for (let r = 0; r < n; r++) if (dist[r] === minD) { const x = mat[r * m + j]!; if (x >= 0 && x !== y) { spalte = j; break; } }
        if (spalte >= 0) break;
      }
      if (spalte < 0) return { ok: false, code: 'nicht-erreichbar' };
      mat[i * m + spalte] = -1;
    }
  }
  // Ergebnis: neue Spalten
  const spalten = schluessel.map(s => s.slice());
  const unterdrueckt = new Array<number>(m).fill(0), geaendert = new Uint8Array(N);
  for (let r = 0; r < n; r++) for (let j = 0; j < m; j++) if (mat[r * m + j]! < 0 && vorher[r * m + j]! >= 0) { spalten[j]![behalten[r]!] = null; unterdrueckt[j]!++; geaendert[behalten[r]!] = 1; }
  return { ok: true, spalten, unterdrueckt, faelle: geaendert.reduce((a, v) => a + v, 0), durchgaenge };
}

/* ---------------------------------------------------------------------------------------------------------------------------- Schritte und Protokoll */

export type AnonymSchritt =
  | { art: 'oben'; spalte: string; prozent?: number; grenze?: number }
  | { art: 'unten'; spalte: string; prozent?: number; grenze?: number }
  | { art: 'lokal'; k?: number; schluessel: string[] }
  | { art: 'entfernen'; spalten: string[] };

export interface ProtokollZeile {
  art: AnonymSchritt['art'];
  /** Merkmal (Spaltenname) */
  merkmal: string;
  /** Zahl der geänderten Fälle (bei „entfernen“: Zahl der Fälle der Spalte) */
  faelle: number;
  grenze?: number; k?: number; prozent?: number;
}
export type AnonymFehlerCode = 'unbekannte-spalte' | 'schluessel-fehlt' | LokalFehler['code'];
export interface AnonymOk {
  ok: true;
  /** die neue Fassung der Daten (Spalten in der Reihenfolge der Eingabe, entfernte fehlen) */
  daten: Record<string, Wert[]>;
  protokoll: ProtokollZeile[];
  saetze: string[];
}
export interface AnonymFehler { ok: false; code: AnonymFehlerCode; merkmal?: string }
export type AnonymErgebnis = AnonymOk | AnonymFehler;

/** Schritte nacheinander auf eine Kopie der Daten anwenden; das Original bleibt. Jeder Schritt schreibt Protokollzeilen (Merkmal, Zahl der Fälle). */
export function anonymisieren(daten: Record<string, Wert[]>, schritte: AnonymSchritt[]): AnonymErgebnis {
  const neu: Record<string, Wert[]> = {};
  for (const [name, sp] of Object.entries(daten)) neu[name] = sp.slice();
  const protokoll: ProtokollZeile[] = [];
  for (const s of schritte) {
    if (s.art === 'oben' || s.art === 'unten') {
      if (!(s.spalte in neu)) return { ok: false, code: 'unbekannte-spalte', merkmal: s.spalte };
      const r = (s.art === 'oben' ? kappenOben : kappenUnten)(neu[s.spalte]!, { grenze: s.grenze, prozent: s.prozent });
      neu[s.spalte] = r.werte;
      protokoll.push({ art: s.art, merkmal: s.spalte, faelle: r.geaendert, grenze: r.grenze, prozent: s.grenze === undefined ? s.prozent ?? (s.art === 'oben' ? 99 : 1) : undefined });
    } else if (s.art === 'lokal') {
      if (!s.schluessel.length) return { ok: false, code: 'schluessel-fehlt' };
      for (const n of s.schluessel) if (!(n in neu)) return { ok: false, code: 'unbekannte-spalte', merkmal: n };
      const k = s.k ?? 3;
      const r = lokalUnterdruecken(s.schluessel.map(n => neu[n]!), k);
      if (!r.ok) return { ok: false, code: r.code };
      s.schluessel.forEach((n, j) => { neu[n] = r.spalten[j]!; });
      s.schluessel.forEach((n, j) => protokoll.push({ art: 'lokal', merkmal: n, faelle: r.unterdrueckt[j]!, k }));
    } else {
      for (const n of s.spalten) {
        if (!(n in neu)) return { ok: false, code: 'unbekannte-spalte', merkmal: n };
        protokoll.push({ art: 'entfernen', merkmal: n, faelle: neu[n]!.length });
        delete neu[n];
      }
    }
  }
  return { ok: true, daten: neu, protokoll, saetze: anonymSaetze(protokoll) };
}

/* ---------------------------------------------------------------------------------------------------------------------------- Sätze */

/** Ganze Sätze für den Bericht, einer je Protokollzeile (bei „lokal“ ein Satz je Schritt, wenn etwas unterdrückt wurde). */
export function anonymSaetze(p: ProtokollZeile[]): string[] {
  const aus: string[] = [];
  const lokal = p.filter(z => z.art === 'lokal');
  for (const z of p) {
    if (z.art === 'oben' || z.art === 'unten') {
      const gr = zahlDe(z.grenze ?? NaN, 2), wer = z.art === 'oben' ? L('über', 'above') : L('unter', 'below');
      const wie = z.prozent !== undefined ? L(` (${zahlDe(z.prozent, 0)}-%-Perzentil)`, ` (${zahlDe(z.prozent, 0)}th percentile)`) : '';
      aus.push(z.art === 'oben'
        ? L(`${Lp(z.faelle, `${z.faelle} Wert`, `${z.faelle} Werte`, `${z.faelle} value`, `${z.faelle} values`)} von „${z.merkmal}“ ${wer} ${gr}${wie} wurden oben auf ${gr} gekappt.`, `${Lp(z.faelle, `${z.faelle} Wert`, `${z.faelle} Werte`, `${z.faelle} value`, `${z.faelle} values`)} of "${z.merkmal}" ${wer} ${gr}${wie} were top-coded at ${gr}.`)
        : L(`${Lp(z.faelle, `${z.faelle} Wert`, `${z.faelle} Werte`, `${z.faelle} value`, `${z.faelle} values`)} von „${z.merkmal}“ ${wer} ${gr}${wie} wurden unten auf ${gr} gekappt.`, `${Lp(z.faelle, `${z.faelle} Wert`, `${z.faelle} Werte`, `${z.faelle} value`, `${z.faelle} values`)} of "${z.merkmal}" ${wer} ${gr}${wie} were bottom-coded at ${gr}.`));
    } else if (z.art === 'entfernen') {
      aus.push(L(`Die Spalte „${z.merkmal}“ wurde entfernt.`, `The column "${z.merkmal}" was removed.`));
    }
  }
  if (lokal.length) {
    const k = lokal[0]!.k ?? 3, summe = lokal.reduce((a, z) => a + z.faelle, 0);
    const teile = lokal.map(z => `${zitat(z.merkmal)}: ${z.faelle}`).join(', ');
    const angaben = Lp(summe, `${summe} Angabe`, `${summe} Angaben`, `${summe} entry`, `${summe} entries`);
    aus.push(summe === 0
      ? L(`Lokales Unterdrücken (k = ${k}): Nichts musste unterdrückt werden.`, `Local suppression (k = ${k}): nothing had to be suppressed.`)
      : L(`Lokal unterdrückt (k = ${k}): ${angaben} entfernt, damit jede Kombination der Schlüsselmerkmale mindestens ${k}-mal vorkommt (${teile}).`, `Locally suppressed (k = ${k}): ${angaben} removed so that every combination of the key variables occurs at least ${k} times (${teile}).`));
  }
  return aus;
}

/** Satz zu den Kennzahlen (vor oder nach dem Anonymisieren). */
export function kennzahlenSatz(z: AnonymKennzahlen): string {
  const pro = zahlDe(Math.round(z.anteilUnterK * 1000) / 10, 1), wr = z.wiedererkennung < 10 ? zahlDe(Math.round(z.wiedererkennung * 100) / 100, 2) : zahlDe(Math.round(z.wiedererkennung * 10) / 10, 1);   // Testrunde 24.10.: unter 10 zwei Stellen (0,46 statt 0,5)
  const satz = Lp(z.unterK,
    `${z.unterK} Fall von ${z.n} (${pro} %) kommt mit seiner Kombination der Schlüsselmerkmale weniger als ${z.k}-mal vor.`,
    `${z.unterK} Fälle von ${z.n} (${pro} %) kommen mit ihrer Kombination der Schlüsselmerkmale weniger als ${z.k}-mal vor.`,
    `${z.unterK} case of ${z.n} (${pro}%) has a combination of the key variables that occurs fewer than ${z.k} times.`,
    `${z.unterK} cases of ${z.n} (${pro}%) have a combination of the key variables that occurs fewer than ${z.k} times.`);
  return z.gewichtet ? `${satz} ${L(`Geschätzte Wiedererkennungen in der Grundgesamtheit (Näherung, Summe von 1/Fk): ${wr}.`, `Estimated re-identifications in the population (approximation, sum of 1/Fk): ${wr}.`)}` : satz;
}

/** Satz zu einem Fehlercode. */
export function anonymFehlerSatz(f: AnonymFehler): string {
  switch (f.code) {
    case 'unbekannte-spalte': return L(`Die Spalte „${f.merkmal ?? ''}“ gibt es nicht.`, `There is no column "${f.merkmal ?? ''}".`);
    case 'schluessel-fehlt': return L('Es braucht mindestens ein Schlüsselmerkmal.', 'At least one key variable is needed.');
    case 'zu-wenig-faelle': return L('Es gibt weniger Fälle als k. Dann kann keine Kombination k-mal vorkommen.', 'There are fewer cases than k, so no combination can occur k times.');
    case 'k': return L('k muss mindestens 1 sein, und es braucht mindestens ein Schlüsselmerkmal.', 'k must be at least 1, and at least one key variable is needed.');
    default: return L('Das Unterdrücken kam zu keinem Ende. Ein kleineres k oder weniger Schlüsselmerkmale helfen.', 'Suppression did not finish. A smaller k or fewer key variables help.');
  }
}
