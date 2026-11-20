/**
 * Rechenaufgaben des Lernpfads „Varianzanalyse vertiefen“ (Field-Stufe 3, 05.11.2026): geplanter Kontrast, Trend über Stufen, Differenz der Differenzen,
 * einfache Effekte, Varianzen der Differenzen (Sphärizität) und Familienfehler. Aufbau und Regeln wie in `rechenaufgaben.ts`; alle Zahlen sind erfunden.
 * Das Soll steht nie von Hand da, sondern wird in `bau` aus den Rohdaten gerechnet. Der Wächter `rechenaufgaben.test.ts` rechnet jede Lösung mit R nach
 * (`rechenaufgaben-vv.soll.ts` liest `lib/testdaten/ueben-erwartet-varianzanalyse-vertiefen.json`, erzeugt von `scripts/ueben-erwartet-varianzanalyse-vertiefen.R`).
 */
import { P } from '../i18n/laufzeit';
import { bau, mittel, quadratsumme, summe, type Rechenaufgabe } from './rechenaufgaben-bau';

// ---------------------------------------------------------------- 1. Geplanter Kontrast
/** Drei Gruppen mit je 10 Personen; Frage vorab: Liegt die Kontrollgruppe anders als die beiden Methoden zusammen? Gewichte −2, +1, +1. */
export const DATEN_KONTRAST = { namen: ['Kontrolle', 'Methode A', 'Methode B'], m: [12, 15, 17], n: 10, mse: 16, w: [-2, 1, 1], alpha: 5 };
type DK = typeof DATEN_KONTRAST;
const kL = (d: DK) => summe(d.w.map((w, i) => w * d.m[i]!));
const kSw2 = (d: DK) => summe(d.w.map(w => w * w));
const kSE = (d: DK) => Math.sqrt((d.mse * kSw2(d)) / d.n);
const kPaare = (d: DK) => (d.m.length * (d.m.length - 1)) / 2;
const KONTRAST = bau({
  id: 'kontrast-rechnen',
  daten: DATEN_KONTRAST,
  lage: P('Drei Gruppen mit je 10 Personen üben mit verschiedenen Methoden: Kontrolle (ohne Methode), Methode A und Methode B. Vor der Studie stand fest, welche Frage zählt: Liegt die Kontrollgruppe anders als die beiden Methoden zusammen? Dafür gibt es einen geplanten Vergleich (Kontrast) mit den Gewichten −2, +1 und +1. Die gemeinsame Fehlervarianz (mittlere Quadratsumme innerhalb) aus der Varianzanalyse beträgt 16.',
    'Three groups of 10 people each practise with different methods: control (no method), method A and method B. Before the study it was fixed which question counts: does the control group lie differently from the two methods together? For this there is a planned comparison (contrast) with the weights −2, +1 and +1. The pooled error variance (mean square within) from the analysis of variance is 16.'),
  tabelle: { titel: P('Gruppenmittelwerte', 'Group means'), kopf: [P('Gruppe', 'Group'), P('Mittelwert', 'Mean'), P('Gewicht', 'Weight')],
    zeilen: DATEN_KONTRAST.namen.map((n, i) => [n === 'Kontrolle' ? P('Kontrolle', 'Control') : n === 'Methode A' ? P('Methode A', 'Method A') : P('Methode B', 'Method B'), DATEN_KONTRAST.m[i]!, DATEN_KONTRAST.w[i]!]) },
  schritte: [
    { id: 'wert', stellen: 0, toleranz: 0.01, soll: kL,
      frage: P('Wie groß ist der Kontrastwert? Jeder Mittelwert wird mit seinem Gewicht multipliziert, danach werden die drei Produkte addiert.', 'How large is the contrast value? Each mean is multiplied by its weight, then the three products are added.'),
      warum: P('Der Kontrastwert ist eine gewichtete Summe der Gruppenmittel. Weil die Gewichte zusammen 0 ergeben, steht dort ein Unterschied: hier die beiden Methoden (je +1) gegen die Kontrolle (−2, das Doppelte, weil sie allein gegen zwei Gruppen steht).',
        'The contrast value is a weighted sum of the group means. Because the weights add up to 0, a difference results: here the two methods (+1 each) against the control (−2, twice as much because it stands alone against two groups).'),
      tipp: P('Rechnen: (−2) · 12 + 1 · 15 + 1 · 17.', 'Calculate: (−2) · 12 + 1 · 15 + 1 · 17.'),
      fehler: [
        { wert: d => mittel([d.m[1]!, d.m[2]!]) - d.m[0]!, tipp: P('Das ist der Unterschied zwischen dem Mittel der beiden Methoden und der Kontrolle. Mit den Gewichten −2, +1, +1 wird der Wert doppelt so groß.', 'That is the difference between the mean of the two methods and the control. With the weights −2, +1, +1 the value becomes twice as large.') },
        { wert: d => summe(d.m.map((m, i) => (i === 0 ? -1 : 1) * m)), tipp: P('Hier wurde mit −1, +1, +1 gerechnet. Diese Gewichte ergeben zusammen 1 und nicht 0, also ist es kein Kontrast.', 'Here −1, +1, +1 were used. These weights add up to 1 and not 0, so this is not a contrast.') }
      ],
      weg: (d, z) => [
        P(`Produkte: (${z(d.w[0]!)}) · ${z(d.m[0]!)} = ${z(d.w[0]! * d.m[0]!)}; ${z(d.w[1]!)} · ${z(d.m[1]!)} = ${z(d.w[1]! * d.m[1]!)}; ${z(d.w[2]!)} · ${z(d.m[2]!)} = ${z(d.w[2]! * d.m[2]!)}`, `Products: (${z(d.w[0]!)}) · ${z(d.m[0]!)} = ${z(d.w[0]! * d.m[0]!)}; ${z(d.w[1]!)} · ${z(d.m[1]!)} = ${z(d.w[1]! * d.m[1]!)}; ${z(d.w[2]!)} · ${z(d.m[2]!)} = ${z(d.w[2]! * d.m[2]!)}`),
        P(`Kontrastwert: ${z(d.w[0]! * d.m[0]!)} + ${z(d.w[1]! * d.m[1]!)} + ${z(d.w[2]! * d.m[2]!)} = ${z(kL(d))}`, `Contrast value: ${z(d.w[0]! * d.m[0]!)} + ${z(d.w[1]! * d.m[1]!)} + ${z(d.w[2]! * d.m[2]!)} = ${z(kL(d))}`)
      ] },
    { id: 'se', stellen: 2, toleranz: 0.005, soll: kSE,
      frage: P('Wie groß ist der Standardfehler des Kontrasts? Rechnen: Wurzel aus (Fehlervarianz mal Summe der quadrierten Gewichte, geteilt durch die Personenzahl je Gruppe).', 'How large is the standard error of the contrast? Calculate: square root of (error variance times the sum of the squared weights, divided by the number of people per group).'),
      warum: P('Jede Gruppe trägt ihre Unsicherheit bei, und zwar mit dem Quadrat ihres Gewichts: Ein Mittelwert mit großem Gewicht verstärkt auch seinen Zufallsfehler. Darum steht die Summe der quadrierten Gewichte unter der Wurzel, geteilt durch die Zahl der Personen je Gruppe.',
        'Each group contributes its uncertainty, with the square of its weight: a mean with a large weight also amplifies its chance error. That is why the sum of the squared weights stands under the root, divided by the number of people per group.'),
      tipp: P('Erst die Gewichte quadrieren und addieren (4 + 1 + 1), dann mal 16, durch 10 teilen und die Wurzel ziehen.', 'First square and add the weights (4 + 1 + 1), then times 16, divide by 10 and take the root.'),
      fehler: [
        { wert: d => Math.sqrt(d.mse * kSw2(d)), tipp: P('Das Teilen durch die Personenzahl je Gruppe fehlt.', 'Dividing by the number of people per group is missing.') },
        { wert: d => (d.mse * kSw2(d)) / d.n, tipp: P('Das ist die Varianz des Kontrasts. Der Standardfehler ist ihre Wurzel.', 'That is the variance of the contrast. The standard error is its root.') },
        { wert: d => Math.sqrt(d.mse / d.n), tipp: P('Das ist der Standardfehler eines einzelnen Gruppenmittels. Beim Kontrast kommen die quadrierten Gewichte dazu.', 'That is the standard error of a single group mean. For the contrast the squared weights are added.') }
      ],
      weg: (d, z) => [
        P(`Summe der quadrierten Gewichte: ${d.w.map(w => `(${z(w)})²`).join(' + ')} = ${z(kSw2(d))}`, `Sum of the squared weights: ${d.w.map(w => `(${z(w)})²`).join(' + ')} = ${z(kSw2(d))}`),
        P(`Standardfehler: Wurzel aus (${z(d.mse)} · ${z(kSw2(d))} : ${z(d.n)}) = Wurzel aus ${z((d.mse * kSw2(d)) / d.n, 2)} = ${z(kSE(d), 2)}`, `Standard error: square root of (${z(d.mse)} · ${z(kSw2(d))} : ${z(d.n)}) = square root of ${z((d.mse * kSw2(d)) / d.n, 2)} = ${z(kSE(d), 2)}`)
      ] },
    { id: 't', stellen: 2, toleranz: 0.005, soll: d => kL(d) / kSE(d),
      frage: P('Wie groß ist t für den Kontrast? Rechnen: Kontrastwert durch Standardfehler.', 'How large is t for the contrast? Calculate: contrast value divided by standard error.'),
      warum: P('Wie bei jedem t-Wert steht das Signal (der Kontrastwert) über dem Rauschen (dem Standardfehler). Die Freiheitsgrade sind die der Fehlervarianz: 30 Personen minus 3 Gruppen, also 27.', 'As with every t value the signal (the contrast value) stands over the noise (the standard error). The degrees of freedom are those of the error variance: 30 people minus 3 groups, so 27.'),
      tipp: P('Den Kontrastwert aus dem ersten Schritt durch den Standardfehler aus dem zweiten Schritt teilen.', 'Divide the contrast value from the first step by the standard error from the second step.'),
      fehler: [
        { wert: d => kL(d) / d.mse, tipp: P('Hier wurde durch die Fehlervarianz geteilt. Geteilt wird durch den Standardfehler des Kontrasts.', 'Here the division was by the error variance. The division is by the standard error of the contrast.') },
        { wert: d => kL(d) / Math.sqrt(d.mse / d.n), tipp: P('Hier wurde durch den Standardfehler eines einzelnen Mittels geteilt. Der Kontrast hat seinen eigenen, größeren Standardfehler.', 'Here the division was by the standard error of a single mean. The contrast has its own, larger standard error.') }
      ],
      weg: (d, z) => [P(`t = ${z(kL(d))} : ${z(kSE(d), 2)} = ${z(kL(d) / kSE(d), 2)} (Freiheitsgrade: ${z(d.n * d.m.length - d.m.length)})`, `t = ${z(kL(d))} : ${z(kSE(d), 2)} = ${z(kL(d) / kSE(d), 2)} (degrees of freedom: ${z(d.n * d.m.length - d.m.length)})`)] },
    { id: 'alpha', stellen: 2, toleranz: 0.005, einheit: P('%', '%'), soll: d => d.alpha / kPaare(d),
      frage: P('Hätte man stattdessen alle Paare nach Bonferroni verglichen, dürfte jeder Paarvergleich nur mit einem Bruchteil von 5 % geprüft werden. Wie viel Prozent sind es bei den drei Gruppen?', 'Had all pairs been compared with Bonferroni instead, each pairwise comparison could only be tested with a fraction of 5%. How many percent is that with the three groups?'),
      warum: P('Drei Gruppen ergeben drei Paare (A gegen Kontrolle, B gegen Kontrolle, A gegen B). Bonferroni teilt das Niveau durch die Zahl der Vergleiche. Der geplante Kontrast ist eine einzige Frage und darf das volle Niveau nutzen: Planen spart Strenge.', 'Three groups give three pairs (A against control, B against control, A against B). Bonferroni divides the level by the number of comparisons. The planned contrast is a single question and may use the full level: planning saves strictness.'),
      tipp: P('Erst die Zahl der Paare bei drei Gruppen bestimmen, dann 5 % durch diese Zahl teilen.', 'First find the number of pairs for three groups, then divide 5% by that number.'),
      fehler: [
        { wert: d => d.alpha, tipp: P('Das ist das Niveau ohne jede Korrektur. Gefragt ist der Anteil je Paarvergleich.', 'That is the level without any correction. The share per pairwise comparison is asked for.') },
        { wert: d => d.alpha / (d.m.length - 1), tipp: P('Hier wurde durch die Zahl der Gruppen minus 1 geteilt. Zählen müssen alle Paare, also 3.', 'Here the division was by the number of groups minus 1. All pairs have to be counted, which is 3.') }
      ],
      weg: (d, z) => [
        P(`Zahl der Paare: ${d.m.length} · ${d.m.length - 1} : 2 = ${z(kPaare(d))}`, `Number of pairs: ${d.m.length} · ${d.m.length - 1} : 2 = ${z(kPaare(d))}`),
        P(`Niveau je Paar: ${z(d.alpha)} % : ${z(kPaare(d))} = ${z(d.alpha / kPaare(d), 2)} %`, `Level per pair: ${z(d.alpha)}% : ${z(kPaare(d))} = ${z(d.alpha / kPaare(d), 2)}%`)
      ] }
  ],
  merke: P('Kontrastwert = Summe aus Gewicht mal Mittelwert; die Gewichte ergeben zusammen 0. Standardfehler = Wurzel aus (Fehlervarianz · Summe der quadrierten Gewichte : n je Gruppe), t = Kontrastwert : Standardfehler. Ein geplanter Kontrast beantwortet eine Frage, die vor den Daten feststand, mit dem vollen Niveau; Paarvergleiche danach müssen das Niveau teilen.',
    'Contrast value = sum of weight times mean; the weights add up to 0. Standard error = square root of (error variance · sum of squared weights : n per group), t = contrast value : standard error. A planned contrast answers a question that was fixed before the data, with the full level; pairwise comparisons afterwards have to share the level.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Nitrat im Wasser“ öffnen, im Schritt „Drei Gebiete vergleichen“ unter der Varianzanalyse „Geplante Vergleiche (Kontraste) und Trendanalyse“ aufklappen. Die Vorlage „Helmert“ einsetzen oder eigene Gewichte eintragen, etwa −2, +1, +1, und den Kontrastwert mit der eigenen Rechnung vergleichen.',
    'Next: open the example "Nitrate in water", in the step "Comparing three areas" open "Planned comparisons (contrasts) and trend analysis" below the analysis of variance. Insert the template "Helmert" or enter your own weights, for example −2, +1, +1, and compare the contrast value with your own calculation.')
});

