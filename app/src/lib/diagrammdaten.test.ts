import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { achsenBereich, boxStat, fivenum, histogramm, normalHoehe, ppoints, pretty, qnorm, qqnorm, reste, zeilenAnteile } from './diagrammdaten';

/* Vergleichswerte aus R 4.6 (scripts/diagramme-erwartet.R): hist() mit Sturges, boxplot.stats, pretty, lm, qqnorm/qqline, qnorm, ppoints.
 * Daten: testdaten/schlaf-und-konzentration.csv (120 Personen, einige Lücken). */
const zeilen = readFileSync(new URL('./testdaten/schlaf-und-konzentration.csv', import.meta.url), 'utf8').trim().split('\n').map(z => z.split(';'));
const kopf = zeilen[0]!;
const spalte = (n: string) => zeilen.slice(1).map(z => { const v = z[kopf.indexOf(n)]!.replace(',', '.'); return v === '' ? null : Number(v); });
const zahlen = (n: string) => spalte(n).filter((v): v is number => v !== null);
const f = (v: number[], s = 6) => v.map(x => Number(x.toFixed(s)));

describe('pretty() wie R', () => {
  it.each([
    [0, 1, [0, 0.2, 0.4, 0.6, 0.8, 1]],
    [3.2, 97.5, [0, 20, 40, 60, 80, 100]],
    [-2.3, 4.1, [-3, -2, -1, 0, 1, 2, 3, 4, 5]],
    [100, 100.5, [100, 100.1, 100.2, 100.3, 100.4, 100.5]],
    [5, 5, [0, 5]],
    [0.0012, 0.0097, [0, 0.002, 0.004, 0.006, 0.008, 0.01]],
    [18, 54, [10, 20, 30, 40, 50, 60]],
    [1.5, 6.5, [1, 2, 3, 4, 5, 6, 7]]
  ])('pretty(c(%s, %s), n = 5, min.n = 1)', (lo, hi, erwartet) => { expect(pretty(lo as number, hi as number, 5, 1)).toEqual(erwartet); });
});

describe('Histogramm wie R hist()', () => {
  it('Konzentration: Sturges 8 → Grenzen 0 bis 90, Zählung, Mittelwert und SD', () => {
    const h = histogramm(zahlen('konzentration'))!;
    expect(h.grenzen).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(h.anzahl).toEqual([1, 0, 2, 4, 31, 38, 31, 10, 3]);
    expect([h.n, +h.mittel.toFixed(6), +h.sd.toFixed(6)]).toEqual([120, 56.358333, 12.377667]);
  });
  it('Schlaf (mit Lücken): Halbe-Stunden-Klassen', () => {
    const h = histogramm(zahlen('schlaf_stunden'))!;
    expect(h.grenzen).toEqual([5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5]);
    expect(h.anzahl).toEqual([7, 13, 24, 24, 20, 17, 8, 0, 2]);
    expect([h.n, +h.mittel.toFixed(6), +h.sd.toFixed(6)]).toEqual([115, 6.858261, 0.878893]);
  });
  it('Alter: ganze Jahre, Wert auf der Grenze zählt zur Klasse links davon (rechts abgeschlossen), das Minimum zur ersten', () => {
    const h = histogramm(zahlen('alter'))!;
    expect(h.grenzen).toEqual([18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]);
    expect(h.anzahl).toEqual([29, 22, 24, 21, 9, 6, 4, 2, 1, 2]);
  });
  it('Kaffee: leere Klassen bleiben stehen', () => {
    const h = histogramm(zahlen('kaffee_tassen'))!;
    expect(h.grenzen).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
    expect(h.anzahl).toEqual([14, 30, 0, 45, 0, 20, 0, 9, 0, 2]);
  });
  it('Normalverteilungskurve ist in Personen je Klasse: n · Breite · Dichte', () => {
    const h = histogramm(zahlen('konzentration'))!;
    expect(normalHoehe(h, h.mittel)).toBeCloseTo(120 * 10 / (12.377667 * Math.sqrt(2 * Math.PI)), 4);
  });
  it('zu wenige Werte: kein Histogramm', () => { expect(histogramm([3])).toBeNull(); });
});

