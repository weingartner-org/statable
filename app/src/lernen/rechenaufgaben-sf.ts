/**
 * Rechenaufgaben des Lernpfads „Sauber forschen“ (Field-Stufe 3, 05.11.2026): Forschungskreislauf, p-Hacking, Vorregistrierung, p-Wert bei verschiedener Fallzahl, Beta-Posterior.
 * Aufbau und Regeln wie in `rechenaufgaben.ts`; Wächter: `rechenaufgaben.test.ts` (Nachrechnung auf einem zweiten Weg in `rechenaufgaben-sf.soll.ts`).
 * Alle Zahlen sind erfunden. Der p-Wert der Aufgabe `p-bei-n` stammt aus R (scripts/ueben-erwartet-sauber-forschen.R, Datei lib/testdaten/ueben-erwartet-sauber-forschen.json).
 */
import { P } from '../i18n/laufzeit';
import { bau, summe, mittel, type Rechenaufgabe } from './rechenaufgaben-bau';
import ERW from '../lib/testdaten/ueben-erwartet-sauber-forschen.json';

// ---------------------------------------------------------------- 1. Forschungskreislauf: Vorhersage und Beobachtung abgleichen
export const DATEN_KREIS = { ausgeschlafen: [310, 290, 330, 300, 320, 310], kurz: [340, 360, 330, 370, 350, 350] };
type DK = typeof DATEN_KREIS;
const KREIS = bau({
  id: 'forschungskreislauf-vorhersage',
  daten: DATEN_KREIS,
  lage: P('Beobachtung: Nach kurzen Nächten wirken Menschen langsamer. Theorie: Schlafmangel verlängert die Reaktionszeit. Hypothese: Wer nur 4 Stunden schläft, reagiert im Mittel langsamer als wer 8 Stunden schläft. Vorhersage: Die Gruppe mit kurzem Schlaf hat einen höheren Mittelwert der Reaktionszeit. Zur Prüfung messen sechs Personen mit 8 Stunden Schlaf und sechs Personen mit 4 Stunden Schlaf ihre Reaktionszeit (in Millisekunden).',
    'Observation: after short nights people seem slower. Theory: lack of sleep lengthens reaction time. Hypothesis: someone who sleeps only 4 hours reacts more slowly on average than someone who sleeps 8 hours. Prediction: the group with short sleep has a higher mean reaction time. For the test, six people with 8 hours of sleep and six people with 4 hours of sleep have their reaction time measured (in milliseconds).'),
  tabelle: { titel: P('Reaktionszeit in Millisekunden', 'Reaction time in milliseconds'), kopf: [P('Person', 'Person'), P('8 Stunden Schlaf', '8 hours of sleep'), P('4 Stunden Schlaf', '4 hours of sleep')],
    zeilen: DATEN_KREIS.ausgeschlafen.map((v, i) => [`${i + 1}`, v, DATEN_KREIS.kurz[i]!]) },
  schritte: [
    { id: 'mittel-lang', stellen: 0, toleranz: 0.01, einheit: P('Millisekunden', 'milliseconds'), soll: d => mittel(d.ausgeschlafen),
      frage: P('Wie groß ist der Mittelwert der Reaktionszeit bei 8 Stunden Schlaf? Das ist die Vergleichsgruppe.', 'What is the mean reaction time with 8 hours of sleep? That is the comparison group.'),
      warum: P('Die Hypothese vergleicht zwei Gruppen, also braucht jede Gruppe ihre Kennzahl. Die abhängige Größe ist die Reaktionszeit, die unabhängige Größe die Schlafdauer. Pro Gruppe fasst der Mittelwert die sechs Messungen in einer Zahl zusammen.',
        'The hypothesis compares two groups, so each group needs its summary number. The dependent variable is the reaction time, the independent variable the sleep duration. For each group the mean sums up the six measurements in one number.'),
      tipp: P('Die sechs Werte der mittleren Spalte addieren und durch 6 teilen.', 'Add the six values of the middle column and divide by 6.'),
      fehler: [{ wert: d => summe(d.ausgeschlafen), tipp: P('Das ist die Summe. Es fehlt noch das Teilen durch 6.', 'That is the sum. Dividing by 6 is still missing.') },
        { wert: d => mittel(d.kurz), tipp: P('Das ist der Mittelwert der anderen Gruppe (4 Stunden Schlaf).', 'That is the mean of the other group (4 hours of sleep).') }],
      weg: (d, z) => [P(`Summe: ${d.ausgeschlafen.join(' + ')} = ${z(summe(d.ausgeschlafen))}`, `Sum: ${d.ausgeschlafen.join(' + ')} = ${z(summe(d.ausgeschlafen))}`),
        P(`Mittelwert: ${z(summe(d.ausgeschlafen))} : ${d.ausgeschlafen.length} = ${z(mittel(d.ausgeschlafen))}`, `Mean: ${z(summe(d.ausgeschlafen))} : ${d.ausgeschlafen.length} = ${z(mittel(d.ausgeschlafen))}`)] },
    { id: 'mittel-kurz', stellen: 0, toleranz: 0.01, einheit: P('Millisekunden', 'milliseconds'), soll: d => mittel(d.kurz),
      frage: P('Wie groß ist der Mittelwert der Reaktionszeit bei 4 Stunden Schlaf?', 'What is the mean reaction time with 4 hours of sleep?'),
      warum: P('Dieselbe Rechnung für die zweite Gruppe. Erst mit beiden Mittelwerten lässt sich die Vorhersage der Theorie (kurzer Schlaf, höherer Mittelwert) mit der Beobachtung abgleichen.',
        'The same calculation for the second group. Only with both means can the prediction of the theory (short sleep, higher mean) be compared with the observation.'),
      tipp: P('Die Werte der rechten Spalte addieren und durch 6 teilen.', 'Add the values of the right column and divide by 6.'),
      fehler: [{ wert: d => summe(d.kurz), tipp: P('Das ist die Summe. Es fehlt noch das Teilen durch 6.', 'That is the sum. Dividing by 6 is still missing.') },
        { wert: d => mittel(d.ausgeschlafen), tipp: P('Das ist der Mittelwert der anderen Gruppe (8 Stunden Schlaf).', 'That is the mean of the other group (8 hours of sleep).') }],
      weg: (d, z) => [P(`Summe: ${d.kurz.join(' + ')} = ${z(summe(d.kurz))}`, `Sum: ${d.kurz.join(' + ')} = ${z(summe(d.kurz))}`),
        P(`Mittelwert: ${z(summe(d.kurz))} : ${d.kurz.length} = ${z(mittel(d.kurz))}`, `Mean: ${z(summe(d.kurz))} : ${d.kurz.length} = ${z(mittel(d.kurz))}`)] },
    { id: 'unterschied', stellen: 0, toleranz: 0.01, einheit: P('Millisekunden', 'milliseconds'), soll: d => mittel(d.kurz) - mittel(d.ausgeschlafen),
      frage: P('Um wie viele Millisekunden liegt die Gruppe mit 4 Stunden Schlaf im Mittel über der Gruppe mit 8 Stunden? Rechnen: Mittelwert kurzer Schlaf minus Mittelwert langer Schlaf.', 'By how many milliseconds is the group with 4 hours of sleep above the group with 8 hours on average? Calculate: mean short sleep minus mean long sleep.'),
      warum: P('Die Vorhersage nennt eine Richtung: kurzer Schlaf, höherer Wert. Darum steht die Gruppe mit kurzem Schlaf vorn. Ein positives Ergebnis passt zur Vorhersage, ein negatives widerspräche ihr. Ob der Unterschied über Zufall hinausgeht, zeigt erst der Test.',
        'The prediction names a direction: short sleep, higher value. That is why the group with short sleep comes first. A positive result fits the prediction, a negative one would contradict it. Whether the difference goes beyond chance only the test shows.'),
      tipp: P('Die beiden Mittelwerte aus den letzten Schritten voneinander abziehen, die Gruppe mit kurzem Schlaf zuerst.', 'Subtract the two means from the last steps, the group with short sleep first.'),
      fehler: [{ wert: d => mittel(d.ausgeschlafen) - mittel(d.kurz), tipp: P('Die Reihenfolge ist vertauscht, das Vorzeichen ist umgekehrt. Die Vorhersage lautet: kurzer Schlaf liegt höher.', 'The order is swapped, the sign is reversed. The prediction is: short sleep is higher.') },
        { wert: d => (mittel(d.kurz) - mittel(d.ausgeschlafen)) / 2, tipp: P('Der Unterschied wurde halbiert. Es genügt die einfache Differenz der Mittelwerte.', 'The difference was halved. The simple difference of the means is enough.') }],
      weg: (d, z) => [P(`${z(mittel(d.kurz))} − ${z(mittel(d.ausgeschlafen))} = ${z(mittel(d.kurz) - mittel(d.ausgeschlafen))}`, `${z(mittel(d.kurz))} − ${z(mittel(d.ausgeschlafen))} = ${z(mittel(d.kurz) - mittel(d.ausgeschlafen))}`)] },
    { id: 'ueber-vergleich', stellen: 0, toleranz: 0.01, soll: d => d.kurz.filter(v => v > mittel(d.ausgeschlafen)).length,
      frage: P('Bei wie vielen der sechs Personen mit 4 Stunden Schlaf liegt die Reaktionszeit über dem Mittelwert der Gruppe mit 8 Stunden?', 'For how many of the six people with 4 hours of sleep is the reaction time above the mean of the group with 8 hours?'),
      warum: P('Das ist ein erster Blick auf die Einzelfälle: Zeigt nur der Mittelwert die Richtung der Vorhersage, oder tun es fast alle Personen? Sind es fast alle, spricht das für ein klares Muster. Sind es wenige, kann ein einzelner extremer Wert den Mittelwert gezogen haben.',
        'This is a first look at the single cases: does only the mean show the direction of the prediction, or do almost all people? If it is almost all, that points to a clear pattern. If it is few, a single extreme value may have pulled the mean.'),
      tipp: P('Jeden Wert der rechten Spalte mit dem Mittelwert der Gruppe mit 8 Stunden Schlaf vergleichen und die größeren zählen.', 'Compare each value of the right column with the mean of the group with 8 hours of sleep and count the larger ones.'),
      fehler: [{ wert: d => d.kurz.filter(v => v > mittel(d.kurz)).length, tipp: P('Hier wurde mit dem eigenen Gruppenmittelwert (4 Stunden Schlaf) verglichen. Gemeint ist der Mittelwert der Vergleichsgruppe.', 'Here the comparison was with the own group mean (4 hours of sleep). The mean of the comparison group is meant.') },
        { wert: d => d.kurz.filter(v => v >= mittel(d.kurz)).length, tipp: P('Auch hier wurde der falsche Vergleichswert benutzt, und zusätzlich zählen die Werte gleich dem Mittelwert mit.', 'Here, too, the wrong comparison value was used, and values equal to the mean also count.') }],
      weg: (d, z) => [P(`Vergleichswert: ${z(mittel(d.ausgeschlafen))}. Werte darüber: ${d.kurz.filter(v => v > mittel(d.ausgeschlafen)).join(', ')}. Das sind ${z(d.kurz.filter(v => v > mittel(d.ausgeschlafen)).length)} von ${d.kurz.length}.`,
        `Comparison value: ${z(mittel(d.ausgeschlafen))}. Values above it: ${d.kurz.filter(v => v > mittel(d.ausgeschlafen)).join(', ')}. That is ${z(d.kurz.filter(v => v > mittel(d.ausgeschlafen)).length)} of ${d.kurz.length}.`)] }
  ],
  merke: P('Der Forschungskreislauf: Beobachtung, Theorie, Hypothese, Vorhersage, Prüfung, und dann neue Beobachtungen. Eine Vorhersage muss vor der Messung stehen und eine Richtung nennen, damit die Daten ihr widersprechen können. Mit zwei Mittelwerten und ihrer Differenz ist die Vorhersage geprüft, soweit der Zufall außen vor bleibt; ob sie darüber hinausgeht, zeigt der Test.',
    'The research cycle: observation, theory, hypothesis, prediction, test, and then new observations. A prediction must stand before the measurement and name a direction so that the data can contradict it. With two means and their difference the prediction is checked as far as chance is left aside; whether it goes beyond chance the test shows.'),
  ausprobieren: P('Als Nächstes: im Lernlabor „Randomisierung“ die beiden Spalten der Tabelle als Gruppe 1 (4 Stunden Schlaf) und Gruppe 2 (8 Stunden Schlaf) eintragen und die Gruppen mischen. Das Bild zeigt, wie oft ein Unterschied von 40 Millisekunden allein durch zufälliges Zuteilen entsteht.',
    'Next: in the learning lab "Randomization" enter the two columns of the table as group 1 (4 hours of sleep) and group 2 (8 hours of sleep) and shuffle the groups. The chart shows how often a difference of 40 milliseconds arises by random assignment alone.')
});

