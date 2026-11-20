/**
 * Rechenaufgaben zum Selbst-Rechnen (Baustein „Selbst rechnen“ der Lerneinheiten, Johannes 05.11.2026): eine kurze Lage, eine kleine Datentabelle,
 * zwei bis vier Schritte mit Zahlenfeld. Je Schritt: Frage, Erklärung „Warum so?“, gezielte Tipps bei typischen Fehlwegen und der Rechenweg mit Zwischenschritten.
 *
 * Alle Zahlen sind erfunden (Alltag aus Studium, Schule und Gesundheit); nichts stammt aus einem Lehrbuch.
 * Das Soll jedes Schritts wird in `bau` aus den Rohdaten der Aufgabe berechnet, nie von Hand eingetippt; der Wächter `rechenaufgaben.test.ts` rechnet jede Lösung
 * mit einem zweiten, unabhängigen Weg nach. Texte mit Zahlen entstehen aus dem Soll (`weg` bekommt den Formatierer des Projekts: Dezimalzeichen nach Sprachprofil und Einstellung).
 */
import { P, type Paar } from '../i18n/laufzeit';
import type { Zahl } from './rechenaufgaben-bau';
import { AUFGABEN_VV } from './rechenaufgaben-vv';
import { AUFGABEN_SF } from './rechenaufgaben-sf';
import { AUFGABEN_NUTZEN } from './rechenaufgaben-nutzen';
import { AUFGABEN_NUTZEN_B } from './rechenaufgaben-nutzen-b';
import { AUFGABEN_PSYCH } from './rechenaufgaben-psych';
import { bau, summe, mittel, quadratsumme, median, plus } from './rechenaufgaben-bau';
export type { Zahl, Schritt, Tabelle, Rechenaufgabe } from './rechenaufgaben-bau';

// ---------------------------------------------------------------- 1. Modell und Fehler
/** Rohdaten (für den Wächter und die Tabellen). */
export const DATEN_MODELL = { namen: ['Anna', 'Ben', 'Cem', 'Dora', 'Eva'], stunden: [4, 10, 2, 9, 5] };
const MODELL = bau({
  id: 'modell-fehler',
  daten: DATEN_MODELL,
  lage: P('Fünf Studierende haben notiert, wie viele Stunden sie in der Woche vor der Klausur gelernt haben. Das einfachste Modell für diese Zahlen ist ein einziger Wert für alle: der Mittelwert. Jede Person bekommt ihn als Vorhersage.',
    'Five students noted how many hours they studied in the week before the exam. The simplest model for these numbers is one single value for everybody: the mean. Every person gets it as a prediction.'),
  tabelle: { titel: P('Lernstunden in einer Woche', 'Study hours in one week'), kopf: [P('Person', 'Person'), P('Lernstunden', 'Study hours')], zeilen: DATEN_MODELL.namen.map((n, i) => [n, DATEN_MODELL.stunden[i]!]) },
  schritte: [
    { id: 'mittel', stellen: 0, toleranz: 0.01, einheit: P('Stunden', 'hours'), soll: d => mittel(d.stunden),
      frage: P('Wie groß ist der Mittelwert der fünf Werte? Er ist das Modell: Jede Person bekommt denselben Vorhersagewert.', 'What is the mean of the five values? It is the model: every person gets the same predicted value.'),
      warum: P('Das Modell soll für jede Person einen Wert vorhersagen. Wer sonst nichts weiß, wählt den Wert, bei dem die Quadratsumme der Abweichungen am kleinsten wird. Das ist der Mittelwert: die Summe geteilt durch die Zahl der Werte.',
        'The model should predict a value for each person. If nothing else is known, one picks the value for which the sum of squared deviations is smallest. That is the mean: the sum divided by the number of values.'),
      tipp: P('Zuerst alle fünf Werte addieren, dann durch 5 teilen.', 'First add all five values, then divide by 5.'),
      fehler: [
        { wert: d => summe(d.stunden), tipp: P('Das ist die Summe der fünf Werte. Es fehlt noch das Teilen durch 5.', 'That is the sum of the five values. Dividing by 5 is still missing.') },
        { wert: d => median(d.stunden), tipp: P('Das ist der Median, der mittlere Wert der geordneten Zahlen. Gefragt ist der Mittelwert: alle Werte addieren und durch 5 teilen.', 'That is the median, the middle value of the ordered numbers. The mean is asked for: add all values and divide by 5.') }
      ],
      weg: (d, z) => [
        P(`Summe: ${d.stunden.join(' + ')} = ${z(summe(d.stunden))}`, `Sum: ${d.stunden.join(' + ')} = ${z(summe(d.stunden))}`),
        P(`Mittelwert: ${z(summe(d.stunden))} : ${d.stunden.length} = ${z(mittel(d.stunden))}`, `Mean: ${z(summe(d.stunden))} : ${d.stunden.length} = ${z(mittel(d.stunden))}`)
      ] },
    { id: 'abweichung', stellen: 0, toleranz: 0.01, einheit: P('Stunden', 'hours'), soll: d => d.stunden[2]! - mittel(d.stunden),
      frage: P('Wie groß ist die Abweichung von Cem (2 Stunden) vom Modell? Rechnen: gemessener Wert minus Modellwert.', 'How large is the deviation of Cem (2 hours) from the model? Calculate: measured value minus model value.'),
      warum: P('Die Abweichung (auch Rest, Residuum oder Fehler genannt) sagt, wie weit das Modell bei einer Person danebenliegt. Es gilt: gemessen = Modell + Fehler, also Fehler = gemessen − Modell. Das Vorzeichen zeigt die Richtung: Minus heißt, das Modell sagt zu viel voraus.',
        'The deviation (also called residual or error) tells how far the model is off for one person. The rule is: measured = model + error, so error = measured − model. The sign shows the direction: minus means the model predicts too much.'),
      tipp: P('Gemessener Wert minus Modellwert, also 2 minus der Mittelwert.', 'Measured value minus model value, so 2 minus the mean.'),
      fehler: [
        { wert: d => mittel(d.stunden) - d.stunden[2]!, tipp: P('Der Betrag stimmt, das Vorzeichen nicht. Cem hat weniger gelernt, als das Modell vorhersagt, darum ist seine Abweichung negativ: gemessen minus Modell.', 'The size is right, the sign is not. Cem studied less than the model predicts, so his deviation is negative: measured minus model.') },
        { wert: d => d.stunden[2]!, tipp: P('Das ist Cems gemessener Wert. Davon ist noch der Modellwert abzuziehen.', 'That is Cem\'s measured value. The model value still has to be subtracted.') }
      ],
      weg: (d, z) => [P(`Abweichung = gemessen − Modell = ${z(d.stunden[2]!)} − ${z(mittel(d.stunden))} = ${z(d.stunden[2]! - mittel(d.stunden))}`, `Deviation = measured − model = ${z(d.stunden[2]!)} − ${z(mittel(d.stunden))} = ${z(d.stunden[2]! - mittel(d.stunden))}`)] },
    { id: 'summe-abw', stellen: 0, toleranz: 0.01, soll: d => summe(d.stunden.map(v => v - mittel(d.stunden))),
      frage: P('Wie groß ist die Summe aller fünf Abweichungen, mit Vorzeichen addiert?', 'What is the sum of all five deviations, added with their signs?'),
      warum: P('Vom Mittelwert aus gleichen sich Plus und Minus immer genau aus. Die einfache Summe der Abweichungen taugt deshalb nicht als Maß für den Fehler: Sie ist immer 0, egal wie stark die Werte streuen.',
        'Measured from the mean, plus and minus always cancel exactly. The plain sum of the deviations is therefore useless as a measure of error: it is always 0, however strongly the values spread.'),
      tipp: P('Jede Abweichung ausrechnen (gemessen minus Mittelwert) und mit Vorzeichen addieren.', 'Work out each deviation (measured minus mean) and add them with their signs.'),
      fehler: [{ wert: d => summe(d.stunden.map(v => Math.abs(v - mittel(d.stunden)))), tipp: P('Das ist die Summe der Beträge, also ohne Vorzeichen. Hier zählen die Vorzeichen: Minus und Plus gleichen sich aus.', 'That is the sum of the sizes, so without signs. Here the signs count: minus and plus cancel.') }],
      weg: (d, z) => [
        P(`Abweichungen: ${d.stunden.map(v => plus(z, v - mittel(d.stunden))).join(', ')}`, `Deviations: ${d.stunden.map(v => plus(z, v - mittel(d.stunden))).join(', ')}`),
        P(`Summe: ${d.stunden.map(v => plus(z, v - mittel(d.stunden))).join(' ')} = ${z(summe(d.stunden.map(v => v - mittel(d.stunden))))}`, `Sum: ${d.stunden.map(v => plus(z, v - mittel(d.stunden))).join(' ')} = ${z(summe(d.stunden.map(v => v - mittel(d.stunden))))}`)
      ] },
    { id: 'quadratsumme', stellen: 0, toleranz: 0.01, soll: d => quadratsumme(d.stunden),
      frage: P('Wie groß ist die Quadratsumme: jede Abweichung quadrieren, dann alle Quadrate addieren?', 'What is the sum of squares: square each deviation, then add all the squares?'),
      warum: P('Quadrieren macht alle Abweichungen positiv und lässt große stärker zählen. Die Quadratsumme (SS) ist darum das Maß für den Gesamtfehler eines Modells: Je kleiner sie ist, desto besser passt es. Varianz, F-Wert und R² entstehen daraus.',
        'Squaring makes all deviations positive and lets large ones count more. The sum of squares (SS) is therefore the measure of the total error of a model: the smaller it is, the better the model fits. Variance, F value and R² are built from it.'),
      tipp: P('Erst jede Abweichung mit sich selbst malnehmen, dann die fünf Ergebnisse addieren.', 'First multiply each deviation by itself, then add the five results.'),
      fehler: [
        { wert: () => 0, tipp: P('Das ist die Summe der Abweichungen ohne Quadrieren. Erst jede Abweichung quadrieren, dann addieren.', 'That is the sum of the deviations without squaring. Square each deviation first, then add.') },
        { wert: d => summe(d.stunden.map(v => Math.abs(v - mittel(d.stunden)))), tipp: P('Das ist die Summe der Beträge. Hier wird jede Abweichung mit sich selbst malgenommen, nicht nur ihr Vorzeichen entfernt.', 'That is the sum of the sizes. Here each deviation is multiplied by itself, not just stripped of its sign.') },
        { wert: d => quadratsumme(d.stunden) / d.stunden.length, tipp: P('Das ist die Quadratsumme geteilt durch 5. Gefragt ist nur die Summe der Quadrate.', 'That is the sum of squares divided by 5. Only the sum of the squares is asked for.') }
      ],
      weg: (d, z) => [
        P(`Quadrate: ${d.stunden.map(v => z((v - mittel(d.stunden)) ** 2)).join(', ')}`, `Squares: ${d.stunden.map(v => z((v - mittel(d.stunden)) ** 2)).join(', ')}`),
        P(`Summe: ${d.stunden.map(v => z((v - mittel(d.stunden)) ** 2)).join(' + ')} = ${z(quadratsumme(d.stunden))}`, `Sum: ${d.stunden.map(v => z((v - mittel(d.stunden)) ** 2)).join(' + ')} = ${z(quadratsumme(d.stunden))}`)
      ] }
  ],
  merke: P('Ergebnis = Modell + Fehler. Der Mittelwert ist das einfachste Modell; die Abweichungen sind die Fehler; ihre Quadratsumme misst, wie schlecht das Modell passt. Bessere Modelle drücken diese Quadratsumme.', 'Outcome = model + error. The mean is the simplest model; the deviations are the errors; their sum of squares measures how badly the model fits. Better models push this sum of squares down.'),
  ausprobieren: P('Als Nächstes: Im Baustein „Modellwert“ lässt sich der Modellwert verschieben. Die Quadratsumme ist beim Mittelwert am kleinsten.', 'Next: in the "Model value" tool the model value can be moved. The sum of squares is smallest at the mean.')
});

// ---------------------------------------------------------------- 2. Freiheitsgrade
export const DATEN_FREI = { gewichte: [22, 25, 19, 14], mittel: 20, bekannt: 3 };
const FREI = bau({
  id: 'freiheitsgrade',
  daten: DATEN_FREI,
  lage: P('Vier Kinder einer Klasse wurden gewogen. Der Mittelwert der vier Gewichte ist bekannt: 20 kg. Von drei Kindern kennen wir das Gewicht, das vierte ist gesucht.',
    'Four children in a class were weighed. The mean of the four weights is known: 20 kg. We know the weight of three children; the fourth is to be found.'),
  tabelle: { titel: P('Gewichte in kg (Mittelwert aller vier: 20)', 'Weights in kg (mean of all four: 20)'), kopf: [P('Kind', 'Child'), P('Gewicht', 'Weight')], zeilen: [['1', 22], ['2', 25], ['3', 19], ['4', '?']] },
  schritte: [
    { id: 'letzter', stellen: 0, toleranz: 0.01, einheit: P('kg', 'kg'), soll: d => d.mittel * d.gewichte.length - summe(d.gewichte.slice(0, 3)),
      frage: P('Wie schwer ist das vierte Kind?', 'How heavy is the fourth child?'),
      warum: P('Der Mittelwert legt die Summe fest: vier Werte mit dem Mittelwert 20 müssen zusammen 4 mal 20 ergeben. Kennt man drei Werte, ist der vierte nicht mehr frei: Er steht schon fest.',
        'The mean fixes the sum: four values with the mean 20 must add up to 4 times 20. If three values are known, the fourth is no longer free: it is already determined.'),
      tipp: P('Die Summe aller vier Gewichte muss 4 mal 20 sein. Davon die drei bekannten abziehen.', 'The sum of all four weights must be 4 times 20. Subtract the three known ones.'),
      fehler: [
        { wert: d => d.mittel * d.gewichte.length, tipp: P('Das ist die Summe aller vier Gewichte. Davon sind noch die drei bekannten abzuziehen.', 'That is the sum of all four weights. The three known ones still have to be subtracted.') },
        { wert: d => summe(d.gewichte.slice(0, 3)), tipp: P('Das ist die Summe der drei bekannten Gewichte. Gesucht ist, was an der Gesamtsumme noch fehlt.', 'That is the sum of the three known weights. What is asked for is what is still missing from the total.') }
      ],
      weg: (d, z) => [
        P(`Gesamtsumme: 4 · ${z(d.mittel)} = ${z(d.mittel * 4)}`, `Total: 4 · ${z(d.mittel)} = ${z(d.mittel * 4)}`),
        P(`Bekannt: ${d.gewichte.slice(0, 3).join(' + ')} = ${z(summe(d.gewichte.slice(0, 3)))}`, `Known: ${d.gewichte.slice(0, 3).join(' + ')} = ${z(summe(d.gewichte.slice(0, 3)))}`),
        P(`Viertes Kind: ${z(d.mittel * 4)} − ${z(summe(d.gewichte.slice(0, 3)))} = ${z(d.gewichte[3]!)}`, `Fourth child: ${z(d.mittel * 4)} − ${z(summe(d.gewichte.slice(0, 3)))} = ${z(d.gewichte[3]!)}`)
      ] },
    { id: 'frei', stellen: 0, toleranz: 0.01, soll: d => d.bekannt,
      frage: P('Wie viele der vier Gewichte können frei gewählt werden, wenn der Mittelwert feststeht?', 'How many of the four weights can be chosen freely when the mean is fixed?'),
      warum: P('Das ist die Zahl der Freiheitsgrade: so viele Werte, wie noch frei variieren können. Mit einem festen Mittelwert sind es n − 1. Jede Zahl, die man aus den Daten schätzt (hier den Mittelwert), kostet einen Freiheitsgrad.',
        'This is the number of degrees of freedom: as many values as can still vary freely. With a fixed mean it is n − 1. Every number estimated from the data (here the mean) costs one degree of freedom.'),
      tipp: P('Drei Gewichte darf man wählen, das vierte steht dann fest. Wie viele sind frei?', 'Three weights may be chosen, then the fourth is fixed. How many are free?'),
      fehler: [{ wert: d => d.gewichte.length, tipp: P('Vier wären alle Werte. Aber das vierte ergibt sich aus dem Mittelwert, es ist nicht frei.', 'Four would be all values. But the fourth follows from the mean; it is not free.') }],
      weg: d => [P(`n = ${d.gewichte.length} Werte, ein Mittelwert festgelegt: ${d.gewichte.length} − 1 = ${d.bekannt} freie Werte`, `n = ${d.gewichte.length} values, one mean fixed: ${d.gewichte.length} − 1 = ${d.bekannt} free values`)] },
    { id: 'qs', stellen: 0, toleranz: 0.01, soll: d => quadratsumme(d.gewichte),
      frage: P('Wie groß ist die Quadratsumme der Abweichungen vom Mittelwert 20 (alle vier Gewichte)?', 'What is the sum of squared deviations from the mean 20 (all four weights)?'),
      warum: P('Die Quadratsumme misst die Streuung um den Mittelwert, wie in der letzten Aufgabe. Sie ist noch keine Varianz, denn sie wächst mit jedem weiteren Wert, auch bei gleicher Streuung.',
        'The sum of squares measures the spread around the mean, as in the last task. It is not yet a variance, because it grows with every further value, even at the same spread.'),
      tipp: P('Abweichung je Kind (Gewicht minus 20), quadrieren, addieren.', 'Deviation per child (weight minus 20), square, add.'),
      fehler: [{ wert: () => 0, tipp: P('Das ist die Summe der Abweichungen ohne Quadrieren. Erst quadrieren, dann addieren.', 'That is the sum of the deviations without squaring. Square first, then add.') }],
      weg: (d, z) => [
        P(`Abweichungen: ${d.gewichte.map(v => plus(z, v - d.mittel)).join(', ')}`, `Deviations: ${d.gewichte.map(v => plus(z, v - d.mittel)).join(', ')}`),
        P(`Quadrate: ${d.gewichte.map(v => z((v - d.mittel) ** 2)).join(' + ')} = ${z(quadratsumme(d.gewichte))}`, `Squares: ${d.gewichte.map(v => z((v - d.mittel) ** 2)).join(' + ')} = ${z(quadratsumme(d.gewichte))}`)
      ] },
    { id: 'varianz', stellen: 0, toleranz: 0.01, soll: d => quadratsumme(d.gewichte) / (d.gewichte.length - 1),
      frage: P('Wie groß ist die Varianz, wenn die Quadratsumme durch die Zahl der Freiheitsgrade geteilt wird?', 'What is the variance when the sum of squares is divided by the number of degrees of freedom?'),
      warum: P('Die Varianz ist eine mittlere Quadratabweichung. Geteilt wird durch die Freiheitsgrade, nicht durch n: Der Mittelwert stammt aus denselben Daten und liegt ihnen schon näher als der wahre Wert, die Abweichungen sind darum im Schnitt zu klein. n − 1 gleicht das aus.',
        'The variance is a mean squared deviation. It is divided by the degrees of freedom, not by n: the mean comes from the same data and is closer to them than the true value is, so the deviations are too small on average. n − 1 corrects for this.'),
      tipp: P('Quadratsumme geteilt durch 3 (die Freiheitsgrade).', 'Sum of squares divided by 3 (the degrees of freedom).'),
      fehler: [
        { wert: d => quadratsumme(d.gewichte) / d.gewichte.length, tipp: P('Das ist die Quadratsumme geteilt durch n = 4. Für die Varianz einer Stichprobe wird durch die Freiheitsgrade geteilt: n − 1 = 3.', 'That is the sum of squares divided by n = 4. For the variance of a sample one divides by the degrees of freedom: n − 1 = 3.') },
        { wert: d => quadratsumme(d.gewichte), tipp: P('Das ist die Quadratsumme selbst. Sie muss noch durch die Freiheitsgrade geteilt werden.', 'That is the sum of squares itself. It still has to be divided by the degrees of freedom.') }
      ],
      weg: (d, z) => [P(`Varianz = Quadratsumme : (n − 1) = ${z(quadratsumme(d.gewichte))} : ${d.gewichte.length - 1} = ${z(quadratsumme(d.gewichte) / (d.gewichte.length - 1))}`, `Variance = sum of squares : (n − 1) = ${z(quadratsumme(d.gewichte))} : ${d.gewichte.length - 1} = ${z(quadratsumme(d.gewichte) / (d.gewichte.length - 1))}`),
        P(`Zum Vergleich, durch n geteilt: ${z(quadratsumme(d.gewichte) / d.gewichte.length, 1)}`, `For comparison, divided by n: ${z(quadratsumme(d.gewichte) / d.gewichte.length, 1)}`)] }
  ],
  merke: P('Freiheitsgrade zählen, wie viele Werte noch frei sind, nachdem man aus den Daten etwas geschätzt hat. Quadratsumme geteilt durch Freiheitsgrade ergibt die Varianz. Dieselbe Idee steckt in t, F und χ².', 'Degrees of freedom count how many values are still free after something has been estimated from the data. Sum of squares divided by degrees of freedom gives the variance. The same idea sits in t, F and χ².'),
  ausprobieren: P('Als Nächstes: Im Rechner „Verteilungen berechnen“ lässt sich die t-Verteilung mit wenigen oder vielen Freiheitsgraden ansehen.', 'Next: in the calculator "Calculate distributions" the t distribution can be viewed with few or many degrees of freedom.')
});

