/**
 * Üben: Daten prüfen und sauber auswerten (Pseudoreplikation und gemischte Modelle, Ausreißer, Residuen, Wechselwirkung, Effektgrößen).
 * Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R,
 * Daten: nlme::Orthodont, datasets::airquality, iris, ToothGrowth, sleep, mtcars). Nur was in wissen.json belegt ist.
 * Mein Fachgebiet: Biologie und Naturwissenschaften (Karte Mehrebenen), nur vermerkt.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, zd, ze, zn, zp } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const MM = ['frage-mehrebenen', 'icc-mehrebenen'];

const QUELLE_KIND = P(
  `Daten: nlme::Orthodont (Potthoff und Roy 1964; Paket nlme, Lizenz GPL), ${zn('bk_kinder')} Kinder, je ${zn('bk_mess')}-mal gemessen, ${zn('bk_n')} Werte. Welch-Test, Test der Kindermittel und gemischtes Modell, berechnet mit R.`,
  `Data: nlme::Orthodont (Potthoff and Roy 1964; package nlme, licence GPL), ${zn('bk_kinder')} children, each measured ${zn('bk_mess')} times, ${zn('bk_n')} values. Welch test, test of the child means and mixed model, computed with R.`);
const QUELLE_OZON = P(
  `Daten: datasets::airquality (New Yorker Luftmessungen Mai bis September 1973, Chambers u. a. 1983; Teil von R, Lizenz GPL), ${zn('bo_n')} Tage mit Ozonmessung. Berechnet mit R.`,
  `Data: datasets::airquality (New York air measurements May to September 1973, Chambers et al. 1983; part of R, licence GPL), ${zn('bo_n')} days with an ozone measurement. Computed with R.`);
const QUELLE_IRIS = P(
  'Daten: datasets::iris (Anderson 1935, Fisher 1936; Teil von R, Lizenz GPL), 150 Schwertlilien dreier Arten. Shapiro-Wilk-Test, berechnet mit R.',
  'Data: datasets::iris (Anderson 1935, Fisher 1936; part of R, licence GPL), 150 irises of three species. Shapiro-Wilk test, computed with R.');
const QUELLE_ZAHN = P(
  'Daten: datasets::ToothGrowth (Bliss 1952; Teil von R, Lizenz GPL), 60 Meerschweinchen, Zahnlänge nach Vitamin C als Orangensaft (OJ) oder Ascorbinsäure (VC) in drei Dosen. Varianzanalyse, berechnet mit R.',
  'Data: datasets::ToothGrowth (Bliss 1952; part of R, licence GPL), 60 guinea pigs, tooth length after vitamin C as orange juice (OJ) or ascorbic acid (VC) in three doses. Analysis of variance, computed with R.');
const QUELLE_SCHLAF = P(
  `Daten: datasets::sleep (Cushny und Peebles 1905, von Student 1908 ausgewertet; Teil von R, Lizenz GPL), Zusatzschlaf von ${zn('bs_n')} Personen mit zwei Schlafmitteln. Berechnet mit R.`,
  `Data: datasets::sleep (Cushny and Peebles 1905, analysed by Student 1908; part of R, licence GPL), extra sleep of ${zn('bs_n')} people with two sleeping drugs. Computed with R.`);
const QUELLE_AUTO = P(
  'Daten: datasets::mtcars (Henderson und Velleman 1981; Teil von R, Lizenz GPL), 32 Wagen, Verbrauch in Meilen je Gallone gegen Gewicht. Berechnet mit R.',
  'Data: datasets::mtcars (Henderson and Velleman 1981; part of R, licence GPL), 32 cars, fuel use in miles per gallon against weight. Computed with R.');

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'bio-kind': {
    titel: P(`Abstand zweier Punkte im Schädel (Millimeter) bei ${zn('bk_kinder')} Kindern, je ${zn('bk_mess')}-mal gemessen (mit 8, 10, 12 und 14 Jahren). Verglichen werden Jungen und Mädchen; die erste Zeile zählt alle ${zn('bk_n')} Werte als unabhängig`,
      `Distance between two points in the skull (millimetres) in ${zn('bk_kinder')} children, each measured ${zn('bk_mess')} times (at 8, 10, 12 and 14 years). Boys and girls are compared; the first row counts all ${zn('bk_n')} values as independent`),
    tabellen: [
      tab('bio-kind.0', [P('Rechnung', 'Calculation'), P('Zahl der Werte', 'Number of values'), P('Unterschied (Jungen minus Mädchen)', 'Difference (boys minus girls)'), P('Standardfehler', 'Standard error'), P('95-%-Intervall unten', '95% interval lower'), P('95-%-Intervall oben', '95% interval upper'), P('Sig.', 'Sig.')], QUELLE_KIND,
        P('Independent = Welch-Test mit allen Werten; Child means = Test mit einem Mittelwert je Kind; Mixed model = Zufallseffekt je Kind', 'Independent = Welch test with all values; Child means = test with one mean per child; Mixed model = random effect for each child'))
    ]
  },
  'bio-schlaf': {
    titel: P(`Zusatzschlaf (Stunden) bei denselben ${zn('bs_n')} Personen mit zwei Schlafmitteln. Der Unterschied der Mittel ist ${zd('bs_diff', 2)} Stunden; gerechnet wird einmal wie bei unabhängigen Gruppen (Welch) und einmal gepaart`,
      `Extra sleep (hours) in the same ${zn('bs_n')} people with two sleeping drugs. The difference of the means is ${ze('bs_diff', 2)} hours; it is calculated once as for independent groups (Welch) and once paired`),
    tabellen: [
      tab('bio-schlaf.0', [P('Auswertung', 'Analysis'), P('Unterschied der Mittel', 'Difference of the means'), P('95-%-Intervall unten', '95% interval lower'), P('95-%-Intervall oben', '95% interval upper'), P('Sig.', 'Sig.')], QUELLE_SCHLAF, P('Unterschied mit Intervall', 'Difference with interval')),
      tab('bio-schlaf.1', [P('d mit der Formel für unabhängige Gruppen, auf den gepaarten t-Wert angewendet', 'd with the formula for independent groups, applied to the paired t value'), P('d mit Berücksichtigung der Korrelation der Messungen', 'd taking the correlation of the measurements into account'), P('d aus den Rohwerten (gemeinsame Streuung)', 'd from the raw values (pooled spread)')], QUELLE_SCHLAF, P('Drei Wege zur Effektgröße d (Beträge)', 'Three ways to the effect size d (absolute values)'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Fall A: Messungen am selben Kind ----
  {
    id: 'bio-a-pseudo', thema: 'biologie', fall: 'bio-kind',
    stamm: P(`Dieselben ${zn('bk_kinder')} Kinder wurden je ${zn('bk_mess')}-mal gemessen. Die erste Zeile rechnet mit allen ${zn('bk_n')} Werten, die zweite mit einem Mittelwert je Kind. Warum fällt der Standardfehler in der ersten Zeile viel kleiner aus?`,
      `The same ${zn('bk_kinder')} children were each measured ${zn('bk_mess')} times. The first row calculates with all ${zn('bk_n')} values, the second with one mean per child. Why is the standard error in the first row much smaller?`),
    antworten: [
      a(P('Messungen desselben Kindes ähneln einander und zählen nicht als unabhängige Information', 'Values from one child resemble each other and are not independent information'),
        P(`Zeile 1 erreicht den Standardfehler ${zd('bk_se_w', 2)}, die Kindermittel ${zd('bk_se_k', 2)}. Das Kind als Gruppe zu ignorieren heißt nach Bolker u. a. Pseudoreplikation: abhängige Werte werden wie unabhängige behandelt. Nach Zuur u. a. steigt dann der Fehler 1. Art.`, `Row 1 reaches the standard error ${ze('bk_se_w', 2)}, the child means ${ze('bk_se_k', 2)}. Ignoring the child as a group is called pseudoreplication by Bolker et al.: dependent values are treated as independent. According to Zuur et al. the type I error then rises.`), true),
      a(P('Mit 108 Werten ist die Schätzung wirklich genauer, die zweite Zeile verschenkt Information', 'With 108 values the estimate really is more precise, the second row wastes information'),
        P(`Messungen am selben Kind sind nicht unabhängig. Die Genauigkeit des Gruppenvergleichs hängt an den ${zn('bk_kinder')} Kindern, nicht an den ${zn('bk_n')} Werten.`, `Measurements on the same child are not independent. The precision of the group comparison depends on the ${zn('bk_kinder')} children, not on the ${zn('bk_n')} values.`)),
      a(P('Die zweite Zeile nutzt einen anderen Test, der grundsätzlich breitere Intervalle liefert', 'The second row uses a different kind of test, which in general gives wider intervals'),
        P(`Der Test ist ein gewöhnlicher t-Test. Breiter wird das Intervall, weil die Stichprobe nun tatsächlich aus ${zn('bk_kinder')} Kindern besteht.`, `The test is an ordinary t test. The interval becomes wider because the sample now actually consists of ${zn('bk_kinder')} children.`))
    ],
    hilfe: MM, karte: 'mehrebenen', belege: ['wissen:zuur10-unabhaengigkeit', 'wissen:bolker09-glmm-begriff', 'Zuur u. a. 2010; Bolker u. a. 2009 (Begriff Pseudoreplikation nach Bolker u. a. S. 127)']
  },
  {
    id: 'bio-a-modell', thema: 'biologie', fall: 'bio-kind',
    stamm: P(`Welcher Weg nutzt alle ${zn('bk_n')} Messungen und berücksichtigt zugleich, dass sie zu ${zn('bk_kinder')} Kindern gehören?`, `Which approach uses all ${zn('bk_n')} measurements and at the same time takes into account that they belong to ${zn('bk_kinder')} children?`),
    antworten: [
      a(P('Ein gemischtes Modell, das jedem Kind einen eigenen Zufallseffekt gibt und alle Werte nutzt', 'A mixed model that gives each child its own random effect and uses all values'),
        P(`Die dritte Zeile liefert hier denselben Standardfehler wie der Test der Kindermittel, ${zd('bk_se_k', 2)}, weil jedes Kind gleich oft gemessen wurde. Rund ${zp('bk_icc')} Prozent der Streuung, die das Geschlecht übrig lässt, liegen zwischen den Kindern.`, `The third row gives the same standard error here as the test of the child means, ${ze('bk_se_k', 2)}, because every child was measured equally often. About ${zp('bk_icc')} percent of the variation left after sex lies between the children.`), true),
      a(P('Die Werte als unabhängig behandeln und den p-Wert danach mit der Bonferroni-Korrektur vergrößern', 'Treat the values as independent and then enlarge the p value with the Bonferroni correction'),
        P('Die Bonferroni-Korrektur gleicht mehrere Tests aus. Die Abhängigkeit der Messungen am selben Kind löst sie nicht.', 'The Bonferroni correction compensates for several tests. It does not solve the dependence of measurements on the same child.')),
      a(P('Je Kind noch mehr Messungen erheben, bis der Standardfehler klein genug ist', 'Take even more measurements per child until the standard error is small enough'),
        P('Mehr Messungen am selben Kind machen die Werte nicht unabhängiger. Gewonnen wird erst durch mehr Kinder.', 'More measurements on the same child do not make the values more independent. Something is gained only by more children.'))
    ],
    hilfe: MM, karte: 'mehrebenen', belege: ['wissen:zuur10-unabhaengigkeit', 'wissen:bolker09-glmm-begriff', 'wissen:bolker09-ml-reml', 'Zuur u. a. 2010; Bolker u. a. 2009']
  },
  // ---- Einzelfragen ----
  {
    id: 'bio-explor', thema: 'biologie',
    stamm: P(`Aus ${zn('bx_k')} gemessenen Merkmalen werden alle ${zn('bx_paare')} Paare auf Zusammenhang getestet, und der auffälligste wird als Befund berichtet. Wie ist das einzuordnen?`,
      `Of ${zn('bx_k')} measured attributes all ${zn('bx_paare')} pairs are tested for a relationship, and the most conspicuous one is reported as a finding. How is that to be classified?`),
    antworten: [
      a(P('Als Hinweis auf eine Hypothese, die an unabhängigen Daten erst zu prüfen ist', 'As a pointer to a hypothesis that still has to be tested on independent data'),
        P(`Bei ${zn('bx_paare')} Tests sind bei einem Niveau von ${zd('bx_alpha', 2)} rund ${zd('bx_erwartet', 1)} Zusammenhänge allein durch Zufall auffällig. Exploration erzeugt Hypothesen, getestet wird getrennt davon.`, `With ${zn('bx_paare')} tests about ${ze('bx_erwartet', 1)} relationships are conspicuous by chance alone at a level of ${ze('bx_alpha', 2)}. Exploration generates hypotheses, testing is done separately.`), true),
      a(P(`Als Beleg, wenn der p-Wert unter ${zd('bx_alpha', 2)} liegt, denn das gilt für jeden einzelnen Test`, `As evidence if the p value is below ${ze('bx_alpha', 2)}, since that holds for each single test`),
        P('Der p-Wert gilt für einen vorab festgelegten Test. Wer unter vielen Tests den kleinsten wählt, hat die Fehlerrate nicht mehr im Griff.', 'The p value holds for one test fixed in advance. Whoever picks the smallest of many tests no longer controls the error rate.')),
      a(P('Als gesicherten Befund, weil so viele Tests sehr viel Information liefern', 'As a secured finding, because so many tests yield a great deal of information'),
        P('Viele Tests liefern viele Gelegenheiten für Zufallsbefunde, nicht mehr Sicherheit für den einen gewählten.', 'Many tests provide many opportunities for chance findings, not more certainty for the one picked.'))
    ],
    hilfe: ['signifikanz', 'p-wert'], belege: ['wissen:zuur10-exploration-vs-test', 'wissen:alpha-kumulierung', 'wissen:dormann-multiple-tests', 'Zuur u. a. 2010']
  },
  {
    id: 'bio-ozon', thema: 'biologie',
    stamm: P(`Der Boxplot der Ozonwerte zeigt ${zn('bo_aussen')} Punkte oberhalb der Whisker. Wie geht man sinnvoll damit um?`, `The box plot of the ozone values shows ${zn('bo_aussen')} points above the whiskers. What is a sensible way to deal with them?`),
    tabelle: tab('bio-ozon', [P('Tage', 'Days'), P('Median', 'Median'), P('Obere Boxgrenze (Boxplot)', 'Upper box edge (boxplot)'), P('Größter Wert innerhalb der Whisker', 'Largest value within the whiskers'), P('Punkte oberhalb der Whisker', 'Points above the whiskers'), P('Größter Wert', 'Largest value')], QUELLE_OZON, P('Ozonwerte in ppb (Milliardstel)', 'Ozone values in ppb (parts per billion)')),
    antworten: [
      a(P('Auf Mess- oder Erfassungsfehler prüfen, nur dann löschen und den Umgang berichten', 'Check for recording errors, delete only then and report how they were handled'),
        P(`Punkte außerhalb der Whisker sind nicht automatisch Ausreißer. Die Verteilung ist stark rechtsschief (Schiefe ${zd('bo_schiefe', 2)}), hohe Werte kommen dort vor.`, `Points outside the whiskers are not automatically outliers. The distribution is strongly right-skewed (skewness ${ze('bo_schiefe', 2)}), high values occur there.`), true),
      a(P('Löschen, denn Punkte außerhalb der Whisker gelten schlicht als Ausreißer der Daten', 'Delete them, since points outside the whiskers simply count as outliers of the data'),
        P('Das routinemäßige Löschen ist ein bekannter Fehler. Werte werden nur entfernt, wenn sie wahrscheinlich auf einem Fehler beruhen.', 'Routine deletion is a known mistake. Values are removed only if they probably rest on an error.')),
      a(P('Durch den Median ersetzen, damit sie den Mittelwert und die Streuung nicht verzerren', 'Replace them by the median so that they do not distort the mean and the spread'),
        P('Ersetzen verändert die Daten ohne Grund im Messprozess. Einzelne Werte werden nicht passend gemacht. Bei schiefen Daten helfen eine Transformation aller Werte (zum Beispiel Logarithmus) oder eine Verteilung mit mehr Streuung bei großen Mittelwerten.', 'Replacing changes the data without a reason in the measuring process. Single values are not adjusted to fit. For skewed data, transforming all values (for example a logarithm) or a distribution with more spread at large means helps.'))
    ],
    hilfe: ['ausreisser'], belege: ['wissen:zuur10-ausreisser', 'Zuur u. a. 2010']
  },
  {
    id: 'bio-resid', thema: 'biologie',
    stamm: P('Die Länge der Kelchblätter wird zwischen den drei Arten verglichen. Auf was bezieht sich die Annahme der Normalverteilung in der Regression?', 'The length of the sepals is compared between the three species. To what does the assumption of a normal distribution in regression refer?'),
    tabelle: tab('bio-resid', [P('Werte', 'Values'), P('Shapiro-Wilk W', 'Shapiro-Wilk W'), P('Sig.', 'Sig.')], QUELLE_IRIS, P('Test auf Normalverteilung: Raw = alle Rohwerte, Residuals = Abweichungen vom Mittel der jeweiligen Art', 'Test for normal distribution: Raw = all raw values, Residuals = deviations from the mean of the species')),
    antworten: [
      a(P('Auf die Residuen, also die Abweichungen der Pflanzen vom Mittel ihrer Art', 'To the residuals, that is the deviations from the mean of the respective species'),
        P(`Die Rohwerte vermischen die Arten und können schief aussehen (Sig. ${zd('br_p_roh', 3)}), obwohl die Residuen passen (Sig. ${zd('br_p_res', 3)}).`, `The raw values mix the species and can look skewed (Sig. ${ze('br_p_roh', 3)}) although the residuals fit (Sig. ${ze('br_p_res', 3)}).`), true),
      a(P(`Auf die Rohwerte der 150 Pflanzen; Sig. ${zd('br_p_roh', 3)} ist darum ein Problem für die Rechnung`, `To the raw values of the 150 plants; Sig. ${ze('br_p_roh', 3)} is therefore a problem`),
        P('Die Annahme gilt den Beobachtungen bei jedem Wert der Einflussgröße, praktisch den Residuen. Gruppenunterschiede können die Rohwerte schief machen.', 'The assumption refers to the observations at each value of the predictor, in practice the residuals. Group differences can make the raw values skewed.')),
      a(P('Auf die Mittelwerte der drei Arten; die Einzelwerte brauchen keine Verteilung', 'To the means of the three species; the single values need no particular distribution'),
        P('Die Annahme betrifft die Abweichungen der Einzelwerte vom Modell, nicht die Gruppenmittel.', 'The assumption concerns the deviations of the single values from the model, not the group means.'))
    ],
    hilfe: ['normalverteilung-pruefen', 'qq-diagramm'], belege: ['wissen:zuur10-normalitaet', 'Zuur u. a. 2010']
  },
  {
    id: 'bio-inter', thema: 'biologie',
    stamm: P(`Angenommen, ein Ergebnis mit Sig. unter 0,05 gilt als signifikant. Die Linien für OJ und VC verlaufen über die drei Dosen mit verschiedener Steigung (Wechselwirkung F = ${zd('bi_F', 2)}, Sig. ${zd('bi_p', 3)}). Was heißt das für die Deutung der Zufuhrart?`,
      `Suppose a result with Sig. below 0.05 counts as significant. The lines for OJ and VC run across the three doses with different slopes (interaction F = ${ze('bi_F', 2)}, Sig. ${ze('bi_p', 3)}). What does that mean for interpreting the form of supply?`),
    tabelle: tab('bio-inter', [P('F', 'F'), P('Freiheitsgrade des Effekts', 'Degrees of freedom of the effect'), P('Freiheitsgrade der Residuen', 'Degrees of freedom of the residuals'), P('Sig.', 'Sig.')], QUELLE_ZAHN, P('Zeile Zufuhrart mal Dosis der Varianzanalyse', 'Row supply form times dose of the analysis of variance')),
    antworten: [
      a(P('Die Wirkung der Zufuhrart hängt von der Dosis ab; ein Haupteffekt allein beschreibt das Muster nicht', 'The effect of the form of supply depends on the dose; one main effect alone does not describe the pattern'),
        P('Verschiedene Steigungen zeigen, dass die Wirkung nicht für alle Dosen gleich ist. Nach Dormann zeigt die Signifikanz der Wechselwirkung, dass die Haupteffekte allein das Muster nicht erklären.', 'Different slopes show that the effect is not the same for all doses. According to Dormann the significance of the interaction shows that the main effects alone do not explain the pattern.'), true),
      a(P('Der Haupteffekt der Zufuhrart gilt für jede Dosis gleich und wird deshalb getrennt berichtet', 'The main effect of the form of supply holds equally for each dose and is therefore reported separately'),
        P('Verschiedene Steigungen sagen gerade, dass er nicht für alle Dosen gleich ist.', 'Different slopes say precisely that it is not the same for all doses.')),
      a(P('Die Wechselwirkung belegt ein Zusammenwirken von Zufuhrart und Dosis, ein nichtlinearer Dosiseffekt entfällt', 'The interaction shows form of supply and dose acting together, a non-linear dose effect is thereby ruled out'),
        P('Eine Wechselwirkung kann auch auf einen nicht modellierten nichtlinearen Effekt zurückgehen. Deshalb gehören nichtlineare Effekte mit ins Modell.', 'An interaction can also be due to an unmodelled non-linear effect. That is why non-linear effects belong in the model too.'))
    ],
    hilfe: ['zweifaktorielle-varianzanalyse'], belege: ['wissen:dormann-interaktion', 'wissen:dormann-interaktion-deuten', 'wissen:dormann-scheininteraktion', 'Dormann 2013']
  },
  // ---- Fall B: Schlaf und Effektgröße ----
  {
    id: 'bio-b-ki', thema: 'biologie', fall: 'bio-schlaf',
    stamm: P(`Beim Welch-Test ist Sig. ${zd('bs_p_w', 3)}, beim gepaarten Test ${zd('bs_p_g', 3)}, bei demselben Unterschied. Was sagt Sig. ${zd('bs_p_w', 3)} über den Unterschied?`,
      `The Welch test has Sig. ${ze('bs_p_w', 3)}, the paired test ${ze('bs_p_g', 3)}, for the same difference. What does Sig. ${ze('bs_p_w', 3)} say about the difference?`),
    antworten: [
      a(P(`Offen: Das Intervall von ${zd('bs_lo_w', 2)} bis ${zd('bs_hi_w', 2)} schließt kleine und große Unterschiede ein`, `It is open: the interval from ${ze('bs_lo_w', 2)} to ${ze('bs_hi_w', 2)} includes small and quite large differences`),
        P(`Ein Ergebnis über ${zd('bx_alpha', 2)} ist „nicht schlüssig“, kein Beleg für „kein Effekt“. Der gepaarte Weg nutzt, dass dieselben Personen beide Mittel nahmen.`, `A result above ${ze('bx_alpha', 2)} is „inconclusive“, no evidence of „no effect“. The paired approach uses the fact that the same people took both drugs.`), true),
      a(P(`Es gibt keinen Unterschied, denn Sig. liegt über ${zd('bx_alpha', 2)} und damit über der Grenze der Signifikanz`, `There is no difference, since Sig. is above ${ze('bx_alpha', 2)} and therefore above the line of significance`),
        P(`Ein Wert über der Schwelle belegt nicht die Nullhypothese. Der Mittelwertunterschied ist in beiden Rechnungen ${zd('bs_diff', 2)}.`, `A value above the threshold does not prove the null hypothesis. The difference of the means is ${ze('bs_diff', 2)} in both calculations.`)),
      a(P(`Der Unterschied ist kleiner als beim gepaarten Test, wo Sig. ${zd('bs_p_g', 3)} ist`, `The difference is smaller than in the paired test, where Sig. is ${ze('bs_p_g', 3)}`),
        P('Der p-Wert ist kein Maß der Größe des Unterschieds. Der Unterschied der Mittel ist in beiden Zeilen gleich, nur die Unsicherheit unterscheidet sich.', 'The p value is no measure of the size of the difference. The difference of the means is the same in both rows, only the uncertainty differs.'))
    ],
    hilfe: ['konfidenzintervall', 'effektstaerke'], belege: ['wissen:nakagawa07-effekt-und-ki', 'wissen:nicht-signifikant-kein-beleg', 'Nakagawa und Cuthill 2007']
  },
  {
    id: 'bio-b-d', thema: 'biologie', fall: 'bio-schlaf',
    stamm: P(`Aus dem gepaarten t-Wert wird d berechnet. Warum liefert die Formel für unabhängige Gruppen ${zd('bs_d_naiv', 2)}, die Rechnung mit der Korrelation aber ${zd('bs_d_korr', 2)}?`,
      `d is calculated from the paired t value. Why does the formula for independent groups give ${ze('bs_d_naiv', 2)}, but the calculation with the correlation ${ze('bs_d_korr', 2)}?`),
    antworten: [
      a(P(`Die Formel für unabhängige Gruppen ignoriert die Korrelation (${zd('bs_r12', 2)}) der Messungen und bläht d auf`, `The formula for independent groups ignores the correlation (${ze('bs_r12', 2)}) of the measurements and inflates d`),
        P(`Die Rechnung mit der Korrelation liegt mit ${zd('bs_d_korr', 2)} nahe bei d aus den Rohwerten, ${zd('bs_d_roh', 2)}.`, `The calculation with the correlation, ${ze('bs_d_korr', 2)}, lies close to d from the raw values, ${ze('bs_d_roh', 2)}.`), true),
      a(P('Die Formel für unabhängige Gruppen ist die genauere, die zweite verkleinert d absichtlich, um vorsichtig zu sein', 'The formula for independent groups is the more exact one, the second reduces d on purpose to be cautious'),
        P('Für gepaarte Daten ist die zweite Rechnung die passende. Die erste bläht die Effektgröße unbeabsichtigt auf.', 'For paired data the second calculation is the fitting one. The first inflates the effect size unintentionally.')),
      a(P('Bei 10 Personen halbiert die Korrektur nach Hedges den Wert, die zweite Rechnung enthält sie', 'With 10 people the Hedges correction halves the value, the second calculation includes it'),
        P('Die Hedges-Korrektur verändert d bei dieser Größe nur wenig. Der Unterschied kommt aus der Korrelation der Messungen.', 'The Hedges correction changes d only slightly at this size. The difference comes from the correlation of the measurements.'))
    ],
    hilfe: ['effektstaerke', 'gepaarte-messung'], probieren: 'effekt', belege: ['wissen:nakagawa07-d-gepaart', 'wissen:nakagawa07-d-aus-t', 'wissen:effekt-dz-korrelation', 'Nakagawa und Cuthill 2007']
  },
  {
    id: 'bio-effstat', thema: 'biologie',
    stamm: P('Das Ergebnis hat zwei Ausgänge (Pflanze überlebt oder stirbt), die Einflussgröße heißt „Standort A oder B“. Welche Effektstatistik passt?', 'The outcome has two results (plant survives or dies), the predictor is „site A or B“. Which effect statistic fits?'),
    antworten: [
      a(P('Das Odds Ratio', 'The odds ratio'),
        P('Bei einer Antwort mit zwei Ausgängen ist das Odds Ratio die übliche Wahl. Zusammen mit dem Konfidenzintervall zeigt es Größe und Unsicherheit.', 'For an outcome with two results the odds ratio is the usual choice. Together with the confidence interval it shows size and uncertainty.'), true),
      a(P('Die Korrelation r', 'The correlation r'),
        P('r passt, wenn zwei stetige Variablen vorliegen. Hier ist die Antwort zweiwertig.', 'r fits when two continuous variables are present. Here the outcome has two values.')),
      a(P('Cohens d', 'Cohen\'s d'),
        P('d ist eine standardisierte Mittelwertdifferenz und passt zu einer stetigen Antwort mit kategorialem Prädiktor.', 'd is a standardised mean difference and fits a continuous outcome with a categorical predictor.'))
    ],
    hilfe: ['effektstaerke', 'odds-ratio'], belege: ['wissen:nakagawa07-effektstatistiken', 'Nakagawa und Cuthill 2007']
  },
  {
    id: 'bio-quadrat', thema: 'biologie',
    stamm: P('Eine Kollegin sagt, die lineare Regression könne nur geradlinige Zusammenhänge beschreiben. Was zeigt die Tabelle dazu?', 'A colleague says that linear regression can describe only straight-line relationships. What does the table show?'),
    tabelle: tab('bio-quadrat', [P('Modell', 'Model'), P('R²', 'R²'), P('Sig. des quadratischen Terms', 'Sig. of the quadratic term')], QUELLE_AUTO, P('Verbrauch gegen Gewicht, ohne und mit quadratischem Term', 'Fuel use against weight, without and with a quadratic term')),
    antworten: [
      a(P(`„Linear“ meint die Parameter: Das Modell passt mit quadratischem Term eine Kurve (R² ${zd('bq_r2_1', 3)} auf ${zd('bq_r2_2', 3)})`, `„Linear“ refers to the parameters: with a quadratic term the model fits a curve (R² ${ze('bq_r2_1', 3)} to ${ze('bq_r2_2', 3)})`),
        P(`Der quadratische Term ist mit Sig. ${zd('bq_p', 3)} deutlich von null verschieden. Das Modell bleibt linear in den Parametern.`, `The quadratic term differs clearly from zero with Sig. ${ze('bq_p', 3)}. The model stays linear in the parameters.`), true),
      a(P('Die Kollegin hat recht, ein quadratischer Term macht das Modell zu einem nichtlinearen mit eigenem Verfahren', 'The colleague is right, a quadratic term turns the model into a non-linear one with its own estimation'),
        P('Das Modell wird weiter mit der gewöhnlichen linearen Regression geschätzt. Das Wort bezieht sich darauf, wie die Parameter eingehen.', 'The model is still estimated with ordinary linear regression. The word refers to how the parameters enter.')),
      a(P('Die Kollegin hat recht, R² steigt vor allem, weil eine zusätzliche Variable im Modell ist', 'The colleague is right, R² rises mainly because an additional variable is in the model'),
        P(`Ein Anstieg allein beweist nichts, aber der Term ist mit Sig. ${zd('bq_p', 3)} auch einzeln auffällig. Die Kurve ist kein Zufallsprodukt.`, `A rise alone proves nothing, but the term is also conspicuous on its own with Sig. ${ze('bq_p', 3)}. The curve is not a product of chance.`))
    ],
    hilfe: ['regression', 'r-quadrat'], karte: 'vorhersage', belege: ['wissen:zuur10-linear', 'Zuur u. a. 2010']
  }
];
