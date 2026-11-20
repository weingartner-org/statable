/**
 * Seitenleiste der Kachel „Verteilungen berechnen“ (Meldung 31.10.2026): Sie erklärt die gewählte Verteilung, die gewählte Frage in Verbindung mit
 * dieser Verteilung und, nach einem Wechsel, wie die vorige und die neue Verteilung zusammenhängen. Was zuletzt geändert wurde, steht oben.
 * Die Zahlen in den Texten prüft `verteilungrand.test.ts` gegen `verteilungen.ts`.
 */
import { L } from './sitzung.svelte';
import type { Art, Modus } from '../bausteine/VerstehenVerteilungen.svelte';

export interface RandAbsatz { titel: string; text: string }
export const DISKRET: Record<Art, boolean> = { normal: false, t: false, chi2: false, f: false, binom: true, poisson: true, hyper: true, eigen: true };

export const artName = (a: Art): string => {
  switch (a) {
    case 'normal': return L('Normalverteilung', 'Normal distribution');
    case 't': return L('t-Verteilung', 't distribution');
    case 'chi2': return L('χ²-Verteilung (Chi-Quadrat)', 'χ² distribution (chi-square)');
    case 'f': return L('F-Verteilung', 'F distribution');
    case 'binom': return L('Binomialverteilung', 'Binomial distribution');
    case 'poisson': return L('Poisson-Verteilung', 'Poisson distribution');
    case 'hyper': return L('Hypergeometrische Verteilung', 'Hypergeometric distribution');
    case 'eigen': return L('Eigene Tabelle', 'Own table');
  }
};

