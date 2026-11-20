/**
 * Skalen selbst festlegen: welche Fragen eines Fragebogens zusammen ein Merkmal messen (z. B. LIST: FG01, FG14, FG27 → „Organisation“).
 * Das steht NICHT in den Daten, sondern im Handbuch des Fragebogens. Statable rät es nie - die Person legt es fest.
 * Gespeichert im Projekt (s.skalen), beim Export als SPSS-Variablenset (variablensets.ts). Danach gliedert die Spaltenauswahl nach Skalen.
 * Fachlich: Eine Frage gehört zu höchstens einer Skala; Fragen mit verschiedenen Antwortskalen (1-5 und 1-7) sollte man nicht mitteln.
 */
import { istFehlend } from './fehlend';
import type { Spalte } from './verzeichnis';

export interface Skala { name: string; fragen: string[] }

/** Name einer Skala: frei (mit Leerzeichen und Umlauten), aber ohne „=“ und höchstens 64 Zeichen (Grenze im SPSS-Variablenset). */
export function skalaNameFehler(name: string, skalen: Skala[], eigener?: string): '' | 'leer' | 'zeichen' | 'vergeben' {
  const n = name.trim();
  if (!n) return 'leer';
  if (/[=\r\n]/.test(n) || n.length > 64) return 'zeichen';
  if (skalen.some(x => x.name.toLowerCase() === n.toLowerCase() && x.name !== eigener)) return 'vergeben';
  return '';
}

/** Gehört die Spalte zur Skala? Auch die umgepolte Fassung einer Frage (FG76 → FG76R, so legt skalabau.ts sie an). */
export const gehoertZu = (spalte: string, sk: Skala) => {
  const n = spalte.toUpperCase();
  return sk.fragen.some(f => f.toUpperCase() === n || `${f}R`.toUpperCase() === n || f.toUpperCase() === `${n}R`);
};

/** Fragen, die schon in einer anderen Skala stehen: Frage → Name der Skala. */
export function belegteFragen(skalen: Skala[], eigener?: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const sk of skalen) if (sk.name !== eigener) for (const f of sk.fragen) m.set(f, sk.name);
  return m;
}

/** Skalen, deren Fragen es alle (noch) gibt; die anderen bleiben gespeichert, gliedern aber nichts. */
export const brauchbareSkalen = (skalen: Skala[], spalten: Pick<Spalte, 'name'>[]) =>
  skalen.filter(x => x.fragen.length >= 2 && x.fragen.every(n => spalten.some(sp => sp.name === n)));

/** Die gespeicherte Skala mit genau diesen Fragen (Reihenfolge egal, umgepolte Fassung zählt als dieselbe Frage). */
export function skalaMitFragen(fragen: string[], skalen: Skala[]): Skala | undefined {
  const gleich = (a: string, b: string) => gehoertZu(a, { name: '', fragen: [b] });
  return skalen.find(sk => sk.fragen.length === fragen.length && fragen.every(f => sk.fragen.some(g => gleich(f, g))) && sk.fragen.every(g => fragen.some(f => gleich(f, g))));
}

export type SkalaHinweis =
  | { art: 'fehlt'; fragen: string[] }
  | { art: 'keineZahl'; fragen: string[] }
  | { art: 'zwei' }
  /** `ausDaten`: Spannen aus den Antworten und fast gleich - dann ist es vielleicht nur eine nie gewählte Randantwort. */
  | { art: 'spanne'; spannen: { von: number; bis: number; fragen: string[] }[]; ausDaten: boolean };

/** Antwortskala einer Frage: aus den Wertelabels (1 „nie“ … 5 „sehr oft“), sonst aus den vorkommenden Antworten. „Keine Angabe“ zählt nicht. */
export function antwortSpanne(sp: Spalte, werte: (string | number | null | undefined)[]): { von: number; bis: number; ausDaten: boolean } | null {
  const gueltig = (w: number) => Number.isFinite(w) && !istFehlend(sp, w);
  const ausLabels = Object.keys(sp.werteLabels).map(Number).filter(gueltig);
  const zahlen = ausLabels.length >= 2 ? ausLabels : werte.filter((w): w is number => typeof w === 'number' && gueltig(w));
  if (!zahlen.length) return null;
  let von = Infinity, bis = -Infinity;
  for (const z of zahlen) { if (z < von) von = z; if (z > bis) bis = z; }
  return { von, bis, ausDaten: ausLabels.length < 2 };
}

/** Was an einer Skala fachlich zu beachten ist. Nichts davon verbietet das Speichern - es sind Hinweise. */
export function skalaHinweise(fragen: string[], spalten: Spalte[], zeilen: (string | number | null)[][]): SkalaHinweis[] {
  const h: SkalaHinweis[] = [];
  const fehlt = fragen.filter(f => !spalten.some(sp => sp.name === f));
  if (fehlt.length) h.push({ art: 'fehlt', fragen: fehlt });
  const da = fragen.flatMap(f => { const i = spalten.findIndex(sp => sp.name === f); return i < 0 ? [] : [{ f, i, sp: spalten[i]! }]; });
  const keineZahl = da.filter(x => x.sp.art !== 'zahl').map(x => x.f);
  if (keineZahl.length) h.push({ art: 'keineZahl', fragen: keineZahl });
  if (fragen.length === 2) h.push({ art: 'zwei' });
  const spannen = new Map<string, { von: number; bis: number; fragen: string[] }>();
  let ausDaten = false;
  for (const x of da) {
    if (x.sp.art !== 'zahl') continue;
    const r = antwortSpanne(x.sp, zeilen.map(z => z[x.i])); if (!r) continue;
    if (r.ausDaten) ausDaten = true;
    const k = `${r.von}|${r.bis}`;
    if (!spannen.has(k)) spannen.set(k, { von: r.von, bis: r.bis, fragen: [] });
    spannen.get(k)!.fragen.push(x.f);
  }
  if (spannen.size > 1) {
    // „Vielleicht hat nur niemand die 5 gewählt“ passt nur bei fast gleichen Spannen aus den Antworten (1-4 neben 1-5), nicht bei 0-29 neben 1-5
    const l = [...spannen.values()], weit = (f: (x: { von: number; bis: number }) => number) => Math.max(...l.map(f)) - Math.min(...l.map(f));
    h.push({ art: 'spanne', spannen: l, ausDaten: ausDaten && weit(x => x.von) <= 1 && weit(x => x.bis) <= 2 });
  }
  return h;
}
