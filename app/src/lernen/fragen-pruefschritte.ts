/**
 * Üben: vier Prüfschritte für eine Fragebogen-Skala (Usability Stufe 6a, 10.11.2026; Wunsch der Lehrenden: Inhalt → Faktorenanalyse → Reliabilitätsanalyse → alles zusammen).
 * Jeder Schritt ist eine eigene Einheit und für sich lösbar (`lernplan-pruefschritte.ts`). Kennungen `pm-in-`, `pm-fa-`, `pm-rel-`, `pm-ges-`.
 *  - Inhalt (`pm-in-`): nur Wortlaute, keine Zahlen; Beispielwortlaute (erfunden).
 *  - Faktorenanalyse (`pm-fa-`): elf Items aus psych::bfi, drei Hauptkomponenten, Varimax; Grenze als gesetzte Regel. Kein Umpolen in diesem Schritt:
 *    Ein Minus zählt mit seinem Betrag; umgepolt drehte sich nur das Vorzeichen (in R geprüft).
 *  - Reliabilitätsanalyse (`pm-rel-`): Umpolen als Vorbereitung, Cronbachs Alpha, Alpha ohne Item, Grenze als „Angenommen …“. Ohne Trennschärfe.
 *  - Alles zusammen (`pm-ges-`): je Frage Inhalt, Ladung und Alpha abwägen (gesetzte Regel im Stamm), danach der Skalenwert als Mittelwert.
 * Alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet-pruefschritte.json (R: scripts/ueben-erwartet-pruefschritte.R, mit zweitem Weg je Rechnung).
 * Eigener Wächter: fragen-pruefschritte.test.ts. Belege nur, die in geprüften Fragen schon stehen (wissen.json, mc: true).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, Tabelle, ThemaModul } from './fragen';
import ERW from '../lib/testdaten/ueben-erwartet-pruefschritte.json';

export const THEMA_PM = 'pruefschritte';
const T = THEMA_PM;
const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

/** Sollwerte (Tabellen als Zeilen, Zahlen unter `werte`). */
export const PM_JSON = ERW as unknown as Record<string, (string | number)[][]> & { werte: Record<string, number> };
const wert = (k: string): number => { const v = PM_JSON.werte[k]; if (typeof v !== 'number') throw new Error(`ueben-erwartet-pruefschritte.json: kein Wert „${k}“`); return v; };
/** Zahl deutsch (Komma) und englisch (Punkt); `za`/`zae` als Betrag. */
const zd = (k: string, s = 2): string => wert(k).toFixed(s).replace('.', ',');
const ze = (k: string, s = 2): string => wert(k).toFixed(s);
const za = (k: string, s = 2): string => Math.abs(wert(k)).toFixed(s).replace('.', ',');
const zae = (k: string, s = 2): string => Math.abs(wert(k)).toFixed(s);
const zn = (k: string): string => { const v = wert(k); if (!Number.isInteger(v)) throw new Error(`${k} ist keine ganze Zahl`); return String(v); };
const tab = (k: string, kopf: Tabelle['kopf'], quelle: Tabelle['quelle'], titel?: Tabelle['titel']): Tabelle => {
  const zeilen = PM_JSON[k];
  if (!Array.isArray(zeilen)) throw new Error(`ueben-erwartet-pruefschritte.json: keine Tabelle „${k}“`);
  return { ...(titel ? { titel } : {}), kopf, zeilen, quelle };
};

const QUELLE = P(
  `Daten: psych::bfi (SAPA-Projekt 2010, Fragen aus dem IPIP; Paket psych, Lizenz GPL ≥ 2), ${zn('ps_n')} Personen mit allen elf Antworten (1 bis 6). Hauptkomponenten, Varimax, berechnet mit R.`,
  `Data: psych::bfi (SAPA project 2010, items from the IPIP; package psych, licence GPL ≥ 2), ${zn('ps_n')} people with all eleven answers (1 to 6). Principal components, varimax, computed with R.`);
const QUELLE_R = P(
  `Daten: psych::bfi (SAPA-Projekt 2010, Fragen aus dem IPIP; Paket psych, Lizenz GPL ≥ 2), dieselben ${zn('ps_n')} Personen, Antworten 1 bis 6. Cronbachs Alpha berechnet mit R.`,
  `Data: psych::bfi (SAPA project 2010, items from the IPIP; package psych, licence GPL ≥ 2), the same ${zn('ps_n')} people, answers 1 to 6. Cronbach's alpha computed with R.`);
const QUELLE_P = P(
  'Daten: psych::bfi (SAPA-Projekt 2010, Fragen aus dem IPIP; Paket psych, Lizenz GPL ≥ 2), die ersten drei Personen der Datei mit allen elf Antworten, Antworten 1 bis 6.',
  'Data: psych::bfi (SAPA project 2010, items from the IPIP; package psych, licence GPL ≥ 2), the first three people in the file with all eleven answers, answers 1 to 6.');
const KOPF_ITEM = P('Item', 'Item');
const kopfK = (n: number) => P(`Komponente ${n}`, `Component ${n}`);
const KOPF_OHNE = P('Cronbachs Alpha, wenn Item gelöscht', 'Cronbach\'s alpha if item deleted');

/** Die elf Items mit eigenen Worten (IPIP, gemeinfrei) und die zwei geplanten Konstrukte. */
const ITEMS_DE = 'A1 „Die Gefühle anderer lassen mich kalt“, A2 „Ich frage nach, wie es anderen geht“, A3 „Ich weiß, wie ich andere trösten kann“, A5 „Ich sorge dafür, dass sich andere wohlfühlen“, N2 „Ich bin schnell gereizt“, N3 „Meine Stimmung schwankt oft“, N4 „Ich bin oft niedergeschlagen“, O2 „Ich meide schwierige Texte“, O5 „Ich gehe einem Thema ungern auf den Grund“, C2 „Ich bleibe dran, bis alles perfekt ist“, E2 „Es fällt mir schwer, auf andere zuzugehen“';
const ITEMS_EN = 'A1 "Other people\'s feelings leave me cold", A2 "I ask how others are doing", A3 "I know how to comfort others", A5 "I make others feel at ease", N2 "I get irritated quickly", N3 "My mood often swings", N4 "I often feel down", O2 "I avoid difficult reading", O5 "I dislike getting to the bottom of a topic", C2 "I keep going until everything is perfect", E2 "I find it hard to approach others"';
const KONSTRUKTE_DE = 'Geplant sind zwei Skalen: Mitgefühl (sich in andere einfühlen und ihnen beistehen) sowie Gereiztheit und Niedergeschlagenheit.';
const KONSTRUKTE_EN = 'Two scales are planned: compassion (empathising with others and standing by them) and irritability and low mood.';

