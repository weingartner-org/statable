/**
 * Der Katalog der Beispiele (Startseite → „Beispiele“). Jedes Beispiel: eine Geschichte, Daten, eine kleine Lernreise aus Fragen.
 * Erfundene Daten: scripts/erzeuge-beispiele.mjs. Echte Daten tragen `echt: true` und eine Quelle (`quelle`); die neuen echten Datensätze vom 07.11.2026 stehen in lib/beispiele-echt-*.ts,
 * ihre Aufbereitung in scripts/beispiele-echt/ (Herkunft, Lizenz, Abrufdatum, Schritte).
 * Texte ohne Du/Sie, damit sie für beide Anreden passen. Jeder Text ein Textpaar mit P (Deutsch, Englisch); der Bau hängt den Schlüssel an,
 * jede andere Sprache übersetzt ihn (Bezeichnungen, Wertelabels, Texte, Spaltennamen - SPALTENNAMEN). Die Rohwerte der CSV-Dateien bleiben, Textwerte übersetzt `zellen`.
 */
import { P, type Paar } from '../i18n/laufzeit';
import { waehle } from './sitzung.svelte';
import { gueltigerName } from './skalabau';
import type { Werte } from './verfahren';
import type { MehrfachSet } from './mehrfach';
import { BEISPIELE_ECHT_A, SPALTEN_ECHT_A } from './beispiele-echt-a';
import { BEISPIELE_ECHT_B, SPALTEN_ECHT_B } from './beispiele-echt-b';
import { BEISPIELE_ECHT_C, SPALTEN_ECHT_C } from './beispiele-echt-c';
import { BEISPIELE_ECHT_D, SPALTEN_ECHT_D } from './beispiele-echt-d';
import { BEISPIELE_PSYCH_A, SPALTEN_PSYCH_A } from './beispiele-psych-a';
import { BEISPIELE_PSYCH_B, SPALTEN_PSYCH_B } from './beispiele-psych-b';
import { BEISPIELE_WIRTSCHAFT, SPALTEN_WIRTSCHAFT } from './beispiele-wirtschaft';

/** Ein Textpaar in der gewählten Sprache (Kurzform für die Seiten; neuer Code nimmt `waehle`). */
export const t = (p: Paar) => waehle(p);

export type Fach = 'bildung' | 'psych' | 'gesundheit' | 'sozial' | 'natur' | 'technik' | 'sprache' | 'methodik';
export const FAECHER: { id: Fach; name: Paar }[] = [
  { id: 'bildung', name: P('Bildungswissenschaft', 'Education') },
  { id: 'psych', name: P('Psychologie', 'Psychology') },
  { id: 'gesundheit', name: P('Gesundheit und Sport', 'Health and sport') },
  { id: 'sozial', name: P('Sozialwissenschaft und Wirtschaft', 'Social science and business') },
  { id: 'natur', name: P('Natur und Umwelt', 'Nature and environment') },
  { id: 'technik', name: P('Technik und Qualität', 'Engineering and quality') },
  { id: 'sprache', name: P('Sprache, Kultur und Geschichte', 'Language, culture and history') },
  { id: 'methodik', name: P('Forschungsmethoden', 'Research methods') }
];
export const STUFEN: Paar[] = [P('Einstieg', 'Beginner'), P('Aufbau', 'Intermediate'), P('Fortgeschritten', 'Advanced')];

export interface Schritt {
  /** Frageart (verfahren.id), oder 'planen' (Seite Studie planen) */
  art: string;
  w?: Partial<Werte>;
  titel: Paar;
  text: Paar;
}
export interface Beispiel {
  id: string;
  fach: Fach;
  stufe: 1 | 2 | 3;
  /** CSV in public/beispiel/<datei>.csv; fehlt = Meta-Analyse (Tabelle statt Datei) */
  datei?: string;
  fälle: number;
  minuten: number;
  echt?: boolean;
  titel: Paar;
  kurz: Paar;
  geschichte: Paar;
  lernen: Paar[];
  /** Spaltenbezeichnungen (VARIABLE LABELS): Spaltenname bleibt, die Bezeichnung wird übersetzt */
  bez: { spalte: string; bez: Paar }[];
  /** Wertebezeichnungen (VALUE LABELS): je Spalte die Zahl und ihr Text */
  werte?: { spalte: string; labels: [number, Paar][] }[];
  ordinal?: string[];
  nominal?: string[];
  /** Textwerte der Daten in anderen Sprachen übersetzen (Spalte → Wort der Datei → Paar; Deutsch = Wort der Datei) */
  zellen?: Record<string, Record<string, Paar>>;
  sets?: MehrfachSet[];
  schritte: Schritt[];
  quelle?: Paar;
}

