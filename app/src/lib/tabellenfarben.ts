/**
 * Farbige Ansicht der Ergebnistabellen (Johannes 09.10., Entwurf „Statable Kreuztabelle farbig“):
 * Bereiche (z. B. „sehr selten“ … „sehr oft“) dezent getönt, „Gesamt“ immer im selben kühlen Grau, als Zeile und als Spalte.
 * Die Ansicht gilt je Tabelle (Feld `ansicht` an der Tabelle, wird mit dem Projekt gespeichert) und geht genau so in Word, Excel und PDF.
 *  c = Abstufung eines Tons (Standard), a = eigener Ton je Bereich, b = zwei Töne im Wechsel, aus = ohne Farbe (APA, für die Arbeit).
 * Anzeige: CSS mit den Farben des Themas (auch dunkel/Kontrast); Export: feste helle Farben auf Weiß.
 */
import { L, mitFlag } from './sitzung.svelte';
export type Ansicht = 'c' | 'a' | 'b' | 'aus';
export const ANSICHTEN: Ansicht[] = ['c', 'a', 'b', 'aus'];
export const STANDARD_ANSICHT: Ansicht = 'c';

/** Ton einer Zelle im Rumpf: Bereich `gruppe` von `n`, dazu Gesamt-Zeile oder -Spalte. */
export interface Ton { ansicht: Ansicht; gruppe: number; n: number; gesamtZeile: boolean; gesamtSpalte: boolean; /** Kopfzeile: nur der Ton der Gesamt-Spalte */ kopf?: boolean }

const AKZENT = '#17756A', KORALLE = '#C4502F', TINTE = '#1D2530';   // Koralle statt Ocker (Johannes 09.10.)
const BUNT = ['#17756A', '#3A6EA5', '#C4502F', '#7B4F8E', '#6B7A2E'];
/** Anteil (0-1) der Farbe in der Fläche: C steigt von hell nach kräftiger, damit die Rangfolge sichtbar bleibt. */
const stufe = (t: Ton) => 0.04 + (t.n > 1 ? (0.14 * t.gruppe) / (t.n - 1) : 0.07);

/** Grundton der Zeile (ohne Gesamt-Spalte): [Farbe, Anteil] oder null für keine Fläche. */
function grund(t: Ton): [string, number] | null {
  if (t.ansicht === 'aus' || t.kopf) return null;
  if (t.gesamtZeile) return [TINTE, 0.1];
  if (t.ansicht === 'c') return [AKZENT, stufe(t)];
  if (t.ansicht === 'a') return [BUNT[t.gruppe % BUNT.length]!, 0.11];
  return t.gruppe % 2 === 0 ? [KORALLE, 0.07] : null;
}

const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const misch = (farbe: string, anteil: number, auf: number[]) => hex(farbe).map((v, i) => Math.round(v * anteil + auf[i]! * (1 - anteil)));
const alsHex = (rgb: number[]) => rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

/** Hintergrund für Word, Excel, PDF und das Kopieren: 6-stelliges Hex ohne „#“ oder null (weiß lassen). */
export function tonHex(t: Ton | undefined): string | null {
  if (!t || t.ansicht === 'aus') return null;
  const g = grund(t);
  let rgb = g ? misch(g[0], g[1], [255, 255, 255]) : [255, 255, 255];
  if (t.gesamtSpalte) rgb = misch(TINTE, 0.06, rgb);
  return g || t.gesamtSpalte ? alsHex(rgb) : null;
}

/** Hintergrund in der App: mit den Farben des Themas gemischt (color-mix), damit es im dunklen Schema und in Kontrast-Schemata passt. */
export function tonCss(t: Ton | undefined): string | undefined {
  if (!t || t.ansicht === 'aus') return undefined;
  const g = grund(t);
  const farbe = (h: string) => (h === AKZENT ? 'var(--akzent)' : h === TINTE ? 'var(--tinte)' : h === KORALLE ? 'var(--dg-b)' : h);
  const zeile = g ? `color-mix(in srgb, ${farbe(g[0])} ${Math.round(g[1] * 100)}%, var(--blatt))` : 'var(--blatt)';
  return t.gesamtSpalte ? `color-mix(in srgb, var(--tinte) 6%, ${zeile})` : g ? zeile : undefined;
}

/** Zahlen in Gesamt-Zeile und -Spalte fett (nicht bei „Ohne Farbe“, dort bleibt die Tabelle reines APA). */
export const tonFett = (t: Ton | undefined) => !!t && t.ansicht !== 'aus' && !t.kopf && (t.gesamtZeile || t.gesamtSpalte);

/** Gesamt-Zeilen und -Spalten erkennt Statable an diesen Wörtern (Deutsch und Englisch, wie PSPP sie schreibt). */
export const istGesamt = (t: string) => /^(Gesamt|Gesamtsumme|Total|Insgesamt)$/i.test(t.trim());

/** Name im Schalter. */
export const ansichtName = (a: Ansicht, en = false) => mitFlag(en, () => ({
  c: L('Abstufung (Standard)', 'Shades (default)'),
  a: L('Eigener Ton je Bereich', 'One tone per section'),
  b: L('Zwei Töne im Wechsel', 'Two alternating tones'),
  aus: L('Ohne Farbe (APA)', 'No color (APA)')
})[a]);
