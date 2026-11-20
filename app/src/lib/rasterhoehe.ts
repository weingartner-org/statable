/**
 * Die Datentabelle zeichnet nur die sichtbaren Zeilen; für alle anderen steht ein leerer Platzhalter in voller Höhe (Zeilen × Zeilenhöhe).
 * Ein Element darf aber nur etwa 16,7 Millionen Pixel hoch werden (Chrome und Edge 16.777.215, Firefox ähnlich): bei 1,5 Millionen Zeilen à 26 px
 * ließ sich die Tabelle nur bis Zeile 645.287 scrollen (gemessen am 31.10.2026), der Rest war nicht zu erreichen.
 * Darüber wird die Höhe auf `HOEHE_MAX` gedeckelt, die Tabelle klebt oben im Bild, und der Bildlauf wird auf die Zeilen umgerechnet:
 * die Bildlaufleiste gilt dann für alle Zeilen, ein Schritt der Leiste springt um mehr als eine Zeile.
 */
export const HOEHE_MAX = 15_000_000;

export interface RasterAbbildung {
  /** Der Platzhalter ist auf `HOEHE_MAX` gedeckelt, die Tabelle klebt oben */
  skaliert: boolean;
  /** Höhe des Platzhalters in px */
  gesamt: number;
  /** Wie viele Pixel der Zeilen auf ein Pixel Bildlauf kommen (1, solange alles passt) */
  faktor: number;
  zeile: number;
}

export function rasterAbbildung(zeilen: number, zeile: number, hoehe: number): RasterAbbildung {
  const voll = Math.max(0, zeilen) * zeile;
  if (voll <= HOEHE_MAX) return { skaliert: false, gesamt: voll, faktor: 1, zeile };
  return { skaliert: true, gesamt: HOEHE_MAX, faktor: (voll - hoehe) / (HOEHE_MAX - hoehe), zeile };
}

/** Die Zeile am oberen Rand des Bildes (0-gezählt) bei diesem Bildlauf. */
export const ersteZeile = (oben: number, a: RasterAbbildung): number => Math.max(0, Math.floor(oben * a.faktor / a.zeile));

/** Der Bildlauf, bei dem diese Zeile am oberen Rand steht (negativ wird 0). */
export const obenFuerZeile = (zeile: number, a: RasterAbbildung): number => Math.max(0, zeile * a.zeile / a.faktor);
