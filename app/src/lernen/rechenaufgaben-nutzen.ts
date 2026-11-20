/**
 * Rechenaufgaben der Psychometrie-Einheiten (Stufe 4 „nutzen“, 09.11.2026): Rasch und 2PL (irt-rasch), McDonalds Omega aus Ladungen (konfirmatorische-fa),
 * Änderung des CFI bei der Messinvarianz (messinvarianz) und indirekter Effekt im Pfadmodell (pfadmodell-sem). Aufbau und Regeln wie in `rechenaufgaben-vv.ts`;
 * alle Zahlen sind erfunden und klein genug für den Taschenrechner. Das Soll wird in `bau` aus den Rohdaten gerechnet, nie von Hand geschrieben.
 * Sollwerte aus R stehen noch aus: `rechenaufgaben-nutzen.soll.ts` liest `lib/testdaten/ueben-erwartet-nutzen.json`; ein Prüfer füllt sie anhand von
 * `docs/nutzen/RECHENAUFGABEN-NUTZEN-AUFTRAG.md` auf einem anderen Weg als die Formeln hier.
 */
import { P } from '../i18n/laufzeit';
import { bau, summe, type Rechenaufgabe } from './rechenaufgaben-bau';

// ---------------------------------------------------------------- 1. Rasch und 2PL: Lösungswahrscheinlichkeit
/** Eine Person mit Fähigkeit θ = 1 und vier Aufgaben: Schwierigkeit b und Trennschärfe a (Rasch: a = 1). */
export const DATEN_IRT = { theta: 1, b: [0, 1, 2, 0], a: [1, 1, 1, 2] };
type DI = typeof DATEN_IRT;
/** Wahrscheinlichkeit einer richtigen Antwort im 2PL-Modell (a = 1 ergibt das Rasch-Modell). */
const pLoesung = (theta: number, a: number, b: number) => 1 / (1 + Math.exp(-a * (theta - b)));
const IRT = bau({
  id: 'irt-wahrscheinlichkeit',
  daten: DATEN_IRT,
  lage: P('Ein Test hat vier Aufgaben mit Antworten richtig oder falsch. Statable hat Schwierigkeit b und Trennschärfe a jeder Aufgabe geschätzt. Aufgaben A bis C folgen dem Rasch-Modell (alle a = 1), Aufgabe D dem 2PL-Modell mit a = 2. Eine Person hat die Fähigkeit 1 (auf derselben Achse wie b). Die Wahrscheinlichkeit einer richtigen Antwort ist 1 geteilt durch (1 plus e hoch minus a mal (Fähigkeit minus b)).',
    'A test has four tasks with answers right or wrong. Statable has estimated the difficulty b and the discrimination a of each task. Tasks A to C follow the Rasch model (all a = 1), task D follows the 2PL model with a = 2. A person has the ability 1 (on the same axis as b). The probability of a right answer is 1 divided by (1 plus e to the power of minus a times (ability minus b)).'),
  tabelle: { titel: P('Aufgabenparameter', 'Task parameters'), kopf: [P('Aufgabe', 'Task'), P('Schwierigkeit b', 'Difficulty b'), P('Trennschärfe a', 'Discrimination a')],
    zeilen: [[P('Aufgabe A', 'Task A'), DATEN_IRT.b[0]!, DATEN_IRT.a[0]!], [P('Aufgabe B', 'Task B'), DATEN_IRT.b[1]!, DATEN_IRT.a[1]!], [P('Aufgabe C', 'Task C'), DATEN_IRT.b[2]!, DATEN_IRT.a[2]!], [P('Aufgabe D', 'Task D'), DATEN_IRT.b[3]!, DATEN_IRT.a[3]!]] },
  schritte: [
    { id: 'rasch-leicht', stellen: 2, toleranz: 0.005, soll: (d: DI) => pLoesung(d.theta, d.a[0]!, d.b[0]!),
      frage: P('Wie wahrscheinlich löst die Person Aufgabe A (b = 0) richtig? Rechnen: 1 geteilt durch (1 plus e hoch minus (Fähigkeit minus b)).', 'How likely does the person solve task A (b = 0) correctly? Calculate: 1 divided by (1 plus e to the power of minus (ability minus b)).'),
      warum: P('Je weiter die Fähigkeit über der Schwierigkeit liegt, desto näher rückt die Wahrscheinlichkeit an 1. Der Abstand zwischen Fähigkeit und Schwierigkeit (hier 1) ist alles, was im Rasch-Modell zählt; die logistische Funktion macht daraus eine Wahrscheinlichkeit zwischen 0 und 1.',
        'The further the ability lies above the difficulty, the closer the probability moves to 1. The distance between ability and difficulty (here 1) is all that counts in the Rasch model; the logistic function turns it into a probability between 0 and 1.'),
      tipp: P('Erst den Exponenten bilden: minus (1 minus 0). Dann e hoch diesen Wert nehmen, 1 addieren und 1 durch die Summe teilen.', 'First form the exponent: minus (1 minus 0). Then take e to the power of this value, add 1 and divide 1 by the sum.'),
      fehler: [
        { wert: (d: DI) => Math.exp(d.theta - d.b[0]!), tipp: P('Das ist das Chancenverhältnis (Odds), nicht die Wahrscheinlichkeit. Die Wahrscheinlichkeit ist Odds geteilt durch (1 plus Odds).', 'That is the odds, not the probability. The probability is odds divided by (1 plus odds).') },
        { wert: (d: DI) => 1 - pLoesung(d.theta, d.a[0]!, d.b[0]!), tipp: P('Das ist die Wahrscheinlichkeit einer falschen Antwort. Gefragt ist die einer richtigen Antwort, die bei einer Fähigkeit über der Schwierigkeit über 50 % liegt.', 'That is the probability of a wrong answer. The probability of a right answer is asked for, and it lies above 50% when the ability is above the difficulty.') }
      ],
      weg: (d: DI, z) => [
        P(`Exponent: −(${z(d.theta)} − ${z(d.b[0]!)}) = ${z(-(d.theta - d.b[0]!))}`, `Exponent: −(${z(d.theta)} − ${z(d.b[0]!)}) = ${z(-(d.theta - d.b[0]!))}`),
        P(`Wahrscheinlichkeit: 1 : (1 + e hoch ${z(-(d.theta - d.b[0]!))}) = 1 : ${z(1 + Math.exp(-(d.theta - d.b[0]!)), 3)} = ${z(pLoesung(d.theta, d.a[0]!, d.b[0]!), 2)}`, `Probability: 1 : (1 + e to the power of ${z(-(d.theta - d.b[0]!))}) = 1 : ${z(1 + Math.exp(-(d.theta - d.b[0]!)), 3)} = ${z(pLoesung(d.theta, d.a[0]!, d.b[0]!), 2)}`)
      ] },
    { id: 'rasch-gleich', stellen: 2, toleranz: 0.005, soll: (d: DI) => pLoesung(d.theta, d.a[1]!, d.b[1]!),
      frage: P('Wie wahrscheinlich löst die Person Aufgabe B (b = 1) richtig?', 'How likely does the person solve task B (b = 1) correctly?'),
      warum: P('Liegen Fähigkeit und Schwierigkeit gleich hoch, ist der Exponent 0, e hoch 0 ist 1, und die Wahrscheinlichkeit ist genau 1 geteilt durch 2. Darum ist die Schwierigkeit b die Fähigkeit, bei der eine Aufgabe mit 50 % gelöst wird.',
        'If ability and difficulty are equally high, the exponent is 0, e to the power of 0 is 1, and the probability is exactly 1 divided by 2. That is why the difficulty b is the ability at which a task is solved with 50%.'),
      tipp: P('Fähigkeit minus b ergibt hier 0. Was ist e hoch 0?', 'Ability minus b gives 0 here. What is e to the power of 0?'),
      fehler: [
        { wert: (d: DI) => pLoesung(d.theta, d.a[1]!, 0), tipp: P('Hier wurde b = 0 eingesetzt (Aufgabe A). Für Aufgabe B ist b = 1.', 'Here b = 0 was used (task A). For task B, b is 1.') },
        { wert: () => 1, tipp: P('Eine Wahrscheinlichkeit von 1 würde heißen, dass die Person die Aufgabe sicher löst. Bei gleicher Höhe von Fähigkeit und Schwierigkeit ist es Münzwurf.', 'A probability of 1 would mean the person certainly solves the task. At equal height of ability and difficulty it is a coin toss.') }
      ],
      weg: (d: DI, z) => [
        P(`Exponent: −(${z(d.theta)} − ${z(d.b[1]!)}) = ${z(-(d.theta - d.b[1]!))}, e hoch 0 = 1`, `Exponent: −(${z(d.theta)} − ${z(d.b[1]!)}) = ${z(-(d.theta - d.b[1]!))}, e to the power of 0 = 1`),
        P(`Wahrscheinlichkeit: 1 : (1 + 1) = ${z(pLoesung(d.theta, d.a[1]!, d.b[1]!), 2)}`, `Probability: 1 : (1 + 1) = ${z(pLoesung(d.theta, d.a[1]!, d.b[1]!), 2)}`)
      ] },
    { id: 'rasch-schwer', stellen: 2, toleranz: 0.005, soll: (d: DI) => pLoesung(d.theta, d.a[2]!, d.b[2]!),
      frage: P('Wie wahrscheinlich löst die Person Aufgabe C (b = 2) richtig?', 'How likely does the person solve task C (b = 2) correctly?'),
      warum: P('Die Aufgabe liegt über der Fähigkeit der Person. Der Exponent wird positiv, e hoch 1 ist rund 2,72, und die Wahrscheinlichkeit sinkt unter die Hälfte. Je größer b, desto schwerer die Aufgabe.',
        'The task lies above the ability of the person. The exponent becomes positive, e to the power of 1 is about 2.72, and the probability falls below one half. The larger b, the harder the task.'),
      tipp: P('Fähigkeit minus b ergibt hier minus 1, der Exponent also plus 1.', 'Ability minus b gives minus 1 here, so the exponent is plus 1.'),
      fehler: [
        { wert: (d: DI) => pLoesung(d.b[2]!, d.a[2]!, d.theta), tipp: P('Hier wurden Fähigkeit und Schwierigkeit vertauscht. Die Aufgabe ist schwerer als die Person fähig ist, also unter 50 %.', 'Here ability and difficulty were swapped. The task is harder than the person is able, so below 50%.') },
        { wert: (d: DI) => pLoesung(d.theta + d.b[2]!, d.a[2]!, 0), tipp: P('Hier wurde Fähigkeit plus b gerechnet. Es zählt der Abstand: Fähigkeit minus b.', 'Here ability plus b was calculated. The distance counts: ability minus b.') }
      ],
      weg: (d: DI, z) => [
        P(`Exponent: −(${z(d.theta)} − ${z(d.b[2]!)}) = ${z(-(d.theta - d.b[2]!))}`, `Exponent: −(${z(d.theta)} − ${z(d.b[2]!)}) = ${z(-(d.theta - d.b[2]!))}`),
        P(`Wahrscheinlichkeit: 1 : (1 + e hoch ${z(-(d.theta - d.b[2]!))}) = 1 : ${z(1 + Math.exp(-(d.theta - d.b[2]!)), 3)} = ${z(pLoesung(d.theta, d.a[2]!, d.b[2]!), 2)}`, `Probability: 1 : (1 + e to the power of ${z(-(d.theta - d.b[2]!))}) = 1 : ${z(1 + Math.exp(-(d.theta - d.b[2]!)), 3)} = ${z(pLoesung(d.theta, d.a[2]!, d.b[2]!), 2)}`)
      ] },
    { id: 'zwei-pl', stellen: 2, toleranz: 0.005, soll: (d: DI) => pLoesung(d.theta, d.a[3]!, d.b[3]!),
      frage: P('Wie wahrscheinlich löst die Person Aufgabe D (b = 0, a = 2) richtig? Rechnen: Der Exponent ist minus a mal (Fähigkeit minus b).', 'How likely does the person solve task D (b = 0, a = 2) correctly? Calculate: the exponent is minus a times (ability minus b).'),
      warum: P('Die Trennschärfe a macht die Kennlinie steiler: Derselbe Abstand zwischen Fähigkeit und Schwierigkeit zählt doppelt. Gegenüber Aufgabe A (gleiches b, a = 1) steigt die Wahrscheinlichkeit darum von rund 73 % auf rund 88 %.',
        'The discrimination a makes the curve steeper: the same distance between ability and difficulty counts twice. Compared with task A (same b, a = 1) the probability therefore rises from about 73% to about 88%.'),
      tipp: P('Erst die Fähigkeit minus b (1 minus 0), dann mal a (2), dann das Vorzeichen umdrehen: Das ist der Exponent.', 'First ability minus b (1 minus 0), then times a (2), then flip the sign: that is the exponent.'),
      fehler: [
        { wert: (d: DI) => pLoesung(d.theta, 1, d.b[3]!), tipp: P('Hier wurde a = 1 gerechnet (wie im Rasch-Modell). Aufgabe D hat a = 2.', 'Here a = 1 was used (as in the Rasch model). Task D has a = 2.') },
        { wert: (d: DI) => 1 / (1 + Math.exp(-(d.a[3]! + d.theta - d.b[3]!))), tipp: P('Hier wurde a zum Abstand addiert. Die Trennschärfe wird mit dem Abstand multipliziert.', 'Here a was added to the distance. The discrimination is multiplied with the distance.') }
      ],
      weg: (d: DI, z) => [
        P(`Exponent: −${z(d.a[3]!)} · (${z(d.theta)} − ${z(d.b[3]!)}) = ${z(-d.a[3]! * (d.theta - d.b[3]!))}`, `Exponent: −${z(d.a[3]!)} · (${z(d.theta)} − ${z(d.b[3]!)}) = ${z(-d.a[3]! * (d.theta - d.b[3]!))}`),
        P(`Wahrscheinlichkeit: 1 : (1 + e hoch ${z(-d.a[3]! * (d.theta - d.b[3]!))}) = 1 : ${z(1 + Math.exp(-d.a[3]! * (d.theta - d.b[3]!)), 3)} = ${z(pLoesung(d.theta, d.a[3]!, d.b[3]!), 2)}`, `Probability: 1 : (1 + e to the power of ${z(-d.a[3]! * (d.theta - d.b[3]!))}) = 1 : ${z(1 + Math.exp(-d.a[3]! * (d.theta - d.b[3]!)), 3)} = ${z(pLoesung(d.theta, d.a[3]!, d.b[3]!), 2)}`)
      ] }
  ],
  merke: P('Wahrscheinlichkeit einer richtigen Antwort = 1 : (1 + e hoch minus a · (Fähigkeit − b)). Bei gleicher Höhe von Fähigkeit und Schwierigkeit sind es 50 %. Im Rasch-Modell ist a für alle Aufgaben 1; im 2PL-Modell hat jede Aufgabe ihr eigenes a: Je größer a, desto steiler die Kennlinie und desto besser trennt die Aufgabe.',
    'Probability of a right answer = 1 : (1 + e to the power of minus a · (ability − b)). At equal height of ability and difficulty it is 50%. In the Rasch model a is 1 for all tasks; in the 2PL model every task has its own a: the larger a, the steeper the characteristic curve and the better the task separates.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Verbale Aggression“ öffnen, im Schritt „Messen alle 24 Situationen dasselbe?“ unter dem Ergebnis die Abschnitte „Rasch-Modell: Passen die Aufgaben zusammen?“ und „2PL-Modell: Trennen alle Aufgaben gleich gut?“ aufklappen und in der Tabelle Schwierigkeit und Trennschärfe einzelner Situationen ablesen.',
    'Next: open the example "Verbal aggression", in the step "Do all 24 situations measure the same thing?" open the sections "Rasch model: do the tasks fit together?" and "2PL model: do all tasks separate equally well?" below the result and read the difficulty and discrimination of single situations in the table.')
});