export const BEISPIELE: Beispiel[] = [
  {
    id: 'lesetraining', fach: 'bildung', stufe: 1, datei: 'lesetraining', fälle: 96, minuten: 15,
    titel: P('Hilft das Lesetraining?', 'Does the reading training help?'),
    kurz: P('Acht 4. Klassen, vier üben mit einem Lesetraining. Wirkt es - oder werden alle Kinder ohnehin besser?', 'Eight grade-4 classes, four use a reading training. Does it work - or do all children improve anyway?'),
    geschichte: P('Eine Schule testet ein Lesetraining. Vier Klassen machen es mit (Training), vier nicht (Kontrolle). Alle Kinder schreiben vor und nach acht Wochen und noch einmal drei Monate später einen Lesetest und füllen einen kurzen Fragebogen zur Lesemotivation aus. Bei vier Kindern fehlen die Tests nach dem Training (krank).', 'A school tests a reading training. Four classes do it (training), four do not (control). All children take a reading test before and after eight weeks and again three months later, and fill in a short questionnaire on reading motivation. Four children missed the tests after the training (ill).'),
    lernen: [P('Warum eine Kontrollgruppe nötig ist: Auch ohne Training werden Kinder besser.', 'Why a control group is needed: children improve even without training.'), P('Vorher-nachher und Gruppenvergleich zusammen lesen (Wechselwirkung).', 'Reading before-after and group comparison together (interaction).'), P('Zwei Gruppierungen und eine Kontrollvariable: Wechselwirkung und Kovarianzanalyse.', 'Two groupings and a control variable: interaction and analysis of covariance.'), P('Effektstärke statt nur „signifikant“.', 'Effect size instead of just "significant".'), P('Fehlende Werte und Kinder in Klassen (nicht unabhängig).', 'Missing values and children in classes (not independent).'), P('Wie viele Kinder bräuchte die nächste Studie?', 'How many children would the next study need?')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer', 'Case number') },
      { spalte: 'klasse', bez: P('Klasse', 'Class') },
      { spalte: 'gruppe', bez: P('Gruppe', 'Group') },
      { spalte: 'geschlecht', bez: P('Geschlecht', 'Gender') },
      { spalte: 'lesen_vor', bez: P('Lesetest vorher (Punkte)', 'Reading test before (points)') },
      { spalte: 'lesen_nach', bez: P('Lesetest nachher (Punkte)', 'Reading test after (points)') },
      { spalte: 'lesen_nachtest', bez: P('Lesetest drei Monate später (Punkte)', 'Reading test three months later (points)') },
      { spalte: 'lesen_zuwachs', bez: P('Zuwachs (nachher minus vorher)', 'Gain (after minus before)') },
      { spalte: 'motivation_vor', bez: P('Lesemotivation vorher (1-5)', 'Reading motivation before (1-5)') },
      { spalte: 'motivation_nach', bez: P('Lesemotivation nachher (1-5)', 'Reading motivation after (1-5)') }
    ],
    nominal: ['klasse', 'gruppe', 'geschlecht'],
    zellen: { gruppe: { Training: P('Training', 'Training'), Kontrolle: P('Kontrolle', 'Control') }, geschlecht: { weiblich: P('weiblich', 'female'), 'männlich': P('männlich', 'male') } },
    schritte: [
      { art: 'verteilung', w: { l1: ['lesen_vor', 'lesen_nach'] }, titel: P('Erst anschauen', 'Look first'), text: P('Wie verteilen sich die Lesetests? Mittelwert, Streuung, Form. Gibt es Ausreißer? Zuerst anschauen, dann testen.', 'How are the reading tests distributed? Mean, spread, shape. Any outliers? Look first, then test.') },
      { art: 'praepost', w: { l1: ['lesen_vor'], l2: ['lesen_nach'] }, titel: P('Alle Kinder: besser geworden?', 'All children: improved?'), text: P('Ja, deutlich. Aber: Das sagt nichts über das Training, denn die Kontrollklassen sind dabei. Übung und Reifung wirken auch dort.', 'Yes, clearly. But this says nothing about the training, because the control classes are included. Practice and maturation work there too.') },
      { art: 'messwiederholung', w: { l1: ['lesen_vor', 'lesen_nach', 'lesen_nachtest'], l2: ['gruppe'] }, titel: P('Training gegen Kontrolle über drei Tests', 'Training versus control over three tests'), text: P('Die Wechselwirkung Zeit × Gruppe ist die eigentliche Frage: Steigt die Trainingsgruppe stärker, und bleibt der Vorsprung nach drei Monaten? Das Diagramm zeigt zwei Linien.', 'The time × group interaction is the real question: does the training group rise more, and does the lead remain after three months? The chart shows two lines.') },
      { art: 'gruppen', w: { l1: ['lesen_zuwachs'], l2: ['gruppe'] }, titel: P('Der einfache Weg: Zuwachs vergleichen', 'The simple way: compare gains'), text: P('Pro Kind der Zuwachs (nachher minus vorher), dann ein Gruppenvergleich. Gleiche Frage, einfacher zu erzählen. Training etwa +8 Punkte, Kontrolle etwa +2; die Effektstärke d ist groß.', 'The gain per child (after minus before), then a group comparison. Same question, easier to tell. Training about +8 points, control about +2; the effect size d is large.') },
      { art: 'gruppen', w: { l1: ['lesen_nach'], l2: ['gruppe'], l3: ['geschlecht'] }, titel: P('Training und Geschlecht zugleich', 'Training and gender together'), text: P('Zwei Gruppierungen in einer Analyse: Wirkt das Training bei Mädchen und Jungen gleich? Die Wechselwirkung steht zuerst; das Diagramm zeigt zwei Linien. Hier gibt es keine deutliche Wechselwirkung, und der Unterschied zwischen Training und Kontrolle ist beim Nachher-Test allein nicht deutlich.', 'Two groupings in one analysis: does the training work the same for girls and boys? The interaction comes first; the chart shows two lines. Here there is no clear interaction, and the difference between training and control on the after-test alone is not clear.') },
      { art: 'gruppen', w: { l1: ['lesen_nach'], l2: ['gruppe'], l4: ['lesen_vor'] }, titel: P('Nachher-Test bei gleichem Vorher-Wert', 'After-test at the same before-value'), text: P('Die Kinder starten verschieden gut. Die Kovarianzanalyse vergleicht die Gruppen bei gleichem Wert des Lesetests vorher (Kontrollvariable unter „Weitere Wege“). Jetzt wird der Vorsprung des Trainings deutlich: adjustiert etwa 59 gegen 53 Punkte. Voraussetzung: Der Vorher-Test wurde vor dem Training erhoben.', 'The children start at different levels. The analysis of covariance compares the groups at the same value of the reading test before (control variable under "More options"). Now the lead of the training becomes clear: adjusted about 59 versus 53 points. Requirement: the before-test was taken before the training.') },
      { art: 'mehrebenen', w: { l1: ['lesen_nach'], l2: ['klasse'], l3: ['lesen_vor'] }, titel: P('Kinder sitzen in Klassen', 'Children sit in classes'), text: P('Kinder einer Klasse ähneln einander. Das Mehrebenenmodell nimmt das ernst. Wie viel der Unterschiede liegt bei den Klassen? (Braucht einmalig R im Browser.)', 'Children in one class resemble each other. The multilevel model takes this seriously. How much of the differences lies with the classes? (Needs R in the browser once.)') },
      { art: 'planen', titel: P('Die nächste Studie planen', 'Plan the next study'), text: P('Wie viele Kinder bräuchte eine neue Studie, um einen mittleren Effekt (d = 0,5) zu finden? Die Poweranalyse sagt es vor der Erhebung.', 'How many children would a new study need to find a medium effect (d = 0.5)? Power analysis tells before data collection.') }
    ]
  },
  {
    id: 'uebertritt', fach: 'bildung', stufe: 2, datei: 'uebertritt', fälle: 240, minuten: 20,
    titel: P('Übertritt nach der Volksschule', 'Transition after primary school'),
    kurz: P('Wer bekommt eine AHS-Empfehlung? Zählen nur Noten - oder auch die Bildung der Eltern?', 'Who gets a grammar-school recommendation? Do only grades count - or also parents\' education?'),
    geschichte: P('Am Ende der 4. Klasse Volksschule empfehlen Lehrkräfte die AHS oder die Mittelschule. Die Daten von 240 Kindern: Lesetest, Noten in Mathematik und Deutsch, Fehltage, höchste Bildung der Eltern und die Empfehlung. Die Frage der Bildungsgerechtigkeit: Zählt bei gleichen Leistungen die Herkunft?', 'At the end of grade 4 teachers recommend the grammar school (AHS) or the middle school (Mittelschule). Data of 240 children: reading test, grades in math and German, days absent, parents\' highest education and the recommendation. The question of equity: does background count at equal achievement?'),
    lernen: [P('Gruppen vergleichen: Varianzanalyse und Paarvergleiche.', 'Comparing groups: analysis of variance and pairwise comparisons.'), P('Zählungen vergleichen: Kreuztabelle, Chi², Cramérs V.', 'Comparing counts: crosstab, chi-square, Cramér\'s V.'), P('Noten sind geordnet, aber keine Zahlen mit gleichen Abständen: Rangverfahren.', 'Grades are ordered but not numbers with equal gaps: rank methods.'), P('Mehrere Einflüsse zugleich: logistische Regression.', 'Several influences at once: logistic regression.')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer', 'Case number') },
      { spalte: 'geschlecht', bez: P('Geschlecht', 'Gender') },
      { spalte: 'bildung_eltern', bez: P('Höchste Bildung der Eltern', 'Parents\' highest education') },
      { spalte: 'lesetest', bez: P('Lesetest (Punkte)', 'Reading test (points)') },
      { spalte: 'note_mathe', bez: P('Note Mathematik', 'Grade math') },
      { spalte: 'note_deutsch', bez: P('Note Deutsch', 'Grade German') },
      { spalte: 'fehltage', bez: P('Fehltage im Schuljahr', 'Days absent') },
      { spalte: 'empfehlung', bez: P('Empfehlung', 'Recommendation') }
    ],
    werte: [
      { spalte: 'bildung_eltern', labels: [[1, P('Pflichtschule oder Lehre', 'Compulsory school or apprenticeship')], [2, P('Matura', 'School leaving certificate')], [3, P('Hochschule', 'University')]] },
      { spalte: 'empfehlung', labels: [[1, P('Mittelschule', 'Middle school')], [2, P('AHS', 'Grammar school (AHS)')]] }
    ],
    nominal: ['geschlecht', 'empfehlung'], ordinal: ['bildung_eltern', 'note_mathe', 'note_deutsch'],
    zellen: { geschlecht: { weiblich: P('weiblich', 'female'), 'männlich': P('männlich', 'male') } },
    schritte: [
      { art: 'kreuz', w: { l1: ['empfehlung'], l2: ['bildung_eltern'] }, titel: P('Empfehlung nach Elternbildung', 'Recommendation by parents\' education'), text: P('Wie oft kommt die AHS-Empfehlung in jeder Gruppe vor? Chi² prüft, wie gut die Häufigkeiten zur Annahme passen, dass es keinen Unterschied gibt; Cramérs V zeigt die Stärke.', 'How often does the AHS recommendation occur in each group? The chi-square test checks how compatible the counts are with the assumption of no difference; Cramér\'s V shows the strength.') },
      { art: 'gruppen', w: { l1: ['lesetest'], l2: ['bildung_eltern'] }, titel: P('Lesetest nach Elternbildung', 'Reading test by parents\' education'), text: P('Drei Gruppen: Varianzanalyse, dann Paarvergleiche. Welche Gruppen unterscheiden sich wirklich?', 'Three groups: analysis of variance, then pairwise comparisons. Which groups really differ?') },
      { art: 'zusammenhang', w: { l1: ['note_mathe'], l2: ['lesetest'] }, titel: P('Note und Lesetest', 'Grade and reading test'), text: P('Noten haben nur fünf Stufen: Statable schlägt eine Rangkorrelation (Spearman) vor und sagt warum. Ein negatives Vorzeichen heißt hier: bessere Leistung, bessere (kleinere) Note.', 'Grades have only five levels: Statable suggests a rank correlation (Spearman) and says why. A negative sign here means: better achievement, better (lower) grade.') },
      { art: 'vorhersage', w: { l1: ['empfehlung'], l2: ['note_mathe', 'note_deutsch', 'bildung_eltern'] }, titel: P('Was erklärt die Empfehlung?', 'What explains the recommendation?'), text: P('Logistische Regression: Zählt die Elternbildung noch, wenn die Noten schon berücksichtigt sind? Das Odds Ratio gibt die Antwort.', 'Logistic regression: does parents\' education still count once grades are accounted for? The odds ratio gives the answer.') }
    ]
  },
  {
    id: 'pruefungsangst', fach: 'psych', stufe: 2, datei: 'pruefungsangst', fälle: 220, minuten: 25,
    titel: P('Fragebogen zur Prüfungsangst', 'Test anxiety questionnaire'),
    kurz: P('Acht Fragen, zwei davon umgekehrt formuliert. Messen sie eine Sache? Und was bringt Angst für die Leistung?', 'Eight items, two worded in reverse. Do they measure one thing? And what does anxiety do to performance?'),
    geschichte: P('220 Studierende beantworten acht Aussagen zur Prüfungsangst (1 = stimmt gar nicht bis 5 = stimmt völlig). Vier Aussagen fragen nach Sorgen (pa1-pa4), vier nach Aufregung (pa5-pa8). pa3 und pa6 sind umgekehrt formuliert („Ich gehe zuversichtlich in Prüfungen“). Dazu: Selbstwirksamkeit, Lernzeit und die Prüfungsleistung.', '220 students respond to eight statements on test anxiety (1 = not at all true to 5 = completely true). Four items ask about worry (pa1-pa4), four about arousal (pa5-pa8). pa3 and pa6 are worded in reverse ("I go into exams confidently"). Also: self-efficacy, study time and exam performance.'),
    lernen: [P('Umgekehrte Fragen erkennen und umpolen.', 'Spotting and reverse-scoring reversed items.'), P('Zuverlässigkeit einer Skala: Cronbachs α.', 'Reliability of a scale: Cronbach\'s alpha.'), P('Zwei Dimensionen finden: Faktorenanalyse.', 'Finding two dimensions: factor analysis.'), P('Zusammenhang, Vorhersage und: Hängt der Zusammenhang von etwas Drittem ab (Moderation)?', 'Relationship, prediction and: does the relationship depend on something third (moderation)?')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer', 'Case number') },
      { spalte: 'geschlecht', bez: P('Geschlecht', 'Gender') },
      { spalte: 'pa1', bez: P('Vor Prüfungen mache ich mir große Sorgen', 'Before exams I worry a lot') },
      { spalte: 'pa2', bez: P('Ich denke in Prüfungen ans Durchfallen', 'In exams I think of failing') },
      { spalte: 'pa3', bez: P('Ich gehe zuversichtlich in Prüfungen (umgekehrt)', 'I go into exams confidently (reversed)') },
      { spalte: 'pa4', bez: P('Nach Prüfungen grüble ich über Fehler', 'After exams I brood over mistakes') },
      { spalte: 'pa5', bez: P('Vor Prüfungen schlägt mein Herz schneller', 'Before exams my heart beats faster') },
      { spalte: 'pa6', bez: P('Vor Prüfungen bin ich ruhig (umgekehrt)', 'Before exams I am calm (reversed)') },
      { spalte: 'pa7', bez: P('In Prüfungen zittern meine Hände', 'In exams my hands tremble') },
      { spalte: 'pa8', bez: P('Vor Prüfungen schlafe ich schlecht', 'Before exams I sleep badly') },
      { spalte: 'selbstwirksamkeit', bez: P('Selbstwirksamkeit (10-40)', 'Self-efficacy (10-40)') },
      { spalte: 'lernzeit', bez: P('Lernzeit (Stunden pro Woche)', 'Study time (hours per week)') },
      { spalte: 'pruefungsleistung', bez: P('Prüfungsleistung (Punkte)', 'Exam performance (points)') }
    ],
    nominal: ['geschlecht'], zellen: { geschlecht: { weiblich: P('weiblich', 'female'), 'männlich': P('männlich', 'male') } },
    schritte: [
      { art: 'skala', w: { l1: ['pa1', 'pa2', 'pa3', 'pa4', 'pa5', 'pa6', 'pa7', 'pa8'] }, titel: P('Wie zuverlässig misst die Skala?', 'How reliably does the scale measure?'), text: P('Cronbachs α mit allen acht Fragen: Statable zeigt, dass pa3 und pa6 gegen die anderen laufen, und bietet das Umpolen an. Danach steigt α deutlich.', 'Cronbach\'s alpha with all eight items: Statable shows that pa3 and pa6 run against the others and offers reverse-scoring. Afterwards alpha rises clearly.') },
      { art: 'faktor', w: { l1: ['pa1', 'pa2', 'pa3', 'pa4', 'pa5', 'pa6', 'pa7', 'pa8'] }, titel: P('Eine Sache oder zwei?', 'One thing or two?'), text: P('Die Faktorenanalyse sucht Gruppen von Fragen, die zusammengehören. Erwartet: Sorgen und Aufregung. (Umpolen ist hier nicht nötig: Ohne Umpolen laden pa3 und pa6 mit Minus, der Betrag bleibt gleich. Nötig ist es für Alpha.)', 'Factor analysis looks for groups of items that belong together. Expected: worry and arousal. (Reverse-scoring is not needed here: without it pa3 and pa6 load with a minus, and the absolute size stays the same. It is needed for alpha.)') },
      { art: 'gruppen', w: { l1: ['pruefungsleistung'], l2: ['geschlecht'] }, titel: P('Unterschied nach Geschlecht', 'Difference by gender'), text: P('Ein einfacher Gruppenvergleich zum Aufwärmen. Dazu die Frage: Was sagt ein kleiner Unterschied bei 220 Personen?', 'A simple group comparison to warm up. Plus the question: what does a small difference mean with 220 people?') },
      { art: 'vorhersage', w: { l1: ['pruefungsleistung'], l2: ['selbstwirksamkeit', 'lernzeit', 'pa1', 'pa2'] }, titel: P('Was sagt die Leistung voraus?', 'What predicts performance?'), text: P('Mehrere Einflüsse in einem Modell. Jeder Koeffizient gilt „bei gleichen übrigen Werten“. Größe der Effekte beachten, nicht nur p.', 'Several influences in one model. Each coefficient holds "with the other values equal". Look at effect sizes, not only p.') },
      { art: 'moderation', w: { l1: ['pa1'], l2: ['pruefungsleistung'], l3: ['selbstwirksamkeit'] }, titel: P('Schützt Selbstwirksamkeit?', 'Does self-efficacy protect?'), text: P('Moderation: Wirkt Sorge schwächer, wenn die Selbstwirksamkeit hoch ist? Die Wechselwirkung und die Steigungen bei niedriger, mittlerer und hoher Selbstwirksamkeit zeigen es.', 'Moderation: is the effect of worry weaker when self-efficacy is high? The interaction and the slopes at low, medium and high self-efficacy show it.') }
    ]
  },
  {
    id: 'depression', fach: 'psych', stufe: 2, datei: 'depression', fälle: 84, minuten: 20,
    titel: P('Therapie bei Depression', 'Therapy for depression'),
    kurz: P('Drei Messungen über sechs Monate, Therapie gegen Warteliste. Und einige Personen, die nicht mehr kommen.', 'Three measurements over six months, therapy versus waiting list. And some people who stop coming.'),
    geschichte: P('84 Personen mit Depression, per Los in Therapiegruppe oder Warteliste. Der BDI-II (0 bis 63, höher = mehr Beschwerden) wird zu Beginn, nach 8 Wochen und nach 6 Monaten erhoben. Neun Personen kamen nicht zur Nachuntersuchung, zwei fehlten nach 8 Wochen.', '84 people with depression, randomly assigned to therapy or waiting list. The BDI-II (0 to 63, higher = more symptoms) is taken at the start, after 8 weeks and after 6 months. Nine people did not come to the follow-up, two were missing at 8 weeks.'),
    lernen: [P('Mehr als zwei Messzeitpunkte: Messwiederholung und Sphärizität.', 'More than two time points: repeated measures and sphericity.'), P('Die Wechselwirkung Zeit × Gruppe als Beleg für die Wirkung.', 'The time × group interaction as evidence of the effect.'), P('Was geschieht mit Personen, die ausfallen?', 'What happens to people who drop out?'), P('Zwei Zeitpunkte genauer: Effektstärke und Diagramm.', 'Two time points in detail: effect size and chart.')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer', 'Case number') },
      { spalte: 'gruppe', bez: P('Gruppe', 'Group') },
      { spalte: 'alter', bez: P('Alter (Jahre)', 'Age (years)') },
      { spalte: 'bdi_beginn', bez: P('BDI-II zu Beginn', 'BDI-II at start') },
      { spalte: 'bdi_nach8wochen', bez: P('BDI-II nach 8 Wochen', 'BDI-II after 8 weeks') },
      { spalte: 'bdi_nach6monaten', bez: P('BDI-II nach 6 Monaten', 'BDI-II after 6 months') }
    ],
    nominal: ['gruppe'], zellen: { gruppe: { Therapie: P('Therapie', 'Therapy'), Warteliste: P('Warteliste', 'Waiting list') } },
    schritte: [
      { art: 'verteilung', w: { l1: ['bdi_beginn', 'bdi_nach8wochen', 'bdi_nach6monaten'] }, titel: P('Fehlende Werte sehen', 'Seeing missing values'), text: P('Wie viele gültige Werte hat jede Messung? Bei der letzten fehlen neun. Ob das Zufall ist, entscheidet über die Deutung.', 'How many valid values does each measurement have? Nine are missing at the last one. Whether this is chance decides the interpretation.') },
      { art: 'messwiederholung', w: { l1: ['bdi_beginn', 'bdi_nach8wochen', 'bdi_nach6monaten'], l2: ['gruppe'] }, titel: P('Verlauf nach Gruppe', 'Course by group'), text: P('Drei Zeitpunkte, zwei Gruppen. Das Diagramm zeigt zwei Linien: Die Therapiegruppe fällt, die Warteliste kaum. Die Wechselwirkung ist der Beleg. Es zählen nur Personen mit allen Messungen (n steht dabei).', 'Three time points, two groups. The chart shows two lines: the therapy group falls, the waiting list barely. The interaction is the evidence. Only people with all measurements count (n is shown).') },
      { art: 'praepost', w: { l1: ['bdi_beginn'], l2: ['bdi_nach8wochen'] }, titel: P('Nur Beginn gegen 8 Wochen', 'Start versus 8 weeks only'), text: P('Zwei Zeitpunkte in einem gepaarten t-Test, mit Effektstärke dz und Konfidenzintervall. So sieht ein Ergebnis für den Bericht aus.', 'Two time points in a paired t test, with effect size dz and confidence interval. This is what a result for the report looks like.') },
      { art: 'gruppen', w: { l1: ['bdi_nach8wochen'], l2: ['gruppe'] }, titel: P('Gruppen nach 8 Wochen', 'Groups after 8 weeks'), text: P('Der direkte Vergleich der beiden Gruppen am Ende. Beim Start waren sie gleich - das ist wegen der Zufallszuteilung zu erwarten.', 'The direct comparison of the two groups at the end. At the start they were equal - to be expected because of random assignment.') }
    ]
  },
  {
    id: 'rauchstopp', fach: 'gesundheit', stufe: 3, datei: 'rauchstopp', fälle: 180, minuten: 25,
    titel: P('Rückfall nach dem Rauchstopp', 'Relapse after quitting smoking'),
    kurz: P('Wie lange halten Menschen durch? Drei Programme, und viele sind am Ende noch dabei - das braucht eine eigene Methode.', 'How long do people last? Three programs, and many are still in at the end - this needs a method of its own.'),
    geschichte: P('180 Raucherinnen und Raucher nehmen an einem von drei Programmen teil: Beratung, Nikotinersatz oder Gruppentraining. Ein Jahr lang wird beobachtet, wann ein Rückfall eintritt. Wer bis zum Ende (52 Wochen) durchhält oder vorher ausscheidet, ist „zensiert“: Man weiß nur, dass bis dahin kein Rückfall war.', '180 smokers take part in one of three programs: counseling, nicotine replacement or group training. They are followed for a year to see when a relapse happens. Those who last until the end (52 weeks) or drop out earlier are "censored": all that is known is that there was no relapse up to then.'),
    lernen: [P('Zensierte Daten: warum Mittelwert der Wochen falsch wäre.', 'Censored data: why a mean of weeks would be wrong.'), P('Kaplan-Meier-Kurven und der Log-Rank-Test.', 'Kaplan-Meier curves and the log-rank test.'), P('Ein Ja/Nein-Ergebnis vorhersagen: logistische Regression.', 'Predicting a yes/no outcome: logistic regression.'), P('Was heißt „fehlt“, wenn jemand ausscheidet?', 'What does "missing" mean when someone drops out?')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer', 'Case number') },
      { spalte: 'programm', bez: P('Programm', 'Program') },
      { spalte: 'alter', bez: P('Alter (Jahre)', 'Age (years)') },
      { spalte: 'zigaretten_pro_tag', bez: P('Zigaretten pro Tag vorher', 'Cigarettes per day before') },
      { spalte: 'wochen_beobachtet', bez: P('Wochen bis Rückfall oder Ende', 'Weeks until relapse or end') },
      { spalte: 'rueckfall', bez: P('Rückfall eingetreten', 'Relapse occurred') },
      { spalte: 'rueckfall_26_wochen', bez: P('Rückfall in den ersten 26 Wochen', 'Relapse within first 26 weeks') }
    ],
    werte: [
      { spalte: 'rueckfall', labels: [[0, P('Nein, zensiert', 'No, censored')], [1, P('Ja, Rückfall', 'Yes, relapse')]] },
      { spalte: 'rueckfall_26_wochen', labels: [[0, P('Nein', 'No')], [1, P('Ja', 'Yes')]] }
    ],
    nominal: ['programm', 'rueckfall', 'rueckfall_26_wochen'],
    zellen: { programm: { Beratung: P('Beratung', 'Counselling'), Nikotinersatz: P('Nikotinersatz', 'Nicotine replacement'), Gruppentraining: P('Gruppentraining', 'Group training') } },
    schritte: [
      { art: 'kaplanmeier', w: { l1: ['wochen_beobachtet'], l2: ['rueckfall'], l3: ['programm'] }, titel: P('Wer hält länger durch?', 'Who lasts longer?'), text: P('Die Kurven fallen mit jedem Rückfall. Kleine Striche auf der Kurve sind zensierte Personen. Der Log-Rank-Test sagt, ob die Kurven sich unterscheiden; die Mediane nennen die Wochen, nach denen die Hälfte rückfällig ist.', 'The curves drop with each relapse. Small ticks on the curve are censored people. The log-rank test says whether the curves differ; the medians give the weeks after which half have relapsed.') },
      { art: 'vorhersage', w: { l1: ['rueckfall_26_wochen'], l2: ['alter', 'zigaretten_pro_tag'] }, titel: P('Rückfall in 26 Wochen vorhersagen', 'Predicting relapse within 26 weeks'), text: P('Ja oder Nein als Ergebnis: logistische Regression. Das Odds Ratio gilt je Zigarette mehr bzw. je Lebensjahr mehr. Wie viele Personen gingen ein? Fünf, die vorher ausschieden, fehlen - mit Absicht.', 'Yes or no as the outcome: logistic regression. The odds ratio holds per additional cigarette or year of age. How many people were included? Five who dropped out earlier are missing - on purpose.') },
      { art: 'kreuz', w: { l1: ['rueckfall_26_wochen'], l2: ['programm'] }, titel: P('Dieselbe Frage als Tabelle', 'The same question as a table'), text: P('Rückfall nach 26 Wochen nach Programm als Kreuztabelle. Einfacher zu lesen, aber ohne die Zeit - die Kurven zeigen mehr.', 'Relapse at 26 weeks by program as a crosstab. Easier to read, but without the time - the curves show more.') }
    ]
  },
  {
    id: 'screening', fach: 'gesundheit', stufe: 3, datei: 'screening', fälle: 200, minuten: 20,
    titel: P('Kurztest zur Demenz-Früherkennung', 'Short test for early dementia detection'),
    kurz: P('Wie gut trennt ein Test Kranke von Gesunden - und wo liegt die beste Grenze?', 'How well does a test separate ill from healthy - and where is the best cut-off?'),
    geschichte: P('In einer Gedächtnisambulanz wird ein Kurztest (0 bis 30 Punkte) bei 200 Personen gemacht. Die Diagnose aus der ausführlichen Untersuchung gilt als Maßstab: 60 haben eine Demenz, 140 nicht. Wie gut trennt der Kurztest Kranke und Gesunde (ROC, AUC), und welche Grenze ist sinnvoll?', 'In a memory clinic a short test (0 to 30 points) is given to 200 people. The diagnosis from the full examination is the standard: 60 have dementia, 140 do not. How well does the short test discriminate, and which cut-off makes sense?'),
    lernen: [P('ROC-Kurve und AUC: wie gut trennt der Test insgesamt?', 'ROC curve and AUC: how well does the test separate overall?'), P('Sensitivität, Spezifität und Vorhersagewerte bei einer Grenze.', 'Sensitivity, specificity and predictive values at one cut-off.'), P('Eine Grenze wählen heißt: Fehler abwägen.', 'Choosing a cut-off means weighing errors.')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer', 'Case number') },
      { spalte: 'alter', bez: P('Alter (Jahre)', 'Age (years)') },
      { spalte: 'bildungsjahre', bez: P('Bildungsjahre', 'Years of education') },
      { spalte: 'kurztest', bez: P('Kurztest (0-30 Punkte)', 'Short test (0-30 points)') },
      { spalte: 'test_auffaellig', bez: P('Testergebnis (Grenze 23 Punkte)', 'Test result (cut-off 23 points)') },
      { spalte: 'diagnose', bez: P('Diagnose (Maßstab)', 'Diagnosis (standard)') }
    ],
    werte: [
      { spalte: 'diagnose', labels: [[0, P('Keine Demenz', 'No dementia')], [1, P('Demenz', 'Dementia')]] },
      { spalte: 'test_auffaellig', labels: [[0, P('Unauffällig (24 und mehr)', 'Normal (24 or more)')], [1, P('Auffällig (23 oder weniger)', 'Abnormal (23 or less)')]] }
    ],
    nominal: ['diagnose', 'test_auffaellig'],
    schritte: [
      { art: 'gruppen', w: { l1: ['kurztest'], l2: ['diagnose'] }, titel: P('Trennt der Test die Gruppen?', 'Does the test separate the groups?'), text: P('Erst der Mittelwertvergleich: Kranke haben im Mittel etwa 6 Punkte weniger. Dann unten „Trennt die Zahl die beiden Gruppen? (ROC)“ aufklappen (Pfeil links): Die AUC liegt bei etwa 0,94. Zieht man zufällig eine kranke und eine gesunde Person, hat die kranke in 94 von 100 Fällen den schlechteren Wert.', 'First the comparison of means: ill people score about 6 points lower on average. Then open "Does the number separate the two groups? (ROC)" below (arrow at left): the AUC is about 0.94. Draw one ill and one healthy person at random and the ill one has the worse score in 94 of 100 cases.') },
      { art: 'kreuz', w: { l1: ['test_auffaellig'], l2: ['diagnose'] }, titel: P('Mit Grenze 23: wer wird erkannt?', 'With cut-off 23: who is detected?'), text: P('Eine Grenze macht aus dem Test ein Ja oder Nein. Unten „Testgüte berechnen“ aufklappen und einschalten (Referenz: Diagnose, positiv: Demenz; Test positiv: auffällig). Die Tabelle oben zeigt dann Sensitivität (Kranke, die auffallen) und Spezifität (Gesunde, die unauffällig bleiben) samt Vorhersagewerten. Eine andere Grenze verschiebt beide: Wer mehr Kranke findet, alarmiert mehr Gesunde.', 'A cut-off turns the test into a yes or no. Open "Calculate test accuracy" below and switch it on (reference: diagnosis, positive: dementia; test positive: abnormal). The table above then shows sensitivity (ill people who are flagged) and specificity (healthy people who stay unflagged) with predictive values. Another cut-off shifts both: finding more ill people alarms more healthy ones.') },
      { art: 'vorhersage', w: { l1: ['diagnose'], l2: ['kurztest', 'alter', 'bildungsjahre'] }, titel: P('Mit Alter und Bildung', 'With age and education'), text: P('Verbessern Alter und Bildung die Vorhersage? Oder erklärt der Test fast alles allein?', 'Do age and education improve the prediction? Or does the test explain almost everything on its own?') }
    ]
  },
  {
    id: 'mediennutzung', fach: 'sozial', stufe: 1, datei: 'mediennutzung', fälle: 300, minuten: 15,
    titel: P('Medienwelt von Jugendlichen', 'Young people\'s media world'),
    kurz: P('Welche Plattformen nutzen 12- bis 17-Jährige? Eine Frage mit Mehrfachantworten und eine Verteilung mit langem Schwanz.', 'Which platforms do 12- to 17-year-olds use? A multiple-response question and a skewed distribution.'),
    geschichte: P('300 Jugendliche kreuzen an, welche von sechs Plattformen sie nutzen (mehrere möglich), und geben an, wie viele Stunden sie am Tag am Bildschirm sind. Statable fasst die sechs Ankreuzspalten bereits zu einer Frage „plattformen“ zusammen.', '300 young people tick which of six platforms they use (several allowed) and say how many hours a day they spend on screens. Statable has already combined the six tick columns into one question "plattformen".'),
    lernen: [P('Mehrfachantworten: Prozente von Fällen und von Antworten, Summe über 100 %.', 'Multiple responses: percent of cases and of responses, total above 100%.'), P('Schiefe Verteilung: Median statt Mittelwert.', 'Skewed distribution: median instead of mean.'), P('Rangtest, wenn die Verteilung schief ist.', 'Rank test when the distribution is skewed.'), P('Gruppen in Mehrfachantworten vergleichen.', 'Comparing groups within multiple responses.')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer', 'Case number') },
      { spalte: 'alter', bez: P('Alter (Jahre)', 'Age (years)') },
      { spalte: 'geschlecht', bez: P('Geschlecht', 'Gender') },
      { spalte: 'whatsapp', bez: P('WhatsApp', 'WhatsApp') },
      { spalte: 'instagram', bez: P('Instagram', 'Instagram') },
      { spalte: 'tiktok', bez: P('TikTok', 'TikTok') },
      { spalte: 'youtube', bez: P('YouTube', 'YouTube') },
      { spalte: 'snapchat', bez: P('Snapchat', 'Snapchat') },
      { spalte: 'discord', bez: P('Discord', 'Discord') },
      { spalte: 'bildschirmzeit_std', bez: P('Bildschirmzeit (Stunden pro Tag)', 'Screen time (hours per day)') }
    ],
    werte: [
      { spalte: 'whatsapp', labels: [[0, P('Nein', 'No')], [1, P('Ja', 'Yes')]] },
      { spalte: 'instagram', labels: [[0, P('Nein', 'No')], [1, P('Ja', 'Yes')]] },
      { spalte: 'tiktok', labels: [[0, P('Nein', 'No')], [1, P('Ja', 'Yes')]] },
      { spalte: 'youtube', labels: [[0, P('Nein', 'No')], [1, P('Ja', 'Yes')]] },
      { spalte: 'snapchat', labels: [[0, P('Nein', 'No')], [1, P('Ja', 'Yes')]] },
      { spalte: 'discord', labels: [[0, P('Nein', 'No')], [1, P('Ja', 'Yes')]] }
    ],
    nominal: ['geschlecht', 'whatsapp', 'instagram', 'tiktok', 'youtube', 'snapchat', 'discord'],
    zellen: { geschlecht: { weiblich: P('weiblich', 'female'), 'männlich': P('männlich', 'male'), divers: P('divers', 'diverse') } },
    sets: [{ name: 'plattformen', label: 'Genutzte Plattformen', spalten: ['whatsapp', 'instagram', 'tiktok', 'youtube', 'snapchat', 'discord'], zaehlwert: 1 }],
    schritte: [
      { art: 'verteilung', w: { l1: ['$plattformen'] }, titel: P('Welche Plattformen?', 'Which platforms?'), text: P('Die Prozente ergeben mehr als 100 %, weil jede Person mehrere nennen darf. Wichtig ist die Basis: Prozent der Personen oder der Antworten.', 'The percentages add up to more than 100% because each person may name several. The base matters: percent of people or of responses.') },
      { art: 'kreuz', w: { l1: ['$plattformen'], l2: ['geschlecht'] }, titel: P('Plattformen nach Geschlecht', 'Platforms by gender'), text: P('Wer nutzt was? Zum Beispiel Discord bei Burschen häufiger. Spaltenprozente lesen: Anteil in der jeweiligen Gruppe.', 'Who uses what? For example Discord is more common among boys. Read column percentages: share within each group.') },
      { art: 'verteilung', w: { l1: ['bildschirmzeit_std'] }, titel: P('Bildschirmzeit: schief', 'Screen time: skewed'), text: P('Die meisten sind bei 2 bis 5 Stunden, wenige weit darüber. Der Mittelwert wird nach oben gezogen; der Median ist die ehrlichere Mitte. Statable zeigt beide.', 'Most are at 2 to 5 hours, a few far above. The mean is pulled up; the median is the more honest center. Statable shows both.') },
      { art: 'gruppen', w: { l1: ['bildschirmzeit_std'], l2: ['geschlecht'] }, titel: P('Unterschied mit Rangtest', 'Difference with a rank test'), text: P('Die Verteilung ist schief, die Gruppen sind aber groß: Der t-Test (Welch) vergleicht die Mittelwerte, der Rangtest prüft, ob die Werte der einen Gruppe häufiger höher liegen. Beide Wege rechnen und vergleichen.', 'The distribution is skewed, but the groups are large: the t test (Welch) compares the means, the rank test checks whether values of one group tend to be higher. Run both and compare.') },
      { art: 'zusammenhang', w: { l1: ['alter'], l2: ['bildschirmzeit_std'] }, titel: P('Alter und Bildschirmzeit', 'Age and screen time'), text: P('Steigt die Zeit mit dem Alter? Ein schwacher Zusammenhang ist trotzdem ein Zusammenhang - Größe beachten.', 'Does the time rise with age? A weak relationship is still a relationship - look at its size.') }
    ]
  },
  {
    id: 'pulsuhr', fach: 'gesundheit', stufe: 2, datei: 'pulsuhr', fälle: 60, minuten: 15,
    titel: P('Pulsuhr gegen EKG', 'Heart rate watch versus ECG'),
    kurz: P('Zwei Pulsuhren, beide korrelieren fast perfekt mit dem EKG. Messen sie deshalb gleich gut?', 'Two heart rate watches, both correlate almost perfectly with the ECG. Do they therefore measure equally well?'),
    geschichte: P('60 Personen werden in Ruhe, bei leichter und bei starker Belastung gemessen: mit dem EKG (Maßstab) und mit zwei Pulsuhren. Uhr A liegt knapp daneben, aber überall ähnlich. Uhr B misst bei hohem Puls deutlich zu niedrig.', '60 people are measured at rest, under light and under heavy exertion: with the ECG (standard) and two heart rate watches. Watch A is slightly off, but similarly everywhere. Watch B reads clearly too low at high heart rates.'),
    lernen: [P('Korrelation ist keine Übereinstimmung.', 'Correlation is not agreement.'), P('ICC: Übereinstimmung von Messgeräten.', 'ICC: agreement of measuring devices.'), P('Bland-Altman-Diagramm: Abweichung und Grenzen der Übereinstimmung.', 'Bland-Altman plot: bias and limits of agreement.')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer', 'Case number') },
      { spalte: 'belastung', bez: P('Belastung', 'Exertion') },
      { spalte: 'puls_ekg', bez: P('Puls EKG (Schläge pro Minute)', 'Heart rate ECG (beats per minute)') },
      { spalte: 'puls_uhr_a', bez: P('Puls Uhr A', 'Heart rate watch A') },
      { spalte: 'puls_uhr_b', bez: P('Puls Uhr B', 'Heart rate watch B') }
    ],
    nominal: ['belastung'], zellen: { belastung: { Ruhe: P('Ruhe', 'Rest'), 'leichte Belastung': P('leichte Belastung', 'Light exertion'), 'starke Belastung': P('starke Belastung', 'Heavy exertion') } },
    schritte: [
      { art: 'zusammenhang', w: { l1: ['puls_ekg'], l2: ['puls_uhr_b'] }, titel: P('Die Korrelation täuscht', 'The correlation deceives'), text: P('r ist bei beiden Uhren sehr hoch (über 0,97). Das heißt nur: Wenn der eine Wert steigt, steigt der andere. Ob sie dieselbe Zahl zeigen, sagt r nicht.', 'r is very high for both watches (above 0.97). That only means: when one value rises, so does the other. It does not say whether they show the same number.') },
      { art: 'uebereinstimmung', w: { l1: ['puls_ekg', 'puls_uhr_a'] }, titel: P('Uhr A gegen EKG', 'Watch A versus ECG'), text: P('ICC und Bland-Altman: Die Uhr liegt im Schnitt etwa 1,5 Schläge zu hoch, die Grenzen sind eng und gleichmäßig. Brauchbar.', 'ICC and Bland-Altman: on average the watch is about 1.5 beats too high, the limits are narrow and even. Usable.') },
      { art: 'uebereinstimmung', w: { l1: ['puls_ekg', 'puls_uhr_b'] }, titel: P('Uhr B gegen EKG', 'Watch B versus ECG'), text: P('Die Punkte im Bland-Altman-Diagramm fächern sich auf: Je höher der Puls, desto größer die Abweichung nach unten. Das ist ein Fehler, der vom Wert abhängt - der ICC allein verrät es nicht.', 'The points in the Bland-Altman plot fan out: the higher the heart rate, the larger the deviation downwards. An error that depends on the value - the ICC alone does not reveal it.') }
    ]
  },
  {
    id: 'beobachtung', fach: 'bildung', stufe: 1, datei: 'beobachtung', fälle: 90, minuten: 10,
    titel: P('Unterrichtsbeobachtung zu zweit', 'Classroom observation by two raters'),
    kurz: P('Zwei Beobachterinnen kodieren dieselben 90 Minuten Unterricht. Wie sehr stimmen sie überein?', 'Two observers code the same 90 minutes of teaching. How well do they agree?'),
    geschichte: P('In einer Studie zur Unterrichtsqualität beobachten zwei geschulte Personen denselben Unterricht in 90 Intervallen. Sie kodieren, was die Klasse gerade tut (Zuhören, Einzelarbeit, Gruppenarbeit, Abgelenkt) und bewerten die Qualität von 1 (niedrig) bis 4 (hoch). Wie verlässlich ist das Kodieren?', 'In a study on teaching quality two trained people observe the same lessons in 90 intervals. They code what the class is doing (listening, individual work, group work, distracted) and rate quality from 1 (low) to 4 (high). How reliable is the coding?'),
    lernen: [P('Prozent Übereinstimmung ist zu optimistisch: Zufall abziehen (Cohens Kappa).', 'Percent agreement is too optimistic: subtract chance (Cohen\'s kappa).'), P('Wo liegen die Meinungsverschiedenheiten? Die Kreuztabelle der Urteile.', 'Where are the disagreements? The crosstab of the ratings.'), P('Geordnete Urteile: gewichtetes Kappa.', 'Ordered ratings: weighted kappa.')],
    bez: [
      { spalte: 'intervall', bez: P('Intervall', 'Interval') },
      { spalte: 'aktivitaet_a', bez: P('Aktivität laut Beobachterin A', 'Activity according to observer A') },
      { spalte: 'aktivitaet_b', bez: P('Aktivität laut Beobachterin B', 'Activity according to observer B') },
      { spalte: 'qualitaet_a', bez: P('Qualität laut A (1-4)', 'Quality according to A (1-4)') },
      { spalte: 'qualitaet_b', bez: P('Qualität laut B (1-4)', 'Quality according to B (1-4)') }
    ],
    nominal: ['aktivitaet_a', 'aktivitaet_b'], ordinal: ['qualitaet_a', 'qualitaet_b'],
    zellen: { aktivitaet_a: { 'Zuhören': P('Zuhören', 'Listening'), Einzelarbeit: P('Einzelarbeit', 'Individual work'), Gruppenarbeit: P('Gruppenarbeit', 'Group work'), Abgelenkt: P('Abgelenkt', 'Distracted') }, aktivitaet_b: { 'Zuhören': P('Zuhören', 'Listening'), Einzelarbeit: P('Einzelarbeit', 'Individual work'), Gruppenarbeit: P('Gruppenarbeit', 'Group work'), Abgelenkt: P('Abgelenkt', 'Distracted') } },
    schritte: [
      { art: 'uebereinstimmung', w: { l1: ['aktivitaet_a', 'aktivitaet_b'] }, titel: P('Kategorien: Cohens Kappa', 'Categories: Cohen\'s kappa'), text: P('Etwa drei Viertel gleiche Urteile, aber Kappa liegt bei etwa 0,64 (gut, nicht hervorragend). Die Tabelle zeigt, wo sie sich uneinig sind: meist „Zuhören“ gegen „Abgelenkt“ - die Kodieranleitung schärfen.', 'About three quarters identical ratings, but kappa is about 0.64 (good, not excellent). The table shows where they disagree: mostly "listening" versus "distracted" - sharpen the coding manual.') },
      { art: 'uebereinstimmung', w: { l1: ['qualitaet_a', 'qualitaet_b'] }, titel: P('Geordnete Urteile', 'Ordered ratings'), text: P('Qualität 1 bis 4 ist geordnet: Ein Unterschied von einer Stufe ist weniger schlimm als drei. Gewichtetes Kappa berücksichtigt das.', 'Quality 1 to 4 is ordered: a difference of one level is less serious than three. Weighted kappa accounts for this.') },
      { art: 'kreuz', w: { l1: ['aktivitaet_b'], l2: ['aktivitaet_a'] }, titel: P('Die Kreuztabelle der Urteile', 'The crosstab of the ratings'), text: P('Zeilen: Beobachterin B, Spalten: Beobachterin A. Die Diagonale ist die Übereinstimmung, alles daneben die Fälle zum Besprechen.', 'Rows: observer B, columns: observer A. The diagonal is agreement, everything off it is cases to discuss.') }
    ]
  },
  {
    id: 'offene-antworten', fach: 'methodik', stufe: 2, datei: 'offene-antworten', fälle: 20, minuten: 10,
    titel: P('Offene Antworten kodieren (drei Kodierende)', 'Coding open answers (three coders)'),
    kurz: P('Drei Personen ordnen 20 offene Antworten vier Kategorien zu. Wie verlässlich ist die Kodierung?', 'Three people assign 20 open answers to four categories. How reliable is the coding?'),
    geschichte: P('In einer Lehrveranstaltungsevaluation haben Studierende offene Antworten gegeben. Drei Personen ordnen dieselben 20 Antworten unabhängig voneinander einer von vier Kategorien zu: Inhalt, Organisation, Betreuung oder Sonstiges. Kodierende C hat zwei Antworten ausgelassen. Reicht die Übereinstimmung, um mit den Kodierungen weiterzuarbeiten?', 'In a course evaluation, students gave open answers. Three people independently assign the same 20 answers to one of four categories: content, organisation, supervision or other. Coder C left out two answers. Is the agreement good enough to continue working with the codings?'),
    lernen: [P('Fleiss\' Kappa und Krippendorffs Alpha bei drei Kodierenden.', 'Fleiss\' kappa and Krippendorff\'s alpha with three coders.'), P('Lücken in den Kodierungen: Alpha verträgt sie.', 'Gaps in the codings: alpha copes with them.'), P('Zwei Kodierende: Cohens Kappa bleibt der Hauptwert, Alpha kommt dazu.', 'Two coders: Cohen\'s kappa stays the main value, alpha is added.')],
    bez: [
      { spalte: 'antwort', bez: P('Antwort (Nummer)', 'Answer (number)') },
      { spalte: 'kodierer_a', bez: P('Kategorie laut Kodierender A', 'Category according to coder A') },
      { spalte: 'kodierer_b', bez: P('Kategorie laut Kodierender B', 'Category according to coder B') },
      { spalte: 'kodierer_c', bez: P('Kategorie laut Kodierender C', 'Category according to coder C') }
    ],
    nominal: ['kodierer_a', 'kodierer_b', 'kodierer_c'],
    zellen: Object.fromEntries(['kodierer_a', 'kodierer_b', 'kodierer_c'].map(sp => [sp, { Inhalt: P('Inhalt', 'Content'), Organisation: P('Organisation', 'Organisation'), Betreuung: P('Betreuung', 'Supervision'), Sonstiges: P('Sonstiges', 'Other') }])),
    schritte: [
      { art: 'uebereinstimmung', w: { l1: ['kodierer_a', 'kodierer_b', 'kodierer_c'] }, titel: P('Drei Kodierende: Fleiss\' Kappa und Alpha', 'Three coders: Fleiss\' kappa and alpha'), text: P('Fleiss\' κ liegt bei etwa ,62 („beachtlich“ nach Landis und Koch, eine Konvention). Krippendorffs α liegt mit etwa ,61 unter ,667 und reicht damit nicht für verlässliche Schlüsse. Die zwei ausgelassenen Antworten sind kein Problem: Alpha verträgt Lücken.', 'Fleiss\' κ is about .62 ("substantial" after Landis and Koch, a convention). Krippendorff\'s α is about .61, below .667, and so not enough for reliable conclusions. The two omitted answers are no problem: alpha copes with gaps.') },
      { art: 'uebereinstimmung', w: { l1: ['kodierer_a', 'kodierer_b'] }, titel: P('Zwei Kodierende: Cohens Kappa bleibt', 'Two coders: Cohen\'s kappa stays'), text: P('Bei zwei Kodierenden bleibt Cohens κ (etwa ,67) der Hauptwert; Krippendorffs α steht darunter und liegt mit etwa ,67 knapp über ,667: nur vorläufige Schlüsse. Prozentuale Übereinstimmung und Brennan-Prediger stehen in „Weitere Kennwerte“.', 'With two coders Cohen\'s κ (about .67) stays the main value; Krippendorff\'s α appears below it and, at about .67, is just above .667: only tentative conclusions. Percent agreement and Brennan-Prediger are in "Further coefficients".') },
      { art: 'kreuz', w: { l1: ['kodierer_b'], l2: ['kodierer_a'] }, titel: P('Wo liegen die Meinungsverschiedenheiten?', 'Where are the disagreements?'), text: P('Zeilen: Kodierende B, Spalten: Kodierende A. Die Diagonale ist die Übereinstimmung; was daneben liegt, gehört in die Besprechung der Kodieranleitung.', 'Rows: coder B, columns: coder A. The diagonal is agreement; whatever lies off it belongs in the discussion of the coding manual.') }
    ]
  },
  {
    id: 'seminar-gefehlt', fach: 'bildung', stufe: 1, datei: 'seminar-gefehlt', fälle: 40, minuten: 15,
    titel: P('Was hat im Seminar gefehlt? (offene Antworten ordnen)', 'What was missing in the seminar? (ordering open answers)'),
    kurz: P('40 kurze Antworten aus einer Seminarevaluation in Kategorien ordnen, zählen und in die Daten übernehmen.', '40 short answers from a seminar evaluation: sort them into categories, count them and write them to the data.'),
    geschichte: P('Am Ende eines Seminars für Lehramtsstudierende wurde offen gefragt: „Was hat im Seminar gefehlt?“ Alle 40 Antworten sind kurz, fünf Personen haben nichts geschrieben. Manche Antworten nennen mehr als eine Sache. Die Antworten werden in Kategorien wie Praxisbezug, Rückmeldung, Zeit oder Technik geordnet, gezählt und danach mit dem Studiengang verglichen.', 'At the end of a seminar for student teachers an open question was asked: "What was missing in the seminar?" All 40 answers are short, five people wrote nothing. Some answers mention more than one thing. The answers are sorted into categories such as practice, feedback, time or technology, counted and then compared with the degree program.'),
    lernen: [P('Kategorien anlegen, mit Kurzbeschreibung und Ankerbeispiel (Kodierleitfaden).', 'Create categories with a short description and an anchor example (coding guide).'), P('Leer, offen, zugeordnet: Was nicht beantwortet oder noch nicht zugeordnet ist, fehlt und wird gezählt.', 'Empty, open, assigned: what is unanswered or not yet assigned is missing and is counted.'), P('Mehrere Kategorien je Antwort: Welche Prozentbasis gilt?', 'Several categories per answer: which percentage base applies?'), P('Eine zweite Person kodiert; die Übereinstimmung gibt an, wie stark die beiden Kodierungen übereinstimmen.', 'A second person codes; agreement states how closely the two codings agree.')],
    bez: [
      { spalte: 'nr', bez: P('Nummer', 'Number') },
      { spalte: 'studiengang', bez: P('Studiengang', 'Degree program') },
      { spalte: 'gefehlt', bez: P('Was hat im Seminar gefehlt?', 'What was missing in the seminar?') }
    ],
    nominal: ['studiengang'],
    zellen: { studiengang: { Primarstufe: P('Primarstufe', 'Primary level'), Sekundarstufe: P('Sekundarstufe', 'Secondary level'), Bildungswissenschaft: P('Bildungswissenschaft', 'Educational science') } },
    schritte: [
      { art: 'kategorien', w: { l1: ['gefehlt'] }, titel: P('Antworten ordnen', 'Order the answers'), text: P('Zuerst einige Antworten lesen, dann Kategorien anlegen (zum Beispiel Praxisbezug, Rückmeldung, Zeit, Technik, Sonstiges) und die Antworten zuordnen. Fünf Zeilen sind leer, sie zählen als fehlend. Wer „Mehrere Kategorien je Antwort“ wählt, sieht, warum die Prozente der Personen mehr als 100 % ergeben. Am Ende „In die Daten übernehmen“ und die Kategorie nach Studiengang auswerten.', 'First read some answers, then create categories (for example practice, feedback, time, technology, other) and assign the answers. Five rows are empty and count as missing. Choosing "Several categories per answer" shows why the percentages of people add up to more than 100%. At the end choose "Write to the data" and evaluate the category by degree program.') },
      { art: 'verteilung', w: { l1: ['studiengang'] }, titel: P('Wer hat geantwortet?', 'Who answered?'), text: P('Die Verteilung der Studiengänge zeigt, wie viele Personen aus welchem Studiengang kommen. Sie ist die Basis, um später die Kategorien nach Studiengang zu lesen.', 'The distribution of degree programs shows how many people come from which program. It is the basis for reading the categories by degree program later.') }
    ]
  },
  {
    id: 'leseforderung', fach: 'bildung', stufe: 2, datei: 'leseforderung', fälle: 48, minuten: 15,
    titel: P('Leseförderung bei drei Kindern', 'Reading intervention with three children'),
    kurz: P('Ein Förderprogramm bei drei Kindern mit Förderbedarf, jede Woche gemessen. Wirkt es - bei jedem?', 'An intervention for three children with special needs, measured every week. Does it work - for each?'),
    geschichte: P('Anna, Ben und Selin (Namen geändert) lesen jede Woche einen Text laut vor; gezählt werden die richtig gelesenen Wörter pro Minute. Die Förderung beginnt für jedes Kind zu einem anderen Zeitpunkt (nach 4, 6 und 8 Wochen). Bei Ben steigen die Werte schon vor der Förderung leicht an.', 'Anna, Ben and Selin (names changed) read a text aloud every week; words read correctly per minute are counted. The intervention starts at a different time for each child (after 4, 6 and 8 weeks). Ben\'s scores already rise slightly before the intervention.'),
    lernen: [P('Einzelfalldesign: A-B, gestaffelter Beginn.', 'Single-case design: A-B, staggered start.'), P('NAP, Tau-U und was „Überlappung“ heißt.', 'NAP, Tau-U and what "overlap" means.'), P('Ein Trend in der Ausgangslage verändert die Deutung.', 'A trend at baseline changes the interpretation.')],
    bez: [
      { spalte: 'kind', bez: P('Kind (Name geändert)', 'Child (name changed)') },
      { spalte: 'woche', bez: P('Woche', 'Week') },
      { spalte: 'phase', bez: P('Phase', 'Phase') },
      { spalte: 'woerter_pro_minute', bez: P('Richtig gelesene Wörter pro Minute', 'Words read correctly per minute') }
    ],
    nominal: ['kind', 'phase'], zellen: { phase: { Ausgangslage: P('Ausgangslage', 'Baseline'), 'Förderung': P('Förderung', 'Intervention') } },
    schritte: [
      { art: 'einzelfall', w: { l1: ['woerter_pro_minute'], l2: ['phase'], l3: ['woche'], l4: ['kind'] }, titel: P('Drei Kinder, drei Bilder', 'Three children, three pictures'), text: P('Das Diagramm zeigt jedes Kind getrennt. Anna: klarer Sprung. Selin: kleiner Sprung. Ben: Die Werte liegen in B höher, aber sie stiegen auch schon in A. NAP allein wäre zu optimistisch; Tau-U mit Trendkorrektur ist vorsichtiger.', 'The chart shows each child separately. Anna: clear jump. Selin: small jump. Ben: values are higher in B, but they were already rising in A. NAP alone would be too optimistic; Tau-U with trend correction is more cautious.') }
    ]
  },
  {
    id: 'arbeitsklima', fach: 'sozial', stufe: 3, datei: 'arbeitsklima', fälle: 240, minuten: 20,
    titel: P('Führung und Kündigungsabsicht', 'Leadership and intention to quit'),
    kurz: P('Wer die Führung besser bewertet, will seltener kündigen - warum? Über das Vertrauen im Team? Und gilt das überall?', 'Those who rate leadership higher intend to quit less often - why? Through trust in the team? And does it hold everywhere?'),
    geschichte: P('240 Beschäftigte einer Firma bewerten auf Skalen von 1 bis 7 die Führung ihrer Vorgesetzten, das Vertrauen im Team und ihre Kündigungsabsicht. Dazu: Jahre im Betrieb und Bürotage pro Woche (0 bis 5, sonst Homeoffice).', '240 employees of a company rate on scales from 1 to 7 their managers\' leadership, trust in the team and their intention to quit. Also: years with the company and office days per week (0 to 5, otherwise home office).'),
    lernen: [P('Mediation: Weg über einen Zwischenschritt (indirekter Effekt, Bootstrap).', 'Mediation: a path through an intermediate step (indirect effect, bootstrap).'), P('Moderation: Wirkung hängt von etwas Drittem ab.', 'Moderation: the effect depends on something third.'), P('Querschnittsdaten zeigen Zusammenhänge, keine Ursachen.', 'Cross-sectional data show relationships, not causes.')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer', 'Case number') },
      { spalte: 'jahre_im_betrieb', bez: P('Jahre im Betrieb', 'Years with the company') },
      { spalte: 'buero_tage', bez: P('Bürotage pro Woche', 'Office days per week') },
      { spalte: 'fuehrung', bez: P('Führungsqualität (1-7)', 'Leadership quality (1-7)') },
      { spalte: 'vertrauen', bez: P('Vertrauen im Team (1-7)', 'Trust in the team (1-7)') },
      { spalte: 'kuendigungsabsicht', bez: P('Kündigungsabsicht (1-7)', 'Intention to quit (1-7)') }
    ],
    schritte: [
      { art: 'zusammenhang', w: { l1: ['fuehrung'], l2: ['kuendigungsabsicht'] }, titel: P('Der einfache Zusammenhang', 'The simple relationship'), text: P('Bessere Führung, geringere Kündigungsabsicht: ein negativer Zusammenhang. Aber warum?', 'Better leadership, lower intention to quit: a negative relationship. But why?') },
      { art: 'mediation', w: { l1: ['fuehrung'], l2: ['kuendigungsabsicht'], l3: ['vertrauen'] }, titel: P('Über das Vertrauen?', 'Through trust?'), text: P('Angenommenes Modell: Führung → Vertrauen → Kündigungsabsicht. Der indirekte Effekt (a × b) ist negativ, sein Konfidenzintervall (Bootstrap) enthält nicht null: Ein großer Teil des Zusammenhangs läuft statistisch über das Vertrauen; der direkte Weg bleibt klein. Ob die Führung das Vertrauen verursacht, kann eine einmalige Befragung nicht zeigen.', 'Assumed model: leadership → trust → intention to quit. The indirect effect (a × b) is negative, its confidence interval (bootstrap) does not contain zero: a large part of the relationship runs statistically through trust; the direct path stays small. Whether leadership causes trust cannot be shown by a single survey.') },
      { art: 'moderation', w: { l1: ['fuehrung'], l2: ['vertrauen'], l3: ['buero_tage'] }, titel: P('Hängt es von den Bürotagen ab?', 'Does it depend on office days?'), text: P('Moderation: Der Zusammenhang von Führung und Vertrauen ist stärker, wenn Menschen öfter im Büro sind. Die Steigungen bei wenig, mittel und vielen Bürotagen zeigen, wie.', 'Moderation: the relation between leadership and trust is stronger when people are in the office more often. The slopes at few, medium and many office days show how.') }
    ]
  },
  {
    id: 'klassen-mathematik', fach: 'bildung', stufe: 3, datei: 'klassen-mathematik', fälle: 302, minuten: 20,
    titel: P('Mathematik in 20 Klassen', 'Maths in 20 classes'),
    kurz: P('Schülerinnen und Schüler einer Klasse sind einander ähnlich. Was macht das mit der Statistik?', 'Students in a class resemble each other. What does that do to statistics?'),
    geschichte: P('302 Jugendliche in 20 Klassen schreiben einen Mathematiktest (Mittelwert etwa 500 Punkte). Bekannt sind Geschlecht, ein Sozialindex und - auf Klassenebene - die von den Schülerinnen und Schülern bewertete Unterrichtsqualität (1 bis 5).', '302 students in 20 classes take a maths test (mean about 500 points). Known are gender, a social index and - at class level - the teaching quality as rated by students (1 to 5).'),
    lernen: [P('Verschachtelte Daten: Personen in Klassen.', 'Nested data: people in classes.'), P('ICC: wie viel liegt an der Klasse?', 'ICC: how much is due to the class?'), P('Einflüsse auf Schüler- und Klassenebene zugleich.', 'Influences at student and class level at the same time.')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer', 'Case number') },
      { spalte: 'klasse', bez: P('Klasse', 'Class') },
      { spalte: 'geschlecht', bez: P('Geschlecht', 'Gender') },
      { spalte: 'sozialindex', bez: P('Sozialindex (10-90)', 'Social index (10-90)') },
      { spalte: 'unterrichtsqualitaet', bez: P('Unterrichtsqualität der Klasse (1-5)', 'Teaching quality of the class (1-5)') },
      { spalte: 'mathematik', bez: P('Mathematiktest (Punkte)', 'Maths test (points)') }
    ],
    nominal: ['klasse', 'geschlecht'], zellen: { geschlecht: { weiblich: P('weiblich', 'female'), 'männlich': P('männlich', 'male') } },
    schritte: [
      { art: 'gruppen', w: { l1: ['mathematik'], l2: ['geschlecht'] }, titel: P('Der gewöhnliche Weg', 'The usual way'), text: P('Statable bemerkt die Spalte „klasse“ und weist darauf hin, dass die Personen nicht unabhängig sind. Der gewöhnliche Test unterschätzt dann die Unsicherheit.', 'Statable notices the column "class" and points out that the people are not independent. The usual test then underestimates the uncertainty.') },
      { art: 'mehrebenen', w: { l1: ['mathematik'], l2: ['klasse'], l3: ['sozialindex', 'unterrichtsqualitaet'] }, titel: P('Das Mehrebenenmodell', 'The multilevel model'), text: P('ICC: Etwa ein Sechstel der Unterschiede liegt zwischen den Klassen. Der Sozialindex wirkt auf Schülerebene, die Unterrichtsqualität auf Klassenebene. (Braucht einmalig R im Browser.)', 'ICC: about one sixth of the differences lie between classes. The social index acts at student level, teaching quality at class level. (Needs R in the browser once.)') }
    ]
  },
  {
    id: 'studienstart', fach: 'bildung', stufe: 3, datei: 'studienstart', fälle: 240, minuten: 25,
    titel: P('Studienstart: Zufriedenheit, Verkehrsmittel, Fehltage', 'Start of studies: satisfaction, transport, days absent'),
    kurz: P('Drei Ergebnisse, die keine gewöhnlichen Zahlen sind: Stufen, Kategorien und Zählungen. Welche Regression passt zu welchem?', 'Three outcomes that are not ordinary numbers: levels, categories and counts. Which regression fits which?'),
    geschichte: P('240 Studierende im ersten Semester, erfunden. Sie geben ihre Zufriedenheit mit dem Studienstart an (1 = sehr unzufrieden bis 5 = sehr zufrieden), nennen ihr Hauptverkehrsmittel (Bus, Rad, Zug) und zählen ihre Fehltage seit Semesterbeginn. Dazu kommen Alter, Lernzeit pro Woche, die Gruppe (Präsenz oder Online) und die Zahl der Wochen, die seit Semesterbeginn vergangen sind (nicht alle haben gleich lang gezählt). Zufriedenheit hat geordnete Stufen mit ungleichen Abständen, das Verkehrsmittel hat keine Ordnung, und Fehltage sind eine Zählung mit vielen Nullen.', '240 first-semester students, invented. They state their satisfaction with the start of their studies (1 = very dissatisfied to 5 = very satisfied), name their main means of transport (bus, bike, train) and count their days absent since the start of the semester. In addition there are age, study time per week, the group (on campus or online) and the number of weeks since the start of the semester (not everyone has counted for the same length of time). Satisfaction has ordered levels with unequal distances, the means of transport has no order, and days absent are a count with many zeros.'),
    lernen: [P('Geordnete Stufen vorhersagen: ordinale Regression und der Brant-Test.', 'Predicting ordered levels: ordinal regression and the Brant test.'), P('Kategorien ohne Ordnung vorhersagen: multinomiale Regression mit Vergleichskategorie.', 'Predicting categories without an order: multinomial regression with a reference category.'), P('Zählungen vorhersagen: Poisson oder negativ-binomial, Überdispersion und Beobachtungszeit.', 'Predicting counts: Poisson or negative binomial, overdispersion and observation time.')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer', 'Case number') },
      { spalte: 'alter', bez: P('Alter (Jahre)', 'Age (years)') },
      { spalte: 'gruppe', bez: P('Gruppe', 'Group') },
      { spalte: 'lernzeit', bez: P('Lernzeit pro Woche (Stunden)', 'Study time per week (hours)') },
      { spalte: 'zufriedenheit', bez: P('Zufriedenheit mit dem Studienstart', 'Satisfaction with the start of studies') },
      { spalte: 'verkehrsmittel', bez: P('Hauptverkehrsmittel', 'Main means of transport') },
      { spalte: 'wochen', bez: P('Wochen seit Semesterbeginn', 'Weeks since the start of the semester') },
      { spalte: 'fehltage', bez: P('Fehltage seit Semesterbeginn', 'Days absent since the start of the semester') }
    ],
    werte: [
      { spalte: 'zufriedenheit', labels: [[1, P('sehr unzufrieden', 'very dissatisfied')], [2, P('unzufrieden', 'dissatisfied')], [3, P('teils teils', 'neutral')], [4, P('zufrieden', 'satisfied')], [5, P('sehr zufrieden', 'very satisfied')]] }
    ],
    nominal: ['gruppe', 'verkehrsmittel'], ordinal: ['zufriedenheit'],
    zellen: { gruppe: { Präsenz: P('Präsenz', 'On campus'), Online: P('Online', 'Online') }, verkehrsmittel: { Bus: P('Bus', 'Bus'), Rad: P('Rad', 'Bike'), Zug: P('Zug', 'Train') } },
    schritte: [
      { art: 'vorhersage', w: { l1: ['zufriedenheit'], l2: ['lernzeit', 'alter', 'gruppe'] }, titel: P('Zufriedenheit vorhersagen (Stufen)', 'Predicting satisfaction (levels)'), text: P('Die Zufriedenheit ist ordinal: In der Prüfliste schlägt Statable die ordinale Regression vor. Mit „Ordinal rechnen“ wird sie gerechnet. Das Odds Ratio gilt für höhere statt gleiche oder niedrigere Stufen; der Brant-Test prüft, ob das an allen Trennstellen gleich ist.', 'Satisfaction is ordinal: in the checklist Statable suggests ordinal regression. "Calculate ordinal" runs it. The odds ratio holds for higher rather than equal or lower levels; the Brant test checks whether that is the same at all cut points.') },
      { art: 'vorhersage', w: { l1: ['verkehrsmittel'], l2: ['alter', 'gruppe'] }, titel: P('Verkehrsmittel vorhersagen (Kategorien)', 'Predicting means of transport (categories)'), text: P('Drei Kategorien ohne Ordnung: Statable rechnet eine multinomiale Regression. Die Vergleichskategorie (hier Bus) lässt sich unter „Weitere Wege“ ändern - die Odds Ratio ändern sich dann, die Anpassung nicht.', 'Three categories without an order: Statable calculates a multinomial regression. The reference category (here bus) can be changed under "More options" - the odds ratios then change, the fit does not.') },
      { art: 'vorhersage', w: { l1: ['fehltage'], l2: ['lernzeit', 'gruppe'] }, titel: P('Fehltage vorhersagen (Zählung)', 'Predicting days absent (count)'), text: P('Viele Nullen, rechtsschief: Statable schlägt eine Zähldaten-Regression vor. Poisson oder negativ-binomial wählt es nach der Überdispersion; unter „Weitere Wege“ lässt sich „Wochen seit Semesterbeginn“ als Beobachtungszeit wählen. Dann rechnet Statable Raten je Woche.', 'Many zeros, right-skewed: Statable suggests a count regression. It chooses Poisson or negative binomial by the overdispersion; under "More options" "Weeks since the start of the semester" can be chosen as the observation time. Statable then calculates rates per week.') }
    ]
  },
  {
    id: 'nitrat', fach: 'natur', stufe: 1, datei: 'nitrat', fälle: 75, minuten: 10,
    titel: P('Nitrat im Wasser', 'Nitrate in water'),
    kurz: P('Drei Gebiete mit unterschiedlicher Landnutzung. Die Streuung ist nicht gleich - das ändert die Wahl des Tests.', 'Three areas with different land use. The spread is not equal - this changes the choice of test.'),
    geschichte: P('Je 25 Wasserproben aus drei Gebieten werden auf Nitrat untersucht (mg pro Liter): Wald und Wiese, gemischte Nutzung, intensive Landwirtschaft. Je intensiver die Nutzung, desto höher und unruhiger sind die Werte.', '25 water samples each from three areas are tested for nitrate (mg per liter): forest and meadow, mixed use, intensive farming. The more intensive the use, the higher and more variable the values.'),
    lernen: [P('Varianzanalyse mit mehr als zwei Gruppen.', 'Analysis of variance with more than two groups.'), P('Ungleiche Streuung: Welch-Varianzanalyse und Games-Howell, ohne Vortest.', 'Unequal spread: Welch analysis of variance and Games-Howell, without a pre-test.'), P('Rangtest (Kruskal-Wallis) mit Dunn-Paarvergleichen.', 'Rank test (Kruskal-Wallis) with Dunn pairwise comparisons.')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer', 'Case number') },
      { spalte: 'gebiet', bez: P('Gebiet', 'Area') },
      { spalte: 'nitrat_mg_l', bez: P('Nitrat (mg pro Liter)', 'Nitrate (mg per liter)') }
    ],
    nominal: ['gebiet'], zellen: { gebiet: { 'Wald und Wiese': P('Wald und Wiese', 'Forest and meadow'), 'Gemischte Nutzung': P('Gemischte Nutzung', 'Mixed use'), 'Intensive Landwirtschaft': P('Intensive Landwirtschaft', 'Intensive farming') } },
    schritte: [
      { art: 'verteilung', w: { l1: ['nitrat_mg_l'] }, titel: P('Erst die Verteilung', 'The distribution first'), text: P('Alle 75 Proben zusammen: Die Verteilung hat einen langen Schwanz nach rechts.', 'All 75 samples together: the distribution has a long tail to the right.') },
      { art: 'gruppen', w: { l1: ['nitrat_mg_l'], l2: ['gebiet'] }, titel: P('Drei Gebiete vergleichen', 'Comparing three areas'), text: P('Die Gebiete streuen ungleich stark (Levene-Test). Die Welch-Varianzanalyse und die Games-Howell-Paarvergleiche, mit denen Statable immer rechnet, setzen gleiche Streuung nicht voraus. Danach mit „Rangtest“ gegenprüfen: Kommt dasselbe heraus?', 'The areas vary unequally (Levene\'s test). The Welch analysis of variance and the Games-Howell pairwise comparisons, which Statable always uses, do not assume equal spread. Then cross-check with "rank test": does the same come out?') }
    ]
  },
  {
    id: 'praktikum', fach: 'bildung', stufe: 2, datei: 'praktikum', fälle: 16, minuten: 15,
    titel: P('Praktikum im Lehramt: Zahlen und Interviews', 'Teaching practicum: numbers and interviews'),
    kurz: P('16 Lehramtsstudierende mit Praktikumsnote, Selbstwirksamkeit und einem Interviewzitat. Wie passen Zahlen und Aussagen zusammen?', '16 student teachers with a practicum grade, self-efficacy and an interview quote. How do numbers and statements fit together?'),
    geschichte: P('Nach dem Schulpraktikum haben 16 Lehramtsstudierende eine Praktikumsnote (1 = sehr gut) bekommen und einen Fragebogen zur Selbstwirksamkeit (1 bis 5) ausgefüllt. Dazu gibt es je ein Zitat aus dem Interview. Gibt es Studierende mit guter Note und niedriger Selbstwirksamkeit - und was sagen sie über ihr Praktikum? Die Daten sind erfunden.', 'After the school placement, 16 student teachers received a practicum grade (1 = very good) and filled in a questionnaire on self-efficacy (1 to 5). Each also has a quote from the interview. Are there students with a good grade and low self-efficacy - and what do they say about their practicum? The data are invented.'),
    lernen: [P('Fälle nach Zahlen in Gruppen einteilen (am Median als Startpunkt, kein Befund).', 'Divide cases into groups by their numbers (at the median as a starting point, not a finding).'), P('Zitate lesen, markieren und die Gruppen deuten; Fälle verschieben.', 'Read and mark quotes and interpret the groups; move cases.'), P('Die Tabelle beschreibt nur diese Fälle und prüft nichts.', 'The table only describes these cases and tests nothing.')],
    bez: [
      { spalte: 'kennung', bez: P('Kennung', 'Case ID') },
      { spalte: 'praktikumsnote', bez: P('Praktikumsnote (1 = sehr gut)', 'Practicum grade (1 = very good)') },
      { spalte: 'selbstwirksamkeit', bez: P('Selbstwirksamkeit (1-5)', 'Self-efficacy (1-5)') },
      { spalte: 'schulform', bez: P('Schulform', 'School type') },
      { spalte: 'interview', bez: P('Interviewzitat', 'Interview quote') }
    ],
    nominal: ['schulform'],
    zellen: { schulform: { Primar: P('Primar', 'Primary'), Sekundar: P('Sekundar', 'Secondary') } },
    schritte: [
      { art: 'faelle', w: { l1: ['praktikumsnote', 'selbstwirksamkeit'], l2: ['interview'], l3: ['kennung'] }, titel: P('Zahlen und Zitate nebeneinander', 'Numbers and quotes side by side'), text: P('Jeder Fall steht in einer Zeile. Aus Note und Selbstwirksamkeit entstehen am Median vier Gruppen. Die Zitate lesen: Was sagen Studierende mit guter Note und niedriger Selbstwirksamkeit? Wichtige Stellen markieren, einen Fall verschieben, in der Notiz der Gruppe die Deutung festhalten.', 'Each case is in one row. Note and self-efficacy give four groups at the median. Read the quotes: what do students with a good grade and low self-efficacy say? Mark important passages, move a case, write the interpretation in the note of the group.') },
      { art: 'zusammenhang', w: { l1: ['praktikumsnote'], l2: ['selbstwirksamkeit'] }, titel: P('Die Zahlen für sich', 'The numbers on their own'), text: P('Die Korrelation von Note und Selbstwirksamkeit beschreibt, wie die beiden Zahlen zusammenhängen. Wie die Studierenden ihr Praktikum erleben, steht in den Zitaten.', 'The correlation of grade and self-efficacy describes how the two numbers go together. How the students experience their practicum is in the quotes.') }
    ]
  },
  {
    id: 'meta-feedback', fach: 'methodik', stufe: 2, fälle: 12, minuten: 15,
    titel: P('Wirkt Feedback auf das Lernen?', 'Does feedback affect learning?'),
    kurz: P('Zwölf Studien, zwölf Ergebnisse. Was ist das Gesamtbild - und fehlen vielleicht kleine Studien ohne Wirkung?', 'Twelve studies, twelve results. What is the overall picture - and are small studies without effect perhaps missing?'),
    geschichte: P('Zwölf erfundene Studien haben die Wirkung von Rückmeldung auf Lernleistung untersucht (Effektstärke Hedges g mit Standardfehler). Die Tabelle ist schon eingetragen. Die kleinen Studien zeigen größere Effekte als die großen - ein typisches Warnzeichen.', 'Twelve made-up studies examined the effect of feedback on learning achievement (effect size Hedges\' g with standard error). The table is already filled in. The small studies show larger effects than the large ones - a typical warning sign.'),
    lernen: [P('Ergebnisse gewichtet zusammenfassen (Zufallseffekte-Modell).', 'Combining results with weights (random-effects model).'), P('Heterogenität: I² und τ².', 'Heterogeneity: I² and τ².'), P('Forest-Plot lesen und Funnel-Plot: Verdacht auf Publikationsverzerrung.', 'Reading the forest plot and funnel plot: suspected publication bias.')],
    bez: [
      
    ],
    schritte: [{ art: 'meta', titel: P('Studien zusammenfassen', 'Combine studies'), text: P('Der Forest-Plot zeigt jede Studie und das Gesamtergebnis (Raute). Der Funnel-Plot sollte symmetrisch sein; hier fehlt links unten etwas.', 'The forest plot shows each study and the overall result (diamond). The funnel plot should be symmetric; here something is missing at lower left.') }]
  },
  {
    id: 'gemeinden', fach: 'sozial', stufe: 2, datei: 'gemeinden-oesterreich', fälle: 1911, minuten: 25, echt: true,
    titel: P('Österreichs Gemeinden - echte Daten', 'Austria\'s municipalities - real data'),
    kurz: P('1.911 Gemeinden, echte Zahlen von Statistik Austria: Bildung, Arbeitslosigkeit, Alter, Pendeln. Was hängt womit zusammen?', '1,911 municipalities, real figures from Statistics Austria: education, unemployment, age, commuting. What goes with what?'),
    geschichte: P('Jede Zeile ist eine Gemeinde (Stand 2024; Gemeinden, die es 2011 und 2024 gab). Gemessen sind unter anderem die Arbeitslosenquote, der Anteil mit Hochschulabschluss (2011 und 2024), der Ausländeranteil, der Anteil Über-65-Jähriger und die Haushaltsgröße. Bundesland 9 (Wien) sind die 23 Gemeindebezirke. Es sind keine Stichprobe, sondern alle Gemeinden - und jede Zahl ist eine Quote, keine einzelne Person.', 'Each row is a municipality (as of 2024; municipalities that existed in 2011 and 2024). Measured are, among others, the unemployment rate, the share with a university degree (2011 and 2024), the share of foreign nationals, the share aged over 65 and household size. Federal state 9 (Vienna) is the 23 districts. This is not a sample but all municipalities - and each figure is a rate, not an individual.'),
    lernen: [P('Mit echten Daten arbeiten: Verteilungen sind schief (Gemeindegröße).', 'Working with real data: distributions are skewed (municipality size).'), P('Zusammenhänge: Rangkorrelation und Vorsicht vor dem ökologischen Fehlschluss.', 'Relationships: rank correlation and caution about the ecological fallacy.'), P('Neun Bundesländer vergleichen: Welch-Analyse und Games-Howell.', 'Comparing nine federal states: Welch analysis and Games-Howell.'), P('Bei 1.911 Fällen wird fast alles „signifikant“: Effektstärke zählt.', 'With 1,911 cases almost everything is "significant": effect size counts.'), P('Mehrere Einflüsse zugleich: Regression.', 'Several influences at once: regression.')],
    bez: [
      { spalte: 'gkz', bez: P('Gemeindekennzahl', 'Municipality code') },
      { spalte: 'gemeinde', bez: P('Gemeinde', 'Municipality') },
      { spalte: 'bundesland', bez: P('Bundesland', 'Federal state') },
      { spalte: 'einwohner', bez: P('Einwohnerinnen und Einwohner', 'Inhabitants') },
      { spalte: 'groesse', bez: P('Größenklasse der Gemeinde', 'Size class of the municipality') },
      { spalte: 'anteil_unter15', bez: P('Anteil unter 15 Jahre (%)', 'Share under 15 (%)') },
      { spalte: 'anteil_ueber65', bez: P('Anteil über 65 Jahre (%)', 'Share over 65 (%)') },
      { spalte: 'anteil_auslaender', bez: P('Anteil ausländischer Staatsangehöriger (%)', 'Share of foreign nationals (%)') },
      { spalte: 'erwerbsquote', bez: P('Erwerbsquote 15 bis 64 (%)', 'Employment rate 15 to 64 (%)') },
      { spalte: 'arbeitslosenquote', bez: P('Arbeitslosenquote (%)', 'Unemployment rate (%)') },
      { spalte: 'anteil_lehre_matura', bez: P('Höchstens Lehre oder Matura (%)', 'At most apprenticeship or school leaving certificate (%)') },
      { spalte: 'tertiaer_2011', bez: P('Hochschulabschluss 2011 (%)', 'University degree 2011 (%)') },
      { spalte: 'tertiaer_2024', bez: P('Hochschulabschluss 2024 (%)', 'University degree 2024 (%)') },
      { spalte: 'auspendler', bez: P('Auspendelnde (%)', 'Out-commuters (%)') },
      { spalte: 'haushaltsgroesse', bez: P('Personen je Haushalt', 'Persons per household') }
    ],
    werte: [
      { spalte: 'bundesland', labels: [[1, P('Burgenland', 'Burgenland')], [2, P('Kärnten', 'Carinthia')], [3, P('Niederösterreich', 'Lower Austria')], [4, P('Oberösterreich', 'Upper Austria')], [5, P('Salzburg', 'Salzburg')], [6, P('Steiermark', 'Styria')], [7, P('Tirol', 'Tyrol')], [8, P('Vorarlberg', 'Vorarlberg')], [9, P('Wien', 'Vienna')]] },
      { spalte: 'groesse', labels: [[1, P('unter 1.000', 'under 1,000')], [2, P('1.000 bis 2.499', '1,000 to 2,499')], [3, P('2.500 bis 4.999', '2,500 to 4,999')], [4, P('5.000 bis 9.999', '5,000 to 9,999')], [5, P('ab 10.000', '10,000 and over')]] }
    ],
    nominal: ['bundesland', 'gemeinde'], ordinal: ['groesse'],
    quelle: P('Datenquelle: Statistik Austria - data.statistik.gv.at (Gemeindeergebnisse der Abgestimmten Erwerbsstatistik, CC BY 4.0). Ausgewählte Spalten, nur Gemeinden mit Daten für 2011 und 2024.', 'Data source: Statistics Austria - data.statistik.gv.at (municipal results of the coordinated employment statistics, CC BY 4.0). Selected columns, only municipalities with data for 2011 and 2024.'),
    schritte: [
      { art: 'verteilung', w: { l1: ['einwohner', 'arbeitslosenquote'] }, titel: P('Wie sind die Gemeinden verteilt?', 'How are the municipalities distributed?'), text: P('Die meisten Gemeinden sind klein, wenige sehr groß: Der Mittelwert der Einwohnerzahl liegt weit über dem Median (etwa 1.800). Die Arbeitslosenquote ist ebenfalls rechtsschief.', 'Most municipalities are small, a few very large: the mean number of inhabitants lies far above the median (about 1,800). The unemployment rate is also right-skewed.') },
      { art: 'praepost', w: { l1: ['tertiaer_2011'], l2: ['tertiaer_2024'] }, titel: P('Mehr Hochschulabschlüsse als 2011?', 'More degrees than in 2011?'), text: P('Im Schnitt etwa 4,6 Prozentpunkte mehr. Bei 1.911 Gemeinden ist p winzig - aussagekräftiger ist die Größe der Veränderung und das Konfidenzintervall. Bedenken: Das sind alle Gemeinden, nicht eine Stichprobe.', 'On average about 4.6 percentage points more. With 1,911 municipalities p is tiny - the size of the change and the confidence interval say more. Consider: these are all municipalities, not a sample.') },
      { art: 'zusammenhang', w: { l1: ['arbeitslosenquote'], l2: ['anteil_auslaender'] }, titel: P('Arbeitslosigkeit und Ausländeranteil', 'Unemployment and share of foreign nationals'), text: P('Ein mittlerer Zusammenhang (r etwa 0,5). Aber Vorsicht: Es sind Zahlen über Gemeinden, nicht über Menschen. Daraus folgt nichts über einzelne Personen (ökologischer Fehlschluss). Und Städte verbinden beides.', 'A moderate relationship (r about 0.5). But careful: these are figures about municipalities, not people. Nothing follows for individuals (ecological fallacy). And cities combine both.') },
      { art: 'gruppen', w: { l1: ['arbeitslosenquote'], l2: ['bundesland'] }, titel: P('Neun Bundesländer', 'Nine federal states'), text: P('Wien (23 Gemeindebezirke) liegt weit über allen. Mit Games-Howell sieht man, welche Länder sich wirklich unterscheiden und welche nicht.', 'Vienna (23 districts) lies far above all others. Games-Howell shows which states really differ and which do not.') },
      { art: 'vorhersage', w: { l1: ['arbeitslosenquote'], l2: ['anteil_auslaender', 'haushaltsgroesse', 'anteil_ueber65', 'tertiaer_2024'] }, titel: P('Vier Einflüsse zugleich', 'Four influences at once'), text: P('Regression: Welche Merkmale erklären die Arbeitslosenquote, wenn alle zugleich im Modell sind? R² sagt, welcher Anteil erklärt ist (etwa 28 %); der Rest liegt woanders.', 'Regression: which characteristics explain the unemployment rate when all are in the model together? R² says how much is explained (about 28%); the rest lies elsewhere.') }
    ]
  },
  {
    id: 'welt-gesundheit', fach: 'gesundheit', stufe: 2, datei: 'welt-gesundheit', fälle: 199, minuten: 25, echt: true,
    titel: P('Gesundheit der Welt - echte Daten', 'Health of the world - real data'),
    kurz: P('199 Länder, echte Zahlen der Weltbank: Lebenserwartung, Einkommen, Gesundheitsausgaben, Kinderzahl. Was hängt womit zusammen?', '199 countries, real figures from the World Bank: life expectancy, income, health spending, fertility. What goes with what?'),
    geschichte: P('Jede Zeile ist ein Land (Stand 2021). Gemessen sind die Lebenserwartung bei der Geburt, das Einkommen je Kopf (kaufkraftbereinigt), die Gesundheitsausgaben in Prozent der Wirtschaftsleistung, die Kinderzahl je Frau, die Sterblichkeit von Kindern unter fünf Jahren und der Anteil der Stadtbevölkerung. Dazu kommen die Weltregion und die Einkommensgruppe der Weltbank.', 'Each row is a country (2021). Measured are life expectancy at birth, income per head (purchasing-power adjusted), health spending as a percentage of economic output, children per woman, mortality of children under five and the share of the urban population. The World Bank world region and income group are added.'),
    lernen: [P('Mit echten Daten arbeiten: Einkommen ist stark schief verteilt, Länder sind sehr verschieden groß.', 'Working with real data: income is strongly skewed, countries differ a lot in size.'), P('Zusammenhänge zwischen Ländern sind keine Ursachen: Reichere Länder unterscheiden sich in vielem zugleich.', 'Relations between countries are not causes: richer countries differ in many things at once.'), P('Eine große Kreuztabelle (Region nach Einkommensgruppe) lässt sich auch als Karte lesen (Korrespondenzanalyse).', 'A large cross table (region by income group) can also be read as a map (correspondence analysis).')],
    bez: [
      { spalte: 'iso', bez: P('Ländercode (ISO)', 'Country code (ISO)') },
      { spalte: 'land', bez: P('Land', 'Country') },
      { spalte: 'region', bez: P('Weltregion (Weltbank)', 'World region (World Bank)') },
      { spalte: 'einkommen', bez: P('Einkommensgruppe (Weltbank)', 'Income group (World Bank)') },
      { spalte: 'einwohner', bez: P('Einwohnerinnen und Einwohner', 'Inhabitants') },
      { spalte: 'lebenserwartung', bez: P('Lebenserwartung bei der Geburt (Jahre)', 'Life expectancy at birth (years)') },
      { spalte: 'bip_pro_kopf', bez: P('Einkommen je Kopf (kaufkraftbereinigt, Dollar)', 'Income per head (purchasing-power adjusted, dollars)') },
      { spalte: 'gesundheitsausgaben', bez: P('Gesundheitsausgaben (% der Wirtschaftsleistung)', 'Health spending (% of economic output)') },
      { spalte: 'kinderzahl', bez: P('Kinder je Frau', 'Children per woman') },
      { spalte: 'kindersterblichkeit', bez: P('Sterblichkeit unter fünf Jahren (je 1.000 Geburten)', 'Under-five mortality (per 1,000 births)') },
      { spalte: 'stadtanteil', bez: P('Stadtbevölkerung (%)', 'Urban population (%)') }
    ],
    nominal: ['iso', 'land', 'region', 'einkommen'],
    zellen: {
      region: { 'Afrika südlich der Sahara': P('Afrika südlich der Sahara', 'Sub-Saharan Africa'), 'Europa und Zentralasien': P('Europa und Zentralasien', 'Europe and Central Asia'), 'Lateinamerika und Karibik': P('Lateinamerika und Karibik', 'Latin America and Caribbean'), 'Naher Osten und Nordafrika': P('Naher Osten und Nordafrika', 'Middle East and North Africa'), 'Nordamerika': P('Nordamerika', 'North America'), 'Ostasien und Pazifik': P('Ostasien und Pazifik', 'East Asia and Pacific'), 'Südasien': P('Südasien', 'South Asia') },
      einkommen: { niedrig: P('niedrig', 'low'), 'mittleres Einkommen, untere Hälfte': P('mittleres Einkommen, untere Hälfte', 'lower middle income'), 'mittleres Einkommen, obere Hälfte': P('mittleres Einkommen, obere Hälfte', 'upper middle income'), hoch: P('hoch', 'high') }
    },
    quelle: P('Datenquelle: Weltbank, World Development Indicators (data.worldbank.org, CC BY 4.0), abgerufen am 23.10.2026; Indikatoren SP.DYN.LE00.IN, NY.GDP.PCAP.PP.KD, SH.XPD.CHEX.GD.ZS, SP.DYN.TFRT.IN, SH.DYN.MORT, SP.URB.TOTL.IN.ZS, SP.POP.TOTL für 2021, nur Länder mit Lebenserwartung und Einkommen. Ländernamen englisch wie in der Quelle.', 'Data source: World Bank, World Development Indicators (data.worldbank.org, CC BY 4.0), retrieved 23 October 2026; indicators SP.DYN.LE00.IN, NY.GDP.PCAP.PP.KD, SH.XPD.CHEX.GD.ZS, SP.DYN.TFRT.IN, SH.DYN.MORT, SP.URB.TOTL.IN.ZS, SP.POP.TOTL for 2021, only countries with life expectancy and income. Country names in English as in the source.'),
    schritte: [
      { art: 'verteilung', w: { l1: ['lebenserwartung', 'bip_pro_kopf'] }, titel: P('Wie sind die Länder verteilt?', 'How are the countries distributed?'), text: P('Die Lebenserwartung ist nach oben begrenzt und linksschief, das Einkommen stark rechtsschief: wenige sehr reiche Länder ziehen den Mittelwert hoch. Der Median beschreibt ein typisches Land besser.', 'Life expectancy is capped at the top and left-skewed, income strongly right-skewed: a few very rich countries pull the mean up. The median describes a typical country better.') },
      { art: 'zusammenhang', w: { l1: ['bip_pro_kopf'], l2: ['lebenserwartung'] }, titel: P('Einkommen und Lebenserwartung', 'Income and life expectancy'), text: P('Ein deutlicher, aber kein gerader Zusammenhang: Am Anfang bringt mehr Einkommen viele Lebensjahre, später kaum noch. Die Rangkorrelation passt besser als Pearson.', 'A clear but not straight relation: at first more income brings many years of life, later hardly any. The rank correlation suits better than Pearson.') },
      { art: 'vorhersage', w: { l1: ['lebenserwartung'], l2: ['bip_pro_kopf', 'gesundheitsausgaben', 'stadtanteil', 'kinderzahl'] }, titel: P('Mehrere Einflüsse zugleich', 'Several influences at once'), text: P('Die Einflüsse hängen untereinander zusammen (Länder mit hohem Einkommen haben weniger Kinder und mehr Städte). Die Koeffizienten zeigen, was bleibt, wenn die anderen gleich sind; Ursachen lassen sich daraus nicht ablesen.', 'The influences are related to each other (rich countries have fewer children and more cities). The coefficients show what remains when the others are equal; they do not show causes.') },
      { art: 'kreuz', w: { l1: ['einkommen'], l2: ['region'] }, titel: P('Region und Einkommensgruppe', 'Region and income group'), text: P('Eine Tabelle mit sieben Regionen und vier Einkommensgruppen. Darunter gibt es die Karte der Tabelle: Regionen und Gruppen, die ähnlich besetzt sind, liegen nahe beieinander.', 'A table with seven regions and four income groups. Below it there is the map of the table: regions and groups with a similar pattern lie close together.') },
      { art: 'gruppen', w: { l1: ['lebenserwartung'], l2: ['einkommen'] }, titel: P('Lebenserwartung nach Einkommensgruppe', 'Life expectancy by income group'), text: P('Vier Gruppen, deutliche Unterschiede. Mit „Weitere Wege“ lässt sich auch ein Entscheidungsbaum zeichnen (Vorhersage).', 'Four groups, clear differences. With "More ways" a decision tree can also be drawn (prediction).') }
    ]
  },
  {
    id: 'aggression', fach: 'psych', stufe: 3, datei: 'aggression-aufgaben', fälle: 316, minuten: 30, echt: true,
    titel: P('Verbale Aggression - echte Testdaten', 'Verbal aggression - real test data'),
    kurz: P('316 Personen antworten auf 24 Situationen mit Ja oder Nein. Messen alle Situationen dasselbe, und sind sie für Männer und Frauen gleich fair?', '316 people answer 24 situations with yes or no. Do all situations measure the same thing, and are they equally fair for men and women?'),
    geschichte: P('Vier ärgerliche Situationen (S1 ein Bus hält nicht, S2 ein Zug wird wegen einer falschen Auskunft verpasst, S3 ein Laden schließt kurz vor dem Eintreten, S4 ein Telefonat wird unterbrochen). Zu jeder gibt es sechs Fragen: Wollen (Want) oder tun (Do), und zwar fluchen (Curse), schimpfen (Scold) oder schreien (Shout). Die Spalten heißen z. B. S1WantCurse. Jede Antwort ist 1 (Ja oder vielleicht) oder 0 (Nein). Dazu kommen Geschlecht und ein Wutwert.', 'Four annoying situations (S1 a bus does not stop, S2 a train is missed because of wrong information, S3 a shop closes just before entering, S4 a phone call is cut off). For each there are six questions: want (Want) or do (Do) to curse (Curse), scold (Scold) or shout (Shout). The columns are called e.g. S1WantCurse. Each answer is 1 (yes or perhaps) or 0 (no). Gender and an anger score are added.'),
    lernen: [P('Ein Test mit richtig/falsch-Antworten wird mit dem Rasch- und dem 2PL-Modell geprüft: Wie schwer ist jede Situation, wie gut trennt sie?', 'A test with right/wrong answers is checked with the Rasch and the 2PL model: how hard is each situation, how well does it separate?'), P('Faire Aufgaben (DIF): Haben Männer und Frauen bei gleichem Gesamtwert verschiedene Chancen auf ein Ja?', 'Fair tasks (DIF): do men and women have different chances of a yes at the same total score?'), P('Die Karte der Fragen zeigt, welche Situationen zusammengehören.', 'The map of the questions shows which situations belong together.')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer', 'Case number') },
      { spalte: 'geschlecht', bez: P('Geschlecht', 'Gender') },
      { spalte: 'wut', bez: P('Wutwert (Trait Anger)', 'Anger score (trait anger)') },
      { spalte: 'S1WantCurse', bez: P('Situation 1 (Bus hält nicht), Wollen: fluchen', 'Situation 1 (bus does not stop), want to: curse') },
      { spalte: 'S1WantScold', bez: P('Situation 1 (Bus hält nicht), Wollen: schimpfen', 'Situation 1 (bus does not stop), want to: scold') },
      { spalte: 'S1WantShout', bez: P('Situation 1 (Bus hält nicht), Wollen: schreien', 'Situation 1 (bus does not stop), want to: shout') },
      { spalte: 'S2WantCurse', bez: P('Situation 2 (Zug verpasst), Wollen: fluchen', 'Situation 2 (train missed), want to: curse') },
      { spalte: 'S2WantScold', bez: P('Situation 2 (Zug verpasst), Wollen: schimpfen', 'Situation 2 (train missed), want to: scold') },
      { spalte: 'S2WantShout', bez: P('Situation 2 (Zug verpasst), Wollen: schreien', 'Situation 2 (train missed), want to: shout') },
      { spalte: 'S3WantCurse', bez: P('Situation 3 (Laden geschlossen), Wollen: fluchen', 'Situation 3 (shop closed), want to: curse') },
      { spalte: 'S3WantScold', bez: P('Situation 3 (Laden geschlossen), Wollen: schimpfen', 'Situation 3 (shop closed), want to: scold') },
      { spalte: 'S3WantShout', bez: P('Situation 3 (Laden geschlossen), Wollen: schreien', 'Situation 3 (shop closed), want to: shout') },
      { spalte: 'S4wantCurse', bez: P('Situation 4 (Telefonat unterbrochen), Wollen: fluchen', 'Situation 4 (call cut off), want to: curse') },
      { spalte: 'S4WantScold', bez: P('Situation 4 (Telefonat unterbrochen), Wollen: schimpfen', 'Situation 4 (call cut off), want to: scold') },
      { spalte: 'S4WantShout', bez: P('Situation 4 (Telefonat unterbrochen), Wollen: schreien', 'Situation 4 (call cut off), want to: shout') },
      { spalte: 'S1DoCurse', bez: P('Situation 1 (Bus hält nicht), Tun: fluchen', 'Situation 1 (bus does not stop), do: curse') },
      { spalte: 'S1DoScold', bez: P('Situation 1 (Bus hält nicht), Tun: schimpfen', 'Situation 1 (bus does not stop), do: scold') },
      { spalte: 'S1DoShout', bez: P('Situation 1 (Bus hält nicht), Tun: schreien', 'Situation 1 (bus does not stop), do: shout') },
      { spalte: 'S2DoCurse', bez: P('Situation 2 (Zug verpasst), Tun: fluchen', 'Situation 2 (train missed), do: curse') },
      { spalte: 'S2DoScold', bez: P('Situation 2 (Zug verpasst), Tun: schimpfen', 'Situation 2 (train missed), do: scold') },
      { spalte: 'S2DoShout', bez: P('Situation 2 (Zug verpasst), Tun: schreien', 'Situation 2 (train missed), do: shout') },
      { spalte: 'S3DoCurse', bez: P('Situation 3 (Laden geschlossen), Tun: fluchen', 'Situation 3 (shop closed), do: curse') },
      { spalte: 'S3DoScold', bez: P('Situation 3 (Laden geschlossen), Tun: schimpfen', 'Situation 3 (shop closed), do: scold') },
      { spalte: 'S3DoShout', bez: P('Situation 3 (Laden geschlossen), Tun: schreien', 'Situation 3 (shop closed), do: shout') },
      { spalte: 'S4DoCurse', bez: P('Situation 4 (Telefonat unterbrochen), Tun: fluchen', 'Situation 4 (call cut off), do: curse') },
      { spalte: 'S4DoScold', bez: P('Situation 4 (Telefonat unterbrochen), Tun: schimpfen', 'Situation 4 (call cut off), do: scold') },
      { spalte: 'S4DoShout', bez: P('Situation 4 (Telefonat unterbrochen), Tun: schreien', 'Situation 4 (call cut off), do: shout') }
    ],
    nominal: ['geschlecht'],
    zellen: { geschlecht: { maennlich: P('männlich', 'male'), weiblich: P('weiblich', 'female') } },
    quelle: P('Datenquelle: Datensatz VerbAgg aus dem R-Paket lme4 (Vansteelandt 2000; De Boeck und Wilson 2004, „Explanatory Item Response Models“), Paket unter GPL; aus dem langen ins breite Format gebracht, Antworten „Ja“ oder „vielleicht“ = 1, „Nein“ = 0.', 'Data source: data set VerbAgg from the R package lme4 (Vansteelandt 2000; De Boeck and Wilson 2004, "Explanatory Item Response Models"), package under GPL; converted from long to wide format, answers "yes" or "perhaps" = 1, "no" = 0.'),
    schritte: [
      { art: 'skala', w: { l1: ['S1WantCurse', 'S1WantScold', 'S1WantShout', 'S2WantCurse', 'S2WantScold', 'S2WantShout', 'S3WantCurse', 'S3WantScold', 'S3WantShout', 'S4wantCurse', 'S4WantScold', 'S4WantShout', 'S1DoCurse', 'S1DoScold', 'S1DoShout', 'S2DoCurse', 'S2DoScold', 'S2DoShout', 'S3DoCurse', 'S3DoScold', 'S3DoShout', 'S4DoCurse', 'S4DoScold', 'S4DoShout'] }, titel: P('Messen alle 24 Situationen dasselbe?', 'Do all 24 situations measure the same thing?'), text: P('Unter dem Ergebnis stehen die Karten Rasch-Modell, 2PL-Modell, Faire Aufgaben (DIF mit der Spalte Geschlecht) und Karte der Fragen. Wollen ist leichter als Tun: Die Schwierigkeiten liegen deutlich auseinander.', 'Below the result are the cards Rasch model, 2PL model, Fair tasks (DIF with the column gender) and Map of the questions. Wanting is easier than doing: the difficulties lie clearly apart.') },
      { art: 'faktor', w: { l1: ['S1WantCurse', 'S1WantScold', 'S1WantShout', 'S2WantCurse', 'S2WantScold', 'S2WantShout', 'S3WantCurse', 'S3WantScold', 'S3WantShout', 'S4wantCurse', 'S4WantScold', 'S4WantShout', 'S1DoCurse', 'S1DoScold', 'S1DoShout', 'S2DoCurse', 'S2DoScold', 'S2DoShout', 'S3DoCurse', 'S3DoScold', 'S3DoShout', 'S4DoCurse', 'S4DoScold', 'S4DoShout'] }, titel: P('Welche Gruppen von Fragen gibt es?', 'Which groups of questions are there?'), text: P('Die Faktorenanalyse trennt meist Wollen und Tun. Mit Ja/Nein-Antworten ist sie eine grobe Näherung; das Stufenmodell und die Rasch-Karten sind für solche Daten die genauere Wahl.', 'The factor analysis usually separates wanting and doing. With yes/no answers it is a rough approximation; the graded model and the Rasch cards are the more exact choice for such data.') }
    ]
  },
  {
    id: 'luftqualitaet', fach: 'natur', stufe: 2, datei: 'luftqualitaet-newyork', fälle: 153, minuten: 20, echt: true,
    titel: P('Luft in New York - echte Daten mit Lücken', 'Air in New York - real data with gaps'),
    kurz: P('153 Tage, echte Messungen: Ozon, Sonne, Wind, Temperatur. Einige Werte fehlen - was tun?', '153 days, real measurements: ozone, sun, wind, temperature. Some values are missing - what to do?'),
    geschichte: P('Jede Zeile ist ein Tag von Mai bis September 1973 in New York. Gemessen sind die Ozonkonzentration, die Sonnenstrahlung, die Windgeschwindigkeit und die Höchsttemperatur. Beim Ozon fehlen viele Werte und bei der Sonnenstrahlung einige: Geräte fielen aus.', 'Each row is a day from May to September 1973 in New York. Measured are the ozone concentration, solar radiation, wind speed and maximum temperature. Many ozone values and some radiation values are missing: instruments broke down.'),
    lernen: [P('Fehlende Werte bemerken und beschreiben: Wo fehlen sie, hängt das mit anderen Werten zusammen?', 'Noticing and describing missing values: where are they missing, does it depend on other values?'), P('Was die Auswertung mit Lücken macht: Nur vollständige Fälle gehen in die Regression ein.', 'What the analysis does with gaps: only complete cases enter the regression.'), P('Fehlende Werte mehrfach auffüllen (Mehrfachimputation) und der Test auf zufälliges Fehlen (Little).', 'Filling missing values several times (multiple imputation) and the test for missing completely at random (Little).')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer', 'Case number') },
      { spalte: 'ozon_ppb', bez: P('Ozon (ppb)', 'Ozone (ppb)') },
      { spalte: 'sonnenstrahlung', bez: P('Sonnenstrahlung (Langley)', 'Solar radiation (Langley)') },
      { spalte: 'wind_mph', bez: P('Wind (Meilen je Stunde)', 'Wind (miles per hour)') },
      { spalte: 'temperatur_f', bez: P('Höchsttemperatur (Grad Fahrenheit)', 'Maximum temperature (degrees Fahrenheit)') },
      { spalte: 'monat', bez: P('Monat', 'Month') },
      { spalte: 'tag', bez: P('Tag im Monat', 'Day of the month') }
    ],
    werte: [{ spalte: 'monat', labels: [[5, P('Mai', 'May')], [6, P('Juni', 'June')], [7, P('Juli', 'July')], [8, P('August', 'August')], [9, P('September', 'September')]] }],
    nominal: ['monat'],
    quelle: P('Datenquelle: airquality aus dem R-Paket datasets (New York State Department of Conservation und National Weather Service; Chambers et al. 1983), Teil von R unter GPL.', 'Data source: airquality from the R package datasets (New York State Department of Conservation and National Weather Service; Chambers et al. 1983), part of R under GPL.'),
    schritte: [
      { art: 'verteilung', w: { l1: ['ozon_ppb', 'sonnenstrahlung', 'wind_mph', 'temperatur_f'] }, titel: P('Wie viele Werte fehlen?', 'How many values are missing?'), text: P('Beim Ozon fehlt etwa jeder vierte Wert, bei der Sonnenstrahlung etwa jeder zwanzigste. Die Verteilung des Ozons ist stark rechtsschief.', 'About every fourth ozone value is missing, about every twentieth radiation value. The distribution of ozone is strongly right-skewed.') },
      { art: 'zusammenhang', w: { l1: ['temperatur_f'], l2: ['ozon_ppb'] }, titel: P('Wärme und Ozon', 'Warmth and ozone'), text: P('An heißen Tagen ist mehr Ozon in der Luft. Der Zusammenhang gilt für die Tage mit Messung; fehlende Tage zählen nicht mit.', 'On hot days there is more ozone in the air. The relation holds for the days with a measurement; missing days do not count.') },
      { art: 'vorhersage', w: { l1: ['ozon_ppb'], l2: ['temperatur_f', 'wind_mph', 'sonnenstrahlung'] }, titel: P('Ozon vorhersagen', 'Predicting ozone'), text: P('Alle Tage mit einer Lücke fallen aus der Rechnung; Statable sagt, wie viele Fälle eingingen. Darunter lässt sich die Rechnung mit mehrfach aufgefüllten Werten vergleichen.', 'All days with a gap drop out of the calculation; Statable says how many cases were included. Below, the calculation can be compared with multiply filled-in values.') }
    ]
  },
  {
    id: 'autos', fach: 'technik', stufe: 2, datei: 'autos-mtcars', fälle: 32, minuten: 25, echt: true,
    titel: P('Autos: Gewicht, Getriebe und Meilen je Gallone - echte Daten', 'Cars: weight, transmission and miles per gallon - real data'),
    kurz: P('32 Autos: Gewicht und Getriebe sagen voraus, wie weit ein Auto mit einer Gallone kommt. Was steht in der Ergebnistabelle der Regression, und warum verliert das Getriebe, sobald das Gewicht im Modell ist?', '32 cars: weight and transmission predict how far a car goes on one gallon. What does the regression results table say, and why does the transmission lose its effect once weight is in the model?'),
    geschichte: P('32 Automodelle aus dem Jahr 1974 (Testdaten der Zeitschrift Motor Trend). Gemessen sind die Meilen je Gallone (mpg: je höher, desto sparsamer), das Gewicht in 1000 Pfund (wt; dasselbe Gewicht steht noch einmal in 100 kg als wt_100kg), das Getriebe (am: 0 = Automatik, 1 = Handschaltung), der Hubraum in Kubikzoll (disp) und die Leistung in PS (hp).', '32 car models from 1974 (test data of the magazine Motor Trend). Measured are the miles per gallon (mpg: the higher, the more economical), the weight in 1000 lbs (wt; the same weight is given once more in 100 kg as wt_100kg), the transmission (am: 0 = automatic, 1 = manual), the engine displacement in cubic inches (disp) and the power in horsepower (hp).'),
    lernen: [P('Die Koeffizienten-Tabelle lesen: Konstante, B, Standardfehler, t und Sig., auch bei einer 0/1-Größe wie dem Getriebe.', 'Reading the coefficients table: constant, B, standard error, t and Sig., also for a 0/1 variable such as the transmission.'), P('Modelle vergleichen: R² und korrigiertes R² mit einer und mit zwei Größen.', 'Comparing models: R squared and adjusted R squared with one and with two variables.'), P('B hängt an der Maßeinheit, Beta nicht. Und: Wenn mehrere Größen eng zusammenhängen, ändert sich, was jede einzelne im Modell zeigt.', 'B depends on the unit of measurement, Beta does not. And: when several variables are closely related, what each one shows in the model changes.')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer', 'Case number') },
      { spalte: 'mpg', bez: P('Meilen je Gallone (mpg)', 'Miles per gallon (mpg)') },
      { spalte: 'wt', bez: P('Gewicht (1000 Pfund)', 'Weight (1000 lbs)') },
      { spalte: 'wt_100kg', bez: P('Gewicht (100 kg)', 'Weight (100 kg)') },
      { spalte: 'am', bez: P('Getriebe', 'Transmission') },
      { spalte: 'disp', bez: P('Hubraum (Kubikzoll)', 'Engine displacement (cubic inches)') },
      { spalte: 'hp', bez: P('Leistung (PS)', 'Power (horsepower)') }
    ],
    werte: [{ spalte: 'am', labels: [[0, P('Automatik', 'Automatic')], [1, P('Handschaltung', 'Manual')]] }],
    nominal: ['am'],
    quelle: P('Datenquelle: mtcars aus dem R-Paket datasets (Henderson und Velleman 1981, nach Motor Trend 1974), Teil von R unter GPL. Das Gewicht in 100 kg ist das Gewicht in 1000 Pfund mal 4,5359237.', 'Data source: mtcars from the R package datasets (Henderson and Velleman 1981, after Motor Trend 1974), part of R under GPL. The weight in 100 kg is the weight in 1000 lbs times 4.5359237.'),
    schritte: [
      { art: 'gruppen', w: { l1: ['mpg'], l2: ['am'] }, titel: P('Wie weit fahren Automatik und Handschaltung?', 'How far do automatic and manual cars go?'), text: P('Handschalter kommen im Mittel weiter (24,4 gegen 17,1 Meilen je Gallone). Diese zwei Mittelwerte und ihr Unterschied (7,2) kommen im nächsten Schritt in der Regressionstabelle wieder.', 'Manual cars go further on average (24.4 against 17.1 miles per gallon). These two means and their difference (7.2) come back in the next step in the regression table.') },
      { art: 'vorhersage', w: { l1: ['mpg'], l2: ['am'] }, titel: P('Eine 0/1-Größe in der Tabelle', 'A 0/1 variable in the table'), text: P('Die Konstante ist der Mittelwert der Automatikwagen (am = 0), das B der Zeile „Getriebe: Handschaltung“ der Unterschied zu den Handschaltern (am = 1). Jede Zeile hat ihren Standardfehler, t und Sig. R² beträgt 0,36.', 'The constant is the mean of the automatic cars (am = 0), the B of the row "Transmission: Manual" is the difference to the manual cars (am = 1). Each row has its standard error, t and Sig. R squared is 0.36.') },
      { art: 'vorhersage', w: { l1: ['mpg'], l2: ['wt'] }, titel: P('Modell 1: nur das Gewicht', 'Model 1: weight only'), text: P('B der Gewicht-Zeile (wt) ist -5,3: 1000 Pfund mehr Gewicht gehören im Mittel zu 5,3 Meilen je Gallone weniger. R² beträgt 0,75, das korrigierte R² 0,74.', 'The B of the weight row (wt) is -5.3: 1000 lbs more weight go with 5.3 fewer miles per gallon on average. R squared is 0.75, adjusted R squared 0.74.') },
      { art: 'vorhersage', w: { l1: ['mpg'], l2: ['wt', 'am'] }, titel: P('Modell 3: Gewicht und Getriebe zusammen', 'Model 3: weight and transmission together'), text: P('Allein war das Getriebe deutlich (Sig. unter 0,001). Mit dem Gewicht im Modell steht in der Getriebe-Zeile ein B nahe 0 (-0,02) und Sig. 0,988: Bei gleichem Gewicht bleibt kein Unterschied. Handschalter sind in diesen Daten im Mittel leichter (2,4 gegen 3,8, jeweils in 1000 Pfund). R² bleibt 0,75, das korrigierte R² ist mit 0,736 etwas kleiner als beim Gewicht allein (0,745); die Tabelle rundet beide auf 0,74.', 'On its own the transmission was clear (Sig. below 0.001). With weight in the model the transmission row shows a B near 0 (-0.02) and Sig. 0.988: at equal weight no difference remains. Manual cars are lighter on average in these data (2.4 against 3.8, in units of 1000 lbs). R squared stays 0.75, adjusted R squared is a little smaller at 0.736 than with weight alone (0.745); the table rounds both to 0.74.') },
      { art: 'vorhersage', w: { l1: ['mpg'], l2: ['wt_100kg'] }, titel: P('Dasselbe Gewicht in anderer Einheit', 'The same weight in another unit'), text: P('Wie Modell 1, nur mit dem Gewicht in 100 kg statt in 1000 Pfund. B ändert sich (-1,18 statt -5,34), Beta (-0,868), t und Sig. bleiben gleich. Beta hängt also nicht von der Maßeinheit ab, B schon.', 'Like model 1, only with the weight in 100 kg instead of 1000 lbs. B changes (-1.18 instead of -5.34); Beta (-0.868), t and Sig. stay the same. Beta thus does not depend on the unit of measurement, B does.') },
      { art: 'vorhersage', w: { l1: ['mpg'], l2: ['disp', 'wt', 'hp'] }, titel: P('Drei eng verbundene Größen', 'Three closely related variables'), text: P('Hubraum allein hängt stark mit den Meilen je Gallone zusammen (r = -0,85). Mit Gewicht und Leistung im Modell bleibt für ihn ein Beta nahe 0 (Sig. 0,929), obwohl R² 0,83 beträgt. Warum, zeigt der nächste Schritt.', 'Engine displacement alone is strongly related to miles per gallon (r = -0.85). With weight and power in the model its Beta stays near 0 (Sig. 0.929), although R squared is 0.83. The next step shows why.') },
      { art: 'korrmatrix', w: { l1: ['mpg', 'disp', 'wt', 'hp'] }, titel: P('Wer hängt mit wem zusammen?', 'Who is related to whom?'), text: P('Hubraum und Gewicht hängen eng zusammen (r = 0,89), Hubraum und Leistung ebenfalls (r = 0,79). Sind zwei Größen so eng verbunden, kann das Modell ihren Einzelbeitrag schlecht trennen: Eine von beiden wirkt dann nur noch klein, obwohl sie allein stark mit den Meilen je Gallone zusammenhängt.', 'Displacement and weight are closely related (r = 0.89), displacement and power as well (r = 0.79). When two variables are this closely related, the model can hardly separate their individual contributions: one of them then looks small, although on its own it is strongly related to miles per gallon.') }
    ]
  },
  {
    id: 'kolbenringe', fach: 'technik', stufe: 2, datei: 'kolbenringe', fälle: 200, minuten: 20, echt: true,
    titel: P('Kolbenringe: Regelkarte - echte Fertigungsdaten', 'Piston rings: control chart - real manufacturing data'),
    kurz: P('Je fünf Kolbenringe aus 40 Stichproben, der Innendurchmesser gemessen. Läuft der Prozess stabil?', 'Five piston rings from each of 40 samples, inner diameter measured. Is the process stable?'),
    geschichte: P('Bei der Fertigung von Kolbenringen für Automotoren wird in regelmäßigen Abständen eine Stichprobe von fünf Ringen genommen und ihr Innendurchmesser in Millimetern gemessen. Die ersten 25 Stichproben dienen zum Einrichten der Karte (Einrichtung), die weiteren 15 sind die laufende Kontrolle.', 'In making piston rings for car engines a sample of five rings is taken at regular intervals and its inner diameter is measured in millimetres. The first 25 samples serve to set up the chart (set-up), the other 15 are the ongoing control.'),
    lernen: [P('Eine Regelkarte zeigt, ob ein Prozess nur zufällig schwankt oder sich verändert hat.', 'A control chart shows whether a process only varies by chance or has changed.'), P('Grenzen aus den Einrichtungsdaten, dann neue Stichproben dagegen prüfen.', 'Limits from the set-up data, then checking new samples against them.')],
    bez: [
      { spalte: 'stichprobe', bez: P('Nummer der Stichprobe', 'Sample number') },
      { spalte: 'durchmesser', bez: P('Innendurchmesser (mm)', 'Inner diameter (mm)') },
      { spalte: 'phase', bez: P('Phase', 'Phase') }
    ],
    nominal: ['stichprobe', 'phase'],
    zellen: { phase: { Einrichtung: P('Einrichtung', 'Set-up'), Kontrolle: P('Kontrolle', 'Control') } },
    quelle: P('Datenquelle: Datensatz pistonrings aus dem R-Paket qcc (Montgomery, Introduction to Statistical Quality Control), Paket unter GPL.', 'Data source: data set pistonrings from the R package qcc (Montgomery, Introduction to Statistical Quality Control), package under GPL.'),
    schritte: [
      { art: 'verteilung', w: { l1: ['durchmesser'] }, titel: P('Wie sind die Durchmesser verteilt?', 'How are the diameters distributed?'), text: P('Der Mittelwert liegt bei etwa 74 Millimetern, die Streuung ist winzig. Unter dem Ergebnis steht die Karte „Regelkarte“: Stichprobe als Gruppierung wählen, dann zeigt sie Mittelwerte und Spannweiten mit Grenzen.', 'The mean is about 74 millimetres, the spread is tiny. Below the result is the card "Control chart": choose sample as the grouping, then it shows means and ranges with limits.') },
      { art: 'gruppen', w: { l1: ['durchmesser'], l2: ['phase'] }, titel: P('Einrichtung und Kontrolle', 'Set-up and control'), text: P('Ein Gruppenvergleich der beiden Phasen: Hat sich der Mittelwert verschoben?', 'A group comparison of the two phases: has the mean shifted?') }
    ]
  },
  {
    id: 'messsystem', fach: 'technik', stufe: 3, datei: 'messsystem', fälle: 27, minuten: 20,
    titel: P('Messsystem: Gauge R&R - Lehrbeispiel', 'Measurement system: gauge R&R - teaching example'),
    kurz: P('Drei Prüfende messen dreimal drei Teile. Wie viel der Streuung kommt vom Messen, wie viel von den Teilen?', 'Three operators measure three parts three times each. How much of the variation comes from measuring, how much from the parts?'),
    geschichte: P('Drei Prüfende messen jeweils dreimal drei Prototypen und stoppen die Zeit (zwei Messreihen). Gefragt ist, ob das Messverfahren brauchbar ist: Ist der Unterschied zwischen den Teilen groß gegenüber den Unterschieden zwischen Prüfenden und Wiederholungen?', 'Three operators each measure three prototypes three times and record the time (two measurement series). The question is whether the measurement procedure is usable: is the difference between parts large compared with the differences between operators and repetitions?'),
    lernen: [P('Messstreuung zerlegen: Wiederholbarkeit (gleiche Person) und Vergleichbarkeit (verschiedene Personen).', 'Splitting measurement variation: repeatability (same person) and reproducibility (different people).'), P('Faustregel: Misst das System weniger als 10 Prozent der Streuung, ist es gut; über 30 Prozent nicht brauchbar.', 'Rule of thumb: if the system accounts for less than 10 percent of the variation it is good; above 30 percent not usable.')],
    bez: [
      { spalte: 'teil', bez: P('Teil (Prototyp)', 'Part (prototype)') },
      { spalte: 'pruefer', bez: P('Prüfende Person', 'Operator') },
      { spalte: 'wiederholung', bez: P('Wiederholung', 'Repetition') },
      { spalte: 'zeit_messung1', bez: P('Gemessene Zeit, Reihe 1 (s)', 'Measured time, series 1 (s)') },
      { spalte: 'zeit_messung2', bez: P('Gemessene Zeit, Reihe 2 (s)', 'Measured time, series 2 (s)') }
    ],
    nominal: ['teil', 'pruefer', 'wiederholung'],
    quelle: P('Datenquelle: Datensatz ss.data.rr aus dem R-Paket SixSigma (Lehrbeispiel des Pakets, keine echte Messreihe), Paket unter GPL.', 'Data source: data set ss.data.rr from the R package SixSigma (teaching example of the package, not a real measurement series), package under GPL.'),
    schritte: [
      { art: 'gruppen', w: { l1: ['zeit_messung1'], l2: ['teil'], l3: ['pruefer'] }, titel: P('Bauteile und Prüfende zugleich', 'Parts and operators together'), text: P('Zweifaktorielle Varianzanalyse. Darunter steht die Karte „Messsystemanalyse (Gauge R&R)“: als Gruppierung die Bauteile wählen, dann erscheinen die Anteile an der Streuung und der Anteil des Messsystems.', 'Two-way analysis of variance. Below it is the card "Measurement system analysis (gauge R&R)": choose parts as the grouping, then the shares of the variation and the share of the measurement system appear.') }
    ]
  },
  {
    id: 'kalibrierung', fach: 'technik', stufe: 2, datei: 'kalibrierung-hplc', fälle: 30, minuten: 15, echt: true,
    titel: P('Kalibriergerade einer Flüssigkeitschromatographie', 'Calibration line of a liquid chromatography'),
    kurz: P('Sechs Konzentrationen, je fünf Messungen. Wie genau ist die Gerade, und ab welcher Menge ist etwas sicher nachweisbar?', 'Six concentrations, five measurements each. How exact is the line, and from which amount is something reliably detectable?'),
    geschichte: P('Ein Labor misst das Signal (Peakfläche) bei bekannten Konzentrationen. Aus der Geraden soll man später von einem Signal auf die Konzentration zurückschließen und wissen, wie klein eine Menge sein darf, damit man sie noch sicher nachweist.', 'A laboratory measures the signal (peak area) at known concentrations. Later one should be able to infer the concentration from a signal and to know how small an amount may be and still be reliably detected.'),
    lernen: [P('Die Regressionsgerade als Kalibrierung benutzen und von y auf x zurückrechnen.', 'Using the regression line as a calibration and calculating back from y to x.'), P('Nachweis-, Erfassungs- und Bestimmungsgrenze nach DIN 32645.', 'Limit of detection, limit of identification and limit of quantification according to DIN 32645.')],
    bez: [
      { spalte: 'konzentration', bez: P('Konzentration', 'Concentration') },
      { spalte: 'signal', bez: P('Signal (Peakfläche)', 'Signal (peak area)') }
    ],
    quelle: P('Datenquelle: Datensatz massart97ex3 aus dem R-Paket chemCal (Massart et al. 1997, Chemometrics: a textbook, Beispiel 3), Paket unter GPL.', 'Data source: data set massart97ex3 from the R package chemCal (Massart et al. 1997, Chemometrics: a textbook, example 3), package under GPL.'),
    schritte: [
      { art: 'zusammenhang', w: { l1: ['konzentration'], l2: ['signal'] }, titel: P('Gerade und Grenzen', 'Line and limits'), text: P('Das Streudiagramm zeigt eine fast gerade Linie. Darunter steht die Karte „Kalibriergerade“ mit den drei Grenzen.', 'The scatter plot shows an almost straight line. Below it is the card "Calibration line" with the three limits.') }
    ]
  },
  {
    id: 'demokratie', fach: 'sozial', stufe: 3, datei: 'demokratie-qca', fälle: 18, minuten: 25, echt: true,
    titel: P('Wann überlebte die Demokratie? - Fallvergleich (QCA)', 'When did democracy survive? - case comparison (QCA)'),
    kurz: P('18 europäische Länder der Zwischenkriegszeit, kalibrierte Mengenzugehörigkeiten. Welche Kombination führt zum Überleben der Demokratie?', '18 European countries of the interwar period, calibrated set memberships. Which combination leads to the survival of democracy?'),
    geschichte: P('Jede Zeile ist ein Land (Länderkürzel nach Autokennzeichen). Gemessen ist, wie sehr ein Land zur Menge „entwickelt“, „verstädtert“, „alphabetisiert“, „industrialisiert“ und „stabil regiert“ gehört (0 bis 1) und ob die Demokratie überlebte (1) oder zusammenbrach (0). Aus der Soziologie der Demokratie nach Lipset, wie in der QCA-Literatur üblich.', 'Each row is a country (country code). Measured is how strongly a country belongs to the sets "developed", "urbanised", "literate", "industrialised" and "stably governed" (0 to 1) and whether democracy survived (1) or collapsed (0). From the sociology of democracy after Lipset, as usual in the QCA literature.'),
    lernen: [P('Mengenzugehörigkeiten statt Messwerten: Konsistenz und Überdeckung.', 'Set memberships instead of measurements: consistency and coverage.'), P('Notwendige und hinreichende Bedingungen unterscheiden.', 'Telling necessary and sufficient conditions apart.')],
    bez: [
      { spalte: 'land', bez: P('Land (Kürzel)', 'Country (code)') },
      { spalte: 'entwicklung', bez: P('Entwicklung (0 bis 1)', 'Development (0 to 1)') },
      { spalte: 'verstaedterung', bez: P('Verstädterung (0 bis 1)', 'Urbanisation (0 to 1)') },
      { spalte: 'alphabetisierung', bez: P('Alphabetisierung (0 bis 1)', 'Literacy (0 to 1)') },
      { spalte: 'industrialisierung', bez: P('Industrialisierung (0 bis 1)', 'Industrialisation (0 to 1)') },
      { spalte: 'stabilitaet', bez: P('Stabile Regierung (0 bis 1)', 'Stable government (0 to 1)') },
      { spalte: 'demokratie_ueberlebt', bez: P('Demokratie überlebt (0 bis 1)', 'Democracy survives (0 to 1)') }
    ],
    nominal: ['land'],
    quelle: P('Datenquelle: Datensatz LF (Lipset, fuzzy-set) aus dem R-Paket QCA (Cronqvist und Berg-Schlosser nach Lipset 1959 und Ragin); kalibrierte Werte, nicht die Rohdaten; Paket unter GPL.', 'Data source: data set LF (Lipset, fuzzy set) from the R package QCA (Cronqvist and Berg-Schlosser after Lipset 1959 and Ragin); calibrated values, not the raw data; package under GPL.'),
    schritte: [
      { art: 'faelle', w: { l1: ['entwicklung', 'verstaedterung', 'alphabetisierung', 'industrialisierung'], l2: ['land'] }, titel: P('Die Fälle nebeneinander', 'The cases side by side'), text: P('Jeder Fall in einer Zeile. Darunter steht die Karte „QCA“: Ergebnis wählen (Demokratie überlebt), Bedingungen wählen, dann erscheinen Wahrheitstafel, Lösung und Notwendigkeit.', 'Each case in one row. Below it is the card "QCA": choose the outcome (democracy survives), choose conditions, then the truth table, solution and necessity appear.') }
    ]
  },
  {
    id: 'lalonde', fach: 'sozial', stufe: 3, datei: 'arbeitsprogramm-lalonde', fälle: 445, minuten: 25, echt: true,
    titel: P('Arbeitsprogramm: Wirkt es? - echte Studie', 'Job programme: does it work? - real study'),
    kurz: P('445 Männer, 185 nahmen an einem Arbeitsprogramm teil. Verdienen sie danach mehr - und sind beide Gruppen vergleichbar?', '445 men, 185 took part in a job programme. Do they earn more afterwards - and are the two groups comparable?'),
    geschichte: P('Das National Supported Work Demonstration der USA (1970er Jahre) bot benachteiligten Männern befristete Arbeit. Verglichen werden das Einkommen 1978 von Teilnehmenden (Gruppe 1) und Nichtteilnehmenden (Gruppe 0), dazu Alter, Schulbildung, Herkunft, Familienstand, Schulabschluss und das Einkommen 1974 und 1975. Die Daten stammen aus einem Zufallsversuch; als Übung lässt sich die Vergleichbarkeit der Gruppen prüfen.', 'The National Supported Work Demonstration of the USA (1970s) offered disadvantaged men temporary work. Compared are the income in 1978 of participants (group 1) and non-participants (group 0), plus age, schooling, origin, marital status, school degree and income in 1974 and 1975. The data come from a randomised experiment; as an exercise the comparability of the groups can be checked.'),
    lernen: [P('Ein Gruppenvergleich bei schiefen Einkommensdaten: Mittelwerte und Mediane unterscheiden sich.', 'A group comparison with skewed income data: means and medians differ.'), P('Gruppen vergleichbar machen (Propensity-Matching) und sehen, was sich ändert.', 'Making the groups comparable (propensity matching) and seeing what changes.')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer', 'Case number') },
      { spalte: 'gruppe', bez: P('Gruppe', 'Group') },
      { spalte: 'alter', bez: P('Alter (Jahre)', 'Age (years)') },
      { spalte: 'schuljahre', bez: P('Schuljahre', 'Years of schooling') },
      { spalte: 'schwarz', bez: P('Schwarz (1 = ja)', 'Black (1 = yes)') },
      { spalte: 'hispanisch', bez: P('Hispanisch (1 = ja)', 'Hispanic (1 = yes)') },
      { spalte: 'verheiratet', bez: P('Verheiratet (1 = ja)', 'Married (1 = yes)') },
      { spalte: 'ohne_abschluss', bez: P('Ohne Schulabschluss (1 = ja)', 'No school degree (1 = yes)') },
      { spalte: 'einkommen_1974', bez: P('Einkommen 1974 (Dollar)', 'Income 1974 (dollars)') },
      { spalte: 'einkommen_1975', bez: P('Einkommen 1975 (Dollar)', 'Income 1975 (dollars)') },
      { spalte: 'einkommen_1978', bez: P('Einkommen 1978 (Dollar)', 'Income 1978 (dollars)') }
    ],
    werte: [{ spalte: 'gruppe', labels: [[0, P('Kein Programm', 'No programme')], [1, P('Arbeitsprogramm', 'Job programme')]] }],
    nominal: ['gruppe'],
    quelle: P('Datenquelle: Datensatz lalonde aus dem R-Paket Matching (LaLonde 1986; Dehejia und Wahba 1999), Paket unter GPL.', 'Data source: data set lalonde from the R package Matching (LaLonde 1986; Dehejia and Wahba 1999), package under GPL.'),
    schritte: [
      { art: 'gruppen', w: { l1: ['einkommen_1978'], l2: ['gruppe'] }, titel: P('Verdienen Teilnehmende mehr?', 'Do participants earn more?'), text: P('Der Mittelwert unterscheidet sich, die Verteilung ist stark schief (viele ohne Einkommen). Darunter steht die Karte „Gruppen vergleichbar machen“ mit den Merkmalen Alter, Schuljahre und Einkommen vorher.', 'The mean differs, the distribution is strongly skewed (many without income). Below it is the card "Make the groups comparable" with the characteristics age, years of schooling and income before.') },
      { art: 'verteilung', w: { l1: ['einkommen_1978', 'einkommen_1975'] }, titel: P('Einkommen verteilt', 'Income distribution'), text: P('Viele Nullen, wenige hohe Werte: der Median beschreibt typische Personen besser.', 'Many zeros, a few high values: the median describes typical people better.') }
    ]
  },
  {
    id: 'arbeit-einkommen-puf', fach: 'sozial', stufe: 3, datei: 'arbeit-einkommen-puf', fälle: 8000, minuten: 25,
    titel: P('Arbeit und Einkommen (erfunden, im Stil eines Public-Use-Files)', 'Work and income (invented, in the style of a public-use file)'),
    kurz: P('8.000 erfundene Personen mit Gewicht und 50 Replikationsgewichten. Hochrechnen, Genauigkeit angeben, kleine Zellen sperren.', '8,000 invented people with a weight and 50 replicate weights. Estimating totals, stating precision, suppressing small cells.'),
    geschichte: P('Diese Daten sind erfunden. Sie sehen aus wie das Public-Use-File einer Befragung zu Arbeit und Einkommen: je Person Bundesland, Geschlecht, Alter, Erwerbsstatus, Bildung, Einkommen und Haushaltsgröße, dazu ein Gewicht und 50 Replikationsgewichte (Bootstrap je Bundesland, erzeugt mit dem R-Paket survey). Die Bundesländer sind überproportional gezogen, das Gewicht rechnet auf die Bevölkerung ab 15 Jahren hoch. Die Bevölkerungszahlen sind nur eine Größenordnung. Das Einkommen gibt es nur für Erwerbstätige.', 'These data are invented. They look like the public-use file of a survey on work and income: for each person state, gender, age, employment status, education, income and household size, plus a weight and 50 replicate weights (bootstrap by state, created with the R package survey). The states are drawn disproportionately, the weight scales up to the population aged 15 and over. The population figures are only an order of magnitude. Income exists only for people in work.'),
    lernen: [P('Mit dem Gewicht hochrechnen: Anzahl in der Grundgesamtheit statt Zahl der Befragten.', 'Estimating with the weight: counts in the population instead of the number of respondents.'), P('Die Genauigkeit angeben: Standardfehler und Variationskoeffizient mit den Replikationsgewichten (Typ Bootstrap, Faktor 1/(R − 1) = 1/49).', 'Stating the precision: standard errors and coefficient of variation with the replicate weights (type bootstrap, factor 1/(R − 1) = 1/49).'), P('Eine Tabelle für die Veröffentlichung: kleine Zellen sperren, Zeichenerklärung, Quelle.', 'A table for publication: suppressing small cells, key, source.')],
    bez: [
      { spalte: 'id', bez: P('Kennung der Person', 'Person ID') },
      { spalte: 'bundesland', bez: P('Bundesland', 'State') },
      { spalte: 'geschlecht', bez: P('Geschlecht', 'Gender') },
      { spalte: 'alter', bez: P('Alter (Jahre)', 'Age (years)') },
      { spalte: 'altersgruppe', bez: P('Altersgruppe', 'Age group') },
      { spalte: 'erwerbsstatus', bez: P('Erwerbsstatus', 'Employment status') },
      { spalte: 'bildung', bez: P('Höchste abgeschlossene Bildung', 'Highest completed education') },
      { spalte: 'einkommen', bez: P('Monatliches Nettoeinkommen (Euro)', 'Monthly net income (euro)') },
      { spalte: 'haushalt', bez: P('Personen im Haushalt', 'People in the household') },
      { spalte: 'gewicht', bez: P('Gewicht (Hochrechnung auf die Bevölkerung ab 15)', 'Weight (scaling up to the population aged 15 and over)') },
      ...Array.from({ length: 50 }, (_, i) => ({ spalte: `w_rep${String(i + 1).padStart(2, '0')}`, bez: P(`Replikationsgewicht ${i + 1}`, `Replicate weight ${i + 1}`) }))
    ],
    nominal: ['bundesland', 'geschlecht', 'erwerbsstatus'],
    ordinal: ['altersgruppe', 'bildung'],
    quelle: P('Erfundene Daten (Erzeugung: pruefdaten/mikro/puf/erzeuge-puf.R mit dem R-Paket survey). Keine echten Personen. Replikationsgewichte w_rep01 bis w_rep50: Typ Bootstrap, Faktor 1/(R − 1) = 1/49.', 'Invented data (created with pruefdaten/mikro/puf/erzeuge-puf.R and the R package survey). No real people. Replicate weights w_rep01 to w_rep50: type bootstrap, factor 1/(R − 1) = 1/49.'),
    schritte: [
      { art: 'verteilung', w: { l1: ['erwerbsstatus', 'bildung'] }, titel: P('Erst ansehen', 'First take a look'), text: P('Zuerst als Fallgewicht die Spalte gewicht festlegen: Umfragegewicht. Dann steht in der Tabelle die Hochrechnung. Danach unter „Neue Auswertung“ die Kachel „Tabelle für die Veröffentlichung“ öffnen: Erwerbsstatus nach Bundesland, bei den Replikationsgewichten den Anfang w_rep und den Faktor 1/49 wählen, die Geheimhaltung einschalten und die Grenze zum Beispiel auf 20 stellen.', 'First set the column gewicht as the case weight: survey weight. Then the table shows the estimate. After that open the card "Table for publication" under "New analysis": employment status by state, choose the start w_rep and the factor 1/49 for the replicate weights, switch confidentiality on and set the limit to 20, for example.') },
      { art: 'gruppen', w: { l1: ['einkommen'], l2: ['geschlecht'] }, titel: P('Einkommen nach Geschlecht', 'Income by gender'), text: P('Ein Gruppenvergleich ohne Hochrechnung. Für Mittelwert und Summe mit Standardfehler dient die Tabelle für die Veröffentlichung.', 'A group comparison without scaling up. For mean and sum with standard errors use the table for publication.') },
      { art: 'armut', w: { l1: ['einkommen'], l2: ['gewicht'] }, titel: P('Wie ungleich sind die Einkommen? (Gini-Koeffizient, S80/S20)', 'How unequal are the incomes? (Gini coefficient, S80/S20)'), text: P('Die Karte rechnet mit dem Gewicht: Median, Schwelle bei 60 % des Medians, Anteil darunter, S80/S20 und Gini-Koeffizient mit Standardfehler. Vorsicht beim Lesen: Hier steht das persönliche Nettoeinkommen, nicht das Haushaltseinkommen je Person (äquivalisiert). Darum ist das keine Armutsquote im amtlichen Sinn, sondern ein Maß für die Ungleichheit der persönlichen Einkommen - und die Daten sind erfunden.', 'The card calculates with the weight: median, threshold at 60% of the median, share below it, S80/S20 and the Gini coefficient with standard errors. Careful when reading: the column is personal net income, not household income per person (equivalised). So this is not a poverty rate in the official sense but a measure of the inequality of personal incomes - and the data are invented.') }
    ]
  },
  {
    id: 'bevoelkerung', fach: 'sozial', stufe: 1, datei: 'bevoelkerung-oesterreich', fälle: 8958, minuten: 10, echt: true,
    titel: P('Österreichs Bevölkerung: die Pyramide - echte Daten', 'Austria\'s population: the pyramid - real data'),
    kurz: P('Alter und Geschlecht von knapp neun Millionen Menschen, eine Zeile je 1.000 Personen. Wie sieht die Pyramide aus?', 'Age and gender of almost nine million people, one row per 1,000 people. What does the pyramid look like?'),
    geschichte: P('Jede Zeile steht für 1.000 Personen in Österreich (Stand 2021) in einer Altersklasse von fünf Jahren und einem Geschlecht. Die Tabelle ist aus den Bevölkerungszahlen der Weltbank gebildet; wegen der Rundung auf Tausend sind die Zahlen leicht gerundet.', 'Each row stands for 1,000 people in Austria (2021) in a five-year age class and one gender. The table is built from the World Bank population figures; because of rounding to thousands the numbers are slightly rounded.'),
    lernen: [P('Eine Kreuztabelle aus Altersklasse und Geschlecht und ihre Darstellung als Pyramide.', 'A cross table of age class and gender and its display as a pyramid.'), P('Die Überalterung ablesen: die Pyramide ist unten schmaler als in der Mitte.', 'Reading the ageing: the pyramid is narrower at the bottom than in the middle.')],
    bez: [
      { spalte: 'nr', bez: P('Laufende Nummer (je 1.000 Personen)', 'Case number (per 1,000 people)') },
      { spalte: 'altersklasse', bez: P('Altersklasse (Jahre)', 'Age class (years)') },
      { spalte: 'geschlecht', bez: P('Geschlecht', 'Gender') }
    ],
    nominal: ['altersklasse', 'geschlecht'],
    zellen: { geschlecht: { maennlich: P('männlich', 'male'), weiblich: P('weiblich', 'female') } },
    quelle: P('Datenquelle: Weltbank, World Development Indicators (data.worldbank.org, CC BY 4.0), Indikatoren SP.POP.0004.MA bis SP.POP.80UP.FE, Österreich 2021; eine Zeile je 1.000 Personen.', 'Data source: World Bank, World Development Indicators (data.worldbank.org, CC BY 4.0), indicators SP.POP.0004.MA to SP.POP.80UP.FE, Austria 2021; one row per 1,000 people.'),
    schritte: [
      { art: 'kreuz', w: { l1: ['geschlecht'], l2: ['altersklasse'] }, titel: P('Altersklasse und Geschlecht', 'Age class and gender'), text: P('Die Tabelle zeigt in jeder Altersklasse etwa gleich viele Männer und Frauen; bei den Ältesten überwiegen die Frauen. Unter dem Ergebnis steht die Karte „Pyramide“.', 'The table shows about as many men as women in each age class; among the oldest women predominate. Below the result is the card "Pyramid".') }
    ]
  },
  // Echte, international veröffentlichte Datensätze (07.11.2026), je Gruppe eine Datei: lib/beispiele-echt-a.ts … -d.ts
  ...BEISPIELE_ECHT_A, ...BEISPIELE_ECHT_B, ...BEISPIELE_ECHT_C, ...BEISPIELE_ECHT_D, ...BEISPIELE_PSYCH_A,
  ...BEISPIELE_PSYCH_B, ...BEISPIELE_WIRTSCHAFT
];

