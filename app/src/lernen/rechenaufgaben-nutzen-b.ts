/**
 * Rechenaufgaben der übrigen Einheiten aus Stufe 4 („nutzen“, 09.11.2026): Lücken auffüllen (Mittelwert-Imputation), getrimmtes und winsorisiertes Mittel,
 * standardisierte Mittelwertdifferenz vor und nach dem Abgleich, Rückrechnen über die Kalibriergerade, Referenzbereich (Rangmethode, Typ 6) und Zeilenprofile einer Tabelle.
 * Aufbau und Regeln wie in `rechenaufgaben-vv.ts`; alle Zahlen sind erfunden und mit dem Taschenrechner lösbar.
 * Die Lösung rechnet die App mit der eigenen Formel in `bau`. Sollwerte stehen hier nie: Der Wächter `rechenaufgaben.test.ts` liest sie über `rechenaufgaben-nutzen-b.soll.ts`
 * aus `lib/testdaten/ueben-erwartet-nutzen-b.json`; die rechnet ein Prüfer in R auf anderem Weg (Auftrag: `docs/nutzen/RECHENAUFGABEN-NUTZEN-B-AUFTRAG.md`).
 */
import { P } from '../i18n/laufzeit';
import { bau, mittel, median, quadratsumme, summe, type Rechenaufgabe } from './rechenaufgaben-bau';

// ---------------------------------------------------------------- 1. Lücken mit dem Mittelwert füllen
/** Sechs gültige Punktzahlen, zwei Personen ohne Angabe. */
export const DATEN_IMPUTATION = { werte: [4, 6, 7, 9, 10, 12], fehlend: 2 };
type DI = typeof DATEN_IMPUTATION;
const iMw = (d: DI) => mittel(d.werte);
const iSdVor = (d: DI) => Math.sqrt(quadratsumme(d.werte) / (d.werte.length - 1));
/** Nach dem Einsetzen des Mittelwerts: gleicher Mittelwert, gleiche Quadratsumme, aber mehr Fälle im Nenner. */
const iSdNach = (d: DI) => Math.sqrt(quadratsumme(d.werte) / (d.werte.length + d.fehlend - 1));
const iVerlust = (d: DI) => (1 - iSdNach(d) / iSdVor(d)) * 100;
const IMPUTATION = bau({
  id: 'nb-imputation',
  daten: DATEN_IMPUTATION,
  lage: P('Acht Personen sollten einen Test mit Punkten lösen. Zwei haben ihn nicht abgegeben. Ihre Lücken werden mit dem Mittelwert der sechs vorhandenen Werte gefüllt (Mittelwert-Imputation). Gerechnet wird der Mittelwert und die Standardabweichung (mit n − 1 im Nenner) vorher und nachher.',
    'Eight people were supposed to complete a test scored in points. Two did not hand it in. Their gaps are filled with the mean of the six values present (mean imputation). The mean and the standard deviation (with n − 1 in the denominator) are calculated before and after.'),
  tabelle: { titel: P('Punkte im Test', 'Test points'), kopf: [P('Person', 'Person'), P('Punkte', 'Points')],
    zeilen: [...DATEN_IMPUTATION.werte.map((w, i) => [`${i + 1}`, w]), ['7', P('fehlt', 'missing')], ['8', P('fehlt', 'missing')]] },
  schritte: [
    { id: 'mittel', stellen: 0, toleranz: 0.01, soll: iMw,
      frage: P('Wie groß ist der Mittelwert der sechs vorhandenen Werte?', 'How large is the mean of the six values present?'),
      warum: P('Der Mittelwert wird nur aus den Werten gebildet, die es gibt. Dieser Wert wird gleich in die beiden Lücken eingesetzt. Das ändert den Mittelwert der Spalte nicht mehr: Er bleibt nach dem Auffüllen gleich.',
        'The mean is formed only from the values that exist. This value is then put into the two gaps. That no longer changes the mean of the column: it stays the same after filling.'),
      tipp: P('Die sechs Werte addieren und durch 6 teilen.', 'Add the six values and divide by 6.'),
      fehler: [{ wert: d => summe(d.werte) / (d.werte.length + d.fehlend), tipp: P('Hier wurde durch 8 geteilt, als hätten die zwei Fehlenden den Wert 0. Fehlende Werte zählen nicht mit.', 'Here the division was by 8, as if the two missing people had the value 0. Missing values do not count.') }],
      weg: (d, z) => [P(`Summe: ${d.werte.map(w => z(w)).join(' + ')} = ${z(summe(d.werte))}`, `Sum: ${d.werte.map(w => z(w)).join(' + ')} = ${z(summe(d.werte))}`),
        P(`Mittelwert: ${z(summe(d.werte))} : ${z(d.werte.length)} = ${z(iMw(d), 0)}`, `Mean: ${z(summe(d.werte))} : ${z(d.werte.length)} = ${z(iMw(d), 0)}`)] },
    { id: 'sd-vorher', stellen: 2, toleranz: 0.005, soll: iSdVor,
      frage: P('Wie groß ist die Standardabweichung der sechs vorhandenen Werte? Rechnen: Wurzel aus (Summe der quadrierten Abweichungen vom Mittelwert, geteilt durch n − 1).', 'How large is the standard deviation of the six values present? Calculate: square root of (sum of the squared deviations from the mean, divided by n − 1).'),
      warum: P('Die Standardabweichung misst, wie weit die Werte im Mittel vom Mittelwert entfernt liegen. Dazu werden die Abweichungen quadriert, addiert und durch n − 1 geteilt (Varianz); die Wurzel daraus bringt sie zurück auf die Einheit der Punkte.',
        'The standard deviation measures how far the values lie from the mean on average. The deviations are squared, added and divided by n − 1 (variance); the root brings it back to the unit of the points.'),
      tipp: P('Abweichungen vom Mittelwert 8 bilden, quadrieren, addieren (die Summe ist 42), durch 5 teilen und die Wurzel ziehen.', 'Form the deviations from the mean 8, square them, add them (the sum is 42), divide by 5 and take the root.'),
      fehler: [
        { wert: d => Math.sqrt(quadratsumme(d.werte) / d.werte.length), tipp: P('Hier wurde durch n statt durch n − 1 geteilt.', 'Here the division was by n instead of n − 1.') },
        { wert: d => quadratsumme(d.werte) / (d.werte.length - 1), tipp: P('Das ist die Varianz. Die Standardabweichung ist ihre Wurzel.', 'That is the variance. The standard deviation is its root.') }
      ],
      weg: (d, z) => [P(`Quadrierte Abweichungen: ${d.werte.map(w => `(${z(w - iMw(d))})²`).join(' + ')} = ${z(quadratsumme(d.werte))}`, `Squared deviations: ${d.werte.map(w => `(${z(w - iMw(d))})²`).join(' + ')} = ${z(quadratsumme(d.werte))}`),
        P(`Standardabweichung: Wurzel aus (${z(quadratsumme(d.werte))} : ${z(d.werte.length - 1)}) = ${z(iSdVor(d), 2)}`, `Standard deviation: square root of (${z(quadratsumme(d.werte))} : ${z(d.werte.length - 1)}) = ${z(iSdVor(d), 2)}`)] },
    { id: 'sd-nachher', stellen: 2, toleranz: 0.005, soll: iSdNach,
      frage: P('Wie groß ist die Standardabweichung der Spalte, nachdem beide Lücken mit dem Mittelwert gefüllt sind (jetzt acht Werte)?', 'How large is the standard deviation of the column after both gaps are filled with the mean (now eight values)?'),
      warum: P('Die zwei eingesetzten Werte liegen genau auf dem Mittelwert und tragen nichts zur Summe der quadrierten Abweichungen bei. Im Nenner steht aber jetzt n − 1 mit n = 8. Dieselbe Summe wird durch mehr geteilt, die Streuung wirkt kleiner, als sie ist.',
        'The two inserted values lie exactly on the mean and add nothing to the sum of the squared deviations. But the denominator is now n − 1 with n = 8. The same sum is divided by more, so the spread looks smaller than it is.'),
      tipp: P('Die Summe der quadrierten Abweichungen bleibt 42. Jetzt durch 7 teilen und die Wurzel ziehen.', 'The sum of the squared deviations stays 42. Now divide by 7 and take the root.'),
      fehler: [
        { wert: d => iSdVor(d), tipp: P('Das ist die Standardabweichung von vorher. Mit acht Werten im Nenner ändert sie sich.', 'That is the standard deviation from before. With eight values in the denominator it changes.') },
        { wert: d => Math.sqrt(quadratsumme(d.werte) / (d.werte.length + d.fehlend)), tipp: P('Hier wurde durch n = 8 statt durch n − 1 = 7 geteilt.', 'Here the division was by n = 8 instead of n − 1 = 7.') }
      ],
      weg: (d, z) => [P(`Quadratsumme bleibt ${z(quadratsumme(d.werte))}, denn die zwei neuen Werte haben die Abweichung 0`, `The sum of squares stays ${z(quadratsumme(d.werte))}, because the two new values have deviation 0`),
        P(`Standardabweichung: Wurzel aus (${z(quadratsumme(d.werte))} : ${z(d.werte.length + d.fehlend - 1)}) = ${z(iSdNach(d), 2)}`, `Standard deviation: square root of (${z(quadratsumme(d.werte))} : ${z(d.werte.length + d.fehlend - 1)}) = ${z(iSdNach(d), 2)}`)] },
    { id: 'verlust', stellen: 1, toleranz: 0.1, einheit: P('%', '%'), soll: iVerlust,
      frage: P('Um wie viel Prozent ist die Standardabweichung durch das Auffüllen kleiner geworden? Rechnen: (1 − Standardabweichung nachher durch Standardabweichung vorher) mal 100.', 'By how many percent has the standard deviation become smaller through the filling? Calculate: (1 − standard deviation after divided by standard deviation before) times 100.'),
      warum: P('Die Lücken wurden mit dem Wert gefüllt, der am wenigsten streut. Dadurch sinkt die Streuung, obwohl keine neue Information hinzukam. Folgen: zu schmale Intervalle und zu kleine p-Werte. Die multiple Imputation vermeidet das, indem sie Lücken mit streuenden Werten füllt und die Unsicherheit mitrechnet.',
        'The gaps were filled with the value that varies least. The spread therefore falls although no new information came in. Consequences: intervals that are too narrow and p values that are too small. Multiple imputation avoids this by filling gaps with values that vary and accounting for the uncertainty.'),
      tipp: P('Erst das Verhältnis der beiden Standardabweichungen (nachher durch vorher), dann von 1 abziehen und mal 100.', 'First the ratio of the two standard deviations (after divided by before), then subtract from 1 and times 100.'),
      fehler: [
        { wert: d => (iSdNach(d) / iSdVor(d)) * 100, tipp: P('Das ist der Anteil, der übrig bleibt. Gefragt ist der Anteil, der verloren geht.', 'That is the share that remains. The share that is lost is asked for.') },
        { wert: d => iSdVor(d) - iSdNach(d), tipp: P('Das ist der Unterschied in Punkten. Gefragt ist er in Prozent der ursprünglichen Standardabweichung.', 'That is the difference in points. It is asked for in percent of the original standard deviation.') }
      ],
      weg: (d, z) => [P(`Verhältnis: ${z(iSdNach(d), 2)} : ${z(iSdVor(d), 2)} = ${z(iSdNach(d) / iSdVor(d), 3)}`, `Ratio: ${z(iSdNach(d), 2)} : ${z(iSdVor(d), 2)} = ${z(iSdNach(d) / iSdVor(d), 3)}`),
        P(`Verlust: (1 − ${z(iSdNach(d) / iSdVor(d), 3)}) · 100 = ${z(iVerlust(d), 1)} %`, `Loss: (1 − ${z(iSdNach(d) / iSdVor(d), 3)}) · 100 = ${z(iVerlust(d), 1)}%`)] }
  ],
  merke: P('Setzt man den Mittelwert in Lücken ein, bleibt der Mittelwert gleich, aber die Standardabweichung wird kleiner: Die eingesetzten Werte liegen im Zentrum und streuen nicht. Ergebnisse wirken dann sicherer, als sie sind. Die multiple Imputation füllt Lücken mehrfach mit streuenden Werten und rechnet die Unsicherheit mit ein.',
    'Putting the mean into gaps keeps the mean but makes the standard deviation smaller: the inserted values lie in the centre and do not vary. Results then look more certain than they are. Multiple imputation fills gaps several times with values that vary and includes the uncertainty.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Luft in New York - echte Daten mit Lücken“ öffnen und im Schritt „Wie viele Werte fehlen?“ ansehen, in welchen Spalten Werte fehlen. Unter dem Ergebnis den Little-Test rechnen und danach die Mehrfachimputation ausprobieren.',
    'Next: open the example "Air in New York - real data with gaps" and in the step "How many values are missing?" look at which columns have missing values. Run the Little test under the result and then try the multiple imputation.')
});