// ---------------------------------------------------------------- 3. Signal und Rauschen
export const DATEN_SIGNAL = { a: { n: 10, m: 14, s: 5 }, b: { n: 10, m: 10, s: 3 } };
type GruppeKennzahlen = { n: number; m: number; s: number };
const seDiff = (a: GruppeKennzahlen, b: GruppeKennzahlen) => Math.sqrt(a.s ** 2 / a.n + b.s ** 2 / b.n);
const tWert = (a: GruppeKennzahlen, b: GruppeKennzahlen) => (a.m - b.m) / seDiff(a, b);
const SIGNAL = bau({
  id: 'signal-rauschen',
  daten: DATEN_SIGNAL,
  lage: P('Zwei Übungsgruppen schreiben denselben Test (Punkte). Gruppe A übt vorher mit Lernkarten, Gruppe B nicht. Von beiden Gruppen sind nur die Kennzahlen bekannt. Gefragt ist: Wie deutlich hebt sich der Unterschied vom Zufall ab?',
    'Two practice groups write the same test (points). Group A practises beforehand with flash cards, group B does not. Only the summary numbers of both groups are known. The question: how clearly does the difference stand out from chance?'),
  tabelle: { titel: P('Kennzahlen der beiden Gruppen', 'Summary numbers of the two groups'), kopf: [P('Gruppe', 'Group'), P('Personen (n)', 'People (n)'), P('Mittelwert', 'Mean'), P('Standardabweichung', 'Standard deviation')],
    zeilen: [[P('A (mit Lernkarten)', 'A (with flash cards)'), 10, 14, 5], [P('B (ohne)', 'B (without)'), 10, 10, 3]] },
  schritte: [
    { id: 'effekt', stellen: 0, toleranz: 0.01, einheit: P('Punkte', 'points'), soll: d => d.a.m - d.b.m,
      frage: P('Wie groß ist der Effekt, also der Unterschied der Mittelwerte (A minus B)?', 'How large is the effect, that is the difference of the means (A minus B)?'),
      warum: P('Der Effekt ist das Signal: das, was die Gruppen trennt. Für sich allein sagt er wenig, denn 4 Punkte sind bei kleiner Streuung viel und bei großer Streuung wenig.', 'The effect is the signal: what separates the groups. On its own it says little, because 4 points are a lot when the spread is small and little when the spread is large.'),
      tipp: P('Mittelwert von A minus Mittelwert von B.', 'Mean of A minus mean of B.'),
      fehler: [{ wert: d => d.a.m + d.b.m, tipp: P('Das ist die Summe der Mittelwerte. Für den Unterschied werden sie voneinander abgezogen.', 'That is the sum of the means. For the difference they are subtracted from each other.') }],
      weg: (d, z) => [P(`Effekt = ${z(d.a.m)} − ${z(d.b.m)} = ${z(d.a.m - d.b.m)}`, `Effect = ${z(d.a.m)} − ${z(d.b.m)} = ${z(d.a.m - d.b.m)}`)] },
    { id: 'se', stellen: 2, toleranz: 0.005, soll: d => seDiff(d.a, d.b),
      frage: P('Wie groß ist der Standardfehler des Unterschieds? Er ist die Wurzel aus (s² von A geteilt durch n von A, plus s² von B geteilt durch n von B).', 'How large is the standard error of the difference? It is the square root of (s² of A divided by n of A, plus s² of B divided by n of B).'),
      warum: P('Der Standardfehler ist das Rauschen: wie stark ein Unterschied von Mittelwerten allein durch Zufall schwankt. Er wird kleiner, wenn die Streuung kleiner oder die Gruppen größer sind. Streuungen lassen sich nur als Quadrate (Varianzen) addieren, danach folgt die Wurzel.',
        'The standard error is the noise: how strongly a difference of means varies by chance alone. It gets smaller when the spread is smaller or the groups are larger. Spreads can only be added as squares (variances); the root comes afterwards.'),
      tipp: P('Erst die beiden Brüche s² : n ausrechnen (25 : 10 und 9 : 10), addieren, dann die Wurzel ziehen.', 'First work out the two fractions s² : n (25 : 10 and 9 : 10), add them, then take the square root.'),
      fehler: [
        { wert: d => d.a.s ** 2 / d.a.n + d.b.s ** 2 / d.b.n, tipp: P('Das ist die Summe der beiden Brüche. Es fehlt noch die Wurzel.', 'That is the sum of the two fractions. The square root is still missing.') },
        { wert: d => (d.a.s + d.b.s) / Math.sqrt(d.a.n), tipp: P('Streuungen dürfen nicht einfach addiert werden. Erst quadrieren (s²), durch n teilen, dann addieren und die Wurzel ziehen.', 'Spreads must not simply be added. Square first (s²), divide by n, then add and take the root.') }
      ],
      weg: (d, z) => [
        P(`s² : n für A: ${z(d.a.s ** 2)} : ${d.a.n} = ${z(d.a.s ** 2 / d.a.n, 2)}; für B: ${z(d.b.s ** 2)} : ${d.b.n} = ${z(d.b.s ** 2 / d.b.n, 2)}`, `s² : n for A: ${z(d.a.s ** 2)} : ${d.a.n} = ${z(d.a.s ** 2 / d.a.n, 2)}; for B: ${z(d.b.s ** 2)} : ${d.b.n} = ${z(d.b.s ** 2 / d.b.n, 2)}`),
        P(`Summe: ${z(d.a.s ** 2 / d.a.n + d.b.s ** 2 / d.b.n, 2)}`, `Sum: ${z(d.a.s ** 2 / d.a.n + d.b.s ** 2 / d.b.n, 2)}`),
        P(`Standardfehler = Wurzel aus ${z(d.a.s ** 2 / d.a.n + d.b.s ** 2 / d.b.n, 2)} = ${z(seDiff(d.a, d.b), 2)}`, `Standard error = square root of ${z(d.a.s ** 2 / d.a.n + d.b.s ** 2 / d.b.n, 2)} = ${z(seDiff(d.a, d.b), 2)}`)
      ] },
    { id: 't', stellen: 2, toleranz: 0.005, soll: d => tWert(d.a, d.b),
      frage: P('Wie groß ist t? Rechnen: Effekt geteilt durch Standardfehler.', 'How large is t? Calculate: effect divided by standard error.'),
      warum: P('t ist das Verhältnis von Signal zu Rauschen: wie viele Standardfehler der Unterschied groß ist. Dieselbe Bauart haben F (Varianz durch Modell geteilt durch Restvarianz) und χ² (Abweichung der Zählungen geteilt durch den erwarteten Wert). Je größer die Prüfgröße, desto weniger passt „nur Zufall“.',
        't is the ratio of signal to noise: how many standard errors large the difference is. F (variance explained by the model divided by residual variance) and χ² (deviation of the counts divided by the expected value) have the same shape. The larger the test statistic, the less "chance alone" fits.'),
      tipp: P('4 geteilt durch den Standardfehler aus dem letzten Schritt.', '4 divided by the standard error from the last step.'),
      fehler: [
        { wert: d => d.a.m - d.b.m, tipp: P('Das ist nur der Effekt, das Signal. Es muss noch durch den Standardfehler (das Rauschen) geteilt werden.', 'That is only the effect, the signal. It still has to be divided by the standard error (the noise).') },
        { wert: d => (d.a.m - d.b.m) / seDiff(d.a, d.b) ** 2, tipp: P('Hier wurde durch die Summe der Brüche geteilt. Gebraucht wird der Standardfehler, also die Wurzel daraus.', 'Here the sum of the fractions was used. The standard error is needed, which is the root of it.') }
      ],
      weg: (d, z) => [P(`t = ${z(d.a.m - d.b.m)} : ${z(seDiff(d.a, d.b), 2)} = ${z(tWert(d.a, d.b), 2)}`, `t = ${z(d.a.m - d.b.m)} : ${z(seDiff(d.a, d.b), 2)} = ${z(tWert(d.a, d.b), 2)}`)] },
    { id: 't-mehr', stellen: 2, toleranz: 0.005, soll: d => tWert({ ...d.a, n: 40 }, { ...d.b, n: 40 }),
      frage: P('Mittelwerte und Standardabweichungen bleiben gleich, aber jede Gruppe hätte 40 statt 10 Personen. Wie groß wäre t dann?', 'Means and standard deviations stay the same, but each group had 40 instead of 10 people. How large would t be then?'),
      warum: P('Mehr Personen machen das Rauschen kleiner, der Effekt bleibt. Weil n unter der Wurzel steht, hilft das nur langsam: Viermal so viele Personen verdoppeln t.', 'More people make the noise smaller, the effect stays. Because n sits under the root, this helps only slowly: four times as many people double t.'),
      tipp: P('Den Standardfehler mit n = 40 neu ausrechnen, dann wieder 4 geteilt durch den Standardfehler.', 'Work out the standard error again with n = 40, then again 4 divided by the standard error.'),
      fehler: [
        { wert: d => 4 * tWert(d.a, d.b), tipp: P('Das wäre t mal 4. Aber n steht unter der Wurzel: Viermal so viele Personen verdoppeln t nur.', 'That would be t times 4. But n sits under the root: four times as many people only double t.') },
        { wert: d => tWert(d.a, d.b), tipp: P('Das ist das alte t mit 10 Personen. Mit 40 Personen ändert sich der Standardfehler.', 'That is the old t with 10 people. With 40 people the standard error changes.') }
      ],
      weg: (d, z) => [
        P(`Standardfehler mit n = 40: Wurzel aus (${z(d.a.s ** 2)} : 40 + ${z(d.b.s ** 2)} : 40) = ${z(seDiff({ ...d.a, n: 40 }, { ...d.b, n: 40 }), 2)}`, `Standard error with n = 40: square root of (${z(d.a.s ** 2)} : 40 + ${z(d.b.s ** 2)} : 40) = ${z(seDiff({ ...d.a, n: 40 }, { ...d.b, n: 40 }), 2)}`),
        P(`t = ${z(d.a.m - d.b.m)} : ${z(seDiff({ ...d.a, n: 40 }, { ...d.b, n: 40 }), 2)} = ${z(tWert({ ...d.a, n: 40 }, { ...d.b, n: 40 }), 2)}`, `t = ${z(d.a.m - d.b.m)} : ${z(seDiff({ ...d.a, n: 40 }, { ...d.b, n: 40 }), 2)} = ${z(tWert({ ...d.a, n: 40 }, { ...d.b, n: 40 }), 2)}`)
      ] }
  ],
  merke: P('Prüfgröße = Effekt geteilt durch Fehler. t, F und χ² sind dieselbe Idee in verschiedenen Formen. Ein großer Effekt allein beweist nichts; entscheidend ist, wie groß er im Vergleich zum Rauschen ist.', 'Test statistic = effect divided by error. t, F and χ² are the same idea in different forms. A large effect alone proves nothing; what counts is how large it is compared with the noise.'),
  ausprobieren: P('Als Nächstes: Im Rechner „Gruppen aus Kennzahlen vergleichen“ lassen sich dieselben Zahlen eingeben; das t muss dasselbe sein.', 'Next: in the calculator "Compare groups from summary numbers" the same numbers can be entered; the t must be the same.')
});

