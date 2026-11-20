/**
 * Fallgewichte (Später, Welle S-A, Teil 1; Fachblatt docs/fachblaetter/SPAETER-A-GRUNDLAGEN.md, Abschnitt 1 und „Entscheidungen Opus“).
 * Reine Funktionen ohne Oberfläche; der Zustand (welche Spalte, welche Art) steht in lib/fallgewicht.svelte.ts.
 *
 * Zwei Arten:
 *  - Häufigkeitsgewicht: ganze Zahlen, die Zeile zählt w-mal (wie PSPP WEIGHT BY). N = Σw. Alle Verfahren, die Gewichte richtig verarbeiten, rechnen es;
 *    die übrigen sind gesperrt, bis sie nachgezogen sind (Tabelle unten).
 *  - Umfragegewicht: beliebige Zahlen > 0 (Kehrwert der Auswahlwahrscheinlichkeit). Statable kennt den Stichprobenplan nicht, darum gibt es nur
 *    BESCHREIBENDE Zahlen (Mittel, Anteile, Prozente, Quartile); jeder p-Wert, jedes KI und jeder Standardfehler ist gesperrt.
 * Das Wort heißt überall „Fallgewicht“ („Gewicht“ ist in Statable schon dreifach belegt: Kappa, Meta-Analyse, Items).
 */
import { L, Lp, d } from './sitzung.svelte';
import { zahlDe } from './format';
import type { OutputItem } from '../engine/types';

export type GewichtArt = 'haeufigkeit' | 'umfrage';
/** Schicht mit nur einem Klumpen: die Regel von survey (`options(survey.lonely.psu)`), die nur für den Aufruf gilt. */
export const EINSAME_REGELN = ['adjust', 'average', 'remove', 'certainty'] as const;
export type EinsameRegel = typeof EINSAME_REGELN[number];
/** Der Stichprobenplan, den die Person angibt (Abschnitt 6, Teil A): Spaltennamen der Daten. `klumpen2` gilt nur mit `klumpen` und beiden Angaben zur Grundgesamtheit (`fpc`, `fpc2`). Ohne `einsam` ist eine Schicht mit einem Klumpen gesperrt. */
export interface Entwurf { klumpen?: string; klumpen2?: string; schicht?: string; fpc?: string; fpc2?: string; einsam?: EinsameRegel }
/** Die Angaben, die R tatsächlich verwendet: die zweite Stufe nur mit erster Stufe und beiden Angaben zur Grundgesamtheit (sonst spielt sie keine Rolle); ohne jede Angabe `null`. */
export function entwurfWirksam(e: Entwurf | undefined | null): Entwurf | null {
  if (!e) return null;
  const zwei = !!(e.klumpen && e.klumpen2 && e.fpc && e.fpc2);
  const w: Entwurf = {
    ...(e.klumpen ? { klumpen: e.klumpen } : {}), ...(zwei ? { klumpen2: e.klumpen2! } : {}), ...(e.schicht ? { schicht: e.schicht } : {}),
    ...(e.fpc ? { fpc: e.fpc } : {}), ...(zwei ? { fpc2: e.fpc2! } : {}), ...(e.einsam && (EINSAME_REGELN as readonly string[]).includes(e.einsam) ? { einsam: e.einsam } : {})
  };
  return w.klumpen || w.schicht || w.fpc ? w : null;
}
export interface Gewicht {
  spalte: string; art: GewichtArt;
  /** Später S-D2, Pflichtangabe beim Umfragegewicht (Entscheidung Opus 1): `true` = „Die Personen wurden einzeln gezogen (nicht ganze Klassen, Schulen, Haushalte; ohne Schichten)“,
   *  `false` = „Nein oder weiß nicht“, fehlt = nicht beantwortet (ältere Projekte). Nur bei `true` rechnet Statable mit dem Stichprobenplan (Status `design`); sonst bleibt alles wie vor S-D2. Bei Häufigkeitsgewicht ohne Bedeutung. */
  klumpenfrei?: boolean;
  /** Abschnitt 6, Teil A: der angegebene Stichprobenplan (Schichten, Klumpen, Grundgesamtheit). Dann ist `klumpenfrei` `true` im Sinn von „designbasiert“ (alle Stellen, die mit „Ja“ rechnen, rechnen mit dem Plan), die Sätze nennen aber den Plan und nie „einzeln gezogen“. Fehlt = einzeln gezogen (`ids = ~1`) oder keine Angabe. */
  entwurf?: Entwurf;
}
/** Was beim Blatt als Abdruck steht: wie gewichtet wurde (zeigt auch später, wie früher gerechnet wurde, wenn das Projekt danach umgestellt wird). */
export interface GewichtAbdruck extends Gewicht {
  summe: number; zeilen: number;
  /** Nur Umfragegewicht: womit die Standardfehler kamen - `survey` (designbasiert mit dem R-Paket survey, Taylor-Linearisierung) oder `beschreibend` (keine Standardfehler, wie vor S-D2). Fehlt = beschreibend. */
  rechenweg?: 'beschreibend' | 'survey';
  /** Version des Pakets bei `rechenweg: 'survey'` (z. B. „4.5“). */
  surveyVersion?: string;
}
/** Wahl des Umfragegewichts mit Antwort „einzeln gezogen: Ja“ - nur dann rechnet Statable designbasiert. */
export const nutztDesign = (g?: Pick<Gewicht, 'art' | 'klumpenfrei'> | null): boolean => !!g && g.art === 'umfrage' && g.klumpenfrei === true;
/** Die Version von survey, mit der Statable rechnet (scripts/webr-pakete.sha256). */
export const SURVEY_VERSION = '4.5';

export class GewichtFehler extends Error {
  constructor(public code: 'zu-gross' | 'nicht-ganzzahlig' | 'negativ' | 'keine-gueltig') { super(code); this.name = 'GewichtFehler'; }
}

/** Toleranz, mit der eine Zahl als ganze Zahl gilt (dann wird gerundet); Σw über diesem Vielfachen der Zeilen sieht nach Hochrechnung aus. */
const TOLERANZ = 1e-9;
export const SUMME_GROSS_FAKTOR = 100;
export const ERWEITERN_MAX = 200000;

/* ---------------------------------------------------------------------------------------------------------------------------------- Prüfen */
export interface Gewichtspruefung {
  fehler: null | { code: 'nicht-ganzzahlig' | 'negativ' | 'keine-gueltig'; angebot?: 'umfrage' };
  /** bereinigt: 0 dort, wo die Zeile nicht zählt (Gewicht 0, fehlend) */
  w: number[];
  summe: number;
  /** Zeilen mit w > 0 */
  zeilen: number;
  nullZeilen: number;
  fehlendZeilen: number;
  hinweise: 'summe-gross'[];
}
const leer = (n: number, fehler: NonNullable<Gewichtspruefung['fehler']>, z = { nullZeilen: 0, fehlendZeilen: 0 }): Gewichtspruefung =>
  ({ fehler, w: Array(n).fill(0), summe: 0, zeilen: 0, nullZeilen: z.nullZeilen, fehlendZeilen: z.fehlendZeilen, hinweise: [] });

/** Prüft die Werte der Gewichtsspalte. Häufigkeit: ganze Zahlen ≥ 0 (Toleranz 1e-9, dann gerundet), sonst Fehler mit dem Angebot, sie als Umfragegewicht zu nehmen.
 *  Umfrage: beliebig > 0. In beiden Arten zählen 0 und fehlend nicht (wie in PSPP, aber mit Zahl in der Meldung); negativ ist ein Fehler. */
