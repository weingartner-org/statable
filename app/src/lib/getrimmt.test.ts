import { describe, expect, it } from 'vitest';
import { csv, nah, soll3 } from './testdaten/field3';
import { hochberg, lincon, t1way, trimMittel, winsorWilcox, winsorisiere, yuen, yuend, type LinconPaar, type T1wayErgebnis, type YuendErgebnis, type YuenErgebnis } from './getrimmt';

/* Sollwerte: R WRS2 (Opus), docs/fachblaetter/sollwerte/field-stufe3.json, Abschnitt robust. Toleranz 1e-6 relativ. */
const s = soll3.robust;
const tg = csv('toothgrowth.csv'), sl = csv('sleep.csv'), pg = csv('plantgrowth.csv');
const gr = (rows: Record<string, string | number>[], w: string, g: string, folge: string[]) => folge.map(f => ({ name: f, werte: rows.filter(r => String(r[g]) === f).map(r => r[w] as number) }));
const ok = <T>(x: T | { fehler: string }): T => { if (x && typeof x === 'object' && 'fehler' in x) throw new Error(String((x as { fehler: string }).fehler)); return x as T; };

describe('Yuen-Test gegen WRS2', () => {
  it('zwei unabhängige Gruppen (ToothGrowth, 20 %)', () => {
    const [oj, vc] = gr(tg, 'len', 'supp', ['OJ', 'VC']);
    const e: YuenErgebnis = ok(yuen(oj!.werte, vc!.werte, 0.2));
    for (const k of ['t', 'df', 'p', 'diff', 'lo', 'hi'] as const) expect(nah(e[k], s.yuen[k]), `${k} ${e[k]}`).toBe(true);
  });
  it('gepaart (sleep)', () => {
    const [a, b] = gr(sl, 'extra', 'group', ['1', '2']);
    const e: YuendErgebnis = ok(yuend(a!.werte, b!.werte, 0.2));
    for (const k of ['t', 'df', 'p', 'diff', 'lo', 'hi'] as const) expect(nah(e[k], s.yuend[k]), `${k} ${e[k]}`).toBe(true);
  });
  it('Fehlerfälle', () => {
    expect(yuen([1, 2], [1, 2, 3, 4, 5], 0.4)).toEqual({ fehler: 'zu-wenig' });
    expect(yuen([1, 1, 1, 1, 1], [2, 2, 2, 2, 2], 0.2)).toEqual({ fehler: 'keine-streuung' });
  });
});
describe('Getrimmte Varianzanalyse und Paarvergleiche gegen WRS2', () => {
  const g3 = gr(pg, 'weight', 'group', ['ctrl', 'trt1', 'trt2']);
  it('t1way', () => {
    const e: T1wayErgebnis = ok(t1way(g3, 0.2));
    for (const k of ['F', 'df1', 'df2', 'p'] as const) expect(nah(e[k], s.t1way[k]), `${k} ${e[k]}`).toBe(true);
  });
  it('getrimmte Mittel', () => g3.forEach((g, i) => expect(nah(trimMittel(g.werte, 0.2), s.getrimmtes_mittel[i])).toBe(true)));
  it('lincon: Differenzen und p nach Hochberg', () => {
    const e: LinconPaar[] = ok(lincon(g3, 0.2));
    e.forEach((q, k) => { expect(`${q.i + 1} ${q.j + 1}`).toBe(s.lincon.vergleich[k]); expect(nah(q.psihat, s.lincon.psihat[k])).toBe(true); expect(nah(q.p, s.lincon.p[k]), `p ${q.p}`).toBe(true); });
  });
  it('Hochberg wie R p.adjust', () => { const a = hochberg([0.01, 0.04, 0.03]); expect(a[0]).toBeCloseTo(0.03, 12); expect(a[1]).toBeCloseTo(0.04, 12); expect(a[2]).toBeCloseTo(0.04, 12); });
});
describe('Winsorisieren', () => {
  it('Perzentile 20/80 (type 7) wie der Sollwert', () => {
    const w = pg.map(r => r.weight as number), e = winsorisiere(w, 0.2, 0.8)!;
    e.neu.forEach((v, i) => expect(nah(v as number, s.winsor.werte[i])).toBe(true));
    expect(e.geaendert).toBeGreaterThan(0);
  });
  it('Lücken bleiben, ungültige Grenzen ergeben null', () => {
    expect(winsorisiere([1, null, 2, 3, 100], 0.1, 0.9)!.neu[1]).toBeNull();
    expect(winsorisiere([1, 2, 3], 0.8, 0.2)).toBeNull();
    expect(winsorWilcox([1, 2, 3, 4, 100], 0.2)).toEqual([2, 2, 3, 4, 4]);
  });
});