// ---------------------------------------------------------------- 2. Trend über Stufen
/** Vier gleich weit entfernte Stufen (Übungsstunden je Woche 0 bis 3), 8 Personen je Stufe, Fehlervarianz 12. */
export const DATEN_TREND = { m: [10, 14, 15, 17], n: 8, mse: 12, lin: [-3, -1, 1, 3] };
type DT = typeof DATEN_TREND;
const tL = (d: DT) => summe(d.lin.map((w, i) => w * d.m[i]!));
const tSw2 = (d: DT) => summe(d.lin.map(w => w * w));
const tSE = (d: DT) => Math.sqrt((d.mse * tSw2(d)) / d.n);
const tSSlin = (d: DT) => (tL(d) * tL(d)) / (tSw2(d) / d.n);
const tSSzw = (d: DT) => d.n * quadratsumme(d.m);
const TREND = bau({
  id: 'trend-kontrast',
  daten: DATEN_TREND,
  lage: P('Vier Gruppen mit je 8 Personen üben null, eine, zwei oder drei Stunden pro Woche. Die Stufen liegen gleich weit auseinander. Gefragt ist der lineare Trend: Steigt der Mittelwert gleichmäßig mit den Stunden? Die Gewichte dafür sind −3, −1, +1, +3. Die gemeinsame Fehlervarianz beträgt 12.',
    'Four groups of 8 people each practise zero, one, two or three hours per week. The levels are equally spaced. The linear trend is asked for: does the mean rise evenly with the hours? The weights for it are −3, −1, +1, +3. The pooled error variance is 12.'),
  tabelle: { titel: P('Mittelwerte nach Übungsstunden', 'Means by practice hours'), kopf: [P('Stunden pro Woche', 'Hours per week'), P('Mittelwert', 'Mean'), P('Gewicht (linear)', 'Weight (linear)')],
    zeilen: DATEN_TREND.m.map((m, i) => [`${i}`, m, DATEN_TREND.lin[i]!]) },
  schritte: [
    { id: 'wert', stellen: 0, toleranz: 0.01, soll: tL,
      frage: P('Wie groß ist die lineare Kontrastsumme? Jeder Mittelwert wird mit seinem Gewicht multipliziert, danach werden die vier Produkte addiert.', 'How large is the linear contrast sum? Each mean is multiplied by its weight, then the four products are added.'),
      warum: P('Die Gewichte −3, −1, +1, +3 bilden eine Gerade nach: Sie steigen von Stufe zu Stufe gleich stark. Die Summe wird groß, wenn die Mittelwerte einer Geraden folgen, und klein, wenn sie hin und her springen oder sich biegen.', 'The weights −3, −1, +1, +3 imitate a straight line: they rise equally from level to level. The sum becomes large when the means follow a straight line and small when they jump back and forth or bend.'),
      tipp: P('Rechnen: (−3) · 10 + (−1) · 14 + 1 · 15 + 3 · 17.', 'Calculate: (−3) · 10 + (−1) · 14 + 1 · 15 + 3 · 17.'),
      fehler: [
        { wert: d => d.m[3]! - d.m[0]!, tipp: P('Das ist nur der Unterschied zwischen der ersten und der letzten Stufe. Alle vier Mittelwerte bekommen ein Gewicht.', 'That is only the difference between the first and the last level. All four means get a weight.') },
        { wert: d => d.m[0]! - d.m[1]! - d.m[2]! + d.m[3]!, tipp: P('Das sind die Gewichte für den quadratischen Trend (+1, −1, −1, +1). Gefragt ist der lineare Trend.', 'These are the weights for the quadratic trend (+1, −1, −1, +1). The linear trend is asked for.') }
      ],
      weg: (d, z) => [
        P(`Produkte: ${d.lin.map((w, i) => `(${z(w)}) · ${z(d.m[i]!)} = ${z(w * d.m[i]!)}`).join('; ')}`, `Products: ${d.lin.map((w, i) => `(${z(w)}) · ${z(d.m[i]!)} = ${z(w * d.m[i]!)}`).join('; ')}`),
        P(`Summe: ${d.lin.map((w, i) => z(w * d.m[i]!)).join(' + ')} = ${z(tL(d))}`, `Sum: ${d.lin.map((w, i) => z(w * d.m[i]!)).join(' + ')} = ${z(tL(d))}`)
      ] },
    { id: 'se', stellen: 2, toleranz: 0.005, soll: tSE,
      frage: P('Wie groß ist der Standardfehler dieses Kontrasts? Rechnen: Wurzel aus (Fehlervarianz mal Summe der quadrierten Gewichte, geteilt durch die Personenzahl je Gruppe).', 'How large is the standard error of this contrast? Calculate: square root of (error variance times the sum of the squared weights, divided by the number of people per group).'),
      warum: P('Die Gewichte −3 und +3 sind groß, also verstärken sie den Zufallsfehler der Randstufen stark. Das drückt die Summe der quadrierten Gewichte aus (9 + 1 + 1 + 9 = 20). Der Standardfehler wächst mit ihr, so wie der Kontrastwert selbst.', 'The weights −3 and +3 are large, so they strongly amplify the chance error of the outer levels. The sum of the squared weights expresses that (9 + 1 + 1 + 9 = 20). The standard error grows with it, just as the contrast value itself does.'),
      tipp: P('Erst 9 + 1 + 1 + 9 rechnen, dann mal 12, durch 8 teilen und die Wurzel ziehen.', 'First calculate 9 + 1 + 1 + 9, then times 12, divide by 8 and take the root.'),
      fehler: [
        { wert: d => Math.sqrt(d.mse * tSw2(d)), tipp: P('Das Teilen durch die Personenzahl je Gruppe fehlt.', 'Dividing by the number of people per group is missing.') },
        { wert: d => Math.sqrt((d.mse * 4) / d.n), tipp: P('Hier wurden die Gewichte des quadratischen Trends (Summe der Quadrate 4) benutzt. Beim linearen Trend ist die Summe 20.', 'Here the weights of the quadratic trend (sum of squares 4) were used. For the linear trend the sum is 20.') }
      ],
      weg: (d, z) => [
        P(`Summe der quadrierten Gewichte: ${d.lin.map(w => `(${z(w)})²`).join(' + ')} = ${z(tSw2(d))}`, `Sum of the squared weights: ${d.lin.map(w => `(${z(w)})²`).join(' + ')} = ${z(tSw2(d))}`),
        P(`Standardfehler: Wurzel aus (${z(d.mse)} · ${z(tSw2(d))} : ${z(d.n)}) = Wurzel aus ${z((d.mse * tSw2(d)) / d.n)} = ${z(tSE(d), 2)}`, `Standard error: square root of (${z(d.mse)} · ${z(tSw2(d))} : ${z(d.n)}) = square root of ${z((d.mse * tSw2(d)) / d.n)} = ${z(tSE(d), 2)}`)
      ] },
    { id: 't', stellen: 2, toleranz: 0.005, soll: d => tL(d) / tSE(d),
      frage: P('Wie groß ist t für den linearen Trend? Rechnen: Kontrastsumme durch Standardfehler.', 'How large is t for the linear trend? Calculate: contrast sum divided by standard error.'),
      warum: P('Wie bei jedem Kontrast steht das Signal über dem Rauschen. Ein großes t sagt: Der gleichmäßige Anstieg hebt sich vom Zufall ab. Er sagt noch nicht, dass nichts anderes im Spiel ist, etwa eine zusätzliche Biegung.', 'As with every contrast the signal stands over the noise. A large t says: the even rise stands out from chance. It does not yet say that nothing else is involved, such as an additional bend.'),
      tipp: P('Die Kontrastsumme aus dem ersten durch den Standardfehler aus dem zweiten Schritt teilen.', 'Divide the contrast sum from the first step by the standard error from the second step.'),
      fehler: [
        { wert: d => tL(d) / Math.sqrt(d.mse * tSw2(d)), tipp: P('Der Standardfehler aus dem vorigen Schritt ist ohne das Teilen durch n gerechnet. Den richtigen Wert aus dem zweiten Schritt benutzen.', 'The standard error was calculated without dividing by n. Use the correct value from the second step.') },
        { wert: d => tL(d) / d.mse, tipp: P('Hier wurde durch die Fehlervarianz geteilt. Geteilt wird durch den Standardfehler.', 'Here the division was by the error variance. The division is by the standard error.') }
      ],
      weg: (d, z) => [P(`t = ${z(tL(d))} : ${z(tSE(d), 2)} = ${z(tL(d) / tSE(d), 2)}`, `t = ${z(tL(d))} : ${z(tSE(d), 2)} = ${z(tL(d) / tSE(d), 2)}`)] },
    { id: 'anteil', stellen: 2, toleranz: 0.005, einheit: P('%', '%'), soll: d => (100 * tSSlin(d)) / tSSzw(d),
      frage: P('Wie viel Prozent der Streuung zwischen den Gruppen erklärt der lineare Trend? Rechnen: Quadratsumme des Trends durch Quadratsumme zwischen den Gruppen, mal 100. Die Quadratsumme des Trends ist Kontrastsumme zum Quadrat durch (Summe der quadrierten Gewichte : n); die Quadratsumme zwischen den Gruppen ist n mal die Quadratsumme der vier Mittelwerte um ihren Mittelwert.', 'How many percent of the spread between the groups does the linear trend explain? Calculate: sum of squares of the trend divided by sum of squares between the groups, times 100. The sum of squares of the trend is contrast sum squared divided by (sum of squared weights : n); the sum of squares between the groups is n times the sum of squares of the four means around their mean.'),
      warum: P('Die Streuung zwischen den Gruppen zerfällt in Anteile der Trends (linear, quadratisch, kubisch). Bei gleich großen Gruppen sind sie voneinander unabhängig und ergeben zusammen genau die Gesamtstreuung zwischen den Gruppen. Der Anteil zeigt, wie viel vom Muster eine Gerade beschreibt.', 'The spread between the groups splits into parts of the trends (linear, quadratic, cubic). With equal group sizes they are independent of each other and add up to exactly the total spread between the groups. The share shows how much of the pattern a straight line describes.'),
      tipp: P('Erst Quadratsumme des Trends (Kontrastsumme zum Quadrat : (20 : 8)), dann Quadratsumme zwischen den Gruppen (8 mal Summe der Abweichungen der Mittelwerte vom Gesamtmittel 14, quadriert), dann teilen und mal 100.', 'First the sum of squares of the trend (contrast sum squared : (20 : 8)), then the sum of squares between the groups (8 times the sum of the squared deviations of the means from the grand mean 14), then divide and times 100.'),
      fehler: [
        { wert: d => tSSlin(d), tipp: P('Das ist die Quadratsumme des Trends. Gefragt ist ihr Anteil an der Quadratsumme zwischen den Gruppen, in Prozent.', 'That is the sum of squares of the trend. Its share of the sum of squares between the groups, in percent, is asked for.') },
        { wert: d => (100 * tL(d) * tL(d)) / tSSzw(d), tipp: P('Beim Trend fehlt das Teilen durch (Summe der quadrierten Gewichte : n).', 'For the trend the division by (sum of squared weights : n) is missing.') }
      ],
      weg: (d, z) => [
        P(`Quadratsumme des Trends: ${z(tL(d))}² : (${z(tSw2(d))} : ${z(d.n)}) = ${z(tSSlin(d), 2)}`, `Sum of squares of the trend: ${z(tL(d))}² : (${z(tSw2(d))} : ${z(d.n)}) = ${z(tSSlin(d), 2)}`),
        P(`Quadratsumme zwischen den Gruppen: ${z(d.n)} · ${z(quadratsumme(d.m))} = ${z(tSSzw(d))}`, `Sum of squares between the groups: ${z(d.n)} · ${z(quadratsumme(d.m))} = ${z(tSSzw(d))}`),
        P(`Anteil: ${z(tSSlin(d), 2)} : ${z(tSSzw(d))} · 100 = ${z((100 * tSSlin(d)) / tSSzw(d), 2)} %`, `Share: ${z(tSSlin(d), 2)} : ${z(tSSzw(d))} · 100 = ${z((100 * tSSlin(d)) / tSSzw(d), 2)}%`)
      ] }
  ],
  merke: P('Der lineare Trend hat bei vier gleich weit entfernten Stufen die Gewichte −3, −1, +1, +3, der quadratische +1, −1, −1, +1. Standardfehler und t werden wie bei jedem Kontrast gerechnet. Ein Trend gilt nur für geordnete Stufen mit sinnvollen Abständen; die Trends teilen die Streuung zwischen den Gruppen unter sich auf.',
    'With four equally spaced levels the linear trend has the weights −3, −1, +1, +3, the quadratic one +1, −1, −1, +1. Standard error and t are calculated as for any contrast. A trend only applies to ordered levels with sensible spacing; the trends divide the spread between the groups among themselves.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Nitrat im Wasser“ öffnen, im Schritt „Drei Gebiete vergleichen“ unter der Varianzanalyse „Geplante Vergleiche (Kontraste) und Trendanalyse“ aufklappen und die Trendanalyse für drei Stufen ansehen. Die Stufen müssen in der richtigen Reihenfolge stehen; sonst ist ein Trend sinnlos.',
    'Next: open the example "Nitrate in water", in the step "Comparing three areas" open "Planned comparisons (contrasts) and trend analysis" below the analysis of variance and look at the trend analysis for three levels. The levels have to be in the right order; otherwise a trend is meaningless.')
});

