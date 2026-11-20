/**
 * Testhalbierung (Split-Half) in Sätze und Tabellen fassen (Stufe 6.6). Die Zahlen kommen aus PSPP (`RELIABILITY /MODEL=SPLIT`, lib/ergebnis.ts `splitHalf`).
 * ⚠ Satzvorlagen und Einordnung von der Fachperson abzunehmen. Wörter für die Zuverlässigkeit wie bei Alpha (`alphaWort`).
 */
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { alphaWort, ohneNull, type Saetze, type SplitHalf } from './ergebnis';
import { tabelle, fd, fo } from './mwsaetze';

const T = L;
const ok = (v: number) => Number.isFinite(v);
const z = (v: number) => (ok(v) ? ohneNull(v) : '-');

/** Erste Hälfte = die ersten k1 Fragen in der gewählten Reihenfolge (wie SPSS), zweite = die übrigen. */
export const halbNamen = (sh: SplitHalf, fragen: string[], name: (n: string) => string = n => n) =>
  ({ t1: fragen.slice(0, sh.k1).map(name).join(', '), t2: fragen.slice(sh.k1, sh.k1 + sh.k2).map(name).join(', ') });

/** Ein Satz zur Deutung: die Zuverlässigkeit der ganzen Skala aus Spearman-Brown, mit Wort. */
export function splitHalfSatz(sh: SplitHalf): string {
  const sb = ok(sh.sbUngleich) ? sh.sbUngleich : sh.sbGleich;
  if (!ok(sh.r)) return T('Die Hälften lassen sich nicht vergleichen (eine Hälfte hat bei allen Personen denselben Wert).', 'The halves cannot be compared (one half has the same value for everyone).');
  if (!ok(sb)) return T(`Die beiden Hälften hängen mit r = ${z(sh.r)} zusammen; für die ganze Skala lässt sich keine Zuverlässigkeit hochrechnen.`, `The two halves are correlated at r = ${z(sh.r)}; no reliability can be projected for the whole scale.`);
  const gleich = sh.k1 === sh.k2;
  return T(`Die beiden Hälften der Skala hängen mit r = ${z(sh.r)} zusammen. Auf die volle Länge hochgerechnet (Spearman-Brown${gleich ? '' : ', ungleiche Länge'}) ist die Zuverlässigkeit der ganzen Skala ${alphaWort(sb)}: ${z(sb)}.`,
    `The two halves of the scale are correlated at r = ${z(sh.r)}. Projected to full length (Spearman-Brown${gleich ? '' : ', unequal length'}), the reliability of the whole scale is ${alphaWort(sb)}: ${z(sb)}.`);
}
/** Der Hinweis, den jede Ausgabe der Testhalbierung trägt: die Teilung hängt von der Reihenfolge der Fragen ab. */
export const splitHalfHinweis = (sh: SplitHalf) => T(
  `Die Teilung hängt von der Reihenfolge der Fragen ab: Die erste Hälfte sind die ersten ${sh.k1} Fragen, die zweite die übrigen ${sh.k2} (wie in SPSS). Eine andere Reihenfolge oder eine Teilung in gerade und ungerade Fragen kann einen anderen Wert geben. Alpha nutzt alle möglichen Teilungen und ist deshalb meist das bessere Maß.`,
  `The split depends on the order of the questions: the first half is the first ${sh.k1} questions, the second half the remaining ${sh.k2} (as in SPSS). A different order, or a split into odd and even questions, can give a different value. Alpha uses all possible splits and is therefore usually the better measure.`);

export const splitHalfApa = (sh: SplitHalf) => T(
  `Testhalbierung: r = ${z(sh.r)}, Spearman-Brown = ${z(ok(sh.sbUngleich) ? sh.sbUngleich : sh.sbGleich)}, Guttman Split-Half = ${z(sh.guttman)} (${sh.k1} + ${sh.k2} Items, n = ${sh.n})`,
  `Split-half: r = ${z(sh.r)}, Spearman-Brown = ${z(ok(sh.sbUngleich) ? sh.sbUngleich : sh.sbGleich)}, Guttman split-half = ${z(sh.guttman)} (${sh.k1} + ${sh.k2} items, n = ${sh.n})`);

/** Bericht: Sätze der Skala plus Testhalbierung, wenn gerechnet. */
export function mitSplitHalf(st: Saetze, sh: SplitHalf | undefined): Saetze {
  if (!sh) return st;
  return { ...st, zusatz: `${st.zusatz} ${splitHalfSatz(sh)}`.trim(), vorsicht: `${st.vorsicht} ${splitHalfHinweis(sh)}`.trim(), apa: `${st.apa}; ${splitHalfApa(sh)}` };
}

/** Tabelle der Testhalbierung (Blatt, Bericht, Excel). `fragen` = die Fragen in der Reihenfolge der Rechnung (für die Namen je Teil). */
export function tabellenSplitHalf(sh: SplitHalf, fragen: string[] = [], name: (n: string) => string = n => n): TableItem[] {
  const h = fragen.length ? halbNamen(sh, fragen, name) : null;
  const teil = (nr: 1 | 2) => `${T(`Teil ${nr}`, `Part ${nr}`)}${h ? ` (${nr === 1 ? h.t1 : h.t2})` : ''}`;
  const zeilen = [
    [teil(1), fd(sh.k1), fo(sh.alpha1, 3), T('Cronbachs Alpha der ersten Hälfte', "Cronbach's alpha of the first half")],
    [teil(2), fd(sh.k2), fo(sh.alpha2, 3), T('Cronbachs Alpha der zweiten Hälfte', "Cronbach's alpha of the second half")],
    [T('Korrelation der Hälften (r)', 'Correlation between forms (r)'), '-', fo(sh.r, 3), T('Pearson-Korrelation der beiden Teilsummen', 'Pearson correlation of the two part sums')],
    [T('Spearman-Brown, gleiche Länge', 'Spearman-Brown, equal length'), '-', fo(sh.sbGleich, 3), T('Zuverlässigkeit der ganzen Skala, beide Hälften gleich lang gedacht', 'reliability of the whole scale, assuming equal halves')],
    [T('Spearman-Brown, ungleiche Länge', 'Spearman-Brown, unequal length'), '-', fo(sh.sbUngleich, 3), T('wie oben, bei ungleich langen Hälften', 'as above, for halves of unequal length')],
    [T('Guttman Split-Half', 'Guttman split-half'), '-', fo(sh.guttman, 3), T('ohne Annahme gleicher Varianz der Hälften', 'without assuming equal variance of the halves')]
  ];
  return [tabelle('Split-Half Reliability', T('Testhalbierung (Split-Half)', 'Split-half reliability'), [T('Maß', 'Measure'), T('Fragen', 'Items'), T('Wert', 'Value'), T('Bedeutung', 'Meaning')], zeilen,
    [T(`PSPP RELIABILITY /MODEL=SPLIT(${sh.k1}), ${sh.n} Personen mit allen Antworten. Teil 1 = die ersten ${sh.k1} Fragen, Teil 2 = die übrigen ${sh.k2} (Reihenfolge der Fragen wie gewählt).`,
      `PSPP RELIABILITY /MODEL=SPLIT(${sh.k1}), ${sh.n} people with all answers. Part 1 = the first ${sh.k1} questions, part 2 = the remaining ${sh.k2} (question order as chosen).`)])];
}
