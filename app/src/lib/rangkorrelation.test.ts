import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import { kendall, kendallS, raenge, spearman } from './rangkorrelation';
import { nodeEngine } from './testengine';
import { finde } from './tabelle';
import { saetzeZusammenhang, zusammenhang, zusammenhangMit } from './ergebnis';
import { empfohleneKorrelation, korrelationsGrundText, type Ctx } from './verfahren';

const csv = readFileSync(new URL('./testdaten/schlaf-und-konzentration.csv', import.meta.url), 'utf8').trim().split('\n').map(z => z.split(';'));
const kopf = csv[0]!;
const zelle = (z: string[], n: string) => { const t = z[kopf.indexOf(n)]!.trim(); return t === '' ? NaN : Number(t.replace(',', '.')); };
const paare = (a: string, b: string): [number, number][] => csv.slice(1).map(z => [zelle(z, a), zelle(z, b)] as [number, number]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
const rund = (v: number, s = 4) => Number(v.toFixed(s));

describe('Ränge', () => {
  it('Bindungen bekommen den mittleren Rang', () => { expect(raenge([10, 20, 20, 5])).toEqual([2, 3.5, 3.5, 1]); });
});

/* Vergleichswerte aus R 4.x: cor.test(a, b, method = "spearman"/"kendall", exact = FALSE) auf schlaf-und-konzentration.csv (99 = fehlend).
 * Bereiche: R-Rechnung derselben Formeln (Spearman Bonett-Wright, Kendall Fieller) mit atanh/tanh und qnorm(.975).
 * Skript: scripts/rangkorrelation-erwartet.R. Leere Zellen der Datei zählen als fehlend.
 * Hinweis: R rechnet ohne Bindungen standardmäßig exakt (Spearman: AS 89, Kendall: exakte Verteilung); Statable nimmt wie SPSS die Näherung - darum exact = FALSE. */
describe('Spearman und Kendall gegen R', () => {
  const faelle = [
    ['kaffee_tassen', 'konzentration', 120, { r: -0.121796, p: 0.185111, lo: -0.295218, hi: 0.059396 }, { r: -0.092849, p: 0.178139, lo: -0.210234, hi: 0.027174 }],
    ['schlaf_stunden', 'konzentration', 115, { r: 0.225938, p: 0.015186, lo: 0.042331, hi: 0.394782 }, { r: 0.148282, p: 0.021864, lo: 0.026399, hi: 0.265821 }],
    ['alter', 'semester', 120, { r: 0.313525, p: 0.000489, lo: 0.137966, hi: 0.469983 }, { r: 0.256423, p: 0.000588, lo: 0.141031, hi: 0.364941 }]
  ] as const;
  for (const [a, b, n, sp, ke] of faelle) {
    it(`${a} ~ ${b}`, () => {
      const s = spearman(paare(a, b)), k = kendall(paare(a, b));
      expect(s.n).toBe(n); expect(k.n).toBe(n);
      expect([rund(s.r, 6), rund(s.p, 6), rund(s.kiLo, 6), rund(s.kiHi, 6)]).toEqual([sp.r, sp.p, sp.lo, sp.hi]);
      expect([rund(k.r, 6), rund(k.p, 6), rund(k.kiLo, 6), rund(k.kiHi, 6)]).toEqual([ke.r, ke.p, ke.lo, ke.hi]);
    });
  }
  it('ohne Bindungen: Spearman/Kendall = ±1 bei gleichem Gang', () => {
    const p: [number, number][] = [[1, 10], [2, 20], [3, 30], [4, 40], [5, 50], [6, 60]];
    expect(spearman(p).r).toBeCloseTo(1, 12); expect(kendall(p).r).toBeCloseTo(1, 12); expect(spearman(p).p).toBeCloseTo(2 / 720, 12); expect(kendall(p).p).toBeCloseTo(2 / 720, 12);   // exakt, R: cor.test(1:6, 1:6) = 0,002778
  });
});

/* Gegenprobe mit der Engine: Spearman = Pearson der Ränge (RANK + CORRELATIONS), Kendall = CROSSTABS BTAU (Wert und Approx. T). */
describe('Spearman und Kendall gegen PSPP', () => {
  let e: Awaited<ReturnType<typeof nodeEngine>>;
  beforeAll(async () => { e = await nodeEngine(); const b = zurEngine(leseCsv(readFileSync(new URL('./testdaten/schlaf-und-konzentration.csv', import.meta.url), 'utf8'))); e.run(b.syntax, { '/import.csv': b.csv }); });
  it('kaffee_tassen ~ konzentration', () => {
    e.run('DATASET COPY rk.\nDATASET ACTIVATE rk.');
    const r = e.run('RANK VARIABLES=kaffee_tassen konzentration (A) /RANK INTO rx ry /TIES=MEAN.\nCORRELATIONS /VARIABLES=rx ry /PRINT=TWOTAIL.\nCROSSTABS /TABLES=kaffee_tassen BY konzentration /FORMAT=NOTABLES /STATISTICS=BTAU.');
    const c = finde(r, /^Correlations$/)!, sm = finde(r, /^Symmetric Measures$/)!;
    const rho = c.n[c.t.findIndex(z => z.some(x => /Pearson/.test(x)))]!.find(v => v !== undefined && v < 0.99)!;
    const tau = sm.n.flat().find(v => v !== undefined && Math.abs(v) < 0.5 && Math.abs(v) > 0.05)!;
    const s = spearman(paare('kaffee_tassen', 'konzentration')), k = kendall(paare('kaffee_tassen', 'konzentration'));
    expect(rund(s.r, 3)).toBe(rund(rho, 3));
    expect(rund(k.r, 2)).toBe(rund(tau, 2));
  });
});

describe('Satz und Umschalten im Blatt', () => {
  let e: Awaited<ReturnType<typeof nodeEngine>>;
  beforeAll(async () => { e = await nodeEngine(); const b = zurEngine(leseCsv(readFileSync(new URL('./testdaten/schlaf-und-konzentration.csv', import.meta.url), 'utf8'))); e.run(b.syntax, { '/import.csv': b.csv }); });
  it('Spearman vorgewählt, Kendall und Pearson per Umschalten; Zahlen wie R', () => {
    const items = e.run('CORRELATIONS /VARIABLES=kaffee_tassen konzentration\n  /PRINT=TWOTAIL.');
    const z = zusammenhang(items, 'kaffee_tassen', 'konzentration', paare('kaffee_tassen', 'konzentration'), 'spearman', { art: 'stufen', spalten: ['kaffee_tassen'], stufen: 5 });
    expect(z.methode).toBe('spearman');
    const name = (n: string) => n;
    expect(saetzeZusammenhang(z, name).apa).toBe('rs(118) = −,12, p = ,185, 95 %-KI [−,30; ,06]');
    expect(saetzeZusammenhang(z, name).zusatz).toContain('schwach (rs = −,12)');
    expect(saetzeZusammenhang(z, name).marken[0]!.text).toBe('Zusammenhang: schwach · rs = −,12');
    const k = zusammenhangMit(z, 'kendall');
    expect(saetzeZusammenhang(k, name).apa).toBe('τb = −,09, p = ,178, n = 120, 95 %-KI [−,21; ,03]');
    const pe = zusammenhangMit(k, 'pearson');
    expect(saetzeZusammenhang(pe, name).apa).toBe('r(118) = −,14, p = ,132, 95 %-KI [−,31; ,04]');
    expect(zusammenhangMit(z, 'pearson').alle).toBe(z.alle);
  });
  it('Vorschlag: Spearman bei ordinal oder höchstens 7 Werten, sonst Pearson', () => {
    const c = (verschieden: Record<string, number>, ordinal: string[] = []): Ctx => ({ verschieden: n => verschieden[n]!, gueltig: () => 100, istZahl: () => true, ordinal: n => ordinal.includes(n) });
    expect(empfohleneKorrelation('a', 'b', c({ a: 30, b: 40 }))).toEqual({ methode: 'pearson', grund: { art: 'metrisch', spalten: ['a', 'b'] } });
    expect(empfohleneKorrelation('a', 'b', c({ a: 30, b: 7 })).methode).toBe('spearman');
    expect(empfohleneKorrelation('a', 'b', c({ a: 30, b: 8 })).methode).toBe('pearson');
    const o = empfohleneKorrelation('a', 'b', c({ a: 30, b: 40 }, ['b']));
    expect(o).toEqual({ methode: 'spearman', grund: { art: 'ordinal', spalten: ['b'] } });
    expect(korrelationsGrundText(o.grund, 'spearman')).toBe('Statable schlägt Spearman vor, weil „b“ ordinal ist.');
  });
});

/* Abschlusstest A2: Kendall in O(n log n). Gleiche Zahl wie die doppelte Schleife (mit Bindungen in x, y und beiden), und bei 100.000 Zeilen kein Stillstand. */
describe('Kendall schnell (A2)', () => {
  const brute = (p: [number, number][]) => { let S = 0; for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) S += Math.sign(p[i]![0] - p[j]![0]) * Math.sign(p[i]![1] - p[j]![1]); return S; };
  const zufall = (seed: number) => () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  it('S gleich der doppelten Schleife: viele Bindungen, wenige, keine, ein Wert, n = 0 bis 3', () => {
    for (const [n, stufen] of [[0, 5], [1, 5], [2, 5], [3, 5], [10, 3], [37, 4], [60, 8], [200, 12], [500, 1000], [500, 2], [300, 1]] as const) {
      const z = zufall(n * 31 + stufen);
      const p = Array.from({ length: n }, () => [Math.floor(z() * stufen) / 2, Math.floor(z() * stufen)] as [number, number]);
      expect(kendallS(p)).toBe(brute(p));
    }
  });
  it('100.000 Paare mit einer Dezimalstelle: unter 1,5 s (vorher 6 s), τb im Bereich', () => {
    const z = zufall(7), n = 100000;
    const p = Array.from({ length: n }, () => { const a = z() * 40 + 20; return [Math.round(a * 10) / 10, Math.round((a * 0.5 + z() * 30) * 10) / 10] as [number, number]; });
    const t0 = performance.now(), k = kendall(p), ms = performance.now() - t0;
    expect(ms).toBeLessThan(1500);
    expect(k.r).toBeGreaterThan(0.1); expect(k.r).toBeLessThan(0.6); expect(k.p).toBeLessThan(0.001);
  });
});
