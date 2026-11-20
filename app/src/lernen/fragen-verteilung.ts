/**
 * Üben: Wie verteilen sich Werte und Mittelwerte, und weicht ein Anteil ab? (Normalverteilung, weitere Verteilungen, Stichprobenverteilung,
 * Anteilstest mit dem Binomialtest). Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json
 * (scripts/ueben-erwartet.R, Daten aus datasets: iris, rivers, InsectSprays, mtcars, sleep, PlantGrowth, HairEyeColor, faithful, cars, precip;
 * Rechenbeispiele und die Simulation sind beschriftet). Belege: wissen.json (Rasch 1 Kap. 2, Rasch 2 Kap. 5, Kohn Kap. 22 und 27,
 * Altman und Bland 2005, Arbeitsbuch Kap. 3), nur an der Seite gelesene Aussagen.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, zd, ze, zn } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

const QUELLE_IRIS = P(
  'Daten: datasets::iris (Anderson 1935, Fisher 1936; Teil von R, Lizenz GPL), Breite der Kelchblätter von 150 Schwertlilien. Berechnet mit R.',
  'Data: datasets::iris (Anderson 1935, Fisher 1936; part of R, licence GPL), sepal width of 150 irises. Computed with R.');
const QUELLE_RIVERS = P(
  'Daten: datasets::rivers (World Almanac 1975, US Geological Survey; Teil von R, Lizenz GPL), 141 große Flüsse Nordamerikas, Länge in Meilen. Berechnet mit R.',
  'Data: datasets::rivers (World Almanac 1975, US Geological Survey; part of R, licence GPL), 141 major North American rivers, length in miles. Computed with R.');
const QUELLE_IRIS_RIVERS = P(
  'Daten: datasets::iris (Anderson 1935, Fisher 1936) und datasets::rivers (World Almanac 1975); Teil von R, Lizenz GPL. Berechnet mit R.',
  'Data: datasets::iris (Anderson 1935, Fisher 1936) and datasets::rivers (World Almanac 1975); part of R, licence GPL. Computed with R.');
const QUELLE_INSEKT = P(
  'Daten: datasets::InsectSprays (Beall 1942; Teil von R, Lizenz GPL), Zahl der Insekten auf je einer Versuchsfläche, je 12 Flächen mit demselben Spritzmittel. Berechnet mit R.',
  'Data: datasets::InsectSprays (Beall 1942; part of R, licence GPL), count of insects on each experimental plot, 12 plots per spray. Computed with R.');
const QUELLE_MTCARS = P(
  'Daten: datasets::mtcars (Henderson und Velleman 1981; Teil von R, Lizenz GPL), 32 Wagen aus der Zeitschrift Motor Trend 1974, davon 19 mit Automatik. Berechnet mit R.',
  'Data: datasets::mtcars (Henderson and Velleman 1981; part of R, licence GPL), 32 cars from Motor Trend 1974, 19 of them with automatic transmission. Computed with R.');
const QUELLE_PRUEF = P(
  'Daten: datasets::sleep (Cushny und Peebles 1905), datasets::PlantGrowth (Dobson 1983) und datasets::HairEyeColor (Snee 1974); Teil von R, Lizenz GPL. t: Welch-Test der beiden Schlafmittel, F: Varianzanalyse der Pflanzengewichte, Chi-Quadrat: Haarfarben gegen Gleichverteilung. Berechnet mit R.',
  'Data: datasets::sleep (Cushny and Peebles 1905), datasets::PlantGrowth (Dobson 1983) and datasets::HairEyeColor (Snee 1974); part of R, licence GPL. t: Welch test of the two drugs, F: analysis of variance of the plant weights, chi-square: hair colours against equal distribution. Computed with R.');
const QUELLE_GEYSIR = P(
  'Daten: datasets::faithful (Härdle; Azzalini und Bowman 1990; Teil von R, Lizenz GPL), Wartezeit zwischen 272 Ausbrüchen des Old-Faithful-Geysirs in Minuten. Berechnet mit R.',
  'Data: datasets::faithful (Härdle; Azzalini and Bowman 1990; part of R, licence GPL), waiting time between 272 eruptions of the Old Faithful geyser in minutes. Computed with R.');
const QUELLE_CARS = P(
  'Daten: datasets::cars (Ezekiel 1930; Teil von R, Lizenz GPL), Bremsweg von 50 Fahrversuchen aus den 1920er Jahren. Berechnet mit R; der Standardfehler gilt für den Bremsweg mit gleich bleibender Standardabweichung der Messwerte (Rechenbeispiel).',
  'Data: datasets::cars (Ezekiel 1930; part of R, licence GPL), stopping distance of 50 trials from the 1920s. Computed with R; the standard error assumes an unchanged standard deviation of the measurements (worked example).');
const QUELLE_SIM = P(
  'Simulation mit festem Startwert: 40000 Stichproben je Umfang, mit Zurücklegen aus den 141 Flusslängen (datasets::rivers; Teil von R, Lizenz GPL). Zweiter Weg: Theorie, Mittelwert der Flüsse und Standardabweichung der Flüsse durch Wurzel n.',
  'Simulation with a fixed seed: 40000 samples per size, drawn with replacement from the 141 river lengths (datasets::rivers; part of R, licence GPL). Second way: theory, mean of the rivers and standard deviation of the rivers over the square root of n.');
const QUELLE_SCHIEF = P(
  'Schiefe der Mittelwerte von Stichproben des Umfangs n, mit Zurücklegen gezogen aus datasets::rivers (141 Flusslängen) und datasets::precip (Jahresniederschlag in 70 Städten; Statistical Abstracts of the United States 1975); Teil von R, Lizenz GPL. Die Schiefe der Mittelwerte ist die Schiefe der Werte geteilt durch die Wurzel aus n; eine Simulation bestätigt sie.',
  'Skewness of the means of samples of size n, drawn with replacement from datasets::rivers (141 river lengths) and datasets::precip (annual precipitation in 70 cities; Statistical Abstracts of the United States 1975); part of R, licence GPL. The skewness of the means is the skewness of the values divided by the square root of n; a simulation confirms it.');
const QUELLE_RECHEN = P(
  'Rechenbeispiel ohne Daten; berechnet mit R und auf einem zweiten Weg geprüft.', 'Worked example without data; computed with R and checked in a second way.');

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'wv-auto': {
    titel: P('32 Wagen, davon 19 mit Automatik. Sechs Wagen werden zufällig ohne Zurücklegen gezogen und die Wagen mit Automatik gezählt (Bin = Binomialverteilung, Hyp = hypergeometrische Verteilung)',
      '32 cars, 19 of them with automatic transmission. Six cars are drawn at random without replacement and the automatic ones are counted (Bin = binomial distribution, Hyp = hypergeometric distribution)'),
    tabellen: [tab('wv-auto.0', [P('Verteilung', 'Distribution'), P('Wahrscheinlichkeit für sechs Automatik', 'Probability of six automatic'), P('Erwartungswert', 'Expected value'), P('Varianz', 'Variance')], QUELLE_MTCARS, P('Zwei Verteilungen für dieselbe Zählung (gerechnet mit ungerundeten Werten, gezeigt gerundet)', 'Two distributions for the same count (computed with unrounded values, shown rounded)'))]
  },
  'bt-auto': {
    titel: P('32 Wagen (Motor Trend 1974): 13 mit Handschaltung, 19 mit Automatik. Binomialtest gegen den Anteil 0,5 und Verteilung der Zahl der Erfolge bei n = 32',
      '32 cars (Motor Trend 1974): 13 with manual transmission, 19 with automatic. Binomial test against the proportion 0.5 and distribution of the number of successes for n = 32'),
    tabellen: [
      tab('bt-auto.0', [P('Wagen mit Handschaltung', 'Cars with manual transmission'), P('Zahl der Wagen', 'Number of cars'), P('Anteil', 'Proportion'), P('p-Wert (zweiseitig)', 'p value (two-sided)')], QUELLE_MTCARS, P('Exakter Binomialtest gegen den Anteil 0,5', 'Exact binomial test against the proportion 0.5')),
      tab('bt-auto.1', [P('k', 'k'), P('P(X = k)', 'P(X = k)'), P('P(X ≤ k)', 'P(X ≤ k)')], QUELLE_MTCARS, P('Binomialverteilung mit n = 32 und Erfolgswahrscheinlichkeit 0,5', 'Binomial distribution with n = 32 and success probability 0.5'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Normalverteilung ----
  {
    id: 'nv-regel', thema: 'verteilung', karte: 'verteilung', probieren: 'verteilungen',
    tabelle: tab('nv-regel', [P('Bereich', 'Range'), P('von', 'from'), P('bis', 'to'), P('Anzahl', 'Count'), P('Anteil (Prozent)', 'Share (percent)')], QUELLE_IRIS, P('Werte im Bereich Mittelwert plus minus Standardabweichungen', 'Values within the mean plus or minus standard deviations')),
    stamm: P(`Die Breite der Kelchblätter von ${zn('nv_n')} Schwertlilien hat den Mittelwert ${zd('nv_mean')} und die Standardabweichung ${zd('nv_sd')}. Wie passt die Tabelle zur Annahme einer Normalverteilung?`,
      `The sepal width of ${zn('nv_n')} irises has the mean ${ze('nv_mean')} and the standard deviation ${ze('nv_sd')}. How does the table fit the assumption of a normal distribution?`),
    antworten: [
      a(P('Gut: Etwa zwei Drittel liegen innerhalb einer, über 95 Prozent innerhalb zweier Standardabweichungen', 'Well: about two thirds lie within one, over 95 percent within two standard deviations'),
        P(`Bei einer Normalverteilung liegen etwa 68 Prozent der Werte innerhalb einer und etwa 95 Prozent innerhalb von zwei Standardabweichungen um den Mittelwert. Die Tabelle zeigt ${zd('nv_p1', 1)} und ${zd('nv_p2', 1)} Prozent und weicht davon kaum ab.`,
          `In a normal distribution about 68 percent of the values lie within one and about 95 percent within two standard deviations of the mean. The table shows ${ze('nv_p1', 1)} and ${ze('nv_p2', 1)} percent and hardly deviates from this.`), true),
      a(P('Schlecht: Bei einer Normalverteilung läge die Hälfte der Werte innerhalb einer Standardabweichung', 'Badly: in a normal distribution half of the values would lie within one standard deviation'),
        P('Innerhalb einer Standardabweichung liegen bei der Normalverteilung etwa 68 Prozent der Werte, nicht 50 Prozent. Die Tabelle passt dazu.',
          'In a normal distribution about 68 percent of the values lie within one standard deviation, not 50 percent. The table fits this.')),
      a(P('Schlecht: Bei einer Normalverteilung lägen etwa 99 Prozent der Werte innerhalb einer Standardabweichung', 'Badly: in a normal distribution about 99 percent of the values would lie within one standard deviation'),
        P('Etwa 99 Prozent sind es erst innerhalb von rund drei Standardabweichungen. Innerhalb einer Standardabweichung liegen etwa 68 Prozent.',
          'About 99 percent are reached only within roughly three standard deviations. Within one standard deviation lie about 68 percent.'))
    ],
    hilfe: ['empirische-regel', 'normalverteilung'], belege: ['wissen:normalverteilung-eigenschaften']
  },
  {
    id: 'nv-einzelwert', thema: 'verteilung', karte: 'verteilung', probieren: 'verteilungen',
    tabelle: tab('nv-einzelwert', [P('Bereich', 'Range'), P('Wahrscheinlichkeit im Modell', 'Probability in the model')], QUELLE_IRIS, P('Normalverteilung als Modell der Kelchblattbreite (gerechnet mit ungerundetem Mittelwert und ungerundeter Standardabweichung)', 'Normal distribution as a model of the sepal width (computed with the unrounded mean and standard deviation)')),
    stamm: P(`Für die Breite der Kelchblätter wird eine Normalverteilung mit Mittelwert ${zd('nv_mean')} und Standardabweichung ${zd('nv_sd')} (gerundet; die Tabelle ist mit den ungerundeten Werten gerechnet) angenommen. Wie groß ist nach diesem Modell die Wahrscheinlichkeit, genau ${zd('nv_e_x', 2)} zu messen?`,
      `A normal distribution with mean ${ze('nv_mean')} and standard deviation ${ze('nv_sd')} (rounded; the table is computed with the unrounded values) is assumed for the sepal width. How large is, according to this model, the probability of measuring exactly ${ze('nv_e_x', 2)}?`),
    antworten: [
      a(P('Null: Bei einer stetigen Verteilung hat ein einzelner Wert keine Fläche, nur Bereiche haben eine', 'Zero: for a continuous distribution a single value has no area, only ranges have one'),
        P('Wahrscheinlichkeiten sind Flächen unter der Dichtekurve, die Gesamtfläche ist 1. Über einem einzelnen Punkt gibt es keine Fläche.',
          'Probabilities are areas under the density curve, the total area is 1. There is no area over a single point.'), true),
      a(P(`Die Höhe der Kurve an dieser Stelle, also ${zd('nv_e_dichte', 2)}, denn die Kurve gibt die Wahrscheinlichkeit je Wert an`, `The height of the curve at this point, so ${ze('nv_e_dichte', 2)}, since the curve gives the probability per value`),
        P('Die Höhe der Dichtekurve ist keine Wahrscheinlichkeit; erst die Fläche über einem Bereich ist eine.',
          'The height of the density curve is not a probability; only the area over a range is one.')),
      a(P('Unendlich klein, aber größer als null, weil die Kurve an dieser Stelle eine Höhe über der Achse hat', 'Infinitely small but greater than zero, because the curve has a height above the axis at this point'),
        P('Der Wert ist genau 0, nicht unendlich klein. Dass die Kurve eine Höhe hat, ändert daran nichts: Die Fläche über einem Punkt ist 0.',
          'The value is exactly 0, not infinitely small. That the curve has a height does not change this: the area over a point is 0.'))
    ],
    hilfe: ['dichtefunktion', 'normalverteilung', 'wahrscheinlichkeitsverteilung'], belege: ['wissen:stetig-einzelwert-null']
  },
  {
    id: 'nv-arten', thema: 'verteilung', probieren: 'verteilungen',
    tabelle: tab('nv-arten', [P('Art', 'Species'), P('Anzahl', 'Count'), P('Mittelwert', 'Mean'), P('Standardabweichung', 'Standard deviation')], QUELLE_IRIS, P('Kelchblattbreite nach Art', 'Sepal width by species')),
    stamm: P('Für drei Schwertlilienarten wird die Breite der Kelchblätter jeweils mit einer Normalverteilung beschrieben (Tabelle). Wie unterscheiden sich die Kurven von setosa und versicolor?',
      'For three iris species the sepal width is described by a normal distribution each (table). How do the curves of setosa and versicolor differ?'),
    antworten: [
      a(P(`Setosa liegt weiter rechts (Mittelwert ${zd('nv_se_m')} gegen ${zd('nv_ve_m')}) und ist etwas breiter (${zd('nv_se_s')} gegen ${zd('nv_ve_s')})`, `Setosa lies farther right (mean ${ze('nv_se_m')} against ${ze('nv_ve_m')}) and is somewhat wider (${ze('nv_se_s')} against ${ze('nv_ve_s')})`),
        P('Mittelwert und Streuung legen eine Normalverteilung vollständig fest: Der Mittelwert bestimmt die Lage, die Streuung die Breite (Abstand der Wendepunkte vom Mittelwert).',
          'Mean and spread determine a normal distribution completely: the mean fixes the position, the spread the width (distance of the inflection points from the mean).'), true),
      a(P('Beide Kurven sind gleich breit und nur verschoben, denn jede Normalverteilung hat dieselbe Breite', 'Both curves are equally wide and merely shifted, since every normal distribution has the same width'),
        P('Die Breite hängt von der Standardabweichung ab. Normalverteilungen mit verschiedener Streuung sind verschieden breit.',
          'The width depends on the standard deviation. Normal distributions with different spreads have different widths.')),
      a(P('Nur der Mittelwert legt die Kurve fest, die Standardabweichung ist nur eine Nebenangabe dazu', 'Only the mean fixes the curve, the standard deviation is just an additional side remark'),
        P('Zwei Normalverteilungen mit gleichem Mittelwert, aber verschiedener Streuung sind verschieden. Erst beide Angaben legen die Kurve fest.',
          'Two normal distributions with the same mean but different spreads differ. Only both values together fix the curve.'))
    ],
    hilfe: ['normalverteilung', 'standardnormalverteilung'], belege: ['wissen:normal-mittel-median-modus']
  },
  {
    id: 'nv-flaeche', thema: 'verteilung', karte: 'verteilung', probieren: 'verteilungen',
    tabelle: tab('nv-flaeche', [P('Wert', 'Value'), P('z-Wert', 'z value'), P('Fläche links davon', 'Area to the left'), P('Anteil größerer Werte in den Daten', 'Share of larger values in the data')], QUELLE_IRIS, P('Normalverteilung der Kelchblattbreite (gerechnet mit ungerundetem Mittelwert und ungerundeter Standardabweichung)', 'Normal distribution of the sepal width (computed with the unrounded mean and standard deviation)')),
    stamm: P(`Für die Kelchblattbreite (Normalverteilung mit Mittelwert ${zd('nv_mean')} und Standardabweichung ${zd('nv_sd')}, gerundet; die Tabelle ist mit den ungerundeten Werten gerechnet) gibt die Tabelle zum Wert ${zd('nv_f_x', 1)} den z-Wert ${zd('nv_f_z')} und die Fläche links davon. Wie groß ist nach dem Modell der Anteil der Pflanzen mit größerer Breite?`,
      `For the sepal width (normal distribution with mean ${ze('nv_mean')} and standard deviation ${ze('nv_sd')}, rounded; the table is computed with the unrounded values) the table gives for the value ${ze('nv_f_x', 1)} the z value ${ze('nv_f_z')} and the area to the left of it. How large is, according to the model, the share of plants with a greater width?`),
    antworten: [
      a(P(`1 minus die Fläche links, also 1 - ${zd('nv_f_l', 4)} = ${zd('nv_f_r', 4)}`, `Complement: 1 minus the area on the left, so 1 - ${ze('nv_f_l', 4)} = ${ze('nv_f_r', 4)}`),
        P(`Die Tabelle der Standardnormalverteilung gibt die Fläche links des z-Wertes an, also den Anteil kleinerer oder gleicher Werte. Der Anteil größerer Werte ist die Gegenwahrscheinlichkeit. In den Daten sind es ${zd('nv_f_e', 4)}.`,
          `The table of the standard normal distribution gives the area to the left of the z value, that is the share of smaller or equal values. The share of larger values is the complement. In the data it is ${ze('nv_f_e', 4)}.`), true),
      a(P(`Die Fläche links, ${zd('nv_f_l', 4)}, denn die Tabelle gibt die größeren Werte an`, `The area on the left, ${ze('nv_f_l', 4)}, since the table gives the larger values`),
        P(`Die Fläche links ist der Anteil der Werte bis ${zd('nv_f_x', 1)}, also der kleineren und gleichen.`, `The area on the left is the share of values up to ${ze('nv_f_x', 1)}, that is of the smaller and equal ones.`)),
      a(P(`Der z-Wert ${zd('nv_f_z')} als Prozentzahl, also ${zd('nv_f_z', 1)} Prozent der Pflanzen`, `The z value ${ze('nv_f_z')} as a percentage, so ${ze('nv_f_z', 1)} percent of the plants`),
        P('Der z-Wert ist ein Abstand in Standardabweichungen, kein Anteil. Eine Wahrscheinlichkeit entsteht erst über die Fläche unter der Kurve.',
          'The z value is a distance in standard deviations, not a share. A probability arises only through the area under the curve.'))
    ],
    hilfe: ['standardnormalverteilung', 'z-wert', 'normalverteilung'], belege: ['wissen:normal-flaeche-links-komplement']
  },
  {
    id: 'nv-mitte', thema: 'verteilung', karte: 'verteilung',
    tabelle: tab('nv-mitte', [P('Variable', 'Variable'), P('Mittelwert', 'Mean'), P('Median', 'Median')], QUELLE_IRIS_RIVERS, P('Kelchblattbreite (Sepal.Width) und Flusslänge (rivers)', 'Sepal width (Sepal.Width) and river length (rivers)')),
    stamm: P('Bei einer Normalverteilung fallen Mittelwert, Median und Modus zusammen. Welche der beiden Variablen der Tabelle ist nach diesem Merkmal eher mit einer Normalverteilung vereinbar?',
      'In a normal distribution mean, median and mode coincide. Which of the two variables in the table is, by this property, more compatible with a normal distribution?'),
    antworten: [
      a(P('Die Kelchblattbreite: Mittelwert und Median liegen nah beieinander, bei Flüssen nicht', 'The sepal width: mean and median lie close together, for the river lengths far apart'),
        P('Die Normalverteilung ist symmetrisch, Mittelwert, Median und Modus fallen zusammen. Ein großer Abstand zwischen Mittelwert und Median spricht gegen Symmetrie.',
          'The normal distribution is symmetric, mean, median and mode coincide. A large gap between mean and median speaks against symmetry.'), true),
      a(P('Die Flusslänge: Der große Abstand zeigt die große Streuung, die zur Normalverteilung gehört', 'The river length: the large gap shows the large spread that belongs to the normal distribution'),
        P('Der Abstand zwischen Mittelwert und Median ist ein Hinweis auf eine unsymmetrische Verteilung, kein Maß der Streuung. Die Streuung zeigt die Standardabweichung.',
          'The gap between mean and median is a sign of an asymmetric distribution, not a measure of spread. The spread is shown by the standard deviation.')),
      a(P('Beide gleich gut, denn Mittelwert und Median sind in beiden Zeilen positive Zahlen', 'Both equally, since mean and median are positive numbers in both rows'),
        P('Dass beide Zahlen positiv sind, sagt nichts über die Form. Entscheidend ist, ob Mittelwert und Median zusammenfallen.',
          'That both numbers are positive says nothing about the shape. What matters is whether mean and median coincide.'))
    ],
    hilfe: ['normalverteilung', 'schiefe', 'median'], belege: ['wissen:normal-mittel-median-modus']
  },
  {
    id: 'nv-grenzen', thema: 'verteilung', karte: 'verteilung',
    tabelle: tab('nv-grenzen', [P('Zahl der Flüsse', 'Number of rivers'), P('Mittelwert', 'Mean'), P('Standardabweichung', 'Standard deviation'), P('Mittelwert minus zwei Standardabweichungen', 'Mean minus two standard deviations'), P('Anteil innerhalb zweier Standardabweichungen (Prozent)', 'Share within two standard deviations (percent)')], QUELLE_RIVERS, P('Flusslängen in Meilen', 'River lengths in miles')),
    stamm: P(`Bei den Flusslängen ergibt Mittelwert minus zwei Standardabweichungen ${zd('nv_g_lo')} Meilen (Tabelle). Was folgt daraus?`, `For the river lengths the mean minus two standard deviations gives ${ze('nv_g_lo')} miles (table). What follows?`),
    antworten: [
      a(P('Die Zwei-Standardabweichungen-Regel gehört zur Normalverteilung; die Standardabweichung bleibt gültig', 'The two-standard-deviation rule belongs to the normal distribution; the standard deviation stays valid'),
        P(`Eine Länge unter null gibt es nicht: Die Verteilung ist schief und keine Normalverteilung. Die Standardabweichung ${zd('nv_g_sd')} beschreibt die Variabilität unabhängig von der Verteilungsform.`,
          `A length below zero does not exist: the distribution is skewed and not normal. The standard deviation ${ze('nv_g_sd')} describes variability regardless of the shape of the distribution.`), true),
      a(P('Das ist ein Rechenfehler, denn Mittelwert minus zwei Standardabweichungen müsste eine mögliche Länge sein', 'That is a calculation error, since the mean minus two standard deviations ought to be a possible length'),
        P(`Diese Rechnung ist eine Regel für Normalverteilungen. Bei schiefen Verteilungen kann sie außerhalb des möglichen Bereichs liegen. Die Standardabweichung ${zd('nv_g_sd')} ist richtig berechnet.`,
          `This calculation is a rule for normal distributions. For skewed distributions it can fall outside the possible range. The standard deviation ${ze('nv_g_sd')} is calculated correctly.`)),
      a(P('Die Standardabweichung ist bei einer schiefen Verteilung kein gültiges Maß der Streuung der Werte', 'The standard deviation is not a valid measure of the spread of the values for a skewed distribution'),
        P('Die Standardabweichung ist, entgegen einer verbreiteten Annahme, ein gültiges Maß der Variabilität unabhängig von der Verteilungsform. Bei schiefer Verteilung kann man eine andere Kennzahl zur Zusammenfassung wählen.',
          'Contrary to a common assumption, the standard deviation is a valid measure of variability regardless of the shape of the distribution. For a skewed distribution another summary statistic may be chosen.'))
    ],
    hilfe: ['standardabweichung', 'normalverteilung', 'schiefe'], belege: ['wissen:altman05-sd-verteilungsform', 'wissen:normalverteilung-eigenschaften']
  },
  // ---- weitere Verteilungen ----
  {
    id: 'wv-poisson', thema: 'verteilung', probieren: 'verteilungen',
    tabelle: tab('wv-poisson', [P('Spritzmittel', 'Spray'), P('Zahl der Flächen', 'Number of plots'), P('Mittelwert', 'Mean'), P('Varianz', 'Variance')], QUELLE_INSEKT, P('Zwei von sechs Spritzmitteln', 'Two of six sprays')),
    stamm: P('Gezählt werden Insekten auf Versuchsflächen, die mit demselben Spritzmittel behandelt wurden (Tabelle). Welche Verteilung passt zur Art dieser Zählung?', 'Insects are counted on experimental plots treated with the same spray (table). Which distribution suits this kind of count?'),
    antworten: [
      a(P('Die Poissonverteilung: Ereignisse in fester Fläche, Mittelwert und Varianz sind ähnlich', 'The Poisson distribution: events in a fixed area, mean and variance are similar'),
        P(`Die Poissonverteilung zählt unabhängige Ereignisse in einem festen Bereich (Zeit, Strecke, Fläche, Volumen); Erwartungswert und Varianz sind gleich. In der Tabelle liegen sie nah beieinander (${zd('wv_b_m')} und ${zd('wv_b_v')}; ${zd('wv_e_m')} und ${zd('wv_e_v')}).`,
          `The Poisson distribution counts independent events in a fixed range (time, length, area, volume); expected value and variance are equal. In the table they are close to each other (${ze('wv_b_m')} and ${ze('wv_b_v')}; ${ze('wv_e_m')} and ${ze('wv_e_v')}).`), true),
      a(P('Die Binomialverteilung, denn gezählt wird die Zahl der Insekten, also eine Zahl von Erfolgen', 'The binomial distribution, since the number of insects is counted, that is a number of successes'),
        P('Die Binomialverteilung zählt Erfolge bei einer festen Zahl von Versuchen. Hier gibt es keine feste Zahl von Versuchen, sondern Ereignisse in einer Fläche.',
          'The binomial distribution counts successes in a fixed number of trials. Here there is no fixed number of trials but events in an area.')),
      a(P('Die Normalverteilung, denn Zählwerte sind Zahlen auf einer stetigen Skala, die sich mitteln lässt', 'The normal distribution, since counts are numbers on a continuous scale that can be averaged'),
        P('Zählwerte nehmen nur die Werte 0, 1, 2, ... an und sind diskret; die Normalverteilung ist stetig.',
          'Counts take only the values 0, 1, 2, ... and are discrete; the normal distribution is continuous.'))
    ],
    hilfe: ['poisson-verteilung', 'binomialverteilung'], belege: ['wissen:poisson-fester-bereich', 'wissen:binomial-eigenschaften']
  },
  {
    id: 'wv-binom', thema: 'verteilung', karte: 'verteilung', probieren: 'verteilungen',
    tabelle: tab('wv-binom', [P('k', 'k'), P('P(X = k)', 'P(X = k)'), P('P(X ≤ k)', 'P(X ≤ k)')], QUELLE_RECHEN, P('Rechenbeispiel: 10 unabhängige Versuche, Erfolgswahrscheinlichkeit 0,3', 'Worked example: 10 independent trials, success probability 0.3')),
    stamm: P(`Rechenbeispiel (Tabelle): ${zn('wv_bn')} unabhängige Versuche mit der Erfolgswahrscheinlichkeit ${zd('wv_bth', 1)}. Wie groß ist die Wahrscheinlichkeit für mindestens 4 Erfolge?`, `Worked example (table): ${zn('wv_bn')} independent trials with success probability ${ze('wv_bth', 1)}. How large is the probability of at least 4 successes?`),
    antworten: [
      a(P(`1 - P(X ≤ 3) = 1 - ${zd('wv_b3', 4)} = ${zd('wv_bmin4', 4)}`, `1 - P(X ≤ 3) = 1 - ${ze('wv_b3', 4)} = ${ze('wv_bmin4', 4)}`),
        P('Bei einer diskreten Verteilung ist "mindestens 4" das Gegenteil von "höchstens 3": P(X ≥ 4) = 1 - P(X ≤ 3).', 'For a discrete distribution "at least 4" is the opposite of "at most 3": P(X ≥ 4) = 1 - P(X ≤ 3).'), true),
      a(P(`1 - P(X ≤ 4) = 1 - ${zd('wv_b4', 4)} = ${zd('wv_bgt4', 4)}`, `1 - P(X ≤ 4) = 1 - ${ze('wv_b4', 4)} = ${ze('wv_bgt4', 4)}`),
        P('Das ist P(X > 4), also mehr als 4 Erfolge; der Wert 4 selbst fehlt. P(X ≥ 4) schließt ihn ein.', 'That is P(X > 4), so more than 4 successes; the value 4 itself is missing. P(X ≥ 4) includes it.')),
      a(P(`P(X ≤ 4), also ${zd('wv_b4', 4)}, direkt aus der Tabelle`, `P(X ≤ 4), so ${ze('wv_b4', 4)}, directly from the table`),
        P('P(X ≤ 4) ist die Wahrscheinlichkeit für höchstens 4 Erfolge, die Spalte der Tabelle beantwortet die umgekehrte Frage.', 'P(X ≤ 4) is the probability of at most 4 successes, the column of the table answers the opposite question.'))
    ],
    hilfe: ['binomialverteilung', 'verteilungsfunktion'], belege: ['wissen:binomial-eigenschaften']
  },
  {
    id: 'wv-hyper', thema: 'verteilung', fall: 'wv-auto', probieren: 'verteilungen',
    stamm: P('Aus den 32 Wagen werden sechs zufällig ohne Zurücklegen gezogen. Welche Verteilung beschreibt die Zahl der Wagen mit Automatik unter ihnen?', 'Six of the 32 cars are drawn at random without replacement. Which distribution describes the number of cars with automatic transmission among them?'),
    antworten: [
      a(P('Die hypergeometrische Verteilung, denn ohne Zurücklegen hängen die Züge voneinander ab', 'The hypergeometric distribution, since without replacement the draws depend on each other'),
        P(`Ohne Zurücklegen ändert jeder Zug die Zusammensetzung der übrigen Wagen. Die Tabelle zeigt es: ${zd('wv_h_ph', 3)} gegen ${zd('wv_h_pb', 3)} bei der Binomialverteilung für sechs Wagen mit Automatik.`,
          `Without replacement each draw changes the composition of the remaining cars. The table shows it: ${ze('wv_h_ph', 3)} against ${ze('wv_h_pb', 3)} for the binomial distribution for six cars with automatic transmission.`), true),
      a(P('Die Binomialverteilung, denn es gibt nur zwei Ausgänge, Automatik oder Handschaltung bei jedem Zug', 'The binomial distribution, since there are only two outcomes at every draw, automatic or manual'),
        P('Die Binomialverteilung gehört zu einer Stichprobe mit Zurücklegen (unabhängige Versuche, gleiche Wahrscheinlichkeit). Zwei Ausgänge allein genügen dafür nicht. Bei sechs aus 32 ist die Stichprobe nicht klein gegenüber der Grundgesamtheit.',
          'The binomial distribution belongs to a sample with replacement (independent trials, same probability). Two outcomes alone are not enough for it. With six out of 32 the sample is not small compared with the population.')),
      a(P('Die Poissonverteilung, denn es wird die Zahl der Wagen mit einer bestimmten Eigenschaft gezählt', 'The Poisson distribution, since the number of cars with a certain property is counted'),
        P('Die Poissonverteilung gehört zu Ereignissen in einem festen Bereich wie Zeit oder Fläche, nicht zum Ziehen aus einer Menge von 32 Wagen.',
          'The Poisson distribution belongs to events in a fixed range such as time or area, not to drawing from a set of 32 cars.'))
    ],
    hilfe: ['hypergeometrische-verteilung', 'binomialverteilung'], belege: ['wissen:hypergeometrisch-ohne-zuruecklegen', 'wissen:binomial-eigenschaften']
  },
  {
    id: 'wv-hyper-var', thema: 'verteilung', fall: 'wv-auto',
    stamm: P('Wie hängen Erwartungswert und Varianz der Zahl der Wagen mit Automatik bei beiden Verteilungen zusammen (Tabelle)?', 'How are expected value and variance of the number of cars with automatic transmission related under the two distributions (table)?'),
    antworten: [
      a(P(`Gleicher Erwartungswert (${zd('wv_h_e')}), die hypergeometrische Varianz ist kleiner (${zd('wv_h_vh')} gegen ${zd('wv_h_vb')})`, `Same expected value (${ze('wv_h_e')}), the hypergeometric variance is smaller (${ze('wv_h_vh')} against ${ze('wv_h_vb')})`),
        P(`Die hypergeometrische Varianz ist die binomiale mal (N - n) / (N - 1) = (${zn('wv_h_N')} - ${zn('wv_h_n')}) / (${zn('wv_h_N')} - 1), die Endlichkeitskorrektur; sie ist kleiner als 1.`,
          `The hypergeometric variance is the binomial one times (N - n) / (N - 1) = (${zn('wv_h_N')} - ${zn('wv_h_n')}) / (${zn('wv_h_N')} - 1), the finite population correction; it is smaller than 1.`), true),
      a(P('Beide Kennzahlen sind gleich, denn beide Verteilungen zählen dieselben Erfolge in der Stichprobe', 'Both statistics are equal, since both distributions count the same successes in the sample'),
        P('Der Erwartungswert ist gleich, die Varianzen nicht: Die Endlichkeitskorrektur verkleinert die hypergeometrische Varianz.',
          'The expected value is equal, the variances are not: the finite population correction makes the hypergeometric variance smaller.')),
      a(P('Die Varianz der hypergeometrischen Verteilung ist größer, weil sich abhängige Züge verstärken', 'The variance of the hypergeometric distribution is larger, because dependent draws reinforce each other'),
        P('Der Korrekturfaktor (N - n) / (N - 1) ist kleiner als 1; er macht die Varianz kleiner, nicht größer.',
          'The correction factor (N - n) / (N - 1) is smaller than 1; it makes the variance smaller, not larger.'))
    ],
    hilfe: ['hypergeometrische-verteilung', 'binomialverteilung'], belege: ['wissen:hypergeometrisch-ohne-zuruecklegen']
  },
  {
    id: 'wv-t', thema: 'verteilung', karte: 'verteilung', probieren: 'verteilungen',
    tabelle: tab('wv-t', [P('Freiheitsgrade', 'Degrees of freedom'), P('Quantil zu 0,975', 'Quantile at 0.975')], QUELLE_RECHEN, P('Kritische Werte der t-Verteilung (z = Standardnormalverteilung)', 'Critical values of the t distribution (z = standard normal distribution)')),
    stamm: P(`Angenommen, es gilt das Niveau ${zd('wv_t_alpha', 2)} für einen zweiseitigen Test. Die Tabelle zeigt den kritischen Wert (Quantil zu ${zd('wv_t_p', 3)}) der t-Verteilung nach Freiheitsgraden und zum Vergleich den der Standardnormalverteilung (z). Was zeigt sie?`,
      `Suppose the level ${ze('wv_t_alpha', 2)} applies to a two-sided test. The table shows the critical value (quantile at ${ze('wv_t_p', 3)}) of the t distribution by degrees of freedom and, for comparison, that of the standard normal distribution (z). What does it show?`),
    antworten: [
      a(P('Mit mehr Freiheitsgraden nähert sich t der Normalverteilung, bei wenigen liegt er weiter außen', 'With more degrees of freedom t approaches the normal distribution; with few the value lies farther out'),
        P(`Der kritische Wert fällt von ${zd('wv_t_2')} bei 2 Freiheitsgraden über ${zd('wv_t_30')} bei 30 auf ${zd('wv_t_100')} bei 100 und nähert sich ${zd('wv_t_z')}. Die Form der t-Verteilung hängt nur von den Freiheitsgraden ab.`,
          `The critical value falls from ${ze('wv_t_2')} at 2 degrees of freedom via ${ze('wv_t_30')} at 30 to ${ze('wv_t_100')} at 100 and approaches ${ze('wv_t_z')}. The shape of the t distribution depends only on the degrees of freedom.`), true),
      a(P('Der kritische Wert hängt vom Stichprobenumfang kaum ab; die Unterschiede in der Tabelle sind Rundung', 'The critical value hardly depends on the sample size; the differences in the table are rounding'),
        P('Die Form der t-Verteilung hängt von den Freiheitsgraden ab, damit auch der kritische Wert. Der Unterschied zwischen 2 und 100 Freiheitsgraden ist groß.',
          'The shape of the t distribution depends on the degrees of freedom, and so does the critical value. The difference between 2 and 100 degrees of freedom is large.')),
      a(P('Mit mehr Freiheitsgraden wird die t-Verteilung breiter, und deshalb steigt der kritische Wert an', 'With more degrees of freedom the t distribution becomes wider, and for that reason the critical value rises'),
        P('Der Wert sinkt mit den Freiheitsgraden, die Tabelle zeigt es: Die Verteilung wird der Standardnormalverteilung ähnlicher.',
          'The value falls with the degrees of freedom, as the table shows: the distribution becomes more similar to the standard normal distribution.'))
    ],
    hilfe: ['t-verteilung', 'standardnormalverteilung'], belege: ['wissen:t-verteilung-eigenschaften']
  },
  {
    id: 'wv-vorzeichen', thema: 'verteilung', karte: 'verteilung',
    tabelle: tab('wv-vorzeichen', [P('Prüfgröße', 'Test statistic'), P('Wert', 'Value')], QUELLE_PRUEF, P('Drei Prüfgrößen aus Ausgaben', 'Three test statistics from output')),
    stamm: P('In Ausgaben stehen drei Prüfgrößen: ein t-Wert, ein F-Wert und ein Chi-Quadrat-Wert (Tabelle). Was gilt für die Vorzeichen möglicher Werte?', 'Output shows three test statistics: a t value, an F value and a chi-square value (table). What holds for the signs of possible values?'),
    antworten: [
      a(P('Ein t-Wert kann negativ sein, F und Chi-Quadrat entstehen aus Quadraten und liegen ab null', 'A t value can be negative, F and chi-square arise from squares and start at zero'),
        P('Die t-Verteilung ist symmetrisch um 0. F und Chi-Quadrat entstehen aus quadrierten Abweichungen und sind nie negativ; die Richtung der Abweichung geht dabei verloren.',
          'The t distribution is symmetric about 0. F and chi-square arise from squared deviations and are never negative; the direction of the deviation is lost.'), true),
      a(P('Alle drei können negativ sein, das Vorzeichen zeigt die Richtung der Abweichung', 'All three can be negative, the sign shows the direction of the deviation'),
        P('Das gilt nur für t. Der F-Wert ist nie negativ, und der Chi-Quadrat-Wert kann wegen der Quadrierung nur positive Werte annehmen.',
          'That holds for t only. The F value is never negative, and the chi-square value can take only positive values because of squaring.')),
      a(P('Bei t und F zeigt das Vorzeichen die Richtung, nur Chi-Quadrat ist durch das Quadrieren positiv', 'For t and F the sign shows the direction, only chi-square is positive through squaring'),
        P('Auch der F-Wert ist nie negativ; seine Verteilung ist rechtsschief, und der Test prüft ungerichtet.',
          'The F value is never negative either; its distribution is right-skewed and the test is undirected.'))
    ],
    hilfe: ['t-verteilung', 'f-verteilung', 'chi-quadrat-verteilung'], belege: ['wissen:t-verteilung-eigenschaften', 'wissen:f-verteilung-eigenschaften', 'wissen:chiquadrat-nur-positiv']
  },
  // ---- Stichprobenverteilung ----
  {
    id: 'sv-sd-se', thema: 'verteilung', probieren: 'lernlabor',
    tabelle: tab('sv-sd-se', [P('Umfang n', 'Size n'), P('Standardabweichung (SD)', 'Standard deviation (SD)'), P('Standardfehler (SE)', 'Standard error (SE)')], QUELLE_GEYSIR, P('Erste n Wartezeiten', 'First n waiting times')),
    stamm: P('Aus den Wartezeiten zwischen Ausbrüchen eines Geysirs werden die ersten 34, die ersten 136 und alle 272 Werte ausgewertet (Tabelle). Was zeigt der Vergleich von Standardabweichung (SD) und Standardfehler (SE)?',
      'From the waiting times between eruptions of a geyser the first 34, the first 136 and all 272 values are analysed (table). What does the comparison of standard deviation (SD) and standard error (SE) show?'),
    antworten: [
      a(P('Die SD bleibt ähnlich, weil sie die Streuung der Werte beschreibt; der SE sinkt mit n', 'The SD stays similar because it describes the spread of the values; the SE falls with n'),
        P(`SE = SD geteilt durch Wurzel n: ${zd('sv_sd1')} / Wurzel 34 = ${zd('sv_se1')}, mit allen 272 Werten ${zd('sv_se3')}. Die SD beschreibt die Variabilität der Daten und ändert sich mit n nicht tendenziell.`,
          `SE = SD divided by the square root of n: ${ze('sv_sd1')} / square root of 34 = ${ze('sv_se1')}, with all 272 values ${ze('sv_se3')}. The SD describes the variability of the data and does not tend to change with n.`), true),
      a(P('Beide sinken mit wachsendem n, denn je mehr Daten vorliegen, desto genauer wird jede Kennzahl', 'Both fall as n grows, since the more data are available, the more precise every statistic becomes'),
        P(`Die SD beschreibt die Streuung der Daten und bleibt ähnlich (${zd('sv_sd1')} und ${zd('sv_sd3')}). Nur der SE, die Unsicherheit der Schätzung des Mittelwerts, sinkt.`,
          `The SD describes the spread of the data and stays similar (${ze('sv_sd1')} and ${ze('sv_sd3')}). Only the SE, the uncertainty of the estimate of the mean, falls.`)),
      a(P('Beide bleiben gleich, denn der Stichprobenumfang n kommt in keiner der beiden Formeln vor', 'Both stay the same, since the sample size n appears in neither of the two formulas'),
        P('n steht im Standardfehler im Nenner (SD durch Wurzel n), darum sinkt er mit wachsendem n.', 'n appears in the denominator of the standard error (SD over the square root of n), which is why it falls as n grows.'))
    ],
    hilfe: ['standardfehler', 'standardabweichung', 'stichprobenverteilung'], belege: ['wissen:altman05-sd-gegen-standardfehler']
  },
  {
    id: 'sv-mitte', thema: 'verteilung', probieren: 'lernlabor',
    tabelle: tab('sv-mitte', [P('Umfang n', 'Size n'), P('Mittel der Mittelwerte', 'Mean of the means'), P('Streuung der Mittelwerte', 'Spread of the means'), P('Theorie: Streuung der Flüsse (Nenner n) durch Wurzel n', 'Theory: spread of the rivers (denominator n) over the square root of n')], QUELLE_SIM, P('Simulation: Mittelwerte von Stichproben aus den Flusslängen', 'Simulation: means of samples of the river lengths')),
    stamm: P(`Simulation: Aus den 141 Flusslängen (Mittelwert ${zd('sv_m_mu', 1)}) werden mit Zurücklegen je ${zn('sv_m_n')} Stichproben der Umfänge 5, 20 und 80 gezogen und ihre Mittelwerte berechnet (Tabelle). Wie verteilen sich die Mittelwerte?`,
      `Simulation: from the 141 river lengths (mean ${ze('sv_m_mu', 1)}) ${zn('sv_m_n')} samples each of sizes 5, 20 and 80 are drawn with replacement and their means computed (table). How are the means distributed?`),
    antworten: [
      a(P('Ihre Mitte liegt beim Mittelwert der Flüsse, ihre Streuung sinkt mit wachsendem n', 'Their centre lies at the mean of the rivers, their spread falls as n grows'),
        P(`Der Erwartungswert der Stichprobenmittelwerte ist der Populationsmittelwert, unabhängig von n. Die Streuung der Mittelwerte ist der Standardfehler, Streuung durch Wurzel n: ${zd('sv_m_s5', 1)} bei n = 5, ${zd('sv_m_s80', 1)} bei n = 80.`,
          `The expected value of the sample means is the population mean, regardless of n. The spread of the means is the standard error, spread over the square root of n: ${ze('sv_m_s5', 1)} at n = 5, ${ze('sv_m_s80', 1)} at n = 80.`), true),
      a(P('Ihre Mitte wandert mit wachsendem n zum Median, ihre Streuung bleibt wie die der Flüsse', 'Their centre moves towards the median as n grows, their spread stays like that of the rivers'),
        P(`Die Mitten in der Tabelle liegen alle nahe am Mittelwert der Flüsse (${zd('sv_m_mu', 1)}), nicht beim Median (425). Der Stichprobenmittelwert schätzt den Populationsmittelwert erwartungstreu.`,
          `The centres in the table all lie close to the mean of the rivers (${ze('sv_m_mu', 1)}), not at the median (425). The sample mean estimates the population mean without bias.`)),
      a(P('Ihre Mitte liegt beim Mittelwert der Flüsse, ihre Streuung bleibt so groß wie die der Flüsse', 'Their centre lies at the mean of the rivers, their spread stays as large as that of the rivers'),
        P(`Die Streuung der Mittelwerte sinkt mit der Wurzel von n (${zd('sv_m_s5', 1)} bei n = 5, ${zd('sv_m_s80', 1)} bei n = 80); sie bleibt weit unter der Streuung der Flusslängen.`,
          `The spread of the means falls with the square root of n (${ze('sv_m_s5', 1)} at n = 5, ${ze('sv_m_s80', 1)} at n = 80); it stays far below the spread of the river lengths.`))
    ],
    hilfe: ['stichprobenverteilung', 'standardfehler'], belege: ['wissen:standardfehler-mittelwert', 'wissen:stichprobenverteilung-gedankengang']
  },
  {
    id: 'sv-einzelwerte', thema: 'verteilung', probieren: 'lernlabor',
    tabelle: tab('sv-einzelwerte', [P('Umfang n (n = 1: Einzelwerte)', 'Size n (n = 1: single values)'), P('Schiefe der Mittelwerte', 'Skewness of the means')], QUELLE_SCHIEF, P('Schiefe der Mittelwerte von Flusslängen', 'Skewness of the means of river lengths')),
    stamm: P('Die Flusslängen sind stark schief verteilt. Die Tabelle zeigt die Schiefe der Mittelwerte von Stichproben des Umfangs n (n = 1 sind die Einzelwerte). Was sagt der zentrale Grenzwertsatz dazu?',
      'The river lengths are strongly skewed. The table shows the skewness of the means of samples of size n (n = 1 are the single values). What does the central limit theorem say about this?'),
    antworten: [
      a(P('Er betrifft die Mittelwerte, die symmetrischer werden; die Einzelwerte bleiben schief', 'It concerns the means, which become more symmetric; the single values stay skewed'),
        P(`Die Schiefe der Mittelwerte sinkt von ${zd('sv_s1')} über ${zd('sv_s5')} (n = 5) und ${zd('sv_s30')} (n = 30) auf ${zd('sv_s100')} (n = 100). Die Werte der Flüsse selbst ändern sich nicht.`,
          `The skewness of the means falls from ${ze('sv_s1')} via ${ze('sv_s5')} (n = 5) and ${ze('sv_s30')} (n = 30) to ${ze('sv_s100')} (n = 100). The values of the rivers themselves do not change.`), true),
      a(P('Er macht ab n = 30 auch die Einzelwerte der Stichprobe normalverteilt, nicht nur die Mittelwerte', 'It makes the single values of the sample normally distributed from n = 30, not only the means'),
        P('Die Verteilung der Einzelwerte bleibt die der Population, auch in großen Stichproben. Normaler wird nur die Verteilung der Mittelwerte.',
          'The distribution of single values remains that of the population, even in large samples. Only the distribution of the means becomes more normal.')),
      a(P('Er gilt für jede Kennzahl, auch für die Spannweite, deren Verteilung dann mit n normal wird', 'It holds for every statistic, including the range, whose distribution then becomes normal with n'),
        P('Die Aussage betrifft die Verteilung der Stichprobenmittelwerte; jede beliebige Kennzahl wird dadurch nicht normalverteilt.',
          'The statement concerns the distribution of the sample means; an arbitrary statistic does not become normally distributed because of it.'))
    ],
    hilfe: ['zentraler-grenzwertsatz', 'stichprobenverteilung'], belege: ['wissen:grenzwertsatz-verlauf', 'wissen:stichprobenverteilung-gedankengang']
  },
  {
    id: 'sv-form', thema: 'verteilung', probieren: 'lernlabor',
    tabelle: tab('sv-form', [P('Umfang n (n = 1: Einzelwerte)', 'Size n (n = 1: single values)'), P('Schiefe der Mittelwerte: Flusslängen', 'Skewness of the means: river lengths'), P('Schiefe der Mittelwerte: Jahresniederschlag', 'Skewness of the means: annual precipitation')], QUELLE_SCHIEF, P('Schiefe der Mittelwerte in zwei Populationen', 'Skewness of the means in two populations')),
    stamm: P('Angenommen, die Faustregel lautet: Ab n = 30 sind Mittelwerte annähernd normalverteilt. Die Tabelle zeigt die Schiefe der Mittelwerte für Flusslängen und für den Jahresniederschlag von 70 Städten. Was folgt?',
      'Suppose the rule of thumb is: from n = 30 means are approximately normally distributed. The table shows the skewness of the means for river lengths and for the annual precipitation of 70 cities. What follows?'),
    antworten: [
      a(P('Wie schnell die Näherung greift, hängt von der Form ab; Flüsse sind bei n = 30 noch schief', 'How fast the approximation takes hold depends on the shape; rivers are still skewed at n = 30'),
        P(`Bei den Flüssen sinkt die Schiefe der Mittelwerte von ${zd('sv_s1')} auf ${zd('sv_s30')} bei n = 30, beim Niederschlag liegt sie schon bei n = 1 nur bei ${zd('sv_p1')}. Die Faustregel ist eine Konvention, die nötige Größe hängt von der Verteilungsform ab.`,
          `For the rivers the skewness of the means falls from ${ze('sv_s1')} to ${ze('sv_s30')} at n = 30, for precipitation it is only ${ze('sv_p1')} at n = 1 already. The rule of thumb is a convention, the required size depends on the shape of the distribution.`), true),
      a(P('Ab n = 30 ist die Näherung bei Flüssen und Niederschlag gleich gut, denn die Faustregel gilt allgemein', 'From n = 30 the approximation is equally good for rivers and precipitation, since the rule of thumb applies generally'),
        P('Die Tabelle zeigt das Gegenteil: Bei n = 30 unterscheiden sich die Populationen deutlich in der Schiefe ihrer Mittelwerte.',
          'The table shows the opposite: at n = 30 the populations differ clearly in the skewness of their means.')),
      a(P('Die Faustregel ist bewiesen: Ab n = 30 sind die Mittelwerte der Flusslängen exakt normalverteilt', 'The rule of thumb is proven: from n = 30 the means of the river lengths are exactly normally distributed'),
        P('Mit wachsendem n nähert sich die Verteilung der Mittelwerte der Normalverteilung an; exakt wird sie bei einer nicht normalen Population nicht. Die 30 ist eine Konvention.',
          'With growing n the distribution of the means approaches the normal distribution; for a non-normal population it does not become exact. The 30 is a convention.'))
    ],
    hilfe: ['zentraler-grenzwertsatz', 'stichprobenverteilung'], belege: ['wissen:n30-faustregel', 'wissen:grenzwertsatz-verlauf']
  },
  {
    id: 'sv-vierfach', thema: 'verteilung', probieren: 'lernlabor',
    tabelle: tab('sv-vierfach', [P('Umfang n', 'Size n'), P('Standardfehler des Mittelwerts', 'Standard error of the mean')], QUELLE_CARS, P('Rechenbeispiel: Standardfehler bei gleicher Streuung der Messwerte', 'Worked example: standard error with equal spread of the measurements')),
    stamm: P(`Rechenbeispiel (Tabelle): Bei 50 Fahrversuchen ist der Standardfehler des mittleren Bremswegs ${zd('sv_v_se50')}, die Standardabweichung der Messwerte ist ${zd('sv_v_sd')} und bleibt gleich. Wie groß muss die Stichprobe sein, damit der Standardfehler halb so groß wird?`,
      `Worked example (table): for 50 trials the standard error of the mean stopping distance is ${ze('sv_v_se50')}, the standard deviation of the measurements is ${ze('sv_v_sd')} and stays the same. How large must the sample be for the standard error to be half as large?`),
    antworten: [
      a(P(`Viermal so groß (n = 200): Der Standardfehler sinkt von ${zd('sv_v_se50')} auf ${zd('sv_v_se200')}`, `Four times as large (n = 200): the standard error falls from ${ze('sv_v_se50')} to ${ze('sv_v_se200')}`),
        P('SE = SD geteilt durch Wurzel n. Die Wurzel aus 4 ist 2: Ein vervierfachter Stichprobenumfang halbiert den Standardfehler.', 'SE = SD divided by the square root of n. The square root of 4 is 2: a quadrupled sample size halves the standard error.'), true),
      a(P(`Doppelt so groß (n = 100): Der Standardfehler sinkt von ${zd('sv_v_se50')} auf ${zd('sv_v_se100')}`, `Twice as large (n = 100): the standard error falls from ${ze('sv_v_se50')} to ${ze('sv_v_se100')}`),
        P(`Bei doppeltem n sinkt der Standardfehler nur um den Faktor Wurzel 2, hier auf ${zd('sv_v_se100')}; er wird nicht halbiert.`, `With doubled n the standard error falls only by the factor square root of 2, here to ${ze('sv_v_se100')}; it is not halved.`)),
      a(P('Die Stichprobengröße ändert nichts, der Standardfehler hängt nur von der Streuung ab', 'The sample size changes nothing, the standard error depends only on the spread'),
        P('Der Standardfehler sinkt mit wachsendem Stichprobenumfang. Die Stichprobengröße hat sehr wohl Einfluss auf die Streuung des Stichprobenmittelwerts.',
          'The standard error falls as the sample size grows. The sample size does influence the spread of the sample mean.'))
    ],
    hilfe: ['standardfehler', 'stichprobenfehler'], belege: ['wissen:standardfehler-mittelwert']
  },
  // ---- Anteil und Binomialtest ----
  {
    id: 'bt-p', thema: 'verteilung', fall: 'bt-auto', probieren: 'anteilstest',
    stamm: P(`Unter ${zn('bt_n')} Wagen haben ${zn('bt_k')} Handschaltung. Der exakte Binomialtest gegen den Anteil ${zd('bt_p0', 1)} gibt zweiseitig p = ${zd('bt_p', 3)} (Tabelle). Wie ist dieses p zu deuten?`,
      `Of ${zn('bt_n')} cars ${zn('bt_k')} have manual transmission. The exact binomial test against the proportion ${ze('bt_p0', 1)} gives p = ${ze('bt_p', 3)} two-sided (table). How is this p to be interpreted?`),
    antworten: [
      a(P(`Bei Anteil ${zd('bt_p0', 1)} träte ein mindestens so weit von 16 entferntes Ergebnis in etwa 38 Prozent auf`, `With the proportion ${ze('bt_p0', 1)} a result at least as far from 16 would occur in about 38 percent`),
        P('Der p-Wert ist die Wahrscheinlichkeit, die beobachteten oder noch extremere Daten zu erhalten, wenn die Nullhypothese gilt. Zweiseitig zählen die Ergebnisse auf beiden Seiten von 16.',
          'The p value is the probability of obtaining the observed or more extreme data if the null hypothesis holds. Two-sided, the results on both sides of 16 count.'), true),
      a(P(`Mit ${zd('bt_p100', 1)} Prozent Wahrscheinlichkeit gilt der Anteil ${zd('bt_p0', 1)}, der Test hat also zu 38 Prozent recht`, `With a probability of ${ze('bt_p100', 1)} percent the proportion ${ze('bt_p0', 1)} is true, so the test is right in 38 percent`),
        P('Der p-Wert ist nicht die Wahrscheinlichkeit, dass die Nullhypothese wahr ist.', 'The p value is not the probability that the null hypothesis is true.')),
      a(P(`Der Test hat gezeigt, dass der Anteil der Handschaltung ${zd('bt_p0', 1)} beträgt, weil p nicht klein ist`, `The test has shown that the proportion with manual transmission is ${ze('bt_p0', 1)}, because p is not small`),
        P('Ein nicht signifikantes Ergebnis heißt nur, dass H0 nicht verworfen werden konnte; es ist kein Beleg für H0.', 'A non-significant result only means that H0 could not be rejected; it is not evidence for H0.'))
    ],
    hilfe: ['binomialtest', 'p-wert', 'verstehen-anteilstest'], belege: ['wissen:p-wert-definition', 'wissen:nicht-signifikant-kein-beleg']
  },
  {
    id: 'bt-groesser', thema: 'verteilung', fall: 'bt-auto', probieren: 'anteilstest',
    stamm: P(`Von denselben ${zn('bt_n')} Wagen haben ${zn('bt_g_k')} Automatik. Einseitig geprüft wird, ob der Anteil mit Automatik größer ist als ${zd('bt_p0', 1)}. Welche Rechnung liefert den p-Wert (zweite Tabelle)?`,
      `Of the same ${zn('bt_n')} cars ${zn('bt_g_k')} have automatic transmission. The one-sided test asks whether the proportion with automatic transmission is greater than ${ze('bt_p0', 1)}. Which calculation gives the p value (second table)?`),
    antworten: [
      a(P(`P(X ≥ ${zn('bt_g_k')}) = 1 - P(X ≤ 18) = ${zd('bt_g_p', 4)}`, `P(X ≥ ${zn('bt_g_k')}) = 1 - P(X ≤ 18) = ${ze('bt_g_p', 4)}`),
        P('Der p-Wert enthält das beobachtete Ergebnis selbst: 19 oder mehr. Bei einer diskreten Verteilung ist das 1 minus die Wahrscheinlichkeit für höchstens 18.',
          'The p value includes the observed result itself: 19 or more. For a discrete distribution that is 1 minus the probability of at most 18.'), true),
      a(P(`P(X > ${zn('bt_g_k')}) = 1 - P(X ≤ ${zn('bt_g_k')}) = 1 - ${zd('bt_g_c19', 4)} = ${zd('bt_g_gt', 4)}`, `P(X > ${zn('bt_g_k')}) = 1 - P(X ≤ ${zn('bt_g_k')}) = 1 - ${ze('bt_g_c19', 4)} = ${ze('bt_g_gt', 4)}`),
        P('Das ist P(X > 19). Es lässt das beobachtete Ergebnis 19 aus und ergibt einen zu kleinen p-Wert.', 'That is P(X > 19). It leaves out the observed result 19 and gives a p value that is too small.')),
      a(P(`P(X ≤ ${zn('bt_g_k')}) = ${zd('bt_g_c19', 4)}, der Wert aus der Tabelle`, `P(X ≤ ${zn('bt_g_k')}) = ${ze('bt_g_c19', 4)}, the value from the table`),
        P('P(X ≤ 19) ist die Wahrscheinlichkeit für höchstens 19, das entspricht der Gegenrichtung. Gefragt ist die Wahrscheinlichkeit für 19 oder mehr.',
          'P(X ≤ 19) is the probability of at most 19, which is the opposite direction. The question asks for the probability of 19 or more.'))
    ],
    hilfe: ['binomialtest', 'verteilungsfunktion', 'binomialverteilung'], belege: ['wissen:binomial-eigenschaften', 'wissen:binomialtest-ablehnregel-diskret']
  },
  {
    id: 'bt-niveau', thema: 'verteilung', probieren: 'anteilstest',
    tabelle: tab('bt-niveau', [P('Grenze c', 'Limit c'), P('P(X ≥ c)', 'P(X ≥ c)')], QUELLE_RECHEN, P('Rechenbeispiel: 20 Versuche, Anteil 0,5 unter H0', 'Worked example: 20 trials, proportion 0.5 under H0')),
    stamm: P(`Rechenbeispiel: ${zn('bt_a_n')} Versuche, H0: Anteil ${zd('bt_p0', 1)}, einseitig gegen größere Anteile, Niveau ${zd('bt_a_alpha', 2)}. H0 wird abgelehnt, wenn die Zahl der Erfolge mindestens c beträgt (Tabelle). Welches c gilt, und wie groß ist dann die tatsächliche Wahrscheinlichkeit für den Fehler erster Art?`,
      `Worked example: ${zn('bt_a_n')} trials, H0: proportion ${ze('bt_p0', 1)}, one-sided against larger proportions, level ${ze('bt_a_alpha', 2)}. H0 is rejected if the number of successes is at least c (table). Which c applies, and how large is then the actual probability of the type I error?`),
    antworten: [
      a(P(`c = 15: Sie beträgt ${zd('bt_a15', 4)} und liegt unter ${zd('bt_a_alpha', 2)}`, `c = 15: it is ${ze('bt_a15', 4)} and lies below ${ze('bt_a_alpha', 2)}`),
        P('Gewählt wird die kleinste Grenze c, für die P(X ≥ c) höchstens das Niveau beträgt. Bei einer diskreten Verteilung gibt es nur bestimmte Werte, darum liegt das tatsächliche Niveau höchstens beim gewählten und ist hier kleiner.',
          'The smallest limit c is chosen for which P(X ≥ c) is at most the level. A discrete distribution offers only certain values, so the actual level is at most the chosen one and here it is smaller.'), true),
      a(P(`c = 14: Die Wahrscheinlichkeit ${zd('bt_a14', 4)} liegt dem Niveau ${zd('bt_a_alpha', 2)} am nächsten`, `c = 14: the probability ${ze('bt_a14', 4)} lies closest to the level ${ze('bt_a_alpha', 2)}`),
        P(`Bei c = 14 würde H0 mit Wahrscheinlichkeit ${zd('bt_a14', 4)} fälschlich abgelehnt, mehr als das gewählte Niveau ${zd('bt_a_alpha', 2)}. Die Grenze muss das Niveau einhalten, nicht ihm am nächsten kommen.`,
          `With c = 14 H0 would be rejected wrongly with probability ${ze('bt_a14', 4)}, more than the chosen level ${ze('bt_a_alpha', 2)}. The limit must keep the level, not come closest to it.`)),
      a(P(`c = 15: Sie beträgt genau ${zd('bt_a_alpha', 2)}, denn das Niveau wurde so gewählt`, `c = 15: it is exactly ${ze('bt_a_alpha', 2)}, since the level was chosen that way`),
        P(`Das Niveau ist eine Obergrenze. Weil die Zahl der Erfolge nur ganze Werte annimmt, trifft keine Grenze genau ${zd('bt_a_alpha', 2)}; hier ergibt sich ${zd('bt_a15', 4)}.`,
          `The level is an upper limit. Because the number of successes takes whole values only, no limit hits exactly ${ze('bt_a_alpha', 2)}; here the result is ${ze('bt_a15', 4)}.`))
    ],
    hilfe: ['binomialtest', 'fehlerarten', 'signifikanzniveau'], belege: ['wissen:binomialtest-ablehnregel-diskret']
  },
  {
    id: 'bt-naeherung', thema: 'verteilung', probieren: 'anteilstest',
    tabelle: tab('bt-naeherung', [P('Umfang n', 'Size n'), P('Erfolge', 'Successes'), P('Anteil', 'Proportion'), P('p exakt (Binomialtest)', 'p exact (binomial test)'), P('p mit Normalnäherung', 'p with normal approximation')], QUELLE_RECHEN, P('Rechenbeispiel: zwei Wege zum zweiseitigen p-Wert gegen den Anteil 0,5', 'Worked example: two ways to the two-sided p value against the proportion 0.5')),
    stamm: P(`Zwei Beispiele prüfen einen Anteil gegen ${zd('bt_p0', 1)}, einmal exakt, einmal mit der Normalnäherung Z = (Anteil - ${zd('bt_p0', 1)}) / Wurzel(${zd('bt_p0', 1)} mal ${zd('bt_p0', 1)} geteilt durch n) (Tabelle). Was zeigt der Vergleich?`,
      `Two examples test a proportion against ${ze('bt_p0', 1)}, once exactly, once with the normal approximation Z = (proportion - ${ze('bt_p0', 1)}) / square root(${ze('bt_p0', 1)} times ${ze('bt_p0', 1)} divided by n) (table). What does the comparison show?`),
    antworten: [
      a(P(`Bei kleinem n weichen beide merklich ab (${zd('bt_h_ex1', 3)} gegen ${zd('bt_h_ap1', 3)}), bei großem n kaum`, `For small n they differ noticeably (${ze('bt_h_ex1', 3)} against ${ze('bt_h_ap1', 3)}), for large n hardly`),
        P('Die Näherung beruht darauf, dass die Binomialverteilung mit wachsendem Stichprobenumfang gegen die Normalverteilung konvergiert. Bei n = 12 ist der Abstand zur diskreten Verteilung noch groß.',
          'The approximation rests on the binomial distribution converging to the normal distribution as the sample size grows. At n = 12 the distance from the discrete distribution is still large.'), true),
      a(P('Die Näherung ist genauer, weil sie mit der stetigen Normalverteilung rechnet', 'The approximation is more accurate because it uses the continuous normal distribution'),
        P('Die Normalverteilung ersetzt hier eine diskrete Verteilung; bei kleinem n ist die Näherung ungenauer. Der exakte Test rechnet mit der Binomialverteilung selbst.',
          'The normal distribution replaces a discrete distribution here; for small n the approximation is less accurate. The exact test uses the binomial distribution itself.')),
      a(P('Beide Verfahren stimmen auch bei n = 12 überein, der exakte Test braucht nur mehr Rechenaufwand', 'Both procedures agree at n = 12 as well, the exact test merely needs more computation'),
        P(`Die Werte stimmen nur bei großem n überein (${zd('bt_h_ex2', 4)} gegen ${zd('bt_h_ap2', 4)}), bei n = 12 nicht.`,
          `The values agree only for large n (${ze('bt_h_ex2', 4)} against ${ze('bt_h_ap2', 4)}), not at n = 12.`))
    ],
    hilfe: ['binomialtest', 'normalverteilung'], belege: ['wissen:binomialtest-normalnaeherung', 'wissen:binomialtest-ablehnregel-diskret']
  },
  {
    id: 'bt-gleich', thema: 'verteilung', probieren: 'anteilstest',
    tabelle: tab('bt-gleich', [P('Umfang n', 'Size n'), P('Erfolge', 'Successes'), P('Anteil', 'Proportion'), P('p-Wert (zweiseitig)', 'p value (two-sided)')], QUELLE_MTCARS, P('Derselbe Anteil bei zwei Umfängen (zweite Zeile: Rechenbeispiel mit zehnfachem n)', 'The same proportion at two sizes (second row: worked example with ten times n)')),
    stamm: P(`Zweimal wird derselbe Anteil gegen ${zd('bt_p0', 1)} geprüft, einmal bei n = 32, einmal bei n = 320 (Tabelle). Wie kommt es zu den verschiedenen p-Werten?`,
      `The same proportion is tested twice against ${ze('bt_p0', 1)}, once for n = 32, once for n = 320 (table). How do the different p values come about?`),
    antworten: [
      a(P('Der Abstand ist gleich, aber bei größerem n streut der Anteil weniger und fällt stärker auf', 'The distance is the same, but with larger n the proportion varies less and stands out more'),
        P(`Der Anteil ist beide Male ${zd('bt_anteil')}, der Abstand zu ${zd('bt_p0', 1)} also ${zd('bt_i_abstand', 3)}. Mit größerem n sinkt die Unsicherheit des Anteils, darum wird p kleiner (${zd('bt_p', 3)} gegen ${zd('bt_i_p2', 4)}). Ein kleiner p-Wert sagt nichts über die Größe des Unterschieds.`,
          `The proportion is ${ze('bt_anteil')} both times, so the distance from ${ze('bt_p0', 1)} is ${ze('bt_i_abstand', 3)}. With larger n the uncertainty of the proportion falls, so p becomes smaller (${ze('bt_p', 3)} against ${ze('bt_i_p2', 4)}). A small p value says nothing about the size of the difference.`), true),
      a(P('Der Anteil weicht bei n = 320 zehnmal stärker vom Sollwert ab, deshalb ist das p kleiner', 'The proportion deviates ten times more from the target at n = 320, which is why p is smaller'),
        P('Der Abstand ist beide Male gleich groß. Geändert hat sich nur die Genauigkeit des Anteils.', 'The distance is equally large both times. Only the precision of the proportion has changed.')),
      a(P('Bei n = 320 ist die Nullhypothese wahr, bei n = 32 ist sie falsch, deshalb unterscheidet sich p', 'At n = 320 the null hypothesis is true, at n = 32 it is false, which is why p differs'),
        P('Ein p-Wert sagt nicht, welche Hypothese wahr ist; er ist keine Wahrscheinlichkeit für die Nullhypothese.', 'A p value does not say which hypothesis is true; it is not a probability of the null hypothesis.'))
    ],
    hilfe: ['binomialtest', 'p-wert', 'effektstaerke'], belege: ['wissen:wasserstein16-p-praezision-effekt', 'wissen:p-wert-definition']
  },
  {
    id: 'bt-wahl', thema: 'verteilung', probieren: 'anteilstest',
    tabelle: tab('bt-wahl', [P('Haarfarbe', 'Hair colour'), P('Anzahl', 'Count')], P('Daten: datasets::HairEyeColor (Snee 1974; Teil von R, Lizenz GPL), 592 Studierende. Berechnet mit R.', 'Data: datasets::HairEyeColor (Snee 1974; part of R, licence GPL), 592 students. Computed with R.'), P('Haarfarben von Studierenden', 'Hair colours of students')),
    stamm: P(`Für ${zn('sk_h_n')} Studierende zeigt die Tabelle die Zahl je Haarfarbe. Geprüft werden soll, ob die vier Farben gleich häufig vorkommen. Welches Verfahren passt?`,
      `For ${zn('sk_h_n')} students the table shows the count per hair colour. The question is whether the four colours occur equally often. Which procedure fits?`),
    antworten: [
      a(P(`Der eindimensionale Chi-Quadrat-Test, erwartet werden je Farbe ${zn('bt_w_fe')} Studierende`, `The one-dimensional chi-square test, ${zn('bt_w_fe')} students are expected per colour`),
        P('Der Test vergleicht beobachtete mit erwarteten Häufigkeiten. Unter der Gleichverteilungsannahme ist die erwartete Häufigkeit der Stichprobenumfang N geteilt durch die Zahl der Kategorien, hier 592 durch 4.',
          'The test compares observed with expected frequencies. Under the assumption of equal distribution the expected frequency is the sample size N divided by the number of categories, here 592 over 4.'), true),
      a(P('Der Binomialtest, denn es geht um den Anteil jeder Haarfarbe an allen Studierenden', 'The binomial test, since it is about the share of each hair colour among all students'),
        P('Die Binomialverteilung zählt Erfolge und Misserfolge, also zwei Ausgänge. Hier gibt es vier Kategorien.', 'The binomial distribution counts successes and failures, that is two outcomes. Here there are four categories.')),
      a(P('Der t-Test für den Mittelwert der Codes 1 bis 4, denn die Farben sind in Zahlen kodiert', 'The t test for the mean of the codes 1 to 4, since the colours are coded as numbers'),
        P('Haarfarben sind Kategorien (Nominalskala); ein Mittelwert der Codes hat keine Bedeutung.', 'Hair colours are categories (nominal scale); a mean of the codes has no meaning.'))
    ],
    hilfe: ['binomialtest', 'chi-quadrat', 'nominalskala'], belege: ['wissen:chiquadrat-eindimensional-erwartet', 'wissen:binomial-eigenschaften', 'wissen:skala-nominal-nur-unterscheiden']
  }
];