export const artText = (a: Art): string => {
  switch (a) {
    case 'normal': return L('Die Glockenkurve: symmetrisch um den Mittelwert μ, die Standardabweichung σ bestimmt die Breite. Viele Messgrößen sind ungefähr so verteilt, Mittelwerte großer Stichproben fast immer (zentraler Grenzwertsatz). N(0; 1) heißt Standardnormalverteilung, ihre Werte sind die z-Werte.',
      'The bell curve: symmetric around the mean μ, the standard deviation σ sets its width. Many measurements are roughly distributed like this, and means of large samples almost always are (central limit theorem). N(0; 1) is called the standard normal distribution, its values are the z-scores.');
    case 't': return L('Sieht aus wie die Glockenkurve, hat aber breitere Ränder. Sie gehört zu Mittelwerten, wenn auch die Streuung aus derselben Stichprobe geschätzt wird: Diese zusätzliche Unsicherheit macht die Ränder breiter. Die Freiheitsgrade (df) sind beim Test mit einer Gruppe n - 1. Einsatz: t-Test, Konfidenzintervall für einen Mittelwert, Koeffizienten der Regression.',
      'Looks like the bell curve but has wider tails. It belongs to means when the spread is also estimated from the same sample: this extra uncertainty widens the tails. The degrees of freedom (df) are n - 1 for the one-group test. Used in: t test, confidence interval for a mean, regression coefficients.');
    case 'chi2': return L('Das Zeichen χ ist der griechische Buchstabe Chi, kein x. Die Werte sind nie negativ, die Kurve läuft nach rechts aus. Sie entsteht als Summe quadrierter Standardnormal-Werte, die Freiheitsgrade (df) zählen die Summanden. Der Erwartungswert ist df, die Varianz 2 · df. Einsatz: χ²-Test bei Kreuztabellen und Anpassungstests, Intervall für eine Varianz.',
      'The sign χ is the Greek letter chi, not an x. The values are never negative and the curve tails off to the right. It arises as a sum of squared standard normal values, the degrees of freedom (df) count the terms. The mean is df, the variance 2 · df. Used in: χ² test for cross tables and goodness of fit, interval for a variance.');
    case 'f': return L('Das Verhältnis zweier Streuungen (Varianzen), darum nie negativ und mit zwei Freiheitsgraden: df₁ für den Zähler, df₂ für den Nenner. Werte um 1 heißen: beide Streuungen sind etwa gleich groß. Einsatz: Varianzanalyse, Gesamttest der Regression, Vergleich zweier Varianzen.',
      'The ratio of two spreads (variances), hence never negative and with two degrees of freedom: df₁ for the numerator, df₂ for the denominator. Values around 1 mean that both spreads are about equal. Used in: analysis of variance, overall test of a regression, comparing two variances.');
    case 'binom': return L('Zählt Treffer bei n gleichen, unabhängigen Versuchen mit gleicher Trefferwahrscheinlichkeit p: zum Beispiel richtige Antworten beim Raten. Möglich sind die ganzen Zahlen 0 bis n. Der Erwartungswert ist n · p, die Varianz n · p · (1 - p). Einsatz: Binomialtest, Anteile.',
      'Counts hits in n identical, independent trials with the same hit probability p: for example right answers when guessing. Possible values are the whole numbers 0 to n. The mean is n · p, the variance n · p · (1 - p). Used in: binomial test, proportions.');
    case 'poisson': return L('Zählt Ereignisse in einem festen Zeitraum oder Gebiet, die unabhängig voneinander mit fester mittlerer Rate auftreten: zum Beispiel Anrufe je Stunde. λ (Lambda) ist die mittlere Anzahl. Es gibt keine feste Obergrenze. Erwartungswert und Varianz sind beide λ. Einsatz: Zähldaten, Raten, Poisson-Regression.',
      'Counts events in a fixed period or area that occur independently of each other at a fixed average rate: for example calls per hour. λ (lambda) is the mean count. There is no fixed upper limit. Mean and variance are both λ. Used in: count data, rates, Poisson regression.');
    case 'hyper': return L('Zählt Treffer beim Ziehen ohne Zurücklegen: Aus N Dingen, davon K Treffer, werden n gezogen. Lotto 6 aus 49 ist das Standardbeispiel. Jede Ziehung ändert die Lage für die nächste, darum sind die Züge nicht unabhängig. Einsatz: exakter Test nach Fisher, Stichproben aus kleinen Gruppen.',
      'Counts hits when drawing without replacement: from N things, K of them hits, n are drawn. Lotto 6 of 49 is the standard example. Each draw changes the situation for the next one, so the draws are not independent. Used in: Fisher\'s exact test, samples from small groups.');
    case 'eigen': return L('Jede Verteilung mit endlich vielen Werten lässt sich als Tabelle aus Wert und Wahrscheinlichkeit angeben. Die Wahrscheinlichkeiten müssen zusammen 1 ergeben. Der Erwartungswert ist die Summe aus Wert mal Wahrscheinlichkeit.',
      'Any distribution with finitely many values can be given as a table of value and probability. The probabilities must add up to 1. The mean is the sum of value times probability.');
  }
};

const frageName = (m: Modus): string => {
  switch (m) {
    case 'links': return L('höchstens (≤)', 'at most (≤)');
    case 'linksStreng': return L('weniger als (<)', 'less than (<)');
    case 'rechts': return L('mindestens (≥)', 'at least (≥)');
    case 'rechtsStreng': return L('mehr als (>)', 'more than (>)');
    case 'zwischen': return L('zwischen (a ≤ X ≤ b)', 'between (a ≤ X ≤ b)');
    case 'quantil': return L('Wert zu einer Wahrscheinlichkeit (Quantil)', 'value for a probability (quantile)');
  }
};