// ---------------------------------------------------------------- 2. p-Hacking: Fehlalarmrate bei mehreren Zielgrößen
export const DATEN_HACK = { alpha: 0.05, m: [3, 5, 20] };
type DH = typeof DATEN_HACK;
const rate = (d: DH, m: number) => (1 - (1 - d.alpha) ** m) * 100;
const kleinstesM = (d: DH) => { let m = 1; while (rate(d, m) <= 50) m++; return m; };
const HACK = bau({
  id: 'fehlalarm-zielgroessen',
  daten: DATEN_HACK,
  lage: P('Drei Studien messen an denselben Personen mehrere Zielgrößen (zum Beispiel Stimmung, Schlaf, Appetit) und prüfen jede einzeln auf dem Niveau 5 %. In Wirklichkeit gibt es bei keiner Zielgröße einen Effekt. Berichtet wird, wenn mindestens eine Zielgröße signifikant ist. Wie oft kommt es dann zu einem Fehlalarm? Zur Vereinfachung gelten die Tests als unabhängig.',
    'Three studies measure several outcomes on the same people (for example mood, sleep, appetite) and test each one separately at the 5% level. In reality there is no effect for any outcome. A result is reported when at least one outcome is significant. How often does that give a false alarm? For simplicity the tests are treated as independent.'),
  tabelle: { titel: P('Drei Studien', 'Three studies'), kopf: [P('Studie', 'Study'), P('Zielgrößen', 'Outcomes'), P('Niveau je Test (%)', 'Level per test (%)')],
    zeilen: [['A', 3, 5], ['B', 5, 5], ['C', 20, 5]] },
  schritte: [
    { id: 'm3', stellen: 1, toleranz: 0.1, einheit: P('Prozent', 'percent'), soll: d => rate(d, 3),
      frage: P('Wie groß ist das Risiko für mindestens einen Fehlalarm in Studie A mit 3 Zielgrößen, in Prozent? Rechnen: 1 − 0,95³.', 'How large is the risk of at least one false alarm in study A with 3 outcomes, in percent? Calculate: 1 − 0.95³.'),
      warum: P('Ein einzelner Test löst bei fehlendem Effekt mit 5 % Wahrscheinlichkeit Fehlalarm aus, also bleibt er mit 95 % ruhig. Alle drei bleiben ruhig mit 0,95 · 0,95 · 0,95. Das Gegenteil, mindestens ein Fehlalarm, hat die übrige Wahrscheinlichkeit: 1 minus dieses Produkt.',
        'A single test raises a false alarm with 5% probability when there is no effect, so it stays quiet with 95%. All three stay quiet with 0.95 · 0.95 · 0.95. The opposite, at least one false alarm, has the remaining probability: 1 minus this product.'),
      tipp: P('Erst 0,95 · 0,95 · 0,95 ausrechnen, dann von 1 abziehen und mit 100 malnehmen.', 'First work out 0.95 · 0.95 · 0.95, then subtract it from 1 and multiply by 100.'),
      fehler: [{ wert: d => 3 * d.alpha * 100, tipp: P('Das ist 3 · 5 %. Wahrscheinlichkeiten dürfen hier nicht einfach addiert werden: Fälle, in denen zwei Tests Alarm geben, würden doppelt gezählt.', 'That is 3 · 5%. Probabilities may not simply be added here: cases in which two tests raise an alarm would be counted twice.') },
        { wert: d => (1 - d.alpha) ** 3 * 100, tipp: P('Das ist die Wahrscheinlichkeit, dass alle Tests ruhig bleiben. Gefragt ist das Gegenteil: 1 minus diese Zahl.', 'That is the probability that all tests stay quiet. The opposite is asked for: 1 minus this number.') }],
      weg: (d, z) => [P(`0,95³ = ${z(0.95 ** 3, 4)}`, `0.95³ = ${z(0.95 ** 3, 4)}`), P(`1 − ${z(0.95 ** 3, 4)} = ${z(1 - 0.95 ** 3, 4)}, das sind ${z(rate(d, 3), 1)} %`, `1 − ${z(0.95 ** 3, 4)} = ${z(1 - 0.95 ** 3, 4)}, that is ${z(rate(d, 3), 1)}%`)] },
    { id: 'm5', stellen: 1, toleranz: 0.1, einheit: P('Prozent', 'percent'), soll: d => rate(d, 5),
      frage: P('Wie groß ist das Risiko für mindestens einen Fehlalarm in Studie B mit 5 Zielgrößen, in Prozent?', 'How large is the risk of at least one false alarm in study B with 5 outcomes, in percent?'),
      warum: P('Dieselbe Rechnung mit fünf Faktoren: 0,95 hoch 5. Jede weitere Zielgröße lässt die Wahrscheinlichkeit, dass alles ruhig bleibt, ein Stück sinken. Das Risiko für mindestens einen Fehlalarm wächst darum mit jeder Zielgröße, am Anfang schnell, später langsamer.',
        'The same calculation with five factors: 0.95 to the power of 5. Every further outcome lowers the probability that everything stays quiet a little. The risk of at least one false alarm therefore grows with every outcome, fast at first, more slowly later.'),
      tipp: P('0,95 fünfmal mit sich selbst malnehmen (0,95 hoch 5), von 1 abziehen, mal 100.', 'Multiply 0.95 by itself five times (0.95 to the power of 5), subtract from 1, times 100.'),
      fehler: [{ wert: d => 5 * d.alpha * 100, tipp: P('Das ist 5 · 5 %. Die Wahrscheinlichkeiten dürfen nicht einfach addiert werden.', 'That is 5 · 5%. The probabilities may not simply be added.') },
        { wert: d => (1 - d.alpha) ** 5 * 100, tipp: P('Das ist die Wahrscheinlichkeit, dass alle fünf Tests ruhig bleiben. Gefragt ist 1 minus diese Zahl.', 'That is the probability that all five tests stay quiet. 1 minus this number is asked for.') }],
      weg: (d, z) => [P(`0,95⁵ = ${z(0.95 ** 5, 4)}`, `0.95⁵ = ${z(0.95 ** 5, 4)}`), P(`1 − ${z(0.95 ** 5, 4)} = ${z(1 - 0.95 ** 5, 4)}, das sind ${z(rate(d, 5), 1)} %`, `1 − ${z(0.95 ** 5, 4)} = ${z(1 - 0.95 ** 5, 4)}, that is ${z(rate(d, 5), 1)}%`)] },
    { id: 'm20', stellen: 1, toleranz: 0.1, einheit: P('Prozent', 'percent'), soll: d => rate(d, 20),
      frage: P('Wie groß ist das Risiko für mindestens einen Fehlalarm in Studie C mit 20 Zielgrößen, in Prozent?', 'How large is the risk of at least one false alarm in study C with 20 outcomes, in percent?'),
      warum: P('Mit 20 Zielgrößen ist ein Fehlalarm eher die Regel als die Ausnahme. Wer 20 Ergebnisse durchsieht und das eine auffällige berichtet, hat mit dem Niveau 5 % kaum noch etwas Verlässliches in der Hand. Genau das meint p-Hacking: Die Zahl der Möglichkeiten bleibt unsichtbar.',
        'With 20 outcomes a false alarm is more the rule than the exception. Anyone who goes through 20 results and reports the one that stands out has hardly anything reliable left at the 5% level. That is exactly what p-hacking means: the number of possibilities stays invisible.'),
      tipp: P('0,95 hoch 20 ausrechnen (Taste x^y am Taschenrechner), von 1 abziehen, mal 100.', 'Work out 0.95 to the power of 20 (key x^y on a pocket calculator), subtract from 1, times 100.'),
      fehler: [{ wert: d => 20 * d.alpha * 100, tipp: P('Das sind 20 · 5 % = 100 %. Ein Risiko kann zwar nahe 100 % liegen, aber nie durch einfaches Addieren darüber hinaus.', 'That is 20 · 5% = 100%. A risk can come close to 100%, but simple addition is the wrong way to get there.') },
        { wert: d => (1 - d.alpha) ** 20 * 100, tipp: P('Das ist die Wahrscheinlichkeit, dass alle 20 Tests ruhig bleiben. Gefragt ist 1 minus diese Zahl.', 'That is the probability that all 20 tests stay quiet. 1 minus this number is asked for.') }],
      weg: (d, z) => [P(`0,95²⁰ = ${z(0.95 ** 20, 4)}`, `0.95²⁰ = ${z(0.95 ** 20, 4)}`), P(`1 − ${z(0.95 ** 20, 4)} = ${z(1 - 0.95 ** 20, 4)}, das sind ${z(rate(d, 20), 1)} %`, `1 − ${z(0.95 ** 20, 4)} = ${z(1 - 0.95 ** 20, 4)}, that is ${z(rate(d, 20), 1)}%`)] },
    { id: 'm-halb', stellen: 0, toleranz: 0.01, einheit: P('Zielgrößen', 'outcomes'), soll: d => kleinstesM(d),
      frage: P('Ab wie vielen Zielgrößen übersteigt das Risiko für mindestens einen Fehlalarm 50 %? Gesucht ist die kleinste Zahl.', 'From how many outcomes does the risk of at least one false alarm exceed 50%? The smallest number is asked for.'),
      warum: P('Hier hilft Ausprobieren: Das Risiko steigt mit jeder Zielgröße, also reicht es, Zahl für Zahl zu rechnen, bis 1 − 0,95 hoch m über 0,5 liegt. Dasselbe wie: 0,95 hoch m unter 0,5. Das Ergebnis ist überraschend klein: Schon wenige Zielgrößen machen aus dem Fehlalarm einen Münzwurf.',
        'Trying out helps here: the risk rises with every outcome, so it is enough to calculate number by number until 1 − 0.95 to the power of m is above 0.5. Same as: 0.95 to the power of m below 0.5. The result is surprisingly small: a few outcomes already turn the false alarm into a coin toss.'),
      tipp: P('Bei 10 Zielgrößen liegt das Risiko noch unter 50 %. Von dort Zahl für Zahl weiterrechnen.', 'With 10 outcomes the risk is still below 50%. Continue from there number by number.'),
      fehler: [{ wert: d => 50 / (d.alpha * 100), tipp: P('Das ist 50 : 5, also die Rechnung mit Addieren der 5 %. Die Wahrscheinlichkeiten addieren sich nicht einfach; richtig ist 1 − 0,95 hoch m.', 'That is 50 : 5, the calculation with adding the 5%. The probabilities do not simply add up; the correct form is 1 − 0.95 to the power of m.') },
        { wert: d => kleinstesM(d) - 1, tipp: P('Bei dieser Zahl liegt das Risiko noch knapp unter 50 %. Gesucht ist die erste Zahl, bei der es darüber liegt.', 'With this number the risk is still just below 50%. The first number where it is above is asked for.') }],
      weg: (d, z) => [P(`m = ${kleinstesM(d) - 1}: 1 − 0,95^${kleinstesM(d) - 1} = ${z(rate(d, kleinstesM(d) - 1), 1)} %, noch unter 50 %`, `m = ${kleinstesM(d) - 1}: 1 − 0.95^${kleinstesM(d) - 1} = ${z(rate(d, kleinstesM(d) - 1), 1)}%, still below 50%`),
        P(`m = ${z(kleinstesM(d))}: 1 − 0,95^${kleinstesM(d)} = ${z(rate(d, kleinstesM(d)), 1)} %, über 50 %. Also ${z(kleinstesM(d))} Zielgrößen.`, `m = ${z(kleinstesM(d))}: 1 − 0.95^${kleinstesM(d)} = ${z(rate(d, kleinstesM(d)), 1)}%, above 50%. So ${z(kleinstesM(d))} outcomes.`)] }
  ],
  merke: P('Bei m unabhängigen Tests ohne echten Effekt beträgt das Risiko für mindestens einen Fehlalarm 1 − (1 − α)^m. Bei 3 Zielgrößen sind es rund 14 %, bei 5 rund 23 %, bei 20 rund 64 %. Wer viele Auswertungswege durchprobiert und nur den auffälligen meldet, hat dieses Risiko, auch ohne es zu wollen. Abhilfe: die Zahl der Tests vorab festlegen oder das Niveau je Test senken (Bonferroni: α : m).',
    'With m independent tests without a real effect the risk of at least one false alarm is 1 − (1 − α)^m. With 3 outcomes it is about 14%, with 5 about 23%, with 20 about 64%. Anyone who tries many analysis paths and reports only the striking one runs this risk, even without meaning to. Remedy: fix the number of tests beforehand or lower the level per test (Bonferroni: α : m).'),
  ausprobieren: P('Als Nächstes: im Lernlabor „Zufallsexperimente“ eine Urne mit 5 roten und 95 blauen Kugeln wählen, 20 Kugeln mit Zurücklegen ziehen und das Experiment oft wiederholen. Jede rote Kugel ist ein Fehlalarm. „Keine rote“ erscheint in rund 36 % der Wiederholungen, also kommt in rund 64 % mindestens ein Fehlalarm vor.',
    'Next: in the learning lab "Random experiments" choose an urn with 5 red and 95 blue balls, draw 20 balls with replacement and repeat the experiment often. Every red ball is a false alarm. "No red" appears in about 36% of the repetitions, so at least one false alarm occurs in about 64%.')
});

