/**
 * Üben: Wie gut ist ein Test, wie lange dauert es bis zum Ereignis, stimmen mehrere Studien überein?
 * (Sensitivität, Spezifität, Vorhersagewerte, Likelihood-Ratio, Kaplan-Meier, Hazard Ratio, I²).
 * Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R,
 * Daten: MASS::Pima.te, survival::lung, metadat::dat.bcg; ein Rechenbeispiel ist als solches beschriftet).
 * Mein Fachgebiet: Medizin und Gesundheit (Karten Kaplan-Meier und Meta-Analyse), nur vermerkt.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, W, zd, ze, zn, zp, zpr } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const SS = ['sensitivitaet', 'spezifitaet', 'vorhersagewert'];
const KM = ['kaplan-meier', 'zensierung'];
const positiv = String(Number(W.mp_tp) + Number(W.mp_fp));

const QUELLE_PIMA = P(
  `Daten: MASS::Pima.te (Smith u. a. 1988, National Institute of Diabetes and Digestive and Kidney Diseases; Paket MASS, Lizenz GPL), ${zn('mp_n')} Frauen, Glukosewert und Diabetes. Berechnet mit R.`,
  `Data: MASS::Pima.te (Smith et al. 1988, National Institute of Diabetes and Digestive and Kidney Diseases; package MASS, licence GPL), ${zn('mp_n')} women, glucose value and diabetes. Computed with R.`);
const QUELLE_RECHEN = P(
  'Rechenbeispiel, keine Daten: berechnet mit R aus Sensitivität und Spezifität der Tabelle oben. Die Häufigkeit des Diabetes ist angenommen.',
  'Worked example, no data: computed with R from the sensitivity and specificity of the table above. The frequency of diabetes is assumed.');
const QUELLE_NACHTEST = P(
  `Rechenbeispiel, keine Daten: Likelihood-Ratio aus Sensitivität und Spezifität der Daten MASS::Pima.te (${zn('mp_n')} Frauen; Paket MASS, Lizenz GPL). Die Vortest-Wahrscheinlichkeit ist angenommen. Berechnet mit R.`,
  `Worked example, no data: likelihood ratio from sensitivity and specificity of the data MASS::Pima.te (${zn('mp_n')} women; package MASS, licence GPL). The pre-test probability is assumed. Computed with R.`);
const QUELLE_GRENZ = P(
  `Daten: MASS::Pima.te (Smith u. a. 1988; Paket MASS, Lizenz GPL), ${zn('mp_n')} Frauen. Berechnet mit R.`,
  `Data: MASS::Pima.te (Smith et al. 1988; package MASS, licence GPL), ${zn('mp_n')} women. Computed with R.`);
const QUELLE_LUNG = P(
  `Daten: survival::lung (Loprinzi u. a. 1994, North Central Cancer Treatment Group; Paket survival, Lizenz LGPL), ${zn('ml_n')} Personen mit fortgeschrittenem Lungenkrebs. Kaplan-Meier-Schätzung, Cox-Modell und Logrank-Test, berechnet mit R.`,
  `Data: survival::lung (Loprinzi et al. 1994, North Central Cancer Treatment Group; package survival, licence LGPL), ${zn('ml_n')} people with advanced lung cancer. Kaplan-Meier estimate, Cox model and log-rank test, computed with R.`);
const QUELLE_BCG = P(
  `Daten: metadat::dat.bcg (Colditz u. a. 1994, ${zn('mb_k')} Studien zur Impfung gegen Tuberkulose; Paket metadat, Lizenz GPL). Effekt: logarithmiertes Risikoverhältnis; Heterogenitätstest und I², berechnet mit R.`,
  `Data: metadat::dat.bcg (Colditz et al. 1994, ${zn('mb_k')} studies of vaccination against tuberculosis; package metadat, licence GPL). Effect: log risk ratio; heterogeneity test and I², computed with R.`);

const QUELLE_BCG2 = P(
  `Daten: metadat::dat.bcg (Colditz u. a. 1994, ${zn('m2_k')} Studien zur Impfung gegen Tuberkulose; Pakete metadat und metafor, Lizenz GPL). Effekt: Risikoverhältnis (Impfung gegen keine Impfung), gerechnet auf der logarithmischen Skala und zurückgerechnet. Random-Effects nach DerSimonian und Laird; das Prädiktionsintervall nutzt die Normalverteilung (95 Prozent) mit der Streuung aus Zwischenstudienvarianz und Standardfehler. Berechnet mit R und von Hand geprüft.`,
  `Data: metadat::dat.bcg (Colditz et al. 1994, ${zn('m2_k')} studies of vaccination against tuberculosis; packages metadat and metafor, licence GPL). Effect: risk ratio (vaccination against none), computed on the logarithmic scale and transformed back. Random effects after DerSimonian and Laird; the prediction interval uses the normal distribution (95 percent) with the spread from between-study variance and standard error. Computed with R and checked by hand.`);

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'med-pima': {
    titel: P(`Ein Test auf Diabetes bei ${zn('mp_n')} Frauen: Der Test gilt als positiv, wenn der Glukosewert nach einer Zuckerbelastung mindestens 120 beträgt. Verglichen wird mit dem Befund (Yes = Diabetes, No = kein Diabetes)`,
      `A test for diabetes in ${zn('mp_n')} women: the test counts as positive if the glucose value after a sugar load is at least 120. It is compared with the diagnosis (Yes = diabetes, No = no diabetes)`),
    tabellen: [
      tab('med-pima.0', [P('Test (Zeilen), Befund (Spalten)', 'Test (rows), diagnosis (columns)'), P('Yes', 'Yes'), P('No', 'No'), P('Summe', 'Total')], QUELLE_PIMA, P('Vierfeldertafel', 'Fourfold table')),
      tab('med-pima.1', [P('Sensitivität', 'Sensitivity'), P('Spezifität', 'Specificity'), P('Positiver Vorhersagewert', 'Positive predictive value'), P('Negativer Vorhersagewert', 'Negative predictive value'), P('Anteil mit Diabetes in den Daten', 'Share with diabetes in the data')], QUELLE_PIMA, P('Kennzahlen des Tests', 'Figures of the test')),
      tab('med-pima.2', [P('Positives Likelihood-Ratio', 'Positive likelihood ratio'), P('Negatives Likelihood-Ratio', 'Negative likelihood ratio')], QUELLE_PIMA, P('Likelihood-Ratios', 'Likelihood ratios')),
      tab('med-pima.3', [P('Anteil mit Diabetes', 'Share with diabetes'), P('Positiver Vorhersagewert', 'Positive predictive value'), P('Negativer Vorhersagewert', 'Negative predictive value')], QUELLE_RECHEN, P('Rechenbeispiel: derselbe Test bei anderer Häufigkeit des Diabetes (erste Zeile: die Daten)', 'Worked example: the same test with a different frequency of diabetes (first row: the data)'))
    ]
  },
  'med-lung': {
    titel: P(`Überleben bei ${zn('ml_n')} Personen mit fortgeschrittenem Lungenkrebs, getrennt nach Geschlecht (Male = Männer, Female = Frauen). Das Ereignis ist der Tod, die Zeit wird in Tagen gemessen`,
      `Survival in ${zn('ml_n')} people with advanced lung cancer, by sex (Male, Female). The event is death, time is measured in days`),
    tabellen: [
      tab('med-lung.0', [P('Gruppe', 'Group'), P('Personen', 'People'), P('Todesfälle', 'Deaths'), P('Zensiert', 'Censored'), P('Mediane Überlebenszeit (Tage)', 'Median survival time (days)')], QUELLE_LUNG, P('Kaplan-Meier-Schätzung je Gruppe', 'Kaplan-Meier estimate for each group')),
      tab('med-lung.1', [P('Männer', 'Men'), P('Frauen', 'Women')], QUELLE_LUNG, P('Geschätzter Anteil ohne Ereignis nach einem Jahr (365 Tage)', 'Estimated share without the event after one year (365 days)')),
      tab('med-lung.2', [P('Hazard Ratio (Frauen gegen Männer)', 'Hazard ratio (women against men)'), P('95-%-Intervall unten', '95% interval lower'), P('95-%-Intervall oben', '95% interval upper'), P('Sig.', 'Sig.')], QUELLE_LUNG, P('Cox-Modell mit dem Geschlecht', 'Cox model with sex')),
      tab('med-lung.3', [P('Chi-Quadrat', 'Chi-square'), P('Freiheitsgrade', 'Degrees of freedom'), P('Sig.', 'Sig.')], QUELLE_LUNG, P('Logrank-Test: Männer gegen Frauen', 'Log-rank test: men against women'))
    ]
  },
  'med-bcg': {
    titel: P(`${zn('mb_k')} Impfstudien gegen Tuberkulose: Heterogenität der Studienergebnisse, einmal für alle Studien und einmal für die drei frühesten (1948 bis 1953)`,
      `${zn('mb_k')} vaccination studies against tuberculosis: heterogeneity of the study results, once for all studies and once for the three earliest (1948 to 1953)`),
    tabellen: [
      tab('med-bcg.0', [P('Studien', 'Studies'), P('Zahl', 'Number'), P('Q', 'Q'), P('Freiheitsgrade', 'Degrees of freedom'), P('Sig. des Heterogenitätstests', 'Sig. of the heterogeneity test'), P('I² (Prozent)', 'I² (percent)')], QUELLE_BCG, P('Heterogenitätstest (Cochrans Q) und I²', 'Heterogeneity test (Cochran\'s Q) and I²'))
    ]
  },
  'med-bcg2': {
    titel: P(`${zn('m2_k')} Impfstudien gegen Tuberkulose: Gesamtwert nach dem Fixed-Effect- und dem Random-Effects-Modell`, `${zn('m2_k')} vaccination studies against tuberculosis: overall value under the fixed-effect and the random-effects model`),
    tabellen: [
      tab('med-bcg2.0', [P('Größe', 'Quantity'), P('Risikoverhältnis', 'Risk ratio'), P('von', 'from'), P('bis', 'to')], QUELLE_BCG2, P('Gesamtwerte mit Intervall', 'Overall values with interval')),
      tab('med-bcg2.1', [P('Kennzahl', 'Statistic'), P('Wert', 'Value')], QUELLE_BCG2, P('Heterogenität der Studien', 'Heterogeneity of the studies'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Fall A: Test auf Diabetes ----
  {
    id: 'med-a-sens', thema: 'medizin', fall: 'med-pima',
    stamm: P(`Die Sensitivität des Tests ist ${zd('mp_se', 3)}. Wie ist das zu lesen?`, `The sensitivity of the test is ${ze('mp_se', 3)}. How is that to be read?`),
    antworten: [
      a(P(`Von den Frauen mit Diabetes fallen rund ${zp('mp_se')} von 100 im Test positiv aus`, `Of the women with diabetes about ${zp('mp_se')} in 100 test positive`),
        P(`Die Sensitivität geht von den Kranken aus: ${zn('mp_tp')} von ${zn('mp_tp')} plus ${zn('mp_fn')} Frauen mit Diabetes sind positiv.`, `Sensitivity starts from the people who have the disease: ${zn('mp_tp')} of ${zn('mp_tp')} plus ${zn('mp_fn')} women with diabetes are positive.`), true),
      a(P(`Von den positiv getesteten Frauen haben rund ${zp('mp_se')} von 100 Diabetes`, `Of the women who test positive about ${zp('mp_se')} in 100 have diabetes`),
        P(`Das beschreibt den positiven Vorhersagewert. Er beträgt hier ${zd('mp_ppv', 3)}, weil er von den positiv Getesteten ausgeht.`, `That describes the positive predictive value. Here it is ${ze('mp_ppv', 3)}, because it starts from those who test positive.`)),
      a(P(`Von den Frauen ohne Diabetes fallen rund ${zp('mp_se')} von 100 im Test negativ aus`, `Of the women without diabetes about ${zp('mp_se')} in 100 test negative`),
        P(`Das beschreibt die Spezifität, hier ${zd('mp_sp', 3)}. Sensitivität und Spezifität werden wegen ähnlicher Namen verwechselt.`, `That describes the specificity, here ${ze('mp_sp', 3)}. Sensitivity and specificity are mixed up because of similar names.`))
    ],
    hilfe: SS, belege: ['wissen:altman94a-sens-spez-definition', 'wissen:med-umkehrung-bedingung', 'Altman und Bland 1994']
  },
  {
    id: 'med-a-ppv', thema: 'medizin', fall: 'med-pima',
    stamm: P('Welche Zahl der zweiten Tabelle sagt, wie viele der positiv getesteten Frauen Diabetes haben?', 'Which figure of the second table says how many of the women who test positive have diabetes?'),
    antworten: [
      a(P(`Der positive Vorhersagewert ${zd('mp_ppv', 3)}: gut die Hälfte der positiv Getesteten hat Diabetes`, `The positive predictive value ${ze('mp_ppv', 3)}: a good half of the positives have diabetes`),
        P(`Gezählt wird von den positiv Getesteten aus: ${zn('mp_tp')} von ${positiv} haben Diabetes.`, `The count starts from those who test positive: ${zn('mp_tp')} of ${positiv} have diabetes.`), true),
      a(P(`Die Sensitivität ${zd('mp_se', 3)}, denn sie nennt den Anteil der erkannten Fälle unter allen Getesteten`, `The sensitivity ${ze('mp_se', 3)}, since it gives the share of detected cases among those tested`),
        P('Die Sensitivität zählt von den Kranken aus. Wie viele der Positiven krank sind, sagt sie nicht.', 'Sensitivity counts from the people who have the disease. It does not say how many of the positives have it.')),
      a(P(`Die Spezifität ${zd('mp_sp', 3)}, denn sie nennt den Anteil der richtigen Ergebnisse unter allen Getesteten`, `The specificity ${ze('mp_sp', 3)}, since it gives the share of correct results among those tested`),
        P('Die Spezifität zählt von den Gesunden aus. Auch sie sagt nichts über die positiv Getesteten.', 'Specificity counts from the healthy. It also says nothing about those who test positive.'))
    ],
    hilfe: SS, belege: ['wissen:altman94b-vorhersagewerte-definition', 'wissen:med-umkehrung-bedingung', 'Altman und Bland 1994']
  },
  {
    id: 'med-a-bedingung', thema: 'medizin', fall: 'med-pima',
    stamm: P(`Ein Bericht schreibt: „Der Test hat eine Sensitivität von ${zp('mp_se')} Prozent, also sind ${zp('mp_se')} Prozent der positiv Getesteten krank.“ Was ist daran falsch?`,
      `A report writes: „The test has a sensitivity of ${zp('mp_se')} percent, so ${zp('mp_se')} percent of those who test positive are ill.“ What is wrong with that?`),
    antworten: [
      a(P('Die Bedingung ist vertauscht: Die Sensitivität geht von den Kranken aus, der Satz von den Positiven', 'The condition is swapped: sensitivity starts from the ill, the sentence from the positives'),
        P('Test positiv unter den Kranken und krank unter den Positiven sind zwei verschiedene Anteile. Der zweite ist der Vorhersagewert.', 'Test positive among the ill and ill among the positives are two different shares. The second is the predictive value.'), true),
      a(P('Der Satz stimmt, denn die Sensitivität sagt, wie sicher ein positives Ergebnis ist, wenn es auftritt', 'The sentence is correct, since sensitivity says how reliable a positive result is when it occurs'),
        P('Das ist die bekannte Fehldeutung. Wie verlässlich ein positives Ergebnis ist, sagt der positive Vorhersagewert.', 'That is the well-known misreading. How reliable a positive result is, is said by the positive predictive value.')),
      a(P('Es fehlt die Spezifität: Zusammen mit ihr gilt der Satz für den Anteil unter den positiv Getesteten', 'The specificity is missing: together with it the sentence holds for those who test positive'),
        P('Auch mit der Spezifität bleibt die Häufigkeit des Diabetes nötig. Sie entscheidet, wie viele Positive krank sind.', 'Even with the specificity the frequency of diabetes is needed. It decides how many of the positives are ill.'))
    ],
    hilfe: SS, belege: ['wissen:med-umkehrung-bedingung', 'wissen:deeks04-lr-gegen-vorhersagewerte', 'Altman und Bland 1994; Deeks und Altman 2004']
  },
  {
    id: 'med-a-praevalenz', thema: 'medizin', fall: 'med-pima',
    stamm: P(`Angenommen, derselbe Test mit gleicher Sensitivität und Spezifität wird in einer Gruppe eingesetzt, in der nur ${zp('mp_prev1')} von 100 Frauen Diabetes hat. Was zeigt die Tabelle mit dem Rechenbeispiel?`,
      `Suppose the same test, with the same sensitivity and specificity, is used in a group in which only ${zp('mp_prev1')} in 100 women has diabetes. What does the table with the worked example show?`),
    antworten: [
      a(P(`Der positive Vorhersagewert sinkt auf ${zd('mp_ppv1', 3)}, obwohl Sensitivität und Spezifität gleich bleiben`, `The positive predictive value falls to ${ze('mp_ppv1', 3)}, although sensitivity and specificity stay the same`),
        P('Bei seltener Krankheit sind viele positive Ergebnisse falsch positiv. Die Häufigkeit gehört zur Rechnung.', 'With a rare disease many positive results are false positives. The frequency is part of the calculation.'), true),
      a(P(`Der positive Vorhersagewert bleibt bei ${zd('mp_ppv', 3)}, weil Sensitivität und Spezifität gleich bleiben`, `The positive predictive value stays at ${ze('mp_ppv', 3)}, because sensitivity and specificity stay the same`),
        P('Der Vorhersagewert aus den Daten gilt nur für die Häufigkeit in den Daten. Er ist keine Eigenschaft des Tests allein.', 'The predictive value from the data holds only for the frequency in the data. It is not a property of the test alone.')),
      a(P(`Der negative Vorhersagewert sinkt, weil weniger Frauen Diabetes haben und der Test weniger zu tun hat`, `The negative predictive value falls, because fewer women have diabetes and the test has less to do`),
        P(`Der negative Vorhersagewert steigt auf ${zd('mp_npv1', 3)}: Ein negatives Ergebnis ist bei seltener Krankheit eher richtig.`, `The negative predictive value rises to ${ze('mp_npv1', 3)}: with a rare disease a negative result is more often right.`))
    ],
    hilfe: ['vorhersagewert', 'sensitivitaet'], belege: ['wissen:med-sens-spez-pravalenz', 'wissen:altman94b-vorhersagewerte-formeln', 'wissen:altman94b-geringe-praevalenz-screening', 'Altman und Bland 1994; Lalkhen und McCluskey 2008']
  },
  {
    id: 'med-a-lr', thema: 'medizin', fall: 'med-pima',
    stamm: P(`Das positive Likelihood-Ratio ist ${zd('mp_lrp', 2)}. Wie ist das zu lesen?`, `The positive likelihood ratio is ${ze('mp_lrp', 2)}. How is that to be read?`),
    antworten: [
      a(P(`Ein positives Ergebnis kommt bei Frauen mit Diabetes rund ${zd('mp_lrp', 1)}-mal so oft vor wie ohne Diabetes`, `A positive result occurs about ${ze('mp_lrp', 1)} times as often in women with diabetes as without`),
        P(`Die Rechnung lautet Sensitivität durch (eins minus Spezifität), hier ${zd('mp_lrp', 2)}. Werte über 1 sprechen für die Krankheit.`, `The calculation is sensitivity divided by (one minus specificity), here ${ze('mp_lrp', 2)}. Values above 1 speak for the disease.`), true),
      a(P(`Eine Frau mit positivem Ergebnis hat mit einer Wahrscheinlichkeit von ${zd('mp_lrp', 1)} Prozent Diabetes`, `A woman with a positive result has diabetes with a probability of ${ze('mp_lrp', 1)} percent`),
        P('Das Likelihood-Ratio ist keine Wahrscheinlichkeit der Krankheit. Es verändert die Odds, die man vor dem Test hatte.', 'The likelihood ratio is not a probability of the disease. It changes the odds one had before the test.')),
      a(P(`Es ist die Sensitivität geteilt durch die Spezifität, also ${zd('mp_se', 3)} durch ${zd('mp_sp', 3)}, ein Verhältnis der Trefferquoten`, `It is the sensitivity divided by the specificity, that is ${ze('mp_se', 3)} by ${ze('mp_sp', 3)}, a ratio of hit rates`),
        P(`Richtig ist die Sensitivität geteilt durch eins minus die Spezifität. Daraus folgt ${zd('mp_lrp', 2)}.`, `The correct form is sensitivity divided by one minus specificity. That gives ${ze('mp_lrp', 2)}.`))
    ],
    hilfe: ['sensitivitaet', 'vorhersagewert'], belege: ['wissen:deeks04-lr-definition', 'wissen:deeks04-lr-formeln', 'Deeks und Altman 2004']
  },
  // ---- Einzelfragen zu Tests ----
  {
    id: 'med-nachtest', thema: 'medizin',
    stamm: P(`Vor dem Test wird die Wahrscheinlichkeit für Diabetes auf ${zd('mn_pre', 2)} geschätzt. Das positive Likelihood-Ratio ist ${zd('mp_lrp', 2)}. Wie hoch ist die Wahrscheinlichkeit nach einem positiven Ergebnis?`,
      `Before the test the probability of diabetes is estimated at ${ze('mn_pre', 2)}. The positive likelihood ratio is ${ze('mp_lrp', 2)}. How high is the probability after a positive result?`),
    tabelle: tab('med-nachtest', [P('Wahrscheinlichkeit vor dem Test', 'Probability before the test'), P('Odds vor dem Test', 'Odds before the test'), P('Positives Likelihood-Ratio', 'Positive likelihood ratio'), P('Odds nach dem Test', 'Odds after the test'), P('Wahrscheinlichkeit nach dem Test', 'Probability after the test')], QUELLE_NACHTEST, P('Rechenbeispiel: vom Vortest zum Nachtest', 'Worked example: from pre-test to post-test')),
    antworten: [
      a(P(`Rund ${zd('mn_post', 2)}: Odds mit ${zd('mp_lrp', 2)} malgenommen, dann zurück in eine Wahrscheinlichkeit`, `About ${ze('mn_post', 2)}: odds multiplied by ${ze('mp_lrp', 2)}, then converted back into a probability`),
        P(`Odds nach dem Test gleich Odds vor dem Test mal Likelihood-Ratio: ${zd('mn_odds_pre', 3)} mal ${zd('mp_lrp', 2)} ergibt ${zd('mn_odds_post', 3)}, das sind ${zd('mn_post', 2)} als Wahrscheinlichkeit.`, `Odds after the test equal odds before the test times the likelihood ratio: ${ze('mn_odds_pre', 3)} times ${ze('mp_lrp', 2)} gives ${ze('mn_odds_post', 3)}, which is ${ze('mn_post', 2)} as a probability.`), true),
      a(P(`Rund ${zd('mn_falsch', 2)}: die Vortest-Wahrscheinlichkeit mal ${zd('mp_lrp', 2)}, ohne Umweg über die Odds`, `About ${ze('mn_falsch', 2)}: the pre-test probability times ${ze('mp_lrp', 2)}, without the detour through odds`),
        P('Das Likelihood-Ratio wirkt auf die Odds, nicht auf die Wahrscheinlichkeit. Bei kleinen Werten liegen beide nahe beieinander, sonst nicht.', 'The likelihood ratio acts on the odds, not on the probability. For small values the two are close, otherwise they are not.')),
      a(P(`Rund ${zd('mp_ppv', 2)}: der Vorhersagewert aus den Daten, gültig für jede Vortest-Wahrscheinlichkeit`, `About ${ze('mp_ppv', 2)}: the predictive value from the data, valid for every pre-test probability`),
        P('Der Vorhersagewert aus der Studie gilt nur bei der Häufigkeit der Studie. Das Likelihood-Ratio lässt sich auf andere Vortest-Wahrscheinlichkeiten übertragen.', 'The predictive value from the study holds only for the frequency in the study. The likelihood ratio can be carried over to other pre-test probabilities.'))
    ],
    hilfe: ['vorhersagewert', 'sensitivitaet'], belege: ['wissen:deeks04-bayes-odds', 'wissen:altman94b-prior-posterior-lr', 'wissen:deeks04-lr-gegen-vorhersagewerte', 'Deeks und Altman 2004']
  },
  {
    id: 'med-cutoff', thema: 'medizin',
    stamm: P('Ab welchem Glukosewert der Test als positiv gilt, kann man wählen. Der Grenzwert wird von 120 auf 140 angehoben. Was zeigt die Tabelle?', 'One can choose the glucose value from which the test counts as positive. The cut-off is raised from 120 to 140. What does the table show?'),
    tabelle: tab('med-cutoff', [P('Grenzwert (Glukose)', 'Cut-off (glucose)'), P('Sensitivität', 'Sensitivity'), P('Spezifität', 'Specificity'), P('Falsch Positive', 'False positives'), P('Falsch Negative', 'False negatives')], QUELLE_GRENZ, P('Ein Test bei drei Grenzwerten', 'One test at three cut-offs')),
    antworten: [
      a(P(`Weniger falsch Positive (${zn('mp_fp')} auf ${zn('mc_fp140')}), aber mehr falsch Negative (${zn('mp_fn')} auf ${zn('mc_fn140')})`, `Fewer false positives (${zn('mp_fp')} to ${zn('mc_fp140')}), but more false negatives (${zn('mp_fn')} to ${zn('mc_fn140')})`),
        P('Ein höherer Grenzwert senkt die Sensitivität und hebt die Spezifität. Man tauscht eine Fehlerart gegen die andere.', 'A higher cut-off lowers the sensitivity and raises the specificity. One trades one kind of error for the other.'), true),
      a(P(`Mehr falsch Positive (${zn('mp_fp')} auf ${zn('mc_fp100')}), aber weniger falsch Negative (${zn('mp_fn')} auf ${zn('mc_fn100')})`, `More false positives (${zn('mp_fp')} to ${zn('mc_fp100')}), but fewer false negatives (${zn('mp_fn')} to ${zn('mc_fn100')})`),
        P(`Diese Richtung gilt für das Senken des Grenzwerts auf 100. Beim Anheben passiert das Gegenteil.`, `That direction holds for lowering the cut-off to 100. Raising it does the opposite.`)),
      a(P('Sensitivität und Spezifität steigen beide, weil ein strengerer Grenzwert genauer misst', 'Sensitivity and specificity both rise, as a stricter cut-off is more exact'),
        P(`Beide steigen gemeinsam nur, wenn der Test selbst besser wird. Ein anderer Grenzwert verschiebt nur die Abwägung, die Sensitivität sinkt hier von ${zd('mp_se', 3)} auf ${zd('mc_se140', 3)}.`, `Both rise together only if the test itself gets better. A different cut-off only shifts the trade-off; here the sensitivity falls from ${ze('mp_se', 3)} to ${ze('mc_se140', 3)}.`))
    ],
    hilfe: ['roc-kurve', 'sensitivitaet', 'spezifitaet'], belege: ['wissen:lalkhen08-grenzwert', 'Lalkhen und McCluskey 2008']
  },
  {
    id: 'med-auc', thema: 'medizin',
    stamm: P(`Ein Test erreicht eine AUC von ${zd('ma_zufall', 1)} (der Glukosewert in den Daten: ${zd('ma_auc', 3)}). Was sagt ${zd('ma_zufall', 1)}?`, `A test reaches an AUC of ${ze('ma_zufall', 1)} (the glucose value in the data: ${ze('ma_auc', 3)}). What does ${ze('ma_zufall', 1)} say?`),
    antworten: [
      a(P('Der Test trennt Kranke und Gesunde so gut wie ein Münzwurf, also zufällig', 'The test separates ill and healthy no better than a coin toss, like chance'),
        P('Die Fläche unter der ROC-Kurve fasst alle Grenzwerte zusammen. 1,0 wäre ein perfekter Test, 0,5 ein Test ohne Trennkraft.', 'The area under the ROC curve sums up all cut-offs. 1.0 would be a perfect test, 0.5 a test without separating power.'), true),
      a(P('Der Test erkennt die Hälfte der Kranken richtig und lässt die andere Hälfte aus', 'The test detects half of the ill people correctly and misses the other half of them'),
        P('Der Anteil der erkannten Kranken ist die Sensitivität bei einem Grenzwert. Die AUC fasst alle Grenzwerte zusammen.', 'The share of detected ill people is the sensitivity at one cut-off. The AUC sums up all cut-offs.')),
      a(P('Der Test hat bei jedem Grenzwert eine Sensitivität und eine Spezifität von je 0,5', 'The test has a sensitivity of 0.5 and a specificity of 0.5 at every single cut-off'),
        P('Die AUC ist kein Wert für einen einzelnen Grenzwert. Sie beschreibt die ganze Kurve.', 'The AUC is not a value for a single cut-off. It describes the whole curve.'))
    ],
    hilfe: ['roc-auc', 'roc-kurve'], belege: ['wissen:lalkhen08-roc', 'Lalkhen und McCluskey 2008']
  },
  // ---- Fall B: Überleben ----
  {
    id: 'med-b-zensur', thema: 'medizin', fall: 'med-lung',
    stamm: P(`In der ersten Tabelle sind ${zn('ml_cens')} von ${zn('ml_n')} Personen zensiert. Was heißt das?`, `In the first table ${zn('ml_cens')} of ${zn('ml_n')} people are censored. What does that mean?`),
    antworten: [
      a(P('Das Ereignis trat bis zum Ende der Beobachtung nicht ein, ihre wahre Zeit ist länger', 'The event had not occurred by the end of observation, their true time is longer'),
        P('Zensierte Personen tragen Information bei: Sie waren bis dahin ereignisfrei. Das Verfahren nutzt das, statt sie zu streichen.', 'Censored people contribute information: they were event-free up to that point. The method uses this instead of dropping them.'), true),
      a(P('Ihre Angaben sind unbrauchbar und dürfen weggelassen werden, ohne das Ergebnis zu ändern', 'Their data are unusable and can be omitted without changing the result'),
        P('Weglassen würde die Zeiten unterschätzen, denn diese Personen haben bis zu ihrer Zensierung überlebt.', 'Omitting them would underestimate the times, because these people survived up to their censoring.')),
      a(P('Sie sind am Ende der Studie gestorben, ihre Zeit zählt wie die der anderen Todesfälle', 'They died at the end of the study, their time counts like that of the other deaths'),
        P('Dann wären sie Todesfälle und nicht zensiert. Zensiert heißt: Das Ereignis ist nicht beobachtet.', 'Then they would be deaths and not censored. Censored means the event was not observed.'))
    ],
    hilfe: KM, karte: 'kaplanmeier', belege: ['wissen:bland98-zensierung', 'wissen:clark03-zensierung-arten', 'wissen:clark03-km-formel', 'Bland und Altman 1998; Clark u. a. 2003']
  },
  {
    id: 'med-b-median', thema: 'medizin', fall: 'med-lung',
    stamm: P(`Wie ist die mediane Überlebenszeit von ${zn('ml_med_f')} Tagen bei den Frauen zu lesen?`, `How is the median survival time of ${zn('ml_med_f')} days in women to be read?`),
    antworten: [
      a(P(`Bei ${zn('ml_med_f')} Tagen fällt die geschätzte Überlebenskurve auf ${zd('ma_zufall', 1)} oder tiefer`, `At ${zn('ml_med_f')} days the estimated survival curve falls to ${ze('ma_zufall', 1)} or lower`),
        P('Der Median wird an der Kaplan-Meier-Kurve abgelesen. Wegen der Schiefe der Überlebenszeiten wird der Mittelwert selten verwendet.', 'The median is read off the Kaplan-Meier curve. Because survival times are skewed, the mean is rarely used.'), true),
      a(P(`Die Frauen leben im Durchschnitt ${zn('ml_med_f')} Tage, vom Studienbeginn an gerechnet`, `The women live ${zn('ml_med_f')} days on average, counted from the start of the study`),
        P('Das wäre ein Mittelwert. Der Median ist die Zeit, zu der die Hälfte das Ereignis erlebt hat, geschätzt unter Berücksichtigung der Zensierung.', 'That would be a mean. The median is the time by which half have had the event, estimated with censoring taken into account.')),
      a(P(`Es ist der Mittelwert der Zeiten der ${zn('ml_ev_f')} Todesfälle unter den Frauen`, `It is the mean of the times of the ${zn('ml_ev_f')} deaths among the women`),
        P('Der Mittelwert der beobachteten Todeszeiten ließe die zensierten Frauen außer Acht und unterschätzte die Zeit.', 'The mean of the observed death times would ignore the censored women and underestimate the time.'))
    ],
    hilfe: ['median-ueberlebenszeit', 'kaplan-meier'], karte: 'kaplanmeier', belege: ['wissen:clark03-schiefe-median', 'Clark u. a. 2003']
  },
  {
    id: 'med-b-hr', thema: 'medizin', fall: 'med-lung',
    stamm: P(`Die Hazard Ratio der Frauen gegen die Männer ist ${zd('ml_hr', 3)}. Wie ist sie zu lesen?`, `The hazard ratio of women against men is ${ze('ml_hr', 3)}. How is it to be read?`),
    antworten: [
      a(P(`Die Sterberate der Frauen beträgt im Mittel rund das ${zd('ml_hr', 2)}fache der Männer`, `The death rate of the women is about ${ze('ml_hr', 2)} times that of the men`),
        P('Die Hazard Ratio vergleicht die momentanen Ereignisraten zweier Gruppen, ähnlich einem Risikoverhältnis. 1 hieße kein Unterschied.', 'The hazard ratio compares the instantaneous event rates of two groups, similar to a risk ratio. A value of 1 would mean no difference.'), true),
      a(P(`Die Frauen leben im Mittel das ${zd('ml_hr', 2)}fache so lang wie die Männer, gerechnet in Tagen`, `The women live on average ${ze('ml_hr', 2)} times as long as the men, counted in days`),
        P('Die Hazard Ratio ist ein Verhältnis von Raten, kein Verhältnis von Überlebenszeiten. Eine kleinere Rate bedeutet längeres Überleben.', 'The hazard ratio is a ratio of rates, not a ratio of survival times. A smaller rate means longer survival.')),
      a(P(`Auf je 100 gestorbene Männer kommen im selben Zeitraum rund ${zp('ml_hr')} gestorbene Frauen`, `For every 100 men who died about ${zp('ml_hr')} women died in the same period`),
        P(`Das wäre ein Verhältnis von Zahlen. Die Hazard Ratio vergleicht Raten: In der Tabelle sterben ${zn('ml_ev_f')} Frauen und ${zn('ml_ev_m')} Männer, und es gibt weniger Frauen als Männer.`, `That would be a ratio of numbers. The hazard ratio compares rates: in the table ${zn('ml_ev_f')} women and ${zn('ml_ev_m')} men die, and there are fewer women than men.`))
    ],
    hilfe: ['hazard-ratio', 'cox-regression'], karte: 'kaplanmeier', belege: ['wissen:clark03-hazard-ratio', 'wissen:hernan10-hr-lesart', 'Clark u. a. 2003; Hernán 2010']
  },
  {
    id: 'med-b-absolut', thema: 'medizin', fall: 'med-lung',
    stamm: P(`Nach einem Jahr leben noch ${zd('ml_s_f', 3)} der Frauen und ${zd('ml_s_m', 3)} der Männer ohne Ereignis. Was zeigt das zusätzlich zur Hazard Ratio?`,
      `After one year ${ze('ml_s_f', 3)} of the women and ${ze('ml_s_m', 3)} of the men are still without the event. What does that show in addition to the hazard ratio?`),
    antworten: [
      a(P(`Den absoluten Unterschied: nach einem Jahr ${zp('ml_diff')} Prozentpunkte mehr Frauen ohne Ereignis`, `The absolute difference: after one year ${zp('ml_diff')} percentage points more women without the event`),
        P('Überlebenskurven zeigen absolute Anteile. Eine Hazard Ratio allein sagt nicht, wie groß der Unterschied in der Praxis ist.', 'Survival curves show absolute shares. A hazard ratio alone does not say how large the difference is in practice.'), true),
      a(P(`Die Hazard Ratio ${zd('ml_hr', 3)} besagt schon, dass ${zpr('ml_hr')} Prozent weniger Frauen sterben`, `The hazard ratio ${ze('ml_hr', 3)} already says that ${zpr('ml_hr')} percent fewer women die than men`),
        P('Die Hazard Ratio vergleicht Raten und ist keine Aussage über einen Anteil der Frauen, die sterben.', 'The hazard ratio compares rates and is no statement about a share of women who die.')),
      a(P(`Das Verhältnis ${zd('ml_s_f', 3)} zu ${zd('ml_s_m', 3)} (${zd('ml_quot', 2)}) ist selbst eine Hazard Ratio, nur anders ausgerechnet`, `The ratio ${ze('ml_s_f', 3)} to ${ze('ml_s_m', 3)} (${ze('ml_quot', 2)}) is itself a hazard ratio, just calculated in a different way`),
        P('Ein Verhältnis von Überlebensanteilen ist keine Hazard Ratio. Diese vergleicht momentane Raten über die Zeit.', 'A ratio of survival shares is not a hazard ratio. The hazard ratio compares instantaneous rates over time.'))
    ],
    hilfe: ['hazard-ratio', 'ueberlebensfunktion', 'kaplan-meier'], karte: 'kaplanmeier', belege: ['wissen:hernan10-ueberlebenskurven-absolut', 'wissen:clark03-anteil-ignoriert-dauer', 'Hernán 2010; Clark u. a. 2003']
  },
  {
    id: 'med-b-logrank', thema: 'medizin', fall: 'med-lung',
    stamm: P('Welche Frage beantwortet der Logrank-Test in der letzten Tabelle?', 'Which question does the log-rank test in the last table answer?'),
    antworten: [
      a(P('Ob die Überlebenskurven beider Gruppen zusammenpassen (Verhältnis der Ereignisraten gleich 1)', 'Whether the survival curves of both groups fit together (rate ratio equal to 1)'),
        P(`Zu jedem Ereigniszeitpunkt wird die erwartete mit der beobachteten Zahl verglichen. Das Chi-Quadrat ${zd('ml_chi', 2)} hat einen Freiheitsgrad.`, `At each event time the expected number is compared with the observed one. The chi-square ${ze('ml_chi', 2)} has one degree of freedom.`), true),
      a(P('Ob die mittleren Überlebenszeiten beider Gruppen in Tagen gleich groß sind, wie bei einem t-Test', 'Whether the mean survival times of both groups, in days, are equal, as in a t test'),
        P('Der Logrank-Test vergleicht den ganzen Verlauf der Kurven. Er vergleicht keinen Mittelwert.', 'The log-rank test compares the whole course of the curves. It compares no mean.')),
      a(P('Wie groß der Unterschied zwischen Männern und Frauen ist, in Tagen oder als Verhältnis', 'How large the difference between men and women is, in days or as a ratio'),
        P('Der Logrank-Test liefert einen p-Wert, aber keinen Schätzer der Effektgröße. Dafür dient zum Beispiel das Cox-Modell.', 'The log-rank test gives a p value but no estimate of the effect size. The Cox model serves for that, for example.'))
    ],
    hilfe: ['log-rank', 'kaplan-meier'], karte: 'kaplanmeier', belege: ['wissen:clark03-logrank', 'wissen:clark03-logrank-vs-median', 'Clark u. a. 2003']
  },
  // ---- Fall C: Heterogenität ----
  {
    id: 'med-c-i2', thema: 'medizin', fall: 'med-bcg',
    stamm: P(`Über alle ${zn('mb_k')} Studien ergibt sich I² = ${zd('mb_i2', 1)} Prozent. Wie ist das zu lesen?`, `Across all ${zn('mb_k')} studies I² = ${ze('mb_i2', 1)} percent. How is that to be read?`),
    antworten: [
      a(P(`Rund ${zd('mb_i2', 0)} Prozent der Streuung zwischen den Studien gehen auf echte Unterschiede zurück`, `About ${zd('mb_i2', 0)} percent of the variation between the studies is due to real differences`),
        P(`I² ist (Q minus Freiheitsgrade) durch Q, hier (${zd('mb_q', 2)} minus ${zn('mb_df')}) durch ${zd('mb_q', 2)}. Es ist ein Anteil der Variation, keine Zahl von Studien.`, `I² is (Q minus degrees of freedom) divided by Q, here (${ze('mb_q', 2)} minus ${zn('mb_df')}) divided by ${ze('mb_q', 2)}. It is a share of the variation, not a number of studies.`), true),
      a(P(`${zd('mb_i2', 0)} Prozent der Studien weichen deutlich vom Gesamtergebnis der Meta-Analyse ab`, `${zd('mb_i2', 0)} percent of the studies deviate clearly from the overall result of the meta-analysis`),
        P('I² zählt keine Studien. Es beschreibt, wie stark die Ergebnisse der Studien über den Zufall hinaus streuen.', 'I² does not count studies. It describes how strongly the study results vary beyond chance.')),
      a(P(`Mit ${zd('mb_i2', 0)} Prozent Wahrscheinlichkeit sind die Ergebnisse der Studien voneinander verschieden`, `With ${zd('mb_i2', 0)} percent probability the results of the studies differ from one another`),
        P('I² ist keine Wahrscheinlichkeit. Ob die Unterschiede über den Zufall hinausgehen, prüft der Heterogenitätstest mit einem p-Wert.', 'I² is not a probability. Whether the differences go beyond chance is tested by the heterogeneity test with a p value.'))
    ],
    hilfe: ['i-quadrat', 'frage-meta'], karte: 'meta', belege: ['wissen:higgins03-i2-formel', 'wissen:med-heterogenitaet-i2', 'Higgins und Thompson 2003']
  },
  {
    id: 'med-c-homogen', thema: 'medizin', fall: 'med-bcg',
    stamm: P(`Für die drei frühesten Studien liegt der Heterogenitätstest bei p = ${zd('mb_p3', 3)} und I² bei ${zd('mb_i23', 1)} Prozent. Was folgt daraus?`,
      `For the three earliest studies the heterogeneity test gives p = ${ze('mb_p3', 3)} and I² is ${ze('mb_i23', 1)} percent. What follows?`),
    antworten: [
      a(P('Homogenität ist damit nicht gezeigt: Bei drei Studien hat der Test wenig Power', 'Homogeneity is thereby not shown: with three studies the test has little power'),
        P('Der Test hat bei wenigen Studien geringe Power, und das Unsicherheitsintervall von I² ist breit. Ein hohes p ist kein Beweis der Homogenität.', 'With few studies the test has low power and the uncertainty interval of I² is wide. A large p is no proof of homogeneity.'), true),
      a(P(`Die Studien sind einheitlich, denn ein p über ${zd('bx_alpha', 2)} zeigt, dass die wahren Effekte gleich sind`, `The studies are consistent, since a p above ${ze('bx_alpha', 2)} shows that the true effects are equal`),
        P('Ein Test, der keine Abweichung findet, belegt keine Übereinstimmung. Das ist die häufigste Fehldeutung bei I² und Q.', 'A test that finds no deviation proves no agreement. This is the most common misreading of I² and Q.')),
      a(P(`Die Studien stimmen zu ${zd('mb_i23', 0)} Prozent überein, der Rest geht auf Zufall zurück`, `The studies agree to ${zd('mb_i23', 0)} percent, while all the rest is due to chance`),
        P(`I² von ${zd('mb_i23', 1)} Prozent nennt den Anteil der Variation, der über den Zufall hinausgeht, nicht den Anteil der Übereinstimmung.`, `I² of ${ze('mb_i23', 1)} percent gives the share of the variation that goes beyond chance, not the share of agreement.`))
    ],
    hilfe: ['i-quadrat', 'tau-quadrat', 'forest-plot'], karte: 'meta', belege: ['wissen:higgins03-q-power', 'wissen:higgins03-i2-eigenschaften', 'wissen:med-heterogenitaet-i2', 'Higgins und Thompson 2003']
  },

  // ---- Fixed-Effect und Random-Effects (Stand 01.11.2026, dritte Charge) ----
  {
    id: 'med-c-q', thema: 'medizin', fall: 'med-bcg2', karte: 'meta',
    stamm: P(`Der Heterogenitätstest der ${zn('m2_k')} Studien gibt Q = ${zd('m2_q', 2)} bei ${zn('m2_df')} Freiheitsgraden (zweite Tabelle). Was wird damit geprüft?`, `The heterogeneity test of the ${zn('m2_k')} studies gives Q = ${ze('m2_q', 2)} with ${zn('m2_df')} degrees of freedom (second table). What is tested?`),
    antworten: [
      a(P('Ob alle Studien denselben Effekt schätzen (Chi-Quadrat mit k minus 1 Freiheitsgraden)', 'Whether all studies estimate the same effect (chi-square with k minus 1 degrees of freedom)'),
        P(`Q summiert die gewichteten quadrierten Abweichungen der Studienschätzer vom gemeinsamen Schätzer. Bei ${zn('m2_k')} Studien sind es ${zn('m2_df')} Freiheitsgrade.`,
          `Q sums the weighted squared deviations of the study estimates from the common estimate. With ${zn('m2_k')} studies there are ${zn('m2_df')} degrees of freedom.`), true),
      a(P('Ob der gemeinsame Effekt aller Studien von null verschieden ist, also signifikant', 'Whether the common effect of all studies differs from zero, that is, is significant'),
        P('Das prüft ein Test des Gesamtwerts. Q fragt nach Unterschieden zwischen den Studien.', 'That is tested by a test of the overall value. Q asks about differences between the studies.')),
      a(P('Wie viel Prozent der Streuung auf echte Unterschiede zurückgehen; Q ist dieser Prozentwert', 'How many percent of the variation are due to real differences between studies; Q is that percentage'),
        P(`Das misst I², nicht Q. Q ist eine Summe gewichteter Abweichungsquadrate (hier ${zd('m2_q', 2)}) und wird mit einer Chi-Quadrat-Verteilung verglichen.`, `That is measured by I², not Q. Q is a sum of weighted squared deviations (here ${ze('m2_q', 2)}) and is compared with a chi-square distribution.`))
    ],
    hilfe: ['heterogenitaet', 'i-quadrat'], belege: ['wissen:higgins03-q-test']
  },
  {
    id: 'med-c-modell', thema: 'medizin', fall: 'med-bcg2', karte: 'meta',
    stamm: P(`Die erste Tabelle zeigt für dieselben Studien den Gesamtwert nach dem Fixed-Effect- und dem Random-Effects-Modell. Wie ist der Gesamtwert ${zd('m2_re', 2)} des Random-Effects-Modells zu lesen?`,
      `The first table shows for the same studies the overall value under the fixed-effect and the random-effects model. How is the overall value ${ze('m2_re', 2)} of the random-effects model to be read?`),
    antworten: [
      a(P('Als Mittelwert der Effekte, die von Studie zu Studie verschieden sein dürfen', 'As the mean of the effects, which may differ from study to study'),
        P(`Das Modell lässt zu, dass sich die wahren Effekte unterscheiden (Zwischenstudienvarianz ${zd('m2_tau2', 3)}). Der Gesamtwert ist deren Mittel; sein Intervall (${zd('m2_rel', 2)} bis ${zd('m2_reh', 2)}) ist breiter als das des Fixed-Effect-Modells (${zd('m2_fel', 2)} bis ${zd('m2_feh', 2)}).`,
          `The model allows the true effects to differ (between-study variance ${ze('m2_tau2', 3)}). The overall value is their mean; its interval (${ze('m2_rel', 2)} to ${ze('m2_reh', 2)}) is wider than that of the fixed-effect model (${ze('m2_fel', 2)} to ${ze('m2_feh', 2)}).`), true),
      a(P('Als der gemeinsame Effekt, den alle Studien schätzen', 'As the common effect that all studies estimate'),
        P('Einen gemeinsamen Effekt nimmt das Fixed-Effect-Modell an. Beim Random-Effects-Modell ist die Zusammenfassung der Mittelwert verschiedener Effekte.', 'A common effect is assumed by the fixed-effect model. In the random-effects model the summary is the mean of different effects.')),
      a(P(`Als der bessere Wert gegenüber ${zd('m2_fe', 2)}, weil er kleiner ausfällt und die Impfung stärker wirken lässt`, `As the better value compared with ${ze('m2_fe', 2)}, because it comes out smaller and makes the vaccination look more effective`),
        P(`Welches Modell passt, folgt aus der Annahme über die Studien, nicht aus dem günstigeren Ergebnis. Die beiden Gesamtwerte (${zd('m2_fe', 2)} und ${zd('m2_re', 2)}) beantworten verschiedene Fragen.`,
          `Which model fits follows from the assumption about the studies, not from the more favourable result. The two overall values (${ze('m2_fe', 2)} and ${ze('m2_re', 2)}) answer different questions.`))
    ],
    hilfe: ['random-effects-modell', 'fixed-effect-modell'], belege: ['wissen:riley11-fixed-random-modell']
  },
  {
    id: 'med-c-praed', thema: 'medizin', fall: 'med-bcg2', karte: 'meta',
    stamm: P(`Das Prädiktionsintervall des Random-Effects-Modells reicht von ${zd('m2_pil', 2)} bis ${zd('m2_pih', 2)}, das Konfidenzintervall von ${zd('m2_rel', 2)} bis ${zd('m2_reh', 2)}. Wie unterscheiden sich beide?`,
      `The prediction interval of the random-effects model ranges from ${ze('m2_pil', 2)} to ${ze('m2_pih', 2)}, the confidence interval from ${ze('m2_rel', 2)} to ${ze('m2_reh', 2)}. How do they differ?`),
    antworten: [
      a(P('Das Konfidenzintervall betrifft das Mittel, das Prädiktionsintervall den Effekt in einem neuen Setting', 'The confidence interval concerns the mean, the prediction interval the effect in a new setting'),
        P('Die Breite des Prädiktionsintervalls enthält die Unsicherheit des Mittels, die Streuung der wahren Effekte (tau) und die Unsicherheit dieser Schätzung. Darum ist es hier deutlich breiter.',
          'The width of the prediction interval contains the uncertainty of the mean, the spread of the true effects (tau) and the uncertainty of this estimate. That is why it is clearly wider here.'), true),
      a(P('Das Konfidenzintervall sagt, in welchem Bereich der Effekt in einem einzelnen Setting liegt', 'The confidence interval says in which range the effect lies in a single setting'),
        P('Das Konfidenzintervall zeigt nur die Unsicherheit des Mittels. Für ein einzelnes Setting ist das Prädiktionsintervall gedacht.', 'The confidence interval shows only the uncertainty of the mean. The prediction interval is meant for a single setting.')),
      a(P('Das Prädiktionsintervall ist ein zweites Konfidenzintervall für dasselbe Mittel, nur zu einem anderen Niveau', 'The prediction interval is a second confidence interval for the same mean, only at a different level'),
        P('Es beschreibt nicht das Mittel, sondern den Effekt in einer einzelnen Anwendung. Seine Breite berücksichtigt zusätzlich die Streuung der wahren Effekte.', 'It does not describe the mean but the effect in a single application. Its width additionally takes the spread of the true effects into account.'))
    ],
    hilfe: ['praediktionsintervall', 'random-effects-modell'], belege: ['wissen:riley11-praediktionsintervall']
  },
  {
    id: 'med-c-mehrfach', thema: 'medizin', fall: 'med-bcg2', mehrfach: true, karte: 'meta',
    stamm: P('Welche Aussagen zur Meta-Analyse und zu den Tabellen stimmen? Mehrere können stimmen.', 'Which statements about the meta-analysis and the tables are correct? Several may be correct.'),
    antworten: [
      a(P('Ein Prädiktionsintervall lässt sich erst ab drei Studien berechnen', 'A prediction interval can be computed only from three studies'),
        P(`Das Intervall der Tabelle beruht auf ${zn('m2_k')} Studien; es passt am besten, wenn die Studien ein geringes Verzerrungsrisiko haben. Es nutzt eine t-Verteilung mit k minus 2 Freiheitsgraden, darum braucht es mindestens drei Studien.`, `The interval in the table rests on ${zn('m2_k')} studies; it fits best when the studies have a low risk of bias. It uses a t distribution with k minus 2 degrees of freedom, so it needs at least three studies.`), true),
      a(P(`Q hat bei ${zn('m2_k')} Studien ${zn('m2_df')} Freiheitsgrade`, `With ${zn('m2_k')} studies Q has ${zn('m2_df')} degrees of freedom`),
        P('Die Freiheitsgrade sind die Zahl der Studien minus 1.', 'The degrees of freedom are the number of studies minus 1.'), true),
      a(P('Mit den p-Werten des Heterogenitätstests lässt sich vergleichen, auf welcher Skala die Studien einheitlicher sind', 'With the p values of the heterogeneity test one can compare on which scale the studies are more consistent'),
        P('Der p-Wert hängt auch von der Zahl der Studien ab und eignet sich dafür nicht. Auch I² ist nur mit Vorsicht vergleichbar, denn es wächst mit der Größe der Studien.', 'The p value also depends on the number of studies and is unsuitable for this. I² too is comparable only with caution, since it grows with study size.')),
      a(P('Das Gesamtergebnis des Random-Effects-Modells ist der gemeinsame Effekt aller Studien', 'The overall result of the random-effects model is the common effect of all studies'),
        P('Das Random-Effects-Modell lässt verschiedene wahre Effekte zu; sein Gesamtergebnis ist deren Mittel, kein gemeinsamer Effekt.', 'The random-effects model allows different true effects; its overall result is their mean, not a common effect.'))
    ],
    hilfe: ['praediktionsintervall', 'heterogenitaet'], belege: ['wissen:riley11-praediktionsintervall', 'wissen:higgins03-q-test', 'wissen:higgins03-p-wert-skalen', 'wissen:riley11-fixed-random-modell']
  },
];
