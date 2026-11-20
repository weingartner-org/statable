/**
 * Üben: Wachstumskurven (B4 Teil 1, 14.11.2026; Einheit `wachstumskurven` in lernplan-wachstum.ts). Kennungen `lgm-<kürzel>-…`, Thema `wachstum`.
 * Alle Zahlen aus der echten Schlafentzug-Studie (Belenky u. a. 2003; lme4 sleepstudy, 18 Personen, Tag 0 bis 9, Reaktionszeit in ms) über
 * scripts/ueben-erwartet-wachstum.R → lib/testdaten/ueben-erwartet-wachstum.json (zweiter Weg nlme::lme und Einzel-Regressionen); Wächter lernen/fragen-wachstum.test.ts.
 * Eigene Wortlaute. Quellen: Bollen & Curran (2006), Latent Curve Models, Kap. 1-2; Preacher u. a. (2008); Hu & Bentler (1999).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const BC = 'Bollen & Curran 2006, Latent Curve Models, Kap. 1-2';
const RECHNUNG = 'Rechnung: scripts/ueben-erwartet-wachstum.R';
const KOPF_DE = 'Wachstumskurvenmodell der Schlafentzug-Studie (18 Personen, Tag 0 bis 9, Reaktionszeit in ms, Zeitwerte 0 bis 9): Mittelwert Achsenabschnitt 250,5, Mittelwert Steigung 10,6, Varianz der Steigung 46,3.';
const KOPF_EN = 'Growth curve model of the sleep deprivation study (18 people, day 0 to 9, reaction time in ms, time values 0 to 9): mean intercept 250.5, mean slope 10.6, variance of the slope 46.3.';

export const FRAGEN: Frage[] = [
  {
    id: 'lgm-wk-steigung', thema: 'wachstum', karte: 'messwiederholung',
    stamm: P(`${KOPF_DE} Was bedeutet die mittlere Steigung von 10,6? (Wachstumskurvenmodell)`, `${KOPF_EN} What does the mean slope of 10.6 mean? (growth curve model)`),
    antworten: [
      a(P('Im Mittel steigt die Reaktionszeit um 10,6 ms je Tag', 'On average the reaction time rises by 10.6 ms per day'), P('Die Steigung ist die Veränderung je Zeiteinheit; ihr Mittelwert ist die durchschnittliche Veränderung über alle Personen.', 'The slope is the change per time unit; its mean is the average change over all people.'), true),
      a(P('Jede der 18 Personen wird genau 10,6 ms je Tag langsamer', 'Each of the 18 people gets exactly 10.6 ms slower per day'), P('Es ist ein Durchschnitt. Die Streuung der Steigungen (Standardabweichung 6,8 ms) zeigt, dass die Personen verschieden stark abweichen.', 'It is an average. The variation of the slopes (standard deviation 6.8 ms) shows that people deviate by different amounts.')),
      a(P('Am letzten Tag ist die Reaktionszeit 10,6 ms', 'On the last day the reaction time is 10.6 ms'), P('Der Wert eines Tages ist der Achsenabschnitt plus Steigung mal Zeitwert; die Steigung allein sagt nichts über die Höhe.', 'The value of a day is the intercept plus slope times time value; the slope alone says nothing about the level.')),
      a(P('Der Zusammenhang zwischen Tag und Reaktionszeit beträgt r = 0,106', 'The relationship between day and reaction time is r = 0.106'), P('Die Steigung hat die Einheit der Messung je Zeiteinheit (ms je Tag), sie ist keine Korrelation.', 'The slope has the unit of the measurement per time unit (ms per day); it is not a correlation.'))
    ],
    hilfe: ['wachstumskurvenmodell'], belege: [BC, RECHNUNG, 'Hilfe:wachstumskurvenmodell']
  },
  {
    id: 'lgm-wk-streuung', thema: 'wachstum', karte: 'messwiederholung',
    stamm: P(`${KOPF_DE} Was zeigt die Varianz der Steigung von 46,3? (Wachstumskurvenmodell)`, `${KOPF_EN} What does the variance of the slope of 46.3 show? (growth curve model)`),
    antworten: [
      a(P('Wie verschieden sich die Personen entwickeln: Die Standardabweichung der Steigungen ist etwa 6,8 ms je Tag', 'How differently the people develop: the standard deviation of the slopes is about 6.8 ms per day'), P('Die Wurzel aus 46,3 ist 6,8. Neben einem Mittel von 10,6 heißt das: Die Veränderung je Tag ist von Person zu Person sehr unterschiedlich.', 'The square root of 46.3 is 6.8. Next to a mean of 10.6 this means: the change per day differs a lot from person to person.'), true),
      a(P('Wie ungenau der Mittelwert der Steigung geschätzt ist', 'How imprecisely the mean of the slope is estimated'), P('Das zeigt der Standardfehler (hier 1,7), nicht die Varianz der Steigungen zwischen den Personen.', 'That is shown by the standard error (here 1.7), not by the variance of the slopes between people.')),
      a(P('Wie stark die Reaktionszeit an einem einzelnen Tag streut', 'How strongly the reaction time varies on a single day'), P('Das wäre die Streuung der Messwerte an einem Tag. Die Varianz der Steigung betrifft die Veränderung je Tag.', 'That would be the variation of the measurements on one day. The variance of the slope concerns the change per day.')),
      a(P('Dass der Schlafentzug die Reaktionszeit verlängert', 'That sleep deprivation lengthens the reaction time'), P('Das ginge aus der mittleren Steigung hervor, und auch nur als Beschreibung dieser Daten. Die Varianz zeigt Unterschiede zwischen Personen, keine Ursache.', 'That would follow from the mean slope, and only as a description of these data. The variance shows differences between people, not a cause.'))
    ],
    hilfe: ['wachstumskurvenmodell'], belege: [BC, RECHNUNG, 'Hilfe:wachstumskurvenmodell']
  },
  {
    id: 'lgm-wk-nullpunkt', thema: 'wachstum', karte: 'messwiederholung',
    stamm: P(`${KOPF_DE} Jemand trägt als Zeitwerte -9 bis 0 statt 0 bis 9 ein, der Nullpunkt liegt dann am letzten Tag. Was ändert sich? (Wachstumskurvenmodell)`, `${KOPF_EN} Someone enters the time values -9 to 0 instead of 0 to 9, so the zero point is the last day. What changes? (growth curve model)`),
    antworten: [
      a(P('Der Achsenabschnitt gilt nun für den letzten Tag (etwa 346,1 ms); die mittlere Steigung (10,6) und die Passung bleiben gleich', 'The intercept now applies to the last day (about 346.1 ms); the mean slope (10.6) and the fit stay the same'), P('Der Zeitnullpunkt ist eine Wahl. 250,5 + 9 mal 10,6 ergibt 346,1; nur die Bezugsstelle des Achsenabschnitts wandert, das Modell ist dasselbe.', 'The time zero point is a choice. 250.5 + 9 times 10.6 gives 346.1; only the reference point of the intercept moves, the model is the same.'), true),
      a(P('Die Steigung wird negativ, weil die Zeitwerte negativ sind', 'The slope becomes negative because the time values are negative'), P('Die Zeitwerte laufen weiter aufwärts (-9 bis 0), die Reaktionszeit steigt weiter: Die Steigung bleibt 10,6.', 'The time values still run upwards (-9 to 0) and the reaction time still rises: the slope stays 10.6.')),
      a(P('Die Passung wird besser, weil der Achsenabschnitt jetzt größer ist', 'The fit gets better because the intercept is now larger'), P('Eine andere Wahl des Nullpunkts ändert die Passung nicht; es ist dieselbe Gerade, nur anders beschriftet.', 'Another choice of the zero point does not change the fit; it is the same line, only labelled differently.')),
      a(P('Nichts, der Achsenabschnitt ist der Mittelwert über alle Tage', 'Nothing, the intercept is the mean over all days'), P('Der Achsenabschnitt ist der erwartete Wert beim Zeitwert 0, nicht der Mittelwert über alle Tage.', 'The intercept is the expected value at time value 0, not the mean over all days.'))
    ],
    hilfe: ['wachstumskurvenmodell'], belege: [BC, RECHNUNG, 'Hilfe:wachstumskurvenmodell']
  },
  {
    id: 'lgm-wk-passung', thema: 'wachstum', karte: 'messwiederholung',
    stamm: P(`${KOPF_DE} Die Passung des Modells: χ² = 109,86 bei 50 Freiheitsgraden, CFI = 0,72, RMSEA = 0,26, SRMR = 0,18. Wie liest man das? (Wachstumskurvenmodell)`, `${KOPF_EN} The fit of the model: χ² = 109.86 with 50 degrees of freedom, CFI = 0.72, RMSEA = 0.26, SRMR = 0.18. How do you read this? (growth curve model)`),
    antworten: [
      a(P('Nach den üblichen Richtwerten (CFI ab 0,95, RMSEA bis 0,06) passt eine Gerade schlecht; Mittelwerte und Streuungen sind mit Vorsicht zu lesen, und mit 18 Personen ist alles unsicher', 'By the usual guide values (CFI from 0.95, RMSEA up to 0.06) a straight line fits poorly; means and variations are to be read with caution, and with 18 people everything is uncertain'), P('CFI und RMSEA liegen weit von den Richtwerten. Wer das Modell berichtet, nennt die Passung dazu; sie zeigt, dass die Gerade den Verlauf nicht gut trifft.', 'CFI and RMSEA are far from the guide values. Whoever reports the model gives the fit with it; it shows that the line does not capture the course well.'), true),
      a(P('Ein CFI von 0,72 ist gut, weil er über 0,5 liegt', 'A CFI of 0.72 is good because it is above 0.5'), P('Der CFI läuft von 0 bis 1, und die üblichen Richtwerte liegen bei 0,95. 0,72 ist weit darunter.', 'The CFI runs from 0 to 1, and the usual guide values are at 0.95. 0.72 is far below.')),
      a(P('Der Schlafentzug wirkt demnach nicht auf die Reaktionszeit', 'So sleep deprivation has no effect on the reaction time'), P('Die Passung sagt, wie gut das Modell zu den Daten passt, nicht, ob es eine Wirkung gibt.', 'The fit says how well the model fits the data, not whether there is an effect.')),
      a(P('Man muss nur mehr Personen messen, dann ist die Passung automatisch gut', 'One only has to measure more people and the fit will be good automatically'), P('Mehr Personen machen die Schätzung sicherer, ändern aber nicht, dass eine Gerade zu diesen Verläufen passt oder nicht.', 'More people make the estimate more certain, but do not change whether a straight line suits these courses or not.'))
    ],
    hilfe: ['wachstumskurvenmodell'], belege: ['Hu & Bentler 1999, Structural Equation Modeling 6', RECHNUNG, 'Hilfe:wachstumskurvenmodell']
  },
  {
    id: 'lgm-wk-mehrfach', thema: 'wachstum', mehrfach: true, karte: 'messwiederholung',
    stamm: P('Welche Aussagen über das Wachstumskurvenmodell stimmen? Mehrere können stimmen. (Latent Growth)', 'Which statements about the growth curve model are true? Several can be true. (latent growth)'),
    antworten: [
      a(P('Der Achsenabschnitt hängt davon ab, wo man den Zeitnullpunkt setzt.', 'The intercept depends on where the time zero point is set.'), P('Stimmt. Er ist der erwartete Wert beim Zeitwert 0; legt man 0 auf einen anderen Zeitpunkt, wandert der Achsenabschnitt mit.', 'True. It is the expected value at time value 0; if 0 is put on another time point, the intercept moves with it.'), true),
      a(P('Mit gleicher Restvarianz zu allen Zeitpunkten ist das Modell das gemischte Modell mit zufälligem Achsenabschnitt und zufälliger Steigung.', 'With equal residual variance at all time points the model is the mixed model with random intercept and random slope.'), P('Stimmt. Beide schätzen dieselben Größen; in den Schlafentzug-Daten stimmen Mittelwerte und Varianzen mit nlme::lme überein.', 'True. Both estimate the same quantities; in the sleep deprivation data means and variances agree with nlme::lme.'), true),
      a(P('Eine negative Korrelation von Achsenabschnitt und Steigung (hier -0,22) zeigt, dass ein langsamer Start den Anstieg verursacht.', 'A negative correlation of intercept and slope (here -0.22) shows that a slow start causes the rise.'), P('Stimmt nicht. Es ist ein Zusammenhang zwischen zwei Größen des Modells, keine Ursache.', 'Not true. It is a relationship between two quantities of the model, not a cause.')),
      a(P('Mit 18 Personen sind die Schätzungen so verlässlich wie mit 500.', 'With 18 people the estimates are as reliable as with 500.'), P('Stimmt nicht. Die Standardfehler wachsen bei wenigen Personen; die Passungswerte sind bei kleinen Stichproben besonders unsicher.', 'Not true. The standard errors grow with few people; fit values are especially uncertain in small samples.'))
    ],
    hilfe: ['wachstumskurvenmodell'], belege: [BC, RECHNUNG, 'Hilfe:wachstumskurvenmodell']
  }
];
