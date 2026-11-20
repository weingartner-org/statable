import { describe, expect, it } from 'vitest';
import { bfGepaart, bfKorrelation, bfStufe, bfUnabhaengig } from './bayes';

/* Vergleichswerte aus R 4.6 (Skript: scripts/bayes-erwartet.R; BayesFactor 0.9.12-4.8, hypergeo):
 * t-Test: ttest.tstat(rscale = √2/2) = JZS-Faktor nach Rouder et al. (2009) mit Cauchy-Prior r = √2/2 (JASP-Standard).
 * Korrelation: Ly, Verhagen & Wagenmakers (2016) mit Beta(1,1) auf ρ (JASP, κ = 1); stimmt mit correlationBF(rscale = 1) überein
 * (mtcars mpg gegen wt: 77198223,08). correlationBF mit dem Standard „medium“ (1/3) ist ein anderer Prior (13286626,31). */
const rel = (ist: number, soll: number, tol = 2e-5) => expect(Math.abs(ist / soll - 1)).toBeLessThan(tol);

describe('Bayes-Faktor t-Test gegen R', () => {
  it('unabhängige Stichproben (Student-t)', () => {
    rel(bfUnabhaengig(2.5, 20, 25), 3.368474);
    rel(bfUnabhaengig(1.0, 15, 15), 0.502322);
    rel(bfUnabhaengig(0.3, 40, 40), 0.241614);
    rel(bfUnabhaengig(4.2, 12, 30), 151.467752);
    rel(bfUnabhaengig(-3.1, 8, 9), 6.519748);
    rel(bfUnabhaengig(4.03277, 10, 10), 36.547146, 1e-5);   // ToothGrowth, 1 mg, ttestBF auf Rohdaten
  });
  it('gepaart / eine Stichprobe', () => {
    rel(bfGepaart(2.2, 15), 1.664779);
    rel(bfGepaart(5.1, 14), 154.544624);
    rel(bfGepaart(0.4, 30), 0.209328);
    rel(bfGepaart(-1.9, 10), 1.140058);
    rel(bfGepaart(3.3, 100), 16.994055);
  });
});

describe('Bayes-Faktor Pearson-Korrelation gegen R (Ly et al. 2016, κ = 1)', () => {
  it('verschiedene r und n', () => {
    rel(bfKorrelation(0.5, 20), 2.915945);
    rel(bfKorrelation(0.1, 30), 0.258961);
    rel(bfKorrelation(-0.62, 12), 2.827992);
    rel(bfKorrelation(0.85, 50), 1202493340532.822, 1e-6);
    rel(bfKorrelation(0.3, 200), 915.836397);
    rel(bfKorrelation(0.05, 500), 0.104224);
    rel(bfKorrelation(-0.8676593765, 32), 77198223.08);
  });
});

describe('Einordnung nach Lee & Wagenmakers (2013)', () => {
  it('Stufen und Richtung', () => {
    expect(bfStufe(2)).toEqual({ stufe: 'anekdotisch', fuer: 'H1' });
    expect(bfStufe(8.4).stufe).toBe('moderat');
    expect(bfStufe(12).stufe).toBe('stark');
    expect(bfStufe(50).stufe).toBe('sehr-stark');
    expect(bfStufe(150).stufe).toBe('extrem');
    expect(bfStufe(0.2)).toEqual({ stufe: 'moderat', fuer: 'H0' });
    expect(bfStufe(1).fuer).toBe('keins');
  });
});

describe('Texte zum Bayes-Faktor', () => {
  it('Schreibweise und Richtung', async () => {
    const { bfText, bayesPraePost, bayesZusammenhang } = await import('./bayessaetze');
    expect(bfText(8.4)).toBe('8,4'); expect(bfText(250.3)).toBe('250'); expect(bfText(1.2e12)).toBe('1,2 × 10¹²'); expect(bfText(Infinity)).toBe('> 1 × 10³⁰⁰');
    const p = bayesPraePost({ t: 5.1, n: 14, df: 13 } as never)!;
    expect(p.kurz).toBe('BF₁₀ = 155'); expect(p.satz).toContain('wahrscheinlicher unter der Annahme einer Veränderung als ohne'); expect(p.einordnung).toContain('extreme Evidenz für H₁');
    const k = bayesZusammenhang({ r: 0.1, n: 30 } as never)!;
    expect(k.kurz).toBe('BF₀₁ = 3,9'); expect(k.satz).toContain('wahrscheinlicher ohne Zusammenhang als unter der Annahme eines Zusammenhangs'); expect(k.einordnung).toContain('moderate Evidenz für H₀');
    expect(bayesZusammenhang({ r: 0.5, n: 20, methode: 'spearman' } as never)).toBeNull();
  });
});

import { logBF10Regression, R_REGRESSION } from './bayes';
/* Regression: Sollwerte R am Mac (R 4.6.1, BayesFactor 0.9.12-4.8): lmBF(Formel, data, rscaleCont = „medium“ = √2/4); R² aus lm. */
describe('Bayes-Faktor für lineare Regression gegen BayesFactor::lmBF', () => {
  const FALL: [string, number, number, number, number][] = [
    ['mtcars: mpg ~ wt', 0.752832793658, 32, 1, 17.63668898], ['mtcars: mpg ~ wt + hp', 0.826785451883, 32, 2, 20.48570334], ['mtcars: mpg ~ wt + hp + qsec', 0.834767761706, 32, 3, 19.14607087],
    ['mtcars: mpg ~ disp', 0.71834334049, 32, 1, 15.78644895], ['longley: Employed ~ GNP + Year', 0.973455623677, 16, 2, 18.37802068]
  ];
  for (const [name, r2, n, p, soll] of FALL) it(`${name}: ln BF₁₀ = ${soll}`, () => { expect(Math.abs(logBF10Regression(r2, n, p) - soll)).toBeLessThan(2e-4); });
  it('andere Skala r = 1 (mpg ~ wt)', () => { expect(Math.abs(logBF10Regression(0.752832793658, 32, 1, 1) - 18.38327)).toBeLessThan(2e-4); });
  it('Standard-Skala ist √2/4; ohne Effekt (R² = 0) spricht der Faktor für H₀', () => {
    expect(R_REGRESSION).toBeCloseTo(0.35355339, 8); expect(logBF10Regression(0, 40, 2)).toBeLessThan(0); expect(Number.isNaN(logBF10Regression(0.5, 2, 2))).toBe(true);
  });
});

