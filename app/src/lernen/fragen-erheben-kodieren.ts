/**
 * Üben: Kodieren im Kodier-Arbeitsplatz (Erheben, Stufe 6b, Paket 6b3, 09.11.2026): Einheit `kodieren-grundlagen`, 5 Fragen.
 * Belege: `Beleg:<id>` verweist auf docs/fachblaetter/BELEGE-ERHEBEN.json (O'Connor und Joffe 2020; Mayring 2000); Fragen zu Funktionen von Statable stützen sich
 * auf die Hilfe-Artikel (`Hilfe:<id>`), weil es dazu keine Veröffentlichung gibt. Kuckartz und Rädiker 2022 und Saldaña 2021 stehen nicht in der Bibliothek und sind kein Beleg.
 * Eigene Wortlaute, keine Dezimalzahlen. Formregeln aus den Blindrunden: alle Antworten einer Frage gleich gebaut und gleich lang (±10 %), keine absoluten Wörter,
 * keine Stammwörter nur in der richtigen Antwort, Fachbegriff in Klammern bei jeder Antwort, echte Fehldeutungen statt Unsinn, Lösungsplätze verteilt.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

export const FRAGEN_KODIEREN: Frage[] = [
  {
    id: 'eh-kg-einheit', thema: 'erheben',
    stamm: P('Zwei Personen kodieren dieselben Interviews, und jede setzt ihre Textstellen selbst. Später soll die Übereinstimmung automatisch berechnet werden. Was ist zu erwarten, und was hilft?',
      'Two people code the same interviews, and each sets their own passages. Later the agreement is to be calculated automatically. What is to be expected, and what helps?'),
    antworten: [
      a(P('Die Stellen fallen oft unterschiedlich lang aus, doch das Maß bleibt brauchbar; hilfreich ist, vorab die Länge der Interviews anzugleichen, etwa durch Kürzen (Textkürzung)',
        'The passages often differ in length, but the measure stays usable; it helps to align the length of the interviews beforehand, for example by shortening them (text shortening)'),
        P('Das Problem liegt nicht in der Länge der Interviews, sondern darin, dass die Personen ihre Grenzen selbst setzen. Es hilft, vorab festzulegen, was eine Einheit ist.',
          'The problem is not the length of the interviews but that the people set their boundaries themselves. It helps to fix beforehand what a unit is.')),
      a(P('Die Grenzen unterscheiden sich schon um ein Satzzeichen, und das Maß wird unzuverlässig; hilfreich ist, vorab die Einheit festzulegen, etwa den Satz (Kodiereinheit)',
        'The boundaries differ by as little as one punctuation mark, and the measure becomes unreliable; it helps to fix the unit beforehand, for example the sentence (coding unit)'),
        P('So beschreiben es O\'Connor und Joffe (2020). In Statable gibt die Ansicht „Sätze“ feste Einheiten vor: Alle kodieren dieselben Sätze.',
          'This is how O\'Connor and Joffe (2020) describe it. In Statable the view "Sentences" gives fixed units: everyone codes the same sentences.'), true),
      a(P('Die Stellen werden oft zu lang, weil ganze Absätze markiert werden, und das Maß sinkt; hilfreich ist, die erlaubte Zahl der Codes je Absatz zu begrenzen (Absatzgrenze)',
        'The passages often become too long because whole paragraphs are marked, and the measure drops; it helps to limit the number of codes allowed per paragraph (paragraph limit)'),
        P('Eine solche Begrenzung ist nicht belegt und löst das Problem abweichender Grenzen nicht. Es hilft, vorab festzulegen, was eine Einheit ist.',
          'Such a limit is not documented and does not solve the problem of differing boundaries. It helps to fix beforehand what a unit is.')),
      a(P('Die Grenzen unterscheiden sich meist nur wenig, und das Maß wird dennoch unzuverlässig; hilfreich ist, die Einheit erst nach der Auswertung festzulegen (nachträgliche Einheit)',
        'The boundaries usually differ only a little, and the measure still becomes unreliable; it helps to fix the unit only after the analysis (retrospective unit)'),
        P('Die Einheit muss vorab feststehen. Nachträglich lassen sich abweichende Grenzen nicht sauber angleichen.',
          'The unit must be fixed beforehand. Differing boundaries cannot be aligned cleanly afterwards.'))
    ],
    hilfe: ['eh-kodieren'], belege: ['Beleg:oconnor2020-segmentierung', 'Hilfe:eh-kodieren']
  },
  {
    id: 'eh-kg-ziffer', thema: 'erheben',
    stamm: P('Im Kodier-Arbeitsplatz ist in der Ansicht „Text“ ein Satz markiert, und es wird die Taste 3 gedrückt. Was passiert?',
      'In the coding workspace a sentence is marked in the view "Text", and key 3 is pressed. What happens?'),
    antworten: [
      a(P('Der Cursor springt zum dritten Satz des Dokuments und markiert ihn, die Schnellleiste und ihre Plätze bleiben dabei unberührt (Satzsprung)',
        'The cursor jumps to the third sentence of the document and marks it, while the quick bar and its places are left untouched (sentence jump)'),
        P('Dafür gibt es die Taste S, sie markiert den Satz an der Schreibmarke. Ziffern wählen Codes aus der Schnellleiste.',
          'The S key does that, it marks the sentence at the cursor. Digits choose codes from the quick bar.')),
      a(P('Die Code-Leiste öffnet sich mit dem Code auf Platz 3 der Schnellleiste vorgewählt, und er wird erst mit Enter gegeben (Code-Leiste)',
        'The code bar opens with the code at place 3 of the quick bar preselected, and it is given only with Enter (code bar)'),
        P('Dafür dienen Enter oder K. Die Ziffer gibt den Code des Platzes sofort, ohne die Code-Leiste zu öffnen.',
          'Enter or K do that. The digit gives the code of the place at once, without opening the code bar.')),
      a(P('Die Markierung wird um drei Zeichen nach rechts erweitert, und die Schnellleiste zeigt den Code auf diesem Platz an (Auswahlerweiterung)',
        'The marking is extended by three characters to the right, and the quick bar shows the code at that place (extending the selection)'),
        P('Die Auswahl erweitert man mit Umschalt und Pfeiltaste. Ziffern geben Codes.',
          'The selection is extended with Shift and an arrow key. Digits give codes.')),
      a(P('Der markierte Satz bekommt sofort den Code auf Platz 3 der Schnellleiste, und die Code-Leiste bleibt dabei geschlossen (Schnellleiste)',
        'The marked sentence receives the code at place 3 of the quick bar at once, and the code bar stays closed (quick bar)'),
        P('So beschreibt es die Hilfe zu den Tasten: Die Ziffern 1 bis 9 geben den Code des jeweiligen Platzes der Schnellleiste.',
          'This is how the help on the keys describes it: the digits 1 to 9 give the code at the respective place of the quick bar.'), true)
    ],
    hilfe: ['eh-kodieren-tasten'], belege: ['Hilfe:eh-kodieren-tasten']
  },
  {
    id: 'eh-kg-neuer-code', thema: 'erheben',
    stamm: P('Beim Kodieren fällt eine Textstelle auf, für die der Kodierleitfaden keinen passenden Code enthält. Wie geht man in der qualitativen Inhaltsanalyse üblicherweise vor?',
      'While coding, a passage stands out for which the coding guide contains no suitable code. How does one usually proceed in qualitative content analysis?'),
    antworten: [
      a(P('Man lässt die Stelle zunächst offen, damit der Leitfaden nach dem ersten Entwurf stabil bleibt und die Ergebnisse vergleichbar sind (feste Kategorien)',
        'One leaves the passage open for now so that the guide stays stable after the first draft and the results are comparable (fixed categories)'),
        P('Das ist eine verbreitete Fehldeutung. Der Leitfaden wird im Verlauf der Analyse ergänzt und überarbeitet.',
          'This is a common misreading. The guide is supplemented and revised during the analysis.')),
      a(P('Man ordnet sie der ähnlichsten Kategorie zu und hält den Leitfaden fest, damit sich die Kategorien nicht überschneiden und das System ruhig bleibt (Zwangszuordnung)',
        'One assigns it to the most similar category and keeps the guide as it is so that the categories do not overlap and the system stays calm (forced assignment)'),
        P('Eine stille Zuordnung verdeckt, dass der Leitfaden eine Lücke hat. Besser ist eine neue Kategorie mit Definition oder eine klarere Kodierregel.',
          'A silent assignment hides that the guide has a gap. A new category with a definition or a clearer coding rule is better.')),
      a(P('Man ergänzt eine neue Kategorie mit Definition und Textbeispiel, damit der Leitfaden im Lauf der Analyse überarbeitet und die Lücke geschlossen wird (Überarbeitung)',
        'One adds a new category with a definition and an example passage so that the guide is revised in the course of the analysis and the gap is closed (revision)'),
        P('Nach Mayring (2000) werden Definitionen, prototypische Textstellen und Abgrenzungsregeln Schritt für Schritt ergänzt und überarbeitet. In Statable legt man den Code über „Neuer Code“ in der Code-Leiste an.',
          'According to Mayring (2000), definitions, prototypical passages and rules of demarcation are added and revised step by step. In Statable the code is created with "New code" in the code bar.'), true),
      a(P('Man wartet das Ende der Auswertung ab und schreibt den Leitfaden erst dann, damit er die Kodierung nicht beeinflusst und neutral bleibt (nachträglicher Leitfaden)',
        'One waits until the end of the analysis and writes the guide only then so that it does not influence the coding and stays neutral (retrospective guide)'),
        P('Der Leitfaden gehört an den Anfang und wird laufend überarbeitet. Erst nach der Auswertung entsteht er nicht.',
          'The guide belongs at the beginning and is revised continually. It does not arise only after the analysis.'))
    ],
    hilfe: ['eh-kodieren', 'eh-kodierleitfaden'], belege: ['Beleg:mayring-ueberarbeiten', 'Hilfe:eh-kodieren']
  },
  {
    id: 'eh-kg-memo', thema: 'erheben',
    stamm: P('Beim Kodieren fällt auf, dass eine Person von „Zeitdruck“ spricht, aber vermutlich Geldsorgen meint. Wohin gehört dieser Gedanke im Kodier-Arbeitsplatz?',
      'While coding it becomes clear that a person speaks of "time pressure" but probably means money worries. Where does this thought belong in the coding workspace?'),
    antworten: [
      a(P('In eine eigene Notiz zu dieser Textstelle: sie hält die Überlegung fest, ohne den Interviewtext oder die vergebenen Codes zu verändern (Memo)',
        'In a note of your own on this passage: it records the thought without changing the interview text or the codes given (memo)'),
        P('So beschreibt es die Hilfe: Memos sind eigene Notizen zu Stelle, Dokument, Code oder Projekt und Teil der Auswertung.',
          'This is how the help describes it: memos are your own notes on a passage, document, code or project and part of the analysis.'), true),
      a(P('In den Interviewtext selbst, als Einschub in Klammern: so bleibt die Überlegung beim späteren Lesen sichtbar und geht nicht verloren (Textergänzung)',
        'In the interview text itself, as an insertion in brackets: this way the thought stays visible when reading later and is not lost (text addition)'),
        P('Der Text wird einmal eingelesen und danach nicht mehr verändert, sonst verschieben sich die Positionen aller Kodierungen.',
          'The text is read in once and not changed afterwards, otherwise the positions of all codings shift.')),
      a(P('In einen zusätzlichen Code mit dem Namen der Überlegung: er wird bei der Stelle gespeichert und später mit den übrigen Codes gezählt (Notiz-Code)',
        'In an additional code bearing the name of the thought: it is saved with the passage and later counted together with the other codes (note code)'),
        P('Ein solcher Code würde in Belegen und Zählungen wie ein Thema erscheinen und sie verfälschen.',
          'Such a code would appear like a topic in evidence lists and counts and distort them.')),
      a(P('In die Definition des nächstliegenden Codes: sie hält die Überlegung fest und gilt bei künftigen Kodierungen für die Stellen dieses Codes (Codedefinition)',
        'In the definition of the nearest code: it records the thought and applies to the passages of that code in future codings (code definition)'),
        P('Die Definition beschreibt den Code für alle Stellen. Eine Beobachtung zu einer einzelnen Stelle gehört in ein Memo und kann später zu einer Regel führen.',
          'The definition describes the code for all passages. An observation on a single passage belongs in a memo and can later lead to a rule.'))
    ],
    hilfe: ['eh-memos'], belege: ['Hilfe:eh-memos']
  },
  {
    id: 'eh-kg-fallvariable', thema: 'erheben',
    stamm: P('Im Projekt gibt es die Fallvariable „Semester“ (Anna: 3, Ben: 5). Wozu dient sie im Kodier-Arbeitsplatz?',
      'The project contains the case variable "semester" (Anna: 3, Ben: 5). What is it used for in the coding workspace?'),
    antworten: [
      a(P('Sie wird beim Kodieren als Code an die Textstellen angehängt, zum Beispiel trägt dann eine Stelle von Anna den Code „Semester 3“ (Automatik-Code)',
        'It is attached as a code to the passages while coding, for example a passage by Anna then carries the code "semester 3" (automatic code)'),
        P('Fallvariablen hängen am Fall, nicht an einer Textstelle. Es wird kein Code angehängt.',
          'Case variables belong to the case, not to a passage. No code is attached.')),
      a(P('Man kann die Belege eines Codes nach Fällen filtern, zum Beispiel nur Stellen aus Interviews von Personen im fünften Semester zeigen (Filter)',
        'The evidence for a code can be filtered by case, for example showing only passages from interviews with people in their fifth semester (filter)'),
        P('So beschreibt es die Hilfe: Fallvariablen sind Angaben zu einem Fall, mit denen sich Belege filtern und später Zahlen und Texte verbinden lassen.',
          'This is how the help describes it: case variables are facts about a case with which evidence can be filtered and numbers and texts linked later.'), true),
      a(P('Statable liest sie aus dem Interviewtext und trägt sie ein, zum Beispiel die Zahl direkt neben dem Wort „Semester“ im Gespräch mit Anna (Textsuche)',
        'Statable reads it from the interview text and enters it, for example the number right next to the word "semester" in the conversation with Anna (text search)'),
        P('Die Werte trägt man selbst ein. Statable liest sie nicht aus dem Text.',
          'The values are entered by hand. Statable does not read them from the text.')),
      a(P('Sie ersetzt den Namen der Person im Interviewtext, zum Beispiel Anna durch „Semester 3“, damit das Interview unkenntlich bleibt (Pseudonymisierung)',
        'It replaces the name of the person in the interview text, for example Anna with "semester 3", so that the interview stays unrecognisable (pseudonymisation)'),
        P('Pseudonymisieren ist ein eigener Schritt auf der Seite „Interviews“. Fallvariablen verändern den Text nicht.',
          'Pseudonymising is a separate step on the page "Interviews". Case variables do not change the text.'))
    ],
    hilfe: ['eh-fallvariablen'], belege: ['Hilfe:eh-fallvariablen']
  }
];
