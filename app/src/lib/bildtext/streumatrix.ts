/** Streumatrix: Streudiagramme aller Paare. Die Korrelationsmatrix ist die Alternative (Tabelle); die Paare stehen als Liste, solange es nicht mehr als 20 sind. */
import { L, Lp } from '../sitzung.svelte';
import { z, sauber } from './zahlen';
import { titelOder, keineDaten } from './hilfen';
import type { BildText, StreumatrixDaten } from './typen';

export function streumatrix(d: StreumatrixDaten): BildText {
  const v = d.variablen.map(sauber), k = v.length;
  const titel = titelOder(d.titel, L('Korrelationen aller Paare', 'Correlations of all pairs'));
  if (k < 2) return keineDaten(titel, L('Streumatrix: weniger als zwei Variablen.', 'Scatter plot matrix: fewer than two variables.'));
  const paare = (k * (k - 1)) / 2;
  const kurz = d.n !== undefined
    ? L(`Streumatrix (Streudiagramme aller Paare) von ${k} Variablen: ${v.join(', ')}; n = ${d.n}.`, `Scatter plot matrix (scatter plots of all pairs) of ${k} variables: ${v.join(', ')}; n = ${d.n}.`)
    : L(`Streumatrix (Streudiagramme aller Paare) von ${k} Variablen: ${v.join(', ')}.`, `Scatter plot matrix (scatter plots of all pairs) of ${k} variables: ${v.join(', ')}.`);
  const beschreibung = [
    L('Streumatrix: ein Feld je Variablenpaar.', 'Scatter plot matrix: one panel per pair of variables.'),
    L(`Das Raster hat ${k} mal ${k} Felder; in der Diagonale stehen die Namen der Variablen, in den übrigen Feldern je ein Streudiagramm für ein Paar: ${v.join(', ')}.`, `The grid has ${k} by ${k} panels; the diagonal shows the variable names, every other panel shows a scatter plot for one pair: ${v.join(', ')}.`),
    Lp(paare, `Es gibt ${paare} Paar.`, `Es gibt ${paare} verschiedene Paare.`, `There is ${paare} pair.`, `There are ${paare} different pairs.`)
  ];
  const liste: string[] = [];
  if (d.r) for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) { const r = d.r[i]?.[j]; liste.push(L(`${v[i]} und ${v[j]}: Korrelation ${z(r, 2)}.`, `${v[i]} and ${v[j]}: correlation ${z(r, 2)}.`)); }
  const zeilen = v.map((n, i) => [n, ...v.map((_, j) => (i === j ? z(1, 2) : z(d.r?.[i]?.[j] ?? d.r?.[j]?.[i], 2)))]);
  return { kurz, beschreibung, liste, tabelle: { titel: L('Korrelationsmatrix', 'Correlation matrix'), kopf: ['', ...v], zeilen: d.r ? zeilen : v.map(n => [n]), zeilenKopf: true } };
}