const frageStetig = (m: Modus): string => {
  switch (m) {
    case 'links': return L('Die Fläche unter der Kurve links von x. Bei stetigen Verteilungen hat ein einzelner Wert die Wahrscheinlichkeit 0, darum ist „höchstens“ gleich „weniger als“.', 'The area under the curve to the left of x. In continuous distributions a single value has probability 0, so "at most" equals "less than".');
    case 'linksStreng': return L('Die Fläche unter der Kurve links von x. Bei stetigen Verteilungen ist das dieselbe Zahl wie „höchstens“, weil ein einzelner Wert die Wahrscheinlichkeit 0 hat.', 'The area under the curve to the left of x. In continuous distributions this is the same number as "at most", because a single value has probability 0.');
    case 'rechts': return L('Die Fläche unter der Kurve rechts von x. Bei stetigen Verteilungen ist das dieselbe Zahl wie „mehr als“.', 'The area under the curve to the right of x. In continuous distributions this is the same number as "more than".');
    case 'rechtsStreng': return L('Die Fläche unter der Kurve rechts von x. Bei stetigen Verteilungen ist das dieselbe Zahl wie „mindestens“.', 'The area under the curve to the right of x. In continuous distributions this is the same number as "at least".');
    case 'zwischen': return L('Die Fläche zwischen a und b, gerechnet als P(X ≤ b) - P(X ≤ a).', 'The area between a and b, calculated as P(X ≤ b) - P(X ≤ a).');
    case 'quantil': return L('Umgekehrte Frage: Gegeben ist die Fläche links, gesucht der Wert x dazu.', 'The reverse question: the area to the left is given, the value x is sought.');
  }
};
const frageDiskret = (m: Modus): string => {
  switch (m) {
    case 'links': return L('Alle Säulen bis einschließlich x werden addiert. Bei ganzen Zahlen ist das etwas anderes als „weniger als“.', 'All bars up to and including x are added. With whole numbers this differs from "less than".');
    case 'linksStreng': return L('Die Säule x zählt nicht mit: P(X < x) ist P(X ≤ x - 1), wenn nur ganze Zahlen möglich sind.', 'The bar x does not count: P(X < x) is P(X ≤ x - 1) when only whole numbers are possible.');
    case 'rechts': return L('Die Säule x zählt mit: P(X ≥ x) = 1 - P(X ≤ x - 1), wenn nur ganze Zahlen möglich sind. Der häufigste Rechenfehler ist 1 - P(X ≤ x).', 'The bar x counts: P(X ≥ x) = 1 - P(X ≤ x - 1) when only whole numbers are possible. The most common slip is 1 - P(X ≤ x).');
    case 'rechtsStreng': return L('Die Säule x zählt nicht mit: P(X > x) = 1 - P(X ≤ x).', 'The bar x does not count: P(X > x) = 1 - P(X ≤ x).');
    case 'zwischen': return L('Beide Grenzen zählen mit: P(a ≤ X ≤ b) = P(X ≤ b) - P(X ≤ a - 1), wenn nur ganze Zahlen möglich sind.', 'Both limits count: P(a ≤ X ≤ b) = P(X ≤ b) - P(X ≤ a - 1) when only whole numbers are possible.');
    case 'quantil': return L('Gesucht ist das kleinste x, bei dem P(X ≤ x) die Wahrscheinlichkeit p mindestens erreicht. Wegen der Sprünge wird p meist überschritten.', 'The smallest x is sought for which P(X ≤ x) reaches at least p. Because of the jumps, p is usually exceeded.');
  }
};

