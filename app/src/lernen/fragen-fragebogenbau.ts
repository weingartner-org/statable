/**
 * Üben: Wie misst man etwas, das man nicht sieht, und misst der Fragebogen, was er messen soll? (Konstrukt, Item, Skala; Validität und Reliabilität).
 * Eigene Wortlaute, eigene erfundene Beispiele; sieben der ersten Fragen (fb-summe-gleich, -umpolen-lesart, -alpha-eindim, -trennschaerfe-null, -val-eng, -kd-diskriminant, -gf-alle-ja) tragen eine kleine Tabelle
 * (Beispielwerte erfunden oder mit R simuliert, außer fb-alpha-eindim: psych::bfi), die übrigen der ersten Fragen sind reine Begriffsfragen ohne Zahlen; die Fragen `fb-iz-`, `fb-ga-` und `fb-sm-` (Inhalt und Zahlen abwägen, Gesamtablauf
 * zur Skala, Skalenwert als Mittelwert) mit Tabellen und Zahlen ausschließlich aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R, Daten: psych::bfi). Belege: wissen.json (nur mc: true); die kurzen Begriffserklärungen im Stamm
 * stehen im Hilfe-Artikel (Beleg `Hilfe:<id>`).
 * Die Einheit `gute-fragen` stützt sich allein auf wissen:clark-itemformulierung (Doppelfrage, Verständlichkeit, Wortlaut). Die konvergente und diskriminante Validität (fb-kd-) stützt sich allein auf wissen:clark-konvergent-diskriminant-def, ohne Größenangaben der Quelle.
 * Augenscheinvalidität (fb-av-) stützt sich auf wissen:testtheorie-augenschein-def und wissen:testtheorie-augenschein-verfaelschung (Moosbrugger und Kelava, Kap. 2). Suggestivfragen (fb-sg-) und doppelte Verneinung (fb-dv-)
 * haben im Originaltext keinen Beleg: Die Fragen setzen die Regel im Stamm („Angenommen, ...“) und behaupten keine Quelle; Beleg ist nur der Hilfe-Begriff `suggestivfrage` (und für den Wortlaut clark-itemformulierung).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, za, zae, zd, ze, zn } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

const QUELLE_IZ = P(
  `Daten: psych::bfi (SAPA-Projekt 2010, Fragen aus dem IPIP; Paket psych, Lizenz GPL ≥ 2), ${zn('ib_n')} Personen mit allen sechs Antworten. Hauptkomponenten, Varimax, berechnet mit R.`,
  `Data: psych::bfi (SAPA project 2010, items from the IPIP; package psych, licence GPL ≥ 2), ${zn('ib_n')} people with all six answers. Principal components, varimax, computed with R.`);
const QUELLE_E = P(
  `Daten: psych::bfi (SAPA-Projekt 2010, Fragen aus dem IPIP; Paket psych, Lizenz GPL ≥ 2), Items E1 bis E5, Antworten 1 bis 6, ${zn('ga_n')} Personen ohne fehlende Antwort. Berechnet mit R.`,
  `Data: psych::bfi (SAPA project 2010, items from the IPIP; package psych, licence GPL ≥ 2), items E1 to E5, answers 1 to 6, ${zn('ga_n')} people without a missing answer. Computed with R.`);
const QUELLE_C = P(
  'Daten: psych::bfi (SAPA-Projekt 2010, Fragen aus dem IPIP; Paket psych, Lizenz GPL ≥ 2), Items C1 bis C5, Antworten 1 bis 6, Personen ohne fehlende Antwort; vier Personen aus der Datei (die 1., 4., 5. und 6.). Berechnet mit R.',
  'Data: psych::bfi (SAPA project 2010, items from the IPIP; package psych, licence GPL ≥ 2), items C1 to C5, answers 1 to 6, people without a missing answer; four people from the file (the 1st, 4th, 5th and 6th). Computed with R.');
const QUELLE_SG = P('Beispielwerte (erfunden, keine echten Daten). Antworten von 1 bis 5; Summe und Mittelwert berechnet mit R.', 'Example values (made up, not real data). Answers from 1 to 5; sum and mean computed with R.');
const QUELLE_UL = P('Beispielwerte (erfunden, keine echten Daten). Antworten von 1 bis 5; Mittelwerte berechnet mit R.', 'Example values (made up, not real data). Answers from 1 to 5; means computed with R.');
const QUELLE_AE = P(
  `Daten: psych::bfi (SAPA-Projekt 2010, Fragen aus dem IPIP; Paket psych, Lizenz GPL ≥ 2), Items A1 bis A5 und E1 bis E5, A1, E1 und E2 umgepolt (7 minus Wert), ${zn('ae_n')} Personen ohne fehlende Antwort. Hauptkomponenten, Varimax, berechnet mit R.`,
  `Data: psych::bfi (SAPA project 2010, items from the IPIP; package psych, licence GPL ≥ 2), items A1 to A5 and E1 to E5, A1, E1 and E2 reverse-coded (7 minus value), ${zn('ae_n')} people without a missing answer. Principal components, varimax, computed with R.`);
const QUELLE_TN = P('Beispielwerte (erfunden, keine echten Daten). 120 Personen mit Antworten von 1 bis 5, in R mit festem Startwert simuliert; Trennschärfen berechnet mit R.', 'Example values (made up, not real data). 120 people with answers from 1 to 5, simulated in R with a fixed seed; item-total correlations computed with R.');
const QUELLE_VE = P('Beispielwerte (erfunden, keine echten Daten). 200 Personen, in R mit festem Startwert simuliert; Korrelationen und Alpha berechnet mit R.', 'Example values (made up, not real data). 200 people, simulated in R with a fixed seed; correlations and alpha computed with R.');
const QUELLE_KD = P('Beispielwerte (erfunden, keine echten Daten). 150 Kinder, in R mit festem Startwert simuliert; Korrelationen berechnet mit R.', 'Example values (made up, not real data). 150 children, simulated in R with a fixed seed; correlations computed with R.');
const QUELLE_GF = P('Beispielwerte (erfunden, keine echten Daten). 200 Personen einer Probebefragung; Häufigkeiten ausgezählt mit R.', 'Example values (made up, not real data). 200 people in a trial survey; frequencies counted with R.');
const KOPF_ITEM = P('Item', 'Item');
const kopfK = (n: number) => P(`Komponente ${n}`, `Component ${n}`);
const IZ = 'inhalt-zahlen';

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  [IZ]: {
    titel: P('Sechs Items eines Persönlichkeitsfragebogens: N1 „Ich werde schnell wütend“, N2 „Ich bin schnell gereizt“, N4 „Ich bin oft niedergeschlagen“, A1 „Die Gefühle anderer lassen mich kalt“, A2 „Ich frage nach, wie es anderen geht“, E1 „Ich rede eher wenig“. Aus N1, N2 und N4 soll eine Skala für Ärger und Niedergeschlagenheit werden.',
      'Six items of a personality questionnaire: N1 "I get angry quickly", N2 "I get irritated quickly", N4 "I often feel down", A1 "Other people\'s feelings leave me cold", A2 "I ask how others are doing", E1 "I tend to talk little". N1, N2 and N4 are meant to form a scale for anger and low mood.'),
    tabellen: [
      tab(`${IZ}.0`, [KOPF_ITEM, kopfK(1), kopfK(2), kopfK(3)], QUELLE_IZ,
        P(`Rotierte Komponentenmatrix (Ladungen unter ${zd('regel_ladung_aus')} ausgeblendet)`, `Rotated component matrix (loadings below ${ze('regel_ladung_aus')} hidden)`)),
      tab(`${IZ}.1`, [KOPF_ITEM, P('Skala-Varianz ohne Item', 'Scale variance if item deleted'), P('Korrigierte Item-Skala-Korrelation', 'Corrected item-total correlation'), P('Cronbachs Alpha ohne Item', 'Cronbach\'s alpha if item deleted')], QUELLE_IZ,
        P('Itemstatistik der Skala aus N1, N2 und N4', 'Item statistics of the scale made of N1, N2 and N4'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Konstrukt, Item, Skala ----
  {
    id: 'fb-summe-gleich', thema: 'fragebogenbau',
    tabelle: tab('fb-summe-gleich', [P('Person', 'Person'), P('Item 1', 'Item 1'), P('Item 2', 'Item 2'), P('Item 3', 'Item 3'), P('Item 4', 'Item 4'), P('Summe', 'Sum'), P('Mittelwert', 'Mean')], QUELLE_SG,
      P('Vier Items zur Lesefreude, fünf Personen', 'Four items on reading enjoyment, five people')),
    stamm: P('Aus vier Items (einzelne Aussagen im Fragebogen) soll ein Summenwert für das Konstrukt „Lesefreude“ gebildet werden. Die Tabelle zeigt fünf Personen mit Antworten von 1 bis 5 (Beispielwerte), dazu Summe und Mittelwert der vier Items. Ein Konstrukt ist ein gedachtes Merkmal, das man aus Antworten erschließt. Wann ist das Zusammenzählen sinnvoll?',
      'A sum score is to be formed from four items (single statements in a questionnaire) for the construct "reading enjoyment". The table shows five people with answers from 1 to 5 (example values), plus the sum and the mean of the four items. A construct is an imagined attribute that is inferred from answers. When does adding them up make sense?'),
    antworten: [
      a(P('Wenn alle vier Items dasselbe Merkmal erfassen', 'If all four items capture the same attribute'),
        P(`Die Summe der Itemwerte (Person 1: ${zn('sg_su1')}) ist der einfachste vorläufige Testwert; der Mittelwert (${zd('sg_mw1', 1)}) liegt auf derselben Skala von 1 bis 5 wie die Items. Beides ist nur sinnvoll, wenn die Items dasselbe Merkmal messen (Eindimensionalität). Erste Hinweise geben die Trennschärfen.`,
          `The sum of the item scores (person 1: ${zn('sg_su1')}) is the simplest provisional test score; the mean (${ze('sg_mw1', 1)}) lies on the same scale from 1 to 5 as the items. Both make sense only if the items measure the same attribute (unidimensionality). The item-total correlations give first hints.`), true),
      a(P('Wenn die Items möglichst verschiedene Merkmale abdecken', 'If the items cover attributes that are as different as possible'),
        P('Verschiedene Merkmale vermischen sich in einer Summe; der Summenwert wäre dann kaum zu deuten. Die Summe passt zu Items, die dasselbe Merkmal messen.',
          'Different attributes blend together in a sum, so the sum score would be hard to interpret. A sum suits items that measure the same attribute.')),
      a(P('Wenn alle vier Items gleich viele Antwortstufen haben', 'If all four items have the same number of answer levels'),
        P('Gleich viele Antwortstufen reichen dafür nicht aus. Entscheidend ist, ob die Items dasselbe Merkmal messen.',
          'The same number of answer levels is not enough. What matters is whether the items measure the same attribute.'))
    ],
    hilfe: ['skalenwert', 'eindimensionalitaet', 'konstrukt', 'item'], belege: ['wissen:testtheorie-testwert-summe', 'Hilfe:konstrukt', 'Hilfe:item']
  },
  {
    id: 'fb-umpolen-lesart', thema: 'fragebogenbau',
    tabelle: tab('fb-umpolen-lesart', [P('Person', 'Person'), P('Item 1', 'Item 1'), P('Item 2', 'Item 2'), P('Item 3', 'Item 3'), P('Item 4 („Ich lese nur, wenn es sein muss.“)', 'Item 4 ("I only read when I have to.")'), P('Skalenwert (Mittelwert der vier Antworten, wie sie dastehen)', 'Scale score (mean of the four answers as they stand)')], QUELLE_UL,
      P('Vier Items zur Lesefreude, vier Personen', 'Four items on reading enjoyment, four people')),
    stamm: P('Eine Skala (mehrere Items, deren Antworten zu einem Gesamtwert zusammengefasst werden) erfasst Lesefreude. Das vierte Item lautet „Ich lese nur, wenn es sein muss.“ Zustimmung bedeutet hier niedrige Lesefreude. Die Tabelle zeigt vier Personen mit Antworten von 1 bis 5 (Beispielwerte) und den Skalenwert, wenn man die vier Antworten so mittelt, wie sie dastehen. Was geschieht mit dem Item vor der Auswertung?',
      'A scale (several items whose answers are combined into one total score) captures reading enjoyment. The fourth item reads "I only read when I have to." Agreement here means low reading enjoyment. The table shows four people with answers from 1 to 5 (example values) and the scale score if the four answers are averaged just as they stand. What happens to the item before the analysis?'),
    antworten: [
      a(P('Es wird umgekehrt kodiert (umgepolt), sodass hohe Werte hohe Lesefreude heißen', 'It is reverse-coded so that high values mean high reading enjoyment'),
        P(`Invertierte Items werden vor Alpha und dem Skalenwert umkodiert, hier von 1 bis 5 zu 5 bis 1 (6 minus Wert). Bei Person 1 wird aus der ${zn('ul_p1_i4')} eine ${zn('ul_p1_i4u')}, und der Skalenwert steigt von ${zd('ul_p1_roh', 1)} auf ${zd('ul_p1_um', 1)}; bei Person 3 sinkt er von ${zd('ul_p3_roh', 1)} auf ${zd('ul_p3_um', 1)}. Wurde die Umpolung vergessen, kann die Trennschärfe negativ ausfallen und Alpha sogar negativ werden.`,
          `Inverted items are recoded before alpha and the scale score, here from 1 to 5 into 5 to 1 (6 minus value). For person 1 the ${ze('ul_p1_i4', 0)} becomes a ${ze('ul_p1_i4u', 0)}, and the scale score rises from ${ze('ul_p1_roh', 1)} to ${ze('ul_p1_um', 1)}; for person 3 it falls from ${ze('ul_p3_roh', 1)} to ${ze('ul_p3_um', 1)}. If the reverse-coding is forgotten, the item-total correlation may come out negative and alpha may even become negative.`), true),
      a(P('Es bleibt so, weil jede Zustimmung in der Summe gleich gezählt wird', 'It stays as it is because every agreement is counted alike in the sum'),
        P(`Unverändert würde Zustimmung hier niedrige statt hohe Lesefreude in die Summe tragen: Person 1 mit der höchsten Lesefreude käme nur auf ${zd('ul_p1_roh', 1)} statt ${zd('ul_p1_um', 1)}. Das ist eine häufige Ursache einer negativen Trennschärfe.`,
          `Unchanged, agreement would carry low instead of high reading enjoyment into the sum: person 1 with the highest reading enjoyment would reach only ${ze('ul_p1_roh', 1)} instead of ${ze('ul_p1_um', 1)}. That is a frequent cause of a negative item-total correlation.`)),
      a(P('Es wird gestrichen, weil negativ formulierte Items in Skalen stören', 'It is deleted because negatively worded items disturb scales'),
        P('Das Verfahren sieht Umkodieren vor, nicht Streichen. Das Item bleibt in der Skala.',
          'The procedure provides for recoding, not for deleting. The item stays in the scale.'))
    ],
    hilfe: ['umpolen', 'skala', 'skalenwert'], belege: ['wissen:umpolen-verfahren', 'wissen:negative-trennschaerfe-ursache', 'wissen:alpha-negativ-moeglich', 'Hilfe:skala']
  },
  {
    id: 'fb-alpha-eindim', thema: 'fragebogenbau',
    tabelle: tab('fb-alpha-eindim', [KOPF_ITEM, kopfK(1), kopfK(2)], QUELLE_AE,
      P(`Hauptkomponentenanalyse der zehn Items (Ladungen unter ${zd('regel_ladung_aus')} ausgeblendet)`, `Principal component analysis of the ten items (loadings below ${ze('regel_ladung_aus')} hidden)`)),
    stamm: P(`Zehn Items (A1 bis A5 und E1 bis E5 eines Persönlichkeitsfragebogens) bilden eine Skala mit einem Alpha von ${zd('ae_alpha', 3)} (Alpha: ein Maß für die Verbundenheit der Items und Schätzer der Reliabilität). Die Tabelle zeigt eine Hauptkomponentenanalyse, die nach gemeinsamen Hintergrundmerkmalen der Items sucht. Was folgt für das Konstrukt dahinter?`,
      `Ten items (A1 to A5 and E1 to E5 of a personality questionnaire) form a scale with an alpha of ${ze('ae_alpha', 3)} (alpha: a measure of how connected the items are and an estimator of reliability). The table shows a principal component analysis, which looks for shared underlying attributes of the items. What follows for the construct behind it?`),
    antworten: [
      a(P('Die Items sind verbunden; aus Alpha folgt nicht, dass nur ein Merkmal dahinter steht', 'The items are connected; alpha does not imply that only one attribute lies behind them'),
        P(`Ein Alpha von ${zd('ae_alpha', 3)} beweist keine Eindimensionalität: Die Tabelle zeigt zwei Komponenten mit Eigenwerten über 1 (${zd('ae_ev1')} und ${zd('ae_ev2')}); A1 bis A5 laden vor allem auf Komponente 2, E1 bis E5 auf Komponente 1. Eine Skala mit einem Faktor und eine mit zwei Konstrukten können dasselbe Alpha haben. Interne Konsistenz ist notwendig, aber nicht hinreichend für Homogenität.`,
          `An alpha of ${ze('ae_alpha', 3)} does not prove unidimensionality: the table shows two components with eigenvalues above 1 (${ze('ae_ev1')} and ${ze('ae_ev2')}); A1 to A5 load mainly on component 2, E1 to E5 on component 1. A scale with one factor and one with two constructs can have the same alpha. Internal consistency is necessary but not sufficient for homogeneity.`), true),
      a(P('Alle zehn Items messen genau ein Merkmal, denn Alpha prüft die Eindimensionalität', 'All ten items measure exactly one attribute, since alpha tests unidimensionality'),
        P('Alpha hängt von der Verbundenheit und der Itemzahl ab und ist kein Maß der Homogenität. Eine Skala kann verbunden und trotzdem mehrdimensional sein, wie die zwei Komponenten der Tabelle zeigen.',
          'Alpha depends on connectedness and number of items and is not a measure of homogeneity. A scale can be connected and still multidimensional, as the two components in the table show.')),
      a(P('Die Skala misst das gemeinte Konstrukt, denn ein hohes Alpha steht für Gültigkeit', 'The scale measures the intended construct, since a high alpha stands for validity'),
        P('Ein ausreichendes Alpha sagt nichts darüber, ob die Items das gemeinte Konstrukt messen. Dafür braucht es Konstruktvalidierung.',
          'A sufficient alpha says nothing about whether the items measure the intended construct. That takes construct validation.'))
    ],
    hilfe: ['eindimensionalitaet', 'interne-konsistenz', 'reliabilitaet'], belege: ['wissen:alpha-nicht-eindimensionalitaet', 'wissen:cortina-schmitt-konsistenz-homogenitaet', 'wissen:cortina-alpha-aussage-grenzen']
  },
  {
    id: 'fb-trennschaerfe-null', thema: 'fragebogenbau',
    tabelle: tab('fb-trennschaerfe-null', [KOPF_ITEM, P('Trennschärfe (korrigierte Item-Skala-Korrelation)', 'Item-total correlation (corrected)')], QUELLE_TN,
      P('Trennschärfen der acht Items einer Skala zur Lesefreude', 'Item-total correlations of the eight items of a scale on reading enjoyment')),
    stamm: P('Eine Skala zur Lesefreude hat acht Items. Die Tabelle zeigt ihre Trennschärfen (Zusammenhang eines Items mit dem Gesamtwert der übrigen Items; Beispielwerte). Item 6 lautet „Ich fahre gern Rad.“ Was bedeutet sein Wert?',
      'A scale on reading enjoyment has eight items. The table shows their item-total correlations (relation of an item to the total score of the other items; example values). Item 6 reads "I like cycling." What does its value mean?'),
    antworten: [
      a(P('Das Item erfasst etwas Unabhängiges und eignet sich für diese Skala wenig', 'The item captures something independent and suits this scale poorly'),
        P(`Eine Trennschärfe nahe null heißt: Das Item misst etwas Unabhängiges und ist ungeeignet. Es differenziert nicht wie der Gesamttest. Hier liegt Item 6 bei ${zd('tn_i6', 3)}, alle übrigen Items mindestens bei ${zd('tn_min', 3)}.`,
          `An item-total correlation near zero means the item measures something independent and is unsuitable. It does not differentiate like the whole test. Here item 6 lies at ${ze('tn_i6', 3)}, all other items at ${ze('tn_min', 3)} or above.`), true),
      a(P('Das Item ist besonders gut, weil es mit den übrigen Items nichts gemeinsam hat', 'The item is particularly good because it has nothing in common with the other items'),
        P('Ein Item mit Trennschärfe nahe null differenziert nicht wie der Gesamttest. Gemeinsames mit den übrigen Items ist bei einer Skala gerade gewünscht.',
          'An item with an item-total correlation near zero does not differentiate like the whole test. In a scale, something in common with the other items is exactly what is wanted.')),
      a(P('Das Item ist ein Umkehr-Item, dessen Umpolung vergessen wurde', 'The item is a reverse-keyed item whose reverse-coding was forgotten'),
        P(`Eine vergessene Umpolung zeigt sich typischerweise als negative Trennschärfe; hier liegt der Wert bei ${zd('tn_i6', 3)}, nahe null.`,
          `A forgotten reverse-coding typically shows up as a negative item-total correlation; here the value is ${ze('tn_i6', 3)}, near zero.`))
    ],
    hilfe: ['trennschaerfe', 'itemanalyse', 'item'], belege: ['wissen:trennschaerfe-lesart', 'wissen:negative-trennschaerfe-ursache', 'Hilfe:item']
  },
  {
    id: 'fb-skala-mehrfach', thema: 'fragebogenbau', mehrfach: true,
    stamm: P('Eine Skala fasst mehrere Items zu einem Gesamtwert für ein Konstrukt zusammen. Welche Aussagen stimmen? Mehrere können stimmen.',
      'A scale combines several items into one total score for a construct. Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Die Summe der Items ist nur sinnvoll, wenn die Items dasselbe Merkmal messen', 'The sum of the items makes sense only if the items measure the same attribute'),
        P('Die Summenbildung setzt Eindimensionalität voraus; erste Hinweise geben die Trennschärfen.', 'Forming the sum presupposes unidimensionality; the item-total correlations give first hints.'), true),
      a(P('Ein Item, bei dem Zustimmung niedrige Ausprägung heißt, wird vor Alpha und Summe umkodiert', 'An item for which agreement means a low level is recoded before alpha and the sum'),
        P('Invertierte Items werden vor Alpha und dem Summenwert umkodiert, am besten schon beim Aufbau der Datenmatrix. Für eine Faktorenanalyse ist das nicht nötig: Dort zeigt das Item eine negative Ladung, es zählt der Betrag.', 'Inverted items are recoded before alpha and the sum score, ideally when the data matrix is built. For a factor analysis this is not needed: there the item shows a negative loading, and the absolute size counts.'), true),
      a(P('Ein hohes Alpha zeigt sicher, dass die Skala genau ein Merkmal misst', 'A high alpha shows for sure that the scale measures exactly one attribute'),
        P('Ein hohes Alpha beweist keine Eindimensionalität; zwei Konstrukte können dasselbe Alpha ergeben wie eines.', 'A high alpha does not prove unidimensionality; two constructs can yield the same alpha as one.')),
      a(P('Eine Trennschärfe nahe null zeigt, dass ein Item besonders gut zur Skala passt', 'An item-total correlation near zero shows that an item fits the scale particularly well'),
        P('Nahe null heißt, dass das Item etwas Unabhängiges misst und ungeeignet ist.', 'Near zero means the item measures something independent and is unsuitable.'))
    ],
    hilfe: ['skala', 'skalenwert', 'umpolen', 'trennschaerfe'], belege: ['wissen:testtheorie-testwert-summe', 'wissen:umpolen-verfahren', 'wissen:fa-negative-ladung', 'wissen:alpha-nicht-eindimensionalitaet', 'wissen:trennschaerfe-lesart', 'Hilfe:skala']
  },

  // ---- Validität und Reliabilität ----
  {
    id: 'fb-val-reliabel', thema: 'fragebogenbau',
    stamm: P('Ein Fragebogen zur Fahrsicherheit liefert bei Wiederholung nach einer Woche fast dieselben Werte (hohe Reliabilität, also Verlässlichkeit der Messung). Was folgt daraus für die Validität (Gültigkeit: Misst er, was er messen soll)?',
      'A questionnaire on driving safety yields almost the same scores when repeated after a week (high reliability, that is dependability of the measurement). What follows for validity (does it measure what it is meant to measure)?'),
    antworten: [
      a(P('Reliabilität ist dafür Voraussetzung, aber allein kein Beleg für Validität', 'Reliability is a prerequisite for it, but alone no proof of validity'),
        P('Objektivität und Reliabilität sind für die Validität notwendig, aber nicht hinreichend. Validität gilt als wichtigstes Gütekriterium.',
          'Objectivity and reliability are necessary for validity but not sufficient. Validity counts as the most important quality criterion.'), true),
      a(P('Die Validität ist damit gesichert, denn stabile Werte messen das Gemeinte', 'Validity is thereby secured, since stable scores measure what is meant'),
        P('Stabile Werte können auch ein falsches Merkmal stabil messen. Reliabilität ist notwendig, aber nicht hinreichend.',
          'Stable scores can also measure a wrong attribute stably. Reliability is necessary but not sufficient.')),
      a(P('Die Validität ist niedrig, denn hohe Stabilität schließt Gültigkeit aus', 'Validity is low, since high stability rules out validity'),
        P('Reliabilität ist eine Voraussetzung der Validität; hohe Stabilität schließt Gültigkeit also nicht aus.',
          'Reliability is a prerequisite of validity, so high stability does not rule out validity.'))
    ],
    hilfe: ['validitaet', 'reliabilitaet', 'retest-reliabilitaet'], belege: ['wissen:validitaet-wichtigstes-kriterium', 'wissen:reliabilitaet-definition']
  },
  {
    id: 'fb-val-inhalt', thema: 'fragebogenbau',
    stamm: P('Ein Kurztest zu Erster Hilfe soll den ganzen Lehrstoff abdecken (Inhaltsvalidität). Wie wird das üblicherweise beurteilt?',
      'A short test on first aid is meant to cover the whole teaching content (content validity). How is that usually judged?'),
    antworten: [
      a(P('Durch fachliche Überlegungen und das Urteil von Fachleuten über die Items', 'By subject-matter reasoning and the judgement of experts about the items'),
        P('Inhaltsvalidität wird in der Regel durch logische und fachliche Überlegungen bestimmt, also durch Expertenurteile.',
          'Content validity is usually established by logical and subject-matter reasoning, that is by expert judgements.'), true),
      a(P('Durch eine einzige Kennzahl, die aus den Antworten berechnet wird', 'By a single statistic that is computed from the answers'),
        P('Inhaltsvalidität wird in der Regel nicht durch eine Kennzahl bestimmt.',
          'Content validity is usually not determined by a statistic.')),
      a(P('Durch die Korrelation des Tests mit einem äußeren Maßstab', 'By the correlation of the test with an external standard'),
        P('Das beschreibt im einfachsten Fall die Kriteriumsvalidität, nicht die Inhaltsvalidität.',
          'In the simplest case that describes criterion validity, not content validity.'))
    ],
    hilfe: ['inhaltsvaliditaet', 'validitaet'], belege: ['wissen:inhaltsvaliditaet-urteil', 'wissen:validitaet-wichtigstes-kriterium']
  },
  {
    id: 'fb-val-kriterium', thema: 'fragebogenbau',
    stamm: P('Ein Kurzfragebogen zur Fahrkompetenz wird mit dem Ergebnis der echten Fahrprüfung derselben Personen verglichen (Kriteriumsvalidität). Wie wird das im einfachsten Fall ausgedrückt?',
      'A short questionnaire on driving competence is compared with the result of the real driving test of the same persons (criterion validity). How is that expressed in the simplest case?'),
    antworten: [
      a(P('Als Korrelation zwischen Fragebogenwert und Prüfungsergebnis', 'As the correlation between questionnaire score and test result'),
        P('Kriteriumsvalidität ist im einfachsten Fall die Korrelation zwischen Test und Kriterium.',
          'In the simplest case criterion validity is the correlation between test and criterion.'), true),
      a(P('Als Expertenurteil darüber, ob die Items den Stoff abdecken', 'As an expert judgement on whether the items cover the subject matter'),
        P('Das beschreibt eher die Inhaltsvalidität, die über fachliche Urteile beurteilt wird.',
          'That describes content validity, which is judged by expert reasoning.')),
      a(P('Als Anteil wahrer Varianz an der Gesamtvarianz der Fragebogenwerte', 'As the share of true variance in the total variance of the questionnaire scores'),
        P('Das ist die Definition der Reliabilität, nicht der Kriteriumsvalidität.',
          'That is the definition of reliability, not of criterion validity.'))
    ],
    hilfe: ['kriteriumsvaliditaet', 'validitaet'], belege: ['wissen:inhaltsvaliditaet-urteil', 'wissen:reliabilitaet-definition']
  },
  {
    id: 'fb-val-reliabilitaet-def', thema: 'fragebogenbau',
    stamm: P('Die Reliabilität (Verlässlichkeit) einer Skala wird als Wert zwischen 0 und 1 angegeben. Wofür steht ein Wert nahe 1?',
      'The reliability of a scale is given as a value between 0 and 1. What does a value near 1 stand for?'),
    antworten: [
      a(P('Fast die gesamte Streuung der Testwerte geht auf wahre Unterschiede der Personen zurück', 'Almost all of the spread of the test scores is due to true differences between persons'),
        P('Reliabilität ist der Anteil der wahren Varianz an der Gesamtvarianz der Testwerte und liegt zwischen 0 und 1.',
          'Reliability is the share of true variance in the total variance of test scores and lies between 0 and 1.'), true),
      a(P('Die Skala misst genau das Merkmal, das sie messen soll', 'The scale measures exactly the attribute it is meant to measure'),
        P('Das wäre Validität. Reliabilität sagt nur, wie groß der Anteil wahrer Varianz an der Streuung der Testwerte ist.',
          'That would be validity. Reliability only states how large the share of true variance is in the spread of test scores.')),
      a(P('Fast alle Personen erreichen auf der Skala denselben Wert', 'Almost all persons reach the same value on the scale'),
        P('Gleiche Werte bedeuten kaum Streuung. Reliabilität ist der Anteil der wahren Varianz an der Gesamtvarianz, kein Maß für gleiche Werte.',
          'Equal values mean hardly any spread. Reliability is the share of true variance in the total variance, not a measure of equal values.'))
    ],
    hilfe: ['reliabilitaet', 'retest-reliabilitaet'], belege: ['wissen:reliabilitaet-definition', 'wissen:validitaet-wichtigstes-kriterium']
  },
  {
    id: 'fb-val-eng', thema: 'fragebogenbau',
    tabelle: tab('fb-val-eng', [P('Mittlere Korrelation der Items untereinander', 'Mean correlation among the items'), P('Cronbachs Alpha der zehn Items', 'Cronbach\'s alpha of the ten items'), P('Korrelation der Skala mit dem Kriterium', 'Correlation of the scale with the criterion')], QUELLE_VE,
      P('Zehn fast gleiche Items zur Lesefreude und das Kriterium „gelesene Bücher im letzten Jahr“', 'Ten almost identical items on reading enjoyment and the criterion "books read last year"')),
    stamm: P('Zur Messung von Lesefreude (einem Konstrukt) werden zehn Items geschrieben, die fast dasselbe fragen. Als äußeres Maß (Kriterium) dient die Zahl der Bücher, die jede Person im letzten Jahr gelesen hat. Die Tabelle zeigt Beispielwerte. Wie wirkt sich das auf Reliabilität und Validität aus?',
      'To measure reading enjoyment (a construct), ten items are written that ask almost the same thing. The outside measure (criterion) is the number of books each person read last year. The table shows example values. How does that affect reliability and validity?'),
    antworten: [
      a(P('Die Reliabilität steigt, die Validität kann sinken, weil nur ein enger Ausschnitt gemessen wird', 'Reliability rises, validity may fall because only a narrow part is measured'),
        P(`Fast gleiche Items treiben die Reliabilität gegen 1 (hier Alpha ${zd('ve_a')}). Die Validität sinkt aber, weil nur ein enger Ausschnitt des Merkmals gemessen wird (Attenuationsparadox); hier hängt die Skala mit dem Kriterium nur mit ${zd('ve_rk')} zusammen.`,
          `Almost identical items drive reliability towards 1 (here alpha ${ze('ve_a')}). Validity falls, however, because only a narrow part of the attribute is measured (attenuation paradox); here the scale correlates with the criterion at only ${ze('ve_rk')}.`), true),
      a(P('Beide steigen, weil mehr gleichartige Items das Merkmal genauer treffen', 'Both rise because more items of the same kind hit the attribute more precisely'),
        P('Die Reliabilität steigt, die Validität sinkt aber. Das ist das Attenuationsparadox.',
          'Reliability rises but validity falls. That is the attenuation paradox.')),
      a(P('Beide sinken, weil gleichartige Items einander gegenseitig stören', 'Both fall because items of the same kind disturb one another'),
        P('Die Reliabilität steigt gegen 1; nur die Validität leidet.',
          'Reliability rises towards 1; only validity suffers.'))
    ],
    hilfe: ['validitaet', 'reliabilitaet', 'konstrukt'], belege: ['wissen:reliabilitaet-attenuationsparadox', 'Hilfe:konstrukt']
  },
  {
    id: 'fb-val-alpha', thema: 'fragebogenbau',
    stamm: P('Eine neue Skala zur Mitarbeiterzufriedenheit hat ein gutes Alpha. Ein Teammitglied sagt, damit sei bewiesen, dass sie Zufriedenheit misst. Was trifft zu?',
      'A new scale on employee satisfaction has a good alpha. A team member says that this proves it measures satisfaction. What applies?'),
    antworten: [
      a(P('Alpha zeigt nur, wie eng die Items zusammenhängen; ob sie das gemeinte Konstrukt messen, zeigt es nicht', 'Alpha only shows how closely the items hang together; it does not show whether they measure the intended construct'),
        P('Ein ausreichendes Alpha sagt nichts darüber, ob die Items das gemeinte Konstrukt messen. Für die Deutung braucht es Konstruktvalidierung.',
          'A sufficient alpha says nothing about whether the items measure the intended construct. Interpretation needs construct validation.'), true),
      a(P('Alpha ist ein Maß der Validität und zeigt die Gültigkeit der Skala an', 'Alpha is a measure of validity and indicates the validity of the scale'),
        P('Alpha eignet sich für die Reliabilität eines eindimensionalen Tests, es ist kein Maß der Validität.',
          'Alpha suits the reliability of a unidimensional test; it is not a measure of validity.')),
      a(P('Alpha zeigt, dass die Werte über längere Zeit stabil bleiben', 'Alpha shows that the scores stay stable over a longer time'),
        P('Alpha sagt nichts darüber, wie stabil die Werte über die Zeit sind. Die Retest-Reliabilität hängt dagegen vom Zeitabstand ab.',
          'Alpha says nothing about how stable the scores are over time. Retest reliability, by contrast, depends on the time interval.'))
    ],
    hilfe: ['reliabilitaet', 'validitaet', 'konstruktvaliditaet'], belege: ['wissen:cortina-alpha-aussage-grenzen', 'wissen:reliabilitaet-definition']
  },
  {
    id: 'fb-val-mehrfach', thema: 'fragebogenbau', mehrfach: true,
    stamm: P('Es geht um die Gütekriterien (Qualitätsmerkmale) eines Fragebogens. Welche Aussagen stimmen? Mehrere können stimmen.',
      'This is about the quality criteria of a questionnaire. Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Validität gilt als wichtigstes Gütekriterium; Reliabilität ist dafür notwendig, aber nicht hinreichend', 'Validity counts as the most important quality criterion; reliability is necessary for it but not sufficient'),
        P('So wird das Verhältnis der Gütekriterien dargestellt: Objektivität und Reliabilität sind Voraussetzungen der Validität.', 'That is how the relation of the quality criteria is described: objectivity and reliability are prerequisites of validity.'), true),
      a(P('Inhaltsvalidität beurteilt man in der Regel durch fachliche Überlegungen statt durch eine Kennzahl', 'Content validity is usually judged by subject-matter reasoning instead of a statistic'),
        P('Inhaltsvalidität wird durch logische und fachliche Überlegungen, also Expertenurteile, bestimmt.', 'Content validity is established by logical and subject-matter reasoning, that is expert judgements.'), true),
      a(P('Eine hohe Reliabilität macht einen Fragebogen automatisch valide', 'A high reliability automatically makes a questionnaire valid'),
        P('Reliabilität ist für die Validität notwendig, aber nicht hinreichend.', 'Reliability is necessary for validity but not sufficient.')),
      a(P('Die Retest-Reliabilität ist vom Zeitabstand der beiden Messungen unabhängig', 'Retest reliability is independent of the time interval between the two measurements'),
        P('Die Retest-Reliabilität hängt vom Zeitabstand ab, etwa durch Übung, Erinnerung oder echte Veränderung.', 'Retest reliability depends on the time interval, for example through practice, memory or real change.'))
    ],
    hilfe: ['validitaet', 'reliabilitaet', 'inhaltsvaliditaet', 'retest-reliabilitaet'], belege: ['wissen:validitaet-wichtigstes-kriterium', 'wissen:inhaltsvaliditaet-urteil', 'wissen:reliabilitaet-definition']
  },
  // ---- Konvergente und diskriminante Validität (Beleg clark-konvergent-diskriminant-def; erfundene Beispiele, Werte nur als gesetzte Beispielwerte im Stamm) ----
  {
    id: 'fb-kd-konvergent', thema: 'fragebogenbau',
    stamm: P('Hängen zwei Messungen derselben Eigenschaft zusammen (konvergente Validität)? Eine neue Kurzskala zur Lesefreude und ein bewährter Fragebogen zur Lesefreude werden bei denselben Personen eingesetzt. Was wird für die konvergente Validität betrachtet?',
      'Do two measures of the same attribute go together (convergent validity)? A new short scale on reading enjoyment and an established questionnaire on reading enjoyment are given to the same persons. What is examined for convergent validity?'),
    antworten: [
      a(P('Die Zusammenhänge zwischen den Werten beider Messungen der Lesefreude', 'The relations between the scores of both measures of reading enjoyment'),
        P('Konvergente Validität wird geprüft, indem man Zusammenhänge zwischen Messungen desselben Konstrukts betrachtet.',
          'Convergent validity is assessed by examining relations among measures of the same construct.'), true),
      a(P('Die Zusammenhänge der Kurzskala mit Messungen anderer, davon abgegrenzter Eigenschaften', 'The relations of the short scale with measures of other, distinct attributes'),
        P('Der Vergleich mit Messungen anderer Konstrukte gehört zur diskriminanten Validität. Konvergent heißt: Messungen desselben Konstrukts.',
          'The comparison with measures of other constructs belongs to discriminant validity. Convergent means: measures of the same construct.')),
      a(P('Das Urteil von Fachleuten darüber, ob die Items den ganzen Stoff abdecken', 'The judgement of experts on whether the items cover the whole subject matter'),
        P('Das beschreibt die Inhaltsvalidität, die durch fachliche Überlegungen beurteilt wird. Konvergente Validität betrachtet Zusammenhänge zwischen Messungen desselben Konstrukts.',
          'That describes content validity, which is judged by subject-matter reasoning. Convergent validity examines relations among measures of the same construct.'))
    ],
    hilfe: ['konvergente-validitaet', 'validitaet', 'konstruktvaliditaet'], belege: ['wissen:clark-konvergent-diskriminant-def', 'wissen:inhaltsvaliditaet-urteil']
  },
  {
    id: 'fb-kd-diskriminant', thema: 'fragebogenbau',
    tabelle: tab('fb-kd-diskriminant', [P('Korrelation: Fragebogen und Elternurteil zur Lesefreude', 'Correlation: questionnaire and parents\' rating of reading enjoyment'), P('Korrelation: Fragebogen und Elternurteil zur Rechenfreude', 'Correlation: questionnaire and parents\' rating of enjoyment of maths'), P('Korrelation: Elternurteil zur Lesefreude und Elternurteil zur Rechenfreude', 'Correlation: parents\' rating of reading enjoyment and parents\' rating of enjoyment of maths')], QUELLE_KD,
      P('Korrelationen zwischen drei Messungen bei Kindern', 'Correlations among three measures in children')),
    stamm: P('Grenzt sich die Skala von anderen Eigenschaften ab (diskriminante Validität)? Die Lesefreude von Kindern wird per Fragebogen erhoben und mit dem Elternurteil zur Lesefreude sowie dem Elternurteil zur Rechenfreude verglichen. Die Tabelle zeigt die Korrelationen (Beispielwerte). Was lässt sich daraus für die diskriminante Validität schließen?',
      'Is the scale distinct from other attributes (discriminant validity)? Children\'s reading enjoyment is measured by questionnaire and compared with the parents\' rating of reading enjoyment and the parents\' rating of enjoyment of maths. The table shows the correlations (example values). What can be concluded from it for discriminant validity?'),
    antworten: [
      a(P(`Dafür: Der Fragebogen korreliert stärker mit dem Elternurteil zur Lesefreude (${zd('kd_lese')}) als mit dem zur Rechenfreude (${zd('kd_rechen')})`, `In favour: the questionnaire correlates more with the parents' rating of reading enjoyment (${ze('kd_lese')}) than of maths enjoyment (${ze('kd_rechen')})`),
        P(`Die konvergente Korrelation (gleiches Konstrukt, ${zd('kd_lese')}) ist höher als die Korrelation mit der Messung eines anderen Konstrukts (${zd('kd_rechen')}). Genau darin zeigt sich diskriminante Validität.`,
          `The convergent correlation (same construct, ${ze('kd_lese')}) is higher than the correlation with a measure of another construct (${ze('kd_rechen')}). That is exactly where discriminant validity shows.`), true),
      a(P(`Dagegen: Der Fragebogen hängt auch mit dem Elternurteil zur Rechenfreude zusammen, denn die Korrelation ist nicht null (${zd('kd_rechen')})`, `Against: the questionnaire is also related to the parents' rating of enjoyment of maths, since the correlation is not zero (${ze('kd_rechen')})`),
        P(`Diskriminante Validität verlangt keinen Zusammenhang von null, sondern dass die konvergente Korrelation höher ist als die mit der Messung eines anderen Konstrukts (hier ${zd('kd_lese')} gegenüber ${zd('kd_rechen')}).`,
          `Discriminant validity does not require a correlation of zero but that the convergent correlation is higher than the one with a measure of another construct (here ${ze('kd_lese')} versus ${ze('kd_rechen')}).`)),
      a(P('Offen: Erst wenn die beiden Elternurteile hoch zusammenhängen, lässt sich die Abgrenzung des Fragebogens beurteilen', 'Open: only if the two parental ratings are highly related can the distinction of the questionnaire be judged'),
        P(`Entscheidend ist der Vergleich der konvergenten Korrelation mit der Korrelation mit einem anderen Konstrukt; die Tabelle enthält beides (${zd('kd_lese')} und ${zd('kd_rechen')}). Der Zusammenhang der beiden Elternurteile untereinander wird dafür nicht gebraucht.`,
          `What matters is the comparison of the convergent correlation with the correlation with another construct; the table contains both (${ze('kd_lese')} and ${ze('kd_rechen')}). The relation between the two parental ratings is not needed for that.`))
    ],
    hilfe: ['diskriminante-validitaet', 'konvergente-validitaet', 'validitaet'], belege: ['wissen:clark-konvergent-diskriminant-def']
  },
  {
    id: 'fb-kd-methode', thema: 'fragebogenbau',
    stamm: P('Wie hoch muss ein Zusammenhang zwischen zwei Messungen sein, damit er genügt (konvergente Validität)? Eine Studie vergleicht zwei Selbstauskünfte zur Fahrsicherheit, eine andere vergleicht eine Selbstauskunft mit dem Urteil der Fahrlehrkraft. Die konvergente Korrelation fällt in der zweiten Studie niedriger aus. Wie ist das einzuordnen?',
      'How strong must a relation between two measures be to suffice (convergent validity)? One study compares two self-reports on driving safety, another compares a self-report with the rating of the driving instructor. The convergent correlation is lower in the second study. How should that be interpreted?'),
    antworten: [
      a(P('Bei Selbst- gegen Fremdbericht sind niedrigere Werte üblich; die nötige Höhe hängt vor allem von der Methode ab', 'With self-report against informant report lower values are usual; the required level depends mainly on the method'),
        P('Wie hoch eine konvergente Korrelation sein muss, hängt vor allem von der Methode ab. Selbst- gegen Fremdbericht liefert niedrigere Werte als zwei Selbstberichte.',
          'How high a convergent correlation must be depends mainly on the method. Self-report against informant report gives lower values than two self-reports.'), true),
      a(P('Für alle Methoden gilt dieselbe Untergrenze, daher ist die zweite Studie ein schwächerer Beleg', 'The same lower limit applies to all methods, so the second study is weaker evidence'),
        P('Wie hoch „hoch genug“ ist, lässt sich nicht pauschal sagen; es hängt vor allem von der Methode ab. Eine feste Grenze für alle Methoden gibt es so nicht.',
          'How high "high enough" is cannot be stated generally; it depends mainly on the method. There is no fixed limit for all methods.')),
      a(P('Die nötige Höhe richtet sich nach der Stichprobengröße, die Methode spielt dafür keine Rolle', 'The required level follows from the sample size, the method plays no role in it'),
        P('Nach Clark und Watson (2019) hängt die erwartete Höhe vor allem von der Methode ab. Zwei Selbstberichte und Selbst- gegen Fremdbericht liegen verschieden hoch.',
          'According to Clark and Watson (2019) the expected level depends mainly on the method. Two self-reports and self-report against informant report differ in level.'))
    ],
    hilfe: ['konvergente-validitaet', 'validitaet'], belege: ['wissen:clark-konvergent-diskriminant-def']
  },
  {
    id: 'fb-kd-streng', thema: 'fragebogenbau',
    stamm: P('Angenommen, in einer Validierungsstudie ist die konvergente Korrelation in der Stichprobe zahlenmäßig höher als die diskriminante (Beispielwerte: ,60 gegenüber ,54). Was unterscheidet die strengere von der lockeren Auslegung der Forderung, die konvergente Korrelation solle höher sein (diskriminante Validität)?',
      'Suppose that in a validation study the convergent correlation in the sample is numerically higher than the discriminant one (example values: .60 versus .54). What distinguishes the stricter from the looser reading of the requirement that the convergent correlation be higher (discriminant validity)?'),
    antworten: [
      a(P('Streng wird verlangt, dass die konvergente Korrelation im Test signifikant höher ist; locker genügt der Unterschied der Zahlen', 'Strictly it is required that the convergent correlation is significantly higher in a test; loosely the difference in the numbers suffices'),
        P('Strenger als der beschreibende Vergleich ist es, die konvergente Korrelation als signifikant höher zu verlangen. Der Unterschied von ,60 zu ,54 allein wäre nur die lockere Auslegung.',
          'A stricter requirement than a merely descriptive comparison is that the convergent correlation be significantly higher. The difference from .60 to .54 alone would be only the loose reading.'), true),
      a(P('Streng genügt der Unterschied der Zahlen; locker wird verlangt, dass die konvergente Korrelation signifikant höher ist', 'Strictly the difference in the numbers suffices; loosely it is required that the convergent correlation is significantly higher'),
        P('Das ist vertauscht: Der bloß beschreibende Vergleich ist die lockere Auslegung, signifikant höher zu verlangen ist die strengere.',
          'That is reversed: the merely descriptive comparison is the loose reading, requiring significantly higher is the stricter one.')),
      a(P('Streng entfällt der Vergleich mit der diskriminanten Korrelation; verlangt wird nur eine hohe konvergente Korrelation', 'Strictly the comparison with the discriminant correlation is dropped; only a high convergent correlation is required'),
        P('Der Vergleich bleibt in beiden Auslegungen: Die konvergente Korrelation soll höher sein als die diskriminante, in der strengeren Auslegung sogar signifikant höher.',
          'The comparison stays in both readings: the convergent correlation should be higher than the discriminant one, in the stricter reading even significantly higher.'))
    ],
    hilfe: ['diskriminante-validitaet', 'konvergente-validitaet', 'validitaet'], belege: ['wissen:clark-konvergent-diskriminant-def']
  },
  {
    id: 'fb-kd-mehrfach', thema: 'fragebogenbau', mehrfach: true,
    stamm: P('Es geht um konvergente und diskriminante Validität. Welche Aussagen stimmen? Mehrere können stimmen.',
      'This is about convergent and discriminant validity. Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Konvergente Belege entstehen aus den Zusammenhängen zwischen Messungen derselben Eigenschaft', 'Convergent evidence arises from the relations among measures of the same attribute'),
        P('Konvergente Validität wird geprüft, indem man Zusammenhänge zwischen Messungen desselben Konstrukts betrachtet.', 'Convergent validity is assessed by examining relations among measures of the same construct.'), true),
      a(P('Diskriminante Validität zeigt sich in höheren konvergenten Korrelationen als mit anderen Eigenschaften', 'Discriminant validity shows in convergent correlations that are higher than those with other attributes'),
        P('Sie zeigt sich darin, dass die konvergenten Korrelationen höher sind als die Korrelationen mit Messungen anderer Konstrukte.', 'It shows in convergent correlations being higher than correlations with measures of other constructs.'), true),
      a(P('Eine konvergente Korrelation gilt ab einer festen Höhe als hoch genug, gleich für alle Methoden', 'A convergent correlation counts as high enough from a fixed level, the same for all methods'),
        P('Wie hoch eine konvergente Korrelation sein muss, lässt sich nicht pauschal sagen; es hängt vor allem von der Methode ab.', 'How high a convergent correlation must be cannot be stated generally; it depends mainly on the method.')),
      a(P('Selbst- gegen Fremdbericht liefert ähnlich hohe Korrelationen wie zwei Selbstberichte desselben Konstrukts', 'Self-report against informant report gives similarly high correlations as two self-reports of the same construct'),
        P('Selbst- gegen Fremdbericht liefert niedrigere Werte als zwei Selbstberichte.', 'Self-report against informant report gives lower values than two self-reports.'))
    ],
    hilfe: ['konvergente-validitaet', 'diskriminante-validitaet', 'validitaet'], belege: ['wissen:clark-konvergent-diskriminant-def']
  },
  // ---- Augenscheinvalidität (Beleg testtheorie-augenschein-def und testtheorie-augenschein-verfaelschung; erfundene Beispiele) ----
  {
    id: 'fb-av-eindruck', thema: 'fragebogenbau',
    stamm: P('Eltern halten einen Fragebogen zur Lesefreude schon beim Durchblättern für passend (Augenscheinvalidität, Face Validity). Was sagt das aus?',
      'Parents find a questionnaire on reading enjoyment fitting just from leafing through it (face validity). What does that say?'),
    antworten: [
      a(P('Er wirkt auf Laien auf den ersten Blick passend: Akzeptanz', 'It looks fitting to laypeople at first sight: acceptance'),
        P('Augenscheinvalidität gibt an, inwieweit der Gültigkeitsanspruch eines Tests vom bloßen Augenschein her einem Laien gerechtfertigt erscheint. Sie betrifft die Akzeptanz bei den Testpersonen.',
          'Face validity indicates to what extent the claim of validity of a test appears justified to a layperson at mere first sight. It concerns acceptance by the test takers.'), true),
      a(P('Seine Items bilden die Lesefreude in voller Breite repräsentativ ab', 'Its items represent reading enjoyment in its full breadth'),
        P('Das wäre die Inhaltsvalidität. Sie prüft man nicht am ersten Eindruck, sondern daran, ob die Items das Merkmal in voller Breite repräsentativ abbilden. Beide werden leicht verwechselt.',
          'That would be content validity. It is checked not by the first impression but by whether the items represent the attribute in its full breadth. The two are easily confused.')),
      a(P('Er misst damit nachweislich genau die Lesefreude, die er messen soll', 'It thereby demonstrably measures the reading enjoyment it is meant to measure'),
        P('Der Eindruck ist kein Nachweis. Man darf sich nicht darauf verlassen, welchen Eindruck die Items vermitteln.',
          'The impression is no proof. One must not rely on the impression the items give.'))
    ],
    hilfe: ['augenscheinvaliditaet', 'inhaltsvaliditaet', 'validitaet'], belege: ['wissen:testtheorie-augenschein-def', 'wissen:validitaet-wichtigstes-kriterium']
  },
  {
    id: 'fb-av-inhalt', thema: 'fragebogenbau',
    stamm: P('Ein Test zur Fahrkompetenz besteht nur aus Fragen zu Verkehrsschildern. Für Laien sieht das passend aus (hohe Augenscheinvalidität). Was folgt daraus für die Inhaltsvalidität?',
      'A test of driving competence consists only of questions about road signs. To laypeople that looks fitting (high face validity). What follows for content validity?'),
    antworten: [
      a(P('Sie muss gesondert geprüft werden; der erste Eindruck genügt dafür nicht', 'It has to be checked separately; the first impression is not enough'),
        P('Augenscheinvalidität darf nicht mit Inhaltsvalidität verwechselt werden. Zu prüfen ist, ob die Items das Merkmal in voller Breite repräsentativ abbilden; Vorfahrt oder Bremsen kommen hier gar nicht vor.',
          'Face validity must not be confused with content validity. What has to be checked is whether the items represent the attribute in its full breadth; right of way or braking do not appear here at all.'), true),
      a(P('Sie ist ebenfalls gesichert, denn beides beruht auf demselben Eindruck', 'It is secured as well, since both rest on the same impression'),
        P('Der Eindruck eines Laien ersetzt keine Prüfung der Inhaltsvalidität. Wer beides gleichsetzt, verwechselt sie.',
          'The impression of a layperson does not replace a check of content validity. Anyone who equates the two confuses them.')),
      a(P('Sie ist ausgeschlossen, weil Augenschein und Inhalt einander widersprechen', 'It is ruled out because first sight and content contradict each other'),
        P('Augenscheinvalidität schließt Inhaltsvalidität nicht aus. Der Eindruck sagt nur nichts darüber, ob sie vorliegt.',
          'Face validity does not rule out content validity. The impression just says nothing about whether it is present.'))
    ],
    hilfe: ['augenscheinvaliditaet', 'inhaltsvaliditaet', 'validitaet'], belege: ['wissen:testtheorie-augenschein-def', 'wissen:inhaltsvaliditaet-urteil']
  },
  {
    id: 'fb-av-akzeptanz', thema: 'fragebogenbau',
    stamm: P('Ein Betrieb will, dass Bewerbende seinen Auswahltest als passend zur Stelle erleben. Welche Validitätsart betrifft vor allem diese Akzeptanz bei den Testpersonen?',
      'A company wants applicants to find its selection test fitting for the job. Which kind of validity mainly concerns this acceptance by the test takers?'),
    antworten: [
      a(P('Die Augenscheinvalidität: Die Aufgaben erscheinen Laien erkennbar sinnvoll', 'Face validity: the tasks visibly appear sensible to laypeople'),
        P('Augenscheinvalidität betrifft die Akzeptanz bei den Testpersonen. Sie hilft auch dabei, Ergebnisse zu vermitteln, ersetzt aber nicht die Prüfung der Gültigkeit.',
          'Face validity concerns acceptance by the test takers. It also helps to communicate results but does not replace checking validity.'), true),
      a(P('Die Kriteriumsvalidität: Die Werte hängen mit einem äußeren Maßstab zusammen', 'Criterion validity: the scores are related to an external standard'),
        P('Kriteriumsvalidität ist im einfachsten Fall die Korrelation zwischen Test und Kriterium. Mit der Akzeptanz der Testpersonen hat das nichts zu tun.',
          'In the simplest case criterion validity is the correlation between test and criterion. That has nothing to do with acceptance by the test takers.')),
      a(P('Die Inhaltsvalidität: Die Items bilden das Merkmal repräsentativ ab', 'Content validity: the items represent the attribute'),
        P('Inhaltsvalidität wird durch logische und fachliche Überlegungen beurteilt. Ob Bewerbende den Test akzeptieren, ist eine andere Frage.',
          'Content validity is judged by logical and subject-matter reasoning. Whether applicants accept the test is a different question.'))
    ],
    hilfe: ['augenscheinvaliditaet', 'kriteriumsvaliditaet', 'inhaltsvaliditaet'], belege: ['wissen:testtheorie-augenschein-def', 'wissen:inhaltsvaliditaet-urteil']
  },
  {
    id: 'fb-av-faking', thema: 'fragebogenbau',
    stamm: P('Ein Persönlichkeitsfragebogen für Bewerbungen fragt offen nach Zuverlässigkeit und Teamgeist, sodass jede Person erkennt, welche Antwort gewünscht ist (hohe Augenscheinvalidität). Was ist bei solchen Fragebogen besonders zu bedenken?',
      'A personality questionnaire for job applications asks openly about reliability and team spirit, so that every person sees which answer is wanted (high face validity). What needs particular thought with such questionnaires?'),
    antworten: [
      a(P('Bewerbende durchschauen das Messprinzip und können gezielt vorteilhaft antworten', 'Applicants see through the principle and can deliberately answer in their favour'),
        P('Persönlichkeitsfragebogen sind anfällig für gezieltes Vortäuschen (Faking), insbesondere bei hoher Augenscheinvalidität. Damit ist vor allem zu rechnen, wenn die Testpersonen das Messprinzip durchschauen.',
          'Personality questionnaires are prone to deliberate faking, particularly with high face validity. It is to be expected above all when the test takers see through the measurement principle.'), true),
      a(P('Die Fragen sind zu schwer zu verstehen, sodass die Antworten zufällig werden', 'The questions are too hard to understand, so the answers become random'),
        P('Mangelnde Verständlichkeit ist hier nicht das Thema. Das Problem ist das Vortäuschen: Wer erkennt, was gewünscht ist, kann entsprechend antworten.',
          'Poor comprehensibility is not the issue here. The problem is faking: anyone who recognises what is wanted can answer accordingly.')),
      a(P('Die Antworten fallen ehrlicher aus, weil die Fragen offen auf das Merkmal zielen', 'The answers turn out more honest because the questions aim openly at the attribute'),
        P('Zu erwarten ist das Gegenteil: Wer das Messprinzip durchschaut, erkennt leicht, wie er sich in einem günstigen Licht darstellen kann.',
          'The opposite is to be expected: anyone who sees through the measurement principle easily recognises how to present themselves in a favourable light.'))
    ],
    hilfe: ['faking', 'sozial-erwuenschtheit', 'augenscheinvaliditaet'], belege: ['wissen:testtheorie-augenschein-verfaelschung', 'wissen:testtheorie-augenschein-def']
  },
  {
    id: 'fb-av-mehrfach', thema: 'fragebogenbau', mehrfach: true,
    stamm: P('Es geht um Augenscheinvalidität (Face Validity). Welche Aussagen stimmen? Mehrere können stimmen.',
      'This is about face validity. Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Sie beschreibt, ob ein Test einem Laien auf den ersten Blick gültig erscheint', 'It describes whether a test appears valid to a layperson at first sight'),
        P('Augenscheinvalidität gibt an, inwieweit der Gültigkeitsanspruch eines Tests vom bloßen Augenschein her einem Laien gerechtfertigt erscheint.',
          'Face validity indicates to what extent the claim of validity of a test appears justified to a layperson at mere first sight.'), true),
      a(P('Ein Test mit hoher Augenscheinvalidität kann trotzdem eine geringe Inhaltsvalidität haben', 'A test with high face validity can still have low content validity'),
        P('Der Eindruck ersetzt nicht die Prüfung, ob das Merkmal in voller Breite repräsentativ abgebildet wird.',
          'The impression does not replace checking whether the attribute is represented in its full breadth.'), true),
      a(P('Augenscheinvalidität und Inhaltsvalidität sind dasselbe, nur mit zwei Namen', 'Face validity and content validity are the same thing with two names'),
        P('Sie dürfen nicht verwechselt werden, obwohl das leicht passiert: Die eine betrifft den Eindruck eines Laien, die andere die repräsentative Abbildung des Merkmals.',
          'They must not be confused, although that happens easily: one concerns the impression of a layperson, the other the representative coverage of the attribute.')),
      a(P('Hohe Augenscheinvalidität schützt Persönlichkeitsfragebogen vor Verfälschung', 'High face validity protects personality questionnaires against faking'),
        P('Persönlichkeitsfragebogen sind besonders anfällig für Verzerrungen, wenn sie eine hohe Augenscheinvalidität besitzen.',
          'Personality questionnaires are particularly prone to distortion if they have high face validity.'))
    ],
    hilfe: ['augenscheinvaliditaet', 'inhaltsvaliditaet', 'faking'], belege: ['wissen:testtheorie-augenschein-def', 'wissen:testtheorie-augenschein-verfaelschung']
  },
  // ---- Inhalt und Zahlen abwägen (Fall: sechs Items, drei Komponenten; Skala aus N1, N2, N4) ----
  {
    id: 'fb-iz-negativ', thema: 'fragebogenbau', fall: IZ,
    stamm: P(`Angenommen, eine Ladung gilt als Zugehörigkeit, wenn ihr Betrag mindestens ${zd('regel_ladung_aus')} beträgt. Was sagt die Ladung von A2 auf Komponente 2 aus?`,
      `Assume a loading counts as belonging if its absolute size is at least ${ze('regel_ladung_aus')}. What does the loading of A2 on component 2 say?`),
    antworten: [
      a(P('A2 gehört zu Komponente 2; das Minus zeigt die Gegenrichtung zu A1', 'A2 belongs to component 2; the minus shows the opposite direction to A1'),
        P(`Für die Zugehörigkeit zählt der Betrag der Ladung (${za('ib_a2_k2')}). Das Minus heißt: A2 hängt mit der Komponente negativ zusammen, A1 positiv. Das passt zu den Texten, denn A1 und A2 sind gegenläufig formuliert.`,
          `For belonging, the absolute size of the loading counts (${zae('ib_a2_k2')}). The minus means: A2 is related to the component negatively, A1 positively. That fits the wording, since A1 and A2 are worded in opposite directions.`), true),
      a(P('A2 gehört zu keiner Komponente, weil eine negative Ladung nichts zählt', 'A2 belongs to no component because a negative loading counts for nothing'),
        P('Für die Zugehörigkeit zählt der Betrag der Ladung, das Vorzeichen zeigt nur die Richtung. Ein Minus macht eine Ladung also nicht unwichtig.',
          'For belonging, the absolute size of the loading counts; the sign only shows the direction. A minus therefore does not make a loading unimportant.')),
      a(P('A2 ist ein Fehler im Fragebogen und sollte wegen des Minus gelöscht werden', 'A2 is a flaw in the questionnaire and should be deleted because of the minus'),
        P('Ein Minus allein ist kein Grund zum Löschen. Wie bei einer negativen Trennschärfe werden zuerst Formulierung und Umpolung geprüft; hier erklärt der Wortlaut von A2 das Minus.',
          'A minus alone is no reason to delete. As with a negative item-total correlation, wording and reverse-coding are checked first; here the wording of A2 explains the minus.'))
    ],
    hilfe: ['ladung', 'umpolen'], belege: ['wissen:fa-negative-ladung', 'wissen:fa-ladung-05', 'wissen:negative-trennschaerfe-ursache', 'Hilfe:umpolen']
  },
  {
    id: 'fb-iz-doppel', thema: 'fragebogenbau', fall: IZ,
    stamm: P(`Angenommen, ein Item gilt als Kandidat zum Streichen, wenn es auf zwei Komponenten mit einem Betrag ab ${zd('regel_ladung_aus')} lädt. Welche Aussage zur Ladungsmatrix stimmt?`,
      `Assume an item counts as a candidate for deletion if it loads on two components with an absolute size of ${ze('regel_ladung_aus')} or more. Which statement about the loading matrix is correct?`),
    antworten: [
      a(P(`N4 lädt auf Komponente 1 (${zd('ib_n4_k1')}) und auf 3 (${zd('ib_n4_k3')}) und wird Kandidat`, `N4 loads on component 1 (${ze('ib_n4_k1')}) and on component 3 (${ze('ib_n4_k3')}) and becomes a candidate`),
        P('Beide Ladungen liegen über der gesetzten Grenze, und sie sind ähnlich hoch. Das Item lässt sich nicht klar einer Komponente zuordnen; Items mit ähnlich hoher oder höherer Ladung auf einem anderen Faktor gelten als Kandidaten zum Streichen.',
          'Both loadings lie above the set limit, and they are similarly high. The item cannot be assigned clearly to one component; items with a similarly high or higher loading on another factor count as candidates for deletion.'), true),
      a(P('N4 gehört eindeutig zu Komponente 1, denn dort steht seine höchste Ladung', 'N4 clearly belongs to component 1 because its highest loading is there'),
        P(`Die zweite Ladung (${zd('ib_n4_k3')}) liegt ebenfalls über der Grenze. Die höchste Ladung allein macht die Zuordnung nicht eindeutig, wenn eine zweite fast so hoch ist.`,
          `The second loading (${ze('ib_n4_k3')}) also lies above the limit. The highest loading alone does not make the assignment clear if a second one is almost as high.`)),
      a(P('A2 lädt auf zwei Komponenten, weil seine Ladung negativ ist, und wird Kandidat', 'A2 loads on two components because its loading is negative and becomes a candidate'),
        P('Eine negative Ladung ist keine zweite Ladung. A2 hat nur auf Komponente 2 einen Betrag über der Grenze, die übrigen Zellen sind ausgeblendet.',
          'A negative loading is not a second loading. A2 has an absolute size above the limit on component 2 only; the other cells are hidden.'))
    ],
    hilfe: ['ladung', 'hauptkomponenten'], belege: ['wissen:clark-ladungsgrenzen-itemauswahl', 'wissen:fa-ladung-05', 'wissen:fa-negative-ladung']
  },
  {
    id: 'fb-iz-zahlen', thema: 'fragebogenbau', fall: IZ,
    stamm: P(`Die Skala aus N1, N2 und N4 hat ein Alpha von ${zd('ib_alpha3', 3)}. Angenommen, nach den Zahlen allein kommt das Item zum Löschen in Frage, bei dessen Wegfall Alpha am höchsten wird. Welches ist es?`,
      `The scale made of N1, N2 and N4 has an alpha of ${ze('ib_alpha3', 3)}. Assume that, by the numbers alone, the item whose removal gives the highest alpha is the one to consider deleting. Which one is it?`),
    antworten: [
      a(P(`N4: Ohne dieses Item steigt Alpha auf ${zd('ib_n4_ad', 3)}, und seine Korrelation ist die niedrigste`, `N4: without this item alpha rises to ${ze('ib_n4_ad', 3)}, and its correlation is the lowest`),
        P(`Die Spalte Alpha ohne Item zeigt Alpha nach dem Weglassen. Nur bei N4 liegt der Wert (${zd('ib_n4_ad', 3)}) über dem Alpha aller drei Items. Auch die korrigierte Korrelation, bei der das Item aus der Summe herausgenommen ist, ist hier am niedrigsten (${zd('ib_n4_r', 3)}).`,
          `The column alpha if item deleted shows alpha after leaving the item out. Only for N4 does the value (${ze('ib_n4_ad', 3)}) lie above the alpha of all three items. The corrected correlation, with the item taken out of the sum, is also lowest here (${ze('ib_n4_r', 3)}).`), true),
      a(P(`N1: Ohne dieses Item fällt Alpha am weitesten, nämlich von ${zd('ib_alpha3', 3)} auf ${zd('ib_n1_ad', 3)}`, `N1: without this item alpha falls furthest, namely from ${ze('ib_alpha3', 3)} to ${ze('ib_n1_ad', 3)}`),
        P('Fällt Alpha ohne ein Item stark, trägt das Item viel zur Skala bei und bleibt. Zum Löschen kommt das Item in Frage, bei dessen Wegfall Alpha am höchsten wird.',
          'If alpha falls strongly without an item, the item contributes much to the scale and stays. The item to consider deleting is the one whose removal gives the highest alpha.')),
      a(P(`N2: Seine korrigierte Korrelation ist mit ${zd('ib_n2_r', 3)} hoch, und hohe Werte sprechen fürs Löschen`, `N2: its corrected correlation is high at ${ze('ib_n2_r', 3)}, and high values speak for deletion`),
        P('Eine hohe korrigierte Korrelation heißt, dass das Item gut zu den übrigen passt. Auffällig sind niedrige Werte, nicht hohe.',
          'A high corrected correlation means that the item fits the others well. Low values are conspicuous, not high ones.'))
    ],
    hilfe: ['trennschaerfe', 'cronbach-alpha'], belege: ['wissen:alpha-if-deleted-definition', 'wissen:trennschaerfe-part-whole', 'wissen:trennschaerfe-lesart']
  },
  {
    id: 'fb-iz-inhalt', thema: 'fragebogenbau', fall: IZ,
    stamm: P('Die Skala soll Ärger und Niedergeschlagenheit erfassen. Nach den Zahlen steht N4 („Ich bin oft niedergeschlagen“) zum Streichen an. Was spricht inhaltlich dagegen?',
      'The scale is meant to capture anger and low mood. By the numbers, N4 ("I often feel down") is up for deletion. What speaks against it in terms of content?'),
    antworten: [
      a(P('N4 ist das einzige Item zur Niedergeschlagenheit; ohne es misst die Skala nur Ärger', 'N4 is the only item on low mood; without it the scale measures only anger'),
        P(`Eine Streichung braucht eine inhaltliche Begründung und folgt nicht dem Programmvorschlag. Ohne N4 blieben nur N1 und N2 zum Ärger. Alpha stiege auf ${zd('ib_n4_ad', 3)}, doch die Skala würde enger: Fast gleiche Items treiben Alpha hoch, messen aber nur einen Ausschnitt.`,
          `A deletion needs a reason from the content and does not follow the programme's suggestion. Without N4 only N1 and N2 on anger would remain. Alpha would rise to ${ze('ib_n4_ad', 3)}, but the scale would become narrower: almost identical items drive alpha up but measure only a part.`), true),
      a(P('Dagegen spricht, dass Alpha ohne N4 sinken würde und die Skala schlechter wird', 'It speaks against it that alpha would fall without N4 and the scale would get worse'),
        P(`Die Tabelle zeigt das Gegenteil: Ohne N4 liegt Alpha bei ${zd('ib_n4_ad', 3)} statt ${zd('ib_alpha3', 3)}. Der Einwand liegt im Inhalt, nicht in einem sinkenden Alpha.`,
          `The table shows the opposite: without N4 alpha is ${ze('ib_n4_ad', 3)} instead of ${ze('ib_alpha3', 3)}. The objection lies in the content, not in a falling alpha.`)),
      a(P('Dagegen spricht nichts, weil bei der Auswahl der Items die Zahlen allein entscheiden', 'Nothing speaks against it because the numbers alone decide in choosing items'),
        P('Eine Auswahl rein nach Kennzahlen, ohne Auseinandersetzung mit dem Inhalt, ist nicht zweckmäßig. Die Zahlen geben den Hinweis, der Inhalt gehört in die Abwägung.',
          'A selection purely by statistics, without engaging with the content, is not appropriate. The numbers give the hint; the content belongs in the weighing.'))
    ],
    hilfe: ['itemanalyse', 'cronbach-alpha', 'skala'], belege: ['wissen:itemselektion-nicht-mechanisch', 'wissen:alpha-inflation-trimmen', 'wissen:reliabilitaet-attenuationsparadox']
  },
  {
    id: 'fb-iz-trimmen', thema: 'fragebogenbau', fall: IZ,
    stamm: P(`N4 wird gestrichen, und Alpha steigt auf ${zd('ib_n4_ad', 3)}. Das Item wurde an denselben ${zn('ib_n')} Personen ausgewählt, an denen Alpha berechnet ist. Was gilt für diesen Wert?`,
      `N4 is deleted and alpha rises to ${ze('ib_n4_ad', 3)}. The item was chosen on the same ${zn('ib_n')} people on whom alpha is computed. What applies to this value?`),
    antworten: [
      a(P('Er ist vermutlich zu hoch, weil die Skala an denselben Daten zurechtgestutzt wurde', 'It is probably too high because the scale was trimmed on the same data'),
        P('Wird eine Skala an derselben Stichprobe getrimmt, überschätzt man Alpha. Besser trennt man eine Stichprobe zum Auswählen von einer zum Überprüfen.',
          'If a scale is trimmed on the same sample, alpha is overestimated. It is better to separate one sample for choosing from one for checking.'), true),
      a(P('Er zeigt, dass die gekürzte Skala besser misst, denn ein höheres Alpha heißt mehr Qualität', 'It shows the shortened scale measures better, as a higher alpha means quality'),
        P('Ein höheres Alpha heißt nicht, dass die Skala besser ist. Das Löschen des Items mit dem größten Alpha-Zuwachs kann sogar die Reliabilität und die Kriteriumsvalidität senken.',
          'A higher alpha does not mean that the scale is better. Deleting the item with the largest alpha gain can even lower reliability and criterion validity.')),
      a(P('Er gilt als gesichert, weil die Streichung vom Programm vorgeschlagen wurde', 'It counts as secure because the programme suggested the deletion'),
        P('Der Vorschlag eines Programms ersetzt die Begründung nicht. Eine Streichung braucht eine theoretische Begründung und folgt nicht mechanisch dem Programm.',
          'A programme\'s suggestion does not replace the reasoning. A deletion needs a theoretical reason and does not follow the programme mechanically.'))
    ],
    hilfe: ['cronbach-alpha', 'itemanalyse'], belege: ['wissen:alpha-inflation-trimmen', 'wissen:alpha-if-deleted-unzuverlaessig']
  },
  {
    id: 'fb-iz-reihenfolge', thema: 'fragebogenbau', fall: IZ,
    stamm: P('N4 fällt nach den Zahlen auf. Wie geht man sinnvoll weiter?', 'N4 stands out by the numbers. How does one sensibly proceed?'),
    antworten: [
      a(P('Die Zahlen als Hinweis nehmen, den Inhalt abwägen und dann erst entscheiden', 'Take the numbers as a hint, weigh the content of the item and only then decide'),
        P('Hohe Trennschärfen sind nur ein grober Hinweis auf Eindimensionalität, die Auswahl braucht den Inhalt. Sie verlangt die inhaltliche Auseinandersetzung, und nach jeder Streichung werden Werte und Trennschärfen neu berechnet.',
          'High item-total correlations are only a rough hint at unidimensionality; the selection needs the content. It requires engagement with the content, and after every deletion the scores and item-total correlations are recomputed.'), true),
      a(P('N4 sofort streichen, weil das Programm es vorschlägt und Alpha dadurch steigt', 'Delete N4 at once because the programme suggests it and alpha rises as a result'),
        P('Der Programmvorschlag ist kein Grund. Das Löschen des Items mit dem größten Alpha-Zuwachs kann die Reliabilität sogar senken, und es hängt von den übrigen Items ab.',
          'The programme\'s suggestion is no reason. Deleting the item with the largest alpha gain can even lower reliability, and the change depends on the other items.')),
      a(P('Die Zahlen übergehen und allein nach dem Wortlaut des Items entscheiden, nicht nach Werten', 'Ignore the numbers and decide by the wording of the item alone'),
        P('Die Zahlen zeigen, welche Items auffallen. Der Wortlaut allein ersetzt sie nicht; beides gehört zusammen in die Abwägung.',
          'The numbers show which items stand out. The wording alone does not replace them; both belong together in the weighing.'))
    ],
    hilfe: ['itemanalyse', 'trennschaerfe'], belege: ['wissen:itemselektion-nicht-mechanisch', 'wissen:alpha-if-deleted-unzuverlaessig', 'wissen:alpha-inflation-trimmen']
  },
  {
    id: 'fb-iz-mehrfach', thema: 'fragebogenbau', fall: IZ, mehrfach: true,
    stamm: P('Es geht um das Streichen von Items nach Ladungen und Alpha. Welche Aussagen stimmen? Mehrere können stimmen.',
      'This is about deleting items on the basis of loadings and alpha. Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Nach dem Streichen eines Items werden Trennschärfen und Alpha neu berechnet', 'After deleting an item, item-total correlations and alpha are recomputed'),
        P('Nach jeder Selektion werden Testwerte und Trennschärfen neu berechnet; die alten Werte gelten für die frühere Itemmenge.', 'After every selection, scores and item-total correlations are recomputed; the old values belong to the earlier set of items.'), true),
      a(P('Eine Streichung braucht eine inhaltliche Begründung und nicht nur den Programmvorschlag', 'A deletion needs a reason from the content and not just the programme suggestion'),
        P('Eine Item-Löschung braucht eine theoretische Begründung und sollte nicht mechanisch dem Programmvorschlag folgen.', 'A deletion of an item needs a theoretical reason and should not follow the programme suggestion mechanically.'), true),
      a(P('Wer das Item mit dem größten Alpha-Zuwachs streicht, verbessert die Skala auf jeden Fall', 'Whoever deletes the item with the largest alpha gain improves the scale in any case'),
        P('Das Löschen kann Reliabilität und Kriteriumsvalidität senken. Alpha misst die Reliabilität schon in der Population nicht richtig, und der Zuwachs ist ein Stichprobenwert.', 'Deleting can lower reliability and criterion validity. Alpha does not measure reliability correctly even in the population, and the gain is a sample value.')),
      a(P('Eine negative Ladung ist ein sicherer Grund, das Item aus der Skala zu löschen', 'A negative loading is a sure reason to delete the item from the scale'),
        P('Eine negative Ladung zeigt nur die Richtung; für die Relevanz zählt der Betrag. Bei gegenläufig formulierten Items ist das Minus zu erwarten.', 'A negative loading only shows the direction; for relevance the absolute size counts. For items worded in the opposite direction the minus is to be expected.'))
    ],
    hilfe: ['itemanalyse', 'ladung', 'cronbach-alpha'], belege: ['wissen:itemselektion-nicht-mechanisch', 'wissen:alpha-inflation-trimmen', 'wissen:alpha-if-deleted-unzuverlaessig', 'wissen:fa-negative-ladung']
  },

  // ---- Vom Fragebogen zur Skala (fünf Items zur Geselligkeit, Schritt für Schritt) ----
  {
    id: 'fb-ga-start', thema: 'fragebogenbau',
    tabelle: tab('fb-ga-start', [KOPF_ITEM, P('Korrigierte Item-Skala-Korrelation', 'Corrected item-total correlation'), P('Cronbachs Alpha ohne Item', 'Cronbach\'s alpha if item deleted')], QUELLE_E,
      P('Rohe Antworten der fünf Items, noch nicht umgepolt', 'Raw answers of the five items, not yet reverse-coded')),
    stamm: P(`Fünf Items sollen eine Skala zur Geselligkeit bilden: E1 „Ich rede eher wenig“, E2 „Es fällt mir schwer, auf andere zuzugehen“, E3 „Ich gewinne leicht Menschen für mich“, E4 „Ich finde schnell Freunde“, E5 „Ich übernehme gern die Führung“. Mit den rohen Antworten ist Alpha ${zd('ga_alpha0', 3)}, die Korrelationen sind negativ oder nahe null. Welcher Schritt kommt als Nächstes?`,
      `Five items are meant to form a scale on sociability: E1 "I tend to talk little", E2 "I find it hard to approach others", E3 "I easily win people over", E4 "I make friends quickly", E5 "I like to take charge". With the raw answers alpha is ${ze('ga_alpha0', 3)}, and the correlations are negative or near zero. Which step comes next?`),
    antworten: [
      a(P('E1 und E2 sind gegenläufig formuliert: Sie werden umgepolt, dann neu gerechnet', 'E1 and E2 are worded oppositely: they are reverse-coded and then recomputed'),
        P('Negative Trennschärfen und ein negatives Alpha entstehen oft durch eine vergessene Umpolung. Für Alpha werden gegenläufige Items umkodiert, hier mit 7 minus Wert, weil die Antworten von 1 bis 6 gehen.',
          'Negative item-total correlations and a negative alpha often arise from a forgotten reverse-coding. For alpha, opposite items are recoded, here with 7 minus value because the answers run from 1 to 6.'), true),
      a(P('Alle fünf Items streichen, weil Alpha negativ ist und die Skala also nichts misst', 'Delete all five items because alpha is negative and the scale measures nothing'),
        P('Ein negatives Alpha heißt nicht, dass die Items unbrauchbar sind. Ein negativ formuliertes Item ohne Umpolung kann es verursachen; zuerst werden Formulierung und Umpolung geprüft.',
          'A negative alpha does not mean the items are useless. A negatively worded item without reverse-coding can cause it; wording and reverse-coding are checked first.')),
      a(P('Den Skalenwert bilden und die Korrelationen der Items später ansehen', 'Form the scale score and look at the item correlations only later'),
        P('Der Summenwert ist nur sinnvoll, wenn die Items dasselbe Merkmal in derselben Richtung messen. Mit nicht umgepolten Items würden sich E1 und E2 gegen die anderen aufheben.',
          'The sum score makes sense only if the items measure the same attribute in the same direction. With items not reverse-coded, E1 and E2 would cancel against the others.'))
    ],
    hilfe: ['umpolen', 'trennschaerfe', 'cronbach-alpha'], belege: ['wissen:alpha-negativ-moeglich', 'wissen:negative-trennschaerfe-ursache', 'wissen:umpolen-verfahren', 'wissen:testtheorie-testwert-summe', 'Hilfe:daten-vorbereiten', 'Code:lib/skalabau.ts']
  },
  {
    id: 'fb-ga-umgepolt', thema: 'fragebogenbau',
    tabelle: tab('fb-ga-umgepolt', [KOPF_ITEM, P('Mittelwert vor dem Umpolen', 'Mean before reverse-coding'), P('Mittelwert nach dem Umpolen', 'Mean after reverse-coding')], QUELLE_E,
      P('Mittelwerte der fünf Items, E1 und E2 umgepolt', 'Means of the five items, E1 and E2 reverse-coded')),
    stamm: P('E1 und E2 sind umgepolt (7 minus Wert), die Tabelle zeigt die Mittelwerte vorher und nachher. Welcher Schritt kommt als Nächstes?',
      'E1 and E2 are reverse-coded (7 minus value); the table shows the means before and after. Which step comes next?'),
    antworten: [
      a(P('Erster Blick auf die Dimensionen, z. B. mit der Hauptkomponentenanalyse (allein genügt sie nicht)', 'First look at the dimensions, e.g. with the principal component analysis (on its own it is not enough)'),
        P('Alpha setzt Eindimensionalität voraus, und die Prüfung der Dimensionen gehört in faktorenanalytische Verfahren. Der erste Blick mit der Hauptkomponentenanalyse kommt darum vor der Reliabilität; allein belegt sie die Eindimensionalität nicht. Sie ginge auch mit den rohen Antworten; E1 und E2 hätten dann eine negative Ladung.',
          'Alpha requires unidimensionality, and checking the dimensions belongs to factor-analytic methods. The first look with the principal component analysis therefore comes before reliability; on its own it does not establish unidimensionality. It would also work with the raw answers; E1 and E2 would then have a negative loading.'), true),
      a(P('Cronbachs Alpha berechnen; ist es hoch, ist eine Komponente belegt', 'Compute Cronbach\'s alpha; if it is high, one component is confirmed'),
        P('Ein hohes Alpha beweist keine Eindimensionalität: Eine Skala mit einem Faktor und eine mit zwei Konstrukten können dasselbe Alpha haben.',
          'A high alpha does not prove unidimensionality: a scale with one factor and one with two constructs can have the same alpha.')),
      a(P('Den endgültigen Skalenwert bilden, denn die Mittelwerte zeigen nun in dieselbe Richtung', 'Form the final scale score, since the means now point in the same direction'),
        P('Dass die Mittelwerte zusammenpassen, sagt nichts über die Dimensionen. Die Summe ist nur sinnvoll, wenn die Items dasselbe Merkmal messen.',
          'That the means fit together says nothing about the dimensions. The sum makes sense only if the items measure the same attribute.'))
    ],
    hilfe: ['faktorenanalyse', 'eindimensionalitaet', 'hauptkomponenten'], belege: ['wissen:alpha-voraussetzungen', 'wissen:alpha-nicht-eindimensionalitaet', 'wissen:itemselektion-nicht-mechanisch', 'wissen:testtheorie-testwert-summe', 'wissen:cortina-alpha-aussage-grenzen']
  },
  {
    id: 'fb-ga-dimension', thema: 'fragebogenbau',
    tabelle: tab('fb-ga-dimension', [KOPF_ITEM, P('Ladung auf Komponente 1', 'Loading on component 1'), P('Kommunalität', 'Communality')], QUELLE_E,
      P('Hauptkomponentenanalyse der umgepolten Items, eine Komponente', 'Principal component analysis of the reverse-coded items, one component')),
    stamm: P(`Angenommen, es bleiben Komponenten mit einem Eigenwert über 1. Die erste Komponente hat den Eigenwert ${zd('ga_ev1')}, die zweite ${zd('ga_ev2')}; die Tabelle zeigt die Ladungen auf der ersten. Welcher Schritt kommt als Nächstes?`,
      `Assume that components with an eigenvalue above 1 are kept. The first component has the eigenvalue ${ze('ga_ev1')}, the second ${ze('ga_ev2')}; the table shows the loadings on the first. Which step comes next?`),
    antworten: [
      a(P('Die Items prüfen: Trennschärfen und Alpha ohne Item ansehen', 'Check the items: item-total correlations and alpha per item'),
        P(`Mit der gesetzten Regel bleibt es bei einer Komponente, und alle Ladungen sind hoch (${zd('ga_lmin')} bis ${zd('ga_lmax')}). Nun folgt die Itemanalyse: Trennschärfe, Selektion und Reliabilität. Der Skalenwert kommt erst danach.`,
          `With the rule set, one component remains, and all loadings are high (${ze('ga_lmin')} to ${ze('ga_lmax')}). Next comes the item analysis: item-total correlation, selection and reliability. The scale score comes only afterwards.`), true),
      a(P('Eine zweite Komponente aufnehmen, damit mehr Varianz erklärt wird', 'Add a second component so that more of the variance can be explained'),
        P(`Mit der gesetzten Regel bleibt es bei einer Komponente, denn die zweite hat nur ${zd('ga_ev2')}. Eine weitere Komponente würde zwar mehr Varianz erklären, aber nach der gesetzten Regel nicht als eigene Komponente zählen.`,
          `With the rule set, one component remains, since the second has only ${ze('ga_ev2')}. A further component would explain more variance but, by the rule set, would not count as a component of its own.`)),
      a(P('Den endgültigen Skalenwert bilden und die Items erst danach genauer prüfen', 'Form the final scale score and then check the individual items afterwards'),
        P('Zur Itemanalyse gehören Trennschärfe und Selektion, danach werden die Testwerte neu bestimmt. Die Prüfung der Items liegt vor dem endgültigen Skalenwert.',
          'The item analysis includes item-total correlation and selection, after which the test scores are determined anew. Checking the items comes before the final scale score.'))
    ],
    hilfe: ['hauptkomponenten', 'eigenwert', 'itemanalyse'], belege: ['wissen:itemanalyse-schritte', 'wissen:fa-ladung-definition', 'wissen:testtheorie-testwert-summe']
  },
  {
    id: 'fb-ga-items', thema: 'fragebogenbau',
    tabelle: tab('fb-ga-items', [KOPF_ITEM, P('Korrigierte Item-Skala-Korrelation', 'Corrected item-total correlation'), P('Cronbachs Alpha ohne Item', 'Cronbach\'s alpha if item deleted')], QUELLE_E,
      P('Itemstatistik der fünf umgepolten Items', 'Item statistics of the five reverse-coded items')),
    stamm: P(`Alpha der fünf Items beträgt ${zd('ga_alpha1', 3)}. E5 hat die niedrigste korrigierte Korrelation (${zd('ga_e5_r', 3)}). Angenommen, ein Item wird nur dann gestrichen, wenn Alpha dadurch steigt. Welcher Schritt kommt als Nächstes?`,
      `Alpha of the five items is ${ze('ga_alpha1', 3)}. E5 has the lowest corrected correlation (${ze('ga_e5_r', 3)}). Assume that an item is deleted only if alpha rises as a result. Which step comes next?`),
    antworten: [
      a(P('Alle fünf Items behalten und den Skalenwert bilden, denn Weglassen senkt Alpha', 'Keep all five items and form the scale score; leaving one out lowers alpha'),
        P(`In jeder Zeile liegt Alpha ohne das Item (${zd('ga_adlo', 3)} bis ${zd('ga_adhi', 3)}) unter dem Alpha aller fünf Items. Nach der gesetzten Regel wird nichts gestrichen; danach folgt der Skalenwert.`,
          `In every row, alpha without the item (${ze('ga_adlo', 3)} to ${ze('ga_adhi', 3)}) lies below the alpha of all five items. By the rule set, nothing is deleted; the scale score follows.`), true),
      a(P('E5 streichen, denn es hat die niedrigste korrigierte Korrelation der fünf Items', 'Delete E5 because it has the lowest corrected correlation of the five items'),
        P(`Ohne E5 sänke Alpha von ${zd('ga_alpha1', 3)} auf ${zd('ga_e5_ad', 3)}. Eine Auswahl allein nach der niedrigsten Zahl ist nicht zweckmäßig.`,
          `Without E5 alpha would fall from ${ze('ga_alpha1', 3)} to ${ze('ga_e5_ad', 3)}. Choosing only by the lowest number is not appropriate.`)),
      a(P('E1 und E2 noch einmal umpolen, damit die Korrelationen noch höher werden', 'Reverse-code E1 and E2 once more so that the correlations become higher still'),
        P('Alle Korrelationen sind schon positiv, die Umpolung ist erledigt. Ein zweites Umpolen würde die Richtung wieder umdrehen und die Korrelationen ins Negative bringen.',
          'All correlations are already positive; the reverse-coding is done. A second reverse-coding would turn the direction around again and make the correlations negative.'))
    ],
    hilfe: ['trennschaerfe', 'cronbach-alpha', 'skalenwert'], belege: ['wissen:alpha-if-deleted-definition', 'wissen:itemselektion-nicht-mechanisch', 'wissen:negative-trennschaerfe-ursache']
  },
  {
    id: 'fb-ga-reihenfolge', thema: 'fragebogenbau',
    stamm: P('Aus den Antworten eines Fragebogens soll eine Skala entstehen. Welche Reihenfolge der Schritte ist sinnvoll?',
      'A scale is to be built from the answers to a questionnaire. Which order of steps makes sense?'),
    antworten: [
      a(P('Faktorenanalyse, gegenläufige Items umpolen, Alpha und Items prüfen, endgültigen Skalenwert bilden', 'Factor analysis, reverse-code opposite items, check alpha and items, form the final scale score'),
        P('Alpha setzt Eindimensionalität voraus, die Faktorenanalyse kommt also vor der Reliabilität. Für sie ist Umpolen nicht nötig: Ein gegenläufiges Item lädt dann negativ, es zählt der Betrag. Für Alpha und den Summenwert muss die Richtung stimmen; umgepolt wird spätestens davor, gern schon beim Aufbau der Datenmatrix.',
          'Alpha requires unidimensionality, so the factor analysis comes before reliability. Reverse-coding is not needed for it: an opposite item then loads negatively, and the absolute size counts. For alpha and the sum score the direction must fit; reverse-coding happens before them at the latest, preferably when the data matrix is built.'), true),
      a(P('Endgültigen Skalenwert bilden, Alpha berechnen, gegenläufige Items umpolen, Faktorenanalyse', 'Final scale score, compute alpha, reverse-code opposite items, factor analysis last'),
        P('So steckt die fehlende Umpolung schon im endgültigen Skalenwert und im Alpha. Invertierte Items werden vor Alpha und dem Summenwert umkodiert, und die Dimensionen werden vor der Reliabilität geprüft.',
          'The missing reverse-coding is then already in the final scale score and in alpha. Inverted items are recoded before alpha and the sum score, and the dimensions are checked before reliability.')),
      a(P('Alpha berechnen, Items umpolen, endgültigen Skalenwert bilden, Faktorenanalyse zur Kontrolle', 'Compute alpha, reverse-code items, form the final scale score, factor analysis as a check'),
        P('Alpha vor dem Umpolen ist verzerrt, und die Dimensionen werden erst nach dem endgültigen Skalenwert geprüft. Die Summe ist aber nur sinnvoll, wenn die Items dasselbe Merkmal messen.',
          'Alpha before the reverse-coding is distorted, and the dimensions are checked only after the final scale score. The sum, however, makes sense only if the items measure the same attribute.'))
    ],
    hilfe: ['umpolen', 'faktorenanalyse', 'reliabilitaet', 'skalenwert'], belege: ['wissen:umpolen-verfahren', 'wissen:fa-negative-ladung', 'wissen:alpha-voraussetzungen', 'wissen:itemanalyse-schritte', 'wissen:testtheorie-testwert-summe']
  },
  {
    id: 'fb-ga-mehrfach', thema: 'fragebogenbau', mehrfach: true,
    stamm: P('Es geht um den Weg vom Fragebogen zur Skala. Welche Aussagen stimmen? Mehrere können stimmen.',
      'This is about the way from questionnaire to scale. Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Gegenläufige Items werden vor Alpha und dem Summenwert umgepolt, damit die Richtung stimmt', 'Opposite items are reverse-coded before alpha and the sum score so that the direction fits'),
        P('Für Alpha und den Summenwert muss die Richtung stimmen. Für die Faktorenanalyse ist Umpolen nicht nötig, dort zählt der Betrag der Ladung.', 'For alpha and the sum score the direction must fit. Reverse-coding is not needed for the factor analysis; there the absolute size of the loading counts.'), true),
      a(P('Die Eindimensionalität wird geprüft, bevor man Alpha als Reliabilität deutet', 'Unidimensionality is checked before alpha is interpreted as reliability'),
        P('Als Reliabilitätsschätzer setzt Alpha Eindimensionalität voraus; die Prüfung gehört in faktorenanalytische Verfahren.', 'As an estimator of reliability, alpha requires unidimensionality; checking it belongs to factor-analytic methods.'), true),
      a(P('Ein hohes Alpha ersetzt die Faktorenanalyse, weil es die Zahl der Dimensionen zeigt', 'A high alpha replaces the factor analysis because it shows the number of dimensions'),
        P('Ein hohes Alpha beweist keine Eindimensionalität. Interne Konsistenz ist notwendig, aber nicht hinreichend für Homogenität.', 'A high alpha does not prove unidimensionality. Internal consistency is necessary but not sufficient for homogeneity.')),
      a(P('Ein auffälliges Item wird gestrichen, ohne dass sein Inhalt eine Rolle spielt', 'A conspicuous item is deleted without its content playing any part in it'),
        P('Eine Selektion rein nach Kennzahlen ohne inhaltliche Auseinandersetzung ist nicht zweckmäßig.', 'A selection purely by statistics without engaging with the content is not appropriate.'))
    ],
    hilfe: ['umpolen', 'faktorenanalyse', 'reliabilitaet', 'itemanalyse'], belege: ['wissen:umpolen-verfahren', 'wissen:fa-negative-ladung', 'wissen:alpha-voraussetzungen', 'wissen:alpha-nicht-eindimensionalitaet', 'wissen:cortina-schmitt-konsistenz-homogenitaet', 'wissen:itemselektion-nicht-mechanisch']
  },

  // ---- Skalenwert als Mittelwert (Gewissenhaftigkeit, echte Zeilen) ----
  {
    id: 'fb-sm-werte', thema: 'fragebogenbau',
    tabelle: tab('fb-sm-werte', [P('Person', 'Person'), P('C1', 'C1'), P('C2', 'C2'), P('C3', 'C3'), P('C4', 'C4'), P('C5', 'C5'), P('C4 umgepolt', 'C4 reverse-coded'), P('C5 umgepolt', 'C5 reverse-coded')], QUELLE_C,
      P('Vier Personen, Antworten 1 bis 6, C4 und C5 umgepolt', 'Four persons, answers 1 to 6, C4 and C5 reverse-coded')),
    stamm: P('Die Gewissenhaftigkeit wird mit fünf Items erfasst: C1 „Ich arbeite genau“, C2 „Ich bleibe dran, bis es perfekt ist“, C3 „Ich gehe nach Plan vor“, C4 „Ich erledige Dinge nur halbherzig“, C5 „Ich vertrödele meine Zeit“. Der Skalenwert ist der Mittelwert der fünf Items, C4 und C5 zählen umgepolt. Wie groß ist er für Person 2?',
      'Conscientiousness is captured with five items: C1 "I work precisely", C2 "I keep going until it is perfect", C3 "I follow a plan", C4 "I do things only half-heartedly", C5 "I waste my time". The scale score is the mean of the five items, with C4 and C5 counted reverse-coded. How large is it for person 2?'),
    antworten: [
      a(P(`${zd('sm_p2_mw', 1)}: der Mittelwert aus C1, C2, C3 und den umgepolten C4 und C5`, `${ze('sm_p2_mw', 1)}: the mean of C1, C2, C3 and the reverse-coded C4 and C5`),
        P(`C4 (${zn('sm_p2_c4')}) und C5 (${zn('sm_p2_c5')}) werden vor dem Mittelwert umgepolt, hier zu ${zn('sm_p2_c4r')} und ${zn('sm_p2_c5r')}. Die Summe ${zn('sm_p2_sum')} geteilt durch fünf Items ergibt ${zd('sm_p2_mw', 1)}, ein Wert auf der Antwortskala von 1 bis 6.`,
          `C4 (${zn('sm_p2_c4')}) and C5 (${zn('sm_p2_c5')}) are reverse-coded before the mean is formed, here to ${zn('sm_p2_c4r')} and ${zn('sm_p2_c5r')}. The sum ${zn('sm_p2_sum')} divided by five items gives ${ze('sm_p2_mw', 1)}, a value on the answer scale from 1 to 6.`), true),
      a(P(`${zd('sm_p2_roh', 1)}: der Mittelwert der fünf Antworten, wie sie in den Spalten stehen`, `${ze('sm_p2_roh', 1)}: the mean of the five answers as they stand in the columns`),
        P('So gingen C4 und C5 mit der falschen Richtung ein: Hohe Zustimmung zu „halbherzig“ würde wie hohe Gewissenhaftigkeit zählen. Vor dem Mittelwert wird umgepolt.',
          'That way C4 and C5 would enter with the wrong direction: strong agreement with "half-hearted" would count like high conscientiousness. Reverse-coding comes before the mean.')),
      a(P(`${zn('sm_p2_sum')}: die Summe der fünf Werte mit den umgepolten C4 und C5`, `${zn('sm_p2_sum')}: the sum of the five values with C4 and C5 reverse-coded`),
        P('Die Summe ist ein Summenwert und liegt nicht auf der Antwortskala. Der Skalenwert als Mittelwert bleibt zwischen 1 und 6, hier nach dem Teilen durch die fünf Items.',
          'The sum is a sum score and does not lie on the answer scale. The scale score as a mean stays between 1 and 6, here after dividing by the five items.'))
    ],
    hilfe: ['skalenwert', 'umpolen'], belege: ['wissen:umpolen-verfahren', 'Hilfe:skalenwert']
  },
  {
    id: 'fb-sm-sechs', thema: 'fragebogenbau',
    tabelle: tab('fb-sm-sechs', [P('Person', 'Person'), P('C4 (Antwort)', 'C4 (answer)'), P('6 minus C4', '6 minus C4'), P('7 minus C4', '7 minus C4')], QUELLE_C,
      P('Vier Personen, C4 mit zwei Umpol-Rechnungen', 'Four persons, C4 with two reverse-coding calculations')),
    stamm: P('Die Antworten gehen von 1 bis 6. Ein Kollege polt C4 mit „6 minus Wert“ um; die Tabelle stellt das „7 minus Wert“ gegenüber. Was fällt auf?',
      'The answers run from 1 to 6. A colleague reverse-codes C4 with "6 minus value"; the table compares that with "7 minus value". What stands out?'),
    antworten: [
      a(P('Bei 6 minus Wert entsteht eine 0, die auf der Skala fehlt; richtig ist 7 minus Wert', 'With 6 minus value a 0 arises that the scale lacks; 7 minus value is correct'),
        P(`Umpolen kehrt die Reihenfolge um und behält den Wertebereich 1 bis 6: kleinster plus größter Wert minus Wert, hier 1 + 6 - Wert. Aus der Antwort ${zn('sm_c4_b')} wird so ${zn('sm_c4_b7')}; 6 minus Wert ergäbe ${zn('sm_c4_b6')}.`,
          `Reverse-coding reverses the order and keeps the range 1 to 6: smallest plus largest value minus value, here 1 + 6 - value. The answer ${zn('sm_c4_b')} becomes ${zn('sm_c4_b7')} that way; 6 minus value would give ${zn('sm_c4_b6')}.`), true),
      a(P('Beide Rechnungen sind gleichwertig, weil beide die Reihenfolge der Antworten umkehren', 'Both calculations are equivalent because both reverse the order of the answers'),
        P('6 minus Wert verschiebt die Skala von 1 bis 6 auf 0 bis 5. Der Skalenwert wäre dann bei fünf Items je falsch umgepoltem Item um einen Fünftelpunkt zu niedrig (hier sind es zwei Umkehr-Items). Beim Umpolen bleibt der Wertebereich erhalten.',
          '6 minus value shifts the scale from 1 to 6 onto 0 to 5. With five items the scale score would then be one fifth of a point too low for each wrongly reverse-coded item (here there are two reverse items). In reverse-coding the range is kept.')),
      a(P('Bei 7 minus Wert liegen die neuen Werte außerhalb der Skala, weil es die 7 nicht gibt', 'With 7 minus value the new values lie outside the scale because there is no 7'),
        P(`Die 7 ist keine Antwort, sondern die Summe aus kleinstem und größtem Wert. Das Ergebnis liegt zwischen 1 und 6; aus der Antwort ${zn('sm_c4_d')} wird die 6.`,
          `The 7 is not an answer but the sum of the smallest and the largest value. The result lies between 1 and 6; the answer ${zn('sm_c4_d')} becomes the 6.`))
    ],
    hilfe: ['umpolen', 'likert-skala'], belege: ['wissen:umpolen-verfahren', 'Hilfe:umpolen', 'Hilfe:daten-vorbereiten', 'Code:lib/skalabau.ts']
  },
  {
    id: 'fb-sm-befehl', thema: 'fragebogenbau',
    stamm: P('In SPSS soll der Skalenwert „Gewissenhaft“ als Mittelwert von C1, C2, C3 und den umgepolten Spalten C4R und C5R entstehen. Welcher Befehl leistet das?',
      'In SPSS the scale score "Gewissenhaft" is to be the mean of C1, C2, C3 and the reverse-coded columns C4R and C5R. Which command does that?'),
    antworten: [
      a(P('COMPUTE Gewissenhaft = MEAN(C1, C2, C3, C4R, C5R).', 'COMPUTE Gewissenhaft = MEAN(C1, C2, C3, C4R, C5R).'),
        P('MEAN bildet den Mittelwert der genannten Spalten je Person, und die umgepolten Spalten stehen darin. Statable schreibt denselben Befehl: COMPUTE Name = MEAN(Frage1, Frage2, ...).',
          'MEAN forms the mean of the named columns for each person, and the reverse-coded columns are in it. Statable writes the same command: COMPUTE name = MEAN(question1, question2, ...).'), true),
      a(P('COMPUTE Gewissenhaft = MEAN(C1, C2, C3, C4, C5).', 'COMPUTE Gewissenhaft = MEAN(C1, C2, C3, C4, C5).'),
        P('Hier stehen die Rohspalten C4 und C5. Sie laufen gegen die übrigen Items, ihre Umpolung gehört vor den Mittelwert; erst die Spalten C4R und C5R enthalten sie in der richtigen Richtung.',
          'Here the raw columns C4 and C5 are used. They run against the other items, and their reverse-coding belongs before the mean; only the columns C4R and C5R contain them in the right direction.')),
      a(P('COMPUTE Gewissenhaft = SUM(C1, C2, C3, C4R, C5R).', 'COMPUTE Gewissenhaft = SUM(C1, C2, C3, C4R, C5R).'),
        P('SUM bildet die Summe, also einen Summenwert, der nicht auf der Antwortskala von 1 bis 6 liegt. Gewünscht ist der Mittelwert der Items.',
          'SUM forms the sum, that is a sum score that does not lie on the answer scale from 1 to 6. The mean of the items is what is wanted.'))
    ],
    hilfe: ['skalenwert', 'umpolen'], belege: ['Code:lib/skalabau.ts', 'Hilfe:skalenwert', 'wissen:umpolen-verfahren']
  },
  {
    id: 'fb-sm-knopf', thema: 'fragebogenbau',
    stamm: P('In Statable ist die Reliabilität von C1 bis C5 gerechnet, und C4 und C5 sind schon umgepolt (Spalten C4R und C5R, neu gerechnet mit ihnen). Wie entsteht der Skalenwert als neue Spalte?',
      'In Statable the reliability of C1 to C5 is computed, and C4 and C5 are already reverse-coded (columns C4R and C5R, recomputed with them). How does the scale score arise as a new column?'),
    antworten: [
      a(P('Einen Namen eintragen und "Skalenwert als neue Spalte anlegen" wählen', 'Enter a name and choose "Create scale score as a new column"'),
        P('Der Skalenwert ist der Mittelwert der Fragen je Person. Statable legt ihn im Block "Weiter mit der Skala" mit dem Knopf als Spalte an, mit den umgepolten Fragen und als COMPUTE-Befehl, der sich rückgängig machen lässt.',
          'The scale score is the mean of the questions per person. Statable creates it in the block "Next steps with the scale" as a column with the button, using the reverse-coded questions, as a COMPUTE command that can be undone.'), true),
      a(P('Der Skalenwert liegt nach der Reliabilitätsrechnung schon fertig als Spalte in den Daten', 'The scale score is already in the data as a column after the reliability calculation'),
        P('Die Reliabilitätsrechnung legt keine Spalte an. Der Skalenwert wird erst mit dem eigenen Knopf als neue Spalte angelegt, mit Namen und bei Bedarf einer Mindestzahl beantworteter Fragen.',
          'The reliability calculation creates no column. The scale score is created as a new column only with its own button, with a name and, if needed, a minimum number of answered questions.')),
      a(P('C4 und C5 werden in den Daten von Hand überschrieben, danach lässt sich der Wert anlegen', 'C4 and C5 are overwritten by hand in the data, after which the value can be created'),
        P('Von Hand überschreiben ist nicht nötig. Beim Umpolen bleiben C4 und C5 unverändert, und eine neue Spalte C4R enthält die umgedrehten Antworten.',
          'Overwriting by hand is not needed. When reverse-coding, C4 and C5 stay as they are, and a new column C4R contains the turned-around answers.'))
    ],
    hilfe: ['skalenwert', 'umpolen', 'skala'], belege: ['Code:lib/skalabau.ts', 'Hilfe:skalenwert', 'Code:seiten/Blatt.svelte']
  },
  {
    id: 'fb-sm-kurz', thema: 'fragebogenbau',
    tabelle: tab('fb-sm-kurz', [P('Person', 'Person'), P('Summe von 4 Items', 'Sum of 4 items'), P('Summe von 5 Items', 'Sum of 5 items'), P('Mittelwert von 4 Items', 'Mean of 4 items'), P('Mittelwert von 5 Items', 'Mean of 5 items')], QUELLE_C,
      P('Kurzform (C1, C2, C3, C4 umgepolt) und Langform (zusätzlich C5 umgepolt)', 'Short form (C1, C2, C3, C4 reverse-coded) and long form (plus C5 reverse-coded)')),
    stamm: P(`Die Kurzform der Skala hat vier Items, die Langform fünf. Bei Person 1 ist die Summe der Langform höher (${zn('sm_p1_s5')} statt ${zn('sm_p1_s4')}), die Mittelwerte sind ${zd('sm_p1_m4')} und ${zd('sm_p1_m5')}. Was folgt daraus?`,
      `The short form of the scale has four items, the long form five. For person 1 the sum of the long form is higher (${zn('sm_p1_s5')} instead of ${zn('sm_p1_s4')}), and the means are ${ze('sm_p1_m4')} and ${ze('sm_p1_m5')}. What follows?`),
    antworten: [
      a(P('Die Summe wächst mit der Itemzahl; der Mittelwert ist auf derselben Antwortskala lesbar und größenmäßig vergleichbar, misst aber mit anderen Items nicht ganz dasselbe', 'The sum grows with the number of items; the mean is readable on the same answer scale and comparable in size, but with other items it does not measure quite the same'),
        P('Bei verschiedener Itemzahl ist ein Summenwert nicht vergleichbar. Der Mittelwert bleibt auf der Antwortskala von 1 bis 6 und ist über Skalen verschiedener Länge hinweg größenmäßig lesbar; Skalen mit anderen Items messen trotzdem nicht ganz dasselbe.',
          'With different numbers of items a sum score is not comparable. The mean stays on the answer scale from 1 to 6 and can be read in size across scales of different length; scales with other items still do not measure quite the same.'), true),
      a(P('Die Langform misst bei jeder Person ein höheres Merkmal, weil ihre Summe größer ist und das zusätzliche Item Punkte bringt', 'The long form measures a higher attribute in every person because its sum is larger and the additional item adds points'),
        P(`Die größere Summe kommt vom zusätzlichen Item. Die Mittelwerte (${zd('sm_p1_m4')} und ${zd('sm_p1_m5')}) liegen nahe beieinander, und bei Person 4 ist der Mittelwert der Langform sogar niedriger.`,
          `The larger sum comes from the additional item. The means (${ze('sm_p1_m4')} and ${ze('sm_p1_m5')}) lie close together, and for person 4 the mean of the long form is even lower.`)),
      a(P('Die Summe ist genauer als der Mittelwert, weil Teilen durch die Itemzahl Information vernichtet und die Personen verzerrt', 'The sum is more exact than the mean because dividing by the number of items destroys information and distorts the persons'),
        P('Teilen durch die Itemzahl ändert die Rangfolge der Personen innerhalb einer Skala nicht. Es macht die Werte auf der Antwortskala lesbar und Skalen verschiedener Länge vergleichbar.',
          'Dividing by the number of items does not change the ranking of persons within one scale. It makes the values readable on the answer scale and scales of different length comparable.'))
    ],
    hilfe: ['skalenwert'], belege: ['Hilfe:skalenwert', 'wissen:testtheorie-testwert-summe']
  },
  {
    id: 'fb-sm-mehrfach', thema: 'fragebogenbau', mehrfach: true,
    stamm: P('Es geht um den Skalenwert als Mittelwert der Items und um das Umpolen. Welche Aussagen stimmen? Mehrere können stimmen.',
      'This is about the scale score as the mean of the items and about reverse-coding. Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Umgepolt wird vor dem Bilden des Mittelwerts und nicht erst danach', 'Reverse-coding is done before the mean is formed, not after it'),
        P('Invertierte Items werden vor dem Mittelwert umkodiert. Gehen sie unverändert in den Mittelwert ein, zählt Zustimmung zu ihnen in die falsche Richtung.', 'Inverted items are recoded before the mean is formed. If they enter the mean unchanged, agreement with them counts in the wrong direction.'), true),
      a(P('Der Mittelwert aus Items mit Antworten von 1 bis 6 liegt selbst zwischen 1 und 6', 'The mean of items with answers from 1 to 6 itself lies between 1 and 6'),
        P('Der Mittelwertscore bleibt auf der Antwortskala. Ein Summenwert dagegen wächst mit der Zahl der Items.', 'The mean score stays on the answer scale. A sum score, by contrast, grows with the number of items.'), true),
      a(P('Bei Antworten von 1 bis 6 darf mit 6 minus Wert umgepolt werden', 'With answers from 1 to 6, reverse-coding with 6 minus value is allowed'),
        P('6 minus Wert ergäbe die Werte 5 bis 0 und verließe den Bereich der Skala. Beim Umpolen gilt kleinster plus größter Wert minus Wert, hier 7 minus Wert.', '6 minus value would give the values 5 to 0 and leave the range of the scale. For reverse-coding, smallest plus largest value minus value applies, here 7 minus value.')),
      a(P('Summenwerte verschieden langer Skalen lassen sich direkt vergleichen', 'Sum scores of scales of different length can be compared directly'),
        P('Bei verschiedener Itemzahl ist ein Summenwert nicht vergleichbar. Dafür eignet sich der Mittelwert.', 'With different numbers of items a sum score is not comparable. The mean suits that purpose.'))
    ],
    hilfe: ['skalenwert', 'umpolen'], belege: ['wissen:umpolen-verfahren', 'Hilfe:skalenwert', 'Hilfe:umpolen', 'Hilfe:daten-vorbereiten', 'Code:lib/skalabau.ts']
  },

  // ---- Gute Fragen formulieren ----
  {
    id: 'fb-gf-doppel', thema: 'fragebogenbau',
    stamm: P('Ein Fragebogen zur Lesefreude enthält das Item „Ich lese gern und oft.“ Eine Person liest gern, aber selten. Was ist an diesem Item das Problem?',
      'A questionnaire on reading enjoyment contains the item "I read gladly and often." One person reads gladly but rarely. What is the problem with this item?'),
    antworten: [
      a(P('Es ist eine Doppelfrage (double-barreled): zwei Merkmale stehen in einem Satz', 'It is a double-barreled question: two characteristics stand in one sentence'),
        P('Zu guten Items gehört, dass sie keine zwei Merkmale in einem Satz erfragen. Hier lässt sich eine einzige Antwort weder „gern“ noch „oft“ eindeutig zuordnen.',
          'Good items do not ask about two characteristics in one sentence. Here a single answer cannot be assigned clearly to either "gladly" or "often".'), true),
      a(P('Es enthält Fachwörter, die ein Teil der Zielgruppe nicht kennt und nicht versteht', 'It contains technical terms that part of the target group does not know or understand'),
        P('„gern“ und „oft“ sind gewöhnliche Wörter. Das Problem liegt nicht an der Verständlichkeit, sondern an den zwei Merkmalen in einem Satz.',
          '"Gladly" and "often" are ordinary words. The problem is not comprehensibility but the two characteristics in one sentence.')),
      a(P('Es ist ein Umkehr-Item, dessen Zustimmung vor der Auswertung umgepolt werden muss', 'It is a reverse-keyed item whose agreement has to be reverse-coded before the analysis'),
        P('„gern“ und „oft“ zeigen in dieselbe Richtung, es gibt nichts umzupolen. Das Problem sind zwei Merkmale in einem Satz.',
          '"Gladly" and "often" point in the same direction, so there is nothing to reverse. The problem is two characteristics in one sentence.'))
    ],
    hilfe: ['suggestivfrage', 'item', 'fragebogen'], belege: ['wissen:clark-itemformulierung']
  },
  {
    id: 'fb-gf-aufteilen', thema: 'fragebogenbau',
    stamm: P('Ein Fragebogen zur Fahrsicherheit enthält das Item „Ich fahre vorsichtig und halte das Tempolimit ein.“ Es ist eine Doppelfrage (double-barreled): zwei Merkmale in einem Satz. Wie wird das behoben?',
      'A questionnaire on driving safety contains the item "I drive carefully and keep to the speed limit." It is a double-barreled question: two characteristics in one sentence. How can this be fixed?'),
    antworten: [
      a(P('Das Item wird in zwei Items geteilt, in jedem steht ein Merkmal', 'The item is split into two items, each holding one characteristic'),
        P('Mit einem Merkmal je Satz ist jede Antwort eindeutig zuzuordnen. Das ist der Kern der Regel, keine Doppelfragen mit zwei Merkmalen in einem Satz zu stellen.',
          'With one characteristic per sentence each answer can be assigned clearly. That is the core of the rule against double-barreled questions with two characteristics in one sentence.'), true),
      a(P('Das Item bekommt mehr Antwortstufen, damit beide Teile abgestuft zustimmbar sind', 'The item gets more answer levels so that both parts can be agreed with in degrees'),
        P('Mehr Stufen ändern nichts daran, dass zwei Merkmale in einem Satz stehen. Eine Antwort bleibt keinem der beiden eindeutig zugeordnet.',
          'More levels do not change the fact that two characteristics stand in one sentence. An answer still cannot be assigned to either one clearly.')),
      a(P('Das Item wird länger gefasst, sodass beide Merkmale genauer beschrieben werden', 'The item is worded longer so that both characteristics are described more precisely'),
        P('Ein längerer Satz mit beiden Merkmalen bleibt eine Doppelfrage. Behoben wird sie erst, wenn jedes Merkmal ein eigenes Item bekommt.',
          'A longer sentence with both characteristics remains a double-barreled question. It is fixed only when each characteristic gets its own item.'))
    ],
    hilfe: ['suggestivfrage', 'item', 'fragebogen'], belege: ['wissen:clark-itemformulierung']
  },
  {
    id: 'fb-gf-sprache', thema: 'fragebogenbau',
    stamm: P('Ein Fragebogen zur Fahrsicherheit wird an Jugendliche und an Erwachsene mit sehr verschiedenem Hintergrund verteilt. Welche Formulierung passt am besten zu dieser Zielgruppe?',
      'A questionnaire on driving safety is handed out to teenagers and to adults with very different backgrounds. Which wording suits this target group best?'),
    antworten: [
      a(P('Ich achte beim Fahren auf alles, was im Verkehr um mich herum geschieht.', 'When driving, I pay attention to everything that happens in the traffic around me.'),
        P('Einfache, klare Sprache auf dem Leseniveau der Zielgruppe ist ein Merkmal guter Items. Alle Wörter sind gewöhnlich und überall bekannt.',
          'Simple, clear language at the reading level of the target group is a feature of good items. All words are ordinary and known everywhere.'), true),
      a(P('Ich bin beim Fahren voll auf Zack und habe alles im Blick, was so abgeht.', 'When driving, I am totally on the ball and keep an eye on whatever is going on.'),
        P('Umgangssprache und Redewendungen sind nicht überall bekannt. Bei dieser Zielgruppe wissen vielleicht nicht alle, was gemeint ist.',
          'Colloquial speech and idioms are not known everywhere. In this target group perhaps not everyone knows what is meant.')),
      a(P('Ich richte beim Führen eines Fahrzeugs meine Aufmerksamkeit auf das Verkehrsgeschehen.', 'When operating a vehicle, I direct my attention to the occurrence of traffic events.'),
        P('Die Sprache liegt über dem Leseniveau eines Teils der Zielgruppe. Gute Items sind einfach und klar formuliert.',
          'The language lies above the reading level of part of the target group. Good items are worded simply and clearly.'))
    ],
    hilfe: ['item', 'fragebogen'], belege: ['wissen:clark-itemformulierung']
  },
  {
    id: 'fb-gf-alle-ja', thema: 'fragebogenbau',
    tabelle: tab('fb-gf-alle-ja', [P('Antwort (1 = lehne ab, 5 = stimme voll zu)', 'Answer (1 = disagree, 5 = fully agree)'), P('Anzahl', 'Count'), P('Anteil in Prozent', 'Share in percent')], QUELLE_GF,
      P('Antworten auf das Item „Ich schnalle mich im Auto an.“', 'Answers to the item "I fasten my seat belt in the car."')),
    stamm: P('In einer Probebefragung (Beispielwerte) beantworten 200 Personen das Item „Ich schnalle mich im Auto an.“ aus einem Fragebogen zur Fahrsicherheit auf einer Skala von 1 bis 5. Die Tabelle zeigt, wie oft jede Stufe gewählt wurde. Was folgt daraus für das Item?',
      'In a trial survey (example values), 200 people answer the item "I fasten my seat belt in the car." from a questionnaire on driving safety on a scale from 1 to 5. The table shows how often each level was chosen. What follows for the item?'),
    antworten: [
      a(P('Es ist als Item ungeeignet und sollte umformuliert oder ersetzt werden', 'It is unsuitable as an item and should be reworded or replaced'),
        P(`Zu guten Items gehört, dass nicht fast alle (und nicht fast niemand) ihnen zustimmen. Hier wählen ${zn('gf_p5')} Prozent die Stufe 5, mit Stufe 4 zusammen ${zn('gf_p45')} Prozent. Ein Item, das fast alle bejahen, ist dafür nicht geeignet.`,
          `Good items are not endorsed by almost everyone (nor by almost no one). Here ${zn('gf_p5')} percent choose level 5, together with level 4 ${zn('gf_p45')} percent. An item that almost everyone endorses is not suitable.`), true),
      a(P('Es ist besonders gut, weil sich alle Personen darin einig sind', 'It is particularly good because all people agree on it'),
        P('Einigkeit macht ein Item nicht besser. Items, die fast alle bejahen, gelten als ungeeignet.',
          'Agreement does not make an item better. Items that almost everyone endorses count as unsuitable.')),
      a(P('Es bleibt unverändert, weil die Zustimmung zeigt, dass es verständlich ist', 'It stays unchanged because the agreement shows that it is understandable'),
        P('Hohe Zustimmung sagt nichts über die Verständlichkeit. Ein Item, das fast alle bejahen, soll nicht in der Skala bleiben.',
          'High agreement says nothing about comprehensibility. An item that almost everyone endorses should not stay in the scale.'))
    ],
    hilfe: ['item', 'fragebogen'], belege: ['wissen:clark-itemformulierung']
  },
  {
    id: 'fb-gf-stimmung', thema: 'fragebogenbau',
    stamm: P('In einer Skala zur Lesefreude steht das Item „Beim Lesen bin ich oft traurig.“ Was kann der Wortlaut für das gemessene Konstrukt bedeuten?',
      'In a scale on reading enjoyment there is the item "When reading I am often sad." What can the wording mean for the construct that is measured?'),
    antworten: [
      a(P('Das Stimmungswort macht das Item zum Teil zu einem Item für Neurotizismus', 'The mood word makes the item partly an item for neuroticism'),
        P('Der Wortlaut kann das gemessene Konstrukt verschieben: Fast jeder negative Stimmungsbegriff macht ein Item zum Teil zu einem Neurotizismus-Item (Neurotizismus: Neigung zu negativen Gefühlen).',
          'Wording can shift the construct that is measured: almost any negative mood term makes an item partly a neuroticism item (neuroticism: tendency toward negative feelings).'), true),
      a(P('Der Wortlaut ändert nichts, denn welches Konstrukt ein Item misst, steht fest', 'The wording changes nothing, since which construct an item measures is fixed'),
        P('Der Wortlaut kann das gemessene Konstrukt verschieben. Ein negativer Stimmungsbegriff ist dafür ein belegtes Beispiel.',
          'Wording can shift the construct that is measured. A negative mood term is a documented example.')),
      a(P('Nur sehr starke Gefühlswörter verschieben das Konstrukt, ein Wort wie „traurig“ bleibt folgenlos', 'Only very strong emotion words shift the construct, a word like "sad" has no effect'),
        P('Belegt ist, dass fast jeder negative Stimmungsbegriff ein Item zum Teil zu einem Neurotizismus-Item macht. „traurig“ ist dafür ein Beispiel.',
          'It is documented that almost any negative mood term makes an item partly a neuroticism item. "Sad" is an example.'))
    ],
    hilfe: ['konstrukt', 'item'], belege: ['wissen:clark-itemformulierung']
  },
  {
    id: 'fb-gf-mehrfach', thema: 'fragebogenbau', mehrfach: true,
    stamm: P('Es geht um die Formulierung von Items in einem Fragebogen. Welche Aussagen stimmen? Mehrere können stimmen.',
      'This is about the wording of items in a questionnaire. Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Ein Item erfragt ein einziges Merkmal und nicht zwei in einem Satz', 'An item asks about a single characteristic and not about two in one sentence'),
        P('Doppelfragen mit zwei Merkmalen in einem Satz gelten als Fehler beim Formulieren von Items.', 'Double-barreled questions with two characteristics in one sentence count as a flaw in item wording.'), true),
      a(P('Der Wortlaut eines Items kann verschieben, welches Konstrukt es erfasst', 'The wording of an item can shift which construct it captures'),
        P('Zum Beispiel macht fast jeder negative Stimmungsbegriff ein Item zum Teil zu einem Neurotizismus-Item.', 'For example, almost any negative mood term makes an item partly a neuroticism item.'), true),
      a(P('Umgangssprache ist unproblematisch, auch wenn nur ein Teil der Zielgruppe sie kennt', 'Colloquial speech is unproblematic even if only part of the target group knows it'),
        P('Gute Items nutzen einfache, klare Sprache und meiden Umgangssprache, die nicht überall bekannt ist.', 'Good items use simple, clear language and avoid colloquial speech that is not known everywhere.')),
      a(P('Ein Item wird besser, je mehr Personen ihm zustimmen', 'An item gets better the more people agree with it'),
        P('Items, die fast alle bejahen, gelten als ungeeignet. Hohe Zustimmung macht ein Item nicht besser.', 'Items that almost everyone endorses count as unsuitable. High agreement does not make an item better.'))
    ],
    hilfe: ['item', 'fragebogen'], belege: ['wissen:clark-itemformulierung']
  },
  // ---- Suggestivfragen und doppelte Verneinung: kein Beleg im Original, darum nur mit gesetzter Regel im Stamm („Angenommen, ...“); Beleg ist der Hilfe-Artikel ----
  {
    id: 'fb-sg-neutral', thema: 'fragebogenbau',
    stamm: P('Angenommen, eine Frage heißt suggestiv (Suggestivfrage), wenn ihr Wortlaut eine bestimmte Antwort nahelegt. Eine Schule befragt Eltern zum geplanten Umbau des Schulhofs. Welche Fassung ist neutral formuliert?',
      'Suppose a question is called leading (suggestive question) if its wording suggests a particular answer. A school asks parents about the planned redesign of the schoolyard. Which version is worded neutrally?'),
    antworten: [
      a(P('Wie bewerten Sie den geplanten Umbau des Schulhofs insgesamt?', 'How do you rate the planned redesign of the schoolyard overall?'),
        P('Die Frage nennt weder eine Wertung noch eine erwartete Antwort. Ihr Wortlaut legt keine bestimmte Antwort nahe, und genau das heißt neutral.',
          'The question names neither a judgement nor an expected answer. Its wording suggests no particular answer, and that is exactly what neutral means.'), true),
      a(P('Der längst überfällige Umbau des Schulhofs ist gelungen, oder?', 'The long overdue redesign of the schoolyard was a success, wasn\'t it?'),
        P('Das Wertwort „längst überfällig“ und das angehängte „oder?“ legen „ja“ nahe. Nach der gesetzten Regel ist das eine Suggestivfrage.',
          'The value word "long overdue" and the tag "wasn\'t it?" suggest "yes". By the rule given, this is a leading question.')),
      a(P('Die meisten Eltern begrüßen den Umbau des Schulhofs. Und Sie?', 'Most parents welcome the redesign of the schoolyard. And you?'),
        P('Auch ohne Wertwort legt der Hinweis auf die Mehrheit eine Antwort nahe. Das ist wieder eine Suggestivfrage, nur auf anderem Weg.',
          'Even without a value word, the reference to the majority suggests an answer. It is a leading question again, only by another route.'))
    ],
    hilfe: ['suggestivfrage', 'item', 'fragebogen'], belege: ['Hilfe:suggestivfrage']
  },
  {
    id: 'fb-sg-umformulieren', thema: 'fragebogenbau',
    stamm: P('Angenommen, eine Frage heißt suggestiv, wenn ihr Wortlaut eine bestimmte Antwort nahelegt. Ein Fragebogen enthält die Frage „Stimmen Sie zu, dass das schreckliche Essen in der Mensa dringend besser werden muss?“ Wie wird sie neutral gefasst?',
      'Suppose a question is called leading if its wording suggests a particular answer. A questionnaire contains the question "Do you agree that the dreadful food in the canteen urgently has to get better?" How is it worded neutrally?'),
    antworten: [
      a(P('Wie beurteilen Sie das Essen in der Mensa insgesamt?', 'How do you rate the food in the canteen overall?'),
        P('Wertwort und Aufforderung zuzustimmen entfallen. Die Frage nennt keine Richtung und lässt gute wie schlechte Urteile offen.',
          'The value word and the invitation to agree are gone. The question names no direction and leaves good and bad judgements open.'), true),
      a(P('Stimmen Sie zu, dass das Essen in der Mensa besser werden muss?', 'Do you agree that the food in the canteen has to get better?'),
        P('Das Wertwort ist weg, aber „Stimmen Sie zu, dass … muss“ legt weiter „ja“ nahe. Ein einzelnes gestrichenes Wort macht die Frage noch nicht neutral.',
          'The value word is gone, but "Do you agree that ... has to" still suggests "yes". Deleting a single word does not yet make the question neutral.')),
      a(P('Wie schlecht finden Sie das Essen in der Mensa (Skala 1 bis 5)?', 'How bad do you find the food in the canteen (scale 1 to 5)?'),
        P('Die Antwortstufen ändern den Wortlaut nicht: „wie schlecht“ nennt nur eine Richtung und unterstellt bereits, dass das Essen schlecht ist. Die Frage bleibt suggestiv.',
          'The answer levels do not change the wording: "how bad" names only one direction and already assumes that the food is bad. The question stays leading.'))
    ],
    hilfe: ['suggestivfrage', 'item', 'fragebogen'], belege: ['Hilfe:suggestivfrage']
  },
  {
    id: 'fb-sg-wirkung', thema: 'fragebogenbau',
    stamm: P('Angenommen, eine Frage heißt suggestiv, wenn ihr Wortlaut eine bestimmte Antwort nahelegt. Eltern werden zufällig auf zwei Fassungen derselben Frage zum Schulhof verteilt, eine neutrale und eine suggestive. In der suggestiven Gruppe fällt die Zustimmung viel höher aus. Wie ist das zu deuten?',
      'Suppose a question is called leading if its wording suggests a particular answer. Parents are assigned at random to two versions of the same question about the schoolyard, a neutral one and a leading one. In the leading group agreement turns out much higher. How is that to be interpreted?'),
    antworten: [
      a(P('Der Unterschied geht zumindest zum Teil auf den Wortlaut zurück, nicht auf Meinungen', 'The difference is at least partly due to the wording, not to opinions'),
        P('Bei zufälliger Verteilung unterscheiden sich die Gruppen im Mittel nicht in ihren Meinungen. Als Unterschied bleibt der Wortlaut, und er kann die Antworten verschieben.',
          'With random assignment the groups do not differ in their opinions on average. What remains as a difference is the wording, and it can shift the answers.'), true),
      a(P('Die Eltern der zweiten Gruppe sind schlicht zufriedener mit dem Umbau als die der ersten', 'The parents of the second group are simply more satisfied with the redesign'),
        P('Bei zufälliger Verteilung haben beide Gruppen im Mittel dieselbe Meinung. Der Unterschied liegt dann an der Fassung, nicht an den Eltern.',
          'With random assignment both groups hold the same opinion on average. The difference then lies in the version, not in the parents.')),
      a(P('Die suggestive Fassung misst die Meinung genauer, weil sie die Antwort klarer macht', 'The leading version measures the opinion more precisely because it makes the answer clearer'),
        P('Eine Frage, die „ja“ nahelegt, bildet die Meinung nicht genauer ab. Ihre Antworten spiegeln zum Teil den Wortlaut wider.',
          'A question that suggests "yes" does not capture the opinion more precisely. Its answers partly reflect the wording.'))
    ],
    hilfe: ['suggestivfrage', 'item', 'fragebogen'], belege: ['Hilfe:suggestivfrage', 'wissen:clark-itemformulierung']
  },
  {
    id: 'fb-dv-aufheben', thema: 'fragebogenbau',
    stamm: P('Angenommen, zwei Verneinungen in einem Satz heben sich auf. Ein Item einer Skala zum Erholungsbedürfnis lautet „Es ist falsch, dass ich keine Pause brauche.“ Welche Aussage bedeutet dasselbe wie dieses Item (doppelte Verneinung)?',
      'Suppose two negations in one sentence cancel each other. An item on a scale of need for rest reads "It is wrong that I need no break." Which statement means the same as this item (double negative)?'),
    antworten: [
      a(P('Ich brauche zwischendurch eine Pause zum Erholen.', 'I need a break now and then to rest.'),
        P('Die Aussage „keine Pause brauchen“ wird mit „falsch“ verneint. Zwei Verneinungen heben sich auf, übrig bleibt: Ich brauche eine Pause.',
          'The statement "need no break" is negated with "wrong". Two negations cancel, what remains is: I need a break.'), true),
      a(P('Ich brauche zwischendurch keine Pause zum Erholen.', 'I need no break now and then to rest.'),
        P('Diese Fassung behält die Verneinung „keine“. Dass das Item sie mit „falsch“ ein zweites Mal verneint, wird dabei übersehen.',
          'This version keeps the negation "no". It overlooks that the item negates it a second time with "wrong".')),
      a(P('Ich bin unentschieden, ob ich zwischendurch eine Pause brauche.', 'I am undecided whether I need a break now and then.'),
        P('Zwei Verneinungen machen die Aussage nicht unklar. Sie heben sich auf, und die Bedeutung ist eindeutig.',
          'Two negations do not make the statement unclear. They cancel, and the meaning is unambiguous.'))
    ],
    hilfe: ['suggestivfrage', 'item', 'fragebogen'], belege: ['Hilfe:suggestivfrage']
  },
  {
    id: 'fb-dv-erkennen', thema: 'fragebogenbau',
    stamm: P('Angenommen, ein Item soll höchstens eine Verneinung enthalten, damit es schnell zu verstehen ist. Welches der Items hält diese Regel ein?',
      'Suppose an item is to contain at most one negation so that it is quick to understand. Which of the items keeps this rule?'),
    antworten: [
      a(P('Ich mache am Wochenende keine Hausaufgaben für die Schule.', 'At weekends I do no homework for school.'),
        P('Das Item enthält genau eine Verneinung („keine“). Die Regel „höchstens eine“ ist eingehalten.',
          'The item contains exactly one negation ("no"). The rule "at most one" is kept.'), true),
      a(P('Ich mache am Wochenende keine Hausaufgaben, wenn es nicht sein muss.', 'At weekends I do no homework unless it is required.'),
        P('Hier stehen zwei Verneinungen („keine“ und „nicht“). Das sind mehr als erlaubt.',
          'Here stand two negations ("no" and "not"). That is more than allowed.')),
      a(P('Es stimmt nicht, dass ich am Wochenende keine Hausaufgaben mache.', 'It is not true that at weekends I do no homework.'),
        P('Mit „nicht“ und „keine“ stehen zwei Verneinungen im Satz. Sie heben sich zwar auf, die Regel zählt aber die Verneinungen im Satz.',
          'With "not" and "no" there are two negations in the sentence. They do cancel, but the rule counts the negations in the sentence.'))
    ],
    hilfe: ['suggestivfrage', 'item', 'fragebogen'], belege: ['Hilfe:suggestivfrage']
  },
  {
    id: 'fb-dv-zustimmung', thema: 'fragebogenbau',
    stamm: P('Angenommen, zwei Verneinungen in einem Satz heben sich auf. Eine Person stimmt dem Item „Es ist falsch, dass mir das Lesen keinen Spaß macht.“ voll zu. Was sagt das über die Person aus?',
      'Suppose two negations in one sentence cancel each other. A person fully agrees with the item "It is wrong that reading is no fun for me." What does that say about the person?'),
    antworten: [
      a(P('Das Lesen macht ihr Spaß, denn ohne Verneinungen sagt der Satz genau das', 'Reading is fun for her, because without negations the sentence says that'),
        P('Die Verneinung „falsch“ kehrt „macht keinen Spaß“ um. Die volle Zustimmung gilt der umgekehrten Aussage: Das Lesen macht Spaß.',
          'The negation "wrong" reverses "is no fun". The full agreement applies to the reversed statement: reading is fun.'), true),
      a(P('Das Lesen macht ihr keinen Spaß, denn sie stimmt dem Teil „keinen Spaß“ zu', 'Reading is no fun for her, because she agrees with the part "no fun"'),
        P('Die Zustimmung gilt dem ganzen Satz, nicht einem Teil. Die erste Verneinung („falsch“) kehrt die Aussage „keinen Spaß“ um.',
          'The agreement applies to the whole sentence, not to a part. The first negation ("wrong") reverses the statement "no fun".')),
      a(P('Über ihr Lesen lässt sich nichts sagen, denn der Satz ist nicht eindeutig', 'Nothing can be said about her reading, because the sentence is ambiguous'),
        P('Zwei Verneinungen heben sich auf, der Satz hat eine eindeutige Bedeutung. Aus der vollen Zustimmung lässt sich daher etwas schließen.',
          'Two negations cancel, the sentence has an unambiguous meaning. Something can therefore be concluded from the full agreement.'))
    ],
    hilfe: ['suggestivfrage', 'item', 'fragebogen'], belege: ['Hilfe:suggestivfrage']
  },
  {
    id: 'fb-sg-mehrfach', thema: 'fragebogenbau', mehrfach: true,
    stamm: P('Es geht um Wortlaut-Fehler in Fragen. Welche Aussagen stimmen? Mehrere können stimmen.',
      'This is about wording flaws in questions. Which statements are correct? Several may be correct.'),
    antworten: [
      a(P('Eine suggestive Frage legt durch ihren Wortlaut eine bestimmte Antwort nahe', 'A leading question suggests a particular answer through its wording'),
        P('So ist die Suggestivfrage in der Hilfe beschrieben: Der Wortlaut zeigt, welche Antwort erwartet wird.',
          'That is how the leading question is described in the help: the wording shows which answer is expected.'), true),
      a(P('Logisch betrachtet heben zwei Verneinungen in einem Satz einander auf', 'Logically speaking, two negations in one sentence cancel each other'),
        P('Aus „Es ist falsch, dass keine Pause nötig ist“ wird: Eine Pause ist nötig.',
          'From "It is wrong that no break is needed" follows: a break is needed.'), true),
      a(P('Eine Doppelfrage ist dasselbe wie eine doppelte Verneinung', 'A double-barreled question is the same as a double negative'),
        P('Die Doppelfrage erfragt zwei Merkmale in einem Satz, die doppelte Verneinung hat zwei Verneinungen in einem Satz. Das sind verschiedene Fehler.',
          'The double-barreled question asks about two characteristics in one sentence, the double negative has two negations in one sentence. These are different flaws.')),
      a(P('Mehr Antwortstufen machen aus einer suggestiven Frage eine neutrale', 'More answer levels turn a leading question into a neutral one'),
        P('Die Stufen ändern den Wortlaut nicht. Eine Frage, die eine Antwort nahelegt, bleibt suggestiv.',
          'The levels do not change the wording. A question that suggests an answer stays leading.'))
    ],
    hilfe: ['suggestivfrage', 'item', 'fragebogen'], belege: ['Hilfe:suggestivfrage', 'wissen:clark-itemformulierung']
  }
];
