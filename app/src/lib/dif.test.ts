import { describe, expect, it } from 'vitest';
import { dif } from './dif';
import DATEN from './dif-daten.csv?raw';

/* Sollwerte: R `mantelhaen.test(table(Gruppe, Antwort, Gesamtwert), correct = TRUE)` je Aufgabe auf dif-daten.csv (500 Personen, 8 Aufgaben, Gruppe 0/1; Aufgabe 3 hat eingebauten DIF). */
const REF = [[1.0663422212, 0.03509021994, 0.8514067345], [0.8432416531, 0.39099032843, 0.5317793020], [2.1911051824, 11.61253008447, 0.00065508976], [0.8064960378, 0.85252083514, 0.3558401825],
  [0.8978030881, 0.15899035098, 0.6900877820], [1.0871725984, 0.03847144071, 0.8444995092], [1.3459585297, 1.52602752477, 0.2167096229], [0.3920473415, 11.91775077282, 0.00055601576]];
const z = DATEN.trim().split('\n').slice(1).map(r => r.split(',').map(Number));
const x = z.map(r => r.slice(0, 8)), fokus = z.map(r => r[8] === 1);

describe('DIF nach Mantel-Haenszel gegen R', () => {
  it('Odds Ratio, χ² und p je Aufgabe', () => {
    const e = dif(x, fokus);
    if ('fehler' in e) throw new Error(e.fehler);
    e.aufgaben.forEach((a, j) => { expect(a.orMH).toBeCloseTo(REF[j]![0]!, 6); expect(a.chi2).toBeCloseTo(REF[j]![1]!, 6); expect(a.p).toBeCloseTo(REF[j]![2]!, 6); });
    expect(e.aufgaben[2]!.klasse).not.toBe('A'); expect(e.aufgaben[0]!.klasse).toBe('A');
    expect(e.aufgaben[2]!.delta!).toBeCloseTo(-2.35 * Math.log(REF[2]![0]!), 8);
  });
  it('Fehlerfälle', () => {
    expect(dif(x.map(r => r.slice(0, 2)), fokus)).toEqual({ fehler: 'zu-wenig-aufgaben' });
    expect(dif(x, fokus.map(() => false))).toEqual({ fehler: 'eine-gruppe' });
    expect(dif(x.slice(0, 30), fokus.slice(0, 30))).toEqual({ fehler: 'zu-wenig-personen' });
    expect(dif(x.map(r => [r[0]! + 1, r[1]!, r[2]!]), fokus)).toEqual({ fehler: 'werte' });
  });
});
