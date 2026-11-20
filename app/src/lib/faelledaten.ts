/**
 * Fälle vergleichen (G1): die Verbindung zwischen den Daten des Projekts (`s.spalten`, `s.zeilen`) und der reinen Logik in faelle.ts.
 * Das Blatt hält nur die Auswahl (Spalten) und den Zustand (`blatt.faelle`); die Fälle selbst entstehen bei jedem Aufruf neu aus den Daten -
 * so gibt es keine zweite Wahrheit, und der Zustand folgt den Fällen über die Kennung (sonst die Zeilennummer).
 */
import { s, type Blatt } from './sitzung.svelte';
import { baueFaelle, type Faelle, type FaelleZustand, type RohSpalte, type Wert } from './faelle';
import { werteVon } from './blatttitel';
import type { Werte } from './verfahren';

/** Was im Blatt als Ergebnis steht: die Auswahl und die Zahl der Fälle bei der Rechnung (für Bericht und Stichprobensatz). Gruppen und Texte stehen nie hier, sondern in `blatt.faelle`. */
export interface FaelleErgebnis { kennung: string; q: string[]; t: string[]; n: number; zeilen: number; ausgelassen: number }

/** Die Auswahl in der Form von `baueFaelle`: Lücke 1 = Zahlen/Gruppen, Lücke 2 = Texte, Lücke 3 = Kennung. */
export const faelleWahl = (w: Werte) => ({ kennung: w.l3[0] ?? '', q: w.l1, t: w.l2 });

export function rohSpalten(): RohSpalte[] {
  return s.spalten.map(sp => ({ name: sp.name, bezeichnung: sp.bezeichnung, art: sp.art, fehlend: sp.fehlend, fehlendBereich: sp.fehlendBereich, werteLabels: sp.werteLabels, niveau: sp.niveau }));
}
/** Die Fälle zu einer Auswahl aus den heutigen Daten; mit `zustand` übernehmen sie Gruppen, Notizen und Markierungen. */
export function faelleAusDaten(w: Werte, zustand?: FaelleZustand): Faelle {
  return baueFaelle(rohSpalten(), s.zeilen as Wert[][], faelleWahl(w), zustand);
}
/** Die Fälle eines Blatts (Auswahl und Zustand aus dem Blatt). */
export const faelleVonBlatt = (b: Blatt): Faelle => faelleAusDaten(werteVon(b), b.faelle);

export function ergebnisVon(w: Werte, e: Faelle): FaelleErgebnis {
  return { kennung: e.kennung, q: [...w.l1], t: [...w.l2], n: e.faelle.length, zeilen: e.zeilen, ausgelassen: e.ausgelassen };
}
