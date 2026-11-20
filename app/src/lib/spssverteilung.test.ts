import { beforeAll, describe, expect, it } from 'vitest';
import { nodeEngine } from './testengine';
import { verteilungBezug, type BezugModus } from './verteilungbezug';
import { links, linksStreng, rechts, rechtsStreng, zwischen, quantil, type Verteilung } from './verteilungen';

/* Die SPSS-Zeilen des Verteilungsrechners laufen in der PSPP-Engine (gleiche Syntax wie SPSS) und geben dieselbe Zahl wie der Rechner. */
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });
function wert(zeile: string): number {
  const v = /^COMPUTE (\w+) =/.exec(zeile)![1]!;
  const items = e.run(`NEW FILE.\nDATA LIST FREE /a (F2).\nBEGIN DATA\n1\nEND DATA.\n${zeile}\nLIST VARIABLES=a ${v}.`);
  const t = items.find((i: any) => i.type === 'table' && /Data List/.test(i.label)) as any;
  return t.cells.find((c: any) => c.r === 1 && c.c === 1).n as number;
}
const FAELLE: [Verteilung, BezugModus, number, number, number, number][] = [
  [{ art: 'normal', mu: 100, sigma: 15 }, 'links', 115, 0, 0, 0], [{ art: 'normal', mu: 100, sigma: 15 }, 'zwischen', 0, 85, 115, 0], [{ art: 'normal', mu: 100, sigma: 15 }, 'quantil', 0, 0, 0, 0.975],
  [{ art: 't', df: 10 }, 'rechts', 2, 0, 0, 0], [{ art: 't', df: 10 }, 'quantil', 0, 0, 0, 0.975], [{ art: 'chi2', df: 4 }, 'links', 9.49, 0, 0, 0], [{ art: 'chi2', df: 4 }, 'quantil', 0, 0, 0, 0.95],
  [{ art: 'f', d1: 3, d2: 12 }, 'links', 3.49, 0, 0, 0], [{ art: 'f', d1: 3, d2: 12 }, 'quantil', 0, 0, 0, 0.95],
  [{ art: 'binom', n: 20, p: 0.3 }, 'links', 5, 0, 0, 0], [{ art: 'binom', n: 20, p: 0.3 }, 'rechts', 8, 0, 0, 0], [{ art: 'binom', n: 20, p: 0.3 }, 'zwischen', 0, 3, 8, 0], [{ art: 'binom', n: 20, p: 0.3 }, 'linksStreng', 5, 0, 0, 0], 
  [{ art: 'poisson', lambda: 4.5 }, 'links', 3, 0, 0, 0], [{ art: 'poisson', lambda: 4.5 }, 'rechtsStreng', 6, 0, 0, 0],
  [{ art: 'hyper', N: 49, K: 6, n: 6 }, 'links', 1, 0, 0, 0]
];
describe('SPSS-Zeilen des Verteilungsrechners in der PSPP-Engine', () => {
  for (const [v, modus, x, a, b, q] of FAELLE) {
    it(`${v.art} ${modus}`, () => {
      const bz = verteilungBezug(v, modus, x, a, b, q, false)!;
      const soll = modus === 'links' ? links(v, x) : modus === 'linksStreng' ? linksStreng(v, x) : modus === 'rechts' ? rechts(v, x) : modus === 'rechtsStreng' ? rechtsStreng(v, x) : modus === 'zwischen' ? zwischen(v, a, b) : quantil(v, q).x;
      expect(wert(bz.spss[0]!)).toBeCloseTo(soll, 6);
    });
  }
});
