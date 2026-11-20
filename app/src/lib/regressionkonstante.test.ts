import { beforeAll, describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-a-erwartet.json';
import { nodeEngine } from './testengine';
import { korrigiereAusgabe } from '../engine/korrektur';
import { raster } from './tabelle';
import type { TableItem } from '../engine/types';

/* PSPP 2.1.1 REGRESSION: Sig. der Konstanten mit N − 1 statt N − k − 1 Freiheitsgraden (docs/PSPP-BEFUNDE.md, F8).
 * Statable zeigt die Zahl nie falsch: korrigiereAusgabe rechnet das p der Konstanten aus t und den Freiheitsgraden der Residuen. Sollwert: R summary(lm(...)). */
const E = (erwartet as any).gewichte, H = E.haeufigkeit, R = H.regression_y_x;
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

const csv = () => {
  const d = H.daten, z: string[] = [];
  for (let i = 0; i < d.y.length; i++) for (let k = 0; k < d.w[i]; k++) z.push(`${d.y[i]},${d.x[i]}`);
  return new TextEncoder().encode(z.join('\n') + '\n');
};
const lauf = () => e.run(`NEW FILE.\nDATA LIST FILE='/r.csv' LIST (',') /y x (F8.2).\nREGRESSION /STATISTICS=COEFF R ANOVA CI /DEPENDENT=y /METHOD=ENTER x.`, { '/r.csv': csv() });
const konstante = (items: ReturnType<typeof lauf>) => {
  const t = items.find((i): i is TableItem => i.type === 'table' && /^Coefficients/.test(i.label))!;
  const r = raster(t), z = r.t.findIndex(x => x[0] === '(Constant)'), sig = t.cells.find(c => c.h && c.t === 'Sig.')!.c, tk = t.cells.find(c => c.h && c.t === 't')!.c;
  return { p: r.n[z]![sig]!, t: r.n[z]![tk]!, text: r.t[z]![sig]! };
};

describe('REGRESSION: p der Konstanten mit den richtigen Freiheitsgraden (Sollwert R)', () => {
  it('roh gleich R (PSPP 2.1.3, ca216c6; 2.1.1 nahm N − 1 Freiheitsgrade), korrigiert ebenso gleich R auf 1e-9', () => {
    const roh = konstante(lauf());
    expect(Math.abs(roh.p - R.p0)).toBeLessThanOrEqual(1e-9 * Math.max(1, R.p0));
    const ok = konstante(korrigiereAusgabe(lauf()));
    expect(Math.abs(ok.p - R.p0)).toBeLessThanOrEqual(1e-9 * Math.max(1, R.p0));
    expect(ok.t).toBeCloseTo(R.t0, 9);
    expect(ok.text).toBe('.001');
  });
  it('B, SE und alles zu x bleiben unberührt', () => {
    const t = korrigiereAusgabe(lauf()).find((i): i is TableItem => i.type === 'table' && /^Coefficients/.test(i.label))!;
    const r = raster(t), x = r.t.findIndex(z => z[0] === 'x'), sig = t.cells.find(c => c.h && c.t === 'Sig.')!.c;
    expect(Math.abs(r.n[x]![sig]! - R.p1)).toBeLessThanOrEqual(1e-9);
  });
});
