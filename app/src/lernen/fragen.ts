/**
 * Üben: Fragen mit Erklärung (Fachblatt docs/fachblaetter/UEBEN-MC.md). Dieses Hauptpaket enthält nur Typen, die Themenliste
 * (Alltagsfrage, Fachbegriff, Zuordnung zu Hilfe-Artikeln, Zahl der Fragen) und die reine Ablauflogik. Die Fragen selbst stehen je Thema
 * in `fragen-<thema>.ts` und werden erst geladen, wenn man sie braucht.
 */
import { P, type Paar } from '../i18n/laufzeit';

/** `richtig`: bei der Fragenart „eine Antwort“ die richtige Antwort, bei „mehrere möglich“ (`Frage.mehrfach`) die Aussage, die stimmt. */
export interface Antwort { text: Paar; richtig?: true; warum: Paar }
export interface Tabelle { titel?: Paar; kopf: Paar[]; zeilen: (string | number)[][]; quelle: Paar }
/**
 * Diagramm zu einer Frage (Streudiagramm). Die Zahlen kommen wie bei Tabellen aus `lib/testdaten/ueben-erwartet.json` (Hilfe `diag(...)` in fragen-bau.ts), nie von Hand.
 * Farbe steht nie allein: jede Gruppe hat eigene Form (Kreis, Quadrat, Dreieck, Raute) und einen Namen in der Legende.
 * Jedes Diagramm hat eine Textfassung „Daten als Tabelle“ (bausteine/FrageDiagramm.svelte, lib/fragediagramm.ts): sie sagt für Screenreader und Braillezeile dasselbe wie die Grafik.
 */
export interface Diagramm {
  art: 'streu';
  /** Titel über dem Bild; nennt den Fachbegriff neben der Alltagsfrage, wenn das Bild eine Auswertung zeigt. */
  titel?: Paar;
  /** Achsentitel (waagrecht, senkrecht). */
  x: Paar; y: Paar;
  /** Name je Gruppe (höchstens 4); die Punkte tragen dann als dritten Wert den Gruppen-Index. */
  gruppen?: Paar[];
  /** `[x, y]` oder `[x, y, Gruppe]`. */
  punkte: number[][];
  /** Regressionsgerade y = a + b·x, für eine Gruppe oder (ohne `gruppe`) für alle Punkte. */
  geraden?: { a: number; b: number; gruppe?: number }[];
  /** Kurzbeschreibung des Bildes (zugänglicher Name): was man sieht, in einem bis zwei Sätzen. */
  kurz: Paar;
  quelle: Paar;
}
export interface Frage {
  id: string; thema: string;
  /** Kurze Frage; eine gesetzte Regel steht hier als „Angenommen, ...“. */
  stamm: Paar;
  tabelle?: Tabelle;
  /** Diagramm zur Frage (siehe `Diagramm`). */
  diagramm?: Diagramm;
  /** Gemeinsame Tabellen und Diagramme einer Fallreihe (Schlüssel in `FAELLE` des Themenmoduls). */
  fall?: string;
  /**
   * Zwei Fragenarten:
   *  - Standard (`mehrfach` fehlt): 3 bis 5 Antworten, genau 1 richtig, jede mit eigenem `warum`; man wählt eine.
   *  - „Welche Aussagen stimmen? (mehrere möglich)“ (`mehrfach: true`): genau 4 Aussagen, mindestens eine stimmt (`richtig`) und mindestens eine stimmt nicht,
   *    jede mit eigenem `warum`; man hakt an, was stimmt, und prüft. Die Frage zählt nur als richtig, wenn alle 4 Aussagen richtig eingeschätzt sind.
   *    Der Stamm nennt „Mehrere können stimmen.“ (die Oberfläche setzt den Hinweis dazu).
   */
  antworten: Antwort[];
  /** Fragenart „Welche Aussagen stimmen?“ (siehe `antworten`). */
  mehrfach?: true;
  /** Hilfe-Artikel- oder Begriff-id. */
  hilfe: string[];
  /** Nur Fragen der Abschlusstests: die Einheit, zu der „Noch einmal üben“ zurückführt, wenn die Frage nicht gelang. */
  zurueck?: string;
  /** Rechenkarte in Statable (Id aus lib/fach.ts). */
  karte?: string;
  /** Kachel unter „Verstehen“ zum Ausprobieren (zum Beispiel `gerade`). */
  probieren?: string;
  /** Quelle kurz, zum Beispiel „Sijtsma 2009“; oder `wissen:<id>` aus kurs-lokal/bibliothek/wissen.json. */
  belege: string[];
}
export interface ThemaModul { FRAGEN: Frage[]; FAELLE?: Record<string, { titel: Paar; tabellen: Tabelle[]; diagramme?: Diagramm[] }> }

export interface Thema {
  id: string;
  /** Die Alltagsfrage; der Fachbegriff steht immer dabei. */
  alltag: Paar; fach: Paar;
  /** Hilfe-Artikel, die zu diesem Thema gehören (Sprung von der Hilfe zum Üben und Suche). */
  hilfe: string[];
  /** Zahl der Fragen (der Test prüft sie gegen die Fragedatei). 0 = noch nicht geschrieben, das Thema erscheint nicht. */
  n: number;
  /** Erscheint nicht in der Themenliste von „Üben“ (Abschlusstests der Lernpfade). */
  verborgen?: true;
}

