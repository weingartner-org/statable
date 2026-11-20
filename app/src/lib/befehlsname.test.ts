import { describe, expect, it } from 'vitest';
import { befehlsInhalt, befehlsTitel, naechsteNummer } from './befehlsname';

const de = (d: string) => d, en = (_d: string, e: string) => e;

describe('Reiter-Name aus dem Befehl', () => {
  it('Häufigkeiten mit Spalte', () => expect(befehlsInhalt('FREQUENCIES /VARIABLES=alter.', de)).toBe('Häufigkeiten alter'));
  it('Spalten ohne /VARIABLES', () => expect(befehlsInhalt('DESCRIPTIVES alter note.', de)).toBe('Kennwerte alter, note'));
  it('mehr als drei Spalten werden gekürzt', () => expect(befehlsInhalt('DESCRIPTIVES /VARIABLES=a b c d e.', de)).toBe('Kennwerte a, b, c …'));
  it('Kreuztabelle mit BY', () => expect(befehlsInhalt('CROSSTABS /TABLES=geschlecht BY note.', de)).toBe('Kreuztabelle geschlecht, note'));
  it('Datenänderungen zählen nicht', () => expect(befehlsInhalt('COMPUTE x = a + b.\nFREQUENCIES /VARIABLES=x.', de)).toBe('Häufigkeiten x'));
  it('mehrere Auswertungen', () => expect(befehlsInhalt('FREQUENCIES /VARIABLES=a.\nDESCRIPTIVES /VARIABLES=b.', de)).toBe('Häufigkeiten a (+1)'));
  it('nur Datenänderung: leer', () => expect(befehlsInhalt('RECODE a (1=2).', de)).toBe(''));
  it('englisch', () => expect(befehlsInhalt('T-TEST GROUPS=g(1,2) /VARIABLES=y.', en)).toBe('t test g, y'));
  it('unbekannter Befehl', () => expect(befehlsInhalt('RMV /x=SMEAN(a).', de)).toBe('Rmv'));
  it('Nummer zählt weiter', () => {
    expect(naechsteNummer(['Daten', 'Befehl 1: A', 'Befehl 3'], de)).toBe(4);
    expect(befehlsTitel('FREQUENCIES /VARIABLES=alter.', ['Befehl 1: Häufigkeiten alter'], de)).toBe('Befehl 2: Häufigkeiten alter');
  });
});
