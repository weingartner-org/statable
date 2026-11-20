/**
 * Üben: Vom Kodieren zum Ergebnis (Erheben, Stufe 6c, Paket 6c3, 11.11.2026): Einheit `inhaltsanalyse-ablauf`, 5 Fragen.
 * Belege: `Beleg:<id>` verweist auf docs/fachblaetter/BELEGE-ERHEBEN.json. Zwei frei zugängliche Quellen: Gale u. a. 2013 (BMC Medical Research Methodology 13, 117; Framework-Methode)
 * und Mayring 2014 (SSOAR; qualitative Inhaltsanalyse). Eigene Wortlaute, keine Dezimalzahlen. Die Fragen prüfen Regeln und Zuordnungen, nie „die richtige Deutung“ eines Textes.
 * Formregeln wie in fragen-erheben-kodieren.ts: alle Antworten einer Frage gleich gebaut und gleich lang, keine absoluten Wörter, Fachbegriff in Klammern bei jeder Antwort,
 * echte Fehldeutungen (aus den Belegen) statt Unsinn, Lösungsplätze verteilt.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

export const FRAGEN_INHALTSANALYSE: Frage[] = [
  {
    id: 'eh-ia-aufbau', thema: 'erheben',
    stamm: P('Ein Team wertet zwölf Interviews mit der Framework-Methode aus (Gale u. a. 2013) und legt dafür eine Matrix an. Wofür stehen dabei die Zeilen, die Spalten und die Zellen?',
      'A team analyses twelve interviews with the framework method (Gale and others 2013) and sets up a matrix for it. What do the rows, the columns and the cells stand for?'),
    antworten: [
      a(P('Jede Zeile ist ein Code und jede Spalte eine befragte Person; in den Zellen steht, wie oft der Code bei der Person vorkommt (Häufigkeitstabelle)',
        'Each row is a code and each column an interviewee; the cells show how often the code occurs for the person (frequency table)'),
        P('Das ist die Code-Matrix (Fall-Code-Matrix) mit Zahlen. Bei der Framework-Methode sind die Zeilen Fälle, die Spalten Codes, und die Zellen enthalten zusammengefasstes Material.',
          'That is the code matrix (case-code matrix) with numbers. In the framework method the rows are cases, the columns are codes, and the cells hold summarised material.')),
      a(P('Jede Zeile ist ein Fall, meist eine befragte Person, und jede Spalte ein Code oder eine Kategorie; in den Zellen steht zusammengefasstes Material (Fall und Code)',
        'Each row is a case, usually an interviewee, and each column a code or category; the cells hold summarised material (case and code)'),
        P('So beschreiben es Gale u. a. (2013, Abschnitt „Background“): Zeilen sind Fälle, Spalten sind Codes, Zellen enthalten zusammengefasste Daten. Man kann so nach Fall und nach Code lesen.',
          'This is how Gale and others (2013, section "Background") describe it: rows are cases, columns are codes, cells hold summarised data. One can read by case and by code.'), true),
      a(P('Jede Zeile ist ein Absatz des Textes und jede Spalte eine kodierende Person; in den Zellen steht, welchen Code die Person vergeben hat (Kodierübersicht)',
        'Each row is a paragraph of the text and each column a coding person; the cells show which code the person has given (coding overview)'),
        P('Eine solche Übersicht zeigt, wer wie kodiert hat, ordnet aber nicht die Aussagen der Fälle nach Themen. Die Framework-Matrix hat Fälle in den Zeilen und Codes in den Spalten.',
          'Such an overview shows who coded how but does not order the statements of the cases by topic. The framework matrix has cases in the rows and codes in the columns.')),
      a(P('Jede Zeile ist ein Interview und jede Spalte eine Fallvariable wie Alter oder Semester; in den Zellen stehen die Werte der Variablen (Falltabelle)',
        'Each row is an interview and each column a case variable such as age or semester; the cells hold the values of the variables (case table)'),
        P('Das beschreibt die Tabelle der Fälle und Variablen. Die Framework-Matrix enthält keine Merkmale, sondern je Fall und Code das Gesagte in Form einer Zusammenfassung.',
          'That describes the table of cases and variables. The framework matrix holds no characteristics but, for each case and code, what was said in the form of a summary.'))
    ],
    hilfe: ['eh-fall-kategorie-matrix'], belege: ['Beleg:gale2013-matrix-aufbau', 'Hilfe:eh-fall-kategorie-matrix']
  },
  {
    id: 'eh-ia-zelle', thema: 'erheben',
    stamm: P('In die Zelle „Anna, Zeitdruck“ der Matrix soll etwas eingetragen werden (Charting). Was gehört nach der Framework-Methode hinein?',
      'Something is to be entered in the cell "Anna, time pressure" of the matrix (charting). According to the framework method, what belongs in it?'),
    antworten: [
      a(P('Eine kurze Zusammenfassung des Gesagten nahe an den Worten der Person, mit Verweisen auf passende Zitate im Transkript (Zusammenfassung)',
        'A short summary of what was said, close to the person\'s words, with references to fitting quotations in the transcript (summary)'),
        P('So beschreiben es Gale u. a. (2013, Abschnitt „Stage 6“): Gutes Zusammenfassen hält die Waage zwischen Verkürzen und dem Erhalt der Bedeutung, und Verweise auf Zitate gehören dazu.',
          'This is how Gale and others (2013, section "Stage 6") describe it: good summarising balances shortening against keeping the meaning, and references to quotations are part of it.'), true),
      a(P('Die zwei oder drei aussagekräftigsten Zitate der Person zu diesem Code im Wortlaut, damit ihre Stimme in der Matrix erhalten bleibt (Zitatzelle)',
        'The two or three most telling quotations of the person on this code, word for word, so that their voice is kept in the matrix (quotation cell)'),
        P('Die Zelle fasst zusammen, damit die Matrix kürzer als der Text bleibt und sich Fälle vergleichen lassen. Zitate werden als Verweise genannt, nicht in die Zelle kopiert (Gale u. a. 2013, „Stage 6“).',
          'The cell summarises so that the matrix stays shorter than the text and cases can be compared. Quotations are given as references, not copied into the cell (Gale and others 2013, "Stage 6").')),
      a(P('Eine kurze Deutung der Forschenden, was die Aussage über die Lage der Person zeigt, mit Verweis auf die Stelle im Transkript (Deutungszelle)',
        'A short interpretation by the researchers of what the statement shows about the person\'s situation, with a reference to the passage in the transcript (interpretation cell)'),
        P('Beim Eintragen wird zuerst beschrieben, nahe an den Worten der befragten Person. Das Deuten ist ein eigener Schritt danach; Einfälle beim Eintragen gehören in ein Memo.',
          'When entering, one first describes, close to the interviewee\'s words. Interpreting is a separate stage afterwards; ideas while entering belong in a memo.')),
      a(P('Die Zahl der Textstellen der Person mit diesem Code, dazu die Angabe, wo im Transkript sie stehen, damit sich die Fälle vergleichen lassen (Zählzelle)',
        'The number of the person\'s passages with this code, plus where they are in the transcript, so that the cases can be compared (counting cell)'),
        P('Eine Zahl je Zelle wäre eine Code-Matrix. In der Fall-Kategorie-Matrix steht eine Zusammenfassung, denn die Zahl sagt nicht, was die Person gesagt hat.',
          'A number per cell would make it a code matrix. The case-by-category matrix holds a summary, because the number does not say what the person said.'))
    ],
    hilfe: ['eh-fall-kategorie-matrix'], belege: ['Beleg:gale2013-charting', 'Hilfe:eh-fall-kategorie-matrix']
  },
  {
    id: 'eh-ia-deuten', thema: 'erheben',
    stamm: P('Eine Forschende hat die Matrix ausgefüllt und bemerkt, dass drei Personen „Zeitdruck“ ähnlich beschreiben. In welchem Verhältnis stehen das Zusammenfassen in der Matrix und das Deuten nach der Framework-Methode?',
      'A researcher has filled in the matrix and notices that three people describe "time pressure" in a similar way. How are summarising in the matrix and interpreting related in the framework method?'),
    antworten: [
      a(P('Beim Eintragen wird jede Aussage zugleich gedeutet, und die Deutung wird danach an den anderen Fällen der Matrix geprüft (Deuten beim Eintragen)',
        'While entering, each statement is interpreted at the same time, and the interpretation is then checked against the other cases in the matrix (interpreting while entering)'),
        P('Beim Eintragen wird zunächst nahe an den Worten der Person beschrieben. Das Deuten ist ein eigener Schritt danach (Gale u. a. 2013, „Stage 7“).',
          'When entering, one first describes close to the person\'s words. Interpreting is a separate stage afterwards (Gale and others 2013, "Stage 7").')),
      a(P('Nach dem Eintragen werden die Muster der Matrix ausgezählt, und die Häufigkeiten über die Fälle sind das Ergebnis der Auswertung (Auszählen)',
        'After entering, the patterns in the matrix are counted, and the frequencies across the cases are the result of the analysis (counting)'),
        P('Zählen ordnet, deutet aber nicht. Nach dem Eintragen werden Muster, Typen und Zusammenhänge gesucht und erklärt; das ist Deutung (Gale u. a. 2013).',
          'Counting orders but does not interpret. After entering, patterns, types and relationships are sought and explained; that is interpretation (Gale and others 2013).')),
      a(P('Zuerst wird jede Aussage gedeutet, danach wird die Deutung als Zusammenfassung in die passende Zelle eingetragen (Deuten, dann Eintragen)',
        'First each statement is interpreted, then the interpretation is entered as a summary in the fitting cell (interpreting, then entering)'),
        P('Der Ablauf führt vom Kodieren über das Kategoriensystem und das Eintragen zum Deuten. Das Deuten steht am Ende, nicht vor dem Eintragen.',
          'The procedure leads from coding through the category system and charting to interpreting. Interpreting comes at the end, not before entering.')),
      a(P('Zuerst wird nahe an den Worten der Befragten beschrieben, danach wird auf Grundlage der Matrix gedeutet, etwa mit Typen (Beschreiben, dann Deuten)',
        'First one describes close to the interviewees\' words, then one interprets on the basis of the matrix, for example with types (describing, then interpreting)'),
        P('So steht es bei Gale u. a. (2013, Abschnitte „Stage 7“ und „Discussion“): Das Eintragen beschreibt zunächst, das Deuten folgt. Einfälle dazwischen gehören in ein Memo.',
          'This is what Gale and others (2013, sections "Stage 7" and "Discussion") say: charting describes first, interpreting follows. Ideas in between belong in a memo.'), true)
    ],
    hilfe: ['eh-fall-kategorie-matrix', 'eh-memos'], belege: ['Beleg:gale2013-zusammenfassen-vor-deuten', 'Hilfe:eh-fall-kategorie-matrix']
  },
  {
    id: 'eh-ia-ablauf', thema: 'erheben',
    stamm: P('Im allgemeinen Ablaufmodell der qualitativen Inhaltsanalyse (Mayring 2014) ist die Arbeit mit dem Kategoriensystem getan. Welcher Schritt folgt danach?',
      'In the general procedural model of qualitative content analysis (Mayring 2014) the work with the category system is done. Which stage follows?'),
    antworten: [
      a(P('Die Ergebnisse werden interpretiert, danach wird das Kategoriensystem für spätere Studien beschrieben und festgehalten (Interpretation)',
        'The results are interpreted, then the category system is described and recorded for later studies (interpretation)'),
        P('Vor der Interpretation steht im Modell noch ein Schritt: das Kategoriensystem an Theorie und Material noch einmal überprüfen. Es kann dabei überarbeitet werden.',
          'Before the interpretation the model has one more stage: checking the category system once more against theory and material. It can be revised in the process.')),
      a(P('Das Kategoriensystem wird an Theorie und Material noch einmal überprüft, danach folgt die Interpretation (Rücküberprüfung)',
        'The category system is checked once more against theory and material, then the interpretation follows (re-checking)'),
        P('So steht es im Ablaufmodell (Mayring 2014, Abschnitt 4.6, Abbildung 9, S. 55): Auf die Arbeit mit dem Kategoriensystem folgen die Rücküberprüfung, die Interpretation und die Anwendung der Gütekriterien.',
          'This is how the procedural model has it (Mayring 2014, section 4.6, figure 9, p. 55): work with the category system is followed by re-checking, interpretation and the application of quality criteria.'), true),
      a(P('Die Analyseeinheiten werden anhand der Erfahrung beim Kodieren noch einmal festgelegt, danach folgt die Interpretation (Einheiten anpassen)',
        'The units of analysis are set once more based on the experience of coding, then the interpretation follows (adjusting units)'),
        P('Die Einheiten werden vor der Arbeit mit dem Kategoriensystem festgelegt. Sie stehen im Modell davor.',
          'The units are fixed before work with the category system. In the model they come before it.')),
      a(P('Die Gütekriterien werden auf die Kodierung angewendet, danach folgt die Interpretation der Ergebnisse (Gütekriterien)',
        'The quality criteria are applied to the coding, then the interpretation of the results follows (quality criteria)'),
        P('Im Modell stehen die Gütekriterien am Ende, nach der Interpretation. Die Überprüfung des Kategoriensystems kommt vor der Interpretation.',
          'In the model the quality criteria stand at the end, after the interpretation. The checking of the category system comes before the interpretation.'))
    ],
    hilfe: ['eh-kodieren', 'eh-kodierleitfaden'], belege: ['Beleg:mayring2014-ablaufmodell', 'Hilfe:eh-kodieren']
  },
  {
    id: 'eh-ia-uebereinstimmung', thema: 'erheben',
    stamm: P('Zwei Personen kodieren dieselben Interviews unabhängig voneinander und stimmen nur schlecht überein. Wie geht die qualitative Inhaltsanalyse (Mayring 2014) damit um?',
      'Two people code the same interviews independently of each other and agree only poorly. How does qualitative content analysis (Mayring 2014) deal with this?'),
    antworten: [
      a(P('Kategorien mit schlechter Übereinstimmung werden zusammengelegt, bis der Wert ausreicht, danach wird weiterkodiert (Zusammenlegen)',
        'Categories with poor agreement are merged until the value is sufficient, then coding continues (merging)'),
        P('Zusammenlegen, nur damit die Zahl steigt, verdeckt die Abweichungen. Nach Mayring sollen sie zuerst verstanden und gedeutet werden.',
          'Merging just to raise the number hides the disagreements. According to Mayring they are first to be understood and interpreted.')),
      a(P('Die Übereinstimmung wird am Ende der Analyse berichtet, und die Abweichungen werden als Grenze der Studie genannt (Bericht am Ende)',
        'Agreement is reported at the end of the analysis, and the disagreements are named as a limitation of the study (report at the end)'),
        P('Nach Mayring wird die Zuverlässigkeit schon während der Analyse geprüft, damit Abweichungen noch zu Änderungen führen können, nicht erst am Schluss.',
          'According to Mayring, reliability is examined during the analysis so that disagreements can still lead to changes, not only at the end.')),
      a(P('Eine dritte Person kodiert die strittigen Stellen, und ihre Kodierung gilt danach für diese Stellen (Schiedsperson)',
        'A third person codes the disputed passages, and their coding then applies to these passages (arbiter)'),
        P('Eine Schiedsperson entscheidet, klärt aber nicht, warum die beiden abweichen. Die Abweichungen werden angesehen und gedeutet; in Statable dient dafür der Konsens.',
          'An arbiter decides but does not clarify why the two disagree. The disagreements are looked at and interpreted; in Statable the consensus serves this.')),
      a(P('Die Abweichungen werden besprochen und gedeutet und können in der Pilotphase das Kategoriensystem ändern (Abweichungen klären)',
        'The disagreements are discussed and interpreted and can change the category system in the pilot phase (clarifying disagreements)'),
        P('So steht es bei Mayring (2014, Abschnitt 4.1.8, S. 43, und Abschnitt 4.1.5, S. 42): Unzuverlässigkeiten sollen verstanden werden, und die Instrumente dürfen sich in der Pilotphase ändern.',
          'This is what Mayring (2014, section 4.1.8, p. 43, and section 4.1.5, p. 42) says: unreliabilities are to be understood, and the instruments may change in the pilot phase.'), true)
    ],
    hilfe: ['eh-konsens', 'eh-kodierleitfaden'], belege: ['Beleg:mayring2014-intercoder-pilot', 'Hilfe:eh-konsens']
  }
];
