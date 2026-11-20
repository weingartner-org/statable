/**
 * Diagramm direkt aus der Datenansicht (bausteine/DatenDiagramm.svelte, Friedrich Beckmann 28.10.2026): welches Bild zu einer oder zwei Spalten passt,
 * und die Daten dafür - Zahlen, Paare, Häufigkeiten, Kreuzzählung - aus den Zeilen der Sitzung. Gerechnet wird nichts Statistisches: nur gezählt und gesammelt.
 */
import { istFehlend } from './fehlend';
import type { Spalte } from './verzeichnis';
import type { Haeufigkeit } from './ergebnis';
import { zahlDe } from './format';
import { L } from './sitzung.svelte';

type Zeilen = (string | number | null)[][];
/** Höchstens so viele Stufen für Säulen; mehr sind meist freier Text (Zitate, Namen) und kein Bild wert. */
export const DD_STUFEN_MAX = 30;
/** Höchstens so viele Gruppen für Gruppenbilder (wie die Karte „Unterscheiden sich Gruppen?“). */
export const DD_GRUPPEN_MAX = 12;

export type DiagrammArt =
  | { art: 'verteilung'; satz: string; frage: Frage }
  | { art: 'saeulen'; satz: string; frage: Frage }
  | { art: 'streu'; x: string; y: string; satz: string; frage: Frage }
  | { art: 'gruppenmittel'; y: string; g: string; satz: string; frage: Frage }
  | { art: 'kreuz'; gezaehlt: string; gruppen: string; satz: string; frage: Frage }
  | { art: 'keins'; satz: string; frage: Frage };
interface Frage { art: string; w: { l1?: string[]; l2?: string[] } }

const gueltig = (sp: Spalte, v: unknown): v is string | number => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && (!Number.isFinite(v) || istFehlend(sp, v)));
const index = (sp: Spalte, spalten: Spalte[]) => spalten.findIndex(x => x.name === sp.name);

/** Verschiedene gültige Werte einer Spalte (bricht ab, sobald es mehr als `bis` sind). */
export function verschiedene(sp: Spalte, zeilen: Zeilen, spalten: Spalte[], bis = Infinity): number {
  const i = index(sp, spalten), m = new Set<string | number>();
  for (const z of zeilen) { const v = z[i]; if (gueltig(sp, v)) { m.add(v); if (m.size > bis) break; } }
  return m.size;
}
/** Teilt die Spalte in Gruppen ein? Text, nominal, oder Zahlen mit Beschriftungen und wenigen Stufen (wie „Gruppen (Zahlen)“ in der Datenansicht). */
export function istKategorie(sp: Spalte, zeilen: Zeilen, spalten: Spalte[]): boolean {
  if (sp.art === 'text' || sp.niveau === 'nominal') return true;
  return Object.keys(sp.werteLabels).length > 0 && verschiedene(sp, zeilen, spalten, DD_GRUPPEN_MAX) <= DD_GRUPPEN_MAX;
}

/** Das passende Bild zu einer Spalte `a` und (optional) einer zweiten `b`. */
export function diagrammArt(a: Spalte, b: Spalte | undefined, zeilen: Zeilen, spalten: Spalte[]): DiagrammArt {
  const ka = istKategorie(a, zeilen, spalten);
  const zuViele = (sp: Spalte, max: number) => verschiedene(sp, zeilen, spalten, max) > max;
  if (!b) {
    if (ka) return zuViele(a, DD_STUFEN_MAX)
      ? { art: 'keins', satz: L(`Die Spalte hat mehr als ${DD_STUFEN_MAX} verschiedene Werte - das sieht nach freiem Text aus, nicht nach Gruppen. Säulen wären hier nicht lesbar.`, `The column has more than ${DD_STUFEN_MAX} different values - that looks like free text, not groups. Bars would not be readable here.`), frage: { art: 'verteilung', w: { l1: [a.name] } } }
      : { art: 'saeulen', satz: L('Eine Spalte mit Gruppen: Die Säulen zeigen, wie oft jede Gruppe vorkommt.', 'A column with groups: the bars show how often each group occurs.'), frage: { art: 'verteilung', w: { l1: [a.name] } } };
    return { art: 'verteilung', satz: L('Eine Zahlenspalte: Histogramm und Boxplot zeigen, wie sich die Werte verteilen.', 'A number column: the histogram and the box plot show how the values are distributed.'), frage: { art: 'verteilung', w: { l1: [a.name] } } };
  }
  const kb = istKategorie(b, zeilen, spalten);
  if (!ka && !kb) return { art: 'streu', x: a.name, y: b.name, satz: L('Zwei Zahlenspalten: Jeder Punkt ist eine Zeile. Das Streudiagramm zeigt, ob die beiden zusammen steigen oder fallen.', 'Two number columns: each dot is one row. The scatter plot shows whether the two rise or fall together.'), frage: { art: 'zusammenhang', w: { l1: [a.name], l2: [b.name] } } };
  if (ka !== kb) {
    const y = ka ? b : a, g = ka ? a : b;
    return { art: 'gruppenmittel', y: y.name, g: g.name, satz: L('Eine Zahl und eine Spalte mit Gruppen: Das Bild zeigt den Mittelwert jeder Gruppe und die einzelnen Werte.', 'A number and a column with groups: the chart shows the mean of each group and the single values.'), frage: { art: 'gruppen', w: { l1: [y.name], l2: [g.name] } } };
  }
  if (zuViele(a, DD_GRUPPEN_MAX) || zuViele(b, DD_GRUPPEN_MAX)) return { art: 'keins', satz: L(`Für gruppierte Säulen darf jede Spalte höchstens ${DD_GRUPPEN_MAX} Gruppen haben.`, `For grouped bars each column may have at most ${DD_GRUPPEN_MAX} groups.`), frage: { art: 'kreuz', w: { l1: [a.name], l2: [b.name] } } };
  return { art: 'kreuz', gezaehlt: a.name, gruppen: b.name, satz: L('Zwei Spalten mit Gruppen: Die Säulen zeigen für jede Gruppe der zweiten Spalte, wie sich die erste verteilt.', 'Two columns with groups: for each group of the second column, the bars show how the first one is distributed.'), frage: { art: 'kreuz', w: { l1: [a.name], l2: [b.name] } } };
}