// ---------------------------------------------------------------- 3. Vorregistrierung: Wege zählen, Alpha aufteilen, Fallzahl mit Ausfall
export const DATEN_VORREG = { zielgroessen: 2, ausreisser: 3, kontrollgroesse: 2, gruppen: 2, alpha: 5, hypothesen: 2, ziel: 120, ausfall: 0.15 };
type DV = typeof DATEN_VORREG;
const wege = (d: DV) => d.zielgroessen * d.ausreisser * d.kontrollgroesse * d.gruppen;
const rekrut = (d: DV) => Math.ceil(d.ziel / (1 - d.ausfall));
const VORREG = bau({
  id: 'vorregistrierung-plan',
  daten: DATEN_VORREG,
  lage: P('Ein Team untersucht, ob ein Lernprogramm die Klausurleistung verbessert. Ohne Auswertungsplan bleiben vier Entscheidungen offen, jede erst nach Sicht der Daten. Mit Vorregistrierung wird jede vorab festgelegt. Zusätzlich legt der Plan fest: zwei Hypothesen, insgesamt 5 % Fehlalarmrisiko, 120 auswertbare Personen und 15 % erwartete Ausfälle.',
    'A team investigates whether a learning program improves exam performance. Without an analysis plan four decisions stay open, each made only after seeing the data. With preregistration each is fixed beforehand. In addition the plan fixes: two hypotheses, 5% false alarm risk in total, 120 analysable people and 15% expected dropouts.'),
  tabelle: { titel: P('Offene Entscheidungen ohne Plan (Zahl der Möglichkeiten)', 'Open decisions without a plan (number of options)'), kopf: [P('Entscheidung', 'Decision'), P('Möglichkeiten', 'Options')],
    zeilen: [[P('Zielgröße: Punkte oder Note', 'Outcome: points or grade'), 2], [P('Ausreißer: behalten, entfernen oder begrenzen', 'Outliers: keep, remove or cap'), 3], [P('Kontrollgröße: mit oder ohne', 'Control variable: with or without'), 2], [P('Gruppen: getrennt oder zusammengefasst', 'Groups: separate or merged'), 2]] },
  schritte: [
    { id: 'wege', stellen: 0, toleranz: 0.01, soll: d => wege(d),
      frage: P('Wie viele verschiedene Auswertungswege ergeben sich ohne Plan? Rechnen: alle Möglichkeiten der vier Entscheidungen miteinander kombinieren.', 'How many different analysis paths result without a plan? Calculate: combine all options of the four decisions with each other.'),
      warum: P('Jede Entscheidung lässt sich mit jeder der anderen kombinieren, darum werden die Möglichkeiten multipliziert, nicht addiert. Das sind die Forschungsfreiheitsgrade: Jeder dieser Wege wäre vertretbar, und jeder kann ein anderes p ergeben.',
        'Every decision can be combined with each of the others, so the options are multiplied, not added. These are the researcher degrees of freedom: each of these paths would be defensible, and each can give a different p.'),
      tipp: P('2 · 3 · 2 · 2 rechnen.', 'Calculate 2 · 3 · 2 · 2.'),
      fehler: [{ wert: d => d.zielgroessen + d.ausreisser + d.kontrollgroesse + d.gruppen, tipp: P('Das ist die Summe der Möglichkeiten. Die Entscheidungen lassen sich aber miteinander kombinieren, also wird multipliziert.', 'That is the sum of the options. The decisions can be combined with each other, so they are multiplied.') }],
      weg: (d, z) => [P(`${d.zielgroessen} · ${d.ausreisser} · ${d.kontrollgroesse} · ${d.gruppen} = ${z(wege(d))} Wege`, `${d.zielgroessen} · ${d.ausreisser} · ${d.kontrollgroesse} · ${d.gruppen} = ${z(wege(d))} paths`)] },
    { id: 'anteil', stellen: 1, toleranz: 0.1, einheit: P('Prozent', 'percent'), soll: d => 100 / wege(d),
      frage: P('Mit Vorregistrierung ist genau ein Weg erlaubt. Welcher Anteil aller Wege ist das, in Prozent?', 'With preregistration exactly one path is allowed. What share of all paths is that, in percent?'),
      warum: P('Der Plan engt die Möglichkeiten auf einen Weg ein. Je größer die Zahl der offenen Wege, desto kleiner der Anteil, der vorab bekannt war. Dieser Wert zeigt, wie viel Spielraum ohne Plan bleibt: Bei einem Prozentsatz nahe 4 gäbe es ohne Plan fast 24-mal so viele Möglichkeiten, ein p unter 5 % zu finden.',
        'The plan narrows the options to one path. The larger the number of open paths, the smaller the share that was known beforehand. This value shows how much room there is without a plan: with a percentage close to 4 there would be almost 24 times as many chances to find a p below 5% without a plan.'),
      tipp: P('1 durch die Zahl der Wege aus dem ersten Schritt teilen und mit 100 malnehmen.', 'Divide 1 by the number of paths from the first step and multiply by 100.'),
      fehler: [{ wert: d => 1 / wege(d), tipp: P('Das ist der Anteil als Dezimalzahl. Gefragt ist die Angabe in Prozent: mal 100.', 'That is the share as a decimal number. The answer is wanted in percent: times 100.') },
        { wert: d => 100 - 100 / wege(d), tipp: P('Das ist der Anteil der Wege, die der Plan ausschließt. Gefragt ist der eine erlaubte Weg.', 'That is the share of paths the plan rules out. The one allowed path is asked for.') }],
      weg: (d, z) => [P(`1 : ${z(wege(d))} = ${z(1 / wege(d), 4)}, das sind ${z(100 / wege(d), 1)} %`, `1 : ${z(wege(d))} = ${z(1 / wege(d), 4)}, that is ${z(100 / wege(d), 1)}%`)] },
    { id: 'alpha-hyp', stellen: 1, toleranz: 0.05, einheit: P('Prozent', 'percent'), soll: d => d.alpha / d.hypothesen,
      frage: P('Der Plan hat zwei Hypothesen und insgesamt 5 % Fehlalarmrisiko. Welches Niveau gilt für jede Hypothese bei einfacher Aufteilung (Bonferroni)?', 'The plan has two hypotheses and 5% false alarm risk in total. Which level applies to each hypothesis with simple splitting (Bonferroni)?'),
      warum: P('Das Gesamtrisiko wird vorab auf die geplanten Tests verteilt. Bei Bonferroni teilt man durch die Zahl der Tests, hier durch 2. Wichtig ist, dass die Aufteilung vor den Daten steht. Eine Aufteilung nach Sicht der Daten würde wieder Spielraum öffnen.',
        'The total risk is distributed over the planned tests beforehand. With Bonferroni one divides by the number of tests, here by 2. What matters is that the split comes before the data. A split after seeing the data would open room again.'),
      tipp: P('5 % durch die Zahl der Hypothesen teilen.', 'Divide 5% by the number of hypotheses.'),
      fehler: [{ wert: d => d.alpha, tipp: P('Das ist das Gesamtniveau. Es soll auf die zwei Hypothesen aufgeteilt werden.', 'That is the overall level. It is to be split between the two hypotheses.') },
        { wert: d => d.alpha * d.hypothesen, tipp: P('Hier wurde multipliziert statt geteilt. Mehr Tests verlangen ein kleineres Niveau je Test.', 'Here the calculation multiplied instead of divided. More tests call for a smaller level per test.') }],
      weg: (d, z) => [P(`${z(d.alpha)} % : ${d.hypothesen} = ${z(d.alpha / d.hypothesen, 1)} %`, `${z(d.alpha)}% : ${d.hypothesen} = ${z(d.alpha / d.hypothesen, 1)}%`)] },
    { id: 'rekrutieren', stellen: 0, toleranz: 0.01, einheit: P('Personen', 'people'), soll: d => rekrut(d),
      frage: P('Wie viele Personen müssen angeworben werden, damit nach 15 % Ausfall mindestens 120 auswertbar bleiben? Auf ganze Personen aufrunden.', 'How many people have to be recruited so that at least 120 remain analysable after 15% dropout? Round up to whole people.'),
      warum: P('Von den Angeworbenen bleiben 85 % übrig. Gesucht ist die Zahl, die mit 0,85 malgenommen 120 ergibt, also 120 geteilt durch 0,85. Aufgerundet wird, weil mit zu wenigen Personen die geplante Fallzahl nicht erreicht wäre. Die Abbruchregel („so viele, dann Schluss“) gehört in den Plan: Wer nach jedem Zuwachs testet und bei p unter 5 % aufhört, treibt das Fehlalarmrisiko hoch.',
        'Of those recruited 85% remain. The number sought gives 120 when multiplied by 0.85, so 120 divided by 0.85. It is rounded up because with too few people the planned sample size would not be reached. The stopping rule ("this many, then stop") belongs in the plan: anyone who tests after each addition and stops at p below 5% drives the false alarm risk up.'),
      tipp: P('120 durch 0,85 teilen und das Ergebnis auf die nächste ganze Zahl aufrunden.', 'Divide 120 by 0.85 and round the result up to the next whole number.'),
      fehler: [{ wert: d => Math.floor(d.ziel / (1 - d.ausfall)), tipp: P('Abgerundet reicht es nicht: Mit 141 Personen bleiben nach 15 % Ausfall weniger als 120. Es wird aufgerundet.', 'Rounded down it is not enough: with 141 people fewer than 120 remain after 15% dropout. Round up.') },
        { wert: d => d.ziel * (1 + d.ausfall), tipp: P('Hier wurden 15 % auf die 120 aufgeschlagen. Die 15 % beziehen sich aber auf die Angeworbenen, nicht auf die 120; darum wird durch 0,85 geteilt.', 'Here 15% was added to the 120. The 15% refers to those recruited, not to the 120; that is why the calculation divides by 0.85.') }],
      weg: (d, z) => [P(`${z(d.ziel)} : ${z(1 - d.ausfall, 2)} = ${z(d.ziel / (1 - d.ausfall), 2)}`, `${z(d.ziel)} : ${z(1 - d.ausfall, 2)} = ${z(d.ziel / (1 - d.ausfall), 2)}`), P(`Aufgerundet: ${z(rekrut(d))} Personen`, `Rounded up: ${z(rekrut(d))} people`)] }
  ],
  merke: P('Ein Vorab-Plan zählt die Freiheiten, die später gesperrt sind: Hier 24 Wege statt einem. Dazu gehören Hypothesen mit Richtung, die Aufteilung des Fehlalarmrisikos, die Fallzahl samt Abbruchregel und der Umgang mit Ausreißern. Was nicht vorab stand, darf trotzdem berichtet werden, aber als nachträglich und erkundend gekennzeichnet.',
    'A plan made beforehand counts the freedoms that are locked later: here 24 paths instead of one. This includes hypotheses with a direction, the split of the false alarm risk, the sample size with the stopping rule and the handling of outliers. What was not planned beforehand may still be reported, but marked as post hoc and exploratory.'),
  ausprobieren: P('Als Nächstes: unter „Effektstärke sehen“ (Cohens d und Teststärke) für einen erwarteten Effekt die nötige Gruppengröße ablesen. Genau diese Zahl gehört, mit der Begründung, in den vorab hinterlegten Plan.',
    'Next: under "See the effect size" (Cohen\'s d and power) read off the required group size for an expected effect. Exactly this number belongs, with the reasoning, in the plan registered beforehand.')
});

