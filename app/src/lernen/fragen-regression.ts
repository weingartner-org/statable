/**
 * Üben: Lineare Regression. Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json
 * (scripts/ueben-erwartet.R, Daten: datasets::swiss, cars, mtcars, ToothGrowth).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { diag, tab, W, za, zae, zd, ze, zn, zp } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const HILFE = ['frage-vorhersage', 'regression'];
const HB = [...HILFE, 'koeffizient-b', 'beta'];

const KOEF_KOPF = [P('Größe', 'Term'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('Beta', 'Beta'), P('t', 't'), P('Sig.', 'Sig.')];
const UEBERS_KOPF = [P('Modell', 'Model'), P('R', 'R'), P('R²', 'R²'), P('Korrigiertes R²', 'Adjusted R²'), P('Standardfehler des Schätzers', 'Std. error of the estimate')];
const QUELLE_SWISS = P(
  `Daten: datasets::swiss (Mosteller und Tukey 1977; Teil von R, Lizenz GPL), ${zn('ra_n')} französischsprachige Bezirke der Schweiz um 1888. Lineare Regression, berechnet mit R.`,
  `Data: datasets::swiss (Mosteller and Tukey 1977; part of R, licence GPL), ${zn('ra_n')} French-speaking districts of Switzerland around 1888. Linear regression, computed with R.`);
const QUELLE_CARS = P(
  `Daten: datasets::cars (Ezekiel 1930; Teil von R, Lizenz GPL), ${zn('rb_n')} Fahrversuche aus den 1920er Jahren. Lineare Regression, berechnet mit R.`,
  `Data: datasets::cars (Ezekiel 1930; part of R, licence GPL), ${zn('rb_n')} driving trials from the 1920s. Linear regression, computed with R.`);
const QUELLE_MT = P(
  'Daten: datasets::mtcars (Henderson und Velleman 1981; Teil von R, Lizenz GPL), Wagen der Baujahre 1973/74. Lineare Regression, berechnet mit R.',
  'Data: datasets::mtcars (Henderson and Velleman 1981; part of R, licence GPL), cars of model years 1973/74. Linear regression, computed with R.');
const QUELLE_ZAHN = P(
  `Daten: datasets::ToothGrowth (Bliss 1952; Teil von R, Lizenz GPL), ${zn('rz_n')} Meerschweinchen, Zahnlänge. Lineare Regression, berechnet mit R.`,
  `Data: datasets::ToothGrowth (Bliss 1952; part of R, licence GPL), ${zn('rz_n')} guinea pigs, tooth length. Linear regression, computed with R.`);

const QUELLE_SW_KL = P(
  `Daten: datasets::swiss (Mosteller und Tukey 1977; Teil von R, Lizenz GPL), ${zn('kl_n')} französischsprachige Schweizer Bezirke um 1888, Zielgröße Fruchtbarkeit. Der VIF folgt aus der Regression jedes Prädiktors auf die übrigen. Berechnet mit R.`,
  `Data: datasets::swiss (Mosteller and Tukey 1977; part of R, licence GPL), ${zn('kl_n')} French-speaking Swiss districts around 1888, outcome fertility. The VIF follows from regressing each predictor on the others. Computed with R.`);
const QUELLE_CARS_RV = P(
  `Daten: datasets::cars (Ezekiel 1930; Teil von R, Lizenz GPL), ${zn('rv_n')} Fahrversuche aus den 1920er Jahren, Bremsweg auf Geschwindigkeit (Meilen pro Stunde). Berechnet mit R.`,
  `Data: datasets::cars (Ezekiel 1930; part of R, licence GPL), ${zn('rv_n')} driving trials from the 1920s, stopping distance on speed (miles per hour). Computed with R.`);

const QUELLE_MT_AM = P(
  `Daten: datasets::mtcars (Henderson und Velleman 1981; Teil von R, Lizenz GPL), ${zn('rt_n')} Wagen der Baujahre 1973/74. Getriebe am: 0 = Automatik, 1 = Handschaltung. Lineare Regression, berechnet mit R.`,
  `Data: datasets::mtcars (Henderson and Velleman 1981; part of R, licence GPL), ${zn('rt_n')} cars of model years 1973/74. Transmission am: 0 = automatic, 1 = manual. Linear regression, computed with R.`);
const QUELLE_C93 = P(
  `Daten: MASS::Cars93 (Lock 1993; Paket MASS, Lizenz GPL-2 oder GPL-3), ${zn('rs_n2')} Automodelle auf dem US-Markt 1993, Reichweite im Stadtverkehr (MPG.city). Das Gewicht ist aus Pfund in 100 kg umgerechnet. Lineare Regression, berechnet mit R.`,
  `Data: MASS::Cars93 (Lock 1993; package MASS, licence GPL-2 or GPL-3), ${zn('rs_n2')} car models on the US market in 1993, city miles per gallon (MPG.city). Weight is converted from pounds to 100 kg. Linear regression, computed with R.`);
const QUELLE_STUDIEN = P(
  `Daten: datasets::mtcars (Henderson und Velleman 1981; Teil von R, GPL) und MASS::Cars93 (Lock 1993; Paket MASS, GPL-2 oder GPL-3). Studie 1: ${zn('rs_n1')} Wagen, Studie 2: ${zn('rs_n2')} Automodelle. Lineare Regression, berechnet mit R.`,
  `Data: datasets::mtcars (Henderson and Velleman 1981; part of R, GPL) and MASS::Cars93 (Lock 1993; package MASS, GPL-2 or GPL-3). Study 1: ${zn('rs_n1')} cars, study 2: ${zn('rs_n2')} car models. Linear regression, computed with R.`);

const QUELLE_IRIS_REG = P(
  'Daten: datasets::iris (Anderson 1935, Fisher 1936; Teil von R, Lizenz GPL), 150 Schwertlilien dreier Arten, Länge und Breite des Kelchblatts. Lineare Regression, berechnet mit R.',
  'Data: datasets::iris (Anderson 1935, Fisher 1936; part of R, licence GPL), 150 irises of three species, sepal length and width. Linear regression, computed with R.');

// Nachtrag 02.11.: Deckeneffekt, r über 0,9, kleine Stichprobe
const QUELLE_BFI_DK = P(
  'Daten: psych::bfi (SAPA-Projekt 2010, Fragen aus dem IPIP; Paket psych, Lizenz GPL ≥ 2), Rohantworten ohne Umpolen. A4: Freude an Kindern, C1: Genauigkeit bei der Arbeit, E1: wenig reden. Berechnet mit R.',
  'Data: psych::bfi (SAPA project 2010, items from the IPIP; package psych, licence GPL ≥ 2), raw answers without reverse-coding. A4: enjoying children, C1: exactness in one\'s work, E1: talking little. Computed with R.');
const QUELLE_MT_DK = P(
  `Daten: datasets::mtcars (Henderson und Velleman 1981; Teil von R, Lizenz GPL), ${zn('dkw_n')} Wagen der Baujahre 1973/74. Zweite Zeile: Simulation, alle Werte ab ${zn('dkw_grenze')} mpg (${zn('dkw_nmax')} Wagen, ${zp('dkw_anteil')} Prozent) wurden auf ${zn('dkw_grenze')} gesetzt. Lineare Regression, berechnet mit R.`,
  `Data: datasets::mtcars (Henderson and Velleman 1981; part of R, licence GPL), ${zn('dkw_n')} cars of model years 1973/74. Second row: simulation, all values from ${zn('dkw_grenze')} mpg (${zn('dkw_nmax')} cars, ${zp('dkw_anteil')} percent) were set to ${zn('dkw_grenze')}. Linear regression, computed with R.`);
const QUELLE_R9 = P(
  'Rechenbeispiel ohne Daten: zwei Größen mit genau der angegebenen Korrelation, keine weiteren Größen im Modell. Toleranz = 1 minus r², VIF = 1 durch Toleranz. Berechnet mit R; zweiter Weg über die Regression der einen Größe auf die andere.',
  'Worked example without data: two variables with exactly the stated correlation, no further variables in the model. Tolerance = 1 minus r², VIF = 1 divided by tolerance. Computed with R; second route via the regression of one variable on the other.');
const QUELLE_IRIS_R9 = P(
  `Daten: datasets::iris (Anderson 1935, Fisher 1936; Teil von R, Lizenz GPL), ${zn('r9i_n')} Schwertlilien dreier Arten zusammen. Lineare Regression, berechnet mit R.`,
  `Data: datasets::iris (Anderson 1935, Fisher 1936; part of R, licence GPL), ${zn('r9i_n')} irises of three species taken together. Linear regression, computed with R.`);
const QUELLE_MT_R9 = P(
  `Daten: datasets::mtcars (Henderson und Velleman 1981; Teil von R, Lizenz GPL), ${zn('r9m_n')} Wagen der Baujahre 1973/74. disp: Hubraum, hp: Leistung, wt: Gewicht, drat: Hinterachsübersetzung, qsec: Zeit für die Viertelmeile. Berechnet mit R.`,
  `Data: datasets::mtcars (Henderson and Velleman 1981; part of R, licence GPL), ${zn('r9m_n')} cars of model years 1973/74. disp: displacement, hp: power, wt: weight, drat: rear axle ratio, qsec: quarter-mile time. Computed with R.`);
const QUELLE_ETA = P(
  'Simulation ohne Datensatz, berechnet mit R: drei Gruppen mit Zufallswerten aus derselben Normalverteilung, Startwert festgelegt. Die Formel für die Verzerrung gilt für η² bei fehlendem Zusammenhang.',
  'Simulation without a data set, computed with R: three groups with random values from the same normal distribution, seed fixed. The formula for the bias holds for η² when there is no relation.');
const QUELLE_HG = P(
  'Rechenbeispiel ohne Daten: Faktor 1 minus 3 durch (4 mal (n1 plus n2 minus 2) minus 1), berechnet mit R; der genaue Faktor aus Gammafunktionen weicht um weniger als ein Tausendstel ab.',
  'Worked example without data: factor 1 minus 3 divided by (4 times (n1 plus n2 minus 2) minus 1), computed with R; the exact factor from gamma functions differs by less than a thousandth.');
const QUELLE_RM = P(
  'Rechenbeispiel ohne Daten: Pearson-Korrelation, zweiseitiger Test, r = t durch Wurzel aus (t² plus Freiheitsgrade), Freiheitsgrade = Personen minus 2. Berechnet mit R.',
  'Worked example without data: Pearson correlation, two-sided test, r = t divided by the square root of (t² plus degrees of freedom), degrees of freedom = persons minus 2. Computed with R.');
const QUELLE_WIN = P(
  `Rechenbeispiel ohne Daten: t-Test für zwei unabhängige Gruppen, zweiseitig auf dem Niveau ${zd('regel_sig')}; Teststärke und mittleres d aus der nichtzentralen t-Verteilung, zur Gegenprobe 40000 Simulationen je Zeile. Berechnet mit R.`,
  `Worked example without data: t test for two independent groups, two-sided at the level ${ze('regel_sig')}; power and mean d from the non-central t distribution, 40000 simulations per row as a cross-check. Computed with R.`);

// ---- Diagramme (Nachtrag 02.11.): Punkte und Geraden aus ueben-erwartet.json (Schlüssel `<Fall>.d<Nr>` bzw. `<Frage-id>.d`, Geraden `dg_*`). Titel und Kurzbeschreibung deuten nichts: sie sagen, was zu sehen ist. ----
const D_BREMS = { x: P('Geschwindigkeit (Meilen pro Stunde)', 'Speed (miles per hour)'), y: P('Bremsweg (Fuß)', 'Stopping distance (feet)') };
const DG_DP = [
  diag('rg-dp.d0', { ...D_BREMS, quelle: QUELLE_CARS, geraden: [{ a: 'dg_dp0_a', b: 'dg_dp0_b' }],
    titel: P(`Stichprobe 1: alle ${zn('dp_nA')} Versuche`, `Sample 1: all ${zn('dp_nA')} trials`),
    kurz: P(`Punktwolke aus ${zn('dp_nA')} Fahrversuchen mit Geschwindigkeit und Bremsweg, mit eingezeichneter Regressionsgerade.`, `Scatter plot of ${zn('dp_nA')} driving trials with speed and stopping distance, with the regression line drawn in.`) }),
  diag('rg-dp.d1', { ...D_BREMS, quelle: QUELLE_CARS, geraden: [{ a: 'dg_dp1_a', b: 'dg_dp1_b' }],
    titel: P(`Stichprobe 2: nur Versuche mit einer Geschwindigkeit bis ${zn('dp_vmax')}`, `Sample 2: only trials with a speed up to ${zn('dp_vmax')}`),
    kurz: P(`Punktwolke aus ${zn('dp_nB')} Fahrversuchen mit Geschwindigkeit bis ${zn('dp_vmax')} Meilen pro Stunde und Bremsweg, mit eingezeichneter Regressionsgerade.`, `Scatter plot of ${zn('dp_nB')} driving trials with a speed up to ${zn('dp_vmax')} miles per hour and stopping distance, with the regression line drawn in.`) })
];
const D_GEAR = { x: P('Zahl der Gänge (gear)', 'Number of gears (gear)'), y: P('Meilen je Gallone (mpg)', 'Miles per gallon (mpg)') };
const DG_KN = [
  diag('rg-kn.d0', { ...D_GEAR, quelle: QUELLE_MT, geraden: [{ a: 'dg_kn0_a', b: 'dg_kn0_b' }],
    titel: P(`Stichprobe 1: alle ${zn('kn_nA')} Wagen`, `Sample 1: all ${zn('kn_nA')} cars`),
    kurz: P(`Punktwolke aus ${zn('kn_nA')} Wagen mit Zahl der Gänge (3, 4 oder 5) und Meilen je Gallone, mit eingezeichneter Regressionsgerade.`, `Scatter plot of ${zn('kn_nA')} cars with number of gears (3, 4 or 5) and miles per gallon, with the regression line drawn in.`) }),
  diag('rg-kn.d1', { ...D_GEAR, quelle: QUELLE_MT, geraden: [{ a: 'dg_kn1_a', b: 'dg_kn1_b' }],
    titel: P(`Stichprobe 2: jeder dritte Wagen (${zn('kn_nB')} Wagen)`, `Sample 2: every third car (${zn('kn_nB')} cars)`),
    kurz: P(`Punktwolke aus ${zn('kn_nB')} Wagen mit Zahl der Gänge (3, 4 oder 5) und Meilen je Gallone, mit eingezeichneter Regressionsgerade.`, `Scatter plot of ${zn('kn_nB')} cars with number of gears (3, 4 or 5) and miles per gallon, with the regression line drawn in.`) })
];
const DG_GM = diag('rg-gm.d0', {
  x: P('Länge des Kelchblatts (Sepal.Length, in cm)', 'Sepal length (Sepal.Length, in cm)'), y: P('Breite des Kelchblatts (Sepal.Width, in cm)', 'Sepal width (Sepal.Width, in cm)'),
  quelle: QUELLE_IRIS_REG, titel: P('Kelchblätter von Schwertlilien dreier Arten', 'Sepals of irises of three species'),
  gruppen: [P('Art setosa', 'Species setosa'), P('Art versicolor', 'Species versicolor'), P('Art virginica', 'Species virginica')],
  geraden: [{ a: 'dg_gm_a', b: 'dg_gm_b' }, { a: 'dg_gm0_a', b: 'dg_gm0_b', gruppe: 0 }, { a: 'dg_gm1_a', b: 'dg_gm1_b', gruppe: 1 }, { a: 'dg_gm2_a', b: 'dg_gm2_b', gruppe: 2 }],
  kurz: P(`Punktwolke aus ${zn('gm_nA')} Kelchblättern in drei Arten mit je eigener Form; eingezeichnet sind eine Regressionsgerade über alle Blüten und eine Regressionsgerade je Art.`,
    `Scatter plot of ${zn('gm_nA')} sepals in three species, each with its own shape; one regression line across all flowers and one regression line per species are drawn in.`)
});
const DG_DK = diag('reg-dp-decke-wirkung.d', {
  x: P('Gewicht (wt, in 1000 Pfund)', 'Weight (wt, in 1000 lbs)'), y: P('Meilen je Gallone (mpg)', 'Miles per gallon (mpg)'),
  quelle: P(`Daten: datasets::mtcars (Henderson und Velleman 1981; Teil von R, Lizenz GPL), ${zn('dkw_n')} Wagen der Baujahre 1973/74. Gekappte Werte: Simulation, alle Werte ab ${zn('dkw_grenze')} mpg wurden auf ${zn('dkw_grenze')} gesetzt. Lineare Regression, berechnet mit R.`,
    `Data: datasets::mtcars (Henderson and Velleman 1981; part of R, licence GPL), ${zn('dkw_n')} cars of model years 1973/74. Capped values: simulation, all values from ${zn('dkw_grenze')} mpg were set to ${zn('dkw_grenze')}. Linear regression, computed with R.`),
  titel: P('Meilen je Gallone und Gewicht: echte Werte und gekappte Werte', 'Miles per gallon and weight: actual and capped values'),
  gruppen: [P('Echte Werte', 'Actual values'), P(`Bei ${zn('dkw_grenze')} gekappt`, `Capped at ${zn('dkw_grenze')}`)],
  geraden: [{ a: 'dg_dk0_a', b: 'dg_dk0_b', gruppe: 0 }, { a: 'dg_dk1_a', b: 'dg_dk1_b', gruppe: 1 }],
  kurz: P(`Punktwolke aus ${zn('dkw_n')} Wagen mit Gewicht und Meilen je Gallone, zweimal: mit den echten Werten und mit auf ${zn('dkw_grenze')} gekappten Werten, je mit einer Regressionsgerade.`,
    `Scatter plot of ${zn('dkw_n')} cars with weight and miles per gallon, twice: with the actual values and with values capped at ${zn('dkw_grenze')}, each with a regression line.`)
});
const DG_PETAL = diag('reg-dp-r90-umkehr.d', {
  x: P('Breite des Blütenblatts (Petal.Width, in cm)', 'Petal width (Petal.Width, in cm)'), y: P('Länge des Blütenblatts (Petal.Length, in cm)', 'Petal length (Petal.Length, in cm)'),
  quelle: QUELLE_IRIS_R9, titel: P('Blütenblätter von Schwertlilien', 'Petals of irises'),
  kurz: P(`Punktwolke aus ${zn('r9i_n')} Blütenblättern mit Breite und Länge, ohne eingezeichnete Gerade.`, `Scatter plot of ${zn('r9i_n')} petals with width and length, without a line drawn in.`)
});
const DG_STUDIEN = diag('reg-sv-streuung.d', {
  x: P('Gewicht (kg)', 'Weight (kg)'), y: P('Meilen je Gallone', 'Miles per gallon'),
  quelle: P(`Daten: datasets::mtcars (Henderson und Velleman 1981; Teil von R, GPL) und MASS::Cars93 (Lock 1993; Paket MASS, GPL-2 oder GPL-3). Studie 1: ${zn('rs_n1')} Wagen (mpg), Studie 2: ${zn('rs_n2')} Automodelle (MPG.city, Stadtverkehr). Gewicht in ganzen Kilogramm. Berechnet mit R.`,
    `Data: datasets::mtcars (Henderson and Velleman 1981; part of R, GPL) and MASS::Cars93 (Lock 1993; package MASS, GPL-2 or GPL-3). Study 1: ${zn('rs_n1')} cars (mpg), study 2: ${zn('rs_n2')} car models (MPG.city, city driving). Weight in whole kilograms. Computed with R.`),
  titel: P('Gewicht und Reichweite in beiden Studien', 'Weight and range in both studies'),
  gruppen: [P('Studie 1', 'Study 1'), P('Studie 2', 'Study 2')],
  kurz: P(`Punktwolke mit Gewicht in Kilogramm und Meilen je Gallone, Studie 1 mit ${zn('rs_n1')} Wagen (Kreise) und Studie 2 mit ${zn('rs_n2')} Automodellen (Quadrate), ohne Gerade.`,
    `Scatter plot with weight in kilograms and miles per gallon, study 1 with ${zn('rs_n1')} cars (circles) and study 2 with ${zn('rs_n2')} car models (squares), without a line.`)
});

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'reg-swiss': {
    titel: P('Fruchtbarkeitskennzahl (Fertility) in 47 Bezirken: Education = Anteil der Rekruten mit Bildung über die Grundschule hinaus (%), Catholic = Anteil Katholiken (%)',
      'Fertility measure in 47 districts: Education = share of draftees with education beyond primary school (%), Catholic = share of Catholics (%)'),
    tabellen: [
      tab('reg-swiss.0', UEBERS_KOPF, QUELLE_SWISS, P('Modellübersicht: Modell 1 mit Education, Modell 2 mit Education und Catholic', 'Model summary: model 1 with Education, model 2 with Education and Catholic')),
      tab('reg-swiss.1', KOEF_KOPF, QUELLE_SWISS, P('Koeffizienten, Modell 1', 'Coefficients, model 1')),
      tab('reg-swiss.2', KOEF_KOPF, QUELLE_SWISS, P('Koeffizienten, Modell 2', 'Coefficients, model 2'))
    ]
  },
  'reg-cars': {
    titel: P('Bremsweg (dist, in Fuß) und Geschwindigkeit (speed, in Meilen pro Stunde) bei 50 Fahrversuchen',
      'Stopping distance (dist, in feet) and speed (speed, in miles per hour) in 50 driving trials'),
    tabellen: [
      tab('reg-cars.0', UEBERS_KOPF, QUELLE_CARS, P('Modellübersicht', 'Model summary')),
      tab('reg-cars.1', KOEF_KOPF, QUELLE_CARS, P('Koeffizienten', 'Coefficients'))
    ]
  },
  'reg-mtcars': {
    titel: P(`Benzinverbrauch (Meilen je Gallone) und Gewicht (in 1000 Pfund). Stichprobe 1: alle ${zn('rc_nA')} Wagen. Stichprobe 2: nur Wagen mit einem Gewicht zwischen ${zd('rc_lo', 1)} und ${zd('rc_hi', 0)}`,
      `Fuel consumption (miles per gallon) and weight (in 1000 lbs). Sample 1: all ${zn('rc_nA')} cars. Sample 2: only cars with a weight between ${ze('rc_lo', 1)} and ${ze('rc_hi', 0)}`),
    tabellen: [tab('reg-mtcars.0',
      [P('Stichprobe', 'Sample'), P('n', 'n'), P('Streuung (Standardabweichung) des Gewichts', 'Spread (standard deviation) of weight'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('Beta', 'Beta')],
      QUELLE_MT, P('Regression des Verbrauchs auf das Gewicht, zwei Stichproben aus denselben Daten', 'Regression of consumption on weight, two samples from the same data'))]
  },
  'reg-mtcars-vif': {
    titel: P('Benzinverbrauch (Meilen je Gallone) bei 32 Wagen, erklärt durch Hubraum (disp), Gewicht (wt) und Leistung (hp)',
      'Fuel consumption (miles per gallon) in 32 cars, explained by displacement (disp), weight (wt) and horsepower (hp)'),
    tabellen: [
      tab('reg-mtcars-vif.0', [P('R', 'R'), P('R²', 'R²'), P('Korrigiertes R²', 'Adjusted R²'), P('Standardfehler des Schätzers', 'Std. error of the estimate'), P('F', 'F'), P('Sig. (F)', 'Sig. (F)')], QUELLE_MT, P('Modellübersicht und Gesamttest', 'Model summary and overall test')),
      tab('reg-mtcars-vif.1', [...KOEF_KOPF, P('Toleranz', 'Tolerance'), P('VIF', 'VIF')], QUELLE_MT, P('Koeffizienten mit Kollinearitätsstatistik', 'Coefficients with collinearity statistics'))
    ]
  },
  'reg-kl': {
    titel: P('Fruchtbarkeit in 47 Bezirken: VIF der fünf Prädiktoren und Koeffizienten mit und ohne „Prüfung“', 'Fertility in 47 districts: VIF of the five predictors and coefficients with and without "examination"'),
    tabellen: [
      tab('reg-kl.0', [P('Prädiktor', 'Predictor'), P('VIF', 'VIF'), P('Wurzel aus VIF', 'Square root of VIF'), P('R² des Prädiktors auf die übrigen', 'R² of the predictor on the others')], QUELLE_SW_KL, P('Varianzinflationsfaktor', 'Variance inflation factor')),
      tab('reg-kl.1', [P('Zeile', 'Row'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('Sig.', 'Sig.')], QUELLE_SW_KL, P('Koeffizienten mit und ohne den Prädiktor „Prüfung“', 'Coefficients with and without the predictor "examination"'))
    ]
  },
  'rg-mt': {
    titel: P(`Meilen je Gallone (mpg) bei ${zn('rt_n')} Wagen, erklärt durch Gewicht (wt, in 1000 Pfund) und Getriebe (am: 0 = Automatik, 1 = Handschaltung)`,
      `Miles per gallon (mpg) in ${zn('rt_n')} cars, explained by weight (wt, in 1000 lbs) and transmission (am: 0 = automatic, 1 = manual)`),
    tabellen: [tab('rg-mt.0', KOEF_KOPF, QUELLE_MT_AM, P('Koeffizienten mit beiden Größen', 'Coefficients with both variables'))]
  },
  'rg-md': {
    titel: P(`Meilen je Gallone (mpg) bei ${zn('rt_n')} Wagen in drei Modellen: Modell 1 nur Gewicht (wt, in 1000 Pfund), Modell 2 nur Getriebe (am: 0 = Automatik, 1 = Handschaltung), Modell 3 beide Größen`,
      `Miles per gallon (mpg) in ${zn('rt_n')} cars in three models: model 1 weight only (wt, in 1000 lbs), model 2 transmission only (am: 0 = automatic, 1 = manual), model 3 both variables`),
    tabellen: [
      tab('rg-md.0', UEBERS_KOPF, QUELLE_MT_AM, P('Modellübersicht der drei Modelle', 'Model summary of the three models')),
      tab('rg-md.1', KOEF_KOPF, QUELLE_MT_AM, P('Koeffizienten, Modell 1 (wt)', 'Coefficients, model 1 (wt)')),
      tab('rg-md.2', KOEF_KOPF, QUELLE_MT_AM, P('Koeffizienten, Modell 2 (am)', 'Coefficients, model 2 (am)')),
      tab('rg-md.3', KOEF_KOPF, QUELLE_MT_AM, P('Koeffizienten, Modell 3 (wt und am)', 'Coefficients, model 3 (wt and am)')),
      tab('rg-md.4', [P('Getriebe (am)', 'Transmission (am)'), P('Wagen', 'Cars'), P('Mittleres Gewicht (wt, in 1000 Pfund)', 'Mean weight (wt, in 1000 lbs)'), P('Mittlere Meilen je Gallone (mpg)', 'Mean miles per gallon (mpg)')], QUELLE_MT_AM, P('Kennzahlen je Getriebeart', 'Statistics by transmission'))
    ]
  },
  'rg-c93': {
    titel: P(`Reichweite in Meilen je Gallone, zwei Studien. Studie 1: ${zn('rs_n1')} Wagen (Gewicht wt in 1000 Pfund; am: 1 = Handschaltung). Studie 2: ${zn('rs_n2')} Automodelle (Weight in 100 kg; Man.trans.avail: 1 = Handschaltung erhältlich)`,
      `Range in miles per gallon, two studies. Study 1: ${zn('rs_n1')} cars (weight wt in 1000 lbs; am: 1 = manual). Study 2: ${zn('rs_n2')} car models (Weight in 100 kg; Man.trans.avail: 1 = manual available)`),
    tabellen: [
      tab('rg-c93.0', KOEF_KOPF, QUELLE_C93, P('Studie 2: Koeffizienten', 'Study 2: coefficients')),
      tab('rg-c93.1', [P('Studie', 'Study'), P('Größe', 'Variable'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('Beta', 'Beta'), P('Sig.', 'Sig.')], QUELLE_STUDIEN, P('Gegenüberstellung beider Studien (Studie 1 stammt aus Modell 3 der mtcars-Wagen)', 'Both studies side by side (study 1 comes from model 3 of the mtcars cars)')),
      tab('rg-c93.2', [P('Studie', 'Study'), P('Wagen', 'Cars'), P('Mittleres Gewicht (kg)', 'Mean weight (kg)'), P('Streuung (Standardabweichung) des Gewichts (kg)', 'Spread (standard deviation) of weight (kg)')], QUELLE_STUDIEN, P('Das Gewicht in beiden Stichproben, in Kilogramm', 'Weight in both samples, in kilograms'))
    ]
  },
  // ---- Einheit regression-effekte-einordnen (Richtwerte nur als gesetzte Regel im Stamm) ----
  'rg-eb': {
    titel: P(`Reichweite in Meilen je Gallone, zwei Studien. Studie 1: ${zn('rs_n1')} Wagen (Getriebegröße am). Studie 2: ${zn('rs_n2')} Automodelle (Getriebegröße Man.trans.avail). Beta und Sig. der Koeffizienten`,
      `Range in miles per gallon, two studies. Study 1: ${zn('rs_n1')} cars (transmission variable am). Study 2: ${zn('rs_n2')} car models (transmission variable Man.trans.avail). Beta and Sig. of the coefficients`),
    tabellen: [tab('rg-eb.0', [P('Studie', 'Study'), P('Größe', 'Variable'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('Beta', 'Beta'), P('Sig.', 'Sig.')], QUELLE_STUDIEN, P('Gegenüberstellung beider Studien', 'Both studies side by side'))]
  },
  'rg-ef': {
    titel: P(`Meilen je Gallone (mpg) bei ${zn('ef_n')} Wagen in drei einfachen Regressionen: Modell 1 mit qsec (Zeit für eine Viertelmeile), Modell 2 mit gear (Zahl der Gänge), Modell 3 mit carb (Zahl der Vergaser)`,
      `Miles per gallon (mpg) in ${zn('ef_n')} cars in three simple regressions: model 1 with qsec (time for a quarter mile), model 2 with gear (number of gears), model 3 with carb (number of carburettors)`),
    tabellen: [tab('rg-ef.0', UEBERS_KOPF, QUELLE_MT, P('Modellübersicht der drei Modelle', 'Model summary of the three models'))]
  },
  // ---- Einheit daten-probleme-regression ----
  'rg-dp': {
    titel: P(`Bremsweg (in Fuß) und Geschwindigkeit (in Meilen pro Stunde). Stichprobe 1: alle ${zn('dp_nA')} Versuche. Stichprobe 2: nur Versuche mit einer Geschwindigkeit bis ${zn('dp_vmax')} (${zn('dp_nB')} Versuche)`,
      `Stopping distance (in feet) and speed (in miles per hour). Sample 1: all ${zn('dp_nA')} trials. Sample 2: only trials with a speed up to ${zn('dp_vmax')} (${zn('dp_nB')} trials)`),
    tabellen: [tab('rg-dp.0', [P('Stichprobe', 'Sample'), P('n', 'n'), P('Streuung (Standardabweichung) der Geschwindigkeit', 'Spread (standard deviation) of speed'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('R²', 'R²')],
      QUELLE_CARS, P('Regression des Bremswegs auf die Geschwindigkeit, zwei Stichproben aus denselben Daten', 'Regression of stopping distance on speed, two samples from the same data'))],
    diagramme: DG_DP
  },
  'rg-vk': {
    titel: P(`Meilen je Gallone (mpg) bei ${zn('vk_n')} Wagen, erklärt durch die Zylinderzahl (cyl) und den Hubraum (disp); R² des Modells mit beiden Größen: ${zd('vk_r2', 3)}`,
      `Miles per gallon (mpg) in ${zn('vk_n')} cars, explained by the number of cylinders (cyl) and displacement (disp); R² of the model with both variables: ${ze('vk_r2', 3)}`),
    tabellen: [
      tab('rg-vk.0', [...KOEF_KOPF, P('Toleranz', 'Tolerance'), P('VIF', 'VIF')], QUELLE_MT, P('Modell mit beiden Größen: Koeffizienten mit Kollinearitätsstatistik', 'Model with both variables: coefficients with collinearity statistics')),
      tab('rg-vk.1', [P('Modell', 'Model'), P('Größe', 'Variable'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('Beta', 'Beta'), P('Sig.', 'Sig.')], QUELLE_MT, P('Modell 1 nur cyl, Modell 2 nur disp, Modell 3 beide Größen', 'Model 1 cyl only, model 2 disp only, model 3 both variables'))
    ]
  },
  'rg-kn': {
    titel: P(`Meilen je Gallone (mpg) und Zahl der Gänge (gear). Stichprobe 1: alle ${zn('kn_nA')} Wagen. Stichprobe 2: jeder dritte Wagen der Liste (Wagen 1, 4, 7 und so weiter; ${zn('kn_nB')} Wagen)`,
      `Miles per gallon (mpg) and number of gears (gear). Sample 1: all ${zn('kn_nA')} cars. Sample 2: every third car of the list (cars 1, 4, 7 and so on; ${zn('kn_nB')} cars)`),
    tabellen: [tab('rg-kn.0', [P('Stichprobe', 'Sample'), P('n', 'n'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('Beta', 'Beta'), P('Sig.', 'Sig.')],
      QUELLE_MT, P('Regression des Verbrauchs auf die Zahl der Gänge, zwei Stichproben aus denselben Daten', 'Regression of consumption on the number of gears, two samples from the same data'))],
    diagramme: DG_KN
  },
  'rg-gm': {
    titel: P(`Breite des Kelchblatts, erklärt durch seine Länge, bei Schwertlilien: alle ${zn('gm_nA')} Blüten zusammen und je Art (je ${zn('gm_nG')} Blüten)`,
      `Sepal width, explained by sepal length, in irises: all ${zn('gm_nA')} flowers together and for each species (${zn('gm_nG')} flowers each)`),
    tabellen: [tab('rg-gm.0', [P('Auswahl', 'Selection'), P('n', 'n'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('R²', 'R²'), P('Sig.', 'Sig.')], QUELLE_IRIS_REG, P('Regression der Breite auf die Länge des Kelchblatts', 'Regression of sepal width on sepal length'))],
    diagramme: [DG_GM]
  },
  'rg-r9m': {
    titel: P(`Fünf Größen von ${zn('r9m_n')} Wagen: Hubraum disp, Leistung hp, Gewicht wt, Hinterachsübersetzung drat, Zeit für die Viertelmeile qsec. Erste Tabelle: ihre Korrelationen. Zweite Tabelle: Toleranz und VIF jeder Größe, wenn die vier anderen im Modell stehen`,
      `Five variables of ${zn('r9m_n')} cars: displacement disp, power hp, weight wt, rear axle ratio drat, quarter-mile time qsec. First table: their correlations. Second table: tolerance and VIF of each variable when the other four are in the model`),
    tabellen: [
      tab('rg-r9m.0', [P('Größe', 'Variable'), P('disp', 'disp'), P('hp', 'hp'), P('wt', 'wt'), P('drat', 'drat'), P('qsec', 'qsec')], QUELLE_MT_R9, P('Korrelationen zwischen den fünf Größen', 'Correlations between the five variables')),
      tab('rg-r9m.1', [P('Größe', 'Variable'), P('Toleranz', 'Tolerance'), P('VIF', 'VIF')], QUELLE_MT_R9, P('Toleranz und VIF jeder Größe', 'Tolerance and VIF of each variable'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Fall A: Fruchtbarkeit in Schweizer Bezirken ----
  {
    id: 'reg-a-b-lesen', thema: 'regression', fall: 'reg-swiss',
    stamm: P(`In Modell 2 hat Education das B ${zd('ra_b2', 3)}. Wie lautet die Deutung?`, `In model 2 Education has the B ${ze('ra_b2', 3)}. How is it read?`),
    antworten: [
      a(P(`Bei gleichem Katholikenanteil gehört ein Prozentpunkt mehr Bildung zu ${za('ra_b2', 3)} weniger Kennzahl`, `With the same share of Catholics, one percentage point more education belongs with ${zae('ra_b2', 3)} less of the measure`),
        P('B ist die erwartete Änderung der abhängigen Größe bei einer Einheit mehr, wenn die übrigen Größen gleich bleiben.', 'B is the expected change of the dependent variable for one unit more, with the other variables held constant.'), true),
      a(P(`Ein Prozentpunkt mehr Bildung senkt in einem Bezirk die Kennzahl um etwa ${za('ra_b2', 3)}`, `One percentage point more education lowers the measure by about ${zae('ra_b2', 3)} in a district`),
        P('Die Zahl beschreibt einen Zusammenhang in diesen Daten. Dass Bildung die Kennzahl senkt, zeigt sie nicht.', 'The figure describes a relation in these data. It does not show that education lowers the measure.')),
      a(P(`Bildung erklärt ${za('ra_b2', 3)} der gesamten Streuung der Kennzahl in den Bezirken`, `Education explains ${zae('ra_b2', 3)} of the total variation of the measure in the districts`),
        P('Der erklärte Anteil der Streuung steht im R². B gibt die Steigung an, in der Einheit der Kennzahl je Prozentpunkt.', 'The explained share of the variation is given by R². B gives the slope, in units of the measure per percentage point.'))
    ],
    hilfe: HB, karte: 'vorhersage', probieren: 'gerade', belege: ['wissen:reg-steigung-deutung-einheit', 'wissen:reg-partielle-koeffizienten', 'Bortz Kap. 11; Backhaus Kap. 2']
  },
  {
    id: 'reg-a-sig', thema: 'regression', fall: 'reg-swiss',
    stamm: P(`Angenommen, ein Sig. unter ${zd('regel_sig')} gilt als signifikant. Welche der beiden Größen Education und Catholic sind in Modell 2 signifikant?`, `Assume a Sig. below ${ze('regel_sig')} counts as significant. Which of the two variables, Education and Catholic, are significant in model 2?`),
    antworten: [
      a(P(`Education und Catholic, denn beide Sig.-Werte liegen unter ${zd('regel_sig')}`, `Education and Catholic, since both Sig. values are below ${ze('regel_sig')}`),
        P(`Education hat <,001, Catholic ${zd('ra_p_c', 3)}. Sig. ist der zweiseitige p-Wert zum Test von B gegen null.`, `Education has <.001, Catholic ${ze('ra_p_c', 3)}. Sig. is the two-sided p value of the test of B against zero.`), true),
      a(P('Nur Education, denn Catholic hat ein positives B und zählt deshalb nicht', 'Only Education, since Catholic has a positive B and therefore does not count'),
        P('Das Vorzeichen von B hat mit der Signifikanz nichts zu tun. Entscheidend ist der Sig.-Wert.', 'The sign of B has nothing to do with significance. The Sig. value is what matters.')),
      a(P('Nur Catholic, denn sein t-Wert ist kleiner und damit näher an null', 'Only Catholic, since its t value is smaller and therefore closer to zero'),
        P('Ein größerer Betrag von t gehört zu einem kleineren p. Education hat den größeren Betrag.', 'A larger absolute t goes with a smaller p. Education has the larger absolute value.'))
    ],
    hilfe: [...HB, 'signifikanz'], karte: 'vorhersage', belege: ['wissen:reg-spss-tabelle', 'wissen:reg-t-test-steigung', 'Backhaus Kap. 2; Bortz Kap. 11']
  },
  {
    id: 'reg-a-vergleich', thema: 'regression', fall: 'reg-swiss',
    stamm: P(`Von Modell 1 zu Modell 2 steigt R² von ${zd('ra_r2_1', 3)} auf ${zd('ra_r2_2', 3)}, das korrigierte R² von ${zd('ra_adj1', 3)} auf ${zd('ra_adj2', 3)}. Was ist gedeckt?`,
      `From model 1 to model 2 R² rises from ${ze('ra_r2_1', 3)} to ${ze('ra_r2_2', 3)}, adjusted R² from ${ze('ra_adj1', 3)} to ${ze('ra_adj2', 3)}. What is supported?`),
    antworten: [
      a(P('Catholic bringt dem Modell etwas, denn auch das korrigierte R² steigt mit der neuen Größe', 'Catholic adds something to the model, since adjusted R² rises with the new variable'),
        P('R² steigt durch jede weitere Größe. Das korrigierte R² bestraft zusätzliche Größen; steigt es trotzdem, spricht das für einen Zugewinn (ein Hinweis, kein Beweis).', 'R² rises with every further variable. Adjusted R² penalizes additional variables; if it still rises, that speaks for a gain (a hint, not a proof).'), true),
      a(P('Das korrigierte R² ist hier ohne Aussage, denn R² steigt mit jeder zusätzlichen Größe', 'Adjusted R² says nothing here, since R² rises with every additional variable'),
        P('Das korrigierte R² ist gerade dafür gedacht, die Zahl der Größen zu berücksichtigen.', 'Adjusted R² is meant precisely to take the number of variables into account.')),
      a(P('Modell 2 passt zu stark an die Daten an, denn das korrigierte R² ist kleiner als R²', 'Model 2 fits the data too closely, since adjusted R² is smaller than R²'),
        P('Das korrigierte R² ist fast immer kleiner als R². Das sagt nichts über Überanpassung; entscheidend ist der Vergleich der Modelle.', 'Adjusted R² is smaller than R² in almost all cases. That says nothing about overfitting; the comparison of the models is what matters.'))
    ],
    hilfe: [...HILFE, 'r-quadrat'], karte: 'vorhersage', belege: ['wissen:reg-r2-adjustiert', 'wissen:reg-modellvergleich', 'Backhaus Kap. 2']
  },
  {
    id: 'reg-a-beta', thema: 'regression', fall: 'reg-swiss',
    stamm: P(`In Modell 2 ist Beta für Education ${zd('ra_beta_e', 3)} und für Catholic ${zd('ra_beta_c', 3)}. Welche Aussage ist gedeckt?`, `In model 2 Beta is ${ze('ra_beta_e', 3)} for Education and ${ze('ra_beta_c', 3)} for Catholic. Which statement is supported?`),
    antworten: [
      a(P(`In dieser Stichprobe hängt die Kennzahl stärker mit Education zusammen als mit Catholic`, `In this sample the measure is related more strongly to Education than to Catholic`),
        P('Beta ist B bei standardisierten Größen und damit maßstabsfrei. Verglichen wird der Betrag: größer bei Education.', 'Beta is B for standardized variables and therefore free of scale. The absolute size is compared: larger for Education.'), true),
      a(P('Education wirkt in allen Bezirken der Schweiz stärker auf die Kennzahl als Catholic', 'Education has a stronger effect on the measure than Catholic in all districts of Switzerland'),
        P('Beta beschreibt diese Stichprobe und einen Zusammenhang. Von einer Wirkung oder einer anderen Menge von Bezirken ist keine Rede.', 'Beta describes this sample and a relation. It says nothing about an effect or about another set of districts.')),
      a(P(`Mehr Bildung senkt die Kennzahl um ${za('ra_beta_e', 3)} Einheiten, mehr Katholiken hebt sie um ${zd('ra_beta_c', 3)}`, `More education lowers the measure by ${zae('ra_beta_e', 3)} units, more Catholics raises it by ${ze('ra_beta_c', 3)}`),
        P('Das verwechselt Beta mit B. Eine Einheit in Beta ist eine Standardabweichung, keine Einheit der Kennzahl.', 'This mixes up Beta and B. One unit in Beta is one standard deviation, not one unit of the measure.'))
    ],
    hilfe: HB, karte: 'vorhersage', belege: ['wissen:reg-beta-definition', 'wissen:kim-beta-stichprobenabhaengig', 'Backhaus Kap. 2; Kim 1981']
  },
  {
    id: 'reg-a-ursache', thema: 'regression', fall: 'reg-swiss',
    stamm: P(`Catholic hat in Modell 2 das B ${zd('ra_bc', 3)}. Welcher Schluss ist gedeckt?`, `Catholic has the B ${ze('ra_bc', 3)} in model 2. Which conclusion is supported?`),
    antworten: [
      a(P(`Bezirke mit höherem Katholikenanteil haben im Schnitt eine höhere Kennzahl, bei gleicher Bildung`, `Districts with a higher share of Catholics have a higher measure on average, with the same education`),
        P('Die Daten gelten für Bezirke und zeigen einen Zusammenhang. Daraus folgt weder eine Ursache noch eine Aussage über Einzelne.', 'The data refer to districts and show a relation. Neither a cause nor a statement about individuals follows.'), true),
      a(P(`Der katholische Glaube erhöht bei einzelnen Personen die Kinderzahl in der Familie`, `The Catholic faith raises the number of children in the family of individual people`),
        P('Die Zahlen stammen von Bezirken, nicht von Personen, und zeigen keine Ursache.', 'The figures come from districts, not from persons, and show no cause.')),
      a(P('Ein höherer Katholikenanteil verursacht in einem Bezirk den Anstieg der Kennzahl', 'A higher share of Catholics causes the rise of the measure in a district'),
        P('Ein Regressionskoeffizient allein belegt keine Ursache. Andere, nicht erfasste Größen können beide beeinflussen.', 'A regression coefficient alone proves no cause. Other, unmeasured variables can influence both.'))
    ],
    hilfe: HB, karte: 'vorhersage', belege: ['wissen:reg-partielle-koeffizienten', 'wissen:reg-spss-tabelle', 'Backhaus Kap. 2']
  },

  // ---- Fall B: Bremsweg ----
  {
    id: 'reg-b-konstante', thema: 'regression', fall: 'reg-cars',
    stamm: P(`Die Konstante beträgt ${zd('rb_const', 3)}. Wie ist sie zu lesen?`, `The constant is ${ze('rb_const', 3)}. How should it be read?`),
    antworten: [
      a(P(`Als Wert der Geraden bei Geschwindigkeit 0; ein negativer Bremsweg ergibt dort keinen Sinn`, `As the value of the line at speed 0; a negative stopping distance makes no sense there`),
        P('Der Achsenabschnitt ist der Vorhersagewert bei x = 0 und oft inhaltlich nicht lesbar. Er legt die Lage der Geraden fest.', 'The intercept is the predicted value at x = 0 and often cannot be read in terms of content. It fixes the position of the line.'), true),
      a(P(`Ein stehendes Fahrzeug hat einen Bremsweg von ${zd('rb_const', 3)} Fuß, das ist der Mindestwert`, `A standing vehicle has a stopping distance of ${ze('rb_const', 3)} feet, that is the minimum`),
        P('Bei Geschwindigkeit 0 gibt es keinen Bremsweg. Die Gerade reicht über den Bereich der Daten hinaus, und dort stimmt sie nicht mehr.', 'At speed 0 there is no stopping distance. The line reaches beyond the range of the data, and there it no longer holds.')),
      a(P('Sie zeigt, dass die Daten fehlerhaft sind, denn ein Bremsweg kann nicht negativ sein', 'It shows that the data are faulty, since a stopping distance cannot be negative'),
        P('Die Daten sind in Ordnung. Das Minuszeichen entsteht erst bei der Fortsetzung der Geraden auf Geschwindigkeit 0.', 'The data are fine. The minus sign only arises when the line is extended to speed 0.'))
    ],
    hilfe: HB, karte: 'vorhersage', probieren: 'gerade', belege: ['wissen:reg-steigung-deutung-einheit', 'Bortz Kap. 11; Backhaus Kap. 2']
  },
  {
    id: 'reg-b-vorhersage', thema: 'regression', fall: 'reg-cars',
    stamm: P('Welcher Bremsweg wird für eine Geschwindigkeit von 10 Meilen pro Stunde vorhergesagt?', 'Which stopping distance is predicted for a speed of 10 miles per hour?'),
    antworten: [
      a(P(`Rund ${zd('rb_pred10', 1)} Fuß, die Konstante plus 10 mal B`, `About ${ze('rb_pred10', 1)} feet, the constant plus 10 times B`),
        P('Die Gerade lautet Bremsweg = Konstante + B mal Geschwindigkeit. Eingesetzt ergibt sich der Vorhersagewert.', 'The line reads stopping distance = constant + B times speed. Inserting the speed gives the predicted value.'), true),
      a(P(`Rund ${zd('rb_pred10_ohne', 1)} Fuß, 10 mal B`, `About ${ze('rb_pred10_ohne', 1)} feet, 10 times B`),
        P('Die Konstante gehört zur Vorhersage. Ohne sie läge die Gerade durch den Nullpunkt, was sie hier nicht tut.', 'The constant belongs to the prediction. Without it the line would pass through the origin, which it does not here.')),
      a(P(`Rund ${zd('rb_b', 1)} Fuß, der Wert von B`, `About ${ze('rb_b', 1)} feet, the value of B`),
        P('B ist die Änderung je Meile pro Stunde, kein Vorhersagewert. Der Vorhersagewert braucht die ganze Gleichung.', 'B is the change per mile per hour, not a predicted value. The predicted value needs the whole equation.'))
    ],
    hilfe: [...HILFE, 'vorhersagewert'], karte: 'vorhersage', probieren: 'gerade', belege: ['wissen:reg-steigung-formel', 'wissen:reg-kleinste-quadrate', 'Bortz Kap. 11']
  },
  {
    id: 'reg-b-schaetzer', thema: 'regression', fall: 'reg-cars',
    stamm: P(`Der Standardfehler des Schätzers beträgt ${zd('rb_see', 3)}. Was sagt die Zahl?`, `The standard error of the estimate is ${ze('rb_see', 3)}. What does the figure say?`),
    antworten: [
      a(P(`Beobachtete Bremswege weichen von der Vorhersage typischerweise um diesen Betrag ab`, `Observed stopping distances typically deviate from the prediction by this amount`),
        P('Er wird in der Einheit der abhängigen Größe gemessen; kleiner heißt genauere Vorhersage.', 'It is measured in the unit of the dependent variable; smaller means more precise prediction.'), true),
      a(P(`Die Steigung ist um diesen Betrag unsicher, ihr Intervall reicht so weit`, `The slope is uncertain by this amount, its interval reaches that far`),
        P(`Die Unsicherheit der Steigung ist der Standardfehler von B, hier ${zd('rb_se', 3)}. Das ist eine andere Zahl.`, `The uncertainty of the slope is the standard error of B, here ${ze('rb_se', 3)}. That is a different figure.`)),
      a(P(`So viel Prozent der Streuung des Bremswegs bleiben durch das Modell unerklärt`, `This many percent of the variation of the stopping distance stay unexplained by the model`),
        P(`Anteile der Streuung stehen im R² (hier ${zd('rb_r2', 3)}). Der Standardfehler des Schätzers ist eine Länge, kein Anteil.`, `Shares of the variation are given by R² (here ${ze('rb_r2', 3)}). The standard error of the estimate is a length, not a share.`))
    ],
    hilfe: [...HILFE, 'standardfehler'], karte: 'vorhersage', belege: ['wissen:reg-standardschaetzfehler', 'Bortz Kap. 11; Backhaus Kap. 2']
  },
  {
    id: 'reg-b-beta', thema: 'regression', fall: 'reg-cars',
    stamm: P(`Beta für speed beträgt ${zd('rb_beta', 3)}, ebenso R in der Modellübersicht. Wie kommt das?`, `Beta for speed is ${ze('rb_beta', 3)}, and so is R in the model summary. How does that come about?`),
    antworten: [
      a(P(`Bei nur einer unabhängigen Größe ist Beta gleich r, und R² ist r im Quadrat (${zd('rb_r2', 3)})`, `With only one independent variable Beta equals r, and R² is r squared (${ze('rb_r2', 3)})`),
        P('In der einfachen Regression gilt Beta = r und R² = r². Bei mehreren Größen fällt das auseinander.', 'In simple regression Beta = r and R² = r². With several variables this comes apart.'), true),
      a(P(`Beta und R stimmen nur zufällig überein, bei anderen Daten weichen sie ab`, `Beta and R agree only by chance; with other data they differ`),
        P('Die Übereinstimmung folgt aus der Rechnung. Beta ist B mal Streuung von x durch Streuung von y, und bei einer Größe ist das die Korrelation.', 'The agreement follows from the calculation. Beta is B times the spread of x over the spread of y, and with one variable that is the correlation.')),
      a(P('Beta ist gleich R², weil beide den erklärten Anteil der Streuung messen', 'Beta equals R², because both measure the explained share of the variation'),
        P('Beta ist keine Anteilszahl. Der erklärte Anteil ist R², und der ist hier kleiner als Beta.', 'Beta is not a share. The explained share is R², and it is smaller than Beta here.'))
    ],
    hilfe: HB, karte: 'vorhersage', belege: ['wissen:reg-spss-tabelle', 'wissen:reg-r2-definition', 'Rasch Kap. 4; Backhaus Kap. 2']
  },

  // ---- Fall C: B und Beta in zwei Stichproben ----
  {
    id: 'reg-c-lesen', thema: 'regression', fall: 'reg-mtcars',
    stamm: P('Was fällt beim Vergleich der beiden Zeilen auf?', 'What stands out when comparing the two rows?'),
    antworten: [
      a(P('B liegt in beiden Stichproben nahe beieinander, Beta unterscheidet sich deutlich', 'B is close in both samples, whereas Beta differs clearly'),
        P(`B: ${zd('rc_bA', 3)} und ${zd('rc_bB', 3)}. Beta: ${zd('rc_betaA', 3)} und ${zd('rc_betaB', 3)}.`, `B: ${ze('rc_bA', 3)} and ${ze('rc_bB', 3)}. Beta: ${ze('rc_betaA', 3)} and ${ze('rc_betaB', 3)}.`), true),
      a(P('Sowohl B als auch Beta unterscheiden sich deutlich, die Stichprobe 2 ist ja viel kleiner', 'Both B and Beta differ clearly, since sample 2 is much smaller'),
        P('B bleibt fast gleich. Die kleinere Fallzahl zeigt sich eher im größeren Standardfehler.', 'B stays almost the same. The smaller number of cases shows rather in the larger standard error.')),
      a(P('Beta ist in beiden Stichproben ungefähr gleich, nur B unterscheidet sich deutlich', 'Beta is about the same in both samples, only B differs clearly'),
        P('Es ist umgekehrt: B ist fast gleich, Beta unterscheidet sich.', 'It is the other way round: B is almost the same, Beta differs.'))
    ],
    hilfe: HB, karte: 'vorhersage', belege: ['wissen:kim-unstandardisiert-invariant', 'wissen:kim-beta-stichprobenabhaengig', 'Kim 1981']
  },
  {
    id: 'reg-c-streuung', thema: 'regression', fall: 'reg-mtcars',
    stamm: P('Warum fällt Beta in Stichprobe 2 kleiner aus als in Stichprobe 1, obwohl B fast gleich ist?', 'Why is Beta smaller in sample 2 than in sample 1 although B is almost the same?'),
    antworten: [
      a(P(`Beta hängt auch von der Streuung der Stichprobe ab; das Gewicht streut in Stichprobe 2 weniger`, `Beta also depends on the spread of the sample; weight varies less in sample 2`),
        P(`Beta ist B mal Streuung von x durch Streuung von y. In Stichprobe 2 schrumpft die Streuung des Gewichts (${zd('rc_sdB', 3)} gegenüber ${zd('rc_sdA', 3)}) stärker als die des Verbrauchs, darum wird Beta kleiner.`, `Beta is B times the spread of x over the spread of y. In sample 2 the spread of weight shrinks (${ze('rc_sdB', 3)} compared with ${ze('rc_sdA', 3)}) more than that of consumption, so Beta gets smaller.`), true),
      a(P(`Das Gewicht wirkt in Stichprobe 2 schwächer auf den Verbrauch der Wagen als in Stichprobe 1`, `Weight has a weaker effect on the consumption of the cars in sample 2 than in sample 1`),
        P('Pro Einheit Gewicht ändert sich der Verbrauch in beiden Stichproben fast gleich, das zeigt B.', 'Per unit of weight consumption changes almost equally in both samples; B shows that.')),
      a(P('Beta wird mit der Zahl der Wagen kleiner, B bleibt von der Zahl der Wagen unberührt', 'Beta shrinks with the number of cars, B is unaffected by the number of cars'),
        P('Maßgeblich ist hier die Streuung des Gewichts, nicht die Zahl der Wagen.', 'What matters here is the spread of weight, not the number of cars.'))
    ],
    hilfe: HB, karte: 'vorhersage', belege: ['wissen:kim-beta-stichprobenabhaengig', 'wissen:reg-beta-definition', 'Kim 1981']
  },
  {
    id: 'reg-c-sicher', thema: 'regression', fall: 'reg-mtcars',
    stamm: P('Welche Aussage über B und Beta aus zwei Stichproben ist gesichert?', 'Which statement about B and Beta from two samples is secure?'),
    antworten: [
      a(P(`B ist bei gleicher Einheit direkt vergleichbar, Beta hängt auch von der Streuung ab`, `B is directly comparable with the same unit, Beta also depends on the spread`),
        P('B bezieht sich auf eine Einheit der Größe. Beta rechnet die Streuung der Stichprobe mit ein.', 'B refers to one unit of the variable. Beta includes the spread of the sample in its calculation.'), true),
      a(P('Beta hängt nur vom Zusammenhang ab, nicht von der Streuung der Stichprobe', 'Beta depends only on the relation, not on the spread of the sample'),
        P('Die Tabelle zeigt das Gegenteil: Bei fast gleichem B unterscheidet sich Beta, weil das Gewicht verschieden streut.', 'The table shows the opposite: with almost the same B, Beta differs because weight varies differently.')),
      a(P('B ändert sich mit der Streuung der Stichprobe, Beta bleibt dabei gleich', 'B changes with the spread of the sample, Beta stays the same'),
        P('Das kehrt es um. B bleibt hier fast gleich, Beta ändert sich.', 'This turns it around. B stays almost the same here, Beta changes.'))
    ],
    hilfe: HB, karte: 'vorhersage', belege: ['wissen:kim-beta-stichprobenabhaengig', 'wissen:kim-unstandardisiert-invariant', 'Kim 1981']
  },

  // ---- Fall D: Kollinearität ----
  {
    id: 'reg-d-widerspruch', thema: 'regression', fall: 'reg-mtcars-vif',
    stamm: P(`Das Gesamtmodell ist signifikant (F = ${zd('rd_F')}), aber disp hat Sig. ${zd('rd_p_disp', 3)}. Wie ist das zu erklären?`, `The overall model is significant (F = ${ze('rd_F')}), yet disp has Sig. ${ze('rd_p_disp', 3)}. How can that be explained?`),
    antworten: [
      a(P(`disp überschneidet sich mit wt und hp (Toleranz ${zd('rd_tol_disp', 3)}); sein Zusatzbeitrag ist klein`, `disp overlaps with wt and hp (tolerance ${ze('rd_tol_disp', 3)}); its extra contribution is small`),
        P(`Überschneiden sich die Größen, kann das Modell als Ganzes signifikant sein, obwohl einzelne Koeffizienten es nicht sind. Toleranz ${zd('rd_tol_disp', 3)} heißt: nur rund ${Math.round(W.rd_tol_disp! * 100)} Prozent der Streuung von disp gehören ihm allein.`, `If the variables overlap, the model can be significant as a whole although single coefficients are not. Tolerance ${ze('rd_tol_disp', 3)} means: only about ${Math.round(W.rd_tol_disp! * 100)} percent of the spread of disp belongs to it alone.`), true),
      a(P(`Hubraum und Verbrauch hängen in diesen Daten kaum miteinander zusammen`, `Displacement and consumption are hardly related to each other in these data`),
        P(`Allein hängen sie eng zusammen (r = ${zd('rd_r_disp', 3)}). Im Modell zählt nur, was disp zusätzlich zu wt und hp beiträgt.`, `On their own they are closely related (r = ${ze('rd_r_disp', 3)}). In the model only what disp adds beyond wt and hp counts.`)),
      a(P('Das Modell ist fehlerhaft, denn Gesamttest und Einzeltests sollten dasselbe zeigen', 'The model is faulty, since the overall test and the single tests should show the same'),
        P('Sie prüfen Verschiedenes: der F-Test alle Gewichte zusammen, der t-Test ein einzelnes. Abweichungen sind möglich.', 'They test different things: the F test all weights together, the t test a single one. Differences are possible.'))
    ],
    hilfe: [...HILFE, 'signifikanz'], karte: 'vorhersage', belege: ['wissen:reg-multikollinearitaet-folgen', 'wissen:reg-globaler-f', 'Backhaus Kap. 2']
  },
  {
    id: 'reg-d-fehldeutung', thema: 'regression', fall: 'reg-mtcars-vif',
    stamm: P('Jemand folgert aus dem großen Sig. bei disp: „Der Hubraum hat keinen Einfluss auf den Verbrauch.“ Was ist daran zu beanstanden?', 'Someone concludes from the large Sig. for disp: "Displacement has no influence on consumption." What is wrong with that?'),
    antworten: [
      a(P(`Sig. gilt für den Beitrag zusätzlich zu wt und hp; ein großes Sig. beweist kein B von null`, `Sig. refers to the contribution beyond wt and hp; a large Sig. does not prove a B of zero`),
        P('Ein großes Sig. heißt nur, dass die Daten nicht ausreichen, B von null zu unterscheiden. Zudem ist von „Einfluss“ nichts belegt.', 'A large Sig. only means that the data do not suffice to tell B from zero. Besides, no "influence" has been shown.'), true),
      a(P(`Der VIF von ${zd('rd_vif_disp')} macht das Modell unbrauchbar, seine Zahlen taugen nicht mehr`, `The VIF of ${ze('rd_vif_disp')} makes the model useless, its figures are no longer of use`),
        P('Ein VIF dieser Größe ist ein Hinweis auf ungenaue Koeffizienten, kein Grund, das Modell zu verwerfen.', 'A VIF of this size is a hint of imprecise coefficients, no reason to discard the model.')),
      a(P('Ein großes Sig. zeigt, dass disp den Verbrauch stärker beeinflusst als wt und hp', 'A large Sig. shows that disp influences consumption more strongly than wt and hp'),
        P('Das kehrt es um. Je größer Sig., desto weniger spricht die Stichprobe für einen Beitrag.', 'This turns it around. The larger Sig., the less the sample speaks for a contribution.'))
    ],
    hilfe: [...HILFE, 'p-wert'], karte: 'vorhersage', belege: ['wissen:reg-partielle-koeffizienten', 'wissen:reg-multikollinearitaet-folgen', 'Backhaus Kap. 2']
  },
  {
    id: 'reg-d-standardfehler', thema: 'regression', fall: 'reg-mtcars-vif',
    stamm: P(`Der Standardfehler von disp beträgt im Modell ${zd('rd_se_disp', 3)}, in einer Regression mit disp allein ${zd('rd_se_disp_ohne', 3)}. Was erklärt den Anstieg?`,
      `The standard error of disp is ${ze('rd_se_disp', 3)} in the model and ${ze('rd_se_disp_ohne', 3)} in a regression with disp alone. What explains the rise?`),
    antworten: [
      a(P('Die Überschneidung mit wt und hp macht die Schätzung von B für disp ungenauer', 'The overlap with wt and hp makes the estimate of B for disp less precise'),
        P('Der Standardfehler eines Koeffizienten wächst mit dem VIF. Die Schätzer bleiben unverzerrt, werden aber ungenau.', 'The standard error of a coefficient grows with the VIF. The estimators stay unbiased but become imprecise.'), true),
      a(P('Mit mehr Größen im Modell wird jeder Standardfehler kleiner, weil mehr erklärt wird', 'With more variables in the model every standard error gets smaller, since more is explained'),
        P('Die Abweichungen von der Geraden werden kleiner, aber der Standardfehler eines einzelnen Koeffizienten kann steigen, wenn die Größen zusammenhängen.', 'The deviations from the line get smaller, but the standard error of a single coefficient can rise if the variables are related.')),
      a(P('Der Anstieg zeigt, dass disp in den Daten zu wenig streut', 'The rise shows that disp varies too little in the data'),
        P('Die Streuung von disp ist in beiden Rechnungen dieselbe. Verändert hat sich nur, was die anderen Größen schon erklären.', 'The spread of disp is the same in both calculations. Only what the other variables already explain has changed.'))
    ],
    hilfe: [...HILFE, 'standardfehler'], karte: 'vorhersage', belege: ['wissen:reg-toleranz-vif', 'wissen:reg-standardfehler-steigung', 'Backhaus Kap. 2']
  },

  // ---- Einzelfragen ----
  {
    id: 'reg-abhaengig', thema: 'regression',
    stamm: P('Der Benzinverbrauch eines Wagens soll aus seinem Gewicht vorhergesagt werden. Welche Größe ist die abhängige?', 'The fuel consumption of a car is to be predicted from its weight. Which variable is the dependent one?'),
    antworten: [
      a(P('Der Verbrauch, denn er wird aus dem Gewicht vorhergesagt', 'Consumption, since it is predicted from weight'),
        P('„Regression von y auf x“ heißt: y wird aus x vorhergesagt. y ist die abhängige Größe.', '"Regression of y on x" means y is predicted from x. y is the dependent variable.'), true),
      a(P('Das Gewicht, denn es wird zuerst gemessen', 'Weight, since it is measured first'),
        P('Die Reihenfolge der Messung entscheidet nicht. Maßgeblich ist, was vorhergesagt werden soll.', 'The order of measurement does not decide. What matters is what is to be predicted.')),
      a(P('Beide gleich, denn die Gerade behandelt sie symmetrisch', 'Both equally, since the line treats them symmetrically'),
        P('Die beiden Regressionsgeraden (y auf x, x auf y) sind verschieden. Die Wahl der abhängigen Größe verändert das Ergebnis.', 'The two regression lines (y on x, x on y) are different. The choice of the dependent variable changes the result.'))
    ],
    hilfe: HILFE, karte: 'vorhersage', belege: ['wissen:reg-kleinste-quadrate', 'wissen:reg-zwei-geraden', 'Bortz Kap. 11']
  },
  {
    id: 'reg-kleinste', thema: 'regression',
    stamm: P('Was macht die Regressionsgerade nach der Methode der kleinsten Quadrate möglichst klein?', 'What does the regression line make as small as possible under the method of least squares?'),
    antworten: [
      a(P('Die Summe der quadrierten vertikalen Abweichungen (in y-Richtung) der Punkte von der Geraden', 'The sum of the squared vertical deviations (in the y direction) of the points from the line'),
        P('Das sind die Abweichungen von der Geraden in y-Richtung: beobachtetes minus vorhergesagtes y. Man nennt sie Residuen.', 'These are the deviations from the line in the y direction: observed minus predicted y. They are called residuals.'), true),
      a(P('Die Summe der quadrierten kürzesten Abstände der Punkte zur Geraden, im rechten Winkel gemessen', 'The sum of the squared shortest distances of the points to the line, measured at a right angle'),
        P('Kürzeste Abstände stehen im rechten Winkel zur Geraden. Hier zählen aber die Abweichungen in y-Richtung.', 'Shortest distances are at a right angle to the line. Here, however, the deviations in the y direction count.')),
      a(P('Die Summe der quadrierten Abweichungen der y-Werte aller Punkte vom Mittelwert von y', 'The sum of the squared deviations of the y values of all points from the mean of y'),
        P('Diese Summe hängt nur von den Daten ab, nicht von der Geraden. Die Gerade kann sie nicht verkleinern.', 'This sum depends only on the data, not on the line. The line cannot make it smaller.'))
    ],
    hilfe: HILFE, karte: 'vorhersage', probieren: 'gerade', belege: ['wissen:reg-kleinste-quadrate', 'Bortz Kap. 11']
  },
  {
    id: 'reg-einheit', thema: 'regression',
    stamm: P('Der Bremsweg wird statt in Fuß in Yards angegeben (3 Fuß sind 1 Yard). Was geschieht mit B und Beta?', 'The stopping distance is given in yards instead of feet (3 feet make 1 yard). What happens to B and Beta?'),
    antworten: [
      a(P('B ändert sich mit der Einheit, Beta bleibt gleich', 'B changes with the unit, Beta stays the same'),
        P('B hat die Einheit der abhängigen Größe je Einheit von x. Beta ist maßstabsfrei, weil es standardisiert ist.', 'B has the unit of the dependent variable per unit of x. Beta is free of scale because it is standardized.'), true),
      a(P('B und Beta bleiben beide gleich, denn der Zusammenhang ist derselbe', 'B and Beta both stay the same, since the relation is the same'),
        P('Der Zusammenhang bleibt, aber B ist an die Einheit gebunden und wird durch 3 geteilt.', 'The relation stays, but B is tied to the unit and is divided by 3.')),
      a(P('B und Beta ändern sich beide, denn beide hängen von den Einheiten ab', 'B and Beta both change, since both depend on the units'),
        P('Beta ist durch die Standardisierung von der Einheit befreit und ändert sich nicht.', 'Beta is freed from the unit by standardization and does not change.'))
    ],
    hilfe: HB, karte: 'vorhersage', belege: ['wissen:reg-steigung-deutung-einheit', 'wissen:reg-beta-definition', 'Bortz Kap. 11; Backhaus Kap. 2']
  },
  {
    id: 'reg-swiss-agri', thema: 'regression',
    stamm: P('Zu Education kommt als weitere Größe Agriculture (Anteil der Männer, die in der Landwirtschaft arbeiten). Was zeigt die Tabelle?', 'Agriculture (share of men working in agriculture) is added to Education. What does the table show?'),
    tabelle: tab('reg-swiss-agri',
      [P('Modell', 'Model'), P('Größen', 'Terms'), P('R²', 'R²'), P('Korrigiertes R²', 'Adjusted R²'), P('Standardfehler des Schätzers', 'Std. error of the estimate')],
      QUELLE_SWISS, P('Modellvergleich', 'Model comparison')),
    antworten: [
      a(P(`Agriculture bringt kaum etwas: R² steigt minimal, das korrigierte R² sinkt`, `Agriculture adds hardly anything: R² rises minimally, adjusted R² falls`),
        P(`R² steigt von ${zd('rg_r2_1', 3)} auf ${zd('rg_r2_2', 3)}, das korrigierte R² sinkt von ${zd('rg_adj1', 3)} auf ${zd('rg_adj2', 3)}. R² steigt bei jeder zusätzlichen Größe, das korrigierte R² kann sinken.`, `R² rises from ${ze('rg_r2_1', 3)} to ${ze('rg_r2_2', 3)}, adjusted R² falls from ${ze('rg_adj1', 3)} to ${ze('rg_adj2', 3)}. R² rises with every additional variable, adjusted R² can fall.`), true),
      a(P(`Modell 2 ist besser, weil sein R² höher ist und mehr Größen mehr erklären`, `Model 2 is better because its R² is higher and more variables explain more`),
        P('Ein höheres R² folgt schon aus der bloßen Zahl der Größen. Beurteilt wird mit korrigiertem R² und Sparsamkeit.', 'A higher R² follows from the mere number of variables. Judgement uses adjusted R² and parsimony.')),
      a(P('Das korrigierte R² muss mit R² steigen, die Tabelle enthält einen Rechenfehler', 'Adjusted R² must rise with R², so the table contains a calculation error'),
        P('Das korrigierte R² kann sinken und sogar negativ werden. Genau dafür ist es gedacht.', 'Adjusted R² can fall and even become negative. That is exactly what it is for.'))
    ],
    hilfe: [...HILFE, 'r-quadrat'], karte: 'vorhersage', belege: ['wissen:reg-r2-adjustiert', 'wissen:reg-modellvergleich', 'Backhaus Kap. 2']
  },
  {
    id: 'reg-swiss-edu-exam', thema: 'regression',
    stamm: P(`Das B von Education beträgt allein ${zd('rh_b1', 3)}, zusammen mit Examination ${zd('rh_b2', 3)}. Warum ändert es sich?`, `The B of Education is ${ze('rh_b1', 3)} on its own and ${ze('rh_b2', 3)} together with Examination. Why does it change?`),
    tabelle: tab('reg-swiss-edu-exam', [P('Modell', 'Model'), P('Größe', 'Term'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('Sig.', 'Sig.')], QUELLE_SWISS, P('Education allein und mit Examination (Anteil Rekruten mit bester Note)', 'Education alone and with Examination (share of draftees with the highest mark)')),
    antworten: [
      a(P(`B gilt bei konstant gehaltener anderer Größe; Education und Examination hängen zusammen (r = ${zd('rh_r', 3)})`, `B holds with the other variable held constant; Education and Examination are related (r = ${ze('rh_r', 3)})`),
        P('Sind die Größen unkorreliert, ändert sich B nicht. Hängen sie zusammen und trägt die neue Größe etwas bei, verschiebt sich B.', 'If the variables are uncorrelated, B does not change. If they are related and the new variable contributes something, B shifts.'), true),
      a(P('Die erste Rechnung war fehlerhaft, denn B sollte sich beim Hinzufügen einer Größe nicht ändern', 'The first calculation was faulty, since B should not change when a variable is added'),
        P('Es kann sich ändern, sobald die neue Größe mit der alten zusammenhängt. Das ist kein Fehler.', 'It can change as soon as the new variable is related to the old one. That is no error.')),
      a(P(`Bildung wirkt schwächer, sobald eine zweite Größe im Modell steht und mitwirkt`, `Education has a weaker effect as soon as a second variable is in the model and takes part`),
        P('Von einer Wirkung ist nicht die Rede. Verändert hat sich die Frage, die der Koeffizient beantwortet.', 'There is no talk of an effect. What has changed is the question that the coefficient answers.'))
    ],
    hilfe: HB, karte: 'vorhersage', belege: ['wissen:reg-partielle-koeffizienten', 'Backhaus Kap. 2']
  },
  {
    id: 'reg-zahn', thema: 'regression',
    stamm: P('Die Gruppe wird als 0/1-Größe „supp = VC“ eingesetzt (Referenz: OJ). Wie sind Konstante und B zu lesen?', 'The group is entered as the 0/1 variable "supp = VC" (reference: OJ). How are the constant and B to be read?'),
    tabelle: tab('reg-zahn', [P('Größe', 'Term'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('t', 't'), P('Sig.', 'Sig.')], QUELLE_ZAHN, P('Zahnlänge, erklärt durch die Art der Vitamin-C-Gabe (OJ = Orangensaft, VC = Ascorbinsäure)', 'Tooth length explained by the form of the vitamin C dose (OJ = orange juice, VC = ascorbic acid)')),
    antworten: [
      a(P(`Konstante = Mittelwert der Referenzgruppe OJ (${zd('rz_oj', 3)}); B = Differenz der Mittelwerte (${zd('rz_b', 3)})`, `Constant = mean of the reference group OJ (${ze('rz_oj', 3)}); B = difference of the means (${ze('rz_b', 3)})`),
        P('Bei einem 0/1-Dummy ist die Konstante der Mittelwert der Referenz und B der Unterschied dazu. Der Test entspricht dem t-Test für unabhängige Stichproben.', 'With a 0/1 dummy the constant is the mean of the reference and B the difference from it. The test corresponds to the t test for independent samples.'), true),
      a(P(`Die Konstante ist der Mittelwert aller ${zn('rz_n')} Tiere, B der Unterschied zwischen den Gruppen`, `The constant is the mean of all ${zn('rz_n')} animals, B the difference between the groups`),
        P('Der Gesamtmittelwert wäre die Konstante ohne jede Gruppenvariable. Mit dem Dummy gehört sie zur Referenzgruppe.', 'The overall mean would be the constant without any group variable. With the dummy it belongs to the reference group.')),
      a(P(`Die Konstante ist der Mittelwert von VC (${zd('rz_oj', 3)}), OJ liegt um ${za('rz_b', 3)} darunter`, `The constant is the mean of VC (${ze('rz_oj', 3)}), OJ lies ${zae('rz_b', 3)} below`),
        P('Das vertauscht die Gruppen. Referenz ist die mit 0 kodierte Gruppe, hier OJ.', 'This swaps the groups. The reference is the group coded 0, here OJ.'))
    ],
    hilfe: HB, karte: 'vorhersage', belege: ['wissen:reg-dummy-kodierung', 'Rasch Kap. 4; Backhaus Kap. 2']
  },
  {
    id: 'reg-dummy-zahl', thema: 'regression',
    stamm: P('Eine Gruppenvariable hat drei Kategorien und soll in die Regression. Wie viele 0/1-Größen (Dummies) werden neben der Konstante gebraucht?', 'A group variable has three categories and is to enter the regression. How many 0/1 variables (dummies) are needed besides the constant?'),
    antworten: [
      a(P('Zwei, also eine weniger als Kategorien', 'Two, that is one fewer than categories'),
        P('Bei q Kategorien genügen q - 1 Dummies. Die übrige Kategorie ist die Referenz.', 'With q categories q - 1 dummies are enough. The remaining category is the reference.'), true),
      a(P('Drei, eine je Kategorie', 'Three, one per category'),
        P('Drei Dummies zusammen mit der Konstante erzeugen perfekte Kollinearität, denn sie ergeben zusammen immer die Konstante.', 'Three dummies together with the constant create perfect collinearity, because together they add up to the constant.')),
      a(P('Eine, die zwischen den drei Kategorien als Zahl von 1 bis 3 unterscheidet', 'One, which distinguishes the three categories as a number from 1 to 3'),
        P('Das behandelt die Kategorien als gleich weit auseinander liegende Zahlen, was bei unterschiedenen Gruppen nicht gilt.', 'That treats the categories as numbers equally far apart, which does not hold for distinct groups.'))
    ],
    hilfe: HILFE, karte: 'vorhersage', belege: ['wissen:reg-dummy-kodierung', 'Rasch Kap. 4']
  },
  {
    id: 'reg-residuen-normal', thema: 'regression',
    stamm: P('Für welche Größe setzt die lineare Regression eine Normalverteilung voraus (für Tests und Intervalle bei kleinen Stichproben)?', 'For which quantity does linear regression assume a normal distribution (for tests and intervals in small samples)?'),
    antworten: [
      a(P(`Für die Fehler, geprüft an den Abweichungen von der Geraden (Residuen), nicht für die Größen selbst`, `For the errors, checked on the deviations from the line (residuals), not for the variables themselves`),
        P('Geprüft wird deshalb mit Histogramm oder Q-Q-Plot der Residuen, nicht der Rohdaten. Bei großen Stichproben mildert der zentrale Grenzwertsatz das.', 'It is therefore checked with a histogram or Q-Q plot of the residuals, not of the raw data. With large samples the central limit theorem softens this.'), true),
      a(P(`Für alle Größen im Modell, die abhängige ebenso wie jede unabhängige Größe`, `For all variables in the model, the dependent one as well as each independent one`),
        P('Eine solche Forderung stellt das Modell nicht. Gefordert sind Linearität, gleiche Fehlervarianz und normale Fehler.', 'The model makes no such demand. What is required is linearity, equal error variance and normal errors.')),
      a(P('Nur für die unabhängige Größe, weil sie die Vorhersage bestimmt und deshalb normal sein sollte', 'Only for the independent variable, because it determines the prediction and should therefore be normal'),
        P('Über die Verteilung der unabhängigen Größe wird nichts gefordert, sie muss nur streuen.', 'Nothing is required about the distribution of the independent variable, it only has to vary.'))
    ],
    hilfe: [...HILFE, 'normalverteilung-pruefen', 'voraussetzung'], karte: 'vorhersage', belege: ['wissen:reg-voraussetzung-residuen', 'wissen:reg-residuenplots', 'Bortz Kap. 11; Backhaus Kap. 2']
  },
  {
    id: 'reg-trichter', thema: 'regression',
    stamm: P('Die Abweichungen der Punkte von der Geraden (Residuen) bilden, gegen die vorhergesagten Werte aufgetragen, einen Trichter. Was zeigt das?', 'Plotted against the predicted values, the deviations of the points from the line (residuals) form a funnel. What does this show?'),
    antworten: [
      a(P(`Die Streuung der Fehler ist ungleich (Heteroskedastizität); Tests können falsch sein`, `The variation of the errors is unequal (heteroscedasticity); tests can be wrong`),
        P('Ein Trichter weist auf ungleiche Fehlervarianz. Die Koeffizienten bleiben unverzerrt, ihre Genauigkeit wird falsch eingeschätzt.', 'A funnel points to unequal error variance. The coefficients stay unbiased, but their precision is judged wrongly.'), true),
      a(P(`Der Zusammenhang ist nichtlinear und braucht einen quadratischen Term`, `The relation is nonlinear and needs a quadratic term`),
        P('Auf Nichtlinearität weist eine Kurve im Plot hin, kein Trichter.', 'A curve in the plot points to nonlinearity, not a funnel.')),
      a(P(`Die Daten enthalten Ausreißer, die vor der Rechnung entfernt werden sollten`, `The data contain outliers that should be removed before the calculation`),
        P('Ein Trichter betrifft das ganze Muster der Streuung, nicht einzelne Punkte. Entfernt wird damit nichts.', 'A funnel concerns the whole pattern of variation, not single points. Nothing is removed on that basis.'))
    ],
    hilfe: [...HILFE, 'voraussetzung'], karte: 'vorhersage', belege: ['wissen:reg-residuenplots', 'wissen:reg-folgen-verletzungen', 'Backhaus Kap. 2; Lumley u. a. 2002']
  },
  {
    id: 'reg-ausreisser', thema: 'regression',
    stamm: P('Ein Punkt liegt weit von den übrigen entfernt. Was ist angemessen?', 'One point lies far from the others. What is appropriate?'),
    antworten: [
      a(P(`Ergebnisse mit und ohne den Punkt berichten; löschen nur bei Erfassungsfehler oder fremder Gruppe`, `Report results with and without the point; delete only for a recording error or a foreign group`),
        P('Ausreißer werden nicht automatisch gelöscht. Die Löschung braucht einen Grund und gehört dokumentiert.', 'Outliers are not deleted automatically. A deletion needs a reason and has to be documented.'), true),
      a(P(`Den Punkt löschen, damit das R² steigt, die Gerade besser passt und die Arbeit sauberer wirkt`, `Delete the point so that R² rises, the line fits better and the work looks cleaner`),
        P('Ein besseres R² ist kein Grund. So entsteht ein Modell, das nur die erwünschten Daten beschreibt.', 'A better R² is no reason. That produces a model that describes only the wanted data.')),
      a(P('Den Punkt behalten, weil Ausreißer die Gerade nicht beeinflussen und nichts verändern', 'Keep the point, because outliers do not influence the line and change nothing'),
        P('Ein Punkt kann die Gerade stark zu sich ziehen, besonders wenn er weit vom Mittelwert von x liegt.', 'A point can pull the line strongly towards itself, especially if it lies far from the mean of x.'))
    ],
    hilfe: [...HILFE, 'ausreisser'], karte: 'vorhersage', belege: ['wissen:reg-ausreisser-umgang', 'wissen:reg-ausreisser-hebel', 'Backhaus Kap. 2']
  },
  {
    id: 'reg-hebel', thema: 'regression',
    stamm: P('Ein Punkt liegt weit vom Mittelwert von x entfernt, seine Abweichung von der Geraden (Residuum) ist klein. Wie wirkt er auf die Gerade?', 'A point lies far from the mean of x, and its deviation from the line (residual) is small. How does it act on the line?'),
    antworten: [
      a(P('Er kann sie stark zu sich ziehen; das kleine Residuum verrät seinen Einfluss nicht', 'It can pull it strongly towards itself; the small residual does not reveal its influence'),
        P('Ein Punkt weit außen zieht die Gerade zu sich und verkleinert so sein eigenes Residuum. Ob er die Gerade verändert, zeigt der Vergleich mit und ohne den Punkt, nicht sein Residuum allein.', 'A point far out pulls the line towards itself and thereby shrinks its own residual. Whether it changes the line is shown by comparing with and without the point, not by its residual alone.'), true),
      a(P('Er wirkt nicht auf die Gerade, denn ein kleines Residuum beweist einen kleinen Einfluss', 'It has no effect on the line, since a small residual proves small influence'),
        P('Gerade weil die Gerade zum Punkt gezogen wird, bleibt sein Residuum klein. Das Residuum allein zeigt den Ausreißer nicht.', 'Precisely because the line is pulled towards the point, its residual stays small. The residual alone does not show the outlier.')),
      a(P('Er verändert meist nur die Konstante, die Steigung bleibt davon weitgehend unberührt', 'It mostly changes only the constant, the slope is largely unaffected'),
        P('Ein hebelstarker Punkt kann vor allem die Steigung verändern, weil er am Ende des Bereichs von x liegt.', 'A high-leverage point can change mainly the slope, because it lies at the end of the range of x.'))
    ],
    hilfe: [...HILFE, 'ausreisser'], karte: 'vorhersage', belege: ['wissen:reg-ausreisser-hebel', 'Backhaus Kap. 2; Bortz Kap. 11']
  },
  {
    id: 'reg-ftest', thema: 'regression',
    stamm: P(`Im Modell mit Hubraum, Gewicht und Leistung steht F = ${zd('rd_F')} mit hoch signifikantem Sig. Was prüft dieser Test?`, `In the model with displacement, weight and horsepower F = ${ze('rd_F')} with a highly significant Sig. What does this test check?`),
    antworten: [
      a(P('Ob alle B zusammen gleich null sind, also keine Größe etwas beiträgt', 'Whether all B together are equal to zero, that is, no variable contributes anything'),
        P('Der globale F-Test prüft die Nullhypothese, dass keine der Größen etwas beiträgt.', 'The global F test checks the null hypothesis that none of the variables contributes anything.'), true),
      a(P('Ob jedes einzelne B für sich von null abweicht, also jede Größe etwas beiträgt', 'Whether every single B differs from zero on its own, that is, each variable contributes something'),
        P('Das prüfen die t-Tests der einzelnen Koeffizienten, nicht der F-Test.', 'The t tests of the single coefficients check that, not the F test.')),
      a(P('Ob die Gerade die richtige Form hat, also der Zusammenhang wirklich linear ist', 'Whether the line has the right form, that is, the relation is really linear'),
        P('Über die Form des Zusammenhangs sagt der F-Test nichts. Das zeigen Residuenplots.', 'The F test says nothing about the form of the relation. Residual plots show that.'))
    ],
    hilfe: HILFE, karte: 'vorhersage', belege: ['wissen:reg-globaler-f', 'Backhaus Kap. 2']
  },
  {
    id: 'reg-schrittweise', thema: 'regression',
    stamm: P('Ein Programm wählt die Größen eines Modells schrittweise nach Signifikanz aus. Was ist dabei zu bedenken?', 'A program selects the variables of a model stepwise by significance. What needs to be considered?'),
    antworten: [
      a(P('Die Auswahl folgt rein statistischen Kriterien und kennt weder Theorie noch Ursachen', 'The selection follows purely statistical criteria and knows neither theory nor causes'),
        P('Das Ergebnis hängt an den Daten. Ob die gewählten Größen sinnvoll oder ursächlich sind, bleibt zu klären.', 'The result depends on the data. Whether the chosen variables are meaningful or causal remains to be clarified.'), true),
      a(P('Sie findet die ursächlichen Größen, weil nur diese signifikant werden', 'It finds the causal variables, because only these become significant'),
        P('Signifikanz belegt keine Ursache. Auch zufällig oder über Dritte zusammenhängende Größen können signifikant werden.', 'Significance proves no cause. Variables that are related by chance or through third variables can become significant too.')),
      a(P('Sie macht die p-Werte der gewählten Größen genauer, weil schlechte Größen entfernt wurden', 'It makes the p values of the chosen variables more precise, because poor variables were removed'),
        P('Im Gegenteil: Nach der Auswahl fallen die p-Werte zu günstig aus, weil Auswahl und Test dieselben Daten nutzen.', 'On the contrary: after selection the p values come out too favourable, because selection and test use the same data.'))
    ],
    hilfe: HILFE, karte: 'vorhersage', belege: ['wissen:reg-schrittweise', 'Backhaus Kap. 2 (Konvention)']
  },
  {
    id: 'reg-r2-bedeutung', thema: 'regression',
    stamm: P(`Im Bremswegmodell beträgt R² ${zd('rb_r2', 3)}. Was bedeutet das?`, `In the stopping-distance model R² is ${ze('rb_r2', 3)}. What does that mean?`),
    antworten: [
      a(P(`Rund ${zp('rb_r2')} Prozent der Streuung des Bremswegs hängen mit der Geschwindigkeit zusammen`, `About ${zp('rb_r2')} percent of the variation of the stopping distance is associated with the speed`),
        P('R² ist der Anteil der Streuung der abhängigen Größe, der mit dem Modell verbunden ist. Wie groß ein „gutes“ R² ist, hängt vom Fach ab.', 'R² is the share of the variation of the dependent variable that is associated with the model. How large a “good” R² is depends on the field.'), true),
      a(P(`Bei rund ${zp('rb_r2')} Prozent der Fahrzeuge wird der Bremsweg richtig vorhergesagt`, `For about ${zp('rb_r2')} percent of the vehicles the stopping distance is predicted correctly`),
        P('R² zählt keine Treffer. Es misst einen Anteil der Streuung, nicht einen Anteil der Fälle.', 'R² does not count hits. It measures a share of the variation, not a share of the cases.')),
      a(P(`Der Bremsweg wächst um ${zd('rb_r2', 3)} Fuß je Meile pro Stunde`, `The stopping distance grows by ${ze('rb_r2', 3)} feet per mile per hour`),
        P(`Das wäre eine Steigung. Sie steht in der Spalte B (hier ${zd('rb_b', 3)}), nicht im R².`, `That would be a slope. It is in the column B (here ${ze('rb_b', 3)}), not in R².`))
    ],
    hilfe: [...HILFE, 'r-quadrat'], karte: 'vorhersage', belege: ['wissen:reg-r2-definition', 'Bortz Kap. 11; Backhaus Kap. 2']
  },
  {
    id: 'reg-extrapolation', thema: 'regression',
    stamm: P(`Die Bremswege wurden bei Geschwindigkeiten von ${zn('rb_speed_min')} bis ${zn('rb_speed_max')} Meilen pro Stunde gemessen. Wie belastbar ist die Vorhersage für ein Vielfaches der höchsten Geschwindigkeit?`,
      `The stopping distances were measured at speeds from ${zn('rb_speed_min')} to ${zn('rb_speed_max')} miles per hour. How reliable is the prediction for a multiple of the highest speed?`),
    antworten: [
      a(P(`Wenig: Außerhalb des beobachteten Bereichs wächst die Unsicherheit, die Gerade muss dort nicht gelten`, `Hardly: outside the observed range the uncertainty grows and the line need not hold there`),
        P('Das Intervall wird vom Mittelwert von x weg breiter. Dazu kommt, dass die Form des Zusammenhangs dort unbekannt ist.', 'The interval widens away from the mean of x. In addition, the form of the relation there is unknown.'), true),
      a(P('Ebenso gut wie im beobachteten Bereich, denn die Gleichung gilt auch für größere Werte von x', 'Just as good as in the observed range, since the equation holds for all values of x'),
        P('Die Gleichung beschreibt die Daten, aus denen sie gerechnet wurde. Darüber hinaus ist sie eine Annahme.', 'The equation describes the data it was calculated from. Beyond that it is an assumption.')),
      a(P('Besser als im beobachteten Bereich, weil bei großen Werten die Abweichungen kleiner sind', 'Better than in the observed range, because deviations are smaller at large values'),
        P('Für größere Abstände vom Mittelwert gilt das Gegenteil: Die Abweichungen können größer ausfallen.', 'For larger distances from the mean the opposite holds: the deviations can turn out larger.'))
    ],
    hilfe: [...HILFE, 'praediktionsintervall'], karte: 'vorhersage', probieren: 'gerade', belege: ['wissen:reg-ki-steigung', 'Bortz Kap. 11; Backhaus Kap. 2']
  },

  // ---- Kollinearität und Residuen (Stand 01.11.2026, dritte Charge) ----
  {
    id: 'reg-kl-vif', thema: 'regression', fall: 'reg-kl', karte: 'vorhersage',
    stamm: P(`Angenommen, ein VIF ab ${zn('kl_schw')} gilt als auffällig. Die Tabellen zeigen die VIF der fünf Prädiktoren und die Koeffizienten mit und ohne „Prüfung“. Was folgt für „Prüfung“ (VIF ${zd('kl_v_ex', 2)})?`,
      `Suppose a VIF of ${zn('kl_schw')} or more counts as conspicuous. The tables show the VIF of the five predictors and the coefficients with and without "examination". What follows for "examination" (VIF ${ze('kl_v_ex', 2)})?`),
    antworten: [
      a(P(`Sein Standardfehler ist rund ${zd('kl_s_ex', 1)}-mal so groß, wie er ohne jede Überschneidung mit den übrigen Prädiktoren wäre, obwohl der VIF unter der Schwelle liegt`, `Its standard error is about ${ze('kl_s_ex', 1)} times as large as it would be without any overlap with the other predictors, despite a VIF below the threshold`),
        P(`Die Varianz der Schätzung wächst mit dem Faktor VIF, der Standardfehler mit seiner Wurzel: Wurzel aus ${zd('kl_v_ex', 2)} ist ${zd('kl_s_ex', 2)}. Alle fünf VIF liegen unter ${zn('kl_schw')}.`,
          `The variance of the estimate grows by the factor VIF, the standard error by its square root: the square root of ${ze('kl_v_ex', 2)} is ${ze('kl_s_ex', 2)}. All five VIF are below ${zn('kl_schw')}.`), true),
      a(P('Der Schätzwert B von „Prüfung“ ist verzerrt, seine Standardfehler bleiben dabei unverändert', 'The estimate B of "examination" is biased, while its standard errors stay unchanged'),
        P(`Betroffen sind vor allem die Standardfehler: Sie wachsen mit der Wurzel aus dem VIF, bei „Prüfung“ auf das ${zd('kl_s_ex', 2)}-Fache.`, `The standard errors are mainly affected: they grow with the square root of the VIF, for "examination" to ${ze('kl_s_ex', 2)} times.`)),
      a(P('Kollinearität spielt hier keine Rolle, weil kein VIF die gesetzte Schwelle erreicht', 'Collinearity plays no role here because no VIF reaches the threshold set'),
        P(`Auch unter der Schwelle wachsen die Standardfehler: bei „Landwirtschaft“ (VIF ${zd('kl_v_ag', 2)}) auf das ${zd('kl_s_ag', 2)}-Fache. Die Schwelle ist eine Konvention ohne Herleitung.`,
          `The standard errors grow below the threshold as well: for "agriculture" (VIF ${ze('kl_v_ag', 2)}) to ${ze('kl_s_ag', 2)} times. The threshold is a convention without derivation.`))
    ],
    hilfe: ['vif', 'kollinearitaet'], belege: ['wissen:zuur10-kollinearitaet', 'wissen:reg-vif-schwellen']
  },
  {
    id: 'reg-kl-mehrfach', thema: 'regression', fall: 'reg-kl', mehrfach: true, karte: 'vorhersage',
    stamm: P(`Angenommen, ein VIF ab ${zn('kl_schw')} gilt als auffällig. Welche Aussagen zu den Tabellen stimmen? Mehrere können stimmen.`, `Suppose a VIF of ${zn('kl_schw')} or more counts as conspicuous. Which statements about the tables are correct? Several may be correct.`),
    antworten: [
      a(P(`Der VIF ${zd('kl_v_ed', 2)} von „Bildung“ heißt: Die übrigen Prädiktoren erklären ${zp('kl_r2_ed')} Prozent ihrer Streuung`, `The VIF ${ze('kl_v_ed', 2)} of "education" means: the other predictors explain ${zp('kl_r2_ed')} percent of its variation`),
        P(`Der VIF ist 1 geteilt durch (1 minus R²), wobei R² aus der Regression dieses Prädiktors auf alle anderen stammt: 1 minus 1 durch ${zd('kl_v_ed', 2)} gleich ${zd('kl_r2_ed', 2)}.`,
          `The VIF is 1 divided by (1 minus R²), where R² comes from regressing this predictor on all the others: 1 minus 1 over ${ze('kl_v_ed', 2)} equals ${ze('kl_r2_ed', 2)}.`), true),
      a(P(`Ohne „Prüfung“ sinkt der Standardfehler von „Bildung“ von ${zd('kl_se_full', 3)} auf ${zd('kl_se_red', 3)}`, `Without "examination" the standard error of "education" falls from ${ze('kl_se_full', 3)} to ${ze('kl_se_red', 3)}`),
        P('Weniger Kollinearität bedeutet kleinere Standardfehler der übrigen Prädiktoren.', 'Less collinearity means smaller standard errors of the other predictors.'), true),
      a(P(`Der höchste VIF (${zd('kl_v_ex', 2)}) zeigt, dass die Regression nutzlos ist`, `The highest VIF (${ze('kl_v_ex', 2)}) shows that the regression is useless`),
        P('Ein hoher VIF entwertet für sich noch kein Ergebnis. Schwellen sind Konventionen ohne Herleitung, und hier liegt kein VIF über der gesetzten Schwelle.', 'A high VIF does not invalidate a result by itself. Thresholds are conventions without derivation, and here no VIF lies above the threshold set.')),
      a(P('Das Weglassen von „Prüfung“ verändert B von „Bildung“ nicht', 'Leaving out "examination" does not change B of "education"'),
        P(`B ändert sich von ${zd('kl_b_full', 3)} auf ${zd('kl_b_red', 3)}. Das Weglassen einer kollinearen Variablen verschiebt die Schätzung der übrigen.`, `B changes from ${ze('kl_b_full', 3)} to ${ze('kl_b_red', 3)}. Leaving out a collinear variable shifts the estimate of the others.`))
    ],
    hilfe: ['kollinearitaet', 'vif'], belege: ['wissen:zuur10-kollinearitaet', 'wissen:reg-vif-schwellen']
  },
  {
    id: 'reg-rv', thema: 'regression', karte: 'vorhersage',
    tabelle: tab('reg-rv', [P('Kennzahl', 'Statistic'), P('Wert', 'Value')], QUELLE_CARS_RV, P('Residuen der Regression von Bremsweg auf Geschwindigkeit', 'Residuals of the regression of stopping distance on speed')),
    stamm: P('Die Tabelle zeigt Kennzahlen der Residuen einer Regression des Bremswegs auf die Geschwindigkeit. Was lässt sich daraus ablesen?', 'The table shows statistics of the residuals of a regression of stopping distance on speed. What can be read from it?'),
    antworten: [
      a(P(`Summe und Korrelation sind festgelegt; auffällig ist die wachsende Streuung der Residuen`, `Sum and correlation are fixed; conspicuous is the growing spread of the residuals`),
        P('Bei kleinsten Quadraten mit Konstante sind Summe der Residuen und Korrelation mit dem Prädiktor null; sie taugen nicht, um fehlende Variablen zu entdecken. Wachsende Streuung weist auf ungleiche Fehlervarianz (Heteroskedastizität) hin.',
          'With least squares and a constant, the sum of the residuals and the correlation with the predictor are zero; they are no use for detecting missing variables. Growing spread points to unequal error variance (heteroskedasticity).'), true),
      a(P(`Summe ${zd('rv_sum', 3)} und Korrelation ${zd('rv_cor', 3)} belegen, dass das Modell passt und keine Variable fehlt`, `Sum ${ze('rv_sum', 3)} and correlation ${ze('rv_cor', 3)} show that the model fits and no variable is missing`),
        P('Beide Werte sind bei kleinsten Quadraten mit Konstante festgelegt. Sie sagen darum nichts über die Passung des Modells.', 'Both values are fixed by least squares with a constant. They therefore say nothing about how well the model fits.')),
      a(P('Die wachsende Streuung der Residuen deutet auf Autokorrelation der Fehler hin', 'The growing spread of the residuals points to autocorrelation of the errors'),
        P('Wachsende Streuung der Residuen ist Varianzheterogenität (Heteroskedastizität), nicht Autokorrelation.', 'Growing spread of the residuals is heterogeneity of variance (heteroskedasticity), not autocorrelation.'))
    ],
    hilfe: ['residuenplot', 'heteroskedastizitaet'], belege: ['wissen:reg-residuen-eigenschaften', 'wissen:dormann-residuenplot']
  },

  // ---- Prüfungspfade (02.11.2026): Einheit regression-tabelle-lesen, Fall mtcars (Gewicht und Getriebe als 0/1-Größe) ----
  {
    id: 'reg-tl-konstante', thema: 'regression', fall: 'rg-mt', karte: 'vorhersage',
    stamm: P(`In der Koeffizienten-Tabelle steht für die Konstante ${zd('rt_const', 3)}. Wie ist die Zahl zu lesen?`, `In the coefficients table the constant is ${ze('rt_const', 3)}. How is the figure to be read?`),
    antworten: [
      a(P('Als Vorhersagewert für Automatikwagen mit dem Gewicht 0, das in den Daten gar nicht vorkommt', 'As the predicted value for automatic cars at weight 0, which the data do not contain'),
        P('Die Konstante ist der Vorhersagewert, wenn alle Größen null sind: wt = 0 und am = 0. Ein Wagen ohne Gewicht fehlt in den Daten, die Zahl ist darum eine Rechengröße und legt die Lage des Modells fest.', 'The constant is the predicted value when all variables are zero: wt = 0 and am = 0. A car without weight is absent from the data, so the figure is a computational quantity that fixes the position of the model.'), true),
      a(P('Als Durchschnitt der Meilen je Gallone aller Automatikwagen, die in den Daten stehen', 'As the average miles per gallon of all automatic cars that are included in the data'),
        P('Das gälte nur in einem Modell ohne Gewicht, dort ist die Konstante der Mittelwert der Referenzgruppe. Hier steht das Gewicht im Modell, und die Konstante gehört zum Gewicht 0.', 'That would hold only in a model without weight, where the constant is the mean of the reference group. Here weight is in the model, and the constant belongs to a weight of 0.')),
      a(P('Als Meilen je Gallone eines Wagens mit Handschaltung, wenn sein Gewicht auf null gesetzt wird', 'As the miles per gallon of a car with manual transmission if its weight is set to zero'),
        P('Die Referenz ist am = 0, also Automatik. Die Handschaltung (am = 1) kommt erst über das B der Zeile am hinzu.', 'The reference is am = 0, that is automatic. The manual transmission (am = 1) is added only through the B of the row am.'))
    ],
    hilfe: [...HB, 'dummy-variable'], belege: ['wissen:reg-steigung-deutung-einheit', 'wissen:reg-dummy-kodierung', 'wissen:reg-partielle-koeffizienten']
  },
  {
    id: 'reg-tl-b-gewicht', thema: 'regression', fall: 'rg-mt', karte: 'vorhersage',
    stamm: P(`Die Zeile wt zeigt das B ${zd('rt_b_wt', 3)}. Wie lautet die Deutung?`, `The row wt shows the B ${ze('rt_b_wt', 3)}. How is it read?`),
    antworten: [
      a(P(`Bei gleichem Getriebe gehören 1000 Pfund mehr zu im Mittel ${za('rt_b_wt', 2)} Meilen je Gallone weniger`, `At equal transmission, 1000 lbs more weight go with ${zae('rt_b_wt', 2)} fewer miles per gallon on average`),
        P('B ist die erwartete Änderung der abhängigen Größe bei einer Einheit mehr, wenn die übrigen Größen gleich bleiben. Eine Einheit von wt sind 1000 Pfund.', 'B is the expected change of the dependent variable for one unit more, with the other variables held constant. One unit of wt is 1000 lbs.'), true),
      a(P(`Ein einzelner Wagen fährt mit 1000 Pfund mehr Gewicht um ${za('rt_b_wt', 2)} Meilen je Gallone weniger weit`, `A single car goes ${zae('rt_b_wt', 2)} fewer miles per gallon with 1000 lbs more weight than another`),
        P('B beschreibt einen Durchschnitt über die Wagen und sagt nichts darüber, was bei einem einzelnen Wagen geschieht.', 'B describes an average over the cars and says nothing about what happens to a single car.')),
      a(P(`Das Gewicht erklärt ${za('rt_b_wt', 2)} Prozent der Streuung der Meilen je Gallone in den Daten dieser Tabelle`, `Weight explains ${zae('rt_b_wt', 2)} percent of the variation of miles per gallon in the data of this table`),
        P('Der erklärte Anteil der Streuung steht im R². B ist die Steigung, in Meilen je Gallone für 1000 Pfund.', 'The explained share of the variation is given by R². B is the slope, in miles per gallon per 1000 lbs.'))
    ],
    hilfe: HB, belege: ['wissen:reg-steigung-deutung-einheit', 'wissen:reg-partielle-koeffizienten', 'wissen:kohn-regression-interpretation']
  },
  {
    id: 'reg-tl-null-eins', thema: 'regression', fall: 'rg-mt', karte: 'vorhersage',
    stamm: P(`Die Größe am ist 0 bei Automatik und 1 bei Handschaltung, ihr B beträgt ${zd('rt_b_am', 3)}. Was sagt die Zeile am?`, `The variable am is 0 for automatic and 1 for manual, its B is ${ze('rt_b_am', 3)}. What does the row am say?`),
    antworten: [
      a(P(`Bei gleichem Gewicht fahren Handschalter im Mittel ${za('rt_b_am', 2)} Meilen je Gallone weniger weit als Automatikwagen`, `At equal weight, manual cars go ${zae('rt_b_am', 2)} fewer miles per gallon on average than automatic ones`),
        P('Bei einer 0/1-Größe ist B der Unterschied zwischen den zwei Gruppen. Stehen weitere Größen im Modell, gilt er bei gleichen Werten dieser Größen. Hier ist er winzig.', 'For a 0/1 variable B is the difference between the two groups. If further variables are in the model, it holds at equal values of these variables. Here it is tiny.'), true),
      a(P(`Handschalter fahren im Mittel ${za('rt_b_am', 2)} Meilen je Gallone weniger weit als Automatikwagen, ohne Rücksicht auf das Gewicht`, `Manual cars go ${zae('rt_b_am', 2)} fewer miles per gallon on average than automatic cars, regardless of weight`),
        P(`Der Rohunterschied der Mittelwerte steht nicht in dieser Zeile. Er ist mit ${zd('rm_diff', 3)} viel größer und gehört zu einem Modell ohne Gewicht. Die Zeile gilt bei gleichem Gewicht.`, `The raw difference of the means is not in this row. At ${ze('rm_diff', 3)} it is much larger and belongs to a model without weight. The row holds at equal weight.`)),
      a(P(`Wer eine Handschaltung einbaut, verändert die Reichweite seines Wagens um ${za('rt_b_am', 2)} Meilen je Gallone`, `Whoever fits a manual transmission changes the range of the car by ${zae('rt_b_am', 2)} miles per gallon`),
        P('Die Daten vergleichen verschiedene Wagen. Sie zeigen einen Zusammenhang im Durchschnitt, keine Wirkung eines Einbaus bei einem einzelnen Wagen.', 'The data compare different cars. They show a relation on average, not the effect of fitting a transmission to a single car.'))
    ],
    hilfe: [...HB, 'dummy-variable'], belege: ['wissen:reg-dummy-kodierung', 'wissen:reg-partielle-koeffizienten', 'wissen:kohn-regression-interpretation']
  },
  {
    id: 'reg-tl-sig-am', thema: 'regression', fall: 'rg-mt', karte: 'vorhersage',
    stamm: P(`Angenommen, ein Sig. unter ${zd('regel_sig')} gilt als signifikant. Für die Größe am steht dort Sig. ${zd('rt_p_am', 3)}. Was ist gedeckt?`, `Assume a Sig. below ${ze('regel_sig')} counts as significant. For the variable am the table gives Sig. ${ze('rt_p_am', 3)}. What is supported?`),
    antworten: [
      a(P('Der geschätzte Getriebeunterschied ist bei gleichem Gewicht mit null gut vereinbar', 'The estimated transmission difference is well compatible with zero at equal weight'),
        P('Sig. ist der zweiseitige p-Wert zum Test von B gegen null. Ein Wert weit über dem Niveau spricht nicht gegen B = 0. Ein p-Wert beschreibt die Daten unter der Annahme B = 0, nicht die Hypothese selbst.', 'Sig. is the two-sided p value of the test of B against zero. A value far above the level does not speak against B = 0. A p value describes the data under the assumption B = 0, not the hypothesis itself.'), true),
      a(P('Ein Sig. nahe 1 heißt, dass der Wert von B in dieser Stichprobe sehr genau geschätzt wurde', 'A Sig. close to 1 means that the value of B was estimated very precisely in this sample'),
        P('Die Genauigkeit der Schätzung zeigt der Standardfehler. Ein Sig. nahe 1 heißt nur, dass B = 0 gut zu den Daten passt.', 'The precision of the estimate is shown by the standard error. A Sig. close to 1 only means that B = 0 fits the data well.')),
      a(P('Das Getriebe hat keinen Zusammenhang mit der Reichweite der Wagen, das zeigt die Tabelle', 'The transmission has no relation with the range of the cars, that is what the table shows'),
        P('Ein Ergebnis über dem Niveau beweist keine Gleichheit. Außerdem gilt die Zeile bei gleichem Gewicht, im Modell ohne Gewicht sieht der Zusammenhang anders aus.', 'A result above the level proves no equality. Also, the row holds at equal weight; in the model without weight the relation looks different.'))
    ],
    hilfe: [...HB, 'signifikanz'], belege: ['wissen:reg-spss-tabelle', 'wissen:reg-t-test-steigung', 'wissen:p-wert-definition', 'wissen:wasserstein16-p-nicht-wahrscheinlichkeit']
  },
  {
    id: 'reg-tl-standardfehler', thema: 'regression', fall: 'rg-mt', karte: 'vorhersage',
    stamm: P(`Die Zeile wt nennt den Standardfehler ${zd('rt_se_wt', 3)}. Was zeigt diese Zahl?`, `The row wt gives the standard error ${ze('rt_se_wt', 3)}. What does this figure show?`),
    antworten: [
      a(P('Wie stark die geschätzte Steigung des Gewichts zwischen Stichproben schwankt', 'How much the estimated slope of weight varies from sample to sample'),
        P('Der Standardfehler eines Koeffizienten ist das Maß der Unsicherheit seiner Schätzung, also der Streuung des Schätzers über viele Stichproben. Aus B und Standardfehler ergibt sich t = B geteilt durch Standardfehler.', 'The standard error of a coefficient measures the uncertainty of its estimate, that is the spread of the estimator over many samples. B and the standard error give t = B divided by the standard error.'), true),
      a(P('Wie weit die einzelnen Wagen im Mittel von der Regressionsgeraden entfernt liegen', 'How far the individual cars lie from the regression line on average'),
        P('Das beschreibt die Genauigkeit der Vorhersage (Standardschätzfehler, in Meilen je Gallone), nicht die Unsicherheit eines Koeffizienten.', 'That describes the accuracy of the prediction (standard error of the estimate, in miles per gallon), not the uncertainty of a coefficient.')),
      a(P(`Wie breit die Meilen je Gallone der ${zn('rt_n')} Wagen um deren gemeinsamen Mittelwert streuen`, `How widely the miles per gallon of the ${zn('rt_n')} cars spread around their common mean`),
        P('Das wäre die Standardabweichung der Daten. Der Standardfehler beschreibt die Unsicherheit einer Schätzung, nicht die Streuung der Wagen.', 'That would be the standard deviation of the data. The standard error describes the uncertainty of an estimate, not the spread of the cars.'))
    ],
    hilfe: [...HB, 'standardfehler-schaetzer'], belege: ['wissen:altman05-se-allgemein', 'wissen:reg-t-test-steigung', 'wissen:reg-standardschaetzfehler', 'wissen:altman05-sd-gegen-standardfehler']
  },
  {
    id: 'reg-tl-mehrfach', thema: 'regression', fall: 'rg-mt', karte: 'vorhersage', mehrfach: true,
    stamm: P('Es geht um die Koeffizienten-Tabelle zu Gewicht und Getriebe. Welche Aussagen stimmen? Mehrere können stimmen.', 'This is about the coefficients table for weight and transmission. Which statements are correct? Several may be correct.'),
    antworten: [
      a(P(`Das t der Zeile wt ergibt sich, wenn B durch den Standardfehler geteilt wird, also rund ${zd('rt_t_wt', 2)}`, `The t of the row wt results from dividing B by the standard error, that is about ${ze('rt_t_wt', 2)}`),
        P(`t = B geteilt durch Standardfehler: ${zd('rt_b_wt', 3)} geteilt durch ${zd('rt_se_wt', 3)} ergibt rund ${zd('rt_t_wt', 2)}.`, `t = B divided by the standard error: ${ze('rt_b_wt', 3)} divided by ${ze('rt_se_wt', 3)} gives about ${ze('rt_t_wt', 2)}.`), true),
      a(P('Das Beta der Zeile wt wird in Standardabweichungen gemessen und hat darum keine Einheit', 'The Beta of the row wt is measured in standard deviations and therefore has no unit'),
        P('Beta ist der Koeffizient bei z-standardisierten Variablen und damit maßstabsfrei.', 'Beta is the coefficient for z-standardized variables and therefore free of scale.'), true),
      a(P('Das B der Zeile am ist der Unterschied der Mittelwerte beider Getriebearten ohne Rücksicht auf das Gewicht', 'The B of the row am is the difference between the means of both transmission types regardless of weight'),
        P('In diesem Modell gilt B bei gleichem Gewicht. Der Rohunterschied der Mittelwerte ist eine andere Zahl und gehört zum Modell ohne Gewicht.', 'In this model B holds at equal weight. The raw difference of the means is another figure and belongs to the model without weight.')),
      a(P('Ein Sig. weit über dem Niveau bei am zeigt, dass das Getriebe für die Reichweite praktisch keine Rolle spielt', 'A Sig. far above the level for am shows that the transmission plays practically no role for the range'),
        P('Sig. beurteilt, wie gut B = 0 zu den Daten passt. Es beweist keinen Nullunterschied und sagt nichts über praktische Bedeutung.', 'Sig. judges how well B = 0 fits the data. It proves no zero difference and says nothing about practical importance.'))
    ],
    hilfe: [...HB, 'signifikanz', 'standardfehler-schaetzer'], belege: ['wissen:reg-t-test-steigung', 'wissen:reg-beta-definition', 'wissen:reg-partielle-koeffizienten', 'wissen:p-wert-definition', 'wissen:signifikant-nicht-bedeutsam']
  },

  // ---- Einheit regression-modelle-vergleichen, Fall mtcars mit drei Modellen ----
  {
    id: 'reg-mv-sig-wechsel', thema: 'regression', fall: 'rg-md', karte: 'vorhersage',
    stamm: P(`Die Größe am hat in Modell 2 (nur am) das Sig. <,001, in Modell 3 (wt und am) das Sig. ${zd('rt_p_am', 3)}. Wie lässt sich das erklären?`, `The variable am has the Sig. <.001 in model 2 (am only) and the Sig. ${ze('rt_p_am', 3)} in model 3 (wt and am). How can this be explained?`),
    antworten: [
      a(P(`Handschalter sind hier leichter (${zd('rm_wt1', 2)} gegen ${zd('rm_wt0', 2)}), bei gleichem Gewicht bleibt kaum ein Unterschied`, `Manual cars are lighter here (${ze('rm_wt1', 2)} against ${ze('rm_wt0', 2)}); at equal weight hardly any difference remains`),
        P(`Ein partieller Koeffizient gilt bei konstant gehaltenen übrigen Größen und ändert sich, wenn Größen hinzukommen. Hängen zwei Größen zusammen (hier r = ${zd('rm_r_wt_am', 3)}), steckt ein Teil des Zusammenhangs der einen in der anderen.`, `A partial coefficient holds with the other variables held constant and changes when variables are added. If two variables are related (here r = ${ze('rm_r_wt_am', 3)}), part of the relation of one is contained in the other.`), true),
      a(P('Im Modell mit zwei Größen stehen weniger Wagen zur Verfügung, darum steigt das Sig. dort deutlich an', 'In the model with two variables fewer cars are available, so the Sig. rises sharply there'),
        P(`Beide Modelle benutzen alle ${zn('rt_n')} Wagen. Das Sig. ändert sich, weil sich die Frage ändert: Unterschied bei gleichem Gewicht statt Rohunterschied.`, `Both models use all ${zn('rt_n')} cars. The Sig. changes because the question changes: difference at equal weight instead of the raw difference.`)),
      a(P('Es liegt ein Rechenfehler vor, denn dieselbe Größe hat in jedem Modell dasselbe Sig. als Ergebnis', 'There is a calculation error, since the same variable has the same Sig. as its result in every model'),
        P('Der Koeffizient einer Größe hängt vom Modell ab. Bei unkorrelierten Größen wäre er in beiden Modellen gleich.', 'The coefficient of a variable depends on the model. For uncorrelated variables it would be the same in both models.'))
    ],
    hilfe: [...HB, 'signifikanz', 'dummy-variable'], belege: ['wissen:reg-partielle-koeffizienten', 'wissen:zuur10-kollinearitaet', 'wissen:reg-dummy-kodierung']
  },
  {
    id: 'reg-mv-r2', thema: 'regression', fall: 'rg-md', karte: 'vorhersage',
    stamm: P(`R² beträgt ${zd('rm_r2_1', 3)} in Modell 1 (nur wt) und ${zd('rm_r2_3', 3)} in Modell 3 (wt und am); das korrigierte R² beträgt ${zd('rm_adj_1', 3)} und ${zd('rm_adj_3', 3)}. Was ist gedeckt?`, `R² is ${ze('rm_r2_1', 3)} in model 1 (wt only) and ${ze('rm_r2_3', 3)} in model 3 (wt and am); adjusted R² is ${ze('rm_adj_1', 3)} and ${ze('rm_adj_3', 3)}. What is supported?`),
    antworten: [
      a(P('Das Getriebe bringt zum Gewicht kaum etwas dazu, denn das korrigierte R² sinkt sogar', 'The transmission adds hardly anything to weight, since adjusted R² even falls'),
        P('R² kann durch zusätzliche Größen nur steigen. Das korrigierte R² bestraft Komplexität; sinkt es, bringt die neue Größe zu wenig (ein Hinweis, kein Beweis).', 'R² can only rise with additional variables. Adjusted R² penalizes complexity; if it falls, the new variable adds too little (a hint, not a proof).'), true),
      a(P('Das zweite Modell ist besser, denn sein R² ist nicht kleiner als das R² des ersten', 'The second model is better, since its R² is no smaller than the R² of the first'),
        P('R² kann beim Hinzufügen einer Größe nicht sinken. Ein gleiches R² zeigt gerade, dass nichts dazukommt.', 'R² cannot fall when a variable is added. An equal R² shows precisely that nothing is gained.')),
      a(P('Beide R² sind gleich, also erklären Gewicht und Getriebe dieselbe Streuung und sind austauschbar', 'Both R² are equal, so weight and transmission explain the same variation and are interchangeable'),
        P(`Das gleiche R² sagt nur, dass am zum Gewicht nichts beiträgt. Austauschbar sind die Größen nicht: Modell 2 (nur am) hat R² ${zd('rm_r2_2', 3)}.`, `The equal R² only says that am adds nothing to weight. The variables are not interchangeable: model 2 (am only) has R² ${ze('rm_r2_2', 3)}.`))
    ],
    hilfe: [...HILFE, 'r-quadrat'], belege: ['wissen:reg-r2-adjustiert', 'wissen:reg-modellvergleich', 'wissen:reg-r2-definition']
  },
  {
    id: 'reg-mv-wahl', thema: 'regression', fall: 'rg-md', karte: 'vorhersage',
    stamm: P('Angenommen, es wird nach dem höheren korrigierten R² und nach dem Sig. der einzelnen Größen entschieden. Welches der drei Modelle ist für die Vorhersage der Meilen je Gallone vorzuziehen?', 'Assume the decision follows the higher adjusted R² and the Sig. of the single variables. Which of the three models is preferable for predicting miles per gallon?'),
    antworten: [
      a(P('Modell 1 mit nur dem Gewicht: höchstes korrigiertes R² und eine Größe weniger', 'Model 1 with weight only: highest adjusted R² and one variable fewer'),
        P(`Modell 1 hat das korrigierte R² ${zd('rm_adj_1', 3)}, Modell 3 nur ${zd('rm_adj_3', 3)}; in Modell 3 ist am zudem ohne Signifikanz. Auch die Sparsamkeit spricht für Modell 1.`, `Model 1 has the adjusted R² ${ze('rm_adj_1', 3)}, model 3 only ${ze('rm_adj_3', 3)}; in model 3 am is also without significance. Parsimony speaks for model 1 as well.`), true),
      a(P('Modell 3 mit beiden Größen, denn es enthält mehr Angaben zu den Wagen', 'Model 3 with both variables, since it contains more information about the cars'),
        P('Mehr Größen erhöhen R², aber nicht zwingend das korrigierte R². Entscheidend sind korrigiertes R², Sig. und Sparsamkeit.', 'More variables raise R², but not necessarily adjusted R². What counts are adjusted R², Sig. and parsimony.')),
      a(P('Modell 2 mit nur dem Getriebe, denn dort ist die Getriebegröße signifikant, in Modell 3 nicht', 'Model 2 with transmission only, since there the transmission variable is significant, in model 3 it is not'),
        P(`Eine signifikante Größe heißt nicht, dass das Modell gut vorhersagt. Modell 2 hat das kleinste korrigierte R² (${zd('rm_adj_2', 3)}).`, `A significant variable does not mean that the model predicts well. Model 2 has the smallest adjusted R² (${ze('rm_adj_2', 3)}).`))
    ],
    hilfe: [...HILFE, 'r-quadrat'], belege: ['wissen:reg-modellvergleich', 'wissen:reg-r2-adjustiert']
  },
  {
    id: 'reg-mv-r2-deutung', thema: 'regression', fall: 'rg-md', karte: 'vorhersage',
    stamm: P(`In Modell 2 (nur am) beträgt R² ${zd('rm_r2_2', 3)}. Wie ist die Zahl zu lesen?`, `In model 2 (am only) R² is ${ze('rm_r2_2', 3)}. How is the figure to be read?`),
    antworten: [
      a(P(`Rund ${zp('rm_r2_2')} Prozent der Streuung der Meilen je Gallone hängen mit der Getriebeart zusammen`, `About ${zp('rm_r2_2')} percent of the variation in miles per gallon goes with the transmission type`),
        P(`R² ist der Anteil der Streuung der abhängigen Größe, der mit dem Modell verbunden ist. Bei einer einzigen Größe ist R² das Quadrat der Korrelation (hier R = ${zd('rm_r_2', 3)}).`, `R² is the share of the variation of the dependent variable that is related to the model. With a single variable R² is the square of the correlation (here R = ${ze('rm_r_2', 3)}).`), true),
      a(P(`Das Getriebe bestimmt bei ${zp('rm_r2_2')} Prozent der Wagen, wie weit sie mit einer Gallone Benzin kommen`, `The transmission determines for ${zp('rm_r2_2')} percent of the cars how far they get on one gallon of fuel`),
        P('R² gilt für die Streuung insgesamt, nicht für einzelne Wagen. Es zeigt außerdem einen Zusammenhang, keine Bestimmung.', 'R² refers to the variation as a whole, not to single cars. It also shows a relation, not a determination.')),
      a(P(`Bei ${zp('rm_r2_2')} Prozent der Wagen trifft die Vorhersage der Meilen je Gallone durch das Modell zu`, `For ${zp('rm_r2_2')} percent of the cars the prediction of miles per gallon by the model is correct`),
        P('R² ist keine Trefferquote. Es nennt den erklärten Anteil der Streuung, nicht den Anteil richtig vorhergesagter Wagen.', 'R² is no hit rate. It gives the explained share of the variation, not the share of correctly predicted cars.'))
    ],
    hilfe: [...HILFE, 'r-quadrat'], belege: ['wissen:reg-r2-definition', 'wissen:kohn-regression-interpretation']
  },
  {
    id: 'reg-mv-dummy-mittel', thema: 'regression', fall: 'rg-md', karte: 'vorhersage',
    stamm: P(`In Modell 2 ist die Konstante ${zd('rm_const2', 3)} und das B der Größe am ${zd('rm_b_am2', 3)}. Die letzte Tabelle zeigt die Mittelwerte je Getriebeart. Was gilt?`, `In model 2 the constant is ${ze('rm_const2', 3)} and the B of the variable am is ${ze('rm_b_am2', 3)}. The last table shows the means by transmission type. What holds?`),
    antworten: [
      a(P('Die Konstante ist der Mittelwert der Automatikwagen, B die Differenz der beiden Mittelwerte', 'The constant is the mean of the automatic cars, B is the difference of the two means'),
        P(`Bei einer einzigen 0/1-Größe ist die Konstante der Mittelwert der Referenzgruppe und B die Mittelwertdifferenz. Die Mittelwerte ${zd('rm_mpg0', 2)} und ${zd('rm_mpg1', 2)} stehen in der Tabelle.`, `With a single 0/1 variable the constant is the mean of the reference group and B the difference of the means. The means ${ze('rm_mpg0', 2)} and ${ze('rm_mpg1', 2)} are in the table.`), true),
      a(P('Die Konstante ist der Mittelwert aller Wagen, B ist der Anteil der Handschalter unter ihnen', 'The constant is the mean of all cars, B is the share of manual cars among all of them'),
        P('Die Konstante gehört zu am = 0, nicht zu allen Wagen. B zeigt den Unterschied beim Wechsel von 0 auf 1.', 'The constant belongs to am = 0, not to all cars. B shows the difference when changing from 0 to 1.')),
      a(P('Die Konstante ist der Mittelwert der Handschalter, B ist das Verhältnis der beiden Mittelwerte', 'The constant is the mean of the manual cars, B is the ratio of the two group means'),
        P(`Die Referenz ist am = 0, also Automatik. B ist eine Differenz, kein Verhältnis; das Verhältnis wäre ${zd('rm_ratio_mw', 2)}.`, `The reference is am = 0, that is automatic. B is a difference, not a ratio; the ratio would be ${ze('rm_ratio_mw', 2)}.`))
    ],
    hilfe: [...HB, 'dummy-variable'], belege: ['wissen:reg-dummy-kodierung', 'wissen:reg-spss-tabelle']
  },
  {
    id: 'reg-mv-mehrfach', thema: 'regression', fall: 'rg-md', karte: 'vorhersage', mehrfach: true,
    stamm: P('Es geht um den Vergleich der drei Modelle. Welche Aussagen stimmen? Mehrere können stimmen.', 'This is about the comparison of the three models. Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Modell 1 steckt in Modell 3; darum kann das R² von Modell 3 nicht kleiner sein als das von Modell 1', 'Model 1 is contained in model 3; therefore the R² of model 3 cannot be below that of model 1'),
        P('R² kann durch zusätzliche Größen nur steigen. Das korrigierte R² zieht die Zahl der Größen ab und kann sinken.', 'R² can only rise with additional variables. Adjusted R² takes the number of variables into account and can fall.'), true),
      a(P('Das Sig. von am unterscheidet sich zwischen Modell 2 und 3, weil in Modell 3 das Gewicht gleich bleibt', 'The Sig. of am differs between models 2 and 3 because weight is held constant in model 3'),
        P('Ein partieller Koeffizient gilt bei konstant gehaltenen übrigen Größen und ändert sich, wenn Größen hinzukommen.', 'A partial coefficient holds with the other variables held constant and changes when variables are added.'), true),
      a(P('Liegt das korrigierte R² unter dem R² des Modells, so ist in der Rechnung ein Fehler passiert', 'If adjusted R² lies below the R² of the model, an error has happened in the calculation'),
        P('Das korrigierte R² zieht die Zahl der Größen ab und liegt wegen dieser Korrektur in der Regel unter R², das ist gewollt.', 'Adjusted R² takes the number of variables into account and, because of this correction, usually lies below R²; that is intended.')),
      a(P('Ist am in Modell 2 signifikant, so bleibt die Größe auch in Modell 3 mit denselben Wagen signifikant', 'If am is significant in model 2, the variable stays significant in model 3 with the same cars'),
        P('Hier ist am in Modell 3 ohne Signifikanz. Der Koeffizient hängt davon ab, welche Größen im Modell stehen.', 'Here am is without significance in model 3. The coefficient depends on which variables are in the model.'))
    ],
    hilfe: [...HILFE, 'r-quadrat', 'signifikanz'], belege: ['wissen:reg-r2-adjustiert', 'wissen:reg-partielle-koeffizienten', 'wissen:reg-modellvergleich']
  },

  // ---- Einheit regression-studien-vergleichen: Studie 1 (mtcars) gegen Studie 2 (MASS::Cars93) ----
  {
    id: 'reg-sv-b-einheit', thema: 'regression', fall: 'rg-c93', karte: 'vorhersage',
    stamm: P(`Das B des Gewichts beträgt in Studie 1 ${zd('rt_b_wt', 3)} (Gewicht in 1000 Pfund) und in Studie 2 ${zd('rs_b_w', 3)} (Gewicht in 100 kg). Was folgt daraus?`, `The B of weight is ${ze('rt_b_wt', 3)} in study 1 (weight in 1000 lbs) and ${ze('rs_b_w', 3)} in study 2 (weight in 100 kg). What follows?`),
    antworten: [
      a(P('Die B-Werte sind so nicht vergleichbar, weil das Gewicht verschiedene Einheiten hat', 'The B values are not comparable as they stand, since weight has different units'),
        P(`B ändert sich mit der Maßeinheit der Größe, ohne dass sich der Zusammenhang ändert. Mit dem Gewicht in Pfund stünde in Studie 2 ein B von ${zd('rs_b_w_lb', 4)}.`, `B changes with the unit of the variable without the relation changing. With weight in pounds, study 2 would show a B of ${ze('rs_b_w_lb', 4)}.`), true),
      a(P(`Das Gewicht wirkt in Studie 1 etwa ${zd('rs_ratio_b', 1)}-mal so stark auf die Reichweite wie in Studie 2`, `Weight acts about ${ze('rs_ratio_b', 1)} times as strongly on the range in study 1 as in study 2`),
        P('Der Quotient vergleicht Größen in verschiedenen Einheiten, 1000 Pfund gegen 100 kg. Über die Stärke sagt er nichts, und eine Wirkung zeigt die Zahl ohnehin nicht.', 'The ratio compares variables in different units, 1000 lbs against 100 kg. It says nothing about strength, and the figure does not show an effect anyway.')),
      a(P('Die B-Werte sind vergleichbar, weil beide Studien die Reichweite in Meilen je Gallone messen', 'The B values are comparable because both studies measure the range in miles per gallon'),
        P('Gleich ist nur die Einheit der abhängigen Größe. B gibt die Änderung je Einheit der unabhängigen Größe an, und deren Einheit ist verschieden.', 'Only the unit of the dependent variable is the same. B gives the change per unit of the independent variable, and its unit differs.'))
    ],
    hilfe: [...HB, 'standardisierter-koeffizient'], belege: ['wissen:reg-steigung-deutung-einheit', 'wissen:reg-beta-definition']
  },
  {
    id: 'reg-sv-beta', thema: 'regression', fall: 'rg-c93', karte: 'vorhersage',
    stamm: P(`Das Beta des Gewichts beträgt ${zd('rt_beta_wt', 3)} in Studie 1 und ${zd('rs_beta_w', 3)} in Studie 2. Wie lautet die Deutung?`, `The Beta of weight is ${ze('rt_beta_wt', 3)} in study 1 and ${ze('rs_beta_w', 3)} in study 2. How is it read?`),
    antworten: [
      a(P(`Je Standardabweichung mehr Gewicht liegt die Reichweite bei gleicher Getriebegröße in beiden Studien rund ${za('rs_beta_w', 1)} Standardabweichungen tiefer`, `Per standard deviation more weight the range lies about ${zae('rs_beta_w', 1)} standard deviations lower in both studies at equal transmission`),
        P('Beta ist der partielle Koeffizient bei z-standardisierten Variablen und damit maßstabsfrei: Die Einheit des Gewichts spielt keine Rolle mehr. Es gilt bei gleicher Getriebegröße und beschreibt jeweils die eigene Stichprobe.', 'Beta is the partial coefficient for z-standardized variables and therefore free of scale: the unit of weight no longer matters. It holds at equal transmission and describes each sample on its own.'), true),
      a(P(`Ein Beta von ${zd('rt_beta_wt', 2)} heißt, dass das Gewicht fast neun Zehntel der Streuung der Reichweite aller untersuchten Wagen erklärt`, `A Beta of ${ze('rt_beta_wt', 2)} means that weight explains almost nine tenths of the variation of the range of all cars`),
        P(`Der erklärte Anteil der Streuung steht im R² (Studie 1: ${zd('rt_r2', 3)}, Studie 2: ${zd('rs_r2', 3)}). Beta ist in Standardabweichungen gemessen.`, `The explained share of the variation is given by R² (study 1: ${ze('rt_r2', 3)}, study 2: ${ze('rs_r2', 3)}). Beta is measured in standard deviations.`)),
      a(P(`Mit jedem zusätzlichen Pfund Gewicht sinkt die Reichweite eines einzelnen Wagens in Studie 1 um ${za('rt_beta_wt', 2)} Meilen je Gallone`, `With every additional pound of weight the range of a car falls by ${zae('rt_beta_wt', 2)} miles per gallon in study 1`),
        P('Das verwechselt Beta mit B. Eine Einheit in Beta ist eine Standardabweichung, keine Einheit der Messung.', 'This mixes up Beta and B. One unit in Beta is one standard deviation, not one unit of the measurement.'))
    ],
    hilfe: [...HB, 'standardisierter-koeffizient'], belege: ['wissen:reg-beta-definition', 'wissen:reg-spss-tabelle', 'wissen:reg-partielle-koeffizienten']
  },
  {
    id: 'reg-sv-sig', thema: 'regression', fall: 'rg-c93', karte: 'vorhersage',
    stamm: P(`Angenommen, ein Sig. unter ${zd('regel_sig')} gilt als signifikant. Welche Aussage über die beiden Studien stimmt?`, `Assume a Sig. below ${ze('regel_sig')} counts as significant. Which statement about the two studies is correct?`),
    antworten: [
      a(P('In beiden Studien ist das Gewicht signifikant, die Getriebegröße bei gleichem Gewicht jeweils nicht', 'In both studies weight is significant, whereas the transmission variable is not, at equal weight'),
        P(`Die Spalte Sig. zeigt <,001 für das Gewicht in beiden Studien und ${zd('rt_p_am', 3)} (am) und ${zd('rs_p_man', 3)} (Man.trans.avail) für die Getriebegrößen.`, `The Sig. column shows <.001 for weight in both studies and ${ze('rt_p_am', 3)} (am) and ${ze('rs_p_man', 3)} (Man.trans.avail) for the transmission variables.`), true),
      a(P(`Man.trans.avail ist in Studie 2 signifikant, weil ihr B mit ${zd('rs_b_man', 3)} größer ist als das kleine B von am in Studie 1`, `Man.trans.avail is significant in study 2 because its B of ${ze('rs_b_man', 3)} is larger than the B of am`),
        P(`Das Sig. folgt aus t = B geteilt durch Standardfehler, nicht aus der Größe von B allein. Mit ${zd('rs_p_man', 3)} liegt es über ${zd('regel_sig')}.`, `Sig. follows from t = B divided by the standard error, not from the size of B alone. At ${ze('rs_p_man', 3)} it is above ${ze('regel_sig')}.`)),
      a(P('Die Getriebegröße hat in Studie 2 das kleinere Sig. als in Studie 1, also wirkt Handschaltung dort stärker', 'The transmission variable has a smaller Sig. in study 2 than in study 1, so manual acts more strongly there'),
        P(`Sig. misst nicht die Stärke eines Effekts. Es hängt auch von der Fallzahl ab, und Studie 2 hat ${zn('rs_n2')} statt ${zn('rs_n1')} Fälle.`, `Sig. does not measure the strength of an effect. It also depends on the sample size, and study 2 has ${zn('rs_n2')} instead of ${zn('rs_n1')} cases.`))
    ],
    hilfe: [...HB, 'signifikanz'], belege: ['wissen:reg-spss-tabelle', 'wissen:reg-t-test-steigung', 'wissen:reg-standardfehler-steigung', 'wissen:signifikant-nicht-bedeutsam', 'wissen:wasserstein16-p-praezision-effekt']
  },
  {
    id: 'reg-sv-streuung', thema: 'regression', fall: 'rg-c93', karte: 'vorhersage',
    stamm: P(`Die Betas des Gewichts liegen nahe beieinander (${zd('rt_beta_wt', 3)} und ${zd('rs_beta_w', 3)}). Die letzte Tabelle zeigt das Gewicht in Kilogramm. Welcher Schluss ist gedeckt?`, `The Betas of weight are close together (${ze('rt_beta_wt', 3)} and ${ze('rs_beta_w', 3)}). The last table shows weight in kilograms. Which conclusion is supported?`),
    diagramm: DG_STUDIEN,
    antworten: [
      a(P('Beta hängt auch von der Streuung ab; aus ähnlichen Betas lässt sich nicht auf denselben Zusammenhang schließen', 'Beta also depends on the spread; similar Betas do not allow the conclusion of the same relation'),
        P(`Ein standardisierter Koeffizient hängt von der Streuung der Größe in der jeweiligen Stichprobe ab. Das Gewicht streut in Studie 1 mit ${zn('rs_sd1')} kg mehr als in Studie 2 mit ${zn('rs_sd2')} kg; dass die Betas trotzdem nahe beieinander liegen, hängt auch an der Zielgröße und den anderen Einflüssen. Für den Vergleich taugt B bei gleicher Einheit.`, `A standardized coefficient depends on the spread of the variable in the sample at hand. Weight spreads more in study 1, at ${zn('rs_sd1')} kg, than in study 2, at ${zn('rs_sd2')} kg; that the Betas are close nevertheless also depends on the outcome and the other influences. For a comparison, B at the same unit is suitable.`), true),
      a(P('Beta ist eine feste Größe des Zusammenhangs, daher zeigen zwei Studien mit gleichem Beta denselben Zusammenhang', 'Beta is a fixed quantity of the relation, so two studies with the same Beta show the same relation'),
        P('Beta ist kein fester Parameter. Bei gleichem Gesetz können Betas in Stichproben mit verschiedener Streuung verschieden ausfallen (Rechenbeispiel bei Kim und Ferree).', 'Beta is no fixed parameter. Under the same law Betas can differ in samples with different spread (worked example in Kim and Ferree).')),
      a(P(`Weil das mittlere Gewicht ähnlich ist (${zn('rs_mean1')} und ${zn('rs_mean2')} kg), fallen auch die Betas ähnlich aus`, `Because the mean weight is similar (${zn('rs_mean1')} and ${zn('rs_mean2')} kg), the Betas turn out similar as well`),
        P('Beta enthält die Streuung der Größen, nicht ihren Mittelwert. Gleiche Mittelwerte sagen darüber nichts.', 'Beta contains the spread of the variables, not their mean. Equal means say nothing about it.'))
    ],
    hilfe: [...HB, 'standardisierter-koeffizient'], belege: ['wissen:kim-beta-stichprobenabhaengig', 'wissen:reg-beta-definition', 'wissen:kim-unstandardisiert-invariant']
  },
  {
    id: 'reg-sv-vorhersage', thema: 'regression', fall: 'rg-c93', karte: 'vorhersage',
    stamm: P('Mit dem Modell von Studie 2 soll die Reichweite eines Wagens von 1200 kg vorhergesagt werden, bei dem Man.trans.avail den Wert 0 hat. Welcher Wert ergibt sich?', 'With the model of study 2 the range of a car of 1200 kg is to be predicted, for which Man.trans.avail has the value 0. Which value results?'),
    antworten: [
      a(P(`${zd('rs_pred12', 1)} Meilen je Gallone: Konstante plus B mal ${zn('rs_gew')}, denn das Gewicht gilt je 100 kg`, `${ze('rs_pred12', 1)} miles per gallon: constant plus B times ${zn('rs_gew')}, since weight is in units of 100 kg`),
        P(`${zd('rs_const', 3)} plus ${zd('rs_b_w', 3)} mal ${zn('rs_gew')} ergibt rund ${zd('rs_pred12', 1)}. Bei Man.trans.avail = 0 entfällt der letzte Summand. B gilt je Einheit des Gewichts, hier je 100 kg.`, `${ze('rs_const', 3)} plus ${ze('rs_b_w', 3)} times ${zn('rs_gew')} gives about ${ze('rs_pred12', 1)}. With Man.trans.avail = 0 the last term drops out. B holds per unit of weight, here per 100 kg.`), true),
      a(P(`${zd('rs_pred12_falsch', 1)} Meilen je Gallone: Konstante plus B mal ${zd('rs_gew_falsch', 1)}, denn 1200 kg sind ${zd('rs_gew_falsch', 1)} Tonnen`, `${ze('rs_pred12_falsch', 1)} miles per gallon: constant plus B times ${ze('rs_gew_falsch', 1)}, since 1200 kg are ${ze('rs_gew_falsch', 1)} tonnes`),
        P(`Die Einheit der Tabelle ist 100 kg. 1200 kg entsprechen dem Wert ${zn('rs_gew')}, nicht ${zd('rs_gew_falsch', 1)}.`, `The unit of the table is 100 kg. 1200 kg correspond to the value ${zn('rs_gew')}, not ${ze('rs_gew_falsch', 1)}.`)),
      a(P(`${zd('rs_pred12_s1', 1)} Meilen je Gallone: Konstante und B aus Studie 1, das Gewicht in 1000 Pfund eingesetzt`, `${ze('rs_pred12_s1', 1)} miles per gallon: constant and B from study 1, with weight inserted in 1000 lbs`),
        P('Das wäre die Vorhersage des Modells von Studie 1. Gefragt ist das Modell von Studie 2; die beiden unterscheiden sich in Einheit, Daten und B.', 'That would be the prediction of the model of study 1. The question asks for the model of study 2; the two differ in unit, data and B.'))
    ],
    hilfe: HB, belege: ['wissen:reg-steigung-deutung-einheit', 'wissen:reg-spss-tabelle']
  },
  {
    id: 'reg-sv-mehrfach', thema: 'regression', fall: 'rg-c93', karte: 'vorhersage', mehrfach: true,
    stamm: P('Es geht um den Vergleich der beiden Studien zum Gewicht. Welche Aussagen stimmen? Mehrere können stimmen.', 'This is about the comparison of the two studies on weight. Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Das B des Gewichts hängt an der Einheit; in Pfund statt 100 kg stünde in Studie 2 ein anderer Zahlenwert', 'The B of weight depends on the unit; in pounds instead of 100 kg study 2 would show another figure'),
        P(`Mit dem Gewicht in Pfund wäre das B in Studie 2 ${zd('rs_b_w_lb', 4)}; der Zusammenhang bleibt derselbe.`, `With weight in pounds the B in study 2 would be ${ze('rs_b_w_lb', 4)}; the relation stays the same.`), true),
      a(P('Das Beta des Gewichts bleibt gleich, wenn das Gewicht in anderen Messeinheiten angegeben wird', 'The Beta of weight stays the same when weight is given in other units of measurement'),
        P('Beta ist der Koeffizient bei z-standardisierten Variablen und damit maßstabsfrei. Pfund, Kilogramm oder 100 kg ergeben dasselbe Beta.', 'Beta is the coefficient for z-standardized variables and therefore free of scale. Pounds, kilograms or 100 kg give the same Beta.'), true),
      a(P('Weil der Betrag von B in Studie 1 größer ist, ist das Gewicht dort für die Reichweite wichtiger', 'Because the absolute value of B is larger in study 1, weight matters more for the range there'),
        P('Ein größerer Betrag von B bei anderer Einheit zeigt keinen stärkeren Zusammenhang. B ändert sich mit der Einheit.', 'A larger absolute value of B under another unit shows no stronger relation. B changes with the unit.')),
      a(P('Die verschiedene Fallzahl (32 und 93 Wagen) beeinflusst die Standardfehler der Koeffizienten kaum', 'The different sample sizes (32 and 93 cars) hardly influence the standard errors of the coefficients'),
        P('Der Standardfehler der Steigung sinkt bei größerer Fallzahl und größerer Streuung der Größe.', 'The standard error of the slope falls with a larger sample size and a larger spread of the variable.'))
    ],
    hilfe: [...HB, 'standardisierter-koeffizient'], belege: ['wissen:reg-steigung-deutung-einheit', 'wissen:reg-beta-definition', 'wissen:reg-standardfehler-steigung']
  },
  // ---- Einheit regression-effekte-einordnen: Richtwerte für Beta und R² nur als gesetzte Regel im Stamm ----
  {
    id: 'reg-ef-beta-einstufen', thema: 'regression', fall: 'rg-eb', karte: 'vorhersage',
    stamm: P(`Angenommen, es zählt der Betrag von Beta, und ab ${zd('ef_beta_klein', 1)} gilt ein Effekt als klein, ab ${zd('ef_beta_mittel', 1)} als mittel, ab ${zd('ef_beta_gross', 1)} als groß. Wie werden die Getriebegrößen (am und Man.trans.avail) eingestuft?`,
      `Assume the absolute value of Beta counts, and from ${ze('ef_beta_klein', 1)} an effect counts as small, from ${ze('ef_beta_mittel', 1)} as medium, from ${ze('ef_beta_gross', 1)} as large. How are the transmission variables (am and Man.trans.avail) rated?`),
    antworten: [
      a(P(`Studie 1 (Beta ${zd('rt_beta_am', 3)}) liegt unter der Schwelle für klein, Studie 2 (${zd('rs_beta_man', 3)}) knapp darüber`, `Study 1 (Beta ${ze('rt_beta_am', 3)}) lies below the threshold for small, study 2 (${ze('rs_beta_man', 3)}) just above it`),
        P(`Es zählt der Betrag: ${za('rt_beta_am', 3)} liegt unter ${zd('ef_beta_klein', 1)}, ${za('rs_beta_man', 3)} darüber und unter ${zd('ef_beta_mittel', 1)}. Das Vorzeichen zeigt nur die Richtung.`, `The absolute value counts: ${zae('rt_beta_am', 3)} is below ${ze('ef_beta_klein', 1)}, ${zae('rs_beta_man', 3)} above it and below ${ze('ef_beta_mittel', 1)}. The sign only shows the direction.`), true),
      a(P(`Beide liegen unter ${zd('ef_beta_klein', 1)}, weil ihr Beta jeweils negativ ist und damit unter jeder Schwelle bleibt`, `Both lie below ${ze('ef_beta_klein', 1)} because their Beta is negative in each case and so stays under every threshold`),
        P(`Angenommen wurde der Betrag. Der Betrag von ${zd('rs_beta_man', 3)} ist ${za('rs_beta_man', 3)} und liegt damit über der Schwelle für klein.`, `The absolute value was assumed. The absolute value of ${ze('rs_beta_man', 3)} is ${zae('rs_beta_man', 3)}, which lies above the threshold for small.`)),
      a(P(`Beide gelten als ohne Effekt, weil das Sig. in beiden Studien über ${zd('regel_sig')} liegt`, `Both count as having no effect because Sig. lies above ${ze('regel_sig')} in both studies`),
        P('Sig. und Größe sind getrennte Fragen: Sig. hängt auch von der Genauigkeit der Schätzung ab und sagt nichts über die Größe des Effekts.', 'Sig. and size are separate questions: Sig. also depends on the precision of the estimate and says nothing about the size of the effect.'))
    ],
    hilfe: [...HB, 'effektstaerke'], belege: ['wissen:effekt-cohen-richtwerte', 'wissen:cohen92-richtwerte-tabelle', 'wissen:signifikant-nicht-bedeutsam', 'wissen:reg-beta-definition']
  },
  {
    id: 'reg-ef-sig-groesse', thema: 'regression', fall: 'rg-eb', karte: 'vorhersage',
    stamm: P(`Angenommen, ein Sig. unter ${zd('regel_sig')} gilt als signifikant und ein Betrag von Beta ab ${zd('ef_beta_klein', 1)} als klein. Man.trans.avail hat in Studie 2 das Beta ${zd('rs_beta_man', 3)} bei einem Sig. von ${zd('rs_p_man', 3)}. Was folgt daraus?`,
      `Assume a Sig. below ${ze('regel_sig')} counts as significant and an absolute Beta from ${ze('ef_beta_klein', 1)} as small. In study 2 Man.trans.avail has the Beta ${ze('rs_beta_man', 3)} with a Sig. of ${ze('rs_p_man', 3)}. What follows?`),
    antworten: [
      a(P('Größe und Sig. sind getrennte Fragen; bei genügend Fällen kann auch ein kleiner Effekt ein kleines Sig. haben', 'Size and Sig. are separate questions; with enough cases even a small effect can have a small Sig.'),
        P('Sig. hängt vom Schätzwert und von seiner Genauigkeit ab. Gleiche geschätzte Effekte haben bei verschiedener Präzision verschiedene p-Werte.', 'Sig. depends on the estimate and on its precision. The same estimated effects have different p values at different precision.'), true),
      a(P(`Ein Sig. über ${zd('regel_sig')} zeigt, dass der Effekt von Man.trans.avail gleich null ist, also kein Zusammenhang besteht`, `A Sig. above ${ze('regel_sig')} shows that the effect of Man.trans.avail is zero, so there is no relation`),
        P('Ein Sig. über der Schwelle heißt nur, dass die Nullhypothese nicht verworfen werden konnte. Es belegt keinen fehlenden Effekt.', 'A Sig. above the threshold only means that the null hypothesis could not be rejected. It does not prove a missing effect.')),
      a(P(`Weil der Betrag von Beta über ${zd('ef_beta_klein', 1)} liegt, muss auch das Sig. unter ${zd('regel_sig')} liegen, sonst stimmt die Rechnung nicht`, `Because the absolute value of Beta lies above ${ze('ef_beta_klein', 1)}, Sig. has to lie below ${ze('regel_sig')} as well, or the calculation is wrong`),
        P(`Die Größe des Schätzwerts legt das Sig. nicht allein fest. Hier steht das Beta ${za('rs_beta_man', 3)} neben einem Sig. von ${zd('rs_p_man', 3)}, weil der Standardfehler (${zd('rs_se_man', 3)}) im Verhältnis zu B groß ist.`, `The size of the estimate does not fix Sig. on its own. Here the Beta ${zae('rs_beta_man', 3)} stands beside a Sig. of ${ze('rs_p_man', 3)} because the standard error (${ze('rs_se_man', 3)}) is large relative to B.`))
    ],
    hilfe: [...HB, 'signifikanz', 'effektstaerke'], belege: ['wissen:wasserstein16-p-praezision-effekt', 'wissen:nicht-signifikant-kein-beleg', 'wissen:signifikant-nicht-bedeutsam', 'wissen:effekt-cohen-richtwerte']
  },
  {
    id: 'reg-ef-r2-aus-beta', thema: 'regression', karte: 'vorhersage',
    stamm: P(`Angenommen, in einer einfachen Regression gilt ein Beta ab ${zd('ef_beta_klein', 1)} als klein, ab ${zd('ef_beta_mittel', 1)} als mittel und ab ${zd('ef_beta_gross', 1)} als groß. Ab welchen Werten von R² gelten dieselben Stufen?`,
      `Assume that in a simple regression a Beta from ${ze('ef_beta_klein', 1)} counts as small, from ${ze('ef_beta_mittel', 1)} as medium and from ${ze('ef_beta_gross', 1)} as large. From which values of R² do the same levels apply?`),
    antworten: [
      a(P(`Ab ${zd('ef_r2_klein')} klein, ab ${zd('ef_r2_mittel')} mittel, ab ${zd('ef_r2_gross')} groß, denn R² ist das Quadrat von Beta`, `From ${ze('ef_r2_klein')} small, from ${ze('ef_r2_mittel')} medium, from ${ze('ef_r2_gross')} large, because R² is the square of Beta`),
        P(`In der einfachen Regression ist Beta gleich r und R² gleich r². Quadriert: ${zd('ef_beta_klein', 1)}² = ${zd('ef_r2_klein')}, ${zd('ef_beta_mittel', 1)}² = ${zd('ef_r2_mittel')}, ${zd('ef_beta_gross', 1)}² = ${zd('ef_r2_gross')}. Die R²-Werte sind aus den Richtwerten für r abgeleitet (Quadrat); Cohens eigene Richtwerte für die multiple Regression (über f²) liegen bei R² 0,02, 0,13 und 0,26.`, `In simple regression Beta equals r and R² equals r². Squared: ${ze('ef_beta_klein', 1)}² = ${ze('ef_r2_klein')}, ${ze('ef_beta_mittel', 1)}² = ${ze('ef_r2_mittel')}, ${ze('ef_beta_gross', 1)}² = ${ze('ef_r2_gross')}. The R² values are derived from the benchmarks for r (squared); Cohen's own benchmarks for multiple regression (via f²) are R² 0.02, 0.13 and 0.26.`), true),
      a(P(`Ab ${zd('ef_beta_klein', 1)} klein, ab ${zd('ef_beta_mittel', 1)} mittel, ab ${zd('ef_beta_gross', 1)} groß, denn R² ist nur ein anderer Name für Beta`, `From ${ze('ef_beta_klein', 1)} small, from ${ze('ef_beta_mittel', 1)} medium, from ${ze('ef_beta_gross', 1)} large, because R² is only another name for Beta`),
        P('R² ist der Anteil der Streuung, der mit dem Modell verbunden ist, Beta ein Koeffizient bei z-Werten. In der einfachen Regression gilt R² = Beta², nicht R² = Beta.', 'R² is the share of the variation associated with the model, Beta a coefficient for z-scores. In simple regression R² = Beta², not R² = Beta.')),
      a(P(`Ab ${zd('ef_wurzel_klein')} klein, ab ${zd('ef_wurzel_mittel')} mittel, ab ${zd('ef_wurzel_gross')} groß, denn R² ist die Wurzel aus Beta`, `From ${ze('ef_wurzel_klein')} small, from ${ze('ef_wurzel_mittel')} medium, from ${ze('ef_wurzel_gross')} large, because R² is the root of Beta`),
        P(`Das ist umgekehrt: R ist die Wurzel aus R². Aus Beta wird R² durch Quadrieren; die Schwelle ${zd('ef_beta_klein', 1)} wird dabei zu ${zd('ef_r2_klein')}, nicht zu ${zd('ef_wurzel_klein')}.`, `That is the wrong way round: R is the root of R². R² comes from Beta by squaring; the threshold ${ze('ef_beta_klein', 1)} becomes ${ze('ef_r2_klein')}, not ${ze('ef_wurzel_klein')}.`))
    ],
    hilfe: [...HILFE, 'r-quadrat', 'beta', 'effektstaerke'], belege: ['wissen:effekt-cohen-richtwerte', 'wissen:cohen92-richtwerte-tabelle', 'wissen:reg-spss-tabelle', 'wissen:reg-r2-definition', 'wissen:reg-beta-definition']
  },
  {
    id: 'reg-ef-r2-einstufen', thema: 'regression', fall: 'rg-ef', karte: 'vorhersage',
    stamm: P(`Angenommen, ein R² ab ${zd('ef_r2_klein')} gilt als klein, ab ${zd('ef_r2_mittel')} als mittel und ab ${zd('ef_r2_gross')} als groß. Wie sind die drei Modelle einzustufen?`,
      `Assume an R² from ${ze('ef_r2_klein')} counts as small, from ${ze('ef_r2_mittel')} as medium and from ${ze('ef_r2_gross')} as large. How are the three models rated?`),
    antworten: [
      a(P(`Modell 1 und 2 gelten als mittel, nur Modell 3 erreicht die Stufe groß (R² ${zd('ef_r2_3', 3)})`, `Models 1 and 2 count as medium, only model 3 reaches the level large (R² ${ze('ef_r2_3', 3)})`),
        P(`Es zählt die Spalte R²: ${zd('ef_r2_1', 3)} und ${zd('ef_r2_2', 3)} liegen zwischen ${zd('ef_r2_mittel')} und ${zd('ef_r2_gross')}, ${zd('ef_r2_3', 3)} darüber. Modell 2 liegt knapp unter der Schwelle für groß.`, `The R² column counts: ${ze('ef_r2_1', 3)} and ${ze('ef_r2_2', 3)} lie between ${ze('ef_r2_mittel')} and ${ze('ef_r2_gross')}, ${ze('ef_r2_3', 3)} above. Model 2 is just below the threshold for large.`), true),
      a(P(`Alle drei gelten als groß, weil das R in jeder Zeile über ${zd('ef_r2_gross')} liegt und damit die Schwelle erreicht`, `All three count as large because the R in every row lies above ${ze('ef_r2_gross')} and so reaches the threshold`),
        P(`R ist die Wurzel aus R². Die Stufen gelten für die Spalte R²; dort stehen ${zd('ef_r2_1', 3)} und ${zd('ef_r2_2', 3)} unter ${zd('ef_r2_gross')}.`, `R is the root of R². The levels apply to the R² column; there ${ze('ef_r2_1', 3)} and ${ze('ef_r2_2', 3)} stand below ${ze('ef_r2_gross')}.`)),
      a(P(`Alle drei gelten als klein, weil jedes R² unter ${zd('ef_beta_gross', 1)} liegt und die Stufe groß damit verfehlt`, `All three count as small because every R² lies below ${ze('ef_beta_gross', 1)} and so misses the level large`),
        P(`Die Schwelle ${zd('ef_beta_gross', 1)} gehört zu Beta und r, nicht zu R². Für R² gelten ${zd('ef_r2_klein')}, ${zd('ef_r2_mittel')} und ${zd('ef_r2_gross')}.`, `The threshold ${ze('ef_beta_gross', 1)} belongs to Beta and r, not to R². For R² the values ${ze('ef_r2_klein')}, ${ze('ef_r2_mittel')} and ${ze('ef_r2_gross')} apply.`))
    ],
    hilfe: [...HILFE, 'r-quadrat', 'effektstaerke'], belege: ['wissen:effekt-cohen-richtwerte', 'wissen:cohen92-richtwerte-tabelle', 'wissen:reg-r2-definition']
  },
  {
    id: 'reg-ef-konvention', thema: 'regression', karte: 'vorhersage',
    stamm: P(`Angenommen, ein Beta ab ${zd('ef_beta_mittel', 1)} wird als mittel eingeordnet. Welche Aussage über solche Richtwerte stimmt?`, `Assume a Beta from ${ze('ef_beta_mittel', 1)} is rated as medium. Which statement about such benchmarks is correct?`),
    antworten: [
      a(P('Sie sind Konventionen zur Orientierung, von Menschen festgelegt, ohne Naturgesetz dahinter', 'They are conventions for orientation, set by people, with no law of nature behind them'),
        P('In den Quellen gelten sie als willkürlich, als Notbehelf und als Orientierung. Cohen legte sie subjektiv fest.', 'In the sources they count as arbitrary, a stopgap and orientation. Cohen set them subjectively.'), true),
      a(P(`Sie sind Naturgesetze: Ab genau ${zd('ef_beta_mittel', 1)} beginnt bei jeder Messung ein mittlerer Effekt, überall gleich`, `They are laws of nature: from exactly ${ze('ef_beta_mittel', 1)} a medium effect begins in every measurement, the same everywhere`),
        P('Das ist eine belegte Fehldeutung: Die Schwellen sind keine Naturgesetze, sondern Konventionen.', 'This is a documented misreading: the thresholds are no laws of nature but conventions.')),
      a(P('Sie gelten als universell und passen auf jedes Fach und jede Art von Messung gleich gut', 'They count as universal and fit every field and every kind of measurement equally well'),
        P('Auch das ist eine belegte Fehldeutung. Die Übertragung auf andere Maße oder Modelle passt zur ursprünglichen Grundlage oft nicht.', 'This too is a documented misreading. Transferring them to other measures or models often does not fit their original basis.'))
    ],
    hilfe: [...HILFE, 'beta', 'effektstaerke'], belege: ['wissen:effekt-cohen-richtwerte', 'wissen:cohen92-richtwerte-tabelle', 'wissen:reg-beta-definition']
  },
  {
    id: 'reg-ef-mehrfach', thema: 'regression', karte: 'vorhersage', mehrfach: true,
    stamm: P(`Angenommen, ein Beta ab ${zd('ef_beta_klein', 1)} gilt als klein, ab ${zd('ef_beta_mittel', 1)} als mittel und ab ${zd('ef_beta_gross', 1)} als groß. Welche Aussagen über Beta und R² in einer einfachen Regression stimmen? Mehrere können stimmen.`,
      `Assume a Beta from ${ze('ef_beta_klein', 1)} counts as small, from ${ze('ef_beta_mittel', 1)} as medium and from ${ze('ef_beta_gross', 1)} as large. Which statements about Beta and R² in a simple regression are correct? Several may be correct.`),
    antworten: [
      a(P(`Ein Beta von ${zd('ef_beta_mittel', 1)} gehört zu einem R² von ${zd('ef_r2_mittel')}`, `A Beta of ${ze('ef_beta_mittel', 1)} goes with an R² of ${ze('ef_r2_mittel')}`),
        P(`In der einfachen Regression ist R² das Quadrat von Beta: ${zd('ef_beta_mittel', 1)}² = ${zd('ef_r2_mittel')}.`, `In simple regression R² is the square of Beta: ${ze('ef_beta_mittel', 1)}² = ${ze('ef_r2_mittel')}.`), true),
      a(P(`Ein R² von ${zd('ef_r2_gross')} gehört zu einem Beta mit dem Betrag ${zd('ef_beta_gross', 1)}`, `An R² of ${ze('ef_r2_gross')} goes with a Beta whose absolute value is ${ze('ef_beta_gross', 1)}`),
        P('R² ist ein Quadrat, also positiv; das Beta dahinter kann positiv oder negativ sein, nur sein Betrag steht fest.', 'R² is a square and so positive; the Beta behind it can be positive or negative, only its absolute value is fixed.'), true),
      a(P(`Ein R² von ${zd('ef_beta_mittel', 1)} zählt als mittel, weil auch ein Beta von ${zd('ef_beta_mittel', 1)} als mittel zählt`, `An R² of ${ze('ef_beta_mittel', 1)} counts as medium because a Beta of ${ze('ef_beta_mittel', 1)} also counts as medium`),
        P(`Die Stufen sind je Maß verschieden: Als R² liegt ${zd('ef_beta_mittel', 1)} über ${zd('ef_r2_gross')} und zählt damit als groß.`, `The levels differ by measure: as an R², ${ze('ef_beta_mittel', 1)} lies above ${ze('ef_r2_gross')} and so counts as large.`)),
      a(P(`Ein Beta unter ${zd('ef_beta_klein', 1)} schließt aus, dass das Sig. unter ${zd('regel_sig')} liegt`, `A Beta below ${ze('ef_beta_klein', 1)} rules out that Sig. lies below ${ze('regel_sig')}`),
        P('Bei genügend großer Stichprobe kann jeder noch so kleine Effekt ein kleines Sig. liefern.', 'With a large enough sample even the smallest effect can give a small Sig.'))
    ],
    hilfe: [...HILFE, 'r-quadrat', 'beta', 'effektstaerke'], belege: ['wissen:effekt-cohen-richtwerte', 'wissen:reg-spss-tabelle', 'wissen:reg-r2-definition', 'wissen:wasserstein16-p-praezision-effekt']
  },

  // ---- Einheit daten-probleme-regression: wenig Streuung, eng verbundene Größen, kleine Stichprobe, gemischte Gruppen ----
  {
    id: 'reg-dp-streuung', thema: 'regression', fall: 'rg-dp', karte: 'vorhersage',
    stamm: P('Stichprobe 2 enthält nur die langsameren Fahrten. B bleibt ähnlich, R² fällt. Wie lautet die Deutung?', 'Sample 2 contains only the slower trials. B stays similar, R² drops. How is it read?'),
    antworten: [
      a(P('Die Geschwindigkeit streut in Stichprobe 2 weniger; das drückt R² und macht B ungenauer', 'Speed varies less in sample 2; that lowers R² and makes B less precise'),
        P(`Eingeschränkte Streubreite drückt den Zusammenhangswert nach unten, und der Standardfehler der Steigung wächst, wenn x weniger streut (Streuung ${zd('dp_sdB', 3)} statt ${zd('dp_sdA', 3)}; dazu kommen weniger Fälle). R² ${zd('dp_r2B', 3)} statt ${zd('dp_r2A', 3)}, Standardfehler ${zd('dp_seB', 3)} statt ${zd('dp_seA', 3)}.`, `Restricted range pushes the measure of association down, and the standard error of the slope grows when x varies less (spread ${ze('dp_sdB', 3)} instead of ${ze('dp_sdA', 3)}; fewer cases add to it). R² ${ze('dp_r2B', 3)} instead of ${ze('dp_r2A', 3)}, standard error ${ze('dp_seB', 3)} instead of ${ze('dp_seA', 3)}.`), true),
      a(P('Bei langsamen Fahrten besteht gar kein Zusammenhang mehr, das zeigt das kleinere R² an', 'For slow trials there is no relation at all any more, as the smaller R² shows'),
        P(`B ist mit ${zd('dp_bB', 1)} gegen ${zd('dp_bA', 1)} ähnlich: Je Meile pro Stunde steigt der Bremsweg in beiden Stichproben um fast dieselbe Zahl Fuß. Das kleinere R² passt zur kleineren Streuung der Geschwindigkeit.`, `B is similar at ${ze('dp_bB', 1)} against ${ze('dp_bA', 1)}: per mile per hour the stopping distance rises by almost the same number of feet in both samples. The smaller R² fits the smaller spread of speed.`)),
      a(P('Eine Auswahl nach der Geschwindigkeit ändert R² nicht; der Unterschied muss ein Rechenfehler sein', 'A selection by speed does not change R²; the difference has to be a calculation error'),
        P('Eine Auswahl nach der unabhängigen Größe verändert deren Streubreite und damit r und R². Selektive Stichproben können r verzerren.', 'A selection by the independent variable changes its range and with it r and R². Selective samples can distort r.'))
    ],
    hilfe: [...HILFE, 'r-quadrat', 'eingeschraenkte-streuung'], belege: ['wissen:r-stichprobeneffekte', 'wissen:reg-standardfehler-steigung', 'wissen:reg-r2-definition']
  },
  {
    id: 'reg-dp-vif', thema: 'regression', karte: 'vorhersage',
    stamm: P(`Angenommen, ein VIF ab 5 gilt als auffällig. Ein Modell enthält nur zwei Größen, die mit r = ${zd('vk_r', 3)} korrelieren. Welche Toleranz und welcher VIF ergeben sich für jede der beiden Größen?`, `Assume a VIF from 5 counts as conspicuous. A model contains only two variables, which correlate with r = ${ze('vk_r', 3)}. Which tolerance and which VIF result for each of the two variables?`),
    antworten: [
      a(P(`Toleranz ${zd('vk_tol', 3)} und VIF ${zd('vk_vif')}: Der VIF liegt über der Schwelle`, `Tolerance ${ze('vk_tol', 3)} and VIF ${ze('vk_vif')}: the VIF lies above the threshold`),
        P(`Toleranz ist 1 minus R²j, bei zwei Größen ist R²j gleich r². Also 1 minus ${zd('vk_r', 3)}² = ${zd('vk_tol', 3)}. Der VIF ist der Kehrwert der Toleranz: ${zd('vk_vif')} (mit ungerundeten Werten gerechnet).`, `Tolerance is 1 minus R²j, and with two variables R²j equals r². So 1 minus ${ze('vk_r', 3)}² = ${ze('vk_tol', 3)}. The VIF is the reciprocal of the tolerance: ${ze('vk_vif')} (computed with unrounded values).`), true),
      a(P(`Toleranz ${zd('vk_tol_falsch', 3)} und VIF ${zd('vk_vif_falsch', 1)}, denn die Toleranz ist 1 minus die Korrelation`, `Tolerance ${ze('vk_tol_falsch', 3)} and VIF ${ze('vk_vif_falsch', 1)}, because the tolerance is 1 minus the correlation`),
        P('Hier fehlt das Quadrieren. Maßgeblich ist 1 minus R²j, und R²j ist der Anteil, den die andere Größe erklärt, bei zwei Größen also r².', 'The squaring is missing here. What counts is 1 minus R²j, and R²j is the share the other variable explains, with two variables r².')),
      a(P(`Toleranz ${zd('vk_tol_r2', 3)} und VIF ${zd('vk_vif_r2')}, denn die Toleranz ist das Quadrat der Korrelation`, `Tolerance ${ze('vk_tol_r2', 3)} and VIF ${ze('vk_vif_r2')}, because the tolerance is the square of the correlation`),
        P(`Das Quadrat von r ist R²j, der von der anderen Größe erklärte Anteil. Die Toleranz ist der Rest: 1 minus ${zd('vk_tol_r2', 3)}. Eine hohe Toleranz hieße, die Größe hängt kaum von der anderen ab.`, `The square of r is R²j, the share explained by the other variable. The tolerance is the remainder: 1 minus ${ze('vk_tol_r2', 3)}. A high tolerance would mean the variable hardly depends on the other.`))
    ],
    hilfe: [...HILFE, 'vif', 'kollinearitaet'], belege: ['wissen:reg-toleranz-vif', 'wissen:reg-vif-schwellen', 'wissen:reg-r2-definition']
  },
  {
    id: 'reg-dp-kollinear', thema: 'regression', fall: 'rg-vk', karte: 'vorhersage',
    stamm: P(`Angenommen, ein Sig. unter ${zd('regel_sig')} gilt als signifikant. Einzeln sind cyl und disp jeweils signifikant, im Modell mit beiden hat disp ein Sig. von ${zd('vk_p_disp', 3)}. Wie lautet die Deutung?`,
      `Assume a Sig. below ${ze('regel_sig')} counts as significant. Alone, cyl and disp are each significant; in the model with both, disp has a Sig. of ${ze('vk_p_disp', 3)}. How is it read?`),
    antworten: [
      a(P(`Die Größen hängen eng zusammen (r = ${zd('vk_r', 3)}); dadurch werden die Standardfehler größer`, `The variables are closely related (r = ${ze('vk_r', 3)}); so the standard errors grow`),
        P(`Hohe Multikollinearität lässt die Schätzer unverzerrt, macht sie aber ungenau. Standardfehler von cyl: ${zd('vk_se_cyl1', 3)} allein, ${zd('vk_se_cyl3', 3)} im gemeinsamen Modell; der VIF liegt bei ${zd('vk_vif')}.`, `High multicollinearity leaves the estimators unbiased but makes them imprecise. Standard error of cyl: ${ze('vk_se_cyl1', 3)} alone, ${ze('vk_se_cyl3', 3)} in the joint model; the VIF is ${ze('vk_vif')}.`), true),
      a(P('Der Hubraum hat mit dem Verbrauch nichts zu tun; der frühere Zusammenhang war nur ein Zufallsbefund', 'Displacement has nothing to do with consumption; the earlier relation was only a chance finding'),
        P('Allein ist disp signifikant. Im gemeinsamen Modell zählt, was disp bei gleicher Zylinderzahl beiträgt, und das lässt sich bei so eng verbundenen Größen nur ungenau schätzen.', 'Alone, disp is significant. In the joint model what counts is what disp adds at equal cylinder number, and that can be estimated only imprecisely for variables so closely related.')),
      a(P('Das Gesamtmodell ist ebenfalls nicht signifikant, denn ein einzelner Koeffizient verfehlt die Schwelle', 'The overall model is also not significant, because a single coefficient misses the threshold'),
        P(`Das Gesamtmodell kann signifikant sein, ohne dass ein Koeffizient es ist. Es erklärt hier mit R² von ${zd('vk_r2', 3)} viel; die Einzeltests leiden unter den größeren Standardfehlern.`, `The overall model can be significant without any coefficient being so. Here it explains a lot, with an R² of ${ze('vk_r2', 3)}; the single tests suffer from the larger standard errors.`))
    ],
    hilfe: [...HILFE, 'kollinearitaet', 'vif', 'standardfehler-schaetzer'], belege: ['wissen:reg-multikollinearitaet-folgen', 'wissen:reg-toleranz-vif', 'wissen:reg-standardfehler-steigung', 'wissen:reg-partielle-koeffizienten']
  },
  {
    id: 'reg-dp-klein', thema: 'regression', fall: 'rg-kn', karte: 'vorhersage',
    stamm: P(`Angenommen, ein Sig. unter ${zd('regel_sig')} gilt als signifikant. Das B ist in beiden Stichproben fast gleich, das Sig. unterscheidet sich stark. Wie lautet die Deutung?`,
      `Assume a Sig. below ${ze('regel_sig')} counts as significant. B is almost the same in both samples, whereas Sig. differs strongly. How is it read?`),
    antworten: [
      a(P(`Hier, mit nur ${zn('kn_nB')} Wagen, ist der Standardfehler größer, B ungenauer, und das Sig. fällt größer aus`, `Here, with only ${zn('kn_nB')} cars, the standard error is larger, B less precise, and Sig. turns out larger`),
        P(`Als allgemeine Regel sinkt der Standardfehler der Steigung bei größerem n. Gleiche geschätzte Effekte haben bei verschiedener Präzision verschiedene p-Werte: B ${zd('kn_bA', 3)} und ${zd('kn_bB', 3)}, Standardfehler ${zd('kn_seA', 3)} und ${zd('kn_seB', 3)}.`, `As a general rule the standard error of the slope falls with larger n. The same estimated effects have different p values at different precision: B ${ze('kn_bA', 3)} and ${ze('kn_bB', 3)}, standard error ${ze('kn_seA', 3)} and ${ze('kn_seB', 3)}.`), true),
      a(P(`In der kleinen Stichprobe gibt es keinen Zusammenhang, weil das Sig. über ${zd('regel_sig')} liegt und die Schwelle verfehlt`, `In the small sample there is no relation because Sig. lies above ${ze('regel_sig')} and misses the threshold`),
        P(`Ein Sig. über der Schwelle belegt keinen fehlenden Zusammenhang, es zeigt nur, dass die Nullhypothese nicht verworfen wurde. Das Beta ist mit ${zd('kn_betaB', 3)} sogar etwas größer als bei allen Wagen.`, `A Sig. above the threshold does not prove a missing relation, it only shows the null hypothesis was not rejected. Beta, at ${ze('kn_betaB', 3)}, is even a little larger than for all cars.`)),
      a(P('Das Beta ist in Stichprobe 2 größer, also muss auch das Sig. kleiner ausfallen als bei allen Wagen', 'Beta is larger in sample 2, so Sig. must turn out smaller as well than for all cars'),
        P(`Beta ist nur wenig größer (${zd('kn_betaB', 3)} gegen ${zd('kn_betaA', 3)}). Das Sig. hängt auch vom Standardfehler ab, und der ist in Stichprobe 2 mit ${zd('kn_seB', 3)} deutlich größer als ${zd('kn_seA', 3)}.`, `Beta is only a little larger (${ze('kn_betaB', 3)} against ${ze('kn_betaA', 3)}). Sig. also depends on the standard error, and in sample 2 it is much larger at ${ze('kn_seB', 3)} than ${ze('kn_seA', 3)}.`))
    ],
    hilfe: [...HILFE, 'signifikanz', 'standardfehler-schaetzer'], belege: ['wissen:wasserstein16-p-praezision-effekt', 'wissen:reg-standardfehler-steigung', 'wissen:nicht-signifikant-kein-beleg', 'wissen:reg-t-test-steigung']
  },
  {
    id: 'reg-dp-gruppen', thema: 'regression', fall: 'rg-gm', karte: 'vorhersage',
    stamm: P(`Das B der Länge ist bei allen Blüten zusammen ${zd('gm_bA', 3)}, in jeder Art dagegen positiv. Wie lautet die Deutung?`, `The B of length is ${ze('gm_bA', 3)} for all flowers together, but positive in every species. How is it read?`),
    antworten: [
      a(P('Zusammengeworfen verfälschen die Unterschiede zwischen Arten den Zusammenhang innerhalb einer Art', 'Thrown together, the differences between species distort the relation within a species'),
        P(`Zusammengeworfene Untergruppen können r verfälschen, und Beta ist in der einfachen Regression gleich r. Innerhalb der Arten steigt die Breite mit der Länge (B ${zd('gm_b_set', 3)}, ${zd('gm_b_ver', 3)}, ${zd('gm_b_vir', 3)}).`, `Pooled subgroups can distort r, and Beta equals r in simple regression. Within the species width rises with length (B ${ze('gm_b_set', 3)}, ${ze('gm_b_ver', 3)}, ${ze('gm_b_vir', 3)}).`), true),
      a(P('Der Zusammenhang ist in Wirklichkeit negativ; die positiven B in den einzelnen Arten sind nur Zufall', 'The relation is really negative; the positive B in the single species are only chance'),
        P(`In jeder Art ist B positiv, mit einem Sig. von höchstens ${zd('gm_p_vir', 3)} bei je ${zn('gm_nG')} Blüten. Das gemeinsame B hat dagegen ein Sig. von ${zd('gm_pA', 3)}.`, `In every species B is positive, with a Sig. of at most ${ze('gm_p_vir', 3)} for ${zn('gm_nG')} flowers each. The joint B, by contrast, has a Sig. of ${ze('gm_pA', 3)}.`)),
      a(P(`Alle ${zn('gm_nA')} Blüten bilden die größte Stichprobe, darum gilt das gemeinsame B auch für jede einzelne Art`, `All ${zn('gm_nA')} flowers form the largest sample, so the joint B holds for each single species as well`),
        P('Zusammengeworfene Untergruppen können r verfälschen; ein Signifikanztest behebt das nicht.', 'Pooled subgroups can distort r; a significance test does not repair that.'))
    ],
    hilfe: [...HILFE, 'simpson-paradox'], belege: ['wissen:r-stichprobeneffekte', 'wissen:reg-spss-tabelle', 'wissen:reg-beta-definition']
  },
  {
    id: 'reg-dp-mehrfach', thema: 'regression', karte: 'vorhersage', mehrfach: true,
    stamm: P('Es geht um Daten, die ein Regressionsergebnis verändern können. Welche Aussagen stimmen? Mehrere können stimmen.', 'This is about data features that can change a regression result. Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Streut die unabhängige Größe weniger, wird der Standardfehler von B größer', 'If the independent variable varies less, the standard error of B grows'),
        P('Der Standardfehler der Steigung sinkt bei größerer Streuung von x und größerem n.', 'The standard error of the slope falls with greater spread in x and larger n.'), true),
      a(P('Zusammengeworfene Untergruppen, die sich im Zusammenhang unterscheiden, können r verfälschen', 'Pooled subgroups that differ in their relation can distort r'),
        P('Zusammengeworfene Untergruppen können r verfälschen.', 'Pooled subgroups can distort r.'), true),
      a(P('Ein hoher VIF verzerrt die geschätzten Koeffizienten, sodass sie im Mittel danebenliegen', 'A high VIF biases the estimated coefficients so that on average they are off'),
        P('Hohe Multikollinearität lässt die Schätzer unverzerrt, macht sie aber ungenau und die Koeffizienten instabil.', 'High multicollinearity leaves the estimators unbiased but makes them imprecise and the coefficients unstable.')),
      a(P('Ein signifikantes Ergebnis gleicht eine Auswahl aus, die nur einen Teil des Bereichs enthält', 'A significant result makes up for a selection that contains only part of the range'),
        P('Ein Signifikanztest behebt selektive Stichproben nicht.', 'A significance test does not repair selective samples.'))
    ],
    hilfe: [...HILFE, 'eingeschraenkte-streuung', 'vif', 'simpson-paradox'], belege: ['wissen:reg-standardfehler-steigung', 'wissen:r-stichprobeneffekte', 'wissen:reg-multikollinearitaet-folgen']
  },
  // ---- Einheit daten-probleme-regression, Nachtrag: Deckeneffekt (Beleg micceri89-decken-bodeneffekte), r über 0,9 (Beleg backhaus-praediktorkorrelation-hinweis; die Marke 0,9 steht nur als gesetzte Regel im Stamm),
  //      kleine Stichprobe (Belege effekt-eta-ueberschaetzt-omega, nakagawa07-hedges-korrektur, funder19-p-schwelle-gleich-r, button13-drei-probleme; die Marke „unter 30 Personen“ steht nur als gesetzte Regel im Stamm) ----
  {
    id: 'reg-dp-decke-item', thema: 'regression',
    stamm: P('Angenommen, ein Deckeneffekt (Ceiling-Effekt) liegt vor, wenn mindestens ein Drittel der Antworten auf der höchsten Stufe liegt. Bei welchem Item der Tabelle ist das der Fall?',
      'Assume a ceiling effect is present if at least a third of the answers lie on the highest level. For which item of the table is that the case?'),
    tabelle: tab('reg-dp-decke-item', [P('Item', 'Item'), P('Antworten', 'Answers'), P('Anteil auf Stufe 1 (Prozent)', 'Share on level 1 (percent)'), P('Anteil auf Stufe 6 (Prozent)', 'Share on level 6 (percent)'), P('Mittelwert', 'Mean')], QUELLE_BFI_DK,
      P('Drei Items eines Persönlichkeitsfragebogens, Antworten von 1 (trifft gar nicht zu) bis 6 (trifft völlig zu)', 'Three items of a personality questionnaire, answers from 1 (not at all true) to 6 (completely true)')),
    antworten: [
      a(P(`Bei A4: ${zd('dk_a4_6', 1)} Prozent wählen Stufe 6`, `For A4: ${ze('dk_a4_6', 1)} percent choose level 6`),
        P(`Nur bei A4 liegt mindestens ein Drittel auf Stufe 6, mit ${zd('dk_a4_6', 1)} Prozent. Viele erreichen den höchsten Wert, Unterschiede im oberen Bereich gehen verloren.`, `Only for A4 does at least a third lie on level 6, with ${ze('dk_a4_6', 1)} percent. Many reach the highest value, differences in the upper range are lost.`), true),
      a(P(`Bei E1: Viele wählen Stufe 1 (${zd('dk_e1_1', 1)} Prozent)`, `For E1: many choose level 1 (${ze('dk_e1_1', 1)} percent)`),
        P(`Ein Deckeneffekt betrifft die höchste Stufe. Auf Stufe 6 liegen bei E1 nur ${zd('dk_e1_6', 1)} Prozent, und auch Stufe 1 bleibt mit ${zd('dk_e1_1', 1)} Prozent unter einem Drittel.`, `A ceiling effect concerns the highest level. For E1 only ${ze('dk_e1_6', 1)} percent lie on level 6, and level 1 also stays below a third with ${ze('dk_e1_1', 1)} percent.`)),
      a(P(`Bei C1: Der Mittelwert von ${zd('dk_c1_m')} ist hoch`, `For C1: the mean of ${ze('dk_c1_m')} is high`),
        P(`Ein hoher Mittelwert allein genügt nicht. Maßgeblich ist der Anteil auf der höchsten Stufe, und der beträgt bei C1 ${zd('dk_c1_6', 1)} Prozent, also weniger als ein Drittel.`, `A high mean alone is not enough. What counts is the share on the highest level, and for C1 it is ${ze('dk_c1_6', 1)} percent, less than a third.`))
    ],
    hilfe: ['deckeneffekt', 'bodeneffekt', 'item'], belege: ['wissen:micceri89-decken-bodeneffekte', 'Hilfe:deckeneffekt']
  },
  {
    id: 'reg-dp-decke-wirkung', thema: 'regression', karte: 'vorhersage',
    stamm: P(`In der zweiten Zeile zeigt ein Messgerät höchstens ${zn('dkw_grenze')} Meilen je Gallone an (Deckeneffekt). Wie wirkt sich das in diesem Beispiel auf die Regression aus?`,
      `In the second row a measuring device shows at most ${zn('dkw_grenze')} miles per gallon (ceiling effect). How does that affect the regression in this example?`),
    tabelle: tab('reg-dp-decke-wirkung', [P('Daten', 'Data'), P('Streuung (Standardabweichung) von mpg', 'Spread (standard deviation) of mpg'), P('B', 'B'), P('R²', 'R²')], QUELLE_MT_DK,
      P('Meilen je Gallone (mpg), erklärt durch das Gewicht (wt, in 1000 Pfund): echte Werte und Werte mit Deckeneffekt', 'Miles per gallon (mpg), explained by weight (wt, in 1000 lbs): actual values and values with a ceiling effect')),
    diagramm: DG_DK,
    antworten: [
      a(P('Die gekappte Größe streut weniger, B wird schwächer und R² fällt', 'The capped variable varies less, B becomes weaker and R² falls'),
        P(`Die Tabelle zeigt es: Die Streuung sinkt von ${zd('dkw_sdA')} auf ${zd('dkw_sdB')}, B von ${zd('dkw_bA', 3)} auf ${zd('dkw_bB', 3)}, R² von ${zd('dkw_r2A', 3)} auf ${zd('dkw_r2B', 3)}. Unterschiede im oberen Bereich gehen verloren.`, `The table shows it: the spread falls from ${ze('dkw_sdA')} to ${ze('dkw_sdB')}, B from ${ze('dkw_bA', 3)} to ${ze('dkw_bB', 3)}, R² from ${ze('dkw_r2A', 3)} to ${ze('dkw_r2B', 3)}. Differences in the upper range are lost.`), true),
      a(P('Nur die Streuung ändert sich, B und R² bleiben unverändert', 'Only the spread changes, B and R² stay unchanged'),
        P(`Die Tabelle zeigt andere Werte: B ist nach der Kappung ${zd('dkw_bB', 3)} statt ${zd('dkw_bA', 3)}, R² ist ${zd('dkw_r2B', 3)} statt ${zd('dkw_r2A', 3)}.`, `The table shows different values: after capping, B is ${ze('dkw_bB', 3)} instead of ${ze('dkw_bA', 3)}, R² is ${ze('dkw_r2B', 3)} instead of ${ze('dkw_r2A', 3)}.`)),
      a(P('Der Zusammenhang wird stärker, weil weniger Ausreißer die Werte stören', 'The relation becomes stronger because fewer outliers disturb the values'),
        P(`R² fällt von ${zd('dkw_r2A', 3)} auf ${zd('dkw_r2B', 3)}, und B wird betragsmäßig kleiner. Das Kappen entfernt keine Störwerte, es nimmt Unterschiede im oberen Bereich weg.`, `R² falls from ${ze('dkw_r2A', 3)} to ${ze('dkw_r2B', 3)}, and B becomes smaller in size. Capping removes no disturbing values, it takes away differences in the upper range.`))
    ],
    hilfe: [...HILFE, 'deckeneffekt', 'r-quadrat', 'eingeschraenkte-streuung'], belege: ['Hilfe:deckeneffekt', 'wissen:r-stichprobeneffekte']
  },
  {
    id: 'reg-dp-decke-verteilung', thema: 'regression', karte: 'vorhersage',
    stamm: P('Bei einem Schultest erreichen viele Kinder die Höchstpunktzahl (Deckeneffekt). Was ist für die Verteilung der Fehler in einer Regression mit diesem Test als Ergebnisgröße zu bedenken?',
      'In a school test many children reach the maximum score (ceiling effect). What has to be kept in mind about the distribution of the errors in a regression with this test as the outcome?'),
    antworten: [
      a(P('Die Fehler können von der Normalverteilung abweichen; der Deckeneffekt kann dazu beitragen', 'The errors can deviate from the normal distribution; a ceiling effect can contribute'),
        P('Als mögliche Ursachen einer nicht normalen Fehlerverteilung nennt Micceri (1989) unter anderem Decken- oder Bodeneffekte. Die Aufzählung ist ausdrücklich nicht abschließend.',
          'Micceri (1989) names ceiling or floor effects among the possible causes of a non-normal error distribution. The list is expressly not exhaustive.'), true),
      a(P('Die Fehler bleiben sicher normalverteilt, denn die Höchstpunktzahl wirkt nur auf den Mittelwert', 'The errors surely stay normally distributed because the maximum score affects only the mean'),
        P('Decken- und Bodeneffekte werden als mögliche Ursache nicht normaler Fehler genannt. Der Höchstwert wirkt also nicht nur auf den Mittelwert.',
          'Ceiling and floor effects are named as a possible cause of non-normal errors. The maximum therefore affects more than the mean.')),
      a(P('Ein Deckeneffekt macht alle Fehler gleich groß, sodass die Streuung überall ausgeglichen ist', 'A ceiling effect makes all errors equal in size, so the spread is balanced everywhere'),
        P('Das trifft nicht zu: Deckeneffekte können die Fehlerverteilung von der Normalverteilung wegführen (Micceri 1989).',
          'That is not so: ceiling effects can lead the error distribution away from the normal distribution (Micceri 1989).'))
    ],
    hilfe: [...HILFE, 'deckeneffekt', 'residuen'], belege: ['wissen:micceri89-decken-bodeneffekte', 'Hilfe:deckeneffekt']
  },
  {
    id: 'reg-dp-decke-mehrfach', thema: 'regression', karte: 'vorhersage', mehrfach: true,
    stamm: P('Es geht um Decken- und Bodeneffekte (ceiling and floor effects). Welche Aussagen stimmen? Mehrere können stimmen.', 'This is about ceiling and floor effects. Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Beim Deckeneffekt erreichen viele den höchsten Wert, sodass Unterschiede oben verschwinden', 'With a ceiling effect many reach the highest value, so differences at the top disappear'),
        P('So ist der Deckeneffekt in der Hilfe beschrieben: Der Test ist zu leicht, Unterschiede oben werden nicht mehr sichtbar.', 'That is how the ceiling effect is described in the help: the test is too easy, differences at the top are no longer visible.'), true),
      a(P('Decken- oder Bodeneffekte können dazu beitragen, dass Fehler nicht normalverteilt sind', 'Ceiling or floor effects can contribute to errors not being normally distributed'),
        P('Sie gehören zu den genannten möglichen Ursachen einer nicht normalen Fehlerverteilung.', 'They are among the named possible causes of a non-normal error distribution.'), true),
      a(P('Ein Bodeneffekt entsteht, wenn ein Test für die Personen zu leicht ist', 'A floor effect arises when a test is too easy for the persons'),
        P('Das ist der Deckeneffekt. Beim Bodeneffekt ist der Test zu schwer, und viele erreichen den niedrigsten Wert.', 'That is the ceiling effect. With a floor effect the test is too hard and many reach the lowest value.')),
      a(P('Mit mehr Personen in der Stichprobe verschwindet ein Deckeneffekt von selbst', 'With more persons in the sample a ceiling effect disappears by itself'),
        P('Der Effekt liegt an der Messung mit ihrem Höchstwert, nicht an der Zahl der Personen.', 'The effect lies in the measurement with its maximum, not in the number of persons.'))
    ],
    hilfe: [...HILFE, 'deckeneffekt', 'bodeneffekt'], belege: ['wissen:micceri89-decken-bodeneffekte', 'Hilfe:deckeneffekt', 'Hilfe:bodeneffekt']
  },
  {
    id: 'reg-dp-r90-vif', thema: 'regression', karte: 'vorhersage',
    stamm: P(`Angenommen, ein VIF ab ${zn('r9_schwelle')} gilt als auffällig. Ein Modell enthält nur zwei Größen. Bei welcher Korrelation der Tabelle liegt der VIF zum ersten Mal über der Schwelle?`,
      `Assume a VIF from ${zn('r9_schwelle')} counts as conspicuous. A model contains only two variables. At which correlation of the table does the VIF first lie above the threshold?`),
    tabelle: tab('reg-dp-r90-vif', [P('Korrelation r der beiden Größen', 'Correlation r of the two variables'), P('Toleranz', 'Tolerance'), P('VIF', 'VIF')], QUELLE_R9,
      P('Toleranz und VIF zweier Größen bei verschieden hoher Korrelation', 'Tolerance and VIF of two variables at different levels of correlation')),
    antworten: [
      a(P(`Bei r = ${zd('r9_regel_r')}, dort beträgt der VIF ${zd('r9_vif_90')}`, `At r = ${ze('r9_regel_r')}, there the VIF is ${ze('r9_vif_90')}`),
        P(`Bei zwei Größen ist die Toleranz 1 minus r² und der VIF ihr Kehrwert. Bei r = 0,85 beträgt der VIF ${zd('r9_vif_85')} und bleibt unter der Schwelle, bei r = ${zd('r9_regel_r')} sind es ${zd('r9_vif_90')}.`, `With two variables the tolerance is 1 minus r² and the VIF its reciprocal. At r = 0.85 the VIF is ${ze('r9_vif_85')} and stays below the threshold, at r = ${ze('r9_regel_r')} it is ${ze('r9_vif_90')}.`), true),
      a(P('Bei r = 0,80, denn 1 geteilt durch 0,20 ergibt 5', 'At r = 0.80, because 1 divided by 0.20 gives 5'),
        P(`Hier fehlt das Quadrieren. Maßgeblich ist 1 minus r²: Bei r = 0,80 ergibt sich ein VIF von ${zd('r9_vif_80')}.`, `The squaring is missing here. What counts is 1 minus r²: at r = 0.80 the VIF is ${ze('r9_vif_80')}.`)),
      a(P(`Erst bei r = 0,95: Dort beträgt der VIF ${zd('r9_vif_95')}`, `Only at r = 0.95: there the VIF is ${ze('r9_vif_95')}`),
        P(`Die gesetzte Schwelle liegt bei ${zn('r9_schwelle')}, nicht bei 10. Schon bei r = ${zd('r9_regel_r')} beträgt der VIF ${zd('r9_vif_90')} und liegt darüber.`, `The threshold given is ${zn('r9_schwelle')}, not 10. Already at r = ${ze('r9_regel_r')} the VIF is ${ze('r9_vif_90')} and lies above it.`))
    ],
    hilfe: [...HILFE, 'vif', 'toleranz', 'kollinearitaet'], belege: ['wissen:reg-toleranz-vif', 'wissen:reg-vif-schwellen', 'wissen:backhaus-praediktorkorrelation-hinweis']
  },
  {
    id: 'reg-dp-r90-umkehr', thema: 'regression', karte: 'vorhersage',
    stamm: P(`Angenommen, ein Sig. unter ${zd('regel_sig')} gilt als signifikant. Die beiden Größen des Blütenblatts hängen sehr eng zusammen (r = ${zd('r9i_r', 3)}). Die Breite hat allein ein positives B, in Modell 3 ein negatives mit einem Sig. von ${zd('r9i_pW3', 3)}. Wie lautet die Deutung?`,
      `Assume a Sig. below ${ze('regel_sig')} counts as significant. The two petal variables are very closely related (r = ${ze('r9i_r', 3)}). Width alone has a positive B, in model 3 a negative one with a Sig. of ${ze('r9i_pW3', 3)}. How is it read?`),
    tabelle: tab('reg-dp-r90-umkehr', [P('Modell', 'Model'), P('Größe', 'Term'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('Sig.', 'Sig.')], QUELLE_IRIS_R9,
      P('Länge des Kelchblatts (Sepal.Length), erklärt durch Breite (Petal.Width) und Länge (Petal.Length) des Blütenblatts: Modell 1 nur Breite, Modell 2 nur Länge, Modell 3 beide', 'Sepal length (Sepal.Length), explained by width (Petal.Width) and length (Petal.Length) of the petal: model 1 width only, model 2 length only, model 3 both')),
    diagramm: DG_PETAL,
    antworten: [
      a(P('Die Größen lassen sich kaum trennen; das Kippen des Vorzeichens zeigt Instabilität', 'The variables can hardly be separated; the flipping sign shows instability'),
        P(`Bei so hoher Korrelation (VIF = 1 durch (1 minus r²) = ${zd('r9i_vif', 1)}) wächst der Standardfehler der Breite von ${zd('r9i_seW1', 3)} auf ${zd('r9i_seW3', 3)}, die Koeffizienten werden instabil. Das Vorzeichen kann dabei kippen; ein verlässlicher Beleg für einen Gegeneffekt ist das nicht.`, `With such a high correlation (VIF = 1 divided by (1 minus r²) = ${ze('r9i_vif', 1)}) the standard error of width grows from ${ze('r9i_seW1', 3)} to ${ze('r9i_seW3', 3)}, the coefficients become unstable. The sign can flip in the process; that is no reliable evidence of an opposite effect.`), true),
      a(P(`Die Breite wirkt gesichert negativ, sobald die Länge berücksichtigt ist; das Sig. von ${zd('r9i_pW3', 3)} zeigt es`, `Width acts reliably negatively as soon as length is accounted for; the Sig. of ${ze('r9i_pW3', 3)} shows it`),
        P(`Bei Kollinearität sichert ein Sig. knapp unter der Schwelle nichts: Der Standardfehler ist von ${zd('r9i_seW1', 3)} auf ${zd('r9i_seW3', 3)} gewachsen, und das Vorzeichen kippt gegenüber dem Einzelmodell. Der Beitrag der Breite lässt sich nur ungenau schätzen.`, `With collinearity a Sig. just below the threshold secures nothing: the standard error has grown from ${ze('r9i_seW1', 3)} to ${ze('r9i_seW3', 3)}, and the sign flips compared with the single model. The contribution of width can be estimated only imprecisely.`)),
      a(P('Beim Hinzufügen einer Größe kippt ein Vorzeichen nur durch einen Rechenfehler', 'When a variable is added, a sign flips only through a calculation error'),
        P('Ein B kann beim Hinzufügen einer stark korrelierten Größe sein Vorzeichen wechseln. Hier ist richtig gerechnet; die Daten lassen nur keine genaue Trennung zu.', 'A B can change its sign when a strongly correlated variable is added. The calculation is correct here; the data just do not allow a precise separation.'))
    ],
    hilfe: [...HILFE, 'kollinearitaet', 'vif', 'koeffizient-b'], belege: ['wissen:zuur10-kollinearitaet', 'wissen:reg-multikollinearitaet-folgen', 'wissen:backhaus-praediktorkorrelation-hinweis']
  },
  {
    id: 'reg-dp-r90-matrix', thema: 'regression', fall: 'rg-r9m', karte: 'vorhersage',
    stamm: P(`Angenommen, eine Korrelation über ${zd('r9_regel_r')} zwischen zwei Größen gilt als Warnzeichen für Kollinearität und ein VIF ab ${zn('r9_schwelle')} als auffällig. Keine Korrelation der ersten Tabelle liegt über der Marke. Was folgt daraus für die Kollinearität?`,
      `Assume a correlation above ${ze('r9_regel_r')} between two variables counts as a warning sign of collinearity and a VIF from ${zn('r9_schwelle')} as conspicuous. No correlation in the first table lies above the mark. What follows for the collinearity?`),
    antworten: [
      a(P(`Sie ist damit noch nicht ausgeschlossen: disp hat einen VIF von ${zd('r9m_vif_disp')}`, `It is thereby not yet ruled out: disp has a VIF of ${ze('r9m_vif_disp')}`),
        P(`Die Korrelation misst nur paarweise Beziehungen. Auch bei durchgehend niedrigeren Werten kann hochgradige Multikollinearität bestehen; der VIF erfasst sie, weil er jede Größe auf alle übrigen zurückführt (disp ${zd('r9m_vif_disp')}, wt ${zd('r9m_vif_wt')}).`, `The correlation measures only pairwise relations. Even with uniformly lower values high multicollinearity can exist; the VIF captures it because it relates each variable to all the others (disp ${ze('r9m_vif_disp')}, wt ${ze('r9m_vif_wt')}).`), true),
      a(P('Sie liegt damit nicht vor, denn keine Korrelation erreicht die Marke', 'It is thereby absent, because no correlation reaches the mark'),
        P(`Die Marke betrifft nur Paare. Der VIF von disp (${zd('r9m_vif_disp')}) und von wt (${zd('r9m_vif_wt')}) liegt über der Schwelle und zeigt trotzdem Kollinearität an.`, `The mark concerns pairs only. The VIF of disp (${ze('r9m_vif_disp')}) and of wt (${ze('r9m_vif_wt')}) lies above the threshold and indicates collinearity all the same.`)),
      a(P('Die Korrelationen sind wertlos; allein der VIF zeigt Kollinearität an', 'The correlations are worthless; only the VIF indicates collinearity'),
        P('Hohe Korrelationen zwischen den Größen können auf ein Kollinearitätsproblem hinweisen und sind ein erster Anhaltspunkt. Sie reichen nur nicht allein aus.', 'High correlations between the variables can point to a collinearity problem and give a first indication. They are just not sufficient on their own.'))
    ],
    hilfe: [...HILFE, 'kollinearitaet', 'vif', 'toleranz'], belege: ['wissen:backhaus-praediktorkorrelation-hinweis', 'wissen:reg-toleranz-vif', 'wissen:reg-vif-schwellen']
  },
  {
    id: 'reg-dp-r90-mehrfach', thema: 'regression', karte: 'vorhersage', mehrfach: true,
    stamm: P('Es geht um sehr hoch korrelierte Größen in einem Modell (Kollinearität). Welche Aussagen stimmen? Mehrere können stimmen.', 'This is about very highly correlated variables in a model (collinearity). Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Eine hohe Korrelation zwischen zwei Größen kann auf ein Kollinearitätsproblem hinweisen', 'A high correlation between two variables can point to a collinearity problem'),
        P('Hohe Korrelationen zwischen den unabhängigen Variablen sind ein erster Anhaltspunkt.', 'High correlations between the independent variables are a first indication.'), true),
      a(P('Niedrige Korrelationen je Paar schließen starke Multikollinearität nicht aus', 'Low correlations for each pair do not rule out strong multicollinearity'),
        P('Die Korrelation misst nur paarweise Beziehungen; Toleranz und VIF erfassen die Beziehung einer Größe zu allen übrigen.', 'The correlation measures only pairwise relations; tolerance and VIF capture the relation of one variable to all the others.'), true),
      a(P('Ab einer Korrelation von 0,90 ist Kollinearität bewiesen, darunter ist sie ausgeschlossen', 'From a correlation of 0.90 collinearity is proven, below it is ruled out'),
        P('Eine feste Höhe gibt es nicht (Backhaus, Kap. 2); für Toleranz und VIF gibt es nur Konventionen. Auch unterhalb ist Kollinearität möglich.', 'There is no fixed level (Backhaus, ch. 2); for tolerance and VIF there are only conventions. Collinearity is possible below it too.')),
      a(P('Hohe Kollinearität verzerrt die geschätzten Koeffizienten, sodass sie im Mittel danebenliegen', 'High collinearity biases the estimated coefficients so that on average they are off'),
        P('Hohe Multikollinearität lässt die Schätzer unverzerrt, macht sie aber ungenau und die Koeffizienten instabil.', 'High multicollinearity leaves the estimators unbiased but makes them imprecise and the coefficients unstable.'))
    ],
    hilfe: [...HILFE, 'kollinearitaet', 'vif'], belege: ['wissen:backhaus-praediktorkorrelation-hinweis', 'wissen:reg-toleranz-vif', 'wissen:reg-vif-schwellen', 'wissen:reg-multikollinearitaet-folgen']
  },
  {
    id: 'reg-dp-eta-sim', thema: 'regression', karte: 'vorhersage',
    stamm: P('Angenommen, Gruppen mit weniger als 30 Personen gelten als klein. Drei Gruppen mit je 20 Personen unterscheiden sich in der Grundgesamtheit in nichts. Was ist für η² (eta-Quadrat) aus solchen Daten im Mittel zu erwarten?',
      'Assume groups with fewer than 30 persons count as small. Three groups of 20 persons each show no difference at all in the population. What is to be expected for η² (eta squared) from such data on average?'),
    tabelle: tab('reg-dp-eta-sim', [P('Personen je Gruppe', 'Persons per group'), P('Personen insgesamt', 'Persons in total'), P('Verzerrung nach der Formel: (Gruppen minus 1) durch (Personen minus 1)', 'Bias by the formula: (groups minus 1) divided by (persons minus 1)'), P('Mittleres η² in der Simulation', 'Mean η² in the simulation'), P('Mittleres ω² in der Simulation', 'Mean ω² in the simulation')], QUELLE_ETA,
      P(`Simulation: drei Gruppen ohne jeden Unterschied in der Grundgesamtheit, je ${zn('ke_wdh')} Wiederholungen`, `Simulation: three groups without any difference in the population, ${zn('ke_wdh')} repetitions each`)),
    antworten: [
      a(P(`Etwa ${zd('ke_eta_20', 3)} statt 0: η² überschätzt den Effekt, und die Verzerrung sinkt mit mehr Personen`, `About ${ze('ke_eta_20', 3)} instead of 0: η² overestimates the effect, the bias falls with more persons`),
        P(`Ohne Zusammenhang beträgt die Verzerrung von η² etwa (Gruppen minus 1) durch (Personen minus 1), hier 2 durch ${zn('ke_n20')} minus 1. Im Mittel sind es ${zd('ke_eta_20', 3)}, bei 100 je Gruppe nur ${zd('ke_eta_100', 3)}; ω² liegt nahe 0.`, `Without a relation the bias of η² is about (groups minus 1) divided by (persons minus 1), here 2 divided by ${zn('ke_n20')} minus 1. On average it is ${ze('ke_eta_20', 3)}, with 100 per group only ${ze('ke_eta_100', 3)}; ω² lies near 0.`), true),
      a(P('Genau 0, denn ohne Unterschied in der Grundgesamtheit gibt es nichts zu messen', 'Exactly 0, since without a difference in the population there is nothing to measure'),
        P(`η² ist auch bei einem Effekt von null im Mittel positiv. In der Simulation liegt das Mittel bei ${zd('ke_eta_20', 3)}.`, `η² is positive on average even with an effect of zero. In the simulation the mean is ${ze('ke_eta_20', 3)}.`)),
      a(P(`Etwa ${zd('ke_eta_20', 3)}, und die Verzerrung bleibt auch mit mehr Personen gleich groß`, `About ${ze('ke_eta_20', 3)}, and the bias stays equally large even with more persons`),
        P(`Die Verzerrung sinkt mit der Zahl der Personen: bei 10 je Gruppe ${zd('ke_eta_10', 3)}, bei 20 je Gruppe ${zd('ke_eta_20', 3)}, bei 100 je Gruppe ${zd('ke_eta_100', 3)}.`, `The bias falls with the number of persons: ${ze('ke_eta_10', 3)} with 10 per group, ${ze('ke_eta_20', 3)} with 20 per group, ${ze('ke_eta_100', 3)} with 100 per group.`))
    ],
    hilfe: ['eta-quadrat', 'omega-quadrat', 'effektstaerke'], belege: ['wissen:effekt-eta-ueberschaetzt-omega']
  },
  {
    id: 'reg-dp-hedges', thema: 'regression', karte: 'vorhersage',
    stamm: P(`Angenommen, Gruppen mit weniger als 30 Personen gelten als klein. Aus zwei Gruppen mit je 20 Personen ergibt sich ein d von ${zd('hg_d')}. Wie wirkt die Korrektur von d zu Hedges\' g (korrigiertes d)?`,
      `Assume groups with fewer than 30 persons count as small. Two groups of 20 persons each give a d of ${ze('hg_d')}. How does the correction of d to Hedges\' g (corrected d) act?`),
    tabelle: tab('reg-dp-hedges', [P('Personen je Gruppe', 'Persons per group'), P('Korrekturfaktor', 'Correction factor'), P(`g bei d = ${zd('hg_d')}`, `g at d = ${ze('hg_d')}`)], QUELLE_HG,
      P(`Hedges\' Korrektur von d = ${zd('hg_d')} bei zwei gleich großen Gruppen`, `Hedges\' correction of d = ${ze('hg_d')} for two groups of equal size`)),
    antworten: [
      a(P(`Sie verkleinert d nur wenig, auf etwa ${zd('hg_g_20', 2)}; sie wird trotzdem als Regel angewandt`, `It reduces d only slightly, to about ${ze('hg_g_20', 2)}; it is applied as a rule all the same`),
        P(`Nach der Tabelle ist der Faktor bei 20 je Gruppe ${zd('hg_faktor_20', 3)}, also g = ${zd('hg_g_20', 3)}. Als relativ stark nach oben verzerrt nennen Nakagawa und Cuthill (2007) d bei weniger als 20 Personen insgesamt (weniger als 10 je Gruppe); die Korrektur soll routinemäßig angewandt werden und ist bei großen Stichproben vernachlässigbar.`, `According to the table the factor is ${ze('hg_faktor_20', 3)} with 20 per group, so g = ${ze('hg_g_20', 3)}. Nakagawa and Cuthill (2007) call d relatively strongly biased upwards with fewer than 20 persons in total (fewer than 10 per group); the correction is to be applied routinely and is negligible with large samples.`), true),
      a(P('Sie halbiert d fast, weil jede Gruppe unter 30 Personen als unbrauchbar klein gilt', 'It almost halves d because every group under 30 persons counts as uselessly small'),
        P(`Laut Tabelle ist g bei 20 je Gruppe ${zd('hg_g_20', 3)} statt ${zd('hg_d', 3)}. Selbst bei 5 je Gruppe beträgt der Faktor noch ${zd('hg_faktor_5', 3)}.`, `According to the table g is ${ze('hg_g_20', 3)} instead of ${ze('hg_d', 3)} with 20 per group. Even with 5 per group the factor is still ${ze('hg_faktor_5', 3)}.`)),
      a(P('Sie entfällt, denn die Korrektur ist nur für große Stichproben vorgesehen', 'It is dropped because the correction is intended only for large samples'),
        P('Es ist umgekehrt: Die Korrektur gleicht die Verzerrung bei kleinen Stichproben aus und soll routinemäßig angewandt werden. Bei großen Stichproben ist sie vernachlässigbar.', 'It is the other way round: the correction compensates the bias in small samples and is to be applied routinely. With large samples it is negligible.'))
    ],
    hilfe: ['hedges-g', 'cohens-d', 'effektstaerke'], belege: ['wissen:nakagawa07-hedges-korrektur', 'wissen:effekt-d-definition']
  },
  {
    id: 'reg-dp-rmin', thema: 'regression', karte: 'vorhersage',
    stamm: P(`Angenommen, ein Ergebnis gilt bei einem p unter ${zd('regel_sig')} als signifikant, und eine Stichprobe mit weniger als 30 Personen gilt als klein. Eine Studie mit 20 Personen findet r = ${zd('rm_gefunden')}. Wie ist das einzuordnen?`,
      `Assume a result counts as significant at a p below ${ze('regel_sig')}, and a sample with fewer than 30 persons counts as small. A study with 20 persons finds r = ${ze('rm_gefunden')}. How is that to be classified?`),
    tabelle: tab('reg-dp-rmin', [P('Personen insgesamt', 'Persons in total'), P(`Kleinste Korrelation r mit p unter ${zd('regel_sig')} (zweiseitig)`, `Smallest correlation r with p below ${ze('regel_sig')} (two-sided)`)], QUELLE_RM,
      P('Mindest-Korrelation für ein signifikantes Ergebnis', 'Minimum correlation for a significant result')),
    antworten: [
      a(P(`Es ist kein signifikantes Ergebnis: Bei 20 Personen verlangt die Schwelle r ab ${zd('rm_20', 3)}`, `It is no significant result: with 20 persons the threshold requires r from ${ze('rm_20', 3)}`),
        P(`Bei gegebener Stichprobengröße ist eine p-Schwelle dasselbe wie eine Mindest-Effektgröße. Laut Tabelle sind es bei 20 Personen ${zd('rm_20', 3)}; r = ${zd('rm_gefunden')} liegt darunter.`, `For a given sample size a p threshold is the same as a minimum effect size. According to the table it is ${ze('rm_20', 3)} with 20 persons; r = ${ze('rm_gefunden')} lies below it.`), true),
      a(P(`Es ist signifikant, denn ${zd('rm_gefunden')} gilt nach Cohen als mittlerer bis großer Effekt`, `It is significant because ${ze('rm_gefunden')} counts as a medium to large effect according to Cohen`),
        P(`Cohens Richtwerte sind Konventionen für die Größe und ersetzen keinen Test. Für die Signifikanz zählt die Mindestgröße der Tabelle: bei 20 Personen ${zd('rm_20', 3)}.`, `Cohen\'s benchmarks are conventions for size and do not replace a test. For significance the minimum size of the table counts: ${ze('rm_20', 3)} with 20 persons.`)),
      a(P('Es ist ausgeschlossen, dass bei weniger als 30 Personen ein Ergebnis signifikant wird', 'It is impossible for a result to become significant with fewer than 30 persons'),
        P(`Auch kleine Stichproben können signifikante Ergebnisse liefern, wenn der Effekt groß genug ist: Bei 20 Personen reicht r von mindestens ${zd('rm_20', 3)}.`, `Small samples can also yield significant results if the effect is large enough: with 20 persons an r of at least ${ze('rm_20', 3)} suffices.`))
    ],
    hilfe: ['signifikanz', 'pearson-korrelation', 'effektstaerke'], belege: ['wissen:funder19-p-schwelle-gleich-r', 'wissen:effekt-cohen-richtwerte']
  },
  {
    id: 'reg-dp-winner', thema: 'regression', karte: 'vorhersage',
    stamm: P(`Angenommen, Gruppen mit weniger als 30 Personen gelten als klein. Der wahre Unterschied zwischen zwei Gruppen beträgt d = ${zd('sw_wahr')}, in der Studie werden je 10 Personen untersucht. Was gilt für die signifikanten Ergebnisse vieler solcher Studien?`,
      `Assume groups with fewer than 30 persons count as small. The true difference between two groups is d = ${ze('sw_wahr')}, and 10 persons per group are studied. What holds for the significant results of many such studies?`),
    tabelle: tab('reg-dp-winner', [P('Personen je Gruppe', 'Persons per group'), P('Teststärke', 'Power'), P('Mittleres d der signifikanten Ergebnisse', 'Mean d of the significant results')], QUELLE_WIN,
      P(`Wahrer Unterschied d = ${zd('sw_wahr')}: Teststärke und mittleres d der signifikanten Ergebnisse`, `True difference d = ${ze('sw_wahr')}: power and mean d of the significant results`)),
    antworten: [
      a(P(`Sie sind selten (Teststärke ${zd('sw_power_10', 3)}), und ihr d liegt im Mittel weit über dem wahren d`, `They are rare (power ${ze('sw_power_10', 3)}), and their d lies on average far above the true d`),
        P(`Bei geringer Teststärke werden echte Effekte selten gefunden, und gefundene Effekte werden überschätzt. Laut Tabelle liegt das mittlere d der signifikanten Ergebnisse bei ${zd('sw_d_10')} statt ${zd('sw_wahr')}.`, `With low power true effects are rarely found, and effects that are found are overestimated. According to the table the mean d of the significant results is ${ze('sw_d_10')} instead of ${ze('sw_wahr')}.`), true),
      a(P(`Sie sind selten (Teststärke ${zd('sw_power_10', 3)}), aber ihr d liegt im Mittel beim wahren d`, `They are rare (power ${ze('sw_power_10', 3)}), but their d lies on average at the true d`),
        P(`Als Ergebnis zählen nur die Stichproben über der Schwelle, und das sind die mit überhöhtem d. Im Mittel liegt es bei ${zd('sw_d_10')}.`, `Only the samples above the threshold count as a result, and those are the ones with an inflated d. On average it is ${ze('sw_d_10')}.`)),
      a(P(`Sie sind häufig (Teststärke über ${zd('sw_power_target', 2)}), weil d = ${zd('sw_wahr')} als mittlerer Effekt nach Cohen gilt`, `They are frequent (power above ${ze('sw_power_target', 2)}) since d = ${ze('sw_wahr')} is a medium effect per Cohen`),
        P(`Die Teststärke hängt von der Personenzahl ab, nicht von der Bezeichnung „mittel“. Bei 10 je Gruppe beträgt sie ${zd('sw_power_10', 3)}, selbst bei 50 je Gruppe nur ${zd('sw_power_50', 3)}.`, `Power depends on the number of persons, not on the label "medium". With 10 per group it is ${ze('sw_power_10', 3)}, even with 50 per group only ${ze('sw_power_50', 3)}.`))
    ],
    hilfe: ['effekt-ueberschaetzung', 'power', 'teststaerke'], belege: ['wissen:button13-drei-probleme']
  },
  {
    id: 'reg-dp-klein-mehrfach', thema: 'regression', karte: 'vorhersage', mehrfach: true,
    stamm: P('Es geht um Ergebnisse aus kleinen Stichproben (Effektgröße und Signifikanz). Welche Aussagen stimmen? Mehrere können stimmen.', 'This is about results from small samples (effect size and significance). Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Bei kleiner Stichprobe entspricht die p-Schwelle einer hohen Mindest-Effektgröße', 'With a small sample the p threshold corresponds to a large minimum effect size'),
        P(`Bei gegebener Stichprobengröße ist eine p-Schwelle dasselbe wie eine Mindest-Effektgröße; bei 20 Personen ist es r = ${zd('rm_20', 3)}, bei 200 nur ${zd('rm_200', 3)}.`, `For a given sample size a p threshold is the same as a minimum effect size; with 20 persons it is r = ${ze('rm_20', 3)}, with 200 only ${ze('rm_200', 3)}.`), true),
      a(P('Hedges\' Korrektur verkleinert d bei kleinen Gruppen deutlicher als bei großen', 'Hedges\' correction reduces d more clearly with small groups than with large ones'),
        P(`Der Faktor beträgt bei 5 je Gruppe ${zd('hg_faktor_5', 3)}, bei 100 je Gruppe ${zd('hg_faktor_100', 3)}.`, `The factor is ${ze('hg_faktor_5', 3)} with 5 per group and ${ze('hg_faktor_100', 3)} with 100 per group.`), true),
      a(P('Das Stichproben-η² ist bei fehlendem Effekt im Mittel null', 'The sample η² is zero on average when there is no effect'),
        P('Es überschätzt den Effekt in der Grundgesamtheit und ist auch bei einem Effekt von null positiv.', 'It overestimates the effect in the population and is positive even with an effect of zero.')),
      a(P('Signifikante Ergebnisse aus kleinen Stichproben liegen im Mittel beim wahren Effekt', 'Significant results from small samples lie on average at the true effect'),
        P('Bei geringer Teststärke werden gefundene Effekte überschätzt.', 'With low power effects that are found are overestimated.'))
    ],
    hilfe: ['effekt-ueberschaetzung', 'hedges-g', 'eta-quadrat'], belege: ['wissen:funder19-p-schwelle-gleich-r', 'wissen:nakagawa07-hedges-korrektur', 'wissen:effekt-eta-ueberschaetzt-omega', 'wissen:button13-drei-probleme']
  }
];
