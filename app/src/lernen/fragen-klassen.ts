/**
 * Üben: latente Klassen (B4 Teil 3b-3, 14.11.2026; Einheit `latente-klassen` in lernplan-klassen.ts). Kennungen `lkl-<kürzel>`, Thema `klassen`.
 * Alle Zahlen aus zwei offenen Beispielen des R-Pakets poLCA (GPL): „carcinoma“ (Agresti 2002; sieben Pathologen beurteilen 118 Schnitte mit Ja/Nein) und „gss82“
 * (General Social Survey 1982, 1202 Befragte, vier Fragen) über scripts/klassen-erwartet.R (eigener EM, gegen poLCA geprüft) und scripts/ueben-erwartet-klassen.R
 * → lib/testdaten/ueben-erwartet-klassen.json; Wächter lernen/fragen-klassen.test.ts.
 * Eigene Wortlaute. Quellen: Nylund, Asparouhov & Muthén (2007), Structural Equation Modeling 14; Weller, Bowen & Faubert (2020), Journal of Black Psychology 46
 * (Latent Class Analysis: a guide to best practice); Linzer & Lewis (2011), Journal of Statistical Software 42 (poLCA).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const NY = 'Nylund, Asparouhov & Muthén 2007, Structural Equation Modeling 14, 535-569';
const WE = 'Weller, Bowen & Faubert 2020, Journal of Black Psychology 46, 287-311';
const LI = 'Linzer & Lewis 2011, Journal of Statistical Software 42(10), 1-29';
const RECHNUNG = 'Rechnung: scripts/ueben-erwartet-klassen.R';
const KOPF_DE = 'Latente Klassenanalyse mit dem Beispiel „carcinoma“: sieben Pathologen beurteilen 118 Gewebeschnitte, jeweils Krebs ja oder nein.';
const KOPF_EN = 'Latent class analysis with the example "carcinoma": seven pathologists rate 118 tissue slides, each as cancer yes or no.';
const TAB_DE = 'BIC bei 1 bis 4 Klassen: 1082,3 / 706,1 / 697,1 / 726,5.';
const TAB_EN = 'BIC for 1 to 4 classes: 1082.3 / 706.1 / 697.1 / 726.5.';

export const FRAGEN: Frage[] = [
  {
    id: 'lkl-annahme', thema: 'klassen', karte: 'skala',
    stamm: P('Was nimmt eine latente Klassenanalyse über die Antworten an? (latente Klassen)', 'What does a latent class analysis assume about the answers? (latent classes)'),
    antworten: [
      a(P('Jede Person gehört, unbekannt, zu einer von K Klassen; innerhalb einer Klasse hängen die Antworten auf die Fragen nicht mehr zusammen (lokale Unabhängigkeit)', 'Each person belongs, unknown, to one of K classes; within a class the answers to the questions are no longer related (local independence)'), P('Das ist die Annahme: Der Zusammenhang zwischen den Fragen soll vollständig durch die Klasse erklärt werden. Darin liegt auch die Grenze, denn Fragen mit ähnlichem Wortlaut hängen oft auch in der Klasse zusammen.', 'That is the assumption: the relation between the questions is to be explained completely by the class. That is also the limit, because questions with a similar wording are often related within the class too.'), true),
      a(P('Jede Frage hat in jeder Klasse dieselben Antwortwahrscheinlichkeiten', 'Each question has the same answer probabilities in every class'), P('Dann gäbe es keine Klassen zu unterscheiden. Gerade die unterschiedlichen Antwortwahrscheinlichkeiten je Klasse machen die Klassen aus.', 'Then there would be no classes to tell apart. It is precisely the different answer probabilities per class that make up the classes.')),
      a(P('Die Antworten sind Zahlen mit Normalverteilung innerhalb der Klasse', 'The answers are numbers with a normal distribution within the class'), P('Das sind die latenten Profile für Zahlen-Messwerte. Bei latenten Klassen sind die Antworten Kategorien (zum Beispiel Ja/Nein oder Antwortstufen).', 'That is latent profiles for measured numbers. With latent classes the answers are categories (for example yes/no or answer steps).')),
      a(P('Jede Person wird mit Sicherheit genau einer Klasse zugeordnet', 'Each person is assigned with certainty to exactly one class'), P('Gerechnet wird mit Wahrscheinlichkeiten der Zugehörigkeit; die Entropie zeigt, wie eindeutig sie ausfallen.', 'What is calculated is probabilities of membership; entropy shows how clear they turn out.'))
    ],
    hilfe: ['latente-klassen'], belege: [WE, LI, 'Hilfe:latente-klassen']
  },
  {
    id: 'lkl-bic', thema: 'klassen', karte: 'skala',
    stamm: P(`${KOPF_DE} ${TAB_DE} Der BIC ist bei 3 Klassen am kleinsten, bei 2 Klassen nur um 8,9 größer, bei 4 Klassen um 29,3. Wie geht man damit um? (latente Klassen)`, `${KOPF_EN} ${TAB_EN} The BIC is smallest at 3 classes, only 8.9 larger at 2 classes, 29.3 larger at 4 classes. How do you handle this? (latent classes)`),
    antworten: [
      a(P('3 Klassen sind der Kandidat des BIC, aber 2 Klassen liegen so nah, dass Entropie, Größe der kleinsten Klasse und Sinn der Klassen mitentscheiden', 'Three classes are the BIC\'s candidate, but 2 classes are so close that entropy, size of the smallest class and meaning of the classes help decide'), P('Der Abstand von 8,9 ist klein, die Lösung mit 2 Klassen ist einfacher und eindeutiger zugeordnet (Entropie 0,986 gegen 0,926). Der BIC ist eine Hilfe, kein Urteil.', 'The distance of 8.9 is small, the solution with 2 classes is simpler and assigned more clearly (entropy 0.986 against 0.926). The BIC is a help, not a verdict.'), true),
      a(P('Die Klassenzahl mit dem kleinsten BIC nehmen, hier also 3, ohne weitere Prüfung', 'Take the number of classes with the smallest BIC, here 3, without further checks'), P('Eine feste Regel „kleinster BIC“ ignoriert, wie knapp der Abstand ist und ob die dritte Klasse etwas bedeutet.', 'A fixed rule "smallest BIC" ignores how narrow the distance is and whether the third class means something.')),
      a(P('Die Klassenzahl mit dem größten BIC nehmen, hier 1', 'Take the number of classes with the largest BIC, here 1'), P('Kleiner ist besser. Mit einer Klasse passt das Modell am schlechtesten (BIC 1082,3).', 'Smaller is better. With one class the model fits worst (BIC 1082.3).')),
      a(P('Der BIC beweist, dass es genau 3 Klassen von Schnitten gibt', 'The BIC proves that there are exactly 3 classes of slides'), P('Der BIC beweist keine Klassen, er vergleicht nur gerechnete Lösungen.', 'The BIC proves no classes, it only compares calculated solutions.'))
    ],
    hilfe: ['latente-klassen'], belege: [NY, WE, RECHNUNG, 'Hilfe:latente-klassen']
  },
  {
    id: 'lkl-parameter', thema: 'klassen', karte: 'skala',
    stamm: P(`${KOPF_DE} Wie viele Parameter hat die Lösung mit 3 Klassen? (latente Klassen)`, `${KOPF_EN} How many parameters does the solution with 3 classes have? (latent classes)`),
    antworten: [
      a(P('23 Parameter: 2 Klassenanteile (der dritte ergibt sich) und 3 Klassen mal 7 Fragen mal 1 freie Wahrscheinlichkeit', '23 parameters: 2 class shares (the third follows) and 3 classes times 7 questions times 1 free probability'), P('Bei Ja/Nein ist je Frage und Klasse nur eine Wahrscheinlichkeit frei (die andere ist 1 minus diese): 2 + 3 · 7 = 23. Der BIC verrechnet diese 23 mit der Passung.', 'With yes/no only one probability per question and class is free (the other is 1 minus it): 2 + 3 · 7 = 23. The BIC offsets these 23 against the fit.'), true),
      a(P('7 Parameter, einer je Pathologe', '7 parameters, one per pathologist'), P('Das ist die Lösung mit nur 1 Klasse (7 Parameter). Mit mehr Klassen hat jede Klasse ihre eigenen Wahrscheinlichkeiten.', 'That is the solution with only 1 class (7 parameters). With more classes each class has its own probabilities.')),
      a(P('3 Parameter, einer je Klasse', '3 parameters, one per class'), P('Die Klassenanteile sind nur ein kleiner Teil; die Antwortwahrscheinlichkeiten je Klasse und Frage kommen dazu.', 'The class shares are only a small part; the answer probabilities per class and question are added.')),
      a(P('118 Parameter, einer je Gewebeschnitt', '118 parameters, one per tissue slide'), P('Die Parameter hängen nicht an den Personen oder Schnitten, sondern an Klassen und Fragen.', 'The parameters do not depend on the persons or slides but on classes and questions.'))
    ],
    hilfe: ['latente-klassen'], belege: [LI, RECHNUNG, 'Hilfe:latente-klassen']
  },
  {
    id: 'lkl-entropie', thema: 'klassen', karte: 'skala',
    stamm: P('Vier Fragen aus dem General Social Survey 1982 (1202 Befragte, Fragen zur Meinung über Umfragen). Bei 2 Klassen ist die Entropie 0,703, die Klassen haben 80,8 % und 19,2 % der Befragten. Beim Beispiel mit den Pathologen war sie 0,986. Was sagt die 0,703? (latente Klassen)', 'Four questions from the General Social Survey 1982 (1202 respondents, questions on the opinion about surveys). With 2 classes the entropy is 0.703, the classes have 80.8% and 19.2% of the respondents. In the example with the pathologists it was 0.986. What does the 0.703 say? (latent classes)'),
    antworten: [
      a(P('Die Klassen überlappen deutlich: Bei vielen Befragten ist die Zuordnung unsicher, man sollte einzelne Befragte nicht fest einer Klasse zuschreiben', 'The classes overlap clearly: for many respondents the assignment is uncertain, you should not ascribe individual respondents firmly to a class'), P('Nahe 1 heißt klare Zuordnung, nahe 0 starke Überlappung. 0,703 liegt dazwischen: Die Klassen sind brauchbar zum Beschreiben, aber nicht scharf getrennt.', 'Near 1 means clear assignment, near 0 strong overlap. 0.703 lies in between: the classes are usable for describing but not sharply separated.'), true),
      a(P('70,3 % der Befragten sind richtig zugeordnet', '70.3% of the respondents are assigned correctly'), P('Die Entropie ist keine Trefferquote; es gibt keine „richtige“ Klasse, mit der man vergleichen könnte.', 'Entropy is not a hit rate; there is no "correct" class to compare with.')),
      a(P('Die kleine Klasse mit 19,2 % ist ein Fehler und muss weg', 'The small class with 19.2% is an error and must go'), P('Eine Klasse von knapp einem Fünftel ist nicht klein. Kritisch wäre eine Klasse unter etwa 5 %.', 'A class of almost a fifth is not small. A class below about 5% would be critical.')),
      a(P('Mit 0,703 gibt es sicher keine Klassen in den Daten', 'With 0.703 there are surely no classes in the data'), P('Die Entropie sagt nichts darüber, ob es Klassen gibt, nur wie eindeutig die Zuordnung ausfällt.', 'Entropy says nothing about whether there are classes, only how clear the assignment turns out.'))
    ],
    hilfe: ['latente-klassen'], belege: [WE, RECHNUNG, 'Hilfe:latente-klassen']
  },
  {
    id: 'lkl-klasse-lesen', thema: 'klassen', karte: 'skala',
    stamm: P(`${KOPF_DE} Bei 2 Klassen (50,1 % und 49,9 % der Schnitte) hielt Pathologe A in Klasse 1 100 % der Schnitte für Krebs, in Klasse 2 11,7 %; Pathologe F in Klasse 1 42,3 %, in Klasse 2 0,0 %. Wie liest man das? (latente Klassen)`, `${KOPF_EN} With 2 classes (50.1% and 49.9% of the slides) pathologist A judged 100% of the slides in class 1 as cancer, in class 2 11.7%; pathologist F in class 1 42.3%, in class 2 0.0%. How do you read this? (latent classes)`),
    antworten: [
      a(P('Die Klassen sind Gruppen von Schnitten: Pathologe A hält in Klasse 1 alle Schnitte für Krebs, in Klasse 2 nur 11,7 %; Pathologe F urteilt auch in Klasse 1 zurückhaltender als A (42,3 % gegen 100 %)', 'The classes are groups of slides: pathologist A judges all slides in class 1 as cancer, in class 2 only 11.7%; pathologist F is also more reluctant than A in class 1 (42.3% against 100%)'), P('Antwortwahrscheinlichkeiten je Klasse und Frage zeigen das Muster der Klasse. Welche Schnitte wirklich Krebs haben, sagt die Rechnung nicht, nur wie die Urteile zusammen auftreten.', 'Answer probabilities per class and question show the pattern of the class. Which slides really have cancer, the calculation does not say, only how the judgements occur together.'), true),
      a(P('Klasse 1 besteht aus den Pathologen, die Krebs erkennen, Klasse 2 aus den anderen', 'Class 1 consists of the pathologists who recognise cancer, class 2 of the others'), P('Die Klassen gruppieren die Fälle (hier die Schnitte), nicht die Fragen oder Beurteilenden. Alle sieben Pathologen kommen in beiden Klassen vor, mit unterschiedlichen Wahrscheinlichkeiten.', 'The classes group the cases (here the slides), not the questions or raters. All seven pathologists appear in both classes, with different probabilities.')),
      a(P('Klasse 1 sind die kranken Schnitte, damit ist die Diagnose bewiesen', 'Class 1 are the diseased slides, so the diagnosis is proven'), P('Latente Klassen kennen die wahre Diagnose nicht. Sie ordnen Urteilsmuster; ein Urteil über richtig oder falsch braucht ein unabhängiges Kriterium.', 'Latent classes do not know the true diagnosis. They arrange patterns of judgements; a verdict of right or wrong needs an independent criterion.')),
      a(P('Weil beide Klassen etwa gleich groß sind, taugt die Lösung nicht', 'Because both classes are about equally large, the solution is no good'), P('Die Größe der Klassen sagt nichts über die Qualität; hier trennen die Antwortmuster die Klassen sehr klar (Entropie 0,986).', 'The size of the classes says nothing about quality; here the answer patterns separate the classes very clearly (entropy 0.986).'))
    ],
    hilfe: ['latente-klassen'], belege: [LI, RECHNUNG, 'Hilfe:latente-klassen']
  },
  {
    id: 'lkl-mehrfach', thema: 'klassen', mehrfach: true, karte: 'skala',
    stamm: P('Welche Aussagen über latente Klassen in Statable stimmen? Mehrere können stimmen. (latente Klassen)', 'Which statements about latent classes in Statable are true? Several can be true. (latent classes)'),
    antworten: [
      a(P('Statable probiert viele zufällige Startwerte und zeigt das beste Ergebnis, weil der Rechenweg (EM-Algorithmus) in einer schlechteren Lösung hängen bleiben kann.', 'Statable tries many random starting values and shows the best result because the calculation (EM algorithm) can get stuck in a worse solution.'), P('Stimmt. Ein einziger Start kann bei einer nur lokal besten Lösung enden; darum gibt es viele Startwerte.', 'True. A single start can end in a merely locally best solution; that is why there are many starting values.'), true),
      a(P('Die Klassennummern sind nur Etiketten, nach Größe geordnet; bei einem anderen Startwert können sie vertauscht herauskommen.', 'The class numbers are only labels, ordered by size; with another seed they can come out swapped.'), P('Stimmt: „Klasse 1“ ist keine feste Eigenschaft.', 'True: "class 1" is not a fixed property.'), true),
      a(P('Für Messwerte wie Körpermaße sind die latenten Profile unter der Clusteranalyse gedacht, für Ja/Nein und Antwortstufen die latenten Klassen unter der Skalen-Auswertung.', 'For measured values like body measures the latent profiles under cluster analysis are meant, for yes/no and answer steps the latent classes under the scale analysis.'), P('Stimmt: Es hängt an der Art der Spalten, ob Mittelwerte (Profile) oder Antwortwahrscheinlichkeiten (Klassen) je Gruppe geschätzt werden.', 'True: it depends on the kind of columns whether means (profiles) or answer probabilities (classes) are estimated per group.'), true),
      a(P('Mit jeder weiteren Klasse sinkt der BIC, weil die Passung dabei nicht schlechter wird.', 'With every additional class the BIC falls because the fit does not get worse.'), P('Stimmt nicht: Der BIC verrechnet die Passung mit der Zahl der Parameter; im Beispiel steigt er von 3 auf 4 Klassen an (697,1 auf 726,5).', 'Not true: the BIC offsets the fit against the number of parameters; in the example it rises from 3 to 4 classes (697.1 to 726.5).'))
    ],
    hilfe: ['latente-klassen'], belege: [NY, LI, RECHNUNG, 'Hilfe:latente-klassen']
  }
];
