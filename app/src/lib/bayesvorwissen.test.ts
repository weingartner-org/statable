import { describe, expect, it } from 'vitest';
import { soll3, nah } from './testdaten/field3';
import { anteilKurven, anteilVorwissen, betaDichte, betaQuantil, mittelKurven, mittelVorwissen } from './bayesvorwissen';

/* Sollwerte: R (Opus), docs/fachblaetter/sollwerte/field-stufe3.json, Abschnitt bayes_vorwissen; Toleranz 1e-6 relativ. */
const s = soll3.bayes_vorwissen;
describe('Bayes mit Vorwissen: Anteil (Beta-Binomial)', () => {
  const a = s.anteil, e = anteilVorwissen(a.prior[0], a.prior[1], a.k, a.n)!;
  it('Posterior, Mittel, Glaubwürdigkeitsintervall, P(Anteil > 0,5)', () => {
    expect(e.post).toEqual(a.post);
    for (const [ist, soll] of [[e.mittel, a.mittel], [e.lo, a.lo], [e.hi, a.hi], [e.pUeberHalb, a.p_ueber_halb]] as const) expect(nah(ist, soll), `${ist} gegen ${soll}`).toBe(true);
  });
  it('Prior-Gewicht, Daten-Anteil, Fehler', () => {
    expect(e.priorGewicht).toBeCloseTo(4 / 24, 12); expect(e.datenAnteil).toBeCloseTo(0.35, 12);
    expect(anteilVorwissen(0, 2, 1, 2)).toBeNull(); expect(anteilVorwissen(2, 2, 5, 3)).toBeNull(); expect(anteilVorwissen(2, 2, 1.5, 3)).toBeNull();
  });
  it('Kurven: Posterior hat Fläche 1, Likelihood auch, die Spitze liegt beim Modus', () => {
    const k = anteilKurven(2, 2, 7, 20, 2001), flaeche = (y: number[]) => y.reduce((s2, v, i) => (i ? s2 + (v + y[i - 1]!) / 2 * (k.x[i]! - k.x[i - 1]!) : 0), 0);
    expect(flaeche(k.posterior)).toBeCloseTo(1, 4); expect(flaeche(k.likelihood)).toBeCloseTo(1, 4); expect(flaeche(k.prior)).toBeCloseTo(1, 4);
    const spitze = k.x[k.posterior.indexOf(Math.max(...k.posterior))]!; expect(spitze).toBeCloseTo((9 - 1) / (24 - 2), 2);
  });
  it('Beta-Hilfen: Dichte und Quantil', () => { expect(betaDichte(0.5, 2, 2)).toBeCloseTo(1.5, 12); expect(betaQuantil(0.5, 2, 2)).toBeCloseTo(0.5, 10); });
});
describe('Bayes mit Vorwissen: Mittelwert (Normal-Prior, σ bekannt)', () => {
  const m = s.mittelwert, e = mittelVorwissen(m.prior[0], m.prior[1], m.n, m.mittel_daten, m.sigma)!;
  it('Posterior-Mittel, -Streuung und Intervall', () => {
    for (const [ist, soll] of [[e.mittel, m.post_mittel], [e.sd, m.post_sd], [e.lo, m.lo], [e.hi, m.hi]] as const) expect(nah(ist, soll), `${ist} gegen ${soll}`).toBe(true);
  });
  it('Prior-Gewicht und Fehler', () => { expect(e.priorGewicht).toBeCloseTo(1 / 15 ** 2 / (1 / 15 ** 2 + 10 / 15 ** 2), 12); expect(mittelVorwissen(0, 0, 5, 1, 1)).toBeNull(); expect(mittelVorwissen(0, 1, 0, 1, 1)).toBeNull(); });
  it('Kurven: Posterior-Spitze beim Posterior-Mittel', () => {
    const k = mittelKurven(e, 60, 160, 2001), i = k.posterior.indexOf(Math.max(...k.posterior)); expect(Math.abs(k.x[i]! - e.mittel)).toBeLessThan(0.1);
  });
});
