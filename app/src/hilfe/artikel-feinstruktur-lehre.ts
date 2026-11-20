/**
 * Hilfe-Artikel zum Pfad „Interpretativ auswerten (Feinstrukturanalyse)“ (Feinstruktur, Stufe F4, 12.11.2026).
 * Ein Artikel je Lehreinheit: Erklärung, „Selbst machen“ mit eigenem, erfundenem Beispiel, Lösung, „So geht es in Statable“, Zum Mitnehmen.
 * Fachgrundlage: `docs/feinstruktur/FACHBLATT-FEINSTRUKTUR.md` (Methode nach Froschauer und Lueger, in eigenen Worten). Kein Kursmaterial, keine Buchzitate.
 * Die Beispiel-Deutungen gehören zu erfundenen Sätzen und zeigen die Form; Statable selbst schlägt für eigene Texte nie Einheiten, Lesarten, Stände oder Fazit vor.
 */
import { P } from '../i18n/laufzeit';
import { a, falsch, mitnehmen, type Roh } from './artikel-roh';

const STATABLE_START = P('Öffnen Sie die Seite „Interviews“ (#interviews), laden Sie im Abschnitt „Transkripte“ das Beispielinterview (erfunden) und wählen Sie beim Transkript „Feinstrukturanalyse beginnen“.',
  'Open the page “Interviews” (#interviews), load the example interview (invented) in the section “Transcripts” and choose “Begin fine-structure analysis” for the transcript.');