export const beispielNach = (id: string) => BEISPIELE.find(b => b.id === id);

/** Die zwölf Studien der Meta-Analyse „Feedback“ (Hedges g, SE) - erfunden, Erzeugung in scripts/erzeuge-beispiele.mjs. */
export const META_FEEDBACK: [Paar, number, number][] = [
  [P('Studie 01 (n = 24)', 'Study 01 (n = 24)'), 0.98, 0.292], [P('Studie 02 (n = 30)', 'Study 02 (n = 30)'), 0.85, 0.261], [P('Studie 03 (n = 36)', 'Study 03 (n = 36)'), 0.15, 0.238], [P('Studie 04 (n = 40)', 'Study 04 (n = 40)'), 0.37, 0.226],
  [P('Studie 05 (n = 48)', 'Study 05 (n = 48)'), 0.72, 0.206], [P('Studie 06 (n = 60)', 'Study 06 (n = 60)'), 0.89, 0.184], [P('Studie 07 (n = 75)', 'Study 07 (n = 75)'), 0.2, 0.165], [P('Studie 08 (n = 90)', 'Study 08 (n = 90)'), 0.45, 0.151],
  [P('Studie 09 (n = 120)', 'Study 09 (n = 120)'), 0.27, 0.13], [P('Studie 10 (n = 160)', 'Study 10 (n = 160)'), 0.36, 0.113], [P('Studie 11 (n = 240)', 'Study 11 (n = 240)'), 0.47, 0.092], [P('Studie 12 (n = 380)', 'Study 12 (n = 380)'), 0.54, 0.073]
];