// ---------------------------------------------------------------- 4. Gruppenvergleich ist Regression
export const DATEN_GRUPPEN = { gruppe: [0, 0, 0, 1, 1, 1], punkte: [4, 6, 8, 8, 10, 15] };
const mitGruppe = (d: typeof DATEN_GRUPPEN, g: number) => d.punkte.filter((_, i) => d.gruppe[i] === g);
const GRUPPEN = bau({
  id: 'gruppen-regression',
  daten: DATEN_GRUPPEN,
  lage: P('Sechs Personen schreiben einen Test. Drei haben vorher nicht geübt (Gruppe 0, die Referenzgruppe), drei haben mit Lernkarten geübt (Gruppe 1). Die Gruppe ist als 0/1-Spalte angelegt. Das Regressionsmodell lautet: Punkte = b₀ + b₁ · Gruppe + Fehler.',
    'Six people write a test. Three did not practise beforehand (group 0, the reference group), three practised with flash cards (group 1). The group is entered as a 0/1 column. The regression model is: points = b₀ + b₁ · group + error.'),
  tabelle: { titel: P('Punkte im Test', 'Test points'), kopf: [P('Person', 'Person'), P('Gruppe (0 = ohne, 1 = mit Lernkarten)', 'Group (0 = without, 1 = with flash cards)'), P('Punkte', 'Points')],
    zeilen: DATEN_GRUPPEN.punkte.map((p, i) => [`${i + 1}`, DATEN_GRUPPEN.gruppe[i]!, p]) },
  schritte: [
    { id: 'b0', stellen: 0, toleranz: 0.01, einheit: P('Punkte', 'points'), soll: d => mittel(mitGruppe(d, 0)),
      frage: P('Wie groß ist b₀, die Konstante des Modells? Sie ist der vorhergesagte Wert für Gruppe 0 (Gruppe = 0 setzt b₁ · Gruppe auf null).', 'How large is b₀, the constant of the model? It is the predicted value for group 0 (group = 0 sets b₁ · group to zero).'),
      warum: P('Für alle mit Gruppe = 0 bleibt vom Modell nur b₀ übrig. Das beste Modell sagt für sie den Mittelwert ihrer Gruppe voraus. Also ist b₀ der Mittelwert der Referenzgruppe.', 'For everyone with group = 0 only b₀ is left of the model. The best model predicts the mean of their group for them. So b₀ is the mean of the reference group.'),
      tipp: P('Nur die drei Personen mit Gruppe 0 zählen: ihren Mittelwert bilden.', 'Count only the three people with group 0: take their mean.'),
      fehler: [{ wert: d => mittel(d.punkte), tipp: P('Das ist der Mittelwert aller sechs Personen. b₀ gehört nur zur Referenzgruppe (Gruppe = 0).', 'That is the mean of all six people. b₀ belongs only to the reference group (group = 0).') }],
      weg: (d, z) => [P(`Gruppe 0: ${mitGruppe(d, 0).join(', ')}. Mittelwert: ${z(summe(mitGruppe(d, 0)))} : 3 = ${z(mittel(mitGruppe(d, 0)))}`, `Group 0: ${mitGruppe(d, 0).join(', ')}. Mean: ${z(summe(mitGruppe(d, 0)))} : 3 = ${z(mittel(mitGruppe(d, 0)))}`)] },
    { id: 'b1', stellen: 0, toleranz: 0.01, einheit: P('Punkte', 'points'), soll: d => mittel(mitGruppe(d, 1)) - mittel(mitGruppe(d, 0)),
      frage: P('Wie groß ist b₁, die Steigung? Bei Gruppe = 1 sagt das Modell b₀ + b₁ voraus; das muss der Mittelwert von Gruppe 1 sein.', 'How large is b₁, the slope? For group = 1 the model predicts b₀ + b₁; this must be the mean of group 1.'),
      warum: P('Die Gruppe ändert sich von 0 auf 1, das ist ein Schritt der Größe 1. Die Steigung sagt, um wie viel sich die Vorhersage dabei ändert: vom Mittelwert der Referenzgruppe zum Mittelwert der anderen. b₁ ist die Differenz der Gruppenmittelwerte.',
        'The group changes from 0 to 1, a step of size 1. The slope says by how much the prediction changes: from the mean of the reference group to the mean of the other. b₁ is the difference of the group means.'),
      tipp: P('Mittelwert von Gruppe 1 minus b₀.', 'Mean of group 1 minus b₀.'),
      fehler: [
        { wert: d => mittel(mitGruppe(d, 1)), tipp: P('Das ist der Mittelwert von Gruppe 1, also b₀ + b₁. Davon ist noch b₀ abzuziehen.', 'That is the mean of group 1, so b₀ + b₁. b₀ still has to be subtracted.') },
        { wert: d => mittel(mitGruppe(d, 0)) - mittel(mitGruppe(d, 1)), tipp: P('Das Vorzeichen ist vertauscht. b₁ ist Gruppe 1 minus Referenzgruppe.', 'The sign is swapped. b₁ is group 1 minus reference group.') }
      ],
      weg: (d, z) => [P(`Gruppe 1: ${mitGruppe(d, 1).join(', ')}. Mittelwert: ${z(mittel(mitGruppe(d, 1)))}`, `Group 1: ${mitGruppe(d, 1).join(', ')}. Mean: ${z(mittel(mitGruppe(d, 1)))}`),
        P(`b₁ = ${z(mittel(mitGruppe(d, 1)))} − ${z(mittel(mitGruppe(d, 0)))} = ${z(mittel(mitGruppe(d, 1)) - mittel(mitGruppe(d, 0)))}`, `b₁ = ${z(mittel(mitGruppe(d, 1)))} − ${z(mittel(mitGruppe(d, 0)))} = ${z(mittel(mitGruppe(d, 1)) - mittel(mitGruppe(d, 0)))}`)] },
    { id: 'vorher', stellen: 0, toleranz: 0.01, einheit: P('Punkte', 'points'), soll: d => mittel(mitGruppe(d, 0)) + (mittel(mitGruppe(d, 1)) - mittel(mitGruppe(d, 0))),
      frage: P('Wie viele Punkte sagt das Modell für Person 6 voraus (Gruppe = 1)? Rechnen: b₀ + b₁ · 1.', 'How many points does the model predict for person 6 (group = 1)? Calculate: b₀ + b₁ · 1.'),
      warum: P('Das Modell setzt die Gruppe ein und rechnet. Dasselbe tut jede Regression, auch mit mehr Größen. Hier kommt der Mittelwert von Gruppe 1 heraus: Das Modell ist ein Gruppenvergleich in anderer Schreibweise.', 'The model plugs in the group and calculates. Every regression does the same, also with more variables. Here the mean of group 1 comes out: the model is a group comparison written differently.'),
      tipp: P('Die Konstante und die Steigung addieren.', 'Add the constant and the slope.'),
      fehler: [{ wert: d => mittel(mitGruppe(d, 0)), tipp: P('Das ist b₀, der Wert für Gruppe 0. Für Gruppe 1 kommt b₁ dazu.', 'That is b₀, the value for group 0. For group 1, b₁ is added.') }],
      weg: (d, z) => [P(`Vorhersage = b₀ + b₁ · 1 = ${z(mittel(mitGruppe(d, 0)))} + ${z(mittel(mitGruppe(d, 1)) - mittel(mitGruppe(d, 0)))} = ${z(mittel(mitGruppe(d, 1)))}`, `Prediction = b₀ + b₁ · 1 = ${z(mittel(mitGruppe(d, 0)))} + ${z(mittel(mitGruppe(d, 1)) - mittel(mitGruppe(d, 0)))} = ${z(mittel(mitGruppe(d, 1)))}`)] },
    { id: 'rest', stellen: 0, toleranz: 0.01, einheit: P('Punkte', 'points'), soll: d => d.punkte[5]! - mittel(mitGruppe(d, 1)),
      frage: P('Wie groß ist der Rest von Person 6 (15 Punkte): gemessen minus vorhergesagt?', 'How large is the residual of person 6 (15 points): measured minus predicted?'),
      warum: P('Der Rest ist wieder Ergebnis minus Modell, wie bei jedem Modell. Die Quadratsumme aller sechs Reste ist der Fehler des Modells. Der t-Test für zwei Gruppen und der t-Test für b₁ in dieser Regression rechnen mit denselben Resten und liefern dasselbe t.',
        'The residual is again outcome minus model, as with every model. The sum of squares of all six residuals is the error of the model. The t test for two groups and the t test for b₁ in this regression work with the same residuals and give the same t.'),
      tipp: P('15 minus die Vorhersage für Person 6.', '15 minus the prediction for person 6.'),
      fehler: [{ wert: d => mittel(mitGruppe(d, 1)) - d.punkte[5]!, tipp: P('Das Vorzeichen ist vertauscht. Der Rest ist gemessen minus vorhergesagt.', 'The sign is swapped. The residual is measured minus predicted.') },
        { wert: d => d.punkte[5]! - mittel(d.punkte), tipp: P('Hier wurde vom Gesamtmittelwert abgezogen. Das Modell sagt für Gruppe 1 den Mittelwert von Gruppe 1 voraus.', 'Here the overall mean was subtracted. The model predicts the mean of group 1 for group 1.') }],
      weg: (d, z) => [P(`Rest = ${z(d.punkte[5]!)} − ${z(mittel(mitGruppe(d, 1)))} = ${z(d.punkte[5]! - mittel(mitGruppe(d, 1)))}`, `Residual = ${z(d.punkte[5]!)} − ${z(mittel(mitGruppe(d, 1)))} = ${z(d.punkte[5]! - mittel(mitGruppe(d, 1)))}`)] }
  ],
  merke: P('Ein t-Test für zwei Gruppen ist eine Regression mit einer 0/1-Spalte: b₀ ist der Mittelwert der Referenzgruppe, b₁ der Unterschied der Mittelwerte. Die Regression erweitert den Test: weitere Größen lassen sich einfach ins Modell nehmen.',
    'A t test for two groups is a regression with a 0/1 column: b₀ is the mean of the reference group, b₁ the difference of the means. Regression extends the test: further variables can simply be put into the model.'),
  ausprobieren: P('Als Nächstes: Dasselbe Beispiel (Autos, Automatik und Handschaltung) wird einmal als Gruppenvergleich und einmal als Regression geöffnet. Die Konstante und das B der Getriebe-Zeile entsprechen den beiden Mittelwerten und ihrer Differenz.',
    'Next: the same example (cars, automatic and manual) is opened once as a group comparison and once as a regression. The constant and the B of the transmission row correspond to the two means and their difference.')
});

// ---------------------------------------------------------------- 5. Annahmen: Reste aus einer Geraden
export const DATEN_RESTE = { a: 1, b: 2, x: [1, 2, 3, 4, 5], y: [5, 4, 5, 8, 13] };
const vorher = (d: typeof DATEN_RESTE, x: number) => d.a + d.b * x;
const reste = (d: typeof DATEN_RESTE) => d.x.map((x, i) => d.y[i]! - vorher(d, x));
const RESTE = bau({
  id: 'annahmen-reste',
  daten: DATEN_RESTE,
  lage: P('Fünf Personen haben je eine Zahl x (Stunden Vorbereitung) und ein Ergebnis y (Punkte). Eine Regression hat die Gerade ŷ = 1 + 2 · x ergeben. Ob man ihr trauen kann, zeigt sich an den Resten, nicht an den Rohdaten.',
    'Five people each have a number x (hours of preparation) and an outcome y (points). A regression gave the line ŷ = 1 + 2 · x. Whether the line can be trusted shows in the residuals, not in the raw data.'),
  tabelle: { titel: P('Stunden und Punkte', 'Hours and points'), kopf: [P('Person', 'Person'), P('x (Stunden)', 'x (hours)'), P('y (Punkte)', 'y (points)')], zeilen: DATEN_RESTE.x.map((x, i) => [`${i + 1}`, x, DATEN_RESTE.y[i]!]) },
  schritte: [
    { id: 'vorher', stellen: 0, toleranz: 0.01, einheit: P('Punkte', 'points'), soll: d => vorher(d, 2),
      frage: P('Welchen Wert ŷ sagt die Gerade für x = 2 voraus?', 'Which value ŷ does the line predict for x = 2?'),
      warum: P('Zu jeder Person gehört ein Punkt auf der Geraden: der vorhergesagte Wert. Der Rest ist der Abstand zwischen diesem Punkt und dem gemessenen Wert.', 'Each person has a point on the line: the predicted value. The residual is the distance between this point and the measured value.'),
      tipp: P('In ŷ = 1 + 2 · x für x die Zahl 2 einsetzen.', 'In ŷ = 1 + 2 · x put the number 2 for x.'),
      fehler: [{ wert: d => d.y[1]!, tipp: P('Das ist der gemessene Wert von Person 2. Gefragt ist der Wert, den die Gerade vorhersagt.', 'That is the measured value of person 2. What is asked for is the value the line predicts.') }],
      weg: (d, z) => [P(`ŷ = ${z(d.a)} + ${z(d.b)} · 2 = ${z(vorher(d, 2))}`, `ŷ = ${z(d.a)} + ${z(d.b)} · 2 = ${z(vorher(d, 2))}`)] },
    { id: 'rest2', stellen: 0, toleranz: 0.01, soll: d => reste(d)[1]!,
      frage: P('Wie groß ist der Rest von Person 2 (y = 4)? Gemessen minus vorhergesagt.', 'How large is the residual of person 2 (y = 4)? Measured minus predicted.'),
      warum: P('Der Rest ist der Teil von y, den die Gerade nicht erklärt. Ein negativer Rest heißt: Die Person liegt unter der Geraden.', 'The residual is the part of y the line does not explain. A negative residual means: the person lies below the line.'),
      tipp: P('4 minus den vorhergesagten Wert aus dem letzten Schritt.', '4 minus the predicted value from the last step.'),
      fehler: [{ wert: d => -reste(d)[1]!, tipp: P('Das Vorzeichen ist vertauscht. Person 2 liegt unter der Geraden, ihr Rest ist negativ.', 'The sign is swapped. Person 2 lies below the line, her residual is negative.') }],
      weg: (d, z) => [P(`Rest = ${z(d.y[1]!)} − ${z(vorher(d, 2))} = ${z(reste(d)[1]!)}`, `Residual = ${z(d.y[1]!)} − ${z(vorher(d, 2))} = ${z(reste(d)[1]!)}`)] },
    { id: 'rest5', stellen: 0, toleranz: 0.01, soll: d => reste(d)[4]!,
      frage: P('Wie groß ist der Rest von Person 5 (x = 5, y = 13)?', 'How large is the residual of person 5 (x = 5, y = 13)?'),
      warum: P('Dieselbe Rechnung noch einmal, hier mit einem positiven Rest: Die Person liegt über der Geraden.', 'The same calculation once more, here with a positive residual: the person lies above the line.'),
      tipp: P('Erst ŷ für x = 5 ausrechnen, dann 13 minus ŷ.', 'First work out ŷ for x = 5, then 13 minus ŷ.'),
      fehler: [{ wert: d => -reste(d)[4]!, tipp: P('Das Vorzeichen ist vertauscht. Person 5 liegt über der Geraden, ihr Rest ist positiv.', 'The sign is swapped. Person 5 lies above the line, her residual is positive.') }],
      weg: (d, z) => [P(`ŷ = ${z(d.a)} + ${z(d.b)} · 5 = ${z(vorher(d, 5))}; Rest = ${z(d.y[4]!)} − ${z(vorher(d, 5))} = ${z(reste(d)[4]!)}`, `ŷ = ${z(d.a)} + ${z(d.b)} · 5 = ${z(vorher(d, 5))}; residual = ${z(d.y[4]!)} − ${z(vorher(d, 5))} = ${z(reste(d)[4]!)}`)] },
    { id: 'positiv', stellen: 0, toleranz: 0.01, soll: d => reste(d).filter(r => r > 0).length,
      frage: P('Wie viele der fünf Reste sind positiv? Dazu alle fünf Reste berechnen und auf ihre Reihenfolge von links nach rechts achten.', 'How many of the five residuals are positive? Work out all five residuals and look at their order from left to right.'),
      warum: P('Bei einer passenden Geraden streuen die Reste ohne erkennbares Muster um 0, einmal oben, einmal unten. Liegen sie links und rechts oben und in der Mitte unten, ist der Zusammenhang gebogen: Die Annahme der Linearität ist verletzt, und kein p-Wert und kein Intervall des Modells ist dann verlässlich.',
        'With a suitable line the residuals scatter around 0 with no visible pattern, sometimes above, sometimes below. If they lie above at the left and right and below in the middle, the relationship is curved: the assumption of linearity is violated, and no p value or interval of the model can then be trusted.'),
      tipp: P('Alle fünf Reste: gemessen minus (1 + 2 · x). Dann zählen, wie viele größer als null sind.', 'All five residuals: measured minus (1 + 2 · x). Then count how many are greater than zero.'),
      fehler: [{ wert: d => reste(d).filter(r => r < 0).length, tipp: P('Das ist die Zahl der negativen Reste. Gefragt sind die positiven.', 'That is the number of negative residuals. The positive ones are asked for.') }],
      weg: (d, z) => [
        P(`Reste von Person 1 bis 5: ${reste(d).map(r => plus(z, r)).join(', ')}`, `Residuals of persons 1 to 5: ${reste(d).map(r => plus(z, r)).join(', ')}`),
        P(`Positiv sind ${reste(d).filter(r => r > 0).length} Reste. Muster von links nach rechts (+ oben, − unten): ${reste(d).map(r => (r > 0 ? '+' : '−')).join(', ')}. Das ist ein Bogen: Die Gerade passt hier nicht.`, `${reste(d).filter(r => r > 0).length} residuals are positive. Pattern from left to right (+ above, − below): ${reste(d).map(r => (r > 0 ? '+' : '−')).join(', ')}. That is a curve: the line does not suit here.`)
      ] }
  ],
  merke: P('Die Reste verraten, ob die Annahmen tragen: ohne Muster ist gut, ein Bogen heißt falsche Form, ein Trichter heißt ungleiche Streuung. Die Normalverteilung betrifft die Reste, nicht die Rohdaten.', 'The residuals reveal whether the assumptions hold: no pattern is good, a curve means the wrong form, a funnel means unequal spread. The normal distribution concerns the residuals, not the raw data.'),
  ausprobieren: P('Als Nächstes: Im Rechner „Gerade zum Anfassen“ lassen sich Punktwolken mit Bogen, Ausreißern und Gruppen ansehen.', 'Next: in the "A line to play with" tool, scatter plots with a curve, outliers and groups can be viewed.')
});