export const ROH_FEINSTRUKTUR_LEHRE: Roh[] = [
  // ---------------------------------------------------------------- 1 Paradigma
  a('eh-fs-paradigma', 'verstehen', P('Warum zählen manche und andere deuten? (interpretatives Paradigma, standardisierte Forschung)', 'Why do some count and others interpret? (interpretive paradigm, standardised research)'),
    P('interpretatives Paradigma qualitativ quantitativ standardisiert Sinn verstehen deuten zählen messen Hypothese Fall Feinstrukturanalyse Sequenzanalyse', 'interpretive paradigm qualitative quantitative standardised understanding meaning interpret count measure hypothesis case fine-structure analysis sequence analysis'),
    [
      { h: P('Kurz', 'In brief') },
      P('Forschung kann Fragen auf zwei Arten angehen. Die standardisierte (quantitative) Forschung zählt und misst: Sie legt vorher fest, was sie wissen will, fragt viele Menschen gleich und prüft Hypothesen (Vermutungen, die man vorher aufschreibt) mit Zahlen. Das interpretative Paradigma (eine Grundhaltung der Forschung) will verstehen, welchen Sinn Menschen ihrem Handeln geben. Es arbeitet offen, mit wenigen Fällen und deutet Texte genau.', 'Research can approach questions in two ways. Standardised (quantitative) research counts and measures: it fixes beforehand what it wants to know, asks many people in the same way and tests hypotheses (assumptions written down beforehand) with numbers. The interpretive paradigm (a basic stance of research) wants to understand the meaning people give to their actions. It works openly, with few cases, and interprets texts closely.'),
      { tabelle: { kopf: [P('Merkmal', 'Feature'), P('standardisiert (zählen)', 'standardised (counting)'), P('interpretativ (deuten)', 'interpretive (interpreting)')], zeilen: [
        [P('Ziel', 'Aim'), P('wie oft, wie stark, hängt es zusammen?', 'how often, how strong, is it related?'), P('welcher Sinn, welche Regeln stecken dahinter?', 'which meaning, which rules lie behind it?')],
        [P('Vorgehen', 'Approach'), P('vorher festgelegt, gleiche Fragen für alle', 'fixed beforehand, same questions for all'), P('offen, entwickelt sich am Material', 'open, develops along the material')],
        [P('Daten', 'Data'), P('Zahlen aus vielen Fällen', 'numbers from many cases'), P('Texte aus wenigen Fällen', 'texts from few cases')],
        [P('Beispiel in Statable', 'Example in Statable'), P('t-Test, Regression', 't-test, regression'), P('Feinstrukturanalyse, Kodieren', 'fine-structure analysis, coding')]
      ] } },
      P('Die Feinstrukturanalyse gehört zum interpretativen Paradigma. Sie ist eine Sequenzanalyse: Sie deutet einen kurzen Text Stück für Stück in seiner Reihenfolge.', 'Fine-structure analysis belongs to the interpretive paradigm. It is a sequence analysis: it interprets a short text piece by piece in its order.'),
      { h: P('Selbst machen', 'Do it yourself') },
      P('Ordnen Sie die vier erfundenen Forschungsfragen zu: eher zählen oder eher deuten? Schreiben Sie je einen Grund dazu. Lesen Sie erst danach die Lösung.', 'Assign the four invented research questions: rather counting or rather interpreting? Write down one reason for each. Only then read the solution.'),
      { ol: [
        P('Wie viele Studierende arbeiten neben dem Studium mehr als 10 Stunden pro Woche?', 'How many students work more than 10 hours a week alongside their studies?'),
        P('Wie sprechen Pflegekräfte über einen Dienst, der schiefgegangen ist?', 'How do care workers talk about a shift that went wrong?'),
        P('Hängt die Zahl der Lernstunden mit der Note zusammen?', 'Is the number of study hours related to the grade?'),
        P('Was bedeutet „gute Nachbarschaft“ für Menschen in einem neuen Wohnviertel?', 'What does “good neighbourhood” mean for people in a new housing area?')
      ] },
      { h: P('Lösung', 'Solution') },
      { ol: [
        P('Zählen: Es geht um eine Häufigkeit in vielen Fällen.', 'Counting: it is about a frequency in many cases.'),
        P('Deuten: Es geht um die Art des Sprechens und den Sinn dahinter.', 'Interpreting: it is about the way of speaking and the meaning behind it.'),
        P('Zählen: Ein Zusammenhang zwischen zwei Messgrößen wird geprüft.', 'Counting: a relationship between two measured variables is tested.'),
        P('Deuten: Was „gut“ heißt, ist vorher nicht festgelegt und soll erst verstanden werden.', 'Interpreting: what “good” means is not fixed beforehand and is to be understood first.')
      ] },
      falsch(P('Interpretativ heißt: Jede Deutung ist gleich gut, man schreibt einfach seine Meinung auf.', 'Interpretive means: every interpretation is equally good, you simply write down your opinion.'),
        P('Auch interpretative Forschung hat strenge Regeln. In der Feinstrukturanalyse wird jede Deutung am weiteren Text geprüft und kann verworfen werden.', 'Interpretive research also has strict rules. In fine-structure analysis every interpretation is checked against the following text and can be rejected.')),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      P('Für das Zählen gibt es die Auswertungen auf der Startseite. Für das Deuten gibt es auf der Seite „Interviews“ den Feinstruktur-Arbeitsplatz. Beide Wege lassen sich in Mixed Methods verbinden.', 'For counting there are the analyses on the start page. For interpreting there is the fine-structure workspace on the page “Interviews”. Both ways can be combined in mixed methods.'),
      mitnehmen(
        P('Standardisierte Forschung zählt und prüft vorher festgelegte Vermutungen.', 'Standardised research counts and tests assumptions fixed beforehand.'),
        P('Interpretative Forschung will Sinn verstehen und arbeitet offen am Text.', 'Interpretive research wants to understand meaning and works openly on the text.'),
        P('Die Feinstrukturanalyse ist eine Sequenzanalyse im interpretativen Paradigma.', 'Fine-structure analysis is a sequence analysis within the interpretive paradigm.')
      )
    ], ['eh-fs-manifest-latent', 'eh-methode', 'eh-transkription-genau']),

  // ---------------------------------------------------------------- 2 manifest und latent
  a('eh-fs-manifest-latent', 'verstehen', P('Was steht da und was steckt dahinter? (manifester und latenter Sinn, subjektiver und objektiver Sinn)', 'What is there and what lies behind it? (manifest and latent meaning, subjective and objective meaning)'),
    P('manifest latent subjektiver Sinn objektiver Sinn Intention Absicht Regel Selbstverständlichkeit Feinstrukturanalyse', 'manifest latent subjective meaning objective meaning intention rule taken for granted fine-structure analysis'),
    [
      { h: P('Kurz', 'In brief') },
      P('Manifest ist, was offen dasteht: Das sieht jede Person beim Lesen. Latent ist, was nicht ausgesprochen ist, aber im Text steckt: Annahmen, Regeln und Selbstverständlichkeiten, ohne die der Satz keinen Sinn ergäbe.', 'Manifest is what is openly there: every person sees it when reading. Latent is what is not said but is in the text: assumptions, rules and things taken for granted without which the sentence would make no sense.'),
      { ul: [
        P('Subjektiver Sinn: was die sprechende Person vermutlich zeigen, erreichen oder vermeiden will.', 'Subjective meaning: what the speaking person presumably wants to show, achieve or avoid.'),
        P('Objektiver Sinn: was die Äußerung bedeutet, unabhängig von der Absicht, weil sie in sozialen Regeln steht.', 'Objective meaning: what the utterance means regardless of intention, because it stands within social rules.')
      ] },
      P('Die Feinstrukturanalyse sucht vor allem den latenten, objektiven Sinn. Eine Deutung braucht aber immer einen Anhalt im Text. Was nicht in der Einheit steckt, ist Spekulation.', 'Fine-structure analysis looks above all for the latent, objective meaning. But an interpretation always needs a basis in the text. What is not in the unit is speculation.'),
      { h: P('Selbst machen', 'Do it yourself') },
      P('Ein erfundener Gruß an der Tür eines Büros: „Bitte nur nach Termin eintreten.“ Schreiben Sie auf: Was steht da (manifest)? Was steckt dahinter (latent)? Schreiben Sie zu „latent“ mindestens zwei verschiedene Möglichkeiten auf.', 'An invented note on an office door: “Please enter only by appointment.” Write down: what is there (manifest)? What lies behind it (latent)? Write down at least two different possibilities for “latent”.'),
      { h: P('Lösung', 'Solution') },
      P('So kann es aussehen. Andere Antworten sind möglich, wenn sie am Satz begründet sind.', 'This is what it can look like. Other answers are possible if they are justified by the sentence.'),
      { ul: [
        P('Manifest: Man soll nur hineingehen, wenn man einen Termin hat.', 'Manifest: one should only go in if one has an appointment.'),
        P('Latent, Möglichkeit 1: Es gibt Menschen, die bisher ohne Termin kamen; die Regel antwortet auf ein Problem.', 'Latent, possibility 1: there are people who used to come without an appointment; the rule answers a problem.'),
        P('Latent, Möglichkeit 2: Die Zeit der Person im Büro gilt als knapp und wertvoll; wer hinein darf, bestimmt sie.', 'Latent, possibility 2: the time of the person in the office counts as scarce and valuable; they decide who may enter.'),
        P('Spekulation ohne Anhalt wäre: „Die Person ist unfreundlich.“ Darüber sagt der Satz nichts.', 'Speculation without basis would be: “The person is unfriendly.” The sentence says nothing about that.')
      ] },
      { h: P('So geht es in Statable', 'How it works in Statable') },
      STATABLE_START,
      P('In der Karte einer Sinneinheit steht der manifeste Inhalt in der Spalte „Paraphrase“, der subjektive Sinn in „Intentionen“ und der latente, objektive Sinn in „Latente Bedeutungen“. Jede Spalte hat aufklappbare Leitfragen.', 'In the card of a meaning unit the manifest content goes into the column “Paraphrase”, the subjective meaning into “Intentions” and the latent, objective meaning into “Latent meanings”. Each column has guiding questions that can be expanded.'),
      mitnehmen(
        P('Manifest ist, was dasteht; latent ist, was dahinter steckt.', 'Manifest is what is there; latent is what lies behind it.'),
        P('Subjektiver Sinn fragt nach der Absicht, objektiver Sinn nach den Regeln.', 'Subjective meaning asks for the intention, objective meaning for the rules.'),
        P('Jede Deutung braucht einen Anhalt im Text, sonst ist sie Spekulation.', 'Every interpretation needs a basis in the text, otherwise it is speculation.')
      )
    ], ['eh-fs-paradigma', 'eh-fs-spalten']),

  // ---------------------------------------------------------------- 3 Sinneinheiten
  a('eh-fs-sinneinheiten', 'verstehen', P('Wie klein schneide ich den Text? (Sinneinheit, Ausschnitt)', 'How small do I cut the text? (meaning unit, excerpt)'),
    P('Sinneinheit Grenze Ausschnitt Wörter Füllwort naja ähm Formhinweis 9 Wörter 10 Zeilen Feinstrukturanalyse', 'meaning unit boundary excerpt words filler word well um form hint 9 words 10 lines fine-structure analysis'),
    [
      { h: P('Kurz', 'In brief') },
      P('Die Feinstrukturanalyse deutet einen kurzen Ausschnitt (meist etwa 10 Zeilen) in kleinen Stücken, den Sinneinheiten. Eine Sinneinheit ist das kleinste Stück, das für sich einen Sinn trägt: ein Wort, ein Wortteil, ein Teilsatz, selten ein ganzer Satz. Oft sind es 3 bis 5 Wörter, aber es entscheidet der Sinn, nicht die Zahl.', 'Fine-structure analysis interprets a short excerpt (usually about 10 lines) in small pieces, the meaning units. A meaning unit is the smallest piece that carries a meaning of its own: a word, part of a word, a clause, rarely a whole sentence. Often it is 3 to 5 words, but meaning decides, not the number.'),
      { ul: [
        P('Füllwörter wie „naja“ oder „also“ sind eigene Einheiten, wenn sie für sich stehen. Man deutet sie einmal gründlich; kommt dasselbe Wort im gleichen Zusammenhang wieder, gilt die frühere Deutung.', 'Filler words such as “well” or “so” are units of their own if they stand alone. They are interpreted thoroughly once; if the same word comes again in the same context, the earlier interpretation applies.'),
        P('Kleine Einheiten machen die Deutung genauer. Große Einheiten verdecken, wie ein Satz Schritt für Schritt aufgebaut ist.', 'Small units make the interpretation more precise. Large units hide how a sentence is built step by step.')
      ] },
      { h: P('Selbst machen', 'Do it yourself') },
      P('Ein erfundener Satz aus einem Interview über Arbeit: „Naja, eigentlich wollte ich ja nie ins Büro, aber dann kam halt das Angebot.“ Teilen Sie ihn in Sinneinheiten und schreiben Sie zu jeder Grenze einen Grund.', 'An invented sentence from an interview about work: “Well, actually I never wanted to work in an office, but then the offer just came.” Divide it into meaning units and write down a reason for each boundary.'),
      { h: P('Lösung', 'Solution') },
      P('Eine mögliche Einteilung. Andere Grenzen sind möglich, wenn sie begründet sind.', 'One possible division. Other boundaries are possible if they are justified.'),
      { code: P('1 Naja,\n2 eigentlich\n3 wollte ich ja nie ins Büro,\n4 aber\n5 dann kam halt das Angebot.', '1 Well,\n2 actually\n3 I never wanted to work in an office,\n4 but\n5 then the offer just came.') },
      { ul: [
        P('„Naja“ steht für sich und eröffnet die Antwort: eigene Einheit.', '“Well” stands alone and opens the answer: a unit of its own.'),
        P('„eigentlich“ kündigt einen Gegensatz an: eigene Einheit, damit man ihn deuten kann, bevor er kommt.', '“actually” announces a contrast: a unit of its own, so it can be interpreted before the contrast comes.'),
        P('„aber“ ist die Wende: Wer sie mit dem Rest verbindet, deutet den Satz von hinten.', '“but” is the turn: whoever joins it with the rest interprets the sentence from the end.')
      ] },
      falsch(P('Eine Sinneinheit ist immer ein ganzer Satz.', 'A meaning unit is always a whole sentence.'),
        P('Ganze Sätze sind selten. Meist sind es Wörter oder Teilsätze, damit jede Wendung einzeln gedeutet wird.', 'Whole sentences are rare. Usually they are words or clauses, so that every turn is interpreted on its own.')),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      STATABLE_START,
      P('Wählen Sie den Ausschnitt; der Zähler zeigt Wörter der befragten Person. In der Ansicht „Wörter“ setzen Sie Grenzen mit der Tastatur zwischen zwei Wörtern; Statable nummeriert die Einheiten und sagt die Grenze an. Ab 9 Wörtern in einer Einheit erscheint ein Formhinweis. Die Schwelle 9 ist eine Festlegung von Statable, keine Regel der Methode, und der Hinweis sperrt nichts. Statable schlägt keine Grenzen vor: Die Einteilung ist schon Deutung.', 'Choose the excerpt; the counter shows the words of the respondent. In the view “Words” you set boundaries between two words with the keyboard; Statable numbers the units and announces the boundary. From 9 words in a unit a form hint appears. The threshold 9 is a decision of Statable, not a rule of the method, and the hint blocks nothing. Statable suggests no boundaries: the division is already interpretation.'),
      mitnehmen(
        P('Eine Sinneinheit ist das kleinste Stück mit eigenem Sinn, oft 3 bis 5 Wörter.', 'A meaning unit is the smallest piece with a meaning of its own, often 3 to 5 words.'),
        P('Füllwörter sind eigene Einheiten und werden einmal gründlich gedeutet.', 'Filler words are units of their own and are interpreted thoroughly once.'),
        P('Der Ausschnitt bleibt kurz, meist etwa 10 Zeilen.', 'The excerpt stays short, usually about 10 lines.')
      )
    ], ['eh-fs-spalten', 'eh-transkription-genau']),

  // ---------------------------------------------------------------- 4 Spalten
  a('eh-fs-spalten', 'verstehen', P('Was gehört in welche Spalte? (Paraphrase, Intentionen, latente Bedeutungen, Rollenverteilung, Anschlussoptionen)', 'What goes into which column? (paraphrase, intentions, latent meanings, distribution of roles, follow-up options)'),
    P('Spalte Paraphrase Intention subjektiver Sinn latente Bedeutung objektiver Sinn Rollenverteilung Anschlussoptionen Prüfung Feinstrukturanalyse Karte Spaltensatz Sequenzverfahren IPA Objektive Hermeneutik Dokumentarische Methode Gesprächsanalyse Folgetext verdecken', 'column paraphrase intention subjective meaning latent meaning objective meaning distribution of roles follow-up options check fine-structure analysis card column set sequential methods IPA objective hermeneutics documentary method conversation analysis hide following text'),
    [
      { h: P('Kurz', 'In brief') },
      P('Zu jeder Sinneinheit gibt es fünf Spalten. Sie trennen, was dasteht, von dem, was man daraus deutet.', 'For each meaning unit there are five columns. They separate what is there from what is interpreted from it.'),
      { tabelle: { kopf: [P('Spalte', 'Column'), P('Worum es geht', 'What it is about'), P('Typischer Fehler', 'Typical mistake')], zeilen: [
        [P('Paraphrase', 'Paraphrase'), P('mit eigenen Worten, was gesagt wird (manifest)', 'what is said, in your own words (manifest)'), P('schon eine Deutung hineinschreiben', 'already writing an interpretation into it')],
        [P('Intentionen (subjektiver Sinn)', 'Intentions (subjective meaning)'), P('was die Person zeigen, erreichen oder vermeiden will; gut als „Die befragte Person möchte …“', 'what the person wants to show, achieve or avoid; good as “The respondent wants to …”'), P('Gefühle vermuten ohne Anhalt im Text', 'guessing feelings without a basis in the text')],
        [P('Latente Bedeutungen (objektiver Sinn)', 'Latent meanings (objective meaning)'), P('welche Regeln und Selbstverständlichkeiten die Äußerung voraussetzt; mehrere Lesarten', 'which rules and things taken for granted the utterance presupposes; several readings'), P('Stichworte statt Sätze, beim Einzelfall bleiben', 'keywords instead of sentences, staying with the single case')],
        [P('Rollenverteilung', 'Distribution of roles'), P('wer vorkommt, genannt oder mitgedacht; wer handelt, wer sich abgrenzt', 'who appears, named or implied; who acts, who sets themselves apart'), P('mitgedachte Personen vergessen', 'forgetting implied persons')],
        [P('Anschlussoptionen und Prüfung', 'Follow-up options and check'), P('wie es weitergehen könnte; was später kommen müsste, damit eine Lesart hält', 'how it could go on; what would have to come later for a reading to hold'), P('ein Prüfkriterium, das nichts widerlegen kann', 'a criterion that nothing can refute')]
      ] } },
      { h: P('Selbst machen', 'Do it yourself') },
      P('Erfundene Sinneinheit aus einem Interview über Sport: „Im Verein sagen sie immer, ich soll mehr trainieren.“ Ordnen Sie die fünf Sätze den Spalten zu.', 'Invented meaning unit from an interview about sport: “At the club they always say I should train more.” Assign the five sentences to the columns.'),
      { ol: [
        P('Die befragte Person erzählt, dass man ihr im Verein zu mehr Training rät.', 'The respondent tells that people at the club advise more training.'),
        P('Die befragte Person möchte zeigen, dass der Druck von außen kommt.', 'The respondent wants to show that the pressure comes from outside.'),
        P('Im Verein gilt: Wer dazugehört, steigert sich; Leistung ist die Regel.', 'At the club the rule is: whoever belongs improves; performance is the norm.'),
        P('„Sie“ im Verein sprechen, die befragte Person wird angesprochen; Trainerin oder Trainer sind mitgedacht.', '“They” at the club speak, the respondent is addressed; the coach is implied.'),
        P('Wenn die Lesart „Druck von außen“ hält, müsste später eine Abgrenzung kommen, etwa „aber ich …“.', 'If the reading “pressure from outside” holds, a distancing should come later, such as “but I …”.')
      ] },
      { h: P('Lösung', 'Solution') },
      P('1 Paraphrase, 2 Intentionen, 3 Latente Bedeutungen, 4 Rollenverteilung, 5 Anschlussoptionen und Prüfung.', '1 paraphrase, 2 intentions, 3 latent meanings, 4 distribution of roles, 5 follow-up options and check.'),
      // Stufe A4: ein Absatz zu anderen Sequenzverfahren mit Quellen (keine eigene Lehreinheit)
      { h: P('Andere Sequenzverfahren', 'Other sequential methods') },
      P('Auch andere Verfahren deuten einen Text Stück für Stück und in seiner Reihenfolge (Sequenzanalyse): die Objektive Hermeneutik (Oevermann), die Dokumentarische Methode (Bohnsack), die Gesprächsanalyse und die Interpretative Phänomenologische Analyse (IPA) mit ihren Randnotizen in drei Schichten (beschreibend, sprachlich, begrifflich). Ihre Spalten und Regeln sind andere als die fünf Spalten hier. Statable gibt für diese Verfahren keine Regeln vor. Beim Anlegen einer Analyse wählen Sie andere Spalten (Spaltensatz): „IPA“, „Eine freie Spalte“ oder einen eigenen Satz mit Name und Leitfragen je Spalte. Der Schalter „Folgetext verdecken“ (nicht vorauslesen) geht mit jedem Spaltensatz. Die Regeln Ihres Verfahrens stehen in der Literatur, nicht in Statable.', 'Other methods also interpret a text piece by piece and in its order (sequential analysis): objective hermeneutics (Oevermann), the documentary method (Bohnsack), conversation analysis and interpretative phenomenological analysis (IPA) with its exploratory notes in three layers (descriptive, linguistic, conceptual). Their columns and rules differ from the five columns here. Statable sets no rules for these methods. When you create an analysis you choose other columns (column set): “IPA”, “One free column” or your own set with a name and guiding questions for each column. The switch “Hide the following text” (no reading ahead) works with every column set. The rules of your method are in the literature, not in Statable.'),
      P('Quellen: Smith, J. A., Flowers, P. & Larkin, M. (2022). Interpretative Phenomenological Analysis: Theory, Method and Research (2. Aufl.). Sage. - Wernet, A. (2009). Einführung in die Interpretationstechnik der Objektiven Hermeneutik (3. Aufl.). VS Verlag. - Bohnsack, R. (2021). Rekonstruktive Sozialforschung (10. Aufl.). Barbara Budrich. - Deppermann, A. (2008). Gespräche analysieren (4. Aufl.). VS Verlag.', 'Sources: Smith, J. A., Flowers, P. & Larkin, M. (2022). Interpretative Phenomenological Analysis: Theory, Method and Research (2nd ed.). Sage. - Wernet, A. (2009). Einführung in die Interpretationstechnik der Objektiven Hermeneutik (3rd ed.). VS Verlag. - Bohnsack, R. (2021). Rekonstruktive Sozialforschung (10th ed.). Barbara Budrich. - Deppermann, A. (2008). Gespräche analysieren (4th ed.). VS Verlag.'),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      STATABLE_START,
      P('Nach dem Einteilen zeigt Statable für die aktuelle Sinneinheit eine Karte mit den fünf Spalten als Abschnitte. In „Latente Bedeutungen“ legen Sie mit „Lesart hinzufügen“ mehrere Lesarten an, jede mit Prüfkriterium. „Einheit fertig“ führt zur nächsten Einheit.', 'After dividing, Statable shows a card with the five columns as sections for the current meaning unit. In “Latent meanings” you add several readings with “Add reading”, each with a criterion. “Unit done” leads to the next unit.'),
      mitnehmen(
        P('Die Paraphrase gibt nur wieder, was dasteht.', 'The paraphrase only repeats what is there.'),
        P('Latente Bedeutungen haben immer mehrere Lesarten.', 'Latent meanings always have several readings.'),
        P('Zur Rollenverteilung gehören auch mitgedachte Personen.', 'Implied persons also belong to the distribution of roles.')
      )
    ], ['eh-fs-manifest-latent', 'eh-fs-lesarten']),

  // ---------------------------------------------------------------- 5 Lesarten
  a('eh-fs-lesarten', 'verstehen', P('Wann muss ich eine Deutung aufgeben? (Lesart, Prüfkriterium, Sequenzanalyse, nicht vorauslesen)', 'When must I give up an interpretation? (reading, criterion, sequence analysis, no reading ahead)'),
    P('Lesart Prüfkriterium hält verworfen offen Sequenzanalyse nicht vorauslesen Reihenfolge Feinstrukturanalyse', 'reading criterion holds rejected open sequence analysis no reading ahead order fine-structure analysis'),
    [
      { h: P('Kurz', 'In brief') },
      P('Eine Lesart ist eine mögliche Deutung einer Sinneinheit. Es gibt immer mehrere. Jede bekommt ein Prüfkriterium: was im weiteren Text vorkommen müsste oder nicht vorkommen dürfte, damit sie hält. An jeder neuen Einheit prüfen Sie die offenen Lesarten: Sie halten, werden verworfen oder bleiben offen.', 'A reading is a possible interpretation of a meaning unit. There are always several. Each gets a criterion: what would have to appear, or must not appear, in the following text for it to hold. At each new unit you check the open readings: they hold, are rejected or stay open.'),
      { ul: [
        P('Nicht vorauslesen: Beim Deuten einer Einheit ist nur der Text bis zu ihr bekannt. Wer weiß, wie der Satz endet, prüft nichts mehr.', 'No reading ahead: when interpreting a unit only the text up to it is known. Whoever knows how the sentence ends no longer tests anything.'),
        P('„Hält“ ist vorläufig: Eine Lesart, die an Einheit 4 hält, kann an Einheit 7 fallen.', '“Holds” is provisional: a reading that holds at unit 4 can fall at unit 7.'),
        P('Verworfene Lesarten bleiben stehen, mit dem Wort „verworfen“ und der Einheit. Das Verwerfen ist Teil der Methode.', 'Rejected readings remain, with the word “rejected” and the unit. Rejecting is part of the method.'),
        P('Ein gutes Prüfkriterium kann scheitern. „Es kommt noch etwas dazu“ kann nie scheitern und prüft darum nichts.', 'A good criterion can fail. “Something more will follow” can never fail and therefore tests nothing.')
      ] },
      { h: P('Selbst machen', 'Do it yourself') },
      P('Erfundene Einheit 1 aus einem Interview über Wohnen: „Die Wohnung war eigentlich perfekt“. Lesart A: Gleich kommt eine Einschränkung. Lesart B: Die Person will zeigen, dass sie gut gewählt hat. Schreiben Sie zu beiden ein Prüfkriterium. Lesen Sie dann Einheit 2: „und wir wohnen immer noch gern dort.“ Was hält, was fällt?', 'Invented unit 1 from an interview about housing: “The flat was actually perfect”. Reading A: a restriction is about to come. Reading B: the person wants to show they chose well. Write a criterion for both. Then read unit 2: “and we still like living there.” What holds, what falls?'),
      { h: P('Lösung', 'Solution') },
      { ul: [
        P('Kriterium A: Bald muss ein „aber“ oder ein Nachteil kommen. Kriterium B: Es dürfte kein Bedauern über die Wahl kommen.', 'Criterion A: soon a “but” or a drawback must come. Criterion B: no regret about the choice should come.'),
        P('Nach Einheit 2: A wird verworfen an Einheit 2 (statt einer Einschränkung kommt Zustimmung). B hält vorläufig und bleibt in Prüfung.', 'After unit 2: A is rejected at unit 2 (instead of a restriction, agreement comes). B holds provisionally and stays under test.'),
        P('Hätten Sie Einheit 2 vorher gelesen, hätten Sie A gar nicht aufgeschrieben, und das Wort „eigentlich“ wäre ungedeutet geblieben.', 'Had you read unit 2 beforehand, you would not have written down A at all, and the word “actually” would have stayed uninterpreted.')
      ] },
      { h: P('So geht es in Statable', 'How it works in Statable') },
      STATABLE_START,
      P('Text nach der aktuellen Einheit ist im Arbeitsplatz nicht auf der Seite, auch nicht für Screenreader oder die Suche. Im Transkript selbst ist er lesbar: Lesen Sie den Ausschnitt dort nicht vorher. Bei jeder neuen Einheit zeigt „Lesarten prüfen“ die offenen Lesarten mit Prüfkriterium; den Stand wählen Sie, Statable setzt ihn nie selbst und zählt oder ordnet Lesarten nicht.', 'Text after the current unit is not on the page in the workspace, not even for screen readers or search. In the transcript itself it can be read: do not read the excerpt there beforehand. At each new unit “Check readings” shows the open readings with their criterion; you choose the status, Statable never sets it and does not count or rank readings.'),
      mitnehmen(
        P('Jede Lesart braucht ein Prüfkriterium, das scheitern kann.', 'Every reading needs a criterion that can fail.'),
        P('Deuten Sie nur mit dem Text bis zur aktuellen Einheit.', 'Interpret only with the text up to the current unit.'),
        P('Verworfene Lesarten bleiben sichtbar; „hält“ ist vorläufig.', 'Rejected readings stay visible; “holds” is provisional.')
      )
    ], ['eh-fs-spalten', 'eh-fs-zwischenfazit']),

  // ---------------------------------------------------------------- 6 Zwischenfazit
  a('eh-fs-zwischenfazit', 'verstehen', P('Wie wird aus vielen Deutungen ein Ergebnis? (Zwischenreflexion, Deutungsmuster, Zwischenfazit)', 'How do many interpretations become a result? (interim reflection, pattern of interpretation, interim conclusion)'),
    P('Zwischenreflexion Deutungsmuster Zwischenfazit Textstelle Forschungsfrage vorläufig Word Methodenanhang Feinstrukturanalyse', 'interim reflection pattern of interpretation interim conclusion text passage research question provisional Word method appendix fine-structure analysis'),
    [
      { h: P('Kurz', 'In brief') },
      P('Nach einigen Einheiten halten Sie inne. Diese Zwischenreflexion beantwortet drei Fragen: Welche Begriffe und Spuren behalte ich im Auge? Was habe ich bisher herausgefunden? Was muss ich noch prüfen, und woran?', 'After some units you pause. This interim reflection answers three questions: which terms and traces do I keep in mind? What have I found so far? What must I still check, and against what?'),
      P('Am Ende steht das Zwischenfazit: Es fasst die Deutungsmuster zusammen. Ein Deutungsmuster ist eine Deutung, die sich über mehrere Einheiten bestätigt hat. Jedes Muster wird mit Textstellen belegt und auf die Forschungsfrage bezogen. Das Fazit bleibt vorläufig, denn es beruht auf einem kurzen Ausschnitt.', 'At the end comes the interim conclusion: it sums up the patterns of interpretation. A pattern of interpretation is an interpretation that has been confirmed across several units. Each pattern is backed by text passages and related to the research question. The conclusion stays provisional, because it rests on a short excerpt.'),
      { h: P('Selbst machen', 'Do it yourself') },
      P('Nehmen Sie das Wohnungs-Beispiel aus „Lesarten prüfen“: Lesart B (die Person will zeigen, dass sie gut gewählt hat) hielt an Einheit 2. Stellen Sie sich vor, sie hält auch an zwei weiteren Einheiten. Schreiben Sie ein Zwischenfazit von zwei Sätzen mit Textstelle und einem vorläufigen Satzanfang.', 'Take the flat example from “Check readings”: reading B (the person wants to show they chose well) held at unit 2. Imagine it also holds at two more units. Write an interim conclusion of two sentences with a text passage and a provisional sentence opening.'),
      { h: P('Lösung', 'Solution') },
      P('So kann es aussehen: „Nach diesem Ausschnitt deutet sich an, dass die befragte Person ihre Wohnentscheidung als gelungene eigene Wahl darstellt (Einheit 2: ‚und wir wohnen immer noch gern dort‘). Zu prüfen bleibt, ob das auch bei Nachteilen gilt.“ Wichtig sind die Textstelle, der vorläufige Ton und die offene Frage.', 'This is what it can look like: “After this excerpt it appears that the respondent presents the housing decision as a successful choice of their own (unit 2: ‘and we still like living there’). It remains to be checked whether this also holds for drawbacks.” What matters is the text passage, the provisional tone and the open question.'),
      falsch(P('Ein Zwischenfazit zählt, wie viele Lesarten gehalten haben.', 'An interim conclusion counts how many readings held.'),
        P('Es zählt nicht, es fasst zusammen, was sich bestätigt hat, und belegt es mit Textstellen.', 'It does not count; it sums up what has been confirmed and backs it with text passages.')),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      STATABLE_START,
      P('Nach jeder 4. Einheit bietet Statable die Zwischenreflexion an (freiwillig). Nach allen Einheiten öffnet sich das Zwischenfazit: Sie wählen Sinneinheiten, Statable fügt Nummer und Zitat ein. Als Vorschlag gibt es nur einen Satzanfang für den vorläufigen Ton, nie einen Inhalt. „Ergebnis aufbereiten“ schreibt das Word mit Deutung, Lesarten samt Prüfung und Methodenanhang.', 'After every 4th unit Statable offers the interim reflection (optional). After all units the interim conclusion opens: you choose meaning units, Statable inserts number and quotation. The only suggestion is a sentence opening for the provisional tone, never a content. “Prepare result” writes the Word file with interpretation, readings with their check and the method appendix.'),
      mitnehmen(
        P('Die Zwischenreflexion fragt: Was behalte ich im Auge, was weiß ich, was prüfe ich noch?', 'The interim reflection asks: what do I keep in mind, what do I know, what do I still check?'),
        P('Ein Deutungsmuster hat sich über mehrere Einheiten bestätigt und hat Textstellen.', 'A pattern of interpretation has been confirmed across several units and has text passages.'),
        P('Das Zwischenfazit bleibt vorläufig und bezieht sich auf die Forschungsfrage.', 'The interim conclusion stays provisional and relates to the research question.')
      )
    ], ['eh-fs-lesarten', 'eh-fs-software']),

  // ---------------------------------------------------------------- 7 Software und Deutung
  a('eh-fs-software', 'verstehen', P('Was darf ein Programm, was nicht? (Software und KI in der interpretativen Forschung)', 'What may a program do and what not? (software and AI in interpretive research)'),
    P('Software KI künstliche Intelligenz Deutung Verwaltung Feinstrukturanalyse Statable deutet nicht Vorschlag Lesart Übereinstimmung Gruppe', 'software AI artificial intelligence interpretation administration fine-structure analysis Statable does not interpret suggestion reading agreement group'),
    [
      { h: P('Kurz', 'In brief') },
      P('Software kann viel Arbeit abnehmen: ordnen, nummerieren, verdecken, Formfehler zeigen, das Word schreiben. Die Deutung selbst bleibt beim Menschen. Wer sich Grenzen, Lesarten oder ein Fazit vorschlagen lässt, legt sich zu früh fest und deutet nicht mehr selbst. Darum schlägt Statable nichts davon vor, auch nicht „als Idee“.', 'Software can take over much work: ordering, numbering, hiding, showing form errors, writing the Word file. The interpretation itself stays with the human. Whoever lets boundaries, readings or a conclusion be suggested commits too early and no longer interprets themselves. That is why Statable suggests none of this, not even “as an idea”.'),
      { tabelle: { kopf: [P('Statable tut', 'Statable does'), P('nur der Mensch tut', 'only the human does')], zeilen: [
        [P('Wörter zählen, Einheiten nummerieren', 'count words, number units'), P('Grenzen der Sinneinheiten setzen', 'set the boundaries of meaning units')],
        [P('späteren Text verdecken', 'hide later text'), P('Lesarten und Prüfkriterien schreiben', 'write readings and criteria')],
        [P('offene Lesarten zur Prüfung zeigen', 'show open readings for checking'), P('den Stand setzen: hält, verworfen, offen', 'set the status: holds, rejected, open')],
        [P('Formhinweise geben (lange Einheit, leere Spalte)', 'give form hints (long unit, empty column)'), P('das Zwischenfazit schreiben', 'write the interim conclusion')],
        [P('Gruppen-Dateien zusammenführen und Herkunft zeigen', 'merge group files and show their origin'), P('gleiche Einträge zusammenlegen und besprechen', 'join equal entries and discuss them')]
      ] } },
      P('Statable zählt und ordnet Lesarten nicht und rechnet keine Übereinstimmungszahl zwischen Gruppen: In der interpretativen Forschung zählt das Argument am Text, nicht die Mehrheit.', 'Statable does not count or rank readings and computes no agreement figure between groups: in interpretive research the argument from the text counts, not the majority.'),
      { h: P('Selbst machen', 'Do it yourself') },
      P('Sortieren Sie: Verwaltung (darf ein Programm) oder Deutung (macht der Mensch)? a) die Einheiten nummerieren, b) entscheiden, ob „naja“ eine eigene Einheit ist, c) die Lesarten nach Häufigkeit ordnen, d) ein Word mit Zeilennummern schreiben, e) ein Prüfkriterium formulieren.', 'Sort: administration (a program may do it) or interpretation (the human does it)? a) number the units, b) decide whether “well” is a unit of its own, c) rank the readings by frequency, d) write a Word file with line numbers, e) formulate a criterion.'),
      { h: P('Lösung', 'Solution') },
      P('Verwaltung: a und d. Deutung: b und e. Und c gehört nirgends hin: Lesarten nach Häufigkeit zu ordnen widerspricht der Methode, denn eine einzelne gut begründete Lesart kann gegen viele halten.', 'Administration: a and d. Interpretation: b and e. And c belongs nowhere: ranking readings by frequency contradicts the method, because a single well-justified reading can hold against many.'),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      STATABLE_START,
      P('Achten Sie beim Arbeiten darauf, was Statable anzeigt: Zähler, Nummern, Formhinweise und die Liste „Lesarten prüfen“. Alle Inhalte schreiben Sie selbst. Der Methodenanhang im Word nennt nur Fakten zum Ablauf, keine Deutung.', 'While working, notice what Statable shows: counters, numbers, form hints and the list “Check readings”. You write all contents yourself. The method appendix in the Word file names only facts about the procedure, no interpretation.'),
      mitnehmen(
        P('Software verwaltet, der Mensch deutet.', 'Software administers, the human interprets.'),
        P('Vorschläge für Grenzen, Lesarten oder Fazit legen zu früh fest.', 'Suggestions for boundaries, readings or conclusion commit too early.'),
        P('Keine Zählung, keine Rangfolge, keine Übereinstimmungszahl.', 'No counting, no ranking, no agreement figure.')
      )
    ], ['eh-fs-paradigma', 'eh-fs-zwischenfazit'])
];