// ---------------------------------------------------------------- 2. McDonalds Omega aus vier standardisierten Ladungen
/** Vier Fragen einer Skala mit standardisierten Ladungen auf einem Faktor. */
export const DATEN_OMEGA = { namen: ['Frage 1', 'Frage 2', 'Frage 3', 'Frage 4'], lam: [0.8, 0.7, 0.6, 0.5] };
type DO = typeof DATEN_OMEGA;
const oSumme = (d: DO) => summe(d.lam);
const oRest = (d: DO) => summe(d.lam.map(l => 1 - l * l));
const oOmega = (d: DO) => (oSumme(d) ** 2) / (oSumme(d) ** 2 + oRest(d));
const OMEGA = bau({
  id: 'omega-ladungen',
  daten: DATEN_OMEGA,
  lage: P('Eine Skala hat vier Fragen. Die konfirmatorische Faktorenanalyse (CFA) hat für jede Frage die standardisierte Ladung auf dem einen Faktor geliefert. Daraus lässt sich McDonalds Omega (ω), die Zuverlässigkeit der Skala, von Hand berechnen: ω = (Summe der Ladungen)² geteilt durch ((Summe der Ladungen)² plus Summe der Restvarianzen). Die Restvarianz einer Frage ist 1 minus Ladung².',
    'A scale has four questions. The confirmatory factor analysis (CFA) has given for each question the standardised loading on the one factor. From it McDonald\'s omega (ω), the reliability of the scale, can be calculated by hand: ω = (sum of loadings)² divided by ((sum of loadings)² plus sum of residual variances). The residual variance of a question is 1 minus loading².'),
  tabelle: { titel: P('Standardisierte Ladungen', 'Standardised loadings'), kopf: [P('Frage', 'Question'), P('Ladung', 'Loading')],
    zeilen: DATEN_OMEGA.namen.map((n, i) => [n === 'Frage 1' ? P('Frage 1', 'Question 1') : n === 'Frage 2' ? P('Frage 2', 'Question 2') : n === 'Frage 3' ? P('Frage 3', 'Question 3') : P('Frage 4', 'Question 4'), DATEN_OMEGA.lam[i]!]) },
  schritte: [
    { id: 'summe-ladung', stellen: 1, toleranz: 0.05, soll: oSumme,
      frage: P('Wie groß ist die Summe der vier Ladungen?', 'How large is the sum of the four loadings?'),
      warum: P('Im Zähler von ω stehen die Beiträge der Fragen zum gemeinsamen Faktor. Sie werden zuerst addiert und dann quadriert: Beiträge in dieselbe Richtung verstärken einander, deshalb zählt die Summe und nicht die Summe der Quadrate.',
        'In the numerator of ω stand the contributions of the questions to the common factor. They are added first and then squared: contributions in the same direction reinforce each other, which is why the sum counts and not the sum of the squares.'),
      tipp: P('Die vier Ladungen einfach addieren, noch nicht quadrieren.', 'Simply add the four loadings, do not square yet.'),
      fehler: [
        { wert: (d: DO) => summe(d.lam.map(l => l * l)), tipp: P('Das ist die Summe der quadrierten Ladungen. Im Zähler von ω wird erst addiert und dann quadriert.', 'That is the sum of the squared loadings. In the numerator of ω the loadings are added first and then squared.') },
        { wert: (d: DO) => summe(d.lam) / d.lam.length, tipp: P('Das ist der Mittelwert der Ladungen. Gefragt ist die Summe, ohne durch 4 zu teilen.', 'That is the mean of the loadings. The sum is asked for, without dividing by 4.') }
      ],
      weg: (d: DO, z) => [P(`Summe: ${d.lam.map(l => z(l, 1)).join(' + ')} = ${z(oSumme(d), 1)}`, `Sum: ${d.lam.map(l => z(l, 1)).join(' + ')} = ${z(oSumme(d), 1)}`)] },
    { id: 'rest-summe', stellen: 2, toleranz: 0.005, soll: oRest,
      frage: P('Wie groß ist die Summe der Restvarianzen? Je Frage: 1 minus Ladung zum Quadrat.', 'How large is the sum of the residual variances? Per question: 1 minus loading squared.'),
      warum: P('Von der Streuung jeder (standardisierten) Frage ist der Teil, den der Faktor erklärt, die quadrierte Ladung. Der Rest, 1 minus Ladung², ist der Teil, der nur an dieser Frage hängt, also Messfehler und Besonderheiten. Diese Reste stehen im Nenner.',
        'Of the spread of each (standardised) question the part the factor explains is the squared loading. The rest, 1 minus loading², is the part that belongs to this question alone, that is measurement error and peculiarities. These residuals stand in the denominator.'),
      tipp: P('Jede Ladung quadrieren (0,64; 0,49; 0,36; 0,25), von 1 abziehen und die vier Reste addieren.', 'Square each loading (0.64; 0.49; 0.36; 0.25), subtract from 1 and add the four residuals.'),
      fehler: [
        { wert: (d: DO) => summe(d.lam.map(l => 1 - l)), tipp: P('Hier wurde 1 minus Ladung gerechnet, ohne die Ladung zu quadrieren. Die Restvarianz ist 1 minus Ladung².', 'Here 1 minus loading was calculated without squaring the loading. The residual variance is 1 minus loading².') },
        { wert: (d: DO) => summe(d.lam.map(l => l * l)), tipp: P('Das ist die Summe der erklärten Anteile (Ladung²). Die Restvarianz ist das, was von 1 übrig bleibt.', 'That is the sum of the explained shares (loading²). The residual variance is what is left of 1.') }
      ],
      weg: (d: DO, z) => [
        P(`Reste: ${d.lam.map(l => `1 − ${z(l, 1)}² = ${z(1 - l * l, 2)}`).join('; ')}`, `Residuals: ${d.lam.map(l => `1 − ${z(l, 1)}² = ${z(1 - l * l, 2)}`).join('; ')}`),
        P(`Summe: ${d.lam.map(l => z(1 - l * l, 2)).join(' + ')} = ${z(oRest(d), 2)}`, `Sum: ${d.lam.map(l => z(1 - l * l, 2)).join(' + ')} = ${z(oRest(d), 2)}`)
      ] },
    { id: 'omega', stellen: 2, toleranz: 0.005, soll: oOmega,
      frage: P('Wie groß ist ω? Rechnen: (Summe der Ladungen)² geteilt durch ((Summe der Ladungen)² plus Summe der Restvarianzen).', 'How large is ω? Calculate: (sum of loadings)² divided by ((sum of loadings)² plus sum of residual variances).'),
      warum: P('ω ist der Anteil der Gesamtstreuung der Skalensumme, den der gemeinsame Faktor erklärt. Der Zähler ist der gemeinsame Teil, der Nenner der gemeinsame Teil plus der Fehleranteil. Je größer die Ladungen, desto kleiner die Reste und desto näher liegt ω an 1.',
        'ω is the share of the total spread of the scale sum that the common factor explains. The numerator is the common part, the denominator the common part plus the error part. The larger the loadings, the smaller the residuals and the closer ω lies to 1.'),
      tipp: P('Die Summe aus dem ersten Schritt quadrieren (Zähler), dazu die Summe der Restvarianzen addieren (Nenner), dann teilen.', 'Square the sum from the first step (numerator), add the sum of the residual variances (denominator), then divide.'),
      fehler: [
        { wert: (d: DO) => oSumme(d) / (oSumme(d) + oRest(d)), tipp: P('Hier wurde die Summe der Ladungen nicht quadriert. Im Zähler und im ersten Teil des Nenners steht (Summe)².', 'Here the sum of the loadings was not squared. In the numerator and the first part of the denominator stands (sum)².') },
        { wert: (d: DO) => oSumme(d) ** 2 / (oSumme(d) ** 2 + summe(d.lam.map(l => 1 - l))), tipp: P('Die Restvarianz wurde als 1 minus Ladung gerechnet, nicht als 1 minus Ladung².', 'The residual variance was calculated as 1 minus loading, not as 1 minus loading².') },
        { wert: (d: DO) => summe(d.lam.map(l => l * l)) / (summe(d.lam.map(l => l * l)) + oRest(d)), tipp: P('Hier wurde die Summe der quadrierten Ladungen statt des Quadrats der Summe eingesetzt.', 'Here the sum of the squared loadings was used instead of the square of the sum.') }
      ],
      weg: (d: DO, z) => [
        P(`Zähler: ${z(oSumme(d), 1)}² = ${z(oSumme(d) ** 2, 2)}`, `Numerator: ${z(oSumme(d), 1)}² = ${z(oSumme(d) ** 2, 2)}`),
        P(`Nenner: ${z(oSumme(d) ** 2, 2)} + ${z(oRest(d), 2)} = ${z(oSumme(d) ** 2 + oRest(d), 2)}`, `Denominator: ${z(oSumme(d) ** 2, 2)} + ${z(oRest(d), 2)} = ${z(oSumme(d) ** 2 + oRest(d), 2)}`),
        P(`ω = ${z(oSumme(d) ** 2, 2)} : ${z(oSumme(d) ** 2 + oRest(d), 2)} = ${z(oOmega(d), 2)}`, `ω = ${z(oSumme(d) ** 2, 2)} : ${z(oSumme(d) ** 2 + oRest(d), 2)} = ${z(oOmega(d), 2)}`)
      ] }
  ],
  merke: P('ω = (Summe der Ladungen)² : ((Summe der Ladungen)² + Summe der Restvarianzen), Restvarianz = 1 − Ladung². Anders als Cronbachs α erlaubt ω, dass die Fragen unterschiedlich stark zum Faktor beitragen. Sind alle Ladungen gleich stark, stimmen α und ω überein.',
    'ω = (sum of loadings)² : ((sum of loadings)² + sum of residual variances), residual variance = 1 − loading². Unlike Cronbach\'s α, ω allows the questions to contribute to the factor with different strength. If all loadings are equally strong, α and ω agree.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Fragebogen zur Prüfungsangst“ öffnen, im Schritt „Eine Sache oder zwei?“ unter dem Ergebnis den Abschnitt „Ich habe schon eine Vermutung, welche Fragen zusammengehören (konfirmatorisch)“ aufklappen, die Fragen zuordnen, „CFA rechnen“ klicken und die Ladungen in der Tabelle ablesen. Mit der Rechnung von oben lässt sich ω aus ihnen nachvollziehen.',
    'Next: open the example "Test anxiety questionnaire", in the step "One thing or two?" open the section "I already have an idea which questions belong together (confirmatory)" below the result, assign the questions, click "Calculate CFA" and read the loadings in the table. With the calculation above, ω can be followed from them.')
});