// ---------------------------------------------------------------- 6. Diagramme ehrlich: abgeschnittene Achse
export const DATEN_ACHSE = { a: 80, b: 90, start: 70 };
const ACHSE = bau({
  id: 'achse-prozent',
  daten: DATEN_ACHSE,
  lage: P('In einer Umfrage sind 80 % der Studierenden mit Mensa A zufrieden und 90 % mit Mensa B. Ein Säulendiagramm zeigt beide Säulen, aber die senkrechte Achse beginnt nicht bei 0, sondern bei 70 %. Wie sehr täuscht das Bild?',
    'In a survey 80% of students are satisfied with canteen A and 90% with canteen B. A column chart shows both columns, but the vertical axis does not start at 0 but at 70%. How much does the picture mislead?'),
  tabelle: { titel: P('Zufriedenheit mit der Mensa', 'Satisfaction with the canteen'), kopf: [P('Mensa', 'Canteen'), P('Zufrieden (%)', 'Satisfied (%)'), P('Achse beginnt bei (%)', 'Axis starts at (%)')], zeilen: [['A', 80, 70], ['B', 90, 70]] },
  schritte: [
    { id: 'echt', stellen: 1, toleranz: 0.05, einheit: P('%', '%'), soll: d => ((d.b - d.a) / d.a) * 100,
      frage: P('Um wie viel Prozent liegt der Wert von B über dem von A? Der Ausgangswert ist A.', 'By how many percent is the value of B above that of A? The starting value is A.'),
      warum: P('Prozent beziehen sich auf den Ausgangswert, mit dem man vergleicht. Wer wissen will, wie viel größer B ist, teilt den Unterschied durch A.', 'Percent refer to the starting value one compares with. To know how much larger B is, divide the difference by A.'),
      tipp: P('Unterschied (B minus A), geteilt durch A, mal 100.', 'Difference (B minus A), divided by A, times 100.'),
      fehler: [
        { wert: d => ((d.b - d.a) / d.b) * 100, tipp: P('Hier wurde durch B geteilt. Der Vergleich geht von A aus: Der Unterschied wird durch A geteilt.', 'Here B was used as the divisor. The comparison starts from A: the difference is divided by A.') },
        { wert: d => d.b - d.a, tipp: P('Das sind 10 Prozentpunkte, der Unterschied der beiden Prozentwerte. Gefragt ist, wie viel Prozent das, vom Wert von A aus gesehen, sind.', 'That is 10 percentage points, the difference of the two percentages. What is asked is how many percent that is, seen from the value of A.') }
      ],
      weg: (d, z) => [P(`(${z(d.b)} − ${z(d.a)}) : ${z(d.a)} · 100 = ${z(d.b - d.a)} : ${z(d.a)} · 100 = ${z(((d.b - d.a) / d.a) * 100, 1)} %`, `(${z(d.b)} − ${z(d.a)}) : ${z(d.a)} · 100 = ${z(d.b - d.a)} : ${z(d.a)} · 100 = ${z(((d.b - d.a) / d.a) * 100, 1)}%`)] },
    { id: 'hoehe-a', stellen: 0, toleranz: 0.01, einheit: P('Prozentpunkte', 'percentage points'), soll: d => d.a - d.start,
      frage: P('Wie hoch ragt die Säule A im Bild, wenn die Achse bei 70 beginnt? Gemessen wird ab der Achse.', 'How high does column A stand in the picture when the axis starts at 70? It is measured from the axis.'),
      warum: P('Das Auge vergleicht die Höhen der Säulen im Bild, nicht die Zahlen darunter. Sichtbar ist nur der Teil über dem Achsenbeginn.', 'The eye compares the heights of the columns in the picture, not the numbers below. Only the part above the start of the axis is visible.'),
      tipp: P('Wert von A minus Achsenbeginn.', 'Value of A minus start of the axis.'),
      fehler: [{ wert: d => d.a, tipp: P('Das wäre die Höhe bei einer Achse ab 0. Hier beginnt die Achse bei 70, davon ist abzuziehen.', 'That would be the height with an axis from 0. Here the axis starts at 70; subtract it.') }],
      weg: (d, z) => [P(`Säule A: ${z(d.a)} − ${z(d.start)} = ${z(d.a - d.start)}`, `Column A: ${z(d.a)} − ${z(d.start)} = ${z(d.a - d.start)}`)] },
    { id: 'hoehe-b', stellen: 0, toleranz: 0.01, einheit: P('Prozentpunkte', 'percentage points'), soll: d => d.b - d.start,
      frage: P('Wie hoch ragt die Säule B im Bild?', 'How high does column B stand in the picture?'),
      warum: P('Dieselbe Rechnung für die zweite Säule. Die Höhen im Bild sind 10 und 20, während die Zahlen 80 und 90 sind.', 'The same calculation for the second column. The heights in the picture are 10 and 20, while the numbers are 80 and 90.'),
      tipp: P('Wert von B minus Achsenbeginn.', 'Value of B minus start of the axis.'),
      fehler: [{ wert: d => d.b, tipp: P('Das wäre die Höhe bei einer Achse ab 0. Der Achsenbeginn 70 ist abzuziehen.', 'That would be the height with an axis from 0. Subtract the axis start 70.') }],
      weg: (d, z) => [P(`Säule B: ${z(d.b)} − ${z(d.start)} = ${z(d.b - d.start)}`, `Column B: ${z(d.b)} − ${z(d.start)} = ${z(d.b - d.start)}`)] },
    { id: 'bild', stellen: 0, toleranz: 0.05, einheit: P('%', '%'), soll: d => (((d.b - d.start) - (d.a - d.start)) / (d.a - d.start)) * 100,
      frage: P('Um wie viel Prozent ist die Säule B im Bild höher als die Säule A?', 'By how many percent is column B higher than column A in the picture?'),
      warum: P('So groß wirkt der Unterschied auf das Auge. Der Vergleich von echtem und scheinbarem Unterschied ist der Übertreibungsfaktor: Die abgeschnittene Achse macht aus dem echten Unterschied einen vielfach größeren. Säulen vergleichen Längen, darum müssen sie bei 0 beginnen.',
        'This is how large the difference looks to the eye. Comparing the real and the apparent difference gives the exaggeration factor: the cut-off axis turns the real difference into one many times larger. Columns compare lengths, so they must start at 0.'),
      tipp: P('Wie im ersten Schritt, aber mit den Höhen im Bild (10 und 20) statt mit 80 und 90.', 'As in the first step, but with the heights in the picture (10 and 20) instead of 80 and 90.'),
      fehler: [
        { wert: d => ((d.b - d.a) / d.a) * 100, tipp: P('Das ist der echte Unterschied aus dem ersten Schritt. Gefragt ist der Unterschied der Höhen im Bild.', 'That is the real difference from the first step. What is asked is the difference of the heights in the picture.') },
        { wert: d => ((d.b - d.a) / (d.b - d.start)) * 100, tipp: P('Hier wurde durch die Höhe von B geteilt. Der Ausgangswert ist die Säule A.', 'Here the height of B was used as the divisor. The starting value is column A.') }
      ],
      weg: (d, z) => [P(`Höhen im Bild: ${z(d.a - d.start)} und ${z(d.b - d.start)}. (${z(d.b - d.start)} − ${z(d.a - d.start)}) : ${z(d.a - d.start)} · 100 = ${z((((d.b - d.start) - (d.a - d.start)) / (d.a - d.start)) * 100)} %`, `Heights in the picture: ${z(d.a - d.start)} and ${z(d.b - d.start)}. (${z(d.b - d.start)} − ${z(d.a - d.start)}) : ${z(d.a - d.start)} · 100 = ${z((((d.b - d.start) - (d.a - d.start)) / (d.a - d.start)) * 100)}%`),
        P(`Das Bild übertreibt den Unterschied auf das ${z((((d.b - d.start) - (d.a - d.start)) / (d.a - d.start)) / ((d.b - d.a) / d.a))}-Fache.`, `The picture exaggerates the difference to ${z((((d.b - d.start) - (d.a - d.start)) / (d.a - d.start)) / ((d.b - d.a) / d.a))} times.`)] }
  ],
  merke: P('Ein Balken oder eine Säule zeigt die Zahl als Länge, und die Länge muss bei 0 beginnen. Beginnt die Achse später, übertreibt das Bild den Unterschied um ein Vielfaches.', 'A bar or column shows the number as a length, and the length must start at 0. If the axis starts later, the picture exaggerates the difference many times over.'),
  ausprobieren: P('Als Nächstes: Im Baustein „Achse“ lässt sich der Achsenbeginn verschieben; die Säulen verändern ihr Verhältnis.', 'Next: in the "Axis" tool the start of the axis can be moved; the columns change their ratio.')
});

// ---------------------------------------------------------------- 7. Daten sauber anlegen: breit und lang
export const DATEN_ANLEGEN = { personen: 12, zeitpunkte: 3, fehlend: 3 };
const ANLEGEN = bau({
  id: 'lang-form',
  daten: DATEN_ANLEGEN,
  lage: P('Zwölf Personen wurden zu drei Zeitpunkten nach ihrer Stimmung gefragt (Skala 1 bis 10). Die Tabelle zeigt vier der zwölf Personen in der breiten Form: eine Zeile je Person, eine Spalte je Zeitpunkt. Bei insgesamt drei Messungen fehlt der Wert (Person 03 hat die zweite Befragung ausgelassen).',
    'Twelve people were asked about their mood at three points in time (scale 1 to 10). The table shows four of the twelve people in the wide form: one row per person, one column per time point. For three measurements in all the value is missing (person 03 skipped the second survey).'),
  tabelle: { titel: P('Breite Form (vier von zwölf Personen)', 'Wide form (four of twelve people)'), kopf: [P('Kennung', 'ID'), P('Zeit 1', 'Time 1'), P('Zeit 2', 'Time 2'), P('Zeit 3', 'Time 3')],
    zeilen: [['P01', 6, 7, 8], ['P02', 5, 5, 7], ['P03', 7, P('fehlt', 'missing'), 6], ['P04', 4, 6, 6]] },
  schritte: [
    { id: 'zeilen-lang', stellen: 0, toleranz: 0.01, soll: d => d.personen * d.zeitpunkte,
      frage: P('In der langen Form steht jede Messung in einer eigenen Zeile. Wie viele Zeilen hat die lange Form bei 12 Personen und 3 Zeitpunkten?', 'In the long form every measurement has its own row. How many rows does the long form have for 12 people and 3 time points?'),
      warum: P('Jede Person bekommt für jeden Zeitpunkt eine Zeile: Personen mal Zeitpunkte. Die Zeilen sind also keine Personen mehr, sondern Messungen.', 'Every person gets a row for every time point: people times time points. The rows are no longer people but measurements.'),
      tipp: P('Mal, nicht plus: für jede Person drei Zeilen.', 'Times, not plus: three rows for every person.'),
      fehler: [{ wert: d => d.personen + d.zeitpunkte, tipp: P('Das ist die Summe. Jede der 12 Personen hat 3 Zeilen, also 12 mal 3.', 'That is the sum. Each of the 12 people has 3 rows, so 12 times 3.') }],
      weg: (d, z) => [P(`Zeilen = Personen · Zeitpunkte = ${d.personen} · ${d.zeitpunkte} = ${z(d.personen * d.zeitpunkte)}`, `Rows = people · time points = ${d.personen} · ${d.zeitpunkte} = ${z(d.personen * d.zeitpunkte)}`)] },
    { id: 'spalten-breit', stellen: 0, toleranz: 0.01, soll: d => 1 + d.zeitpunkte,
      frage: P('Wie viele Spalten hat die breite Form (Kennung und alle Messungen)?', 'How many columns does the wide form have (ID and all measurements)?'),
      warum: P('In der breiten Form steht eine Zeile je Person. Neben der Kennung braucht jeder Zeitpunkt seine eigene Spalte. Für Messwiederholungen verlangen viele Verfahren diese Form.', 'In the wide form there is one row per person. Besides the ID, every time point needs its own column. Many procedures for repeated measures require this form.'),
      tipp: P('Eine Spalte für die Kennung, dazu je eine Spalte pro Zeitpunkt.', 'One column for the ID, plus one column per time point.'),
      fehler: [{ wert: d => d.zeitpunkte, tipp: P('Das sind nur die Messungen. Die Kennung braucht eine eigene Spalte.', 'These are only the measurements. The ID needs a column of its own.') }],
      weg: (d, z) => [P(`Spalten = 1 (Kennung) + ${d.zeitpunkte} (Zeitpunkte) = ${z(1 + d.zeitpunkte)}`, `Columns = 1 (ID) + ${d.zeitpunkte} (time points) = ${z(1 + d.zeitpunkte)}`)] },
    { id: 'spalten-lang', stellen: 0, toleranz: 0.01, soll: () => 3,
      frage: P('Wie viele Spalten hat die lange Form mit Kennung, Zeitpunkt und Messwert?', 'How many columns does the long form have, with ID, time point and value?'),
      warum: P('Die lange Form hat eine Spalte je Größe: Wer (Kennung), wann (Zeitpunkt) und was gemessen wurde (Wert). Das ist die Regel: eine Zeile je Beobachtung, eine Spalte je Größe. Mehrebenen-Modelle brauchen diese Form.', 'The long form has one column per quantity: who (ID), when (time point) and what was measured (value). That is the rule: one row per observation, one column per quantity. Multilevel models need this form.'),
      tipp: P('Kennung, Zeitpunkt, Messwert: wie viele sind das?', 'ID, time point, value: how many are that?'),
      fehler: [{ wert: d => 1 + d.zeitpunkte, tipp: P('Das ist die Spaltenzahl der breiten Form. In der langen Form werden die Zeitpunkte zu den Werten einer Spalte.', 'That is the number of columns of the wide form. In the long form the time points become the values of one column.') }],
      weg: () => [P('Spalten der langen Form: Kennung, Zeitpunkt, Wert = 3', 'Columns of the long form: ID, time point, value = 3')] },
    { id: 'mit-wert', stellen: 0, toleranz: 0.01, soll: d => d.personen * d.zeitpunkte - d.fehlend,
      frage: P('In der langen Form bleibt auch für eine ausgelassene Messung eine Zeile, der Wert ist leer (fehlender Wert). Wie viele Zeilen haben einen Wert, wenn drei Werte fehlen?', 'In the long form a skipped measurement still keeps its row, the value is empty (missing value). How many rows have a value if three values are missing?'),
      warum: P('Fehlende Werte werden als leer oder mit einem Fehlendcode eingetragen, nie als 0, sonst rechnet das Programm mit einer Stimmung von 0. Verfahren zählen dann nur die Zeilen mit Wert.', 'Missing values are entered as empty or with a missing-value code, never as 0, otherwise the program works with a mood of 0. Procedures then count only the rows with a value.'),
      tipp: P('Alle Zeilen der langen Form minus die drei leeren.', 'All rows of the long form minus the three empty ones.'),
      fehler: [{ wert: d => d.personen * d.zeitpunkte, tipp: P('Das sind alle Zeilen, auch die mit leerem Wert. Die drei fehlenden sind abzuziehen.', 'These are all rows, including those with an empty value. The three missing ones have to be subtracted.') }],
      weg: (d, z) => [P(`${z(d.personen * d.zeitpunkte)} − ${d.fehlend} = ${z(d.personen * d.zeitpunkte - d.fehlend)} Zeilen mit Wert`, `${z(d.personen * d.zeitpunkte)} − ${d.fehlend} = ${z(d.personen * d.zeitpunkte - d.fehlend)} rows with a value`)] }
  ],
  merke: P('Eine Zeile je Beobachtung, eine Spalte je Größe. Messwiederholung steht meist breit (eine Zeile je Person), Mehrebenen-Modelle brauchen die lange Form (eine Zeile je Messung). Fehlende Werte bleiben leer oder bekommen einen Fehlendcode, nie 0.',
    'One row per observation, one column per quantity. Repeated measures are usually wide (one row per person); multilevel models need the long form (one row per measurement). Missing values stay empty or get a missing-value code, never 0.'),
  ausprobieren: P('Als Nächstes: Ein Beispiel mit drei Messzeitpunkten wird geöffnet. In der Datenansicht formt „Umstrukturieren“ von breit nach lang um; die Zeilenzahl lässt sich mit der Rechnung vergleichen (96 Kinder mal 3 Tests).', 'Next: an example with three measurement points is opened. In the data view "Reshape" turns wide into long; the number of rows can be compared with the calculation (96 children times 3 tests).')
});

// ================================================================= Lernpfad „Regression prüfen“ (Field-Stufe 2c, 05.11.2026)
const dz = (x: number, st: number) => x.toFixed(st).replace('.', ','), ez = (x: number, st: number) => x.toFixed(st);
const wurzel = Math.sqrt;

