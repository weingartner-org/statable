/**
 * Mehrfachantworten (Fragebogen „Mehreres ankreuzen“): Sets aus mehreren 0/1-Spalten, Häufigkeitstabelle und Kreuztabelle mit einer Gruppenspalte.
 *
 * PSPP 2.1.1 kann das nicht: `MRSETS` wird gelesen, aber `MULT RESPONSE` ist „not yet implemented“ und CTABLES kennt keine Mehrfachantwort-Sets
 * (docs/PSPP-BEFUNDE.md). Statable rechnet darum selbst, nach der Logik von SPSS `MRSETS` + `MULT RESPONSE` (Mehrfachdichotomie):
 *  - Antworten = Zahl der Spalten, in denen der Zählwert (z. B. 1) steht; je Option die Spaltensumme.
 *  - Gültige Fälle = Fälle mit mindestens einer Ankreuzung. SPSS: „a case is considered missing if none of the component variables
 *    contains the tabulating value“ (IBM, MISSING Subcommand der MULT RESPONSE; Standard TABLE).
 *  - Prozent der Antworten = Anzahl / alle Antworten (summiert sich auf 100 %); Prozent der Fälle = Anzahl / gültige Fälle (summiert sich auf mehr als 100 %).
 *  - Statable-Erweiterung `mitNull` („Fälle ohne Ankreuzung mitzählen“): gültig ist jeder Fall, der in mindestens einer Spalte eine Angabe hat
 *    (auch „nicht angekreuzt“); nur Fälle ohne jede Angabe fehlen. So ist die Basis die Zahl der Befragten, die die Frage beantwortet haben.
 *  - Kreuztabelle mit einer Gruppenspalte: Spalten-Prozente je Gruppe, bezogen auf die gültigen Fälle der Gruppe. Fälle ohne Gruppenangabe werden ausgelassen.
 * Kein Chi-Quadrat-Test: Die Ankreuzungen derselben Person sind nicht unabhängig, der gewöhnliche Test passt nicht (Agresti & Liu 1999; Bilder & Loughin 2004).
 * ⚠ Die Auswahl dieser Rechnung und der Verzicht auf den Test sind von der Statistik-Fachperson abzunehmen.
 */
import { istFehlend, fehlendSchluessel, type Fehlmenge } from './fehlend';
import type { Spalte } from './verzeichnis';
import { einmal } from './einmal';

export type Zelle = string | number | null | undefined;

/** Ein Set, wie es im Projekt gespeichert wird. `spalten` sind Spaltennamen der Daten; `zaehlwert` der Wert für „angekreuzt“. */
export interface MehrfachSet { name: string; label: string; spalten: string[]; zaehlwert: number | string }

/** Namen von Sets beginnen im Blatt mit „$“ (wie in SPSS), damit sie nicht mit Spalten verwechselt werden. */
export const SET_VORSATZ = '$';
export const istSetName = (n: string) => n.startsWith(SET_VORSATZ);
export const setId = (set: Pick<MehrfachSet, 'name'>) => SET_VORSATZ + set.name;

/** Gültiger Name eines Sets: Buchstabe am Anfang, dann Buchstaben, Ziffern, Unterstrich; nicht schon vergeben (Sets und Spalten). */
export function setNameFehler(name: string, sets: MehrfachSet[], spalten: Pick<Spalte, 'name'>[], eigener?: string): '' | 'form' | 'vergeben' {
  if (!/^[A-Za-zÄÖÜäöü][A-Za-z0-9ÄÖÜäöüß_]*$/.test(name)) return 'form';
  const gleich = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();
  if (sets.some(x => gleich(x.name, name) && x.name !== eigener) || spalten.some(x => gleich(x.name, name))) return 'vergeben';
  return '';
}

/** Das Set als Spalte, damit Blatt, Titel und Sätze es wie jede andere Spalte benennen können. */
export function setAlsSpalte(set: MehrfachSet): Spalte {
  return { name: setId(set), bezeichnung: set.label || set.name, art: 'zahl', niveau: 'nominal', format: 'MR', fehlend: [], fehlendText: '', werteLabels: {} };
}

/** Sets, deren Spalten es in den Daten (noch) alle gibt. Die anderen bleiben gespeichert, werden aber nicht angeboten. */
export const brauchbareSets = (sets: MehrfachSet[], spalten: Pick<Spalte, 'name'>[]) => sets.filter(x => x.spalten.length >= 2 && x.spalten.every(n => spalten.some(sp => sp.name === n)));

/* ------------------------------------------------------------ Rechnung */

