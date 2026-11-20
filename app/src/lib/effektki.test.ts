import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { korrigiereAusgabe } from '../engine/korrektur';
import { leseCsv, zurEngine } from './einlesen';
import { alphaBereich, eta2Bereich, lambdaF, oddsRatio2x2, omega2, vBereich } from './effektki';
import { anova, betaBereich, kreuz, saetzeAnova, saetzeKreuz, saetzeSkala, saetzeVorhersage, skala, vorhersage } from './ergebnis';
import { nodeEngine } from './testengine';

/* Vergleichswerte aus R 4.6 (Skript: scripts/effekte-erwartet.R; Pakete effectsize 1.0.3, psych, MBESS):
 * η²/R²: Grenze = λ/(λ + df_Fehler), λ aus pf(F, df1, df2, ncp = λ) = 0,975 bzw. 0,025 (uniroot; effectsize::eta_squared(alternative = "two.sided") liefert dieselben 6 Stellen).
 * Cramérs V (ohne Korrektur): √(λ/(n·min(r−1, c−1))) mit λ aus pchisq(χ², df, ncp = λ); effectsize::cramers_v(adjust = FALSE, alternative = "two.sided").
 * Odds Ratio: Wald (effectsize::oddsratio). Alpha: Feldt (psych::alpha()$feldt). Daten: pruefdaten/ (R-Datensätze ToothGrowth, warpbreaks, mtcars; psych::bfi). */
const nah = (ist: number, soll: number, tol = 1e-5) => expect(Math.abs(ist - soll)).toBeLessThan(tol);
const paar = (ist: [number, number], soll: [number, number], tol = 1e-5) => { nah(ist[0], soll[0], tol); nah(ist[1], soll[1], tol); };

describe('Effektstärke-Intervalle gegen R', () => {
  it('η² (einfaktorielle ANOVA): ToothGrowth, warpbreaks, Schlafdaten (untere Grenze 0 bei nicht signifikant)', () => {
    paar(eta2Bereich(67.415738, 2, 57), [0.567120, 0.785387]);
    paar(eta2Bereich(7.206114, 2, 51), [0.040427, 0.394897]);
    paar(eta2Bereich(1.582622, 4, 115), [0, 0.123493]);
    paar(eta2Bereich(12.493415, 4, 115), [0.156793, 0.415160]);
    paar(lambdaF(67.415738, 2, 57), [74.676089, 208.594796], 1e-4);
  });
  it('R² (Regression, feste Prädiktoren): mtcars, Schlafdaten', () => {
    paar(eta2Bereich(69.211213, 2, 29), [0.692485, 0.889687]);
    paar(eta2Bereich(91.375325, 1, 30), [0.578876, 0.841709]);
    paar(eta2Bereich(2.778929, 2, 112), [0, 0.134809]);
  });
  it('Cramérs V: 3 × 2, 2 × 2, nicht signifikant (untere Grenze 0)', () => {
    paar(vBereich(8.740733, 2, 32, 1), [0.111823, 0.845531]);
    paar(vBereich(7.161400, 1, 32, 1), [0.125514, 0.819544]);
    paar(vBereich(1.827674, 2, 120, 1), [0, 0.279381]);
    paar(vBereich(0.805478, 4, 120, 1), [0, 0.132061]);
  });
  it('ω²: wie effectsize::omega_squared', () => {
    nah(omega2(2426.434333, 2, 1025.775, 57), 0.688847);
    nah(omega2(2034.259259, 2, 7198.555556, 51), 0.186897);
    nah(omega2(951.243594, 4, 17280.348073, 115), 0.019051);
    nah(omega2(160.506689, 4, 369.359977, 115), 0.276994);
    expect(omega2(1, 4, 100, 20)).toBe(0);   // F < 1: nicht unter 0
  });
  it('Odds Ratio mit Wald-Intervall; leere Zelle = nicht bestimmt', () => {
    const o = oddsRatio2x2([[3, 16], [8, 5]])!;   // mtcars: am × (cyl > 4)
    nah(o.or, 0.117188); nah(o.lo, 0.022192); nah(o.hi, 0.618825);
    expect(oddsRatio2x2([[0, 4], [3, 5]])).toBeNull();
  });
  it('Cronbachs Alpha nach Feldt (bfi: A1-A5, C1-C5, N1-N3)', () => {
    paar(alphaBereich(0.430617, 2709, 5), [0.395999, 0.463829]);
    paar(alphaBereich(-0.289004, 2707, 5), [-0.367403, -0.213788]);
    paar(alphaBereich(0.819487, 2748, 3), [0.807474, 0.830870]);
  });
});