// ---------------------------------------------------------------- 8. Einflussreiche Fälle: Hebelwert, studentisiertes Residuum, Cooks Distanz
/** Sieben Personen: x = Bildschirmzeit am Abend (Stunden je Woche), y = Schlafqualität (Punkte). Gerade ŷ = 14 − x, Quadratsumme der Reste 22 (Sollwerte: scripts/ueben-erwartet-regression-pruefen.R). */
export const DATEN_EINFLUSS = { x: [1, 2, 3, 4, 5, 6, 12], y: [14, 13, 12, 9, 5, 9, 3], b0: 14, b1: -1, rss: 22, k: 2 };
type DE = typeof DATEN_EINFLUSS;
const efN = (d: DE) => d.x.length, efMx = (d: DE) => mittel(d.x), efSxx = (d: DE) => quadratsumme(d.x);
const efH = (d: DE, i: number) => 1 / efN(d) + (d.x[i]! - efMx(d)) ** 2 / efSxx(d);
const efE = (d: DE, i: number) => d.y[i]! - (d.b0 + d.b1 * d.x[i]!);
const efS2 = (d: DE) => d.rss / (efN(d) - d.k);
const efS2i = (d: DE, i: number) => (d.rss - efE(d, i) ** 2 / (1 - efH(d, i))) / (efN(d) - d.k - 1);
const efT = (d: DE, i: number) => efE(d, i) / (wurzel(efS2i(d, i)) * wurzel(1 - efH(d, i)));
const efD = (d: DE, i: number) => (efE(d, i) ** 2 * efH(d, i)) / (d.k * efS2(d) * (1 - efH(d, i)) ** 2);
const EINFLUSS = bau({
  id: 'einfluss-faelle',
  daten: DATEN_EINFLUSS,
  lage: P('Sieben Personen haben notiert, wie viele Stunden sie pro Woche abends vor dem Bildschirm sitzen (x) und wie gut sie schlafen (y, 0 bis 15 Punkte). Die Regression ergab die Gerade ŷ = 14 − 1 · x. Die Quadratsumme der Reste (RSS) beträgt 22. Person 7 sitzt mit 12 Stunden weit am Rand. Hat sie die Gerade zu sich gezogen? Dazu gibt es drei Zahlen: Hebelwert, studentisiertes Residuum und Cooks Distanz.',
    'Seven people noted how many hours per week they sit in front of a screen in the evening (x) and how well they sleep (y, 0 to 15 points). The regression gave the line ŷ = 14 − 1 · x. The sum of squares of the residuals (RSS) is 22. Person 7 sits far out at 12 hours. Has she pulled the line towards herself? Three numbers answer this: leverage, studentised residual and Cook\'s distance.'),
  tabelle: { titel: P('Bildschirmzeit und Schlafqualität', 'Screen time and sleep quality'), kopf: [P('Person', 'Person'), P('x (Stunden)', 'x (hours)'), P('y (Punkte)', 'y (points)')], zeilen: DATEN_EINFLUSS.x.map((x, i) => [`${i + 1}`, x, DATEN_EINFLUSS.y[i]!]) },
  schritte: [
    { id: 'hebel', stellen: 3, toleranz: 0.003, soll: d => efH(d, 6),
      frage: P('Wie groß ist der Hebelwert von Person 7? Rechnen: h = 1 : n + (x − Mittelwert von x)² : Σ(x − Mittelwert von x)².', 'What is the leverage of person 7? Calculate: h = 1 : n + (x − mean of x)² : Σ(x − mean of x)².'),
      warum: P('Der Hebelwert (Leverage) sagt, wie weit die Vorhersagegröße eines Falls vom Durchschnitt aller Fälle entfernt liegt. Er hängt nur von x ab, nicht von y. Der Durchschnitt aller Hebelwerte ist k : n (hier 2 : 7); ein Fall nahe 1 bestimmt seine eigene Vorhersage fast allein.',
        'The leverage tells how far the predictor value of a case is from the average of all cases. It depends only on x, not on y. The average of all leverages is k : n (here 2 : 7); a case near 1 almost alone determines its own prediction.'),
      tipp: P('Erst den Mittelwert von x (Summe 33, durch 7), dann die Summe der quadrierten Abweichungen aller sieben x, dann in die Formel einsetzen.', 'First the mean of x (sum 33, divided by 7), then the sum of the squared deviations of all seven x, then insert into the formula.'),
      fehler: [
        { wert: d => 1 / efN(d), tipp: P('Das ist nur der erste Summand 1 : n. Es fehlt der Teil für den Abstand vom Mittelwert von x.', 'That is only the first term 1 : n. The part for the distance from the mean of x is missing.') },
        { wert: d => (d.x[6]! - efMx(d)) ** 2 / efSxx(d), tipp: P('Das ist nur der zweite Summand. Es fehlt noch 1 : n.', 'That is only the second term. 1 : n is still missing.') },
        { wert: d => 1 / efN(d) + (d.x[6]! - efMx(d)) / efSxx(d), tipp: P('Hier wurde der Abstand nicht quadriert. Im Zähler steht (x − Mittelwert)².', 'Here the distance was not squared. The numerator is (x − mean)².') }
      ],
      weg: (d, z) => [
        P(`Mittelwert von x: ${summe(d.x)} : ${d.x.length} = ${z(efMx(d), 3)}; Σ(x − Mittelwert)² = ${z(efSxx(d), 2)}`, `Mean of x: ${summe(d.x)} : ${d.x.length} = ${z(efMx(d), 3)}; Σ(x − mean)² = ${z(efSxx(d), 2)}`),
        P(`h = 1 : ${d.x.length} + (${d.x[6]} − ${z(efMx(d), 3)})² : ${z(efSxx(d), 2)} = ${z(1 / efN(d), 3)} + ${z((d.x[6]! - efMx(d)) ** 2 / efSxx(d), 3)} = ${z(efH(d, 6), 3)}`, `h = 1 : ${d.x.length} + (${d.x[6]} − ${z(efMx(d), 3)})² : ${z(efSxx(d), 2)} = ${z(1 / efN(d), 3)} + ${z((d.x[6]! - efMx(d)) ** 2 / efSxx(d), 3)} = ${z(efH(d, 6), 3)}`)
      ] },
    { id: 'rest', stellen: 0, toleranz: 0.01, soll: d => efE(d, 6),
      frage: P('Wie groß ist der Rest (das Residuum) von Person 7? Gemessen minus vorhergesagt.', 'How large is the residual of person 7? Measured minus predicted.'),
      warum: P('Der Rest ist der Abstand zur Geraden. Er sagt, wie schlecht die Gerade diese Person trifft, aber nicht, wie stark die Person die Gerade verbogen hat. Ein Fall mit großem Hebel zieht die Gerade zu sich und hat deshalb oft einen kleinen Rest.',
        'The residual is the distance to the line. It says how badly the line hits this person, but not how strongly the person bent the line. A case with high leverage pulls the line towards itself and therefore often has a small residual.'),
      tipp: P('Erst ŷ für x = 12 ausrechnen (14 − 12), dann 3 minus ŷ.', 'First work out ŷ for x = 12 (14 − 12), then 3 minus ŷ.'),
      fehler: [{ wert: d => -efE(d, 6), tipp: P('Das Vorzeichen ist vertauscht. Gemessen (3) minus vorhergesagt (2) ist positiv: Person 7 liegt über der Geraden.', 'The sign is swapped. Measured (3) minus predicted (2) is positive: person 7 lies above the line.') },
        { wert: d => d.y[6]!, tipp: P('Das ist der gemessene Wert. Davon ist der vorhergesagte Wert abzuziehen.', 'That is the measured value. The predicted value has to be subtracted from it.') }],
      weg: (d, z) => [P(`ŷ = ${z(d.b0)} − ${z(d.x[6]!)} = ${z(d.b0 + d.b1 * d.x[6]!)}; Rest = ${z(d.y[6]!)} − ${z(d.b0 + d.b1 * d.x[6]!)} = ${z(efE(d, 6))}`, `ŷ = ${z(d.b0)} − ${z(d.x[6]!)} = ${z(d.b0 + d.b1 * d.x[6]!)}; residual = ${z(d.y[6]!)} − ${z(d.b0 + d.b1 * d.x[6]!)} = ${z(efE(d, 6))}`)] },
    { id: 'student', stellen: 2, toleranz: 0.02, soll: d => efT(d, 6),
      frage: P('Wie groß ist das studentisierte Residuum von Person 7? Rechnen: s₍ᵢ₎² = (RSS − Rest² : (1 − h)) : (n − 3), dann Rest : (s₍ᵢ₎ · √(1 − h)).', 'What is the studentised residual of person 7? Calculate: s₍ᵢ₎² = (RSS − residual² : (1 − h)) : (n − 3), then residual : (s₍ᵢ₎ · √(1 − h)).'),
      warum: P('Das studentisierte Residuum teilt den Rest durch seinen eigenen Standardfehler. Dabei wird die Person bei der Schätzung der Streuung weggelassen (s₍ᵢ₎), sonst würde sie ihre eigene Messlatte verschieben. Als Faustregel ist ein Betrag über 2 auffällig; bei passendem Modell trifft das etwa jeden zwanzigsten Fall.',
        'The studentised residual divides the residual by its own standard error. The person is left out when the spread is estimated (s₍ᵢ₎), otherwise she would move her own yardstick. As a rule of thumb an absolute value above 2 stands out; with a suitable model this hits about one case in twenty.'),
      tipp: P('Zuerst s₍ᵢ₎²: von 22 wird Rest² : (1 − h) abgezogen, das Ergebnis durch n − 3 = 4 geteilt. Dann die Wurzel ziehen und im Nenner mit √(1 − h) malnehmen.', 'First s₍ᵢ₎²: subtract residual² : (1 − h) from 22, divide the result by n − 3 = 4. Then take the root and multiply by √(1 − h) in the denominator.'),
      fehler: [
        { wert: d => efE(d, 6) / (wurzel(efS2(d)) * wurzel(1 - efH(d, 6))), tipp: P('Hier wurde die Streuung mit allen Personen geschätzt (s = √(22 : 5)). Das ergibt das standardisierte Residuum; beim studentisierten wird Person 7 für s weggelassen.', 'Here the spread was estimated with all people (s = √(22 : 5)). That gives the standardised residual; for the studentised one person 7 is left out for s.') },
        { wert: d => efE(d, 6) / wurzel(efS2(d)), tipp: P('Hier fehlt der Faktor √(1 − h). Der Rest allein, geteilt durch s, ist noch nicht studentisiert.', 'The factor √(1 − h) is missing here. The residual divided by s alone is not yet studentised.') }
      ],
      weg: (d, z) => [
        P(`s₍ᵢ₎² = (${z(d.rss)} − ${z(efE(d, 6) ** 2)} : (1 − ${z(efH(d, 6), 3)})) : ${efN(d) - 3} = ${z(efS2i(d, 6), 3)}; s₍ᵢ₎ = ${z(wurzel(efS2i(d, 6)), 3)}`, `s₍ᵢ₎² = (${z(d.rss)} − ${z(efE(d, 6) ** 2)} : (1 − ${z(efH(d, 6), 3)})) : ${efN(d) - 3} = ${z(efS2i(d, 6), 3)}; s₍ᵢ₎ = ${z(wurzel(efS2i(d, 6)), 3)}`),
        P(`Studentisiertes Residuum = ${z(efE(d, 6))} : (${z(wurzel(efS2i(d, 6)), 3)} · ${z(wurzel(1 - efH(d, 6)), 3)}) = ${z(efT(d, 6), 2)}`, `Studentised residual = ${z(efE(d, 6))} : (${z(wurzel(efS2i(d, 6)), 3)} · ${z(wurzel(1 - efH(d, 6)), 3)}) = ${z(efT(d, 6), 2)}`)
      ] },
    { id: 'cook', stellen: 2, toleranz: 0.03, soll: d => efD(d, 6),
      frage: P('Wie groß ist Cooks Distanz von Person 7? Rechnen: D = Rest² · h : (k · s² · (1 − h)²) mit k = 2 und s² = RSS : (n − 2).', 'What is Cook\'s distance of person 7? Calculate: D = residual² · h : (k · s² · (1 − h)²) with k = 2 and s² = RSS : (n − 2).'),
      warum: P('Cooks Distanz verbindet Rest und Hebelwert zu einer Zahl: Wie stark würden sich die vorhergesagten Werte aller Fälle ändern, wenn man diese Person weglässt? Als Faustgrenze gilt 4 : n (hier 4 : 7 = 0,57); ab 1 ist der Einfluss sehr stark. Person 7 hat einen kleinen Rest und trotzdem einen riesigen Einfluss, weil ihr Hebel groß ist.',
        'Cook\'s distance combines residual and leverage into one number: how strongly would the predicted values of all cases change if this person were left out? The rule of thumb is 4 : n (here 4 : 7 = 0.57); from 1 the influence is very strong. Person 7 has a small residual and yet a huge influence because her leverage is large.'),
      tipp: P('s² = 22 : 5 = 4,4. Dann 1 − h und davon das Quadrat bilden, den Nenner k · s² · (1 − h)² ausrechnen und den Zähler Rest² · h durch ihn teilen.', 's² = 22 : 5 = 4.4. Then form 1 − h and square it, work out the denominator k · s² · (1 − h)² and divide the numerator residual² · h by it.'),
      fehler: [
        { wert: d => (efE(d, 6) ** 2 * efH(d, 6)) / (efS2(d) * (1 - efH(d, 6)) ** 2), tipp: P('Hier fehlt das k = 2 im Nenner (Zahl der geschätzten Größen: Konstante und Steigung).', 'The k = 2 is missing in the denominator here (number of estimated quantities: constant and slope).') },
        { wert: d => (efE(d, 6) ** 2 * efH(d, 6)) / (d.k * efS2(d) * (1 - efH(d, 6))), tipp: P('Hier wurde (1 − h) nicht quadriert.', 'Here (1 − h) was not squared.') }
      ],
      weg: (d, z) => [
        P(`s² = ${z(d.rss)} : ${efN(d) - 2} = ${z(efS2(d), 1)}; 1 − h = ${z(1 - efH(d, 6), 3)}; (1 − h)² = ${z((1 - efH(d, 6)) ** 2, 4)}`, `s² = ${z(d.rss)} : ${efN(d) - 2} = ${z(efS2(d), 1)}; 1 − h = ${z(1 - efH(d, 6), 3)}; (1 − h)² = ${z((1 - efH(d, 6)) ** 2, 4)}`),
        P(`D = ${z(efE(d, 6) ** 2)} · ${z(efH(d, 6), 3)} : (${d.k} · ${z(efS2(d), 1)} · ${z((1 - efH(d, 6)) ** 2, 4)}) = ${z(efD(d, 6), 2)}. Grenze 4 : ${efN(d)} = ${z(4 / efN(d), 2)}: weit darüber.`, `D = ${z(efE(d, 6) ** 2)} · ${z(efH(d, 6), 3)} : (${d.k} · ${z(efS2(d), 1)} · ${z((1 - efH(d, 6)) ** 2, 4)}) = ${z(efD(d, 6), 2)}. Limit 4 : ${efN(d)} = ${z(4 / efN(d), 2)}: far above.`)
      ] }
  ],
  merke: P('Der Hebelwert zeigt, wie weit ein Fall am Rand der Vorhersagegröße liegt. Das studentisierte Residuum zeigt, wie weit er neben der Geraden liegt. Cooks Distanz verbindet beides und zeigt den Einfluss. Person 7 liegt fast auf der Geraden und ist trotzdem der einflussreichste Fall. Person 5 liegt weit daneben (studentisiertes Residuum −4,75), hat aber wenig Einfluss (Cooks Distanz 0,36). Gelöscht wird nie automatisch: erst prüfen, dann mit und ohne den Fall rechnen.',
    'The leverage shows how far a case lies at the edge of the predictor. The studentised residual shows how far it lies beside the line. Cook\'s distance combines both and shows the influence. Person 7 lies almost on the line and is still the most influential case. Person 5 lies far off (studentised residual −4.75) but has little influence (Cook\'s distance 0.36). Cases are never deleted automatically: first check, then calculate with and without the case.'),
  ausprobieren: P('Als Nächstes: Das Beispiel „Autos“ öffnen, im Schritt „Modell 1: nur das Gewicht“ unter dem Ergebnis „Regression prüfen“ aufklappen. Dort stehen dieselben Größen für 32 Autos: Der Chrysler Imperial (Zeile 17) hat Cooks Distanz 0,532, studentisiertes Residuum 2,33 und Hebelwert 0,184; der Fiat 128 (Zeile 18) fällt nur durch sein Residuum 2,54 auf.',
    'Next: open the example "Cars", in the step "Model 1: weight only" open "Checking the regression" under the result. It shows the same quantities for 32 cars: the Chrysler Imperial (row 17) has Cook\'s distance 0.532, studentised residual 2.33 and leverage 0.184; the Fiat 128 (row 18) stands out only through its residual 2.54.')
});

