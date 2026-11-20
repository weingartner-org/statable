/**
 * Hilfe-Artikel „Statable und SPSS im Vergleich“ (Johannes 18.11.2026, für die Verbreitung).
 * Regel: Über SPSS steht hier nur, was in der Dokumentation von IBM zu SPSS Statistics 32 belegt ist (Prüfung
 * docs/verbreitung/SPSS-AUSSAGEN-GEPRUEFT-2026-11-18.md). Keine Aussage, was SPSS NICHT kann: Fehlen lässt sich nicht sicher belegen.
 * Was Statable mitbringt, steht als Aussage über Statable, ohne Vergleich. IBM-Texte nie wörtlich übernehmen. Nur Deutsch und Englisch.
 */
import { P } from '../i18n/laufzeit';
import { a, type Roh } from './artikel-roh';

export const ROH_SPSS_VERGLEICH: Roh[] = [
  a('statable-und-spss', 'start', P('Statable und SPSS im Vergleich: was gleich ist, was anders ist', 'Statable and SPSS compared: what is the same, what is different'),
    P('SPSS IBM Vergleich Unterschied Alternative kostenlos Umsteiger Lizenz Abo Syntax Zusatzmodule Module was kann Statable was kann SPSS gleich anders', 'SPSS IBM comparison difference alternative free switching licence subscription syntax add-on modules what can Statable do what can SPSS do same different'),
    [
      { h: P('Kurz', 'In brief') },
      P('Statable ist kostenlos und läuft im Browser. Es rechnet mit GNU PSPP, dem freien Gegenstück zu SPSS, mit der Statistiksprache R und mit eigenem Code. Für die Verfahren, die im Studium meist gebraucht werden, findet man in Statable das Gleiche. SPSS bietet in Spezialbereichen mehr. Diese Seite nennt beides.',
        'Statable is free and runs in the browser. It calculates with GNU PSPP, the free counterpart to SPSS, with the statistics language R and with its own code. For the methods most often needed in studies, Statable has the same. SPSS offers more in special areas. This page names both.'),
      P('Aussagen über SPSS stammen aus der Dokumentation von IBM zu SPSS Statistics 32 (Stand November 2026). Wer hier einen Fehler findet, meldet ihn bitte über „Melden“.',
        'Statements about SPSS come from IBM\'s documentation of SPSS Statistics 32 (as of November 2026). If you find a mistake here, please report it with "Report".'),
      { h: P('Was gleich ist', 'What is the same') },
      { ul: [
        P('SPSS-Dateien (.sav) öffnen und als .sav speichern.', 'Open SPSS files (.sav) and save as .sav.'),
        P('Die üblichen Verfahren: Häufigkeiten, Kreuztabellen, t-Tests, Varianzanalysen (auch mit Messwiederholung), Korrelation, lineare und logistische Regression, Rangtests, Faktorenanalyse, Reliabilität (Cronbachs Alpha), Mehrebenenmodelle, Überlebenszeit (Kaplan-Meier, Cox), Zeitreihen.',
          'The usual methods: frequencies, crosstabs, t tests, analyses of variance (also repeated measures), correlation, linear and logistic regression, rank tests, factor analysis, reliability (Cronbach\'s alpha), multilevel models, survival time (Kaplan-Meier, Cox), time series.'),
        P('SPSS-Syntax läuft im Umfang von PSPP. Für Befehle ohne Gegenstück nennt Statable den Weg im Programm.', 'SPSS syntax runs within the scope of PSPP. For commands without a counterpart Statable names the way in the program.'),
        P('Wo ein SPSS-Menüpunkt in Statable steht, zeigt die Seite „SPSS-Menü → Statable“.', 'Where an SPSS menu item is in Statable is shown on the page "SPSS menu → Statable".'),
        P('Die Zahlen von Statable sind gegen R geprüft, an Stichproben auch gegen SPSS 32.', 'Statable\'s numbers are checked against R, and in samples also against SPSS 32.')
      ] },
      { h: P('Was SPSS mehr bietet', 'What SPSS offers in addition') },
      P('Laut IBM bietet SPSS Statistics in seinen Zusatzmodulen Verfahren, die Statable nicht hat, zum Beispiel:', 'According to IBM, SPSS Statistics offers methods in its add-on modules that Statable does not have, for example:'),
      { ul: [
        P('neuronale Netze (Mehrschicht-Perzeptron, radiale Basisfunktion)', 'neural networks (multilayer perceptron, radial basis function)'),
        P('Conjoint-Analyse', 'conjoint analysis'),
        P('RFM-Analyse für das Direktmarketing', 'RFM analysis for direct marketing'),
        P('kategoriale Hauptkomponentenanalyse (CATPCA)', 'categorical principal components analysis (CATPCA)'),
        P('Genomdaten (.fastq) einlesen, neu in Version 32', 'reading genomic data (.fastq), new in version 32'),
        P('einen KI-Assistenten, der Ausgaben erklärt (über IBM watsonx.ai, mit eigenem Konto)', 'an AI assistant that explains output (via IBM watsonx.ai, with its own account)')
      ] },
      P('Dazu hat SPSS insgesamt mehr Befehle in der Syntax und Hersteller-Support.', 'In addition SPSS has more syntax commands overall and vendor support.'),
      { h: P('Was Statable mitbringt', 'What Statable brings along') },
      P('Diese Liste beschreibt Statable. Sie sagt nichts darüber, was andere Programme können.', 'This list describes Statable. It says nothing about what other programs can do.'),
      { ul: [
        P('Lernen: Lernpfade mit Lehreinheiten und Übungsfragen mit Erklärung; Lehrende stellen eigene Lernpfade zusammen und geben sie mit Abschlusstest oder Übungsblatt als Link oder als SCORM-Paket für Moodle weiter.', 'Learning: learning paths with units and practice questions with explanations; teachers build their own learning paths and share them with a final test or exercise sheet as a link or as a SCORM package for Moodle.'),
        P('Jedes Fachwort ist erklärt und anklickbar (Begriffe A-Z).', 'Every technical term is explained and clickable (terms A-Z).'),
        P('Ergebnisse als Satz in einfacher Sprache und als Zeile im APA-Stil, ohne KI.', 'Results as a sentence in plain language and as a line in APA style, without AI.'),
        P('Qualitativ und Mixed Methods: Interviews und Transkripte, Kodier-Arbeitsplatz mit Codebaum und Memos, Austausch im REFI-QDA-Format, Joint Displays.', 'Qualitative and mixed methods: interviews and transcripts, coding workspace with code tree and memos, exchange in REFI-QDA format, joint displays.'),
        P('Fragebogen planen, Antworten ohne Server sammeln, Papierbögen einlesen.', 'Plan a questionnaire, collect answers without a server, read paper forms.'),
        P('Einzelfallanalyse (NAP, Tau-U) und Normwerte.', 'Single-case analysis (NAP, Tau-U) and norm scores.'),
        P('Zu vielen Auswertungen ein R-Skript mit Daten zum Nachrechnen.', 'For many analyses an R script with data for recalculation.'),
        P('Läuft im Browser auf Computer, Tablet und Handy, ohne Installation und ohne Konto; als Paket auch ohne Internet. Die Daten bleiben auf dem eigenen Gerät.', 'Runs in the browser on computer, tablet and phone, without installation and without an account; also as an offline package. The data stay on your own device.'),
        P('Von Anfang an barrierefrei gebaut: ganz mit der Tastatur, mit Screenreader, Tabellen mit Köpfen, Diagramme mit Beschreibung und Zahlentabelle.', 'Built accessible from the start: fully by keyboard, with screen reader, tables with headers, charts with description and data table.')
      ] },
      { h: P('Kosten und Zugang', 'Cost and access') },
      P('Statable ist kostenlos, werbefrei und quelloffen (GPL). Laut IBM wird SPSS Statistics als Abonnement oder als Lizenz verkauft, auch als Campus- und Studierendenlizenz; es gibt eine Testfassung.',
        'Statable is free, without ads and open source (GPL). According to IBM, SPSS Statistics is sold as a subscription or as a licence, also as a campus and student licence; there is a trial version.'),
      P('IBM und SPSS sind Marken der IBM Corporation. Statable steht in keiner Verbindung zu IBM.', 'IBM and SPSS are trademarks of IBM Corporation. Statable is not affiliated with IBM.')
    ], ['spss-menue', 'ueber-statable', 'installieren-offline', 'erste-schritte'])
];
