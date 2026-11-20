/**
 * Üben: Welche weiteren Wege für Tests, Intervalle und Modelle hat Statable, und was bedeutet ihre Ausgabe? (Funktionsfragen, Charge 4, 01.11.2026)
 * Äquivalenztest, Permutationstest, Bootstrap, Bayes-Faktor, Anpassungstests, Vielfalt, Mehrfachantworten, Kovarianzanalyse, hierarchische Regression,
 * Reliable Change Index. Quelle: nur die Hilfe-Artikel und die Fachblätter der Funktionen (Belege `Hilfe:<id>`, `Fachblatt:<NAME>`); die Knopfnamen stehen
 * wörtlich wie in der App. Bewusst ohne Zahlen aus Rechnungen: alle Fragen stehen ohne Tabellen und ohne Dezimalzahlen.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

export const FRAGEN: Frage[] = [
  // ---- Äquivalenztest (TOST) ----
  {
    id: 've-tost-nichtsig', thema: 'verfahren', karte: 'gruppen',
    stamm: P('Ein t-Test ergibt keinen signifikanten Unterschied zwischen zwei Verfahren. Was folgt daraus für die Gleichwertigkeit (Äquivalenztest, TOST)?',
      'A t test finds no significant difference between two methods. What follows for equivalence (equivalence test, TOST)?'),
    antworten: [
      a(P('Gleichwertigkeit ist nicht gezeigt; dafür braucht es den Äquivalenztest mit vorher festgelegter Grenze Δ', 'Equivalence is not shown; that takes the equivalence test with a limit Δ fixed beforehand'),
        P('Ein großes p ist fehlende Evidenz für einen Unterschied, kein Nachweis der Gleichheit. Nur der Äquivalenztest prüft, ob der Unterschied zwischen −Δ und +Δ liegt.', 'A large p is missing evidence for a difference, not proof of equality. Only the equivalence test checks whether the difference lies between −Δ and +Δ.'), true),
      a(P('Die Verfahren wirken gleich: Ein großes p zeigt, dass ein Unterschied keine Rolle spielt', 'The methods work alike: a large p shows that any difference does not matter'),
        P('Aus einem nicht signifikanten t-Test folgt kein "kein Unterschied". Bei kleinen Gruppen ist das Intervall breit, und ein Unterschied bleibt möglich.',
          'A non-significant t test does not imply "no difference". With small groups the interval is wide, and a difference remains possible.')),
      a(P('Sie sind gleichwertig, sobald die beiden Gruppenmittel in der Stichprobe fast gleich aussehen, auch ohne Intervall', 'They are equivalent as soon as the two group means look almost identical in the sample, even without an interval'),
        P('Wie ähnlich die Mittel aussehen, sagt nichts über die Unsicherheit. Gleichwertigkeit braucht eine begründete Grenze und einen Test, der das Intervall gegen sie prüft.',
          'How similar the means look says nothing about the uncertainty. Equivalence needs a justified limit and a test that checks the interval against it.'))
    ],
    hilfe: ['aequivalenztest-tost'], belege: ['Hilfe:aequivalenztest-tost', 'Fachblatt:WELLE2-PSYCHOLOGIE']
  },
  {
    id: 've-tost-weg', thema: 'verfahren', karte: 'gruppen',
    stamm: P('In Statable soll geprüft werden, ob zwei Gruppen gleichwertig sind. Welcher Weg führt dorthin?',
      'In Statable you want to check whether two groups are equivalent. Which route leads there?'),
    antworten: [
      a(P('In "Unterscheiden sich Gruppen?" unter "Weitere Wege" "Auf Gleichwertigkeit prüfen (Äquivalenztest)" anschalten', 'In "Do groups differ?" switch on "Test for equivalence (equivalence test)" under "More options"'),
        P('Der Äquivalenztest hängt am Gruppenvergleich (zwei Gruppen) und am Vorher-nachher-Vergleich. Die Grenze Δ hat keinen Standardwert und muss vor der Auswertung begründet sein.',
          'The equivalence test belongs to the group comparison (two groups) and to the before-after comparison. The limit Δ has no default value and must be justified before the analysis.'), true),
      a(P('In den "Einstellungen" "Bayes-Faktoren zeigen" einschalten und den Bayes-Faktor BF₁₀ gegen eine festgelegte Grenze lesen', 'In the "Settings" switch on "Show Bayes factors" and read the Bayes factor BF₁₀ against a fixed limit'),
        P('Der Bayes-Faktor vergleicht H₁ mit H₀, er prüft aber keinen Unterschied gegen eine vorher festgelegte Grenze. Er ist ein anderer Weg und kein Äquivalenztest.',
          'The Bayes factor compares H₁ with H₀, but it does not test a difference against a limit fixed beforehand. It is a different route and not an equivalence test.')),
      a(P('Unter "Weitere Wege" "Ohne Normalverteilung - mit Zufallsverfahren" anschalten und danach eine Grenze Δ eintragen', 'Under "More options" switch on "No normal distribution - with random procedures" and then enter a limit Δ'),
        P('Das ist der Permutationstest mit Bootstrap-Intervall. Er verzichtet auf die Normalverteilung, kennt aber keine Grenze Δ und zeigt keine Gleichwertigkeit.',
          'That is the permutation test with a bootstrap interval. It drops the normal distribution but knows no limit Δ and shows no equivalence.'))
    ],
    hilfe: ['aequivalenztest-tost'], belege: ['Hilfe:aequivalenztest-tost', 'Fachblatt:WELLE2-PSYCHOLOGIE']
  },
  {
    id: 've-tost-mehrfach', thema: 'verfahren', mehrfach: true,
    stamm: P('Welche Aussagen zum Äquivalenztest (TOST) in Statable stimmen? Mehrere können stimmen.',
      'Which statements about the equivalence test (TOST) in Statable are correct? Several may be correct.'),
    antworten: [
      a(P('Gleichwertigkeit ist gezeigt, wenn beide einseitigen Tests signifikant sind', 'Equivalence is shown when both one-sided tests are significant'),
        P('Dann liegt das 90-%-Konfidenzintervall der Differenz ganz innerhalb von −Δ bis +Δ, und ein Unterschied größer als Δ lässt sich ausschließen.',
          'Then the 90% confidence interval of the difference lies completely within −Δ to +Δ, and a difference larger than Δ can be ruled out.'), true),
      a(P('Die Grenze Δ muss vor der Auswertung begründet festgelegt werden', 'The limit Δ must be set and justified before the analysis'),
        P('Sie darf nach dem Rechnen nicht angepasst werden, um ein Ergebnis zu erreichen. Üblich ist der kleinste Unterschied, der in der Praxis zählt.',
          'It must not be adjusted after the calculation to reach a result. A common choice is the smallest difference that matters in practice.'), true),
      a(P('Bleibt der Nachweis aus, ist damit ein Unterschied größer als Δ gezeigt', 'If the proof fails, a difference larger than Δ is thereby shown'),
        P('Dann ist mindestens ein Test nicht signifikant. Das zeigt weder einen Unterschied noch Gleichwertigkeit; ein Unterschied größer als Δ bleibt nur möglich.',
          'Then at least one test is not significant. That shows neither a difference nor equivalence; a difference larger than Δ merely remains possible.')),
      a(P('Statable verwendet ein 95-%-Intervall, wie bei jedem gewöhnlichen t-Test', 'Statable uses a 95% interval, as in every ordinary t test'),
        P('Zwei einseitige Tests mit je 5 % entsprechen einem zweiseitigen 90-%-Intervall. Darum steht beim Äquivalenztest das 90-%-Intervall.',
          'Two one-sided tests at 5% each correspond to a two-sided 90% interval. That is why the equivalence test shows the 90% interval.'))
    ],
    hilfe: ['aequivalenztest-tost'], belege: ['Hilfe:aequivalenztest-tost', 'Fachblatt:WELLE2-PSYCHOLOGIE']
  },
  // ---- Permutationstest und Bootstrap ----
  {
    id: 've-perm-p', thema: 'verfahren', karte: 'gruppen',
    stamm: P('Beim Permutationstest mischt Statable die Gruppenzuordnung wieder und wieder. Wie entsteht daraus der p-Wert?',
      'In the permutation test Statable shuffles the group assignment again and again. How does the p value arise from that?'),
    antworten: [
      a(P('Aus dem Anteil der Mischungen, die mindestens so extrem sind wie das Beobachtete; p ist größer als 0', 'From the share of shuffles that are at least as extreme as the observed result; p is greater than 0'),
        P('Statable zählt, was der Zufall allein ergibt: p = (b + 1)/(B + 1), mit b Mischungen mindestens so extrem und B Ziehungen insgesamt. Darum steht nie genau 0 da.',
          'Statable counts what chance alone produces: p = (b + 1)/(B + 1), with b shuffles at least as extreme and B draws in total. That is why exactly 0 never appears.'), true),
      a(P('Aus einer Normalverteilung, deren Mittelwert und Streuung aus den gemischten Daten geschätzt werden, wie beim t-Test', 'From a normal distribution whose mean and spread are estimated from the shuffled data, as in the t test'),
        P('Der Permutationstest nimmt gerade keine Normalverteilung an. Er vergleicht das Beobachtete mit den gemischten Ergebnissen selbst.',
          'The permutation test assumes no normal distribution at all. It compares the observed result with the shuffled results themselves.')),
      a(P('Aus dem Anteil der Mischungen, die das Beobachtete genau wiederholen, geteilt durch alle Ziehungen B', 'From the share of shuffles that exactly repeat the observed result, divided by all B draws'),
        P('Es zählen alle Mischungen, die mindestens so extrem sind, nicht nur die mit identischem Ergebnis. Gleiche Ergebnisse wären bei Messwerten ohnehin selten.',
          'All shuffles that are at least as extreme count, not only those with an identical result. Identical results would be rare with measurements anyway.'))
    ],
    hilfe: ['zufallsverfahren-permutation'], belege: ['Hilfe:zufallsverfahren-permutation', 'Fachblatt:SPAETER-B-OPTIONEN']
  },
  {
    id: 've-perm-mehrfach', thema: 'verfahren', mehrfach: true, karte: 'gruppen',
    stamm: P('Welche Aussagen zu den Zufallsverfahren (Permutationstest, Bootstrap) in Statable stimmen? Mehrere können stimmen.',
      'Which statements about the random methods (permutation test, bootstrap) in Statable are correct? Several may be correct.'),
    antworten: [
      a(P('"Neu ziehen" zeigt den Zufallsfehler des Verfahrens', '"Draw again" shows the random error of the method'),
        P('Zwei Läufe mit verschiedenem Startwert unterscheiden sich ein wenig. Das ist der Zufallsfehler, kein Rechenfehler; mit mehr Ziehungen wird er kleiner.',
          'Two runs with different start values differ a little. That is the random error, not a calculation error; with more draws it gets smaller.'), true),
      a(P('Gleiche Zahlen gibt es nur bei gleichem Startwert in Statable', 'The same numbers appear only with the same start value in Statable'),
        P('Der Zufall von Statable ist nicht der von R. Auch mit demselben Startwert in R kommen die Ziehungen anders heraus.',
          'The random numbers of Statable are not those of R. Even with the same start value in R the draws come out differently.'), true),
      a(P('Bei sehr wenigen Fällen gleichen die vielen Ziehungen die kleine Stichprobe aus', 'With very few cases the many draws make up for the small sample'),
        P('Zufallsverfahren ersetzen keine Fälle. Bei sehr wenigen Fällen bleibt das Ergebnis unsicher, und Bootstrap-Intervalle sind dann meist zu schmal.',
          'Random methods do not replace cases. With very few cases the result stays uncertain, and bootstrap intervals are then usually too narrow.')),
      a(P('Der Permutationstest braucht gleiche Streuungen in den Gruppen', 'The permutation test needs equal spreads in the groups'),
        P('Statable nimmt die Welch-t-Statistik, damit der Test auch bei ungleicher Streuung hält. Gleiche Streuungen sind nicht nötig.',
          'Statable uses the Welch t statistic so that the test holds up with unequal spreads. Equal spreads are not needed.'))
    ],
    hilfe: ['zufallsverfahren-permutation'], belege: ['Hilfe:zufallsverfahren-permutation', 'Fachblatt:SPAETER-B-OPTIONEN']
  },
  {
    id: 've-boot-wahl', thema: 'verfahren', karte: 'mediation',
    stamm: P('Statable bietet für Bootstrap-Intervalle "Perzentil" und "BCa" an. Wann ist das Perzentil-Intervall die bessere Wahl?',
      'Statable offers "percentile" and "BCa" for bootstrap intervals. When is the percentile interval the better choice?'),
    antworten: [
      a(P('Wenn in über 5 % der Ziehungen genau der Schätzwert herauskommt, typisch beim Median', 'When more than 5% of the draws give exactly the estimate, as is typical for the median'),
        P('Bei vielen gleichen Ziehungen ist BCa unsicher. Dann ist das Perzentil-Intervall die bessere Wahl; Statable weist darauf hin.',
          'With many identical draws BCa is unreliable. The percentile interval is then the better choice; Statable points this out.'), true),
      a(P('Wenn die Verteilung sehr schief ist, weil BCa bei schiefen Verteilungen grundsätzlich ungenau wird', 'When the distribution is very skewed, since BCa becomes inaccurate for skewed distributions as a rule'),
        P('Das ist umgekehrt: BCa korrigiert Verzerrung und Schiefe und gilt bei schiefen Verteilungen als genauer.',
          'It is the other way round: BCa corrects bias and skewness and is regarded as more accurate for skewed distributions.')),
      a(P('Wenn sehr viele Ziehungen gewünscht sind, weil BCa nur mit wenigen Ziehungen rechnen kann', 'When very many draws are wanted, since BCa can work with only a few draws'),
        P('BCa braucht keine kleine Zahl von Ziehungen. Mehr Ziehungen verkleinern bei beiden Arten den Zufallsfehler.',
          'BCa does not need a small number of draws. More draws reduce the random error for both kinds.'))
    ],
    hilfe: ['bootstrap-intervalle'], belege: ['Hilfe:bootstrap-intervalle', 'Fachblatt:SPAETER-B-OPTIONEN']
  },
  {
    id: 've-boot-klein', thema: 'verfahren',
    stamm: P('Angenommen, unter 30 Personen gelten als kleine Stichprobe. Ein Bootstrap-Intervall beruht auf 20 Personen. Wie ist es zu lesen?', 'Suppose fewer than 30 people count as a small sample. A bootstrap interval is based on 20 people. How should it be read?'),
    antworten: [
      a(P('Vorsichtig, denn bei kleinen Stichproben sind Bootstrap-Intervalle meist zu schmal', 'Cautiously, since with small samples bootstrap intervals are usually too narrow'),
        P('Der Bootstrap zieht nur aus den vorhandenen Fällen und kann fehlende Information nicht ersetzen. Bei kleinem n nennt Statable darum das t-Intervall zum Vergleich.', 'The bootstrap draws only from the existing cases and cannot replace missing information. With small n Statable therefore names the t interval for comparison.'), true),
      a(P('Als genauer als ein t-Intervall, weil es ohne Formel und ohne Annahmen auskommt', 'As more accurate than a t interval, since it needs neither a formula nor assumptions'),
        P('Gerade bei kleinen Stichproben ist es meist enger als nötig. Es hängt an den wenigen Fällen, nicht an der Zahl der Ziehungen.',
          'Especially with small samples it is usually narrower than it should be. It depends on the few cases, not on the number of draws.')),
      a(P('Als gültig, weil sehr viele Ziehungen auch eine kleine Stichprobe ausgleichen können', 'As valid, since very many draws can make up even for a small sample'),
        P('Mehr Ziehungen verkleinern nur den Zufallsfehler des Verfahrens. Die Unsicherheit durch die geringe Fallzahl bleibt.',
          'More draws reduce only the random error of the method. The uncertainty from the small number of cases remains.'))
    ],
    hilfe: ['bootstrap-intervalle'], belege: ['Hilfe:bootstrap-intervalle', 'Fachblatt:SPAETER-B-OPTIONEN']
  },
  // ---- Bayes-Faktor ----
  {
    id: 've-bayes-lesen', thema: 'verfahren', karte: 'gruppen',
    stamm: P('Ein Bayes-Faktor BF₁₀ liegt nahe bei 1. Was sagt das?', 'A Bayes factor BF₁₀ is close to 1. What does that say?'),
    antworten: [
      a(P('Die Daten reichen für keine Seite aus; das ist etwas anderes als "kein Effekt"', 'The data suffice for neither side; this differs from "no effect"'),
        P('BF₁₀ vergleicht, wie gut H₁ und H₀ die Daten vorhersagen. Nahe 1 sagen beide sie etwa gleich gut voraus, also bleibt die Frage offen.', 'BF₁₀ compares how well H₁ and H₀ predict the data. Near 1 they predict it about equally well, so the question stays open.'), true),
      a(P('Es gibt keinen Effekt, die Nullhypothese H₀ ist damit bestätigt und H₁ widerlegt', 'There is no effect, so the null hypothesis H₀ is confirmed and H₁ refuted'),
        P('Für H₀ spricht erst ein BF₁₀ deutlich unter 1; dann steht der Kehrwert BF₀₁. Ein Wert nahe 1 spricht für keine Seite.',
          'Only a BF₁₀ clearly below 1 favours H₀; then the reciprocal BF₀₁ is shown. A value near 1 favours neither side.')),
      a(P('Die Daten sprechen stark für H₁, nur der gewählte Prior ist zu schwach eingestellt', 'The data strongly favour H₁, only the chosen prior is set too weakly'),
        P('Stark für H₁ spricht erst ein BF₁₀ weit über 1. Der Prior beeinflusst den Wert, macht aus 1 aber keinen Beleg.',
          'A BF₁₀ far above 1 is needed to favour H₁ strongly. The prior influences the value but does not turn 1 into evidence.'))
    ],
    hilfe: ['bayes-faktor'], belege: ['Hilfe:bayes-faktor']
  },
  {
    id: 've-bayes-mehrfach', thema: 'verfahren', mehrfach: true, karte: 'gruppen',
    stamm: P('Welche Aussagen zum Bayes-Faktor in Statable stimmen? Mehrere können stimmen.', 'Which statements about the Bayes factor in Statable are correct? Several may be correct.'),
    antworten: [
      a(P('Er wird unter "Einstellungen" mit "Bayes-Faktoren zeigen" eingeschaltet (Standard: aus)', 'It is switched on under "Settings" with "Show Bayes factors" (default: off)'),
        P('Danach öffnet man unter dem Ergebnis die zugeklappte Zeile "Bayes-Faktor". Alle übrigen Zahlen des Ergebnisses bleiben unverändert.',
          'Afterwards the folded line "Bayes factor" under the result is opened. All other numbers of the result stay unchanged.'), true),
      a(P('Anders als p kann er Belege für H₀ ausdrücken', 'Unlike p, it can express evidence for H₀'),
        P('Ein BF₁₀ unter 1 spricht für H₀. Ein großes p dagegen ist nur fehlende Evidenz für H₁.',
          'A BF₁₀ below 1 favours H₀. A large p, by contrast, is only missing evidence for H₁.'), true),
      a(P('Er hängt nicht davon ab, welche Effektstärken H₁ für plausibel hält', 'It does not depend on which effect sizes H₁ considers plausible'),
        P('Er hängt vom Prior ab. Der Standard ist weit verbreitet; wer einen anderen Prior braucht, muss ihn in JASP oder R einstellen.',
          'It depends on the prior. The default is widely used; anyone who needs another prior has to set it in JASP or R.')),
      a(P('Er steht auch bei der Rangkorrelation nach Spearman und Kendall zur Verfügung', 'It is also available for the rank correlation by Spearman and Kendall'),
        P('Bei Spearman und Kendall gibt es keinen Bayes-Faktor. Er steht unter anderem beim t-Test, bei der Korrelation nach Pearson, bei der Varianzanalyse und bei der linearen Regression.',
          'There is no Bayes factor for Spearman and Kendall. It is shown for the t test, the Pearson correlation, analysis of variance and linear regression, among others.'))
    ],
    hilfe: ['bayes-faktor'], belege: ['Hilfe:bayes-faktor']
  },
  // ---- Anpassungstests ----
  {
    id: 've-anp-lilliefors', thema: 'verfahren', karte: 'verteilung',
    stamm: P('Warum zeigt Statable bei der Prüfung auf Normalverteilung das p nach Lilliefors statt des p des gewöhnlichen Kolmogorov-Smirnov-Tests?',
      'Why does Statable show the p of Lilliefors for the check of normality instead of the p of the ordinary Kolmogorov-Smirnov test?'),
    antworten: [
      a(P('Mittelwert und Standardabweichung stammen aus den Daten; der gewöhnliche Test wäre zu vorsichtig', 'Mean and standard deviation come from the data; the ordinary test would be too cautious'),
        P('Lilliefors ist der Kolmogorov-Smirnov-Test mit aus den Daten geschätzten Werten und korrigiertem p. Das p aus PSPP (NPAR TESTS /K-S) zeigt Statable darum nie.',
          'Lilliefors is the Kolmogorov-Smirnov test with values estimated from the data and a corrected p. Statable therefore never shows the p from PSPP (NPAR TESTS /K-S).'), true),
      a(P('Der gewöhnliche Test findet bei geschätzten Werten zu viele Abweichungen, sein p fiele zu klein aus', 'With estimated values the ordinary test finds too many deviations, its p would be too small'),
        P('Es ist umgekehrt: Mit geschätzten Werten fällt das p des gewöhnlichen Tests zu groß aus, und Abweichungen werden übersehen.',
          'It is the other way round: with estimated values the p of the ordinary test comes out too large, and deviations are overlooked.')),
      a(P('Lilliefors ist für Kategorien gedacht, der gewöhnliche Test dagegen nur für Zahlenspalten', 'Lilliefors is meant for categories, whereas the ordinary test is for number columns only'),
        P('Lilliefors prüft Zahlenspalten auf Normalverteilung. Für Kategorien dient der χ²-Anpassungstest.',
          'Lilliefors checks number columns for normality. For categories the χ² goodness-of-fit test is used.'))
    ],
    hilfe: ['anpassungstests'], belege: ['Hilfe:anpassungstests', 'Fachblatt:SPAETER-B-OPTIONEN']
  },
  {
    id: 've-anp-mehrfach', thema: 'verfahren', mehrfach: true, karte: 'verteilung',
    stamm: P('Welche Aussagen zum χ²-Anpassungstest für Kategorien in Statable stimmen? Mehrere können stimmen.',
      'Which statements about the χ² goodness-of-fit test for categories in Statable are correct? Several may be correct.'),
    antworten: [
      a(P('Eigene erwartete Anteile müssen vor der Auswertung feststehen', 'Own expected proportions must be fixed before the analysis'),
        P('Sie kommen aus Theorie, Vorstudie oder früheren Daten, nicht aus denselben Daten. Werden sie nach einem Ergebnis geändert, gilt das p nicht mehr als Test einer vorab festgelegten Annahme.',
          'They come from theory, a pilot study or earlier data, not from the same data. If they are changed after a result, the p no longer counts as a test of an assumption fixed in advance.'), true),
      a(P('Ein nicht signifikantes Ergebnis belegt keine Gleichverteilung', 'A non-significant result does not prove a uniform distribution'),
        P('Die Daten sprechen dann nur nicht gegen die erwarteten Anteile. Ein fairer Würfel ist damit nicht bewiesen.',
          'The data then merely do not speak against the expected proportions. A fair die is not proved by that.'), true),
      a(P('Er rechnet auch für metrische Zahlenspalten mit wenigen Werten', 'It also works for metric number columns with few values'),
        P('Der Test gilt nur für Kategorien (Text, Wertebeschriftungen, Messniveau nominal oder ordinal), nie für metrische Zahlenspalten mit wenigen Werten.',
          'The test applies only to categories (text, value labels, level of measurement nominal or ordinal), never to metric number columns with few values.')),
      a(P('Voreingestellt erwartet er Anteile, die er aus den Daten selbst schätzt', 'By default it expects proportions that it estimates from the data itself'),
        P('Voreingestellt ist die Gleichverteilung: Jede Kategorie wird gleich häufig erwartet. Eigene Anteile gibt es mit "Eigene Anteile statt Gleichverteilung erwarten".',
          'The default is the uniform distribution: every category is expected equally often. Own proportions are available with "Expect own proportions instead of a uniform distribution".'))
    ],
    hilfe: ['anpassungstests'], belege: ['Hilfe:anpassungstests', 'Fachblatt:SPAETER-B-OPTIONEN']
  },
  // ---- Vielfalt ----

  {
    id: 've-viel-seltene', thema: 'verfahren', karte: 'verteilung',
    stamm: P('Eine Frage hat viele sehr seltene Antworten. Wie wirkt sich das auf Shannons H aus?', 'A question has many very rare answers. How does that affect Shannon H?'),
    antworten: [
      a(P('H steigt, ohne dass die Verteilung dabei gleichmäßiger werden muss', 'H rises without the distribution having to become more even in the process'),
        P('Viele seltene Antworten erhöhen H. Gleichmäßigkeit J und IQV hängen von k ab, der Zahl der möglichen Antworten.', 'Many rare answers raise H. Evenness J and the IQV depend on k, the number of possible answers.'), true),
      a(P('H sinkt, weil seltene Antworten kaum zur Vielfalt beitragen und H verdünnen', 'H falls, because rare answers hardly contribute to diversity and dilute H'),
        P('Jede zusätzlich besetzte Antwort erhöht H. Selten besetzte Antworten erhöhen es nur wenig, senken es aber nicht.',
          'Every additionally occupied answer raises H. Rarely occupied answers raise it only a little, but they do not lower it.')),
      a(P('H bleibt gleich, denn nur die häufigste Antwort bestimmt den Wert von H', 'H stays the same, since only the most frequent answer determines the value of H'),
        P('In H gehen alle besetzten Antworten mit ihren Anteilen ein, nicht nur die häufigste.',
          'All occupied answers enter H with their shares, not only the most frequent one.'))
    ],
    hilfe: ['vielfalt-diversitaet'], belege: ['Hilfe:vielfalt-diversitaet']
  },
  // ---- Mehrfachantworten ----
  {
    id: 've-mehr-prozent', thema: 'verfahren', karte: 'verteilung',
    stamm: P('Bei Mehrfachantworten ergeben die "Prozent der Fälle" zusammen mehr als 100 %. Woran liegt das?',
      'With multiple responses the "percent of cases" add up to more than 100%. What is the reason?'),
    antworten: [
      a(P('Jede Person kann mehrere Optionen nennen; die Prozent der Antworten ergeben 100 %', 'Each person can name several options; the percent of responses add up to 100%'),
        P('Prozent der Fälle bezieht sich auf die Personen, Prozent der Antworten auf alle Ankreuzungen. Nur die zweite Spalte summiert sich zu 100 %.',
          'Percent of cases refers to the people, percent of responses to all ticks. Only the second column adds up to 100%.'), true),
      a(P('Statable zählt Personen mit mehreren Kreuzen doppelt und überschätzt dadurch die Anteile', 'Statable counts people with several ticks twice and thereby overestimates the shares'),
        P('Es wird nichts doppelt gezählt: Jede Person zählt je Option einmal. Dass mehrere Optionen vorkommen, ist der Zweck der Fragenart.',
          'Nothing is counted twice: each person counts once per option. That several options occur is the purpose of this kind of question.')),
      a(P('Fälle ohne Ankreuzung werden als Fehler gewertet und zur Basis hinzugerechnet', 'Cases without a tick are treated as errors and added to the base'),
        P('Gültig sind Fälle mit mindestens einer Ankreuzung. Wer nichts angekreuzt hat, fehlt in der Basis, sofern man ihn nicht mit "Fälle ohne Ankreuzung mitzählen" aufnimmt.',
          'Valid are cases with at least one tick. Anyone who ticked nothing is missing from the base, unless included with "Count cases without a check".'))
    ],
    hilfe: ['frage-mehrfachantworten'], belege: ['Hilfe:frage-mehrfachantworten', 'Fachblatt:SPAETER-C-TABELLEN-FRAGEBOGEN']
  },
  {
    id: 've-mehr-test', thema: 'verfahren', karte: 'kreuz',
    stamm: P('Zwei Gruppen nennen die Optionen eines Mehrfachantworten-Sets unterschiedlich oft. Wie beschreibt Statable den Unterschied?',
      'Two groups name the options of a multiple-response set with different frequency. How does Statable describe the difference?'),
    antworten: [
      a(P('In Prozentpunkten, ohne χ²-Test, weil die Kreuze einer Person zusammenhängen', 'In percentage points, no χ² test, since ticks of one person are related'),
        P('Für Mehrfachantworten wären Verfahren für marginale Unabhängigkeit nötig (Rao-Scott oder Bootstrap), die Statable nicht anbietet. Die Kreuztabelle zeigt Spalten-Prozente je Gruppe.', 'Multiple responses would need methods for marginal independence (Rao-Scott or bootstrap), which Statable does not offer. The crosstab shows column percentages per group.'), true),
      a(P('Mit einem einzigen χ²-Test über alle Optionen des Sets, wie bei jeder Kreuztabelle', 'With a single χ² test across all options of the set, as for every crosstab'),
        P('Die Optionen derselben Person hängen zusammen. Dafür bräuchte es Rao-Scott oder Bootstrap, die Statable nicht anbietet.',
          'The options of the same person are related. That would need Rao-Scott or bootstrap, which Statable does not offer.')),
      a(P('Mit einem t-Test über die Zahl der genannten Optionen je Person in beiden Gruppen', 'With a t test on the number of options named per person in both groups'),
        P('Einen solchen Test rechnet Statable bei Mehrfachantworten nicht. Die Unterschiede zwischen Gruppen werden beschrieben.',
          'Statable runs no such test for multiple responses. The differences between groups are described.'))
    ],
    hilfe: ['frage-mehrfachantworten'], belege: ['Hilfe:frage-mehrfachantworten', 'Fachblatt:SPAETER-C-TABELLEN-FRAGEBOGEN']
  },
  // ---- Kovarianzanalyse ----
  {
    id: 've-kov-wann', thema: 'verfahren', karte: 'gruppen',
    stamm: P('Bei der Kovarianzanalyse soll das Vorwissen als Kontrollvariable herausgerechnet werden. Wann ist das heikel?',
      'In the analysis of covariance prior knowledge is to be adjusted for as a covariate. When is that problematic?'),
    antworten: [
      a(P('Wenn das Vorwissen erst nach der Maßnahme erhoben wird und selbst von ihr verändert sein kann', 'When prior knowledge is measured only after the intervention and may itself be changed by it'),
        P('Die Kovariate darf nicht von der Gruppe beeinflusst sein. Sonst rechnet die Analyse einen Teil der Wirkung der Gruppe heraus; Statable kann das nicht prüfen.',
          'The covariate must not be influenced by the group. Otherwise the analysis adjusts away part of the effect of the group; Statable cannot check this.'), true),
      a(P('Wenn das Vorwissen vor der Maßnahme erhoben wurde, denn dann fehlt der Einfluss der Gruppe', 'When prior knowledge was measured before the intervention, since then the group has no influence'),
        P('Eine Erhebung vor der Maßnahme ist der sichere Fall: Die Gruppe konnte die Kovariate noch nicht verändern.',
          'A measurement before the intervention is the safe case: the group could not yet have changed the covariate.')),
      a(P('Wenn die Gruppen verschieden groß sind, weil adjustierte Mittelwerte gleich große Gruppen brauchen', 'When the groups differ in size, since adjusted means need equally sized groups'),
        P('Verschieden große Gruppen sind kein Hindernis. Jede Gruppe braucht nur mindestens zwei Personen.',
          'Groups of different sizes are no obstacle. Each group only needs at least two people.'))
    ],
    hilfe: ['kovarianzanalyse'], belege: ['Hilfe:kovarianzanalyse', 'Fachblatt:WELLE2-PSYCHOLOGIE']
  },
  {
    id: 've-kov-steigung', thema: 'verfahren', karte: 'gruppen',
    stamm: P('In der Kovarianzanalyse ist der Test der Steigungen (Gruppe × Kovariate) signifikant. Was folgt daraus?',
      'In the analysis of covariance the test of the slopes (group × covariate) is significant. What follows?'),
    antworten: [
      a(P('Die Kovariate wirkt je Gruppe verschieden; adjustierte Mittelwerte sind nur bedingt deutbar', 'The covariate acts differently by group; adjusted means are only partly interpretable'),
        P('Das Modell setzt gleiche Steigungen in allen Gruppen voraus. Statable wechselt bei ungleichen Steigungen nicht von selbst das Modell.', 'The model assumes equal slopes in all groups. With unequal slopes Statable does not switch the model by itself.'), true),
      a(P('Die Kovariate ist überflüssig, denn sie erklärt neben der Gruppe nichts und kann entfallen', 'The covariate is superfluous, since it explains nothing besides the group and can be dropped'),
        P('Der Test der Steigungen prüft, ob die Kovariate in den Gruppen gleich wirkt, nicht, ob sie nützt. Ob sie neben der Gruppe etwas erklärt, zeigt der Test der Kovariate.',
          'The test of the slopes checks whether the covariate acts the same in the groups, not whether it is useful. Whether it explains anything besides the group is shown by the test of the covariate.')),
      a(P('Die Gruppen unterscheiden sich bei gleichem Wert der Kovariate, der Gruppeneffekt ist belegt', 'The groups differ at the same value of the covariate, the group effect is established'),
        P('Das beantwortet der Gruppentest (Typ III). Der Test der Steigungen ist davon getrennt.',
          'That is answered by the group test (type III). The test of the slopes is separate from it.'))
    ],
    hilfe: ['kovarianzanalyse'], belege: ['Hilfe:kovarianzanalyse', 'Fachblatt:WELLE2-PSYCHOLOGIE']
  },
  // ---- Hierarchische Regression ----
  {
    id: 've-hier-delta', thema: 'verfahren', karte: 'vorhersage',
    stamm: P('Bei der hierarchischen Regression erklärt ein zweiter Block zusätzlich Streuung (signifikantes ΔR²). Was heißt das?',
      'In hierarchical regression a second block explains additional variance (significant ΔR²). What does that mean?'),
    antworten: [
      a(P('Der Block erklärt über die vorigen hinaus Streuung; eine andere Reihenfolge ändert ΔR²', 'The block explains variance beyond the earlier ones; another order changes ΔR²'),
        P('ΔR² gehört zur Reihenfolge der Blöcke, die vorher festliegt und begründet sein muss. Ein signifikantes ΔR² beweist keine Ursache.', 'ΔR² belongs to the order of the blocks, which must be fixed beforehand and justified. A significant ΔR² proves no cause.'), true),
      a(P('Der Block verursacht die Veränderung der Zielgröße, sobald ΔR² signifikant ist', 'The block causes the change in the outcome as soon as ΔR² is significant'),
        P('ΔR² zeigt, wie viel Streuung ein Block zusätzlich erklärt, nicht, was die Zielgröße verursacht.',
          'ΔR² shows how much variance a block explains additionally, not what causes the outcome.')),
      a(P('Der Block erklärt die Streuung unabhängig davon, in welcher Reihenfolge er im Modell steht', 'The block explains the variance regardless of the order in which it stands in the model'),
        P('Eine andere Reihenfolge ergibt andere ΔR². Der Zuwachs hängt davon ab, was die vorigen Blöcke schon erklären.',
          'Another order gives other ΔR². The gain depends on what the earlier blocks already explain.'))
    ],
    hilfe: ['hierarchische-regression'], belege: ['Hilfe:hierarchische-regression', 'Fachblatt:WELLE2-PSYCHOLOGIE']
  },
  {
    id: 've-hier-mehrfach', thema: 'verfahren', mehrfach: true, karte: 'vorhersage',
    stamm: P('Welche Aussagen zu den Blöcken der hierarchischen Regression in Statable stimmen? Mehrere können stimmen.',
      'Which statements about the blocks of hierarchical regression in Statable are correct? Several may be correct.'),
    antworten: [
      a(P('Alle Blöcke rechnen auf denselben Fällen; wer in einem späteren Block eine Lücke hat, fehlt auch in Block 1', 'All blocks use the same cases; anyone with a gap in a later block is also missing from block 1'),
        P('Nur so sind die Blöcke vergleichbar. Statable nennt die Zahl der betroffenen Fälle.',
          'Only then are the blocks comparable. Statable names the number of cases concerned.'), true),
      a(P('Sinkt das korrigierte R², bringt der Block nach Abzug des Zufallsgewinns nichts', 'If the adjusted R² falls, the block adds nothing after subtracting the gain by chance'),
        P('Das korrigierte R² zieht den Zufallsgewinn ab. Sinkt es, ist der Zuwachs nur das, was auch zufällig hinzukäme.',
          'The adjusted R² subtracts the gain by chance. If it falls, the increase is only what would also be added by chance.'), true),
      a(P('Je mehr Kontrollgrößen in Block 1 stehen, desto besser ist die Analyse', 'The more control variables in block 1, the better the analysis'),
        P('Mehr Kontrollgrößen sind nicht automatisch besser. Ein Zwischenschritt in Block 1 nimmt einen tatsächlichen Teil des Effekts weg; ob eine Größe dorthin gehört, entscheidet die Sachlage.',
          'More control variables are not automatically better. An intermediate step in block 1 takes away a real part of the effect; whether a variable belongs there is decided by the subject matter.')),
      a(P('Die Koeffizienten (B, β, p) gehören zum Modell von Block 1 allein', 'The coefficients (B, β, p) belong to the model of block 1 alone'),
        P('Die Koeffizienten gehören zum Modell mit allen Blöcken. Je Block stehen R², korrigiertes R², ΔR² und die F-Änderung.',
          'The coefficients belong to the model with all blocks. For each block R², adjusted R², ΔR² and the F change are shown.'))
    ],
    hilfe: ['hierarchische-regression'], belege: ['Hilfe:hierarchische-regression', 'Fachblatt:WELLE2-PSYCHOLOGIE']
  },
  // ---- Reliable Change Index ----
  {
    id: 've-rci-bedeutung', thema: 'verfahren', karte: 'praepost',
    stamm: P('Der Reliable Change Index (RCI) einer Person liegt über der Schwelle. Was zeigt das?', 'The reliable change index (RCI) of a person lies above the threshold. What does that show?'),
    antworten: [
      a(P('Die Veränderung liegt über dem Messfehler; ob sie bedeutsam ist, sagt der RCI nicht', 'The change lies above the measurement error; whether it matters is not shown by the RCI'),
        P('Verlässlich heißt nur: über dem Messfehler des Tests. Klinische Signifikanz und einen Cut-off rechnet Statable nicht.', 'Reliable only means: above the measurement error of the test. Statable computes neither clinical significance nor a cut-off.'), true),
      a(P('Die Maßnahme hat bei dieser Person gewirkt und die Veränderung ist ihr Verdienst', 'The intervention worked for this person and the change is its merit'),
        P('Der RCI beurteilt eine einzelne Person, nicht eine Maßnahme. Dafür braucht es eine Vergleichsgruppe; extreme Vorher-Werte verändern sich auch durch Regression zur Mitte.',
          'The RCI judges a single person, not an intervention. That needs a comparison group; extreme before values also change through regression to the mean.')),
      a(P('Die Person gilt damit als geheilt, weil ihr Wert die klinische Schwelle überschreitet', 'The person is thereby regarded as cured, because the value exceeds the clinical threshold'),
        P('Ob eine Veränderung bedeutsam ist, ist eine andere Frage. Der RCI sagt nur, dass sie größer ist als der Messfehler.',
          'Whether a change is meaningful is another question. The RCI only says that it is larger than the measurement error.'))
    ],
    hilfe: ['reliable-change-index'], belege: ['Hilfe:reliable-change-index', 'Fachblatt:WELLE2-PSYCHOLOGIE']
  },
  {
    id: 've-rci-reliabilitaet', thema: 'verfahren', karte: 'praepost',
    stamm: P('Für den Reliable Change Index verlangt Statable eine Reliabilität als Pflichtangabe. Welche ist die eigentliche Wahl?',
      'For the reliable change index Statable requires a reliability as mandatory input. Which one is the proper choice?'),
    antworten: [
      a(P('Die Retest-Reliabilität, also die Korrelation zweier Messungen bei unveränderten Personen', 'The retest reliability, that is the correlation of two measurements in unchanged people'),
        P('Die Retest-Reliabilität ist die Korrelation zweier Messungen bei unveränderten Personen. Alpha misst die innere Konsistenz, nicht die Stabilität über die Zeit.', 'The retest reliability is the correlation of two measurements in unchanged people. Alpha measures internal consistency, not stability over time.'), true),
      a(P('Cronbachs Alpha, weil es die Stabilität über die Zeit misst und nur ein Wert nötig ist', 'Cronbach alpha, because it measures stability over time and only one value is needed'),
        P('Alpha misst die innere Konsistenz einer Skala, nicht die Stabilität. Es ist nur der Ersatz, wenn keine Retest-Reliabilität vorliegt.',
          'Alpha measures the internal consistency of a scale, not stability. It is only the substitute when no retest reliability is available.')),
      a(P('Die Übereinstimmung zweier Beurteilender (Kappa), weil sie den Messfehler eines Tests abbildet', 'The agreement of two raters (kappa), because it reflects the measurement error of a test'),
        P('Kappa beschreibt die Übereinstimmung von Urteilen, nicht den Messfehler eines Tests zwischen zwei Zeitpunkten.',
          'Kappa describes the agreement of ratings, not the measurement error of a test between two points in time.'))
    ],
    hilfe: ['reliable-change-index'], belege: ['Hilfe:reliable-change-index', 'Fachblatt:WELLE2-PSYCHOLOGIE']
  },
  {
    id: 've-viel-mehrfach', thema: 'verfahren', mehrfach: true, karte: 'verteilung',
    stamm: P('Welche Aussagen zu Vielfaltszahlen (IQV, Shannon, Gini-Simpson) in Statable stimmen? Mehrere können stimmen.', 'Which statements about diversity measures (IQV, Shannon, Gini-Simpson) in Statable are correct? Several may be correct.'),
    antworten: [
      a(P('Der IQV reicht von 0 (alle in einer Antwort) bis 1 (gleichmäßig verteilt)', 'The IQV runs from 0 (all in one answer) to 1 (evenly distributed)'),
        P('Wählen fast alle dieselbe Antwort, liegt er nahe 0. Bei vier gleich häufigen Antworten ist er 1.', 'If almost everyone chooses the same answer, it is near 0. With four equally frequent answers it is 1.'), true),
      a(P('J und der IQV hängen von k ab, der Zahl der möglichen Antworten', 'J and the IQV depend on k, the number of possible answers'),
        P('k kommt aus den Wertebeschriftungen, sonst aus den besetzten Antworten; "Nur besetzte Kategorien zählen" ändert es. Der Satz nennt, welches k gilt.', 'k comes from the value labels, otherwise from the occupied answers; "Count only occupied categories" changes it. The sentence states which k applies.'), true),
      a(P('Zu den Vielfaltszahlen rechnet Statable auch einen Test und ein Konfidenzintervall', 'Statable also computes a test and a confidence interval for the diversity measures'),
        P('Es gibt keinen Test und kein Konfidenzintervall dazu. Die Zahlen beschreiben die Verteilung.', 'There is no test and no confidence interval. The numbers describe the distribution.')),
      a(P('Die Reihenfolge der Kategorien ändert den IQV, weil benachbarte Kategorien ähnlich sind', 'The order of the categories changes the IQV because neighbouring categories are similar'),
        P('Die Reihenfolge der Kategorien spielt keine Rolle. Die Vielfalt hängt nur von den Anteilen ab.', 'The order of the categories plays no role. Diversity depends only on the shares.'))
    ],
    hilfe: ['vielfalt-diversitaet'], belege: ['Hilfe:vielfalt-diversitaet']
  }
];
export const FAELLE: ThemaModul['FAELLE'] = {};