// ---------------------------------------------------------------- 2. Getrimmtes und winsorisiertes Mittel
/** Zehn Werte, geordnet; ein Ausreißer (49). 20 % je Seite = 2 Werte. */
export const DATEN_ROBUST = { werte: [2, 5, 6, 7, 8, 9, 10, 12, 14, 49], tr: 0.2 };
type DR = typeof DATEN_ROBUST;
const rG = (d: DR) => Math.floor(d.tr * d.werte.length);
const rS = (d: DR) => [...d.werte].sort((a, b) => a - b);
const rGetrimmt = (d: DR) => mittel(rS(d).slice(rG(d), d.werte.length - rG(d)));
const rWinsor = (d: DR) => { const s = rS(d), g = rG(d); return mittel(s.map(v => Math.min(s[s.length - g - 1]!, Math.max(s[g]!, v)))); };
const ROBUST = bau({
  id: 'nb-robust',
  daten: DATEN_ROBUST,
  lage: P('Zehn Wartezeiten in Minuten, geordnet. Ein Wert (49) liegt weit außen. Verglichen werden das gewöhnliche Mittel, der Median, das 20-%-getrimmte Mittel (je Seite 20 % der Werte weglassen, das sind bei zehn Werten zwei) und das winsorisierte Mittel (die zwei kleinsten Werte durch den dritt-kleinsten, die zwei größten durch den dritt-größten ersetzen).',
    'Ten waiting times in minutes, ordered. One value (49) lies far out. Compared are the ordinary mean, the median, the 20% trimmed mean (leave out 20% of the values on each side, which is two with ten values) and the winsorised mean (replace the two smallest values by the third smallest, the two largest by the third largest).'),
  tabelle: { titel: P('Wartezeiten in Minuten', 'Waiting times in minutes'), kopf: [P('Rang', 'Rank'), P('Minuten', 'Minutes')], zeilen: DATEN_ROBUST.werte.map((w, i) => [`${i + 1}`, w]) },
  schritte: [
    { id: 'mittel', stellen: 1, toleranz: 0.05, soll: d => mittel(d.werte),
      frage: P('Wie groß ist das gewöhnliche Mittel aller zehn Werte?', 'How large is the ordinary mean of all ten values?'),
      warum: P('Das gewöhnliche Mittel zählt jeden Wert gleich und lässt sich daher von einem einzigen Ausreißer ziehen. Ohne den Wert 49 läge es bei rund 8, mit ihm bei über 12. Ein Wert verschiebt das Mittel um mehr als vier Minuten.',
        'The ordinary mean counts every value equally and can therefore be pulled by a single outlier. Without the value 49 it would be around 8, with it above 12. One value moves the mean by more than four minutes.'),
      tipp: P('Alle zehn Werte addieren und durch 10 teilen.', 'Add all ten values and divide by 10.'),
      fehler: [{ wert: d => summe(d.werte.slice(0, 9)) / 9, tipp: P('Hier fehlt der größte Wert (49). Beim gewöhnlichen Mittel zählen alle zehn.', 'Here the largest value (49) is missing. All ten count for the ordinary mean.') }],
      weg: (d, z) => [P(`Summe: ${z(summe(d.werte))}`, `Sum: ${z(summe(d.werte))}`), P(`Mittel: ${z(summe(d.werte))} : ${z(d.werte.length)} = ${z(mittel(d.werte), 1)}`, `Mean: ${z(summe(d.werte))} : ${z(d.werte.length)} = ${z(mittel(d.werte), 1)}`)] },
    { id: 'median', stellen: 1, toleranz: 0.05, soll: d => median(d.werte),
      frage: P('Wie groß ist der Median der zehn Werte? Bei einer geraden Zahl von Werten ist es das Mittel der beiden mittleren.', 'How large is the median of the ten values? With an even number of values it is the mean of the two middle ones.'),
      warum: P('Der Median hängt nur von der Mitte der Reihe ab, nicht von der Größe der äußeren Werte. Man könnte 49 durch 490 ersetzen, der Median bliebe gleich. Das macht ihn robust, aber er nutzt auch weniger Information aus den Werten.',
        'The median depends only on the middle of the series, not on the size of the outer values. One could replace 49 by 490 and the median would stay the same. That makes it robust, but it also uses less information from the values.'),
      tipp: P('Der fünfte und der sechste Wert (8 und 9) liegen in der Mitte; davon das Mittel.', 'The fifth and the sixth value (8 and 9) are in the middle; take their mean.'),
      fehler: [{ wert: d => rS(d)[4]!, tipp: P('Das ist nur der fünfte Wert. Bei zehn Werten liegen zwei in der Mitte.', 'That is only the fifth value. With ten values two lie in the middle.') }, { wert: d => rS(d)[5]!, tipp: P('Das ist nur der sechste Wert. Bei zehn Werten liegen zwei in der Mitte.', 'That is only the sixth value. With ten values two lie in the middle.') }],
      weg: (d, z) => [P(`Mitte: ${z(rS(d)[4]!)} und ${z(rS(d)[5]!)}`, `Middle: ${z(rS(d)[4]!)} and ${z(rS(d)[5]!)}`), P(`Median: (${z(rS(d)[4]!)} + ${z(rS(d)[5]!)}) : 2 = ${z(median(d.werte), 1)}`, `Median: (${z(rS(d)[4]!)} + ${z(rS(d)[5]!)}) : 2 = ${z(median(d.werte), 1)}`)] },
    { id: 'getrimmt', stellen: 2, toleranz: 0.005, soll: rGetrimmt,
      frage: P('Wie groß ist das 20-%-getrimmte Mittel? Die zwei kleinsten und die zwei größten Werte weglassen und die übrigen sechs mitteln.', 'How large is the 20% trimmed mean? Leave out the two smallest and the two largest values and take the mean of the remaining six.'),
      warum: P('Das getrimmte Mittel schneidet an beiden Enden gleich viele Werte ab, hier 2 von 10 je Seite. Der Ausreißer fällt weg, aber auch der kleinste Wert. Das Ergebnis liegt nahe am Median, nutzt aber mehr Werte. In Statable ist das die Voreinstellung der robusten Verfahren.',
        'The trimmed mean cuts off the same number of values at both ends, here 2 of 10 on each side. The outlier drops out, and so does the smallest value. The result lies close to the median but uses more values. In Statable this is the default of the robust procedures.'),
      tipp: P('Übrig bleiben 6, 7, 8, 9, 10 und 12. Addieren und durch 6 teilen.', 'What remains is 6, 7, 8, 9, 10 and 12. Add and divide by 6.'),
      fehler: [
        { wert: d => summe(rS(d).slice(1, 9)) / 8, tipp: P('Hier wurde nur ein Wert je Seite abgeschnitten (10 %). Bei 20 % von zehn Werten sind es zwei je Seite.', 'Here only one value was cut off on each side (10%). With 20% of ten values it is two on each side.') },
        { wert: d => summe(rS(d).slice(rG(d), d.werte.length - rG(d))) / d.werte.length, tipp: P('Hier wurde durch 10 geteilt, obwohl nur 6 Werte übrig sind.', 'Here the division was by 10 although only 6 values remain.') }
      ],
      weg: (d, z) => [P(`Übrig: ${rS(d).slice(rG(d), d.werte.length - rG(d)).map(w => z(w)).join(', ')}`, `Remaining: ${rS(d).slice(rG(d), d.werte.length - rG(d)).map(w => z(w)).join(', ')}`),
        P(`Getrimmtes Mittel: ${z(summe(rS(d).slice(rG(d), d.werte.length - rG(d))))} : ${z(d.werte.length - 2 * rG(d))} = ${z(rGetrimmt(d), 2)}`, `Trimmed mean: ${z(summe(rS(d).slice(rG(d), d.werte.length - rG(d))))} : ${z(d.werte.length - 2 * rG(d))} = ${z(rGetrimmt(d), 2)}`)] },
    { id: 'winsor', stellen: 1, toleranz: 0.05, soll: rWinsor,
      frage: P('Wie groß ist das winsorisierte Mittel? Die zwei kleinsten Werte werden durch 6 ersetzt, die zwei größten durch 12; dann werden alle zehn Werte gemittelt.', 'How large is the winsorised mean? The two smallest values are replaced by 6, the two largest by 12; then all ten values are averaged.'),
      warum: P('Beim Winsorisieren bleiben alle zehn Werte in der Rechnung, die äußeren werden nur auf die Grenze zurückgezogen. Das Ergebnis bleibt ein Mittel aus zehn Werten. Es liegt hier etwas höher als das getrimmte Mittel, weil die obere Grenze (12) weiter von der Mitte entfernt ist als die untere (6).',
        'With winsorising all ten values stay in the calculation, the outer ones are only pulled back to the limit. The result remains a mean of ten values. Here it lies slightly above the trimmed mean because the upper limit (12) is further from the middle than the lower one (6).'),
      tipp: P('Die zehn Werte lauten dann 6, 6, 6, 7, 8, 9, 10, 12, 12, 12. Addieren und durch 10 teilen.', 'The ten values are then 6, 6, 6, 7, 8, 9, 10, 12, 12, 12. Add and divide by 10.'),
      fehler: [
        { wert: d => rGetrimmt(d), tipp: P('Das ist das getrimmte Mittel, bei dem die Werte wegfallen. Beim Winsorisieren werden sie ersetzt und zählen mit.', 'That is the trimmed mean, where the values drop out. With winsorising they are replaced and still count.') },
        { wert: d => { const s = rS(d); return mittel(s.map((v, i) => (i === 0 ? s[1]! : i === s.length - 1 ? s[s.length - 2]! : v))); }, tipp: P('Hier wurde nur je ein Wert ersetzt. Bei 20 % sind es zwei je Seite.', 'Here only one value on each side was replaced. With 20% it is two on each side.') }
      ],
      weg: (d, z) => { const s = rS(d), g = rG(d); const w = s.map(v => Math.min(s[s.length - g - 1]!, Math.max(s[g]!, v)));
        return [P(`Neue Werte: ${w.map(v => z(v)).join(', ')}`, `New values: ${w.map(v => z(v)).join(', ')}`), P(`Winsorisiertes Mittel: ${z(summe(w))} : ${z(w.length)} = ${z(rWinsor(d), 1)}`, `Winsorised mean: ${z(summe(w))} : ${z(w.length)} = ${z(rWinsor(d), 1)}`)]; } }
  ],
  merke: P('Das gewöhnliche Mittel folgt Ausreißern, der Median und das getrimmte Mittel kaum. Trimmen lässt die äußeren Werte weg, Winsorisieren zieht sie auf die Grenze zurück. Beides ändert, was verglichen wird, und gehört in den Bericht. Robust heißt nicht automatisch besser: Gehören die extremen Werte zur Fragestellung, beantwortet das getrimmte Mittel eine andere Frage.',
    'The ordinary mean follows outliers, the median and the trimmed mean hardly. Trimming leaves the outer values out, winsorising pulls them back to the limit. Both change what is compared and belong in the report. Robust does not automatically mean better: if the extreme values belong to the research question, the trimmed mean answers a different question.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Arbeitsprogramm: Wirkt es? - echte Studie“ öffnen, im Schritt „Verdienen Teilnehmende mehr?“ unter dem Ergebnis bei „Annahme einer Normalverteilung“ die Wahl „Robust (getrimmte Mittel)“ nehmen und das getrimmte Mittel mit dem gewöhnlichen vergleichen.',
    'Next: open the example "Job programme: does it work? - real study", in the step "Do participants earn more?" under the result choose "Robust (trimmed means)" at "Assumption of a normal distribution" and compare the trimmed mean with the ordinary one.')
});

