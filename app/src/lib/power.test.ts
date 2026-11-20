import { describe, expect, it } from 'vitest';
import {
  chi2Nichtzentral, chi2Quantil, effektAuf, fNichtzentral, fQuantil, kleinsterEffekt, kurveN, leistung, leseZahl, powerKorrelation, satzAPriori, satzSensitivitaet,
  standardPlan, stichprobe, type Plan, type Test
} from './power';

/* Quelle der Prüfwerte: R 4.6 mit `pwr` (Champely), Aufrufe stehen jeweils dabei; Korrelation zusätzlich per Simulation (R, 400 000 Läufe)
 * und gegen G*Power „Correlation: Bivariate normal model“ (exakt). Nichtzentrale Verteilungen: R `pchisq(…, ncp)`, `pf(…, ncp)`. */
const plan = (test: Test, o: Partial<Plan> = {}): Plan => ({ ...standardPlan(test), ...o });
const nenn = (p: Plan, ziel = 0.8) => stichprobe(p, ziel)!;

describe('Verteilungen (gegen R)', () => {
  it('nichtzentrale χ² und F', () => {
    // pchisq(8, 3, ncp = 4) = 0.654755; pf(2.5, 3, 40, ncp = 6) = 0.4518386 (R 4.6)
    expect(chi2Nichtzentral(8, 3, 4)).toBeCloseTo(0.654755, 5);
    expect(fNichtzentral(2.5, 3, 40, 6)).toBeCloseTo(0.4518386, 5);
  });
  it('Quantile', () => {
    // qchisq(.95, 1) = 3.841459; qchisq(.95, 4) = 9.487729; qf(.95, 2, 150) = 3.056366
    expect(chi2Quantil(0.95, 1)).toBeCloseTo(3.841459, 5);
    expect(chi2Quantil(0.95, 4)).toBeCloseTo(9.487729, 5);
    expect(fQuantil(0.95, 2, 150)).toBeCloseTo(3.056366, 5);
  });
});

describe('Stichprobe a priori - die Prüfwerte des Auftrags', () => {
  it('t unabhängig, d = 0,5, α = ,05, zweiseitig, 80 % → 64 je Gruppe', () => {
    // pwr.t.test(d=.5, power=.8) → n = 63.7656; G*Power 3.1: 64 je Gruppe, N = 128
    const e = nenn(plan('unabhaengig', { effekt: 0.5 }));
    expect(e.je).toEqual([64, 64]); expect(e.gesamt).toBe(128); expect(e.power).toBeCloseTo(0.8015, 3);
  });
  it('t unabhängig, einseitig → 51 je Gruppe', () => { // pwr.t.test(d=.5, power=.8, alternative="greater") → 50.1508
    expect(nenn(plan('unabhaengig', { effekt: 0.5, seiten: 1 })).je).toEqual([51, 51]);
  });
  it('t unabhängig, d = 0,2, 90 % → 527; d = 0,8, 95 % → 42', () => { // 526.3332 und 41.5941
    expect(nenn(plan('unabhaengig', { effekt: 0.2 }), 0.9).m).toBe(527);
    expect(nenn(plan('unabhaengig', { effekt: 0.8 }), 0.95).m).toBe(42);
  });
  it('t unabhängig mit Verhältnis 1 : 2', () => { // pwr.t2n.test(n1=40, n2=80, d=.5) → Power 0.7261
    expect(leistung(plan('unabhaengig', { effekt: 0.5 }), [40, 80])).toBeCloseTo(0.7261, 3);
    const e = nenn(plan('unabhaengig', { effekt: 0.5, verhaeltnis: 2 }));
    expect(e.je[1]).toBe(2 * e.je[0]!); expect(e.power).toBeGreaterThanOrEqual(0.8);
    expect(leistung(plan('unabhaengig', { effekt: 0.5, verhaeltnis: 2 }), [e.je[0]! - 1, 2 * (e.je[0]! - 1)])).toBeLessThan(0.8);
  });
  it('gepaart, d_z = 0,5 → 34', () => { // pwr.t.test(d=.5, power=.8, type="paired") → 33.3671; G*Power: 34
    expect(nenn(plan('gepaart', { effekt: 0.5 })).gesamt).toBe(34);
    expect(nenn(plan('gepaart', { effekt: 0.3 }), 0.9).gesamt).toBe(119); // 118.6865
  });
  it('Power-Werte t', () => { // pwr.t.test(d=.4, n=30) → 0.3315; paired d=.4, n=25 → 0.4840
    expect(leistung(plan('unabhaengig', { effekt: 0.4 }), [30, 30])).toBeCloseTo(0.3315, 3);
    expect(leistung(plan('gepaart', { effekt: 0.4 }), [25])).toBeCloseTo(0.484, 3);
  });
  it('Korrelation r = 0,3 → 84 (exakt, wie G*Power); die Fisher-z-/t-Näherung von pwr gäbe 85', () => {
    // pwr.r.test(r=.3, power=.8) → n = 84.0736 (aufgerundet 85); Simulation: Power bei n = 84: 0.8006, bei n = 82: 0.7895
    const e = nenn(plan('korrelation', { effekt: 0.3 }));
    expect(e.gesamt).toBe(84);
    expect(powerKorrelation(0.3, 84, 0.05, 2)).toBeCloseTo(0.8006, 2);
    expect(powerKorrelation(0.3, 82, 0.05, 2)).toBeCloseTo(0.7895, 2);
    expect(powerKorrelation(0.3, 83, 0.05, 2)).toBeLessThan(0.8);
  });
  it('ANOVA f = 0,25, k = 3 → 159 gesamt (53 je Gruppe)', () => { // pwr.anova.test(k=3, f=.25, power=.8) → n = 52.3966
    const e = nenn(plan('anova', { effekt: 0.25, gruppen: 3 }));
    expect(e.m).toBe(53); expect(e.gesamt).toBe(159);
    expect(nenn(plan('anova', { effekt: 0.1, gruppen: 4 }), 0.9).m).toBe(356); // 355.2657
    expect(leistung(plan('anova', { effekt: 0.25, gruppen: 3 }), [40, 40, 40])).toBeCloseTo(0.6757, 3);
  });
  it('Chi² w = 0,3, df = 1 → 88', () => { // pwr.chisq.test(w=.3, df=1, power=.8) → N = 87.2095
    expect(nenn(plan('chi2', { effekt: 0.3, df: 1 })).gesamt).toBe(88);
    expect(nenn(plan('chi2', { effekt: 0.3, df: 4 })).gesamt).toBe(133); // 132.6143
    expect(nenn(plan('chi2', { effekt: 0.1, df: 2 }), 0.9).gesamt).toBe(1266); // 1265.3936
    expect(leistung(plan('chi2', { effekt: 0.3, df: 2 }), [60])).toBeCloseTo(0.5368, 3);
  });
  it('Regression f² = 0,15, 3 Prädiktoren → 77', () => { // pwr.f2.test(u=3, f2=.15, power=.8) → v = 72.7058; N = v + u + 1 = 76.7 → 77 (= G*Power)
    expect(nenn(plan('regression', { effekt: 0.15, praediktoren: 3 })).gesamt).toBe(77);
    expect(nenn(plan('regression', { effekt: 0.02, praediktoren: 5 }), 0.9).gesamt).toBe(830); // v = 823.0275 → 824 + 5 + 1
    expect(leistung(plan('regression', { effekt: 0.15, praediktoren: 3 }), [74])).toBeCloseTo(0.7832, 3); // v = 70
  });
  it('unerreichbar → null', () => {
    expect(stichprobe(plan('unabhaengig', { effekt: 0.0005 }), 0.8)).toBeNull();
  });
});