// ---------------------------------------------------------------- 9. Eindeutiger Beitrag: sr² aus t, R² und Freiheitsgraden
export const DATEN_BEITRAG = { n: 30, k: 2, r2: 0.5, tA: 3, tB: 2 };
type DB = typeof DATEN_BEITRAG;
const dfB = (d: DB) => d.n - d.k - 1;
const srA = (d: DB) => (d.tA ** 2 * (1 - d.r2)) / dfB(d), srB = (d: DB) => (d.tB ** 2 * (1 - d.r2)) / dfB(d);
const BEITRAG = bau({
  id: 'beitrag-sr2',
  daten: DATEN_BEITRAG,
  lage: P('Eine Regression mit 30 Studierenden sagt die Klausurpunkte aus zwei Größen voraus: Lernstunden (A) und Vorwissen (B). Das Modell erklärt R² = 0,50. In der Ergebnistabelle steht für A der t-Wert 3, für B der t-Wert 2. Wie viel der Streuung erklärt jede Größe ganz allein, also zusätzlich zur anderen? Das ist ihr eigener Beitrag, die quadrierte Semipartialkorrelation sr².',
    'A regression with 30 students predicts the exam points from two variables: study hours (A) and prior knowledge (B). The model explains R² = 0.50. The results table shows the t value 3 for A and 2 for B. How much of the spread does each variable explain entirely on its own, that is in addition to the other? That is its own contribution, the squared semipartial correlation sr².'),
  tabelle: { titel: P('Angaben aus der Ergebnistabelle', 'Information from the results table'), kopf: [P('Angabe', 'Item'), P('Wert', 'Value')],
    zeilen: [[P('Fälle (n)', 'Cases (n)'), 30], [P('Vorhersagegrößen (k)', 'Predictors (k)'), 2], [P('R² des Modells', 'R² of the model'), P('0,50', '0.50')], [P('t-Wert von A (Lernstunden)', 't value of A (study hours)'), 3], [P('t-Wert von B (Vorwissen)', 't value of B (prior knowledge)'), 2]] },
  schritte: [
    { id: 'df', stellen: 0, toleranz: 0.01, soll: d => dfB(d),
      frage: P('Wie viele Freiheitsgrade (df) hat der t-Test der einzelnen Größen? Rechnen: n − k − 1.', 'How many degrees of freedom (df) does the t test of the single variables have? Calculate: n − k − 1.'),
      warum: P('Aus 30 Werten wurden die Konstante und zwei Steigungen geschätzt, drei Größen. Darum bleiben 30 − 3 = 27 frei. Die Freiheitsgrade der Reste stehen in der Formel für sr² im Nenner.', 'From 30 values the constant and two slopes were estimated, three quantities. So 30 − 3 = 27 remain free. The degrees of freedom of the residuals are the denominator in the formula for sr².'),
      tipp: P('Von n die Zahl der Vorhersagegrößen abziehen und noch 1 für die Konstante.', 'Subtract the number of predictors from n and 1 more for the constant.'),
      fehler: [{ wert: d => d.n - d.k, tipp: P('Hier fehlt die Konstante. Sie wird auch aus den Daten geschätzt und kostet einen Freiheitsgrad.', 'The constant is missing here. It is also estimated from the data and costs one degree of freedom.') },
        { wert: d => d.n - 1, tipp: P('Das sind die Freiheitsgrade eines Mittelwerts. Hier wurden noch zwei Steigungen geschätzt.', 'That is the degrees of freedom of one mean. Here two slopes were estimated as well.') }],
      weg: (d, z) => [P(`df = n − k − 1 = ${z(d.n)} − ${z(d.k)} − 1 = ${z(dfB(d))}`, `df = n − k − 1 = ${z(d.n)} − ${z(d.k)} − 1 = ${z(dfB(d))}`)] },
    { id: 'sr-a', stellen: 3, toleranz: 0.002, soll: d => srA(d),
      frage: P('Wie groß ist sr² für A (Lernstunden)? Rechnen: sr² = t² · (1 − R²) : df.', 'How large is sr² for A (study hours)? Calculate: sr² = t² · (1 − R²) : df.'),
      warum: P('sr² ist der Anteil an der Streuung der Klausurpunkte, den nur A zusätzlich erklärt, wenn B schon im Modell ist. Er ist der Zuwachs an R², wenn man A zum Modell mit B dazunimmt. Der Faktor (1 − R²) rechnet den t-Wert auf den Anteil an der gesamten Streuung um.',
        'sr² is the share of the spread of the exam points that only A explains in addition when B is already in the model. It is the gain in R² when A is added to the model with B. The factor (1 − R²) converts the t value into a share of the total spread.'),
      tipp: P('t quadrieren (3 · 3 = 9), mit 1 − 0,50 malnehmen und durch 27 teilen.', 'Square t (3 · 3 = 9), multiply by 1 − 0.50 and divide by 27.'),
      fehler: [{ wert: d => d.tA ** 2 / dfB(d), tipp: P('Hier fehlt der Faktor 1 − R². Ohne ihn ist es nicht der Anteil an der gesamten Streuung.', 'The factor 1 − R² is missing here. Without it this is not the share of the total spread.') },
        { wert: d => d.tA ** 2 / (d.tA ** 2 + dfB(d)), tipp: P('Das ist die quadrierte Partialkorrelation t² : (t² + df). Sie bezieht sich nur auf die Streuung, die B übrig lässt, nicht auf die gesamte.', 'That is the squared partial correlation t² : (t² + df). It refers only to the spread that B leaves over, not to the total.') }],
      weg: (d, z) => [P(`sr² = ${z(d.tA ** 2)} · (1 − ${z(d.r2, 2)}) : ${z(dfB(d))} = ${z(d.tA ** 2 * (1 - d.r2), 2)} : ${z(dfB(d))} = ${z(srA(d), 3)}`, `sr² = ${z(d.tA ** 2)} · (1 − ${z(d.r2, 2)}) : ${z(dfB(d))} = ${z(d.tA ** 2 * (1 - d.r2), 2)} : ${z(dfB(d))} = ${z(srA(d), 3)}`)] },
    { id: 'sr-b', stellen: 3, toleranz: 0.002, soll: d => srB(d),
      frage: P('Wie groß ist sr² für B (Vorwissen)?', 'How large is sr² for B (prior knowledge)?'),
      warum: P('Dieselbe Rechnung mit dem t-Wert von B. Ein kleineres t gibt einen kleineren eigenen Beitrag, denn t wird quadriert.', 'The same calculation with the t value of B. A smaller t gives a smaller own contribution, because t is squared.'),
      tipp: P('4 mal 0,50 durch 27.', '4 times 0.50 divided by 27.'),
      fehler: [{ wert: d => d.tB ** 2 / dfB(d), tipp: P('Hier fehlt der Faktor 1 − R².', 'The factor 1 − R² is missing here.') },
        { wert: d => d.tB ** 2 / (d.tB ** 2 + dfB(d)), tipp: P('Das ist die quadrierte Partialkorrelation t² : (t² + df), nicht sr².', 'That is the squared partial correlation t² : (t² + df), not sr².') }],
      weg: (d, z) => [P(`sr² = ${z(d.tB ** 2)} · (1 − ${z(d.r2, 2)}) : ${z(dfB(d))} = ${z(srB(d), 3)}`, `sr² = ${z(d.tB ** 2)} · (1 − ${z(d.r2, 2)}) : ${z(dfB(d))} = ${z(srB(d), 3)}`)] },
    { id: 'gemeinsam', stellen: 3, toleranz: 0.003, soll: d => d.r2 - srA(d) - srB(d),
      frage: P('Welcher Anteil der Streuung wird von A und B nur gemeinsam erklärt? Rechnen: R² − sr² von A − sr² von B.', 'What share of the spread is explained by A and B only together? Calculate: R² − sr² of A − sr² of B.'),
      warum: P('Im Venn-Bild überschneiden sich die Kreise von A und B. Die Fläche nur in A ist sr² von A, die nur in B ist sr² von B. Die Überlappung ist erklärte Streuung, die keiner Größe allein gehört. Darum sind die sr² zusammen kleiner als R².', 'In the Venn picture the circles of A and B overlap. The area only in A is sr² of A, the area only in B is sr² of B. The overlap is explained spread that belongs to no variable alone. That is why the sr² together are smaller than R².'),
      tipp: P('Von R² = 0,50 beide sr² abziehen.', 'Subtract both sr² from R² = 0.50.'),
      fehler: [{ wert: d => srA(d) + srB(d), tipp: P('Das ist die Summe der beiden eigenen Beiträge. Gefragt ist, was übrig bleibt, wenn man sie von R² abzieht.', 'That is the sum of the two own contributions. What is asked is what remains when they are subtracted from R².') },
        { wert: d => d.r2, tipp: P('Das ist R² selbst, die gesamte erklärte Streuung. Davon sind die eigenen Beiträge abzuziehen.', 'That is R² itself, the whole explained spread. The own contributions have to be subtracted from it.') }],
      weg: (d, z) => [P(`${z(d.r2, 2)} − ${z(srA(d), 3)} − ${z(srB(d), 3)} = ${z(d.r2 - srA(d) - srB(d), 3)}`, `${z(d.r2, 2)} − ${z(srA(d), 3)} − ${z(srB(d), 3)} = ${z(d.r2 - srA(d) - srB(d), 3)}`)] }
  ],
  merke: P('sr² ist der eigene Beitrag einer Größe: der Zuwachs an R², wenn man sie als letzte ins Modell nimmt. Überlappen sich die Vorhersagegrößen, bleibt ein gemeinsamer Teil, der keiner allein gehört; die sr² ergeben dann zusammen weniger als R². Der eigene Beitrag kann klein sein, obwohl die Größe allein stark mit dem Ergebnis zusammenhängt.',
    'sr² is the own contribution of a variable: the gain in R² when it is added to the model last. If the predictors overlap, a common part remains that belongs to none alone; the sr² then add up to less than R². The own contribution can be small although the variable on its own is strongly related to the outcome.'),
  ausprobieren: P('Als Nächstes: Das Beispiel „Autos“ öffnen, im Schritt „Drei eng verbundene Größen“ unter dem Ergebnis „Regression prüfen“ aufklappen. R² ist dort 0,827. Gewicht hat sr² = 0,079, Leistung 0,046, Hubraum weniger als 0,001: Der Hubraum hängt allein stark mit den Meilen je Gallone zusammen, trägt aber neben den anderen fast nichts bei.',
    'Next: open the example "Cars", in the step "Three closely related variables" open "Checking the regression" under the result. R² is 0.827 there. Weight has sr² = 0.079, power 0.046, displacement less than 0.001: displacement alone is strongly related to the miles per gallon but adds almost nothing next to the others.')
});

// ---------------------------------------------------------------- 10. Überanpassung: R² gegen korrigiertes R²
export const DATEN_UEBER = { n: 25, a: { k: 2, r2: 0.4 }, b: { k: 10, r2: 0.52 } };
type DU = typeof DATEN_UEBER;
const adjR = (d: DU, m: { k: number; r2: number }) => 1 - ((1 - m.r2) * (d.n - 1)) / (d.n - m.k - 1);
const UEBER = bau({
  id: 'ueberanpassung-r2',
  daten: DATEN_UEBER,
  lage: P('Zwei Modelle sagen die Klausurpunkte von 25 Studierenden voraus. Modell A nutzt 2 Größen und erklärt R² = 0,40. Modell B nutzt 10 Größen und erklärt R² = 0,52. B sieht besser aus. Aber jede zusätzliche Größe erhöht R² ein wenig, auch eine Spalte mit Zufallszahlen. Das korrigierte R² zieht diesen Zufallsgewinn ab.',
    'Two models predict the exam points of 25 students. Model A uses 2 variables and explains R² = 0.40. Model B uses 10 variables and explains R² = 0.52. B looks better. But every additional variable raises R² a little, even a column of random numbers. The adjusted R² subtracts this chance gain.'),
  tabelle: { titel: P('Zwei Modelle im Vergleich', 'Two models compared'), kopf: [P('Modell', 'Model'), P('Vorhersagegrößen (k)', 'Predictors (k)'), P('Erklärtes R²', 'Explained R²'), P('Fälle (n)', 'Cases (n)')],
    zeilen: [['A', 2, P('0,40', '0.40'), 25], ['B', 10, P('0,52', '0.52'), 25]] },
  schritte: [
    { id: 'adj-a', stellen: 3, toleranz: 0.003, soll: d => adjR(d, d.a),
      frage: P('Wie groß ist das korrigierte R² von Modell A? Rechnen: 1 − (1 − R²) · (n − 1) : (n − k − 1).', 'How large is the adjusted R² of model A? Calculate: 1 − (1 − R²) · (n − 1) : (n − k − 1).'),
      warum: P('Das korrigierte R² (R²adj) schätzt, wie viel ein Modell in der Grundgesamtheit erklären würde. Es rechnet den Nenner n − k − 1 gegen n − 1: Je mehr Größen im Modell stehen, desto stärker wird abgezogen.', 'The adjusted R² (R²adj) estimates how much a model would explain in the population. It sets the denominator n − k − 1 against n − 1: the more variables are in the model, the more is subtracted.'),
      tipp: P('1 − 0,40 = 0,60; mal 24, geteilt durch 22; das Ergebnis von 1 abziehen.', '1 − 0.40 = 0.60; times 24, divided by 22; subtract the result from 1.'),
      fehler: [{ wert: d => d.a.r2, tipp: P('Das ist das einfache R². Die Korrektur fehlt.', 'That is the plain R². The adjustment is missing.') },
        { wert: d => 1 - ((1 - d.a.r2) * (d.n - 1)) / (d.n - d.a.k), tipp: P('Im Nenner steht n − k − 1, nicht n − k: Die Konstante wird auch geschätzt.', 'The denominator is n − k − 1, not n − k: the constant is estimated as well.') }],
      weg: (d, z) => [P(`R²adj = 1 − (1 − ${z(d.a.r2, 2)}) · ${d.n - 1} : ${d.n - d.a.k - 1} = 1 − ${z((1 - d.a.r2) * (d.n - 1) / (d.n - d.a.k - 1), 3)} = ${z(adjR(d, d.a), 3)}`, `R²adj = 1 − (1 − ${z(d.a.r2, 2)}) · ${d.n - 1} : ${d.n - d.a.k - 1} = 1 − ${z((1 - d.a.r2) * (d.n - 1) / (d.n - d.a.k - 1), 3)} = ${z(adjR(d, d.a), 3)}`)] },
    { id: 'adj-b', stellen: 3, toleranz: 0.003, soll: d => adjR(d, d.b),
      frage: P('Wie groß ist das korrigierte R² von Modell B?', 'How large is the adjusted R² of model B?'),
      warum: P('Mit 10 Größen bei nur 25 Fällen bleiben 14 Freiheitsgrade. Der Abzug ist groß, und das korrigierte R² von B liegt unter dem von A: Der Gewinn von 0,52 gegen 0,40 ist großenteils Zufall.', 'With 10 variables and only 25 cases, 14 degrees of freedom remain. The deduction is large, and the adjusted R² of B lies below that of A: the gain of 0.52 against 0.40 is largely chance.'),
      tipp: P('1 − 0,52 = 0,48; mal 24, geteilt durch 25 − 10 − 1 = 14; von 1 abziehen.', '1 − 0.52 = 0.48; times 24, divided by 25 − 10 − 1 = 14; subtract from 1.'),
      fehler: [{ wert: d => d.b.r2, tipp: P('Das ist das einfache R² von Modell B. Die Korrektur fehlt.', 'That is the plain R² of model B. The adjustment is missing.') },
        { wert: d => 1 - ((1 - d.b.r2) * (d.n - 1)) / (d.n - d.b.k), tipp: P('Im Nenner steht n − k − 1 = 14, nicht n − k = 15.', 'The denominator is n − k − 1 = 14, not n − k = 15.') }],
      weg: (d, z) => [P(`R²adj = 1 − (1 − ${z(d.b.r2, 2)}) · ${d.n - 1} : ${d.n - d.b.k - 1} = 1 − ${z((1 - d.b.r2) * (d.n - 1) / (d.n - d.b.k - 1), 3)} = ${z(adjR(d, d.b), 3)}`, `R²adj = 1 − (1 − ${z(d.b.r2, 2)}) · ${d.n - 1} : ${d.n - d.b.k - 1} = 1 − ${z((1 - d.b.r2) * (d.n - 1) / (d.n - d.b.k - 1), 3)} = ${z(adjR(d, d.b), 3)}`)] },
    { id: 'abzug', stellen: 3, toleranz: 0.003, soll: d => d.b.r2 - adjR(d, d.b),
      frage: P('Um wie viel überschätzt R² die Erklärkraft von Modell B? Rechnen: R² minus korrigiertes R².', 'By how much does R² overestimate the explanatory power of model B? Calculate: R² minus adjusted R².'),
      warum: P('Der Unterschied zwischen R² und korrigiertem R² ist die Schrumpfung (Shrinkage), die man bei neuen Daten erwarten kann. Er wächst mit der Zahl der Größen und schrumpft mit der Zahl der Fälle.', 'The difference between R² and adjusted R² is the shrinkage one can expect with new data. It grows with the number of variables and shrinks with the number of cases.'),
      tipp: P('0,52 minus das Ergebnis des letzten Schritts.', '0.52 minus the result of the last step.'),
      fehler: [{ wert: d => d.b.r2 - d.a.r2, tipp: P('Das ist der Unterschied der beiden R² (B gegen A). Gefragt ist der Unterschied von R² und korrigiertem R² innerhalb von Modell B.', 'That is the difference between the two R² (B against A). What is asked is the difference of R² and adjusted R² within model B.') }],
      weg: (d, z) => [P(`${z(d.b.r2, 2)} − ${z(adjR(d, d.b), 3)} = ${z(d.b.r2 - adjR(d, d.b), 3)}`, `${z(d.b.r2, 2)} − ${z(adjR(d, d.b), 3)} = ${z(d.b.r2 - adjR(d, d.b), 3)}`)] },
    { id: 'je-groesse', stellen: 1, toleranz: 0.05, soll: d => d.n / d.b.k,
      frage: P('Wie viele Fälle kommen in Modell B auf eine Vorhersagegröße?', 'How many cases are there per predictor in model B?'),
      warum: P('Als Faustregel braucht jede Vorhersagegröße etwa 10 bis 15 Fälle. Modell B hat 2,5. Mit so wenigen Fällen je Größe passt sich das Modell an den Zufall dieser Stichprobe an: Es ist überangepasst (Overfitting) und sagt neue Fälle schlechter voraus, als R² verspricht.', 'As a rule of thumb each predictor needs about 10 to 15 cases. Model B has 2.5. With so few cases per variable the model adapts to the chance of this sample: it is overfitted and predicts new cases worse than R² promises.'),
      tipp: P('Zahl der Fälle geteilt durch Zahl der Vorhersagegrößen.', 'Number of cases divided by number of predictors.'),
      fehler: [{ wert: d => d.n / d.a.k, tipp: P('Das sind die Fälle je Größe von Modell A. Gefragt ist Modell B.', 'That is the cases per variable of model A. Model B is asked for.') },
        { wert: d => d.b.k / d.n, tipp: P('Hier wurde umgekehrt geteilt: Größen durch Fälle.', 'Here the division was the wrong way round: variables by cases.') }],
      weg: (d, z) => [P(`${z(d.n)} : ${z(d.b.k)} = ${z(d.n / d.b.k, 1)} Fälle je Vorhersagegröße (Modell A: ${z(d.n / d.a.k, 1)})`, `${z(d.n)} : ${z(d.b.k)} = ${z(d.n / d.b.k, 1)} cases per predictor (model A: ${z(d.n / d.a.k, 1)})`)] }
  ],
  merke: P('R² steigt mit jeder Größe, auch mit einer unnützen. Das korrigierte R² zieht den Zufallsgewinn ab und kann sinken. Wer viele Größen auf wenige Fälle loslässt oder schrittweise auswählen lässt, passt das Modell an den Zufall an (Überanpassung). Ob ein Modell trägt, zeigt sich an neuen Daten (Kreuzvalidierung), nicht an R².',
    'R² rises with every variable, even a useless one. The adjusted R² subtracts the chance gain and can fall. Anyone who lets many variables loose on few cases or has them selected stepwise adapts the model to chance (overfitting). Whether a model holds shows in new data (cross-validation), not in R².'),
  ausprobieren: P('Als Nächstes: Das Beispiel „Autos“ öffnen. Von „Modell 1: nur das Gewicht“ (R² 0,753, korrigiertes R² 0,745) zu „Modell 3: Gewicht und Getriebe“ steigt R² nicht (0,753), das korrigierte R² sinkt auf 0,736: Das Getriebe bringt nichts dazu.',
    'Next: open the example "Cars". From "Model 1: weight only" (R² 0.753, adjusted R² 0.745) to "Model 3: weight and transmission" R² does not rise (0.753), the adjusted R² falls to 0.736: the transmission adds nothing.')
});