export function pruefeGewicht(werte: (number | null)[], art: GewichtArt): Gewichtspruefung {
  let nullZ = 0, fehlend = 0, negativ = false, kommagewicht = false;
  const w = werte.map(v => {
    if (v === null || v === undefined || !Number.isFinite(v)) { fehlend++; return 0; }
    if (v < 0) { negativ = true; return 0; }
    if (v === 0) { nullZ++; return 0; }
    if (art === 'haeufigkeit') {
      const r = Math.round(v);
      if (Math.abs(v - r) > TOLERANZ) { kommagewicht = true; return 0; }
      return r;
    }
    return v;
  });
  const z = { nullZeilen: nullZ, fehlendZeilen: fehlend };
  if (negativ) return leer(werte.length, { code: 'negativ' }, z);
  if (kommagewicht) return leer(werte.length, { code: 'nicht-ganzzahlig', angebot: 'umfrage' }, z);
  const summe = w.reduce((a, b) => a + b, 0), zeilen = w.filter(x => x > 0).length;
  if (!zeilen) return leer(werte.length, { code: 'keine-gueltig' }, z);
  return { fehler: null, w, summe, zeilen, nullZeilen: nullZ, fehlendZeilen: fehlend, hinweise: art === 'haeufigkeit' && summe > SUMME_GROSS_FAKTOR * zeilen ? ['summe-gross'] : [] };
}