// ---------------------------------------------------------------- 3. Differenz der Differenzen
/** 2 × 2 Zellmittel: Übung mit und ohne Rückmeldung bei leichten und schweren Aufgaben (Punkte). */
export const DATEN_WIRKUNG = { mit: { leicht: 18, schwer: 15 }, ohne: { leicht: 17, schwer: 9 } };
type DW = typeof DATEN_WIRKUNG;
const wL = (d: DW) => d.mit.leicht - d.ohne.leicht, wS = (d: DW) => d.mit.schwer - d.ohne.schwer;
const WIRKUNG = bau({
  id: 'wechselwirkung-differenz',
  daten: DATEN_WIRKUNG,
  lage: P('Eine Gruppe übt mit Rückmeldung, eine ohne. Beide lösen leichte und schwere Aufgaben. In der Tabelle stehen die vier Zellmittelwerte (Punkte). Eine Wechselwirkung fragt: Hängt der Vorteil der Rückmeldung von der Aufgabenart ab? Dazu wird der Vorteil (mit minus ohne) in jeder Spalte gerechnet und die beiden Vorteile werden verglichen.',
    'One group practises with feedback, one without. Both solve easy and hard tasks. The table shows the four cell means (points). An interaction asks: does the benefit of feedback depend on the type of task? For this the benefit (with minus without) is calculated in each column and the two benefits are compared.'),
  tabelle: { titel: P('Zellmittelwerte (Punkte)', 'Cell means (points)'), kopf: [P('Übung', 'Practice'), P('leichte Aufgaben', 'easy tasks'), P('schwere Aufgaben', 'hard tasks')],
    zeilen: [[P('mit Rückmeldung', 'with feedback'), DATEN_WIRKUNG.mit.leicht, DATEN_WIRKUNG.mit.schwer], [P('ohne Rückmeldung', 'without feedback'), DATEN_WIRKUNG.ohne.leicht, DATEN_WIRKUNG.ohne.schwer]] },
  schritte: [
    { id: 'leicht', stellen: 0, toleranz: 0.01, soll: wL,
      frage: P('Wie groß ist der Vorteil der Rückmeldung bei leichten Aufgaben? Rechnen: Zelle mit Rückmeldung minus Zelle ohne Rückmeldung, in der Spalte der leichten Aufgaben.', 'How large is the benefit of feedback for easy tasks? Calculate: cell with feedback minus cell without feedback, in the column of easy tasks.'),
      warum: P('Ein Unterschied innerhalb einer Spalte vergleicht dieselbe Aufgabenart. So bleibt die Aufgabenart gleich, und nur die Rückmeldung unterscheidet sich. Das ist ein einfacher Effekt.', 'A difference within one column compares the same type of task. The type of task stays the same and only the feedback differs. That is a simple effect.'),
      tipp: P('Nur die Spalte der leichten Aufgaben ansehen: 18 minus 17.', 'Look only at the column of easy tasks: 18 minus 17.'),
      fehler: [
        { wert: d => d.mit.leicht - d.mit.schwer, tipp: P('Das ist ein Unterschied innerhalb der Zeile, also zwischen den Aufgabenarten. Gefragt ist der Unterschied zwischen mit und ohne Rückmeldung.', 'That is a difference within the row, so between the task types. The difference between with and without feedback is asked for.') },
        { wert: d => d.ohne.leicht - d.mit.leicht, tipp: P('Das Vorzeichen ist vertauscht: mit Rückmeldung minus ohne Rückmeldung.', 'The sign is swapped: with feedback minus without feedback.') }
      ],
      weg: (d, z) => [P(`Vorteil bei leichten Aufgaben: ${z(d.mit.leicht)} − ${z(d.ohne.leicht)} = ${z(wL(d))}`, `Benefit for easy tasks: ${z(d.mit.leicht)} − ${z(d.ohne.leicht)} = ${z(wL(d))}`)] },
    { id: 'schwer', stellen: 0, toleranz: 0.01, soll: wS,
      frage: P('Wie groß ist der Vorteil der Rückmeldung bei schweren Aufgaben? Rechnen: mit minus ohne, in der Spalte der schweren Aufgaben.', 'How large is the benefit of feedback for hard tasks? Calculate: with minus without, in the column of hard tasks.'),
      warum: P('Derselbe Vergleich in der zweiten Spalte. Wären beide Vorteile gleich, würde die Rückmeldung unabhängig von der Aufgabenart gleich viel bringen, und es gäbe keine Wechselwirkung.', 'The same comparison in the second column. If both benefits were equal, feedback would bring the same amount regardless of the type of task, and there would be no interaction.'),
      tipp: P('Nur die Spalte der schweren Aufgaben ansehen: 15 minus 9.', 'Look only at the column of hard tasks: 15 minus 9.'),
      fehler: [
        { wert: d => d.ohne.schwer - d.mit.schwer, tipp: P('Das Vorzeichen ist vertauscht: mit Rückmeldung minus ohne Rückmeldung.', 'The sign is swapped: with feedback minus without feedback.') },
        { wert: d => d.mit.schwer - d.ohne.leicht, tipp: P('Hier stammen die beiden Zahlen aus verschiedenen Spalten. Beide müssen aus der Spalte der schweren Aufgaben kommen.', 'Here the two numbers come from different columns. Both have to come from the column of hard tasks.') }
      ],
      weg: (d, z) => [P(`Vorteil bei schweren Aufgaben: ${z(d.mit.schwer)} − ${z(d.ohne.schwer)} = ${z(wS(d))}`, `Benefit for hard tasks: ${z(d.mit.schwer)} − ${z(d.ohne.schwer)} = ${z(wS(d))}`)] },
    { id: 'diff', stellen: 0, toleranz: 0.01, soll: d => wS(d) - wL(d),
      frage: P('Wie groß ist die Wechselwirkung als Differenz der Differenzen? Rechnen: Vorteil bei schweren Aufgaben minus Vorteil bei leichten Aufgaben.', 'How large is the interaction as the difference of the differences? Calculate: benefit for hard tasks minus benefit for easy tasks.'),
      warum: P('Die Wechselwirkung ist der Unterschied der beiden Unterschiede. Ist er 0, verlaufen die Linien im Diagramm parallel. Je weiter er von 0 abweicht, desto weniger parallel verlaufen sie. Ob er größer ist als Zufall, entscheidet der Test mit dem Fehlerterm.', 'The interaction is the difference between the two differences. If it is 0, the lines in the chart run parallel. The further it is from 0, the less parallel they run. Whether it is larger than chance is decided by the test with the error term.'),
      tipp: P('Die beiden Ergebnisse der ersten Schritte voneinander abziehen, das größere Ergebnis zuerst.', 'Subtract the two results of the first steps from each other, the larger result first.'),
      fehler: [
        { wert: d => wS(d) + wL(d), tipp: P('Hier wurden die Vorteile addiert. Die Wechselwirkung vergleicht sie, also wird abgezogen.', 'Here the benefits were added. The interaction compares them, so they are subtracted.') },
        { wert: d => wL(d) - wS(d), tipp: P('Das Vorzeichen ist vertauscht. Bei der Reihenfolge schwer minus leicht ist die Wechselwirkung positiv.', 'The sign is swapped. With the order hard minus easy the interaction is positive.') }
      ],
      weg: (d, z) => [P(`Differenz der Differenzen: ${z(wS(d))} − ${z(wL(d))} = ${z(wS(d) - wL(d))}`, `Difference of the differences: ${z(wS(d))} − ${z(wL(d))} = ${z(wS(d) - wL(d))}`)] },
    { id: 'haupt', stellen: 1, toleranz: 0.01, soll: d => (wL(d) + wS(d)) / 2,
      frage: P('Wie groß ist der Haupteffekt der Rückmeldung, also der Vorteil im Mittel über beide Aufgabenarten? Rechnen: Mittel der beiden Vorteile.', 'How large is the main effect of feedback, that is the benefit on average across both task types? Calculate: mean of the two benefits.'),
      warum: P('Der Haupteffekt mittelt über die Stufen des anderen Faktors. Er beschreibt einen Vorteil, den es so für keine der beiden Aufgabenarten gibt: leicht 1, schwer 6, im Mittel 3,5. Bei einer deutlichen Wechselwirkung ist er darum mit Vorsicht zu deuten.', 'The main effect averages over the levels of the other factor. It describes a benefit that exists like this for neither task type: easy 1, hard 6, on average 3.5. With a clear interaction it is therefore to be interpreted with caution.'),
      tipp: P('Die beiden Vorteile addieren und durch 2 teilen.', 'Add the two benefits and divide by 2.'),
      fehler: [
        { wert: d => wL(d) + wS(d), tipp: P('Das ist die Summe. Das Mittel braucht noch das Teilen durch 2.', 'That is the sum. The mean still needs the division by 2.') },
        { wert: d => wS(d) - wL(d), tipp: P('Das ist die Wechselwirkung. Der Haupteffekt ist das Mittel der beiden Vorteile.', 'That is the interaction. The main effect is the mean of the two benefits.') }
      ],
      weg: (d, z) => [P(`Haupteffekt: (${z(wL(d))} + ${z(wS(d))}) : 2 = ${z((wL(d) + wS(d)) / 2, 1)}`, `Main effect: (${z(wL(d))} + ${z(wS(d))}) : 2 = ${z((wL(d) + wS(d)) / 2, 1)}`)] }
  ],
  merke: P('Wechselwirkung = Vorteil in der einen Spalte minus Vorteil in der anderen (Differenz der Differenzen). Sie ist 0, wenn die Linien im Diagramm parallel sind. Der Haupteffekt ist das Mittel der einfachen Effekte; bei deutlicher Wechselwirkung beschreibt er keine der Spalten richtig.',
    'Interaction = benefit in one column minus benefit in the other (difference of the differences). It is 0 when the lines in the chart are parallel. The main effect is the mean of the simple effects; with a clear interaction it describes neither column correctly.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Hilft das Lesetraining?“ öffnen, im Schritt „Training und Geschlecht zugleich“ das Diagramm der Wechselwirkung ansehen. Laufen die Linien parallel, ist die Differenz der Differenzen nahe 0; kreuzen oder spreizen sie sich, ist sie größer.',
    'Next: open the example "Does the reading training help?", in the step "Training and gender together" look at the interaction chart. If the lines run parallel, the difference of the differences is close to 0; if they cross or fan out, it is larger.')
});