export const THEMEN: Thema[] = [
  { id: 'faktor', alltag: P('Messen meine Fragen dasselbe?', 'Do my questions measure the same thing?'), fach: P('Faktorenanalyse', 'Factor analysis'), hilfe: ['frage-faktor', 'faktorenanalyse', 'eigenwert-rotation', 'ladung', 'eigenwert', 'kommunalitaet', 'rotation', 'explorative-faktorenanalyse', 'bartlett-test', 'hauptkomponenten', 'fallzahl-faktorenanalyse'], n: 26 },
  { id: 'skala', alltag: P('Wie zuverlässig misst meine Skala?', 'How reliably does my scale measure?'), fach: P('Skala und Reliabilität (Cronbachs Alpha)', 'Scale and reliability (Cronbach\'s alpha)'), hilfe: ['frage-skala', 'reliabilitaet', 'trennschaerfe', 'omega', 'umpolen', 'inter-item-korrelation', 'eindimensionalitaet', 'reliabilitaet-wege', 'validitaet', 'antwortstufen'], n: 27 },
  { id: 'regression', alltag: P('Lässt sich etwas vorhersagen?', 'Can something be predicted?'), fach: P('Lineare Regression', 'Linear regression'), hilfe: ['frage-vorhersage', 'regression', 'koeffizient-b', 'beta', 'r-quadrat', 'abhaengige-groesse', 'kleinste-quadrate', 'standardfehler-schaetzer', 'kollinearitaet', 'dummy-variable', 'residuen', 'hebelwert', 'schrittweise-regression', 'extrapolation', 'lineares-modell', 'deckeneffekt', 'bodeneffekt', 'vif', 'toleranz', 'hedges-g'], n: 76 },
  { id: 'linmodell', alltag: P('Was haben t-Test, Varianzanalyse und Regression gemeinsam, und wie lege ich Daten und Diagramme richtig an?', 'What do the t test, analysis of variance and regression have in common, and how do I set up data and charts properly?'), fach: P('Das lineare Modell: Quadratsumme, Freiheitsgrade, Prüfgröße, Gruppenvergleich als Regression, Annahmen, Diagramme, Datenanlage', 'The linear model: sum of squares, degrees of freedom, test statistic, group comparison as regression, assumptions, charts, data setup'), hilfe: ['lm-modell-fehler', 'lm-freiheitsgrade', 'lm-signal-rauschen', 'lm-gruppen-regression', 'lm-annahmen', 'lm-diagramme', 'lm-daten-anlegen', 'statistisches-modell', 'signal-rausch-verhaeltnis', 'referenzgruppe', 'kennung', 'codebuch', 'abgeschnittene-achse', 'dreidimensionale-diagramme', 'linearitaet'], n: 49 },
  { id: 'regpruefen', alltag: P('Täuscht mein Regressionsergebnis, weil einzelne Fälle, überlappende Größen oder zu viele Größen mitspielen?', 'Does my regression result mislead because single cases, overlapping variables or too many variables play a part?'), fach: P('Regression prüfen: einflussreiche Fälle (Hebelwert, Cooks Distanz), eigener Beitrag (sr²), Überanpassung, Kreuzvalidierung, Korrelationen vergleichen (Fisher-z), Kollinearität (VIF), Kovarianzanalyse', 'Checking a regression: influential cases (leverage, Cook\'s distance), own contribution (sr²), overfitting, cross-validation, comparing correlations (Fisher z), collinearity (VIF), analysis of covariance'), hilfe: ['rp-einfluss', 'rp-beitrag', 'rp-ueberanpassung', 'rp-korrelationen-vergleichen'], n: 35 },
  { id: 'vavertiefen', alltag: P('Wie werte ich Gruppenvergleiche mit mehr als zwei Gruppen oder Faktoren genauer aus?', 'How do I evaluate group comparisons with more than two groups or factors more precisely?'), fach: P('Varianzanalyse vertiefen: geplante Vergleiche (Kontraste), Trendanalyse, Wechselwirkung, einfache Effekte, Sphärizität (Epsilon), Kontrollgruppe (Dunnett-Test) und Familienfehler', 'Deepening the analysis of variance: planned comparisons (contrasts), trend analysis, interaction, simple effects, sphericity (epsilon), control group (Dunnett test) and family-wise error'), hilfe: ['vv-kontraste', 'vv-trend', 'vv-wechselwirkung', 'vv-einfache-effekte', 'vv-sphaerizitaet', 'vv-dunnett'], n: 42 },
  { id: 'sauberforschen', alltag: P('Wie forsche ich so, dass mein Ergebnis zählt?', 'How do I do research so that my result counts?'), fach: P('Sauber forschen: Forschungskreislauf, p-Hacking, Vorregistrierung, Grundsätze zum p-Wert, Bayes mit Vorwissen (Prior, Posterior), Ergebnis in R nachrechnen (R-Skript)', 'Doing research cleanly: research cycle, p-hacking, preregistration, principles on the p value, Bayes with prior knowledge (prior, posterior), recalculating a result in R (R script)'), hilfe: ['sf-kreislauf', 'sf-p-hacking', 'sf-vorregistrierung', 'sf-p-grundsaetze', 'sf-bayes-vorwissen', 'forschungskreislauf', 'forschungsfreiheitsgrade', 'registrierter-bericht', 'familienfehlerrate', 'optionales-stoppen', 'beta-binomial-modell', 'prior-staerke', 'sf-r-skript'], n: 42 },
  { id: 'ml', alltag: P('Wie lernt ein Programm, neue Fälle vorherzusagen, und wie prüfe ich, ob es taugt?', 'How does a program learn to predict new cases, and how do I check whether it is any good?'), fach: P('Maschinelles Lernen: Trainings- und Testdaten, k-nächste Nachbarn, Standardisieren, Überanpassung, Kreuzvalidierung, Konfusionsmatrix', 'Machine learning: training and test data, k-nearest neighbours, standardising, overfitting, cross-validation, confusion matrix'), hilfe: ['ml-grundidee', 'ml-knn', 'ml-ueberanpassung', 'ml-konfusionsmatrix', 'maschinelles-lernen', 'trainingsdaten', 'kreuzvalidierung', 'klassifikationstabelle'], n: 19 },
  { id: 'wachstum', alltag: P('Wie verläuft die Veränderung bei jeder Person?', 'How does each person change over time?'), fach: P('Wachstumskurvenmodell (Latent Growth): Achsenabschnitt, Steigung, Streuung zwischen Personen, Passung', 'Growth curve model (latent growth): intercept, slope, variation between people, fit'), hilfe: ['wachstumskurvenmodell'], n: 5 },
  { id: 'klassen', alltag: P('Gibt es Gruppen mit ähnlichen Antworten?', 'Are there groups with similar answers?'), fach: P('Latente Klassen (Latent Class Analysis): Klassenzahl, BIC, Entropie', 'Latent classes (latent class analysis): number of classes, BIC, entropy'), hilfe: ['latente-klassen'], n: 6 },
  { id: 'profile', alltag: P('Gibt es Gruppen mit ähnlichem Muster?', 'Are there groups with a similar pattern?'), fach: P('Latente Profile (Mischung von Normalverteilungen): Gruppenzahl, BIC, Entropie', 'Latent profiles (mixture of normal distributions): number of groups, BIC, entropy'), hilfe: ['latente-profile'], n: 5 },
  { id: 'panel', alltag: P('Wie genau ist mein Ergebnis, wenn dieselben Einheiten mehrfach gemessen wurden?', 'How precise is my result when the same units were measured several times?'), fach: P('Paneldaten (feste und zufällige Effekte), cluster-robuste Standardfehler, Hausman-Test', 'Panel data (fixed and random effects), cluster-robust standard errors, Hausman test'), hilfe: ['paneldaten', 'cluster-robust', 'hausman-test'], n: 12 },
  { id: 'did', alltag: P('Wie prüfe ich, ob eine Maßnahme etwas verändert hat?', 'How do I check whether a measure changed anything?'), fach: P('Differenz-in-Differenzen: Behandelte und Vergleichsgruppe, gleichlaufende Trends', 'Difference-in-differences: treated and comparison group, parallel trends'), hilfe: ['differenz-in-differenzen'], n: 6 },
  { id: 'rd', alltag: P('Gibt es an einer Schwelle einen Sprung?', 'Is there a jump at a threshold?'), fach: P('Regressions-Diskontinuität: Schwelle, Bandbreite, lokal lineare Schätzung, Annahmen', 'Regression discontinuity: threshold, bandwidth, local linear estimation, assumptions'), hilfe: ['regressions-diskontinuitaet'], n: 6 },
  { id: 'iv', alltag: P('Wie rechne ich, wenn die Ursache selbst vom Ergebnis beeinflusst ist?', 'How do I calculate when the cause is itself influenced by the outcome?'), fach: P('Instrumentvariablen (2SLS): erste Stufe, schwache Instrumente, Wu-Hausman, Sargan', 'Instrumental variables (2SLS): first stage, weak instruments, Wu-Hausman, Sargan'), hilfe: ['instrumentvariablen'], n: 6 },
  { id: 'netzwerk', alltag: P('Welche Variablen hängen direkt zusammen?', 'Which variables are directly related?'), fach: P('Netzwerkanalyse (Partialkorrelationsnetz): Kanten, Stärke, Holm, Bootstrap', 'Network analysis (partial correlation network): edges, strength, Holm, bootstrap'), hilfe: ['netzwerkanalyse'], n: 5 },
  { id: 'inferenz', alltag: P('Wie sicher ist mein Ergebnis?', 'How certain is my result?'), fach: P('p-Wert, Konfidenzintervall, Fehlerarten, Teststärke, Effektstärke', 'p value, confidence interval, error types, power, effect size'), hilfe: ['p-wert', 'signifikanz', 'konfidenzintervall', 'standardfehler', 'standardabweichung', 'teststaerke', 'power', 'effektstaerke', 'fehlerarten', 'einseitig-zweiseitig', 'mehrfaches-testen', 'fehlerbalken', 'effekt-ueberschaetzung'], n: 33 },
  { id: 'gruppen', alltag: P('Unterscheiden sich Gruppen?', 'Do groups differ?'), fach: P('t-Test, Varianzanalyse, Paarvergleiche, Rangtests', 't test, analysis of variance, pairwise comparisons, rank tests'), hilfe: ['frage-gruppen', 'frage-posthoc', 'paarvergleich', 'welch-anova', 'rangtest', 'frage-praepost', 'gepaarte-messung', 'eta-quadrat', 'f-test', 'levene-test', 'gepoolter-t-test', 'zentraler-grenzwertsatz'], n: 23 },
  { id: 'korrelation', alltag: P('Hängen zwei Dinge zusammen?', 'Are two things related?'), fach: P('Korrelation (Pearson, Spearman)', 'Correlation (Pearson, Spearman)'), hilfe: ['frage-zusammenhang', 'korrelation', 'rangkorrelation', 'partialkorrelation', 'frage-partialkorrelation', 'anscombe-quartett', 'kovarianz', 'punktbiseriale-korrelation', 'fisher-z', 'zusammenhang-ursache'], n: 18 },
  { id: 'kreuz', alltag: P('Kommt etwas in Gruppen unterschiedlich oft vor?', 'Does something occur at different rates in different groups?'), fach: P('Kreuztabelle, Chi-Quadrat-Test, Odds Ratio', 'Crosstab, chi-square test, odds ratio'), hilfe: ['frage-kreuz', 'chi-quadrat', 'zusammenhangsmasse', 'risikomasse', 'odds-ratio', 'relatives-risiko', 'risikodifferenz', 'erwartete-haeufigkeit', 'zeilenprozent', 'simpson-paradox'], n: 13 },
  { id: 'wahrscheinlichkeit', alltag: P('Wie wahrscheinlich ist etwas, wenn schon etwas bekannt ist?', 'How likely is something when something else is already known?'), fach: P('Wahrscheinlichkeit, bedingte Wahrscheinlichkeit, Baumdiagramm, Satz von Bayes', 'Probability, conditional probability, tree diagram, Bayes\' theorem'), hilfe: ['baumdiagramm', 'bedingte-wahrscheinlichkeit', 'satz-von-bayes', 'totale-wahrscheinlichkeit', 'unabhaengigkeit', 'gegenereignis', 'laplace', 'wahrscheinlichkeit'], n: 20 },
  // Beschreiben und Verteilung (Stand 01.11.2026): Lerninhalte zu den Einheiten des Lernplans.
  { id: 'beschreiben', alltag: P('Wie fasse ich meine Zahlen zusammen, und wo steht ein Wert?', 'How do I summarise my numbers, and where does a value stand?'), fach: P('Skalenniveau, Mittelwert, Median, Standardabweichung, Histogramm, Boxplot, z-Wert', 'Scale level, mean, median, standard deviation, histogram, boxplot, z value'), hilfe: ['spalten-seite', 'skalenniveau', 'nominalskala', 'ordinalskala', 'intervallskala', 'verhaeltnisskala', 'metrisch', 'mittelwert', 'median', 'varianz', 'streuung', 'spannweite', 'quartil', 'iqr', 'modus', 'lagemass', 'frage-verteilung', 'histogramm', 'boxplot', 'schiefe', 'rechtsschief', 'linksschief', 'kurtosis', 'z-wert', 'standardisierung', 'normwerte', 'iq-skala', 'prozentrang'], n: 25 },
  { id: 'verteilung', alltag: P('Wie verteilen sich Werte und Mittelwerte, und weicht ein Anteil ab?', 'How are values and means distributed, and does a proportion deviate?'), fach: P('Normalverteilung, Binomial- und t-Verteilung, Stichprobenverteilung, Binomialtest', 'Normal, binomial and t distribution, sampling distribution, binomial test'), hilfe: ['normalverteilung', 'standardnormalverteilung', 'empirische-regel', 'wahrscheinlichkeitsverteilung', 'dichtefunktion', 'verteilungsfunktion', 'binomialverteilung', 'poisson-verteilung', 't-verteilung', 'chi-quadrat-verteilung', 'f-verteilung', 'gleichverteilung', 'hypergeometrische-verteilung', 'stichprobenverteilung', 'stichprobenfehler', 'binomialtest', 'anteil'], n: 23 },
  // Neue Einheiten (Stand 01.11.2026): logistische Regression, Daten, Planen, Vergleichen, Messen.
  { id: 'logistisch', alltag: P('Wovon hängt ein Ja/Nein-Ergebnis ab, und wie gut passt das Modell?', 'What does a yes/no outcome depend on, and how well does the model fit?'), fach: P('Logistische Regression (Odds Ratio, Likelihood-Ratio-Test, Pseudo-R²), mehrere Kategorien, Zähldaten', 'Logistic regression (odds ratio, likelihood-ratio test, pseudo R²), several categories, count data'), hilfe: ['logistische-regression', 'log-odds', 'logit', 'odds', 'multinomiale-regression', 'zaehldaten-regression', 'poisson-regression', 'negativ-binomial-regression'], n: 19 },
  { id: 'daten', alltag: P('Wie bereite ich meine Daten vor, und was tue ich mit fehlenden oder auffälligen Werten?', 'How do I prepare my data, and what do I do with missing or conspicuous values?'), fach: P('Umkodieren, Umpolen, Skalenwert, fehlende Werte, Ausreißer und Hebelwert', 'Recoding, reverse-coding, scale score, missing values, outliers and leverage'), hilfe: ['klassen-bilden', 'skalenwert', 'likert-skala', 'fehlende-werte', 'fehlendcode', 'imputation', 'multiple-imputation', 'ausreisser-regel', 'grubbs', 'cooks-distanz'], n: 13 },
  { id: 'planen', alltag: P('Wie plane ich eine Studie: Verfahren, Fallzahl, Stichprobe und Design?', 'How do I plan a study: method, sample size, sample and design?'), fach: P('Verfahrenswahl, Fallzahl (Poweranalyse), Zufalls-, Schicht- und Klumpenstichprobe, Randomisierung', 'Choice of method, sample size (power analysis), random, stratified and cluster sample, randomisation'), hilfe: ['blatt-seite', 'voraussetzungen-pruefen', 'fallzahlplanung', 'a-priori-power', 'gpower', 'stichprobe', 'repraesentativ', 'zufallsstichprobe', 'geschichtete-stichprobe', 'klumpenstichprobe', 'einfache-zufallsstichprobe', 'stichprobenplan', 'umfrage-stichprobenplan', 'randomisierung', 'blockrandomisierung', 'beobachtungsstudie', 'experiment', 'drittvariable'], n: 20 },
  { id: 'vergleich', alltag: P('Unterscheiden sich Gruppen oder Zeitpunkte, und darf ich diesen Test rechnen?', 'Do groups or time points differ, and may I run this test?'), fach: P('Messwiederholung, McNemar-Test, Voraussetzungen von t-Test und Varianzanalyse, Effektstärke, Welch-Test, Rangtests', 'Repeated measures, McNemar test, assumptions of the t test and analysis of variance, effect size, Welch test, rank tests'), hilfe: ['frage-messwiederholung', 'anova-messwiederholung', 'sphaerizitaet', 'greenhouse-geisser', 'friedman-test', 'mcnemar-test-cochran-q', 'cochran-q', 'shapiro-wilk', 'voraussetzung', 'cohens-d', 'cohen-konventionen', 'rangtests-weitere', 'verteilungsfrei', 'nichtparametrisch'], n: 20 },
  { id: 'messen', alltag: P('Urteilen zwei Personen gleich, und wie gut taugt eine Aufgabe?', 'Do two people judge alike, and how well does a task work?'), fach: P('Übereinstimmung (Kappa), Itemschwierigkeit, Itemvarianz, Trennschärfe', 'Agreement (kappa), item difficulty, item variance, item-total correlation'), hilfe: ['frage-uebereinstimmung', 'kappa', 'krippendorff-alpha', 'fleiss-kappa', 'icc', 'bland-altman', 'item', 'itemanalyse', 'itemschwierigkeit', 'itemparameter'], n: 7 },
  { id: 'fragebogenbau', alltag: P('Wie misst man etwas, das man nicht sieht, und misst mein Fragebogen, was er messen soll?', 'How do you measure something you cannot see, and does my questionnaire measure what it should?'), fach: P('Konstrukt, Item, Skala; Validität und Reliabilität', 'Construct, item, scale; validity and reliability'), hilfe: ['konstrukt', 'fragebogen', 'operationalisierung', 'inhaltsvaliditaet', 'kriteriumsvaliditaet', 'konstruktvaliditaet', 'augenscheinvaliditaet', 'konvergente-validitaet', 'diskriminante-validitaet', 'retest-reliabilitaet', 'suggestivfrage', 'faking'], n: 54 },
  // Fachthemen (Stand 31.10.2026). Technik: Begriffe seit 31.10., Rechenkarten gibt es dazu noch nicht.
  { id: 'medizin', alltag: P('Wie verlässlich ist ein Test, eine Behandlung, eine Studienlage?', 'How reliable is a test, a treatment, a body of studies?'), fach: P('Sensitivität, Spezifität, Vorhersagewerte, Likelihood-Ratio, Kaplan-Meier, Hazard Ratio, Heterogenität (I²)', 'Sensitivity, specificity, predictive values, likelihood ratio, Kaplan-Meier, hazard ratio, heterogeneity (I²)'), hilfe: ['sensitivitaet', 'spezifitaet', 'vorhersagewert', 'roc-kurve', 'roc-auc', 'frage-kaplanmeier', 'kaplan-meier', 'zensierung', 'median-ueberlebenszeit', 'ueberlebensfunktion', 'hazard-ratio', 'log-rank', 'cox-regression', 'frage-meta', 'i-quadrat', 'tau-quadrat', 'forest-plot', 'likelihood-ratio'], n: 19 },
  { id: 'technik', alltag: P('Läuft mein Prozess stabil und genau genug?', 'Does my process run stably and accurately enough?'), fach: P('Regelkarten, Prozessfähigkeit (Cp, Cpk), Messsystem, Versuchsplanung', 'Control charts, process capability (Cp, Cpk), measurement system, design of experiments'), hilfe: ['regelkarte', 'prozessfaehigkeit', 'messsystem', 'versuchsplanung'], n: 12 },
  { id: 'biologie', alltag: P('Sind meine Daten sauber ausgewertet?', 'Are my data analysed cleanly?'), fach: P('Pseudoreplikation und gemischte Modelle, Daten prüfen, Effektgrößen', 'Pseudoreplication and mixed models, checking data, effect sizes'), hilfe: ['frage-mehrebenen', 'icc-mehrebenen', 'ausreisser', 'normalverteilung-pruefen', 'qq-diagramm', 'pseudoreplikation'], n: 10 },
  { id: 'psychologie', alltag: P('Wirkt etwas bei manchen anders, und wie verlässlich ist der Befund?', 'Does something work differently for some people, and how reliable is the finding?'), fach: P('Moderation und Mediation, Teststärke, falsch positive Befunde, kleine Stichproben', 'Moderation and mediation, power, false positive findings, small samples'), hilfe: ['frage-moderation', 'moderation', 'frage-mediation', 'mediation', 'falsch-positive-befunde', 'messfehler'], n: 10 },
  { id: 'wirtschaft', alltag: P('Taugen Regression, Prognose und Index für meine Zahlen?', 'Do regression, forecast and index suit my figures?'), fach: P('Heteroskedastie, Scheinregression, Prognosegüte (MAPE, MASE), Preisindex', 'Heteroskedasticity, spurious regression, forecast accuracy (MAPE, MASE), price index'), hilfe: ['indexzahlen', 'zeitreihe-prognose', 'frage-zeitreihen', 'heteroskedastizitaet', 'scheinregression', 'prognoseguete', 'preisindex'], n: 8 },
  { id: 'verfahren', alltag: P('Welcher weitere Weg passt zu meiner Frage, und was sagt seine Ausgabe?', 'Which further route suits my question, and what does its output say?'), fach: P('Äquivalenztest (TOST), Permutationstest, Bootstrap, Bayes-Faktor, Anpassungstests, Vielfalt, Mehrfachantworten, Kovarianzanalyse, hierarchische Regression, Reliable Change Index', 'Equivalence test (TOST), permutation test, bootstrap, Bayes factor, goodness-of-fit tests, diversity, multiple responses, analysis of covariance, hierarchical regression, reliable change index'), hilfe: ['aequivalenztest-tost', 'zufallsverfahren-permutation', 'bootstrap-intervalle', 'bayes-faktor', 'anpassungstests', 'vielfalt-diversitaet', 'frage-mehrfachantworten', 'kovarianzanalyse', 'hierarchische-regression', 'reliable-change-index'], n: 21 },
  { id: 'modelle', alltag: P('Welches Modell passt zu meiner Zielgröße, und wie lese ich es?', 'Which model suits my outcome, and how do I read it?'), fach: P('Quantilregression, Ridge und Lasso, ordinale Regression, Probit, gewichtete und nichtlineare Regression, Sterbetafel, Cox-Regression, AFT-Modell', 'Quantile regression, ridge and lasso, ordinal regression, probit, weighted and nonlinear regression, life table, Cox regression, AFT model'), hilfe: ['quantilregression', 'strafregression', 'ordinale-regression', 'probit-regression', 'gewichtete-regression', 'nichtlineare-regression', 'sterbetafel', 'cox-zeitabhaengig', 'aft-modell', 'cox-frailty'], n: 15 },
  { id: 'karten', alltag: P('Was leistet diese Auswertungskarte, und was sagt ihr Ergebnis?', 'What does this analysis card do, and what does its result say?'), fach: P('Korrelationsmatrix, Clusteranalyse, Diskriminanzanalyse, loglineare Modelle, MANOVA, Armut und Ungleichheit, Einzelfallanalyse, offene Antworten, Fallvergleich, Intercoder-Übereinstimmung', 'Correlation matrix, cluster analysis, discriminant analysis, loglinear models, MANOVA, poverty and inequality, single-case analysis, open answers, case comparison, intercoder agreement'), hilfe: ['frage-korrmatrix', 'frage-cluster', 'frage-diskriminanz', 'frage-loglinear', 'frage-manova', 'frage-armut', 'frage-einzelfall', 'frage-kategorien', 'frage-faelle', 'intercoder', 'methodenvergleich'], n: 24 },
  { id: 'zeit', alltag: P('Was zeigen die weiteren Wege für Zeitreihen?', 'What do the further routes for time series show?'), fach: P('Kreuzkorrelation, unterbrochene Zeitreihe, Granger-Test, Saisonbereinigung', 'Cross-correlation, interrupted time series, Granger test, seasonal adjustment'), hilfe: ['zeitreihe-kreuzkorrelation', 'zeitreihe-massnahme', 'zeitreihe-granger', 'saisonbereinigung-r'], n: 8 },
  { id: 'datenwerkzeuge', alltag: P('Welcher Daten-Assistent passt zu meiner Aufgabe?', 'Which data assistant suits my task?'), fach: P('Zusammenführen, Aggregieren, Doppelte Fälle, Datensätze vergleichen, Abgleich, Fälle auswählen, Sortieren, Fehlendcodes, Plausibilität, Klassifikation, Mikrodaten, Befehle', 'Merge, aggregate, duplicate cases, compare datasets, matching, select cases, sort, missing codes, plausibility, classification, microdata, commands'), hilfe: ['daten-vorbereiten', 'keine-angabe-bereich', 'daten-check', 'plausibilitaet', 'eigenschaften-uebernehmen', 'datensaetze-vergleichen', 'verschieben-glaetten', 'fallkontrolle-abgleich', 'klassifikation', 'mikrodaten-schuetzen', 'excel-blatt-uhrzeit', 'spss-menue', 'befehle-seite'], n: 29 },
  { id: 'rechner', alltag: P('Was zeigen die Rechner, das Lernlabor und die Werkzeuge zum Berichten?', 'What do the calculators, the learning lab and the reporting tools show?'), fach: P('Verteilungen, Kennzahlen, Anteilstest, Kennlinie, Zuteilung, Lernlabor, Fallzahl, Ergebnissatz, Diagramme, Tabelle für die Veröffentlichung', 'Distributions, summary numbers, test for a proportion, characteristic curve, allocation, learning lab, sample size, result sentence, charts, table for publication'), hilfe: ['verstehen-verteilungen', 'verstehen-kennzahlen', 'verstehen-anteilstest', 'verstehen-kennlinie', 'verstehen-zuteilung', 'lernlabor', 'fallzahl-ergaenzen', 'ergebnissatz', 'diagramm-anpassen', 'tabelle-veroeffentlichung', 'balken-mittelwerte'], n: 18 },
  { id: 'erheben', alltag: P('Wie erhebe ich Daten, wie wähle ich Fälle für Interviews, und wie führe ich Zahlen und Aussagen zusammen?', 'How do I collect data, choose cases for interviews and bring numbers and statements together?'), fach: P('Erhebungsmethode, Datenimport und Plausibilitätsprüfung, Fallauswahl (extrem, typisch, abweichend, divers), Meta-Inferenz (Bestätigung, Erweiterung, Widerspruch)', 'Data collection method, data import and plausibility check, case selection (extreme, typical, deviant, diverse), meta-inference (confirmation, expansion, discordance)'), hilfe: ['eh-methode', 'eh-daten-einlesen', 'eh-faelle-interviews', 'eh-meta-inferenz', 'eh-fragebogen-aufbau', 'eh-antwortformate', 'eh-fragebogen-pruefen', 'eh-kodebuch', 'eh-barrierefrei-befragen', 'eh-papier-eingeben', 'eh-online-oder-papier', 'eh-ruecklauf', 'eh-anonym-pseudonym', 'eh-datenschutz-ohne-server', 'eh-leitfaden', 'eh-transkriptionsregeln', 'eh-redeanteile', 'eh-kodierleitfaden', 'eh-beobachten', 'eh-uebereinstimmung-segmente', 'eh-konsens', 'eh-fall-code-matrix', 'eh-pseudonymisieren', 'eh-transkription-genau', 'eh-interviewprotokoll', 'eh-gedaechtnisprotokoll', 'eh-einwilligung-prozess', 'dmp-planen', 'prereg-planen', 'ta-woerter-zaehlen', 'delphi', 'q-methode', 'concept-mapping', 'eh-kodieren', 'eh-kodieren-tasten', 'eh-memos', 'eh-fallvariablen', 'eh-kodieren-ansichten', 'eh-fall-kategorie-matrix', 'eh-aehnliche-stellen', 'eh-fs-paradigma', 'eh-fs-manifest-latent', 'eh-fs-sinneinheiten', 'eh-fs-spalten', 'eh-fs-lesarten', 'eh-fs-zwischenfazit', 'eh-fs-software', 'eh-verfahren', 'eh-guetekriterien-quali', 'eh-ki-offenlegen', 'eh-thematische-analyse', 'eh-framework-methode', 'eh-grounded-theory-memos', 'eh-ipa-einzelfall', 'eh-mm-designs', 'eh-mm-integration', 'eh-joint-display', 'eh-fragebogen-aus-interviews', 'eh-qualitativ-berichten', 'papierbogen-scannen'], n: 236 },
  { id: 'abschluss', alltag: P('Kann ich Ergebnistabellen aus der Praxis lesen und deuten?', 'Can I read and interpret result tables from practice?'), fach: P('Abschlusstests der Lernpfade: Regression, Faktorenanalyse, Reliabilität', 'Final tests of the learning paths: regression, factor analysis, reliability'), hilfe: [], n: 33, verborgen: true },
  // Psychometrie-Einheiten der Stufe 4 „nutzen“ (IRT, CFA, Messinvarianz, Pfadmodell, Karte der Fragen): 19 Fragen, sie stehen in den Einheiten des Lernplans.
  { id: 'nutzenpsy', alltag: P('Wie deute ich Ergebnisse aus Rasch-Modell, CFA, Messinvarianz und Pfadmodell?', 'How do I interpret results from the Rasch model, CFA, measurement invariance and path model?'), fach: P('Item-Response-Theorie, konfirmatorische Faktorenanalyse, Messinvarianz, Pfadmodell, Karte der Fragen', 'Item response theory, confirmatory factor analysis, measurement invariance, path model, map of the questions'), hilfe: [], n: 23, verborgen: true },
  // Stufe 4 „nutzen“ (09.11.2026): übrige Einheiten und Abschnitte; die Fragen stehen in Einheiten des Lernplans, nicht in der Themenliste.
  { id: 'nutzenb', alltag: P('Was sagt das Ergebnis dieses weiteren Verfahrens?', 'What does the result of this further procedure say?'), fach: P('Fehlende Werte, robuste Verfahren, Propensity-Matching, Kalibriergerade, Referenzbereich, Korrespondenzanalyse und weitere Abschnitte', 'Missing values, robust procedures, propensity matching, calibration line, reference range, correspondence analysis and further sections'), hilfe: [], n: 37, verborgen: true },
  // Fallreihen zu den echten Beispielen (Stufe 2.3 „nutzen“, 09.11.2026): 18 Beispiele, je 2 bis 4 Fragen; sie stehen in den Einheiten des Lernplans, nicht in der Themenliste.
  { id: 'beispiele', alltag: P('Was sagt die Ergebnistabelle eines echten Beispiels?', 'What does the result table of a real example say?'), fach: P('Echte Beispiele deuten: Odds Ratio, Simpson-Paradox, Regression zur Mitte, Varianzanalyse, Kollinearität, Überleben, ROC, Mehrebenen, Kappa, Zähldaten, Autokorrelation, Äquivalenz, Gini', 'Interpreting real examples: odds ratio, Simpson\'s paradox, regression to the mean, analysis of variance, collinearity, survival, ROC, multilevel, kappa, count data, autocorrelation, equivalence, Gini'), hilfe: [], n: 54, verborgen: true },
  // Psychologie, zweites Paket (Stufe 6.3 „nutzen“, 09.11.2026): Fallreihen zu den acht neuen Psychologie-Beispielen, Begriffsfragen und offene Antworten; sie stehen in den Einheiten des Lernplans, nicht in der Themenliste.
  { id: 'psychologie2', alltag: P('Was sagt das Ergebnis einer psychologischen Studie, und was sagt es nicht?', 'What does the result of a psychological study say, and what does it not say?'), fach: P('Psychologie deuten: Varianzanalyse, Kovarianzanalyse, Skalen, Moderation, Mediation, logistische Regression, Mehrebenen, offene Antworten, Fehldeutungen von p, Konfidenzintervall und Effektstärke', 'Interpreting psychology: analysis of variance, analysis of covariance, scales, moderation, mediation, logistic regression, multilevel models, open answers, misinterpretations of p, confidence interval and effect size'), hilfe: [], n: 81, verborgen: true },
  // Usability Stufe 6a (10.11.2026): vier Prüfschritte Messen (Inhalt, Faktorenanalyse, Reliabilitätsanalyse, alles zusammen); die Fragen stehen in den Einheiten des Lernplans.
  { id: 'pruefschritte', alltag: P('Passt die Frage nach Inhalt, Ladung und Alpha in meine Skala?', 'Does the question fit my scale by content, loading and alpha?'), fach: P('Prüfschritte einer Skala: Inhalt, Faktorenanalyse, Reliabilitätsanalyse, alles zusammen', 'Checking steps of a scale: content, factor analysis, reliability analysis, everything together'), hilfe: [], n: 25, verborgen: true }
];

