/**
 * Üben: Wie bereite ich meine Daten vor, und was tue ich mit fehlenden oder auffälligen Werten? (Umkodieren, Umpolen, Skalenwert, fehlende Werte, Ausreißer).
 * Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R, Daten aus psych::bfi,
 * datasets::airquality und mtcars; das Umpol-Beispiel ist als Rechenbeispiel beschriftet). Belege: wissen.json (Testtheorie Kap. 7, Rasch 1 Kap. 1,
 * Dormann Kap. 6, Zuur u. a. 2010, Backhaus Kap. 2, Kohn). Zu Imputation und Plausibilitätsprüfung gibt es keine Quelle, darum keine Frage.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, zd, ze, zn } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

const QUELLE_BFI = P(
  'Daten: psych::bfi (SAPA-Projekt, Revelle, Wilt und Rosenthal 2010; Items aus dem IPIP, gemeinfrei; Paket psych, Lizenz GPL), Items A1 bis A5 (A1 ist gegenläufig formuliert), Antworten 1 bis 6, Personen ohne fehlende Antwort (2709). Berechnet mit R.',
  'Data: psych::bfi (SAPA project, Revelle, Wilt and Rosenthal 2010; items from the IPIP, public domain; package psych, licence GPL), items A1 to A5 (A1 is worded in the opposite direction), answers 1 to 6, persons without a missing answer (2709). Computed with R.');
const QUELLE_OZON = P(
  'Daten: datasets::airquality (Chambers u. a. 1983; Teil von R, Lizenz GPL), Ozon (ppb) an 153 Tagen in New York, Mai bis September 1973; an 37 Tagen fehlt die Messung. Berechnet mit R.',
  'Data: datasets::airquality (Chambers et al. 1983; part of R, licence GPL), ozone (ppb) on 153 days in New York, May to September 1973; the measurement is missing on 37 days. Computed with R.');
const QUELLE_MT = P(
  'Daten: datasets::mtcars (Henderson und Velleman 1981; Teil von R, Lizenz GPL), 32 Wagen aus der Zeitschrift Motor Trend 1974, Verbrauch (mpg) und Gewicht (1000 Pfund). Berechnet mit R.',
  'Data: datasets::mtcars (Henderson and Velleman 1981; part of R, licence GPL), 32 cars from Motor Trend 1974, fuel consumption (mpg) and weight (1000 lb). Computed with R.');

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'um-trenn': {
    titel: P('Das Item A1 ohne und mit Umpolen', 'Item A1 without and with reverse-coding'),
    tabellen: [
      tab('um-trenn.0', [P('Fassung von A1', 'Version of A1'), P('Korrelation mit der Summe der übrigen vier Items', 'Correlation with the sum of the other four items'), P('Cronbachs Alpha der fünf Items', 'Cronbach\'s alpha of the five items')], QUELLE_BFI,
        P('Trennschärfe von A1 und Alpha der Skala', 'Item-total correlation of A1 and alpha of the scale'))
    ]
  },
  'fw-ozon': {
    titel: P('Mittelwert des Ozons bei drei Behandlungen der Lücken', 'Mean of ozone under three treatments of the gaps'),
    tabellen: [
      tab('fw-ozon.0', [P('Behandlung der Lücken', 'Treatment of the gaps'), P('Tage', 'Days'), P('Mittelwert Ozon (ppb)', 'Mean ozone (ppb)')], QUELLE_OZON, P('Mittelwert je nach Behandlung der fehlenden Werte', 'Mean depending on how missing values are treated'))
    ]
  },
  'ar-hebel': {
    titel: P('Drei Wagen in der Regression von Verbrauch auf Gewicht', 'Three cars in the regression of fuel consumption on weight'),
    tabellen: [
      tab('ar-hebel.0', [P('Wagen', 'Car'), P('Gewicht (1000 Pfund)', 'Weight (1000 lb)'), P('Hebelwert', 'Leverage'), P('Standardisiertes Residuum', 'Standardised residual'), P('Cook-Abstand', 'Cook\'s distance')], QUELLE_MT,
        P('Hebelwert, Residuum und Cook-Abstand', 'Leverage, residual and Cook\'s distance'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Umkodieren, Umpolen, Skalenwert ----
  {
    id: 'um-formel', thema: 'daten',
    tabelle: tab('um-formel', [P('alte Antwort', 'old answer'), P('neue Antwort', 'new answer')], P('Rechenbeispiel ohne Daten: Umpolen einer Skala von 1 bis 5. Berechnet mit R.', 'Worked example without data: reverse-coding a scale from 1 to 5. Computed with R.'), P('Rechenbeispiel: Umpolen einer Skala von 1 bis 5', 'Worked example: reverse-coding a scale from 1 to 5')),
    stamm: P('Rechenbeispiel: Eine Skala hat die Antworten 1 bis 5, und ein gegenläufig formuliertes Item wird umgepolt (Tabelle). Welcher neue Wert gehört zur alten Antwort 2?',
      'Worked example: a scale has the answers 1 to 5, and an item worded in the opposite direction is reverse-coded (table). Which new value belongs to the old answer 2?'),
    antworten: [
      a(P('Der neue Wert ist 4, denn neu gleich 6 minus alt', 'The new value is 4, since new = 6 minus old'),
        P('Beim Umpolen kehrt sich die Reihenfolge um und der Wertebereich bleibt: 1 wird 5, 2 wird 4, 3 bleibt 3. Allgemein gilt kleinster plus größter Wert minus alt, hier 1 + 5 - 2 = 4.',
          'Reverse-coding reverses the order and keeps the range: 1 becomes 5, 2 becomes 4, 3 stays 3. In general it is smallest plus largest value minus old, here 1 + 5 - 2 = 4.'), true),
      a(P('Der neue Wert ist 3, denn neu gleich 5 minus alt', 'The new value is 3, since new equals 5 minus old'),
        P('5 minus alt ergäbe die Werte 4 bis 0 und damit eine Skala, die bei 0 statt bei 1 beginnt. Die Antwort 2 würde nicht auf 4 abgebildet. Richtig ist 6 minus alt.',
          '5 minus old would give the values 4 to 0 and thus a scale that starts at 0 instead of 1. The answer 2 would not map to 4. The correct rule is 6 minus old.')),
      a(P('Der neue Wert ist -2, denn das Vorzeichen wird gedreht', 'The new value is -2, since the sign is flipped'),
        P('Umpolen kehrt die Richtung um, behält aber den Wertebereich 1 bis 5. Ein Vorzeichenwechsel würde Werte von -1 bis -5 erzeugen.',
          'Reverse-coding reverses the direction but keeps the range 1 to 5. Flipping the sign would produce values from -1 to -5.'))
    ],
    hilfe: ['umpolen', 'likert-skala'], belege: ['wissen:umpolen-verfahren']
  },
  {
    id: 'um-skalenwert', thema: 'daten',
    tabelle: tab('um-skalenwert', [P('Person', 'Person'), P('A1', 'A1'), P('A2', 'A2'), P('A3', 'A3'), P('A4', 'A4'), P('A5', 'A5'), P('Summe der Rohwerte', 'Sum of raw values'), P('A1 umgepolt', 'A1 reverse-coded'), P('Summe nach Umpolen', 'Sum after reverse-coding')], QUELLE_BFI,
      P('Vier Personen, Items A1 bis A5 (Antworten 1 bis 6)', 'Four persons, items A1 to A5 (answers 1 to 6)')),
    stamm: P('Der Skalenwert einer Person ist die Summe der fünf Items A1 bis A5, und A1 ist gegenläufig formuliert (Antworten 1 bis 6). Wie entsteht der richtige Skalenwert für Person 3?',
      'The scale score of a person is the sum of the five items A1 to A5, and A1 is worded in the opposite direction (answers 1 to 6). How does the correct scale score arise for person 3?'),
    antworten: [
      a(P(`Erst A1 umpolen (7 minus ${zn('um_p3_a1')} gleich ${zn('um_p3_a1r')}), dann alle fünf Werte addieren: ${zn('um_p3_neu')}`, `First reverse-code A1 (7 minus ${zn('um_p3_a1')} equals ${zn('um_p3_a1r')}), then add all five values: ${zn('um_p3_neu')}`),
        P(`Gegenläufige Items werden vor der Summe umgepolt. Der vorläufige Testwert ist dann die Summe der Itemwerte (Zeilensumme): ${zn('um_p3_a1r')} + 4 + 5 + 4 + 4 = ${zn('um_p3_neu')}.`,
          `Items worded in the opposite direction are reverse-coded before the sum is formed. The provisional test score is then the sum of the item scores (row sum): ${zn('um_p3_a1r')} + 4 + 5 + 4 + 4 = ${zn('um_p3_neu')}.`), true),
      a(P(`Die fünf Rohwerte unverändert addieren: ${zn('um_p3_roh')}, denn die Summe zählt jede Antwort gleich`, `Add the five raw values unchanged: ${zn('um_p3_roh')}, since the sum counts every answer alike`),
        P('Dann zählt hohe Zustimmung zu A1 als hoher Wert, obwohl sie ein niedriges Merkmal anzeigt. Das Item wirkt gegen die übrigen vier.', 'Then strong agreement with A1 counts as a high value although it indicates a low attribute. The item works against the other four.')),
      a(P(`A1 weglassen und nur A2 bis A5 addieren: ${zn('um_p3_ohne')}, damit die Richtung stimmt`, `Leave out A1 and add only A2 to A5: ${zn('um_p3_ohne')}, so that the direction is right`),
        P('Das Item gehört zur Skala und wird umgepolt, nicht gestrichen. Mit vier Items hätte die Summe zudem einen anderen Wertebereich als eine Summe aus fünf Items.',
          'The item belongs to the scale and is reverse-coded, not dropped. With four items the sum would also have a different range from a sum of five items.'))
    ],
    hilfe: ['skalenwert', 'umpolen'], belege: ['wissen:umpolen-verfahren', 'wissen:testtheorie-testwert-summe']
  },
  {
    id: 'um-trennschaerfe', thema: 'daten', fall: 'um-trenn',
    stamm: P('Die Tabelle zeigt für das Item A1 die Korrelation mit der Summe der vier übrigen Items und Cronbachs Alpha der fünf Items. Was liegt hinter dem negativen Wert?',
      'The table shows for item A1 the correlation with the sum of the other four items and Cronbach\'s alpha of the five items. What lies behind the negative value?'),
    antworten: [
      a(P('A1 ist gegenläufig formuliert und nicht umgepolt; nach dem Umpolen wird der Wert positiv', 'A1 is worded oppositely and was not reverse-coded; reverse-coding turns it positive'),
        P(`Eine häufige Ursache negativer Trennschärfe ist eine vergessene Umpolung. Nach 7 minus Wert dreht sich das Vorzeichen auf ${zd('ut_r', 3)}, und Alpha steigt von ${zd('ut_alpha0', 3)} auf ${zd('ut_alpha1', 3)}.`,
          `A common cause of negative item-total correlation is forgotten reverse-coding. After 7 minus value the sign turns to ${ze('ut_r', 3)}, and alpha rises from ${ze('ut_alpha0', 3)} to ${ze('ut_alpha1', 3)}.`), true),
      a(P('A1 misst etwas Unabhängiges von den anderen Items und wird ohne Prüfung gelöscht', 'A1 measures something independent of the other items and is deleted without further checking'),
        P('Eine negative Trennschärfe heißt nicht, dass das Item gelöscht werden muss. Zuerst werden Formulierung und Umpolung geprüft. Ein Item mit unabhängigem Inhalt hätte einen Wert nahe null.',
          'A negative item-total correlation does not mean that the item has to be deleted. Wording and reverse-coding are checked first. An item with independent content would have a value near zero.')),
      a(P('Nur der Betrag der Korrelation zählt, das Vorzeichen darf bei der Auswertung übergangen werden', 'Only the size of the correlation counts, so the sign may be ignored in the whole analysis'),
        P(`Ohne Umpolen bleibt Alpha bei ${zd('ut_alpha0', 3)}, weil A1 gegen die übrigen vier Items arbeitet. Erst das Umpolen bringt Alpha auf ${zd('ut_alpha1', 3)}.`,
          `Without reverse-coding alpha stays at ${ze('ut_alpha0', 3)} because A1 works against the other four items. Only reverse-coding brings alpha to ${ze('ut_alpha1', 3)}.`))
    ],
    hilfe: ['umpolen', 'skalenwert'], belege: ['wissen:negative-trennschaerfe-ursache', 'wissen:umpolen-verfahren']
  },
  {
    id: 'um-mehrfach', thema: 'daten', fall: 'um-trenn', mehrfach: true,
    stamm: P('Welche Aussagen zur Tabelle über das Umpolen von A1 stimmen? Mehrere können stimmen.', 'Which statements about the table on reverse-coding A1 are correct? Several may be correct.'),
    antworten: [
      a(P(`Das Umpolen ändert nur das Vorzeichen der Korrelation, nicht ihren Betrag (${zd('ut_r', 3)})`, `Reverse-coding changes only the sign of the correlation, not its size (${ze('ut_r', 3)})`),
        P('Die Summe der übrigen vier Items bleibt gleich, und aus x wird 7 minus x. Das kehrt das Vorzeichen der Korrelation um und lässt den Betrag unverändert.', 'The sum of the other four items stays the same, and x becomes 7 minus x. That flips the sign of the correlation and leaves its size unchanged.'), true),
      a(P('Nach der Empfehlung von Moosbrugger und Kelava (Kap. 7) gehört Umpolen vor die Itemanalyse, am besten schon vor dem Aufbau der Datenmatrix', 'According to the recommendation of Moosbrugger and Kelava (ch. 7), reverse-coding belongs before the item analysis, preferably before the data matrix is built'),
        P('Moosbrugger und Kelava (Kap. 7) empfehlen, invertierte Items vor der Itemanalyse umzukodieren, am besten schon vor dem Aufbau der Datenmatrix. Das ist eine Empfehlung, keine Rechenregel.', 'Moosbrugger and Kelava (ch. 7) recommend recoding inverted items before the item analysis, preferably before the data matrix is built. This is a recommendation, not a rule of calculation.'), true),
      a(P('Nach dem Umpolen wäre die Korrelation von A1 mit den übrigen Items null', 'After reverse-coding the correlation of A1 with the other items would be zero'),
        P(`Sie wäre ${zd('ut_r', 3)} statt -${zd('ut_r', 3)}. Eine Korrelation von null würde ein Item ohne Zusammenhang mit der Skala bedeuten.`, `It would be ${ze('ut_r', 3)} instead of -${ze('ut_r', 3)}. A correlation of zero would mean an item unrelated to the scale.`)),
      a(P('Der Skalenwert jeder Person bleibt beim Umpolen von A1 gleich', 'The scale score of every person stays the same when A1 is reverse-coded'),
        P('Aus A1 wird 7 minus A1. Das wäre nur bei einer Antwort genau in der Mitte der Skala dasselbe, und die liegt bei sechs Stufen zwischen zwei Antworten. Die Summe ändert sich daher bei jeder Person.', 'A1 becomes 7 minus A1. That would be the same only for an answer exactly in the middle of the scale, which with six levels lies between two answers. The sum therefore changes for every person.'))
    ],
    hilfe: ['umpolen'], belege: ['wissen:umpolen-verfahren', 'wissen:negative-trennschaerfe-ursache']
  },
  {
    id: 'um-dichotom', thema: 'daten',
    tabelle: tab('um-dichotom', [P('Fassung des Items A3', 'Version of item A3'), P('Korrelation mit der Summe der übrigen Items', 'Correlation with the sum of the other items')], QUELLE_BFI, P('Korrelation von A3 mit den übrigen vier Items (A1 umgepolt)', 'Correlation of A3 with the other four items (A1 reverse-coded)')),
    stamm: P('Das Item A3 hat sechs Antwortstufen. Die Tabelle zeigt seine Korrelation mit der Summe der übrigen Items vor und nach dem Zusammenfassen zu zwei Gruppen. Was zeigt der Vergleich?',
      'Item A3 has six answer levels. The table shows its correlation with the sum of the other items before and after combining it into two groups. What does the comparison show?'),
    antworten: [
      a(P(`Das Zusammenfassen verschenkt Information: Die Korrelation sinkt von ${zd('ud_r6', 3)} auf ${zd('ud_r2', 3)}`, `Combining wastes information: the correlation drops from ${ze('ud_r6', 3)} to ${ze('ud_r2', 3)}`),
        P('Items mit mehreren Antwortstufen sollten nicht dichotomisiert werden, weil das Information verschenkt und verzerrt. Ein Teil des Zusammenhangs mit dem Rest der Skala geht verloren.',
          'Items with several answer levels should not be dichotomised because that wastes information and distorts. Part of the relationship with the rest of the scale is lost.'), true),
      a(P('Die zwei Gruppen vereinfachen die Auswertung ohne Verlust, die Korrelation bleibt gleich hoch', 'The two groups simplify the analysis without loss, the correlation stays equally high'),
        P(`Sie bleibt nicht gleich, sondern fällt von ${zd('ud_r6', 3)} auf ${zd('ud_r2', 3)}.`, `It does not stay the same but falls from ${ze('ud_r6', 3)} to ${ze('ud_r2', 3)}.`)),
      a(P('Die Korrelation steigt, weil zwei Gruppen klarer trennen als sechs feine Stufen', 'The correlation rises because two groups separate more clearly than six fine levels'),
        P(`Sie sinkt (${zd('ud_r6', 3)} auf ${zd('ud_r2', 3)}). Zwei Gruppen ersetzen die feinen Abstufungen durch ein grobes Entweder-oder.`, `It falls (${ze('ud_r6', 3)} to ${ze('ud_r2', 3)}). Two groups replace the fine gradations with a coarse either-or.`))
    ],
    hilfe: ['klassen-bilden', 'likert-skala'], belege: ['wissen:stufenitems-nicht-dichotomisieren']
  },

  // ---- Fehlende Werte ----
  {
    id: 'fw-code', thema: 'daten', fall: 'fw-ozon',
    stamm: P(`Bei Ozon fehlen an ${zn('fo_na')} von ${zn('fo_n')} Tagen die Messungen, die Lücken stehen als 999 in der Spalte. Warum zeigt die Tabelle bei „als 999 gezählt“ einen so hohen Mittelwert?`,
      `Ozone measurements are missing on ${zn('fo_na')} of ${zn('fo_n')} days, and the gaps are entered as 999 in the column. Why does the table show such a high mean for "counted as 999"?`),
    antworten: [
      a(P('Der Code 999 ist nicht als fehlend festgelegt und zählt wie ein Messwert', 'The code 999 is not defined as missing and counts like a measured value'),
        P(`Fehlende Werte werden oft mit Zahlen außerhalb des Wertebereichs gekennzeichnet, und die Software muss diese Zahl als fehlend kennen. Sonst geht 999 an ${zn('fo_na')} Tagen als Messwert ein: ${zd('fo_999', 2)} gegen ${zd('fo_aus', 2)}.`,
          `Missing values are often marked with numbers outside the range of values, and the software has to know this number as missing. Otherwise 999 enters as a measured value on ${zn('fo_na')} days: ${ze('fo_999', 2)} against ${ze('fo_aus', 2)}.`), true),
      a(P('Das Ozon war an diesen Tagen tatsächlich sehr hoch, deshalb fehlt die Messung', 'Ozone really was very high on these days, which is why the measurement is missing'),
        P('Die 999 ist ein Platzhalter und keine Messung. Aus ihr folgt nichts über das Ozon an diesen Tagen.', 'The 999 is a placeholder and not a measurement. Nothing follows from it about the ozone on those days.')),
      a(P('Der Mittelwert wird durch die größere Zahl der Tage von 153 so hoch', 'The mean becomes so high through the larger number of days, 153'),
        P(`Mehr Tage allein erhöhen den Mittelwert nicht auf mehr als das Sechsfache. Der Platzhalter 999 geht ${zn('fo_na')}-mal als Messwert ein.`, `More days alone do not raise the mean to more than six times. The placeholder 999 enters ${zn('fo_na')} times as a measured value.`))
    ],
    hilfe: ['fehlendcode', 'fehlende-werte'], belege: ['wissen:rasch1-fehlendcodes']
  },
  {
    id: 'fw-null', thema: 'daten', fall: 'fw-ozon',
    stamm: P('Dieselbe Tabelle zeigt bei „durch 0 ersetzt“ einen kleineren Mittelwert als bei „ausgelassen“. Was ist der Grund?', 'The same table shows a smaller mean for "replaced by 0" than for "left out". What is the reason?'),
    antworten: [
      a(P('Null ist ein Messwert: Lücken gelten nun als Tage ohne Ozon, das senkt den Mittelwert', 'Zero is a measured value: the gaps now count as days without ozone, which lowers the mean'),
        P(`Die 0 bedeutet, dass etwas den Wert 0 hat, nicht dass es keinen Wert hat. Fehlende Werte durch 0 zu ersetzen ist nahezu immer falsch; hier sinkt der Mittelwert von ${zd('fo_aus', 2)} auf ${zd('fo_0', 2)}.`,
          `The 0 means that something has the value 0, not that it has no value. Replacing missing values with 0 is almost always wrong; here the mean falls from ${ze('fo_aus', 2)} to ${ze('fo_0', 2)}.`), true),
      a(P('Die Rechnung nutzt weniger Tage, deshalb ist der Mittelwert kleiner als bei „ausgelassen“', 'The calculation uses fewer days, which is why the mean is smaller than for "left out"'),
        P(`Es sind mehr Tage (${zn('fo_n')} statt ${zn('fo_nv')}) im Nenner, nicht weniger. Die ${zn('fo_na')} zusätzlichen Werte sind erfundene Nullen.`, `There are more days (${zn('fo_n')} instead of ${zn('fo_nv')}) in the denominator, not fewer. The ${zn('fo_na')} additional values are invented zeros.`)),
      a(P('Das Programm erkennt die 0 als Platzhalter für fehlend und rechnet deshalb anders als sonst', 'The program recognises the 0 as a placeholder for missing and therefore calculates differently'),
        P(`Dann wäre der Mittelwert wie bei „ausgelassen“ ${zd('fo_aus', 2)}. Bei ${zd('fo_0', 2)} zählen die ${zn('fo_na')} Nullen als Messwerte.`, `Then the mean would be ${ze('fo_aus', 2)} as for "left out". At ${ze('fo_0', 2)} the ${zn('fo_na')} zeros count as measured values.`))
    ],
    hilfe: ['fehlende-werte', 'fehlendcode'], belege: ['wissen:dormann-na-nicht-null', 'wissen:rasch1-fehlendcodes']
  },
  {
    id: 'fw-mehrfach', thema: 'daten', fall: 'fw-ozon', mehrfach: true,
    stamm: P('Welche Aussagen zur Tabelle der Ozon-Mittelwerte stimmen? Mehrere können stimmen.', 'Which statements about the table of ozone means are correct? Several may be correct.'),
    antworten: [
      a(P(`Beim Auslassen der Lücken gehen ${zn('fo_nv')} der ${zn('fo_n')} Tage in den Mittelwert ein`, `When the gaps are left out, ${zn('fo_nv')} of the ${zn('fo_n')} days enter the mean`),
        P(`${zn('fo_n')} Tage minus ${zn('fo_na')} Tage mit Lücke bleiben ${zn('fo_nv')} Tage.`, `${zn('fo_n')} days minus ${zn('fo_na')} days with a gap leave ${zn('fo_nv')} days.`), true),
      a(P(`Der Mittelwert ${zd('fo_999', 2)} entsteht, weil ${zn('fo_na')}-mal der Platzhalter 999 als Messwert zählt`, `The mean ${ze('fo_999', 2)} arises because the placeholder 999 counts as a measured value ${zn('fo_na')} times`),
        P('Der Platzhalter geht wie jede andere Zahl in die Summe ein, wenn er nicht als fehlend festgelegt ist.', 'The placeholder enters the sum like any other number if it is not defined as missing.'), true),
      a(P('Das Ersetzen durch 0 lässt den Mittelwert unverändert, weil 0 für „nichts“ steht', 'Replacing with 0 leaves the mean unchanged because 0 stands for "nothing"'),
        P(`Der Mittelwert fällt von ${zd('fo_aus', 2)} auf ${zd('fo_0', 2)}. Eine 0 ist ein gemessener Wert und kein leeres Feld.`, `The mean falls from ${ze('fo_aus', 2)} to ${ze('fo_0', 2)}. A 0 is a recorded value and not an empty cell.`)),
      a(P('Für Lücken sollte ein Code gewählt werden, der innerhalb der möglichen Messwerte liegt', 'For gaps a code should be chosen that lies within the possible measured values'),
        P('Codes für fehlende Werte liegen außerhalb des Wertebereichs, damit sie nicht mit echten Werten verwechselt werden und leichter auffallen.', 'Codes for missing values lie outside the range of values so that they are not confused with real values and are easier to spot.'))
    ],
    hilfe: ['fehlendcode', 'fehlende-werte'], belege: ['wissen:rasch1-fehlendcodes', 'wissen:dormann-na-nicht-null']
  },
  {
    id: 'fw-zeilen', thema: 'daten',
    tabelle: tab('fw-zeilen', [P('Auswertung', 'Analysis'), P('Tage', 'Days')], QUELLE_OZON, P('Wie viele der 153 Tage in die Rechnung eingehen', 'How many of the 153 days enter the calculation')),
    stamm: P(`Für eine Regression von Ozon auf Sonnenstrahlung, Wind und Temperatur liegen ${zn('fz_tage')} Tage vor. Die Tabelle zeigt, wie viele Tage eingehen. Was erklärt die Zahl ${zn('fz_beide')}?`,
      `For a regression of ozone on solar radiation, wind and temperature there are ${zn('fz_tage')} days. The table shows how many days enter. What explains the number ${zn('fz_beide')}?`),
    antworten: [
      a(P(`Tage mit fehlendem Ozon oder fehlender Sonnenstrahlung fallen weg, ${zn('fz_beide')} Tage haben beides`, `Days with missing ozone or solar radiation drop out; ${zn('fz_beide')} days have both`),
        P(`Jede Zeile mit fehlendem Wert in einer benutzten Variablen wird ausgenommen. Ozon fehlt an ${zn('fo_na')} Tagen, Sonnenstrahlung an ${zn('fz_so_na')}; an ${zn('fz_ueber')} Tagen fehlt beides, daher bleiben ${zn('fz_tage')} minus ${zn('fo_na')} minus ${zn('fz_so_na')} plus ${zn('fz_ueber')} gleich ${zn('fz_beide')}.`,
          `Every row with a missing value in a variable used is excluded. Ozone is missing on ${zn('fo_na')} days, solar radiation on ${zn('fz_so_na')}; both are missing on ${zn('fz_ueber')} days, so ${zn('fz_tage')} minus ${zn('fo_na')} minus ${zn('fz_so_na')} plus ${zn('fz_ueber')} equals ${zn('fz_beide')} remain.`), true),
      a(P(`Das Programm zieht für die Rechnung ${zn('fz_beide')} Tage zufällig aus den Daten, um Rechenzeit zu sparen`, `The program draws ${zn('fz_beide')} days at random from the data for the calculation to save computing time`),
        P('Die Auswahl ist nicht zufällig, sondern ergibt sich aus den Lücken: Es fallen genau die Tage weg, an denen ein benutzter Wert fehlt.', 'The selection is not random but follows from the gaps: exactly the days on which a variable used is missing drop out.')),
      a(P(`Die Lücken werden durch Mittelwerte ersetzt, darum gehen ${zn('fz_beide')} Tage unverändert in die Rechnung ein`, `The gaps are replaced by means, so ${zn('fz_beide')} days enter the calculation unchanged`),
        P(`Dann gingen alle ${zn('fz_tage')} Tage in die Rechnung ein. Die Zahl ist kleiner, weil Tage mit Lücke ausgelassen wurden.`, `Then all ${zn('fz_tage')} days would enter the calculation. The number is smaller because days with a gap were left out.`))
    ],
    hilfe: ['fehlende-werte', 'daten-check'], belege: ['wissen:dormann-na-nicht-null']
  },

  // ---- Ausreißer ----
  {
    id: 'ar-boxplot', thema: 'daten',
    tabelle: tab('ar-boxplot', [P('Kennzahl', 'Statistic'), P('Wert', 'Value')], QUELLE_OZON, P('Boxplot des Ozons: Kennzahlen und Zaun', 'Boxplot of ozone: statistics and fence')),
    stamm: P(`Angenommen, Werte über dem 3. Quartil plus ${zd('ab_zaunfaktor', 1)}-fachem Interquartilsabstand werden im Boxplot einzeln eingezeichnet. Zwei Ozonwerte (135 und ${zn('ab_max')}) liegen über dem Zaun. Was folgt daraus?`,
      `Suppose values above the third quartile plus ${ze('ab_zaunfaktor', 1)} times the interquartile range are drawn individually in the boxplot. Two ozone values (135 and ${zn('ab_max')}) lie above the fence. What follows?`),
    antworten: [
      a(P('Sie fallen auf und werden geprüft; gelöscht wird nur bei einem Mess- oder Erfassungsfehler', 'They stand out and are checked; they are deleted only for a measurement or recording error'),
        P('Punkte außerhalb der Whisker sind nicht automatisch Ausreißer und dürfen nicht routinemäßig gelöscht werden. Man entfernt Beobachtungen nur bei wahrscheinlichem Fehler und berichtet, wie verfahren wurde.',
          'Points outside the whiskers are not automatically outliers and must not be deleted routinely. Observations are removed only when an error is likely, and how they were handled is reported.'), true),
      a(P(`Sie sind Ausreißer und werden sofort gelöscht, weil sie über dem Zaun von ${zd('ab_zaun', 3)} liegen und stören`, `They are outliers and are deleted at once because they lie above the fence of ${ze('ab_zaun', 3)}`),
        P('Der Zaun ist eine Konvention zum Markieren, kein Beweis für einen Fehler. Hohe Ozonwerte können echt sein.', 'The fence is a convention for marking, not proof of an error. High ozone values can be genuine.')),
      a(P('Sie werden durch den Mittelwert der übrigen Tage ersetzt, damit der Boxplot ruhiger und lesbarer aussieht', 'They are replaced by the mean of the other days so that the boxplot looks calmer and tidier'),
        P('Erfundene Werte verfälschen die Daten; einzelne Werte werden nicht passend gemacht. Bei schiefen Daten helfen eine Transformation aller Werte (zum Beispiel Logarithmus) oder eine Verteilung, die bei großen Mittelwerten mehr Streuung erlaubt (zum Beispiel gamma).', 'Invented values falsify the data; single values are not adjusted to fit. For skewed data, transforming all values (for example a logarithm) or a distribution that allows more variation at large means (for example gamma) helps.'))
    ],
    hilfe: ['ausreisser-regel', 'grubbs'], belege: ['wissen:zuur10-ausreisser']
  },
  {
    id: 'ar-hebel', thema: 'daten', fall: 'ar-hebel',
    stamm: P(`Angenommen, ein Hebelwert über 2(k+1)/n gilt als hoch (hier ${zd('ah_grenze', 3)}) und ein Cook-Abstand ab ${zd('ah_cook', 1)} als auffällig. Was gilt für den Lincoln Continental in der Tabelle?`,
      `Suppose a leverage above 2(k+1)/n counts as high (here ${ze('ah_grenze', 3)}) and a Cook's distance from ${ze('ah_cook', 1)} as conspicuous. What holds for the Lincoln Continental in the table?`),
    antworten: [
      a(P('Er hat einen hohen Hebel, aber ein kleines Residuum; sein Einfluss auf die Gerade bleibt klein', 'It has a high leverage but a small residual; its influence on the line stays small'),
        P(`Der Einfluss wächst mit Residuum und Hebel zusammen. Der Hebel ${zd('ah_h_l', 3)} liegt über ${zd('ah_grenze', 3)}, das Residuum ist mit ${zd('ah_r_l', 2)} klein, der Cook-Abstand ${zd('ah_d_l', 3)} weit unter ${zd('ah_cook', 1)}.`,
          `Influence grows with residual and leverage together. The leverage ${ze('ah_h_l', 3)} lies above ${ze('ah_grenze', 3)}, the residual is small at ${ze('ah_r_l', 2)}, the Cook's distance ${ze('ah_d_l', 3)} is far below ${ze('ah_cook', 1)}.`), true),
      a(P('Er hat den größten Hebel und ist daher der einflussreichste Punkt, der die Gerade am stärksten verzerrt', 'It has the largest leverage and is therefore the most influential point, distorting the line the most'),
        P(`Der Chrysler Imperial hat mit ${zd('ah_d_c', 3)} den größten Cook-Abstand, obwohl sein Hebel kleiner ist (${zd('ah_h_c', 3)}). Der Hebel allein entscheidet nicht.`,
          `The Chrysler Imperial has the largest Cook's distance at ${ze('ah_d_c', 3)} although its leverage is smaller (${ze('ah_h_c', 3)}). Leverage alone does not decide.`)),
      a(P('Er ist unauffällig, weil sein Residuum klein ist, und der Hebel spielt dafür keine Rolle', 'It is inconspicuous because its residual is small, and leverage plays no role in that'),
        P('Der Hebel spielt eine Rolle: Er zeigt, dass der Punkt die Gerade zu sich ziehen könnte. Nur zusammen mit dem kleinen Residuum bleibt der Einfluss klein.', 'Leverage does play a role: it shows that the point could pull the line towards itself. Only together with the small residual does the influence stay small.'))
    ],
    hilfe: ['cooks-distanz', 'ausreisser-regel'], belege: ['wissen:reg-ausreisser-hebel', 'wissen:kohn-hebelwerte-cook']
  },
  {
    id: 'ar-mehrfach', thema: 'daten', fall: 'ar-hebel', mehrfach: true,
    stamm: P(`Angenommen, ein Cook-Abstand ab ${zd('ah_cook', 1)} gilt als auffällig. Welche Aussagen zur Tabelle der drei Wagen stimmen? Mehrere können stimmen.`, `Suppose a Cook's distance of ${ze('ah_cook', 1)} or more counts as conspicuous. Which statements about the table of the three cars are correct? Several may be correct.`),
    antworten: [
      a(P(`Beim Chrysler Imperial sind Hebel und Residuum groß, der Cook-Abstand ${zd('ah_d_c', 3)} liegt über ${zd('ah_cook', 1)}`, `For the Chrysler Imperial leverage and residual are large; the Cook's distance ${ze('ah_d_c', 3)} lies above ${ze('ah_cook', 1)}`),
        P('Der Einfluss wächst mit Residuum und Hebel zusammen; beide sind hier groß.', 'Influence grows with residual and leverage together; both are large here.'), true),
      a(P('Der Hebelwert hängt nur von der Lage des x-Werts ab, nicht vom y-Wert', 'The leverage depends only on the position of the x value, not on the y value'),
        P('Der Hebelwert wächst mit dem Abstand des x-Werts vom Mittelwert von x. Lincoln Continental und Chrysler Imperial haben die größten Gewichte und die größten Hebel.', 'The leverage grows with the distance of the x value from the mean of x. Lincoln Continental and Chrysler Imperial have the largest weights and the largest leverages.'), true),
      a(P('Der Toyota Corolla hat den größten Einfluss, weil sein Residuum am größten ist', 'The Toyota Corolla has the greatest influence because its residual is the largest'),
        P(`Sein Cook-Abstand ist ${zd('ah_d_t', 3)}, der des Chrysler Imperial ${zd('ah_d_c', 3)}. Ein Residuum allein bestimmt den Einfluss nicht, der Hebel ist beim Toyota klein (${zd('ah_h_t', 3)}).`,
          `Its Cook's distance is ${ze('ah_d_t', 3)}, that of the Chrysler Imperial ${ze('ah_d_c', 3)}. A residual alone does not determine the influence; the leverage of the Toyota is small (${ze('ah_h_t', 3)}).`)),
      a(P('Das Residuum allein verrät, ob ein Punkt die Gerade stark zu sich zieht', 'The residual alone reveals whether a point pulls the line strongly towards itself'),
        P('Das Residuum allein verrät den Ausreißer nicht: Ein Punkt mit hohem Hebel zieht die Gerade zu sich und hat dann ein kleines Residuum.', 'The residual alone does not reveal the outlier: a point with high leverage pulls the line towards itself and then has a small residual.'))
    ],
    hilfe: ['cooks-distanz', 'ausreisser-regel'], belege: ['wissen:reg-ausreisser-hebel', 'wissen:kohn-hebelwerte-cook']
  },
  {
    id: 'ar-mit-ohne', thema: 'daten',
    tabelle: tab('ar-mit-ohne', [P('Daten', 'Data'), P('B für das Gewicht', 'B for weight'), P('Standardfehler', 'Standard error'), P('R²', 'R²')], QUELLE_MT, P('Regression von Verbrauch auf Gewicht mit und ohne einen Wagen', 'Regression of fuel consumption on weight with and without one car')),
    stamm: P(`Ohne den Chrysler Imperial steigt das R² von ${zd('am_r1', 3)} auf ${zd('am_r0', 3)} (Tabelle). Soll der Wagen deshalb aus der Auswertung entfallen?`,
      `Without the Chrysler Imperial R² rises from ${ze('am_r1', 3)} to ${ze('am_r0', 3)} (table). Should the car therefore be dropped from the analysis?`),
    antworten: [
      a(P('Nein, gelöscht wird nur bei einem Erfassungsfehler; sonst werden beide Ergebnisse berichtet', 'No, delete only for a recording error; otherwise both results are reported'),
        P(`Ausreißer werden nicht automatisch gelöscht. Löschen nur bei Erfassungsfehler oder einem Ereignis außerhalb des Untersuchungsgegenstands; Ergebnisse mit und ohne berichten und dokumentieren. Hier ändert sich B von ${zd('am_b1', 3)} auf ${zd('am_b0', 3)}.`,
          `Outliers are not deleted automatically. Delete only for a recording error or an event outside the subject of the study; report and document results with and without. Here B changes from ${ze('am_b1', 3)} to ${ze('am_b0', 3)}.`), true),
      a(P('Ja, ein höheres R² zeigt, dass das Modell ohne den Wagen die passenderen Daten verwendet und besser ist', 'Yes, a higher R² shows that the model without the car uses the more suitable data'),
        P('Ein höheres R² ist kein Grund zum Löschen; es entsteht auch, wenn ein unbequemer Punkt wegfällt. Entscheidend ist, ob ein Fehler oder ein fremdes Ereignis vorliegt.', 'A higher R² is no reason to delete; it also arises when an inconvenient point disappears. What matters is whether there is an error or an unrelated event.')),
      a(P('Ja, aber ohne Hinweis im Bericht, damit die Darstellung übersichtlich und knapp bleibt', 'Yes, but without a note in the report so that the presentation stays tidy and short'),
        P('Eine Löschung muss dokumentiert werden, und die Ergebnisse mit und ohne den Punkt gehören in den Bericht.', 'A deletion has to be documented, and the results with and without the point belong in the report.'))
    ],
    hilfe: ['ausreisser-regel', 'cooks-distanz'], belege: ['wissen:reg-ausreisser-umgang', 'wissen:zuur10-ausreisser']
  }
];
