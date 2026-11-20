/**
 * Üben: Wie plane ich eine Studie? (Verfahren wählen, Fallzahl, Stichprobe ziehen, Design und Randomisierung).
 * Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R). Daten: datasets::iris, PlantGrowth,
 * MASS::birthwt; die Fallzahlen sind ein Rechenbeispiel ohne Daten (zweiseitiger t-Test, Standardabweichung 1, zweiter Weg über die nichtzentrale t-Verteilung).
 * Belege: wissen.json (Bortz Kap. 1, 6 und 12, Rasch 2 Kap. 4, Dormann Kap. 14, Cohen 1992, Greenland u. a. 2016, Altman und Bland 1995).
 * Keine Quelle gibt es zu Repräsentativität, Quotenauswahl und Studientypen über Randomisierung und Quasi-Experiment hinaus, darum dazu keine Frage.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, zd, ze, zn } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

const QUELLE_FZ = P(
  'Rechenbeispiel ohne Daten: zweiseitiger t-Test für zwei gleich große Gruppen, Standardabweichung 1, Gruppengröße aufgerundet. Berechnet mit R (power.t.test, zweiter Weg über die nichtzentrale t-Verteilung).',
  'Worked example without data: two-sided t test for two groups of equal size, standard deviation 1, group size rounded up. Computed with R (power.t.test, second route through the noncentral t distribution).');
const QUELLE_IRIS = P(
  'Daten: datasets::iris (Anderson 1935, Fisher 1936; Teil von R, Lizenz GPL), 150 Schwertlilien, je 50 aus drei Arten, Länge des Blütenblatts in cm. Berechnet mit R.',
  'Data: datasets::iris (Anderson 1935, Fisher 1936; part of R, licence GPL), 150 irises, 50 of each of three species, petal length in cm. Computed with R.');
const QUELLE_BW = P(
  'Daten: MASS::birthwt (Hosmer und Lemeshow 1989, Baystate Medical Center 1986; Paket MASS, Lizenz GPL), 189 Mütter. Zufällige Gruppen A und B: Zuteilung mit festem Startwert (3), 95 und 94 Mütter. Berechnet mit R.',
  'Data: MASS::birthwt (Hosmer and Lemeshow 1989, Baystate Medical Center 1986; package MASS, licence GPL), 189 mothers. Random groups A and B: assignment with a fixed seed (3), 95 and 94 mothers. Computed with R.');
const QUELLE_PG = P(
  'Daten: datasets::PlantGrowth (Dobson 1983; Teil von R, Lizenz GPL), Trockengewicht von Pflanzen unter Kontrolle und zwei Behandlungen, je 10 Pflanzen. Berechnet mit R.',
  'Data: datasets::PlantGrowth (Dobson 1983; part of R, licence GPL), dry weight of plants under control and two treatments, 10 plants each. Computed with R.');

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'fz-n': {
    titel: P('Gruppengröße je Gruppe für einen t-Test', 'Group size per group for a t test'),
    tabellen: [
      tab('fz-n.0', [P('Effekt d', 'Effect d'), P('Niveau', 'Level'), P('Power', 'Power'), P('Personen je Gruppe', 'People per group')], QUELLE_FZ, P('Rechenbeispiel: nötige Gruppengröße (zweiseitiger t-Test)', 'Worked example: required group size (two-sided t test)'))
    ]
  },
  'fz-gering': {
    titel: P('Power einer Studie mit 30 Personen je Gruppe', 'Power of a study with 30 people per group'),
    tabellen: [
      tab('fz-gering.0', [P('Personen je Gruppe', 'People per group'), P('wahrer Effekt d', 'true effect d'), P('Niveau', 'Level'), P('Power', 'Power')], QUELLE_FZ, P('Rechenbeispiel: Power bei einem wahren Effekt von 0,5', 'Worked example: power at a true effect of 0.5'))
    ]
  },
  'sd-zuteil': {
    titel: P('Selbst gewählte und zufällig gebildete Gruppen', 'Self-selected and randomly formed groups'),
    tabellen: [
      tab('sd-zuteil.0', [P('Merkmal', 'Characteristic'), P('Raucherinnen', 'Smokers'), P('Nichtraucherinnen', 'Non-smokers'), P('zufällige Gruppe A', 'random group A'), P('zufällige Gruppe B', 'random group B')], QUELLE_BW,
        P('Mittelwerte (bei „Anteil“ der Anteil) nach selbst gewählter und zufälliger Gruppe', 'Means (for "share" the share) by self-selected and random group'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Verfahren wählen ----
  {
    id: 'vw-paar', thema: 'planen',
    stamm: P('Zehn Personen schlafen jeweils mit zwei verschiedenen Schlafmitteln. Angenommen, die Unterschiede je Person sind annähernd symmetrisch verteilt, folgen aber keiner Normalverteilung. Welcher Test vergleicht beide Mittel, ohne eine Normalverteilung zu verlangen?',
      'Ten people each sleep with two different sleeping drugs. Suppose the differences per person are approximately symmetric but follow no normal distribution. Which test compares the two drugs without requiring a normal distribution?'),
    antworten: [
      a(P('Der Wilcoxon-Test für abhängige Stichproben (Paardifferenzen)', 'The Wilcoxon test for dependent samples (paired differences)'),
        P('Dieselben Personen liefern beide Messungen, die Werte sind abhängig. Der Wilcoxon-Test ist das Gegenstück zum t-Test für abhängige Stichproben.', 'The same people provide both measurements, so the values are dependent. The Wilcoxon test is the counterpart of the t test for dependent samples.'), true),
      a(P('Der Mann-Whitney-U-Test für zwei unabhängige Gruppen von Personen', 'The Mann-Whitney U test for two independent groups of people'),
        P('Der U-Test entspricht dem t-Test für unabhängige Stichproben. Hier gehören die beiden Messungen zu denselben Personen.', 'The U test corresponds to the t test for independent samples. Here the two measurements belong to the same people.')),
      a(P('Der Kruskal-Wallis-Test für mehr als zwei unabhängige Gruppen von Personen', 'The Kruskal-Wallis test for more than two independent groups of people'),
        P('Der Kruskal-Wallis-Test entspricht der einfaktoriellen Varianzanalyse für unabhängige Gruppen. Hier gibt es zwei abhängige Messungen.', 'The Kruskal-Wallis test corresponds to one-way analysis of variance for independent groups. Here there are two dependent measurements.'))
    ],
    hilfe: ['rangtest', 'blatt-seite'], belege: ['wissen:rangtests-entsprechungen', 'wissen:rangtests-hypothese']
  },
  {
    id: 'vw-gruppen3', thema: 'planen',
    stamm: P('Drei voneinander unabhängige Gruppen von Pflanzen werden nach dem Gewicht verglichen, und die Werte sind stark schief. Welcher Test ist das Gegenstück zur einfaktoriellen Varianzanalyse?',
      'Three independent groups of plants are compared by weight, and the values are strongly skewed. Which test is the counterpart of one-way analysis of variance?'),
    antworten: [
      a(P('Der Kruskal-Wallis-Test für unabhängige Gruppen', 'The Kruskal-Wallis test for independent groups'),
        P('Der Kruskal-Wallis-Test entspricht der einfaktoriellen Varianzanalyse für unabhängige Gruppen und braucht keine Normalverteilung.', 'The Kruskal-Wallis test corresponds to one-way analysis of variance for independent groups and does not need a normal distribution.'), true),
      a(P('Der Mann-Whitney-U-Test, der für zwei Gruppen gebaut ist', 'The Mann-Whitney U test, which is built for two groups'),
        P('Der U-Test entspricht dem t-Test für zwei unabhängige Stichproben. Bei drei Gruppen ist der Kruskal-Wallis-Test das Gegenstück zur Varianzanalyse.', 'The U test corresponds to the t test for two independent samples. For three groups the Kruskal-Wallis test is the counterpart of analysis of variance.')),
      a(P('Der Wilcoxon-Test, der für Paare derselben Personen gebaut ist', 'The Wilcoxon test, which is built for pairs of the same people'),
        P('Der Wilcoxon-Test entspricht dem t-Test für abhängige Stichproben. Hier sind die Gruppen voneinander unabhängig.', 'The Wilcoxon test corresponds to the t test for dependent samples. Here the groups are independent of each other.'))
    ],
    hilfe: ['rangtest', 'blatt-seite'], belege: ['wissen:rangtests-entsprechungen']
  },
  {
    id: 'vw-vorher-nachher', thema: 'planen',
    stamm: P('Angenommen, dieselben 150 Beschäftigten (erfundene Zahl) werden vor und nach einer Schulung gefragt, ob sie eine neue Arbeitsregel für sinnvoll halten (ja oder nein). Welcher Test prüft, ob sich der Anteil verändert hat?',
      'Suppose the same 150 employees (invented number) are asked before and after a training whether they consider a new work rule sensible (yes or no). Which test checks whether the share has changed?'),
    antworten: [
      a(P('Der McNemar-Test, in den nur die Personen eingehen, die gewechselt haben', 'The McNemar test, in which only the people who switched enter'),
        P('Dieselbe Stichprobe wird zweimal auf ein Ja/Nein-Merkmal untersucht. Der McNemar-Test berücksichtigt nur die Fälle, bei denen eine Veränderung eingetreten ist.', 'The same sample is examined twice on a yes/no characteristic. The McNemar test considers only the cases in which a change occurred.'), true),
      a(P('Der Chi-Quadrat-Test auf Unabhängigkeit mit allen Personen der Vorher-nachher-Tabelle', 'The chi-square test of independence with all people of the before-after table'),
        P('Er setzt unabhängige Gruppen voraus. Vorher und nachher sind aber dieselben Personen, jede gehört in eines von vier Feldern.', 'It assumes independent groups. Before and after, however, are the same people, each belonging to one of four cells.')),
      a(P('Der t-Test für abhängige Stichproben mit den Antworten als Zahlen 0 und 1', 'The t test for dependent samples with the answers coded as numbers 0 and 1'),
        P('Der t-Test setzt ein metrisches Merkmal voraus. Für ein Ja/Nein-Merkmal an denselben Personen gibt es den McNemar-Test.', 'The t test presupposes a metric characteristic. For a yes/no characteristic in the same people there is the McNemar test.'))
    ],
    hilfe: ['mcnemar-test-cochran-q', 'blatt-seite'], belege: ['wissen:kreuz-mcnemar-wechsler', 'wissen:bortz-mcnemar', 'wissen:kreuz-erwartete-haeufigkeit', 'wissen:t-voraussetzungen', 'wissen:t-test-drei-varianten']
  },
  {
    id: 'vw-mehrfach', thema: 'planen', mehrfach: true,
    stamm: P('Welche Zuordnungen von Versuchsanlage und Test stimmen? Mehrere können stimmen.', 'Which pairings of study design and test are correct? Several may be correct.'),
    antworten: [
      a(P('Zwei unabhängige Gruppen, Rangfolge belastbar: Mann-Whitney-U-Test', 'Two independent groups, ranking reliable: Mann-Whitney U test'),
        P('Der U-Test ist das Gegenstück zum t-Test für unabhängige Stichproben.', 'The U test is the counterpart of the t test for independent samples.'), true),
      a(P('Zwei Messungen derselben Personen, nicht normale, symmetrische Differenzen: Wilcoxon-Test', 'Two measurements of the same people, non-normal symmetric differences: Wilcoxon test'),
        P('Der Wilcoxon-Test für Paardifferenzen ist das Gegenstück zum gepaarten t-Test.', 'The Wilcoxon test for paired differences is the counterpart of the paired t test.'), true),
      a(P('Zwei Messungen derselben Personen, Rangfolge belastbar: Kruskal-Wallis-Test', 'Two measurements of the same people, ranking reliable: Kruskal-Wallis test'),
        P('Der Kruskal-Wallis-Test gilt für unabhängige Gruppen, nicht für wiederholte Messungen derselben Personen.', 'The Kruskal-Wallis test is for independent groups, not for repeated measurements of the same people.')),
      a(P('Zwei verschiedene Gruppen von Personen, metrisch: t-Test für abhängige Stichproben', 'Two different groups of people, metric: t test for dependent samples'),
        P('Der t-Test für abhängige Stichproben setzt Paare voraus. Zwei verschiedene Gruppen sind unabhängige Stichproben.', 'The t test for dependent samples presupposes pairs. Two different groups are independent samples.'))
    ],
    hilfe: ['rangtest', 'blatt-seite'], belege: ['wissen:rangtests-entsprechungen', 'wissen:t-test-drei-varianten']
  },

  // ---- Fallzahl ----
  {
    id: 'fz-effekt', thema: 'planen', fall: 'fz-n',
    stamm: P('Die Tabelle zeigt die nötige Gruppengröße für einen zweiseitigen t-Test. Wie hängt sie vom angenommenen Effekt d ab (Niveau 0,05, Power 0,80)?',
      'The table shows the required group size for a two-sided t test. How does it depend on the assumed effect d (level 0.05, power 0.80)?'),
    antworten: [
      a(P(`Ein kleinerer Effekt braucht viel mehr Personen: ${zn('fn_n1')} je Gruppe bei ${zd('fn_d1', 1)} gegen ${zn('fn_n2')} bei ${zd('fn_d2', 1)}`, `A smaller effect needs far more people: ${zn('fn_n1')} per group at ${ze('fn_d1', 1)} against ${zn('fn_n2')} at ${ze('fn_d2', 1)}`),
        P(`Die Power wächst mit dem wahren Effekt; bei kleinem Effekt muss n entsprechend steigen. Hier ist ${zn('fn_n1')} geteilt durch ${zn('fn_n2')} rund ${zd('fn_rel', 1)}.`, `Power grows with the true effect; for a small effect n has to rise accordingly. Here ${zn('fn_n1')} divided by ${zn('fn_n2')} is about ${ze('fn_rel', 1)}.`), true),
      a(P(`Die Gruppengröße wächst im selben Verhältnis, in dem der Effekt sinkt, also etwa ${zd('fn_rel_d', 1)}-fach`, `The group size grows in the same ratio in which the effect falls, that is about ${ze('fn_rel_d', 1)}-fold`),
        P(`Der Effekt sinkt von ${zd('fn_d2', 1)} auf ${zd('fn_d1', 1)} (${zd('fn_rel_d', 1)}-fach), die Gruppengröße steigt aber auf das Sechsfache (${zn('fn_n2')} auf ${zn('fn_n1')}). Der Zusammenhang ist nicht proportional.`,
          `The effect falls from ${ze('fn_d2', 1)} to ${ze('fn_d1', 1)} (${ze('fn_rel_d', 1)}-fold), but the group size rises to six times (${zn('fn_n2')} to ${zn('fn_n1')}). The relationship is not proportional.`)),
      a(P('Die Gruppengröße hängt kaum vom Effekt ab, entscheidend sind Niveau und Power', 'The group size hardly depends on the effect, level and power are decisive'),
        P(`Der Effekt wirkt am stärksten: Bei gleichem Niveau und gleicher Power stehen ${zn('fn_n1')}, ${zn('fn_n2')} und ${zn('fn_n3')} Personen für drei Effekte.`, `The effect has the strongest influence: at the same level and the same power, ${zn('fn_n1')}, ${zn('fn_n2')} and ${zn('fn_n3')} people stand for three effects.`))
    ],
    hilfe: ['fallzahlplanung', 'a-priori-power'], belege: ['wissen:power-einflussgroessen', 'wissen:power-vier-groessen']
  },
  {
    id: 'fz-niveau', thema: 'planen', fall: 'fz-n',
    stamm: P(`Bei d = ${zd('fn_d2', 1)} steht in der Tabelle ${zn('fn_n2')} Personen je Gruppe für Niveau ${zd('fn_a1', 2)} und Power ${zd('fn_p1', 2)}. Wie ändert sich die Zahl bei Niveau ${zd('fn_a2', 2)} oder bei Power ${zd('fn_p2', 2)}?`,
      `At d = ${ze('fn_d2', 1)} the table gives ${zn('fn_n2')} people per group for level ${ze('fn_a1', 2)} and power ${ze('fn_p1', 2)}. How does the number change at level ${ze('fn_a2', 2)} or at power ${ze('fn_p2', 2)}?`),
    antworten: [
      a(P(`Beides verlangt mehr Personen: ${zn('fn_n4')} bei Niveau ${zd('fn_a2', 2)} und ${zn('fn_n5')} bei Power ${zd('fn_p2', 2)}, nicht ${zn('fn_n2')}`, `Both require more people: ${zn('fn_n4')} at level ${ze('fn_a2', 2)} and ${zn('fn_n5')} at power ${ze('fn_p2', 2)}, not ${zn('fn_n2')}`),
        P('Alpha, Effektgröße, Power und Stichprobenumfang hängen zusammen. Ein kleineres Alpha senkt die Power, und eine höhere Zielpower braucht mehr Daten; also steigt n.', 'Alpha, effect size, power and sample size are linked. A smaller alpha lowers the power, and a higher target power needs more data; so n rises.'), true),
      a(P('Ein strengeres Niveau braucht weniger Personen, weil weniger Fehlentscheidungen erlaubt sind', 'A stricter level needs fewer people because fewer wrong decisions are allowed'),
        P(`Ein strengeres Niveau macht es schwerer, signifikant zu werden, und senkt die Power. Bei Niveau ${zd('fn_a2', 2)} steigt n auf ${zn('fn_n4')}.`, `A stricter level makes it harder to become significant and lowers the power. At level ${ze('fn_a2', 2)} n rises to ${zn('fn_n4')}.`)),
      a(P('Niveau und Power ändern die Gruppengröße nicht, nur der Effekt und die Streuung zählen', 'Level and power do not change the group size, only the effect and the spread matter'),
        P(`Die Gruppengröße ändert sich: ${zn('fn_n2')} gegen ${zn('fn_n4')} und ${zn('fn_n5')}. Drei der vier Größen bestimmen die vierte.`, `The group size does change: ${zn('fn_n2')} against ${zn('fn_n4')} and ${zn('fn_n5')}. Three of the four quantities determine the fourth.`))
    ],
    hilfe: ['fallzahlplanung', 'a-priori-power'], belege: ['wissen:power-einflussgroessen', 'wissen:power-vier-groessen']
  },
  {
    id: 'fz-vier', thema: 'planen', fall: 'fz-n', mehrfach: true,
    stamm: P('Angenommen, eine Power von 0,80 gilt als Ziel. Welche Aussagen zur Tabelle der Gruppengrößen stimmen? Mehrere können stimmen.', 'Suppose a power of 0.80 is the target. Which statements about the table of group sizes are correct? Several may be correct.'),
    antworten: [
      a(P(`Bei d = ${zd('fn_d2', 1)} verlangt Power ${zd('fn_p2', 2)} mehr Personen je Gruppe als Power ${zd('fn_p1', 2)} (${zn('fn_n5')} gegen ${zn('fn_n2')})`, `At d = ${ze('fn_d2', 1)} power ${ze('fn_p2', 2)} requires more people per group than power ${ze('fn_p1', 2)} (${zn('fn_n5')} against ${zn('fn_n2')})`),
        P('Die Power wächst mit dem Stichprobenumfang; für eine höhere Zielpower braucht es mehr Personen.', 'Power grows with the sample size; a higher target power needs more people.'), true),
      a(P('Die berechnete Gruppengröße gilt nur für den angenommenen Effekt', 'The calculated group size holds only for the assumed effect'),
        P('Die Effektgröße in der Population anzunehmen ist der schwierigste Teil der Poweranalyse; die berechnete Stichprobengröße gilt nur für den angenommenen Wert.', 'Assuming the effect size in the population is the hardest part of a power analysis; the calculated sample size holds only for the assumed value.'), true),
      a(P(`Wer ${zn('fn_n3')} Personen je Gruppe für d = ${zd('fn_d3', 1)} plant, hat auch bei einem wahren d von ${zd('fn_d2', 1)} noch Power ${zd('fn_p1', 2)}`, `Whoever plans ${zn('fn_n3')} people per group for d = ${ze('fn_d3', 1)} still has power ${ze('fn_p1', 2)} at a true d of ${ze('fn_d2', 1)}`),
        P(`Bei einem wahren d von ${zd('fn_d2', 1)} und ${zn('fn_n3')} Personen je Gruppe sinkt die Power auf ${zd('fn_p26', 2)}. Für ${zd('fn_p1', 2)} wären ${zn('fn_n2')} Personen nötig.`, `At a true d of ${ze('fn_d2', 1)} with ${zn('fn_n3')} people per group the power falls to ${ze('fn_p26', 2)}. For ${ze('fn_p1', 2)} ${zn('fn_n2')} people would be needed.`)),
      a(P('Eine Power von 0,80 heißt, dass der Effekt mit 80 Prozent Wahrscheinlichkeit besteht', 'A power of 0.80 means that the effect exists with a probability of 80 percent'),
        P('Die Power ist die Wahrscheinlichkeit, bei einem bestimmten wahren Effekt ein signifikantes Ergebnis zu erhalten, nicht die Wahrscheinlichkeit, dass der Effekt besteht.', 'Power is the probability of obtaining a significant result at a given true effect, not the probability that the effect exists.'))
    ],
    hilfe: ['fallzahlplanung', 'a-priori-power'], belege: ['wissen:ziel-power-80-90', 'wissen:power-definition', 'wissen:cohen92-effektgroesse-vorab']
  },
  {
    id: 'fz-gering', thema: 'planen', fall: 'fz-gering',
    stamm: P(`Angenommen, eine Power ab 0,80 gilt als ausreichend. Eine Studie plant ${zn('fn_n30')} Personen je Gruppe für einen erwarteten Effekt von d = ${zd('fn_d2', 1)} (Tabelle). Sie findet p = ${zd('fz_pbeob', 1)} und damit keinen signifikanten Unterschied. Was folgt?`,
      `Suppose a power of 0.80 or more counts as sufficient. A study plans ${zn('fn_n30')} people per group for an expected effect of d = ${ze('fn_d2', 1)} (table). It finds p = ${ze('fz_pbeob', 1)} and thus no significant difference. What follows?`),
    antworten: [
      a(P(`Bei einer Power von ${zd('fn_p30d', 3)} lässt sich das Ergebnis kaum deuten; Gleichheit ist damit nicht belegt`, `At a power of ${ze('fn_p30d', 3)} the result can hardly be interpreted; equality is not shown by it`),
        P(`Bei zu geringer Power ist ein Ergebnis ohne Signifikanz nicht interpretierbar. Gezeigt ist nur, dass ein Beleg für einen Unterschied fehlt; mit ${zn('fn_n2')} Personen je Gruppe läge die Power bei ${zd('fg_p64', 3)}.`,
          `With too little power a result without significance cannot be interpreted. All that is shown is that evidence for a difference is lacking; with ${zn('fn_n2')} people per group the power would be ${ze('fg_p64', 3)}.`), true),
      a(P('Die Studie hat gezeigt, dass die Gruppen gleich sind, denn sie wurde sorgfältig und vorab geplant', 'The study has shown that the groups are equal, since it was planned carefully and in advance'),
        P('Das Fehlen eines Belegs ist kein Beleg für Gleichheit. Eine sorgfältige Planung ändert nichts daran, dass die Power hier niedrig war.', 'The lack of evidence is not evidence of equality. Careful planning does not change the fact that the power was low here.')),
      a(P('Aus dem beobachteten Effekt lässt sich nachträglich eine hohe Power berechnen, die das Ergebnis stützt', 'From the observed effect a high power can be calculated afterwards, which supports the result'),
        P('Eine aus den beobachteten Daten berechnete Power ist eine Umformung des p-Wertes und prüft die Alternativen nicht. Sie stützt die Nullhypothese nicht.', 'A power calculated from the observed data is a transformation of the p value and does not test the alternatives. It does not support the null hypothesis.'))
    ],
    hilfe: ['a-priori-power', 'fallzahlplanung'], belege: ['wissen:geringe-power-nicht-interpretierbar', 'wissen:greenland16-power-pruefen', 'wissen:altman95-negativ-irrefuehrend']
  },
  {
    id: 'fz-vorab', thema: 'planen',
    stamm: P('Wann wird die Fallzahl für eine Studie berechnet, und welcher Effekt geht in die Rechnung ein?', 'When is the sample size calculated for a study, and which effect goes into the calculation?'),
    antworten: [
      a(P('Vor der Studie, mit einem relevanten Effekt statt dem unbekannten wahren Effekt', 'Before the study, with a relevant effect instead of the unknown true effect'),
        P('Die Berechnung braucht keine erhobenen Daten und gehört vor die Studie. Für die Planung zählt der inhaltlich relevante, nicht der unbekannte wahre Effekt.', 'The calculation needs no collected data and belongs before the study. For planning, the substantively relevant effect counts, not the unknown true one.'), true),
      a(P('Nach der Studie, aus dem beobachteten Effekt, um die Power des Ergebnisses zu bestätigen', 'After the study, from the observed effect, to confirm the power of the result'),
        P('Eine aus den beobachteten Daten berechnete Power ist eine Umformung des p-Wertes. Geplant wird vorher.', 'A power calculated from the observed data is a transformation of the p value. Planning happens beforehand.')),
      a(P('Während der Erhebung, sobald sich der erste signifikante Unterschied in den Daten zeigt', 'During data collection, as soon as the first significant difference shows up in the data'),
        P('Die Rechnung gehört vor die Studie und benötigt keine erhobenen Daten. Ein Zwischenergebnis ist kein Maßstab für die nötige Fallzahl.', 'The calculation belongs before the study and needs no collected data. An interim result is no yardstick for the required sample size.'))
    ],
    hilfe: ['fallzahlplanung', 'a-priori-power'], belege: ['wissen:power-vier-groessen', 'wissen:greenland16-power-pruefen']
  },

  // ---- Stichprobe ziehen ----
  {
    id: 'sz-klumpen', thema: 'planen',
    tabelle: tab('sz-klumpen', [P('Gruppe der Blüten', 'Group of flowers'), P('Mittelwert Länge Blütenblatt (cm)', 'Mean petal length (cm)')], QUELLE_IRIS, P('Mittelwert für alle Blüten und für jede Art als Klumpen', 'Mean for all flowers and for each species as a cluster')),
    stamm: P('Die Tabelle zeigt die mittlere Blütenblattlänge aller 150 Blüten und je Art. Von den drei Arten wird eine einzige vollständig erhoben (ein Klumpen). Was folgt für den Schätzwert?',
      'The table shows the mean petal length of all 150 flowers and by species. Only one of the three species is surveyed completely (one cluster). What follows for the estimate?'),
    antworten: [
      a(P(`Ein einzelner Klumpen genügt nicht: Der Mittelwert liegt je nach Art bei ${zd('sk_k1', 2)}, ${zd('sk_k2', 2)} oder ${zd('sk_k3', 2)}`, `A single cluster is not enough: the mean is ${ze('sk_k1', 2)}, ${ze('sk_k2', 2)} or ${ze('sk_k3', 2)} depending on the species`),
        P('Bei einer Klumpenstichprobe werden mehrere zufällig gewählte Klumpen vollständig erhoben; ein einzelner Klumpen genügt nicht. Die Klumpen unterscheiden sich hier stark.', 'In a cluster sample several randomly chosen clusters are surveyed completely; a single cluster is not enough. The clusters differ strongly here.'), true),
      a(P('Die vollständige Erhebung des Klumpens ersetzt die Zufallsauswahl, der Schätzwert ist daher genau', 'Surveying the cluster completely replaces random selection, so the estimate is exact for all flowers'),
        P(`Mit nur einem von drei Klumpen hängt das Ergebnis davon ab, welche Art vorliegt (${zd('sk_k1', 2)} bis ${zd('sk_k3', 2)}). Vollständigkeit im Klumpen macht den Schätzwert für alle Blüten nicht genau.`,
          `With only one of three clusters the result depends on which species is at hand (${ze('sk_k1', 2)} to ${ze('sk_k3', 2)}). Completeness within the cluster does not make the estimate for all flowers exact.`)),
      a(P('Der Klumpen ist repräsentativ für alle 150 Blüten, weil jede Blüte der Art vollständig erfasst wurde', 'The cluster is representative of all flowers because every flower of the species was recorded'),
        P(`Dass jede Blüte der Art erfasst ist, sagt nichts über die anderen Arten. Der Mittelwert der Art weicht vom Mittelwert aller Blüten ${zd('sk_gm', 2)} stark ab.`, `That every flower of the species is recorded says nothing about the other species. The mean of the species deviates strongly from the mean of all flowers ${ze('sk_gm', 2)}.`))
    ],
    hilfe: ['klumpenstichprobe', 'stichprobenplan'], belege: ['wissen:klumpen-schicht-unterschied']
  },
  {
    id: 'sz-schicht', thema: 'planen',
    stamm: P('Aus jeder von drei Arten werden fünf Blüten zufällig gezogen und gemessen. Wie heißt dieses Verfahren?', 'From each of three species five flowers are drawn at random and measured. What is this method called?'),
    antworten: [
      a(P('Geschichtete Stichprobe: Innerhalb der Schichten wird zufällig gezogen', 'Stratified sample: the draw is random within the strata'),
        P('Bei einer geschichteten Stichprobe wird innerhalb der Schichten, hier der Arten, zufällig gezogen.', 'In a stratified sample the draw is random within the strata, here the species.'), true),
      a(P('Klumpenstichprobe: Die Arten sind die Klumpen und werden zufällig gewählt', 'Cluster sample: the species are the clusters and are chosen at random'),
        P('Bei einer Klumpenstichprobe werden mehrere zufällig gewählte Klumpen vollständig erhoben. Hier werden alle Arten gezogen, aber nur einzelne Blüten.', 'In a cluster sample several randomly chosen clusters are surveyed completely. Here all species are drawn from, but only single flowers.')),
      a(P('Einfache Zufallsstichprobe: Alle Auswahlen von 15 Blüten sind gleich wahrscheinlich', 'Simple random sample: all selections of 15 flowers are equally likely'),
        P('In einer einfachen Zufallsstichprobe wären alle Teilmengen gleich wahrscheinlich, auch 15 Blüten einer einzigen Art. Hier sind je Art genau fünf festgelegt.', 'In a simple random sample all subsets would be equally likely, including 15 flowers of a single species. Here exactly five per species are fixed.'))
    ],
    hilfe: ['geschichtete-stichprobe', 'stichprobenplan'], belege: ['wissen:klumpen-schicht-unterschied', 'wissen:zufallsstichprobe-bedingungen']
  },
  {
    id: 'sz-zufall', thema: 'planen',
    stamm: P('Eine Forschende befragt die Personen, die an einem Montagvormittag zufällig in einer Bibliothek anwesend sind. Ist das eine Zufallsstichprobe der Studierenden?',
      'A researcher surveys the people who happen to be present in a library on a Monday morning. Is this a random sample of the students?'),
    antworten: [
      a(P('Nein, die zufällig Anwesenden sind keine Zufallsstichprobe der Studierenden', 'No, the people who happen to be present are no random sample of the students'),
        P('In einer einfachen Zufallsstichprobe sind alle möglichen Teilmengen gleich wahrscheinlich. Wer zufällig anwesend ist, wurde nicht nach einem Zufallsverfahren aus allen gezogen.', 'In a simple random sample all possible subsets are equally likely. Those who happen to be present were not drawn from everyone by a random procedure.'), true),
      a(P('Ja, denn niemand hat die Anwesenden ausgesucht, also gibt es keine Absicht in der Auswahl', 'Yes, since nobody picked the people present, so there is no intention in the selection'),
        P('Fehlende Absicht ist kein Zufallsverfahren. Wer gerade in der Bibliothek sitzt, unterscheidet sich systematisch von denen, die nicht dort sind.', 'The absence of intention is not a random procedure. Those who are sitting in the library differ systematically from those who are not.')),
      a(P('Ja, wenn mehr als hundert Personen befragt werden, gleicht die Zahl die Auswahl aus', 'Yes, if more than a hundred people are surveyed, the number makes up for the selection'),
        P('Die Zahl der Befragten ändert nichts an der Art der Auswahl. Bei mehr zufällig Anwesenden bleiben die Teilmengen nicht gleich wahrscheinlich.', 'The number surveyed does not change the way of selection. With more people who happen to be present, the subsets still do not become equally likely.'))
    ],
    hilfe: ['zufallsstichprobe', 'einfache-zufallsstichprobe'], belege: ['wissen:zufallsstichprobe-bedingungen']
  },
  {
    id: 'sz-verweigerung', thema: 'planen',
    stamm: P('Angenommen, aus einer vollständigen Liste aller Studierenden werden 1000 Personen zufällig gezogen und angeschrieben, 400 antworten (erfundene Zahlen). Was gilt für diese 400?',
      'Suppose that from a complete list of all students 1000 people are drawn at random and written to, and 400 reply (invented numbers). What holds for these 400?'),
    antworten: [
      a(P('Die Ziehung war zufällig, aber die Verweigerung kann das Ergebnis trotzdem verzerren', 'The draw was random, but refusal can still distort the result'),
        P('Selektionseffekte wie Verweigerung verzerren auch bei zufälliger Auswahl. Wer antwortet, ist nicht zufällig unter den 1000 verteilt.', 'Selection effects such as refusal distort even a random selection. Those who reply are not distributed at random among the 1000.'), true),
      a(P('Die 400 sind eine einfache Zufallsstichprobe aus der Liste, weil die Ziehung zufällig war', 'The 400 are a simple random sample from the list because the draw was random'),
        P('Wer antwortet, entscheidet selbst. Damit sind nicht mehr alle Teilmengen der Liste gleich wahrscheinlich.', 'Those who reply decide for themselves. Not all subsets of the list are then equally likely.')),
      a(P('Eine zufällige Ziehung schließt Verzerrungen durch Verweigerung aus, deshalb gilt das Ergebnis für alle Studierenden', 'A random draw rules out distortion through refusal, so the result holds for all students'),
        P('Auch bei zufälliger Auswahl können Verweigerung und andere Selektionseffekte verzerren. Zufall in der Ziehung schützt davor nicht.', 'Even with random selection, refusal and other selection effects can distort. Chance in the draw does not protect against this.'))
    ],
    hilfe: ['zufallsstichprobe', 'stichprobe'], belege: ['wissen:zufallsstichprobe-bedingungen']
  },
  {
    id: 'sz-mehrfach', thema: 'planen', mehrfach: true,
    stamm: P('Welche Aussagen zu Stichproben stimmen? Mehrere können stimmen.', 'Which statements about samples are correct? Several may be correct.'),
    antworten: [
      a(P('In einer einfachen Zufallsstichprobe sind alle möglichen Teilmengen gleich wahrscheinlich', 'In a simple random sample all possible subsets are equally likely'),
        P('Das ist die Bedingung an eine einfache Zufallsstichprobe.', 'That is the condition for a simple random sample.'), true),
      a(P('Bei einer Klumpenstichprobe werden mehrere zufällig gewählte Klumpen vollständig erhoben', 'In a cluster sample several randomly chosen clusters are surveyed completely'),
        P('Ein einzelner Klumpen genügt nicht; bei der geschichteten Stichprobe wird dagegen innerhalb der Schichten zufällig gezogen.', 'A single cluster is not enough; in a stratified sample, by contrast, the draw is random within the strata.'), true),
      a(P('Eine einzelne Schulklasse ist eine Zufallsstichprobe der Schülerschaft', 'A single school class is a random sample of the pupils'),
        P('Eine einzelne Schulklasse ist keine Zufallsstichprobe; es werden nicht alle Teilmengen der Schülerschaft gleich wahrscheinlich.', 'A single school class is no random sample; not all subsets of the pupils become equally likely.')),
      a(P('Bei zufälliger Auswahl können Verweigerer das Ergebnis nicht verzerren', 'With random selection, refusers cannot distort the result'),
        P('Selektionseffekte wie Verweigerung verzerren auch bei zufälliger Auswahl.', 'Selection effects such as refusal distort even with random selection.'))
    ],
    hilfe: ['stichprobe', 'zufallsstichprobe'], belege: ['wissen:zufallsstichprobe-bedingungen', 'wissen:klumpen-schicht-unterschied']
  },

  // ---- Studiendesign und Randomisierung ----
  {
    id: 'sd-balance', thema: 'planen', fall: 'sd-zuteil',
    stamm: P(`Raucherinnen und Nichtraucherinnen unterscheiden sich im Anteil mit Herkunft „weiß“ stark (${zd('sb_rs_w', 3)} gegen ${zd('sb_ns_w', 3)}), zufällig gebildete Gruppen kaum (${zd('sb_za_w', 3)} gegen ${zd('sb_zb_w', 3)}). Was zeigt das für Studien, die Ursachen klären sollen?`,
      `Smokers and non-smokers differ strongly in the share with origin "white" (${ze('sb_rs_w', 3)} against ${ze('sb_ns_w', 3)}), randomly formed groups hardly (${ze('sb_za_w', 3)} against ${ze('sb_zb_w', 3)}). What does that show for studies that are to clarify causes?`),
    antworten: [
      a(P('Vorgefundene Gruppen unterscheiden sich in Störgrößen, Zufallszuteilung gleicht sie annähernd aus', 'Found groups differ in confounders; random assignment approximately balances them'),
        P('Randomisierung soll personenbedingte Störvariablen unter allen Bedingungen annähernd gleich ausgeprägt machen. Darum haben Untersuchungen mit Randomisierung eine höhere interne Validität.', 'Randomisation is meant to make person-related confounders approximately equal across all conditions. Studies with randomisation therefore have higher internal validity.'), true),
      a(P('Die zufällige Zuteilung macht die Gruppen gleich zusammengesetzt, auch bei kleinen Gruppen', 'Random assignment makes the groups equal in composition, even when the groups are small'),
        P(`Nur annähernd: Im Gewicht der Mutter ist die Abweichung der zufälligen Gruppen mit ${zd('sb_za_g', 2)} gegen ${zd('sb_zb_g', 2)} sogar größer als bei Raucherinnen und Nichtraucherinnen (${zd('sb_rs_g', 2)} gegen ${zd('sb_ns_g', 2)}).`,
          `Only approximately: in the mother's weight the deviation of the random groups, ${ze('sb_za_g', 2)} against ${ze('sb_zb_g', 2)}, is even larger than between smokers and non-smokers (${ze('sb_rs_g', 2)} against ${ze('sb_ns_g', 2)}).`)),
      a(P('Die zufällig gebildeten Gruppen sind unbrauchbar, weil sie sich in Alter und Gewicht unterscheiden', 'The randomly formed groups are useless because they differ in age and weight'),
        P(`Kleine Zufallsabweichungen gehören zur Randomisierung (Alter ${zd('sb_za_a', 2)} gegen ${zd('sb_zb_a', 2)}, Gewicht ${zd('sb_za_g', 2)} gegen ${zd('sb_zb_g', 2)}). Verlangt wird nur eine annähernd gleiche Verteilung.`,
          `Small chance deviations belong to randomisation (age ${ze('sb_za_a', 2)} against ${ze('sb_zb_a', 2)}, weight ${ze('sb_za_g', 2)} against ${ze('sb_zb_g', 2)}). Only an approximately equal distribution is required.`))
    ],
    hilfe: ['randomisierung', 'verstehen-zuteilung'], probieren: 'zuteilung', belege: ['wissen:bortz-randomisierung']
  },
  {
    id: 'sd-mehrfach', thema: 'planen', fall: 'sd-zuteil', mehrfach: true,
    stamm: P('Welche Aussagen zur Randomisierung und zur Tabelle stimmen? Mehrere können stimmen.', 'Which statements about randomisation and the table are correct? Several may be correct.'),
    antworten: [
      a(P('Randomisierung ist die zufällige Zuordnung der Teilnehmenden zu den Bedingungen', 'Randomisation is the random assignment of participants to the conditions'),
        P('Die Zuordnung zu den Untersuchungsbedingungen erfolgt nach Zufall; die Gruppen A und B der Tabelle sind so entstanden.', 'Participants are assigned to the study conditions by chance; groups A and B of the table were formed in this way.'), true),
      a(P('Randomisierung soll Störvariablen der Personen annähernd gleich auf die Bedingungen verteilen', 'Randomisation is meant to spread person-related confounders approximately equally across the conditions'),
        P('Annähernd, nicht exakt: Die zufälligen Gruppen der Tabelle sind sich ähnlich, aber nicht gleich.', 'Approximately, not exactly: the random groups in the table are similar but not equal.'), true),
      a(P('Eine Zufallsstichprobe aus der Bevölkerung und die zufällige Zuordnung zu Bedingungen sind dasselbe', 'A random sample from the population and the random assignment to conditions are the same thing'),
        P('Die Stichprobe betrifft die Auswahl der Teilnehmenden, die Randomisierung die Zuordnung der Teilnehmenden zu den Bedingungen. Beides ist unabhängig voneinander möglich.', 'The sample concerns the selection of participants, randomisation the assignment of participants to conditions. Either is possible without the other.')),
      a(P('Nach der Randomisierung unterscheiden sich die Gruppen in keinem Merkmal mehr', 'After randomisation the groups no longer differ in any characteristic'),
        P(`Im Gewicht der Mutter bleibt zwischen den zufälligen Gruppen eine Zufallsabweichung (${zd('sb_za_g', 2)} gegen ${zd('sb_zb_g', 2)}). Zufallsabweichungen bleiben.`, `A chance deviation remains between the random groups in the mother's weight (${ze('sb_za_g', 2)} against ${ze('sb_zb_g', 2)}). Chance deviations remain.`))
    ],
    hilfe: ['randomisierung', 'blockrandomisierung'], probieren: 'zuteilung', belege: ['wissen:bortz-randomisierung', 'wissen:zufallsstichprobe-bedingungen']
  },
  {
    id: 'sd-quasi', thema: 'planen',
    stamm: P('Eine Studie vergleicht die Prüfungsleistungen von Frauen und Männern. Lässt sich die Zuordnung zu den beiden Gruppen randomisieren?', 'A study compares the exam results of women and men. Can the assignment to the two groups be randomised?'),
    antworten: [
      a(P('Nein, Geschlecht lässt sich nicht zuteilen; natürliche Gruppen machen die Studie quasi-experimentell', 'No, sex cannot be assigned; natural groups make the study quasi-experimental'),
        P('Bei quasi-experimentellen Untersuchungen ist keine Randomisierung möglich, weil natürliche oder bereits bestehende Gruppen verglichen werden, zum Beispiel weibliche und männliche Personen.', 'In quasi-experimental studies randomisation is impossible because natural or already existing groups are compared, for example female and male persons.'), true),
      a(P('Ja, die Personen werden zufällig aus der Bevölkerung gezogen, das ersetzt die Zuteilung zu den Gruppen', 'Yes, the people are drawn at random from the population, which replaces the assignment to the groups'),
        P('Die zufällige Auswahl betrifft die Stichprobe, die Randomisierung die Zuordnung zu Bedingungen. Das Geschlecht lässt sich keiner Person zuteilen.', 'Random selection concerns the sample, randomisation the assignment to conditions. Sex cannot be assigned to any person.')),
      a(P('Ja, sobald beide Gruppen gleich groß sind, gilt ihre Zusammensetzung als zufällig entstanden', 'Yes, as soon as both groups are of equal size their composition counts as having arisen at random'),
        P('Gleich große Gruppen sind keine Zuteilung nach Zufall. Die Gruppenzugehörigkeit ist hier vorgegeben.', 'Groups of equal size are not an assignment by chance. Group membership is given here.'))
    ],
    hilfe: ['randomisierung', 'beobachtungsstudie'], belege: ['wissen:bortz-randomisierung']
  },
  {
    id: 'sd-eta', thema: 'planen',
    tabelle: tab('sd-eta', [P('Gruppenvariable', 'Grouping variable'), P('Eta-Quadrat', 'Eta squared')], P('Daten: datasets::PlantGrowth (Dobson 1983) und iris (Anderson 1935, Fisher 1936); Teil von R, Lizenz GPL. Berechnet mit R.', 'Data: datasets::PlantGrowth (Dobson 1983) and iris (Anderson 1935, Fisher 1936); part of R, licence GPL. Computed with R.'), P('Eta-Quadrat für zwei Gruppenvariablen', 'Eta squared for two grouping variables')),
    stamm: P('Angenommen, die Pflanzen wurden den Behandlungen zufällig zugeteilt, während die Art der Iris vorgefunden wurde. In welchem Fall darf man eta-Quadrat als Anteil lesen, der auf die Gruppenvariable zurückzuführen ist?',
      'Suppose the plants were assigned to the treatments at random, while the iris species was found as given. In which case may eta squared be read as the share attributable to the grouping variable?'),
    antworten: [
      a(P('Nur beim Pflanzenversuch; bei der Art ist die Gruppe vorgefunden, ein Klassifikationsfaktor', 'Only in the plant experiment; the species is found as given, a classification factor'),
        P(`Die Lesart „auf die Behandlung zurückzuführender Anteil“ ist kausal und gilt nur bei zufälliger Zuordnung, nicht bei einem Klassifikationsfaktor wie dem Geschlecht. Die Zahlen ${zd('se_pl', 3)} und ${zd('se_ir', 3)} allein sagen das nicht.`,
          `The reading "share attributable to the treatment" is causal and holds only with random assignment, not for a classification factor such as sex. The figures ${ze('se_pl', 3)} and ${ze('se_ir', 3)} alone do not tell this.`), true),
      a(P('In beiden Fällen, denn eta-Quadrat gibt den Anteil an, der auf die Gruppenvariable zurückgeht', 'In both cases, because eta squared states the share that goes back to the grouping variable'),
        P(`Bei der Art (${zd('se_ir', 3)}) ist die Gruppe nicht zugeteilt. Dort ist eta-Quadrat nur der Anteil der Streuung, den die Gruppen aufklären, ohne Aussage über eine Ursache.`, `For the species (${ze('se_ir', 3)}) the group was not assigned. There eta squared is only the share of the spread that the groups account for, with no statement about a cause.`)),
      a(P('In keinem der beiden Fälle, denn eta-Quadrat ist nur ein Maß für Streuungsanteile, nicht für Ursachen', 'In neither case, because eta squared is only a measure of shares of spread, not of causes'),
        P(`Beim Pflanzenversuch mit zufälliger Zuteilung (${zd('se_pl', 3)}) ist die kausale Lesart erlaubt. Sie hängt von der Zuordnung ab, nicht von der Kennzahl.`, `In the plant experiment with random assignment (${ze('se_pl', 3)}) the causal reading is allowed. It depends on the assignment, not on the statistic.`))
    ],
    hilfe: ['randomisierung', 'experiment'], belege: ['wissen:effekt-eta-kausal-nur-randomisiert']
  },
  {
    id: 'sd-neu', thema: 'planen',
    stamm: P('In einem Gewächshausversuch ergibt die Zufallszuteilung zufällig, dass alle behandelten Pflanzen links und alle Kontrollen rechts stehen. Was ist zu tun?',
      'In a greenhouse experiment the random assignment happens to put all treated plants on the left and all controls on the right. What should be done?'),
    antworten: [
      a(P('Erneut randomisieren, weil sonst Lage und Behandlung vermischt wären', 'Randomise again, since position and treatment would otherwise be confounded'),
        P('Das Ergebnis der Randomisierung muss geprüft werden. Liegen alle Behandlungen auf einer und alle Kontrollen auf der anderen Seite, ist die Lage mit der Behandlung vermischt; die Lösung heißt erneutes Randomisieren.', 'The result of randomisation has to be checked. If all treatments lie on one side and all controls on the other, position is confounded with treatment; the remedy is to randomise again.'), true),
      a(P('Die Zuteilung beibehalten, denn was der Zufall bestimmt, ist in Ordnung', 'Keep the assignment, since whatever chance has decided is fine and needs no check'),
        P('Auch eine zufällig entstandene Anordnung kann Lage und Behandlung vermischen. Ob der Unterschied von der Lage oder der Behandlung kommt, ließe sich danach nicht mehr sagen.', 'A randomly produced arrangement can also confound position and treatment. Afterwards it could no longer be said whether a difference comes from position or treatment.')),
      a(P('Die Pflanzen von Hand umsetzen, bis beide Seiten so aussehen, wie man es sich wünscht', 'Move the plants by hand until both sides look the way one would like them to look'),
        P('Eine Anordnung nach Wunsch ist keine Zuteilung nach Zufall mehr. Gebraucht wird eine neue Zufallszuteilung, nicht eine von Hand gelenkte.', 'An arrangement by wish is no longer an assignment by chance. A new random assignment is needed, not one steered by hand.'))
    ],
    hilfe: ['randomisierung', 'experiment'], belege: ['wissen:dormann-randomisierung-pruefen']
  },
  {
    id: 'sd-nsig', thema: 'planen',
    tabelle: tab('sd-nsig', [P('Größe', 'Quantity'), P('Pflanzen', 'Plants'), P('Wert', 'Value')], QUELLE_PG, P('Kontrolle gegen Behandlung 1 (Welch-Test)', 'Control against treatment 1 (Welch test)')),
    stamm: P('Angenommen, die Pflanzen wurden zufällig auf die Gruppen verteilt. Der Versuch findet keinen signifikanten Unterschied (Tabelle). Was darf daraus gefolgert werden?',
      'Suppose the plants were distributed at random across the groups. The experiment finds no significant difference (table). What may be concluded?'),
    antworten: [
      a(P(`Ein Beleg für einen Unterschied fehlt; Unterschiede bis ${zd('sn_hi', 3)} sind mit den Daten noch vereinbar`, `No evidence of a difference; differences up to ${ze('sn_hi', 3)} remain compatible with the data`),
        P(`Gezeigt ist nur, dass ein Beleg fehlt, nicht dass es keinen Unterschied gibt. Das Intervall reicht von ${zd('sn_lo', 3)} bis ${zd('sn_hi', 3)}.`, `All that is shown is that evidence is lacking, not that there is no difference. The interval runs from ${ze('sn_lo', 3)} to ${ze('sn_hi', 3)}.`), true),
      a(P('Der Versuch hat gezeigt, dass es keinen Unterschied zwischen Kontrolle und Behandlung gibt', 'The experiment has shown that there is no difference between control and treatment'),
        P(`Ein Versuch ohne signifikanten Unterschied legt das oft nahe, zeigt es aber nicht. Der beobachtete Unterschied ist ${zd('sn_d', 3)}.`, `An experiment without a significant difference often suggests this but does not show it. The observed difference is ${ze('sn_d', 3)}.`)),
      a(P('Mit 25 Prozent Wahrscheinlichkeit besteht kein Unterschied zwischen den Gruppen, wie der p-Wert zeigt', 'With a probability of 25 percent there is no difference between the groups, as the p value shows'),
        P(`Der p-Wert (${zd('sn_p', 3)}) ist keine Wahrscheinlichkeit der Hypothese. Er sagt, wie ungewöhnlich die Daten bei fehlendem Unterschied wären.`, `The p value (${ze('sn_p', 3)}) is not a probability of the hypothesis. It says how unusual the data would be if there were no difference.`))
    ],
    hilfe: ['randomisierung', 'experiment'], belege: ['wissen:altman95-negativ-irrefuehrend', 'wissen:altman95-keine-evidenz-ist-nicht-sicherheit']
  }
];