// ---------------------------------------------------------------- 3. Standardisierte Mittelwertdifferenz vor und nach dem Abgleich
/** Ein Merkmal (Alter): Behandelte 40 Jahre (SD 8), Kontrollen vor dem Abgleich 32, nach dem Abgleich 38,8. Nenner: SD der Behandelten vor dem Abgleich (wie Statable, MatchIt, cobalt). */
export const DATEN_MATCHING = { mB: 40, sdB: 8, mKvor: 32, mKnach: 38.8 };
type DM = typeof DATEN_MATCHING;
const mVor = (d: DM) => (d.mB - d.mKvor) / d.sdB, mNach = (d: DM) => (d.mB - d.mKnach) / d.sdB, mAbnahme = (d: DM) => (1 - mNach(d) / mVor(d)) * 100;
const MATCHING = bau({
  id: 'nb-matching',
  daten: DATEN_MATCHING,
  lage: P('Ein Programm wurde nicht zufällig zugeteilt. Behandelte sind im Mittel 40 Jahre alt (Standardabweichung 8), die Kontrollen vor dem Abgleich 32. Nach dem Abgleich über den Propensity Score (Matching) sind die ausgewählten Kontrollen im Mittel 38,8 Jahre alt. Die standardisierte Mittelwertdifferenz (SMD) ist der Unterschied der Mittelwerte geteilt durch die Standardabweichung der Behandelten vor dem Abgleich.',
    'A programme was not assigned at random. Treated people are 40 years old on average (standard deviation 8), the controls before matching 32. After matching on the propensity score the selected controls are 38.8 years old on average. The standardised mean difference (SMD) is the difference of the means divided by the standard deviation of the treated before matching.'),
  tabelle: { titel: P('Alter in Jahren', 'Age in years'), kopf: [P('Merkmal', 'Variable'), P('Behandelte: Mittel', 'Treated: mean'), P('Behandelte: Standardabweichung', 'Treated: standard deviation'), P('Kontrollen vor dem Abgleich', 'Controls before matching'), P('Kontrollen nach dem Abgleich', 'Controls after matching')],
    zeilen: [[P('Alter', 'Age'), DATEN_MATCHING.mB, DATEN_MATCHING.sdB, DATEN_MATCHING.mKvor, DATEN_MATCHING.mKnach]] },
  schritte: [
    { id: 'vorher', stellen: 2, toleranz: 0.005, soll: mVor,
      frage: P('Wie groß ist die SMD für das Alter vor dem Abgleich? Rechnen: (Mittel der Behandelten minus Mittel der Kontrollen) geteilt durch die Standardabweichung der Behandelten.', 'How large is the SMD for age before matching? Calculate: (mean of the treated minus mean of the controls) divided by the standard deviation of the treated.'),
      warum: P('Die SMD misst den Unterschied in Standardabweichungen, also unabhängig von der Einheit des Merkmals. Dadurch lassen sich Merkmale wie Alter und Einkommen vergleichen. Ein Wert von 1 heißt: Die Gruppen liegen eine ganze Standardabweichung auseinander, das ist sehr viel.',
        'The SMD measures the difference in standard deviations, so independently of the unit of the variable. This makes variables such as age and income comparable. A value of 1 means: the groups are a whole standard deviation apart, which is a lot.'),
      tipp: P('40 minus 32, dann durch 8 teilen.', '40 minus 32, then divide by 8.'),
      fehler: [{ wert: d => d.mB - d.mKvor, tipp: P('Das ist der Unterschied in Jahren. Die SMD teilt ihn noch durch die Standardabweichung.', 'That is the difference in years. The SMD also divides it by the standard deviation.') },
        { wert: d => (d.mB - d.mKvor) / (d.sdB * d.sdB), tipp: P('Hier wurde durch die Varianz geteilt. Geteilt wird durch die Standardabweichung.', 'Here the division was by the variance. The division is by the standard deviation.') }],
      weg: (d, z) => [P(`SMD vorher: (${z(d.mB)} − ${z(d.mKvor)}) : ${z(d.sdB)} = ${z(d.mB - d.mKvor)} : ${z(d.sdB)} = ${z(mVor(d), 2)}`, `SMD before: (${z(d.mB)} − ${z(d.mKvor)}) : ${z(d.sdB)} = ${z(d.mB - d.mKvor)} : ${z(d.sdB)} = ${z(mVor(d), 2)}`)] },
    { id: 'nachher', stellen: 2, toleranz: 0.005, soll: mNach,
      frage: P('Wie groß ist die SMD für das Alter nach dem Abgleich? Derselbe Nenner (Standardabweichung der Behandelten vor dem Abgleich), jetzt mit dem Mittel der ausgewählten Kontrollen.', 'How large is the SMD for age after matching? The same denominator (standard deviation of the treated before matching), now with the mean of the selected controls.'),
      warum: P('Der Nenner bleibt derselbe, damit sich vorher und nachher vergleichen lassen. Nur das Mittel der Kontrollen hat sich geändert, weil nach ähnlichem Alter ausgewählt wurde. Oft gilt eine SMD unter 0,1 als gut ausgeglichen (Austin 2011); manche Quellen lassen bis 0,25 gelten.',
        'The denominator stays the same so that before and after can be compared. Only the mean of the controls has changed because the selection was made for similar age. An SMD below 0.1 is often regarded as well balanced (Austin 2011); some sources accept up to 0.25.'),
      tipp: P('40 minus 38,8, dann durch 8 teilen.', '40 minus 38.8, then divide by 8.'),
      fehler: [{ wert: d => d.mB - d.mKnach, tipp: P('Das ist der Unterschied in Jahren. Die SMD teilt ihn noch durch die Standardabweichung.', 'That is the difference in years. The SMD also divides it by the standard deviation.') },
        { wert: d => (d.mKnach - d.mKvor) / d.sdB, tipp: P('Hier wurde die Verschiebung der Kontrollen durch den Abgleich gerechnet. Gefragt ist der Unterschied zu den Behandelten.', 'Here the shift of the controls through the matching was calculated. The difference to the treated is asked for.') }],
      weg: (d, z) => [P(`SMD nachher: (${z(d.mB)} − ${z(d.mKnach, 1)}) : ${z(d.sdB)} = ${z(d.mB - d.mKnach, 1)} : ${z(d.sdB)} = ${z(mNach(d), 2)}`, `SMD after: (${z(d.mB)} − ${z(d.mKnach, 1)}) : ${z(d.sdB)} = ${z(d.mB - d.mKnach, 1)} : ${z(d.sdB)} = ${z(mNach(d), 2)}`)] },
    { id: 'abnahme', stellen: 0, toleranz: 0.5, einheit: P('%', '%'), soll: mAbnahme,
      frage: P('Um wie viel Prozent ist die SMD durch den Abgleich gesunken? Rechnen: (1 − SMD nachher durch SMD vorher) mal 100.', 'By how many percent has the SMD fallen through the matching? Calculate: (1 − SMD after divided by SMD before) times 100.'),
      warum: P('Der Abgleich hat den Unterschied im Alter stark verkleinert, aber nicht auf 0 gebracht. Außerdem gleicht er nur die Merkmale aus, die in den Propensity Score eingingen. Unterschiede in nicht gemessenen Merkmalen, etwa Motivation, bleiben und können das Ergebnis weiter verzerren.',
        'The matching has greatly reduced the difference in age, but not brought it to 0. Moreover it balances only the variables that entered the propensity score. Differences in variables that were not measured, such as motivation, remain and can still distort the result.'),
      tipp: P('Erst SMD nachher durch SMD vorher teilen, dann von 1 abziehen und mal 100 nehmen.', 'First divide SMD after by SMD before, then subtract from 1 and take times 100.'),
      fehler: [{ wert: d => (mNach(d) / mVor(d)) * 100, tipp: P('Das ist der Anteil, der von der SMD übrig blieb. Gefragt ist der Anteil, der verschwand.', 'That is the share of the SMD that remained. The share that disappeared is asked for.') },
        { wert: d => 1 - mNach(d) / mVor(d), tipp: P('Das ist der Anteil als Bruchzahl. Für Prozent noch mal 100.', 'That is the share as a fraction. For percent times 100.') }],
      weg: (d, z) => [P(`Verhältnis: ${z(mNach(d), 2)} : ${z(mVor(d), 2)} = ${z(mNach(d) / mVor(d), 2)}`, `Ratio: ${z(mNach(d), 2)} : ${z(mVor(d), 2)} = ${z(mNach(d) / mVor(d), 2)}`),
        P(`Abnahme: (1 − ${z(mNach(d) / mVor(d), 2)}) · 100 = ${z(mAbnahme(d), 0)} %`, `Decrease: (1 − ${z(mNach(d) / mVor(d), 2)}) · 100 = ${z(mAbnahme(d), 0)}%`)] }
  ],
  merke: P('Die SMD ist der Mittelwertunterschied in Standardabweichungen (hier der Behandelten vor dem Abgleich). Sie zeigt, wie gut der Abgleich die gemessenen Merkmale angeglichen hat. Merkmale, die nicht in den Propensity Score eingingen, gleicht er nicht aus; er ersetzt keine Zufallszuteilung und belegt keine Ursache.',
    'The SMD is the difference of means in standard deviations (here those of the treated before matching). It shows how well the matching has balanced the measured variables. Variables that did not enter the propensity score are not balanced by it; it does not replace random assignment and does not prove a cause.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Arbeitsprogramm: Wirkt es? - echte Studie“ öffnen, im Schritt „Verdienen Teilnehmende mehr?“ den Abschnitt „Gruppen vergleichbar machen (Propensity-Matching)“ öffnen und in der Tabelle „Ausgleich der Merkmale (standardisierte Differenz)“ die SMD vorher und nachher ansehen.',
    'Next: open the example "Job programme: does it work? - real study", in the step "Do participants earn more?" open the section "Make the groups comparable (propensity matching)" and look at the SMD before and after in the table "Balance of the variables (standardised difference)".')
});

