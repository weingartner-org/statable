/**
 * Verlauf für Rückgängig und Wiederholen (11.10.): jeder Schritt hält den ganzen Datenstand davor (SAV-Bytes) - bei kleinen Studien ein paar KB,
 * bei sehr großen Tabellen Megabytes. Darum zwei Grenzen: höchstens 100 Schritte UND höchstens 96 MB insgesamt (der jüngste bleibt immer).
 * Vorher waren es 30 Schritte ohne Byte-Grenze; eine Studie mit 20 Fragen und 300 Personen (~60 KB) kommt auf 100 Schritte bei 6 MB.
 */
import type { Lesehinweis } from './einlesen';
import type { Gewicht } from './gewichte';

export const VERLAUF_MAX_SCHRITTE = 100;
export const VERLAUF_MAX_BYTES = 96 * 1024 * 1024;

/** `lese`: nur bei Schritten, die das Einlesen betreffen („Als Tausender lesen“, Lesehinweis abhaken, N2) - der Zustand der Lesehinweise und der Tausender-Spalten, zu dem Rückgängig zurückkehrt. */
/** `gewicht`: das Fallgewicht, das zu diesem Datenstand gehört (null = ungewichtet; fehlt in Schritten aus der Zeit davor). Die Art steht nicht im .sav, darum hier. */
/** `pnr`: Nummer des Eintrags im Protokoll der Datenänderungen (lib/protokoll.ts), damit Rückgängig den Eintrag als „zurückgenommen“ vermerken kann; fehlt bei Schritten, die keine Datenänderung sind. */
export interface Schritt { text: string; sav: Uint8Array; pnr?: number; gewicht?: Gewicht | null; entscheid: Record<string, 'erledigt' | 'gelassen'>; lese?: { hinweise: Lesehinweis[]; tausender: string[]; zahlen: string[] } }

/** Hängt `neu` hinten an und wirft vorn Schritte weg, bis beide Grenzen halten. */
export function anhaengen(liste: Schritt[], neu: Schritt, maxSchritte = VERLAUF_MAX_SCHRITTE, maxBytes = VERLAUF_MAX_BYTES): Schritt[] {
  const aus = [...liste, neu];
  let summe = aus.reduce((a, x) => a + x.sav.byteLength, 0);
  let weg = Math.max(0, aus.length - maxSchritte);
  for (let i = 0; i < weg; i++) summe -= aus[i]!.sav.byteLength;
  while (summe > maxBytes && weg < aus.length - 1) { summe -= aus[weg]!.sav.byteLength; weg++; }
  return aus.slice(weg);
}
