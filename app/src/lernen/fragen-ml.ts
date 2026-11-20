/**
 * Üben: Maschinelles Lernen verstehen (V5 Teil 2, 14.11.2026; Einheiten ml-grundidee, ml-knn, ml-ueberanpassung, ml-konfusionsmatrix in lernplan-ml.ts).
 * Kennungen `ml-<kürzel>-…` (gi, kn, ue, km). Eigene Wortlaute. Alle Zahlen aus echten Daten (Palmer-Pinguine, CC0, Geschlecht aus Schnabeltiefe und Körpermasse,
 * 70 % Training) über scripts/ueben-erwartet-ml.R → lib/testdaten/ueben-erwartet-ml.json (zweiter Weg im Skript); Wächter lernen/fragen-ml.test.ts.
 * Nur ml-km-selten ist ein gedachtes Zahlenbeispiel (5 von 100) zur Grundrate. Quellen: James, Witten, Hastie & Tibshirani (2021), ISLR, Kap. 2.2, 4, 5.1.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const ISLR_22 = 'James, Witten, Hastie & Tibshirani 2021, An Introduction to Statistical Learning, Kap. 2.2';
const ISLR_4 = 'James, Witten, Hastie & Tibshirani 2021, An Introduction to Statistical Learning, Kap. 4';
const ISLR_51 = 'James, Witten, Hastie & Tibshirani 2021, An Introduction to Statistical Learning, Kap. 5.1';
const RECHNUNG = 'Rechnung: scripts/ueben-erwartet-ml.R';
const MATRIX_DE = 'kNN mit k = 15 sagt das Geschlecht von 100 Testpinguinen voraus. Von 52 weiblichen Tieren werden 43 als weiblich und 9 als männlich vorhergesagt, von 48 männlichen 42 als männlich und 6 als weiblich.';
const MATRIX_EN = 'kNN with k = 15 predicts the sex of 100 test penguins. Of 52 female animals, 43 are predicted as female and 9 as male; of 48 male animals, 42 are predicted as male and 6 as female.';

export const FRAGEN: Frage[] = [
  // ======================================================== 1. Grundidee (ml-grundidee)
  {
    id: 'ml-gi-zweck', thema: 'ml',
    stamm: P('Von 333 Pinguinen kommen 233 zufällig in die Trainingsdaten und 100 in die Testdaten. Wozu dienen die 100 Testtiere? (überwachtes Lernen)', 'Of 333 penguins, 233 are put at random into the training data and 100 into the test data. What are the 100 test animals for? (supervised learning)'),
    antworten: [
      a(P('Sie zeigen, wie gut das Modell bei Fällen trifft, die es beim Lernen nicht gesehen hat', 'They show how well the model does on cases it did not see while learning'), P('Genau dafür werden sie zurückgehalten: Ihr Fehler schätzt die Güte bei neuen Fällen.', 'That is exactly why they are held back: their error estimates the quality on new cases.'), true),
      a(P('Sie vergrößern die Trainingsdaten, damit das Modell genauer lernt', 'They enlarge the training data so that the model learns more precisely'), P('Mit den Testtieren wird gerade nicht gelernt. Sonst könnten sie die Güte bei neuen Fällen nicht mehr zeigen.', 'The test animals are precisely not used for learning. Otherwise they could no longer show the quality on new cases.')),
      a(P('Mit ihnen wird k so eingestellt, dass der Testfehler möglichst klein wird', 'They are used to set k so that the test error is as small as possible'), P('Wer nach dem Testfehler einstellt, passt das Modell an die Testtiere an. Die Einstellung gehört in die Kreuzvalidierung innerhalb der Trainingsdaten.', 'Whoever tunes by the test error fits the model to the test animals. Tuning belongs in the cross-validation within the training data.')),
      a(P('Mit ihnen wird geprüft, ob die Maße normalverteilt sind', 'They are used to check whether the measures are normally distributed'), P('kNN setzt keine Normalverteilung voraus. Die Testdaten prüfen die Vorhersagen, nicht die Verteilung.', 'kNN does not assume a normal distribution. The test data check the predictions, not the distribution.'))
    ],
    hilfe: ['ml-grundidee', 'trainingsdaten'], belege: [ISLR_22, RECHNUNG, 'Hilfe:ml-grundidee']
  },
  {
    id: 'ml-gi-leck', thema: 'ml',
    stamm: P('Jemand standardisiert Schnabeltiefe und Körpermasse mit Mittelwert und Standardabweichung aller 333 Tiere und teilt erst danach in Trainings- und Testdaten. Was ist daran das Problem? (überwachtes Lernen)', 'Someone standardises bill depth and body mass with the mean and standard deviation of all 333 animals and only then splits into training and test data. What is the problem with that? (supervised learning)'),
    antworten: [
      a(P('Die Kennzahlen enthalten Wissen über die Testtiere, darum kann der Testfehler zu gut wirken (Datenleck)', 'The statistics contain knowledge about the test animals, so the test error can look too good (data leakage)'), P('Alles, was gelernt wird, auch Mittelwert und Standardabweichung, kommt nur aus den Trainingsdaten. Sonst fließt etwas aus dem Test ins Lernen.', 'Everything that is learnt, including mean and standard deviation, comes only from the training data. Otherwise something from the test flows into the learning.'), true),
      a(P('Standardisieren ist bei k-nächsten Nachbarn überflüssig', 'Standardising is unnecessary with k-nearest neighbours'), P('Im Gegenteil: Ohne Standardisieren bestimmt die Körpermasse in Gramm fast allein die Abstände.', 'On the contrary: without standardising, body mass in grams almost alone determines the distances.')),
      a(P('Die Testdaten werden dadurch größer als geplant', 'The test data become larger than planned'), P('Die Zahl der Testtiere bleibt 100. Das Problem liegt in den Kennzahlen, nicht in der Zahl der Fälle.', 'The number of test animals stays 100. The problem lies in the statistics, not in the number of cases.')),
      a(P('Das ist der empfohlene Weg, weil mehr Tiere genauere Kennzahlen geben', 'That is the recommended way, because more animals give more precise statistics'), P('Genauer wären die Kennzahlen, aber die Testtiere wären dann nicht mehr unberührt.', 'The statistics would be more precise, but the test animals would then no longer be untouched.'))
    ],
    hilfe: ['ml-grundidee', 'standardisierung'], belege: [ISLR_51, 'Code:lib/ml.ts', 'Hilfe:ml-grundidee']
  },
  {
    id: 'ml-gi-klassifikation', thema: 'ml',
    stamm: P('Welche dieser Aufgaben ist eine Klassifikation? (überwachtes Lernen)', 'Which of these tasks is a classification? (supervised learning)'),
    antworten: [
      a(P('Aus Schnabeltiefe und Körpermasse vorhersagen, ob ein Pinguin weiblich oder männlich ist', 'Predicting from bill depth and body mass whether a penguin is female or male'), P('Das Ergebnis ist eine Kategorie und für die Lernfälle bekannt: überwachtes Lernen, genauer Klassifikation.', 'The outcome is a category and known for the learning cases: supervised learning, more precisely classification.'), true),
      a(P('Aus der Schnabeltiefe die Körpermasse in Gramm vorhersagen', 'Predicting body mass in grams from bill depth'), P('Das Ergebnis ist eine Zahl; das ist eine Regression, auch wenn es ebenfalls überwachtes Lernen ist.', 'The outcome is a number; that is a regression, even though it is also supervised learning.')),
      a(P('Pinguine ohne bekanntes Geschlecht nach Ähnlichkeit in Gruppen teilen', 'Dividing penguins without known sex into groups by similarity'), P('Ohne bekanntes Ergebnis ist das unüberwachtes Lernen, etwa eine Clusteranalyse.', 'Without a known outcome this is unsupervised learning, for example a cluster analysis.')),
      a(P('Den Mittelwert der Körpermasse je Insel berechnen', 'Calculating the mean body mass per island'), P('Das beschreibt die Daten; es wird nichts für neue Fälle vorhergesagt.', 'That describes the data; nothing is predicted for new cases.'))
    ],
    hilfe: ['ml-grundidee', 'maschinelles-lernen'], belege: [ISLR_22, 'Hilfe:ml-grundidee']
  },
  {
    id: 'ml-gi-mehrfach', thema: 'ml', mehrfach: true,
    stamm: P('Welche Aussagen über Trainings- und Testdaten stimmen? Mehrere können stimmen. (überwachtes Lernen)', 'Which statements about training and test data are true? Several can be true. (supervised learning)'),
    antworten: [
      a(P('Das Modell lernt nur mit den Trainingsdaten.', 'The model learns only from the training data.'), P('Stimmt. Die Testdaten werden erst am Ende zum Prüfen benutzt.', 'True. The test data are used only at the end for checking.'), true),
      a(P('Eine andere zufällige Aufteilung gibt etwas andere Fehlerzahlen.', 'A different random split gives somewhat different error figures.'), P('Stimmt. Mit 100 Testfällen schwankt der Fehler je nach Aufteilung um einige Prozentpunkte.', 'True. With 100 test cases the error varies by a few percentage points depending on the split.'), true),
      a(P('Trifft das Modell an den Testdaten gut, verursacht die Körpermasse das Geschlecht.', 'If the model does well on the test data, body mass causes sex.'), P('Stimmt nicht. Eine gute Vorhersage zeigt einen nutzbaren Zusammenhang, keine Ursache.', 'Not true. A good prediction shows a usable relationship, not a cause.')),
      a(P('Der Fehler an den Trainingsdaten schätzt die Güte bei neuen Fällen gut.', 'The error on the training data estimates the quality on new cases well.'), P('Stimmt nicht. An den eigenen Lerndaten sieht ein Modell zu gut aus; bei k = 1 liegt der Trainingsfehler fast bei 0.', 'Not true. A model looks too good on its own learning data; with k = 1 the training error is almost 0.'))
    ],
    hilfe: ['ml-grundidee', 'trainingsdaten'], belege: [ISLR_22, 'Hilfe:ml-grundidee']
  },
  // ======================================================== 2. k-nächste Nachbarn (ml-knn)
  {
    id: 'ml-kn-regel', thema: 'ml',
    stamm: P('Wie sagt k-nächste Nachbarn mit k = 5 das Geschlecht eines neuen Pinguins voraus? (k-nächste Nachbarn)', 'How does k-nearest neighbours with k = 5 predict the sex of a new penguin? (k-nearest neighbours)'),
    antworten: [
      a(P('Es sucht die 5 Trainingstiere mit dem kleinsten Abstand in den Maßen und nimmt das Geschlecht, das unter ihnen am häufigsten ist', 'It looks for the 5 training animals with the smallest distance in the measures and takes the sex that is most common among them'), P('Das ist die ganze Regel: Abstand, die k Nächsten, Mehrheit.', 'That is the whole rule: distance, the k nearest, majority.'), true),
      a(P('Es legt eine Regressionsgerade durch die 5 nächsten Tiere', 'It fits a regression line through the 5 nearest animals'), P('kNN rechnet keine Gerade; es zählt nur die Klassen der Nachbarn.', 'kNN calculates no line; it only counts the classes of the neighbours.')),
      a(P('Es nimmt die 5 zuletzt eingegebenen Tiere und deren häufigstes Geschlecht', 'It takes the 5 most recently entered animals and their most common sex'), P('Die Reihenfolge in der Datei spielt keine Rolle, nur der Abstand in den Maßen.', 'The order in the file plays no role, only the distance in the measures.')),
      a(P('Es teilt die Trainingsdaten in 5 Gruppen und nimmt die größte', 'It divides the training data into 5 groups and takes the largest'), P('Das verwechselt k mit der Zahl der Falten der Kreuzvalidierung. k ist die Zahl der Nachbarn.', 'That confuses k with the number of folds of the cross-validation. k is the number of neighbours.'))
    ],
    hilfe: ['ml-knn'], belege: [ISLR_22, 'Venables & Ripley 2002, Modern Applied Statistics with S (Paket class)', 'Hilfe:ml-knn']
  },
  {
    id: 'ml-kn-hand', thema: 'ml',
    stamm: P('Ein Testpinguin (19,3 mm Schnabeltiefe, 3450 g) hat diese nächsten Trainingsnachbarn, nach Abstand geordnet: männlich (0,081), weiblich (0,108), weiblich (0,149), männlich (0,152), männlich (0,161). Was sagt kNN mit k = 3 voraus? (k-nächste Nachbarn)', 'A test penguin (bill depth 19.3 mm, 3450 g) has these nearest training neighbours, ordered by distance: male (0.081), female (0.108), female (0.149), male (0.152), male (0.161). What does kNN with k = 3 predict? (k-nearest neighbours)'),
    antworten: [
      a(P('weiblich, zwei zu eins', 'female, two to one'), P('Die drei Nächsten sind männlich, weiblich, weiblich: zwei Stimmen für weiblich. Das stimmt hier sogar; der Pinguin ist weiblich.', 'The three nearest are male, female, female: two votes for female. Here that is even right; the penguin is female.'), true),
      a(P('männlich, weil der nächste Nachbar männlich ist', 'male, because the nearest neighbour is male'), P('Das wäre k = 1. Bei k = 3 zählen drei Stimmen.', 'That would be k = 1. With k = 3 three votes count.')),
      a(P('männlich, drei zu zwei', 'male, three to two'), P('Das wäre k = 5: Dann kommen zwei weitere männliche Nachbarn dazu.', 'That would be k = 5: then two more male neighbours are added.')),
      a(P('keine Vorhersage, weil die Stimmen gleich stehen', 'no prediction, because the votes are tied'), P('Bei drei Stimmen und zwei Klassen kann es keinen Gleichstand geben.', 'With three votes and two classes there cannot be a tie.'))
    ],
    hilfe: ['ml-knn'], belege: [ISLR_22, RECHNUNG, 'Hilfe:ml-knn']
  },
  {
    id: 'ml-kn-k-wechsel', thema: 'ml',
    stamm: P('Derselbe Pinguin wird mit k = 1 als männlich, mit k = 3 als weiblich und mit k = 5 wieder als männlich vorhergesagt. Was zeigt das? (k-nächste Nachbarn)', 'The same penguin is predicted as male with k = 1, as female with k = 3 and as male again with k = 5. What does that show? (k-nearest neighbours)'),
    antworten: [
      a(P('Die Vorhersage hängt von k ab, darum muss k begründet gewählt werden, etwa mit Kreuzvalidierung', 'The prediction depends on k, so k has to be chosen with a reason, for example with cross-validation'), P('k ist die wichtigste Einstellung. Man wählt sie in den Trainingsdaten mit Kreuzvalidierung, nicht nach Gefühl.', 'k is the most important setting. It is chosen in the training data with cross-validation, not by feel.'), true),
      a(P('Das Verfahren rechnet falsch, denn ein Fall darf nur eine Vorhersage haben', 'The method calculates wrongly, because a case may have only one prediction'), P('Für jedes k gibt es genau eine Vorhersage; verschiedene k sind verschiedene Modelle.', 'For each k there is exactly one prediction; different k are different models.')),
      a(P('Ungerade k sind unzuverlässig und sollten vermieden werden', 'Odd k are unreliable and should be avoided'), P('Bei zwei Klassen verhindern gerade die ungeraden k einen Gleichstand der Stimmen.', 'With two classes it is precisely odd k that prevent tied votes.')),
      a(P('Der Pinguin ist in den Daten falsch erfasst', 'The penguin is recorded wrongly in the data'), P('Dafür gibt es keinen Hinweis. Er liegt nur an einer Stelle, wo sich weibliche und männliche Tiere mischen.', 'There is no sign of that. It simply lies at a place where female and male animals mix.'))
    ],
    hilfe: ['ml-knn', 'ml-ueberanpassung'], belege: [ISLR_22, RECHNUNG, 'Hilfe:ml-knn']
  },
  {
    id: 'ml-kn-standard', thema: 'ml',
    stamm: P('Zwei Pinguine unterscheiden sich um 2 mm Schnabeltiefe (Standardabweichung 2,01 mm) und 100 g Körpermasse (Standardabweichung 786,4 g). Roh tragen die Maße 4 und 10000 zum quadrierten Abstand bei, standardisiert 0,99 und 0,016. Was folgt daraus für kNN? (k-nächste Nachbarn)', 'Two penguins differ by 2 mm in bill depth (standard deviation 2.01 mm) and 100 g in body mass (standard deviation 786.4 g). Raw, the measures contribute 4 and 10000 to the squared distance, standardised 0.99 and 0.016. What follows for kNN? (k-nearest neighbours)'),
    antworten: [
      a(P('Roh bestimmt fast nur die Masse die Nachbarn; standardisiert zählt der im Verhältnis große Unterschied der Schnabeltiefe', 'Raw, almost only mass determines the neighbours; standardised, the relatively large difference in bill depth counts'), P('Gramm sind große Zahlen. Geteilt durch die Standardabweichung wird jeder Unterschied an der üblichen Streuung seines Maßes gemessen.', 'Grams are large numbers. Divided by the standard deviation, every difference is measured against the usual spread of its measure.'), true),
      a(P('Standardisiert zählt die Masse mehr, weil 100 größer ist als 2', 'Standardised, mass counts more because 100 is larger than 2'), P('Standardisiert trägt die Masse 0,016 bei, die Schnabeltiefe 0,99: 100 g sind wenig im Vergleich zu 786,4 g Streuung.', 'Standardised, mass contributes 0.016 and bill depth 0.99: 100 g is little compared with a spread of 786.4 g.')),
      a(P('Standardisieren ändert die Abstände, aber die Nachbarn bleiben dieselben', 'Standardising changes the distances, but the neighbours stay the same'), P('Weil sich das Gewicht der Maße verschiebt, ändern sich die nächsten Nachbarn und damit die Vorhersagen.', 'Because the weight of the measures shifts, the nearest neighbours change and with them the predictions.')),
      a(P('Roh zählen beide Maße gleich, weil beide Unterschiede klein sind', 'Raw, both measures count equally because both differences are small'), P('Roh steht 4 gegen 10000: Die Masse überwiegt bei Weitem.', 'Raw it is 4 against 10000: mass outweighs by far.'))
    ],
    hilfe: ['ml-knn', 'standardisierung'], belege: [ISLR_22, RECHNUNG, 'Hilfe:ml-knn']
  },
  {
    id: 'ml-kn-roh-fehler', thema: 'ml',
    stamm: P('An den 100 Testtieren hat kNN mit k = 15 standardisiert 15 % Fehler, mit rohen Werten 32 %. Woran liegt der Unterschied? (k-nächste Nachbarn)', 'On the 100 test animals kNN with k = 15 has 15% error standardised and 32% with raw values. What is the reason for the difference? (k-nearest neighbours)'),
    antworten: [
      a(P('Roh hängt der Abstand fast nur an der Körpermasse in Gramm, und die Schnabeltiefe, die beim Geschlecht mithilft, geht fast verloren', 'Raw, the distance depends almost only on body mass in grams, and bill depth, which helps with sex, is almost lost'), P('Mit beiden Maßen gleich gewichtet trennt das Verfahren die Geschlechter viel besser.', 'With both measures weighted equally the method separates the sexes much better.'), true),
      a(P('Mit rohen Werten gibt es weniger Trainingstiere', 'With raw values there are fewer training animals'), P('Beide Rechnungen nutzen dieselben 233 Trainings- und 100 Testtiere.', 'Both calculations use the same 233 training and 100 test animals.')),
      a(P('Standardisieren entfernt Ausreißer aus den Daten', 'Standardising removes outliers from the data'), P('Standardisieren verschiebt und streckt nur; kein Tier fällt weg.', 'Standardising only shifts and stretches; no animal is dropped.')),
      a(P('Bei rohen Werten wählt Statable ein anderes k', 'With raw values Statable chooses a different k'), P('In beiden Fällen ist k = 15 vorgegeben. Der Unterschied kommt allein von den Abständen.', 'In both cases k = 15 is given. The difference comes from the distances alone.'))
    ],
    hilfe: ['ml-knn', 'standardisierung'], belege: [ISLR_22, RECHNUNG, 'Hilfe:ml-knn']
  },
  // ======================================================== 3. Überanpassung und Kreuzvalidierung (ml-ueberanpassung)
  {
    id: 'ml-ue-luecke', thema: 'ml',
    stamm: P('kNN mit k = 1: Trainingsfehler 0,4 % (1 von 233 Tieren falsch), Testfehler 18 %. Wie ist das zu lesen? (Überanpassung)', 'kNN with k = 1: training error 0.4% (1 of 233 animals wrong), test error 18%. How should this be read? (overfitting)'),
    antworten: [
      a(P('Das Modell hat die Trainingstiere auswendig gelernt; die Lücke zum Testfehler zeigt Überanpassung', 'The model has memorised the training animals; the gap to the test error shows overfitting'), P('Bei k = 1 ist jeder Trainingsfall sein eigener nächster Nachbar. Die 0,4 % sagen darum nichts über neue Fälle.', 'With k = 1 every training case is its own nearest neighbour. The 0.4% therefore says nothing about new cases.'), true),
      a(P('Das Modell ist fast perfekt, die Testdaten sind wohl fehlerhaft', 'The model is almost perfect, the test data are probably faulty'), P('Die Testdaten sind zufällig gezogene Tiere wie die anderen. Der kleine Trainingsfehler ist das Trugbild.', 'The test data are randomly drawn animals like the others. The small training error is the illusion.')),
      a(P('Man sollte den Trainingsfehler berichten, weil er auf mehr Tieren beruht', 'One should report the training error because it is based on more animals'), P('Mehr Tiere helfen nicht, wenn das Modell sie schon kennt. Zu berichten ist der Testfehler.', 'More animals do not help if the model already knows them. The test error is what to report.')),
      a(P('18 % zeigt Unteranpassung, k sollte noch kleiner werden', '18% shows underfitting, k should become even smaller'), P('Kleiner als 1 geht k nicht, und k = 1 ist der Fall stärkster Anpassung an die Trainingsdaten.', 'k cannot go below 1, and k = 1 is the case of the strongest fit to the training data.'))
    ],
    hilfe: ['ml-ueberanpassung', 'overfitting'], belege: [ISLR_22, RECHNUNG, 'Hilfe:ml-ueberanpassung']
  },
  {
    id: 'ml-ue-cv', thema: 'ml',
    stamm: P('Wie entsteht der Fehler der 5-fachen Kreuzvalidierung in den 233 Trainingstieren? (Überanpassung)', 'How is the error of the 5-fold cross-validation in the 233 training animals obtained? (overfitting)'),
    antworten: [
      a(P('Die 233 Tiere kommen in 5 Teile; fünfmal wird mit vier Teilen gelernt und der fünfte vorhergesagt, und alle Fehler werden zusammengezählt', 'The 233 animals go into 5 parts; five times the method learns from four parts and predicts the fifth, and all errors are added up'), P('So wird jedes Trainingstier genau einmal vorhergesagt, ohne selbst mitgelernt zu haben.', 'In this way every training animal is predicted exactly once without having been part of the learning.'), true),
      a(P('Das Modell wird fünfmal an den 100 Testtieren geprüft', 'The model is checked five times on the 100 test animals'), P('Die Kreuzvalidierung bleibt in den Trainingsdaten. Die Testtiere kommen erst ganz am Ende.', 'Cross-validation stays within the training data. The test animals come only at the very end.')),
      a(P('Die Trainingstiere werden fünfmal mit Zurücklegen neu gezogen', 'The training animals are redrawn five times with replacement'), P('Ziehen mit Zurücklegen ist der Bootstrap. Bei der Kreuzvalidierung kommt jedes Tier in genau einen Teil.', 'Drawing with replacement is the bootstrap. In cross-validation every animal goes into exactly one part.')),
      a(P('Jeder Teil wird mit sich selbst als Trainingsdaten vorhergesagt', 'Each part is predicted with itself as training data'), P('Dann wäre es wieder ein Trainingsfehler. Der vorhergesagte Teil darf beim Lernen gerade fehlen.', 'Then it would again be a training error. The predicted part must precisely be left out of the learning.'))
    ],
    hilfe: ['ml-ueberanpassung', 'kreuzvalidierung'], belege: [ISLR_51, 'Code:lib/ml.ts', 'Hilfe:ml-ueberanpassung']
  },
  {
    id: 'ml-ue-wahl', thema: 'ml',
    stamm: P('Die Kreuzvalidierung hat ihren kleinsten Fehler bei k = 17 (7,7 %). An den Testdaten wäre k = 37 mit 13 % am besten; bei k = 17 sind es 16 %. Welches k und welcher Fehler werden berichtet? (Überanpassung)', 'The cross-validation has its smallest error at k = 17 (7.7%). On the test data k = 37 with 13% would be best; at k = 17 it is 16%. Which k and which error are reported? (overfitting)'),
    antworten: [
      a(P('k = 17 mit 16 % Testfehler', 'k = 17 with 16% test error'), P('Die Wahl kommt aus der Kreuzvalidierung. Der Test wird danach einmal angesehen und bleibt so eine unabhängige Prüfung.', 'The choice comes from the cross-validation. The test is looked at once afterwards and so remains an independent check.'), true),
      a(P('k = 37 mit 13 % Testfehler', 'k = 37 with 13% test error'), P('Wer nach den Testdaten wählt, passt das Modell an genau diese 100 Tiere an. Die 13 % wären zu gut.', 'Whoever chooses by the test data fits the model to exactly these 100 animals. The 13% would be too good.')),
      a(P('k = 17 mit 7,7 % als Fehler bei neuen Fällen', 'k = 17 with 7.7% as the error on new cases'), P('7,7 % ist der kleinste von vielen Fehlern der Kreuzvalidierung und darum etwas zu günstig. Für neue Fälle steht der Testfehler.', '7.7% is the smallest of many cross-validation errors and therefore somewhat too favourable. The test error stands for new cases.')),
      a(P('k = 27 als Mittel aus 17 und 37', 'k = 27 as the average of 17 and 37'), P('Ein Mittel zweier Wahlen hat keine Begründung, und es mischt wieder die Testdaten in die Wahl.', 'An average of two choices has no justification, and it again mixes the test data into the choice.'))
    ],
    hilfe: ['ml-ueberanpassung', 'kreuzvalidierung'], belege: [ISLR_51, RECHNUNG, 'Hilfe:ml-ueberanpassung']
  },
  {
    id: 'ml-ue-unter', thema: 'ml',
    stamm: P('Was passiert mit kNN, wenn k sehr groß wird, etwa fast so groß wie die Zahl der Trainingstiere? (Überanpassung)', 'What happens with kNN when k becomes very large, almost as large as the number of training animals? (overfitting)'),
    antworten: [
      a(P('Die Vorhersage nähert sich der häufigsten Klasse im Training; die Grenze wird zu grob, und Trainings- und Testfehler steigen (Unteranpassung)', 'The prediction approaches the most common class in training; the boundary becomes too coarse, and training and test errors rise (underfitting)'), P('Fragt man fast alle Tiere, entscheidet die Mehrheit im ganzen Training, egal wo der neue Fall liegt.', 'If almost all animals are asked, the majority in the whole training set decides, wherever the new case lies.'), true),
      a(P('Der Trainingsfehler sinkt auf 0', 'The training error falls to 0'), P('Der Trainingsfehler ist bei k = 1 am kleinsten; mit wachsendem k steigt er.', 'The training error is smallest at k = 1; it rises as k grows.')),
      a(P('Das Modell wird stärker überangepasst', 'The model becomes more strongly overfitted'), P('Großes k glättet. Überanpassung gehört zum kleinen k.', 'A large k smooths. Overfitting belongs to a small k.')),
      a(P('Ab k = 15 bleiben die Vorhersagen gleich', 'From k = 15 on, the predictions stay the same'), P('Die Fehlerkurve verändert sich weiter mit k; es gibt keine solche Grenze.', 'The error curve keeps changing with k; there is no such limit.'))
    ],
    hilfe: ['ml-ueberanpassung', 'overfitting'], belege: [ISLR_22, 'Hilfe:ml-ueberanpassung']
  },
  {
    id: 'ml-ue-mehrfach', thema: 'ml', mehrfach: true,
    stamm: P('Welche Aussagen über Überanpassung und Kreuzvalidierung stimmen? Mehrere können stimmen. (Überanpassung)', 'Which statements about overfitting and cross-validation are true? Several can be true. (overfitting)'),
    antworten: [
      a(P('Die Kreuzvalidierung nutzt nur die Trainingsdaten.', 'Cross-validation uses only the training data.'), P('Stimmt. Die Testdaten bleiben bis zum Schluss unberührt.', 'True. The test data stay untouched until the end.'), true),
      a(P('Beim Standardisieren in der Kreuzvalidierung kommen die Kennzahlen jeweils aus den vier Lern-Teilen.', 'When standardising in the cross-validation, the statistics come each time from the four learning parts.'), P('Stimmt. Sonst wüsste jede Falte schon etwas über den Teil, den sie vorhersagt.', 'True. Otherwise each fold would already know something about the part it predicts.'), true),
      a(P('Ein Trainingsfehler von 0 % zeigt, dass das Modell neue Fälle gut vorhersagt.', 'A training error of 0% shows that the model predicts new cases well.'), P('Stimmt nicht. Bei k = 1 ist der Trainingsfehler fast 0, der Testfehler aber 18 %.', 'Not true. With k = 1 the training error is almost 0, but the test error is 18%.')),
      a(P('Wer k nach dem kleinsten Testfehler wählt, erhält einen unverzerrten Testfehler.', 'Whoever chooses k by the smallest test error obtains an unbiased test error.'), P('Stimmt nicht. Der so gewählte Testfehler ist zu günstig, weil das Modell an die Testdaten angepasst wurde.', 'Not true. A test error chosen this way is too favourable, because the model was fitted to the test data.'))
    ],
    hilfe: ['ml-ueberanpassung', 'kreuzvalidierung'], belege: [ISLR_51, 'Hilfe:ml-ueberanpassung']
  },
  // ======================================================== 4. Konfusionsmatrix (ml-konfusionsmatrix)
  {
    id: 'ml-km-treffer', thema: 'ml',
    stamm: P(`${MATRIX_DE} Wie hoch ist die Trefferquote? (Konfusionsmatrix)`, `${MATRIX_EN} What is the accuracy? (confusion matrix)`),
    antworten: [
      a(P('85 % (85 von 100)', '85% (85 of 100)'), P('Richtig sind 43 + 42 = 85 von 100 Tieren, alle Tiere zusammen.', 'Correct are 43 + 42 = 85 of 100 animals, all animals together.'), true),
      a(P('82,7 % (43 von 52)', '82.7% (43 of 52)'), P('Das ist der Anteil richtig erkannter weiblicher Tiere, nicht aller Tiere.', 'That is the share of correctly identified female animals, not of all animals.')),
      a(P('87,5 % (42 von 48)', '87.5% (42 of 48)'), P('Das ist der Anteil richtig erkannter männlicher Tiere (42 von 48).', 'That is the share of correctly identified male animals (42 of 48).')),
      a(P('15 % (15 von 100)', '15% (15 of 100)'), P('Das ist die Fehlerrate: 9 + 6 = 15 Tiere falsch vorhergesagt.', 'That is the error rate: 9 + 6 = 15 animals predicted wrongly.'))
    ],
    hilfe: ['ml-konfusionsmatrix', 'klassifikationstabelle'], belege: [ISLR_4, RECHNUNG, 'Hilfe:ml-konfusionsmatrix']
  },
  {
    id: 'ml-km-sens', thema: 'ml',
    stamm: P(`${MATRIX_DE} Welcher Anteil der weiblichen Tiere wird richtig erkannt? (Konfusionsmatrix)`, `${MATRIX_EN} What share of the female animals is correctly identified? (confusion matrix)`),
    antworten: [
      a(P('82,7 % (43 von 52)', '82.7% (43 of 52)'), P('Der Bezug ist die Zeile der wahren weiblichen Tiere. Gilt „weiblich“ als positiv, ist das die Sensitivität.', 'The reference is the row of the truly female animals. If "female" counts as positive, this is the sensitivity.'), true),
      a(P('85 % (85 von 100)', '85% (85 of 100)'), P('Das ist die Trefferquote über alle Tiere.', 'That is the accuracy across all animals.')),
      a(P('87,8 % (43 von 49)', '87.8% (43 of 49)'), P('49 sind alle als weiblich vorhergesagten Tiere (43 + 6). Gefragt ist der Bezug auf die wirklich weiblichen.', '49 are all animals predicted as female (43 + 6). The question refers to the truly female ones.')),
      a(P('87,5 % (42 von 48)', '87.5% (42 of 48)'), P('Das ist der Anteil richtig erkannter männlicher Tiere.', 'That is the share of correctly identified male animals.'))
    ],
    hilfe: ['ml-konfusionsmatrix', 'sensitivitaet'], belege: [ISLR_4, RECHNUNG, 'Hilfe:ml-konfusionsmatrix']
  },
  {
    id: 'ml-km-raten', thema: 'ml',
    stamm: P('Unter den 100 Testtieren sind 52 weiblich. Ein „Modell“ sagt für jedes Tier „weiblich“. Welche Trefferquote hat es, und was folgt für die 85 % von kNN? (Konfusionsmatrix)', 'Of the 100 test animals, 52 are female. A "model" says "female" for every animal. What accuracy does it have, and what follows for the 85% of kNN? (confusion matrix)'),
    antworten: [
      a(P('52 %; die 85 % sind deutlich besser als das Raten der häufigeren Klasse', '52%; the 85% is clearly better than guessing the more common class'), P('Ständiges „weiblich“ trifft genau die 52 weiblichen Tiere. Das ist der Vergleichswert für jede Trefferquote.', 'Always saying "female" hits exactly the 52 female animals. That is the benchmark for any accuracy.'), true),
      a(P('50 %, weil es zwei Klassen gibt', '50%, because there are two classes'), P('50 % gälte nur bei gleich großen Klassen. Hier sind es 52 zu 48.', '50% would hold only with classes of equal size. Here it is 52 to 48.')),
      a(P('0 %, weil es nichts gelernt hat', '0%, because it has learnt nothing'), P('Auch ohne Lernen trifft es alle weiblichen Tiere.', 'Even without learning it hits all female animals.')),
      a(P('100 % bei den weiblichen Tieren, also gleich gut wie kNN', '100% for the female animals, so as good as kNN'), P('Dafür erkennt es kein einziges männliches Tier. Die Trefferquote über alle ist 52 %.', 'In return it does not recognise a single male animal. The accuracy across all is 52%.'))
    ],
    hilfe: ['ml-konfusionsmatrix', 'klassifikationstabelle'], belege: [ISLR_4, RECHNUNG, 'Hilfe:ml-konfusionsmatrix']
  },
  {
    id: 'ml-km-selten', thema: 'ml',
    stamm: P('Eine seltene Krankheit kommt bei 5 von 100 Personen vor. Ein Modell meldet 95 % Trefferquote und erkennt keinen der 5 Kranken. Was wird hier falsch gelesen? (Konfusionsmatrix)', 'A rare disease occurs in 5 of 100 people. A model reports 95% accuracy and recognises none of the 5 sick people. What is being misread here? (confusion matrix)'),
    antworten: [
      a(P('Die Trefferquote täuscht bei seltenen Klassen; die Sensitivität für „krank“ ist 0 %', 'Accuracy misleads with rare classes; the sensitivity for "sick" is 0%'), P('Wer jedem „gesund“ sagt, trifft 95 von 100 und übersieht alle Kranken. Darum gehören die Anteile je Klasse dazu.', 'Whoever tells everyone "healthy" hits 95 of 100 and misses all sick people. That is why the shares per class belong with it.'), true),
      a(P('Hier ist nichts falsch gelesen, 95 % ist ein sehr gutes Ergebnis', 'Nothing is misread here, 95% is a very good result'), P('95 % erreicht man hier schon ohne jedes Modell. Das Modell leistet nichts.', 'Here 95% can be reached without any model at all. The model achieves nothing.')),
      a(P('Die Trefferquote müsste bei seltenen Klassen höher liegen', 'The accuracy should be higher with rare classes'), P('Die Höhe ist nicht das Problem, sondern dass sie die Kranken verdeckt.', 'The level is not the problem; the problem is that it hides the sick people.')),
      a(P('Die Spezifität ist 0 %', 'The specificity is 0%'), P('Die 95 Gesunden werden alle richtig erkannt: Spezifität 100 %. Bei 0 % liegt die Sensitivität.', 'The 95 healthy people are all correctly identified: specificity 100%. It is the sensitivity that is 0%.'))
    ],
    hilfe: ['ml-konfusionsmatrix', 'sensitivitaet', 'spezifitaet'], belege: [ISLR_4, 'Hilfe:klassifikationstabelle', 'Hilfe:ml-konfusionsmatrix']
  },
  {
    id: 'ml-km-mehrfach', thema: 'ml', mehrfach: true,
    stamm: P(`${MATRIX_DE} Welche Aussagen über diese Konfusionsmatrix stimmen? Mehrere können stimmen. (Konfusionsmatrix)`, `${MATRIX_EN} Which statements about this confusion matrix are true? Several can be true. (confusion matrix)`),
    antworten: [
      a(P('Auf der Diagonale stehen die richtig vorhergesagten Tiere.', 'The correctly predicted animals are on the diagonal.'), P('Stimmt: 43 weibliche und 42 männliche.', 'True: 43 female and 42 male.'), true),
      a(P('6 männliche Tiere wurden fälschlich als weiblich vorhergesagt.', '6 male animals were wrongly predicted as female.'), P('Stimmt. Das ist die Zelle „wahr männlich, vorhergesagt weiblich“.', 'True. That is the cell "true male, predicted female".'), true),
      a(P('In der Konfusionsmatrix von Statable zeigen die Zeilen die vorhergesagte Klasse.', 'In the confusion matrix of Statable the rows show the predicted class.'), P('Stimmt nicht. In Statable sind die Zeilen die wahre Klasse, die Spalten die Vorhersage.', 'Not true. In Statable the rows are the true class, the columns the prediction.')),
      a(P('Eine Konfusionsmatrix aus den Trainingsdaten schätzt die Güte bei neuen Fällen genauso gut.', 'A confusion matrix from the training data estimates the quality on new cases just as well.'), P('Stimmt nicht. An den Trainingsdaten sieht das Modell zu gut aus.', 'Not true. On the training data the model looks too good.'))
    ],
    hilfe: ['ml-konfusionsmatrix', 'klassifikationstabelle'], belege: [ISLR_4, 'Code:bausteine/LernlaborVorhersagen.svelte', 'Hilfe:ml-konfusionsmatrix']
  }
];

