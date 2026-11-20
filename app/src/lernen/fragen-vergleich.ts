/**
 * Üben: Unterscheiden sich Gruppen, und darf ich diesen Test rechnen? (Messwiederholung, McNemar-Test, Voraussetzungen, Effektstärke, t-Test, Rangtests).
 * Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R). Daten: lme4::sleepstudy, psych::bfi (zwei Aussagen für McNemar),
 * datasets::chickwts, iris, PlantGrowth, sleep; die Studien A und B zur Effektstärke sind ein Rechenbeispiel ohne Daten.
 * Belege: wissen.json (Rasch 2 Kap. 1 und 4, Bortz Kap. 9, Inferenz Kap. 5, Belia u. a. 2005, Nakagawa und Cuthill 2007, Divine u. a. 2018, Lumley u. a. 2002).
 * Zu Sphärizität und Friedman-Test gibt es keine Quelle, darum keine Frage dazu.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, zd, ze, zn } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

const QUELLE_SLEEP = P(
  'Daten: lme4::sleepstudy (Belenky u. a. 2003; Paket lme4, Lizenz GPL), Reaktionszeit (ms) von 18 Fahrern bei Schlafentzug, Tag 0 und Tag 3. Berechnet mit R.',
  'Data: lme4::sleepstudy (Belenky et al. 2003; package lme4, licence GPL), reaction time (ms) of 18 drivers under sleep deprivation, day 0 and day 3. Computed with R.');
const QUELLE_MN = P(
  'Daten: psych::bfi (Revelle, Wilt und Rosenthal 2010, SAPA-Projekt; Items aus dem IPIP, Goldberg 1999, gemeinfrei; Paket psych, Lizenz GPL), 2757 Personen mit Antworten auf zwei Aussagen zur Verträglichkeit: A2 (fragt von sich aus nach dem Befinden anderer) und A5 (sorgt dafür, dass andere sich wohlfühlen). „Trifft zu“ bedeutet Antwort 4 bis 6 von 6. Berechnet mit R.',
  'Data: psych::bfi (Revelle, Wilt and Rosenthal 2010, SAPA project; items from the IPIP, Goldberg 1999, public domain; package psych, licence GPL), 2757 persons with answers to two statements on agreeableness: A2 (asks about the well-being of others on their own) and A5 (makes others feel at ease). "Applies" means an answer of 4 to 6 out of 6. Computed with R.');
const QUELLE_CHICK = P(
  'Daten: datasets::chickwts (Anderson 1948; Teil von R, Lizenz GPL), Gewicht junger Hühner in Gramm nach Futter. Berechnet mit R.',
  'Data: datasets::chickwts (Anderson 1948; part of R, licence GPL), weight of young chickens in grams by feed. Computed with R.');
const QUELLE_IRIS = P(
  'Daten: datasets::iris (Anderson 1935, Fisher 1936; Teil von R, Lizenz GPL), 150 Schwertlilien, je 50 aus drei Arten, Länge des Blütenblatts. Berechnet mit R.',
  'Data: datasets::iris (Anderson 1935, Fisher 1936; part of R, licence GPL), 150 irises, 50 of each of three species, petal length. Computed with R.');
const QUELLE_PG = P(
  'Daten: datasets::PlantGrowth (Dobson 1983; Teil von R, Lizenz GPL), Trockengewicht von Pflanzen, je 10 Pflanzen. Berechnet mit R.',
  'Data: datasets::PlantGrowth (Dobson 1983; part of R, licence GPL), dry weight of plants, 10 plants each. Computed with R.');
const QUELLE_SL = P(
  'Daten: datasets::sleep (Cushny und Peebles 1905, von Student 1908 ausgewertet; Teil von R, Lizenz GPL), Zusatzschlaf bei 10 Personen mit zwei Schlafmitteln. Berechnet mit R.',
  'Data: datasets::sleep (Cushny and Peebles 1905, analysed by Student 1908; part of R, licence GPL), extra sleep in 10 people with two sleeping drugs. Computed with R.');

const QUELLE_HEDGES = P(
  'Daten: datasets::sleep (Cushny und Peebles 1905; Student 1908) und datasets::ToothGrowth (Bliss 1952); Teil von R, Lizenz GPL. d aus der gepoolten Standardabweichung, Faktor 1 minus 3 durch (4 mal (n1 plus n2 minus 2) minus 1); zweiter Weg über die Gamma-Funktion. Berechnet mit R.',
  'Data: datasets::sleep (Cushny and Peebles 1905; Student 1908) and datasets::ToothGrowth (Bliss 1952); part of R, licence GPL. d from the pooled standard deviation, factor 1 minus 3 over (4 times (n1 plus n2 minus 2) minus 1); second way via the gamma function. Computed with R.');

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'mw-sleep': {
    titel: P('Reaktionszeit derselben 18 Personen an Tag 0 und Tag 3', 'Reaction time of the same 18 people on day 0 and day 3'),
    tabellen: [
      tab('mw-sleep.0', [P('Zeitpunkt', 'Time'), P('Personen', 'People'), P('Mittelwert (ms)', 'Mean (ms)'), P('95-Prozent-Intervall von', '95 percent interval from'), P('bis', 'to')], QUELLE_SLEEP, P('Mittelwerte mit Intervall je Zeitpunkt', 'Means with interval by time')),
      tab('mw-sleep.1', [P('Auswertung', 'Analysis'), P('Unterschied Tag 3 minus Tag 0 (ms)', 'Difference day 3 minus day 0 (ms)'), P('Intervall von', 'Interval from'), P('bis', 'to'), P('p', 'p')], QUELLE_SLEEP, P('Der Unterschied, gepaart und ohne Paarung', 'The difference, paired and unpaired'))
    ]
  },
  'mn-pres': {
    titel: P('Zwei Aussagen, beurteilt von denselben Personen', 'Two statements rated by the same people'),
    tabellen: [
      tab('mn-pres.0', [P('Aussage A2', 'Statement A2'), P('Aussage A5 trifft zu', 'Statement A5 applies'), P('Aussage A5 trifft nicht zu', 'Statement A5 does not apply')], QUELLE_MN, P('Vierfeldertafel', 'Fourfold table')),
      tab('mn-pres.1', [P('Größe', 'Quantity'), P('Wert', 'Value')], QUELLE_MN, P('McNemar-Test', 'McNemar test'))
    ]
  },
  'vg-iris': {
    titel: P('Normalverteilung der Blütenblattlänge, insgesamt und je Art', 'Normality of petal length, overall and by species'),
    tabellen: [
      tab('vg-iris.0', [P('Daten', 'Data'), P('Blüten', 'Flowers'), P('Shapiro-Wilk: p', 'Shapiro-Wilk: p')], QUELLE_IRIS, P('Shapiro-Wilk-Test auf Normalverteilung der Blütenblattlänge', 'Shapiro-Wilk test for normality of the petal length'))
    ]
  },
  'ef-mehrfach': {
    titel: P('Zwei Studien mit gleicher Methode (Rechenbeispiel)', 'Two studies with the same method (worked example)'),
    tabellen: [
      tab('ef-mehrfach.0', [P('Studie', 'Study'), P('Personen je Gruppe', 'People per group'), P('Effekt d', 'Effect d'), P('t', 't'), P('p', 'p')], P('Rechenbeispiel ohne Daten: t = d mal Wurzel aus (n geteilt durch 2), zweiseitiger p-Wert mit 2n minus 2 Freiheitsgraden. Berechnet mit R.', 'Worked example without data: t = d times the square root of (n divided by 2), two-sided p value with 2n minus 2 degrees of freedom. Computed with R.'),
        P('Rechenbeispiel: ein großer Versuch mit kleinem Effekt, ein kleiner mit großem Effekt', 'Worked example: a large trial with a small effect, a small one with a large effect'))
    ]
  },
  'tt-sleep': {
    titel: P('Drei t-Tests mit denselben Zahlen (Zusatzschlaf)', 'Three t tests with the same numbers (extra sleep)'),
    tabellen: [
      tab('tt-sleep.0', [P('Test', 'Test'), P('Differenz', 'Difference'), P('Standardfehler', 'Standard error'), P('t', 't'), P('Freiheitsgrade', 'Degrees of freedom'), P('p', 'p')], QUELLE_SL, P('Zusatzschlaf: Mittel 1 minus Mittel 2', 'Extra sleep: drug 1 minus drug 2'))
    ]
  },
  'rt-pg': {
    titel: P('Kontrolle gegen Behandlung 2 mit dem Mann-Whitney-Test', 'Control against treatment 2 with the Mann-Whitney test'),
    tabellen: [
      tab('rt-pg.0', [P('Größe', 'Quantity'), P('Wert', 'Value')], QUELLE_PG, P('Mann-Whitney-Test', 'Mann-Whitney test'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Messwiederholung ----
  {
    id: 'mw-unabh', thema: 'vergleich', fall: 'mw-sleep', karte: 'messwiederholung',
    stamm: P(`Dieselben ${zn('mw_n')} Personen wurden an Tag 0 und an Tag 3 des Schlafentzugs getestet (Tabellen). Was spricht gegen eine Auswertung wie für zwei unabhängige Gruppen?`,
      `The same ${zn('mw_n')} people were tested on day 0 and on day 3 of sleep deprivation (tables). What argues against an analysis as for two independent groups?`),
    antworten: [
      a(P(`Die Werte derselben Person hängen zusammen (r = ${zd('mw_r', 3)}); unabhängige Messwerte fehlen`, `Values of one person are related (r = ${ze('mw_r', 3)}); independence is missing`),
        P('Bei Messwiederholung sind die Werte der Bedingungen nicht mehr unabhängig, sondern korrelieren. Dafür gibt es den t-Test für abhängige Stichproben und die Varianzanalyse mit Messwiederholung.', 'With repeated measures the values of the conditions are no longer independent but correlate. For this there are the t test for dependent samples and analysis of variance with repeated measures.'), true),
      a(P('Zwei Messzeitpunkte sind für den Vergleich zu wenig, es müssten mindestens drei sein', 'Two time points are too few for the comparison, there would have to be at least three'),
        P('Die Zahl der Zeitpunkte ist nicht der Grund. Für zwei Zeitpunkte gibt es den t-Test für abhängige Stichproben; entscheidend ist die Abhängigkeit der Werte.', 'The number of time points is not the reason. For two time points there is the t test for dependent samples; what matters is the dependence of the values.')),
      a(P(`Die Gruppe von ${zn('mw_n')} Personen ist zu klein, um Mittelwerte überhaupt vergleichen zu können`, `A group of ${zn('mw_n')} people is far too small to compare means in any meaningful way`),
        P('Die Größe der Gruppe ist hier nicht der Grund. Der Grund liegt in der Abhängigkeit der Messwerte derselben Personen.', 'The size of the group is not the reason here. The reason lies in the dependence of the measurements of the same people.'))
    ],
    hilfe: ['frage-messwiederholung', 'anova-messwiederholung'], belege: ['wissen:rasch2-messwiederholung-unabhaengigkeit']
  },
  {
    id: 'mw-balken', thema: 'vergleich', fall: 'mw-sleep', karte: 'messwiederholung',
    stamm: P(`Die Intervalle der beiden Mittelwerte überlappen sich (erste Tabelle: ${zd('mw_l0', 2)} bis ${zd('mw_h0', 2)} und ${zd('mw_l3', 2)} bis ${zd('mw_h3', 2)}). Was sagt das über die Veränderung von Tag 0 zu Tag 3?`,
      `The intervals of the two means overlap (first table: ${ze('mw_l0', 2)} to ${ze('mw_h0', 2)} and ${ze('mw_l3', 2)} to ${ze('mw_h3', 2)}). What does that say about the change from day 0 to day 3?`),
    antworten: [
      a(P(`Nichts; maßgeblich ist das Intervall der Paardifferenzen (${zd('mw_dl', 2)} bis ${zd('mw_dh', 2)}) ohne die 0`, `Nothing; the interval of paired differences (${ze('mw_dl', 2)} to ${ze('mw_dh', 2)}) decides and excludes 0`),
        P(`Die Balken der Einzelmittelwerte berücksichtigen die Korrelation der Messungen (r = ${zd('mw_r', 3)}) nicht. Passend ist ein Intervall um den Mittelwert der Differenzen; der gepaarte Test gibt p = ${zd('mw_pg', 3)}.`,
          `The bars of the single means do not take the correlation of the measurements (r = ${ze('mw_r', 3)}) into account. A suitable interval is one around the mean of the differences; the paired test gives p = ${ze('mw_pg', 3)}.`), true),
      a(P('Die Veränderung ist nicht signifikant, weil sich die Intervalle der Mittelwerte überlappen', 'The change is not significant because the intervals of the two means overlap each other'),
        P(`Beide Mittelwerte gehören zu denselben Personen, die Überlappung entscheidet hier nichts. Das Intervall der Paardifferenzen (${zd('mw_dl', 2)} bis ${zd('mw_dh', 2)}) enthält 0 nicht.`,
          `Both means belong to the same people, so the overlap decides nothing here. The interval of the paired differences (${ze('mw_dl', 2)} to ${ze('mw_dh', 2)}) does not contain 0.`)),
      a(P('Die Überlappung entspricht genau einem p von 0,05, die Veränderung liegt an der Grenze', 'The overlap corresponds to exactly a p of 0.05, so the change lies right at the limit'),
        P(`Solche Faustregeln gelten für unabhängige Gruppen, nicht für Messwiederholung. Der Test der Paardifferenzen gibt p = ${zd('mw_pg', 3)}.`, `Such rules of thumb hold for independent groups, not for repeated measures. The test of the paired differences gives p = ${ze('mw_pg', 3)}.`))
    ],
    hilfe: ['frage-messwiederholung', 'anova-messwiederholung'], belege: ['wissen:belia-messwiederholung-balken']
  },
  {
    id: 'mw-mehrfach', thema: 'vergleich', fall: 'mw-sleep', mehrfach: true, karte: 'messwiederholung',
    stamm: P('Welche Aussagen zu den beiden Tabellen stimmen? Mehrere können stimmen.', 'Which statements about the two tables are correct? Several may be correct.'),
    antworten: [
      a(P('Der gepaarte Test arbeitet mit dem Unterschied je Person', 'The paired test works with the difference per person, not with the raw values'),
        P(`Er bildet für jede der ${zn('mw_n')} Personen die Differenz von Tag 3 und Tag 0 und prüft ihren Mittelwert (${zd('mw_d', 2)}).`, `It forms the difference of day 3 and day 0 for each of the ${zn('mw_n')} people and tests their mean (${ze('mw_d', 2)}).`), true),
      a(P('Die Breite des Intervalls der Paardifferenzen hängt stark von der Korrelation der Messungen ab', 'The width of the interval of paired differences depends strongly on the correlation'),
        P(`Je stärker die Messungen korrelieren (hier r = ${zd('mw_r', 3)}), desto weniger streuen die Differenzen. Darum unterscheidet sich das Intervall von dem ohne Paarung (${zd('mw_dl', 2)} bis ${zd('mw_dh', 2)} gegen ${zd('mw_wl', 2)} bis ${zd('mw_wh', 2)}).`,
          `The more strongly the measurements correlate (here r = ${ze('mw_r', 3)}), the less the differences vary. The interval therefore differs from the one without pairing (${ze('mw_dl', 2)} to ${ze('mw_dh', 2)} against ${ze('mw_wl', 2)} to ${ze('mw_wh', 2)}).`), true),
      a(P('Die Fehlerbalken von Tag 0 und Tag 3 zeigen, ob sich die Gruppe signifikant verändert hat', 'The error bars of day 0 and day 3 show whether the group has changed significantly'),
        P('Bei Messwiederholung sagen die Balken der beiden Einzelmittelwerte nichts über die Signifikanz des Unterschieds, weil sie die Korrelation nicht berücksichtigen.', 'With repeated measures the bars of the two single means say nothing about the significance of the difference because they do not take the correlation into account.')),
      a(P('Der gepaarte und der ungepaarte Test geben für diese Daten dasselbe p', 'The paired and the unpaired test give the same p for these data'),
        P(`Das p des gepaarten Tests ist ${zd('mw_pg', 3)}, das des Tests ohne Paarung ${zd('mw_pw', 3)}.`, `The p of the paired test is ${ze('mw_pg', 3)}, that of the test without pairing ${ze('mw_pw', 3)}.`))
    ],
    hilfe: ['frage-messwiederholung', 'anova-messwiederholung'], belege: ['wissen:belia-messwiederholung-balken', 'wissen:effekt-dz-korrelation']
  },
  {
    id: 'mw-power', thema: 'vergleich', fall: 'mw-sleep', karte: 'messwiederholung',
    stamm: P(`Warum fällt p beim gepaarten Test (${zd('mw_pg', 3)}) kleiner aus als beim Test ohne Paarung (${zd('mw_pw', 3)})?`, `Why is p smaller in the paired test (${ze('mw_pg', 3)}) than in the test without pairing (${ze('mw_pw', 3)})?`),
    antworten: [
      a(P('Die Messungen korrelieren positiv und die Differenzen streuen weniger: mehr Power', 'The measurements correlate positively and the differences vary less: more power'),
        P(`Bei gleichem n und positiver Korrelation hat der gepaarte Test mehr Power. Hier ist r = ${zd('mw_r', 3)}.`, `With the same n and a positive correlation the paired test has more power. Here r = ${ze('mw_r', 3)}.`), true),
      a(P('Der gepaarte Test hat mehr Freiheitsgrade als der Test ohne Paarung und prüft deshalb schärfer', 'The paired test has more degrees of freedom than the unpaired test and therefore tests more sharply'),
        P(`Er hat weniger: ${zn('mw_dfg')} gegen ${zd('mw_dfw', 2)} beim Welch-Test. Der Gewinn kommt aus der Korrelation, nicht aus den Freiheitsgraden.`, `It has fewer: ${zn('mw_dfg')} against ${ze('mw_dfw', 2)} in the Welch test. The gain comes from the correlation, not from the degrees of freedom.`)),
      a(P('Beim gepaarten Test gehen mehr Messungen in die Rechnung ein, weil jede Person doppelt zählt', 'More measurements enter the calculation in the paired test because each person counts twice'),
        P(`Beide verwenden dieselben 2 mal ${zn('mw_n')} Messungen. Der Test unterscheidet sich darin, wie er die Zusammengehörigkeit der Werte nutzt.`, `Both use the same 2 times ${zn('mw_n')} measurements. The tests differ in how they use the fact that the values belong together.`))
    ],
    hilfe: ['frage-messwiederholung', 'cohens-d'], belege: ['wissen:effekt-dz-korrelation', 'wissen:belia-messwiederholung-balken']
  },

  // ---- Veränderung bei Ja/Nein: McNemar ----
  {
    id: 'mn-wer', thema: 'vergleich', fall: 'mn-pres',
    stamm: P(`Dieselben ${zn('mn_n')} Personen beurteilten zwei Aussagen, jeweils als zutreffend (Antwort 4 bis 6 von 6) oder unzutreffend (Tabellen). Welche Personen gehen in die McNemar-Statistik ein?`, `The same ${zn('mn_n')} people rated two statements, each as applicable (answer 4 to 6 of 6) or inapplicable (tables). Which people enter the McNemar statistic?`),
    antworten: [
      a(P(`Nur die ${zn('mn_wechsler')} mit verschiedenen Antworten (${zn('mn_b')} und ${zn('mn_c')})`, `Only the ${zn('mn_wechsler')} with different answers (${zn('mn_b')} and ${zn('mn_c')})`),
        P(`Das McNemar-Chi-Quadrat berücksichtigt nur die Fälle mit verschiedener Antwort: (${zn('mn_b')} minus ${zn('mn_c')}) zum Quadrat geteilt durch (${zn('mn_b')} plus ${zn('mn_c')}) gleich ${zd('mn_chi', 2)}.`,
          `The McNemar chi-square considers only the cases with different answers: (${zn('mn_b')} minus ${zn('mn_c')}) squared divided by (${zn('mn_b')} plus ${zn('mn_c')}) equals ${ze('mn_chi', 2)}.`), true),
      a(P(`Alle ${zn('mn_n')} Personen der Vierfeldertafel, denn jede hat beide Aussagen beurteilt`, `All ${zn('mn_n')} people of the fourfold table, since each rated both statements`),
        P(`Die Personen auf der Diagonale (${zn('mn_a')} und ${zn('mn_d')}) haben beide Aussagen gleich beantwortet und gehen nicht ein.`, `The people on the diagonal (${zn('mn_a')} and ${zn('mn_d')}) answered both statements alike and do not enter.`)),
      a(P(`Nur die ${zn('mn_a')} Personen, bei denen beide Aussagen zutreffen`, `Only the ${zn('mn_a')} people for whom both statements apply`),
        P(`Wer beide Aussagen gleich beantwortet, geht nicht ein. Es zählen die Personen mit verschiedener Antwort, ${zn('mn_b')} und ${zn('mn_c')}.`, `Whoever answers both statements alike does not enter. The people with different answers count, ${zn('mn_b')} and ${zn('mn_c')}.`))
    ],
    hilfe: ['mcnemar-test-cochran-q'], belege: ['wissen:kreuz-mcnemar-wechsler', 'wissen:bortz-mcnemar']
  },
  {
    id: 'mn-null', thema: 'vergleich', fall: 'mn-pres',
    stamm: P('Welche Nullhypothese prüft der McNemar-Test in diesem Beispiel? „Trifft zu“ heißt Antwort 4 bis 6 von 6.', 'Which null hypothesis does the McNemar test examine in this example? "Applies" means an answer of 4 to 6 out of 6.'),
    antworten: [
      a(P(`Dass die ${zn('mn_wechsler')} mit anderer Antwort je zur Hälfte in jede Richtung fallen (${zn('mn_halb')} und ${zn('mn_halb')})`, `That the ${zn('mn_wechsler')} with a different answer fall half in each direction (${zn('mn_halb')} and ${zn('mn_halb')})`),
        P(`Bei ${zn('mn_wechsler')} Personen mit verschiedener Antwort wären das je ${zn('mn_halb')}. Beobachtet sind ${zn('mn_b')} und ${zn('mn_c')}; der Test fragt, ob dieser Unterschied zufällig sein kann.`, `With ${zn('mn_wechsler')} people with different answers that would be ${zn('mn_halb')} each. ${zn('mn_b')} and ${zn('mn_c')} are observed; the test asks whether this difference can be due to chance.`), true),
      a(P('Dass beide Aussagen bei genau der Hälfte aller befragten Personen zutreffen', 'That both statements apply to exactly half of all the people asked'),
        P('Die Nullhypothese betrifft nur die Personen mit verschiedener Antwort: gleich viele in beide Richtungen. Die Gesamtanteile des Zutreffens spielen dafür keine Rolle.', 'The null hypothesis concerns only the people with different answers: equally many in both directions. The overall shares of agreement play no role.')),
      a(P('Dass die Antworten auf die zweite Aussage unabhängig von denen auf die erste Aussage sind', 'That the answers to the second statement are independent of those to the first statement'),
        P('Das wäre die Hypothese des Chi-Quadrat-Tests auf Unabhängigkeit. Sie passt nicht für dieselben Personen, die sich auf vier Felder verteilen.', 'That would be the hypothesis of the chi-square test of independence. It does not suit the same people who are spread over four cells.'))
    ],
    hilfe: ['mcnemar-test-cochran-q'], belege: ['wissen:bortz-mcnemar', 'wissen:kreuz-mcnemar-wechsler']
  },
  {
    id: 'mn-mehrfach', thema: 'vergleich', fall: 'mn-pres', mehrfach: true,
    stamm: P('Welche Aussagen zum McNemar-Test und zu den Tabellen stimmen? „Trifft zu“ heißt Antwort 4 bis 6 von 6. Mehrere können stimmen.', 'Which statements about the McNemar test and the tables are correct? "Applies" means an answer of 4 to 6 out of 6. Several may be correct.'),
    antworten: [
      a(P(`Das Chi-Quadrat ${zd('mn_chi', 2)} folgt aus b = ${zn('mn_b')} und c = ${zn('mn_c')} nach (b minus c) zum Quadrat durch (b plus c)`, `The chi-square ${ze('mn_chi', 2)} follows from b = ${zn('mn_b')} and c = ${zn('mn_c')} by (b minus c) squared over (b plus c)`),
        P(`(${zn('mn_b')} minus ${zn('mn_c')}) zum Quadrat ist ${zn('mn_diffq')}, geteilt durch ${zn('mn_wechsler')} ergibt ${zd('mn_chi', 2)}.`, `(${zn('mn_b')} minus ${zn('mn_c')}) squared is ${zn('mn_diffq')}, divided by ${zn('mn_wechsler')} it gives ${ze('mn_chi', 2)}.`), true),
      a(P('Jede Person muss sich anhand beider Antworten eindeutig einem der vier Felder zuordnen lassen', 'Every person must be assignable unambiguously to one of the four cells on the basis of both answers'),
        P('Das ist die Voraussetzung des Tests: Jedes Individuum gehört wegen der zweimaligen Untersuchung in genau ein Feld der Vierfeldertafel.', 'That is the requirement of the test: because of the two examinations every individual belongs to exactly one cell of the fourfold table.'), true),
      a(P('Mehr Personen, die beide Aussagen gleich beantworten, erhöhen das McNemar-Chi-Quadrat', 'More people who answer both statements alike raise the McNemar chi-square'),
        P(`Diese Personen (${zn('mn_a')} und ${zn('mn_d')}) gehen nicht in die Statistik ein; sie verändern das Chi-Quadrat nicht.`, `These people (${zn('mn_a')} and ${zn('mn_d')}) do not enter the statistic; they do not change the chi-square.`)),
      a(P('Der Test setzt zwei voneinander unabhängige Stichproben voraus', 'The test presupposes two samples independent of each other'),
        P('Es sind dieselben Personen, die beide Aussagen beurteilen. Der Test ist für solche abhängigen Messungen gebaut.', 'It is the same people who rate both statements. The test is built for such dependent measurements.'))
    ],
    hilfe: ['mcnemar-test-cochran-q'], belege: ['wissen:bortz-mcnemar', 'wissen:kreuz-mcnemar-wechsler']
  },

  // ---- Voraussetzungen ----
  {
    id: 'vg-levene', thema: 'vergleich',
    tabelle: tab('vg-levene', [P('Größe', 'Quantity'), P('Wert', 'Value')], QUELLE_CHICK, P('Casein gegen Horsebean: Streuung und Levene-Test (am Median)', 'Casein against horsebean: spread and Levene test (centred at the median)')),
    stamm: P(`Die Standardabweichungen betragen ${zd('vl_sd1', 2)} g und ${zd('vl_sd2', 2)} g, der Levene-Test (Abstände zum Median) gibt p = ${zd('vl_p', 3)} (Tabelle). Was folgt für die Annahme gleicher Varianzen?`,
      `The standard deviations are ${ze('vl_sd1', 2)} g and ${ze('vl_sd2', 2)} g, the Levene test (distances to the median) gives p = ${ze('vl_p', 3)} (table). What follows for the assumption of equal variances?`),
    antworten: [
      a(P('Es ist kein Beleg für gleiche Varianzen, besonders bei so kleinen Gruppen', 'It is no evidence for equal variances, especially with groups this small'),
        P(`Ein signifikanter Levene-Test zeigt einen Unterschied; ein nicht signifikanter belegt keine Gleichheit. Hier sind es ${zn('vl_n1')} und ${zn('vl_n2')} Tiere, und die Standardabweichungen unterscheiden sich um den Faktor ${zd('vl_rel', 2)}.`,
          `A significant Levene test shows a difference; a non-significant one does not demonstrate equality. Here there are ${zn('vl_n1')} and ${zn('vl_n2')} animals, and the standard deviations differ by a factor of ${ze('vl_rel', 2)}.`), true),
      a(P('Die Varianzen sind gleich, denn der Levene-Test ist nicht signifikant (p über 0,05)', 'The variances are equal, because the Levene test is not significant (p above 0.05)'),
        P('Ein nicht signifikanter Test heißt nicht, dass Varianzhomogenität vorliegt, besonders nicht bei kleinem n.', 'A non-significant test does not mean that homogeneity of variance holds, especially not with small n.')),
      a(P('Die Varianzen sind verschieden, denn die Standardabweichungen weichen deutlich ab', 'The variances differ, because the standard deviations deviate clearly'),
        P(`Auch das folgt aus den Zahlen nicht: Bei p = ${zd('vl_p', 3)} fehlt der Beleg für einen Unterschied. Die Frage bleibt offen.`, `That does not follow from the numbers either: at p = ${ze('vl_p', 3)} evidence of a difference is lacking. The question stays open.`))
    ],
    hilfe: ['voraussetzungen-pruefen', 'shapiro-wilk'], belege: ['wissen:levene-nicht-signifikant']
  },
  {
    id: 'vg-gruppe', thema: 'vergleich', fall: 'vg-iris',
    stamm: P(`Die Blütenblattlängen aller 150 Blüten zusammen weichen nach dem Shapiro-Wilk-Test deutlich von der Normalverteilung ab (p unter ${zd('vi_p0', 3)}), innerhalb der Arten kaum (Tabelle). Worauf bezieht sich die Normalverteilungsannahme einer Varianzanalyse nach Arten?`,
      `The petal lengths of all 150 flowers together deviate clearly from the normal distribution by the Shapiro-Wilk test (p below ${ze('vi_p0', 3)}), within the species hardly (table). What does the normality assumption of an analysis of variance by species refer to?`),
    antworten: [
      a(P('Auf die Werte je Gruppe beziehungsweise die Fehler, nicht auf die Gesamtverteilung', 'To the values per group or the errors, not to the overall distribution'),
        P(`Die Annahme gilt der Normalverteilung der Fehler beziehungsweise der Werte in jeder Gruppe. Die Gesamtverteilung mischt drei Arten; in den Gruppen sind die p-Werte ${zd('vi_s0', 3)}, ${zd('vi_s1', 3)} und ${zd('vi_s2', 3)}.`,
          `The assumption concerns the normal distribution of the errors or of the values in each group. The overall distribution mixes three species; within the groups the p values are ${ze('vi_s0', 3)}, ${ze('vi_s1', 3)} and ${ze('vi_s2', 3)}.`), true),
      a(P('Auf die Gesamtverteilung aller 150 Blüten, die hier allerdings deutlich verletzt ist', 'To the overall distribution of all 150 flowers, which is, however, clearly violated here'),
        P('Die Gesamtverteilung über alle Gruppen ist nicht gemeint. Sie kann auch dann stark von einer Normalverteilung abweichen, wenn jede Gruppe gut passt.', 'The overall distribution across all groups is not meant. It can deviate strongly from a normal distribution even when each group fits well.')),
      a(P('Auf die Streuung innerhalb der Arten, die in allen Arten gleich groß sein muss', 'To the spread within the species, which has to be equal in all species'),
        P('Gleiche Streuung ist eine andere Voraussetzung (gleiche Varianzen). Die Normalverteilung betrifft die Form der Verteilung der Werte.', 'Equal spread is another assumption (equal variances). Normality concerns the shape of the distribution of the values.'))
    ],
    hilfe: ['shapiro-wilk', 'voraussetzungen-pruefen'], belege: ['wissen:anova-voraussetzungen-normalitaet']
  },
  {
    id: 'vg-mehrfach', thema: 'vergleich', fall: 'vg-iris', mehrfach: true,
    stamm: P('Welche Aussagen zu den Voraussetzungen von t-Test und Varianzanalyse stimmen? Mehrere können stimmen.', 'Which statements about the assumptions of the t test and analysis of variance are correct? Several may be correct.'),
    antworten: [
      a(P('Wenn die Stichprobe groß genug ist, braucht man wegen des Zentralen Grenzwertsatzes keine Normalverteilung', 'If the sample is large enough, normality is not needed because of the central limit theorem'),
        P('Mittelwertdifferenz und Regressionskoeffizienten sind dann näherungsweise normalverteilt; die Normalverteilung ist hinreichend, aber nicht notwendig. Das gilt bei genügend großen Stichproben; in kleinen brauchen die meisten Verfahren Verteilungsannahmen.', 'Mean difference and regression coefficients are then approximately normally distributed; normality is sufficient but not necessary. This holds for sufficiently large samples; in small ones most procedures need distributional assumptions.'), true),
      a(P('Der Welch-Test kommt ohne die Annahme gleicher Populationsvarianzen aus', 'The Welch test manages without the assumption of equal population variances'),
        P('Die Form des t-Tests ohne gleiche Varianzen (Welch) berechnet den Standardfehler ohne Pooling.', 'The form of the t test without equal variances (Welch) computes the standard error without pooling.'), true),
      a(P('Ein nicht signifikanter Levene-Test beweist gleiche Varianzen', 'A non-significant Levene test proves equal variances'),
        P('Ein nicht signifikanter Test ist kein Beleg für gleiche Varianzen, besonders bei kleinem n.', 'A non-significant test is no evidence for equal variances, especially with small n.')),
      a(P('Die Gesamtverteilung über alle Gruppen sollte normal sein', 'The overall distribution across all groups should be normal'),
        P('Verlangt ist die Normalverteilung der Fehler beziehungsweise der Werte in jeder Gruppe, nicht der Gesamtverteilung.', 'What is required is the normal distribution of the errors or of the values in each group, not of the overall distribution.'))
    ],
    hilfe: ['voraussetzungen-pruefen', 'shapiro-wilk'], belege: ['wissen:t-voraussetzungen', 'wissen:lumley-t-regression-grosse-stichproben', 'wissen:levene-nicht-signifikant', 'wissen:anova-voraussetzungen-normalitaet']
  },

  // ---- Effektstärke ----
  {
    id: 'ef-einheit', thema: 'vergleich',
    tabelle: tab('ef-einheit', [P('Einheit', 'Unit'), P('Mittelwertdifferenz', 'Mean difference'), P('gepoolte Standardabweichung', 'Pooled standard deviation'), P('Cohens d', 'Cohen\'s d')], QUELLE_CHICK, P('Casein gegen Horsebean in zwei Einheiten', 'Casein against horsebean in two units')),
    stamm: P('Der Gewichtsunterschied zwischen zwei Futtergruppen wird in Gramm und in Kilogramm angegeben (Tabelle). Was gilt für Cohens d?', 'The weight difference between two feed groups is given in grams and in kilograms (table). What holds for Cohen\'s d?'),
    antworten: [
      a(P(`d ist einheitenunabhängig: ${zd('ee_d', 2)} bleibt, nur Differenz und Streuung ändern sich`, `d is independent of units: ${ze('ee_d', 2)} stays, only difference and spread change`),
        P('d ist die Mittelwertdifferenz geteilt durch die gepoolte Streuung; die Einheit kürzt sich weg. d ist kein Prozentmaß.', 'd is the mean difference divided by the pooled spread; the unit cancels out. d is not a percentage.'), true),
      a(P(`d = ${zd('ee_d', 2)} bedeutet, dass die Casein-Küken rund 301 Prozent mehr wiegen`, `d = ${ze('ee_d', 2)} means that the casein chicks weigh about 301 percent more`),
        P('d ist kein Prozentmaß, sondern ein Unterschied in Einheiten der Standardabweichung, hier rund drei.', 'd is not a percentage but a difference in units of the standard deviation, here about three.')),
      a(P(`In Kilogramm fällt d kleiner aus, weil auch die Differenz kleiner ist (${zd('ee_dk', 4)} gegen ${zd('ee_dg', 2)})`, `In kilograms d is smaller because the difference is smaller too (${ze('ee_dk', 4)} against ${ze('ee_dg', 2)})`),
        P(`Die gepoolte Streuung wird ebenfalls durch 1000 geteilt (${zd('ee_spk', 4)} gegen ${zd('ee_sp', 2)}), darum bleibt d gleich.`, `The pooled spread is also divided by 1000 (${ze('ee_spk', 4)} against ${ze('ee_sp', 2)}), so d stays the same.`))
    ],
    hilfe: ['cohens-d', 'cohen-konventionen'], belege: ['wissen:effekt-d-definition']
  },
  {
    id: 'ef-eta0', thema: 'vergleich',
    tabelle: tab('ef-eta0', [P('Größe', 'Quantity'), P('Wert', 'Value')], QUELLE_PG, P('eta-Quadrat bei echten und bei zufällig vermischten Gruppen (Simulation mit festem Startwert)', 'Eta squared for real and for randomly shuffled groups (simulation with a fixed seed)')),
    stamm: P(`Die Gruppenzugehörigkeit der Pflanzen wird 20000-mal zufällig vermischt, sodass die Gruppenzugehörigkeit nichts mit dem Gewicht zu tun hat. Warum liegt das mittlere eta-Quadrat dennoch bei ${zd('e0_sim', 3)} (Tabelle)?`,
      `The group membership of the plants is shuffled at random 20000 times so that group membership has nothing to do with the weight. Why is the mean eta squared still ${ze('e0_sim', 3)} (table)?`),
    antworten: [
      a(P('Stichproben-eta-Quadrat überschätzt den Effekt und ist auch ohne Zusammenhang positiv', 'Sample eta squared overestimates the effect and is positive even without a relationship'),
        P(`Ohne Zusammenhang beträgt die Verzerrung etwa (J minus 1) geteilt durch (N minus 1); hier (3 minus 1) geteilt durch (30 minus 1) gleich ${zd('e0_theo', 3)}, so groß wie die Simulation. Omega-Quadrat ist weniger verzerrt.`,
          `Without a relationship the bias is about (J minus 1) divided by (N minus 1); here (3 minus 1) divided by (30 minus 1) equals ${ze('e0_theo', 3)}, as large as the simulation. Omega squared is less biased.`), true),
      a(P(`Beim Vermischen bleiben Reste des echten Effekts (${zd('e0_real', 3)}) in den vermischten Gruppen erhalten`, `When shuffling, remnants of the real effect (${ze('e0_real', 3)}) remain in the shuffled groups`),
        P(`Beim Vermischen geht jeder Zusammenhang verloren. Der Wert ${zd('e0_sim', 3)} entsteht allein aus Zufallsunterschieden der Gruppenmittel und der Bauart von eta-Quadrat.`, `Shuffling destroys every relationship. The value ${ze('e0_sim', 3)} arises only from chance differences of the group means and the construction of eta squared.`)),
      a(P('Die Simulation ist fehlerhaft, denn ohne Zusammenhang müsste eta-Quadrat null sein', 'The simulation is faulty, since without a relationship eta squared would have to be zero'),
        P(`Ein Stichproben-eta-Quadrat ist wegen der Quadrierung nicht negativ und fällt bei zufälligen Unterschieden der Gruppenmittel positiv aus; die Formel sagt ${zd('e0_theo', 3)} voraus.`, `A sample eta squared is not negative because of the squaring and comes out positive with chance differences of the group means; the formula predicts ${ze('e0_theo', 3)}.`))
    ],
    hilfe: ['eta-quadrat', 'cohens-d'], belege: ['wissen:effekt-eta-ueberschaetzt-omega']
  },
  {
    id: 'ef-studien', thema: 'vergleich', fall: 'ef-mehrfach', mehrfach: true,
    stamm: P(`Angenommen, ein p unter 0,05 gilt als signifikant, d = ${zd('es_dk', 1)} gilt als klein und d = ${zd('es_dg', 1)} als groß (Richtwerte zur Orientierung). Welche Aussagen zu den zwei Studien stimmen? Mehrere können stimmen.`,
      `Suppose a p below 0.05 counts as significant, d = ${ze('es_dk', 1)} counts as small and d = ${ze('es_dg', 1)} as large (guide values for orientation). Which statements about the two studies are correct? Several may be correct.`),
    antworten: [
      a(P(`Studie A ist signifikant (p = ${zd('es_pa', 3)}), obwohl ihr Effekt mit d = ${zd('es_da', 2)} klein ist`, `Study A is significant (p = ${ze('es_pa', 3)}) although its effect is small at d = ${ze('es_da', 2)}`),
        P(`Bei genügend großer Stichprobe wird auch ein kleiner Unterschied signifikant: ${zn('es_na')} Personen je Gruppe.`, `With a large enough sample even a small difference becomes significant: ${zn('es_na')} people per group.`), true),
      a(P(`Studie B hat den größeren Effekt (d = ${zd('es_db', 2)}), bleibt aber mit p = ${zd('es_pb', 3)} über 0,05`, `Study B has the larger effect (d = ${ze('es_db', 2)}) but stays above 0.05 at p = ${ze('es_pb', 3)}`),
        P(`Große Effekte können bei kleiner Stichprobe unauffällige p-Werte liefern: ${zn('es_nb')} Personen je Gruppe.`, `Large effects can give unremarkable p values in a small sample: ${zn('es_nb')} people per group.`), true),
      a(P('Der kleinere p-Wert von Studie A zeigt den größeren Effekt', 'The smaller p value of study A shows the larger effect'),
        P(`Ein kleinerer p-Wert bedeutet nicht einen größeren Effekt: Studie A hat d = ${zd('es_da', 2)}, Studie B d = ${zd('es_db', 2)}.`, `A smaller p value does not mean a larger effect: study A has d = ${ze('es_da', 2)}, study B d = ${ze('es_db', 2)}.`)),
      a(P('Ein nach diesen Richtwerten kleiner Effekt ist praktisch bedeutungslos', 'An effect that is small by these guide values is practically meaningless'),
        P('Die Richtwerte sind eine Orientierung, kein Maßstab für Bedeutung. Was als bedeutsam gilt, hängt vom Gegenstand ab.', 'The guide values are an orientation, not a yardstick of importance. What counts as important depends on the subject.'))
    ],
    hilfe: ['cohens-d', 'cohen-konventionen'], belege: ['wissen:grosse-stichprobe-kleiner-unterschied', 'wissen:wasserstein16-p-praezision-effekt', 'wissen:effekt-cohen-richtwerte']
  },

  // ---- t-Test ----
  {
    id: 'tt-welch', thema: 'vergleich', fall: 'tt-sleep',
    stamm: P(`Warum hat der Welch-Test in der Tabelle ${zd('ts_df', 2)} Freiheitsgrade, der gepoolte Test aber ${zn('ts_dfg')}?`, `Why does the Welch test in the table have ${ze('ts_df', 2)} degrees of freedom, but the pooled test ${zn('ts_dfg')}?`),
    antworten: [
      a(P('Welch korrigiert die Freiheitsgrade nach den Varianzen, daher meist keine ganze Zahl', 'Welch corrects the degrees of freedom for the variances, so usually no whole number'),
        P(`Der Welch-Test berechnet den Standardfehler ohne Pooling und korrigiert die Freiheitsgrade. Beim gepoolten Test sind es n1 plus n2 minus 2, hier ${zn('ts_n')} + ${zn('ts_n')} - 2 = ${zn('ts_dfg')}.`,
          `The Welch test computes the standard error without pooling and corrects the degrees of freedom. For the pooled test it is n1 plus n2 minus 2, here ${zn('ts_n')} + ${zn('ts_n')} - 2 = ${zn('ts_dfg')}.`), true),
      a(P('Die Software rundet die Freiheitsgrade des Welch-Tests ab, damit sie zu den Daten passen', 'The software rounds the degrees of freedom of the Welch test down to fit the data well'),
        P('Es wird nicht gerundet: Die korrigierten Freiheitsgrade ergeben sich aus den Varianzen und sind in der Regel nicht ganzzahlig.', 'No rounding takes place: the corrected degrees of freedom follow from the variances and are usually not integers.')),
      a(P('Der Welch-Test lässt zwei Beobachtungen weg, weil er auffällige Ausreißer ausschließt', 'The Welch test leaves out two observations because it excludes conspicuous outliers'),
        P('Der Welch-Test schließt keine Beobachtungen aus; alle 20 Werte gehen ein. Der Unterschied liegt in der Korrektur.', 'The Welch test excludes no observations; all 20 values enter. The difference lies in the correction.'))
    ],
    hilfe: ['gepoolter-t-test', 'welch-anova'], belege: ['wissen:welch-prinzip', 'wissen:t-test-freiheitsgrade']
  },
  {
    id: 'tt-statistik', thema: 'vergleich', fall: 'tt-sleep',
    stamm: P(`Die erste Zeile der Tabelle zeigt die Differenz ${zd('ts_d', 2)}, den Standardfehler ${zd('ts_se', 3)} und t = ${zd('ts_t', 2)}. Wie entsteht t?`, `The first row of the table shows the difference ${ze('ts_d', 2)}, the standard error ${ze('ts_se', 3)} and t = ${ze('ts_t', 2)}. How does t arise?`),
    antworten: [
      a(P('Die Differenz wird durch ihren geschätzten Standardfehler geteilt: rund -1,86', 'The difference is divided by its estimated standard error: about -1.86'),
        P(`Die t-Prüfgröße ist Schätzer minus Testwert durch den geschätzten Standardfehler: ${zd('ts_d', 2)} geteilt durch ${zd('ts_se', 3)} ergibt rund ${zd('ts_t', 2)}.`, `The t statistic is estimate minus test value divided by the estimated standard error: ${ze('ts_d', 2)} divided by ${ze('ts_se', 3)} gives about ${ze('ts_t', 2)}.`), true),
      a(P('Die Differenz wird durch die Standardabweichung der Einzelwerte geteilt, das ergibt t', 'The difference is divided by the standard deviation of the single values, which gives t'),
        P('Das wäre ein Effektmaß wie Cohens d. Für t wird durch den Standardfehler der Differenz geteilt, der mit der Wurzel aus n schrumpft.', 'That would be an effect size like Cohen\'s d. For t the difference is divided by the standard error of the difference, which shrinks with the square root of n.')),
      a(P('Die Differenz wird mit der Wurzel aus der Gruppengröße multipliziert, ohne Teilung', 'The difference is multiplied by the square root of the group size, without division'),
        P('Ohne Teilung durch eine Streuung fehlt der Bezug zur Unsicherheit der Differenz. t ist ein Quotient aus Differenz und Standardfehler.', 'Without division by a spread, the link to the uncertainty of the difference is missing. t is a quotient of difference and standard error.'))
    ],
    hilfe: ['gepoolter-t-test', 'welch-anova'], belege: ['wissen:t-test-drei-varianten']
  },
  {
    id: 'tt-df', thema: 'vergleich', fall: 'tt-sleep',
    stamm: P(`Der gepaarte Test der Tabelle beruht auf ${zn('ts_n')} Paaren, also 20 Messungen, hat aber nur ${zn('ts_dfp')} Freiheitsgrade. Warum?`, `The paired test of the table is based on ${zn('ts_n')} pairs, that is 20 measurements, but has only ${zn('ts_dfp')} degrees of freedom. Why?`),
    antworten: [
      a(P(`Bei abhängigen Stichproben gilt n minus 1, mit n gleich der Zahl der Paare`, `For dependent samples n minus 1 applies, with n the number of pairs`),
        P(`Der gepaarte Test arbeitet mit den ${zn('ts_n')} Differenzen: ${zn('ts_n')} minus 1 gleich ${zn('ts_dfp')}. Der gepoolte Test für unabhängige Gruppen hat n1 plus n2 minus 2 gleich ${zn('ts_dfg')}.`, `The paired test works with the ${zn('ts_n')} differences: ${zn('ts_n')} minus 1 equals ${zn('ts_dfp')}. The pooled test for independent groups has n1 plus n2 minus 2 equals ${zn('ts_dfg')}.`), true),
      a(P(`Wie beim gepoolten Test gilt n1 plus n2 minus 2, nur sind es hier weniger Messungen`, `As in the pooled test, n1 plus n2 minus 2 applies, only with fewer measurements`),
        P(`Das ergibt ${zn('ts_dfg')}, die Freiheitsgrade des gepoolten Tests für unabhängige Gruppen. Der gepaarte Test arbeitet mit ${zn('ts_n')} Differenzen: ${zn('ts_dfp')}.`, `That gives ${zn('ts_dfg')}, the degrees of freedom of the pooled test for independent groups. The paired test works with ${zn('ts_n')} differences: ${zn('ts_dfp')}.`)),
      a(P('Eine Person ist ausgefallen, deshalb gehen nur neun Paare in die Rechnung ein', 'One person dropped out, so that only nine pairs enter the calculation'),
        P(`Es sind alle ${zn('ts_n')} Paare dabei. Die Freiheitsgrade ${zn('ts_dfp')} ergeben sich aus ${zn('ts_n')} minus 1.`, `All ${zn('ts_n')} pairs are included. The degrees of freedom ${zn('ts_dfp')} follow from ${zn('ts_n')} minus 1.`))
    ],
    hilfe: ['gepoolter-t-test', 'frage-messwiederholung'], belege: ['wissen:t-test-freiheitsgrade', 'wissen:t-test-drei-varianten']
  },

  // ---- Rangtests ----
  {
    id: 'rt-wahrsch', thema: 'vergleich', fall: 'rt-pg',
    stamm: P(`U geteilt durch (n1 mal n2) ist ${zd('rw_pa', 2)} (Tabelle). Was bedeutet dieser Wert?`, `U divided by (n1 times n2) is ${ze('rw_pa', 2)} (table). What does this value mean?`),
    antworten: [
      a(P(`Mit Wahrscheinlichkeit ${zd('rw_pa', 2)} liegt ein zufälliger Kontrollwert über einem von Behandlung 2 (Gleiche zählen halb)`, `With probability ${ze('rw_pa', 2)} a random control value exceeds one of treatment 2 (ties half)`),
        P(`So lässt sich die Statistik des Mann-Whitney-Tests lesen; unter der Nullhypothese wäre sie ${zd('rw_h0', 1)}. Dieselbe Größe ist die Fläche unter der ROC-Kurve (AUC).`, `This is how the statistic of the Mann-Whitney test can be read; under the null hypothesis it would be ${ze('rw_h0', 1)}. The same quantity is the area under the ROC curve (AUC).`), true),
      a(P(`Der Median der Kontrolle liegt um ${zd('rw_pa', 2)} unter dem Median der Behandlung 2 in Gramm`, `The median of the control lies ${ze('rw_pa', 2)} below the median of treatment 2, measured in grams`),
        P(`Die Mediane unterscheiden sich um ${zd('rw_dmed', 2)} (${zd('rw_m2', 3)} minus ${zd('rw_m1', 3)}), und der Mann-Whitney-Test vergleicht nicht allgemein die Mediane.`, `The medians differ by ${ze('rw_dmed', 2)} (${ze('rw_m2', 3)} minus ${ze('rw_m1', 3)}), and the Mann-Whitney test does not generally compare medians.`)),
      a(P('Ein Viertel der Kontrollpflanzen wiegt mehr als jede einzelne Pflanze von Behandlung 2 insgesamt', 'A quarter of the control plants weigh more than every single plant of treatment 2 in total'),
        P('Der Wert ist eine Wahrscheinlichkeit über alle 100 Paare je einer Pflanze aus jeder Gruppe, kein Anteil der Pflanzen oberhalb des Maximums.', 'The value is a probability over all 100 pairs of one plant from each group, not a share of plants above the maximum.'))
    ],
    hilfe: ['rangtests-weitere', 'verteilungsfrei'], belege: ['wissen:divine-mw-wahrscheinlichkeit', 'wissen:rangtests-hypothese']
  },
  {
    id: 'rt-mehrfach', thema: 'vergleich', fall: 'rt-pg', mehrfach: true,
    stamm: P('Welche Aussagen zu Rangtests wie dem Mann-Whitney-Test stimmen? Mehrere können stimmen.', 'Which statements about rank tests such as the Mann-Whitney test are correct? Several may be correct.'),
    antworten: [
      a(P('Rangtests brauchen keine Normalverteilung, prüfen aber nicht dieselbe Hypothese wie der t-Test', 'Rank tests need no normal distribution but do not test the same hypothesis as the t test'),
        P('Sie prüfen die Gleichheit von Verteilungen; nur bei gleicher Verteilungsform entspricht das etwa einem Lagevergleich.', 'They test the equality of distributions; only with the same distribution shape does this correspond roughly to a comparison of location.'), true),
      a(P('Bei erfüllten parametrischen Voraussetzungen haben Rangtests meist eine geringere Teststärke', 'When parametric assumptions are met, rank tests usually have lower power'),
        P('Das ist der Preis der Verteilungsfreiheit, wenn die Voraussetzungen des t-Tests erfüllt sind.', 'That is the price of being distribution-free when the assumptions of the t test are met.'), true),
      a(P('Ein signifikanter Mann-Whitney-Test zeigt, dass sich die Mediane der Gruppen unterscheiden', 'A significant Mann-Whitney test shows that the medians of the groups differ'),
        P('Der Test hängt nicht von den Stichprobenmedianen ab; Gruppen mit gleichem Median können deutlich verschieden getestet werden.', 'The test does not depend on the sample medians; groups with the same median can be tested as clearly different.')),
      a(P('Der Mann-Whitney-Test und der t-Test prüfen dieselbe Hypothese auf zwei Wegen', 'The Mann-Whitney test and the t test test the same hypothesis in two ways'),
        P('Der Mann-Whitney-Test prüft, ob eine Ziehung aus der einen Gruppe mit gleicher Wahrscheinlichkeit über oder unter einer aus der anderen liegt; der t-Test prüft Mittelwerte.', 'The Mann-Whitney test checks whether a draw from one group is equally likely to lie above or below one from the other; the t test checks means.'))
    ],
    hilfe: ['rangtests-weitere', 'verteilungsfrei'], belege: ['wissen:rangtests-hypothese', 'wissen:rangtests-power', 'wissen:lumley-wilcoxon-grenzen']
  },
  {
    id: 'rt-wahl', thema: 'vergleich',
    stamm: P('Wann bietet sich ein Rangtest anstelle des t-Tests an, und was ist der Preis?', 'When is a rank test preferable to the t test, and what is the price?'),
    antworten: [
      a(P('Bei kleiner Stichprobe und zweifelhafter Normalverteilung; Preis: andere Hypothese', 'With a small sample and doubtful normality; price: a different hypothesis'),
        P('Rangtests brauchen keine Normalverteilung, prüfen aber nicht dieselbe Hypothese wie der t-Test (keinen reinen Mittelwert- oder Medianvergleich). Bei erfüllten parametrischen Voraussetzungen haben sie meist eine geringere Teststärke. Bei großen Stichproben ist eine zweifelhafte Normalverteilung kein Grund.', 'Rank tests need no normal distribution but do not test the same hypothesis as the t test (not a pure comparison of means or medians). When parametric assumptions are met they usually have lower power. With large samples a doubtful normal distribution is no reason.'), true),
      a(P('Bei normalverteilten Daten, denn Rangtests haben dort mehr Teststärke als parametrische Tests', 'With normally distributed data, since rank tests have more power there than parametric tests'),
        P('Das gilt nicht allgemein. Bei erfüllten parametrischen Voraussetzungen haben Rangtests meist eine geringere Teststärke.', 'That does not hold generally. When parametric assumptions are met, rank tests usually have lower power.')),
      a(P('Bei zwei Gruppen, denn der Rangtest prüft dann genau die Mediane der beiden Gruppen', 'With two groups, since the rank test then tests exactly the medians of the two groups'),
        P('Auch bei zwei Gruppen prüft der Mann-Whitney-Test nicht allgemein die Gleichheit der Mediane, sondern ob eine Ziehung aus X mit gleicher Wahrscheinlichkeit über oder unter einer aus Y liegt.', 'Even with two groups the Mann-Whitney test does not generally test equality of medians but whether a draw from X is equally likely to lie above or below one from Y.'))
    ],
    hilfe: ['rangtests-weitere', 'nichtparametrisch'], belege: ['wissen:rangtests-hypothese', 'wissen:rangtests-power', 'wissen:lumley-t-regression-grosse-stichproben']
  },

  // ---- Hedges' Korrektur (Stand 01.11.2026, dritte Charge) ----
  {
    id: 'ef-hedges', thema: 'vergleich',
    tabelle: tab('ef-hedges', [P('Daten', 'Data'), P('Personen oder Tiere gesamt', 'People or animals in total'), P('Cohens d', 'Cohen\'s d'), P('Faktor', 'Factor'), P('korrigiertes d (Hedges\' g)', 'corrected d (Hedges\' g)')], QUELLE_HEDGES, P('Hedges\' Korrektur an zwei Datensätzen', 'Hedges\' correction applied to two data sets')),
    stamm: P('Hedges\' Korrektur multipliziert d mit einem Faktor unter 1 (Tabelle). Wann macht sie einen Unterschied?', 'Hedges\' correction multiplies d by a factor below 1 (table). When does it make a difference?'),
    antworten: [
      a(P(`Bei kleinen Stichproben: Der Faktor ${zd('hg_j1', 3)} senkt d von ${zd('hg_d1', 3)} auf ${zd('hg_g1', 3)}`, `With small samples: the factor ${ze('hg_j1', 3)} lowers d from ${ze('hg_d1', 3)} to ${ze('hg_g1', 3)}`),
        P(`d ist bei kleinen Stichproben nach oben verzerrt. Bei ${zn('hg_n2')} Tieren liegt der Faktor bei ${zd('hg_j2', 3)} (${zd('hg_d2', 3)} wird ${zd('hg_g2', 3)}); bei großen Stichproben ist er vernachlässigbar.`,
          `d is biased upwards in small samples. With ${zn('hg_n2')} animals the factor is ${ze('hg_j2', 3)} (${ze('hg_d2', 3)} becomes ${ze('hg_g2', 3)}); with large samples it is negligible.`), true),
      a(P('Bei großen Stichproben, weil d dort nach unten verzerrt ist und angehoben werden muss', 'With large samples, because d is biased downwards there and has to be raised'),
        P(`d ist bei kleinen Stichproben nach oben verzerrt, nicht nach unten. Der Faktor liegt unter 1 und nähert sich mit wachsendem Umfang 1 (${zd('hg_j2', 3)} bei ${zn('hg_n2')} Tieren).`,
          `d is biased upwards in small samples, not downwards. The factor is below 1 and approaches 1 as the size grows (${ze('hg_j2', 3)} with ${zn('hg_n2')} animals).`)),
      a(P('Um denselben Faktor, unabhängig vom Umfang der Stichprobe', 'By the same factor, regardless of the size of the sample'),
        P(`Der Faktor hängt vom Umfang ab: ${zd('hg_j1', 3)} bei ${zn('hg_n1')} Personen, ${zd('hg_j2', 3)} bei ${zn('hg_n2')} Tieren.`, `The factor depends on the size: ${ze('hg_j1', 3)} with ${zn('hg_n1')} people, ${ze('hg_j2', 3)} with ${zn('hg_n2')} animals.`))
    ],
    hilfe: ['hedges-g', 'cohens-d'], belege: ['wissen:nakagawa07-hedges-korrektur']
  },
];
