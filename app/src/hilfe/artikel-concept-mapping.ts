/**
 * Hilfe-Artikel zum Concept Mapping (B3 Teil 4b, 15.11.2026): `concept-mapping`. Nur Deutsch und Englisch, jeder Text ein Textpaar P(de, en).
 * Die Lehreinheit mit Rechenbeispiel folgt in Teil 4c. Quellen (eigene Worte): Trochim (1989), An introduction to concept mapping for planning and evaluation, Evaluation and Program Planning 12(1);
 * Kane & Trochim (2007), Concept Mapping for Planning and Evaluation, Sage.
 */
import { P } from '../i18n/laufzeit';
import { a, falsch, mitnehmen, type Roh } from './artikel-roh';

const Q_CM = P('Trochim, W. M. K. (1989). An introduction to concept mapping for planning and evaluation. Evaluation and Program Planning, 12(1), 1-16. Kane, M., & Trochim, W. M. K. (2007). Concept Mapping for Planning and Evaluation. Sage.',
  'Trochim, W. M. K. (1989). An introduction to concept mapping for planning and evaluation. Evaluation and Program Planning, 12(1), 1-16. Kane, M., & Trochim, W. M. K. (2007). Concept Mapping for Planning and Evaluation. Sage.');

export const ROH_CONCEPT_MAPPING: Roh[] = [
  a('concept-mapping', 'fragen', P('Welche Aussagen gehören zusammen? (Concept Mapping, Karte aus Sortierungen)', 'Which statements belong together? (concept mapping, map from sortings)'),
    P('Concept Mapping Karte Sortieren Stapel Aussagen Gruppen Ähnlichkeit MDS Ward Trochim Kane Begriffe ordnen', 'concept mapping map sorting piles statements groups similarity MDS Ward Trochim Kane organising ideas'),
    [
      { h: P('Kurz', 'In brief') },
      P('Beim Concept Mapping (concept mapping) sammelt eine Gruppe Aussagen zu einem Thema. Dann legt jede Person die Aussagen auf Stapel nach Ähnlichkeit. Aussagen, die viele Personen zusammenlegen, gelten als verwandt. Daraus entsteht eine Karte, auf der verwandte Aussagen nah beieinander liegen, und Gruppen von Aussagen.',
        'In concept mapping a group collects statements on a topic. Then each person puts the statements onto piles by similarity. Statements that many people put together count as related. This yields a map on which related statements lie close together, and groups of statements.'),
      { h: P('Was Statable zeigt', 'What Statable shows') },
      { ul: [
        P('Eine Karte (zwei Achsen, klassische mehrdimensionale Skalierung, MDS), in der der Abstand zweier Aussagen davon abhängt, wie selten Personen sie zusammenlegten.', 'A map (two axes, classical multidimensional scaling, MDS) in which the distance of two statements depends on how rarely people put them together.'),
        P('Gruppen nach dem Ward-Verfahren (Ward\'s method) auf den Punkten der Karte. Die Gruppen sind nach Größe nummeriert; benennen müssen Sie sie selbst.', 'Groups by Ward\'s method on the points of the map. The groups are numbered by size; you have to name them yourself.'),
        P('Eine Tabelle mit Gruppe und Lage jeder Aussage, CSV und ein R-Skript in Basis-R, das dieselbe Rechnung wiederholt.', 'A table with the group and position of every statement, CSV and an R script in base R that repeats the same calculation.')
      ] },
      { h: P('So geht es in Statable', 'How to do it in Statable') },
      { ol: [
        P('Eine Datei öffnen, in der jede Zeile das Sortieren einer Person ist und jede Spalte eine Aussage (Zahl für die Nummer des Stapels, mindestens sechs Spalten, mindestens zwei Personen).', 'Open a file in which each row is one person\'s sorting and each column a statement (a number for the pile, at least six columns, at least two people).'),
        P('Die Frage „Messen meine Fragen dasselbe? (Skalen-Auswertung, Cronbachs Alpha)“ mit diesen Spalten rechnen.', 'Run the question "Do my questions measure the same thing? (scale analysis, Cronbach\'s alpha)" with these columns.'),
        P('Unter dem Ergebnis „Welche Aussagen gehören zusammen? (Concept Mapping, Karte aus Sortierungen)“ öffnen und die Zahl der Gruppen eintragen.', 'Under the result open "Which statements belong together? (concept mapping, map from sortings)" and enter the number of groups.')
      ] },
      { h: P('Grenzen', 'Limits') },
      { ul: [
        P('Die Zahl der Gruppen legen Sie fest. Probieren Sie mehrere aus und prüfen Sie, ob die Gruppen inhaltlich Sinn ergeben.', 'You set the number of groups. Try several and check whether the groups make sense in terms of content.'),
        P('Statable nutzt die klassische, nicht die nichtmetrische Skalierung, die in der Literatur oft genannt wird. Das Bild ist ähnlich, aber nicht gleich.', 'Statable uses classical, not the non-metric scaling that the literature often names. The picture is similar but not identical.'),
        P('Das Sortieren am Bildschirm und Bewertungen (zum Beispiel Wichtigkeit) gibt es in dieser Fassung noch nicht; die Sortierungen kommen aus einer Datei.', 'Sorting on screen and ratings (for example importance) are not part of this version yet; the sortings come from a file.')
      ] },
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      falsch(P('Die Achsen der Karte haben eine Bedeutung, zum Beispiel „links = wichtig“.', 'The axes of the map have a meaning, for example "left = important".'),
        P('Die Achsen sind nur eine Hilfe zum Zeichnen. Bedeutung haben die Abstände zwischen den Punkten und die Gruppen, nicht die Richtungen.', 'The axes are only an aid for drawing. The distances between the points and the groups have meaning, not the directions.')),
      { h: P('Quellen', 'Sources') },
      Q_CM,
      mitnehmen(
        P('Aussagen, die oft zusammengelegt werden, liegen auf der Karte nah beieinander.', 'Statements that are often put together lie close together on the map.'),
        P('Die Zahl der Gruppen legen Sie fest.', 'You set the number of groups.'),
        P('Die Gruppen benennen und deuten Sie, nicht Statable.', 'You name and interpret the groups, not Statable.'),
        P('Die Achsen der Karte haben keine eigene Bedeutung.', 'The axes of the map have no meaning of their own.')
      )
    ], ['q-methode'])
];