/** Die Themen mit Fragen. */
export const sichtbareThemen = (): Thema[] => THEMEN.filter(t => t.n > 0 && !t.verborgen);

/** Das Thema zu einem Hilfe-Artikel (oder Begriff), falls es Fragen gibt. */
export const themaFuerHilfe = (id: string): Thema | undefined => THEMEN.find(t => t.n > 0 && t.hilfe.includes(id));

/** Die Fragen eines Themas, erst bei Bedarf. */
const LADER: Record<string, () => Promise<ThemaModul>> = {
  faktor: () => import('./fragen-faktor'),
  skala: () => import('./fragen-skala'),
  regression: () => import('./fragen-regression'),
  linmodell: () => import('./fragen-lineares-modell'),
  regpruefen: () => import('./fragen-regression-pruefen'),
  vavertiefen: () => import('./fragen-varianzanalyse-vertiefen'),
  sauberforschen: () => import('./fragen-sauber-forschen'),
  ml: () => import('./fragen-ml'),
  wachstum: () => import('./fragen-wachstum'),
  netzwerk: () => import('./fragen-netzwerk'),
  profile: () => import('./fragen-profile'),
  klassen: () => import('./fragen-klassen'),
  panel: () => import('./fragen-panel'),
  iv: () => import('./fragen-iv'),
  rd: () => import('./fragen-rd'),
  did: () => import('./fragen-did'),
  inferenz: () => import('./fragen-inferenz'),
  gruppen: () => import('./fragen-gruppen'),
  korrelation: () => import('./fragen-korrelation'),
  kreuz: () => import('./fragen-kreuz'),
  wahrscheinlichkeit: () => import('./fragen-wahrscheinlichkeit'),
  beschreiben: () => import('./fragen-beschreiben'),
  verteilung: () => import('./fragen-verteilung'),
  logistisch: () => import('./fragen-logistisch'),
  daten: () => import('./fragen-daten'),
  planen: () => import('./fragen-planen'),
  vergleich: () => import('./fragen-vergleich'),
  messen: () => import('./fragen-messen'),
  fragebogenbau: () => import('./fragen-fragebogenbau'),
  medizin: () => import('./fragen-medizin'),
  technik: () => import('./fragen-technik'),
  biologie: () => import('./fragen-biologie'),
  psychologie: () => import('./fragen-psychologie'),
  wirtschaft: () => import('./fragen-wirtschaft'),
  verfahren: () => import('./fragen-verfahren'),
  modelle: () => import('./fragen-modelle'),
  karten: () => import('./fragen-karten'),
  zeit: () => import('./fragen-zeit'),
  datenwerkzeuge: () => import('./fragen-datenwerkzeuge'),
  rechner: () => import('./fragen-rechner'),
  erheben: () => import('./fragen-erheben'),
  abschluss: () => import('./fragen-abschluss'),
  beispiele: () => import('./fragen-beispiele-echt'),
  nutzenpsy: () => import('./fragen-nutzen-psychometrie'),
  nutzenb: () => import('./fragen-nutzen-b'),
  psychologie2: () => import('./fragen-psychologie-2'),
  pruefschritte: () => import('./fragen-pruefschritte')
};
export const ladeThema = (id: string): Promise<ThemaModul> => {
  const l = LADER[id];
  return l ? l() : Promise.reject(new Error(`Unbekanntes Thema: ${id}`));
};

