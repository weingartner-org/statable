import { describe, expect, it } from 'vitest';
import { HOEHE_MAX, rasterAbbildung, ersteZeile, obenFuerZeile } from './rasterhoehe';

/* Die Datentabelle zeichnet nur die sichtbaren Zeilen und füllt den Rest mit einem leeren Platzhalter. Chrome, Edge und Firefox lassen ein Element aber höchstens
 * etwa 16,7 Millionen Pixel hoch werden (2^24 - 1 = 16.777.215 in Chrome, gemessen am 31.10.2026 mit 1,5 Millionen Zeilen: die Tabelle ließ sich nur bis Zeile 645.287 scrollen).
 * Darüber wird die Höhe gedeckelt und die Bildlaufleiste auf die Zeilen umgerechnet. */
const CHROME_MAX = 16_777_215;
const ZEILE = 26, HOEHE = 648;

describe('Höhe der Datentabelle bei sehr vielen Zeilen', () => {
  it('bis zur Grenze unverändert: Höhe = Zeilen × Zeilenhöhe, Faktor 1, Zeile = Bildlauf / Zeilenhöhe', () => {
    const a = rasterAbbildung(500_000, ZEILE, HOEHE);
    expect(a.skaliert).toBe(false); expect(a.gesamt).toBe(500_000 * ZEILE); expect(a.faktor).toBe(1);
    expect(ersteZeile(2600, a)).toBe(100); expect(obenFuerZeile(100, a)).toBe(2600);
  });
  it('die Höhe liegt nie über der Grenze der Browser, auch bei 1 Million und 1,5 Millionen Zeilen und bei 200 % (Zeilenhöhe 52)', () => {
    for (const [n, z] of [[1_000_000, 26], [1_500_000, 26], [1_000_000, 52], [2_000_000, 13]] as const) {
      const a = rasterAbbildung(n, z, HOEHE);
      expect(a.gesamt, `${n} Zeilen à ${z} px`).toBeLessThanOrEqual(CHROME_MAX); expect(HOEHE_MAX).toBeLessThan(CHROME_MAX);
    }
  });
  it('ganz unten ist die letzte Zeile sichtbar, ganz oben die erste', () => {
    for (const [n, z] of [[1_000_000, 26], [1_500_000, 26], [1_000_000, 52]] as const) {
      const a = rasterAbbildung(n, z, HOEHE);
      expect(a.skaliert).toBe(true);
      expect(ersteZeile(0, a)).toBe(0);
      const untenOben = a.gesamt - HOEHE;                       // größter möglicher Bildlauf
      const erste = ersteZeile(untenOben, a), sichtbar = Math.ceil(HOEHE / z);
      expect(erste + sichtbar, `${n} Zeilen à ${z} px`).toBeGreaterThanOrEqual(n);
      expect(erste).toBeLessThan(n);
    }
  });
  it('der Bildlauf ist wachsend (keine Zeile wird zurückgespult) und obenFuerZeile kehrt ersteZeile um, auf eine Zeile genau', () => {
    const a = rasterAbbildung(1_500_000, ZEILE, HOEHE);
    let vor = -1;
    for (let o = 0; o <= a.gesamt - HOEHE; o += 99_991) { const e = ersteZeile(o, a); expect(e).toBeGreaterThanOrEqual(vor); vor = e; }
    for (const r of [0, 1, 1234, 645_287, 700_000, 1_499_000]) expect(Math.abs(ersteZeile(obenFuerZeile(r, a), a) - r)).toBeLessThanOrEqual(1);
  });
  it('Zeilen, die vorher nicht erreichbar waren (nach Zeile 645.287), sind es jetzt', () => {
    const a = rasterAbbildung(1_000_000, ZEILE, HOEHE);
    expect(ersteZeile(obenFuerZeile(800_000, a), a)).toBeGreaterThan(645_287);
    expect(obenFuerZeile(800_000, a) + HOEHE).toBeLessThanOrEqual(a.gesamt);
  });
  it('keine Zeilen und eine Zeile rechnen nicht ins Leere', () => {
    expect(rasterAbbildung(0, ZEILE, HOEHE).gesamt).toBe(0);
    expect(ersteZeile(0, rasterAbbildung(1, ZEILE, HOEHE))).toBe(0);
  });
});
