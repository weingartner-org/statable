import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { partialKorrelation, partialPunkte } from './partialkorrelation';

/* Vergleichswerte aus R (scripts/partial-erwartet.R): Korrelation der Reste zweier lm, df = n − 2 − k, Spearman mit Rängen. Daten: testdaten/schlaf-und-konzentration.csv. */
const zeilen = readFileSync(new URL('./testdaten/schlaf-und-konzentration.csv', import.meta.url), 'utf8').trim().split('\n').map(z => z.split(';'));
const kopf = zeilen[0]!;
const daten = (namen: string[]) => zeilen.slice(1).map(z => namen.map(n => { const v = z[kopf.indexOf(n)]!.replace(',', '.'); return v === '' ? null : Number(v); }));

describe('Partialkorrelation wie R', () => {
  const fall: [string, string[], 'pearson' | 'spearman', number, number, number, number, number, number][] = [
    ['Konzentration ~ Schlaf | Alter', ['konzentration', 'schlaf_stunden', 'alter'], 'pearson', 112, 0.19669708, 0.03594559144, 0.01326203, 0.36732376, 0.19251995],
    ['… | Alter + Kaffee', ['konzentration', 'schlaf_stunden', 'alter', 'kaffee_tassen'], 'pearson', 111, 0.16686544, 0.07731387905, -0.01843256, 0.34108143, 0.19251995],
    ['Konzentration ~ Kaffee | Schlaf + Alter + Semester', ['konzentration', 'kaffee_tassen', 'schlaf_stunden', 'alter', 'semester'], 'pearson', 110, -0.10405807, 0.2748946322, -0.28412774, 0.08310229, -0.14612165],
    ['Spearman | Alter', ['konzentration', 'schlaf_stunden', 'alter'], 'spearman', 112, 0.2283119, 0.01455768011, 0.04393926, 0.39764463, 0.22593753],
    ['Spearman | Alter + Kaffee', ['konzentration', 'schlaf_stunden', 'alter', 'kaffee_tassen'], 'spearman', 111, 0.2019154, 0.03197949415, 0.01595687, 0.37437268, 0.22593753],
    ['Spearman | Schlaf + Alter + Semester', ['konzentration', 'kaffee_tassen', 'schlaf_stunden', 'alter', 'semester'], 'spearman', 110, -0.08253559, 0.3869548624, -0.26434463, 0.1049384, -0.13369956]
  ];
  it.each(fall)('%s', (_, namen, art, df, r, p, lo, hi, einfach) => {
    const e = partialKorrelation(daten(namen), art)!;
    expect(e.df).toBe(df);
    expect(e.partial.n).toBe(df + 2 + e.k);
    expect(e.partial.r).toBeCloseTo(r, 6);
    expect(e.partial.p).toBeCloseTo(p, 6);
    expect(e.partial.kiLo).toBeCloseTo(lo, 6);
    expect(e.partial.kiHi).toBeCloseTo(hi, 6);
    expect(e.einfach.r).toBeCloseTo(einfach, 6);
  });
  it('Punkte für das Streudiagramm: ihre Korrelation ist die Partialkorrelation', () => {
    const z = daten(['konzentration', 'schlaf_stunden', 'alter']), pk = partialPunkte(z)!;
    const n = pk.length, mx = pk.reduce((a, p) => a + p[0], 0) / n, my = pk.reduce((a, p) => a + p[1], 0) / n;
    const r = pk.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / Math.sqrt(pk.reduce((a, p) => a + (p[0] - mx) ** 2, 0) * pk.reduce((a, p) => a + (p[1] - my) ** 2, 0));
    expect(n).toBe(115);
    expect(r).toBeCloseTo(0.19669708, 6);
  });
  it('rechnet nicht bei zu wenigen Personen, ohne Streuung und bei Kontrollspalte gleich x', () => {
    expect(partialKorrelation([[1, 2, 3], [2, 3, 5], [3, 5, 4]])).toBeNull();
    expect(partialKorrelation(Array.from({ length: 20 }, (_, i) => [i, 5, i % 3]))).toBeNull();
    expect(partialKorrelation(Array.from({ length: 20 }, (_, i) => [i, i * i % 7, i]))).toBeNull();
  });
});
