/**
 * Hierarchische Regression (G4): die Wahl am Blatt unter „Weitere Wege“ - Zahl der Blöcke und welche Spalte in welchem Block liegt. Reine Funktionen ohne Sitzung (Rechnen: hierreg.ts).
 */

/** Die Wahl am Blatt: Blöcke bilden (an), Zahl der Blöcke und die Zuordnung Spalte → Block (fehlt eine Spalte, gilt die Voreinstellung). */
export interface HierWahl { an: boolean; anzahl: 2 | 3; block: Record<string, number> }
export const leereHier = (): HierWahl => ({ an: false, anzahl: 2, block: {} });
export const kopiereHier = (h: HierWahl | undefined): HierWahl => (h ? { an: h.an, anzahl: h.anzahl, block: { ...h.block } } : leereHier());

/** Voreinstellung: die Prädiktoren in der Reihenfolge der Wahl gleichmäßig auf die Blöcke verteilt (5 Spalten auf 3 Blöcke: 1, 1, 2, 2, 3). */
export const hierStandard = (i: number, n: number, anzahl: number): number => Math.min(anzahl, Math.floor((i * anzahl) / Math.max(1, n)) + 1);
/** In welchem Block liegt die Spalte (Wahl, sonst Voreinstellung; eine Wahl außerhalb der Blockzahl zählt als letzter Block)? */
export function hierBlockVon(praed: string[], w: HierWahl, name: string): number {
  const i = praed.indexOf(name), gew = w.block[name];
  return Math.min(w.anzahl, gew !== undefined && gew >= 1 ? gew : hierStandard(Math.max(0, i), praed.length, w.anzahl));
}
/** Die Spalten je Block in der Reihenfolge der Wahl; ein Block ohne Spalte bleibt leer (die Prüfliste sperrt dann). */
export function hierBloecke(praed: string[], w: HierWahl): string[][] {
  const bl: string[][] = Array.from({ length: w.anzahl }, () => []);
  for (const n of praed) bl[hierBlockVon(praed, w, n) - 1]!.push(n);
  return bl;
}
/** Gilt die Wahl (an, mindestens zwei Spalten, jeder Block belegt)? */
export const hierGueltig = (praed: string[], w: HierWahl | undefined): w is HierWahl => !!w && w.an && praed.length >= w.anzahl && hierBloecke(praed, w).every(b => b.length > 0);
