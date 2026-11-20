/**
 * Üben: Wie fasse ich meine Zahlen zusammen, und wo steht ein Wert? (Skalenniveau, Lage- und Streuungsmaße, Histogramm und Boxplot, z-Wert).
 * Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R, Daten aus datasets:
 * HairEyeColor, infert, airquality, mtcars, trees, rivers, sleep, cars, chickwts, faithful, iris; Rechenbeispiele sind beschriftet).
 * Belege: wissen.json (Rasch 1 Kap. 1 und 2, Kohn Kap. 7 und 8, Altman und Bland 2005, Zuur u. a. 2010), nur an der Seite gelesene Aussagen.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, zd, ze, zn, za, zae } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

const QUELLE_HAAR = P(
  'Daten: datasets::HairEyeColor (Snee 1974; Teil von R, Lizenz GPL), 592 Studierende, Haarfarbe (Black = schwarz, Brown = braun, Red = rot, Blond = blond). Berechnet mit R.',
  'Data: datasets::HairEyeColor (Snee 1974; part of R, licence GPL), 592 students, hair colour. Computed with R.');
const QUELLE_INFERT = P(
  'Daten: datasets::infert (Trichopoulos u. a. 1976; Teil von R, Lizenz GPL), 248 Frauen, Spalte education (Schuljahre in drei Stufen). Berechnet mit R.',
  'Data: datasets::infert (Trichopoulos et al. 1976; part of R, licence GPL), 248 women, column education (years of schooling in three levels). Computed with R.');
const QUELLE_AIR = P(
  'Daten: datasets::airquality (Chambers u. a. 1983; Teil von R, Lizenz GPL), höchste Tagestemperatur in New York von Mai bis September 1973, 153 Tage. Berechnet mit R.',
  'Data: datasets::airquality (Chambers et al. 1983; part of R, licence GPL), daily maximum temperature in New York from May to September 1973, 153 days. Computed with R.');
const QUELLE_MTCARS = P(
  'Daten: datasets::mtcars (Henderson und Velleman 1981; Teil von R, Lizenz GPL), 32 Wagen aus der Zeitschrift Motor Trend 1974. Berechnet mit R.',
  'Data: datasets::mtcars (Henderson and Velleman 1981; part of R, licence GPL), 32 cars from Motor Trend 1974. Computed with R.');
const QUELLE_TREES = P(
  'Daten: datasets::trees (Meyer 1953, Ryan, Joiner und Ryan 1976; Teil von R, Lizenz GPL), 31 gefällte Schwarzkirschbäume, Höhe in Fuß. Berechnet mit R.',
  'Data: datasets::trees (Meyer 1953, Ryan, Joiner and Ryan 1976; part of R, licence GPL), 31 felled black cherry trees, height in feet. Computed with R.');
const QUELLE_RIVERS = P(
  'Daten: datasets::rivers (World Almanac 1975, US Geological Survey; Teil von R, Lizenz GPL), 141 große Flüsse Nordamerikas, Länge in Meilen. Berechnet mit R.',
  'Data: datasets::rivers (World Almanac 1975, US Geological Survey; part of R, licence GPL), 141 major North American rivers, length in miles. Computed with R.');
const QUELLE_SLEEP = P(
  'Daten: datasets::sleep (Cushny und Peebles 1905, von Student 1908 ausgewertet; Teil von R, Lizenz GPL), Zusatzschlaf in Stunden bei 10 Personen mit dem ersten Schlafmittel. Berechnet mit R.',
  'Data: datasets::sleep (Cushny and Peebles 1905, analysed by Student 1908; part of R, licence GPL), extra sleep in hours of 10 people with the first drug. Computed with R.');
const QUELLE_CARS = P(
  'Daten: datasets::cars (Ezekiel 1930; Teil von R, Lizenz GPL), 50 Fahrversuche aus den 1920er Jahren, Geschwindigkeit in Meilen pro Stunde. Berechnet mit R.',
  'Data: datasets::cars (Ezekiel 1930; part of R, licence GPL), 50 braking trials from the 1920s, speed in miles per hour. Computed with R.');
const QUELLE_CHICK = P(
  'Daten: datasets::chickwts (Snedecor 1948; Teil von R, Lizenz GPL), Gewicht junger Hühner nach sechs Wochen in Gramm, je 12 Tiere. Berechnet mit R.',
  'Data: datasets::chickwts (Snedecor 1948; part of R, licence GPL), weight of young chickens after six weeks in grams, 12 animals each. Computed with R.');
const QUELLE_GEYSIR = P(
  'Daten: datasets::faithful (Härdle; Azzalini und Bowman 1990; Teil von R, Lizenz GPL), Old-Faithful-Geysir im Yellowstone-Nationalpark, 272 Ausbrüche. Berechnet mit R.',
  'Data: datasets::faithful (Härdle; Azzalini and Bowman 1990; part of R, licence GPL), Old Faithful geyser in Yellowstone National Park, 272 eruptions. Computed with R.');

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'sk-bildung': {
    titel: P('Schulbildung von 248 Frauen in drei Stufen, mit den Codes 1 bis 3 gespeichert (Tabelle: Code, Stufe in Jahren, Anzahl)',
      'Schooling of 248 women in three levels, stored with the codes 1 to 3 (table: code, level in years, count)'),
    tabellen: [tab('sk-bildung.0', [P('Code', 'Code'), P('Stufe (Jahre)', 'Level (years)'), P('Anzahl', 'Count')], QUELLE_INFERT, P('Stufen der Schulbildung', 'Levels of schooling'))]
  },
  'lm-fluesse': {
    titel: P('Längen von 141 großen Flüssen (Meilen), einmal alle und einmal ohne den längsten Fluss', 'Lengths of 141 major rivers (miles), once all of them and once without the longest river'),
    tabellen: [tab('lm-fluesse.0', [P('Zahl der Flüsse', 'Number of rivers'), P('Mittelwert', 'Mean'), P('Median', 'Median'), P('Standardabweichung', 'Standard deviation'), P('Spannweite', 'Range'), P('Interquartilsabstand', 'Interquartile range')],
      QUELLE_RIVERS, P('Kennzahlen mit und ohne den längsten Fluss', 'Summary statistics with and without the longest river'))]
  },
  'vd-geysir': {
    titel: P('Wartezeit zwischen zwei Ausbrüchen eines Geysirs (272 Ausbrüche, Minuten): Häufigkeiten bei zwei Klassenbreiten und die fünf Kennzahlen eines Boxplots',
      'Waiting time between two eruptions of a geyser (272 eruptions, minutes): frequencies at two class widths and the five numbers of a boxplot'),
    tabellen: [
      tab('vd-geysir.0', [P('Klasse (Minuten)', 'Class (minutes)'), P('Anzahl', 'Count')], QUELLE_GEYSIR, P('Klassenbreite 10', 'Class width 10')),
      tab('vd-geysir.1', [P('Klasse (Minuten)', 'Class (minutes)'), P('Anzahl', 'Count')], QUELLE_GEYSIR, P('Klassenbreite 20', 'Class width 20')),
      tab('vd-geysir.2', [P('Minimum', 'Minimum'), P('1. Quartil', '1st quartile'), P('Median', 'Median'), P('3. Quartil', '3rd quartile'), P('Maximum', 'Maximum'), P('Zahl der Ausbrüche', 'Number of eruptions')],
        QUELLE_GEYSIR, P('Kennzahlen des Boxplots', 'Numbers of the boxplot'))
    ]
  },
  'vd-fluesse-klassen': {
    titel: P('Flusslängen in vier Klassen ungleicher Breite. Die Breite steht in Einheiten von 100 Meilen, die Höhe ist der Anteil geteilt durch die Breite',
      'River lengths in four classes of unequal width. The width is given in units of 100 miles, the height is the share divided by the width'),
    tabellen: [tab('vd-fluesse-klassen.0', [P('Klasse (Meilen)', 'Class (miles)'), P('Breite (100 Meilen)', 'Width (100 miles)'), P('Anzahl', 'Count'), P('Anteil', 'Share'), P('Höhe (Anteil geteilt durch Breite)', 'Height (share divided by width)')],
      QUELLE_RIVERS, P('Histogramm mit ungleich breiten Klassen', 'Histogram with classes of unequal width'))]
  },
  'vd-fluesse-box': {
    titel: P('Boxplot der Flusslängen (Meilen): die fünf Kennzahlen, der Interquartilsabstand und die obere Grenze der Whisker',
      'Boxplot of the river lengths (miles): the five numbers, the interquartile range and the upper limit of the whiskers'),
    tabellen: [
      tab('vd-fluesse-box.0', [P('Minimum', 'Minimum'), P('1. Quartil', '1st quartile'), P('Median', 'Median'), P('3. Quartil', '3rd quartile'), P('Maximum', 'Maximum'), P('Interquartilsabstand', 'Interquartile range')], QUELLE_RIVERS, P('Kennzahlen', 'Numbers')),
      tab('vd-fluesse-box.1', [P('Obere Grenze (3. Quartil plus das 1,5-Fache des Interquartilsabstands)', 'Upper limit (3rd quartile plus 1.5 times the interquartile range)'), P('Größter Wert unter der Grenze', 'Largest value below the limit'), P('Zahl der Werte darüber', 'Number of values above')], QUELLE_RIVERS, P('Whisker und Punkte', 'Whiskers and points'))
    ]
  },
  'zw-corolla': {
    titel: P('Ein Wagen (Toyota Corolla) im Vergleich zu allen 32 Wagen: Meilen pro Gallone (mpg) und Leistung in PS (hp)',
      'One car (Toyota Corolla) compared with all 32 cars: miles per gallon (mpg) and power in horsepower (hp)'),
    tabellen: [tab('zw-corolla.0', [P('Merkmal', 'Variable'), P('Mittelwert', 'Mean'), P('Standardabweichung', 'Standard deviation'), P('Wert des Wagens', 'Value of the car'), P('z-Wert', 'z value')], QUELLE_MTCARS, P('Wert und z-Wert', 'Value and z value'))]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Skalenniveau ----
  {
    id: 'sk-haarcode', thema: 'beschreiben', probieren: 'kennzahlen',
    tabelle: tab('sk-haarcode', [P('Code', 'Code'), P('Haarfarbe', 'Hair colour'), P('Anzahl', 'Count')], QUELLE_HAAR, P('Haarfarbe mit Zahlencodes', 'Hair colour with number codes')),
    stamm: P(`Die Haarfarbe von ${zn('sk_h_n')} Studierenden ist mit den Zahlen 1 bis 4 kodiert (Tabelle). Welche Kennzahl beschreibt diese Spalte sinnvoll?`,
      `The hair colour of ${zn('sk_h_n')} students is coded with the numbers 1 to 4 (table). Which summary statistic describes this column sensibly?`),
    antworten: [
      a(P(`Der Modus: Code 2 (braun) kommt mit ${zn('sk_h_modus')} Fällen am häufigsten vor`, `The mode: code 2 (brown) occurs most often, in ${zn('sk_h_modus')} cases`),
        P('Bei Kategorien unterscheiden die Zahlen nur gleich von verschieden. Der Modus braucht genau dieses Niveau und hängt nicht davon ab, welche Codes vergeben wurden.',
          'For categories the numbers only tell same from different. The mode needs exactly this level and does not depend on which codes were assigned.'), true),
      a(P(`Der Mittelwert der Codes, ${zd('sk_h_mean')}, denn die Spalte besteht aus Zahlen`, `The mean of the codes, ${ze('sk_h_mean')}, since the column consists of numbers`),
        P(`Der Zahlenwert ist hier nur ein Etikett. Würden die Codes anders vergeben (braun = 1, blond = 2, schwarz = 3, rot = 4), läge der Mittelwert bei ${zd('sk_h_mean2')}, obwohl sich an den Haaren nichts geändert hat.`,
          `The number is only a label here. If the codes were assigned differently (brown = 1, blond = 2, black = 3, red = 4), the mean would be ${ze('sk_h_mean2')}, although nothing about the hair has changed.`)),
      a(P('Der Median der Codes, denn der mittlere Code ist die 2', 'The median of the codes, since the middle code is 2'),
        P('Ein Median braucht mindestens eine Rangfolge der Kategorien, die Haarfarben haben keine. Bei der anderen Vergabe der Codes (braun = 1, blond = 2, schwarz = 3, rot = 4) wäre der mittlere Code 2 die Farbe blond statt braun.',
          'A median needs at least a rank order of the categories, and hair colours have none. With the other assignment of codes (brown = 1, blond = 2, black = 3, red = 4) the middle code 2 would be blond instead of brown.'))
    ],
    hilfe: ['nominalskala', 'skalenniveau', 'modus'], belege: ['wissen:skala-nominal-nur-unterscheiden', 'wissen:lagemass-skalenniveau']
  },
  {
    id: 'sk-bildung-reihenfolge', thema: 'beschreiben', fall: 'sk-bildung',
    stamm: P('Die Stufen der Schulbildung sind mit 1, 2 und 3 kodiert (Tabelle). Was lässt sich aus den Codes ablesen?', 'The levels of schooling are coded 1, 2 and 3 (table). What can be read from the codes?'),
    antworten: [
      a(P('Code 3 bedeutet mehr Schuljahre als Code 2; wie groß die Abstände sind, sagen die Codes nicht', 'Code 3 means more schooling than code 2; the size of the distances is not given by the codes'),
        P('Die Codes bilden eine Rangfolge (Ordinalskala): größer heißt mehr. Die Zahlen dürfen frei gewählt werden, solange die Reihenfolge bleibt; ihre Abstände sagen nichts über Abstände im Merkmal.',
          'The codes form a rank order (ordinal scale): larger means more. The numbers may be chosen freely as long as the order is kept; their distances say nothing about distances in the feature.'), true),
      a(P('Die Schulbildung nimmt von Stufe 1 zu 2 genauso zu wie von Stufe 2 zu 3, denn die Codes steigen um je 1', 'Schooling increases from level 1 to 2 as much as from level 2 to 3, since the codes rise by 1 each'),
        P('Gleiche Zahlenabstände bedeuten erst auf einer Intervallskala gleiche Unterschiede im Merkmal. Bei einer Ordinalskala müssen die Zahlen nicht aufeinander folgen.',
          'Equal distances between numbers mean equal differences in the feature only on an interval scale. On an ordinal scale the numbers need not be consecutive.')),
      a(P('Stufe 3 bedeutet dreimal so viel Schulbildung wie Stufe 1, denn 3 ist das Dreifache von 1', 'Level 3 means three times as much schooling as level 1, since 3 is three times 1'),
        P('Verhältnisse sind erst auf einer Verhältnisskala mit absolutem Nullpunkt zulässig. Eine Rangfolge erlaubt nur die Aussage größer oder kleiner.',
          'Ratios are admissible only on a ratio scale with an absolute zero. A rank order allows only the statement larger or smaller.'))
    ],
    hilfe: ['ordinalskala', 'skalenniveau'], belege: ['wissen:skala-ordinal-reihenfolge']
  },
  {
    id: 'sk-bildung-umcodieren', thema: 'beschreiben', fall: 'sk-bildung',
    stamm: P('Die Bildungsstufen (Tabelle) sollen für ein Diagramm neu kodiert werden. Welche Umcodierung erhält die Aussage der Ordinalskala?', 'The levels of schooling (table) are to be recoded for a chart. Which recoding keeps the statement of the ordinal scale?'),
    antworten: [
      a(P('Aus 1, 2, 3 wird 10, 20, 50: die Reihenfolge bleibt, die Abstände ändern sich', 'From 1, 2, 3 becomes 10, 20, 50: the order stays, the distances may change'),
        P('Bei einer Ordinalskala muss nur die Reihenfolge erhalten bleiben (monotone Umrechnung). Die Abstände der Zahlen tragen keine Aussage.',
          'On an ordinal scale only the order has to be preserved (monotone conversion). The distances between the numbers carry no meaning.'), true),
      a(P('Aus 1, 2, 3 wird 3, 1, 2: nur die Zahlen sind anders, die Stufen bleiben dieselben', 'From 1, 2, 3 becomes 3, 1, 2: only the numbers differ, the levels stay the same'),
        P('Die Rangfolge der Stufen muss nach der Umcodierung bestehen bleiben. Hier erhält die niedrigste Stufe plötzlich die größte Zahl.',
          'The rank order of the levels must remain after the recoding. Here the lowest level suddenly receives the largest number.')),
      a(P('Aus 1, 2, 3 wird 10, 20, 20: größere Stufen haben weiter größere oder gleiche Zahlen', 'From 1, 2, 3 becomes 10, 20, 20: higher levels still have larger or equal numbers'),
        P('Stufe 2 und Stufe 3 bekommen dieselbe Zahl und lassen sich danach nicht mehr unterscheiden. Auch eine Ordinalskala verlangt für verschiedene Stufen verschiedene Zahlen.',
          'Level 2 and level 3 receive the same number and can no longer be told apart. An ordinal scale also needs different numbers for different levels.'))
    ],
    hilfe: ['ordinalskala', 'skalenniveau'], belege: ['wissen:skala-ordinal-reihenfolge', 'wissen:skala-nominal-nur-unterscheiden']
  },
  {
    id: 'sk-temperatur', thema: 'beschreiben',
    tabelle: tab('sk-temperatur', [P('Tag', 'Day'), P('Grad Fahrenheit', 'Degrees Fahrenheit'), P('Grad Celsius', 'Degrees Celsius')], QUELLE_AIR, P('Kältester und wärmster Tag in beiden Einheiten', 'Coldest and warmest day in both units')),
    stamm: P(`Höchsttemperaturen in New York stehen in Grad Fahrenheit. Der wärmste Tag hatte ${zn('sk_t_max')}, der kälteste ${zn('sk_t_min')} Grad, das Verhältnis ist ${zd('sk_t_rf')}. Darf man sagen, der wärmste Tag sei ${zd('sk_t_rf')}-mal so warm gewesen?`,
      `Maximum temperatures in New York are given in degrees Fahrenheit. The warmest day had ${zn('sk_t_max')}, the coldest ${zn('sk_t_min')} degrees, the ratio is ${ze('sk_t_rf')}. May one say the warmest day was ${ze('sk_t_rf')} times as warm?`),
    antworten: [
      a(P(`Nein: ohne absoluten Nullpunkt hängt das Verhältnis von der Einheit ab (Celsius: ${zd('sk_t_rc')})`, `No: without an absolute zero the ratio depends on the unit (${ze('sk_t_rc')} in Celsius)`),
        P(`In Celsius waren es ${zd('sk_t_cmax', 1)} und ${zd('sk_t_cmin', 1)} Grad, das Verhältnis ${zd('sk_t_rc')}. Null Grad ist bei Celsius wie bei Fahrenheit ein Punkt der Skala, nicht das Fehlen von Temperatur.`,
          `In Celsius the values were ${ze('sk_t_cmax', 1)} and ${ze('sk_t_cmin', 1)} degrees, the ratio ${ze('sk_t_rc')}. Zero degrees is a point on the scale in Celsius as in Fahrenheit, not the absence of temperature.`), true),
      a(P('Ja, denn Temperaturen sind Zahlen, und Zahlen lassen sich durch Division miteinander vergleichen', 'Yes, since temperatures are numbers and numbers can be compared by dividing them'),
        P('Welche Rechnung sinnvoll ist, bestimmt das Skalenniveau, nicht die Zahlenform. Hier ändert die Einheit das Ergebnis der Division, sie sagt also nichts über das Merkmal.',
          'The scale level decides which calculation makes sense, not the form of the numbers. Here the unit changes the result of the division, so it says nothing about the feature.')),
      a(P('Ja, denn Fahrenheit hat gleich große Abstände, und damit sind auch Verhältnisse zulässig', 'Yes, since Fahrenheit has equal distances, so ratios are admissible as well'),
        P('Gleiche Abstände genügen für Differenzen (Intervallskala). Für Verhältnisse braucht es einen absoluten Nullpunkt (Verhältnisskala).',
          'Equal distances suffice for differences (interval scale). Ratios need an absolute zero (ratio scale).'))
    ],
    hilfe: ['intervallskala', 'verhaeltnisskala', 'skalenniveau'], belege: ['wissen:skala-intervall-verhaeltnis-nullpunkt']
  },
  {
    id: 'sk-gewicht', thema: 'beschreiben',
    tabelle: tab('sk-gewicht', [P('Auto', 'Car'), P('1000 Pfund', '1000 pounds'), P('Kilogramm', 'Kilograms')], QUELLE_MTCARS, P('Leichtestes und schwerstes Auto in beiden Einheiten', 'Lightest and heaviest car in both units')),
    stamm: P(`Das Leergewicht von Autos steht in der Tabelle in 1000 Pfund und in Kilogramm. Das schwerste Auto ist ${zd('sk_g_ratio')}-mal so schwer wie das leichteste, gerechnet in 1000 Pfund. Gilt dieses Verhältnis auch in Kilogramm?`,
      `The weight of cars is given in the table in 1000 pounds and in kilograms. The heaviest car is ${ze('sk_g_ratio')} times as heavy as the lightest, calculated in 1000 pounds. Does this ratio hold in kilograms too?`),
    antworten: [
      a(P(`Ja, auch in Kilogramm ${zd('sk_g_ratio')}, denn Gewicht hat einen absoluten Nullpunkt`, `Yes, it is ${ze('sk_g_ratio')} in kilograms too, since weight has an absolute zero`),
        P('Gewicht ist verhältnisskaliert. Die Umrechnung y = a mal x multipliziert beide Werte mit demselben Faktor, der sich beim Teilen herauskürzt. Die Tabelle zeigt es in der letzten Zeile.',
          'Weight is on a ratio scale. The conversion y = a times x multiplies both values by the same factor, which cancels when dividing. The last row of the table shows it.'), true),
      a(P('Nein, mit einem anderen Maß ergibt sich ein anderes Verhältnis, wie bei der Temperatur', 'No, with another unit the ratio changes as well, just as it does for temperature'),
        P('Bei der Temperatur fehlt der absolute Nullpunkt, darum ändert die Einheit das Verhältnis. Beim Gewicht gibt es ihn: 0 heißt kein Gewicht.',
          'Temperature lacks an absolute zero, which is why the unit changes the ratio. Weight has one: 0 means no weight.')),
      a(P('Das hängt von der Einheit ab, denn die Zahlen in Kilogramm sind viel größer als in Pfund', 'That depends on the unit, since the numbers in kilograms are much larger than in pounds'),
        P('Größere Zahlen verändern das Verhältnis nicht: Beide Werte werden mit demselben Faktor multipliziert, das Verhältnis bleibt.',
          'Larger numbers do not change the ratio: both values are multiplied by the same factor, so the ratio stays.'))
    ],
    hilfe: ['verhaeltnisskala', 'intervallskala'], belege: ['wissen:skala-intervall-verhaeltnis-nullpunkt']
  },
  {
    id: 'sk-groesse', thema: 'beschreiben',
    tabelle: tab('sk-groesse', [P('Code', 'Code'), P('Höhe (Fuß)', 'Height (feet)'), P('Anzahl', 'Count')], QUELLE_TREES, P('Höhe in drei Gruppen', 'Height in three groups')),
    stamm: P(`Die Höhe von ${zn('sk_w_n')} gefällten Bäumen wurde in Fuß gemessen und danach in drei Gruppen (niedrig, mittel, hoch) mit den Codes 1 bis 3 eingeteilt (Tabelle). Welche Aussage gilt für die Spalte der Gruppencodes?`,
      `The height of ${zn('sk_w_n')} felled trees was measured in feet and then divided into three groups (low, medium, high) with the codes 1 to 3 (table). Which statement holds for the column of group codes?`),
    antworten: [
      a(P('Die Reihenfolge der Gruppen bleibt, die Größe der Unterschiede geht verloren', 'The order of the groups remains, the size of the differences was lost by grouping'),
        P('Die Gruppen lassen sich von niedrig bis hoch ordnen, aber der Abstand zweier Codes sagt nichts mehr über Fuß. Das Messinstrument liefert ein niedrigeres Niveau, als das Merkmal erlaubt hätte.',
          'The groups can be ordered from low to high, but the distance between two codes says nothing about feet any more. The instrument yields a lower level than the feature would have allowed.'), true),
      a(P('Es bleibt das Verhältnisniveau, denn die Höhe eines Baumes hat einen echten Nullpunkt', 'The ratio level remains, since the height of a tree has a true zero'),
        P('Das Niveau hängt vom Merkmal und vom Messinstrument ab. Die Höhe ist verhältnisskaliert, die Einteilung in drei Gruppen bildet aber nur die Rangfolge ab.',
          'The level depends on the feature and on the instrument. Height is on a ratio scale, but the division into three groups reproduces only the rank order.')),
      a(P('Es bleiben Namen, denn drei Gruppen mit Zahlencodes sind Kategorien ohne Rangfolge', 'Only names remain, since three groups with number codes are categories without an order'),
        P('Niedrig, mittel und hoch behalten eine Größer-Kleiner-Beziehung. Erst wenn auch sie verloren geht, bleibt eine Nominalskala.',
          'Low, medium and high keep a larger-smaller relation. Only when that is lost too does a nominal scale remain.'))
    ],
    hilfe: ['skalenniveau', 'ordinalskala', 'metrisch'], belege: ['wissen:skala-niveau-merkmal-und-instrument', 'wissen:skala-ordinal-reihenfolge']
  },
  // ---- Lage- und Streuungsmaße ----
  {
    id: 'lm-schief', thema: 'beschreiben', probieren: 'kennzahlen', karte: 'verteilung',
    tabelle: tab('lm-schief', [P('Zahl der Flüsse', 'Number of rivers'), P('Mittelwert (Meilen)', 'Mean (miles)'), P('Median (Meilen)', 'Median (miles)'), P('Längster Fluss (Meilen)', 'Longest river (miles)')], QUELLE_RIVERS, P('Lage der Flusslängen', 'Location of the river lengths')),
    stamm: P('Die Längen von 141 großen Flüssen haben einen Mittelwert weit über dem Median (Tabelle). Was erklärt den Unterschied?', 'The lengths of 141 major rivers have a mean far above the median (table). What explains the difference?'),
    antworten: [
      a(P('Wenige sehr lange Flüsse ziehen den Mittelwert nach oben, der Median hängt von ihrer Länge kaum ab', 'A few very long rivers pull the mean upwards, the median hardly depends on their length'),
        P(`Der Mittelwert nimmt alle Werte auf, auch den längsten Fluss mit ${zn('vd_b_max')} Meilen. Der Median ist gegenüber Extremwerten unempfindlich, er hängt nur von der Mitte der Rangreihe ab.`,
          `The mean takes in all values, including the longest river with ${zn('vd_b_max')} miles. The median is insensitive to extreme values, it depends only on the middle of the rank order.`), true),
      a(P('Der Mittelwert wurde falsch berechnet, bei richtiger Rechnung wäre er gleich dem Median', 'The mean was calculated wrongly, calculated correctly it would equal the median'),
        P('Mittelwert und Median müssen nicht gleich sein. Sie fallen zum Beispiel bei der Normalverteilung zusammen, bei vielen kurzen und wenigen sehr langen Flüssen nicht.',
          'Mean and median need not be equal. They coincide for the normal distribution, for example, but not with many short and a few very long rivers.')),
      a(P('Bei Längen ist nur der Mittelwert zulässig, weil der Median zu einem niedrigeren Skalenniveau gehört', 'For lengths only the mean is admissible, because the median belongs to a lower scale level'),
        P('Auf Verhältnisniveau sind Modus, Median und Mittelwert zulässig. Der Median verlangt weniger (mindestens Ordinalniveau), er ist bei Längen also ebenso möglich.',
          'On a ratio level mode, median and mean are all admissible. The median demands less (at least ordinal level), so it is possible for lengths as well.'))
    ],
    hilfe: ['median', 'mittelwert', 'lagemass'], belege: ['wissen:median-mittelwert-extremwerte', 'wissen:lagemass-skalenniveau']
  },
  {
    id: 'lm-fluesse-mittel', thema: 'beschreiben', fall: 'lm-fluesse', probieren: 'kennzahlen',
    stamm: P('Der längste Fluss wird aus der Liste entfernt (Tabelle). Was zeigt der Vergleich von Mittelwert und Median?', 'The longest river is removed from the list (table). What does the comparison of mean and median show?'),
    antworten: [
      a(P(`Der Mittelwert sinkt um rund 22, der Median um ${zd('lm_dmed', 1)}: nur der Mittelwert folgt dem Extremwert`, `The mean falls by about 22, the median by ${ze('lm_dmed', 1)}: only the mean follows the extreme value`),
        P('Der Median ist gegenüber Extremwerten unempfindlich, der Mittelwert wird aus allen Werten berechnet und verliert mit dem Wert dessen ganze Größe.',
          'The median is insensitive to extreme values, the mean is computed from all values and loses the whole size of the value with it.'), true),
      a(P('Beide Kennzahlen ändern sich ähnlich stark, denn beide beschreiben die Mitte der Werte', 'Both statistics change by a similar amount, since both describe the centre of the values'),
        P(`Das Ergebnis ist ein anderes: rund 22 gegen ${zd('lm_dmed', 1)}. Der Mittelwert verwendet den Wert selbst, der Median nur dessen Rang.`,
          `The result is different: about 22 against ${ze('lm_dmed', 1)}. The mean uses the value itself, the median only its rank.`)),
      a(P('Der Median ändert sich stärker, weil beim Entfernen die Rangfolge der Werte neu geordnet wird', 'The median changes more, because removing a value reorders the ranking of the values'),
        P('Der Median hängt vom Rang ab: Das Entfernen des größten Wertes verschiebt ihn nur um eine halbe Rangstelle. Der Mittelwert verliert dagegen die ganze Größe des Wertes.',
          'The median depends on rank: removing the largest value shifts it by only half a rank position. The mean, in contrast, loses the whole size of the value.'))
    ],
    hilfe: ['median', 'mittelwert'], belege: ['wissen:median-mittelwert-extremwerte']
  },
  {
    id: 'lm-fluesse-streuung', thema: 'beschreiben', fall: 'lm-fluesse', probieren: 'kennzahlen',
    stamm: P('Wie verhalten sich die drei Streuungsmaße der Tabelle, wenn der längste Fluss entfällt?', 'How do the three measures of spread in the table behave when the longest river is dropped?'),
    antworten: [
      a(P('Spannweite und Standardabweichung sinken deutlich, der Interquartilsabstand (mittlere 50 Prozent) kaum', 'Range and standard deviation fall clearly, the interquartile range (middle 50 percent) hardly'),
        P(`Die Spannweite ist die Differenz aus größtem und kleinstem Wert (${zn('lm_range1')} gegen ${zn('lm_range2')}), die Standardabweichung verwendet alle Werte einzeln (${zd('lm_sd1')} gegen ${zd('lm_sd2')}). Der Interquartilsabstand ist die Boxlänge vom 1. zum 3. Quartil (${zn('lm_iqr1')} gegen ${zd('lm_iqr2')}).`,
          `The range is the difference between the largest and the smallest value (${zn('lm_range1')} against ${zn('lm_range2')}), the standard deviation uses every value individually (${ze('lm_sd1')} against ${ze('lm_sd2')}). The interquartile range is the box length from the 1st to the 3rd quartile (${zn('lm_iqr1')} against ${ze('lm_iqr2')}).`), true),
      a(P('Alle drei Maße sinken ähnlich stark, denn sie messen alle auf dieselbe Weise die Streuung der Werte', 'All three measures fall by a similar amount, since they all measure spread in the same way'),
        P(`Die Maße fassen die Streuung verschieden zusammen: Die Spannweite enthält den entfernten Wert direkt, der Interquartilsabstand ändert sich kaum (${zn('lm_iqr1')} gegen ${zd('lm_iqr2')}).`,
          `The measures summarise spread differently: the range contains the removed value directly, the interquartile range hardly changes (${zn('lm_iqr1')} against ${ze('lm_iqr2')}).`)),
      a(P('Nur die Standardabweichung ändert sich, Spannweite und Interquartilsabstand hängen nicht von Einzelwerten ab', 'Only the standard deviation changes, range and interquartile range do not depend on single values'),
        P(`Die Spannweite ist größter minus kleinster Wert und enthält den entfernten Wert direkt: ${zn('lm_range1')} gegen ${zn('lm_range2')}.`,
          `The range is largest minus smallest value and contains the removed value directly: ${zn('lm_range1')} against ${zn('lm_range2')}.`))
    ],
    hilfe: ['iqr', 'spannweite', 'streuung'], belege: ['wissen:streuung-spannweite-varianz-sd', 'wissen:boxplot-aufbau']
  },
  {
    id: 'lm-nenner', thema: 'beschreiben', probieren: 'kennzahlen',
    tabelle: tab('lm-nenner', [P('Person', 'Person'), P('Zusatzschlaf (Stunden)', 'Extra sleep (hours)')], QUELLE_SLEEP, P('Zusatzschlaf von zehn Personen', 'Extra sleep of ten people')),
    stamm: P(`Ein Programm gibt für die Varianz des Zusatzschlafs von ${zn('lm_s_n')} Personen (Tabelle) ${zd('lm_s_var1')} aus. Von Hand mit dem Nenner n ergibt sich ${zd('lm_s_var0')}. Woher kommt der Unterschied?`,
      `A program gives ${ze('lm_s_var1')} as the variance of the extra sleep of ${zn('lm_s_n')} people (table). By hand with the denominator n the result is ${ze('lm_s_var0')}. Where does the difference come from?`),
    antworten: [
      a(P('Das Programm teilt durch n minus 1, was die Varianz der Grundgesamtheit im Mittel richtig schätzt', 'The program divides by n minus 1, which estimates the population variance without bias'),
        P('Mit dem Nenner n-1 ist die Stichprobenvarianz ein erwartungstreuer Schätzer der Populationsvarianz, mit dem Nenner n unterschätzt sie diese im Mittel. Beide Rechnungen verwenden dieselbe Quadratsumme.',
          'With the denominator n-1 the sample variance is an unbiased estimator of the population variance, with the denominator n it underestimates it on average. Both calculations use the same sum of squares.'), true),
      a(P('Das Programm rundet auf, damit die Varianz bei kleinen Stichproben sicherheitshalber größer ausfällt', 'The program rounds up, so that the variance is on the safe side larger in small samples'),
        P(`Gerundet wird hier nicht. Der Unterschied folgt aus dem Nenner und lässt sich nachrechnen: ${zd('lm_s_var0')} mal 10 geteilt durch 9 ergibt ${zd('lm_s_var1')}.`,
          `Nothing is rounded up here. The difference follows from the denominator and can be checked: ${ze('lm_s_var0')} times 10 divided by 9 gives ${ze('lm_s_var1')}.`)),
      a(P('Das Programm hat die Formel für Grundgesamtheiten gewählt; für Stichproben gilt der Nenner n', 'The program chose the formula for populations; for samples the denominator n applies'),
        P('Es ist umgekehrt: Der Schätzer der Populationsvarianz aus einer Stichprobe verwendet n-1. Der Nenner n gehört zur reinen Stichprobenvarianz, die die Populationsvarianz unterschätzt.',
          'It is the other way round: the estimator of the population variance from a sample uses n-1. The denominator n belongs to the plain sample variance, which underestimates the population variance.'))
    ],
    hilfe: ['varianz', 'streuung'], belege: ['wissen:varianz-erwartungstreu-sd-nicht', 'wissen:varianz-schaetzer-nenner-programme']
  },
  {
    id: 'lm-einheit', thema: 'beschreiben', probieren: 'kennzahlen',
    tabelle: tab('lm-einheit', [P('Zahl der Versuche', 'Number of trials'), P('Mittelwert', 'Mean'), P('Varianz', 'Variance'), P('Standardabweichung', 'Standard deviation')], QUELLE_CARS, P('Geschwindigkeit vor dem Bremsen (Meilen pro Stunde)', 'Speed before braking (miles per hour)')),
    stamm: P(`Für die Geschwindigkeit vor dem Bremsen (Meilen pro Stunde) gibt ein Programm die Varianz ${zd('lm_c_var')} und die Standardabweichung ${zd('lm_c_sd')} aus (Tabelle). Welche der beiden Zahlen lässt sich direkt in der Einheit der Messung deuten?`,
      `For the speed before braking (miles per hour) a program gives the variance ${ze('lm_c_var')} and the standard deviation ${ze('lm_c_sd')} (table). Which of the two numbers can be interpreted directly in the unit of the measurement?`),
    antworten: [
      a(P(`Die Standardabweichung ${zd('lm_c_sd')}: Sie ist die Wurzel der Varianz, in der Einheit der Messwerte`, `The standard deviation ${ze('lm_c_sd')}: the square root of the variance, in the unit of the measurements`),
        P('Die Abweichungen werden quadriert, die Varianz hat deshalb die Einheit zum Quadrat (Meilen pro Stunde zum Quadrat). Die Wurzel führt zurück zur Einheit der Messwerte.',
          'The deviations are squared, so the variance has the squared unit (miles per hour squared). The square root leads back to the unit of the measurements.'), true),
      a(P(`Die Varianz ${zd('lm_c_var')}: Sie fasst die Abweichungen zusammen und bleibt dabei in der Einheit der Messung`, `The variance ${ze('lm_c_var')}: it sums up the deviations and thereby stays in the unit of the measurement`),
        P('Durch das Quadrieren der Abweichungen steht die Varianz in der quadrierten Einheit. Das macht sie schwer deutbar.',
          'By squaring the deviations the variance is in the squared unit. That makes it hard to interpret.')),
      a(P('Beide, denn das Ziehen der Wurzel ändert nur die Zahl der Messung, aber nicht ihre Einheit', 'Both, since taking the square root changes only the number of the measurement, not its unit'),
        P('Die Wurzel macht die quadrierte Einheit rückgängig. Darum lässt sich die Standardabweichung deuten, die Varianz nicht.',
          'The square root undoes the squared unit. That is why the standard deviation can be interpreted and the variance cannot.'))
    ],
    hilfe: ['varianz', 'streuung', 'standardabweichung'], belege: ['wissen:streuung-spannweite-varianz-sd']
  },
  {
    id: 'lm-fahrenheit', thema: 'beschreiben', probieren: 'kennzahlen',
    tabelle: tab('lm-fahrenheit', [P('Zahl der Tage', 'Number of days'), P('Mittelwert (Grad Fahrenheit)', 'Mean (degrees Fahrenheit)'), P('Standardabweichung (Grad Fahrenheit)', 'Standard deviation (degrees Fahrenheit)')], QUELLE_AIR, P('Temperaturen in Grad Fahrenheit', 'Temperatures in degrees Fahrenheit')),
    stamm: P(`Die Temperaturen der Tabelle werden mit y = (x - ${zn('lm_f_b')}) / ${zd('lm_f_a', 1)} von Grad Fahrenheit in Grad Celsius umgerechnet. Welche Kennzahlen hat die Celsius-Reihe?`,
      `The temperatures in the table are converted from degrees Fahrenheit to degrees Celsius with y = (x - ${zn('lm_f_b')}) / ${ze('lm_f_a', 1)}. Which statistics does the Celsius series have?`),
    antworten: [
      a(P(`Mittelwert ${zd('lm_c_mean')}, Standardabweichung ${zd('lm_c_sd2')}: Die Verschiebung betrifft nur den Mittelwert`, `Mean ${ze('lm_c_mean')} and standard deviation ${ze('lm_c_sd2')}: the shift affects only the mean`),
        P(`Die Umrechnung ist y = a mal x plus b mit a = 1 / ${zd('lm_f_a', 1)} und b = -${zn('lm_f_b')} / ${zd('lm_f_a', 1)}. Der neue Mittelwert ist a mal alter Mittelwert plus b, die neue Standardabweichung nur a mal alte Standardabweichung, also durch ${zd('lm_f_a', 1)} geteilt. Hier: (${zd('lm_f_mean')} - ${zn('lm_f_b')}) / ${zd('lm_f_a', 1)} = ${zd('lm_c_mean')} und ${zd('lm_f_sd')} / ${zd('lm_f_a', 1)} = ${zd('lm_c_sd2')}.`,
          `The conversion is y = a times x plus b with a = 1 / ${ze('lm_f_a', 1)} and b = -${zn('lm_f_b')} / ${ze('lm_f_a', 1)}. The new mean is a times old mean plus b, the new standard deviation only a times old standard deviation, that is divided by ${ze('lm_f_a', 1)}. Here: (${ze('lm_f_mean')} - ${zn('lm_f_b')}) / ${ze('lm_f_a', 1)} = ${ze('lm_c_mean')} and ${ze('lm_f_sd')} / ${ze('lm_f_a', 1)} = ${ze('lm_c_sd2')}.`), true),
      a(P(`Mittelwert ${zd('lm_c_mean')} und Standardabweichung (${zd('lm_f_sd')} - ${zn('lm_f_b')}) / ${zd('lm_f_a', 1)}: Die Formel gilt für beide`, `Mean ${ze('lm_c_mean')} and standard deviation (${ze('lm_f_sd')} - ${zn('lm_f_b')}) / ${ze('lm_f_a', 1)}: the formula holds for both`),
        P(`Die Standardabweichung misst Abstände zwischen Werten, eine Verschiebung hebt sich dabei heraus. Dieselbe Formel auf sie angewandt ergäbe ${zd('lm_f_neg')}, eine negative Streuung, die es nicht gibt.`,
          `The standard deviation measures distances between values, a shift cancels out. The same formula applied to it would give ${ze('lm_f_neg')}, a negative spread, which does not exist.`)),
      a(P(`Mittelwert ${zd('lm_c_mean')} und Standardabweichung ${zd('lm_f_sd')}: Die Streuung hängt nicht von der Einheit ab`, `Mean ${ze('lm_c_mean')} and standard deviation ${ze('lm_f_sd')}: the spread does not depend on the unit`),
        P(`Die Streuung wird mit demselben Faktor umgerechnet wie die Werte: ${zd('lm_f_sd')} geteilt durch ${zd('lm_f_a', 1)} ergibt ${zd('lm_c_sd2')}. Nur die Verschiebung um ${zn('lm_f_b')} bleibt ohne Wirkung auf sie.`,
          `The spread is converted by the same factor as the values: ${ze('lm_f_sd')} divided by ${ze('lm_f_a', 1)} gives ${ze('lm_c_sd2')}. Only the shift by ${zn('lm_f_b')} has no effect on it.`))
    ],
    hilfe: ['standardabweichung', 'streuung', 'metrisch'], belege: ['wissen:lineare-transformation-kennwerte']
  },
  {
    id: 'lm-futter', thema: 'beschreiben', probieren: 'kennzahlen',
    tabelle: tab('lm-futter', [P('Futter', 'Feed'), P('Zahl der Tiere', 'Number of animals'), P('Spannweite (g)', 'Range (g)'), P('Standardabweichung (g)', 'Standard deviation (g)'), P('Mittelwert (g)', 'Mean (g)')], QUELLE_CHICK, P('Zwei von sechs Futtergruppen', 'Two of six feed groups')),
    stamm: P('Zwei Futtergruppen für junge Hühner (Gewicht in Gramm, Tabelle): Sunflower hat die größere Spannweite, Casein die größere Standardabweichung. Wie kommt das?', 'Two feed groups for young chickens (weight in grams, table): sunflower has the larger range, casein the larger standard deviation. How does that come about?'),
    antworten: [
      a(P('Die Spannweite nutzt nur die zwei Extremwerte, die Standardabweichung alle Werte; Casein streut stärker', 'The range uses only the two extremes, the standard deviation all values; casein spreads more'),
        P('Die Spannweite ist die Differenz aus größtem und kleinstem Wert. Die Varianz und mit ihr die Standardabweichung berücksichtigen alle Messwerte einzeln; zwei Gruppen können darum in beiden Maßen verschieden geordnet sein.',
          'The range is the difference between the largest and the smallest value. The variance and with it the standard deviation take every measurement into account; two groups can therefore be ordered differently by the two measures.'), true),
      a(P('Eine der beiden Zahlen ist falsch, denn eine größere Spannweite bedeutet auch eine größere Standardabweichung', 'One of the two numbers is wrong, since a larger range also means a larger standard deviation'),
        P('Spannweite und Standardabweichung messen Verschiedenes. Eine größere Spannweite muss keine größere Standardabweichung bedeuten, wie die Tabelle zeigt.',
          'Range and standard deviation measure different things. A larger range need not mean a larger standard deviation, as the table shows.')),
      a(P(`Die Mittelwerte sind fast gleich (${zd('lm_ca_mean')} und ${zd('lm_su_mean')}), also muss auch die Streuung beider Gruppen gleich sein`, `The means are almost equal (${ze('lm_ca_mean')} and ${ze('lm_su_mean')}), so the spread of both groups must be equal too`),
        P(`Ein gleicher Mittelwert sagt nichts über die Streuung: Verteilungen mit demselben Mittelwert können verschieden streuen. Hier sind die Standardabweichungen ${zd('lm_ca_sd')} und ${zd('lm_su_sd')}.`,
          `An equal mean says nothing about the spread: distributions with the same mean can spread differently. Here the standard deviations are ${ze('lm_ca_sd')} and ${ze('lm_su_sd')}.`))
    ],
    hilfe: ['spannweite', 'streuung', 'varianz'], belege: ['wissen:streuung-spannweite-varianz-sd']
  },
  {
    id: 'lm-ausbruch', thema: 'beschreiben', karte: 'verteilung', probieren: 'kennzahlen',
    tabelle: tab('lm-ausbruch', [P('Klasse (Minuten)', 'Class (minutes)'), P('Anzahl', 'Count')], QUELLE_GEYSIR, P('Dauer der Ausbrüche in Klassen zu einer halben Minute', 'Duration of the eruptions in classes of half a minute')),
    stamm: P(`Die Dauer von ${zn('lm_e_n')} Ausbrüchen eines Geysirs (Minuten) hat den Mittelwert ${zd('lm_e_mean')}. Die Tabelle zählt die Ausbrüche je halber Minute. Was sagt der Mittelwert über diese Verteilung?`,
      `The duration of ${zn('lm_e_n')} eruptions of a geyser (minutes) has the mean ${ze('lm_e_mean')}. The table counts the eruptions per half minute. What does the mean say about this distribution?`),
    antworten: [
      a(P('Er liegt zwischen zwei Häufungen, wo kaum Ausbrüche liegen; man braucht die Verteilung', 'It lies between two clusters, where hardly any eruptions are; look at the distribution'),
        P(`Nur ${zn('lm_e_klasse')} der ${zn('lm_e_n')} Ausbrüche liegen in der Klasse, in der der Mittelwert liegt; die meisten liegen darunter oder darüber. Maße der zentralen Tendenz reichen allein nicht aus, um eine Verteilung zu beschreiben.`,
          `Only ${zn('lm_e_klasse')} of the ${zn('lm_e_n')} eruptions lie in the class that contains the mean; most lie below or above. Measures of central tendency alone do not suffice to describe a distribution.`), true),
      a(P(`Er ist der häufigste Wert, denn die meisten Ausbrüche dauern ungefähr ${zd('lm_e_mean')} Minuten`, `It is the most frequent value, since most of the eruptions last roughly ${ze('lm_e_mean')} minutes`),
        P('Der häufigste Wert heißt Modus. Die Verteilung hat zwei Gipfel (bei etwa 2 und 4 Minuten), der Mittelwert liegt dazwischen.',
          'The most frequent value is called the mode. The distribution has two peaks (at about 2 and 4 minutes), the mean lies in between.')),
      a(P(`Er teilt die Ausbrüche in zwei gleich große Hälften, kürzere und längere als ${zd('lm_e_mean')} Minuten`, `It splits the eruptions into two equal halves, the shorter and the longer than ${ze('lm_e_mean')} minutes`),
        P(`Die Werte in zwei gleich große Hälften teilt der Median, hier ${zd('lm_e_med', 1)} Minuten. Der Mittelwert ${zd('lm_e_mean')} liegt davon entfernt.`,
          `The median splits the values into two equal halves, here ${ze('lm_e_med', 1)} minutes. The mean ${ze('lm_e_mean')} lies away from it.`))
    ],
    hilfe: ['mittelwert', 'modus', 'median'], belege: ['wissen:mittelwert-reicht-allein-nicht', 'wissen:lagemass-skalenniveau']
  },
  // ---- Histogramm und Boxplot ----
  {
    id: 'vd-klassen', thema: 'beschreiben', fall: 'vd-geysir', karte: 'verteilung',
    stamm: P('Dieselben Wartezeiten sind in Klassen der Breite 10 und der Breite 20 gezählt (erste und zweite Tabelle). Was folgt für das Histogramm?', 'The same waiting times are counted in classes of width 10 and of width 20 (first and second table). What follows for the histogram?'),
    antworten: [
      a(P('Die Klassenwahl formt das Bild: Der Einbruch bei 60 bis 70 zeigt sich nur bei engeren Klassen', 'Class choice shapes the picture: the dip at 60 to 70 shows only with narrower classes'),
        P(`Es sind dieselben ${zn('vd_g_n')} Messungen. Bei Breite 10 liegen nur ${zn('vd_g_dip')} Wartezeiten in der Klasse von 60 bis 70, die Nachbarklassen haben ${zn('vd_g_l')} und ${zn('vd_g_r')}; bei Breite 20 verschwindet die Lücke in einem Gipfel.`,
          `These are the same ${zn('vd_g_n')} measurements. With width 10 only ${zn('vd_g_dip')} waiting times lie in the class from 60 to 70, the neighbouring classes have ${zn('vd_g_l')} and ${zn('vd_g_r')}; with width 20 the gap disappears in one peak.`), true),
      a(P('Die Daten haben sich geändert, denn bei breiteren Klassen gehen einzelne Messwerte verloren', 'The data have changed, since wider classes cause some of the measurements to get lost'),
        P('Die Zahl der Messungen bleibt gleich (272); sie werden nur anders zu Klassen zusammengefasst. Verloren geht Einzelheit, nicht der Messwert.',
          'The number of measurements stays the same (272); they are merely grouped into classes differently. Detail is lost, not measurements.')),
      a(P('Breitere Klassen sind genauer, weil in jeder Klasse mehr Messwerte zusammenkommen und sich mitteln', 'Wider classes are more accurate, because more measurements come together in each class'),
        P('Mehr Werte je Klasse verdecken die Form, sie machen das Bild nicht genauer. Die Wahl der Klassengrenzen beeinflusst das Histogramm.',
          'More values per class hide the shape, they do not make the picture more accurate. The choice of class limits influences the histogram.'))
    ],
    hilfe: ['histogramm', 'frage-verteilung'], belege: ['wissen:histogramm-klassen-dichte']
  },
  {
    id: 'vd-boxplot-zwei', thema: 'beschreiben', fall: 'vd-geysir',
    stamm: P('Der Boxplot der Wartezeiten (dritte Tabelle) sieht unauffällig aus, die Häufigkeiten bei Breite 10 zeigen zwei Häufungen. Was folgt?', 'The boxplot of the waiting times (third table) looks unremarkable, the frequencies at width 10 show two clusters. What follows?'),
    antworten: [
      a(P('Der Boxplot beschreibt die Verteilung nur mit fünf Werten, zwei Häufungen zeigt er nicht', 'A boxplot describes the distribution with only five values and cannot show two clusters'),
        P('Minimum, Quartile, Median und Maximum (43, 58, 76, 82, 96) sagen nichts darüber, wo sich die Werte häufen. Das Histogramm zeigt die Form der Verteilung.',
          'Minimum, quartiles, median and maximum (43, 58, 76, 82, 96) say nothing about where the values cluster. The histogram shows the shape of the distribution.'), true),
      a(P('Der Boxplot ist falsch gezeichnet, denn Median und Quartile müssten die beiden Häufungen zeigen', 'The boxplot is drawn wrongly, since median and quartiles ought to show the clusters'),
        P('Die Quartile teilen die Werte in Viertel, ob sie sich häufen oder nicht. Die Lücke bei 60 bis 70 liegt innerhalb der Box von 58 bis 82.',
          'The quartiles divide the values into quarters whether or not they cluster. The gap at 60 to 70 lies inside the box from 58 to 82.')),
      a(P('Das Histogramm ist ungenauer, weil ein Boxplot alle Werte der Verteilung einzeln berücksichtigt', 'The histogram is less accurate, because a boxplot takes all values of the distribution into account'),
        P('Der Boxplot fasst die Verteilung in fünf Werten und eventuellen Ausreißern zusammen, er berücksichtigt nicht alle Werte einzeln.',
          'The boxplot summarises the distribution in five values and possible outliers, it does not take every value into account individually.'))
    ],
    hilfe: ['boxplot', 'histogramm'], belege: ['wissen:boxplot-aufbau', 'wissen:histogramm-klassen-dichte']
  },
  {
    id: 'vd-dichte', thema: 'beschreiben', fall: 'vd-fluesse-klassen', karte: 'verteilung',
    stamm: P(`Die letzte Klasse der Tabelle enthält ${zn('vd_k4_n')} Flüsse, die erste ${zn('vd_k1_n')}. Wie kommt die Höhe der Säulen bei ungleich breiten Klassen zustande?`, `The last class of the table contains ${zn('vd_k4_n')} rivers, the first ${zn('vd_k1_n')}. How is the height of the columns determined for classes of unequal width?`),
    antworten: [
      a(P('Höhe gleich Anteil geteilt durch Breite: So stellt die Fläche der Säule den Anteil dar', 'Height equals share divided by width: this way the area of the column shows the share'),
        P(`Für die letzte Klasse ist ${zd('vd_k4_an')} geteilt durch ${zn('vd_k4_b')} etwa ${zd('vd_k4_h', 3)}. Die Fläche aus Höhe mal Breite ergibt wieder den Anteil; die Summe aller Flächen ist 1.`,
          `For the last class ${ze('vd_k4_an')} divided by ${zn('vd_k4_b')} is about ${ze('vd_k4_h', 3)}. The area of height times width gives the share again; all areas sum to 1.`), true),
      a(P('Höhe gleich Anzahl der Flüsse; die Breite der Klasse ändert nur die Beschriftung der Achse', 'Height equals the number of rivers; the width of the class changes only the labelling of the axis'),
        P('Zeigte die Höhe die Anzahl, wäre bei ungleichen Klassenbreiten die Fläche irreführend: Die breite Klasse würde viel größer wirken, als ihr Anteil ist.',
          'If the height showed the count, the area would be misleading with unequal class widths: the wide class would look much larger than its share.')),
      a(P('Höhe gleich Anteil mal Breite, damit breite Klassen im Bild stärker hervortreten', 'Height equals share times width, so that wide classes stand out more in the picture'),
        P('Mit Anteil mal Breite hinge die Fläche vom Quadrat der Breite ab und blähte breite Klassen auf. Die Fläche soll genau den Anteil zeigen.',
          'With share times width the area would depend on the square of the width and inflate wide classes. The area is meant to show exactly the share.'))
    ],
    hilfe: ['histogramm', 'frage-verteilung'], belege: ['wissen:histogramm-klassen-dichte']
  },
  {
    id: 'vd-flaeche', thema: 'beschreiben', fall: 'vd-fluesse-klassen', karte: 'verteilung',
    stamm: P(`Die Säule der Klasse von 300 bis 600 hat laut Tabelle die Breite 3 und die Höhe ${zd('vd_k2_h', 3)}. Was zeigt ihre Fläche?`, `The column of the class from 300 to 600 has the width 3 and the height ${ze('vd_k2_h', 3)} according to the table. What does its area show?`),
    antworten: [
      a(P(`Den Anteil in dieser Klasse: ${zd('vd_k2_h', 3)} mal 3 ergibt etwa ${zd('vd_k2_an')}`, `The share in this class: ${ze('vd_k2_h', 3)} times 3 gives about ${ze('vd_k2_an')}`),
        P('Im Histogramm ist die Fläche proportional zur relativen Häufigkeit, alle Flächen zusammen ergeben 1.', 'In a histogram the area is proportional to the relative frequency, all areas together make 1.'), true),
      a(P(`Die Anzahl der Flüsse in dieser Klasse, nämlich ${zn('vd_k2_n')} von insgesamt 141`, `The number of rivers in this class, namely ${zn('vd_k2_n')} out of 141 in total`),
        P(`Die Anzahl ${zn('vd_k2_n')} steht in der Spalte Anzahl. Die Fläche ist diese Anzahl geteilt durch alle 141 Flüsse, also der Anteil.`,
          `The count ${zn('vd_k2_n')} is in the column Count. The area is this count divided by all 141 rivers, that is the share.`)),
      a(P('Die Dichte der Klasse, also die Höhe geteilt durch die Breite der Säule', 'The density of the class, that is the height divided by the width of the column'),
        P('Die Höhe selbst ist die Dichte (Anteil geteilt durch Breite). Durch die Breite noch einmal zu teilen ergibt keine Größe, die der Anteil wäre.',
          'The height itself is the density (share divided by width). Dividing by the width once more gives no quantity that would be the share.'))
    ],
    hilfe: ['histogramm', 'frage-verteilung'], belege: ['wissen:histogramm-klassen-dichte']
  },
  {
    id: 'vd-boxplot-lesen', thema: 'beschreiben', fall: 'vd-fluesse-box', karte: 'verteilung',
    stamm: P(`Angenommen, die Whisker reichen höchstens bis zum ${zd('vd_b_k', 1)}-Fachen des Interquartilsabstands über die Box hinaus. Aus den Kennzahlen (Tabellen) wird der Boxplot der Flusslängen gezeichnet. Wie sieht er aus?`,
      `Suppose the whiskers extend at most ${ze('vd_b_k', 1)} times the interquartile range beyond the box. The boxplot of the river lengths is drawn from the numbers (tables). What does it look like?`),
    antworten: [
      a(P('Median nahe am unteren Boxrand, oberer Whisker lang, darüber folgen einzelne Punkte', 'Median near the lower edge of the box, upper whisker long, single points follow above'),
        P(`Die Box geht von ${zn('vd_b_q1')} bis ${zn('vd_b_q3')}, der Median ${zn('vd_b_med')} liegt näher am unteren Rand. Der obere Whisker endet bei ${zn('vd_b_oben')}, dem größten Wert unterhalb der Grenze ${zn('vd_b_zaun')}; ${zn('vd_b_np')} Werte liegen darüber und werden als Punkte gezeichnet.`,
          `The box runs from ${zn('vd_b_q1')} to ${zn('vd_b_q3')}, the median ${zn('vd_b_med')} lies closer to the lower edge. The upper whisker ends at ${zn('vd_b_oben')}, the largest value below the limit ${zn('vd_b_zaun')}; ${zn('vd_b_np')} values lie above and are drawn as points.`), true),
      a(P('Die Box reicht vom kleinsten bis zum größten Wert, und die Whisker sind sehr kurz', 'The box runs from the smallest to the largest value, and the whiskers are very short'),
        P('Die Box reicht vom 1. bis zum 3. Quartil und enthält die mittleren 50 Prozent der Werte, nicht den ganzen Bereich von Minimum bis Maximum.',
          'The box runs from the 1st to the 3rd quartile and contains the middle 50 percent of the values, not the whole range from minimum to maximum.')),
      a(P('Der Median teilt die Box in zwei gleich lange Hälften, und die Whisker sind gleich lang', 'The median splits the box into two halves of equal length, and the whiskers are of equal length'),
        P('Der Median teilt die Werte in zwei Hälften, nicht die Box. Er liegt hier nahe am 1. Quartil, weil die Werte nach oben weit auslaufen.',
          'The median splits the values into two halves, not the box. Here it lies near the 1st quartile because the values run far out upwards.'))
    ],
    hilfe: ['boxplot', 'quartil', 'iqr'], belege: ['wissen:boxplot-aufbau', 'wissen:boxplot-whisker-faktor']
  },
  {
    id: 'vd-punkte', thema: 'beschreiben', fall: 'vd-fluesse-box',
    stamm: P('Im Boxplot der Flusslängen liegen einige Punkte über dem oberen Whisker (Tabellen). Was folgt daraus?', 'In the boxplot of the river lengths some points lie above the upper whisker (tables). What follows?'),
    antworten: [
      a(P('Die Punkte folgen nur der Whisker-Regel; ob es Fehler sind, klärt die Herkunft der Werte', 'The points follow the whisker rule only; the origin of the values decides about errors'),
        P(`${zn('vd_b_np')} Flüsse sind länger als die Grenze ${zn('vd_b_zaun')}. Punkte außerhalb der Whisker sind nicht automatisch Ausreißer und werden nicht routinemäßig gelöscht; entfernt wird nur bei wahrscheinlichem Mess- oder Beobachtungsfehler.`,
          `${zn('vd_b_np')} rivers are longer than the limit ${zn('vd_b_zaun')}. Points outside the whiskers are not automatically outliers and are not deleted routinely; values are removed only in case of a probable measurement or observation error.`), true),
      a(P('Es sind Ausreißer, und Ausreißer werden ohne weitere Prüfung aus den Daten entfernt', 'They are outliers, and outliers are removed from the data without any further checking'),
        P('Das ist die verbreitete Fehldeutung. Die Markierung folgt nur einer Regel über den Interquartilsabstand und sagt nichts über Fehler.',
          'That is the common misreading. The marking follows only a rule about the interquartile range and says nothing about errors.')),
      a(P('Die Werte werden so lange umgerechnet, bis sie wieder in die Box der anderen Werte passen', 'The values are transformed over and over until they fit into the box of the other values again'),
        P('Einzelne Werte werden nicht passend gemacht. Bei schiefen Daten helfen eine Transformation aller Werte (zum Beispiel Logarithmus) oder ein Modell, das bei großen Werten mehr Streuung erlaubt.',
          'Single values are not adjusted to fit. For skewed data, transforming all values (for example a logarithm) or a model allowing more spread at large values helps.'))
    ],
    hilfe: ['boxplot', 'ausreisser'], belege: ['wissen:zuur10-ausreisser', 'wissen:boxplot-aufbau']
  },
  // ---- z-Wert ----
  {
    id: 'zw-lage', thema: 'beschreiben', fall: 'zw-corolla', probieren: 'verteilungen',
    stamm: P(`Ein Wagen hat laut Tabelle ${zd('zw_mpg_x', 1)} Meilen pro Gallone und ${zn('zw_hp_x')} PS. In welchem Merkmal liegt er weiter vom Durchschnitt aller Wagen entfernt?`, `According to the table a car has ${ze('zw_mpg_x', 1)} miles per gallon and ${zn('zw_hp_x')} horsepower. In which feature is it farther from the average of all cars?`),
    antworten: [
      a(P(`Bei den Meilen pro Gallone: z = ${zd('zw_mpg')}, bei der Leistung nur ${za('zw_hp')} darunter, also näher am Mittelwert`, `In miles per gallon: z = ${ze('zw_mpg')}, for power only ${zae('zw_hp')} below, so closer to the mean`),
        P('Der z-Wert misst den Abstand vom Mittelwert in Standardabweichungen der eigenen Verteilung. So lassen sich Merkmale mit verschiedenen Einheiten und Streuungen vergleichen.',
          'The z value measures the distance from the mean in standard deviations of its own distribution. This makes features with different units and spreads comparable.'), true),
      a(P('Bei der Leistung, denn 65 ist der größere Rohwert und damit die größere Abweichung vom Durchschnitt', 'In power, since 65 is the larger raw value and thus the larger deviation from the average'),
        P(`Rohwerte in verschiedenen Einheiten lassen sich nicht vergleichen. Bei der Leistung liegt der Wagen ${za('zw_hp')} Standardabweichungen unter dem Mittelwert, bei den Meilen pro Gallone ${zd('zw_mpg')} darüber.`,
          `Raw values in different units cannot be compared. In power the car is ${zae('zw_hp')} standard deviations below the mean, in miles per gallon ${ze('zw_mpg')} above.`)),
      a(P('In beiden gleich weit, denn beide Werte unterscheiden sich vom Mittelwert, nur in anderer Einheit', 'Equally far in both, since both values differ from the mean, only in another unit'),
        P(`Verschieden vom Mittelwert zu sein sagt noch nicht, wie weit. ${zd('zw_mpg')} und ${za('zw_hp')} Standardabweichungen unterscheiden sich deutlich.`,
          `Differing from the mean does not yet say how far. ${ze('zw_mpg')} and ${zae('zw_hp')} standard deviations differ clearly.`))
    ],
    hilfe: ['z-wert', 'standardisierung'], belege: ['wissen:z-standardisierung-vergleich']
  },
  {
    id: 'zw-mittelung', thema: 'beschreiben', fall: 'zw-corolla',
    stamm: P('Als Rechenübung (sinnvoll wäre ein solches Mittel bei zwei Tests derselben Fähigkeit): Aus den beiden Werten des Wagens (Tabelle) soll ein gemeinsamer Wert entstehen. Wie geht das, ohne die verschiedenen Einheiten zu vermischen?', 'As a calculation exercise (such an average would make sense for two tests of the same ability): a common value is to be formed from the two values of the car (table). How is that done without mixing the different units?'),
    antworten: [
      a(P(`Zuerst beide Werte z-standardisieren und dann die z-Werte mitteln: ${zd('zw_mean_z')}`, `First z-standardise both values and then average the z values: ${ze('zw_mean_z')}`),
        P(`z-Werte sind unabhängig von Mittelwert und Streuung der Ausgangsverteilung und lassen sich darum mitteln: (${zd('zw_mpg')} + (${zd('zw_hp')})) / 2 = ${zd('zw_mean_z')}. Rohwerte aus Verteilungen mit verschiedenem Mittelwert und verschiedener Streuung lassen sich nicht direkt mitteln.`,
          `z values are independent of the mean and spread of the original distribution and can therefore be averaged: (${ze('zw_mpg')} + (${ze('zw_hp')})) / 2 = ${ze('zw_mean_z')}. Raw values from distributions with different means and spreads cannot be averaged directly.`), true),
      a(P(`Die Rohwerte direkt mitteln: (${zd('zw_mpg_x', 1)} + ${zn('zw_hp_x')}) / 2 = ${zd('zw_mean_raw')}, die Einheiten sind egal`, `Average the raw values directly: (${ze('zw_mpg_x', 1)} + ${zn('zw_hp_x')}) / 2 = ${ze('zw_mean_raw')}, the units do not matter`),
        P('Meilen pro Gallone und PS haben verschiedene Einheiten, verschiedene Mittelwerte und verschiedene Streuungen. Das Ergebnis mischt sie, ohne dass es sich deuten ließe.',
          'Miles per gallon and horsepower have different units, different means and different spreads. The result mixes them without being interpretable.')),
      a(P('Erst die Rohwerte mitteln und danach z-standardisieren, die Reihenfolge ist gleichgültig', 'First average the raw values and standardise afterwards, the order does not matter'),
        P('Der Mittelwert der Rohwerte mischt die Einheiten schon vor dem Standardisieren. Die Reihenfolge ist darum nicht gleichgültig: Standardisiert wird vor dem Mitteln.',
          'The mean of the raw values mixes the units already before standardising. The order is therefore not irrelevant: standardising comes before averaging.'))
    ],
    hilfe: ['standardisierung', 'z-wert'], belege: ['wissen:z-standardisierung-vergleich']
  },
  {
    id: 'zw-prozentrang', thema: 'beschreiben', probieren: 'verteilungen',
    tabelle: tab('zw-prozentrang', [P('Länge (Meilen)', 'Length (miles)'), P('z-Wert', 'z value'), P('Prozentrang bei Normalverteilung', 'Percentile rank under normality'), P('Anteil der Flüsse höchstens so lang (Prozent)', 'Share of rivers at most this long (percent)')], QUELLE_RIVERS, P('Flusslänge und Prozentrang', 'River length and percentile rank')),
    stamm: P(`Eine Flusslänge von ${zn('zw_r_x')} Meilen hat den z-Wert ${zd('zw_r_z')}. Bei einer Normalverteilung entspräche das dem Prozentrang ${zd('zw_r_n', 1)}; tatsächlich sind ${zd('zw_r_e', 1)} Prozent der Flüsse höchstens so lang (Tabelle). Was folgt?`,
      `A river length of ${zn('zw_r_x')} miles has the z value ${ze('zw_r_z')}. Under a normal distribution this would correspond to percentile rank ${ze('zw_r_n', 1)}; in fact ${ze('zw_r_e', 1)} percent of the rivers are at most this long (table). What follows?`),
    antworten: [
      a(P('Der Prozentrang aus z gilt bei Normalverteilung; bei dieser schiefen Verteilung zählt der Anteil', 'The rank from z holds for a normal distribution; for this skewed one the counted share applies'),
        P('Der Prozentrang kommt aus der kumulierten Verteilung und gilt für jede Form. Aus der Standardnormalverteilung lässt er sich nur ermitteln, wenn die Werte normalverteilt sind.',
          'The percentile rank comes from the cumulative distribution and holds for any shape. It can be obtained from the standard normal distribution only if the values are normally distributed.'), true),
      a(P('Der z-Wert ist falsch berechnet, denn ein z-Wert von 1 bedeutet den Prozentrang 84 bei jeder Verteilung', 'The z value is miscalculated, since a z value of 1 means percentile rank 84 for every distribution'),
        P('Der z-Wert stimmt. Der Prozentrang 84 gehört zu z = 1 nur unter der Annahme einer Normalverteilung.',
          'The z value is correct. Percentile rank 84 belongs to z = 1 only under the assumption of a normal distribution.')),
      a(P('Beide Angaben sind gleichwertig, denn Prozentrang und z-Wert messen im Grunde dasselbe Merkmal', 'Both statements are equivalent, since percentile rank and z value measure basically the same feature'),
        P(`Der z-Wert misst den Abstand in Standardabweichungen, der Prozentrang den Anteil darunter. Beide passen nur bei Normalverteilung zusammen; hier ${zd('zw_r_n', 1)} gegen ${zd('zw_r_e', 1)}.`,
          `The z value measures the distance in standard deviations, the percentile rank the share below. They fit together only for a normal distribution; here ${ze('zw_r_n', 1)} against ${ze('zw_r_e', 1)}.`))
    ],
    hilfe: ['prozentrang', 'z-wert', 'normwerte'], belege: ['wissen:prozentrang-normal-aus-z', 'wissen:normierung-prozentrang']
  },
  {
    id: 'zw-einheit', thema: 'beschreiben', probieren: 'verteilungen',
    tabelle: tab('zw-einheit', [P('Einheit', 'Unit'), P('Mittelwert', 'Mean'), P('Standardabweichung', 'Standard deviation'), P('Wert des Wagens', 'Value of the car'), P('z-Wert', 'z value')], QUELLE_MTCARS, P('Gewicht eines Wagens in zwei Einheiten', 'Weight of one car in two units')),
    stamm: P('Das Gewicht eines Wagens steht in zwei Einheiten, in 1000 Pfund und in Kilogramm (Tabelle). Was gilt für die beiden z-Werte?', 'The weight of a car is given in two units, in 1000 pounds and in kilograms (table). What holds for the two z values?'),
    antworten: [
      a(P(`Beide sind gleich (${zd('zw_e_z')}): Der z-Wert beschreibt die Lage, unabhängig von der Einheit`, `Both are equal (${ze('zw_e_z')}): the z value describes the position and does not depend on the unit`),
        P('Bei einer Umrechnung y = a mal x wachsen Wert, Mittelwert und Standardabweichung um denselben Faktor; im Quotienten (x - Mittelwert) / Standardabweichung kürzt er sich heraus.',
          'In a conversion y = a times x value, mean and standard deviation grow by the same factor; in the quotient (x - mean) / standard deviation it cancels out.'), true),
      a(P('Der z-Wert in Kilogramm ist viel größer, denn die Rohzahlen in Kilogramm sind viel größer', 'The z value in kilograms is much larger, since the raw numbers in kilograms are much larger'),
        P('Auch Mittelwert und Standardabweichung werden mit dem Faktor größer. Im Quotienten kürzt er sich heraus.',
          'Mean and standard deviation also grow by the factor. It cancels out in the quotient.')),
      a(P('Die z-Werte unterscheiden sich, denn Mittelwert und Standardabweichung sind jeweils anders', 'The z values differ, since mean and standard deviation are different in each row'),
        P(`Mittelwert und Standardabweichung sind verschieden, aber im selben Verhältnis wie der Wert des Wagens. Der z-Wert beträgt in beiden Zeilen ${zd('zw_e_z')}.`,
          `Mean and standard deviation differ, but in the same ratio as the value of the car. The z value is ${ze('zw_e_z')} in both rows.`))
    ],
    hilfe: ['z-wert', 'standardisierung'], belege: ['wissen:z-standardisierung-vergleich', 'wissen:lineare-transformation-kennwerte']
  },
  {
    id: 'zw-skala', thema: 'beschreiben', probieren: 'verteilungen',
    stamm: P('Angenommen (erfundene Zahlen), Test A hat den Mittelwert 240 und die Standardabweichung 30, Test B den Mittelwert 70 und die Standardabweichung 8. Eine Person erreicht in A den Wert 180. Welcher Wert in B entspricht derselben Lage?',
      'Suppose (invented numbers) test A has the mean 240 and the standard deviation 30, test B the mean 70 and the standard deviation 8. A person scores 180 in A. Which value in B corresponds to the same position?'),
    antworten: [
      a(P('54: z = -2 heißt zwei Standardabweichungen unter dem Mittelwert, in B also 70 - 16', '54: z = -2 means two standard deviations below the mean, in B 70 - 16'),
        P('z = (180 - 240) / 30 = -2. Gleiche z-Werte beschreiben gleichwertige Lagen in ihrer Verteilung; zurückgerechnet ergibt sich in B 70 + (-2) mal 8 = 54.',
          'z = (180 - 240) / 30 = -2. Equal z values describe equivalent positions in their own distribution; converted back this gives 70 + (-2) times 8 = 54 in B.'), true),
      a(P('10: Der Abstand von 60 Punkten unter dem Mittelwert gilt in beiden Tests gleichermaßen', '10: The distance of 60 points below the mean applies in both tests alike'),
        P('Ein Punkt ist in beiden Tests nicht gleich viel wert: Eine Standardabweichung sind in A 30 Punkte, in B 8 Punkte.',
          'A point is not worth the same in both tests: one standard deviation is 30 points in A, 8 points in B.')),
      a(P('68: Zwei Punkte unter dem Mittelwert von B, weil der z-Wert -2 beträgt', '68: Two points below the mean of B, because the z value is -2'),
        P('z = -2 heißt zwei Standardabweichungen unter dem Mittelwert, nicht zwei Punkte. In B beträgt eine Standardabweichung 8 Punkte.',
          'z = -2 means two standard deviations below the mean, not two points. In B one standard deviation is 8 points.'))
    ],
    hilfe: ['standardisierung', 'z-wert', 'iq-skala'], belege: ['wissen:z-standardisierung-vergleich']
  }
];
