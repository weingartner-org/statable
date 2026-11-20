import { describe, expect, it } from 'vitest';
import { csv, nah, soll } from './testdaten/field3';
import { invers } from './robustse';
import { anova3, zellenJeC, QUELLEN3, type Anova3 } from './anova3';

/* Sollwerte: R car::Anova(lm(yield ~ N*P*K, npk), type = 3) mit contr.sum (Opus), field-stufe3.json (drei_faktoren). Toleranz 1e-6 relativ. */
const npk = csv('npk.csv');
const d = { a: npk.map(r => String(r.N)), b: npk.map(r => String(r.P)), c: npk.map(r => String(r.K)), y: npk.map(r => r.yield as number), aStufen: ['0', '1'], bStufen: ['0', '1'], cStufen: ['0', '1'] };

describe('Dreifaktorielle Varianzanalyse (npk, 2 × 2 × 2, Typ III) gegen R', () => {
  const e = anova3(d) as Anova3, s = soll.drei_faktoren;
  it('sieben Effekte: F, df, p', () => {
    expect(e.effekte.map(x => x.quelle)).toEqual(QUELLEN3);
    expect(e.fehler.df).toBe(s.df_fehler);
    e.effekte.forEach((x, i) => {
      expect(x.df).toBe(s.df[i]);
      expect(nah(x.f, s.F[i]), `F ${x.quelle} ${x.f}`).toBe(true);
      expect(nah(x.p, s.p[i]), `p ${x.quelle} ${x.p}`).toBe(true);
      expect(x.etaP).toBeCloseTo(x.ss / (x.ss + e.fehler.ss), 12);
      expect(x.etaPLo).toBeLessThanOrEqual(x.etaP); expect(x.etaPHi).toBeGreaterThanOrEqual(x.etaP);
    });
  });
  it('acht Zellen mit je 3 Fällen, Dreifach-Wechselwirkung nicht bedeutsam', () => {
    expect(e.zellen).toHaveLength(8); expect(e.zellen.every(z => z.n === 3)).toBe(true);
    expect(e.dreifachBedeutsam).toBe(false);
    expect(zellenJeC(e, '1')).toHaveLength(4);
  });
  it('Fehlerquadratsumme = Streuung innerhalb der Zellen', () => {
    let ss = 0;
    for (const a of ['0', '1']) for (const b of ['0', '1']) for (const c of ['0', '1']) {
      const v = npk.filter((_, i) => d.a[i] === a && d.b[i] === b && d.c[i] === c).map(r => r.yield as number), m = v.reduce((x, y) => x + y, 0) / v.length;
      ss += v.reduce((x, y) => x + (y - m) ** 2, 0);
    }
    expect(nah(e.fehler.ss, ss, 1e-12)).toBe(true);
  });
  it('leere Zelle, zu wenig Fälle und fehlende Stufen werden gemeldet', () => {
    const ohne = npk.map((_, i) => i).filter(i => !(d.a[i] === '1' && d.b[i] === '1' && d.c[i] === '1'));
    expect(anova3({ ...d, a: ohne.map(i => d.a[i]!), b: ohne.map(i => d.b[i]!), c: ohne.map(i => d.c[i]!), y: ohne.map(i => d.y[i]!) })).toEqual({ fehler: 'leere-zelle', zelle: ['1', '1', '1'] });
    expect(anova3({ ...d, aStufen: ['0'] })).toEqual({ fehler: 'stufen' });
    const z = anova3({ a: ['0', '0', '1', '1', '0', '0', '1', '1'], b: ['0', '1', '0', '1', '0', '1', '0', '1'], c: ['0', '0', '0', '0', '1', '1', '1', '1'], y: [1, 2, 3, 4, 5, 6, 7, 8], aStufen: ['0', '1'], bStufen: ['0', '1'], cStufen: ['0', '1'] });
    expect(z).toEqual({ fehler: 'zu-wenig-faelle' });
  });
  it('ungleich große Zellen (ein Fall weniger): Typ III = Unterschied der Restquadratsummen mit und ohne die Spalten des Effekts (Summenkodierung)', () => {
    const y = d.y.slice(1), a = d.a.slice(1), b = d.b.slice(1), c = d.c.slice(1);
    const sk = (v: string) => (v === '1' ? 1 : -1);
    const spalten = (quellen: string[][]) => y.map((_, i) => [1, ...quellen.map(q => q.reduce((p, f) => p * sk({ a, b, c }[f as 'a']![i]!), 1))]);
    const rss = (X: number[][]) => {
      const p = X[0]!.length, xtx = Array.from({ length: p }, (_, r) => Array.from({ length: p }, (__, k) => X.reduce((s, z) => s + z[r]! * z[k]!, 0)));
      const xty = Array.from({ length: p }, (_, r) => X.reduce((s, z, i) => s + z[r]! * y[i]!, 0)), inv = invers(xtx)!;
      const beta = inv.map(z => z.reduce((s, v, k) => s + v * xty[k]!, 0));
      return y.reduce((s, v, i) => s + (v - X[i]!.reduce((t, x, k) => t + x * beta[k]!, 0)) ** 2, 0);
    };
    const alle = ['a', 'b', 'c', 'ab', 'ac', 'bc', 'abc'].map(q => q.split('')), voll = rss(spalten(alle)), w = anova3({ ...d, y, a, b, c }) as Anova3;
    expect(w.n).toBe(23);
    alle.forEach((q, i) => {
      const ohne = rss(spalten(alle.filter((_, k) => k !== i)));
      expect(nah(w.effekte[i]!.ss, ohne - voll, 1e-8), `SS ${q.join('')}`).toBe(true);
    });
  });
});