/** Was genau diese Frage bei genau dieser Verteilung bedeutet. */
const frageBeiArt = (a: Art, m: Modus): string => {
  const rechts = m === 'rechts' || m === 'rechtsStreng', links = m === 'links' || m === 'linksStreng';
  switch (a) {
    case 'normal':
      if (links) return L('Das ist der Wert, den z-Tabellen angeben, mit z = (x - μ) / σ.', 'This is the value z tables give, with z = (x - μ) / σ.');
      if (rechts) return L('Wegen der Symmetrie ist die Fläche rechts von μ + a so groß wie die Fläche links von μ - a.', 'Because of the symmetry, the area to the right of μ + a equals the area to the left of μ - a.');
      if (m === 'zwischen') return L('Zwischen μ - σ und μ + σ liegen rund 68 %, zwischen μ - 2σ und μ + 2σ rund 95 %.', 'About 68 % lie between μ - σ and μ + σ, about 95 % between μ - 2σ and μ + 2σ.');
      return L('Bei N(0; 1) und p = 0,975 ergibt sich 1,96: die Grenze des 95-%-Konfidenzintervalls bei bekannter Streuung.', 'For N(0; 1) and p = 0.975 the result is 1.96: the limit of the 95 % confidence interval with known spread.');
    case 't':
      if (rechts) return L('So entsteht der einseitige p-Wert eines t-Tests. Der zweiseitige p-Wert ist wegen der Symmetrie doppelt so groß.', 'This is how the one-sided p value of a t test arises. Because of the symmetry, the two-sided p value is twice as large.');
      if (links) return L('Die Kurve ist symmetrisch um 0: Die Fläche links von -x ist so groß wie die Fläche rechts von x.', 'The curve is symmetric around 0: the area to the left of -x equals the area to the right of x.');
      if (m === 'zwischen') return L('Zwischen -2,228 und 2,228 liegen bei df = 10 genau 95 %. Diese Grenzen braucht das Konfidenzintervall.', 'With df = 10, exactly 95 % lie between -2.228 and 2.228. The confidence interval needs these limits.');
      return L('Der kritische Wert des t-Tests: Bei df = 10 und p = 0,975 ergibt sich 2,228. Bei der Normalverteilung wären es 1,96, die breiteren Ränder schieben ihn nach außen.', 'The critical value of the t test: with df = 10 and p = 0.975 the result is 2.228. For the normal distribution it would be 1.96, the wider tails push it outward.');
    case 'chi2':
      if (rechts) return L('Das ist der p-Wert des χ²-Tests: Es zählt nur der rechte Rand, weil große Abweichungen große χ²-Werte ergeben.', 'This is the p value of the χ² test: only the right tail counts, because large deviations give large χ² values.');
      if (links) return L('Bei Tests selten gefragt: Sehr kleine χ²-Werte heißen, dass die Daten auffällig genau zur Erwartung passen.', 'Rarely asked in tests: very small χ² values mean that the data fit the expectation remarkably closely.');
      if (m === 'zwischen') return L('Wird zum Beispiel beim Konfidenzintervall für eine Varianz gebraucht: Die Kurve ist schief, darum sind die beiden Grenzen nicht symmetrisch.', 'Needed for example for the confidence interval of a variance: the curve is skewed, so the two limits are not symmetric.');
      return L('Der kritische Wert des χ²-Tests: Bei df = 10 und p = 0,95 ergibt sich 18,31.', 'The critical value of the χ² test: with df = 10 and p = 0.95 the result is 18.31.');
    case 'f':
      if (rechts) return L('Das ist der p-Wert der Varianzanalyse: Es zählt der rechte Rand, weil große Gruppenunterschiede große F-Werte ergeben.', 'This is the p value of the analysis of variance: the right tail counts, because large group differences give large F values.');
      if (links) return L('Bei der Varianzanalyse selten gefragt. Beim zweiseitigen Vergleich zweier Varianzen zählt auch dieser linke Rand.', 'Rarely asked in the analysis of variance. In the two-sided comparison of two variances this left tail counts as well.');
      if (m === 'zwischen') return L('Selten gefragt, nützlich zum Verstehen: Wie viel der Fläche liegt um den Wert 1, wo beide Streuungen gleich wären?', 'Rarely asked, useful for understanding: how much of the area lies around the value 1, where both spreads would be equal?');
      return L('Der kritische Wert des F-Tests: Bei df₁ = 3, df₂ = 12 und p = 0,95 ergibt sich 3,49.', 'The critical value of the F test: with df₁ = 3, df₂ = 12 and p = 0.95 the result is 3.49.');
    case 'binom':
      if (rechts) return L('So entsteht der einseitige p-Wert des Binomialtests nach oben. Die Summe endet bei n.', 'This is how the upper one-sided p value of the binomial test arises. The sum ends at n.');
      if (links) return L('Die Summe beginnt bei 0. Das ist auch der einseitige p-Wert des Binomialtests nach unten.', 'The sum starts at 0. This is also the lower one-sided p value of the binomial test.');
      if (m === 'zwischen') return L('Mehr als n Treffer gibt es nicht: Grenzen über n ändern nichts.', 'There are no more than n hits: limits above n change nothing.');
      return L('Damit lassen sich kritische Werte und der Ablehnungsbereich des Binomialtests finden.', 'This finds critical values and the rejection region of the binomial test.');
    case 'poisson':
      if (rechts) return L('Es gibt keine Obergrenze, also unendlich viele Säulen rechts. Darum rechnet man über die Gegenwahrscheinlichkeit: 1 minus die Säulen links.', 'There is no upper limit, so infinitely many bars lie to the right. That is why the complement is used: 1 minus the bars to the left.');
      if (links) return L('Die Summe beginnt bei 0 und hat endlich viele Säulen.', 'The sum starts at 0 and has finitely many bars.');
      if (m === 'zwischen') return L('Beispiel mit λ = 4,5: Die Wahrscheinlichkeit für 2 bis 6 Ereignisse umfasst den größten Teil der Säulen um den Mittelwert.', 'Example with λ = 4.5: the probability of 2 to 6 events covers most of the bars around the mean.');
      return L('Damit lässt sich zum Beispiel planen: Wie viele Anrufe sind in 95 % der Stunden höchstens zu erwarten?', 'This helps with planning, for example: how many calls are to be expected at most in 95 % of the hours?');
    case 'hyper':
      if (rechts) return L('So entsteht der einseitige p-Wert des exakten Tests nach Fisher. Mehr Treffer als das Kleinere von K und n gibt es nicht.', 'This is how the one-sided p value of Fisher\'s exact test arises. There cannot be more hits than the smaller of K and n.');
      if (links) return L('Weniger Treffer als das Größere von 0 und n + K - N sind nicht möglich.', 'Fewer hits than the larger of 0 and n + K - N are not possible.');
      if (m === 'zwischen') return L('Beim Lotto: P(3 ≤ X ≤ 6) ist die Wahrscheinlichkeit für mindestens drei Richtige.', 'In the lottery: P(3 ≤ X ≤ 6) is the probability of at least three right numbers.');
      return L('Wegen der Sprünge wird p meist überschritten, bei kleinen Gruppen deutlich.', 'Because of the jumps, p is usually exceeded, clearly so in small groups.');
    case 'eigen':
      return L('Es zählen nur die Werte in der Tabelle: Dazwischen ist die Wahrscheinlichkeit 0.', 'Only the values in the table count: in between, the probability is 0.');
  }
};