// ---------------------------------------------------------------- 4. Rückrechnen über die Kalibriergerade
/** Fünf Kalibrierpunkte (Konzentration x in mg/l, Signal y), dazu das Signal einer Probe. */
export const DATEN_KALIBRIERUNG = { x: [0, 2, 4, 6, 8], y: [1, 5, 10, 13, 17], probe: 15.2 };
type DK = typeof DATEN_KALIBRIERUNG;
const kQxx = (d: DK) => quadratsumme(d.x);
const kQxy = (d: DK) => { const mx = mittel(d.x), my = mittel(d.y); return summe(d.x.map((x, i) => (x - mx) * (d.y[i]! - my))); };
const kB = (d: DK) => kQxy(d) / kQxx(d);
const kA = (d: DK) => mittel(d.y) - kB(d) * mittel(d.x);
const kX0 = (d: DK) => (d.probe - kA(d)) / kB(d);
const KALIBRIERUNG = bau({
  id: 'nb-kalibrierung',
  daten: DATEN_KALIBRIERUNG,
  lage: P('Ein Labor misst fünf Lösungen bekannter Konzentration (in mg/l) und bekommt jeweils ein Signal. Durch die Punkte wird die Kalibriergerade y = a + b · x gelegt (kleinste Quadrate). Danach hat eine Probe mit unbekannter Konzentration das Signal 15,2. Gesucht ist ihre Konzentration.',
    'A laboratory measures five solutions of known concentration (in mg/l) and gets a signal for each. The calibration line y = a + b · x is fitted through the points (least squares). A sample of unknown concentration then has the signal 15.2. Its concentration is sought.'),
  tabelle: { titel: P('Kalibrierpunkte', 'Calibration points'), kopf: [P('Konzentration (mg/l)', 'Concentration (mg/l)'), P('Signal', 'Signal')], zeilen: DATEN_KALIBRIERUNG.x.map((x, i) => [`${x}`, DATEN_KALIBRIERUNG.y[i]!]) },
  schritte: [
    { id: 'steigung', stellen: 1, toleranz: 0.05, soll: kB,
      frage: P('Wie groß ist die Steigung b der Geraden? Rechnen: Summe der Produkte (x − Mittel von x) · (y − Mittel von y), geteilt durch die Summe der quadrierten (x − Mittel von x).', 'How large is the slope b of the line? Calculate: sum of the products (x − mean of x) · (y − mean of y), divided by the sum of the squared (x − mean of x).'),
      warum: P('Die Steigung sagt, um wie viele Signaleinheiten das Signal steigt, wenn die Konzentration um 1 mg/l wächst. Sie ist die Empfindlichkeit des Verfahrens. Je steiler die Gerade bei gleicher Streuung, desto kleinere Mengen lassen sich vom Rauschen unterscheiden.',
        'The slope says by how many signal units the signal rises when the concentration grows by 1 mg/l. It is the sensitivity of the method. The steeper the line at the same scatter, the smaller the amounts that can be distinguished from the noise.'),
      tipp: P('Mittelwerte: x ist 4, y ist 9,2. Die Summe der Produkte ist 80, die Summe der quadrierten Abweichungen von x ist 40.', 'Means: x is 4, y is 9.2. The sum of the products is 80, the sum of the squared deviations of x is 40.'),
      fehler: [{ wert: d => kQxy(d), tipp: P('Das ist nur der Zähler. Er muss noch durch die Summe der quadrierten Abweichungen von x geteilt werden.', 'That is only the numerator. It still has to be divided by the sum of the squared deviations of x.') },
        { wert: d => kQxy(d) / quadratsumme(d.y), tipp: P('Hier wurde durch die Quadratsumme von y geteilt. Das wäre die Gerade mit vertauschten Achsen. Die Konzentration ist x, das Signal y.', 'Here the division was by the sum of squares of y. That would be the line with swapped axes. The concentration is x, the signal is y.') }],
      weg: (d, z) => [P(`Produkte und Quadrate: Summe der Produkte ${z(kQxy(d), 1)}, Summe der Quadrate ${z(kQxx(d), 1)}`, `Products and squares: sum of the products ${z(kQxy(d), 1)}, sum of the squares ${z(kQxx(d), 1)}`),
        P(`Steigung: ${z(kQxy(d), 1)} : ${z(kQxx(d), 1)} = ${z(kB(d), 1)}`, `Slope: ${z(kQxy(d), 1)} : ${z(kQxx(d), 1)} = ${z(kB(d), 1)}`)] },
    { id: 'achse', stellen: 1, toleranz: 0.05, soll: kA,
      frage: P('Wie groß ist der Achsenabschnitt a? Rechnen: Mittel von y minus Steigung mal Mittel von x.', 'How large is the intercept a? Calculate: mean of y minus slope times mean of x.'),
      warum: P('Die Gerade geht immer durch den Punkt (Mittel von x, Mittel von y). Aus der Steigung und diesem Punkt ergibt sich, wo sie die y-Achse schneidet. Der Achsenabschnitt ist das Signal, das die Gerade bei der Konzentration 0 erwartet (der Leerwert).',
        'The line always passes through the point (mean of x, mean of y). From the slope and this point it follows where it crosses the y axis. The intercept is the signal that the line expects at concentration 0 (the blank).'),
      tipp: P('9,2 minus 2 mal 4.', '9.2 minus 2 times 4.'),
      fehler: [{ wert: d => mittel(d.y), tipp: P('Das ist nur das Mittel der Signale. Davon muss noch die Steigung mal Mittel von x abgezogen werden.', 'That is only the mean of the signals. The slope times the mean of x still has to be subtracted.') },
        { wert: d => mittel(d.x) - kB(d) * mittel(d.y), tipp: P('Hier sind x und y vertauscht. Das Signal ist y.', 'Here x and y are swapped. The signal is y.') }],
      weg: (d, z) => [P(`Achsenabschnitt: ${z(mittel(d.y), 1)} − ${z(kB(d), 1)} · ${z(mittel(d.x))} = ${z(kA(d), 1)}`, `Intercept: ${z(mittel(d.y), 1)} − ${z(kB(d), 1)} · ${z(mittel(d.x))} = ${z(kA(d), 1)}`)] },
    { id: 'konzentration', stellen: 1, toleranz: 0.05, einheit: P('mg/l', 'mg/l'), soll: kX0,
      frage: P('Welche Konzentration hat die Probe mit dem Signal 15,2? Die Gerade wird nach x umgestellt: (Signal minus a) geteilt durch b.', 'What concentration does the sample with the signal 15.2 have? The line is rearranged for x: (signal minus a) divided by b.'),
      warum: P('Das Signal wird gemessen, die Konzentration gesucht. Darum wird die Gleichung y = a + b · x nach x aufgelöst. Das gilt nur im Bereich der Kalibrierpunkte (hier 0 bis 8 mg/l); darüber ist die Gerade nicht belegt, die Probe müsste verdünnt werden.',
        'The signal is measured, the concentration is sought. So the equation y = a + b · x is solved for x. This holds only within the range of the calibration points (here 0 to 8 mg/l); beyond it the line is not backed by data and the sample would have to be diluted.'),
      tipp: P('Erst 15,2 minus 1,2, dann durch 2 teilen.', 'First 15.2 minus 1.2, then divide by 2.'),
      fehler: [{ wert: d => d.probe / kB(d), tipp: P('Hier fehlt der Achsenabschnitt: Vom Signal muss erst der Leerwert a abgezogen werden.', 'Here the intercept is missing: the blank a has to be subtracted from the signal first.') },
        { wert: d => (d.probe - kA(d)) * kB(d), tipp: P('Hier wurde mit b multipliziert. Um nach x aufzulösen, wird durch b geteilt.', 'Here the multiplication was by b. To solve for x the division is by b.') }],
      weg: (d, z) => [P(`Konzentration: (${z(d.probe, 1)} − ${z(kA(d), 1)}) : ${z(kB(d), 1)} = ${z(d.probe - kA(d), 1)} : ${z(kB(d), 1)} = ${z(kX0(d), 1)} mg/l`, `Concentration: (${z(d.probe, 1)} − ${z(kA(d), 1)}) : ${z(kB(d), 1)} = ${z(d.probe - kA(d), 1)} : ${z(kB(d), 1)} = ${z(kX0(d), 1)} mg/l`)] }
  ],
  merke: P('Die Kalibriergerade verbindet bekannte Mengen (x) mit gemessenen Signalen (y). Eine Probe wird zurückgerechnet mit x = (y − a) : b, und zwar nur im Bereich der Kalibrierpunkte. Nachweis- und Bestimmungsgrenze folgen aus der Reststreuung und der Steigung der Geraden; sie sind etwas anderes als der Messbereich.',
    'The calibration line connects known amounts (x) with measured signals (y). A sample is calculated back with x = (y − a) : b, and only within the range of the calibration points. Limit of detection and limit of quantification follow from the residual scatter and the slope of the line; they are something different from the measuring range.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Kalibriergerade einer Flüssigkeitschromatographie“ öffnen, im Schritt „Gerade und Grenzen“ den Abschnitt „Kalibriergerade (Nachweis- und Bestimmungsgrenze)“ öffnen und die Gleichung der Geraden mit der eigenen Rechnung vergleichen.',
    'Next: open the example "Calibration line of a liquid chromatography", in the step "Line and limits" open the section "Calibration line (limit of detection and quantification)" and compare the equation of the line with your own calculation.')
});

