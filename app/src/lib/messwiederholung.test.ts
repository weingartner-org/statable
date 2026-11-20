/**
 * Messwiederholung gegen R: Vergleichswerte aus scripts/messwiederholung-erwartet.R
 * (afex 1.5.1 `aov_ez`, emmeans 2.0.4 `pairs(adjust = "bonferroni")`, stats::mauchly.test; Daten: afex::obk.long).
 */
import { describe, expect, it } from 'vitest';
import { korrigiert, messwiederholung } from './messwiederholung';

const DATEN_A = [[2, 3, 3], [4, 3, 4], [6, 5, 7], [5, 3, 4], [4, 6, 4], [8, 9, 9], [5, 8, 9], [3, 5, 6], [4, 4, 5], [4, 7, 8], [3, 5, 6], [6, 9, 8], [6, 6, 8], [2, 5, 6], [3, 7, 7], [5, 7, 8]];
const DATEN_B = [
  [2, 2.33333333333333, 3.66666666666667, 3, 2.33333333333333], [3.33333333333333, 3.66666666666667, 4.66666666666667, 4, 2.66666666666667],
  [5.33333333333333, 5.66666666666667, 7, 6.33333333333333, 5.66666666666667], [3.66666666666667, 3.33333333333333, 5, 4.33333333333333, 3.66666666666667],
  [4.33333333333333, 4.66666666666667, 6.66666666666667, 4.66666666666667, 3], [8.33333333333333, 9, 9.33333333333333, 8.66666666666667, 8],
  [6.66666666666667, 7, 8.33333333333333, 7.66666666666667, 7], [3.33333333333333, 4.33333333333333, 6.66666666666667, 4.66666666666667, 4.33333333333333],
  [4, 4, 5.66666666666667, 5, 3], [6, 6.33333333333333, 6.66666666666667, 6, 6.66666666666667], [4.33333333333333, 4.33333333333333, 6.33333333333333, 4.33333333333333, 4],
  [7.66666666666667, 8, 9.66666666666667, 7.66666666666667, 5.33333333333333], [5.33333333333333, 6, 6.66666666666667, 8.66666666666667, 6.66666666666667],
  [4.33333333333333, 5, 6, 4, 2.33333333333333], [5, 5, 6, 6.33333333333333, 6], [6, 6.66666666666667, 8.33333333333333, 6.33333333333333, 6]];
