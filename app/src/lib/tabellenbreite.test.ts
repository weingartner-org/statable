/** Prüfung G8: breite Tabellen in Word und PDF brechen kein Wort und keine Zahl mehr um. */
import { describe, expect, it } from 'vitest';
import { arialBreite, breitenVerteilen, spaltenMinimum, waehleStufe, type MessZelle } from './tabellenbreite';

const k = (t: string, zahl = false): MessZelle => ({ t, span: 1, zahl });
// Die Tabelle aus der Prüfung: „Deskriptive Statistiken“ mit 9 Spalten
const kopf = ['Semester', 'n', 'Mittelwert', 'Standardabweichung', 'Standardfehler', 'Minimum', 'Maximum', 'Untere Grenze', 'Obere Grenze'].map(t => k(t));
const zeile = ['Gesamt', '120', '−7,64', '12,31', '1,12', '−40,0', '30,5', '−9,86', '−5,42'].map((t, i) => k(t, i > 0));
const tabelle = [kopf, zeile];
const TWIPS = 9000;
const messen = (t: string, pt: number) => arialBreite(t) * pt * 20 * 1.06;

describe('Tabellenbreite (G8)', () => {
  it('Mindestbreite je Spalte = längstes Wort, bei Zahlen der ganze Text', () => {
    const min = spaltenMinimum([[k('Untere Grenze'), k('100,0 %', true)]], t => t.length * 100, 0);
    expect(min[0]).toBe(600);   // „Untere“ und „Grenze“: je 6 Zeichen, nicht 13
    expect(min[1]).toBe('100,0 %'.length * 100);
  });
  it('neun Spalten mit langen Wörtern: bei 10 Punkt reicht die Seite nicht, die Schrift wird kleiner und passt', () => {
    const r = waehleStufe(tabelle, messen, [{ schrift: 10, polster: 216 }, { schrift: 9, polster: 160 }, { schrift: 8, polster: 120 }, { schrift: 7.5, polster: 100 }, { schrift: 7, polster: 80 }], TWIPS);
    expect(r.passt).toBe(true);
    expect(r.stufe.schrift).toBeLessThan(10);
    expect(r.min.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(TWIPS);
  });
  it('schmale Tabelle bleibt bei der größten Schrift', () => {
    const r = waehleStufe([[k('Gruppe'), k('Mittelwert')], [k('A'), k('3,1', true)]], messen, [{ schrift: 10, polster: 216 }, { schrift: 9, polster: 160 }], TWIPS);
    expect(r.stufe.schrift).toBe(10);
  });
  it('Breiten: zu schmale Spalten wachsen auf ihr Minimum, die Summe bleibt in der Seite', () => {
    const wunsch = [2000, 700, 700, 700, 700, 700, 700, 700, 700];
    const min = [900, 300, 1300, 1700, 1300, 800, 800, 800, 800];
    const b = breitenVerteilen(wunsch, min, TWIPS);
    b.forEach((w, i) => expect(w).toBeGreaterThanOrEqual(min[i]! - 1e-9));
    expect(b.reduce((a, c) => a + c, 0)).toBeLessThanOrEqual(TWIPS + 1e-6);
  });
  it('Spalten mit Spannweite (Kopf über mehreren Spalten) zählen nicht für die Mindestbreite', () => {
    const min = spaltenMinimum([[{ t: 'Ein sehr langes Kopfwort', span: 2 }], [k('a'), k('b')]], t => t.length, 0);
    expect(min).toEqual([1, 1]);
  });
});
