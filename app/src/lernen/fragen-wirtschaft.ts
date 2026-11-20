/**
 * Üben: Stimmen die Annahmen der Regression, ist ein Zusammenhang in Zeitreihen echt, wie gut ist eine Prognose, was zeigt ein Index?
 * (Heteroskedastie, Scheinregression, Prognosegüte MAPE und MASE, Basiseffekt, Laspeyres-Index).
 * Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R,
 * Daten: MASS::Cars93, datasets::austres, UKgas, discoveries; die Indexbeispiele sind Rechenbeispiele und als solche beschriftet). Nur Belegtes.
 * Mein Fachgebiet: Wirtschaft und Sozialwissenschaften (Karten Vorhersage und Zeitreihen), nur vermerkt.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, W, zd, ze, zn } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const REG = ['frage-vorhersage', 'regression'];
const ZR = ['frage-zeitreihen', 'zeitreihe-prognose'];
const besser = String(Math.round((Number(W.wp_mase_m) - 1) * 100));

const QUELLE_AUTO = P(
  `Daten: MASS::Cars93 (Lock 1993; Paket MASS, Lizenz GPL), ${zn('wc_n')} Automodelle auf dem US-Markt 1993, Preis in 1000 Dollar gegen Motorleistung in PS. Berechnet mit R.`,
  `Data: MASS::Cars93 (Lock 1993; package MASS, licence GPL), ${zn('wc_n')} car models on the US market in 1993, price in 1000 dollars against engine power in horsepower. Computed with R.`);
const QUELLE_SCHEIN = P(
  'Daten: datasets::austres (Einwohner Australiens) und datasets::UKgas (Gasverbrauch im Vereinigten Königreich), Jahresmittel 1972 bis 1985 (Teil von R, Lizenz GPL). Regression, Durbin-Watson-Wert und Änderungen von Jahr zu Jahr, berechnet mit R.',
  'Data: datasets::austres (residents of Australia) and datasets::UKgas (gas consumption in the United Kingdom), annual means 1972 to 1985 (part of R, licence GPL). Regression, Durbin-Watson value and year-to-year changes, computed with R.');
const QUELLE_PROG = P(
  `Daten: datasets::discoveries (World Almanac and Book of Facts 1975; Teil von R, Lizenz GPL), Zahl großer Erfindungen und Entdeckungen je Jahr. Prognosen für ${zn('wp_jahre')} Jahre (1950 bis 1959), Schätzung mit den Jahren bis 1949. Berechnet mit R.`,
  `Data: datasets::discoveries (World Almanac and Book of Facts 1975; part of R, licence GPL), number of great inventions and discoveries per year. Forecasts for ${zn('wp_jahre')} years (1950 to 1959), estimated with the years up to 1949. Computed with R.`);
const QUELLE_INDEX = P(
  'Rechenbeispiel, keine Daten: erfundene Indexwerte (Vorjahr gleich 100,0 im Januar). Berechnet mit R.',
  'Worked example, no data: invented index values (previous year equal to 100.0 in January). Computed with R.');
const QUELLE_LASP = P(
  'Rechenbeispiel, keine Daten: erfundene Preise und Mengen von zwei Gütern in einer Basis- und einer laufenden Periode. Berechnet mit R.',
  'Worked example, no data: invented prices and quantities of two goods in a base period and a current period. Computed with R.');

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'wi-cars93': {
    titel: P(`Preis (in 1000 Dollar) gegen Motorleistung (PS) bei ${zn('wc_n')} Automodellen. Die Gerade steigt um ${zd('wc_b', 3)} je PS`,
      `Price (in 1000 dollars) against engine power (horsepower) for ${zn('wc_n')} car models. The line rises by ${ze('wc_b', 3)} per horsepower`),
    tabellen: [
      tab('wi-cars93.0', [P('Modelle nach angepasstem Preis (unter dem Median, ab dem Median)', 'Models by fitted price (below the median, from the median up)'), P('Zahl der Modelle', 'Number of models'), P('Standardabweichung der Residuen', 'Standard deviation of the residuals')], QUELLE_AUTO, P('Streuung der Residuen: Lower = niedrige, Upper = hohe angepasste Werte', 'Spread of the residuals: Lower = low, Upper = high fitted values')),
      tab('wi-cars93.1', [P('Steigung B', 'Slope B'), P('Üblicher Standardfehler', 'Usual standard error'), P('Robuster Standardfehler (HC3)', 'Robust standard error (HC3)')], QUELLE_AUTO, P('Standardfehler der Steigung', 'Standard error of the slope'))
    ]
  },
  'wi-schein': {
    titel: P(`Zwei Reihen, die nichts miteinander zu tun haben: Einwohner Australiens und Gasverbrauch im Vereinigten Königreich, Jahresmittel von 1972 bis 1985 (${zn('wsc_n')} Jahre). Die zweite Zeile rechnet mit den Änderungen von Jahr zu Jahr`,
      `Two series with nothing to do with each other: residents of Australia and gas consumption in the United Kingdom, annual means from 1972 to 1985 (${zn('wsc_n')} years). The second row uses the year-to-year changes`),
    tabellen: [
      tab('wi-schein.0', [P('Rechnung', 'Calculation'), P('Zahl der Werte', 'Number of values'), P('R²', 'R²'), P('Durbin-Watson', 'Durbin-Watson'), P('Sig. der Steigung', 'Sig. of the slope')], QUELLE_SCHEIN, P('Levels = Höhe der Reihen, Changes = Änderungen gegenüber dem Vorjahr', 'Levels = level of the series, Changes = changes against the previous year'))
    ]
  },
  'wi-prog': {
    titel: P(`Prognose der Zahl großer Erfindungen je Jahr für ${zn('wp_jahre')} Jahre mit zwei einfachen Verfahren: Naive = letzter bekannter Wert, Mean = Mittelwert der Vorjahre. In diesen ${zn('wp_jahre')} Jahren gibt es ${zn('wp_null')} Jahre mit dem Wert null`,
      `Forecast of the number of great inventions per year for ${zn('wp_jahre')} years with two simple methods: Naive = last known value, Mean = mean of the earlier years. In these ${zn('wp_jahre')} years there are ${zn('wp_null')} years with the value zero`),
    tabellen: [
      tab('wi-prog.0', [P('Verfahren', 'Method'), P('Mittlerer absoluter Fehler (MAE)', 'Mean absolute error (MAE)'), P('Prozentfehler (MAPE)', 'Percentage error (MAPE)'), P('Skalierter Fehler (MASE)', 'Scaled error (MASE)')], QUELLE_PROG, P('Prognosegüte', 'Forecast accuracy'))
    ]
  },
  'wi-basis': {
    titel: P('Ein Preisindex in zwei aufeinanderfolgenden Monaten, im Vorjahr und im laufenden Jahr', 'A price index in two consecutive months, in the previous year and in the current year'),
    tabellen: [
      tab('wi-basis.0', [P('Monat', 'Month'), P('Index im Vorjahr', 'Index in the previous year'), P('Index im laufenden Jahr', 'Index in the current year'), P('Änderung zum Vorjahr (Prozent)', 'Change against the previous year (percent)')], QUELLE_INDEX, P('Rechenbeispiel: Vorjahresrate', 'Worked example: rate against the previous year'))
    ]
  },
  'wi-laspeyres': {
    titel: P('Zwei Güter, Preise und Mengen in einer Basisperiode und in der laufenden Periode', 'Two goods, prices and quantities in a base period and in the current period'),
    tabellen: [
      tab('wi-laspeyres.0', [P('Gut (Bread = Brot, Milk = Milch)', 'Good'), P('Preis in der Basisperiode', 'Price in the base period'), P('Menge in der Basisperiode', 'Quantity in the base period'), P('Preis in der laufenden Periode', 'Price in the current period'), P('Menge in der laufenden Periode', 'Quantity in the current period')], QUELLE_LASP, P('Rechenbeispiel: Preise und Mengen', 'Worked example: prices and quantities')),
      tab('wi-laspeyres.1', [P('Index mit Mengen der Basisperiode', 'Index with base period quantities'), P('Index mit Mengen der laufenden Periode', 'Index with current period quantities')], QUELLE_LASP, P('Rechenbeispiel: zwei Preisindizes', 'Worked example: two price indices'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Fall A: Autopreise und Streuung ----
  {
    id: 'wi-a-hetero', thema: 'wirtschaft', fall: 'wi-cars93',
    stamm: P(`Die Residuen sind bei den teuren Modellen viel breiter gestreut (${zd('wc_sd_o', 2)} gegen ${zd('wc_sd_u', 2)}). Worauf weist das hin?`, `The residuals are spread much more widely for the expensive models (${ze('wc_sd_o', 2)} against ${ze('wc_sd_u', 2)}). What does that point to?`),
    antworten: [
      a(P('Auf Heteroskedastie: Die Streuung der Residuen wächst mit dem angepassten Wert', 'On heteroskedasticity: the spread of the residuals grows with the value'),
        P('Ein Trichter im Residuenplot zeigt ungleiche Streuung. Zunehmende Residuengröße mit dem Prädiktor ist ein Anzeichen dafür.', 'A funnel in the residual plot shows unequal spread. Residuals growing with the predictor are a sign of it.'), true),
      a(P('Auf Autokorrelation: Aufeinanderfolgende Fehler hängen in der Reihenfolge zusammen', 'On autocorrelation: successive errors are related to each other in sequence'),
        P('Autokorrelation erkennt man, wenn man die Residuen gegen sich selbst, um einen Index verschoben, aufträgt. Wachsende Streuung ist ein anderes Muster.', 'Autocorrelation is seen when the residuals are plotted against themselves shifted by an index. Growing spread is a different pattern.')),
      a(P('Auf Nichtlinearität: Die Gerade verfehlt den gekrümmten Verlauf der Daten', 'On non-linearity: the straight line misses the curved course of the data'),
        P('Eine Kurve im Residuenplot weist auf Nichtlinearität. Hier geht es um die Breite der Streuung, nicht um ein Muster der Mitte.', 'A curve in the residual plot points to non-linearity. Here it is about the width of the spread, not a pattern of the centre.'))
    ],
    hilfe: REG, karte: 'vorhersage', belege: ['wissen:wirt-heteroskedastie-erkennen', 'wissen:kohn-residuenplot', 'wissen:reg-residuenplots', 'Kohn 2004']
  },
  {
    id: 'wi-a-robust', thema: 'wirtschaft', fall: 'wi-cars93',
    stamm: P(`Der übliche Standardfehler der Steigung ist ${zd('wc_se_u', 3)}, der robuste ${zd('wc_se_r', 3)}. Was bedeutet der Unterschied?`, `The usual standard error of the slope is ${ze('wc_se_u', 3)}, the robust one ${ze('wc_se_r', 3)}. What does the difference mean?`),
    antworten: [
      a(P('Die üblichen Standardfehler sind bei ungleicher Streuung unzuverlässig, der robuste ist besser', 'Under unequal spread the usual standard errors are unreliable, the robust one is better'),
        P('Bei ungleicher Streuung können die üblichen Varianzschätzungen falsch sein. Die robusten (Eicker-Huber-White) bleiben auch dann konsistent.', 'Under unequal spread the usual variance estimates can be wrong. The robust ones (Eicker-Huber-White) stay consistent even then.'), true),
      a(P('Der robuste ist größer, weil er einzelne auffällige Modelle mit doppeltem Gewicht in die Rechnung nimmt', 'The robust one is larger because it counts individual conspicuous models with double weight'),
        P('Der robuste Standardfehler zählt keine Beobachtung doppelt. Er trägt der ungleichen Streuung Rechnung.', 'The robust standard error counts no observation twice. It takes the unequal spread into account.')),
      a(P(`Der robuste ist bei kleinen Stichproben wichtig; bei ${zn('wc_n')} Modellen ist der übliche verlässlich genug`, `The robust one matters for small samples; with ${zn('wc_n')} models the usual one is reliable enough`),
        P('Das Problem entsteht aus der ungleichen Streuung, nicht aus der Stichprobengröße. Die Zahl der Modelle behebt es nicht.', 'The problem arises from the unequal spread, not from the sample size. The number of models does not remove it.'))
    ],
    hilfe: REG, karte: 'vorhersage', belege: ['wissen:reg-heteroskedastie-robust', 'wissen:lumley-heteroskedastie-vor-normalitaet', 'Lumley u. a. 2002, S. 153-154; Zweitquelle (Lehrbuch online, ohne Seite) für die robusten Standardfehler: Hanck u. a.']
  },
  {
    id: 'wi-a-folgen', thema: 'wirtschaft', fall: 'wi-cars93',
    stamm: P(`Welche Folge hat die ungleiche Streuung für die Steigung ${zd('wc_b', 3)} selbst?`, `What consequence does the unequal spread have for the slope ${ze('wc_b', 3)} itself?`),
    antworten: [
      a(P('Die Steigung bleibt unverzerrt, wird aber ungenauer, und die Standardfehler stimmen nicht', 'The slope stays unbiased but becomes less precise, and the standard errors are wrong'),
        P('Heteroskedastizität macht die Schätzung ungenauer, aber nicht verzerrt. Verzerrt wird sie zum Beispiel durch Nichtlinearität, fehlende Variablen oder Messfehler in x.', 'Heteroskedasticity makes the estimate less precise but not biased. It is biased, for example, by non-linearity, omitted variables or measurement error in x.'), true),
      a(P('Die Steigung wird verzerrt, meist nach unten, weil die teuren Modelle zu viel Gewicht erhalten', 'The slope becomes biased, mostly downwards, because the expensive models get too much weight'),
        P('Die Verzerrung der Steigung kommt aus anderen Quellen. Ungleiche Streuung verändert die Streuung der Schätzung, nicht ihren Erwartungswert.', 'The bias of the slope comes from other sources. Unequal spread changes the variation of the estimate, not its expected value.')),
      a(P('Die Steigung wird verzerrt und lässt sich korrigieren, indem man die teuren Modelle entfernt', 'The slope becomes biased and can be corrected by removing the expensive models'),
        P('Entfernen ist keine Korrektur. Die Verzerrung der Steigung käme aus anderen Quellen, und die ungleiche Streuung bliebe in den übrigen Daten.', 'Removing is no correction. Bias in the slope would come from other sources, and the unequal spread would remain in the other data.'))
    ],
    hilfe: REG, karte: 'vorhersage', belege: ['wissen:reg-folgen-verletzungen', 'Backhaus u. a.']
  },
  // ---- Fall B: Scheinregression ----
  {
    id: 'wi-b-schein', thema: 'wirtschaft', fall: 'wi-schein',
    stamm: P(`Einwohnerzahl Australiens und Gasverbrauch im Vereinigten Königreich zeigen R² = ${zd('wsc_r2', 3)}. Was folgt daraus?`, `Residents of Australia and gas consumption in the United Kingdom show R² = ${ze('wsc_r2', 3)}. What follows?`),
    antworten: [
      a(P(`Wenig: Beide Reihen haben einen Trend; Warnzeichen sind hohes R² und Durbin-Watson ${zd('wsc_dw', 2)}`, `Little: both series have a trend; warning signs are a high R² and a Durbin-Watson value of ${ze('wsc_dw', 2)}`),
        P(`Rechnet man mit den Änderungen von Jahr zu Jahr, fällt R² auf ${zd('wsc_r2d', 3)} (Sig. ${zd('wsc_pd', 3)}). Der Zusammenhang war ein Trend.`, `Using the year-to-year changes R² falls to ${ze('wsc_r2d', 3)} (Sig. ${ze('wsc_pd', 3)}). The relationship was a trend.`), true),
      a(P('Der Gasverbrauch bestimmt die Einwohnerzahl, denn bei so hohem R² gibt es eine Wirkungsrichtung', 'Gas consumption determines the number of residents, since with such a high R² there is a direction of effect'),
        P('Ein hohes R² beweist keine Kausalität, und ein Prädiktor ist nicht schon die Ursache. Hier haben beide Reihen nur einen gemeinsamen Trend.', 'A high R² proves no causality, and a predictor is not already the cause. Here both series merely share a trend.')),
      a(P('Es besteht ein echter Zusammenhang, weil die Steigung hochsignifikant ist und R² so hoch liegt', 'There is a real relationship because the slope is highly significant and R² is so high'),
        P('Bei Reihen mit Trend und autokorrelierten Residuen sind Signifikanz und R² trügerisch. Das ist die Scheinregression.', 'For series with a trend and autocorrelated residuals significance and R² are deceptive. This is the spurious regression.'))
    ],
    hilfe: ZR, karte: 'zeitreihen', belege: ['wissen:wirt-scheinkorrelation-zeitreihen', 'Winker u. a.; Hyndman und Athanasopoulos']
  },
  // ---- Fall C: Prognosegüte ----
  {
    id: 'wi-c-mape', thema: 'wirtschaft', fall: 'wi-prog',
    stamm: P('In der Tabelle steht für den Prozentfehler (MAPE) das Zeichen ∞. Woran liegt das?', 'In the table the sign ∞ stands for the percentage error (MAPE). What is the reason?'),
    antworten: [
      a(P(`Der Prozentfehler teilt durch den beobachteten Wert, und ${zn('wp_null')} Jahre haben den Wert null`, `The percentage error divides by the observed value, and ${zn('wp_null')} years have the value zero`),
        P('Prozentfehler werden unendlich oder undefiniert, wenn ein beobachteter Wert null ist. Bei seltenen Zählwerten sind sie unbrauchbar.', 'Percentage errors become infinite or undefined when an observed value is zero. For rare count values they are unusable.'), true),
      a(P('Beide Verfahren sind so ungenau, dass der Prozentfehler über jeder denkbaren Grenze liegt', 'Both methods are so inaccurate that the percentage error lies above every conceivable limit'),
        P(`Der mittlere absolute Fehler ist mit ${zd('wp_mae_n', 2)} und ${zd('wp_mae_m', 2)} endlich. Das Zeichen kommt aus dem Teilen durch null.`, `The mean absolute error is finite at ${ze('wp_mae_n', 2)} and ${ze('wp_mae_m', 2)}. The sign comes from dividing by zero.`)),
      a(P('Bei einer Null ergibt der Prozentfehler den Wert null, das Zeichen ∞ steht für diese Fälle', 'For a zero the percentage error gives the value zero, the sign ∞ stands for these cases'),
        P('Bei einem beobachteten Wert null lässt sich der Fehler gar nicht in Prozent des Werts ausdrücken. Er wird nicht null, sondern undefiniert.', 'For an observed value of zero the error cannot be expressed as a percentage of the value at all. It does not become zero but undefined.'))
    ],
    hilfe: ['zeitreihe-prognose'], karte: 'zeitreihen', belege: ['wissen:hyndman06-mape', 'Hyndman und Koehler 2006']
  },
  {
    id: 'wi-c-mase', thema: 'wirtschaft', fall: 'wi-prog',
    stamm: P(`Das Verfahren Mean hat MASE = ${zd('wp_mase_m', 2)}. Wie ist das zu lesen?`, `The method Mean has MASE = ${ze('wp_mase_m', 2)}. How is that to be read?`),
    antworten: [
      a(P('Sein Fehler ist größer als der der naiven Einschritt-Prognose in den Anpassungsjahren', 'Its error is larger than that of the naive one-step forecast in the fitting years'),
        P(`Der MASE teilt den Fehler durch den der naiven Einschritt-Prognose in den Anpassungsjahren: unter 1 ist besser, über 1 schlechter. Die Zeile Naive (${zd('wp_mase_n', 2)}) ist ein eigenes Verfahren, das den letzten Wert für alle zehn Jahre fortschreibt.`, `The MASE divides the error by that of the naive one-step forecast in the fitting years: below 1 is better, above 1 worse. The row Naive (${ze('wp_mase_n', 2)}) is a method of its own that carries the last value forward for all ten years.`), true),
      a(P(`Seine Prognosen sind im Mittel ${besser} Prozent besser als die einfache Prognose des letzten Werts`, `Its forecasts are on average ${besser} percent better than the simple forecast of the last value`),
        P('Der MASE teilt den Fehler durch den der naiven Prognose. Ein Wert über 1 bedeutet einen größeren, nicht einen kleineren Fehler.', 'The MASE divides the error by that of the naive forecast. A value above 1 means a larger, not a smaller error.')),
      a(P(`Sein mittlerer Fehler beträgt ${zd('wp_mase_m', 2)} Erfindungen je Jahr in der Prognosezeit`, `Its mean error is ${ze('wp_mase_m', 2)} inventions per year in the forecast period`),
        P(`Der MASE hat keine Einheit, er ist ein Verhältnis. Der Fehler in der Einheit der Reihe steht im mittleren absoluten Fehler, ${zd('wp_mae_m', 2)}.`, `The MASE has no unit, it is a ratio. The error in the unit of the series is the mean absolute error, ${ze('wp_mae_m', 2)}.`))
    ],
    hilfe: ['zeitreihe-prognose'], karte: 'zeitreihen', belege: ['wissen:hyndman06-mase', 'wissen:hyndman06-skalenabhaengig', 'Hyndman und Koehler 2006']
  },
  // ---- Fall D und E: Indizes ----
  {
    id: 'wi-d-basis', thema: 'wirtschaft', fall: 'wi-basis',
    stamm: P(`Die Änderung zum Vorjahr fällt von Januar auf Februar von ${zd('wb_r1', 1)} auf ${zd('wb_r2', 1)} Prozent, obwohl der Index von ${zd('wb_t1', 1)} auf ${zd('wb_t2', 1)} steigt. Wie kommt das?`,
      `The change against the previous year falls from January to February from ${ze('wb_r1', 1)} to ${ze('wb_r2', 1)} percent, although the index rises from ${ze('wb_t1', 1)} to ${ze('wb_t2', 1)}. How does that come about?`),
    antworten: [
      a(P(`Basiseffekt: Im Vorjahr stieg der Index zwischen den Monaten stärker (${zd('wb_j1', 1)} auf ${zd('wb_j2', 1)})`, `Base effect: in the previous year the index rose more strongly (${ze('wb_j1', 1)} to ${ze('wb_j2', 1)})`),
        P(`Gegenüber dem Vormonat steigt der Index im laufenden Jahr um ${zd('wb_m', 1)} Prozent. Die Vorjahresrate sinkt, ohne dass die Preise fallen.`, `Against the previous month the index rises by ${ze('wb_m', 1)} percent in the current year. The rate against the previous year falls without prices falling.`), true),
      a(P('Die Preise sind im Februar gesunken, sonst könnte die Rate nicht fallen', 'Prices fell in February; otherwise the rate against last year could not have fallen'),
        P('Der Index steigt weiter. Sinkt die Inflationsrate, sinken deshalb nicht die Preise.', 'The index keeps rising. When the inflation rate falls, prices do not fall for that reason.')),
      a(P('Der Warenkorb wurde im Februar neu gewichtet, daher ist der Vergleich mit dem Vorjahr verzerrt', 'The basket was reweighted in February, so the comparison with the previous year is distorted'),
        P('Dafür gibt es in der Tabelle keinen Hinweis. Die Zahlen genügen, um den Rückgang zu erklären.', 'There is no sign of that in the table. The figures are enough to explain the decline.'))
    ],
    hilfe: ['indexzahlen'], belege: ['wissen:kohn-basiseffekt', 'Kohn 2004']
  },
  {
    id: 'wi-e-laspeyres', thema: 'wirtschaft', fall: 'wi-laspeyres',
    stamm: P('Welche Mengen gehen in den Laspeyres-Preisindex ein, und wie hoch ist er?', 'Which quantities enter the Laspeyres price index, and how high is it?'),
    antworten: [
      a(P(`Die Mengen der Basisperiode (${zn('wl_q0b')} und ${zn('wl_q0m')}); der Index ist ${zd('wl_las', 3)}, ohne Mengeneffekt`, `The quantities of the base period (${zn('wl_q0b')} and ${zn('wl_q0m')}); the index is ${ze('wl_las', 3)}, without quantity effect`),
        P('Der Warenkorb der Basisperiode bleibt fest. Eine Abweichung des Index von eins beruht deshalb nur auf Preisänderungen.', 'The basket of the base period stays fixed. A deviation of the index from one is therefore due to price changes only.'), true),
      a(P(`Die Mengen der laufenden Periode (${zn('wl_q1b')} und ${zn('wl_q1m')}); der Index ist ${zd('wl_paa', 3)}, mit neuen Mengen`, `The quantities of the current period (${zn('wl_q1b')} and ${zn('wl_q1m')}); the index is ${ze('wl_paa', 3)}, with the new quantities`),
        P('Mit den laufenden Mengen rechnet ein anderer Index. Die laufenden Mengen gehen in den Laspeyres-Index nicht ein.', 'A different index calculates with the current quantities. The current quantities do not enter the Laspeyres index.')),
      a(P('Die Durchschnittsmengen beider Perioden; der Index liegt zwischen beiden Werten', 'The average quantities of both periods; the index lies between the two values'),
        P('Der Laspeyres-Index nimmt feste Mengen der Basisperiode, keinen Durchschnitt. So bleibt der Vergleich ein reiner Preisvergleich.', 'The Laspeyres index takes fixed quantities of the base period, no average. That keeps the comparison a pure price comparison.'))
    ],
    hilfe: ['indexzahlen'], belege: ['wissen:wirt-laspeyres', 'Kohn 2004; Eurostat']
  }
];