// ---------------------------------------------------------------- 3. Messinvarianz: Änderung des CFI
/** Passung (CFI und RMSEA) der drei Stufen konfigural, metrisch, skalar; Faustregel: Der CFI darf um höchstens 0,010 sinken. */
export const DATEN_INVARIANZ = { stufen: ['konfigural', 'metrisch', 'skalar'], cfi: [0.962, 0.958, 0.931], rmsea: [0.045, 0.047, 0.062], grenze: 0.01 };
type DM = typeof DATEN_INVARIANZ;
const mAbfall = (d: DM, von: number, nach: number) => d.cfi[von]! - d.cfi[nach]!;
const mErfuellt = (d: DM) => [mAbfall(d, 0, 1), mAbfall(d, 1, 2)].filter(x => x < d.grenze).length;
const INVARIANZ = bau({
  id: 'invarianz-cfi',
  daten: DATEN_INVARIANZ,
  lage: P('Ein Fragebogen wurde in zwei Gruppen auf Messinvarianz geprüft. Statable zeigt je Stufe die Passung: konfigural (gleiche Struktur), metrisch (zusätzlich gleiche Ladungen) und skalar (zusätzlich gleiche Achsenabschnitte). Nach der Faustregel gilt eine strengere Stufe als nicht erfüllt, wenn der CFI um 0,010 oder mehr sinkt. Statable zieht zusätzlich den RMSEA heran; hier zählt vereinfacht nur der CFI.',
    'A questionnaire was tested for measurement invariance in two groups. Statable shows the fit per level: configural (same structure), metric (additionally equal loadings) and scalar (additionally equal intercepts). By the rule of thumb a stricter level counts as not met if the CFI falls by 0.010 or more. Statable also uses the RMSEA; here, simplified, only the CFI counts.'),
  tabelle: { titel: P('Passung der drei Stufen', 'Fit of the three levels'), kopf: [P('Stufe', 'Level'), P('CFI', 'CFI'), P('RMSEA', 'RMSEA')],
    zeilen: DATEN_INVARIANZ.stufen.map((s, i) => [s === 'konfigural' ? P('konfigural', 'configural') : s === 'metrisch' ? P('metrisch', 'metric') : P('skalar', 'scalar'), DATEN_INVARIANZ.cfi[i]!, DATEN_INVARIANZ.rmsea[i]!]) },
  schritte: [
    { id: 'abfall-metrisch', stellen: 3, toleranz: 0.0005, soll: (d: DM) => mAbfall(d, 0, 1),
      frage: P('Um wie viel sinkt der CFI von der konfiguralen zur metrischen Stufe? Rechnen: CFI der strengeren Stufe abziehen von dem der vorigen.', 'By how much does the CFI fall from the configural to the metric level? Calculate: CFI of the previous level minus CFI of the stricter level.'),
      warum: P('Jede Stufe legt zusätzliche Gleichheiten fest und kann darum nur schlechter oder gleich gut passen. Entscheidend ist nicht, ob der CFI sinkt, sondern wie stark: Ein kleiner Abfall heißt, dass die zusätzliche Gleichheit den Daten kaum widerspricht.',
        'Each level fixes additional equalities and can therefore only fit worse or equally well. What matters is not whether the CFI falls but by how much: a small drop means that the additional equality hardly contradicts the data.'),
      tipp: P('Den CFI der konfiguralen Stufe (0,962) minus den CFI der metrischen Stufe (0,958).', 'The CFI of the configural level (0.962) minus the CFI of the metric level (0.958).'),
      fehler: [
        { wert: (d: DM) => mAbfall(d, 0, 2), tipp: P('Hier wurde die konfigurale mit der skalaren Stufe verglichen. Gefragt ist der Schritt von konfigural zu metrisch.', 'Here the configural was compared with the scalar level. The step from configural to metric is asked for.') },
        { wert: (d: DM) => d.cfi[1]!, tipp: P('Das ist der CFI der metrischen Stufe selbst. Gefragt ist der Unterschied zur vorigen Stufe.', 'That is the CFI of the metric level itself. The difference to the previous level is asked for.') }
      ],
      weg: (d: DM, z) => [P(`Abfall: ${z(d.cfi[0]!, 3)} − ${z(d.cfi[1]!, 3)} = ${z(mAbfall(d, 0, 1), 3)}`, `Drop: ${z(d.cfi[0]!, 3)} − ${z(d.cfi[1]!, 3)} = ${z(mAbfall(d, 0, 1), 3)}`)] },
    { id: 'abfall-skalar', stellen: 3, toleranz: 0.0005, soll: (d: DM) => mAbfall(d, 1, 2),
      frage: P('Um wie viel sinkt der CFI von der metrischen zur skalaren Stufe?', 'By how much does the CFI fall from the metric to the scalar level?'),
      warum: P('Der Vergleich läuft immer von Stufe zu Stufe (konfigural zu metrisch, metrisch zu skalar). So sieht man, welche zusätzliche Gleichheit die Passung verschlechtert: erst die gleichen Ladungen, dann die gleichen Achsenabschnitte.',
        'The comparison runs from level to level (configural to metric, metric to scalar). That shows which additional equality worsens the fit: first the equal loadings, then the equal intercepts.'),
      tipp: P('Den CFI der metrischen Stufe (0,958) minus den CFI der skalaren Stufe (0,931).', 'The CFI of the metric level (0.958) minus the CFI of the scalar level (0.931).'),
      fehler: [
        { wert: (d: DM) => mAbfall(d, 0, 2), tipp: P('Hier wurde von der konfiguralen Stufe aus gerechnet. Verglichen wird mit der Stufe davor, der metrischen.', 'Here the calculation started from the configural level. The comparison is with the level before, the metric one.') },
        { wert: (d: DM) => d.cfi[2]!, tipp: P('Das ist der CFI der skalaren Stufe selbst. Gefragt ist der Abfall gegenüber der metrischen Stufe.', 'That is the CFI of the scalar level itself. The drop against the metric level is asked for.') }
      ],
      weg: (d: DM, z) => [P(`Abfall: ${z(d.cfi[1]!, 3)} − ${z(d.cfi[2]!, 3)} = ${z(mAbfall(d, 1, 2), 3)}`, `Drop: ${z(d.cfi[1]!, 3)} − ${z(d.cfi[2]!, 3)} = ${z(mAbfall(d, 1, 2), 3)}`)] },
    { id: 'stufen-erfuellt', stellen: 0, toleranz: 0.01, soll: (d: DM) => mErfuellt(d),
      frage: P('Bei wie vielen der beiden Schritte (metrisch, skalar) liegt der Abfall unter der Faustregel von 0,010?', 'In how many of the two steps (metric, scalar) does the drop lie below the rule of thumb of 0.010?'),
      warum: P('Die Entscheidung ist ein Vergleich mit der Faustregel, kein Test mit p-Wert. Erst wenn eine Stufe erfüllt ist, darf die nächste geprüft werden: Mittelwerte vergleichen darf man nur, wenn auch die skalare Stufe gilt.',
        'The decision is a comparison with the rule of thumb, not a test with a p value. Only when a level is met may the next one be examined: means may only be compared when the scalar level holds as well.'),
      tipp: P('Jeden Abfall mit 0,010 vergleichen und die Schritte zählen, bei denen er kleiner ist.', 'Compare each drop with 0.010 and count the steps where it is smaller.'),
      fehler: [
        { wert: () => 2, tipp: P('Beim Schritt zur skalaren Stufe ist der Abfall größer als 0,010. Dieser Schritt zählt nicht.', 'At the step to the scalar level the drop is larger than 0.010. This step does not count.') },
        { wert: () => 0, tipp: P('Beim Schritt zur metrischen Stufe ist der Abfall kleiner als 0,010. Dieser Schritt zählt.', 'At the step to the metric level the drop is smaller than 0.010. This step counts.') }
      ],
      weg: (d: DM, z) => [
        P(`Metrisch: ${z(mAbfall(d, 0, 1), 3)} ${mAbfall(d, 0, 1) < d.grenze ? '<' : '≥'} ${z(d.grenze, 3)}; skalar: ${z(mAbfall(d, 1, 2), 3)} ${mAbfall(d, 1, 2) < d.grenze ? '<' : '≥'} ${z(d.grenze, 3)}`, `Metric: ${z(mAbfall(d, 0, 1), 3)} ${mAbfall(d, 0, 1) < d.grenze ? '<' : '≥'} ${z(d.grenze, 3)}; scalar: ${z(mAbfall(d, 1, 2), 3)} ${mAbfall(d, 1, 2) < d.grenze ? '<' : '≥'} ${z(d.grenze, 3)}`),
        P(`Schritte unter der Grenze: ${z(mErfuellt(d), 0)}`, `Steps below the limit: ${z(mErfuellt(d), 0)}`)
      ] },
    { id: 'vielfaches', stellen: 1, toleranz: 0.05, soll: (d: DM) => mAbfall(d, 1, 2) / d.grenze,
      frage: P('Das Wievielfache der Faustregel (0,010) ist der Abfall von der metrischen zur skalaren Stufe? Rechnen: Abfall geteilt durch 0,010.', 'How many times the rule of thumb (0.010) is the drop from the metric to the scalar level? Calculate: drop divided by 0.010.'),
      warum: P('Das Vielfache zeigt, wie weit die Stufe von der Grenze entfernt ist. Fast an der Grenze ist ein Grenzfall, der nach Teil-Invarianz fragt; ein Vielfaches von mehr als 2 spricht klar dafür, einzelne Fragen genauer anzusehen.',
        'The multiple shows how far the level is from the limit. Close to the limit is a borderline case that asks for partial invariance; a multiple of more than 2 clearly speaks for looking more closely at single questions.'),
      tipp: P('Den Abfall der skalaren Stufe aus dem zweiten Schritt durch 0,010 teilen.', 'Divide the drop of the scalar level from the second step by 0.010.'),
      fehler: [
        { wert: (d: DM) => d.grenze / mAbfall(d, 1, 2), tipp: P('Hier wurde umgekehrt geteilt. Geteilt wird der Abfall durch die Grenze.', 'Here the division was the wrong way round. The drop is divided by the limit.') },
        { wert: (d: DM) => mAbfall(d, 1, 2) / 0.001, tipp: P('Hier wurde durch 0,001 statt durch 0,010 geteilt.', 'Here the division was by 0.001 instead of 0.010.') }
      ],
      weg: (d: DM, z) => [P(`Vielfaches: ${z(mAbfall(d, 1, 2), 3)} : ${z(d.grenze, 3)} = ${z(mAbfall(d, 1, 2) / d.grenze, 1)}`, `Multiple: ${z(mAbfall(d, 1, 2), 3)} : ${z(d.grenze, 3)} = ${z(mAbfall(d, 1, 2) / d.grenze, 1)}`)] }
  ],
  merke: P('ΔCFI = CFI der vorigen Stufe − CFI der strengeren Stufe. Nach der Faustregel gilt eine Stufe als nicht erfüllt, wenn der CFI um 0,010 oder mehr sinkt (in Statable zusammen mit dem RMSEA). Mittelwerte von Gruppen sind erst vergleichbar, wenn die skalare Stufe gilt, mindestens teilweise.',
    'ΔCFI = CFI of the previous level − CFI of the stricter level. By the rule of thumb a level counts as not met if the CFI falls by 0.010 or more (in Statable together with the RMSEA). Means of groups are comparable only when the scalar level holds, at least partly.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Fragebogen zur Prüfungsangst“ öffnen, im Schritt „Eine Sache oder zwei?“ die konfirmatorische Faktorenanalyse rechnen und darunter im Abschnitt „Messen die Fragen in allen Gruppen dasselbe? (Messinvarianz)“ die Spalte „geschlecht“ wählen und „Messinvarianz prüfen“ klicken. In der Tabelle „Anpassung der drei Stufen“ steht ΔCFI für jede Stufe.',
    'Next: open the example "Test anxiety questionnaire", run the confirmatory factor analysis in the step "One thing or two?" and below it in the section "Do the questions measure the same in all groups? (measurement invariance)" choose the column "geschlecht" and click "Test measurement invariance". In the table "Fit of the three levels" ΔCFI is shown for each level.')
});

