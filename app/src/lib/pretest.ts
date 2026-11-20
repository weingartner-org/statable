/**
 * Pretest-Kommentare lesen (Paket 2G): reine Funktionen, kein Svelte. Festlegungen: Kopf von pretest-2g.test.ts.
 * Ein Antwortsatz ist ein Bogen/Befragter. Gelesen wird je Satz und Frage zuerst `<id>:kommentar` (Bibliothek: Vorschau und Eingabemaske),
 * sonst die Variable `<name>_kommentar` (Datensatz; bei Blöcken `<blockname>_kommentar`). Der Text bleibt roh (nie als HTML oder Befehl ausgewertet).
 */
import type { FragebogenPlan } from './fragebogenplan';

const eigen = (o: Record<string, unknown>, k: string): unknown => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
const kommentarText = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Kommentare je Frage und Block (Schlüssel = Element-id, auch ohne Kommentare mit leerer Liste), in der Reihenfolge der Antwortsätze. */
export function kommentareJeFrage(plan: FragebogenPlan, antwortsaetze: Record<string, unknown>[]): Record<string, string[]> {
  const aus: Record<string, string[]> = {};
  for (const s of plan.elemente) for (const e of s.elemente) {
    if (e.art === 'hinweis') continue;
    const liste: string[] = [];
    for (const satz of antwortsaetze) {
      const t = kommentarText(eigen(satz, `${e.id}:kommentar`)) || kommentarText(eigen(satz, `${e.name}_kommentar`));
      if (t) liste.push(t);
    }
    aus[e.id] = liste;
  }
  return aus;
}

/** Summe aller Kommentare (für die Zahl in der Gliederung und die Gesamtanzeige). */
export const anzahlKommentare = (e: Record<string, string[]>): number => Object.values(e).reduce((n, l) => n + l.length, 0);

/**
 * Antwortsätze aus der Tabelle des Projekts: nur die Spalten, die auf `_kommentar` enden (Kommentare einlesen). Jede Zeile ist ein Satz;
 * Zeilen ohne Text in diesen Spalten werden weggelassen.
 */
export function kommentarSaetzeAusTabelle(spalten: { name: string }[], zeilen: (string | number | null | undefined)[][]): Record<string, unknown>[] {
  const idx = spalten.map((s, i) => [s.name, i] as const).filter(([n]) => /_kommentar$/.test(n));
  const saetze: Record<string, unknown>[] = [];
  for (const z of zeilen) {
    const satz: Record<string, unknown> = {};
    for (const [n, i] of idx) { const v = z[i]; if (typeof v === 'string' && v.trim()) satz[n] = v; }
    if (Object.keys(satz).length) saetze.push(satz);
  }
  return saetze;
}

/** Die gesammelten Antwortsätze eines Plans: `vorschau` = gemerkte Durchgänge der Vorschau, `daten` = aus den Daten des Projekts eingelesen (Projektdatei: `fragebogen/<plan-id>/pretest.json`). */
export type PretestPlan = { vorschau: Record<string, unknown>[]; daten: Record<string, unknown>[] };

/** Ein Antwortsatz aus einer Datei: nur Zahlen, Zahlenlisten und Text (höchstens 10.000 Zeichen); alles andere fällt weg. */
function leseSatz(a: unknown): Record<string, unknown> | null {
  if (!a || typeof a !== 'object' || Array.isArray(a)) return null;
  const aus: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(a as Record<string, unknown>)) {
    if (k === '__proto__') continue;
    let w: unknown;
    if (typeof v === 'number' && Number.isFinite(v)) w = v;
    else if (typeof v === 'string') w = v.slice(0, 10000);
    else if (Array.isArray(v) && v.every(x => typeof x === 'number' && Number.isFinite(x))) w = v;
    else continue;
    Object.defineProperty(aus, k, { value: w, enumerable: true, writable: true, configurable: true });
  }
  return Object.keys(aus).length ? aus : null;
}
const leseListe = (l: unknown): Record<string, unknown>[] => (Array.isArray(l) ? l.flatMap(x => { const s = leseSatz(x); return s ? [s] : []; }) : []);

/** Prüft gelesene Pretest-Daten (aus der Projektdatei): nur ein Objekt mit `vorschau` und `daten` als Listen von Antwortsätzen; sonst `null`. */
export function lesePretest(o: unknown): PretestPlan | null {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const r = o as Record<string, unknown>;
  const aus = { vorschau: leseListe(r.vorschau), daten: leseListe(r.daten) };
  return aus.vorschau.length || aus.daten.length ? aus : null;
}
