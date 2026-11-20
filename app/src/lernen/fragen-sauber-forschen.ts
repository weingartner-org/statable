/**
 * Üben: Sauber forschen (Einheiten forschungskreislauf, p-hacking-erkennen, vorregistrierung, p-wert-grundsaetze, bayes-vorwissen; Johannes 05.11.2026).
 * Eigene Wortlaute und eigene erfundene Zahlenbeispiele, nichts aus einem Lehrbuch. Kennungen `sf-<kürzel>-…` (kr, ph, vr, pg, bv), je Einheit 7 Fragen, davon eine „Welche Aussagen stimmen?“.
 * Zahlen im Text sind einfache Rechenbeispiele (ganze Zahlen, Prozent, a und b der Beta-Verteilung); die wenigen Dezimalzahlen stehen in ueben-erwartet.json.
 * Die Rechnungen dahinter: 1 − 0,95³ = 14 %, 1 − 0,95²⁰ = 64 %, Bonferroni 5 % : 5 = 1 %, 2 · 5 · 3 = 30 Wege, 100 : 0,8 = 125, Beta(2 + 5, 8 + 5) = Beta(7, 13) und a : (a + b)
 * (zweiter Weg in scripts/ueben-erwartet-sauber-forschen.R und lernen/rechenaufgaben-sf.soll.ts). Fachaussagen belegt durch wissen.json (nur mc: true) und den Hilfe-Artikel (`Hilfe:<id>`).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {};

export const FRAGEN: Frage[] = [
  // ======================================================== 1. Forschungskreislauf
  {
    id: 'sf-kr-reihenfolge', thema: 'sauberforschen',
    stamm: P('In welcher Reihenfolge verläuft der Forschungskreislauf?', 'In which order does the research cycle run?'),
    antworten: [
      a(P('Beobachtung, Theorie, Hypothese, Vorhersage, Prüfung', 'Observation, theory, hypothesis, prediction, test'), P('Aus einer Beobachtung entsteht eine erklärende Theorie, aus ihr eine prüfbare Hypothese und eine Vorhersage. Die Prüfung liefert eine neue Beobachtung, und der Kreis beginnt von vorn.', 'An explaining theory arises from an observation, from it a testable hypothesis and a prediction. The test gives a new observation, and the circle starts over.'), true),
      a(P('Hypothese, Beobachtung, Prüfung, Theorie, Vorhersage', 'Hypothesis, observation, test, theory, prediction'), P('Eine Hypothese ohne Beobachtung und Theorie hat keine Grundlage. Die Vorhersage stünde zudem nach der Prüfung, und dann kann sie nichts mehr widerlegen.', 'A hypothesis without observation and theory has no basis. The prediction would also come after the test, and then it can no longer refute anything.')),
      a(P('Theorie, Prüfung, Beobachtung, Hypothese, Vorhersage', 'Theory, test, observation, hypothesis, prediction'), P('Die Theorie kommt meist nach einer Beobachtung und wird nicht vor der Prüfung ohne jede Beobachtung gebaut. Die Vorhersage gehört vor die Prüfung, nicht dahinter.', 'The theory usually follows an observation and is not built before the test without any observation. The prediction belongs before the test, not behind it.')),
      a(P('Vorhersage, Hypothese, Beobachtung, Theorie, Prüfung', 'Prediction, hypothesis, observation, theory, test'), P('Die Vorhersage folgt aus der Hypothese, nicht umgekehrt. Am Anfang steht eine Beobachtung, die etwas offen lässt.', 'The prediction follows from the hypothesis, not the other way round. At the start there is an observation that leaves something open.'))
    ],
    hilfe: ['sf-kreislauf', 'forschungskreislauf'], belege: ['wissen:hypothesen-parameter', 'Hilfe:sf-kreislauf']
  },
  {
    id: 'sf-kr-hypothese', thema: 'sauberforschen',
    stamm: P('Eine Studie vergleicht zwei Stichproben. Worauf bezieht sich die statistische Hypothese?', 'A study compares two samples. What does the statistical hypothesis refer to?'),
    antworten: [
      a(P('Auf die Mittelwerte der beiden Grundgesamtheiten', 'To the means of the two populations'), P('Hypothesen betreffen Parameter der Grundgesamtheit. Gefragt wird, ob die Mittelwerte der Grundgesamtheiten verschieden sind, und in welcher Richtung.', 'Hypotheses concern parameters of the population. The question is whether the population means differ, and in which direction.'), true),
      a(P('Auf die beiden gemessenen Stichprobenmittel', 'To the two measured sample means'), P('Zwei Stichprobenmittel unterscheiden sich fast jedesmal, das ist kein Befund. Die Stichprobenmittel sind die Daten, über die Hypothese entscheidet das Verhältnis zur Grundgesamtheit.', 'Two sample means almost always differ, that is no finding. The sample means are the data, the relation to the population decides the hypothesis.')),
      a(P('Auf die einzelnen Personen der beiden Stichproben', 'To the single people of the two samples'), P('Einzelne Personen liefern Messwerte, über die sich die Hypothese nicht aussagt. Sie handelt von allen Personen, für die die Stichprobe stehen soll.', 'Single people provide measured values about which the hypothesis does not speak. It is about all people for whom the sample is meant to stand.')),
      a(P('Auf die Zahl der Personen in den Stichproben', 'To the number of people in the samples'), P('Die Stichprobengröße legen die Forschenden fest, sie ist keine Aussage über die Welt. Hypothesen sagen etwas über Merkmale der Grundgesamtheit.', 'The sample size is set by the researchers, it is no statement about the world. Hypotheses say something about characteristics of the population.'))
    ],
    hilfe: ['sf-kreislauf', 'hypothese'], belege: ['wissen:hypothesen-parameter', 'Hilfe:sf-kreislauf']
  },
  {
    id: 'sf-kr-variablen', thema: 'sauberforschen',
    stamm: P('Personen schlafen entweder 4 oder 8 Stunden, danach wird ihre Reaktionszeit gemessen. Welche Größe ist die abhängige?', 'People sleep either 4 or 8 hours, afterwards their reaction time is measured. Which variable is the dependent one?'),
    antworten: [
      a(P('Die Reaktionszeit', 'The reaction time'), P('Die abhängige Größe ist die gemessene Größe, die sich laut Hypothese ändern soll. Sie wird aus der Gruppe vorhergesagt.', 'The dependent variable is the measured quantity that is supposed to change according to the hypothesis. It is predicted from the group.'), true),
      a(P('Die Schlafdauer', 'The sleep duration'), P('Die Schlafdauer wird verglichen oder eingestellt, sie ist die unabhängige Variable. Aus ihr wird die Reaktionszeit vorhergesagt.', 'The sleep duration is compared or set, it is the independent variable. The reaction time is predicted from it.')),
      a(P('Die Zahl der Personen je Gruppe', 'The number of people per group'), P('Die Gruppengröße gehört zum Design der Studie. Sie ist weder verglichen noch gemessen im Sinn der Hypothese.', 'The group size belongs to the design of the study. It is neither compared nor measured in the sense of the hypothesis.')),
      a(P('Die Uhrzeit, zu der gemessen wird', 'The time of day at which measuring takes place'), P('Die Uhrzeit ist allenfalls eine Störgröße, die man festhält. Die abhängige Größe ist das, was als Ergebnis des Vergleichs gemessen wird.', 'The time of day is at most a nuisance variable that one holds constant. The dependent variable is what is measured as the result of the comparison.'))
    ],
    hilfe: ['sf-kreislauf', 'unabhaengige-variable'], belege: ['Hilfe:sf-kreislauf', 'Hilfe:abhaengige-groesse']
  },
  {
    id: 'sf-kr-vorhersage', thema: 'sauberforschen',
    stamm: P('Welche Formulierung ist eine Vorhersage, die sich an Daten prüfen lässt?', 'Which wording is a prediction that can be tested with data?'),
    antworten: [
      a(P('Die Gruppe mit 4 Stunden Schlaf hat im Mittel eine längere Reaktionszeit als die Gruppe mit 8 Stunden', 'The group with 4 hours of sleep has a longer mean reaction time than the group with 8 hours'), P('Sie nennt Gruppen, Größe und Richtung. Ein Ergebnis in die Gegenrichtung würde ihr widersprechen, und das macht sie prüfbar.', 'It names groups, variable and direction. A result in the opposite direction would contradict it, and that makes it testable.'), true),
      a(P('Schlaf hat irgendeinen Einfluss auf das Verhalten', 'Sleep has some influence on behaviour'), P('Welches Ergebnis auch kommt, es lässt sich als irgendein Einfluss deuten. Ohne Größe und Richtung kann kein Ergebnis widersprechen.', 'Whatever result comes, it can be read as some influence. Without variable and direction no result can contradict it.')),
      a(P('Menschen reagieren verschieden schnell', 'People react at different speeds'), P('Das trifft für fast jede Gruppe von Menschen zu und sagt über den Vergleich nichts voraus. Eine Vorhersage muss ein bestimmtes Ergebnis nahelegen.', 'That applies to almost any group of people and predicts nothing about the comparison. A prediction must suggest a specific result.')),
      a(P('Ausgeschlafene Menschen sind im Leben erfolgreicher', 'Well-rested people are more successful in life'), P('Erfolg im Leben ist zu weit gefasst, um in dieser Studie gemessen zu werden. Prüfbar ist nur, was die Studie messen kann.', 'Success in life is too broad to be measured in this study. Only what the study can measure is testable.'))
    ],
    hilfe: ['sf-kreislauf', 'forschungskreislauf'], belege: ['wissen:cohen94-theorie-bestaetigt', 'Hilfe:sf-kreislauf']
  },
  {
    id: 'sf-kr-bestaetigt', thema: 'sauberforschen',
    stamm: P('Die Daten passen zur Vorhersage einer Theorie. Was lässt sich daraus schließen?', 'The data fit the prediction of a theory. What can be concluded from that?'),
    antworten: [
      a(P('Die Theorie ist gestützt, aber noch nicht bewiesen', 'The theory is supported but not yet proven'), P('Aus „Wenn die Theorie gilt, zeigen sich diese Daten“ und „Die Daten zeigen sich“ folgt nicht, dass die Theorie gilt. Dazu kommen Annahmen zur Messung, die mitgeprüft werden.', 'From "if the theory holds, these data appear" and "the data appear" it does not follow that the theory holds. In addition there are assumptions about the measurement that are tested along.'), true),
      a(P('Die Theorie ist bewiesen', 'The theory is proven'), P('Passende Daten können auch andere Erklärungen haben. Ein Beweis wäre ein Schluss in die andere Richtung, und der ist formal ungültig.', 'Fitting data can have other explanations too. A proof would be an inference in the other direction, and that is formally invalid.')),
      a(P('Die Theorie gilt damit für alle Menschen', 'The theory therefore holds for all people'), P('Die Daten stammen von bestimmten Personen unter bestimmten Bedingungen. Wie weit das Ergebnis trägt, zeigt erst die Wiederholung unter anderen Bedingungen.', 'The data come from certain people under certain conditions. How far the result carries shows only the repetition under other conditions.')),
      a(P('Die Hypothese braucht keine weitere Prüfung mehr', 'The hypothesis needs no further testing'), P('Ein einzelnes Ergebnis ist ein Baustein. Weitere Studien mit anderen Personen und Messungen zeigen, ob das Ergebnis bleibt.', 'A single result is a building block. Further studies with other people and measurements show whether the result holds.'))
    ],
    hilfe: ['sf-kreislauf', 'theorie'], belege: ['wissen:cohen94-theorie-bestaetigt', 'Hilfe:sf-kreislauf']
  },
  {
    id: 'sf-kr-richtung', thema: 'sauberforschen',
    stamm: P('Zwei Mittelwerte der Reaktionszeit sind 310 und 350 Millisekunden, der höhere gehört zur Gruppe mit kurzem Schlaf. Vorhergesagt war genau diese Richtung. Was zeigt der Unterschied von 40 Millisekunden?', 'Two mean reaction times are 310 and 350 milliseconds, the higher one belongs to the group with short sleep. Exactly this direction was predicted. What does the difference of 40 milliseconds show?'),
    antworten: [
      a(P('Die Richtung passt zur Vorhersage; ob mehr als Zufall im Spiel ist, zeigt erst ein Test', 'The direction fits the prediction; whether more than chance is involved only a test shows'), P('Der Vergleich der Mittelwerte prüft die Richtung. Dass der Unterschied über das Rauschen der Stichprobe hinausgeht, folgt aus Standardfehler und p-Wert.', 'The comparison of the means checks the direction. That the difference goes beyond the noise of the sample follows from standard error and p value.'), true),
      a(P('Die Hypothese ist damit bestätigt', 'The hypothesis is thereby confirmed'), P('Zwei Mittelwerte unterscheiden sich fast jedesmal. Ohne Blick auf die Streuung ist offen, ob 40 Millisekunden viel oder wenig sind.', 'Two means almost always differ. Without a look at the spread it is open whether 40 milliseconds is much or little.')),
      a(P('Der Effekt ist bedeutsam, weil die Zahl 40 groß wirkt', 'The effect is important because the number 40 looks large'), P('Die Größe eines Effekts misst man im Verhältnis zur Streuung. Eine Zahl allein, ohne Einheit und Streuung, sagt nichts über Bedeutung.', 'The size of an effect is measured relative to the spread. A number alone, without unit and spread, says nothing about importance.')),
      a(P('Die Vorhersage ist widerlegt, weil der Unterschied unter 50 liegt', 'The prediction is refuted because the difference is below 50'), P('Die Vorhersage nannte eine Richtung, keine Mindestgröße von 50. Ein Unterschied in der vorhergesagten Richtung widerspricht ihr nicht.', 'The prediction named a direction, no minimum size of 50. A difference in the predicted direction does not contradict it.'))
    ],
    hilfe: ['sf-kreislauf', 'forschungskreislauf'], belege: ['wissen:hypothesen-parameter', 'Hilfe:sf-kreislauf']
  },
  {
    id: 'sf-kr-mehrfach', thema: 'sauberforschen', mehrfach: true,
    stamm: P('Welche Aussagen zum Forschungskreislauf stimmen? Mehrere können stimmen.', 'Which statements about the research cycle are true? Several can be true.'),
    antworten: [
      a(P('Das Ergebnis einer Prüfung ist wieder eine Beobachtung, die neue Fragen auslösen kann', 'The result of a test is again an observation that can raise new questions'), P('Daran schließt sich der Kreis: Aus der Prüfung folgen Fragen, die zu einer besseren Theorie und neuen Hypothesen führen.', 'This closes the circle: the test raises questions that lead to a better theory and new hypotheses.'), true),
      a(P('Eine Vorhersage nennt vor der Messung, welches Ergebnis zur Hypothese passen würde', 'A prediction names before the measurement which result would fit the hypothesis'), P('Erst dadurch kann das Ergebnis der Hypothese auch widersprechen. Wird sie nach der Messung formuliert, passt jedes Ergebnis.', 'Only then can the result also contradict the hypothesis. If it is formulated after the measurement, every result fits.'), true),
      a(P('Hat man die Daten gesehen, lässt sich die Hypothese ohne Folgen anpassen', 'Once the data have been seen, the hypothesis can be adjusted without consequences'), P('Eine nach den Daten angepasste Hypothese passt zu ihnen, aber das sagt nichts mehr. Wird sie als vorab geplant ausgegeben, heißt das HARKing; erlaubt ist nur, sie offen als nachträgliche Erkundung zu kennzeichnen.', 'A hypothesis adjusted to the data fits them, but that no longer says anything. Presenting it as planned in advance is called HARKing; it is only acceptable when openly marked as post hoc exploration.')),
      a(P('Die unabhängige Variable ist die Größe, die gemessen wird, um die Hypothese zu prüfen', 'The independent variable is the quantity that is measured to test the hypothesis'), P('Das beschreibt die abhängige Größe. Die unabhängige Variable ist die Größe, die verglichen oder verändert wird.', 'That describes the dependent variable. The independent variable is the quantity that is compared or changed.'))
    ],
    hilfe: ['sf-kreislauf', 'forschungskreislauf'], belege: ['wissen:cohen94-theorie-bestaetigt', 'Hilfe:sf-kreislauf']
  },

  // ======================================================== 2. p-Hacking erkennen
  {
    id: 'sf-ph-risiko3', thema: 'sauberforschen',
    stamm: P('Eine Studie prüft 3 voneinander unabhängige Zielgrößen jeweils auf dem Niveau 5 %. In Wirklichkeit gibt es keinen Effekt. Wie groß ist das Risiko für mindestens einen Fehlalarm?', 'A study tests 3 mutually independent outcomes, each at the 5% level. In reality there is no effect. How large is the risk of at least one false alarm?'),
    antworten: [
      a(P('Rund 14 %', 'About 14%'), P('Alle drei Tests bleiben ruhig mit 0,95 · 0,95 · 0,95, das sind rund 86 %. Das Gegenteil, mindestens ein Fehlalarm, hat die übrigen 14 %.', 'All three tests stay quiet with 0.95 · 0.95 · 0.95, which is about 86%. The opposite, at least one false alarm, has the remaining 14%.'), true),
      a(P('Genau 5 %', 'Exactly 5%'), P('5 % gilt für einen einzelnen Test. Mit drei Tests wächst die Zahl der Gelegenheiten für einen Fehlalarm.', '5% holds for a single test. With three tests the number of opportunities for a false alarm grows.')),
      a(P('Rund 15 %', 'About 15%'), P('15 % entsteht durch Addieren von drei mal 5 %. Dabei würden Fälle doppelt gezählt, in denen zwei Tests zugleich Alarm geben.', '15% arises from adding three times 5%. That would count cases twice in which two tests raise an alarm at the same time.')),
      a(P('Rund 86 %', 'About 86%'), P('86 % ist die Wahrscheinlichkeit, dass alle drei Tests ruhig bleiben. Gefragt ist das Gegenteil: 100 % minus 86 %.', '86% is the probability that all three tests stay quiet. The opposite is asked for: 100% minus 86%.'))
    ],
    hilfe: ['sf-p-hacking', 'familienfehlerrate'], belege: ['wissen:alpha-kumulierung', 'Hilfe:sf-p-hacking']
  },
  {
    id: 'sf-ph-risiko20', thema: 'sauberforschen',
    stamm: P('Eine Studie prüft 20 voneinander unabhängige Zielgrößen jeweils auf dem Niveau 5 %, ohne echten Effekt. Wie oft kommt es etwa zu mindestens einem Fehlalarm?', 'A study tests 20 mutually independent outcomes, each at the 5% level, without a real effect. How often does at least one false alarm occur?'),
    antworten: [
      a(P('In etwa zwei von drei Studien', 'In about two out of three studies'), P('1 − 0,95 hoch 20 ergibt rund 64 %, das ist ungefähr zwei von drei. Mit 20 Gelegenheiten ist ein Fehlalarm die Regel.', '1 − 0.95 to the power of 20 gives about 64%, which is roughly two out of three. With 20 opportunities a false alarm is the rule.'), true),
      a(P('In etwa einer von 20 Studien', 'In about one out of 20 studies'), P('Eine von 20 entspricht 5 % und gilt für einen einzelnen Test. Hier gibt es 20 Tests, und jeder kann Alarm geben.', 'One out of 20 corresponds to 5% and holds for a single test. Here there are 20 tests, and each can raise an alarm.')),
      a(P('In etwa jeder zweiten Studie', 'In about every second study'), P('50 % wird bei 14 Zielgrößen erreicht. Bei 20 Zielgrößen liegt das Risiko darüber, bei rund 64 %.', '50% is reached with 14 outcomes. With 20 outcomes the risk is above it, at about 64%.')),
      a(P('In etwa neun von zehn Studien', 'In about nine out of ten studies'), P('90 % wäre erst bei Studien mit rund 45 Zielgrößen zu erwarten. Mit 20 liegt es bei rund 64 %.', '90% would be expected only for studies with about 45 outcomes. With 20 it is about 64%.'))
    ],
    hilfe: ['sf-p-hacking', 'familienfehlerrate'], belege: ['wissen:alpha-kumulierung', 'wissen:simmons11-freiheitsgrade', 'Hilfe:sf-p-hacking']
  },
  {
    id: 'sf-ph-bonferroni', thema: 'sauberforschen',
    stamm: P('Eine Auswertung enthält 5 geplante Tests, das Gesamtniveau soll bei 5 % bleiben. Welches Niveau gilt bei der einfachen Bonferroni-Korrektur für jeden einzelnen Test?', 'An analysis contains 5 planned tests, the overall level is to stay at 5%. Which level applies to each single test with the simple Bonferroni correction?'),
    antworten: [
      a(P('Je Test 1 %', 'Each test 1%'), P('Das Gesamtniveau wird durch die Zahl der Tests geteilt: 5 % : 5 = 1 %. Dann bleibt das Risiko für mindestens einen Fehlalarm höchstens bei 5 %.', 'The overall level is divided by the number of tests: 5% : 5 = 1%. Then the risk of at least one false alarm stays at most at 5%.'), true),
      a(P('Je Test 5 %', 'Each test 5%'), P('Mit 5 % je Test wüchse das Gesamtrisiko auf rund 23 %. Das Niveau muss für jeden Test kleiner werden.', 'With 5% per test the overall risk would grow to about 23%. The level has to become smaller for each test.')),
      a(P('Je Test 25 %', 'Each test 25%'), P('25 % ergibt sich beim Multiplizieren mit 5. Je mehr Tests, desto kleiner muss das Niveau je Test sein, nicht größer.', '25% results from multiplying by 5. The more tests, the smaller the level per test must be, not larger.')),
      a(P('Je Test 0,2 %', 'Each test 0.2%'), P('0,2 % wäre eine Teilung durch 25. Bonferroni teilt nur durch die Zahl der Tests, hier 5.', '0.2% would be a division by 25. Bonferroni divides only by the number of tests, here 5.'))
    ],
    hilfe: ['sf-p-hacking', 'bonferroni'], belege: ['wissen:alpha-kumulierung', 'Hilfe:sf-p-hacking']
  },
  {
    id: 'sf-ph-stoppen', thema: 'sauberforschen',
    stamm: P('Ein Team prüft nach jeder neuen Person, ob p unter 5 % liegt, und beendet die Erhebung beim ersten Treffer. Was geschieht mit dem Fehlalarmrisiko?', 'A team checks after every new person whether p is below 5% and ends the collection at the first hit. What happens to the false alarm risk?'),
    antworten: [
      a(P('Es liegt deutlich über 5 %, weil jeder Zwischenblick ein weiterer Test ist', 'It is well above 5% because every interim look is a further test'), P('Bei jedem Zwischenblick besteht die Chance auf einen zufälligen Treffer. In einer Simulation ergaben sich rund 22 % Fehlalarme statt 5 %.', 'At every interim look there is a chance of a chance hit. A simulation gave about 22% false alarms instead of 5%.'), true),
      a(P('Es bleibt bei 5 %, weil das Niveau je Test gleich bleibt', 'It stays at 5% because the level per test stays the same'), P('Das Niveau je Test bleibt, das Risiko über alle Zwischenblicke zusammen steigt. Entscheidend ist, wie oft geschaut wird.', 'The level per test stays, the risk across all interim looks together rises. What matters is how often one looks.')),
      a(P('Es sinkt, weil mehr Daten vorliegen', 'It falls because more data are available'), P('Mehr Daten machen eine Schätzung genauer, aber die Zahl der Gelegenheiten für einen Zufallstreffer wächst. Das Risiko sinkt dadurch nicht.', 'More data make an estimate more precise, but the number of opportunities for a chance hit grows. The risk does not fall because of that.')),
      a(P('Es hängt nur von der Zahl der Personen am Ende ab', 'It depends only on the number of people at the end'), P('Maßgeblich ist die Regel, nach der aufgehört wird. Dieselbe Endzahl ergibt mit und ohne Abbruch nach Treffer verschiedene Risiken.', 'What matters is the rule by which one stops. The same final number gives different risks with and without stopping at a hit.'))
    ],
    hilfe: ['sf-p-hacking', 'optionales-stoppen'], belege: ['wissen:simmons11-optionales-stoppen', 'Hilfe:sf-p-hacking']
  },
  {
    id: 'sf-ph-harking', thema: 'sauberforschen',
    stamm: P('Ein Bericht nennt als Hypothese genau den Unterschied, der erst nach Sicht der Daten auffiel, und stellt ihn als von Anfang an geplant dar. Wie heißt dieses Vorgehen?', 'A report names as hypothesis exactly the difference that only caught the eye after seeing the data and presents it as planned from the start. What is this practice called?'),
    antworten: [
      a(P('HARKing', 'HARKing'), P('Das Kürzel steht für „Hypothesizing After the Results are Known“. Die nachträgliche Hypothese wird so dargestellt, als wäre sie vorab geplant gewesen.', 'The abbreviation stands for "Hypothesizing After the Results are Known". The hypothesis made afterwards is presented as if it had been planned beforehand.'), true),
      a(P('Randomisierung', 'Randomisation'), P('Randomisierung ist die zufällige Zuteilung zu Gruppen vor dem Versuch. Mit nachträglichen Hypothesen hat sie nichts zu tun.', 'Randomisation is the random assignment to groups before the experiment. It has nothing to do with hypotheses made afterwards.')),
      a(P('Replikation', 'Replication'), P('Replikation heißt, eine Studie mit neuen Daten zu wiederholen. Sie ist eher ein Mittel gegen nachträgliche Hypothesen.', 'Replication means repeating a study with new data. It is rather a remedy against hypotheses made afterwards.')),
      a(P('Bonferroni-Korrektur', 'Bonferroni correction'), P('Die Bonferroni-Korrektur senkt das Niveau je Test bei mehreren Tests. Sie betrifft den Zeitpunkt der Hypothese nicht.', 'The Bonferroni correction lowers the level per test when there are several tests. It does not concern the time of the hypothesis.'))
    ],
    hilfe: ['sf-p-hacking', 'harking'], belege: ['wissen:wasserstein16-selektives-berichten', 'Hilfe:sf-p-hacking']
  },
  {
    id: 'sf-ph-absicht', thema: 'sauberforschen',
    stamm: P('Wann kann p-Hacking vorkommen?', 'When can p-hacking occur?'),
    antworten: [
      a(P('Auch ohne Täuschungsabsicht, wenn Entscheidungen nach dem Blick auf die Daten fallen', 'Even without intent to deceive, when decisions are made after looking at the data'), P('Jede Entscheidung nach Sicht der Daten erweitert die Zahl der möglichen Auswertungen. Das geschieht oft aus Mehrdeutigkeit und dem Wunsch nach einem klaren Ergebnis.', 'Every decision after seeing the data widens the number of possible analyses. This often happens from ambiguity and the wish for a clear result.'), true),
      a(P('Nur wenn Daten bewusst gefälscht werden', 'Only if data are deliberately falsified'), P('Gefälschte Daten sind ein anderes, schwereres Problem. Beim p-Hacking können alle Daten echt sein, nur die Auswahl der Auswertung ist verzerrt.', 'Falsified data are another, graver problem. With p-hacking all data can be genuine, only the choice of analysis is biased.')),
      a(P('Nur bei sehr kleinen Stichproben', 'Only with very small samples'), P('Die Stichprobengröße ist nicht die Ursache. Auch bei großen Stichproben lassen sich viele Auswertungswege ausprobieren.', 'The sample size is not the cause. With large samples, too, many analysis paths can be tried.')),
      a(P('Nur bei Verfahren mit mehr als zwei Gruppen', 'Only with procedures with more than two groups'), P('Schon beim Vergleich zweier Gruppen gibt es Wahlmöglichkeiten: Zielgrößen, Ausschlüsse, Kontrollgrößen. Die Zahl der Gruppen ist dafür keine Bedingung.', 'Even in the comparison of two groups there are choices: outcomes, exclusions, control variables. The number of groups is no condition for that.'))
    ],
    hilfe: ['sf-p-hacking', 'forschungsfreiheitsgrade'], belege: ['wissen:simmons11-freiheitsgrade', 'wissen:wasserstein16-selektives-berichten', 'Hilfe:sf-p-hacking']
  },
  {
    id: 'sf-ph-mehrfach', thema: 'sauberforschen', mehrfach: true,
    stamm: P('Welche Aussagen zu Forschungsfreiheitsgraden stimmen? Mehrere können stimmen.', 'Which statements about researcher degrees of freedom are true? Several can be true.'),
    antworten: [
      a(P('Jede Entscheidung nach Sicht der Daten kann die Zahl möglicher Auswertungen vergrößern', 'Every decision after seeing the data can enlarge the number of possible analyses'), P('Weiter erheben, Werte ausschließen, Gruppen zusammenfassen oder eine andere Zielgröße wählen: Jede Wahl ist ein weiterer Weg, und jeder Weg kann ein anderes p ergeben.', 'Collecting more, excluding values, merging groups or choosing another outcome: every choice is a further path, and every path can give a different p.'), true),
      a(P('Ein vorab festgelegter Auswertungsplan sperrt viele dieser Freiheiten', 'An analysis plan fixed beforehand locks many of these freedoms'), P('Was vor den Daten feststeht, kann nicht mehr nach ihnen gewählt werden. Darum verringert ein Plan die Zahl der Wege.', 'What is fixed before the data cannot be chosen after them. That is why a plan reduces the number of paths.'), true),
      a(P('Die Zahl der Freiheiten spielt keine Rolle, wenn der berichtete p-Wert klein ist', 'The number of freedoms plays no role if the reported p value is small'), P('Gerade ein kleines p, das unter vielen Wegen ausgewählt wurde, ist kaum deutbar. Die Zahl der Wege bestimmt, wie viel ein kleines p wert ist.', 'Precisely a small p that was selected among many paths is hardly interpretable. The number of paths determines how much a small p is worth.')),
      a(P('Das Fehlalarmrisiko bleibt bei 5 %, solange jeder einzelne Test auf dem Niveau 5 % läuft', 'The false alarm risk stays at 5% as long as each single test runs at the 5% level'), P('Das Niveau gilt je Test. Über viele Tests zusammen wächst das Risiko auf 1 − (1 − α) hoch m.', 'The level holds per test. Across many tests together the risk grows to 1 − (1 − α) to the power of m.'))
    ],
    hilfe: ['sf-p-hacking', 'forschungsfreiheitsgrade'], belege: ['wissen:simmons11-freiheitsgrade', 'wissen:alpha-kumulierung', 'Hilfe:sf-p-hacking']
  },

  // ======================================================== 3. Vorregistrierung
  {
    id: 'sf-vr-was', thema: 'sauberforschen',
    stamm: P('Was gehört in einen Plan, der vor der Datenerhebung hinterlegt wird?', 'What belongs in a plan that is deposited before the data collection?'),
    antworten: [
      a(P('Hypothesen mit Richtung, Fallzahl mit Begründung, Abbruchregel und Auswertungsverfahren', 'Hypotheses with direction, sample size with reasoning, stopping rule and analysis procedure'), P('Das sind die Entscheidungen, die sonst erst nach Sicht der Daten fielen. Vorab festgelegt, lassen sie sich später nicht mehr zum Ergebnis passend wählen.', 'These are the decisions that would otherwise be made only after seeing the data. Fixed beforehand, they can no longer be chosen later to suit the result.'), true),
      a(P('Das erwartete Ergebnis der Studie als genaue Zahl', 'The expected result of the study as an exact number'), P('Ein Plan sagt, was geprüft und wie ausgewertet wird, nicht, welche Zahl herauskommt. Die Studie soll das Ergebnis erst liefern.', 'A plan says what is tested and how it is analysed, not which number comes out. The study is to deliver the result first.')),
      a(P('Nur das Thema der Studie und die Namen des Teams', 'Only the topic of the study and the names of the team'), P('Thema und Namen allein legen nichts fest, was später die Wahl der Auswertung einschränkt. Erst die konkreten Entscheidungen tun das.', 'Topic and names alone fix nothing that restricts the choice of analysis later. Only the concrete decisions do that.')),
      a(P('Eine Deutung der Ergebnisse, geschrieben vor der Auswertung', 'An interpretation of the results, written before the analysis'), P('Ergebnisse gibt es vor der Auswertung nicht, also lässt sich nichts deuten. Festgelegt wird, wie ausgewertet und wann entschieden wird.', 'There are no results before the analysis, so nothing can be interpreted. What is fixed is how to analyse and when to decide.'))
    ],
    hilfe: ['sf-vorregistrierung', 'praeregistrierung'], belege: ['wissen:alpha-vorab-festlegen', 'wissen:simmons11-freiheitsgrade', 'Hilfe:sf-vorregistrierung']
  },
  {
    id: 'sf-vr-wege', thema: 'sauberforschen',
    stamm: P('Ohne Plan bleiben drei Entscheidungen mit 2, 5 und 3 Möglichkeiten offen. Wie viele Auswertungswege ergeben sich?', 'Without a plan three decisions with 2, 5 and 3 options stay open. How many analysis paths result?'),
    antworten: [
      a(P('30 Wege', '30 paths'), P('Jede Möglichkeit jeder Entscheidung lässt sich mit den anderen kombinieren, darum wird multipliziert: 2 · 5 · 3 = 30.', 'Every option of every decision can be combined with the others, so the options are multiplied: 2 · 5 · 3 = 30.'), true),
      a(P('10 Wege', '10 paths'), P('10 ist die Summe 2 + 5 + 3. Die Entscheidungen lassen sich aber miteinander kombinieren, und das ergibt mehr Wege als die Summe.', '10 is the sum 2 + 5 + 3. The decisions can be combined with each other, though, and that gives more paths than the sum.')),
      a(P('15 Wege', '15 paths'), P('15 ist 5 · 3 und lässt die Entscheidung mit 2 Möglichkeiten weg. Alle drei Entscheidungen gehen in die Zahl der Wege ein.', '15 is 5 · 3 and leaves out the decision with 2 options. All three decisions enter the number of paths.')),
      a(P('6 Wege', '6 paths'), P('6 ist 2 · 3 und lässt die Entscheidung mit 5 Möglichkeiten weg. Auch sie öffnet Wege, die ohne Plan offen bleiben.', '6 is 2 · 3 and leaves out the decision with 5 options. It, too, opens paths that stay open without a plan.'))
    ],
    hilfe: ['sf-vorregistrierung', 'forschungsfreiheitsgrade'], belege: ['wissen:simmons11-freiheitsgrade', 'Hilfe:sf-vorregistrierung']
  },
  {
    id: 'sf-vr-abweichen', thema: 'sauberforschen',
    stamm: P('Bei der Auswertung zeigt sich, dass eine im Plan genannte Annahme verletzt ist. Was ist im Sinn der Vorregistrierung richtig?', 'During the analysis it turns out that an assumption named in the plan is violated. What is right in the sense of preregistration?'),
    antworten: [
      a(P('Vom Plan abweichen und die Abweichung samt Grund im Bericht nennen', 'Deviate from the plan and state the deviation with the reason in the report'), P('Ein Plan darf nachgebessert werden, wenn das offen geschieht. Wer die Abweichung begründet, macht den Unterschied zwischen geplant und nachträglich sichtbar.', 'A plan may be amended if that is done openly. Whoever gives the reason for the deviation makes the difference between planned and post hoc visible.'), true),
      a(P('Den Plan still ändern, damit er zu den Daten passt', 'Quietly change the plan so that it fits the data'), P('Ein heimlich geänderter Plan hat seinen Zweck verloren. Er zeigt dann nicht mehr, was vor den Daten feststand.', 'A secretly changed plan has lost its purpose. It then no longer shows what was fixed before the data.')),
      a(P('Die Studie verwerfen, weil jede Abweichung sie ungültig macht', 'Discard the study because every deviation makes it invalid'), P('Abweichungen sind erlaubt, wenn sie offengelegt werden. Verworfen wird dadurch nichts, nur die Deutung wird vorsichtiger.', 'Deviations are allowed if they are disclosed. Nothing is discarded by that, only the interpretation becomes more careful.')),
      a(P('Beim Plan bleiben und die Verletzung verschweigen', 'Stick to the plan and conceal the violation'), P('Eine verletzte Annahme kann das Ergebnis verfälschen. Wer sie verschweigt, nimmt der Leserschaft die Möglichkeit, das zu beurteilen.', 'A violated assumption can distort the result. Whoever conceals it takes away from the readers the possibility to judge that.'))
    ],
    hilfe: ['sf-vorregistrierung', 'praeregistrierung'], belege: ['wissen:alpha-vorab-festlegen', 'Hilfe:sf-vorregistrierung']
  },
  {
    id: 'sf-vr-zusatz', thema: 'sauberforschen',
    stamm: P('Die Auswertung zeigt zusätzlich einen auffälligen Unterschied, der im Plan fehlte. Wie wird er berichtet?', 'The analysis additionally shows a striking difference that was missing in the plan. How is it reported?'),
    antworten: [
      a(P('Als nachträglich und erkundend gekennzeichnet, als Anregung für eine neue Studie', 'Marked as post hoc and exploratory, as a suggestion for a new study'), P('Zusatzanalysen sind erlaubt, wenn sie als nachträglich gelten. Sie liefern Ideen, die sich in einer neuen Studie mit neuen Daten prüfen lassen.', 'Additional analyses are allowed if they count as post hoc. They provide ideas that can be tested in a new study with new data.'), true),
      a(P('Als geplanter Hauptbefund, weil er überzeugend ist', 'As a planned main finding because it is convincing'), P('Dann entstünde HARKing: Ein nachträglicher Befund würde als vorab geplant ausgegeben. Wie überzeugend er wirkt, ändert daran nichts.', 'That would be HARKing: a post hoc finding would be presented as planned beforehand. How convincing it looks changes nothing about that.')),
      a(P('Gar nicht, weil Zusatzanalysen verboten sind', 'Not at all because additional analyses are forbidden'), P('Zusatzanalysen sind nicht verboten. Verlangt wird nur, dass sie offen als nachträglich gekennzeichnet werden.', 'Additional analyses are not forbidden. All that is required is that they are openly marked as post hoc.')),
      a(P('Mit einem kleineren Niveau, dann gilt er als geplant', 'With a smaller level, then it counts as planned'), P('Ein strengeres Niveau macht eine Analyse nicht zu einer geplanten. Geplant ist, was vor den Daten feststand.', 'A stricter level does not turn an analysis into a planned one. Planned is what was fixed before the data.'))
    ],
    hilfe: ['sf-vorregistrierung', 'harking'], belege: ['wissen:alpha-vorab-festlegen', 'wissen:wasserstein16-selektives-berichten', 'Hilfe:sf-vorregistrierung']
  },
  {
    id: 'sf-vr-bericht', thema: 'sauberforschen',
    stamm: P('Was unterscheidet einen registrierten Bericht von einer Vorregistrierung allein?', 'What distinguishes a registered report from a preregistration alone?'),
    antworten: [
      a(P('Die Zeitschrift prüft Fragestellung und Plan vor der Datenerhebung und sagt die Veröffentlichung unabhängig vom Ergebnis zu', 'The journal reviews question and plan before the data collection and promises publication regardless of the result'), P('Dadurch entscheidet das Ergebnis nicht mehr über die Veröffentlichung. Das nimmt den Anreiz, nach einem auffälligen p zu suchen.', 'As a result the outcome no longer decides about publication. That removes the incentive to search for a striking p.'), true),
      a(P('Er wird erst nach dem Ergebnis geschrieben und dann eingereicht', 'It is written only after the result and then submitted'), P('Das ist der übliche Ablauf ohne Registrierung. Der registrierte Bericht verlegt die Begutachtung vor die Datenerhebung.', 'That is the usual procedure without registration. The registered report moves the review before the data collection.')),
      a(P('Er enthält nur die Ergebnisse mit p unter 5 %', 'It contains only the results with p below 5%'), P('Gerade das soll vermieden werden: Berichtet wird, was geplant war, auch bei einem unauffälligen Ergebnis.', 'That is exactly what is to be avoided: what was planned is reported, even with an unremarkable result.')),
      a(P('Er ersetzt den Plan durch eine Absichtserklärung', 'It replaces the plan with a declaration of intent'), P('Der Plan bleibt Kern des Berichts, und er wird vorab genauer geprüft. Eine bloße Absichtserklärung legt nichts fest.', 'The plan remains the core of the report, and it is reviewed in more detail beforehand. A mere declaration of intent fixes nothing.'))
    ],
    hilfe: ['sf-vorregistrierung', 'registrierter-bericht'], belege: ['wissen:simmons11-freiheitsgrade', 'Hilfe:sf-vorregistrierung']
  },
  {
    id: 'sf-vr-rekrutieren', thema: 'sauberforschen',
    stamm: P('Für 100 auswertbare Personen werden bei 20 % erwarteten Ausfällen wie viele Personen angeworben?', 'For 100 analysable people with 20% expected dropouts, how many people are recruited?'),
    antworten: [
      a(P('125 Personen', '125 people'), P('Von den Angeworbenen bleiben 80 % übrig. Gesucht ist die Zahl, die mit 0,8 malgenommen 100 ergibt: 100 : 0,8 = 125.', 'Of those recruited 80% remain. The number sought gives 100 when multiplied by 0.8: 100 : 0.8 = 125.'), true),
      a(P('120 Personen', '120 people'), P('120 entsteht, wenn 20 % auf die 100 aufgeschlagen werden. Die 20 % beziehen sich aber auf die Angeworbenen, nicht auf die 100.', '120 arises when 20% is added to the 100. The 20%, however, refers to those recruited, not to the 100.')),
      a(P('100 Personen', '100 people'), P('Bei 100 Angeworbenen blieben nach 20 % Ausfall nur 80 auswertbar. Der Ausfall muss vorab eingeplant werden.', 'With 100 recruited only 80 would remain analysable after 20% dropout. The dropout has to be planned for beforehand.')),
      a(P('80 Personen', '80 people'), P('80 ist das, was von 100 Angeworbenen übrig bliebe. Gefragt ist die Zahl, die zu Beginn nötig ist.', '80 is what would remain of 100 recruited. The number needed at the start is asked for.'))
    ],
    hilfe: ['sf-vorregistrierung', 'fallzahlplanung'], belege: ['wissen:power-vier-groessen', 'Hilfe:sf-vorregistrierung']
  },
  {
    id: 'sf-vr-mehrfach', thema: 'sauberforschen', mehrfach: true,
    stamm: P('Welche Aussagen zur Vorregistrierung stimmen? Mehrere können stimmen.', 'Which statements about preregistration are true? Several can be true.'),
    antworten: [
      a(P('Sie macht sichtbar, welche Analysen vor den Daten feststanden', 'It makes visible which analyses were fixed before the data'), P('Das ist ihr Zweck: Wer den Plan mit dem Bericht vergleicht, sieht, was geplant war und was erst nachträglich dazukam.', 'That is its purpose: whoever compares the plan with the report sees what was planned and what was added only afterwards.'), true),
      a(P('Die Poweranalyse mit einer Annahme zum Effekt gehört vor die Studie in den Plan', 'The power analysis with an assumption about the effect belongs in the plan before the study'), P('Alpha, Effektgröße, Power und Fallzahl hängen zusammen. Die Berechnung braucht keine Daten und gehört deshalb vor die Studie.', 'Alpha, effect size, power and sample size are linked. The calculation needs no data and therefore belongs before the study.'), true),
      a(P('Sie garantiert, dass Messung und Fallzahl der Studie taugen', 'It guarantees that measurement and sample size of the study are sound'), P('Sie legt fest, was geplant ist, sie bewertet es nicht. Ein schwacher Plan, genau befolgt, bleibt ein schwacher Plan.', 'It fixes what is planned, it does not assess it. A weak plan, followed exactly, remains a weak plan.')),
      a(P('Mit ihr sind spätere Zusatzanalysen ausgeschlossen', 'With it later additional analyses are ruled out'), P('Zusatzanalysen bleiben möglich, wenn sie als nachträglich gekennzeichnet werden. Ausgeschlossen ist nur, sie als geplant auszugeben.', 'Additional analyses remain possible if they are marked as post hoc. All that is ruled out is presenting them as planned.'))
    ],
    hilfe: ['sf-vorregistrierung', 'praeregistrierung'], belege: ['wissen:alpha-vorab-festlegen', 'wissen:power-vier-groessen', 'Hilfe:sf-vorregistrierung']
  },

  // ======================================================== 4. Grundsätze zum p-Wert
  {
    id: 'sf-pg-bedeutung', thema: 'sauberforschen',
    stamm: P('Ein Test liefert p = 0,03. Was sagt dieser Wert aus?', 'A test gives p = 0.03. What does this value say?'),
    antworten: [
      a(P('Gälten Nullhypothese und alle Annahmen der Rechnung, wären mindestens so extreme Daten in etwa 3 von 100 Fällen zu erwarten', 'If the null hypothesis and all assumptions of the calculation held, data at least this extreme would be expected in about 3 of 100 cases'), P('Der p-Wert ist eine Aussage über die Daten unter einem angenommenen Modell. Er beschreibt, wie gut oder schlecht die Daten zu diesem Modell passen.', 'The p value is a statement about the data under an assumed model. It describes how well or how poorly the data fit this model.'), true),
      a(P('Die Nullhypothese ist mit 3 % Wahrscheinlichkeit wahr', 'The null hypothesis is true with a probability of 3%'), P('Das wäre eine Aussage über die Hypothese. Der p-Wert rechnet unter der Annahme, dass sie gilt, und kann ihre Wahrscheinlichkeit nicht angeben.', 'That would be a statement about the hypothesis. The p value calculates under the assumption that it holds and cannot give its probability.')),
      a(P('Der Effekt existiert mit 97 % Wahrscheinlichkeit', 'The effect exists with a probability of 97%'), P('Die 97 % ergeben sich nur durch Umkehren des p-Werts. Dafür bräuchte es eine Annahme darüber, wie plausibel der Effekt vorab war.', 'The 97% arise only by reversing the p value. That would require an assumption about how plausible the effect was beforehand.')),
      a(P('In 3 % der Fälle war nur Zufall im Spiel', 'In 3% of cases only chance was at work'), P('Der p-Wert nennt keinen Anteil von Fällen, in denen Zufall die Ursache war. Er rechnet mit einem Modell, in dem Zufall bereits vorausgesetzt ist.', 'The p value gives no share of cases in which chance was the cause. It works with a model in which chance is already presupposed.'))
    ],
    hilfe: ['sf-p-grundsaetze', 'p-wert'], belege: ['wissen:p-wert-definition', 'wissen:greenland16-p-keine-hypothesenwahrscheinlichkeit', 'Hilfe:sf-p-grundsaetze']
  },
  {
    id: 'sf-pg-fallzahl', thema: 'sauberforschen',
    stamm: P('Zwei Studien finden denselben Unterschied der Mittelwerte bei gleicher Streuung. Studie A hat 20 Personen je Gruppe, Studie B 160. Was gilt für die p-Werte?', 'Two studies find the same difference of the means with the same spread. Study A has 20 people per group, study B 160. What holds for the p values?'),
    antworten: [
      a(P('B hat das kleinere p, weil bei größerer Fallzahl der Standardfehler sinkt', 'B has the smaller p because the standard error falls with a larger sample size'), P('Derselbe Unterschied wird bei kleinerem Standardfehler zu einem größeren t und damit zu einem kleineren p. Der Effekt bleibt gleich, die Messgenauigkeit wächst.', 'The same difference becomes a larger t at a smaller standard error and thus a smaller p. The effect stays the same, the precision grows.'), true),
      a(P('Beide haben dasselbe p, weil der Effekt gleich ist', 'Both have the same p because the effect is the same'), P('Der p-Wert hängt nicht nur vom Effekt ab, sondern auch von der Genauigkeit der Schätzung. Beide Studien messen denselben Effekt verschieden genau.', 'The p value depends not only on the effect but also on the precision of the estimate. Both studies measure the same effect with different precision.')),
      a(P('A hat das kleinere p, weil kleine Gruppen deutlichere Unterschiede zeigen', 'A has the smaller p because small groups show clearer differences'), P('Kleine Gruppen streuen im Mittelwert stärker, ein Unterschied hebt sich dort weniger vom Zufall ab. Der Unterschied selbst ist ja in beiden Studien gleich.', 'Small groups vary more in the mean, a difference stands out less from chance there. The difference itself is the same in both studies.')),
      a(P('B hat das größere p, weil mehr Personen mehr Streuung bringen', 'B has the larger p because more people bring more spread'), P('Mehr Personen ändern die Streuung der Einzelwerte nicht, sie verkleinern die Streuung des Mittelwerts. Der Standardfehler sinkt mit der Wurzel aus n.', 'More people do not change the spread of the single values, they reduce the spread of the mean. The standard error falls with the square root of n.'))
    ],
    hilfe: ['sf-p-grundsaetze', 'p-wert'], belege: ['wissen:wasserstein16-p-praezision-effekt', 'Hilfe:sf-p-grundsaetze']
  },
  {
    id: 'sf-pg-wurzel', thema: 'sauberforschen',
    stamm: P('Bei gleichem Effekt und gleicher Streuung wird die Fallzahl je Gruppe von 25 auf 100 vervierfacht. Was geschieht mit t?', 'With the same effect and the same spread the sample size per group is quadrupled from 25 to 100. What happens to t?'),
    antworten: [
      a(P('Es verdoppelt sich, weil t mit der Wurzel aus n wächst', 'It doubles because t grows with the square root of n'), P('Der Standardfehler enthält die Wurzel aus 2 : n. Vierfaches n halbiert ihn, und t = Unterschied : Standardfehler verdoppelt sich.', 'The standard error contains the square root of 2 : n. Four times n halves it, and t = difference : standard error doubles.'), true),
      a(P('Es vervierfacht sich', 'It quadruples'), P('Das wäre der Fall, wenn t im gleichen Maß wüchse wie n. t wächst aber nur mit der Wurzel aus n.', 'That would be so if t grew in step with n. t grows only with the square root of n.')),
      a(P('Es bleibt gleich, weil der Effekt gleich bleibt', 'It stays the same because the effect stays the same'), P('Der Effekt bleibt gleich, der Standardfehler wird kleiner. t vergleicht beides und wird deshalb größer.', 'The effect stays the same, the standard error becomes smaller. t compares both and therefore becomes larger.')),
      a(P('Es halbiert sich', 'It halves'), P('Das wäre der Fall bei einem größeren Standardfehler. Mehr Personen verkleinern ihn, daher steigt t.', 'That would be so with a larger standard error. More people reduce it, so t rises.'))
    ],
    hilfe: ['sf-p-grundsaetze', 'p-wert'], belege: ['wissen:wasserstein16-p-praezision-effekt', 'Hilfe:sf-p-grundsaetze']
  },
  {
    id: 'sf-pg-nicht-sig', thema: 'sauberforschen',
    stamm: P('Ein Gruppenvergleich mit 12 Personen je Gruppe ergibt p = 0,2. Was folgt daraus?', 'A group comparison with 12 people per group gives p = 0.2. What follows from that?'),
    antworten: [
      a(P('Mit diesen Daten lässt sich der Effekt nicht sicher vom Zufall unterscheiden; er ist weder belegt noch ausgeschlossen', 'With these data the effect cannot be told apart from chance with certainty; it is neither shown nor ruled out'), P('Ein großes p heißt nur, dass die Daten unter dem Modell nicht ungewöhnlich sind. Ob ein kleiner Effekt da ist, bleibt offen, das Konfidenzintervall zeigt die vereinbaren Größen.', 'A large p only means that the data are not unusual under the model. Whether a small effect exists stays open, the confidence interval shows the compatible sizes.'), true),
      a(P('Es gibt keinen Effekt', 'There is no effect'), P('Ein nicht signifikantes Ergebnis ist kein Beleg für fehlenden Effekt. Bei 12 Personen je Gruppe fehlt oft schlicht die Genauigkeit.', 'A non-significant result is no evidence for a missing effect. With 12 people per group the precision is often simply lacking.')),
      a(P('Der Effekt ist klein', 'The effect is small'), P('Die Größe des Effekts zeigt der p-Wert nicht. Auch ein großer Effekt kann bei wenigen Personen ein großes p ergeben.', 'The p value does not show the size of the effect. Even a large effect can give a large p with few people.')),
      a(P('Die Studie hat die Nullhypothese bewiesen', 'The study has proven the null hypothesis'), P('Eine Nullhypothese wird beibehalten, nicht bewiesen. Die Sicherheit dieser Entscheidung hängt von der Teststärke ab, die meist unbekannt ist.', 'A null hypothesis is retained, not proven. The certainty of this decision depends on the power, which is usually unknown.'))
    ],
    hilfe: ['sf-p-grundsaetze', 'signifikanzniveau'], belege: ['wissen:nicht-signifikant-kein-beleg', 'wissen:greenland16-nicht-signifikant', 'Hilfe:sf-p-grundsaetze']
  },
  {
    id: 'sf-pg-groesse', thema: 'sauberforschen',
    stamm: P('In einer Studie mit 5000 Personen ist ein winziger Unterschied signifikant. Was sagt der p-Wert über die Größe des Effekts?', 'In a study with 5000 people a tiny difference is significant. What does the p value say about the size of the effect?'),
    antworten: [
      a(P('Für sich allein nichts, die Größe zeigen Effektstärke und Konfidenzintervall', 'Nothing by itself, the size is shown by effect size and confidence interval'), P('Bei sehr vielen Personen wird auch ein winziger Effekt signifikant. Der p-Wert misst weder Größe noch Wichtigkeit.', 'With very many people even a tiny effect becomes significant. The p value measures neither size nor importance.'), true),
      a(P('Der Effekt ist groß, weil p so klein ist', 'The effect is large because p is so small'), P('Ein kleines p kann von einem großen Effekt kommen oder von einer großen Stichprobe. Beides lässt sich am p allein nicht trennen.', 'A small p can come from a large effect or from a large sample. The two cannot be separated from p alone.')),
      a(P('Der Effekt ist wichtig, weil er signifikant ist', 'The effect is important because it is significant'), P('Signifikant heißt statistisch auffällig, nicht praktisch wichtig. Wie wichtig ein Effekt ist, entscheidet der Sachzusammenhang.', 'Significant means statistically noticeable, not practically important. How important an effect is is decided by the subject matter.')),
      a(P('Der Effekt ist zwangsläufig klein, weil die Studie so groß ist', 'The effect is necessarily small because the study is so large'), P('Auch bei großen Studien können Effekte groß sein. Die Größe der Studie legt die Größe des Effekts nicht fest.', 'Effects can be large in large studies, too. The size of the study does not fix the size of the effect.'))
    ],
    hilfe: ['sf-p-grundsaetze', 'effektstaerke'], belege: ['wissen:signifikant-nicht-bedeutsam', 'wissen:wasserstein16-p-praezision-effekt', 'Hilfe:sf-p-grundsaetze']
  },
  {
    id: 'sf-pg-selektiv', thema: 'sauberforschen',
    stamm: P('Ein Team rechnet 40 Auswertungen und zeigt nur die 3 mit p unter 5 %. Was lässt sich über die gezeigten p-Werte sagen?', 'A team runs 40 analyses and shows only the 3 with p below 5%. What can be said about the p values shown?'),
    antworten: [
      a(P('Sie sind kaum deutbar, weil die Zahl der gerechneten Analysen verschwiegen wird', 'They are hardly interpretable because the number of analyses run is concealed'), P('Bei 40 Auswertungen sind einige p unter 5 % auch ohne Effekt zu erwarten. Ohne die Zahl aller Analysen lässt sich nicht beurteilen, was die gezeigten Werte bedeuten.', 'With 40 analyses some p below 5% are expected even without an effect. Without the number of all analyses it cannot be judged what the values shown mean.'), true),
      a(P('Sie sind gültig, weil jede einzelne Rechnung korrekt war', 'They are valid because every single calculation was correct'), P('Die einzelne Rechnung kann stimmen, und die Auswahl macht die Deutung trotzdem ungültig. Der p-Wert setzt voraus, dass die Analyse nicht nach dem Ergebnis gewählt wurde.', 'The single calculation can be right, and the selection still makes the interpretation invalid. The p value presupposes that the analysis was not chosen after the result.')),
      a(P('Sie sind gültig, wenn die Stichprobe groß ist', 'They are valid if the sample is large'), P('Eine große Stichprobe ändert an der Auswahl nichts. Auch dort ergeben viele Auswertungen einige auffällige p-Werte.', 'A large sample changes nothing about the selection. There, too, many analyses give some striking p values.')),
      a(P('Sie sind besonders aussagekräftig, weil sie ausgewählt wurden', 'They are particularly informative because they were selected'), P('Die Auswahl der kleinsten Werte macht sie eher zufällig auffällig als aussagekräftig. Das Gegenteil ist richtig.', 'Selecting the smallest values makes them rather by chance striking than informative. The opposite is true.'))
    ],
    hilfe: ['sf-p-grundsaetze', 'p-hacking'], belege: ['wissen:wasserstein16-selektives-berichten', 'wissen:alpha-kumulierung', 'Hilfe:sf-p-grundsaetze']
  },
  {
    id: 'sf-pg-mehrfach', thema: 'sauberforschen', mehrfach: true,
    stamm: P('Welche Aussagen zum p-Wert stimmen? Mehrere können stimmen.', 'Which statements about the p value are true? Several can be true.'),
    antworten: [
      a(P('Er sagt, wie schlecht die Daten zu einem Modell mit Nullhypothese passen', 'It says how poorly the data fit a model with a null hypothesis'), P('Ein kleiner p-Wert zeigt, dass die Daten schlecht zum Modell passen. Welche Annahme des Modells schuld ist, sagt er nicht.', 'A small p value shows that the data fit the model poorly. Which assumption of the model is to blame it does not say.'), true),
      a(P('Ein Bericht soll neben p auch Effektgröße und Intervall nennen', 'A report should give effect size and interval alongside p'), P('Erst sie zeigen, wie groß und wie genau der Effekt geschätzt ist. Dazu ist der p-Wert allein nicht in der Lage.', 'Only they show how large and how precisely the effect is estimated. The p value alone is not able to do that.'), true),
      a(P('Die Schwelle 5 % trennt echte von unechten Effekten', 'The threshold of 5% separates real from unreal effects'), P('Die Schwelle ist eine Konvention. Knapp darüber und knapp darunter liegen fast gleiche Daten, aber keine verschiedenen Welten.', 'The threshold is a convention. Just above and just below lie almost the same data, but not different worlds.')),
      a(P('Ein großes p belegt, dass es keinen Effekt gibt', 'A large p shows that there is no effect'), P('Ein großes p zeigt nur, dass kein Beleg vorliegt. Ob ein Effekt fehlt, lässt sich damit nicht sagen, vor allem bei kleiner Fallzahl.', 'A large p only shows that no evidence is available. Whether an effect is missing cannot be said from that, especially with a small sample.'))
    ],
    hilfe: ['sf-p-grundsaetze', 'p-wert'], belege: ['wissen:wasserstein16-kleines-p-modell', 'wissen:greenland16-signifikant-wichtig', 'Hilfe:sf-p-grundsaetze']
  },

  // ======================================================== 5. Bayes mit Vorwissen
  {
    id: 'sf-bv-prior', thema: 'sauberforschen',
    stamm: P('Was drückt ein Prior in der Bayes-Statistik aus?', 'What does a prior express in Bayesian statistics?'),
    antworten: [
      a(P('Das Wissen oder die Annahme über den unbekannten Wert, bevor die neuen Daten berücksichtigt sind', 'The knowledge or assumption about the unknown value before the new data are taken into account'), P('Der Prior beschreibt, welche Werte vor den Daten wie plausibel sind. Die Daten verändern ihn dann zum Posterior.', 'The prior describes which values are how plausible before the data. The data then change it into the posterior.'), true),
      a(P('Das Ergebnis der Studie nach der Auswertung der Daten', 'The result of the study after the analysis of the data'), P('Das Wissen nach den Daten heißt Posterior. Der Prior ist das Wissen davor.', 'The knowledge after the data is called posterior. The prior is the knowledge before.')),
      a(P('Die Wahrscheinlichkeit, unter der Nullhypothese mindestens so extreme Daten zu erhalten', 'The probability of data at least as extreme, if the null hypothesis holds'), P('Das beschreibt den p-Wert. Der Prior ist eine Verteilung über den unbekannten Wert, keine Wahrscheinlichkeit von Daten.', 'That describes the p value. The prior is a distribution over the unknown value, not a probability of data.')),
      a(P('Die Zahl der Personen, die für die Studie nötig sind', 'The number of people needed for the study'), P('Die nötige Zahl liefert eine Poweranalyse. Mit dem Prior hat sie nur zu tun, wenn er dort als Annahme dient.', 'The number needed is provided by a power analysis. It has to do with the prior only when it serves as an assumption there.'))
    ],
    hilfe: ['sf-bayes-vorwissen', 'prior'], belege: ['wissen:cohen94-inverse-wahrscheinlichkeit', 'wissen:altman94b-prior-posterior-lr', 'Hilfe:sf-bayes-vorwissen']
  },
  {
    id: 'sf-bv-posterior', thema: 'sauberforschen',
    stamm: P('Das Vorwissen über einen Anteil ist Beta(2, 8). Dann werden 5 Erfolge und 5 Misserfolge beobachtet. Welche Verteilung beschreibt das Wissen danach?', 'The prior knowledge about a proportion is Beta(2, 8). Then 5 successes and 5 failures are observed. Which distribution describes the knowledge afterwards?'),
    antworten: [
      a(P('Beta(7, 13)', 'Beta(7, 13)'), P('Erfolge werden zu a gezählt, Misserfolge zu b: a = 2 + 5 = 7 und b = 8 + 5 = 13.', 'Successes are added to a, failures to b: a = 2 + 5 = 7 and b = 8 + 5 = 13.'), true),
      a(P('Beta(5, 5)', 'Beta(5, 5)'), P('Beta(5, 5) beschreibt nur die neuen Daten. Das Vorwissen Beta(2, 8) zählt mit.', 'Beta(5, 5) describes only the new data. The prior Beta(2, 8) counts along.')),
      a(P('Beta(7, 8)', 'Beta(7, 8)'), P('Hier wurden die Erfolge zu a addiert, aber b blieb unverändert. Auch die 5 Misserfolge kommen zu b dazu.', 'Here the successes were added to a, but b stayed unchanged. The 5 failures are also added to b.')),
      a(P('Beta(2, 8), das Vorwissen ändert sich nicht', 'Beta(2, 8), the prior knowledge does not change'), P('Genau dafür sind Daten da: Sie verschieben das Wissen. Jede Beobachtung zählt zu a oder zu b.', 'That is exactly what data are for: they shift the knowledge. Every observation counts to a or to b.'))
    ],
    hilfe: ['sf-bayes-vorwissen', 'beta-binomial-modell'], belege: ['Hilfe:sf-bayes-vorwissen', 'Hilfe:beta-verteilung']
  },
  {
    id: 'sf-bv-mittel', thema: 'sauberforschen',
    stamm: P('Eine Beta-Verteilung hat a = 6 und b = 4. Welchen Anteil erwartet sie im Mittel?', 'A beta distribution has a = 6 and b = 4. Which share does it expect on average?'),
    antworten: [
      a(P('Im Mittel 60 %', 'On average 60%'), P('Der Mittelwert ist a : (a + b) = 6 : 10 = 60 %.', 'The mean is a : (a + b) = 6 : 10 = 60%.'), true),
      a(P('Im Mittel 40 %', 'On average 40%'), P('40 % ist b : (a + b) und damit der erwartete Anteil der Misserfolge. Gefragt ist der Anteil der Erfolge.', '40% is b : (a + b) and thus the expected share of failures. The share of successes is asked for.')),
      a(P('Im Mittel 50 %', 'On average 50%'), P('50 % gälte bei a = b. Hier ist a größer als b, also liegt der Mittelwert über der Hälfte.', '50% would hold for a = b. Here a is larger than b, so the mean is above half.')),
      a(P('Im Mittel 6 %', 'On average 6%'), P('6 ist a selbst, nicht der Anteil. Der Mittelwert teilt a durch die Summe a + b.', '6 is a itself, not the share. The mean divides a by the sum a + b.'))
    ],
    hilfe: ['sf-bayes-vorwissen', 'beta-verteilung'], belege: ['Hilfe:sf-bayes-vorwissen', 'Hilfe:beta-verteilung']
  },
  {
    id: 'sf-bv-staerke', thema: 'sauberforschen',
    stamm: P('Zwei Teams starten mit Beta(1, 1) und mit Beta(30, 30). Beide beobachten 10 Erfolge in 10 Versuchen. Welches Team verschiebt sein Wissen stärker?', 'Two teams start with Beta(1, 1) and with Beta(30, 30). Both observe 10 successes in 10 trials. Which team shifts its knowledge more?'),
    antworten: [
      a(P('Das Team mit Beta(1, 1), weil sein Vorwissen schwächer ist', 'The team with Beta(1, 1) because its prior knowledge is weaker'), P('Beta(1, 1) wiegt wie 2 Beobachtungen, die 10 Versuche überwiegen. Der Mittelwert springt von 50 % auf 92 %. Bei Beta(30, 30) steigt er nur auf 57 %.', 'Beta(1, 1) weighs like 2 observations, the 10 trials outweigh it. The mean jumps from 50% to 92%. With Beta(30, 30) it rises only to 57%.'), true),
      a(P('Das Team mit Beta(30, 30), weil es mehr Vorwissen hat', 'The team with Beta(30, 30) because it has more prior knowledge'), P('Mehr Vorwissen bedeutet mehr Gewicht und damit mehr Trägheit. Es braucht mehr Daten, um es zu verschieben.', 'More prior knowledge means more weight and thus more inertia. It takes more data to shift it.')),
      a(P('Beide gleich stark, weil die Daten gleich sind', 'Both equally, because the data are the same'), P('Dieselben Daten wirken verschieden, je nachdem, wie viel Gewicht das Vorwissen hat. Gerade das ist die Prior-Stärke.', 'The same data act differently depending on how much weight the prior has. That is exactly the prior strength.')),
      a(P('Keines, weil 10 Versuche zu wenig sind', 'Neither, because 10 trials are too few'), P('Auch 10 Versuche verschieben ein Vorwissen. Wie weit, hängt von dessen Stärke ab.', 'Even 10 trials shift a prior. How far depends on its strength.'))
    ],
    hilfe: ['sf-bayes-vorwissen', 'prior-staerke'], belege: ['Hilfe:sf-bayes-vorwissen', 'Hilfe:prior-staerke']
  },
  {
    id: 'sf-bv-zwischen', thema: 'sauberforschen',
    stamm: P('Das Vorwissen erwartet einen Anteil von 30 %, die Stichprobe zeigt 70 %. Wo liegt der Posterior-Mittelwert?', 'The prior expects a share of 30%, the sample shows 70%. Where does the posterior mean lie?'),
    antworten: [
      a(P('Zwischen 30 % und 70 %', 'Between 30% and 70%'), P('Der Posterior-Mittelwert ist ein gewichtetes Mittel aus Prior-Mittelwert und Anteil der Stichprobe. Er liegt immer dazwischen, näher bei dem mit mehr Gewicht.', 'The posterior mean is a weighted mean of prior mean and share of the sample. It lies between them, closer to the one with more weight.'), true),
      a(P('Bei 70 %, weil die Daten zählen', 'At 70% because the data count'), P('Die Daten zählen, aber das Vorwissen auch. Der Wert fällt nur bei unendlich viel Daten gegen den Stichprobenanteil.', 'The data count, but so does the prior. The value approaches the sample share only with an infinite amount of data.')),
      a(P('Bei 30 %, weil das Vorwissen zuerst da war', 'At 30% because the prior knowledge was there first'), P('Das Vorwissen wird durch die Daten verschoben, es bleibt nicht stehen. Die Reihenfolge entscheidet nicht, das Gewicht entscheidet.', 'The prior is shifted by the data, it does not stay put. The order does not decide, the weight decides.')),
      a(P('Über 70 %, weil sich beide Wissensquellen verstärken', 'Above 70% because both sources of knowledge reinforce each other'), P('Ein gewichtetes Mittel kann nie über seinem größten Einzelwert liegen. Hier widersprechen sich beide Quellen, sie verstärken sich nicht.', 'A weighted mean can never lie above its largest single value. Here the two sources contradict each other, they do not reinforce each other.'))
    ],
    hilfe: ['sf-bayes-vorwissen', 'posterior'], belege: ['wissen:altman94b-prior-posterior-lr', 'Hilfe:sf-bayes-vorwissen']
  },
  {
    id: 'sf-bv-subjektiv', thema: 'sauberforschen',
    stamm: P('Ein Einwand lautet, ein Prior mache das Ergebnis beliebig. Welche Antwort passt?', 'An objection says that a prior makes the result arbitrary. Which answer fits?'),
    antworten: [
      a(P('Der Prior wird offen genannt, und ein Gegenrechnen mit einem schwächeren Prior zeigt, wie viel er ausmacht', 'The prior is stated openly, and recalculating with a weaker prior shows how much it matters'), P('Die Annahme ist sichtbar und ihr Einfluss prüfbar. Mit mehr Daten verliert der Prior zudem an Gewicht.', 'The assumption is visible and its influence testable. With more data the prior also loses weight.'), true),
      a(P('Der Prior spielt rechnerisch keine Rolle', 'The prior plays no role in the calculation'), P('Er geht mit seinem Gewicht in den Posterior ein. Bei wenigen Daten ist sein Einfluss deutlich.', 'It enters the posterior with its weight. With few data its influence is clear.')),
      a(P('Der Prior wird nach Sicht der Daten so gewählt, dass das Ergebnis passt', 'The prior is chosen after seeing the data so that the result fits'), P('Das wäre genau die Beliebigkeit, vor der der Einwand warnt. Auch der Prior gehört vorab festgelegt.', 'That would be exactly the arbitrariness the objection warns about. The prior, too, belongs fixed beforehand.')),
      a(P('Nur der Prior Beta(1, 1) ist erlaubt', 'Only the prior Beta(1, 1) is allowed'), P('Beta(1, 1) ist ein möglicher schwacher Prior, aber kein vorgeschriebener. Nützliches Vorwissen darf ausdrücklich eingehen.', 'Beta(1, 1) is a possible weak prior, but not a prescribed one. Useful prior knowledge may expressly enter.'))
    ],
    hilfe: ['sf-bayes-vorwissen', 'prior-staerke'], belege: ['wissen:cohen94-inverse-wahrscheinlichkeit', 'Hilfe:sf-bayes-vorwissen']
  },
  {
    id: 'sf-bv-mehrfach', thema: 'sauberforschen', mehrfach: true,
    stamm: P('Welche Aussagen zu Prior und Posterior stimmen? Mehrere können stimmen.', 'Which statements about prior and posterior are true? Several can be true.'),
    antworten: [
      a(P('Der Posterior einer Studie kann in der nächsten Studie als Prior dienen', 'The posterior of one study can serve as the prior in the next study'), P('Das Wissen nach den Daten ist das Wissen vor den nächsten Daten. Bei der Beta-Verteilung werden einfach die neuen Zahlen dazugezählt.', 'The knowledge after the data is the knowledge before the next data. With the beta distribution the new numbers are simply counted along.'), true),
      a(P('Mit mehr Daten verliert ein Prior an Einfluss', 'With more data a prior loses influence'), P('Das Gewicht der Daten wächst mit ihrer Zahl, das des Priors bleibt gleich. Bei sehr vielen Daten entscheiden fast nur sie.', 'The weight of the data grows with their number, that of the prior stays the same. With very many data almost only they decide.'), true),
      a(P('Der Posterior-Mittelwert entspricht dem Anteil der Stichprobe, wie stark das Vorwissen auch ist', 'The posterior mean equals the share of the sample, however strong the prior knowledge is'), P('Der Posterior-Mittelwert liegt zwischen Prior-Mittelwert und Stichprobenanteil. Je stärker das Vorwissen, desto weiter weicht er vom Stichprobenanteil ab.', 'The posterior mean lies between prior mean and share of the sample. The stronger the prior knowledge, the further it departs from the sample share.')),
      a(P('Ein Prior muss aus den neuen Daten berechnet werden', 'A prior has to be calculated from the new data'), P('Der Prior stammt aus Wissen vor den Daten, etwa früheren Studien oder Fachwissen. Aus den Daten selbst gewonnen, würden sie doppelt gezählt.', 'The prior comes from knowledge before the data, for example earlier studies or expert knowledge. If obtained from the data themselves they would be counted twice.'))
    ],
    hilfe: ['sf-bayes-vorwissen', 'posterior'], belege: ['wissen:altman94b-prior-posterior-lr', 'wissen:cohen94-inverse-wahrscheinlichkeit', 'Hilfe:sf-bayes-vorwissen']
  },
  // ======================================================== 6. Ergebnis in R nachrechnen (LE3, 14.11.2026; Zahlen aus scripts/ueben-erwartet-r-skript.R, Wächter fragen-r-skript.test.ts)
  {
    id: 'sf-rs-zweck', thema: 'sauberforschen',
    stamm: P('Wozu gibt Statable eine Auswertung als R-Skript mit Daten mit? (Reproduzierbarkeit)', 'Why does Statable give an analysis as an R script with data? (reproducibility)'),
    antworten: [
      a(P('Damit eine andere Person dieselbe Rechnung mit einem zweiten Programm wiederholen und die Zahlen vergleichen kann', 'So that another person can repeat the same calculation with a second program and compare the numbers'), P('Das ist Reproduzierbarkeit: gleiche Daten, gleiche Schritte, gleiche Zahlen. Weil R unabhängig von Statable rechnet, fällt ein Rechenfehler beim Vergleich auf.', 'That is reproducibility: same data, same steps, same numbers. Because R calculates independently of Statable, a calculation error shows up in the comparison.'), true),
      a(P('Damit R ein genaueres Ergebnis liefert als Statable', 'So that R gives a more accurate result than Statable'), P('Das Skript soll dieselben Zahlen liefern, nicht bessere. Stimmen sie nach dem Runden überein, ist das die Bestätigung.', 'The script is meant to give the same numbers, not better ones. If they match after rounding, that is the confirmation.')),
      a(P('Damit die Daten verschlüsselt weitergegeben werden', 'So that the data are passed on encrypted'), P('Das Skript verschlüsselt nichts. Es liest die Daten aus einer gewöhnlichen CSV-Datei, die man auch weglassen kann.', 'The script encrypts nothing. It reads the data from an ordinary CSV file, which can also be left out.')),
      a(P('Damit sich prüfen lässt, ob der gewählte Test inhaltlich passt', 'So that one can check whether the chosen test fits the question'), P('Ein zweites Programm wiederholt die Rechnung, es beurteilt sie nicht. Ein unpassender Test bleibt auch in R unpassend.', 'A second program repeats the calculation; it does not judge it. An unsuitable test stays unsuitable in R too.'))
    ],
    hilfe: ['sf-r-skript', 'r-skript'], belege: ['Sandve et al. 2013, Ten simple rules for reproducible computational research', 'Hilfe:sf-r-skript']
  },
  {
    id: 'sf-rs-welch', thema: 'sauberforschen',
    stamm: P('Im R-Skript eines t-Tests stehen drei Zeilen (y ist der Messwert, g die Gruppe). Welche Zeile rechnet den Welch-Test?', 'The R script of a t-test contains three lines (y is the measured value, g the group). Which line calculates the Welch test?'),
    antworten: [
      a(P('t.test(y ~ g)', 't.test(y ~ g)'), P('Fehlt var.equal, rechnet t.test() in R den Welch-Test, der keine gleiche Streuung in beiden Gruppen annimmt.', 'If var.equal is missing, t.test() in R calculates the Welch test, which does not assume equal spread in both groups.'), true),
      a(P('t.test(y ~ g, var.equal = TRUE)', 't.test(y ~ g, var.equal = TRUE)'), P('var.equal = TRUE verlangt gleiche Streuung: Das ist der klassische t-Test mit gepoolter Streuung.', 'var.equal = TRUE demands equal spread: that is the classical t-test with pooled spread.')),
      a(P('anova(lm(abs(y - ave(y, g)) ~ g))', 'anova(lm(abs(y - ave(y, g)) ~ g))'), P('Diese Zeile vergleicht die Abstände vom Gruppenmittel: Das ist der Levene-Test auf gleiche Streuung, kein Mittelwertvergleich.', 'This line compares the distances from the group mean: that is the Levene test for equal spread, not a comparison of means.'))
    ],
    hilfe: ['sf-r-skript', 'welch-anova'], belege: ['R-Hilfeseite t.test (var.equal = FALSE als Vorgabe)', 'Code:lib/rskript.ts', 'Hilfe:sf-r-skript']
  },
  {
    id: 'sf-rs-levene', thema: 'sauberforschen',
    stamm: P('Die Skriptzeile anova(lm(abs(y - ave(y, g)) ~ g)) rechnet den Levene-Test. Was steckt in abs(y - ave(y, g))?', 'The script line anova(lm(abs(y - ave(y, g)) ~ g)) calculates the Levene test. What is in abs(y - ave(y, g))?'),
    antworten: [
      a(P('Der Abstand jedes Werts vom Mittelwert seiner Gruppe, ohne Vorzeichen', 'The distance of each value from the mean of its group, without sign'), P('ave(y, g) gibt jedem Wert den Mittelwert seiner Gruppe, abs() nimmt den Betrag. Unterscheiden sich diese Abstände im Mittel, streuen die Gruppen verschieden.', 'ave(y, g) gives each value the mean of its group, abs() takes the absolute value. If these distances differ on average, the groups spread differently.'), true),
      a(P('Der Abstand jedes Werts vom Median seiner Gruppe', 'The distance of each value from the median of its group'), P('Abstände vom Median nutzt der Brown-Forsythe-Test. ave() rechnet den Mittelwert, wie der Levene-Test in SPSS.', 'Distances from the median are used by the Brown-Forsythe test. ave() calculates the mean, like the Levene test in SPSS.')),
      a(P('Die quadrierte Abweichung vom Gesamtmittel aller Werte', 'The squared deviation from the overall mean of all values'), P('Quadriert wird hier nichts, und der Bezug ist das Mittel der eigenen Gruppe, nicht das Gesamtmittel.', 'Nothing is squared here, and the reference is the mean of the own group, not the overall mean.')),
      a(P('Der Unterschied der beiden Gruppenmittelwerte', 'The difference between the two group means'), P('Die Zeile liefert einen Wert je Fall, nicht eine Zahl je Vergleich. Den Mittelwertunterschied prüft der t-Test.', 'The line gives one value per case, not one number per comparison. The difference of means is tested by the t-test.'))
    ],
    hilfe: ['sf-r-skript', 'levene-test'], belege: ['Levene 1960', 'Code:lib/rskript.ts', 'Hilfe:sf-r-skript']
  },
  {
    id: 'sf-rs-typ3', thema: 'sauberforschen',
    stamm: P('Zweifaktorielle Varianzanalyse der Körpermasse von 333 Pinguinen nach Art und Geschlecht, Zellen ungleich besetzt. Statable zeigt für das Geschlecht F = 311,84. In R ergibt anova(lm(masse ~ art * geschlecht)) F = 387,46, mit Geschlecht zuerst F = 406,14. Woran liegt das?', 'Two-way analysis of variance of the body mass of 333 penguins by species and sex, cells unequally filled. Statable shows F = 311.84 for sex. In R, anova(lm(mass ~ species * sex)) gives F = 387.46, with sex first F = 406.14. What is the reason?'),
    antworten: [
      a(P('anova() rechnet der Reihe nach (Typ I), Statable rechnet Typ III; bei ungleich besetzten Zellen unterscheiden sich die Quadratsummen', 'anova() calculates in order (type I), Statable calculates type III; with unequally filled cells the sums of squares differ'), P('Bei Typ I hängt das Ergebnis von der Reihenfolge ab, darum gibt es zwei R-Werte. Typ III prüft jede Größe, als stünde sie zuletzt; so rechnen PSPP, SPSS und das Skript von Statable.', 'With type I the result depends on the order, which is why there are two R values. Type III tests each variable as if it were last; that is how PSPP, SPSS and the Statable script calculate.'), true),
      a(P('Statable hat sich verrechnet, R hat recht', 'Statable made a mistake, R is right'), P('Beide rechnen richtig, aber verschiedene Quadratsummen. Mit Typ III rechnet auch R 311,84 aus.', 'Both calculate correctly, but different sums of squares. With type III, R also gives 311.84.')),
      a(P('R lässt die Tiere ohne Angabe zum Geschlecht anders weg', 'R drops the animals without information on sex differently'), P('In allen Zeilen rechnen beide mit denselben 333 Tieren. Der Unterschied kommt allein vom Rechenweg der Quadratsummen.', 'In all rows both calculate with the same 333 animals. The difference comes only from how the sums of squares are calculated.')),
      a(P('R rundet auf weniger Stellen', 'R rounds to fewer digits'), P('Rundung ändert höchstens die letzte Stelle, nicht 311 in 387. Hier wird Verschiedenes gerechnet.', 'Rounding changes at most the last digit, not 311 into 387. Here different things are calculated.'))
    ],
    hilfe: ['sf-r-skript', 'typ-iii-quadratsumme'], belege: ['R FAQ, Abschnitt 7 (Reihenfolge der Faktoren in anova())', 'Rechnung: scripts/ueben-erwartet-r-skript.R', 'Hilfe:sf-r-skript']
  },
  {
    id: 'sf-rs-gewicht', thema: 'sauberforschen',
    stamm: P('Eine Datei fasst die Pinguine nach Art und Insel in 5 Zeilen zusammen, mit einer Spalte „Anzahl“ als Häufigkeitsgewicht (zusammen 344 Tiere). Mit wie vielen Fällen rechnet das R-Skript von Statable die Kreuztabelle?', 'A file summarises the penguins by species and island in 5 rows, with a column "count" as frequency weight (344 animals in total). With how many cases does the Statable R script calculate the crosstab?'),
    antworten: [
      a(P('Mit 344 Fällen: Jede Zeile wird so oft wiederholt, wie ihr Gewicht sagt', 'With 344 cases: each row is repeated as often as its weight says'), P('So macht es auch PSPP mit WEIGHT BY. Darum kommt dasselbe Chi-Quadrat heraus wie mit 344 einzelnen Zeilen, χ² = 299,6 bei df = 4.', 'PSPP does the same with WEIGHT BY. That is why the same chi-square results as with 344 single rows, χ² = 299.6 with df = 4.'), true),
      a(P('Mit 5 Fällen, einem je Zeile', 'With 5 cases, one per row'), P('Dann wäre die Spalte „Anzahl“ verloren, und jede Zeile zählte gleich viel. Das Gewicht sagt, wie viele Tiere hinter einer Zeile stehen.', 'Then the column "count" would be lost, and each row would count the same. The weight says how many animals stand behind a row.')),
      a(P('Mit 5 Fällen, die R über lm(weights = ...) unterschiedlich genau nimmt', 'With 5 cases that R treats as differently precise via lm(weights = ...)'), P('Genau das vermeidet das Skript: Gewichte in lm() gelten R als Genauigkeit, Freiheitsgrade zählten dann Zeilen statt Fälle.', 'This is exactly what the script avoids: weights in lm() count as precision for R, so degrees of freedom would count rows instead of cases.')),
      a(P('Mit 349 Fällen, den Tieren plus den Zeilen', 'With 349 cases, the animals plus the rows'), P('Die Zeilen sind keine zusätzlichen Fälle, sie tragen nur die Anzahl. Zusammen sind es 344 Tiere.', 'The rows are no additional cases; they only carry the count. Together there are 344 animals.'))
    ],
    hilfe: ['sf-r-skript', 'fallgewichte'], belege: ['Rechnung: scripts/ueben-erwartet-r-skript.R', 'Code:lib/rskript.ts', 'Hilfe:sf-r-skript']
  },
  {
    id: 'sf-rs-rundung', thema: 'sauberforschen',
    stamm: P('Statable zeigt t = 2,45. Das R-Skript druckt t = 2,449731 (R schreibt dabei einen Punkt statt des Kommas). Wie ist das zu lesen?', 'Statable shows t = 2.45. The R script prints t = 2.449731. How should this be read?'),
    antworten: [
      a(P('Gleich: Auf zwei Stellen gerundet ergibt 2,449731 genau 2,45; R schreibt mit Punkt und mehr Stellen', 'The same: rounded to two digits, 2.449731 gives exactly 2.45; R writes with a point and more digits'), P('Gleich heißt: gleich nach dem Runden auf die Stellen, die Statable zeigt. Das Dezimalzeichen ist nur eine Schreibweise.', 'The same means: the same after rounding to the digits Statable shows. The decimal sign is only a way of writing.'), true),
      a(P('Verschieden: R ist um 0,000269 genauer, darum gilt der R-Wert', 'Different: R is more accurate by 0.000269, so the R value counts'), P('Statable rechnet intern ebenso genau und rundet nur für die Anzeige. Beide Werte sind dieselbe Zahl.', 'Statable calculates just as precisely internally and rounds only for display. Both values are the same number.')),
      a(P('Verschieden: Der Punkt zeigt, dass R einen anderen Test gerechnet hat', 'Different: the point shows that R calculated a different test'), P('Der Punkt ist die englische Schreibweise des Dezimalzeichens und sagt nichts über den Test.', 'The point is the English way of writing the decimal sign and says nothing about the test.'))
    ],
    hilfe: ['sf-r-skript', 'r-skript'], belege: ['Hilfe:sf-r-skript', 'Hilfe:r-skript']
  },
  {
    id: 'sf-rs-mehrfach', thema: 'sauberforschen', mehrfach: true,
    stamm: P('Welche Aussagen zum R-Skript von Statable stimmen? Mehrere können stimmen.', 'Which statements about the Statable R script are true? Several can be true.'),
    antworten: [
      a(P('Die CSV-Datei enthält nur die Spalten, die die Auswertung braucht', 'The CSV file contains only the columns the analysis needs'), P('Stimmt. Mitgegeben werden die benutzten Spalten; wer die Daten nicht weitergeben darf, gibt nur das Skript weiter.', 'True. The columns used are included; whoever may not pass on the data passes on only the script.'), true),
      a(P('Für ein Umfragegewicht erzeugt Statable kein Skript', 'For a survey weight Statable creates no script'), P('Stimmt. Ein Umfragegewicht rechnet anders als ein Häufigkeitsgewicht; dafür fehlt der Eintrag im Menü.', 'True. A survey weight calculates differently from a frequency weight; the menu has no entry for it.'), true),
      a(P('Das Skript lädt beim Start die nötigen Pakete aus dem Internet', 'The script downloads the packages it needs from the internet when it starts'), P('Stimmt nicht. Es nutzt nur R selbst und die mitgelieferten Pakete MASS und nnet.', 'False. It uses only R itself and the included packages MASS and nnet.')),
      a(P('Bei Promax-Rotation liefert stats::promax in R genau die Ladungen von Statable', 'With promax rotation, stats::promax in R gives exactly the loadings from Statable'), P('Stimmt nicht. Statable rechnet Promax wie PSPP, stats::promax etwas anders; die Ladungen können in der zweiten Stelle abweichen. Darum rechnet das Skript Promax mit eigenen Zeilen.', 'False. Statable calculates promax like PSPP, stats::promax slightly differently; the loadings can differ in the second decimal place. That is why the script calculates promax with its own lines.'))
    ],
    hilfe: ['sf-r-skript', 'r-skript'], belege: ['Code:lib/rskript.ts', 'Hendrickson & White 1964 (Promax)', 'Hilfe:sf-r-skript']
  }
];
