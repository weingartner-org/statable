/**
 * Üben: Welcher Daten-Assistent passt zu meiner Aufgabe, und was tut er mit meinen Daten? (Funktionsfragen, Charge 4, 01.11.2026)
 * Zusammenführen, Aggregieren, Doppelte Fälle, Datensätze vergleichen, Fälle und Kontrollen abgleichen, Eigenschaften übernehmen, Fälle auswählen,
 * Sortieren, Ränge, Zählen, Berechnen, Fehlendcodes, Auffällige Fälle, Plausibilität, Datum und Zeit, Verschieben und glätten, Klassifikation,
 * Mikrodaten, Seite "Befehle". Quelle: die Hilfe-Artikel, das Fachblatt WELLE5-DATEN-ASSISTENTEN und die Assistenten selbst (Knopfnamen und Hinweise
 * in `bausteine/Assistent*.svelte`). Ohne Zahlen aus Rechnungen und ohne Tabellen.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

export const FRAGEN: Frage[] = [
  // ---- Zusammenführen, Aggregieren ----
  {
    id: 'da-zus-wahl', thema: 'datenwerkzeuge',
    stamm: P('Zwei Dateien haben dieselben Spalten und enthalten verschiedene Personen. Welche Wahl im Assistenten "Zusammenführen" passt?',
      'Two files have the same columns and contain different people. Which choice in the assistant "Merge" fits?'),
    antworten: [
      a(P('"Fälle anhängen (gleiche Spalten)": Die zweite Datei wird unter die erste gesetzt', '"Append cases (same columns)": the second file is placed below the first'),
        P('Spalten werden nach dem Namen zugeordnet; steht eine nur in einer Datei, bleibt sie für die anderen Fälle leer. Zahl gegen Text in derselben Spalte ist gesperrt.',
          'Columns are matched by name; if one occurs in only one file, it stays empty for the other cases. A number against text in the same column is blocked.'), true),
      a(P('"Spalten hinzufügen (über eine Kennung)": Die Spalten der zweiten Datei kommen daneben', '"Add columns (by an ID)": the columns of the second file are added alongside'),
        P('Das passt zu denselben Personen mit verschiedenen Spalten. Hier sind die Spalten gleich und die Personen verschieden.',
          'That suits the same people with different columns. Here the columns are the same and the people differ.')),
      a(P('"Aggregieren": Die zweite Datei wird zu Kennwerten je Gruppe zusammengefasst und angefügt', '"Aggregate": the second file is summarised into statistics per group and attached'),
        P('Aggregieren berechnet Kennwerte je Gruppe aus einer Datei. Es verbindet keine zwei Dateien.',
          'Aggregating calculates statistics per group from one file. It does not connect two files.'))
    ],
    hilfe: ['daten-vorbereiten'], belege: ['Hilfe:daten-vorbereiten', 'Fachblatt:WELLE5-DATEN-ASSISTENTEN', 'Code:bausteine/AssistentZusammen.svelte']
  },
  {
    id: 'da-zus-kennung', thema: 'datenwerkzeuge',
    stamm: P('Zwei Dateien mit denselben Personen sollen über eine Kennung zusammengelegt werden. Was prüft Statable vorher?',
      'Two files with the same people are to be combined by an ID. What does Statable check beforehand?'),
    antworten: [
      a(P('Ob Kennungen doppelt vorkommen (Sperre mit Liste), und wie viele Kennungen keinen Partner haben', 'Whether IDs occur twice (block with a list), and how many IDs have no partner'),
        P('Bei "Eine Zeile je Kennung in beiden Dateien" kommen Kennungen nur in der zweiten Datei als eigene Zeilen ans Ende; alle Fälle beider Dateien bleiben.',
          'With "One row per ID in both files" IDs found only in the second file are added as their own rows at the end; all cases of both files remain.'), true),
      a(P('Ob beide Dateien gleich viele Zeilen haben, denn bei verschiedener Zeilenzahl bricht Statable ab', 'Whether both files have the same number of rows, since Statable stops if the row counts differ'),
        P('Verschieden viele Zeilen sind erlaubt: Kennungen ohne Partner werden gezählt und genannt.',
          'Different numbers of rows are allowed: IDs without a partner are counted and named.')),
      a(P('Ob die Kennung eine Zahl ist, denn Text wird als Kennung grundsätzlich nicht verglichen', 'Whether the ID is a number, since text is fundamentally not compared as an ID'),
        P('Die Kennung kann auch Text sein. Geprüft werden doppelte Kennungen und Kennungen ohne Partner.',
          'The ID can also be text. What is checked are duplicate IDs and IDs without a partner.'))
    ],
    hilfe: ['daten-vorbereiten'], belege: ['Hilfe:daten-vorbereiten', 'Fachblatt:WELLE5-DATEN-ASSISTENTEN', 'Code:bausteine/AssistentZusammen.svelte']
  },
  {
    id: 'da-zus-viele', thema: 'datenwerkzeuge',
    stamm: P('Einer Datei mit Kindern sollen Angaben zur Klasse zugefügt werden; mehrere Kinder gehören zu einer Klasse. Welche Wahl passt bei "Spalten hinzufügen"?',
      'Information about the class is to be added to a file of children; several children belong to one class. Which choice fits for "Add columns"?'),
    antworten: [
      a(P('"Viele zu einer (mehrere Personen je Klasse)" für mehrere Kinder je Klasse', '"Many to one (several people per class)" for several children per class'),
        P('Diese Wahl ist für mehrere Personen je Klasse gedacht. Kennungen nur in der zweiten Datei fehlen dann im Ergebnis.', 'This choice is meant for several people per class. IDs found only in the second file are then missing from the result.'), true),
      a(P('"Eine Zeile je Kennung in beiden Dateien", passend zu genau einer Zeile je Klasse', '"One row per ID in both files", fitting exactly one row per class'),
        P('Sie setzt voraus, dass jede Kennung in jeder Datei einmal vorkommt. Bei mehreren Kindern je Klasse gäbe es eine Sperre wegen doppelter Kennungen.',
          'It assumes that each ID occurs once in each file. With several children per class there would be a block because of duplicate IDs.')),
      a(P('"Fälle anhängen (gleiche Spalten)", passend zu Dateien mit derselben Spaltenzahl', '"Append cases (same columns)", fitting files with the same number of columns'),
        P('Anhängen setzt die zweite Datei unter die erste. Es verbindet keine Angaben zur selben Klasse.',
          'Appending places the second file below the first. It does not connect information about the same class.'))
    ],
    hilfe: ['daten-vorbereiten'], belege: ['Hilfe:daten-vorbereiten', 'Fachblatt:WELLE5-DATEN-ASSISTENTEN', 'Code:bausteine/AssistentZusammen.svelte']
  },
  {
    id: 'da-agg-wahl', thema: 'datenwerkzeuge',
    stamm: P('Jede Person soll in einer neuen Spalte den Klassenmittelwert ihrer Klasse bekommen. Welcher Assistent und welche Wahl?',
      'Each person is to get the class mean of their class in a new column. Which assistant and which choice?'),
    antworten: [
      a(P('"Aggregieren" mit "Als neue Spalten anlegen": Jede Person bekommt den Wert ihrer Gruppe', '"Aggregate" with "Add as new columns": every person gets the group value'),
        P('Die andere Wahl, "Als neues Projekt öffnen", macht eine Zeile je Gruppe; das bisherige Projekt bleibt dann unverändert.', 'The other choice, "Open as a new project", makes one row per group; the existing project then remains unchanged.'), true),
      a(P('"Berechnen" mit der Funktion MEAN über die Spalten, die zu der Klasse gehören', '"Calculate" with the function MEAN over the columns that belong to the class'),
        P('MEAN(a, b) bildet den Mittelwert über mehrere Spalten derselben Zeile, nicht über die Fälle einer Klasse.',
          'MEAN(a, b) forms the mean across several columns of the same row, not across the cases of a class.')),
      a(P('"Zusammenführen" mit "Fälle anhängen (gleiche Spalten)", und der Mittelwert folgt dann von selbst', '"Merge" with "Append cases (same columns)", and the mean then follows by itself'),
        P('Anhängen verlängert die Datei um Fälle und berechnet keine Kennwerte je Gruppe.',
          'Appending lengthens the file by cases and does not calculate statistics per group.'))
    ],
    hilfe: ['daten-vorbereiten'], belege: ['Hilfe:daten-vorbereiten', 'Fachblatt:WELLE5-DATEN-ASSISTENTEN', 'Code:bausteine/AssistentAggregieren.svelte']
  },
  {
    id: 'da-agg-faelle', thema: 'datenwerkzeuge',
    stamm: P('Im Assistenten "Aggregieren" stehen "Fälle" und "gültige Werte" zur Wahl. Worin unterscheiden sie sich?',
      'In the assistant "Aggregate" "cases" and "valid values" are available. How do they differ?'),
    antworten: [
      a(P('"Fälle" zählt alle Fälle der Gruppe, "gültige Werte" nur vorhandene Werte', '"Cases" counts all cases of the group, "valid values" only existing values'),
        P('Fälle ohne Gruppenangabe bilden eine eigene Gruppe. Ein Median ohne gültigen Wert bleibt leer.', 'Cases without a group value form a group of their own. A median without a valid value stays empty.'), true),
      a(P('"Fälle" zählt die Gruppen, und "gültige Werte" zählt die Fälle innerhalb jeder Gruppe', '"Cases" counts the groups, and "valid values" counts the cases within each group'),
        P('Gruppen werden nicht gezählt. "Fälle" zählt die Fälle je Gruppe, auch mit fehlenden Werten.',
          'Groups are not counted. "Cases" counts the cases per group, including those with missing values.')),
      a(P('Beide zählen dasselbe, nur "gültige Werte" gewichtet die Fälle mit dem Fallgewicht', 'Both count the same, only "valid values" weights the cases with the case weight'),
        P('Sie zählen Verschiedenes. Bei fehlenden Werten einer Spalte ist die Zahl der gültigen Werte kleiner als die der Fälle.',
          'They count different things. With missing values in a column the number of valid values is smaller than the number of cases.'))
    ],
    hilfe: ['daten-vorbereiten'], belege: ['Hilfe:daten-vorbereiten', 'Fachblatt:WELLE5-DATEN-ASSISTENTEN', 'Code:bausteine/AssistentAggregieren.svelte']
  },
  {
    id: 'da-dop-mark', thema: 'datenwerkzeuge',
    stamm: P('Was macht der Assistent "Doppelte Fälle" mit Wiederholungen?', 'What does the assistant "Duplicate cases" do with repeats?'),
    antworten: [
      a(P('Er markiert sie in einer neuen Spalte (0 = erster Fall, 1 = Wiederholung)', 'It marks them in a new column (0 = first case, 1 = repeat)'),
        P('Zum Löschen dient "Wiederholungen löschen", mit Rückfrage. Fälle mit fehlendem Wert in den gewählten Spalten werden nie als doppelt markiert.', 'Deleting is done with "Delete repeats", with a confirmation. Cases with a missing value in the chosen columns are never marked as duplicates.'), true),
      a(P('Er löscht die Wiederholungen sofort und zeigt danach die Zahl der entfernten Fälle an', 'It deletes the repeats immediately and afterwards shows the number of removed cases'),
        P('Nichts wird gelöscht, solange das nicht ausdrücklich gewählt ist. Das Ergebnis ist zuerst eine Markierspalte.',
          'Nothing is deleted unless that is explicitly chosen. The result is first a marker column.')),
      a(P('Er markiert alle Fälle einer Gruppe gleicher Fälle mit 1, auch den ersten Fall davon', 'It marks all cases of a group of identical cases with 1, including the first of them'),
        P('Der erste Fall bekommt 0, erst die Wiederholungen bekommen 1. So bleibt ein Fall je Gruppe erhalten.',
          'The first case gets 0, only the repeats get 1. This way one case per group is kept.'))
    ],
    hilfe: ['daten-vorbereiten'], belege: ['Hilfe:daten-vorbereiten', 'Fachblatt:WELLE5-DATEN-ASSISTENTEN', 'Code:bausteine/AssistentDoppelte.svelte']
  },
  // ---- Datensätze vergleichen, Abgleich, Eigenschaften ----
  {
    id: 'da-ver-wann', thema: 'datenwerkzeuge',
    stamm: P('Derselbe Fragebogen wurde zweimal eingegeben. Welcher Assistent zeigt, wo die beiden Eingaben abweichen?', 'The same questionnaire was entered twice. Which assistant shows where the two entries differ?'),
    antworten: [
      a(P('"Datensätze vergleichen": zeigt jede abweichende Zelle über eine Schlüsselspalte, Daten bleiben', '"Compare datasets": shows every deviating cell via a key column, data stay unchanged'),
        P('Datei 1 sind die offenen Daten, Datei 2 wird gewählt. Die Liste der Abweichungen lässt sich als CSV speichern.', 'File 1 is the open data, file 2 is chosen. The list of deviations can be saved as CSV.'), true),
      a(P('"Doppelte Fälle": markiert die abweichenden Zellen in beiden Dateien und legt eine Markierspalte an', '"Duplicate cases": marks the deviating cells in both files and creates a marker column'),
        P('"Doppelte Fälle" sucht gleiche Fälle innerhalb einer Datei, nicht abweichende Zellen zwischen zwei Dateien.',
          'The assistant "Duplicate cases" looks for identical cases within one file, not for deviating cells between two files.')),
      a(P('"Zusammenführen": gleicht die Abweichungen zwischen den Eingaben an und speichert die Mitte', '"Merge": reconciles the deviations between the entries and saves the middle'),
        P('Zusammenführen verbindet Dateien, gleicht aber nichts an. Der Vergleich dagegen ändert keine Daten.',
          'Merging connects files but reconciles nothing. The comparison, by contrast, changes no data.'))
    ],
    hilfe: ['datensaetze-vergleichen'], belege: ['Hilfe:datensaetze-vergleichen', 'Fachblatt:WELLE5-DATEN-ASSISTENTEN']
  },
  {
    id: 'da-ver-regeln', thema: 'datenwerkzeuge', mehrfach: true,
    stamm: P('Welche Aussagen zum Assistenten "Datensätze vergleichen" stimmen? Mehrere können stimmen.', 'Which statements about the assistant "Compare datasets" are correct? Several may be correct.'),
    antworten: [
      a(P('Kommt ein Schlüssel doppelt vor, vergleicht Statable nicht und nennt die Schlüssel', 'If a key occurs twice, Statable does not compare and names the keys'),
        P('Der Schlüssel muss jeden Fall eindeutig nennen, zum Beispiel eine Nummer.',
          'The key must name each case uniquely, for example a number.'), true),
      a(P('Ohne Schlüssel wird nach der Zeilennummer verglichen, bei gleicher Zeilenzahl und mit Hinweis', 'Without a key the comparison uses the row number, only with equal row counts and with a note'),
        P('Das ist der Notweg. Besser ist eine Schlüsselspalte, die jeden Fall eindeutig nennt.',
          'That is the fallback. A key column that names each case uniquely is better.'), true),
      a(P('Text wird von Anfang an ohne Beachtung von Groß- und Kleinschreibung verglichen', 'Text is compared from the start without regard to upper and lower case'),
        P('Text muss zunächst genau gleich sein. Die Option "Leerzeichen am Rand und Groß/Klein nicht beachten" ist zunächst aus.',
          'Text must at first be exactly equal. The option "Ignore spaces at the edges and upper/lower case" is off at first.')),
      a(P('Zwei leere Zellen gelten als Abweichung zwischen den Dateien', 'Two empty cells count as a deviation between the files'),
        P('Beide Zellen leer gelten als gleich. Zahlen sind gleich, wenn der gelesene Wert gleich ist.',
          'Both cells empty count as equal. Numbers are equal if the value read is equal.'))
    ],
    hilfe: ['datensaetze-vergleichen'], belege: ['Hilfe:datensaetze-vergleichen', 'Fachblatt:WELLE5-DATEN-ASSISTENTEN']
  },
  {
    id: 'da-abg-regel', thema: 'datenwerkzeuge',
    stamm: P('Der Assistent "Fälle und Kontrollen abgleichen" sucht zu jedem Fall passende Kontrollen. Wie entscheidet er, welche Kontrolle gewählt wird?',
      'The assistant "Match cases and controls" looks for suitable controls for each case. How does it decide which control is chosen?'),
    antworten: [
      a(P('Fälle der Reihe nach; unter den freien passenden Kontrollen gewinnt die mit dem kleinsten Abstand', 'Cases in order; among the free suitable controls the one with the smallest distance wins'),
        P('Bei Gleichstand gewinnt die Kontrolle in der kleinsten Zeile. Eine Kontrolle wird nur einmal benutzt. Das Verfahren ist gierig und hängt von der Reihenfolge ab.',
          'In a tie the control in the smallest row wins. A control is used only once. The method is greedy and depends on the order.'), true),
      a(P('Es sucht das beste Gesamtergebnis für alle Paare zugleich und wählt danach die Kontrollen aus', 'It searches for the best overall result for all pairs at once and then selects the controls'),
        P('Es sucht gerade nicht das beste Gesamtergebnis; eine andere Reihenfolge kann andere Paare ergeben.',
          'It specifically does not search for the best overall result; another order can give other pairs.')),
      a(P('Es zieht für jeden Fall eine zufällige Kontrolle unter den passenden und wiederholt das bei Bedarf', 'It draws a random control among the suitable ones for each case and repeats this if necessary'),
        P('Es gibt keinen Zufall. Die Wahl folgt dem kleinsten Abstand und dann der kleinsten Zeile.',
          'There is no randomness. The choice follows the smallest distance and then the smallest row.'))
    ],
    hilfe: ['fallkontrolle-abgleich'], belege: ['Hilfe:fallkontrolle-abgleich', 'Fachblatt:KLASSIFIKATION-KARTEN']
  },
  {
    id: 'da-abg-warn', thema: 'datenwerkzeuge', mehrfach: true,
    stamm: P('Welche Aussagen zum Abgleich von Fällen und Kontrollen stimmen? Mehrere können stimmen.', 'Which statements about matching cases and controls are correct? Several may be correct.'),
    antworten: [
      a(P('Der Abgleich gleicht nur die gewählten Merkmale an; alles andere bleibt ungleich', 'The matching equalises only the chosen features; everything else remains unequal'),
        P('Eine Ursache zeigt der Abgleich nicht. Nur innerhalb der Gruppen zu vergleichen, die bleiben, ist kein Experiment.',
          'The matching shows no cause. Comparing only within the groups that remain is not an experiment.'), true),
      a(P('Fälle ohne Kontrolle fallen aus dem Vergleich und verändern, wen er beschreibt', 'Cases without a control drop out of the comparison and change whom it describes'),
        P('Die Ergebnistabelle nennt voll abgeglichene, teilweise abgeglichene und Fälle ohne Kontrolle.',
          'The result table gives fully matched, partly matched and cases without a control.'), true),
      a(P('Toleranz und Merkmale dürfen so lange geändert werden, bis das Ergebnis gefällt', 'Tolerance and features may be changed until the result is to one\'s liking'),
        P('Wer Toleranz und Merkmale so lange ändert, bis das Ergebnis gefällt, kann dem Ergebnis nicht mehr trauen.',
          'Anyone who changes tolerance and features until the result is pleasing can no longer trust the result.')),
      a(P('Danach genügt ein gewöhnlicher Vergleich zweier unabhängiger Gruppen', 'Afterwards an ordinary comparison of two independent groups suffices'),
        P('Die Auswertung danach muss den Abgleich berücksichtigen, zum Beispiel mit gepaarten oder bedingten Verfahren.',
          'The analysis afterwards has to take the matching into account, for example with paired or conditional methods.'))
    ],
    hilfe: ['fallkontrolle-abgleich'], belege: ['Hilfe:fallkontrolle-abgleich', 'Fachblatt:KLASSIFIKATION-KARTEN']
  },
  {
    id: 'da-eig', thema: 'datenwerkzeuge',
    stamm: P('Beschriftungen und Wertelabels einer anderen Datei sollen übernommen werden ("Eigenschaften übernehmen"). Was geschieht mit den Daten?',
      'Labels and value labels of another file are to be taken over ("Copy data properties"). What happens to the data?'),
    antworten: [
      a(P('Die Daten ändern sich nicht; Spalten werden nach Namen zugeordnet, fehlende nicht angelegt', 'The data do not change; columns are matched by name and missing ones are not created'),
        P('Übernommen wird, was gewählt ist: Beschriftung, Wertelabels, Keine Angabe, Messniveau. "Rückgängig" nimmt den Schritt zurück.', 'What is chosen is taken over: label, value labels, no-answer codes, level of measurement. "Undo" reverses the step.'), true),
      a(P('Spalten der Quelle, die in den Daten fehlen, werden neu angelegt und mit Werten gefüllt', 'Columns of the source that are missing in the data are created anew and filled with values'),
        P('Spalten der Quelle, die in den offenen Daten fehlen, werden nicht angelegt.',
          'Columns of the source that are missing in the open data are not created.')),
      a(P('Die Werte der offenen Daten werden mit denen der Quelle überschrieben, wenn die Namen passen', 'The values of the open data are overwritten with those of the source if the names match'),
        P('Es werden nur Eigenschaften übertragen, keine Werte. Passt die Art nicht (Text gegen Zahl), werden Wertelabels und Codes dieser Spalte nicht übernommen.',
          'Only properties are transferred, no values. If the type does not match (text against number), value labels and codes of that column are not taken over.'))
    ],
    hilfe: ['eigenschaften-uebernehmen'], belege: ['Hilfe:eigenschaften-uebernehmen']
  },
  // ---- Auswählen, Sortieren, Ränge, Zählen, Berechnen ----
  {
    id: 'da-aus-filter', thema: 'datenwerkzeuge',
    stamm: P('Im Assistenten "Fälle auswählen" wird die Bedingung "Alter mindestens 18" gewählt. Was legt Statable mit "Auswahlspalte anlegen" an?',
      'In the assistant "Select cases" the condition "age at least 18" is chosen. What does Statable create with "Add selection column"?'),
    antworten: [
      a(P('Eine Spalte (1 = erfüllt, 0 = nicht erfüllt, leer = nicht prüfbar), kein unsichtbarer Filter', 'A column (1 = met, 0 = not met, blank = cannot be checked), no invisible filter'),
        P('Nicht jede Rechnung in Statable würde einen unsichtbaren Filter beachten. Die Spalte lässt sich als Gruppe oder Bedingung nutzen.', 'Not every calculation in Statable would respect an invisible filter. The column can be used as a group or condition.'), true),
      a(P('Einen unsichtbaren Filter, den alle Rechnungen in Statable von da an automatisch beachten', 'An invisible filter that all calculations in Statable from then on respect automatically'),
        P('Gerade das gibt es nicht: Ein unsichtbarer Filter würde nicht überall beachtet und wäre darum trügerisch.',
          'That is exactly what does not exist: an invisible filter would not be respected everywhere and would therefore be deceptive.')),
      a(P('Eine neue Datei, die nur die gewählten Fälle enthält und die bisherige Datei unverändert lässt', 'A new file that contains only the chosen cases and leaves the existing file unchanged'),
        P('Es entsteht eine Auswahlspalte in den Daten. Die übrigen Fälle werden nur auf ausdrückliche Wahl entfernt.',
          'A selection column arises in the data. The other cases are removed only on explicit choice.'))
    ],
    hilfe: ['daten-vorbereiten'], belege: ['Hilfe:daten-vorbereiten', 'Fachblatt:WELLE5-DATEN-ASSISTENTEN', 'Code:bausteine/AssistentAuswahl.svelte']
  },

  {
    id: 'da-rang', thema: 'datenwerkzeuge',
    stamm: P('Im Assistenten "Ränge bilden" gibt es das "Rangprozent (SPSS)", und die Karte Normwerte hat den "Prozentrang (Mitte)". Beide rechnen etwas anderes. Worin liegt der Unterschied?',
      'The assistant "Compute ranks" has the "rank percent (SPSS)", and the Norm values card has the "percentile rank (middle)". They calculate differently. What is the difference?'),
    antworten: [
      a(P('Beim Rangprozent hat der höchste Wert 100; der Prozentrang (Mitte) bleibt darunter', 'With the rank percent the highest value has 100; the percentile rank (middle) stays below'),
        P('Rangprozent ist Rang geteilt durch die Fallzahl mal 100. Der Prozentrang (Mitte) rechnet (Rang minus ein halber) durch die Fallzahl mal 100. Beide sind richtig, aber nicht dasselbe.', 'Rank percent is rank divided by N times 100. The percentile rank (middle) calculates (rank minus a half) divided by N times 100. Both are correct, but not the same.'), true),
      a(P('Das Rangprozent rechnet mit Fallgewicht, der Prozentrang (Mitte) rechnet dagegen ohne Fallgewicht', 'The rank percent uses the case weight, the percentile rank (middle) by contrast uses none'),
        P('Ränge werden ohne Fallgewicht gebildet; ein aktives Fallgewicht wird dafür kurz ausgeschaltet. Der Unterschied liegt in der Formel.',
          'Ranks are formed without case weight; an active case weight is switched off briefly for this. The difference lies in the formula.')),
      a(P('Das Rangprozent gilt für Zahlenspalten, der Prozentrang (Mitte) dagegen für Textspalten', 'The rank percent applies to number columns, the percentile rank (middle) to text columns'),
        P('Beide beziehen sich auf Werte einer Zahlenspalte. Verschieden ist nur, wie der Rang in einen Prozentwert umgerechnet wird.',
          'Both refer to values of a number column. They differ only in how the rank is converted to a percentage.'))
    ],
    hilfe: ['spss-menue'], belege: ['Hilfe:spss-menue', 'Fachblatt:SPAETER-C-TABELLEN-FRAGEBOGEN', 'Code:bausteine/AssistentRang.svelte']
  },

  {
    id: 'da-ber-fehlend', thema: 'datenwerkzeuge',
    stamm: P('Im Assistenten "Berechnen" fehlt in einer Zeile der Wert von b. Was ergeben a + b und MEAN(a, b)?', 'In the assistant "Calculate" the value of b is missing in a row. What do a + b and MEAN(a, b) give?'),
    antworten: [
      a(P('a + b ist leer; MEAN(a, b) rechnet mit den vorhandenen Werten weiter', 'a + b is empty; MEAN(a, b) calculates on with the existing values'),
        P('Ein Rechenausdruck wie a + b ist leer, sobald ein Wert fehlt. Funktionen wie MEAN, SUM, MIN und MAX rechnen mit den vorhandenen Werten.', 'An expression such as a + b is empty as soon as a value is missing. Functions such as MEAN, SUM, MIN and MAX calculate with the existing values.'), true),
      a(P('Beide sind leer, weil für diese Zeile ein Wert fehlt und Statable nicht schätzt', 'Both are empty, because a value is missing for this row and Statable does not estimate'),
        P('MEAN rechnet mit den vorhandenen Werten, die Standardabweichung allerdings braucht mindestens zwei.',
          'MEAN calculates with the existing values, whereas the standard deviation needs at least two.')),
      a(P('a + b rechnet mit 0 für b; MEAN(a, b) ist dagegen leer, weil ein Wert fehlt', 'a + b uses 0 for b; MEAN(a, b) on the other hand is empty because a value is missing'),
        P('Es ist umgekehrt. Ein fehlender Wert wird nie still durch 0 ersetzt.',
          'It is the other way round. A missing value is never silently replaced by 0.'))
    ],
    hilfe: ['daten-vorbereiten'], belege: ['Hilfe:daten-vorbereiten', 'Fachblatt:WELLE5-DATEN-ASSISTENTEN']
  },
  // ---- Fehlende Werte, auffällige Fälle, Plausibilität ----
  {
    id: 'da-fc', thema: 'datenwerkzeuge',
    stamm: P('Eine Spalte enthält -9 für "keine Antwort". Was tut der Assistent "Fehlendcodes setzen"?', 'A column contains -9 for "no answer". What does the assistant "Set missing codes" do?'),
    antworten: [
      a(P('Er markiert -9 als "keine Angabe": Kein Wert ändert sich, nur seine Bedeutung', 'It marks -9 as "no answer": no value changes, only its meaning'),
        P('Mit der Markierung zählt -9 in allen Rechnungen als fehlend. "Rückgängig" stellt alles wieder her.',
          'With the marking -9 counts as missing in all calculations. "Undo" restores everything.'), true),
      a(P('Er löscht die Werte -9 aus den Daten, damit sie in keiner Rechnung mehr vorkommen', 'It deletes the values -9 from the data so that they no longer appear in any calculation'),
        P('Die Werte bleiben in den Daten sichtbar. Nur ihre Bedeutung ändert sich.',
          'The values remain visible in the data. Only their meaning changes.')),
      a(P('Er ersetzt -9 durch den Mittelwert der Spalte und füllt die Lücken so auf', 'It replaces -9 with the mean of the column and fills the gaps in that way'),
        P('Statable schätzt keine fehlenden Antworten. Wo eine Antwort fehlt, bleibt sie leer.',
          'Statable estimates no missing answers. Where an answer is missing, it stays empty.'))
    ],
    hilfe: ['keine-angabe-bereich'], belege: ['Hilfe:keine-angabe-bereich', 'Fachblatt:SPAETER-C-TABELLEN-FRAGEBOGEN', 'Code:bausteine/AssistentFehlendcodes.svelte']
  },
  {
    id: 'da-auff', thema: 'datenwerkzeuge',
    stamm: P('Was leistet der Assistent "Auffällige Fälle"?', 'What does the assistant "Conspicuous cases" do?'),
    antworten: [
      a(P('Er zeigt Hinweise (Tippfehler, gleiche Kreuze, seltsame Kombinationen), löscht nichts', 'It shows hints (typing errors, identical ticks, unusual combinations) and deletes nothing'),
        P('Auffällig heißt nicht falsch. Regeln für den Ausschluss von Fällen sollen vorher festgelegt werden, nicht nach dem Blick auf die Ergebnisse.', 'Conspicuous does not mean wrong. Rules for excluding cases should be fixed beforehand, not after looking at the results.'), true),
      a(P('Er erkennt fehlerhafte Fälle sicher und schließt sie auf Wunsch aus den Daten aus', 'It detects faulty cases reliably and excludes them from the data on request'),
        P('Ob ein Fall fehlerhaft ist, entscheidet die Person. Der Assistent legt auf Wunsch Kennzeichnungsspalten an.',
          'Whether a case is faulty is decided by the person. On request the assistant creates flag columns.')),
      a(P('Er ersetzt auffällige Werte durch den Median der Spalte, damit sie keinen Einfluss haben', 'It replaces conspicuous values with the median of the column so that they have no influence'),
        P('Statable ersetzt nichts. Es zeigt nur Hinweise.',
          'Statable replaces nothing. It only shows hints.'))
    ],
    hilfe: ['daten-check'], belege: ['Hilfe:daten-check', 'Fachblatt:KLASSIFIKATION-KARTEN', 'Code:bausteine/AssistentAuffaellig.svelte']
  },
  {
    id: 'da-pl-nicht', thema: 'datenwerkzeuge',
    stamm: P('Beim Assistenten "Plausibilität prüfen" stehen je Regel drei Zahlen: geprüft, verletzt und eine dritte für Zeilen ohne Prüfergebnis. Was bedeutet die dritte?', 'In the assistant "Check plausibility" each rule shows three numbers: checked, violated and a third one for rows without a check result. What does the third mean?'),
    antworten: [
      a(P('Ein von der Regel gebrauchter Wert fehlt in der Zeile; weder verletzt noch erfüllt', 'A value needed by the rule is missing in the row; neither violated nor satisfied'),
        P('Je Regel stehen drei Zahlen: geprüft, verletzt und nicht prüfbar. Bei "Wenn A, dann B" ist die Regel erfüllt, wo A nicht zutrifft.', 'For each rule three numbers appear: checked, violated and cannot be checked. For "If A, then B" the rule is satisfied where A does not apply.'), true),
      a(P('Die Regel ist falsch formuliert, verweist auf eine fehlende Spalte und wird daher übersprungen', 'The rule is wrongly formulated, refers to a missing column and is therefore skipped'),
        P('Eine Regel, die auf eine fehlende Spalte verweist oder nicht zur Art der Spalte passt, wird mit einem Satz zum Grund nicht geprüft. "Nicht prüfbar" meint einzelne Zeilen.',
          'A rule that refers to a missing column or does not fit the type of the column is not checked, with a sentence giving the reason. "not checkable" refers to single rows.')),
      a(P('Die Zeile verletzt die Regel in einer Weise, die der Assistent nicht näher eingrenzen kann', 'The row violates the rule in a way that the assistant cannot narrow down further'),
        P('Verletzte Zeilen stehen in einer eigenen Zahl. Nicht prüfbare Zeilen zählen nicht als verletzt.',
          'Violated rows appear in a number of their own. Rows that cannot be checked do not count as violated.'))
    ],
    hilfe: ['plausibilitaet'], belege: ['Hilfe:plausibilitaet', 'Fachblatt:KLASSIFIKATION-KARTEN']
  },
  {
    id: 'da-pl-mehrfach', thema: 'datenwerkzeuge', mehrfach: true,
    stamm: P('Welche Aussagen zum Assistenten "Plausibilität prüfen" stimmen? Mehrere können stimmen.', 'Which statements about the assistant "Check plausibility" are correct? Several may be correct.'),
    antworten: [
      a(P('Es gibt feste Regelarten, zum Beispiel Wertebereich, erlaubte Werte und eindeutiger Schlüssel', 'There are fixed kinds of rules, for example value range, allowed values and unique key'),
        P('Hinzu kommen "Wenn A, dann B" und "Summe gleich Spalte". Einen freien Ausdruck gibt es nicht.',
          'Added are "If A, then B" and "Sum equals column". There is no free expression.'), true),
      a(P('Eine erfüllte Regel beweist nicht, dass der Wert stimmt', 'A satisfied rule does not prove that the value is right'),
        P('Statable zeigt nur, wo eine Regel nicht erfüllt ist. Ob ein Wert falsch ist und was dann gilt, entscheidet die Person.',
          'Statable only shows where a rule is not satisfied. Whether a value is wrong and what then applies is decided by the person.'), true),
      a(P('Verletzte Werte korrigiert Statable auf Wunsch von selbst', 'Statable corrects violated values by itself on request'),
        P('Der Assistent ändert an den Daten nichts. Auf Wunsch entsteht nur eine Spalte mit der Zahl der verletzten Regeln je Zeile.',
          'The assistant changes nothing in the data. On request only a column with the number of violated rules per row is created.')),
      a(P('Die Regeln gelten nur für die aktuelle Sitzung und lassen sich nicht weitergeben', 'The rules apply only for the current session and cannot be passed on'),
        P('Die Regeln gehören zum Projekt. Mit "Regeln als Datei speichern" lassen sie sich weitergeben, und "Regeln aus Datei lesen" fügt gelesene Regeln hinzu.',
          'The rules belong to the project. With "Save rules as a file" they can be passed on, and "Read rules from a file" adds rules that have been read.'))
    ],
    hilfe: ['plausibilitaet'], belege: ['Hilfe:plausibilitaet', 'Fachblatt:KLASSIFIKATION-KARTEN']
  },
  // ---- Datum, Verschieben, Klassifikation, Mikrodaten ----
  {
    id: 'da-dat-alter', thema: 'datenwerkzeuge',
    stamm: P('Mit dem Assistenten "Datum und Zeit" wird das Alter berechnet. Eine Person ist an einem 29. Februar geboren, das Folgejahr hat keinen Schalttag. Wann wird sie ein Jahr älter?',
      'The age is calculated with the assistant "Date and time". A person was born on a 29 February, the following year has no leap day. When does she turn a year older?'),
    antworten: [
      a(P('Am 1. März: Gerechnet werden vollendete Einheiten, wie in SPSS', 'On 1 March: completed units are calculated, as in SPSS'),
        P('Am 28. Februar ist das Jahr noch nicht vollendet. Ist das Ergebnis negativ, liegt das erste Datum nach dem zweiten.',
          'On 28 February the year is not yet completed. If the result is negative, the first date lies after the second.'), true),
      a(P('Am 28. Februar, dem letzten Tag vor dem 1. März, weil dann das Jahr rund ist', 'On 28 February, the last day before 1 March, because the year is then complete'),
        P('Dann wäre das Jahr noch nicht vollendet. Statable zählt vollendete Einheiten.',
          'Then the year would not yet be completed. Statable counts completed units.')),
      a(P('Am 29. Februar des nächsten Schaltjahres, weil nur dann der Geburtstag wiederkehrt', 'On 29 February of the next leap year, because only then does the birthday recur'),
        P('Das Alter wird in vollendeten Jahren gerechnet und wächst jedes Jahr, nicht nur in Schaltjahren.',
          'Age is calculated in completed years and increases every year, not only in leap years.'))
    ],
    hilfe: ['excel-blatt-uhrzeit'], belege: ['Hilfe:excel-blatt-uhrzeit', 'Fachblatt:SPAETER-C-TABELLEN-FRAGEBOGEN', 'Code:bausteine/AssistentDatum.svelte']
  },
  {
    id: 'da-zeit-luecke', thema: 'datenwerkzeuge',
    stamm: P('Person B hat Messungen zu den Zeiten 1, 2, 4 und 5. Was ist beim Assistenten "Verschieben und glätten" in der Voreinstellung der "Vorwert" zur Zeit 4?',
      'Person B has measurements at times 1, 2, 4 and 5. In the assistant "Shift and smooth" what is the "previous value" at time 4 by default?'),
    antworten: [
      a(P('Der Wert zur Zeit 2, denn gerechnet wird nach der Reihenfolge der Messungen', 'The value at time 2, since the calculation follows the order of the measurements'),
        P('Nur mit der Wahl "nur wenn der Abstand genau k Zeiteinheiten beträgt" bleibt die Zelle leer. Statable zeigt über dem Ergebnis, bei wie vielen Personen Zeitpunkte fehlen.',
          'Only with the choice "only if the distance is exactly k time units" does the cell stay empty. Statable shows above the result how many people have missing time points.'), true),
      a(P('Leer, weil die Zeit 3 fehlt und der Vorwert genau eine Zeiteinheit davor liegen muss', 'Empty, because time 3 is missing and the previous value must lie exactly one time unit earlier'),
        P('Das ergibt nur die Wahl mit genauem Abstand. Voreingestellt gilt die Messung davor.',
          'Only the choice with an exact distance gives that. By default the previous measurement applies.')),
      a(P('Der Mittelwert der Zeiten 2 und 5, weil der Assistent die Lücke dazwischen ausgleicht', 'The mean of times 2 and 5, because the assistant evens out the gap between them'),
        P('Der Vorwert ist ein einzelner Wert, kein Mittelwert. Den Mittelwert bildet der gleitende Mittelwert.',
          'The previous value is a single value, not a mean. The mean is formed by the moving average.'))
    ],
    hilfe: ['verschieben-glaetten'], belege: ['Hilfe:verschieben-glaetten', 'Fachblatt:GLAETTUNG-SERIEN']
  },
  {
    id: 'da-kla-leer', thema: 'datenwerkzeuge',
    stamm: P('Beim Assistenten "Klassifikation zuordnen" bleibt für einen Code der Titel leer. Woran kann das liegen?', 'In the assistant "Assign a classification" the title stays empty for a code. What can be the reason?'),
    antworten: [
      a(P('Der Code wird nicht gefunden: kein Raten, keine ähnlichen Codes, Nullen können fehlen', 'The code is not found: no guessing, no search for similar codes, leading zeros may be lost'),
        P('Besser die Datei neu öffnen und die Spalte "als Text lesen". Statable zählt nicht gefundene Codes und nennt die ersten Beispiele.', 'Better reopen the file and "read the column as text". Statable counts codes not found and names the first examples.'), true),
      a(P('Statable ordnet bei unbekanntem Code den ähnlichsten Code zu, ein leerer Titel ist ein Fehler', 'For an unknown code Statable assigns the most similar code, an empty title is an error'),
        P('Es gibt kein Raten und keine Suche nach ähnlichen Codes. Ein nicht gefundener Code bleibt leer.',
          'There is no guessing and no search for similar codes. A code not found stays empty.')),
      a(P('ÖNACE 2008 und ÖNACE 2025 werden automatisch umgeschlüsselt, wobei manche Titel entfallen', 'ÖNACE 2008 and ÖNACE 2025 are converted automatically, and in the process some titles drop out'),
        P('Die beiden Fassungen sind nicht gleich, und Statable bietet keinen Umsteigeschlüssel. Eine Umschlüsselung findet nicht statt.',
          'The two versions are not the same, and Statable offers no conversion key. No conversion takes place.'))
    ],
    hilfe: ['klassifikation'], belege: ['Hilfe:klassifikation', 'Fachblatt:KLASSIFIKATION-KARTEN']
  },
  {
    id: 'da-mik-k', thema: 'datenwerkzeuge',
    stamm: P('Der Assistent "Mikrodaten schützen" arbeitet mit k-Anonymität. Welche Fälle werden entschärft?', 'The assistant "Protect microdata" works with k-anonymity. Which cases are defused?'),
    antworten: [
      a(P('Fälle, deren Kombination der Schlüsselmerkmale weniger als k-mal vorkommt', 'Cases whose combination of key features occurs fewer than k times'),
        P('Lokal unterdrücken leert bei diesen Fällen die am wenigsten wichtige Angabe, bis jede Kombination mindestens k-mal vorkommt.',
          'Local suppression empties the least important entry in these cases until every combination occurs at least k times.'), true),
      a(P('Alle Fälle mit Ausreißern in einer Zahlenspalte, weil sie leicht wiedererkannt werden', 'All cases with outliers in a number column, because they are easily recognised'),
        P('Das Kappen von Ausreißern ist ein eigener, wählbarer Schritt. Entschärft wird nach der Häufigkeit der Merkmalskombination.',
          'Capping outliers is a separate, optional step. Defusing follows the frequency of the combination of features.')),
      a(P('Alle Fälle, die eine direkte Kennung wie einen Namen enthalten und dadurch auffallen', 'All cases that contain a direct identifier such as a name and thus stand out'),
        P('Direkte Kennungen entfernt ein weiterer, wählbarer Schritt für ganze Spalten. k-Anonymität betrifft seltene Kombinationen.',
          'Direct identifiers are removed by a further optional step for entire columns. K-anonymity concerns rare combinations.'))
    ],
    hilfe: ['mikrodaten-schuetzen'], belege: ['Hilfe:mikrodaten-schuetzen', 'Fachblatt:MIKRODATEN-2026-10-24']
  },
  {
    id: 'da-mik-grenze', thema: 'datenwerkzeuge',
    stamm: P('Was leistet die k-Anonymität des Assistenten "Mikrodaten schützen" gegen die Wiedererkennung von Personen?', 'What does the k-anonymity of the assistant "Protect microdata" achieve against re-identification of people?'),
    antworten: [
      a(P('Sie schützt nicht vor allem; die zuständige Stelle prüft vor Weitergabe', 'It does not cover everything; the responsible body checks before release'),
        P('Welche Merkmale Schlüsselmerkmale sind, hängt von den Daten und vom Wissen möglicher Angreifer ab. Das entscheidet die Organisation, nicht Statable.', 'Which features are key features depends on the data and on the knowledge of possible attackers. The organisation decides that, not Statable.'), true),
      a(P('Sobald k mindestens 3 beträgt, ist jede Wiedererkennung ausgeschlossen', 'As soon as k is at least 3, any re-identification is ruled out'),
        P('Eine Garantie gibt Statable nicht; vor der Weitergabe prüft die zuständige Stelle.',
          'Statable gives no guarantee; before disclosure the responsible body checks.')),
      a(P('Sind zusätzlich die direkten Kennungen entfernt, ist der Schutz vollständig', 'If the direct identifiers have also been removed, the protection is complete'),
        P('k-Anonymität schützt nicht vor allem, auch mit entfernten Kennungen; die zuständige Stelle prüft vor der Weitergabe.',
          'K-anonymity does not protect against everything, even with identifiers removed; the responsible body checks before disclosure.'))
    ],
    hilfe: ['mikrodaten-schuetzen'], belege: ['Hilfe:mikrodaten-schuetzen', 'Fachblatt:MIKRODATEN-2026-10-24']
  },
  // ---- Befehle ----
  {
    id: 'da-bef-sps', thema: 'datenwerkzeuge',
    stamm: P('Eine .sps-Datei mit SPSS-Syntax soll in Statable laufen. Welcher Weg stimmt?', 'An .sps file with SPSS syntax is to run in Statable. Which route is right?'),
    antworten: [
      a(P('Auf der Seite "Befehle": Daten öffnen, Datei öffnen, "Alle ausführen"; PSPP-fremdes läuft nicht', 'On the page "Commands": open data, open the file, "Run all"; what PSPP lacks does not run'),
        P('Statable führt PSPP-Befehle aus, keine SPSS-Skripte. Was PSPP nicht kennt, wird weggelassen oder umgeschrieben; jede Stelle steht mit Grund da ("Für PSPP angepasst").', 'Statable runs PSPP commands, not SPSS scripts. Parts PSPP does not know are left out or rewritten and each place is named with the reason ("Adjusted for PSPP").'), true),
      a(P('Unter "Daten bearbeiten" im Assistenten "Zusammenführen" die Datei als zweite Datei wählen', 'Under "Edit data" choose the file as the second file in the assistant "Merge"'),
        P('Zusammenführen verbindet Datendateien. Befehlsdateien öffnet die Seite "Befehle".',
          'Merging connects data files. The page "Commands" opens command files.')),
      a(P('Auf der Seite "Befehle" läuft jede SPSS-Syntax unverändert, auch Python-Programme und Erweiterungen', 'On the page "Commands" any SPSS syntax runs unchanged, including Python programs and extensions'),
        P('Python-Programme und SPSS-Erweiterungen laufen nicht. Was Zahlen ändern würde, bleibt stehen, und die Meldung erklärt den Fehler.',
          'Python programs and SPSS extensions do not run. What would change numbers is left as it is, and the message explains the error.'))
    ],
    hilfe: ['befehle-seite'], belege: ['Hilfe:befehle-seite']
  },
  {
    id: 'da-zus-mehrfach', thema: 'datenwerkzeuge', mehrfach: true,
    stamm: P('Welche Aussagen zum Assistenten "Zusammenführen" stimmen? Mehrere können stimmen.', 'Which statements about the assistant "Merge" are correct? Several may be correct.'),
    antworten: [
      a(P('Gleiche Spaltennamen außer der Kennung bekommen einen neuen Namen, vorgeschlagen wird _2', 'Identical column names other than the ID get a new name, _2 is suggested'),
        P('So bleiben beide Spalten erhalten. Die Kennung selbst dient zum Verbinden.', 'That way both columns are kept. The ID itself serves for connecting.'), true),
      a(P('Beim Anhängen von Fällen ist Zahl gegen Text in derselben Spalte gesperrt', 'When appending cases a number against text in the same column is blocked'),
        P('Steht eine Spalte nur in einer Datei, bleibt sie für die anderen Fälle leer. Die Zuordnung der Spalten geschieht nach dem Namen.', 'If a column occurs in only one file, it stays empty for the other cases. Columns are matched by name.'), true),
      a(P('Die zweite Datei muss eine SPSS-Datei sein', 'The second file must be an SPSS file'),
        P('Die zweite Datei kann SPSS, Stata, CSV oder Excel sein.', 'The second file can be SPSS, Stata, CSV or Excel.')),
      a(P('Die zweite Datei wird für die Rechnung auf einen Server geladen', 'The second file is uploaded to a server for the calculation'),
        P('Sie bleibt auf dem Gerät.', 'It stays on the device.'))
    ],
    hilfe: ['daten-vorbereiten'], belege: ['Hilfe:daten-vorbereiten', 'Fachblatt:WELLE5-DATEN-ASSISTENTEN', 'Code:bausteine/AssistentZusammen.svelte']
  },
  {
    id: 'da-aus-mehrfach', thema: 'datenwerkzeuge', mehrfach: true,
    stamm: P('Welche Aussagen zu Sortieren, Ränge bilden und Zählen stimmen? Mehrere können stimmen.', 'Which statements about sorting, computing ranks and counting are correct? Several may be correct.'),
    antworten: [
      a(P('Erst "Dauerhaft sortieren" ordnet die Datei neu, die Vorschau ändert nichts', 'Only "Sort permanently" reorders the file, the preview changes nothing'),
        P('Danach ändern sich die Zeilennummern. Fehlende Werte stehen auch bei absteigender Reihenfolge am Ende.', 'Afterwards the row numbers change. Missing values also stand at the end in descending order.'), true),
      a(P('Beim Zählen gilt eine als "keine Angabe" markierte Antwort als kein Treffer', 'When counting, an answer marked as "no answer" counts as no hit'),
        P('Das gilt auch in einem Bereich. PSPP-COUNT zählt sie dort mit, Statable nicht.', 'This holds in a range as well. PSPP COUNT counts it there, Statable does not.'), true),
      a(P('Fehlende Werte stehen bei absteigender Sortierung am Anfang, wie in SPSS', 'Missing values stand at the beginning when sorted in descending order, as in SPSS'),
        P('Statable stellt fehlende Werte immer ans Ende. SPSS stellt sie je nach Richtung nach vorn.', 'Statable always puts missing values at the end. SPSS puts them first depending on the direction.')),
      a(P('Ein aktives Fallgewicht zählt die Fälle beim Bilden der Ränge mehrfach', 'An active case weight counts the cases several times when forming ranks'),
        P('Ränge werden ohne Fallgewicht gebildet: Jeder Fall bekommt seinen eigenen Rang. Das Gewicht wird dafür kurz ausgeschaltet.', 'Ranks are formed without case weight: every case gets its own rank. The weight is switched off briefly for this.'))
    ],
    hilfe: ['spss-menue'], belege: ['Hilfe:spss-menue', 'Code:bausteine/AssistentSortieren.svelte', 'Code:bausteine/AssistentRang.svelte', 'Code:bausteine/AssistentZaehlen.svelte']
  },
  {
    id: 'da-fc-mehrfach', thema: 'datenwerkzeuge', mehrfach: true,
    stamm: P('Welche Aussagen zu "Keine Angabe" für Zahlenspalten stimmen? Mehrere können stimmen.', 'Which statements about "Missing values" for number columns are correct? Several may be correct.'),
    antworten: [
      a(P('Erlaubt sind bis zu drei Einzelwerte, oder ein Bereich und höchstens ein Einzelwert, wie in SPSS', 'Up to three single values are allowed, or a range and at most one single value, as in SPSS'),
        P('Auch "niedrigster bis 0" geht. Die Angabe steht auf der Seite "Spalten" bei jeder Zahlenspalte.', '"Lowest to 0" also works. The setting is on the page "Columns" for each number column.'), true),
      a(P('Ein solcher Wert bleibt in den Daten sichtbar und zählt in allen Rechnungen als fehlend', 'Such a value stays visible in the data and counts as missing in all calculations'),
        P('Der Bereich wird in der SPSS-Datei und im Projekt gespeichert und beim Öffnen wieder gelesen.', 'The range is stored in the SPSS file and in the project and read again on opening.'), true),
      a(P('Statable ersetzt die markierten Werte durch geschätzte Antworten', 'Statable replaces the marked values with estimated answers'),
        P('Statable schätzt keine fehlenden Antworten. Wo eine Antwort fehlt, bleibt sie leer.', 'Statable does not estimate missing answers. Where an answer is missing, it stays empty.')),
      a(P('Der Bereich gilt nur in der laufenden Sitzung und geht beim Speichern verloren', 'The range applies only in the current session and is lost on saving'),
        P('Er wird in der SPSS-Datei und im Projekt gespeichert.', 'It is stored in the SPSS file and in the project.'))
    ],
    hilfe: ['keine-angabe-bereich'], belege: ['Hilfe:keine-angabe-bereich', 'Fachblatt:SPAETER-C-TABELLEN-FRAGEBOGEN', 'Code:bausteine/AssistentFehlendcodes.svelte']
  },
  {
    id: 'da-bef-mehrfach', thema: 'datenwerkzeuge', mehrfach: true,
    stamm: P('Welche Aussagen zur Seite "Befehle" stimmen? Mehrere können stimmen.', 'Which statements about the page "Commands" are correct? Several may be correct.'),
    antworten: [
      a(P('"Alle ausführen" oder Strg+Eingabe führen aus; bei Markierung läuft nur das Markierte', '"Run all" or Ctrl+Enter executes; with a selection only the selection runs'),
        P('"Angehakte ausführen" und "Einzeln ausführen" rechnen einzelne Befehle. Jeder Befehl endet mit einem Punkt.', '"Run checked" and "Run one by one" run single commands. Every command ends with a full stop.'), true),
      a(P('"Als Auswertung übernehmen" legt eine Ausgabe als eigenen Reiter in die Auswertung', '"Add to Analysis" places an output as a tab of its own in the analysis'),
        P('"Speichern (.sps)" sichert die Befehle.', '"Save (.sps)" saves the commands.'), true),
      a(P('Python-Programme und SPSS-Erweiterungen laufen auf der Seite ebenfalls', 'Python programs and SPSS extensions also run on the page'),
        P('Statable führt PSPP-Befehle aus, keine SPSS-Skripte. Python-Programme und SPSS-Erweiterungen laufen nicht.', 'Statable runs PSPP commands, not SPSS scripts. Python programs and SPSS extensions do not run.')),
      a(P('Ohne geöffnete Daten rechnet jeder Befehl, weil die Daten nur Beispiele sind', 'Without open data every command runs, since the data are only examples'),
        P('Ohne geöffnete Daten rechnet nur, was keine Daten braucht.', 'Without open data only what needs no data runs.'))
    ],
    hilfe: ['befehle-seite'], belege: ['Hilfe:befehle-seite']
  },
  {
    id: 'da-umk-regel', thema: 'datenwerkzeuge',
    stamm: P('Im Assistenten "Umkodieren" passen zwei Regeln auf denselben alten Wert. Welche gilt?', 'In the assistant "Recode" two rules fit the same old value. Which one applies?'),
    antworten: [
      a(P('Die erste passende Regel; Werte ohne Regel werden übernommen, leer gelassen oder auf einen Wert gesetzt', 'The first matching rule; values without a rule are taken over, left empty or set to one value'),
        P('Die Vorschau zählt alt gegen neu, sodass sich die Wirkung der Regeln prüfen lässt. "Frage umpolen" rechnet neu = kleinster plus größter minus alter Wert.', 'The preview counts old against new, so the effect of the rules can be checked. "Reverse a question" computes new = smallest plus largest minus old value.'), true),
      a(P('Die letzte passende Regel, weil spätere Regeln frühere überschreiben und die Reihenfolge so sortiert wird', 'The last matching rule, because later rules overwrite earlier ones and the order is sorted that way'),
        P('Es gilt die erste passende Regel. Darum steht die speziellere Regel vor der allgemeineren.', 'The first matching rule applies. That is why the more specific rule comes before the more general one.')),
      a(P('Die Regel mit dem kleinsten Bereich, weil Statable die genaueste Regel vorzieht und ihr folgt', 'The rule with the smallest range, because Statable prefers the most exact rule and follows it'),
        P('Statable wählt nicht nach der Genauigkeit der Regel, sondern nach ihrer Reihenfolge.', 'Statable does not choose by the exactness of the rule but by its order.'))
    ],
    hilfe: ['daten-vorbereiten'], belege: ['Hilfe:daten-vorbereiten', 'Fachblatt:WELLE5-DATEN-ASSISTENTEN', 'Code:bausteine/AssistentUmkodieren.svelte']
  }
];
export const FAELLE: ThemaModul['FAELLE'] = {};