describe('Effekt und Intervall im Ergebnis (echte Engine)', () => {
  let e: Awaited<ReturnType<typeof nodeEngine>>;
  const lade = (pfad: string) => { const b = zurEngine(leseCsv(readFileSync(new URL(pfad, import.meta.url), 'utf8'))); e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv }); };
  const rechne = (syntax: string) => korrigiereAusgabe(e.run(syntax));
  const id = (n: string) => n;
  beforeAll(async () => { e = await nodeEngine(); });

  it('ANOVA ToothGrowth: F, η² und Intervall in der APA-Zeile, ω² und Marken', () => {
    lade('../../../pruefdaten/d1-toothgrowth.csv');
    const r = anova(rechne('ONEWAY len BY dose\n  /STATISTICS=DESCRIPTIVES HOMOGENEITY.'), 'len', 'dose');
    expect([r.gruppen.length, r.n, r.dfZwischen, r.dfInnerhalb]).toEqual([3, 60, 2, 57]);
    nah(r.ssZwischen, 2426.434333, 1e-3); nah(r.f, 67.415738, 1e-4);
    const st = saetzeAnova(r, id);
    // Welch ist immer das Hauptergebnis (F2; R oneway.test: F = 68,401, df = 2 / 37,743), die klassische mit η² daneben; Games-Howell für alle drei Paare (R: scripts/posthoc-erwartet.R)
    expect(st.apa).toMatch(/^Welch-F\(2; 37,7\) = 68,40, p < ,001; klassisch: F\(2, 57\) = 67,42, p < ,001, η² = ,70, 95 %-KI \[,57; ,79\]; Games-Howell: .+ \(p < ,001\), .+ \(p < ,001\), .+ \(p < ,001\)$/);
    expect(st.zusatz).toContain('ω² beträgt ,69');
    expect(st.zusatz).toContain('Nach dem Paarvergleich (Games-Howell, für alle 3 Paare angepasst)');
    expect(st.marken.map(m => m.text)).toContain('Paarvergleich: Games-Howell (Standard)');
    expect(saetzeAnova(r, id, 'tukey').zusatz).toContain('Tukey HSD');
    expect(st.marken.map(m => m.text)).toContain('Plausibler Bereich für η²: ,57 bis ,79');
  });
  it('ANOVA warpbreaks (signifikant) und Schlafdaten (nicht signifikant, Levene)', () => {
    lade('../../../pruefdaten/d1-warpbreaks.csv');
    expect(saetzeAnova(anova(rechne('ONEWAY breaks BY tension\n  /STATISTICS=DESCRIPTIVES HOMOGENEITY.'), 'breaks', 'tension'), id).apa).toMatch(/^Welch-F\(2; 32,3\) = 5,80, p = ,007; klassisch: F\(2, 51\) = 7,21, p = ,002, η² = ,22, 95 %-KI \[,04; ,39\]; Games-Howell: .+ \(p = ,006\)$/);
    lade('./testdaten/schlaf-und-konzentration.csv');
    const st = saetzeAnova(anova(rechne('ONEWAY konzentration BY semester\n  /STATISTICS=DESCRIPTIVES HOMOGENEITY.'), 'konzentration', 'semester'), id);
    // Welch ist das Hauptergebnis (R oneway.test: F = 1.6969, df = 4 / 10.558, p = .223), die klassische dahinter; Gesamttest nicht deutlich → keine Paarvergleiche; Levene p = ,013 nur beschreibend
    expect(st.apa).toBe('Welch-F(4; 10,6) = 1,70, p = ,223; klassisch: F(4, 115) = 1,58, p = ,184, η² = ,05, 95 %-KI [,00; ,12]');
    expect(st.zusatz).not.toContain('Paarvergleich');
    expect(st.zusatz).toContain('belegen darum keinen Unterschied');
    expect(st.vorsicht).toContain('Levene-Test spricht gegen gleich große Streuung in den Gruppen (p = ,013)');
    expect(st.marken.some(m => m.hinweis && m.erklaer === 'voraussetzung')).toBe(false);
  });
  it('Kreuztabelle mtcars 3 × 2: V mit Intervall; 2 × 2: zusätzlich Odds Ratio', () => {
    lade('../../../pruefdaten/d1-mtcars.csv');
    const r = kreuz(rechne('CROSSTABS /TABLES=cyl BY am\n  /STATISTICS=CHISQ\n  /CELLS=COUNT ROW EXPECTED.'));
    expect(saetzeKreuz(r).apa).toBe('χ²(2, N = 32) = 8,74, p = ,013, V = ,52, 95 %-KI [,11; ,85]');
    const daten = [[3, 16], [8, 5]].flatMap((reihe, g) => reihe.flatMap((n, b) => Array.from({ length: n }, () => `${g} ${b}`))).join('\n');
    const z = kreuz(rechne(`NEW FILE.\nDATA LIST FREE /am vier.\nBEGIN DATA\n${daten}\nEND DATA.\nCROSSTABS /TABLES=am BY vier\n  /STATISTICS=CHISQ\n  /CELLS=COUNT ROW EXPECTED.`));
    expect(z.zaehlung?.tab).toEqual([[3, 16], [8, 5]]);
    const st = saetzeKreuz(z);
    expect(st.apa).toBe('χ²(1, N = 32) = 7,16, p = ,007, V = ,47, 95 %-KI [,13; ,82]; OR = 0,12, 95 %-KI [0,02; 0,62]; exakter Fisher-Test: p = ,021');   // T1: kleine Zellen, Fisher daneben
    expect(st.zusatz).toContain('V gleich φ');
    expect(st.marken.map(m => m.text)).toContain('Odds Ratio = 0,12');
  });
  it('Regression mtcars: R² mit Intervall, β mit Intervall (= B-Intervall · sx/sy)', () => {
    lade('../../../pruefdaten/d1-mtcars.csv');
    const r = vorhersage(rechne('REGRESSION\n  /VARIABLES=wt hp\n  /DEPENDENT=mpg\n  /METHOD=ENTER\n  /STATISTICS=COEFF R ANOVA CI(95).'), 'mpg');
    const st = saetzeVorhersage(r, id);
    expect(st.apa).toBe('R² = ,83, 95 %-KI [,69; ,89], F(2, 29) = 69,21, p < ,001');
    const [wt, hp] = r.praediktoren.map(betaBereich);
    paar(wt!, [-0.839645, -0.419464], 1e-4); paar(hp!, [-0.571542, -0.151360], 1e-4);   // effectsize::standardize_parameters
    expect(st.zusatz).toContain('β = −,63, 95 %-KI [−,84; −,42]');
    const einfach = saetzeVorhersage(vorhersage(rechne('REGRESSION\n  /VARIABLES=wt\n  /DEPENDENT=mpg\n  /METHOD=ENTER\n  /STATISTICS=COEFF R ANOVA CI(95).'), 'mpg'), id);
    expect(einfach.apa).toMatch(/^R² = ,75, 95 %-KI \[,58; ,84\], F\(1, 30\) = 91,38, p < ,001; B = −5,34, 95 %-KI \[−6,49; −4,20\]; β = −,87, 95 %-KI \[−1,05; −,68\]$/);
  });
  it('Skala bfi A1-A5: Alpha mit Feldt-Intervall', () => {
    lade('../../../pruefdaten/d2-bfi.csv');
    const r = skala(rechne('RELIABILITY /VARIABLES=A1 A2 A3 A4 A5 /MODEL=ALPHA /SUMMARY=TOTAL.'));
    expect(saetzeSkala(r).apa).toBe('Cronbachs α = ,43, 95 %-KI [,40; ,46] (5 Items, n = 2709)');
  });
});