import { bayesVorhersage } from './bayessaetze';
import { s } from './sitzung.svelte';
import type { Vorhersage } from './ergebnis';
describe('Bayes-Faktor-Zeile zur linearen Regression', () => {
  const vh = (extra: Partial<Vorhersage> = {}): Vorhersage => ({ art: 'vorhersage', ziel: 'mpg', r2: 0.752832793658, r2korr: 0.7446, f: 91.38, df1: 1, df2: 30, p: 1.3e-10, praediktoren: [{ name: 'wt', b: -5.34, beta: -0.87, p: 1e-10, lo: -6.4, hi: -4.2 }], ...extra });
  it('BF₁₀ für mtcars (mpg ~ wt) wie BayesFactor, mit Einordnung und Prior-Angabe', () => {
    s.einst.sprache = 'de'; s.einst.zahl = 'komma';
    const z = bayesVorhersage(vh())!;
    expect(Math.abs(Math.log(z.bf10) - 17.63668898)).toBeLessThan(2e-4);
    expect(z.kurz).toContain('BF₁₀ = 4,6 × 10⁷'); expect(z.kopf).toContain('extreme'); expect(z.fachleute).toContain('r = √2/4'); expect(z.fachleute).toContain('n = 32');
  });
  it('mit Gruppen-Prädiktor (Faktor) kein Bayes-Faktor', () => {
    const f = vh({ praediktoren: [{ name: 'Gruppe: B', b: 1, beta: 0.2, p: 0.5, lo: -1, hi: 2, faktor: { wert: 'B', stufe: 'B', referenz: 'A' } }] });
    expect(bayesVorhersage(f)).toBeNull();
  });
});

import { logBF10Anova, R_ANOVA } from './bayes';
/* Einfaktorielle Varianzanalyse: Sollwerte R am Mac (BayesFactor 0.9.12-4.8): anovaBF(y ~ f), rscaleFixed = „medium“ (0,5); η² aus aov. */
describe('Bayes-Faktor für die einfaktorielle Varianzanalyse gegen BayesFactor::anovaBF', () => {
  const FALL: [string, number[], number[], number, number, number?][] = [
    ['PlantGrowth (3 × 10)', [10, 10, 10], [5.032, 4.661, 5.526], 0.264148296832, 1.360205663],
    ['ToothGrowth, Dosis (3 × 20)', [20, 20, 20], [10.605, 19.735, 26.1], 0.702864194794, 29.23718094],
    ['InsectSprays (6 × 12)', [12, 12, 12, 12, 12, 12], [14.5, 15.33333333, 2.083333333, 4.916666667, 3.5, 16.66666667], 0.724439015563, 32.64611702],
    ['chickwts (6 Gruppen, ungleich groß)', [12, 10, 12, 11, 14, 12], [323.5833333, 160.2, 218.75, 276.9090909, 246.4285714, 328.9166667], 0.541685465674, 16.45940383],
    ['PlantGrowth, r = 1', [10, 10, 10], [5.032, 4.661, 5.526], 0.264148296832, 1.118704389, 1]
  ];
  for (const [name, n, m, eta, soll, r] of FALL) it(`${name}: ln BF₁₀ = ${soll}`, () => { expect(Math.abs(logBF10Anova(n, m, eta, r) - soll)).toBeLessThan(5e-4); });
  it('Standard-Skala 0,5; ohne Unterschied der Mittel spricht der Faktor für H₀; ungültige Eingaben ergeben NaN', () => {
    expect(R_ANOVA).toBe(0.5); expect(logBF10Anova([10, 10, 10], [5, 5, 5], 0)).toBeLessThan(0);
    expect(Number.isNaN(logBF10Anova([5], [1], 0.1))).toBe(true);
  });
});

import { bayesAnova } from './bayessaetze';
import type { Anova } from './ergebnis';
describe('Bayes-Faktor-Zeile zur Varianzanalyse', () => {
  it('PlantGrowth: BF₁₀ wie anovaBF, Einordnung und Prior-Angabe im Satz', () => {
    s.einst.sprache = 'de'; s.einst.zahl = 'komma';
    const sst = 14.25843, eta = 0.264148296832, e: Anova = { art: 'anova', abhaengig: 'weight', gruppenSpalte: 'group', n: 30, gruppen: [{ name: 'ctrl', n: 10, m: 5.032, sd: 0.58 }, { name: 'trt1', n: 10, m: 4.661, sd: 0.79 }, { name: 'trt2', n: 10, m: 5.526, sd: 0.44 }], ssZwischen: sst * eta, ssInnerhalb: sst * (1 - eta), dfZwischen: 2, dfInnerhalb: 27, f: 4.846, p: 0.0159 };
    const z = bayesAnova(e)!;
    expect(Math.abs(Math.log(z.bf10) - 1.360205663)).toBeLessThan(5e-4);
    expect(z.kurz).toContain('BF₁₀ = 3,9'); expect(z.kopf).toContain('moderate'); expect(z.fachleute).toContain('r = 0,5'); expect(z.fachleute).toContain('3 Gruppen');
  });
});
