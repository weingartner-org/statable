/**
 * Bauteile für Rechenaufgaben („Selbst rechnen“): Typen, `bau` (setzt das Soll aus den Rohdaten ein) und kleine Rechenhelfer. Eigene Datei, damit `rechenaufgaben.ts` und die Aufgaben der Lernpfade einander nicht im Kreis einlesen.
 */
import { P, type Paar } from '../i18n/laufzeit';
/** Zahl im Zahlformat des Projekts (Komma oder Punkt); `stellen` fehlt = ganze Zahl ohne, sonst mit zwei Stellen. */
export type Zahl = (x: number, stellen?: number) => string;

export interface Schritt {
  id: string;
  frage: Paar;
  /** Warum man so rechnet (steht neben dem Schritt, nicht nur als Verweis). */
  warum: Paar;
  /** Einheit oder Hinweis hinter dem Feld („Stunden“, „%“). */
  einheit?: Paar;
  soll: number;
  /** Erlaubte absolute Abweichung (rundet die Person auf die gezeigten Stellen, soll das Ergebnis gelten). */
  toleranz: number;
  /** Nachkommastellen, in denen das Ergebnis angezeigt wird. */
  stellen: number;
  /** Allgemeiner Tipp bei einem Ergebnis ohne bekanntes Muster. */
  tipp: Paar;
  /** Typische Fehlwege: die Zahl, die dabei herauskommt, und der Tipp dazu. */
  fehler: { wert: number; tipp: Paar }[];
  /** Rechenweg mit Zwischenschritten, Zahlen im Format des Projekts. */
  weg: (z: Zahl) => Paar[];
}
export interface Tabelle { titel: Paar; kopf: Paar[]; zeilen: (string | number | Paar)[][] }
export interface Rechenaufgabe {
  id: string;
  lage: Paar;
  tabelle: Tabelle;
  schritte: Schritt[];
  /** Was man mitnimmt; erscheint, wenn alle Schritte stimmen. */
  merke: Paar;
  /** Hinweis auf das Ausprobieren, das darauf folgt. */
  ausprobieren: Paar;
}

export interface Entwurf<D> extends Omit<Schritt, 'soll' | 'fehler' | 'weg'> {
  soll: (d: D) => number;
  fehler: { wert: (d: D) => number; tipp: Paar }[];
  weg: (d: D, z: Zahl) => Paar[];
}
export interface AufgabenEntwurf<D> extends Omit<Rechenaufgabe, 'schritte' | 'tabelle'> {
  daten: D;
  tabelle: Tabelle;
  schritte: Entwurf<D>[];
}
/** Setzt aus den Rohdaten das Soll und die Fehlwege ein. */
export function bau<D>(e: AufgabenEntwurf<D>): Rechenaufgabe {
  const { daten, schritte, ...rest } = e;
  return { ...rest, schritte: schritte.map(s => ({ ...s, soll: s.soll(daten), fehler: s.fehler.map(f => ({ wert: f.wert(daten), tipp: f.tipp })), weg: (z: Zahl) => s.weg(daten, z) })) };
}

export const summe = (x: readonly number[]) => x.reduce((a, b) => a + b, 0);
export const mittel = (x: readonly number[]) => summe(x) / x.length;
export const quadratsumme = (x: readonly number[]) => { const m = mittel(x); return summe(x.map(v => (v - m) ** 2)); };
export const median = (x: readonly number[]) => { const s = [...x].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
export const plus = (z: Zahl, x: number) => (x > 0 ? `+${z(x)}` : z(x));

