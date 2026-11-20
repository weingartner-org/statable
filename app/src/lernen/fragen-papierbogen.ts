/**
 * Üben: Papierbogen scannen (E8 Teil 2c, 15.11.2026): Einheit `papierbogen-scannen` (lernen/lernplan-papierbogen.ts), 6 Fragen `eh-pb-…`, Thema `erheben`.
 * Grundlage ist der Hilfe-Artikel `papierbogen-scannen` (hilfe/artikel-papierboegen.ts). Die Zahlen sind einfache Rechnungen aus lib/papierbogen.ts
 * (höchstens 25 Fragen je Seite, höchstens 20 Antworten je Frage, Kästchen leer unter 12 %, angekreuzt über 45 % Dunkelanteil); der Wächter
 * lernen/fragen-papierbogen.test.ts prüft sie gegen den Quelltext des Lesers. Es sind Eigenschaften von Statable, keine Fachliteratur.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

type Paar = ReturnType<typeof P>;
type A = [Paar, Paar];
const a = (t: Paar, w: Paar, richtig?: true): Antwort => ({ text: t, warum: w, ...(richtig ? { richtig } : {}) });

function fr(id: string, stamm: Paar, platz: number, richtig: A, falsch: [A, A, A]): Frage {
  const antworten: Antwort[] = falsch.map(f => a(f[0], f[1]));
  antworten.splice(platz, 0, a(richtig[0], richtig[1], true));
  return { id, thema: 'erheben', stamm, antworten, hilfe: ['papierbogen-scannen'], belege: ['Hilfe:papierbogen-scannen', 'Statable: lib/papierbogen.ts (Leser und Aufbau des Antwortbogens)'] };
}

export const FRAGEN_PAPIERBOGEN: Frage[] = [
  fr('eh-pb-unsicher', P('Ein Kästchen auf dem Scan ist blass angekreuzt: Es ist weder klar leer noch klar angekreuzt. Was tut Statable? (Papierbogen, optische Markierungserkennung)', 'A box on the scan is ticked only faintly: it is neither clearly empty nor clearly ticked. What does Statable do? (paper answer sheet, optical mark recognition)'), 2,
    [P('Es meldet das Kästchen als unsicher, und Sie entscheiden (Papierbogen, Markierungserkennung)', 'It reports the box as unsure and you decide (paper answer sheet, mark recognition)'),
     P('Statable rät nie. Ein unklares Kästchen wird gezeigt, und die Person wählt selbst.', 'Statable never guesses. An unclear box is shown and the person chooses.')],
    [[P('Es zählt das Kästchen als angekreuzt, weil überhaupt etwas Dunkles darin zu sehen ist (Papierbogen, Markierungserkennung)', 'It counts the box as ticked because something dark can be seen in it at all (paper answer sheet, mark recognition)'),
      P('Das wäre eine stille Vermutung. Zwischen klar leer und klar angekreuzt liegt „unsicher“.', 'That would be a silent guess. Between clearly empty and clearly ticked lies "unsure".')],
     [P('Es zählt das Kästchen als leer, weil das Kreuz zu blass ist (Papierbogen, Markierungserkennung)', 'It counts the box as empty because the tick is too pale (paper answer sheet, mark recognition)'),
      P('Auch das wäre geraten und könnte eine echte Antwort löschen.', 'That would also be a guess and could erase a real answer.')],
     [P('Es verwirft den ganzen Bogen (Papierbogen, Markierungserkennung)', 'It discards the whole sheet (paper answer sheet, mark recognition)'),
      P('Ein unklares Kästchen macht den Bogen nicht unbrauchbar; nur diese Frage bleibt offen.', 'One unclear box does not make the sheet unusable; only this question stays open.')]]),

  fr('eh-pb-kennleiste', P('Sie scannen 40 Bögen, und die Dateien liegen durcheinander. Woher weiß Statable, welche Seite zu welchem Bogen gehört? (Papierbogen, Kennleiste)', 'You scan 40 sheets and the files are mixed up. How does Statable know which page belongs to which sheet? (paper answer sheet, identification strip)'), 0,
    [P('Aus der Kennleiste jeder Seite (Papierbogen, Kennleiste)', 'From the identification strip of every page (paper answer sheet, identification strip)'),
     P('Jede Seite trägt ihre Nummern selbst, die Reihenfolge der Dateien spielt keine Rolle.', 'Every page carries its own numbers; the order of the files does not matter.')],
    [[P('Aus der Reihenfolge der Dateinamen, also danach, wie die Scans gespeichert wurden (Papierbogen, Kennleiste)', 'From the order of the file names, that is, by how the scans were saved (paper answer sheet, identification strip)'),
      P('Dateinamen sind Zufall und gehen beim Scannen leicht durcheinander.', 'File names are chance and easily get mixed up when scanning.')],
     [P('Aus der Handschrift auf dem Bogen (Papierbogen, Kennleiste)', 'From the handwriting on the sheet (paper answer sheet, identification strip)'),
      P('Statable liest keine Handschrift, nur Kreuze in Kästchen.', 'Statable does not read handwriting, only ticks in boxes.')],
     [P('Aus den Antworten, die sich ähneln (Papierbogen, Kennleiste)', 'From answers that resemble each other (paper answer sheet, identification strip)'),
      P('Antworten würden Bögen verwechseln lassen; die Zuordnung hängt nur an der Kennleiste.', 'Answers would let sheets be confused; the assignment depends only on the identification strip.')]]),

  fr('eh-pb-seiten', P('Ein Fragebogen hat 60 Fragen zum Ankreuzen. Auf eine Seite passen höchstens 25 Fragen. Wie viele Seiten hat jeder Antwortbogen? (Papierbogen, Aufbau)', 'A questionnaire has 60 tick-box questions. At most 25 questions fit on one page. How many pages does every answer sheet have? (paper answer sheet, layout)'), 3,
    [P('3 Seiten (Papierbogen, Aufbau)', '3 pages (paper answer sheet, layout)'),
     P('60 geteilt durch 25 ist 2,4; angefangene Seiten zählen mit, also 3.', '60 divided by 25 is 2.4; a started page counts, so 3.')],
    [[P('2 Seiten, weil 60 durch 25 abgerundet 2 ergibt (Papierbogen, Aufbau)', '2 pages, because 60 divided by 25 rounded down gives 2 (paper answer sheet, layout)'),
      P('Zwei Seiten fassen nur 50 Fragen; 10 Fragen blieben ohne Platz.', 'Two pages hold only 50 questions; 10 questions would have no room.')],
     [P('2,4 Seiten, genau das Ergebnis der Division (Papierbogen, Aufbau)', '2.4 pages, exactly the result of the division (paper answer sheet, layout)'),
      P('Es gibt nur ganze Seiten; eine angefangene zählt voll.', 'There are only whole pages; a started one counts in full.')],
     [P('4 Seiten, eine Reserveseite zusätzlich (Papierbogen, Aufbau)', '4 pages, one spare page in addition (paper answer sheet, layout)'),
      P('Das wäre aufgerundet zu viel; drei Seiten reichen für 75 Fragen.', 'That would round up too far; three pages are enough for 75 questions.')]]),

  fr('eh-pb-offen', P('Im Fragebogen steht eine offene Frage mit freiem Text. Was geschieht mit ihr auf dem Antwortbogen? (Papierbogen, Grenzen)', 'The questionnaire contains an open question with free text. What happens to it on the answer sheet? (paper answer sheet, limits)'), 1,
    [P('Sie bleibt draußen und wird gemeldet; den Text geben Sie von Hand ein (Papierbogen, Grenzen)', 'It stays out and is reported; you enter the text by hand (paper answer sheet, limits)'),
     P('Gelesen werden nur Kreuze in Kästchen; Statable nennt die Fragen, die es nicht lesen kann.', 'Only ticks in boxes are read; Statable names the questions it cannot read.')],
    [[P('Statable liest die Handschrift und übernimmt den Text in die Datentabelle (Papierbogen, Grenzen)', 'Statable reads the handwriting and takes the text over into the data table (paper answer sheet, limits)'),
      P('Handschrifterkennung gibt es nicht; sie wäre auch unsicher.', 'There is no handwriting recognition; it would also be unreliable.')],
     [P('Sie bekommt ein Kästchen für „beantwortet“ (Papierbogen, Grenzen)', 'It gets a box for "answered" (paper answer sheet, limits)'),
      P('Das sagt nichts über den Text; die Antwort selbst fehlte weiter.', 'That says nothing about the text; the answer itself would still be missing.')],
     [P('Sie wird beim Druck stillschweigend gestrichen (Papierbogen, Grenzen)', 'It is silently dropped when printing (paper answer sheet, limits)'),
      P('Stillschweigend wäre irreführend; darum nennt Statable die Frage.', 'Silently would mislead; that is why Statable names the question.')]]),

  fr('eh-pb-mehrere', P('Bei einer Frage mit genau einer Antwort sind zwei Kästchen deutlich angekreuzt. Was ist richtig? (Papierbogen, mehrere Kreuze)', 'On a question with exactly one answer, two boxes are clearly ticked. What is right? (paper answer sheet, several ticks)'), 2,
    [P('Statable zeigt die Frage zur Entscheidung und wählt nicht selbst (Papierbogen, mehrere Kreuze)', 'Statable shows the question for a decision and does not choose itself (paper answer sheet, several ticks)'),
     P('Welches Kreuz gilt, kann nur die Person am Papier entscheiden, etwa bei einer Korrektur.', 'Which tick counts can only be decided by the person looking at the paper, for example after a correction.')],
    [[P('Statable nimmt das obere der beiden Kreuze und wertet das andere nicht (Papierbogen, mehrere Kreuze)', 'Statable takes the upper of the two ticks and ignores the other one (paper answer sheet, several ticks)'),
      P('Die Lage sagt nichts über die gemeinte Antwort.', 'The position says nothing about the intended answer.')],
     [P('Statable nimmt den kleineren Code (Papierbogen, mehrere Kreuze)', 'Statable takes the smaller code (paper answer sheet, several ticks)'),
      P('Ein Zahlenvergleich sagt nichts darüber, was die Person meinte.', 'Comparing numbers says nothing about what the person meant.')],
     [P('Statable zählt beide als Antwort (Papierbogen, mehrere Kreuze)', 'Statable counts both as the answer (paper answer sheet, several ticks)'),
      P('Bei einer Frage mit genau einer Antwort ist das ein Fehlwert.', 'On a one-answer question that is an invalid value.')]]),

  fr('eh-pb-stichprobe', P('Statable hat 200 Bögen gelesen, und kein Kästchen war unsicher. Wie gehen Sie vor? (Papierbogen, Qualität)', 'Statable read 200 sheets and no box was unsure. What do you do? (paper answer sheet, quality)'), 1,
    [P('Sie prüfen eine Stichprobe von Bögen gegen das Papier (Papierbogen, Qualität)', 'You check a sample of sheets against the paper (paper answer sheet, quality)'),
     P('Ein Fleck oder ein durchscheinendes Kreuz kann täuschen, ohne unsicher zu wirken.', 'A stain or a tick showing through can mislead without looking unsure.')],
    [[P('Keine Prüfung nötig, denn es war ja kein einziges Kästchen unsicher (Papierbogen, Qualität)', 'No check needed, since not a single box was unsure (paper answer sheet, quality)'),
      P('„Nicht unsicher“ heißt nicht „sicher richtig“.', '"Not unsure" does not mean "certainly right".')],
     [P('Alle 200 Bögen noch einmal einlesen (Papierbogen, Qualität)', 'Read all 200 sheets in again (paper answer sheet, quality)'),
      P('Dasselbe Verfahren mit denselben Bildern gäbe dieselben Fehler.', 'The same procedure on the same images gives the same errors.')],
     [P('Alle Bögen nur am Bildschirm ansehen (Papierbogen, Qualität)', 'Look at all sheets only on screen (paper answer sheet, quality)'),
      P('Der Bildschirm zeigt das Bild, nicht das Papier; Fehler im Scan blieben verborgen.', 'The screen shows the image, not the paper; errors in the scan would stay hidden.')]])
];
