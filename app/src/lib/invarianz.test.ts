import { describe, expect, it } from 'vitest';
import { invarianzUrteile } from './invarianz';
import type { InvarianzErg } from './rverfahren.svelte';

const st = (name: 'konfigural' | 'metrisch' | 'skalar', cfi: number, rmsea: number, srmr: number) => ({ name, chisq: 1, df: 1, p: 1, cfi, tli: cfi, rmsea, srmr });
const erg = (a: [number, number, number], b: [number, number, number], c: [number, number, number]): InvarianzErg => ({ stufen: [st('konfigural', ...a), st('metrisch', ...b), st('skalar', ...c)], diff: [{ chisq: 3, df: 2, p: 0.2 }, { chisq: 9, df: 2, p: 0.01 }], gruppen: [], warnungen: [], ordinal: false, vorschlag: [], teil: null });

describe('Messinvarianz: Urteil nach Chen (2007)', () => {
  it('kleine Änderungen: beide Stufen erfüllt', () => { const u = invarianzUrteile(erg([0.97, 0.04, 0.03], [0.965, 0.045, 0.04], [0.96, 0.05, 0.045])); expect(u.map(x => x.erfuellt)).toEqual([true, true]); });
  it('mit den R-Werten der Testdaten (lavaan, 2 Gruppen, verschobener Achsenabschnitt): metrisch ja, skalar nein', () => {
    const u = invarianzUrteile(erg([1, 0, 0.0237], [0.993, 0.0374, 0.0558], [0.93, 0.1075, 0.0771]));
    expect(u[0]!.erfuellt).toBe(true); expect(u[1]!.erfuellt).toBe(false); expect(Math.abs(u[1]!.dCfi + 0.063)).toBeLessThan(1e-9); expect(Math.abs(u[1]!.dRmsea - 0.0701)).toBeLessThan(1e-9);
  });
  it('ΔCFI allein reicht nicht', () => { const u = invarianzUrteile(erg([0.97, 0.04, 0.03], [0.95, 0.045, 0.035], [0.95, 0.045, 0.035])); expect(u[0]!.erfuellt).toBe(true); });
});
