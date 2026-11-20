/**
 * B2 Teil 2d: Regressions-Diskontinuität gegen Sollwerte aus Desktop-R (scripts/rd-erwartet.R: lm mit Gewichten + sandwich HC1; Punktschätzung auch gegen rdrobust),
 * US-Senatswahlen (Cattaneo u. a., 1.297 Wahlen, Vorsprung der Demokraten und Stimmenanteil bei der nächsten Wahl).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { rdRechnen, type RdErgebnis } from './rd';
import soll from './rd-erwartet.json';

const zeilen = readFileSync(join(__dirname, 'testdaten', 'senat.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map(z => z.split(';').map(v => Number(v.replace(',', '.'))));
const y = zeilen.map(z => z[0]!), x = zeilen.map(z => z[1]!);
const S = soll as any;
const nah = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b) / Math.max(1, Math.abs(b))).toBeLessThan(tol);
function pruefe(f: any) {
  const e = rdRechnen(y, x, 0, f.h, f.p, f.kern === 'tri' ? 'dreieck' : 'gleich') as RdErgebnis;
  expect('fehler' in e).toBe(false);
  expect(e.n).toBe(f.n); expect(e.nLinks).toBe(f.nLinks); expect(e.nRechts).toBe(f.nRechts); expect(e.k).toBe(f.k);
  nah(e.b, f.b); nah(e.se, f.se); nah(e.seRobust, f.seRobust);
  // R ordnet Haupteffekte vor Wechselwirkungen: bei Ordnung 2 (1, D, u, u², D·u, D·u²); Statable: (1, D, u, D·u, u², D·u²)
  const rei = f.p === 1 ? [0, 1, 2, 3] : [0, 1, 2, 4, 3, 5];
  f.alle.forEach((v: number, i: number) => nah(e.alle[rei[i]!]!, v));
}
describe('Regressions-Diskontinuität gegen R', () => {
  it('Daten: 1.297 Wahlen', () => { expect(zeilen.length).toBe(S.n); });
  it('Ordnung 1, dreieckig, Bandbreite 10 und 20', () => { pruefe(S.a); pruefe(S.b); });
  it('Ordnung 1, gleichgewichtet, Bandbreite 10', () => { pruefe(S.c); });
  it('Ordnung 2, dreieckig, Bandbreite 20', () => { pruefe(S.d); });
  it('Fehler: Bandbreite, nur eine Seite, zu wenig Fälle', () => {
    expect(rdRechnen(y, x, 0, 0)).toEqual({ fehler: 'bandbreite' });
    expect(rdRechnen(y, x, 200, 10)).toEqual({ fehler: 'eine-seite' });
    expect(rdRechnen([1, 2, 3, 4, 5], [-2, -1, 0.5, 1, 2], 0, 3)).toEqual({ fehler: 'zu-wenig-faelle' });
  });
});