// ---- Ablauf (rein, ohne Oberfläche) ----

/** Fisher-Yates mit übergebenem Zufallsgenerator (`lib/zufall.ts`); verändert die Eingabe nicht. */
export function mische<T>(liste: readonly T[], rnd: () => number): T[] {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
}

/** Antworten einer Frage in gemischter Reihenfolge; `nr` ist der Platz in der Fragedatei. */
export interface Gemischt { nr: number; a: Antwort }
export const mischeAntworten = (f: Frage, rnd: () => number): Gemischt[] => mische(f.antworten.map((a, nr) => ({ nr, a })), rnd);

/**
 * Eine Runde: höchstens `max` Fragen (Standard 10). Fragen einer Fallreihe bleiben beieinander und in ihrer Reihenfolge;
 * Einzelfragen und Fallreihen werden gemischt. Hat das Thema weniger Fragen, kommen alle dran.
 */
export function baueRunde(fragen: readonly Frage[], rnd: () => number, max = 10): Frage[] {
  const einheiten: Frage[][] = [];
  const faelle = new Map<string, Frage[]>();
  for (const f of fragen) {
    if (!f.fall) { einheiten.push([f]); continue; }
    let g = faelle.get(f.fall);
    if (!g) { g = []; faelle.set(f.fall, g); einheiten.push(g); }
    g.push(f);
  }
  const aus: Frage[] = [];
  for (const e of mische(einheiten, rnd)) if (aus.length + e.length <= max) aus.push(...e);
  return aus;
}

