/**
 * Üben: Varianzanalyse vertiefen (Einheiten kontraste-statt-posthoc, trend-ueber-stufen, wechselwirkung-differenz, einfache-effekte, sphaerizitaet-verstehen,
 * kontrollgruppe-dunnett; Field-Stufe 3, Johannes 05.11.2026). Eigene Wortlaute und eigene erfundene Zahlenbeispiele, nichts aus einem Lehrbuch.
 * Kennungen `vv-<kürzel>-…` (ko, tr, wi, ee, sp, du). Die Texte nennen nur ganze Zahlen und Prozente aus einfachen Rechenbeispielen (jede Rechnung ist nachgesehen,
 * die Rechenaufgaben der Einheiten werden mit R nachgerechnet); darum braucht kein Eintrag in ueben-erwartet.json. Belege: wissen.json (nur mc: true) und der Hilfe-Artikel (`Hilfe:<id>`).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {};

export const FRAGEN: Frage[] = [
  // ======================================================== 1. Kontraste statt Post-hoc
  {
    id: 'vv-ko-gewichte', thema: 'vavertiefen',
    stamm: P('Drei Gruppen: Kontrolle, Methode A, Methode B. Welche Gewichte ergeben den Vergleich „Kontrolle gegen das Mittel von A und B“?', 'Three groups: control, method A, method B. Which weights give the comparison "control against the mean of A and B"?'),
    antworten: [
      a(P('−2, +1, +1', '−2, +1, +1'), P('Die Gewichte ergeben zusammen 0, und die Kontrolle (−2) steht allein gegen die beiden Methoden (je +1), die zusammen das gleiche Gewicht haben.', 'The weights add up to 0, and the control (−2) stands alone against the two methods (+1 each), which together have the same weight.'), true),
      a(P('−1, +1, +1', '−1, +1, +1'), P('Die Summe ist 1 und nicht 0. Damit ist es kein Vergleich von Gruppen, sondern mischt einen Gesamtanteil hinein.', 'The sum is 1 and not 0. That is not a comparison of groups; it mixes in an overall share.')),
      a(P('+1, +1, +1', '+1, +1, +1'), P('Das ergibt das Dreifache des Gesamtmittels. Es vergleicht keine Gruppen miteinander.', 'That gives three times the grand mean. It compares no groups with each other.')),
      a(P('0, +1, −1', '0, +1, −1'), P('Die Summe ist 0, aber der Vergleich stellt Methode A gegen Methode B. Die Kontrolle hat das Gewicht 0 und spielt keine Rolle.', 'The sum is 0, but the comparison puts method A against method B. The control has weight 0 and plays no role.'))
    ],
    hilfe: ['vv-kontraste', 'kontrastgewicht'], belege: ['wissen:kontraste-definition-orthogonal', 'Hilfe:vv-kontraste']
  },
  {
    id: 'vv-ko-wert', thema: 'vavertiefen',
    stamm: P('Gewichte −1, 0, +1 und Gruppenmittel 20, 25 und 31. Wie groß ist der Kontrastwert?', 'Weights −1, 0, +1 and group means 20, 25 and 31. How large is the contrast value?'),
    antworten: [
      a(P('Der Wert 11', 'The value 11'), P('Jedes Mittel wird mit seinem Gewicht multipliziert: −20 + 0 + 31 = 11. Das ist der Unterschied zwischen der dritten und der ersten Gruppe.', 'Each mean is multiplied by its weight: −20 + 0 + 31 = 11. That is the difference between the third and the first group.'), true),
      a(P('Der Wert 76', 'The value 76'), P('Das ist die Summe der drei Mittelwerte ohne Gewichte. Erst die Multiplikation mit den Gewichten macht daraus einen Vergleich.', 'That is the sum of the three means without weights. Only the multiplication with the weights turns it into a comparison.')),
      a(P('Der Wert 5', 'The value 5'), P('Das ist der Unterschied zwischen der zweiten und der ersten Gruppe. Das Gewicht der zweiten Gruppe ist aber 0, und die dritte Gruppe zählt mit.', 'That is the difference between the second and the first group. But the weight of the second group is 0, and the third group counts.')),
      a(P('Der Wert 6', 'The value 6'), P('Das ist der Unterschied zwischen der dritten und der zweiten Gruppe. Die zweite Gruppe hat das Gewicht 0 und geht nicht ein.', 'That is the difference between the third and the second group. The second group has weight 0 and does not enter.'))
    ],
    hilfe: ['vv-kontraste', 'kontrastwert'], belege: ['wissen:kontraste-definition-orthogonal', 'Hilfe:vv-kontraste']
  },
  {
    id: 'vv-ko-niveau', thema: 'vavertiefen',
    stamm: P('Warum darf ein vorab geplanter Vergleich das volle Niveau von 5 % nutzen, während Paarvergleiche nach dem Blick auf die Daten es aufteilen müssen?', 'Why may a comparison planned beforehand use the full level of 5%, while pairwise comparisons after looking at the data have to share it?'),
    antworten: [
      a(P('Er beantwortet eine einzige, vor den Daten festgelegte Frage; Paarvergleiche danach sind viele Tests', 'It answers a single question fixed before the data; pairwise comparisons afterwards are many tests'), P('Jeder zusätzliche Test erhöht die Chance auf einen Fehlalarm. Nur wer wenige Fragen vorab festlegt, muss auch nur diese schützen.', 'Every additional test raises the chance of a false alarm. Only whoever fixes a few questions beforehand has to protect only these.'), true),
      a(P('Er rechnet mit mehr Personen als ein Paarvergleich', 'It uses more people than a pairwise comparison'), P('Beide benutzen dieselben Daten. Die Zahl der Personen unterscheidet sich nicht.', 'Both use the same data. The number of people does not differ.')),
      a(P('Er hat keinen Standardfehler und braucht darum keine Korrektur', 'It has no standard error and therefore needs no correction'), P('Auch ein Kontrast hat einen Standardfehler, aus dem t entsteht. Der Unterschied liegt in der Zahl der Fragen, nicht im Fehler.', 'A contrast also has a standard error from which t arises. The difference lies in the number of questions, not in the error.')),
      a(P('Er ist nur erlaubt, wenn die Varianzanalyse vorher bedeutsam war', 'It is only allowed if the analysis of variance was significant beforehand'), P('Für wenige vorab festgelegte Vergleiche braucht es den Gesamttest nicht. Der Kontrast fragt gezielter.', 'For a few comparisons fixed beforehand the overall test is not needed. The contrast asks more specifically.'))
    ],
    hilfe: ['vv-kontraste', 'geplanter-kontrast'], belege: ['wissen:dormann-apriori', 'Hilfe:vv-kontraste']
  },
  {
    id: 'vv-ko-orthogonal', thema: 'vavertiefen',
    stamm: P('Bei vier Gruppen gibt es die Kontraste mit den Gewichten (+1, −1, 0, 0) und (0, 0, +1, −1). Wie verhalten sich die beiden zueinander?', 'With four groups there are the contrasts with the weights (+1, −1, 0, 0) and (0, 0, +1, −1). How do the two relate to each other?'),
    antworten: [
      a(P('Sie sind orthogonal (bei gleich großen Gruppen): Die Summe der Gewichtsprodukte ist 0, sie fragen Unabhängiges', 'They are orthogonal (with equal group sizes): the sum of the weight products is 0, they ask independent questions'), P('Die Produkte sind 0, 0, 0 und 0, ihre Summe ist 0. Der erste Kontrast betrifft nur Gruppe 1 und 2, der zweite nur Gruppe 3 und 4. Bei ungleich großen Gruppen zählt die Summe der Gewichtsprodukte geteilt durch die Gruppengrößen.', 'The products are 0, 0, 0 and 0, their sum is 0. The first contrast concerns only groups 1 and 2, the second only groups 3 and 4. With unequal group sizes the sum of the weight products divided by the group sizes counts.'), true),
      a(P('Sie überschneiden sich, weil beide dieselbe Zahl von Gruppen vergleichen', 'They overlap because both compare the same number of groups'), P('Entscheidend sind die Gewichtsprodukte, nicht die Zahl der verglichenen Gruppen. Die Produkte ergeben hier 0.', 'What matters are the weight products, not the number of groups compared. The products here give 0.')),
      a(P('Sie sind kein gültiges Paar, weil beide Kontraste zusammen 0 ergeben', 'They are not a valid pair because both contrasts add up to 0'), P('Dass die Gewichte jedes Kontrasts zusammen 0 ergeben, ist gerade die Bedingung für einen Kontrast. Für jedes Paar gilt sie.', 'That the weights of each contrast add up to 0 is exactly the condition for a contrast. It holds for every pair.')),
      a(P('Sie sind gleich, weil beide einen Unterschied von zwei Gruppen messen', 'They are equal because both measure a difference between two groups'), P('Sie betreffen verschiedene Gruppen und sind deshalb verschiedene Fragen.', 'They concern different groups and are therefore different questions.'))
    ],
    hilfe: ['vv-kontraste', 'orthogonal'], belege: ['wissen:kontraste-definition-orthogonal', 'Hilfe:vv-kontraste']
  },
  {
    id: 'vv-ko-anzahl', thema: 'vavertiefen',
    stamm: P('Wie viele voneinander unabhängige (orthogonale) Kontraste kann es bei fünf Gruppen höchstens geben?', 'How many independent (orthogonal) contrasts can there be at most with five groups?'),
    antworten: [
      a(P('Der Wert 4', 'The value 4'), P('Bei k Gruppen gibt es höchstens k − 1 orthogonale Kontraste, hier 5 − 1 = 4. Sie teilen die Streuung zwischen den Gruppen unter sich auf.', 'With k groups there are at most k − 1 orthogonal contrasts, here 5 − 1 = 4. They divide the spread between the groups among themselves.'), true),
      a(P('Der Wert 5', 'The value 5'), P('Das wäre die Zahl der Gruppen. Ein Freiheitsgrad geht für den Gesamtmittelwert ab, es bleiben 4.', 'That would be the number of groups. One degree of freedom goes to the grand mean, 4 remain.')),
      a(P('Der Wert 10', 'The value 10'), P('Das ist die Zahl aller Paare (5 · 4 : 2). Paarvergleiche sind nicht voneinander unabhängig.', 'That is the number of all pairs (5 · 4 : 2). Pairwise comparisons are not independent of each other.')),
      a(P('Der Wert 3', 'The value 3'), P('Das wäre eine Stufe zu wenig. Mit fünf Gruppen sind vier unabhängige Fragen möglich.', 'That would be one level too few. With five groups four independent questions are possible.'))
    ],
    hilfe: ['vv-kontraste', 'orthogonal'], belege: ['wissen:kontraste-definition-orthogonal', 'Hilfe:vv-kontraste']
  },
  {
    id: 'vv-ko-se', thema: 'vavertiefen',
    stamm: P('Zwei Kontraste haben gleich große Gruppen und dieselbe Fehlervarianz. Der erste hat die Gewichte −1, 0, +1, der zweite −2, +1, +1. Was gilt für ihre Standardfehler?', 'Two contrasts have equal group sizes and the same error variance. The first has the weights −1, 0, +1, the second −2, +1, +1. What holds for their standard errors?'),
    antworten: [
      a(P('Der zweite ist größer, denn die Summe der quadrierten Gewichte ist größer (6 gegen 2)', 'The second is larger because the sum of the squared weights is larger (6 versus 2)'), P('Der Standardfehler wächst mit der Wurzel aus der Summe der quadrierten Gewichte. Große Gewichte verstärken den Zufallsfehler der Mittel.', 'The standard error grows with the root of the sum of the squared weights. Large weights amplify the chance error of the means.'), true),
      a(P('Beide sind gleich groß, weil Fehlervarianz und n gleich sind', 'Both are equally large because error variance and n are equal'), P('Zusätzlich gehen die Gewichte ein. Mit größeren Gewichten wird auch der Standardfehler größer.', 'The weights enter as well. With larger weights the standard error also becomes larger.')),
      a(P('Der zweite ist kleiner, weil mehr Gruppen mit einem Gewicht ungleich 0 zählen', 'The second is smaller because more groups with a weight other than 0 count'), P('Mehr Gruppen mit Gewicht bringen mehr Zufallsfehler ins Spiel, nicht weniger. Zugleich sind die Gewichte größer.', 'More groups with weight bring more chance error into play, not less. At the same time the weights are larger.')),
      a(P('Der zweite ist halb so groß, weil die Gewichte zusammen 0 ergeben', 'The second is half as large because the weights add up to 0'), P('Dass die Gewichte zusammen 0 ergeben, gilt für beide und sagt nichts über die Größe des Fehlers.', 'That the weights add up to 0 holds for both and says nothing about the size of the error.'))
    ],
    hilfe: ['vv-kontraste', 'kontrastwert'], belege: ['wissen:kontraste-definition-orthogonal', 'Hilfe:vv-kontraste']
  },
  {
    id: 'vv-ko-mehrfach', thema: 'vavertiefen', mehrfach: true,
    stamm: P('Welche Aussagen zu geplanten Vergleichen stimmen? Mehrere können stimmen.', 'Which statements about planned comparisons are true? Several may be true.'),
    antworten: [
      a(P('Die Gewichte eines Kontrasts ergeben zusammen 0', 'The weights of a contrast add up to 0'), P('Nur dann steht dort ein Vergleich von Gruppen und kein Anteil am Gesamtmittel.', 'Only then is there a comparison of groups and not a share of the grand mean.'), true),
      a(P('Kontrastwert durch Standardfehler ergibt den t-Wert', 'Contrast value divided by standard error gives the t value'), P('Wie bei jedem t-Wert steht das Signal über dem Rauschen.', 'As with every t value the signal stands over the noise.'), true),
      a(P('Die Gewichte dürfen nach dem Blick auf die Mittelwerte gewählt werden, ohne dass sich etwas ändert', 'The weights may be chosen after looking at the means without anything changing'), P('Wer die Gewichte nach den Daten wählt, hat unbewusst viele Kontraste ausprobiert. Dann gilt der Vergleich als Post-hoc-Test.', 'Whoever chooses the weights after the data has unconsciously tried many contrasts. Then the comparison counts as a post-hoc test.')),
      a(P('Ein Kontrast ist nur erlaubt, wenn die Varianzanalyse bedeutsam war', 'A contrast is only allowed if the analysis of variance was significant'), P('Für wenige vorab festgelegte Vergleiche braucht es den Gesamttest nicht.', 'For a few comparisons fixed beforehand the overall test is not needed.'))
    ],
    hilfe: ['vv-kontraste', 'geplanter-kontrast'], belege: ['wissen:kontraste-definition-orthogonal', 'Hilfe:vv-kontraste']
  },
  // ======================================================== 2. Trend über Stufen
  {
    id: 'vv-tr-gewichte', thema: 'vavertiefen',
    stamm: P('Vier Stufen liegen gleich weit auseinander (zum Beispiel 0, 1, 2, 3 Stunden). Welche Gewichte gehören zum linearen Trend?', 'Four levels are equally spaced (for example 0, 1, 2, 3 hours). Which weights belong to the linear trend?'),
    antworten: [
      a(P('−3, −1, +1, +3', '−3, −1, +1, +3'), P('Die Gewichte steigen von Stufe zu Stufe gleich stark und bilden eine Gerade nach. Ihre Summe ist 0.', 'The weights rise equally from level to level and imitate a straight line. Their sum is 0.'), true),
      a(P('+1, −1, −1, +1', '+1, −1, −1, +1'), P('Das sind die Gewichte des quadratischen Trends: Er vergleicht die Randstufen mit den mittleren Stufen und fragt nach einer Biegung.', 'These are the weights of the quadratic trend: it compares the outer levels with the middle levels and asks about a bend.')),
      a(P('−1, +3, −3, +1', '−1, +3, −3, +1'), P('Das sind die Gewichte des kubischen Trends, einer Kurve mit zwei Biegungen.', 'These are the weights of the cubic trend, a curve with two bends.')),
      a(P('+1, +1, +1, +1', '+1, +1, +1, +1'), P('Die Summe ist 4 und nicht 0. Das ergibt das Vierfache des Gesamtmittels, keinen Trend.', 'The sum is 4 and not 0. That gives four times the grand mean, not a trend.'))
    ],
    hilfe: ['vv-trend', 'linearer-trend'], belege: ['wissen:kontraste-definition-orthogonal', 'Hilfe:vv-trend']
  },
  {
    id: 'vv-tr-wert', thema: 'vavertiefen',
    stamm: P('Gewichte des linearen Trends −3, −1, +1, +3; Gruppenmittel 2, 4, 6 und 8. Wie groß ist die lineare Kontrastsumme?', 'Weights of the linear trend −3, −1, +1, +3; group means 2, 4, 6 and 8. How large is the linear contrast sum?'),
    antworten: [
      a(P('Der Wert 20', 'The value 20'), P('−6 − 4 + 6 + 24 = 20. Die Mittel steigen gleichmäßig, darum wird die Summe groß.', '−6 − 4 + 6 + 24 = 20. The means rise evenly, so the sum becomes large.'), true),
      a(P('Der Wert 6', 'The value 6'), P('Das ist nur der Unterschied zwischen der ersten und der letzten Stufe. Alle vier Mittelwerte bekommen ein Gewicht.', 'That is only the difference between the first and the last level. All four means get a weight.')),
      a(P('Der Wert 0', 'The value 0'), P('Das ergibt der quadratische Trend (+1, −1, −1, +1): 2 − 4 − 6 + 8 = 0. Die Mittel steigen ohne Biegung.', 'That is what the quadratic trend (+1, −1, −1, +1) gives: 2 − 4 − 6 + 8 = 0. The means rise without a bend.')),
      a(P('Der Wert 40', 'The value 40'), P('Hier wurden die Vorzeichen der Gewichte ignoriert und alles addiert. Die negativen Gewichte ziehen ab.', 'Here the signs of the weights were ignored and everything added. The negative weights subtract.'))
    ],
    hilfe: ['vv-trend', 'linearer-trend'], belege: ['wissen:kontraste-definition-orthogonal', 'Hilfe:vv-trend']
  },
  {
    id: 'vv-tr-ordnung', thema: 'vavertiefen',
    stamm: P('Wann ergibt eine Trendanalyse über Gruppen einen Sinn?', 'When does a trend analysis across groups make sense?'),
    antworten: [
      a(P('Wenn die Gruppen eine echte Ordnung haben, zum Beispiel Dosen oder Übungsstunden', 'When the groups have a real order, for example doses or practice hours'), P('Ein Trend fragt nach dem Verlauf über die Stufen. Dafür muss es einen geordneten Verlauf geben.', 'A trend asks about the course across the levels. For that there has to be an ordered course.'), true),
      a(P('Wenn die Mittelwerte zufällig ansteigen', 'When the means happen to rise'), P('Ob die Mittelwerte steigen, ist das Ergebnis des Trends, nicht seine Voraussetzung. Die Voraussetzung ist die Ordnung der Stufen.', 'Whether the means rise is the result of the trend, not its requirement. The requirement is the order of the levels.')),
      a(P('Wenn es mehr als drei Gruppen gibt', 'When there are more than three groups'), P('Auch drei geordnete Stufen reichen, und zwölf Gruppen ohne Ordnung machen keinen Trend sinnvoll.', 'Three ordered levels are also enough, and twelve groups without an order make no trend meaningful.')),
      a(P('Wenn die Gruppen gleich groß sind', 'When the groups are equally large'), P('Gleiche Gruppengrößen vereinfachen die Rechnung und machen die Trends unabhängig. Sinn ergibt der Trend aber erst durch die Ordnung.', 'Equal group sizes simplify the calculation and make the trends independent. The trend only makes sense through the order.'))
    ],
    hilfe: ['vv-trend', 'trendanalyse'], belege: ['Hilfe:vv-trend']
  },
  {
    id: 'vv-tr-lesen', thema: 'vavertiefen',
    stamm: P('Der lineare Trend ist bedeutsam, der quadratische kaum. Was lässt sich daraus ablesen?', 'The linear trend is significant, the quadratic one hardly. What can be read from this?'),
    antworten: [
      a(P('Der Verlauf steigt oder fällt im Ganzen; eine zusätzliche Biegung ist kaum erkennbar', 'The course rises or falls overall; an additional bend is hardly recognisable'), P('Der lineare Trend erfasst den Gesamtanstieg, der quadratische die Biegung. Der Gesamtanstieg zeigt sich, die Biegung kaum.', 'The linear trend captures the overall rise, the quadratic one the bend. The overall rise shows, the bend hardly.'), true),
      a(P('Alle Mittelwerte liegen genau auf einer Geraden', 'All means lie exactly on a straight line'), P('Ein bedeutsamer linearer Trend heißt nur, dass der Verlauf insgesamt ansteigt. Abweichungen von der Geraden bleiben möglich.', 'A significant linear trend only means that the course rises overall. Deviations from the straight line remain possible.')),
      a(P('Die Gruppen unterscheiden sich kaum', 'The groups hardly differ'), P('Ein bedeutsamer Trend zeigt gerade einen Unterschied über die Stufen.', 'A significant trend shows precisely a difference across the levels.')),
      a(P('Der Trend gilt für jede einzelne Person', 'The trend holds for every single person'), P('Der Trend beschreibt die Mittelwerte der Gruppen, nicht jede einzelne Person.', 'The trend describes the group means, not every single person.'))
    ],
    hilfe: ['vv-trend', 'linearer-trend'], belege: ['Hilfe:vv-trend']
  },
  {
    id: 'vv-tr-anteil', thema: 'vavertiefen',
    stamm: P('Die Quadratsumme zwischen den Gruppen ist 208, die Quadratsumme des linearen Trends 104. Wie viel der Unterschiede zwischen den Gruppen erklärt der lineare Trend?', 'The sum of squares between the groups is 208, the sum of squares of the linear trend 104. How much of the differences between the groups does the linear trend explain?'),
    antworten: [
      a(P('Die Hälfte (50 %)', 'Half (50%)'), P('104 : 208 ergibt die Hälfte. Der Rest verteilt sich auf die übrigen Trends.', '104 : 208 gives a half. The rest is distributed among the other trends.'), true),
      a(P('Alles (100 %)', 'Everything (100%)'), P('Dann wäre die Quadratsumme des Trends 208. Sie ist 104, also bleibt die andere Hälfte für die übrigen Trends.', 'Then the sum of squares of the trend would be 208. It is 104, so the other half remains for the other trends.')),
      a(P('Ein Viertel (25 %)', 'A quarter (25%)'), P('Ein Viertel von 208 wäre 52. Die Quadratsumme des Trends ist 104.', 'A quarter of 208 would be 52. The sum of squares of the trend is 104.')),
      a(P('Der Wert 312 %', 'The value 312%'), P('Ein Anteil kann nicht größer als 100 % sein; hier wurden beide Quadratsummen addiert statt geteilt.', 'A share cannot be larger than 100%; here the two sums of squares were added instead of divided.'))
    ],
    hilfe: ['vv-trend', 'trendanalyse'], belege: ['Hilfe:vv-trend']
  },
  {
    id: 'vv-tr-abstand', thema: 'vavertiefen',
    stamm: P('Die Gruppen übten 0, 1 und 4 Stunden. Was ist bei der Trendanalyse zu beachten?', 'The groups practised 0, 1 and 4 hours. What has to be considered in the trend analysis?'),
    antworten: [
      a(P('Die Abstände sind ungleich; die echten Zahlenwerte sind als Abstände zu nutzen', 'The spacing is unequal; the true numbers are to be used as spacing'), P('Feste Gewichte wie −1, 0, +1 setzen gleiche Abstände voraus. Bei 0, 1, 4 liegt die dritte Stufe viel weiter entfernt.', 'Fixed weights such as −1, 0, +1 assume equal spacing. With 0, 1, 4 the third level lies much further away.'), true),
      a(P('Nichts, die Gewichte −1, 0, +1 gelten für alle Fälle', 'Nothing, the weights −1, 0, +1 hold for all cases'), P('Diese Gewichte gelten nur bei gleich weit entfernten Stufen.', 'These weights hold only for equally spaced levels.')),
      a(P('Die mittlere Gruppe muss entfernt werden', 'The middle group has to be removed'), P('Alle Gruppen bleiben; nur die Gewichte werden an die Abstände angepasst.', 'All groups stay; only the weights are adjusted to the spacing.')),
      a(P('Nur der quadratische Trend ist erlaubt', 'Only the quadratic trend is allowed'), P('Bei drei Stufen sind der lineare und der quadratische Trend möglich, bei ungleichen Abständen mit angepassten Gewichten.', 'With three levels the linear and the quadratic trend are possible, with unequal spacing using adjusted weights.'))
    ],
    hilfe: ['vv-trend', 'trendanalyse'], belege: ['Hilfe:vv-trend']
  },
  {
    id: 'vv-tr-mehrfach', thema: 'vavertiefen', mehrfach: true,
    stamm: P('Welche Aussagen zur Trendanalyse stimmen? Mehrere können stimmen.', 'Which statements about the trend analysis are true? Several may be true.'),
    antworten: [
      a(P('Bei gleich großen Gruppen sind die Trends voneinander unabhängig', 'With equally large groups the trends are independent of each other'), P('Die Polynomkontraste sind orthogonal und teilen die Streuung zwischen den Gruppen unter sich auf.', 'The polynomial contrasts are orthogonal and divide the spread between the groups among themselves.'), true),
      a(P('Bei vier Stufen sind höchstens drei Trends möglich: linear, quadratisch, kubisch', 'With four levels at most three trends are possible: linear, quadratic, cubic'), P('Bei k Stufen gibt es höchstens k − 1 Trends.', 'With k levels there are at most k − 1 trends.'), true),
      a(P('Ein bedeutsamer linearer Trend beweist, dass die Mittelwerte auf einer Geraden liegen', 'A significant linear trend proves that the means lie on a straight line'), P('Er zeigt nur den Gesamtanstieg oder -abfall. Eine Biegung ist damit nicht ausgeschlossen.', 'It shows only the overall rise or fall. A bend is not ruled out by it.')),
      a(P('Die Reihenfolge der Gruppen in der Tabelle spielt für den Trend keine Rolle', 'The order of the groups in the table plays no role for the trend'), P('Die Gewichte gehören zu den Gruppen in der Reihenfolge der Tabelle. Eine andere Reihenfolge ergibt einen anderen Trend.', 'The weights belong to the groups in the order of the table. A different order gives a different trend.'))
    ],
    hilfe: ['vv-trend', 'trendanalyse'], belege: ['Hilfe:vv-trend']
  },
  // ======================================================== 3. Wechselwirkung als Differenz der Differenzen
  {
    id: 'vv-wi-rechnen', thema: 'vavertiefen',
    stamm: P('Zellmittel (Punkte): mit Rückmeldung 18 bei leichten und 15 bei schweren Aufgaben, ohne Rückmeldung 17 und 9. Wie groß ist die Wechselwirkung als Differenz der Differenzen (Vorteil bei schweren minus Vorteil bei leichten Aufgaben)?', 'Cell means (points): with feedback 18 for easy and 15 for hard tasks, without feedback 17 and 9. How large is the interaction as the difference of the differences (benefit for hard tasks minus benefit for easy tasks)?'),
    antworten: [
      a(P('Der Wert 5', 'The value 5'), P('Der Vorteil beträgt bei leichten Aufgaben 18 − 17 = 1, bei schweren 15 − 9 = 6. Die Differenz der Differenzen ist 6 − 1 = 5.', 'The benefit is 18 − 17 = 1 for easy tasks and 15 − 9 = 6 for hard tasks. The difference of the differences is 6 − 1 = 5.'), true),
      a(P('Der Wert 7', 'The value 7'), P('Das ist die Summe der beiden Vorteile. Die Wechselwirkung vergleicht sie, also wird abgezogen.', 'That is the sum of the two benefits. The interaction compares them, so they are subtracted.')),
      a(P('Der Wert 1', 'The value 1'), P('Das ist nur der Vorteil bei leichten Aufgaben. Es fehlt der Vergleich mit dem Vorteil bei schweren Aufgaben.', 'That is only the benefit for easy tasks. The comparison with the benefit for hard tasks is missing.')),
      a(P('Der Wert 6', 'The value 6'), P('Das ist nur der Vorteil bei schweren Aufgaben. Der Vorteil bei leichten Aufgaben wird noch abgezogen.', 'That is only the benefit for hard tasks. The benefit for easy tasks still has to be subtracted.'))
    ],
    hilfe: ['vv-wechselwirkung', 'differenz-der-differenzen'], belege: ['wissen:czitrom99-ofat-wechselwirkung', 'Hilfe:vv-wechselwirkung']
  },
  {
    id: 'vv-wi-parallel', thema: 'vavertiefen',
    stamm: P('Im Diagramm der Zellmittel verlaufen die beiden Linien parallel. Was folgt daraus für die Wechselwirkung?', 'In the chart of the cell means the two lines run parallel. What follows for the interaction?'),
    antworten: [
      a(P('Sie ist nahe 0: Der Effekt des einen Faktors ist in jeder Stufe des anderen gleich groß', 'It is close to 0: the effect of one factor is equally large at every level of the other'), P('Parallele Linien heißen gleiche Abstände in beiden Stufen, also eine Differenz der Differenzen von 0.', 'Parallel lines mean equal distances at both levels, so a difference of the differences of 0.'), true),
      a(P('Beide Haupteffekte sind 0', 'Both main effects are 0'), P('Parallele Linien können schräg oder weit auseinander liegen. Haupteffekte können deutlich sein.', 'Parallel lines can slope or lie far apart. Main effects can be clear.')),
      a(P('Es gibt eine starke Wechselwirkung, weil beide Linien steigen', 'There is a strong interaction because both lines rise'), P('Steigen beide gleich stark, verlaufen sie parallel. Das ist gerade keine Wechselwirkung.', 'If both rise equally they run parallel. That is precisely no interaction.')),
      a(P('Die Wechselwirkung ist bedeutsam, weil die Linien einander nicht berühren', 'The interaction is significant because the lines do not touch'), P('Der Abstand der Linien sagt etwas über den Haupteffekt. Die Wechselwirkung zeigt sich an unterschiedlichen Steigungen.', 'The distance between the lines says something about the main effect. The interaction shows in different slopes.'))
    ],
    hilfe: ['vv-wechselwirkung', 'wechselwirkung'], belege: ['wissen:dormann-interaktion', 'Hilfe:vv-wechselwirkung']
  },
  {
    id: 'vv-wi-haupt', thema: 'vavertiefen',
    stamm: P('Beide Haupteffekte einer zweifaktoriellen Varianzanalyse sind bedeutsam. Was lässt sich über die Wechselwirkung sagen?', 'Both main effects of a two-way analysis of variance are significant. What can be said about the interaction?'),
    antworten: [
      a(P('Das ist offen: Sie wird getrennt getestet und kann bestehen oder fehlen', 'That is open: it is tested separately and may exist or be absent'), P('Haupteffekte und Wechselwirkung sind getrennte Fragen mit eigenen Zeilen in der Tabelle.', 'Main effects and interaction are separate questions with rows of their own in the table.'), true),
      a(P('Es gibt keine Wechselwirkung', 'There is no interaction'), P('Beide Haupteffekte können deutlich sein, und die Linien verlaufen dennoch nicht parallel.', 'Both main effects can be clear and the lines still do not run parallel.')),
      a(P('Es gibt eine Wechselwirkung', 'There is an interaction'), P('Auch das folgt nicht. Die Wechselwirkung braucht ihren eigenen Test.', 'That does not follow either. The interaction needs its own test.')),
      a(P('Sie ist so groß wie der kleinere der beiden Haupteffekte', 'It is as large as the smaller of the two main effects'), P('Es gibt keine solche Rechenbeziehung. Die drei Effekte sind getrennte Größen.', 'There is no such arithmetic relationship. The three effects are separate quantities.'))
    ],
    hilfe: ['vv-wechselwirkung', 'haupteffekt'], belege: ['wissen:dormann-interaktion-deuten', 'Hilfe:vv-wechselwirkung']
  },
  {
    id: 'vv-wi-kreuz', thema: 'vavertiefen',
    stamm: P('Zwei Linien im Diagramm der Zellmittel kreuzen sich. Was bedeutet das?', 'Two lines in the chart of the cell means cross. What does that mean?'),
    antworten: [
      a(P('Die Richtung des Effekts hängt von der Stufe des anderen Faktors ab', 'The direction of the effect depends on the level of the other factor'), P('Wo sich Linien kreuzen, ist der Vorteil in einer Stufe positiv und in der anderen negativ. Das ist eine starke Wechselwirkung.', 'Where lines cross, the benefit is positive at one level and negative at the other. That is a strong interaction.'), true),
      a(P('Beide Faktoren wirken zusammen genau wie addiert', 'Both factors act together exactly as if added'), P('Dann blieben die Linien parallel. Eine Kreuzung ist das Gegenteil davon.', 'Then the lines would stay parallel. A crossing is the opposite of that.')),
      a(P('Die Gruppen waren verschieden groß', 'The groups were of different sizes'), P('Die Größe der Gruppen bestimmt die Genauigkeit der Mittelwerte, nicht deren Lage.', 'The size of the groups determines the precision of the means, not their position.')),
      a(P('Der Fehler der Messung ist zu groß', 'The error of the measurement is too large'), P('Die Lage der Linien beschreibt die Mittelwerte. Über die Größe des Fehlers sagt sie nichts.', 'The position of the lines describes the means. It says nothing about the size of the error.'))
    ],
    hilfe: ['vv-wechselwirkung', 'wechselwirkung'], belege: ['wissen:dormann-interaktion', 'Hilfe:vv-wechselwirkung']
  },
  {
    id: 'vv-wi-null', thema: 'vavertiefen',
    stamm: P('In einer 2×2-Tabelle beträgt der Unterschied zwischen den Zeilen in der ersten Spalte 4 und in der zweiten Spalte ebenfalls 4. Wie groß ist die Differenz der Differenzen?', 'In a 2×2 table the difference between the rows in the first column is 4 and in the second column also 4. How large is the difference of the differences?'),
    antworten: [
      a(P('Der Wert 0', 'The value 0'), P('4 − 4 = 0. Gleiche Unterschiede in beiden Spalten heißen parallele Linien.', '4 − 4 = 0. Equal differences in both columns mean parallel lines.'), true),
      a(P('Der Wert 8', 'The value 8'), P('Das ist die Summe der beiden Unterschiede. Die Wechselwirkung vergleicht sie.', 'That is the sum of the two differences. The interaction compares them.')),
      a(P('Der Wert 4', 'The value 4'), P('Das ist der Unterschied in jeder Spalte, aber nicht der Unterschied zwischen ihnen.', 'That is the difference in each column, but not the difference between them.')),
      a(P('Der Wert 16', 'The value 16'), P('Das ist das Produkt der beiden Unterschiede. Eine Wechselwirkung entsteht durch Abziehen.', 'That is the product of the two differences. An interaction arises by subtracting.'))
    ],
    hilfe: ['vv-wechselwirkung', 'differenz-der-differenzen'], belege: ['Hilfe:vv-wechselwirkung']
  },
  {
    id: 'vv-wi-mittel', thema: 'vavertiefen',
    stamm: P('Die Unterschiede zwischen den Zeilen sind in der ersten Spalte 2 und in der zweiten Spalte 10. Wie groß ist der Haupteffekt des Zeilenfaktors (Mittel der beiden Unterschiede)?', 'The differences between the rows are 2 in the first column and 10 in the second column. How large is the main effect of the row factor (mean of the two differences)?'),
    antworten: [
      a(P('Der Wert 6', 'The value 6'), P('(2 + 10) : 2 = 6. Dieser Wert gilt für keine der beiden Spalten genau.', '(2 + 10) : 2 = 6. This value applies exactly to neither column.'), true),
      a(P('Der Wert 8', 'The value 8'), P('Das ist die Differenz der Differenzen, also die Wechselwirkung. Der Haupteffekt ist das Mittel.', 'That is the difference of the differences, so the interaction. The main effect is the mean.')),
      a(P('Der Wert 12', 'The value 12'), P('Das ist die Summe der beiden Unterschiede. Das Mittel braucht noch die Teilung durch 2.', 'That is the sum of the two differences. The mean still needs the division by 2.')),
      a(P('Der Wert 2', 'The value 2'), P('Das ist nur der Unterschied der ersten Spalte. Die zweite Spalte geht ebenfalls ein.', 'That is only the difference of the first column. The second column enters as well.'))
    ],
    hilfe: ['vv-wechselwirkung', 'haupteffekt'], belege: ['Hilfe:vv-wechselwirkung']
  },
  {
    id: 'vv-wi-mehrfach', thema: 'vavertiefen', mehrfach: true,
    stamm: P('Welche Aussagen zur Wechselwirkung stimmen? Mehrere können stimmen.', 'Which statements about the interaction are true? Several may be true.'),
    antworten: [
      a(P('In einer 2×2-Tabelle hat die Wechselwirkung einen Freiheitsgrad im Zähler', 'In a 2×2 table the interaction has one degree of freedom in the numerator'), P('Die Freiheitsgrade sind (2 − 1) mal (2 − 1) = 1.', 'The degrees of freedom are (2 − 1) times (2 − 1) = 1.'), true),
      a(P('Eine Wechselwirkung kann bestehen, auch wenn ein Haupteffekt 0 ist', 'An interaction can exist even if a main effect is 0'), P('Zwei gegenläufige Effekte können sich im Mittel ausgleichen und doch eine deutliche Wechselwirkung ergeben.', 'Two opposite effects can cancel out on average and still give a clear interaction.'), true),
      a(P('Eine Wechselwirkung heißt, dass ein Faktor wirkt und der andere keine Wirkung hat', 'An interaction means that one factor acts and the other has no effect'), P('Sie heißt, dass die Größe des einen Effekts von der Stufe des anderen abhängt. Beide Faktoren können für sich wirken.', 'It means that the size of one effect depends on the level of the other. Both factors can act on their own.')),
      a(P('Sind beide Haupteffekte bedeutsam, gibt es keine Wechselwirkung', 'If both main effects are significant, there is no interaction'), P('Haupteffekte und Wechselwirkung sind getrennte Fragen.', 'Main effects and interaction are separate questions.'))
    ],
    hilfe: ['vv-wechselwirkung', 'wechselwirkung'], belege: ['wissen:dormann-interaktion', 'Hilfe:vv-wechselwirkung']
  },
  // ======================================================== 4. Einfache Effekte
  {
    id: 'vv-ee-wann', thema: 'vavertiefen',
    stamm: P('Die Wechselwirkung ist deutlich. Welche Auswertung beschreibt am besten, was in jeder einzelnen Gruppe geschieht?', 'The interaction is clear. Which analysis best describes what happens in each single group?'),
    antworten: [
      a(P('Einfache Effekte: der Effekt des einen Faktors getrennt in jeder Stufe des anderen', 'Simple effects: the effect of one factor separately in each level of the other'), P('Bei deutlicher Wechselwirkung fällt der Effekt je Stufe verschieden aus. Nur die getrennte Betrachtung zeigt das.', 'With a clear interaction the effect differs between levels. Only the separate look shows that.'), true),
      a(P('Der Haupteffekt über alle Personen', 'The main effect across all people'), P('Er mittelt über Stufen mit verschiedenen Effekten und beschreibt deshalb keine davon richtig.', 'It averages over levels with different effects and therefore describes none of them correctly.')),
      a(P('Der Gesamtmittelwert der Zielgröße', 'The grand mean of the outcome'), P('Der Gesamtmittelwert sagt nichts über Unterschiede zwischen den Gruppen.', 'The grand mean says nothing about differences between the groups.')),
      a(P('Die Korrelation zwischen den beiden Faktoren', 'The correlation between the two factors'), P('Die Korrelation der Faktoren beschreibt, wie die Gruppen besetzt sind, nicht, wie sie wirken.', 'The correlation of the factors describes how the groups are filled, not how they act.'))
    ],
    hilfe: ['vv-einfache-effekte', 'einfache-effekte'], belege: ['wissen:dormann-interaktion-deuten', 'Hilfe:vv-einfache-effekte']
  },
  {
    id: 'vv-ee-rechnen', thema: 'vavertiefen',
    stamm: P('Training bei niedrigem Vorwissen: Mittel 22 mit und 14 ohne Training. Bei hohem Vorwissen: 24 mit und 23 ohne Training. Wie groß ist der einfache Effekt des Trainings bei niedrigem Vorwissen?', 'Training at low prior knowledge: mean 22 with and 14 without training. At high prior knowledge: 24 with and 23 without training. How large is the simple effect of the training at low prior knowledge?'),
    antworten: [
      a(P('Der Wert 8', 'The value 8'), P('Innerhalb der Zeile „niedrig“ gilt 22 − 14 = 8. Nur das Training unterscheidet sich, das Vorwissen bleibt gleich.', 'Within the row "low" 22 − 14 = 8. Only the training differs, prior knowledge stays the same.'), true),
      a(P('Der Wert 1', 'The value 1'), P('Das ist der einfache Effekt bei hohem Vorwissen (24 − 23). Gefragt ist die Zeile mit niedrigem Vorwissen.', 'That is the simple effect at high prior knowledge (24 − 23). The row with low prior knowledge is asked for.')),
      a(P('Der Wert 9', 'The value 9'), P('Das ist die Summe der beiden einfachen Effekte. Ein einfacher Effekt betrifft nur eine Stufe.', 'That is the sum of the two simple effects. A simple effect concerns only one level.')),
      a(P('Der Wert 2', 'The value 2'), P('Das ist der Unterschied zwischen den Zeilen in der Spalte „mit Training“ (24 − 22). Gefragt ist der Unterschied zwischen mit und ohne Training.', 'That is the difference between the rows in the column "with training" (24 − 22). The difference between with and without training is asked for.'))
    ],
    hilfe: ['vv-einfache-effekte', 'einfache-effekte'], belege: ['Hilfe:vv-einfache-effekte']
  },
  {
    id: 'vv-ee-haupt', thema: 'vavertiefen',
    stamm: P('Ein Training hat bei niedrigem Vorwissen den Effekt 6 und bei hohem Vorwissen den Effekt 2. Der Haupteffekt, das Mittel der beiden, ist 4. Was sagt diese 4 über die beiden Gruppen?', 'A training has the effect 6 at low prior knowledge and the effect 2 at high prior knowledge. The main effect, the mean of the two, is 4. What does this 4 say about the two groups?'),
    antworten: [
      a(P('Sie trifft auf keine der beiden Gruppen genau zu; sie ist nur ein Durchschnitt', 'It applies exactly to neither group; it is only an average'), P('Der Haupteffekt mittelt über Stufen mit verschiedenem Effekt. Bei deutlicher Wechselwirkung beschreibt er keine Stufe richtig.', 'The main effect averages over levels with different effects. With a clear interaction it describes no level correctly.'), true),
      a(P('Sie gilt für beide Gruppen gleichermaßen', 'It holds for both groups equally'), P('Dann wären beide Effekte 4. Sie sind aber 6 und 2.', 'Then both effects would be 4. But they are 6 and 2.')),
      a(P('Sie ist der Effekt in der größeren Gruppe', 'It is the effect in the larger group'), P('Die Gruppengröße geht hier nicht ein. Die 4 ist der einfache Mittelwert der beiden Effekte.', 'The group size does not enter here. The 4 is the plain mean of the two effects.')),
      a(P('Sie beweist, dass es keine Wechselwirkung gibt', 'It proves that there is no interaction'), P('Weil 6 und 2 verschieden sind, zeigen sie eine Wechselwirkung; ob sie bedeutsam ist, prüft ihr eigener Test. Der Mittelwert verdeckt sie.', 'Because 6 and 2 differ, they show an interaction; whether it is significant is tested by its own test. The mean hides it.'))
    ],
    hilfe: ['vv-einfache-effekte', 'haupteffekt'], belege: ['wissen:dormann-interaktion-deuten', 'Hilfe:vv-einfache-effekte']
  },
  {
    id: 'vv-ee-se', thema: 'vavertiefen',
    stamm: P('Was steht unter der Wurzel im Standardfehler eines einfachen Effekts, also des Unterschieds zweier Zellmittelwerte?', 'What stands under the root in the standard error of a simple effect, that is the difference between two cell means?'),
    antworten: [
      a(P('2 mal Fehlervarianz, geteilt durch n je Zelle', '2 times error variance, divided by n per cell'), P('Jeder der beiden Zellmittelwerte trägt Fehlervarianz durch n bei, und beim Unterschied addieren sich beide Beiträge.', 'Each of the two cell means contributes error variance divided by n, and for a difference both contributions add up.'), true),
      a(P('Fehlervarianz, geteilt durch n je Zelle', 'Error variance divided by n per cell'), P('Das ist die Varianz eines einzelnen Zellmittelwerts. Beim Unterschied zweier Mittelwerte verdoppelt sie sich.', 'That is the variance of a single cell mean. For a difference between two means it doubles.')),
      a(P('Fehlervarianz mal n je Zelle', 'Error variance times n per cell'), P('Mit größerem n wird der Mittelwert genauer, der Fehler wird also kleiner und nicht größer.', 'With larger n the mean becomes more precise, so the error becomes smaller and not larger.')),
      a(P('n je Zelle, geteilt durch 2 mal Fehlervarianz', 'n per cell divided by 2 times error variance'), P('Der Bruch steht auf dem Kopf: Die Fehlervarianz gehört in den Zähler und n in den Nenner.', 'The fraction is upside down: the error variance belongs in the numerator and n in the denominator.'))
    ],
    hilfe: ['vv-einfache-effekte', 'einfache-effekte'], belege: ['Hilfe:vv-einfache-effekte']
  },
  {
    id: 'vv-ee-mehrere', thema: 'vavertiefen',
    stamm: P('Zu einer Wechselwirkung werden vier einfache Effekte getestet. Was ist dabei zu bedenken?', 'Four simple effects are tested for an interaction. What has to be considered?'),
    antworten: [
      a(P('Es sind mehrere Tests; das Niveau wird angepasst, zum Beispiel mit dem Holm-Verfahren', 'These are several tests; the level is adjusted, for example with the Holm procedure'), P('Mehrere Tests erhöhen die Chance auf einen Fehlalarm. Eine Anpassung hält die Gesamtrate bei höchstens 5 %.', 'Several tests raise the chance of a false alarm. An adjustment keeps the overall rate at 5% at most.'), true),
      a(P('Jeder Test hat sein eigenes volles Niveau, eine Anpassung ist überflüssig', 'Each test has its own full level, an adjustment is superfluous'), P('Dann stiege die Chance auf mindestens einen Fehlalarm mit jedem Test.', 'Then the chance of at least one false alarm would rise with every test.')),
      a(P('Nur der größte der vier Effekte darf berichtet werden', 'Only the largest of the four effects may be reported'), P('Wer nur den größten berichtet, verschweigt die übrigen Tests und überschätzt den Befund.', 'Whoever reports only the largest conceals the other tests and overestimates the finding.')),
      a(P('Die Fehlervarianz ist für jeden Test neu aus einer einzigen Zelle zu schätzen', 'The error variance has to be estimated anew for each test from a single cell'), P('Einfache Effekte nutzen die gemeinsame Fehlervarianz aller Zellen und damit mehr Freiheitsgrade.', 'Simple effects use the pooled error variance of all cells and thus more degrees of freedom.'))
    ],
    hilfe: ['vv-einfache-effekte', 'holm'], belege: ['Hilfe:vv-einfache-effekte']
  },
  {
    id: 'vv-ee-t', thema: 'vavertiefen',
    stamm: P('Ein einfacher Effekt beträgt 8, sein Standardfehler 2. Wie groß ist t?', 'A simple effect is 8, its standard error 2. How large is t?'),
    antworten: [
      a(P('Der Wert 4', 'The value 4'), P('t ist der Effekt geteilt durch seinen Standardfehler: 8 : 2 = 4.', 't is the effect divided by its standard error: 8 : 2 = 4.'), true),
      a(P('Der Wert 16', 'The value 16'), P('Das ist das Produkt von Effekt und Standardfehler. t entsteht durch Teilen.', 'That is the product of effect and standard error. t arises by dividing.')),
      a(P('Der Wert 10', 'The value 10'), P('Das ist die Summe von Effekt und Standardfehler. t ist ein Verhältnis.', 'That is the sum of effect and standard error. t is a ratio.')),
      a(P('Der Wert 6', 'The value 6'), P('Das ist die Differenz von Effekt und Standardfehler. t ist ein Verhältnis und keine Differenz.', 'That is the difference of effect and standard error. t is a ratio and not a difference.'))
    ],
    hilfe: ['vv-einfache-effekte', 'einfache-effekte'], belege: ['Hilfe:vv-einfache-effekte']
  },
  {
    id: 'vv-ee-mehrfach', thema: 'vavertiefen', mehrfach: true,
    stamm: P('Welche Aussagen zu einfachen Effekten stimmen? Mehrere können stimmen.', 'Which statements about simple effects are true? Several may be true.'),
    antworten: [
      a(P('Bei gleich großen Zellen ist der Haupteffekt das Mittel der einfachen Effekte', 'With equally large cells the main effect is the mean of the simple effects'), P('Der Haupteffekt mittelt über die Stufen des anderen Faktors.', 'The main effect averages over the levels of the other factor.'), true),
      a(P('Einfache Effekte nutzen die Fehlervarianz des ganzen Modells', 'Simple effects use the error variance of the whole model'), P('Die gemeinsame Fehlervarianz aller Zellen liefert mehr Freiheitsgrade als eine einzelne Zelle.', 'The pooled error variance of all cells provides more degrees of freedom than a single cell.'), true),
      a(P('Zwei bedeutsame einfache Effekte beweisen, dass sie sich voneinander unterscheiden', 'Two significant simple effects prove that they differ from each other'), P('Beide können bedeutsam sein und sich kaum unterscheiden. Ob sie sich unterscheiden, beantwortet die Wechselwirkung.', 'Both can be significant and hardly differ. Whether they differ is answered by the interaction.')),
      a(P('Bei deutlicher Wechselwirkung ist der Haupteffekt die beste Beschreibung', 'With a clear interaction the main effect is the best description'), P('Dann ist er nur ein Durchschnitt aus verschiedenen Effekten.', 'Then it is only an average of different effects.'))
    ],
    hilfe: ['vv-einfache-effekte', 'einfache-effekte'], belege: ['wissen:dormann-interaktion-deuten', 'Hilfe:vv-einfache-effekte']
  },
  // ======================================================== 5. Sphärizität verstehen
  {
    id: 'vv-sp-was', thema: 'vavertiefen',
    stamm: P('Was beschreibt die Sphärizität bei einer Varianzanalyse mit Messwiederholung?', 'What does sphericity describe in an analysis of variance with repeated measures?'),
    antworten: [
      a(P('Die Unterschiede zwischen je zwei Zeitpunkten streuen ähnlich stark', 'The differences between any two points in time vary about equally'), P('Gemeint sind die Varianzen der Differenzen je Person zwischen zwei Zeitpunkten. Sie sollen für alle drei oder mehr Paare ähnlich groß sein.', 'What is meant are the variances of the differences per person between two points in time. They should be similar in size for all three or more pairs.'), true),
      a(P('Die Werte zu jedem Zeitpunkt streuen gleich stark', 'The values at each point in time vary equally'), P('Das wäre die Gleichheit der Varianzen der Zeitpunkte. Sphärizität betrifft die Unterschiede zwischen den Zeitpunkten.', 'That would be equality of the variances of the points in time. Sphericity concerns the differences between the points in time.')),
      a(P('Alle Zeitpunkte haben denselben Mittelwert', 'All points in time have the same mean'), P('Das wäre die Nullhypothese, die der Test prüft. Sphärizität ist eine Voraussetzung für den Test.', 'That would be the null hypothesis the test examines. Sphericity is a requirement for the test.')),
      a(P('Die Personen beeinflussen einander', 'The people influence each other'), P('Die Unabhängigkeit der Personen ist eine eigene Voraussetzung. Sphärizität betrifft die Zeitpunkte derselben Person.', 'The independence of the people is a requirement of its own. Sphericity concerns the points in time of the same person.'))
    ],
    hilfe: ['vv-sphaerizitaet', 'varianz-der-differenzen'], belege: ['Hilfe:vv-sphaerizitaet']
  },
  {
    id: 'vv-sp-ab', thema: 'vavertiefen',
    stamm: P('Ab wie vielen Messzeitpunkten ist die Sphärizität überhaupt ein Thema?', 'From how many points in time on is sphericity an issue at all?'),
    antworten: [
      a(P('Ab drei', 'From three'), P('Mit zwei Zeitpunkten gibt es nur einen Unterschied je Person und damit nur eine Varianz. Es gibt nichts zu vergleichen.', 'With two points in time there is only one difference per person and thus only one variance. There is nothing to compare.'), true),
      a(P('Ab zwei', 'From two'), P('Mit zwei Zeitpunkten entsteht nur ein Unterschied je Person. Zwei Varianzen, die ähnlich sein könnten, gibt es erst ab drei Zeitpunkten.', 'With two points in time only one difference per person arises. Variances that could be similar exist from three points in time.')),
      a(P('Ab vier', 'From four'), P('Schon mit drei Zeitpunkten gibt es drei Paare und damit drei Varianzen der Unterschiede.', 'Even with three points in time there are three pairs and thus three variances of the differences.')),
      a(P('Ab fünf', 'From five'), P('Das wäre zu spät: Schon bei drei Zeitpunkten kann die Sphärizität verletzt sein.', 'That would be too late: sphericity can already be violated with three points in time.'))
    ],
    hilfe: ['vv-sphaerizitaet', 'sphaerizitaet'], belege: ['Hilfe:vv-sphaerizitaet']
  },
  {
    id: 'vv-sp-rechnen', thema: 'vavertiefen',
    stamm: P('Drei Personen haben zwischen zwei Zeitpunkten die Unterschiede 1, 3 und 5. Wie groß ist die Varianz dieser Unterschiede (mit n − 1 im Nenner)?', 'Three people have the differences 1, 3 and 5 between two points in time. How large is the variance of these differences (with n − 1 in the denominator)?'),
    antworten: [
      a(P('Der Wert 4', 'The value 4'), P('Der Mittelwert ist 3, die Quadratsumme 4 + 0 + 4 = 8, und 8 : (3 − 1) ergibt 4.', 'The mean is 3, the sum of squares 4 + 0 + 4 = 8, and 8 : (3 − 1) gives 4.'), true),
      a(P('Der Wert 8', 'The value 8'), P('Das ist die Quadratsumme. Für die Varianz wird noch durch n − 1 geteilt.', 'That is the sum of squares. For the variance it is still divided by n − 1.')),
      a(P('Der Wert 3', 'The value 3'), P('Das ist der Mittelwert der Unterschiede, nicht ihre Varianz.', 'That is the mean of the differences, not their variance.')),
      a(P('Der Wert 9', 'The value 9'), P('Das ist die Summe der Unterschiede. Die Varianz misst die Streuung um den Mittelwert.', 'That is the sum of the differences. The variance measures the spread around the mean.'))
    ],
    hilfe: ['vv-sphaerizitaet', 'varianz-der-differenzen'], belege: ['Hilfe:vv-sphaerizitaet']
  },
  {
    id: 'vv-sp-eps1', thema: 'vavertiefen',
    stamm: P('Epsilon beträgt 1. Was bedeutet das?', 'Epsilon is 1. What does that mean?'),
    antworten: [
      a(P('Die Sphärizität ist erfüllt; die Freiheitsgrade bleiben unverändert', 'Sphericity is met; the degrees of freedom stay unchanged'), P('Epsilon 1 ist der Bestwert. Die Freiheitsgrade werden mit 1 multipliziert und ändern sich nicht.', 'Epsilon 1 is the best value. The degrees of freedom are multiplied by 1 and do not change.'), true),
      a(P('Die Sphärizität ist stark verletzt', 'Sphericity is strongly violated'), P('Je stärker die Verletzung, desto kleiner wird Epsilon. Bei 1 ist keine Verletzung erkennbar.', 'The stronger the violation, the smaller epsilon becomes. At 1 no violation is recognisable.')),
      a(P('Der Effekt der Zeit ist maximal', 'The effect of time is maximal'), P('Epsilon sagt nichts über die Größe des Effekts. Es betrifft nur die Voraussetzung des Tests.', 'Epsilon says nothing about the size of the effect. It concerns only the requirement of the test.')),
      a(P('Es gibt nur einen Messzeitpunkt', 'There is only one point in time'), P('Epsilon braucht mindestens drei Zeitpunkte, um etwas auszusagen.', 'Epsilon needs at least three points in time to say anything.'))
    ],
    hilfe: ['vv-sphaerizitaet', 'epsilon'], belege: ['Hilfe:vv-sphaerizitaet']
  },
  {
    id: 'vv-sp-freiheit', thema: 'vavertiefen',
    stamm: P('Ein F-Test mit Messwiederholung hat 2 und 20 Freiheitsgrade, Epsilon beträgt ein halb. Mit welchen Freiheitsgraden rechnet der korrigierte Test?', 'An F test with repeated measures has 2 and 20 degrees of freedom, epsilon is one half. Which degrees of freedom does the corrected test use?'),
    antworten: [
      a(P('1 und 10', '1 and 10'), P('Beide Freiheitsgrade werden mit Epsilon multipliziert: 2 mal ein halb und 20 mal ein halb.', 'Both degrees of freedom are multiplied by epsilon: 2 times one half and 20 times one half.'), true),
      a(P('2 und 10', '2 and 10'), P('Es werden beide Freiheitsgrade korrigiert, nicht nur der des Nenners.', 'Both degrees of freedom are corrected, not only that of the denominator.')),
      a(P('1 und 20', '1 and 20'), P('Es werden beide Freiheitsgrade korrigiert, nicht nur der des Zählers.', 'Both degrees of freedom are corrected, not only that of the numerator.')),
      a(P('4 und 40', '4 and 40'), P('Epsilon liegt unter 1 und verkleinert die Freiheitsgrade. Ein Verdoppeln würde den Test großzügiger machen.', 'Epsilon is below 1 and shrinks the degrees of freedom. Doubling would make the test more generous.'))
    ],
    hilfe: ['vv-sphaerizitaet', 'epsilon'], belege: ['Hilfe:vv-sphaerizitaet']
  },
  {
    id: 'vv-sp-mauchly', thema: 'vavertiefen',
    stamm: P('Warum wird statt der Ja-Nein-Entscheidung mit dem Mauchly-Test besser die Korrektur mit Epsilon berichtet?', 'Why is it better to report the correction with epsilon instead of the yes-no decision with Mauchly\'s test?'),
    antworten: [
      a(P('Epsilon ist ein stetiges Maß; der Mauchly-Test übersieht bei kleinen Gruppen oft Verletzungen und schlägt bei großen schon bei winzigen Abweichungen an', 'Epsilon is a continuous measure; Mauchly\'s test often overlooks violations in small groups and fires at tiny deviations in large ones'), P('Die Entscheidung des Tests hängt stark von der Gruppengröße ab. Epsilon verkleinert die Freiheitsgrade stetig mit der Verletzung.', 'The decision of the test depends strongly on the group size. Epsilon shrinks the degrees of freedom steadily with the violation.'), true),
      a(P('Der Mauchly-Test gilt nur für Studien mit zwei Gruppen', 'Mauchly\'s test applies only to studies with two groups'), P('Er gehört zur Messwiederholung mit drei oder mehr Zeitpunkten; Gruppen spielen keine Rolle.', 'It belongs to repeated measures with three or more points in time; groups play no role.')),
      a(P('Epsilon vergrößert die Freiheitsgrade und macht den Test empfindlicher', 'Epsilon enlarges the degrees of freedom and makes the test more sensitive'), P('Epsilon liegt höchstens bei 1 und verkleinert die Freiheitsgrade. Der Test wird vorsichtiger.', 'Epsilon is at most 1 and shrinks the degrees of freedom. The test becomes more cautious.')),
      a(P('Der Mauchly-Test prüft die Mittelwerte und nicht die Streuung', 'Mauchly\'s test checks the means and not the spread'), P('Er prüft gerade die Gleichheit der Varianzen der Unterschiede.', 'It checks precisely the equality of the variances of the differences.'))
    ],
    hilfe: ['vv-sphaerizitaet', 'mauchly'], belege: ['Hilfe:vv-sphaerizitaet']
  },
  {
    id: 'vv-sp-mehrfach', thema: 'vavertiefen', mehrfach: true,
    stamm: P('Welche Aussagen zur Sphärizität stimmen? Mehrere können stimmen.', 'Which statements about sphericity are true? Several may be true.'),
    antworten: [
      a(P('Gemeint sind die Varianzen der Unterschiede zwischen den Zeitpunkten, nicht die der Zeitpunkte selbst', 'What is meant are the variances of the differences between the points in time, not those of the points in time themselves'), P('Die Werte der Zeitpunkte können verschieden streuen, und die Sphärizität kann dennoch erfüllt sein.', 'The values at the points in time can vary differently and sphericity can still be met.'), true),
      a(P('Greenhouse-Geisser und Huynh-Feldt sind zwei Schätzungen für Epsilon', 'Greenhouse-Geisser and Huynh-Feldt are two estimates for epsilon'), P('Beide verkleinern die Freiheitsgrade mit dem geschätzten Faktor.', 'Both shrink the degrees of freedom with the estimated factor.'), true),
      a(P('Bei zwei Zeitpunkten ist die Sphärizität stark verletzt', 'With two points in time sphericity is strongly violated'), P('Bei zwei Zeitpunkten gibt es nur einen Unterschied je Person. Verletzt sein kann nichts.', 'With two points in time there is only one difference per person. Nothing can be violated.')),
      a(P('Ein kleineres Epsilon macht den Test großzügiger', 'A smaller epsilon makes the test more generous'), P('Ein kleineres Epsilon verkleinert die Freiheitsgrade und macht den Test strenger.', 'A smaller epsilon shrinks the degrees of freedom and makes the test stricter.'))
    ],
    hilfe: ['vv-sphaerizitaet', 'epsilon'], belege: ['Hilfe:vv-sphaerizitaet']
  },
  // ======================================================== 6. Kontrollgruppe und Dunnett
  {
    id: 'vv-du-wann', thema: 'vavertiefen',
    stamm: P('Ein Versuch hat eine Kontrollgruppe und drei Behandlungen. Gefragt ist nur, welche Behandlung sich von der Kontrolle unterscheidet. Welches Verfahren passt am besten?', 'An experiment has a control group and three treatments. The only question is which treatment differs from the control. Which procedure fits best?'),
    antworten: [
      a(P('Der Dunnett-Test', 'The Dunnett test'), P('Er vergleicht jede Behandlung mit der Kontrolle und schützt genau diese Vergleiche. Mit weniger Vergleichen ist er schärfer.', 'It compares each treatment with the control and protects exactly these comparisons. With fewer comparisons it is more powerful.'), true),
      a(P('Der Tukey-Test', 'The Tukey test'), P('Er prüft alle Paare und muss deshalb strenger sein, als die Frage verlangt.', 'It tests all pairs and therefore has to be stricter than the question requires.')),
      a(P('Der Levene-Test', 'Levene\'s test'), P('Er prüft die Gleichheit der Streuungen und vergleicht keine Mittelwerte.', 'It checks equality of the spreads and compares no means.')),
      a(P('Drei t-Tests, jeder mit dem vollen Niveau von 5 %', 'Three t tests, each with the full level of 5%'), P('Drei ungeschützte Tests treiben den Familienfehler auf rund 14 %.', 'Three unprotected tests drive the family error to about 14%.'))
    ],
    hilfe: ['vv-dunnett', 'dunnett'], belege: ['wissen:tukey-hsd-familienweise', 'Hilfe:vv-dunnett']
  },
  {
    id: 'vv-du-paare', thema: 'vavertiefen',
    stamm: P('Wie viele Paarvergleiche gibt es bei fünf Gruppen, wenn jede Gruppe mit jeder anderen verglichen wird?', 'How many pairwise comparisons are there with five groups if every group is compared with every other?'),
    antworten: [
      a(P('Der Wert 10', 'The value 10'), P('5 mal 4 durch 2 ergibt 10. Jedes Paar zählt nur einmal.', '5 times 4 divided by 2 gives 10. Each pair counts only once.'), true),
      a(P('Der Wert 20', 'The value 20'), P('Das wäre 5 mal 4. Dabei würde jedes Paar doppelt gezählt (A gegen B und B gegen A).', 'That would be 5 times 4. Every pair would be counted twice (A against B and B against A).')),
      a(P('Der Wert 5', 'The value 5'), P('Das ist die Zahl der Gruppen, nicht die der Paare.', 'That is the number of groups, not the number of pairs.')),
      a(P('Der Wert 4', 'The value 4'), P('Das ist die Zahl der Vergleiche mit einer festen Kontrolle, nicht die aller Paare.', 'That is the number of comparisons with a fixed control, not of all pairs.'))
    ],
    hilfe: ['vv-dunnett', 'paarvergleich'], belege: ['Hilfe:vv-dunnett']
  },
  {
    id: 'vv-du-kontrolle', thema: 'vavertiefen',
    stamm: P('Wie viele Vergleiche gibt es bei fünf Gruppen, von denen eine die Kontrollgruppe ist, wenn nur jede Behandlung mit der Kontrolle verglichen wird?', 'How many comparisons are there with five groups, one of which is the control group, if only each treatment is compared with the control?'),
    antworten: [
      a(P('Der Wert 4', 'The value 4'), P('Es gibt vier Behandlungen, also vier Vergleiche mit der Kontrolle.', 'There are four treatments, so four comparisons with the control.'), true),
      a(P('Der Wert 5', 'The value 5'), P('Die Kontrolle wird nicht mit sich selbst verglichen. Es zählen nur die Behandlungen.', 'The control is not compared with itself. Only the treatments count.')),
      a(P('Der Wert 10', 'The value 10'), P('Das sind alle Paare. Hier zählen nur die Paare mit der Kontrolle.', 'Those are all pairs. Only the pairs with the control count here.')),
      a(P('Der Wert 8', 'The value 8'), P('Es wurde jeder Vergleich doppelt gezählt. Behandlung gegen Kontrolle und Kontrolle gegen Behandlung sind dasselbe.', 'Every comparison was counted twice. Treatment against control and control against treatment are the same.'))
    ],
    hilfe: ['vv-dunnett', 'kontrollgruppe'], belege: ['Hilfe:vv-dunnett']
  },
  {
    id: 'vv-du-formel', thema: 'vavertiefen',
    stamm: P('Vier unabhängige Tests mit je α = 5 %, alle Nullhypothesen sind wahr. Welcher Ausdruck gibt die Wahrscheinlichkeit für mindestens einen Fehlalarm?', 'Four independent tests with α = 5% each, all null hypotheses are true. Which expression gives the probability of at least one false alarm?'),
    antworten: [
      a(P('1 − (1 − α) hoch 4', '1 − (1 − α) to the power 4'), P('(1 − α) hoch 4 ist die Wahrscheinlichkeit, dass kein Test anschlägt. Der Rest zu 1 ist die Wahrscheinlichkeit für mindestens einen Fehlalarm.', '(1 − α) to the power 4 is the probability that no test fires. The remainder to 1 is the probability of at least one false alarm.'), true),
      a(P('Der Wert 4 · α', 'The value 4 · α'), P('Das ist die einfache Summe. Sie überschätzt den Fehler, weil sich die Fälle überlappen.', 'That is the simple sum. It overestimates the error because the cases overlap.')),
      a(P('α hoch 4', 'α to the power 4'), P('Das wäre die Wahrscheinlichkeit, dass alle vier Tests anschlagen.', 'That would be the probability that all four tests fire.')),
      a(P('(1 − α) hoch 4', '(1 − α) to the power 4'), P('Das ist die Wahrscheinlichkeit, dass kein Test anschlägt, nicht die für mindestens einen.', 'That is the probability that no test fires, not that of at least one.'))
    ],
    hilfe: ['vv-dunnett', 'familienfehlerrate'], belege: ['wissen:alpha-kumulierung', 'Hilfe:vv-dunnett']
  },
  {
    id: 'vv-du-ergebnis', thema: 'vavertiefen',
    stamm: P('Sechs unabhängige Tests mit je 5 %, alle Nullhypothesen sind wahr. Wie groß ist die Wahrscheinlichkeit für mindestens einen Fehlalarm ungefähr?', 'Six independent tests at 5% each, all null hypotheses are true. About how large is the probability of at least one false alarm?'),
    antworten: [
      a(P('Rund 26 %', 'About 26%'), P('Mit 74 % bleibt jeder Satz von sechs Tests ohne Fehlalarm; der Rest, rund 26 %, ist die Wahrscheinlichkeit für mindestens einen.', 'With 74% a set of six tests stays without a false alarm; the remainder, about 26%, is the probability of at least one.'), true),
      a(P('Der Wert 5 %', 'The value 5%'), P('Das ist das Niveau eines einzelnen Tests, nicht der Familienfehler von sechs Tests.', 'That is the level of a single test, not the family error of six tests.')),
      a(P('Der Wert 30 %', 'The value 30%'), P('Das ist die einfache Summe von sechs mal 5 %. Sie überschätzt den Fehler, weil sich die Fälle überlappen.', 'That is the simple sum of six times 5%. It overestimates the error because the cases overlap.')),
      a(P('Der Wert 74 %', 'The value 74%'), P('Das ist die Wahrscheinlichkeit, dass kein Test anschlägt. Gefragt ist die für mindestens einen Fehlalarm.', 'That is the probability that no test fires. The probability of at least one false alarm is asked for.'))
    ],
    hilfe: ['vv-dunnett', 'familienfehlerrate'], belege: ['wissen:alpha-kumulierung', 'Hilfe:vv-dunnett']
  },
  {
    id: 'vv-du-vorab', thema: 'vavertiefen',
    stamm: P('Wann muss die Kontrollgruppe für den Dunnett-Test festgelegt werden?', 'When does the control group for the Dunnett test have to be fixed?'),
    antworten: [
      a(P('Vor dem Blick auf die Daten, aus der Forschungsfrage heraus', 'Before looking at the data, from the research question'), P('Der Schutz des Tests gilt für Vergleiche, die vorab feststanden. Eine Kontrolle, die erst nach den Daten gewählt wird, hebt ihn auf.', 'The protection of the test applies to comparisons that were fixed beforehand. A control chosen only after the data removes it.'), true),
      a(P('Nach dem Blick auf die Mittelwerte, am besten die Gruppe mit dem kleinsten Mittel', 'After looking at the means, best the group with the smallest mean'), P('Wer die Kontrolle nach den Mittelwerten wählt, sucht sich den auffälligsten Vergleich aus und überschätzt den Befund.', 'Whoever chooses the control after the means picks out the most striking comparison and overestimates the finding.')),
      a(P('Nach den Paarvergleichen, aus den bedeutsamen Paaren', 'After the pairwise comparisons, from the significant pairs'), P('Das wäre eine Wahl aus den Ergebnissen. Die Kontrolle muss unabhängig von den Ergebnissen feststehen.', 'That would be a choice from the results. The control has to be fixed independently of the results.')),
      a(P('Beim Dunnett-Test gibt es keine Kontrollgruppe', 'The Dunnett test has no control group'), P('Die Kontrollgruppe ist der Kern des Tests: Alle Vergleiche gehen gegen sie.', 'The control group is the core of the test: all comparisons go against it.'))
    ],
    hilfe: ['vv-dunnett', 'kontrollgruppe'], belege: ['Hilfe:vv-dunnett']
  },
  {
    id: 'vv-du-mehrfach', thema: 'vavertiefen', mehrfach: true,
    stamm: P('Welche Aussagen zu Kontrollgruppe und Familienfehler stimmen? Mehrere können stimmen.', 'Which statements about the control group and the family error are true? Several may be true.'),
    antworten: [
      a(P('Der Dunnett-Test schützt nur die Vergleiche mit der Kontrolle', 'The Dunnett test protects only the comparisons with the control'), P('Die Vergleiche zwischen den Behandlungen sind darin nicht abgedeckt.', 'Comparisons between the treatments are not covered by it.'), true),
      a(P('Die einfache Summe der Einzelniveaus überschätzt die Familienfehlerrate', 'The simple sum of the single levels overestimates the family-wise error rate'), P('Die Fälle überlappen sich; richtig ist bei unabhängigen Tests 1 − (1 − α) hoch m.', 'The cases overlap; for independent tests the correct formula is 1 − (1 − α) to the power m.'), true),
      a(P('Wer eine Kontrollgruppe hat, braucht keine Korrektur', 'Whoever has a control group needs no correction'), P('Jeder Vergleich mit der Kontrolle ist ein eigener Test, und mehrere Tests erhöhen die Chance auf einen Fehlalarm.', 'Each comparison with the control is a test of its own, and several tests raise the chance of a false alarm.')),
      a(P('Der Tukey-Test prüft nur Vergleiche mit der Kontrollgruppe', 'The Tukey test checks only comparisons with the control group'), P('Der Tukey-Test prüft alle Paare.', 'The Tukey test checks all pairs.'))
    ],
    hilfe: ['vv-dunnett', 'dunnett'], belege: ['wissen:alpha-kumulierung', 'Hilfe:vv-dunnett']
  }
];
