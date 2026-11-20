/**
 * Hilfe-Artikel zur Delphi-Befragung (B3 Teil 2b, 14.11.2026): `delphi`. Nur Deutsch und Englisch, jeder Text ein Textpaar P(de, en).
 * Die Lehreinheit mit Rechenbeispiel folgt in Teil 2c. Quellen (eigene Worte): Hsu & Sandford (2007), Practical Assessment, Research & Evaluation 12(10);
 * Diamond et al. (2014), Journal of Clinical Epidemiology 67; Kendall & Babington Smith (1939), Annals of Mathematical Statistics 10.
 */
import { P } from '../i18n/laufzeit';
import { a, falsch, mitnehmen, type Roh } from './artikel-roh';

const Q_DELPHI = P('Hsu, C.-C. & Sandford, B. A. (2007). The Delphi technique: Making sense of consensus. Practical Assessment, Research & Evaluation, 12(10). Diamond, I. R. et al. (2014). Defining consensus: A systematic review recommends methodologic criteria for reporting of Delphi studies. Journal of Clinical Epidemiology, 67, 401-409. Kendall, M. G. & Babington Smith, B. (1939). The problem of m rankings. Annals of Mathematical Statistics, 10, 275-287.',
  'Hsu, C.-C. & Sandford, B. A. (2007). The Delphi technique: Making sense of consensus. Practical Assessment, Research & Evaluation, 12(10). Diamond, I. R. et al. (2014). Defining consensus: A systematic review recommends methodologic criteria for reporting of Delphi studies. Journal of Clinical Epidemiology, 67, 401-409. Kendall, M. G. & Babington Smith, B. (1939). The problem of m rankings. Annals of Mathematical Statistics, 10, 275-287.');