// ---------------------------------------------------------------- 4. p-Wert bei gleichem Effekt und verschiedener Fallzahl
export const DATEN_PWERT = { diff: 5, sd: 10, gruppen: [10, 40, 160], p40: ERW.n40.p, p10: ERW.n10.p, p40einseitig: ERW.n40.p_einseitig };
type DP = typeof DATEN_PWERT;
const pSe = (d: DP, n: number) => d.sd * Math.sqrt(2 / n);
const PWERT = bau({
  id: 'p-bei-n',
  daten: DATEN_PWERT,
  lage: P('Eine Förderung hebt die Testleistung im Mittel um 5 Punkte. Die Standardabweichung liegt in beiden Gruppen bei 10 Punkten. Drei Studien finden genau diesen Unterschied, mit 10, 40 und 160 Personen je Gruppe. Der Effekt ist derselbe. Wie verhalten sich t und p?',
    'A support program raises test performance by 5 points on average. The standard deviation is 10 points in both groups. Three studies find exactly this difference, with 10, 40 and 160 people per group. The effect is the same. How do t and p behave?'),
  tabelle: { titel: P('Drei Studien mit demselben Effekt', 'Three studies with the same effect'), kopf: [P('Personen je Gruppe', 'People per group'), P('Unterschied der Mittelwerte', 'Difference of the means'), P('Standardabweichung', 'Standard deviation')],
    zeilen: DATEN_PWERT.gruppen.map(n => [`${n}`, DATEN_PWERT.diff, DATEN_PWERT.sd]) },
  schritte: [
    { id: 'se-10', stellen: 2, toleranz: 0.01, einheit: P('Punkte', 'points'), soll: d => pSe(d, 10),
      frage: P('Wie groß ist der Standardfehler des Unterschieds bei 10 Personen je Gruppe? Rechnen: Standardabweichung mal Wurzel aus (2 : n).', 'How large is the standard error of the difference with 10 people per group? Calculate: standard deviation times square root of (2 : n).'),
      warum: P('Der Unterschied zweier Mittelwerte streut von Stichprobe zu Stichprobe. Bei gleicher Streuung und gleicher Gruppengröße ist sein Standardfehler Standardabweichung mal Wurzel aus 2 : n. Mit größerem n wird er kleiner, und das ist der Grund, warum derselbe Unterschied bei großen Gruppen deutlicher auffällt.',
        'The difference of two means varies from sample to sample. With equal spread and equal group size its standard error is the standard deviation times the square root of 2 : n. With larger n it gets smaller, and that is why the same difference stands out more clearly in large groups.'),
      tipp: P('2 : 10 = 0,2, davon die Wurzel (etwa 0,447), mal 10.', '2 : 10 = 0.2, take its square root (about 0.447), times 10.'),
      fehler: [{ wert: d => d.sd / Math.sqrt(10), tipp: P('Das ist der Standardfehler eines einzelnen Mittelwerts. Für den Unterschied zweier Mittelwerte kommt die 2 unter die Wurzel.', 'That is the standard error of a single mean. For the difference of two means the 2 goes under the root.') },
        { wert: d => pSe(d, 10) ** 2, tipp: P('Das ist die Varianz des Unterschieds. Es fehlt die Wurzel.', 'That is the variance of the difference. The root is missing.') }],
      weg: (d, z) => [P(`2 : 10 = 0,2; Wurzel = ${z(Math.sqrt(0.2), 3)}; ${z(d.sd)} · ${z(Math.sqrt(0.2), 3)} = ${z(pSe(d, 10), 2)}`, `2 : 10 = 0.2; root = ${z(Math.sqrt(0.2), 3)}; ${z(d.sd)} · ${z(Math.sqrt(0.2), 3)} = ${z(pSe(d, 10), 2)}`)] },
    { id: 't-10', stellen: 2, toleranz: 0.01, soll: d => d.diff / pSe(d, 10),
      frage: P('Wie groß ist t bei 10 Personen je Gruppe? Rechnen: Unterschied : Standardfehler.', 'How large is t with 10 people per group? Calculate: difference : standard error.'),
      warum: P('t sagt, um wie viele Standardfehler der beobachtete Unterschied von null entfernt liegt. Ein kleines t heißt: Mit so wenigen Personen liegt ein Unterschied von 5 Punkten gut im Bereich dessen, was der Zufall allein bringt. Es heißt nicht, dass kein Effekt da ist.',
        't tells by how many standard errors the observed difference lies away from zero. A small t means: with so few people a difference of 5 points lies well within what chance alone produces. It does not mean that there is no effect.'),
      tipp: P('5 durch den Wert aus dem ersten Schritt teilen.', 'Divide 5 by the value from the first step.'),
      fehler: [{ wert: d => d.diff / d.sd, tipp: P('Das ist der Unterschied in Standardabweichungen (ein Maß für die Effektstärke), nicht der Unterschied in Standardfehlern.', 'That is the difference in standard deviations (a measure of effect size), not the difference in standard errors.') },
        { wert: d => d.diff / (d.sd / Math.sqrt(10)), tipp: P('Der Standardfehler war der eines einzelnen Mittelwerts. Für zwei Gruppen gehört die 2 unter die Wurzel.', 'The standard error used was that of a single mean. For two groups the 2 goes under the root.') }],
      weg: (d, z) => [P(`t = ${z(d.diff)} : ${z(pSe(d, 10), 2)} = ${z(d.diff / pSe(d, 10), 2)}`, `t = ${z(d.diff)} : ${z(pSe(d, 10), 2)} = ${z(d.diff / pSe(d, 10), 2)}`)] },
    { id: 't-160', stellen: 2, toleranz: 0.01, soll: d => d.diff / pSe(d, 160),
      frage: P('Wie groß ist t bei 160 Personen je Gruppe, mit demselben Unterschied und derselben Standardabweichung?', 'How large is t with 160 people per group, with the same difference and the same standard deviation?'),
      warum: P('160 ist das Sechzehnfache von 10. Der Standardfehler sinkt mit der Wurzel aus n, hier auf ein Viertel, und t wird viermal so groß. Der Effekt hat sich nicht verändert, nur die Genauigkeit der Messung. Genau deshalb sagt ein kleines p allein nichts darüber, wie groß oder wichtig ein Effekt ist.',
        '160 is sixteen times 10. The standard error falls with the square root of n, here to a quarter, and t becomes four times as large. The effect has not changed, only the precision of the measurement. That is exactly why a small p alone says nothing about how large or important an effect is.'),
      tipp: P('Standardfehler: 10 mal Wurzel aus (2 : 160), dann 5 durch diesen Wert.', 'Standard error: 10 times the square root of (2 : 160), then 5 divided by this value.'),
      fehler: [{ wert: d => d.diff / pSe(d, 10) * 16, tipp: P('Hier wurde t mit 16 malgenommen, so als wüchse t im gleichen Maß wie n. t wächst aber nur mit der Wurzel aus n.', 'Here t was multiplied by 16, as if t grew in step with n. t grows only with the square root of n.') },
        { wert: d => d.diff / pSe(d, 10), tipp: P('Das ist t für 10 Personen je Gruppe. Gefragt ist die Gruppengröße 160.', 'That is t for 10 people per group. The group size 160 is asked for.') }],
      weg: (d, z) => [P(`Standardfehler: ${z(d.sd)} · Wurzel aus (2 : 160) = ${z(pSe(d, 160), 3)}; t = ${z(d.diff)} : ${z(pSe(d, 160), 3)} = ${z(d.diff / pSe(d, 160), 2)}`, `Standard error: ${z(d.sd)} · square root of (2 : 160) = ${z(pSe(d, 160), 3)}; t = ${z(d.diff)} : ${z(pSe(d, 160), 3)} = ${z(d.diff / pSe(d, 160), 2)}`)] },
    { id: 'p-40', stellen: 3, toleranz: 0.001, soll: d => d.p40,
      frage: P('Bei 40 Personen je Gruppe ist t = 2,24 mit 78 Freiheitsgraden. Wie groß ist der zweiseitige p-Wert? Im Rechner „Gruppen aus Kennzahlen vergleichen“ ablesen und auf drei Stellen runden.', 'With 40 people per group t = 2.24 with 78 degrees of freedom. How large is the two-sided p value? Read it off the calculator "Compare groups from summary numbers" and round to three decimal places.'),
      warum: P('Den p-Wert rechnet man nicht von Hand, sondern liest ihn aus der t-Verteilung ab: Er ist die Fläche an beiden Enden jenseits von minus und plus t. Mit denselben 5 Punkten Unterschied lag p bei 10 Personen je Gruppe bei 0,278 und bei 40 Personen bei 0,028. Der Zufall wird bei größerem n immer weniger plausibel, die Effektgröße bleibt gleich.',
        'The p value is not calculated by hand but read off the t distribution: it is the area at both ends beyond minus and plus t. With the same 5 points of difference p was 0.278 with 10 people per group and 0.028 with 40 people. Chance becomes less and less plausible with larger n, the effect size stays the same.'),
      tipp: P('Im Rechner Mittelwerte 5 und 0, Standardabweichung 10 und 10, je 40 Personen eintragen. Der Test mit gleicher Streuung zeigt p.', 'In the calculator enter means 5 and 0, standard deviations 10 and 10, 40 people each. The test with equal variance shows p.'),
      fehler: [{ wert: d => d.p40einseitig, tipp: P('Das ist der einseitige p-Wert, genau die Hälfte. Gefragt ist der zweiseitige.', 'That is the one-sided p value, exactly half. The two-sided one is asked for.') },
        { wert: d => d.p10, tipp: P('Das ist der p-Wert für 10 Personen je Gruppe. Gefragt sind 40 Personen je Gruppe.', 'That is the p value for 10 people per group. 40 people per group are asked for.') }],
      weg: (d, z) => [P(`t = ${z(d.diff / pSe(d, 40), 2)} bei 78 Freiheitsgraden: Fläche an beiden Enden = ${z(d.p40, 3)}`, `t = ${z(d.diff / pSe(d, 40), 2)} at 78 degrees of freedom: area at both ends = ${z(d.p40, 3)}`)] }
  ],
  merke: P('Bei gleichem Effekt wächst t mit der Wurzel aus n, und p sinkt: 10 Personen je Gruppe ergaben p = 0,278, 40 ergaben p = 0,028, 160 ergeben ein p nahe null. Ein kleines p heißt darum nicht, dass der Effekt groß ist, und ein großes p nicht, dass keiner da ist. Zum p-Wert gehört immer die Größe des Effekts samt Intervall.',
    'With the same effect t grows with the square root of n, and p falls: 10 people per group gave p = 0.278, 40 gave p = 0.028, 160 give a p close to zero. A small p therefore does not mean that the effect is large, and a large p does not mean there is none. The p value always belongs together with the size of the effect and its interval.'),
  ausprobieren: P('Als Nächstes: im Rechner „Gruppen aus Kennzahlen vergleichen“ dieselben Mittelwerte und Standardabweichungen mit 10, 40 und 160 Personen eintragen und p, den Effekt und das Konfidenzintervall nebeneinander ansehen. Der Effekt bleibt, das Intervall wird schmaler.',
    'Next: in the calculator "Compare groups from summary numbers" enter the same means and standard deviations with 10, 40 and 160 people and look at p, the effect and the confidence interval side by side. The effect stays, the interval gets narrower.')
});

