import { describe, it, expect } from 'vitest';
import { geheZuZelle, buchstabenSpalte } from './gehezu';

describe('Gehe zu', () => {
  it('eine Zahl ist die Zeile', () => expect(geheZuZelle('5', 100, 8)).toEqual({ zeile: 4, spalte: null }));
  it('zwei Zahlen: Spalte, dann Zeile', () => {
    expect(geheZuZelle('4 5', 100, 8)).toEqual({ zeile: 4, spalte: 3 });
    expect(geheZuZelle('4,5', 100, 8)).toEqual({ zeile: 4, spalte: 3 });
    expect(geheZuZelle('4;  5', 100, 8)).toEqual({ zeile: 4, spalte: 3 });
  });
  it('Buchstabe und Zahl: d5, D5 und „d 5“ sind dieselbe Zelle wie „4 5“', () => {
    const z = geheZuZelle('4 5', 100, 8);
    expect(geheZuZelle('d5', 100, 8)).toEqual(z);
    expect(geheZuZelle('D5', 100, 8)).toEqual(z);
    expect(geheZuZelle('d 5', 100, 8)).toEqual(z);
  });
  it('mehrere Buchstaben wie in Tabellenkalkulationen', () => {
    expect(buchstabenSpalte('Z')).toBe(26);
    expect(buchstabenSpalte('AA')).toBe(27);
    expect(geheZuZelle('AA3', 10, 30)).toEqual({ zeile: 2, spalte: 26 });
  });
  it('Fehler: leer, unlesbar, außerhalb', () => {
    expect(geheZuZelle('  ', 10, 5)).toEqual({ fehler: 'leer' });
    expect(geheZuZelle('abc', 10, 5)).toEqual({ fehler: 'keine-zelle' });
    expect(geheZuZelle('0', 10, 5)).toEqual({ fehler: 'zeile', grenze: 10 });
    expect(geheZuZelle('11', 10, 5)).toEqual({ fehler: 'zeile', grenze: 10 });
    expect(geheZuZelle('6 2', 10, 5)).toEqual({ fehler: 'spalte', grenze: 5 });
    expect(geheZuZelle('f2', 10, 5)).toEqual({ fehler: 'spalte', grenze: 5 });
    expect(geheZuZelle('d99', 10, 5)).toEqual({ fehler: 'zeile', grenze: 10 });
  });
});
