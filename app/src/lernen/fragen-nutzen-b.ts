/**
 * Üben: übrige Einheiten und Abschnitte aus Stufe 4 („nutzen“, 09.11.2026). Neue Einheiten: fehlende-werte-imputation, robuste-verfahren, propensity-matching,
 * kalibrierung-nachweisgrenze, referenzbereich-ausreisser, korrespondenzanalyse. Abschnitte in bestehenden Einheiten: robuste Standardfehler, loglineare Rückwärts-Suche,
 * Kurvenanpassung, Regelkarten und Zählkarten, Messsystemanalyse, auffällige Werte in Zeitreihen, Entscheidungsbaum.
 * Kennungen `nb-<kürzel>-…`. Fragen zum Deuten, ohne Tabellen; Zahlen nur aus den Rechenaufgaben (`rechenaufgaben-nutzen-b.ts`). Eigene Wortlaute.
 * Beleg ist der jeweilige Hilfe-Artikel (`Hilfe:<id>`); die Aussagen dort stützen sich auf die in den Artikeln genannten Quellen.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {};

const T = 'nutzenb';

export const FRAGEN: Frage[] = [
  // ======================================================== 1. Fehlende Werte und Imputation
  {
    id: 'nb-im-mittel', thema: T,
    stamm: P('Fehlende Werte einer Spalte werden durch den Mittelwert der vorhandenen Werte ersetzt. Was geschieht mit der Standardabweichung dieser Spalte?', 'Missing values of a column are replaced by the mean of the values present. What happens to the standard deviation of this column?'),
    antworten: [
      a(P('Sie bleibt gleich, weil sich der Mittelwert der Spalte durch das Einsetzen nicht verändert.', 'It stays the same because the mean of the column does not change through the insertion.'), P('Der Mittelwert bleibt gleich, die Streuung aber nicht: Die Summe der quadrierten Abweichungen bleibt, im Nenner stehen jedoch mehr Fälle. Damit schrumpft die Standardabweichung.', 'The mean stays the same, but the spread does not: the sum of the squared deviations stays, but more cases are in the denominator. So the standard deviation shrinks.')),
      a(P('Sie wird kleiner, weil die eingesetzten Werte im Zentrum liegen und selbst nichts zur Streuung beitragen.', 'It becomes smaller because the inserted values lie in the centre and add nothing to the spread themselves.'), P('Die eingesetzten Werte haben die Abweichung 0. Die Summe der Abweichungsquadrate bleibt gleich, wird aber durch mehr Fälle geteilt. Das täuscht eine Sicherheit vor, die es nicht gibt.', 'The inserted values have deviation 0. The sum of squared deviations stays the same but is divided by more cases. That pretends a certainty that does not exist.'), true),
      a(P('Sie wird größer, weil mehr Werte in die Rechnung eingehen und mehr Werte grundsätzlich mehr Streuung bedeuten.', 'It becomes larger because more values enter the calculation and more values generally mean more spread.'), P('Die Streuung hängt vom Abstand der Werte zum Mittelwert ab, nicht von der Zahl der Werte. Neue Werte direkt auf dem Mittelwert vergrößern sie nicht.', 'The spread depends on the distance of the values from the mean, not on the number of values. New values directly on the mean do not increase it.')),
      a(P('Sie wird kleiner oder größer, je nachdem, welche Personen die Angabe ausgelassen haben, und lässt sich so kaum abschätzen.', 'It becomes smaller or larger, depending on which people left out the answer, and can hardly be estimated that way.'), P('Beim Einsetzen des Mittelwerts steht die Richtung fest: Die Streuung sinkt. Welche Personen fehlen, ändert nur, um wie viel.', 'When the mean is inserted the direction is fixed: the spread falls. Which people are missing changes only by how much.'))
    ],
    hilfe: ['fehlende-werte-little-imputation', 'imputation'], belege: ['Hilfe:fehlende-werte-little-imputation']
  },
  {
    id: 'nb-im-little', thema: T,
    stamm: P('Der Little-Test ergibt ein großes p. Was folgt daraus?', 'The Little test gives a large p. What follows from it?'),
    antworten: [
      a(P('Es gibt keinen Hinweis gegen MCAR. Bewiesen ist MCAR damit nur nicht, denn ein Test kann das nicht belegen.', 'There is no hint against MCAR. MCAR is not proven by it, because a test cannot establish that.'), P('Ein großes p bedeutet nur, dass der Test keinen Zusammenhang zwischen dem Fehlen und den Werten findet. Besonders bei wenigen Fällen sieht er kaum etwas.', 'A large p only means that the test finds no relation between the missingness and the values. With few cases in particular it sees hardly anything.'), true),
      a(P('Die Werte fehlen vermutlich zufällig, und Fälle mit Lücken dürfen daher ohne Bedenken wegfallen, es entsteht garantiert keine Verzerrung.', 'The values are probably missing at random, and cases with gaps can therefore be dropped without concern; no distortion arises, guaranteed.'), P('Das wäre ein Beweis der Nullhypothese. Ein Test kann MCAR nur ablehnen, nicht belegen. Auch ein Wegfall vieler Fälle kostet Teststärke.', 'That would be a proof of the null hypothesis. A test can only reject MCAR, not establish it. Dropping many cases also costs power.')),
      a(P('Die Werte fehlen eher abhängig vom eigenen Wert (MNAR), sonst wäre das p kleiner ausgefallen.', 'The values are rather missing depending on their own value (MNAR), otherwise p would have turned out smaller.'), P('Ob Werte vom eigenen Wert abhängig fehlen, kann kein Test trennen. Ein großes p sagt dazu nichts.', 'Whether values are missing depending on their own value cannot be separated by any test. A large p says nothing about it.')),
      a(P('Die Lücken dürfen mit dem Mittelwert gefüllt werden, da sich Ergebnisse und Intervalle kaum verändern.', 'The gaps may be filled with the mean, since results and intervals hardly change.'), P('Auch unter MCAR verkleinert das Mittelwert-Einsetzen die Streuung und damit Standardfehler und Intervalle. Der Little-Test ändert daran nichts.', 'Even under MCAR inserting the mean reduces the spread and thereby standard errors and intervals. The Little test changes nothing about that.'))
    ],
    hilfe: ['fehlende-werte-little-imputation', 'mcar'], belege: ['Hilfe:fehlende-werte-little-imputation']
  },
  {
    id: 'nb-im-mar', thema: T,
    stamm: P('In einer Befragung lassen jüngere Personen die Frage nach dem Einkommen häufiger aus. Das Alter ist für alle erfasst. Welcher Mechanismus des Fehlens liegt vor?', 'In a survey younger people leave out the question about income more often. Age is recorded for everyone. Which mechanism of missingness is present?'),
    antworten: [
      a(P('MCAR: Das Fehlen hängt von keinem Wert ab, es ist reiner Zufall.', 'MCAR: the missingness depends on no value, it is pure chance.'), P('Hier hängt das Fehlen vom Alter ab. Bei MCAR gäbe es keinen solchen Zusammenhang mit anderen Spalten.', 'Here the missingness depends on age. Under MCAR there would be no such relation with other columns.')),
      a(P('MAR: Das Fehlen hängt von einem erfassten Merkmal ab, hier vom Alter.', 'MAR: the missingness depends on a recorded variable, here age.'), P('Bei MAR erklärt eine beobachtete Spalte, wer fehlt. Dann kann die multiple Imputation das Alter als Hilfe nutzen und den Einkommenswert vorhersagen.', 'Under MAR an observed column explains who is missing. Then multiple imputation can use age as help and predict the income value.'), true),
      a(P('MNAR: Das Fehlen hängt vom Einkommen selbst ab, auch wenn das Alter bekannt ist.', 'MNAR: the missingness depends on income itself, even if age is known.'), P('MNAR hieße, dass etwa hohe Einkommen häufiger fehlen, auch bei gleichem Alter. Das steht hier nicht, kann aber ohne weitere Information nicht ausgeschlossen werden.', 'MNAR would mean that, for example, high incomes are missing more often, even at the same age. That is not stated here, but it cannot be ruled out without further information.')),
      a(P('Es liegt kein Mechanismus vor, weil Befragte ihre Angabe freiwillig auslassen.', 'There is no mechanism because respondents leave out their answer voluntarily.'), P('Freiwilligkeit ist kein Gegensatz zu einem Mechanismus. Ob und wovon das Auslassen abhängt, ist genau die Frage.', 'Voluntariness is no opposite to a mechanism. Whether and on what the omission depends is exactly the question.'))
    ],
    hilfe: ['fehlende-werte-little-imputation', 'mar'], belege: ['Hilfe:fehlende-werte-little-imputation']
  },
  {
    id: 'nb-im-mehrfach', thema: T,
    stamm: P('Warum füllt die multiple Imputation Lücken mehrfach und fasst die Rechnungen zusammen, statt einmal einen besten Wert einzusetzen?', 'Why does multiple imputation fill gaps several times and combine the calculations, instead of inserting one best value once?'),
    antworten: [
      a(P('Mit jedem Durchgang kommt der gefüllte Wert dem wahren Wert wohl näher, bis die Lücke weitgehend geschlossen ist.', 'With each run the filled value probably gets closer to the true value until the gap is largely closed.'), P('Die Durchgänge verbessern keine einzelne Schätzung. Sie zeigen, wie verschieden die Füllungen ausfallen können.', 'The runs do not improve any single estimate. They show how different the fillings can turn out.')),
      a(P('Eine einzelne Füllung täuscht Sicherheit vor. Die Unterschiede zwischen den Datensätzen gehen in den Standardfehler ein.', 'A single filling pretends certainty. The differences between the data sets enter the standard error.'), P('Zusammengefasst werden die Schätzer (Mittel) und die Unsicherheit (Varianz innerhalb plus zwischen den Datensätzen, nach Rubin). Das bildet ab, dass man die fehlenden Werte nicht kennt.', 'What is combined are the estimates (mean) and the uncertainty (variance within plus between the data sets, after Rubin). That reflects that the missing values are not known.'), true),
      a(P('Das Verfahren wählt vermutlich den besten der gefüllten Datensätze nach seiner Anpassung und verwirft die übrigen.', 'The procedure probably selects the best of the filled data sets by its fit and discards the others.'), P('Kein Datensatz ist der beste, denn jeder ist eine mögliche Füllung. Zusammengefasst werden alle.', 'No data set is the best, since each is one possible filling. All are combined.')),
      a(P('So lassen sich auch Werte ausgleichen, die vom eigenen Wert abhängig fehlen (MNAR), mit nur wenigen Zusatzannahmen.', 'In this way values that are missing depending on their own value (MNAR) can also be compensated, with only a few extra assumptions.'), P('Die multiple Imputation setzt voraus, dass das Fehlen durch erfasste Spalten erklärbar ist (MAR). MNAR löst sie nicht.', 'Multiple imputation presupposes that the missingness can be explained by recorded columns (MAR). It does not solve MNAR.'))
    ],
    hilfe: ['fehlende-werte-little-imputation', 'multiple-imputation'], belege: ['Hilfe:fehlende-werte-little-imputation']
  },

  // ======================================================== 2. Robuste Verfahren
  {
    id: 'nb-rb-trim', thema: T,
    stamm: P('Von zehn geordneten Werten wird das getrimmte Mittel mit 20 % je Seite gebildet. Wie wird gerechnet?', 'The trimmed mean with 20% on each side is formed from ten ordered values. How is it calculated?'),
    antworten: [
      a(P('Von jedem Ende werden die zwei äußersten Werte abgeschnitten, aus den übrigen sechs wird das Mittel gebildet.', 'The two outermost values are cut off from each end, and the mean is formed from the remaining six.'), P('20 % von zehn Werten sind zwei je Seite. Der Ausreißer fällt so weg, aber auch der kleinste Wert, damit die Rechnung auf beiden Seiten gleich behandelt.', '20% of ten values are two on each side. The outlier drops out, but so does the smallest value, so that both sides are treated equally.'), true),
      a(P('Zwei zufällig gezogene Werte werden weggelassen, aus den übrigen acht wird danach das Mittel gebildet.', 'Two randomly drawn values are left out, and the mean is then formed from the remaining eight.'), P('Getrimmt wird nie zufällig, sondern nach der Größe. Zufälliges Weglassen würde jedes Mal ein anderes Ergebnis liefern.', 'Trimming is not random but by size. Leaving out at random would give a different result every time.')),
      a(P('Werte, die mehr als 20 % vom gewöhnlichen Mittel abweichen, werden als Ausreißer weggelassen und nicht mitgerechnet.', 'Values that deviate by more than 20% from the ordinary mean are left out as outliers and not counted.'), P('Getrimmt wird ein fester Anteil der geordneten Reihe an beiden Enden, nicht nach einem Abstand vom Mittel. Wie viele Werte wegfallen, steht vorab fest.', 'What is trimmed is a fixed share of the ordered series at both ends, not according to a distance from the mean. How many values drop out is fixed beforehand.')),
      a(P('Der größte Wert wird auf den zweitgrößten gesetzt, und alle zehn Werte werden danach gemittelt (Winsorisieren).', 'The largest value is set to the second largest, and all ten values are then averaged (winsorising).'), P('Das ist Winsorisieren mit einem Wert je Seite. Beim getrimmten Mittel fallen die Werte weg und zählen nicht mehr mit.', 'That is winsorising with one value per side. With the trimmed mean the values drop out and no longer count.'))
    ],
    hilfe: ['robuste-verfahren', 'getrimmtes-mittel'], belege: ['Hilfe:robuste-verfahren']
  },
  {
    id: 'nb-rb-winsor', thema: T,
    stamm: P('Was unterscheidet das winsorisierte Mittel vom getrimmten Mittel?', 'What distinguishes the winsorised mean from the trimmed mean?'),
    antworten: [
      a(P('Beim Winsorisieren werden die äußeren Werte auf die Grenze gezogen und zählen mit, beim Trimmen fallen sie weg.', 'With winsorising the outer values are pulled to the limit and still count, with trimming they drop out.'), P('Winsorisiert bleibt die Zahl der Werte gleich, der Ausreißer wird nur gedeckelt. Getrimmt sinkt die Zahl der Werte, im Beispiel von zehn auf sechs.', 'When winsorised, the number of values stays the same and the outlier is only capped. When trimmed, the number of values falls, in the example from ten to six.'), true),
      a(P('Das winsorisierte Mittel ist der Median, das getrimmte Mittel der Durchschnitt der mittleren Werte der Reihe.', 'The winsorised mean is the median, the trimmed mean is the average of the middle values of the series.'), P('Beide sind Mittel, die zwischen dem gewöhnlichen Mittel und dem Median liegen. Der Median ist der Grenzfall, bei dem fast alles abgeschnitten wird.', 'Both are means that lie between the ordinary mean and the median. The median is the limiting case in which almost everything is cut off.')),
      a(P('Das winsorisierte Mittel verwendet die Werte unverändert und entfernt lediglich die fehlenden Angaben der Reihe.', 'The winsorised mean uses the values unchanged and merely removes the missing entries of the series.'), P('Winsorisieren verändert gerade die äußeren Werte: Sie werden durch den nächsten verbleibenden Wert ersetzt.', 'Winsorising changes precisely the outer values: they are replaced by the next remaining value.')),
      a(P('Das getrimmte Mittel braucht eine Normalverteilung, das winsorisierte Mittel setzt dagegen keine Verteilung voraus.', 'The trimmed mean needs a normal distribution, whereas the winsorised mean assumes no distribution.'), P('Beide gelten als robust gegen Abweichungen von der Normalverteilung. Auf diese Annahme unterscheiden sie sich nicht.', 'Both are regarded as robust against deviations from the normal distribution. They do not differ in this assumption.'))
    ],
    hilfe: ['robuste-verfahren', 'winsorisieren'], belege: ['Hilfe:robuste-verfahren']
  },
  {
    id: 'nb-rb-wann', thema: T,
    stamm: P('Ein Team rechnet künftig jeden Gruppenvergleich nur noch mit getrimmten Mitteln, „weil robust besser ist“. Was spricht dagegen?', 'A team will from now on calculate every group comparison only with trimmed means, "because robust is better". What speaks against it?'),
    antworten: [
      a(P('Bei Stichproben unter 30 Personen sind robuste Verfahren gesperrt, weil sie dort falsche Ergebnisse liefern.', 'With samples below 30 people robust procedures are blocked because they give wrong results there.'), P('Eine solche Sperre gibt es nicht. Allerdings bleiben bei sehr kleinen Gruppen alle Verfahren unsicher, auch die robusten.', 'There is no such block. However, with very small groups all procedures remain uncertain, including the robust ones.')),
      a(P('Es beantwortet eine andere Frage: die Mitte der mittleren Werte. Gehören extreme Werte zur Frage, fehlen sie.', 'It answers a different question: the centre of the middle values. If extreme values belong to the question, they are missing.'), P('Etwa bei Behandlungskosten sind die teuren Einzelfälle der Kern der Frage. Trimmen ändert, was verglichen wird, und gehört in den Bericht.', 'With treatment costs, for example, the expensive single cases are the core of the question. Trimming changes what is compared and belongs in the report.'), true),
      a(P('Das getrimmte Mittel hat grundsätzlich einen größeren Standardfehler als das gewöhnliche Mittel der Stichprobe.', 'The trimmed mean generally has a larger standard error than the ordinary mean of the sample.'), P('Bei Ausreißern und schiefen Verteilungen ist der Standardfehler des getrimmten Mittels oft kleiner. Bei exakt normalen Daten verliert es nur wenig.', 'With outliers and skewed distributions the standard error of the trimmed mean is often smaller. With exactly normal data it loses only little.')),
      a(P('Getrimmte Mittel lassen sich nicht mit Konfidenzintervallen oder Tests verbinden, weil die Varianz fehlt.', 'Trimmed means cannot be combined with confidence intervals or tests because the variance is missing.'), P('Der Yuen-Test liefert Differenz, Intervall und p-Wert für getrimmte Mittel. Möglich ist es, nur die Frage ist eine andere.', 'The Yuen test gives difference, interval and p value for trimmed means. It is possible; only the question is a different one.'))
    ],
    hilfe: ['robuste-verfahren', 'getrimmtes-mittel'], belege: ['Hilfe:robuste-verfahren']
  },
  {
    id: 'nb-rb-ausreisser', thema: T,
    stamm: P('In einer Messreihe liegt ein Wert weit außerhalb der übrigen. Welcher Umgang ist fachlich sauber?', 'In a series of measurements one value lies far outside the others. Which way of handling it is sound?'),
    antworten: [
      a(P('Den Wert eher löschen, weil er den Mittelwert verzerrt, und danach das gewöhnliche Mittel der übrigen Werte berichten.', 'Rather delete the value because it distorts the mean, and then report the ordinary mean of the remaining values.'), P('Ein stilles Löschen verändert die Daten, ohne dass es jemand nachvollziehen kann. Ein Ausreißer kann ein gültiger, wichtiger Wert sein.', 'Silent deletion changes the data without anyone being able to follow it. An outlier can be a valid, important value.')),
      a(P('Erst klären, ob ein Eingabe- oder Messfehler vorliegt, dann das Ergebnis mit und ohne robustes Verfahren zeigen.', 'First clarify whether an entry or measurement error is present, then show the result with and without a robust procedure.'), P('So bleibt sichtbar, wie stark der Wert das Ergebnis lenkt. Entscheidend ist die Begründung, nicht der Zufall, wie viel wegfällt.', 'That keeps it visible how strongly the value steers the result. What matters is the justification, not how much happens to drop out.'), true),
      a(P('Das Ergebnis winsorisieren und danach berichten, als wären das die Originalwerte der Messreihe, ohne viel Aufhebens.', 'Winsorise the result and then report it as if these were the original values of the series, without much ado.'), P('Winsorisieren ändert die Werte und muss genannt werden. Als Originalwerte ausgegeben, wäre es eine Täuschung.', 'Winsorising changes the values and must be stated. Presented as original values, it would be a deception.')),
      a(P('Den Wert im Datensatz belassen und im Bericht kaum erwähnen, weil der Test ihn nicht gemeldet hat.', 'Leave the value in the data set and hardly mention it in the report, because the test did not flag it.'), P('Dass ein Test ihn nicht meldet, sagt wenig: Mit wenigen Werten sieht ein Test kaum etwas. Ein auffälliger Wert gehört geprüft und besprochen.', 'That a test does not flag it says little: with few values a test sees hardly anything. A conspicuous value should be checked and discussed.'))
    ],
    hilfe: ['robuste-verfahren', 'ausreisser'], belege: ['Hilfe:robuste-verfahren', 'Hilfe:ausreisser-tests']
  },

  // ======================================================== 3. Propensity-Matching
  {
    id: 'nb-pm-score', thema: T,
    stamm: P('Was ist der Propensity Score einer Person?', 'What is the propensity score of a person?'),
    antworten: [
      a(P('Die Wahrscheinlichkeit, dass die Behandlung bei ihr wirkt, geschätzt aus dem Ergebnis nach der Behandlung.', 'The probability that the treatment works for her, estimated from the outcome after the treatment.'), P('Der Score wird vor jedem Blick auf das Ergebnis gebildet. Er sagt nichts über die Wirkung.', 'The score is formed before any look at the outcome. It says nothing about the effect.')),
      a(P('Die Wahrscheinlichkeit, nach den gewählten Merkmalen zur behandelten Gruppe zu gehören.', 'The probability of belonging to the treated group, given the chosen variables.'), P('Er fasst die Merkmale zu einer Zahl zusammen. Personen mit ähnlichem Score sind in diesen Merkmalen ähnlich, ob behandelt oder nicht.', 'It condenses the variables into one number. People with a similar score are similar in these variables, whether treated or not.'), true),
      a(P('Der Anteil der Kontrollpersonen, für die ein passendes Gegenstück gefunden wurde, an allen Kontrollen.', 'The share of control persons for whom a suitable counterpart was found, among all controls.'), P('Das ist die Zahl der gebildeten Paare. Der Score gehört zu jeder einzelnen Person.', 'That is the number of pairs formed. The score belongs to each individual person.')),
      a(P('Ein Maß für die Stärke des Unterschieds zwischen den Gruppen nach dem Abgleich der Merkmale.', 'A measure of the strength of the difference between the groups after the variables have been matched.'), P('Das beschreibt die standardisierte Mittelwertdifferenz. Der Score ist die Grundlage des Abgleichs, nicht sein Ergebnis.', 'That describes the standardised mean difference. The score is the basis of the matching, not its result.'))
    ],
    hilfe: ['matching-propensity-score', 'propensity-score'], belege: ['Hilfe:matching-propensity-score']
  },
  {
    id: 'nb-pm-smd', thema: T,
    stamm: P('Beim Alter betrug die standardisierte Mittelwertdifferenz (SMD) vor dem Abgleich 1 und danach 0,15. Als gut ausgeglichen gilt ein Betrag der SMD unter 0,1. Wie ist das zu deuten?', 'For age the standardised mean difference (SMD) was 1 before matching and 0.15 afterwards. An absolute SMD below 0.1 counts as well balanced. How is this to be interpreted?'),
    antworten: [
      a(P('Der Abgleich ist wohl gescheitert, denn eine gute Angleichung hätte einen Wert nahe 0 ergeben müssen.', 'The matching has probably failed, because a good balancing would have had to give a value close to 0.'), P('Genau 0 wird kaum erreicht. Üblich sind Grenzen von 0,1 oder 0,25, und die Verbesserung ist hier groß.', 'Exactly 0 is hardly ever reached. Limits of 0.1 or 0.25 are usual, and the improvement here is large.')),
      a(P('Der Altersunterschied ist stark verkleinert, liegt mit 0,15 aber noch über der Grenze 0,1, ein Rest bleibt.', 'The age difference is greatly reduced, but at 0.15 it is still above the limit 0.1, a remainder stays.'), P('Gemessen in Standardabweichungen ist der Unterschied von einer ganzen auf 0,15 gesunken. Nach der strengen Grenze von 0,1 bliebe ein Rest.', 'Measured in standard deviations the difference has dropped from a whole one to 0.15. By the strict limit of 0.1 a remainder would remain.'), true),
      a(P('Die Gruppen sind jetzt wohl in den meisten Merkmalen vergleichbar, auch in denen, die nicht gemessen wurden.', 'The groups are now probably comparable in most variables, including those that were not measured.'), P('Der Abgleich wirkt nur auf Merkmale, die in den Score eingingen. Nicht gemessene Unterschiede bleiben unberührt.', 'The matching acts only on variables that entered the score. Unmeasured differences remain untouched.')),
      a(P('Der Wert 0,15 gibt an, dass das Programm das Alter der Teilnehmenden um 15 % verändert hat.', 'The value 0.15 indicates that the programme changed the age of the participants by 15%.'), P('Die SMD misst den Gruppenunterschied in Standardabweichungen, keine Wirkung des Programms und keinen Prozentsatz.', 'The SMD measures the group difference in standard deviations, no effect of the programme and no percentage.'))
    ],
    hilfe: ['matching-propensity-score'], belege: ['Hilfe:matching-propensity-score']
  },
  {
    id: 'nb-pm-grenze', thema: T,
    stamm: P('Nach dem Matching sind alle gemessenen Merkmale gut ausgeglichen. Warum bleibt der Effekt trotzdem vorsichtig zu deuten?', 'After matching all measured variables are well balanced. Why does the effect still have to be interpreted with caution?'),
    antworten: [
      a(P('Ungemessene Merkmale, etwa die Motivation, können zwischen den Gruppen weiter verschieden sein.', 'Unmeasured variables, such as motivation, can still differ between the groups.'), P('Der Score kann nur ausgleichen, was in ihm steckt. Eine Zufallszuteilung gleicht dagegen auch das Unbekannte im Mittel aus.', 'The score can only balance what is in it. Random assignment, in contrast, balances even the unknown on average.'), true),
      a(P('Die standardisierte Mittelwertdifferenz ist nur für Altersangaben definiert und für andere Merkmale ungültig.', 'The standardised mean difference is defined only for age and invalid for other variables.'), P('Die SMD lässt sich für jedes Zahlenmerkmal rechnen. Das ist gerade ihr Vorteil gegenüber Einheiten wie Jahren oder Euro.', 'The SMD can be calculated for every number variable. That is precisely its advantage over units such as years or euros.')),
      a(P('Der Abgleich ändert die Mittelwerte der Behandelten, so dass der Vergleich beide Gruppen verfälscht.', 'The matching changes the means of the treated, so that the comparison falsifies both groups.'), P('Die Behandelten bleiben, wie sie sind (soweit sie einen Partner finden). Angepasst wird nur die Auswahl der Kontrollen.', 'The treated stay as they are (as far as they find a partner). Only the selection of the controls is adjusted.')),
      a(P('Die Paare sind wegen des Ziehens ohne Zurücklegen voneinander abhängig, daher gilt kein Test.', 'The pairs depend on each other because of drawing without replacement, so no test is valid.'), P('Für gepaarte Werte gibt es den gepaarten t-Test. Die Ursache für die Vorsicht liegt woanders.', 'For paired values there is the paired t test. The reason for the caution lies elsewhere.'))
    ],
    hilfe: ['matching-propensity-score', 'matching'], belege: ['Hilfe:matching-propensity-score']
  },
  {
    id: 'nb-pm-eng', thema: T,
    stamm: P('Beim engen Abgleich (Caliper) bleiben einige behandelte Personen ohne Partner. Was heißt das für das Ergebnis?', 'With close matching (caliper) some treated people remain without a partner. What does that mean for the result?'),
    antworten: [
      a(P('Das Ergebnis gilt für die behandelten Personen, die einen Partner fanden. Für die übrigen sagt es nichts.', 'The result applies to the treated people who found a partner. For the others it says nothing.'), P('Wer keinen ähnlichen Partner hat, geht nicht in den Vergleich ein. Statable nennt die Zahl der Paare und der Behandelten ohne Partner. Je mehr fehlen, desto enger ist die Aussage.', 'Whoever has no similar partner does not enter the comparison. Statable gives the number of pairs and of treated people without partner. The more are missing, the narrower the statement.'), true),
      a(P('Das Ergebnis wird dadurch zuverlässiger, weil sich nur noch gleichartige Personen im Vergleich befinden.', 'The result thereby becomes more reliable because only like persons remain in the comparison.'), P('Es wird vergleichbarer, aber für eine kleinere Gruppe. Verlorene Personen können sich systematisch von den übrigen unterscheiden.', 'It becomes more comparable, but for a smaller group. Lost people can differ systematically from the others.')),
      a(P('Die Personen ohne Partner erhalten automatisch den Mittelwert der Kontrollen als Vergleichswert.', 'The people without a partner automatically receive the mean of the controls as comparison value.'), P('Statable bildet Paare und vergleicht nur diese. Eine Ersatzgröße wird nicht eingesetzt.', 'Statable forms pairs and compares only these. No substitute value is inserted.')),
      a(P('Der Abgleich war fehlerhaft, und die Gruppen müssen von Hand neu zugeteilt werden, damit alle Partner finden.', 'The matching was faulty and the groups have to be reassigned by hand so that everyone finds a partner.'), P('Dass nicht jeder einen Partner findet, ist bei engen Grenzen zu erwarten und kein Fehler. Es verlangt nur einen Hinweis im Bericht.', 'That not everyone finds a partner is to be expected with narrow limits and is no error. It only requires a note in the report.'))
    ],
    hilfe: ['matching-propensity-score'], belege: ['Hilfe:matching-propensity-score']
  },

  // ======================================================== 4. Kalibriergerade und Nachweisgrenze
  {
    id: 'nb-ka-grenzen', thema: T,
    stamm: P('Was unterscheidet die Nachweisgrenze von der Bestimmungsgrenze?', 'What distinguishes the limit of detection from the limit of quantification?'),
    antworten: [
      a(P('Beide sind im Kern dieselbe Zahl, die in der Norm lediglich unter verschiedenen Namen und Zwecken geführt wird.', 'Both are at heart the same number, carried in the standard merely under different names and purposes.'), P('Es sind zwei verschiedene Grenzen mit verschiedenen Aussagen. Die Bestimmungsgrenze liegt höher.', 'They are two different limits with different statements. The limit of quantification is higher.')),
      a(P('An der Nachweisgrenze lässt sich der Stoff gerade vom Rauschen unterscheiden, ab der höheren Bestimmungsgrenze auch die Menge.', 'At the limit of detection the substance can just be told from the noise, from the higher limit of quantification the amount too.'), P('Die Nachweisgrenze beantwortet nur ja oder nein. Für eine Zahl, auf die man sich verlassen darf, braucht es mehr Signal; in Statable ist es die kleinste Menge mit höchstens 33 % relativer Unsicherheit.', 'The limit of detection answers only yes or no. For a number that can be relied on, more signal is needed; in Statable it is the smallest amount with at most 33% relative uncertainty.'), true),
      a(P('Die Nachweisgrenze gilt für die Probe selbst, die Bestimmungsgrenze dagegen für die Kalibrierlösungen der Reihe.', 'The limit of detection applies to the sample itself, the limit of quantification to the calibration solutions of the series.'), P('Beide werden aus der Kalibriergeraden berechnet und gelten für das Verfahren, nicht für einzelne Lösungen.', 'Both are calculated from the calibration line and apply to the method, not to individual solutions.')),
      a(P('Die Bestimmungsgrenze liegt eher unter der Nachweisgrenze, weil Bestimmen weniger verlangt als Nachweisen von Spuren.', 'The limit of quantification lies rather below the limit of detection because determining demands less than detecting traces.'), P('Es verhält sich umgekehrt: Eine Menge zu beziffern verlangt mehr als zu sagen, dass sie da ist.', 'It is the other way round: putting a figure on an amount demands more than saying that it is there.'))
    ],
    hilfe: ['kalibriergerade-nachweisgrenze', 'nachweisgrenze', 'bestimmungsgrenze'], belege: ['Hilfe:kalibriergerade-nachweisgrenze']
  },
  {
    id: 'nb-ka-rueck', thema: T,
    stamm: P('Eine Probe hat ein gemessenes Signal. Wie ergibt sich ihre Konzentration aus der Kalibriergeraden y = a + b · x?', 'A sample has a measured signal. How does its concentration follow from the calibration line y = a + b · x?'),
    antworten: [
      a(P('Das Signal wird mit der Steigung multipliziert, danach wird der Achsenabschnitt addiert, um x zu erhalten.', 'The signal is multiplied by the slope, then the intercept is added to obtain x.'), P('Das wäre die Gleichung vorwärts, von x nach y. Hier ist y gemessen und x gesucht.', 'That would be the equation forward, from x to y. Here y is measured and x is sought.')),
      a(P('Das Signal ist die Konzentration, wenn die Gerade gut passt (R² nahe 1), eine Umrechnung entfällt dann.', 'The signal is the concentration if the line fits well (R² close to 1), and no conversion is needed then.'), P('Signal und Konzentration haben verschiedene Einheiten. Erst die Gerade übersetzt das eine in das andere.', 'Signal and concentration have different units. Only the line translates one into the other.')),
      a(P('Die Gleichung wird nach x umgestellt: Vom Signal wird a abgezogen, dann durch die Steigung b geteilt.', 'The equation is rearranged for x: a is subtracted from the signal, then the result is divided by the slope b.'), P('Der Achsenabschnitt ist das Signal, das schon bei der Konzentration 0 erwartet wird (Leerwert). Er muss weg, bevor die Steigung die Menge ergibt.', 'The intercept is the signal already expected at concentration 0 (the blank). It has to go before the slope gives the amount.'), true),
      a(P('Das Signal wird durch die Steigung geteilt, der Achsenabschnitt ändert nur die Genauigkeit.', 'The signal is divided by the slope; the intercept changes only the accuracy.'), P('Der Achsenabschnitt verschiebt das Ergebnis. Ohne ihn wird die Menge systematisch zu hoch angegeben, wenn er positiv ist.', 'The intercept shifts the result. Without it the amount is systematically stated too high if it is positive.'))
    ],
    hilfe: ['kalibriergerade-nachweisgrenze'], belege: ['Hilfe:kalibriergerade-nachweisgrenze']
  },
  {
    id: 'nb-ka-bereich', thema: T,
    stamm: P('Das Signal einer Probe liegt über dem Signal des höchsten Kalibrierpunkts. Was ist angemessen?', 'The signal of a sample lies above the signal of the highest calibration point. What is appropriate?'),
    antworten: [
      a(P('Die Gerade über den letzten Punkt hinaus verlängern, weil sie linear weiterläuft.', 'Extend the line beyond the last point because it continues linearly.'), P('Außerhalb der Kalibrierpunkte ist die Linearität nicht belegt. Geräte sättigen oft, die Gerade kann dort nicht mehr stimmen.', 'Outside the calibration points linearity is not established. Instruments often saturate, and the line may no longer be right there.')),
      a(P('Die Probe verdünnen und neu messen, oder die Kalibrierung auf höhere Mengen erweitern.', 'Dilute the sample and measure again, or extend the calibration to higher amounts.'), P('Die Gerade gilt nur im gemessenen Bereich. Mit einer Verdünnung rückt das Signal in diesen Bereich und das Ergebnis wird belegbar.', 'The line applies only within the measured range. With a dilution the signal moves into that range and the result becomes verifiable.'), true),
      a(P('Den größten Kalibrierwert als Ergebnis angeben, weil darüber nichts gemessen wurde.', 'Report the largest calibration value as the result because nothing was measured above it.'), P('Das würde die Menge unterschätzen und als Messung ausgeben, was keine ist. Üblich ist „über dem Messbereich“ mit weiterem Vorgehen.', 'That would underestimate the amount and present as a measurement what is none. Usual is "above the measuring range" with further action.')),
      a(P('Die Gerade neu durch den Ursprung zwingen, damit sie weiter oben besser passt.', 'Force the line through the origin again so that it fits better further up.'), P('Eine erzwungene Gerade ändert den Bereich nicht, in dem Daten vorliegen. Sie kann sogar das Rückrechnen verfälschen, wenn es einen Leerwert gibt.', 'A forced line does not change the range in which data exist. It can even falsify the back calculation if there is a blank.'))
    ],
    hilfe: ['kalibriergerade-nachweisgrenze'], belege: ['Hilfe:kalibriergerade-nachweisgrenze']
  },
  {
    id: 'nb-ka-r2', thema: T,
    stamm: P('Eine Kalibriergerade hat ein R² nahe 1. Was sagt das über die Nachweisgrenze?', 'A calibration line has an R² close to 1. What does that say about the limit of detection?'),
    antworten: [
      a(P('Die Nachweisgrenze ist dann wohl sehr klein, denn ein hohes R² heißt gute Empfindlichkeit des Verfahrens im ganzen Bereich.', 'The limit of detection is then probably very small, because a high R² means good sensitivity of the method over the whole range.'), P('R² wird von den großen Konzentrationen geprägt und sagt wenig über das Rauschen nahe 0. Die Empfindlichkeit ist die Steigung.', 'R² is shaped by the large concentrations and says little about the noise near 0. The sensitivity is the slope.')),
      a(P('Sehr wenig: Die Grenze hängt von Reststreuung und Steigung der Geraden ab, und das R² lässt beides offen.', 'Very little: the limit depends on residual scatter and slope of the line, and R² leaves both open.'), P('Eine Gerade kann über einen großen Bereich fast perfekt passen und trotzdem nahe null stark streuen. Aussagekräftig ist die Reststreuung in Einheiten der Konzentration (Verfahrensstandardabweichung).', 'A line can fit almost perfectly over a large range and still scatter strongly near zero. What is informative is the residual scatter in units of the concentration (procedure standard deviation).'), true),
      a(P('Die Nachweisgrenze entspricht ungefähr dem Wert, bei dem R² der Kalibriergeraden spürbar abfällt, wenn man Punkte weglässt.', 'The limit of detection corresponds roughly to the value at which R² of the calibration line drops noticeably when points are dropped.'), P('Eine solche Beziehung gibt es nicht. Die Grenzen folgen aus einer Formel mit Reststreuung, Steigung und Zahl der Punkte.', 'There is no such relationship. The limits follow from a formula with residual scatter, slope and number of points.')),
      a(P('Die Nachweisgrenze lässt sich meist nur berechnen, wenn R² sehr nahe bei 1 liegt, weil sonst die Streuung der Punkte stört.', 'The limit of detection can usually be calculated only if R² is very close to 1, because otherwise the scatter of the points interferes.'), P('Auch bei deutlich kleinerem R² lässt sich die Grenze berechnen, sie fällt dann nur größer aus. Die Formel ist gerade für Daten mit Streuung gedacht.', 'The limit can also be calculated with a much smaller R²; it is just larger then. The formula is intended precisely for data with scatter.'))
    ],
    hilfe: ['kalibriergerade-nachweisgrenze', 'nachweisgrenze'], belege: ['Hilfe:kalibriergerade-nachweisgrenze']
  },

  // ======================================================== 5. Referenzbereich und Ausreißer
  {
    id: 'nb-rf-aussen', thema: T,
    stamm: P('Der Laborwert einer Person liegt außerhalb des Referenzbereichs. Was bedeutet das?', 'The laboratory value of a person lies outside the reference range. What does that mean?'),
    antworten: [
      a(P('Die Person ist wahrscheinlich krank, denn der Referenzbereich umfasst die Werte der Gesunden.', 'The person is probably ill, because the reference range comprises the values of healthy people.'), P('Per Definition liegen etwa 5 % der Gesunden außerhalb. Ein Wert außerhalb ist ein Hinweis, keine Diagnose.', 'By definition about 5% of healthy people lie outside. A value outside is a hint, not a diagnosis.')),
      a(P('Der Wert liegt auch bei einem kleinen Teil der Gesunden so. Er ist ein Anlass, genauer hinzusehen.', 'The value is the same way for a small part of healthy people. It is a reason to look more closely.'), P('Der Bereich enthält die mittleren 95 % der Referenzpersonen. Die übrigen 5 % liegen darüber oder darunter, ohne krank zu sein.', 'The range contains the middle 95% of the reference individuals. The other 5% lie above or below without being ill.'), true),
      a(P('Der Messfehler des Labors war größer als üblich, und die Messung muss wiederholt werden.', 'The measurement error of the laboratory was larger than usual, and the measurement has to be repeated.'), P('Der Bereich beschreibt die Verteilung bei Gesunden und sagt nichts über die Messgenauigkeit. Wiederholt wird, wenn es fachlich nötig ist.', 'The range describes the distribution among healthy people and says nothing about measurement accuracy. Repetition happens when it is professionally necessary.')),
      a(P('Der Wert gehört nicht zur Referenzgruppe und wurde bei der Berechnung ausgeschlossen.', 'The value does not belong to the reference group and was excluded from the calculation.'), P('Der Referenzbereich wird aus den Werten der Referenzpersonen berechnet. Der Wert einer neuen Person wird nur damit verglichen.', 'The reference range is calculated from the values of the reference individuals. The value of a new person is only compared with it.'))
    ],
    hilfe: ['referenzbereich'], belege: ['Hilfe:referenzbereich']
  },
  {
    id: 'nb-rf-innen', thema: T,
    stamm: P('Der Wert einer Person liegt innerhalb des Referenzbereichs. Was darf daraus geschlossen werden?', 'The value of a person lies within the reference range. What may be concluded from it?'),
    antworten: [
      a(P('Die Person ist sehr wahrscheinlich gesund, denn der Wert liegt im normalen Bereich der Referenzpersonen.', 'The person is very probably healthy because the value lies in the normal range of the reference individuals.'), P('„Normal“ heißt hier nur: unter den Referenzpersonen häufig. Auch Kranke haben oft Werte im Bereich.', '"Normal" here only means: frequent among the reference individuals. Ill people also often have values within the range.')),
      a(P('Der Wert sagt allein wenig über die Gesundheit, denn auch Kranke haben oft Werte im Bereich.', 'The value alone says little about health, because ill people also often have values within the range.'), P('Der Bereich wird aus Gesunden gebildet und sagt nicht, wo die Werte von Erkrankten liegen. Für die Aussage zur Erkrankung braucht es Sensitivität und Spezifität.', 'The range is formed from healthy people and does not say where the values of ill people lie. For a statement on a disease sensitivity and specificity are needed.'), true),
      a(P('Der Wert dürfte mit hoher Sicherheit der wahre Wert der Person sein, wie er im Labor gemessen wurde.', 'The value is probably, with high certainty, the true value of the person, as measured in the laboratory.'), P('Die 95 % beziehen sich auf den Anteil der Referenzpersonen, nicht auf die Genauigkeit einer Messung.', 'The 95% refer to the share of the reference individuals, not to the accuracy of a measurement.')),
      a(P('Die Person gehört wohl zu den mittleren Werten aller Menschen, auch der Kranken, und ist eher unauffällig.', 'The person probably belongs to the middle values of all people, including the ill, and is rather inconspicuous.'), P('Der Bereich beschreibt Referenzpersonen. Wie er bei allen Menschen oder bei Kranken aussieht, kann er nicht sagen.', 'The range describes reference individuals. How it looks among all people or among ill people, it cannot say.'))
    ],
    hilfe: ['referenzbereich'], belege: ['Hilfe:referenzbereich']
  },
  {
    id: 'nb-rf-wenige', thema: T,
    stamm: P('Warum liefert Statable bei der Rangmethode des Referenzbereichs mit sehr wenigen Referenzwerten gar keine Grenzen?', 'Why does Statable give no limits at all with the rank method of the reference range when there are very few reference values?'),
    antworten: [
      a(P('Bei wenigen Werten läge der Rang des 2,5. Perzentils vor dem kleinsten Wert, die Grenze wäre nur geraten.', 'With few values the rank of the 2.5th percentile would lie before the smallest value, and the limit would be only guessed.'), P('Der Rang ist 0,025 mal (n + 1). Ist er kleiner als 1, liegt er vor dem kleinsten Wert. Dort gibt es nichts, wohin man rechnen könnte.', 'The rank is 0.025 times (n + 1). If it is smaller than 1, it lies before the smallest value. There is nothing there to calculate towards.'), true),
      a(P('Weil ein Referenzbereich eher eine Normalverteilung voraussetzt, die sich bei wenigen Werten schlecht prüfen lässt.', 'Because a reference range rather presupposes a normal distribution that is hard to check with few values.'), P('Die Rangmethode kommt gerade ohne Verteilungsannahme aus. Für die Normalverteilungs-Methode gelten andere Voraussetzungen.', 'The rank method manages without any assumption about the distribution. The normal-distribution method has other requirements.')),
      a(P('Weil das Konfidenzintervall bei kleinen Stichproben sehr breit wird und das Programm deshalb abbricht.', 'Because the confidence interval becomes very wide with small samples and the programme therefore aborts.'), P('Hier geht es um die Punktschätzung der Grenzen, nicht um das Intervall. Dafür braucht es nur einen gültigen Rang.', 'This is about the point estimate of the limits, not the interval. For it only a valid rank is needed.')),
      a(P('Weil Referenzbereiche meist eine Mindestzahl an Personen verlangen, die Statable vorsichtshalber prüft.', 'Because reference ranges mostly require a minimum number of people, which Statable checks to be on the safe side.'), P('Der Grund ist rechnerisch, nicht rechtlich. Die Formel liefert unter einer Mindestzahl keine Grenze.', 'The reason is arithmetical, not legal. Below a minimum number the formula gives no limit.'))
    ],
    hilfe: ['referenzbereich', 'perzentil'], belege: ['Hilfe:referenzbereich']
  },
  {
    id: 'nb-rf-grubbs', thema: T,
    stamm: P('Der Grubbs-Test meldet einen Wert als Ausreißer. Was sagt das?', 'The Grubbs test reports a value as an outlier. What does that say?'),
    antworten: [
      a(P('Der Wert ist vermutlich ein Fehler und kann wohl aus den Daten entfernt werden, weil der Test ihn erkannt hat.', 'The value is probably an error and can probably be removed from the data because the test has detected it.'), P('Der Test sagt nicht, ob es ein Fehler ist. Ein ungewöhnlicher Wert kann der interessanteste sein. Statable entfernt nichts.', 'The test does not say whether it is an error. An unusual value can be the most interesting one. Statable removes nothing.')),
      a(P('Der Wert wäre bei einer Normalverteilung selten. Ob Eingabefehler oder echtes Ereignis, ist fachlich zu klären.', 'The value would be rare under a normal distribution. Whether entry error or real event has to be clarified on subject grounds.'), P('Der Test prüft nur Abstand und Normalverteilungsannahme. Die Ursache kann er nicht nennen.', 'The test checks only distance and the normal-distribution assumption. It cannot name the cause.'), true),
      a(P('Die übrigen Werte der Reihe gelten damit als normalverteilt bestätigt, sonst hätte der Test angeschlagen.', 'The remaining values of the series are thereby confirmed as normally distributed, otherwise the test would have flagged.'), P('Der Test setzt die Normalverteilung voraus. Er bestätigt sie nicht und ist bei schiefen Daten oft zu streng.', 'The test presupposes the normal distribution. It does not confirm it and is often too strict with skewed data.')),
      a(P('Der Test lässt sich mehrmals hintereinander wiederholen, bis kein Ausreißer mehr gemeldet wird.', 'The test can be repeated several times in a row until no outlier is reported any more.'), P('Das ist kein Test mehr: Die Fehlerrate für die Zahl der gemeldeten Werte ist dann nicht kontrolliert. Für mehrere Verdächtige gibt es den generalisierten ESD-Test.', 'That is no longer a test: the error rate for the number of values reported is then not controlled. For several suspects there is the generalised ESD test.'))
    ],
    hilfe: ['ausreisser-tests', 'grubbs'], belege: ['Hilfe:ausreisser-tests']
  },

  // ======================================================== 6. Korrespondenzanalyse
  {
    id: 'nb-ko-zeilen', thema: T,
    stamm: P('In der Karte der Korrespondenzanalyse liegen zwei Zeilenpunkte dicht beieinander. Was heißt das?', 'On the map of a correspondence analysis two row points lie close together. What does that mean?'),
    antworten: [
      a(P('Die beiden Zeilen haben ähnliche Profile, also eine ähnliche prozentuale Verteilung über die Spalten.', 'The two rows have similar profiles, that is a similar percentage distribution across the columns.'), P('Abstände zwischen Zeilen und Zeilen sind aussagekräftig. Verglichen werden Prozentverteilungen, nicht die Zahl der Personen.', 'Distances between rows and rows are meaningful. What is compared are percentage distributions, not numbers of people.'), true),
      a(P('Die beiden Zeilen haben ähnlich viele Fälle, sind also ähnlich groß und tragen ähnlich viel zur Karte bei.', 'The two rows have a similar number of cases, so they are of similar size and contribute similarly to the map.'), P('Die Größe der Zeilen geht über ihr Gewicht ein, nicht über die Lage. Zwei sehr verschieden große Zeilen können dicht beieinander liegen.', 'The size of the rows enters through their weight, not through position. Two rows of very different size can lie close together.')),
      a(P('Zwischen den beiden Zeilen besteht ein überzufälliger Zusammenhang, der sich im Test bestätigen ließe.', 'There is a relationship beyond chance between the two rows, which a test would confirm.'), P('Die Karte beschreibt und prüft nichts. Ob ein Zusammenhang überzufällig ist, zeigt der Chi-Quadrat-Test der Kreuztabelle.', 'The map describes and tests nothing. Whether a relationship exceeds chance is shown by the chi-square test of the cross tabulation.')),
      a(P('Beide Zeilen liegen nahe bei derselben Spalte und haben dort gleich viele Fälle in ihren Feldern.', 'Both rows lie near the same column and have the same number of cases there in their cells.'), P('Die Nähe zu einer Spalte zeigt nur eine Richtung. Gleiche Fallzahlen folgen daraus nicht.', 'Nearness to a column shows only a direction. Equal numbers of cases do not follow from it.'))
    ],
    hilfe: ['korrespondenzanalyse'], belege: ['Hilfe:korrespondenzanalyse']
  },
  {
    id: 'nb-ko-richtung', thema: T,
    stamm: P('In der Karte liegt der Zeilenpunkt „jung“ nahe beim Spaltenpunkt „Bus“. Wie wird das gelesen?', 'On the map the row point "young" lies near the column point "bus". How is that read?'),
    antworten: [
      a(P('Junge Personen fahren überdurchschnittlich oft Bus. Die Nähe zeigt eine Richtung, keine genaue Entfernung.', 'Young people take the bus more often than average. The nearness shows a direction, not an exact distance.'), P('Eine Zeile liegt in Richtung der Spalten, bei denen sie über dem Durchschnitt liegt. Der Abstand zwischen Zeile und Spalte gilt nur als Richtung.', 'A row lies in the direction of the columns where it is above average. The distance between row and column counts only as a direction.'), true),
      a(P('Die meisten Busfahrenden sind wohl jung, denn der Punkt „Bus“ liegt bei „jung“, also stammen viele Fahrten von ihnen.', 'Most bus users are probably young, because the point "bus" lies at "young", so many trips come from them.'), P('Das wäre ein Spaltenprofil. Die Nähe sagt etwas über das Zeilenprofil: Bei den Jungen ist der Anteil des Busses hoch.', 'That would be a column profile. The nearness says something about the row profile: among the young the share of the bus is high.')),
      a(P('Ein großer Teil der jungen Personen fährt Bus, weil der Abstand zwischen beiden Punkten recht klein ausfällt.', 'A large part of the young people take the bus because the distance between the two points turns out rather small.'), P('Aus dem Abstand lässt sich kein Anteil ablesen. Anteile stehen in den Zeilenprofilen der Tabelle.', 'No share can be read from the distance. Shares are in the row profiles of the table.')),
      a(P('Der Zusammenhang zwischen Alter und Verkehrsmittel ist damit gesichert und braucht garantiert keinen weiteren Test.', 'The relationship between age and means of transport is thereby established and guaranteed to need no further test.'), P('Die Karte prüft nichts. Der Chi-Quadrat-Test der Kreuztabelle beurteilt, ob der Zusammenhang überzufällig ist.', 'The map tests nothing. The chi-square test of the cross tabulation judges whether the relationship exceeds chance.'))
    ],
    hilfe: ['korrespondenzanalyse'], belege: ['Hilfe:korrespondenzanalyse']
  },
  {
    id: 'nb-ko-mitte', thema: T,
    stamm: P('In einer Tabelle hat eine Spalte in jeder Zeile denselben Zeilenanteil (im Beispiel der Rechenaufgabe 30 %). Wo liegt diese Spalte in der Karte?', 'In a table one column has the same row share in every row (in the example of the calculation task 30%). Where does this column lie on the map?'),
    antworten: [
      a(P('Weit am Rand, denn sie hat in allen Zeilen einen hohen Anteil.', 'Far at the edge, because it has a high share in all rows.'), P('Der Anteil selbst entscheidet nicht über die Lage, sondern seine Abweichung vom Durchschnitt. Hier ist sie überall 0.', 'The share itself does not decide the position but its deviation from the average. Here it is 0 everywhere.')),
      a(P('Nahe der Mitte der Karte, denn sie unterscheidet die Zeilen nicht.', 'Near the centre of the map, because it does not distinguish the rows.'), P('Die Lage folgt aus der Abweichung vom durchschnittlichen Profil. Bei gleichem Anteil in allen Zeilen ist sie 0, und die Spalte trägt zum Muster der Tabelle nichts bei.', 'The position follows from the deviation from the average profile. With the same share in all rows it is 0, and the column adds nothing to the pattern of the table.'), true),
      a(P('Genau auf dem Zeilenpunkt, der den höchsten Anteil hat.', 'Exactly on the row point with the highest share.'), P('Es gibt keinen höchsten Anteil, denn alle sind gleich. Spalten und Zeilen werden getrennt eingezeichnet.', 'There is no highest share since all are equal. Columns and rows are plotted separately.')),
      a(P('Sie lässt sich nicht einzeichnen, weil die Spalte keine Unterschiede zeigt.', 'It cannot be plotted because the column shows no differences.'), P('Sie wird eingezeichnet, liegt aber in der Mitte. Auch eine Spalte ohne Unterschiede ist ein gültiger Punkt der Karte.', 'It is plotted but lies in the middle. A column without differences is also a valid point of the map.'))
    ],
    hilfe: ['korrespondenzanalyse'], belege: ['Hilfe:korrespondenzanalyse']
  },
  {
    id: 'nb-ko-anteil', thema: T,
    stamm: P('Die ersten beiden Dimensionen der Karte zeigen zusammen einen kleinen Anteil der Trägheit. Was folgt daraus?', 'The first two dimensions of the map together show a small share of the inertia. What follows from it?'),
    antworten: [
      a(P('Die Karte gibt nur einen kleinen Teil des Musters der Tabelle wieder, Abstände sind mit Vorsicht zu lesen.', 'The map reproduces only a small part of the pattern of the table, and distances are to be read with caution.'), P('Die Trägheit misst die Streuung der Tabelle. Zeigen zwei Dimensionen wenig davon, bleibt ein großer Teil des Musters außerhalb der Karte.', 'Inertia measures the spread of the table. If two dimensions show little of it, a large part of the pattern remains outside the map.'), true),
      a(P('Die Tabelle enthält vermutlich nur einen schwachen Zusammenhang, und der Chi-Quadrat-Test dürfte unauffällig bleiben.', 'The table probably contains only a weak relationship, and the chi-square test is likely to stay inconspicuous.'), P('Das ist die gesamte Trägheit, nicht ihr Anteil in zwei Dimensionen. Eine große Tabelle mit vielen Dimensionen kann einen starken Zusammenhang haben und trotzdem in zwei Dimensionen wenig zeigen.', 'That would concern the total inertia, not its share in two dimensions. A large table with many dimensions can have a strong relationship and still show little in two dimensions.')),
      a(P('Die Zeilen und Spalten sind vermutlich ungünstig einsortiert und sollten vor dem erneuten Zeichnen umgestellt werden.', 'The rows and columns are probably sorted unfavourably and should be rearranged before the map is drawn again.'), P('Die Reihenfolge von Zeilen und Spalten ändert die Karte nicht.', 'The order of rows and columns does not change the map.')),
      a(P('Die Karte sollte besser nicht berichtet werden, solange der Anteil beider Dimensionen recht klein bleibt.', 'The map had better not be reported as long as the share of both dimensions remains rather small.'), P('Es gibt keine solche Pflicht. Der Anteil gehört in den Bericht, damit sich beurteilen lässt, wie viel die Karte zeigt.', 'There is no such obligation. The share belongs in the report so that it can be judged how much the map shows.'))
    ],
    hilfe: ['korrespondenzanalyse'], belege: ['Hilfe:korrespondenzanalyse']
  },

  // ======================================================== (b) Abschnitte in bestehenden Einheiten
  // ---- regression-voraussetzungen: robuste Standardfehler
  {
    id: 'nb-rs-aendert', thema: T,
    stamm: P('Die Reste einer Regression streuen bei großen Werten stärker als bei kleinen. Was ändern robuste Standardfehler (HC3)?', 'The residuals of a regression vary more for large values than for small ones. What do robust standard errors (HC3) change?'),
    antworten: [
      a(P('Sie ändern die Koeffizienten b so, dass die Gerade die großen Werte weniger stark gewichtet.', 'They change the coefficients b so that the line weights the large values less.'), P('Die Koeffizienten bleiben gleich. Geändert werden nur Standardfehler, p-Werte und Intervalle.', 'The coefficients stay the same. Only standard errors, p values and intervals are changed.')),
      a(P('Sie belassen die Koeffizienten und korrigieren Standardfehler, p-Werte und Intervalle.', 'They leave the coefficients and correct standard errors, p values and intervals.'), P('Die übliche Rechnung nimmt gleiche Streuung der Reste an. Bei ungleicher Streuung stimmen die üblichen Standardfehler nicht mehr, die robusten bleiben brauchbar.', 'The usual calculation assumes equal spread of the residuals. With unequal spread the usual standard errors are no longer right, the robust ones remain usable.'), true),
      a(P('Sie machen die Reste normalverteilt und die Beziehung gerade, so dass alle Annahmen erfüllt sind.', 'They make the residuals normally distributed and the relationship straight, so that all assumptions are met.'), P('Sie beheben nur die ungleiche Streuung. Eine krumme Beziehung oder abhängige Beobachtungen bleiben, wie sie sind.', 'They fix only the unequal spread. A curved relationship or dependent observations stay as they are.')),
      a(P('Sie schließen die Fälle mit den größten Resten aus der Rechnung aus und rechnen mit dem Rest.', 'They exclude the cases with the largest residuals from the calculation and calculate with the rest.'), P('Alle Fälle bleiben in der Rechnung. Nur ihr Gewicht für die Standardfehler wird anders berechnet.', 'All cases stay in the calculation. Only their weight for the standard errors is calculated differently.'))
    ],
    hilfe: ['robuste-standardfehler', 'heteroskedastizitaet'], belege: ['Hilfe:robuste-standardfehler']
  },
  {
    id: 'nb-rs-gleich', thema: T,
    stamm: P('Die robusten und die üblichen Standardfehler liegen fast gleich. Wie ist das zu lesen?', 'The robust and the usual standard errors are almost equal. How is this to be read?'),
    antworten: [
      a(P('Es gibt keinen Hinweis auf ungleiche Streuung der Reste. Das übliche Ergebnis lässt sich berichten.', 'There is no hint of unequal spread of the residuals. The usual result can simply be reported.'), P('Weichen die Werte nicht deutlich ab, spielt die ungleiche Streuung für dieses Modell kaum eine Rolle.', 'If the values do not deviate clearly, unequal spread plays hardly any role for this model.'), true),
      a(P('Das Modell ist in allen Voraussetzungen bestätigt, auch in der Form des Zusammenhangs.', 'The model is confirmed in all its assumptions, including the form of the relationship.'), P('Robuste Standardfehler prüfen nur die gleiche Streuung der Reste. Form, Unabhängigkeit und Einflüsse einzelner Fälle bleiben offen.', 'Robust standard errors check only the equal spread of the residuals. Form, independence and influences of single cases remain open.')),
      a(P('Die Koeffizienten sind falsch, weil sich bei richtiger Rechnung beide Werte unterscheiden müssten.', 'The coefficients are wrong because with a correct calculation the two values would have to differ.'), P('Fast gleiche Werte sind bei gleichmäßiger Streuung das erwartete Bild. Ein Fehler liegt nicht vor.', 'Almost equal values are the expected picture with even spread. There is no error.')),
      a(P('Die robuste Rechnung war überflüssig und muss deshalb aus dem Bericht gestrichen werden, auch als Kontrolle.', 'The robust calculation was superfluous and therefore has to be deleted from the report, even as a check.'), P('Sie darf als Kontrolle genannt werden. Sie zeigt dem Leser, dass die ungleiche Streuung geprüft wurde.', 'It may be named as a check. It shows the reader that the unequal spread was checked.'))
    ],
    hilfe: ['robuste-standardfehler'], belege: ['Hilfe:robuste-standardfehler']
  },
  // ---- loglinear: Rückwärts-Suche
  {
    id: 'nb-lr-stop', thema: T,
    stamm: P('Die Rückwärts-Eliminierung eines loglinearen Modells beginnt mit allen Wechselwirkungen. Welches Modell bleibt am Ende stehen?', 'The backward elimination of a log-linear model starts with all interactions. Which model remains at the end?'),
    antworten: [
      a(P('Das Modell mit den meisten Termen, weil jeder Term etwas zur Anpassung beiträgt und nichts verloren geht.', 'The model with the most terms because every term contributes something to the fit and nothing is lost.'), P('Gestrichen wird gerade, solange ein Term entbehrlich ist. Das Ergebnis ist das sparsamere Modell.', 'Terms are deleted precisely as long as one is dispensable. The result is the more economical model.')),
      a(P('Das Modell, bei dem kein Term mehr gestrichen werden darf, weil alle übrigen Terme p unter dem Kriterium haben.', 'The model in which no term may be deleted any more because all remaining terms have p below the criterion.'), P('Gestrichen wird der Term mit dem größten p, solange es über dem Kriterium (meist 0,05) liegt. Am Ende bleibt das sparsamste Modell, das die Tabelle noch beschreibt.', 'The term with the largest p is deleted as long as it lies above the criterion (usually 0.05). What remains is the most economical model that still describes the table.'), true),
      a(P('Das Modell, das die beobachteten Häufigkeiten fehlerfrei wiedergibt, also alle Zellen der Tabelle genau trifft.', 'The model that reproduces the observed frequencies without error, that is hits all cells of the table exactly.'), P('Das ist das gesättigte Modell, mit dem die Suche beginnt. Es erklärt nichts, sondern wiederholt die Tabelle.', 'That is the saturated model with which the search begins. It explains nothing but repeats the table.')),
      a(P('Das Modell, in dem nur Haupteffekte stehen, denn Wechselwirkungen werden alle gestrichen und nicht ersetzt.', 'The model in which only main effects remain, because interactions are all deleted and not replaced.'), P('Wechselwirkungen bleiben, wenn ihr Test dafür spricht. Das ist der Sinn der Suche.', 'Interactions stay if their test speaks for them. That is the point of the search.'))
    ],
    hilfe: ['loglinear-rueckwaerts'], belege: ['Hilfe:loglinear-rueckwaerts']
  },
  {
    id: 'nb-lr-hier', thema: T,
    stamm: P('Ein Haupteffekt hat bei der Rückwärts-Eliminierung ein großes p. Trotzdem bleibt er im Modell. Warum?', 'A main effect has a large p in the backward elimination. Still it stays in the model. Why?'),
    antworten: [
      a(P('Das Verfahren ist hierarchisch: Ein Term, der in einem höheren Term des Modells steckt, bleibt.', 'The procedure is hierarchical: a term that sits in a higher term of the model stays.'), P('Steht eine Wechselwirkung mit diesem Merkmal im Modell, gehört der Haupteffekt dazu. Gestrichen wird nur, was in keinem höheren Term mehr steckt.', 'If an interaction with this variable is in the model, the main effect belongs with it. Only what no longer sits in any higher term is deleted.'), true),
      a(P('Haupteffekte bleiben grundsätzlich im Modell, weil sie die Randhäufigkeiten der Tabelle festlegen.', 'Main effects generally stay in the model because they fix the marginal frequencies of the table.'), P('Sie können gestrichen werden, wenn kein höherer Term sie braucht. Die Regel ist die Hierarchie.', 'They can be deleted when no higher term needs them. The rule is the hierarchy.')),
      a(P('Das große p zeigt, dass der Haupteffekt besonders wichtig für das Modell ist und bleiben muss.', 'The large p shows that the main effect is particularly important for the model and has to stay.'), P('Ein großes p spricht für Entbehrlichkeit, nicht für Wichtigkeit. Dass er bleibt, liegt an der Hierarchie.', 'A large p speaks for dispensability, not for importance. That it stays is due to the hierarchy.')),
      a(P('Die Rechnung hat zu wenig Fälle, und Statable bricht die Suche an dieser Stelle ab, ohne zu streichen.', 'The calculation has too few cases, and Statable aborts the search at this point without deleting.'), P('Die Suche läuft weiter, bis kein Term mehr gestrichen werden darf. Ein Abbruch liegt nicht vor.', 'The search continues until no term may be deleted any more. There is no abort.'))
    ],
    hilfe: ['loglinear-rueckwaerts'], belege: ['Hilfe:loglinear-rueckwaerts']
  },
  // ---- regression-zielgroesse-kurve: Kurvenanpassung
  {
    id: 'nb-kv-r2', thema: T,
    stamm: P('Eine Parabel hat ein etwas höheres R² als die Gerade. Was folgt daraus für die Wahl der Form?', 'A parabola has a slightly higher R² than the line. What follows from it for the choice of the form?'),
    antworten: [
      a(P('Die Parabel beschreibt die Punkte besser, also ist sie wohl die richtige Form.', 'The parabola describes the points better, so it is probably the right form.'), P('Eine Form mit mehr Zahlen trifft die Punkte schon durch ihre Bauart besser. Das höhere R² allein sagt nicht, ob die Kurve etwas Wirkliches erfasst.', 'A form with more numbers hits the points better by its very construction. The higher R² alone does not say whether the curve captures something real.')),
      a(P('Das höhere R² folgt schon aus den zusätzlichen Zahlen der Parabel. Bereinigtes R² und Sachverhalt entscheiden.', 'The higher R² follows already from the additional numbers of the parabola. Adjusted R² and the subject matter decide.'), P('Am besten gilt die einfachste Form, die zum Sachverhalt passt. Das bereinigte R² rechnet die zusätzliche Zahl der Parabel ein.', 'The simplest form that fits the subject matter is best. The adjusted R² takes the extra number of the parabola into account.'), true),
      a(P('Die Gerade ist vorzuziehen, weil Kurven bei weniger als hundert Punkten wohl nur zufällig passen.', 'The line is preferable because curves with fewer than a hundred points probably fit only by chance.'), P('Eine solche Mindestzahl gibt es nicht. Bei wenigen Punkten ist die Kurve allerdings unsicher.', 'There is no such minimum number. With few points, however, the curve is uncertain.')),
      a(P('Die Parabel ist vorzuziehen, sobald ihr R² deutlich über 0,5 liegt, weil sie dann mehr als die Hälfte erklärt.', 'The parabola is preferable as soon as its R² is clearly above 0.5, because it then explains more than half.'), P('Mit einer Grenze für R² lässt sich die Form nicht wählen. Entscheidend ist der Vergleich mit der Geraden und die Fachfrage.', 'The form cannot be chosen with a limit for R². What matters is the comparison with the line and the subject question.'))
    ],
    hilfe: ['kurvenanpassung', 'nichtlineare-regression'], belege: ['Hilfe:kurvenanpassung']
  },
  {
    id: 'nb-kv-aussen', thema: T,
    stamm: P('Eine Parabel passt gut zu den Daten. Wofür taugt sie danach weniger?', 'A parabola fits the data well. What is it less suited for afterwards?'),
    antworten: [
      a(P('Für Vorhersagen weit außerhalb der Daten: Sie dreht dort um und sagt dann Unsinn voraus.', 'For predictions far outside the data: it turns around there and then predicts nonsense.'), P('Außerhalb der Daten (Extrapolation) sagen Kurven oft Unsinn voraus. Eine Parabel dreht um, eine Exponentialkurve wächst ins Unermessliche.', 'Outside the data (extrapolation) curves often predict nonsense. A parabola turns around, an exponential curve grows without limit.'), true),
      a(P('Für Werte zwischen den gemessenen Punkten, weil sich dort nichts interpolieren lässt.', 'For values between the measured points, because nothing can be interpolated there.'), P('Innerhalb der Daten trägt die Kurve gerade am besten. Zwischen den Punkten ist sie meist verlässlicher als außerhalb.', 'Within the data the curve carries best. Between the points it is usually more reliable than outside.')),
      a(P('Für eine Beschreibung der Streuung, denn Kurven haben keine Reste und keine Abweichungen mehr.', 'For a description of the scatter, because curves have no residuals and no deviations any more.'), P('Auch bei einer Kurve bleiben Abweichungen der Punkte von der Kurve. R² und Reststreuung gibt es weiter.', 'With a curve, too, deviations of the points from the curve remain. R² and residual scatter still exist.')),
      a(P('Für Daten mit Messfehlern, weil Kurven jeden Messfehler genau nachbilden und so verstärken.', 'For data with measurement errors because curves reproduce every measurement error exactly and so amplify it.'), P('Eine Parabel hat nur drei Zahlen und kann nicht jeden Punkt nachbilden. Anders ist es bei Kurven mit sehr vielen Zahlen.', 'A parabola has only three numbers and cannot reproduce every point. It is different for curves with very many numbers.'))
    ],
    hilfe: ['kurvenanpassung'], belege: ['Hilfe:kurvenanpassung']
  },
  // ---- regelkarte: Regelkarten und Zählkarten
  {
    id: 'nb-rk-art', thema: T,
    stamm: P('Je Schicht wird der Anteil fehlerhafter Stücke erfasst, die Stichprobengröße wechselt. Welche Zählkarte passt?', 'For each shift the share of defective pieces is recorded, and the sample size varies. Which count chart suits?'),
    antworten: [
      a(P('Die c-Karte, denn sie zählt die Zahl der Fehler in jeder Schicht und passt ihre Grenzen an.', 'The c chart, because it counts the number of defects in each shift and adapts its limits.'), P('Die c-Karte zählt Fehler in einer gleich großen Menge, nicht den Anteil fehlerhafter Stücke bei wechselnder Größe.', 'The c chart counts defects in an equally sized amount, not the share of defective pieces with varying size.')),
      a(P('Die np-Karte, denn sie zählt die fehlerhaften Stücke und zeigt sie in jeder Schicht.', 'The np chart, because it counts the defective pieces and shows them for each shift.'), P('Die np-Karte braucht eine gleich bleibende Stichprobengröße. Bei wechselnder Größe wäre ein Vergleich der Zahlen irreführend.', 'The np chart needs a constant sample size. With varying size, comparing the counts would be misleading.')),
      a(P('Die p-Karte, denn sie zeigt den Anteil und passt ihre Grenzen der Stichprobengröße an.', 'The p chart, because it shows the share and adapts its limits to the sample size.'), P('Bei p und u ändern sich die Grenzen von Punkt zu Punkt mit der Stichprobengröße. Das ist der Zweck der Anteilskarte.', 'For p and u the limits change from point to point with the sample size. That is the purpose of the share chart.'), true),
      a(P('Die Mittelwertkarte (X̄-R), denn jede Schicht liefert einen Mittelwert der Messwerte.', 'The mean chart (X̄-R), because each shift gives a mean of the measured values.'), P('Die Mittelwertkarte ist für gemessene Werte gedacht. Gezählte fehlerhafte Stücke folgen einer anderen Verteilung.', 'The mean chart is meant for measured values. Counted defective pieces follow a different distribution.'))
    ],
    hilfe: ['regelkarten'], belege: ['Hilfe:regelkarten']
  },
  {
    id: 'nb-rk-grenzen', thema: T,
    stamm: P('Bei der p-Karte werden die Grenzen für Schichten mit kleiner Stichprobe breiter. Warum?', 'On the p chart the limits become wider for shifts with a small sample. Why?'),
    antworten: [
      a(P('Weil kleine Stichproben schlechter kontrolliert werden und deshalb mehr Toleranz verdienen.', 'Because small samples are controlled less well and therefore deserve more tolerance.'), P('Es geht nicht um Kontrolle oder Toleranz, sondern um Zufall: Der Anteil schwankt in kleinen Stichproben stärker.', 'It is not about control or tolerance but about chance: the share varies more in small samples.')),
      a(P('Weil der Zufallsfehler eines Anteils mit kleinerer Stichprobe wächst und die Grenzen ihn abbilden.', 'Because the chance error of a share grows with a smaller sample and the limits reflect it.'), P('Die Grenzen sind die Mittellinie plus/minus 3 Standardabweichungen der Binomialverteilung. Diese hängt von der Stichprobengröße ab.', 'The limits are the centre line plus/minus 3 standard deviations of the binomial distribution. That depends on the sample size.'), true),
      a(P('Weil die Spezifikationsgrenzen des Kunden mit der Stichprobengröße wechseln und so mitwandern.', 'Because the specification limits of the customer change with the sample size and thus move along.'), P('Regelgrenzen kommen aus dem Prozess selbst, Spezifikationsgrenzen aus der Anforderung. Mit der Stichprobengröße ändert sich nur die erste Art.', 'Control limits come from the process itself, specification limits from the requirement. With the sample size only the first kind changes.')),
      a(P('Weil für kleine Schichten die Mittellinie anders berechnet wird als für große Schichten.', 'Because for small shifts the centre line is calculated differently than for large shifts.'), P('Die Mittellinie ist der Gesamtanteil aller Schichten und für alle gleich. Es ändern sich nur die Grenzen.', 'The centre line is the overall share of all shifts and the same for all. Only the limits change.'))
    ],
    hilfe: ['regelkarten'], belege: ['Hilfe:regelkarten']
  },
  // ---- messsystem: Gauge R&R
  {
    id: 'nb-gr-teile', thema: T,
    stamm: P('Für die Messsystemanalyse werden nur sehr ähnliche Teile ausgewählt. Das Messsystem schneidet schlecht ab. Woran kann das liegen?', 'For the measurement system analysis only very similar parts are selected. The measurement system performs poorly. What can be the reason?'),
    antworten: [
      a(P('Die Streuung der Teile ist klein, daher macht die Messstreuung einen großen Anteil aus, obwohl das Gerät taugt.', 'The spread of the parts is small, so the measurement spread makes up a large share even though the instrument is fine.'), P('Der Anteil des Messsystems wird an der Gesamtstreuung gemessen. Die Streuung der Teile steht hier für die Auswahl der Teile, nicht für die Fertigung.', 'The share of the measurement system is measured against the total spread. The spread of the parts here stands for the selection of the parts, not for the production.'), true),
      a(P('Ähnliche Teile verschlechtern die Wiederholpräzision wohl deutlich, weil das Messgerät sie schlechter unterscheiden kann.', 'Similar parts probably worsen the repeatability markedly because the instrument can distinguish them less well.'), P('Die Wiederholpräzision ist die Streuung bei wiederholtem Messen desselben Teils. Sie hängt nicht von der Ähnlichkeit der Teile ab.', 'Repeatability is the spread when the same part is measured repeatedly. It does not depend on the similarity of the parts.')),
      a(P('Die Prüfenden messen bei ähnlichen Teilen aus Gewohnheit gleich, und die Vergleichspräzision sinkt dadurch.', 'The appraisers measure similar parts the same out of habit, and the reproducibility therefore falls.'), P('Die Auswahl der Teile ändert nicht, wie verschiedene Prüfende messen. Ein schlechter Anteil bedeutet daher nicht, dass sie sich verändert hätten.', 'The selection of the parts does not change how different appraisers measure. A poor share therefore does not mean that they have changed.')),
      a(P('Die Zahl der Messungen je Teil war zu klein, mehr Wiederholungen würden den Anteil verbessern.', 'The number of measurements per part was too small; more repetitions would improve the share.'), P('Mehr Wiederholungen machen die Schätzung genauer, ändern aber das Verhältnis von Messstreuung zu Teilestreuung kaum.', 'More repetitions make the estimate more precise but hardly change the ratio of measurement spread to spread of the parts.'))
    ],
    hilfe: ['messsystemanalyse-gauge-rr'], belege: ['Hilfe:messsystemanalyse-gauge-rr']
  },
  {
    id: 'nb-gr-pruefer', thema: T,
    stamm: P('Dieselbe Person misst ein Teil mehrmals fast gleich. Verschiedene Personen weichen aber voneinander ab. Welcher Teil der Streuungszerlegung ist groß?', 'The same person measures a part several times almost equally. Different people, however, deviate from each other. Which part of the variance decomposition is large?'),
    antworten: [
      a(P('Die Wiederholpräzision, also die Streuung des Messgeräts bei ein und derselben prüfenden Person.', 'The repeatability, that is the spread of the instrument for one and the same appraiser.'), P('Diese ist hier klein, weil dieselbe Person fast gleich misst. Auffällig ist der Unterschied zwischen den Personen.', 'This is small here because the same person measures almost equally. What stands out is the difference between the people.')),
      a(P('Die Streuung zwischen den Teilen, denn jedes Teil wird im Mittel etwas anders gemessen als die anderen.', 'The spread between the parts, because each part is measured somewhat differently on average than the others.'), P('Die Streuung zwischen den Teilen zeigt die Unterschiede der Teile selbst. Dass Personen sich unterscheiden, steckt im Messsystem.', 'The spread between the parts shows the differences of the parts themselves. That people differ belongs to the measurement system.')),
      a(P('Die Vergleichspräzision: Verschiedene Prüfende messen dasselbe Teil verschieden, hier hilft Schulung.', 'The reproducibility: different appraisers measure the same part differently; training helps here.'), P('Die Vergleichspräzision erfasst Unterschiede zwischen den Prüfenden. Sie lassen sich oft durch Schulung und feste Anweisungen verkleinern, das Gerät selbst muss nicht getauscht werden.', 'Reproducibility captures differences between the appraisers. They can often be reduced by training and fixed instructions; the instrument itself does not have to be replaced.'), true),
      a(P('Eher keiner der Anteile, denn die Streuung ist wohl weitgehend durch das Messgerät allein erklärt.', 'Probably none of the parts, because the spread is largely explained by the instrument alone.'), P('Das Messgerät steht für die Wiederholpräzision, die hier klein ist. Der Unterschied liegt bei den Prüfenden.', 'The instrument stands for repeatability, which is small here. The difference lies with the appraisers.'))
    ],
    hilfe: ['messsystemanalyse-gauge-rr'], belege: ['Hilfe:messsystemanalyse-gauge-rr']
  },
  // ---- zeitreihe-weitere-wege: auffällige Werte
  {
    id: 'nb-zw-auffaellig', thema: T,
    stamm: P('Statable markiert in einer Zeitreihe einen Punkt als auffälligen Wert. Was bedeutet das?', 'Statable marks a point in a time series as a conspicuous value. What does that mean?'),
    antworten: [
      a(P('Der Wert ist vermutlich ein Tippfehler und sollte aus der Reihe gelöscht werden, weil er nicht zum Muster passt.', 'The value is probably a typing error and should be deleted from the series because it does not fit the pattern.'), P('Auffällig heißt nicht falsch, sondern „passt nicht zum Muster“. Ob es ein Fehler ist, ist zu prüfen.', 'Conspicuous does not mean wrong but "does not fit the pattern". Whether it is an error has to be checked.')),
      a(P('Der Wert weicht stark vom Muster aus Trend und Saison ab. Ob Tippfehler oder Ereignis, ist zu klären.', 'The value deviates strongly from the pattern of trend and season. Whether typing error or event has to be clarified.'), P('Der Rest (Wert minus Muster) wird durch eine robuste Streuung geteilt, und z liegt über der Schwelle. Statable ändert die Daten nicht und nennt keine Ursache.', 'The residual (value minus pattern) is divided by a robust spread, and z lies above the threshold. Statable does not change the data and names no cause.'), true),
      a(P('Der Wert ist ein Ausreißer im Sinne einer Störung, deren Art Statable dazu angibt.', 'The value is an outlier in the sense of a disturbance whose type Statable gives.'), P('Das Verfahren ist eine einfache Verabredung (Schwelle für z) und benennt keine Art der Störung. Eine Wahrscheinlichkeit gibt es dazu nicht.', 'The procedure is a simple convention (threshold for z) and names no type of disturbance. There is no probability for it.')),
      a(P('Ab diesem Punkt hat sich die Reihe dauerhaft verändert, etwa durch eine Maßnahme im Betrieb.', 'From this point the series has changed permanently, for example through a measure in the company.'), P('Ein einzelner auffälliger Punkt zeigt keine dauerhafte Änderung. Wirkt ein Ereignis ab einem Zeitpunkt, passt die Frage, ob eine Maßnahme gewirkt hat, besser.', 'A single conspicuous point shows no permanent change. If an event acts from one point in time on, the question whether a measure has worked fits better.'))
    ],
    hilfe: ['auffaellige-werte-zeitreihe'], belege: ['Hilfe:auffaellige-werte-zeitreihe']
  },
  // ---- logistische-regression-guete: Entscheidungsbaum
  {
    id: 'nb-eb-pruef', thema: T,
    stamm: P('Ein tiefer Entscheidungsbaum ordnet die Lerndaten fast fehlerfrei zu. Woran lässt sich erkennen, ob er auch bei neuen Personen taugt?', 'A deep decision tree assigns the learning data almost without error. How can it be recognised whether it also works for new people?'),
    antworten: [
      a(P('An der Trefferquote in den Lerndaten, denn sie zeigt, wie gut der Baum die Gruppen insgesamt kennt.', 'From the hit rate in the learning data, because it shows how well the tree knows the groups overall.'), P('In den Lerndaten hat der Baum die Zufälligkeiten mitgelernt. Seine Trefferquote dort ist zu günstig.', 'In the learning data the tree has also learned the accidental features. Its hit rate there is too favourable.')),
      a(P('An der Zahl der Blätter: Je mehr Blätter, desto besser passt der Baum auch zu neuen Personen.', 'From the number of leaves: the more leaves, the better the tree fits new people too.'), P('Viele Blätter weisen eher auf Überanpassung hin. Ein Baum, der jede Eigenheit der Lerndaten abbildet, sagt neue Fälle schlechter voraus.', 'Many leaves point rather to overfitting. A tree that reproduces every peculiarity of the learning data predicts new cases worse.')),
      a(P('An den Prüfdaten, die beim Bau nicht verwendet wurden, im Vergleich mit dem Raten der häufigsten Gruppe.', 'From the test data not used for building, in comparison with guessing the most frequent group.'), P('Nur die Prüfdaten zeigen, ob der Baum bei neuen Personen taugt. Ist er dort nicht besser als Raten, hat er vermutlich nur Zufälligkeiten der Lerndaten gelernt.', 'Only the test data show whether the tree works for new people. If it is no better than guessing there, it has probably learned only accidental features of the learning data.'), true),
      a(P('An der Wichtigkeit der Spalten, denn eine hohe Wichtigkeit belegt, dass die Spalte tatsächlich wirkt.', 'From the importance of the columns, because a high importance proves that the column actually has an effect.'), P('Die Wichtigkeit gilt nur für diesen einen Baum und zeigt keine Ursache. Ähnliche Spalten können sich gegenseitig verdrängen.', 'The importance applies only to this one tree and shows no cause. Similar columns can displace each other.'))
    ],
    hilfe: ['entscheidungsbaum'], belege: ['Hilfe:entscheidungsbaum']
  },
  {
    id: 'nb-eb-stabil', thema: T,
    stamm: P('Mit anderen Personen in den Lerndaten sähe der Entscheidungsbaum oft ganz anders aus. Was heißt das für die Deutung?', 'With other people in the learning data the decision tree would often look quite different. What does that mean for the interpretation?'),
    antworten: [
      a(P('Der Baum ist fehlerhaft gerechnet, daher sollte die Rechnung zwingend mit festem Startwert wiederholt werden.', 'The tree was calculated wrongly, so the calculation should be repeated with a fixed starting value without exception.'), P('Die Instabilität liegt am Verfahren, nicht an der Rechnung. Statable teilt dazu fest in 70 % Lerndaten und 30 % Prüfdaten.', 'The instability lies in the method, not in the calculation. For this Statable splits fixed into 70% learning data and 30% test data.')),
      a(P('Der Baum beschreibt, was zu diesen Daten passt, und zeigt keine Ursachen. Einzelne Zweige sind keine festen Regeln.', 'The tree describes what fits these data and shows no causes. Single branches are no fixed rules.'), P('Bäume sind instabil, kleine Änderungen der Daten können die erste Teilung ändern. Brauchbar ist der Baum, wenn er an den Prüfdaten besser abschneidet als Raten.', 'Trees are unstable; small changes in the data can change the first split. The tree is useful if it does better than guessing on the test data.'), true),
      a(P('Die erste Teilung ist die wichtigste Ursache des Ergebnisses und bleibt daher auch bei anderen Personen gleich.', 'The first split is the most important cause of the outcome and therefore stays the same with other people.'), P('Gerade die erste Teilung kann sich mit anderen Personen ändern. Eine Ursache zeigt ein Baum nicht.', 'It is precisely the first split that can change with other people. A tree shows no cause.')),
      a(P('Der Baum eignet sich für Zahlen als Ziel, bei Gruppen als Ziel ist er weniger zuverlässig, weil sie instabil sind.', 'The tree suits numbers as the target; with groups as the target it is less reliable because they are unstable.'), P('Statable rechnet Klassifikationsbäume für Gruppen und Regressionsbäume für Zahlen. Die Instabilität gilt für beide.', 'Statable calculates classification trees for groups and regression trees for numbers. The instability applies to both.'))
    ],
    hilfe: ['entscheidungsbaum'], belege: ['Hilfe:entscheidungsbaum']
  }
];
