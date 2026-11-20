/**
 * Üben: Was halte ich nach dem Interview fest? und Wie schreibe ich auf, was ich beobachtet habe? (Feinstruktur, Stufe F2A, 12.11.2026):
 * Einheiten `interviewprotokoll` und `gedaechtnisprotokoll`, je 8 Fragen.
 * Grundlage sind die Hilfe-Artikel `eh-interviewprotokoll` und `eh-gedaechtnisprotokoll` (`Hilfe:<id>`). Bücher liegen nicht vor, darum kein Seitenbeleg.
 * Alle Texte sind erfunden (eigene Wortlaute). Formregeln (nach Blindprobe 12.11.): alle Antworten einer Frage gleich gebaut, ähnlich lang und gleich vorsichtig, jede mit kurzer Begründung,
 * gleicher Fachbegriff in Klammern bei jeder Antwort, keine absoluten Wörter, falsche Antworten sind echte Fehlvorstellungen, Lösungsplätze verteilt.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const HI = ['Hilfe:eh-interviewprotokoll'];
const HG = ['Hilfe:eh-gedaechtnisprotokoll'];

export const FRAGEN_PROTOKOLLE: Frage[] = [
  /* ------------------------------------------------ Interviewprotokoll */
  {
    id: 'eh-ip-wann', thema: 'erheben',
    stamm: P('Wann schreibt man das Interviewprotokoll (Postskript) am besten?', 'When is the best time to write the interview protocol (postscript)?'),
    antworten: [
      a(P('Nach der Transkription, weil man den Text dann kennt und das Gespräch dadurch besser einordnen kann (Postskript)', 'After transcription, because one then knows the text and can place the conversation better (postscript)'),
        P('Dann ist die Erinnerung an die Umstände verblasst, und das Transkript zeigt sie nicht.', 'By then the memory of the circumstances has faded, and the transcript does not show them.')),
      a(P('Vor dem Gespräch, weil man Erwartungen und Pläne festhält, die später wichtig werden könnten (Postskript)', 'Before the conversation, because one notes expectations and plans that could become important later (postscript)'),
        P('Das wäre Vorbereitung. Das Protokoll hält fest, was im Gespräch tatsächlich geschah.', 'That would be preparation. The protocol records what actually happened in the conversation.')),
      a(P('Gleich nach dem Gespräch, weil Eindrücke davon dann noch frisch und genau in Erinnerung sind (Postskript)', 'Right after the conversation, because impressions of it are then still fresh and exact (postscript)'),
        P('Was nur man selbst weiß, geht schnell verloren; darum schreibt man es früh auf.', 'What only you know is quickly lost; so you write it down early.'), true),
      a(P('Nach der ersten Kodierung, weil man dann weiß, was für die Kategorien wichtig ist und was nicht (Postskript)', 'After the first coding, because one then knows what matters for the categories and what does not (postscript)'),
        P('Kodierung ordnet den Text. Die Umstände des Gesprächs stehen nicht im Text und sind dann vergessen.', 'Coding orders the text. The circumstances of the conversation are not in the text and are forgotten by then.'))
    ],
    hilfe: ['eh-interviewprotokoll'], belege: HI
  },
  {
    id: 'eh-ip-raum', thema: 'erheben',
    stamm: P('Der Kellner unterbrach das Gespräch im Café zweimal. In welches Feld des Interviewprotokolls gehört das?', 'The waiter interrupted the conversation in the café twice. In which field of the interview protocol does this belong?'),
    antworten: [
      a(P('In „Raum und Rahmen“, weil dort Ort, Anwesende und Störungen des Gesprächs beschrieben werden (Interviewprotokoll)', 'In “Place and setting”, because place, people present and disturbances of the conversation are described there (interview protocol)'),
        P('Ort, Anwesende und Störungen gehören zum Rahmen. Sie können beeinflussen, was gesagt wurde.', 'Place, people present and disturbances belong to the setting. They can influence what was said.'), true),
      a(P('In „Beziehung und Atmosphäre“, weil dort die Stimmung zwischen beiden beschrieben wird (Interviewprotokoll)', 'In “Relationship and atmosphere”, because the mood between the two is described there (interview protocol)'),
        P('Die Stimmung ist ein eigenes Feld. Eine äußere Störung gehört zum Rahmen des Gesprächs.', 'The mood has its own field. An outside disturbance belongs to the setting of the conversation.')),
      a(P('In „Zustandekommen“, weil dort der Weg zum Kontakt und die Vermittlung beschrieben werden (Interviewprotokoll)', 'In “How the contact came about”, because the route to the contact and the arranging are described there (interview protocol)'),
        P('Zustandekommen meint, wie der Kontakt entstand und wer vermittelt hat, nicht, was im Gespräch störte.', 'How the contact came about means how it arose and who arranged it, not what disturbed the conversation.')),
      a(P('In „Vor und nach der Aufnahme“, weil dort die Besonderheiten der Aufnahmetechnik beschrieben werden (Interviewprotokoll)', 'In “Before and after the recording”, because the peculiarities of the recording technology are described there (interview protocol)'),
        P('Das Feld meint, was ohne Aufnahme gesprochen wurde, nicht die Technik oder Störungen im Café.', 'The field means what was said without recording, not the technology or disturbances in the café.'))
    ],
    hilfe: ['eh-interviewprotokoll'], belege: HI
  },
  {
    id: 'eh-ip-kopf', thema: 'erheben',
    stamm: P('Welche Angaben gehören in den Kopf des Interviewprotokolls?', 'Which details belong in the header of the interview protocol?'),
    antworten: [
      a(P('Fall-Kennung, Datum, Dauer und der Beruf der Person, weil dieser das Gespräch fachlich einordnet (Pseudonymisierung)', 'Case code, date, duration and the profession of the person, because it places the conversation professionally (pseudonymisation)'),
        P('Der Beruf ist ein indirektes Merkmal und kann eine Person verraten, besonders in kleinen Gruppen.', 'The profession is an indirect feature and can give a person away, especially in small groups.')),
      a(P('Fall-Kennung, Datum, Dauer und die Straße des Ortes, weil sich der Raum so später wiederfinden lässt (Pseudonymisierung)', 'Case code, date, duration and the street of the place, because the room can be found again later (pseudonymisation)'),
        P('Eine genaue Adresse macht Personen auffindbar. Ein allgemeiner Ort wie „Café“ genügt.', 'An exact address makes persons findable. A general place such as “café” is enough.')),
      a(P('Fall-Kennung, Datum, Dauer und die Initialen der Person, weil sie kurz sind und leicht zuordnen helfen (Pseudonymisierung)', 'Case code, date, duration and the initials of the person, because they are short and help to assign easily (pseudonymisation)'),
        P('Initialen sind ein indirektes Merkmal und können eine Person verraten. Die Zuordnung leistet die Fall-Kennung.', 'Initials are an indirect feature and can give a person away. The case code does the assigning.')),
      a(P('Fall-Kennung, Datum, Dauer und ein grober Ort wie „Café“, weil damit die Person unkenntlich bleibt (Pseudonymisierung)', 'Case code, date, duration and a rough place such as “café”, because the person thereby stays unrecognisable (pseudonymisation)'),
        P('Mit einer Kennung und einem allgemeinen Ort bleibt die Person unkenntlich, und das Gespräch ist trotzdem eingeordnet.', 'With a code and a general place the person stays unrecognisable, and the conversation is still placed.'), true)
    ],
    hilfe: ['eh-interviewprotokoll', 'eh-anonym-pseudonym'], belege: HI
  },
  {
    id: 'eh-ip-vornach', thema: 'erheben',
    stamm: P('Was hält man im Feld „Vor und nach der Aufnahme“ fest?', 'What do you record in the field “Before and after the recording”?'),
    antworten: [
      a(P('Welche Kodierungen man später vergeben will, weil man sie im Gespräch schon erahnt hat (Aufnahme)', 'Which codes one wants to assign later, because one already sensed them in the conversation (recording)'),
        P('Kodiert wird später im Text. Dieses Feld gehört zum Gespräch selbst.', 'Coding is done later in the text. This field belongs to the conversation itself.')),
      a(P('Was beim Ankommen und Gehen am Rand gesprochen wurde, weil es im Transkript oft fehlt (Aufnahme)', 'What was said on the side on arriving and leaving, because it is often missing from the transcript (recording)'),
        P('Solche Sätze fehlen im Transkript, können aber wichtig sein. Das Protokoll bewahrt sie auf.', 'Such sentences are missing from the transcript but can be important. The protocol keeps them.'), true),
      a(P('Wie viele Wörter und Pausen vorkamen, weil sich daran der Gesprächsstil der Person zeigt (Aufnahme)', 'How many words and pauses occurred, because the conversational style of the person shows in them (recording)'),
        P('Wörter und Pausen stehen im Transkript und werden dort gezählt. Das Feld ist für Ungeschriebenes.', 'Words and pauses are in the transcript and are counted there. The field is for the unwritten.')),
      a(P('Welche Namen im Gespräch genannt wurden, weil sie später ersetzt und gesammelt vorliegen sollen (Aufnahme)', 'Which names were mentioned in the conversation, because they are to be replaced later and kept together (recording)'),
        P('Namen gehören nicht ins Protokoll. Sie werden im Transkript ersetzt (pseudonymisiert).', 'Names do not belong in the protocol. They are replaced in the transcript (pseudonymised).'))
    ],
    hilfe: ['eh-interviewprotokoll'], belege: HI
  },
  {
    id: 'eh-ip-stelle', thema: 'erheben',
    stamm: P('Wozu dient bei einer schwierigen Stelle die Zeitmarke im Interviewprotokoll?', 'What is the time mark for at a difficult passage in the interview protocol?'),
    antworten: [
      a(P('Man misst damit die Dauer der Stelle im Gespräch, weil lange Stellen meist als besonders wichtig gelten (Zeitmarke)', 'One measures the duration of the passage in the conversation with it, because long passages mostly count as especially important (time mark)'),
        P('Wichtigkeit hängt nicht von der Länge ab. Die Zeitmarke misst nichts, sie zeigt eine Stelle an.', 'Importance does not depend on length. The time mark measures nothing, it points to a passage.')),
      a(P('Man hält damit fest, zu welcher Tageszeit die Stelle entstand, weil die Uhrzeit für Belege zählt (Zeitmarke)', 'One records with it at what time of day the passage arose, because the clock time counts for evidence (time mark)'),
        P('Die Uhrzeit des Gesprächs steht im Kopf. Die Zeitmarke meint die Stelle in der Aufnahme.', 'The clock time of the conversation stands in the header. The time mark means the position in the recording.')),
      a(P('Man findet die Stelle später in Transkript und Aufnahme wieder, weil sich die Zeit ansteuern lässt (Zeitmarke)', 'One finds the passage again later in transcript and recording, because the time can be located (time mark)'),
        P('Mit der Zeit lässt sich die Stelle ansteuern und noch einmal anhören.', 'With the time the passage can be located and listened to again.'), true),
      a(P('Man vermerkt damit, wie lange die Person an der Stelle gezögert hat, weil Pausen Unsicherheit zeigen (Zeitmarke)', 'One notes with it how long the person hesitated at the passage, because pauses show uncertainty (time mark)'),
        P('Pausen werden im Transkript festgehalten. Die Zeitmarke zeigt nur, wo die Stelle liegt.', 'Pauses are recorded in the transcript. The time mark only shows where the passage lies.'))
    ],
    hilfe: ['eh-interviewprotokoll'], belege: HI
  },
  {
    id: 'eh-ip-saetze', thema: 'erheben',
    stamm: P('Statable rät zu ganzen Sätzen statt Stichworten im Protokoll. Warum ist das sinnvoll?', 'Statable advises whole sentences instead of keywords in the protocol. Why does that make sense?'),
    antworten: [
      a(P('Weil man Stichworte nach Wochen oft nicht mehr versteht, während ganze Sätze den Zusammenhang tragen (Fließtext)', 'Because after weeks one often no longer understands keywords, while whole sentences carry the context (running text)'),
        P('Der Zusammenhang steckt in den Verbindungen zwischen den Wörtern, und die fehlen in Stichworten.', 'The context lies in the links between the words, and these are missing in keywords.'), true),
      a(P('Weil das Protokoll später kodiert wird und Stichworte dafür zu knapp sind, ganze Sätze dagegen genügen (Fließtext)', 'Because the protocol is coded later and keywords are too brief for that, whole sentences suffice (running text)'),
        P('Das Protokoll wird nicht kodiert, und Kodieren braucht keine ganzen Sätze.', 'The protocol is not coded, and coding does not need whole sentences.')),
      a(P('Weil ganze Sätze als wissenschaftlicher Stil gelten und Stichworte in Abschlussarbeiten beanstandet werden (Fließtext)', 'Because whole sentences count as scientific style and keywords are objected to in theses (running text)'),
        P('Der Rat gilt für das spätere Verstehen, nicht für den Stil. Statable speichert beides.', 'The advice is about later understanding, not about style. Statable saves both.')),
      a(P('Weil ganze Sätze beim Suchen im Projekt besser gefunden werden als Stichworte, die Treffer verfehlen (Fließtext)', 'Because whole sentences are found better than keywords, which miss hits, when searching in the project (running text)'),
        P('Die Suche findet Wörter in beiden Formen. Der Grund liegt bei Ihrem späteren Verstehen.', 'The search finds words in both forms. The reason lies in your own later understanding.'))
    ],
    hilfe: ['eh-interviewprotokoll'], belege: HI
  },
  {
    id: 'eh-ip-thesen', thema: 'erheben',
    stamm: P('Was schreibt man ins Feld „Erste Thesen“ des Interviewprotokolls?', 'What do you write in the field “First hypotheses” of the interview protocol?'),
    antworten: [
      a(P('Ergebnisse, die nach dem Gespräch schon ziemlich klar wirken und in den Bericht kommen sollen (Thesen)', 'Results that already seem quite clear after the conversation and are to go into the report (hypotheses)'),
        P('Nach einem Gespräch ist nichts bestätigt. Thesen sind Vermutungen, die erst geprüft werden.', 'After one conversation nothing is confirmed. Hypotheses are guesses that still have to be tested.')),
      a(P('Wörtliche Zitate der Person, die später im Bericht stehen sollen, weil sie das Gespräch belegen (Thesen)', 'Verbatim quotes of the person that are to appear in the report later, because they document the conversation (hypotheses)'),
        P('Zitate stehen im Transkript. Eine These ist ein eigener Gedanke, kein Zitat.', 'Quotes are in the transcript. A hypothesis is a thought of your own, not a quote.')),
      a(P('Codes, die man den Aussagen schon zuordnen kann, weil sie im Gespräch klar und deutlich wurden (Thesen)', 'Codes one can already assign to the statements, because they became clear and distinct in the conversation (hypotheses)'),
        P('Codes entstehen am Text, nicht im Protokoll. Thesen sind Gedanken zur Frage.', 'Codes arise from the text, not in the protocol. Hypotheses are thoughts on the question.')),
      a(P('Vorläufige Gedanken zur Forschungsfrage, als Vermutung markiert, die später geprüft werden (Thesen)', 'Preliminary thoughts on the research question, marked as a guess, to be tested later (hypotheses)'),
        P('Frühe Einfälle sind wertvoll, wenn sie als vorläufig erkennbar bleiben und später geprüft werden.', 'Early ideas are valuable if they remain recognisable as preliminary and are tested later.'), true)
    ],
    hilfe: ['eh-interviewprotokoll'], belege: HI
  },
  {
    id: 'eh-ip-verlauf', thema: 'erheben',
    stamm: P('Das Gespräch war zäh, die Person antwortete kurz und wurde erst gegen Ende lebhaft. Welches Feld passt?', 'The conversation was sluggish, the person answered briefly and only became lively near the end. Which field fits?'),
    antworten: [
      a(P('„Zustandekommen“, weil dort beschrieben wird, wer das Gespräch vermittelt und vorbereitet hat (Interviewprotokoll)', '“How the contact came about”, because it describes who arranged and prepared the conversation (interview protocol)'),
        P('Zustandekommen betrifft den Weg zum Gespräch, nicht dessen Verlauf.', 'How it came about concerns the way to the conversation, not its course.')),
      a(P('„Verlauf und Dynamik“, weil dort der Gang des Gesprächs mit Wendungen beschrieben wird (Interviewprotokoll)', '“Course and dynamics”, because it describes the progress of the conversation with turns (interview protocol)'),
        P('Genau dafür ist das Feld gedacht: Gang des Gesprächs, Stocken und Lebhaftigkeit.', 'The field is meant for exactly this: course of the conversation, stalling and liveliness.'), true),
      a(P('„Erste Thesen“, weil dort beschrieben wird, was einem zur Forschungsfrage durch den Kopf ging (Interviewprotokoll)', '“First hypotheses”, because it describes what came to mind about the research question (interview protocol)'),
        P('Thesen betreffen die Forschungsfrage. Der Gang des Gesprächs hat ein eigenes Feld.', 'Hypotheses concern the research question. The course of the conversation has its own field.')),
      a(P('„Raum und Rahmen“, weil dort beschrieben wird, wo man saß und wer sonst anwesend war (Interviewprotokoll)', '“Place and setting”, because it describes where one sat and who else was present (interview protocol)'),
        P('Der Rahmen beschreibt Ort und Anwesende. Das Zähe gehört zum Verlauf.', 'The setting describes place and people present. The sluggishness belongs to the course.'))
    ],
    hilfe: ['eh-interviewprotokoll'], belege: HI
  },

  /* ------------------------------------------------ Gedächtnisprotokoll */
  {
    id: 'eh-gp-schritt1', thema: 'erheben',
    stamm: P('Was tut man im ersten Schritt des Gedächtnisprotokolls?', 'What do you do in the first step of the memory protocol?'),
    antworten: [
      a(P('Man gliedert das Erlebte in Abschnitte mit Überschriften, weil sich Wichtiges so leichter wiederfindet (erster Schritt)', 'One divides what was experienced into sections with headings, because important things are easier to find again (first step)'),
        P('Das Gliedern kommt später. Zuerst geht es darum, möglichst viel Erinnertes festzuhalten.', 'Outlining comes later. First the aim is to record as much as possible of what is remembered.')),
      a(P('Man legt Kategorien für die Beobachtung fest, weil sich das Erlebte sonst nicht einordnen lässt (erster Schritt)', 'One fixes categories for the observation, because what was experienced cannot otherwise be placed (first step)'),
        P('Kategorien entstehen später an dem, was man festgehalten hat. Am Anfang steht das Erinnern.', 'Categories arise later from what has been recorded. At the start comes remembering.')),
      a(P('Man hält Erinnertes ungefiltert und in beliebiger Reihenfolge fest, weil so wenig verloren geht (erster Schritt)', 'One records what is remembered unfiltered and in any order, because little is lost that way (first step)'),
        P('Je weniger man dabei sortiert oder bewertet, desto weniger Erinnerung geht verloren. Ordnen kommt danach.', 'The less you sort or judge in the process, the less memory is lost. Ordering comes afterwards.'), true),
      a(P('Man wählt aus, was zur Forschungsfrage passt, und lässt das Übrige weg, weil das Protokoll kurz bleiben soll (erster Schritt)', 'One selects what fits the research question and leaves the rest out, because the protocol should stay short (first step)'),
        P('Ausgewählt wird später. Im ersten Schritt weiß man noch nicht, was wichtig wird.', 'Selecting happens later. In the first step one does not yet know what will become important.'))
    ],
    hilfe: ['eh-gedaechtnisprotokoll'], belege: HG
  },
  {
    id: 'eh-gp-spell', thema: 'erheben',
    stamm: P('Im ersten Schritt zeigt Statable zunächst keine Rechtschreibhinweise. Warum?', 'In the first step Statable at first shows no spelling hints. Why?'),
    antworten: [
      a(P('Weil Korrekturhinweise vom Erinnern ablenken und den Schreibfluss beim Schreiben stören würden (Rechtschreibhinweise)', 'Because correction hints would distract from remembering and disturb the flow of writing (spelling hints)'),
        P('Ohne Linien bleibt man beim Erinnern. Wer will, schaltet die Hinweise am Feld ein.', 'Without lines you stay with remembering. Whoever wants can switch the hints on at the field.'), true),
      a(P('Weil Hinweise den Datenschutz berühren, da der Text zur Prüfung an einen Server gesendet würde (Rechtschreibhinweise)', 'Because hints touch data protection, as the text would be sent to a server for checking (spelling hints)'),
        P('Die Prüfung läuft im Browser und sendet keinen Text an einen Server. Der Grund ist ein anderer.', 'The check runs in the browser and sends no text to a server. The reason is a different one.')),
      a(P('Weil der Browser Fachwörter und Dialekt oft falsch markiert und das Protokoll unübersichtlich wird (Rechtschreibhinweise)', 'Because the browser often marks technical terms and dialect wrongly and the protocol becomes confusing (spelling hints)'),
        P('Das kann vorkommen, ist aber nicht der Grund. Die Hinweise sind eine Wahl von Statable und lassen sich einschalten.', 'That can happen but is not the reason. The hints are a choice by Statable and can be switched on.')),
      a(P('Weil Rechtschreibung bei Protokollen für die spätere Auswertung unwichtig ist und darum offen bleibt (Rechtschreibhinweise)', 'Because spelling is unimportant in protocols for the later analysis and is therefore left open (spelling hints)'),
        P('Später darf und soll verbessert werden. Im ersten Schritt stört es nur.', 'Later one may and should improve. In the first step it only disturbs.'))
    ],
    hilfe: ['eh-gedaechtnisprotokoll'], belege: HG
  },
  {
    id: 'eh-gp-schritt2', thema: 'erheben',
    stamm: P('Was gehört in den zweiten Schritt des Gedächtnisprotokolls (systematisch erinnern)?', 'What belongs in the second step of the memory protocol (recalling systematically)?'),
    antworten: [
      a(P('Die wichtigsten Befunde und eine erste Deutung, weil sich daraus der spätere Bericht ableiten lässt (zweiter Schritt)', 'The main findings and a first interpretation, because the later report can be derived from them (second step)'),
        P('Befunde und Deutungen gehören in den dritten Schritt und dort in die Überlegung.', 'Findings and interpretations belong in the third step and there in the reflection.')),
      a(P('Die Codes für die Textstellen und die Kategorien des Projekts, weil das Protokoll damit auswertbar wird (zweiter Schritt)', 'The codes for the passages and the categories of the project, because the protocol then becomes analysable (second step)'),
        P('Das Protokoll ist kein kodierter Text. Es ordnet das Erinnerte.', 'The protocol is not a coded text. It orders what is remembered.')),
      a(P('Der Plan für die nächste Beobachtung und was man anders machen will, weil daraus Lehren folgen (zweiter Schritt)', 'The plan for the next observation and what one wants to do differently, because lessons follow from it (second step)'),
        P('Das wäre eine methodische Feldnotiz. Der zweite Schritt ordnet das Erlebte.', 'That would be a methodological field note. The second step orders what was experienced.')),
      a(P('Die Situationen in der Reihenfolge, in der sie geschahen, weil Zusammenhänge so sichtbar werden (zweiter Schritt)', 'The situations in the order in which they happened, because connections become visible that way (second step)'),
        P('Hier wird geordnet: erst nach der Zeit, dann mit Hilfe der Stichnotizen vom Ort.', 'This is where ordering happens: first by time, then with the help of the short notes from the site.'), true)
    ],
    hilfe: ['eh-gedaechtnisprotokoll'], belege: HG
  },
  {
    id: 'eh-gp-jottings', thema: 'erheben',
    stamm: P('Was sind „Jottings“?', 'What are “jottings”?'),
    antworten: [
      a(P('Der ausführliche Tagesbericht in ganzen Sätzen, weil er den Verlauf vollständig wiedergibt (Jottings)', 'The detailed daily report in whole sentences, because it reproduces the course completely (jottings)'),
        P('Das ist der Bericht. Jottings entstehen vorher und sind sehr knapp.', 'That is the report. Jottings arise earlier and are very brief.')),
      a(P('Kurze Wörter aus dem Feld, die später beim Erinnern helfen, weil dort die Zeit zum Schreiben fehlt (Jottings)', 'Brief words from the field that help with remembering later, because the time for writing is missing there (jottings)'),
        P('Im Feld bleibt oft keine Zeit zum Schreiben. Wenige Wörter genügen, um sich später zu erinnern.', 'In the field there is often no time to write. A few words are enough to remember later.'), true),
      a(P('Die wörtliche Mitschrift der Gespräche im Feld, weil Zitate später belegbar sein sollen (Jottings)', 'The verbatim record of the conversations in the field, because quotes are to be verifiable later (jottings)'),
        P('Wörtlich mitzuschreiben ist im Feld nicht möglich. Jottings halten nur Anker fest.', 'Writing verbatim is not possible in the field. Jottings only record anchors.')),
      a(P('Erste Deutungen zu den beobachteten Personen, weil man sie im Moment der Beobachtung schon hat (Jottings)', 'First interpretations of the observed persons, because one already has them in the moment of observation (jottings)'),
        P('Deutungen gehören in die Überlegung. Jottings sollen an Wahrgenommenes erinnern.', 'Interpretations belong in the reflection. Jottings should recall what was perceived.'))
    ],
    hilfe: ['eh-gedaechtnisprotokoll'], belege: HG
  },
  {
    id: 'eh-gp-beobachtung', thema: 'erheben',
    stamm: P('Im dritten Schritt steht der Satz „Er stand auf und ging zur Tür.“ In welches Feld gehört er?', 'In the third step stands the sentence “He got up and went to the door.” In which field does it belong?'),
    antworten: [
      a(P('In „Überlegung“, weil schon das Beschreiben einer Person eine Deutung enthält (Feld)', 'In “Reflection”, because even describing a person already contains an interpretation (field)'),
        P('Das Aufstehen und Gehen kann man sehen. Das ist Wahrgenommenes und keine Deutung.', 'Getting up and walking can be seen. It is something perceived and not an interpretation.')),
      a(P('In beide Felder, weil das Gesehene zugleich Beleg und Grundlage der Deutung ist (Feld)', 'In both fields, because what was seen is at once evidence and basis of the interpretation (field)'),
        P('Jeder Satz hat ein Feld. Doppelt eingetragen verwischt es die Trennung.', 'Each sentence has one field. Entering it twice blurs the separation.')),
      a(P('In „Beobachtung“, weil man es sehen kann und es weder Gründe noch Gefühle nennt (Feld)', 'In “Observation”, because it can be seen and names neither reasons nor feelings (field)'),
        P('Der Satz beschreibt, was geschah. Warum er ging, bliebe Überlegung.', 'The sentence describes what happened. Why he went would remain reflection.'), true),
      a(P('In den ersten Schritt zurück, weil Bewegungen dort gesammelt und erst später sortiert werden (Feld)', 'Back into the first step, because movements are collected there and only sorted later (field)'),
        P('Der erste Schritt ist schon vorbei. Im dritten Schritt wird in zwei Felder getrennt.', 'The first step is already over. In the third step the text is separated into two fields.'))
    ],
    hilfe: ['eh-gedaechtnisprotokoll'], belege: HG
  },
  {
    id: 'eh-gp-deutung', thema: 'erheben',
    stamm: P('Der Satz „Sie war offenbar gelangweilt.“ steht im Beobachtungsfeld. Was ist daran zu klären?', 'The sentence “She was obviously bored.” stands in the observation field. What needs to be clarified?'),
    antworten: [
      a(P('Er ist eine Deutung, denn Langeweile sieht man nicht, einen Blick zur Uhr dagegen schon (Beobachtungsfeld)', 'It is an interpretation, because boredom cannot be seen, whereas a glance at the clock can (observation field)'),
        P('Man beobachtet Verhalten. Was es bedeutet, ist eine Überlegung und gehört in das zweite Feld.', 'One observes behaviour. What it means is a reflection and belongs in the second field.'), true),
      a(P('Er ist zu kurz, denn eine Beobachtung braucht Ort und Zeit, etwa „im Seminarraum um zehn Uhr“ (Beobachtungsfeld)', 'It is too short, because an observation needs place and time, for example “in the seminar room at ten o’clock” (observation field)'),
        P('Ort und Zeit stehen im Kopf des Protokolls. Entscheidend ist, ob etwas wahrgenommen oder gedeutet wird.', 'Place and time stand in the header of the protocol. What matters is whether something is perceived or interpreted.')),
      a(P('Er ist richtig beobachtet, denn Gelangweiltsein zeigt sich an der Mimik, etwa an einem Gähnen (Beobachtungsfeld)', 'It is correctly observed, because being bored shows in the facial expression, for example in a yawn (observation field)'),
        P('Das Gähnen wäre beobachtet. „Gelangweilt“ ist schon die Deutung dessen, was man gesehen hat.', 'The yawn would be observed. “Bored” is already the interpretation of what one has seen.')),
      a(P('Er ist unvollständig, denn die Person müsste benannt werden, etwa mit ihrer Fall-Kennung (Beobachtungsfeld)', 'It is incomplete, because the person would have to be named, for example with her case code (observation field)'),
        P('Wer gemeint ist, kann man klären, aber es ändert nicht, dass der Satz deutet.', 'Who is meant can be clarified, but it does not change that the sentence interprets.'))
    ],
    hilfe: ['eh-gedaechtnisprotokoll'], belege: HG
  },
  {
    id: 'eh-gp-marker', thema: 'erheben',
    stamm: P('Unter dem Beobachtungsfeld steht „Beobachtet oder gedeutet? 2 Stellen“. Was bedeutet das?', 'Under the observation field it says “Observed or interpreted? 2 passages”. What does this mean?'),
    antworten: [
      a(P('Zwei Sätze sind falsch und müssen geändert werden, weil Statable dort Fehler im Text gefunden hat (Deutungsmarker)', 'Two sentences are wrong and have to be changed, because Statable has found errors in the text there (interpretation marker)'),
        P('Statable ändert oder bewertet den Text nicht. Die Hinweise sind Fragen und keine Fehler.', 'Statable neither changes nor rates the text. The notes are questions and not errors.')),
      a(P('Zwei Stellen sind zu lang und sollten gekürzt werden, weil das Feld eine Zeichengrenze hat (Deutungsmarker)', 'Two passages are too long and should be shortened, because the field has a character limit (interpretation marker)'),
        P('Das Feld hat keine solche Grenze. Die Hinweise betreffen die Wortwahl.', 'The field has no such limit. The notes concern the choice of words.')),
      a(P('Zwei Stellen sind noch nicht gespeichert und gehen verloren, wenn man die Seite verlässt (Deutungsmarker)', 'Two passages have not been saved yet and are lost if one leaves the page (interpretation marker)'),
        P('Mit dem Speichern hat der Hinweis nichts zu tun. Er bezieht sich auf die Wörter im Text.', 'The note has nothing to do with saving. It refers to the words in the text.')),
      a(P('Zwei Stellen enthalten Wörter, die oft Deutung anzeigen; Sie entscheiden selbst, was gilt (Deutungsmarker)', 'Two passages contain words that often indicate interpretation; you decide yourself what applies (interpretation marker)'),
        P('Der Hinweis ist eine Frage. Ob es Beobachtung oder Deutung ist, entscheiden Sie.', 'The note is a question. Whether it is observation or interpretation, you decide.'), true)
    ],
    hilfe: ['eh-gedaechtnisprotokoll'], belege: HG
  },
  {
    id: 'eh-gp-trennen', thema: 'erheben',
    stamm: P('Warum trennt man im Bericht (Schritt 3) Beobachtung und Überlegung in zwei Felder?', 'Why are observation and reflection separated into two fields in the report (step 3)?'),
    antworten: [
      a(P('Weil beide Teile verschieden lang sind und sich getrennt besser lesen und vergleichen lassen (Trennung)', 'Because the two parts differ in length and can be read and compared better when separated (separation)'),
        P('Länge spielt keine Rolle. Wichtig ist, dass Wahrgenommenes und Gedeutetes unterscheidbar bleiben.', 'Length does not matter. What matters is that what was perceived and what was interpreted stay distinguishable.')),
      a(P('Weil erkennbar bleibt, was wahrgenommen und was gedeutet wurde, und die Deutung prüfbar wird (Trennung)', 'Because it stays recognisable what was perceived and what was interpreted, and the interpretation becomes testable (separation)'),
        P('Wer die Deutung vom Gesehenen trennt, kann später prüfen, ob das Gesehene sie trägt.', 'Whoever separates the interpretation from what was seen can later check whether what was seen supports it.'), true),
      a(P('Weil später die Beobachtung ausgewertet wird und die Überlegung beim Auswerten wegfällt (Trennung)', 'Because later the observation is analysed and the reflection drops out in the analysis (separation)'),
        P('Überlegungen sind wertvoll, etwa als erste Thesen. Sie sollen als solche erkennbar sein.', 'Reflections are valuable, for example as first hypotheses. They should be recognisable as such.')),
      a(P('Weil Überlegungen in Berichten unerwünscht sind und deshalb in ein eigenes Feld abgesondert werden (Trennung)', 'Because reflections are unwelcome in reports and are therefore set apart in a field of their own (separation)'),
        P('Überlegungen sind erwünscht. Sie werden getrennt, damit man sie prüfen kann.', 'Reflections are welcome. They are separated so that they can be checked.'))
    ],
    hilfe: ['eh-gedaechtnisprotokoll'], belege: HG
  }
];
