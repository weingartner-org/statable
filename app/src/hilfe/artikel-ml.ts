/**
 * Hilfe-Artikel zum Lernpfad „Maschinelles Lernen verstehen (Machine Learning)“ (V5 Teil 2, 14.11.2026): vier Artikel, jeder ist zugleich die Erklärung seiner Einheit
 * (ml-grundidee, ml-knn, ml-ueberanpassung, ml-konfusionsmatrix; lernen/lernplan-ml.ts). Nur Deutsch und Englisch, jeder Text ein Textpaar P(de, en).
 * Alle Zahlen: echte Palmer-Pinguine (CC0), Geschlecht aus Schnabeltiefe und Körpermasse, 70 % Training, aus scripts/ueben-erwartet-ml.R
 * (lib/testdaten/ueben-erwartet-ml.json, zweiter Weg im Skript); Wächter lernen/fragen-ml.test.ts. Rechenregeln: docs/ausbau/FACHBLATT-V5-MASCHINELLES-LERNEN.md.
 * Quellen (Kapitel, keine Seiten): James, Witten, Hastie & Tibshirani (2021), An Introduction to Statistical Learning, 2. Aufl., Kap. 2.2, 4, 5.1;
 * Venables & Ripley (2002), Modern Applied Statistics with S, 4. Aufl. (Paket class). Eigene Worte, keine Aufgabe aus einem Buch.
 */
import { P } from '../i18n/laufzeit';
import { a, falsch, mitnehmen, type Roh } from './artikel-roh';

const QUELLEN = P('James, G., Witten, D., Hastie, T. & Tibshirani, R. (2021). An Introduction to Statistical Learning (2. Aufl.). Springer; frei als PDF. Kap. 2.2 (Klassifikation, k-nächste Nachbarn, Trainings- und Testfehler), Kap. 4 (Klassifikation, Konfusionsmatrix, ROC), Kap. 5.1 (Kreuzvalidierung). Venables, W. N. & Ripley, B. D. (2002). Modern Applied Statistics with S (4. Aufl.). Springer (R-Paket class, Funktion knn). Daten: Gorman, K. B., Williams, T. D. & Fraser, W. R. (2014). PLoS ONE, 9(3), e90081 (palmerpenguins, CC0).',
  'James, G., Witten, D., Hastie, T. & Tibshirani, R. (2021). An Introduction to Statistical Learning (2nd ed.). Springer; free as PDF. Ch. 2.2 (classification, k-nearest neighbours, training and test error), ch. 4 (classification, confusion matrix, ROC), ch. 5.1 (cross-validation). Venables, W. N. & Ripley, B. D. (2002). Modern Applied Statistics with S (4th ed.). Springer (R package class, function knn). Data: Gorman, K. B., Williams, T. D. & Fraser, W. R. (2014). PLoS ONE, 9(3), e90081 (palmerpenguins, CC0).');

const IN_STATABLE = { ol: [
  P('Verstehen > Lernlabor > Reiter „Vorhersagen (k-nächste Nachbarn)“ öffnen (Strg+K: „Vorhersagen“).', 'Open Understand > Learning lab > tab "Predicting (k-nearest neighbours)" (Ctrl+K: "predicting").'),
  P('„Beispiel: Geschlecht aus Schnabeltiefe und Körpermasse“ wählen. Mit dem Startwert 1 und 70 % Trainingsdaten teilt Statable die Tiere anders auf als R; die Zahlen dieses Artikels kommen aus R und weichen darum etwas ab. Das Bild bleibt dasselbe.', 'Choose "Example: sex from bill depth and body mass". With seed 1 and 70% training data Statable splits the animals differently from R; the numbers in this article come from R and therefore differ a little. The picture stays the same.'),
  P('Den Regler k bewegen, „Maße standardisieren“ an- und ausschalten und die Sätze, das Streudiagramm, die Konfusionsmatrix und die Fehlerkurve vergleichen.', 'Move the slider k, switch "standardise measures" on and off and compare the sentences, the scatter plot, the confusion matrix and the error curve.')
] };

