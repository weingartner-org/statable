/**
 * Üben: Wovon hängt ein Ja/Nein-Ergebnis ab, und wie gut passt das Modell? (logistische Regression, Güte, mehrere Kategorien, Zähldaten).
 * Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R, Daten aus
 * MASS::Pima.tr/Pima.te, housing und datasets::warpbreaks). Belege: wissen.json (Backhaus Kap. 5, Mood 2009, Dormann Kap. 7, Bernal u. a. 2017, Lumley 2002).
 * Mehrere Kategorien und Zähldaten: nur, was an der Seite gelesen ist (multinomial: Backhaus; Poisson: Dormann, Kohn, Bernal). Zur ordinalen Regression gibt es keine Quelle, darum keine Frage.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, zd, ze, zn } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

const QUELLE_PIMA = P(
  'Daten: MASS::Pima.tr und Pima.te (Smith u. a. 1988; Paket MASS, Lizenz GPL), 532 Frauen mit Pima-Herkunft nahe Phoenix (USA), Diabetes nach WHO-Kriterien. Berechnet mit R.',
  'Data: MASS::Pima.tr and Pima.te (Smith et al. 1988; package MASS, licence GPL), 532 women of Pima heritage near Phoenix (USA), diabetes by WHO criteria. Computed with R.');
const QUELLE_MIET = P(
  'Daten: MASS::housing (Madsen 1976; Paket MASS, Lizenz GPL), 1681 Mieter in Kopenhagen, Zufriedenheit (niedrig, mittel, hoch) und Kontakt zu anderen Bewohnern. Berechnet mit R (nnet::multinom).',
  'Data: MASS::housing (Madsen 1976; package MASS, licence GPL), 1681 tenants in Copenhagen, satisfaction (low, medium, high) and contact with other residents. Computed with R (nnet::multinom).');
const QUELLE_FADEN = P(
  'Daten: datasets::warpbreaks (Tippett 1950; Teil von R, Lizenz GPL), Fadenbrüche je Webstuhl bei drei Spannungen (niedrig, mittel, hoch), je 18 Webstühle. Berechnet mit R.',
  'Data: datasets::warpbreaks (Tippett 1950; part of R, licence GPL), yarn breaks per loom at three tensions (low, medium, high), 18 looms each. Computed with R.');

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'log-bmi': {
    titel: P('Diabetes nach BMI-Gruppe und logistische Regression', 'Diabetes by BMI group and logistic regression'),
    tabellen: [
      tab('log-bmi.0', [P('Gruppe', 'Group'), P('Frauen', 'Women'), P('mit Diabetes', 'with diabetes'), P('Anteil', 'Share'), P('Odds', 'Odds')], QUELLE_PIMA,
        P('Diabetes nach BMI-Gruppe (Odds = Anteil geteilt durch Gegenanteil)', 'Diabetes by BMI group (odds = share divided by complementary share)')),
      tab('log-bmi.1', [P('Größe', 'Variable'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('p', 'p'), P('Exp(B)', 'Exp(B)')], QUELLE_PIMA,
        P('Logistische Regression: Diabetes (Ja = 1) nach BMI-Gruppe', 'Logistic regression: diabetes (yes = 1) by BMI group'))
    ]
  },
  'log-glu': {
    titel: P('Diabetes nach Glukose, BMI und Alter', 'Diabetes by glucose, BMI and age'),
    tabellen: [
      tab('log-glu.0', [P('Größe', 'Variable'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('p', 'p'), P('Exp(B)', 'Exp(B)')], QUELLE_PIMA,
        P('Logistische Regression: Diabetes (Ja = 1)', 'Logistic regression: diabetes (yes = 1)')),
      tab('log-glu.1', [P('Glukose (mg/dl)', 'Glucose (mg/dl)'), P('Wahrscheinlichkeit Diabetes', 'Probability of diabetes'), P('Zuwachs gegenüber der Zeile davor', 'Increase over the row before'), P('Odds', 'Odds')], QUELLE_PIMA,
        P('Vorhergesagte Wahrscheinlichkeit bei mittlerem BMI und mittlerem Alter', 'Predicted probability at average BMI and average age'))
    ]
  },
  'log-guete': {
    titel: P('Güte des Modells für Diabetes (Glukose, BMI, Alter, Stammbaumwert)', 'Fit of the model for diabetes (glucose, BMI, age, pedigree value)'),
    tabellen: [
      tab('log-guete.0', [P('Kennzahl', 'Statistic'), P('Wert', 'Value')], QUELLE_PIMA, P('Modellgüte', 'Model fit')),
      tab('log-guete.1', [P('Trennwert', 'Cut-off'), P('Nein richtig', 'No, correct'), P('Nein, als Ja vorhergesagt', 'No, predicted yes'), P('Ja, als Nein vorhergesagt', 'Yes, predicted no'), P('Ja richtig', 'Yes, correct'), P('Trefferquote', 'Hit rate')], QUELLE_PIMA,
        P('Klassifikation (beobachteter Diabetes gegen Vorhersage)', 'Classification (observed diabetes against prediction)')),
      tab('log-guete.2', [P('Größe', 'Variable'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('Wald', 'Wald'), P('p', 'p')], QUELLE_PIMA, P('Koeffizienten', 'Coefficients'))
    ]
  },
  'wk-miet': {
    titel: P('Zufriedenheit der Mieter nach Kontakt zu anderen Bewohnern', 'Tenants\' satisfaction by contact with other residents'),
    tabellen: [
      tab('wk-miet.0', [P('Kontakt', 'Contact'), P('Zufriedenheit niedrig', 'Satisfaction low'), P('mittel', 'medium'), P('hoch', 'high')], QUELLE_MIET, P('Häufigkeiten', 'Frequencies')),
      tab('wk-miet.1', [P('Gleichung', 'Equation'), P('B der Konstante', 'B of the constant'), P('B für viel Kontakt', 'B for much contact'), P('Standardfehler', 'Standard error'), P('Exp(B)', 'Exp(B)')], QUELLE_MIET,
        P('Multinomiale logistische Regression (Referenz: Zufriedenheit niedrig)', 'Multinomial logistic regression (reference: satisfaction low)'))
    ]
  },
  'wk-faden': {
    titel: P('Fadenbrüche je Webstuhl nach Spannung', 'Yarn breaks per loom by tension'),
    tabellen: [
      tab('wk-faden.0', [P('Spannung', 'Tension'), P('Webstühle', 'Looms'), P('Mittelwert', 'Mean'), P('Varianz', 'Variance')], QUELLE_FADEN, P('Zahl der Brüche je Webstuhl', 'Number of breaks per loom')),
      tab('wk-faden.1', [P('Größe', 'Variable'), P('B', 'B'), P('Standardfehler (Poisson)', 'Standard error (Poisson)'), P('Standardfehler (Quasi-Poisson)', 'Standard error (quasi-Poisson)'), P('Exp(B)', 'Exp(B)')], QUELLE_FADEN,
        P('Poisson-Regression der Zahl der Brüche (Referenz: niedrige Spannung)', 'Poisson regression of the number of breaks (reference: low tension)'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Logistische Regression lesen ----
  {
    id: 'log-or-rr', thema: 'logistisch', fall: 'log-bmi', karte: 'vorhersage',
    stamm: P('Die Tabellen zeigen Diabetes nach BMI-Gruppe und die logistische Regression dazu. Wie ist Exp(B) der Gruppe „BMI ab 30“ zu lesen?',
      'The tables show diabetes by BMI group and the logistic regression for it. How is Exp(B) of the group "BMI 30 or above" to be read?'),
    antworten: [
      a(P('Die Odds für Diabetes sind in dieser Gruppe rund 4-mal so hoch wie in der Vergleichsgruppe', 'The odds of diabetes in this group are about 4 times as high as in the comparison group'),
        P(`Exp(B) ist ein Odds Ratio: Die Odds der Gruppe (${zd('lb_odds1', 3)}) geteilt durch die der Vergleichsgruppe (${zd('lb_odds0', 3)}) ergeben rund 4. Odds sind der Anteil geteilt durch den Gegenanteil.`,
          `Exp(B) is an odds ratio: the odds of the group (${ze('lb_odds1', 3)}) divided by those of the comparison group (${ze('lb_odds0', 3)}) give about 4. Odds are the share divided by the complementary share.`), true),
      a(P('Die Wahrscheinlichkeit für Diabetes ist in dieser Gruppe rund 4-mal so hoch wie in der Vergleichsgruppe', 'The probability of diabetes in this group is about 4 times as high as in the comparison group'),
        P(`Das wäre das relative Risiko. Die Anteile der Tabelle (${zd('lb_s1', 3)} gegen ${zd('lb_s0', 3)}) ergeben nur rund ${zd('lb_rr', 1)}. Das Odds Ratio übertreibt den Effekt, vor allem bei hohem Ausgangsrisiko.`,
          `That would be the relative risk. The shares in the table (${ze('lb_s1', 3)} against ${ze('lb_s0', 3)}) give only about ${ze('lb_rr', 1)}. The odds ratio exaggerates the effect, especially when the baseline risk is high.`)),
      a(P('Der Anteil mit Diabetes liegt in dieser Gruppe rund 4 Prozentpunkte höher als in der Vergleichsgruppe', 'The share with diabetes is about 4 percentage points higher in this group than in the comparison group'),
        P(`Exp(B) ist ein Faktor, keine Differenz. Die Anteile unterscheiden sich um ${zd('lb_diff', 3)} (${zd('lb_s1', 3)} minus ${zd('lb_s0', 3)}), also um rund 27 Prozentpunkte.`,
          `Exp(B) is a factor, not a difference. The shares differ by ${ze('lb_diff', 3)} (${ze('lb_s1', 3)} minus ${ze('lb_s0', 3)}), that is by about 27 percentage points.`))
    ],
    hilfe: ['logistische-regression', 'odds-ratio', 'odds'], belege: ['wissen:log-odds-ratio-eb', 'wissen:effekt-odds-ratio-uebertreibt-rr', 'wissen:lumley-or-nicht-rr']
  },
  {
    id: 'log-bmi-mehrfach', thema: 'logistisch', fall: 'log-bmi', mehrfach: true, karte: 'vorhersage',
    stamm: P('Welche Aussagen zu den beiden Tabellen stimmen? Mehrere können stimmen.', 'Which statements about the two tables are correct? Several may be correct.'),
    antworten: [
      a(P(`B der Gruppe (${zd('lb_b', 3)}) ist der natürliche Logarithmus von Exp(B) (${zd('lb_or', 2)} gerundet)`, `B of the group (${ze('lb_b', 3)}) is the natural logarithm of Exp(B) (${ze('lb_or', 2)} rounded)`),
        P(`Exp(B) ist e hoch B. Umgekehrt ist B der natürliche Logarithmus des Odds Ratio: ln(4,05) ergibt ${zd('lb_b', 3)}.`, `Exp(B) is e to the power B. Conversely, B is the natural logarithm of the odds ratio: ln(4.05) gives ${ze('lb_b', 3)}.`), true),
      a(P(`Die Konstante (${zd('lb_const', 3)}) ist der Logit der Vergleichsgruppe, also der Logarithmus ihrer Odds`, `The constant (${ze('lb_const', 3)}) is the logit of the comparison group, that is the logarithm of its odds`),
        P(`Der Logit ist der Logarithmus der Odds. Die Odds der Gruppe „BMI unter 30“ sind ${zd('lb_odds0', 3)}, und ihr Logarithmus ist ${zd('lb_const', 3)}.`,
          `The logit is the logarithm of the odds. The odds of the group "BMI below 30" are ${ze('lb_odds0', 3)}, and their logarithm is ${ze('lb_const', 3)}.`), true),
      a(P(`Die Konstante (${zd('lb_const', 3)}) ist der Anteil mit Diabetes in der Vergleichsgruppe`, `The constant (${ze('lb_const', 3)}) is the share with diabetes in the comparison group`),
        P(`Der Anteil der Vergleichsgruppe beträgt ${zd('lb_s0', 3)}. Die Konstante ist ein Logit und kann negativ sein; ein Anteil liegt zwischen 0 und 1.`,
          `The share of the comparison group is ${ze('lb_s0', 3)}. The constant is a logit and can be negative; a share lies between 0 and 1.`)),
      a(P('Ein negatives B ergäbe ein Exp(B) über 1 und damit höhere Odds in der Gruppe', 'A negative B would give an Exp(B) above 1 and thus higher odds in the group'),
        P('Ein negatives B ergibt ein Exp(B) unter 1: Die Odds wären kleiner als in der Vergleichsgruppe. Bei B gleich 0 ist Exp(B) gleich 1.',
          'A negative B gives an Exp(B) below 1: the odds would be lower than in the comparison group. At B equal to 0, Exp(B) equals 1.'))
    ],
    hilfe: ['logistische-regression', 'log-odds', 'logit'], belege: ['wissen:log-odds-logit', 'wissen:log-odds-ratio-eb']
  },
  {
    id: 'log-wirkung', thema: 'logistisch', fall: 'log-glu', karte: 'vorhersage',
    stamm: P(`Die erste Tabelle zeigt ein Exp(B) von ${zd('lg_or10', 2)} je 10 mg/dl Glukose, die zweite vorhergesagte Wahrscheinlichkeiten. Was gilt für jeweils 20 mg/dl mehr Glukose?`,
      `The first table shows an Exp(B) of ${ze('lg_or10', 2)} per 10 mg/dl glucose, the second predicted probabilities. What holds for each additional 20 mg/dl of glucose?`),
    antworten: [
      a(P('Die Odds wachsen jedes Mal um denselben Faktor, die Wahrscheinlichkeit um sehr verschiedene Beträge', 'The odds grow by one factor each time, the probability by very different amounts'),
        P(`Je 20 mg/dl wachsen die Odds um den Faktor ${zd('lg_or20', 2)} (${zd('lg_or10', 2)} zum Quadrat). Die Wahrscheinlichkeit steigt zuerst um ${zd('lg_zw1', 3)}, in der Mitte um ${zd('lg_zw_mitte', 3)}, am Ende um ${zd('lg_zw_ende', 3)}. Die Steigung ist bei p = ${zd('lo_p2', 1)} am größten.`,
          `Per 20 mg/dl the odds grow by a factor of ${ze('lg_or20', 2)} (${ze('lg_or10', 2)} squared). The probability first rises by ${ze('lg_zw1', 3)}, in the middle by ${ze('lg_zw_mitte', 3)}, at the end by ${ze('lg_zw_ende', 3)}. The slope is steepest at p = ${ze('lo_p2', 1)}.`), true),
      a(P('Die Wahrscheinlichkeit wächst bei jedem Schritt um denselben Betrag, denn Exp(B) ist ein fester Wert', 'The probability grows by the same amount at every step, since Exp(B) is a fixed value'),
        P(`Der feste Faktor gilt für die Odds. Die Wahrscheinlichkeit steigt zuerst um ${zd('lg_zw1', 3)}, dann bis ${zd('lg_zw_mitte', 3)} und am Ende nur um ${zd('lg_zw_ende', 3)}.`,
          `The fixed factor holds for the odds. The probability first rises by ${ze('lg_zw1', 3)}, then up to ${ze('lg_zw_mitte', 3)} and at the end by only ${ze('lg_zw_ende', 3)}.`)),
      a(P(`Die Wahrscheinlichkeit wird bei jedem Schritt von 20 mg/dl mit dem festen Faktor ${zd('lg_or10', 2)} multipliziert`, `The probability is multiplied by the fixed factor ${ze('lg_or10', 2)} at every step of 20 mg/dl`),
        P(`Der Faktor betrifft die Odds, nicht die Wahrscheinlichkeit. Diese steigt zum Beispiel von ${zd('lg_p100', 3)} auf ${zd('lg_p120', 3)} und von ${zd('lg_p180', 3)} auf ${zd('lg_p200', 3)}: Die Faktoren sind verschieden.`,
          `The factor concerns the odds, not the probability. The probability rises, for example, from ${ze('lg_p100', 3)} to ${ze('lg_p120', 3)} and from ${ze('lg_p180', 3)} to ${ze('lg_p200', 3)}: the factors differ.`))
    ],
    hilfe: ['logistische-regression', 'odds', 'logit'], belege: ['wissen:log-wirkung-wahrscheinlichkeit', 'wissen:log-odds-ratio-eb']
  },
  {
    id: 'log-annahmen', thema: 'logistisch', fall: 'log-glu', mehrfach: true, karte: 'vorhersage',
    stamm: P('Welche Aussagen zur logistischen Regression der ersten Tabelle stimmen? Mehrere können stimmen.', 'Which statements about the logistic regression in the first table are correct? Several may be correct.'),
    antworten: [
      a(P('Das Modell wird mit Maximum Likelihood geschätzt, nicht mit kleinsten Quadraten', 'The model is estimated by maximum likelihood, not by least squares'),
        P('Die logistische Regression maximiert die Log-Likelihood. -2LL ist das Gegenstück zur Residuenquadratsumme der linearen Regression.', 'Logistic regression maximises the log-likelihood. -2LL is the counterpart of the residual sum of squares in linear regression.'), true),
      a(P('Die Beobachtungen sollten statistisch voneinander unabhängig sein', 'The observations should be statistically independent of each other'),
        P('Zu den Anforderungen an die Daten gehören unabhängige Beobachtungen der abhängigen Variablen und weitgehend fehlende Multikollinearität unter den unabhängigen Variablen. Das ist nicht die ganze Liste der Anforderungen.', 'The requirements on the data include independent observations of the dependent variable and largely absent multicollinearity among the independent variables. This is not the complete list of requirements.'), true),
      a(P('Glukose, BMI und Alter müssen jeweils normalverteilt sein', 'Glucose, BMI and age each have to be normally distributed'),
        P('Über die Verteilung der unabhängigen Variablen werden keine Annahmen getroffen. Normalverteilung wird nicht verlangt.', 'No assumptions are made about the distribution of the independent variables. A normal distribution is not required.')),
      a(P('Mehrere Zeilen derselben Frau erfüllen die Annahme unabhängiger Beobachtungen', 'Several rows of the same woman satisfy the assumption of independent observations'),
        P('Zeilen derselben Person hängen zusammen. Die Beobachtungen sollen statistisch unabhängig voneinander sein.', 'Rows of the same person are related. The observations should be statistically independent of each other.'))
    ],
    hilfe: ['logistische-regression'], belege: ['wissen:log-annahmen', 'wissen:log-maximum-likelihood']
  },
  {
    id: 'log-einheit', thema: 'logistisch', karte: 'vorhersage',
    tabelle: tab('log-einheit', [P('Einheit der Glukose', 'Unit of glucose'), P('B', 'B'), P('Exp(B)', 'Exp(B)')], QUELLE_PIMA, P('Dasselbe Modell, Glukose in zwei Einheiten', 'The same model, glucose in two units')),
    stamm: P(`Dasselbe Modell wurde mit Glukose in mg/dl und in Einheiten von 10 mg/dl gerechnet (Tabelle). Warum steht dort ${zd('le_e1', 4)} gegen ${zd('le_e10', 4)}?`,
      `The same model was run with glucose in mg/dl and in units of 10 mg/dl (table). Why does it show ${ze('le_e1', 4)} against ${ze('le_e10', 4)}?`),
    antworten: [
      a(P('Exp(B) gilt je Einheit; zehn kleine Einheiten ergeben zusammen das große Odds Ratio', 'Exp(B) refers to one unit; ten small units together give the large odds ratio'),
        P(`B wächst mit der Einheit: 10 mal ${zd('le_b1', 4)} ist rund ${zd('lg_b_glu', 3)}. Exp(B) hoch 10 ergibt ebenfalls rund ${zd('lg_or10', 2)}. Die Aussage ist dieselbe.`,
          `B grows with the unit: 10 times ${ze('le_b1', 4)} is about ${ze('lg_b_glu', 3)}. Exp(B) to the power 10 likewise gives about ${ze('lg_or10', 2)}. The statement is the same.`), true),
      a(P('Das Modell mit 10 mg/dl passt besser zu den Daten, deshalb ist der Effekt dort größer', 'The model with 10 mg/dl fits the data better, so the effect is larger there'),
        P('Beide Modelle sind dasselbe Modell in anderer Einheit; Anpassung und Vorhersagen sind gleich. Nur die Größe, auf die sich Exp(B) bezieht, ändert sich.',
          'Both are the same model in another unit; fit and predictions are identical. Only the size of the step Exp(B) refers to changes.')),
      a(P('In einem der beiden Modelle steckt ein Rechenfehler, denn Exp(B) müsste gleich sein', 'One of the two models contains a calculation error, since Exp(B) should be the same'),
        P('Das Odds Ratio einer metrischen Größe hängt von deren Einheit ab. Verschiedene Einheiten geben verschiedene Zahlen, ohne dass ein Fehler vorliegt.',
          'The odds ratio of a metric variable depends on its unit. Different units give different numbers without any error.'))
    ],
    hilfe: ['logistische-regression', 'odds'], belege: ['wissen:log-or-einheit-fallkontrolle', 'wissen:log-odds-ratio-eb']
  },
  {
    id: 'log-lpm', thema: 'logistisch', karte: 'vorhersage',
    tabelle: tab('log-lpm', [P('Modell', 'Model'), P('kleinster vorhergesagter Wert', 'smallest predicted value'), P('größter vorhergesagter Wert', 'largest predicted value'), P('Werte unter 0', 'values below 0'), P('Werte über 1', 'values above 1')], QUELLE_PIMA,
      P('Vorhersage für Diabetes (Ja = 1, Nein = 0) bei 532 Frauen', 'Prediction of diabetes (yes = 1, no = 0) for 532 women')),
    stamm: P('Dieselben Daten wurden mit einer linearen und mit einer logistischen Regression ausgewertet. Die Tabelle zeigt die vorhergesagten Werte für Diabetes. Was zeigt der Vergleich?',
      'The same data were analysed with a linear and with a logistic regression. The table shows the predicted values for diabetes. What does the comparison show?'),
    antworten: [
      a(P('Die lineare Regression liefert Werte unter 0 und über 1, die als Wahrscheinlichkeit sinnlos sind', 'The linear regression gives values below 0 and above 1, which are meaningless as probabilities'),
        P(`Die lineare Regression sagt für ${zn('lpm_n0')} Frauen einen Wert unter 0 und für ${zn('lpm_n1')} einen über 1 voraus (kleinster ${zd('lpm_min', 3)}, größter ${zd('lpm_max', 3)}). Die logistische Regression bleibt zwischen ${zd('lpm_gmin', 3)} und ${zd('lpm_gmax', 3)}.`,
          `The linear regression predicts a value below 0 for ${zn('lpm_n0')} women and above 1 for ${zn('lpm_n1')} (smallest ${ze('lpm_min', 3)}, largest ${ze('lpm_max', 3)}). The logistic regression stays between ${ze('lpm_gmin', 3)} and ${ze('lpm_gmax', 3)}.`), true),
      a(P('Die lineare Regression lässt sich bei einem Ja/Nein-Ergebnis nicht rechnen, nur die logistische', 'The linear regression cannot be run for a yes/no outcome, only the logistic one can'),
        P('Sie lässt sich rechnen und taugt als Näherung im Datenbereich. Hier liefert sie aber Vorhersagen außerhalb von 0 bis 1 (Tabelle).',
          'It can be run and serves as an approximation within the range of the data. Here it gives predictions outside 0 to 1 (table).')),
      a(P('Die logistische Regression liefert größere Werte, weil sie die Ja-Fälle stärker gewichtet als die Nein-Fälle', 'The logistic regression gives larger values because it weights the yes cases more heavily than the no cases'),
        P(`Eine stärkere Gewichtung der Ja-Fälle gibt es nicht. Der Logit-Link hält die Vorhersage zwischen 0 und 1 (kleinster ${zd('lpm_gmin', 3)}, größter ${zd('lpm_gmax', 3)}).`,
          `There is no heavier weighting of the yes cases. The logit link keeps the prediction between 0 and 1 (smallest ${ze('lpm_gmin', 3)}, largest ${ze('lpm_gmax', 3)}).`))
    ],
    hilfe: ['logistische-regression', 'logit'], belege: ['wissen:log-lineares-wahrscheinlichkeitsmodell', 'wissen:dormann-link-skala']
  },
  {
    id: 'log-mood', thema: 'logistisch', karte: 'vorhersage',
    tabelle: tab('log-mood', [P('Modell', 'Model'), P('B für BMI', 'B for BMI'), P('Exp(B) für BMI', 'Exp(B) for BMI'), P('r mit Zahl der Schwangerschaften', 'r with number of pregnancies')], QUELLE_PIMA,
      P('Diabetes: BMI allein und mit Zahl der Schwangerschaften', 'Diabetes: BMI alone and with number of pregnancies')),
    stamm: P('In der Tabelle wächst B für den BMI von Modell 1 zu Modell 2, obwohl BMI und Zahl der Schwangerschaften kaum zusammenhängen. Was heißt das?',
      'In the table B for BMI grows from model 1 to model 2, although BMI and number of pregnancies are hardly related. What does that mean?'),
    antworten: [
      a(P('Eine weitere Größe, die Diabetes vorhersagt, verändert B des BMI auch dann, wenn sie mit dem BMI nicht zusammenhängt', 'A further variable that predicts diabetes changes the B of BMI even if it is unrelated to BMI'),
        P(`Die Skala der Koeffizienten wächst mit der erklärten Streuung. Koeffizienten verschiedener Modelle sind darum nicht ohne Weiteres vergleichbar, anders als in der linearen Regression (hier r = ${zd('lm_r', 3)}).`,
          `The scale of the coefficients grows with the explained variation. Coefficients of different models are therefore not directly comparable, unlike in linear regression (here r = ${ze('lm_r', 3)}).`), true),
      a(P('Die Zahl der Schwangerschaften verstärkt den Effekt des BMI und wirkt dabei als Suppressorvariable', 'The number of pregnancies strengthens the effect of BMI and acts as a suppressor variable'),
        P(`Das ist die Lesart der linearen Regression. Bei r = ${zd('lm_r', 3)} gibt es kaum einen Zusammenhang, der etwas unterdrücken könnte; die Änderung kommt aus der Skala des Modells.`,
          `That is the reading of linear regression. With r = ${ze('lm_r', 3)} there is hardly any relationship that could suppress something; the change comes from the scale of the model.`)),
      a(P(`Der Anstieg von ${zd('lm_b1', 3)} auf ${zd('lm_b2', 3)} zeigt, wie viel des BMI-Effekts die Schwangerschaften vorher verdeckt haben`, `The rise from ${ze('lm_b1', 3)} to ${ze('lm_b2', 3)} shows how much of the BMI effect pregnancies had masked before`),
        P('Eine Änderung vom einen zum anderen Modell darf in der logistischen Regression nicht als Kontrollieren oder Erklären gelesen werden, weil sich mit der Skala auch B ändert.',
          'In logistic regression a change from one model to the other must not be read as controlling or explaining, because B changes along with the scale.'))
    ],
    hilfe: ['logistische-regression', 'odds'], belege: ['wissen:mood-unbeobachtete-heterogenitaet', 'wissen:mood-modellvergleich', 'wissen:log-gruppenvergleich-koeffizienten']
  },
  {
    id: 'log-odds', thema: 'logistisch', karte: 'vorhersage',
    tabelle: tab('log-odds', [P('Wahrscheinlichkeit p', 'Probability p'), P('Odds', 'Odds'), P('Logit', 'Logit')], P('Rechenbeispiel ohne Daten: Odds = p geteilt durch (1 minus p), Logit = natürlicher Logarithmus der Odds. Berechnet mit R.', 'Worked example without data: odds = p divided by (1 minus p), logit = natural logarithm of the odds. Computed with R.'),
      P('Rechenbeispiel: Wahrscheinlichkeit, Odds und Logit', 'Worked example: probability, odds and logit')),
    stamm: P(`Rechenbeispiel: Ein Modell sagt für eine Person die Wahrscheinlichkeit ${zd('lo_p2', 2)} voraus (Tabelle). Was gilt für Odds und Logit?`,
      `Worked example: a model predicts the probability ${ze('lo_p2', 2)} for a person (table). What holds for the odds and the logit?`),
    antworten: [
      a(P('Die Odds sind 1 und der Logit ist 0', 'The odds are 1 and the logit is 0'),
        P(`Odds sind p geteilt durch (1 minus p), hier ${zd('lo_p2', 2)} geteilt durch ${zd('lo_p2', 2)} gleich 1. Der Logit ist der Logarithmus der Odds, und der Logarithmus von 1 ist 0.`,
          `Odds are p divided by (1 minus p), here ${ze('lo_p2', 2)} divided by ${ze('lo_p2', 2)} equals 1. The logit is the logarithm of the odds, and the logarithm of 1 is 0.`), true),
      a(P(`Die Odds sind ${zd('lo_p2', 2)} und der Logit ist ${zd('lo_p2', 2)}`, `The odds are ${ze('lo_p2', 2)} and the logit is ${ze('lo_p2', 2)}`),
        P(`Odds und Logit sind andere Größen als die Wahrscheinlichkeit. Bei p = ${zd('lo_p3', 2)} sind die Odds ${zn('lo_o3')} und der Logit ${zd('lo_l3', 2)}.`,
          `Odds and logit are different quantities from the probability. At p = ${ze('lo_p3', 2)} the odds are ${zn('lo_o3')} and the logit is ${ze('lo_l3', 2)}.`)),
      a(P('Die Odds sind 0 und der Logit ist 1', 'The odds are 0 and the logit is 1'),
        P('Das ist vertauscht: Der Logit ist der Logarithmus der Odds, bei Odds 1 also 0. Odds von 0 gäbe es nur bei der Wahrscheinlichkeit 0.', 'That is swapped: the logit is the logarithm of the odds, so 0 at odds of 1. Odds of 0 would exist only at probability 0.'))
    ],
    hilfe: ['log-odds', 'logit', 'odds'], belege: ['wissen:log-odds-logit']
  },

  // ---- Güte des Modells ----
  {
    id: 'gu-lr', thema: 'logistisch', fall: 'log-guete', karte: 'vorhersage',
    stamm: P(`Die erste Tabelle zeigt das Modell für Diabetes mit vier Größen. Was sagt der Likelihood-Ratio-Test (Chi-Quadrat ${zd('gu_chi', 1)})?`,
      `The first table shows the model for diabetes with four variables. What does the likelihood-ratio test (chi-square ${ze('gu_chi', 1)}) say?`),
    antworten: [
      a(P('Das Modell mit vier Größen passt deutlich besser zu den Daten als das Nullmodell', 'The model with four variables fits the data clearly better than the null model'),
        P(`Der Test vergleicht -2LL des Nullmodells (${zd('gu_l0', 1)}) mit dem des Modells (${zd('gu_l1', 1)}). Der Unterschied ${zd('gu_chi', 1)} ist bei ${zn('gu_df')} Freiheitsgraden sehr groß (p unter ${zd('gu_p0', 3)}).`,
          `The test compares -2LL of the null model (${ze('gu_l0', 1)}) with that of the model (${ze('gu_l1', 1)}). The difference ${ze('gu_chi', 1)} is very large with ${zn('gu_df')} degrees of freedom (p below ${ze('gu_p0', 3)}).`), true),
      a(P('Das Modell ist mit sehr hoher Wahrscheinlichkeit richtig, weil der p-Wert so klein ausfällt', 'The model is correct with very high probability because the p value is so small'),
        P(`Der p-Wert unter ${zd('gu_p0', 3)} sagt, wie ungewöhnlich ein solcher Unterschied wäre, wenn das Nullmodell gälte. Er ist nie die Wahrscheinlichkeit einer Hypothese oder eines Modells.`,
          `A p value below ${ze('gu_p0', 3)} says how unusual such a difference would be if the null model held. It is never the probability of a hypothesis or a model.`)),
      a(P(`Der Wert ${zd('gu_chi', 1)} gibt an, wie viele Frauen das Modell richtig als Diabetes-Fall vorhersagt`, `The value ${ze('gu_chi', 1)} states how many women the model correctly predicts as a diabetes case`),
        P(`${zd('gu_chi', 1)} ist der Unterschied zweier -2LL-Werte und keine Anzahl. Die Zahl der richtigen Vorhersagen steht in der Klassifikationstabelle.`,
          `${ze('gu_chi', 1)} is the difference of two -2LL values and not a count. The number of correct predictions is in the classification table.`))
    ],
    hilfe: ['logistische-regression', 'likelihood-ratio'], belege: ['wissen:log-likelihood-ratio-test']
  },
  {
    id: 'gu-pseudo', thema: 'logistisch', fall: 'log-guete', mehrfach: true, karte: 'vorhersage',
    stamm: P(`Angenommen, McFadden-Werte von ${zd('gu_r1', 1)} bis ${zd('gu_r2', 1)} gelten als gute Anpassung. Welche Aussagen zur ersten Tabelle stimmen? Mehrere können stimmen.`,
      `Suppose McFadden values from ${ze('gu_r1', 1)} to ${ze('gu_r2', 1)} count as a good fit. Which statements about the first table are correct? Several may be correct.`),
    antworten: [
      a(P(`Der McFadden-Wert ${zd('gu_mcf', 3)} liegt in dem angenommenen Bereich guter Anpassung`, `The McFadden value ${ze('gu_mcf', 3)} lies within the assumed range of a good fit`),
        P(`${zd('gu_mcf', 3)} liegt zwischen ${zd('gu_r1', 1)} und ${zd('gu_r2', 1)}. Die Grenzen sind hier eine gesetzte Faustregel, kein Naturgesetz.`, `${ze('gu_mcf', 3)} lies between ${ze('gu_r1', 1)} and ${ze('gu_r2', 1)}. The limits are a rule of thumb set here, not a law of nature.`), true),
      a(P(`Cox und Snell (${zd('gu_cs', 3)}) und Nagelkerke (${zd('gu_nk', 3)}) weichen für dasselbe Modell von McFadden ab`, `Cox and Snell (${ze('gu_cs', 3)}) and Nagelkerke (${ze('gu_nk', 3)}) differ from McFadden for the same model`),
        P('Die drei Pseudo-R² sind verschieden definiert und geben für dasselbe Modell verschiedene Werte.', 'The three pseudo-R² are defined differently and give different values for the same model.'), true),
      a(P('Nagelkerke zeigt, dass das Modell knapp 44 Prozent der Varianz erklärt', 'Nagelkerke shows that the model explains almost 44 percent of the variance'),
        P('Pseudo-R² sind keine Varianzanteile. Sie vergleichen Likelihoods und lassen sich nicht als erklärter Anteil lesen.', 'Pseudo-R² are not shares of variance. They compare likelihoods and cannot be read as an explained share.')),
      a(P('Pseudo-R² lassen sich unmittelbar mit dem R² einer linearen Regression vergleichen', 'Pseudo-R² can be compared directly with the R² of a linear regression'),
        P('Sie sind anders definiert (Verhältnis von Likelihoods) und keine Varianzanteile. Ein unmittelbarer Vergleich mit dem R² der linearen Regression ist darum nicht gedeckt.', 'They are defined differently (ratio of likelihoods) and are not shares of variance. A direct comparison with the R² of linear regression is therefore not supported.'))
    ],
    hilfe: ['logistische-regression'], belege: ['wissen:log-pseudo-r2', 'wissen:log-mcfadden-faustregel']
  },
  {
    id: 'gu-treffer', thema: 'logistisch', fall: 'log-guete', karte: 'vorhersage',
    stamm: P(`Bei Trennwert ${zd('gu_trenn5', 2)} sagt das Modell für ${zd('gu_t5', 3)} der Frauen den Diabetes-Status richtig voraus (zweite Tabelle). Wie ist das einzuordnen?`,
      `At cut-off ${ze('gu_trenn5', 2)} the model predicts the diabetes status correctly for ${ze('gu_t5', 3)} of the women (second table). How is that to be judged?`),
    antworten: [
      a(P('Sie ist mit der Quote der Mehrheitsklasse zu vergleichen, und das Modell liegt klar darüber', 'It has to be compared with the majority-class rate, and the model lies clearly above it'),
        P(`Allein die Vorhersage „Nein“ für alle trifft bei ${zd('gu_base', 3)} der Frauen. Das Modell erreicht ${zd('gu_t5', 3)}. Eine Trefferquote sagt erst im Vergleich mit dieser Zufallsquote etwas.`,
          `Predicting "no" for everyone alone is right for ${ze('gu_base', 3)} of the women. The model reaches ${ze('gu_t5', 3)}. A hit rate only means something in comparison with this chance rate.`), true),
      a(P('Sie ist hoch, denn sie liegt deutlich über 0,5 und damit über dem Zufallsniveau eines Münzwurfs', 'It is high, since it lies clearly above 0.5 and thus above the chance level of a coin toss'),
        P(`Die Marke 0,5 ist hier nicht die Zufallsquote. Schon die Vorhersage „Nein“ für alle trifft bei ${zd('gu_base', 3)}.`, `The mark 0.5 is not the chance rate here. Predicting "no" for everyone is already right for ${ze('gu_base', 3)}.`)),
      a(P('Sie gilt für neue Frauen in gleicher Höhe, denn die Schätzdaten sind ein guter Maßstab', 'It holds at the same level for new women, since the estimation data are a good yardstick'),
        P('In den Daten, mit denen das Modell geschätzt wurde, fällt die Trefferquote zu hoch aus. Ein Holdout oder eine Kreuzvalidierung zeigt die Quote für neue Fälle.', 'In the data used to estimate the model the hit rate comes out too high. A holdout or cross-validation shows the rate for new cases.'))
    ],
    hilfe: ['logistische-regression', 'roc-auc'], belege: ['wissen:log-klassifikation-trefferquote']
  },
  {
    id: 'gu-trenn', thema: 'logistisch', fall: 'log-guete', mehrfach: true, karte: 'vorhersage',
    stamm: P('Welche Aussagen zur Klassifikationstabelle und zur Modellgüte stimmen? Mehrere können stimmen.', 'Which statements about the classification table and the model fit are correct? Several may be correct.'),
    antworten: [
      a(P(`Mit Trennwert ${zd('gu_trenn3', 2)} werden mehr Frauen als „Ja“ vorhergesagt als mit ${zd('gu_trenn5', 2)}`, `With cut-off ${ze('gu_trenn3', 2)} more women are predicted as "yes" than with ${ze('gu_trenn5', 2)}`),
        P('Bei 0,30 sind es 80 plus 139 gleich 219 Frauen, bei 0,50 nur 39 plus 107 gleich 146. Ein niedrigerer Trennwert sagt öfter „Ja“ voraus.', 'At 0.30 it is 80 plus 139, that is 219 women; at 0.50 only 39 plus 107, that is 146. A lower cut-off predicts "yes" more often.'), true),
      a(P(`Die Trefferquote hängt vom Trennwert ab (${zd('gu_t5', 3)} gegen ${zd('gu_t3', 3)})`, `The hit rate depends on the cut-off (${ze('gu_t5', 3)} against ${ze('gu_t3', 3)})`),
        P('Dasselbe Modell gibt bei verschiedenen Trennwerten verschiedene Trefferquoten. Sie ist darum keine Eigenschaft des Modells allein.', 'The same model gives different hit rates at different cut-offs. It is therefore not a property of the model alone.'), true),
      a(P(`Die AUC (${zd('gu_auc', 3)}) ändert sich mit dem gewählten Trennwert`, `The AUC (${ze('gu_auc', 3)}) changes with the chosen cut-off`),
        P('Die Fläche unter der ROC-Kurve fasst die Trennschärfe über alle Trennwerte zusammen und ist trennwertunabhängig.', 'The area under the ROC curve summarises discrimination over all cut-offs and is independent of the cut-off.')),
      a(P('Die Trefferquote aus den Schätzdaten gilt unverändert für neue Fälle', 'The hit rate from the estimation data holds unchanged for new cases'),
        P('In den Schätzdaten fällt sie zu hoch aus. Für neue Fälle braucht es einen Holdout oder eine Kreuzvalidierung.', 'In the estimation data it comes out too high. For new cases a holdout or cross-validation is needed.'))
    ],
    hilfe: ['logistische-regression', 'roc-auc'], belege: ['wissen:log-klassifikation-trefferquote']
  },
  {
    id: 'gu-wald', thema: 'logistisch', fall: 'log-guete', karte: 'vorhersage',
    stamm: P(`In der dritten Tabelle stehen für Glukose B = ${zd('gw_b', 4)}, Standardfehler ${zd('gw_se', 4)} und Wald ${zd('gw_wald', 1)}. Wie hängen die drei Werte zusammen?`,
      `In the third table, glucose has B = ${ze('gw_b', 4)}, standard error ${ze('gw_se', 4)} and Wald ${ze('gw_wald', 1)}. How are the three values related?`),
    antworten: [
      a(P('Wald ist das Quadrat des Quotienten aus B und Standardfehler, hier rund 67', 'Wald is the square of the quotient of B and standard error, here about 67'),
        P(`B geteilt durch den Standardfehler ergibt den z-Wert (${zd('gw_z', 2)}); sein Quadrat ist die Wald-Statistik (${zd('gw_wald', 1)}), mit einem Freiheitsgrad Chi-Quadrat-verteilt; daraus kommt p. Der Likelihood-Ratio-Test gilt als vorzuziehen.`,
          `B divided by the standard error gives the z value (${ze('gw_z', 2)}); its square is the Wald statistic (${ze('gw_wald', 1)}), chi-square distributed with one degree of freedom; p comes from it. The likelihood-ratio test is regarded as preferable.`), true),
      a(P(`Wald ist B geteilt durch den Standardfehler, also rund ${zd('gw_z', 2)}, ohne weitere Umformung`, `Wald is B divided by the standard error, that is about ${ze('gw_z', 2)}, without further transformation`),
        P(`Der Quotient ist die z-Zahl (${zd('gw_z', 2)}). Wald ist ihr Quadrat, also ${zd('gw_wald', 1)}.`, `The quotient is the z value (${ze('gw_z', 2)}). Wald is its square, that is ${ze('gw_wald', 1)}.`)),
      a(P('Wald ist das Produkt aus B und dem Standardfehler, beide Werte werden multipliziert', 'Wald is the product of B and the standard error, the two values are multiplied'),
        P(`Das Produkt wäre kleiner als B. Der Wert ${zd('gw_wald', 1)} ist viel größer, weil Wald das Quadrat eines Quotienten ist.`, `The product would be smaller than B. The value ${ze('gw_wald', 1)} is much larger because Wald is the square of a quotient.`))
    ],
    hilfe: ['logistische-regression'], belege: ['wissen:log-wald-definition']
  },
  {
    id: 'gu-verschachtelt', thema: 'logistisch', karte: 'vorhersage',
    tabelle: tab('gu-verschachtelt', [P('Modell', 'Model'), P('-2LL', '-2LL'), P('Zahl der Größen', 'Number of variables')], QUELLE_PIMA, P('Vergleich zweier verschachtelter Modelle für Diabetes', 'Comparison of two nested models for diabetes')),
    stamm: P('Modell B enthält zusätzlich den Blutdruck (Tabelle). Wie ist der Test des Unterschieds zu lesen?', 'Model B additionally contains blood pressure (table). How is the test of the difference to be read?'),
    antworten: [
      a(P('Der Unterschied ist bei einem Freiheitsgrad klein; für den Blutdruck fehlt ein Nutzenbeleg', 'The difference is small at one degree of freedom; evidence for blood pressure is missing'),
        P(`Der Likelihood-Ratio-Test vergleicht verschachtelte Modelle: Chi-Quadrat ist der Unterschied der -2LL (${zd('lt_a', 2)} minus ${zd('lt_b', 2)} gleich ${zd('lt_d', 2)}), die Freiheitsgrade sind die Zahl der zusätzlichen Größen (1). Mit p = ${zd('lt_p', 3)} fehlt ein Beleg.`,
          `The likelihood-ratio test compares nested models: chi-square is the difference of the -2LL (${ze('lt_a', 2)} minus ${ze('lt_b', 2)} equals ${ze('lt_d', 2)}), the degrees of freedom are the number of additional variables (1). With p = ${ze('lt_p', 3)} evidence is lacking.`), true),
      a(P('Der Blutdruck hat keinen Einfluss auf Diabetes, deshalb genügt das kleinere Modell A vollständig', 'Blood pressure has no influence on diabetes, so the smaller model A is entirely sufficient'),
        P('Ein Test ohne signifikanten Unterschied zeigt nur, dass ein Beleg fehlt, nicht dass es keinen Einfluss gibt.', 'A test without a significant difference shows only that evidence is lacking, not that there is no influence.')),
      a(P('Der Test hat vier Freiheitsgrade, weil Modell B insgesamt vier Größen im Modell enthält', 'The test has four degrees of freedom because model B contains four variables in total'),
        P('Die Freiheitsgrade des Tests sind der Unterschied der Zahl der Größen: 4 minus 3 gleich 1.', 'The degrees of freedom of the test are the difference in the number of variables: 4 minus 3 equals 1.'))
    ],
    hilfe: ['logistische-regression', 'likelihood-ratio'], belege: ['wissen:log-likelihood-ratio-test', 'wissen:altman95-keine-evidenz-ist-nicht-sicherheit']
  },

  // ---- Mehrere Kategorien und Zähldaten ----
  {
    id: 'wk-poisson', thema: 'logistisch', fall: 'wk-faden',
    stamm: P(`Gezählt wurden Fadenbrüche je Webstuhl bei drei Spannungen. Wie ist Exp(B) = ${zd('wf_m_e', 2)} bei „Spannung mittel“ in der Poisson-Regression zu lesen?`,
      `Yarn breaks per loom were counted at three tensions. How is Exp(B) = ${ze('wf_m_e', 2)} for "medium tension" in the Poisson regression to be read?`),
    antworten: [
      a(P(`Gegenüber niedriger Spannung werden rund ${zd('wf_m_e', 2)}-mal so viele Brüche erwartet`, `Compared with low tension about ${ze('wf_m_e', 2)} times as many breaks are expected`),
        P(`Das Poisson-Modell hat einen Log-Link: B steht auf der Log-Skala, Exp(B) ist der Faktor für die erwartete Zahl. Die Mittelwerte bestätigen es: ${zd('wf_mean_m', 2)} geteilt durch ${zd('wf_mean_l', 2)} ist rund ${zd('wf_m_e', 2)}.`,
          `The Poisson model has a log link: B is on the log scale, Exp(B) is the factor for the expected count. The means confirm it: ${ze('wf_mean_m', 2)} divided by ${ze('wf_mean_l', 2)} is about ${ze('wf_m_e', 2)}.`), true),
      a(P(`Die Zahl der Brüche sinkt bei mittlerer Spannung im Mittel um ${zd('wf_m_e', 2)} Brüche je Webstuhl`, `The number of breaks falls by ${ze('wf_m_e', 2)} breaks per loom on average at medium tension`),
        P(`Exp(B) ist ein Faktor, keine Differenz. Der Unterschied der Mittelwerte (${zd('wf_mean_m', 2)} gegen ${zd('wf_mean_l', 2)}) beträgt etwa 10 Brüche.`, `Exp(B) is a factor, not a difference. The difference of the means (${ze('wf_mean_m', 2)} against ${ze('wf_mean_l', 2)}) is about 10 breaks.`)),
      a(P(`Die Wahrscheinlichkeit, dass ein Faden bricht, sinkt bei mittlerer Spannung auf ${zd('wf_m_e', 2)}`, `The probability that a thread breaks falls to ${ze('wf_m_e', 2)} at medium tension`),
        P('Gezählt wird eine Anzahl, kein Ja/Nein-Ergebnis. Die Poisson-Regression modelliert die erwartete Zahl in einem festen Kontinuum, hier je Webstuhl.', 'A count is modelled, not a yes/no outcome. Poisson regression models the expected number in a fixed continuum, here per loom.'))
    ],
    hilfe: ['poisson-regression', 'zaehldaten-regression'], belege: ['wissen:dormann-link-skala', 'wissen:poisson-fester-bereich']
  },
  {
    id: 'wk-varianz', thema: 'logistisch', fall: 'wk-faden',
    stamm: P('Das Poisson-Modell setzt voraus, dass die Varianz gleich dem Mittelwert ist. Was zeigt die erste Tabelle der Fadenbrüche?', 'The Poisson model assumes that the variance equals the mean. What does the first table of yarn breaks show?'),
    antworten: [
      a(P('Die Varianz liegt in allen Stufen weit über dem Mittelwert (Überdispersion)', 'The variance lies far above the mean in all levels (overdispersion)'),
        P(`Bei niedriger Spannung ist die Varianz ${zd('wf_var_l', 2)} gegen einen Mittelwert von ${zd('wf_mean_l', 2)}. Bei Überdispersion unterschätzt das Poisson-Modell die Standardfehler.`,
          `At low tension the variance is ${ze('wf_var_l', 2)} against a mean of ${ze('wf_mean_l', 2)}. With overdispersion the Poisson model underestimates the standard errors.`), true),
      a(P('Varianz und Mittelwert stimmen in allen drei Stufen gut überein, das Poisson-Modell passt', 'Variance and mean agree well in all three levels, the Poisson model fits'),
        P(`Das Gegenteil ist der Fall: ${zd('wf_var_l', 2)} gegen ${zd('wf_mean_l', 2)}, ${zd('wf_var_m', 2)} gegen ${zd('wf_mean_m', 2)} und ${zd('wf_var_h', 2)} gegen ${zd('wf_mean_h', 2)}.`,
          `The opposite is the case: ${ze('wf_var_l', 2)} against ${ze('wf_mean_l', 2)}, ${ze('wf_var_m', 2)} against ${ze('wf_mean_m', 2)} and ${ze('wf_var_h', 2)} against ${ze('wf_mean_h', 2)}.`)),
      a(P('Die Varianz liegt in allen drei Stufen unter dem Mittelwert (Unterdispersion)', 'The variance lies below the mean in all three levels (underdispersion)'),
        P('Unterdispersion hieße: Die Varianz ist kleiner als der Mittelwert. Hier liegt sie in allen drei Stufen über dem Mittelwert.', 'Underdispersion would mean: the variance is smaller than the mean. Here it lies above the mean in all three levels.'))
    ],
    hilfe: ['poisson-regression', 'zaehldaten-regression'], belege: ['wissen:dormann-dispersion', 'wissen:bernal17-ueberdispersion']
  },
  {
    id: 'wk-skalierung', thema: 'logistisch', fall: 'wk-faden',
    stamm: P(`Angenommen, ein Verhältnis aus Residual-Devianz und Freiheitsgraden deutlich über 2 gilt als Hinweis auf Überdispersion. Das Poisson-Modell hat eine Residual-Devianz von ${zd('wf_dev', 1)} bei ${zn('wf_df')} Freiheitsgraden. Was folgt aus der zweiten Tabelle?`,
      `Suppose a ratio of residual deviance to degrees of freedom clearly above 2 counts as a sign of overdispersion. The Poisson model has a residual deviance of ${ze('wf_dev', 1)} on ${zn('wf_df')} degrees of freedom. What follows from the second table?`),
    antworten: [
      a(P('Die Poisson-Standardfehler sind zu klein; die Quasi-Poisson-Werte sind verlässlicher', 'The Poisson standard errors are too small; the quasi-Poisson values are more reliable'),
        P(`Das Verhältnis ${zd('wf_dev', 1)} zu ${zn('wf_df')} ist ${zd('wf_dr', 1)}. Überdispersion macht die Standardfehler falsch; ein Skalierungsparameter korrigiert sie, hier von ${zd('wf_se_p', 3)} auf ${zd('wf_se_q', 3)}.`,
          `The ratio ${ze('wf_dev', 1)} to ${zn('wf_df')} is ${ze('wf_dr', 1)}. Overdispersion makes the standard errors wrong; a scale parameter corrects them, here from ${ze('wf_se_p', 3)} to ${ze('wf_se_q', 3)}.`), true),
      a(P('Die Poisson-Standardfehler sind zu groß, weil die Streuung der Daten größer als erwartet ist', 'The Poisson standard errors are too large because the variation of the data is larger than expected'),
        P(`Es ist umgekehrt: Bei mehr Streuung als vorgesehen fallen die Standardfehler des Poisson-Modells zu klein aus. Die korrigierten sind größer (${zd('wf_se_q', 3)} gegen ${zd('wf_se_p', 3)}).`,
          `It is the other way round: with more variation than expected the standard errors of the Poisson model come out too small. The corrected ones are larger (${ze('wf_se_q', 3)} against ${ze('wf_se_p', 3)}).`)),
      a(P('Das Poisson-Modell ist in Ordnung, denn die Koeffizienten bleiben in beiden Modellen gleich', 'The Poisson model is fine because the coefficients stay the same in both models'),
        P(`Die Koeffizienten bleiben gleich, nur die Standardfehler wachsen (${zd('wf_se_p', 3)} auf ${zd('wf_se_q', 3)}). Intervalle und p-Werte hängen aber an den Standardfehlern.`,
          `The coefficients stay the same, only the standard errors grow (${ze('wf_se_p', 3)} to ${ze('wf_se_q', 3)}). But intervals and p values depend on the standard errors.`))
    ],
    hilfe: ['poisson-regression', 'negativ-binomial-regression'], belege: ['wissen:dormann-dispersion-grenzen', 'wissen:bernal17-ueberdispersion', 'wissen:bolker09-ueberdispersion']
  },
  {
    id: 'wk-multi', thema: 'logistisch', fall: 'wk-miet',
    stamm: P('Die Zufriedenheit der Mieter (niedrig, mittel, hoch) wurde mit einer multinomialen logistischen Regression nach dem Kontakt zu anderen Bewohnern ausgewertet. Wie viele Gleichungen und Koeffizienten hat das Modell?',
      'Tenants\' satisfaction (low, medium, high) was analysed by contact with other residents using multinomial logistic regression. How many equations and coefficients does the model have?'),
    antworten: [
      a(P('Zwei Gleichungen (mittel und hoch, je gegen niedrig) mit zusammen 4 Koeffizienten', 'Two equations (medium and high, each against low) with 4 coefficients in all'),
        P('Bei 3 Kategorien braucht es G minus 1 gleich 2 Gleichungen, jede gegen die Referenzkategorie niedrig. Mit einer Größe sind das (1 + 1) mal 2 gleich 4 Parameter.', 'With 3 categories there are G minus 1 equals 2 equations, each against the reference category low. With one variable that is (1 + 1) times 2 equals 4 parameters.'), true),
      a(P('Drei Gleichungen, eine für jede Zufriedenheitsstufe, mit zusammen 6 Koeffizienten', 'Three equations, one for every satisfaction level, with 6 coefficients in all'),
        P('Die Referenzkategorie braucht keine Gleichung: Ihre Wahrscheinlichkeit ergibt sich als Rest (1 minus Summe der anderen). Es bleiben 2 Gleichungen.', 'The reference category needs no equation: its probability follows as the remainder (1 minus the sum of the others). Two equations remain.')),
      a(P('Sechs Gleichungen, weil jede Stufe mit jeder anderen in beide Richtungen verglichen wird', 'Six equations because every level is compared with every other in both directions'),
        P('Es gibt 3 mögliche Paare, und 2 Baseline-Logits enthalten schon alle Information des Modells; das dritte Paar ist redundant.', 'There are 3 possible pairs, and 2 baseline logits already contain all the information of the model; the third pair is redundant.'))
    ],
    hilfe: ['multinomiale-regression'], belege: ['wissen:backhaus-multinomial-referenz', 'wissen:backhaus-multinomial-parameter']
  },
  {
    id: 'wk-multi-mehrfach', thema: 'logistisch', fall: 'wk-miet', mehrfach: true,
    stamm: P('Welche Aussagen zu den beiden Tabellen der Mieterzufriedenheit stimmen? Mehrere können stimmen.', 'Which statements about the two tables on tenants\' satisfaction are correct? Several may be correct.'),
    antworten: [
      a(P('Die Zeile „hoch gegen niedrig“ vergleicht die Stufe hoch mit der Referenzstufe niedrig', 'The row "high against low" compares the level high with the reference level low'),
        P('Jede Gleichung drückt die Wirkung einer Kategorie gegenüber der Referenzkategorie aus. Die Referenz steht hier im Namen der Zeilen: niedrig.', 'Every equation expresses the effect of a category relative to the reference category. The reference is named in the rows here: low.'), true),
      a(P(`Das Exp(B) ${zd('wm_e_mit', 3)} der ersten Zeile stimmt mit dem Odds Ratio der Häufigkeiten überein`, `The Exp(B) ${ze('wm_e_mit', 3)} of the first row agrees with the odds ratio of the frequencies`),
        P('Mit nur einer zweistufigen Größe vergleicht die Gleichung zwei Odds: Die Odds mittel gegen niedrig sind bei viel Kontakt 268/305, bei wenig 178/262. Ihr Quotient ist (268 mal 262) geteilt durch (178 mal 305).', 'With only one two-level variable the equation compares two odds: the odds medium against low are 268/305 for much contact and 178/262 for little. Their quotient is (268 times 262) divided by (178 times 305).'), true),
      a(P('Die Zeile „hoch gegen niedrig“ vergleicht die Stufe hoch mit der Stufe mittel', 'The row "high against low" compares the level high with the level medium'),
        P('Verglichen wird immer mit der Referenzkategorie, hier niedrig. Hoch gegen mittel ergäbe sich erst aus der Differenz der beiden Zeilen.', 'The comparison is with the reference category, here low. High against medium would follow only from the difference of the two rows.')),
      a(P('Die erste Stufe der Kategorien muss als Referenzkategorie gewählt werden', 'The first level of the categories has to be chosen as the reference category'),
        P('Im multinomialen Modell kann jede Kategorie Referenz sein. Nur im binären Modell ist es automatisch die Stufe 0.', 'In the multinomial model any category can be the reference. Only in the binary model is it automatically level 0.'))
    ],
    hilfe: ['multinomiale-regression'], belege: ['wissen:backhaus-multinomial-referenz', 'wissen:backhaus-multinomial-parameter']
  }
];