export const ROH_DELPHI: Roh[] = [
  a('delphi', 'fragen', P('Sind sich die Fachleute einig? (Delphi-Befragung, Konsens)', 'Do the experts agree? (Delphi survey, consensus)'),
    P('Delphi Delphi-Befragung Konsens Expertenbefragung Fachleute Quartilsabstand IQR Median Kendalls W Übereinstimmung Runden Aussagen bewerten', 'Delphi Delphi survey consensus expert survey experts interquartile range IQR median Kendall\'s W agreement rounds rate statements'),
    [
      { h: P('Kurz', 'In brief') },
      P('Bei einer Delphi-Befragung bewerten Fachleute in mehreren Runden dieselben Aussagen, zum Beispiel von 1 (stimme gar nicht zu) bis 5 (stimme voll zu). Nach jeder Runde sehen sie, wie die Gruppe geantwortet hat, und bewerten neu. Am Ende fragt man: Bei welchen Aussagen sind sich die Fachleute einig?',
        'In a Delphi survey experts rate the same statements in several rounds, for example from 1 (strongly disagree) to 5 (strongly agree). After each round they see how the group answered and rate again. In the end the question is: for which statements do the experts agree?'),
      { h: P('Was Statable zeigt', 'What Statable shows') },
      { ul: [
        P('Je Aussage: Zahl der Bewertungen, Median, erstes und drittes Quartil, Quartilsabstand (IQR, die Breite der mittleren Hälfte der Bewertungen), Mittelwert, Standardabweichung und den Anteil der Bewertungen in einem Bereich, den Sie wählen (zum Beispiel 4 bis 5).', 'Per statement: number of ratings, median, first and third quartile, interquartile range (IQR, the width of the middle half of the ratings), mean, standard deviation and the share of ratings in a range you choose (for example 4 to 5).'),
        P('„Konsens“ nur nach Ihrer Regel: Sie legen fest, wie groß der Quartilsabstand höchstens sein darf und welcher Anteil mindestens im Bereich liegen muss. Beides ist freiwillig; ohne gesetzte Regel nennt Statable nie einen Konsens. Die Regel gehört vor die Befragung, damit sie nicht den Ergebnissen angepasst wird.', '"Consensus" only by your rule: you set how large the interquartile range may be at most and what share has to lie in the range at least. Both are optional; without a rule Statable never names a consensus. The rule belongs before the survey so that it is not fitted to the results.'),
        P('Kendalls W (Kendall\'s coefficient of concordance): wie ähnlich die Fachleute die Aussagen in eine Rangfolge bringen, von 0 (gar nicht) bis 1 (alle gleich). Es zählen nur Personen mit allen Bewertungen.', 'Kendall\'s W (coefficient of concordance): how similarly the experts put the statements in order, from 0 (not at all) to 1 (all the same). Only people with all ratings count.')
      ] },
      { h: P('So geht es in Statable', 'How to do it in Statable') },
      { ol: [
        P('Eine Datei öffnen, in der jede Zeile eine Person ist und jede Spalte eine Aussage (Zahlen, mindestens drei Spalten). Eine Runde je Datei.', 'Open a file in which each row is a person and each column a statement (numbers, at least three columns). One round per file.'),
        P('Die Frage „Messen meine Fragen dasselbe? (Skalen-Auswertung, Cronbachs Alpha)“ mit diesen Spalten rechnen.', 'Run the question "Do my questions measure the same thing? (scale analysis, Cronbach\'s alpha)" with these columns.'),
        P('Unter dem Ergebnis „Sind sich die Fachleute einig? (Delphi-Befragung, Konsens)“ öffnen, Ihre Regel eintragen und die Tabelle lesen. „Als CSV speichern“ und „Als R-Skript mit Daten (.zip)“ nehmen die Zahlen mit.', 'Under the result open "Do the experts agree? (Delphi survey, consensus)", enter your rule and read the table. "Save as CSV" and "As R script with data (.zip)" take the numbers with you.')
      ] },
      { h: P('Grenzen', 'Limits') },
      { ul: [
        P('Die Runden vergleichen Sie, indem Sie jede Runde einzeln auswerten und Median, Quartilsabstand und Anteil nebeneinanderlegen. Einen Test zwischen den Runden gibt es nicht: Die Fachleute sind selten in jeder Runde dieselben, also nicht gepaart.', 'Compare the rounds by analysing each round on its own and putting median, interquartile range and share side by side. There is no test between rounds: the experts are rarely the same in every round, so they are not paired.'),
        P('Konsens heißt nicht, dass die Aussage stimmt. Er heißt nur, dass die Befragten sich nach Ihrer Regel einig sind.', 'Consensus does not mean the statement is true. It only means that the respondents agree by your rule.')
      ] },
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      falsch(P('Ein Konsens ist erreicht, wenn der Mittelwert hoch ist.', 'Consensus is reached when the mean is high.'),
        P('Ein hoher Mittelwert kann aus gemischten Urteilen entstehen. Wichtig ist, wie nah die Bewertungen beieinanderliegen: Quartilsabstand und Anteil im Bereich.', 'A high mean can come from mixed ratings. What matters is how close the ratings are: interquartile range and share in the range.')),
      { h: P('Quellen', 'Sources') },
      Q_DELPHI,
      mitnehmen(
        P('Die Regel für „Konsens“ legen Sie vorher selbst fest; Statable gibt keine vor.', 'You set the rule for "consensus" yourself beforehand; Statable sets none.'),
        P('Median und Quartilsabstand beschreiben Rangurteile besser als der Mittelwert.', 'Median and interquartile range describe ratings on a scale better than the mean.'),
        P('Kendalls W zeigt die Übereinstimmung der Rangfolgen, nicht die Höhe der Zustimmung.', 'Kendall\'s W shows the agreement of the rankings, not the level of approval.'),
        P('Runden vergleicht man Aussage für Aussage, ohne Test.', 'Rounds are compared statement by statement, without a test.')
      )
    ], ['ta-woerter-zaehlen'])
];