/**
 * Spaltennamen der Übungsdateien in den Sprachen (Johannes 29.10.2026): Deutsch = Name in der CSV-Datei, jede Sprache in ihrer Schrift.
 * Ohne Eintrag bleiben Namen in jeder Sprache gleich: Kürzel (id, iso, pa1 … pa8, w_rep01 …), Markennamen und die Originalnamen echter Daten (S1WantCurse …).
 * Daten sind Daten: Die Namen gelten ab dem Öffnen; wer danach die Sprache wechselt, behält sie.
 */
export const SPALTENNAMEN: Record<string, Paar> = {
  nr: P('nr', 'id'), klasse: P('klasse', 'class'), gruppe: P('gruppe', 'group'), geschlecht: P('geschlecht', 'gender'),
  lesen_vor: P('lesen_vor', 'reading_before'), lesen_nach: P('lesen_nach', 'reading_after'), lesen_nachtest: P('lesen_nachtest', 'reading_followup'),
  lesen_zuwachs: P('lesen_zuwachs', 'reading_gain'), motivation_vor: P('motivation_vor', 'motivation_before'),
  motivation_nach: P('motivation_nach', 'motivation_after'), bildung_eltern: P('bildung_eltern', 'parent_education'),
  lesetest: P('lesetest', 'reading_test'), note_mathe: P('note_mathe', 'grade_math'), note_deutsch: P('note_deutsch', 'grade_german'),
  fehltage: P('fehltage', 'days_absent'), empfehlung: P('empfehlung', 'recommendation'), selbstwirksamkeit: P('selbstwirksamkeit', 'self_efficacy'),
  lernzeit: P('lernzeit', 'study_time'), pruefungsleistung: P('pruefungsleistung', 'exam_score'), alter: P('alter', 'age'),
  bdi_beginn: P('bdi_beginn', 'bdi_start'), bdi_nach8wochen: P('bdi_nach8wochen', 'bdi_after_8weeks'),
  bdi_nach6monaten: P('bdi_nach6monaten', 'bdi_after_6months'), programm: P('programm', 'program'),
  zigaretten_pro_tag: P('zigaretten_pro_tag', 'cigarettes_per_day'), wochen_beobachtet: P('wochen_beobachtet', 'weeks_observed'),
  rueckfall: P('rueckfall', 'relapse'), rueckfall_26_wochen: P('rueckfall_26_wochen', 'relapse_26_weeks'),
  bildungsjahre: P('bildungsjahre', 'years_education'), kurztest: P('kurztest', 'short_test'), test_auffaellig: P('test_auffaellig', 'test_abnormal'),
  diagnose: P('diagnose', 'diagnosis'), bildschirmzeit_std: P('bildschirmzeit_std', 'screen_time_h'), belastung: P('belastung', 'exertion'),
  puls_ekg: P('puls_ekg', 'pulse_ecg'), puls_uhr_a: P('puls_uhr_a', 'pulse_watch_a'), puls_uhr_b: P('puls_uhr_b', 'pulse_watch_b'),
  intervall: P('intervall', 'interval'), aktivitaet_a: P('aktivitaet_a', 'activity_a'), aktivitaet_b: P('aktivitaet_b', 'activity_b'),
  qualitaet_a: P('qualitaet_a', 'quality_a'), qualitaet_b: P('qualitaet_b', 'quality_b'), antwort: P('antwort', 'answer'),
  kodierer_a: P('kodierer_a', 'coder_a'), kodierer_b: P('kodierer_b', 'coder_b'), kodierer_c: P('kodierer_c', 'coder_c'),
  studiengang: P('studiengang', 'degree_program'), gefehlt: P('gefehlt', 'missing'), kind: P('kind', 'child'), woche: P('woche', 'week'),
  phase: P('phase', 'phase'), woerter_pro_minute: P('woerter_pro_minute', 'words_per_minute'),
  jahre_im_betrieb: P('jahre_im_betrieb', 'years_company'), buero_tage: P('buero_tage', 'office_days'), fuehrung: P('fuehrung', 'leadership'),
  vertrauen: P('vertrauen', 'team_trust'), kuendigungsabsicht: P('kuendigungsabsicht', 'intent_to_quit'),
  sozialindex: P('sozialindex', 'social_index'), unterrichtsqualitaet: P('unterrichtsqualitaet', 'teaching_quality'),
  mathematik: P('mathematik', 'math_test'), zufriedenheit: P('zufriedenheit', 'satisfaction'), verkehrsmittel: P('verkehrsmittel', 'transport_mode'),
  wochen: P('wochen', 'weeks_since_start'), gebiet: P('gebiet', 'area'), nitrat_mg_l: P('nitrat_mg_l', 'nitrate_mg_l'), kennung: P('kennung', 'id'),
  praktikumsnote: P('praktikumsnote', 'internship_grade'), schulform: P('schulform', 'school_type'), interview: P('interview', 'interview_quote'),
  gkz: P('gkz', 'municipality_code'), gemeinde: P('gemeinde', 'municipality'), bundesland: P('bundesland', 'state'),
  einwohner: P('einwohner', 'inhabitants'), groesse: P('groesse', 'size_class'), anteil_unter15: P('anteil_unter15', 'share_under15'),
  anteil_ueber65: P('anteil_ueber65', 'share_over65'), anteil_auslaender: P('anteil_auslaender', 'share_foreign'),
  erwerbsquote: P('erwerbsquote', 'employment_rate'), arbeitslosenquote: P('arbeitslosenquote', 'unemployment_rate'),
  anteil_lehre_matura: P('anteil_lehre_matura', 'share_apprentice'), tertiaer_2011: P('tertiaer_2011', 'tertiary_2011'),
  tertiaer_2024: P('tertiaer_2024', 'tertiary_2024'), auspendler: P('auspendler', 'out_commuters'),
  haushaltsgroesse: P('haushaltsgroesse', 'household_size'), land: P('land', 'country'), region: P('region', 'world_region'),
  einkommen: P('einkommen', 'income_group'), lebenserwartung: P('lebenserwartung', 'life_expectancy'),
  bip_pro_kopf: P('bip_pro_kopf', 'gdp_per_capita'), gesundheitsausgaben: P('gesundheitsausgaben', 'health_spending'),
  kinderzahl: P('kinderzahl', 'fertility_rate'), kindersterblichkeit: P('kindersterblichkeit', 'under5_mortality'),
  stadtanteil: P('stadtanteil', 'urban_pop'), wut: P('wut', 'trait_anger'), ozon_ppb: P('ozon_ppb', 'ozone_ppb'),
  sonnenstrahlung: P('sonnenstrahlung', 'solar_radiation'), wind_mph: P('wind_mph', 'wind_mph'), temperatur_f: P('temperatur_f', 'temperature_f'),
  monat: P('monat', 'month'), tag: P('tag', 'day'), stichprobe: P('stichprobe', 'sample'), durchmesser: P('durchmesser', 'diameter_mm'),
  teil: P('teil', 'part'), pruefer: P('pruefer', 'operator'), wiederholung: P('wiederholung', 'repetition'),
  zeit_messung1: P('zeit_messung1', 'time_series1'), zeit_messung2: P('zeit_messung2', 'time_series2'),
  konzentration: P('konzentration', 'concentration'), signal: P('signal', 'signal'), entwicklung: P('entwicklung', 'development'),
  verstaedterung: P('verstaedterung', 'urbanisation'), alphabetisierung: P('alphabetisierung', 'literacy'),
  industrialisierung: P('industrialisierung', 'industrialisation'), stabilitaet: P('stabilitaet', 'stable_government'),
  demokratie_ueberlebt: P('demokratie_ueberlebt', 'democracy_survives'), schuljahre: P('schuljahre', 'school_years'), schwarz: P('schwarz', 'black'),
  hispanisch: P('hispanisch', 'hispanic'), verheiratet: P('verheiratet', 'married'), ohne_abschluss: P('ohne_abschluss', 'no_degree'),
  einkommen_1974: P('einkommen_1974', 'income_1974'), einkommen_1975: P('einkommen_1975', 'income_1975'),
  einkommen_1978: P('einkommen_1978', 'income_1978'), altersgruppe: P('altersgruppe', 'age_group'),
  erwerbsstatus: P('erwerbsstatus', 'employment_status'), bildung: P('bildung', 'education'), haushalt: P('haushalt', 'household'),
  gewicht: P('gewicht', 'weight'), altersklasse: P('altersklasse', 'age_class'), semester: P('semester', 'semester'),
  handy_im_bett: P('handy_im_bett', 'phone_in_bed'), schlaf_stunden: P('schlaf_stunden', 'sleep_hours'),
  kaffee_tassen: P('kaffee_tassen', 'coffee_cups'),
  ...SPALTEN_ECHT_A, ...SPALTEN_ECHT_B, ...SPALTEN_ECHT_C, ...SPALTEN_ECHT_D, ...SPALTEN_PSYCH_A,
  ...SPALTEN_PSYCH_B, ...SPALTEN_WIRTSCHAFT
};

/** Die Namen einer Übungsdatei in der gewählten Sprache (Name der Datei → neuer Name): gültig und je Datei verschieden, sonst bleibt der Name der Datei. */
export function namenFuer(kopf: string[]): Record<string, string> {
  const belegt = new Set(kopf.filter(n => !SPALTENNAMEN[n]).map(n => n.toLowerCase())), m: Record<string, string> = {};
  for (const n of kopf) {
    const p = SPALTENNAMEN[n], w = p ? waehle(p) : n;
    m[n] = p && w !== n && gueltigerName(w) && !belegt.has(w.toLowerCase()) ? w : n;
    belegt.add(m[n]!.toLowerCase());
  }
  return m;
}
