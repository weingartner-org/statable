/**
 * Begriffsfragen der Psychologie `psy2-be-…` und zu offenen Antworten `psy2-oa-…` (Stufe 6.3 „nutzen“, 09.11.2026): Deuten ohne neue Zahlen, in psychologischen Zusammenhängen
 * (Gedächtnis, Angst, Wohlbefinden, Therapie, Persönlichkeit). Keine Tabellen und keine gerechneten Zahlen; Zahlen im Text sind nur Schranken des Fachs (0,05, 95 Prozent, 1,96).
 * Die Fehldeutungen kommen aus Liste B (docs/fachblaetter/BELEGE-NUTZEN.json, `nutzen-b-…`): p-Wert als Wahrscheinlichkeit der Nullhypothese, Konfidenzintervall, Signifikanz und Bedeutsamkeit,
 * Korrelation und Ursache, Wechselwirkung, Regression zur Mitte, Basisrate, mehrfaches Testen.
 */
import { P } from '../i18n/laufzeit';
import type { Frage } from './fragen';
import { a, THEMA } from './fragen-psychologie-2-bau';

const q = (id: string, stamm: Frage['stamm'], antworten: Frage['antworten'], hilfe: string[], belege: string[]): Frage => ({ id, thema: THEMA, stamm, antworten, hilfe, belege });

