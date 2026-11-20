/**
 * Üben: Wie genau muss ich abschreiben? (Feinstruktur, Stufe F1B, 12.11.2026): Einheit `transkription-genau`, 10 Fragen.
 * Grundlage ist der Hilfe-Artikel `eh-transkription-genau` (`Hilfe:<id>`): die Zeichenformen nach Froschauer und Lueger sind Methode, die Zählregel ist eine Festlegung von Statable.
 * Bücher liegen nicht vor, darum kein Seitenbeleg. Alle Texte sind erfunden (eigene Wortlaute), keine Dezimalzahlen.
 * Formregeln: alle Antworten einer Frage gleich gebaut und gleich lang (etwa ±10 %), Fachbegriff in Klammern bei jeder Antwort, keine absoluten Wörter,
 * echte Fehldeutungen statt Unsinn (jede falsche Antwort ist die Regel eines anderen Verfahrens oder einer anderen Zeichenart), Lösungsplätze verteilt.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const H = ['Hilfe:eh-transkription-genau'];

export const FRAGEN_TRANSKRIPTION: Frage[] = [
  {
    id: 'eh-tg-pause', thema: 'erheben',
    stamm: P('Die befragte Person schweigt drei Sekunden. Wie hält man das nach Froschauer und Lueger im Transkript fest?',
      'The respondent is silent for three seconds. How is this recorded in the transcript after Froschauer and Lueger?'),
    antworten: [
      a(P('Mit drei Punkten ohne Leerzeichen am Stück, also ..., direkt an der Stelle der Pause im Satz (Pausenpunkte)',
        'With three dots in a row without spaces, that is ..., right at the place of the pause in the sentence (pause dots)'),
        P('Zusammengeschriebene Punkte sind ein Auslassungszeichen. Eine Pause schreibt man mit einzelnen Punkten und Leerzeichen dazwischen.',
          'Dots written together are an ellipsis. A pause is written with single dots and spaces between them.')),
      a(P('Mit drei einzelnen Punkten, Leerzeichen dazwischen und je zwei Leerzeichen davor und danach (Pausenpunkte)',
        'With three single dots, spaces between them and two spaces before and after (pause dots)'),
        P('So ist die Pause von anderen Punkten im Text zu unterscheiden, und die Zahl der Punkte nennt die Sekunden.',
          'This way the pause can be told apart from other dots in the text, and the number of dots gives the seconds.'), true),
      a(P('Mit einem Gedankenstrich je Sekunde, also - - -, davor und danach je zwei Leerzeichen (Pausenpunkte)',
        'With one dash per second, that is - - -, two spaces before and after (pause dots)'),
        P('Pausen werden mit Punkten gezeigt, nicht mit Strichen.', 'Pauses are shown with dots, not with dashes.')),
      a(P('Mit drei Punkten in runden Klammern, also (. . .), mit je einem Leerzeichen zwischen den Punkten (Pausenpunkte)',
        'With three dots in round brackets, that is (. . .), with one space between the dots (pause dots)'),
        P('Punkte in runden Klammern stehen für Unverständliches. Eine Pause steht ohne Klammern.',
          'Dots in round brackets stand for inaudible passages. A pause stands without brackets.'))
    ],
    hilfe: ['eh-transkription-genau'], belege: H
  },
  {
    id: 'eh-tg-geraeusch', thema: 'erheben',
    stamm: P('Im Interview läutet ein Telefon, und später nennt die befragte Person den Namen ihrer Schule. Wie schreibt man beides nach Froschauer und Lueger?',
      'In the interview a phone rings, and later the respondent names her school. How are both written after Froschauer and Lueger?'),
    antworten: [
      a(P('<Telefon läutet> und >Schule A< , das Geräusch mit den Spitzen nach innen und der Name nach außen (Spitzklammer)',
        '<phone rings> and >School A< , the noise with points inward and the name outward (angle bracket)'),
        P('Hier sind die Richtungen vertauscht: Das Geräusch zeigt mit den Spitzen nach außen, die Anonymisierung nach innen.',
          'The directions are swapped here: the noise points outward, the anonymisation inward.')),
      a(P('(Telefon läutet) und [Schule A], also das Geräusch rund und der Name in eckigen Klammern (Rundklammer)',
        '(phone rings) and [School A], that is the noise in round and the name in square brackets (round bracket)'),
        P('Für Geräusch und Anonymisierung sind spitze Klammern vorgesehen, mit entgegengesetzter Richtung.',
          'Angle brackets are provided for noise and anonymisation, pointing in opposite directions.')),
      a(P('[Telefon läutet] und (Schule A), das Geräusch eckig und der Name rund gesetzt (Eckklammer)',
        '[phone rings] and (School A), the noise set in square and the name in round brackets (square bracket)'),
        P('Die runden Klammern gehören zu Äußerungen der Sprechenden, eckige sind für diese beiden Fälle nicht vorgesehen.',
          'Round brackets belong to utterances of the speakers; square brackets are not provided for these two cases.')),
      a(P('>Telefon läutet< und <Schule A>, das Geräusch mit den Spitzen nach außen und der Name nach innen (Spitzklammer)',
        '>phone rings< and <School A>, the noise with points outward and the name inward (angle bracket)'),
        P('So unterscheidet man ein Geräusch der Situation von einer Anonymisierung.',
          'This is how a noise of the situation is told apart from an anonymisation.'), true)
    ],
    hilfe: ['eh-transkription-genau'], belege: H
  },
  {
    id: 'eh-tg-signal', thema: 'erheben',
    stamm: P('Die interviewende Person I1 sagt in einem eigenen Beitrag „mhm“. Wie wird das nach Froschauer und Lueger geschrieben?',
      'The interviewer I1 says “mhm” in a turn of her own. How is this written after Froschauer and Lueger?'),
    antworten: [
      a(P('Als (mhm) in runden Klammern, weil es kein richtiges Wort ist und die Aussage nicht trägt (Hörersignal)',
        'As (mhm) in round brackets, because it is not a proper word and does not carry the statement (listener signal)'),
        P('Hörersignale sind in diesem Regelwerk normaler Text. Klammern sind nichtverbalen Äußerungen wie Lachen vorbehalten.',
          'Listener signals are ordinary text in this rule set. Brackets are reserved for non-verbal utterances such as laughter.')),
      a(P('Als „hm“, weil das Regelwerk Zustimmungslaute auf eine Schreibweise vereinheitlicht (Hörersignal)',
        'As “hm”, because the rule set standardises agreeing sounds to one spelling (listener signal)'),
        P('Das Vereinheitlichen gehört zu Dresing und Pehl. Nach Froschauer und Lueger bleibt „mhm“, wie es gesprochen wurde.',
          'Standardising belongs to Dresing and Pehl. After Froschauer and Lueger “mhm” stays as it was spoken.')),
      a(P('Als normaler Text ohne Klammern im eigenen Beitrag, also I1: mhm, wie jedes andere gesprochene Wort (Hörersignal)',
        'As ordinary text without brackets in its own turn, that is I1: mhm, like any other spoken word (listener signal)'),
        P('Hörersignale und gesprächsgenerierende Beiträge gehören in den Text, genau wie sie gesprochen wurden.',
          'Listener signals and conversation-generating contributions belong in the text, just as they were spoken.'), true),
      a(P('Als eigener Beitrag in eckigen Klammern, also [I1: mhm], damit klar ist, dass es nur ein Signal ist (Hörersignal)',
        'As a turn of its own in square brackets, that is [I1: mhm], so that it is clear it is only a signal (listener signal)'),
        P('Eckige Klammern kennt das Regelwerk hier nicht. Ein Hörersignal ist normaler Text wie jedes andere Wort.',
          'The rule set has no square brackets for this. A listener signal is ordinary text like any other word.'))
    ],
    hilfe: ['eh-transkription-genau'], belege: H
  },
  {
    id: 'eh-tg-unterbrechung', thema: 'erheben',
    stamm: P('Mitten im Satz der befragten Person wirft I1 „ja genau“ ein, und die befragte Person spricht weiter. Wie sieht das im Text aus?',
      'In the middle of the respondent’s sentence I1 throws in “yes exactly”, and the respondent keeps talking. What does it look like in the text?'),
    antworten: [
      a(P('Im Satz steht /I1: ja genau/ zwischen zwei Schrägstrichen, und der Satz geht danach weiter (Unterbrechung)',
        'Within the sentence stands /I1: yes exactly/ between two slashes, and the sentence goes on afterwards (interruption)'),
        P('So wird ein Einwurf in den Beitrag gesetzt, ohne dass ein neuer Beitrag beginnt.',
          'This is how an interjection is put into the turn without a new turn beginning.'), true),
      a(P('Im Satz steht (I1: ja genau) in runden Klammern, und der Satz geht danach weiter (Unterbrechung)',
        'Within the sentence stands (I1: yes exactly) in round brackets, and the sentence goes on afterwards (interruption)'),
        P('Die runden Klammern sind für nichtverbale Äußerungen, Unverständliches und Vermutetes. Ein Einwurf steht zwischen Schrägstrichen.',
          'Round brackets are for non-verbal utterances, inaudible and guessed passages. An interjection stands between slashes.')),
      a(P('Im Satz steht [I1: ja genau] in eckigen Klammern, und der Satz geht danach weiter (Unterbrechung)',
        'Within the sentence stands [I1: yes exactly] in square brackets, and the sentence goes on afterwards (interruption)'),
        P('Eckige Klammern kennt das Regelwerk für diesen Fall nicht. Die Schrägstriche zeigen den Einwurf.',
          'The rule set knows no square brackets for this case. The slashes show the interjection.')),
      a(P('Im Satz steht //I1: ja genau// zwischen doppelten Schrägstrichen, und der Satz geht danach weiter (Unterbrechung)',
        'Within the sentence stands //I1: yes exactly// between double slashes, and the sentence goes on afterwards (interruption)'),
        P('Ein einfacher Schrägstrich vorne und hinten genügt. Doppelte Schrägstriche sieht das Regelwerk nicht vor.',
          'A single slash before and after is enough. The rule set has no double slashes.'))
    ],
    hilfe: ['eh-transkription-genau'], belege: H
  },
  {
    id: 'eh-tg-nonverbal', thema: 'erheben',
    stamm: P('Die befragte Person B1 lacht beim Erzählen kurz auf. Wie hält man das nach Froschauer und Lueger fest?',
      'The respondent B1 laughs briefly while telling. How is this recorded after Froschauer and Lueger?'),
    antworten: [
      a(P('Als >B1 lacht< in spitzen Klammern mit den Spitzen nach außen, mit der Kennung der Person davor (nichtverbale Äußerung)',
        'As >B1 laughs< in angle brackets with the points outward, with the code of the person in front (non-verbal utterance)'),
        P('Spitze Klammern nach außen sind für Geräusche der Situation. Lachen ist eine Äußerung der sprechenden Person.',
          'Angle brackets pointing outward are for noises of the situation. Laughter is an utterance of the speaker.')),
      a(P('Als (B1 lacht) in runden Klammern, mit der Kennung der Person davor (nichtverbale Äußerung)',
        'As (B1 laughs) in round brackets, with the code of the person in front (non-verbal utterance)'),
        P('So wird sichtbar, wer lacht und dass es nicht gesprochener Text ist.',
          'This makes visible who laughs and that it is not spoken text.'), true),
      a(P('Als [B1 lacht] in eckigen Klammern, mit der Kennung der Person davor (nichtverbale Äußerung)',
        'As [B1 laughs] in square brackets, with the code of the person in front (non-verbal utterance)'),
        P('Die Kennung stimmt, aber es sind runde Klammern. Eckige Klammern sieht das Regelwerk dafür nicht vor.',
          'The code is right, but the brackets are round. The rule set has no square brackets for this.')),
      a(P('Als <B1 lacht> in spitzen Klammern mit den Spitzen nach innen, mit der Kennung der Person davor (nichtverbale Äußerung)',
        'As <B1 laughs> in angle brackets with the points inward, with the code of the person in front (non-verbal utterance)'),
        P('Spitze Klammern nach innen ersetzen einen Namen oder Ort. Lachen steht in runden Klammern.',
          'Angle brackets pointing inward replace a name or place. Laughter stands in round brackets.'))
    ],
    hilfe: ['eh-transkription-genau'], belege: H
  },
  {
    id: 'eh-tg-genauigkeit', thema: 'erheben',
    stamm: P('Nach Froschauer und Lueger hängt die Genauigkeit des Transkripts vom Verfahren ab. Welches Verfahren verlangt das genaueste Transkript?',
      'Which method requires a transcript in which pauses and emphases are recorded most precisely?'),
    antworten: [
      a(P('Die Inhaltszusammenfassung, die festhält, worüber in einem langen Gespräch gesprochen wurde (Verfahren)',
        'Content summary, which records what was talked about in a long conversation (method)'),
        P('Hier genügt die geringste Genauigkeit: Es zählt der Inhalt, nicht die Form des Sprechens.',
          'The lowest precision suffices here: the content counts, not the form of speaking.')),
      a(P('Die Feinstrukturanalyse, die einzelne Äußerungen in ihrer Abfolge deutet (Verfahren)',
        'Fine-structure analysis, which interprets single utterances in their order (method)'),
        P('Sie deutet Satz für Satz und braucht alles, was gesprochen wurde, auch Pausen und Betonungen.',
          'It interprets sentence by sentence and needs everything that was spoken, including pauses and emphases.'), true),
      a(P('Die Themen- und Codeanalyse, die Stellen aus vielen Interviews Kategorien zuordnet (Verfahren)',
        'Thematic and code analysis, which assigns passages from many interviews to categories (method)'),
        P('Wortgenau heißt, dass die Wörter stimmen. Pausen und Betonungen sind dafür nicht nötig.',
          'Verbatim means that the words are right. Pauses and emphases are not needed for that.')),
      a(P('Die Systemanalyse, die Gesprächsstellen Schritt für Schritt auf Beziehungen hin deutet (Verfahren)',
        'System analysis, which interprets passages step by step for relations (method)'),
        P('Sie braucht viel Genauigkeit, aber weniger als die Feinstrukturanalyse, die Ausschnitte exakt verlangt.',
          'It needs a lot of precision, but less than fine-structure analysis, which requires excerpts to be exact.'))
    ],
    hilfe: ['eh-transkription-genau'], belege: H
  },
  {
    id: 'eh-tg-glaetten', thema: 'erheben',
    stamm: P('Eine Studierende will nur wissen, welche Themen in einem Gruppeninterview von 90 Minuten vorkommen. Welche Genauigkeit genügt dafür?',
      'A student only wants to summarise which topics a group interview of 90 minutes touches. What degree of precision is enough for that?'),
    antworten: [
      a(P('Exakt nach Froschauer und Lueger, weil jede Pause eine Bedeutung tragen kann (Genauigkeit)',
        'Exact after Froschauer and Lueger, because every pause can carry a meaning (precision)'),
        P('Für 90 Minuten wäre das viel Aufwand ohne Nutzen. Diese Genauigkeit ist für kurze Ausschnitte gedacht.',
          'For 90 minutes that would be a lot of effort without benefit. This precision is meant for short excerpts.')),
      a(P('Weitgehend genau mit Pausen und Betonung, damit der Gesprächsverlauf sichtbar bleibt (Genauigkeit)',
        'Largely precise with pauses and emphasis, so that the course of the conversation stays visible (precision)'),
        P('Pausen und Betonung braucht eine Themenübersicht nicht. Der Aufwand lohnt sich nicht.',
          'A topic overview does not need pauses and emphasis. The effort does not pay off.')),
      a(P('Wortgenau mit allen Zögerlauten im erweiterten System von Dresing und Pehl (Genauigkeit)',
        'Verbatim with all hesitation sounds in the extended system of Dresing and Pehl (precision)'),
        P('Der erweiterte Wortlaut ist für die Frage zu fein. Die Themen lassen sich auch aus geglättetem Text erkennen.',
          'The extended wording is too fine for the question. The topics can also be seen in smoothed text.')),
      a(P('Geglättet, also im einfachen System von Dresing und Pehl, in dem Füllwörter und Stottern wegfallen (Genauigkeit)',
        'Smoothed, that is in the simple system of Dresing and Pehl, in which filler words and stuttering drop out (precision)'),
        P('Für Themen zählt der Inhalt. Ein geglättetes Transkript spart viel Arbeit und genügt hier.',
          'For topics the content counts. A smoothed transcript saves a lot of work and is enough here.'), true)
    ],
    hilfe: ['eh-transkription-genau'], belege: H
  },
  {
    id: 'eh-tg-zaehlen', thema: 'erheben',
    stamm: P('Eine Abgabe verlangt 100 Wörter der befragten Person. Im Beitrag steht: „Ich war in der <Schule A> und (B1 lacht) wir hatten >Handy summt< viel Zeit.“ Wie viele Wörter zählt Statable?',
      'An assignment asks for 100 words of the respondent. The turn reads: “I was at <School A> and (B1 laughs) we had >phone buzzes< a lot of time.” How many words does Statable count?'),
    antworten: [
      a(P('Zehn: Die Anonymisierung zählt ein Wort, Lachen in Klammern und Geräusch fallen weg (Zählregel)',
        'Ten: the anonymisation counts as one word, laughter in brackets and the noise drop out (counting rule)'),
        P('Gezählt wird, was die Person gesprochen hat. Die Anonymisierung steht für einen gesprochenen Namen, Lachen und Geräusch sind keine Wörter.',
          'What the person spoke is counted. The anonymisation stands for a spoken name; laughter and noise are not words.'), true),
      a(P('Elf: Die Anonymisierung zählt zwei Wörter, Lachen in Klammern und Geräusch fallen weg (Zählregel)',
        'Eleven: the anonymisation counts two words, laughter in brackets and the noise drop out (counting rule)'),
        P('Wie viele Wörter der Name hatte, ist unbekannt. Darum zählt die Anonymisierung als ein Wort, nicht als zwei.',
          'How many words the name had is unknown. That is why the anonymisation counts as one word, not two.')),
      a(P('Zwölf: Die Anonymisierung zählt ein Wort, Lachen in Klammern fällt weg, das Geräusch zählt mit (Zählregel)',
        'Twelve: the anonymisation counts one word, laughter in brackets drops out, the noise counts (counting rule)'),
        P('Ein Geräusch hat die befragte Person nicht gesprochen. Es fällt weg wie das Lachen.',
          'The respondent did not speak a noise. It drops out like the laughter.')),
      a(P('Vierzehn: Die Anonymisierung zählt ein Wort, Lachen in Klammern und Geräusch zählen mit (Zählregel)',
        'Fourteen: the anonymisation counts one word, laughter in brackets and the noise count (counting rule)'),
        P('Lachen und Geräusch sind nicht gesprochen. Statable zählt nach einer festen Regel nur Gesprochenes.',
          'Laughter and noise are not spoken. Statable counts only what was spoken, by a fixed rule.'))
    ],
    hilfe: ['eh-transkription-genau'], belege: H
  },
  {
    id: 'eh-tg-zaehlen-form', thema: 'erheben',
    stamm: P('Wie zählt Statable bei der befragten Person ein gedehntes Wort wie „  s o  “ und das gegenderte Wort „Lehrer:innen“?',
      'How does Statable count, for the respondent, a stretched word such as “  s o  ” and the gendered word “Lehrer:innen”?'),
    antworten: [
      a(P('Das gedehnte Wort als zwei Wörter und das gegenderte als zwei Wörter, weil beide Teile haben (Teilung)',
        'The stretched word as two words and the gendered word as two words, because both have parts (splitting)'),
        P('Beide haben Teile, zählen aber trotzdem als je ein Wort: Es sind ein gesprochenes Wort und eine Schreibweise.',
          'Both have parts but still count as one word each: one spoken word and one way of writing.')),
      a(P('Das gedehnte Wort als zwei Wörter und das gegenderte als ein Wort, weil der Doppelpunkt nicht trennt (Leerzeichen)',
        'The stretched word as two words and the gendered word as one word, because the colon does not separate (space)'),
        P('Auch das gedehnte Wort wird vor dem Zählen zusammengezogen. Die Leerzeichen sind nur die Schreibweise der Dehnung.',
          'The stretched word is also drawn together before counting. The spaces are just the way of writing the stretching.')),
      a(P('Das gedehnte Wort als ein Wort und das gegenderte als zwei Wörter, weil „innen“ ein Wort für sich ist (Doppelpunkt)',
        'The stretched word as one word and the gendered word as two words, because “innen” is a word of its own (colon)'),
        P('Der Doppelpunkt zwischen Buchstaben trennt nicht. „Lehrer:innen“ ist ein Wort.',
          'The colon between letters does not separate. “Lehrer:innen” is one word.')),
      a(P('Beide als je ein Wort: das gedehnte wird vorher zusammengezogen, das gegenderte bleibt ganz (Wortbildung)',
        'Both as one word each: the stretched one is drawn together first, the gendered one stays whole (word formation)'),
        P('So steht es in der Zählregel: Beide sind je ein gesprochenes Wort.',
          'That is what the counting rule says: both are one spoken word each.'), true)
    ],
    hilfe: ['eh-transkription-genau'], belege: H
  },
  {
    id: 'eh-tg-zeilen', thema: 'erheben',
    stamm: P('Statable gibt ein Transkript nach Froschauer und Lueger als Word aus. Wie kommen die Zeilennummern in die Datei?',
      'Statable outputs a transcript after Froschauer and Lueger as Word. How do the line numbers get into the file?'),
    antworten: [
      a(P('Als nummerierte Liste von Word, bei der jeder Absatz automatisch eine Nummer bekommt (Zeilennummerierung)',
        'As a numbered list in Word, where each paragraph gets a number automatically (line numbering)'),
        P('Eine Liste nummeriert Absätze, nicht Zeilen, und ein Screenreader liest jede Nummer mit.',
          'A list numbers paragraphs, not lines, and a screen reader reads out every number.')),
      a(P('In einer eigenen Tabellenspalte neben dem Text, in der Zeile für Zeile eine Nummer steht (Zeilennummerierung)',
        'In a column of its own next to the text, holding a number line by line (line numbering)'),
        P('Eine Tabelle mit Nummern wäre Layout statt Struktur und für Screenreader mühsam.',
          'A table with numbers would be layout instead of structure and tiresome for screen readers.')),
      a(P('Als fortlaufende Zeilennummerierung von Word, die Word selbst an den Rand jeder Zeile setzt (Zeilennummerierung)',
        'As Word’s continuous line numbering, which Word itself places at the margin of each line (line numbering)'),
        P('So sind die Nummern echte Eigenschaft des Dokuments: Zitate lassen sich mit Zeilen belegen, und der Text bleibt rein.',
          'This makes the numbers a real property of the document: quotations can be referenced with lines, and the text stays clean.'), true),
      a(P('Als Nummer in einem Textfeld am Rand neben jeder Zeile, das beim Drucken mitläuft (Zeilennummerierung)',
        'As a number in a text box at the margin next to each line, which is printed along (line numbering)'),
        P('Ein Textfeld ist ein eigenes Zeichenobjekt: Es verrutscht leicht, und ein Screenreader liest es mit.',
          'A text box is a drawing object of its own: it slips easily, and a screen reader reads it out.'))
    ],
    hilfe: ['eh-transkription-genau'], belege: H
  }
];
