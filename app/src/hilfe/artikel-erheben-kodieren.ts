/**
 * Hilfe-Artikel zum Kodier-Arbeitsplatz (Erheben, Stufe 6b, Paket 6b3, 09.11.2026): Kodieren (mit „Selbst machen“ und Lösung für die Einheit `kodieren-grundlagen`),
 * Tasten und Screenreader, Memos, Fälle und Fallvariablen. Nur Deutsch und Englisch, jeder Text ein Textpaar P(de, en). Alles in eigenen Worten.
 * Sachlage nach docs/erheben/FACHBLATT-STUFE-6B.md (Abschnitte 3 und 8) und der NVDA-Messung docs/erheben/NVDA-STUFE-6A.md. Die Textstellen und Namen im
 * „Selbst machen“ sind erfunden. Die Knopfnamen stehen so im Fachblatt (Paket 6b1 und 6b2 bauen sie).
 */
import { P } from '../i18n/laufzeit';
import { a, falsch, mitnehmen, type Roh } from './artikel-roh';

export const ROH_ERHEBEN_KODIEREN: Roh[] = [
  // ---------------------------------------------------------------- 1. Kodieren und der Arbeitsplatz
  a('eh-kodieren', 'verstehen', P('Wie ordne ich Textstellen Kategorien zu? (Kodieren, deduktiv und induktiv)', 'How do I assign passages to categories? (coding, deductive and inductive)'),
    P('Kodieren Code Kategorie Codebaum Kodiereinheit Textstelle Segment deduktiv induktiv Kodier-Arbeitsplatz Ansicht Text Sätze Code-Leiste Schnellleiste Ziffern Belege Rückgängig qualitative Inhaltsanalyse Interview Auswertung', 'coding code category code tree coding unit passage segment deductive inductive coding workspace view text sentences code bar quick bar digits evidence undo qualitative content analysis interview analysis'),
    [
      { h: P('Kurz', 'In brief') },
      P('Kodieren heißt: Sie geben einer Textstelle einen Code (eine Kategorie), zum Beispiel „Belastung“. Alles wird im Projekt gespeichert.', 'Coding means: you give a passage of text a code (a category), for example “Strain”. Everything is saved in the project.'),
      { h: P('Was ist das?', 'What is it?') },
      P('Beim Kodieren lesen Sie einen Text, etwa ein Interview, und ordnen Stellen Codes zu. Ein Code ist ein kurzer Name für ein Thema. Eine Kategorie ist ein Code mit Definition und Regeln. Eine Kodiereinheit ist die Stelle, die einen Code bekommt, zum Beispiel ein Satz. Am Ende sehen Sie zu jedem Code alle Stellen, die dazu gehören (die Belege).', 'When coding, you read a text, for example an interview, and assign codes to passages. A code is a short name for a topic. A category is a code with a definition and rules. A coding unit is the passage that receives a code, for example a sentence. At the end you see, for every code, all the passages that belong to it (the evidence).'),
      P('Deduktiv heißt: Die Codes stehen vorher fest, aus einer Theorie oder einem Leitfaden. Induktiv heißt: Die Codes entstehen beim Lesen aus dem Material. Meist mischt man beides: Man beginnt mit einem Leitfaden und ergänzt neue Codes, wenn eine Stelle nicht passt.', 'Deductive means: the codes are fixed beforehand, from a theory or a guide. Inductive means: the codes arise from the material while reading. Usually both are mixed: you start with a guide and add new codes when a passage does not fit.'),
      { h: P('Selbst machen', 'Do it yourself') },
      P('Ein kleiner Kodierleitfaden (erfunden) hat drei Codes: „Planung“ (jemand teilt Aufgaben oder Zeit ein), „Zeitdruck“ (das Gefühl, zu wenig Zeit zu haben) und „Unterstützung“ (Hilfe durch andere). Ordnen Sie die zehn erfundenen Textstellen auf Papier oder im Kopf zu. Eine Stelle kann mehrere Codes tragen, und eine Stelle kann zu keinem Code passen. Bilden Sie dafür aus dem Material eine neue Kategorie mit einer kurzen Definition. Lesen Sie erst danach die Lösung.', 'A small coding guide (invented) has three codes: “Planning” (someone organises tasks or time), “Time pressure” (the feeling of having too little time) and “Support” (help from others). Assign the ten invented passages on paper or in your head. A passage can carry several codes, and a passage may fit no code. For that, form a new category from the material with a short definition. Read the solution only afterwards.'),
      { ol: [
        P('„Jeden Sonntag schreibe ich auf, was in der Woche ansteht.“', '“Every Sunday I write down what is coming up in the week.”'),
        P('„Vor der Klausur hatte ich einfach nicht genug Tage.“', '“Before the exam I simply did not have enough days.”'),
        P('„Meine Lerngruppe erklärt mir, was ich nicht verstanden habe.“', '“My study group explains to me what I did not understand.”'),
        P('„Ich plane die Woche und merke trotzdem, dass die Zeit nicht reicht.“', '“I plan the week and still notice that time is not enough.”'),
        P('„Die Dozentin hat mir einen Termin außer der Reihe gegeben.“', '“The lecturer gave me an appointment outside the usual hours.”'),
        P('„Nach dem Nebenjob bleibt mir kaum Energie zum Lernen.“', '“After my side job there is hardly any energy left for studying.”'),
        P('„Ich teile mir den Lernstoff in kleine Päckchen ein.“', '“I divide the study material into small packages.”'),
        P('„Ich weiß nie, wie ich das alles bis Freitag schaffen soll.“', '“I never know how I am supposed to manage all this by Friday.”'),
        P('„Mein Bruder hört mir zu, wenn ich Stress habe.“', '“My brother listens to me when I am stressed.”'),
        P('„Manchmal bin ich nach der Arbeit so müde, dass ich gleich einschlafe.“', '“Sometimes I am so tired after work that I fall asleep straight away.”')
      ] },
      { h: P('Lösung', 'Solution') },
      { tabelle: { kopf: [P('Textstelle', 'Passage'), P('Code oder Codes', 'Code or codes'), P('Warum', 'Why')], zeilen: [
        ['1', P('Planung', 'Planning'), P('Die Person teilt ihre Woche ein.', 'The person organises the week.')],
        ['2', P('Zeitdruck', 'Time pressure'), P('Zu wenig Zeit, aber kein Einteilen.', 'Too little time, but no organising.')],
        ['3', P('Unterstützung', 'Support'), P('Hilfe durch die Lerngruppe.', 'Help from the study group.')],
        ['4', P('Planung und Zeitdruck', 'Planning and Time pressure'), P('Eine Stelle, zwei Codes: Sie plant und hat doch zu wenig Zeit.', 'One passage, two codes: she plans and still has too little time.')],
        ['5', P('Unterstützung', 'Support'), P('Hilfe durch die Dozentin.', 'Help from the lecturer.')],
        ['6', P('neu: Erschöpfung', 'new: Exhaustion'), P('Passt zu keinem der drei Codes. Vorschlag für die Definition: „Körperliche oder geistige Müdigkeit, die das Lernen einschränkt.“', 'Fits none of the three codes. Suggested definition: “Physical or mental tiredness that limits studying.”')],
        ['7', P('Planung', 'Planning'), P('Die Person teilt den Stoff ein.', 'The person divides up the material.')],
        ['8', P('Zeitdruck', 'Time pressure'), P('Gefühl, nicht genug Zeit zu haben.', 'Feeling of not having enough time.')],
        ['9', P('Unterstützung', 'Support'), P('Hilfe durch Zuhören. Stress ist hier nicht Zeitdruck: Die Stelle sagt nichts über zu wenig Zeit.', 'Help through listening. Stress is not time pressure here: the passage says nothing about too little time.')],
        ['10', P('neu: Erschöpfung', 'new: Exhaustion'), P('Passt zur neuen Kategorie aus Stelle 6. Die Einteilung von Stelle 6 und 10 zeigt, dass die neue Kategorie trägt.', 'Fits the new category from passage 6. Passages 6 and 10 together show that the new category holds.')]
      ] } },
      P('Wenn Sie an einigen Stellen anders entschieden haben, ist das normal. Genau dafür gibt es eine Definition und Kodierregeln im Kodierleitfaden: Sie helfen, dass verschiedene Personen gleich kodieren.', 'If you decided differently on some passages, that is normal. That is exactly why a coding guide has definitions and coding rules: they help different people to code in the same way.'),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      P('Öffnen Sie die Seite „Kodieren“ (#kodieren). Im Beispielprojekt liegen erfundene Interviews bereit. Links stehen die Dokumente und der Codebaum, in der Mitte der Text, rechts die Code-Leiste, die Belege und die Memos.', 'Open the page “Coding” (#kodieren). The example project contains invented interviews. On the left are the documents and the code tree, in the middle the text, on the right the code bar, the evidence and the memos.'),
      { ol: [
        P('Wählen Sie oben die Ansicht. „Text“: Sie markieren frei mit der Maus oder mit Umschalt und Pfeiltasten, S markiert einen Satz, A einen Absatz. „Sätze“: Sie sehen eine Liste der Sätze und wählen einen oder mehrere. Wer lieber Satz für Satz kodiert, nimmt die Ansicht „Sätze“. Der Wechsel behält die Stelle.', 'Choose the view at the top. “Text”: you mark freely with the mouse or with Shift and arrow keys, S marks a sentence, A a paragraph. “Sentences”: you see a list of the sentences and choose one or several. If you prefer to code sentence by sentence, take the view “Sentences”. Switching keeps the passage.'),
        P('Geben Sie der markierten Stelle einen Code. Der schnellste Weg sind die Ziffern 1 bis 9: Sie geben den Code auf diesem Platz der Schnellleiste. Sonst drücken Sie Enter, tippen in der Code-Leiste einen Teil des Namens, wählen den Code mit den Pfeiltasten und drücken Enter. Gibt es den Code noch nicht, bietet die Leiste „Neuer Code“ an.', 'Give the marked passage a code. The fastest way is the digits 1 to 9: they give the code at that place of the quick bar. Otherwise press Enter, type part of the name in the code bar, choose the code with the arrow keys and press Enter. If the code does not exist yet, the bar offers “New code”.'),
        P('Mit I hören oder sehen Sie, welche Codes an der Stelle schon stehen. Der Knopf „Rückgängig“ (oder Strg+Z) nimmt die letzten Schritte zurück.', 'With I you hear or see which codes are already on the passage. The button “Undo” (or Ctrl+Z) takes back the last steps.'),
        P('Im Codebaum ordnen Sie die Codes in Ebenen, geben Definitionen und Farben und legen fest, welche Codes in der Schnellleiste liegen. Zu jedem Code zeigen die Belege alle Stellen, auf Wunsch mit Untercodes und gefiltert nach Fallvariablen.', 'In the code tree you order the codes in levels, add definitions and colours and decide which codes sit in the quick bar. For every code, the evidence shows all passages, if you wish with sub-codes and filtered by case variables.')
      ] },
      { h: P('Weitere Dokumente', 'More documents') },
      P('Unter „Dokument hinzufügen“ lesen Sie Text-, Word- und PDF-Dateien ein oder fügen Text ein. Der Text wird einmal eingelesen und danach nicht mehr verändert, damit die Stellen an ihrem Platz bleiben. Gescannte PDFs ohne Textebene kann Statable nicht lesen. Interviews mit Sprechern und Zeitmarken lesen Sie über die Seite „Interviews“ ein.', 'Under “Add a document” you read in text, Word and PDF files or paste text. The text is read in once and not changed afterwards so that the passages stay in place. Statable cannot read scanned PDFs without a text layer. Interviews with speakers and time marks are read in on the page “Interviews”.'),
      P('Kodierungen anderer Personen ändern Sie über den Konsens auf der Seite „Interviews“.', 'Codings by other people are changed through the consensus on the page “Interviews”.'),
      { h: P('Stimmt nicht - so ist es', 'Not true - this is how it is') },
      falsch(P('Mit mehr Codes wird die Auswertung genauer.', 'With more codes the analysis becomes more precise.'),
        P('Zu viele Codes machen das Kodieren unübersichtlich und die Übereinstimmung schlechter. Besser mit wenigen Codes beginnen, mit Definitionen, und bei Bedarf verfeinern.', 'Too many codes make coding confusing and agreement worse. It is better to start with a few codes, with definitions, and refine when needed.')),
      mitnehmen(
        P('Kodieren heißt, Textstellen Codes zu geben. Deduktiv: Die Codes stehen vorher fest. Induktiv: Sie entstehen aus dem Material.', 'Coding means giving passages of text codes. Deductive: the codes are fixed beforehand. Inductive: they arise from the material.'),
        P('Eine Stelle kann mehrere Codes tragen oder keinen passenden haben. Dann ergänzen Sie eine Kategorie mit Definition.', 'A passage can carry several codes or have no fitting one. Then you add a category with a definition.'),
        P('In Statable geben die Ziffern 1 bis 9 die Codes der Schnellleiste; I nennt die Codes an einer Stelle; Rückgängig nimmt Schritte zurück.', 'In Statable the digits 1 to 9 give the codes of the quick bar; I names the codes on a passage; Undo takes steps back.'),
        P('Der Text bleibt nach dem Einlesen unverändert, damit die Stellen an ihrem Platz bleiben.', 'The text stays unchanged after reading in so that the passages stay in place.')
      )
    ], ['eh-kodieren-tasten', 'eh-memos', 'eh-fallvariablen', 'eh-kodierleitfaden', 'eh-kodieren-ansichten']),

  // ---------------------------------------------------------------- 2. Tasten und Screenreader
  a('eh-kodieren-tasten', 'verstehen', P('Welche Tasten gibt es zum Kodieren? (Tastenhilfe, Screenreader, Ansichten)', 'Which keys are there for coding? (key help, screen reader, views)'),
    P('Tasten Tastatur Kürzel Screenreader NVDA JAWS VoiceOver Lesemodus Fokusmodus Esc Entf Ziffern Schnellleiste Code-Leiste Ansicht Text Sätze Kodieren ohne Maus barrierefrei', 'keys keyboard shortcuts screen reader NVDA JAWS VoiceOver browse mode focus mode Esc Delete digits quick bar code bar view text sentences coding without mouse accessible'),
    [
      { h: P('Kurz', 'In brief') },
      P('Der Kodier-Arbeitsplatz lässt sich ganz mit der Tastatur bedienen, auch mit Screenreader. Er hat zwei Ansichten, „Text“ und „Sätze“. Wer lieber Satz für Satz kodiert, nimmt „Sätze“.', 'The coding workspace can be operated entirely with the keyboard, also with a screen reader. It has two views, “Text” and “Sentences”. If you prefer to code sentence by sentence, take “Sentences”.'),
      { h: P('Was ist das?', 'What is it?') },
      P('Ein Screenreader ist ein Programm, das Bildschirminhalt vorliest oder auf einer Braillezeile zeigt, zum Beispiel NVDA, JAWS oder VoiceOver. Es hat meist zwei Betriebsarten: Im Lesemodus (NVDA) steuern die Tasten das Programm selbst, im Fokusmodus gehen sie an die Seite. Im Textfeld und in der Satzliste schaltet NVDA von selbst in den Fokusmodus; die Tasten unten wirken dann.', 'A screen reader is a program that reads the screen aloud or shows it on a braille display, for example NVDA, JAWS or VoiceOver. It usually has two modes: in browse mode (NVDA) the keys control the program itself, in focus mode they go to the page. In the text field and in the sentence list NVDA switches to focus mode by itself; the keys below then work.'),
      { h: P('Tasten in der Ansicht „Text“ und in der Ansicht „Sätze“', 'Keys in the view “Text” and the view “Sentences”') },
      { tabelle: { kopf: [P('Taste', 'Key'), P('Ansicht „Text“', 'View “Text”'), P('Ansicht „Sätze“', 'View “Sentences”')], zeilen: [
        [P('Pfeiltasten', 'Arrow keys'), P('Lesen und Schreibmarke bewegen', 'Read and move the cursor'), P('Satz davor oder danach', 'Sentence before or after')],
        [P('Umschalt+Pfeil', 'Shift+arrow'), P('Textstelle markieren', 'Mark a passage'), P('Sätze zur Auswahl hinzufügen', 'Add sentences to the selection')],
        [P('Leertaste', 'Space bar'), P('-', '-'), P('Satz wählen oder abwählen', 'Select or deselect a sentence')],
        [P('S und A', 'S and A'), P('Satz oder Absatz markieren, noch einmal drücken: nächsten dazu', 'Mark a sentence or paragraph, press again: add the next one'), P('-', '-')],
        [P('Enter oder K', 'Enter or K'), P('Code-Leiste öffnen für die markierte Stelle', 'Go to the code bar for the marked passage'), P('Code-Leiste öffnen für die gewählten Sätze', 'Go to the code bar for the chosen sentences')],
        [P('1 bis 9', '1 to 9'), P('Code dieses Platzes der Schnellleiste geben', 'Give the code at this place of the quick bar'), P('Code dieses Platzes geben', 'Give the code at this place')],
        [P('I', 'I'), P('Codes an der Stelle ansagen', 'Announce the codes on the passage'), P('Codes am Satz ansagen', 'Announce the codes on the sentence')],
        [P('M', 'M'), P('Memo zur Stelle schreiben', 'Write a memo on the passage'), P('Memo zu den Sätzen schreiben', 'Write a memo on the sentences')],
        [P('Strg+Z (Mac: Cmd+Z)', 'Ctrl+Z (Mac: Cmd+Z)'), P('Rückgängig', 'Undo'), P('Rückgängig', 'Undo')],
        [P('Entf', 'Delete'), P('-', '-'), P('Auswahl aufheben', 'Clear the selection')],
        [P('Esc', 'Esc'), P('Markierung aufheben', 'Clear the marking'), P('Auswahl aufheben', 'Clear the selection')]
      ] } },
      { h: P('Code-Leiste und Codebaum', 'Code bar and code tree') },
      { tabelle: { kopf: [P('Taste', 'Key'), P('Wirkung', 'Effect')], zeilen: [
        [P('Tippen', 'Typing'), P('Die Liste der Codes filtert nach Teilen des Namens.', 'The list of codes filters by parts of the name.')],
        [P('Pfeil ab, Pfeil auf', 'Arrow down, arrow up'), P('Code in der Liste wählen', 'Choose a code in the list')],
        [P('Enter', 'Enter'), P('Code geben und zurück in den Text oder die Satzliste', 'Give the code and return to the text or the sentence list')],
        [P('Umschalt+Tab', 'Shift+Tab'), P('Zurück in den Text, ohne Code zu geben', 'Back to the text without giving a code')],
        [P('Pfeile im Codebaum', 'Arrows in the code tree'), P('Auf und ab, rechts aufklappen, links zuklappen', 'Up and down, right opens, left closes')],
        [P('Enter oder F2 im Codebaum', 'Enter or F2 in the code tree'), P('Code bearbeiten: Name, Farbe, Definition', 'Edit the code: name, colour, definition')]
      ] } },
      { h: P('Hinweise für Screenreader', 'Notes for screen readers') },
      { ul: [
        P('Im Lesemodus von NVDA müssen Sie zuerst in das Textfeld oder die Satzliste springen (Enter oder Tab auf das Feld). Dann stellt NVDA auf den Fokusmodus um, und die Tasten oben wirken.', 'In NVDA browse mode you first have to go into the text field or the sentence list (Enter or Tab onto the field). NVDA then switches to focus mode and the keys above work.'),
        P('Esc schaltet bei NVDA in den Lesemodus zurück. Darum hebt Entf die Auswahl auf, und Esc ist nie der einzige Weg.', 'In NVDA, Esc switches back to browse mode. That is why Delete clears the selection, and Esc is never the only way.'),
        P('Mit VoiceOver am Mac bewegen Sie sich mit VO+Pfeiltasten durch die Seite; in der Satzliste und im Textfeld gelten die Tasten oben.', 'With VoiceOver on the Mac you move through the page with VO+arrow keys; in the sentence list and in the text field the keys above apply.'),
        P('Auf einer Braillezeile stehen die Texte in der Kurzform, gesprochen wird der lange Name.', 'On a braille display the texts appear in short form, the long name is spoken.')
      ] },
      { h: P('Stimmt nicht - so ist es', 'Not true - this is how it is') },
      falsch(P('Wer mit Screenreader arbeitet, muss die Maus für das Kodieren benutzen.', 'Anyone using a screen reader has to use the mouse for coding.'),
        P('Jeder Schritt geht mit der Tastatur: markieren, Code geben, Codes ansagen, Memo schreiben, Rückgängig. Die Ansicht „Sätze“ ist für das Kodieren Satz für Satz gebaut.', 'Every step works with the keyboard: marking, giving a code, announcing codes, writing a memo, undo. The view “Sentences” is built for coding sentence by sentence.')),
      mitnehmen(
        P('Zwei Ansichten: „Text“ zum freien Markieren, „Sätze“ zum Kodieren Satz für Satz.', 'Two views: “Text” for free marking, “Sentences” for coding sentence by sentence.'),
        P('Ziffern 1 bis 9 geben die Codes der Schnellleiste, Enter öffnet die Code-Leiste, I nennt die Codes, M öffnet ein Memo.', 'Digits 1 to 9 give the codes of the quick bar, Enter opens the code bar, I names the codes, M opens a memo.'),
        P('Bei NVDA schaltet Esc in den Lesemodus zurück, darum hebt Entf die Auswahl auf.', 'In NVDA, Esc switches back to browse mode, so Delete clears the selection.')
      )
    ], ['eh-kodieren', 'eh-memos']),

  // ---------------------------------------------------------------- 3. Memos
  a('eh-memos', 'verstehen', P('Wohin mit meinen Gedanken beim Kodieren? (Memos)', 'Where do my thoughts go while coding? (memos)'),
    P('Memo Memos Notiz Notizen Analysenotiz Gedanken Idee Zweifel Stelle Dokument Code Fall Projekt Kodieren Kodier-Arbeitsplatz Grounded Theory Auswertung', 'memo memos note notes analytic memo thoughts idea doubt passage document code case project coding coding workspace grounded theory analysis'),
    [
      { h: P('Kurz', 'In brief') },
      P('Ein Memo ist eine eigene Notiz zu einer Textstelle, einem Dokument, einem Code, einem Fall oder dem ganzen Projekt. Es verändert weder den Text noch die Codes.', 'A memo is your own note on a passage, a document, a code, a case or the whole project. It changes neither the text nor the codes.'),
      { h: P('Was ist das?', 'What is it?') },
      P('Beim Kodieren fallen Ihnen Dinge auf: eine Frage, eine Idee, ein Zweifel, ein Zusammenhang. Solche Gedanken gehen leicht verloren. Ein Memo hält sie fest und gehört zur Auswertung. Es ist reiner Text ohne Formatierung.', 'While coding, you notice things: a question, an idea, a doubt, a connection. Such thoughts are easily lost. A memo records them and is part of the analysis. It is plain text without formatting.'),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      { ol: [
        P('Markieren Sie eine Stelle und drücken Sie M. Der Fokus springt in das Feld „Memo“, der Bezug „Textstelle“ ist schon gewählt.', 'Mark a passage and press M. The focus jumps to the field “Memo”, the reference “Passage” is already chosen.'),
        P('Schreiben Sie den Text, optional mit Titel, und wählen Sie „Memo speichern“. Der Fokus kehrt an die Stelle zurück, und Statable sagt „Memo gespeichert“.', 'Write the text, optionally with a title, and choose “Save memo”. The focus returns to the passage and Statable says “Memo saved”.'),
        P('Im Bereich „Memos“ stehen die Memos der Stelle, des Dokuments, des aktiven Codes und des Projekts in Gruppen. Mit „Bearbeiten“ ändern Sie ein Memo, mit „Löschen“ entfernen Sie es nach einer Rückfrage.', 'In the section “Memos” the memos of the passage, the document, the active code and the project are listed in groups. With “Edit” you change a memo, with “Delete” you remove it after a confirmation.'),
        P('Mit I hören Sie an einer Stelle auch, wie viele Memos an ihr hängen.', 'With I you also hear on a passage how many memos are attached to it.')
      ] },
      P('Ein Memo mit Namen oder Hinweisen auf Personen ist selbst ein Datum und muss so geschützt werden wie der Text. Beim Pseudonymisieren auf der Seite „Interviews“ wird es daher mitbedacht.', 'A memo with names or hints about people is data itself and must be protected like the text. It is therefore taken into account when pseudonymising on the page “Interviews”.'),
      { h: P('Stimmt nicht - so ist es', 'Not true - this is how it is') },
      falsch(P('Eine Überlegung zu einer Stelle schreibe ich am besten als eigenen Code.', 'I had better write a thought about a passage as a code of its own.'),
        P('Ein Code, der eine Überlegung trägt, würde in den Belegen und Zählungen wie ein Thema erscheinen. Überlegungen gehören in ein Memo.', 'A code that carries a thought would appear like a topic in the evidence lists and counts. Thoughts belong in a memo.')),
      mitnehmen(
        P('Ein Memo ist eine eigene Notiz zu Stelle, Dokument, Code, Fall oder Projekt.', 'A memo is your own note on a passage, document, code, case or project.'),
        P('Memos verändern weder Text noch Codes und gehören zur Auswertung.', 'Memos change neither text nor codes and are part of the analysis.'),
        P('In Statable öffnet M ein Memo zur markierten Stelle.', 'In Statable M opens a memo on the marked passage.')
      )
    ], ['eh-kodieren', 'eh-kodieren-tasten', 'eh-pseudonymisieren']),

  // ---------------------------------------------------------------- 4. Fälle und Fallvariablen
  a('eh-fallvariablen', 'verstehen', P('Wie unterscheide ich die Personen, deren Texte ich kodiere? (Fälle und Fallvariablen)', 'How do I tell apart the people whose texts I code? (cases and case variables)'),
    P('Fall Fälle Fallvariable Fallvariablen Variable Attribut Merkmal Alter Studienfach Semester Dokument zuordnen Belege filtern Gruppen Mixed Methods Kodieren Kodier-Arbeitsplatz', 'case cases case variable case variables variable attribute characteristic age field of study semester assign document filter evidence groups mixed methods coding coding workspace'),
    [
      { h: P('Kurz', 'In brief') },
      P('Fallvariablen sind Angaben zu einer Person oder einem Fall, zum Beispiel Alter oder Studienfach. Damit können Sie Belege filtern und später Zahlen und Texte verbinden.', 'Case variables are facts about a person or a case, for example age or field of study. With them you can filter evidence and later link numbers and texts.'),
      { h: P('Was ist das?', 'What is it?') },
      P('Ein Fall ist eine Einheit der Untersuchung, meist eine Person. Zu einem Fall können ein oder mehrere Dokumente gehören, etwa zwei Interviews mit derselben Person. Eine Fallvariable ist ein Merkmal des Falls, das für alle Fälle gleich erhoben wird, zum Beispiel „Semester“. Sie hängt am Fall und nicht an einer Textstelle.', 'A case is a unit of the investigation, usually a person. One or more documents can belong to a case, for example two interviews with the same person. A case variable is a characteristic of the case that is recorded in the same way for all cases, for example “semester”. It belongs to the case and not to a passage.'),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      { ol: [
        P('Wählen Sie im Kopf der Seite „Kodieren“ bei „Fall dieses Dokuments“ einen Fall, oder legen Sie mit „Neuer Fall“ einen an.', 'In the header of the page “Coding”, choose a case under “Case of this document”, or create one with “New case”.'),
        P('Legen Sie mit „Neue Variable“ eine Fallvariable an. Sie geben einen Namen und einen Typ: „Text“, „Ja/Nein“, „Ganze Zahl“, „Zahl“ oder „Datum“.', 'Create a case variable with “New variable”. You give a name and a type: “Text”, “Yes/No”, “Whole number”, “Number” or “Date”.'),
        P('Tragen Sie die Werte in der Tabelle „Fälle“ ein: eine Zeile je Fall, eine Spalte je Variable. Statable prüft jeden Wert beim Verlassen des Feldes und nennt bei einem Fehler einen Satz, zum Beispiel „Bitte eine ganze Zahl eingeben, zum Beispiel 3.“', 'Enter the values in the table “Cases”: one row per case, one column per variable. Statable checks every value when you leave the field and in case of an error gives a sentence, for example “Please enter a whole number, for example 3.”'),
        P('In den Belegen zu einem Code können Sie nun nach den Werten filtern, zum Beispiel nur Stellen von Personen im fünften Semester zeigen. Mehrere Bedingungen gelten zugleich (und).', 'In the evidence for a code you can now filter by the values, for example show only passages from people in their fifth semester. Several conditions apply together (and).')
      ] },
      P('Die Werte tragen Sie selbst ein; Statable liest sie nicht aus dem Text. Mit sehr wenigen Fällen sind Vergleiche zwischen Gruppen nur Hinweise, keine Beweise.', 'You enter the values yourself; Statable does not read them from the text. With very few cases, comparisons between groups are only hints, not proof.'),
      { h: P('Stimmt nicht - so ist es', 'Not true - this is how it is') },
      falsch(P('Eine Fallvariable wird jeder Textstelle als Code angehängt.', 'A case variable is attached to every passage as a code.'),
        P('Eine Fallvariable gehört zum Fall. Sie verändert weder Text noch Codes und dient zum Filtern und Verbinden.', 'A case variable belongs to the case. It changes neither text nor codes and serves for filtering and linking.')),
      mitnehmen(
        P('Ein Fall ist meist eine Person; zu ihm können mehrere Dokumente gehören.', 'A case is usually a person; several documents can belong to it.'),
        P('Eine Fallvariable ist ein Merkmal des Falls, zum Beispiel Alter oder Semester.', 'A case variable is a characteristic of the case, for example age or semester.'),
        P('Mit Fallvariablen filtern Sie die Belege eines Codes nach Gruppen.', 'With case variables you filter the evidence for a code by groups.')
      )
    ], ['eh-kodieren', 'eh-faelle-interviews', 'eh-fall-code-matrix']),

  // ---------------------------------------------------------------- 5. Auswerten: Ansichten, Fall-Kategorie-Matrix, ähnliche Stellen (Stufe 6c, Paket 6c3, 11.11.2026)
  // Knopf- und Ansichtsnamen stehen so im Fachblatt (docs/erheben/FACHBLATT-STUFE-6C.md, Abschnitt 3); Paket 6c2 baut sie. Quellen: Gale u. a. 2013 (Framework-Methode), Mayring 2014. Alles in eigenen Worten.
  a('eh-kodieren-ansichten', 'verstehen', P('Kodierte Texte auswerten (Ansichten im Kodier-Arbeitsplatz)', 'Analysing coded texts (views in the coding workspace)'),
    P('Auswerten Ansichten Dokument-Übersicht Fall-Kategorie-Matrix Code-Matrix Code-Landkarte ähnliche Stellen Kodieren Kodier-Arbeitsplatz Absatz Belege Fälle Codes Jaccard MDS Landkarte Überblick qualitative Inhaltsanalyse', 'analysing views document overview case-by-category matrix code matrix code map similar passages coding coding workspace paragraph evidence cases codes Jaccard MDS map overview qualitative content analysis'),
    [
      { h: P('Kurz', 'In brief') },
      P('Im Bereich „Auswerten“ der Seite „Kodieren“ sehen Sie Ihre Kodierungen aus fünf Blickwinkeln. Die Ansichten werden aus dem Projekt berechnet und nicht getrennt gespeichert. Nur die Zusammenfassungen in der Fall-Kategorie-Matrix schreiben Sie selbst.', 'In the section “Analysis” of the page “Coding” you see your codings from five points of view. The views are calculated from the project and not saved separately. Only the summaries in the case-by-category matrix are written by you.'),
      { h: P('Was ist das?', 'What is it?') },
      P('Nach dem Kodieren liegen viele einzelne Stellen vor. Die Ansichten helfen, daraus ein Bild zu machen. Jede beantwortet eine Alltagsfrage. Die Ansichten zeigen, was kodiert wurde. Was es bedeutet, entscheiden Sie.', 'After coding there are many single passages. The views help to turn them into a picture. Each one answers an everyday question. The views show what was coded. What it means, you decide.'),
      { h: P('Die fünf Ansichten', 'The five views') },
      { tabelle: { kopf: [P('Frage (Fachbegriff)', 'Question (technical term)'), P('Was die Ansicht zeigt', 'What the view shows')], zeilen: [
        [P('Was ist wo kodiert? (Dokument-Übersicht)', 'What is coded where? (document overview)'), P('Zu einem Dokument je Absatz die vergebenen Codes. Ein Knopf springt zum Absatz im Text.', 'For one document, per paragraph the codes given. A button jumps to the paragraph in the text.')],
        [P('Was sagt jeder Fall zu jedem Thema? (Fall-Kategorie-Matrix)', 'What does each case say on each topic? (case-by-category matrix)'), P('Eine Tabelle: Zeile je Fall, Spalte je Code. In der Zelle stehen Ihre Zusammenfassung und die Belege. Mehr dazu im Artikel „Fälle und Themen vergleichen“.', 'A table: one row per case, one column per code. The cell holds your summary and the evidence. More in the article “Comparing cases and topics”.')],
        [P('Wie oft kommt welcher Code vor? (Code-Matrix)', 'How often does each code occur? (code matrix)'), P('Zahlen statt Text: wie oft ein Code bei einem Fall vorkommt. Das ist die Fall-Code-Matrix, wie im Artikel „Wie oft kommt welcher Code vor?“ beschrieben.', 'Numbers instead of text: how often a code occurs for a case. This is the case-code matrix as described in the article “How often does which code occur?”.')],
        [P('Welche Codes kommen zusammen vor? (Code-Landkarte)', 'Which codes occur together? (code map)'), P('Ein Bild, in dem jeder Code ein Punkt ist. Codes, die in denselben Dokumenten stehen, liegen nahe beieinander.', 'A picture in which every code is a point. Codes that appear in the same documents lie close together.')],
        [P('Wo steht noch etwas Ähnliches? (ähnliche Stellen)', 'Where is there something similar? (similar passages)'), P('Zu einer gewählten Stelle Sätze mit ähnlichen Wörtern. Mehr dazu im Artikel „Ähnliche Stellen finden“.', 'For a chosen passage, sentences with similar words. More in the article “Finding similar passages”.')]
      ] } },
      { h: P('So geht es in Statable', 'How it works in Statable') },
      { ol: [
        P('Öffnen Sie die Seite „Kodieren“ (#kodieren) und gehen Sie zum Abschnitt „Auswerten (Ansichten)“. Im Beispielprojekt sind erfundene Interviews schon kodiert.', 'Open the page “Coding” (#kodieren) and go to the section “Analysis (views)”. In the example project, invented interviews are already coded.'),
        P('Wählen Sie in der Gruppe „Ansicht“ eine der fünf Antworten. Mit den Pfeiltasten wechseln Sie die Ansicht. Wo es sinnvoll ist, wählen Sie darunter „Alle“ oder eine kodierende Person.', 'In the group “View” choose one of the five answers. With the arrow keys you switch the view. Where it makes sense, choose “All” or one coding person underneath.'),
        P('In der Dokument-Übersicht wählen Sie einen Eintrag wie „Absatz 2: Lernen, Angst, Weg, Familie (3 Stellen)“. Statable springt zum Absatz im Text. Der Schalter „Auch Absätze ohne Code zeigen“ blendet die übrigen Absätze ein.', 'In the document overview you choose an entry such as “Paragraph 2: Learning, Fear, Way, Family (3 passages)”. Statable jumps to the paragraph in the text. The switch “Also show paragraphs without a code” shows the other paragraphs.'),
        P('Für die Code-Landkarte wählen Sie „Landkarte zeichnen“. Neben dem Bild stehen eine Beschreibung und eine Tabelle der Abstände, damit Sie nichts allein aus dem Bild lesen müssen.', 'For the code map choose “Draw map”. Next to the picture are a description and a table of the distances so that you do not have to read anything from the picture alone.')
      ] },
      { h: P('Die Code-Landkarte richtig lesen', 'Reading the code map correctly') },
      P('Für jeden Code wird die Menge der Dokumente bestimmt, in denen er vorkommt. Der Abstand zweier Codes ist der Jaccard-Abstand: eins minus der Anteil der Dokumente, in denen beide vorkommen, an allen Dokumenten, in denen mindestens einer vorkommt. Ein Verfahren der mehrdimensionalen Skalierung (MDS) zeichnet daraus die Punkte. Es ist dasselbe Verfahren wie bei der Karte der Fragen.', 'For each code the set of documents in which it occurs is determined. The distance between two codes is the Jaccard distance: one minus the share of documents in which both occur among all documents in which at least one occurs. A method of multidimensional scaling (MDS) draws the points from this. It is the same method as in the map of the questions.'),
      { ul: [
        P('Codes, die oft in denselben Dokumenten vorkommen, liegen nahe beieinander.', 'Codes that often occur in the same documents lie close together.'),
        P('Nur die Lage zueinander zählt. Die Achsen bedeuten nichts, und das Bild darf gedreht oder gespiegelt sein.', 'Only the position relative to each other counts. The axes mean nothing, and the picture may be rotated or mirrored.'),
        P('Gemeinsames Vorkommen heißt nicht, dass die Themen zusammenhängen. Es kann auch daran liegen, dass wenige, lange Interviews viele Codes tragen.', 'Occurring together does not mean the topics are related. It can also be because a few long interviews carry many codes.'),
        P('Die Anpassungsgüte (GOF) sagt, wie viel der Abstände das Bild wiedergibt. Bei einem niedrigen Wert geben die Punkte die Abstände nur grob wieder; die Tabelle ist dann verlässlicher.', 'The goodness of fit (GOF) says how much of the distances the picture reproduces. With a low value the points reproduce the distances only roughly; the table is then more reliable.'),
        P('Codes ohne Beleg stehen nicht im Bild und werden in einem Satz genannt. Mit weniger als 3 Codes gibt es kein Bild.', 'Codes without evidence are not in the picture and are named in a sentence. With fewer than 3 codes there is no picture.')
      ] },
      P('Mehr zum Verfahren steht im Artikel „Karte der Fragen (mehrdimensionale Skalierung, MDS)“.', 'More about the method is in the article “Map of the questions (multidimensional scaling, MDS)”.'),
      { h: P('Stimmt nicht - so ist es', 'Not true - this is how it is') },
      falsch(P('Statable wertet die Interviews aus und sagt mir, was die Befragten meinen.', 'Statable analyses the interviews and tells me what the interviewees mean.'),
        P('Statable ordnet und zeigt nur. Es kodiert nie selbst, schlägt keine Codes vor und schreibt keine Zusammenfassungen. Die Deutung bleibt bei Ihnen.', 'Statable only orders and shows. It never codes by itself, suggests no codes and writes no summaries. The interpretation stays with you.')),
      mitnehmen(
        P('Der Bereich „Auswerten“ hat fünf Ansichten: Dokument-Übersicht, Fall-Kategorie-Matrix, Code-Matrix, Code-Landkarte und ähnliche Stellen.', 'The section “Analysis” has five views: document overview, case-by-category matrix, code matrix, code map and similar passages.'),
        P('Alle Ansichten werden aus dem Projekt berechnet. Nur die Zusammenfassungen der Matrix schreiben Sie selbst.', 'All views are calculated from the project. Only the summaries of the matrix are written by you.'),
        P('In der Code-Landkarte zählt nur die Lage zueinander; gemeinsames Vorkommen ist kein Beleg für einen Zusammenhang.', 'In the code map only the position relative to each other counts; occurring together is no evidence of a relationship.')
      )
    ], ['eh-kodieren', 'eh-fall-kategorie-matrix', 'eh-aehnliche-stellen', 'eh-fall-code-matrix', 'karte-der-fragen-mds']),

  a('eh-fall-kategorie-matrix', 'verstehen', P('Fälle und Themen vergleichen (Fall-Kategorie-Matrix, Framework-Analyse)', 'Comparing cases and topics (case-by-category matrix, framework analysis)'),
    P('Fall-Kategorie-Matrix Framework-Analyse Framework-Methode Charting Zusammenfassung Fall Kategorie Code Beleg Zelle Matrix Gale Ritchie Spencer Inhaltsanalyse qualitative Auswertung Interviews vergleichen Word Deuten', 'case-by-category matrix framework analysis framework method charting summary case category code evidence cell matrix Gale Ritchie Spencer content analysis qualitative analysis interviews compare Word interpreting'),
    [
      { h: P('Kurz', 'In brief') },
      P('Die Fall-Kategorie-Matrix ist eine Tabelle: eine Zeile je Fall (meist eine Person), eine Spalte je Code. In jeder Zelle steht Ihre kurze Zusammenfassung, was diese Person zu diesem Thema gesagt hat, dazu die Belege.', 'The case-by-category matrix is a table: one row per case (usually one person), one column per code. Each cell holds your short summary of what this person said on this topic, plus the evidence.'),
      { h: P('Was ist das?', 'What is it?') },
      P('Die Matrix ist das Kennzeichen der Framework-Analyse (Framework-Methode). Sie wurde in der britischen Sozialforschung entwickelt und wird heute auch in der Gesundheitsforschung genutzt. Gale und andere (2013) beschreiben sieben Schritte:', 'The matrix is the hallmark of framework analysis (the framework method). It was developed in British social research and is also used in health research today. Gale and others (2013) describe seven stages:'),
      { ol: [
        P('Aufschreiben der Gespräche (Transkription). Das geschieht vor dem Kodier-Arbeitsplatz, auf der Seite „Interviews“.', 'Writing down the conversations (transcription). This happens before the coding workspace, on the page “Interviews”.'),
        P('Vertraut machen: den ganzen Text lesen oder hören und erste Notizen machen. In Statable sind das Lesen und die Memos.', 'Getting familiar: reading or listening to the whole text and making first notes. In Statable that is reading and the memos.'),
        P('Kodieren: Textstellen Codes geben, in eigenen Worten oder aus einem Leitfaden.', 'Coding: giving passages codes, in your own words or from a guide.'),
        P('Ein Kategoriensystem entwickeln: Die Codes werden geordnet und mit Definitionen versehen (Codebaum und Kodierleitfaden).', 'Developing a category system: the codes are ordered and given definitions (code tree and coding guide).'),
        P('Das Kategoriensystem anwenden: Die übrigen Texte werden damit kodiert.', 'Applying the category system: the other texts are coded with it.'),
        P('In die Matrix übertragen (Charting): Je Fall und Code fassen Sie zusammen, was gesagt wurde, und verweisen auf Belege.', 'Charting into the matrix: for each case and code you summarise what was said and point to evidence.'),
        P('Deuten: Sie suchen Muster und Unterschiede, bilden zum Beispiel Typen oder prüfen Zusammenhänge zwischen Themen. Das geht auf der Grundlage der Matrix, aber die Matrix ersetzt es nicht.', 'Interpreting: you look for patterns and differences, for example form types or examine links between topics. This builds on the matrix, but the matrix does not replace it.')
      ] },
      P('Der Unterschied zur Code-Matrix: Die Code-Matrix (Fall-Code-Matrix) zählt, wie oft ein Code vorkommt, und macht aus Text eine Zahl. Die Fall-Kategorie-Matrix behält den Text: Eine Zelle sagt, was die Person gesagt hat, und die Aussagen einer Person bleiben mit ihrem übrigen Gespräch verbunden. Eine Zahl sagt nicht, wie jemand etwas erlebt hat.', 'The difference from the code matrix: the code matrix (case-code matrix) counts how often a code occurs and turns text into a number. The case-by-category matrix keeps the text: a cell says what the person said, and the statements of a person stay connected with the rest of their account. A number does not say how someone experienced something.'),
      P('Eine gute Zusammenfassung hält die Waage: so kurz, dass man vergleichen kann, und so nah an der Aussage, dass Sinn und Ton erhalten bleiben. Sie beschreibt zuerst in den Worten der Person und deutet noch nicht. Verweise auf Belege machen sie überprüfbar.', 'A good summary strikes a balance: short enough to compare, and close enough to the statement that meaning and tone are kept. It first describes in the person’s words and does not yet interpret. References to evidence make it checkable.'),
      { h: P('Selbst machen', 'Do it yourself') },
      P('Drei erfundene Personen haben sich im Interview zu „Zeitdruck“ geäußert. Fassen Sie für jede Person in einem Satz zusammen, was sie zu diesem Thema sagt. Beschreiben Sie nur; deuten Sie noch nicht. Vergleichen Sie danach die drei Sätze und sehen Sie, worin sich die Personen unterscheiden. Lesen Sie erst dann die Lösung.', 'Three invented people spoke about “time pressure” in the interview. For each person, summarise in one sentence what they say on this topic. Only describe; do not yet interpret. Then compare the three sentences and see how the people differ. Read the solution only afterwards.'),
      { ul: [
        P('Anna: „Vor der Klausur hatte ich nicht genug Tage.“ - „Ich schreibe mir sonntags auf, was ansteht.“ - „Wenn ich einen Plan habe, bin ich ruhiger.“', 'Anna: “Before the exam I did not have enough days.” - “On Sundays I write down what is coming up.” - “When I have a plan, I am calmer.”'),
        P('Ben: „Ich arbeite zwanzig Stunden in der Woche, da bleibt wenig Zeit.“ - „Ich lerne meistens nachts.“ - „Die Abgabe nächste Woche macht mir keine Sorgen.“', 'Ben: “I work twenty hours a week, so there is little time.” - “I mostly study at night.” - “The deadline next week does not worry me.”'),
        P('Chiara: „Zeit habe ich genug, ich fange nur zu spät an.“ - „Bei Gruppenarbeiten warte ich auf die anderen.“ - „Am Ende reicht es irgendwie.“', 'Chiara: “I have enough time, I just start too late.” - “In group work I wait for the others.” - “In the end it somehow works out.”')
      ] },
      { h: P('Lösung', 'Solution') },
      { tabelle: { kopf: [P('Fall', 'Case'), P('Mögliche Zusammenfassung', 'Possible summary'), P('Warum so', 'Why')], zeilen: [
        ['Anna', P('Spürt Zeitnot vor Klausuren und teilt sich dagegen die Woche ein; der Plan beruhigt sie.', 'Feels short of time before exams and organises the week against it; the plan calms her.'), P('Alle drei Aussagen kommen vor: Zeitnot, Plan, Wirkung.', 'All three statements appear: shortage of time, plan, effect.')],
        ['Ben', P('Hat durch den Nebenjob wenig Zeit und lernt nachts; die nächste Abgabe sieht er gelassen.', 'Has little time because of the side job and studies at night; he sees the next deadline calmly.'), P('Die gelassene Aussage widerspricht dem Zeitmangel nicht, sie gehört mit hinein.', 'The calm statement does not contradict the lack of time; it belongs in the summary.')],
        ['Chiara', P('Sieht keinen Mangel an Zeit, sondern einen späten Beginn; bei Gruppenarbeit wartet sie auf andere, am Ende reicht es ihr.', 'Sees no lack of time but a late start; in group work she waits for others, in the end it is enough for her.'), P('Sie nennt einen anderen Grund als Anna und Ben. Das fällt erst im Vergleich auf.', 'She names a different reason than Anna and Ben. This only shows in the comparison.')]
      ] } },
      P('Der Vergleich zeigt: Die Gründe für die Zeitnot unterscheiden sich (Klausur, Nebenjob, später Beginn). Das ist eine Beschreibung. Ein Satz wie „Chiara schiebt Aufgaben auf“ wäre schon eine Deutung; er gehört in ein Memo und wird später geprüft.', 'The comparison shows: the reasons for the shortage of time differ (exam, side job, late start). That is a description. A sentence such as “Chiara procrastinates” would already be an interpretation; it belongs in a memo and is checked later.'),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      { ol: [
        P('Wählen Sie im Bereich „Auswerten“ die Ansicht „Was sagt jeder Fall zu jedem Thema? (Fall-Kategorie-Matrix)“. Im Beispielprojekt sind erfundene Fälle und Codes vorbereitet.', 'In the section “Analysis” choose the view “What does each case say on each topic? (case-by-category matrix)”. The example project has invented cases and codes prepared.'),
        P('Wählen Sie mit den Kästchen die Codes für die Spalten. Voreingestellt sind die obersten Codes, die Belege haben. Der Schalter „Untercodes mitnehmen“ rechnet die Belege der Untercodes dazu; ein Beleg mit Ober- und Untercode zählt einmal.', 'With the check boxes choose the codes for the columns. The top-level codes that have evidence are preset. The switch “Include sub-codes” adds the evidence of the sub-codes; a piece of evidence with a parent and a sub-code counts once.'),
        P('Die Tabelle hat eine Überschrift, Zeilenköpfe für die Fälle und Spaltenköpfe für die Codes. In einer Zelle steht ein Knopf wie „3 Belege“ und Ihre Zusammenfassung, gekürzt auf 120 Zeichen. Eine Zelle sammelt die Belege aus allen Dokumenten eines Falls.', 'The table has a caption, row headers for the cases and column headers for the codes. A cell holds a button such as “3 pieces of evidence” and your summary, shortened to 120 characters. A cell collects the evidence from all documents of a case.'),
        P('Der Knopf „3 Belege“ zeigt die Belege dieser Zelle unter der Tabelle. „Im Text zeigen“ springt zur Stelle.', 'The button “3 pieces of evidence” shows the evidence of this cell beneath the table. “Show in text” jumps to the passage.'),
        P('Schreiben Sie im Feld „Zusammenfassung“ (beschriftet zum Beispiel „Zusammenfassung für Anna, Lernen“) Ihren Text und wählen Sie „Speichern“. Statable sagt „Zusammenfassung gespeichert“. Eine Zusammenfassung ist auch ohne Belege erlaubt.', 'In the field “Summary” (labelled for example “Summary for Anna, Learning”) write your text and choose “Save”. Statable says “Summary saved”. A summary is allowed even without evidence.'),
        P('Mit „Matrix als Word“ speichern Sie die Tabelle als Word-Datei. Die Zelle enthält Ihre Zusammenfassung, sonst „(n Belege, keine Zusammenfassung)“. Der Schalter „Belege mitnehmen“ fügt die Belegtexte an; dann enthält die Datei wörtliche Zitate, und Statable weist vor dem Speichern darauf hin.', 'With “Matrix as Word” you save the table as a Word file. The cell holds your summary, otherwise “(n pieces of evidence, no summary)”. The switch “Include evidence” adds the evidence texts; the file then contains verbatim quotations, and Statable points this out before saving.')
      ] },
      P('Am Handy zeigt Statable statt der Tabelle je Fall eine Liste mit den Codes, der Zusammenfassung und der Zahl der Belege.', 'On a phone Statable shows, instead of the table, a list per case with the codes, the summary and the number of pieces of evidence.'),
      P('Wenn Sie Zusammenfassungen eines Falls schreiben und das Dokument später keinem Fall mehr zugeordnet ist, bleibt die Zusammenfassung im Projekt gespeichert, wird aber nicht mehr angezeigt.', 'If you write summaries for a case and the document is later no longer assigned to a case, the summary stays saved in the project but is no longer shown.'),
      { h: P('Stimmt nicht - so ist es', 'Not true - this is how it is') },
      falsch(P('Die Matrix fasst die Interviews zusammen, und ich muss nur noch die Ergebnisse abschreiben.', 'The matrix summarises the interviews, and I only have to copy the results.'),
        P('Statable fasst nichts zusammen. Die Zusammenfassung in jeder Zelle schreiben Sie selbst, und die Deutung kommt danach. Eine Software ordnet und speichert; ausgewertet haben Sie.', 'Statable summarises nothing. You write the summary in each cell yourself, and the interpretation comes afterwards. Software orders and stores; you did the analysis.')),
      mitnehmen(
        P('Zeile = Fall, Spalte = Code, Zelle = Ihre Zusammenfassung mit Belegen.', 'Row = case, column = code, cell = your summary with evidence.'),
        P('Die Code-Matrix zählt, die Fall-Kategorie-Matrix behält den Text.', 'The code matrix counts, the case-by-category matrix keeps the text.'),
        P('Erst beschreiben, dann deuten: Zusammenfassen in den Worten der Person, Deuten danach, Einfälle ins Memo.', 'Describe first, then interpret: summarise in the person’s words, interpret afterwards, put ideas in a memo.'),
        P('Quelle des Ablaufs: Gale u. a. (2013), frei zugänglich im BMC Medical Research Methodology.', 'Source of the procedure: Gale and others (2013), open access in BMC Medical Research Methodology.')
      )
    ], ['eh-kodieren-ansichten', 'eh-kodieren', 'eh-fall-code-matrix', 'eh-memos', 'eh-kodierleitfaden']),

  a('eh-aehnliche-stellen', 'verstehen', P('Ähnliche Stellen finden (Wortähnlichkeit, TF-IDF)', 'Finding similar passages (word similarity, TF-IDF)'),
    P('ähnliche Stellen Wortähnlichkeit TF-IDF Textähnlichkeit Kosinus seltene Wörter Sätze vergleichen Kodieren Stelle suchen Verneinung Synonyme keine KI generative KI Codes vorschlagen lokal abschalten', 'similar passages word similarity TF-IDF text similarity cosine rare words compare sentences coding find passage negation synonyms no AI generative AI suggest codes local switch off'),
    [
      { h: P('Kurz', 'In brief') },
      P('Zu einer gewählten Stelle zeigt Statable Sätze, die ähnliche Wörter enthalten. So finden Sie weitere Stellen, die vielleicht denselben Code verdienen. Statable vergleicht nur Wörter, nicht die Bedeutung, und schlägt keine Codes vor.', 'For a chosen passage Statable shows sentences containing similar words. This helps you find further passages that may deserve the same code. Statable compares only words, not meaning, and suggests no codes.'),
      { h: P('Was ist das?', 'What is it?') },
      P('Das Maß heißt TF-IDF (Term Frequency, Inverse Document Frequency). Jeder Satz wird als Liste seiner Wörter betrachtet. Ein Wort bekommt ein hohes Gewicht, wenn es im Satz oft steht und im ganzen Material selten ist. Häufige Wörter wie „und“ oder „ich“ bekommen ein niedriges Gewicht. Zwei Sätze sind sich ähnlich, wenn sie dieselben seltenen Wörter haben. Die Zahl dahinter liegt zwischen 0 (keine gemeinsamen Wörter) und 1 (gleiche Wortmischung).', 'The measure is called TF-IDF (term frequency, inverse document frequency). Each sentence is viewed as a list of its words. A word gets a high weight if it appears often in the sentence and is rare in the whole material. Common words such as “and” or “I” get a low weight. Two sentences are similar if they share the same rare words. The number behind this lies between 0 (no shared words) and 1 (same mix of words).'),
      P('Statable rechnet das auf Ihrem Gerät und schickt nichts weg. Es gibt keine Wortstämme und keine Liste unwichtiger Wörter; Groß- und Kleinschreibung wird ignoriert.', 'Statable calculates this on your device and sends nothing away. There is no word stemming and no list of unimportant words; upper and lower case are ignored.'),
      { h: P('Grenzen', 'Limits') },
      { ul: [
        P('Die Bedeutung bleibt unbekannt. „Ich bin nicht überfordert“ und „Ich bin überfordert“ sind sich sehr ähnlich, obwohl sie das Gegenteil sagen.', 'The meaning stays unknown. “I am not overwhelmed” and “I am overwhelmed” are very similar although they say the opposite.'),
        P('Wörter mit gleichem Sinn zählen nicht als gleich. „Stress“ und „Druck“ haben nichts miteinander zu tun, solange die Wörter verschieden sind.', 'Words with the same sense do not count as the same. “Stress” and “pressure” have nothing to do with each other as long as the words are different.'),
        P('Ein Treffer ist ein Hinweis zum Nachlesen, keine Entscheidung. Ob eine Stelle denselben Code verdient, entscheiden Sie beim Lesen.', 'A hit is a hint to read, not a decision. Whether a passage deserves the same code, you decide while reading.')
      ] },
      { h: P('Warum keine KI-Vorschläge?', 'Why no AI suggestions?') },
      P('Statable setzt keine generative KI ein. Es kodiert nie selbst, schlägt keine Codes vor und schreibt keine Zusammenfassungen. Kodieren ist Deutung, und die soll bei Ihnen bleiben und nachvollziehbar sein. Der Wortvergleich lässt sich erklären und nachrechnen; ein Sprachmodell nicht.', 'Statable uses no generative AI. It never codes by itself, suggests no codes and writes no summaries. Coding is interpretation, and that should stay with you and be traceable. The word comparison can be explained and recalculated; a language model cannot.'),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      { ol: [
        P('Wählen Sie im Bereich „Auswerten“ die Ansicht „Wo steht noch etwas Ähnliches? (ähnliche Stellen)“. Der Schalter „Ähnliche Stellen anbieten“ schaltet die Funktion ein oder aus. Ausgeschaltet zeigt die Ansicht nur den Schalter und den Satz „Ausgeschaltet.“', 'In the section “Analysis” choose the view “Where is there something similar? (similar passages)”. The switch “Offer similar passages” turns the function on or off. Switched off, the view shows only the switch and the sentence “Switched off.”'),
        P('Markieren Sie im Text eine Stelle oder wählen Sie Sätze. Ohne Auswahl gilt der Satz an der Schreibmarke.', 'Mark a passage in the text or choose sentences. Without a selection the sentence at the cursor is used.'),
        P('Wählen Sie „Ähnliche Stellen suchen“. Statable nennt die Zahl der Treffer, zum Beispiel „10 ähnliche Stellen gefunden.“', 'Choose “Search similar passages”. Statable names the number of hits, for example “10 similar passages found.”'),
        P('Die Treffer stehen in einer Liste: Dokument, Satznummer, Text und die Ähnlichkeit. Der Knopf „Im Text zeigen“ springt zur Stelle wie bei einem Beleg.', 'The hits are in a list: document, sentence number, text and the similarity. The button “Show in the text” jumps to the passage as with a piece of evidence.'),
        P('Codes vergeben Sie danach selbst, über die Code-Leiste, wie sonst auch.', 'You give codes afterwards yourself, through the code bar, as usual.')
      ] },
      { h: P('Stimmt nicht - so ist es', 'Not true - this is how it is') },
      falsch(P('Je höher die Ähnlichkeit, desto eher gehört die Stelle zum selben Code.', 'The higher the similarity, the more likely the passage belongs to the same code.'),
        P('Die Ähnlichkeit zählt nur gemeinsame Wörter. Eine Stelle mit gleichen Wörtern kann das Gegenteil meinen, und eine Stelle mit anderen Wörtern kann dasselbe meinen. Lesen Sie jeden Treffer selbst.', 'The similarity counts only shared words. A passage with the same words can mean the opposite, and a passage with other words can mean the same. Read each hit yourself.')),
      mitnehmen(
        P('TF-IDF vergleicht Wörter: Seltene gemeinsame Wörter zählen mehr als häufige.', 'TF-IDF compares words: rare shared words count more than common ones.'),
        P('Bedeutung, Verneinung und Wörter mit gleichem Sinn erkennt das Maß nicht.', 'The measure does not recognise meaning, negation or words with the same sense.'),
        P('Statable schlägt keine Codes vor und setzt keine generative KI ein. Die Funktion lässt sich abschalten.', 'Statable suggests no codes and uses no generative AI. The function can be switched off.')
      )
    ], ['eh-kodieren-ansichten', 'eh-kodieren', 'eh-memos'])
];