// ---------------------------------------------------------------- 11. Zwei Korrelationen vergleichen: Fisher-z
export const DATEN_FISHER = { r1: 0.6, n1: 40, r2: 0.3, n2: 60 };
type DF = typeof DATEN_FISHER;
const fSe = (d: DF) => wurzel(1 / (d.n1 - 3) + 1 / (d.n2 - 3));
const fZ = (d: DF) => (Math.atanh(d.r1) - Math.atanh(d.r2)) / fSe(d);
const FISHER = bau({
  id: 'fisher-z-vergleich',
  daten: DATEN_FISHER,
  lage: P('Lernstunden und Klausurpunkte hängen in zwei Kursen zusammen: im Präsenzkurs mit r = 0,60 (40 Personen), im Online-Kurs mit r = 0,30 (60 Personen). Die Gruppen sind unabhängig, es sind verschiedene Personen. Ist der Zusammenhang im Präsenzkurs wirklich stärker, oder kann der Unterschied Zufall sein? Dazu werden beide r in Fisher-z umgerechnet und verglichen.',
    'Study hours and exam points are related in two courses: in the classroom course with r = 0.60 (40 people), in the online course with r = 0.30 (60 people). The groups are independent, they are different people. Is the relationship really stronger in the classroom course, or can the difference be chance? To find out, both r are converted to Fisher z and compared.'),
  tabelle: { titel: P('Zwei unabhängige Korrelationen', 'Two independent correlations'), kopf: [P('Kurs', 'Course'), P('Korrelation r', 'Correlation r'), P('Personen (n)', 'People (n)')],
    zeilen: [[P('Präsenzkurs', 'Classroom course'), P('0,60', '0.60'), 40], [P('Online-Kurs', 'Online course'), P('0,30', '0.30'), 60]] },
  schritte: [
    { id: 'z1', stellen: 3, toleranz: 0.002, soll: d => Math.atanh(d.r1),
      frage: P('Wie groß ist Fisher-z für r = 0,60? Rechnen: z = ½ · ln((1 + r) : (1 − r)).', 'How large is Fisher z for r = 0.60? Calculate: z = ½ · ln((1 + r) : (1 − r)).'),
      warum: P('Die Verteilung von r ist schief, vor allem bei großem r. Die Umrechnung in Fisher-z macht sie nahezu normal, und ihr Standardfehler hängt nur von n ab. Erst dann lassen sich zwei Werte mit einem z-Test vergleichen. Die Taste „ln“ steckt auf jedem Taschenrechner; „artanh“ oder „tanh⁻¹“ gibt dasselbe Ergebnis.',
        'The distribution of r is skewed, especially for large r. The conversion to Fisher z makes it almost normal, and its standard error depends only on n. Only then can two values be compared with a z test. The key "ln" is on every pocket calculator; "artanh" or "tanh⁻¹" gives the same result.'),
      tipp: P('(1 + 0,60) : (1 − 0,60) = 4; davon den natürlichen Logarithmus ln und die Hälfte.', '(1 + 0.60) : (1 − 0.60) = 4; take the natural logarithm ln of it and then half.'),
      fehler: [{ wert: d => d.r1, tipp: P('Das ist r selbst. Fisher-z ist bei kleinem r ähnlich, bei 0,60 aber schon deutlich größer.', 'That is r itself. Fisher z is similar for small r but already clearly larger at 0.60.') },
        { wert: d => Math.log((1 + d.r1) / (1 - d.r1)), tipp: P('Der Faktor ½ fehlt: z = ½ · ln(…).', 'The factor ½ is missing: z = ½ · ln(…).') }],
      weg: (d, z) => [P(`z₁ = ½ · ln((1 + ${z(d.r1, 2)}) : (1 − ${z(d.r1, 2)})) = ½ · ln(${z((1 + d.r1) / (1 - d.r1), 2)}) = ½ · ${z(Math.log((1 + d.r1) / (1 - d.r1)), 4)} = ${z(Math.atanh(d.r1), 3)}`, `z₁ = ½ · ln((1 + ${z(d.r1, 2)}) : (1 − ${z(d.r1, 2)})) = ½ · ln(${z((1 + d.r1) / (1 - d.r1), 2)}) = ½ · ${z(Math.log((1 + d.r1) / (1 - d.r1)), 4)} = ${z(Math.atanh(d.r1), 3)}`)] },
    { id: 'z2', stellen: 3, toleranz: 0.002, soll: d => Math.atanh(d.r2),
      frage: P('Wie groß ist Fisher-z für r = 0,30?', 'How large is Fisher z for r = 0.30?'),
      warum: P('Dieselbe Umrechnung für den Online-Kurs. Bei kleinen r ist z fast gleich r; je größer r, desto mehr zieht z davon.', 'The same conversion for the online course. For small r, z is almost equal to r; the larger r, the more z moves away from it.'),
      tipp: P('(1 + 0,30) : (1 − 0,30) ausrechnen, ln nehmen und halbieren.', 'Work out (1 + 0.30) : (1 − 0.30), take ln and halve.'),
      fehler: [{ wert: d => d.r2, tipp: P('Das ist r selbst, nicht Fisher-z.', 'That is r itself, not Fisher z.') },
        { wert: d => Math.log((1 + d.r2) / (1 - d.r2)), tipp: P('Der Faktor ½ fehlt.', 'The factor ½ is missing.') }],
      weg: (d, z) => [P(`z₂ = ½ · ln((1 + ${z(d.r2, 2)}) : (1 − ${z(d.r2, 2)})) = ½ · ln(${z((1 + d.r2) / (1 - d.r2), 3)}) = ${z(Math.atanh(d.r2), 3)}`, `z₂ = ½ · ln((1 + ${z(d.r2, 2)}) : (1 − ${z(d.r2, 2)})) = ½ · ln(${z((1 + d.r2) / (1 - d.r2), 3)}) = ${z(Math.atanh(d.r2), 3)}`)] },
    { id: 'se', stellen: 3, toleranz: 0.002, soll: d => fSe(d),
      frage: P('Wie groß ist der Standardfehler des Unterschieds der beiden z? Rechnen: √(1 : (n₁ − 3) + 1 : (n₂ − 3)).', 'How large is the standard error of the difference of the two z? Calculate: √(1 : (n₁ − 3) + 1 : (n₂ − 3)).'),
      warum: P('Jedes Fisher-z hat die Varianz 1 : (n − 3). Bei unabhängigen Gruppen addieren sich die Varianzen, und der Standardfehler ist die Wurzel daraus. Die 3 kommt davon, dass für Fisher-z drei Freiheitsgrade fehlen; mit größeren Gruppen wird der Standardfehler kleiner.',
        'Each Fisher z has the variance 1 : (n − 3). For independent groups the variances add up, and the standard error is the root of it. The 3 comes from three degrees of freedom missing for Fisher z; with larger groups the standard error gets smaller.'),
      tipp: P('1 : 37 und 1 : 57 ausrechnen, addieren, dann die Wurzel.', 'Work out 1 : 37 and 1 : 57, add them, then take the root.'),
      fehler: [{ wert: d => wurzel(1 / d.n1 + 1 / d.n2), tipp: P('Hier wurde durch n statt durch n − 3 geteilt.', 'Here the divisor was n instead of n − 3.') },
        { wert: d => 1 / (d.n1 - 3) + 1 / (d.n2 - 3), tipp: P('Das ist die Varianz. Der Standardfehler ist ihre Wurzel.', 'That is the variance. The standard error is its root.') }],
      weg: (d, z) => [P(`1 : ${d.n1 - 3} + 1 : ${d.n2 - 3} = ${z(1 / (d.n1 - 3), 4)} + ${z(1 / (d.n2 - 3), 4)} = ${z(1 / (d.n1 - 3) + 1 / (d.n2 - 3), 4)}; Standardfehler = ${z(fSe(d), 3)}`, `1 : ${d.n1 - 3} + 1 : ${d.n2 - 3} = ${z(1 / (d.n1 - 3), 4)} + ${z(1 / (d.n2 - 3), 4)} = ${z(1 / (d.n1 - 3) + 1 / (d.n2 - 3), 4)}; standard error = ${z(fSe(d), 3)}`)] },
    { id: 'zwert', stellen: 2, toleranz: 0.02, soll: d => fZ(d),
      frage: P('Wie groß ist der Prüfwert Z? Rechnen: (z₁ − z₂) : Standardfehler.', 'How large is the test value Z? Calculate: (z₁ − z₂) : standard error.'),
      warum: P('Z sagt, um wie viele Standardfehler sich die beiden Fisher-z unterscheiden. Ab einem Betrag von 1,96 ist der Unterschied bei α = 0,05 zweiseitig signifikant. Hier ist Z kleiner: Der Unterschied von 0,60 und 0,30 ist mit diesen Gruppengrößen nicht gesichert (p = 0,069). Das heißt nicht, dass die Zusammenhänge gleich sind.',
        'Z tells by how many standard errors the two Fisher z differ. From an absolute value of 1.96 the difference is significant at α = 0.05 two-sided. Here Z is smaller: the difference between 0.60 and 0.30 is not established with these group sizes (p = 0.069). That does not mean the relationships are equal.'),
      tipp: P('z₁ minus z₂ (zwei Rechenschritte zurück) und durch den Standardfehler teilen.', 'z₁ minus z₂ (two steps back) and divide by the standard error.'),
      fehler: [{ wert: d => (d.r1 - d.r2) / fSe(d), tipp: P('Hier wurde der Unterschied der r statt der Fisher-z genommen.', 'Here the difference of the r was used instead of the Fisher z.') },
        { wert: d => (Math.atanh(d.r1) - Math.atanh(d.r2)) / wurzel(1 / d.n1 + 1 / d.n2), tipp: P('Im Standardfehler wurde durch n statt n − 3 geteilt.', 'In the standard error the divisor was n instead of n − 3.') },
        { wert: d => Math.atanh(d.r1) - Math.atanh(d.r2), tipp: P('Das ist nur der Unterschied der z. Es fehlt das Teilen durch den Standardfehler.', 'That is only the difference of the z. Dividing by the standard error is missing.') }],
      weg: (d, z) => [P(`Z = (${z(Math.atanh(d.r1), 3)} − ${z(Math.atanh(d.r2), 3)}) : ${z(fSe(d), 3)} = ${z(Math.atanh(d.r1) - Math.atanh(d.r2), 3)} : ${z(fSe(d), 3)} = ${z(fZ(d), 2)}. Grenze bei α = 0,05: 1,96.`, `Z = (${z(Math.atanh(d.r1), 3)} − ${z(Math.atanh(d.r2), 3)}) : ${z(fSe(d), 3)} = ${z(Math.atanh(d.r1) - Math.atanh(d.r2), 3)} : ${z(fSe(d), 3)} = ${z(fZ(d), 2)}. Limit at α = 0.05: 1.96.`)] }
  ],
  merke: P('Zwei Korrelationen aus unabhängigen Gruppen vergleicht man nicht direkt, sondern über Fisher-z: Z = (z₁ − z₂) : √(1 : (n₁ − 3) + 1 : (n₂ − 3)). Ab |Z| = 1,96 ist der Unterschied bei 5 % Irrtumswahrscheinlichkeit zufällig kaum noch zu erklären. Bei kleinen Gruppen reicht selbst ein großer Unterschied der r oft nicht. Hängen die beiden r an denselben Personen, gilt dieser Test nicht.',
    'Two correlations from independent groups are not compared directly but via Fisher z: Z = (z₁ − z₂) : √(1 : (n₁ − 3) + 1 : (n₂ − 3)). From |Z| = 1.96 the difference can hardly be explained by chance at a 5% error probability. With small groups even a large difference of the r is often not enough. If both r belong to the same people, this test does not apply.'),
  ausprobieren: P('Als Nächstes: Statable hat keinen eigenen Knopf „zwei Korrelationen vergleichen“. Die Karte „Studien zusammenfassen (Meta-Analyse)“ rechnet dasselbe: Korrelation r mit n wählen, die zwei Zeilen eintragen (0,60 mit 40 und 0,30 mit 60). Der Test auf Heterogenität zeigt Q(1) = 3,30 mit p = 0,069. Das ist Z² = 1,82², und p ist dasselbe wie beim Z-Test.',
    'Next: Statable has no button of its own for "compare two correlations". The card "Combine studies (meta-analysis)" calculates the same: choose correlation r with n, enter the two rows (0.60 with 40 and 0.30 with 60). The test for heterogeneity shows Q(1) = 3.30 with p = 0.069. That is Z² = 1.82², and p is the same as for the Z test.')
});

