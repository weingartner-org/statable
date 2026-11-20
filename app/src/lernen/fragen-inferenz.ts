/**
 * Üben: Wie sicher ist mein Ergebnis? (p-Wert, Konfidenzintervall, Fehlerarten, Teststärke, Standardfehler, Effektstärke, Verfahren wählen).
 * Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R,
 * Daten: datasets::ToothGrowth, PlantGrowth, quakes; Fehldeutungen nach Wasserstein und Lazar 2016, Greenland u. a. 2016, Cohen 1994, Belia u. a. 2005, Button u. a. 2013).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, zd, ze, zn, zp } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const PW = ['p-wert', 'signifikanz'];
const KI = ['konfidenzintervall'];

const QUELLE_ZAHN = P(
  `Daten: datasets::ToothGrowth (Bliss 1952; Teil von R, Lizenz GPL), ${zn('rz_n')} Meerschweinchen, Zahnlänge. Welch-Test und Intervalle, berechnet mit R.`,
  `Data: datasets::ToothGrowth (Bliss 1952; part of R, licence GPL), ${zn('rz_n')} guinea pigs, tooth length. Welch test and intervals, computed with R.`);
const QUELLE_PFLANZE = P(
  'Daten: datasets::PlantGrowth (Dobson 1983; Teil von R, Lizenz GPL), Pflanzengewicht bei Kontrolle und zwei Behandlungen. Berechnet mit R.',
  'Data: datasets::PlantGrowth (Dobson 1983; part of R, licence GPL), plant weight for a control and two treatments. Computed with R.');
const QUELLE_BEBEN = P(
  `Daten: datasets::quakes (Beben nahe Fidschi seit 1964, J. Woodhouse, Harvard University; Teil von R, Lizenz GPL), ${zn('iq_n')} Beben. Korrelation, berechnet mit R.`,
  `Data: datasets::quakes (earthquakes near Fiji since 1964, J. Woodhouse, Harvard University; part of R, licence GPL), ${zn('iq_n')} earthquakes. Correlation, computed with R.`);
const QUELLE_PLAN = P(
  'Planung mit Unterschied und gemeinsamer Streuung aus datasets::ToothGrowth (Bliss 1952; Teil von R, Lizenz GPL). Teststärke für den zweiseitigen Test, berechnet mit R.',
  'Planning with the difference and pooled spread from datasets::ToothGrowth (Bliss 1952; part of R, licence GPL). Power of the two-sided test, computed with R.');

const QUELLE_ALPHA_SIM = P(
  'Rechenbeispiel (Simulation) mit festem Startwert 11: 20000 t-Tests mit je 20 Zufallszahlen aus derselben Normalverteilung in beiden Gruppen. Zweiter Weg: zweiter Startwert und die exakte Theorie. Berechnet mit R.',
  'Worked example (simulation) with a fixed seed 11: 20000 t tests with 20 random numbers each from the same normal distribution in both groups. Second way: a second seed and the exact theory. Computed with R.');
const QUELLE_ZWEI = P(
  'Rechenbeispiel ohne Daten: zwei gleichartige Studien mit Teststärke 0,70 bei zutreffender Alternative; die Wahrscheinlichkeiten folgen aus der Binomialrechnung. Zweiter Weg: Simulation von 20000 Studienpaaren mit t-Tests. Berechnet mit R.',
  'Worked example without data: two similar studies with power 0.70 when the alternative is true; the probabilities follow from binomial calculation. Second way: simulation of 20000 pairs of studies with t tests. Computed with R.');

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'inf-zahn': {
    titel: P(`Zahnlänge bei ${zn('rz_n')} Meerschweinchen: OJ (Orangensaft) und VC (Ascorbinsäure) als Vitamin-C-Gabe, je ${zn('iz_n')} Tiere. Die Mittelwerte werden mit dem Welch-Test verglichen`,
      `Tooth length in ${zn('rz_n')} guinea pigs: OJ (orange juice) and VC (ascorbic acid) as the vitamin C dose, ${zn('iz_n')} animals each. The means are compared with the Welch test`),
    tabellen: [
      tab('inf-zahn.0', [P('Gruppe', 'Group'), P('n', 'n'), P('Mittelwert', 'Mean'), P('Standardabweichung', 'Standard deviation'), P('Standardfehler', 'Standard error')], QUELLE_ZAHN, P('Kennzahlen je Gruppe', 'Figures for each group')),
      tab('inf-zahn.1', [P('Vergleich', 'Comparison'), P('Unterschied der Mittelwerte', 'Difference of the means'), P('t', 't'), P('Freiheitsgrade', 'Degrees of freedom'), P('Sig. (zweiseitig)', 'Sig. (two-sided)'), P('95-%-Intervall unten', '95% interval lower'), P('95-%-Intervall oben', '95% interval upper')], QUELLE_ZAHN, P('Welch-Test', 'Welch test')),
      tab('inf-zahn.2', [P('Niveau', 'Level'), P('Untergrenze', 'Lower limit'), P('Obergrenze', 'Upper limit'), P('Breite', 'Width')], QUELLE_ZAHN, P('Intervall des Unterschieds bei zwei Niveaus', 'Interval of the difference at two levels'))
    ]
  },
  'inf-power': {
    titel: P(`Planung einer Wiederholung: angenommener Unterschied ${zd('ip_delta', 1)} und gemeinsame Streuung ${zd('ip_sd')} wie in den Zahnlängen, zwei Gruppen gleicher Größe`,
      `Planning a repeat: assumed difference ${ze('ip_delta', 1)} and pooled spread ${ze('ip_sd')} as in the tooth lengths, two groups of equal size`),
    tabellen: [tab('inf-power.0', [P('Tiere je Gruppe', 'Animals per group'), P('Teststärke bei Niveau 0,05', 'Power at level 0.05'), P('Teststärke bei Niveau 0,01', 'Power at level 0.01')], QUELLE_PLAN, P('Teststärke nach Gruppengröße und Niveau', 'Power by group size and level'))]
  },
  'inf-dosis': {
    titel: P('Zahnlänge bei drei Dosen (0,5, 1 und 2), je 10 Tiere je Gruppe: Unterschied OJ minus VC mit 95-Prozent-Konfidenzintervall und p-Wert je Dosis',
      'Tooth length at three doses (0.5, 1 and 2), 10 animals per group: difference OJ minus VC with 95 percent confidence interval and p value for each dose'),
    tabellen: [tab('inf-dosis.0', [P('Dosis', 'Dose'), P('Unterschied OJ - VC', 'Difference OJ - VC'), P('Intervall unten', 'Interval lower'), P('Intervall oben', 'Interval upper'), P('Breite des Intervalls', 'Width of the interval'), P('Sig.', 'Sig.')], QUELLE_ZAHN, P('Welch-Test je Dosis', 'Welch test for each dose'))]
  },
  'inf-pflanze': {
    titel: P('Gewicht von Pflanzen bei einer Kontrolle (ctrl) und zwei Behandlungen (trt1, trt2), je 10 Pflanzen',
      'Weight of plants in a control (ctrl) and two treatments (trt1, trt2), 10 plants each'),
    tabellen: [
      tab('inf-pflanze.0', [P('Gruppe', 'Group'), P('n', 'n'), P('Mittelwert', 'Mean'), P('Standardabweichung', 'Standard deviation'), P('Standardfehler', 'Standard error'), P('95-%-Intervall unten', '95% interval lower'), P('95-%-Intervall oben', '95% interval upper')], QUELLE_PFLANZE, P('Kennzahlen und Intervall des Mittelwerts je Gruppe', 'Figures and interval of the mean for each group')),
      tab('inf-pflanze.1', [P('Vergleich', 'Comparison'), P('Unterschied der Mittelwerte', 'Difference of the means'), P('t', 't'), P('Freiheitsgrade', 'Degrees of freedom'), P('Sig. (zweiseitig)', 'Sig. (two-sided)'), P('95-%-Intervall unten', '95% interval lower'), P('95-%-Intervall oben', '95% interval upper')], QUELLE_PFLANZE, P('Welch-Test: trt2 gegen ctrl', 'Welch test: trt2 against ctrl'))
    ]
  },
  'inf-zwei': {
    titel: P('Zwei Studien mit Teststärke 0,70 bei zutreffender Alternative (Rechenbeispiel)', 'Two studies with power 0.70 when the alternative is true (worked example)'),
    tabellen: [
      tab('inf-zwei.0', [P('Ereignis', 'Event'), P('Wahrscheinlichkeit', 'Probability')], QUELLE_ZWEI, P('Rechenbeispiel: Ausgänge zweier Studien', 'Worked example: outcomes of two studies'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Fall A: Zahnlängen, Welch-Test ----
  {
    id: 'inf-a-p-lesen', thema: 'inferenz', fall: 'inf-zahn',
    stamm: P(`Der Welch-Test ergibt p = ${zd('iz_p', 3)}. Wie ist dieser p-Wert zu lesen?`, `The Welch test gives p = ${ze('iz_p', 3)}. How is this p value to be read?`),
    antworten: [
      a(P('Ohne echten Unterschied zeigen etwa 6 von 100 gleichartigen Studien einen so großen oder größeren Unterschied', 'With no real difference, about 6 in 100 similar studies show a difference this large or larger'),
        P('Der p-Wert sagt, wie leicht solche Daten unter der Annahme „kein Unterschied“ und allen weiteren Annahmen des Modells entstehen.', 'The p value says how easily such data arise under the assumption of no difference and all further assumptions of the model.'), true),
      a(P('Mit einer Wahrscheinlichkeit von etwa 6 Prozent besteht zwischen den beiden Gaben in Wirklichkeit kein Unterschied', 'There is about a 6 percent probability that no real difference exists between the two vitamin C doses'),
        P('Der p-Wert ist keine Wahrscheinlichkeit für die Annahme selbst. Er wird unter der Annahme berechnet, dass sie gilt.', 'The p value is not a probability of the assumption itself. It is computed under the assumption that it holds.')),
      a(P('Mit einer Wahrscheinlichkeit von etwa 6 Prozent ist der gefundene Unterschied allein durch Zufall entstanden', 'There is about a 6 percent probability that the difference found in this sample arose by chance alone'),
        P('Auch das ist eine Wahrscheinlichkeit für die Erklärung. Der p-Wert beschreibt die Daten unter der Annahme, nicht die Annahme.', 'This too is a probability of the explanation. The p value describes the data under the assumption, not the assumption.'))
    ],
    hilfe: [...PW, 'frage-gruppen'], karte: 'gruppen', probieren: 'kennzahlen', belege: ['wissen:p-wert-definition', 'wissen:wasserstein16-p-nicht-wahrscheinlichkeit', 'wissen:greenland16-p-keine-hypothesenwahrscheinlichkeit', 'Wasserstein und Lazar 2016; Greenland u. a. 2016']
  },
  {
    id: 'inf-a-nicht-sig', thema: 'inferenz', fall: 'inf-zahn',
    stamm: P(`Angenommen, ein Ergebnis gilt als signifikant, wenn p kleiner als ${zd('regel_sig')} ist. Was folgt aus p = ${zd('iz_p', 3)} für die beiden Gaben?`,
      `Assume a result counts as significant if p is below ${ze('regel_sig')}. What follows from p = ${ze('iz_p', 3)} for the two doses?`),
    antworten: [
      a(P('Die Daten sichern einen Unterschied nicht ab, zeigen aber keinen Gleichstand', 'The data do not secure a difference, but do not show equality either'),
        P(`Ein Ergebnis über der Schwelle zeigt nur, dass die Daten nicht ausreichen. Das Intervall reicht bis ${zd('iz_hi', 3)}.`, `A result above the threshold only shows that the data are insufficient. The interval reaches up to ${ze('iz_hi', 3)}.`), true),
      a(P('Die Gaben wirken gleich, denn die Schwelle für einen Unterschied wurde verfehlt', 'The doses work alike, since the threshold for a difference was missed'),
        P(`Ein p über der Schwelle belegt keinen Gleichstand. Das Intervall zeigt, was zu den Daten passt: von ${zd('iz_lo', 3)} bis ${zd('iz_hi', 3)}.`, `A p above the threshold does not show equality. The interval shows what fits the data: from ${ze('iz_lo', 3)} to ${ze('iz_hi', 3)}.`)),
      a(P(`Der Unterschied von ${zd('iz_diff', 1)} ist klein, denn der p-Wert liegt über der Schwelle`, `The difference of ${ze('iz_diff', 1)} is small, since the p value is above the threshold`),
        P('Der p-Wert misst nicht die Größe eines Unterschieds. Dafür dienen der Unterschied selbst und sein Intervall.', 'The p value does not measure the size of a difference. The difference itself and its interval serve for that.'))
    ],
    hilfe: PW, karte: 'gruppen', belege: ['wissen:greenland16-nicht-signifikant', 'wissen:nicht-signifikant-kein-beleg', 'wissen:wasserstein16-p-praezision-effekt', 'Greenland u. a. 2016; Altman und Bland 1995']
  },
  {
    id: 'inf-a-ki-lesen', thema: 'inferenz', fall: 'inf-zahn',
    stamm: P(`Das 95-Prozent-Konfidenzintervall des Unterschieds reicht von ${zd('iz_lo', 3)} bis ${zd('iz_hi', 3)}. Wie ist es zu lesen?`, `The 95 percent confidence interval of the difference runs from ${ze('iz_lo', 3)} to ${ze('iz_hi', 3)}. How is it to be read?`),
    antworten: [
      a(P(`Unterschiede zwischen ${zd('iz_lo', 3)} und ${zd('iz_hi', 3)} sind mit diesen Daten gut vereinbar, andere weniger gut`, `Differences between ${ze('iz_lo', 3)} and ${ze('iz_hi', 3)} are well compatible with these data, others less so`),
        P('Das Intervall zeigt, welche Unterschiede die Daten nicht ausschließen. Seine Breite zeigt die Unsicherheit der Schätzung.', 'The interval shows which differences the data do not rule out. Its width shows the uncertainty of the estimate.'), true),
      a(P(`Mit 95 Prozent Wahrscheinlichkeit liegt der wahre Unterschied zwischen ${zd('iz_lo', 3)} und ${zd('iz_hi', 3)}`, `With 95 percent probability the true difference lies between ${ze('iz_lo', 3)} and ${ze('iz_hi', 3)}`),
        P('Die 95 Prozent gehören zum Verfahren: Auf lange Sicht enthalten 95 von 100 der so berechneten Intervalle den wahren Wert. Das einzelne Intervall enthält ihn oder enthält ihn nicht.', 'The 95 percent belong to the procedure: in the long run 95 of 100 intervals computed this way contain the true value. A single interval either contains it or does not.')),
      a(P(`Zwei einzelne Tiere aus beiden Gaben unterscheiden sich in 95 von 100 Fällen um ${zd('iz_lo', 3)} bis ${zd('iz_hi', 3)}`, `Two single animals from the two doses differ by ${ze('iz_lo', 3)} to ${ze('iz_hi', 3)} in 95 of 100 cases`),
        P('Das Intervall gilt für den Unterschied der Mittelwerte, nicht für einzelne Tiere. Wie die Tiere streuen, zeigt die Standardabweichung.', 'The interval applies to the difference of the means, not to single animals. How the animals vary is shown by the standard deviation.'))
    ],
    hilfe: [...KI, 'standardabweichung'], karte: 'gruppen', probieren: 'kennzahlen', belege: ['wissen:ki-deutung-verfahren', 'wissen:greenland16-ki-ueberdeckung', 'wissen:ki-fehldeutungen-greenland', 'Greenland u. a. 2016']
  },
  {
    id: 'inf-a-ki-null', thema: 'inferenz', fall: 'inf-zahn',
    stamm: P(`Das 95-Prozent-Konfidenzintervall schließt den Wert 0 ein. Welcher Schluss gilt für den zweiseitigen Test zum Niveau ${zd('regel_sig')}?`, `The 95 percent confidence interval includes the value 0. Which conclusion holds for the two-sided test at level ${ze('regel_sig')}?`),
    antworten: [
      a(P(`Der Test fällt nicht signifikant aus, was zu p = ${zd('iz_p', 3)} passt`, `The test is not significant, which fits p = ${ze('iz_p', 3)}`),
        P('Intervall und Test hängen zusammen: Liegt die 0 im 95-Prozent-Konfidenzintervall, ist der zweiseitige Test zum Niveau 0,05 nicht signifikant.', 'Interval and test belong together: if 0 lies in the 95 percent confidence interval, the two-sided test at level 0.05 is not significant.'), true),
      a(P('Der Test fällt signifikant aus, denn die 0 gehört zu den möglichen Werten', 'The test is significant, since 0 is one of the possible values'),
        P('Es ist umgekehrt: Wer die 0 im Intervall findet, kann sie nicht ausschließen, also fehlt die Signifikanz.', 'It is the other way round: if 0 is in the interval it cannot be ruled out, so significance is missing.')),
      a(P('Der wahre Unterschied beträgt 0, denn das Intervall enthält diesen Wert', 'The true difference is 0, since the interval contains this value'),
        P(`Die 0 ist ein Wert unter vielen im Intervall, auch ${zd('iz_hi', 3)} und ${zd('iz_lo', 3)} gehören dazu. Das Intervall zeigt keinen einzelnen wahren Wert.`, `0 is one value among many in the interval, ${ze('iz_hi', 3)} and ${ze('iz_lo', 3)} belong to it too. The interval does not show a single true value.`))
    ],
    hilfe: [...KI, ...PW], karte: 'gruppen', belege: ['wissen:ki-test-dualitaet', 'wissen:greenland16-ki-ueberdeckung', 'Greenland u. a. 2016']
  },
  {
    id: 'inf-a-ki-99', thema: 'inferenz', fall: 'inf-zahn',
    stamm: P('Warum ist das 99-Prozent-Konfidenzintervall breiter als das 95-Prozent-Konfidenzintervall?', 'Why is the 99 percent confidence interval wider than the 95 percent confidence interval?'),
    antworten: [
      a(P('Wer den wahren Wert sicherer einfangen will, braucht bei gleichen Daten mehr Spielraum', 'Whoever wants to catch the true value more surely needs more room with the same data'),
        P(`Das Niveau gehört zum Verfahren. Mehr Sicherheit kostet Genauigkeit: Die Breite steigt von ${zd('iz_w95', 3)} auf ${zd('iz_w99', 3)}.`, `The level belongs to the procedure. More confidence costs precision: the width rises from ${ze('iz_w95', 3)} to ${ze('iz_w99', 3)}.`), true),
      a(P('Das 99-Prozent-Konfidenzintervall wird aus mehr Tieren berechnet und fällt deshalb breiter aus', 'The 99 percent confidence interval is computed from more animals and therefore turns out wider'),
        P(`Beide Intervalle stammen aus denselben ${zn('rz_n')} Tieren. Nur das Niveau ist verschieden.`, `Both intervals come from the same ${zn('rz_n')} animals. Only the level differs.`)),
      a(P('Ein breiteres Intervall ist die genauere Schätzung, weil es mehr mögliche Werte erfasst', 'A wider interval is the more precise estimate, because it covers more possible values'),
        P('Genauer ist ein schmales Intervall. Ein breites lässt mehr Unterschiede zu.', 'A narrow interval is more precise. A wide one allows more differences.'))
    ],
    hilfe: KI, probieren: 'kennzahlen', belege: ['wissen:ki-breite-einflussgroessen', 'wissen:ki-allgemeine-form', 'Greenland u. a. 2016']
  },
  {
    id: 'inf-a-se-sd', thema: 'inferenz', fall: 'inf-zahn',
    stamm: P('Die Studie wird mit gleichartigen Tieren wiederholt, aber mit viermal so vielen Tieren je Gruppe. Welche Zahl der ersten Tabelle wird dann deutlich kleiner?', 'The study is repeated with similar animals, but with four times as many animals per group. Which figure of the first table then becomes clearly smaller?'),
    antworten: [
      a(P('Der Standardfehler, die Standardabweichung bleibt ungefähr gleich', 'The standard error, while the standard deviation stays about the same'),
        P('Der Standardfehler ist die Standardabweichung geteilt durch die Wurzel der Tierzahl. Bei viermal so vielen Tieren halbiert er sich etwa.', 'The standard error is the standard deviation divided by the square root of the number of animals. With four times as many animals it is roughly halved.'), true),
      a(P('Die Standardabweichung, denn mehr Tiere machen die Streuung kleiner', 'The standard deviation, since more animals make the spread smaller'),
        P('Die Streuung der Tiere hängt nicht von der Zahl der Tiere ab. Mehr Tiere schätzen sie nur genauer.', 'The spread of the animals does not depend on how many animals there are. More animals only estimate it more precisely.')),
      a(P('Beide Zahlen, denn mehr Tiere machen diese Zahlen genauer', 'Both figures, since more animals make these figures more precise'),
        P(`Nur der Standardfehler gehört zur Genauigkeit des Mittelwerts. Die Standardabweichung bleibt bei etwa ${zd('iz_sp', 1)}.`, `Only the standard error relates to the precision of the mean. The standard deviation stays around ${ze('iz_sp', 1)}.`))
    ],
    hilfe: ['standardfehler', 'standardabweichung'], probieren: 'kennzahlen', belege: ['wissen:altman05-sd-versus-se', 'wissen:standardfehler-mittelwert', 'Altman und Bland 2005']
  },
  {
    id: 'inf-a-plusminus', thema: 'inferenz', fall: 'inf-zahn',
    stamm: P(`Ein Bericht schreibt für OJ „${zd('iz_m_oj', 3)} ± ${zd('iz_se_oj', 3)}“, ohne weitere Angabe. Was fehlt?`, `A report writes „${ze('iz_m_oj', 3)} ± ${ze('iz_se_oj', 3)}“ for OJ, with no further information. What is missing?`),
    antworten: [
      a(P('Ob die Zahl nach dem ± Standardfehler, Standardabweichung oder halbe Intervallbreite ist', 'Whether the figure after the ± is a standard error, a standard deviation or a half interval width'),
        P(`Mehrere Schreibweisen kommen vor und bedeuten Verschiedenes. Hier ist ${zd('iz_se_oj', 3)} der Standardfehler (erste Tabelle).`, `Several notations occur and mean different things. Here ${ze('iz_se_oj', 3)} is the standard error (first table).`), true),
      a(P('Nichts, denn das ± steht in der Statistik für die Standardabweichung der Messwerte', 'Nothing, since the ± stands for the standard deviation of the measured values in published statistics'),
        P('Die Schreibweise ist nicht festgelegt. Auch der Standardfehler wird nach dem ± genannt.', 'The notation is not fixed. The standard error is also given after the ±.')),
      a(P('Die Angabe genügt, denn nach dem ± steht in der Statistik das 95-Prozent-Konfidenzintervall der Schätzung', 'The statement suffices, since in published statistics the ± is followed by the 95 percent confidence interval of the estimate'),
        P('Auch eine halbe Intervallbreite wird manchmal so geschrieben. Ohne Angabe bleibt offen, welche Größe gemeint ist.', 'A half interval width is sometimes written this way too. Without a statement it stays open which quantity is meant.'))
    ],
    hilfe: ['standardfehler', 'standardabweichung'], belege: ['wissen:altman05-plusminus-schreibweise', 'Altman und Bland 2005']
  },
  {
    id: 'inf-a-effekt-d', thema: 'inferenz', fall: 'inf-zahn',
    stamm: P(`Der Unterschied von ${zd('iz_diff', 1)} geteilt durch die gemeinsame Standardabweichung ${zd('iz_sp')} ergibt d = ${zd('iz_d', 2)}. Wie ist d zu lesen?`,
      `The difference of ${ze('iz_diff', 1)} divided by the pooled standard deviation ${ze('iz_sp')} gives d = ${ze('iz_d', 2)}. How is d to be read?`),
    antworten: [
      a(P('Die Gruppenmittel liegen rund eine halbe Standardabweichung auseinander', 'The group means are about half a standard deviation apart'),
        P('d misst den Unterschied in Einheiten der Streuung und hängt nicht von der Maßeinheit ab. Wie sicher der Unterschied ist, sagt d nicht.', 'd measures the difference in units of the spread and does not depend on the unit of measurement. How certain the difference is, d does not say.'), true),
      a(P(`OJ erreicht bei etwa ${zp('iz_d')} Prozent der Tiere höhere Werte als VC`, `OJ reaches higher values than VC in about ${zp('iz_d')} percent of the animals`),
        P('d ist kein Anteil von Tieren. Wie oft OJ über VC liegt, ist eine andere Rechnung.', 'd is not a share of animals. How often OJ lies above VC is a different calculation.')),
      a(P(`Der Unterschied ist mit einer Wahrscheinlichkeit von etwa ${zp('iz_d')} Prozent echt`, `The difference is real with a probability of about ${zp('iz_d')} percent`),
        P('d ist keine Wahrscheinlichkeit. Wie sicher ein Unterschied ist, zeigen Intervall und p-Wert.', 'd is not a probability. How certain a difference is, is shown by the interval and the p value.'))
    ],
    hilfe: ['effektstaerke'], karte: 'gruppen', probieren: 'effekt', belege: ['wissen:effekt-d-definition', 'wissen:nakagawa07-effekt-und-ki', 'Cohen 1992; Nakagawa und Cuthill 2007']
  },
  // ---- Fall B: Planung, Teststärke ----
  {
    id: 'inf-b-lesen', thema: 'inferenz', fall: 'inf-power',
    stamm: P(`Bei 30 Tieren je Gruppe zeigt die Tabelle eine Teststärke von ${zd('ip_pow30', 3)}. Wie ist das zu lesen?`, `With 30 animals per group the table shows a power of ${ze('ip_pow30', 3)}. How is that to be read?`),
    antworten: [
      a(P(`Besteht dieser Unterschied, erkennen etwa ${zp('ip_pow30')} von 100 gleichartigen Studien ihn als signifikant`, `If this difference exists, about ${zp('ip_pow30')} of 100 similar studies find it significant`),
        P('Die Teststärke gehört zur Planung: Sie gilt für einen angenommenen Unterschied und gibt die Chance an, ihn zu finden.', 'Power belongs to planning: it holds for an assumed difference and gives the chance of finding it.'), true),
      a(P(`Mit einer Wahrscheinlichkeit von etwa ${zp('ip_pow30')} Prozent besteht der Unterschied wirklich`, `With a probability of about ${zp('ip_pow30')} percent the difference really exists`),
        P('Die Teststärke sagt nichts darüber, ob der Unterschied besteht. Sie setzt ihn voraus.', 'Power says nothing about whether the difference exists. It presupposes it.')),
      a(P(`Mit einer Wahrscheinlichkeit von etwa ${zp('ip_pow30')} Prozent irrt man, wenn man ein Ergebnis für signifikant hält`, `With a probability of about ${zp('ip_pow30')} percent one errs when one takes a result to be significant`),
        P(`Das Risiko, einen nicht vorhandenen Unterschied für signifikant zu halten, legt das Niveau fest, hier ${zd('regel_sig')}.`, `The risk of taking a non-existent difference to be significant is set by the level, here ${ze('regel_sig')}.`))
    ],
    hilfe: ['teststaerke', 'power'], probieren: 'kennzahlen', belege: ['wissen:power-definition', 'wissen:greenland16-power-pruefen', 'wissen:cohen92-power-konvention', 'Cohen 1992; Greenland u. a. 2016']
  },
  {
    id: 'inf-b-aendern', thema: 'inferenz', fall: 'inf-power',
    stamm: P('Welche Änderung erhöht die Teststärke bei sonst gleichen Annahmen?', 'Which change raises the power with all other assumptions unchanged?'),
    antworten: [
      a(P('Mehr Tiere je Gruppe, bei gleichem Unterschied und gleicher Streuung', 'More animals per group, with the same difference and the same spread'),
        P(`Mit 60 statt 30 Tieren steigt die Teststärke von ${zd('ip_pow30', 3)} auf ${zd('ip_pow60', 3)}. Mehr Tiere machen die Schätzung genauer.`, `With 60 instead of 30 animals the power rises from ${ze('ip_pow30', 3)} to ${ze('ip_pow60', 3)}. More animals make the estimate more precise.`), true),
      a(P(`Ein strengeres Niveau von ${zd('regel_sig_streng')} statt ${zd('regel_sig')}, bei gleicher Tierzahl und Streuung`, `A stricter level of ${ze('regel_sig_streng')} instead of ${ze('regel_sig')}, with the same number of animals`),
        P(`Ein strengeres Niveau senkt die Teststärke: Bei 30 Tieren fällt sie von ${zd('ip_pow30', 3)} auf ${zd('ip_pow30_01', 3)}.`, `A stricter level lowers the power: with 30 animals it falls from ${ze('ip_pow30', 3)} to ${ze('ip_pow30_01', 3)}.`)),
      a(P('Eine größere Streuung der Zahnlängen, bei gleicher Tierzahl und gleichem Niveau', 'A larger spread of the tooth lengths, with the same number of animals'),
        P('Mehr Streuung verdeckt den Unterschied und senkt die Teststärke.', 'More spread hides the difference and lowers the power.'))
    ],
    hilfe: ['teststaerke', 'power'], probieren: 'kennzahlen', belege: ['wissen:power-einflussgroessen', 'wissen:power-vier-groessen', 'Bortz und Schuster; Cohen 1992']
  },
  {
    id: 'inf-b-n80', thema: 'inferenz', fall: 'inf-power',
    stamm: P(`Angenommen, eine Wiederholung soll eine Teststärke von ${zd('regel_power')} bei Niveau ${zd('regel_sig')} haben. Wie viele Tiere je Gruppe sind für diesen Unterschied und diese Streuung nötig, verglichen mit den 30 Tieren der Tabelle?`,
      `Assume a repeat is to have a power of ${ze('regel_power')} at level ${ze('regel_sig')}. How many animals per group does this difference and this spread require, compared with the 30 animals of the table?`),
    antworten: [
      a(P(`Etwa ${zn('ip_n80')} je Gruppe, mehr als doppelt so viele wie die 30`, `About ${zn('ip_n80')} per group, more than twice the 30`),
        P(`Die Tabelle zeigt es: Bei ${zn('ip_n80')} Tieren je Gruppe liegt die Teststärke bei ${zd('ip_pow_n80', 3)}, bei 60 erst bei ${zd('ip_pow60', 3)}.`, `The table shows it: with ${zn('ip_n80')} animals per group the power is ${ze('ip_pow_n80', 3)}, with 60 only ${ze('ip_pow60', 3)}.`), true),
      a(P(`Etwas mehr als 30, denn der Weg von ${zd('ip_pow30', 2)} auf ${zd('regel_power', 2)} ist kurz`, `Somewhat more than 30, since the way from ${ze('ip_pow30', 2)} to ${ze('regel_power', 2)} is short`),
        P(`Mit 30 Tieren sind es ${zd('ip_pow30', 3)}, mit 60 erst ${zd('ip_pow60', 3)}. Die Teststärke ${zd('regel_power', 2)} wird erst bei ${zn('ip_n80')} erreicht.`, `With 30 animals it is ${ze('ip_pow30', 3)}, with 60 only ${ze('ip_pow60', 3)}. A power of ${ze('regel_power', 2)} is reached only at ${zn('ip_n80')}.`)),
      a(P('Gleich viele wie die 30, denn die Teststärke hängt vom Unterschied ab', 'The same number as the 30, since power depends on the difference'),
        P('Die Teststärke hängt von vier Größen ab: Niveau, Unterschied, Streuung und Tierzahl. Drei davon bestimmen die vierte.', 'Power depends on four quantities: level, difference, spread and number of animals. Three of them determine the fourth.'))
    ],
    hilfe: ['teststaerke', 'power', 'fallzahl-ergaenzen'], karte: 'gruppen', probieren: 'kennzahlen', belege: ['wissen:power-vier-groessen', 'wissen:ziel-power-80-90', 'wissen:cohen92-power-konvention', 'Cohen 1992']
  },
  // ---- Fall C: Dosen, Genauigkeit ----
  {
    id: 'inf-c-genau', thema: 'inferenz', fall: 'inf-dosis',
    stamm: P('Bei welcher Dosis ist der Unterschied am genauesten geschätzt?', 'At which dose is the difference estimated most precisely?'),
    antworten: [
      a(P(`Bei Dosis 1, denn dort ist das Intervall mit ${zd('id_w2', 3)} am schmalsten`, `At dose 1, since the interval there is narrowest at ${ze('id_w2', 3)}`),
        P(`Die Genauigkeit zeigt die Breite des Intervalls. Die Breiten sind ${zd('id_w1', 3)}, ${zd('id_w2', 3)} und ${zd('id_w3', 3)}.`, `Precision is shown by the width of the interval. The widths are ${ze('id_w1', 3)}, ${ze('id_w2', 3)} and ${ze('id_w3', 3)}.`), true),
      a(P('Bei Dosis 2, denn dort schließt das Intervall die 0 ein', 'At dose 2, since the interval there includes 0'),
        P(`Ob die 0 im Intervall liegt, sagt nichts über die Genauigkeit. Bei Dosis 2 ist das Intervall mit ${zd('id_w3', 3)} sogar am breitesten.`, `Whether 0 lies in the interval says nothing about precision. At dose 2 the interval is even the widest at ${ze('id_w3', 3)}.`)),
      a(P('Bei Dosis 0,5 und 1 gleich, denn beide Intervalle schließen die 0 aus', 'At doses 0.5 and 1 equally, since both intervals exclude 0'),
        P(`Beide schließen die 0 aus, aber ihre Breiten ${zd('id_w1', 3)} und ${zd('id_w2', 3)} unterscheiden sich. Genauer ist das schmalere.`, `Both exclude 0, but their widths ${ze('id_w1', 3)} and ${ze('id_w2', 3)} differ. The narrower one is more precise.`))
    ],
    hilfe: KI, belege: ['wissen:greenland16-ki-praezision', 'wissen:ki-breite-einflussgroessen', 'Greenland u. a. 2016']
  },
  {
    id: 'inf-c-dosis2', thema: 'inferenz', fall: 'inf-dosis',
    stamm: P(`Bei Dosis 2 reicht das Intervall von ${zd('id_lo3', 3)} bis ${zd('id_hi3', 3)}. Wie ist das zu lesen?`, `At dose 2 the interval runs from ${ze('id_lo3', 3)} to ${ze('id_hi3', 3)}. How is that to be read?`),
    antworten: [
      a(P('Ein Vorteil für VC ebenso wie für OJ passt zu diesen Daten', 'Differences from an advantage for VC to an advantage for OJ fit the data'),
        P('Die Daten legen den Unterschied hier nicht eng fest. Für „gleich“ bräuchte es ein schmales Intervall um die 0.', 'The data do not pin the difference down closely here. A claim of „equal“ would need a narrow interval around 0.'), true),
      a(P('Die Gaben wirken bei Dosis 2 gleich, denn das Intervall enthält die 0', 'The doses work alike at dose 2, since the interval contains 0'),
        P('Die 0 ist ein möglicher Wert, aber nicht der einzige. Ein Beleg für „gleich“ ist das nicht.', '0 is a possible value, but not the only one. That is no evidence of „equal“.')),
      a(P('Bei 95 Prozent der Tiere liegt der Unterschied der Gaben in diesem Bereich', 'For 95 percent of the animals the difference between the doses lies in this range'),
        P('Das Intervall gilt für den Unterschied der Mittelwerte. Wie die Tiere einzeln streuen, zeigt es nicht.', 'The interval applies to the difference of the means. It does not show how the animals vary individually.'))
    ],
    hilfe: KI, belege: ['wissen:greenland16-nicht-signifikant', 'wissen:greenland16-ki-ueberdeckung', 'Greenland u. a. 2016']
  },
  {
    id: 'inf-c-widerspruch', thema: 'inferenz', fall: 'inf-dosis',
    stamm: P(`Bei Dosis 1 ist p = ${zd('id_p2', 3)}, bei Dosis 2 ist p = ${zd('id_p3', 3)}. Was folgt daraus?`, `At dose 1 p = ${ze('id_p2', 3)}, at dose 2 p = ${ze('id_p3', 3)}. What follows from that?`),
    antworten: [
      a(P('Ob der Unterschied je nach Dosis verschieden ist, zeigen die p-Werte nicht', 'Whether the difference varies by dose is not shown by the p values'),
        P(`Dafür müssten die Unterschiede der Dosen (${zd('id_d2', 3)} und ${zd('id_d3', 3)}) mit eigenem Intervall verglichen werden.`, `For that the differences of the doses (${ze('id_d2', 3)} and ${ze('id_d3', 3)}) would have to be compared with an interval of their own.`), true),
      a(P('Die Gaben wirken bei Dosis 2 gleich und bei Dosis 1 verschieden, wie die p-Werte zeigen', 'The doses work alike at dose 2 and differently at dose 1, as the p values show'),
        P(`Ein großes p belegt keinen Gleichstand; das Intervall bei Dosis 2 reicht von ${zd('id_lo3', 3)} bis ${zd('id_hi3', 3)}.`, `A large p does not show equality; the interval at dose 2 runs from ${ze('id_lo3', 3)} to ${ze('id_hi3', 3)}.`)),
      a(P(`Die Dosen widersprechen sich, weil ihre p-Werte auf verschiedenen Seiten von ${zd('regel_sig')} liegen`, `The doses contradict each other, because their p values lie on different sides of ${ze('regel_sig')}`),
        P('Liegen zwei p-Werte auf verschiedenen Seiten der Schwelle, folgt daraus kein Widerspruch der Ergebnisse.', 'If two p values lie on different sides of the threshold, no contradiction between the results follows.'))
    ],
    hilfe: PW, belege: ['wissen:greenland16-p-vergleich-studien', 'wissen:greenland16-nicht-signifikant', 'Greenland u. a. 2016']
  },
  // ---- Fall D: Pflanzen, überlappende Intervalle ----
  {
    id: 'inf-d-ueberlappung', thema: 'inferenz', fall: 'inf-pflanze',
    stamm: P(`Angenommen, ein Ergebnis gilt als signifikant, wenn p kleiner als ${zd('regel_sig')} ist. Die 95-Prozent-Konfidenzintervalle von ctrl und trt2 überlappen sich. Was folgt für den Vergleich dieser beiden Gruppen?`, `Assume a result counts as significant if p is below ${ze('regel_sig')}. The 95 percent confidence intervals of ctrl and trt2 overlap. What follows for the comparison of these two groups?`),
    antworten: [
      a(P(`Daraus allein folgt nichts; der Test selbst entscheidet, und er ergibt hier p = ${zd('ipf_p', 3)}`, `Nothing follows alone; the test decides, and here it gives p = ${ze('ipf_p', 3)}`),
        P('Zwei Intervalle können sich überlappen, obwohl der Unterschied signifikant ist. Das Intervall des Unterschieds reicht hier von 0,005 bis 0,983 und schließt die 0 aus.', 'Two intervals can overlap although the difference is significant. The interval of the difference here runs from 0.005 to 0.983 and excludes 0.'), true),
      a(P('Der Unterschied ist nicht signifikant, denn sich überlappende Intervalle zeigen das an', 'The difference is not significant, since overlapping intervals indicate that'),
        P('Aus einer Überlappung folgt kein fehlender Unterschied. Der Test des Unterschieds nutzt dessen eigenen Standardfehler.', 'Overlap does not imply a missing difference. The test of the difference uses its own standard error.')),
      a(P('Beide Gruppen stammen aus derselben Grundgesamtheit, denn die Intervalle überlappen sich', 'Both groups come from the same population, since the intervals overlap'),
        P('Ob zwei Gruppen aus derselben Grundgesamtheit stammen, lässt sich so nicht zeigen. Überlappung ist kein Test.', 'Whether two groups come from the same population cannot be shown this way. Overlap is not a test.'))
    ],
    hilfe: [...KI, ...PW], karte: 'gruppen', belege: ['wissen:belia-ueberlappung-95ki', 'wissen:fehlerbalken-ueberlappung', 'Belia u. a. 2005']
  },
  {
    id: 'inf-d-se-balken', thema: 'inferenz', fall: 'inf-pflanze',
    stamm: P('In einer Grafik stehen an den Mittelwerten Balken von plus und minus einem Standardfehler. Was zeigen sie im Vergleich zum 95-Prozent-Konfidenzintervall?', 'In a chart the means carry bars of plus and minus one standard error. What do they show compared with the 95 percent confidence interval?'),
    antworten: [
      a(P('Sie sind etwa halb so breit und entsprechen etwa einem 68-Prozent-Konfidenzintervall', 'They are about half as wide, like a 68 percent confidence interval'),
        P(`Ein 95-Prozent-Konfidenzintervall reicht etwa zwei Standardfehler nach beiden Seiten. Bei ctrl ist der Standardfehler ${zd('ipf_se_c', 3)}, das Intervall reicht von ${zd('ipf_lo_c', 3)} bis ${zd('ipf_hi_c', 3)}.`, `A 95 percent confidence interval reaches about two standard errors to both sides. For ctrl the standard error is ${ze('ipf_se_c', 3)}, the interval runs from ${ze('ipf_lo_c', 3)} to ${ze('ipf_hi_c', 3)}.`), true),
      a(P('Sie zeigen das 95-Prozent-Konfidenzintervall in kürzerer Schreibweise', 'They show the 95 percent confidence interval in shorter notation'),
        P('Ein Standardfehler-Balken ist deutlich schmaler. Wer ihn als 95-Prozent-Konfidenzintervall liest, überschätzt die Sicherheit.', 'A standard error bar is clearly narrower. Reading it as a 95 percent confidence interval overstates the certainty.')),
      a(P('Sie zeigen den Bereich, in dem etwa 68 Prozent der einzelnen Pflanzen liegen', 'They show the range in which about 68 percent of the individual plants lie'),
        P('Der Standardfehler beschreibt die Genauigkeit des Mittelwerts, nicht die Streuung einzelner Pflanzen. Die Streuung zeigt die Standardabweichung.', 'The standard error describes the precision of the mean, not the spread of single plants. The spread is shown by the standard deviation.'))
    ],
    hilfe: ['standardfehler', ...KI], belege: ['wissen:belia-se-balken', 'wissen:altman05-sd-versus-se', 'Belia u. a. 2005; Altman und Bland 2005']
  },
  // ---- Einzelfragen ----
  {
    id: 'inf-beben', thema: 'inferenz',
    stamm: P(`Bei ${zn('iq_n')} Beben nahe Fidschi hängt die Stärke mit der Tiefe zusammen (r = ${zd('iq_r', 3)}, p kleiner als 0,001). Welche Aussage ist gedeckt?`,
      `For ${zn('iq_n')} earthquakes near Fiji the magnitude is related to the depth (r = ${ze('iq_r', 3)}, p below 0.001). Which statement is supported?`),
    tabelle: tab('inf-beben', [P('n', 'n'), P('r', 'r'), P('r²', 'r²'), P('Sig.', 'Sig.'), P('95-%-Intervall unten', '95% interval lower'), P('95-%-Intervall oben', '95% interval upper')], QUELLE_BEBEN, P('Korrelation von Tiefe und Stärke', 'Correlation of depth and magnitude')),
    antworten: [
      a(P('Deutlich von null verschieden, aber schwach: nur etwa 5 Prozent der Streuung gemeinsam', 'Clearly different from zero, but weak: only about 5 percent of the variation is shared'),
        P(`Das Quadrat ${zd('iq_r2', 3)} zeigt den gemeinsamen Anteil. Bei ${zn('iq_n')} Beben wird schon ein schwacher Zusammenhang signifikant.`, `The square ${ze('iq_r2', 3)} shows the shared share. With ${zn('iq_n')} earthquakes even a weak relation becomes significant.`), true),
      a(P('Der Zusammenhang ist stark, denn der p-Wert ist so klein, dass er unter 0,001 liegt', 'The relation is strong, since the p value is so small that it lies below 0.001'),
        P('Der p-Wert misst die Größe eines Zusammenhangs nicht. Bei großen Stichproben wird auch ein schwacher Zusammenhang signifikant.', 'The p value does not measure the size of a relation. With large samples a weak relation becomes significant too.')),
      a(P('Die Tiefe bestimmt die Stärke der Beben, denn der Zusammenhang ist deutlich von null verschieden', 'Depth determines the magnitude of the earthquakes, since the relation is clearly different from zero'),
        P('Ein Zusammenhang zeigt nicht, welche Größe auf welche wirkt. Dass die Tiefe die Stärke bestimmt, ist damit nicht gezeigt.', 'A relation does not show which quantity acts on which. That depth determines magnitude is not shown by it.'))
    ],
    hilfe: [...PW, 'korrelation'], karte: 'zusammenhang', belege: ['wissen:grosse-stichprobe-kleiner-unterschied', 'wissen:greenland16-signifikant-wichtig', 'wissen:r-nicht-aequidistant', 'Greenland u. a. 2016']
  },
  {
    id: 'inf-wiederholung', thema: 'inferenz',
    stamm: P(`Angenommen, p unter ${zd('regel_sig')} gilt als signifikant. Eine Studie ergibt p = ${zd('regel_p_beispiel')}. Was folgt für eine genaue Wiederholung der Studie?`, `Assume p below ${ze('regel_sig')} counts as significant. A study gives p = ${ze('regel_p_beispiel')}. What follows for an exact repetition of the study?`),
    antworten: [
      a(P('Ob die Wiederholung wieder signifikant ausfällt, hängt von der Teststärke ab', 'Whether the repeat is significant again depends on the power'),
        P('Der p-Wert beschreibt eine Stichprobe, nicht die nächste. Selbst bei zutreffender Schätzung kann die Wiederholung deutlich anders ausfallen.', 'The p value describes one sample, not the next. Even with an accurate estimate the repetition can turn out quite differently.'), true),
      a(P('Mit 97 Prozent Wahrscheinlichkeit fällt die Wiederholung wieder signifikant aus', 'With 97 percent probability the repetition is significant again'),
        P('1 minus p ist keine Wahrscheinlichkeit für eine erfolgreiche Wiederholung. Bei mittlerer Teststärke gelingt sie oft nicht.', '1 minus p is not a probability of a successful repetition. With moderate power it often fails.')),
      a(P(`Die Wiederholung ergibt mit hoher Wahrscheinlichkeit wieder einen p-Wert nahe ${zd('regel_p_beispiel')}`, `The repetition very probably gives a p value close to ${ze('regel_p_beispiel')} again`),
        P('p-Werte schwanken von Stichprobe zu Stichprobe merklich, auch wenn der wahre Effekt gleich bleibt.', 'p values vary noticeably from sample to sample, even when the true effect stays the same.'))
    ],
    hilfe: PW, belege: ['wissen:greenland16-p-replikation', 'wissen:cohen94-replikation', 'wissen:button13-replikation-power', 'Greenland u. a. 2016; Cohen 1994']
  },
  {
    id: 'inf-einseitig', thema: 'inferenz',
    stamm: P(`Der zweiseitige Test beim Zahnlängen-Vergleich ergab p = ${zd('iz_p', 3)}. Danach wird auf einen einseitigen Test umgestellt (p = ${zd('iz_p_ein', 3)}). Wie ist das zu werten?`,
      `The two-sided test in the tooth length comparison gave p = ${ze('iz_p', 3)}. Afterwards it is switched to a one-sided test (p = ${ze('iz_p_ein', 3)}). How is that to be judged?`),
    antworten: [
      a(P('Die Richtung gehört vor die Auswertung, sonst folgt der Test dem Ergebnis', 'The direction belongs before the analysis, or the test adapts to the result'),
        P('Wer erst nach dem Blick auf die Daten die Richtung wählt, halbiert den p-Wert ohne neue Information. Das verzerrt die Fehlerrate.', 'Anyone who picks the direction only after looking at the data halves the p value without new information. That distorts the error rate.'), true),
      a(P('Das ist zulässig, denn die Daten zeigen schon, dass OJ die größeren Werte liefert', 'That is permissible, since the data already show that OJ gives the larger values'),
        P('Die Richtung muss vorher aus der Fragestellung folgen, nicht aus dem Ergebnis.', 'The direction has to follow from the question beforehand, not from the result.')),
      a(P('Die Umstellung ist sinnvoll, denn ein einseitiger Test ist die strengere Prüfung von beiden', 'Switching makes sense, since a one-sided test is the stricter of the two checks'),
        P('Der einseitige Test ist in seiner Richtung die großzügigere Prüfung: Er verwirft früher, nicht später.', 'In its direction the one-sided test is the more lenient check: it rejects sooner, not later.'))
    ],
    hilfe: PW, belege: ['wissen:alpha-vorab-festlegen', 'wissen:einseitig-zweiseitig-pruefgroesse', 'wissen:wasserstein16-selektives-berichten', 'Wasserstein und Lazar 2016']
  },
  {
    id: 'inf-p-modell', thema: 'inferenz',
    stamm: P('Was zeigt ein sehr kleiner p-Wert?', 'What does a very small p value show?'),
    antworten: [
      a(P('Die Daten passen schlecht zum Rechenmodell, zur Nullhypothese oder einer Annahme', 'The data fit the calculation model poorly, the null hypothesis or an assumption'),
        P('Der p-Wert wird unter allen Annahmen des Modells berechnet: Nullhypothese, Zufallsauswahl, Unabhängigkeit, Messung. Jede kann ihn klein machen.', 'The p value is computed under all assumptions of the model: null hypothesis, random sampling, independence, measurement. Any of them can make it small.'), true),
      a(P('Die Nullhypothese ist falsch, die übrigen Annahmen des Modells stehen dabei fest', 'The null hypothesis is false, the other assumptions of the model being settled'),
        P('Auch Annahmen wie Unabhängigkeit der Beobachtungen oder zufällige Auswahl können verletzt sein.', 'Assumptions such as independence of the observations or random selection can be violated too.')),
      a(P('Der gefundene Effekt ist groß und für die Praxis wichtig, weil der Test klar ausfällt', 'The effect found is large and important in practice, because the test is clear-cut'),
        P('Ein kleiner p-Wert sagt nichts über die Größe oder Wichtigkeit eines Effekts.', 'A small p value says nothing about the size or importance of an effect.'))
    ],
    hilfe: PW, belege: ['wissen:wasserstein16-kleines-p-modell', 'wissen:greenland16-p-ganzes-modell', 'wissen:greenland16-signifikant-wichtig', 'Wasserstein und Lazar 2016; Greenland u. a. 2016']
  },
  {
    id: 'inf-alpha-p', thema: 'inferenz',
    stamm: P('Was unterscheidet das Signifikanzniveau vom p-Wert?', 'What distinguishes the significance level from the p value?'),
    antworten: [
      a(P('Das Niveau steht vor der Auswertung fest, der p-Wert ergibt sich aus den Daten', 'The level is set before the analysis, the p value results from the data'),
        P('Das Niveau (zum Beispiel 0,05) ist Teil des Plans. Der p-Wert ist das Ergebnis der Rechnung und wird mit ihm verglichen.', 'The level (for example 0.05) is part of the plan. The p value is the result of the calculation and is compared with it.'), true),
      a(P('Das Niveau ergibt sich aus den Daten, der p-Wert wird vor der Auswertung festgelegt', 'The level results from the data, the p value is set before the analysis'),
        P('Es ist umgekehrt. Ein Niveau, das sich nach den Daten richtet, verliert seine Bedeutung.', 'It is the other way round. A level that follows the data loses its meaning.')),
      a(P(`Beide sind dieselbe Zahl, das Niveau heißt so, wenn der p-Wert unter ${zd('regel_sig')} liegt`, `Both are the same number, the level is called that when the p value is below ${ze('regel_sig')}`),
        P('Das Niveau ist eine feste Schwelle, der p-Wert eine Rechengröße. Sie fallen nur zufällig zusammen.', 'The level is a fixed threshold, the p value a computed quantity. They coincide only by chance.'))
    ],
    hilfe: PW, belege: ['wissen:greenland16-alpha-vs-p', 'wissen:alpha-vorab-festlegen', 'Greenland u. a. 2016']
  },
  {
    id: 'inf-mehrere-studien', thema: 'inferenz',
    stamm: P(`Fünf kleine Studien zur selben Frage zeigen jeweils p über ${zd('regel_sig')}, die Unterschiede weisen alle in dieselbe Richtung. Was folgt?`,
      `Five small studies on the same question each show p above ${ze('regel_sig')}, the differences all point in the same direction. What follows?`),
    antworten: [
      a(P('Zusammen können sie einen Unterschied belegen, den jede einzeln nicht absichert', 'Together the studies can show a difference that each one alone does not secure'),
        P('Fehlende Signifikanz einer Studie ist kein Gegenbeweis. Gleichgerichtete Schätzungen lassen sich zusammenfassen (Meta-Analyse).', 'A single study lacking significance is no counter-evidence. Estimates pointing the same way can be pooled (meta-analysis).'), true),
      a(P('Die Studien können einen Unterschied widerlegen, denn jede einzelne findet keinen', 'The studies can refute a difference, since each one finds none'),
        P('Aus mehreren nicht signifikanten Ergebnissen folgt kein Beleg für Gleichheit.', 'Several non-significant results do not amount to evidence of equality.')),
      a(P('Die Studien können einander widersprechen, denn keine bestätigt die Ergebnisse der anderen', 'The studies can contradict each other, since none confirms the results of the others'),
        P('Gleiche Richtung der Unterschiede spricht für Übereinstimmung, nicht für Widerspruch.', 'The same direction of the differences points to agreement, not to contradiction.'))
    ],
    hilfe: [...PW, 'frage-meta'], belege: ['wissen:greenland16-mehrere-studien', 'wissen:nicht-signifikant-kein-beleg', 'Greenland u. a. 2016']
  },
  {
    id: 'inf-p-gleich-n', thema: 'inferenz',
    stamm: P(`Studie A mit 20 Personen und Studie B mit 2000 Personen haben beide p = ${zd('regel_p_beispiel')}. Was lässt sich über den standardisierten Effekt d sagen?`,
      `Study A with 20 people and study B with 2000 people both have p = ${ze('regel_p_beispiel')}. What can be said about the standardised effect d?`),
    antworten: [
      a(P('d ist in A größer, denn bei 2000 Personen genügt ein kleiner Effekt', 'd is larger in A, since with 2000 people a small effect is enough'),
        P('Der p-Wert hängt von Effekt und Stichprobengröße ab. Bei gleichem p gehört zu einer größeren Stichprobe ein kleinerer Effekt.', 'The p value depends on effect and sample size. With the same p, a larger sample goes with a smaller effect.'), true),
      a(P('d ist in beiden gleich, weil der p-Wert in beiden Studien gleich ist', 'd is the same in both, because the p value is the same in both studies'),
        P('Gleiche p-Werte sind kein Hinweis auf gleiche Effekte.', 'Equal p values are no sign of equal effects.')),
      a(P('d ist in B größer, denn mehr Personen liefern einen größeren Effekt als wenige', 'd is larger in B, since more people deliver a larger effect than few'),
        P('Mehr Personen machen die Schätzung genauer, den Effekt aber nicht größer.', 'More people make the estimate more precise, but not the effect larger.'))
    ],
    hilfe: [...PW, 'effektstaerke'], probieren: 'effekt', belege: ['wissen:nakagawa07-effekt-und-ki', 'wissen:funder19-p-schwelle-gleich-r', 'wissen:grosse-stichprobe-kleiner-unterschied', 'Nakagawa und Cuthill 2007']
  },
  {
    id: 'inf-fehler2', thema: 'inferenz',
    stamm: P(`Angenommen, die beiden Gaben wirken in Wirklichkeit verschieden. Der Test der Zahnlängen (p = ${zd('iz_p', 3)}, Schwelle ${zd('regel_sig')}) behält die Annahme „kein Unterschied“ trotzdem bei. Wie heißt dieser Irrtum?`,
      `Assume the two doses really work differently. The test of the tooth lengths (p = ${ze('iz_p', 3)}, threshold ${ze('regel_sig')}) still retains the assumption of „no difference“. What is this error called?`),
    antworten: [
      a(P('Fehler 2. Art: ein vorhandener Unterschied wird übersehen', 'Type II error: an existing difference is overlooked'),
        P('Beim Fehler 2. Art bleibt ein echter Unterschied unentdeckt. Seine Wahrscheinlichkeit ist 1 minus Teststärke.', 'With a type II error a real difference stays undetected. Its probability is 1 minus power.'), true),
      a(P('Fehler 1. Art: ein nicht vorhandener Unterschied wird gefunden', 'Type I error: a non-existent difference is found'),
        P('Der Fehler 1. Art würde bedeuten: kein Unterschied in Wirklichkeit, aber ein signifikantes Ergebnis.', 'A type I error would mean: no difference in reality, but a significant result.')),
      a(P('Messfehler: die Zahnlängen wurden zu ungenau erfasst', 'Measurement error: the tooth lengths were recorded too imprecisely'),
        P('Ein Messfehler ist keine Fehlentscheidung des Tests. Gemeint ist der Irrtum bei der Entscheidung.', 'A measurement error is not a wrong decision of the test. What is meant is the error in the decision.'))
    ],
    hilfe: ['teststaerke', 'signifikanz'], belege: ['wissen:fehler-1-und-2-art', 'wissen:power-definition', 'Bortz und Schuster; Cohen 1992']
  },
  {
    id: 'inf-alpha-bedeutung', thema: 'inferenz',
    stamm: P(`Ein Test wird mit dem Niveau ${zd('regel_sig')} durchgeführt. Was sagt dieses Niveau?`, `A test is run at the level ${ze('regel_sig')}. What does this level say?`),
    antworten: [
      a(P('Ohne echten Unterschied fallen etwa 5 von 100 Tests fälschlich signifikant aus', 'With no real difference, about 5 of 100 tests are falsely significant'),
        P('Das Niveau bezieht sich auf Tests bei zutreffender Nullhypothese. Es ist die Rate des Fehlers 1. Art.', 'The level refers to tests when the null hypothesis holds. It is the rate of the type I error.'), true),
      a(P('Von allen signifikanten Ergebnissen sind etwa 5 von 100 in Wirklichkeit falsch', 'Of all significant results, about 5 in 100 are in reality false findings'),
        P('Der Anteil falscher Funde unter den signifikanten Ergebnissen hängt auch von der Teststärke und vom Anteil echter Effekte ab, nicht nur vom Niveau.', 'The share of false findings among significant results also depends on power and on the share of real effects, not on the level alone.')),
      a(P('Ein vorhandener Unterschied wird mit einer Wahrscheinlichkeit von 5 Prozent übersehen', 'An existing difference is overlooked with a probability of about 5 percent'),
        P('Das Übersehen eines vorhandenen Unterschieds ist der Fehler 2. Art. Er hängt von der Teststärke ab, nicht vom Niveau.', 'Overlooking an existing difference is the type II error. It depends on the power, not on the level.'))
    ],
    hilfe: ['signifikanz', 'p-wert'], belege: ['wissen:fehler-1-und-2-art', 'wissen:greenland16-fehlerrate-5-prozent', 'wissen:button13-ppv-formel', 'Greenland u. a. 2016; Button u. a. 2013']
  },
  {
    id: 'inf-fluch', thema: 'inferenz',
    stamm: P('Eine kleine Studie findet ein signifikantes Ergebnis. Was ist über die gefundene Effektgröße zu bedenken?', 'A small study finds a significant result. What should be kept in mind about the effect size found?'),
    antworten: [
      a(P('Signifikante Funde kleiner Studien überschätzen den Effekt oft, da nur große Schätzungen signifikant werden', 'Significant findings of small studies often overestimate the effect, as only large ones qualify'),
        P('Wer nur Ergebnisse über der Schwelle beachtet, sieht von kleinen Studien vor allem die zufällig großen Schätzungen („Fluch des Gewinners“).', 'Anyone who looks only at results beyond the threshold sees, from small studies, mainly the by-chance large estimates („winner\'s curse“).'), true),
      a(P('Die Schätzung ist oft besonders zuverlässig, denn sie hat die Schwelle trotz der kleinen Stichprobe erreicht', 'The estimate is often especially reliable, since it reached the threshold despite the small sample'),
        P('Kleine Studien streuen stark. Das Überschreiten der Schwelle macht eine Schätzung nicht zuverlässiger.', 'Small studies vary a lot. Crossing the threshold does not make an estimate more reliable.')),
      a(P('Die Schätzung liegt oft eher zu niedrig, denn kleine Studien erfassen nur einen Teil des Effekts', 'The estimate is often on the low side, since small studies capture only part of the effect'),
        P('Die Auswahl nach Signifikanz hebt die gefundenen Schätzungen an, sie senkt sie nicht.', 'Selecting by significance raises the estimates found, it does not lower them.'))
    ],
    hilfe: ['teststaerke', 'effektstaerke'], belege: ['wissen:button13-winners-curse', 'wissen:button13-drei-probleme', 'Button u. a. 2013']
  },
  {
    id: 'inf-ki-95', thema: 'inferenz',
    stamm: P('Was bedeutet „95 Prozent“ bei einem Konfidenzintervall?', 'What does „95 percent“ mean for a confidence interval?'),
    antworten: [
      a(P('Bei vielen gleichartigen Studien enthalten etwa 95 von 100 der so berechneten Intervalle den wahren Wert', 'In many similar studies about 95 of 100 such intervals contain the true value'),
        P('Das Niveau beschreibt das Verfahren auf lange Sicht, nicht ein einzelnes Intervall.', 'The level describes the procedure in the long run, not a single interval.'), true),
      a(P('Der wahre Wert liegt mit 95 Prozent Wahrscheinlichkeit in dem Intervall, das hier berechnet wurde', 'The true value lies with 95 percent probability in the interval computed here'),
        P('Das einzelne Intervall enthält den wahren Wert oder enthält ihn nicht. Eine Wahrscheinlichkeit gilt nur für das Verfahren.', 'The single interval either contains the true value or does not. A probability applies only to the procedure.')),
      a(P('Bei einer Wiederholung der Studie liegt der neue Mittelwert mit 95 Prozent Wahrscheinlichkeit im Intervall', 'In a repetition of the study the new mean lies with 95 percent probability in the interval'),
        P('Das 95-Prozent-Niveau sagt nichts darüber, wie oft ein neuer Mittelwert in das Intervall fällt; das ist eine andere Rechnung.', 'The 95 percent level says nothing about how often a new mean falls into the interval; that is a different calculation.'))
    ],
    hilfe: KI, probieren: 'lernlabor', belege: ['wissen:ki-deutung-verfahren', 'wissen:greenland16-ki-ueberdeckung', 'Greenland u. a. 2016']
  },
  // ---- Verfahren wählen ----
  {
    id: 'inf-v-kreuz', thema: 'inferenz',
    stamm: P('In den Titanic-Daten wird für die Erwachsenen gefragt, ob Frauen und Männer unterschiedlich oft überlebten. Welches Verfahren passt?', 'In the Titanic data it is asked for the adults whether women and men survived at different rates. Which procedure fits?'),
    antworten: [
      a(P('Kreuztabelle mit Chi-Quadrat-Test, denn beide Merkmale sind Kategorien', 'Crosstab with chi-square test, since both attributes are categories'),
        P('Beide Merkmale sind Kategorien (Geschlecht, überlebt ja oder nein). Dafür vergleicht die Kreuztabelle Anteile.', 'Both attributes are categories (sex, survived yes or no). A crosstab compares shares for that.'), true),
      a(P('t-Test für zwei unabhängige Stichproben, denn es gibt zwei Gruppen von Reisenden', 'T test for two independent samples, since there are two groups of travellers'),
        P('Der t-Test vergleicht Mittelwerte einer Zahl. Überleben ist eine Kategorie, kein Messwert.', 'The t test compares means of a number. Survival is a category, not a measured value.')),
      a(P('Korrelation nach Pearson, denn die beiden Merkmale hängen miteinander zusammen', 'Pearson correlation, since the two attributes are related to each other'),
        P('Die Korrelation nach Pearson setzt zwei Zahlenmerkmale voraus.', 'The Pearson correlation presupposes two numeric attributes.'))
    ],
    hilfe: ['frage-kreuz', 'chi-quadrat'], karte: 'kreuz', belege: ['wissen:kreuz-chi2-berechnung', 'wissen:t-test-drei-varianten', 'Bortz und Schuster']
  },
  {
    id: 'inf-v-gruppen', thema: 'inferenz',
    stamm: P('Die Gewichte von Pflanzen werden bei einer Kontrolle und zwei Behandlungen verglichen, je 10 Pflanzen. Welches Verfahren passt?', 'The weights of plants are compared in a control and two treatments, 10 plants each. Which procedure fits?'),
    antworten: [
      a(P('Einfaktorielle Varianzanalyse, danach bei Bedarf Paarvergleiche', 'One-way analysis of variance, then pairwise comparisons'),
        P('Mehr als zwei Gruppen und ein Messwert: Die Varianzanalyse prüft alle Gruppen in einem Test.', 'More than two groups and a measured value: the analysis of variance tests all groups in one test.'), true),
      a(P('Drei t-Tests für unabhängige Stichproben, je mit dem Niveau 0,05', 'Three t tests for independent samples, each run at the level 0.05'),
        P('Mehrere Einzeltests erhöhen die Chance auf mindestens ein fälschlich signifikantes Ergebnis.', 'Several single tests raise the chance of at least one falsely significant result.')),
      a(P('Chi-Quadrat-Test auf Zusammenhang, denn es gibt drei Gruppen', 'Chi-square test of association, since there are three groups'),
        P('Der Chi-Quadrat-Test arbeitet mit Häufigkeiten von Kategorien, nicht mit Gewichten.', 'The chi-square test works with counts of categories, not with weights.'))
    ],
    hilfe: ['frage-gruppen', 'frage-posthoc'], karte: 'gruppen', belege: ['wissen:anova-verallgemeinert-t', 'wissen:alpha-kumulierung', 'Bortz und Schuster']
  },
  {
    id: 'inf-v-zusammenhang', thema: 'inferenz',
    stamm: P('Bei Fahrversuchen wurden Geschwindigkeit und Bremsweg gemessen. Gefragt ist, wie eng beide zusammenhängen. Welches Verfahren passt?', 'In driving trials speed and stopping distance were measured. The question is how closely the two are related. Which procedure fits?'),
    antworten: [
      a(P('Streudiagramm und Korrelation zweier Zahlenmerkmale', 'Scatter plot and correlation of two numeric attributes'),
        P('Zwei gemessene Zahlen: Das Streudiagramm zeigt die Form, die Korrelation die Stärke des geradlinigen Zusammenhangs.', 'Two measured numbers: the scatter plot shows the shape, the correlation the strength of the straight-line relation.'), true),
      a(P('t-Test für unabhängige Stichproben mit einer Gruppe je Geschwindigkeit', 'T test for independent samples with one group per speed'),
        P('Jede Geschwindigkeit als Gruppe zu behandeln wirft die Ordnung der Werte weg.', 'Treating each speed as a group throws away the order of the values.')),
      a(P('Kreuztabelle, bei der die Geschwindigkeiten die Zeilen bilden', 'Crosstab in which the speeds form the rows'),
        P('Eine Kreuztabelle mit einer Zeile je Geschwindigkeit wäre dünn besetzt und ignoriert die Ordnung.', 'A crosstab with one row per speed would be sparsely filled and ignores the order.'))
    ],
    hilfe: ['frage-zusammenhang', 'korrelation'], karte: 'zusammenhang', belege: ['wissen:r-definition-eigenschaften', 'wissen:t-test-drei-varianten', 'Bortz und Schuster']
  },

  // ---- Niveau, zwei Studien (Stand 01.11.2026, dritte Charge) ----
  {
    id: 'inf-alpha-sim', thema: 'inferenz',
    tabelle: tab('inf-alpha-sim', [P('Kennzahl', 'Statistic'), P('Wert', 'Value')], QUELLE_ALPHA_SIM, P('Rechenbeispiel (Simulation): 20000 t-Tests mit zwei Gruppen aus derselben Verteilung', 'Worked example (simulation): 20000 t tests with two groups from the same distribution')),
    stamm: P(`Rechenbeispiel: In ${zn('ia_n')} Simulationen stammen beide Gruppen aus derselben Verteilung. Trotzdem sind ${zp('ia_a05')} Prozent der Tests auf dem Niveau ${zd('ia_th', 2)} signifikant (Tabelle). Was bedeutet das Niveau?`,
      `Worked example: in ${zn('ia_n')} simulations both groups come from the same distribution. Nevertheless ${zp('ia_a05')} percent of the tests are significant at the level ${ze('ia_th', 2)} (table). What does the level mean?`),
    antworten: [
      a(P(`Gilt die Nullhypothese und wird oft wiederholt, überschreiten nur etwa ${zp('ia_th')} Prozent der t-Werte den kritischen Wert`, `If the null hypothesis holds and is repeated often, only about ${zp('ia_th')} percent of the t values exceed the critical value`),
        P(`Hier gilt die Nullhypothese in allen ${zn('ia_n')} Fällen, und ${zd('ia_a05', 3)} der Tests sind dennoch signifikant; auf dem Niveau ${zd('ia_th01', 2)} sind es ${zd('ia_a01', 3)}.`,
          `Here the null hypothesis holds in all ${zn('ia_n')} cases, and ${ze('ia_a05', 3)} of the tests are nevertheless significant; at the level ${ze('ia_th01', 2)} it is ${ze('ia_a01', 3)}.`), true),
      a(P('Bei einem signifikanten Ergebnis stammen die Stichproben mit 95 Prozent Wahrscheinlichkeit aus verschiedenen Populationen', 'With a significant result the samples come from different populations with 95 percent probability'),
        P('In der Simulation stammen alle Paare aus derselben Population. Die Stichproben stammen entweder aus zwei Populationen oder nicht; das Niveau beschreibt die Wiederholung unter der Nullhypothese.',
          'In the simulation all pairs come from the same population. The samples come either from two populations or not; the level describes repetition under the null hypothesis.')),
      a(P('Ein kleiner p-Wert macht die Nullhypothese unwahrscheinlich, so wie ein Widerspruch eine Annahme widerlegt', 'A small p value makes the null hypothesis improbable, as a contradiction refutes an assumption'),
        P(`Ein unwahrscheinliches Ereignis widerlegt die Annahme nicht, ein Widerspruch schon. Auch bei richtiger Nullhypothese treten kleine p-Werte auf: ${zp('ia_a05')} Prozent liegen unter ${zd('ia_th', 2)}.`,
          `An improbable event does not refute the assumption, a contradiction does. Small p values also occur when the null hypothesis is true: ${zp('ia_a05')} percent are below ${ze('ia_th', 2)}.`))
    ],
    hilfe: ['signifikanzniveau', 'p-wert'], belege: ['wissen:alpha-95-herkunft-fehldeutung', 'wissen:castro-p-klein-kein-wahrscheinlichkeitsbeweis']
  },
  {
    id: 'inf-zwei-studien', thema: 'inferenz', fall: 'inf-zwei',
    stamm: P(`Rechenbeispiel: Die Alternative stimmt, und jede von zwei gleichartigen Studien hat die Teststärke ${zd('iz_pw', 2)} (Tabelle). Studie 1 fällt signifikant aus, Studie 2 verfehlt die Signifikanz. Was folgt?`,
      `Worked example: the alternative is true, and each of two similar studies has the power ${ze('iz_pw', 2)} (table). Study 1 comes out significant, study 2 misses significance. What follows?`),
    antworten: [
      a(P(`Kein Widerspruch: Genau eine signifikante Studie tritt mit Wahrscheinlichkeit ${zd('iz_pe', 2)} ein`, `No contradiction: exactly one significant study occurs with probability ${ze('iz_pe', 2)}`),
        P(`Beide: ${zd('iz_pw', 2)} mal ${zd('iz_pw', 2)} gleich ${zd('iz_pb', 2)}. Genau eine: 2 mal ${zd('iz_pw', 2)} mal ${zd('iz_pw1', 2)} gleich ${zd('iz_pe', 2)}. Keine: ${zd('iz_pn', 2)}.`,
          `Both: ${ze('iz_pw', 2)} times ${ze('iz_pw', 2)} equals ${ze('iz_pb', 2)}. Exactly one: 2 times ${ze('iz_pw', 2)} times ${ze('iz_pw1', 2)} equals ${ze('iz_pe', 2)}. Neither: ${ze('iz_pn', 2)}.`), true),
      a(P('Die beiden Studien widersprechen einander, der Effekt ist damit nicht bestätigt worden', 'The two studies contradict each other, so the effect has not been confirmed by them'),
        P(`Verschiedene Ausgänge sind bei zutreffender Alternative zu erwarten: genau eine signifikante Studie mit Wahrscheinlichkeit ${zd('iz_pe', 2)}. Daraus allein folgt kein Widerspruch.`,
          `Different outcomes are to be expected when the alternative is true: exactly one significant study with probability ${ze('iz_pe', 2)}. No contradiction follows from that alone.`)),
      a(P('Die nicht signifikante Studie zeigt, dass der Effekt in Wirklichkeit gar nicht vorhanden ist', 'The non-significant study shows that the effect does not exist in reality'),
        P(`Nicht signifikant heißt nur, dass ein Beleg fehlt. Bei Teststärke ${zd('iz_pw', 2)} bleibt eine Studie mit Wahrscheinlichkeit ${zd('iz_pw1', 2)} nicht signifikant, obwohl der Effekt besteht.`,
          `Not significant means only that evidence is lacking. At power ${ze('iz_pw', 2)} a study stays non-significant with probability ${ze('iz_pw1', 2)} although the effect exists.`))
    ],
    hilfe: ['replikation', 'teststaerke'], belege: ['wissen:greenland16-zwei-studien-power']
  },
  {
    id: 'inf-zwei-mehrfach', thema: 'inferenz', fall: 'inf-zwei', mehrfach: true,
    stamm: P(`Rechenbeispiel: Die Alternative stimmt, und jede von zwei gleichartigen Studien hat die Teststärke ${zd('iz_pw', 2)}. Welche Aussagen zur Tabelle stimmen? Mehrere können stimmen.`,
      `Worked example: the alternative is true, and each of two similar studies has the power ${ze('iz_pw', 2)}. Which statements about the table are correct? Several may be correct.`),
    antworten: [
      a(P(`Beide Studien sind mit Wahrscheinlichkeit ${zd('iz_pb', 2)} signifikant`, `Both studies are significant with probability ${ze('iz_pb', 2)}`),
        P(`Die Wahrscheinlichkeiten multiplizieren sich: ${zd('iz_pw', 2)} mal ${zd('iz_pw', 2)} gleich ${zd('iz_pb', 2)}.`, `The probabilities multiply: ${ze('iz_pw', 2)} times ${ze('iz_pw', 2)} equals ${ze('iz_pb', 2)}.`), true),
      a(P('Wer einzelne Ergebnisse als signifikant oder nicht signifikant behandelt, muss Widersprüche zwischen Studien erwarten', 'Whoever treats single results as significant or not significant must expect contradictions between studies'),
        P('Auch bei zutreffender Alternative fallen Studien verschieden aus. Eine Replikationskrise ist schon dadurch zu erwarten, dass einzelne Ergebnisse als signifikant oder nicht signifikant behandelt werden.',
          'Studies come out differently even when the alternative is true. A replication crisis is to be expected simply because single results are treated as significant or not significant.'), true),
      a(P(`Beide Studien sind mit Wahrscheinlichkeit ${zd('iz_pw', 2)} signifikant, der Teststärke jeder einzelnen`, `Both studies are significant with probability ${ze('iz_pw', 2)}, the power of each single one`),
        P(`Die Teststärke gilt je Studie. Für beide zusammen multiplizieren sich die Wahrscheinlichkeiten zu ${zd('iz_pb', 2)}.`, `The power holds per study. For both together the probabilities multiply to ${ze('iz_pb', 2)}.`)),
      a(P('Eine nicht signifikante Wiederholung widerlegt die erste Studie', 'A non-significant repetition refutes the first study'),
        P(`Genau eine signifikante Studie tritt mit Wahrscheinlichkeit ${zd('iz_pe', 2)} auf, auch wenn der Effekt besteht. Ein Widerspruch folgt daraus nicht.`, `Exactly one significant study occurs with probability ${ze('iz_pe', 2)} even when the effect exists. No contradiction follows.`))
    ],
    hilfe: ['replikation', 'teststaerke'], belege: ['wissen:greenland16-zwei-studien-power']
  },
];
