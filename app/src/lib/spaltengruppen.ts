/**
 * Spalten in der Auswahl gliedern - nur nach dem Namen, nie nach den Daten.
 * Fragebogen-Programme (SoSci Survey, Unipark …) vergeben Kürzel wie FG01, FG02 … oder DA06_01: gleiche Buchstaben vor
 * der Nummer = derselbe Fragenblock. Welche Fragen ein Konstrukt (eine Skala) bilden, steht NICHT in den Daten; aus den
 * Zusammenhängen raten wäre eine Faktorenanalyse und gehört nicht in eine Auswahlliste (09.10.).
 * Hat die Person Skalen festgelegt (skalen.ts), kommen diese zuerst; der Rest wird wie bisher nach dem Namen gegliedert.
 */
import { gehoertZu, type Skala } from './skalen';

/** `skala`: Name der Skala, wenn die Gruppe eine von der Person festgelegte Skala ist. */
export interface Spaltengruppe<T> { stamm: string | null; skala?: string; spalten: T[] }

/** Buchstaben vor der ersten Ziffer: „FG01“ → FG, „DA06_01“ → DA, „FG54UMCODIERT“ → FG; ohne Ziffer null. */
export const namensStamm = (name: string): string | null => /^([\p{L}]+)_?\d/u.exec(name)?.[1]?.toUpperCase() ?? null;

/**
 * Zuerst die Skalen (in ihrer Reihenfolge, nur mit Spalten aus der Liste; die umgepolte Fassung FG76R steht bei ihrer Skala).
 * Dann der Rest nach Stamm, in der Reihenfolge des ersten Auftretens; ein Stamm braucht mindestens zwei Spalten, der Rest kommt in eine
 * Gruppe ohne Stamm (am Ende). Ergibt das weniger als zwei Gruppen und keine Skala, gibt es nichts zu gliedern: null.
 */
export function spaltenGruppen<T extends { name: string }>(alle: T[], skalen: Skala[] = []): Spaltengruppe<T>[] | null {
  const vergeben = new Set<string>(), vorne: Spaltengruppe<T>[] = [];
  for (const sk of skalen) {
    const sp = alle.filter(x => !vergeben.has(x.name) && gehoertZu(x.name, sk));
    if (!sp.length) continue;
    for (const x of sp) vergeben.add(x.name);
    vorne.push({ stamm: null, skala: sk.name, spalten: sp });
  }
  const spalten = alle.filter(x => !vergeben.has(x.name));
  const zahl = new Map<string, number>();
  for (const sp of spalten) { const s = namensStamm(sp.name); if (s) zahl.set(s, (zahl.get(s) ?? 0) + 1); }
  const gruppen = new Map<string, T[]>(), rest: T[] = [];
  for (const sp of spalten) {
    const s = namensStamm(sp.name);
    if (s && zahl.get(s)! >= 2) { if (!gruppen.has(s)) gruppen.set(s, []); gruppen.get(s)!.push(sp); } else rest.push(sp);
  }
  const liste: Spaltengruppe<T>[] = [...vorne, ...[...gruppen].map(([stamm, sp]) => ({ stamm, spalten: sp }))];
  if (rest.length) liste.push({ stamm: null, spalten: rest });
  return vorne.length || (liste.length >= 2 && gruppen.size >= 1) ? liste : null;
}

/** Überschrift einer Gruppe: „FG01 bis FG77“ bzw. „DA06_01, DA07“. Angehängte Spalten wie „FG54UMCODIERT“ zählen mit, bestimmen aber nicht die Spanne. */
export function gruppenSpanne(g: Spaltengruppe<{ name: string }>, bis: string): string {
  const alle = g.spalten.map(s => s.name), rein = alle.filter(x => /^\p{L}+_?[\d_]+$/u.test(x)), n = rein.length >= 2 ? rein : alle;
  return alle.length <= 2 ? n.join(', ') : `${n[0]} ${bis} ${n[n.length - 1]}`;
}
