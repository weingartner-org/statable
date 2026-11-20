/**
 * Üben: Das lineare Modell als ein Werkzeug für vieles (Einheiten modell-und-fehler, freiheitsgrade, signal-und-rauschen, gruppenvergleich-ist-regression,
 * annahmen-landkarte, diagramme-ehrlich, daten-sauber-anlegen; Johannes 05.11.2026). Eigene Wortlaute und eigene erfundene Zahlenbeispiele, nichts aus einem Lehrbuch.
 * Kennungen `lmo-<kürzel>-…` (mf, fg, sr, gr, an, di, da). Jede Dezimalzahl im Text und die zwei Residuendiagramme stammen aus
 * app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet-lineares-modell.R, jede Rechnung mit zweitem Weg); ganze Zahlen im Text sind einfache Rechenbeispiele.
 * Belege: wissen.json (nur mc: true) und der jeweilige Hilfe-Artikel (`Hilfe:<id>`). Zu Diagrammart, Achsen, 3D (lmo-di-) und zur Datenanlage (lmo-da-)
 * gibt es in der Sammlung keine Quelle; diese Fragen stützen sich auf die Rechnung im Stamm und den Hilfe-Artikel.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { diag, zd, ze, zn } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const QUELLE_RESID = P('Beispielwerte (erfunden, keine echten Daten). 40 Personen, in R mit festem Startwert simuliert; Regression und Residuen berechnet mit R.', 'Example values (made up, not real data). 40 people, simulated in R with a fixed seed; regression and residuals computed with R.');

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {};

export const FRAGEN: Frage[] = [
  // ======================================================== 1. Ergebnis = Modell + Fehler
  {
    id: 'lmo-mf-ergebnis', thema: 'linmodell',
    stamm: P('Ein Modell sagt für alle Personen denselben Wert voraus: den Mittelwert. Was ist die Abweichung einer einzelnen Person von diesem Wert?', 'A model predicts the same value for all people: the mean. What is the deviation of a single person from this value?'),
    antworten: [
      a(P('Ihr Fehler im Modell: gemessener Wert = Modellwert + Fehler', 'Her error in the model: measured value = model value + error'), P('Das Modell erklärt, was es erklären kann, die Abweichung ist der Rest. Ergebnis = Modell + Fehler gilt für jedes Modell, auch für den Mittelwert.', 'The model explains what it can, the deviation is the remainder. Outcome = model + error holds for every model, including the mean.'), true),
      a(P('Der Standardfehler des Mittelwerts', 'The standard error of the mean'), P('Der Standardfehler beschreibt, wie stark der Mittelwert von Stichprobe zu Stichprobe schwankt. Die Abweichung einer Person betrifft dagegen nur diese eine Person.', 'The standard error describes how much the mean varies from sample to sample. The deviation of a person, by contrast, concerns only this one person.')),
      a(P('Die Standardabweichung der ganzen Stichprobe', 'The standard deviation of the whole sample'), P('Die Standardabweichung fasst alle Abweichungen zusammen (Wurzel aus der Varianz). Eine einzelne Abweichung ist nur ein Baustein davon.', 'The standard deviation sums up all deviations (square root of the variance). A single deviation is just one building block of it.')),
      a(P('Der Effekt, nach dem die Studie sucht', 'The effect the study is looking for'), P('Ein Effekt ist ein Unterschied zwischen Gruppen oder ein Zusammenhang. Die Abweichung vom Gesamtmittelwert ist zunächst nur Streuung.', 'An effect is a difference between groups or a relationship. The deviation from the overall mean is at first only spread.'))
    ],
    hilfe: ['lm-modell-fehler', 'residuum'], belege: ['wissen:reg-kleinste-quadrate', 'Hilfe:lm-modell-fehler']
  },
  {
    id: 'lmo-mf-summe0', thema: 'linmodell',
    stamm: P('Fünf Personen haben die Werte 3, 5, 6, 8 und 13. Der Mittelwert ist 7. Was ergibt die Summe der fünf Abweichungen vom Mittelwert, mit Vorzeichen addiert?', 'Five people have the values 3, 5, 6, 8 and 13. The mean is 7. What is the sum of the five deviations from the mean, added with their signs?'),
    antworten: [
      a(P('Null, weil sich positive und negative Abweichungen genau ausgleichen', 'Zero, because positive and negative deviations cancel exactly'), P('Die Abweichungen sind −4, −2, −1, +1 und +6: Die Minuswerte ergeben −7, die Pluswerte +7. Vom Mittelwert aus ist das bei jeder Datenreihe so.', 'The deviations are −4, −2, −1, +1 and +6: the minus values give −7, the plus values +7. Measured from the mean this holds for any data series.'), true),
      a(P('14, die Summe der Abweichungen ohne Vorzeichen', '14, the sum of the deviations without signs'), P('14 ist die Summe der Beträge (4 + 2 + 1 + 1 + 6). Gefragt ist die Summe mit Vorzeichen, bei der sich Plus und Minus aufheben.', '14 is the sum of the sizes (4 + 2 + 1 + 1 + 6). The sum with signs is asked for, in which plus and minus cancel.')),
      a(P('35, die Summe der Messwerte', '35, the sum of the measured values'), P('35 ist die Summe der Werte selbst (3 + 5 + 6 + 8 + 13). Von jedem Wert wurde aber noch der Mittelwert 7 abgezogen.', '35 is the sum of the values themselves (3 + 5 + 6 + 8 + 13). From each value the mean 7 was still subtracted.')),
      a(P('7, der Mittelwert selbst', '7, the mean itself'), P('7 ist der Modellwert. Die Abweichungen sind die Unterschiede zu ihm, ihre Summe ist eine andere Zahl.', '7 is the model value. The deviations are the differences from it, their sum is another number.'))
    ],
    hilfe: ['lm-modell-fehler', 'residuum'], belege: ['wissen:reg-residuen-eigenschaften', 'Hilfe:lm-modell-fehler']
  },
  {
    id: 'lmo-mf-quadrat', thema: 'linmodell',
    stamm: P('Warum werden die Abweichungen quadriert, bevor man sie zur Quadratsumme addiert?', 'Why are the deviations squared before they are added to the sum of squares?'),
    antworten: [
      a(P('Damit sich Plus und Minus nicht aufheben und große Abweichungen stärker zählen', 'So that plus and minus do not cancel and large deviations count more'), P('Ohne Quadrieren ergäbe die Summe vom Mittelwert aus null. Das Quadrat macht jede Abweichung positiv und gibt großen Abweichungen mehr Gewicht.', 'Without squaring, the sum measured from the mean would be zero. The square makes every deviation positive and gives large deviations more weight.'), true),
      a(P('Damit die Zahlen kleiner werden und sich leichter vergleichen lassen', 'So that the numbers get smaller and are easier to compare'), P('Quadrieren macht Zahlen über 1 größer, nicht kleiner. Der Grund ist ein anderer: sonst würde sich die Summe zu null ausgleichen.', 'Squaring makes numbers above 1 larger, not smaller. The reason is another one: otherwise the sum would cancel to zero.')),
      a(P('Damit die Summe der Abweichungen null wird', 'So that the sum of the deviations becomes zero'), P('Die Summe der Abweichungen vom Mittelwert ist schon ohne Quadrieren null. Gerade deshalb taugt sie nicht als Maß, und es wird quadriert.', 'The sum of the deviations from the mean is already zero without squaring. That is exactly why it is useless as a measure and squares are taken.')),
      a(P('Damit die Quadratsumme dem Mittelwert gleicht', 'So that the sum of squares equals the mean'), P('Quadratsumme und Mittelwert sind verschiedene Größen: Die eine misst Streuung, der andere das Niveau der Werte.', 'Sum of squares and mean are different quantities: one measures spread, the other the level of the values.'))
    ],
    hilfe: ['lm-modell-fehler', 'summe-der-quadrate'], belege: ['wissen:reg-residuen-eigenschaften', 'wissen:reg-kleinste-quadrate', 'Hilfe:lm-modell-fehler']
  },
  {
    id: 'lmo-mf-bester-wert', thema: 'linmodell',
    stamm: P('Fünf Werte haben um ihren Mittelwert eine Quadratsumme von 46. Was geschieht mit der Quadratsumme, wenn ein anderer Wert als Modell genommen wird?', 'Five values have a sum of squares of 46 around their mean. What happens to the sum of squares when another value is taken as the model?'),
    antworten: [
      a(P('Sie wird größer, denn der Mittelwert macht die Quadratsumme am kleinsten', 'It gets larger, because the mean makes the sum of squares smallest'), P('Die Methode der kleinsten Quadrate wählt genau den Wert mit der kleinsten Quadratsumme. Beim Mittelwert ist das der Mittelwert.', 'The method of least squares picks exactly the value with the smallest sum of squares. For a single constant that is the mean.'), true),
      a(P('Sie bleibt gleich, solange der Wert nahe am Mittelwert liegt', 'It stays the same as long as the value is close to the mean'), P('Schon eine kleine Verschiebung vergrößert sie: Die Quadratsumme wächst um n mal das Quadrat der Verschiebung, hier 5 mal.', 'Even a small shift enlarges it: the sum of squares grows by n times the square of the shift, here 5 times.')),
      a(P('Sie wird kleiner, wenn statt des Mittelwerts der Median genommen wird', 'It gets smaller when the median is taken instead of the mean'), P('Bei den Werten 4, 10, 2, 9 und 5 ist der Median 5 und die Quadratsumme dann 51, mehr als 46. Der Median minimiert die Summe der Beträge, nicht die der Quadrate.', 'For the values 4, 10, 2, 9 and 5 the median is 5 and the sum of squares then 51, more than 46. The median minimises the sum of the sizes, not of the squares.')),
      a(P('Sie wird kleiner, wenn der Modellwert größer gewählt wird', 'It gets smaller when the model value is chosen larger'), P('Die Richtung allein entscheidet nichts: Unterhalb des Mittelwerts wird die Quadratsumme mit wachsendem Modellwert kleiner, oberhalb größer.', 'The direction alone decides nothing: below the mean the sum of squares gets smaller as the model value grows, above it larger.'))
    ],
    hilfe: ['lm-modell-fehler', 'summe-der-quadrate'], belege: ['wissen:reg-kleinste-quadrate', 'Hilfe:lm-modell-fehler']
  },
  {
    id: 'lmo-mf-r2', thema: 'linmodell',
    stamm: P('Ein Modell nur mit dem Mittelwert hat eine Quadratsumme der Fehler von 80. Ein Modell, das zusätzlich die Gruppe nutzt, hat 60. Was lässt sich daraus ablesen?', 'A model with only the mean has a sum of squares of the errors of 80. A model that also uses the group has 60. What can be read from this?'),
    antworten: [
      a(P(`Das zweite Modell erklärt ein Viertel der Streuung (R² = ${zd('lmo_r2')})`, `The second model explains a quarter of the spread (R² = ${ze('lmo_r2')})`), P(`Die Quadratsumme sinkt um 20 von 80: 20 : 80 = ${zd('lmo_r2')}. Dieser Anteil ist das R².`, `The sum of squares falls by 20 of 80: 20 : 80 = ${ze('lmo_r2')}. This share is R².`), true),
      a(P('Das zweite Modell erklärt 75 Prozent der Streuung', 'The second model explains 75 percent of the spread'), P('75 Prozent wären 60 von 80. Das ist die Quadratsumme, die übrig bleibt, nicht die erklärte.', '75 percent would be 60 of 80. That is the sum of squares that is left, not the one explained.')),
      a(P('Der Gruppenunterschied ist damit signifikant', 'The group difference is therefore significant'), P('Ob ein Unterschied signifikant ist, zeigt erst ein Test mit Freiheitsgraden und p-Wert. Die Quadratsumme sinkt auch durch Zufall ein wenig.', 'Whether a difference is significant is shown only by a test with degrees of freedom and p value. The sum of squares falls a little even by chance.')),
      a(P('Das zweite Modell ist falsch, weil die Quadratsumme nicht null ist', 'The second model is wrong because the sum of squares is not zero'), P('Eine Quadratsumme von null gäbe es nur, wenn das Modell jeden Wert genau träfe. Im wirklichen Leben bleibt immer ein Rest.', 'A sum of squares of zero would exist only if the model hit every value exactly. In real life a remainder always stays.'))
    ],
    hilfe: ['lm-modell-fehler', 'r-quadrat'], belege: ['wissen:reg-modellvergleich', 'wissen:anova-zerlegung', 'Hilfe:lm-modell-fehler']
  },
  {
    id: 'lmo-mf-mehrfach', thema: 'linmodell', mehrfach: true,
    stamm: P('Ein Modell sagt jeden Wert durch den Gesamtmittelwert voraus, ein zweites durch den Mittelwert der Gruppe der Person. Welche Aussagen stimmen? Mehrere können stimmen.', 'One model predicts every value by the overall mean, a second one by the mean of the person\'s group. Which statements are true? Several can be true.'),
    antworten: [
      a(P('Die Quadratsumme der Fehler des zweiten Modells ist höchstens so groß wie die des ersten', 'The sum of squares of the errors of the second model is at most as large as that of the first'), P('Das erste Modell steckt im zweiten: Sind alle Gruppenmittelwerte gleich, sind beide Modelle gleich. Sonst ist das zweite besser.', 'The first model sits inside the second: if all group means are equal, both models are equal. Otherwise the second is better.'), true),
      a(P('Der Unterschied der beiden Quadratsummen ist der Teil der Streuung, den die Gruppen erklären', 'The difference of the two sums of squares is the part of the spread the groups explain'), P('Gesamtquadratsumme = Quadratsumme zwischen den Gruppen + Quadratsumme innerhalb der Gruppen. Die erste ist der erklärte Teil.', 'Total sum of squares = sum of squares between the groups + sum of squares within the groups. The first is the explained part.'), true),
      a(P('Weil die Quadratsumme sinkt, ist ein Gruppenunterschied in der Grundgesamtheit belegt', 'Because the sum of squares falls, a group difference in the population is shown'), P('Sie sinkt schon durch zufällige Unterschiede der Gruppenmittel ein wenig. Belegt wird ein Unterschied erst durch einen Test.', 'It falls a little already through chance differences of the group means. A difference is shown only by a test.')),
      a(P('Das erste Modell passt besser, weil es einfacher ist', 'The first model fits better because it is simpler'), P('Einfacher heißt nicht besser passend. Es hat hier die größere Quadratsumme der Fehler.', 'Simpler does not mean fitting better. Here it has the larger sum of squares of the errors.'))
    ],
    hilfe: ['lm-modell-fehler', 'quadratsumme-zwischen'], belege: ['wissen:anova-zerlegung', 'wissen:reg-modellvergleich', 'Hilfe:lm-modell-fehler']
  },
  {
    id: 'lmo-mf-vorzeichen', thema: 'linmodell',
    stamm: P('Ein Modell sagt für eine Person 7 Punkte voraus, gemessen wurden 10. Wie lautet die Abweichung (das Residuum) dieser Person?', 'A model predicts 7 points for a person, 10 were measured. What is the deviation (the residual) of this person?'),
    antworten: [
      a(P('+3: gemessen minus vorhergesagt, das Modell sagt 3 Punkte zu wenig voraus', '+3: measured minus predicted, the model predicts 3 points too little'), P('Die Abweichung ist gemessen minus Modell: 10 − 7 = +3. Das Plus zeigt, dass die Person über dem Modell liegt.', 'The deviation is measured minus model: 10 − 7 = +3. The plus shows that the person lies above the model.'), true),
      a(P('−3, weil das Modell kleiner ist als der Messwert', '−3, because the model is smaller than the measured value'), P('Das Vorzeichen folgt der Rechnung gemessen minus Modell. Minus hieße, die Person liegt unter dem Modell, hier ist es umgekehrt.', 'The sign follows the calculation measured minus model. Minus would mean the person lies below the model, here it is the other way round.')),
      a(P('10, der gemessene Wert', '10, the measured value'), P('10 ist der gemessene Wert selbst. Die Abweichung ist sein Unterschied zum Modellwert 7.', '10 is the measured value itself. The deviation is its difference from the model value 7.')),
      a(P('7, der Modellwert', '7, the model value'), P('7 ist die Vorhersage. Die Abweichung ist der Unterschied zwischen Messwert und Vorhersage.', '7 is the prediction. The deviation is the difference between measured value and prediction.'))
    ],
    hilfe: ['lm-modell-fehler', 'residuum'], belege: ['wissen:reg-kleinste-quadrate', 'Hilfe:lm-modell-fehler']
  },

  // ======================================================== 2. Freiheitsgrade
  {
    id: 'lmo-fg-frei', thema: 'linmodell',
    stamm: P('Vier Werte haben einen bekannten Mittelwert. Wie viele davon können noch frei gewählt werden?', 'Four values have a known mean. How many of them can still be chosen freely?'),
    antworten: [
      a(P('Drei: der vierte steht durch den Mittelwert fest', 'Three: the fourth is fixed by the mean'), P('Der Mittelwert legt die Summe fest. Sind drei Werte gewählt, ergibt sich der vierte als Rest. Die Freiheitsgrade sind n − 1 = 3.', 'The mean fixes the sum. Once three values are chosen, the fourth follows as the remainder. The degrees of freedom are n − 1 = 3.'), true),
      a(P('Vier: alle Werte sind frei', 'Four: all values are free'), P('Dann wäre der Mittelwert nicht festgelegt. Weil er bekannt ist, bleibt für den letzten Wert keine Wahl.', 'Then the mean would not be fixed. Because it is known, no choice is left for the last value.')),
      a(P('Zwei: einer pro Hälfte der Daten', 'Two: one per half of the data'), P('Die Daten zerfallen nicht in Hälften. Es gibt eine einzige Einschränkung, den Mittelwert, und sie kostet genau einen Wert.', 'The data do not split into halves. There is a single restriction, the mean, and it costs exactly one value.')),
      a(P('Einer: der Mittelwert selbst', 'One: the mean itself'), P('Der Mittelwert ist bekannt und keine freie Wahl mehr. Frei sind die Werte, und von ihnen alle bis auf einen.', 'The mean is known and no longer a free choice. What is free are the values, and all of them but one.'))
    ],
    hilfe: ['lm-freiheitsgrade', 'freiheitsgrade'], belege: ['wissen:t-test-freiheitsgrade', 'Hilfe:lm-freiheitsgrade']
  },
  {
    id: 'lmo-fg-letzter', thema: 'linmodell',
    stamm: P('Vier Werte haben den Mittelwert 10. Drei davon sind 8, 12 und 9. Wie groß ist der vierte?', 'Four values have the mean 10. Three of them are 8, 12 and 9. How large is the fourth?'),
    antworten: [
      a(P('11: Die Summe muss 40 sein, die drei bekannten ergeben 29', '11: the sum must be 40, the three known ones add up to 29'), P('4 · 10 = 40, und 8 + 12 + 9 = 29. Der vierte Wert ist, was an 40 fehlt: 11. Er war nicht frei.', '4 · 10 = 40, and 8 + 12 + 9 = 29. The fourth value is what is missing from 40: 11. It was not free.'), true),
      a(P('10, der Mittelwert', '10, the mean'), P('Der Mittelwert ist 10, aber nur im Schnitt aller vier Werte. Der vierte Wert muss die Summe auf 40 ergänzen.', 'The mean is 10, but only on average over all four values. The fourth value must complete the sum to 40.')),
      a(P('29, die Summe der drei bekannten Werte', '29, the sum of the three known values'), P('29 ist die Summe der drei bekannten Werte. Gesucht ist, was zur Gesamtsumme 40 noch fehlt.', '29 is the sum of the three known values. What is asked for is what is still missing from the total 40.')),
      a(P('40, die Summe aller vier Werte', '40, the sum of all four values'), P('40 ist die Gesamtsumme. Der vierte Wert ist nur der Teil davon, der nach den drei bekannten übrig bleibt.', '40 is the total. The fourth value is only the part of it that is left after the three known ones.'))
    ],
    hilfe: ['lm-freiheitsgrade', 'freiheitsgrade'], belege: ['Hilfe:lm-freiheitsgrade', 'wissen:t-test-freiheitsgrade']
  },
  {
    id: 'lmo-fg-nenner', thema: 'linmodell',
    stamm: P('Warum teilt man die Quadratsumme einer Stichprobe durch n − 1 statt durch n, um die Varianz zu schätzen?', 'Why is the sum of squares of a sample divided by n − 1 instead of n to estimate the variance?'),
    antworten: [
      a(P('Der Mittelwert stammt aus denselben Daten und liegt ihnen näher als der wahre Wert; mit n würde die Varianz im Mittel unterschätzt', 'The mean comes from the same data and lies closer to them than the true value; with n the variance would be underestimated on average'), P('Die Abweichungen vom eigenen Mittelwert sind im Schnitt zu klein. Das Teilen durch n − 1 gleicht das genau aus, die Stichprobenvarianz ist dann erwartungstreu.', 'The deviations from the sample\'s own mean are too small on average. Dividing by n − 1 corrects exactly for this; the sample variance is then unbiased.'), true),
      a(P('Damit die Varianz größer wird und der Test strenger ausfällt', 'So that the variance gets larger and the test turns out stricter'), P('Die Größe ist kein Ziel. Das Teilen durch n − 1 ist keine Strenge, sondern die Korrektur eines systematischen Fehlers.', 'Size is no aim. Dividing by n − 1 is not strictness but the correction of a systematic error.')),
      a(P('Weil beim Berechnen der Quadratsumme ein Wert verloren geht', 'Because one value gets lost when the sum of squares is calculated'), P('Es geht kein Messwert verloren: Alle n Werte gehen in die Quadratsumme ein. Es wird eine Größe aus den Daten geschätzt, der Mittelwert.', 'No measured value gets lost: all n values enter the sum of squares. One quantity is estimated from the data, the mean.')),
      a(P('Weil die Stichprobe kleiner ist als die Grundgesamtheit', 'Because the sample is smaller than the population'), P('Die Größe der Grundgesamtheit spielt hier keine Rolle. Auch bei unendlich großer Grundgesamtheit wird durch n − 1 geteilt.', 'The size of the population plays no role here. Even with an infinitely large population one divides by n − 1.'))
    ],
    hilfe: ['lm-freiheitsgrade', 'bessel-korrektur'], belege: ['wissen:varianz-erwartungstreu-sd-nicht', 'wissen:varianz-schaetzer-nenner-programme', 'Hilfe:lm-freiheitsgrade']
  },
  {
    id: 'lmo-fg-zwei-gruppen', thema: 'linmodell',
    stamm: P('Ein t-Test für zwei unabhängige Gruppen mit je 10 Personen nimmt gleiche Varianzen an (gepoolter t-Test). Wie viele Freiheitsgrade hat er?', 'A t test for two independent groups of 10 people each assumes equal variances (pooled t test). How many degrees of freedom does it have?'),
    antworten: [
      a(P('18 Freiheitsgrade', '18 degrees of freedom'), P('Von 20 Werten gehen zwei Freiheitsgrade ab: je Gruppe einer für den geschätzten Mittelwert. n₁ + n₂ − 2 = 18.', 'Of 20 values two degrees of freedom are lost: one per group for the estimated mean. n₁ + n₂ − 2 = 18.'), true),
      a(P('19 Freiheitsgrade', '19 degrees of freedom'), P('19 wäre n − 1 mit allen 20 Personen in einer Gruppe. Hier werden aber zwei Mittelwerte geschätzt.', '19 would be n − 1 with all 20 people in one group. Here, however, two means are estimated.')),
      a(P('20 Freiheitsgrade', '20 degrees of freedom'), P('20 ist die Zahl der Personen, ohne dass etwas abgezogen wird. Die geschätzten Mittelwerte kosten Freiheitsgrade.', '20 is the number of people with nothing subtracted. The estimated means cost degrees of freedom.')),
      a(P('9 Freiheitsgrade', '9 degrees of freedom'), P('9 gälte für eine einzelne Gruppe (n − 1). Der Test schätzt aber zwei Mittelwerte und rechnet mit allen 20 Werten.', '9 would hold for a single group (n − 1). The test, however, estimates two means and works with all 20 values.'))
    ],
    hilfe: ['lm-freiheitsgrade', 'gepoolter-t-test'], belege: ['wissen:t-test-freiheitsgrade', 'Hilfe:lm-freiheitsgrade']
  },
  {
    id: 'lmo-fg-gepaart', thema: 'linmodell',
    stamm: P('20 Personen werden vor und nach einem Training gemessen und mit dem t-Test für abhängige Stichproben verglichen. Wie viele Freiheitsgrade hat er?', '20 people are measured before and after a training and compared with the t test for dependent samples. How many degrees of freedom does it have?'),
    antworten: [
      a(P('19 Freiheitsgrade', '19 degrees of freedom'), P('Der Test rechnet mit den 20 Unterschieden je Person und schätzt einen Mittelwert. n − 1 = 19, wobei n die Zahl der Paare ist.', 'The test works with the 20 differences per person and estimates one mean. n − 1 = 19, where n is the number of pairs.'), true),
      a(P('38 Freiheitsgrade', '38 degrees of freedom'), P('38 wäre 20 + 20 − 2 für zwei unabhängige Gruppen. Hier sind es dieselben Personen, die Messungen gehören paarweise zusammen.', '38 would be 20 + 20 − 2 for two independent groups. Here the same people are measured, the measurements belong together in pairs.')),
      a(P('20 Freiheitsgrade', '20 degrees of freedom'), P('20 ist die Zahl der Paare, ohne den geschätzten Mittelwert der Unterschiede abzuziehen.', '20 is the number of pairs without subtracting the estimated mean of the differences.')),
      a(P('18 Freiheitsgrade', '18 degrees of freedom'), P('18 wäre n − 2. Es wird aber nur eine Größe geschätzt, der mittlere Unterschied.', '18 would be n − 2. Only one quantity is estimated, though, the mean difference.'))
    ],
    hilfe: ['lm-freiheitsgrade', 'gepaarter-t-test'], belege: ['wissen:t-test-freiheitsgrade', 'Hilfe:lm-freiheitsgrade']
  },
  {
    id: 'lmo-fg-mehrfach', thema: 'linmodell', mehrfach: true,
    stamm: P('Welche Aussagen zu Freiheitsgraden stimmen? Mehrere können stimmen.', 'Which statements about degrees of freedom are true? Several can be true.'),
    antworten: [
      a(P('Jede Größe, die aus den Daten geschätzt wird, kostet einen Freiheitsgrad', 'Every quantity estimated from the data costs one degree of freedom'), P('Freiheitsgrade sind die Zahl der Werte minus die Zahl der geschätzten Größen. Zwei Gruppenmittelwerte kosten zwei: n₁ + n₂ − 2.', 'Degrees of freedom are the number of values minus the number of estimated quantities. Two group means cost two: n₁ + n₂ − 2.'), true),
      a(P('Mit wenigen Freiheitsgraden weicht die t-Verteilung stärker von der Normalverteilung ab als mit vielen', 'With few degrees of freedom the t distribution deviates more from the normal distribution than with many'), P('Die Form der t-Verteilung hängt nur von den Freiheitsgraden ab und nähert sich mit wachsenden Freiheitsgraden der Standardnormalverteilung.', 'The shape of the t distribution depends only on the degrees of freedom and approaches the standard normal distribution as they grow.'), true),
      a(P('Mehr Freiheitsgrade bedeuten einen größeren Effekt', 'More degrees of freedom mean a larger effect'), P('Freiheitsgrade zählen verfügbare Informationen, keine Effektgröße. Sie hängen von der Zahl der Werte ab, nicht von Unterschieden zwischen Gruppen.', 'Degrees of freedom count available information, not an effect size. They depend on the number of values, not on differences between groups.')),
      a(P('Der t-Test für zwei Gruppen hat so viele Freiheitsgrade wie Gruppen', 'The t test for two groups has as many degrees of freedom as groups'), P('Er hat n₁ + n₂ − 2, also meist viele. Die Zahl der Gruppen ist nur 2.', 'It has n₁ + n₂ − 2, so usually many. The number of groups is only 2.'))
    ],
    hilfe: ['lm-freiheitsgrade', 'freiheitsgrade'], belege: ['wissen:t-test-freiheitsgrade', 'wissen:t-verteilung-eigenschaften', 'Hilfe:lm-freiheitsgrade']
  },
  {
    id: 'lmo-fg-varianz', thema: 'linmodell',
    stamm: P('Vier Werte haben um ihren Mittelwert eine Quadratsumme von 66. Wie groß ist die Varianz der Stichprobe?', 'Four values have a sum of squares of 66 around their mean. How large is the variance of the sample?'),
    antworten: [
      a(P(`${zn('lmo_fg_var_n1')}: die Quadratsumme geteilt durch 3 Freiheitsgrade`, `${zn('lmo_fg_var_n1')}: the sum of squares divided by 3 degrees of freedom`), P('Vier Werte, ein geschätzter Mittelwert: n − 1 = 3 Freiheitsgrade. 66 : 3 = 22.', 'Four values, one estimated mean: n − 1 = 3 degrees of freedom. 66 : 3 = 22.'), true),
      a(P(`${zd('lmo_fg_var_n', 1)}: durch n = 4 geteilt`, `${ze('lmo_fg_var_n', 1)}: divided by n = 4`), P('Durch n zu teilen unterschätzt die Varianz der Grundgesamtheit im Mittel. Die Stichprobenvarianz teilt durch n − 1.', 'Dividing by n underestimates the variance of the population on average. The sample variance divides by n − 1.')),
      a(P('66: die Quadratsumme selbst', '66: the sum of squares itself'), P('66 ist die Quadratsumme. Sie ist noch nicht durch die Zahl der Freiheitsgrade geteilt und wächst mit jedem weiteren Wert.', '66 is the sum of squares. It has not yet been divided by the number of degrees of freedom and grows with every further value.')),
      a(P('33: durch 2 geteilt', '33: divided by 2'), P('Es gibt keinen Grund, durch 2 zu teilen. Vier Werte mit einem geschätzten Mittelwert haben 3 Freiheitsgrade.', 'There is no reason to divide by 2. Four values with one estimated mean have 3 degrees of freedom.'))
    ],
    hilfe: ['lm-freiheitsgrade', 'varianz'], belege: ['wissen:varianz-erwartungstreu-sd-nicht', 'Hilfe:lm-freiheitsgrade']
  },

  // ======================================================== 3. Signal und Rauschen
  {
    id: 'lmo-sr-gemeinsam', thema: 'linmodell',
    stamm: P('t, F und χ² sind drei verschiedene Prüfgrößen. Was haben sie gemeinsam?', 't, F and χ² are three different test statistics. What do they have in common?'),
    antworten: [
      a(P('Alle setzen ins Verhältnis, was die Daten zeigen (Effekt) und was allein durch Zufall zu erwarten ist (Fehler)', 'All relate what the data show (effect) to what is to be expected by chance alone (error)'), P('t teilt einen Unterschied durch seinen Standardfehler, F die erklärte durch die Restvarianz, χ² die Abweichung der Zählungen durch die erwartete Häufigkeit. Immer steht Signal über Rauschen.', 't divides a difference by its standard error, F the explained by the residual variance, χ² the deviation of the counts by the expected frequency. Always signal stands over noise.'), true),
      a(P('Alle liegen zwischen 0 und 1 und lassen sich als Wahrscheinlichkeit lesen', 'All lie between 0 and 1 and can be read as a probability'), P('Prüfgrößen können beliebig groß werden; t kann auch negativ sein. Erst der p-Wert ist eine Wahrscheinlichkeit.', 'Test statistics can become arbitrarily large; t can also be negative. Only the p value is a probability.')),
      a(P('Alle setzen normalverteilte Rohdaten voraus', 'All presuppose normally distributed raw data'), P('χ² arbeitet mit Zählungen, für die keine Normalverteilung der Rohdaten verlangt wird. Auch bei t und F betrifft die Annahme eher die Fehler als die Rohdaten.', 'χ² works with counts, for which no normal distribution of the raw data is required. With t and F, too, the assumption concerns the errors rather than the raw data.')),
      a(P('Alle messen die Größe des Effekts in Standardabweichungen', 'All measure the size of the effect in standard deviations'), P('Das tut die Effektstärke d. Prüfgrößen wachsen mit der Zahl der Personen, auch wenn der Effekt gleich bleibt.', 'That is what the effect size d does. Test statistics grow with the number of people even if the effect stays the same.'))
    ],
    hilfe: ['lm-signal-rauschen', 'teststatistik'], belege: ['wissen:t-test-drei-varianten', 'wissen:f-gleich-t-quadrat', 'wissen:kreuz-chi2-berechnung', 'Hilfe:lm-signal-rauschen']
  },
  {
    id: 'lmo-sr-t-rechnen', thema: 'linmodell',
    stamm: P('Zwei Gruppen unterscheiden sich im Mittel um 6 Punkte. Der Standardfehler dieses Unterschieds beträgt 3. Wie groß ist t?', 'Two groups differ on average by 6 points. The standard error of this difference is 3. How large is t?'),
    antworten: [
      a(P('Der t-Wert ist 2', 'The t value is 2'), P('t ist Effekt geteilt durch Standardfehler: 6 : 3 = 2. Der Unterschied ist zwei Standardfehler groß.', 't is effect divided by standard error: 6 : 3 = 2. The difference is two standard errors large.'), true),
      a(P('Der t-Wert ist 18', 'The t value is 18'), P('18 entsteht beim Malnehmen. t ist ein Quotient: Effekt geteilt durch Fehler.', '18 comes from multiplying. t is a quotient: effect divided by error.')),
      a(P('Der t-Wert ist 9', 'The t value is 9'), P('9 ist die Summe aus Effekt und Standardfehler. t verbindet beide durch Teilen, nicht durch Addieren.', '9 is the sum of effect and standard error. t combines both by dividing, not by adding.')),
      a(P('Der t-Wert ist 3', 'The t value is 3'), P('3 ist der Standardfehler, das Rauschen. t setzt den Effekt dazu ins Verhältnis.', '3 is the standard error, the noise. t relates the effect to it.'))
    ],
    hilfe: ['lm-signal-rauschen', 'teststatistik'], belege: ['wissen:t-test-drei-varianten', 'Hilfe:lm-signal-rauschen']
  },
  {
    id: 'lmo-sr-n-vier', thema: 'linmodell',
    stamm: P('Zwei Gruppen werden verglichen. Mittelwerte und Standardabweichungen bleiben gleich, aber jede Gruppe hat viermal so viele Personen. Was geschieht mit Effekt, Standardfehler und t?', 'Two groups are compared. Means and standard deviations stay the same, but each group has four times as many people. What happens to effect, standard error and t?'),
    antworten: [
      a(P('Der Effekt bleibt, der Standardfehler halbiert sich, t verdoppelt sich', 'The effect stays, the standard error halves, t doubles'), P('Der Standardfehler enthält n unter der Wurzel: Viermal so viele Personen halbieren ihn. Bei gleichem Effekt wird t damit doppelt so groß.', 'The standard error has n under the root: four times as many people halve it. With the same effect t becomes twice as large.'), true),
      a(P('Effekt, Standardfehler und t bleiben gleich', 'Effect, standard error and t stay the same'), P('Der Standardfehler hängt von der Zahl der Personen ab. Mehr Personen machen den Mittelwert genauer, der Standardfehler sinkt.', 'The standard error depends on the number of people. More people make the mean more precise, the standard error falls.')),
      a(P('Der Effekt vervierfacht sich und t ebenfalls', 'The effect quadruples and so does t'), P('Der Effekt ist der Unterschied der Mittelwerte und ändert sich durch mehr Personen nicht, nur seine Schätzung wird genauer.', 'The effect is the difference of the means and does not change with more people, only its estimate gets more precise.')),
      a(P('Der Standardfehler sinkt auf ein Viertel und t vervierfacht sich', 'The standard error falls to a quarter and t quadruples'), P('Der Standardfehler sinkt nur mit der Wurzel von n, also hier auf die Hälfte. Darum wächst t nur auf das Doppelte.', 'The standard error falls only with the square root of n, so here to a half. That is why t grows only to double.'))
    ],
    hilfe: ['lm-signal-rauschen', 'standardfehler'], belege: ['wissen:standardfehler-mittelwert', 'Hilfe:lm-signal-rauschen']
  },
  {
    id: 'lmo-sr-vergleich', thema: 'linmodell',
    stamm: P('Studie A findet einen Unterschied von 10 Punkten mit t = 1, Studie B einen von 2 Punkten mit t = 4. Was stimmt?', 'Study A finds a difference of 10 points with t = 1, study B one of 2 points with t = 4. What is true?'),
    antworten: [
      a(P('In Studie B hebt sich der Unterschied deutlicher vom Zufall ab, obwohl er kleiner ist', 'In study B the difference stands out more clearly from chance although it is smaller'), P(`t ist der Effekt in Standardfehlern. Studie B hat ein kleines Rauschen (Standardfehler ${zd('lmo_sr_se_b', 1)} bei Effekt 2), Studie A ein großes (10 bei Effekt 10). Wie wichtig der Unterschied ist, sagt t damit nicht.`, `t is the effect in standard errors. Study B has little noise (standard error ${ze('lmo_sr_se_b', 1)} at effect 2), study A much (10 at effect 10). How important the difference is, t does not say.`), true),
      a(P('Studie A zeigt den stärkeren Beleg, weil ihr Unterschied größer ist', 'Study A shows the stronger evidence because its difference is larger'), P('Ein großer Unterschied ohne passende Genauigkeit belegt wenig. In A passt der Unterschied noch gut zum Zufall.', 'A large difference without matching precision shows little. In A the difference still fits chance well.')),
      a(P('Beide Studien belegen gleich viel, weil beide Unterschiede positiv sind', 'Both studies show equally much because both differences are positive'), P('Das Vorzeichen sagt nur die Richtung. Die Stärke des Belegs steckt in t, und die ist verschieden.', 'The sign only tells the direction. The strength of the evidence lies in t, and that differs.')),
      a(P('t gibt an, wie viele Punkte die Gruppen auseinanderliegen', 't states how many points the groups lie apart'), P('Die Punkte stehen im Effekt (10 und 2). t ist dieser Effekt gemessen in Standardfehlern.', 'The points are in the effect (10 and 2). t is this effect measured in standard errors.'))
    ],
    hilfe: ['lm-signal-rauschen', 'teststatistik'], belege: ['wissen:t-test-drei-varianten', 'Hilfe:lm-signal-rauschen']
  },
  {
    id: 'lmo-sr-f', thema: 'linmodell',
    stamm: P('Bei zwei Gruppen liefert der zweiseitige t-Test für unabhängige Stichproben t = 3. Welchen F-Wert liefert die Varianzanalyse für dieselben Daten?', 'With two groups the two-sided t test for independent samples gives t = 3. Which F value does the analysis of variance give for the same data?'),
    antworten: [
      a(P('9, denn F ist bei zwei Gruppen das Quadrat von t', '9, because with two groups F is the square of t'), P('Bei zwei Gruppen sind beide Verfahren dasselbe Modell: F = t², und die Freiheitsgrade des Nenners entsprechen denen des t-Tests.', 'With two groups both procedures are the same model: F = t², and the denominator degrees of freedom equal those of the t test.'), true),
      a(P('6, das Doppelte von t', '6, twice t'), P('Ein Faktor 2 hat keinen Grund im Modell. F entsteht aus dem Verhältnis zweier Quadratsummen und ist darum ein Quadrat.', 'A factor of 2 has no basis in the model. F arises from the ratio of two sums of squares and is therefore a square.')),
      a(P('3, derselbe Wert wie t', '3, the same value as t'), P('F und t haben verschiedene Skalen: F ist nie negativ und das Quadrat von t. Beide führen aber zum selben p-Wert.', 'F and t have different scales: F is never negative and the square of t. Both lead to the same p value.')),
      a(P('27, t hoch drei', '27, t cubed'), P('Es gibt keine Potenz von drei. Die Quadratsummen im Nenner und Zähler machen F zum Quadrat von t.', 'There is no power of three. The sums of squares in the denominator and numerator make F the square of t.'))
    ],
    hilfe: ['lm-signal-rauschen', 'f-test'], belege: ['wissen:f-gleich-t-quadrat', 'Hilfe:lm-signal-rauschen']
  },
  {
    id: 'lmo-sr-rauschen', thema: 'linmodell', mehrfach: true,
    stamm: P('Wodurch wird bei gleichem Effekt das Rauschen, also der Standardfehler des Unterschieds, kleiner? Mehrere können stimmen.', 'What makes the noise, that is the standard error of the difference, smaller at the same effect? Several can be true.'),
    antworten: [
      a(P('Durch mehr Personen je Gruppe', 'By more people per group'), P('Der Standardfehler sinkt mit der Wurzel der Gruppengröße: Viermal so viele Personen halbieren ihn.', 'The standard error falls with the square root of the group size: four times as many people halve it.'), true),
      a(P('Durch eine kleinere Streuung innerhalb der Gruppen', 'By a smaller spread within the groups'), P('Die Standardabweichungen stehen im Zähler des Standardfehlers. Geringeres Rauschen innerhalb der Gruppen macht Effekte leichter signifikant.', 'The standard deviations are in the numerator of the standard error. Less noise within the groups makes effects significant more easily.'), true),
      a(P('Durch einen größeren Unterschied der Mittelwerte', 'By a larger difference of the means'), P('Der Unterschied der Mittelwerte ist der Effekt, das Signal. Er verändert t, aber nicht das Rauschen.', 'The difference of the means is the effect, the signal. It changes t but not the noise.')),
      a(P('Durch ein strengeres Signifikanzniveau', 'By a stricter significance level'), P('Das Signifikanzniveau ist eine Entscheidungsgrenze und ändert die Daten nicht. Der Standardfehler bleibt, wie er ist.', 'The significance level is a decision threshold and does not change the data. The standard error stays as it is.'))
    ],
    hilfe: ['lm-signal-rauschen', 'standardfehler'], belege: ['wissen:dormann-wann-signifikant', 'wissen:standardfehler-mittelwert', 'Hilfe:lm-signal-rauschen']
  },
  {
    id: 'lmo-sr-rechnen2', thema: 'linmodell',
    stamm: P('Gruppe A (20 Personen) hat den Mittelwert 52, Gruppe B (20 Personen) den Mittelwert 46; beide Standardabweichungen sind 8. Wie groß ist t ungefähr?', 'Group A (20 people) has the mean 52, group B (20 people) the mean 46; both standard deviations are 8. How large is t roughly?'),
    antworten: [
      a(P(`${zd('lmo_sr_t')}: der Unterschied 6 geteilt durch den Standardfehler ${zd('lmo_sr_se')}`, `${ze('lmo_sr_t')}: the difference 6 divided by the standard error ${ze('lmo_sr_se')}`), P(`Der Standardfehler ist die Wurzel aus (8² : 20 + 8² : 20) = ${zd('lmo_sr_se')}. t = 6 : ${zd('lmo_sr_se')} = ${zd('lmo_sr_t')}.`, `The standard error is the square root of (8² : 20 + 8² : 20) = ${ze('lmo_sr_se')}. t = 6 : ${ze('lmo_sr_se')} = ${ze('lmo_sr_t')}.`), true),
      a(P(`${zd('lmo_sr_d')}: der Unterschied 6 geteilt durch die Standardabweichung 8`, `${ze('lmo_sr_d')}: the difference 6 divided by the standard deviation 8`), P('Das ist ein Effektmaß in Standardabweichungen (Cohens d), ohne die Zahl der Personen. t braucht den Standardfehler.', 'That is an effect measure in standard deviations (Cohen\'s d), without the number of people. t needs the standard error.')),
      a(P(`${zd('lmo_sr_t_ohne_wurzel')}: der Unterschied 6 geteilt durch die Summe der Brüche 8² : 20, ohne die Wurzel`, `${ze('lmo_sr_t_ohne_wurzel')}: the difference 6 divided by the sum of the fractions 8² : 20, without the root`), P('Die Summe der beiden Brüche ist erst die Varianz des Unterschieds. Der Standardfehler ist ihre Wurzel.', 'The sum of the two fractions is only the variance of the difference. The standard error is its square root.')),
      a(P('6, der Unterschied selbst', '6, the difference itself'), P('6 ist der Effekt, das Signal. t teilt ihn noch durch das Rauschen.', '6 is the effect, the signal. t still divides it by the noise.'))
    ],
    hilfe: ['lm-signal-rauschen', 'standardfehler'], belege: ['wissen:welch-prinzip', 'wissen:t-test-drei-varianten', 'Hilfe:lm-signal-rauschen']
  },

  // ======================================================== 4. Gruppenvergleich ist Regression
  {
    id: 'lmo-gr-b0', thema: 'linmodell',
    stamm: P('Die Gruppe ist als 0/1 kodiert (0 = ohne Training, 1 = mit Training). Das Modell lautet: Punkte = b₀ + b₁ · Gruppe + Fehler. Was ist b₀?', 'The group is coded 0/1 (0 = without training, 1 = with training). The model is: points = b₀ + b₁ · group + error. What is b₀?'),
    antworten: [
      a(P('Der Mittelwert der Gruppe 0, der Referenzgruppe', 'The mean of group 0, the reference group'), P('Für Gruppe = 0 bleibt nur b₀ übrig, und das beste Modell sagt für diese Gruppe ihren Mittelwert voraus.', 'For group = 0 only b₀ is left, and the best model predicts the mean of this group for them.'), true),
      a(P('Der Mittelwert aller Personen', 'The mean of all people'), P('Das wäre das Modell ganz ohne Gruppe. Mit der 0/1-Spalte gehört b₀ nur zur Gruppe mit 0.', 'That would be the model without any group. With the 0/1 column b₀ belongs only to the group with 0.')),
      a(P('Der Unterschied der Gruppenmittelwerte', 'The difference of the group means'), P('Den Unterschied zeigt b₁. b₀ ist der Ausgangspunkt, von dem aus b₁ gerechnet wird.', 'The difference is shown by b₁. b₀ is the starting point from which b₁ is counted.')),
      a(P('Der Mittelwert der Gruppe 1', 'The mean of group 1'), P('Der Mittelwert der Gruppe 1 ist b₀ + b₁. b₀ allein gilt für die Gruppe mit 0.', 'The mean of group 1 is b₀ + b₁. b₀ alone holds for the group with 0.'))
    ],
    hilfe: ['lm-gruppen-regression', 'referenzgruppe'], belege: ['wissen:reg-dummy-kodierung', 'Hilfe:lm-gruppen-regression']
  },
  {
    id: 'lmo-gr-b1', thema: 'linmodell',
    stamm: P('Im Modell Punkte = b₀ + b₁ · Gruppe + Fehler mit der Gruppe als 0/1-Spalte: Was ist b₁?', 'In the model points = b₀ + b₁ · group + error with the group as a 0/1 column: what is b₁?'),
    antworten: [
      a(P('Der Mittelwert der Gruppe 1 minus der Mittelwert der Gruppe 0', 'The mean of group 1 minus the mean of group 0'), P('Der Schritt von Gruppe 0 zu Gruppe 1 hat die Größe 1. b₁ sagt, um wie viel sich die Vorhersage dabei ändert: um die Differenz der Mittelwerte.', 'The step from group 0 to group 1 has size 1. b₁ says by how much the prediction changes: by the difference of the means.'), true),
      a(P('Der Mittelwert der Gruppe 1', 'The mean of group 1'), P('Der Mittelwert der Gruppe 1 ist b₀ + b₁. Erst nach Abzug von b₀ bleibt b₁.', 'The mean of group 1 is b₀ + b₁. Only after subtracting b₀ is b₁ left.')),
      a(P('Der Standardfehler des Gruppenunterschieds', 'The standard error of the group difference'), P('Der Standardfehler ist das Rauschen. b₁ selbst ist das Signal, der Unterschied.', 'The standard error is the noise. b₁ itself is the signal, the difference.')),
      a(P('Das Verhältnis der beiden Gruppenmittelwerte', 'The ratio of the two group means'), P('Ein Verhältnis wäre ein Quotient. b₁ ist eine Differenz in den Einheiten der Punkte.', 'A ratio would be a quotient. b₁ is a difference in the units of the points.'))
    ],
    hilfe: ['lm-gruppen-regression', 'koeffizient-b'], belege: ['wissen:reg-dummy-kodierung', 'Hilfe:lm-gruppen-regression']
  },
  {
    id: 'lmo-gr-gleichung', thema: 'linmodell',
    stamm: P('Gruppe 0 (ohne Training) hat den Mittelwert 40 Punkte, Gruppe 1 (mit Training) den Mittelwert 46. Welche Gleichung beschreibt den Gruppenvergleich als Regression mit 0/1-Spalte?', 'Group 0 (without training) has the mean 40 points, group 1 (with training) the mean 46. Which equation describes the group comparison as a regression with a 0/1 column?'),
    antworten: [
      a(P('Punkte = 40 + 6 · Gruppe', 'Points = 40 + 6 · group'), P('Für Gruppe = 0 ergibt das 40, für Gruppe = 1 ergibt es 46. b₀ = 40, b₁ = 46 − 40 = 6.', 'For group = 0 this gives 40, for group = 1 it gives 46. b₀ = 40, b₁ = 46 − 40 = 6.'), true),
      a(P('Punkte = 46 + 6 · Gruppe', 'Points = 46 + 6 · group'), P('Das sagt für Gruppe 0 den Wert 46 voraus und für Gruppe 1 den Wert 52. Beide Werte passen nicht zu den Mittelwerten.', 'This predicts the value 46 for group 0 and 52 for group 1. Neither value matches the means.')),
      a(P('Punkte = 6 + 40 · Gruppe', 'Points = 6 + 40 · group'), P('Konstante und Steigung sind vertauscht: Für Gruppe 0 ergäbe das 6, für Gruppe 1 46.', 'Constant and slope are swapped: for group 0 this would give 6, for group 1 46.')),
      a(P('Punkte = 43 + 3 · Gruppe', 'Points = 43 + 3 · group'), P('Das ergäbe 43 und 46 und passt nur zum Gesamtmittel 43 mit halbem Unterschied. Die Mittelwerte sind aber 40 und 46.', 'This would give 43 and 46 and only fits the overall mean 43 with half the difference. The means are 40 and 46, though.'))
    ],
    hilfe: ['lm-gruppen-regression', 'koeffizient-b'], belege: ['wissen:reg-dummy-kodierung', 'Hilfe:lm-gruppen-regression']
  },
  {
    id: 'lmo-gr-t-gleich', thema: 'linmodell',
    stamm: P('Dieselben Daten werden einmal mit dem t-Test für zwei unabhängige Gruppen (gleiche Varianzen angenommen) und einmal mit der Regression auf die 0/1-Spalte der Gruppe ausgewertet. Was gilt?', 'The same data are analysed once with the t test for two independent groups (equal variances assumed) and once with the regression on the 0/1 column of the group. What holds?'),
    antworten: [
      a(P('Der t-Wert für b₁ in der Regression ist derselbe wie der t-Wert des Gruppenvergleichs', 'The t value for b₁ in the regression is the same as the t value of the group comparison'), P('Beide rechnen mit denselben Resten und denselben Freiheitsgraden. Auch das p ist gleich, und b₁ ist die Mittelwertdifferenz.', 'Both work with the same residuals and the same degrees of freedom. The p is the same too, and b₁ is the mean difference.'), true),
      a(P('Die Regression liefert ein kleineres p, weil sie mehr Informationen nutzt', 'The regression gives a smaller p because it uses more information'), P('Hier nutzt sie dieselben Informationen: eine Spalte mit zwei Werten. Ein anderes p kommt erst, wenn weitere Größen ins Modell kommen.', 'Here it uses the same information: one column with two values. A different p arises only when further variables enter the model.')),
      a(P('Die Regression findet einen anderen Unterschied der Mittelwerte', 'The regression finds a different difference of the means'), P('b₁ ist genau die Differenz der Gruppenmittelwerte, dieselbe Zahl wie im t-Test.', 'b₁ is exactly the difference of the group means, the same number as in the t test.')),
      a(P('Nur der t-Test prüft den Unterschied, die Regression beschreibt ihn bloß', 'Only the t test tests the difference, the regression merely describes it'), P('Eine Regression hat zu jedem Koeffizienten einen Test, auch zu b₁. Er ist hier der t-Test.', 'A regression has a test for every coefficient, also for b₁. Here it is the t test.'))
    ],
    hilfe: ['lm-gruppen-regression', 'gepoolter-t-test'], belege: ['wissen:reg-dummy-kodierung', 'wissen:f-gleich-t-quadrat', 'Hilfe:lm-gruppen-regression']
  },
  {
    id: 'lmo-gr-nutzen', thema: 'linmodell', mehrfach: true,
    stamm: P('Warum ist es nützlich, einen Gruppenvergleich als Regression zu schreiben? Mehrere können stimmen.', 'Why is it useful to write a group comparison as a regression? Several can be true.'),
    antworten: [
      a(P('Weitere Größen, zum Beispiel das Alter, lassen sich einfach ins Modell nehmen', 'Further variables, for example age, can simply be put into the model'), P('Das Modell wächst um eine Spalte, und jedes b gilt dann bei gleichen Werten der anderen Größen. Der t-Test kennt diese Erweiterung nicht.', 'The model grows by one column, and every b then holds at equal values of the other variables. The t test does not know this extension.'), true),
      a(P('Auch Gruppen mit mehr als zwei Stufen lassen sich mit mehreren 0/1-Spalten abbilden', 'Groups with more than two levels can also be represented with several 0/1 columns'), P('Bei q Stufen braucht man q − 1 Spalten (Dummys), die Stufe ohne Spalte ist die Referenz.', 'With q levels one needs q − 1 columns (dummies), the level without a column is the reference.'), true),
      a(P('Die Regression macht Annahmen überflüssig', 'Regression makes assumptions unnecessary'), P('Die Annahmen bleiben, vor allem für Tests und Intervalle: unabhängige Beobachtungen, gleiche Streuung der Fehler und annähernd normalverteilte Fehler.', 'The assumptions remain, above all for tests and intervals: independent observations, equal spread of the errors and approximately normal errors.')),
      a(P('Die Regression braucht keine Referenzgruppe', 'Regression needs no reference group'), P('Mit 0/1-Spalten ist die Gruppe mit überall 0 die Referenz, und b₀ ist ihr Mittelwert.', 'With 0/1 columns the group with 0 everywhere is the reference, and b₀ is its mean.'))
    ],
    hilfe: ['lm-gruppen-regression', 'dummy-variable'], belege: ['wissen:reg-dummy-kodierung', 'wissen:reg-annahmen-liste', 'Hilfe:lm-gruppen-regression']
  },
  {
    id: 'lmo-gr-drei-stufen', thema: 'linmodell',
    stamm: P('Eine Gruppenvariable hat drei Stufen: A, B und C. Wie viele 0/1-Spalten braucht das Regressionsmodell zusätzlich zur Konstante?', 'A group variable has three levels: A, B and C. How many 0/1 columns does the regression model need in addition to the constant?'),
    antworten: [
      a(P('Zwei: eine Stufe ist die Referenz und braucht keine Spalte', 'Two: one level is the reference and needs no column'), P('Bei q Stufen sind es q − 1 Spalten. Die Konstante ist der Mittelwert der Referenzstufe, jedes b der Unterschied einer anderen Stufe zu ihr.', 'With q levels it is q − 1 columns. The constant is the mean of the reference level, each b the difference of another level from it.'), true),
      a(P('Drei: je eine Spalte für jede Stufe', 'Three: one column for each level'), P('Drei Spalten zusammen mit der Konstante wären voneinander abhängig (perfekte Multikollinearität). Das Modell wäre nicht eindeutig lösbar.', 'Three columns together with the constant would depend on each other (perfect multicollinearity). The model could not be solved uniquely.')),
      a(P('Eine: für die Stufe mit dem höchsten Mittelwert', 'One: for the level with the highest mean'), P('Eine Spalte unterscheidet nur zwei Gruppen. Drei Stufen brauchen zwei Unterschiede zur Referenz.', 'One column distinguishes only two groups. Three levels need two differences from the reference.')),
      a(P('Keine: die Konstante genügt für alle Stufen', 'None: the constant suffices for all levels'), P('Eine Konstante allein sagt für alle Personen denselben Wert voraus und ignoriert die Gruppen.', 'A constant alone predicts the same value for all people and ignores the groups.'))
    ],
    hilfe: ['lm-gruppen-regression', 'dummy-variable'], belege: ['wissen:reg-dummy-kodierung', 'Hilfe:lm-gruppen-regression']
  },
  {
    id: 'lmo-gr-referenz-wechsel', thema: 'linmodell',
    stamm: P('Man kodiert die Gruppen um: Jetzt ist die Gruppe mit Training die Referenz (0), die Gruppe ohne Training bekommt die 1. Was ändert sich im Modell?', 'The groups are recoded: now the group with training is the reference (0), the group without training gets the 1. What changes in the model?'),
    antworten: [
      a(P('b₀ wird zum Mittelwert der Trainingsgruppe und b₁ wechselt das Vorzeichen; die Vorhersagen bleiben gleich', 'b₀ becomes the mean of the training group and b₁ changes its sign; the predictions stay the same'), P('Das Modell sagt für jede Gruppe weiter ihren eigenen Mittelwert voraus. Nur die Schreibweise ändert sich: neuer Ausgangspunkt, Differenz in die andere Richtung.', 'The model still predicts each group\'s own mean. Only the notation changes: new starting point, difference in the other direction.'), true),
      a(P('Nichts, b₀ und b₁ bleiben dieselben Zahlen', 'Nothing, b₀ and b₁ stay the same numbers'), P('b₀ ist der Mittelwert der Referenz. Wechselt die Referenz, wechselt b₀ den Wert.', 'b₀ is the mean of the reference. If the reference changes, b₀ changes its value.')),
      a(P('Nur b₀ ändert sich, b₁ bleibt gleich', 'Only b₀ changes, b₁ stays the same'), P('b₁ ist die Differenz Gruppe 1 minus Referenz. Mit vertauschten Gruppen kehrt sich das Vorzeichen um.', 'b₁ is the difference group 1 minus reference. With the groups swapped the sign reverses.')),
      a(P('Die Vorhersagen für die beiden Gruppen ändern sich', 'The predictions for the two groups change'), P('Die Vorhersagen sind die Gruppenmittelwerte und hängen nicht von der Kodierung ab.', 'The predictions are the group means and do not depend on the coding.'))
    ],
    hilfe: ['lm-gruppen-regression', 'referenzgruppe'], belege: ['wissen:reg-dummy-kodierung', 'Hilfe:lm-gruppen-regression']
  },

  // ======================================================== 5. Annahmen-Landkarte
  {
    id: 'lmo-an-normal-reste', thema: 'linmodell',
    stamm: P('Worauf bezieht sich die Annahme der Normalverteilung in der linearen Regression?', 'What does the assumption of the normal distribution in linear regression refer to?'),
    antworten: [
      a(P('Auf die Fehler des Modells, die Residuen', 'On the errors of the model, the residuals'), P('Gefordert sind normalverteilte Fehler. Darum prüft man die Residuen, zum Beispiel mit einem Q-Q-Diagramm, und über die Verteilung der Vorhersagegröße wird nichts verlangt.', 'What is required are normally distributed errors. That is why the residuals are checked, for example with a Q-Q plot, and nothing is required about the distribution of the predictor.'), true),
      a(P('Auf die Rohdaten der Zielgröße', 'On the raw data of the outcome'), P('Auch eine schiefe Zielgröße kann normalverteilte Reste haben, etwa wenn eine Gruppenvariable die Schiefe erklärt.', 'Even a skewed outcome can have normally distributed residuals, for example when a group variable explains the skew.')),
      a(P('Auf jede Vorhersagegröße einzeln', 'On every predictor individually'), P('Über die Verteilung der Vorhersagegrößen wird nichts gefordert. Sie dürfen schief sein oder nur zwei Werte haben.', 'Nothing is required about the distribution of the predictors. They may be skewed or have only two values.')),
      a(P('Auf die geschätzten Koeffizienten b', 'On the estimated coefficients b'), P('Die Normalverteilung der Koeffizienten ist eine Folge normalverteilter Fehler oder großer Stichproben, nicht die Annahme selbst.', 'The normal distribution of the coefficients is a consequence of normal errors or large samples, not the assumption itself.'))
    ],
    hilfe: ['lm-annahmen', 'regressionsannahmen'], belege: ['wissen:reg-voraussetzung-residuen', 'wissen:reg-residuenplots', 'Hilfe:lm-annahmen']
  },
  {
    id: 'lmo-an-ziel', thema: 'linmodell',
    stamm: P('Bei kleiner Stichprobe: Wofür muss die Annahme normalverteilter Fehler vor allem erfüllt sein?', 'With a small sample: what is the assumption of normally distributed errors needed for above all?'),
    antworten: [
      a(P('Für verlässliche p-Werte und Konfidenzintervalle', 'For reliable p values and confidence intervals'), P('Verletzte Normalität gefährdet Tests und Intervalle. Bei großen Stichproben mildert der zentrale Grenzwertsatz diese Folge.', 'Violated normality endangers tests and intervals. With large samples the central limit theorem mitigates this consequence.'), true),
      a(P('Für die Schätzung der Koeffizienten b selbst', 'For the estimation of the coefficients b themselves'), P('Die Kleinste-Quadrate-Schätzung braucht keine Normalverteilung der Fehler. Unverzerrt ist sie, wenn die Form des Zusammenhangs stimmt und keine wichtige Größe fehlt.', 'Least-squares estimation needs no normal distribution of the errors. It is unbiased if the shape of the relationship is right and no important variable is missing.')),
      a(P('Für die Berechnung der Residuen', 'For the calculation of the residuals'), P('Residuen sind gemessen minus vorhergesagt und lassen sich immer ausrechnen, egal wie sie verteilt sind.', 'Residuals are measured minus predicted and can always be calculated, however they are distributed.')),
      a(P('Für die Wahl der Einheit der Zielgröße', 'For the choice of the unit of the outcome'), P('Die Einheit ist eine Frage der Messung. Die Annahme betrifft die Verteilung der Fehler.', 'The unit is a question of measurement. The assumption concerns the distribution of the errors.'))
    ],
    hilfe: ['lm-annahmen', 'regressionsannahmen'], belege: ['wissen:reg-folgen-verletzungen', 'wissen:reg-gauss-markov', 'Hilfe:lm-annahmen']
  },
  {
    id: 'lmo-an-gross', thema: 'linmodell',
    stamm: P('In einer Regression mit 2000 Personen sind die Residuen leicht schief. Was folgt daraus für die p-Werte der Koeffizienten?', 'In a regression with 2000 people the residuals are slightly skewed. What follows for the p values of the coefficients?'),
    antworten: [
      a(P('Bei einer so großen Stichprobe mildert der zentrale Grenzwertsatz die Folgen, leichte Schiefe ist meist kein Hindernis', 'With such a large sample the central limit theorem mitigates the consequences, slight skew is usually no obstacle'), P('Verletzte Normalität gefährdet Tests und Intervalle vor allem bei kleinen Stichproben. Bei großen mildert der Grenzwertsatz das.', 'Violated normality endangers tests and intervals mainly with small samples. With large ones the central limit theorem mitigates this.'), true),
      a(P('Die p-Werte sind ungültig und müssen verworfen werden', 'The p values are invalid and must be discarded'), P('So streng folgt es nicht: Es ist eine Gefährdung, keine automatische Ungültigkeit, und bei großem n kaum spürbar.', 'It does not follow that strictly: it is a risk, not an automatic invalidity, and hardly noticeable at large n.')),
      a(P('Die Personen mit den größten Resten müssen gestrichen werden', 'The people with the largest residuals must be removed'), P('Auffällige Punkte dürfen nicht routinemäßig gelöscht werden. Sie werden geprüft und nur mit Grund entfernt.', 'Conspicuous points must not be deleted routinely. They are checked and removed only with good reason.')),
      a(P('Es muss anstelle der Regression ein Rangtest gerechnet werden', 'A rank test must be calculated instead of the regression'), P('Ein Rangtest beantwortet eine andere Frage. Leichte Schiefe bei großem n ist kein Anlass zu wechseln.', 'A rank test answers another question. Slight skew at large n is no reason to switch.'))
    ],
    hilfe: ['lm-annahmen', 'zentraler-grenzwertsatz'], belege: ['wissen:reg-folgen-verletzungen', 'wissen:reg-voraussetzung-residuen', 'Hilfe:lm-annahmen']
  },
  {
    id: 'lmo-an-verzerrt', thema: 'linmodell',
    stamm: P('Welche Verletzung verzerrt die geschätzten Koeffizienten, statt sie bloß ungenauer zu machen?', 'Which violation biases the estimated coefficients instead of just making them less precise?'),
    antworten: [
      a(P('Eine gebogene Beziehung, die als Gerade angepasst wird (Nichtlinearität)', 'A curved relationship fitted as a straight line (nonlinearity)'), P('Nichtlinearität, fehlende wichtige Variablen und Messfehler in x verzerren die Koeffizienten. Darum steht die richtige Form an erster Stelle.', 'Nonlinearity, missing important variables and measurement error in x bias the coefficients. That is why the right shape comes first.'), true),
      a(P('Ungleiche Streuung der Fehler (Heteroskedastizität)', 'Unequal spread of the errors (heteroscedasticity)'), P('Sie macht die Schätzung ungenauer und die Standardfehler unzuverlässig, verzerrt aber die Koeffizienten selbst nicht.', 'It makes the estimate less precise and the standard errors unreliable but does not bias the coefficients themselves.')),
      a(P('Nicht normalverteilte Fehler', 'Errors that are not normally distributed'), P('Sie gefährden Tests und Intervalle, nicht die Koeffizienten. Der Satz von Gauß-Markov braucht keine Normalverteilung.', 'They endanger tests and intervals, not the coefficients. The Gauss-Markov theorem needs no normal distribution.')),
      a(P('Eine schiefe Verteilung der Vorhersagegröße x', 'A skewed distribution of the predictor x'), P('Über die Verteilung von x wird nichts gefordert. Entscheidend ist der Zusammenhang mit der Zielgröße.', 'Nothing is required about the distribution of x. What counts is the relationship with the outcome.'))
    ],
    hilfe: ['lm-annahmen', 'linearitaet'], belege: ['wissen:reg-folgen-verletzungen', 'wissen:reg-gauss-markov', 'Hilfe:lm-annahmen']
  },
  {
    id: 'lmo-an-reste-bogen', thema: 'linmodell',
    stamm: P('Das Bild zeigt die Residuen einer Regression gegen die vorhergesagten Werte. Was verrät das Muster?', 'The picture shows the residuals of a regression against the predicted values. What does the pattern reveal?'),
    diagramm: diag('lmo-an-reste-bogen', {
      titel: P('Residuen gegen vorhergesagte Werte (Regression, Residuendiagramm)', 'Residuals against predicted values (regression, residual plot)'),
      x: P('Vorhergesagter Wert', 'Predicted value'), y: P('Residuum (gemessen minus vorhergesagt)', 'Residual (measured minus predicted)'),
      kurz: P('Punktwolke mit 40 Punkten: Die Residuen liegen links und rechts, bei kleinen und großen vorhergesagten Werten, über 0, in der Mitte darunter; die Breite der Wolke bleibt etwa gleich.', 'Scatter plot of 40 points: the residuals lie above 0 on the left and on the right, at small and large predicted values, and below 0 in the middle; the width of the cloud stays about the same.'),
      quelle: QUELLE_RESID
    }),
    antworten: [
      a(P('Einen Bogen: Der Zusammenhang ist nicht linear, die Gerade hat die falsche Form', 'A curve: the relationship is not linear, the line has the wrong shape'), P('Ohne Muster streuen die Reste um 0. Hier liegen sie an den Rändern oben und in der Mitte unten: Eine Kurve fehlt im Modell, und die Koeffizienten sind dann verzerrt.', 'Without a pattern the residuals scatter around 0. Here they lie above at the margins and below in the middle: a curve is missing in the model, and the coefficients are then biased.'), true),
      a(P('Einen Trichter: Die Streuung der Fehler ist ungleich', 'A funnel: the spread of the errors is unequal'), P('Beim Trichter wächst oder sinkt die Breite der Punktwolke von links nach rechts. Hier bleibt die Breite etwa gleich, nur der Verlauf ist gebogen.', 'With a funnel the width of the cloud grows or shrinks from left to right. Here the width stays about the same, only the course is curved.')),
      a(P('Kein Muster: Alle Annahmen sind erfüllt', 'No pattern: all assumptions are met'), P('Fehlt ein Muster, zeigt sich eine zufällige Wolke um 0. Hier gibt es ein deutliches Muster.', 'Without a pattern there is a random cloud around 0. Here there is a clear pattern.')),
      a(P('Eine verletzte Normalverteilung der Rohdaten', 'A violated normal distribution of the raw data'), P('Die Normalität der Fehler zeigt ein Q-Q-Diagramm, nicht dieses Bild, und sie betrifft nicht die Rohdaten.', 'The normality of the errors is shown by a Q-Q plot, not by this picture, and it does not concern the raw data.'))
    ],
    hilfe: ['lm-annahmen', 'residuenplot'], belege: ['wissen:reg-residuenplots', 'wissen:reg-folgen-verletzungen', 'Hilfe:lm-annahmen']
  },
  {
    id: 'lmo-an-reste-trichter', thema: 'linmodell',
    stamm: P('Das Bild zeigt die Residuen einer anderen Regression gegen die vorhergesagten Werte. Was verrät das Muster?', 'The picture shows the residuals of another regression against the predicted values. What does the pattern reveal?'),
    diagramm: diag('lmo-an-reste-trichter', {
      titel: P('Residuen gegen vorhergesagte Werte (Regression, Residuendiagramm)', 'Residuals against predicted values (regression, residual plot)'),
      x: P('Vorhergesagter Wert', 'Predicted value'), y: P('Residuum (gemessen minus vorhergesagt)', 'Residual (measured minus predicted)'),
      kurz: P('Punktwolke mit 40 Punkten: Die Residuen liegen links eng um 0, nach rechts streuen sie immer weiter; die Mitte der Wolke bleibt bei 0.', 'Scatter plot of 40 points: on the left the residuals lie close to 0, to the right they spread ever wider; the middle of the cloud stays at 0.'),
      quelle: QUELLE_RESID
    }),
    antworten: [
      a(P('Einen Trichter: Die Streuung der Fehler wächst mit dem vorhergesagten Wert', 'A funnel: the spread of the errors grows with the predicted value'), P('Gleiche Streuung der Fehler würde ein Band konstanter Breite ergeben. Die Öffnung zeigt Heteroskedastizität: Die Standardfehler und damit Tests und Intervalle werden unzuverlässig.', 'Equal spread of the errors would give a band of constant width. The opening shows heteroscedasticity: the standard errors and thus tests and intervals become unreliable.'), true),
      a(P('Einen Bogen: Der Zusammenhang ist nicht linear', 'A curve: the relationship is not linear'), P('Bei Nichtlinearität liegen die Reste im Mittel einmal oben und einmal unten. Hier schwankt nur die Breite, die Mitte bleibt bei 0.', 'With nonlinearity the residuals lie on average once above and once below. Here only the width varies, the middle stays at 0.')),
      a(P('Kein Muster: Die Annahmen sind erfüllt', 'No pattern: the assumptions are met'), P('Die Breite der Wolke ändert sich deutlich. Das ist ein Muster, auch wenn die Mitte bei 0 liegt.', 'The width of the cloud changes clearly. That is a pattern, even though the middle is at 0.')),
      a(P('Ausreißer, die entfernt werden müssen', 'Outliers that must be removed'), P('Es sind keine einzelnen Punkte auffällig, sondern die Streuung wächst durchgehend. Entfernen löst das Problem nicht.', 'No single points stand out, the spread grows throughout. Removing points does not solve the problem.'))
    ],
    hilfe: ['lm-annahmen', 'heteroskedastizitaet'], belege: ['wissen:reg-residuenplots', 'wissen:reg-folgen-verletzungen', 'Hilfe:lm-annahmen']
  },
  {
    id: 'lmo-an-mehrfach', thema: 'linmodell', mehrfach: true,
    stamm: P('Welche Aussagen zur Prüfung der Annahmen einer Regression stimmen? Mehrere können stimmen.', 'Which statements about checking the assumptions of a regression are true? Several can be true.'),
    antworten: [
      a(P('Die Residuen gegen die vorhergesagten Werte zeigen Kurven und Trichter', 'The residuals against the predicted values show curves and funnels'), P('Ein Muster in diesem Bild weist auf Nichtlinearität (Kurve) oder ungleiche Streuung (Trichter) hin; ohne Muster streuen sie zufällig um 0.', 'A pattern in this picture points to nonlinearity (curve) or unequal spread (funnel); without a pattern they scatter randomly around 0.'), true),
      a(P('Die Normalität der Fehler prüft man an den Residuen, zum Beispiel mit einem Q-Q-Diagramm', 'The normality of the errors is checked on the residuals, for example with a Q-Q plot'), P('Die Annahme betrifft die Fehler, deren Schätzung die Residuen sind. Das Q-Q-Diagramm der Rohdaten wäre die falsche Stelle.', 'The assumption concerns the errors, whose estimate the residuals are. A Q-Q plot of the raw data would be the wrong place.'), true),
      a(P('Wenn die Summe der Residuen null ist, passt das Modell', 'If the sum of the residuals is zero, the model fits'), P('Mit einer Konstante im Modell ist die Summe der Residuen immer null, auch bei einem schlechten Modell. Die Zahl taugt nicht zur Prüfung.', 'With a constant in the model the sum of the residuals is always zero, even with a bad model. The number is useless for checking.')),
      a(P('Ein Histogramm der Zielgröße genügt, um die Normalität der Fehler zu beurteilen', 'A histogram of the outcome suffices to judge the normality of the errors'), P('Das Histogramm zeigt die Rohdaten. Gefragt ist die Verteilung der Fehler, die sich nur an den Residuen beurteilen lässt.', 'The histogram shows the raw data. What matters is the distribution of the errors, which can only be judged on the residuals.'))
    ],
    hilfe: ['lm-annahmen', 'residuenplot'], belege: ['wissen:reg-residuenplots', 'wissen:reg-residuen-eigenschaften', 'wissen:reg-voraussetzung-residuen', 'Hilfe:lm-annahmen']
  },

  // ======================================================== 6. Diagramme ehrlich
  {
    id: 'lmo-di-art', thema: 'linmodell',
    stamm: P('Man will zeigen, wie sich der Mittelwert einer Zielgröße in vier Gruppen unterscheidet. Welche Darstellung passt?', 'The aim is to show how the mean of an outcome differs across four groups. Which display suits?'),
    antworten: [
      a(P('Ein Säulen- oder Punktdiagramm der Mittelwerte mit Fehlerbalken', 'A column or dot chart of the means with error bars'), P('Je Gruppe ein Wert und ein Intervall: So lässt sich Unterschied und Unsicherheit zugleich ablesen. Säulen müssen bei 0 beginnen.', 'One value and one interval per group: this shows difference and uncertainty at the same time. Columns must start at 0.'), true),
      a(P('Ein Kreisdiagramm mit einem Stück je Gruppe', 'A pie chart with one slice per group'), P('Ein Kreis zeigt Anteile an einem Ganzen. Mittelwerte sind keine Teile eines Ganzen.', 'A pie shows shares of a whole. Means are not parts of a whole.')),
      a(P('Ein Liniendiagramm, das die vier Gruppen verbindet', 'A line chart connecting the four groups'), P('Eine Linie behauptet einen Verlauf dazwischen. Gruppen haben keine Reihenfolge in der Zeit, die Linie täuscht einen Trend vor.', 'A line claims a course in between. Groups have no order in time, the line pretends a trend.')),
      a(P('Dreidimensionale Säulen mit Schatten', 'Three-dimensional columns with shadows'), P('Perspektive und Schatten verändern die scheinbare Höhe und erschweren das Ablesen. Die dritte Dimension trägt keine Information.', 'Perspective and shadows change the apparent height and make reading harder. The third dimension carries no information.'))
    ],
    hilfe: ['lm-diagramme', 'saeulendiagramm'], belege: ['Hilfe:lm-diagramme']
  },
  {
    id: 'lmo-di-achse', thema: 'linmodell',
    stamm: P('Ein Säulendiagramm zeigt 80 % und 90 % Zufriedenheit mit zwei Mensen. Die senkrechte Achse beginnt bei 70 %. Was ist daran irreführend?', 'A column chart shows 80% and 90% satisfaction with two canteens. The vertical axis starts at 70%. What is misleading about it?'),
    antworten: [
      a(P('Die zweite Säule wirkt doppelt so hoch wie die erste, obwohl der Wert nur um ein Achtel größer ist', 'The second column looks twice as high as the first although the value is only an eighth larger'), P('Sichtbar sind die Höhen 10 und 20. Das Auge vergleicht sie, nicht die Zahlen 80 und 90. Der echte Unterschied (90 − 80) : 80 ist ein Achtel.', 'The visible heights are 10 and 20. The eye compares these, not the numbers 80 and 90. The real difference (90 − 80) : 80 is an eighth.'), true),
      a(P('Nichts, die Achse darf frei beginnen, wenn sie beschriftet ist', 'Nothing, the axis may start freely when it is labelled'), P('Auch mit Beschriftung sieht das Auge zuerst die Höhen. Bei Säulen zählt die Länge, darum muss sie bei 0 beginnen.', 'Even with a label the eye first sees the heights. With columns the length counts, so it must start at 0.')),
      a(P('Prozentwerte lassen sich grundsätzlich nicht als Säulen zeigen', 'Percentages cannot be shown as columns on principle'), P('Prozentwerte lassen sich als Säulen zeigen, wenn die Achse bei 0 beginnt. Das Problem ist der Achsenbeginn.', 'Percentages can be shown as columns when the axis starts at 0. The problem is the axis start.')),
      a(P('Die Säulen sind zu breit', 'The columns are too wide'), P('Die Breite spielt für den Vergleich keine Rolle, die Höhe schon. Irreführend ist der abgeschnittene untere Teil.', 'The width plays no role in the comparison, the height does. What misleads is the cut-off lower part.'))
    ],
    hilfe: ['lm-diagramme', 'abgeschnittene-achse'], belege: ['Hilfe:lm-diagramme']
  },
  {
    id: 'lmo-di-rechnen', thema: 'linmodell',
    stamm: P('Die Achse beginnt bei 70. Um wie viel Prozent wirkt die Säule für 90 im Bild höher als die Säule für 80?', 'The axis starts at 70. By how many percent does the column for 90 look higher in the picture than the column for 80?'),
    antworten: [
      a(P('100 Prozent', '100 percent'), P('Im Bild sind die Säulen 20 und 10 hoch: (20 − 10) : 10 = 100 Prozent. Der echte Unterschied ist viel kleiner.', 'In the picture the columns are 20 and 10 high: (20 − 10) : 10 = 100 percent. The real difference is much smaller.'), true),
      a(P(`${zd('lmo_di_echt', 1)} Prozent`, `${ze('lmo_di_echt', 1)} percent`), P('Das ist der echte Unterschied (90 − 80) : 80, aus den Zahlen. Gefragt ist der Eindruck im Bild, aus den sichtbaren Höhen.', 'That is the real difference (90 − 80) : 80, from the numbers. What is asked is the impression in the picture, from the visible heights.')),
      a(P('10 Prozent', '10 percent'), P('10 sind die Prozentpunkte des Unterschieds der beiden Werte. Der Eindruck im Bild hängt an den sichtbaren Höhen 10 und 20.', '10 are the percentage points of the difference of the two values. The impression in the picture depends on the visible heights 10 and 20.')),
      a(P('50 Prozent', '50 percent'), P('50 Prozent ergäbe sich, wenn die niedrigere durch die höhere Säule geteilt wird (10 : 20). Der Vergleich geht von der niedrigeren Säule aus: (20 − 10) : 10.', '50 percent would arise if the lower column is divided by the higher one (10 : 20). The comparison starts from the lower column: (20 − 10) : 10.'))
    ],
    hilfe: ['lm-diagramme', 'abgeschnittene-achse'], belege: ['Hilfe:lm-diagramme']
  },
  {
    id: 'lmo-di-wann', thema: 'linmodell',
    stamm: P('Wann darf die Achse eines Diagramms bei einem Wert über 0 beginnen?', 'When may the axis of a chart start at a value above 0?'),
    antworten: [
      a(P('Bei Punkt- oder Liniendiagrammen, in denen Lage und Verlauf zählen und nicht die Länge einer Säule', 'In dot or line charts in which position and course count rather than the length of a column'), P('Punkte und Linien zeigen Lage, keine Länge. Ein späterer Achsenbeginn ist dort vertretbar, wenn er klar zu erkennen ist.', 'Dots and lines show position, not length. A later axis start is defensible there if it is clearly visible.'), true),
      a(P('Bei Säulendiagrammen, wenn der Platz knapp ist', 'In column charts when space is short'), P('Säulen zeigen die Zahl als Länge. Wird sie am Anfang abgeschnitten, stimmt das Verhältnis der Längen nicht mehr.', 'Columns show the number as a length. If it is cut off at the start, the ratio of the lengths is no longer right.')),
      a(P('Bei allen Diagrammen mit Prozentwerten', 'In all charts with percentages'), P('Prozentwerte verlangen bei Säulen wie jede Zahl den Beginn bei 0.', 'Percentages, like any number, require columns to start at 0.')),
      a(P('Wenn die Beschriftung der Achse es erwähnt', 'When the label of the axis mentions it'), P('Die Beschriftung ändert nicht, was das Auge zuerst sieht. Sie ersetzt nicht den Beginn bei 0 bei Säulen.', 'The label does not change what the eye sees first. It does not replace starting at 0 for columns.'))
    ],
    hilfe: ['lm-diagramme', 'abgeschnittene-achse'], belege: ['Hilfe:lm-diagramme']
  },
  {
    id: 'lmo-di-drei-d', thema: 'linmodell',
    stamm: P('Warum sind dreidimensionale Säulen für den Vergleich von Werten ungünstig?', 'Why are three-dimensional columns unfavourable for comparing values?'),
    antworten: [
      a(P('Perspektive und Schatten verändern die scheinbare Höhe, die Werte lassen sich schwerer ablesen', 'Perspective and shadows change the apparent height, the values are harder to read'), P('Die dritte Dimension trägt keine Information, verzerrt aber den Eindruck: Eine Säule weiter vorn wirkt anders hoch als eine hinten.', 'The third dimension carries no information but distorts the impression: a column further in front looks differently high than one at the back.'), true),
      a(P('Sie brauchen mehr Daten als flache Säulen', 'They need more data than flat columns'), P('Die Datenmenge ist dieselbe. Nur die Darstellung ändert sich.', 'The amount of data is the same. Only the display changes.')),
      a(P('Sie lassen sich nicht drucken', 'They cannot be printed'), P('Drucken geht. Das Problem liegt beim Lesen der Werte, nicht beim Medium.', 'Printing works. The problem lies in reading the values, not in the medium.')),
      a(P('Sie zeigen nur Prozentwerte', 'They show only percentages'), P('Sie zeigen auch andere Zahlen. Auch dann stört der Tiefeneffekt den Vergleich.', 'They show other numbers as well. Even then the depth effect disturbs the comparison.'))
    ],
    hilfe: ['lm-diagramme', 'dreidimensionale-diagramme'], belege: ['Hilfe:lm-diagramme']
  },
  {
    id: 'lmo-di-fehlerbalken', thema: 'linmodell', mehrfach: true,
    stamm: P('Ein Diagramm zeigt Mittelwerte mit Fehlerbalken. Welche Aussagen stimmen? Mehrere können stimmen.', 'A chart shows means with error bars. Which statements are true? Several can be true.'),
    antworten: [
      a(P('Die Beschriftung muss sagen, ob die Balken Standardabweichung, Standardfehler oder Konfidenzintervall zeigen', 'The caption must say whether the bars show standard deviation, standard error or confidence interval'), P('Das lässt sich am Balken nicht erkennen, und aus Standardabweichungen allein ergibt sich keine Aussage über Signifikanz.', 'This cannot be seen from the bar, and standard deviations alone give no statement about significance.'), true),
      a(P('Ein Balken von einem Standardfehler ist ungefähr halb so breit wie ein 95-Prozent-Intervall', 'A bar of one standard error is about half as wide as a 95 percent interval'), P('Das 95-Prozent-Intervall ist etwa zwei Standardfehler nach jeder Seite. Bei sehr kleinem n weicht es davon ab.', 'The 95 percent interval is about two standard errors on each side. With very small n it deviates from this.'), true),
      a(P('Überlappen sich zwei 95-Prozent-Intervalle, ist der Unterschied sicher nicht signifikant', 'If two 95 percent intervals overlap, the difference is surely not significant'), P('Haben die Intervalle keinen gemeinsamen Bereich, ist der Unterschied signifikant. Umgekehrt folgt aus einer Überlappung noch nichts.', 'If the intervals share no common range, the difference is significant. Conversely, overlap proves nothing yet.')),
      a(P('Bei Messwiederholung sagen die Balken der beiden Einzelmittelwerte etwas über die Signifikanz des Unterschieds', 'With repeated measures the bars of the two single means say something about the significance of the difference'), P('Sie lassen die Korrelation der Messungen derselben Personen außer Acht. Über die Signifikanz sagen sie dort nichts.', 'They ignore the correlation of the measurements of the same people. They say nothing about significance there.'))
    ],
    hilfe: ['lm-diagramme', 'fehlerbalken'], belege: ['wissen:fehlerbalken-ueberlappung', 'wissen:belia-se-balken', 'wissen:belia-messwiederholung-balken', 'Hilfe:lm-diagramme']
  },
  {
    id: 'lmo-di-faktor', thema: 'linmodell',
    stamm: P('Zwei Säulen haben die Werte 50 und 60, die Achse beginnt bei 40. Wie viel höher wirkt die zweite Säule im Bild als die erste?', 'Two columns have the values 50 and 60, the axis starts at 40. How much higher does the second column look in the picture than the first?'),
    antworten: [
      a(P('Doppelt so hoch: Die sichtbaren Höhen sind 10 und 20', 'Twice as high: the visible heights are 10 and 20'), P(`Der echte Wert ist nur das ${zd('lmo_di_real', 1)}-Fache. Die abgeschnittene Achse macht daraus das Doppelte.`, `The real value is only ${ze('lmo_di_real', 1)} times. The cut-off axis turns it into double.`), true),
      a(P(`${zd('lmo_di_real', 1)}-mal so hoch, wie die Zahlen`, `${ze('lmo_di_real', 1)} times as high, like the numbers`), P('Das wäre der Eindruck bei einer Achse ab 0. Hier fehlt der untere Teil, und die Säulen wirken sehr verschieden.', 'That would be the impression with an axis from 0. Here the lower part is missing and the columns look very different.')),
      a(P('Gleich hoch, weil beide über 40 liegen', 'Equally high because both are above 40'), P('Beide ragen über 40, aber um verschiedene Stücke: 10 und 20. Diese Stücke sind im Bild zu sehen.', 'Both stand above 40 but by different amounts: 10 and 20. These amounts are what is visible in the picture.')),
      a(P('Eineinhalbmal so hoch', 'One and a half times as high'), P('Eineinhalbfach hieße 15 zu 10 Einheiten. Die sichtbaren Höhen sind 10 und 20, also das Doppelte.', 'One and a half times would mean 15 to 10 units. The visible heights are 10 and 20, so double.'))
    ],
    hilfe: ['lm-diagramme', 'abgeschnittene-achse'], belege: ['Hilfe:lm-diagramme']
  },

  // ======================================================== 7. Daten sauber anlegen
  {
    id: 'lmo-da-zeile', thema: 'linmodell',
    stamm: P('Eine Tabelle mit Fragebogendaten wird angelegt. Was gehört in eine Zeile und was in eine Spalte?', 'A table with questionnaire data is being set up. What belongs in a row and what in a column?'),
    antworten: [
      a(P('Eine Zeile je Person, eine Spalte je gemessene Größe', 'One row per person, one column per measured variable'), P('So kann jede Zeile als eine Beobachtung gelesen und jede Spalte als eine Größe ausgewertet werden. Das ist die Grundform fast aller Verfahren.', 'This way each row can be read as one observation and each column evaluated as one variable. This is the basic form of nearly all procedures.'), true),
      a(P('Eine Spalte je Person, eine Zeile je Frage', 'One column per person, one row per question'), P('Das ist die gedrehte Form. Programme erwarten die Personen in den Zeilen.', 'That is the rotated form. Programs expect the people in the rows.')),
      a(P('Eine Zeile je Antwortstufe, die Personen in einer Spalte', 'One row per answer level, the people in one column'), P('Dann wäre die Person keine Beobachtung mehr, und die Antworten ließen sich nicht je Person verbinden.', 'The person would then no longer be one observation, and the answers could not be linked per person.')),
      a(P('Alles in einer Spalte, durch Kommas getrennt', 'Everything in one column, separated by commas'), P('Mehrere Angaben in einer Zelle lassen sich nicht rechnen. Jede Größe braucht eine eigene Spalte.', 'Several pieces of information in one cell cannot be calculated with. Each variable needs a column of its own.'))
    ],
    hilfe: ['lm-daten-anlegen', 'datenmatrix'], belege: ['Hilfe:lm-daten-anlegen']
  },
  {
    id: 'lmo-da-codes', thema: 'linmodell',
    stamm: P('Eine Spalte enthält die Codes 1, 2 und 3 für „weiblich“, „männlich“ und „divers“. Wozu dient die Wertebeschriftung?', 'A column holds the codes 1, 2 and 3 for "female", "male" and "diverse". What is the value label for?'),
    antworten: [
      a(P('Sie sagt, was jeder Code bedeutet, damit Tabellen und Diagramme lesbar sind; gerechnet wird mit dem Code', 'It says what each code means so that tables and charts are readable; calculations use the code'), P('Der Code steht in der Zelle, die Beschriftung wird bei der Anzeige davorgesetzt. Ein Codebuch hält dasselbe fest.', 'The code is in the cell, the label is put in front of it when displayed. A codebook records the same.'), true),
      a(P('Sie ersetzt die Zahl in der Zelle durch Text', 'It replaces the number in the cell with text'), P('Die Zelle behält den Code. Nur die Anzeige zeigt den Text.', 'The cell keeps the code. Only the display shows the text.')),
      a(P('Sie macht aus der Spalte eine metrische Größe', 'It turns the column into a metric variable'), P('Die Beschriftung ändert das Messniveau nicht. Geschlecht bleibt eine nominale Größe.', 'The label does not change the level of measurement. Gender stays a nominal variable.')),
      a(P('Sie wird nur für den Export gebraucht', 'It is needed only for export'), P('Sie wird bei jeder Tabelle und jedem Diagramm gebraucht, damit man lesen kann, welche Gruppe gemeint ist.', 'It is needed in every table and every chart so that one can read which group is meant.'))
    ],
    hilfe: ['lm-daten-anlegen', 'wertelabel'], belege: ['Hilfe:lm-daten-anlegen']
  },
  {
    id: 'lmo-da-fehlend', thema: 'linmodell',
    stamm: P('Eine Person lässt eine Frage aus. Wie wird das in der Tabelle eingetragen?', 'A person skips a question. How is that entered in the table?'),
    antworten: [
      a(P('Die Zelle bleibt leer, oder ein eigener Code wie 99 steht darin und ist als fehlend gekennzeichnet', 'The cell stays empty, or a code of its own such as 99 stands in it and is marked as missing'), P('So weiß das Programm, dass hier nichts gemessen wurde, und zählt die Zeile bei dieser Größe nicht mit.', 'This way the program knows that nothing was measured here and does not count the row for this variable.'), true),
      a(P('Mit 0, damit die Zelle nicht leer ist', 'With 0, so that the cell is not empty'), P('Eine 0 ist ein Messwert und würde mitgerechnet. Der Mittelwert sänke, und das Fehlen bliebe unsichtbar.', 'A 0 is a measured value and would be included. The mean would fall and the missing value would stay invisible.')),
      a(P('Die ganze Person wird aus der Tabelle gelöscht', 'The whole person is deleted from the table'), P('Dann gehen auch die übrigen Antworten der Person verloren. Gelöscht wird nur, wenn es begründet ist.', 'Then the person\'s other answers are lost too. Deleting happens only if justified.')),
      a(P('Mit dem Mittelwert der Spalte aufgefüllt', 'Filled in with the mean of the column'), P('Das ist ein Ersetzen (Imputation) und gehört nicht in die Erfassung. Es täuscht eine Antwort vor, die es nicht gab.', 'That is replacing (imputation) and does not belong in data entry. It pretends an answer that did not exist.'))
    ],
    hilfe: ['lm-daten-anlegen', 'fehlende-werte'], belege: ['Hilfe:lm-daten-anlegen']
  },
  {
    id: 'lmo-da-zeilen', thema: 'linmodell',
    stamm: P('12 Personen wurden zu 3 Zeitpunkten gemessen. Wie viele Zeilen hat die Tabelle in der langen Form, in der jede Messung eine eigene Zeile hat?', '12 people were measured at 3 time points. How many rows does the table have in the long form, where each measurement has a row of its own?'),
    antworten: [
      a(P('36 Zeilen', '36 rows'), P('Jede der 12 Personen hat je Zeitpunkt eine Zeile: 12 · 3 = 36. Die Zeilen sind nun Messungen, keine Personen.', 'Each of the 12 people has a row per time point: 12 · 3 = 36. The rows are now measurements, no longer people.'), true),
      a(P('15 Zeilen', '15 rows'), P('15 ist die Summe 12 + 3. Es ist aber jede Person mit jedem Zeitpunkt zu kombinieren, also ein Produkt.', '15 is the sum 12 + 3. Each person must be combined with each time point, so a product.')),
      a(P('12 Zeilen', '12 rows'), P('12 Zeilen hat die breite Form, mit einer Zeile je Person. In der langen Form sind es mehr.', '12 rows is the wide form, with one row per person. In the long form there are more.')),
      a(P('9 Zeilen', '9 rows'), P('9 entsteht, wenn man 12 − 3 rechnet. Zeilen werden nicht abgezogen, sondern vervielfacht.', '9 arises from 12 − 3. Rows are not subtracted but multiplied.'))
    ],
    hilfe: ['lm-daten-anlegen', 'langformat'], belege: ['Hilfe:lm-daten-anlegen', 'Hilfe:umstrukturieren']
  },
  {
    id: 'lmo-da-breit-lang', thema: 'linmodell',
    stamm: P('Wann steht eine Tabelle üblicherweise breit (eine Zeile je Person) und wann lang (eine Zeile je Messung)?', 'When is a table usually wide (one row per person) and when long (one row per measurement)?'),
    antworten: [
      a(P('Breit für Verfahren zur Messwiederholung wie vorher und nachher, lang für Mehrebenen-Modelle', 'Wide for procedures for repeated measures such as before and after, long for multilevel models'), P('Die Verfahren für Messwiederholung erwarten je Zeitpunkt eine Spalte, Mehrebenen-Modelle eine Zeile je Messung mit Kennung und Zeitpunkt.', 'The procedures for repeated measures expect one column per time point, multilevel models one row per measurement with ID and time point.'), true),
      a(P('Grundsätzlich breit, weil die lange Form zu viele Zeilen hat', 'Wide as a matter of principle because the long form has too many rows'), P('Die Zahl der Zeilen entscheidet nicht. Welche Form man braucht, hängt vom Verfahren ab; „Umstrukturieren“ wandelt sie um.', 'The number of rows does not decide. Which form is needed depends on the procedure; "Reshape" converts it.')),
      a(P('Breit für Mehrebenen-Modelle, lang für Messwiederholung', 'Wide for multilevel models, long for repeated measures'), P('Das ist vertauscht: Mehrebenen-Modelle verlangen die lange Form, die Messwiederholung die breite.', 'That is swapped: multilevel models require the long form, repeated measures the wide one.')),
      a(P('Sie hängt vom Programm ab, nicht vom Verfahren', 'It depends on the program, not on the procedure'), P('Die erwartete Form folgt dem Verfahren. Ein Programm kann nur dort umformen helfen, wo sie nicht passt.', 'The expected form follows the procedure. A program can only help reshape where it does not fit.'))
    ],
    hilfe: ['lm-daten-anlegen', 'umstrukturieren'], belege: ['Hilfe:lm-daten-anlegen', 'Hilfe:umstrukturieren']
  },
  {
    id: 'lmo-da-mehrfach', thema: 'linmodell', mehrfach: true,
    stamm: P('Welche Aussagen zu sauber angelegten Daten stimmen? Mehrere können stimmen.', 'Which statements about cleanly set-up data are true? Several can be true.'),
    antworten: [
      a(P('Eine Spalte enthält eine Größe in einer Einheit', 'A column holds one variable in one unit'), P('So lässt sich jede Spalte als Ganzes rechnen und beschriften. Gemischte Einheiten in einer Spalte machen jede Auswertung unsicher.', 'This way each column can be calculated and labelled as a whole. Mixed units in one column make every analysis uncertain.'), true),
      a(P('Eine Kennung je Person erlaubt später das Zusammenführen und Umformen', 'An identifier per person allows merging and reshaping later'), P('Mit der Kennung lassen sich Tabellen verbinden, Messungen derselben Person zuordnen und Doppelte finden.', 'With the identifier tables can be joined, measurements of the same person matched and duplicates found.'), true),
      a(P('Zwei Angaben in einer Zelle, etwa „12 kg, 3 Jahre“, sind unproblematisch, wenn man sie später trennt', 'Two pieces of information in one cell, such as "12 kg, 3 years", are unproblematic if separated later'), P('Das Trennen ist Mehrarbeit und fehleranfällig. Jede Angabe gehört von Anfang an in eine eigene Spalte.', 'Separating them is extra work and error-prone. Each piece of information belongs in a column of its own from the start.')),
      a(P('Eine leere Zelle und eine 0 bedeuten dasselbe', 'An empty cell and a 0 mean the same'), P('Leer heißt „nicht bekannt“, 0 ist ein Messwert. Verwechselt man sie, verfälscht das jeden Mittelwert.', 'Empty means "not known", 0 is a measured value. Confusing them distorts every mean.'))
    ],
    hilfe: ['lm-daten-anlegen', 'kennung'], belege: ['Hilfe:lm-daten-anlegen']
  },
  {
    id: 'lmo-da-mit-wert', thema: 'linmodell',
    stamm: P('Eine lange Tabelle hat 36 Zeilen. Bei 3 Zeilen ist der Messwert leer (fehlend). Wie viele Messungen gehen in die Berechnung eines Mittelwerts ein?', 'A long table has 36 rows. In 3 rows the measured value is empty (missing). How many measurements enter the calculation of a mean?'),
    antworten: [
      a(P('33 Messungen', '33 measurements'), P('Leere Zellen zählen nicht mit: 36 − 3 = 33 Zeilen mit Wert. Der Mittelwert ist die Summe dieser 33 Werte geteilt durch 33.', 'Empty cells do not count: 36 − 3 = 33 rows with a value. The mean is the sum of these 33 values divided by 33.'), true),
      a(P('36 Messungen', '36 measurements'), P('36 ist die Zahl aller Zeilen, auch derer ohne Wert. Eine Zeile ohne Messwert kann nichts beitragen.', '36 is the number of all rows, including those without a value. A row without a measured value can contribute nothing.')),
      a(P('3 Messungen', '3 measurements'), P('3 ist die Zahl der fehlenden Werte, nicht der vorhandenen.', '3 is the number of missing values, not of the present ones.')),
      a(P('12 Messungen', '12 measurements'), P('12 wäre die Zahl der Personen. Es gehen aber Messungen ein, und eine Person hat mehrere.', '12 would be the number of people. What enter, though, are measurements, and a person has several.'))
    ],
    hilfe: ['lm-daten-anlegen', 'fehlende-werte'], belege: ['Hilfe:lm-daten-anlegen']
  }
];