/** `gewaehlt`: bei einer Frage mit einer Antwort deren Platz in der Fragedatei; bei „mehrere möglich“ die Plätze der Aussagen, die als „stimmt“ angehakt wurden. */
export interface Antwortstand { frage: Frage; gewaehlt: number | readonly number[] }
/** Bei „mehrere möglich“: je Aussage, ob sie richtig eingeschätzt wurde (angehakt = stimmt, und sie stimmt; nicht angehakt, und sie stimmt nicht). */
export const eingeschaetzt = (f: Frage, gewaehlt: readonly number[]): boolean[] => f.antworten.map((a, i) => gewaehlt.includes(i) === !!a.richtig);
export const istRichtig = (x: Antwortstand): boolean =>
  typeof x.gewaehlt === 'number' ? !!x.frage.antworten[x.gewaehlt]?.richtig && !x.frage.mehrfach : !!x.frage.mehrfach && eingeschaetzt(x.frage, x.gewaehlt).every(Boolean);
export const zaehleRichtig = (l: readonly Antwortstand[]): number => l.filter(istRichtig).length;
/** „Falsche noch einmal“: genau die Fragen, die falsch beantwortet wurden. Die Tabellen einer Fallreihe gehören zur Frage (`fall`) und stehen auch dann dabei, wenn die anderen Fragen der Reihe fehlen. */
export function falscheNochEinmal(l: readonly Antwortstand[]): Frage[] {
  return l.filter(x => !istRichtig(x)).map(x => x.frage);
}

/**
 * Ausgewählte Fragen (zum Beispiel die einer Lerneinheit) aus einem oder mehreren Themenmodulen, in der Reihenfolge von `ids`.
 * Die Tabellen der Fallreihen aller beteiligten Module stehen dabei.
 */
export async function ladeAuswahl(themen: readonly string[], ids: readonly string[]): Promise<ThemaModul> {
  const module = await Promise.all(themen.map(ladeThema));
  const nach = new Map(module.flatMap(m => m.FRAGEN).map(f => [f.id, f] as const));
  return { FRAGEN: ids.map(i => nach.get(i)).filter((f): f is Frage => !!f), FAELLE: Object.assign({}, ...module.map(m => m.FAELLE ?? {})) };
}
