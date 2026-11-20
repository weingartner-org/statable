/**
 * Üben: Was, wenn jemand die Zustimmung zurückzieht? (Feinstruktur, Stufe F2B, 12.11.2026): Einheit `einwilligung-prozess`, 8 Fragen.
 * Grundlage ist der Hilfe-Artikel `eh-einwilligung-prozess` (`Hilfe:<id>`); keine Rechtsberatung, die Fragen prüfen Verständnis, keine Rechtslage.
 * Alle Texte sind erfunden (eigene Wortlaute). Formregeln (nach Blindprobe 12.11.): alle Antworten einer Frage gleich gebaut, ähnlich lang und gleich vorsichtig, jede mit kurzer Begründung,
 * gleicher Fachbegriff in Klammern bei jeder Antwort, keine absoluten Wörter, falsche Antworten sind echte Fehlvorstellungen, Lösungsplätze verteilt.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const H = ['Hilfe:eh-einwilligung-prozess'];

export const FRAGEN_EINWILLIGUNG: Frage[] = [
  {
    id: 'eh-ew-widerruf', thema: 'erheben',
    stamm: P('Eine befragte Person hat unterschrieben und nimmt zwei Wochen später die Zustimmung zu Zitaten zurück. Was gilt dann?',
      'A respondent has signed and two weeks later takes back the agreement to quotations. What applies then?'),
    antworten: [
      a(P('Der Widerruf zählt erst nach der Abgabe der Arbeit, weil die Unterschrift bis dahin die Zustimmung festhält (Widerruf)',
        'The withdrawal only counts after the work is handed in, because the signature holds the agreement until then (withdrawal)'),
        P('Eine Zustimmung kann auch während der Arbeit zurückgenommen werden. Die Unterschrift bindet nicht bis zur Abgabe.',
          'An agreement can be taken back during the work, too. The signature does not bind until the hand-in.')),
      a(P('Der Widerruf wirkt ab dem Tag der Erklärung: Zitate bleiben künftig weg, über Erschienenes wird gesprochen (Widerruf)',
        'The withdrawal takes effect from the day it is declared: quotations stay out in future, what has appeared is discussed (withdrawal)'),
        P('Ein Widerruf gilt für die Zukunft. Was schon erschienen ist, lässt sich meist nicht zurückholen und wird mit der Person und der Hochschule besprochen.',
          'A withdrawal applies to the future. What has already appeared usually cannot be taken back and is discussed with the person and the university.'), true),
      a(P('Der Widerruf wirkt zurück auf den Beginn, weil die Zustimmung von Anfang an ungültig war und Auswertungen wegfallen (Widerruf)',
        'The withdrawal reaches back to the start, because the agreement was invalid from the start and analyses drop out (withdrawal)'),
        P('Ein Widerruf gilt für die Zukunft und löscht bisherige Auswertungen nicht von selbst.',
          'A withdrawal applies to the future and does not delete earlier analyses by itself.')),
      a(P('Der Widerruf betrifft die Tonaufnahme, weil Zitate nach der Anonymisierung als frei verwendbar gelten (Widerruf)',
        'The withdrawal concerns the audio recording, because quotations count as freely usable after anonymisation (withdrawal)'),
        P('Zitate haben einen eigenen Punkt. Auch anonymisierte Zitate werden einzeln zugestimmt oder abgelehnt.',
          'Quotations have a point of their own. Anonymised quotations, too, are agreed to or declined separately.'))
    ],
    hilfe: ['eh-einwilligung-prozess'], belege: H
  },
  {
    id: 'eh-ew-gestuft', thema: 'erheben',
    stamm: P('Eine Person stimmt der Teilnahme und der Aufnahme zu und lehnt die Archivierung ab. Wie geht es weiter?',
      'A person agrees to participation and recording and declines archiving. What happens next?'),
    antworten: [
      a(P('Die Person scheidet aus der Studie aus, weil ein Nein bei einem Punkt die Zustimmung zum Rest aufhebt (gestufte Einwilligung)',
        'The person drops out of the study, because a no on one point cancels the agreement to the rest (staged consent)'),
        P('Die Punkte werden getrennt entschieden. Ein Nein bei einem Punkt beendet die Teilnahme nicht.',
          'The points are decided separately. A no on one point does not end participation.')),
      a(P('Die Person nimmt teil, und die Archivierung gilt als mitgegeben, weil sie am Interview mitgewirkt hat (gestufte Einwilligung)',
        'The person takes part, and archiving counts as given along with it, because she contributed to the interview (staged consent)'),
        P('Eine Zustimmung gilt für den Punkt, dem zugestimmt wurde. Sie wird aus der Mitwirkung nicht abgeleitet.',
          'An agreement applies to the point that was agreed to. It is not derived from taking part.')),
      a(P('Die Person nimmt teil, und die Betreuerin entscheidet über die Archivierung, weil sie das Projekt verantwortet (gestufte Einwilligung)',
        'The person takes part, and the supervisor decides on archiving, because she is responsible for the project (staged consent)'),
        P('Die Zustimmung kommt von der Person selbst, nicht von der Betreuung.',
          'The agreement comes from the person herself, not from the supervision.')),
      a(P('Die Person nimmt teil, und die Abschrift kommt nicht ins Archiv, weil dafür die eigene Zustimmung fehlt (gestufte Einwilligung)',
        'The person takes part, and the transcript does not go into the archive, because the own agreement for it is missing (staged consent)'),
        P('Darum gibt es getrennte Kästchen: Wer die Archivierung ablehnt, bleibt Teilnehmerin oder Teilnehmer.',
          'That is why there are separate boxes: whoever declines archiving remains a participant.'), true)
    ],
    hilfe: ['eh-einwilligung-prozess'], belege: H
  },
  {
    id: 'eh-ew-wort', thema: 'erheben',
    stamm: P('Wie zeigt Statable den Stand einer Zustimmung an?',
      'How does Statable show the status of an agreement?'),
    antworten: [
      a(P('Als Wort mit Datum, zum Beispiel „erteilt“, damit er mit Screenreader lesbar ist (Stand der Einwilligung)',
        'As a word with a date, for example “granted”, so that it is readable with a screen reader (status of consent)'),
        P('Der Stand steht als Wort da, nie nur als Farbe. So ist er für viele Menschen lesbar, auch ohne Farbsehen.',
          'The status is shown as a word, never only as a colour. This makes it readable for many people, also without seeing colour.'), true),
      a(P('Als Farbe am Eintrag, zum Beispiel Grün oder Rot, damit er auf einen Blick erkennbar ist (Stand der Einwilligung)',
        'As a colour on the entry, for example green or red, so that it can be recognised at a glance (status of consent)'),
        P('Eine Farbe allein können Menschen mit Farbsehschwäche oder Screenreader nicht unterscheiden. Darum steht der Stand als Wort da.',
          'A colour alone cannot be told apart by people with colour blindness or a screen reader. That is why the status is shown as a word.')),
      a(P('Als Symbol am Eintrag, zum Beispiel Haken oder Kreuz, damit er platzsparend lesbar bleibt (Stand der Einwilligung)',
        'As a symbol on the entry, for example tick or cross, so that it stays readable in little space (status of consent)'),
        P('Ein Symbol sagt nicht, ob etwas abgelehnt, offen oder widerrufen ist. Jeder Stand hat ein eigenes Wort.',
          'A symbol does not say whether something is declined, open or withdrawn. Each status has a word of its own.')),
      a(P('Als Zahl am Eintrag, zum Beispiel 1 bis 4, damit er sich in Tabellen leicht sortieren lässt (Stand der Einwilligung)',
        'As a number on the entry, for example 1 to 4, so that it can be sorted easily in tables (status of consent)'),
        P('Eine Zahl müsste man erst nachschlagen. Das Wort erklärt sich selbst.',
          'A number would first have to be looked up. The word explains itself.'))
    ],
    hilfe: ['eh-einwilligung-prozess'], belege: H
  },
  {
    id: 'eh-ew-warnung', thema: 'erheben',
    stamm: P('Sie übernehmen Zitate als Textspalten in einen Datensatz, und für einen Fall fehlt die Zustimmung zu Zitaten. Was macht Statable?',
      'You take quotations as text columns into a data set, and for one case the agreement to quotations is missing. What does Statable do?'),
    antworten: [
      a(P('Es hält die Übernahme an, bis die Zustimmung eingetragen ist, weil Zitate sonst gegen Regeln verstoßen könnten (Warnung beim Export)',
        'It halts the transfer until the agreement is entered, because quotations could otherwise break rules (warning on export)'),
        P('Statable hält nichts an. Es kann eine mündliche Zustimmung geben, die noch nicht eingetragen ist.',
          'Statable halts nothing. There may be a spoken agreement that is not entered yet.')),
      a(P('Es lässt den Fall weg und übernimmt die übrigen, damit der Datensatz unerlaubte Zitate vermeidet (Warnung beim Export)',
        'It leaves the case out and takes over the others, so that the data set avoids forbidden quotations (warning on export)'),
        P('Weglassen ohne Hinweis würde Sie täuschen. Statable sagt, was los ist, und überlässt Ihnen die Wahl.',
          'Leaving out without a note would mislead you. Statable says what is going on and leaves the choice to you.')),
      a(P('Es zeigt eine Warnung mit dem Fall und fragt nach, weil die Zustimmung mündlich vorliegen könnte (Warnung beim Export)',
        'It shows a warning with the case and asks, because the agreement might exist in spoken form (warning on export)'),
        P('Die Warnung nennt die Lage und überlässt die Entscheidung Ihnen („Trotzdem übernehmen“ oder „Abbrechen“).',
          'The warning names the situation and leaves the decision to you (“Take over anyway” or “Cancel”).'), true),
      a(P('Es macht die Zitate des Falls unkenntlich, damit sie ohne Zustimmung nicht gelesen werden könnten (Warnung beim Export)',
        'It blurs the quotations of the case, so that they could not be read without agreement (warning on export)'),
        P('Statable verändert die Zitate nicht. Über das Weitere entscheiden Sie.',
          'Statable does not change the quotations. You decide what happens next.'))
    ],
    hilfe: ['eh-einwilligung-prozess'], belege: H
  },
  {
    id: 'eh-ew-loeschen', thema: 'erheben',
    stamm: P('Für die Aufnahme eines Falls steht ein Löschdatum in zehn Tagen. Was zeigt Statable beim Öffnen der Seite?',
      'For the recording of a case a deletion date falls in ten days. What does Statable show when the page is opened?'),
    antworten: [
      a(P('Einen Hinweis auf das Löschen und die Frage, ob es erledigt ist, weil die Forschenden selbst löschen (Löschdatum)',
        'A note about the deletion and the question whether it is done, because the researchers do the deleting themselves (deletion date)'),
        P('Statable erinnert und hält die Bestätigung fest. Gelöscht wird von den Forschenden.',
          'Statable reminds and records the confirmation. The researchers do the deleting.'), true),
      a(P('Eine Meldung, dass die Aufnahme zum Datum gelöscht und im Verlauf vermerkt wird, weil sie im Projekt liegt (Löschdatum)',
        'A message that the recording will be deleted on the date and noted in the history, because it lies in the project (deletion date)'),
        P('Statable löscht nie selbst. Die Aufnahme liegt zudem gar nicht im Projekt.',
          'Statable never deletes by itself. The recording is not even in the project.')),
      a(P('Einen Hinweis, der nach dem Öffnen ausgeblendet wird, weil das Löschen damit als zur Kenntnis genommen gilt (Löschdatum)',
        'A note that is hidden after opening, because the deletion then counts as taken note of (deletion date)'),
        P('Der Hinweis bleibt oben stehen, bis Sie „Ja, gelöscht“ oder „Erledigt“ wählen.',
          'The note stays at the top until you choose “Yes, deleted” or “Done”.')),
      a(P('Eine Mitteilung an die Hochschule, damit diese die Aufnahme zum Datum löschen lässt, weil sie die Daten verantwortet (Löschdatum)',
        'A message to the university, so that it has the recording deleted on the date, because it answers for the data (deletion date)'),
        P('Statable meldet nichts an andere Stellen. Es erinnert Sie.',
          'Statable reports nothing to other bodies. It reminds you.'))
    ],
    hilfe: ['eh-einwilligung-prozess'], belege: H
  },
  {
    id: 'eh-ew-kind', thema: 'erheben',
    stamm: P('Ein Kind soll interviewt werden, und die Eltern haben zugestimmt. Was ist zu bedenken?',
      'A child is to be interviewed, and the parents have agreed. What has to be considered?'),
    antworten: [
      a(P('Die Eltern entscheiden, weil ein Kind rechtlich oft nicht allein zustimmen kann und von ihnen vertreten wird (Einwilligung bei Kindern)',
        'The parents decide, because a child often cannot legally agree on its own and is represented by them (consent of children)'),
        P('Das Kind hat eine eigene Zustimmung zu geben. Die der Eltern ersetzt sie nicht.',
          'The child has an agreement of its own to give. The parents’ does not replace it.')),
      a(P('Das Kind wird erst nach der Auswertung gefragt, damit das Gespräch möglichst unbeeinflusst bleibt (Einwilligung bei Kindern)',
        'The child is asked only after the analysis, so that the conversation stays as uninfluenced as possible (consent of children)'),
        P('Gefragt wird vorher. Eine Zustimmung nach der Auswertung kann nichts mehr bewirken.',
          'The asking happens beforehand. An agreement after the analysis can no longer achieve anything.')),
      a(P('Die Lehrkraft stimmt für das Kind zu, weil sie es kennt und dessen Wunsch meist richtig einschätzt (Einwilligung bei Kindern)',
        'The teacher agrees for the child, because she knows it and mostly judges its wish correctly (consent of children)'),
        P('Wer das Interview leitet, steht in einem Abhängigkeitsverhältnis. Stellvertretend zustimmen kann sie nicht.',
          'Whoever conducts the interview stands in a relationship of dependence. She cannot agree on behalf of the child.')),
      a(P('Das Kind stimmt selbst zu, und die Betreuung klärt die Lage, weil Abhängigkeit ein Ja erzwingen kann (Einwilligung bei Kindern)',
        'The child agrees itself, and the supervision clarifies the situation, because dependence can force a yes (consent of children)'),
        P('Darum ist die eigene Zustimmung wichtig. Statable nennt dafür keine feste Regel; klären Sie es mit Ihrer Betreuung.',
          'That is why the own agreement matters. Statable gives no fixed rule for it; clarify it with your supervision.'), true)
    ],
    hilfe: ['eh-einwilligung-prozess'], belege: H
  },
  {
    id: 'eh-ew-archiv', thema: 'erheben',
    stamm: P('Eine Person lehnt die Archivierung ihres Interviews ab. Wann darf die anonymisierte Abschrift doch in ein Archiv?',
      'A person declines the archiving of her interview. When may the anonymised transcript go into an archive after all?'),
    antworten: [
      a(P('Wenn die Abschrift anonymisiert ist, weil sich dann kaum noch ein Bezug zur Person herstellen lässt (Archivierung)',
        'When the transcript is anonymised, because hardly any link to the person can then be made (archiving)'),
        P('Erzählungen über das eigene Leben sind schwer ganz unkenntlich zu machen. Darum bleibt die eigene Zustimmung nötig.',
          'Stories about one’s own life are hard to make completely unrecognisable. That is why the own agreement stays necessary.')),
      a(P('Wenn die Hochschule zustimmt, weil die Daten wertvoll sind und die Forschung davon profitiert (Archivierung)',
        'When the university agrees, because the data are valuable and research profits from them (archiving)'),
        P('Der Wert der Daten und die Zustimmung der Hochschule ersetzen die Zustimmung der Person nicht.',
          'The value of the data and the university’s agreement do not replace the person’s agreement.')),
      a(P('Wenn die Person später selbst zustimmt, weil die Archivierung eine eigene Zustimmung braucht (Archivierung)',
        'When the person herself agrees later, because archiving needs an agreement of its own (archiving)'),
        P('Ein Punkt kann später nachgeholt werden, aber nur mit dem Ja der Person selbst.',
          'A point can be obtained later, but with the person’s own yes.'), true),
      a(P('Wenn die Tonaufnahme gelöscht ist, weil dann der Text allein vorliegt und weniger verrät (Archivierung)',
        'When the audio recording is deleted, because then the text alone remains and reveals less (archiving)'),
        P('Ob die Aufnahme noch da ist, ändert die Zustimmung zur Archivierung nicht.',
          'Whether the recording still exists does not change the agreement to archiving.'))
    ],
    hilfe: ['eh-einwilligung-prozess'], belege: H
  },
  {
    id: 'eh-ew-wiedervorlage', thema: 'erheben',
    stamm: P('Warum trägt man eine Wiedervorlage vor der Veröffentlichung ein?',
      'Why does one enter a follow-up before publication?'),
    antworten: [
      a(P('Damit die Unterschrift nach einer bestimmten Frist erneuert wird, weil sie sonst ungültig würde (Wiedervorlage)',
        'So that the signature is renewed after a certain period, because it would otherwise become invalid (follow-up)'),
        P('Eine Unterschrift hat kein Ablaufdatum. Es geht um das erneute Fragen, nicht um Fristen.',
          'A signature has no expiry date. The point is asking again, not deadlines.')),
      a(P('Damit die Person vor dem Erscheinen nochmals gefragt wird, weil sich ihre Haltung geändert haben kann (Wiedervorlage)',
        'So that the person is asked once more before it appears, because her attitude may have changed (follow-up)'),
        P('Einwilligung ist ein Vorgang. Statable erinnert an den Termin, damit die Zustimmung bestätigt oder angepasst werden kann.',
          'Consent is a process. Statable reminds you of the date so that the agreement can be confirmed or adjusted.'), true),
      a(P('Damit Statable die Abschrift zum Termin an die Hochschule meldet, weil diese sie rechtlich prüfen soll (Wiedervorlage)',
        'So that Statable reports the transcript to the university at the date, because it is to check it legally (follow-up)'),
        P('Statable meldet nichts an andere und prüft nichts rechtlich. Es erinnert Sie.',
          'Statable reports nothing to others and checks nothing legally. It reminds you.')),
      a(P('Damit die Betreuerin den Text zum Termin freigibt, weil ihre Freigabe bis dahin noch fehlt (Wiedervorlage)',
        'So that the supervisor releases the text at the date, because her release is still missing until then (follow-up)'),
        P('Die Wiedervorlage fragt die befragte Person, nicht die Betreuung.',
          'The follow-up asks the respondent, not the supervision.'))
    ],
    hilfe: ['eh-einwilligung-prozess'], belege: H
  }
];