// ---------------------------------------------------------------- 4. Einfache Effekte
/** 2 × 2 mit je 10 Personen und Fehlervarianz 20: Training (mit/ohne) bei niedrigem und hohem Vorwissen. */
export const DATEN_EINFACH = { niedrig: { mit: 22, ohne: 14 }, hoch: { mit: 24, ohne: 23 }, n: 10, mse: 20 };
type DE = typeof DATEN_EINFACH;
const eN = (d: DE) => d.niedrig.mit - d.niedrig.ohne, eH = (d: DE) => d.hoch.mit - d.hoch.ohne;
const eSE = (d: DE) => Math.sqrt((2 * d.mse) / d.n);
const EINFACH = bau({
  id: 'einfache-effekte-rechnen',
  daten: DATEN_EINFACH,
  lage: P('Ein Training wird mit und ohne Vorwissen geprüft, je 10 Personen in jeder der vier Zellen. In der Tabelle stehen die Zellmittelwerte (Punkte). Die Wechselwirkung war deutlich. Darum wird der Effekt des Trainings getrennt für jedes Vorwissen angesehen (einfache Effekte). Die gemeinsame Fehlervarianz beträgt 20.',
    'A training is tested with low and high prior knowledge, 10 people in each of the four cells. The table shows the cell means (points). The interaction was clear. So the effect of the training is looked at separately for each level of prior knowledge (simple effects). The pooled error variance is 20.'),
  tabelle: { titel: P('Zellmittelwerte (Punkte)', 'Cell means (points)'), kopf: [P('Vorwissen', 'Prior knowledge'), P('mit Training', 'with training'), P('ohne Training', 'without training')],
    zeilen: [[P('niedrig', 'low'), DATEN_EINFACH.niedrig.mit, DATEN_EINFACH.niedrig.ohne], [P('hoch', 'high'), DATEN_EINFACH.hoch.mit, DATEN_EINFACH.hoch.ohne]] },
  schritte: [
    { id: 'niedrig', stellen: 0, toleranz: 0.01, soll: eN,
      frage: P('Wie groß ist der einfache Effekt des Trainings bei niedrigem Vorwissen? Rechnen: mit Training minus ohne Training, in der Zeile „niedrig“.', 'How large is the simple effect of the training for low prior knowledge? Calculate: with training minus without training, in the row "low".'),
      warum: P('Ein einfacher Effekt vergleicht nur innerhalb einer Stufe des anderen Faktors. Er beantwortet die Frage, die in der Praxis zählt: Was bringt das Training genau dieser Gruppe? Der Gesamtmittelwert über beide Gruppen würde das verdecken.', 'A simple effect compares only within one level of the other factor. It answers the question that matters in practice: what does the training bring this very group? The overall mean across both groups would hide that.'),
      tipp: P('Nur die Zeile „niedrig“ ansehen: 22 minus 14.', 'Look only at the row "low": 22 minus 14.'),
      fehler: [
        { wert: d => (eN(d) + eH(d)) / 2, tipp: P('Das ist der Haupteffekt, das Mittel über beide Zeilen. Gefragt ist der Effekt nur in der Zeile „niedrig“.', 'That is the main effect, the mean across both rows. The effect only in the row "low" is asked for.') },
        { wert: d => d.niedrig.mit - d.hoch.mit, tipp: P('Das ist ein Unterschied zwischen den Zeilen (Vorwissen). Gefragt ist der Unterschied zwischen mit und ohne Training.', 'That is a difference between the rows (prior knowledge). The difference between with and without training is asked for.') }
      ],
      weg: (d, z) => [P(`Einfacher Effekt bei niedrigem Vorwissen: ${z(d.niedrig.mit)} − ${z(d.niedrig.ohne)} = ${z(eN(d))}`, `Simple effect for low prior knowledge: ${z(d.niedrig.mit)} − ${z(d.niedrig.ohne)} = ${z(eN(d))}`)] },
    { id: 'hoch', stellen: 0, toleranz: 0.01, soll: eH,
      frage: P('Wie groß ist der einfache Effekt des Trainings bei hohem Vorwissen? Rechnen: mit Training minus ohne Training, in der Zeile „hoch“.', 'How large is the simple effect of the training for high prior knowledge? Calculate: with training minus without training, in the row "high".'),
      warum: P('Derselbe Vergleich in der anderen Zeile. Der Effekt ist hier viel kleiner. Das ist genau das, was die Wechselwirkung ausdrückt: Der Effekt des Trainings hängt vom Vorwissen ab.', 'The same comparison in the other row. The effect is much smaller here. That is exactly what the interaction expresses: the effect of the training depends on prior knowledge.'),
      tipp: P('Nur die Zeile „hoch“ ansehen: 24 minus 23.', 'Look only at the row "high": 24 minus 23.'),
      fehler: [
        { wert: d => (eN(d) + eH(d)) / 2, tipp: P('Das ist der Haupteffekt, das Mittel über beide Zeilen.', 'That is the main effect, the mean across both rows.') },
        { wert: d => d.hoch.ohne - d.niedrig.ohne, tipp: P('Das ist ein Unterschied zwischen den Zeilen in der Spalte „ohne Training“. Gefragt ist der Effekt des Trainings innerhalb der Zeile „hoch“.', 'That is a difference between the rows in the column "without training". The effect of the training within the row "high" is asked for.') }
      ],
      weg: (d, z) => [P(`Einfacher Effekt bei hohem Vorwissen: ${z(d.hoch.mit)} − ${z(d.hoch.ohne)} = ${z(eH(d))}`, `Simple effect for high prior knowledge: ${z(d.hoch.mit)} − ${z(d.hoch.ohne)} = ${z(eH(d))}`)] },
    { id: 'se', stellen: 2, toleranz: 0.005, soll: eSE,
      frage: P('Wie groß ist der Standardfehler eines einfachen Effekts, also des Unterschieds zweier Zellmittelwerte? Rechnen: Wurzel aus (2 mal Fehlervarianz, geteilt durch die Personenzahl je Zelle).', 'How large is the standard error of a simple effect, that is the difference between two cell means? Calculate: square root of (2 times error variance, divided by the number of people per cell).'),
      warum: P('Jeder der beiden Zellmittelwerte trägt seine Unsicherheit bei (Fehlervarianz geteilt durch n), und beim Unterschied addieren sich beide Beiträge. Darum steht die 2 im Zähler. Die Fehlervarianz kommt aus allen vier Zellen und ist für beide einfachen Effekte dieselbe.', 'Each of the two cell means contributes its uncertainty (error variance divided by n), and for a difference both contributions add up. That is why the 2 is in the numerator. The error variance comes from all four cells and is the same for both simple effects.'),
      tipp: P('2 mal 20 durch 10, dann die Wurzel ziehen.', '2 times 20 divided by 10, then take the root.'),
      fehler: [
        { wert: d => Math.sqrt(d.mse / d.n), tipp: P('Das ist der Standardfehler eines einzelnen Mittelwerts. Beim Unterschied verdoppelt sich die Varianz.', 'That is the standard error of a single mean. For a difference the variance doubles.') },
        { wert: d => (2 * d.mse) / d.n, tipp: P('Das ist die Varianz des Unterschieds. Der Standardfehler ist ihre Wurzel.', 'That is the variance of the difference. The standard error is its root.') }
      ],
      weg: (d, z) => [P(`Standardfehler: Wurzel aus (2 · ${z(d.mse)} : ${z(d.n)}) = Wurzel aus ${z((2 * d.mse) / d.n)} = ${z(eSE(d), 2)}`, `Standard error: square root of (2 · ${z(d.mse)} : ${z(d.n)}) = square root of ${z((2 * d.mse) / d.n)} = ${z(eSE(d), 2)}`)] },
    { id: 't', stellen: 2, toleranz: 0.005, soll: d => eN(d) / eSE(d),
      frage: P('Wie groß ist t für den einfachen Effekt bei niedrigem Vorwissen? Rechnen: Effekt durch Standardfehler.', 'How large is t for the simple effect at low prior knowledge? Calculate: effect divided by standard error.'),
      warum: P('Wieder Signal durch Rauschen. Die Freiheitsgrade sind die der Fehlervarianz (40 Personen minus 4 Zellen = 36). Bei dem kleinen Effekt der anderen Zeile ergäbe dieselbe Rechnung ein t von nur 0,5: Der Effekt zeigt sich nur bei niedrigem Vorwissen.', 'Again signal divided by noise. The degrees of freedom are those of the error variance (40 people minus 4 cells = 36). For the small effect of the other row the same calculation would give a t of only 0.5: the effect shows only with low prior knowledge.'),
      tipp: P('Den einfachen Effekt aus dem ersten Schritt durch den Standardfehler aus dem dritten Schritt teilen.', 'Divide the simple effect from the first step by the standard error from the third step.'),
      fehler: [
        { wert: d => eN(d) / ((2 * d.mse) / d.n), tipp: P('Hier wurde durch die Varianz statt durch den Standardfehler geteilt.', 'Here the division was by the variance instead of the standard error.') },
        { wert: d => eN(d) / Math.sqrt(d.mse / d.n), tipp: P('Hier wurde durch den Standardfehler eines einzelnen Mittelwerts geteilt. Für den Unterschied gilt der größere Wert aus dem dritten Schritt.', 'Here the division was by the standard error of a single mean. For the difference the larger value from the third step applies.') }
      ],
      weg: (d, z) => [P(`t = ${z(eN(d))} : ${z(eSE(d), 2)} = ${z(eN(d) / eSE(d), 2)}`, `t = ${z(eN(d))} : ${z(eSE(d), 2)} = ${z(eN(d) / eSE(d), 2)}`)] }
  ],
  merke: P('Bei einer deutlichen Wechselwirkung sagt der Haupteffekt wenig. Stattdessen werden einfache Effekte gerechnet: der Effekt des einen Faktors getrennt in jeder Stufe des anderen. Der Standardfehler eines Unterschieds zweier Zellmittel ist Wurzel aus (2 · Fehlervarianz : n je Zelle).',
    'With a clear interaction the main effect says little. Instead simple effects are calculated: the effect of one factor separately within each level of the other. The standard error of a difference between two cell means is the square root of (2 · error variance : n per cell).'),
  ausprobieren: P('Als Nächstes: das Beispiel „Hilft das Lesetraining?“ öffnen, im Schritt „Training und Geschlecht zugleich“ unter dem Ergebnis die einfachen Effekte ansehen (Effekt des Trainings getrennt für jedes Geschlecht) und mit dem Diagramm der Wechselwirkung vergleichen.',
    'Next: open the example "Does the reading training help?", in the step "Training and gender together" look at the simple effects below the result (effect of the training separately for each gender) and compare them with the interaction chart.')
});

