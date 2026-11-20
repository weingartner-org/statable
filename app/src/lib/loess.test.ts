import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loess, loessLinie } from './loess';

/** mtcars: Gewicht (wt) und Verbrauch (mpg), Datei aus docs/fachblaetter/sollwerte. */
const zeilen = readFileSync(new URL('../../../docs/fachblaetter/sollwerte/mtcars.csv', import.meta.url), 'utf8').trim().split('\n').slice(1).map(l => l.split(','));
const x = zeilen.map(r => +r[6]!), y = zeilen.map(r => +r[1]!);
/** Ausgabe von `Rscript -e 'x<-mtcars$wt;y<-mtcars$mpg;cat(predict(loess(y~x)),sep=",")'` (R, 05.11.2026), nicht von Hand gesetzt. */
const R = '22.235002874060,21.078640387614,24.640359455315,19.485752323900,17.921391107904,17.810467047137,17.194688590337,19.621904662845,19.823650439772,17.921391107904,17.921391107904,15.068345010497,16.361238472801,16.124690360037,12.005672333030,11.797844023017,11.882155997954,25.878911836998,31.256955361162,29.391035345365,23.265019827349,17.467429408071,17.949104975880,15.878624555636,15.860457521687,28.512526735489,26.504779109550,32.088972338570,19.725007054509,21.570736370077,17.194688590337,21.527901898339'.split(',').map(Number);

describe('LOESS wie R (Spannweite 0,75, Grad 2)', () => {
  it('gleicht predict(loess(mpg ~ wt)) an allen 32 Punkten (1e-8)', () => {
    const m = loess(x, y)!;
    expect(m.q).toBe(24);
    x.forEach((z, i) => expect(Math.abs(m.bei(z) - R[i]!), `Punkt ${i + 1}`).toBeLessThan(1e-8));
  });
  it('Linie: 61 Punkte von kleinstem bis größtem x', () => {
    const l = loessLinie(x.map((v, i) => [v, y[i]!]));
    expect(l).toHaveLength(61);
    expect(l[0]![0]).toBeCloseTo(Math.min(...x), 12);
    expect(l.at(-1)![0]).toBeCloseTo(Math.max(...x), 12);
  });
  it('zu wenig Punkte oder zu wenige verschiedene x: keine Linie', () => {
    expect(loess([1, 2, 3], [1, 2, 3])).toBeNull();
    expect(loessLinie([[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6]])).toEqual([]);
  });
});
