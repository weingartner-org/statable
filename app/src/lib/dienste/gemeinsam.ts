/**
 * Gemeinsames der Dienst-Erkenner (Paket 1B): doppelte Antworten und Raster als Itemblock. Reine Funktionen; die Eingabe wird nie verändert, nichts wird gelöscht.
 */
import type { Zelle } from '../einlesen';

const leerZelle = (v: Zelle | undefined) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
const schluessel = (v: Zelle | undefined) => (leerZelle(v) ? '' : v instanceof Date ? `d${v.getTime()}` : typeof v === 'number' ? `n${v}` : `s${String(v).trim()}`);

/**
 * Doppelte Antworten: mit Kennung-Spalte (`kennung` = Spaltenindex) gleiche Kennung, sonst Zeilen, die in ALLEN Spalten gleich sind.
 * Gruppen mit mindestens zwei Zeilen, je Gruppe aufsteigend, die Gruppen nach ihrer ersten Zeile. Ganz leere Zeilen zählen nicht.
 */
export function doppelteZeilen(zeilen: Zelle[][], kennung?: number): { gruppen: number[][]; grund: 'kennung' | 'gleich' } {
  const je = new Map<string, number[]>();
  zeilen.forEach((z, i) => {
    const k = kennung !== undefined ? (leerZelle(z[kennung]) ? null : schluessel(z[kennung])) : z.every(leerZelle) ? null : JSON.stringify(z.map(schluessel));
    if (k === null) return;
    (je.get(k) ?? je.set(k, []).get(k)!).push(i);
  });
  return { gruppen: [...je.values()].filter(g => g.length >= 2).sort((a, b) => a[0]! - b[0]!), grund: kennung !== undefined ? 'kennung' : 'gleich' };
}

/** Muster für Raster-Köpfe: Google `Frage [Zeile]`, Nextcloud `Frage (Zeile)`, CryptPad `Frage | Zeile`. */
export const RASTER: Record<'googleforms' | 'nextcloud' | 'cryptpad', RegExp> = {
  googleforms: /^(.+) \[(.+)\]$/s,
  nextcloud: /^(.+) \((.+)\)$/s,
  cryptpad: /^(.+) \| (.+)$/s
};

/** Raster: mindestens zwei Spalten mit demselben Fragetext vor dem Zeilentext. `spalten`: nur die Fragespalten (Name und Kopf), in Tabellenreihenfolge. */
export function rasterBloecke(spalten: { name: string; kopf: string }[], muster: RegExp): { frage: string; spalten: string[]; items: string[] }[] {
  const je = new Map<string, { spalten: string[]; items: string[] }>();
  for (const sp of spalten) {
    const m = muster.exec(sp.kopf.trim());
    if (!m) continue;
    const frage = m[1]!.trim(), item = m[2]!.trim();
    if (!frage || !item) continue;
    const g = je.get(frage) ?? je.set(frage, { spalten: [], items: [] }).get(frage)!;
    g.spalten.push(sp.name); g.items.push(item);
  }
  return [...je].filter(([, g]) => g.spalten.length >= 2).map(([frage, g]) => ({ frage, ...g }));
}
