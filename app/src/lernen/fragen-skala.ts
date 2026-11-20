/**
 * Üben: Skala und Reliabilität (Cronbachs Alpha). Eigene Wortlaute; alle Zahlen und Tabellen aus
 * app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R, Daten: psych::bfi und lavaan::HolzingerSwineford1939).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, zd, ze, zn } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const HILFE = ['frage-skala', 'reliabilitaet'];
const HT = [...HILFE, 'trennschaerfe'];

const quelleBfi = (n: string) => P(
  `Daten: psych::bfi (SAPA-Projekt 2010, Fragen aus dem IPIP; Paket psych, Lizenz GPL ≥ 2), ${zn(n)} Personen mit allen Antworten der Fragen; Antworten von 1 bis 6; berechnet mit R.`,
  `Data: psych::bfi (SAPA project 2010, items from the IPIP; package psych, licence GPL ≥ 2), ${zn(n)} people with all answers to the items; answers from 1 to 6; computed with R.`);
const QUELLE_HS = P(
  `Daten: lavaan::HolzingerSwineford1939 (Holzinger und Swineford 1939; Paket lavaan, Lizenz GPL ≥ 2), ${zn('s4_n')} Kinder; berechnet mit R.`,
  `Data: lavaan::HolzingerSwineford1939 (Holzinger and Swineford 1939; package lavaan, licence GPL ≥ 2), ${zn('s4_n')} children; computed with R.`);
const KOPF3 = [P('Item', 'Item'), P('Korrigierte Trennschärfe', 'Corrected item-total correlation'), P('Alpha, wenn Item gelöscht', 'Alpha if item deleted')];

const QUELLE_FORMEL = P(
  `Daten: psych::bfi (Revelle, Wilt und Rosenthal 2010, SAPA-Projekt; Items aus dem IPIP, Goldberg 1999, gemeinfrei; Paket psych, Lizenz GPL), ${zn('sf_n')} Personen, fünf Aussagen zur Verträglichkeit (A1 umgepolt). Omega aus einem Ein-Faktor-Modell (lavaan). Berechnet mit R.`,
  `Data: psych::bfi (Revelle, Wilt and Rosenthal 2010, SAPA project; items from the IPIP, Goldberg 1999, public domain; package psych, licence GPL), ${zn('sf_n')} people, five statements on agreeableness (A1 reverse-coded). Omega from a one-factor model (lavaan). Computed with R.`);

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'skala-bfi-a': {
    titel: P('Fünf Fragen zur Verträglichkeit; A1 („gleichgültig gegenüber den Gefühlen anderer“) ist gegenläufig formuliert',
      'Five items on agreeableness; A1 ("indifferent to the feelings of others") is worded in the opposite direction'),
    tabellen: [
      tab('skala-bfi-a.0', KOPF3, quelleBfi('s1_n'), P(`Item-Skala-Statistik, Rohwerte (Alpha = ${zd('s1_alpha0', 3)})`, `Item-total statistics, raw scores (alpha = ${ze('s1_alpha0', 3)})`)),
      tab('skala-bfi-a.1', KOPF3, quelleBfi('s1_n'), P(`Item-Skala-Statistik, nachdem A1 umgepolt wurde (Alpha = ${zd('s1_alpha1', 3)})`, `Item-total statistics after A1 was reversed (alpha = ${ze('s1_alpha1', 3)})`))
    ]
  },
  'skala-bfi-o': {
    titel: P('Fünf Fragen zur Offenheit; O2 („meidet schwierige Lektüre“) und O5 („geht Themen nicht auf den Grund“) sind bereits umgepolt',
      'Five items on openness; O2 ("avoids difficult reading") and O5 ("does not probe a subject deeply") have already been reversed'),
    tabellen: [tab('skala-bfi-o.0', KOPF3, quelleBfi('s2_n'), P(`Item-Skala-Statistik (Alpha = ${zd('s2_alpha', 3)})`, `Item-total statistics (alpha = ${ze('s2_alpha', 3)})`))]
  },
  'skala-laenge': {
    titel: P('Drei Skalen aus demselben Fragebogen: Verträglichkeit (A), Geselligkeit (E) und beide zusammen (A + E); gegenläufige Fragen sind umgepolt',
      'Three scales from the same questionnaire: agreeableness (A), sociability (E) and both together (A + E); opposite items have been reversed'),
    tabellen: [tab('skala-laenge.0',
      [P('Skala', 'Scale'), P('Items', 'Items'), P('Alpha', 'Alpha'), P('Mittlere Inter-Item-Korrelation', 'Mean inter-item correlation'), P('Komponenten mit Eigenwert über 1', 'Components with eigenvalue above 1')],
      P(`Daten: psych::bfi (SAPA-Projekt 2010, Fragen aus dem IPIP; Paket psych, Lizenz GPL ≥ 2), ${zn('s3_ae_n')} Personen mit allen zehn Antworten; berechnet mit R.`,
        `Data: psych::bfi (SAPA project 2010, items from the IPIP; package psych, licence GPL ≥ 2), ${zn('s3_ae_n')} people with all ten answers; computed with R.`),
      P('Vergleich der Skalen', 'Comparison of the scales'))]
  },
  'skala-formel': {
    titel: P('Fünf Aussagen zur Verträglichkeit: Alpha mit und ohne Faktor, Omega', 'Five statements on agreeableness: alpha with and without the factor, omega'),
    tabellen: [
      tab('skala-formel.0', [P('Größe', 'Quantity'), P('Wert', 'Value')], QUELLE_FORMEL, P('Bausteine von Alpha und Omega', 'Building blocks of alpha and omega'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Fall 1: Verträglichkeit, vor und nach dem Umpolen ----
  {
    id: 'skala-f1-erkennen', thema: 'skala', fall: 'skala-bfi-a',
    stamm: P('Welche Zahl in der ersten Tabelle weist auf ein Problem mit A1 hin, und worauf deutet sie?', 'Which figure in the first table points to a problem with A1, and what does it indicate?'),
    antworten: [
      a(P(`Die Trennschärfe ${zd('s1_a1_r0', 3)}: A1 läuft gegen die übrigen Fragen, vermutlich fehlt das Umpolen`, `The item-total correlation ${ze('s1_a1_r0', 3)}: A1 runs against the other items, probably the reversing is missing`),
        P('Eine negative Trennschärfe heißt, dass Personen mit hohem Gesamtwert die Frage eher niedrig beantworten. Zuerst wird eine vergessene Umpolung geprüft.', 'A negative item-total correlation means that people with a high total score tend to answer the item low. A forgotten reversal is checked first.'), true),
      a(P(`Das Alpha ohne A1 von ${zd('s1_a1_ad0', 3)}: A1 ist die beste Frage, weil der Wert so hoch ist`, `The alpha without A1 of ${ze('s1_a1_ad0', 3)}: A1 is the best item because the value is so high`),
        P('Ein hoher Wert in dieser Spalte heißt, dass die Skala ohne die Frage besser dasteht. Das spricht eher gegen die Frage.', 'A high value in this column means the scale does better without the item. That speaks rather against the item.')),
      a(P(`Die Trennschärfe ${zd('s1_a1_r0', 3)}: Der Betrag ist groß, deshalb trennt A1 gut`, `The item-total correlation ${ze('s1_a1_r0', 3)}: the size is large, so A1 separates well`),
        P('Das Vorzeichen zählt hier. Negativ bedeutet, dass die Frage gegen den Gesamtwert arbeitet, nicht, dass sie gut trennt.', 'The sign matters here. Negative means the item works against the total score, not that it separates well.'))
    ],
    hilfe: HT, karte: 'skala', belege: ['wissen:negative-trennschaerfe-ursache', 'wissen:trennschaerfe-lesart', 'Testtheorie Kap. 7']
  },
  {
    id: 'skala-f1-umpolen', thema: 'skala', fall: 'skala-bfi-a',
    stamm: P(`Nach dem Umpolen von A1 steigt Alpha von ${zd('s1_alpha0', 3)} auf ${zd('s1_alpha1', 3)}. Warum?`, `After reversing A1 alpha rises from ${ze('s1_alpha0', 3)} to ${ze('s1_alpha1', 3)}. Why?`),
    antworten: [
      a(P('Alle Fragen zählen nun in dieselbe Richtung, die Fragen hängen im Mittel positiv zusammen', 'All items now count in the same direction, the items are related positively on average'),
        P('Alpha hängt an den Kovarianzen der Fragen. Eine gegenläufige Frage zieht sie nach unten, nach dem Umpolen stützt sie diese.', 'Alpha depends on the covariances of the items. An opposite item pulls them down; after reversing it supports them.'), true),
      a(P('Die Skala hat durch das Umpolen mehr Fragen bekommen', 'The scale has gained more items through the reversing'),
        P('Die Zahl der Fragen ist mit fünf gleich geblieben. Umgepolt wurden nur die Werte einer Frage.', 'The number of items stayed at five. Only the values of one item were reversed.')),
      a(P('Die Antworten streuen nach dem Umpolen weniger, dadurch fällt der Messfehler kleiner aus', 'The answers vary less after reversing, so the measurement error turns out smaller'),
        P('Die Streuung der Frage bleibt beim Umpolen gleich, nur die Richtung dreht sich. Der Messfehler ändert sich dadurch nicht.', 'The variance of the item stays the same when reversing; only the direction turns. The measurement error does not change through it.'))
    ],
    hilfe: HT, karte: 'skala', belege: ['wissen:alpha-negativ-moeglich', 'wissen:umpolen-verfahren', 'Cho 2015; Testtheorie Kap. 7']
  },
  {
    id: 'skala-f1-loeschen', thema: 'skala', fall: 'skala-bfi-a',
    stamm: P(`Nach dem Umpolen liegt das Alpha ohne A1 bei ${zd('s1_a1_ad1', 3)}, die Skala hat ${zd('s1_alpha1', 3)}. Wie ist das zu werten?`, `After reversing, alpha without A1 is ${ze('s1_a1_ad1', 3)} and the scale has ${ze('s1_alpha1', 3)}. How should this be judged?`),
    antworten: [
      a(P(`Der Zuwachs ist klein und A1 trennt positiv (${zd('s1_a1_r1', 3)}); der Inhalt entscheidet`, `The gain is small and A1 separates positively (${ze('s1_a1_r1', 3)}); content decides`),
        P('Das Löschen nach dem Programmvorschlag allein ist unsicher, denn der Wert hängt von den übrigen Fragen ab. Zusätzlich verengt es den Inhalt der Skala.', 'Deleting on the program’s suggestion alone is uncertain, since the value depends on the other items. It also narrows the content of the scale.'), true),
      a(P(`A1 wird gestrichen, weil Alpha ohne diese Frage höher ausfällt`, `A1 is dropped because alpha turns out higher without this item`),
        P('Ein höheres Alpha ohne die Frage ist ein Hinweis, kein Befehl. Fragen werden nach Inhalt und Zweck behalten oder gestrichen.', 'A higher alpha without the item is a hint, not an order. Items are kept or dropped by content and purpose.')),
      a(P('A1 ist die beste Frage der Skala, weil ihr Wert in der Spalte am höchsten ist', 'A1 is the best item of the scale because its value in the column is the highest'),
        P('In der Spalte „Alpha, wenn Item gelöscht“ steht der höchste Wert bei der Frage, die der Skala am wenigsten beiträgt.', 'In the column "alpha if item deleted" the highest value belongs to the item that contributes least to the scale.'))
    ],
    hilfe: HT, karte: 'skala', belege: ['wissen:alpha-if-deleted-unzuverlaessig', 'wissen:itemselektion-nicht-mechanisch', 'Raykov 2008; Cho 2015']
  },
  {
    id: 'skala-f1-beitrag', thema: 'skala', fall: 'skala-bfi-a',
    stamm: P('Welche Frage (Item) trägt nach dem Umpolen laut zweiter Tabelle am meisten zur Skala bei?', 'Which item contributes most to the scale after reversing, according to the second table?'),
    antworten: [
      a(P(`A3: höchste Trennschärfe (${zd('s1_a3_r1', 3)}), ohne A3 fiele Alpha am stärksten (${zd('s1_a3_ad1', 3)})`, `A3: highest item-total correlation (${ze('s1_a3_r1', 3)}), without A3 alpha would fall the most (${ze('s1_a3_ad1', 3)})`),
        P('Beide Spalten zeigen dasselbe: Die Frage mit der höchsten Trennschärfe stützt die Skala am meisten, ohne sie sinkt Alpha am stärksten.', 'Both columns show the same: the item with the highest item-total correlation supports the scale most, and alpha drops most without it.'), true),
      a(P(`A1: Das Alpha ohne A1 ist mit ${zd('s1_a1_ad1', 3)} am höchsten, A1 trägt also am meisten bei`, `A1: alpha without A1 is the highest at ${ze('s1_a1_ad1', 3)}, so A1 contributes the most`),
        P('Der höchste Wert in der Spalte „Alpha, wenn Item gelöscht“ zeigt die Frage mit dem kleinsten Beitrag.', 'The highest value in the column "alpha if item deleted" shows the item with the smallest contribution.')),
      a(P(`A4: Das Alpha ohne A4 bleibt mit ${zd('s1_a4_ad1', 3)} fast gleich, A4 ist also unauffällig`, `A4: alpha without A4 stays almost the same at ${ze('s1_a4_ad1', 3)}, so A4 is inconspicuous`),
        P('Bleibt Alpha fast gleich, trägt die Frage wenig bei. Der größte Beitrag zeigt sich in einem deutlichen Abfall.', 'If alpha stays almost the same, the item contributes little. The largest contribution shows in a clear drop.'))
    ],
    hilfe: HT, karte: 'skala', belege: ['wissen:trennschaerfe-part-whole', 'wissen:alpha-if-deleted-definition', 'Testtheorie Kap. 7; Raykov 2008']
  },

  // ---- Fall 2: Offenheit ----
  {
    id: 'skala-f2-grenze', thema: 'skala', fall: 'skala-bfi-o',
    stamm: P(`Angenommen, ein Alpha ab ${zd('regel_alpha')} gilt für den Zweck als ausreichend. Erfüllt die Skala das?`, `Assume an alpha of ${ze('regel_alpha')} or more counts as sufficient for the purpose. Does the scale meet it?`),
    antworten: [
      a(P(`Nein, ${zd('s2_alpha', 3)} liegt darunter, und keine einzelne Frage hebt es darüber`, `No, ${ze('s2_alpha', 3)} is below, and no single item lifts it above`),
        P(`Die höchste Zahl der Spalte „Alpha, wenn Item gelöscht“ (${zd('s2_max_ad', 3)}) liegt ebenfalls unter der Grenze. Das Streichen einer Frage löst das Problem also nicht.`, `The highest figure in the column "alpha if item deleted" (${ze('s2_max_ad', 3)}) is below the limit as well. Dropping one item therefore does not solve the problem.`), true),
      a(P(`Ja, denn alle Trennschärfen sind positiv und die Skala ist damit brauchbar`, `Yes, since all item-total correlations are positive and the scale is therefore usable`),
        P('Positive Trennschärfen sind gut, sagen aber nicht, ob Alpha die gesetzte Grenze erreicht. Maßgeblich ist das Alpha selbst.', 'Positive item-total correlations are good but do not say whether alpha reaches the limit that was set. Alpha itself is what counts.')),
      a(P(`Ja, nach dem Löschen der schwächsten Frage übersteigt Alpha die Grenze`, `Yes, after deleting the weakest item alpha exceeds the limit`),
        P(`Nach dem Löschen der schwächsten Frage (O4) steht Alpha bei ${zd('s2_o4_ad', 3)} und bleibt unter der Grenze.`, `After deleting the weakest item (O4) alpha is ${ze('s2_o4_ad', 3)} and stays below the limit.`))
    ],
    hilfe: HILFE, karte: 'skala', belege: ['wissen:reliabilitaet-mindestens-70', 'wissen:reliabilitaetsgrenze-zweckabhaengig', 'Testtheorie Kap. 2 (Konvention)']
  },
  {
    id: 'skala-f2-schwaches-item', thema: 'skala', fall: 'skala-bfi-o',
    stamm: P(`O4 hat die Trennschärfe ${zd('s2_o4_r', 3)}, und ohne O4 stiege Alpha von ${zd('s2_alpha', 3)} auf ${zd('s2_o4_ad', 3)}. Was ist die beste Folgerung?`,
      `O4 has the item-total correlation ${ze('s2_o4_r', 3)}, and without O4 alpha would rise from ${ze('s2_alpha', 3)} to ${ze('s2_o4_ad', 3)}. What is the best conclusion?`),
    antworten: [
      a(P(`O4 ist die schwächste Frage; ob es entfällt, entscheidet der Inhalt und eine neue Stichprobe`, `O4 is the weakest item; whether it goes is decided by content and a new sample`),
        P('Wer an derselben Stichprobe trimmt, überschätzt Alpha. Eine Streichung braucht eine inhaltliche Begründung und besser eine zweite Stichprobe.', 'Whoever trims on the same sample overestimates alpha. A deletion needs a reason in terms of content and, better, a second sample.'), true),
      a(P('O4 wird gestrichen, denn die Auswertung zeigt es so an und Alpha steigt', 'O4 is dropped, since the output shows it so and alpha rises'),
        P('Der Programmvorschlag ist kein Beweis. Er hängt von den übrigen Fragen ab und kann Reliabilität wie Gültigkeit senken.', 'The program’s suggestion is no proof. It depends on the other items and can lower reliability as well as validity.')),
      a(P('O4 bleibt, denn jede Frage mit positiver Trennschärfe verbessert die Skala', 'O4 stays, since every item with a positive item-total correlation improves the scale'),
        P(`Auch eine Frage mit positiver Trennschärfe kann die Skala schwächen. Bei O4 steigt Alpha ohne die Frage, wenn auch nur wenig.`, 'Even an item with a positive item-total correlation can weaken the scale. With O4, alpha rises without the item, though only a little.'))
    ],
    hilfe: HT, karte: 'skala', belege: ['wissen:alpha-inflation-trimmen', 'wissen:alpha-if-deleted-unzuverlaessig', 'Cho 2015; Raykov 2008']
  },
  {
    id: 'skala-f2-ungleich', thema: 'skala', fall: 'skala-bfi-o',
    stamm: P(`Die Trennschärfen der fünf Fragen (Items) reichen von ${zd('s2_o4_r', 3)} bis ${zd('s2_o3_r', 3)}. Was heißt das für die Deutung von Alpha, wenn die Fehler der Fragen voneinander unabhängig sind?`, `The item-total correlations of the five items range from ${ze('s2_o4_r', 3)} to ${ze('s2_o3_r', 3)}. What does that mean for the interpretation of alpha if the errors of the items are unrelated?`),
    antworten: [
      a(P(`Sie können auf verschieden starke Ladungen hinweisen; sind die Ladungen ungleich, liegt Alpha unter der wahren Reliabilität`, `They may point to unequal loadings; if the loadings are unequal, alpha lies below the true reliability`),
        P('Bei unkorrelierten Fehlern ist Alpha genau dann gleich der Reliabilität, wenn die Ladungen gleich sind. Sonst liegt es darunter. Ungleiche Trennschärfen allein beweisen das nicht, denn sie hängen auch von den Fehlervarianzen ab.', 'With uncorrelated errors, alpha equals the reliability exactly when the loadings are equal. Otherwise it lies below. Unequal item-total correlations alone do not prove it, since they also depend on the error variances.'), true),
      a(P('Alpha liegt dann meist über der wahren Reliabilität und überschätzt die Skala', 'Alpha then mostly lies above the true reliability and overestimates the scale'),
        P('Bei ungleichen Ladungen und unkorrelierten Fehlern ist Alpha eine untere Schätzung. Zu hoch fällt es erst bei zusammenhängenden Fehlern aus.', 'With unequal loadings and uncorrelated errors alpha is a lower estimate. It is overestimated rather with correlated errors.')),
      a(P('Alpha lässt sich dann nicht berechnen, weil die Fragen verschieden stark laden', 'Alpha then cannot be calculated, because the items load to different degrees'),
        P('Alpha lässt sich in jedem Fall berechnen; es hat nur eine andere Bedeutung, wenn die Annahme gleicher Ladungen verletzt ist.', 'Alpha can be calculated anyway; it just has a different meaning when the assumption of equal loadings is violated.'))
    ],
    hilfe: [...HILFE, 'omega'], karte: 'skala', belege: ['wissen:alpha-gleich-reliabilitaet-bedingung', 'wissen:omega-tau-kongenerisch', 'Cho 2015; Testtheorie Kap. 15']
  },

  // ---- Fall 3: Skalen verschiedener Länge ----
  {
    id: 'skala-f3-hoeher', thema: 'skala', fall: 'skala-laenge',
    stamm: P(`Die zehn Fragen (Items) A + E erreichen ein Alpha von ${zd('s3_ae_alpha', 3)}, mehr als jede Teilskala. Was zeigt das?`, `The ten items A + E reach an alpha of ${ze('s3_ae_alpha', 3)}, more than either part scale. What does this show?`),
    antworten: [
      a(P('Alpha steigt auch durch mehr Fragen; ein hohes Alpha belegt keine einheitliche Skala', 'Alpha also rises through more items; a high alpha does not prove a single scale'),
        P('Die mittlere Korrelation der Fragen ist in A + E kleiner als in A oder E, und zwei Komponenten haben einen Eigenwert über 1, ein Hinweis auf zwei Merkmale. Trotzdem steigt Alpha.', 'The mean correlation of the items is smaller in A + E than in A or E, and two components have an eigenvalue above 1. Alpha still rises.'), true),
      a(P('Die zehn Fragen messen gemeinsam ein Merkmal besser als jede Hälfte für sich', 'The ten items together measure one attribute better than either half on its own'),
        P('Verträglichkeit und Geselligkeit sind zwei verschiedene Merkmale. Das höhere Alpha kommt von der Länge der Skala.', 'Agreeableness and sociability are two different attributes. The higher alpha comes from the length of the scale.')),
      a(P('Die zusammengelegte Skala ist reliabler und damit auch gültiger', 'The merged scale is more reliable and therefore also more valid'),
        P('Reliabilität sagt nicht, dass das Gemeinte gemessen wird. Von der Gültigkeit ist sie nur eine Vorbedingung.', 'Reliability does not say that what is meant is being measured. For validity it is only a precondition.'))
    ],
    hilfe: HILFE, karte: 'skala', belege: ['wissen:alpha-nicht-eindimensionalitaet', 'wissen:alpha-itemzahl', 'wissen:cortina-alpha-aussage-grenzen', 'Cortina 1993']
  },
  {
    id: 'skala-f3-zwei', thema: 'skala', fall: 'skala-laenge',
    stamm: P('Welche Angabe der Tabelle spricht dafür, dass A + E zwei Merkmale mischt?', 'Which entry of the table speaks for A + E mixing two attributes?'),
    antworten: [
      a(P('Zwei Komponenten haben einen Eigenwert über 1, bei A und bei E je eine', 'Two components have an eigenvalue above 1, whereas A and E have one each'),
        P('Die Komponenten zeigen, wie viele Richtungen in den Fragen stecken. Zwei Richtungen bei zehn Fragen sind ein Hinweis auf zwei Merkmale, kein Beweis.', 'The components show how many directions are in the items. Two directions among ten items fit two attributes.'), true),
      a(P(`Das Alpha von ${zd('s3_ae_alpha', 3)} liegt noch knapp unter dem runden Wert ${zd('regel_alpha2')}`, `The alpha of ${ze('s3_ae_alpha', 3)} still lies just below the round value ${ze('regel_alpha2')}`),
        P('Ob Alpha unter oder über einer runden Zahl liegt, sagt nichts über die Zahl der Merkmale.', 'Whether alpha lies below or above a round number says nothing about the number of attributes.')),
      a(P(`A + E hat doppelt so viele Fragen wie A oder E, also mehr als E allein`, `A + E has twice as many items as A or E, so more than E alone`),
        P('Die Fragezahl erklärt ein höheres Alpha, nicht die Zahl der Merkmale. Eine lange Skala kann ebenso eindimensional sein.', 'The number of items explains a higher alpha, not the number of attributes. A long scale can be one-dimensional too.'))
    ],
    hilfe: HILFE, karte: 'skala', belege: ['wissen:cortina-schmitt-konsistenz-homogenitaet', 'wissen:clark-zwei-cluster-beispiel', 'Cortina 1993; Schmitt 1996']
  },
  {
    id: 'skala-f3-enge', thema: 'skala', fall: 'skala-laenge',
    stamm: P('Bei welcher Skala hängen die Fragen (Items) im Mittel am engsten zusammen?', 'On which scale are the items most closely related on average?'),
    antworten: [
      a(P(`Bei E, denn ihre mittlere Inter-Item-Korrelation ist mit ${zd('s3_e_rb', 3)} die größte`, `On E, since its mean inter-item correlation is the largest at ${ze('s3_e_rb', 3)}`),
        P('Die mittlere Korrelation misst den Zusammenhang der Fragen unabhängig von der Fragezahl. Alpha vermischt beides.', 'The mean correlation measures the relation of the items independently of the number of items. Alpha mixes both.'), true),
      a(P(`Bei A + E, denn ihr Alpha ist mit ${zd('s3_ae_alpha', 3)} das höchste`, `On A + E, since its alpha is the highest at ${ze('s3_ae_alpha', 3)}`),
        P('Alpha wächst mit der Fragezahl. Das höchste Alpha zeigt deshalb nicht den engsten Zusammenhang.', 'Alpha grows with the number of items. The highest alpha therefore does not show the closest relation.')),
      a(P(`Bei A, denn ihr Alpha von ${zd('s3_a_alpha', 3)} ist das niedrigste und damit am strengsten`, `On A, since its alpha of ${ze('s3_a_alpha', 3)} is the lowest and therefore the strictest`),
        P('Ein niedriges Alpha ist kein strenger Maßstab, sondern ein schwächerer Zusammenhang, bei gleicher Fragezahl wie E.', 'A low alpha is not a stricter standard but a weaker relation, with the same number of items as E.'))
    ],
    hilfe: HILFE, karte: 'skala', belege: ['wissen:cortina-itemzahl-rechnung', 'wissen:clark-inter-item-korrelation-bereich', 'Cortina 1993; Clark und Watson 2019']
  },

  // ---- Einzelfragen ----
  {
    id: 'skala-hs-drei', thema: 'skala',
    stamm: P(`Angenommen, ein Alpha ab ${zd('regel_alpha')} gilt als ausreichend. Welche der drei Skalen erfüllt das?`, `Assume an alpha of ${ze('regel_alpha')} or more counts as sufficient. Which of the three scales meets it?`),
    tabelle: tab('skala-hs-drei', [P('Items', 'Items'), P('Zahl der Fragen', 'Number of items'), P('Alpha', 'Alpha')], QUELLE_HS, P('Drei Skalen aus je drei Leistungstests', 'Three scales of three ability tests each')),
    antworten: [
      a(P('Nur x4 - x6', 'Only x4 - x6'), P(`${zd('s4_a2', 3)} liegt darüber, ${zd('s4_a3', 3)} und ${zd('s4_a1', 3)} liegen darunter.`, `${ze('s4_a2', 3)} is above, ${ze('s4_a3', 3)} and ${ze('s4_a1', 3)} are below.`), true),
      a(P('x4 - x6 und x7 - x9', 'x4 - x6 and x7 - x9'), P(`${zd('s4_a3', 3)} liegt knapp unter der gesetzten Grenze. Eine Grenze gilt genau, auch wenn der Wert nah daran liegt.`, `${ze('s4_a3', 3)} is just below the limit that was set. A limit applies exactly, even if the value is close.`)),
      a(P('Keine, weil Alpha mit nur drei Fragen zu klein ausfällt', 'None, because alpha turns out too small with only three items'),
        P('Auch drei Fragen können ein hohes Alpha erreichen, wenn sie eng zusammenhängen; die Tabelle zeigt es bei x4 - x6.', 'Even three items can reach a high alpha if they are closely related; the table shows it for x4 - x6.'))
    ],
    hilfe: HILFE, karte: 'skala', belege: ['wissen:reliabilitaet-mindestens-70', 'Testtheorie Kap. 2 (Konvention, hier als Regel gesetzt)']
  },
  {
    id: 'skala-negativ', thema: 'skala',
    stamm: P(`Fünf Fragen (Items) zur Sorgfalt (C1 bis C5) ergeben Alpha ${zd('s5_alpha0', 3)}. C4 („macht Dinge nur halb“) und C5 („vertrödelt Zeit“) sind gegenläufig formuliert. Was ist die naheliegende Ursache?`,
      `Five items on conscientiousness (C1 to C5) give alpha ${ze('s5_alpha0', 3)}. C4 ("does things in a half-way manner") and C5 ("wastes time") are worded in the opposite direction. What is the likely cause?`),
    antworten: [
      a(P(`C4 und C5 wurden nicht umgepolt; danach liegt Alpha bei ${zd('s5_alpha1', 3)}`, `C4 and C5 were not reversed; afterwards alpha is ${ze('s5_alpha1', 3)}`),
        P('Alpha wird negativ, wenn die mittlere Kovarianz der Fragen negativ ist. Gegenläufige Fragen ohne Umpolen erzeugen das.', 'Alpha turns negative if the mean covariance of the items is negative. Opposite items without reversing produce this.'), true),
      a(P('Die Fragen messen nichts; ein negatives Alpha heißt, dass die Skala zu verwerfen ist', 'The items measure nothing; a negative alpha means the scale is to be discarded'),
        P('Ein negatives Alpha ist ein Warnzeichen, meist für die Richtung der Fragen. Erst nach dem Umpolen lässt sich urteilen.', 'A negative alpha is a warning sign, mostly about the direction of the items. Only after reversing can one judge.')),
      a(P('Ein Rechenfehler des Programms, denn Alpha kann rechnerisch nur zwischen 0 und 1 liegen', 'A calculation error of the program, since alpha can only lie between 0 and 1 mathematically'),
        P('Alpha kann negativ werden. Die Formel verlangt dafür nur eine negative mittlere Kovarianz.', 'Alpha can become negative. The formula only needs a negative mean covariance for that.'))
    ],
    hilfe: HT, karte: 'skala', belege: ['wissen:alpha-negativ-moeglich', 'wissen:umpolen-verfahren', 'Cho 2015; Testtheorie Kap. 7']
  },
  {
    id: 'skala-itemzahl', thema: 'skala',
    stamm: P(`Zwei Skalen haben dasselbe standardisierte Alpha von ${zd('s6_alpha')}, die eine mit 3 Fragen (Items), die andere mit 10. Was unterscheidet sie?`, `Two scales have the same standardized alpha of ${ze('s6_alpha')}, one with 3 items, the other with 10. What distinguishes them?`),
    antworten: [
      a(P(`Bei 3 Fragen liegt die mittlere Inter-Item-Korrelation bei ${zd('s6_rbar_3')}, bei 10 Fragen nur bei ${zd('s6_rbar_10')}`, `With 3 items the mean inter-item correlation is ${ze('s6_rbar_3')}, with 10 items only ${ze('s6_rbar_10')}`),
        P('Alpha steigt mit der Fragezahl auch bei schwach verbundenen Fragen. Gleiches Alpha heißt darum nicht gleich enge Fragen.', 'Alpha rises with the number of items even if they are weakly linked. The same alpha therefore does not mean equally close items.'), true),
      a(P('Kaum etwas, denn gleiches Alpha heißt gleich enge Verbindung der Fragen in beiden Skalen', 'Hardly anything, since the same alpha means an equally close link between the items in both scales'),
        P('Das gilt nur bei gleicher Fragezahl. Bei verschiedener Länge können die Fragen sehr unterschiedlich eng zusammenhängen.', 'That holds only with the same number of items. With different lengths the items can be related very differently.')),
      a(P('Die kürzere Skala ist weniger reliabel, weil sie weniger Fragen hat', 'The shorter scale is less reliable because it has fewer items'),
        P('Beide haben dasselbe Alpha. Die kürzere erreicht es nur, weil ihre Fragen enger zusammenhängen.', 'Both have the same alpha. The shorter one only reaches it because its items are more closely related.'))
    ],
    hilfe: HILFE, karte: 'skala', belege: ['wissen:cortina-itemzahl-rechnung', 'wissen:alpha-itemzahl', 'Cortina 1993']
  },
  {
    id: 'skala-dimension', thema: 'skala',
    stamm: P('Eine Skala erreicht ein hohes Alpha. Was folgt daraus für die Zahl der gemessenen Merkmale?', 'A scale reaches a high alpha. What follows from this for the number of attributes measured?'),
    antworten: [
      a(P(`Nichts Sicheres; ein hohes Alpha kommt auch bei zwei unabhängigen Gruppen von Fragen vor`, `Nothing certain; a high alpha can also occur with two independent groups of items`),
        P('Alpha misst die Verbundenheit der Fragen, nicht die Eindimensionalität. Dafür dient eine Faktorenanalyse.', 'Alpha measures how connected the items are, not unidimensionality. A factor analysis serves that purpose.'), true),
      a(P(`Die Fragen messen ein einziges gemeinsames Merkmal und sind damit eindimensional`, `The items measure a single shared attribute and are therefore unidimensional`),
        P('Das zu folgern ist ein häufiger Fehlschluss. Ein hohes Alpha belegt keine Eindimensionalität.', 'Drawing that conclusion is a common fallacy. A high alpha does not prove unidimensionality.')),
      a(P(`Die Fragen messen zwei getrennte Merkmale, die sich im Alpha überlagern`, `The items measure two separate attributes that overlap in alpha`),
        P('Auch dafür gibt das Alpha keinen Anhalt. Wie viele Merkmale vorliegen, zeigt es nicht.', 'Alpha gives no indication for this either. It does not show how many attributes there are.'))
    ],
    hilfe: [...HILFE, 'faktorenanalyse'], karte: 'skala', belege: ['wissen:alpha-nicht-eindimensionalitaet', 'wissen:clark-zwei-cluster-beispiel', 'Cortina 1993; Schmitt 1996']
  },
  {
    id: 'skala-mechanisch', thema: 'skala',
    stamm: P('Das Programm schlägt vor, die Frage mit dem höchsten Wert in „Alpha, wenn Item gelöscht“ zu entfernen. Was spricht dagegen, dem mechanisch zu folgen?', 'The program suggests removing the item with the highest value in "alpha if item deleted". What speaks against following this mechanically?'),
    antworten: [
      a(P(`Der Wert hängt von den übrigen Fragen ab und kann Reliabilität und Kriteriumsgültigkeit senken`, `The value depends on the other items and can lower reliability and criterion validity`),
        P('Alpha trifft die Reliabilität nur bei erfüllten Voraussetzungen genau. Eine Streichung braucht eine inhaltliche Begründung, nicht nur eine Zahl.', 'Alpha equals the reliability exactly only when the assumptions hold. A deletion needs a reason in terms of content, not only a figure.'), true),
      a(P(`Alpha ändert sich beim Löschen einer Frage kaum, die Spalte sagt daher wenig aus`, `Alpha hardly changes when an item is deleted, so the column says little`),
        P('Alpha ändert sich; genau das zeigt die Spalte. Offen ist nur, ob die Änderung als Grund genügt.', 'Alpha does change; that is exactly what the column shows. What is open is only whether the change is reason enough.')),
      a(P('Die Frage mit dem höchsten Wert in der Spalte ist die beste Frage der gesamten Skala', 'The item with the highest value in the column is the best item of the whole scale'),
        P('Es ist die Frage, ohne die die Skala am besten dasteht, also eher das schwächste.', 'It is the item without which the scale does best, so rather the weakest.'))
    ],
    hilfe: HT, karte: 'skala', belege: ['wissen:alpha-if-deleted-unzuverlaessig', 'wissen:alpha-inflation-trimmen', 'Raykov 2008; Cho 2015']
  },
  {
    id: 'skala-omega', thema: 'skala',
    stamm: P('Die Fragen (Items) einer Skala laden sehr unterschiedlich hoch auf demselben Merkmal. Welches Maß passt dazu besser als Alpha?', 'The items of a scale load very differently on the same attribute. Which measure suits this better than alpha?'),
    antworten: [
      a(P('Omega, denn es erlaubt unterschiedliche Ladungen', 'Omega, since it allows different loadings'),
        P('Omega verlangt Eindimensionalität und unkorrelierte Fehler, aber keine gleichen Ladungen. Alpha ist Omega bei gleichen Ladungen.', 'Omega requires unidimensionality and uncorrelated errors but not equal loadings. Alpha is omega with equal loadings.'), true),
      a(P('Alpha, denn es gilt auch bei ungleichen Ladungen genau', 'Alpha, since it holds exactly even with unequal loadings'),
        P('Bei ungleichen Ladungen liegt Alpha unter der Reliabilität. Genau trifft es nur bei gleichen Ladungen.', 'With unequal loadings alpha lies below the reliability. It is exact only with equal loadings.')),
      a(P('Die Trennschärfe, denn sie schätzt die Reliabilität der ganzen Skala', 'The item-total correlation, since it estimates the reliability of the whole scale'),
        P('Die Trennschärfe beschreibt eine einzelne Frage. Die Reliabilität der Skala schätzen Alpha oder Omega.', 'The item-total correlation describes a single item. Alpha or omega estimate the reliability of the scale.'))
    ],
    hilfe: [...HILFE, 'omega'], karte: 'skala', belege: ['wissen:omega-tau-kongenerisch', 'wissen:alpha-voraussetzungen', 'Cho 2015; Testtheorie Kap. 15']
  },
  {
    id: 'skala-korrigiert', thema: 'skala',
    stamm: P('Was bedeutet „korrigiert“ bei der korrigierten Trennschärfe?', 'What does "corrected" mean in the corrected item-total correlation?'),
    antworten: [
      a(P('Die Frage wird vor dem Korrelieren aus dem Gesamtwert herausgenommen', 'The item is removed from the total score before correlating'),
        P('Sonst steckt die Frage im Gesamtwert und die Korrelation fiele zu hoch aus, besonders bei wenigen Fragen.', 'Otherwise the item is part of the total score and the correlation would be too high, especially with few items.'), true),
      a(P('Die Korrelation wurde rechnerisch um den Messfehler der Fragen bereinigt', 'The correlation was adjusted by calculation for the measurement error of the items'),
        P('Das wäre eine Korrektur für Messfehler. Die korrigierte Trennschärfe ist etwas anderes und einfacher.', 'That would be a correction for measurement error. The corrected item-total correlation is something different and simpler.')),
      a(P('Gegenläufig formulierte Fragen wurden vor der Berechnung umgepolt', 'Items worded in the opposite direction were reversed before the calculation'),
        P('Das Umpolen geschieht vorher und ist Sache der Anwendenden. „Korrigiert“ meint die Herausnahme der Frage aus dem Gesamtwert.', 'Reversing happens beforehand and is up to the user. "Corrected" means taking the item out of the sum.'))
    ],
    hilfe: HT, karte: 'skala', belege: ['wissen:trennschaerfe-part-whole', 'Testtheorie Kap. 7']
  },
  {
    id: 'skala-stichprobe', thema: 'skala',
    stamm: P('Dieselbe Skala hat in einer sehr einheitlichen Gruppe ein niedrigeres Alpha als in der Gesamtbevölkerung. Wie kommt das?', 'The same scale has a lower alpha in a very uniform group than in the general population. How does that come about?'),
    antworten: [
      a(P(`Die Reliabilität hängt von der Streuung ab; in einer homogenen Gruppe fällt sie kleiner aus`, `Reliability depends on the spread; in a homogeneous group it is smaller`),
        P('Reliabilität ist der Anteil wahrer Varianz an der Gesamtvarianz. Bei gleichem Messfehler und kleinerer wahrer Streuung schrumpft dieser Anteil.', 'Reliability is the share of true variance in total variance. With less true spread this share shrinks.'), true),
      a(P(`Die Skala ist fehlerhaft und muss für diese Gruppe neu entwickelt werden`, `The scale is faulty and has to be developed anew for this group`),
        P('Der Unterschied kommt von der Gruppe, nicht vom Fragebogen. Reliabilität wird je Teilgruppe bestimmt.', 'The difference comes from the group, not from the questionnaire. Reliability is determined for each subgroup.')),
      a(P('Alpha hängt nicht von der Stichprobe ab, der Unterschied ist reiner Zufall', 'Alpha does not depend on the sample, the difference is pure chance'),
        P('Alpha stammt aus den Daten einer Stichprobe und ändert sich mit deren Zusammensetzung. Das Muster ist systematisch.', 'Alpha comes from the data of a sample and changes with its composition. The pattern is systematic.'))
    ],
    hilfe: HILFE, karte: 'skala', belege: ['wissen:reliabilitaet-stichprobenabhaengig', 'Testtheorie Kap. 14']
  },
  {
    id: 'skala-kurz', thema: 'skala',
    stamm: P('Was folgt für die Auswertung, wenn eine Skala nur wegen ihrer Kürze ein niedriges Alpha hat?', 'What follows for the analysis if a scale has a low alpha only because it is short?'),
    antworten: [
      a(P(`Die Kürze erklärt das niedrige Alpha, macht die Skala aber nicht zuverlässiger`, `The shortness explains the low alpha but does not make the scale more reliable`),
        P('Die Messung bleibt ungenau, auch wenn der Grund bekannt ist. In der Deutung gehört das als Einschränkung genannt.', 'The measurement stays imprecise even if the reason is known. In the interpretation it should be named as a limitation.'), true),
      a(P('Ein niedriges Alpha bei wenigen Fragen ist unproblematisch, weil die Skala kurz ist', 'A low alpha with few items is unproblematic because the scale is short'),
        P('Eine geringe Reliabilität schwächt Zusammenhänge mit anderen Größen ab, ganz gleich, woher sie kommt.', 'Low reliability weakens relations with other variables, regardless of where it comes from.')),
      a(P('Alpha misst bei kurzen Skalen vor allem die Länge, daher kann es übergangen werden', 'With short scales alpha mainly measures the length, so it can be skipped'),
        P('Alpha hängt von der Länge ab, misst aber auch die Verbundenheit der Fragen. Übergehen lässt es sich nicht.', 'Alpha depends on length but also measures how connected the items are. It cannot be skipped.'))
    ],
    hilfe: HILFE, karte: 'skala', belege: ['wissen:schmitt-kurze-skala-keine-entschuldigung', 'Schmitt 1996']
  },
  {
    id: 'skala-stufen', thema: 'skala',
    stamm: P('Alle Fragen (Items) haben nur vier Antwortstufen. Wie kann das Alpha, aus Pearson-Korrelationen gerechnet, ausfallen?', 'All items have only four answer steps. How can alpha, calculated from Pearson correlations, turn out?'),
    antworten: [
      a(P('Gemessen an der zugrunde liegenden stetigen Ausprägung eher zu niedrig; für den beobachteten Summenwert ist das Pearson-Alpha angemessen', 'Rather too low measured against the underlying continuous trait; for the observed sum score the Pearson alpha is appropriate'),
        P('Grobe Stufung schwächt die Pearson-Korrelationen gegenüber der zugrunde liegenden stetigen Antwortneigung ab; ein ordinales Alpha berücksichtigt das. Für den beobachteten Summenwert selbst bleibt das Pearson-Alpha angemessen.', 'Coarse steps weaken the Pearson correlations compared with the underlying continuous response tendency; an ordinal alpha takes that into account. For the observed sum score itself the Pearson alpha remains appropriate.'), true),
      a(P('Eher zu hoch, denn grobe Stufen lassen die Antworten ähnlicher aussehen', 'Rather too high, since coarse steps make the answers look more alike'),
        P('Die Abweichung geht nach unten, nicht nach oben. Die Zusammenhänge werden durch die Stufung abgeschwächt.', 'The deviation goes down, not up. The relations are weakened by the coarse steps.')),
      a(P('Kaum verändert, denn die Zahl der Stufen spielt für Alpha nur eine kleine Rolle', 'Hardly changed, since the number of steps plays only a small role for alpha'),
        P('Sie spielt eine Rolle, weil die Berechnung fein abgestufte Werte voraussetzt. Es gibt Verfahren, die die grobe Stufung berücksichtigen.', 'It does play a role, since the calculation assumes finely graded scores. Methods exist that take the coarse steps into account.'))
    ],
    hilfe: HILFE, karte: 'skala', belege: ['wissen:mcneish-stetige-items', 'McNeish 2018']
  },
  {
    id: 'skala-gueltig', thema: 'skala',
    stamm: P('Eine Skala kommt auf ein hohes Alpha. Was ist daraus abzulesen?', 'A scale comes to a high alpha. What can be read from this?'),
    antworten: [
      a(P(`Die Fragen hängen zusammen; ob sie das Gemeinte messen, zeigt Alpha nicht`, `The items are related; whether they measure what is intended, alpha does not show`),
        P('Alpha beschreibt die interne Konsistenz und steigt auch mit der Fragenzahl. Für die Deutung braucht es Belege zur Gültigkeit.', 'Alpha describes internal consistency and also rises with the number of items. Interpretation needs evidence on validity.'), true),
      a(P(`Die Skala misst das gemeinte Merkmal gültig und kann so verwendet werden`, `The scale validly measures the intended attribute and can be used as it is`),
        P('Reliabilität ist für die Gültigkeit notwendig, aber nicht hinreichend.', 'Reliability is necessary for validity but not sufficient.')),
      a(P('Die Werte bleiben bei einer Wiederholung nach einigen Wochen stabil', 'The scores stay stable when repeated after a few weeks'),
        P('Die Stabilität über die Zeit ist Sache der Retest-Reliabilität. Alpha sagt dazu nichts.', 'Stability over time is a matter of retest reliability. Alpha says nothing about it.'))
    ],
    hilfe: HILFE, karte: 'skala', belege: ['wissen:cortina-alpha-aussage-grenzen', 'wissen:validitaet-wichtigstes-kriterium', 'Cortina 1993; Testtheorie Kap. 2']
  },
  {
    id: 'skala-aehnlich', thema: 'skala',
    stamm: P('Die Fragen (Items) einer Skala sind fast gleich formuliert, das Alpha liegt nahe bei 1. Was ist zu bedenken?', 'The items of a scale are worded almost identically, and alpha is close to 1. What needs to be considered?'),
    antworten: [
      a(P(`Zu ähnliche Fragen decken nur einen engen Ausschnitt ab, die Gültigkeit kann leiden`, `Items that are too similar cover only a narrow part; validity can suffer`),
        P('Hohe Reliabilität durch fast gleiche Fragen bezahlt man mit Inhalt (in der Fachliteratur Attenuationsparadox genannt).', 'High reliability through almost identical items is paid for with content (called the attenuation paradox in the literature).'), true),
      a(P(`Je höher Alpha, desto gültiger ist die Skala, ein Wert nahe 1 ist ideal`, `The higher alpha, the more valid the scale; a value near 1 is ideal`),
        P('Reliabilität und Gültigkeit gehen nicht Hand in Hand. Ab einem Punkt sinkt die Gültigkeit sogar.', 'Reliability and validity do not go hand in hand. Beyond a point validity even drops.')),
      a(P('Wenig, denn Alpha ist hoch, wenn die Skala das ganze Merkmal erfasst, nicht nur einen Teil', 'Little, since alpha is high when the scale covers the whole attribute, not only a part'),
        P('Alpha misst nicht die Breite des Inhalts. Es steigt auch, wenn dasselbe in anderen Worten gefragt wird.', 'Alpha does not measure the breadth of content. It also rises when the same thing is asked in other words.'))
    ],
    hilfe: HILFE, karte: 'skala', belege: ['wissen:reliabilitaet-attenuationsparadox', 'Testtheorie Kap. 14; Clark und Watson 1995']
  },
  {
    id: 'skala-wege', thema: 'skala',
    stamm: P('Alpha, Retest und Halbierung ergeben für dieselbe Skala drei verschiedene Zahlen. Wie ist das am ehesten zu verstehen?', 'Alpha, retest and split-half give three different numbers for the same scale. How is this best understood?'),
    antworten: [
      a(P(`Die Verfahren setzen Unterschiedliches voraus; nur bei erfüllten Voraussetzungen sollten die Zahlen übereinstimmen`, `The methods assume different things; only when the assumptions hold should the numbers agree`),
        P('Jedes Verfahren schätzt die Reliabilität unter eigenen Annahmen. Abweichungen weisen auf verletzte Annahmen oder auf Zufall hin.', 'Each method estimates the reliability under its own assumptions. Differences point to violated assumptions or to chance.'), true),
      a(P(`Eine der drei Zahlen ist die richtige Reliabilität, die beiden anderen sind Rechenfehler`, `One of the three numbers is the correct reliability, the other two are calculation errors`),
        P('Mehrere Wege schätzen dieselbe Größe unter eigenen Annahmen. Keine der Zahlen ist von vornherein ein Rechenfehler.', 'Several routes estimate the same quantity under their own assumptions. None of the numbers is a calculation error from the start.')),
      a(P(`Zwei der drei Verfahren sind falsch angewendet worden und sollten wiederholt werden`, `Two of the three methods were applied wrongly and should be repeated`),
        P('Abweichende Zahlen kommen oft von verschiedenen Annahmen und von Zufall, nicht zwingend von Fehlern.', 'Differing figures often come from different assumptions and from chance, not necessarily from mistakes.'))
    ],
    hilfe: HILFE, karte: 'skala', belege: ['wissen:reliabilitaet-eine-verschiedene-wege', 'Testtheorie Kap. 14']
  },
  {
    id: 'skala-zweck', thema: 'skala',
    stamm: P('Wovon hängt ab, wie hoch ein Alpha ausfallen sollte?', 'What does it depend on how high an alpha should be?'),
    antworten: [
      a(P('Vom Zweck: Je feiner die Unterscheidung, die getroffen wird, desto höher der Anspruch', 'On the purpose: the finer the distinction to be made, the higher the demand'),
        P('Eine Einheitsgrenze ist nicht angebracht. Für Entscheidungen über Einzelpersonen wird mehr verlangt als für Gruppenvergleiche.', 'A uniform limit is not appropriate. Decisions about individuals demand more than group comparisons.'), true),
      a(P('Von der Zahl der Befragten, denn je mehr Personen, desto höher muss Alpha sein', 'On the number of respondents, since the more people, the higher alpha must be'),
        P('Die Fallzahl macht Alpha genauer geschätzt, nicht höher gefordert.', 'The sample size makes alpha more precisely estimated, not more highly demanded.')),
      a(P('Von keinem Zweck: Es gibt eine feste Grenze, die für alle Skalen gleich gilt', 'On no purpose: there is a fixed limit that applies to all scales alike'),
        P('Die genannten Grenzen sind Gewohnheiten und je nach Zweck verschieden. Eine einzige gibt es nicht.', 'The limits mentioned are habits and differ by purpose. There is no single one.'))
    ],
    hilfe: HILFE, karte: 'skala', belege: ['wissen:reliabilitaetsgrenze-zweckabhaengig', 'wissen:nunnally-70-frueh', 'Testtheorie Kap. 14; Nunnally']
  },
  {
    id: 'skala-voraussetzungen', thema: 'skala',
    stamm: P('Unter welchen Voraussetzungen trifft Alpha die Reliabilität genau?', 'Under which assumptions does alpha equal the reliability exactly?'),
    antworten: [
      a(P('Eindimensionalität, gleiche Ladungen der Fragen und unkorrelierte Fehler', 'Unidimensionality, equal loadings of the items and uncorrelated errors'),
        P('Gleiche Ladungen heißen in der Fachsprache essentielle tau-Äquivalenz. Unterschiedliche Mittelwerte und Varianzen der Fragen sind dabei erlaubt.', 'Equal loadings are called essential tau-equivalence. Different means and variances of the items are allowed.'), true),
      a(P('Normalverteilung der Fragen und gleiche Mittelwerte der Fragen', 'Normal distribution of all items and equal means of all items'),
        P('Gleiche Mittelwerte sind nicht gefordert, und eine Normalverteilung gehört nicht zu den Annahmen des Modells.', 'Equal means are not required, and a normal distribution is not among the assumptions of the model.')),
      a(P('Mindestens fünf Fragen und eine Stichprobe von über hundert Personen', 'At least five items and a sample of over a hundred people'),
        P('Das sind Wünsche an die Studie, keine Voraussetzungen des Modells hinter Alpha.', 'Those are wishes for the study, not assumptions of the model behind alpha.'))
    ],
    hilfe: [...HILFE, 'omega'], karte: 'skala', belege: ['wissen:alpha-voraussetzungen', 'Testtheorie Kap. 14; Cho 2015']
  },

  // ---- Alpha-Formel und Omega-Formel (Stand 01.11.2026, dritte Charge) ----
  {
    id: 'skala-alpha-faktor', thema: 'skala', fall: 'skala-formel', karte: 'skala',
    stamm: P(`Alpha ist ${zn('sf_p')} durch (${zn('sf_p')} minus 1) mal (1 minus Summe der Itemvarianzen durch Varianz der Summe). Wozu dient der Faktor ${zd('sf_faktor', 2)} (Tabelle)?`,
      `Alpha is ${zn('sf_p')} over (${zn('sf_p')} minus 1) times (1 minus sum of item variances over variance of the sum). What is the factor ${ze('sf_faktor', 2)} for (table)?`),
    antworten: [
      a(P('Bei gleichwertigen Items ergibt er den wahren Varianzanteil, keine Korrektur', 'For equivalent items it yields the true share of variance; it is not a correction'),
        P(`Ohne den Faktor stünde ${zd('sf_q', 3)} da, mit ihm ${zd('sf_alpha', 3)}. Er ist nötig, damit bei essentieller tau-Äquivalenz der wahre Varianzanteil herauskommt.`,
          `Without the factor ${ze('sf_q', 3)} would stand there, with it ${ze('sf_alpha', 3)}. It is needed so that under essential tau equivalence the true share of variance results.`), true),
      a(P('Er korrigiert für eine kleine Zahl befragter Personen', 'It corrects for a small number of respondents'),
        P('Der Faktor hängt von der Zahl der Items ab, nicht von der Zahl der Personen; er ist kein Korrekturfaktor für eine kleine Stichprobe.', 'The factor depends on the number of items, not on the number of persons; it is no correction for a small sample.')),
      a(P('Er gleicht aus, dass die Items verschieden stark laden, also verschieden gut messen', 'It compensates for the items loading to different degrees, that is measuring differently well'),
        P(`Bei nicht tau-äquivalenten Items kann Alpha unter 1 liegen, obwohl die Messung fehlerfrei wäre; der Faktor gleicht das nicht aus. Hier ist Alpha ${zd('sf_alpha', 3)}, Omega ${zd('sf_omega', 3)}.`,
          `With items that are not tau-equivalent, alpha can lie below 1 although the measurement is free of error; the factor does not compensate for that. Here alpha is ${ze('sf_alpha', 3)}, omega ${ze('sf_omega', 3)}.`))
    ],
    hilfe: ['cronbach-alpha', 'tau-aequivalent'], belege: ['wissen:alpha-formel-faktor', 'wissen:alpha-eins-trotz-fehlerfrei']
  },
  {
    id: 'skala-omega-formel', thema: 'skala', fall: 'skala-formel', karte: 'skala',
    stamm: P(`Omega aus dem Ein-Faktor-Modell beträgt ${zd('sf_omega', 3)}, Alpha ${zd('sf_alpha', 3)} (Tabelle). Die Summe der Ladungen ist ${zd('sf_sl', 2)}, die der Fehlervarianzen ${zd('sf_sth', 2)}. Wie berechnet sich Omega?`, `Omega from the one-factor model is ${ze('sf_omega', 3)}, alpha ${ze('sf_alpha', 3)} (table). The sum of the loadings is ${ze('sf_sl', 2)}, that of the error variances ${ze('sf_sth', 2)}. How is omega computed?`),
    antworten: [
      a(P('Quadrat der Ladungssumme durch dieses Quadrat plus die Fehlervarianzen', 'Squared loading sum over this square plus the error variances'),
        P(`Hier ist die Summe der Ladungen ${zd('sf_sl', 2)} und die Summe der Fehlervarianzen ${zd('sf_sth', 2)}: das Quadrat von ${zd('sf_sl', 2)}, geteilt durch dieses Quadrat plus ${zd('sf_sth', 2)}, ergibt ${zd('sf_omega', 3)}.`,
          `Here the sum of the loadings is ${ze('sf_sl', 2)} and the sum of the error variances ${ze('sf_sth', 2)}: the square of ${ze('sf_sl', 2)}, divided by this square plus ${ze('sf_sth', 2)}, gives ${ze('sf_omega', 3)}.`), true),
      a(P('Summe der Ladungen, geteilt durch die Zahl der Items im Ein-Faktor-Modell', 'Sum of the loadings, divided by the number of items in the one-factor model'),
        P('Das ist der Mittelwert der Ladungen und keine Reliabilität. Omega vergleicht den erklärten Anteil der Summe mit der gesamten Varianz der Summe.', 'That is the mean of the loadings and no reliability. Omega compares the explained part of the sum with the total variance of the sum.')),
      a(P('Eins minus die Summe der Itemvarianzen durch die Varianz der Summe', 'One minus the sum of the item variances over the variance of the sum'),
        P(`Das ergibt ${zd('sf_q', 3)}, den Teil von Alpha vor dem Faktor. Omega nutzt die Ladungen und Fehlervarianzen des Modells.`, `That gives ${ze('sf_q', 3)}, the part of alpha before the factor. Omega uses the loadings and error variances of the model.`))
    ],
    hilfe: ['omega', 'cronbach-alpha'], belege: ['wissen:hayes-omega-formel']
  },
];