/** Die Zeile w-mal (Häufigkeitsgewicht). Gewicht 0 lässt die Zeile verschwinden. Über der Grenze wirft es `zu-gross`, bei Kommagewicht `nicht-ganzzahlig` (nie runden). */
export function erweitern<T>(zeilen: T[], w: number[], grenze = ERWEITERN_MAX): T[] {
  let summe = 0;
  for (const x of w) {
    if (!Number.isFinite(x) || x < 0) throw new GewichtFehler('negativ');
    if (Math.abs(x - Math.round(x)) > TOLERANZ) throw new GewichtFehler('nicht-ganzzahlig');
    summe += Math.round(x);
  }
  if (summe > grenze) throw new GewichtFehler('zu-gross');
  const aus: T[] = [];
  zeilen.forEach((z, i) => { for (let k = Math.round(w[i] ?? 0); k > 0; k--) aus.push(z); });
  return aus;
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Kennzahlen */
const summeVon = (w: number[]) => w.reduce((a, b) => a + b, 0);
/** Gewichte auf Σw = Zahl der Zeilen mit w > 0 (Nullen bleiben 0). Für QUARTILE bei Umfragegewichten: PSPP rechnet mit Σw + 1 und hinge sonst von der Skala der Gewichte ab. */
export function normiere(w: number[]): number[] {
  const k = w.filter(x => x > 0).length, s = summeVon(w.map(x => (x > 0 ? x : 0)));
  return w.map(x => (x > 0 ? (x * k) / s : 0));
}
export const wMittel = (y: number[], w: number[]): number => {
  let a = 0, b = 0;
  y.forEach((v, i) => { const g = w[i]!; if (g > 0) { a += g * v; b += g; } });
  return a / b;
};
/** Varianz mit dem Nenner Σw − 1 (bei Häufigkeiten = Varianz der erweiterten Datei). Bei Umfragegewichten hängt sie von der Skala der Gewichte ab: dort
 *  `normiere` vorschalten (so tut es `beschreibe`, S-C T8). */
export const wVarianz = (y: number[], w: number[]): number => {
  const m = wMittel(y, w);
  let a = 0, b = 0;
  y.forEach((v, i) => { const g = w[i]!; if (g > 0) { a += g * (v - m) ** 2; b += g; } });
  return a / (b - 1);
};
export const wSD = (y: number[], w: number[]): number => Math.sqrt(wVarianz(y, w));

/** Gewichtetes Quantil wie PSPP `percentile.c` (HAVERAGE, EXAMINE): hängt von Σw + 1 ab; bei ganzzahligem Gewicht gleich R `quantile(rep(y, w), type = 6)`.
 *  Ist die Summe der Gewichte zu klein für p, gibt es NaN. */
export function wQuantil(y: number[], w: number[], p: number): number {
  const paare = y.map((v, i) => [v, w[i]!] as const).filter(([v, g]) => g > 0 && Number.isFinite(v)).sort((a, b) => a[0] - b[0]);
  const u: number[] = [], cnt: number[] = [];
  for (const [v, g] of paare) { if (u.length && u[u.length - 1] === v) cnt[cnt.length - 1]! += g; else { u.push(v); cnt.push(g); } }
  const cc: number[] = []; let lauf = 0;
  for (const c of cnt) { lauf += c; cc.push(lauf); }
  const W = lauf, tc = (W + 1) * p;
  let i = 0, j = -1;
  for (let q = 0; q < cc.length; q++) { if (cc[q]! <= tc) i = q + 1; else { j = q + 1; break; } }
  if (j < 0) return NaN;
  const c0 = i > 0 ? cnt[i - 1]! : 0, cc0 = i > 0 ? cc[i - 1]! : 0, y0 = i > 0 ? u[i - 1]! : NaN;
  const cp1 = cnt[j - 1]!, yp1 = u[j - 1]!;
  const g2 = c0 === 0 ? tc / cp1 : cp1 === 0 ? 0 : (tc - cc0) / cp1;
  const g2s = c0 === 0 ? tc : cp1 === 0 ? 0 : tc - cc0;
  if (g2s >= 1) return yp1;
  const a = Number.isNaN(y0) ? 0 : y0;
  if (cp1 >= 1) { if (g2s === 0) return y0; return (1 - g2s) * a + g2s * yp1; }
  return (1 - g2) * a + g2 * yp1;
}

/** Gewichtete Häufigkeiten und Prozente (0 bis 100) einer Kategorie-Spalte; Zeilen ohne Gewicht oder ohne Wert zählen nicht. */
export function wAnteile<T extends string | number = number>(werte: (T | null)[], w: number[]): { werte: T[]; summe: number[]; prozent: number[] } {
  const m = new Map<T, number>();
  werte.forEach((v, i) => { const g = w[i]!; if (v === null || v === undefined || !(g > 0)) return; m.set(v, (m.get(v) ?? 0) + g); });
  const sortiert = [...m.keys()].sort(vergleiche);
  const summe = sortiert.map(k => m.get(k)!), ges = summeVon(summe);
  return { werte: sortiert, summe, prozent: summe.map(x => (100 * x) / ges) };
}
const vergleiche = (a: string | number, b: string | number) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de'));

export interface GewichteteKreuztabelle<A = string | number, B = string | number> { zeilen: A[]; spalten: B[]; summe: number[][]; zeilenprozent: number[][]; spaltenprozent: number[][]; gesamtprozent: number[][] }
/** Gewichtete Kreuztabelle mit allen Prozenten (0 bis 100). `spaltenprozent[i][j]` = Zeile i, Spalte j, bezogen auf die Spaltensumme. */
export function wKreuz<A extends string | number = number, B extends string | number = number>(a: (A | null)[], b: (B | null)[], w: number[]): GewichteteKreuztabelle<A, B> {
  const zs = new Set<A>(), ss = new Set<B>();
  a.forEach((v, i) => { const x = b[i]; if (v !== null && v !== undefined && x !== null && x !== undefined && w[i]! > 0) { zs.add(v); ss.add(x); } });
  const zeilen = [...zs].sort(vergleiche), spalten = [...ss].sort(vergleiche);
  const zi = new Map(zeilen.map((k, i) => [k, i])), si = new Map(spalten.map((k, i) => [k, i]));
  const summe = zeilen.map(() => spalten.map(() => 0));
  a.forEach((v, i) => { const x = b[i]; if (v === null || v === undefined || x === null || x === undefined || !(w[i]! > 0)) return; summe[zi.get(v)!]![si.get(x)!]! += w[i]!; });
  const zsum = summe.map(z => summeVon(z)), ssum = spalten.map((_, j) => summe.reduce((acc, z) => acc + z[j]!, 0)), ges = summeVon(zsum);
  return {
    zeilen, spalten, summe,
    zeilenprozent: summe.map((z, i) => z.map(v => (100 * v) / zsum[i]!)),
    spaltenprozent: summe.map(z => z.map((v, j) => (100 * v) / ssum[j]!)),
    gesamtprozent: summe.map(z => z.map(v => (100 * v) / ges))
  };
}

/** Gewichtete Pearson-Korrelation (nur beschreibend; hängt nicht von der Skala der Gewichte ab). */
export function wKorrelation(x: number[], y: number[], w: number[]): number {
  let sw = 0, mx = 0, my = 0;
  x.forEach((v, i) => { const g = w[i]!; if (g > 0) { sw += g; mx += g * v; my += g * y[i]!; } });
  mx /= sw; my /= sw;
  let sxy = 0, sxx = 0, syy = 0;
  x.forEach((v, i) => { const g = w[i]!; if (g > 0) { sxy += g * (v - mx) * (y[i]! - my); sxx += g * (v - mx) ** 2; syy += g * (y[i]! - my) ** 2; } });
  return sxy / Math.sqrt(sxx * syy);
}

/** Kish: effektive Stichprobengröße (Σw)² / Σw². Ein Hinweis, kein Rechenweg - Schichten und Klumpen kennt Statable nicht. */
export function kish(w: number[]): number {
  const g = w.filter(x => x > 0), s = summeVon(g);
  return (s * s) / summeVon(g.map(x => x * x));
}
/** Designeffekt n / n_eff (n = Zeilen mit w > 0). */
export const designeffekt = (w: number[]): number => w.filter(x => x > 0).length / kish(w);
/** Standardfehler nach der Häufigkeitsformel √(Var / Σw). NUR für Häufigkeitsgewichte richtig: hängt von der Skala der Gewichte ab (Falle 3). */
export const seHaeufigkeit = (y: number[], w: number[]): number => Math.sqrt(wVarianz(y, w) / summeVon(w.filter(x => x > 0)));

export type Beschreibung = {
  summe: number; zeilen: number; n: number; mittel: number; varianz: number; sd: number; min: number; max: number; q25: number; q50: number; q75: number;
  /** nur Häufigkeitsgewicht */ se?: number;
  /** nur Umfragegewicht */ kish?: number; designeffekt?: number;
};
/** Kennzahlen einer Zahlenspalte. n = Σw bei Häufigkeit, = Zeilen bei Umfrage. Bei Umfragegewichten gibt es KEIN `se` (kein Standardfehler, kein KI, kein p). */
export function beschreibe(y: number[], w: number[], art: GewichtArt): Beschreibung {
  const idx = y.map((v, i) => (w[i]! > 0 && Number.isFinite(v) ? i : -1)).filter(i => i >= 0);
  const yy = idx.map(i => y[i]!), ww = idx.map(i => w[i]!);
  const summe = summeVon(ww), zeilen = idx.length;
  const wq = art === 'umfrage' ? normiere(ww) : ww;
  const b: Beschreibung = {
    summe, zeilen, n: art === 'haeufigkeit' ? summe : zeilen, mittel: wMittel(yy, ww), varianz: wVarianz(yy, wq), sd: wSD(yy, wq),
    min: yy.reduce((a, b) => (b < a ? b : a), Infinity), max: yy.reduce((a, b) => (b > a ? b : a), -Infinity), q25: wQuantil(yy, wq, 0.25), q50: wQuantil(yy, wq, 0.5), q75: wQuantil(yy, wq, 0.75)
  };
  if (art === 'haeufigkeit') b.se = seHaeufigkeit(yy, ww);
  else { b.kish = kish(ww); b.designeffekt = designeffekt(ww); }
  return b;
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Welches Verfahren wie */
export type GewichtStatus = 'rechnen' | 'beschreibend' | 'design' | 'sperren' | 'hinweis' | 'unberuehrt';
/** Fachblatt 1.5 mit den Entscheidungen Opus (17.10.): Wie geht jedes Verfahren (und jeder Teil einer Karte) mit einem Fallgewicht um?
 *  rechnen = PSPP (oder Statable) verarbeitet die Gewichte richtig · beschreibend = nur Kennzahlen (Umfragegewicht) ·
 *  design = Umfragegewicht mit der Antwort „einzeln gezogen: Ja“: Standardfehler, Intervalle und Tests designbasiert (R-Paket survey, Später S-D2) · sperren = gesperrt mit Satz, bis nachgezogen ·
 *  hinweis = „Das Fallgewicht wird hier nicht verwendet.“ · unberuehrt = hat mit Fällen und Gewichten nichts zu tun.
 *  Die Schlüssel stehen als `karte:teil`; jede der 19 Karten kommt vor (Test).
 *  Dritter Eintrag (optional, Später S-D2): der Status bei Umfragegewicht MIT der Antwort „Personen einzeln gezogen: Ja“ (`Gewicht.klumpenfrei`). Fehlt er, gilt der zweite.
 *  Ob die Oberfläche den dritten Eintrag nutzt, entscheidet je Karte `DESIGN_ANGEBUNDEN` in gewichtkarten.ts - erst wenn die Karte die R-Rechnung wirklich ruft (A2: Verteilung und
 *  Kreuztabelle, B: Gruppen und Regression), sonst stünde „designbasiert“ auf einem Blatt, das nur beschreibt. */
type Zeile = [GewichtStatus, GewichtStatus] | [GewichtStatus, GewichtStatus, GewichtStatus];   // [Häufigkeit, Umfrage ohne „Ja“, Umfrage mit „Ja“]
const TABELLE: Record<string, Zeile> = {
  'verteilung:kennwerte': ['rechnen', 'beschreibend', 'design'],   // S-D2: mit „Personen einzeln gezogen: Ja“ Mittelwert mit Standardfehler und Intervall (survey)
  'verteilung:mittel-ki-test': ['rechnen', 'sperren', 'design'],   // S-D2: war VERWAIST (stand hier, wurde aber nie erzeugt). Jetzt erzeugt gewichtStellenIds die Stelle über `KartenWahl.mittelTest` (Test gegen einen Wert) - das Merkmal setzt die Karte, sobald sie den Test hat (A2).
  'verteilung:anteil-ki': ['rechnen', 'sperren', 'design'],        // S-D2 (neu): Anteil je Kategorie mit Logit-Intervall; nur mit „einzeln gezogen: Ja“ in den Stellen der Karte (ohne Ja gibt es kein Intervall)
  'verteilung:normalitaet': ['sperren', 'sperren'],
  'verteilung:vielfalt': ['rechnen', 'beschreibend'],   // S-B: Vielfalt (IQV, Shannon, Gini-Simpson): Umfragegewicht nur beschreibend, unverzerrte Form gesperrt
  'verteilung:zufall': ['rechnen', 'sperren'],          // S-B: Bootstrap des Mittelwerts oder Medians einer Spalte
  'referenz:alle': ['sperren', 'sperren'],              // S-D, M7: Referenzbereich - eine Referenzperson zählt einmal, ein Fallgewicht widerspricht dem Begriff (Rangmethode und Normalverteilung rechnen mit den einzelnen Personen)
  'ausreisser:alle': ['hinweis', 'hinweis'],            // S-D, T2: Ausreißertests prüfen Zeilen, nicht gewichtete Fälle (wie datencheck:alle)
  'diagramm:balken': ['rechnen', 'sperren'],   // aus den Tabellen von PSPP (Häufigkeiten, Kreuztabelle), die gewichtet sind
  'diagramm:histogramm': ['sperren', 'sperren'],
  'diagramm:kreis': ['rechnen', 'sperren'],
  'diagramm:box': ['sperren', 'sperren'],
  'diagramm:streu': ['sperren', 'sperren'],
  'diagramm:verlauf': ['sperren', 'sperren'],
  'kreuz:haeufigkeit-prozent': ['rechnen', 'beschreibend'],
  'kreuz:test': ['rechnen', 'sperren', 'design'],   // S-D2: Rao-Scott-F (survey); ohne „Ja“ erscheint der Test bei Umfragegewicht nicht
  'kreuz:exakt': ['rechnen', 'sperren'],
  'kreuz:risiko': ['rechnen', 'sperren'],   // aus den gewichteten Zählungen der Kreuztabelle
  'kreuz:masse': ['rechnen', 'sperren'],    // S-B, M5: Gamma, Tau, Somers d, Lambda, UC aus der gewichteten Tabelle von PSPP; Umfragegewicht sperrt den ganzen Abschnitt (ASE und T brauchen den Stichprobenplan)
  'kreuz:schicht': ['rechnen', 'sperren'],  // S-B, M3: Mantel-Haenszel aus den gewichteten Zellen je Schicht (ganzzahlig); Umfragegewicht gesperrt
  'gruppen:mittelwerte': ['rechnen', 'beschreibend', 'design'],   // S-D2: Gruppenmittel mit Standardfehler und Intervall
  'gruppen:test': ['rechnen', 'sperren', 'design'],   // S-D2: zwei Gruppen designbasierter t-Test, ab drei Gruppen Wald-F
  'gruppen:posthoc-effekt': ['rechnen', 'sperren'],   // nur n, M, SD aus PSPP
  'gruppen:aequivalenz': ['sperren', 'sperren'],       // Äquivalenztest (TOST): aus den einzelnen Werten
  'gruppen:rang': ['sperren', 'sperren'],
  'gruppen:rang-weitere': ['sperren', 'sperren'],   // S-B: Mediantest, Jonckheere-Terpstra, Kolmogorov-Smirnov: aus den einzelnen Werten
  'gruppen:zufall': ['rechnen', 'sperren'],           // S-B: Permutationstest und Bootstrap der Gruppen: Häufigkeitsgewicht über die erweiterte Menge
  'praepost:gepaart': ['rechnen', 'sperren'],
  'praepost:wilcoxon': ['sperren', 'sperren'],
  'praepost:vorzeichen': ['sperren', 'sperren'],      // S-B: Vorzeichentest: aus den einzelnen Paaren
  'praepost:aequivalenz-rci': ['sperren', 'sperren'],   // Äquivalenztest und Reliable Change Index: aus den einzelnen Werten
  'messwiederholung:alle': ['sperren', 'sperren'],
  'zusammenhang:pearson': ['rechnen', 'beschreibend'],
  'zusammenhang:rang': ['sperren', 'sperren'],
  'zusammenhang:zufall': ['rechnen', 'sperren'],      // S-B: Permutationstest und Bootstrap für r
  'korrmatrix:alle': ['sperren', 'sperren'],
  'vorhersage:linear': ['rechnen', 'sperren', 'design'],   // S-D2: einfaches Modell (ein Block); Blöcke, Kovarianzanalyse, zweifaktorielle Varianzanalyse: `vorhersage:linear-block`
  'vorhersage:linear-block': ['rechnen', 'sperren', 'sperren'],   // S-D2 (neu): hierarchische Regression, Kovarianzanalyse, zweifaktorielle Varianzanalyse bleiben mit Umfragegewicht gesperrt, auch mit „Ja“
  'vorhersage:logistik': ['sperren', 'sperren', 'design'],       // S-D2 (neu): die logistische Regression selbst (quasibinomial); ROC und AUC bleiben bei `vorhersage:logistik-roc` gesperrt und entfallen mit Umfragegewicht mit einem Satz
  'vorhersage:logistik-roc': ['sperren', 'sperren'],
  'vorhersage:ordinal-multinomial-zaehl': ['sperren', 'sperren'],
  'vorhersage:zufall': ['rechnen', 'sperren'],        // S-B: Fall-Bootstrap der Regressionskoeffizienten
  'vorhersage:quantil': ['sperren', 'sperren'],       // S-E (Q1): weights= gibt in quantreg bei ganzzahligen Gewichten dieselben Koeffizienten wie das Wiederholen der Zeilen, aber andere Standardfehler und Intervalle
  'vorhersage:penalisiert': ['sperren', 'sperren'],   // S-E (Q2): Ridge, Lasso, Elastic Net - gleiche Fälle stünden in der Kreuzvalidierung zugleich in Training und Test
  'mediation:pfade': ['rechnen', 'sperren'],
  'mediation:bootstrap': ['sperren', 'sperren'],
  'mediation:bedingt': ['sperren', 'sperren'],        // S-D: PROCESS 6, 7, 14 (Bootstrap, Produktterm)
  'moderation:alle': ['sperren', 'sperren'],
  'skala:alpha': ['sperren', 'sperren'],
  'skala:omega': ['sperren', 'sperren'],
  'faktor:komponenten': ['rechnen', 'sperren'],
  'faktor:parallel': ['sperren', 'sperren'],
  'faktor:cfa': ['sperren', 'sperren'],
  'uebereinstimmung:kappa': ['rechnen', 'sperren'],
  'uebereinstimmung:icc-krippendorff': ['sperren', 'sperren'],
  'uebereinstimmung:methodenvergleich': ['sperren', 'sperren'],   // S-F (M6): Passing-Bablok und Deming - jede Probe zählt einmal
  'mehrebenen:alle': ['sperren', 'sperren'],
  'meta:alle': ['hinweis', 'hinweis'],
  'kaplanmeier:alle': ['sperren', 'sperren'],
  'kaplanmeier:sterbetafel': ['sperren', 'sperren'],   // S-F (A): Sterbetafel; ein Häufigkeitsgewicht gäbe nachweislich dieselbe Tafel wie das Wiederholen der Zeilen, bleibt aber gesperrt wie Kaplan-Meier (Opus)
  'kaplanmeier:cox-zeitabh': ['sperren', 'sperren'],   // S-F (A): Cox mit zeitabhängiger Größe; das Fallgewicht geht nicht in die Tabelle in Intervall-Form
  'kaplanmeier:aft': ['sperren', 'sperren'],       // S-F2 (D): AFT-Modell (survreg); wie Cox mit zeitabhängiger Größe, kein Fallgewicht
  'kaplanmeier:frailty': ['sperren', 'sperren'],   // S-F2 (D): Cox mit cluster() oder Frailty; kein Fallgewicht
  'zeitreihen:kreuz': ['sperren', 'sperren'],      // S-F2 (C): Kreuzkorrelation; jeder Zeitpunkt zählt einmal
  'zeitreihen:alle': ['sperren', 'sperren'],         // S-E (Bauer B): jeder Zeitpunkt zählt einmal
  'cluster:alle': ['sperren', 'sperren'],            // S-E (Bauer B): Mehrfachfälle verzerren die Gruppen
  'diskriminanz:alle': ['sperren', 'sperren'],       // Kurs-Paket: lda kennt kein Fallgewicht; ein Häufigkeitsgewicht gäbe andere Leave-one-out-Ergebnisse als das Wiederholen der Zeilen
  'loglinear:alle': ['sperren', 'sperren'],          // Kurs-Paket: die Häufigkeit je Zelle kommt aus einer Spalte der Tabelle (Karte), nicht aus dem Fallgewicht
  'armut:alle': ['sperren', 'sperren'],              // Abschnitt 3: das Gewicht der Karte ist eine eigene Wahl auf der Karte (Pflicht), nicht das Fallgewicht; beides zugleich ist gesperrt
  'manova:alle': ['sperren', 'sperren'],             // Kurs-Paket: manova kennt kein Fallgewicht
  'vorhersage:probit': ['sperren', 'sperren'],       // Kurs-Paket: glm mit Fallgewicht gäbe andere Standardfehler als das Wiederholen der Zeilen
  'vorhersage:nls': ['sperren', 'sperren'],          // Abschnitt 5: nls kennt hier kein Fallgewicht; Zeilen zu wiederholen gäbe andere Freiheitsgrade und Standardfehler
  'vorhersage:wls': ['sperren', 'sperren'],          // Kurs-Paket: Präzisionsgewichte sind nicht das Fallgewicht; beides zugleich ist gesperrt
  'mehrfach:alle': ['sperren', 'sperren'],
  'einzelfall:alle': ['hinweis', 'hinweis'],
  'faelle:alle': ['hinweis', 'hinweis'],
  'kategorien:alle': ['hinweis', 'hinweis'],
  'datencheck:alle': ['hinweis', 'hinweis'],
  'normwerte:alle': ['sperren', 'sperren'],
  'power:alle': ['unberuehrt', 'unberuehrt'],
  'lernlabor:alle': ['unberuehrt', 'unberuehrt'],
  'assistent:berechnen': ['unberuehrt', 'unberuehrt'],
  'assistent:eigenschaften': ['unberuehrt', 'unberuehrt'],   // S-F2 (D5): ändert nur Beschriftungen, Wertelabels, Fehlend-Codes und Messniveau - keine Werte, keine Rechnung
  'assistent:vergleichen': ['unberuehrt', 'unberuehrt'],     // S-F2 (D6): Zelle-für-Zelle-Vergleich zweier Dateien, ändert die Daten nicht; das Fallgewicht spielt keine Rolle
  'assistent:umkodieren': ['unberuehrt', 'unberuehrt'],
  'assistent:auswahl': ['unberuehrt', 'unberuehrt'],
  'assistent:doppelte': ['unberuehrt', 'unberuehrt'],
  'assistent:aggregieren': ['unberuehrt', 'unberuehrt'],
  'assistent:intervalle': ['unberuehrt', 'unberuehrt'],   // S-F (A): Zeitpunkte je Person → Intervalle; Zeilenrechnung, das Fallgewicht geht nicht in die neue Tabelle (der Assistent sagt es)
  'tabelle:zusammenstellen': ['rechnen', 'beschreibend'],   // S-C: n, Prozent, M, SD, Median; Häufigkeitsgewicht über die erweiterte Menge (nie gerundet), Umfragegewicht nur beschreibend, KEINE Tests
  'tabelle:mehrfach': ['rechnen', 'beschreibend'],          // S-C: Mehrfachantwort-Set in der Tabelle; Gewichte gelten für Fälle, nicht für Antworten (IBM)
  // Später S-C, Bauer B: Zeilenrechnungen der Datenassistenten. Das Fallgewicht verändert ihr Ergebnis nicht; der Rang-Assistent setzt WEIGHT OFF davor und stellt es danach wieder her (rangbildung.ts).
  'assistent:zaehlen': ['unberuehrt', 'unberuehrt'],
  'assistent:rang': ['unberuehrt', 'unberuehrt'],
  'assistent:datum': ['unberuehrt', 'unberuehrt'],
  'assistent:sortieren': ['unberuehrt', 'unberuehrt'],
  'assistent:fehlendcodes': ['unberuehrt', 'unberuehrt'],
  'assistent:mikrodaten': ['unberuehrt', 'unberuehrt'],   // M5b: Kappen, Unterdrücken, Spalten entfernen; das Fallgewicht geht nur in die Kennzahlen (Fk), nicht in die Schritte (der Assistent sagt es)
  'assistent:zeitreihe': ['unberuehrt', 'unberuehrt'],   // S-F2 (C): Vorwert, Folgewert, Veränderung, gleitender Mittelwert - Zeilenrechnung; das Fallgewicht geht nicht in die neue Spalte (der Assistent sagt es)
  'diagramm:mittelgruppen': ['rechnen', 'beschreibend', 'design'],   // S-F2 (E): Balken Mittelwert nach Gruppe, gleich gruppen:mittelwerte
  'assistent:winsor': ['hinweis', 'hinweis'],   // Field-Stufe 3b: die Perzentile zählen jede Zeile einmal, das Fallgewicht bleibt unbenutzt (der Assistent sagt es)
  'assistent:abgleich': ['hinweis', 'hinweis'],   // Abschnitt 6: der Abgleich ignoriert das Fallgewicht; der Assistent sagt es
  'assistent:auffaellig': ['hinweis', 'hinweis']   // auffällige Fälle ignorieren das Fallgewicht (datencheck:alle = hinweis); der Assistent sagt es
};
export const gewichtIds = (): string[] => Object.keys(TABELLE);

/** Art des Gewichts, optional mit der Antwort „einzeln gezogen“: entweder `'umfrage'` + `klumpenfrei` oder das Gewicht selbst (`{ art, klumpenfrei }`, auch ein Abdruck). */
export type GewichtWahl = GewichtArt | Pick<Gewicht, 'art' | 'klumpenfrei'>;
const wahlVon = (art: GewichtWahl, klumpenfrei?: boolean): { art: GewichtArt; klumpenfrei: boolean } =>
  typeof art === 'string' ? { art, klumpenfrei: klumpenfrei === true } : { art: art.art, klumpenfrei: (klumpenfrei ?? art.klumpenfrei) === true };
/** Der Status einer Stelle. Bei Umfragegewicht mit `klumpenfrei === true` gilt der dritte Eintrag der Tabelle (`design`), sofern die Stelle einen hat; sonst wie ohne die Angabe. */
export function gewichtStatus(id: string, art: GewichtWahl, klumpenfrei?: boolean): GewichtStatus {
  const z: Zeile | undefined = TABELLE[id];
  if (!z) throw new Error(`Unbekannte Verfahrensstelle für das Fallgewicht: ${id}`);
  return statusDerZeile(z, wahlVon(art, klumpenfrei));
}
/** Welcher Eintrag einer Zeile der Tabelle gilt: Häufigkeit = erster, Umfrage = zweiter, Umfrage mit `klumpenfrei` und einem dritten Eintrag = dritter. */
export function statusDerZeile(z: readonly GewichtStatus[], w: { art: GewichtArt; klumpenfrei: boolean }): GewichtStatus {
  if (w.art === 'haeufigkeit') return z[0]!;
  return w.klumpenfrei && z.length === 3 ? z[2]! : z[1]!;
}
/** Der schwerste Status mehrerer Teile: sperren vor hinweis vor design vor beschreibend vor rechnen vor unberührt. */
export const STATUS_RANG: readonly GewichtStatus[] = ['unberuehrt', 'rechnen', 'beschreibend', 'design', 'hinweis', 'sperren'];
export function schwersterStatus(ids: string[], art: GewichtWahl, klumpenfrei?: boolean): GewichtStatus {
  return ids.map(i => gewichtStatus(i, art, klumpenfrei)).reduce<GewichtStatus>((a, b) => (STATUS_RANG.indexOf(b) > STATUS_RANG.indexOf(a) ? b : a), 'unberuehrt');
}

export const HINWEIS_NICHT_VERWENDET = () => L('Das Fallgewicht wird hier nicht verwendet.', 'The case weight is not used here.');
/** Der Satz, der erklärt, warum ein Verfahren mit dem Fallgewicht gesperrt ist (oder dass es das Gewicht nicht verwendet). `titel`: Name des Verfahrens oder Teils. Null, wenn nichts zu sagen ist.
 *  Umfragegewicht (Später S-D2): ohne „Personen einzeln gezogen: Ja“ steht bei den Stellen, die mit „Ja“ rechnen würden, der Klumpen-Satz; mit „Ja“ bei den Stellen, die auch dann
 *  gesperrt bleiben, der Satz „keine designbasierte Rechnung“; sonst (nie rechenbar) der bisherige Satz mit dem Stichprobenplan. */
export function sperrSatz(id: string, g: Gewicht, titel: string): string | null {
  const st = gewichtStatus(id, g);
  if (st === 'hinweis') return HINWEIS_NICHT_VERWENDET();
  if (st !== 'sperren') return null;
  if (g.art === 'haeufigkeit') {
    return d(
      `${titel} kann mit Fallgewichten noch nicht rechnen: Es würde jede Zeile einmal zählen, obwohl dein Fallgewicht ${g.spalte} sagt, dass sie mehrfach vorkommt. Schalte das Fallgewicht aus oder wähle ein anderes Verfahren.`,
      `${titel} kann mit Fallgewichten noch nicht rechnen: Es würde jede Zeile einmal zählen, obwohl Ihr Fallgewicht ${g.spalte} sagt, dass sie mehrfach vorkommt. Schalten Sie das Fallgewicht aus oder wählen Sie ein anderes Verfahren.`,
      `${titel} cannot work with case weights yet: it would count every row once, although your case weight ${g.spalte} says that rows occur several times. Switch the case weight off or choose another method.`);
  }
  if (nutztDesign(g) && g.entwurf) {
    const rest = d('Für dieses Verfahren gibt es in Statable keine designbasierte Rechnung, und die Rechnung mit Häufigkeiten gäbe falsche Standardfehler. Gerechnet werden mit Umfragegewicht: Mittelwerte und Anteile mit Intervall, Kreuztabellen mit Rao-Scott-Test, t-Test und Mittelwertvergleich, lineare und logistische Regression.', 'Für dieses Verfahren gibt es in Statable keine designbasierte Rechnung, und die Rechnung mit Häufigkeiten gäbe falsche Standardfehler. Gerechnet werden mit Umfragegewicht: Mittelwerte und Anteile mit Intervall, Kreuztabellen mit Rao-Scott-Test, t-Test und Mittelwertvergleich, lineare und logistische Regression.', 'For this method Statable has no design-based calculation, and calculating with frequencies would give wrong standard errors. Calculated with a survey weight: means and proportions with interval, crosstabs with the Rao-Scott test, t test and comparison of means, linear and logistic regression.');
    return d(
      `${titel} ist mit einem Umfragegewicht gesperrt. Dein Fallgewicht ${g.spalte} gleicht die Auswahl der Befragten aus, und du hast den Stichprobenplan angegeben. ${rest}`,
      `${titel} ist mit einem Umfragegewicht gesperrt. Ihr Fallgewicht ${g.spalte} gleicht die Auswahl der Befragten aus, und Sie haben den Stichprobenplan angegeben. ${rest}`,
      `${titel} is blocked with a survey weight. Your case weight ${g.spalte} adjusts for how the respondents were selected, and you stated the sampling design. ${rest}`);
  }
  if (nutztDesign(g)) {
    return d(
      `${titel} ist mit einem Umfragegewicht gesperrt. Dein Fallgewicht ${g.spalte} gleicht die Auswahl der Befragten aus, und du hast angegeben, dass die Personen einzeln gezogen wurden. Für dieses Verfahren gibt es in Statable keine designbasierte Rechnung, und die Rechnung mit Häufigkeiten gäbe falsche Standardfehler. Gerechnet werden mit Umfragegewicht: Mittelwerte und Anteile mit Intervall, Kreuztabellen mit Rao-Scott-Test, t-Test und Mittelwertvergleich, lineare und logistische Regression.`,
      `${titel} ist mit einem Umfragegewicht gesperrt. Ihr Fallgewicht ${g.spalte} gleicht die Auswahl der Befragten aus, und Sie haben angegeben, dass die Personen einzeln gezogen wurden. Für dieses Verfahren gibt es in Statable keine designbasierte Rechnung, und die Rechnung mit Häufigkeiten gäbe falsche Standardfehler. Gerechnet werden mit Umfragegewicht: Mittelwerte und Anteile mit Intervall, Kreuztabellen mit Rao-Scott-Test, t-Test und Mittelwertvergleich, lineare und logistische Regression.`,
      `${titel} is blocked with a survey weight. Your case weight ${g.spalte} adjusts for how the respondents were selected, and you stated that the people were drawn individually. For this method Statable has no design-based calculation, and calculating with frequencies would give wrong standard errors. Calculated with a survey weight: means and proportions with interval, crosstabs with the Rao-Scott test, t test and comparison of means, linear and logistic regression.`);
  }
  if (gewichtStatus(id, { art: 'umfrage', klumpenfrei: true }) === 'design') {
    return d(
      `${titel} ist mit dem Umfragegewicht ${g.spalte} gesperrt. ${klumpenSperrSatz()} Wenn du die Personen einzeln gezogen hast, gib das beim Fallgewicht an. Gewichtet zeigen kann Statable weiterhin: Mittelwerte, Anteile, Prozente.`,
      `${titel} ist mit dem Umfragegewicht ${g.spalte} gesperrt. ${klumpenSperrSatz()} Wenn Sie die Personen einzeln gezogen haben, geben Sie das beim Fallgewicht an. Gewichtet zeigen kann Statable weiterhin: Mittelwerte, Anteile, Prozente.`,
      `${titel} is blocked with the survey weight ${g.spalte}. ${klumpenSperrSatz()} If you drew the people individually, state this in the case weight. What Statable can still show, weighted: means, proportions, percentages.`);
  }
  return d(
    `${titel} ist mit einem Umfragegewicht gesperrt. Dein Fallgewicht ${g.spalte} gleicht die Auswahl der Befragten aus. Tests und Intervalle brauchen dafür den Stichprobenplan (Schichten, Klumpen); dieses Verfahren rechnet ihn nicht ein, und die Rechnung mit Häufigkeiten gäbe falsche Standardfehler. Gewichtet zeigen kann Statable: Mittelwerte, Anteile, Prozente.`,
    `${titel} ist mit einem Umfragegewicht gesperrt. Ihr Fallgewicht ${g.spalte} gleicht die Auswahl der Befragten aus. Tests und Intervalle brauchen dafür den Stichprobenplan (Schichten, Klumpen); dieses Verfahren rechnet ihn nicht ein, und die Rechnung mit Häufigkeiten gäbe falsche Standardfehler. Gewichtet zeigen kann Statable: Mittelwerte, Anteile, Prozente.`,
    `${titel} is blocked with a survey weight. Your case weight ${g.spalte} adjusts for how the respondents were selected. Tests and intervals need the sampling design for that (strata, clusters); this method does not take it into account, and calculating with frequencies would give wrong standard errors. What Statable can show, weighted: means, proportions, percentages.`);
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Engine */
/** `WEIGHT BY w.` bzw. `WEIGHT OFF.` */
export const gewichtBefehl = (g?: Gewicht | null): string => (g ? `WEIGHT BY ${g.spalte}.` : 'WEIGHT OFF.');
/** Liest die Ausgabe von `SHOW WEIGHT.` (Tabelle „Settings“, Zeile WEIGHT): der Name der Gewichtsspalte oder null bei OFF. */
export function leseEngineGewicht(items: OutputItem[]): string | null {
  for (const it of items) {
    if (it.type !== 'table') continue;
    const kopf = it.cells.find(c => c.c === 0 && c.t.trim().toUpperCase() === 'WEIGHT');
    if (!kopf) continue;
    const wert = it.cells.find(c => c.r === kopf.r && c.c === 1)?.t.trim();
    return !wert || wert.toUpperCase() === 'OFF' ? null : wert;
  }
  return null;
}
/** Vergleich Engine ↔ Projekt (Spaltennamen ohne Beachtung von Groß/klein):
 *  ok = gleich · frage = die Engine hat ein Gewicht, das das Projekt nicht (so) kennt → Pflichtfrage nach der Art · setzen = das Projekt hat eines, die Engine nicht → wieder einsetzen. */
export function gewichtAbgleich(engine: string | null, projekt?: Gewicht | null): 'ok' | 'frage' | 'setzen' {
  if (engine) return projekt && projekt.spalte.toLowerCase() === engine.toLowerCase() ? 'ok' : 'frage';
  return projekt ? 'setzen' : 'ok';
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Sätze */
const zahl = (x: number) => zahlDe(Math.round(x * 1000) / 1000);
/** „gewichtet mit w als Häufigkeit (N = 15 aus 8 Zeilen)“ - steht unter „Gerechnet“ in jedem Ergebnis und im Bericht. */
export function gewichtSatz(g: Gewicht, summe: number, zeilen: number): string {
  if (g.art === 'haeufigkeit')
    return Lp(zeilen, `gewichtet mit ${g.spalte} als Häufigkeit (N = ${zahl(summe)} aus ${zeilen} Zeile)`, `gewichtet mit ${g.spalte} als Häufigkeit (N = ${zahl(summe)} aus ${zeilen} Zeilen)`,
      `weighted by ${g.spalte} as frequency (N = ${zahl(summe)} from ${zeilen} row)`, `weighted by ${g.spalte} as frequency (N = ${zahl(summe)} from ${zeilen} rows)`);
  if (g.klumpenfrei === true && g.entwurf)
    return L(`gewichtet mit ${g.spalte} als Umfragegewicht (n = ${zeilen}, Summe der Gewichte ${zahl(summe)}, Stichprobenplan: ${entwurfWorte(g.entwurf)})`, `weighted by ${g.spalte} as survey weight (n = ${zeilen}, sum of the weights ${zahl(summe)}, sampling design: ${entwurfWorte(g.entwurf)})`);
  if (g.klumpenfrei === true)
    return L(`gewichtet mit ${g.spalte} als Umfragegewicht (n = ${zeilen}, Summe der Gewichte ${zahl(summe)}, Personen einzeln gezogen)`, `weighted by ${g.spalte} as survey weight (n = ${zeilen}, sum of the weights ${zahl(summe)}, people drawn individually)`);
  return L(`gewichtet mit ${g.spalte} als Umfragegewicht (n = ${zeilen}, Summe der Gewichte ${zahl(summe)})`, `weighted by ${g.spalte} as survey weight (n = ${zeilen}, sum of the weights ${zahl(summe)})`);
}
/** Die Fußzeile unter einer Tabelle: „Gewichtet mit w als Häufigkeit (N = 15 aus 8 Zeilen).“ */
export function gewichtFuss(g: GewichtAbdruck): string { const t = gewichtSatz(g, g.summe, g.zeilen); return t.charAt(0).toUpperCase() + t.slice(1) + '.'; }
/** Der Satz im Methodenteil des Berichts (Fachblatt S-A, 1.4): womit die Auswertungen gewichtet sind; leer, wenn keine Auswertung gewichtet ist.
 *  `arten`: die `art` der gewichteten Blätter, damit der Satz auch auf fehlende Diagramme hinweist. */
export function gewichtBerichtSatz(blaetter: { art: string; gewicht?: GewichtAbdruck }[]): string {
  const mit = blaetter.filter(b => b.gewicht), n = blaetter.length;
  if (!mit.length) return '';
  const verschieden = new Map<string, GewichtAbdruck>();
  for (const b of mit) verschieden.set(`${b.gewicht!.spalte}|${b.gewicht!.art}`, b.gewicht!);
  const beschreibe = (g: GewichtAbdruck) => (g.art === 'haeufigkeit' ? Lp(g.zeilen, `${g.spalte}, Häufigkeitsgewicht, N = ${zahl(g.summe)} aus ${g.zeilen} Zeile`, `${g.spalte}, Häufigkeitsgewicht, N = ${zahl(g.summe)} aus ${g.zeilen} Zeilen`, `${g.spalte}, frequency weight, N = ${zahl(g.summe)} from ${g.zeilen} row`, `${g.spalte}, frequency weight, N = ${zahl(g.summe)} from ${g.zeilen} rows`)
    : g.klumpenfrei === true && g.entwurf ? L(`${g.spalte}, Umfragegewicht, Stichprobenplan: ${entwurfWorte(g.entwurf)}, n = ${g.zeilen}, Summe der Gewichte ${zahl(g.summe)}`, `${g.spalte}, survey weight, sampling design: ${entwurfWorte(g.entwurf)}, n = ${g.zeilen}, sum of the weights ${zahl(g.summe)}`)
    : g.klumpenfrei === true ? L(`${g.spalte}, Umfragegewicht, Personen einzeln gezogen, n = ${g.zeilen}, Summe der Gewichte ${zahl(g.summe)}`, `${g.spalte}, survey weight, people drawn individually, n = ${g.zeilen}, sum of the weights ${zahl(g.summe)}`)
    : L(`${g.spalte}, Umfragegewicht, n = ${g.zeilen}, Summe der Gewichte ${zahl(g.summe)}`, `${g.spalte}, survey weight, n = ${g.zeilen}, sum of the weights ${zahl(g.summe)}`));
  let satz: string;
  if (verschieden.size === 1) {
    const g = [...verschieden.values()][0]!;
    satz = mit.length === n
      ? Lp(n, `Die Auswertung ist mit dem Fallgewicht ${beschreibe(g)} gewichtet.`, `Alle Auswertungen sind mit dem Fallgewicht ${beschreibe(g)} gewichtet.`, `The analysis is weighted by the case weight ${beschreibe(g)}.`, `All analyses are weighted by the case weight ${beschreibe(g)}.`)
      : Lp(n, `${mit.length} von ${n} Auswertung ist mit dem Fallgewicht ${beschreibe(g)} gewichtet.`, `${mit.length} von ${n} Auswertungen sind mit dem Fallgewicht ${beschreibe(g)} gewichtet.`, `${mit.length} of ${n} analysis is weighted by the case weight ${beschreibe(g)}.`, `${mit.length} of ${n} analyses are weighted by the case weight ${beschreibe(g)}.`);
  } else satz = L(`${mit.length} von ${n} Auswertungen sind gewichtet (${[...verschieden.values()].map(beschreibe).join('; ')}).`, `${mit.length} of ${n} analyses are weighted (${[...verschieden.values()].map(beschreibe).join('; ')}).`);
  // Umfragegewicht: Blätter mit `rechenweg: 'survey'` haben designbasierte Standardfehler (Später S-D2), alle anderen nur beschreibende Kennzahlen
  // Tabellen für die Veröffentlichung (art 'amtlich') nennen ihre Fehlerrechnung selbst in der Fußnote (Taylor oder Replikationsgewichte) - hier nicht mitzählen.
  const umfrage = mit.filter(b => b.gewicht!.art === 'umfrage' && b.art !== 'amtlich'), mitDesign = umfrage.some(b => b.gewicht!.rechenweg === 'survey'), ohneDesign = umfrage.some(b => b.gewicht!.rechenweg !== 'survey');
  if (ohneDesign) satz += ' ' + L('Mit einem Umfragegewicht werden nur beschreibende Kennzahlen berichtet; Tests und Intervalle fehlen, weil der Stichprobenplan nicht bekannt ist.', 'With a survey weight only descriptive statistics are reported; tests and intervals are missing because the sampling design is not known.');
  if (mitDesign) satz += ' ' + (ohneDesign ? L('Wo Standardfehler, Intervalle und Tests stehen, sind sie designbasiert gerechnet:', 'Where standard errors, intervals and tests are given, they are design-based:') + ' ' : '') + designMethodenTeil(umfrage.find(b => b.gewicht!.rechenweg === 'survey')?.gewicht?.entwurf);
  if (mit.some(b => ['gruppen', 'praepost', 'zusammenhang', 'verteilung', 'vorhersage'].includes(b.art))) satz += ' ' + L('Diagramme, die einzelne Zeilen zeigen, fehlen, solange sie Fallgewichte nicht berücksichtigen.', 'Charts that show individual rows are missing as long as they do not take case weights into account.');
  return satz;
}
/** Kish-Hinweis bei Umfragegewichten: „Effektive Stichprobengröße etwa 6,6 statt 8 Personen“. Ein Hinweis, kein Rechenweg. */
export function kishSatz(w: number[]): string {
  const n = w.filter(x => x > 0).length, k = Math.round(kish(w) * 10) / 10;
  return Lp(n, `Effektive Stichprobengröße etwa ${zahlDe(k, 1)} statt ${n} Person (nach Kish; Schichten und Klumpen sind dabei nicht berücksichtigt).`, `Effektive Stichprobengröße etwa ${zahlDe(k, 1)} statt ${n} Personen (nach Kish; Schichten und Klumpen sind dabei nicht berücksichtigt).`,
    `Effective sample size about ${zahlDe(k, 1)} instead of ${n} person (after Kish; strata and clusters are not taken into account).`, `Effective sample size about ${zahlDe(k, 1)} instead of ${n} people (after Kish; strata and clusters are not taken into account).`);
}


/* ---------------------------------------------------------------------------------------------------------------------------------- Sätze für die designbasierte Rechnung (Später S-D2; Fachblatt 0.6 mit Entscheidungen Opus) */
/** Wortlaut der Pflichtfrage beim Umfragegewicht (Entscheidung Opus 1) mit den beiden Antworten. */
export const klumpenFrage = (): { frage: string; ja: string; nein: string } => ({
  frage: L('Wurden die Personen einzeln gezogen, also nicht ganze Klassen, Schulen oder Haushalte, und ohne Schichten?', 'Were the people drawn individually, that is, not whole classes, schools or households, and without strata?'),
  ja: L('Ja', 'Yes'), nein: L('Nein oder weiß nicht', 'No or I do not know')
});
/** Umfragegewicht ohne „Ja“: warum Standardfehler, Intervalle und Tests fehlen (Entscheidung Opus 1). */
export const klumpenSperrSatz = (): string =>
  L('Wer mit Klumpen oder Schichten gezogen hat, gibt den Stichprobenplan an. Ohne ihn wären die Standardfehler zu klein.',
    'If you sampled with clusters or strata, state the sampling design. Without it the standard errors would be too small.');
/* Stichprobenplan in Worten (Abschnitt 6, Teil A) */
export const einsamName = (r: EinsameRegel): string => ({
  adjust: L('Abweichung vom Gesamtmittel (adjust)', 'deviation from the overall mean (adjust)'),
  average: L('Mittel der anderen Schichten (average)', 'average of the other strata (average)'),
  remove: L('trägt nichts bei (remove)', 'contributes nothing (remove)'),
  certainty: L('sicher gezogen (certainty)', 'selected with certainty (certainty)')
})[r];
/** Der Satz zur Regel: Sie verändert den Standardfehler, nicht das Mittel. */
export const einsamSatz = (): string => L('Die Regel verändert den Standardfehler, das Mittel bleibt gleich.', 'The rule changes the standard error; the mean stays the same.');
/** Der Plan in Worten für Fußzeile, Methode und Bericht: „Schicht stype, Klumpen dnum, Grundgesamtheit fpc“. */
export function entwurfWorte(e: Entwurf): string {
  const teile = [e.schicht ? L(`Schicht ${e.schicht}`, `stratum ${e.schicht}`) : '', e.klumpen ? L(`Klumpen ${e.klumpen}`, `cluster ${e.klumpen}`) : '', e.klumpen2 ? L(`zweite Stufe ${e.klumpen2}`, `second stage ${e.klumpen2}`) : '',
    e.fpc ? L(`Grundgesamtheit ${e.fpc}`, `population size ${e.fpc}`) : '', e.fpc2 ? L(`Grundgesamtheit zweite Stufe ${e.fpc2}`, `population size second stage ${e.fpc2}`) : ''];
  return teile.filter(Boolean).join(', ');
}
/** Teil des Methodensatzes ohne den Anfang „Alle Schätzungen sind mit … gewichtet“ (lib/umfrage.ts setzt ihn zusammen). */
export function designMethodenTeil(entwurf?: Entwurf): string {
  if (entwurf) {
    const regel = entwurf.einsam ? L(` Schicht mit nur einem Klumpen: ${einsamName(entwurf.einsam)}.`, ` Stratum with only one cluster: ${einsamName(entwurf.einsam)}.`) : '';
    return L(`Standardfehler, Konfidenzintervalle und Tests sind designbasiert (Taylor-Linearisierung; Stichprobenplan: ${entwurfWorte(entwurf)}; R-Paket survey, Version ${SURVEY_VERSION}, Lumley, 2004).`,
      `Standard errors, confidence intervals and tests are design-based (Taylor linearization; sampling design: ${entwurfWorte(entwurf)}; R package survey, version ${SURVEY_VERSION}, Lumley, 2004).`) + regel;
  }
  return L(`Standardfehler, Konfidenzintervalle und Tests sind designbasiert (Taylor-Linearisierung, einfache Auswahl mit ungleichen Gewichten ohne Schichten und Klumpen; R-Paket survey, Version ${SURVEY_VERSION}, Lumley, 2004).`,
    `Standard errors, confidence intervals and tests are design-based (Taylor linearization, simple sampling with unequal weights without strata and clusters; R package survey, version ${SURVEY_VERSION}, Lumley, 2004).`);
}
/** Info im Kopf des Blattes, wenn mindestens eine Stelle designbasiert rechnet (ersetzt dort den Satz „Tests, Intervalle und Standardfehler gibt es mit einem Umfragegewicht nicht“). */
export const designInfoSatz = (g: Gewicht): string => g.entwurf
  ? L(`Gerechnet wird mit dem Umfragegewicht ${g.spalte} und dem angegebenen Stichprobenplan (${entwurfWorte(g.entwurf)}): Mittelwerte, Anteile und Prozente gewichtet; Standardfehler, Intervalle und Tests designbasiert (Taylor-Linearisierung).`,
    `Calculated with the survey weight ${g.spalte} and the stated sampling design (${entwurfWorte(g.entwurf)}): means, proportions and percentages weighted; standard errors, intervals and tests design-based (Taylor linearization).`)
  : L(`Gerechnet wird mit dem Umfragegewicht ${g.spalte}, Personen einzeln gezogen: Mittelwerte, Anteile und Prozente gewichtet; Standardfehler, Intervalle und Tests designbasiert (Taylor-Linearisierung, nur Gewichte).`,
    `Calculated with the survey weight ${g.spalte}, people drawn individually: means, proportions and percentages weighted; standard errors, intervals and tests design-based (Taylor linearization, weights only).`);
/** Der kleine Satz darunter: wann die designbasierte Rechnung stimmt (die Antwort der Person) und wann nicht. */
export const designKleinSatz = (entwurf?: Entwurf): string => entwurf ? d(
  'Das gilt, weil du den Stichprobenplan angegeben hast. Passt er nicht zur Erhebung, sind die Intervalle zu schmal oder zu breit.',
  'Das gilt, weil Sie den Stichprobenplan angegeben haben. Passt er nicht zur Erhebung, sind die Intervalle zu schmal oder zu breit.',
  'This applies because you stated the sampling design. If it does not fit the survey, the intervals are too narrow or too wide.') : d(
  'Das gilt, weil du angegeben hast, dass die Befragten einzeln gezogen wurden. Wurde in Gruppen gezogen (Klassen, Haushalte, Orte) oder nach Schichten, sind die Intervalle zu schmal oder zu breit. Statable kennt den Stichprobenplan nicht.',
  'Das gilt, weil Sie angegeben haben, dass die Befragten einzeln gezogen wurden. Wurde in Gruppen gezogen (Klassen, Haushalte, Orte) oder nach Schichten, sind die Intervalle zu schmal oder zu breit. Statable kennt den Stichprobenplan nicht.',
  'This applies because you stated that the respondents were drawn individually. If they were drawn in groups (classes, households, places) or by strata, the intervals are too narrow or too wide. Statable does not know the sampling design.');

/** Das Blatt-Abdruck-Feld `rechenweg`: `design` → survey (mit Version), `beschreibend` → beschreibend, alles andere (und jedes Häufigkeitsgewicht) bleibt unverändert. */
export function abdruckMitRechenweg(g: GewichtAbdruck, status: GewichtStatus): GewichtAbdruck {
  if (g.art !== 'umfrage') return g;
  if (status === 'design') return { ...g, rechenweg: 'survey', surveyVersion: SURVEY_VERSION };
  if (status === 'beschreibend') return { ...g, rechenweg: 'beschreibend' };
  return g;
}