// ---------------------------------------------------------------- 5. Varianzen der Differenzen
/** Fünf Personen, drei Zeitpunkte (Punkte). */
export const DATEN_SPHAER = { namen: ['Anna', 'Ben', 'Cem', 'Dora', 'Eva'], t1: [12, 9, 14, 10, 11], t2: [12, 10, 15, 11, 13], t3: [16, 11, 16, 12, 11] };
type DS = typeof DATEN_SPHAER;
const diffs = (a: readonly number[], b: readonly number[]) => a.map((x, i) => x - b[i]!);
const varianz = (x: readonly number[]) => quadratsumme(x) / (x.length - 1);
const v12 = (d: DS) => varianz(diffs(d.t2, d.t1)), v13 = (d: DS) => varianz(diffs(d.t3, d.t1)), v23 = (d: DS) => varianz(diffs(d.t3, d.t2));
const vMax = (d: DS) => Math.max(v12(d), v13(d), v23(d)), vMin = (d: DS) => Math.min(v12(d), v13(d), v23(d));
const sd = (x: readonly number[]) => x.join(', ');
const SPHAER = bau({
  id: 'sphaerizitaet-differenzen',
  daten: DATEN_SPHAER,
  lage: P('Fünf Personen werden zu drei Zeitpunkten gemessen. Bei einer Varianzanalyse mit Messwiederholung sollten die Unterschiede zwischen je zwei Zeitpunkten ähnlich stark streuen (Sphärizität). Zum Prüfen werden für jedes der drei Paare von Zeitpunkten die Unterschiede je Person gebildet und deren Varianz gerechnet (mit n − 1 im Nenner).',
    'Five people are measured at three points in time. In an analysis of variance with repeated measures the differences between any two points in time should vary about equally (sphericity). To check this, for each of the three pairs of points in time the differences per person are formed and their variance is calculated (with n − 1 in the denominator).'),
  tabelle: { titel: P('Punkte zu drei Zeitpunkten', 'Points at three points in time'), kopf: [P('Person', 'Person'), P('Zeitpunkt 1', 'Time 1'), P('Zeitpunkt 2', 'Time 2'), P('Zeitpunkt 3', 'Time 3')],
    zeilen: DATEN_SPHAER.namen.map((n, i) => [n, DATEN_SPHAER.t1[i]!, DATEN_SPHAER.t2[i]!, DATEN_SPHAER.t3[i]!]) },
  schritte: [
    { id: 'v12', stellen: 2, toleranz: 0.005, soll: v12,
      frage: P('Wie groß ist die Varianz der Unterschiede zwischen Zeitpunkt 2 und Zeitpunkt 1 (Zeitpunkt 2 minus Zeitpunkt 1 je Person)? Erst die fünf Unterschiede bilden, dann deren Varianz.', 'How large is the variance of the differences between time 2 and time 1 (time 2 minus time 1 per person)? First form the five differences, then their variance.'),
      warum: P('Die Sphärizität verlangt, dass alle drei Varianzen der Unterschiede ähnlich groß sind. Eine Varianz der Unterschiede zeigt, wie unterschiedlich die Veränderung von Person zu Person ausfällt. Die Werte der einzelnen Zeitpunkte spielen dafür keine Rolle, nur die Unterschiede je Person.', 'Sphericity requires that all three variances of the differences are similar in size. A variance of the differences shows how differently the change turns out from person to person. The values of the single points in time do not matter for this, only the differences per person.'),
      tipp: P('Unterschiede: 0, 1, 1, 1, 2. Mittelwert 1, dann die quadrierten Abweichungen addieren und durch 4 teilen.', 'Differences: 0, 1, 1, 1, 2. Mean 1, then add the squared deviations and divide by 4.'),
      fehler: [
        { wert: d => varianz(d.t1), tipp: P('Das ist die Varianz der Werte zum ersten Zeitpunkt. Gefragt ist die Varianz der Unterschiede zwischen zwei Zeitpunkten.', 'That is the variance of the values at the first time. The variance of the differences between two points in time is asked for.') },
        { wert: d => quadratsumme(diffs(d.t2, d.t1)) / d.t1.length, tipp: P('Hier wurde durch n statt durch n − 1 geteilt. Die Varianz einer Stichprobe hat n − 1 im Nenner.', 'Here the division was by n instead of n − 1. The variance of a sample has n − 1 in the denominator.') }
      ],
      weg: (d, z) => [
        P(`Unterschiede: ${sd(diffs(d.t2, d.t1))}; Mittelwert ${z(mittel(diffs(d.t2, d.t1)))}; Quadratsumme ${z(quadratsumme(diffs(d.t2, d.t1)))}`, `Differences: ${sd(diffs(d.t2, d.t1))}; mean ${z(mittel(diffs(d.t2, d.t1)))}; sum of squares ${z(quadratsumme(diffs(d.t2, d.t1)))}`),
        P(`Varianz: ${z(quadratsumme(diffs(d.t2, d.t1)))} : ${z(d.t1.length - 1)} = ${z(v12(d), 2)}`, `Variance: ${z(quadratsumme(diffs(d.t2, d.t1)))} : ${z(d.t1.length - 1)} = ${z(v12(d), 2)}`)
      ] },
    { id: 'v13', stellen: 2, toleranz: 0.005, soll: v13,
      frage: P('Wie groß ist die Varianz der Unterschiede zwischen Zeitpunkt 3 und Zeitpunkt 1 (Zeitpunkt 3 minus Zeitpunkt 1 je Person)?', 'How large is the variance of the differences between time 3 and time 1 (time 3 minus time 1 per person)?'),
      warum: P('Derselbe Weg für das zweite Paar von Zeitpunkten. Der Unterschied je Person ändert sich hier von Person zu Person viel stärker: Anna gewinnt 4 Punkte, Eva verliert einen. Das macht die Varianz größer.', 'The same way for the second pair of points in time. The difference per person varies much more from person to person here: Anna gains 4 points, Eva loses one. That makes the variance larger.'),
      tipp: P('Unterschiede: 4, 2, 2, 2, 0. Mittelwert 2, dann die quadrierten Abweichungen addieren und durch 4 teilen.', 'Differences: 4, 2, 2, 2, 0. Mean 2, then add the squared deviations and divide by 4.'),
      fehler: [
        { wert: d => varianz(d.t3), tipp: P('Das ist die Varianz der Werte zum dritten Zeitpunkt. Gefragt ist die Varianz der Unterschiede.', 'That is the variance of the values at the third time. The variance of the differences is asked for.') },
        { wert: d => quadratsumme(diffs(d.t3, d.t1)) / d.t1.length, tipp: P('Hier wurde durch n statt durch n − 1 geteilt.', 'Here the division was by n instead of n − 1.') }
      ],
      weg: (d, z) => [
        P(`Unterschiede: ${sd(diffs(d.t3, d.t1))}; Mittelwert ${z(mittel(diffs(d.t3, d.t1)))}; Quadratsumme ${z(quadratsumme(diffs(d.t3, d.t1)))}`, `Differences: ${sd(diffs(d.t3, d.t1))}; mean ${z(mittel(diffs(d.t3, d.t1)))}; sum of squares ${z(quadratsumme(diffs(d.t3, d.t1)))}`),
        P(`Varianz: ${z(quadratsumme(diffs(d.t3, d.t1)))} : ${z(d.t1.length - 1)} = ${z(v13(d), 2)}`, `Variance: ${z(quadratsumme(diffs(d.t3, d.t1)))} : ${z(d.t1.length - 1)} = ${z(v13(d), 2)}`)
      ] },
    { id: 'v23', stellen: 2, toleranz: 0.005, soll: v23,
      frage: P('Wie groß ist die Varianz der Unterschiede zwischen Zeitpunkt 3 und Zeitpunkt 2 (Zeitpunkt 3 minus Zeitpunkt 2 je Person)?', 'How large is the variance of the differences between time 3 and time 2 (time 3 minus time 2 per person)?'),
      warum: P('Das dritte und letzte Paar. Hier liegen die Unterschiede am weitesten auseinander (Anna +4, Eva −2). Erst wenn alle drei Varianzen vorliegen, lässt sich sagen, ob sie ähnlich groß sind.', 'The third and last pair. The differences are furthest apart here (Anna +4, Eva −2). Only when all three variances are available can one say whether they are similar in size.'),
      tipp: P('Unterschiede: 4, 1, 1, 1, −2. Mittelwert 1, dann die quadrierten Abweichungen addieren und durch 4 teilen.', 'Differences: 4, 1, 1, 1, −2. Mean 1, then add the squared deviations and divide by 4.'),
      fehler: [
        { wert: d => varianz(d.t2), tipp: P('Das ist die Varianz der Werte zum zweiten Zeitpunkt. Gefragt ist die Varianz der Unterschiede.', 'That is the variance of the values at the second time. The variance of the differences is asked for.') },
        { wert: d => quadratsumme(diffs(d.t3, d.t2)) / d.t1.length, tipp: P('Hier wurde durch n statt durch n − 1 geteilt.', 'Here the division was by n instead of n − 1.') }
      ],
      weg: (d, z) => [
        P(`Unterschiede: ${sd(diffs(d.t3, d.t2))}; Mittelwert ${z(mittel(diffs(d.t3, d.t2)))}; Quadratsumme ${z(quadratsumme(diffs(d.t3, d.t2)))}`, `Differences: ${sd(diffs(d.t3, d.t2))}; mean ${z(mittel(diffs(d.t3, d.t2)))}; sum of squares ${z(quadratsumme(diffs(d.t3, d.t2)))}`),
        P(`Varianz: ${z(quadratsumme(diffs(d.t3, d.t2)))} : ${z(d.t1.length - 1)} = ${z(v23(d), 2)}`, `Variance: ${z(quadratsumme(diffs(d.t3, d.t2)))} : ${z(d.t1.length - 1)} = ${z(v23(d), 2)}`)
      ] },
    { id: 'verhaeltnis', stellen: 2, toleranz: 0.005, soll: d => vMax(d) / vMin(d),
      frage: P('Um wie viel größer ist die größte Varianz der Unterschiede als die kleinste? Rechnen: größte durch kleinste.', 'How many times larger is the largest variance of the differences than the smallest? Calculate: largest divided by smallest.'),
      warum: P('Sind die Varianzen gleich groß, ist das Verhältnis 1. Je größer es wird, desto stärker ist die Sphärizität verletzt. Statt mit dem Mauchly-Test über „erfüllt oder verletzt“ zu entscheiden, wird besser der Korrekturfaktor Epsilon genutzt: Er schrumpft stetig, je ungleicher die Varianzen sind.', 'If the variances are equally large, the ratio is 1. The larger it gets, the more strongly sphericity is violated. Instead of using Mauchly\'s test to decide between "met or violated", it is better to use the correction factor epsilon: it shrinks steadily the more unequal the variances are.'),
      tipp: P('Die größte der drei Varianzen aus den ersten Schritten durch die kleinste teilen.', 'Divide the largest of the three variances from the first steps by the smallest.'),
      fehler: [
        { wert: d => vMin(d) / vMax(d), tipp: P('Das ist der Kehrwert. Gefragt ist größte durch kleinste, der Wert liegt also über 1.', 'That is the reciprocal. Largest divided by smallest is asked for, so the value is above 1.') },
        { wert: d => vMax(d) - vMin(d), tipp: P('Das ist die Differenz. Gefragt ist das Verhältnis, also eine Division.', 'That is the difference. The ratio is asked for, so a division.') }
      ],
      weg: (d, z) => [P(`Verhältnis: ${z(vMax(d), 2)} : ${z(vMin(d), 2)} = ${z(vMax(d) / vMin(d), 2)}`, `Ratio: ${z(vMax(d), 2)} : ${z(vMin(d), 2)} = ${z(vMax(d) / vMin(d), 2)}`)] }
  ],
  merke: P('Sphärizität heißt: Die Unterschiede zwischen je zwei Zeitpunkten haben ähnlich große Varianz. Ein großes Verhältnis zwischen größter und kleinster Varianz zeigt eine Verletzung an. Epsilon (Greenhouse-Geisser, Huynh-Feldt) korrigiert die Freiheitsgrade stetig und ersetzt die Ja-Nein-Entscheidung des Mauchly-Tests.',
    'Sphericity means: the differences between any two points in time have similar variance. A large ratio between the largest and the smallest variance indicates a violation. Epsilon (Greenhouse-Geisser, Huynh-Feldt) corrects the degrees of freedom steadily and replaces the yes-no decision of Mauchly\'s test.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Hilft das Lesetraining?“ öffnen, im Schritt „Training gegen Kontrolle über drei Tests“ im Ergebnis der Messwiederholung den Mauchly-Test und die Korrekturen mit Epsilon ansehen. Ein Epsilon nahe 1 heißt: Die Varianzen der Unterschiede sind ähnlich.',
    'Next: open the example "Does the reading training help?", in the step "Training versus control over three tests" look at Mauchly\'s test and the corrections with epsilon in the result of the repeated measures. An epsilon close to 1 means: the variances of the differences are similar.')
});

