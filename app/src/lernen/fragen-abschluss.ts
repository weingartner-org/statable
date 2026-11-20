/**
 * Üben: Abschlusstests der Lernpfade. Tabellen wie in der SPSS-Ausgabe, die man lesen und deuten muss; jede Frage führt über `zurueck` zur Einheit,
 * in der man den Stoff üben kann. Eigene Wortlaute, jede Zahl aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R, Abschnitt „Abschlusstests“).
 * Daten: datasets::state.x77, psych::bfi, lavaan::HolzingerSwineford1939.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, za, zd, ze, zn, zp } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const HR = ['frage-vorhersage', 'regression'];
const HF = ['frage-faktor', 'faktorenanalyse'];

const KOEF_KOPF = [P('Größe', 'Term'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('Beta', 'Beta'), P('t', 't'), P('Sig.', 'Sig.')];
const UEBERS_KOPF = [P('Modell', 'Model'), P('R', 'R'), P('R²', 'R²'), P('Korrigiertes R²', 'Adjusted R²'), P('Standardfehler des Schätzers', 'Std. error of the estimate')];
const SD_KOPF = [P('Studie', 'Study'), P('Standardabweichung vis', 'Standard deviation vis'), P('Standardabweichung tex', 'Standard deviation tex'), P('Standardabweichung spd', 'Standard deviation spd')];
const ITEM_KOPF = [P('Frage', 'Question'), P('Wortlaut', 'Wording')];
const LAD_KOPF = [P('Frage', 'Question'), P('Komponente 1', 'Component 1'), P('Komponente 2', 'Component 2')];
const ALPHA_KOPF = [P('Cronbachs Alpha', 'Cronbach\'s alpha'), P('Zahl der Items', 'Number of items')];
const ISTAT_KOPF = [P('Frage', 'Question'), P('Skalenvarianz wenn Item gelöscht', 'Scale variance if item deleted'), P('Korrigierte Item-Skala-Korrelation', 'Corrected item-total correlation'), P('Cronbachs Alpha wenn Item gelöscht', 'Cronbach\'s alpha if item deleted')];

const Q_STATE = P(
  `Daten: datasets::state.x77 (US Bureau of the Census 1977; Teil von R, Lizenz GPL), ${zn('abA_n')} US-Bundesstaaten um 1970. Lineare Regression, berechnet mit R.`,
  `Data: datasets::state.x77 (US Bureau of the Census 1977; part of R, licence GPL), ${zn('abA_n')} US states around 1970. Linear regression, computed with R.`);
const Q_BFI = P(
  `Daten: psych::bfi (SAPA-Projekt 2010, Items aus dem IPIP; Paket psych, Lizenz GPL ≥ 2), ${zn('abB_n')} Personen. E, C und N sind Mittelwerte der fünf Items je Skala (1 bis 6, umgepolte Items vorher gedreht). Lineare Regression, berechnet mit R.`,
  `Data: psych::bfi (SAPA project 2010, items from the IPIP; package psych, licence GPL ≥ 2), ${zn('abB_n')} persons. E, C and N are means of the five items per scale (1 to 6, reverse-keyed items turned beforehand). Linear regression, computed with R.`);
const Q_HS = P(
  `Daten: lavaan::HolzingerSwineford1939 (Holzinger und Swineford 1939; Paket lavaan, Lizenz GPL ≥ 2), Studie 1: ${zn('abH1_n')} Kinder der Schule Pasteur, Studie 2: ${zn('abH2_n')} Kinder der Schule Grant-White. vis und tex sind Mittelwerte aus je drei Tests; spd ist in Studie 1 der Mittelwert, in Studie 2 die Summe der drei Geschwindigkeitstests. Lineare Regression, berechnet mit R.`,
  `Data: lavaan::HolzingerSwineford1939 (Holzinger and Swineford 1939; package lavaan, licence GPL ≥ 2), study 1: ${zn('abH1_n')} children of the school Pasteur, study 2: ${zn('abH2_n')} children of the school Grant-White. vis and tex are means of three tests each; spd is the mean of the three speed tests in study 1 and their sum in study 2. Linear regression, computed with R.`);
const Q_FB = P(
  `Daten: psych::bfi (SAPA-Projekt 2010, Items aus dem IPIP; Paket psych, Lizenz GPL ≥ 2), ${zn('abF_n')} Personen, Antworten von 1 bis 6. Die Wortlaute der Items sind eine deutsche Übersetzung. Hauptkomponentenanalyse mit Varimax und Reliabilitätsanalyse, berechnet mit R.`,
  `Data: psych::bfi (SAPA project 2010, items from the IPIP; package psych, licence GPL ≥ 2), ${zn('abF_n')} persons, answers from 1 to 6. The item wordings are a German translation. Principal component analysis with varimax and reliability analysis, computed with R.`);

const MW_KOPF = [P('female', 'female'), P('Fälle', 'Cases'), P('Mittelwert SATQ', 'Mean SATQ')];
const Q_SA = P(
  `Daten: psych::sat.act (Revelle; SAT- und ACT-Ergebnisse von Studierenden in den USA; Paket psych, Lizenz GPL ≥ 2), ${zn('abS_n')} Personen. SATQ: Ergebnis im Mathematikteil, SATV: im Sprachteil des SAT. female: 0 = männlich, 1 = weiblich. Lineare Regression, berechnet mit R.`,
  `Data: psych::sat.act (Revelle; SAT and ACT results of students in the USA; package psych, licence GPL ≥ 2), ${zn('abS_n')} persons. SATQ: result in the mathematics part, SATV: in the verbal part of the SAT. female: 0 = male, 1 = female. Linear regression, computed with R.`);
const Q_FC = P(
  `Daten: psych::bfi (SAPA-Projekt 2010, Items aus dem IPIP; Paket psych, Lizenz GPL ≥ 2), ${zn('abG_n')} Personen, Antworten von 1 bis 6. Die Wortlaute der Items sind eine deutsche Übersetzung. Hauptkomponentenanalyse mit Varimax und Reliabilitätsanalyse, berechnet mit R.`,
  `Data: psych::bfi (SAPA project 2010, items from the IPIP; package psych, licence GPL ≥ 2), ${zn('abG_n')} persons, answers from 1 to 6. The item wordings are a German translation. Principal component analysis with varimax and reliability analysis, computed with R.`);
const TITEL_SA = P(
  'Studierende in den USA. Abhängige Größe: SATQ (Ergebnis im Mathematikteil des SAT). Unabhängige Größen: female (0 = männlich, 1 = weiblich) und SATV (Ergebnis im Sprachteil des SAT).',
  'Students in the USA. Dependent variable: SATQ (result in the mathematics part of the SAT). Independent variables: female (0 = male, 1 = female) and SATV (result in the verbal part of the SAT).');
const TITEL_FC = P(
  'Sechs Fragen eines Fragebogens (Items), die zwei Konstrukte messen sollen: Sorgfalt (genaues, zielstrebiges Arbeiten) und Stimmung (Stimmungsschwankungen, Gereiztheit, Niedergeschlagenheit).',
  'Six questions of a questionnaire (items) meant to measure two constructs: carefulness (exact, purposeful working) and mood (mood swings, irritability, feeling down).');

const TITEL_LE = P(
  'Lebenserwartung in 50 US-Bundesstaaten. Abhängige Größe: Life.Exp (Lebenserwartung in Jahren). Unabhängige Größen: Murder (Morde je 100.000 Einwohner) und Illiteracy (Analphabetenrate in Prozent).',
  'Life expectancy in 50 US states. Dependent variable: Life.Exp (life expectancy in years). Independent variables: Murder (murders per 100,000 inhabitants) and Illiteracy (illiteracy rate in percent).');
const TITEL_PE = P(
  'Persönlichkeitsfragebogen. Abhängige Größe: N (Neurotizismus, Stimmungsschwankungen und Reizbarkeit). Unabhängige Größen: E (Extraversion, Geselligkeit) und C (Gewissenhaftigkeit, Sorgfalt).',
  'Personality questionnaire. Dependent variable: N (neuroticism, mood swings and irritability). Independent variables: E (extraversion, sociability) and C (conscientiousness, carefulness).');
const TITEL_HS = P(
  'Zwei Schulen, dieselben drei Skalen. Abhängige Größe: spd (Geschwindigkeitsaufgaben). Unabhängige Größen: vis (räumliche Aufgaben) und tex (Textverständnis). Studie 1 und Studie 2 sind zwei verschiedene Gruppen von Kindern. In Studie 1 ist spd der Mittelwert der drei Geschwindigkeitstests, in Studie 2 ihre Summe.',
  'Two schools, the same three scales. Dependent variable: spd (speed tasks). Independent variables: vis (spatial tasks) and tex (text comprehension). Study 1 and study 2 are two different groups of children. In study 1 spd is the mean of the three speed tests, in study 2 their sum.');
const TITEL_FB = P(
  'Sechs Fragen eines Fragebogens (Items), die zwei Konstrukte messen sollen: Anteilnahme (Mitgefühl für andere) und Geselligkeit (Kontakt zu anderen).',
  'Six questions of a questionnaire (items) meant to measure two constructs: concern for others (sympathy for other people) and sociability (contact with other people).');

const tM = (n: string, kopf: typeof KOEF_KOPF, q: typeof Q_STATE, titel: [string, string]) => tab(n, kopf, q, P(titel[0], titel[1]));

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'ab-le1': { titel: TITEL_LE, tabellen: [
    tM('ab-le1.0', UEBERS_KOPF, Q_STATE, ['Tabelle 1a. Modellzusammenfassung (Life.Exp)', 'Table 1a. Model summary (Life.Exp)']),
    tM('ab-le1.1', KOEF_KOPF, Q_STATE, ['Tabelle 1b. Koeffizienten (Life.Exp)', 'Table 1b. Coefficients (Life.Exp)'])] },
  'ab-le3': { titel: TITEL_LE, tabellen: [
    tM('ab-le3.0', UEBERS_KOPF, Q_STATE, ['Tabelle 1a bis 3a. Modellzusammenfassung: Modell 1 mit Murder und Illiteracy, Modell 2 nur mit Murder, Modell 3 nur mit Illiteracy', 'Table 1a to 3a. Model summary: model 1 with Murder and Illiteracy, model 2 with Murder only, model 3 with Illiteracy only']),
    tM('ab-le3.1', KOEF_KOPF, Q_STATE, ['Tabelle 1b. Koeffizienten, Modell 1 (Murder und Illiteracy)', 'Table 1b. Coefficients, model 1 (Murder and Illiteracy)']),
    tM('ab-le3.2', KOEF_KOPF, Q_STATE, ['Tabelle 2b. Koeffizienten, Modell 2 (nur Murder)', 'Table 2b. Coefficients, model 2 (Murder only)']),
    tM('ab-le3.3', KOEF_KOPF, Q_STATE, ['Tabelle 3b. Koeffizienten, Modell 3 (nur Illiteracy)', 'Table 3b. Coefficients, model 3 (Illiteracy only)'])] },
  'ab-pe1': { titel: TITEL_PE, tabellen: [
    tM('ab-pe1.0', UEBERS_KOPF, Q_BFI, ['Tabelle 1a. Modellzusammenfassung (N)', 'Table 1a. Model summary (N)']),
    tM('ab-pe1.1', KOEF_KOPF, Q_BFI, ['Tabelle 1b. Koeffizienten (N)', 'Table 1b. Coefficients (N)'])] },
  'ab-pe3': { titel: TITEL_PE, tabellen: [
    tM('ab-pe3.0', UEBERS_KOPF, Q_BFI, ['Tabelle 1a bis 3a. Modellzusammenfassung: Modell 1 mit E und C, Modell 2 nur mit E, Modell 3 nur mit C', 'Table 1a to 3a. Model summary: model 1 with E and C, model 2 with E only, model 3 with C only']),
    tM('ab-pe3.1', KOEF_KOPF, Q_BFI, ['Tabelle 1b. Koeffizienten, Modell 1 (E und C)', 'Table 1b. Coefficients, model 1 (E and C)']),
    tM('ab-pe3.2', KOEF_KOPF, Q_BFI, ['Tabelle 2b. Koeffizienten, Modell 2 (nur E)', 'Table 2b. Coefficients, model 2 (E only)']),
    tM('ab-pe3.3', KOEF_KOPF, Q_BFI, ['Tabelle 3b. Koeffizienten, Modell 3 (nur C)', 'Table 3b. Coefficients, model 3 (C only)'])] },
  'ab-hs': { titel: TITEL_HS, tabellen: [
    tM('ab-hs.0', UEBERS_KOPF, Q_HS, ['Tabelle 1a. Modellzusammenfassung (spd), Studie 1', 'Table 1a. Model summary (spd), study 1']),
    tM('ab-hs.1', KOEF_KOPF, Q_HS, ['Tabelle 1b. Koeffizienten (spd), Studie 1', 'Table 1b. Coefficients (spd), study 1']),
    tM('ab-hs.2', UEBERS_KOPF, Q_HS, ['Tabelle 2a. Modellzusammenfassung (spd), Studie 2', 'Table 2a. Model summary (spd), study 2']),
    tM('ab-hs.3', KOEF_KOPF, Q_HS, ['Tabelle 2b. Koeffizienten (spd), Studie 2', 'Table 2b. Coefficients (spd), study 2']),
    tM('ab-hs.4', SD_KOPF, Q_HS, ['Tabelle 3. Standardabweichungen in beiden Studien', 'Table 3. Standard deviations in both studies'])] },
  'ab-fa1': { titel: TITEL_FB, tabellen: [tM('ab-fa1.0', ITEM_KOPF, Q_FB, ['Tabelle 1. Sechs Fragen', 'Table 1. Six questions'])] },
  'ab-fa2': { titel: TITEL_FB, tabellen: [
    tM('ab-fa2.0', ITEM_KOPF, Q_FB, ['Tabelle 1. Sechs Fragen', 'Table 1. Six questions']),
    tM('ab-fa2.1', LAD_KOPF, Q_FB, [`Tabelle 2. Rotierte Komponentenmatrix (Ladungen unter ${zd('regel_ladung_aus')} ausgeblendet)`, `Table 2. Rotated component matrix (loadings below ${ze('regel_ladung_aus')} hidden)`])] },
  'ab-fa3': { titel: P('Reliabilitätsanalyse der Fragen F5, F2 und F3, die zusammen eine Skala für Anteilnahme bilden sollen. Die Antworten sind unverändert, keine Frage wurde umgepolt.', 'Reliability analysis of the questions F5, F2 and F3, meant to form a scale for concern for others. The answers are unchanged, no question was reverse-coded.'), tabellen: [
    tM('ab-fa3.0', ALPHA_KOPF, Q_FB, ['Tabelle 3a. Reliabilitätsstatistiken', 'Table 3a. Reliability statistics']),
    tM('ab-fa3.1', ISTAT_KOPF, Q_FB, ['Tabelle 3b. Item-Skala-Statistiken', 'Table 3b. Item-total statistics'])] },
  'ab-fa4': { titel: P('Reliabilitätsanalyse derselben drei Fragen, nachdem F2 umgepolt wurde (Antwort 1 wurde zu 6, 2 zu 5 und so weiter).', 'Reliability analysis of the same three questions after F2 was reverse-coded (answer 1 became 6, 2 became 5 and so on).'), tabellen: [
    tM('ab-fa4.0', ALPHA_KOPF, Q_FB, ['Tabelle 4a. Reliabilitätsstatistiken, F2 umgepolt', 'Table 4a. Reliability statistics, F2 reverse-coded']),
    tM('ab-fa4.1', ISTAT_KOPF, Q_FB, ['Tabelle 4b. Item-Skala-Statistiken, F2 umgepolt', 'Table 4b. Item-total statistics, F2 reverse-coded'])] },
  'ab-fa5': { titel: TITEL_FB, tabellen: [
    tM('ab-fa5.0', ITEM_KOPF, Q_FB, ['Tabelle 1. Sechs Fragen', 'Table 1. Six questions']),
    tM('ab-fa5.1', LAD_KOPF, Q_FB, [`Tabelle 2. Rotierte Komponentenmatrix (Ladungen unter ${zd('regel_ladung_aus')} ausgeblendet)`, `Table 2. Rotated component matrix (loadings below ${ze('regel_ladung_aus')} hidden)`]),
    tM('ab-fa5.2', ALPHA_KOPF, Q_FB, ['Tabelle 3a. Reliabilitätsstatistiken von F5, F2, F3 (F2 unverändert)', 'Table 3a. Reliability statistics of F5, F2, F3 (F2 unchanged)']),
    tM('ab-fa5.3', ISTAT_KOPF, Q_FB, ['Tabelle 3b. Item-Skala-Statistiken (F2 unverändert)', 'Table 3b. Item-total statistics (F2 unchanged)']),
    tM('ab-fa5.4', ALPHA_KOPF, Q_FB, ['Tabelle 4a. Reliabilitätsstatistiken, F2 umgepolt', 'Table 4a. Reliability statistics, F2 reverse-coded']),
    tM('ab-fa5.5', ISTAT_KOPF, Q_FB, ['Tabelle 4b. Item-Skala-Statistiken, F2 umgepolt', 'Table 4b. Item-total statistics, F2 reverse-coded'])] },
  'ab-sa1': { titel: TITEL_SA, tabellen: [
    tM('ab-sa1.0', UEBERS_KOPF, Q_SA, ['Tabelle 1a. Modellzusammenfassung (SATQ)', 'Table 1a. Model summary (SATQ)']),
    tM('ab-sa1.1', KOEF_KOPF, Q_SA, ['Tabelle 1b. Koeffizienten (SATQ)', 'Table 1b. Coefficients (SATQ)'])] },
  'ab-sa2': { titel: TITEL_SA, tabellen: [
    tM('ab-sa2.0', KOEF_KOPF, Q_SA, ['Tabelle 1b. Koeffizienten (SATQ)', 'Table 1b. Coefficients (SATQ)']),
    tM('ab-sa2.1', MW_KOPF, Q_SA, ['Tabelle 2. Mittelwert von SATQ nach female', 'Table 2. Mean of SATQ by female'])] },
  'ab-sa3': { titel: TITEL_SA, tabellen: [
    tM('ab-sa3.0', UEBERS_KOPF, Q_SA, ['Tabelle 1a und 2a. Modellzusammenfassung: Modell 1 mit female, Modell 2 mit female und SATV', 'Table 1a and 2a. Model summary: model 1 with female, model 2 with female and SATV']),
    tM('ab-sa3.1', KOEF_KOPF, Q_SA, ['Tabelle 1b. Koeffizienten, Modell 1 (female)', 'Table 1b. Coefficients, model 1 (female)']),
    tM('ab-sa3.2', KOEF_KOPF, Q_SA, ['Tabelle 2b. Koeffizienten, Modell 2 (female und SATV)', 'Table 2b. Coefficients, model 2 (female and SATV)'])] },
  'ab-fb1': { titel: TITEL_FC, tabellen: [tM('ab-fb1.0', ITEM_KOPF, Q_FC, ['Tabelle 1. Sechs Fragen', 'Table 1. Six questions'])] },
  'ab-fb2': { titel: TITEL_FC, tabellen: [
    tM('ab-fb2.0', ITEM_KOPF, Q_FC, ['Tabelle 1. Sechs Fragen', 'Table 1. Six questions']),
    tM('ab-fb2.1', LAD_KOPF, Q_FC, [`Tabelle 2. Rotierte Komponentenmatrix (Ladungen unter ${zd('regel_ladung_aus')} ausgeblendet)`, `Table 2. Rotated component matrix (loadings below ${ze('regel_ladung_aus')} hidden)`])] },
  'ab-fb3': { titel: P('Reliabilitätsanalyse der Fragen G3, G2 und G5, die zusammen eine Skala für Sorgfalt bilden sollen. Die Antworten sind unverändert, keine Frage wurde umgepolt.', 'Reliability analysis of the questions G3, G2 and G5, meant to form a scale for carefulness. The answers are unchanged, no question was reverse-coded.'), tabellen: [
    tM('ab-fb3.0', ALPHA_KOPF, Q_FC, ['Tabelle 3a. Reliabilitätsstatistiken', 'Table 3a. Reliability statistics']),
    tM('ab-fb3.1', ISTAT_KOPF, Q_FC, ['Tabelle 3b. Item-Skala-Statistiken', 'Table 3b. Item-total statistics'])] },
  'ab-fb4': { titel: P('Reliabilitätsanalyse derselben drei Fragen, nachdem G2 umgepolt wurde (Antwort 1 wurde zu 6, 2 zu 5 und so weiter).', 'Reliability analysis of the same three questions after G2 was reverse-coded (answer 1 became 6, 2 became 5 and so on).'), tabellen: [
    tM('ab-fb4.0', ALPHA_KOPF, Q_FC, ['Tabelle 4a. Reliabilitätsstatistiken, G2 umgepolt', 'Table 4a. Reliability statistics, G2 reverse-coded']),
    tM('ab-fb4.1', ISTAT_KOPF, Q_FC, ['Tabelle 4b. Item-Skala-Statistiken, G2 umgepolt', 'Table 4b. Item-total statistics, G2 reverse-coded'])] },
  'ab-fb5': { titel: TITEL_FC, tabellen: [
    tM('ab-fb5.0', ITEM_KOPF, Q_FC, ['Tabelle 1. Sechs Fragen', 'Table 1. Six questions']),
    tM('ab-fb5.1', LAD_KOPF, Q_FC, [`Tabelle 2. Rotierte Komponentenmatrix (Ladungen unter ${zd('regel_ladung_aus')} ausgeblendet)`, `Table 2. Rotated component matrix (loadings below ${ze('regel_ladung_aus')} hidden)`]),
    tM('ab-fb5.2', ALPHA_KOPF, Q_FC, ['Tabelle 3a. Reliabilitätsstatistiken von G3, G2, G5 (G2 unverändert)', 'Table 3a. Reliability statistics of G3, G2, G5 (G2 unchanged)']),
    tM('ab-fb5.3', ISTAT_KOPF, Q_FC, ['Tabelle 3b. Item-Skala-Statistiken (G2 unverändert)', 'Table 3b. Item-total statistics (G2 unchanged)']),
    tM('ab-fb5.4', ALPHA_KOPF, Q_FC, ['Tabelle 4a. Reliabilitätsstatistiken, G2 umgepolt', 'Table 4a. Reliability statistics, G2 reverse-coded']),
    tM('ab-fb5.5', ISTAT_KOPF, Q_FC, ['Tabelle 4b. Item-Skala-Statistiken, G2 umgepolt', 'Table 4b. Item-total statistics, G2 reverse-coded'])] }
};

export const FRAGEN: Frage[] = [
  // ======== Regression, Block 1: Lebenserwartung - Tabelle lesen, Modelle vergleichen ========
  {
    id: 'ab-rg-le-variablen', thema: 'abschluss', fall: 'ab-le1', zurueck: 'regression-tabelle-lesen',
    stamm: P('Tabelle 1b zeigt eine Regression der Lebenserwartung auf zwei Größen. Welche Aussage über die Variablen und die Konstante stimmt?',
      'Table 1b shows a regression of life expectancy on two variables. Which statement about the variables and the constant is correct?'),
    antworten: [
      a(P(`Abhängig ist Life.Exp, unabhängig sind Murder und Illiteracy. Die Konstante ${zd('abA_b_const', 3)} ist die vorhergesagte Lebenserwartung bei Murder = 0 und Illiteracy = 0`,
          `Life.Exp is dependent, Murder and Illiteracy are independent. The constant ${ze('abA_b_const', 3)} is the predicted life expectancy at Murder = 0 and Illiteracy = 0`),
        P('Die abhängige Größe wird vorhergesagt, die unabhängigen sagen sie vorher. Die Konstante ist der vorhergesagte Wert, wenn alle unabhängigen Größen null sind.', 'The dependent variable is predicted, the independent ones predict it. The constant is the predicted value when all independent variables are zero.'), true),
      a(P(`Abhängig ist Murder, unabhängig sind Life.Exp und Illiteracy. Die Konstante ${zd('abA_b_const', 3)} ist die vorhergesagte Mordrate bei einer Lebenserwartung von null; Murder wird also aus den beiden anderen Größen vorhergesagt`, `Murder is dependent, Life.Exp and Illiteracy are independent. The constant ${ze('abA_b_const', 3)} is the predicted murder rate at a life expectancy of zero; Murder is thus predicted from the two other variables`),
        P('Die Tabelle gehört zur Regression der Lebenserwartung (Life.Exp); sie ist die abhängige Größe, Murder und Illiteracy sind die vorhersagenden.', 'The table belongs to the regression of life expectancy (Life.Exp); it is the dependent variable, Murder and Illiteracy are the predicting ones.')),
      a(P(`Abhängig ist Life.Exp, unabhängig sind Murder und Illiteracy. Die Konstante ${zd('abA_b_const', 3)} ist die durchschnittliche Lebenserwartung aller Bundesstaaten`, `Life.Exp is dependent, Murder and Illiteracy are independent. The constant ${ze('abA_b_const', 3)} is the average life expectancy of all states`),
        P('Der Durchschnitt aller Staaten wäre ein Mittelwert. Die Konstante gehört zu einem bestimmten Punkt: Murder = 0 und Illiteracy = 0.', 'The average of all states would be a mean. The constant belongs to a particular point: Murder = 0 and Illiteracy = 0.')),
      a(P(`Alle drei Größen sind unabhängig und werden miteinander verglichen; die Konstante ${zd('abA_b_const', 3)} ist ihr gemeinsamer Mittelwert über die 50 Bundesstaaten`, `All three variables are independent and are compared with each other; the constant ${ze('abA_b_const', 3)} is their common mean over the 50 states`),
        P('Eine Regression hat genau eine abhängige Größe. Die Konstante ist kein Mittelwert, sondern der vorhergesagte Wert bei null.', 'A regression has exactly one dependent variable. The constant is no mean but the predicted value at zero.'))
    ],
    hilfe: [...HR, 'koeffizient-b'], belege: ['wissen:reg-steigung-deutung-einheit', 'wissen:reg-spss-tabelle', 'Hilfe:koeffizient-b']
  },
  {
    id: 'ab-rg-le-b', thema: 'abschluss', fall: 'ab-le1', zurueck: 'regression-tabelle-lesen',
    stamm: P('Wie ist das B der Größe Murder in Tabelle 1b zu lesen?', 'How is the B of the variable Murder in table 1b to be read?'),
    antworten: [
      a(P(`Je ein Mord mehr je 100.000 Einwohner, desto niedriger die vorhergesagte Lebenserwartung, um ${za('abA_b_murder', 3)} Jahre, bei gleicher Analphabetenrate`, `For each additional murder per 100,000 inhabitants the predicted life expectancy is lower by ${zae3('abA_b_murder')} years, at the same illiteracy rate`),
        P('B ist der Unterschied der abhängigen Größe bei einer Einheit mehr der unabhängigen, mit der anderen unabhängigen Größe konstant gehalten.', 'B is the difference in the dependent variable for one more unit of the independent one, with the other independent variable held constant.'), true),
      a(P(`Je ein Jahr mehr Lebenserwartung, desto weniger Morde: je Jahr sinkt die Mordrate um ${za('abA_b_murder', 3)} Morde je 100.000 Einwohner, bei gleicher Analphabetenrate`, `For each additional year of life expectancy there are fewer murders: per year the murder rate falls by ${zae3('abA_b_murder')} murders per 100,000 inhabitants, at the same illiteracy rate`),
        P('Die Richtung ist vertauscht. B nennt die Änderung der abhängigen Größe (Lebenserwartung), wenn die unabhängige (Murder) um eins steigt.', 'The direction is reversed. B gives the change in the dependent variable (life expectancy) when the independent one (Murder) rises by one.')),
      a(P(`Murder erklärt für sich allein einen Anteil von ${za('abA_b_murder', 3)} der Streuung der Lebenserwartung, den die Analphabetenrate nicht erklärt`, `Murder on its own explains a share of ${zae3('abA_b_murder')} of the variation in life expectancy that the illiteracy rate does not explain`),
        P('Der erklärte Anteil der Streuung steht bei R², nicht beim B.', 'The explained share of the variation is given by R², not by B.')),
      a(P(`Mit jedem Mord je 100.000 Einwohner sinkt die vorhergesagte Lebenserwartung um ${za('abA_b_murder', 3)} Prozent, bei gleicher Analphabetenrate`, `With each murder per 100,000 inhabitants the predicted life expectancy falls by ${zae3('abA_b_murder')} percent, at the same illiteracy rate`),
        P('B steht in der Einheit der abhängigen Größe, hier Jahren; von Prozent ist nirgends die Rede.', 'B is in the unit of the dependent variable, here years; percent is not mentioned anywhere.')),
      a(P(`Jeder Mord je 100.000 Einwohner verkürzt das Leben um ${za('abA_b_murder', 3)} Jahre; damit ist belegt, dass Morde die Lebenserwartung senken`, `Each murder per 100,000 inhabitants shortens life by ${zae3('abA_b_murder')} years; this proves that murders lower life expectancy`),
        P('Eine Regression zeigt einen Zusammenhang. Ob Morde die Lebenserwartung verkürzen, folgt daraus nicht; andere Merkmale der Staaten können beides beeinflussen.', 'A regression shows a relation. It does not follow that murders shorten life expectancy; other characteristics of the states can influence both.'))
    ],
    hilfe: [...HR, 'koeffizient-b'], belege: ['wissen:reg-steigung-deutung-einheit', 'wissen:reg-partielle-koeffizienten', 'wissen:kohn-regression-interpretation']
  },
  {
    id: 'ab-rg-le-se', thema: 'abschluss', fall: 'ab-le1', zurueck: 'regression-tabelle-lesen',
    stamm: P(`Murder hat in Tabelle 1b einen Standardfehler von ${zd('abA_se_murder', 3)} und ein Sig. unter 0,001. Was sagen die beiden Werte?`,
      `In table 1b Murder has a standard error of ${ze('abA_se_murder', 3)} and a Sig. below 0.001. What do the two values say?`),
    antworten: [
      a(P(`Der Standardfehler zeigt, wie stark B von Stichprobe zu Stichprobe schwankt, und ist klein gegenüber B. Sig. unter 0,001: Bei keinem wahren Zusammenhang wäre so ein großes B sehr unwahrscheinlich`, `The standard error shows how much B varies from sample to sample and is small compared with B. Sig. below 0.001: with no true relation so large a B would be very unlikely`),
        P(`Der Standardfehler misst die Genauigkeit von B, Sig. die Überraschung des Ergebnisses unter der Annahme von null. Unter ${zd('regel_sig')} gilt ein Ergebnis als signifikant.`, `The standard error measures the precision of B, Sig. the surprise of the result under the assumption of zero. Below ${ze('regel_sig')} a result counts as significant.`), true),
      a(P('Der Standardfehler ist die durchschnittliche Abweichung der Bundesstaaten von der Regressionsgeraden, und Sig. ist der erklärte Anteil der Streuung der Lebenserwartung, den das Modell insgesamt leistet', 'The standard error is the average deviation of the states from the regression line, Sig. is the explained share of the variation in life expectancy that the model achieves as a whole'),
        P('Die Abweichung von der Geraden steckt im Standardfehler des Schätzers (Tabelle 1a), der erklärte Anteil in R². Der Standardfehler in Tabelle 1b gehört zu B.', 'The deviation from the line is in the standard error of the estimate (table 1a), the explained share in R². The standard error in table 1b belongs to B.')),
      a(P('Sig. unter 0,001 heißt, dass der Zusammenhang mit sehr hoher Wahrscheinlichkeit wahr ist, und der Standardfehler zeigt, wie genau B gemessen ist', 'Sig. below 0.001 means that the relation is true with very high probability, and the standard error shows how precisely B was measured'),
        P('Sig. ist die Wahrscheinlichkeit der Daten bei einem Zusammenhang von null, nicht die Wahrscheinlichkeit, dass der Zusammenhang besteht.', 'Sig. is the probability of the data given a relation of zero, not the probability that the relation exists.')),
      a(P('Beide Werte zeigen die Stärke des Zusammenhangs: je kleiner Standardfehler und Sig. sind, desto stärker wirkt Murder auf die Lebenserwartung, und umso weniger zählt, wie groß B selbst ist', 'Both values show the strength of the relation: the smaller the standard error and Sig. are, the stronger Murder acts on life expectancy, and the less it matters how large B itself is'),
        P('Die Stärke zeigt Beta oder R². Standardfehler und Sig. sagen, wie sicher das Ergebnis ist, nicht wie groß der Effekt ist.', 'The strength is shown by Beta or R². Standard error and Sig. say how certain the result is, not how large the effect is.'))
    ],
    hilfe: [...HR, 'standardfehler-schaetzer', 'signifikanz'], belege: ['wissen:reg-t-test-steigung', 'wissen:reg-standardfehler-steigung', 'wissen:signifikant-nicht-bedeutsam']
  },
  {
    id: 'ab-rg-le-r2', thema: 'abschluss', fall: 'ab-le1', zurueck: 'regression-modelle-vergleichen', mehrfach: true,
    stamm: P(`Tabelle 1a zeigt R = ${zd('abA_R', 3)}, R² = ${zd('abA_r2', 3)} und korrigiertes R² = ${zd('abA_adj', 3)}. Welche Aussagen stimmen? Mehrere können stimmen.`,
      `Table 1a shows R = ${ze('abA_R', 3)}, R² = ${ze('abA_r2', 3)} and adjusted R² = ${ze('abA_adj', 3)}. Which statements are correct? Several can be correct.`),
    antworten: [
      a(P(`Rund ${zp('abA_r2')} Prozent der Streuung der Lebenserwartung hängen mit Murder und Illiteracy zusammen`, `About ${zp('abA_r2')} percent of the variation in life expectancy goes with Murder and Illiteracy`),
        P('R² ist der Anteil der Streuung der abhängigen Größe, der mit dem Modell verbunden ist.', 'R² is the share of the variation of the dependent variable that is related to the model.'), true),
      a(P('R ist die Wurzel aus R², also die Korrelation zwischen den beobachteten und den vorhergesagten Werten der Lebenserwartung', 'R is the root of R², that is the correlation between the observed and the predicted values of life expectancy'),
        P(`Die Wurzel aus ${zd('abA_r2', 3)} ist ${zd('abA_R', 3)}. R heißt auch multiple Korrelation.`, `The root of ${ze('abA_r2', 3)} is ${ze('abA_R', 3)}. R is also called the multiple correlation.`), true),
      a(P(`Bei ${zp('abA_r2')} Prozent der Bundesstaaten stimmt die vorhergesagte Lebenserwartung`, `For ${zp('abA_r2')} percent of the states the predicted life expectancy is correct`),
        P('R² ist keine Trefferquote, sondern ein Anteil der Streuung.', 'R² is no hit rate but a share of the variation.')),
      a(P('Das korrigierte R² ist größer als R², weil es zusätzliche Größen belohnt', 'The adjusted R² is larger than R² because it rewards additional variables'),
        P(`Das korrigierte R² bestraft zusätzliche Größen und liegt unter R²: ${zd('abA_adj', 3)} gegenüber ${zd('abA_r2', 3)}.`, `The adjusted R² penalises additional variables and lies below R²: ${ze('abA_adj', 3)} against ${ze('abA_r2', 3)}.`))
    ],
    hilfe: [...HR, 'r-quadrat'], belege: ['wissen:reg-r2-definition', 'wissen:reg-r2-adjustiert', 'wissen:reg-spss-tabelle']
  },
  {
    id: 'ab-rg-le-murder', thema: 'abschluss', fall: 'ab-le3', zurueck: 'regression-modelle-vergleichen',
    stamm: P('Modell 1 enthält Murder und Illiteracy, Modell 2 nur Murder, Modell 3 nur Illiteracy. Was tun Sie aufgrund dieses Vergleichs mit der Größe Murder? Denken Sie an Signifikanz und R².',
      'Model 1 contains Murder and Illiteracy, model 2 only Murder, model 3 only Illiteracy. What do you do with the variable Murder on the basis of this comparison? Think of significance and R².'),
    antworten: [
      a(P(`Behalten: Murder ist in Modell 1 signifikant (Sig. unter 0,001), und ohne Murder sinkt R² von ${zd('abA_r2', 3)} auf ${zd('abA2_r2', 3)}`, `Keep it: Murder is significant in model 1 (Sig. below 0.001), and without Murder R² falls from ${ze('abA_r2', 3)} to ${ze('abA2_r2', 3)}`),
        P('Eine Größe bleibt, wenn sie signifikant ist und das R² ohne sie deutlich fällt.', 'A variable stays if it is significant and R² falls clearly without it.'), true),
      a(P(`Weglassen: Das R² steigt von Modell 2 (${zd('abA1_r2', 3)}) zu Modell 1 (${zd('abA_r2', 3)}) kaum, und Murder erklärt neben Illiteracy fast nichts`, `Drop it: R² hardly rises from model 2 (${ze('abA1_r2', 3)}) to model 1 (${ze('abA_r2', 3)}), and Murder explains almost nothing next to Illiteracy`),
        P('Dieser kleine Zuwachs gehört zu Illiteracy, nicht zu Murder. Für Murder zählt der Vergleich mit Modell 3, in dem es fehlt.', 'This small gain belongs to Illiteracy, not to Murder. For Murder the comparison with model 3, where it is missing, counts.')),
      a(P(`Weglassen: Das B von Murder (${zd('abA_b_murder', 3)}) ist kleiner als das B von Illiteracy in Modell 3 (${zd('abA2_b_illiteracy', 3)}), also wirkt Murder schwächer`, `Drop it: the B of Murder (${ze('abA_b_murder', 3)}) is smaller than the B of Illiteracy in model 3 (${ze('abA2_b_illiteracy', 3)}), so Murder acts more weakly`),
        P('B hängt von der Einheit der Größe ab (Morde je 100.000, Prozent). Die Größen der B lassen sich nicht vergleichen; entscheidend sind Sig. und R².', 'B depends on the unit of the variable (murders per 100,000, percent). The sizes of B cannot be compared; Sig. and R² decide.')),
      a(P(`Keine Entscheidung möglich, weil die drei Modelle verschieden viele Größen haben und sich darum nicht vergleichen lassen; ihre R² (${zd('abA_r2', 3)}, ${zd('abA1_r2', 3)} und ${zd('abA2_r2', 3)}) gelten nicht als vergleichbar`, `No decision is possible because the three models have different numbers of variables and so cannot be compared; their R² (${ze('abA_r2', 3)}, ${ze('abA1_r2', 3)} and ${ze('abA2_r2', 3)}) are not regarded as comparable`),
        P('Genau dafür werden Modelle mit und ohne eine Größe verglichen: Man sieht, was Signifikanz und R² mit und ohne sie tun.', 'This is exactly why models with and without a variable are compared: you see what significance and R² do with and without it.'))
    ],
    hilfe: [...HR, 'r-quadrat', 'signifikanz'], belege: ['wissen:reg-modellvergleich', 'wissen:reg-r2-definition', 'wissen:reg-partielle-koeffizienten']
  },
  {
    id: 'ab-rg-le-illit', thema: 'abschluss', fall: 'ab-le3', zurueck: 'regression-modelle-vergleichen',
    stamm: P('Was tun Sie aufgrund desselben Vergleichs mit der Größe Illiteracy? Denken Sie an Signifikanz und R².',
      'What do you do with the variable Illiteracy on the basis of the same comparison? Think of significance and R².'),
    antworten: [
      a(P(`Weglassen: Neben Murder ist sie nicht signifikant (Sig. ${zd('abA_p_illiteracy', 3)}), und R² steigt von ${zd('abA1_r2', 3)} auf ${zd('abA_r2', 3)} nur minimal`, `Drop it: next to Murder it is not significant (Sig. ${ze('abA_p_illiteracy', 3)}), and R² rises only minimally from ${ze('abA1_r2', 3)} to ${ze('abA_r2', 3)}`),
        P('Sie bringt neben Murder fast nichts dazu: nicht signifikant, kaum mehr R².', 'Next to Murder it adds almost nothing: not significant, hardly more R².'), true),
      a(P(`Behalten: Allein ist sie signifikant (Modell 3, Sig. unter 0,001) und erreicht ein R² von ${zd('abA2_r2', 3)}; das spricht für Illiteracy, denn ein eigener Effekt ist damit gezeigt`, `Keep it: on its own it is significant (model 3, Sig. below 0.001) and reaches an R² of ${ze('abA2_r2', 3)}; that speaks for Illiteracy, since an effect of its own is thereby shown`),
        P('Allein hängt Illiteracy mit der Lebenserwartung zusammen. Mit Murder im Modell sagt sie nichts Zusätzliches mehr; beide Größen hängen selbst zusammen.', 'On its own Illiteracy goes with life expectancy. With Murder in the model it says nothing additional; the two variables are related themselves.')),
      a(P(`Behalten: Das korrigierte R² von Modell 1 (${zd('abA_adj', 3)}) ist höher als das von Modell 3 (${zd('abA2_adj', 3)}), also verbessert Illiteracy das Modell`, `Keep it: the adjusted R² of model 1 (${ze('abA_adj', 3)}) is higher than that of model 3 (${ze('abA2_adj', 3)}), so Illiteracy improves the model`),
        P(`Der Vergleich mit Modell 3 zeigt, was Murder bringt. Für Illiteracy zählt Modell 2: Dort ist das korrigierte R² (${zd('abA1_adj', 3)}) sogar höher als in Modell 1.`, `The comparison with model 3 shows what Murder adds. For Illiteracy model 2 counts: there the adjusted R² (${ze('abA1_adj', 3)}) is even higher than in model 1.`)),
      a(P(`Behalten: Ihr B ist negativ (${zd('abA_b_illiteracy', 3)}), und ein negativer Zusammenhang mit der Lebenserwartung ist inhaltlich besonders wichtig`, `Keep it: its B is negative (${ze('abA_b_illiteracy', 3)}), and a negative relation with life expectancy is of particular importance in content`),
        P('Das Vorzeichen sagt nur die Richtung. Ob eine Größe im Modell bleibt, entscheiden Signifikanz und R².', 'The sign only tells the direction. Whether a variable stays in the model is decided by significance and R².')),
      a(P(`Weglassen: In Modell 3 ist ihr R² klein (${zd('abA2_r2', 3)}), deshalb trägt Illiteracy wenig zum Verständnis der Lebenserwartung bei`, `Drop it: in model 3 its R² is small (${ze('abA2_r2', 3)}), so Illiteracy contributes little to understanding life expectancy`),
        P(`Mit ${zd('abA2_r2', 3)} ist das R² in Modell 3 nicht klein. Ausschlaggebend ist, was Illiteracy neben Murder dazu beiträgt, und das ist kaum etwas.`, `With ${ze('abA2_r2', 3)} the R² in model 3 is not small. What counts is what Illiteracy adds next to Murder, and that is hardly anything.`))
    ],
    hilfe: [...HR, 'r-quadrat', 'signifikanz'], belege: ['wissen:reg-modellvergleich', 'wissen:reg-r2-adjustiert', 'wissen:nicht-signifikant-kein-beleg']
  },
  // ======== Regression, Block 2: Persönlichkeit - Konstante, Modelle, Beta, Größe ========
  {
    id: 'ab-rg-pe-konstante', thema: 'abschluss', fall: 'ab-pe1', zurueck: 'regression-tabelle-lesen',
    stamm: P(`In Tabelle 1b beträgt die Konstante ${zd('abB_b_const', 3)}. E und C reichen von ${zd('abB_min_e', 1)} bis ${zd('abB_max_e', 1)}. Wie ist die Konstante zu lesen?`,
      `In table 1b the constant is ${ze('abB_b_const', 3)}. E and C range from ${ze('abB_min_e', 1)} to ${ze('abB_max_e', 1)}. How is the constant to be read?`),
    antworten: [
      a(P('Als vorhergesagtes N bei E = 0 und C = 0. Da dort kein Wert liegt, ist sie ein rechnerischer Ausgangspunkt ohne eigene Aussage', 'As the predicted N at E = 0 and C = 0. Since no value lies there, it is a computational starting point without a meaning of its own'),
        P('Die Konstante gilt für den Punkt, an dem alle unabhängigen Größen null sind. Liegt er außerhalb der Skala, taugt sie nur zum Rechnen.', 'The constant applies to the point where all independent variables are zero. If it lies outside the scale it serves only for calculation.'), true),
      a(P(`Als durchschnittliches N aller befragten Personen (${zd('abB_b_const', 3)}), also als Wert, der für jede Person ungefähr gilt, egal wie hoch E und C sind`, `As the average N of all persons surveyed (${ze('abB_b_const', 3)}), that is a value that holds roughly for every person, however high E and C are`),
        P('Das durchschnittliche N wäre der Mittelwert von N. Die Konstante hängt von E und C ab.', 'The average N would be the mean of N. The constant depends on E and C.')),
      a(P(`Als Zunahme von N um ${zd('abB_b_const', 3)} Punkte je Skalenpunkt von E, wenn C gleich bleibt, also als starken Einfluss von E auf N`, `As the rise of N by ${ze('abB_b_const', 3)} points per scale point of E when C stays the same, that is a strong influence of E on N`),
        P('Die Zunahme je Skalenpunkt steht im B der jeweiligen Größe, nicht in der Konstanten.', 'The change per scale point is in the B of the respective variable, not in the constant.')),
      a(P(`Als Anteil der Streuung von N, der durch E und C gemeinsam erklärt wird, also als sehr hohe Erklärungskraft (${zd('abB_b_const', 3)})`, `As the share of the variation in N explained by E and C together, that is a very high explanatory power (${ze('abB_b_const', 3)})`),
        P(`Der erklärte Anteil steht bei R² (${zd('abB_r2', 3)}), und er kann nicht über 1 liegen.`, `The explained share is given by R² (${ze('abB_r2', 3)}), and it cannot exceed 1.`))
    ],
    hilfe: [...HR, 'koeffizient-b'], belege: ['wissen:reg-steigung-deutung-einheit', 'wissen:kohn-regression-interpretation', 'wissen:reg-spss-tabelle']
  },
  {
    id: 'ab-rg-pe-beta', thema: 'abschluss', fall: 'ab-pe1', zurueck: 'regression-tabelle-lesen',
    stamm: P(`Für C steht in Tabelle 1b ein Beta von ${zd('abB_beta_c', 3)}. Was bedeutet es?`, `For C table 1b shows a Beta of ${ze('abB_beta_c', 3)}. What does it mean?`),
    antworten: [
      a(P(`Steigt C um eine Standardabweichung, sinkt N im Mittel um ${za('abB_beta_c', 3)} Standardabweichungen, bei gleichem E`, `If C rises by one standard deviation, N falls by ${zae3('abB_beta_c')} standard deviations on average, at the same E`),
        P('Beta ist das B bei Größen in Standardabweichungen. Es hängt nicht von der Skala ab und lässt sich zwischen Größen und Studien vergleichen.', 'Beta is the B for variables in standard deviations. It does not depend on the scale and can be compared between variables and studies.'), true),
      a(P(`N sinkt im Mittel um ${za('abB_beta_c', 3)} Skalenpunkte, wenn C um einen Skalenpunkt steigt und E gleich bleibt`, `N falls by ${zae3('abB_beta_c')} scale points on average when C rises by one scale point and E stays the same`),
        P(`Das beschreibt das B (${zd('abB_b_c', 3)}), nicht das Beta.`, `That describes the B (${ze('abB_b_c', 3)}), not the Beta.`)),
      a(P(`C erklärt einen Anteil von ${za('abB_beta_c', 3)} der Streuung von N, unabhängig davon, was E zur Erklärung beiträgt`, `C explains a share of ${zae3('abB_beta_c')} of the variation in N, regardless of what E contributes to the explanation`),
        P('Der erklärte Anteil ist ein R² und ergibt sich aus dem Quadrat der Korrelation, nicht aus dem Beta selbst.', 'The explained share is an R² and follows from the square of the correlation, not from the Beta itself.')),
      a(P(`Die Korrelation zwischen C und N beträgt ${zd('abB_beta_c', 3)}, weil Beta bei zwei Größen der Korrelation entspricht`, `The correlation between C and N is ${ze('abB_beta_c', 3)} because with two variables Beta equals the correlation`),
        P(`Bei zwei Größen im Modell ist Beta keine Korrelation. Die Korrelation zwischen C und N steht in Modell 3: ${ze('abB2_beta_c', 3)}.`, `With two variables in the model Beta is no correlation. The correlation between C and N is in model 3: ${ze('abB2_beta_c', 3)}.`))
    ],
    hilfe: [...HR, 'beta'], belege: ['wissen:reg-beta-definition', 'wissen:kim-beta-stichprobenabhaengig', 'wissen:reg-spss-tabelle']
  },
  {
    id: 'ab-rg-pe-modelle', thema: 'abschluss', fall: 'ab-pe3', zurueck: 'regression-modelle-vergleichen',
    stamm: P('Modell 1 enthält E und C, Modell 2 nur E, Modell 3 nur C. Was tun Sie aufgrund des Vergleichs mit E und mit C? Denken Sie an Signifikanz und R².',
      'Model 1 contains E and C, model 2 only E, model 3 only C. What do you do with E and with C on the basis of the comparison? Think of significance and R².'),
    antworten: [
      a(P(`Beide behalten: In Modell 1 sind beide signifikant (Sig. unter 0,001), und R² fällt ohne E auf ${zd('abB2_r2', 3)}, ohne C auf ${zd('abB1_r2', 3)}, gegenüber ${zd('abB_r2', 3)}`, `Keep both: in model 1 both are significant (Sig. below 0.001), and R² falls without E to ${ze('abB2_r2', 3)}, without C to ${ze('abB1_r2', 3)}, against ${ze('abB_r2', 3)}`),
        P('Jede der beiden Größen ist signifikant und trägt zum R² bei, das ohne sie kleiner wird. Beide bringen also etwas dazu.', 'Each of the two variables is significant and adds to R², which becomes smaller without it. So both add something.'), true),
      a(P(`E weglassen: Modell 3 mit nur C erreicht fast dasselbe R² (${zd('abB2_r2', 3)}) wie Modell 1; E bringt kaum etwas Zusätzliches, und ein einfacheres Modell ist dann vorzuziehen`, `Drop E: model 3 with only C reaches almost the same R² (${ze('abB2_r2', 3)}) as model 1; E adds hardly anything, and a simpler model is then to be preferred`),
        P(`Das R² fällt von ${zd('abB_r2', 3)} auf ${zd('abB2_r2', 3)}, und E ist in Modell 1 hoch signifikant. Dann gehört E ins Modell.`, `R² falls from ${ze('abB_r2', 3)} to ${ze('abB2_r2', 3)}, and E is highly significant in model 1. Then E belongs in the model.`)),
      a(P(`C weglassen, weil sein B negativ ist (${zd('abB_b_c', 3)}): ein negativer Zusammenhang verschlechtert die Vorhersage von N`, `Drop C because its B is negative (${ze('abB_b_c', 3)}): a negative relation worsens the prediction of N`),
        P('Das Vorzeichen zeigt die Richtung, nicht den Wert einer Größe fürs Modell.', 'The sign shows the direction, not the value of a variable for the model.')),
      a(P(`Nur Modell 2 (R² ${zd('abB1_r2', 3)}) oder Modell 3 (R² ${zd('abB2_r2', 3)}) verwenden, weil Modelle mit zwei Größen zu kompliziert und für die Vorhersage nicht nötig sind`, `Use only model 2 (R² ${ze('abB1_r2', 3)}) or model 3 (R² ${ze('abB2_r2', 3)}) because models with two variables are too complicated and not needed for the prediction`),
        P('Die Zahl der Größen entscheidet nicht. Zählt, ob jede Größe signifikant ist und R² erhöht.', 'The number of variables does not decide. What counts is whether each variable is significant and raises R².'))
    ],
    hilfe: [...HR, 'r-quadrat', 'signifikanz'], belege: ['wissen:reg-modellvergleich', 'wissen:reg-r2-adjustiert', 'wissen:reg-partielle-koeffizienten']
  },
  {
    id: 'ab-rg-pe-groesse', thema: 'abschluss', fall: 'ab-pe1', zurueck: 'regression-effekte-einordnen',
    stamm: P(`Angenommen, ein R² ab ${zd('ef_r2_klein')} gilt als klein, ab ${zd('ef_r2_mittel')} als mittel und ab ${zd('ef_r2_gross')} als groß. In Tabelle 1a ist R² = ${zd('abB_r2', 3)}, bei ${zn('abB_n')} Personen. Welche Schlussfolgerung passt?`,
      `Assume an R² from ${ze('ef_r2_klein')} counts as small, from ${ze('ef_r2_mittel')} as medium and from ${ze('ef_r2_gross')} as large. In table 1a R² = ${ze('abB_r2', 3)}, with ${zn('abB_n')} persons. Which conclusion fits?`),
    antworten: [
      a(P(`Der Zusammenhang ist verlässlich, aber klein bis mittel: ${zd('abB_r2', 3)} liegt knapp unter ${zd('ef_r2_mittel')}. Bei so vielen Personen wird schon ein kleiner Effekt signifikant`, `The relation is reliable but small to medium: ${ze('abB_r2', 3)} lies just below ${ze('ef_r2_mittel')}. With so many persons even a small effect becomes significant`),
        P('Signifikanz sagt, wie sicher ein Zusammenhang ist; die Größe zeigt das R². Beides ist getrennt zu beurteilen.', 'Significance tells how certain a relation is; the size is shown by R². Both are to be judged separately.'), true),
      a(P(`Der Effekt ist groß, weil die Sig. unter 0,001 liegt: Ein so kleiner Wert zeigt bei R² ${zd('abB_r2', 3)} einen sehr deutlichen Zusammenhang`, `The effect is large because Sig. is below 0.001: so small a value shows a very clear relation at R² ${ze('abB_r2', 3)}`),
        P('Eine kleine Sig. nennt keine Größe. Bei vielen Personen sind schon kleine Effekte signifikant.', 'A small Sig. gives no size. With many persons even small effects are significant.')),
      a(P(`Der Effekt ist groß, weil ${zn('abB_n')} Personen befragt wurden: Je mehr Personen, desto größer fällt der Zusammenhang aus`, `The effect is large because ${zn('abB_n')} persons were surveyed: the more persons, the larger the relation turns out`),
        P('Die Zahl der Personen macht das Ergebnis genauer, nicht den Effekt größer.', 'The number of persons makes the result more precise, not the effect larger.')),
      a(P('Der Effekt ist null, weil R² unter 0,25 liegt: Erst ab dieser Höhe gibt es überhaupt einen Zusammenhang', 'The effect is zero because R² is below 0.25: only from this size is there any relation at all'),
        P(`Ab ${zd('ef_r2_klein')} gilt ein R² als klein. Er ist klein, aber nicht null.`, `From ${ze('ef_r2_klein')} an R² counts as small. It is small but not zero.`))
    ],
    hilfe: [...HR, 'r-quadrat', 'effektstaerke'], belege: ['wissen:effekt-cohen-richtwerte', 'wissen:signifikant-nicht-bedeutsam', 'wissen:wasserstein16-p-praezision-effekt']
  },
  // ======== Regression, Block 3: zwei Studien mit denselben Größen ========
  {
    id: 'ab-rg-hs-vis', thema: 'abschluss', fall: 'ab-hs', zurueck: 'regression-tabelle-lesen',
    stamm: P(`In Studie 1 hat vis in Tabelle 1b ein B von ${zd('abH1_b_vis', 3)} und ein Sig. von ${zd('abH1_p_vis', 3)}. Was sagen die beiden Werte?`,
      `In study 1 vis has in table 1b a B of ${ze('abH1_b_vis', 3)} and a Sig. of ${ze('abH1_p_vis', 3)}. What do the two values say?`),
    antworten: [
      a(P(`Mit einem Punkt mehr bei vis liegt spd im Mittel ${zd('abH1_b_vis', 3)} Punkte höher, bei gleichem tex. Sig. über ${zd('regel_sig')}: In dieser Gruppe nicht signifikant`, `With one point more in vis, spd is ${ze('abH1_b_vis', 3)} points higher on average, at the same tex. Sig. above ${ze('regel_sig')}: not significant in this group`),
        P('B beschreibt den Zusammenhang in der Stichprobe, Sig. prüft, ob er sich vom Zufall abhebt. Hier hebt er sich nicht ab.', 'B describes the relation in the sample, Sig. tests whether it stands out from chance. Here it does not stand out.'), true),
      a(P(`vis hat keinen Einfluss auf spd, weil das Sig. über ${zd('regel_sig')} liegt: Der Zusammenhang ist damit widerlegt`, `vis has no influence on spd because Sig. is above ${ze('regel_sig')}: the relation is thereby refuted`),
        P('Nicht signifikant heißt: Die Daten reichen nicht, um den Zusammenhang vom Zufall zu unterscheiden. Es beweist nicht, dass er null ist.', 'Not significant means the data do not suffice to tell the relation from chance. It does not prove that it is zero.')),
      a(P(`Mit einem Punkt mehr bei vis liegt spd im Mittel ${zd('abH1_p_vis', 3)} Punkte höher, bei gleichem tex; das ist das B von vis`, `With one point more in vis, spd is ${ze('abH1_p_vis', 3)} points higher on average, at the same tex; that is the B of vis`),
        P('Der Wert in der Spalte Sig. ist eine Wahrscheinlichkeit, keine Änderung von spd. Die Änderung steht im B.', 'The value in the Sig. column is a probability, not a change in spd. The change is in B.')),
      a(P(`Die Wahrscheinlichkeit, dass vis spd beeinflusst, beträgt ${zd('abH1_p_vis', 3)}; mit ${zp('abH1_p_vis')} Prozent ist der Einfluss eher unwahrscheinlich`, `The probability that vis influences spd is ${ze('abH1_p_vis', 3)}; at ${zp('abH1_p_vis')} percent the influence is rather unlikely`),
        P('Sig. ist die Wahrscheinlichkeit solcher Daten, wenn der Zusammenhang null wäre. Eine Wahrscheinlichkeit für einen Einfluss ist es nicht.', 'Sig. is the probability of such data if the relation were zero. It is no probability of an influence.'))
    ],
    hilfe: [...HR, 'koeffizient-b', 'signifikanz'], belege: ['wissen:reg-t-test-steigung', 'wissen:nicht-signifikant-kein-beleg', 'wissen:reg-spss-tabelle']
  },
  {
    id: 'ab-rg-hs-wert', thema: 'abschluss', fall: 'ab-hs', zurueck: 'regression-studien-vergleichen',
    stamm: P('Welchen Wert aus den Tabellen verwenden Sie, um den Einfluss von vis auf spd in Studie 1 und Studie 2 miteinander zu vergleichen?',
      'Which value from the tables do you use to compare the influence of vis on spd in study 1 and study 2?'),
    antworten: [
      a(P(`Das Beta: ${zd('abH1_beta_vis', 3)} in Studie 1 und ${zd('abH2_beta_vis', 3)} in Studie 2`, `The Beta: ${ze('abH1_beta_vis', 3)} in study 1 and ${ze('abH2_beta_vis', 3)} in study 2`),
        P(`Beta ist standardisiert, also vom Maß unabhängig. In Studie 1 ist spd ein Mittelwert, in Studie 2 eine Summe (Standardabweichung ${ze('abH1_sd_spd', 2)} gegenüber ${ze('abH2_sd_spd', 2)} in Tabelle 3); darauf reagiert das B.`, `Beta is standardised, hence independent of the measure. In study 1 spd is a mean, in study 2 a sum (standard deviation ${ze('abH1_sd_spd', 2)} against ${ze('abH2_sd_spd', 2)} in table 3); B reacts to that.`), true),
      a(P(`Das B: ${zd('abH1_b_vis', 3)} in Studie 1 und ${zd('abH2_b_vis', 3)} in Studie 2`, `The B: ${ze('abH1_b_vis', 3)} in study 1 and ${ze('abH2_b_vis', 3)} in study 2`),
        P('B hängt vom Maß der abhängigen Größe ab. Studie 2 summiert die drei Tests, Studie 1 mittelt sie; darum ist B dort etwa dreimal so groß und passt nur innerhalb einer Studie zum Vergleich.', 'B depends on the measure of the dependent variable. Study 2 adds the three tests, study 1 averages them; so B is about three times as large there and suits comparison only within one study.')),
      a(P(`Das Sig.: ${zd('abH1_p_vis', 3)} in Studie 1 und ${zd('abH2_p_vis', 3)} in Studie 2`, `The Sig.: ${ze('abH1_p_vis', 3)} in study 1 and ${ze('abH2_p_vis', 3)} in study 2`),
        P('Sig. sagt, wie sicher ein Zusammenhang ist, nicht wie stark. Zudem hängt es von der Zahl der Personen ab.', 'Sig. says how certain a relation is, not how strong. It also depends on the number of persons.')),
      a(P(`Das R²: ${zd('abH1_r2', 3)} in Studie 1 und ${zd('abH2_r2', 3)} in Studie 2`, `The R²: ${ze('abH1_r2', 3)} in study 1 and ${ze('abH2_r2', 3)} in study 2`),
        P('R² gilt für das ganze Modell mit vis und tex. Der Einfluss von vis allein steht im Beta.', 'R² applies to the whole model with vis and tex. The influence of vis alone is in the Beta.')),
      a(P(`Den Standardfehler: ${zd('abH1_se_vis', 3)} in Studie 1 und ${zd('abH2_se_vis', 3)} in Studie 2`, `The standard error: ${ze('abH1_se_vis', 3)} in study 1 and ${ze('abH2_se_vis', 3)} in study 2`),
        P('Der Standardfehler zeigt die Genauigkeit von B, nicht die Stärke des Einflusses.', 'The standard error shows the precision of B, not the strength of the influence.'))
    ],
    hilfe: [...HR, 'beta'], belege: ['wissen:kim-beta-stichprobenabhaengig', 'wissen:reg-beta-definition', 'wissen:kim-skalen-vergleichbarkeit']
  },
  {
    id: 'ab-rg-hs-schluss', thema: 'abschluss', fall: 'ab-hs', zurueck: 'regression-studien-vergleichen',
    stamm: P('Welche Schlussfolgerung aus dem Vergleich der beiden Studien für vis passt am besten zu den Tabellen?',
      'Which conclusion from the comparison of the two studies fits the tables best for vis?'),
    antworten: [
      a(P(`In Studie 2 ist der Einfluss von vis auf spd größer (Beta ${zd('abH2_beta_vis', 3)} gegenüber ${zd('abH1_beta_vis', 3)}) und signifikant, in Studie 1 klein und nicht signifikant`, `In study 2 the influence of vis on spd is larger (Beta ${ze('abH2_beta_vis', 3)} against ${ze('abH1_beta_vis', 3)}) and significant, in study 1 small and not significant`),
        P('Beide Betas haben dasselbe Vorzeichen; Studie 2 zeigt den stärkeren Einfluss. Ob der Unterschied selbst überzufällig ist, sagen die Tabellen nicht.', 'Both Betas have the same sign; study 2 shows the stronger influence. Whether the difference itself is beyond chance the tables do not say.'), true),
      a(P(`Die Studien widersprechen sich, denn in der einen ist der Einfluss positiv (B ${zd('abH2_b_vis', 3)}), in der anderen null (B ${zd('abH1_b_vis', 3)}), sodass sich kein gemeinsames Bild ergibt`, `The studies contradict each other since the influence is positive in one (B ${ze('abH2_b_vis', 3)}) and zero in the other (B ${ze('abH1_b_vis', 3)}), so no common picture emerges`),
        P('Beide B und Beta sind positiv. Nicht signifikant heißt nicht null; es ist ein Unterschied in der Sicherheit.', 'B and Beta are both positive. Not significant does not mean zero; it is a difference in certainty.')),
      a(P(`Der Einfluss ist in Studie 1 größer, weil dort mehr Kinder untersucht wurden (${zn('abH1_n')} gegenüber ${zn('abH2_n')}) und mehr Kinder den Einfluss verstärken`, `The influence is larger in study 1 because more children were studied there (${zn('abH1_n')} against ${zn('abH2_n')}) and more children strengthen the influence`),
        P('Die Zahl der Kinder bestimmt die Genauigkeit, nicht die Größe des Einflusses.', 'The number of children determines the precision, not the size of the influence.')),
      a(P(`Der Einfluss ist in beiden Studien gleich groß, weil das B in beiden Studien positiv ist (${zd('abH1_b_vis', 3)} und ${zd('abH2_b_vis', 3)}) und die Studien damit übereinstimmen und sich gegenseitig bestätigen`, `The influence is equally large in both studies because B is positive in both (${ze('abH1_b_vis', 3)} and ${ze('abH2_b_vis', 3)}) and the studies therefore agree and confirm each other`),
        P(`Das Vorzeichen sagt nichts über die Größe. Die Betas ${zd('abH1_beta_vis', 3)} und ${zd('abH2_beta_vis', 3)} unterscheiden sich deutlich.`, `The sign says nothing about the size. The Betas ${ze('abH1_beta_vis', 3)} and ${ze('abH2_beta_vis', 3)} differ clearly.`))
    ],
    hilfe: [...HR, 'beta', 'signifikanz'], belege: ['wissen:greenland16-p-vergleich-studien', 'wissen:kim-beta-stichprobenabhaengig', 'wissen:nicht-signifikant-kein-beleg']
  },
  {
    id: 'ab-rg-hs-skala', thema: 'abschluss', fall: 'ab-hs', zurueck: 'regression-studien-vergleichen', mehrfach: true,
    stamm: P('Angenommen, in Studie 2 wäre spd wie in Studie 1 als Mittelwert der drei Tests gebildet worden, vis und tex blieben unverändert. Welche Aussagen über die neue Tabelle 2b stimmen? Mehrere können stimmen.',
      'Suppose that in study 2 spd had been formed as the mean of the three tests, as in study 1, vis and tex unchanged. Which statements about the new table 2b are correct? Several can be correct.'),
    antworten: [
      a(P(`Das B von vis wäre ${zd('abH2m_b_vis', 3)} statt ${zd('abH2_b_vis', 3)}`, `The B of vis would be ${ze('abH2m_b_vis', 3)} instead of ${ze('abH2_b_vis', 3)}`),
        P('Die Summe der drei Tests ist das Dreifache ihres Mittelwerts, und B steht in der Einheit der abhängigen Größe. Dass der neue Wert dem Beta gleicht, ist Zufall.', 'The sum of the three tests is three times their mean, and B is in the unit of the dependent variable. That the new value equals the Beta is a coincidence.'), true),
      a(P(`Das Beta von vis bliebe ${zd('abH2m_beta_vis', 3)}`, `The Beta of vis would stay ${ze('abH2m_beta_vis', 3)}`),
        P('Beta ist in Standardabweichungen gerechnet und wird vom Maß nicht berührt.', 'Beta is calculated in standard deviations and is not touched by the measure.'), true),
      a(P('Das R² wäre nur noch ein Drittel so groß', 'R² would only be a third as large'),
        P(`R² ist ein Anteil der Streuung und bleibt ${zd('abH2_r2', 3)}.`, `R² is a share of the variation and stays ${ze('abH2_r2', 3)}.`)),
      a(P('Das Sig. von vis würde größer, weil die Werte kleiner sind', 'The Sig. of vis would become larger because the values are smaller'),
        P(`Auch t und Sig. blieben gleich (${zd('abH2_p_vis', 3)}), denn Zähler und Standardfehler ändern sich im gleichen Verhältnis.`, `t and Sig. would also stay the same (${ze('abH2_p_vis', 3)}) since numerator and standard error change in the same ratio.`))
    ],
    hilfe: [...HR, 'beta', 'koeffizient-b'], belege: ['wissen:reg-beta-definition', 'wissen:reg-steigung-deutung-einheit', 'wissen:kim-skalen-vergleichbarkeit']
  },
  // ======== Fragebogen: sechs Fragen, zwei Konstrukte ========
  {
    id: 'ab-fb-inhalt', thema: 'abschluss', fall: 'ab-fa1', zurueck: 'inhalt-und-zahlen',
    stamm: P('Welche Zuordnung der sechs Fragen zu Anteilnahme und Geselligkeit ist allein nach dem Wortlaut in Tabelle 1 am besten begründet?',
      'Which assignment of the six questions to concern for others and sociability is best justified by the wording in table 1 alone?'),
    antworten: [
      a(P('F2, F3 und F5 gehören zur Anteilnahme, F1 und F6 zur Geselligkeit; bei F4 (Führung übernehmen) sagt der Wortlaut dazu nichts, das klärt erst die Faktorenanalyse', 'F2, F3 and F5 belong to concern for others, F1 and F6 to sociability; for F4 (taking charge) the wording says nothing, only the factor analysis settles it'),
        P('F2 (gleichgültig gegenüber Gefühlen, gegenläufig), F3 (trösten) und F5 (nach dem Wohlbefinden fragen) meinen Anteilnahme; F1 (Freundschaften) und F6 (Menschen in den Bann ziehen) meinen Kontakt. Führung ist ein anderer Inhalt.', 'F2 (indifferent to feelings, reversed), F3 (comforting) and F5 (asking about well-being) mean concern; F1 (friendships) and F6 (captivating people) mean contact. Leadership is a different content.'), true),
      a(P('F1, F3 und F6 gehören zur Anteilnahme, F2, F4 und F5 zur Geselligkeit, denn Freundschaften und Trösten betreffen beide den Umgang mit nahestehenden Menschen, und F4 gehört zu keinem der Konstrukte', 'F1, F3 and F6 belong to concern for others, F2, F4 and F5 to sociability, since friendships and comforting both concern dealing with close people, and F4 belongs to neither construct'),
        P('Das vertauscht die Inhalte: Freundschaften schließen und Menschen in den Bann ziehen betreffen Kontakt; trösten und nach dem Wohlbefinden fragen betreffen Anteilnahme.', 'This mixes up the contents: making friends and captivating people concern contact; comforting and asking about well-being concern concern for others.')),
      a(P('F2 gehört zu keinem Konstrukt, weil es negativ formuliert ist; die übrigen fünf Fragen verteilen sich auf die beiden Konstrukte', 'F2 belongs to no construct because it is worded negatively; the other five questions are spread over the two constructs'),
        P('Eine gegenläufige Formulierung ändert nicht, was gemessen wird: F2 misst Anteilnahme, nur umgekehrt.', 'A reversed wording does not change what is measured: F2 measures concern, only the other way round.')),
      a(P('F4 gehört eindeutig zur Geselligkeit, weil man für Führung andere Menschen braucht; F2, F3 und F5 gehören zur Anteilnahme, F1 und F6 zur Geselligkeit', 'F4 clearly belongs to sociability because you need people for it; F2, F3 and F5 belong to concern for others, F1 and F6 also to sociability'),
        P('Das lässt sich aus dem Wortlaut nicht sicher sagen. Führen ist keine Frage nach Kontakt oder Freundschaft; das klärt erst die Faktorenanalyse.', 'That cannot be said for certain from the wording. Leading is no question about contact or friendship; the factor analysis settles it.')),
      a(P('Alle sechs gehören zu beiden Konstrukten, weil sie alle mit Menschen zu tun haben, und beide Konstrukte lassen sich deshalb nicht trennen', 'All six belong to both constructs because they all have to do with people, and the two constructs therefore cannot be separated'),
        P('Dann würde nichts mehr unterschieden. Die beiden Konstrukte meinen Verschiedenes, und die Fragen lassen sich überwiegend einem zuordnen.', 'Then nothing would be distinguished any more. The two constructs mean different things, and the questions can mostly be assigned to one.'))
    ],
    hilfe: [...HF, 'konstrukt', 'item'], belege: ['wissen:fa-negative-ladung', 'wissen:umpolen-verfahren', 'Hilfe:konstrukt']
  },
  {
    id: 'ab-fb-zuordnung', thema: 'abschluss', fall: 'ab-fa2', zurueck: 'faktor-ladungen-lesen',
    stamm: P(`Angenommen, eine Frage gehört zu einer Komponente, wenn der Betrag ihrer Ladung ${zd('regel_ladung')} übersteigt. Welche Zuordnung nach Tabelle 2 stimmt?`,
      `Assume a question belongs to a component if the absolute size of its loading exceeds ${ze('regel_ladung')}. Which assignment according to table 2 is correct?`),
    antworten: [
      a(P('Komponente 1: F6, F1, F4 und F3. Komponente 2: F2, F5 und F3. F3 gehört zu beiden', 'Component 1: F6, F1, F4 and F3. Component 2: F2, F5 and F3. F3 belongs to both'),
        P(`F3 lädt ${zd('abF_l_f3_1', 2)} und ${zd('abF_l_f3_2', 2)}, beides über ${zd('regel_ladung')}. F5 lädt mit ${zd('abF_l_f5_1', 2)} auf Komponente 1 noch nicht über die Grenze.`, `F3 loads ${ze('abF_l_f3_1', 2)} and ${ze('abF_l_f3_2', 2)}, both above ${ze('regel_ladung')}. F5 with ${ze('abF_l_f5_1', 2)} on component 1 does not yet exceed the limit.`), true),
      a(P('Komponente 1: F6, F1 und F4. Komponente 2: F5 und F3. F2 gehört zu keiner, weil seine Ladung negativ ist', 'Component 1: F6, F1 and F4. Component 2: F5 and F3. F2 belongs to neither because its loading is negative'),
        P(`Es zählt der Betrag. Mit ${zd('abF_l_f2_2', 2)} gehört F2 klar zu Komponente 2. F3 gehört auch zu Komponente 1.`, `The absolute size counts. With ${ze('abF_l_f2_2', 2)} F2 clearly belongs to component 2. F3 also belongs to component 1.`)),
      a(P(`Komponente 1: F6, F1, F4 und F5 (${zd('abF_l_f5_1', 2)}). Komponente 2: F2 und F3, und F3 gehört nur dorthin`, `Component 1: F6, F1, F4 and F5 (${ze('abF_l_f5_1', 2)}). Component 2: F2 and F3, and F3 belongs only there`),
        P(`F5 lädt mit ${zd('abF_l_f5_1', 2)} auf Komponente 1 und damit unter ${zd('regel_ladung')}. Sie gehört nur zu Komponente 2 (${zd('abF_l_f5_2', 2)}).`, `F5 loads ${ze('abF_l_f5_1', 2)} on component 1 and so below ${ze('regel_ladung')}. It belongs only to component 2 (${ze('abF_l_f5_2', 2)}).`)),
      a(P('Komponente 1: F6, F1 und F4. Komponente 2: F2, F5 und F3. Keine Frage gehört zu beiden', 'Component 1: F6, F1 and F4. Component 2: F2, F5 and F3. No question belongs to both'),
        P(`F3 hat auf beiden Komponenten eine Ladung über ${zd('regel_ladung')} und gehört deshalb zu beiden.`, `F3 has a loading above ${ze('regel_ladung')} on both components and therefore belongs to both.`))
    ],
    hilfe: [...HF, 'ladung'], belege: ['wissen:fa-ladung-definition', 'wissen:fa-negative-ladung', 'wissen:clark-ladungsgrenzen-itemauswahl']
  },
  {
    id: 'ab-fb-leer', thema: 'abschluss', fall: 'ab-fa2', zurueck: 'faktor-ladungen-lesen',
    stamm: P(`In Tabelle 2 sind bei F1 die Ladung auf Komponente 2 und bei F2 die Ladung auf Komponente 1 leer. Was heißt das?`,
      `In table 2 the loading on component 2 is empty for F1 and the loading on component 1 for F2. What does it mean?`),
    antworten: [
      a(P(`Die Ladungen liegen im Betrag unter ${zd('regel_ladung_aus')} und werden nicht gezeigt; die Fragen hängen mit dieser Komponente praktisch nicht zusammen`, `The loadings are below ${ze('regel_ladung_aus')} in absolute size and are not shown; the questions are practically unrelated to this component`),
        P('Ausgeblendet werden kleine Ladungen, damit das Muster lesbar bleibt. Sie sind nicht fehlend, sondern klein.', 'Small loadings are hidden so that the pattern stays readable. They are not missing but small.'), true),
      a(P(`Die Werte fehlen, weil die Rechnung für diese Fragen nicht gelang oder bei ${zn('abF_n')} Personen zu wenige Antworten vorlagen`, `The values are missing because the calculation failed for these questions or too few answers were available for ${zn('abF_n')} persons`),
        P(`Leere Zellen stehen für Ladungen unter ${zd('regel_ladung_aus')}, nicht für einen Fehler.`, `Empty cells stand for loadings below ${ze('regel_ladung_aus')}, not for an error.`)),
      a(P(`Die Ladung ist genau null (${zd('regel_ladung_aus')} wäre die Grenze), die Fragen haben also nichts miteinander und mit der anderen Komponente zu tun`, `The loading is exactly zero (${ze('regel_ladung_aus')} would be the limit), so the questions have nothing to do with each other and with the other component`),
        P('Gezeigt wird nichts, was unter der Grenze liegt; der Wert kann klein, aber von null verschieden sein.', 'Nothing below the limit is shown; the value can be small but different from zero.')),
      a(P(`Die Fragen gehören zu keiner Komponente, weil in ihrer Zeile eine Zelle leer geblieben ist und ${zd('regel_ladung')} nicht erreicht wurde`, `The questions belong to no component because a cell has stayed empty in their row and ${ze('regel_ladung')} was not reached`),
        P('Leer ist nur eine Zelle. F1 hat eine Ladung auf Komponente 1, F2 auf Komponente 2.', 'Only one cell is empty. F1 has a loading on component 1, F2 on component 2.'))
    ],
    hilfe: [...HF, 'ladung'], belege: ['wissen:fa-ladung-definition', 'wissen:clark-ladungsgrenzen-itemauswahl', 'wissen:fa-mehrfachladungen']
  },
  {
    id: 'ab-fb-negativ', thema: 'abschluss', fall: 'ab-fa2', zurueck: 'faktor-gegenlaeufig-umpolen',
    stamm: P(`F2 hat auf Komponente 2 eine Ladung von ${zd('abF_l_f2_2', 2)}, F5 und F3 haben positive. Was folgt für die Anteilnahme-Skala?`,
      `F2 has a loading of ${ze('abF_l_f2_2', 2)} on component 2, F5 and F3 have positive ones. What follows for the scale for concern for others?`),
    antworten: [
      a(P('F2 gehört zur Skala, ist aber gegenläufig formuliert: Vor dem Zusammenfassen mit F5 und F3 muss man F2 umpolen', 'F2 belongs to the scale but is worded in the opposite direction: before combining it with F5 and F3 it has to be reverse-coded'),
        P('Das Minuszeichen zeigt, dass hohe Zustimmung zu F2 mit niedriger Anteilnahme einhergeht. Nach dem Umpolen zeigen alle Fragen in dieselbe Richtung.', 'The minus sign shows that high agreement with F2 goes with low concern. After reverse-coding all questions point in the same direction.'), true),
      a(P(`F2 gehört nicht zur Skala, denn eine negative Ladung (${zd('abF_l_f2_2', 2)}) heißt: kein Zusammenhang mit den übrigen Fragen der Skala`, `F2 does not belong to the scale because a negative loading (${ze('abF_l_f2_2', 2)}) means: no relation with the other questions of the scale`),
        P(`Ein Betrag von ${zd('abF_l_f2_2', 2).replace('-', '')} ist eine starke Ladung. Das Minus zeigt nur die Richtung.`, `A size of ${ze('abF_l_f2_2', 2).replace('-', '')} is a strong loading. The minus only shows the direction.`)),
      a(P('F5 und F3 müssen umgepolt werden, weil sie positiv laden; F2 bleibt, wie es ist, weil es negativ lädt, und danach passt die Skala', 'F5 and F3 must be reverse-coded because they load positively; F2 stays as it is because it loads negatively, and then the scale fits'),
        P('Umgepolt wird die Frage mit der abweichenden Richtung, hier F2.', 'The question with the deviating direction is reverse-coded, here F2.')),
      a(P(`Die Skala ist unbrauchbar, weil eine Ladung negativ ist (${zd('abF_l_f2_2', 2)}) und die Fragen damit nicht dasselbe messen`, `The scale is useless because one loading is negative (${ze('abF_l_f2_2', 2)}) and the questions therefore do not measure the same thing`),
        P('Gegenläufige Fragen kommen bei Fragebögen vor und werden durch Umpolen behandelt.', 'Reversed questions occur in questionnaires and are handled by reverse-coding.'))
    ],
    hilfe: [...HF, 'umpolen', 'ladung'], belege: ['wissen:fa-negative-ladung', 'wissen:umpolen-verfahren', 'wissen:negative-trennschaerfe-ursache']
  },
  {
    id: 'ab-fb-erkennen', thema: 'abschluss', fall: 'ab-fa3', zurueck: 'skala-trennschaerfe-umpolen',
    stamm: P('Was tun Sie aufgrund von Tabelle 3 mit den drei Fragen, wenn Sie die Skala für Anteilnahme bauen? Denken Sie an die Item-Skala-Korrelation und an Cronbachs Alpha.',
      'What do you do with the three questions on the basis of table 3 when building the scale for concern for others? Think of the item-total correlation and Cronbach\'s alpha.'),
    antworten: [
      a(P(`F2 umpolen und die Analyse wiederholen: Seine korrigierte Item-Skala-Korrelation ist negativ (${zd('abF_r0_f2', 3)}), Alpha ist negativ (${zd('abF_a0', 3)}). F5 und F3 erst danach beurteilen`, `Reverse-code F2 and repeat the analysis: its corrected item-total correlation is negative (${ze('abF_r0_f2', 3)}), alpha is negative (${ze('abF_a0', 3)}). Judge F5 and F3 only afterwards`),
        P('Eine negative Korrelation mit dem Rest der Skala und ein negatives Alpha zeigen eine gegenläufige Frage. Die kleinen Korrelationen von F5 und F3 kommen von F2.', 'A negative correlation with the rest of the scale and a negative alpha point to a reversed question. The small correlations of F5 and F3 come from F2.'), true),
      a(P(`F2 löschen, weil seine Korrelation negativ ist, und mit F5 und F3 weitermachen, denn eine Frage mit negativer Korrelation misst nicht mit und stört die Auswertung der Skala`, `Delete F2 because its correlation is negative and carry on with F5 and F3, since a question with a negative correlation does not measure along and disturbs the evaluation of the scale`),
        P('Eine negative Korrelation bei einer gegenläufigen Frage ist ein Umpol-Hinweis, kein Grund zum Löschen. Die Frage misst ja Anteilnahme.', 'A negative correlation for a reversed question is a hint to reverse-code, not a reason to delete. The question does measure concern.')),
      a(P(`F5 und F3 löschen, weil ihre Korrelationen nahe null sind (${zd('abF_r0_f5', 3)} und ${zd('abF_r0_f3', 3)}), denn Fragen ohne Zusammenhang zur Skala schaden ihr`, `Delete F5 and F3 because their correlations are close to zero (${ze('abF_r0_f5', 3)} and ${ze('abF_r0_f3', 3)}), since questions unrelated to the scale harm it`),
        P('Die Korrelationen sind nur so niedrig, weil F2 in die andere Richtung zeigt und in der Summe stört.', 'The correlations are only so low because F2 points the other way and disturbs in the sum.')),
      a(P(`Alle drei behalten und Alpha (${zd('abF_a0', 3)}) ignorieren, weil ein negatives Alpha ein Rechenfehler ist, denn Alpha kann nicht negativ sein`, `Keep all three and ignore alpha (${ze('abF_a0', 3)}) because a negative alpha is a calculation error, since alpha cannot be negative`),
        P('Ein negatives Alpha kann vorkommen, nämlich wenn Fragen in entgegengesetzte Richtungen zeigen. Es ist ein Warnzeichen, kein Fehler.', 'A negative alpha can occur, namely when questions point in opposite directions. It is a warning sign, not an error.')),
      a(P(`Die ganze Skala verwerfen, weil Alpha negativ ist (${zd('abF_a0', 3)}) und die drei Fragen damit offenbar nicht zusammengehören`, `Discard the whole scale because alpha is negative (${ze('abF_a0', 3)}) and the three questions evidently do not belong together`),
        P('Ursache ist eine einzige ungedrehte Frage. Nach dem Umpolen wird neu geprüft.', 'The cause is a single unturned question. After reverse-coding the check is repeated.'))
    ],
    hilfe: [...HF, 'trennschaerfe', 'umpolen', 'reliabilitaet'], belege: ['wissen:negative-trennschaerfe-ursache', 'wissen:alpha-negativ-moeglich', 'wissen:umpolen-verfahren']
  },
  {
    id: 'ab-fb-alpha', thema: 'abschluss', fall: 'ab-fa4', zurueck: 'skala-alpha-grenzen',
    stamm: P(`Angenommen, ein Alpha ab ${zd('regel_alpha')} gilt als ausreichend. Misst die Skala aus F5, F2 und F3 (F2 umgepolt) das Konstrukt in Tabelle 4a gut genug?`,
      `Assume an alpha from ${ze('regel_alpha')} counts as sufficient. Does the scale of F5, F2 and F3 (F2 reverse-coded) in table 4a measure the construct well enough?`),
    antworten: [
      a(P(`Noch kaum: Cronbachs Alpha liegt mit ${zd('abF_a1', 3)} unter ${zd('regel_alpha')}. Mit drei Fragen ist die Skala zu kurz oder zu uneinheitlich`, `Not yet: Cronbach's alpha with ${ze('abF_a1', 3)} is below ${ze('regel_alpha')}. With three questions the scale is too short or too heterogeneous`),
        P('Der Wert verfehlt die Grenze. Bei wenigen Items hilft es meist, weitere Fragen zum selben Konstrukt zu ergänzen.', 'The value misses the limit. With few items it usually helps to add further questions on the same construct.'), true),
      a(P(`Ja: Alpha ist mit ${zd('abF_a1', 3)} positiv, und mehr verlangt die Regel nicht, denn jedes positive Alpha zeigt eine zuverlässige Skala`, `Yes: alpha at ${ze('abF_a1', 3)} is positive, and the rule demands no more, since any positive alpha shows a reliable scale`),
        P(`Die Regel verlangt mindestens ${zd('regel_alpha')}. Ein positives Alpha allein genügt nicht.`, `The rule demands at least ${ze('regel_alpha')}. A positive alpha alone does not suffice.`)),
      a(P(`Ja: Alpha liegt mit ${zd('abF_a1', 3)} höher als in Tabelle 3a, und das reicht, weil das Umpolen die Skala verbessert hat`, `Yes: alpha at ${ze('abF_a1', 3)} is higher than in table 3a, and that suffices because reverse-coding has improved the scale`),
        P(`Besser als vorher ist nicht genug. Maßgeblich bleibt die Grenze ${zd('regel_alpha')}.`, `Better than before is not enough. The limit ${ze('regel_alpha')} remains decisive.`)),
      a(P('Nein, weil Alpha nur für Skalen mit mehr als zehn Fragen berechnet werden darf, daher ist die Skala schon deshalb ungeeignet', 'No, because alpha may only be calculated for scales with more than ten questions, so the scale is unsuitable for that reason alone'),
        P('Alpha lässt sich auch für drei Fragen berechnen; die Itemzahl beeinflusst nur seine Höhe.', 'Alpha can be calculated for three questions too; the number of items only affects its size.'))
    ],
    hilfe: [...HF, 'reliabilitaet'], belege: ['wissen:alpha-itemzahl', 'wissen:cortina-itemzahl-rechnung', 'wissen:alpha-nicht-eindimensionalitaet']
  },
  {
    id: 'ab-fb-loeschen', thema: 'abschluss', fall: 'ab-fa4', zurueck: 'skala-alpha-grenzen',
    stamm: P(`Angenommen, man löscht eine Frage nur, wenn Alpha dadurch auf mindestens ${zd('regel_alpha')} steigt. Soll man laut Tabelle 4b eine der drei Fragen löschen?`,
      `Assume a question is deleted only if alpha thereby rises to at least ${ze('regel_alpha')}. According to table 4b, should one of the three questions be deleted?`),
    antworten: [
      a(P(`Keine: Ohne F2 stiege Alpha nur auf ${zd('abF_ad1_f2', 3)}, ohne F3 oder F5 sänke es; die Grenze ${zd('regel_alpha')} erreicht keine Variante`, `None: without F2 alpha would only rise to ${ze('abF_ad1_f2', 3)}, without F3 or F5 it would fall; no variant reaches the limit ${ze('regel_alpha')}`),
        P('Gelöscht wird, wenn Alpha dadurch gut genug wird. Hier bleibt jede Variante darunter, und mit zwei Fragen ginge zudem Inhalt verloren.', 'A question is deleted if alpha thereby becomes good enough. Here every variant stays below, and with two questions content would also be lost.'), true),
      a(P(`F2: Ohne F2 ist Alpha höher als jetzt (${zd('abF_ad1_f2', 3)} gegenüber ${zd('abF_a1', 3)}), also verbessert das Löschen die Skala spürbar und bringt sie nahe an die Grenze`, `F2: without F2 alpha is higher than now (${ze('abF_ad1_f2', 3)} against ${ze('abF_a1', 3)}), so deleting clearly improves the scale and brings it close to the limit`),
        P(`Alpha steigt zwar, bleibt aber unter ${zd('regel_alpha')}. Nach der Annahme ist das kein Löschgrund.`, `Alpha does rise but stays below ${ze('regel_alpha')}. Under the assumption this is no reason to delete.`)),
      a(P(`F5: Ohne F5 sinkt Alpha auf ${zd('abF_ad1_f5', 3)}; F5 verändert Alpha am stärksten und sollte deshalb gelöscht werden`, `F5: without F5 alpha falls to ${ze('abF_ad1_f5', 3)}; F5 changes alpha most and should therefore be deleted`),
        P('Wenn Alpha ohne die Frage sinkt, trägt die Frage zur Skala bei. Gelöscht wird, wenn Alpha ohne sie steigt.', 'If alpha falls without the question, the question contributes to the scale. One deletes when alpha rises without it.')),
      a(P(`F3: Seine Item-Skala-Korrelation (${zd('abF_r1_f3', 3)}) ist kleiner als die von F5 (${zd('abF_r1_f5', 3)}), also trägt F3 am wenigsten zur Skala bei`, `F3: its item-total correlation (${ze('abF_r1_f3', 3)}) is smaller than that of F5 (${ze('abF_r1_f5', 3)}), so F3 contributes least to the scale`),
        P(`Das stimmt zwar (${zd('abF_r1_f3', 3)} gegenüber ${zd('abF_r1_f5', 3)}), aber die kleinste Korrelation hat F2 (${zd('abF_r1_f2', 3)}), und gelöscht wird nicht nach dem Rang.`, `That is true (${ze('abF_r1_f3', 3)} against ${ze('abF_r1_f5', 3)}), but the smallest correlation is that of F2 (${ze('abF_r1_f2', 3)}), and deletion does not follow the rank.`)),
      a(P(`Alle drei Fragen löschen und neue Fragen für die Skala formulieren, weil Alpha mit ${zd('abF_a1', 3)} unter ${zd('regel_alpha')} liegt`, `Delete all three questions and write new ones for the scale because alpha at ${ze('abF_a1', 3)} is below ${ze('regel_alpha')}`),
        P('Mit null Fragen bleibt keine Skala. Die Tabelle zeigt keine Frage, die ihr schadet.', 'With zero questions no scale remains. The table shows no question that harms it.'))
    ],
    hilfe: [...HF, 'trennschaerfe', 'reliabilitaet'], belege: ['wissen:alpha-if-deleted-definition', 'wissen:alpha-if-deleted-unzuverlaessig', 'wissen:itemselektion-nicht-mechanisch']
  },
  {
    id: 'ab-fb-gesamt', thema: 'abschluss', fall: 'ab-fa5', zurueck: 'skala-gesamtablauf',
    stamm: P('Nehmen Sie alle Überlegungen zusammen: den Inhalt (Tabelle 1), die Faktorenanalyse (Tabelle 2) und die Reliabilität (Tabellen 3 und 4). Wie verwenden Sie F2, F3 und F5 für die Messung der Anteilnahme?',
      'Take all considerations together: the content (table 1), the factor analysis (table 2) and the reliability (tables 3 and 4). How do you use F2, F3 and F5 to measure concern for others?'),
    antworten: [
      a(P(`Alle drei behalten, F2 umpolen und zum Mittelwert zusammenfassen; wegen Alpha ${zd('abF_a1', 3)} unter ${zd('regel_alpha')} weitere Anteilnahme-Fragen ergänzen und den Wortlaut von F3 prüfen`, `Keep all three, reverse-code F2 and combine them to a mean; because alpha ${ze('abF_a1', 3)} is below ${ze('regel_alpha')} add further questions on concern for others and check the wording of F3`),
        P('Inhalt, Ladungen und Item-Statistik passen zusammen: F2, F3 und F5 messen Anteilnahme. Zu ändern sind die Richtung von F2, die Länge der Skala und die Doppelladung von F3.', 'Content, loadings and item statistics fit together: F2, F3 and F5 measure concern. To change are the direction of F2, the length of the scale and the double loading of F3.'), true),
      a(P('F2 löschen, weil es gegenläufig formuliert ist, und F3 und F5 zusammenfassen, denn eine gegenläufige Frage stört die Skala, misst etwas anderes und senkt die Zuverlässigkeit', 'Delete F2 because it is worded in reverse, and combine F3 and F5, since a reversed question disturbs the scale, measures something else and lowers the reliability'),
        P('Gegenläufig formulierte Fragen werden umgepolt, nicht gelöscht; sie messen dasselbe Konstrukt.', 'Reversed questions are reverse-coded, not deleted; they measure the same construct.')),
      a(P('F3 löschen, weil es auf zwei Komponenten lädt, und die Skala aus F2 und F5 bilden, denn Doppelladungen machen eine Frage grundsätzlich unbrauchbar', 'Delete F3 because it loads on two components and build the scale from F2 and F5, since double loadings make a question unusable on principle'),
        P('Eine Doppelladung allein ist kein Löschgrund, wenn Inhalt und Item-Statistik für die Frage sprechen. Hier lädt F3 stärker auf Komponente 2 und hat eine mittlere Korrelation mit der Skala.', 'A double loading alone is no reason to delete if content and item statistics speak for the question. Here F3 loads more strongly on component 2 and has a medium correlation with the scale.')),
      a(P('Alle drei unverändert zusammenfassen; das Umpolen von F2 ist unnötig, denn Alpha bleibt auch ohne Umpolen gleich', 'Combine all three unchanged; reverse-coding F2 is unnecessary since alpha stays the same without it'),
        P(`Das Umpolen verbessert Alpha von ${zd('abF_a0', 3)} auf ${zd('abF_a1', 3)}. Ohne Umpolen löschen sich Fragen in der Summe gegenseitig aus.`, `Reverse-coding improves alpha from ${ze('abF_a0', 3)} to ${ze('abF_a1', 3)}. Without it questions cancel each other out in the sum.`)),
      a(P(`F4 zur Skala hinzunehmen, weil F4 auf Komponente 1 lädt (${zd('abF_l_f4_1', 2)}) und damit die Skala um eine vierte Frage verbessert`, `Add F4 to the scale because F4 loads on component 1 (${ze('abF_l_f4_1', 2)}) and so improves the scale by a fourth question`),
        P('Komponente 1 ist die Geselligkeit, nicht die Anteilnahme. F4 gehört in diese andere Skala.', 'Component 1 is sociability, not concern for others. F4 belongs in that other scale.'))
    ],
    hilfe: [...HF, 'umpolen', 'reliabilitaet'], belege: ['wissen:umpolen-verfahren', 'wissen:itemselektion-nicht-mechanisch', 'wissen:alpha-itemzahl']
  },
  // ======== Regression, Block 4: eine 0/1-Größe (Geschlecht) ========
  {
    id: 'ab-rg-sa-b', thema: 'abschluss', fall: 'ab-sa1', zurueck: 'regression-mehrere-dummy',
    stamm: P('Wie ist das B der Größe female in Tabelle 1b zu lesen? (female: 0 = männlich, 1 = weiblich)', 'How is the B of the variable female in table 1b to be read? (female: 0 = male, 1 = female)'),
    antworten: [
      a(P(`Frauen liegen im SATQ im Mittel um ${za('abS_b_female', 3)} Punkte niedriger als Männer`, `Women score on average ${zae3('abS_b_female')} points lower than men in SATQ`),
        P('Bei einer 0/1-Größe ist B der Unterschied der Mittelwerte zwischen der Gruppe mit 1 und der Referenzgruppe mit 0.', 'For a 0/1 variable B is the difference between the means of the group coded 1 and the reference group coded 0.'), true),
      a(P(`Männer liegen im SATQ im Mittel um ${za('abS_b_female', 3)} Punkte niedriger als Frauen, weil female das Merkmal der Männer misst`, `Men score on average ${zae3('abS_b_female')} points lower than women in SATQ because female measures the characteristic of men`),
        P('Die Gruppe mit 1 sind die Frauen, die Referenz mit 0 sind die Männer. Das negative B heißt: Die Frauen liegen niedriger.', 'The group coded 1 is women, the reference coded 0 is men. The negative B means: women score lower.')),
      a(P(`Frauen haben ${za('abS_b_female', 3)} Prozent weniger Punkte im SATQ als Männer, weil B in Prozent angegeben wird`, `Women have ${zae3('abS_b_female')} percent fewer points in SATQ than men because B is given in percent`),
        P('B steht in der Einheit der abhängigen Größe, hier SAT-Punkten, nicht in Prozent.', 'B is in the unit of the dependent variable, here SAT points, not in percent.')),
      a(P(`Mit jedem Punkt mehr bei female sinkt der SATQ um ${za('abS_b_female', 3)} Punkte, so wie bei jeder anderen stetigen Größe`, `With each point more in female SATQ falls by ${zae3('abS_b_female')} points, as with any other continuous variable`),
        P('female kennt nur zwei Werte, 0 und 1; einen Punkt mehr gibt es nur als Wechsel von Männern zu Frauen.', 'female has only two values, 0 and 1; one point more exists only as the change from men to women.')),
      a(P(`Der Mittelwert der Frauen im SATQ beträgt ${za('abS_b_female', 3)} Punkte, der der Männer ist null`, `The mean of women in SATQ is ${zae3('abS_b_female')} points, that of men is zero`),
        P('Die Mittelwerte selbst stecken in der Konstanten und der Summe aus Konstante und B, nicht im B allein.', 'The means themselves are in the constant and in the sum of constant and B, not in B alone.'))
    ],
    hilfe: [...HR, 'dummy-variable'], belege: ['wissen:reg-dummy-kodierung', 'wissen:dormann-dummy-referenz', 'Hilfe:dummy-variable']
  },
  {
    id: 'ab-rg-sa-se', thema: 'abschluss', fall: 'ab-sa1', zurueck: 'regression-mehrere-dummy',
    stamm: P(`Für female stehen in Tabelle 1b ein Standardfehler von ${zd('abS_se_female', 3)}, ein t von ${zd('abS_t_female', 3)} und ein Sig. unter 0,001. Was sagen die drei Werte?`,
      `For female table 1b shows a standard error of ${ze('abS_se_female', 3)}, a t of ${ze('abS_t_female', 3)} and a Sig. below 0.001. What do the three values say?`),
    antworten: [
      a(P(`Der Standardfehler zeigt, wie genau der Unterschied (B) geschätzt ist; t ist B geteilt durch den Standardfehler, hier etwa ${za('abS_t_female', 3)} Standardfehler von null entfernt; Sig. unter 0,001: Der Unterschied ist signifikant`, `The standard error shows how precisely the difference (B) is estimated; t is B divided by the standard error, here about ${zae3('abS_t_female')} standard errors from zero; Sig. below 0.001: the difference is significant`),
        P('t = B / Standardfehler; je weiter t von null entfernt ist, desto kleiner ist Sig. Unter 0,05 gilt das Ergebnis als signifikant.', 't = B / standard error; the further t is from zero, the smaller Sig. is. Below 0.05 a result counts as significant.'), true),
      a(P(`Der Standardfehler ist die durchschnittliche Abweichung der Personen vom Mittelwert, t ist der Unterschied der Mittelwerte (${za('abS_t_female', 3)} Punkte), und Sig. ist der Anteil der Frauen unter den Befragten`, `The standard error is the average deviation of the persons from the mean, t is the difference between the means (${zae3('abS_t_female')} points), and Sig. is the share of women among those surveyed`),
        P('Der Unterschied der Mittelwerte steht im B, die Abweichung der Personen in der Standardabweichung; t und Sig. sind Prüfgrößen.', 'The difference between the means is in B, the deviation of the persons in the standard deviation; t and Sig. are test quantities.')),
      a(P(`Je kleiner der Standardfehler (${zd('abS_se_female', 3)}) und je größer t, desto größer ist der Unterschied zwischen Frauen und Männern in der Bevölkerung, und Sig. nennt die Wahrscheinlichkeit, dass er besteht`, `The smaller the standard error (${ze('abS_se_female', 3)}) and the larger t, the larger the difference between women and men in the population, and Sig. gives the probability that it exists`),
        P('Standardfehler und t sagen etwas über die Sicherheit, nicht über die Größe des Unterschieds; Sig. ist keine Wahrscheinlichkeit dafür, dass der Unterschied besteht.', 'Standard error and t say something about certainty, not about the size of the difference; Sig. is no probability that the difference exists.')),
      a(P(`Alle drei Werte zeigen dasselbe: dass female ${zn('abS_n')} Personen umfasst, und je kleiner der Standardfehler, desto mehr Personen sind es`, `All three values show the same thing: that female covers ${zn('abS_n')} persons, and the smaller the standard error the more persons there are`),
        P('Die Zahl der Personen beeinflusst den Standardfehler, aber die drei Werte sagen verschiedene Dinge über B aus.', 'The number of persons influences the standard error, but the three values say different things about B.'))
    ],
    hilfe: [...HR, 'standardfehler-schaetzer', 'signifikanz'], belege: ['wissen:reg-t-test-steigung', 'wissen:reg-standardfehler-steigung', 'wissen:reg-spss-tabelle']
  },
  {
    id: 'ab-rg-sa-beta', thema: 'abschluss', fall: 'ab-sa1', zurueck: 'regression-effekte-einordnen',
    stamm: P(`Angenommen, ein Beta ab ${zd('ef_beta_klein', 1)} gilt als klein, ab ${zd('ef_beta_mittel', 1)} als mittel, und ein R² ab ${zd('ef_r2_klein')} als klein, ab ${zd('ef_r2_mittel')} als mittel. In Tabelle 1a und 1b stehen R² = ${zd('abS_r2', 3)} und für female Beta = ${zd('abS_beta_female', 3)}. Welche Schlussfolgerung passt?`,
      `Assume a Beta from ${ze('ef_beta_klein', 1)} counts as small, from ${ze('ef_beta_mittel', 1)} as medium, and an R² from ${ze('ef_r2_klein')} as small, from ${ze('ef_r2_mittel')} as medium. Tables 1a and 1b show R² = ${ze('abS_r2', 3)} and for female Beta = ${ze('abS_beta_female', 3)}. Which conclusion fits?`),
    antworten: [
      a(P(`Der Unterschied ist verlässlich (Sig. unter 0,001), aber klein: Beta liegt zwischen klein und mittel, und R² beträgt nur etwa ${zp('abS_r2')} Prozent`, `The difference is reliable (Sig. below 0.001) but small: Beta lies between small and medium, and R² is only about ${zp('abS_r2')} percent`),
        P('Signifikanz zeigt Sicherheit, Beta und R² zeigen die Größe. Ein verlässlicher Unterschied kann klein sein.', 'Significance shows certainty, Beta and R² show size. A reliable difference can be small.'), true),
      a(P(`Der Unterschied ist groß, weil das Sig. unter 0,001 liegt und das Beta (${zd('abS_beta_female', 3)}) negativ ausfällt, was für einen starken Effekt spricht`, `The difference is large because Sig. is below 0.001 and the Beta (${ze('abS_beta_female', 3)}) turns out negative, which speaks for a strong effect`),
        P('Das Vorzeichen zeigt nur die Richtung, das Sig. nur die Sicherheit. Die Größe ergibt sich aus Beta und R².', 'The sign shows only the direction, Sig. only the certainty. The size follows from Beta and R².')),
      a(P(`Der Unterschied ist bedeutungslos, weil R² (${zd('abS_r2', 3)}) unter ${zd('ef_r2_mittel')} liegt und ein Unterschied unter dieser Grenze zufällig sein muss`, `The difference is meaningless because R² (${ze('abS_r2', 3)}) is below ${ze('ef_r2_mittel')} and a difference below this limit must be due to chance`),
        P('Ob ein Unterschied zufällig ist, sagt das Sig.; hier liegt es unter 0,001. Ein kleines R² heißt nur: wenig Streuung wird erklärt.', 'Whether a difference is due to chance is told by Sig.; here it is below 0.001. A small R² only means: little variation is explained.')),
      a(P(`Der Unterschied ist mittel bis groß, weil das Beta von ${zd('abS_beta_female', 3)} im Betrag über ${zd('ef_beta_klein', 1)} liegt und ${zn('abS_n')} Personen untersucht wurden`, `The difference is medium to large because the Beta of ${ze('abS_beta_female', 3)} is above ${ze('ef_beta_klein', 1)} in size and ${zn('abS_n')} persons were studied`),
        P(`Ein Betrag über ${zd('ef_beta_klein', 1)} gilt erst als klein; mittel beginnt bei ${zd('ef_beta_mittel', 1)}. Viele Personen erhöhen die Sicherheit, nicht die Größe.`, `A size above ${ze('ef_beta_klein', 1)} counts only as small; medium begins at ${ze('ef_beta_mittel', 1)}. Many persons raise the certainty, not the size.`))
    ],
    hilfe: [...HR, 'effektstaerke', 'r-quadrat'], belege: ['wissen:effekt-cohen-richtwerte', 'wissen:signifikant-nicht-bedeutsam', 'wissen:wasserstein16-p-praezision-effekt']
  },
  {
    id: 'ab-rg-sa-mittel', thema: 'abschluss', fall: 'ab-sa2', zurueck: 'regression-mehrere-dummy',
    stamm: P('Tabelle 2 zeigt die Mittelwerte von SATQ für beide Gruppen. Was gilt für die Konstante und das B von female in Tabelle 1b?',
      'Table 2 shows the means of SATQ for both groups. What holds for the constant and the B of female in table 1b?'),
    antworten: [
      a(P(`Die Konstante ${zd('abS_b_const', 3)} ist der Mittelwert der Männer, B ${zd('abS_b_female', 3)} die Differenz der Mittelwerte (${zd('abS_m1', 3)} minus ${zd('abS_m0', 3)})`, `The constant ${ze('abS_b_const', 3)} is the mean of the men, B ${ze('abS_b_female', 3)} the difference of the means (${ze('abS_m1', 3)} minus ${ze('abS_m0', 3)})`),
        P('Die Referenzgruppe ist die mit 0: Ihr Mittelwert steht in der Konstanten, und B ist der Unterschied der anderen Gruppe zu ihr.', 'The reference group is the one coded 0: its mean is in the constant, and B is the difference of the other group from it.'), true),
      a(P(`Die Konstante ${zd('abS_b_const', 3)} ist der Mittelwert aller ${zn('abS_n')} Personen, B ${zd('abS_b_female', 3)} der Mittelwert der Frauen`, `The constant ${ze('abS_b_const', 3)} is the mean of all ${zn('abS_n')} persons, B ${ze('abS_b_female', 3)} the mean of the women`),
        P('Der Mittelwert aller Personen läge zwischen den Gruppenmitteln. Die Konstante gehört zur Gruppe mit 0, B ist eine Differenz.', 'The mean of all persons would lie between the group means. The constant belongs to the group coded 0, B is a difference.')),
      a(P(`Die Konstante ${zd('abS_b_const', 3)} ist der Mittelwert der Frauen (${zd('abS_m1', 3)}), B die Differenz Männer minus Frauen`, `The constant ${ze('abS_b_const', 3)} is the mean of the women (${ze('abS_m1', 3)}), B the difference men minus women`),
        P(`Der Mittelwert der Frauen ist ${zd('abS_m1', 3)}, die Konstante ist ${zd('abS_m0', 3)}: Sie gehört zur Gruppe mit 0, den Männern.`, `The mean of the women is ${ze('abS_m1', 3)}, the constant is ${ze('abS_m0', 3)}: it belongs to the group coded 0, the men.`)),
      a(P(`Konstante und B zeigen beide Mittelwerte (${zd('abS_b_const', 3)} und ${zd('abS_b_female', 3)}), und ihr Verhältnis ergibt den Unterschied der Gruppen`, `Constant and B both show means (${ze('abS_b_const', 3)} and ${ze('abS_b_female', 3)}), and their ratio gives the difference between the groups`),
        P('B ist selbst der Unterschied (eine Differenz), kein Mittelwert und kein Verhältnis.', 'B is itself the difference (a subtraction), neither a mean nor a ratio.'))
    ],
    hilfe: [...HR, 'dummy-variable'], belege: ['wissen:reg-dummy-kodierung', 'wissen:dormann-dummy-referenz', 'Hilfe:dummy-variable']
  },
  {
    id: 'ab-rg-sa-aenderung', thema: 'abschluss', fall: 'ab-sa3', zurueck: 'regression-modelle-vergleichen', mehrfach: true,
    stamm: P('Modell 2 nimmt zusätzlich SATV (Ergebnis im Sprachteil) in die Regression auf. Welche Aussagen über die Änderungen von Modell 1 zu Modell 2 stimmen? Mehrere können stimmen.',
      'Model 2 additionally includes SATV (result in the verbal part) in the regression. Which statements about the changes from model 1 to model 2 are correct? Several can be correct.'),
    antworten: [
      a(P(`R² steigt deutlich von ${zd('abS_r2', 3)} auf ${zd('abS2_r2', 3)}, und SATV ist signifikant (Sig. unter 0,001)`, `R² rises clearly from ${ze('abS_r2', 3)} to ${ze('abS2_r2', 3)}, and SATV is significant (Sig. below 0.001)`),
        P('SATV erklärt einen großen zusätzlichen Teil der Streuung im SATQ.', 'SATV explains a large additional part of the variation in SATQ.'), true),
      a(P(`Das B von female ändert sich nur wenig (${zd('abS_b_female', 3)} auf ${zd('abS2_b_female', 3)}) und bleibt signifikant`, `The B of female changes only little (${ze('abS_b_female', 3)} to ${ze('abS2_b_female', 3)}) and stays significant`),
        P('Der Unterschied zwischen Frauen und Männern bleibt bestehen, auch wenn man SATV gleich hält.', 'The difference between women and men remains even if SATV is held constant.'), true),
      a(P(`Das B von female wird deutlich größer, weil eine zweite Größe das B der ersten verstärkt (${zd('abS_b_female', 3)} auf ${zd('abS2_b_female', 3)})`, `The B of female becomes clearly larger because a second variable strengthens the B of the first (${ze('abS_b_female', 3)} to ${ze('abS2_b_female', 3)})`),
        P(`Der Betrag sinkt sogar leicht (${zd('abS_b_female', 3)} auf ${zd('abS2_b_female', 3)}); eine zweite Größe verstärkt B nicht von selbst.`, `The size even falls slightly (${ze('abS_b_female', 3)} to ${ze('abS2_b_female', 3)}); a second variable does not strengthen B by itself.`)),
      a(P(`Die Konstante bleibt bei ${zd('abS_b_const', 3)}, weil sie weiterhin der Mittelwert der Männer ist, und female ist nicht mehr signifikant`, `The constant stays at ${ze('abS_b_const', 3)} because it is still the mean of the men, and female is no longer significant`),
        P(`Die Konstante gilt jetzt für Männer mit SATV = 0 und beträgt ${zd('abS2_b_const', 3)}; female ist weiterhin signifikant (t = ${zd('abS2_t_female', 3)}).`, `The constant now applies to men with SATV = 0 and is ${ze('abS2_b_const', 3)}; female is still significant (t = ${ze('abS2_t_female', 3)}).`))
    ],
    hilfe: [...HR, 'r-quadrat', 'koeffizient-b'], belege: ['wissen:reg-modellvergleich', 'wissen:reg-partielle-koeffizienten', 'wissen:reg-r2-definition']
  },
  // ======== Fragebogen, Block 2: Sorgfalt und Stimmung ========
  {
    id: 'ab-fc-inhalt', thema: 'abschluss', fall: 'ab-fb1', zurueck: 'inhalt-und-zahlen',
    stamm: P('Welche Zuordnung der sechs Fragen zu Sorgfalt und Stimmung ist allein nach dem Wortlaut in Tabelle 1 am besten begründet?',
      'Which assignment of the six questions to carefulness and mood is best justified by the wording in table 1 alone?'),
    antworten: [
      a(P('G3 und G5 gehören zur Sorgfalt, G1, G4 und G6 zur Stimmung; bei G2 (Zeit vergeuden) kann man nach dem Wortlaut beide Konstrukte vertreten, hier entscheiden erst die Zahlen', 'G3 and G5 belong to carefulness, G1, G4 and G6 to mood; for G2 (wasting time) both constructs can be argued from the wording, here only the numbers decide'),
        P('G3 (genau arbeiten) und G5 (bis alles perfekt ist) meinen Sorgfalt; G1 (Stimmungswechsel), G4 (niedergeschlagen) und G6 (gereizt) meinen Stimmung. Zeit vergeuden kann zur Arbeitsweise oder zur Stimmung gehören.', 'G3 (working exactly) and G5 (until everything is perfect) mean carefulness; G1 (mood swings), G4 (feeling down) and G6 (irritated) mean mood. Wasting time can belong to working style or to mood.'), true),
      a(P('G1, G3 und G5 gehören zur Sorgfalt, G2, G4 und G6 zur Stimmung, denn wer Zeit vergeudet und niedergeschlagen ist, hat schlechte Laune', 'G1, G3 and G5 belong to carefulness, G2, G4 and G6 to mood, since someone who wastes time and feels down is in a bad mood'),
        P('Das vermischt die Inhalte: Wechselnde Stimmungen (G1) gehören zur Stimmung, nicht zur Sorgfalt.', 'This mixes up the contents: mood swings (G1) belong to mood, not to carefulness.')),
      a(P('G2 gehört eindeutig zur Sorgfalt, weil die Frage negativ formuliert ist und Sorgfalt das Gegenteil von Zeitvergeudung ist; die übrigen fünf verteilen sich wie erwartet', 'G2 clearly belongs to carefulness because the question is worded negatively and carefulness is the opposite of wasting time; the other five are distributed as expected'),
        P('Das lässt sich aus dem Wortlaut nicht sicher sagen. Auch niedergedrückte Stimmung kann dazu führen, dass jemand Zeit vergeudet.', 'This cannot be said for certain from the wording. A down mood can also lead to someone wasting time.')),
      a(P('G4 gehört zu keinem der beiden Konstrukte, weil niedergeschlagen sein weder Genauigkeit noch Gereiztheit betrifft; die übrigen fünf verteilen sich wie erwartet', 'G4 belongs to neither construct because feeling down concerns neither exactness nor irritability; the other five are distributed as expected'),
        P('Niedergeschlagenheit ist ein klarer Teil der Stimmung, wie Gereiztheit und Stimmungswechsel.', 'Feeling down is a clear part of mood, like irritability and mood swings.')),
      a(P('Alle sechs Fragen gehören zu beiden Konstrukten, weil Sorgfalt und Stimmung bei jeder Person zusammenhängen und sich darum nicht trennen lassen', 'All six questions belong to both constructs because carefulness and mood are linked in every person and so cannot be separated'),
        P('Dann würde nichts mehr unterschieden. Die Fragen lassen sich überwiegend einem der beiden Konstrukte zuordnen.', 'Then nothing would be distinguished any more. The questions can mostly be assigned to one of the two constructs.'))
    ],
    hilfe: [...HF, 'konstrukt', 'item'], belege: ['wissen:fa-negative-ladung', 'wissen:umpolen-verfahren', 'Hilfe:konstrukt']
  },
  {
    id: 'ab-fc-zuordnung', thema: 'abschluss', fall: 'ab-fb2', zurueck: 'faktor-ladungen-lesen',
    stamm: P(`Angenommen, eine Frage gehört zu einer Komponente, wenn der Betrag ihrer Ladung ${zd('regel_ladung')} übersteigt. Welche Zuordnung nach Tabelle 2 stimmt?`,
      `Assume a question belongs to a component if the absolute size of its loading exceeds ${ze('regel_ladung')}. Which assignment according to table 2 is correct?`),
    antworten: [
      a(P(`Komponente 1: G6, G1, G4 und G2 (${zd('abG_l_g2_1', 2)}). Komponente 2: G5, G3 und G2 (${zd('abG_l_g2_2', 2)}). G2 gehört zu beiden`, `Component 1: G6, G1, G4 and G2 (${ze('abG_l_g2_1', 2)}). Component 2: G5, G3 and G2 (${ze('abG_l_g2_2', 2)}). G2 belongs to both`),
        P(`G2 lädt ${zd('abG_l_g2_1', 2)} und ${zd('abG_l_g2_2', 2)}, beide Beträge liegen über ${zd('regel_ladung')}.`, `G2 loads ${ze('abG_l_g2_1', 2)} and ${ze('abG_l_g2_2', 2)}, both sizes lie above ${ze('regel_ladung')}.`), true),
      a(P(`Komponente 1: G6, G1 und G4. Komponente 2: G5, G3 und G2, weil G2 dort den größeren Betrag hat (${zd('abG_l_g2_2', 2)} gegenüber ${zd('abG_l_g2_1', 2)})`, `Component 1: G6, G1 and G4. Component 2: G5, G3 and G2 because G2 has the larger size there (${ze('abG_l_g2_2', 2)} against ${ze('abG_l_g2_1', 2)})`),
        P(`Die Regel zählt jede Ladung über ${zd('regel_ladung')}, nicht nur die größte. G2 gehört zu beiden Komponenten.`, `The rule counts every loading above ${ze('regel_ladung')}, not only the largest. G2 belongs to both components.`)),
      a(P(`Komponente 1: G6, G1, G4 und G2. Komponente 2: G5 und G3. G2 gehört nur zur ersten, weil seine Ladung auf der zweiten (${zd('abG_l_g2_2', 2)}) negativ ist`, `Component 1: G6, G1, G4 and G2. Component 2: G5 and G3. G2 belongs only to the first because its loading on the second (${ze('abG_l_g2_2', 2)}) is negative`),
        P('Es zählt der Betrag; das Minus zeigt nur die Richtung. G2 gehört auch zur zweiten Komponente.', 'The absolute size counts; the minus only shows the direction. G2 also belongs to the second component.')),
      a(P(`Komponente 1: G6, G1 und G4. Komponente 2: G5 und G3. G2 gehört zu keiner, weil keine Ladung ${zd('regel_ladung_gross', 2)} erreicht`, `Component 1: G6, G1 and G4. Component 2: G5 and G3. G2 belongs to neither because no loading reaches ${ze('regel_ladung_gross', 2)}`),
        P(`Die angenommene Grenze ist ${zd('regel_ladung')}, nicht ${zd('regel_ladung_gross', 2)}. G2 liegt auf beiden Komponenten darüber.`, `The assumed limit is ${ze('regel_ladung')}, not ${ze('regel_ladung_gross', 2)}. G2 lies above it on both components.`))
    ],
    hilfe: [...HF, 'ladung'], belege: ['wissen:fa-ladung-definition', 'wissen:fa-negative-ladung', 'wissen:clark-ladungsgrenzen-itemauswahl']
  },
  {
    id: 'ab-fc-doppel', thema: 'abschluss', fall: 'ab-fb2', zurueck: 'faktor-ladungen-lesen', mehrfach: true,
    stamm: P(`G2 lädt in Tabelle 2 mit ${zd('abG_l_g2_1', 2)} auf Komponente 1 und mit ${zd('abG_l_g2_2', 2)} auf Komponente 2. Welche Aussagen stimmen, wenn ein Betrag über ${zd('regel_ladung')} als Zugehörigkeit gilt? Mehrere können stimmen.`,
      `G2 loads ${ze('abG_l_g2_1', 2)} on component 1 and ${ze('abG_l_g2_2', 2)} on component 2 in table 2. Which statements are correct if a size above ${ze('regel_ladung')} counts as belonging? Several can be correct.`),
    antworten: [
      a(P('G2 hängt stärker mit Komponente 2 (G5 und G3, Sorgfalt) zusammen als mit Komponente 1 (G6, G1 und G4, Stimmung)', 'G2 is more strongly related to component 2 (G5 and G3, carefulness) than to component 1 (G6, G1 and G4, mood)'),
        P('Der Betrag auf Komponente 2 (Sorgfalt) ist größer als auf Komponente 1 (Stimmung).', 'The size on component 2 (carefulness) is larger than on component 1 (mood).'), true),
      a(P('Das Minuszeichen zeigt, dass G2 gegenläufig zur Sorgfalt formuliert ist; vor dem Zusammenfassen der Sorgfalts-Fragen wird G2 umgepolt', 'The minus sign shows that G2 is worded in the opposite direction to carefulness; before combining the carefulness questions G2 is reverse-coded'),
        P('Wer der Aussage stark zustimmt (Zeit vergeuden), hat wenig Sorgfalt: Die Richtung ist umgekehrt.', 'Whoever strongly agrees with the statement (wasting time) has little carefulness: the direction is reversed.'), true),
      a(P(`Die Ladung von ${zd('abG_l_g2_1', 2)} auf Komponente 1 liegt unter der Grenze und darf deshalb ignoriert werden`, `The loading of ${ze('abG_l_g2_1', 2)} on component 1 lies below the limit and may therefore be ignored`),
        P(`${zd('abG_l_g2_1', 2)} liegt über ${zd('regel_ladung')}; G2 gehört also auch zu Komponente 1.`, `${ze('abG_l_g2_1', 2)} lies above ${ze('regel_ladung')}; so G2 also belongs to component 1.`)),
      a(P('Eine Frage mit zwei Ladungen über der Grenze muss gelöscht werden, weil sie keinem Konstrukt eindeutig angehört', 'A question with two loadings above the limit must be deleted because it clearly belongs to no construct'),
        P('Eine Doppelladung ist ein Hinweis, die Frage zu prüfen, kein Löschgrund; Inhalt und Reliabilität entscheiden mit.', 'A double loading is a hint to check the question, not a reason to delete; content and reliability help to decide.'))
    ],
    hilfe: [...HF, 'ladung', 'umpolen'], belege: ['wissen:fa-negative-ladung', 'wissen:fa-mehrfachladungen', 'wissen:clark-ladungsgrenzen-itemauswahl']
  },
  {
    id: 'ab-fc-erkennen', thema: 'abschluss', fall: 'ab-fb3', zurueck: 'skala-trennschaerfe-umpolen',
    stamm: P(`In Tabelle 3b haben G3 und G5 nur Item-Skala-Korrelationen von ${zd('abG_r0_g3', 3)} und ${zd('abG_r0_g5', 3)}, G2 hat ${zd('abG_r0_g2', 3)}. Wie ist das zu erklären?`,
      `In table 3b G3 and G5 have item-total correlations of only ${ze('abG_r0_g3', 3)} and ${ze('abG_r0_g5', 3)}, G2 has ${ze('abG_r0_g2', 3)}. How is this to be explained?`),
    antworten: [
      a(P(`G2 ist gegenläufig formuliert und zeigt in der ungedrehten Summe in die andere Richtung; dadurch drückt es die Korrelationen von G3 und G5 und macht Alpha negativ (${zd('abG_a0', 3)}). Nach dem Umpolen von G2 steigen sie`, `G2 is worded in the opposite direction and points the other way in the unturned sum; it thereby depresses the correlations of G3 and G5 and makes alpha negative (${ze('abG_a0', 3)}). After reverse-coding G2 they rise`),
        P('Eine einzige ungedrehte Frage genügt, damit alle Item-Skala-Korrelationen der Skala klein werden. Tabelle 4b zeigt es nach dem Umpolen.', 'A single unturned question suffices to make all item-total correlations of the scale small. Table 4b shows it after reverse-coding.'), true),
      a(P(`G3 und G5 messen etwas anderes als Sorgfalt, weil ihre Korrelationen nahe null liegen (${zd('abG_r0_g3', 3)} und ${zd('abG_r0_g5', 3)}); sie gehören nicht zur Skala`, `G3 and G5 measure something other than carefulness because their correlations are near zero (${ze('abG_r0_g3', 3)} and ${ze('abG_r0_g5', 3)}); they do not belong to the scale`),
        P('Beide haben in der Faktorenanalyse hohe Ladungen auf die Sorgfalts-Komponente. Die kleinen Korrelationen kommen von G2.', 'Both have high loadings on the carefulness component in the factor analysis. The small correlations come from G2.')),
      a(P(`Die Stichprobe (${zn('abG_rel_n')} Personen) ist zu klein für eine verlässliche Reliabilitätsanalyse, daher schwanken die Korrelationen stark und Alpha wird negativ`, `The sample (${zn('abG_rel_n')} persons) is too small for a reliable reliability analysis, so the correlations vary strongly and alpha becomes negative`),
        P('Mit so vielen Personen sind die Werte sehr genau. Das negative Alpha zeigt eine gegenläufige Frage, keine zu kleine Stichprobe.', 'With so many persons the values are very precise. The negative alpha points to a reversed question, not to too small a sample.')),
      a(P(`Die Antworten von 1 bis 6 sind für eine Reliabilitätsanalyse ungeeignet; erst bei zehn Antwortstufen sind die Korrelationen groß, und Alpha ${zd('abG_a0', 3)} ist ein Rechenfehler`, `Answers from 1 to 6 are unsuitable for a reliability analysis; only with ten answer levels are the correlations large, and alpha ${ze('abG_a0', 3)} is a calculation error`),
        P('Sechs Antwortstufen genügen. Ein negatives Alpha kann vorkommen, wenn Fragen in entgegengesetzte Richtungen zeigen.', 'Six answer levels suffice. A negative alpha can occur when questions point in opposite directions.'))
    ],
    hilfe: [...HF, 'trennschaerfe', 'umpolen'], belege: ['wissen:negative-trennschaerfe-ursache', 'wissen:alpha-negativ-moeglich', 'wissen:umpolen-verfahren']
  },
  {
    id: 'ab-fc-wichtig', thema: 'abschluss', fall: 'ab-fb4', zurueck: 'skala-trennschaerfe-umpolen',
    stamm: P('Welche Frage trägt nach Tabelle 4b am meisten zur Skala für Sorgfalt bei, und welche am wenigsten?',
      'According to table 4b, which question contributes most to the scale for carefulness, and which least?'),
    antworten: [
      a(P(`Am meisten G5: Seine Item-Skala-Korrelation ist mit ${zd('abG_r1_g5', 3)} die höchste, und ohne G5 sänke Alpha auf ${zd('abG_ad1_g5', 3)}. Am wenigsten G2 (${zd('abG_r1_g2', 3)}); ohne G2 stiege Alpha auf ${zd('abG_ad1_g2', 3)}`, `Most G5: its item-total correlation is the highest at ${ze('abG_r1_g5', 3)}, and without G5 alpha would fall to ${ze('abG_ad1_g5', 3)}. Least G2 (${ze('abG_r1_g2', 3)}); without G2 alpha would rise to ${ze('abG_ad1_g2', 3)}`),
        P('Je höher die Korrelation und je stärker Alpha ohne die Frage sinkt, desto mehr trägt sie bei.', 'The higher the correlation and the more alpha falls without the question, the more it contributes.'), true),
      a(P(`Am meisten G2, weil Alpha ohne G2 am höchsten wäre (${zd('abG_ad1_g2', 3)}); am wenigsten G5, weil Alpha ohne G5 am niedrigsten wäre (${zd('abG_ad1_g5', 3)})`, `Most G2 because alpha would be highest without G2 (${ze('abG_ad1_g2', 3)}); least G5 because alpha would be lowest without G5 (${ze('abG_ad1_g5', 3)})`),
        P('Das ist umgekehrt: Wenn Alpha ohne eine Frage steigt, stört die Frage eher; wenn es sinkt, trägt sie bei.', 'This is the wrong way round: if alpha rises without a question, the question rather disturbs; if it falls, it contributes.')),
      a(P(`Am meisten G3, weil es die höchste Skalenvarianz hat (${zd('abG_r1_g3', 3)} ist seine Korrelation), am wenigsten G5, weil sein Alpha wenn gelöscht am niedrigsten ist`, `Most G3 because it has the highest scale variance (${ze('abG_r1_g3', 3)} is its correlation), least G5 because its alpha if deleted is the lowest`),
        P(`G3 hat mit ${zd('abG_r1_g3', 3)} eine mittlere Korrelation; G5 hat die höchste (${zd('abG_r1_g5', 3)}). Die Skalenvarianz sagt über den Beitrag nichts.`, `G3 has a medium correlation at ${ze('abG_r1_g3', 3)}; G5 has the highest (${ze('abG_r1_g5', 3)}). The scale variance says nothing about the contribution.`)),
      a(P(`Alle drei tragen gleich viel bei, weil alle Korrelationen positiv sind (${zd('abG_r1_g2', 3)} bis ${zd('abG_r1_g5', 3)}) und Alpha insgesamt ${zd('abG_a1', 3)} beträgt`, `All three contribute equally because all correlations are positive (${ze('abG_r1_g2', 3)} to ${ze('abG_r1_g5', 3)}) and alpha is ${ze('abG_a1', 3)} overall`),
        P('Positiv heißt nicht gleich. Die Korrelationen und die Alpha-Werte ohne Frage unterscheiden sich sichtbar.', 'Positive does not mean equal. The correlations and the alpha values without a question differ visibly.'))
    ],
    hilfe: [...HF, 'trennschaerfe', 'reliabilitaet'], belege: ['wissen:trennschaerfe-lesart', 'wissen:alpha-if-deleted-definition', 'wissen:itemselektion-nicht-mechanisch']
  },
  {
    id: 'ab-fc-gesamt', thema: 'abschluss', fall: 'ab-fb5', zurueck: 'skala-gesamtablauf',
    stamm: P(`Angenommen, ein Alpha ab ${zd('regel_alpha')} gilt als ausreichend. Nehmen Sie den Inhalt, die Faktorenanalyse und die Reliabilität (Tabellen 1 bis 4) zusammen. Wie gehen Sie mit G3, G2 und G5 für die Messung der Sorgfalt vor?`,
      `Assume an alpha from ${ze('regel_alpha')} counts as sufficient. Take the content, the factor analysis and the reliability (tables 1 to 4) together. How do you proceed with G3, G2 and G5 to measure carefulness?`),
    antworten: [
      a(P(`G2 umpolen und alle drei behalten; Alpha liegt mit ${zd('abG_a1', 3)} noch unter ${zd('regel_alpha')}, darum weitere Sorgfalts-Fragen ergänzen und die Doppelladung von G2 beobachten`, `Reverse-code G2 and keep all three; alpha at ${ze('abG_a1', 3)} is still below ${ze('regel_alpha')}, so add further carefulness questions and watch the double loading of G2`),
        P('Inhalt, Ladungen und Item-Statistik sprechen für die drei Fragen als Sorgfalts-Skala. Zu ändern sind die Richtung von G2 und die Länge der Skala.', 'Content, loadings and item statistics speak for the three questions as a carefulness scale. To change are the direction of G2 and the length of the scale.'), true),
      a(P(`G2 löschen und die Skala aus G3 und G5 bilden, weil Alpha dann auf ${zd('abG_ad1_g2', 3)} steigt und damit die Grenze ${zd('regel_alpha')} erreicht ist`, `Delete G2 and build the scale from G3 and G5 because alpha then rises to ${ze('abG_ad1_g2', 3)} and so the limit ${ze('regel_alpha')} is reached`),
        P(`${zd('abG_ad1_g2', 3)} liegt unter ${zd('regel_alpha')}: Die Grenze ist nicht erreicht, und mit zwei Fragen ginge Inhalt verloren.`, `${ze('abG_ad1_g2', 3)} is below ${ze('regel_alpha')}: the limit is not reached, and with two questions content would be lost.`)),
      a(P(`Alle drei unverändert zusammenfassen und die Grenze auf ${zd('abG_a1', 3)} senken, weil die Skala nur drei Fragen hat und Alpha bei kurzen Skalen nicht ernst zu nehmen ist`, `Combine all three unchanged and lower the limit to ${ze('abG_a1', 3)} because the scale has only three questions and alpha is not to be taken seriously for short scales`),
        P(`Die Grenze ${zd('regel_alpha')} ist vorgegeben. Zudem sind die drei Fragen ungedreht: Alpha wäre ${zd('abG_a0', 3)}.`, `The limit ${ze('regel_alpha')} is given. Moreover the three questions are unturned: alpha would be ${ze('abG_a0', 3)}.`)),
      a(P('G2 der Stimmungs-Skala zuschlagen, weil G2 auch auf Komponente 1 lädt, und die Sorgfalts-Skala aus G3 und G5 bilden', 'Add G2 to the mood scale because G2 also loads on component 1, and build the carefulness scale from G3 and G5'),
        P('Seine Ladung auf die Sorgfalts-Komponente ist größer, und der Inhalt spricht auch für Sorgfalt. Die Doppelladung allein verschiebt die Frage nicht.', 'Its loading on the carefulness component is larger, and the content also speaks for carefulness. The double loading alone does not move the question.'))
    ],
    hilfe: [...HF, 'umpolen', 'reliabilitaet'], belege: ['wissen:umpolen-verfahren', 'wissen:itemselektion-nicht-mechanisch', 'wissen:alpha-itemzahl']
  }
];

/** Betrag mit drei Nachkommastellen im englischen Format. */
function zae3(k: string): string { return ze(k, 3).replace('-', ''); }