// ---------------------------------------------------------------- 12. Kollinearität: VIF aus R² der Vorhersagegrößen untereinander
export const DATEN_VIF = { r2: [0.2, 0.5, 0.85, 0.9] };
const vifVon = (r2: number) => 1 / (1 - r2);
const VIF = bau({
  id: 'vif-rechnen',
  daten: DATEN_VIF,
  lage: P('Ein Modell sagt die Klausurpunkte aus vier Größen voraus. Zur Probe wurde jede Größe einzeln aus den drei anderen vorhergesagt. Das R² dieser Hilfsmodelle steht in der Tabelle. Je mehr eine Größe in den anderen steckt, desto schlechter lässt sich ihr eigener Beitrag trennen: Kollinearität. Daraus rechnet man Toleranz und VIF.',
    'A model predicts the exam points from four variables. As a test each variable was predicted separately from the other three. The R² of these auxiliary models is in the table. The more a variable is contained in the others, the harder it is to separate its own contribution: collinearity. From this one works out tolerance and VIF.'),
  tabelle: { titel: P('R² jeder Größe aus den drei anderen', 'R² of each variable from the other three'), kopf: [P('Vorhersagegröße', 'Predictor'), P('R² aus den anderen', 'R² from the others')],
    zeilen: [[P('Lernstunden', 'Study hours'), P('0,20', '0.20')], [P('Vorwissen', 'Prior knowledge'), P('0,50', '0.50')], [P('Motivation', 'Motivation'), P('0,85', '0.85')], [P('Selbstvertrauen', 'Self-confidence'), P('0,90', '0.90')]] },
  schritte: [
    { id: 'toleranz', stellen: 2, toleranz: 0.005, soll: d => 1 - d.r2[1]!,
      frage: P('Wie groß ist die Toleranz von „Vorwissen“? Rechnen: 1 − R² aus den anderen.', 'How large is the tolerance of "prior knowledge"? Calculate: 1 − R² from the others.'),
      warum: P('Die Toleranz (Tolerance) ist der Teil einer Größe, der von den anderen Größen nicht erklärt wird: 1 − R². Bei 0,50 ist die Hälfte der Größe eigenständig. Je näher die Toleranz an 0 liegt, desto mehr ist die Größe in den anderen enthalten.', 'The tolerance is the part of a variable that is not explained by the other variables: 1 − R². At 0.50 half of the variable is its own. The closer the tolerance is to 0, the more the variable is contained in the others.'),
      tipp: P('1 minus das R² in der Zeile „Vorwissen“.', '1 minus the R² in the row "prior knowledge".'),
      fehler: [{ wert: d => vifVon(d.r2[1]!), tipp: P('Das ist 1 : Toleranz, also der VIF. Gefragt ist die Toleranz selbst: 1 − R².', 'That is 1 : tolerance, so the VIF. The tolerance itself is asked for: 1 − R².') }],
      weg: (d, z) => [P(`Toleranz = 1 − ${z(d.r2[1]!, 2)} = ${z(1 - d.r2[1]!, 2)}`, `Tolerance = 1 − ${z(d.r2[1]!, 2)} = ${z(1 - d.r2[1]!, 2)}`)] },
    { id: 'vif-m', stellen: 2, toleranz: 0.01, soll: d => vifVon(d.r2[2]!),
      frage: P('Wie groß ist der VIF von „Motivation“? Rechnen: 1 : (1 − R² aus den anderen).', 'How large is the VIF of "motivation"? Calculate: 1 : (1 − R² from the others).'),
      warum: P('Der Varianzinflationsfaktor (VIF) sagt, um welchen Faktor die Varianz des Koeffizienten wegen der Überschneidung aufgebläht ist. Er ist 1 : Toleranz. Faustgrenzen: ab 5 genau hinsehen, ab 10 deutliches Warnzeichen.', 'The variance inflation factor (VIF) tells by which factor the variance of the coefficient is inflated by the overlap. It is 1 : tolerance. Rules of thumb: from 5 look closely, from 10 a clear warning sign.'),
      tipp: P('Erst 1 − 0,85, dann 1 durch dieses Ergebnis.', 'First 1 − 0.85, then 1 divided by this result.'),
      fehler: [{ wert: d => 1 / d.r2[2]!, tipp: P('Hier wurde 1 durch R² geteilt. Im Nenner steht 1 − R².', 'Here 1 was divided by R². The denominator is 1 − R².') },
        { wert: d => 1 - d.r2[2]!, tipp: P('Das ist die Toleranz. Der VIF ist ihr Kehrwert.', 'That is the tolerance. The VIF is its reciprocal.') },
        { wert: d => d.r2[2]! / (1 - d.r2[2]!), tipp: P('Das Verhältnis R² : (1 − R²) ist eine andere Größe (Odds). Beim VIF steht im Zähler 1.', 'The ratio R² : (1 − R²) is another quantity (odds). For the VIF the numerator is 1.') }],
      weg: (d, z) => [P(`VIF = 1 : (1 − ${z(d.r2[2]!, 2)}) = 1 : ${z(1 - d.r2[2]!, 2)} = ${z(vifVon(d.r2[2]!), 2)}`, `VIF = 1 : (1 − ${z(d.r2[2]!, 2)}) = 1 : ${z(1 - d.r2[2]!, 2)} = ${z(vifVon(d.r2[2]!), 2)}`)] },
    { id: 'vif-s', stellen: 1, toleranz: 0.05, soll: d => vifVon(d.r2[3]!),
      frage: P('Wie groß ist der VIF von „Selbstvertrauen“?', 'How large is the VIF of "self-confidence"?'),
      warum: P('Bei R² = 0,90 sind 90 Prozent der Größe in den anderen enthalten. Der VIF erreicht 10, die gängige Grenze für ein deutliches Warnzeichen. Das Modell kann trotzdem gut vorhersagen; unsicher wird das einzelne B.', 'At R² = 0.90, 90 percent of the variable is contained in the others. The VIF reaches 10, the usual limit for a clear warning sign. The model can still predict well; it is the single B that becomes uncertain.'),
      tipp: P('1 : (1 − 0,90) = 1 : 0,10.', '1 : (1 − 0.90) = 1 : 0.10.'),
      fehler: [{ wert: d => 1 / d.r2[3]!, tipp: P('Hier wurde 1 durch R² geteilt. Im Nenner steht 1 − R².', 'Here 1 was divided by R². The denominator is 1 − R².') },
        { wert: d => 1 - d.r2[3]!, tipp: P('Das ist die Toleranz. Der VIF ist ihr Kehrwert.', 'That is the tolerance. The VIF is its reciprocal.') },
        { wert: d => d.r2[3]! / (1 - d.r2[3]!), tipp: P('Das ist R² : (1 − R²), nicht 1 : (1 − R²).', 'That is R² : (1 − R²), not 1 : (1 − R²).') }],
      weg: (d, z) => [P(`VIF = 1 : (1 − ${z(d.r2[3]!, 2)}) = 1 : ${z(1 - d.r2[3]!, 2)} = ${z(vifVon(d.r2[3]!), 1)}`, `VIF = 1 : (1 − ${z(d.r2[3]!, 2)}) = 1 : ${z(1 - d.r2[3]!, 2)} = ${z(vifVon(d.r2[3]!), 1)}`)] },
    { id: 'faktor-se', stellen: 2, toleranz: 0.01, soll: d => wurzel(vifVon(d.r2[2]!)),
      frage: P('Um welchen Faktor ist der Standardfehler von B bei „Motivation“ größer, als er ohne Überschneidung wäre? Rechnen: √VIF.', 'By which factor is the standard error of B for "motivation" larger than it would be without overlap? Calculate: √VIF.'),
      warum: P('Der VIF bläht die Varianz auf, der Standardfehler ist die Wurzel der Varianz. Er wächst also um √VIF. Die Intervalle des B sind entsprechend breiter, und ein echter Einfluss kann nicht mehr signifikant werden. Mehr Fälle oder weniger überlappende Größen helfen.', 'The VIF inflates the variance, the standard error is the root of the variance. So it grows by √VIF. The intervals of B are correspondingly wider, and a real influence may no longer become significant. More cases or less overlapping variables help.'),
      tipp: P('Die Wurzel aus dem VIF von „Motivation“ ziehen.', 'Take the root of the VIF of "motivation".'),
      fehler: [{ wert: d => vifVon(d.r2[2]!), tipp: P('Das ist der VIF selbst. Der Standardfehler wächst nur um seine Wurzel.', 'That is the VIF itself. The standard error only grows by its root.') },
        { wert: d => vifVon(d.r2[2]!) / 2, tipp: P('Hier wurde der VIF halbiert statt die Wurzel zu ziehen.', 'Here the VIF was halved instead of taking the root.') }],
      weg: (d, z) => [P(`√${z(vifVon(d.r2[2]!), 2)} = ${z(wurzel(vifVon(d.r2[2]!)), 2)}: Der Standardfehler ist etwa ${z(wurzel(vifVon(d.r2[2]!)), 1)}-mal so groß.`, `√${z(vifVon(d.r2[2]!), 2)} = ${z(wurzel(vifVon(d.r2[2]!)), 2)}: the standard error is about ${z(wurzel(vifVon(d.r2[2]!)), 1)} times as large.`)] }
  ],
  merke: P('Toleranz = 1 − R² aus den anderen Größen, VIF = 1 : Toleranz. Der Standardfehler von B wächst um √VIF. Ein hoher VIF macht das einzelne B unsicher, nicht das Modell unbrauchbar. Wer ihn findet, kann Größen zusammenfassen, eine weglassen oder mehr Fälle erheben.',
    'Tolerance = 1 − R² from the other variables, VIF = 1 : tolerance. The standard error of B grows by √VIF. A high VIF makes the single B uncertain, not the model useless. Whoever finds one can combine variables, drop one or collect more cases.'),
  ausprobieren: P('Als Nächstes: Das Beispiel „Autos“ öffnen, im Schritt „Drei eng verbundene Größen“ unter dem Ergebnis „Regression prüfen“ aufklappen. Dort stehen Toleranz und VIF: Hubraum VIF 7,33 (Toleranz 0,137, also R² aus den anderen 0,86), Gewicht 4,85, Leistung 2,74. Nur der Hubraum liegt über 5.',
    'Next: open the example "Cars", in the step "Three closely related variables" open "Checking the regression" under the result. Tolerance and VIF are shown there: displacement VIF 7.33 (tolerance 0.137, so R² from the others 0.86), weight 4.85, power 2.74. Only displacement is above 5.')
});

// ---------------------------------------------------------------- 13. Ausreißer: Grenzen lesen
export const DATEN_GRENZEN = { n: 40, k: 3, faelle: [{ zeile: 7, h: 0.08, c: 0.02 }, { zeile: 12, h: 0.22, c: 0.03 }, { zeile: 19, h: 0.12, c: 0.15 }, { zeile: 23, h: 0.31, c: 0.2 }, { zeile: 31, h: 0.05, c: 0.04 }, { zeile: 38, h: 0.18, c: 0.45 }] };
type DG = typeof DATEN_GRENZEN;
const gH = (d: DG) => (2 * (d.k + 1)) / d.n, gC = (d: DG) => 4 / d.n;
const GRENZEN = bau({
  id: 'ausreisser-grenzen',
  daten: DATEN_GRENZEN,
  lage: P('Eine Regression mit 40 Fällen und 3 Vorhersagegrößen zeigt unter „Regression prüfen“ sechs Fälle, die auffallen. Für jeden stehen Hebelwert und Cooks Distanz in der Tabelle. Welche Fälle sind wirklich zu prüfen? Dazu braucht man die beiden Faustgrenzen: für den Hebelwert 2 · (k + 1) : n, für Cooks Distanz 4 : n.',
    'A regression with 40 cases and 3 predictors shows six cases that stand out under "Checking the regression". For each, leverage and Cook\'s distance are in the table. Which cases really have to be checked? For this one needs the two rules of thumb: for the leverage 2 · (k + 1) : n, for Cook\'s distance 4 : n.'),
  tabelle: { titel: P('Auffällige Fälle', 'Cases that stand out'), kopf: [P('Zeile in den Daten', 'Row in the data'), P('Hebelwert', 'Leverage'), P('Cooks Distanz', 'Cook\'s distance')],
    zeilen: DATEN_GRENZEN.faelle.map(f => [`${f.zeile}`, P(dz(f.h, 2), ez(f.h, 2)), P(dz(f.c, 2), ez(f.c, 2))]) },
  schritte: [
    { id: 'grenze-hebel', stellen: 2, toleranz: 0.005, soll: d => gH(d),
      frage: P('Wie groß ist die Faustgrenze für den Hebelwert? Rechnen: 2 · (k + 1) : n mit k = 3 Vorhersagegrößen und n = 40.', 'How large is the rule of thumb for the leverage? Calculate: 2 · (k + 1) : n with k = 3 predictors and n = 40.'),
      warum: P('Der Durchschnitt aller Hebelwerte ist (k + 1) : n, denn die Konstante zählt mit. Als auffällig gilt ein Fall mit dem Doppelten davon. Das ist eine Faustregel, kein Gesetz: Bei kleinen Stichproben wird auch das Dreifache genannt.', 'The average of all leverages is (k + 1) : n, because the constant counts. A case with twice that stands out. This is a rule of thumb, not a law: for small samples three times is also mentioned.'),
      tipp: P('Erst k + 1 = 4, dann mal 2 und durch 40.', 'First k + 1 = 4, then times 2 and divided by 40.'),
      fehler: [{ wert: d => (2 * d.k) / d.n, tipp: P('Die Konstante zählt mit: k + 1, nicht k.', 'The constant counts: k + 1, not k.') },
        { wert: d => (d.k + 1) / d.n, tipp: P('Das ist der Durchschnitt aller Hebelwerte. Die Grenze ist das Doppelte davon.', 'That is the average of all leverages. The limit is twice that.') }],
      weg: (d, z) => [P(`2 · (${d.k} + 1) : ${d.n} = ${2 * (d.k + 1)} : ${d.n} = ${z(gH(d), 2)}`, `2 · (${d.k} + 1) : ${d.n} = ${2 * (d.k + 1)} : ${d.n} = ${z(gH(d), 2)}`)] },
    { id: 'grenze-cook', stellen: 2, toleranz: 0.005, soll: d => gC(d),
      frage: P('Wie groß ist die Faustgrenze für Cooks Distanz? Rechnen: 4 : n.', 'How large is the rule of thumb for Cook\'s distance? Calculate: 4 : n.'),
      warum: P('Die Grenze 4 : n sinkt mit der Fallzahl: In großen Datensätzen soll schon ein kleinerer Einfluss auffallen. Ab Cooks Distanz 1 ist der Einfluss sehr stark. Auch hier gilt: Faustregeln, andere Quellen nennen 0,5.', 'The limit 4 : n falls with the number of cases: in large data sets a smaller influence is meant to stand out. From Cook\'s distance 1 the influence is very strong. Here too: rules of thumb, other sources name 0.5.'),
      tipp: P('4 geteilt durch die Zahl der Fälle.', '4 divided by the number of cases.'),
      fehler: [{ wert: d => gH(d), tipp: P('Das ist die Grenze für den Hebelwert, nicht für Cooks Distanz.', 'That is the limit for the leverage, not for Cook\'s distance.') },
        { wert: d => 2 / d.n, tipp: P('Im Zähler steht 4, nicht 2.', 'The numerator is 4, not 2.') }],
      weg: (d, z) => [P(`4 : ${d.n} = ${z(gC(d), 2)}`, `4 : ${d.n} = ${z(gC(d), 2)}`)] },
    { id: 'zahl-hebel', stellen: 0, toleranz: 0.01, soll: d => d.faelle.filter(f => f.h > gH(d)).length,
      frage: P('Bei wie vielen der sechs Fälle liegt der Hebelwert über seiner Grenze?', 'For how many of the six cases is the leverage above its limit?'),
      warum: P('Ein hoher Hebelwert heißt nur: Der Fall liegt am Rand der Vorhersagegrößen. Er kann die Gerade stark ziehen, muss es aber nicht. Darum schaut man zusätzlich auf Cooks Distanz.', 'A high leverage only means: the case lies at the edge of the predictors. It can pull the line strongly but does not have to. So one also looks at Cook\'s distance.'),
      tipp: P('Den Hebelwert jeder Zeile mit der Grenze aus dem ersten Schritt vergleichen und die Treffer zählen.', 'Compare the leverage of each row with the limit from the first step and count the hits.'),
      fehler: [{ wert: d => d.faelle.filter(f => f.c > gC(d)).length, tipp: P('Das ist die Zahl der Fälle über der Grenze von Cooks Distanz. Gefragt ist der Hebelwert.', 'That is the number of cases above the limit of Cook\'s distance. The leverage is asked for.') },
        { wert: d => d.faelle.filter(f => f.h > (d.k + 1) / d.n).length, tipp: P('Hier wurde mit dem Durchschnitt (0,10) statt mit dem Doppelten (0,20) verglichen.', 'Here the comparison was with the average (0.10) instead of twice that (0.20).') }],
      weg: (d, z) => [P(`Über ${z(gH(d), 2)}: Zeilen ${d.faelle.filter(f => f.h > gH(d)).map(f => f.zeile).join(', ')}. Das sind ${z(d.faelle.filter(f => f.h > gH(d)).length)} Fälle.`, `Above ${z(gH(d), 2)}: rows ${d.faelle.filter(f => f.h > gH(d)).map(f => f.zeile).join(', ')}. That is ${z(d.faelle.filter(f => f.h > gH(d)).length)} cases.`)] },
    { id: 'beide', stellen: 0, toleranz: 0.01, soll: d => d.faelle.filter(f => f.h > gH(d) && f.c > gC(d)).length,
      frage: P('Wie viele Fälle liegen über beiden Grenzen, bei Hebelwert und bei Cooks Distanz?', 'How many cases are above both limits, for leverage and for Cook\'s distance?'),
      warum: P('Wer am Rand liegt und die Gerade tatsächlich verschiebt, ist der Fall, den man zuerst prüft: Ist es ein Tippfehler? Gehört er zu einer anderen Gruppe? Gelöscht wird nie automatisch; man rechnet mit und ohne ihn und berichtet beides.', 'Whoever lies at the edge and really moves the line is the case to check first: is it a typing error? Does it belong to another group? Nothing is deleted automatically; one calculates with and without it and reports both.'),
      tipp: P('Nur Zeilen zählen, bei denen beide Zahlen über ihrer Grenze liegen.', 'Count only rows where both numbers are above their limit.'),
      fehler: [{ wert: d => d.faelle.filter(f => f.h > gH(d)).length, tipp: P('Das sind alle Fälle mit hohem Hebel. Gesucht sind die, bei denen zusätzlich Cooks Distanz über der Grenze liegt.', 'These are all cases with high leverage. The ones where Cook\'s distance is also above the limit are asked for.') },
        { wert: d => d.faelle.filter(f => f.c > gC(d)).length, tipp: P('Das sind alle Fälle mit großem Einfluss. Gesucht sind die, bei denen zusätzlich der Hebelwert über der Grenze liegt.', 'These are all cases with large influence. The ones where the leverage is also above the limit are asked for.') }],
      weg: (d, z) => [P(`Hebel über ${z(gH(d), 2)}: Zeilen ${d.faelle.filter(f => f.h > gH(d)).map(f => f.zeile).join(', ')}. Cook über ${z(gC(d), 2)}: Zeilen ${d.faelle.filter(f => f.c > gC(d)).map(f => f.zeile).join(', ')}. In beiden Listen: ${z(d.faelle.filter(f => f.h > gH(d) && f.c > gC(d)).length)} Fall (Zeile ${d.faelle.filter(f => f.h > gH(d) && f.c > gC(d)).map(f => f.zeile).join(', ')}).`, `Leverage above ${z(gH(d), 2)}: rows ${d.faelle.filter(f => f.h > gH(d)).map(f => f.zeile).join(', ')}. Cook above ${z(gC(d), 2)}: rows ${d.faelle.filter(f => f.c > gC(d)).map(f => f.zeile).join(', ')}. In both lists: ${z(d.faelle.filter(f => f.h > gH(d) && f.c > gC(d)).length)} case (row ${d.faelle.filter(f => f.h > gH(d) && f.c > gC(d)).map(f => f.zeile).join(', ')}).`)] }
  ],
  merke: P('Hebelwert über 2 · (k + 1) : n: Der Fall liegt am Rand der Vorhersagegrößen. Cooks Distanz über 4 : n: Er verschiebt die Vorhersage der anderen Fälle spürbar. Beides zusammen verdient den ersten Blick. Faustregeln, keine Gesetze; gelöscht wird nie automatisch.',
    'Leverage above 2 · (k + 1) : n: the case lies at the edge of the predictors. Cook\'s distance above 4 : n: it noticeably shifts the predictions of the other cases. Both together deserve the first look. Rules of thumb, not laws; nothing is deleted automatically.'),
  ausprobieren: P('Als Nächstes: Das Beispiel „Autos“ öffnen, im Schritt „Drei eng verbundene Größen“ unter dem Ergebnis „Regression prüfen“ aufklappen. Bei n = 32 und k = 3 sind die Grenzen 0,25 und 0,125. Der Maserati Bora (Zeile 31) liegt mit Hebelwert 0,499 und Cooks Distanz 0,340 über beiden.',
    'Next: open the example "Cars", in the step "Three closely related variables" open "Checking the regression" under the result. With n = 32 and k = 3 the limits are 0.25 and 0.125. The Maserati Bora (row 31) is above both with leverage 0.499 and Cook\'s distance 0.340.')
});

export const AUFGABEN: Rechenaufgabe[] = [MODELL, FREI, SIGNAL, GRUPPEN, RESTE, ACHSE, ANLEGEN, EINFLUSS, BEITRAG, UEBER, FISHER, VIF, GRENZEN, ...AUFGABEN_VV, ...AUFGABEN_SF, ...AUFGABEN_NUTZEN, ...AUFGABEN_NUTZEN_B, ...AUFGABEN_PSYCH];
export const aufgabeNach = (id: string): Rechenaufgabe | undefined => AUFGABEN.find(a => a.id === id);