// ---------------------------------------------------------------- 5. Referenzbereich (Rangmethode, Typ 6)
/** 59 Referenzpersonen; vom geordneten Laborwert sind die zwei kleinsten und die zwei größten Werte bekannt. */
export const DATEN_REFERENZ = { n: 59, r1: 3.1, r2: 3.5, r58: 6.8, r59: 7.2 };
type DF = typeof DATEN_REFERENZ;
const fRangU = (d: DF) => 0.025 * (d.n + 1), fRangO = (d: DF) => 0.975 * (d.n + 1);
const fUnten = (d: DF) => d.r1 + (fRangU(d) - 1) * (d.r2 - d.r1);
const fOben = (d: DF) => d.r58 + (fRangO(d) - 58) * (d.r59 - d.r58);
const REFERENZ = bau({
  id: 'nb-referenz',
  daten: DATEN_REFERENZ,
  lage: P('Ein Laborwert wurde bei 59 gesunden Referenzpersonen gemessen. Der Referenzbereich soll die mittleren 95 % der Werte enthalten, also vom 2,5. bis zum 97,5. Perzentil. Statable rechnet es mit der Rangmethode, Perzentil Typ 6: Der Rang ist p · (n + 1), liegt er zwischen zwei Werten, wird dazwischen linear gerechnet. Von den geordneten Werten sind die zwei kleinsten und die zwei größten bekannt.',
    'A laboratory value was measured in 59 healthy reference individuals. The reference range is to contain the middle 95% of the values, that is from the 2.5th to the 97.5th percentile. Statable calculates it with the rank method, percentile type 6: the rank is p · (n + 1), and if it lies between two values, the calculation is linear in between. Of the ordered values the two smallest and the two largest are known.'),
  tabelle: { titel: P('Geordnete Werte (Auszug)', 'Ordered values (extract)'), kopf: [P('Rang', 'Rank'), P('Wert', 'Value')], zeilen: [['1', DATEN_REFERENZ.r1], ['2', DATEN_REFERENZ.r2], ['58', DATEN_REFERENZ.r58], ['59', DATEN_REFERENZ.r59]] },
  schritte: [
    { id: 'rang-unten', stellen: 2, toleranz: 0.005, soll: fRangU,
      frage: P('Welcher Rang gehört zum 2,5. Perzentil? Rechnen: 0,025 mal (n + 1) mit n = 59.', 'Which rank belongs to the 2.5th percentile? Calculate: 0.025 times (n + 1) with n = 59.'),
      warum: P('Bei Typ 6 wird mit n + 1 gerechnet, weil man sich vorstellt, dass die n Werte die Lücken zwischen n + 1 gleich breiten Abschnitten der Verteilung teilen. Ein Rang von 1,5 liegt genau in der Mitte zwischen dem kleinsten und dem zweitkleinsten Wert.',
        'Type 6 uses n + 1 because the n values are imagined to divide the gaps between n + 1 equally wide sections of the distribution. A rank of 1.5 lies exactly halfway between the smallest and the second smallest value.'),
      tipp: P('59 plus 1 ist 60. Dann 0,025 mal 60.', '59 plus 1 is 60. Then 0.025 times 60.'),
      fehler: [{ wert: d => 0.025 * d.n, tipp: P('Hier wurde mit n = 59 gerechnet. Beim Typ 6 gilt n + 1.', 'Here n = 59 was used. For type 6 it is n + 1.') }, { wert: d => 0.025 * (d.n + 1) * 100, tipp: P('Das Perzentil ist 0,025 und nicht 2,5. Mit 2,5 wird der Rang hundertmal zu groß.', 'The percentile is 0.025 and not 2.5. With 2.5 the rank becomes a hundred times too large.') }],
      weg: (d, z) => [P(`Rang: 0,025 · (${z(d.n)} + 1) = 0,025 · ${z(d.n + 1)} = ${z(fRangU(d), 2)}`, `Rank: 0.025 · (${z(d.n)} + 1) = 0.025 · ${z(d.n + 1)} = ${z(fRangU(d), 2)}`)] },
    { id: 'unten', stellen: 2, toleranz: 0.005, soll: fUnten,
      frage: P('Wie groß ist die untere Grenze des Referenzbereichs? Der Rang liegt zwischen dem ersten und dem zweiten Wert: erster Wert plus Nachkommaanteil des Rangs mal Abstand zwischen den beiden Werten.', 'How large is the lower limit of the reference range? The rank lies between the first and the second value: first value plus the fractional part of the rank times the distance between the two values.'),
      warum: P('Liegt der Rang zwischen zwei Werten, wird anteilig dazwischen gerechnet. Bei Rang 1,5 ist es genau die Mitte. Ein Referenzbereich sagt nur, wo die mittleren 95 % der Gesunden liegen: Etwa 5 von 100 Gesunden liegen per Definition außerhalb, ein Wert außerhalb ist also kein Beweis für eine Krankheit.',
        'If the rank lies between two values, the calculation is proportional in between. At rank 1.5 it is exactly the middle. A reference range only says where the middle 95% of healthy people lie: about 5 in 100 healthy people lie outside by definition, so a value outside is no proof of disease.'),
      tipp: P('3,1 plus 0,5 mal (3,5 minus 3,1).', '3.1 plus 0.5 times (3.5 minus 3.1).'),
      fehler: [{ wert: d => d.r1, tipp: P('Das ist der kleinste Wert. Der Rang 1,5 liegt zwischen dem ersten und dem zweiten.', 'That is the smallest value. The rank 1.5 lies between the first and the second.') }, { wert: d => d.r2, tipp: P('Das ist der zweite Wert. Der Rang 1,5 liegt erst in der Mitte zwischen erstem und zweitem.', 'That is the second value. The rank 1.5 only lies halfway between the first and the second.') }],
      weg: (d, z) => [P(`Untere Grenze: ${z(d.r1, 1)} + ${z(fRangU(d) - 1, 2)} · (${z(d.r2, 1)} − ${z(d.r1, 1)}) = ${z(fUnten(d), 2)}`, `Lower limit: ${z(d.r1, 1)} + ${z(fRangU(d) - 1, 2)} · (${z(d.r2, 1)} − ${z(d.r1, 1)}) = ${z(fUnten(d), 2)}`)] },
    { id: 'rang-oben', stellen: 2, toleranz: 0.005, soll: fRangO,
      frage: P('Welcher Rang gehört zum 97,5. Perzentil? Rechnen: 0,975 mal (n + 1).', 'Which rank belongs to the 97.5th percentile? Calculate: 0.975 times (n + 1).'),
      warum: P('Am oberen Ende gilt dieselbe Formel mit p = 0,975. Der Rang 58,5 liegt zwischen dem 58. und dem 59. (dem größten) Wert. Bei weniger als etwa 40 Werten läge der Rang unten unter 1 oder oben über n, dann gibt es keine Grenze, ohne zu raten. Deshalb rechnet Statable die Rangmethode erst ab 39 Werten.',
        'At the upper end the same formula applies with p = 0.975. The rank 58.5 lies between the 58th and the 59th (the largest) value. With fewer than about 40 values the rank would be below 1 at the bottom or above n at the top, then there is no limit without guessing. That is why Statable calculates the rank method only from 39 values.'),
      tipp: P('0,975 mal 60.', '0.975 times 60.'),
      fehler: [{ wert: d => 0.975 * d.n, tipp: P('Hier wurde mit n = 59 gerechnet. Beim Typ 6 gilt n + 1.', 'Here n = 59 was used. For type 6 it is n + 1.') }, { wert: d => d.n, tipp: P('Das ist der Rang des größten Werts. Der obere Rang liegt bei 97,5 % von n + 1.', 'That is the rank of the largest value. The upper rank lies at 97.5% of n + 1.') }],
      weg: (d, z) => [P(`Rang: 0,975 · ${z(d.n + 1)} = ${z(fRangO(d), 2)}`, `Rank: 0.975 · ${z(d.n + 1)} = ${z(fRangO(d), 2)}`)] },
    { id: 'oben', stellen: 2, toleranz: 0.005, soll: fOben,
      frage: P('Wie groß ist die obere Grenze des Referenzbereichs? Der Rang liegt zwischen dem 58. und dem 59. Wert.', 'How large is the upper limit of the reference range? The rank lies between the 58th and the 59th value.'),
      warum: P('Wieder wird anteilig zwischen den beiden benachbarten Werten gerechnet. Der Bereich reicht dann von der unteren bis zu dieser oberen Grenze. Er beschreibt gesunde Referenzpersonen, nicht die Gesamtbevölkerung, und er gilt nur für die Gruppe (Alter, Geschlecht), aus der die Referenzpersonen stammen.',
        'Again the calculation is proportional between the two neighbouring values. The range then extends from the lower to this upper limit. It describes healthy reference individuals, not the whole population, and it applies only to the group (age, sex) from which the reference individuals come.'),
      tipp: P('6,8 plus 0,5 mal (7,2 minus 6,8).', '6.8 plus 0.5 times (7.2 minus 6.8).'),
      fehler: [{ wert: d => d.r58, tipp: P('Das ist der 58. Wert. Der Rang 58,5 liegt zwischen dem 58. und dem 59.', 'That is the 58th value. The rank 58.5 lies between the 58th and the 59th.') }, { wert: d => d.r59, tipp: P('Das ist der größte Wert. Der Rang 58,5 liegt noch davor, in der Mitte zwischen dem 58. und dem 59.', 'That is the largest value. The rank 58.5 lies before it, halfway between the 58th and the 59th.') }],
      weg: (d, z) => [P(`Obere Grenze: ${z(d.r58, 1)} + ${z(fRangO(d) - 58, 2)} · (${z(d.r59, 1)} − ${z(d.r58, 1)}) = ${z(fOben(d), 2)}`, `Upper limit: ${z(d.r58, 1)} + ${z(fRangO(d) - 58, 2)} · (${z(d.r59, 1)} − ${z(d.r58, 1)}) = ${z(fOben(d), 2)}`)] }
  ],
  merke: P('Der Referenzbereich (Rangmethode, Typ 6) reicht vom Wert am Rang 0,025 · (n + 1) bis zum Wert am Rang 0,975 · (n + 1), zwischen zwei Werten linear gerechnet. Er enthält die mittleren 95 % der Referenzpersonen; ein Wert außerhalb ist ein Hinweis und keine Diagnose, ein Wert innerhalb kein Beweis für Gesundheit.',
    'The reference range (rank method, type 6) extends from the value at rank 0.025 · (n + 1) to the value at rank 0.975 · (n + 1), calculated linearly between two values. It contains the middle 95% of the reference individuals; a value outside is a hint and not a diagnosis, a value inside is no proof of health.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Gesundheit der Welt - echte Daten“ öffnen, im Schritt „Wie sind die Länder verteilt?“ die Karte rechnen und unter dem Ergebnis bei „Weitere Wege: Referenzbereich bestimmen“ den Referenzbereich der Lebenserwartung bestimmen.',
    'Next: open the example "Health of the world - real data", in the step "How are the countries distributed?" run the card and under the result at "More options: determine a reference range" determine the reference range of life expectancy.')
});

