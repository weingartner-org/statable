/**
 * Hilfe-Artikel zur Q-Methode (B3 Teil 3b, 15.11.2026): `q-methode`. Nur Deutsch und Englisch, jeder Text ein Textpaar P(de, en).
 * Die Lehreinheit mit Rechenbeispiel folgt in Teil 3c. Quellen (eigene Worte): Stephenson (1953), The Study of Behavior; Brown (1980), Political Subjectivity;
 * Zabala (2014), qmethod: A package to explore human perspectives using Q methodology, The R Journal 6(2).
 */
import { P } from '../i18n/laufzeit';
import { a, falsch, mitnehmen, type Roh } from './artikel-roh';

const Q_QM = P('Stephenson, W. (1953). The Study of Behavior: Q-Technique and Its Methodology. University of Chicago Press. Brown, S. R. (1980). Political Subjectivity. Yale University Press. Zabala, A. (2014). qmethod: A package to explore human perspectives using Q methodology. The R Journal, 6(2), 163-173.',
  'Stephenson, W. (1953). The Study of Behavior: Q-Technique and Its Methodology. University of Chicago Press. Brown, S. R. (1980). Political Subjectivity. Yale University Press. Zabala, A. (2014). qmethod: A package to explore human perspectives using Q methodology. The R Journal, 6(2), 163-173.');

export const ROH_Q_METHODE: Roh[] = [
  a('q-methode', 'fragen', P('Welche Sichtweisen gibt es? (Q-Methode, Faktorenanalyse über Personen)', 'Which viewpoints are there? (Q methodology, factor analysis across people)'),
    P('Q-Methode Q-Sort Sichtweisen Faktoren Personen Faktorenanalyse über Personen Varimax Faktor-Q-Sort z-Wert Stephenson Aussagen einordnen Raster', 'Q methodology Q sort viewpoints factors people factor analysis across people varimax factor Q sort z score Stephenson placing statements grid'),
    [
      { h: P('Kurz', 'In brief') },
      P('Bei der Q-Methode (Q methodology) sortiert jede Person eine Reihe von Aussagen in ein Raster, zum Beispiel von -4 (trifft gar nicht zu) bis +4 (trifft voll zu), meist mit einer vorgegebenen Zahl pro Platz. Dieses Sortieren heißt Q-Sort. Dann fragt man: Welche Gruppen von Personen sortieren ähnlich, also welche Sichtweisen gibt es?',
        'In Q methodology each person sorts a set of statements into a grid, for example from -4 (disagree strongly) to +4 (agree strongly), usually with a fixed number of places per slot. This sorting is called a Q sort. The question then is: which groups of people sort alike, that is, which viewpoints exist?'),
      { h: P('Was Statable zeigt', 'What Statable shows') },
      { ul: [
        P('Eine Faktorenanalyse über Personen: Die Personen werden miteinander korreliert (nicht die Aussagen), die Hauptkomponenten per Varimax gedreht. Jede Person bekommt je Faktor eine Ladung. Eine Person gilt als zugehörig („markiert“), wenn die Ladung bedeutsam ist und mehr Varianz erklärt als alle anderen Ladungen zusammen.', 'A factor analysis across people: the people are correlated with each other (not the statements), the principal components are rotated by varimax. Each person gets a loading per factor. A person counts as belonging ("flagged") if the loading is significant and explains more variance than all other loadings together.'),
        P('Je Faktor und Aussage einen z-Wert: wie hoch die Aussage für die Personen des Faktors im Schnitt steht (gewichtet nach ihrer Ladung).', 'Per factor and statement a z score: how high the statement stands for the people of the factor on average (weighted by their loadings).'),
        P('Haben alle Q-Sorts dieselbe Verteilung, zusätzlich den Faktor-Q-Sort: die Aussagen nach ihrem z-Wert zurück in das Raster gelegt.', 'If all Q sorts share the same distribution, also the factor Q sort: the statements put back into the grid by their z score.')
      ] },
      { h: P('So geht es in Statable', 'How to do it in Statable') },
      { ol: [
        P('Eine Datei öffnen, in der jede Zeile ein Q-Sort einer Person ist und jede Spalte eine Aussage (Zahl für den Platz im Raster, mindestens acht Spalten, mindestens drei Personen).', 'Open a file in which each row is one person\'s Q sort and each column a statement (a number for the place in the grid, at least eight columns, at least three people).'),
        P('Die Frage „Messen meine Fragen dasselbe? (Skalen-Auswertung, Cronbachs Alpha)“ mit diesen Spalten rechnen.', 'Run the question "Do my questions measure the same thing? (scale analysis, Cronbach\'s alpha)" with these columns.'),
        P('Unter dem Ergebnis „Welche Sichtweisen gibt es? (Q-Methode, Faktorenanalyse über Personen)“ öffnen, die Zahl der Faktoren eintragen und die Tabellen lesen. „Als CSV speichern“ und „Als R-Skript mit Daten (.zip)“ nehmen die Zahlen mit.', 'Under the result open "Which viewpoints are there? (Q methodology, factor analysis across people)", enter the number of factors and read the tables. "Save as CSV" and "As R script with data (.zip)" take the numbers with you.')
      ] },
      { h: P('Grenzen', 'Limits') },
      { ul: [
        P('Wie viele Faktoren Sie betrachten, entscheiden Sie. Statable gibt keine Zahl vor; Eigenwerte und Inhalt helfen bei der Wahl.', 'You decide how many factors to look at. Statable sets no number; eigenvalues and content help you choose.'),
        P('Statable markiert automatisch. Von Hand lässt sich die Markierung hier nicht ändern; das R-Skript ist der Weg, wenn Sie anders markieren wollen.', 'Statable flags automatically. The flagging cannot be changed by hand here; the R script is the way if you want to flag differently.'),
        P('Was ein Faktor inhaltlich bedeutet, deuten Sie anhand der Aussagen an den beiden Enden. Statable deutet nichts.', 'What a factor means you interpret from the statements at the two ends. Statable interprets nothing.')
      ] },
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      falsch(P('Ein Faktor zeigt, wie viele Menschen eine Sichtweise haben.', 'A factor shows how many people hold a viewpoint.'),
        P('Q-Studien haben wenige, gezielt gewählte Personen. Sie zeigen, welche Sichtweisen es gibt, nicht wie häufig sie sind.', 'Q studies have few, deliberately chosen people. They show which viewpoints exist, not how common they are.')),
      { h: P('Quellen', 'Sources') },
      Q_QM,
      mitnehmen(
        P('Bei der Q-Methode werden Personen korreliert, nicht Aussagen.', 'In Q methodology people are correlated, not statements.'),
        P('Die Zahl der Faktoren legen Sie fest.', 'You set the number of factors.'),
        P('Ein Faktor ist eine Gruppe ähnlich sortierender Personen, kein Typ.', 'A factor is a group of people who sort similarly, not a type.'),
        P('Ergebnisse zeigen Sichtweisen, keine Häufigkeiten.', 'Results show viewpoints, not frequencies.')
      )
    ], ['delphi'])
];