// ---------------------------------------------------------------- 5. Beta-Posterior für einen Anteil
export const DATEN_BAYES = { a: 3, b: 7, treffer: 14, n: 20 };
type DB = typeof DATEN_BAYES;
const bA = (d: DB) => d.a + d.treffer, bB = (d: DB) => d.b + d.n - d.treffer, bM = (d: DB) => bA(d) / (bA(d) + bB(d));
const BAYES = bau({
  id: 'beta-posterior',
  daten: DATEN_BAYES,
  lage: P('Ein Training soll Menschen bei Rückenschmerzen helfen. Frühere kleine Berichte lassen vermuten, dass es etwa 3 von 10 hilft. Dieses Vorwissen wird als Beta-Verteilung mit a = 3 und b = 7 ausgedrückt (wie 3 frühere Erfolge und 7 frühere Misserfolge). Nun probieren 20 neue Personen das Training, 14 berichten von einer Besserung. Wie sieht das Wissen danach aus?',
    'A training is meant to help people with back pain. Earlier small reports suggest that it helps about 3 out of 10. This prior knowledge is expressed as a beta distribution with a = 3 and b = 7 (like 3 earlier successes and 7 earlier failures). Now 20 new people try the training, 14 report an improvement. What does the knowledge look like afterwards?'),
  tabelle: { titel: P('Vorwissen und neue Daten', 'Prior knowledge and new data'), kopf: [P('Angabe', 'Item'), P('Wert', 'Value')],
    zeilen: [[P('Vorwissen: frühere Erfolge (a)', 'Prior: earlier successes (a)'), 3], [P('Vorwissen: frühere Misserfolge (b)', 'Prior: earlier failures (b)'), 7], [P('Neue Personen', 'New people'), 20], [P('Davon gebessert', 'Of these improved'), 14]] },
  schritte: [
    { id: 'prior-mittel', stellen: 2, toleranz: 0.005, soll: d => d.a / (d.a + d.b),
      frage: P('Wie groß ist der Anteil, den das Vorwissen erwartet (der Mittelwert der Beta-Verteilung mit a = 3 und b = 7)? Rechnen: a : (a + b).', 'How large is the share the prior expects (the mean of the beta distribution with a = 3 and b = 7)? Calculate: a : (a + b).'),
      warum: P('Der Mittelwert einer Beta-Verteilung ist a : (a + b). Er sagt, welchen Anteil das Vorwissen im Mittel erwartet. a + b = 10 zeigt zugleich, wie stark das Vorwissen ist: Es wiegt so viel wie 10 frühere Beobachtungen.',
        'The mean of a beta distribution is a : (a + b). It says which share the prior expects on average. a + b = 10 also shows how strong the prior is: it weighs as much as 10 earlier observations.'),
      tipp: P('3 durch (3 + 7) teilen.', 'Divide 3 by (3 + 7).'),
      fehler: [{ wert: d => d.b / (d.a + d.b), tipp: P('Das ist der erwartete Anteil der Misserfolge. Gefragt ist der Anteil der Erfolge: a im Zähler.', 'That is the expected share of failures. The share of successes is asked for: a in the numerator.') },
        { wert: d => d.a / d.b, tipp: P('Das Verhältnis 3 : 7 ist die Quote (Odds), nicht der Anteil. Im Nenner steht a + b.', 'The ratio 3 : 7 is the odds, not the share. The denominator is a + b.') }],
      weg: (d, z) => [P(`${d.a} : (${d.a} + ${d.b}) = ${d.a} : ${d.a + d.b} = ${z(d.a / (d.a + d.b), 2)}`, `${d.a} : (${d.a} + ${d.b}) = ${d.a} : ${d.a + d.b} = ${z(d.a / (d.a + d.b), 2)}`)] },
    { id: 'post-a', stellen: 0, toleranz: 0.01, soll: d => bA(d),
      frage: P('Wie groß ist a der Verteilung nach den Daten? Rechnen: a plus Zahl der Erfolge.', 'How large is a of the distribution after the data? Calculate: a plus the number of successes.'),
      warum: P('Beta-Verteilungen passen zu Anteilen. Kommen neue Daten, werden die Erfolge zu a und die Misserfolge zu b hinzugezählt. Das Ergebnis ist wieder eine Beta-Verteilung, die Posterior-Verteilung. Das Vorwissen verhält sich wie frühere Beobachtungen, die einfach mitgezählt werden.',
        'Beta distributions fit shares. When new data arrive, the successes are added to a and the failures to b. The result is again a beta distribution, the posterior distribution. The prior behaves like earlier observations that are simply counted along.'),
      tipp: P('Zu a = 3 die 14 gebesserten Personen addieren.', 'Add the 14 improved people to a = 3.'),
      fehler: [{ wert: d => d.treffer, tipp: P('Das sind nur die neuen Erfolge. Das Vorwissen (a = 3) zählt mit.', 'These are only the new successes. The prior (a = 3) counts along.') },
        { wert: d => d.a + d.n, tipp: P('Hier wurde die Zahl aller neuen Personen addiert. Zu a gehören nur die Erfolge.', 'Here the number of all new people was added. Only the successes belong to a.') }],
      weg: (d, z) => [P(`a' = ${d.a} + ${d.treffer} = ${z(bA(d))}`, `a' = ${d.a} + ${d.treffer} = ${z(bA(d))}`)] },
    { id: 'post-b', stellen: 0, toleranz: 0.01, soll: d => bB(d),
      frage: P('Wie groß ist b der Verteilung nach den Daten? Rechnen: b plus Zahl der Misserfolge (Personen ohne Besserung).', 'How large is b of the distribution after the data? Calculate: b plus the number of failures (people without improvement).'),
      warum: P('Die Misserfolge werden zu b gezählt. Von 20 neuen Personen sind 14 gebessert, also 20 minus 14 = 6 nicht. Die Summe a plus b gibt wieder die Stärke der Verteilung an: hier 30, das sind 10 Beobachtungen Vorwissen plus 20 neue.',
        'The failures are added to b. Of 20 new people 14 improved, so 20 minus 14 = 6 did not. The sum a plus b again gives the strength of the distribution: here 30, which is 10 observations of prior knowledge plus 20 new ones.'),
      tipp: P('Erst die Misserfolge bestimmen (20 − 14), dann zu b = 7 addieren.', 'First find the failures (20 − 14), then add them to b = 7.'),
      fehler: [{ wert: d => d.b + d.treffer, tipp: P('Hier wurden die Erfolge zu b gezählt. Zu b gehören die Misserfolge.', 'Here the successes were added to b. The failures belong to b.') },
        { wert: d => d.n - d.treffer, tipp: P('Das sind nur die neuen Misserfolge. Das Vorwissen (b = 7) zählt mit.', 'These are only the new failures. The prior (b = 7) counts along.') }],
      weg: (d, z) => [P(`Misserfolge: ${d.n} − ${d.treffer} = ${z(d.n - d.treffer)}; b' = ${d.b} + ${z(d.n - d.treffer)} = ${z(bB(d))}`, `Failures: ${d.n} − ${d.treffer} = ${z(d.n - d.treffer)}; b' = ${d.b} + ${z(d.n - d.treffer)} = ${z(bB(d))}`)] },
    { id: 'post-mittel', stellen: 2, toleranz: 0.005, soll: d => bM(d),
      frage: P('Wie groß ist der erwartete Anteil nach den Daten (Mittelwert der neuen Beta-Verteilung)? Rechnen: a′ : (a′ + b′).', 'How large is the expected share after the data (mean of the new beta distribution)? Calculate: a′ : (a′ + b′).'),
      warum: P('Der Posterior-Mittelwert liegt zwischen dem Vorwissen (0,30) und dem Anteil der Stichprobe (0,70). Er wird vom Vorwissen ein Stück nach unten gezogen, weil dieses wie 10 Beobachtungen zählt. Mit mehr neuen Daten käme er dem Anteil der Stichprobe immer näher: Die Daten überstimmen das Vorwissen.',
        'The posterior mean lies between the prior (0.30) and the share of the sample (0.70). The prior pulls it down a little because it counts as 10 observations. With more new data it would come ever closer to the share of the sample: the data outvote the prior.'),
      tipp: P('Die beiden Zahlen der letzten Schritte einsetzen: a′ geteilt durch (a′ + b′).', 'Insert the two numbers from the last steps: a′ divided by (a′ + b′).'),
      fehler: [{ wert: d => d.treffer / d.n, tipp: P('Das ist der Anteil in der Stichprobe allein (14 von 20) ohne Vorwissen.', 'That is the share in the sample alone (14 of 20) without the prior.') },
        { wert: d => bA(d) / bB(d), tipp: P('Das ist ein Verhältnis a′ : b′ (Quote), kein Anteil. Im Nenner steht a′ + b′.', 'That is a ratio a′ : b′ (odds), not a share. The denominator is a′ + b′.') }],
      weg: (d, z) => [P(`${z(bA(d))} : (${z(bA(d))} + ${z(bB(d))}) = ${z(bA(d))} : ${z(bA(d) + bB(d))} = ${z(bM(d), 2)}`, `${z(bA(d))} : (${z(bA(d))} + ${z(bB(d))}) = ${z(bA(d))} : ${z(bA(d) + bB(d))} = ${z(bM(d), 2)}`)] }
  ],
  merke: P('Beta(a, b) plus s Erfolge in n Versuchen ergibt Beta(a + s, b + n − s). Der Mittelwert dieser Posterior-Verteilung liegt zwischen dem Anteil des Vorwissens und dem Anteil der Stichprobe, näher bei dem, der mehr Beobachtungen hat. Die Wahl des Priors gehört offen berichtet, und ein Vergleich mit einem schwächeren Prior zeigt, wie viel er ausmacht.',
    'Beta(a, b) plus s successes in n trials gives Beta(a + s, b + n − s). The mean of this posterior distribution lies between the share of the prior and the share of the sample, closer to whichever has more observations. The choice of the prior should be reported openly, and a comparison with a weaker prior shows how much it matters.'),
  ausprobieren: P('Als Nächstes: dieselbe Rechnung mit schwachem Vorwissen (a = 1, b = 1, ein Prior ohne Vorliebe) durchführen: Der Posterior-Mittelwert liegt dann bei 15 : 22 = 0,68, fast beim Anteil der Stichprobe. Im Lernlabor „Bayes mit Vorwissen“ lassen sich Vorwissen und Daten mit Reglern verändern; die Kurven zeigen, wie daraus das Wissen nachher wird.',
    'Next: do the same calculation with weak prior knowledge (a = 1, b = 1, a prior without preference): the posterior mean is then 15 : 22 = 0.68, almost at the share of the sample. In the learning lab "Bayes with prior knowledge" sliders change the prior knowledge and the data; the curves show how this becomes the knowledge afterwards.')
});

export const AUFGABEN_SF: Rechenaufgabe[] = [KREIS, HACK, VORREG, PWERT, BAYES];
