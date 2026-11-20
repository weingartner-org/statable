/**
 * Leistungstabelle in „Über Statable“ (Johannes 31.10.): was Statable kann und womit es rechnet. Kein Vergleich mit anderen Programmen.
 * Der Rechenweg jeder Zeile ist im Code nachgesehen (31.10.2026). Die Namen in der zweiten Spalte werden nicht übersetzt. Die Zahlen prüft der Wächter `leistung.test.ts`.
 */
import { P, type Paar } from '../i18n/laufzeit';

const Z = (text: Paar, motor: string): [Paar, string] => [text, motor];
export interface LeistungsGruppe { titel: Paar; zeilen: [Paar, string][] }

/** Festwerte; der Wächter vergleicht sie mit dem Code. Artikel und Begriffe zählt `artikelListe` beim Laden (`ZAHL_ARTIKEL`, `ZAHL_BEGRIFFE`), denn die Liste der Begriffe wächst. */
export const ZAHL_ARTIKEL = '{artikel}', ZAHL_BEGRIFFE = '{begriffe}';
export const ZAHLEN = { fragen: 1065, themen: 41, kacheln: 11, labor: 9, probieren: 5, karten: 25, beispiele: 58, sprachen: 15 };

export const ZAHLEN_ZEILEN: [Paar, string][] = [
  [P('Hilfe-Artikel', 'Help articles'), ZAHL_ARTIKEL],
  [P('Begriffe A-Z', 'Terms A-Z'), ZAHL_BEGRIFFE],
  [P('Übungsfragen mit Erklärung', 'Practice questions with explanations'), String(ZAHLEN.fragen)],
  [P('Themen zum Üben', 'Practice topics'), String(ZAHLEN.themen)],
  [P('Kacheln unter „Verstehen“', 'Tiles under "Understand"'), String(ZAHLEN.kacheln)],
  [P('Versuche im Lernlabor', 'Experiments in the learning lab'), String(ZAHLEN.labor)],
  [P('Regler unter „Ausprobieren“', 'Sliders under "Try it out"'), String(ZAHLEN.probieren)],
  [P('Auswertungskarten', 'Analysis cards'), String(ZAHLEN.karten)],
  [P('Beispiel-Datensätze', 'Example data sets'), String(ZAHLEN.beispiele)],
  [P('Sprachen', 'Languages'), String(ZAHLEN.sprachen)]
];

const S = 'Statable', PS = 'PSPP', PPS = 'PSPP + Statable';