describe('Boxplot wie R boxplot.stats()', () => {
  it.each([
    ['konzentration', [26, 49, 56, 66, 88], [9]],
    ['schlaf_stunden', [5, 6.2, 6.8, 7.5, 9.1], [9.5]],
    ['alter', [18, 20, 21, 22, 25], [26, 26, 27, 28, 28]],
    ['kaffee_tassen', [0, 1, 2, 3, 5], []]
  ])('%s', (n, stats, aus) => {
    const b = boxStat(zahlen(n))!;
    expect([b.unten, b.q1, b.median, b.q3, b.oben]).toEqual(stats);
    expect(b.ausreisser).toEqual(aus);
  });
  it('fivenum: Hinges bei gerader und ungerader Anzahl', () => {
    expect(fivenum([1, 2, 3, 4, 5, 6])).toEqual([1, 2, 3.5, 5, 6]);
    expect(fivenum([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('Normalverteilung wie R', () => {
  it('qnorm', () => {
    const p = [0.001, 0.025, 0.3, 0.5, 0.975, 0.9999];
    expect(p.map(qnorm).map(v => +v.toFixed(10))).toEqual([-3.0902323062, -1.9599639845, -0.5244005127, 0, 1.9599639845, 3.7190164855]);
  });
  it('ppoints', () => {
    expect(f(ppoints(7))).toEqual([0.086207, 0.224138, 0.362069, 0.5, 0.637931, 0.775862, 0.913793]);
    expect(f(ppoints(12))).toEqual([0.041667, 0.125, 0.208333, 0.291667, 0.375, 0.458333, 0.541667, 0.625, 0.708333, 0.791667, 0.875, 0.958333]);
  });
});

describe('Regression: vorhergesagte Werte, Reste, Q-Q wie R lm/qqnorm/qqline', () => {
  // lm(konzentration ~ alter + schlaf_stunden + kaffee_tassen); Koeffizienten (ohne Konstante) aus R
  const B = [0.42083246, 2.39241668, -1.09920391];
  const daten = zeilen.slice(1).map((_, i) => ['konzentration', 'alter', 'schlaf_stunden', 'kaffee_tassen'].map(n => spalte(n)[i]!));
  const r = reste(daten, B)!;
  it('fallweiser Ausschluss: 115 vollständige Fälle; Konstante wie R (33,58631448)', () => {
    expect(r.n).toBe(115);
    expect(r.konstante).toBeCloseTo(33.58631448, 5);
  });
  it('vorhergesagte Werte und Reste: erste und letzte fünf wie R', () => {
    expect(f(r.vorhergesagt.slice(0, 5), 4)).toEqual([59.8788, 56.2546, 54.0351, 56.5784, 50.7644]);
    expect(f(r.rest.slice(0, 5), 4)).toEqual([6.1212, 11.7454, 2.9649, -3.5784, 8.2356]);
    expect(f(r.vorhergesagt.slice(-5), 4)).toEqual([50.8221, 56.2939, 58.9708, 54.7615, 55.3736]);
    expect(f(r.rest.slice(-5), 4)).toEqual([8.1779, 4.7061, 8.0292, -2.7615, -15.3736]);
  });
  it('Summe der Reste = 0, Summe der Quadrate wie R (16434,775364)', () => {
    expect(r.rest.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 8);
    expect(r.rest.reduce((a, b) => a + b * b, 0)).toBeCloseTo(16434.775364, 3);
  });
  it('Q-Q: kleinste und größte theoretische Quantile, Summe der Quadrate, Linie wie qqline', () => {
    const q = qqnorm(r.rest)!;
    expect(f(q.punkte.slice(0, 3).map(p => p[0]))).toEqual([-2.623793, -2.224915, -2.019086]);
    expect(f(q.punkte.slice(-3).map(p => p[0]))).toEqual([2.019086, 2.224915, 2.623793]);
    expect(q.punkte.reduce((a, p) => a + p[0] ** 2, 0)).toBeCloseTo(113.7284, 4);
    expect(q.steigung).toBeCloseTo(12.00357702, 5);
    expect(q.achsenabschnitt).toBeCloseTo(0.39453087, 5);
  });
  it('Fälle mit Lücke fallen heraus, zu wenige Fälle: nichts', () => {
    expect(reste([[1, 2], [2, null], [3, 4]], [1])).toBeNull();
    expect(reste([[1, 2], [2, 3], [3, 4], [5, 5]], [1])!.n).toBe(4);
  });
});

describe('Kreuztabelle und Achsen', () => {
  it('Zeilenanteile', () => { expect(zeilenAnteile([[1, 3], [0, 0], [2, 2]])).toEqual([[0.25, 0.75], [0, 0], [0.5, 0.5]]); });
  it('Achsenbereich', () => { expect(achsenBereich(3.2, 97.5)).toEqual([0, 100]); });
});