const IN = 'pm-in', FA = 'pm-fa', REL = 'pm-rel', GES = 'pm-ges';

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  [IN]: {
    titel: P('Ein neuer Fragebogen soll zwei Konstrukte messen: Mitgefühl (sich in andere einfühlen und ihnen beistehen) und Gereiztheit (schnell ärgerlich werden). Sechs Fragen (Beispielwortlaute): 1 „Ich tröste Menschen, denen es schlecht geht.“ 2 „Kleinigkeiten bringen mich schnell auf.“ 3 „Wie es anderen geht, ist mir gleich.“ 4 „Wenn jemand über seine Sorgen klagt, werde ich schnell ungeduldig.“ 5 „Ich lese gern Bücher über Geschichte.“ 6 „Ich bleibe ruhig, auch wenn andere mich ärgern.“ Geprüft wird hier nur der Wortlaut.',
      'A new questionnaire is meant to measure two constructs: compassion (empathising with others and standing by them) and irritability (getting annoyed quickly). Six questions (example wordings): 1 "I comfort people who are having a hard time." 2 "Little things make me angry quickly." 3 "How others are doing is all the same to me." 4 "When someone complains about their worries, I quickly grow impatient." 5 "I like reading books about history." 6 "I stay calm even when others annoy me." Only the wording is checked here.'),
    tabellen: []
  },
  [FA]: {
    titel: P(`Elf Items eines Persönlichkeitsfragebogens: ${ITEMS_DE}. ${KONSTRUKTE_DE} Gerechnet wurde eine Hauptkomponentenanalyse mit drei Komponenten.`,
      `Eleven items of a personality questionnaire: ${ITEMS_EN}. ${KONSTRUKTE_EN} A principal component analysis with three components was computed.`),
    tabellen: [
      tab(`${FA}.0`, [KOPF_ITEM, kopfK(1), kopfK(2), kopfK(3)], QUELLE,
        P(`Rotierte Komponentenmatrix (Ladungen mit einem Betrag unter ${zd('ps_anzeige')} ausgeblendet; die Antworten sind so, wie sie erhoben wurden)`, `Rotated component matrix (loadings with an absolute size below ${ze('ps_anzeige')} hidden; the answers are as collected)`))
    ]
  },
  [REL]: {
    titel: P(`Zwei Skalen aus demselben Fragebogen: Mitgefühl aus A1 „Die Gefühle anderer lassen mich kalt“, A2 „Ich frage nach, wie es anderen geht“, A3 „Ich weiß, wie ich andere trösten kann“ und A5 „Ich sorge dafür, dass sich andere wohlfühlen“; Gereiztheit und Niedergeschlagenheit aus N2 „Ich bin schnell gereizt“, N3 „Meine Stimmung schwankt oft“ und N4 „Ich bin oft niedergeschlagen“. Mitgefühl: Alpha ${zd('rel_m_roh', 3)} mit A1, wie erhoben; ${zd('rel_m_um', 3)} mit A1 umgepolt (7 minus Wert). Gereiztheit und Niedergeschlagenheit: Alpha ${zd('rel_n', 3)}.`,
      `Two scales from the same questionnaire: compassion from A1 "Other people's feelings leave me cold", A2 "I ask how others are doing", A3 "I know how to comfort others" and A5 "I make others feel at ease"; irritability and low mood from N2 "I get irritated quickly", N3 "My mood often swings" and N4 "I often feel down". Compassion: alpha ${ze('rel_m_roh', 3)} with A1 as collected; ${ze('rel_m_um', 3)} with A1 reverse-coded (7 minus value). Irritability and low mood: alpha ${ze('rel_n', 3)}.`),
    tabellen: [
      tab(`${REL}.0`, [KOPF_ITEM, KOPF_OHNE], QUELLE_R, P(`Mitgefühl, A1 wie erhoben (Alpha ${zd('rel_m_roh', 3)})`, `Compassion, A1 as collected (alpha ${ze('rel_m_roh', 3)})`)),
      tab(`${REL}.1`, [KOPF_ITEM, KOPF_OHNE], QUELLE_R, P(`Mitgefühl, A1 umgepolt (Alpha ${zd('rel_m_um', 3)})`, `Compassion, A1 reverse-coded (alpha ${ze('rel_m_um', 3)})`)),
      tab(`${REL}.2`, [KOPF_ITEM, KOPF_OHNE], QUELLE_R, P(`Gereiztheit und Niedergeschlagenheit (Alpha ${zd('rel_n', 3)})`, `Irritability and low mood (alpha ${ze('rel_n', 3)})`))
    ]
  },
  [GES]: {
    titel: P(`Alle drei Prüfschritte zusammen. Elf Items: ${ITEMS_DE}. ${KONSTRUKTE_DE} Die Tabellen zeigen die Ladungen (drei Komponenten), Alpha ohne Item für beide Skalen (Mitgefühl mit A1 umgepolt: Alpha ${zd('rel_m_um', 3)}; Gereiztheit und Niedergeschlagenheit: Alpha ${zd('rel_n', 3)}) und Mitgefühl mit E2 (umgepolt) als fünftem Item (Alpha ${zd('ges_m5', 3)}).`,
      `All three checking steps together. Eleven items: ${ITEMS_EN}. ${KONSTRUKTE_EN} The tables show the loadings (three components), alpha if item deleted for both scales (compassion with A1 reverse-coded: alpha ${ze('rel_m_um', 3)}; irritability and low mood: alpha ${ze('rel_n', 3)}) and compassion with E2 (reverse-coded) as a fifth item (alpha ${ze('ges_m5', 3)}).`),
    tabellen: [
      tab(`${GES}.0`, [KOPF_ITEM, kopfK(1), kopfK(2), kopfK(3)], QUELLE, P(`Rotierte Komponentenmatrix (Ladungen mit einem Betrag unter ${zd('ps_anzeige')} ausgeblendet)`, `Rotated component matrix (loadings with an absolute size below ${ze('ps_anzeige')} hidden)`)),
      tab(`${GES}.1`, [KOPF_ITEM, KOPF_OHNE], QUELLE_R, P('Alpha ohne Item: Mitgefühl (A1 bis A5, A1 umgepolt) und Gereiztheit und Niedergeschlagenheit (N2 bis N4)', 'Alpha if item deleted: compassion (A1 to A5, A1 reverse-coded) and irritability and low mood (N2 to N4)')),
      tab(`${GES}.2`, [KOPF_ITEM, KOPF_OHNE], QUELLE_R, P(`Mitgefühl mit E2 als fünftem Item (A1 und E2 umgepolt; Alpha ${zd('ges_m5', 3)})`, `Compassion with E2 as a fifth item (A1 and E2 reverse-coded; alpha ${ze('ges_m5', 3)})`))
    ]
  }
};

/** Gesetzte Regel des letzten Schritts (steht in jedem Stamm dieser Reihe, der eine Entscheidung verlangt). */
const REGEL_DE = 'Angenommen, eine Frage wird entfernt, wenn mindestens zwei der drei Prüfschritte gegen sie sprechen: Der Inhalt passt zu keinem der Konstrukte; sie hat keine eindeutige Ladung (Betrag ab 0,40 auf genau einer Komponente, der ihres Konstrukts); Alpha ohne sie ist höher als mit ihr. Sonst bleibt sie, gegenläufige Fragen umgepolt.';
const REGEL_EN = 'Assume a question is removed if at least two of the three checking steps speak against it: its content fits none of the constructs; it has no clear loading (absolute size of 0.40 or more on exactly one component, the one of its construct); alpha without it is higher than with it. Otherwise it stays, with opposite questions reverse-coded.';

const HILFE_IN = ['inhaltsvaliditaet', 'konstrukt', 'item'];
const HILFE_FA = ['ladung', 'faktorenanalyse', 'hauptkomponenten'];
const HILFE_REL = ['cronbach-alpha', 'umpolen'];
const HILFE_GES = ['ladung', 'cronbach-alpha', 'skalenwert'];

