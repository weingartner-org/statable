/**
 * Hilfe-Artikel „Papierbögen eingeben (doppelte Dateneingabe)“ (Erheben, Paket 2F): kurz, einfache Sprache, Fachbegriffe erklärt. Nur Deutsch und Englisch, jeder Text ein Textpaar P(de, en).
 * Beleg: Paulsen, Overgaard & Lauritsen (2012), PLoS ONE 7(4), e35087 (frei zugänglich).
 */
import { P } from '../i18n/laufzeit';
import { a, falsch, mitnehmen, type Roh } from './artikel-roh';

export const ROH_PAPIERBOEGEN: Roh[] = [
  a('papierboegen-eingeben', 'fragen', P('Papierbögen eingeben (doppelte Dateneingabe)', 'Enter paper questionnaires (double data entry)'),
    P('Papierbögen eingeben doppelte Dateneingabe Doppeleingabe Eingabemaske Abgleich Abweichung Protokoll Methodenteil Bogen Nummer Durchgang blind Filter Sprung Code Tippfehler Fehler je 1000 Felder Paulsen', 'enter paper questionnaires double data entry input mask comparison discrepancy protocol methods section questionnaire number pass blind filter skip code typing error errors per 1000 fields Paulsen'),
    [
      { h: P('Kurz', 'In brief') },
      P('Wenn Fragebögen auf Papier ausgefüllt wurden, müssen die Antworten in den Computer. Dabei passieren Tippfehler. Bei der doppelten Dateneingabe wird jeder Bogen zweimal und unabhängig eingegeben. Statable zeigt dann jede Stelle, an der die beiden Eingaben nicht übereinstimmen, und Sie entscheiden mit dem Papierbogen in der Hand, was stimmt.', 'When questionnaires were filled in on paper, the answers have to go into the computer. Typing errors happen. In double data entry every questionnaire is entered twice and independently. Statable then shows every place where the two entries disagree, and you decide with the paper questionnaire in hand which is right.'),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      { ol: [
        P('Öffnen Sie unter „Fragebogen planen“ den Fragebogen und wählen Sie die Ansicht „Daten eingeben (Eingabemaske)“. Der Fragebogen-Plan bestimmt, welche Fragen die Maske zeigt.', 'Under "Plan a questionnaire" open the questionnaire and choose the view "Enter data (input mask)". The questionnaire plan decides which questions the mask shows.'),
        P('Wählen Sie den Durchgang: „Einfach eingeben“ oder „Doppeleingabe, Durchgang A“ und später „Durchgang B“. Durchgang B ist blind: Er zeigt nichts aus Durchgang A, auch nicht die Liste der Bögen. Sonst wäre er nicht mehr unabhängig.', 'Choose the pass: "Single entry" or "Double entry, pass A" and later "pass B". Pass B is blind: it shows nothing from pass A, not even the list of questionnaires. Otherwise it would no longer be independent.'),
        P('Tippen Sie zuerst die Bogen-Nummer. Sie muss in jedem Durchgang eindeutig sein. Danach folgen die Fragen. Tippen Sie bei einer Auswahlfrage den Code der Antwort (zum Beispiel 3), und die Antwort wird gewählt. Neben dem Feld steht der gewählte Code mit seinem Text, zum Beispiel „3 = eher zufrieden“. Enter springt zum nächsten Feld.', 'Type the questionnaire number first. It must be unique in each pass. The questions follow. For a choice question, type the code of the answer (for example 3) and the answer is chosen. Next to the field you see the chosen code with its text, for example "3 = rather satisfied". Enter jumps to the next field.'),
        P('Strg+Enter speichert den Bogen und öffnet den nächsten. Statable schlägt die nächste Nummer vor und sagt zum Beispiel „Bogen 12 gespeichert, Bogen 13“ an. Jeder gespeicherte Bogen bleibt im Projekt; Sie können jederzeit aufhören und später weitermachen.', 'Ctrl+Enter saves the questionnaire and opens the next one. Statable suggests the next number and announces, for example, "Questionnaire 12 saved, questionnaire 13". Every saved questionnaire stays in the project; you can stop at any time and continue later.'),
        P('Sind beide Durchgänge fertig, öffnen Sie „Abgleich und Protokoll“. Wählen Sie je Abweichung den Wert aus Durchgang A, den aus Durchgang B oder geben Sie einen neuen Wert ein. Erst wenn alle Abweichungen entschieden sind, können Sie den Datensatz erzeugen.', 'When both passes are done, open "Comparison and protocol". For each discrepancy choose the value from pass A, the one from pass B or enter a new value. Only when all discrepancies are decided can you create the data set.'),
        P('Das Protokoll für den Methodenteil gibt es als Text zum Kopieren und als Word-Datei.', 'The protocol for the methods section is available as text to copy and as a Word file.')
      ] },
      { h: P('Was die Maske prüft', 'What the mask checks') },
      { ul: [
        P('Ein Code, der nicht in der Antwortliste steht, ist ein Fehler an der Frage. Eine Zahl außerhalb der erlaubten Grenzen ebenfalls.', 'A code that is not in the answer list is an error at the question. So is a number outside the allowed limits.'),
        P('Eine leere Pflichtfrage sperrt nichts, sie führt zu einer Rückfrage: Auf Papier kann eine Antwort fehlen. Bestätigen Sie, dann bleibt das Feld leer.', 'An empty required question blocks nothing; it leads to a question back: an answer can be missing on paper. Confirm and the field stays empty.'),
        P('Filterfragen („Nur zeigen, wenn …“) folgen den Sprungregeln des Plans. Eine übersprungene Frage bekommt den Code -7 („trifft nicht zu“, als fehlend erklärt) und zählt nicht als Feld.', 'Filter questions ("Only show if …") follow the skip rules of the plan. A skipped question gets the code -7 ("not applicable", declared missing) and does not count as a field.')
      ] },
      { h: P('Wichtige Begriffe', 'Key terms') },
      { ul: [
        P('Doppelte Dateneingabe: Dieselben Papierbögen werden von zwei Durchgängen unabhängig eingegeben und dann verglichen. Jede Abweichung zeigt einen Tippfehler in mindestens einem Durchgang.', 'Double data entry: the same paper questionnaires are entered in two passes independently and then compared. Every discrepancy shows a typing error in at least one pass.'),
        P('Blind: Wer Durchgang B eingibt, sieht nichts aus Durchgang A. So kann ein Fehler nicht von dort übernommen werden.', 'Blind: whoever enters pass B sees nothing from pass A. This way an error cannot be copied from there.'),
        P('Abweichung: Ein Feld eines Bogens hat in A und B nicht denselben Wert (auch leer gegen einen Wert zählt). Leerzeichen am Rand eines Textes zählen nicht.', 'Discrepancy: a field of a questionnaire does not have the same value in A and B (empty against a value also counts). Spaces at the edge of a text do not count.'),
        P('Abweichungen je 1.000 Felder: Zahl der Abweichungen geteilt durch die Zahl der verglichenen Felder, mal 1.000. Verglichen werden nur Bögen, die in beiden Durchgängen vorkommen, und nur Felder, die gezeigt wurden. Beispiel: 3 Abweichungen bei 32 Feldern sind 93,8 je 1.000 Felder.', 'Discrepancies per 1,000 fields: the number of discrepancies divided by the number of compared fields, times 1,000. Only questionnaires that appear in both passes are compared, and only fields that were shown. Example: 3 discrepancies in 32 fields is 93.8 per 1,000 fields.'),
        P('Nur einfach erfasst übernehmen: Ein Bogen, der nur in einem Durchgang vorkommt, kommt nicht von selbst in den Datensatz. Sie können ihn ausdrücklich so übernehmen; das Protokoll nennt dann ihre Zahl.', 'Include as single entry only: a questionnaire that appears in only one pass does not go into the data set by itself. You can include it explicitly; the protocol then states their number.')
      ] },
      { h: P('Wie gut ist das?', 'How good is it?') },
      P('Paulsen, Overgaard und Lauritsen (2012) haben in einer Studie mit Patientenfragebögen die Eingabe verglichen: Bei einfacher Eingabe lagen die Fehler bei 0,370 je 1.000 Felder, bei doppelter Eingabe bei 0,046 je 1.000 Felder (PLoS ONE 7(4), e35087, frei zugänglich). Die Zahlen hängen von Bögen und Personen ab; Ihr eigener Wert steht im Protokoll.', 'Paulsen, Overgaard and Lauritsen (2012) compared data entry in a study of patient questionnaires: with single entry the errors were 0.370 per 1,000 fields, with double entry 0.046 per 1,000 fields (PLoS ONE 7(4), e35087, open access). The numbers depend on questionnaires and people; your own value is in the protocol.'),
      { h: P('Stimmt nicht - so ist es', 'Not true - this is how it is') },
      falsch(P('Wenn A und B übereinstimmen, ist der Wert sicher richtig.', 'If A and B agree, the value is certainly right.'),
        P('Zwei gleiche Eingaben schließen Tippfehler sehr unwahrscheinlich, aber nicht aus. Auch ein Fehler im Papierbogen selbst bleibt unbemerkt.', 'Two equal entries make typing errors very unlikely, but do not rule them out. An error in the paper questionnaire itself also goes unnoticed.')),
      falsch(P('Bögen nur in einem Durchgang gehen automatisch in die Daten.', 'Questionnaires in only one pass go into the data automatically.'),
        P('Sie bleiben draußen, bis Sie sie ausdrücklich als einfach erfasst übernehmen.', 'They stay out until you explicitly include them as single entry.')),
      { h: P('Grenzen', 'Limits') },
      { ul: [
        P('Ohne offenes Projekt bleiben die Eingaben nur in dieser Sitzung. Öffnen Sie ein Projekt und übernehmen Sie den Fragebogen dorthin, dann werden sie mitgespeichert.', 'Without an open project the entries only stay for this session. Open a project and move the questionnaire there, then they are saved along with it.'),
        P('Der Abgleich vergleicht Codes und Texte, keine Bedeutung. Die Entscheidung über den richtigen Wert trifft immer ein Mensch mit dem Papierbogen.', 'The comparison compares codes and texts, not meaning. A person with the paper questionnaire always decides which value is right.')
      ] },
      mitnehmen(
        P('Doppelte Eingabe findet Tippfehler: Jeder Bogen wird zweimal und unabhängig eingegeben, die Abweichungen entscheiden Sie mit dem Papierbogen.', 'Double entry finds typing errors: every questionnaire is entered twice and independently, and you decide the discrepancies with the paper questionnaire.'),
        P('Durchgang B ist blind und zeigt nichts aus Durchgang A.', 'Pass B is blind and shows nothing from pass A.'),
        P('Das Protokoll nennt Bögen, Felder, Abweichungen und die Abweichungen je 1.000 Felder und gehört in den Methodenteil.', 'The protocol states questionnaires, fields, discrepancies and discrepancies per 1,000 fields and belongs in the methods section.'),
        P('Strg+Enter speichert den Bogen und öffnet den nächsten; jeder gespeicherte Bogen bleibt im Projekt.', 'Ctrl+Enter saves the questionnaire and opens the next one; every saved questionnaire stays in the project.')
      )
    ], ['fragebogen-planen', 'eh-methode']),
  a('papierbogen-scannen', 'fragen', P('Papierbögen scannen statt abtippen (Antwortbogen mit Kästchen)', 'Scan paper questionnaires instead of typing them (answer sheet with boxes)'),
    P('Papierbogen scannen Antwortbogen Kästchen ankreuzen Eckmarken Kennleiste Bogen Nummer Scan Foto Einlesen Gescannte Bögen unsicher mehrere Kreuze Korrektur Optical Mark Recognition OMR', 'paper answer sheet scan boxes tick corner marks identification strip questionnaire number scan photo read in scanned questionnaires unsure several ticks correction optical mark recognition OMR'),
    [
      { h: P('Kurz', 'In brief') },
      P('Statable kann einen Antwortbogen mit Kästchen zum Ankreuzen drucken und ausgefüllte, gescannte Bögen wieder einlesen (Fachbegriff: optische Markierungserkennung, optical mark recognition). Alles passiert im Browser, kein Bild wird hochgeladen. Wo etwas nicht klar zu lesen ist, fragt Statable Sie, statt zu raten.',
        'Statable can print an answer sheet with boxes to tick and read filled-in, scanned sheets back in (technical term: optical mark recognition). Everything happens in the browser, no image is uploaded. Where something cannot be read clearly, Statable asks you instead of guessing.'),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      { ol: [
        P('Öffnen Sie unter „Fragebogen planen“ den Fragebogen. Im Export-Menü wählen Sie „Antwortbogen speichern (HTML zum Drucken)“ und tragen ein, wie viele Bögen Sie brauchen. Jeder Bogen bekommt seine eigene Nummer.', 'Under "Plan a questionnaire" open the questionnaire. In the export menu choose "Save answer sheet (HTML for printing)" and enter how many sheets you need. Every sheet gets its own number.'),
        P('Drucken Sie mit 100 % Größe und eingeschalteten Hintergrundgrafiken. Skalieren Sie nicht auf „An Seite anpassen“, sonst stimmen die Maße nicht.', 'Print at 100 % size with background graphics switched on. Do not scale to "fit to page", otherwise the measures are wrong.'),
        P('Lassen Sie die Bögen ausfüllen: ein Kreuz in das Kästchen, ausmalen ist nicht nötig.', 'Have the sheets filled in: one tick in the box, there is no need to colour it in.'),
        P('Scannen oder fotografieren Sie die Bögen. Alle vier Ecken müssen auf dem Bild sein. Das Blatt darf schief liegen oder auf dem Kopf stehen.', 'Scan or photograph the sheets. All four corners must be in the picture. The sheet may lie crooked or upside down.'),
        P('Wählen Sie in „Antworten sammeln“ die Quelle „Gescannte Bögen“ und die Bild- oder PDF-Dateien. Statable ordnet die Seiten den Bögen zu und zeigt, was gelesen wurde.', 'In "Collect answers" choose the source "Scanned sheets" and the image or PDF files. Statable assigns the pages to the sheets and shows what was read.'),
        P('Entscheiden Sie bei jeder offenen Frage selbst, was gemeint war. Danach übernehmen Sie die Bögen als Datensatz.', 'For every open question decide yourself what was meant. Then take over the sheets as a data set.')
      ] },
      { h: P('Wie Statable liest', 'How Statable reads') },
      { ul: [
        P('Vier Eckmarken sagen, wie das Blatt liegt, und rechnen schiefe Scans und Fotos gerade.', 'Four corner marks tell how the sheet lies and straighten crooked scans and photos.'),
        P('Eine Kennleiste am Rand enthält Fragebogen, Fassung, Bogen-Nummer und Seite. So landet jede Seite beim richtigen Bogen, auch wenn die Dateien durcheinander sind.', 'An identification strip at the edge holds the questionnaire, version, sheet number and page. This way every page ends up with the right sheet, even if the files are mixed up.'),
        P('Von jedem Kästchen zählt nur das Innere. Ist es fast leer, gilt es als leer; ist es deutlich dunkel, als angekreuzt; dazwischen ist es unsicher und Sie entscheiden.', 'Only the inside of every box counts. If it is nearly empty it counts as empty; if it is clearly dark, as ticked; in between it is unsure and you decide.'),
        P('Mehrere Kreuze bei einer Frage mit einer Antwort, ein unklares Kästchen oder eine fehlende Seite werden gemeldet und nie still gelöst.', 'Several ticks on a one-answer question, an unclear box or a missing page are reported and never silently resolved.')
      ] },
      { h: P('Wichtige Begriffe', 'Key terms') },
      { ul: [
        P('Eckmarken: Ausgefüllte Quadrate in den Ecken. Daran findet der Leser das Blatt und rechnet Verzerrung heraus.', 'Corner marks: filled squares in the corners. The reader finds the sheet by them and calculates distortion away.'),
        P('Kennleiste: Eine Reihe kleiner Felder, die die Nummer des Bogens und der Seite als Muster schreibt. Sie ist ein Statable-eigener Code, kein QR-Code.', 'Identification strip: a row of small fields that writes the number of the sheet and page as a pattern. It is a code of Statable\'s own, not a QR code.'),
        P('Unsicher: Das Kästchen ist weder klar leer noch klar angekreuzt, zum Beispiel bei einem blassen Kreuz oder einem Fleck.', 'Unsure: the box is neither clearly empty nor clearly ticked, for example with a pale tick or a stain.')
      ] },
      { h: P('Stimmt nicht - so ist es', 'Not true - this is how it is') },
      falsch(P('Statable erkennt auch Handschrift in offenen Antworten.', 'Statable also recognises handwriting in open answers.'),
        P('Gelesen werden nur Kreuze in Kästchen. Offene Antworten und Tabellen bleiben draußen; Statable nennt sie Ihnen, damit Sie sie von Hand eingeben.', 'Only ticks in boxes are read. Open answers and tables stay out; Statable names them so that you can enter them by hand.')),
      falsch(P('Ein erkanntes Kreuz ist sicher richtig.', 'A recognised tick is certainly right.'),
        P('Ein schlechter Scan, ein Fleck oder ein durchscheinendes Kreuz von der Rückseite können täuschen. Prüfen Sie Stichproben gegen das Papier.', 'A poor scan, a stain or a tick showing through from the back can mislead. Check samples against the paper.')),
      { h: P('Grenzen', 'Limits') },
      { ul: [
        P('Höchstens 20 Antworten je Frage und eine begrenzte Zahl Fragen je Seite; mehr Fragen laufen auf weitere Seiten.', 'At most 20 answers per question and a limited number of questions per page; more questions run onto further pages.'),
        P('Es gibt nur Kreuze, keine Handschrift, keine Ziffern von Hand und keine Tabellen.', 'There are only ticks, no handwriting, no handwritten digits and no tables.'),
        P('Statable wurde bisher mit künstlichen Scans (gedreht, verrauscht, verzerrt) geprüft. Prüfen Sie die ersten echten Bögen genau.', 'So far Statable has been tested with artificial scans (rotated, noisy, distorted). Check the first real sheets closely.')
      ] },
      mitnehmen(
        P('Der Antwortbogen hat vier Eckmarken und eine Kennleiste; so findet Statable Blatt, Bogen und Seite.', 'The answer sheet has four corner marks and an identification strip; this is how Statable finds the sheet, the questionnaire and the page.'),
        P('Unklare Kästchen und mehrere Kreuze entscheiden Sie, Statable rät nie.', 'You decide unclear boxes and several ticks; Statable never guesses.'),
        P('Nur Kreuze in Kästchen werden gelesen, offene Antworten tippen Sie ein.', 'Only ticks in boxes are read; you type open answers in.'),
        P('Prüfen Sie Stichproben gegen das Papier.', 'Check samples against the paper.')
      )
    ], ['papierboegen-eingeben', 'fragebogen-planen'])
];