// ---------------------------------------------------------------- 6. Zeilenprofile einer Tabelle (Korrespondenzanalyse)
/** Drei Altersgruppen mal drei Verkehrsmittel (Personen). Zeilensummen 80, 120, 100; Spaltensummen 90, 90, 120; n = 300. */
export const DATEN_KORRESP = { zeilen: [[40, 24, 16], [30, 36, 54], [20, 30, 50]] };
type DX = typeof DATEN_KORRESP;
const xZ = (d: DX, i: number) => summe(d.zeilen[i]!), xS = (d: DX, j: number) => summe(d.zeilen.map(r => r[j]!)), xN = (d: DX) => summe(d.zeilen.map(r => summe(r)));
const xProfil = (d: DX, i: number, j: number) => (d.zeilen[i]![j]! / xZ(d, i)) * 100;
const xMasse = (d: DX, j: number) => (xS(d, j) / xN(d)) * 100;
const KORRESP = bau({
  id: 'nb-korrespondenz',
  daten: DATEN_KORRESP,
  lage: P('300 Personen wurden nach ihrer Altersgruppe und ihrem häufigsten Verkehrsmittel gefragt. Die Korrespondenzanalyse beginnt mit den Zeilenprofilen: In jeder Zeile wird jedes Feld durch die Zeilensumme geteilt (in Prozent). Das durchschnittliche Profil ist die Verteilung der Spaltensummen auf alle 300 Personen.',
    '300 people were asked about their age group and their most frequent means of transport. Correspondence analysis begins with the row profiles: in each row every cell is divided by the row total (in percent). The average profile is the distribution of the column totals over all 300 people.'),
  tabelle: { titel: P('Personen nach Altersgruppe und Verkehrsmittel', 'People by age group and means of transport'), kopf: [P('Altersgruppe', 'Age group'), P('Bus', 'Bus'), P('Rad', 'Bike'), P('Auto', 'Car')],
    zeilen: [[P('jung', 'young'), ...DATEN_KORRESP.zeilen[0]!], [P('mittel', 'middle'), ...DATEN_KORRESP.zeilen[1]!], [P('alt', 'old'), ...DATEN_KORRESP.zeilen[2]!]] },
  schritte: [
    { id: 'jung-bus', stellen: 0, toleranz: 0.01, einheit: P('%', '%'), soll: d => xProfil(d, 0, 0),
      frage: P('Wie viel Prozent der jungen Personen fahren am häufigsten Bus (Zeilenprofil jung, Spalte Bus)? Rechnen: Feld durch Zeilensumme mal 100.', 'What percentage of the young people most often take the bus (row profile young, column bus)? Calculate: cell divided by row total times 100.'),
      warum: P('Das Zeilenprofil macht Zeilen vergleichbar, auch wenn sie verschieden viele Personen haben. Nur so lässt sich sagen, ob eine Gruppe das Verkehrsmittel überdurchschnittlich oft nutzt. Die Summe jedes Zeilenprofils ist 100 %.',
        'The row profile makes rows comparable even when they have different numbers of people. Only this allows saying whether a group uses a means of transport more often than average. The sum of each row profile is 100%.'),
      tipp: P('Die Zeilensumme von „jung“ ist 80 (40 + 24 + 16). Dann 40 durch 80 mal 100.', 'The row total of "young" is 80 (40 + 24 + 16). Then 40 divided by 80 times 100.'),
      fehler: [{ wert: d => (d.zeilen[0]![0]! / xN(d)) * 100, tipp: P('Hier wurde durch alle 300 Personen geteilt. Das Zeilenprofil teilt durch die Zeilensumme.', 'Here the division was by all 300 people. The row profile divides by the row total.') },
        { wert: d => (d.zeilen[0]![0]! / xS(d, 0)) * 100, tipp: P('Hier wurde durch die Spaltensumme geteilt. Das wäre das Spaltenprofil. Gefragt ist das Zeilenprofil.', 'Here the division was by the column total. That would be the column profile. The row profile is asked for.') }],
      weg: (d, z) => [P(`Zeilensumme jung: ${d.zeilen[0]!.map(v => z(v)).join(' + ')} = ${z(xZ(d, 0))}`, `Row total young: ${d.zeilen[0]!.map(v => z(v)).join(' + ')} = ${z(xZ(d, 0))}`),
        P(`Zeilenprofil: ${z(d.zeilen[0]![0]!)} : ${z(xZ(d, 0))} · 100 = ${z(xProfil(d, 0, 0), 0)} %`, `Row profile: ${z(d.zeilen[0]![0]!)} : ${z(xZ(d, 0))} · 100 = ${z(xProfil(d, 0, 0), 0)}%`)] },
    { id: 'alt-bus', stellen: 0, toleranz: 0.01, einheit: P('%', '%'), soll: d => xProfil(d, 2, 0),
      frage: P('Wie viel Prozent der alten Personen fahren am häufigsten Bus (Zeilenprofil alt, Spalte Bus)?', 'What percentage of the old people most often take the bus (row profile old, column bus)?'),
      warum: P('Mit den Zeilenprofilen lassen sich die Zeilen nun direkt vergleichen: Junge nutzen den Bus weit öfter als Alte. Zeilen mit ähnlichem Profil liegen in der Karte nahe beieinander, Zeilen mit sehr verschiedenem Profil weit auseinander.',
        'With the row profiles the rows can now be compared directly: young people use the bus far more often than old people. Rows with a similar profile lie close together on the map, rows with very different profiles far apart.'),
      tipp: P('Die Zeilensumme von „alt“ ist 100. Dann 20 durch 100 mal 100.', 'The row total of "old" is 100. Then 20 divided by 100 times 100.'),
      fehler: [{ wert: d => (d.zeilen[2]![0]! / xN(d)) * 100, tipp: P('Hier wurde durch alle 300 Personen geteilt. Das Zeilenprofil teilt durch die Zeilensumme.', 'Here the division was by all 300 people. The row profile divides by the row total.') },
        { wert: d => (d.zeilen[2]![0]! / xS(d, 0)) * 100, tipp: P('Hier wurde durch die Spaltensumme geteilt. Das wäre das Spaltenprofil.', 'Here the division was by the column total. That would be the column profile.') }],
      weg: (d, z) => [P(`Zeilensumme alt: ${z(xZ(d, 2))}; Zeilenprofil: ${z(d.zeilen[2]![0]!)} : ${z(xZ(d, 2))} · 100 = ${z(xProfil(d, 2, 0), 0)} %`, `Row total old: ${z(xZ(d, 2))}; row profile: ${z(d.zeilen[2]![0]!)} : ${z(xZ(d, 2))} · 100 = ${z(xProfil(d, 2, 0), 0)}%`)] },
    { id: 'durchschnitt-bus', stellen: 0, toleranz: 0.01, einheit: P('%', '%'), soll: d => xMasse(d, 0),
      frage: P('Wie viel Prozent aller 300 Personen fahren am häufigsten Bus (durchschnittliches Profil, Spalte Bus)? Rechnen: Spaltensumme durch 300 mal 100.', 'What percentage of all 300 people most often take the bus (average profile, column bus)? Calculate: column total divided by 300 times 100.'),
      warum: P('Das durchschnittliche Profil ist der Maßstab: Es zeigt, wie sich alle Personen auf die Verkehrsmittel verteilen. Eine Zeile liegt in Richtung der Spalten, bei denen ihr Profil über diesem Durchschnitt liegt, und weg von den Spalten, bei denen es darunter liegt.',
        'The average profile is the yardstick: it shows how all people are distributed over the means of transport. A row lies in the direction of the columns where its profile is above this average, and away from the columns where it is below.'),
      tipp: P('Die Spaltensumme von „Bus“ ist 90 (40 + 30 + 20). Dann 90 durch 300 mal 100.', 'The column total of "bus" is 90 (40 + 30 + 20). Then 90 divided by 300 times 100.'),
      fehler: [{ wert: d => mittel([xProfil(d, 0, 0), xProfil(d, 1, 0), xProfil(d, 2, 0)]), tipp: P('Das ist das einfache Mittel der drei Zeilenprofile. Die Gruppen sind verschieden groß, darum zählt jede nach ihrer Personenzahl.', 'That is the plain mean of the three row profiles. The groups differ in size, so each counts according to its number of people.') },
        { wert: d => xS(d, 0), tipp: P('Das ist die Zahl der Personen, nicht der Anteil. Durch 300 teilen und mal 100 nehmen.', 'That is the number of people, not the share. Divide by 300 and take times 100.') }],
      weg: (d, z) => [P(`Spaltensumme Bus: ${d.zeilen.map(r => z(r[0]!)).join(' + ')} = ${z(xS(d, 0))}`, `Column total bus: ${d.zeilen.map(r => z(r[0]!)).join(' + ')} = ${z(xS(d, 0))}`),
        P(`Durchschnitt: ${z(xS(d, 0))} : ${z(xN(d))} · 100 = ${z(xMasse(d, 0), 0)} %`, `Average: ${z(xS(d, 0))} : ${z(xN(d))} · 100 = ${z(xMasse(d, 0), 0)}%`)] },
    { id: 'abweichung', stellen: 0, toleranz: 0.01, einheit: P('Prozentpunkte', 'percentage points'), soll: d => xProfil(d, 0, 0) - xMasse(d, 0),
      frage: P('Um wie viele Prozentpunkte liegt das Profil „jung“ in der Spalte Bus über dem Durchschnitt? Rechnen: Zeilenprofil jung minus durchschnittliches Profil.', 'By how many percentage points does the profile "young" lie above the average in the column bus? Calculate: row profile young minus average profile.'),
      warum: P('Diese Abweichung vom Durchschnitt treibt die Karte an. Ist sie in einer Spalte für alle Zeilen gleich 0, unterscheidet diese Spalte die Zeilen nicht, und ihr Punkt liegt nahe der Mitte. Die gesamte Trägheit ist die Summe solcher Abweichungen, gewichtet; sie entspricht Chi-Quadrat geteilt durch n.',
        'This deviation from the average drives the map. If it is 0 in a column for all rows, this column does not distinguish the rows, and its point lies near the centre. The total inertia is the sum of such deviations, weighted; it equals chi-square divided by n.'),
      tipp: P('50 minus 30.', '50 minus 30.'),
      fehler: [{ wert: d => xProfil(d, 0, 0) / xMasse(d, 0), tipp: P('Das ist das Verhältnis (1,67 mal so oft). Gefragt ist die Differenz in Prozentpunkten.', 'That is the ratio (1.67 times as often). The difference in percentage points is asked for.') },
        { wert: d => xMasse(d, 0) - xProfil(d, 0, 0), tipp: P('Das Vorzeichen ist vertauscht: Zeilenprofil minus Durchschnitt.', 'The sign is swapped: row profile minus average.') }],
      weg: (d, z) => [P(`Abweichung: ${z(xProfil(d, 0, 0), 0)} − ${z(xMasse(d, 0), 0)} = ${z(xProfil(d, 0, 0) - xMasse(d, 0), 0)} Prozentpunkte`, `Deviation: ${z(xProfil(d, 0, 0), 0)} − ${z(xMasse(d, 0), 0)} = ${z(xProfil(d, 0, 0) - xMasse(d, 0), 0)} percentage points`)] }
  ],
  merke: P('Das Zeilenprofil ist jedes Feld geteilt durch die Zeilensumme. Verglichen wird es mit dem durchschnittlichen Profil (Spaltensummen durch n). Zeilen mit ähnlichem Profil liegen in der Karte nah beieinander; eine Zeile zeigt in Richtung der Spalten, in denen sie über dem Durchschnitt liegt. Die Karte beschreibt die Tabelle und prüft nichts.',
    'The row profile is each cell divided by the row total. It is compared with the average profile (column totals divided by n). Rows with a similar profile lie close together on the map; a row points in the direction of the columns where it lies above average. The map describes the table and tests nothing.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Wer überlebte den Untergang der Titanic?“ öffnen, im Schritt „Und die Klasse? (Kreuztabelle, Chi²)“ den Abschnitt „Karte der Tabelle (Korrespondenzanalyse)“ öffnen, „Karte zeichnen“ klicken und ansehen, welche Reiseklasse in Richtung welcher Spalte liegt.',
    'Next: open the example "Who survived the sinking of the Titanic?", in the step "And the class? (crosstab, chi-square)" open the section "Map of the table (correspondence analysis)", click "Draw the map" and look at which travel class lies in the direction of which column.')
});

export const AUFGABEN_NUTZEN_B: Rechenaufgabe[] = [IMPUTATION, ROBUST, MATCHING, KALIBRIERUNG, REFERENZ, KORRESP];
