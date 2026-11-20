/**
 * Üben: Delphi-Befragung (B3 Teil 2c, 15.11.2026): Einheit `delphi-befragung` (lernen/lernplan-delphi.ts), 6 Fragen `eh-dl-…`, Thema `erheben`.
 * Grundlage ist der Hilfe-Artikel `delphi` (hilfe/artikel-delphi.ts). Die Zahlen stammen aus scripts/ueben-erwartet-delphi.R (Basis-R, R 4.6.1;
 * Wächter lernen/fragen-delphi.test.ts): 6 Fachleute, 5 Aussagen, Skala 1 bis 5, alles erfunden; Regel: Quartilsabstand höchstens 1 und mindestens 75 % der Bewertungen bei 4 bis 5.
 * Quellen: Hsu & Sandford (2007), Practical Assessment, Research & Evaluation 12(10); Diamond et al. (2014), Journal of Clinical Epidemiology 67; Kendall & Babington Smith (1939).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

type Paar = ReturnType<typeof P>;
type A = [Paar, Paar];
const a = (t: Paar, w: Paar, richtig?: true): Antwort => ({ text: t, warum: w, ...(richtig ? { richtig } : {}) });

function fr(id: string, belege: string[], stamm: Paar, platz: number, richtig: A, falsch: [A, A, A]): Frage {
  const antworten: Antwort[] = falsch.map(f => a(f[0], f[1]));
  antworten.splice(platz, 0, a(richtig[0], richtig[1], true));
  return { id, thema: 'erheben', stamm, antworten, hilfe: ['delphi'], belege: [...belege, 'Hilfe:delphi'] };
}
const HS = 'Hsu & Sandford 2007, Practical Assessment, Research & Evaluation 12(10)';
const DI = 'Diamond et al. 2014, Journal of Clinical Epidemiology 67, 401-409';
const KE = 'Kendall & Babington Smith 1939, Annals of Mathematical Statistics 10, 275-287';

export const FRAGEN_DELPHI: Frage[] = [
  fr('eh-dl-regel', [HS, DI],
    P('Ein Team will bei seiner Delphi-Befragung „Konsens“ nennen, wenn die Bewertungen eng beieinanderliegen. Wann legt es diese Regel fest? (Delphi-Befragung, Konsensregel)', 'A team wants to name "consensus" in its Delphi survey when the ratings lie close together. When does it set this rule? (Delphi survey, consensus rule)'), 1,
    [P('Vor der ersten Runde, damit sie nicht den Ergebnissen angepasst wird (Delphi-Befragung, Konsensregel)', 'Before the first round, so that it is not fitted to the results (Delphi survey, consensus rule)'),
     P('Wer die Regel erst nach den Zahlen wählt, kann sie so setzen, dass gewünschte Aussagen „Konsens“ erreichen.', 'Whoever chooses the rule after seeing the numbers can set it so that wanted statements reach "consensus".')],
    [[P('Nach der letzten Runde, wenn man sieht, welche Grenze zu den Daten passt (Delphi-Befragung, Konsensregel)', 'After the last round, when one sees which limit fits the data (Delphi survey, consensus rule)'),
      P('Das wäre eine Auswahl nach dem Ergebnis; der Konsens sagte dann nur, was man ohnehin sehen wollte.', 'That would be a selection after the result; the consensus would then only say what one wanted to see anyway.')],
     [P('Gar nicht, Statable erkennt den Konsens selbst (Delphi-Befragung, Konsensregel)', 'Not at all, Statable recognises the consensus itself (Delphi survey, consensus rule)'),
      P('Statable gibt keine Regel vor; ohne gesetzte Regel nennt es nie einen Konsens.', 'Statable sets no rule; without a set rule it never names a consensus.')],
     [P('Nach jeder Runde neu, damit möglichst viele Aussagen Konsens erreichen (Delphi-Befragung, Konsensregel)', 'Anew after each round, so that as many statements as possible reach consensus (Delphi survey, consensus rule)'),
      P('Eine wechselnde Regel macht die Runden unvergleichbar und lässt sich dem Wunsch anpassen.', 'A changing rule makes the rounds incomparable and can be bent to a wish.')]]),
  fr('eh-dl-iqr', [HS, DI],
    P('Aussage 1 hat Median 4,5, Quartilsabstand 1 und 83 % der Bewertungen bei 4 oder 5. Die Regel: Quartilsabstand höchstens 1 und mindestens 75 % bei 4 bis 5. Ergebnis? (Delphi-Befragung, Quartilsabstand)', 'Statement 1 has median 4.5, interquartile range 1 and 83% of the ratings at 4 or 5. The rule: interquartile range at most 1 and at least 75% at 4 to 5. Result? (Delphi survey, interquartile range)'), 0,
    [P('Beide Teile der Regel sind erfüllt, also Konsens nach dieser Regel (Delphi-Befragung, Quartilsabstand)', 'Both parts of the rule are met, so consensus by this rule (Delphi survey, interquartile range)'),
     P('Ein Quartilsabstand von genau 1 liegt noch innerhalb von „höchstens 1“, und 83 % sind mehr als 75 %.', 'An interquartile range of exactly 1 is still within "at most 1", and 83% is more than 75%.')],
    [[P('Kein Konsens, weil der Quartilsabstand nicht 0 ist (Delphi-Befragung, Quartilsabstand)', 'No consensus, because the interquartile range is not 0 (Delphi survey, interquartile range)'),
      P('Verlangt war nicht 0, sondern höchstens 1.', 'What was required was not 0 but at most 1.')],
     [P('Kein Konsens, weil der Median 4,5 und kein ganzer Wert ist (Delphi-Befragung, Quartilsabstand)', 'No consensus, because the median is 4.5 and not a whole number (Delphi survey, interquartile range)'),
      P('Der Median einer geraden Zahl von Bewertungen liegt oft zwischen zwei Stufen; die Regel fragt nicht danach.', 'The median of an even number of ratings often lies between two levels; the rule does not ask for it.')],
     [P('Das lässt sich nur mit einem Signifikanztest entscheiden (Delphi-Befragung, Quartilsabstand)', 'That can be decided only with a significance test (Delphi survey, interquartile range)'),
      P('Die Regel ist eine feste Grenze und kein Test; man liest die Zahlen gegen sie ab.', 'The rule is a fixed limit and no test; one reads the numbers against it.')]]),
  fr('eh-dl-einig', [HS, DI],
    P('Aussage 3 hat Median 2, Quartilsabstand 0,75 und 0 % der Bewertungen bei 4 bis 5. Die Regel verlangt 4 bis 5. Was stimmt? (Delphi-Befragung, Konsens)', 'Statement 3 has median 2, interquartile range 0.75 and 0% of the ratings at 4 to 5. The rule asks for 4 to 5. What is right? (Delphi survey, consensus)'), 2,
    [P('Kein Konsens nach dieser Regel, aber Einigkeit in der Ablehnung; dafür wäre der Bereich 1 bis 2 nötig (Delphi-Befragung, Konsens)', 'No consensus by this rule, but agreement in rejecting; for that the range 1 to 2 would be needed (Delphi survey, consensus)'),
     P('Ein kleiner Quartilsabstand zeigt Einigkeit, der Bereich legt fest, worin man sich einig sein soll (Zustimmung oder Ablehnung).', 'A small interquartile range shows agreement, the range sets what one is to agree on (approval or rejection).')],
    [[P('Konsens, weil der Quartilsabstand mit 0,75 unter 1 liegt und die Urteile eng beieinanderliegen (Delphi-Befragung, Konsens)', 'Consensus, because the interquartile range of 0.75 is below 1 and the ratings lie close together (Delphi survey, consensus)'),
      P('Die Regel hat zwei Teile; der Bereich 4 bis 5 ist mit 0 % nicht erfüllt.', 'The rule has two parts; the range 4 to 5 is not met with 0%.')],
     [P('Die Fachleute sind uneinig, weil der Median unter 3 liegt und damit niedrig bewertet wird (Delphi-Befragung, Konsens)', 'The experts disagree because the median is below 3 and so rated low (Delphi survey, consensus)'),
      P('Ein niedriger Median heißt niedrige Bewertung, nicht Uneinigkeit; Uneinigkeit zeigt sich in einem großen Quartilsabstand.', 'A low median means a low rating, not disagreement; disagreement shows in a large interquartile range.')],
     [P('Die Aussage ist falsch, weil die Fachleute sie mehrheitlich ablehnen (Delphi-Befragung, Konsens)', 'The statement is wrong because most of the experts reject it (Delphi survey, consensus)'),
      P('Konsens heißt Einigkeit der Befragten, nicht dass eine Aussage stimmt oder nicht stimmt.', 'Consensus means agreement of the respondents, not that a statement is true or false.')]]),
  fr('eh-dl-w', [KE],
    P('Kendalls W ist 0,86 (p = 0,002) bei 5 Aussagen. Was sagt das? (Kendalls W, Delphi-Befragung)', 'Kendall\'s W is 0.86 (p = 0.002) for 5 statements. What does that say? (Kendall\'s W, Delphi survey)'), 3,
    [P('Sehr ähnliche Rangfolgen der Fachleute; die Höhe der Zustimmung zeigt W nicht (Kendalls W, Delphi-Befragung)', 'Very similar orders; W does not show the level of approval (Kendall\'s W, Delphi survey)'),
     P('W vergleicht Rangfolgen. Alle könnten die Aussagen gleich ordnen und trotzdem alle niedrig bewerten.', 'W compares orders. All could arrange the statements the same way and still all rate them low.')],
    [[P('86 % der Fachleute stimmen allen Aussagen zu (Kendalls W, Delphi-Befragung)', '86% of the experts agree with all statements (Kendall\'s W, Delphi survey)'),
      P('W ist kein Prozentsatz von Personen und misst keine Zustimmung.', 'W is not a percentage of people and measures no approval.')],
     [P('Alle Aussagen erreichen Konsens (Kendalls W, Delphi-Befragung)', 'All statements reach consensus (Kendall\'s W, Delphi survey)'),
      P('Konsens je Aussage folgt aus Quartilsabstand und Bereich, nicht aus W.', 'Consensus per statement follows from the interquartile range and range, not from W.')],
     [P('Die Fachleute haben sich in der zweiten Runde angenähert (Kendalls W, Delphi-Befragung)', 'The experts moved closer in the second round (Kendall\'s W, Delphi survey)'),
      P('W gilt für eine Runde; für eine Annäherung brauchte man zwei Runden nebeneinander.', 'W applies to one round; for a convergence one would need two rounds side by side.')]]),
  fr('eh-dl-fehlend', [KE],
    P('6 Fachleute bewerten 5 Aussagen; eine Person hat Aussage 5 ausgelassen. Wie viele Personen gehen in Kendalls W ein? (Kendalls W, fehlende Werte)', '6 experts rate 5 statements; one person skipped statement 5. How many people enter Kendall\'s W? (Kendall\'s W, missing values)'), 0,
    [P('5, denn es zählen nur Personen mit allen Bewertungen (Kendalls W, fehlende Werte)', '5, because only people with all ratings count (Kendall\'s W, missing values)'),
     P('W vergleicht ganze Rangfolgen; wer eine Aussage nicht bewertet hat, hat keine vollständige.', 'W compares whole orders; whoever did not rate one statement has no complete one.')],
    [[P('6, die fehlende Zahl wird mit dem Mittelwert ersetzt (Kendalls W, fehlende Werte)', '6, the missing number is replaced by the mean (Kendall\'s W, missing values)'),
      P('Statable setzt nichts ein; Ersetzen würde die Rangfolge erfinden.', 'Statable imputes nothing; replacing would invent the order.')],
     [P('6, Aussage 5 fällt weg und die anderen vier gelten für alle (Kendalls W, fehlende Werte)', '6, statement 5 is dropped and the other four apply to all (Kendall\'s W, missing values)'),
      P('Es fällt die Person weg, nicht die Aussage; die Kennzahlen je Aussage nutzen weiter alle vorhandenen Bewertungen.', 'The person drops out, not the statement; the per-statement numbers still use all ratings present.')],
     [P('0, W lässt sich bei fehlenden Werten nicht berechnen (Kendalls W, fehlende Werte)', '0, W cannot be computed with missing values (Kendall\'s W, missing values)'),
      P('Es lässt sich berechnen, nur mit den vollständigen Personen.', 'It can be computed, only with the complete people.')]]),
  fr('eh-dl-runden', [HS, DI],
    P('In Runde 2 sinkt der Quartilsabstand von Aussage 1 von 1 auf 0,75 und der Anteil bei 4 bis 5 steigt von 83 % auf 100 %. Was darf das Team schreiben? (Delphi-Befragung, Runden)', 'In round 2 the interquartile range of statement 1 falls from 1 to 0.75 and the share at 4 to 5 rises from 83% to 100%. What may the team write? (Delphi survey, rounds)'), 1,
    [P('Die Bewertungen liegen enger beieinander; eine Wirkung der Rückmeldung ist nicht belegt (Delphi-Befragung, Runden)', 'The ratings lie closer together; an effect of the feedback is not shown (Delphi survey, rounds)'),
     P('Man beschreibt Runde für Runde. Die Fachleute sind selten dieselben, und ohne Vergleichsgruppe bleibt die Ursache offen.', 'One describes round by round. The experts are rarely the same, and without a comparison group the cause stays open.')],
    [[P('Die Rückmeldung nach Runde 1 hat die Fachleute offenbar überzeugt (Delphi-Befragung, Runden)', 'The feedback after round 1 evidently convinced the experts (Delphi survey, rounds)'),
      P('Die Zahlen zeigen die Annäherung, nicht den Grund dafür.', 'The numbers show the convergence, not the reason for it.')],
     [P('Der Unterschied zwischen den beiden Runden ist statistisch signifikant (Delphi-Befragung, Runden)', 'The difference between the two rounds is statistically significant (Delphi survey, rounds)'),
      P('Statable testet nicht zwischen Runden; die Personen sind nicht gepaart.', 'Statable does not test between rounds; the people are not paired.')],
     [P('Die Aussage stimmt jetzt, weil alle zustimmen (Delphi-Befragung, Runden)', 'The statement is true now because all agree (Delphi survey, rounds)'),
      P('Einigkeit heißt nicht, dass etwas stimmt.', 'Agreement does not mean that something is true.')]]),
];
