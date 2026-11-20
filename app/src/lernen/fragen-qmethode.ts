/**
 * Üben: Q-Methode (B3 Teil 3c, 15.11.2026): Einheit `q-methode-sichtweisen` (lernen/lernplan-qmethode.ts), 6 Fragen `eh-qm-…`, Thema `erheben`.
 * Grundlage ist der Hilfe-Artikel `q-methode` (hilfe/artikel-q-methode.ts). Die Zahlen stammen aus scripts/ueben-erwartet-qmethode.R (Basis-R, R 4.6.1;
 * Wächter lernen/fragen-qmethode.test.ts): 8 Personen sortieren 13 Aussagen in ein Raster von -3 bis +3, alles erfunden; zwei Faktoren nach Varimax.
 * Quellen: Stephenson (1953); Brown (1980); Zabala (2014), The R Journal 6(2).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

type Paar = ReturnType<typeof P>;
type A = [Paar, Paar];
const a = (t: Paar, w: Paar, richtig?: true): Antwort => ({ text: t, warum: w, ...(richtig ? { richtig } : {}) });

function fr(id: string, belege: string[], stamm: Paar, platz: number, richtig: A, falsch: [A, A, A]): Frage {
  const antworten: Antwort[] = falsch.map(f => a(f[0], f[1]));
  antworten.splice(platz, 0, a(richtig[0], richtig[1], true));
  return { id, thema: 'erheben', stamm, antworten, hilfe: ['q-methode'], belege: [...belege, 'Hilfe:q-methode'] };
}
const ST = 'Stephenson 1953, The Study of Behavior, University of Chicago Press';
const BR = 'Brown 1980, Political Subjectivity, Yale University Press';
const ZA = 'Zabala 2014, The R Journal 6(2), 163-173';

export const FRAGEN_QMETHODE: Frage[] = [
  fr('eh-qm-personen', [ST, ZA],
    P('8 Personen haben je 13 Aussagen in ein Raster sortiert. Was wird bei der Q-Methode miteinander korreliert? (Q-Methode, Faktorenanalyse über Personen)', '8 people each sorted 13 statements into a grid. What is correlated with each other in Q methodology? (Q methodology, factor analysis across people)'), 2,
    [P('Die Personen: Je zwei Q-Sorts werden verglichen, zum Beispiel Person 1 mit Person 2 (r = 0,54) (Q-Methode, Faktorenanalyse über Personen)', 'The people: every two Q sorts are compared, for example person 1 with person 2 (r = 0.54) (Q methodology, factor analysis across people)'),
     P('Die Faktoren fassen Personen zusammen, die ähnlich sortieren. Darum steht die Person in der Spalte, nicht die Aussage.', 'The factors group people who sort alike. That is why the person is in the column, not the statement.')],
    [[P('Die Aussagen: Je zwei Aussagen werden verglichen wie bei einer Fragebogen-Skala (Q-Methode, Faktorenanalyse über Personen)', 'The statements: every two statements are compared as in a questionnaire scale (Q methodology, factor analysis across people)'),
      P('Das wäre die übliche Faktorenanalyse über Fragen; die Q-Methode dreht sie um.', 'That would be the usual factor analysis across questions; Q methodology turns it around.')],
     [P('Die Raster-Plätze mit den Altersangaben der Personen (Q-Methode, Faktorenanalyse über Personen)', 'The grid places with the ages of the people (Q methodology, factor analysis across people)'),
      P('Es geht nur um die Sortierung; Alter oder andere Merkmale gehen nicht ein.', 'Only the sorting counts; age or other characteristics do not enter.')],
     [P('Die Raster-Plätze mit den Aussagen-Längen (Q-Methode, Faktorenanalyse über Personen)', 'The grid places with the lengths of the statements (Q methodology, factor analysis across people)'),
      P('Die Länge einer Aussage spielt keine Rolle für die Rechnung.', 'The length of a statement plays no part in the calculation.')]]),
  fr('eh-qm-schwelle', [ZA],
    P('Bei 13 Aussagen liegt die Schwelle für eine bedeutsame Ladung bei 1,96 geteilt durch die Wurzel aus 13, also bei 0,54. Person 6 lädt 0,36 auf Faktor 1 und 0,80 auf Faktor 2. Wozu wird sie markiert? (Q-Methode, Ladung)', 'With 13 statements the threshold for a significant loading is 1.96 divided by the square root of 13, that is 0.54. Person 6 loads 0.36 on factor 1 and 0.80 on factor 2. To which is the person flagged? (Q methodology, loading)'), 1,
    [P('Zu Faktor 2: nur dort liegt die Ladung über der Schwelle (Q-Methode, Ladung)', 'To factor 2: only there does the loading lie above the threshold (Q methodology, loading)'),
     P('0,80 ist größer als 0,54 und erklärt mehr Varianz als die 0,36 auf Faktor 1.', '0.80 is larger than 0.54 and explains more variance than the 0.36 on factor 1.')],
    [[P('Zu beiden Faktoren, weil sie auf beiden lädt (Q-Methode, Ladung)', 'To both factors, because the person loads on both (Q methodology, loading)'),
      P('Eine Ladung unter der Schwelle, hier 0,36, zählt nicht für die Zugehörigkeit.', 'A loading below the threshold, here 0.36, does not count for belonging.')],
     [P('Zu keinem Faktor, denn jede Ladung müsste 1 sein (Q-Methode, Ladung)', 'To no factor, because every loading would have to be 1 (Q methodology, loading)'),
      P('Eine Ladung von 1 wäre ein Sonderfall; maßgeblich ist die Schwelle.', 'A loading of 1 would be a special case; the threshold is what counts.')],
     [P('Zu Faktor 1, weil er der erste ist (Q-Methode, Ladung)', 'To factor 1, because it is the first (Q methodology, loading)'),
      P('Die Reihenfolge der Faktoren entscheidet nichts; es zählt die Höhe der Ladung.', 'The order of the factors decides nothing; the size of the loading counts.')]]),
  fr('eh-qm-zahl', [BR, ZA],
    P('Die Eigenwerte der Personen-Korrelation sind 3,67, 2,83 und 0,75. Wer legt die Zahl der Faktoren fest? (Q-Methode, Eigenwert)', 'The eigenvalues of the correlation of people are 3.67, 2.83 and 0.75. Who sets the number of factors? (Q methodology, eigenvalue)'), 0,
    [P('Sie selbst; Eigenwerte und Inhalt helfen, Statable gibt nichts vor (Q-Methode, Eigenwert)', 'You; eigenvalues and content help, Statable sets nothing (Q methodology, eigenvalue)'),
     P('Zwei große Eigenwerte vor einem Abfall auf 0,75 sprechen für zwei Faktoren, entschieden wird aber von Hand.', 'Two large eigenvalues before a drop to 0.75 point to two factors, but the decision is made by hand.')],
    [[P('Statable, anhand der Regel „Eigenwert über 1“ (Q-Methode, Eigenwert)', 'Statable, by the rule "eigenvalue above 1" (Q methodology, eigenvalue)'),
      P('Statable setzt keine Regel; sie wäre auch nur eine grobe Faustregel.', 'Statable sets no rule; it would be only a rough rule of thumb anyway.')],
     [P('Die Zahl der Aussagen, hier also 13 Faktoren (Q-Methode, Eigenwert)', 'The number of statements, so 13 factors here (Q methodology, eigenvalue)'),
      P('Es gibt höchstens so viele Faktoren wie Personen, und sinnvoll sind nur wenige.', 'There are at most as many factors as people, and only a few make sense.')],
     [P('Die Person mit der höchsten Ladung (Q-Methode, Eigenwert)', 'The person with the highest loading (Q methodology, eigenvalue)'),
      P('Die Ladung folgt erst aus der gewählten Faktorenzahl.', 'The loading follows only from the chosen number of factors.')]]),
  fr('eh-qm-gegensatz', [ST, ZA],
    P('Aussage 1 hat den z-Wert 1,56 auf Faktor 1 und -1,17 auf Faktor 2. Was bedeutet das? (Q-Methode, z-Wert)', 'Statement 1 has the z score 1.56 on factor 1 and -1.17 on factor 2. What does that mean? (Q methodology, z score)'), 3,
    [P('Die Sichtweisen sind entgegengesetzt: Faktor 1 stimmt zu, Faktor 2 lehnt ab (Q-Methode, z-Wert)', 'The viewpoints are opposite: factor 1 agrees, factor 2 rejects (Q methodology, z score)'),
     P('Ein positiver z-Wert heißt, die Aussage steht für die Personen des Faktors hoch; ein negativer, sie steht niedrig.', 'A positive z score means the statement stands high for the people of the factor; a negative one, that it stands low.')],
    [[P('Faktor 1 hat die Aussage richtiger beurteilt als Faktor 2 (Q-Methode, z-Wert)', 'Factor 1 judged the statement more correctly than factor 2 (Q methodology, z score)'),
      P('Q-Sorts zeigen Sichtweisen, nicht Richtigkeit.', 'Q sorts show viewpoints, not correctness.')],
     [P('Die Aussage wurde von 1,56 und von -1,17 Personen gewählt (Q-Methode, z-Wert)', 'The statement was chosen by 1.56 and by -1.17 people (Q methodology, z score)'),
      P('Ein z-Wert ist keine Personenzahl, sonst wären negative Werte unmöglich.', 'A z score is no count of people, otherwise negative values would be impossible.')],
     [P('Die Rechnung ist fehlerhaft, weil ein z-Wert nicht negativ sein darf (Q-Methode, z-Wert)', 'The calculation is faulty because a z score may not be negative (Q methodology, z score)'),
      P('z-Werte liegen um 0; negativ heißt „niedriger als der Durchschnitt der Aussagen“.', 'z scores lie around 0; negative means "lower than the average of the statements".')]]),
  fr('eh-qm-gemeinsam', [BR, ZA],
    P('Aussage 4 hat den z-Wert 1,34 auf Faktor 1 und 1,29 auf Faktor 2. Was zeigt das? (Q-Methode, z-Wert)', 'Statement 4 has the z score 1.34 on factor 1 and 1.29 on factor 2. What does that show? (Q methodology, z score)'), 1,
    [P('Beide Sichtweisen stellen sie weit nach oben; sie verbindet die Faktoren (Q-Methode, z-Wert)', 'Both viewpoints put it far up; it connects the factors (Q methodology, z score)'),
     P('Zwei fast gleiche z-Werte heißen eine gemeinsame Haltung zu dieser Aussage, obwohl die Faktoren sonst verschieden sortieren.', 'Two almost equal z scores mean a shared stance on this statement, although the factors sort differently otherwise.')],
    [[P('Die beiden Faktoren sind in Wahrheit derselbe Faktor (Q-Methode, z-Wert)', 'The two factors are in truth the same factor (Q methodology, z score)'),
      P('Ein Gleichstand bei einer Aussage macht noch keine gleichen Faktoren; die Faktorkorrelation misst das.', 'A tie on one statement does not make equal factors; the factor correlation measures that.')],
     [P('Aussage 4 wurde zu oft sortiert und muss gestrichen werden (Q-Methode, z-Wert)', 'Statement 4 was sorted too often and has to be dropped (Q methodology, z score)'),
      P('Jede Person sortiert jede Aussage genau einmal.', 'Every person sorts every statement exactly once.')],
     [P('Die Personen beider Faktoren haben abgesprochen sortiert (Q-Methode, z-Wert)', 'The people of both factors sorted by agreement (Q methodology, z score)'),
      P('Das lässt sich aus den Zahlen nicht ablesen; ähnliches Urteil ist kein Absprachebeleg.', 'That cannot be read from the numbers; a similar judgement is no proof of collusion.')]]),
  fr('eh-qm-haeufig', [ST, BR],
    P('Faktor 1 hat 4 markierte Personen, Faktor 2 ebenfalls 4. Darf das Team schreiben, jeweils die Hälfte der Bevölkerung teile diese Sichtweise? (Q-Methode, Faktoren)', 'Factor 1 has 4 flagged people, factor 2 also 4. May the team write that half of the population each shares this viewpoint? (Q methodology, factors)'), 2,
    [P('Nein: Q-Studien zeigen, welche Sichtweisen es gibt, nicht wie häufig sie sind (Q-Methode, Faktoren)', 'No: Q studies show which viewpoints exist, not how common they are (Q methodology, factors)'),
     P('Die Auswahl ist keine Zufallsstichprobe; die vier und vier Personen sagen nichts über Anteile in der Bevölkerung.', 'The selection is no random sample; the four and four people say nothing about shares in the population.')],
    [[P('Ja, denn 4 von 8 Personen sind die Hälfte der Gruppe (Q-Methode, Faktoren)', 'Yes, because 4 out of 8 people are half of the group (Q methodology, factors)'),
      P('Die Hälfte der acht Personen ist nicht die Hälfte der Bevölkerung.', 'Half of the eight people is not half of the population.')],
     [P('Ja, wenn ein Test auf die Anteile signifikant ist (Q-Methode, Faktoren)', 'Yes, if a test on the shares is significant (Q methodology, factors)'),
      P('Statable rechnet hier keinen Test auf Häufigkeiten; ein Test würde auch die Stichprobe nicht ändern.', 'Statable computes no test on frequencies here; a test would not change the sample either.')],
     [P('Ja, wenn alle acht Personen die Ladungsschwelle erreichen (Q-Methode, Faktoren)', 'Yes, if all eight people reach the loading threshold (Q methodology, factors)'),
      P('Die Schwelle sagt, wer zu einem Faktor gehört, nicht wie verbreitet er ist.', 'The threshold says who belongs to a factor, not how widespread it is.')]]),
];
