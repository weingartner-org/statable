/**
 * Datensätze vergleichen (S-F2 D6; Doppeleingabe von Fragebögen): zwei Dateien Zelle für Zelle über eine Schlüsselspalte.
 * Regeln: beide fehlend (leer) = gleich; Zahlen gleich, wenn der gelesene Wert gleich ist; Text genau gleich - mit der Option `locker` ohne Beachtung von Leerzeichen am Rand und Groß/Klein.
 * Doppelte Schlüssel: kein Vergleich (`problem`). Ohne Schlüssel: nach Zeilennummer, nur bei gleicher Zeilenzahl (`nachZeile`).
 * Rechnet nur in JS; die Daten werden nie verändert.
 */
import type { Daten } from './umformen';
import type { Wert } from './eingabe';
import { csvNeutral } from './export';

export interface VergleichOpt { schluessel: string | null; locker: boolean }
export interface Abweichung { schluessel: string; spalte: string; wert1: Wert; wert2: Wert }
export type VergleichProblem =
  | { art: 'doppelt'; datei: 1 | 2; schluessel: string[] }
  | { art: 'schluessel'; datei: 1 | 2 }
  | { art: 'zeilenzahl'; n1: number; n2: number }
  | { art: 'keineGemeinsamen' };
export interface Vergleich {
  problem: VergleichProblem | null;
  abweichungen: Abweichung[];
  /** Schlüssel (bzw. Zeilennummern) nur in Datei 1 / nur in Datei 2 */
  nurIn1: string[]; nurIn2: string[];
  spaltenNur1: string[]; spaltenNur2: string[];
  /** Spalten, die in beiden Dateien vorkommen, aber einmal Zahl und einmal Text sind */
  typUnterschied: string[];
  verglichenFaelle: number; verglichenSpalten: string[];
  jeSpalte: { spalte: string; anzahl: number }[];
  /** Fälle ohne Schlüsselwert (Datei 1, Datei 2): nicht verglichen */
  ohneSchluessel: [number, number];
  nachZeile: boolean;
}

const leer = (v: Wert | undefined) => v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v));
const norm = (t: string, locker: boolean) => (locker ? t.trim().normalize('NFC').toLowerCase() : t);
function gleich(a: Wert | undefined, b: Wert | undefined, locker: boolean): boolean {
  if (leer(a) || leer(b)) return leer(a) && leer(b);
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  return norm(String(a), locker) === norm(String(b), locker);
}
const idx = (d: Daten, name: string) => d.spalten.findIndex(s => s.name.toUpperCase() === name.toUpperCase());

