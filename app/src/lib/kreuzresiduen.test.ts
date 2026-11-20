import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { kreuzResiduen, auffaelligeZellen } from './kreuzresiduen';
import { nodeEngine } from './testengine';
import { finde, spalte } from './tabelle';

/* Sollwerte: docs/fachblaetter/sollwerte/field-stufe1.json (R: HairEyeColor Männer, chisq.test()$stdres; Titanic Sex x Survived mit correct = TRUE). */
const soll = JSON.parse(readFileSync(join(__dirname, '../../../docs/fachblaetter/sollwerte/field-stufe1.json'), 'utf8'));
const nah = (a: number, b: number, tol = 1e-6, was = '') => expect(Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-300), `${was} ${a} gegen ${b}`).toBe(true);

describe('Kreuztabelle: Residuen, G² und Yates gegen R', () => {
  const k = kreuzResiduen(soll.kreuz.n)!;
  it('erwartet, standardisiert, angepasst', () => {
    soll.kreuz.n.forEach((z: number[], i: number) => z.forEach((_, j) => {
      nah(k.erwartet[i]![j]!, soll.kreuz.erwartet[i][j], 1e-9, 'E'); nah(k.stdres[i]![j]!, soll.kreuz.stdres[i][j], 1e-9, 'std'); nah(k.adjres[i]![j]!, soll.kreuz.adjres[i][j], 1e-9, 'adj');
    }));
  });
  it('χ², G², p, df', () => {
    nah(k.chi2, soll.kreuz.chi2); nah(k.g2, soll.kreuz.G2); nah(k.g2p, soll.kreuz.G2p, 1e-5); expect(k.df).toBe(soll.kreuz.df); expect(k.yates).toBeUndefined();
  });
  it('auffällige Zellen (Blond-Blue, Blond-Brown, Black-Brown, Black-Blue); Bonferroni-Grenze trennt Black-Blue ab', () => {
    const a = auffaelligeZellen(soll.kreuz.n, k);
    expect(a.map(z => `${z.zeile}-${z.spalte}`)).toEqual(['3-1', '3-0', '0-0', '0-1']);
    expect(a.find(z => z.zeile === 0 && z.spalte === 0)!.mehr).toBe(true);
    expect(a.find(z => z.zeile === 3 && z.spalte === 0)!.mehr).toBe(false);
    nah(k.bonferroni, 2.955, 0.001);   // qnorm(1 − 0,05/32)
    expect(a.map(z => z.ueberBonferroni)).toEqual([true, true, true, false]);
  });
  it('2 × 2: Yates-Korrektur', () => {
    const y = kreuzResiduen(soll.yates.n)!;
    nah(y.yates!.chi2, soll.yates.chi2Yates); nah(y.yates!.p, soll.yates.pYates, 1e-4); nah(y.chi2, soll.yates.chi2);
  });
  it('leere Zeile oder zu kleine Tabelle: keine Rechnung', () => {
    expect(kreuzResiduen([[1, 2], [0, 0]])).toBeNull(); expect(kreuzResiduen([[1, 2]])).toBeNull();
  });
});

describe('Kontrolle gegen PSPP (CROSSTABS /STATISTICS=CHISQ)', () => {
  let e: Awaited<ReturnType<typeof nodeEngine>>;
  beforeAll(async () => { e = await nodeEngine(); });
  const lauf = (tab: number[][]) => {
    const zeilen = tab.flatMap((r, i) => r.map((n, j) => `${i + 1},${j + 1},${n}`)).join('\n') + '\n';
    const items = e.run(`DATA LIST FILE='/d.csv' LIST (',') /grp ant w (F8.0).\nWEIGHT BY w.\nCROSSTABS /TABLES=grp BY ant\n  /STATISTICS=CHISQ\n  /CELLS=COUNT.`, { '/d.csv': new TextEncoder().encode(zeilen) });
    const cs = finde(items, /^Chi-Square Tests$/)!, v = spalte(cs, /^Value$/);
    const zeile = (n: string) => cs.t.findIndex(z => z[0] === n);
    return { lr: cs.n[zeile('Likelihood Ratio')]![v], yates: zeile('Continuity Correction') >= 0 ? cs.n[zeile('Continuity Correction')]![v] : undefined, pearson: cs.n[zeile('Pearson Chi-Square')]![v] };
  };
  it('Likelihood Ratio (4 × 4) wie G²', () => {
    const p = lauf(soll.kreuz.n), k = kreuzResiduen(soll.kreuz.n)!;
    nah(k.g2, p.lr!, 1e-5); nah(k.chi2, p.pearson!, 1e-5);
  });
  it('Continuity Correction (2 × 2) wie Yates', () => {
    const p = lauf(soll.yates.n), k = kreuzResiduen(soll.yates.n)!;
    expect(p.yates).toBeDefined(); nah(k.yates!.chi2, p.yates!, 1e-5); nah(k.g2, p.lr!, 1e-5);
  });
});
