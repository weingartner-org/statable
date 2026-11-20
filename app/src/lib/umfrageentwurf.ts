/**
 * Abschnitt 6, Teil A (Fachblatt Umfrage-Entwurf): der Stichprobenplan der Person - Schichten, Klumpen, Grundgesamtheit, Schicht mit einem Klumpen - als Spalten und Aufruf-Teil für R.
 * EINE Stelle baut das Design: `um_design` in engine/statable-umfrage.R. Hier entsteht nur, was R dafür braucht: Zahlen-Spalten mit festen Namen und der Aufruf-Teil `entwurf = list(...)`.
 * Alle Karten mit Umfragegewicht (Verteilung, Kreuztabelle, Gruppenvergleich, Regression, Veröffentlichungstabellen, Hochrechnung) holen ihn von hier.
 * SICHERHEIT: Namen und Werte aus der Datei kommen nie in den Code. Klumpen und Schicht gehen als Codes (1, 2, ...) in Spalten mit festen Namen, die Grundgesamtheit als Zahlen;
 * im Aufruf stehen nur rBool und rWahl. Alle Prüfungen (Lücken, zu wenige Klumpen, Grundgesamtheit kleiner als die Stichprobe, Schicht mit einem Klumpen) macht R in einer Stelle und gibt Codes zurück.
 */
import type { RSpalte } from '../engine/webr';
import { rBool, rWahl } from '../engine/rsicher';
import { werteVon, type Quelle } from './gewichtbeschreibend';
import { EINSAME_REGELN, entwurfWirksam, type Entwurf, type Gewicht } from './gewichte';

export { entwurfWirksam };
import type { Spalte } from './verzeichnis';

/** Feste Namen der Spalten in R (siehe `um_entwurf_design`). */
export const ENTWURF_SPALTEN = { klumpen: 'dz_k1', klumpen2: 'dz_k2', schicht: 'dz_s', fpc: 'dz_f1', fpc2: 'dz_f2' } as const;

/** Was R vom Plan bekommt. `rTeil` ist `entwurf = list(...)` (benanntes Argument, steht nach den übrigen Argumenten). */
export interface EntwurfPlan { spalten: RSpalte[]; rTeil: string; entwurf: Entwurf }

const sortWert = (a: string | number, b: string | number) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de'));
/** Die Werte einer Spalte in der Reihenfolge der Codes 1, 2, ... (über ALLE Zeilen der Quelle, damit die Codes in Sätzen wieder zu Namen werden). */
export function entwurfWerte(q: Pick<Quelle, 'spalten' | 'zeilen'>, spalte: string): (string | number)[] {
  const v = werteVon(q as Quelle, spalte);
  return [...new Set(v.filter((x): x is string | number => x !== null && x !== undefined))].sort(sortWert);
}

const zahlOderNull = (v: string | number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
/** Spalten und Aufruf-Teil für die Zeilen `idx` der Quelle (dieselben Zeilen wie die übrigen Spalten des Aufrufs). `null`, wenn kein Plan gilt (dann bleibt es bei `ids = ~1`, alle alten Zahlen). */
export function entwurfPlan(q: Quelle, e: Entwurf | undefined | null, idx: number[]): EntwurfPlan | null {
  const w = entwurfWirksam(e);
  if (!w) return null;
  const spalten: RSpalte[] = [];
  const kode = (name: string, rname: string) => {
    const v = werteVon(q, name), code = new Map(entwurfWerte(q, name).map((x, i) => [x, i + 1] as const));
    spalten.push({ name: rname, art: 'zahl', werte: idx.map(i => { const x = v[i]; return x === null || x === undefined ? null : code.get(x) ?? null; }) });
  };
  const zahl = (name: string, rname: string) => { const v = werteVon(q, name); spalten.push({ name: rname, art: 'zahl', werte: idx.map(i => zahlOderNull(v[i])) }); };
  if (w.klumpen) kode(w.klumpen, ENTWURF_SPALTEN.klumpen);
  if (w.klumpen2) kode(w.klumpen2, ENTWURF_SPALTEN.klumpen2);
  if (w.schicht) kode(w.schicht, ENTWURF_SPALTEN.schicht);
  if (w.fpc) zahl(w.fpc, ENTWURF_SPALTEN.fpc);
  if (w.fpc2) zahl(w.fpc2, ENTWURF_SPALTEN.fpc2);
  const einsam = w.einsam ? rWahl(w.einsam, EINSAME_REGELN) : 'NULL';
  const rTeil = `entwurf = list(k = ${rBool(!!w.klumpen)}, k2 = ${rBool(!!w.klumpen2)}, s = ${rBool(!!w.schicht)}, f = ${rBool(!!w.fpc)}, f2 = ${rBool(!!w.fpc2)}, einsam = ${einsam})`;
  return { spalten, rTeil, entwurf: w };
}
/** Der Plan als Zusatz hinter den übrigen Argumenten eines Aufrufs: `, entwurf = list(...)` oder nichts. */
export const entwurfRTeil = (p: EntwurfPlan | null | undefined): string => (p ? `, ${p.rTeil}` : '');

/** Der Plan als Quelle für Karten, die Zeilen und Spalten der Sitzung getrennt führen (Gruppenvergleich, Regression). Alle Zeilen gehen an R; Zeilen ohne Gewicht fallen dort vor dem Design weg. */
export function entwurfPlanAlle(e: Entwurf | undefined | null, spalten: Spalte[], zeilen: (string | number | null)[][], w: number[]): EntwurfPlan | null {
  if (!entwurfWirksam(e)) return null;
  const q = { spalten, zeilen, w } as unknown as Quelle;
  return entwurfPlan(q, e, zeilen.map((_, i) => i));
}

/** Prüfung der Angaben im Dialog, bevor der Plan gespeichert wird: Spalten vorhanden, jede Spalte nur einmal, nicht die Gewichtsspalte, Grundgesamtheit aus Zahlen. `null` = in Ordnung. */
export type EntwurfProblem = { code: 'spalte-fehlt' | 'doppelt' | 'ist-gewicht' | 'fpc-text'; spalte: string };
export function entwurfPruefen(e: Entwurf, gewichtSpalte: string, spalten: Pick<Spalte, 'name' | 'art'>[]): EntwurfProblem | null {
  const gesetzt = (['klumpen', 'klumpen2', 'schicht', 'fpc', 'fpc2'] as const).flatMap(k => (e[k] ? [[k, e[k]!] as const] : []));
  const gesehen = new Set<string>();
  for (const [k, name] of gesetzt) {
    const sp = spalten.find(x => x.name === name);
    if (!sp) return { code: 'spalte-fehlt', spalte: name };
    if (name === gewichtSpalte) return { code: 'ist-gewicht', spalte: name };
    if (gesehen.has(name)) return { code: 'doppelt', spalte: name };
    gesehen.add(name);
    if ((k === 'fpc' || k === 'fpc2') && sp.art !== 'zahl') return { code: 'fpc-text', spalte: name };
  }
  return null;
}
/** Gewicht mit Plan: hat das Gewicht einen wirksamen Plan? */
export const hatEntwurf = (g?: Pick<Gewicht, 'art' | 'entwurf'> | null): boolean => !!g && g.art === 'umfrage' && !!entwurfWirksam(g.entwurf);
