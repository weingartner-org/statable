import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/probieren-erwartet.json';
import { alphaAusK, intervallBreite, vierfeld } from './probieren';

const nah = (ist: number, soll: number, tol = 1e-9) => expect(Math.abs(ist - soll)).toBeLessThan(tol);

describe('Ausprobieren: Rechenkerne gegen R (scripts/probieren-erwartet.R)', () => {
  it('Alpha aus Zahl der Fragen und Zusammenhang (psych::alpha, std.alpha)', () => {
    for (const f of erwartet.alpha) nah(alphaAusK(f.k, f.r), f.alpha);
  });
  it('Alpha steigt mit mehr Fragen bei gleichem Zusammenhang', () => {
    expect(alphaAusK(10, 0.3)).toBeGreaterThan(alphaAusK(5, 0.3));
  });
  it('Konfidenzintervall: t-Quantil und Breite (qt)', () => {
    for (const f of erwartet.ki) { const i = intervallBreite(f.n, f.s); nah(i.t, f.t, 1e-7); nah(i.halb, f.halb, 1e-7); nah(i.breite, f.breite, 1e-7); }
  });
  it('4-fache Personenzahl: Breite ungefähr halb', () => {
    const r = intervallBreite(100, 15).breite / intervallBreite(400, 15).breite;
    expect(r).toBeGreaterThan(1.97); expect(r).toBeLessThan(2.03);
  });
  it('Vierfeldertafel und Vorhersagewerte', () => {
    for (const f of erwartet.vorhersage) {
      const v = vierfeld(f.sens, f.spez, f.haeuf);
      nah(v.tp, f.tp); nah(v.fn, f.fn); nah(v.fp, f.fp); nah(v.tn, f.tn); nah(v.ppv, f.ppv); nah(v.npv, f.npv);
    }
  });
  it('seltene Krankheit: die meisten positiven Ergebnisse sind falsch', () => {
    const v = vierfeld(0.9, 0.9, 0.01);
    expect(v.fp).toBeGreaterThan(v.tp * 10); expect(v.ppv).toBeLessThan(0.1);
  });
});