export function vergleiche(d1: Daten, d2: Daten, o: VergleichOpt): Vergleich {
  const aus: Vergleich = { problem: null, abweichungen: [], nurIn1: [], nurIn2: [], spaltenNur1: [], spaltenNur2: [], typUnterschied: [], verglichenFaelle: 0, verglichenSpalten: [], jeSpalte: [], ohneSchluessel: [0, 0], nachZeile: o.schluessel === null };
  const k1 = o.schluessel === null ? -1 : idx(d1, o.schluessel), k2 = o.schluessel === null ? -1 : idx(d2, o.schluessel);
  if (o.schluessel !== null) { if (k1 < 0) { aus.problem = { art: 'schluessel', datei: 1 }; return aus; } if (k2 < 0) { aus.problem = { art: 'schluessel', datei: 2 }; return aus; } }
  // Spalten: in beiden (nach Name, Groß/klein egal), ohne den Schlüssel
  const paare: { name: string; i1: number; i2: number }[] = [];
  d1.spalten.forEach((s, i1) => { if (i1 === k1) return; const i2 = idx(d2, s.name); if (i2 >= 0) { if (i2 !== k2) paare.push({ name: s.name, i1, i2 }); } else aus.spaltenNur1.push(s.name); });
  d2.spalten.forEach((s, i2) => { if (i2 !== k2 && idx(d1, s.name) < 0) aus.spaltenNur2.push(s.name); });
  aus.verglichenSpalten = paare.map(p => p.name);
  aus.typUnterschied = paare.filter(p => (d1.spalten[p.i1]!.art === 'text') !== (d2.spalten[p.i2]!.art === 'text')).map(p => p.name);
  // Schlüssel je Datei
  const schluessel = (d: Daten, k: number): (string | null)[] =>
    d.zeilen.map((z, r) => (k < 0 ? String(r + 1) : leer(z[k]) ? null : norm(String(z[k]), o.locker)));
  if (k1 < 0 && d1.zeilen.length !== d2.zeilen.length) { aus.problem = { art: 'zeilenzahl', n1: d1.zeilen.length, n2: d2.zeilen.length }; return aus; }
  const s1 = schluessel(d1, k1), s2 = schluessel(d2, k2);
  const zeigeSchluessel = (d: Daten, k: number, r: number) => (k < 0 ? String(r + 1) : String(d.zeilen[r]![k]));
  const doppelt = (s: (string | null)[], d: Daten, k: number) => {
    const gesehen = new Map<string, number>(), dopp: string[] = [];
    s.forEach((x, r) => { if (x === null) return; const n = (gesehen.get(x) ?? 0) + 1; gesehen.set(x, n); if (n === 2) dopp.push(zeigeSchluessel(d, k, r)); });
    return dopp;
  };
  const dd1 = doppelt(s1, d1, k1); if (dd1.length) { aus.problem = { art: 'doppelt', datei: 1, schluessel: dd1 }; return aus; }
  const dd2 = doppelt(s2, d2, k2); if (dd2.length) { aus.problem = { art: 'doppelt', datei: 2, schluessel: dd2 }; return aus; }
  if (!paare.length) { aus.problem = { art: 'keineGemeinsamen' }; return aus; }
  aus.ohneSchluessel = [s1.filter(x => x === null).length, s2.filter(x => x === null).length];
  const zeile2 = new Map<string, number>();
  s2.forEach((x, r) => { if (x !== null) zeile2.set(x, r); });
  const gefunden = new Set<string>();
  const zaehl = new Map<string, number>();
  s1.forEach((x, r1) => {
    if (x === null) return;
    const r2 = zeile2.get(x);
    if (r2 === undefined) { aus.nurIn1.push(zeigeSchluessel(d1, k1, r1)); return; }
    gefunden.add(x); aus.verglichenFaelle++;
    for (const p of paare) {
      const a = d1.zeilen[r1]![p.i1] ?? null, b = d2.zeilen[r2]![p.i2] ?? null;
      if (gleich(a, b, o.locker)) continue;
      aus.abweichungen.push({ schluessel: zeigeSchluessel(d1, k1, r1), spalte: p.name, wert1: a, wert2: b });
      zaehl.set(p.name, (zaehl.get(p.name) ?? 0) + 1);
    }
  });
  s2.forEach((x, r2) => { if (x !== null && !gefunden.has(x)) aus.nurIn2.push(zeigeSchluessel(d2, k2, r2)); });
  aus.jeSpalte = paare.filter(p => zaehl.has(p.name)).map(p => ({ spalte: p.name, anzahl: zaehl.get(p.name)! }));
  return aus;
}

/** Die Abweichungsliste als Tabelle für den CSV-Export (Texte aus Dateien gegen Formeln neutral, wie im übrigen Export). */
export function abweichungenAlsTabelle(v: Vergleich, kSchluessel: string, kSpalte: string, k1: string, k2: string): { kopf: string[]; zeilen: string[][] } {
  const t = (x: Wert) => (x === null || x === undefined ? '' : typeof x === 'number' ? String(x) : csvNeutral(x));
  return { kopf: [kSchluessel, kSpalte, k1, k2], zeilen: v.abweichungen.map(a => [csvNeutral(a.schluessel), csvNeutral(a.spalte), t(a.wert1), t(a.wert2)]) };
}