/** Text einer Stufe: Wertebeschriftung, sonst die Zahl in der Schreibweise der Sprache, sonst der Text. */
export const stufe = (sp: Spalte, v: string | number): string => (typeof v === 'number' ? sp.werteLabels[String(v)] ?? zahlDe(v) : v);
/** Stufen in fester Reihenfolge: Zahlen aufsteigend, Text alphabetisch (Zahlen im Text der Größe nach). */
const ordne = (werte: (string | number)[]) => [...werte].sort((x, y) => (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })));

/** Gewicht einer Zeile: 1 ohne Fallgewicht; mit Fallgewicht der Wert, Zeilen ohne gültiges, positives Gewicht zählen nicht. */
function gewichter(zeilen: Zeilen, spalten: Spalte[], gewicht?: string): (z: Zeilen[number]) => number {
  if (!gewicht) return () => 1;
  const i = spalten.findIndex(x => x.name === gewicht), sp = spalten[i];
  if (i < 0 || !sp) return () => 1;
  return z => { const w = z[i]; return typeof w === 'number' && Number.isFinite(w) && w > 0 && !istFehlend(sp, w) ? w : 0; };
}

/** Die gültigen Zahlen einer Spalte (für Histogramm und Boxplot). */
export function zahlenAus(sp: Spalte, zeilen: Zeilen, spalten: Spalte[]): number[] {
  const i = index(sp, spalten), aus: number[] = [];
  for (const z of zeilen) { const v = z[i]; if (typeof v === 'number' && gueltig(sp, v)) aus.push(v); }
  return aus;
}
/** Die Zeilen, in denen beide Spalten eine gültige Zahl haben, als Punkte [x, y]. */
export function paareAus(x: Spalte, y: Spalte, zeilen: Zeilen, spalten: Spalte[]): [number, number][] {
  const ix = index(x, spalten), iy = index(y, spalten), aus: [number, number][] = [];
  for (const z of zeilen) { const a = z[ix], b = z[iy]; if (typeof a === 'number' && typeof b === 'number' && gueltig(x, a) && gueltig(y, b)) aus.push([a, b]); }
  return aus;
}
/** Häufigkeiten einer Spalte mit Gruppen (mit Fallgewicht: Summe der Gewichte). `anteil` bezieht sich auf die gültigen Angaben. */
export function haeufigkeitAus(sp: Spalte, name: string, zeilen: Zeilen, spalten: Spalte[], gewicht?: string): Haeufigkeit {
  const i = index(sp, spalten), w = gewichter(zeilen, spalten, gewicht), zahl = new Map<string | number, number>();
  let fehlend = 0;
  for (const z of zeilen) { const g = w(z); if (!g) continue; const v = z[i]; if (gueltig(sp, v)) zahl.set(v, (zahl.get(v) ?? 0) + g); else fehlend += g; }
  const n = [...zahl.values()].reduce((a, b) => a + b, 0);
  return { name, n, fehlend, kategorie: true, werte: ordne([...zahl.keys()]).map(v => ({ name: stufe(sp, v), anzahl: zahl.get(v)!, anteil: n ? zahl.get(v)! / n : 0 })) };
}
/** Kreuzzählung für gruppierte Säulen: Zeilen = Gruppen der zweiten Spalte, Spalten = Stufen der ersten (wie `Kreuz.zaehlung`). */
export function kreuzAus(gezaehlt: Spalte, gruppen: Spalte, gezaehltName: string, gruppenName: string, zeilen: Zeilen, spalten: Spalte[], gewicht?: string) {
  const ia = index(gezaehlt, spalten), ib = index(gruppen, spalten), w = gewichter(zeilen, spalten, gewicht);
  const paare: [string | number, string | number, number][] = [];
  for (const z of zeilen) { const g = w(z), a = z[ia], b = z[ib]; if (g && gueltig(gezaehlt, a) && gueltig(gruppen, b)) paare.push([a, b, g]); }
  const sa = ordne([...new Set(paare.map(p => p[0]))]), sb = ordne([...new Set(paare.map(p => p[1]))]);
  const tab = sb.map(() => sa.map(() => 0));
  for (const [a, b, g] of paare) tab[sb.indexOf(b)]![sa.indexOf(a)]! += g;
  return { gezaehlt: gezaehltName, gruppen: gruppenName, n: paare.reduce((s, p) => s + p[2], 0), zaehlung: { zeilen: sb.map(v => stufe(gruppen, v)), spalten: sa.map(v => stufe(gezaehlt, v)), tab } };
}