// ---------------------------------------------------------------- 4. Pfadmodell: indirekter und totaler Effekt
/** Standardisierte Pfade: a (Führung → Vertrauen), b (Vertrauen → Kündigungsabsicht), c' (Führung → Kündigungsabsicht direkt). */
export const DATEN_PFAD = { a: 0.5, b: -0.4, direkt: -0.3 };
type DP = typeof DATEN_PFAD;
const pInd = (d: DP) => d.a * d.b;
const pGesamt = (d: DP) => d.direkt + d.a * d.b;
const pAnteil = (d: DP) => (pInd(d) / pGesamt(d)) * 100;
const PFAD = bau({
  id: 'pfad-indirekt',
  daten: DATEN_PFAD,
  lage: P('In einem Pfadmodell wirkt die Führungsqualität auf das Vertrauen im Team (Pfad a) und das Vertrauen auf die Kündigungsabsicht (Pfad b). Dazu gibt es einen direkten Pfad von der Führung zur Kündigungsabsicht (c\'). Alle Pfade sind standardisiert. Der indirekte Effekt ist das Produkt der Pfade entlang des Wegs, der Gesamteffekt ist der direkte Pfad plus der indirekte Effekt.',
    'In a path model leadership quality acts on trust in the team (path a) and trust acts on the intention to quit (path b). In addition there is a direct path from leadership to the intention to quit (c\'). All paths are standardised. The indirect effect is the product of the paths along the route, the total effect is the direct path plus the indirect effect.'),
  tabelle: { titel: P('Standardisierte Pfade', 'Standardised paths'), kopf: [P('Pfad', 'Path'), P('von', 'from'), P('nach', 'to'), P('Koeffizient', 'Coefficient')],
    zeilen: [[P('a', 'a'), P('Führung', 'Leadership'), P('Vertrauen', 'Trust'), DATEN_PFAD.a], [P('b', 'b'), P('Vertrauen', 'Trust'), P('Kündigungsabsicht', 'Intention to quit'), DATEN_PFAD.b], [P('c\' (direkt)', 'c\' (direct)'), P('Führung', 'Leadership'), P('Kündigungsabsicht', 'Intention to quit'), DATEN_PFAD.direkt]] },
  schritte: [
    { id: 'indirekt', stellen: 2, toleranz: 0.005, soll: pInd,
      frage: P('Wie groß ist der indirekte Effekt von der Führung über das Vertrauen auf die Kündigungsabsicht? Rechnen: a mal b.', 'How large is the indirect effect of leadership via trust on the intention to quit? Calculate: a times b.'),
      warum: P('Entlang des Wegs wird die Wirkung weitergereicht: Eine Einheit mehr Führung ändert das Vertrauen um a, und eine Einheit mehr Vertrauen ändert die Kündigungsabsicht um b. Die Wirkung des Umwegs ist darum das Produkt a · b. Positiv mal negativ ergibt einen negativen Effekt.',
        'Along the route the effect is passed on: one unit more leadership changes trust by a, and one unit more trust changes the intention to quit by b. The effect of the detour is therefore the product a · b. Positive times negative gives a negative effect.'),
      tipp: P('0,5 mal (−0,4): Positiv mal negativ ergibt negativ.', '0.5 times (−0.4): positive times negative gives negative.'),
      fehler: [
        { wert: (d: DP) => d.a + d.b, tipp: P('Das ist die Summe der beiden Pfade. Entlang eines Wegs werden die Koeffizienten multipliziert.', 'That is the sum of the two paths. Along a route the coefficients are multiplied.') },
        { wert: (d: DP) => -(d.a * d.b), tipp: P('Der Betrag stimmt, das Vorzeichen nicht. Positiv mal negativ ergibt negativ.', 'The size is right, the sign is not. Positive times negative gives negative.') }
      ],
      weg: (d: DP, z) => [P(`Indirekter Effekt: a · b = ${z(d.a, 1)} · (${z(d.b, 1)}) = ${z(pInd(d), 2)}`, `Indirect effect: a · b = ${z(d.a, 1)} · (${z(d.b, 1)}) = ${z(pInd(d), 2)}`)] },
    { id: 'gesamt', stellen: 2, toleranz: 0.005, soll: pGesamt,
      frage: P('Wie groß ist der Gesamteffekt der Führung auf die Kündigungsabsicht? Rechnen: direkter Pfad plus indirekter Effekt.', 'How large is the total effect of leadership on the intention to quit? Calculate: direct path plus indirect effect.'),
      warum: P('Die Führung wirkt auf zwei Wegen: direkt und über das Vertrauen. Der Gesamteffekt fasst beide zusammen, hier mit gleichem Vorzeichen, sodass er größer ist als jeder Teil allein. Gegenläufige Wege könnten sich dagegen gegenseitig aufheben.',
        'Leadership acts in two ways: directly and via trust. The total effect combines both, here with the same sign so that it is larger than either part alone. Opposing routes, in contrast, could cancel each other.'),
      tipp: P('Den direkten Pfad (−0,3) mit dem indirekten Effekt aus dem ersten Schritt addieren.', 'Add the direct path (−0.3) and the indirect effect from the first step.'),
      fehler: [
        { wert: (d: DP) => d.direkt, tipp: P('Das ist nur der direkte Pfad. Der Umweg über das Vertrauen kommt hinzu.', 'That is only the direct path. The detour via trust is still to be added.') },
        { wert: (d: DP) => d.direkt - d.a * d.b, tipp: P('Hier wurde der indirekte Effekt abgezogen. Er wird addiert, mit seinem Vorzeichen.', 'Here the indirect effect was subtracted. It is added, with its sign.') }
      ],
      weg: (d: DP, z) => [P(`Gesamteffekt: c' + a · b = ${z(d.direkt, 1)} + (${z(pInd(d), 2)}) = ${z(pGesamt(d), 2)}`, `Total effect: c' + a · b = ${z(d.direkt, 1)} + (${z(pInd(d), 2)}) = ${z(pGesamt(d), 2)}`)] },
    { id: 'anteil', stellen: 0, toleranz: 0.5, einheit: P('%', '%'), soll: pAnteil,
      frage: P('Wie viel Prozent des Gesamteffekts läuft über das Vertrauen? Rechnen: indirekter Effekt geteilt durch Gesamteffekt, mal 100.', 'How many percent of the total effect runs via trust? Calculate: indirect effect divided by total effect, times 100.'),
      warum: P('Der Anteil zeigt, wie wichtig der Umweg ist. Er sagt nur, was zum Modell passt, wenn die Pfeile stimmen: Mit Querschnittsdaten beweist er keine Ursache. In Aufsätzen wird zum indirekten Effekt meist ein Bootstrap-Intervall berichtet.',
        'The share shows how important the detour is. It only says what fits the model if the arrows are right: with cross-sectional data it proves no cause. In papers a bootstrap interval is usually reported for the indirect effect.'),
      tipp: P('Beide Zahlen sind negativ, der Bruch ist also positiv. Das Ergebnis mit 100 malnehmen.', 'Both numbers are negative, so the fraction is positive. Multiply the result by 100.'),
      fehler: [
        { wert: (d: DP) => (pInd(d) / d.direkt) * 100, tipp: P('Hier wurde durch den direkten Pfad statt durch den Gesamteffekt geteilt.', 'Here the division was by the direct path instead of by the total effect.') },
        { wert: (d: DP) => pInd(d) / pGesamt(d), tipp: P('Das ist der Anteil als Bruch. Mal 100 ergibt Prozent.', 'That is the share as a fraction. Times 100 gives percent.') }
      ],
      weg: (d: DP, z) => [P(`Anteil: ${z(pInd(d), 2)} : (${z(pGesamt(d), 2)}) · 100 = ${z(pAnteil(d), 0)} %`, `Share: ${z(pInd(d), 2)} : (${z(pGesamt(d), 2)}) · 100 = ${z(pAnteil(d), 0)}%`)] }
  ],
  merke: P('Indirekter Effekt = Produkt der Pfade entlang des Wegs (a · b); Gesamteffekt = direkter Pfad + indirekter Effekt. Für den indirekten Effekt wird meist ein Bootstrap-Intervall berichtet, weil ein Produkt zweier Schätzungen selten normalverteilt ist. Pfade zeigen, was zu den Daten passt, nicht, was Ursache ist.',
    'Indirect effect = product of the paths along the route (a · b); total effect = direct path + indirect effect. For the indirect effect usually a bootstrap interval is reported, because a product of two estimates is rarely normally distributed. Paths show what fits the data, not what is a cause.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Führung und Kündigungsabsicht“ öffnen, im Schritt „Über das Vertrauen?“ unter dem Ergebnis den Abschnitt „Pfadmodell: Wer wirkt auf wen? (mehrere Gleichungen zusammen)“ aufklappen, die Pfeile von Führung zu Vertrauen und Kündigungsabsicht und von Vertrauen zu Kündigungsabsicht ankreuzen und den indirekten Effekt in der Tabelle „Indirekte Wege und Gesamteffekte“ mit der eigenen Rechnung vergleichen.',
    'Next: open the example "Leadership and intention to quit", in the step "Through trust?" open the section "Path model: who affects whom? (several equations together)" below the result, tick the arrows from leadership to trust and intention to quit and from trust to intention to quit and compare the indirect effect in the table "Indirect routes and total effects" with your own calculation.')
});

