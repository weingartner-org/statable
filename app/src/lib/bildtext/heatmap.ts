/** Heatmap und Matrix: die Tabelle der Werte ist die Alternative. */
import { L } from '../sitzung.svelte';
import { z, sauber } from './zahlen';
import { titelOder, keineDaten, nZeilen, nSpalten } from './hilfen';
import type { BildText, HeatmapDaten } from './typen';

export function heatmap(d: HeatmapDaten): BildText {
  const wert = sauber(d.wertName), zn = sauber(d.zeilenName ?? ''), sn = sauber(d.spaltenName ?? '');
  const titel = titelOder(d.titel, wert);
  const zl = d.zeilen.map(sauber), sp = d.spalten.map(sauber);
  if (zl.length === 0 || sp.length === 0) return keineDaten(titel, L(`Heatmap: ${wert}, keine Daten.`, `Heat map: ${wert}, no data.`));
  let hi: [number, number] | null = null, lo: [number, number] | null = null;
  zl.forEach((_, i) => sp.forEach((__, j) => { const v = d.werte[i]?.[j]; if (v === null || v === undefined || !Number.isFinite(v)) return; if (!hi || v > d.werte[hi[0]]![hi[1]]!) hi = [i, j]; if (!lo || v < d.werte[lo[0]]![lo[1]]!) lo = [i, j]; }));
  const H = hi as [number, number] | null, T = lo as [number, number] | null;
  const kurz = H && T
    ? L(`Heatmap: ${wert} für ${nZeilen(zl.length)} und ${nSpalten(sp.length)}; höchster Wert ${z(d.werte[H[0]]![H[1]])} (${zl[H[0]]}, ${sp[H[1]]}), niedrigster ${z(d.werte[T[0]]![T[1]])} (${zl[T[0]]}, ${sp[T[1]]}).`, `Heat map: ${wert} for ${nZeilen(zl.length)} and ${nSpalten(sp.length)}; highest value ${z(d.werte[H[0]]![H[1]])} (${zl[H[0]]}, ${sp[H[1]]}), lowest ${z(d.werte[T[0]]![T[1]])} (${zl[T[0]]}, ${sp[T[1]]}).`)
    : L(`Heatmap: ${wert} für ${nZeilen(zl.length)} und ${nSpalten(sp.length)}, ohne Werte.`, `Heat map: ${wert} for ${nZeilen(zl.length)} and ${nSpalten(sp.length)}, without values.`);
  const beschreibung = [
    L(`Heatmap (Farbfelder-Matrix): ${wert}; je Feld ein Wert, dargestellt als Farbe.`, `Heat map (matrix of colored cells): ${wert}; one value per cell, shown as color.`),
    L(`Zeilen${zn ? ` (${zn})` : ''}: ${zl.length}, Spalten${sn ? ` (${sn})` : ''}: ${sp.length}.`, `Rows${zn ? ` (${zn})` : ''}: ${zl.length}, columns${sn ? ` (${sn})` : ''}: ${sp.length}.`),
    L('Alle Werte stehen in der Tabelle.', 'All values are in the table.')
  ];
  const zeilen = zl.map((n, i) => [n, ...sp.map((_, j) => z(d.werte[i]?.[j]))]);
  return { kurz, beschreibung, liste: [], tabelle: { titel, kopf: [zn || '', ...sp], zeilen, zeilenKopf: true } };
}
