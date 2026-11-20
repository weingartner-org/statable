/**
 * Üben: Welches Modell passt zu meiner Zielgröße, und was bedeutet seine Ausgabe? (Funktionsfragen, Charge 4, 01.11.2026)
 * Quantilregression, Strafregression, ordinale Regression, Probit, Präzisionsgewichte, nichtlineare Regression, Sterbetafel, zeitabhängige Größe,
 * AFT-Modell, Cluster und Frailty. Quelle: die Hilfe-Artikel und die Fachblätter der Funktionen (Belege `Hilfe:<id>`, `Fachblatt:<NAME>`);
 * die Knopfnamen stehen wörtlich wie in der App. Ohne Zahlen aus Rechnungen und ohne Tabellen.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

export const FRAGEN: Frage[] = [
  // ---- Quantil- und Strafregression ----
  {
    id: 'mo-quantil-lesen', thema: 'modelle', karte: 'vorhersage',
    stamm: P('Die Quantilregression meldet für das obere Quartil ein b zu einer Vorhersagegröße. Was bedeutet dieses b?',
      'The quantile regression reports a b for the upper quartile for a predictor. What does this b mean?'),
    antworten: [
      a(P('Die Veränderung der 75-%-Grenze je Einheit mehr der Vorhersagegröße, bei gleichem Wert', 'The change of the 75% limit per extra unit of the predictor, at the same value'),
        P('b ist die Veränderung des bedingten Quantils. "Bedingt" heißt: für alle Personen mit demselben Wert der Vorhersagegröße.', 'b is the change of the conditional quantile. "Conditional" means: for all people with the same value of the predictor.'), true),
      a(P('Der Mittelwert der obersten 25 % der Personen, je Einheit mehr der Vorhersagegröße', 'The mean of the top 25% of the people, per extra unit of the predictor'),
        P('Die Quantilregression sagt eine Grenze voraus, nicht den Mittelwert einer Teilgruppe. Der Mittelwert steht nur in der gewöhnlichen Regression darunter.',
          'The quantile regression predicts a limit, not the mean of a subgroup. The mean appears only in the ordinary regression shown below.')),
      a(P('Um wie viel eine einzelne Person im 75. Perzentil liegt, je Einheit mehr der Vorhersagegröße', 'By how much a single person lies in the 75th percentile, per extra unit of the predictor'),
        P('Eine Person steht nicht "im 75. Perzentil". Die 75-%-Grenze gehört zu allen Personen mit diesem Wert der Vorhersagegröße.',
          'A person is not "in the 75th percentile". The 75% limit belongs to all people with this value of the predictor.'))
    ],
    hilfe: ['quantilregression'], belege: ['Hilfe:quantilregression', 'Fachblatt:SPAETER-E-VORHERSAGE-ZEITREIHEN-CLUSTER']
  },
  {
    id: 'mo-quantil-mehrfach', thema: 'modelle', mehrfach: true, karte: 'vorhersage',
    stamm: P('Welche Aussagen zur Quantilregression in Statable stimmen? Mehrere können stimmen.', 'Which statements about quantile regression in Statable are correct? Several may be correct.'),
    antworten: [
      a(P('Ausreißer im Ziel stören sie kaum, und sie nimmt keine gleiche Streuung an', 'Outliers in the outcome hardly disturb it, and it assumes no equal spread'),
        P('Sie sagt den Median oder ein anderes Quantil voraus und ist robust gegen Ausreißer im Ziel und gegen schiefe Verteilungen.',
          'It predicts the median or another quantile and is robust against outliers in the outcome and against skewed distributions.'), true),
      a(P('Statable zeigt kein R²; zum Vergleich steht die gewöhnliche Regression darunter', 'Statable shows no R²; the ordinary regression is shown below for comparison'),
        P('Statable zeigt bei der Quantilregression kein R². Daneben steht die gewöhnliche Regression des Mittelwerts.',
          'For quantile regression Statable shows no R². Next to it stands the ordinary regression of the mean.'), true),
      a(P('Sie schützt auch vor Ausreißern in den Vorhersagegrößen', 'It also protects against outliers in the predictors'),
        P('Vor Ausreißern in den Vorhersagegrößen schützt sie nicht. Ihre Robustheit gilt für das Ziel.',
          'It does not protect against outliers in the predictors. Its robustness applies to the outcome.')),
      a(P('Überlappen die Intervalle zweier Quantile, ist gleiche Steigung belegt', 'If the intervals of two quantiles overlap, equal slopes are proved'),
        P('Überlappung belegt keinen Unterschied der Steigungen und widerlegt ihn nicht. Ein Test auf gleiche Steigungen ist dieser Vergleich nicht.',
          'Overlap neither proves a difference of the slopes nor refutes it. This comparison is not a test for equal slopes.'))
    ],
    hilfe: ['quantilregression'], belege: ['Hilfe:quantilregression', 'Fachblatt:SPAETER-E-VORHERSAGE-ZEITREIHEN-CLUSTER']
  },
  {
    id: 'mo-strafe-p', thema: 'modelle', karte: 'vorhersage',
    stamm: P('Warum zeigt die Strafregression (Ridge, Lasso, Elastic Net) in Statable keine p-Werte?', 'Why does the penalised regression (ridge, lasso, elastic net) in Statable show no p values?'),
    antworten: [
      a(P('Auswahl und Schätzung stammen aus denselben Daten; Tests wären zu optimistisch', 'Selection and estimation come from the same data; tests would be too optimistic'),
        P('Darum gibt es auch absichtlich keinen Knopf "mit den gewählten Größen gewöhnlich rechnen". Das Ziel ist eine gute Vorhersage, nicht der Test einzelner Effekte.', 'That is why there is deliberately no button "calculate ordinarily with the chosen variables". The aim is a good prediction, not the test of single effects.'), true),
      a(P('Lasso schätzt keine Koeffizienten, es wählt nur Größen aus und lässt die übrigen weg', 'Lasso estimates no coefficients, it only selects variables and drops the others'),
        P('Auch Lasso liefert Koeffizienten, unwichtige setzt es ganz auf null. Die Tabelle zeigt sie auf der Originalskala und standardisiert.',
          'Lasso also yields coefficients, setting unimportant ones to zero. The table shows them on the original scale and standardised.')),
      a(P('Das Verfahren ist nur für Ja/Nein-Ziele gedacht, und dort gibt es ausschließlich Odds Ratios', 'The method is meant only for yes/no outcomes, and there only odds ratios exist'),
        P('Das Ziel ist hier eine Zahl mit mehr als zwei Werten. Der Grund für fehlende p-Werte liegt in der Auswahl aus denselben Daten.',
          'The outcome here is a number with more than two values. The reason for missing p values lies in the selection from the same data.'))
    ],
    hilfe: ['strafregression'], belege: ['Hilfe:strafregression', 'Fachblatt:SPAETER-E-VORHERSAGE-ZEITREIHEN-CLUSTER']
  },
  {
    id: 'mo-strafe-gewaehlt', thema: 'modelle', karte: 'vorhersage',
    stamm: P('Lasso hat eine Vorhersagegröße im Modell behalten. Was folgt daraus?', 'Lasso has kept a predictor in the model. What follows from that?'),
    antworten: [
      a(P('Die Größe wurde ins Modell gewählt; das heißt noch nicht, dass sie wichtig ist', 'The variable was chosen for the model; that does not yet mean it is important'),
        P('Die Tabelle nennt, ob die Größe im Modell ist und in wie vielen Wiederholungen sie gewählt wurde. Wichtigkeit oder Wirkung ist damit nicht belegt.',
          'The table states whether the variable is in the model and in how many repetitions it was chosen. Importance or effect is not shown by that.'), true),
      a(P('Die Größe ist signifikant, sie wirkt also nachweislich auf das Ziel', 'The variable is significant, so it demonstrably acts on the outcome'),
        P('Es gibt keine p-Werte, und Statable fordert, im Text "Vorhersage" zu schreiben, nicht "Wirkung".',
          'There are no p values, and Statable asks to write "prediction" in the text, not "effect".')),
      a(P('Die Größe ist ursächlich für das Ziel, weil Lasso Ursachen von Begleitern trennt', 'The variable causes the outcome, because lasso separates causes from companions'),
        P('Lasso trennt keine Ursachen. Die Auswahl einer Gruppenstufe hängt sogar davon ab, welche Gruppe als Vergleich dient.',
          'Lasso does not separate causes. The selection of a group level even depends on which group serves as the reference.'))
    ],
    hilfe: ['strafregression'], belege: ['Hilfe:strafregression', 'Fachblatt:SPAETER-E-VORHERSAGE-ZEITREIHEN-CLUSTER']
  },
  // ---- Ordinale Regression, Probit, Gewichte, Kurve ----
  {
    id: 'mo-ordinal-or', thema: 'modelle', karte: 'vorhersage',
    stamm: P('Die ordinale Regression meldet für eine Vorhersagegröße ein Odds Ratio über 1. Wie liest man es?', 'The ordinal regression reports an odds ratio above 1 for a predictor. How is it read?'),
    antworten: [
      a(P('Höhere Werte der Vorhersagegröße gehen mit höheren Stufen einher, an jeder Trennstelle gleich', 'Higher values of the predictor go with higher levels, equally at every cut point'),
        P('Das OR ist der Faktor, um den die Chance auf eine höhere Stufe steigt. Dass er für jede Trennstelle derselbe ist, ist die Annahme paralleler Linien.', 'The OR is the factor by which the chance of a higher level rises. That it is the same for every cut point is the assumption of parallel lines.'), true),
      a(P('Die Chance auf genau die höchste Stufe steigt um diesen Faktor, die übrigen Stufen bleiben gleich', 'The chance of exactly the highest level rises by this factor, the other levels stay the same'),
        P('Das OR bezieht sich auf die Chance auf eine höhere Stufe insgesamt, an jeder Trennstelle. Nicht nur die oberste Stufe ändert sich.',
          'The OR refers to the chance of a higher level overall, at every cut point. Not only the top level changes.')),
      a(P('Die Zahl der Stufen steigt um diesen Faktor, wenn die Vorhersagegröße um eine Einheit steigt', 'The number of levels rises by this factor when the predictor rises by one unit'),
        P('Die Stufen sind vorgegeben. Das OR beschreibt die Chance, auf einer höheren Stufe zu landen.',
          'The levels are given. The OR describes the chance of ending up on a higher level.'))
    ],
    hilfe: ['ordinale-regression'], belege: ['Hilfe:ordinale-regression', 'Fachblatt:WELLE3-REGRESSION-KATEGORIEN-ZAEHLDATEN']
  },
  {
    id: 'mo-ordinal-mehrfach', thema: 'modelle', mehrfach: true, karte: 'vorhersage',
    stamm: P('Welche Aussagen zur ordinalen Regression in Statable stimmen? Mehrere können stimmen.', 'Which statements about ordinal regression in Statable are correct? Several may be correct.'),
    antworten: [
      a(P('Ein signifikanter Brant-Test spricht gegen gleiche Wirkung über alle Stufen', 'A significant Brant test speaks against an equal effect across all levels'),
        P('Es ist ein Hinweis, kein Beweis: Bei großen Stichproben schlägt jeder Test schon bei kleinen Abweichungen an. Dann fasst ein einziges OR die Wirkung vermutlich nur ungenau zusammen; Statable bietet die multinomiale Regression an.',
          'It is a hint, not proof: with large samples every test reacts to small deviations. Then a single OR probably summarises the effect only imprecisely; Statable offers the multinomial regression.'), true),
      a(P('Die Reihenfolge der Stufen folgt dem Zahlencode, nicht dem Alphabet', 'The order of the levels follows the number code, not the alphabet'),
        P('Zahlen werden nach ihrem Code geordnet. Text rechnet Statable nur, wenn die Reihenfolge unter "Spalten beschreiben" festgelegt ist.',
          'Numbers are ordered by their code. Statable uses text only if the order is set under "Describe columns".'), true),
      a(P('Die Schwellen sind die Ergebnisse, die man deutet und berichtet', 'The thresholds are the results one interprets and reports'),
        P('Die Schwellen gehören zur Modellgleichung und werden nicht gedeutet. Gedeutet werden die Odds Ratios.',
          'The thresholds belong to the model equation and are not interpreted. The odds ratios are interpreted.')),
      a(P('Nagelkerkes R² ist der erklärte Anteil der Streuung wie bei der linearen Regression', 'Nagelkerke R² is the explained share of the variance as in linear regression'),
        P('Das R² ist ein Pseudo-R² und kein erklärter Anteil wie bei der linearen Regression.',
          'The R² is a pseudo-R² and not an explained share as in linear regression.'))
    ],
    hilfe: ['ordinale-regression'], belege: ['Hilfe:ordinale-regression', 'Fachblatt:WELLE3-REGRESSION-KATEGORIEN-ZAEHLDATEN']
  },
  {
    id: 'mo-probit', thema: 'modelle', karte: 'vorhersage',
    stamm: P('Worin unterscheidet sich die Probit-Regression in der Aussage von der logistischen Regression?', 'How does the probit regression differ in its statement from the logistic regression?'),
    antworten: [
      a(P('Beide sagen meist dasselbe; Odds Ratios gibt es nur beim Logit, nicht beim Probit', 'Both usually say the same; odds ratios exist only for logit, not for probit'),
        P('Die Wahl ist keine Frage des Ergebnisses. Probit ist in manchen Fächern üblich; sonst ist Logit der Standard, weil sich dort Odds Ratios angeben lassen.', 'The choice is not a matter of the result. Probit is customary in some fields; otherwise logit is the default because odds ratios can be given there.'), true),
      a(P('Probit sagt eine Zahl voraus, Logit dagegen ein Ja/Nein-Ereignis, und beide sagen Verschiedenes', 'Probit predicts a number, logit by contrast a yes/no event, and the two say different things'),
        P('Beide sagen ein Ja/Nein-Ereignis voraus. Verschieden ist nur die Verknüpfung: Normalverteilung oder logistische Verteilung.',
          'Both predict a yes/no event. Only the link differs: normal distribution or logistic distribution.')),
      a(P('Probit zeigt Odds Ratios, Logit nur die Wahrscheinlichkeiten, und beide gelten für Zählungen', 'Probit shows odds ratios, logit only the probabilities, and both apply to counts'),
        P('Es ist umgekehrt: Odds Ratios gibt es nur beim Logit.',
          'It is the other way round: odds ratios exist only for the logit.'))
    ],
    hilfe: ['probit-regression'], belege: ['Hilfe:probit-regression']
  },
  {
    id: 'mo-gewicht', thema: 'modelle', karte: 'vorhersage',
    stamm: P('Was unterscheidet die Präzisionsgewichte der gewichteten Regression vom Fallgewicht?', 'What distinguishes the precision weights of the weighted regression from the case weight?'),
    antworten: [
      a(P('Präzisionsgewichte beschreiben die Genauigkeit, das Fallgewicht zählt Fälle und ändert n', 'Precision weights describe exactness, the case weight counts cases and changes n'),
        P('Bei Präzisionsgewichten bleibt n die Zahl der Zeilen mit Gewicht über null. Beides zugleich geht nicht; Statable sagt das in einem Satz.', 'With precision weights n remains the number of rows with a weight above zero. Both at once is not possible; Statable says so in a sentence.'), true),
      a(P('Präzisionsgewichte ändern die Fallzahl n und zählen Fälle, das Fallgewicht lässt n unverändert', 'Precision weights change the sample size n and count cases, the case weight leaves n unchanged'),
        P('Es ist umgekehrt: Das Fallgewicht zählt Fälle und ändert n, Präzisionsgewichte nicht.',
          'It is the other way round: the case weight counts cases and changes n, precision weights do not.')),
      a(P('Beide sind dasselbe, nur anders benannt, und lassen sich in Statable gemeinsam verwenden', 'Both are the same, only named differently, and can be used together in Statable'),
        P('Sie bedeuten Verschiedenes, und gemeinsam gesetzt sperren sie die Rechnung mit einem Hinweis.',
          'They mean different things, and set together they block the calculation with a note.'))
    ],
    hilfe: ['gewichtete-regression'], belege: ['Hilfe:gewichtete-regression']
  },
  {
    id: 'mo-nichtlin', thema: 'modelle', karte: 'vorhersage',
    stamm: P('Der Zusammenhang verläuft als Kurve. Wonach wählt man bei der nichtlinearen Regression die feste Formel (Michaelis-Menten, exponentiell, logistisch, Potenz)?',
      'The relationship runs as a curve. By what does one choose the fixed formula in nonlinear regression (Michaelis-Menten, exponential, logistic, power)?'),
    antworten: [
      a(P('Nach der sachlichen Begründung, nicht nach der besten Passung zu den Daten', 'By the substantive justification, not by which formula fits the data best'),
        P('Dass eine Kurve gut passt, belegt nicht, dass der Zusammenhang so verläuft. Eine freie Formel gibt es in Statable nicht.', 'That a curve fits well does not prove that the relationship runs that way. There is no free formula in Statable.'), true),
      a(P('Nach dem höchsten R² der vier Formeln, weil das R² die Güte der Kurve misst', 'By the highest R² of the four formulas, because the R² measures the quality of the curve'),
        P('Bei der nichtlinearen Regression zeigt Statable gar kein R², weil das scheinbare R² nicht wie bei der linearen Regression zu lesen ist.',
          'For nonlinear regression Statable shows no R² at all, since the apparent R² cannot be read as in linear regression.')),
      a(P('Nach den kleinsten p-Werten der Parameter, weil sie die Güte der Anpassung zeigen', 'By the smallest p values of the parameters, because they show the quality of the fit'),
        P('p-Werte und Intervalle sind hier Näherungen und taugen nicht zur Wahl der Formel. Die Residuen sollten angesehen werden.',
          'The p values and intervals here are approximations and are no basis for choosing the formula. The residuals should be inspected.'))
    ],
    hilfe: ['nichtlineare-regression'], belege: ['Hilfe:nichtlineare-regression']
  },
  // ---- Überleben: Sterbetafel, Cox, AFT, Frailty ----
  {
    id: 'mo-sterbe-risiko', thema: 'modelle', karte: 'kaplanmeier',
    stamm: P('Wie wird die Spalte "Dem Risiko ausgesetzt" in der Sterbetafel gebildet?', 'How is the column "Exposed to risk" formed in the life table?'),
    antworten: [
      a(P('Am Anfang dabei minus die Hälfte der im Abschnitt Ausgeschiedenen (Zensierten)', 'At the start minus half of those who dropped out (censored) in the interval'),
        P('Die Tafel nimmt an, dass die Ausgeschiedenen gleichmäßig über den Abschnitt ausscheiden und darum im Mittel nur den halben Abschnitt dabei waren.', 'The table assumes that those who dropped out do so evenly across the interval and were therefore present for half the interval on average.'), true),
      a(P('Am Anfang dabei minus alle im Abschnitt Ausgeschiedenen, weil sie nicht mehr beobachtet sind', 'At the start minus all who dropped out in the interval, since they are no longer observed'),
        P('Dann würden Ausgeschiedene gar nicht zum Risiko beitragen, obwohl sie einen Teil des Abschnitts noch beobachtet wurden.',
          'Then those who dropped out would not contribute to the risk at all, although they were still observed for part of the interval.')),
      a(P('Am Anfang dabei plus die Hälfte der Ereignisse, die im Abschnitt eintreten', 'At the start plus half of the events that occur in the interval'),
        P('Ereignisse werden nicht dazugezählt. Die Halb-Regel gilt für die Ausgeschiedenen, die zensiert wurden.',
          'Events are not added. The half rule applies to those who dropped out, who were censored.'))
    ],
    hilfe: ['sterbetafel'], belege: ['Hilfe:sterbetafel', 'Fachblatt:SPAETER-F-UEBERLEBEN-MEDIZIN']
  },
  {
    id: 'mo-sterbe-km', thema: 'modelle', mehrfach: true, karte: 'kaplanmeier',
    stamm: P('Welche Aussagen zur Sterbetafel gegenüber der Kaplan-Meier-Kurve stimmen? Mehrere können stimmen.',
      'Which statements about the life table compared with the Kaplan-Meier curve are correct? Several may be correct.'),
    antworten: [
      a(P('Bei Einzeldaten bleibt die Kaplan-Meier-Kurve die genauere Antwort', 'With individual data the Kaplan-Meier curve remains the more exact answer'),
        P('Sie rechnet mit den Einzelzeiten, die Sterbetafel mit Abschnitten und halb gezählten Ausgeschiedenen.',
          'It works with the individual times, the life table with intervals and half-counted dropouts.'), true),
      a(P('Bei breiten Abschnitten und vielen Ausgeschiedenen weichen beide etwas voneinander ab', 'With wide intervals and many dropouts the two differ somewhat'),
        P('Bei engen Abschnitten und wenigen Ausgeschiedenen sind sie fast gleich.',
          'With narrow intervals and few dropouts they are almost the same.'), true),
      a(P('Die Breite der Abschnitte ändert das Ergebnis nicht, nur die Darstellung', 'The width of the intervals does not change the result, only the display'),
        P('Die Breite ändert das Ergebnis, vor allem den Median, der innerhalb eines Abschnitts geradlinig berechnet wird. Statable schlägt eine glatte Breite mit etwa zehn Abschnitten vor.',
          'The width changes the result, above all the median, which is computed linearly within an interval. Statable suggests a round width giving about ten intervals.')),
      a(P('Der Test "Wilcoxon (Gehan)" in der Sterbetafel gewichtet alle Zeitpunkte gleich', 'The "Wilcoxon (Gehan)" test in the life table weights all time points equally'),
        P('Das wäre der Log-Rank-Test. Der Test nach Gehan gewichtet frühe Ereignisse stärker und hängt vom Muster der Zensierung ab.',
          'That would be the log-rank test. The Gehan test weights early events more heavily and depends on the pattern of censoring.'))
    ],
    hilfe: ['sterbetafel'], belege: ['Hilfe:sterbetafel', 'Fachblatt:SPAETER-F-UEBERLEBEN-MEDIZIN']
  },
  {
    id: 'mo-cox-zeit', thema: 'modelle', karte: 'kaplanmeier',
    stamm: P('Eine Therapie beginnt bei manchen Personen erst im Lauf der Beobachtung. Warum die zeitabhängige Größe statt einer festen Gruppe "jemals gewechselt"?',
      'A therapy starts for some people only during the follow-up. Why the time-dependent variable instead of a fixed group "ever switched"?'),
    antworten: [
      a(P('Um den Unsterblichkeitsfehler zu vermeiden: Spätere Wechsler mussten bis dahin überleben', 'To avoid immortal-time bias: anyone who switches later had to survive until then'),
        P('Zählt man ihn von Anfang an zur Gruppe der Gewechselten, sieht diese Gruppe nur wegen dieses Fehlers länger lebend aus. Die Größe darf zu jedem Zeitpunkt nur Werte haben, die dann schon bekannt waren.',
          'If he is counted from the start in the group of switchers, that group looks longer-lived merely because of this error. At any time the variable may only have values that were already known then.'), true),
      a(P('Weil eine feste Gruppe zu wenige Ereignisse hätte und die Rechnung deshalb unsicher würde', 'Because a fixed group would have too few events and the calculation would therefore be uncertain'),
        P('Die Zahl der Ereignisse ist nicht der Grund. Das Problem ist, dass die Gruppenzuordnung Wissen aus der Zukunft nutzt.',
          'The number of events is not the reason. The problem is that the group assignment uses knowledge from the future.')),
      a(P('Weil die Cox-Regression keine Gruppen-Spalten verarbeiten kann, sondern nur Zahlenspalten', 'Because the Cox regression cannot process group columns, only number columns'),
        P('Die Cox-Regression nimmt Zahlen und Gruppen-Spalten. Die zeitabhängige Größe löst ein anderes Problem.',
          'The Cox regression takes numbers and group columns. The time-dependent variable solves a different problem.'))
    ],
    hilfe: ['cox-zeitabhaengig'], belege: ['Hilfe:cox-zeitabhaengig', 'Fachblatt:SPAETER-F2-ERGAENZUNGEN']
  },
  {
    id: 'mo-aft-vorzeichen', thema: 'modelle', karte: 'kaplanmeier',
    stamm: P('Ein AFT-Modell nennt für eine Gruppe ein Zeitverhältnis über 1. Wie liest man das?', 'An AFT model reports a time ratio above 1 for a group. How is that read?'),
    antworten: [
      a(P('Die Zeit bis zum Ereignis ist länger; in Cox hieße das meist Hazard Ratio unter 1', 'The time to the event is longer; in Cox that usually means a hazard ratio below 1'),
        P('Ein positives b heißt beim AFT-Modell eine längere Zeit, bei der Cox-Regression ein höheres Risiko. Dieselbe Aussage hat darum entgegengesetztes Vorzeichen.', 'A positive b means a longer time in the AFT model, a higher risk in the Cox regression. The same statement therefore has the opposite sign.'), true),
      a(P('Das Ereignis tritt früher ein, genau wie bei einer Hazard Ratio über 1 in der Cox-Regression', 'The event occurs earlier, just as with a hazard ratio above 1 in the Cox regression'),
        P('Ein Zeitverhältnis über 1 heißt eine längere Zeit. Eine Hazard Ratio über 1 würde für ein höheres Risiko, also kürzere Zeiten, stehen.',
          'A time ratio above 1 means a longer time. A hazard ratio above 1 would stand for a higher risk, that is shorter times.')),
      a(P('Es ist ein Risikoverhältnis, nur in anderer Schreibweise, und größer als 1 heißt mehr Risiko', 'It is a risk ratio, only written differently, and larger than 1 means more risk'),
        P('Das Zeitverhältnis ist kein Hazard. Beim erwünschten Ereignis, etwa einer Genesung, ist ein Zeitverhältnis über 1 sogar schlecht, weil es länger dauert.',
          'The time ratio is no hazard. For a desired event such as recovery a time ratio above 1 is even bad because it takes longer.'))
    ],
    hilfe: ['aft-modell'], belege: ['Hilfe:aft-modell', 'Fachblatt:SPAETER-F2-ERGAENZUNGEN']
  },
  {
    id: 'mo-frailty-cluster', thema: 'modelle', karte: 'kaplanmeier',
    stamm: P('Mehrere Zeilen gehören zur selben Gruppe (Würfe, Zentren). Was ändert "Cluster" gegenüber der gewöhnlichen Cox-Regression?',
      'Several rows belong to the same group (litters, centres). What does "cluster" change compared with the ordinary Cox regression?'),
    antworten: [
      a(P('Nur die Standardfehler; die Hazard Ratios bleiben genau gleich', 'Only the standard errors; the hazard ratios remain exactly the same'),
        P('Bei Cluster gelten die Hazard Ratios im Mittel über die Gruppen (marginal). Erst Frailty gibt jeder Gruppe eine eigene Neigung und verändert die Schätzung.',
          'With cluster the hazard ratios apply on average across the groups (marginal). Only frailty gives each group its own propensity and changes the estimate.'), true),
      a(P('Die Hazard Ratios, weil jede Gruppe damit eine eigene Neigung zum Ereignis bekommt', 'The hazard ratios, because each group thereby gets its own propensity for the event'),
        P('Das beschreibt Frailty. Beides zugleich rechnet Statable nie.',
          'That describes frailty. Statable never calculates both at once.')),
      a(P('Gar nichts, Cluster ist nur ein anderer Name für Frailty mit denselben Zahlen', 'Nothing at all, cluster is merely another name for frailty with the same numbers'),
        P('Es sind zwei Wege mit verschiedenen Zahlen: Cluster gilt marginal, Frailty bei gleicher Gruppe (bedingt).',
          'They are two routes with different numbers: cluster applies marginally, frailty for the same group (conditional).'))
    ],
    hilfe: ['cox-frailty'], belege: ['Hilfe:cox-frailty', 'Fachblatt:SPAETER-F2-ERGAENZUNGEN']
  },
  {
    id: 'mo-cox-mehrfach', thema: 'modelle', mehrfach: true, karte: 'kaplanmeier',
    stamm: P('Welche Aussagen zur Cox-Regression in Statable stimmen? Mehrere können stimmen.', 'Which statements about the Cox regression in Statable are correct? Several may be correct.'),
    antworten: [
      a(P('Eine Hazard Ratio von 2 heißt nicht, dass das Ereignis doppelt so wahrscheinlich ist', 'A hazard ratio of 2 does not mean that the event is twice as likely'),
        P('Eine Hazard Ratio ist kein Risikoverhältnis. Sie vergleicht das momentane Risiko, dass das Ereignis jetzt eintritt, bei denen, bei denen es bis jetzt noch nicht eintrat.', 'A hazard ratio is no risk ratio. It compares the instantaneous risk that the event occurs now among those for whom it has not yet occurred.'), true),
      a(P('Die Annahme proportionaler Hazards prüft Statable mit dem Score-Test cox.zph', 'Statable checks the proportional hazards assumption with the score test cox.zph'),
        P('Bei einem p unter dem Niveau steht der Hinweis zuerst im Ergebnis: Die Hazard Ratio ändert sich dann über die Zeit.', 'If p is below the level, the note appears first in the result: the hazard ratio then changes over time.'), true),
      a(P('Bei gleichen Ereigniszeiten rechnet Statable nach Breslow, wie SPSS', 'With tied event times Statable calculates by Breslow, like SPSS'),
        P('Statable rechnet wie R nach Efron, der genauer ist. SPSS (COXREG) rechnet nach Breslow; einen Schalter gibt es nicht.', 'Statable calculates by Efron like R, which is more exact. SPSS (COXREG) calculates by Breslow; there is no switch.')),
      a(P('Unter 10 Ereignissen je Koeffizient sperrt Statable die Rechnung', 'With fewer than 10 events per coefficient Statable blocks the calculation'),
        P('Die 10 Ereignisse sind eine Faustregel. Mit weniger sind die Hazard Ratios sehr unsicher, und Statable meldet einen Hinweis schon vor dem Rechnen.', 'The 10 events are a rule of thumb. With fewer the hazard ratios are very uncertain, and Statable reports a note before calculating.'))
    ],
    hilfe: ['cox-regression'], belege: ['Hilfe:cox-regression', 'Fachblatt:SPAETER-F-UEBERLEBEN-MEDIZIN']
  }
];
export const FAELLE: ThemaModul['FAELLE'] = {};