export const FRAGEN_BEGRIFFE: Frage[] = [
  // ---------------------------------------------------------------- t-Test, Effektstärke
  q('psy2-be-t-abh',
    P('In einer Gedächtnisstudie lösen dieselben Personen vor und nach einem Training einen Merktest. Welcher Test passt für den Vergleich der Mittelwerte?', 'In a memory study the same people solve a recall test before and after a training. Which test fits the comparison of the means?'),
    [
      a(P('Der t-Test für unabhängige Gruppen, weil es zwei Messzeitpunkte gibt.', 'The t test for independent groups, because there are two measurement points.'),
        P('Unabhängige Gruppen bestehen aus verschiedenen Personen. Hier gehört jeder Wert vorher zu einem Wert nachher derselben Person, die Messungen hängen zusammen.', 'Independent groups consist of different people. Here each value before belongs to a value after of the same person, the measurements are related.')),
      a(P('Der gepaarte t-Test, denn die Messungen gehören zur selben Person.', 'The paired t test, because the measurements belong to the same person.'),
        P('Der gepaarte Test bildet je Person die Differenz nachher minus vorher und prüft, ob deren Mittelwert von null abweicht.', 'The paired test forms for each person the difference after minus before and checks whether its mean differs from zero.'), true),
      a(P('Der Chi-Quadrat-Test, weil Training ja oder nein eine Kategorie ist.', 'The chi-square test, because training yes or no is a category.'),
        P('Der Merktest liefert Punktzahlen und damit ein Zahlenmerkmal. Der Chi-Quadrat-Test wertet Häufigkeiten von Kategorien aus, nicht Mittelwerte von Punkten.', 'The recall test yields scores and thus a numeric variable. The chi-square test evaluates frequencies of categories, not means of scores.')),
      a(P('Die Korrelation von vorher und nachher, weil sie die Veränderung misst.', 'The correlation of before and after, because it measures the change.'),
        P('Die Korrelation zeigt, ob Personen ihre Rangordnung behalten, nicht ob sich der Mittelwert ändert. Bei allen Personen +5 Punkte wäre sie 1 und die Veränderung groß.', 'The correlation shows whether people keep their rank order, not whether the mean changes. With +5 points for everyone it would be 1 and the change large.'))
    ], ['gepaarte-messung', 'gepoolter-t-test'], ['Hilfe:gepaarte-messung']),
  q('psy2-be-t-d',
    P('Zwei Gruppen füllen eine Wohlbefindensskala aus. Der Unterschied der Mittelwerte wird als Cohens d angegeben. Wodurch wird die Differenz geteilt?', 'Two groups fill in a well-being scale. The difference of the means is reported as Cohen d. By what is the difference divided?'),
    [
      a(P('Durch den Standardfehler der Differenz, wie bei der t-Statistik.', 'By the standard error of the difference, as with the t statistic.'),
        P('Das wäre t. Der Standardfehler schrumpft mit der Zahl der Personen, Cohens d soll aber unabhängig von der Gruppengröße die Größe des Unterschieds zeigen.', 'That would be t. The standard error shrinks with the number of people, but Cohen d is meant to show the size of the difference independently of group size.')),
      a(P('Durch die gemeinsame (gepoolte) Standardabweichung beider Gruppen.', 'By the common (pooled) standard deviation of both groups.'),
        P('Cohens d drückt den Unterschied in Standardabweichungen aus. Dadurch ist er unabhängig von der Skala und lässt sich über Studien vergleichen.', 'Cohen d expresses the difference in standard deviations. This makes it independent of the scale and allows comparison across studies.'), true),
      a(P('Durch die Wurzel der Gesamtzahl der Personen.', 'By the square root of the total number of people.'),
        P('Die Wurzel aus n steht in der Formel des Standardfehlers. Cohens d enthält sie nicht, sonst würde d bei größeren Stichproben wachsen.', 'The root of n is in the formula of the standard error. Cohen d does not contain it, otherwise d would grow with larger samples.')),
      a(P('Durch den größeren der beiden Mittelwerte, damit ein Anteil entsteht.', 'By the larger of the two means, so that a proportion results.'),
        P('Das ergäbe einen Anteil am Mittelwert, der von der Lage der Skala abhängt. Cohens d bezieht sich auf die Streuung, nicht auf die Höhe der Werte.', 'That would give a proportion of the mean, which depends on the position of the scale. Cohen d refers to the spread, not to the level of the values.'))
    ], ['cohens-d', 'effektstaerke'], ['Cohen 1988']),
  q('psy2-be-t-welch',
    P('Eine Angstskala wird bei Patientinnen und bei Kontrollpersonen erhoben. Die Streuung ist bei den Patientinnen viel größer, die Gruppen sind verschieden groß. Welche Variante des t-Tests passt?', 'An anxiety scale is collected from patients and from control persons. The spread is much larger among the patients, the groups differ in size. Which variant of the t test fits?'),
    [
      a(P('Der gepoolte t-Test, weil verschieden große Gruppen so am besten ausgeglichen werden.', 'The pooled t test, because groups of different size are balanced best this way.'),
        P('Der gepoolte Test setzt gleiche Streuungen voraus. Bei ungleichen Streuungen und ungleichen Gruppengrößen sind seine p-Werte schief, mal zu klein, mal zu groß.', 'The pooled test assumes equal spreads. With unequal spreads and unequal group sizes its p values are skewed, sometimes too small, sometimes too large.')),
      a(P('Der Welch-Test mit eigener Streuung je Gruppe und angepassten Freiheitsgraden.', 'The Welch test, with its own spread per group and adjusted degrees of freedom.'),
        P('Der Welch-Test verlangt keine gleichen Streuungen und verliert bei gleichen Streuungen kaum etwas; darum gilt er als Standard.', 'The Welch test does not require equal spreads and loses hardly anything when spreads are equal; so it counts as the default.'), true),
      a(P('Der gepaarte t-Test, weil Patientinnen und Kontrollpersonen aufeinander bezogen sind.', 'The paired t test, because patients and control persons are related to each other.'),
        P('Gepaart wird nur, wenn dieselben Personen zweimal gemessen oder Paare gebildet werden. Hier sind es zwei getrennte Gruppen, also unabhängige Stichproben.', 'Pairing is used only if the same people are measured twice or pairs are formed. Here there are two separate groups, that is independent samples.')),
      a(P('Kein t-Test, denn bei ungleicher Streuung ist nur noch eine Korrelation erlaubt.', 'No t test, because with unequal spread only a correlation is allowed.'),
        P('Ungleiche Streuung verbietet keinen Mittelwertvergleich. Sie verlangt nur eine passende Variante; die Korrelation beantwortet eine andere Frage.', 'Unequal spread does not forbid a comparison of means. It only requires a suitable variant; the correlation answers a different question.'))
    ], ['welch-test', 'gepoolter-t-test'], ['Hilfe:welch-test']),

  // ---------------------------------------------------------------- Varianzanalyse
  q('psy2-be-a-post',
    P('Drei Therapieformen gegen Prüfungsangst werden verglichen, die Varianzanalyse ist signifikant. Was ist damit gezeigt?', 'Three forms of therapy for test anxiety are compared, the analysis of variance is significant. What is shown by this?'),
    [
      a(P('Jede Therapieform unterscheidet sich von jeder anderen.', 'Each form of therapy differs from every other.'),
        P('Der F-Test prüft nur, ob alle Mittelwerte gleich sein können. Dass sich jedes Paar unterscheidet, folgt daraus nicht; zwei Formen können gleich gut wirken.', 'The F test only checks whether all means can be equal. That every pair differs does not follow from it; two forms can work equally well.')),
      a(P('Die Therapie mit dem höchsten Mittelwert ist die beste, weitere Prüfungen entfallen.', 'The therapy with the highest mean is the best, further tests are dropped.'),
        P('Ein höherer Mittelwert in der Stichprobe ist noch kein belegter Unterschied. Ob sich die Spitzenform von den anderen abhebt, zeigen erst die Paarvergleiche.', 'A higher mean in the sample is not yet a documented difference. Whether the top form stands out from the others is shown only by the pairwise comparisons.')),
      a(P('Nicht alle Mittelwerte sind gleich; welche, zeigen Paarvergleiche.', 'Not all means are equal; pairwise comparisons show which.'),
        P('Die Varianzanalyse beantwortet die Gesamtfrage. Für einzelne Paare folgt ein Post-hoc-Test wie Tukey, der das Risiko über alle Paare begrenzt.', 'The analysis of variance answers the overall question. For single pairs a post hoc test such as Tukey follows, which limits the risk across all pairs.'), true),
      a(P('Alle drei Therapien wirken, denn die Nullhypothese ist widerlegt.', 'All three therapies work, because the null hypothesis is refuted.'),
        P('Verworfen wird die Annahme gleicher Mittelwerte. Ob jede Therapie wirkt, zeigt erst der Vergleich mit einer Kontrollgruppe, nicht die Gleichheitsprüfung.', 'What is rejected is the assumption of equal means. Whether each therapy works is shown only by a comparison with a control group, not by the test of equality.'))
    ], ['post-hoc', 'paarvergleich'], ['Hilfe:post-hoc']),
  q('psy2-be-a-mehrfach',
    P('Warum rechnet man bei drei Gruppen statt dreier t-Tests eine Varianzanalyse mit Post-hoc-Test?', 'Why does one run an analysis of variance with a post hoc test for three groups instead of three t tests?'),
    [
      a(P('Der t-Test verträgt nur zwei Gruppen von gleicher Größe, mehr Gruppen sind nicht erlaubt.', 'The t test tolerates only two groups of equal size, more groups are not allowed.'),
        P('Der t-Test kommt mit ungleich großen Gruppen zurecht, auch in der Welch-Form. Das Problem der drei Tests liegt an anderer Stelle: der Fehlerrate.', 'The t test copes with groups of unequal size, also in its Welch form. The problem of three tests lies elsewhere: the error rate.')),
      a(P('Drei t-Tests liefern für drei Gruppen keinen p-Wert, weil jeder Test nur ein Paar kennt.', 'Three t tests yield no p value for three groups, because each test knows only a single pair.'),
        P('Jeder t-Test liefert einen p-Wert. Das Vorgehen ist nicht unmöglich, sondern ungenau: Die Wahrscheinlichkeit für einen Zufallstreffer wächst mit der Zahl der Tests.', 'Each t test yields a p value. The procedure is not impossible but imprecise: the probability of a chance hit grows with the number of tests.')),
      a(P('Jeder Test erhöht die Chance auf falsch positive Befunde; Post-hoc-Tests begrenzen sie.', 'Each test raises the chance of false positive findings; post hoc tests limit it.'),
        P('Bei einem Niveau von 5 Prozent je Test ist die Chance auf mindestens einen Zufallstreffer bei drei Tests schon deutlich höher. Post-hoc-Tests rechnen das ein.', 'At a level of 5 percent per test the chance of at least one chance hit is already clearly higher with three tests. Post hoc tests take this into account.'), true),
      a(P('Drei t-Tests haben weniger Teststärke als ein F-Test, deshalb ist dieser vorzuziehen.', 'Three t tests have less power than an F test, so the latter is preferable.'),
        P('Die Teststärke ist nicht der Grund. Die Fehlerrate ist es: Die Wahl des Verfahrens richtet sich danach, wie viele Vergleiche gemacht und wie sie korrigiert werden.', 'Power is not the reason. The error rate is: the choice of method depends on how many comparisons are made and how they are corrected.'))
    ], ['post-hoc', 'mehrfaches-testen'], ['Hilfe:mehrfaches-testen']),

  // ---------------------------------------------------------------- kleine Studien
  q('psy2-be-k-power',
    P('Eine Gedächtnisstudie mit zwölf Personen je Gruppe findet einen signifikanten, großen Effekt. Wie ist der Befund einzuordnen?', 'A memory study with twelve people per group finds a significant, large effect. How is the finding to be classified?'),
    [
      a(P('Große Effekte in kleinen Studien sind besonders verlässlich, weil sie sich trotz weniger Personen zeigen.', 'Large effects in small studies are particularly dependable, because they show up despite few people.'),
        P('Das Gegenteil trifft zu: Bei geringer Teststärke werden vor allem überschätzte Effekte signifikant. Der große Wert ist darum eher ein Warnzeichen als ein Beleg.', 'The opposite applies: with low power mainly overestimated effects become significant. The large value is therefore a warning sign rather than evidence.')),
      a(P('Bei kleinen Gruppen ist die Teststärke niedrig; signifikante Befunde überschätzen den Effekt häufig.', 'With small groups power is low; significant findings often overestimate the effect.'),
        P('Wer nur Signifikantes berichtet, sieht bei kleiner Stichprobe die Ausreißer nach oben (Fluch des Gewinners). Eine Wiederholung zeigt, wie viel bleibt.', 'Whoever reports only significant results sees the upward outliers with a small sample (winner curse). A replication shows how much remains.'), true),
      a(P('Der Befund ist verlässlich, denn Signifikanz gilt unabhängig von der Gruppengröße.', 'The finding is dependable, because significance applies independently of group size.'),
        P('Ob ein Ergebnis signifikant wird, hängt stark von der Gruppengröße ab. Dass es bei kleinen Gruppen gelang, sagt nichts über die Größe oder Wiederholbarkeit des Effekts.', 'Whether a result becomes significant depends strongly on group size. That it succeeded with small groups says nothing about the size or replicability of the effect.')),
      a(P('Kleine Studien sind genauer, weil die Bedingungen besser kontrolliert werden.', 'Small studies are more precise, because the conditions are controlled better.'),
        P('Die Genauigkeit einer Schätzung wächst mit der Zahl der Personen. Eine gute Kontrolle verbessert eine Studie, gleicht aber den größeren Zufallsfehler kleiner Gruppen nicht aus.', 'The precision of an estimate grows with the number of people. Good control improves a study but does not make up for the larger random error of small groups.'))
    ], ['teststaerke', 'effekt-ueberschaetzung'], ['Hilfe:effekt-ueberschaetzung']),
  q('psy2-be-k-replik',
    P('Ein Experiment ergibt ein p knapp unter 0,05. Wie wahrscheinlich ist es, dass eine genaue Wiederholung ebenfalls signifikant ausfällt?', 'An experiment yields a p just below 0.05. How probable is it that an exact replication is also significant?'),
    [
      a(P('Bei 95 Prozent, denn 1 minus p gibt die Wahrscheinlichkeit an, dass sich der Befund wiederholen lässt.', 'At 95 percent, because 1 minus p gives the probability that the finding will be repeated in a new sample.'),
        P('1 minus p ist keine Wiederholungswahrscheinlichkeit. Sie hängt vom wahren Effekt und der Teststärke ab, und die ist bei einem p knapp unter 0,05 weit niedriger.', '1 minus p is not a replication probability. It depends on the true effect and the power, and that is far lower with a p just below 0.05.')),
      a(P('Bei 5 Prozent, denn das ist die Irrtumswahrscheinlichkeit des Tests bei jeder Wiederholung.', 'At 5 percent, because that is the error probability of the test at every repetition.'),
        P('Die 5 Prozent sind die Rate falsch positiver Ergebnisse, wenn es keinen Effekt gibt. Besteht ein Effekt, ist die Chance auf ein zweites signifikantes Ergebnis deutlich höher.', 'The 5 percent is the rate of false positive results if there is no effect. If an effect exists, the chance of a second significant result is clearly higher.')),
      a(P('Das sagt p nicht; die Chance hängt an Effektgröße und Teststärke und liegt weit unter 95 Prozent.', 'p does not say that; the chance depends on effect size and power and lies far below 95 percent.'),
        P('Der p-Wert beschreibt die Daten unter der Nullhypothese, nicht die Zukunft. Ein Befund an der Grenze wiederholt sich etwa in der Hälfte der Fälle.', 'The p value describes the data under the null hypothesis, not the future. A finding at the border replicates in about half of the cases.'), true),
      a(P('Sie ist gleich der Teststärke, die bei jeder Studie auf 80 Prozent festliegt.', 'It equals the power, which is fixed at 80 percent in every study.'),
        P('Die Teststärke ist nicht fest. Sie hängt von Effektgröße, Fallzahl und Niveau ab; 80 Prozent ist ein Planungsziel, kein Naturgesetz.', 'Power is not fixed. It depends on effect size, sample size and level; 80 percent is a planning target, not a law of nature.'))
    ], ['p-wert', 'teststaerke'], ['Haller und Krauss 2002']),
  q('psy2-be-k-basis',
    P('In einem Forschungsgebiet sind nur wenige der geprüften Hypothesen wahr. Was folgt für die signifikanten Befunde?', 'In a field of research only few of the tested hypotheses are true. What follows for the significant findings?'),
    [
      a(P('Höchstens 5 Prozent der signifikanten Befunde sind falsch positiv, weil das Niveau 5 Prozent beträgt.', 'At most 5 percent of the significant findings are false positive, because the level is 5 percent.'),
        P('Das Niveau gilt für Tests an wahren Nullhypothesen. Welcher Anteil der signifikanten Befunde falsch ist, hängt auch davon ab, wie viele Hypothesen überhaupt wahr sind.', 'The level applies to tests of true null hypotheses. What share of the significant findings is false also depends on how many hypotheses are true at all.')),
      a(P('Signifikante Befunde sind echt, weil die Nullhypothese mit weniger als 5 Prozent Wahrscheinlichkeit gilt.', 'Significant findings are real, because the null hypothesis holds with less than 5 percent probability.'),
        P('Das Niveau ist keine Wahrscheinlichkeit der Nullhypothese. Gelten nur wenige Hypothesen, überwiegen unter den signifikanten Ergebnissen die Zufallstreffer.', 'The level is not a probability of the null hypothesis. If only few hypotheses hold, chance hits predominate among the significant results.')),
      a(P('Ein spürbarer Teil der signifikanten Befunde ist falsch positiv, auch bei 5 Prozent Niveau.', 'A noticeable part of the significant findings is false positive, even at the 5 percent level.'),
        P('Wie bei einem seltenen Merkmal in der Medizin führen auch viele Tests auf selten wahre Hypothesen zu vielen Fehlalarmen.', 'As with a rare condition in medicine, many tests of rarely true hypotheses also lead to many false alarms.'), true),
      a(P('Die Basisrate ändert die Fehlerrate nicht, sie gilt nur für medizinische Tests.', 'The base rate does not change the error rate, it applies only to medical tests.'),
        P('Die Rechnung gilt für jedes Verfahren, das zwischen wahr und falsch trennt. Ein signifikantes Ergebnis ist ein positiver Test auf eine Hypothese.', 'The calculation applies to every procedure that separates true from false. A significant result is a positive test for a hypothesis.'))
    ], ['falsch-positive-befunde', 'basisrate'], ['Ioannidis 2005']),

  // ---------------------------------------------------------------- mehrfaches Testen
  q('psy2-be-m-skalen',
    P('Ein Fragebogen hat sechs Skalen; in jeder wird der Gruppenunterschied geprüft, nur eine ist signifikant und wird berichtet. Was ist das Problem?', 'A questionnaire has six scales; in each the group difference is tested, only one is significant and is reported. What is the problem?'),
    [
      a(P('Sechs Tests erhöhen die Chance auf einen Zufallstreffer; jeder Test gehört in den Bericht.', 'Six tests raise the chance of a chance hit; every test belongs in the report.'),
        P('Bei sechs Tests an wahren Nullhypothesen ist ein Treffer unter 5 Prozent schon in etwa einem Viertel der Fälle zu erwarten. Wer nur den Treffer meldet, verbirgt diese Zahl.', 'With six tests of true null hypotheses a hit below 5 percent is to be expected in about a quarter of cases. Whoever reports only the hit hides this number.'), true),
      a(P('Es gibt kein Problem, denn jedes einzelne p unter 0,05 ist ein gültiger Befund der Studie.', 'There is no problem, because every single p below 0.05 is a valid finding of the study.'),
        P('Als Einzeltest ist es gültig, aber die Auswahl macht es ungültig. Aus sechs Tests wird der passende herausgesucht, und das verändert die Bedeutung von p.', 'As a single test it is valid, but the selection spoils it. The fitting one is picked out of six tests, and that changes the meaning of p.')),
      a(P('Das Problem betrifft nur die Gruppengröße, nicht die Zahl der Tests.', 'The problem concerns only the group size, not the number of tests.'),
        P('Die Gruppengröße bestimmt die Teststärke. Hier geht es um die Zahl der Tests und die Auswahl nach dem Ergebnis, was für jede Gruppengröße gilt.', 'Group size determines power. Here the issue is the number of tests and the selection by result, which applies at any group size.')),
      a(P('Das Problem verschwindet, wenn man den Befund als explorativ bezeichnet.', 'The problem disappears if the finding is labelled exploratory.'),
        P('Ein Etikett ändert die Fehlerrate nicht. Explorative Befunde sind erlaubt, brauchen aber die ehrliche Angabe aller Tests und gelten erst nach einer Wiederholung als belegt.', 'A label does not change the error rate. Exploratory findings are allowed but need the honest reporting of all tests and count as documented only after a replication.'))
    ], ['mehrfaches-testen', 'falsch-positive-befunde'], ['Hilfe:mehrfaches-testen']),
  q('psy2-be-m-stopp',
    P('Ein Team prüft nach jeder zehnten Person, ob p unter 0,05 liegt, und beendet die Erhebung, sobald das der Fall ist. Was bewirkt dieses Vorgehen?', 'A team checks after every tenth person whether p lies below 0.05 and ends the data collection as soon as that is the case. What does this procedure do?'),
    [
      a(P('Es spart Personen und lässt die Fehlerrate unverändert, solange am Ende ein p unter 0,05 steht.', 'It saves people and leaves the error rate unchanged as long as a p below 0.05 stands at the end.'),
        P('Bei wiederholtem Prüfen mit Abbruch zählt jedes Zwischenergebnis als weiterer Test. Das Niveau von 5 Prozent gilt nur für eine einzige Prüfung bei festgelegter Fallzahl.', 'With repeated checking and stopping each interim result counts as a further test. The level of 5 percent applies only to a single test at a fixed sample size.')),
      a(P('Es treibt die Rate falsch positiver Befunde weit über 5 Prozent; Fallzahl vorab festlegen.', 'It drives the false positive rate far above 5 percent; fix the sample size in advance.'),
        P('Das Prüfen bis zum Erfolg nutzt jede zufällige Schwankung aus. Fallzahl und Abbruchregel gehören vor die Erhebung.', 'Checking until success exploits every random fluctuation. Sample size and stopping rule belong before data collection.'), true),
      a(P('Es steigert die Teststärke, ohne die Fehlerrate zu verändern, weil mehr Daten einfließen.', 'It raises power without changing the error rate, because more data flow in.'),
        P('Mit mehr Daten steigt die Teststärke, aber hier wird nach dem Ergebnis entschieden. Diese Entscheidung treibt die Fehlerrate nach oben.', 'With more data power rises, but here the decision is made by the result. This decision drives the error rate up.')),
      a(P('Es ist zulässig, wenn die Personen zufällig ausgewählt wurden.', 'It is permissible if the people were selected at random.'),
        P('Die Zufallsauswahl schützt vor Verzerrung der Stichprobe, nicht vor der Wirkung des Abbruchs nach dem Ergebnis. Beides sind verschiedene Fehlerquellen.', 'Random selection protects against bias of the sample, not against the effect of stopping by the result. The two are different sources of error.'))
    ], ['falsch-positive-befunde', 'mehrfaches-testen'], ['Simmons et al. 2011']),
  q('psy2-be-m-vorreg',
    P('Was leistet die Vorregistrierung einer psychologischen Studie?', 'What does the preregistration of a psychological study achieve?'),
    [
      a(P('Sie sorgt dafür, dass das Ergebnis signifikant ausfällt, weil die Hypothese vorab geprüft wurde.', 'It ensures that the result turns out significant, because the hypothesis was examined in advance.'),
        P('Die Vorregistrierung verändert die Daten nicht. Sie ändert nur, was man beurteilen kann: Ein nicht signifikantes Ergebnis bleibt ein solches und wird trotzdem berichtet.', 'Preregistration does not change the data. It only changes what can be judged: a non-significant result stays one and is reported all the same.')),
      a(P('Sie legt Hypothesen, Fallzahl und Auswertung vorab fest und macht Wahlfreiheit sichtbar.', 'It fixes hypotheses, sample size and analysis in advance and makes freedom of choice visible.'),
        P('Wer vorher festlegt, kann nachträglich weniger an Tests, Gruppen und Ausschlüssen drehen. Abweichungen sind erlaubt, werden aber als solche benannt.', 'Whoever fixes things beforehand can tweak tests, groups and exclusions less afterwards. Deviations are allowed but are named as such.'), true),
      a(P('Sie ersetzt die Planung der Stichprobe und macht die Prüfung durch Fachleute überflüssig.', 'It replaces the planning of the sample and makes review by experts superfluous.'),
        P('Die Vorregistrierung enthält gerade die Stichprobenplanung als Teil. Eine fachliche Prüfung bleibt nötig, denn ein Plan allein sagt nichts über seine Qualität.', 'The preregistration contains the sample planning as a part. Expert review remains necessary, because a plan alone says nothing about its quality.')),
      a(P('Sie verbietet explorative Auswertungen vollständig und ohne Ausnahme, auch wenn sie benannt sind.', 'It forbids exploratory analyses completely and without exception, even if they are labelled.'),
        P('Explorative Auswertungen bleiben erlaubt und wertvoll. Sie werden nur getrennt von den geplanten Prüfungen berichtet, damit klar ist, was vorab festlag.', 'Exploratory analyses remain allowed and valuable. They are only reported separately from the planned tests so that it is clear what was fixed beforehand.'))
    ], ['falsch-positive-befunde', 'mehrfaches-testen'], ['Nosek et al. 2018']),

  // ---------------------------------------------------------------- RCI und Veränderung
  q('psy2-be-r-rci',
    P('Der Angstwert einer Person sinkt nach einer Therapie. Was prüft der Reliable-Change-Index (RCI)?', 'The anxiety score of a person falls after a therapy. What does the reliable change index (RCI) check?'),
    [
      a(P('Er prüft, ob die Person nach der Therapie unter dem Grenzwert der Störung liegt, also nicht mehr betroffen ist.', 'It checks whether the person lies below the cut-off of the disorder after therapy, that is whether she is no longer affected.'),
        P('Das wäre die klinische Bedeutsamkeit, ein eigenes Kriterium. Der RCI beantwortet nur, ob die Veränderung größer ist als der Messfehler erwarten lässt.', 'That would be clinical significance, a criterion of its own. The RCI only answers whether the change is larger than the measurement error leads one to expect.')),
      a(P('Er setzt die Veränderung ins Verhältnis zum Messfehler; ein Betrag über 1,96 gilt als zuverlässig.', 'It relates the change to the measurement error; an absolute value above 1.96 counts as reliable.'),
        P('Der Nenner des RCI ist der Standardfehler der Differenz aus Streuung und Reliabilität. Ein Betrag über 1,96 entspricht dem Niveau von 5 Prozent.', 'The denominator of the RCI is the standard error of the difference from spread and reliability. An absolute value above 1.96 means the 5 percent level.'), true),
      a(P('Er vergleicht den Mittelwert der Therapiegruppe mit dem der Kontrollgruppe.', 'It compares the mean of the therapy group with that of the control group.'),
        P('Der RCI gilt für eine einzelne Person und braucht keine Kontrollgruppe. Der Gruppenvergleich ist ein t-Test oder eine Kovarianzanalyse.', 'The RCI applies to a single person and needs no control group. The group comparison is a t test or an analysis of covariance.')),
      a(P('Er gibt die Wahrscheinlichkeit an, dass die Therapie bei der Person gewirkt hat.', 'It gives the probability that the therapy worked for the person.'),
        P('Der RCI sagt nur, ob die Veränderung über dem Messfehler liegt, nicht, warum sie eingetreten ist. Eine Wirkung der Therapie folgt daraus nicht.', 'The RCI only says whether the change lies above the measurement error, not why it occurred. An effect of the therapy does not follow from it.'))
    ], ['reliable-change-index', 'reliabilitaet'], ['Jacobson und Truax 1991']),
  q('psy2-be-r-mitte',
    P('Personen mit besonders hohen Angstwerten bei der ersten Messung erhalten ein Training; bei der Nachmessung sinken ihre Werte im Mittel. Was folgt?', 'People with especially high anxiety scores at the first measurement receive a training; at the follow-up their scores fall on average. What follows?'),
    [
      a(P('Das Training hat die Angst gesenkt, der Rückgang belegt die Wirkung des Trainings eindeutig und zuverlässig.', 'The training lowered anxiety, the decrease clearly and dependably documents the effect of the training.'),
        P('Wer wegen extremer Werte ausgewählt wird, liegt bei der zweiten Messung ohnehin im Mittel näher am Durchschnitt. Ohne Vergleich mit einer Kontrollgruppe ist der Rückgang nicht der Wirkung zuzuschreiben.', 'Whoever is selected because of extreme values lies on average closer to the average at the second measurement anyway. Without comparison with a control group the decrease cannot be ascribed to the effect.')),
      a(P('Die erste Messung war fehlerhaft und muss verworfen werden, nur die Nachmessung zählt.', 'The first measurement was faulty and must be discarded, only the follow-up counts.'),
        P('Die erste Messung ist nicht falsch, sie enthält nur Zufallsfehler wie jede Messung. Bei extrem ausgewählten Werten liegt dieser Zufall im Mittel in dieselbe Richtung.', 'The first measurement is not wrong, it only contains random error like any measurement. With extremely selected values this chance lies on average in the same direction.')),
      a(P('Ein Teil des Rückgangs ist Regression zur Mitte; ohne Kontrollgruppe bleibt die Wirkung offen.', 'Part of the decrease is regression to the mean; without a control group the effect stays open.'),
        P('Bei unvollkommener Zuverlässigkeit liegen extreme Werte bei einer Wiederholung näher an der Mitte. Eine Kontrollgruppe mit ähnlich extremen Werten zeigt, wie viel davon dieser Effekt ist.', 'With imperfect reliability extreme values lie closer to the middle on repetition. A control group with similarly extreme values shows how much of it is this effect.'), true),
      a(P('Der Rückgang zeigt, dass Angst durch regelmäßiges Üben abnimmt, wie das Training es vorsieht.', 'The decrease shows that anxiety declines through regular practice, as the training intends.'),
        P('Der Rückgang ist eine Beobachtung, keine Erklärung. Übung, Regression zur Mitte, Zeit und Zuwendung können ihn erklären, und die Daten trennen sie nicht.', 'The decrease is an observation, not an explanation. Practice, regression to the mean, time and attention can explain it, and the data do not separate them.'))
    ], ['regression-zur-mitte', 'reliable-change-index'], ['Barnett et al. 2005']),
  q('psy2-be-r-reliab',
    P('Zwei Tests messen dasselbe Merkmal, Test A mit hoher, Test B mit niedriger Reliabilität. Was bedeutet das für die Prüfung einer Veränderung bei einer Person?', 'Two tests measure the same trait, test A with high and test B with low reliability. What does that mean for checking a change in a person?'),
    [
      a(P('Bei Test B genügt eine kleinere Veränderung, weil mehr Streuung mehr Spielraum lässt.', 'With test B a smaller change suffices, because more spread leaves more room.'),
        P('Mehr Messfehler heißt: Kleine Veränderungen sind vom Fehler nicht zu trennen. Die Schwelle für eine zuverlässige Veränderung liegt höher, nicht niedriger.', 'More measurement error means: small changes cannot be separated from error. The threshold for a reliable change lies higher, not lower.')),
      a(P('Bei Test B ist der Messfehler größer; die Veränderung muss deutlich größer sein.', 'With test B the error is larger; the change must be clearly larger.'),
        P('Der Standardfehler der Differenz wächst mit sinkender Reliabilität. Der RCI teilt durch ihn, bei Test B braucht es also mehr Veränderung.', 'The standard error of the difference grows with falling reliability. The RCI divides by it, so test B needs more change.'), true),
      a(P('Die Reliabilität spielt für Veränderungen keine Rolle, nur der Mittelwert zählt.', 'Reliability plays no role for changes, only the mean counts.'),
        P('Gerade bei Veränderungen spielt die Reliabilität eine große Rolle, denn sie bestimmt den Messfehler, an dem die Veränderung gemessen wird.', 'It is precisely with changes that reliability plays a large role, because it determines the measurement error against which the change is measured.')),
      a(P('Bei Test A ist die Veränderung ungültig, weil der Test zu zuverlässig ist.', 'With test A the change is invalid, because the test is too reliable.'),
        P('Hohe Reliabilität macht Veränderungen leichter erkennbar, nicht ungültig. Zuverlässigkeit sagt aber nichts darüber, ob der Test das Richtige misst.', 'High reliability makes changes easier to detect, not invalid. Reliability does not say whether the test measures the right thing, though.'))
    ], ['reliable-change-index', 'reliabilitaet'], ['Jacobson und Truax 1991']),
  q('psy2-be-r-klinisch',
    P('Eine Person verändert sich nach der Therapie zuverlässig (RCI), liegt aber weiterhin im Bereich der klinischen Vergleichsgruppe. Was gilt?', 'A person changes reliably after therapy (RCI) but still lies in the range of the clinical comparison group. What applies?'),
    [
      a(P('Die Veränderung ist klinisch bedeutsam, weil der RCI über der Schranke liegt und der Wert sich verändert hat.', 'The change is clinically significant, because the RCI lies above the threshold and the score has changed.'),
        P('Der RCI zeigt nur, dass die Veränderung größer ist als der Messfehler. Klinisch bedeutsam ist sie, wenn die Person zusätzlich in den Bereich der gesunden Vergleichsgruppe wechselt.', 'The RCI only shows that the change is larger than the measurement error. It is clinically significant if the person in addition moves into the range of the healthy comparison group.')),
      a(P('Die Veränderung ist zuverlässig, aber nicht klinisch bedeutsam; die Grenze zur gesunden Gruppe fehlt.', 'The change is reliable but not clinically significant; the border to the healthy group is not crossed.'),
        P('Zuverlässige Veränderung und klinisch bedeutsame Veränderung sind zwei Kriterien. Das zweite verlangt einen Grenzwert, der die klinische von der gesunden Gruppe trennt.', 'Reliable change and clinically significant change are two criteria. The second requires a cut-off that separates the clinical from the healthy group.'), true),
      a(P('Beide Kriterien bedeuten dasselbe und unterscheiden sich nur im Namen, nicht in der Rechnung.', 'Both criteria mean the same and differ only in name, not in the calculation.'),
        P('Sie beantworten verschiedene Fragen: Ist die Veränderung größer als der Messfehler, und liegt die Person danach im gesunden Bereich? Das eine folgt nicht aus dem anderen.', 'They answer different questions: is the change larger than the measurement error, and does the person lie in the healthy range afterwards? One does not follow from the other.')),
      a(P('Die Person ist geheilt, weil sich ihr Wert verändert hat und der RCI das bestätigt.', 'The person is cured, because her score has changed and the RCI confirms this.'),
        P('Eine Veränderung des Werts ist noch keine Heilung. Dazu bräuchte es ein klinisches Urteil und den Wechsel in den unauffälligen Bereich.', 'A change of the score is not yet a cure. That would need a clinical judgement and the move into the unremarkable range.'))
    ], ['reliable-change-index', 'effektstaerke'], ['Jacobson und Truax 1991']),

  // ---------------------------------------------------------------- Berichten
  q('psy2-be-b-apa',
    P('Wie berichtet man das Ergebnis eines t-Tests nach den Regeln der APA?', 'How is the result of a t test reported according to the rules of the APA?'),
    [
      a(P('Mit Teststatistik, Freiheitsgraden, genauem p-Wert, Effektstärke und Konfidenzintervall.', 'With test statistic, degrees of freedom, exact p value, effect size and confidence interval.'),
        P('Der Bericht soll Größe und Genauigkeit zeigen, nicht nur Signifikanz. Mit diesen Angaben lässt sich das Ergebnis nachrechnen und einordnen.', 'The report is to show size and precision, not only significance. With these details the result can be recomputed and classified.'), true),
      a(P('Nur mit der Angabe p kleiner 0,05, weil weitere Angaben die Lesenden nur verwirren würden.', 'Only with the statement p smaller than 0.05, because further information only confuses readers.'),
        P('Die Angabe p kleiner 0,05 verschweigt die Größe des Effekts und die Genauigkeit der Schätzung. Genaue Werte erleichtern das Prüfen und das Zusammenfassen mehrerer Studien.', 'The statement p smaller than 0.05 conceals the size of the effect and the precision of the estimate. Exact values make checking and pooling several studies easier.')),
      a(P('Mit dem Wort signifikant oder nicht signifikant, ohne Zahlen.', 'With the word significant or not significant, without numbers.'),
        P('Ein Wort ersetzt keine Zahlen. Leserinnen und Leser müssten dem Urteil glauben, statt es nachzuvollziehen, und Studien lassen sich so nicht zusammenfassen.', 'A word does not replace numbers. Readers would have to believe the verdict instead of retracing it, and studies cannot be pooled that way.')),
      a(P('Mit dem Mittelwert der größeren Gruppe, einem Stern für die Signifikanz und der Gruppengröße.', 'With the mean of the larger group, an asterisk for significance and the group size.'),
        P('Ein Mittelwert allein sagt nichts über den Unterschied. Sterne sind ein Notbehelf aus Tabellen; im Text steht das Ergebnis mit allen Angaben.', 'A single mean says nothing about the difference. Asterisks are a makeshift from tables; in the text the result is stated with all details.'))
    ], ['ergebnissatz', 'effektstaerke'], ['Hilfe:ergebnissatz']),

  // ---------------------------------------------------------------- Messwiederholung
  q('psy2-be-w-sphaer',
    P('Bei einer Messwiederholung mit drei Zeitpunkten ist die Annahme der Sphärizität verletzt. Was geschieht mit der Auswertung?', 'In a repeated-measures design with three time points the assumption of sphericity is violated. What happens to the evaluation?'),
    [
      a(P('Die Messwiederholung ist nicht mehr zulässig, man rechnet stattdessen mit unabhängigen Gruppen weiter.', 'The repeated-measures design is no longer permissible, one calculates with independent groups instead.'),
        P('Unabhängige Gruppen wären falsch, denn die Messungen gehören weiter zu denselben Personen. Es gibt Korrekturen für verletzte Sphärizität, die den Plan erhalten.', 'Independent groups would be wrong, because the measurements still belong to the same people. There are corrections for violated sphericity that keep the design.')),
      a(P('Die Freiheitsgrade werden korrigiert (etwa Greenhouse-Geisser), damit p nicht zu klein ausfällt.', 'The degrees of freedom are corrected (for instance Greenhouse-Geisser) so that p is not too small.'),
        P('Bei ungleichen Varianzen der Differenzen zwischen den Zeitpunkten wäre der F-Test zu liberal. Die Korrektur senkt die Freiheitsgrade und stellt das Niveau wieder her.', 'With unequal variances of the differences between the time points the F test would be too liberal. The correction lowers the degrees of freedom and restores the level.'), true),
      a(P('Der F-Wert wird vergrößert, damit der Test strenger wird.', 'The F value is enlarged so that the test becomes stricter.'),
        P('Ein größerer F-Wert machte den Test nachgiebiger, nicht strenger. Strenger wird er über kleinere Freiheitsgrade, die zu größeren p-Werten führen.', 'A larger F value would make the test more lenient, not stricter. It becomes stricter through smaller degrees of freedom, which lead to larger p values.')),
      a(P('Man streicht den dritten Zeitpunkt, bis die Voraussetzung gilt.', 'One deletes the third time point until the assumption holds.'),
        P('Zeitpunkte nach der Voraussetzung zu streichen, verändert die Frage und wählt nach dem Ergebnis aus. Die Korrektur der Freiheitsgrade löst das Problem ohne Verlust von Daten.', 'Deleting time points by the assumption changes the question and selects by the result. The correction of the degrees of freedom solves the problem without losing data.'))
    ], ['anova-messwiederholung', 'greenhouse-geisser'], ['Hilfe:greenhouse-geisser']),
  q('psy2-be-w-vorteil',
    P('Warum braucht ein Design mit Messwiederholung häufig weniger Personen als ein Vergleich unabhängiger Gruppen?', 'Why does a repeated-measures design frequently need fewer people than a comparison of independent groups?'),
    [
      a(P('Jede Person zählt doppelt, die Stichprobe ist dadurch verdoppelt und die Teststärke wächst.', 'Each person counts twice, so the sample is doubled and the power grows.'),
        P('Die doppelten Messungen sind keine zwei unabhängigen Fälle, sie gehören zu einer Person. Die Fallzahl bleibt die Zahl der Personen.', 'The double measurements are not two independent cases, they belong to one person. The number of cases remains the number of people.')),
      a(P('Personenunterschiede fallen aus dem Fehler heraus, weil jede Person mit sich selbst verglichen wird.', 'Differences between people drop out of the error, because each person is compared with herself.'),
        P('Wer schnell oder langsam ist, ist es in beiden Bedingungen. Dieser Streuungsanteil steckt nicht mehr im Fehler, der Test wird empfindlicher.', 'Whoever is fast or slow is so in both conditions. This part of the spread is no longer in the error, so the test is more sensitive.'), true),
      a(P('Es gibt weniger Messfehler, weil die Personen durch die erste Messung schon geübt und dadurch sicherer sind.', 'There is less measurement error, because the people are already practiced and thereby more confident after the first measurement.'),
        P('Übung ist eher ein Risiko, nämlich ein Reihenfolgeeffekt, der gegengewichtet wird. Der Vorteil liegt im Wegfall der Unterschiede zwischen den Personen.', 'Practice is rather a risk, namely an order effect, which is counterbalanced. The advantage lies in the removal of differences between people.')),
      a(P('Der Vergleich ist unabhängig vom Aufbau gleich stark, nur das p ändert sich.', 'The comparison is equally strong regardless of the design, only p changes.'),
        P('Der Aufbau bestimmt die Größe des Fehlers und damit die Teststärke. Bei stark zusammenhängenden Messungen ist die Messwiederholung deutlich stärker.', 'The design determines the size of the error and thus the power. With strongly correlated measurements the repeated-measures design is clearly stronger.'))
    ], ['anova-messwiederholung', 'gepaarte-messung'], ['Hilfe:anova-messwiederholung']),

  // ---------------------------------------------------------------- Moderation, Mediation
  q('psy2-be-mo-simple',
    P('Eine Moderation zeigt eine signifikante Wechselwirkung. Wozu dienen die einfachen Steigungen (simple slopes)?', 'A moderation shows a significant interaction. What are the simple slopes for?'),
    [
      a(P('Sie zeigen, wie stark die Wirkung bei niedrigen, mittleren und hohen Werten des Moderators ist.', 'They show how strong the effect is at low, medium and high values of the moderator.'),
        P('Eine Wechselwirkung sagt, dass die Wirkung vom Moderator abhängt. Einfache Steigungen zeigen sie bei bestimmten Stufen.', 'An interaction says that the effect depends on the moderator. Simple slopes show it at certain levels.'), true),
      a(P('Sie prüfen, ob die Wechselwirkung in Wahrheit ein Haupteffekt ist.', 'They check whether the interaction is in truth a main effect.'),
        P('Haupteffekt und Wechselwirkung sind verschiedene Terme im Modell. Einfache Steigungen verwandeln den einen nicht in den anderen, sie beschreiben die Wechselwirkung.', 'Main effect and interaction are different terms in the model. Simple slopes do not turn one into the other, they describe the interaction.')),
      a(P('Sie ersetzen die Wechselwirkung, die danach nicht mehr berichtet wird.', 'They replace the interaction, which is then no longer reported.'),
        P('Die Wechselwirkung bleibt das Ergebnis des Tests. Einfache Steigungen kommen zusätzlich hinzu, um sie zu deuten, und werden mit ihr berichtet.', 'The interaction remains the result of the test. Simple slopes are added to interpret it and are reported together with it.')),
      a(P('Sie zeigen, welche einzelne Person den Moderator am stärksten beeinflusst und wie sie sich verändert.', 'They show which single person influences the moderator most strongly and how she changes.'),
        P('Steigungen beschreiben Gruppen mit gleichen Werten des Moderators, nicht einzelne Personen. Über den Einfluss auf den Moderator sagen sie nichts.', 'Slopes describe groups with equal values of the moderator, not single persons. They say nothing about the influence on the moderator.'))
    ], ['moderation', 'wechselwirkung'], ['Hayes 2022']),
  q('psy2-be-mo-int',
    P('In einem 2×2-Design mit Therapie und Geschlecht sind beide Haupteffekte signifikant. Was folgt daraus für die Wechselwirkung?', 'In a 2×2 design with therapy and gender both main effects are significant. What follows from this for the interaction?'),
    [
      a(P('Dann besteht zugleich eine Wechselwirkung, weil beide Faktoren wirken.', 'Then an interaction exists at the same time, because both factors have an effect.'),
        P('Wirken beide Faktoren, kann die Wirkung der Therapie in beiden Geschlechtern gleich groß sein, dann gibt es keine Wechselwirkung. Sie ist eine eigene Frage.', 'If both factors have an effect, the effect of therapy can be equally large in both genders, then there is no interaction. It is a question of its own.')),
      a(P('Dann gibt es keine Wechselwirkung, weil die Wirkungen bereits vollständig durch die Haupteffekte erklärt sind.', 'Then there is no interaction, because the effects are already fully explained by the main effects.'),
        P('Haupteffekte schließen eine Wechselwirkung nicht aus. Sie kann zusätzlich bestehen, etwa wenn die Therapie nur bei einem Geschlecht wirkt.', 'Main effects do not rule out an interaction. It can exist in addition, for instance if the therapy works only in one gender.')),
      a(P('Es folgt noch kein Schluss; die Wechselwirkung wird eigens geprüft, Haupteffekte beantworten das nicht.', 'No conclusion follows yet; the interaction is tested separately, main effects do not answer that.'),
        P('Haupteffekte beschreiben Mittelwerte über die Stufen des anderen Faktors. Ob die Wirkung je Stufe verschieden ist, zeigt nur der Test des Produktterms.', 'Main effects describe means across the levels of the other factor. Whether the effect differs by level is shown only by the test of the product term.'), true),
      a(P('Eine Wechselwirkung liegt vor, wenn Therapie und Geschlecht miteinander korrelieren.', 'An interaction exists when therapy and gender correlate with each other.'),
        P('Korrelieren zwei Faktoren, sind sie ungleich besetzt, das ist keine Wechselwirkung. Eine Wechselwirkung beschreibt die Wirkung auf das Ergebnis, nicht den Zusammenhang der Faktoren.', 'If two factors correlate, they are unequally filled, which is not an interaction. An interaction describes the effect on the outcome, not the relationship of the factors.'))
    ], ['wechselwirkung', 'moderation'], ['Hilfe:wechselwirkung']),
  q('psy2-be-me-zeit',
    P('Eine Studie will klären, ob Schlaf die Wirkung von Stress auf die Stimmung vermittelt (Mediation). Was ist für die Deutung der Pfade besonders wichtig?', 'A study wants to clarify whether sleep mediates the effect of stress on mood (mediation). What is especially important for the interpretation of the paths?'),
    [
      a(P('Alle drei Größen werden am selben Tag in einer einzigen Befragung erhoben.', 'All three variables are collected on the same day in a single survey.'),
        P('Gleichzeitig erhobene Größen sagen nichts über die Reihenfolge. Ob Stress den Schlaf stört oder schlechter Schlaf Stress verstärkt, bleibt offen.', 'Variables collected at the same time say nothing about the order. Whether stress disturbs sleep or poor sleep increases stress remains open.')),
      a(P('Die zeitliche Abfolge: Stress vor Schlaf, Schlaf vor Stimmung gemessen; sonst bleibt die Richtung offen.', 'The temporal order: stress measured before sleep, sleep before mood; otherwise the direction stays open.'),
        P('Eine Mediation behauptet eine Kette von Ursachen. Die Rechnung nutzt nur Zusammenhänge; die Richtung muss durch Design oder Begründung gestützt sein.', 'A mediation claims a chain of causes. The calculation uses only associations; the direction must be supported by design or justification.'), true),
      a(P('Stress, Schlaf und Stimmung dürfen untereinander nicht korreliert sein.', 'Stress, sleep and mood must not be correlated with one another.'),
        P('Ohne Zusammenhänge gäbe es nichts zu vermitteln. Eine Mediation lebt gerade davon, dass die Pfade a und b von null verschieden sind.', 'Without relationships there would be nothing to mediate. A mediation lives precisely on the paths a and b differing from zero.')),
      a(P('Der indirekte Effekt muss größer sein als der direkte, sonst gilt es nicht als Mediation im engeren Sinn.', 'The indirect effect must be larger than the direct one, otherwise it does not count as mediation in the narrow sense.'),
        P('Eine solche Regel gibt es nicht. Auch ein kleiner indirekter Effekt neben einem großen direkten ist eine teilweise Mediation und wird nach seinem Intervall beurteilt.', 'There is no such rule. Even a small indirect effect beside a large direct one is a partial mediation and is judged by its interval.'))
    ], ['mediation', 'zusammenhang-ursache'], ['Hayes 2022']),

  // ---------------------------------------------------------------- Ergebnisse lesen
  q('psy2-be-l-p',
    P('Ein Gruppenvergleich der Ängstlichkeit ergibt ein p unter 0,05. Welche Aussage über das p ist richtig?', 'A group comparison of anxiety proneness gives a p below 0.05. Which statement about the p is right?'),
    [
      a(P('Es ist die Wahrscheinlichkeit, dass die Nullhypothese gleicher Mittelwerte stimmt.', 'It is the probability that the null hypothesis of equal means is true.'),
        P('Das ist die häufigste Fehldeutung. Der p-Wert setzt die Nullhypothese voraus und gibt an, wie gut die Daten dazu passen; die Wahrscheinlichkeit der Hypothese selbst liefert er nicht.', 'That is the most frequent misinterpretation. The p value presupposes the null hypothesis and indicates how well the data fit it; it does not supply the probability of the hypothesis itself.')),
      a(P('Es ist die Wahrscheinlichkeit solcher oder extremerer Daten, wenn es keinen Unterschied gibt.', 'It is the probability of such or more extreme data if there is no difference.'),
        P('Das ist die Definition. Ein kleines p sagt, dass die Daten schlecht zur Nullhypothese passen, nicht wie groß der Unterschied ist und nicht, wie wahrscheinlich die Alternative ist.', 'That is the definition. A small p says that the data fit the null hypothesis poorly, not how large the difference is and not how probable the alternative is.'), true),
      a(P('Es gibt an, mit welcher Wahrscheinlichkeit die Studie bei Wiederholung erneut signifikant wird.', 'It states with what probability the study becomes significant again on replication.'),
        P('Wiederholungen sind in dem Wert nicht enthalten. Wie oft ein Befund wieder signifikant ausfällt, hängt vom wahren Effekt und der Teststärke ab.', 'Replications are not contained in the value. How often a finding is significant again depends on the true effect and the power.')),
      a(P('Es gibt die Wahrscheinlichkeit an, dass die Alternativhypothese stimmt, nämlich 1 minus p.', 'It gives the probability that the alternative hypothesis is true, namely 1 minus p.'),
        P('Auch das ist eine Fehldeutung. Ein p-Wert sagt nichts über die Wahrscheinlichkeit der Alternativhypothese; dafür bräuchte man Vorwissen und eine Bayes-Rechnung.', 'This too is a misinterpretation. A p value says nothing about the probability of the alternative hypothesis; for that one would need prior knowledge and a Bayesian calculation.'))
    ], ['p-wert', 'signifikanz'], ['Haller und Krauss 2002']),
  q('psy2-be-l-sig',
    P('Eine Studie mit sehr vielen Personen findet einen signifikanten Unterschied bei sehr kleinem Cohens d. Wie ist das einzuordnen?', 'A study with very many people finds a significant difference with a very small Cohen d. How is this to be classified?'),
    [
      a(P('Der Effekt ist sehr groß, denn p ist so klein und der Test eindeutig.', 'The effect is very large, because p is so small and the test is clear.'),
        P('Das p misst nicht die Größe. Bei sehr vielen Personen wird auch ein winziger Unterschied signifikant; die Größe liest man am Effektmaß, hier an d.', 'The p does not measure size. With very many people even a tiny difference becomes significant; size is read from the effect measure, here from d.')),
      a(P('Der Unterschied ist signifikant, aber praktisch klein; Bedeutsamkeit zeigt die Effektstärke, nicht p.', 'The difference is significant but practically small; importance is shown by effect size, not by p.'),
        P('Mit großem n schrumpft der Standardfehler, und kleine Abweichungen von null fallen auf. Ob ein kleiner Unterschied zählt, ist eine inhaltliche Frage.', 'With large n the standard error shrinks, and small deviations from zero stand out. Whether a small difference matters is a question of content.'), true),
      a(P('Der Effekt ist praktisch bedeutsam, weil er signifikant ist und die Stichprobe so groß war.', 'The effect is practically important, because it is significant and the sample was so large.'),
        P('Signifikanz ist nicht Bedeutsamkeit. Sie zeigt nur, dass der Unterschied von null abweicht, nicht, ob er groß genug ist, um etwas zu verändern.', 'Significance is not importance. It only shows that the difference deviates from zero, not whether it is large enough to change anything.')),
      a(P('Der Befund ist ungültig, weil sehr große Stichproben jeden Test verfälschen und deshalb nicht zählen.', 'The finding is invalid, because very large samples falsify every test and therefore do not count.'),
        P('Große Stichproben verfälschen nichts, sie machen Schätzungen genauer. Nur die Lesart muss stimmen: Ein kleines p bei kleinem d ist ein gültiger, aber kleiner Effekt.', 'Large samples falsify nothing, they make estimates more precise. Only the reading must be right: a small p with a small d is a valid but small effect.'))
    ], ['effektstaerke', 'signifikanz'], ['Cohen 1988']),
  q('psy2-be-l-ki',
    P('Zu einem Mittelwertunterschied wird ein 95-Prozent-Konfidenzintervall berichtet. Was beschreibt dieses Intervall?', 'A 95 percent confidence interval is reported for a difference in means. What does this interval describe?'),
    [
      a(P('Der wahre Wert liegt mit 95 Prozent Wahrscheinlichkeit in diesem Intervall.', 'The true value lies in this interval with 95 percent probability.'),
        P('Der wahre Wert ist fest, nur das Intervall schwankt von Stichprobe zu Stichprobe. Die 95 Prozent gelten dem Verfahren, nicht diesem einen Intervall.', 'The true value is fixed, only the interval varies from sample to sample. The 95 percent applies to the procedure, not to this one interval.')),
      a(P('Ein Verfahren, dessen Intervalle bei vielen Wiederholungen in 95 Prozent den wahren Wert einschließen.', 'A procedure whose intervals contain the true value in 95 percent of many replications.'),
        P('Das ist die genaue Lesart. Praktisch zeigt die Breite, wie genau der Unterschied geschätzt ist, und die Lage, welche Werte mit den Daten vereinbar sind.', 'That is the exact reading. In practice the width shows how precisely the difference is estimated, and the position which values are compatible with the data.'), true),
      a(P('95 Prozent aller Messwerte der Gruppen liegen in diesem Intervall.', '95 percent of all measured values of the groups lie in this interval.'),
        P('Das beschreibt einen Streubereich der Einzelwerte. Ein Konfidenzintervall bezieht sich auf einen Kennwert, hier den Mittelwertunterschied, und ist viel enger.', 'That describes a range of the individual values. A confidence interval refers to a statistic, here the difference in means, and is much narrower.')),
      a(P('Bei einer Wiederholung liegt der neue Mittelwertunterschied mit 95 Prozent Wahrscheinlichkeit im Intervall.', 'On a replication the new difference in means lies in the interval with 95 percent probability.'),
        P('Auch das stimmt nicht. Ein neuer Wert fällt seltener ins alte Intervall, denn das neue Ergebnis schwankt zusätzlich um den wahren Wert; zu erwarten ist deutlich weniger als 95 Prozent.', 'This too is not right. A new value falls less often into the old interval, because the new result also varies around the true value; clearly less than 95 percent is to be expected.'))
    ], ['konfidenzintervall', 'standardfehler'], ['Hoekstra et al. 2014']),
  q('psy2-be-ki-null',
    P('Das Intervall für den Unterschied zweier Gruppen reicht von einem negativen bis zu einem positiven Wert und schließt null ein. Was heißt das?', 'The interval for the difference between two groups runs from a negative to a positive value and includes zero. What does this mean?'),
    [
      a(P('Es gibt keinen Unterschied zwischen den Gruppen, die Mittelwerte sind in Wahrheit gleich.', 'There is no difference between the groups, the means are equal in truth.'),
        P('Das Intervall nennt viele mit den Daten vereinbare Werte, von denen null einer ist. Dass es keinen Unterschied gibt, zeigt es nicht.', 'The interval names many values compatible with the data, of which zero is one. It does not show that there is no difference.')),
      a(P('Die Gruppen sind gleich, weil die Nullhypothese bestätigt ist.', 'The groups are equal, because the null hypothesis is confirmed.'),
        P('Eine Nullhypothese wird nicht bestätigt, sondern nur nicht verworfen. Gleichheit zu belegen verlangt einen Äquivalenztest mit einem vorher festgelegten Bereich.', 'A null hypothesis is not confirmed, only not rejected. Showing equality requires an equivalence test with a range fixed beforehand.')),
      a(P('Null ist ein vereinbarer Wert; der Unterschied ist nicht signifikant, Gleichheit nicht belegt.', 'Zero is a compatible value; the difference is not significant, equality is not shown.'),
        P('Das Intervall und der Test auf dem Niveau von 5 Prozent sagen hier dasselbe. Ein breites Intervall lässt auch größere Unterschiede zu.', 'The interval and the test at the 5 percent level say the same here. A wide interval also allows larger differences.'), true),
      a(P('Die Intervallgrenzen sind falsch berechnet, denn ein gültiges Intervall schließt null per Definition aus.', 'The interval limits are calculated wrongly, because a valid interval excludes zero by definition.'),
        P('Ob ein Intervall null enthält, hängt von den Daten ab. Es ist nicht Teil der Gültigkeit; ein Intervall mit null ist ebenso gültig wie eines ohne.', 'Whether an interval contains zero depends on the data. It is not part of validity; an interval with zero is just as valid as one without.'))
    ], ['konfidenzintervall', 'signifikanz'], ['Greenland et al. 2016']),

  // ---------------------------------------------------------------- Rangtests
  q('psy2-be-rt-wahl',
    P('Die Werte einer Angstskala sind stark schief, die Gruppen klein. Was prüft der Mann-Whitney-Test an Stelle eines t-Tests?', 'The values of an anxiety scale are strongly skewed, the groups small. What does the Mann-Whitney test check instead of a t test?'),
    [
      a(P('Ob die Mittelwerte gleich sind, nur mit einer Rechnung, die gegen Ausreißer robuster ist.', 'Whether the means are equal, only with a calculation that is more robust against outliers.'),
        P('Der Mann-Whitney-Test vergleicht Ränge, nicht Mittelwerte. Seine Aussage betrifft die Lage der Verteilungen zueinander, nicht den Mittelwert.', 'The Mann-Whitney test compares ranks, not means. Its statement concerns the position of the distributions relative to each other, not the mean.')),
      a(P('Ob die Varianzen der beiden Gruppen gleich sind, wie beim Test von Levene.', 'Whether the variances of the two groups are equal, as with the Levene test.'),
        P('Gleiche Varianzen prüft ein Test wie der von Levene. Der Mann-Whitney-Test fragt, ob Werte einer Gruppe in der Rangordnung überwiegend höher liegen.', 'Equal variances are checked by a test such as Levene. The Mann-Whitney test asks whether values of one group lie predominantly higher in the rank order.')),
      a(P('Ob Werte einer Gruppe in der Rangordnung höher liegen, ohne Normalverteilung als Voraussetzung.', 'Whether values of one group rank higher, without normal distribution as a precondition.'),
        P('Rangtests ersetzen Werte durch Rangplätze und sind unempfindlich gegen Schiefe und Ausreißer. Sie passen bei kleinen, schiefen Gruppen.', 'Rank tests replace values by rank positions and are insensitive to skewness and outliers. They fit small, skewed groups.'), true),
      a(P('Ob die Gruppen gepaart sind, also aus denselben Personen bestehen.', 'Whether the groups are paired, that is consist of the same people.'),
        P('Ob gepaart wird, bestimmt der Aufbau der Studie, nicht ein Test. Für gepaarte Werte gibt es den Wilcoxon-Test, für unabhängige Gruppen Mann-Whitney.', 'Whether pairing applies is determined by the design of the study, not by a test. For paired values there is the Wilcoxon test, for independent groups Mann-Whitney.'))
    ], ['rangtest', 'welch-test'], ['Hilfe:rangtest']),

  // ---------------------------------------------------------------- Offene Antworten
  q('psy2-oa-kategorien',
    P('Studierende schreiben frei auf, was sie im Studium belastet. Wie bildet man aus diesen Texten Kategorien?', 'Students write freely what burdens them in their studies. How does one form categories from these texts?'),
    [
      a(P('Je Antwort eine eigene Kategorie, damit bei der Auswertung nichts verloren geht und jede Äußerung zählt.', 'One category for each answer, so that nothing is lost in the evaluation and every remark counts.'),
        P('Bei so vielen Kategorien wie Antworten gibt es nichts zu zählen oder zu vergleichen. Kategorien fassen Ähnliches zusammen, das ist ihr Zweck.', 'With as many categories as answers there is nothing to count or compare. Categories group similar things, that is their purpose.')),
      a(P('Klar abgegrenzte, sich ausschließende Kategorien, die die Antworten abdecken; aus Material oder Theorie.', 'Clearly delimited, mutually exclusive categories that cover the answers; from material or theory.'),
        P('Überschneidungsfreiheit und Vollständigkeit machen die Kodierung wiederholbar. Man bildet Kategorien am Material, aus einer Theorie oder gemischt.', 'Freedom from overlap and completeness make the coding repeatable. One forms categories from the material, from a theory or mixed.'), true),
      a(P('Nach der Länge der Antworten: Kurze Antworten bilden die eine, lange die andere Kategorie.', 'By the length of the answers: short answers form one category, long ones the other.'),
        P('Die Länge sagt nichts über den Inhalt. Kategorien sollen nach der Bedeutung der Aussage gebildet werden, nicht nach äußeren Merkmalen des Textes.', 'Length says nothing about content. Categories are to be formed by the meaning of the statement, not by outer features of the text.')),
      a(P('Die Kategorien legt die Software fest, ohne dass jemand die Texte lesen muss.', 'The software fixes the categories without anyone having to read the texts.'),
        P('Eine Software kann Häufigkeiten zählen, aber die Kategorien brauchen eine inhaltliche Entscheidung. Ohne Lesen der Texte lässt sich nicht prüfen, ob sie passen.', 'Software can count frequencies, but the categories need a decision of content. Without reading the texts one cannot check whether they fit.'))
    ], ['frage-kategorien', 'intercoder'], ['Hilfe:frage-kategorien']),
  q('psy2-oa-leitfaden',
    P('Zwei Personen sollen dieselben Freitexte kodieren. Was gehört in einen Kodierleitfaden?', 'Two people are to code the same free texts. What belongs in a coding guide?'),
    [
      a(P('Nur die Namen der Kategorien, damit die Kodierenden nach ihrem Eindruck frei entscheiden.', 'Only the names of the categories, so that the coders decide freely by their impression.'),
        P('Mit Namen allein deuten zwei Personen denselben Text verschieden. Freie Entscheidungen senken die Übereinstimmung und machen die Kodierung schwer nachvollziehbar.', 'With names alone two people interpret the same text differently. Free decisions lower agreement and make the coding hard to retrace.')),
      a(P('Je Kategorie eine Definition, Ankerbeispiele und Regeln zur Abgrenzung ähnlicher Kategorien.', 'For each category a definition, anchor examples and rules separating similar categories.'),
        P('Definition, Beispiele und Abgrenzungsregeln sorgen dafür, dass verschiedene Personen gleich entscheiden. Unklare Fälle werden an einer Probe besprochen.', 'Definition, examples and delimitation rules make sure that different people decide the same way. Unclear cases are discussed on a sample.'), true),
      a(P('Die erwarteten Häufigkeiten je Kategorie, damit das Ergebnis zur Hypothese der Studie passt.', 'The expected frequencies per category, so that the result fits the hypothesis of the study.'),
        P('Erwartete Häufigkeiten im Leitfaden würden das Ergebnis vorwegnehmen. Die Kodierung soll das tatsächliche Material abbilden, nicht eine Erwartung.', 'Expected frequencies in the guide would anticipate the result. The coding is to reflect the actual material, not an expectation.')),
      a(P('Die statistischen Verfahren, die später berechnet werden.', 'The statistical procedures that will be calculated later.'),
        P('Der Leitfaden regelt die Zuordnung von Texten zu Kategorien. Wie die Häufigkeiten danach ausgewertet werden, steht im Auswertungsplan und nicht im Leitfaden.', 'The guide regulates the assignment of texts to categories. How the frequencies are evaluated afterwards is stated in the analysis plan and not in the guide.'))
    ], ['frage-kategorien', 'intercoder'], ['Hilfe:intercoder']),
  q('psy2-oa-kappa',
    P('Zwei Kodierende stimmen bei einem hohen Anteil der Antworten überein. Warum berichtet man trotzdem Cohens Kappa?', 'Two coders agree on a high share of the answers. Why is Cohen kappa nevertheless reported?'),
    [
      a(P('Kappa misst, welche der beiden Personen die Antworten besser kodiert.', 'Kappa measures which of the two persons codes the answers better.'),
        P('Kappa beschreibt die Übereinstimmung beider, nicht die Güte einer einzelnen Person. Wer richtiger liegt, zeigt es nicht.', 'Kappa describes the agreement of both, not the quality of a single person. It does not show who is more correct.')),
      a(P('Kappa rechnet die Übereinstimmung heraus, die allein durch Zufall zu erwarten wäre.', 'Kappa removes the agreement that would be expected by chance alone.'),
        P('Wenige Kategorien oder eine sehr häufige Kategorie führen schon durch Zufall zu hoher Übereinstimmung. Kappa setzt die beobachtete Übereinstimmung ins Verhältnis zur zufällig erwartbaren.', 'Few categories or one very frequent category already lead to high agreement by chance. Kappa relates the observed agreement to the agreement expected by chance.'), true),
      a(P('Kappa ist größer als der Anteil der Übereinstimmung, daher wirkt die Kodierung besser.', 'Kappa is larger than the share of agreement, so the coding looks better.'),
        P('Es ist umgekehrt: Kappa ist kleiner als der rohe Anteil, weil es den Zufall abzieht. Genau deshalb gilt es als strengeres und ehrlicheres Maß.', 'It is the other way round: kappa is smaller than the raw share, because it subtracts chance. That is exactly why it counts as a stricter and more honest measure.')),
      a(P('Kappa ersetzt die Kategorien durch Zahlen, damit man sie auswerten kann.', 'Kappa replaces the categories by numbers so that they can be evaluated.'),
        P('Kappa ist ein Maß für die Übereinstimmung, kein Umkodieren. Die Zahlen für die Kategorien kommen aus der Kodierung selbst.', 'Kappa is a measure of agreement, not a recoding. The numbers for the categories come from the coding itself.'))
    ], ['kappa', 'intercoder'], ['Hilfe:kappa']),
  q('psy2-oa-mehrfach',
    P('Eine Antwort nennt zwei Themen, etwa Geldsorgen und Zeitmangel. Wie wird das kodiert?', 'An answer names two topics, for instance money worries and lack of time. How is that coded?'),
    [
      a(P('Nur das zuerst genannte Thema zählt, die übrigen werden gestrichen, damit jede Person in der Auswertung nur einmal gezählt wird.', 'Only the topic named first counts, the others are deleted, so that each person is counted only once in the evaluation.'),
        P('Das verwirft Information und bevorzugt die Reihenfolge der Nennung. Wer zwei Themen nennt, soll auch mit beiden gezählt werden.', 'This discards information and favours the order of mention. Whoever names two topics is to be counted with both.')),
      a(P('Beide Themen werden zu einer neuen gemeinsamen Kategorie zusammengelegt, die beides abbildet.', 'Both topics are merged into a new common category that represents both.'),
        P('Dann verschwinden die Themen als eigene Kategorien, und es entstehen Mischkategorien für jede Kombination. Die Auswertung wird unübersichtlich.', 'Then the topics disappear as categories of their own, and mixed categories arise for every combination. The evaluation becomes confusing.')),
      a(P('Als Mehrfachantwort: jede Kategorie eigens mit ja oder nein kodiert; die Basis der Prozente wird genannt.', 'As a multiple response: each category coded separately with yes or no; the base of the percentages is named.'),
        P('Bei Mehrfachantworten ergeben die Prozente über die Kategorien mehr als 100, wenn man sie auf Personen bezieht. Darum wird die Basis genannt.', 'With multiple responses the percentages across the categories add up to more than 100 when related to people. So the base is named.'), true),
      a(P('Die Antwort wird als fehlender Wert behandelt, weil sie mehrdeutig ist.', 'The answer is treated as a missing value, because it is ambiguous.'),
        P('Eine Antwort mit zwei Themen ist nicht mehrdeutig, sie ist reich. Als fehlend gezählt würde sie die Auswertung verzerren und die Fallzahl senken.', 'An answer with two topics is not ambiguous, it is rich. Counted as missing it would bias the evaluation and lower the number of cases.'))
    ], ['frage-mehrfachantworten', 'frage-kategorien'], ['Hilfe:frage-kategorien'])
];
