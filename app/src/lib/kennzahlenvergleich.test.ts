import { describe, expect, it } from 'vitest';
import { zweiMittel, gepaart, einfaktor, korrelation, tabelle, type ZweiMittelErgebnis, type GepaartErgebnis, type EinfaktorErgebnis, type KorrErgebnis, type TabelleErgebnis } from './kennzahlenvergleich';

/* Sollwerte: Rscript am Mac (R 4.6.1): die Formeln von t.test mit pt und qt, pf, chisq.test(correct = FALSE), atanh/qnorm für r. */
const nah = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b) / Math.max(Math.abs(b), 1e-9), `${a} gegen ${b}`).toBeLessThan(tol);

describe('Vergleiche aus Kennzahlen gegen R', () => {
  it('zwei Gruppen: klassisch und Welch', () => {
    const r = zweiMittel({ m: 5, s: 2, n: 12 }, { m: 3.5, s: 1.5, n: 10 }) as ZweiMittelErgebnis;
    nah(r.klassisch.t, 1.95456, 1e-6); expect(r.klassisch.df).toBe(20); nah(r.klassisch.p, 0.06475896, 1e-6); nah(r.klassisch.lo, -0.1008439, 1e-6); nah(r.klassisch.hi, 3.100844, 1e-6); nah(r.sp, 1.792345, 1e-6);
    nah(r.welch.t, 2.007449, 1e-6); nah(r.welch.df, 19.82296, 1e-6); nah(r.welch.p, 0.05853023, 1e-6); nah(r.welch.lo, -0.05956035, 1e-6); nah(r.welch.hi, 3.05956, 1e-6);
    nah(r.d, 1.5 / 1.792345, 1e-6); expect(r.g).toBeLessThan(r.d);
  });
  it('gepaart', () => { const r = gepaart(1.2, 2.1, 15) as GepaartErgebnis; nah(r.t, 2.213133, 1e-6); expect(r.df).toBe(14); nah(r.p, 0.04400273, 1e-6); nah(r.lo, 0.03705876, 1e-6); nah(r.hi, 2.362941, 1e-6); nah(r.dz, 1.2 / 2.1, 1e-9); });
  it('einfaktorielle Varianzanalyse', () => { const r = einfaktor([{ m: 5.1, s: 1.2, n: 10 }, { m: 6.3, s: 1.5, n: 12 }, { m: 7.2, s: 1.1, n: 9 }]) as EinfaktorErgebnis; nah(r.ssZwischen, 21.19935, 1e-6); nah(r.ssInnerhalb, 47.39, 1e-9); nah(r.f, 6.262734, 1e-6); nah(r.p, 0.005649628, 1e-4); nah(r.eta2, 0.3090765, 1e-6); expect(r.dfInnerhalb).toBe(28); });
  it('Korrelation aus r und n', () => { const r = korrelation(0.45, 30) as KorrErgebnis; nah(r.t, 2.666405, 1e-6); nah(r.p, 0.01259107, 1e-6); nah(r.lo, 0.1070928, 1e-5); nah(r.hi, 0.697233, 1e-5); });
  it('Tabelle: χ², p, V, erwartete Anzahlen', () => { const r = tabelle([[12, 8], [6, 14]]) as TabelleErgebnis; nah(r.chi2, 3.636364, 1e-6); expect(r.df).toBe(1); nah(r.p, 0.05653028, 1e-5); nah(r.v, 0.3015113, 1e-6); nah(r.minErwartet, 9, 1e-12); expect(r.unter5).toBe(0); });
  it('Fehler', () => {
    expect(zweiMittel({ m: 1, s: 1, n: 1 }, { m: 2, s: 1, n: 5 })).toEqual({ fehler: 'n' }); expect(zweiMittel({ m: 1, s: 0, n: 5 }, { m: 2, s: 0, n: 5 })).toEqual({ fehler: 's' }); expect(korrelation(1, 10)).toEqual({ fehler: 'r' });
    expect(einfaktor([{ m: 1, s: 1, n: 5 }])).toEqual({ fehler: 'gruppen' }); expect(tabelle([[1, 2], [0, 0]])).toEqual({ fehler: 'tabelle' }); expect(gepaart(1, 0, 10)).toEqual({ fehler: 's' });
  });
});