export const ROH_ML: Roh[] = [
  // ---------------------------------------------------------------- 1. Grundidee: überwachtes Lernen, Trainings- und Testdaten
  a('ml-grundidee', 'verstehen', P('Wie lernt ein Programm aus Beispielen? (Überwachtes Lernen, Klassifikation, Trainings- und Testdaten)', 'How does a program learn from examples? (Supervised learning, classification, training and test data)'),
    P('maschinelles Lernen Machine Learning überwachtes Lernen supervised learning Klassifikation Klasse Vorhersage Trainingsdaten Testdaten Aufteilung train test split Datenleck data leakage Modell Merkmal Zielgröße KI', 'machine learning supervised learning classification class prediction training data test data split train test split data leakage model feature target AI'),
    [
      { h: P('Kurz', 'In brief') },
      P('Beim überwachten Lernen (supervised learning) sind für viele Fälle zwei Dinge bekannt: Merkmale, die man messen kann, und das Ergebnis, das man später vorhersagen will. Ein Verfahren lernt aus diesen Beispielen eine Regel. Ist das Ergebnis eine Kategorie, etwa weiblich oder männlich, heißt das Klassifikation; ist es eine Zahl, Regression. Ob die Regel taugt, zeigt sich nur an Fällen, die das Verfahren beim Lernen nicht gesehen hat. Darum teilt man die Daten in Trainingsdaten (zum Lernen) und Testdaten (nur zum Prüfen).', 'In supervised learning two things are known for many cases: features that can be measured, and the outcome that is to be predicted later. A method learns a rule from these examples. If the outcome is a category, such as female or male, this is called classification; if it is a number, regression. Whether the rule is any good shows only on cases the method did not see while learning. That is why the data are split into training data (for learning) and test data (only for checking).'),
      { h: P('Ein Beispiel mit echten Daten', 'An example with real data') },
      P('Von 333 Palmer-Pinguinen sind Schnabeltiefe, Körpermasse und Geschlecht bekannt. Aufgabe: das Geschlecht aus den beiden Maßen vorhersagen. Zufällig gezogen kommen 233 Tiere (70 %) in die Trainingsdaten und 100 in die Testdaten; unter den 100 sind 52 weiblich und 48 männlich. Das Verfahren sieht nur die 233. Danach sagt es für die 100 Testtiere das Geschlecht voraus, und erst dann wird verglichen.', 'For 333 Palmer penguins, bill depth, body mass and sex are known. Task: predict sex from the two measures. Drawn at random, 233 animals (70%) go into the training data and 100 into the test data; of the 100, 52 are female and 48 male. The method sees only the 233. Then it predicts sex for the 100 test animals, and only then is the comparison made.'),
      { h: P('Wann nehme ich es?', 'When do I use it?') },
      { ul: [
        P('Wenn neue Fälle eingeordnet werden sollen, deren Ergebnis noch unbekannt ist, und es genug Fälle mit bekanntem Ergebnis gibt.', 'When new cases are to be classified whose outcome is still unknown, and there are enough cases with a known outcome.'),
        P('Wenn die Frage „Wie gut lässt sich das vorhersagen?“ lautet, nicht „Welcher Einfluss ist bedeutsam?“. Für die zweite Frage passen Regression und Tests besser.', 'When the question is "How well can this be predicted?", not "Which influence is meaningful?". For the second question, regression and tests fit better.')
      ] },
      { h: P('Voraussetzungen', 'Requirements') },
      { ul: [
        P('Die Fälle mit bekanntem Ergebnis ähneln den späteren neuen Fällen. Ein Modell aus Pinguinen von drei Inseln sagt für Pinguine anderswo vielleicht wenig.', 'The cases with a known outcome resemble the later new cases. A model from penguins on three islands may say little about penguins elsewhere.'),
        P('Die Testdaten bleiben unberührt: Alles, was gelernt oder eingestellt wird, kommt nur aus den Trainingsdaten. Dazu gehören auch Mittelwert und Standardabweichung beim Standardisieren. Fließt Wissen über die Testdaten ins Lernen, heißt das Datenleck (data leakage); der Testfehler wirkt dann zu gut.', 'The test data stay untouched: everything that is learnt or tuned comes only from the training data. That includes the mean and standard deviation used for standardising. If knowledge about the test data flows into learning, this is called data leakage; the test error then looks too good.')
      ] },
      { h: P('So geht es in Statable', 'How it works in Statable') },
      IN_STATABLE,
      { h: P('Ergebnis lesen und berichten', 'Reading and reporting the result') },
      P('Zu berichten sind: wie aufgeteilt wurde (Anteil, zufällig, Startwert), welches Verfahren mit welchen Einstellungen, und der Fehler an den Testdaten. Ein Satz genügt:', 'What to report: how the data were split (share, at random, seed), which method with which settings, and the error on the test data. One sentence is enough:'),
      { apa: P('Das Geschlecht wurde mit k-nächsten Nachbarn (k = 17, Maße standardisiert) aus Schnabeltiefe und Körpermasse vorhergesagt; an 100 zufällig zurückgehaltenen Testtieren lag die Trefferquote bei 84 %.', 'Sex was predicted from bill depth and body mass with k-nearest neighbours (k = 17, measures standardised); on 100 randomly held-out test animals the accuracy was 84%.') },
      { h: P('Grenzen', 'Limits') },
      { ul: [
        P('Mit 100 Testfällen schwankt die Trefferquote je nach Aufteilung um einige Prozentpunkte. Eine andere Aufteilung gibt andere Zahlen.', 'With 100 test cases the accuracy varies by a few percentage points depending on the split. A different split gives different numbers.'),
        P('Eine gute Vorhersage sagt nichts über Ursachen: Die Körpermasse sagt das Geschlecht voraus, sie bestimmt es nicht.', 'A good prediction says nothing about causes: body mass predicts sex, it does not determine it.')
      ] },
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      falsch(P('Wie gut ein Modell ist, sieht man an den Daten, mit denen es gelernt hat.', 'How good a model is can be seen from the data it learnt from.'),
        P('An den eigenen Lerndaten sieht fast jedes Modell gut aus; es hat sie ja gesehen. Erst Testdaten zeigen, wie es bei neuen Fällen trifft.', 'Almost any model looks good on its own learning data; after all, it has seen them. Only test data show how it does on new cases.')),
      { h: P('Quellen', 'Sources') },
      QUELLEN,
      mitnehmen(
        P('Überwachtes Lernen: aus Fällen mit bekanntem Ergebnis eine Regel für neue Fälle lernen.', 'Supervised learning: learn a rule for new cases from cases with a known outcome.'),
        P('Trainingsdaten zum Lernen, Testdaten nur zum Prüfen, und nichts aus den Testdaten ins Lernen.', 'Training data for learning, test data only for checking, and nothing from the test data in the learning.')
      )
    ], ['ml-knn', 'ml-ueberanpassung', 'ml-konfusionsmatrix', 'lernlabor']),

  // ---------------------------------------------------------------- 2. k-nächste Nachbarn
  a('ml-knn', 'verstehen', P('Wie sagt man einen neuen Fall aus ähnlichen Fällen voraus? (k-nächste Nachbarn, Abstand, Standardisieren)', 'How do you predict a new case from similar cases? (k-nearest neighbours, distance, standardising)'),
    P('k-nächste Nachbarn kNN k nearest neighbours Nachbar Abstand euklidisch Mehrheit Stimmen Gleichstand standardisieren z-Werte Skala Einheit Klassifikation class knn', 'k-nearest neighbours kNN k nearest neighbors neighbour distance euclidean majority votes tie standardise z scores scale unit classification class knn'),
    [
      { h: P('Kurz', 'In brief') },
      P('k-nächste Nachbarn (k-nearest neighbours, kNN) ist eines der einfachsten Lernverfahren: Für einen neuen Fall sucht es die k Trainingsfälle, die ihm in den Merkmalen am ähnlichsten sind, und sagt die Klasse voraus, die unter diesen k am häufigsten vorkommt. Ähnlich heißt: kleiner Abstand, gemessen wie mit dem Lineal im Streudiagramm (euklidischer Abstand). Gelernt wird dabei nichts im Voraus; das Verfahren merkt sich nur die Trainingsfälle.', 'k-nearest neighbours (kNN) is one of the simplest learning methods: for a new case it looks for the k training cases that are most similar to it in the features, and predicts the class that is most common among these k. Similar means: small distance, measured as with a ruler in the scatter plot (Euclidean distance). Nothing is learnt in advance; the method only remembers the training cases.'),
      { h: P('Ein Beispiel von Hand', 'An example by hand') },
      P('Ein Pinguin aus den Testdaten hat eine Schnabeltiefe von 19,3 mm und wiegt 3450 g; er ist weiblich, aber das weiß das Verfahren nicht. Seine fünf nächsten Nachbarn in den Trainingsdaten (Abstand in standardisierten Einheiten):', 'A penguin from the test data has a bill depth of 19.3 mm and weighs 3450 g; it is female, but the method does not know that. Its five nearest neighbours in the training data (distance in standardised units):'),
      { tabelle: { kopf: [P('Nachbar', 'Neighbour'), P('Schnabeltiefe', 'Bill depth'), P('Körpermasse', 'Body mass'), P('Abstand', 'Distance'), P('Geschlecht', 'Sex')], zeilen: [
        ['1', P('19,2 mm', '19.2 mm'), '3500 g', P('0,081', '0.081'), P('männlich', 'male')],
        ['2', P('19,4 mm', '19.4 mm'), '3525 g', P('0,108', '0.108'), P('weiblich', 'female')],
        ['3', P('19,0 mm', '19.0 mm'), '3450 g', P('0,149', '0.149'), P('weiblich', 'female')],
        ['4', P('19,0 mm', '19.0 mm'), '3425 g', P('0,152', '0.152'), P('männlich', 'male')],
        ['5', P('19,1 mm', '19.1 mm'), '3550 g', P('0,161', '0.161'), P('männlich', 'male')]
      ] } },
      { ul: [
        P('k = 1: Nur der nächste Nachbar zählt, er ist männlich. Vorhersage männlich, falsch.', 'k = 1: only the nearest neighbour counts, and it is male. Prediction male, wrong.'),
        P('k = 3: männlich, weiblich, weiblich. Zwei zu eins für weiblich, richtig.', 'k = 3: male, female, female. Two to one for female, right.'),
        P('k = 5: dazu männlich und männlich. Drei zu zwei für männlich, wieder falsch.', 'k = 5: plus male and male. Three to two for male, wrong again.')
      ] },
      P('Derselbe Fall, drei Antworten: k ist die wichtigste Einstellung des Verfahrens. Wie man k wählt, ohne die Testdaten zu benutzen, zeigt die Einheit zur Überanpassung.', 'The same case, three answers: k is the most important setting of the method. How to choose k without using the test data is shown in the unit on overfitting.'),
      { h: P('Warum standardisieren?', 'Why standardise?') },
      P('Der Abstand zählt jede Einheit gleich. Die Körpermasse streut in den Trainingsdaten mit einer Standardabweichung von 786,4 g, die Schnabeltiefe mit 2,01 mm. Liegen zwei Tiere 2 mm und 100 g auseinander, trägt die Schnabeltiefe roh 4 und die Masse 10000 zum quadrierten Abstand bei: Die Schnabeltiefe spielt fast keine Rolle. Standardisiert (jede Größe durch ihre Standardabweichung geteilt) sind es 0,99 und 0,016; jetzt zählt der Unterschied in der Schnabeltiefe, weil er im Verhältnis zur üblichen Streuung groß ist. Ohne Standardisieren sind die drei nächsten Nachbarn des Pinguins oben alle genau 3450 g schwer; ihre Schnabeltiefe (19,0, 18,8 und 18,6 mm) zählt nur noch, wenn die Masse gleich ist. An den 100 Testtieren steigt der Fehler bei k = 15 so von 15 % auf 32 %.', 'Distance counts every unit equally. In the training data body mass has a standard deviation of 786.4 g, bill depth one of 2.01 mm. If two animals are 2 mm and 100 g apart, raw bill depth contributes 4 and mass 10000 to the squared distance: bill depth plays almost no role. Standardised (each variable divided by its standard deviation) the contributions are 0.99 and 0.016; now the difference in bill depth counts, because it is large relative to the usual spread. Without standardising, the three nearest neighbours of the penguin above all weigh exactly 3450 g; their bill depth (19.0, 18.8 and 18.6 mm) only counts when the mass is the same. On the 100 test animals the error at k = 15 thus rises from 15% to 32%.'),
      P('Mittelwert und Standardabweichung kommen dabei nur aus den Trainingsdaten (Mittel 17,15 mm und 4207,8 g); dieselben Zahlen werden auf die Testdaten angewandt.', 'The mean and standard deviation come only from the training data (means 17.15 mm and 4207.8 g); the same numbers are applied to the test data.'),
      { h: P('Wann nehme ich es?', 'When do I use it?') },
      { ul: [
        P('Zum Verstehen von Trainings- und Testfehler, Überanpassung und Kreuzvalidierung: Bei kNN sieht man alles in einem Bild.', 'To understand training and test error, overfitting and cross-validation: with kNN everything can be seen in one picture.'),
        P('Bei wenigen Merkmalen und Grenzen zwischen den Klassen, die keine Gerade sind.', 'With few features and boundaries between the classes that are not straight lines.')
      ] },
      { h: P('Voraussetzungen', 'Requirements') },
      { ul: [
        P('Zahlen als Merkmale, in vergleichbaren Einheiten oder standardisiert.', 'Numbers as features, in comparable units or standardised.'),
        P('Genug Trainingsfälle in jeder Klasse; bei vielen Merkmalen werden alle Fälle einander ähnlich weit, und kNN verliert an Schärfe.', 'Enough training cases in every class; with many features all cases become similarly far apart, and kNN loses sharpness.')
      ] },
      { h: P('So geht es in Statable', 'How it works in Statable') },
      IN_STATABLE,
      P('Mit eigenen Daten: Neue Auswertung → „Lässt sich etwas vorhersagen?“ → im Ergebnis „Wie gut sagt mein Modell neue Fälle voraus? (k-nächste Nachbarn, Kreuzvalidierung)“. Dort wählen Sie eine Gruppe als Ziel (2 bis 8 Gruppen) und Zahlen-Spalten als Merkmale. Statable teilt 70 % in Trainingsdaten, wählt k mit 5-facher Kreuzvalidierung im Training und zeigt Trefferquote, Konfusionsmatrix und die Fehlerkurve. „Als R-Skript mit Daten (.zip)“ rechnet dasselbe in R mit derselben Aufteilung nach.', 'With your own data: New analysis → "Can something be predicted?" → in the result "How well does my model predict new cases? (k-nearest neighbours, cross-validation)". There you choose a group as the target (2 to 8 groups) and number columns as features. Statable puts 70 % into the training data, chooses k with 5-fold cross-validation in the training data, and shows accuracy, confusion matrix and the error curve. "As R script with data (.zip)" recalculates the same in R with the same split.'),
      P('Gleichstand der Stimmen (bei zwei Klassen nur mit geradem k oder gleich weiten Nachbarn): Statable nimmt die Klasse des nächsten Nachbarn. R entscheidet in class::knn dann zufällig.', 'Tied votes (with two classes only with an even k or equally distant neighbours): Statable takes the class of the nearest neighbour. In class::knn, R then decides at random.'),
      { h: P('Grenzen', 'Limits') },
      { ul: [
        P('kNN liefert keine Koeffizienten und keine p-Werte; es sagt nicht, welches Merkmal wie stark wirkt.', 'kNN gives no coefficients and no p-values; it does not say which feature matters how much.'),
        P('Kategorien als Merkmale passen schlecht zu einem Abstand mit dem Lineal.', 'Categories as features fit badly with a ruler-type distance.')
      ] },
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      falsch(P('Standardisieren ändert nur die Achsenbeschriftung, nicht das Ergebnis.', 'Standardising only changes the axis labels, not the result.'),
        P('Für Verfahren mit Abständen ändert es die Nachbarn und damit die Vorhersagen. Im Beispiel verdoppelt sich der Testfehler fast, wenn man es weglässt.', 'For methods using distances it changes the neighbours and hence the predictions. In the example the test error almost doubles if it is left out.')),
      { h: P('Quellen', 'Sources') },
      QUELLEN,
      mitnehmen(
        P('kNN: Mehrheit der k ähnlichsten Trainingsfälle.', 'kNN: majority of the k most similar training cases.'),
        P('Merkmale standardisieren, mit Kennzahlen aus den Trainingsdaten.', 'Standardise features, using statistics from the training data.')
      )
    ], ['ml-grundidee', 'ml-ueberanpassung', 'lernlabor']),

  // ---------------------------------------------------------------- 3. Überanpassung, Kreuzvalidierung
  a('ml-ueberanpassung', 'verstehen', P('Lernt mein Modell nur auswendig? (Überanpassung, Trainings- und Testfehler, Kreuzvalidierung)', 'Is my model just memorising? (Overfitting, training and test error, cross-validation)'),
    P('Überanpassung Overfitting Unteranpassung Underfitting Trainingsfehler Testfehler Kreuzvalidierung cross-validation k-fach Falten folds k wählen Einstellung Hyperparameter Bias Varianz Validierung', 'overfitting underfitting training error test error cross-validation k-fold folds choosing k setting hyperparameter bias variance validation'),
    [
      { h: P('Kurz', 'In brief') },
      P('Ein Modell ist überangepasst (overfitting), wenn es Zufälligkeiten der Trainingsdaten mitlernt: An den Trainingsdaten trifft es sehr gut, an neuen Fällen deutlich schlechter. Man erkennt es an der Lücke zwischen Trainingsfehler und Testfehler. Die Einstellung des Modells, bei kNN die Zahl k, wählt man mit Kreuzvalidierung (cross-validation) innerhalb der Trainingsdaten. Die Testdaten bleiben bis zum Schluss unberührt.', 'A model is overfitted when it also learns chance features of the training data: on the training data it does very well, on new cases clearly worse. This shows as the gap between training error and test error. The setting of the model, for kNN the number k, is chosen with cross-validation within the training data. The test data stay untouched until the end.'),
      { h: P('Ein Beispiel mit echten Daten', 'An example with real data') },
      P('Geschlecht der Pinguine aus Schnabeltiefe und Körpermasse, 233 Tiere im Training, 100 im Test, Maße standardisiert:', 'Sex of the penguins from bill depth and body mass, 233 animals in training, 100 in test, measures standardised:'),
      { ul: [
        P('k = 1: Trainingsfehler 0,4 % (1 von 233 Tieren falsch), Testfehler 18 %. Jeder Trainingsfall ist sein eigener nächster Nachbar und wird darum fast immer richtig vorhergesagt. Das ist Auswendiglernen, keine Güte.', 'k = 1: training error 0.4% (1 of 233 animals wrong), test error 18%. Every training case is its own nearest neighbour and is therefore almost always predicted correctly. That is memorising, not quality.'),
        P('Mit größerem k wird die Grenze zwischen den Klassen glatter, der Trainingsfehler steigt, die Lücke zum Testfehler schrumpft. Bei sehr großem k wird die Grenze zu grob (Unteranpassung, underfitting), und auch der Testfehler steigt wieder.', 'With a larger k the boundary between the classes becomes smoother, the training error rises and the gap to the test error shrinks. With a very large k the boundary becomes too coarse (underfitting), and the test error rises again too.')
      ] },
      { h: P('k mit Kreuzvalidierung wählen', 'Choosing k with cross-validation') },
      P('Bei der 5-fachen Kreuzvalidierung werden die 233 Trainingstiere in 5 gleich große Teile (Falten, folds) geteilt. Fünfmal lernt das Verfahren mit vier Teilen und sagt den fünften voraus; jedes Tier wird so genau einmal vorhergesagt, ohne selbst mitgelernt zu haben. Das geschieht für jedes k. Im Beispiel ist der Fehler der Kreuzvalidierung bei k = 17 am kleinsten: 7,7 % (18 von 233 Tieren falsch). Erst danach schaut man einmal auf die Testdaten: Mit k = 17 liegt der Testfehler bei 16 %.', 'In 5-fold cross-validation the 233 training animals are divided into 5 equally sized parts (folds). Five times the method learns from four parts and predicts the fifth; in this way every animal is predicted exactly once without having been part of the learning. This is done for every k. In the example the cross-validation error is smallest at k = 17: 7.7% (18 of 233 animals wrong). Only then does one look at the test data once: with k = 17 the test error is 16%.'),
      P('Warum nicht gleich das k mit dem kleinsten Testfehler? Das wären hier k = 37 oder 43 mit 13 %. Wer so wählt, stellt das Modell nach den Testdaten ein; die 13 % sind dann zu gut, denn unter vielen k findet sich zufällig eines, das zu genau diesen 100 Tieren passt. Die Testdaten wären kein unabhängiger Prüfstein mehr.', 'Why not take the k with the smallest test error straight away? That would be k = 37 or 43 with 13%. Whoever chooses that way tunes the model to the test data; the 13% is then too good, because among many k there is by chance one that fits exactly these 100 animals. The test data would no longer be an independent check.'),
      { h: P('Wann nehme ich es?', 'When do I use it?') },
      { ul: [
        P('Immer, wenn ein Modell eine Einstellung hat (k, Tiefe eines Baums, Zahl der Größen) und gute Vorhersagen das Ziel sind.', 'Whenever a model has a setting (k, depth of a tree, number of variables) and good predictions are the goal.'),
        P('Bei wenigen Fällen, wo eine einzige Aufteilung zu wackelig wäre: Die Kreuzvalidierung nutzt jeden Fall einmal zum Prüfen.', 'With few cases, where a single split would be too shaky: cross-validation uses every case once for checking.')
      ] },
      { h: P('Voraussetzungen', 'Requirements') },
      P('Auch in jeder Falte gilt: Standardisieren und alles andere Lernen nur mit den übrigen Falten. Die Fälle sind voneinander unabhängig; bei Messwiederholungen derselben Person gehören alle Messungen in dieselbe Falte.', 'In every fold too: standardise and do all other learning only with the remaining folds. The cases are independent of one another; with repeated measurements of the same person, all measurements belong in the same fold.'),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      IN_STATABLE,
      P('Die Fehlerkurve zeigt drei Linien gegen k: Training, Test und Kreuzvalidierung. Der Knopf „k aus der Kreuzvalidierung nehmen“ stellt das beste k ein; bei Gleichstand das größere, also das glattere Modell.', 'The error curve shows three lines against k: training, test and cross-validation. The button "take k from the cross-validation" sets the best k; if tied, the larger one, that is the smoother model.'),
      { h: P('Ergebnis lesen und berichten', 'Reading and reporting the result') },
      { apa: P('k wurde mit 5-facher Kreuzvalidierung in den Trainingsdaten gewählt (k = 17, Fehler 7,7 %); an den Testdaten lag der Fehler bei 16 %.', 'k was chosen with 5-fold cross-validation in the training data (k = 17, error 7.7%); on the test data the error was 16%.') },
      { h: P('Grenzen', 'Limits') },
      P('Auch der Fehler der Kreuzvalidierung ist eine Schätzung mit Zufall; eine andere Falteneinteilung gibt etwas andere Zahlen. Dass er hier kleiner ist als der Testfehler, ist Zufall der Aufteilung, keine Regel.', 'The cross-validation error is also an estimate subject to chance; a different division into folds gives somewhat different numbers. That it is smaller than the test error here is chance of the split, not a rule.'),
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      falsch(P('0 % Fehler an den Trainingsdaten heißt: perfektes Modell.', '0% error on the training data means: perfect model.'),
        P('Bei kNN mit k = 1 ist das fast immer so und sagt nichts. Entscheidend ist der Fehler an Fällen, die das Modell nicht gesehen hat.', 'With kNN and k = 1 that is almost always the case and says nothing. What matters is the error on cases the model has not seen.')),
      falsch(P('Man darf k nach dem Testfehler wählen, solange man ehrlich berichtet.', 'You may choose k by the test error as long as you report honestly.'),
        P('Dann misst der Testfehler nicht mehr die Güte bei neuen Fällen. Die Wahl gehört in die Kreuzvalidierung, der Test kommt zuletzt und einmal.', 'Then the test error no longer measures quality on new cases. The choice belongs in the cross-validation; the test comes last and once.')),
      { h: P('Quellen', 'Sources') },
      QUELLEN,
      mitnehmen(
        P('Überanpassung: kleiner Trainingsfehler, großer Testfehler.', 'Overfitting: small training error, large test error.'),
        P('Einstellungen mit Kreuzvalidierung im Training wählen, den Test einmal am Ende.', 'Choose settings with cross-validation in training, the test once at the end.')
      )
    ], ['ml-grundidee', 'ml-knn', 'rp-ueberanpassung']),

  // ---------------------------------------------------------------- 4. Konfusionsmatrix
  a('ml-konfusionsmatrix', 'verstehen', P('Wie oft trifft ein Klassifikationsmodell? (Konfusionsmatrix, Trefferquote, Sensitivität, Spezifität)', 'How often does a classification model hit? (Confusion matrix, accuracy, sensitivity, specificity)'),
    P('Konfusionsmatrix confusion matrix Klassifikationstabelle Verwechslungsmatrix Trefferquote accuracy Fehlerrate Sensitivität recall Spezifität Grundrate Basisrate seltene Klasse ROC AUC richtig positiv falsch positiv', 'confusion matrix classification table accuracy error rate sensitivity recall specificity base rate rare class ROC AUC true positive false positive'),
    [
      { h: P('Kurz', 'In brief') },
      P('Die Konfusionsmatrix (confusion matrix) zählt für die Testdaten, wie oft welche wahre Klasse als welche Klasse vorhergesagt wurde: Zeilen sind die wahre Klasse, Spalten die Vorhersage. Auf der Diagonale stehen die Treffer. Aus ihr folgen die Trefferquote (accuracy, Anteil aller richtig), die Fehlerrate (1 minus Trefferquote) und je Klasse der Anteil richtig erkannt (Sensitivität, recall). Bei zwei Klassen heißt der Anteil richtig erkannter Fälle der zweiten Klasse auch Spezifität.', 'The confusion matrix counts for the test data how often each true class was predicted as each class: rows are the true class, columns the prediction. The hits are on the diagonal. From it follow the accuracy (share of all correct), the error rate (1 minus accuracy) and for each class the share correctly identified (sensitivity, recall). With two classes, the share of correctly identified cases of the second class is also called specificity.'),
      { h: P('Ein Beispiel mit echten Daten', 'An example with real data') },
      P('kNN mit k = 15 sagt das Geschlecht der 100 Testpinguine voraus:', 'kNN with k = 15 predicts the sex of the 100 test penguins:'),
      { tabelle: { kopf: [P('wahr \\ vorhergesagt', 'true \\ predicted'), P('weiblich', 'female'), P('männlich', 'male'), P('zusammen', 'total')], zeilen: [
        [P('weiblich', 'female'), '43', '9', '52'],
        [P('männlich', 'male'), '6', '42', '48']
      ] } },
      { ul: [
        P('Trefferquote: (43 + 42) / 100 = 85 %, Fehlerrate 15 %.', 'Accuracy: (43 + 42) / 100 = 85%, error rate 15%.'),
        P('Weibliche Tiere richtig erkannt: 43 / 52 = 82,7 % (Sensitivität, wenn „weiblich“ als positiv gilt).', 'Female animals correctly identified: 43 / 52 = 82.7% (sensitivity, if "female" counts as positive).'),
        P('Männliche Tiere richtig erkannt: 42 / 48 = 87,5 % (Spezifität bezogen auf „weiblich“).', 'Male animals correctly identified: 42 / 48 = 87.5% (specificity with respect to "female").')
      ] },
      { h: P('Vergleichen mit dem Raten', 'Comparing with guessing') },
      P('Eine Trefferquote braucht einen Vergleich. Wer ohne jedes Maß immer „weiblich“ sagt, trifft hier 52 %, weil 52 der 100 Testtiere weiblich sind. 85 % sind also deutlich besser als Raten. Wäre eine Klasse selten, etwa 5 von 100, träfe das ständige Nennen der häufigen Klasse schon zu 95 %, ohne einen einzigen seltenen Fall zu erkennen. Darum gehören die Anteile je Klasse immer dazu.', 'An accuracy needs a comparison. Whoever says "female" every time without any measure is right 52% of the time here, because 52 of the 100 test animals are female. So 85% is clearly better than guessing. If one class were rare, say 5 in 100, always naming the common class would already reach 95% without recognising a single rare case. That is why the shares per class always belong with it.'),
      { h: P('Wann nehme ich es?', 'When do I use it?') },
      P('Bei jeder Klassifikation, die an Testdaten geprüft wird: kNN, logistische Regression, Entscheidungsbaum, Diskriminanzanalyse. Sind die Kosten der beiden Fehlerarten verschieden (eine Krankheit übersehen gegen Fehlalarm), zählen die Anteile je Klasse mehr als die Trefferquote.', 'For every classification that is checked on test data: kNN, logistic regression, decision tree, discriminant analysis. If the costs of the two kinds of error differ (missing a disease versus a false alarm), the shares per class count more than the accuracy.'),
      { h: P('Voraussetzungen', 'Requirements') },
      P('Nur Testdaten oder Vorhersagen aus der Kreuzvalidierung zählen. Eine Konfusionsmatrix aus den Trainingsdaten sieht zu gut aus.', 'Only test data or predictions from cross-validation count. A confusion matrix from the training data looks too good.'),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      IN_STATABLE,
      P('Wer eine Wahrscheinlichkeit statt einer Klasse vorhersagt, etwa mit der logistischen Regression, kann die Schwelle verschieben. Die ROC-Kurve zeigt Sensitivität und Spezifität für alle Schwellen, die Fläche darunter (AUC) fasst sie in einer Zahl zusammen.', 'Whoever predicts a probability rather than a class, for example with logistic regression, can move the threshold. The ROC curve shows sensitivity and specificity for all thresholds; the area under it (AUC) sums them up in one number.'),
      { h: P('Ergebnis lesen und berichten', 'Reading and reporting the result') },
      { apa: P('An 100 Testtieren erkannte das Modell 82,7 % der weiblichen und 87,5 % der männlichen Pinguine richtig (Trefferquote 85 %; ständiges Raten der häufigeren Klasse: 52 %).', 'On 100 test animals the model correctly identified 82.7% of the female and 87.5% of the male penguins (accuracy 85%; always guessing the more common class: 52%).') },
      { h: P('Grenzen', 'Limits') },
      P('Bei 52 und 48 Fällen je Klasse bewegt ein einziges Tier die Anteile um etwa 2 Prozentpunkte. Kleine Unterschiede zwischen zwei Modellen sind darum oft Zufall.', 'With 52 and 48 cases per class a single animal moves the shares by about 2 percentage points. Small differences between two models are therefore often chance.'),
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      falsch(P('Eine hohe Trefferquote heißt, das Modell erkennt jede Klasse gut.', 'A high accuracy means the model recognises every class well.'),
        P('Bei ungleich großen Klassen kann die Trefferquote hoch sein, obwohl die seltene Klasse fast nie erkannt wird. Die Anteile je Klasse zeigen das.', 'With classes of unequal size the accuracy can be high although the rare class is almost never recognised. The shares per class show this.')),
      { h: P('Quellen', 'Sources') },
      QUELLEN,
      mitnehmen(
        P('Zeilen wahr, Spalten vorhergesagt, Diagonale richtig.', 'Rows true, columns predicted, diagonal correct.'),
        P('Trefferquote immer mit dem Raten und den Anteilen je Klasse vergleichen.', 'Always compare accuracy with guessing and with the shares per class.')
      )
    ], ['ml-grundidee', 'roc-kurve'])
];