/** Wie zwei Verteilungen zusammenhängen. Schlüssel: die beiden Arten, in dieser festen Reihenfolge. */
const FOLGE: Art[] = ['normal', 't', 'chi2', 'f', 'binom', 'poisson', 'hyper', 'eigen'];
export const paarSchluessel = (a: Art, b: Art) => FOLGE.indexOf(a) < FOLGE.indexOf(b) ? `${a}-${b}` : `${b}-${a}`;
export const paarText = (a: Art, b: Art): string => {
  if (a === 'eigen' || b === 'eigen') return L('Die eigene Tabelle kann jede Verteilung mit endlich vielen Werten nachbilden, auch die Binomialverteilung. Stetige Verteilungen wie Normal, t, χ² und F gehen nur näherungsweise, in Klassen eingeteilt. Poisson hat unendlich viele Werte, eine Tabelle zeigt nur einen Ausschnitt.',
    'The own table can reproduce any distribution with finitely many values, including the binomial. Continuous distributions such as normal, t, χ² and F work only approximately, divided into classes. Poisson has infinitely many values, a table shows only part of them.');
  switch (paarSchluessel(a, b)) {
    case 'normal-t': return L('t ist die Normalverteilung mit Unsicherheitszuschlag: Wird σ aus der Stichprobe geschätzt, entsteht t statt z. Je mehr Freiheitsgrade, desto näher rückt t an die Standardnormalverteilung. Bei p = 0,975 sind es 2,23 bei df = 10, 2,04 bei df = 30 und 1,96 bei der Normalverteilung.', 't is the normal distribution with a surcharge for uncertainty: when σ is estimated from the sample, t arises instead of z. The more degrees of freedom, the closer t comes to the standard normal distribution. At p = 0.975 the values are 2.23 at df = 10, 2.04 at df = 30 and 1.96 for the normal distribution.');
    case 'normal-chi2': return L('χ² entsteht aus Normalwerten: Das Quadrat eines Standardnormal-Werts ist χ² mit df = 1, die Summe aus k unabhängigen solchen Quadraten ist χ² mit df = k. Bei vielen Freiheitsgraden wird χ² selbst fast normal, mit Mittelwert df und Varianz 2 · df.', 'χ² arises from normal values: the square of a standard normal value is χ² with df = 1, the sum of k independent such squares is χ² with df = k. With many degrees of freedom χ² itself becomes almost normal, with mean df and variance 2 · df.');
    case 'normal-f': return L('F entsteht aus Normalwerten über zwei Schritte: Quadrate ergeben χ², und F ist das Verhältnis zweier durch ihre Freiheitsgrade geteilter χ²-Werte. Darum setzt die Varianzanalyse in kleinen Stichproben ungefähr normalverteilte Residuen voraus.', 'F arises from normal values in two steps: squares give χ², and F is the ratio of two χ² values divided by their degrees of freedom. That is why the analysis of variance assumes roughly normal residuals in small samples.');
    case 'normal-binom': return L('Die Binomialverteilung nähert sich bei vielen Versuchen der Normalverteilung mit Mittelwert n · p und Varianz n · p · (1 - p). Oft genannte Faustregel: n · p · (1 - p) mindestens 9. Weil Säulen auf eine stetige Kurve treffen, hilft die Stetigkeitskorrektur (±½). Die Kachel zeigt den Vergleich bei „Binomial“.', 'With many trials the binomial approaches the normal distribution with mean n · p and variance n · p · (1 - p). A frequently cited rule of thumb: n · p · (1 - p) at least 9. Because bars meet a continuous curve, the continuity correction (±½) helps. The tile shows the comparison under "Binomial".');
    case 'normal-poisson': return L('Bei großem λ nähert sich Poisson der Normalverteilung mit Mittelwert λ und Varianz λ. Oft genannte Faustregel: λ mindestens 10. Darum funktionieren einfache z-Rechnungen bei großen Zählwerten, bei kleinen nicht.', 'With large λ the Poisson approaches the normal distribution with mean λ and variance λ. A frequently cited rule of thumb: λ at least 10. That is why simple z calculations work for large counts but not for small ones.');
    case 'normal-hyper': return L('Bei großen Gruppen nähert sich auch die hypergeometrische Verteilung der Normalverteilung. Der Mittelwert ist n · K / N. Die Varianz ist kleiner als bei der Binomialverteilung, um den Faktor (N - n) / (N - 1), die Endlichkeitskorrektur.', 'With large groups the hypergeometric also approaches the normal distribution. The mean is n · K / N. The variance is smaller than for the binomial, by the factor (N - n) / (N - 1), the finite population correction.');
    case 't-chi2': return L('t enthält ein χ² im Nenner: t = z / √(χ² / df). Dieses χ² steht für die Unsicherheit der geschätzten Streuung, beide haben dieselben Freiheitsgrade. Darum wird t mit wachsendem df der Normalverteilung ähnlicher: Die Schätzung der Streuung wird sicherer.', 't has a χ² in its denominator: t = z / √(χ² / df). This χ² stands for the uncertainty of the estimated spread, both have the same degrees of freedom. That is why t becomes more like the normal distribution as df grows: the estimate of the spread becomes more certain.');
    case 't-f': return L('Ein t-Wert im Quadrat ist ein F-Wert mit df₁ = 1: t(df)² = F(1; df). Beispiel: 2,228² = 4,96, der kritische F-Wert für 1 und 10 Freiheitsgrade. Darum liefern der t-Test nach Student und die Varianzanalyse mit zwei Gruppen denselben p-Wert.', 'A squared t value is an F value with df₁ = 1: t(df)² = F(1; df). Example: 2.228² = 4.96, the critical F value for 1 and 10 degrees of freedom. That is why Student\'s t test and the analysis of variance with two groups give the same p value.');
    case 't-binom': return L('Kein direkter Zusammenhang: t ist stetig, Binomial zählt Treffer. Bei einem Anteil ist die Streuung schon durch p festgelegt und muss nicht eigens geschätzt werden, darum rechnet man mit z oder exakt binomial statt mit t. Ein t-Test auf 0-1-Daten liefert bei großen Stichproben fast dasselbe wie die z-Rechnung.', 'No direct link: t is continuous, the binomial counts hits. For a proportion the spread is already determined by p and need not be estimated separately, so z or the exact binomial is used instead of t. A t test on 0-1 data gives almost the same as the z calculation in large samples.');
    case 't-poisson': return L('Kein direkter Zusammenhang: t ist stetig und gehört zu Mittelwerten mit geschätzter Streuung, Poisson zählt Ereignisse. Bei Poisson folgt die Varianz schon aus λ, darum rechnet man bei Zählwerten exakt oder mit z, nicht mit t. In der Praxis treffen sich beide, wenn die Mittelwerte von Zähldaten mit einem t-Test verglichen werden: Das geht bei großen Stichproben (zentraler Grenzwertsatz), bei kleinen Zählwerten und wenigen Fällen passt eine Poisson-Regression oder ein exakter Test besser.', 'No direct link: t is continuous and belongs to means with an estimated spread, Poisson counts events. For Poisson the variance already follows from λ, so counts are handled exactly or with z, not with t. In practice the two meet when means of count data are compared with a t test: this works in large samples (central limit theorem), while Poisson regression or an exact test fits better for small counts and few cases.');
    case 't-hyper': return L('Kein direkter Zusammenhang: t gehört zu Mittelwerten, die hypergeometrische Verteilung zu Treffern ohne Zurücklegen. Gemeinsam ist nur eine Korrektur: Wird ein Mittelwert aus einer kleinen, endlichen Gruppe geschätzt, schrumpft sein Standardfehler um denselben Faktor (N - n) / (N - 1) unter der Wurzel.', 'No direct link: t belongs to means, the hypergeometric to hits without replacement. They share only a correction: when a mean is estimated from a small, finite group, its standard error shrinks by the same factor (N - n) / (N - 1) under the root.');
    case 'chi2-f': return L('F ist ein Verhältnis zweier χ²-Werte, jeder durch seine Freiheitsgrade geteilt. Wächst df₂ stark, wird der Nenner fast zu 1, dann gilt df₁ · F ≈ χ² mit df₁ Freiheitsgraden.', 'F is a ratio of two χ² values, each divided by its degrees of freedom. If df₂ grows large, the denominator becomes almost 1, and then df₁ · F ≈ χ² with df₁ degrees of freedom.');
    case 'chi2-binom': return L('Der χ²-Anpassungstest mit zwei Kategorien ist die Normalnäherung der Binomialverteilung im Quadrat: χ² = z² mit df = 1. Der Binomialtest rechnet exakt, der χ²-Test nur näherungsweise und braucht genug erwartete Häufigkeiten.', 'The χ² goodness-of-fit test with two categories is the normal approximation of the binomial, squared: χ² = z² with df = 1. The binomial test is exact, the χ² test only approximate and needs enough expected frequencies.');
    case 'chi2-poisson': return L('Beide sind genau verbunden: P(X ≤ k) bei Poisson mit λ ist gleich P(χ² > 2λ) mit df = 2k + 2. Darum stehen in exakten Konfidenzintervallen für Raten χ²-Quantile. Auch zum Prüfen, ob Zählwerte zu Poisson passen, dient ein χ²-Test.', 'The two are exactly linked: P(X ≤ k) for Poisson with λ equals P(χ² > 2λ) with df = 2k + 2. That is why exact confidence intervals for rates contain χ² quantiles. A χ² test also serves to check whether counts fit a Poisson distribution.');
    case 'chi2-hyper': return L('Beide prüfen die 2×2-Tabelle: Der exakte Test nach Fisher rechnet mit der hypergeometrischen Verteilung, der χ²-Test mit df = 1 ist die Näherung dazu. Bei kleinen erwarteten Häufigkeiten ist die Näherung schlecht, dann gilt Fisher.', 'Both test the 2×2 table: Fisher\'s exact test calculates with the hypergeometric distribution, the χ² test with df = 1 is the approximation to it. With small expected frequencies the approximation is poor, then Fisher is used.');
    case 'f-binom': return L('In der Anwendung getrennt: F vergleicht Streuungen, Binomial zählt Treffer. Rechnerisch gibt es eine exakte Brücke: Binomial-Wahrscheinlichkeiten lassen sich über die F-Verteilung ausdrücken. Das exakte Intervall nach Clopper-Pearson wird oft so angegeben.', 'Separate in application: F compares spreads, the binomial counts hits. Mathematically there is an exact bridge: binomial probabilities can be expressed through the F distribution. The exact Clopper-Pearson interval is often given in this form.');
    case 'f-poisson': return L('In der Anwendung kaum verbunden: F vergleicht Streuungen, Poisson zählt Ereignisse. Eine Brücke gibt es beim Verhältnis zweier Raten: Sein exaktes Konfidenzintervall lässt sich mit F-Quantilen schreiben.', 'Hardly linked in application: F compares spreads, Poisson counts events. There is a bridge for the ratio of two rates: its exact confidence interval can be written with F quantiles.');
    case 'f-hyper': return L('Kein Zusammenhang in der üblichen Anwendung: F vergleicht Streuungen stetiger Größen, die hypergeometrische Verteilung zählt Treffer beim Ziehen ohne Zurücklegen.', 'No link in usual application: F compares spreads of continuous quantities, the hypergeometric counts hits when drawing without replacement.');
    case 'binom-poisson': return L('Poisson ist der Grenzfall der Binomialverteilung: Viele Versuche, kleine Trefferwahrscheinlichkeit, dann gilt B(n; p) ≈ Poisson(λ = n · p). Oft genannte Faustregel: n mindestens 50 und p höchstens 0,1. Bei Binomial ist die Varianz kleiner als der Mittelwert, bei Poisson gleich.', 'Poisson is the limiting case of the binomial: many trials, small hit probability, then B(n; p) ≈ Poisson(λ = n · p). A frequently cited rule of thumb: n at least 50 and p at most 0.1. For the binomial the variance is smaller than the mean, for Poisson they are equal.');
    case 'binom-hyper': return L('Der Unterschied ist das Zurücklegen: Binomial zieht mit, hypergeometrisch ohne. Der Mittelwert ist gleich, wenn p = K / N, die Varianz ist ohne Zurücklegen kleiner, um den Faktor (N - n) / (N - 1). Wird nur ein kleiner Teil gezogen (oft genannt: höchstens 5 %), sind beide fast gleich.', 'The difference is replacement: the binomial draws with, the hypergeometric without. The mean is the same if p = K / N, the variance is smaller without replacement, by the factor (N - n) / (N - 1). If only a small part is drawn (often stated: at most 5 %), the two are almost equal.');
    case 'poisson-hyper': return L('Verbunden nur über die Binomialverteilung: Wird aus einer sehr großen Gruppe wenig gezogen und sind Treffer selten, nähert sich hypergeometrisch erst Binomial und dann Poisson mit λ = n · K / N.', 'Linked only through the binomial: if little is drawn from a very large group and hits are rare, the hypergeometric first approaches the binomial and then Poisson with λ = n · K / N.');
    default: return '';
  }
};

/** Die Absätze für den Rand, was zuletzt geändert wurde, zuerst. */
export function verteilungAbsaetze(art: Art, modus: Modus, vorher: Art | null, zuletzt: 'art' | 'modus'): RandAbsatz[] {
  const verteilung: RandAbsatz = { titel: artName(art), text: artText(art) };
  const frage: RandAbsatz = { titel: `${L('Die Frage', 'The question')}: ${frageName(modus)}`, text: `${DISKRET[art] ? frageDiskret(modus) : frageStetig(modus)} ${frageBeiArt(art, modus)}` };
  const paar: RandAbsatz[] = vorher && vorher !== art ? [{ titel: `${artName(vorher)} ${L('und', 'and')} ${artName(art)}`, text: paarText(vorher, art) }] : [];
  return zuletzt === 'modus' ? [frage, verteilung, ...paar] : [verteilung, ...paar, frage];
}