export const FRAGEN: Frage[] = [
  // ---- Schritt 1: Inhalt (nur Wortlaut) ----
  {
    id: 'pm-in-zuordnen', thema: T, fall: IN,
    stamm: P('Welche Zuordnung der Fragen 1, 2 und 5 passt allein nach dem Wortlaut?', 'Which assignment of questions 1, 2 and 5 fits by the wording alone?'),
    antworten: [
      a(P('1 zu Mitgefühl, 2 zu Gereiztheit, 5 zu keinem der beiden', '1 to compassion, 2 to irritability, 5 to neither of the two'),
        P('Trösten ist Beistehen (Mitgefühl), schnell aufgebracht sein ist Gereiztheit. Bücher über Geschichte haben mit keinem der beiden Konstrukte zu tun.', 'Comforting is standing by someone (compassion); getting angry quickly is irritability. Books about history have nothing to do with either construct.'), true),
      a(P('1 zu Mitgefühl, 2 zu Gereiztheit, 5 zu Mitgefühl', '1 to compassion, 2 to irritability, 5 to compassion'),
        P('Eine Frage muss nicht in eine der Skalen. Wer gern über Geschichte liest, zeigt damit weder Mitgefühl noch Gereiztheit; Frage 5 passt zu keinem der beiden.', 'A question does not have to go into one of the scales. Liking to read about history shows neither compassion nor irritability; question 5 fits neither.')),
      a(P('1 zu Mitgefühl, 2 zu beiden, 5 zu keinem der beiden', '1 to compassion, 2 to both, 5 to neither of the two'),
        P('Frage 2 spricht nur vom eigenen Ärger über Kleinigkeiten, nicht von anderen Menschen und ihrem Befinden. Sie gehört zu Gereiztheit allein.', 'Question 2 speaks only of one\'s own anger at little things, not of other people and how they are. It belongs to irritability alone.'))
    ],
    hilfe: HILFE_IN, belege: ['wissen:inhaltsvaliditaet-urteil', 'Hilfe:konstrukt', 'Hilfe:item']
  },
  {
    id: 'pm-in-gegenlaeufig', thema: T, fall: IN,
    stamm: P('Frage 3 lautet „Wie es anderen geht, ist mir gleich.“ Wohin gehört sie nach dem Inhalt?', 'Question 3 reads "How others are doing is all the same to me." Where does it belong by content?'),
    antworten: [
      a(P('Zu Mitgefühl, als gegenläufig formulierte Frage', 'To compassion, as a question worded in the opposite direction'),
        P('Die Frage handelt von Mitgefühl, nur in umgekehrter Richtung: Zustimmung heißt wenig Mitgefühl. Solche Fragen gehören zum Konstrukt.', 'The question is about compassion, only in the opposite direction: agreement means little compassion. Such questions belong to the construct.'), true),
      a(P('Zu keinem der beiden, weil sie gegenläufig formuliert ist', 'To neither of the two, because it is worded in the opposite direction'),
        P('Die Richtung der Formulierung entscheidet nicht über das Konstrukt. Inhaltlich geht es um Anteilnahme an anderen, also um Mitgefühl.', 'The direction of the wording does not decide the construct. In content it is about concern for others, that is, compassion.')),
      a(P('Zu Gereiztheit, weil Gleichgültigkeit eine negative Haltung ist', 'To irritability, because indifference is a negative attitude'),
        P('Gereiztheit heißt, schnell ärgerlich zu werden. Von Ärger ist in Frage 3 keine Rede, nur von fehlender Anteilnahme.', 'Irritability means getting annoyed quickly. Question 3 says nothing about anger, only about a lack of concern.'))
    ],
    hilfe: HILFE_IN, belege: ['wissen:inhaltsvaliditaet-urteil', 'Hilfe:konstrukt']
  },
  {
    id: 'pm-in-beide', thema: T, fall: IN,
    stamm: P('Frage 4 lautet „Wenn jemand über seine Sorgen klagt, werde ich schnell ungeduldig.“ Wie ist sie nach dem Inhalt einzuordnen?', 'Question 4 reads "When someone complains about their worries, I quickly grow impatient." How should it be classified by content?'),
    antworten: [
      a(P('Zu beiden: Sie verbindet wenig Mitgefühl mit schnellem Ärger', 'To both: it combines little compassion with quick annoyance'),
        P('Ungeduld zeigt Gereiztheit, und sie richtet sich gegen jemanden mit Sorgen, also gegen Mitgefühl. Die Frage ist darum inhaltlich keinem Konstrukt eindeutig zuzuordnen.', 'Impatience shows irritability, and it is aimed at someone with worries, so against compassion. The question therefore cannot be assigned clearly to one construct by content.'), true),
      a(P('Nur zu Mitgefühl, weil es um die Sorgen anderer geht', 'Only to compassion, because it is about the worries of others'),
        P('Es geht auch darum, wie schnell die Person ungeduldig wird. Das ist der Inhalt von Gereiztheit; die Frage spricht beide Konstrukte an.', 'It is also about how quickly the person grows impatient. That is the content of irritability; the question addresses both constructs.')),
      a(P('Zu keinem der beiden, weil sie zwei Dinge zugleich fragt', 'To neither of the two, because it asks two things at once'),
        P('Sie fragt nach einer einzigen Reaktion in einer Lage. Diese Reaktion berührt aber beide Konstrukte; „weder noch“ hieße, dass sie mit keinem zu tun hat.', 'It asks about one single reaction in one situation. That reaction, though, touches both constructs; "neither" would mean it has nothing to do with either.'))
    ],
    hilfe: HILFE_IN, belege: ['wissen:inhaltsvaliditaet-urteil', 'Hilfe:konstrukt', 'Hilfe:item']
  },
  {
    id: 'pm-in-weder', thema: T, fall: IN,
    stamm: P('Frage 5 („Ich lese gern Bücher über Geschichte.“) passt nach dem Wortlaut zu keinem der beiden Konstrukte. Was hält der Prüfschritt Inhalt für sie fest?', 'Question 5 ("I like reading books about history.") fits neither construct by its wording. What does the content step record for it?'),
    antworten: [
      a(P('Sie passt nach dem Inhalt zu keinem Konstrukt; entschieden wird im letzten Schritt', 'By content it fits no construct; the decision is made in the last step'),
        P('Ob eine Frage das Konstrukt trifft, ist ein inhaltliches Urteil, das keine Kennzahl ersetzt. Faktorenanalyse und Reliabilitätsanalyse prüfen unabhängig davon weiter. Ob die Frage in eine Skala kommt, entscheidet erst der Blick auf alle Schritte zusammen.', 'Whether a question hits the construct is a judgement about content that no statistic replaces. Factor analysis and reliability analysis check independently of it. Whether the question goes into a scale is decided only by looking at all steps together.'), true),
      a(P('Sie kommt in die kürzere der beiden Skalen, damit beide gleich lang sind', 'It goes into the shorter of the two scales so that both are the same length'),
        P('Die Länge einer Skala ist kein Grund, eine fremde Frage aufzunehmen. Sie würde etwas anderes in den Gesamtwert tragen.', 'The length of a scale is no reason to add an unrelated question. It would carry something else into the total score.')),
      a(P('Sie wird erst nach der Faktorenanalyse eingeordnet, denn die Zahlen entscheiden', 'It is classified only after the factor analysis, because the numbers decide'),
        P('Der Inhalt ist ein eigener Prüfschritt. Zahlen zeigen, welche Fragen zusammenhängen, aber nicht, ob eine Frage das gemeinte Konstrukt trifft.', 'Content is a checking step of its own. Numbers show which questions are related, but not whether a question hits the intended construct.'))
    ],
    hilfe: HILFE_IN, belege: ['wissen:inhaltsvaliditaet-urteil', 'wissen:itemselektion-nicht-mechanisch', 'Hilfe:konstrukt']
  },
  {
    id: 'pm-in-warum', thema: T, fall: IN,
    stamm: P('Warum wird der Inhalt als eigener Schritt geprüft, bevor gerechnet wird?', 'Why is content checked as a step of its own before anything is computed?'),
    antworten: [
      a(P('Ob eine Frage ihr Konstrukt trifft, ist ein Urteil, das keine Kennzahl ersetzt', 'Whether a question hits its construct is a judgement that no statistic replaces'),
        P('Inhaltsvalidität wird durch Urteil beurteilt, nicht durch eine Kennzahl. Faktorenanalyse und Alpha zeigen Zusammenhänge, nicht die Bedeutung der Fragen.', 'Content validity is assessed by judgement, not by a statistic. Factor analysis and alpha show relations, not the meaning of the questions.'), true),
      a(P('Ohne diese Prüfung lassen sich Ladungen und Alpha gar nicht berechnen', 'Without this check, loadings and alpha cannot be computed at all'),
        P('Rechnen lässt sich mit jeder Antwortspalte. Gerade darum braucht es das Urteil über den Inhalt: Die Rechnung prüft ihn nicht.', 'Any column of answers can be computed. That is exactly why the judgement about content is needed: the calculation does not check it.')),
      a(P('Eine inhaltlich passende Frage lädt danach sicher hoch auf ihrer Komponente', 'A question that fits in content will then load highly on its component for sure'),
        P('Auch eine passende Frage kann schwach laden, etwa weil sie schwer verständlich ist. Der Inhalt sagt voraus, was gemeint ist, nicht die Zahl.', 'Even a fitting question can load weakly, for example because it is hard to understand. Content tells what is meant, not what the number will be.'))
    ],
    hilfe: HILFE_IN, belege: ['wissen:inhaltsvaliditaet-urteil', 'wissen:itemselektion-nicht-mechanisch']
  },
  {
    id: 'pm-in-mehrfach', thema: T, fall: IN, mehrfach: true,
    stamm: P('Es geht um die Prüfung des Inhalts. Welche Aussagen stimmen? Mehrere können stimmen.', 'This is about checking the content. Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Frage 6 gehört zu Gereiztheit, obwohl sie ruhiges Verhalten beschreibt', 'Question 6 belongs to irritability, although it describes calm behaviour'),
        P('„Ruhig bleiben, wenn andere ärgern“ ist das Gegenteil von Gereiztheit: eine gegenläufig formulierte Frage zu diesem Konstrukt.', '"Staying calm when others annoy me" is the opposite of irritability: a question about this construct worded in the opposite direction.'), true),
      a(P('Eine Frage kann inhaltlich zu zwei Konstrukten zugleich passen', 'A question can fit two constructs at the same time in content'),
        P('Frage 4 zeigt das: Sie verbindet Ungeduld (Gereiztheit) mit fehlender Anteilnahme (Mitgefühl).', 'Question 4 shows this: it combines impatience (irritability) with a lack of concern (compassion).'), true),
      a(P('Eine gegenläufig formulierte Frage gehört zu keinem der Konstrukte', 'A question worded in the opposite direction belongs to none of the constructs'),
        P('Die Richtung der Formulierung ändert das Konstrukt nicht. Frage 3 gehört zu Mitgefühl, Frage 6 zu Gereiztheit, beide gegenläufig.', 'The direction of the wording does not change the construct. Question 3 belongs to compassion, question 6 to irritability, both in the opposite direction.')),
      a(P('Für die Prüfung des Inhalts braucht man die Ladungen der Faktorenanalyse', 'Checking the content requires the loadings of the factor analysis'),
        P('Der Inhalt wird am Wortlaut beurteilt, ohne Zahlen. Die Faktorenanalyse ist ein eigener, späterer Schritt.', 'Content is judged from the wording, without numbers. The factor analysis is a separate, later step.'))
    ],
    hilfe: HILFE_IN, belege: ['wissen:inhaltsvaliditaet-urteil', 'wissen:umpolen-verfahren', 'Hilfe:konstrukt']
  },

  // ---- Schritt 2: Faktorenanalyse (kein Umpolen) ----
  {
    id: 'pm-fa-grenze', thema: T, fall: FA,
    stamm: P(`Angenommen, eine Ladung zählt, wenn ihr Betrag mindestens ${zd('ps_grenze')} ist. Welche Items laden auf Komponente 1?`,
      `Assume a loading counts if its absolute size is at least ${ze('ps_grenze')}. Which items load on component 1?`),
    antworten: [
      a(P('A1, A2, A3, A5 und E2, die beiden mit Minus eingeschlossen', 'A1, A2, A3, A5 and E2, including the two with a minus'),
        P(`Für die Grenze zählt der Betrag. A1 (${zd('fa_a1_1')}) und E2 (${zd('fa_e2_1')}) erreichen sie mit ${za('fa_a1_1')} und ${za('fa_e2_1')} genauso wie die positiven Ladungen von A2, A3 und A5.`,
          `The absolute size counts for the limit. A1 (${ze('fa_a1_1')}) and E2 (${ze('fa_e2_1')}) reach it with ${zae('fa_a1_1')} and ${zae('fa_e2_1')} just like the positive loadings of A2, A3 and A5.`), true),
      a(P('Nur A2, A3 und A5, weil Ladungen mit Minus unter der Grenze liegen', 'Only A2, A3 and A5, because loadings with a minus lie below the limit'),
        P(`Das Minus zeigt nur die Richtung. A1 mit ${zd('fa_a1_1')} lädt so stark wie eine Frage mit ${za('fa_a1_1')} und liegt über der Grenze.`, `The minus only shows the direction. A1 with ${ze('fa_a1_1')} loads as strongly as a question with ${zae('fa_a1_1')} and lies above the limit.`)),
      a(P('A2, A3, A5 und C2, weil C2 auf Komponente 1 am höchsten lädt', 'A2, A3, A5 and C2, because C2 loads highest on component 1'),
        P(`Die höchste Ladung von C2 hat nur den Betrag ${za('fa_c2_max')} und liegt unter der Grenze; sie ist sogar ausgeblendet. Die höchste Ladung allein genügt für eine Zuordnung nicht.`,
          `The highest loading of C2 has an absolute size of only ${zae('fa_c2_max')} and lies below the limit; it is even hidden. The highest loading alone is not enough for an assignment.`))
    ],
    hilfe: HILFE_FA, karte: 'faktor', belege: ['wissen:fa-ladung-definition', 'wissen:fa-negative-ladung']
  },
  {
    id: 'pm-fa-negativ', thema: T, fall: FA,
    stamm: P(`A1 („Die Gefühle anderer lassen mich kalt“) lädt mit ${zd('fa_a1_1')} auf Komponente 1. Wie ist das zu lesen?`,
      `A1 ("Other people's feelings leave me cold") loads ${ze('fa_a1_1')} on component 1. How should this be read?`),
    antworten: [
      a(P('A1 gehört zu Komponente 1, gegenläufig zu A2, A3 und A5', 'A1 belongs to component 1, in the opposite direction to A2, A3 and A5'),
        P(`Der Betrag ${za('fa_a1_1')} zeigt die Stärke, das Minus die Richtung: Wer A1 zustimmt, stimmt A2, A3 und A5 eher wenig zu. Das passt zum Wortlaut, A1 ist gegenläufig formuliert.`,
          `The absolute size ${zae('fa_a1_1')} shows the strength, the minus the direction: whoever agrees with A1 tends to agree little with A2, A3 and A5. This fits the wording; A1 is worded in the opposite direction.`), true),
      a(P('A1 passt schlecht zu Komponente 1, weil die Ladung unter null liegt', 'A1 fits component 1 poorly, because the loading is below zero'),
        P('Unter null heißt nur: andere Richtung. Für die Stärke zählt der Betrag, und der liegt deutlich über der Grenze.', 'Below zero only means the other direction. The absolute size counts for the strength, and it lies clearly above the limit.')),
      a(P('A1 hätte vor der Faktorenanalyse umgepolt werden müssen; so ist sie falsch', 'A1 should have been reverse-coded before the factor analysis; as it is, it is wrong'),
        P('Für die Faktorenanalyse ist Umpolen nicht nötig. Umgepolt hätte A1 dieselbe Ladung mit positivem Vorzeichen; Beträge und Komponenten blieben gleich (mit diesen Daten in R nachgerechnet).', 'Reverse-coding is not needed for the factor analysis. Reverse-coded, A1 would have the same loading with a positive sign; absolute sizes and components would stay the same (recomputed in R with these data).'))
    ],
    hilfe: ['ladung', 'faktorenanalyse'], karte: 'faktor', belege: ['wissen:fa-negative-ladung', 'wissen:fa-ladung-definition', 'R: Ladungen mit und ohne Umpolen (scripts/ueben-erwartet-pruefschritte.R)']
  },
  {
    id: 'pm-fa-zuordnen', thema: T, fall: FA,
    stamm: P('Welche Zuordnung der Komponenten zu den geplanten Konstrukten passt zu den Ladungen und zum Wortlaut der Items?', 'Which assignment of the components to the planned constructs fits the loadings and the wording of the items?'),
    antworten: [
      a(P('Komponente 1 zu Mitgefühl, Komponente 2 zu Gereiztheit und Niedergeschlagenheit', 'Component 1 to compassion, component 2 to irritability and low mood'),
        P('Auf Komponente 1 laden A2, A3, A5 (Anteilnahme, Trösten, Wohlfühlen) und gegenläufig A1. Auf Komponente 2 laden N2, N3 und N4 (Gereiztheit, schwankende Stimmung, Niedergeschlagenheit). Den Namen liefert der Inhalt der Items.', 'A2, A3, A5 (concern, comforting, putting at ease) and, in the opposite direction, A1 load on component 1. N2, N3 and N4 (irritation, mood swings, low mood) load on component 2. The name comes from the content of the items.'), true),
      a(P('Komponente 1 zu Gereiztheit und Niedergeschlagenheit, Komponente 2 zu Mitgefühl', 'Component 1 to irritability and low mood, component 2 to compassion'),
        P('Die Reihenfolge der Komponenten sagt nichts über ihren Inhalt. Auf Komponente 2 laden N2, N3 und N4; deren Wortlaut handelt von Gereiztheit, schwankender Stimmung und Niedergeschlagenheit, nicht von Mitgefühl.', 'The order of the components says nothing about their content. N2, N3 and N4 load on component 2; their wording is about irritation, mood swings and low mood, not compassion.')),
      a(P('Komponente 1 zu Mitgefühl, Komponenten 2 und 3 zusammen zur zweiten Skala', 'Component 1 to compassion, components 2 and 3 together to the second scale'),
        P('Auf Komponente 3 laden O2 und O5 (schwierige Texte meiden, Themen ungern auf den Grund gehen). Mit Gereiztheit oder Niedergeschlagenheit hat ihr Wortlaut nichts zu tun.', 'O2 and O5 (avoiding difficult reading, disliking getting to the bottom of topics) load on component 3. Their wording has nothing to do with irritability or low mood.'))
    ],
    hilfe: HILFE_FA, karte: 'faktor', belege: ['wissen:fa-interpretation-subjektiv', 'wissen:fa-ladung-definition']
  },
  {
    id: 'pm-fa-doppel', thema: T, fall: FA,
    stamm: P(`Angenommen, jede Ladung mit einem Betrag ab ${zd('ps_grenze')} zählt. E2 („Es fällt mir schwer, auf andere zuzugehen“) hat ${zd('fa_e2_1')} auf Komponente 1 und ${zd('fa_e2_2')} auf Komponente 2. Was trifft zu?`,
      `Assume every loading with an absolute size of ${ze('ps_grenze')} or more counts. E2 ("I find it hard to approach others") has ${ze('fa_e2_1')} on component 1 and ${ze('fa_e2_2')} on component 2. What applies?`),
    antworten: [
      a(P('E2 lädt doppelt und lässt sich keiner Komponente eindeutig zuordnen', 'E2 has a double loading and cannot be assigned clearly to one component'),
        P(`Mit der gesetzten Regel zählen beide Ladungen (Beträge ${za('fa_e2_1')} und ${za('fa_e2_2')}). Eine Frage mit Doppelladung wird nicht einfach zugeschlagen, sondern inhaltlich geprüft.`,
          `With the rule set, both loadings count (absolute sizes ${zae('fa_e2_1')} and ${zae('fa_e2_2')}). A question with a double loading is not simply allocated but checked for content.`), true),
      a(P('E2 gehört zu Komponente 1, weil dort der größere Betrag steht', 'E2 belongs to component 1, because the larger absolute size is there'),
        P('Die gesetzte Regel lässt jede Ladung über der Grenze zählen, also auch die auf Komponente 2. Nur die größere Ladung zu nehmen, wäre eine andere Regel.', 'The rule set lets every loading above the limit count, so also the one on component 2. Taking only the larger loading would be a different rule.')),
      a(P('E2 gehört zu Komponente 2, weil nur dort die Ladung positiv ist', 'E2 belongs to component 2, because only there is the loading positive'),
        P('Das Vorzeichen entscheidet nicht über die Zuordnung, es zeigt die Richtung. Auch die Ladung mit Minus erreicht die Grenze.', 'The sign does not decide the assignment; it shows the direction. The loading with a minus reaches the limit too.'))
    ],
    hilfe: HILFE_FA, karte: 'faktor', belege: ['wissen:clark-ladungsgrenzen-itemauswahl', 'wissen:fa-negative-ladung', 'Clark und Watson 1995']
  },
  {
    id: 'pm-fa-ohne-konstrukt', thema: T, fall: FA,
    stamm: P('Auf Komponente 3 laden O2 („Ich meide schwierige Texte“) und O5 („Ich gehe einem Thema ungern auf den Grund“). Was folgt daraus nach der Faktorenanalyse?', 'O2 ("I avoid difficult reading") and O5 ("I dislike getting to the bottom of a topic") load on component 3. What follows from the factor analysis?'),
    antworten: [
      a(P('Komponente 3 passt zu keinem geplanten Konstrukt, O2 und O5 also auch nicht', 'Component 3 fits no planned construct, so neither do O2 and O5'),
        P('Die beiden Items laden hoch auf dieselbe Komponente, messen nach ihrem Wortlaut aber etwas Drittes (Freude an geistiger Anstrengung). Eine Komponente bekommt ihren Namen aus dem Inhalt, und hier passt keiner der zwei geplanten.', 'The two items load highly on the same component but, by their wording, measure something third (enjoying mental effort). A component gets its name from the content, and none of the two planned ones fits here.'), true),
      a(P('O2 und O5 kommen in die Skala Mitgefühl, weil jede Komponente dazugehören muss', 'O2 and O5 go into the compassion scale, because every component has to belong'),
        P('Eine Komponente muss keinem der geplanten Konstrukte entsprechen. Fremde Items würden den Skalenwert für Mitgefühl verwässern.', 'A component does not have to match one of the planned constructs. Unrelated items would dilute the scale score for compassion.')),
      a(P('Komponente 3 ist ein Rechenfehler, denn geplant waren nur zwei Konstrukte', 'Component 3 is a calculation error, because only two constructs were planned'),
        P('Die Rechnung zeigt, welche Items zusammenhängen, auch wenn das nicht geplant war. Das ist ein Befund, kein Fehler.', 'The calculation shows which items are related, even if that was not planned. That is a finding, not an error.'))
    ],
    hilfe: HILFE_FA, karte: 'faktor', belege: ['wissen:fa-interpretation-subjektiv', 'wissen:itemselektion-nicht-mechanisch']
  },
  {
    id: 'pm-fa-ohne-ladung', thema: T, fall: FA,
    stamm: P('In der Zeile von C2 („Ich bleibe dran, bis alles perfekt ist“) stehen keine Ladungen. Was folgt daraus?', 'The row of C2 ("I keep going until everything is perfect") shows no loadings. What follows from this?'),
    antworten: [
      a(P('C2 hängt mit keiner der drei Komponenten genug zusammen und gehört zu keiner', 'C2 is related to none of the three components enough and belongs to none'),
        P(`Ausgeblendet sind Ladungen mit einem Betrag unter ${zd('ps_anzeige')}; die höchste von C2 hat ${za('fa_c2_max')}. Die Komponenten erklären die Frage kaum, eine Zuordnung gibt es nicht.`,
          `Loadings with an absolute size below ${ze('ps_anzeige')} are hidden; the highest one of C2 is ${zae('fa_c2_max')}. The components hardly explain the question; there is no assignment.`), true),
      a(P('C2 gehört zur Komponente mit der höchsten ausgeblendeten Ladung', 'C2 belongs to the component with the highest hidden loading'),
        P('Eine Frage wird nicht der nächstliegenden Komponente zugeschlagen, nur weil sie sonst nirgends hingehört. Die Zuordnung braucht eine Ladung über der Grenze.', 'A question is not added to the nearest component just because it belongs nowhere else. Assignment needs a loading above the limit.')),
      a(P('C2 wurde fehlerhaft erhoben und ist darum aus den Daten zu löschen', 'C2 was collected wrongly and must therefore be deleted from the data'),
        P('Eine fehlende Ladung ist ein Befund über den Zusammenhang, kein Beweis für einen Fehler bei der Erhebung.', 'A missing loading is a finding about the relationship, not proof of an error in collection.'))
    ],
    hilfe: HILFE_FA, karte: 'faktor', belege: ['wissen:fabrigar-niedrige-kommunalitaet-verzerrt', 'wissen:itemselektion-nicht-mechanisch', 'Fabrigar u. a. 1999']
  },
  {
    id: 'pm-fa-mehrfach', thema: T, fall: FA, mehrfach: true,
    stamm: P(`Angenommen, eine Ladung zählt ab dem Betrag ${zd('ps_grenze')}. Es geht um diese Faktorenanalyse. Welche Aussagen stimmen? Mehrere können stimmen.`, `Assume a loading counts from an absolute size of ${ze('ps_grenze')}. This is about this factor analysis. Which statements are correct? Several may be correct.`),
    antworten: [
      a(P('Eine Ladung mit Minus zählt mit ihrem Betrag genauso wie eine positive', 'A loading with a minus counts with its absolute size just like a positive one'),
        P('Das Vorzeichen zeigt die Richtung, der Betrag die Stärke.', 'The sign shows the direction, the absolute size the strength.'), true),
      a(P('E2 erreicht auf zwei Komponenten die Grenze', 'E2 reaches the limit on two components'),
        P(`E2 hat ${zd('fa_e2_1')} auf Komponente 1 und ${zd('fa_e2_2')} auf Komponente 2: eine Doppelladung.`, `E2 has ${ze('fa_e2_1')} on component 1 and ${ze('fa_e2_2')} on component 2: a double loading.`), true),
      a(P('Vor dieser Rechnung müssen A1 und E2 umgepolt werden', 'Before this calculation, A1 and E2 have to be reverse-coded'),
        P('Für die Faktorenanalyse ist Umpolen nicht nötig: Es dreht nur das Vorzeichen der Ladungen dieser Items, die Beträge bleiben gleich.', 'Reverse-coding is not needed for the factor analysis: it only flips the sign of these items\' loadings; the absolute sizes stay the same.')),
      a(P('Jede der drei Komponenten entspricht einem der geplanten Konstrukte', 'Each of the three components matches one of the planned constructs'),
        P('Komponente 3 (O2, O5) passt zu keinem der zwei geplanten Konstrukte.', 'Component 3 (O2, O5) fits none of the two planned constructs.'))
    ],
    hilfe: HILFE_FA, karte: 'faktor', belege: ['wissen:fa-negative-ladung', 'wissen:clark-ladungsgrenzen-itemauswahl', 'wissen:fa-interpretation-subjektiv', 'R: Ladungen mit und ohne Umpolen (scripts/ueben-erwartet-pruefschritte.R)']
  },

  // ---- Schritt 3: Reliabilitätsanalyse (Umpolen erst hier) ----
  {
    id: 'pm-rel-vorbereiten', thema: T, fall: REL,
    stamm: P('Für die Skala Mitgefühl (A1, A2, A3, A5) sollen Cronbachs Alpha und danach der Skalenwert (Mittelwert der Items) berechnet werden. Was ist vorher zu tun?', 'Cronbach\'s alpha and then the scale score (mean of the items) are to be computed for the compassion scale (A1, A2, A3, A5). What has to be done beforehand?'),
    antworten: [
      a(P('A1 umpolen (7 minus Wert), weil Zustimmung dort wenig Mitgefühl heißt', 'Reverse-code A1 (7 minus value), because agreement there means little compassion'),
        P('Alpha setzt voraus, dass alle Items in dieselbe Richtung zählen. Die Antworten gehen von 1 bis 6, darum 7 minus Wert. Ohne Umpolen kann Alpha stark sinken oder sogar negativ werden.', 'Alpha assumes that all items count in the same direction. The answers run from 1 to 6, hence 7 minus value. Without reverse-coding, alpha can drop sharply or even become negative.'), true),
      a(P('A1 streichen, weil gegenläufig formulierte Items in einer Skala stören', 'Delete A1, because items worded in the opposite direction disturb a scale'),
        P('Gegenläufige Items gehören zur Skala; sie werden umgepolt, nicht gestrichen.', 'Opposite items belong to the scale; they are reverse-coded, not deleted.')),
      a(P('A1 mit 6 minus Wert umpolen, damit die Antworten von 0 bis 5 gehen', 'Reverse-code A1 with 6 minus value so that the answers run from 0 to 5'),
        P('Umgepolt wird mit „kleinster plus größter Wert minus Wert“, hier 7 minus Wert. Alpha bliebe mit 6 minus Wert zwar gleich, denn eine Verschiebung ändert Alpha nicht; aber aus 1 würde 5 statt 6, und der Skalenwert läge zu tief.', 'Reverse-coding uses "smallest plus largest value minus value", here 7 minus value. Alpha would stay the same with 6 minus value, since a shift does not change alpha; but 1 would become 5 instead of 6, and the scale score would be too low.'))
    ],
    hilfe: HILFE_REL, karte: 'skala', belege: ['wissen:umpolen-verfahren', 'wissen:alpha-negativ-moeglich', 'Hilfe:umpolen']
  },
  {
    id: 'pm-rel-roh', thema: T, fall: REL,
    stamm: P(`Die erste Tabelle zeigt Mitgefühl mit A1, wie erhoben: Alpha ${zd('rel_m_roh', 3)}. Ohne A3 wäre Alpha ${zd('rel_roh_a3', 3)}, ohne A1 ${zd('rel_roh_a1', 3)}. Wie ist das zu lesen?`,
      `The first table shows compassion with A1 as collected: alpha ${ze('rel_m_roh', 3)}. Without A3 alpha would be ${ze('rel_roh_a3', 3)}, without A1 ${ze('rel_roh_a1', 3)}. How should this be read?`),
    antworten: [
      a(P('A1 läuft gegen die anderen Items; das niedrige Alpha zeigt die fehlende Umpolung', 'A1 runs against the other items; the low alpha shows the missing reverse-coding'),
        P(`A1 ist gegenläufig formuliert und noch nicht umgepolt. Das drückt Alpha auf ${zd('rel_m_roh', 3)}; ohne A3 würde es sogar negativ. Nach dem Umpolen liegt Alpha bei ${zd('rel_m_um', 3)}.`,
          `A1 is worded in the opposite direction and not yet reverse-coded. That pushes alpha down to ${ze('rel_m_roh', 3)}; without A3 it would even become negative. After reverse-coding, alpha is ${ze('rel_m_um', 3)}.`), true),
      a(P(`A1 streichen, denn ohne A1 steigt Alpha auf ${zd('rel_roh_a1', 3)}`, `Delete A1, because without A1 alpha rises to ${ze('rel_roh_a1', 3)}`),
        P('Der Anstieg kommt von der vergessenen Umpolung, nicht von einem schlechten Item. A1 passt inhaltlich zu Mitgefühl; erst wird umgepolt, dann neu gerechnet.', 'The rise comes from the forgotten reverse-coding, not from a poor item. A1 fits compassion in content; first it is reverse-coded, then recomputed.')),
      a(P('Die vier Items messen nichts Gemeinsames, ein negatives Alpha beweist das', 'The four items measure nothing in common; a negative alpha proves it'),
        P('Ein negatives Alpha ohne ein Item zeigt meist eine falsche Richtung, nicht das Fehlen eines gemeinsamen Merkmals. Mit A1 umgepolt steigt Alpha deutlich.', 'A negative alpha without one item usually shows a wrong direction, not the absence of a common attribute. With A1 reverse-coded, alpha rises clearly.'))
    ],
    hilfe: HILFE_REL, karte: 'skala', belege: ['wissen:alpha-negativ-moeglich', 'wissen:negative-trennschaerfe-ursache', 'wissen:umpolen-verfahren']
  },
  {
    id: 'pm-rel-ohne', thema: T, fall: REL,
    stamm: P(`In der zweiten Tabelle (A1 umgepolt) steht in der Zeile A1 der Wert ${zd('rel_um_a1', 3)}. Was bedeutet diese Zahl?`,
      `In the second table (A1 reverse-coded) the row A1 shows the value ${ze('rel_um_a1', 3)}. What does this number mean?`),
    antworten: [
      a(P('Das Alpha der Skala aus A2, A3 und A5, also ohne A1', 'The alpha of the scale made of A2, A3 and A5, that is, without A1'),
        P(`„Alpha, wenn Item gelöscht“ ist das Alpha der übrigen Items. Ohne A1 läge es bei ${zd('rel_um_a1', 3)}, mit allen vier bei ${zd('rel_m_um', 3)}.`,
          `"Alpha if item deleted" is the alpha of the remaining items. Without A1 it would be ${ze('rel_um_a1', 3)}, with all four ${ze('rel_m_um', 3)}.`), true),
      a(P('Die Reliabilität von A1 allein, gemessen an den anderen Items', 'The reliability of A1 on its own, measured against the other items'),
        P('Für ein einzelnes Item lässt sich so kein Alpha bilden. Die Zahl gilt für die Skala, aus der A1 herausgenommen wurde.', 'No alpha can be formed like this for a single item. The number refers to the scale from which A1 has been removed.')),
      a(P('Um so viel steigt Alpha, wenn A1 aus der Skala genommen wird', 'This is how much alpha rises when A1 is taken out of the scale'),
        P(`Die Zahl ist ein Alpha, keine Änderung. Den Anstieg sieht man erst im Vergleich mit dem Alpha aller vier Items (${zd('rel_m_um', 3)}).`, `The number is an alpha, not a change. The rise only shows in comparison with the alpha of all four items (${ze('rel_m_um', 3)}).`))
    ],
    hilfe: HILFE_REL, karte: 'skala', belege: ['wissen:alpha-if-deleted-definition']
  },
  {
    id: 'pm-rel-grenze', thema: T, fall: REL,
    stamm: P(`Angenommen, ein Alpha ab ${zd('rel_grenze')} gilt als ausreichend. Was trifft nach dem Umpolen auf die Skala Mitgefühl zu?`,
      `Assume an alpha of ${ze('rel_grenze')} or more counts as sufficient. What applies to the compassion scale after reverse-coding?`),
    antworten: [
      a(P(`Mit ${zd('rel_m_um', 3)} liegt Alpha knapp unter der gesetzten Grenze`, `At ${ze('rel_m_um', 3)}, alpha lies just below the limit set`),
        P(`Das Umpolen hebt Alpha von ${zd('rel_m_roh', 3)} auf ${zd('rel_m_um', 3)}. Die Grenze von ${zd('rel_grenze')} erreicht die Skala damit knapp nicht.`, `Reverse-coding lifts alpha from ${ze('rel_m_roh', 3)} to ${ze('rel_m_um', 3)}. The scale thus just misses the limit of ${ze('rel_grenze')}.`), true),
      a(P('Alpha ist ausreichend, weil es auf eine Stelle gerundet 0,7 ergibt', 'Alpha is sufficient, because rounded to one decimal it gives 0.7'),
        P(`Die gesetzte Grenze gilt für den Wert, nicht für eine gerundete Fassung: ${zd('rel_m_um', 3)} liegt unter ${zd('rel_grenze')}.`, `The limit set applies to the value, not to a rounded version: ${ze('rel_m_um', 3)} lies below ${ze('rel_grenze')}.`)),
      a(P('Alpha ist unverändert, denn Umpolen ändert nur die Richtung, die Stärke bleibt', 'Alpha is unchanged, since reverse-coding only changes the direction and the strength stays'),
        P(`Für Alpha zählt die Richtung: Mit A1, wie erhoben, ist Alpha ${zd('rel_m_roh', 3)}, umgepolt ${zd('rel_m_um', 3)}. Nur in der Faktorenanalyse bleibt der Betrag beim Umpolen gleich.`, `For alpha the direction matters: with A1 as collected, alpha is ${ze('rel_m_roh', 3)}, reverse-coded ${ze('rel_m_um', 3)}. Only in the factor analysis does the absolute size stay the same when reverse-coding.`))
    ],
    hilfe: HILFE_REL, karte: 'skala', belege: ['wissen:reliabilitaet-mindestens-70', 'wissen:reliabilitaetsgrenze-zweckabhaengig', 'wissen:umpolen-verfahren']
  },
  {
    id: 'pm-rel-gereizt', thema: T, fall: REL,
    stamm: P(`Angenommen, ein Alpha ab ${zd('rel_grenze')} gilt als ausreichend. Die dritte Tabelle zeigt Gereiztheit und Niedergeschlagenheit (Alpha ${zd('rel_n', 3)}). Was trifft zu?`,
      `Assume an alpha of ${ze('rel_grenze')} or more counts as sufficient. The third table shows irritability and low mood (alpha ${ze('rel_n', 3)}). What applies?`),
    antworten: [
      a(P('Die Skala erreicht die Grenze, und ohne jedes ihrer Items sänke Alpha', 'The scale reaches the limit, and without any of its items alpha would drop'),
        P(`${zd('rel_n', 3)} liegt über ${zd('rel_grenze')}. In jeder Zeile steht das Alpha der übrigen zwei Items: ${zd('rel_n_n2', 3)}, ${zd('rel_n_n3', 3)} und ${zd('rel_n_n4', 3)}, alle kleiner als ${zd('rel_n', 3)}. Jedes Item trägt zur Skala bei.`, `${ze('rel_n', 3)} lies above ${ze('rel_grenze')}. Each row shows the alpha of the other two items: ${ze('rel_n_n2', 3)}, ${ze('rel_n_n3', 3)} and ${ze('rel_n_n4', 3)}, all smaller than ${ze('rel_n', 3)}. Each item contributes to the scale.`), true),
      a(P(`N4 kann weg, weil Alpha ohne N4 mit ${zd('rel_n_n4', 3)} noch über der Grenze liegt`, `N4 can go, because without N4 alpha would still be above the limit at ${ze('rel_n_n4', 3)}`),
        P(`Ohne N4 sänke Alpha von ${zd('rel_n', 3)} auf ${zd('rel_n_n4', 3)}; N4 trägt also bei. Dass die Grenze auch ohne N4 erreicht wäre, ist kein Grund, ein Item zu streichen.`, `Without N4 alpha would drop from ${ze('rel_n', 3)} to ${ze('rel_n_n4', 3)}; so N4 contributes. That the limit would be reached without N4 too is no reason to delete an item.`)),
      a(P(`N3 ist das schwächste Item, denn ohne N3 ist Alpha mit ${zd('rel_n_n3', 3)} am kleinsten`, `N3 is the weakest item, since without N3 alpha is smallest at ${ze('rel_n_n3', 3)}`),
        P('Umgekehrt: Sinkt Alpha ohne ein Item stark, trägt dieses Item viel zur Skala bei. Ohne N3 bliebe das kleinste Alpha übrig.', 'The other way round: if alpha drops sharply without an item, that item contributes a lot to the scale. Without N3 the smallest alpha would be left.'))
    ],
    hilfe: HILFE_REL, karte: 'skala', belege: ['wissen:alpha-if-deleted-definition', 'wissen:reliabilitaet-mindestens-70']
  },
  {
    id: 'pm-rel-mehrfach', thema: T, fall: REL, mehrfach: true,
    stamm: P('Es geht um die Reliabilitätsanalyse. Welche Aussagen stimmen? Mehrere können stimmen.', 'This is about the reliability analysis. Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Umpolen ist für Alpha und den Summenwert nötig, für die Faktorenanalyse nicht', 'Reverse-coding is needed for alpha and the sum score, but not for the factor analysis'),
        P('Alpha und Summe brauchen dieselbe Richtung aller Items. In der Faktorenanalyse dreht Umpolen nur das Vorzeichen einer Ladung.', 'Alpha and the sum need the same direction for all items. In the factor analysis, reverse-coding only flips the sign of a loading.'), true),
      a(P('Welche Grenze für Alpha gilt, hängt vom Zweck der Messung ab', 'Which limit applies to alpha depends on the purpose of the measurement'),
        P('Die nötige Reliabilität hängt vom Zweck ab; eine Grenze wie 0,70 ist eine Festlegung, kein Naturgesetz.', 'The reliability needed depends on the purpose; a limit such as 0.70 is a convention, not a law of nature.'), true),
      a(P('Ist Alpha ohne ein Item höher, ist das allein ein sicherer Grund zum Löschen', 'If alpha without an item is higher, that alone is a sure reason to delete it'),
        P('„Alpha, wenn Item gelöscht“ ist ein Stichprobenwert und ersetzt die inhaltliche Prüfung nicht.', '"Alpha if item deleted" is a sample value and does not replace the check of content.')),
      a(P('Ein hohes Alpha zeigt, dass die Items genau ein Merkmal messen', 'A high alpha shows that the items measure exactly one attribute'),
        P('Alpha beweist keine Eindimensionalität; das prüft die Faktorenanalyse.', 'Alpha does not prove unidimensionality; the factor analysis checks that.'))
    ],
    hilfe: HILFE_REL, karte: 'skala', belege: ['wissen:umpolen-verfahren', 'wissen:fa-negative-ladung', 'wissen:reliabilitaetsgrenze-zweckabhaengig', 'wissen:alpha-if-deleted-unzuverlaessig', 'wissen:alpha-nicht-eindimensionalitaet']
  },

  // ---- Schritt 4: alles zusammen ----
  {
    id: 'pm-ges-a1', thema: T, fall: GES,
    stamm: P(`${REGEL_DE} Was geschieht mit A1?`, `${REGEL_EN} What happens to A1?`),
    antworten: [
      a(P('A1 bleibt in der Skala Mitgefühl und wird umgepolt', 'A1 stays in the compassion scale and is reverse-coded'),
        P(`Der Inhalt passt (gegenläufig zu Mitgefühl), die Ladung ist eindeutig (Betrag ${za('fa_a1_1')}, nur auf Komponente 1). Nur Alpha spricht dagegen: ohne A1 ${zd('rel_um_a1', 3)}, mit A1 ${zd('rel_m_um', 3)}. Ein Prüfschritt dagegen reicht nach der Regel nicht.`,
          `The content fits (opposite to compassion), the loading is clear (absolute size ${zae('fa_a1_1')}, only on component 1). Only alpha speaks against it: without A1 ${ze('rel_um_a1', 3)}, with A1 ${ze('rel_m_um', 3)}. By the rule, one step against it is not enough.`), true),
      a(P(`A1 wird entfernt, denn ohne A1 steigt Alpha auf ${zd('rel_um_a1', 3)}`, `A1 is removed, because without A1 alpha rises to ${ze('rel_um_a1', 3)}`),
        P('Nach der gesetzten Regel braucht das Entfernen zwei Prüfschritte dagegen. Inhalt und Ladung sprechen für A1, nur Alpha dagegen.', 'By the rule set, removal needs two steps against it. Content and loading speak for A1; only alpha speaks against it.')),
      a(P('A1 bleibt so, wie erhoben, denn ihre Ladung zeigt, dass sie dazugehört', 'A1 stays as collected, since its loading shows that it belongs'),
        P(`Dazugehören heißt hier gegenläufig dazugehören. Für Alpha und den Skalenwert wird A1 umgepolt; ohne Umpolen wäre Alpha ${zd('rel_m_roh', 3)}.`, `Belonging here means belonging in the opposite direction. For alpha and the scale score, A1 is reverse-coded; without it alpha would be ${ze('rel_m_roh', 3)}.`))
    ],
    hilfe: HILFE_GES, karte: 'skala', belege: ['wissen:itemselektion-nicht-mechanisch', 'wissen:alpha-if-deleted-unzuverlaessig', 'wissen:umpolen-verfahren', 'wissen:fa-negative-ladung']
  },
  {
    id: 'pm-ges-e2', thema: T, fall: GES,
    stamm: P(`${REGEL_DE} Was geschieht mit E2?`, `${REGEL_EN} What happens to E2?`),
    antworten: [
      a(P('E2 wird entfernt; sie kommt in keine der beiden Skalen', 'E2 is removed; it goes into neither of the two scales'),
        P(`Alle drei Schritte sprechen dagegen: Der Wortlaut handelt vom Zugehen auf andere (Geselligkeit), E2 lädt doppelt (${zd('fa_e2_1')} und ${zd('fa_e2_2')}), und mit E2 sänke Alpha für Mitgefühl von ${zd('rel_m_um', 3)} auf ${zd('ges_m5', 3)}.`,
          `All three steps speak against it: the wording is about approaching others (sociability), E2 has a double loading (${ze('fa_e2_1')} and ${ze('fa_e2_2')}), and with E2 alpha for compassion would fall from ${ze('rel_m_um', 3)} to ${ze('ges_m5', 3)}.`), true),
      a(P(`E2 kommt umgepolt zu Mitgefühl, weil ihr Betrag auf Komponente 1 ${za('fa_e2_1')} ist`, `E2 goes reverse-coded into compassion, because its absolute size on component 1 is ${zae('fa_e2_1')}`),
        P(`Eine eindeutige Ladung hat E2 nicht, sie erreicht die Grenze auch auf Komponente 2. Dazu sänke Alpha mit E2 auf ${zd('ges_m5', 3)}, und der Inhalt passt nicht.`, `E2 has no clear loading; it reaches the limit on component 2 as well. Besides, alpha would fall to ${ze('ges_m5', 3)} with E2, and the content does not fit.`)),
      a(P('E2 kommt in beide Skalen, damit beide Ladungen berücksichtigt sind', 'E2 goes into both scales so that both loadings are taken into account'),
        P('Eine Frage in zwei Skalen macht diese künstlich ähnlich. Eine Doppelladung ist ein Grund zur Prüfung, kein Grund für zwei Plätze.', 'A question in two scales makes them artificially similar. A double loading is a reason to check, not a reason for two places.'))
    ],
    hilfe: HILFE_GES, karte: 'skala', belege: ['wissen:clark-ladungsgrenzen-itemauswahl', 'wissen:itemselektion-nicht-mechanisch', 'wissen:inhaltsvaliditaet-urteil']
  },
  {
    id: 'pm-ges-c2', thema: T, fall: GES,
    stamm: P(`${REGEL_DE} Was geschieht mit C2?`, `${REGEL_EN} What happens to C2?`),
    antworten: [
      a(P('C2 wird entfernt; sie passt inhaltlich nicht und hat keine Ladung', 'C2 is removed; it does not fit in content and has no loading'),
        P(`Dranbleiben, bis alles perfekt ist, handelt von Sorgfalt, nicht von Mitgefühl oder Gereiztheit. Ihre höchste Ladung hat den Betrag ${za('fa_c2_max')}, unter der Grenze, und mit C2 sänke Alpha für Mitgefühl auf ${zd('ges_mc', 3)}. Alle drei Schritte sprechen dagegen; zwei hätten genügt.`,
          `Keeping going until everything is perfect is about diligence, not compassion or irritability. Its highest loading has an absolute size of ${zae('fa_c2_max')}, below the limit, and with C2 alpha for compassion would fall to ${ze('ges_mc', 3)}. All three steps speak against it; two would have been enough.`), true),
      a(P(`C2 kommt zu Mitgefühl, weil ihre höchste Ladung (${zd('fa_c2_1')}) auf Komponente 1 liegt`, `C2 goes into compassion, because its highest loading (${ze('fa_c2_1')}) is on component 1`),
        P(`Die Ladung liegt unter der Grenze von ${zd('ps_grenze')} und zählt nicht. Auch der Inhalt passt nicht zu Mitgefühl.`, `The loading lies below the limit of ${ze('ps_grenze')} and does not count. The content does not fit compassion either.`)),
      a(P('C2 bleibt vorerst, bis eine größere Stichprobe vorliegt', 'C2 stays for now until a larger sample is available'),
        P(`Die Regel entscheidet mit den vorhandenen Prüfschritten, und alle drei sprechen gegen C2. Die Stichprobe ist mit ${zn('ps_n')} Personen groß.`, `The rule decides with the checking steps at hand, and all three speak against C2. With ${zn('ps_n')} people the sample is large.`))
    ],
    hilfe: HILFE_GES, karte: 'skala', belege: ['wissen:itemselektion-nicht-mechanisch', 'wissen:inhaltsvaliditaet-urteil', 'wissen:fabrigar-niedrige-kommunalitaet-verzerrt']
  },
  {
    id: 'pm-ges-n4', thema: T, fall: GES,
    stamm: P(`${REGEL_DE} Was geschieht mit N4 („Ich bin oft niedergeschlagen“)?`, `${REGEL_EN} What happens to N4 ("I often feel down")?`),
    antworten: [
      a(P('N4 bleibt in der Skala Gereiztheit und Niedergeschlagenheit, wie erhoben', 'N4 stays in the irritability and low mood scale, as collected'),
        P(`Kein Prüfschritt spricht dagegen: Der Inhalt passt (Niedergeschlagenheit), die Ladung ist eindeutig (${zd('fa_n4_2')} nur auf Komponente 2), und ohne N4 sänke Alpha von ${zd('rel_n', 3)} auf ${zd('rel_n_n4', 3)}. N4 ist gleichgerichtet und wird nicht umgepolt.`,
          `No checking step speaks against it: the content fits (low mood), the loading is clear (${ze('fa_n4_2')} only on component 2), and without N4 alpha would drop from ${ze('rel_n', 3)} to ${ze('rel_n_n4', 3)}. N4 points the same way and is not reverse-coded.`), true),
      a(P(`N4 wird entfernt, denn ohne N4 sinkt Alpha am wenigsten, nur auf ${zd('rel_n_n4', 3)}`, `N4 is removed, because without N4 alpha drops least, only to ${ze('rel_n_n4', 3)}`),
        P('Auch ein kleiner Rückgang heißt: Das Item trägt bei. Nach der gesetzten Regel braucht das Entfernen zwei Prüfschritte dagegen; hier ist es keiner.', 'Even a small drop means the item contributes. By the rule set, removal needs two steps against it; here there is none.')),
      a(P('N4 bleibt, wird aber umgepolt, weil es die schwächste Ladung hat', 'N4 stays but is reverse-coded, because it has the weakest loading'),
        P(`Umgepolt werden nur gegenläufige Items. N4 lädt positiv (${zd('fa_n4_2')}) wie N2 und N3; umgepolt liefe N4 gegen die anderen, und Alpha fiele.`, `Only opposite items are reverse-coded. N4 loads positively (${ze('fa_n4_2')}) like N2 and N3; reverse-coded, N4 would run against the others and alpha would fall.`))
    ],
    hilfe: HILFE_GES, karte: 'skala', belege: ['wissen:itemselektion-nicht-mechanisch', 'wissen:alpha-if-deleted-unzuverlaessig', 'wissen:alpha-inflation-trimmen']
  },
  {
    id: 'pm-ges-wert', thema: T, fall: GES,
    tabelle: tab('pm-ges-wert', [P('Person', 'Person'), P('A1', 'A1'), P('A2', 'A2'), P('A3', 'A3'), P('A5', 'A5')], QUELLE_P,
      P('Antworten von drei Personen auf die Items der Skala Mitgefühl (wie erhoben)', 'Answers of three people to the items of the compassion scale (as collected)')),
    stamm: P('Die Skala Mitgefühl behält A1 (umgepolt, 7 minus Wert), A2, A3 und A5. Jede Person bekommt als Skalenwert den Mittelwert dieser vier Antworten, einen einfachen Ersatz für den Faktorwert. Wie groß ist er für Person 2?',
      'The compassion scale keeps A1 (reverse-coded, 7 minus value), A2, A3 and A5. Each person gets the mean of these four answers as the scale score, a simple substitute for the factor score. How large is it for person 2?'),
    antworten: [
      a(P(`${zd('sw_p2_mw')} Punkte auf der Antwortskala von 1 bis 6`, `${ze('sw_p2_mw')} points on the answer scale from 1 to 6`),
        P(`A1 ist ${zn('sw_p2_a1')}, umgepolt ${zn('sw_p2_a1r')}. Die Summe ${zn('sw_p2_a1r')} + 4 + 5 + 5 = ${zn('sw_p2_sum')}, geteilt durch vier Items, ergibt ${zd('sw_p2_mw')}. Der Mittelwert bleibt auf der Antwortskala von 1 bis 6.`,
          `A1 is ${zn('sw_p2_a1')}, reverse-coded ${zn('sw_p2_a1r')}. The sum ${zn('sw_p2_a1r')} + 4 + 5 + 5 = ${zn('sw_p2_sum')}, divided by four items, gives ${ze('sw_p2_mw')}. The mean stays on the answer scale from 1 to 6.`), true),
      a(P(`${zd('sw_p2_falsch')} Punkte auf der Antwortskala von 1 bis 6`, `${ze('sw_p2_falsch')} points on the answer scale from 1 to 6`),
        P(`Das ist der Mittelwert mit A1, wie erhoben (${zn('sw_p2_a1')}). A1 ist gegenläufig und zählt umgepolt als ${zn('sw_p2_a1r')}.`, `That is the mean with A1 as collected (${zn('sw_p2_a1')}). A1 is opposite and counts reverse-coded as ${zn('sw_p2_a1r')}.`)),
      a(P(`${zd('sw_p2_sechs')} Punkte auf der Antwortskala von 1 bis 6`, `${ze('sw_p2_sechs')} points on the answer scale from 1 to 6`),
        P('Hier wurde A1 mit 6 minus Wert umgepolt. Bei Antworten von 1 bis 6 gilt 7 minus Wert.', 'Here A1 was reverse-coded with 6 minus value. With answers from 1 to 6, 7 minus value applies.'))
    ],
    hilfe: ['skalenwert', 'umpolen', 'faktorwert'], karte: 'skala', belege: ['wissen:testtheorie-testwert-summe', 'wissen:umpolen-verfahren', 'Hilfe:skalenwert']
  },
  {
    id: 'pm-ges-mehrfach', thema: T, fall: GES, mehrfach: true,
    stamm: P(`Angenommen, eine Frage wird entfernt, wenn mindestens zwei der drei Prüfschritte gegen sie sprechen. Es geht um das Ergebnis aller drei Schritte. Welche Aussagen stimmen? Mehrere können stimmen.`,
      `Assume a question is removed if at least two of the three checking steps speak against it. This is about the result of all three steps. Which statements are correct? Several may be correct.`),
    antworten: [
      a(P('Mitgefühl besteht am Ende aus A1 (umgepolt), A2, A3 und A5', 'In the end, compassion consists of A1 (reverse-coded), A2, A3 and A5'),
        P('A1 bleibt (nur Alpha dagegen), E2 und C2 gehen.', 'A1 stays (only alpha against it); E2 and C2 go.'), true),
      a(P('Gereiztheit und Niedergeschlagenheit behält N2, N3 und N4', 'Irritability and low mood keeps N2, N3 and N4'),
        P('Bei N2, N3 und N4 passen Inhalt, Ladung und Alpha.', 'For N2, N3 and N4, content, loading and alpha fit.'), true),
      a(P('O2 und O5 kommen zu Mitgefühl, weil sie eine eigene Komponente bilden', 'O2 and O5 go into compassion, because they form a component of their own'),
        P('Eine eigene Komponente ohne passendes Konstrukt ist ein Grund, die Items aus beiden Skalen herauszuhalten.', 'A component of their own without a fitting construct is a reason to keep the items out of both scales.')),
      a(P('Der Skalenwert wird aus allen elf Items gebildet, gegenläufige umgepolt', 'The scale score is formed from all eleven items, opposite ones reverse-coded'),
        P('Je Skala zählen nur ihre behaltenen Items. Ein Wert aus allen elf würde verschiedene Merkmale vermischen.', 'Each scale counts only its retained items. A score from all eleven would mix different attributes.'))
    ],
    hilfe: HILFE_GES, karte: 'skala', belege: ['wissen:itemselektion-nicht-mechanisch', 'wissen:testtheorie-testwert-summe', 'wissen:fa-interpretation-subjektiv']
  }
];