export interface MehrfachOption { spalte: string; name: string; anzahl: number; proAntworten: number; proFaelle: number }
export interface MehrfachStufe { name: string; faelle: number; anzahl: number[]; proFaelle: number[] }
export interface Mehrfach {
  art: 'mehrfach';
  /** Name des Sets mit „$“ und Beschriftung */
  set: string; label: string;
  /** Der Wert, der „angekreuzt“ bedeutet, als Text */
  zaehlText: string;
  optionen: MehrfachOption[];
  /** Alle Ankreuzungen (Summe der Optionen, nur gültige Fälle) */
  antworten: number;
  /** Gültige Fälle (Basis für „Prozent der Fälle“) */
  faelle: number;
  /** Zeilen der Daten und davon nicht gültig */
  zeilen: number; fehlend: number;
  /** Fälle mit Angaben, aber ohne Ankreuzung */
  ohneAnkreuzung: number;
  /** Zeilen mit mindestens einer Angabe (auch „nicht angekreuzt“), und davon die ohne jede Ankreuzung - unabhängig von `mitNull`. Fehlt in älteren gespeicherten Blättern. */
  mitAngabe?: number; nichtAngekreuzt?: number;
  mitNull: boolean;
  /** Mit Gruppenspalte: Spalten-Prozente je Gruppe */
  gruppe?: { spalte: string; name: string; stufen: MehrfachStufe[]; ausgelassen: number };
  /** Anzeige im Diagramm: nach Häufigkeit sortiert (Standard) oder in der Reihenfolge der Spalten */
  sortiert: boolean;
}

export interface MehrfachEingabe {
  set: MehrfachSet;
  /** Name und Beschriftung je Option (in der Reihenfolge von set.spalten) */
  optionsNamen: string[];
  /** Je Zeile die Werte der Set-Spalten (Reihenfolge wie set.spalten) */
  zeilen: Zelle[][];
  /** Werte, die in der jeweiligen Spalte als „keine Angabe“ gelten */
  fehlend: Fehlmenge[];
  mitNull: boolean;
  gruppe?: { spalte: string; name: string; werte: Zelle[]; fehlend: Fehlmenge; stufenName: (w: string | number) => string };
}

const fehlt = (z: Zelle, fe: Fehlmenge) => z === null || z === undefined || z === '' || (typeof z === 'number' && (Number.isNaN(z) || fe.includes(z)));
const gleichWert = (z: Zelle, w: number | string) => z !== null && z !== undefined && (typeof z === 'number' && typeof w === 'number' ? z === w : String(z).trim() === String(w).trim());

/** Haupt-Rechnung: Häufigkeiten, Prozente und (mit Gruppenspalte) die Kreuztabelle. */
export function mehrfachRechnen(e: MehrfachEingabe): Mehrfach {
  const k = e.set.spalten.length;
  const zaehlt = (z: Zelle[]) => z.map((w, j) => !fehlt(w, e.fehlend[j] ?? []) && gleichWert(w, e.set.zaehlwert));
  const hatAngabe = (z: Zelle[]) => z.some((w, j) => !fehlt(w, e.fehlend[j] ?? []));
  const gueltig = e.zeilen.map(z => (e.mitNull ? hatAngabe(z) : zaehlt(z).some(Boolean)));
  const anzahl = Array<number>(k).fill(0);
  let faelle = 0, ohneAnkreuzung = 0, mitAngabe = 0, nichtAngekreuzt = 0;
  e.zeilen.forEach((z, i) => {
    if (hatAngabe(z)) { mitAngabe++; if (!zaehlt(z).some(Boolean)) nichtAngekreuzt++; }
    if (!gueltig[i]) return;
    faelle++;
    const c = zaehlt(z);
    if (!c.some(Boolean)) ohneAnkreuzung++;
    c.forEach((b, j) => { if (b) anzahl[j]!++; });
  });
  const antworten = anzahl.reduce((a, b) => a + b, 0);
  const optionen: MehrfachOption[] = e.set.spalten.map((spalte, j) => ({
    spalte, name: e.optionsNamen[j] ?? spalte, anzahl: anzahl[j]!, proAntworten: antworten ? anzahl[j]! / antworten : 0, proFaelle: faelle ? anzahl[j]! / faelle : 0
  }));
  const aus: Mehrfach = {
    art: 'mehrfach', set: setId(e.set), label: e.set.label || e.set.name, zaehlText: String(e.set.zaehlwert), optionen, antworten, faelle,
    zeilen: e.zeilen.length, fehlend: e.zeilen.length - faelle, ohneAnkreuzung, mitAngabe, nichtAngekreuzt, mitNull: e.mitNull, sortiert: true
  };
  if (e.gruppe) {
    const g = e.gruppe;
    const stufenWerte = [...new Set(e.zeilen.flatMap((_, i) => (fehlt(g.werte[i], g.fehlend) ? [] : [g.werte[i] as string | number])))]
      .sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de')));
    let ausgelassen = 0;
    const stufen: MehrfachStufe[] = stufenWerte.map(w => {
      const zl = e.zeilen.filter((_, i) => gueltig[i] && !fehlt(g.werte[i], g.fehlend) && g.werte[i] === w);
      const a = Array<number>(k).fill(0);
      for (const z of zl) zaehlt(z).forEach((b, j) => { if (b) a[j]!++; });
      return { name: g.stufenName(w), faelle: zl.length, anzahl: a, proFaelle: a.map(x => (zl.length ? x / zl.length : 0)) };
    });
    e.zeilen.forEach((_, i) => { if (gueltig[i] && fehlt(g.werte[i], g.fehlend)) ausgelassen++; });
    aus.gruppe = { spalte: g.spalte, name: g.name, stufen, ausgelassen };
  }
  return aus;
}

