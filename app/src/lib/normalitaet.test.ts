import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { shapiroWilk } from './normalitaet';

/* Vergleichswerte aus R (scripts/normalitaet-erwartet.R): shapiro.test. Daten der Spalten: testdaten/schlaf-und-konzentration.csv. */
const zeilen = readFileSync(new URL('./testdaten/schlaf-und-konzentration.csv', import.meta.url), 'utf8').trim().split('\n').map(z => z.split(';'));
const kopf = zeilen[0]!;
const zahlen = (n: string) => zeilen.slice(1).map(z => z[kopf.indexOf(n)]!.replace(',', '.')).filter(v => v !== '').map(Number);
const exp60 = [2.3, 3.6, 0.4, 3.3, 3.9, 0.5, 11.9, 6.2, 0.1, 3, 17.3, 3, 3.5, 1, 9.3, 0.6, 4.7, 21.3, 5, 7.1, 6.9, 20, 13.6, 4.2, 1.8, 0.6, 4.2, 10.9, 4.2, 5.3, 10.8, 19.7, 1.1, 0.1, 17.1, 6.4, 6.2, 11, 8.6, 0.1, 10.6, 5.3, 4, 8.5, 4, 1.2, 0.9, 20.7, 3.6, 10.1, 2.9, 3.6, 11, 3.5, 12.6, 2, 6.4, 4, 3.9, 0.9];

describe('Shapiro-Wilk wie R shapiro.test', () => {
  const fall: [string, number[], number, number][] = [
    ['n = 3', [1, 2, 4], 0.96428571, 0.636886845],
    ['n = 4', [2, 3, 5, 9], 0.92020268, 0.5380837773],
    ['n = 5', [1, 2, 3, 4, 10], 0.83578832, 0.1536125838],
    ['n = 7', [2, 4, 4, 5, 7, 9, 15], 0.88624604, 0.2556482878],
    ['n = 11', [3, 5, 6, 6, 7, 8, 9, 10, 12, 15, 30], 0.76594025, 0.003358400398],
    ['n = 12', [3, 5, 6, 6, 7, 8, 9, 10, 12, 15, 30, 31], 0.76844692, 0.004192779262],
    ['mit Bindungen', [1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 5, 5, 6], 0.94491538, 0.4848803902],
    ['exp, n = 60', exp60, 0.86407875, 8.136353234e-06],
    ['Konzentration (n = 120)', zahlen('konzentration'), 0.98181513, 0.1049902687],
    ['Schlaf (n = 115)', zahlen('schlaf_stunden'), 0.98894927, 0.4772400537],
    ['Alter (n = 120, sehr schief)', zahlen('alter'), 0.92135385, 2.888332495e-06],
    ['Kaffee (n = 120)', zahlen('kaffee_tassen'), 0.92068061, 2.638032601e-06]
  ];
  it.each(fall)('%s', (_, x, w, p) => {
    const r = shapiroWilk(x)!;
    expect(r.n).toBe(x.length);
    expect(r.w).toBeCloseTo(w, 6);
    expect(Math.abs(r.p - p) / Math.max(p, 1e-12)).toBeLessThan(1e-5);
  });
  it('rechnet nicht bei weniger als 3 Werten, bei gleichen Werten und über 5000 Werten', () => {
    expect(shapiroWilk([1, 2])).toBeNull();
    expect(shapiroWilk([4, 4, 4, 4])).toBeNull();
    expect(shapiroWilk(Array.from({ length: 5001 }, (_, i) => i))).toBeNull();
  });
});
