import { describe, it, expect } from 'vitest';
import { toene, type TabelleDe } from './export';
import { tonHex, tonFett, type Ansicht } from './tabellenfarben';

const zelle = (t: string, zahl = false): TabelleDe['zeilen'][number][number] => ({ t, kopf: !zahl, span: 1, zahl });
const tabelle = () => [
  [zelle(''), zelle(''), zelle('männlich'), zelle('Gesamt')],
  [zelle('sehr selten'), zelle('Beobachtet'), zelle('1', true), zelle('9', true)],
  [zelle(''), zelle('Erwartet'), zelle('1,10', true), zelle('9,00', true)],
  [zelle('oft'), zelle('Beobachtet'), zelle('10', true), zelle('87', true)],
  [zelle('Gesamt'), zelle('Beobachtet'), zelle('24', true), zelle('196', true)]
];

describe('Farbige Ansicht der Tabellen (09.10.)', () => {
  it('Bereiche aus der ersten Spalte, Gesamt-Zeile und -Spalte erkannt', () => {
    const z = tabelle(); toene(z, 1, 'c');
    expect(z[1]![2]!.ton).toMatchObject({ gruppe: 0, n: 2, gesamtZeile: false, gesamtSpalte: false });
    expect(z[2]![2]!.ton).toMatchObject({ gruppe: 0 });          // „Erwartet“ gehört noch zu „sehr selten“
    expect(z[3]![2]!.ton).toMatchObject({ gruppe: 1 });
    expect(z[4]![2]!.ton).toMatchObject({ gesamtZeile: true });
    expect(z[1]![3]!.ton).toMatchObject({ gesamtSpalte: true });
    expect(z[0]![3]!.ton).toMatchObject({ gesamtSpalte: true, kopf: true });
  });
  it('Abstufung wird dunkler, Gesamt hat eigenen Ton, fette Zahlen; „Ohne Farbe“ bleibt weiß und normal', () => {
    const farbe = (a: Ansicht) => { const z = tabelle(); toene(z, 1, a); return z; };
    const c = farbe('c'), hell = parseInt(tonHex(c[1]![2]!.ton)!.slice(0, 2), 16), dunkler = parseInt(tonHex(c[3]![2]!.ton)!.slice(0, 2), 16);
    expect(dunkler).toBeLessThan(hell);
    expect(tonHex(c[4]![2]!.ton)).not.toBe(tonHex(c[3]![2]!.ton));
    expect(tonFett(c[4]![2]!.ton)).toBe(true);
    const aus = farbe('aus');
    expect(aus.flat().map(x => tonHex(x.ton))).toEqual(aus.flat().map(() => null));
    expect(tonFett(aus[4]![2]!.ton)).toBe(false);
    const b = farbe('b');
    expect(tonHex(b[3]![2]!.ton)).toBeNull();                     // zweiter Bereich: Papier
  });
});