// ---------------------------------------------------------------- 6. Familienfehler und Dunnett
/** Vier Gruppen: eine Kontrolle und drei Behandlungen, Niveau 5 %. */
export const DATEN_FAMILIE = { namen: ['Kontrolle', 'Behandlung A', 'Behandlung B', 'Behandlung C'], m: [50, 54, 57, 51], n: [12, 12, 12, 12], alpha: 5 };
type DF = typeof DATEN_FAMILIE;
const fPaare = (d: DF) => (d.m.length * (d.m.length - 1)) / 2, fKon = (d: DF) => d.m.length - 1;
const fFehler = (d: DF, m: number) => 100 * (1 - (1 - d.alpha / 100) ** m);
const FAMILIE = bau({
  id: 'familienfehler-dunnett',
  daten: DATEN_FAMILIE,
  lage: P('Ein Versuch hat eine Kontrollgruppe und drei Behandlungen (A, B, C) mit je 12 Personen. Gefragt ist nur: Welche Behandlung unterscheidet sich von der Kontrolle? Bei jedem Einzeltest liegt das Niveau bei 5 %. Wie groß ist die Wahrscheinlichkeit, dass bei Tests ohne Korrektur mindestens ein Test fälschlich signifikant wird, obwohl alle Gruppen gleich sind (Familienfehler 1 − (1 − α)^m)? Zum Vergleich: alle Paare gegen nur die Vergleiche mit der Kontrolle.',
    'An experiment has a control group and three treatments (A, B, C) with 12 people each. The only question is: which treatment differs from the control? For each single test the level is 5%. How large is the probability that, with tests without correction, at least one test becomes falsely significant although all groups are equal (family error 1 − (1 − α)^m)? For comparison: all pairs versus only the comparisons with the control.'),
  tabelle: { titel: P('Gruppen', 'Groups'), kopf: [P('Gruppe', 'Group'), P('Mittelwert', 'Mean'), P('Personen', 'People')],
    zeilen: DATEN_FAMILIE.namen.map((n, i) => [i === 0 ? P('Kontrolle', 'Control') : i === 1 ? P('Behandlung A', 'Treatment A') : i === 2 ? P('Behandlung B', 'Treatment B') : P('Behandlung C', 'Treatment C'), DATEN_FAMILIE.m[i]!, DATEN_FAMILIE.n[i]!]) },
  schritte: [
    { id: 'paare', stellen: 0, toleranz: 0.01, soll: fPaare,
      frage: P('Wie viele Paarvergleiche gibt es bei vier Gruppen, wenn jede Gruppe mit jeder anderen verglichen wird? Rechnen: 4 mal 3 durch 2.', 'How many pairwise comparisons are there with four groups if every group is compared with every other? Calculate: 4 times 3 divided by 2.'),
      warum: P('Jede der vier Gruppen wird mit den drei anderen verglichen, aber ein Paar zählt nur einmal (A gegen B ist dasselbe wie B gegen A). Darum wird durch 2 geteilt. Alle Paare vergleicht man bei einem Post-hoc-Verfahren wie Tukey.', 'Each of the four groups is compared with the three others, but a pair counts only once (A against B is the same as B against A). That is why it is divided by 2. All pairs are compared in a post-hoc procedure such as Tukey.'),
      tipp: P('4 · 3 = 12, und jedes Paar wurde doppelt gezählt.', '4 · 3 = 12, and every pair was counted twice.'),
      fehler: [
        { wert: d => d.m.length * (d.m.length - 1), tipp: P('Hier wurde jedes Paar doppelt gezählt. A gegen B und B gegen A sind derselbe Vergleich.', 'Here every pair was counted twice. A against B and B against A are the same comparison.') },
        { wert: d => d.m.length, tipp: P('Das ist die Zahl der Gruppen. Gesucht ist die Zahl der Paare.', 'That is the number of groups. The number of pairs is asked for.') }
      ],
      weg: (d, z) => [P(`Paare: ${z(d.m.length)} · ${z(d.m.length - 1)} : 2 = ${z(fPaare(d))}`, `Pairs: ${z(d.m.length)} · ${z(d.m.length - 1)} : 2 = ${z(fPaare(d))}`)] },
    { id: 'kontrolle', stellen: 0, toleranz: 0.01, soll: fKon,
      frage: P('Wie viele Vergleiche gibt es, wenn nur jede Behandlung mit der Kontrolle verglichen wird?', 'How many comparisons are there if only each treatment is compared with the control?'),
      warum: P('Mit einer festen Kontrollgruppe gibt es so viele Vergleiche wie Behandlungen. Das sind weniger als alle Paare. Auf genau diese Frage ist der Dunnett-Test zugeschnitten: Er korrigiert nur für diese Vergleiche und ist deshalb schärfer als ein Verfahren für alle Paare.', 'With a fixed control group there are as many comparisons as there are treatments. That is fewer than all pairs. The Dunnett test is tailored to exactly this question: it corrects only for these comparisons and is therefore more powerful than a procedure for all pairs.'),
      tipp: P('Die Kontrolle ist immer eine der beiden Gruppen; die andere ist eine der Behandlungen.', 'The control is always one of the two groups; the other is one of the treatments.'),
      fehler: [
        { wert: d => d.m.length, tipp: P('Die Kontrolle wird nicht mit sich selbst verglichen. Es zählen nur die Behandlungen.', 'The control is not compared with itself. Only the treatments count.') },
        { wert: d => fPaare(d), tipp: P('Das sind alle Paare. Hier zählen nur die Vergleiche mit der Kontrolle.', 'Those are all pairs. Only the comparisons with the control count here.') }
      ],
      weg: (d, z) => [P(`Zahl der Vergleiche mit der Kontrolle: ${z(d.m.length)} − 1 = ${z(fKon(d))}`, `Number of comparisons with the control: ${z(d.m.length)} − 1 = ${z(fKon(d))}`)] },
    { id: 'frei6', stellen: 2, toleranz: 0.005, einheit: P('%', '%'), soll: d => fFehler(d, fPaare(d)),
      frage: P('Wie groß ist der Familienfehler in Prozent, wenn alle Paare je mit 5 % ungeschützt getestet werden und alle Gruppen in Wahrheit gleich sind? Rechnen: 1 minus 0,95 hoch Zahl der Paare, mal 100.', 'How large is the family error in percent if all pairs are each tested at 5% without protection and all groups are in truth equal? Calculate: 1 minus 0.95 to the power of the number of pairs, times 100.'),
      warum: P('Jeder Test bleibt mit 95 % ohne Fehlalarm. Die Wahrscheinlichkeit, dass alle sechs ohne Fehlalarm bleiben, ist 0,95 hoch 6. Der Rest zu 1 ist die Wahrscheinlichkeit für mindestens einen Fehlalarm. Die Formel setzt unabhängige Tests voraus und ist bei Tests an denselben Daten nur eine Näherung.', 'Each test stays at 95% without a false alarm. The probability that all six stay without a false alarm is 0.95 to the power 6. The remainder to 1 is the probability of at least one false alarm. The formula assumes independent tests and is only an approximation for tests on the same data.'),
      tipp: P('0,95 sechsmal mit sich selbst multiplizieren, das Ergebnis von 1 abziehen und mit 100 malnehmen.', 'Multiply 0.95 by itself six times, subtract the result from 1 and multiply by 100.'),
      fehler: [
        { wert: d => d.alpha * fPaare(d), tipp: P('Das ist die einfache Summe der Niveaus (6 mal 5 %). Sie überschätzt den Fehler, weil sich die Fälle überlappen. Richtig ist 1 − 0,95 hoch 6.', 'That is the simple sum of the levels (6 times 5%). It overestimates the error because the cases overlap. The correct formula is 1 − 0.95 to the power 6.') },
        { wert: d => 100 * (1 - d.alpha / 100) ** fPaare(d), tipp: P('Das ist die Wahrscheinlichkeit, dass kein Test anschlägt. Gefragt ist die Wahrscheinlichkeit für mindestens einen: 1 minus dieser Wert.', 'That is the probability that no test fires. The probability of at least one is asked for: 1 minus this value.') }
      ],
      weg: (d, z) => [
        P(`Kein Fehlalarm: 0,95 hoch ${z(fPaare(d))} = ${z((1 - d.alpha / 100) ** fPaare(d) * 100, 2)} %`, `No false alarm: 0.95 to the power ${z(fPaare(d))} = ${z((1 - d.alpha / 100) ** fPaare(d) * 100, 2)}%`),
        P(`Familienfehler: 100 % − ${z((1 - d.alpha / 100) ** fPaare(d) * 100, 2)} % = ${z(fFehler(d, fPaare(d)), 2)} %`, `Family error: 100% − ${z((1 - d.alpha / 100) ** fPaare(d) * 100, 2)}% = ${z(fFehler(d, fPaare(d)), 2)}%`)
      ] },
    { id: 'frei3', stellen: 2, toleranz: 0.005, einheit: P('%', '%'), soll: d => fFehler(d, fKon(d)),
      frage: P('Wie groß ist der Familienfehler in Prozent, wenn nur die drei Vergleiche mit der Kontrolle je mit 5 % ungeschützt getestet werden? Rechnen: 1 minus 0,95 hoch 3, mal 100.', 'How large is the family error in percent if only the three comparisons with the control are each tested at 5% without protection? Calculate: 1 minus 0.95 to the power 3, times 100.'),
      warum: P('Mit weniger Vergleichen wächst der Familienfehler weniger stark. Das ist der Grund, die Frage vorab einzugrenzen: Wer nur Behandlungen mit der Kontrolle vergleichen will, muss weniger Strenge aufbringen. Der Dunnett-Test hält die Gesamtrate dieser drei Vergleiche genau bei 5 %.', 'With fewer comparisons the family error grows less. That is the reason to narrow the question beforehand: whoever only wants to compare treatments with the control has to apply less strictness. The Dunnett test keeps the overall rate of these three comparisons at exactly 5%.'),
      tipp: P('0,95 dreimal mit sich selbst multiplizieren, von 1 abziehen, mal 100.', 'Multiply 0.95 by itself three times, subtract from 1, times 100.'),
      fehler: [
        { wert: d => d.alpha * fKon(d), tipp: P('Das ist die einfache Summe (3 mal 5 %). Sie überschätzt den Fehler. Richtig ist 1 − 0,95 hoch 3.', 'That is the simple sum (3 times 5%). It overestimates the error. The correct formula is 1 − 0.95 to the power 3.') },
        { wert: d => 100 * (1 - d.alpha / 100) ** fKon(d), tipp: P('Das ist die Wahrscheinlichkeit, dass kein Test anschlägt. Gefragt ist die Wahrscheinlichkeit für mindestens einen.', 'That is the probability that no test fires. The probability of at least one is asked for.') }
      ],
      weg: (d, z) => [
        P(`Kein Fehlalarm: 0,95 hoch ${z(fKon(d))} = ${z((1 - d.alpha / 100) ** fKon(d) * 100, 2)} %`, `No false alarm: 0.95 to the power ${z(fKon(d))} = ${z((1 - d.alpha / 100) ** fKon(d) * 100, 2)}%`),
        P(`Familienfehler: 100 % − ${z((1 - d.alpha / 100) ** fKon(d) * 100, 2)} % = ${z(fFehler(d, fKon(d)), 2)} %`, `Family error: 100% − ${z((1 - d.alpha / 100) ** fKon(d) * 100, 2)}% = ${z(fFehler(d, fKon(d)), 2)}%`)
      ] }
  ],
  merke: P('Bei m ungeschützten Tests zu je 5 % liegt der Familienfehler bei 1 − 0,95 hoch m: bei 6 Tests rund ein Viertel, bei 3 Tests rund ein Siebtel. Wer nur Behandlungen mit einer Kontrollgruppe vergleichen will, braucht nur diese Vergleiche zu schützen: Dafür ist der Dunnett-Test gemacht und schärfer als ein Verfahren für alle Paare.',
    'With m unprotected tests at 5% each the family error is 1 − 0.95 to the power m: with 6 tests about a quarter, with 3 tests about a seventh. Whoever only wants to compare treatments with a control group needs to protect only these comparisons: the Dunnett test is made for this and is more powerful than a procedure for all pairs.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Nitrat im Wasser“ öffnen, im Schritt „Drei Gebiete vergleichen“ bei den Paarvergleichen unter „Kontrollgruppe (Dunnett-Test)“ eine Gruppe als Kontrolle wählen und die zwei Vergleiche mit allen drei Paaren des Tukey-Verfahrens gegenüberstellen.',
    'Next: open the example "Nitrate in water", in the step "Comparing three areas" under the pairwise comparisons choose a group as control under "Control group (Dunnett test)" and compare the two comparisons with all three pairs of the Tukey procedure.')
});

export const AUFGABEN_VV: Rechenaufgabe[] = [KONTRAST, TREND, WIRKUNG, EINFACH, SPHAER, FAMILIE];
