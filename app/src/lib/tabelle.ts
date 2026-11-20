import type { OutputItem, TableItem } from '../engine/types';

/** Eine PSPP-Tabelle als Raster: Text und (falls vorhanden) Zahl je Zelle; Spannen werden aufgefüllt. */
export interface Raster { t: string[][]; n: (number | undefined)[][]; tabelle: TableItem }

export function raster(it: TableItem): Raster {
  const t = Array.from({ length: it.rows }, () => Array<string>(it.cols).fill(''));
  const n = Array.from({ length: it.rows }, () => Array<number | undefined>(it.cols).fill(undefined));
  for (const c of it.cells) for (let r = c.r; r < c.r + c.rs; r++) for (let k = c.c; k < c.c + c.cs; k++) { t[r]![k] = c.t; n[r]![k] = c.n; }
  return { t, n, tabelle: it };
}

/** Erste Tabelle, deren Bezeichnung passt (englisch, wie PSPP sie liefert). */
export function finde(items: OutputItem[], bezeichnung: RegExp): Raster | null {
  const it = items.find((i): i is TableItem => i.type === 'table' && (bezeichnung.test(i.label) || bezeichnung.test(i.title?.t ?? '')));
  return it ? raster(it) : null;
}

/** Spalte, deren Kopf (irgendeine Kopfzeile) passt. */
export function spalte(r: Raster, kopf: RegExp, ab = 0): number {
  const kopfZeilen = Math.max(1, r.tabelle.headRows[0]);
  for (let k = ab; k < r.tabelle.cols; k++) for (let z = 0; z < kopfZeilen; z++) if (kopf.test(r.t[z]![k]!)) return k;
  return -1;
}
