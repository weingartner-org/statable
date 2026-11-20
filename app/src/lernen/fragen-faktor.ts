/**
 * Üben: Faktorenanalyse (Fachblatt docs/fachblaetter/UEBEN-MC.md). Eigene Wortlaute; alle Zahlen und Tabellen aus
 * app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R, Daten: psych::bfi und lavaan::HolzingerSwineford1939).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, za, zae, zd, ze, zn, zp, zpr } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const HILFE = ['frage-faktor', 'faktorenanalyse'];

const QUELLE_BFI = P(
  `Daten: psych::bfi (SAPA-Projekt 2010, Fragen aus dem IPIP; Paket psych, Lizenz GPL ≥ 2), ${zn('f1_n')} Personen mit allen zehn Antworten. Hauptkomponenten, Varimax, berechnet mit R.`,
  `Data: psych::bfi (SAPA project 2010, items from the IPIP; package psych, licence GPL ≥ 2), ${zn('f1_n')} people with all ten answers. Principal components, varimax, computed with R.`);
const QUELLE_HS = P(
  `Daten: lavaan::HolzingerSwineford1939 (Holzinger und Swineford 1939; Paket lavaan, Lizenz GPL ≥ 2), ${zn('f2_n')} Kinder. Hauptkomponenten, Varimax, berechnet mit R.`,
  `Data: lavaan::HolzingerSwineford1939 (Holzinger and Swineford 1939; package lavaan, licence GPL ≥ 2), ${zn('f2_n')} children. Principal components, varimax, computed with R.`);
const QUELLE_BFI3 = P(
  `Daten: psych::bfi (SAPA-Projekt 2010, Fragen aus dem IPIP; Paket psych, Lizenz GPL ≥ 2), ${zn('f3_n')} Personen mit allen elf Antworten. Hauptkomponenten, Varimax, berechnet mit R.`,
  `Data: psych::bfi (SAPA project 2010, items from the IPIP; package psych, licence GPL ≥ 2), ${zn('f3_n')} people with all eleven answers. Principal components, varimax, computed with R.`);
const KOPF_ITEM = P('Item', 'Item');
const kopfK = (n: number) => P(`Komponente ${n}`, `Component ${n}`);
const AUSBLEND = P(`Rotierte Komponentenmatrix (Ladungen unter ${zd('regel_ladung_aus')} ausgeblendet)`, `Rotated component matrix (loadings below ${ze('regel_ladung_aus')} hidden)`);

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'faktor-bfi-10': {
    titel: P('Zehn Items (Fragen) eines Persönlichkeitsfragebogens: E1 bis E5 zur Geselligkeit, N1 bis N5 zu Ärger und Stimmung',
      'Ten items of a personality questionnaire: E1 to E5 on sociability, N1 to N5 on anger and mood'),
    tabellen: [
      tab('faktor-bfi-10.0', [P('Komponente', 'Component'), P('Eigenwert', 'Eigenvalue'), P('% der Varianz', '% of variance'), P('Kumulierte %', 'Cumulative %')], QUELLE_BFI,
        P('Erklärte Gesamtvarianz (erste fünf Komponenten)', 'Total variance explained (first five components)')),
      tab('faktor-bfi-10.1', [KOPF_ITEM, kopfK(1), kopfK(2)], QUELLE_BFI, AUSBLEND)
    ]
  },
  'faktor-hs-9': {
    titel: P('Neun Leistungstests bei Schulkindern: x1 bis x3 räumliches Denken, x4 bis x6 Sprachverständnis, x7 bis x9 schnelle Aufgaben',
      'Nine ability tests in schoolchildren: x1 to x3 spatial thinking, x4 to x6 verbal comprehension, x7 to x9 speeded tasks'),
    tabellen: [
      tab('faktor-hs-9.0', [KOPF_ITEM, kopfK(1), kopfK(2), kopfK(3), P('Kommunalität', 'Communality')], QUELLE_HS,
        P(`Rotierte Komponentenmatrix mit Kommunalitäten (Ladungen unter ${zd('regel_ladung_aus')} ausgeblendet)`, `Rotated component matrix with communalities (loadings below ${ze('regel_ladung_aus')} hidden)`))
    ]
  },
  'faktor-bfi-11': {
    titel: P('Elf Items (Fragen eines Fragebogens): E1, E2, E4 zur Geselligkeit; N1 bis N4 zu Ärger und Stimmung; C1, C3, C5 zur Sorgfalt; O2 zur Offenheit',
      'Eleven items: E1, E2, E4 on sociability; N1 to N4 on anger and mood; C1, C3, C5 on conscientiousness; O2 on openness'),
    tabellen: [tab('faktor-bfi-11.0', [KOPF_ITEM, kopfK(1), kopfK(2), kopfK(3)], QUELLE_BFI3, AUSBLEND)]
  }
};

const FA_BFI10 = 'faktor-bfi-10', FA_HS = 'faktor-hs-9', FA_BFI11 = 'faktor-bfi-11';

export const FRAGEN: Frage[] = [
  // ---- Fall 1: zehn Items, zwei Komponenten ----
  {
    id: 'faktor-f1-zuordnung', thema: 'faktor', fall: FA_BFI10,
    stamm: P(`Angenommen, eine Ladung gilt als Zugehörigkeit, wenn ihr Betrag mindestens ${zd('regel_ladung')} beträgt. Welche Fragen (Items) gehören zu Komponente 2?`,
      `Assume a loading counts as belonging if its absolute size is at least ${ze('regel_ladung')}. Which items belong to component 2?`),
    antworten: [
      a(P('E1 bis E5, denn ihre Ladungen auf Komponente 2 erreichen die Grenze im Betrag', 'E1 to E5, since their loadings on component 2 reach the limit in absolute size'),
        P('Zählt der Betrag, gehören E1 und E2 mit ihren negativen Ladungen ebenso dazu wie E3 bis E5. Die Ladung von N4 bleibt unter der Grenze.', 'If the absolute size counts, E1 and E2 with their negative loadings belong just like E3 to E5. The loading of N4 stays below the limit.'), true),
      a(P('Nur E3, E4 und E5, denn eine negative Ladung bedeutet Gegensatz, nicht Zugehörigkeit', 'Only E3, E4 and E5, since a negative loading means opposition, not belonging'),
        P('Das Minuszeichen zeigt nur die Richtung. Die Frage hängt genauso eng mit der Komponente zusammen, nur umgekehrt.', 'The minus sign only shows the direction. The item is just as closely tied to the component, only the other way round.')),
      a(P('E1 bis E5 und N4, denn auch N4 hat in der Spalte von Komponente 2 eine Ladung', 'E1 to E5 and N4, since N4 also has a loading in the column of component 2'),
        P('Dass eine Zahl in der Spalte steht, heißt noch nicht, dass sie die gesetzte Grenze erreicht. Die Ladung von N4 liegt im Betrag darunter.', 'A number in the column does not mean it reaches the limit that was set. The loading of N4 is below it in absolute size.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:fa-ladung-05', 'wissen:fa-negative-ladung', 'Backhaus, Faktorenanalyse']
  },
  {
    id: 'faktor-f1-negativ', thema: 'faktor', fall: FA_BFI10,
    stamm: P(`E1 lautet sinngemäß „redet wenig“, E3 „weiß Menschen zu fesseln“. E1 hat auf Komponente 2 die Ladung ${zd('f1_e1')}, E3 die Ladung ${zd('f1_e3')}. Welche Deutung stimmt?`,
      `E1 means roughly "talks little", E3 "knows how to captivate people". E1 has the loading ${ze('f1_e1')} on component 2, E3 has ${ze('f1_e3')}. Which reading is correct?`),
    antworten: [
      a(P('E1 ist gegenläufig zu den übrigen E-Fragen formuliert und zeigt deshalb ein negatives Vorzeichen', 'E1 is worded in the opposite direction to the other E items and therefore shows a negative sign'),
        P('Die Frage ist gegenläufig gemeint: Wer hier zustimmt, liegt bei der Komponente tief. Die Ladung ist eine Korrelation, ihr Betrag zeigt die Nähe zur Komponente.', 'The item is worded the other way round: whoever agrees here scores low on the component. The loading is a correlation; its absolute size shows how close the item is to the component.'), true),
      a(P('E1 passt schlecht zur Komponente, weil eine negative Ladung gegen die Zugehörigkeit spricht', 'E1 fits the component poorly, since a negative loading speaks against belonging'),
        P(`Ein Minuszeichen sagt nur, in welche Richtung der Zusammenhang geht. Die Stärke steckt im Betrag, und ${za('f1_e1')} ist hoch.`, `A minus sign only says in which direction the relation goes. The strength is in the absolute size, and ${zae('f1_e1')} is high.`)),
      a(P('E1 wird von der Komponente schlechter erklärt als E3, weil die Ladung kleiner ist', 'E1 is explained less well by the component than E3, since its loading is smaller'),
        P(`Verglichen wird der Betrag: ${za('f1_e1')} und ${za('f1_e3')} liegen fast gleich. Kleiner im Sinne von „weiter links auf dem Zahlenstrahl“ heißt hier nichts.`, `What is compared is the absolute size: ${zae('f1_e1')} and ${zae('f1_e3')} are almost equal. Smaller in the sense of "further left on the number line" means nothing here.`))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:fa-negative-ladung', 'wissen:fa-ladung-definition', 'Backhaus, Faktorenanalyse']
  },
  {
    id: 'faktor-f1-doppel', thema: 'faktor', fall: FA_BFI10,
    stamm: P(`Angenommen, eine Ladung ab ${zd('regel_ladung')} gilt als Zugehörigkeit. N4 hat ${zd('f1_n4_k1')} auf Komponente 1 und ${zd('f1_n4_k2')} auf Komponente 2. Wie ist N4 einzuordnen?`,
      `Assume a loading of ${ze('regel_ladung')} or more counts as belonging. N4 has ${ze('f1_n4_k1')} on component 1 and ${ze('f1_n4_k2')} on component 2. How should N4 be classified?`),
    antworten: [
      a(P('Nur zu Komponente 1, denn die zweite Ladung bleibt im Betrag unter der gesetzten Grenze', 'Only to component 1, since the second loading stays below the set limit in absolute size'),
        P('Mit der gesetzten Regel zählt nur die Ladung auf Komponente 1. Die kleine zweite Ladung ist eine Nebenladung.', 'With the rule that was set, only the loading on component 1 counts. The small second loading is a secondary loading.'), true),
      a(P('Zu beiden Komponenten, denn in beiden Spalten der Tabelle steht eine Ladung', 'To both components, since there is a loading in both columns of the table'),
        P('Zur Zugehörigkeit führt erst eine Ladung, die die Grenze erreicht. Dass eine Zahl angezeigt wird, genügt dafür nicht.', 'Only a loading that reaches the limit leads to belonging. That a number is shown is not enough.')),
      a(P('Zu keiner Komponente, denn eine Frage mit zwei Ladungen sollte ausgeschlossen werden', 'To neither component, since an item with two loadings should be excluded'),
        P('Eine Nebenladung unter der Grenze ist kein Grund, eine Frage zu streichen. Gestrichen wird nach Inhalt und Zweck, nicht mechanisch.', 'A secondary loading below the limit is no reason to drop an item. Items are dropped by content and purpose, not mechanically.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:fa-ladung-05', 'wissen:clark-ladungsgrenzen-itemauswahl', 'Backhaus, Faktorenanalyse; Clark und Watson 1995']
  },
  {
    id: 'faktor-f1-kaiser', thema: 'faktor', fall: FA_BFI10,
    stamm: P(`Angenommen, es bleiben die Komponenten mit einem Eigenwert über ${zd('regel_kaiser', 0)}. Wie viele bleiben?`,
      `Assume the components with an eigenvalue above ${ze('regel_kaiser', 0)} are kept. How many are kept?`),
    antworten: [
      a(P('Zwei, denn nur die ersten beiden Eigenwerte liegen über dieser Grenze', 'Two, since only the first two eigenvalues are above this limit'),
        P(`Die Eigenwerte ${zd('f1_ev1')} und ${zd('f1_ev2')} liegen darüber, schon der dritte mit ${zd('f1_ev3')} darunter.`, `The eigenvalues ${ze('f1_ev1')} and ${ze('f1_ev2')} are above it; the third, ${ze('f1_ev3')}, is already below.`), true),
      a(P('Drei, denn der dritte Eigenwert liegt so nahe an der Grenze', 'Three, since the third eigenvalue is so close to the limit'),
        P('Eine gesetzte Grenze gilt genau. Ein Wert darunter bleibt draußen, auch wenn er knapp darunter liegt.', 'A limit that was set applies exactly. A value below it stays out, even if it is just below.')),
      a(P('Fünf, denn die Tabelle führt fünf Komponenten auf', 'Five, since the table lists five components'),
        P('Die Tabelle zeigt nur die ersten fünf Zeilen von zehn möglichen. Behalten wird nach der Regel, nicht nach der Länge der Tabelle.', 'The table only shows the first five rows of ten possible ones. What is kept follows the rule, not the length of the table.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:kaiser-kriterium-definition', 'Backhaus; Lance u. a. 2006']
  },
  {
    id: 'faktor-f1-varianz', thema: 'faktor', fall: FA_BFI10,
    stamm: P(`In der Tabelle der Eigenwerte steht für Komponente 2 die kumulierte Zahl ${zd('f1_kum2', 1)}. Was bedeutet sie?`,
      `In the table of eigenvalues the cumulative figure for component 2 is ${ze('f1_kum2', 1)}. What does it mean?`),
    antworten: [
      a(P(`Die ersten beiden Komponenten zusammen binden ${zd('f1_kum2', 1)} Prozent der Varianz`, `The first two components together hold ${ze('f1_kum2', 1)} percent of the variance`),
        P('Kumuliert heißt aufsummiert: Es ist der Anteil aus Komponente 1 und 2 zusammen.', 'Cumulative means added up: it is the share of components 1 and 2 together.'), true),
      a(P(`Komponente 2 allein bindet ${zd('f1_kum2', 1)} Prozent der Varianz der Fragen`, `Component 2 alone holds ${ze('f1_kum2', 1)} percent of the variance of the items`),
        P('Den Anteil von Komponente 2 allein zeigt die Spalte „% der Varianz“, nicht die kumulierte.', 'The share of component 2 alone is shown by the column "% of variance", not by the cumulative one.')),
      a(P(`${zd('f1_kum2', 1)} Prozent der Befragten gehören zu einer der beiden Komponenten`, `${ze('f1_kum2', 1)} percent of the respondents belong to one of the two components`),
        P('Die Zahl sagt etwas über Fragen und Varianz, nicht über Personen. Personen werden hier keiner Komponente zugeordnet.', 'The figure says something about items and variance, not about people. People are not assigned to a component here.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:fa-ladung-definition', 'Backhaus, Faktorenanalyse']
  },

  // ---- Fall 2: neun Tests, drei Komponenten, Kommunalitäten ----
  {
    id: 'faktor-f2-mehrfach', thema: 'faktor', fall: FA_HS,
    stamm: P(`Angenommen, eine Ladung ab ${zd('regel_ladung_gross')} gilt als Zugehörigkeit. Wie viele Tests gehören zu mehr als einer Komponente?`,
      `Assume a loading of ${ze('regel_ladung_gross')} or more counts as belonging. How many tests belong to more than one component?`),
    antworten: [
      a(P('Keiner, denn die zweiten Ladungen von x1 und x9 bleiben unter der Grenze', 'None, since the second loadings of x1 and x9 stay below the limit'),
        P(`x1 hat ${zd('f2_x1_a')} und ${zd('f2_x1_b')}, x9 hat ${zd('f2_x9_a')} und ${zd('f2_x9_b')}. Je eine Ladung erreicht die Grenze, die zweite nicht.`, `x1 has ${ze('f2_x1_a')} and ${ze('f2_x1_b')}, x9 has ${ze('f2_x9_a')} and ${ze('f2_x9_b')}. One loading each reaches the limit, the second does not.`), true),
      a(P('Zwei, nämlich x1 und x9, denn beide haben zwei angezeigte Ladungen', 'Two, namely x1 and x9, since both have two loadings shown'),
        P(`Angezeigt wird alles ab ${zd('regel_ladung_aus')}. Die gesetzte Grenze liegt höher; sie entscheidet über die Zugehörigkeit.`, `Everything from ${ze('regel_ladung_aus')} up is shown. The limit that was set is higher; it decides on belonging.`)),
      a(P(`Einer, nämlich x9, denn seine zweite Ladung ${zd('f2_x9_b')} ist größer als die von x1`, `One, namely x9, since its second loading ${ze('f2_x9_b')} is larger than that of x1`),
        P('Größer als die zweite Ladung eines anderen Tests zu sein, reicht nicht. Verglichen wird mit der gesetzten Grenze.', 'Being larger than the second loading of another test is not enough. The comparison is with the limit that was set.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:fa-ladung-05', 'wissen:clark-ladungsgrenzen-itemauswahl', 'Backhaus; Clark und Watson 1995']
  },
  {
    id: 'faktor-f2-kommunalitaet', thema: 'faktor', fall: FA_HS,
    stamm: P(`Test x2 hat die Kommunalität ${zd('f2_h_x2')}. Was sagt die Zahl?`, `Test x2 has the communality ${ze('f2_h_x2')}. What does the figure say?`),
    antworten: [
      a(P(`Die drei Komponenten erklären zusammen rund ${zp('f2_h_x2')} Prozent der Varianz von x2`, `The three components together explain about ${zp('f2_h_x2')} percent of the variance of x2`),
        P('Die Kommunalität ist die Summe der quadrierten Ladungen einer Frage. Sie zeigt den Anteil ihrer Varianz, den die Komponenten erklären.', 'The communality is the sum of the squared loadings of an item. It shows the share of its variance that the components explain.'), true),
      a(P(`x2 hat eine Korrelation von ${zd('f2_h_x2')} mit der dritten Komponente`, `x2 has a correlation of ${ze('f2_h_x2')} with the third component`),
        P(`Die Korrelation mit einer Komponente ist die Ladung (hier ${zd('f2_x2')}). Die Kommunalität fasst alle Komponenten zusammen.`, `The correlation with a component is the loading (here ${ze('f2_x2')}). The communality combines all components.`)),
      a(P(`Die Komponenten erklären ${zpr('f2_h_x2')} Prozent von x2, die übrigen ${zp('f2_h_x2')} Prozent bleiben offen`, `The components explain ${zpr('f2_h_x2')} percent of x2, the remaining ${zp('f2_h_x2')} percent stay open`),
        P('Das kehrt die Zahl um. Die Kommunalität selbst ist der erklärte Anteil, der offene Rest beträgt 1 minus Kommunalität.', 'This turns the figure around. The communality itself is the explained share; the open remainder is 1 minus communality.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:fa-ladung-definition', 'wissen:hka-gegen-fa-modell', 'Backhaus, Faktorenanalyse']
  },
  {
    id: 'faktor-f2-rotation', thema: 'faktor', fall: FA_HS,
    stamm: P('Die Lösung wird mit einer anderen orthogonalen Rotation neu gedreht. Was bleibt dabei gleich?', 'The solution is rotated again with another orthogonal rotation. What stays the same?'),
    antworten: [
      a(P('Die Kommunalitäten der Tests, etwa bei x2', 'The communalities of the tests, for example for x2'),
        P('Die Rotation dreht nur die Achsen. Wie viel Varianz ein Test insgesamt von den Komponenten erhält, ändert sich nicht.', 'The rotation only turns the axes. How much variance a test receives from the components as a whole does not change.'), true),
      a(P(`Die einzelnen Ladungen, etwa ${zd('f2_x2')} bei x2`, `The individual loadings, for example ${ze('f2_x2')} for x2`),
        P('Die Ladungen sind genau das, was die Rotation verändert. Deshalb wird erst nach der Rotation gedeutet.', 'The loadings are exactly what the rotation changes. That is why interpretation comes after the rotation.')),
      a(P('Die Zuordnung der Tests zu den Komponenten', 'The assignment of the tests to the components'),
        P('Ändern sich die Ladungen, kann sich auch die Zuordnung ändern, besonders bei Tests mit zwei mittleren Ladungen.', 'If the loadings change, the assignment can change too, especially for tests with two medium loadings.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:fa-rotation-kommunalitaeten', 'Backhaus, Faktorenanalyse']
  },
  {
    id: 'faktor-f2-benennen', thema: 'faktor', fall: FA_HS,
    stamm: P('x4, x5 und x6 laden alle hoch auf Komponente 1. Welche Formulierung beschreibt das am besten?', 'x4, x5 and x6 all load highly on component 1. Which wording describes this best?'),
    antworten: [
      a(P(`Die drei Tests hängen eng zusammen; den Namen der Komponente liefert erst der Inhalt`, `The three tests are closely related; the name of the component comes only from the content`),
        P('Die Rechnung bündelt Tests. Ihnen einen Namen zu geben, braucht Fachwissen und bleibt eine Deutung.', 'The calculation bundles tests. Giving them a name takes subject knowledge and remains an interpretation.'), true),
      a(P('Die Komponente ist die Ursache der Testergebnisse, denn die Ladungen sind hoch', 'The component is the cause of the test results, since the loadings are high'),
        P('Eine Komponente fasst Zusammenhänge zusammen. Dass sie die Ursache der Werte sei, folgt aus Ladungen allein nicht.', 'A component summarizes relations. That it is the cause of the scores does not follow from loadings alone.')),
      a(P(`Die Rechnung hat bewiesen, dass x4 bis x6 das Sprachverständnis messen`, `The calculation has proven that x4 to x6 measure the verbal comprehension`),
        P('Ein Name kommt von den Menschen, nicht aus der Rechnung. Ein Beweis, dass die Tests genau dies messen, liegt darin nicht.', 'A name comes from people, not from the calculation. There is no proof in it that the tests measure exactly this.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:fa-interpretation-subjektiv', 'Backhaus, Faktorenanalyse']
  },

  // ---- Fall 3: elf Items, drei Komponenten ----
  {
    id: 'faktor-f3-ohne-gruppe', thema: 'faktor', fall: FA_BFI11,
    stamm: P('Zu O2 steht in der Tabelle keine Ladung. Was folgt daraus?', 'The table shows no loading for O2. What follows from this?'),
    antworten: [
      a(P('O2 hängt mit den anderen Fragen kaum zusammen und bildet hier keine eigene Gruppe', 'O2 is hardly related to the other items and forms no group of its own here'),
        P(`Ausgeblendet sind alle Ladungen unter ${zd('regel_ladung_aus')}. Bei O2 ist also jede Ladung klein; die drei Komponenten erklären die Frage kaum.`, `All loadings below ${ze('regel_ladung_aus')} are hidden. So every loading of O2 is small; the three components hardly explain the item.`), true),
      a(P('O2 ist fehlerhaft erhoben und sollte deshalb gelöscht werden', 'O2 was collected wrongly and therefore should be deleted'),
        P('Eine fehlende Ladung ist ein Befund, kein Beweis für einen Erhebungsfehler. Ob die Frage bleibt, wird inhaltlich entschieden.', 'A missing loading is a finding, not proof of a collection error. Whether the item stays is decided by content.')),
      a(P('O2 gehört zur größten Komponente, weil diese die meiste Varianz bindet', 'O2 belongs to the largest component, since it holds the most variance'),
        P('Eine Frage wird nicht der größten Komponente zugeschlagen, nur weil sie sonst nirgends hingehört. Die Zuordnung braucht eine Ladung.', 'An item is not added to the largest component just because it belongs nowhere else. Assignment needs a loading.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:fabrigar-niedrige-kommunalitaet-verzerrt', 'wissen:itemselektion-nicht-mechanisch', 'Fabrigar u. a. 1999']
  },
  {
    id: 'faktor-f3-gegenlaeufig', thema: 'faktor', fall: FA_BFI11,
    stamm: P(`E1 („redet wenig“) und E2 laden positiv auf Komponente 2, E4 („schließt leicht Freundschaften“) lädt mit ${zd('f3_e4_2')}. Wie ist das zu lesen?`,
      `E1 ("talks little") and E2 load positively on component 2, E4 ("makes friends easily") loads with ${ze('f3_e4_2')}. How should this be read?`),
    antworten: [
      a(P('E4 ist entgegengesetzt zu E1 und E2 formuliert und gehört trotzdem zur selben Komponente', 'E4 is worded opposite to E1 and E2 and still belongs to the same component'),
        P(`Die Komponente ist hier als Zurückhaltung gepolt. Eine positiv formulierte Frage steht dann auf der Gegenseite, mit einem Betrag von ${za('f3_e4_2')} aber deutlich dabei.`, `The component is keyed here as reserve. A positively worded item then stands on the opposite side, yet clearly belongs with a size of ${zae('f3_e4_2')}.`), true),
      a(P('E4 bildet wegen des Minuszeichens eine eigene Gruppe neben E1 und E2', 'E4 forms a group of its own next to E1 and E2 because of the minus sign'),
        P('Eine eigene Gruppe würde eine eigene Komponente brauchen. E4 lädt hier auf derselben wie E1 und E2.', 'A group of its own would need a component of its own. E4 loads here on the same one as E1 and E2.')),
      a(P('Eine negative Ladung heißt, dass E4 schlecht passt; nur positive Ladungen gelten', 'A negative loading means E4 fits poorly; only positive loadings count'),
        P('Auch bei negativem Vorzeichen zählt der Betrag. Er ist hier hoch und zeigt eine enge Verbindung.', 'The absolute size counts even with a negative sign. It is high here and shows a close link.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:fa-negative-ladung', 'Backhaus, Faktorenanalyse']
  },
  {
    id: 'faktor-f3-doppel', thema: 'faktor', fall: FA_BFI11,
    stamm: P(`Angenommen, eine Ladung ab ${zd('regel_ladung_aus')} gilt als bedeutsam. N4 hat ${zd('f3_n4_1')} auf Komponente 1 und ${zd('f3_n4_2')} auf Komponente 2. Was trifft zu?`,
      `Assume a loading of ${ze('regel_ladung_aus')} or more counts as meaningful. N4 has ${ze('f3_n4_1')} on component 1 and ${ze('f3_n4_2')} on component 2. What applies?`),
    antworten: [
      a(P('N4 hat auf beiden Komponenten eine bedeutsame Ladung und ist damit eine Frage mit Doppelladung', 'N4 has a meaningful loading on both components and is therefore an item with a double loading'),
        P('Mit dieser Regel erreichen beide Ladungen die Grenze. Eine solche Frage wird nicht einfach zugeordnet, sondern inhaltlich geprüft.', 'With this rule both loadings reach the limit. Such an item is not simply assigned but checked for content.'), true),
      a(P('N4 gehört eindeutig zu Komponente 1, weil die größere Ladung entscheidet', 'N4 clearly belongs to component 1, since the larger loading decides'),
        P('Mit der gesetzten Regel gilt die zweite Ladung ebenfalls. Die größere Ladung zu wählen, wäre eine andere Regel.', 'With the rule that was set, the second loading counts too. Choosing the larger loading would be a different rule.')),
      a(P('N4 gehört zu keiner der Komponenten, weil sich beide Ladungen widersprechen', 'N4 belongs to neither component, since the two loadings contradict each other'),
        P('Zwei Ladungen widersprechen sich nicht. Sie zeigen, dass die Frage mit beiden Komponenten verwandt ist.', 'Two loadings do not contradict each other. They show that the item is related to both components.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:clark-ladungsgrenzen-itemauswahl', 'wissen:fa-ladung-05', 'Clark und Watson 1995']
  },
  {
    id: 'faktor-f3-umpolen', thema: 'faktor', fall: FA_BFI11,
    stamm: P('Aus jeder Komponente soll ein Summenwert der Fragen (Items) gebildet werden. Was ist vorher nötig?', 'A sum score of the items is to be formed for each component. What is needed beforehand?'),
    antworten: [
      a(P(`Fragen mit negativer Ladung (hier E4 und C5) umpolen, damit alle gleichgerichtet zählen`, `Reverse the items with a negative loading (here E4 and C5) so that all count in the same direction`),
        P('Sonst heben sich gegenläufige Fragen in der Summe teilweise auf. Das Umpolen gleicht die Richtung an.', 'Otherwise opposite items partly cancel out in the sum. Reversing aligns the direction.'), true),
      a(P('O2 der Komponente zuschlagen, die ihm am nächsten liegt, damit keine Frage fehlt', 'Add O2 to the component closest to it so that no item is missing'),
        P('Ohne Ladung hat O2 keine nächste Komponente. Eine Frage ohne Zugehörigkeit in eine Summe zu legen, verwässert sie.', 'Without a loading O2 has no closest component. Putting an item without belonging into a sum dilutes it.')),
      a(P('N4 in beide Summenwerte aufnehmen, damit seine zwei Ladungen berücksichtigt sind', 'Include N4 in both sum scores so that its two loadings are taken into account'),
        P('Eine Frage in zwei Summen macht diese künstlich ähnlich. Eine Doppelladung wird besser inhaltlich geklärt.', 'An item in two sums makes them artificially similar. A double loading is better clarified by content.'))
    ],
    hilfe: [...HILFE, 'trennschaerfe'], karte: 'faktor', belege: ['wissen:umpolen-verfahren', 'wissen:fa-negative-ladung', 'Testtheorie Kap. 7; Backhaus']
  },

  // ---- Einzelfragen ----
  {
    id: 'faktor-verfahren', thema: 'faktor',
    stamm: P('Für sechs Fragen (Items) soll ein Modell gerechnet werden, in dem ein gemeinsames Merkmal die Antworten mitbestimmt und der Rest der Varianz jeder Frage als eigener Anteil gilt. Welches Verfahren passt?', 'A model is to be calculated for six questions in which a common attribute helps determine the answers and the rest of the variance of each question counts as a part of its own. Which method fits?'),
    antworten: [
      a(P('Faktorenanalyse, denn sie trennt die gemeinsame Varianz vom eigenen Rest jeder Frage', 'Factor analysis, since it separates the shared variance from the own rest of each question'),
        P('Sie erklärt nur die gemeinsame Varianz. Der Rest, aus Eigenheit der Frage und Messfehler, bleibt als eigene Varianz draußen.', 'It explains only the shared variance. The rest, from the item itself and measurement error, stays out as unique variance.'), true),
      a(P('Hauptkomponentenanalyse, denn sie fasst die gesamte Varianz der Fragen zusammen', 'Principal component analysis, since it condenses the total variance of the questions'),
        P('Sie dient der Verdichtung der Daten. Eine gemeinsame Ursache unterstellt sie nicht; sie zerlegt die gesamte Varianz der Fragen, ohne gemeinsame und eigene Varianz zu trennen.', 'It serves to condense the data. It does not assume a common cause; it decomposes the total variance of the items without separating common and unique variance.')),
      a(P('Bartlett-Test, denn er legt fest, welches Merkmal die Fragen verbindet', 'Bartlett test, since it determines which attribute links the questions'),
        P('Der Test prüft nur, ob die Korrelationsmatrix Zusammenhänge enthält (Abweichung von der Einheitsmatrix). Ein Merkmal benennt er nicht.', 'The test only checks whether the correlation matrix contains relations (deviation from the identity matrix). It does not name an attribute.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:hka-gegen-fa-modell', 'Backhaus; Fabrigar u. a. 1999']
  },
  {
    id: 'faktor-ladung-bedeutung', thema: 'faktor',
    stamm: P(`Test x2 hat auf Komponente 3 die Ladung ${zd('f2_x2')}. Was bedeutet das?`, `Test x2 has the loading ${ze('f2_x2')} on component 3. What does that mean?`),
    antworten: [
      a(P(`Test und Komponente hängen mit einer Korrelation von ${zd('f2_x2')} zusammen`, `Test and component are related with a correlation of ${ze('f2_x2')}`),
        P('Eine Ladung ist die Korrelation zwischen der Variablen und der Komponente (hier bei orthogonaler Rotation).', 'A loading is the correlation between the variable and the component (here with an orthogonal rotation).'), true),
      a(P(`${zp('f2_x2')} Prozent der Varianz von x2 gehen auf Komponente 3 zurück`, `${zp('f2_x2')} percent of the variance of x2 goes back to component 3`),
        P(`Der Anteil der Varianz ist die quadrierte Ladung. Das Quadrat von ${zd('f2_x2')} ist deutlich kleiner als ${zd('f2_x2')}.`, `The share of the variance is the squared loading. The square of ${ze('f2_x2')} is clearly smaller than ${ze('f2_x2')}.`)),
      a(P(`${zp('f2_x2')} Prozent der Kinder gehören zu Komponente 3`, `${zp('f2_x2')} percent of the children belong to component 3`),
        P('Die Ladung beschreibt Tests und Komponenten, nicht Personen. Kinder werden dadurch keiner Gruppe zugeteilt.', 'The loading describes tests and components, not people. Children are not assigned to a group by it.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:fa-ladung-definition', 'Backhaus, Faktorenanalyse']
  },
  {
    id: 'faktor-kaiser-hs', thema: 'faktor',
    stamm: P(`Angenommen, es bleiben die Komponenten mit einem Eigenwert über ${zd('regel_kaiser', 0)} (Kaiser-Kriterium). Wie viele sind es?`,
      `Assume the components with an eigenvalue above ${ze('regel_kaiser', 0)} are kept (Kaiser criterion). How many is that?`),
    tabelle: tab('faktor-kaiser-hs', [P('Komponente', 'Component'), P('Eigenwert', 'Eigenvalue')], QUELLE_HS, P('Eigenwerte der ersten fünf Komponenten (neun Tests)', 'Eigenvalues of the first five components (nine tests)')),
    antworten: [
      a(P('Drei, denn die ersten drei Eigenwerte liegen über der gesetzten Grenze', 'Three, since the first three eigenvalues are above the limit that was set'),
        P(`${zd('kaiser_hs_ev1')}, ${zd('kaiser_hs_ev2')} und ${zd('kaiser_hs_ev3')} liegen darüber; ab der vierten Komponente (${zd('kaiser_hs_ev4')}) darunter.`, `${ze('kaiser_hs_ev1')}, ${ze('kaiser_hs_ev2')} and ${ze('kaiser_hs_ev3')} are above it; from the fourth component (${ze('kaiser_hs_ev4')}) on they are below.`), true),
      a(P('Eine, denn nach der ersten Komponente fällt die Kurve am stärksten ab', 'One, since the curve drops most after the first component'),
        P(`Von ${zd('kaiser_hs_ev1')} auf ${zd('kaiser_hs_ev2')} fällt die Kurve am stärksten, doch das ist ein Blick auf die Kurve (Scree-Test), keine Regel. Das Kaiser-Kriterium zählt Eigenwerte über der Grenze.`, `The curve drops most from ${ze('kaiser_hs_ev1')} to ${ze('kaiser_hs_ev2')}, but that is a look at the curve (scree test), not a rule. The Kaiser criterion counts eigenvalues above the limit.`)),
      a(P('Vier, denn auch die vierte Komponente bindet noch einen Teil der Varianz', 'Four, since the fourth component also still holds a part of the variance'),
        P(`Jede Komponente bindet etwas. Nach der Regel zählt nur ein Eigenwert über der Grenze, und ${zd('kaiser_hs_ev4')} liegt darunter.`, `Every component holds something. By the rule only an eigenvalue above the limit counts, and ${ze('kaiser_hs_ev4')} is below it.`))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:kaiser-kriterium-definition', 'wissen:scree-subjektiv', 'Backhaus; Hayton u. a. 2004']
  },
  {
    id: 'faktor-kaiser-grenze', thema: 'faktor',
    stamm: P('Warum wird davon abgeraten, die Zahl der Faktoren allein nach dem Kaiser-Kriterium zu wählen?', 'Why is it advised against choosing the number of factors by the Kaiser criterion alone?'),
    antworten: [
      a(P(`Es liefert in Simulationen oft zu viele Faktoren; Parallelanalyse ergänzt es`, `In simulations it often yields too many factors; parallel analysis complements it`),
        P('Mehrere Simulationsstudien fanden eine Überschätzung. Darum gilt es nicht als alleiniges Kriterium.', 'Several simulation studies found an overestimation. That is why it is not seen as a sole criterion.'), true),
      a(P(`Sein Beweis gilt nur für die Stichprobe, nicht für die Bevölkerung insgesamt`, `Its proof holds only for the sample, not for the population as a whole`),
        P('Es ist umgekehrt: Der Beweis der Eigenwertregel gilt für Populationsmatrizen, nicht für Stichproben.', 'It is the other way round: the proof of the eigenvalue rule holds for population matrices, not for samples.')),
      a(P('Es liefert in Simulationen meist zu wenige Faktoren und übersieht schwache', 'In simulations it mostly yields too few factors and misses weak ones'),
        P('Die Abweichung geht in die andere Richtung: Es neigt zu einer Überschätzung der Faktorenzahl.', 'The deviation goes in the other direction: it tends to overestimate the number of factors.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:kaiser-ueberschaetzt', 'wissen:kaiser-populationsmatrizen', 'Lance u. a. 2006; Hayton u. a. 2004']
  },
  {
    id: 'faktor-rotation-lage', thema: 'faktor',
    stamm: P('Zwei Forschende drehen dieselbe Lösung mit zwei Faktoren unterschiedlich und erhalten verschiedene Ladungen, beide passen gleich gut zu den Korrelationen. Was gilt?', 'Two researchers rotate the same two-factor solution differently and get different loadings; both fit the correlations equally well. What applies?'),
    antworten: [
      a(P('Es gibt viele gleich gut passende Lagen; die Rotation wählt eine mit möglichst klarer Struktur', 'Many equally fitting positions exist; rotation picks one with the clearest structure'),
        P('Ohne Rotation ist die Lösung nicht eindeutig. Üblich ist die Einfachstruktur: jede Variable lädt vor allem auf einen Faktor.', 'Without rotation the solution is not unique. Simple structure is usual: each variable loads mainly on one factor.'), true),
      a(P('Eine der beiden Rechnungen ist fehlerhaft, denn zu den Daten gehört eine richtige Lösung', 'One of the two calculations is wrong, since there is one correct solution for the data'),
        P('Beide können richtig gerechnet sein. Die Lagen unterscheiden sich in der Darstellung, nicht in der Passung.', 'Both can be calculated correctly. The positions differ in presentation, not in fit.')),
      a(P('Die stärkere Rotation erklärt mehr Varianz und ist deshalb die bessere Wahl', 'The stronger rotation explains more variance and is therefore the better choice'),
        P('Eine Rotation ändert die insgesamt erklärte Varianz nicht. Sie verteilt sie nur anders auf die Faktoren.', 'A rotation does not change the total variance explained. It only distributes it differently over the factors.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:fabrigar-rotation-nicht-eindeutig', 'Fabrigar u. a. 1999']
  },
  {
    id: 'faktor-schief', thema: 'faktor',
    stamm: P('Wann liefert eine schiefwinklige (oblique) Rotation ein anderes Bild als eine orthogonale?', 'When does an oblique rotation give a different picture than an orthogonal one?'),
    antworten: [
      a(P('Wenn die Faktoren in den Daten wirklich zusammenhängen; sonst ähnelt das Bild dem der orthogonalen', 'When the factors are really related in the data; otherwise the picture resembles the orthogonal one'),
        P('Sind die Faktoren unkorreliert, ergibt die schiefwinklige Rotation Korrelationen nahe null und ähnelt der orthogonalen Lösung.', 'If the factors are uncorrelated, the oblique rotation gives correlations near zero and resembles the orthogonal solution.'), true),
      a(P('Sie erzwingt meist Korrelationen zwischen den Faktoren, auch wenn die Daten keine zeigen', 'It mostly forces correlations between the factors even where the data show none'),
        P('Sie erlaubt Korrelationen, verlangt sie aber nicht. Das Ergebnis richtet sich nach den Daten.', 'It allows correlations but does not demand them. The result follows the data.')),
      a(P('Sie ändert oft die Kommunalitäten der Fragen, die orthogonale Rotation lässt sie unverändert', 'It often changes the communalities of the items, while the orthogonal rotation leaves them unchanged'),
        P('Die gemeinsame Varianz einer Frage ändert sich durch eine Rotation nicht, ob orthogonal oder schiefwinklig.', 'The shared variance of an item does not change through a rotation, whether orthogonal or oblique.'))
    ],
    hilfe: [...HILFE, 'eigenwert-rotation'], karte: 'faktor', belege: ['wissen:fabrigar-oblique-erzwingt-keine-korrelation', 'wissen:fa-rotation-arten', 'Fabrigar u. a. 1999']
  },
  {
    id: 'faktor-fallzahl', thema: 'faktor',
    stamm: P('In einer Studie haben die Fragen (Items) hohe Kommunalitäten, und jeden Faktor bestimmen mehrere Fragen deutlich. Was gilt für die nötige Fallzahl?', 'In a study the items have high communalities and each factor is clearly determined by several items. What applies to the necessary sample size?'),
    antworten: [
      a(P('Sie kann kleiner ausfallen, denn es zählen hohe Kommunalitäten und viele bestimmende Fragen', 'It can be smaller, since high communalities and many determining items are what count'),
        P('Hohe Kommunalitäten und gut bestimmte Faktoren machen die Lösung auch bei kleinerer Stichprobe stabil. Ein festes Verhältnis zählt dabei nicht.', 'High communalities and well determined factors make the solution stable even in a smaller sample. A fixed ratio does not count here.'), true),
      a(P('Sie folgt einem festen Verhältnis von Fällen je Frage, das sich nach der Zahl der Fragen richtet', 'It follows a fixed ratio of cases per item that depends on the number of items'),
        P('Solche Verhältnisse erfassen nicht, wovon die Stabilität abhängt: von den Kommunalitäten und davon, wie viele Fragen jeden Faktor bestimmen.', 'Such ratios do not capture what stability depends on: the communalities and how many items determine each factor.')),
      a(P('Sie wächst mit jeder weiteren Frage, weil jede zusätzliche Frage mehr Fälle verlangt', 'It grows with every further item, since each added item demands more cases'),
        P('Weitere Fragen mit hohen Ladungen können die Lösung sogar festigen. Die Zahl allein entscheidet nicht.', 'Further items with high loadings can even strengthen the solution. The number alone does not decide.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:maccallum-keine-feste-mindestgroesse', 'wissen:fabrigar-stichprobe-haengt-von-bedingungen', 'MacCallum u. a. 1999; Fabrigar u. a. 1999']
  },
  {
    id: 'faktor-bartlett', thema: 'faktor',
    stamm: P(`Bei ${zn('f1_n')} Personen fällt der Bartlett-Test auf Sphärizität signifikant aus. Was folgt daraus?`, `With ${zn('f1_n')} people the Bartlett test of sphericity is significant. What follows from this?`),
    antworten: [
      a(P(`Wenig: Bei großer Fallzahl weicht fast jede Matrix von einer Matrix ohne Zusammenhänge ab`, `Little: with a large sample almost every matrix differs from one without any relations`),
        P('Eine Matrix ohne Zusammenhänge heißt Einheitsmatrix. Die Prüfgröße hängt stark von der Fallzahl ab, darum fällt der Test bei vielen Fällen fast sicher signifikant aus.', 'A matrix without relations is called an identity matrix. The test statistic depends strongly on the sample size, so with many cases the test is almost certain to be significant.'), true),
      a(P(`Die Daten sind damit für eine Faktorenanalyse geeignet, weitere Prüfungen sind kaum nötig`, `The data are therefore suitable for a factor analysis, further checks are hardly needed`),
        P('Der Test zeigt nur, dass die Matrix nicht ohne Zusammenhänge ist. Über sinnvolle Faktoren sagt er wenig.', 'The test only shows that the matrix is not free of relations. It says little about meaningful factors.')),
      a(P('Es gibt so viele Faktoren wie Fragen, weil jede Frage ihre eigene Varianz hat', 'There are as many factors as items, since each item has variance of its own'),
        P('Der Test sagt nichts über die Zahl der Faktoren. Dafür dienen andere Hilfen wie Eigenwerte und Parallelanalyse.', 'The test says nothing about the number of factors. Other aids such as eigenvalues and parallel analysis serve that purpose.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:bartlett-test-sphaerizitaet', 'Backhaus; Howard 2015']
  },
  {
    id: 'faktor-neue-daten', thema: 'faktor',
    stamm: P('Eine explorative Faktorenanalyse hat eine Struktur ergeben. Wie lässt sie sich konfirmatorisch absichern?', 'An exploratory factor analysis has produced a structure. How can it be secured confirmatorily?'),
    antworten: [
      a(P('An neuen Daten, die bei der Suche nach der Struktur keine Rolle spielten', 'On new data that played no part in the search for the structure'),
        P('Eine Struktur, die an denselben Daten gefunden wurde, passt zu diesen fast zwangsläufig. Neue Daten sind die Probe.', 'A structure found in the same data fits those data almost inevitably. New data are the test.'), true),
      a(P('An denselben Daten, indem das Modell mit einem anderen Programm gerechnet wird', 'On the same data, by calculating the model with another program'),
        P('Ein anderes Programm ändert die Daten nicht. Eine Bestätigung an denselben Daten ist keine unabhängige Probe.', 'Another program does not change the data. A confirmation on the same data is not an independent test.')),
      a(P('Es ist nicht nötig, denn hohe Ladungen gelten schon als Bestätigung der Struktur', 'It is not necessary, since high loadings already count as confirmation of the structure'),
        P('Hohe Ladungen beschreiben die gefundene Struktur, sie bestätigen sie nicht gegenüber der Frage, ob sie sich wiederholt.', 'High loadings describe the structure found; they do not confirm whether it repeats.'))
    ],
    hilfe: [...HILFE, 'cfa'], karte: 'faktor', belege: ['wissen:efa-cfa-neue-daten', 'Testtheorie Kap. 2']
  },
  {
    id: 'faktor-spannweite', thema: 'faktor',
    stamm: P('Befragt werden nur Personen, die sich in den gemessenen Merkmalen sehr ähnlich sind, etwa nur sehr gute Schülerinnen und Schüler. Wie wirkt sich das auf die Ladungen aus?', 'Only people who are very similar in the attributes measured are surveyed, say only very strong pupils. How does this affect the loadings?'),
    antworten: [
      a(P('Die Korrelationen und damit die Ladungen fallen meist zu niedrig aus', 'The correlations and with them the loadings mostly turn out too low'),
        P('Bei geringer Streuung der Merkmale sinken die Korrelationen (Einschränkung der Spannweite).', 'With little spread in the attributes the correlations drop (restriction of range).'), true),
      a(P('Die Ladungen fallen meist zu hoch aus, weil ähnliche Personen ähnlich antworten', 'The loadings mostly turn out too high, since similar people answer similarly'),
        P('Ähnliche Personen unterscheiden sich wenig; was nicht streut, kann kaum korrelieren. Die Ladungen sinken.', 'Similar people differ little; what does not vary can hardly correlate. The loadings drop.')),
      a(P('Die Ladungen ändern sich kaum, denn sie hängen nur von den Fragen ab', 'The loadings hardly change, since they depend only on the items'),
        P('Ladungen stammen aus Korrelationen, und diese hängen auch von der befragten Gruppe ab.', 'Loadings come from correlations, and these depend on the group surveyed too.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:fabrigar-spannweite-eingeschraenkt', 'Fabrigar u. a. 1999']
  },
  {
    id: 'faktor-kommunalitaet-niedrig', thema: 'faktor',
    stamm: P('Eine Frage (Item) hat eine sehr niedrige Kommunalität. Welche Ursache ist möglich?', 'An item has a very low communality. Which cause is possible?'),
    antworten: [
      a(P('Die Frage misst unzuverlässig, denn Zufallsfehler stecken nicht in gemeinsamen Faktoren', 'The item measures unreliably, since random error cannot be explained by common factors'),
        P('Eine geringe Reliabilität drückt die Kommunalität. Solche Fragen können die Lösung stark verzerren.', 'Low reliability pulls the communality down. Such items can distort the solution strongly.'), true),
      a(P('Die Frage ist besonders wichtig, denn viel eigene Varianz heißt viel Information', 'The item is especially important, since a lot of its own variance means a lot of information'),
        P('Eigene Varianz kann Zufallsfehler sein. Eine niedrige Kommunalität ist deshalb kein Zeichen für Wichtigkeit.', 'Own variance can be random error. A low communality is therefore no sign of importance.')),
      a(P('Die gewählte Rotation war ungeeignet; mit einer anderen steigt die Kommunalität', 'The chosen rotation was unsuitable; with another one the communality rises'),
        P('Eine Rotation ändert die Kommunalität nicht. Die Ursache liegt in der Frage oder in den Daten.', 'A rotation does not change the communality. The cause lies in the item or in the data.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:fabrigar-niedrige-kommunalitaet-verzerrt', 'wissen:fa-rotation-kommunalitaeten', 'Fabrigar u. a. 1999']
  },
  {
    id: 'faktor-pca-ladungen', thema: 'faktor',
    stamm: P('Dieselben Daten werden mit Hauptkomponentenanalyse und mit Faktorenanalyse gerechnet. Was ist bei den Ladungen zu erwarten?', 'The same data are analysed with principal component analysis and with factor analysis. What is to be expected for the loadings?'),
    antworten: [
      a(P('Die Hauptkomponentenladungen fallen meist höher aus, besonders bei wenigen Fragen je Faktor', 'The principal component loadings mostly turn out higher, especially with few items per factor'),
        P('Die Komponentenanalyse nutzt die ganze Varianz inklusive Unique. Daraus ergeben sich größere Ladungen.', 'Component analysis uses the whole variance including unique variance. That gives larger loadings.'), true),
      a(P('Beide Verfahren liefern dieselben Ladungen, denn sie rechnen mit denselben Korrelationen', 'Both methods give the same loadings, since they work with the same correlations'),
        P('Die Diagonale der Korrelationsmatrix unterscheidet sich: Einsen bei der Komponentenanalyse, Schätzwerte der Kommunalität bei der Faktorenanalyse.', 'The diagonal of the correlation matrix differs: ones in component analysis, estimates of the communality in factor analysis.')),
      a(P('Die Hauptkomponentenladungen fallen meist niedriger aus, weil sie Fehler herausrechnen', 'The principal component loadings mostly turn out lower, since they remove error'),
        P('Es ist umgekehrt: Die Komponentenanalyse rechnet den Fehler nicht heraus und kommt deshalb meist auf größere Werte.', 'It is the other way round: component analysis does not remove error and therefore usually reaches larger values.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:fabrigar-pca-ladungen-groesser', 'wissen:fa-kommunalitaetenproblem', 'Fabrigar u. a. 1999; Velicer und Jackson 1990']
  },
  {
    id: 'faktor-eignung', thema: 'faktor',
    stamm: P('Welche Überlegung geht der Rechnung einer Faktorenanalyse voraus, noch bevor Kennzahlen betrachtet werden?', 'Which consideration comes before the calculation of a factor analysis, even before any key figures are looked at?'),
    antworten: [
      a(P('Ob inhaltlich plausibel ist, dass hinter den Fragen ein gemeinsames Merkmal steht', 'Whether it is plausible by content that a common attribute stands behind the items'),
        P('Die Faktorenanalyse unterstellt eine gemeinsame Ursache hinter den Korrelationen. Das muss fachlich Sinn ergeben.', 'Factor analysis assumes a common cause behind the correlations. That has to make sense in the subject matter.'), true),
      a(P('Ob der KMO-Wert hoch genug ist, damit die Faktorenanalyse gerechnet werden darf', 'Whether the KMO value is high enough for the factor analysis to be calculated'),
        P('Der KMO-Wert ist eine Kennzahl, und Kennzahlen kommen danach. Die inhaltliche Eignung geht ihnen voran.', 'The KMO value is a key figure, and key figures come afterwards. Suitability by content comes before them.')),
      a(P('Ob jede Frage annähernd normalverteilt ist, damit Ladungen berechnet werden können', 'Whether every item is roughly normally distributed so that loadings can be calculated'),
        P('Die Berechnung der Ladungen braucht die Korrelationen. Die Verteilungsfrage ist eine andere und nachrangige.', 'Computing the loadings needs the correlations. The question of distribution is a different, secondary one.'))
    ],
    hilfe: HILFE, karte: 'faktor', belege: ['wissen:fa-konzeptionelle-eignung', 'wissen:kmo-msa-bedeutung', 'Backhaus, Faktorenanalyse']
  }
];
