import { describe, expect, it } from 'vitest';
import { PH_STANDARD, paarvergleiche, ptukey, qtukey, welchAnova, type PhArt, type PhGruppe } from './posthoc';
import erwartet from './testdaten/posthoc-erwartet.json';

/* Vergleichswerte aus R (scripts/posthoc-erwartet.R): TukeyHSD, Games-Howell (rstatix-Formel in Basis-R), oneway.test(var.equal = FALSE),
 * pairwise.t.test(Bonferroni, gepoolt) mit Intervallen über qt. Daten: ToothGrowth (gleiche n), chickwts (ungleiche n),
 * airquality Ozon nach Monat (stark ungleiche Streuung und n; Levene p = ,004). */
interface Rpaar { i: number; j: number; diff: number; lo: number; hi: number; p: number }
interface Rfall { name: string; gruppen: string[]; n: number[]; m: number[]; sd: number[]; tukey: Rpaar[]; gh: Rpaar[]; bonferroni: Rpaar[]; welch: { F: number; df1: number; df2: number; p: number }; levene: { F: number; p: number } }
const faelle = erwartet as unknown as Rfall[];
const gruppen = (f: Rfall): PhGruppe[] => f.gruppen.map((name, i) => ({ name, n: f.n[i]!, m: f.m[i]!, sd: f.sd[i]! }));
const nah = (a: number, b: number, rel = 1e-6, abs = 1e-9) => Math.abs(a - b) <= Math.max(abs, rel * Math.abs(b));

describe('studentisierte Spannweite wie R', () => {
  it('ptukey', () => {
    expect(nah(ptukey(3.5, 3, 20), 0.9441081509, 1e-9)).toBe(true);
    expect(nah(ptukey(3.5, 4, 57), 0.9251653783, 1e-9)).toBe(true);
  });
  it('qtukey ', () => {
    expect(nah(qtukey(0.95, 3, 57), 3.403189193, 1e-9)).toBe(true);
    expect(nah(qtukey(0.95, 3, 20), 3.577934582, 1e-9)).toBe(true);
    expect(nah(qtukey(0.95, 5, 30), 4.10207902, 1e-8)).toBe(true);
  });
});

for (const f of faelle) {
  describe(`Paarvergleiche und Welch: ${f.name}`, () => {
    const g = gruppen(f);
    const art: Record<string, PhArt> = { tukey: 'tukey', gh: 'gh', bonferroni: 'bonferroni' };
    for (const [schluessel, a] of Object.entries(art)) {
      it(`${schluessel}: Differenz, 95-%-Intervall und p wie R`, () => {
        const ist = paarvergleiche(g, a)!, soll = (f as unknown as Record<string, Rpaar[]>)[schluessel]!;
        expect(ist.length).toBe(soll.length);
        soll.forEach((r, k) => {
          const x = ist[k]!;
          expect([x.i + 1, x.j + 1]).toEqual([r.i, r.j]);
          expect(nah(x.diff, r.diff, 1e-9), `diff ${k}`).toBe(true);
          expect(nah(x.kiLo, r.lo, 1e-5, 1e-6), `kiLo ${k}: ${x.kiLo} gegen ${r.lo}`).toBe(true);
          expect(nah(x.kiHi, r.hi, 1e-5, 1e-6), `kiHi ${k}: ${x.kiHi} gegen ${r.hi}`).toBe(true);
          expect(nah(x.p, r.p, 1e-4, 1e-9), `p ${k}: ${x.p} gegen ${r.p}`).toBe(true);
        });
      });
    }
    it('Welch-Varianzanalyse: F, df1, df2 und p wie oneway.test', () => {
      const w = welchAnova(g)!;
      expect(nah(w.f, f.welch.F, 1e-7)).toBe(true);
      expect(w.df1).toBe(f.welch.df1);
      expect(nah(w.df2, f.welch.df2, 1e-7)).toBe(true);
      expect(nah(w.p, f.welch.p, 1e-5, 1e-12), `p ${w.p} gegen ${f.welch.p}`).toBe(true);
    });
    it('Standard ist Games-Howell, unabhängig vom Levene-Test (Abschlusstest F2)', () => {
      expect(PH_STANDARD).toBe('gh');
    });
  });
}

describe('Grenzfälle', () => {
  const g3 = (sd: number, n = 10): PhGruppe[] => [{ name: 'a', n, m: 1, sd }, { name: 'b', n, m: 2, sd }, { name: 'c', n, m: 3, sd }];
  it('zu wenige Gruppen oder zu kleine Gruppe: keine Rechnung', () => {
    expect(paarvergleiche(g3(1).slice(0, 2), 'tukey')).toBeNull();
    expect(paarvergleiche(g3(1, 1), 'gh')).toBeNull();
    expect(welchAnova(g3(0))).toBeNull();
  });
  it('p liegt immer zwischen 0 und 1, auch bei gleichen Mittelwerten', () => {
    const gleich = g3(1).map(x => ({ ...x, m: 5 }));
    for (const a of ['tukey', 'gh', 'bonferroni'] as const) for (const x of paarvergleiche(gleich, a)!) { expect(x.p).toBeGreaterThan(0.99); expect(x.p).toBeLessThanOrEqual(1); }
  });
});
