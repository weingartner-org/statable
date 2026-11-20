/**
 * Feste Stichprobe für Diagramme (Abschlusstest A3): Einzelpunkte werden nur bis zu einer Grenze gezeichnet.
 * Ein Kreis je Person machte aus 100.000 Zeilen 94.000 SVG-Knoten - Bildschirm und Bericht (Word, PDF) standen minutenlang.
 * Gezeichnet wird eine zufällige, aber FESTE Auswahl (gleiche Daten, gleiche Punkte - auch nach dem Neuladen und im Bericht);
 * die Bildunterschrift nennt sie. Alle Kennzahlen (Mittelwert, KI, r, Linie, Quartile) rechnen immer mit ALLEN Daten.
 */
import { Lp } from './sitzung.svelte';
import { ort } from '../i18n/profil';

/** Höchstzahl gezeichneter Einzelpunkte: je Gruppe, je Streudiagramm, je Linienzug usw. */
export const GRENZE = { gruppe: 500, streu: 2000, paare: 400, ausreisser: 100 } as const;

/** Welche Plätze 0 … n-1 gezeichnet werden: alle, wenn n ≤ max; sonst `max` feste Zufallsplätze (aufsteigend, jeder höchstens einmal). */
export function stichprobenIndex(n: number, max: number): number[] {
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  // mulberry32 mit festem Startwert (hängt nur von n ab): teilweises Mischen nach Fisher-Yates
  let z = (0x9e3779b9 ^ n) >>> 0;
  const zufall = () => { z = (z + 0x6d2b79f5) >>> 0; let t = z; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const p = new Uint32Array(n); for (let i = 0; i < n; i++) p[i] = i;
  for (let i = 0; i < max; i++) { const j = i + Math.floor(zufall() * (n - i)); const t = p[i]!; p[i] = p[j]!; p[j] = t; }
  return Array.from(p.subarray(0, max)).sort((a, b) => a - b);
}

export interface Auswahl<T> { auswahl: T[]; gesamt: number; gekuerzt: boolean }
/** Höchstens `max` Elemente: alle, oder die feste Zufallsauswahl (in der alten Reihenfolge). */
export function zieheStichprobe<T>(a: readonly T[], max: number): Auswahl<T> {
  if (a.length <= max) return { auswahl: a as T[], gesamt: a.length, gekuerzt: false };
  return { auswahl: stichprobenIndex(a.length, max).map(i => a[i]!), gesamt: a.length, gekuerzt: true };
}

/** Q-Q-Diagramm (Werte schon nach Größe geordnet): die Enden bleiben vollständig - dort zeigen sich Ausreißer und schwere Ränder -, die Mitte wird gleichmäßig ausgedünnt. */
export function qqIndex(n: number, max: number): number[] {
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  const ende = Math.floor(max * 0.1), mitte = max - 2 * ende, aus: number[] = [];
  for (let i = 0; i < ende; i++) aus.push(i);
  const von = ende, bis = n - ende - 1;
  for (let k = 0; k < mitte; k++) aus.push(Math.round(von + (bis - von) * (k / (mitte - 1))));
  for (let i = n - ende; i < n; i++) aus.push(i);
  return aus;
}

const zahl = (v: number) => v.toLocaleString(ort());
/** Bildunterschrift: „Punkte: 500 von 33.000 Personen, zufällig, fest“. */
export const punkteHinweis = (gezeigt: number, gesamt: number) => {
  const a = zahl(gezeigt), b = zahl(gesamt);
  return Lp(gesamt, `Punkte: ${a} von ${b} Person, zufällig, fest`, `Punkte: ${a} von ${b} Personen, zufällig, fest`, `Dots: ${a} of ${b} person, random, fixed`, `Dots: ${a} of ${b} people, random, fixed`);
};
/** Q-Q-Diagramm: die Enden vollständig, die Mitte gleichmäßig ausgedünnt (kein Zufall). */
export const qqHinweis = (gezeigt: number, gesamt: number) => {
  const a = zahl(gezeigt), b = zahl(gesamt);
  return Lp(gesamt, `Punkte: ${a} von ${b} Wert, Enden vollständig`, `Punkte: ${a} von ${b} Werten, Enden vollständig`, `Dots: ${a} of ${b} value, tails complete`, `Dots: ${a} of ${b} values, tails complete`);
};
/** Kasten- und Verteilungsdiagramme: nur die äußersten Ausreißer als Ringe. */
export const ausreisserHinweis = (gezeigt: number, gesamt: number) => {
  const a = zahl(gezeigt), b = zahl(gesamt);
  return Lp(gesamt, `Ringe: ${a} von ${b} Wert, die äußersten`, `Ringe: ${a} von ${b} Werten, die äußersten`, `Circles: ${a} of ${b} value, the outermost`, `Circles: ${a} of ${b} values, the outermost`);
};
/** Die `max` Werte, die am weitesten von der Mitte `md` entfernt liegen (für Ausreißer-Ringe), in der alten Reihenfolge. */
export function aeusserste(werte: readonly number[], md: number, max: number): Auswahl<number> {
  if (werte.length <= max) return { auswahl: werte as number[], gesamt: werte.length, gekuerzt: false };
  const rang = werte.map((v, i) => [Math.abs(v - md), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, max).map(x => x[1]).sort((a, b) => a - b);
  return { auswahl: rang.map(i => werte[i]!), gesamt: werte.length, gekuerzt: true };
}
/** Zeitreihen (Einzelfall): nicht zufällig, sondern jede k-te Messung - die Reihenfolge bleibt erhalten. */
export const reiheHinweis = (k: number) => Lp(k, `Punkte: eine von je ${k} Messung`, `Punkte: eine von je ${k} Messungen`, `Dots: one in every ${k} measurement`, `Dots: one in every ${k} measurements`);