const TREATMENT = ['control', 'control', 'control', 'control', 'control', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B', 'B'];
const GENDER = ['M', 'M', 'M', 'F', 'F', 'M', 'M', 'F', 'F', 'M', 'M', 'M', 'F', 'F', 'F', 'F'];
const nah = (x: number, soll: number, tol = 1e-7) => expect(Math.abs(x - soll)).toBeLessThan(tol * Math.max(1, Math.abs(soll)));

describe('einfaktoriell innerhalb (A: Phase, k = 3, n = 16) gegen afex/emmeans', () => {
  const e = messwiederholung(DATEN_A, ['pre', 'post', 'fup']);
  it('Quadratsummen, F, p, Mauchly, ε', () => {
    nah(e.zeit.ss, 33.5); nah(e.zeit.ssFehler, 33.8333333333); expect([e.zeit.df, e.zeit.dfFehler]).toEqual([2, 30]);
    nah(e.zeit.f, 14.8522167488); nah(e.zeit.p, 3.28639750374e-05, 1e-5);
    nah(e.sphaer.w, 0.704700429518); nah(e.sphaer.p, 0.0863041646691, 1e-6); expect(e.sphaer.df).toBe(2);
    nah(e.sphaer.gg, 0.772022181423); nah(e.sphaer.hf, 0.843667682095);
    nah(e.zeit.pGG, 0.000189064087649, 1e-5); nah(e.zeit.pHF, 0.000108913042833, 1e-5);
    nah(e.ssPersonen, 120.666666667);
  });
  it('partielles und generalisiertes η²', () => {
    nah(e.zeit.etaP, 0.497524752475); nah(e.zeit.etaG, 0.178191489362);
  });
  it('KI für partielles η² wie effectsize::eta_squared (zweiseitig)', () => {
    nah(e.zeit.etaPLo, 0.21762817, 1e-6); nah(e.zeit.etaPHi, 0.66632812, 1e-6);
    expect(e.zeit.etaGLo).toBeLessThan(e.zeit.etaG); expect(e.zeit.etaGHi).toBeGreaterThan(e.zeit.etaG);
  });
  it('korrigierte Freiheitsgrade (afex: 1,544 und 23,16)', () => {
    const k = korrigiert(e, e.zeit, 'gg'); nah(k.df1, 1.54404436285); nah(k.df2, 23.1606654427); nah(k.p, 0.000189064087649, 1e-5);
    expect(korrigiert(e, e.zeit, 'keine').df1).toBe(2);
  });
  it('paarweise Vergleiche nach Bonferroni (emmeans, Vorzeichen: später minus früher)', () => {
    const [pp, pf, qf] = e.paare;   // pre-post, pre-fup, post-fup
    nah(pp!.diff, 1.375); nah(pp!.se, 0.4366062299); nah(pp!.t, 3.149, 1e-3); nah(pp!.pAnp, 0.0198, 5e-3); nah(pp!.kiLo, 0.1988966315); nah(pp!.kiHi, 2.551103369);
    nah(pf!.diff, 2); nah(pf!.se, 0.4082482905); nah(pf!.pAnp, 0.0006, 0.06); nah(pf!.kiLo, 0.900285528); nah(pf!.kiHi, 3.099714472);
    nah(qf!.diff, 0.625); nah(qf!.pAnp, 0.0828, 5e-3); nah(qf!.kiLo, -0.0650653545); nah(qf!.kiHi, 1.315065354);
    expect(pp!.df).toBe(15);
  });
  it('Mittelwerte und Beschreibung', () => {
    nah(e.randmittel[0]!, 4.375); nah(e.randmittel[2]!, 6.375); expect(e.n).toBe(16); expect(e.zellen[0]![1]!.n).toBe(16);
  });
});

describe('einfaktoriell, k = 5 (B: Stunde) - Mauchly mit Korrekturterm w2', () => {
  const e = messwiederholung(DATEN_B, ['h1', 'h2', 'h3', 'h4', 'h5']);
  it('gegen afex', () => {
    nah(e.zeit.ss, 35.430555556); nah(e.zeit.ssFehler, 24.5694444444); nah(e.zeit.f, 21.6308648954); expect([e.zeit.df, e.zeit.dfFehler]).toEqual([4, 60]);
    nah(e.sphaer.w, 0.115160833908); nah(e.sphaer.p, 0.000709968254731, 1e-5); expect(e.sphaer.df).toBe(9);
    nah(e.sphaer.gg, 0.498417321325); nah(e.sphaer.hf, 0.574695300708);
    nah(e.zeit.pGG, 1.57825786554e-06, 1e-4); nah(e.zeit.pHF, 3.16110174187e-07, 1e-4);
    nah(e.zeit.etaG, 0.135691489362); nah(e.zeit.etaP, 0.590509259259);
  });
});

describe('gemischt, Gruppe treatment (5/4/7 Personen, ungleich) × Phase (C) gegen afex', () => {
  const e = messwiederholung(DATEN_A, ['pre', 'post', 'fup'], TREATMENT, 'treatment');
  it('Haupteffekte und Wechselwirkung (Typ III)', () => {
    expect(e.gruppen.map(g => g.n)).toEqual([4, 7, 5]);   // A, B, control (alphabetisch)
    const gr = e.gruppe!, z = e.zeit, w = e.wechsel!;
    nah(gr.ss, 37.35); nah(gr.ssFehler, 83.3166666667); nah(gr.f, 2.91388277656); nah(gr.p, 9.00408753878e-02, 1e-6); expect([gr.df, gr.dfFehler]).toEqual([2, 13]);
    nah(z.ss, 27.357831325); nah(z.ssFehler, 18.4333333333); nah(z.f, 19.29394975925); nah(z.p, 7.28934375077e-06, 1e-5); expect([z.df, z.dfFehler]).toEqual([2, 26]);
    nah(w.ss, 15.4); nah(w.f, 5.43037974684); nah(w.p, 2.57810789313e-03, 1e-6); expect([w.df, w.dfFehler]).toEqual([4, 26]);
  });
  it('Mauchly (gepoolt), ε, korrigierte p, η²', () => {
    nah(e.sphaer.w, 0.851511891409); nah(e.sphaer.p, 0.381192461781, 1e-6);
    nah(e.sphaer.gg, 0.870709929446); nah(e.sphaer.hf, 0.993903216213);
    nah(e.zeit.pGG, 2.37528250516e-05, 1e-5); nah(e.wechsel!.pGG, 4.30132703637e-03, 1e-6); nah(e.zeit.pHF, 7.70607224088e-06, 1e-5); nah(e.wechsel!.pHF, 2.64081702597e-03, 1e-6);
    nah(e.gruppe!.etaP, 0.309530386740); nah(e.zeit.etaP, 0.597447816173); nah(e.wechsel!.etaP, 0.455172413793);
    nah(e.gruppe!.etaG, 0.268511861970); nah(e.zeit.etaG, 0.211899085009); nah(e.wechsel!.etaG, 0.131455399061);
    const k = korrigiert(e, e.wechsel!, 'gg'); nah(k.df1, 3.48283971778); nah(k.df2, 22.6384581656);
    expect(korrigiert(e, e.gruppe!, 'gg').df1).toBe(2);   // Gruppe wird nie korrigiert
  });
  it('paarweise Vergleiche über die Gruppen (Mittel der Gruppenmittel, wie emmeans)', () => {
    const [pp, pf, qf] = e.paare;
    nah(pp!.diff, 1.2428571429); nah(pp!.se, 0.3595620143); nah(pp!.kiLo, 0.2555218844); nah(pp!.kiHi, 2.230192401); nah(pp!.pAnp, 0.0128, 5e-3); expect(pp!.df).toBe(13);
    nah(pf!.diff, 1.8642857143); nah(pf!.se, 0.2701910934); nah(pf!.kiLo, 1.1223575284); nah(pf!.kiHi, 2.606213900);
    nah(qf!.diff, 0.6214285714); nah(qf!.se, 0.2791515827); nah(qf!.pAnp, 0.1329, 5e-3);
  });
});

describe('gemischt, zwei Gruppen (D: gender × Phase)', () => {
  it('Haupteffekte gegen afex, Wechselwirkung F = 0', () => {
    const e = messwiederholung(DATEN_A, ['pre', 'post', 'fup'], GENDER, 'gender');
    nah(e.gruppe!.f, 0.829553767374); nah(e.gruppe!.ssFehler, 113.916666667); nah(e.zeit.f, 13.8620689655); nah(e.zeit.p, 6.54041670696e-05, 1e-5);
    nah(e.sphaer.w, 0.704700429518); nah(e.sphaer.p, 0.102808609503, 1e-6); nah(e.zeit.etaG, 0.184827586207); nah(e.gruppe!.etaG, 0.0436893203883);
    expect(e.wechsel!.f).toBeLessThan(1e-9); expect(e.wechsel!.p).toBeGreaterThan(0.999);
  });
});

describe('Fehlerfälle', () => {
  it('zwei Zeitpunkte: ε = 1, Sphärizität gilt', () => {
    const e = messwiederholung(DATEN_A.map(r => [r[0]!, r[2]!]), ['a', 'b']);
    expect(e.sphaer.gg).toBe(1); expect(e.sphaer.p).toBe(1);
    // F = t² des gepaarten Tests
    nah(e.zeit.f, e.paare[0]!.t ** 2, 1e-9);
  });
  it('Gruppe mit einer Person oder alle Veränderungen gleich: Fehler', () => {
    expect(() => messwiederholung(DATEN_A.slice(0, 4), ['a', 'b', 'c'], ['x', 'x', 'x', 'y'])).toThrow();
    expect(() => messwiederholung([[1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6]], ['a', 'b', 'c'])).toThrow();
  });
});