/** Die Optionen in der Reihenfolge der Anzeige: nach Häufigkeit (bei Gleichstand wie in den Daten) oder wie in den Daten. */
export const optionenGeordnet = (m: Mehrfach) => (m.sortiert ? [...m.optionen].sort((a, b) => b.anzahl - a.anzahl) : m.optionen);

/* ------------------------------------------------------------ Vorschlag */

/** Welcher Wert „angekreuzt“ bedeutet: bei 0/1 die 1; sonst der Wert, dessen Beschriftung nach „ja / genannt / angekreuzt“ klingt; sonst der kleinere. Leere Menge: 1. */
export function zaehlwertVorschlag(werte: number[], label: (w: number) => string = () => ''): number {
  const v = [...new Set(werte)].sort((a, b) => a - b);
  if (!v.length || v.includes(1) && v.every(x => x === 0 || x === 1)) return 1;
  const ja = v.find(w => /^(ja|yes|genannt|angekreuzt|gewählt|ausgewählt|checked|selected|trifft zu)\b/i.test(label(w).trim()));
  return ja ?? v[0]!;
}

export interface SetVorschlag { name: string; label: string; spalten: string[]; zaehlwert: number }
const ANGEKREUZT = (v: Set<number>) => v.size >= 1 && v.size <= 2;
/**
 * Findet Spalten nebeneinander, die einen gemeinsamen Namensanfang mit Nummer haben (medien_1 … medien_6) und je nur zwei Werte (0/1, 1/2 …) tragen.
 * Mindestens 2 Spalten; Spalten, die schon in einem Set stehen, zählen nicht. ⚠ Die Schwellen sind Faustregeln.
 */
export function schlageSetsVor(spalten: Spalte[], zeilen: Zelle[][], vorhanden: MehrfachSet[]): SetVorschlag[] {
  const belegt = new Set(vorhanden.flatMap(x => x.spalten));
  const werte = (j: number) => { const sp = spalten[j]!; return einmal(zeilen, `werte|${j}|${fehlendSchluessel(sp)}`, () => new Set(zeilen.flatMap(z => { const w = z[j]; return typeof w === 'number' && !istFehlend(sp, w) && Number.isFinite(w) ? [w] : []; }))); };
  const stamm = (n: string) => /^(.*?)[_.\-]?(\d+)$/.exec(n);
  const aus: SetVorschlag[] = [];
  let lauf: number[] = [], vor = '';
  const schliesse = () => {
    if (lauf.length >= 2) {
      const alle = lauf.flatMap(j => [...werte(j)]);
      const zw = zaehlwertVorschlag(alle, w => spalten[lauf[0]!]!.werteLabels[String(w)] ?? '');
      const label = spalten[lauf[0]!]!.bezeichnung.includes(':') ? spalten[lauf[0]!]!.bezeichnung.split(':')[0]!.trim() : vor;
      aus.push({ name: vor.replace(/[^A-Za-z0-9_ÄÖÜäöüß]/g, '') || 'Set', label, spalten: lauf.map(j => spalten[j]!.name), zaehlwert: zw });
    }
    lauf = []; vor = '';
  };
  spalten.forEach((sp, j) => {
    const m = stamm(sp.name);
    const zweiwertig = sp.art === 'zahl' && !belegt.has(sp.name) && ANGEKREUZT(werte(j));
    if (m && zweiwertig && (lauf.length === 0 || m[1] === vor)) { vor = m[1]!; lauf.push(j); }
    else { schliesse(); if (m && zweiwertig) { vor = m[1]!; lauf = [j]; } }
  });
  schliesse();
  return aus;
}

/* ------------------------------------------------------------ Namen der Optionen */

/**
 * Namen der Optionen: In Fragebögen heißen die Spalten oft „Welche Medien nutzen Sie? [Fernsehen]“ oder „Medien: Fernsehen“.
 * Haben alle Bezeichnungen denselben Anfang bis zu einem Trenner (? : ] ) -), steht in der Tabelle nur der Rest. Sonst die Bezeichnung, sonst der Spaltenname.
 */
export function optionsNamenAus(bezeichnungen: string[], namen: string[]): string[] {
  const roh = bezeichnungen.map((b, j) => b.trim() || namen[j]!);
  if (roh.length >= 2 && bezeichnungen.every(b => b.trim())) {
    let p = roh[0]!;
    for (const r of roh) { let i = 0; while (i < p.length && i < r.length && p[i] === r[i]) i++; p = p.slice(0, i); }
    const m = /^(.*[?:\])\-–])\s*/.exec(p) ?? /^(.*\S)\s+$/.exec(p);
    if (m && m[1]!.length >= 3) {
      const rest = roh.map(r => r.slice(m[0]!.length).replace(/^[\[(\s]+|[\])\s]+$/g, '').trim());
      if (rest.every(Boolean)) return rest;
    }
  }
  return roh.map(r => (r.length > 48 ? r.slice(0, 46).trimEnd() + ' …' : r));
}
