/**
 * Üben: Concept Mapping (B3 Teil 4c, 15.11.2026): Einheit `concept-mapping-karte` (lernen/lernplan-conceptmap.ts), 6 Fragen `eh-cm-…`, Thema `erheben`.
 * Grundlage ist der Hilfe-Artikel `concept-mapping` (hilfe/artikel-concept-mapping.ts). Die Zahlen stammen aus scripts/ueben-erwartet-conceptmap.R (Basis-R, R 4.6.1;
 * Wächter lernen/fragen-conceptmap.test.ts): 10 Personen sortieren 12 Aussagen in 3 Stapel, alles erfunden.
 * Quellen: Trochim (1989), Evaluation and Program Planning 12(1); Kane & Trochim (2007), Concept Mapping for Planning and Evaluation, Sage.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

type Paar = ReturnType<typeof P>;
type A = [Paar, Paar];
const a = (t: Paar, w: Paar, richtig?: true): Antwort => ({ text: t, warum: w, ...(richtig ? { richtig } : {}) });

function fr(id: string, belege: string[], stamm: Paar, platz: number, richtig: A, falsch: [A, A, A]): Frage {
  const antworten: Antwort[] = falsch.map(f => a(f[0], f[1]));
  antworten.splice(platz, 0, a(richtig[0], richtig[1], true));
  return { id, thema: 'erheben', stamm, antworten, hilfe: ['concept-mapping'], belege: [...belege, 'Hilfe:concept-mapping'] };
}
const TR = 'Trochim 1989, Evaluation and Program Planning 12(1), 1-16';
const KT = 'Kane & Trochim 2007, Concept Mapping for Planning and Evaluation, Sage';

export const FRAGEN_CONCEPTMAP: Frage[] = [
  fr('eh-cm-zusammen', [TR, KT],
    P('10 Personen haben 12 Aussagen auf Stapel gelegt. 7 von ihnen legten Aussage 1 und Aussage 2 auf denselben Stapel. Was zeigt das? (Concept Mapping, Ähnlichkeit)', '10 people put 12 statements onto piles. 7 of them put statement 1 and statement 2 onto the same pile. What does that show? (concept mapping, similarity)'), 1,
    [P('Die beiden Aussagen gelten als verwandt, denn die meisten Personen sahen sie als zusammengehörig (Concept Mapping, Ähnlichkeit)', 'The two statements count as related, because most people saw them as belonging together (concept mapping, similarity)'),
     P('Die Ähnlichkeit zweier Aussagen ist die Zahl der Personen, die sie zusammenlegten, hier 7 von 10.', 'The similarity of two statements is the number of people who put them together, here 7 out of 10.')],
    [[P('Die beiden Aussagen sind inhaltlich gleich und eine kann gestrichen werden (Concept Mapping, Ähnlichkeit)', 'The two statements are the same in content and one can be dropped (concept mapping, similarity)'),
      P('Zusammenlegen heißt „gehört zusammen“, nicht „sagt dasselbe“; die Aussagen können verschieden und trotzdem verwandt sein.', 'Putting together means "belongs together", not "says the same"; the statements can differ and still be related.')],
     [P('Sieben Aussagen liegen zusammen auf einem Stapel (Concept Mapping, Ähnlichkeit)', 'Seven statements lie together on one pile (concept mapping, similarity)'),
      P('Die 7 zählt Personen, nicht Aussagen.', 'The 7 counts people, not statements.')],
     [P('Die Aussagen stehen auf der Karte genau 7 Einheiten auseinander (Concept Mapping, Ähnlichkeit)', 'The statements are exactly 7 units apart on the map (concept mapping, similarity)'),
      P('Je öfter zwei Aussagen zusammengelegt wurden, desto näher liegen sie, nicht weiter auseinander.', 'The more often two statements were put together, the closer they lie, not further apart.')]]),
  fr('eh-cm-abstand', [KT],
    P('Aussage 1 und Aussage 5 wurden von keiner der 10 Personen zusammengelegt. Welchen Abstand bekommen sie? (Concept Mapping, Abstand)', 'Statement 1 and statement 5 were put together by none of the 10 people. What distance do they get? (concept mapping, distance)'), 3,
    [P('Den größten Abstand, 1,0 (1 minus 0 geteilt durch 10) (Concept Mapping, Abstand)', 'The largest distance, 1.0 (1 minus 0 divided by 10) (concept mapping, distance)'),
     P('Der Abstand ist 1 minus Anteil der Personen, die zusammenlegten; ohne jede Zusammenlegung ist er 1,0. Bei 7 von 10 wäre er 0,3.', 'The distance is 1 minus the share of people who put them together; with no one it is 1.0. With 7 of 10 it would be 0.3.')],
    [[P('Den Abstand 0, denn die Aussagen wurden von keiner Person getrennt gelegt (Concept Mapping, Abstand)', 'The distance 0, because no person put the statements apart (concept mapping, distance)'),
      P('Nie zusammen heißt weit auseinander, nicht „gleich“.', 'Never together means far apart, not "equal".')],
     [P('Keinen Abstand, die Aussagen werden aus der Karte entfernt (Concept Mapping, Abstand)', 'No distance, the statements are removed from the map (concept mapping, distance)'),
      P('Keine Aussage fällt heraus; sie liegt dann nur weit von der anderen entfernt.', 'No statement drops out; it only lies far from the other one.')],
     [P('Den Abstand 10, die Zahl der Personen (Concept Mapping, Abstand)', 'The distance 10, the number of people (concept mapping, distance)'),
      P('Der Abstand wird durch die Personenzahl geteilt und liegt darum zwischen 0 und 1.', 'The distance is divided by the number of people and therefore lies between 0 and 1.')]]),
  fr('eh-cm-guete', [KT],
    P('Die zweidimensionale Karte hat die Anpassung 0,71. Wie lesen Sie das? (Concept Mapping, Karte, Anpassungsgüte)', 'The two-dimensional map has the fit 0.71. How do you read that? (concept mapping, map, goodness of fit)'), 0,
    [P('Ordentlich, aber nicht vollständig; Abstände sind etwas verzerrt (Concept Mapping, Karte, Anpassungsgüte)', 'Reasonably, but not completely; distances are somewhat distorted (concept mapping, map, goodness of fit)'),
     P('Je näher der Wert an 1, desto besser; zwei Achsen pressen viele Aussagen in eine Fläche, ein Rest bleibt unerklärt.', 'The closer the value to 1, the better; two axes squeeze many statements into a plane, a remainder stays unexplained.')],
    [[P('71 von 100 Aussagen stehen an der richtigen Stelle (Concept Mapping, Karte, Anpassungsgüte)', '71 out of 100 statements are in the right place (concept mapping, map, goodness of fit)'),
      P('Die Anpassung ist kein Anteil richtig gesetzter Aussagen.', 'The fit is no share of correctly placed statements.')],
     [P('Die Karte ist unbrauchbar, weil der Wert unter 1 liegt (Concept Mapping, Karte, Anpassungsgüte)', 'The map is useless because the value is below 1 (concept mapping, map, goodness of fit)'),
      P('Ein Wert von genau 1 kommt in der Praxis kaum vor; 0,71 ist kein Grund, die Karte zu verwerfen.', 'A value of exactly 1 hardly occurs in practice; 0.71 is no reason to discard the map.')],
     [P('Die Gruppen sind zu 71 Prozent richtig (Concept Mapping, Karte, Anpassungsgüte)', 'The groups are 71 percent correct (concept mapping, map, goodness of fit)'),
      P('Die Anpassung beschreibt die Karte, nicht die Güte der Gruppen.', 'The fit describes the map, not the quality of the groups.')]]),
  fr('eh-cm-gruppenzahl', [TR, KT],
    P('Beim Ward-Verfahren verschmelzen die Aussagen Schritt für Schritt. Die Höhen der letzten Schritte sind 0,39, 1,47 und 1,82; davor lagen alle unter 0,4. Wer legt die Zahl der Gruppen fest? (Concept Mapping, Ward-Gruppen)', 'In Ward\'s method the statements merge step by step. The heights of the last steps are 0.39, 1.47 and 1.82; before that all were below 0.4. Who sets the number of groups? (concept mapping, Ward groups)'), 2,
    [P('Sie selbst; der Sprung nach 0,39 spricht für drei Gruppen (Concept Mapping, Ward-Gruppen)', 'You; the jump after 0.39 points to three groups (concept mapping, Ward groups)'),
     P('Ein großer Sprung zeigt, wo Gruppen sehr verschieden werden; ob die Gruppen inhaltlich Sinn ergeben, prüft die Person.', 'A large jump shows where groups become very different; the person checks whether the groups make sense in content.')],
    [[P('Statable, es nimmt die Zahl mit dem größten Sprung (Concept Mapping, Ward-Gruppen)', 'Statable, it takes the number with the largest jump (concept mapping, Ward groups)'),
      P('Statable setzt keine Zahl vor, und eine einfache Regel würde den Inhalt nicht kennen.', 'Statable sets no number, and a simple rule would not know the content.')],
     [P('Die Zahl der Personen, hier 10 Gruppen (Concept Mapping, Ward-Gruppen)', 'The number of people, so 10 groups here (concept mapping, Ward groups)'),
      P('Die Gruppen fassen Aussagen zusammen, nicht Personen.', 'The groups combine statements, not people.')],
     [P('Die Personen, die am häufigsten sortiert haben (Concept Mapping, Ward-Gruppen)', 'The people who sorted most often (concept mapping, Ward groups)'),
      P('Jede Person sortiert genau einmal; die Zahl der Gruppen wird erst bei der Auswertung gewählt.', 'Every person sorts exactly once; the number of groups is chosen only at the analysis.')]]),
  fr('eh-cm-achsen', [KT],
    P('Auf der Karte liegt Gruppe 1 links, Gruppe 3 rechts. Darf das Team schreiben, links stehe das Wichtige und rechts das Unwichtige? (Concept Mapping, Karte)', 'On the map group 1 lies on the left, group 3 on the right. May the team write that the important lies on the left and the unimportant on the right? (concept mapping, map)'), 1,
    [P('Nein: Die Achsen sind beliebig, nur Abstände und Gruppen zählen (Concept Mapping, Karte)', 'No: the axes are arbitrary, only distances and groups count (concept mapping, map)'),
     P('Eine Spiegelung oder Drehung der Karte ändert alle Abstände nicht; „links“ und „rechts“ sagen darum nichts.', 'Mirroring or turning the map changes no distances; "left" and "right" therefore say nothing.')],
    [[P('Ja, die erste Achse zeigt die Wichtigkeit (Concept Mapping, Karte)', 'Yes, the first axis shows the importance (concept mapping, map)'),
      P('Die Karte kennt keine Wichtigkeit; sie entsteht nur aus den Stapeln.', 'The map knows no importance; it arises only from the piles.')],
     [P('Ja, wenn die Anpassung über 0,5 liegt (Concept Mapping, Karte)', 'Yes, if the fit is above 0.5 (concept mapping, map)'),
      P('Auch eine gute Anpassung gibt den Achsen keine Bedeutung.', 'Even a good fit gives the axes no meaning.')],
     [P('Ja, wenn die Karte nach rechts gedreht wird (Concept Mapping, Karte)', 'Yes, if the map is turned to the right (concept mapping, map)'),
      P('Das Drehen ändert nichts am Inhalt; es zeigt nur, dass die Richtung beliebig ist.', 'Turning changes nothing in the content; it only shows that the direction is arbitrary.')]]),
  fr('eh-cm-benennen', [TR, KT],
    P('Statable zeigt die Gruppen 1, 2 und 3. Wer gibt ihnen Namen wie „Wohnen“ oder „Arbeit“? (Concept Mapping, Gruppen)', 'Statable shows groups 1, 2 and 3. Who gives them names like "housing" or "work"? (concept mapping, groups)'), 0,
    [P('Sie selbst, nach dem Lesen der Aussagen jeder Gruppe (Concept Mapping, Gruppen)', 'You yourself, after reading the statements of each group (concept mapping, groups)'),
     P('Statable deutet nichts; die Nummern sind nach Größe vergeben, der Sinn kommt aus den Aussagen.', 'Statable interprets nothing; the numbers are given by size, the meaning comes from the statements.')],
    [[P('Statable, aus den häufigsten Wörtern der Aussagen (Concept Mapping, Gruppen)', 'Statable, from the most frequent words of the statements (concept mapping, groups)'),
      P('Statable benennt keine Gruppen; ein Wortzähler träfe den Sinn auch nur zufällig.', 'Statable names no groups; a word counter would also hit the meaning only by chance.')],
     [P('Die Reihenfolge der Nummern, Gruppe 1 heißt dann „wichtigste Gruppe“ (Concept Mapping, Gruppen)', 'The order of the numbers, group 1 is then called "most important group" (concept mapping, groups)'),
      P('Die Nummern ordnen nach Größe, nicht nach Wichtigkeit.', 'The numbers order by size, not by importance.')],
     [P('Niemand, Gruppen dürfen nicht benannt werden (Concept Mapping, Gruppen)', 'Nobody, groups must not be named (concept mapping, groups)'),
      P('Das Benennen gehört zum Verfahren und ist Aufgabe der Person.', 'Naming belongs to the method and is the task of the person.')]]),
];