describe('Sensitivität (kleinster nachweisbarer Effekt)', () => {
  // R: pwr.t.test(n=64, power=.8) → d = 0.4991; n = 100 → 0.3981; pwr.r.test(n=100, power=.8) → r = 0.2759 (t-Näherung);
  // pwr.anova.test(k=3, n=30, power=.8) → f = 0.3329; pwr.chisq.test(N=200, df=2, power=.8) → w = 0.2195; pwr.f2.test(u=3, v=96, power=.8) → f² = 0.1136
  it('t unabhängig', () => {
    expect(kleinsterEffekt(plan('unabhaengig'), 128, 0.8)).toBeCloseTo(0.4991, 3);
    expect(kleinsterEffekt(plan('unabhaengig'), 200, 0.8)).toBeCloseTo(0.3981, 3);
  });
  it('Korrelation (exakt, minimal unter der t-Näherung)', () => { expect(kleinsterEffekt(plan('korrelation'), 100, 0.8)!).toBeCloseTo(0.2759, 2); });
  it('ANOVA, Chi², Regression', () => {
    expect(kleinsterEffekt(plan('anova', { gruppen: 3 }), 90, 0.8)).toBeCloseTo(0.3329, 3);
    expect(kleinsterEffekt(plan('chi2', { df: 2 }), 200, 0.8)).toBeCloseTo(0.2195, 3);
    expect(kleinsterEffekt(plan('regression', { praediktoren: 3 }), 100, 0.8)).toBeCloseTo(0.1136, 3);
  });
  it('zu kleines N → null; Aufrunden auf 0,01', () => {
    expect(kleinsterEffekt(plan('gepaart'), 2, 0.8)).toBeNull();
    expect(effektAuf(0.4991)).toBe(0.5); expect(effektAuf(0.5)).toBe(0.5); expect(effektAuf(0.501)).toBe(0.51);
  });
});

