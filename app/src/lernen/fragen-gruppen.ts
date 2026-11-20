/**
 * Üben: Unterscheiden sich Gruppen? (t-Test, Welch, Varianzanalyse, Paarvergleiche, Rangtests, gepaart gegen unabhängig).
 * Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R,
 * Daten: datasets::PlantGrowth, sleep, ToothGrowth).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, zd, ze, zn, zp } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const HG = ['frage-gruppen', 'frage-posthoc'];

const QUELLE_PFLANZE = P(
  'Daten: datasets::PlantGrowth (Dobson 1983; Teil von R, Lizenz GPL), Pflanzengewicht bei Kontrolle und zwei Behandlungen. Varianzanalyse und Tukey-Test, berechnet mit R.',
  'Data: datasets::PlantGrowth (Dobson 1983; part of R, licence GPL), plant weight for a control and two treatments. Analysis of variance and Tukey test, computed with R.');
const QUELLE_SCHLAF = P(
  'Daten: datasets::sleep (Cushny und Peebles 1905, von Student 1908 ausgewertet; Teil von R, Lizenz GPL), zusätzlicher Schlaf in Stunden bei zehn Personen. Berechnet mit R.',
  'Data: datasets::sleep (Cushny and Peebles 1905, analysed by Student 1908; part of R, licence GPL), extra sleep in hours in ten people. Computed with R.');
const QUELLE_ZAHN = P(
  `Daten: datasets::ToothGrowth (Bliss 1952; Teil von R, Lizenz GPL), ${zn('rz_n')} Meerschweinchen, Zahnlänge. Berechnet mit R.`,
  `Data: datasets::ToothGrowth (Bliss 1952; part of R, licence GPL), ${zn('rz_n')} guinea pigs, tooth length. Computed with R.`);

const QUELLE_ZF = P(
  'Daten: datasets::ToothGrowth (Bliss 1952; Teil von R, Lizenz GPL), Zahnlänge von 60 Meerschweinchen bei zwei Arten der Gabe (OJ: Orangensaft, VC: Ascorbinsäure) und drei Dosen, je 10 Tiere. Die Dosis ist als Faktor gerechnet. Berechnet mit R.',
  'Data: datasets::ToothGrowth (Bliss 1952; part of R, licence GPL), tooth length of 60 guinea pigs under two kinds of supplement (OJ: orange juice, VC: ascorbic acid) and three doses, 10 animals each. The dose is treated as a factor. Computed with R.');

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'gr-pflanze': {
    titel: P('Gewicht von Pflanzen bei einer Kontrolle (ctrl) und zwei Behandlungen (trt1, trt2), je 10 Pflanzen. Einfaktorielle Varianzanalyse mit Paarvergleichen nach Tukey',
      'Weight of plants in a control (ctrl) and two treatments (trt1, trt2), 10 plants each. One-way analysis of variance with pairwise comparisons by Tukey'),
    tabellen: [
      tab('gr-pflanze.0', [P('Gruppe', 'Group'), P('n', 'n'), P('Mittelwert', 'Mean'), P('Standardabweichung', 'Standard deviation')], QUELLE_PFLANZE, P('Kennzahlen je Gruppe', 'Figures for each group')),
      tab('gr-pflanze.1', [P('Quelle', 'Source'), P('Quadratsumme', 'Sum of squares'), P('df', 'df'), P('Mittleres Quadrat', 'Mean square'), P('F', 'F'), P('Sig.', 'Sig.')], QUELLE_PFLANZE, P('Varianzanalyse (group = zwischen den Gruppen, Residuals = innerhalb der Gruppen)', 'Analysis of variance (group = between the groups, Residuals = within the groups)')),
      tab('gr-pflanze.2', [P('Paar', 'Pair'), P('Unterschied', 'Difference'), P('Untergrenze', 'Lower limit'), P('Obergrenze', 'Upper limit'), P('Sig. (angepasst)', 'Sig. (adjusted)')], QUELLE_PFLANZE, P('Paarvergleiche nach Tukey', 'Pairwise comparisons by Tukey'))
    ]
  },
  'gr-schlaf': {
    titel: P('Zusatzschlaf in Stunden bei zehn Personen, die nacheinander zwei Schlafmittel (1 und 2) erhielten. Jede Person liefert zwei Werte',
      'Extra sleep in hours in ten people who received two sleeping drugs (1 and 2) one after the other. Each person provides two values'),
    tabellen: [
      tab('gr-schlaf.0', [P('Mittel', 'Drug'), P('n', 'n'), P('Mittelwert', 'Mean'), P('Standardabweichung', 'Standard deviation'), P('95-%-Intervall unten', '95% interval lower'), P('95-%-Intervall oben', '95% interval upper')], QUELLE_SCHLAF, P('Zusatzschlaf je Schlafmittel', 'Extra sleep for each drug')),
      tab('gr-schlaf.1', [P('Vergleich', 'Comparison'), P('Unterschied der Mittelwerte', 'Difference of the means'), P('t', 't'), P('Freiheitsgrade', 'Degrees of freedom'), P('Sig. (zweiseitig)', 'Sig. (two-sided)'), P('95-%-Intervall unten', '95% interval lower'), P('95-%-Intervall oben', '95% interval upper')], QUELLE_SCHLAF, P('Welch-Test, beide Spalten als unabhängig behandelt', 'Welch test, both columns treated as independent')),
      tab('gr-schlaf.2', [P('Vergleich', 'Comparison'), P('Mittel der Unterschiede je Person', 'Mean of the differences per person'), P('Standardabweichung der Unterschiede', 'Standard deviation of the differences'), P('Standardfehler', 'Standard error'), P('t', 't'), P('Freiheitsgrade', 'Degrees of freedom'), P('Sig. (zweiseitig)', 'Sig. (two-sided)'), P('95-%-Intervall unten', '95% interval lower'), P('95-%-Intervall oben', '95% interval upper')], QUELLE_SCHLAF, P('Gepaarter t-Test', 'Paired t test'))
    ]
  },
  'gr-zahn': {
    titel: P(`Zahnlänge bei ${zn('rz_n')} Meerschweinchen, OJ gegen VC, je 30 Tiere: dieselben Daten mit drei Rechenwegen`, `Tooth length in ${zn('rz_n')} guinea pigs, OJ against VC, 30 animals each: the same data with three ways of calculating`),
    tabellen: [tab('gr-zahn.0', [P('Verfahren', 'Procedure'), P('Prüfgröße', 'Test statistic'), P('Freiheitsgrade', 'Degrees of freedom'), P('Sig.', 'Sig.')], QUELLE_ZAHN, P('t-Test mit gepoolter Streuung, Welch-Test und Varianzanalyse', 't test with pooled spread, Welch test and analysis of variance'))]
  },
  'gr-zf': {
    titel: P('Zahnlänge nach Art der Gabe und Dosis (zweifaktorielle Varianzanalyse)', 'Tooth length by kind of supplement and dose (two-way analysis of variance)'),
    tabellen: [
      tab('gr-zf.0', [P('Effekt', 'Effect'), P('Freiheitsgrade', 'Degrees of freedom'), P('Quadratsumme', 'Sum of squares'), P('F', 'F'), P('Sig.', 'Sig.')], QUELLE_ZF, P('Varianzanalyse-Tabelle', 'Analysis of variance table')),
      tab('gr-zf.1', [P('Größe', 'Term'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('Sig.', 'Sig.')], QUELLE_ZF, P('Regressionsausgabe mit Dummy-Kodierung (Referenz: OJ und Dosis 0,5)', 'Regression output with dummy coding (reference: OJ and dose 0.5)'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Fall A: Pflanzengewichte, Varianzanalyse ----
  {
    id: 'gr-a-f-lesen', thema: 'gruppen', fall: 'gr-pflanze',
    stamm: P(`Der F-Test der Varianzanalyse ist signifikant (p = ${zd('gp_p', 3)}). Was folgt daraus?`, `The F test of the analysis of variance is significant (p = ${ze('gp_p', 3)}). What follows from that?`),
    antworten: [
      a(P('In der Grundgesamtheit unterscheiden sich mindestens zwei Mittel; welche, zeigt der F-Test nicht', 'In the population at least two means differ; which ones, the F test does not show'),
        P('Die Nullhypothese lautet: Die Mittel sind gleich. Sie wird verworfen, wenn die Daten dafür sprechen, dass sich mindestens zwei unterscheiden. Welche, zeigen erst die Paarvergleiche.', 'The null hypothesis says the means are equal. It is rejected when the data speak for at least two means differing. Which ones is shown only by the pairwise comparisons.'), true),
      a(P('Die drei Gruppenmittel unterscheiden sich in der Grundgesamtheit paarweise voneinander, das zeigt der F-Test', 'The three group means differ pairwise from one another in the population, as the F test shows'),
        P('Der F-Test prüft die Gesamtheit. Die Tukey-Tabelle zeigt, dass nur ein Paar auffällt.', 'The F test checks the whole set. The Tukey table shows that only one pair stands out.')),
      a(P('Die beiden Behandlungen unterscheiden sich in der Grundgesamtheit von der Kontrolle, das zeigt der F-Test', 'The two treatments differ from the control in the population, as the F test shows'),
        P(`Die Tukey-Tabelle zeigt für beide Vergleiche mit ctrl Werte über ${zd('regel_sig')} (${zd('gp_p_t1c', 3)} und ${zd('gp_p_t2c', 3)}).`, `The Tukey table shows values above ${ze('regel_sig')} for both comparisons with ctrl (${ze('gp_p_t1c', 3)} and ${ze('gp_p_t2c', 3)}).`))
    ],
    hilfe: HG, karte: 'gruppen', belege: ['wissen:anova-hypothesen', 'wissen:anova-nach-signifikanz-welche', 'wissen:scheffe-kontrast-nicht-paar', 'Bortz und Schuster; Maxwell und Delaney']
  },
  {
    id: 'gr-a-f-berechnung', thema: 'gruppen', fall: 'gr-pflanze',
    stamm: P(`Wie kommt der F-Wert ${zd('gp_F', 3)} zustande?`, `How does the F value ${ze('gp_F', 3)} come about?`),
    antworten: [
      a(P('Aus dem mittleren Quadrat zwischen den Gruppen durch das innerhalb der Gruppen', 'From the mean square between the groups divided by the mean square within the groups'),
        P(`Das mittlere Quadrat zwischen den Gruppen (${zd('gp_ms_b', 3)}) geteilt durch das innerhalb (${zd('gp_ms_w', 3)}) ergibt rund ${zd('gp_F', 1)}.`, `The mean square between the groups (${ze('gp_ms_b', 3)}) divided by the one within (${ze('gp_ms_w', 3)}) gives about ${ze('gp_F', 1)}.`), true),
      a(P('Aus der Quadratsumme zwischen den Gruppen geteilt durch die Quadratsumme innerhalb der Gruppen', 'From the sum of squares between the groups divided by the sum of squares within the groups'),
        P(`Quadratsummen gehören zu verschiedenen Freiheitsgraden: ${zd('gp_ss_b', 3)} zu 2, ${zd('gp_ss_w', 3)} zu 27. Erst die mittleren Quadrate sind vergleichbar.`, `Sums of squares belong to different degrees of freedom: ${ze('gp_ss_b', 3)} to 2, ${ze('gp_ss_w', 3)} to 27. Only the mean squares are comparable.`)),
      a(P('Aus dem Mittelwert der Behandlungen geteilt durch den Mittelwert der Kontrolle', 'From the mean of the treatments divided by the mean of the control'),
        P('F vergleicht Streuungen, keine Mittelwerte. Die Unterschiede der Gruppenmittel gehen über die Streuung zwischen den Gruppen ein.', 'F compares variances, not means. The differences of the group means enter through the variation between the groups.'))
    ],
    hilfe: ['frage-gruppen', 'freiheitsgrade'], belege: ['wissen:anova-zerlegung', 'wissen:f-verteilung-eigenschaften', 'Bortz und Schuster']
  },
  {
    id: 'gr-a-posthoc', thema: 'gruppen', fall: 'gr-pflanze',
    stamm: P(`Angenommen, ein Paarvergleich gilt als signifikant, wenn das angepasste p unter ${zd('regel_sig')} liegt. Welche Paare unterscheiden sich nach Tukey?`, `Assume a pairwise comparison counts as significant if the adjusted p is below ${ze('regel_sig')}. Which pairs differ according to Tukey?`),
    antworten: [
      a(P(`Nur trt2 und trt1, ihr angepasstes p beträgt ${zd('gp_p_t2t1', 3)}`, `Only trt2 and trt1, their adjusted p is ${ze('gp_p_t2t1', 3)}`),
        P(`Nur das Paar trt2-trt1 hat ein Sig. unter ${zd('regel_sig')}. Der Unterschied der Mittel beträgt ${zd('gp_d_t2t1', 3)}.`, `Only the pair trt2-trt1 has a Sig. below ${ze('regel_sig')}. The difference of the means is ${ze('gp_d_t2t1', 3)}.`), true),
      a(P('Die drei Paare, denn schon der F-Test war signifikant', 'The three pairs, since the F test was already significant'),
        P(`Ein signifikanter F-Test macht nicht jedes Paar signifikant. Hier fallen zwei Paare durch (${zd('gp_p_t1c', 3)} und ${zd('gp_p_t2c', 3)}).`, `A significant F test does not make every pair significant. Here two pairs fall short (${ze('gp_p_t1c', 3)} and ${ze('gp_p_t2c', 3)}).`)),
      a(P('trt2 und ctrl, denn trt2 hat das größte Gruppenmittel', 'trt2 and ctrl, since trt2 has the largest group mean'),
        P(`Ein großes Mittel genügt nicht. Entscheidend ist der Abstand im Verhältnis zur Streuung: trt2 gegen ctrl hat ${zd('gp_p_t2c', 3)}.`, `A large mean is not enough. What counts is the distance relative to the spread: trt2 against ctrl has ${ze('gp_p_t2c', 3)}.`))
    ],
    hilfe: ['paarvergleich', 'frage-posthoc'], karte: 'gruppen', belege: ['wissen:tukey-hsd-familienweise', 'wissen:scheffe-kontrast-nicht-paar', 'wissen:anova-nach-signifikanz-welche', 'Bortz und Schuster']
  },
  {
    id: 'gr-a-warum-tukey', thema: 'gruppen', fall: 'gr-pflanze',
    stamm: P('Warum werden die Paare mit dem Tukey-Verfahren statt mit drei einzelnen t-Tests verglichen?', 'Why are the pairs compared with the Tukey procedure instead of three single t tests?'),
    antworten: [
      a(P('Einzeltests ohne Anpassung erhöhen die Chance auf einen falschen Treffer', 'Single tests without adjustment raise the chance of a false hit'),
        P('Bei mehreren Tests summieren sich die Fehlerchancen. Das Tukey-Verfahren hält das Niveau für die ganze Gruppe der Vergleiche ein.', 'With several tests the error chances add up. The Tukey procedure keeps the level for the whole family of comparisons.'), true),
      a(P('Das Tukey-Verfahren hat mehr Teststärke als ein einzelner t-Test mit gleichen Daten', 'The Tukey procedure has more power than a single t test on the same data'),
        P('Es ist umgekehrt: Die Anpassung kostet Teststärke der einzelnen Vergleiche.', 'It is the other way round: the adjustment costs power of the single comparisons.')),
      a(P('Einzeltests setzen normalverteilte Werte voraus, das Tukey-Verfahren verlangt sie nicht', 'Single tests presuppose normally distributed values, the Tukey procedure does not'),
        P('Auch das Tukey-Verfahren geht von normalverteilten Werten und gleichen Streuungen aus.', 'The Tukey procedure also assumes normally distributed values and equal variances.'))
    ],
    hilfe: ['paarvergleich', 'frage-posthoc'], belege: ['wissen:alpha-kumulierung', 'wissen:familienweise-fehlerrate', 'wissen:tukey-hsd-familienweise', 'Bortz und Schuster']
  },
  {
    id: 'gr-a-eta', thema: 'gruppen', fall: 'gr-pflanze',
    stamm: P(`Aus den Quadratsummen ergibt sich η² = ${zd('gp_eta2', 3)}. Wie ist das zu lesen?`, `The sums of squares give η² = ${ze('gp_eta2', 3)}. How is that to be read?`),
    antworten: [
      a(P('Etwa ein Viertel der Streuung der Pflanzengewichte hängt mit der Gruppe zusammen', 'About a quarter of the variation in plant weights is related to the group'),
        P(`η² ist der Anteil der Quadratsumme zwischen den Gruppen an der gesamten: ${zd('gp_ss_b', 3)} von 14,258. Es beschreibt Streuung, nicht einzelne Pflanzen.`, `η² is the share of the sum of squares between the groups in the total: ${ze('gp_ss_b', 3)} of 14.258. It describes variation, not single plants.`), true),
      a(P(`Bei etwa ${zp('gp_eta2')} Prozent der Pflanzen hat die Behandlung eine Wirkung gezeigt`, `The treatment showed an effect in about ${zp('gp_eta2')} percent of the plants`),
        P('η² sagt nichts über einzelne Pflanzen, sondern über einen Anteil an der Streuung.', 'η² says nothing about single plants, but about a share of the variation.')),
      a(P(`Die Behandlungen steigern das Gewicht im Mittel um etwa ${zp('gp_eta2')} Prozent gegenüber der Kontrolle`, `The treatments raise the weight on average by about ${zp('gp_eta2')} percent compared with the control`),
        P('η² ist kein Zuwachs in Prozent. Die Unterschiede der Mittelwerte stehen in der Tukey-Tabelle.', 'η² is no increase in percent. The differences of the means are in the Tukey table.'))
    ],
    hilfe: ['eta-quadrat', 'effektstaerke'], belege: ['wissen:anova-zerlegung', 'wissen:olejnik-eta-generalisiert-formel', 'Olejnik und Algina 2003']
  },
  {
    id: 'gr-a-levene', thema: 'gruppen', fall: 'gr-pflanze',
    stamm: P(`Der Levene-Test auf gleiche Streuungen ergibt p = ${zd('gp_levene_p', 3)}. Was folgt?`, `Levene's test for equal variances gives p = ${ze('gp_levene_p', 3)}. What follows?`),
    antworten: [
      a(P('Kein Hinweis auf ungleiche Streuungen, aber auch kein Beleg für gleiche', 'There is no sign of unequal variances, but no proof of equal ones either'),
        P('Ein nicht signifikanter Levene-Test beweist keine Gleichheit, besonders bei kleinen Gruppen. Er erkennt Unterschiede nur schlecht.', 'A non-significant Levene test does not prove equality, especially with small groups. It detects differences poorly.'), true),
      a(P('Die Streuungen der drei Gruppen sind gleich, die Voraussetzung ist damit belegt', 'The variances of the three groups are equal, the assumption is thereby established'),
        P('Fehlende Signifikanz zeigt nicht, dass die Streuungen gleich sind.', 'A lack of significance does not show that the variances are equal.')),
      a(P('Die Varianzanalyse ist damit unzulässig und durch einen Rangtest zu ersetzen', 'The analysis of variance is thereby inadmissible and has to be replaced by a rank test'),
        P(`Ein p über ${zd('regel_sig')} ist kein Grund, die Varianzanalyse aufzugeben.`, `A p above ${ze('regel_sig')} is no reason to give up the analysis of variance.`))
    ],
    hilfe: ['voraussetzungen-pruefen', 'welch-anova'], belege: ['wissen:levene-nicht-signifikant', 'wissen:anova-voraussetzungen-normalitaet', 'Bortz und Schuster']
  },
  // ---- Fall B: Schlafmittel, gepaart gegen unabhängig ----
  {
    id: 'gr-b-test', thema: 'gruppen', fall: 'gr-schlaf',
    stamm: P('Beide Mittel wurden an denselben zehn Personen geprüft. Welcher Test passt?', 'Both drugs were tested on the same ten people. Which test fits?'),
    antworten: [
      a(P('Der gepaarte t-Test, denn jede Person liefert zwei Werte', 'The paired t test, since each person provides two values'),
        P('Jede Person bildet ein Paar. Die zehn Unterschiede je Person werden gegen 0 getestet.', 'Each person forms a pair. The ten differences per person are tested against 0.'), true),
      a(P('Der Welch-Test, denn die Streuungen der beiden Mittel sind verschieden', 'The Welch test, since the spreads of the two drugs differ'),
        P('Welch behandelt die zwei Spalten als unabhängig. Das wirft die Paarung weg.', 'Welch treats the two columns as independent. That discards the pairing.')),
      a(P('Der t-Test für unabhängige Stichproben, denn die Werte stehen in zwei Spalten', 'The t test for independent samples, since the values are in two columns'),
        P('Die Spalten gehören zu denselben Personen. Unabhängigkeit der beiden Gruppen ist hier nicht gegeben.', 'The columns belong to the same people. Independence of the two groups is not given here.'))
    ],
    hilfe: ['frage-praepost', 'gepaarte-messung'], karte: 'praepost', belege: ['wissen:t-gepaart-differenzen', 'wissen:t-test-drei-varianten', 'Bortz und Schuster']
  },
  {
    id: 'gr-b-warum-p', thema: 'gruppen', fall: 'gr-schlaf',
    stamm: P(`Der Welch-Test ergibt p = ${zd('gs_p_welch', 3)}, der gepaarte Test p = ${zd('gs_p_paar', 3)}. Warum ist der gepaarte p-Wert so viel kleiner?`, `The Welch test gives p = ${ze('gs_p_welch', 3)}, the paired test p = ${ze('gs_p_paar', 3)}. Why is the paired p value so much smaller?`),
    antworten: [
      a(P('Er nutzt die Unterschiede je Person und schaltet so die Unterschiede zwischen den Personen aus', 'It uses the differences per person and so removes the differences between the people'),
        P('Manche Personen schlafen allgemein mehr. Dieser Unterschied geht in den Welch-Test ein, im gepaarten Test fällt er heraus.', 'Some people generally sleep more. That difference enters the Welch test, in the paired test it drops out.'), true),
      a(P('Er rechnet mit doppelt so vielen Messwerten und hat daher mehr Freiheitsgrade', 'It calculates with twice as many measurements and therefore has more degrees of freedom'),
        P(`Der gepaarte Test hat weniger Freiheitsgrade (9 statt ${zd('gs_df_welch', 3)}), nicht mehr.`, `The paired test has fewer degrees of freedom (9 instead of ${ze('gs_df_welch', 3)}), not more.`)),
      a(P('Er verwendet ein weniger strenges Niveau als der Welch-Test und lässt deshalb früher Signifikanz zu', 'It uses a less strict level than the Welch test and therefore allows significance sooner'),
        P('Beide Tests verwenden dasselbe Niveau. Verschieden ist die Rechnung, nicht die Schwelle.', 'Both tests use the same level. The calculation differs, not the threshold.'))
    ],
    hilfe: ['frage-praepost', 'gepaarte-messung'], karte: 'praepost', belege: ['wissen:t-gepaart-differenzen', 'wissen:t-test-freiheitsgrade', 'Bortz und Schuster']
  },
  {
    id: 'gr-b-differenzen', thema: 'gruppen', fall: 'gr-schlaf',
    stamm: P('Aus welcher Streuung berechnet der gepaarte t-Test seinen Standardfehler?', 'From which spread does the paired t test compute its standard error?'),
    antworten: [
      a(P('Aus der Streuung der zehn Unterschiede je Person', 'From the spread of the ten differences per person'),
        P(`Der Test ist ein Einstichproben-t-Test an den Unterschieden. Hier ${zd('gs_diff', 3)} bei einer Streuung von ${zd('gs_sd_d', 3)}.`, `The test is a one-sample t test on the differences. Here ${ze('gs_diff', 3)} with a spread of ${ze('gs_sd_d', 3)}.`), true),
      a(P('Aus der gemeinsamen Streuung aller 20 Werte der beiden Spalten', 'From the common spread of all 20 values of the two columns'),
        P('Das wäre der Test für zwei unabhängige Gruppen, bei dem die Paarung keine Rolle spielt.', 'That would be the test for two independent groups, in which the pairing plays no role.')),
      a(P('Aus der Streuung der Personen untereinander, also zwischen den Personen', 'From the spread between the people'),
        P('Die Streuung zwischen den Personen wird durch die Paarung herausgerechnet; sie geht nicht in den Standardfehler ein.', 'The spread between people is removed by the pairing; it does not enter the standard error.'))
    ],
    hilfe: ['frage-praepost', 'gepaarte-messung'], belege: ['wissen:t-gepaart-differenzen', 'wissen:t-test-drei-varianten', 'Bortz und Schuster']
  },
  {
    id: 'gr-b-balken', thema: 'gruppen', fall: 'gr-schlaf',
    stamm: P('Die 95-Prozent-Konfidenzintervalle der beiden Mittelwerte überlappen stark. Was lässt sich allein daraus für den gepaarten Test ableiten?', 'The 95 percent confidence intervals of the two means overlap strongly. What can be inferred from that alone for the paired test?'),
    antworten: [
      a(P('Nichts; für gepaarte Daten zählt das Intervall der Unterschiede je Person', 'Nothing; for paired data the interval of the differences counts'),
        P('Die Intervalle der Einzelmittel kennen die Paarung nicht. Das Intervall der Unterschiede reicht von -2,460 bis -0,700 und schließt die 0 aus.', 'The intervals of the single means do not know the pairing. The interval of the differences runs from -2.460 to -0.700 and excludes 0.'), true),
      a(P('Der Unterschied ist nicht signifikant, denn die Intervalle überlappen sich', 'The difference is not significant, since the intervals overlap'),
        P(`Bei gepaarten Daten sagt die Überlappung der Einzelintervalle nichts über den Test aus, hier ist p = ${zd('gs_p_paar', 3)}.`, `With paired data the overlap of the single intervals says nothing about the test, here p = ${ze('gs_p_paar', 3)}.`)),
      a(P('Aus den Mittelwerten allein folgt Signifikanz, denn sie weichen voneinander ab', 'Significance follows from the means alone, since they depart from each other'),
        P('Ein Abstand der Mittelwerte allein zeigt keine Signifikanz; dafür braucht es den Test der Unterschiede.', 'A distance between the means alone shows no significance; that takes the test of the differences.'))
    ],
    hilfe: ['gepaarte-messung', 'konfidenzintervall'], belege: ['wissen:belia-messwiederholung-balken', 'wissen:t-gepaart-differenzen', 'Belia u. a. 2005']
  },
  // ---- Fall C: Zahnlänge, drei Rechenwege ----
  {
    id: 'gr-c-welch', thema: 'gruppen', fall: 'gr-zahn',
    stamm: P('Welche Annahme braucht der Welch-Test weniger als der t-Test mit gepoolter Streuung?', 'Which assumption does the Welch test need less than the t test with pooled spread?'),
    antworten: [
      a(P('Gleiche Streuung der Werte in den beiden Gruppen', 'Equal spread of the values in the two groups'),
        P(`Welch rechnet den Standardfehler ohne Zusammenlegen der Streuungen und korrigiert die Freiheitsgrade (hier ${zd('iz_df', 3)} statt 58).`, `Welch computes the standard error without pooling the spreads and corrects the degrees of freedom (here ${ze('iz_df', 3)} instead of 58).`), true),
      a(P('Unabhängigkeit der Beobachtungen innerhalb und zwischen den Gruppen', 'Independence of the observations within and between the groups'),
        P('Unabhängigkeit bleibt Voraussetzung; Welch ändert nur den Umgang mit ungleichen Streuungen.', 'Independence remains a requirement; Welch changes only how unequal spreads are handled.')),
      a(P('Normalverteilung der Werte oder große Gruppen', 'Normal distribution of the values or large groups'),
        P('Auch der Welch-Test geht von näherungsweise normalverteilten Mittelwerten aus.', 'The Welch test also assumes approximately normally distributed means.'))
    ],
    hilfe: ['frage-gruppen', 'welch-anova', 'voraussetzungen-pruefen'], karte: 'gruppen', belege: ['wissen:welch-prinzip', 'wissen:t-voraussetzungen', 'wissen:lumley-t-regression-grosse-stichproben', 'Bortz und Schuster']
  },
  {
    id: 'gr-c-f-t', thema: 'gruppen', fall: 'gr-zahn',
    stamm: P(`Beim Vergleich von zwei Gruppen stehen in der Tabelle t = ${zd('gz_t', 3)} (t-Test mit gepoolter Streuung) und F = ${zd('gz_F', 3)}. In welcher Beziehung stehen beide?`, `When comparing two groups the table shows t = ${ze('gz_t', 3)} (t test with pooled spread) and F = ${ze('gz_F', 3)}. How are the two related?`),
    antworten: [
      a(P('F ist das Quadrat von t, und beide Tests geben denselben p-Wert', 'F is the square of t, and both tests give the same p value'),
        P(`${zd('gz_t', 3)} zum Quadrat ergibt rund ${zd('gz_F', 2)}. Bei zwei Gruppen ist die Varianzanalyse der t-Test mit gepoolter Streuung.`, `${ze('gz_t', 3)} squared gives about ${ze('gz_F', 2)}. With two groups the analysis of variance is the t test with pooled spread.`), true),
      a(P('F ist das Doppelte von t, und die p-Werte der Tests unterscheiden sich', 'F is double t, and the p values of the tests differ'),
        P('Der Zusammenhang ist quadratisch, nicht verdoppelnd.', 'The relation is quadratic, not doubling.')),
      a(P('F ist die Wurzel aus t, und beide Tests geben denselben p-Wert', 'F is the square root of t, and both tests give the same p value'),
        P('Die Wurzel aus t wäre kleiner als t, F ist aber größer.', 'The square root of t would be smaller than t, but F is larger.'))
    ],
    hilfe: ['frage-gruppen'], karte: 'gruppen', belege: ['wissen:f-gleich-t-quadrat', 'wissen:anova-verallgemeinert-t', 'Bortz und Schuster']
  },
  // ---- Einzelfragen ----
  {
    id: 'gr-liberal', thema: 'gruppen',
    stamm: P('Zwei Gruppen sind verschieden groß, und die kleinere Gruppe hat die größere Streuung. Wie arbeitet der t-Test mit gepoolter Streuung?', 'Two groups differ in size, and the smaller group has the larger spread. How does the t test with pooled spread work?'),
    antworten: [
      a(P('Er zeigt zu oft Signifikanz an, das Niveau wird überschritten', 'It shows significance too often, the level is exceeded'),
        P('Hat die kleinere Gruppe die größere Streuung, ist der Test liberal. Der Welch-Test korrigiert das.', 'If the smaller group has the larger spread, the test is liberal. The Welch test corrects that.'), true),
      a(P('Er zeigt zu selten Signifikanz an, das Niveau wird unterschritten', 'It shows significance too rarely, the level is undershot'),
        P('So wäre es bei größerer Streuung in der größeren Gruppe (konservativ). Hier ist es umgekehrt.', 'That would be so with the larger spread in the larger group (conservative). Here it is the other way round.')),
      a(P('Er arbeitet wie gewohnt, denn die Gruppengröße ist ohne Einfluss', 'It works as usual, since group size has no influence'),
        P('Bei gleicher Streuung wäre das richtig. Erst die Kombination ungleicher Größen und Streuungen schadet.', 'With equal spreads that would be right. Only the combination of unequal sizes and spreads does harm.'))
    ],
    hilfe: ['frage-gruppen', 'welch-anova'], karte: 'gruppen', belege: ['wissen:t-robustheit-ungleiche-n-varianzen', 'wissen:robust-progressiv-konservativ', 'Bortz und Schuster']
  },
  {
    id: 'gr-mann-whitney', thema: 'gruppen',
    stamm: P('Der Mann-Whitney-Test fällt signifikant aus. Welche Aussage ist gedeckt?', 'The Mann-Whitney test is significant. Which statement is supported?'),
    antworten: [
      a(P('In der Population liegen Werte der einen Gruppe häufiger höher als Werte der anderen', 'In the population values of one group lie higher more often than values of the other'),
        P('Der Test vergleicht, wie oft ein Wert der einen Gruppe über einem der anderen liegt. Ein Mediantest ist er nur bei gleicher Verteilungsform.', 'The test compares how often a value of one group lies above one of the other. It is a test of medians only when the distributions have the same shape.'), true),
      a(P('Die Mediane der beiden Gruppen unterscheiden sich in der Population deutlich voneinander', 'The medians of the two groups differ clearly in the underlying population'),
        P('Der Test kann signifikant ausfallen, obwohl die Mediane gleich sind, und umgekehrt nicht signifikant, obwohl sie sich unterscheiden.', 'The test can be significant although the medians are equal, and not significant although they differ.')),
      a(P('Die Mittelwerte der beiden Gruppen unterscheiden sich in der Population deutlich voneinander', 'The means of the two groups differ clearly in the underlying population'),
        P('Mittelwerte vergleicht dieser Test nicht; er arbeitet mit Rängen.', 'This test does not compare means; it works with ranks.'))
    ],
    hilfe: ['rangtest', 'rangtests-weitere'], belege: ['wissen:rangtests-hypothese', 'wissen:lumley-wilcoxon-grenzen', 'wissen:divine-mw-wahrscheinlichkeit', 'Lumley u. a. 2002; Divine u. a. 2018']
  },
  {
    id: 'gr-rang-wahl', thema: 'gruppen',
    stamm: P('Wann ist ein Rangtest statt eines t-Tests eine gute Wahl?', 'When is a rank test a good choice instead of a t test?'),
    antworten: [
      a(P('Wenn die Werte nur eine Rangordnung tragen, etwa Zufriedenheitsstufen', 'When values carry just a rank order, such as satisfaction levels'),
        P('Rangtests brauchen nur die Ordnung der Werte. Sie prüfen aber nicht dieselbe Hypothese wie der t-Test.', 'Rank tests need only the order of the values. They do not test the same hypothesis as the t test, though.'), true),
      a(P('Wenn Mittelwerte verglichen werden sollen, denn Rangtests prüfen Mittelwerte', 'When means are to be compared, since rank tests are tests of means'),
        P('Rangtests vergleichen Verteilungen, keine Mittelwerte.', 'Rank tests compare distributions, not means.')),
      a(P('Wenn die Normalverteilung zutrifft, denn dann haben Rangtests mehr Teststärke', 'When normality holds, since rank tests then have more power than t tests'),
        P('Bei erfüllten Voraussetzungen haben Rangtests meist die geringere Teststärke.', 'When the assumptions are met, rank tests usually have the lower power.'))
    ],
    hilfe: ['rangtest', 'frage-gruppen'], belege: ['wissen:rangtests-hypothese', 'wissen:rangtests-power', 'wissen:rangtests-entsprechungen', 'Bortz und Schuster']
  },
  {
    id: 'gr-wilcoxon', thema: 'gruppen',
    stamm: P('Dieselben Personen werden zweimal gemessen, die Unterschiede weichen deutlich von der Normalverteilung ab. Welcher Rangtest entspricht dem gepaarten t-Test?', 'The same people are measured twice, the differences deviate clearly from a normal distribution. Which rank test corresponds to the paired t test?'),
    antworten: [
      a(P('Der Wilcoxon-Test für Paardifferenzen, er rangiert die Differenzen', 'The Wilcoxon test for paired differences, which ranks the differences'),
        P('Der Wilcoxon-Test ist die Rangentsprechung des gepaarten t-Tests.', 'The Wilcoxon test is the rank counterpart of the paired t test.'), true),
      a(P('Der Mann-Whitney-Test, er rangiert die Werte beider Gruppen gemeinsam', 'The Mann-Whitney test, which ranks the values of both groups together'),
        P('Der Mann-Whitney-Test ist die Entsprechung für zwei unabhängige Gruppen.', 'The Mann-Whitney test is the counterpart for two independent groups.')),
      a(P('Der Kruskal-Wallis-Test, er rangiert die Werte mehrerer Gruppen gemeinsam', 'The Kruskal-Wallis test, which ranks the values of several groups together'),
        P('Kruskal-Wallis entspricht der einfaktoriellen Varianzanalyse mit unabhängigen Gruppen.', 'Kruskal-Wallis corresponds to the one-way analysis of variance with independent groups.'))
    ],
    hilfe: ['rangtest', 'friedman-test'], karte: 'praepost', belege: ['wissen:rangtests-entsprechungen', 'wissen:wilcoxon-paare', 'wissen:kruskal-wallis-hypothese', 'Bortz und Schuster']
  },
  {
    id: 'gr-kumulierung', thema: 'gruppen',
    stamm: P(`Ein Team vergleicht 20 unabhängige Merkmale zwischen zwei Gruppen, jeweils mit dem Niveau ${zd('regel_sig')}. In Wirklichkeit besteht bei keinem ein Unterschied. Wie groß ist die Chance auf mindestens ein signifikantes Ergebnis?`,
      `A team compares 20 independent attributes between two groups, each at the level ${ze('regel_sig')}. In reality there is no difference in any of them. How large is the chance of at least one significant result?`),
    antworten: [
      a(P('Rund 64 Prozent; das Niveau gilt für einen Test, nicht für das ganze Bündel', 'About 64 percent; the level applies to the single test, not to the whole bundle'),
        P(`Die Chance ist 1 minus ${zd('mt_q')} hoch 20, also etwa ${zd('mt_p20', 3)}. Deshalb braucht es bei vielen Tests eine Anpassung.`, `The chance is 1 minus ${ze('mt_q')} to the power of 20, so about ${ze('mt_p20', 3)}. That is why many tests call for an adjustment.`), true),
      a(P('Fünf Prozent, denn das Niveau gilt für die einzelnen Tests und bleibt daher gleich', 'Five percent, since the level applies to the single tests and therefore stays the same'),
        P('Fünf Prozent gelten für einen einzelnen Test. Bei 20 Tests summieren sich die Chancen.', 'Five percent applies to a single test. With 20 tests the chances add up.')),
      a(P('Rund 100 Prozent, denn fünf Prozent von 20 Tests sind ein Treffer', 'About 100 percent, since five percent of 20 tests makes one false hit'),
        P(`Im Mittel ist ein falscher Treffer zu erwarten, die Chance auf mindestens einen liegt trotzdem bei ${zd('mt_p20', 3)}, nicht bei 100 Prozent.`, `On average one false hit is to be expected, the chance of at least one is still ${ze('mt_p20', 3)}, not 100 percent.`))
    ],
    hilfe: ['paarvergleich', 'frage-posthoc'], belege: ['wissen:alpha-kumulierung', 'wissen:familienweise-fehlerrate', 'wissen:wasserstein16-selektives-berichten', 'Bortz und Schuster']
  },
  {
    id: 'gr-grosse-gruppen', thema: 'gruppen',
    stamm: P('Zwei Gruppen mit je 500 Personen haben schief verteilte Werte. Darf der t-Test (ohne gleiche Streuungen) verwendet werden?', 'Two groups of 500 people each have skewed values. May the t test (without equal variances) be used?'),
    antworten: [
      a(P('Ja, denn bei so großen Gruppen genügen näherungsweise normalverteilte Mittelwerte', 'Yes, since with groups this large approximately normal means are enough'),
        P('Der zentrale Grenzwertsatz gilt für Mittelwerte. Der Welch-Test bleibt bei großen Gruppen auch ohne normalverteilte Werte brauchbar.', 'The central limit theorem applies to means. The Welch test stays usable with large groups even without normally distributed values.'), true),
      a(P('Nur bei normalverteilten Werten in beiden Gruppen, auch wenn die Gruppen groß sind', 'Only with normally distributed values in both groups, even if the groups are large'),
        P('Die Voraussetzung betrifft die Mittelwerte; bei großen Gruppen ist sie auch bei schiefen Werten näherungsweise erfüllt.', 'The requirement concerns the means; with large groups it is approximately met even with skewed values.')),
      a(P('Besser ein Rangtest, denn bei schiefen Werten zählt die Gruppengröße wenig', 'A rank test is better, because with skewed values group size counts for little'),
        P('Ein Rangtest prüft eine andere Hypothese. Die Gruppengröße zählt bei Mittelwerten durchaus.', 'A rank test tests a different hypothesis. Group size does count for means.'))
    ],
    hilfe: ['voraussetzungen-pruefen', 'frage-gruppen', 'normalverteilung'], belege: ['wissen:lumley-t-regression-grosse-stichproben', 'wissen:grenzwertsatz-verlauf', 'wissen:micceri-zgs-missverstaendnis', 'Lumley u. a. 2002']
  },
  {
    id: 'gr-welch-anova', thema: 'gruppen',
    stamm: P('Der Levene-Test deutet auf ungleiche Streuungen hin, und die drei Gruppen sind verschieden groß. Was ist vernünftig?', 'Levene\'s test points to unequal variances, and the three groups differ in size. What is sensible?'),
    antworten: [
      a(P('Die Welch-Varianzanalyse mit Paarvergleichen, die gleiche Streuungen nicht voraussetzen', 'Welch analysis of variance with pairwise comparisons for unequal variances'),
        P('Bei ungleichen Streuungen und ungleichen Gruppengrößen kann der gewöhnliche F-Test zu viele oder zu wenige Signifikanzen zeigen. Welch-Verfahren umgehen das.', 'With unequal variances and unequal group sizes the ordinary F test can show too many or too few significances. Welch procedures avoid that.'), true),
      a(P('Den gewöhnlichen F-Test beibehalten, denn er ist gegen Streuungsunterschiede unempfindlich', 'Keep the ordinary F test, since it is insensitive to differences in variance'),
        P('Gerade die Kombination ungleicher Größen und Streuungen verfälscht den F-Test.', 'It is precisely the combination of unequal sizes and variances that distorts the F test.')),
      a(P('Die auffälligsten Werte entfernen, bis der Levene-Test nicht mehr signifikant ausfällt', 'Remove the most conspicuous values until Levene\'s test is no longer significant'),
        P('Werte nur zu entfernen, damit eine Voraussetzung erfüllt wirkt, verzerrt die Ergebnisse.', 'Removing values merely to make an assumption look met distorts the results.'))
    ],
    hilfe: ['welch-anova', 'paarvergleich'], karte: 'gruppen', belege: ['wissen:t-robustheit-ungleiche-n-varianzen', 'wissen:levene-nicht-signifikant', 'wissen:brown-forsythe-zwei-tests', 'Bortz und Schuster']
  },
  {
    id: 'gr-unabhaengig', thema: 'gruppen',
    stamm: P('Kinder aus denselben Klassen werden in einer Varianzanalyse wie unabhängige Beobachtungen behandelt. Was ist die Folge?', 'Children from the same classes are treated in an analysis of variance like independent observations. What is the consequence?'),
    antworten: [
      a(P('Der Test zeigt zu oft Signifikanz an, weil ähnliche Kinder wie unabhängige zählen', 'The test shows significance too often, as similar children count as independent'),
        P('Positive Abhängigkeit innerhalb der Klassen macht den Test liberal. Die Unabhängigkeit der Fehler ist die empfindlichste Voraussetzung.', 'Positive dependence within the classes makes the test liberal. Independence of the errors is the most sensitive requirement.'), true),
      a(P('Der Test zeigt zu selten Signifikanz an, weil Kinder einer Klasse sich ähnlich sind', 'The test shows significance too rarely, because children of one class are so alike'),
        P('Es ist umgekehrt: Ähnlichkeit innerhalb von Gruppen verkleinert den Standardfehler zu stark.', 'It is the other way round: similarity within groups makes the standard error too small.')),
      a(P('Es ändert sich wenig, denn die Normalverteilung ist die wichtigere Voraussetzung', 'Little changes, since normality is the more important requirement'),
        P('Verletzte Unabhängigkeit wirkt stärker als verletzte Normalverteilung.', 'Violated independence has a stronger effect than violated normality.'))
    ],
    hilfe: ['voraussetzungen-pruefen', 'frage-mehrebenen'], belege: ['wissen:anova-unabhaengigkeit-ernst', 'wissen:anova-nichtnormalitaet-wirkung', 'Bortz und Schuster']
  },

  // ---- Zweifaktorielle Varianzanalyse (Stand 01.11.2026, dritte Charge) ----
  {
    id: 'gr-zf-zerlegung', thema: 'gruppen', fall: 'gr-zf', karte: 'gruppen',
    stamm: P(`Die Zeile „Residuen“ der Varianzanalyse-Tabelle hat ${zn('zf_dfres')} Freiheitsgrade, obwohl nur ${zn('zf_n')} Tiere gemessen wurden. Wie kommt die Zahl zustande?`,
      `The row "Residuals" of the analysis-of-variance table has ${zn('zf_dfres')} degrees of freedom although only ${zn('zf_n')} animals were measured. How does the number arise?`),
    antworten: [
      a(P(`${zn('zf_n')} Tiere minus 6 Mittelwerte (2 Arten der Gabe mal 3 Dosen)`, `${zn('zf_n')} animals minus 6 means (2 kinds of supplement times 3 doses)`),
        P(`Eine Gruppierung mit k Stufen verbraucht k Freiheitsgrade, es bleiben n minus k für die Residuen. Hier gibt es 6 Gruppen: ${zn('zf_n')} minus 6 gleich ${zn('zf_dfres')}.`,
          `A grouping with k levels uses up k degrees of freedom, n minus k remain for the residuals. Here there are 6 groups: ${zn('zf_n')} minus 6 equals ${zn('zf_dfres')}.`), true),
      a(P(`${zn('zf_n')} minus 5, also 55: je ein Freiheitsgrad für die Effekte der Tabelle, der Rest für die Residuen`, `${zn('zf_n')} minus 5, that is 55: the degrees of freedom of the effects in the table, the rest for the residuals`),
        P('Auch das Gesamtmittel verbraucht einen Freiheitsgrad. Die Tabelle zeigt für die Effekte 1 plus 2 plus 2 gleich 5; zusammen mit dem Gesamtmittel und den Residuen ergibt das die 60 Tiere.',
          'The overall mean also uses up one degree of freedom. The table shows 1 plus 2 plus 2 equals 5 for the effects; together with the overall mean and the residuals that makes the 60 animals.')),
      a(P(`${zn('zf_n')} minus 1, also 59: nur das Gesamtmittel wird abgezogen`, `${zn('zf_n')} minus 1, that is 59: only the overall mean is subtracted`),
        P('59 sind die Freiheitsgrade der Gesamtstreuung. Für die Residuen werden alle sechs Gruppenmittel abgezogen, die 5 Freiheitsgrade der Effekte gehören nicht zu ihnen.',
          '59 are the degrees of freedom of the total variation. For the residuals all six group means are subtracted; the 5 degrees of freedom of the effects do not belong to them.'))
    ],
    hilfe: ['anova-tabelle', 'zweifaktorielle-varianzanalyse'], belege: ['wissen:dormann-freiheitsgrade', 'wissen:dormann-anova-zerlegung']
  },
  {
    id: 'gr-zf-wechselwirkung', thema: 'gruppen', fall: 'gr-zf', karte: 'gruppen',
    stamm: P(`In der zweiten Tabelle haben die beiden Wechselwirkungs-Koeffizienten die Sig. ${zd('zf_pk1', 3)} und ${zd('zf_pk2', 3)}, in der ersten Tabelle hat die Wechselwirkung insgesamt Sig. ${zd('zf_pint', 3)}. Woran erkennt man, ob eine Wechselwirkung insgesamt vorliegt?`,
      `In the second table the two interaction coefficients have Sig. ${ze('zf_pk1', 3)} and ${ze('zf_pk2', 3)}, in the first table the interaction as a whole has Sig. ${ze('zf_pint', 3)}. How can one tell whether an interaction is present overall?`),
    antworten: [
      a(P('An der Zeile der Wechselwirkung in der Varianzanalyse-Tabelle, die alle Stufen prüft', 'In the interaction row of the analysis-of-variance table, which tests all levels'),
        P(`Die Tabelle testet jeden Effekt über alle Stufen hinweg, auch die Wechselwirkung (F = ${zd('zf_fint', 2)} bei 2 Freiheitsgraden). Einzelne Koeffizienten sagen allein nicht, ob eine Wechselwirkung insgesamt vorliegt.`,
          `The table tests every effect across all levels, the interaction included (F = ${ze('zf_fint', 2)} with 2 degrees of freedom). Single coefficients alone do not tell whether an interaction is present overall.`), true),
      a(P(`Am ersten Koeffizienten (VC mal Dosis 1): Mit Sig. ${zd('zf_pk1', 3)} liegt keine Wechselwirkung vor`, `At the first coefficient (VC times dose 1): with Sig. ${ze('zf_pk1', 3)} there is no interaction`),
        P(`Dieser Koeffizient vergleicht nur eine Dosis mit der Referenzdosis. Der zweite hat Sig. ${zd('zf_pk2', 3)}, die Wechselwirkung insgesamt ${zd('zf_pint', 3)}.`,
          `This coefficient compares only one dose with the reference dose. The second has Sig. ${ze('zf_pk2', 3)}, the interaction as a whole ${ze('zf_pint', 3)}.`)),
      a(P('An der Zeile „Art der Gabe“: Ist sie signifikant, liegt auch eine Wechselwirkung vor', 'In the row "kind of supplement": if it is significant, an interaction is present as well'),
        P('Ein Haupteffekt sagt nichts über die Wechselwirkung. Sie hat in der Tabelle eine eigene Zeile mit eigenem F und eigener Sig.',
          'A main effect says nothing about the interaction. It has its own row in the table with its own F and its own Sig.'))
    ],
    hilfe: ['zweifaktorielle-varianzanalyse', 'anova-tabelle'], belege: ['wissen:dormann-zweifaktoriell-vereinfachen']
  },
  {
    id: 'gr-zf-mehrfach', thema: 'gruppen', fall: 'gr-zf', mehrfach: true, karte: 'gruppen',
    stamm: P('Welche Aussagen zu den beiden Tabellen stimmen? Mehrere können stimmen.', 'Which statements about the two tables are correct? Several may be correct.'),
    antworten: [
      a(P(`Die Konstante ${zd('zf_b0', 2)} ist der Mittelwert der Referenzzelle (OJ, Dosis 0,5)`, `The constant ${ze('zf_b0', 2)} is the mean of the reference cell (OJ, dose 0.5)`),
        P('Bei Dummy-Kodierung gibt der Achsenabschnitt den Mittelwert der Referenzstufen an; die weiteren Koeffizienten sind Abweichungen davon.', 'With dummy coding the intercept gives the mean of the reference levels; the other coefficients are deviations from it.'), true),
      a(P(`Der vorhergesagte Mittelwert von VC bei Dosis 2 ist die Summe der passenden Koeffizienten: ${zd('zf_zelle', 2)}`, `The predicted mean of VC at dose 2 is the sum of the matching coefficients: ${ze('zf_zelle', 2)}`),
        P(`Man addiert die Konstante (${zd('zf_b0', 2)}), VC (${zd('zf_bvc', 2)}), Dosis 2 (${zd('zf_bd2', 2)}) und die Wechselwirkung VC mal Dosis 2 (${zd('zf_bint2', 2)}) und erhält ${zd('zf_zelle', 2)}.`,
          `One adds the constant (${ze('zf_b0', 2)}), VC (${ze('zf_bvc', 2)}), dose 2 (${ze('zf_bd2', 2)}) and the interaction VC times dose 2 (${ze('zf_bint2', 2)}) and gets ${ze('zf_zelle', 2)}.`), true),
      a(P(`Die Konstante ${zd('zf_b0', 2)} ist der Gesamtmittelwert aller ${zn('zf_n')} Tiere`, `The constant ${ze('zf_b0', 2)} is the overall mean of all ${zn('zf_n')} animals`),
        P(`Das Gesamtmittel beträgt ${zd('zf_gm', 2)}. Die Konstante gehört nur zur Referenzzelle.`, `The overall mean is ${ze('zf_gm', 2)}. The constant belongs to the reference cell only.`)),
      a(P('Weil die Dosis signifikant ist, unterscheiden sich je zwei Dosen voneinander', 'Because the dose is significant, any two doses differ from each other'),
        P('Eine signifikante Tabellenzeile zeigt nur, dass die Aufteilung die Restvarianz senkt. Welche Dosen sich unterscheiden, zeigen erst Paarvergleiche (Post-hoc-Tests).',
          'A significant table row shows only that the grouping reduces the residual variance. Which doses differ is shown only by pairwise comparisons (post hoc tests).'))
    ],
    hilfe: ['dummy-variable', 'zweifaktorielle-varianzanalyse'], belege: ['wissen:dormann-dummy-referenz', 'wissen:dormann-posthoc-noetig']
  },
];