// ---------------------------------------------------------------- 5. Testhalbierung: Spearman-Brown von Hand (Stufe 6.6)
/** Eine Skala wurde in zwei gleich lange Hälften geteilt; die Summen der Hälften korrelieren mit r. */
export const DATEN_SB = { r: 0.6 };
type DS = typeof DATEN_SB;
const sbZaehler = (d: DS) => 2 * d.r;
const sbNenner = (d: DS) => 1 + d.r;
const sbRho = (d: DS) => (2 * d.r) / (1 + d.r);
const SPEARMAN_BROWN = bau({
  id: 'spearman-brown',
  daten: DATEN_SB,
  lage: P('Eine Skala mit acht Fragen wurde in zwei gleich lange Hälften zu je vier Fragen geteilt (Testhalbierung). Die Summen der beiden Hälften korrelieren mit r = 0,60. Das ist die Zuverlässigkeit einer halb so langen Skala. Die Spearman-Brown-Formel rechnet auf die volle Länge hoch: Zuverlässigkeit der ganzen Skala = 2 mal r geteilt durch (1 plus r).',
    'A scale with eight questions was split into two equally long halves of four questions each (split-half). The sums of the two halves correlate at r = 0.60. That is the reliability of a scale half as long. The Spearman-Brown formula projects to full length: reliability of the whole scale = 2 times r divided by (1 plus r).'),
  tabelle: { titel: P('Testhalbierung', 'Split-half'), kopf: [P('Hälfte', 'Half'), P('Fragen', 'Questions'), P('Cronbachs Alpha der Hälfte', 'Cronbach\'s alpha of the half')],
    zeilen: [[P('Erste Hälfte', 'First half'), 4, 0.7], [P('Zweite Hälfte', 'Second half'), 4, 0.72]] },
  schritte: [
    { id: 'zaehler', stellen: 1, toleranz: 0.05, soll: sbZaehler,
      frage: P('Wie groß ist der Zähler der Formel? Rechnen: 2 mal r.', 'How large is the numerator of the formula? Calculate: 2 times r.'),
      warum: P('Die Verdopplung steht für die doppelte Länge: Die ganze Skala hat doppelt so viele Fragen wie eine Hälfte. Mehr Fragen mitteln mehr Zufallsfehler weg.',
        'The doubling stands for the double length: the whole scale has twice as many questions as one half. More questions average out more random error.'),
      tipp: P('r aus der Tabelle verdoppeln.', 'Double r from the table.'),
      fehler: [{ wert: (d: DS) => d.r, tipp: P('Das ist r selbst. Im Zähler steht 2 mal r.', 'That is r itself. The numerator is 2 times r.') }],
      weg: (d: DS, z) => [P(`Zähler: 2 · ${z(d.r, 1)} = ${z(sbZaehler(d), 1)}`, `Numerator: 2 · ${z(d.r, 1)} = ${z(sbZaehler(d), 1)}`)] },
    { id: 'nenner', stellen: 1, toleranz: 0.05, soll: sbNenner,
      frage: P('Wie groß ist der Nenner der Formel? Rechnen: 1 plus r.', 'How large is the denominator of the formula? Calculate: 1 plus r.'),
      warum: P('Der Nenner sorgt dafür, dass das Ergebnis nie über 1 steigt: Bei r = 1 ergibt sich 2 : 2 = 1, bei r = 0 ergibt sich 0.',
        'The denominator makes sure the result never rises above 1: with r = 1 it gives 2 : 2 = 1, with r = 0 it gives 0.'),
      tipp: P('Zu r die Zahl 1 addieren.', 'Add 1 to r.'),
      fehler: [{ wert: (d: DS) => 1 + 2 * d.r, tipp: P('Hier wurde 1 plus 2r gerechnet. Im Nenner steht 1 plus r.', 'Here 1 plus 2r was calculated. The denominator is 1 plus r.') }],
      weg: (d: DS, z) => [P(`Nenner: 1 + ${z(d.r, 1)} = ${z(sbNenner(d), 1)}`, `Denominator: 1 + ${z(d.r, 1)} = ${z(sbNenner(d), 1)}`)] },
    { id: 'rho', stellen: 2, toleranz: 0.005, soll: sbRho,
      frage: P('Wie zuverlässig ist die ganze Skala? Rechnen: Zähler geteilt durch Nenner.', 'How reliable is the whole scale? Calculate: numerator divided by denominator.'),
      warum: P('Die Skala ist zuverlässiger als jede Hälfte allein, weil sie doppelt so lang ist. Berichtet wird die hochgerechnete Zahl, nicht r: Die Korrelation der Hälften beschreibt nur die halb langen Skalen.',
        'The scale is more reliable than either half alone because it is twice as long. The stepped-up number is reported, not r: the correlation of the halves describes only the half-length scales.'),
      tipp: P('Den Zähler aus dem ersten Schritt durch den Nenner aus dem zweiten teilen.', 'Divide the numerator from the first step by the denominator from the second.'),
      fehler: [
        { wert: (d: DS) => d.r, tipp: P('Das ist die Korrelation der Hälften. Sie muss noch auf die volle Länge hochgerechnet werden.', 'That is the correlation of the halves. It still has to be stepped up to full length.') },
        { wert: (d: DS) => d.r / (1 + d.r), tipp: P('Hier fehlt die 2 im Zähler (die doppelte Länge).', 'The 2 in the numerator (the double length) is missing here.') }
      ],
      weg: (d: DS, z) => [P(`ρ = ${z(sbZaehler(d), 1)} : ${z(sbNenner(d), 1)} = ${z(sbRho(d), 2)}`, `ρ = ${z(sbZaehler(d), 1)} : ${z(sbNenner(d), 1)} = ${z(sbRho(d), 2)}`)] }
  ],
  merke: P('Spearman-Brown für gleich lange Hälften: ρ = 2r : (1 + r). Die Hochrechnung gilt nur, wenn beide Hälften gleich gut messen. Die Teilung hängt von der Reihenfolge der Fragen ab; Cronbachs Alpha ist der Mittelwert über alle Teilungen.',
    'Spearman-Brown for halves of equal length: ρ = 2r : (1 + r). The step-up holds only if both halves measure equally well. The split depends on the order of the questions; Cronbach\'s alpha is the mean over all splits.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Drang zur Schlankheit - eine Skala aus sieben Fragen“ öffnen, zum Schritt „Wie zuverlässig ist die Skala, wenn man sie halbiert? (Testhalbierung, Spearman-Brown)“ gehen, unter dem Ergebnis den gleichnamigen Abschnitt aufklappen und „Halbierung rechnen“ klicken. Die Korrelation der Hälften steht in der Tabelle; mit der Formel von oben lässt sich die Spearman-Brown-Zahl nachrechnen (bei sieben Fragen sind die Hälften vier und drei Fragen lang, dann gibt es zusätzlich einen Wert für ungleiche Länge).',
    'Next: open the example "Drive for thinness - a scale of seven questions", go to the step "How reliable is the scale when it is cut in half? (split-half reliability, Spearman-Brown)", open the section of the same name below the result and click "Calculate split-half". The correlation of the halves is in the table; with the formula above the Spearman-Brown number can be checked (with seven questions the halves are four and three questions long, so there is an additional value for unequal length).')
});

export const AUFGABEN_NUTZEN: Rechenaufgabe[] = [IRT, OMEGA, INVARIANZ, PFAD, SPEARMAN_BROWN];