describe('Kurve und Sätze', () => {
  it('Kurve steigt und enthält den gefundenen Punkt', () => {
    const p = plan('unabhaengig', { effekt: 0.5 }), e = nenn(p), k = kurveN(p, e);
    expect(k.some(q => q.x === 128)).toBe(true);
    for (let i = 1; i < k.length; i++) expect(k[i]!.y).toBeGreaterThanOrEqual(k[i - 1]!.y - 1e-9);
  });
  it('Satz a priori, deutsch und englisch', () => {
    const p = plan('unabhaengig', { effekt: 0.5 }), e = nenn(p);
    expect(satzAPriori(p, 0.8, e, { en: false, punkt: false })).toBe(
      'Eine A-priori-Poweranalyse für einen t-Test für unabhängige Stichproben (d = 0,50, α = ,05, 1 − β = ,80, zweiseitig) ergab einen Stichprobenumfang von N = 128 (64 je Gruppe). Die Berechnung erfolgte in Statable über die nichtzentrale t-Verteilung, im Rechenweg wie G*Power.');
    expect(satzAPriori(p, 0.8, e, { en: true, punkt: false })).toBe(
      'An a priori power analysis for an independent-samples t test (d = 0.50, α = .05, 1 − β = .80, two-tailed) yielded a required sample size of N = 128 (64 per group). It was computed in Statable using the noncentral t distribution, following the procedure of G*Power.');
  });
  it('Satz ANOVA und Sensitivität', () => {
    const p = plan('anova', { effekt: 0.25, gruppen: 3 });
    expect(satzAPriori(p, 0.8, nenn(p), { en: false, punkt: false })).toContain('N = 159 (53 je Gruppe)');
    expect(satzAPriori(p, 0.8, nenn(p), { en: false, punkt: false })).toContain('3 Gruppen');
    const q = plan('unabhaengig');
    expect(satzSensitivitaet(q, 0.8, 128, 0.5, { en: false, punkt: false })).toContain('(N = 128, α = ,05, 1 − β = ,80, zweiseitig) ergab, dass sich Effekte ab d = 0,50 nachweisen lassen');
  });
  it('Zahlen lesen', () => {
    expect(leseZahl('0,35')).toBe(0.35); expect(leseZahl(' .5 ')).toBe(0.5); expect(leseZahl('1.25')).toBe(1.25);
    expect(leseZahl('abc')).toBeNaN(); expect(leseZahl('')).toBeNaN();
  });
});

/* Abschlusstest F4 (10.10.2026): Beim gepaarten t-Test gibt man d ein (wie in Studien berichtet) und die erwartete Korrelation r vorher-nachher;
 * gerechnet wird mit d_z = d / √(2 (1 − r)) (Lakens 2013). Prüfwerte: scripts/power-gepaart-erwartet.R (pwr.t.test(type = "paired")). */
describe('Abschlusstest F4: gepaart mit d und Korrelation r', () => {
  it('dzAus: d und r → dz', async () => {
    const { dzAus } = await import('./power');
    expect(dzAus(0.5, 0.5)).toBeCloseTo(0.5, 12); expect(dzAus(0.5, 0.7)).toBeCloseTo(0.645497, 6); expect(dzAus(0.4, 0)).toBeCloseTo(0.282843, 6);
  });
  it('Stichprobe wie pwr', () => {
    expect(standardPlan('gepaart').rPaar).toBe(0.5);
    expect(nenn(plan('gepaart', { effekt: 0.5, rPaar: 0.5 })).gesamt).toBe(34);
    expect(nenn(plan('gepaart', { effekt: 0.5, rPaar: 0.7 })).gesamt).toBe(21);
    expect(nenn(plan('gepaart', { effekt: 0.3, rPaar: 0.8 }), 0.9).gesamt).toBe(49);
    expect(nenn(plan('gepaart', { effekt: 0.8, rPaar: 0.2 })).gesamt).toBe(22);
    expect(nenn(plan('gepaart', { effekt: 0.4, rPaar: 0 })).gesamt).toBe(101);
  });
  it('Sensitivität: kleinstes d bei N = 30, r = ,60 (dz = 0,5292 → d = 0,4734)', () => {
    expect(kleinsterEffekt(plan('gepaart', { rPaar: 0.6 }), 30, 0.8)).toBeCloseTo(0.473362, 4);
  });
  it('Satz nennt d, r und dz', () => {
    const p = plan('gepaart', { effekt: 0.5, rPaar: 0.7 });
    expect(satzAPriori(p, 0.8, nenn(p), { en: false, punkt: false })).toBe('Eine A-priori-Poweranalyse für einen t-Test für gepaarte Stichproben (d = 0,50, erwartete Korrelation vorher-nachher r = ,70, also dz = 0,65, α = ,05, 1 − β = ,80, zweiseitig) ergab einen Stichprobenumfang von N = 21. Die Berechnung erfolgte in Statable über die nichtzentrale t-Verteilung, im Rechenweg wie G*Power.');
    expect(satzAPriori(p, 0.8, nenn(p), { en: true, punkt: false })).toContain('(d = 0.50, expected before-after correlation r = .70, hence dz = 0.65, α = .05');
    expect(satzSensitivitaet(plan('gepaart', { rPaar: 0.6 }), 0.8, 30, 0.48, { en: false, punkt: false })).toContain('Effekte ab d = 0,48 (dz = 0,54) nachweisen lassen');
  });
});
