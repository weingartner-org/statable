import { describe, it, expect } from 'vitest';
import { SEITE, seitenZahl, seiteVonZeile, klemmeSeite, zeilenBereich, leseZeilenNummer } from './datenseiten';

describe('Seiten des Lesemodus', () => {
  it('50 Zeilen je Seite', () => { expect(SEITE).toBe(50); });
  it('Seitenzahl', () => {
    expect(seitenZahl(0)).toBe(1);
    expect(seitenZahl(50)).toBe(1);
    expect(seitenZahl(51)).toBe(2);
    expect(seitenZahl(6000)).toBe(120);
  });
  it('Seite einer Zeile (ab 0)', () => {
    expect(seiteVonZeile(0)).toBe(0);
    expect(seiteVonZeile(49)).toBe(0);
    expect(seiteVonZeile(50)).toBe(1);
    expect(seiteVonZeile(5999)).toBe(119);
  });
  it('Seite wird in den Bereich geklemmt', () => {
    expect(klemmeSeite(-3, 120)).toBe(0);
    expect(klemmeSeite(99, 120)).toBe(2);
    expect(klemmeSeite(Number.NaN, 120)).toBe(0);
  });
  it('Bereich für die Ansage: „Seite 3 von 120, Zeilen 101 bis 150“', () => {
    expect(zeilenBereich(2, 6000)).toEqual({ von: 101, bis: 150 });
    expect(zeilenBereich(1, 60)).toEqual({ von: 51, bis: 60 });
    expect(zeilenBereich(0, 0)).toEqual({ von: 0, bis: 0 });
  });
  it('„Gehe zu Zeile“ nimmt nur ganze Zahlen im Bereich', () => {
    expect(leseZeilenNummer('120', 6000)).toBe(119);
    expect(leseZeilenNummer(' 1 ', 6000)).toBe(0);
    expect(leseZeilenNummer('0', 6000)).toBeNull();
    expect(leseZeilenNummer('6001', 6000)).toBeNull();
    expect(leseZeilenNummer('12,5', 6000)).toBeNull();
    expect(leseZeilenNummer('', 6000)).toBeNull();
    expect(leseZeilenNummer('abc', 6000)).toBeNull();
  });
});