export const LEISTUNG: LeistungsGruppe[] = [
  { titel: P('Daten', 'Data'), zeilen: [
    Z(P('SPSS-Dateien lesen (.sav)', 'Read SPSS files (.sav)'), PS),
    Z(P('CSV, Excel und OpenDocument lesen, mit Blattwahl', 'Read CSV, Excel and OpenDocument, with sheet choice'), S),
    Z(P('Stata (.dta) und SAS (.sas7bdat, .xpt) lesen', 'Read Stata (.dta) and SAS (.sas7bdat, .xpt)'), S),
    Z(P('Codierungen aus MAXQDA, ATLAS.ti und NVivo einlesen', 'Read codings from MAXQDA, ATLAS.ti and NVivo'), S),
    Z(P('Daten von Eurostat laden', 'Load data from Eurostat'), S),
    Z(P('Daten aufbereiten mit Assistenten: umkodieren, berechnen, Fälle auswählen, sortieren, zusammenführen, aggregieren, Ränge, Datum und Zeit, doppelte und auffällige Fälle (21 Assistenten)', 'Prepare data with assistants: recode, calculate, select cases, sort, merge, aggregate, ranks, date and time, duplicate and conspicuous cases (21 assistants)'), S),
    Z(P('Umstrukturieren breit/lang', 'Restructure wide/long'), S),
    Z(P('Normwerte (z, T, IQ, Stanine, Prozentrang)', 'Norm scores (z, T, IQ, stanine, percentile rank)'), PS),
    Z(P('Datensätze vergleichen (Doppeleingabe)', 'Compare data sets (double entry)'), S),
    Z(P('Fehlende Werte ersetzen (Imputation)', 'Replace missing values (imputation)'), S),
    Z(P('Fehlen Werte zufällig? (Little-MCAR-Test)', 'Are values missing at random? (Little\'s MCAR test)'), S),
    Z(P('Gruppen angleichen (Propensity-Score-Matching)', 'Match groups (propensity score matching)'), S)
  ] },
  { titel: P('Beschreiben und Testen', 'Describing and testing'), zeilen: [
    Z(P('Häufigkeiten, Kennwerte, Kreuztabelle, χ²-Test', 'Frequencies, descriptives, crosstab, χ² test'), PS),
    Z(P('Mehrfachantworten', 'Multiple responses'), S),
    Z(P('t-Tests, Varianzanalyse (ANOVA), Levene-Test', 't tests, analysis of variance (ANOVA), Levene test'), PS),
    Z(P('Welch-ANOVA, Paarvergleiche (Tukey, Games-Howell, Bonferroni)', 'Welch ANOVA, pairwise comparisons (Tukey, Games-Howell, Bonferroni)'), S),
    Z(P('Rangtests (Mann-Whitney, Kruskal-Wallis, Dunn, Wilcoxon), auch exakt', 'Rank tests (Mann-Whitney, Kruskal-Wallis, Dunn, Wilcoxon), also exact'), S),
    Z(P('Friedman-, McNemar- und Cochran-Q-Test', 'Friedman, McNemar and Cochran Q tests'), S),
    Z(P('Äquivalenztest (TOST)', 'Equivalence test (TOST)'), S),
    Z(P('Dreifaktorielle Varianzanalyse', 'Three-way analysis of variance'), S),
    Z(P('Geplante Kontraste und Trendanalyse', 'Planned contrasts and trend analysis'), S),
    Z(P('Dunnett-Test (jede Gruppe gegen eine Kontrollgruppe)', 'Dunnett test (each group against a control group)'), S),
    Z(P('Permutationstest, Bootstrap-Intervalle (Perzentil, BCa)', 'Permutation test, bootstrap intervals (percentile, BCa)'), S),
    Z(P('Maße der Kreuztabelle (Gamma, Tau, Somers-d)', 'Crosstab measures (gamma, tau, Somers\' d)'), PPS),
    Z(P('Mantel-Haenszel, Breslow-Day', 'Mantel-Haenszel, Breslow-Day'), S),
    Z(P('Normalverteilung prüfen (Shapiro-Wilk, Lilliefors, Q-Q-Diagramm)', 'Check normality (Shapiro-Wilk, Lilliefors, Q-Q plot)'), S),
    Z(P('Prä-Post (gepaarter t-Test, Kovarianzanalyse, dz, d_av)', 'Pre-post (paired t test, analysis of covariance, dz, d_av)'), PPS),
    Z(P('Messwiederholung, gemischte Varianzanalyse (Mauchly, Greenhouse-Geisser)', 'Repeated measures, mixed ANOVA (Mauchly, Greenhouse-Geisser)'), S),
    Z(P('Effektstärken mit Konfidenzintervall', 'Effect sizes with confidence interval'), S),
    Z(P('Korrelation nach Pearson', 'Pearson correlation'), PS),
    Z(P('Spearman, Kendall, Korrelationsmatrix, Partialkorrelation', 'Spearman, Kendall, correlation matrix, partial correlation'), S),
    Z(P('Bayes-Faktoren', 'Bayes factors'), S),
    Z(P('Poweranalyse und Fallzahl (Studie planen)', 'Power analysis and sample size (plan a study)'), S),
    Z(P('QCA, Intercoder (Fleiss, Krippendorff), Fälle vergleichen, offene Antworten ordnen', 'QCA, intercoder agreement (Fleiss, Krippendorff), compare cases, sort open answers'), S)
  ] },
  { titel: P('Regression und Modelle', 'Regression and models'), zeilen: [
    Z(P('Lineare und logistische Regression', 'Linear and logistic regression'), PS),
    Z(P('Hierarchische Regression', 'Hierarchical regression'), PPS),
    Z(P('Regressionsdiagnose (VIF, Cook-Abstand, Durbin-Watson, auffällige Fälle)', 'Regression diagnostics (VIF, Cook\'s distance, Durbin-Watson, conspicuous cases)'), S),
    Z(P('Ordinale und multinomiale logistische Regression', 'Ordinal and multinomial logistic regression'), 'R (MASS, nnet)'),
    Z(P('Poisson- und negativ-binomiale Regression', 'Poisson and negative binomial regression'), 'R (MASS)'),
    Z(P('Quantilregression', 'Quantile regression'), 'R (quantreg) + Statable'),
    Z(P('Strafregression (Ridge, Lasso, Elastic Net)', 'Penalized regression (ridge, lasso, elastic net)'), 'R (glmnet) + Statable'),
    Z(P('Gewichtete, nichtlineare und Probit-Regression', 'Weighted, nonlinear and probit regression'), 'R'),
    Z(P('Entscheidungsbaum', 'Decision tree'), S),
    Z(P('Clusteranalyse (k-Means, hierarchisch)', 'Cluster analysis (k-means, hierarchical)'), 'R + Statable'),
    Z(P('Diskriminanzanalyse', 'Discriminant analysis'), 'R (MASS)'),
    Z(P('MANOVA, loglineare Modelle', 'MANOVA, loglinear models'), 'R'),
    Z(P('Mediation und Moderation (PROCESS-Modelle, Bootstrap)', 'Mediation and moderation (PROCESS models, bootstrap)'), PPS),
    Z(P('Mehrebenenmodelle', 'Multilevel models'), 'R (lme4, lmerTest)'),
    Z(P('Mehrebenenmodell für Ja/Nein (GLMM)', 'Multilevel model for yes/no (GLMM)'), 'R (lme4)'),
    Z(P('Korrespondenzanalyse, Karte der Fragen (MDS)', 'Correspondence analysis, map of the questions (MDS)'), S)
  ] },
  { titel: P('Skalen und Messen', 'Scales and measuring'), zeilen: [
    Z(P('Faktorenanalyse (explorativ)', 'Factor analysis (exploratory)'), PS),
    Z(P('Parallelanalyse', 'Parallel analysis'), S),
    Z(P('Cronbachs Alpha mit Intervall', 'Cronbach\'s alpha with interval'), PPS),
    Z(P('McDonalds Omega, konfirmatorische Faktorenanalyse', 'McDonald\'s omega, confirmatory factor analysis'), 'R (lavaan, psych, GPArotation)'),
    Z(P('Strukturgleichungsmodelle (SEM), Messinvarianz', 'Structural equation models (SEM), measurement invariance'), 'R (lavaan)'),
    Z(P('Rasch, 2PL, Stufenmodell, DIF (IRT)', 'Rasch, 2PL, graded response model, DIF (IRT)'), S),
    Z(P('Cohens Kappa, auch gewichtet', 'Cohen\'s kappa, also weighted'), PPS),
    Z(P('ICC, Bland-Altman', 'ICC, Bland-Altman'), S),
    Z(P('Methodenvergleich (Passing-Bablok, Deming, Typical Error)', 'Method comparison (Passing-Bablok, Deming, typical error)'), S)
  ] },
  { titel: P('Medizin und Überleben', 'Medicine and survival'), zeilen: [
    Z(P('ROC-Kurve, AUC, bester Schwellenwert (Youden)', 'ROC curve, AUC, best cut-off (Youden)'), PPS),
    Z(P('Sensitivität, Spezifität, Vorhersagewerte, Likelihood-Ratio', 'Sensitivity, specificity, predictive values, likelihood ratio'), S),
    Z(P('Kaplan-Meier, Log-Rank-Test, Sterbetafel', 'Kaplan-Meier, log-rank test, life table'), S),
    Z(P('Cox-Regression (auch zeitabhängig), AFT, Frailty', 'Cox regression (also time-dependent), AFT, frailty'), 'R (survival)'),
    Z(P('Meta-Analyse, Meta-Regression, Egger-Test', 'Meta-analysis, meta-regression, Egger test'), 'R (metafor)'),
    Z(P('Forest-Plot, Funnel-Plot', 'Forest plot, funnel plot'), S),
    Z(P('Zuteilungsliste (Randomisierung, als Lehrmittel)', 'Allocation list (randomization, as a teaching tool)'), S),
    Z(P('Einzelfallanalyse (NAP, Tau-U)', 'Single-case analysis (NAP, Tau-U)'), S)
  ] },
  { titel: P('Zeitreihen', 'Time series'), zeilen: [
    Z(P('ACF, PACF, Saisonzerlegung, Kreuzkorrelation', 'ACF, PACF, seasonal decomposition, cross-correlation'), S),
    Z(P('Prognose: ARIMA, auch automatisch, exponentielle Glättung', 'Forecast: ARIMA, also automatic, exponential smoothing'), 'R'),
    Z(P('Granger-Test, KPSS, Periodogramm', 'Granger test, KPSS, periodogram'), 'R')
  ] },
  { titel: P('Umfragen und amtliche Statistik', 'Surveys and official statistics'), zeilen: [
    Z(P('Umfragegewichte, komplexe Stichproben', 'Survey weights, complex samples'), 'R (survey)'),
    Z(P('Gewichte anpassen: Raking', 'Adjust weights: raking'), S),
    Z(P('Gewichte anpassen: Kalibrierung (GREG)', 'Adjust weights: calibration (GREG)'), 'R (survey, MASS)'),
    Z(P('Armut und Ungleichheit (Armutsquote, S80/S20, Gini)', 'Poverty and inequality (poverty rate, S80/S20, Gini)'), 'R (survey)'),
    Z(P('Indexzahlen (Laspeyres, Paasche, Basiswechsel)', 'Index numbers (Laspeyres, Paasche, rebasing)'), S),
    Z(P('Geheimhaltung in Tabellen, k-Anonymität', 'Confidentiality in tables, k-anonymity'), S),
    Z(P('Klassifikationen zuordnen (ÖNACE, ISCO-08)', 'Assign classifications (NACE, ISCO-08)'), S),
    Z(P('Gebietskarten', 'Area maps'), S)
  ] },
  { titel: P('Qualität und Technik', 'Quality and engineering'), zeilen: [
    Z(P('Regelkarten, Prozessfähigkeit (Cp, Cpk), Messsystemanalyse', 'Control charts, process capability (Cp, Cpk), measurement system analysis'), S),
    Z(P('Zählkarten (p, np, c, u)', 'Attribute control charts (p, np, c, u)'), S),
    Z(P('Kalibriergerade mit Nachweisgrenze (DIN 32645)', 'Calibration line with detection limit (DIN 32645)'), S),
    Z(P('Kurvenanpassung', 'Curve fitting'), S)
  ] },
  { titel: P('Lernen und Ausgabe', 'Learning and output'), zeilen: [
    Z(P('Verteilungen, Rechnen aus Kennzahlen, Simulationen', 'Distributions, calculating from summary numbers, simulations'), S),
    Z(P('Baumdiagramm, bedingte Wahrscheinlichkeit, Satz von Bayes', 'Tree diagram, conditional probability, Bayes\' theorem'), S),
    Z(P('SPSS-Befehle ausführen (.sps), im Umfang von PSPP', 'Run SPSS commands (.sps), within the range of PSPP'), PS),
    Z(P('Ergebnis in Worten, APA-Zeile, Diagramme, Export nach Word, PDF und Excel', 'Result in words, APA line, charts, export to Word, PDF and Excel'), S),
    Z(P('Tabelle zusammenstellen', 'Assemble a table'), S),
    Z(P('Tabelle für die Veröffentlichung', 'Table for publication'), S),
    Z(P('Befehlspalette (Strg+K)', 'Command palette (Ctrl+K)'), S),
    Z(P('Offline-Fassung zum Herunterladen', 'Offline version to download'), S)
  ] }
];
