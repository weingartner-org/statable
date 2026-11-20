import { describe, it, expect } from 'vitest';
import { anhaengen, VERLAUF_MAX_SCHRITTE, type Schritt } from './verlauf';

const schritt = (n: number, bytes = 10): Schritt => ({ text: `Schritt ${n}`, sav: new Uint8Array(bytes), entscheid: {} });

describe('Verlauf: Grenzen für Rückgängig und Wiederholen', () => {
  it('hält bis zu 100 Schritte (vorher 30) und wirft den ältesten weg', () => {
    let l: Schritt[] = [];
    for (let i = 1; i <= 130; i++) l = anhaengen(l, schritt(i));
    expect(VERLAUF_MAX_SCHRITTE).toBe(100);
    expect(l).toHaveLength(100);
    expect(l[0]!.text).toBe('Schritt 31');
    expect(l.at(-1)!.text).toBe('Schritt 130');
  });
  it('große Tabellen: die Byte-Grenze wirft ältere Schritte früher weg, der jüngste bleibt immer', () => {
    let l: Schritt[] = [];
    for (let i = 1; i <= 10; i++) l = anhaengen(l, schritt(i, 400), 100, 1000);
    expect(l.map(x => x.text)).toEqual(['Schritt 9', 'Schritt 10']);
    const riesig = anhaengen([schritt(1, 10)], schritt(2, 5000), 100, 1000);
    expect(riesig.map(x => x.text)).toEqual(['Schritt 2']);
  });
  it('verändert die übergebene Liste nicht', () => {
    const l = [schritt(1)];
    anhaengen(l, schritt(2));
    expect(l).toHaveLength(1);
  });
});
