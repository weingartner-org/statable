/**
 * Rechenaufgaben der Psychologie (Stufe 6.3 „nutzen“, 09.11.2026): zehn kleine Datensätze mit fünf bis zwölf Werten, von Hand und mit dem Taschenrechner lösbar:
 * Mittelwert und Standardabweichung, t für gepaarte Werte, Cohens d, Korrelation r, Cronbachs Alpha aus den Varianzen der Fragen, Chi-Quadrat einer 2×2-Tabelle,
 * Reliable-Change-Index (RCI), z-Wert und T-Wert, Eta² mit F, Spearman-Brown (Testhalbierung).
 * Aufbau und Regeln wie in `rechenaufgaben-nutzen-b.ts`; alle Zahlen sind erfunden. Die Lösung rechnet die App mit der eigenen Formel in `bau`. Sollwerte stehen hier nie:
 * Der Wächter `rechenaufgaben.test.ts` liest sie über `rechenaufgaben-psych.soll.ts` aus `lib/testdaten/ueben-erwartet-psych-rechnen.json`; die rechnet ein Prüfer in R
 * auf anderem Weg (Auftrag: `docs/nutzen/RECHENAUFGABEN-PSYCH-AUFTRAG.md`). Bis dahin gilt „Sollwerte noch offen“ als bekannte Lücke.
 */
import { P } from '../i18n/laufzeit';
import { bau, mittel, quadratsumme, summe, type Rechenaufgabe } from './rechenaufgaben-bau';

const spann = (x: readonly number[], f: (v: number, i: number) => number) => x.map(f);

// ---------------------------------------------------------------- 1. Mittelwert, Standardabweichung, Standardfehler
/** Acht Personen, richtig erinnerte Wörter in einem Merktest. */
export const DATEN_MITTEL_SD = { werte: [12, 15, 9, 14, 11, 16, 10, 13] };
type DM = typeof DATEN_MITTEL_SD;
const mSd = (d: DM) => Math.sqrt(quadratsumme(d.werte) / (d.werte.length - 1));
const mSe = (d: DM) => mSd(d) / Math.sqrt(d.werte.length);
const MITTEL_SD = bau({
  id: 'ps-mittel-sd',
  daten: DATEN_MITTEL_SD,
  lage: P('Acht Personen haben einen Merktest gemacht und notiert, wie viele Wörter sie richtig erinnert haben. Gerechnet werden der Mittelwert, die Standardabweichung (mit n minus 1 im Nenner) und der Standardfehler des Mittelwerts.',
    'Eight people took a recall test and noted how many words they remembered correctly. The mean, the standard deviation (with n minus 1 in the denominator) and the standard error of the mean are calculated.'),
  tabelle: { titel: P('Richtig erinnerte Wörter', 'Words recalled correctly'), kopf: [P('Person', 'Person'), P('Wörter', 'Words')], zeilen: DATEN_MITTEL_SD.werte.map((w, i) => [`${i + 1}`, w]) },
  schritte: [
    { id: 'mittel', stellen: 1, toleranz: 0.05, soll: d => mittel(d.werte),
      frage: P('Wie groß ist der Mittelwert der acht Werte?', 'How large is the mean of the eight values?'),
      warum: P('Der Mittelwert ist der Schwerpunkt der Werte: Alle Werte werden addiert und durch ihre Zahl geteilt. Er ist der Ausgangspunkt für Standardabweichung und alle Tests, die mit Mittelwerten arbeiten.',
        'The mean is the centre of gravity of the values: all values are added and divided by their number. It is the starting point for the standard deviation and for all tests that work with means.'),
      tipp: P('Die acht Werte addieren und durch 8 teilen.', 'Add the eight values and divide by 8.'),
      fehler: [{ wert: d => summe(d.werte) / (d.werte.length + 1), tipp: P('Hier wurde durch 9 geteilt. Geteilt wird durch die Zahl der Werte, hier 8.', 'Here the division was by 9. The divisor is the number of values, here 8.') }],
      weg: (d, z) => [P(`Summe: ${d.werte.join(' + ')} = ${z(summe(d.werte))}`, `Sum: ${d.werte.join(' + ')} = ${z(summe(d.werte))}`),
        P(`Mittelwert: ${z(summe(d.werte))} : ${z(d.werte.length)} = ${z(mittel(d.werte), 1)}`, `Mean: ${z(summe(d.werte))} : ${z(d.werte.length)} = ${z(mittel(d.werte), 1)}`)] },
    { id: 'sd', stellen: 2, toleranz: 0.005, soll: mSd,
      frage: P('Wie groß ist die Standardabweichung? Rechnen: Wurzel aus (Summe der quadrierten Abweichungen vom Mittelwert, geteilt durch n minus 1).', 'How large is the standard deviation? Calculate: square root of (sum of the squared deviations from the mean, divided by n minus 1).'),
      warum: P('Die Standardabweichung sagt, wie weit die Werte im Mittel vom Mittelwert entfernt liegen. Die Abweichungen werden quadriert, addiert und durch n minus 1 geteilt (Varianz); die Wurzel bringt das Ergebnis zurück auf die Einheit der Wörter.',
        'The standard deviation says how far the values lie from the mean on average. The deviations are squared, added and divided by n minus 1 (variance); the root brings the result back to the unit of the words.'),
      tipp: P('Abweichungen vom Mittelwert 12,5 bilden, quadrieren und addieren (die Summe ist 42), durch 7 teilen, Wurzel ziehen.', 'Form the deviations from the mean 12.5, square and add them (the sum is 42), divide by 7, take the root.'),
      fehler: [
        { wert: d => Math.sqrt(quadratsumme(d.werte) / d.werte.length), tipp: P('Hier wurde durch n statt durch n minus 1 geteilt.', 'Here the division was by n instead of n minus 1.') },
        { wert: d => quadratsumme(d.werte) / (d.werte.length - 1), tipp: P('Das ist die Varianz. Die Standardabweichung ist ihre Wurzel.', 'That is the variance. The standard deviation is its root.') }
      ],
      weg: (d, z) => [P(`Quadrierte Abweichungen: ${d.werte.map(w => `(${z(w - mittel(d.werte), 1)})²`).join(' + ')} = ${z(quadratsumme(d.werte))}`, `Squared deviations: ${d.werte.map(w => `(${z(w - mittel(d.werte), 1)})²`).join(' + ')} = ${z(quadratsumme(d.werte))}`),
        P(`Standardabweichung: Wurzel aus (${z(quadratsumme(d.werte))} : ${z(d.werte.length - 1)}) = ${z(mSd(d), 2)}`, `Standard deviation: square root of (${z(quadratsumme(d.werte))} : ${z(d.werte.length - 1)}) = ${z(mSd(d), 2)}`)] },
    { id: 'se', stellen: 2, toleranz: 0.005, soll: mSe,
      frage: P('Wie groß ist der Standardfehler des Mittelwerts? Rechnen: Standardabweichung geteilt durch die Wurzel aus n.', 'How large is the standard error of the mean? Calculate: standard deviation divided by the square root of n.'),
      warum: P('Der Standardfehler sagt, wie stark der Mittelwert von Stichprobe zu Stichprobe schwankt. Er wird mit mehr Personen kleiner, die Standardabweichung dagegen nicht. Aus ihm entstehen Konfidenzintervalle und die Nenner der t-Tests.',
        'The standard error says how strongly the mean varies from sample to sample. It gets smaller with more people, the standard deviation does not. Confidence intervals and the denominators of t tests are built from it.'),
      tipp: P('Wurzel aus 8 ist etwa 2,83. Die Standardabweichung durch diese Zahl teilen.', 'The square root of 8 is about 2.83. Divide the standard deviation by this number.'),
      fehler: [
        { wert: d => mSd(d) / d.werte.length, tipp: P('Hier wurde durch n statt durch die Wurzel aus n geteilt.', 'Here the division was by n instead of the square root of n.') },
        { wert: d => mSd(d), tipp: P('Das ist die Standardabweichung. Der Standardfehler entsteht erst durch das Teilen durch die Wurzel aus n.', 'That is the standard deviation. The standard error arises only through dividing by the square root of n.') }
      ],
      weg: (d, z) => [P(`Standardfehler: ${z(mSd(d), 2)} : Wurzel aus ${z(d.werte.length)} = ${z(mSe(d), 2)}`, `Standard error: ${z(mSd(d), 2)} : square root of ${z(d.werte.length)} = ${z(mSe(d), 2)}`)] }
  ],
  merke: P('Mittelwert: Summe durch n. Standardabweichung: Wurzel aus der Quadratsumme der Abweichungen durch n minus 1. Standardfehler: Standardabweichung durch die Wurzel aus n.',
    'Mean: sum divided by n. Standard deviation: square root of the sum of squared deviations divided by n minus 1. Standard error: standard deviation divided by the square root of n.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Wie lassen sich Wörter am besten merken? - echtes Experiment“ öffnen und im Schritt „Erst anschauen (Verteilung)“ Mittelwert und Standardabweichung der erinnerten Wörter ansehen.',
    'Next: open the example "How are words best remembered? - real experiment" and look at the mean and standard deviation of the words recalled in the step "Look first (distribution)".')
});

// ---------------------------------------------------------------- 2. gepaarter t-Test
/** Acht Personen, Angstwert vor und nach einem Training. */
export const DATEN_T_GEPAART = { vorher: [24, 30, 27, 22, 35, 28, 31, 25], nachher: [20, 27, 25, 21, 29, 26, 26, 24] };
type DG = typeof DATEN_T_GEPAART;
const gDiff = (d: DG) => spann(d.vorher, (v, i) => v - d.nachher[i]!);
const gMittel = (d: DG) => mittel(gDiff(d));
const gSd = (d: DG) => Math.sqrt(quadratsumme(gDiff(d)) / (d.vorher.length - 1));
const gT = (d: DG) => gMittel(d) / (gSd(d) / Math.sqrt(d.vorher.length));
const T_GEPAART = bau({
  id: 'ps-t-gepaart',
  daten: DATEN_T_GEPAART,
  lage: P('Acht Personen haben vor und nach einem Entspannungstraining einen Angstfragebogen ausgefüllt (höhere Punktzahl heißt mehr Angst). Gerechnet wird der gepaarte t-Test: je Person die Differenz vorher minus nachher, dann deren Mittelwert, Standardabweichung und t.',
    'Eight people filled in an anxiety questionnaire before and after a relaxation training (a higher score means more anxiety). The paired t test is calculated: for each person the difference before minus after, then its mean, standard deviation and t.'),
  tabelle: { titel: P('Angstwerte vor und nach dem Training', 'Anxiety scores before and after the training'), kopf: [P('Person', 'Person'), P('Vorher', 'Before'), P('Nachher', 'After')],
    zeilen: DATEN_T_GEPAART.vorher.map((v, i) => [`${i + 1}`, v, DATEN_T_GEPAART.nachher[i]!]) },
  schritte: [
    { id: 'mittel-diff', stellen: 0, toleranz: 0.01, soll: gMittel,
      frage: P('Wie groß ist der Mittelwert der acht Differenzen (vorher minus nachher)?', 'How large is the mean of the eight differences (before minus after)?'),
      warum: P('Der gepaarte Test rechnet mit einer einzigen Spalte: der Differenz je Person. Der Mittelwert dieser Differenzen ist die mittlere Veränderung. Unterschiede zwischen den Personen fallen dabei heraus, weil jede Person mit sich selbst verglichen wird.',
        'The paired test works with a single column: the difference for each person. The mean of these differences is the mean change. Differences between people drop out because each person is compared with herself.'),
      tipp: P('Je Person vorher minus nachher bilden (4, 3, 2, 1, 6, 2, 5, 1), addieren und durch 8 teilen.', 'Form before minus after for each person (4, 3, 2, 1, 6, 2, 5, 1), add them and divide by 8.'),
      fehler: [{ wert: d => mittel(gDiff(d)) * -1, tipp: P('Das Vorzeichen ist vertauscht: Hier ist vorher minus nachher gefragt, ein Rückgang der Angst gibt eine positive Differenz.', 'The sign is swapped: before minus after is asked for here, a decrease in anxiety gives a positive difference.') },
        { wert: d => mittel(d.vorher) - mittel(d.nachher) + 1, tipp: P('Die Differenz der beiden Mittelwerte stimmt mit dem Mittelwert der Differenzen überein, hier ist beim Addieren etwas schiefgegangen. Noch einmal nachrechnen.', 'The difference of the two means equals the mean of the differences; something went wrong when adding here. Calculate again.') }],
      weg: (d, z) => [P(`Differenzen: ${gDiff(d).join(', ')}`, `Differences: ${gDiff(d).join(', ')}`),
        P(`Mittelwert: ${z(summe(gDiff(d)))} : ${z(d.vorher.length)} = ${z(gMittel(d))}`, `Mean: ${z(summe(gDiff(d)))} : ${z(d.vorher.length)} = ${z(gMittel(d))}`)] },
    { id: 'sd-diff', stellen: 2, toleranz: 0.005, soll: gSd,
      frage: P('Wie groß ist die Standardabweichung der Differenzen (mit n minus 1 im Nenner)?', 'How large is the standard deviation of the differences (with n minus 1 in the denominator)?'),
      warum: P('Die Standardabweichung der Differenzen zeigt, wie einheitlich die Veränderung bei den Personen ist. Streuen die Differenzen stark, ist der Mittelwert unsicher, und t fällt kleiner aus.',
        'The standard deviation of the differences shows how uniform the change is across the people. If the differences vary strongly, the mean is uncertain and t comes out smaller.'),
      tipp: P('Abweichungen der Differenzen von 3 bilden, quadrieren und addieren (die Summe ist 24), durch 7 teilen, Wurzel ziehen.', 'Form the deviations of the differences from 3, square and add them (the sum is 24), divide by 7, take the root.'),
      fehler: [{ wert: d => Math.sqrt(quadratsumme(gDiff(d)) / d.vorher.length), tipp: P('Hier wurde durch n statt durch n minus 1 geteilt.', 'Here the division was by n instead of n minus 1.') },
        { wert: d => quadratsumme(gDiff(d)) / (d.vorher.length - 1), tipp: P('Das ist die Varianz der Differenzen. Die Standardabweichung ist ihre Wurzel.', 'That is the variance of the differences. The standard deviation is its root.') }],
      weg: (d, z) => [P(`Quadratsumme: ${gDiff(d).map(v => `(${z(v - gMittel(d))})²`).join(' + ')} = ${z(quadratsumme(gDiff(d)))}`, `Sum of squares: ${gDiff(d).map(v => `(${z(v - gMittel(d))})²`).join(' + ')} = ${z(quadratsumme(gDiff(d)))}`),
        P(`Standardabweichung: Wurzel aus (${z(quadratsumme(gDiff(d)))} : ${z(d.vorher.length - 1)}) = ${z(gSd(d), 2)}`, `Standard deviation: square root of (${z(quadratsumme(gDiff(d)))} : ${z(d.vorher.length - 1)}) = ${z(gSd(d), 2)}`)] },
    { id: 't', stellen: 2, toleranz: 0.005, soll: gT,
      frage: P('Wie groß ist t? Rechnen: Mittelwert der Differenzen geteilt durch (Standardabweichung der Differenzen durch Wurzel aus n). Die Freiheitsgrade sind n minus 1 = 7.', 'How large is t? Calculate: mean of the differences divided by (standard deviation of the differences divided by the square root of n). The degrees of freedom are n minus 1 = 7.'),
      warum: P('t misst, wie viele Standardfehler die mittlere Veränderung von null entfernt liegt. Ein großes t spricht dagegen, dass die Veränderung nur Zufall ist. Mit 7 Freiheitsgraden liegt die Schranke für p = 0,05 (zweiseitig) bei etwa 2,36.',
        't measures how many standard errors the mean change lies away from zero. A large t speaks against the change being only chance. With 7 degrees of freedom the threshold for p = 0.05 (two-sided) is about 2.36.'),
      tipp: P('Zuerst den Standardfehler: 1,85 geteilt durch Wurzel aus 8. Dann 3 durch diesen Standardfehler.', 'First the standard error: 1.85 divided by the square root of 8. Then 3 divided by this standard error.'),
      fehler: [{ wert: d => gMittel(d) / gSd(d), tipp: P('Hier wurde durch die Standardabweichung statt durch den Standardfehler geteilt. Der Standardfehler ist die Standardabweichung durch Wurzel aus n.', 'Here the division was by the standard deviation instead of the standard error. The standard error is the standard deviation divided by the square root of n.') },
        { wert: d => gMittel(d) / (gSd(d) / d.vorher.length), tipp: P('Hier wurde durch n statt durch die Wurzel aus n geteilt.', 'Here the division was by n instead of the square root of n.') }],
      weg: (d, z) => [P(`Standardfehler: ${z(gSd(d), 2)} : Wurzel aus ${z(d.vorher.length)} = ${z(gSd(d) / Math.sqrt(d.vorher.length), 2)}`, `Standard error: ${z(gSd(d), 2)} : square root of ${z(d.vorher.length)} = ${z(gSd(d) / Math.sqrt(d.vorher.length), 2)}`),
        P(`t = ${z(gMittel(d))} : ${z(gSd(d) / Math.sqrt(d.vorher.length), 2)} = ${z(gT(d), 2)}`, `t = ${z(gMittel(d))} : ${z(gSd(d) / Math.sqrt(d.vorher.length), 2)} = ${z(gT(d), 2)}`)] }
  ],
  merke: P('Beim gepaarten t-Test zählt nur die Spalte der Differenzen: t = Mittelwert der Differenzen durch (Standardabweichung der Differenzen durch Wurzel aus n), mit n minus 1 Freiheitsgraden. Ein signifikantes t sagt, dass sich der Wert verändert hat, nicht warum.',
    'In the paired t test only the column of differences counts: t = mean of the differences divided by (standard deviation of the differences divided by the square root of n), with n minus 1 degrees of freedom. A significant t says that the value has changed, not why.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Gewichtszunahme bei Anorexie - drei Behandlungen im Vergleich“ öffnen und im Schritt „Alle 72 zusammen: zugenommen? (gepaarter t-Test)“ die Differenz je Person und das t ansehen.',
    'Next: open the example "Weight gain in anorexia - comparing three treatments" and look at the difference for each person and the t in the step "All 72 together: gained weight? (paired t test)".')
});

// ---------------------------------------------------------------- 3. Cohens d
/** Zwei Gruppen mit je fünf Personen, Wohlbefinden auf einer Skala von 1 bis 10. */
export const DATEN_COHEN_D = { a: [7, 8, 6, 9, 5], b: [6, 5, 4, 5, 5] };
type DC = typeof DATEN_COHEN_D;
const cDiff = (d: DC) => mittel(d.a) - mittel(d.b);
const cPool = (d: DC) => Math.sqrt((quadratsumme(d.a) + quadratsumme(d.b)) / (d.a.length + d.b.length - 2));
const cD = (d: DC) => cDiff(d) / cPool(d);
const sdVon = (x: readonly number[]) => Math.sqrt(quadratsumme(x) / (x.length - 1));
const COHEN_D = bau({
  id: 'ps-cohen-d',
  daten: DATEN_COHEN_D,
  lage: P('Je fünf Personen haben ein Wohlbefinden-Training (Gruppe A) oder keine Maßnahme (Gruppe B) bekommen und danach ihr Wohlbefinden auf einer Skala von 1 bis 10 angegeben. Gerechnet wird Cohens d: der Mittelwertunterschied in Einheiten der gemeinsamen Standardabweichung.',
    'Five people each received a well-being training (group A) or no measure (group B) and afterwards rated their well-being on a scale from 1 to 10. Cohen d is calculated: the difference in means in units of the common standard deviation.'),
  tabelle: { titel: P('Wohlbefinden (1 bis 10)', 'Well-being (1 to 10)'), kopf: [P('Person', 'Person'), P('Gruppe A', 'Group A'), P('Gruppe B', 'Group B')], zeilen: DATEN_COHEN_D.a.map((v, i) => [`${i + 1}`, v, DATEN_COHEN_D.b[i]!]) },
  schritte: [
    { id: 'diff', stellen: 0, toleranz: 0.01, soll: cDiff,
      frage: P('Wie groß ist der Unterschied der Mittelwerte (Gruppe A minus Gruppe B)?', 'How large is the difference of the means (group A minus group B)?'),
      warum: P('Der Zähler von Cohens d ist der rohe Unterschied der Mittelwerte, in Punkten der Skala. Er allein ist schwer einzuordnen, weil niemand weiß, ob zwei Punkte auf dieser Skala viel oder wenig sind. Darum wird er durch die Streuung geteilt.',
        'The numerator of Cohen d is the raw difference of the means, in points of the scale. On its own it is hard to classify, because nobody knows whether two points on this scale are much or little. So it is divided by the spread.'),
      tipp: P('Mittelwert A (7) minus Mittelwert B (5).', 'Mean A (7) minus mean B (5).'),
      fehler: [{ wert: d => mittel(d.b) - mittel(d.a), tipp: P('Das Vorzeichen ist vertauscht: A minus B ist gefragt.', 'The sign is swapped: A minus B is asked for.') }],
      weg: (d, z) => [P(`Mittelwert A: ${d.a.join(' + ')} = ${z(summe(d.a))}, durch ${z(d.a.length)} = ${z(mittel(d.a))}`, `Mean A: ${d.a.join(' + ')} = ${z(summe(d.a))}, divided by ${z(d.a.length)} = ${z(mittel(d.a))}`),
        P(`Mittelwert B: ${d.b.join(' + ')} = ${z(summe(d.b))}, durch ${z(d.b.length)} = ${z(mittel(d.b))}`, `Mean B: ${d.b.join(' + ')} = ${z(summe(d.b))}, divided by ${z(d.b.length)} = ${z(mittel(d.b))}`),
        P(`Unterschied: ${z(mittel(d.a))} − ${z(mittel(d.b))} = ${z(cDiff(d))}`, `Difference: ${z(mittel(d.a))} − ${z(mittel(d.b))} = ${z(cDiff(d))}`)] },
    { id: 'sd-pool', stellen: 2, toleranz: 0.005, soll: cPool,
      frage: P('Wie groß ist die gemeinsame (gepoolte) Standardabweichung? Rechnen: Wurzel aus ((Quadratsumme A plus Quadratsumme B) geteilt durch (nA plus nB minus 2)).', 'How large is the common (pooled) standard deviation? Calculate: square root of ((sum of squares A plus sum of squares B) divided by (nA plus nB minus 2)).'),
      warum: P('Beide Gruppen schätzen dieselbe Streuung. Die gepoolte Standardabweichung fasst sie zusammen und gewichtet dabei nach den Freiheitsgraden. Sie ist nicht das einfache Mittel der beiden Standardabweichungen, sobald die Gruppen verschieden streuen.',
        'Both groups estimate the same spread. The pooled standard deviation combines them and weights by the degrees of freedom. It is not the simple mean of the two standard deviations as soon as the groups vary differently.'),
      tipp: P('Quadratsumme A ist 10, Quadratsumme B ist 2. Zusammen 12, geteilt durch 8, dann die Wurzel.', 'The sum of squares of A is 10, that of B is 2. Together 12, divided by 8, then the root.'),
      fehler: [{ wert: d => (sdVon(d.a) + sdVon(d.b)) / 2, tipp: P('Das ist das einfache Mittel der beiden Standardabweichungen. Gepoolt wird über die Quadratsummen.', 'That is the simple mean of the two standard deviations. Pooling works through the sums of squares.') },
        { wert: d => Math.sqrt((quadratsumme(d.a) + quadratsumme(d.b)) / (d.a.length + d.b.length)), tipp: P('Hier wurde durch nA plus nB statt durch nA plus nB minus 2 geteilt.', 'Here the division was by nA plus nB instead of nA plus nB minus 2.') }],
      weg: (d, z) => [P(`Quadratsummen: A = ${z(quadratsumme(d.a))}, B = ${z(quadratsumme(d.b))}`, `Sums of squares: A = ${z(quadratsumme(d.a))}, B = ${z(quadratsumme(d.b))}`),
        P(`Gepoolt: Wurzel aus (${z(quadratsumme(d.a) + quadratsumme(d.b))} : ${z(d.a.length + d.b.length - 2)}) = ${z(cPool(d), 2)}`, `Pooled: square root of (${z(quadratsumme(d.a) + quadratsumme(d.b))} : ${z(d.a.length + d.b.length - 2)}) = ${z(cPool(d), 2)}`)] },
    { id: 'd', stellen: 2, toleranz: 0.005, soll: cD,
      frage: P('Wie groß ist Cohens d (Mittelwertunterschied durch gepoolte Standardabweichung)?', 'How large is Cohen d (difference in means divided by the pooled standard deviation)?'),
      warum: P('Cohens d sagt, um wie viele Standardabweichungen sich die Gruppen unterscheiden. Es hängt nicht von der Stichprobengröße ab und lässt sich über Studien vergleichen. Als grobe Faustregel gelten 0,2 als klein, 0,5 als mittel und 0,8 als groß; das hängt aber vom Fachgebiet ab.',
        'Cohen d says by how many standard deviations the groups differ. It does not depend on the sample size and can be compared across studies. As a rough rule of thumb 0.2 counts as small, 0.5 as medium and 0.8 as large; but that depends on the field.'),
      tipp: P('2 geteilt durch die gepoolte Standardabweichung 1,22.', '2 divided by the pooled standard deviation 1.22.'),
      fehler: [{ wert: d => cDiff(d) / sdVon(d.a), tipp: P('Hier wurde nur durch die Standardabweichung der Gruppe A geteilt. Gepoolt sind beide Gruppen.', 'Here the division was only by the standard deviation of group A. Pooled means both groups.') },
        { wert: d => cDiff(d) / ((sdVon(d.a) + sdVon(d.b)) / 2), tipp: P('Hier wurde durch das einfache Mittel der beiden Standardabweichungen geteilt. Gepoolt wird über die Quadratsummen.', 'Here the division was by the simple mean of the two standard deviations. Pooling works through the sums of squares.') }],
      weg: (d, z) => [P(`d = ${z(cDiff(d))} : ${z(cPool(d), 2)} = ${z(cD(d), 2)}`, `d = ${z(cDiff(d))} : ${z(cPool(d), 2)} = ${z(cD(d), 2)}`)] }
  ],
  merke: P('Cohens d = Mittelwertunterschied durch gepoolte Standardabweichung. Es nennt die Größe eines Unterschieds unabhängig von der Skala und der Gruppengröße; die Einordnung als klein, mittel oder groß ist eine Faustregel.',
    'Cohen d = difference in means divided by the pooled standard deviation. It states the size of a difference independently of the scale and the group size; the classification as small, medium or large is a rule of thumb.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Gewichtszunahme bei Anorexie - drei Behandlungen im Vergleich“ öffnen und im Schritt „Die Veränderung selbst vergleichen“ die Mittelwerte und Streuungen der Gruppen ansehen.',
    'Next: open the example "Weight gain in anorexia - comparing three treatments" and look at the means and spreads of the groups in the step "Comparing the change itself".')
});

// ---------------------------------------------------------------- 4. Korrelation r
/** Acht Personen: Lernzeit in Stunden und Punkte in der Klausur. */
export const DATEN_KORR = { x: [2, 4, 5, 3, 7, 6, 1, 4], y: [60, 50, 75, 55, 65, 80, 45, 70] };
type DK = typeof DATEN_KORR;
const kSxx = (d: DK) => quadratsumme(d.x);
const kSyy = (d: DK) => quadratsumme(d.y);
const kSxy = (d: DK) => summe(d.x.map((v, i) => (v - mittel(d.x)) * (d.y[i]! - mittel(d.y))));
const kR = (d: DK) => kSxy(d) / Math.sqrt(kSxx(d) * kSyy(d));
const KORR = bau({
  id: 'ps-r',
  daten: DATEN_KORR,
  lage: P('Acht Studierende haben notiert, wie viele Stunden sie für eine Klausur gelernt haben, und ihre Punktzahl erfahren. Gerechnet wird die Korrelation r nach Pearson aus den Quadratsummen und der Summe der Produkte der Abweichungen.',
    'Eight students noted how many hours they studied for an exam and learned their score. The Pearson correlation r is calculated from the sums of squares and the sum of the products of the deviations.'),
  tabelle: { titel: P('Lernzeit und Klausurpunkte', 'Study time and exam points'), kopf: [P('Person', 'Person'), P('Lernzeit (Stunden)', 'Study time (hours)'), P('Punkte', 'Points')], zeilen: DATEN_KORR.x.map((v, i) => [`${i + 1}`, v, DATEN_KORR.y[i]!]) },
  schritte: [
    { id: 'sxx', stellen: 0, toleranz: 0.01, soll: kSxx,
      frage: P('Wie groß ist die Quadratsumme der Lernzeit (Summe der quadrierten Abweichungen vom Mittelwert 4)?', 'How large is the sum of squares of the study time (sum of the squared deviations from the mean 4)?'),
      warum: P('Die Quadratsumme misst, wie stark die Lernzeit insgesamt um ihren Mittelwert streut. Sie ist die Streuung im Nenner von r und steckt auch in der Standardabweichung.',
        'The sum of squares measures how strongly the study time varies around its mean in total. It is the spread in the denominator of r and is also contained in the standard deviation.'),
      tipp: P('Abweichungen von 4: -2, 0, 1, -1, 3, 2, -3, 0. Quadrieren und addieren.', 'Deviations from 4: -2, 0, 1, -1, 3, 2, -3, 0. Square and add.'),
      fehler: [{ wert: d => summe(d.x.map(v => v * v)), tipp: P('Hier wurden die Werte selbst quadriert, nicht ihre Abweichungen vom Mittelwert.', 'Here the values themselves were squared, not their deviations from the mean.') }],
      weg: (d, z) => [P(`Quadratsumme: ${d.x.map(v => `(${z(v - mittel(d.x))})²`).join(' + ')} = ${z(kSxx(d))}`, `Sum of squares: ${d.x.map(v => `(${z(v - mittel(d.x))})²`).join(' + ')} = ${z(kSxx(d))}`)] },
    { id: 'syy', stellen: 0, toleranz: 0.01, soll: kSyy,
      frage: P('Wie groß ist die Quadratsumme der Punkte (Abweichungen vom Mittelwert 62,5)?', 'How large is the sum of squares of the points (deviations from the mean 62.5)?'),
      warum: P('Dieselbe Rechnung für die zweite Größe. Beide Quadratsummen zusammen ergeben, wie stark die beiden Größen überhaupt streuen; nur gegen diese Streuung ist der gemeinsame Anteil zu beurteilen.',
        'The same calculation for the second variable. Both sums of squares together give how strongly the two variables vary at all; only against this spread can the shared part be judged.'),
      tipp: P('Abweichungen von 62,5: -2,5, -12,5, 12,5, -7,5, 2,5, 17,5, -17,5, 7,5. Quadrieren und addieren.', 'Deviations from 62.5: -2.5, -12.5, 12.5, -7.5, 2.5, 17.5, -17.5, 7.5. Square and add.'),
      fehler: [{ wert: d => summe(d.y.map(v => v * v)), tipp: P('Hier wurden die Punkte selbst quadriert, nicht ihre Abweichungen vom Mittelwert.', 'Here the points themselves were squared, not their deviations from the mean.') }],
      weg: (d, z) => [P(`Quadratsumme: ${d.y.map(v => `(${z(v - mittel(d.y), 1)})²`).join(' + ')} = ${z(kSyy(d))}`, `Sum of squares: ${d.y.map(v => `(${z(v - mittel(d.y), 1)})²`).join(' + ')} = ${z(kSyy(d))}`)] },
    { id: 'sxy', stellen: 0, toleranz: 0.01, soll: kSxy,
      frage: P('Wie groß ist die Summe der Produkte der Abweichungen (Abweichung der Lernzeit mal Abweichung der Punkte, je Person)?', 'How large is the sum of the products of the deviations (deviation of the study time times deviation of the points, for each person)?'),
      warum: P('Haben beide Größen bei derselben Person Abweichungen mit gleichem Vorzeichen, ist das Produkt positiv; liegen sie gegenläufig, ist es negativ. Die Summe zeigt die gemeinsame Richtung, die Kovarianz ist sie durch n minus 1.',
        'If both variables have deviations with the same sign for the same person, the product is positive; if they run in opposite directions, it is negative. The sum shows the common direction, the covariance is it divided by n minus 1.'),
      tipp: P('Produkte: 5, 0, 12,5, 7,5, 7,5, 35, 52,5, 0. Alle addieren.', 'Products: 5, 0, 12.5, 7.5, 7.5, 35, 52.5, 0. Add them all.'),
      fehler: [{ wert: d => summe(d.x.map((v, i) => v * d.y[i]!)), tipp: P('Hier wurden die Werte direkt multipliziert, nicht ihre Abweichungen vom Mittelwert.', 'Here the values were multiplied directly, not their deviations from the mean.') }],
      weg: (d, z) => [P(`Produkte: ${d.x.map((v, i) => z((v - mittel(d.x)) * (d.y[i]! - mittel(d.y)), 1)).join(' + ')} = ${z(kSxy(d))}`, `Products: ${d.x.map((v, i) => z((v - mittel(d.x)) * (d.y[i]! - mittel(d.y)), 1)).join(' + ')} = ${z(kSxy(d))}`)] },
    { id: 'r', stellen: 2, toleranz: 0.005, soll: kR,
      frage: P('Wie groß ist r? Rechnen: Summe der Produkte geteilt durch die Wurzel aus (Quadratsumme Lernzeit mal Quadratsumme Punkte).', 'How large is r? Calculate: sum of the products divided by the square root of (sum of squares study time times sum of squares points).'),
      warum: P('r teilt den gemeinsamen Anteil durch die Gesamtstreuung beider Größen und liegt darum zwischen -1 und 1. Das Quadrat von r (hier etwa 0,49) ist der Anteil gemeinsamer Streuung. r beschreibt einen Zusammenhang, keine Ursache.',
        'r divides the shared part by the total spread of both variables and therefore lies between -1 and 1. The square of r (here about 0.49) is the share of shared spread. r describes an association, not a cause.'),
      tipp: P('Wurzel aus 28 mal 1050 (also aus 29400) ist etwa 171,46. 120 durch diese Zahl.', 'The square root of 28 times 1050 (that is of 29400) is about 171.46. 120 divided by this number.'),
      fehler: [{ wert: d => kSxy(d) / (kSxx(d) * kSyy(d)), tipp: P('Hier fehlt die Wurzel aus dem Produkt der beiden Quadratsummen.', 'Here the square root of the product of the two sums of squares is missing.') },
        { wert: d => kR(d) ** 2, tipp: P('Das ist r im Quadrat, der Anteil gemeinsamer Streuung. Gefragt ist r selbst.', 'That is r squared, the share of shared spread. r itself is asked for.') }],
      weg: (d, z) => [P(`r = ${z(kSxy(d))} : Wurzel aus (${z(kSxx(d))} · ${z(kSyy(d))}) = ${z(kSxy(d))} : ${z(Math.sqrt(kSxx(d) * kSyy(d)), 2)} = ${z(kR(d), 2)}`, `r = ${z(kSxy(d))} : square root of (${z(kSxx(d))} · ${z(kSyy(d))}) = ${z(kSxy(d))} : ${z(Math.sqrt(kSxx(d) * kSyy(d)), 2)} = ${z(kR(d), 2)}`)] }
  ],
  merke: P('r = Summe der Produkte der Abweichungen durch die Wurzel aus dem Produkt der beiden Quadratsummen. r² ist der Anteil gemeinsamer Streuung. Ein Zusammenhang von Lernzeit und Punkten sagt nicht, dass das Lernen allein die Punkte verursacht.',
    'r = sum of the products of the deviations divided by the square root of the product of the two sums of squares. r squared is the share of shared spread. A relationship between study time and points does not say that studying alone causes the points.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Wie hängen zwei Studierfähigkeitstests zusammen? - echte Testwerte“ öffnen und im Schritt zur Korrelation r von ACT und SAT Mathematik ansehen.',
    'Next: open the example "How do two aptitude tests relate? - real test scores" and look at r of the ACT and SAT maths in the step on the correlation.')
});

// ---------------------------------------------------------------- 5. Cronbachs Alpha aus Varianzen
/** Fünf Personen, drei Fragen (0 bis 4). Zeilen = Personen. */
export const DATEN_ALPHA = { zeilen: [[3, 4, 3], [2, 2, 3], [4, 4, 4], [1, 2, 1], [2, 3, 2]] };
type DA = typeof DATEN_ALPHA;
const aVar = (x: readonly number[]) => quadratsumme(x) / (x.length - 1);
const aSpalte = (d: DA, j: number) => d.zeilen.map(r => r[j]!);
const aSummen = (d: DA) => d.zeilen.map(r => summe(r));
const aItems = (d: DA) => summe([0, 1, 2].map(j => aVar(aSpalte(d, j))));
const aGesamt = (d: DA) => aVar(aSummen(d));
const aAlpha = (d: DA) => (3 / 2) * (1 - aItems(d) / aGesamt(d));
const ALPHA = bau({
  id: 'ps-alpha',
  daten: DATEN_ALPHA,
  lage: P('Fünf Personen haben drei Aussagen zu einem Merkmal beantwortet (0 bis 4 Punkte, alle gleich gepolt). Cronbachs Alpha vergleicht die Varianzen der einzelnen Fragen mit der Varianz der Summe: Alpha = k geteilt durch (k minus 1) mal (1 minus Summe der Fragenvarianzen durch Varianz der Summe).',
    'Five people answered three statements on a trait (0 to 4 points, all keyed the same way). Cronbach alpha compares the variances of the single questions with the variance of the sum: alpha = k divided by (k minus 1) times (1 minus sum of the question variances divided by variance of the sum).'),
  tabelle: { titel: P('Antworten (0 bis 4)', 'Answers (0 to 4)'), kopf: [P('Person', 'Person'), P('Frage 1', 'Question 1'), P('Frage 2', 'Question 2'), P('Frage 3', 'Question 3')], zeilen: DATEN_ALPHA.zeilen.map((r, i) => [`${i + 1}`, ...r]) },
  schritte: [
    { id: 'var-fragen', stellen: 1, toleranz: 0.05, soll: aItems,
      frage: P('Wie groß ist die Summe der drei Fragenvarianzen (Varianz mit n minus 1 im Nenner, je Frage)?', 'How large is the sum of the three question variances (variance with n minus 1 in the denominator, for each question)?'),
      warum: P('Jede Frage hat ihre eigene Streuung. Ihre Summe ist die Streuung, die die Fragen hätten, wenn sie nichts miteinander zu tun hätten. Hängen die Fragen zusammen, ist die Streuung der Summe größer als diese Zahl, und genau das misst Alpha.',
        'Each question has its own spread. Their sum is the spread the questions would have if they had nothing to do with each other. If the questions are related, the spread of the sum is larger than this number, and that is exactly what alpha measures.'),
      tipp: P('Die Varianzen sind 1,3 (Frage 1), 1,0 (Frage 2) und 1,3 (Frage 3), jeweils Quadratsumme durch 4. Addieren.', 'The variances are 1.3 (question 1), 1.0 (question 2) and 1.3 (question 3), each sum of squares divided by 4. Add them.'),
      fehler: [{ wert: d => summe([0, 1, 2].map(j => quadratsumme(aSpalte(d, j)) / d.zeilen.length)), tipp: P('Hier wurde bei jeder Frage durch n statt durch n minus 1 geteilt.', 'Here each question was divided by n instead of n minus 1.') },
        { wert: d => summe([0, 1, 2].map(j => Math.sqrt(aVar(aSpalte(d, j))))), tipp: P('Hier wurden die Standardabweichungen addiert. Alpha rechnet mit Varianzen.', 'Here the standard deviations were added. Alpha works with variances.') }],
      weg: (d, z) => [P(`Varianzen der Fragen: ${[0, 1, 2].map(j => z(aVar(aSpalte(d, j)), 1)).join(' + ')} = ${z(aItems(d), 1)}`, `Variances of the questions: ${[0, 1, 2].map(j => z(aVar(aSpalte(d, j)), 1)).join(' + ')} = ${z(aItems(d), 1)}`)] },
    { id: 'var-summe', stellen: 1, toleranz: 0.05, soll: aGesamt,
      frage: P('Wie groß ist die Varianz der Summenwerte? Die Summen je Person sind 10, 7, 12, 4 und 7.', 'How large is the variance of the sum scores? The sums for each person are 10, 7, 12, 4 and 7.'),
      warum: P('Die Summe ist der Wert, der später ausgewertet wird. Seine Varianz enthält die Varianzen der Fragen und zusätzlich alle gemeinsamen Streuungen. Je enger die Fragen zusammenhängen, desto größer ist sie im Vergleich zur Summe der Fragenvarianzen.',
        'The sum is the value that is evaluated later. Its variance contains the variances of the questions and in addition all shared spread. The more closely the questions are related, the larger it is compared with the sum of the question variances.'),
      tipp: P('Mittelwert der Summen 8, Quadratsumme der Abweichungen 38, geteilt durch 4.', 'Mean of the sums 8, sum of squares of the deviations 38, divided by 4.'),
      fehler: [{ wert: d => quadratsumme(aSummen(d)) / d.zeilen.length, tipp: P('Hier wurde durch n statt durch n minus 1 geteilt.', 'Here the division was by n instead of n minus 1.') },
        { wert: d => aItems(d) + 0.4, tipp: P('Die Varianz der Summe ist nicht einfach die Summe der Fragenvarianzen; es kommen die gemeinsamen Anteile hinzu. Noch einmal mit den Summen je Person rechnen.', 'The variance of the sum is not simply the sum of the question variances; the shared parts come in addition. Calculate again with the sums for each person.') }],
      weg: (d, z) => [P(`Quadratsumme der Summen: ${aSummen(d).map(v => `(${z(v - mittel(aSummen(d)))})²`).join(' + ')} = ${z(quadratsumme(aSummen(d)))}`, `Sum of squares of the sums: ${aSummen(d).map(v => `(${z(v - mittel(aSummen(d)))})²`).join(' + ')} = ${z(quadratsumme(aSummen(d)))}`),
        P(`Varianz: ${z(quadratsumme(aSummen(d)))} : ${z(d.zeilen.length - 1)} = ${z(aGesamt(d), 1)}`, `Variance: ${z(quadratsumme(aSummen(d)))} : ${z(d.zeilen.length - 1)} = ${z(aGesamt(d), 1)}`)] },
    { id: 'alpha', stellen: 2, toleranz: 0.005, soll: aAlpha,
      frage: P('Wie groß ist Alpha? Rechnen: 3 geteilt durch 2, mal (1 minus Summe der Fragenvarianzen durch Varianz der Summe).', 'How large is alpha? Calculate: 3 divided by 2, times (1 minus sum of the question variances divided by variance of the sum).'),
      warum: P('Der Bruch in der Klammer ist der Anteil der Streuung, der in den einzelnen Fragen steckt; der Rest ist gemeinsame Streuung. Der Faktor k durch (k minus 1) gleicht aus, dass die Summe bei nur drei Fragen nicht beliebig stark von den Einzelvarianzen abweichen kann. Alpha beschreibt die Zuverlässigkeit, nicht die Gültigkeit.',
        'The fraction in the bracket is the share of the spread that sits in the single questions; the rest is shared spread. The factor k divided by (k minus 1) makes up for the fact that with only three questions the sum cannot differ arbitrarily strongly from the single variances. Alpha describes reliability, not validity.'),
      tipp: P('3,6 durch 9,5 ist etwa 0,379. 1 minus 0,379 ergibt 0,621, mal 1,5.', '3.6 divided by 9.5 is about 0.379. 1 minus 0.379 gives 0.621, times 1.5.'),
      fehler: [{ wert: d => 1 - aItems(d) / aGesamt(d), tipp: P('Der Faktor 3 geteilt durch 2 (k durch k minus 1) fehlt.', 'The factor 3 divided by 2 (k divided by k minus 1) is missing.') },
        { wert: d => (3 / 2) * (aItems(d) / aGesamt(d)), tipp: P('Hier fehlt das „1 minus“: Der Bruch ist der Anteil der Einzelvarianzen, Alpha braucht den Rest.', 'Here the "1 minus" is missing: the fraction is the share of the single variances, alpha needs the remainder.') }],
      weg: (d, z) => [P(`Bruch: ${z(aItems(d), 1)} : ${z(aGesamt(d), 1)} = ${z(aItems(d) / aGesamt(d), 2)}`, `Fraction: ${z(aItems(d), 1)} : ${z(aGesamt(d), 1)} = ${z(aItems(d) / aGesamt(d), 2)}`),
        P(`Alpha = 3 : 2 · (1 − ${z(aItems(d) / aGesamt(d), 2)}) = ${z(aAlpha(d), 2)}`, `Alpha = 3 : 2 · (1 − ${z(aItems(d) / aGesamt(d), 2)}) = ${z(aAlpha(d), 2)}`)] }
  ],
  merke: P('Alpha = k durch (k minus 1) mal (1 minus Summe der Fragenvarianzen durch Varianz der Summe). Es steigt, wenn die Fragen enger zusammenhängen und wenn es mehr Fragen gibt. Ein hohes Alpha heißt zuverlässig, nicht gültig und nicht eindimensional.',
    'Alpha = k divided by (k minus 1) times (1 minus sum of the question variances divided by variance of the sum). It rises when the questions are more closely related and when there are more questions. A high alpha means reliable, not valid and not unidimensional.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Drang zur Schlankheit - eine Skala aus sieben Fragen“ öffnen und im Schritt „Passen die sieben Fragen zusammen? (Cronbachs Alpha und Trennschärfe)“ Alpha berechnen lassen.',
    'Next: open the example "Drive for thinness - a scale of seven questions" and have alpha calculated in the step "Do the seven questions fit together? (Cronbach alpha and item-total correlation)".')
});

// ---------------------------------------------------------------- 6. Chi-Quadrat einer 2×2-Tabelle
/** Therapie ja/nein mal gebessert ja/nein (Personen). */
export const DATEN_CHI2 = { a: 30, b: 10, c: 20, d: 20 };
type DX = typeof DATEN_CHI2;
const xN = (d: DX) => d.a + d.b + d.c + d.d;
const xErw = (d: DX) => ((d.a + d.b) * (d.a + d.c)) / xN(d);
const xChi = (d: DX) => (xN(d) * (d.a * d.d - d.b * d.c) ** 2) / ((d.a + d.b) * (d.c + d.d) * (d.a + d.c) * (d.b + d.d));
const xO = (d: DX) => [d.a, d.b, d.c, d.d];
const xE = (d: DX) => [((d.a + d.b) * (d.a + d.c)) / xN(d), ((d.a + d.b) * (d.b + d.d)) / xN(d), ((d.c + d.d) * (d.a + d.c)) / xN(d), ((d.c + d.d) * (d.b + d.d)) / xN(d)];
const xPhi = (d: DX) => Math.sqrt(xChi(d) / xN(d));
const CHI2 = bau({
  id: 'ps-chi2',
  daten: DATEN_CHI2,
  lage: P('80 Personen mit Prüfungsangst haben entweder an einer Therapie teilgenommen oder auf einer Warteliste gewartet. Danach wurde festgehalten, wer sich gebessert hat. Gerechnet wird der Chi-Quadrat-Test der 2×2-Tabelle: erwartete Häufigkeit, Chi-Quadrat und der Zusammenhang Phi.',
    '80 people with test anxiety either took part in a therapy or waited on a waiting list. Afterwards it was recorded who had improved. The chi-square test of the 2×2 table is calculated: expected frequency, chi-square and the association phi.'),
  tabelle: { titel: P('Besserung nach Gruppe (Personen)', 'Improvement by group (people)'), kopf: [P('Gruppe', 'Group'), P('Gebessert', 'Improved'), P('Nicht gebessert', 'Not improved')],
    zeilen: [[P('Therapie', 'Therapy'), DATEN_CHI2.a, DATEN_CHI2.b], [P('Warteliste', 'Waiting list'), DATEN_CHI2.c, DATEN_CHI2.d]] },
  schritte: [
    { id: 'erwartet', stellen: 0, toleranz: 0.01, soll: xErw,
      frage: P('Wie groß ist die erwartete Häufigkeit in der Zelle „Therapie, gebessert“? Rechnen: Zeilensumme mal Spaltensumme durch Gesamtzahl.', 'How large is the expected frequency in the cell "therapy, improved"? Calculate: row total times column total divided by grand total.'),
      warum: P('Die erwartete Häufigkeit ist die Zahl, die in der Zelle stünde, wenn Therapie und Besserung nichts miteinander zu tun hätten. Der Test prüft, wie weit die beobachteten Häufigkeiten von diesen erwarteten abweichen.',
        'The expected frequency is the number that would stand in the cell if therapy and improvement had nothing to do with each other. The test checks how far the observed frequencies deviate from these expected ones.'),
      tipp: P('Zeilensumme 40, Spaltensumme 50, Gesamtzahl 80.', 'Row total 40, column total 50, grand total 80.'),
      fehler: [{ wert: d => d.a, tipp: P('Das ist die beobachtete Häufigkeit. Gefragt ist die erwartete: Zeilensumme mal Spaltensumme durch Gesamtzahl.', 'That is the observed frequency. The expected one is asked for: row total times column total divided by grand total.') },
        { wert: d => xN(d) / 4, tipp: P('Das wäre die erwartete Häufigkeit bei gleich großen Zeilen und Spalten. Hier sind die Spaltensummen verschieden (50 und 30).', 'That would be the expected frequency with equal rows and columns. Here the column totals differ (50 and 30).') }],
      weg: (d, z) => [P(`Erwartet: ${z(d.a + d.b)} · ${z(d.a + d.c)} : ${z(xN(d))} = ${z(xErw(d))}`, `Expected: ${z(d.a + d.b)} · ${z(d.a + d.c)} : ${z(xN(d))} = ${z(xErw(d))}`)] },
    { id: 'chi2', stellen: 2, toleranz: 0.005, soll: xChi,
      frage: P('Wie groß ist Chi-Quadrat? Rechnen: Summe über alle vier Zellen von (beobachtet minus erwartet) zum Quadrat durch erwartet. Erwartet sind 25, 15, 25 und 15.', 'How large is chi-square? Calculate: sum over all four cells of (observed minus expected) squared divided by expected. Expected are 25, 15, 25 and 15.'),
      warum: P('Jede Zelle trägt ihre quadrierte Abweichung bei, geteilt durch die erwartete Häufigkeit, damit große Zellen nicht allein zählen. Je größer Chi-Quadrat, desto schlechter passen die Daten zur Annahme „kein Zusammenhang“. Bei einer 2×2-Tabelle gilt 1 Freiheitsgrad, die Schranke für p = 0,05 liegt bei 3,84.',
        'Each cell contributes its squared deviation divided by the expected frequency so that large cells do not count alone. The larger chi-square, the worse the data fit the assumption "no association". For a 2×2 table 1 degree of freedom applies, the threshold for p = 0.05 is 3.84.'),
      tipp: P('Die vier Abweichungen sind 5, -5, -5 und 5. Quadrat 25, geteilt durch 25 bzw. 15, dann addieren.', 'The four deviations are 5, -5, -5 and 5. Square 25, divided by 25 or 15, then add.'),
      fehler: [{ wert: d => summe(xO(d).map((o, i) => Math.abs(o - xE(d)[i]!) / xE(d)[i]!)), tipp: P('Hier wurde nicht quadriert. Die Abweichung wird mit sich selbst multipliziert, bevor durch die erwartete Häufigkeit geteilt wird.', 'Here nothing was squared. The deviation is multiplied by itself before dividing by the expected frequency.') },
        { wert: d => summe(xO(d).map((o, i) => (o - xE(d)[i]!) ** 2 / o)), tipp: P('Hier wurde durch die beobachtete statt durch die erwartete Häufigkeit geteilt.', 'Here the division was by the observed instead of the expected frequency.') }],
      weg: (d, z) => [P(`Zellen: ${xO(d).map((o, i) => `${z((o - xE(d)[i]!) ** 2)} : ${z(xE(d)[i]!)}`).join(' + ')}`, `Cells: ${xO(d).map((o, i) => `${z((o - xE(d)[i]!) ** 2)} : ${z(xE(d)[i]!)}`).join(' + ')}`),
        P(`Chi-Quadrat = ${z(xChi(d), 2)}`, `Chi-square = ${z(xChi(d), 2)}`)] },
    { id: 'phi', stellen: 2, toleranz: 0.005, soll: xPhi,
      frage: P('Wie groß ist Phi, der Zusammenhang in der 2×2-Tabelle? Rechnen: Wurzel aus (Chi-Quadrat durch Gesamtzahl).', 'How large is phi, the association in the 2×2 table? Calculate: square root of (chi-square divided by grand total).'),
      warum: P('Chi-Quadrat wächst mit der Personenzahl. Phi teilt sie heraus und zeigt die Stärke des Zusammenhangs zwischen 0 und 1. Ein signifikantes Chi-Quadrat bei kleinem Phi heißt: Der Zusammenhang ist nachweisbar, aber schwach.',
        'Chi-square grows with the number of people. Phi divides this out and shows the strength of the association between 0 and 1. A significant chi-square with a small phi means: the association is detectable but weak.'),
      tipp: P('5,33 durch 80, davon die Wurzel.', '5.33 divided by 80, then the root of that.'),
      fehler: [{ wert: d => xChi(d) / xN(d), tipp: P('Hier fehlt die Wurzel. Phi ist die Wurzel aus Chi-Quadrat durch n.', 'The root is missing here. Phi is the square root of chi-square divided by n.') },
        { wert: d => Math.sqrt(xChi(d)), tipp: P('Hier wurde nicht durch die Gesamtzahl geteilt.', 'Here the division by the grand total is missing.') }],
      weg: (d, z) => [P(`Phi = Wurzel aus (${z(xChi(d), 2)} : ${z(xN(d))}) = ${z(xPhi(d), 2)}`, `Phi = square root of (${z(xChi(d), 2)} : ${z(xN(d))}) = ${z(xPhi(d), 2)}`)] }
  ],
  merke: P('Erwartet = Zeilensumme mal Spaltensumme durch n. Chi-Quadrat = Summe von (beobachtet minus erwartet)² durch erwartet; bei 2×2 mit 1 Freiheitsgrad. Phi = Wurzel aus Chi-Quadrat durch n zeigt die Stärke.',
    'Expected = row total times column total divided by n. Chi-square = sum of (observed minus expected) squared divided by expected; for 2×2 with 1 degree of freedom. Phi = square root of chi-square divided by n shows the strength.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Wer meldet sich freiwillig für Forschung? - echte Studie“ öffnen und im Schritt zur Kreuztabelle das Chi-Quadrat und Cramérs V ansehen.',
    'Next: open the example "Who volunteers for research? - real study" and look at chi-square and Cramér V in the step on the crosstab.')
});

// ---------------------------------------------------------------- 7. Reliable Change Index
/** Eine Person: Angstwert vorher 28, nachher 20; Test mit Standardabweichung 6 und Reliabilität 0,84. */
export const DATEN_RCI = { vorher: 28, nachher: 20, sd: 6, rel: 0.84 };
type DR = typeof DATEN_RCI;
const rSem = (d: DR) => d.sd * Math.sqrt(1 - d.rel);
const rSdiff = (d: DR) => Math.sqrt(2) * rSem(d);
const rRci = (d: DR) => (d.nachher - d.vorher) / rSdiff(d);
const RCI = bau({
  id: 'ps-rci',
  daten: DATEN_RCI,
  lage: P('Bei einer Person sinkt der Wert in einem Angsttest durch eine Therapie von 28 auf 20. Der Test hat in der Normstichprobe die Standardabweichung 6 und die Reliabilität 0,84. Gerechnet wird der Reliable-Change-Index (RCI): Ist die Veränderung größer, als der Messfehler erwarten lässt?',
    'In one person the score in an anxiety test falls from 28 to 20 through a therapy. In the norm sample the test has the standard deviation 6 and the reliability 0.84. The reliable change index (RCI) is calculated: is the change larger than the measurement error leads one to expect?'),
  tabelle: { titel: P('Angabe zur Person und zum Test', 'Information on the person and the test'), kopf: [P('Angabe', 'Item'), P('Wert', 'Value')],
    zeilen: [[P('Wert vorher', 'Score before'), DATEN_RCI.vorher], [P('Wert nachher', 'Score after'), DATEN_RCI.nachher], [P('Standardabweichung des Tests', 'Standard deviation of the test'), DATEN_RCI.sd], [P('Reliabilität des Tests', 'Reliability of the test'), DATEN_RCI.rel]] },
  schritte: [
    { id: 'sem', stellen: 2, toleranz: 0.005, soll: rSem,
      frage: P('Wie groß ist der Standardmessfehler? Rechnen: Standardabweichung mal Wurzel aus (1 minus Reliabilität).', 'How large is the standard error of measurement? Calculate: standard deviation times the square root of (1 minus reliability).'),
      warum: P('Der Standardmessfehler sagt, wie weit ein beobachteter Wert durch Zufallsfehler vom wahren Wert abweichen kann. Je niedriger die Reliabilität, desto größer ist er. Bei einer Reliabilität von 1 wäre er null.',
        'The standard error of measurement says how far an observed score can deviate from the true score through random error. The lower the reliability, the larger it is. With a reliability of 1 it would be zero.'),
      tipp: P('1 minus 0,84 ist 0,16, die Wurzel daraus ist 0,4. Mal 6.', '1 minus 0.84 is 0.16, the root of it is 0.4. Times 6.'),
      fehler: [{ wert: d => d.sd * (1 - d.rel), tipp: P('Hier fehlt die Wurzel aus (1 minus Reliabilität).', 'Here the square root of (1 minus reliability) is missing.') },
        { wert: d => d.sd * Math.sqrt(d.rel), tipp: P('Hier wurde die Wurzel aus der Reliabilität genommen statt aus 1 minus Reliabilität.', 'Here the root of the reliability was taken instead of the root of 1 minus reliability.') }],
      weg: (d, z) => [P(`Standardmessfehler: ${z(d.sd)} · Wurzel aus (1 − ${z(d.rel, 2)}) = ${z(d.sd)} · ${z(Math.sqrt(1 - d.rel), 1)} = ${z(rSem(d), 2)}`, `Standard error of measurement: ${z(d.sd)} · square root of (1 − ${z(d.rel, 2)}) = ${z(d.sd)} · ${z(Math.sqrt(1 - d.rel), 1)} = ${z(rSem(d), 2)}`)] },
    { id: 's-diff', stellen: 2, toleranz: 0.005, soll: rSdiff,
      frage: P('Wie groß ist der Standardfehler der Differenz? Rechnen: Wurzel aus 2 mal Standardmessfehler.', 'How large is the standard error of the difference? Calculate: square root of 2 times standard error of measurement.'),
      warum: P('Eine Veränderung ist die Differenz zweier Messungen, und beide Messungen haben Fehler. Die Fehler addieren sich, darum steht die Wurzel aus 2 in der Formel. Der Messfehler der Differenz ist größer als der einer einzelnen Messung.',
        'A change is the difference of two measurements, and both measurements have error. The errors add up, which is why the square root of 2 is in the formula. The measurement error of the difference is larger than that of a single measurement.'),
      tipp: P('Wurzel aus 2 ist etwa 1,414. Mal 2,4.', 'The square root of 2 is about 1.414. Times 2.4.'),
      fehler: [{ wert: d => rSem(d), tipp: P('Das ist der Standardmessfehler einer einzelnen Messung. Für die Differenz kommt der Faktor Wurzel aus 2 hinzu.', 'That is the standard error of measurement of a single measurement. For the difference the factor square root of 2 comes in.') },
        { wert: d => 2 * rSem(d), tipp: P('Hier wurde mit 2 statt mit der Wurzel aus 2 multipliziert.', 'Here the multiplication was by 2 instead of the square root of 2.') }],
      weg: (d, z) => [P(`Standardfehler der Differenz: Wurzel aus 2 · ${z(rSem(d), 2)} = ${z(rSdiff(d), 2)}`, `Standard error of the difference: square root of 2 · ${z(rSem(d), 2)} = ${z(rSdiff(d), 2)}`)] },
    { id: 'rci', stellen: 2, toleranz: 0.005, soll: rRci,
      frage: P('Wie groß ist der RCI? Rechnen: (Wert nachher minus Wert vorher) geteilt durch den Standardfehler der Differenz.', 'How large is the RCI? Calculate: (score after minus score before) divided by the standard error of the difference.'),
      warum: P('Der RCI zählt, wie viele Standardfehler die Veränderung von null entfernt ist. Ein Betrag über 1,96 gilt als zuverlässige Veränderung (zweiseitig, 5 Prozent). Er sagt nicht, ob die Person danach im gesunden Bereich liegt; das ist die klinische Bedeutsamkeit.',
        'The RCI counts how many standard errors the change lies from zero. An absolute value above 1.96 counts as reliable change (two-sided, 5 percent). It does not say whether the person lies in the healthy range afterwards; that is clinical significance.'),
      tipp: P('Nachher minus vorher ist -8. Durch 3,39 teilen.', 'After minus before is -8. Divide by 3.39.'),
      fehler: [{ wert: d => -rRci(d), tipp: P('Das Vorzeichen ist vertauscht: Nachher minus vorher, bei sinkender Angst also negativ.', 'The sign is swapped: after minus before, so negative with falling anxiety.') },
        { wert: d => (d.nachher - d.vorher) / rSem(d), tipp: P('Hier wurde durch den Standardmessfehler statt durch den Standardfehler der Differenz geteilt.', 'Here the division was by the standard error of measurement instead of the standard error of the difference.') }],
      weg: (d, z) => [P(`RCI = (${z(d.nachher)} − ${z(d.vorher)}) : ${z(rSdiff(d), 2)} = ${z(rRci(d), 2)}`, `RCI = (${z(d.nachher)} − ${z(d.vorher)}) : ${z(rSdiff(d), 2)} = ${z(rRci(d), 2)}`)] }
  ],
  merke: P('Standardmessfehler = Standardabweichung mal Wurzel aus (1 minus Reliabilität). Standardfehler der Differenz = Wurzel aus 2 mal Standardmessfehler. RCI = Veränderung durch Standardfehler der Differenz; ein Betrag über 1,96 gilt als zuverlässig.',
    'Standard error of measurement = standard deviation times the square root of (1 minus reliability). Standard error of the difference = square root of 2 times standard error of measurement. RCI = change divided by standard error of the difference; an absolute value above 1.96 counts as reliable.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Gewichtszunahme bei Anorexie - drei Behandlungen im Vergleich“ öffnen und prüfen, bei welchen Veränderungen ein Maß für zuverlässige Veränderung sinnvoll wäre.',
    'Next: open the example "Weight gain in anorexia - comparing three treatments" and consider for which changes a measure of reliable change would make sense.')
});

// ---------------------------------------------------------------- 8. z-Wert und T-Wert
/** Ein Test mit Mittelwert 50 und Standardabweichung 8 in der Normstichprobe; zwei Personen. */
export const DATEN_ZT = { mittel: 50, sd: 8, a: 62, b: 44 };
type DZ = typeof DATEN_ZT;
const zWert = (d: DZ, x: number) => (x - d.mittel) / d.sd;
const tWert = (d: DZ, x: number) => 50 + 10 * zWert(d, x);
const ZT = bau({
  id: 'ps-z-t',
  daten: DATEN_ZT,
  lage: P('Ein Leistungstest hat in der Normstichprobe den Mittelwert 50 und die Standardabweichung 8. Zwei Personen haben die Rohwerte 62 (Person A) und 44 (Person B). Gerechnet werden z-Wert und T-Wert; der T-Wert ist eine Skala mit Mittelwert 50 und Standardabweichung 10.',
    'A performance test has the mean 50 and the standard deviation 8 in the norm sample. Two people have the raw scores 62 (person A) and 44 (person B). The z score and the T score are calculated; the T score is a scale with mean 50 and standard deviation 10.'),
  tabelle: { titel: P('Norm und Rohwerte', 'Norm and raw scores'), kopf: [P('Angabe', 'Item'), P('Wert', 'Value')],
    zeilen: [[P('Mittelwert der Norm', 'Mean of the norm'), DATEN_ZT.mittel], [P('Standardabweichung der Norm', 'Standard deviation of the norm'), DATEN_ZT.sd], [P('Rohwert Person A', 'Raw score person A'), DATEN_ZT.a], [P('Rohwert Person B', 'Raw score person B'), DATEN_ZT.b]] },
  schritte: [
    { id: 'z-a', stellen: 2, toleranz: 0.005, soll: d => zWert(d, d.a),
      frage: P('Wie groß ist der z-Wert von Person A? Rechnen: (Rohwert minus Mittelwert) durch Standardabweichung.', 'How large is the z score of person A? Calculate: (raw score minus mean) divided by standard deviation.'),
      warum: P('Der z-Wert sagt, um wie viele Standardabweichungen ein Wert vom Mittelwert der Norm entfernt liegt. So lassen sich Werte aus verschiedenen Tests vergleichen, auch wenn ihre Skalen verschieden sind.',
        'The z score says by how many standard deviations a value lies from the mean of the norm. This allows comparing values from different tests even if their scales differ.'),
      tipp: P('62 minus 50 ist 12. 12 durch 8.', '62 minus 50 is 12. 12 divided by 8.'),
      fehler: [{ wert: d => d.a - d.mittel, tipp: P('Das ist nur die Abweichung vom Mittelwert. Sie muss noch durch die Standardabweichung geteilt werden.', 'That is only the deviation from the mean. It still has to be divided by the standard deviation.') },
        { wert: d => (d.a - d.mittel) / (d.sd * d.sd), tipp: P('Hier wurde durch die Varianz statt durch die Standardabweichung geteilt.', 'Here the division was by the variance instead of the standard deviation.') }],
      weg: (d, z) => [P(`z = (${z(d.a)} − ${z(d.mittel)}) : ${z(d.sd)} = ${z(zWert(d, d.a), 2)}`, `z = (${z(d.a)} − ${z(d.mittel)}) : ${z(d.sd)} = ${z(zWert(d, d.a), 2)}`)] },
    { id: 't-a', stellen: 0, toleranz: 0.01, soll: d => tWert(d, d.a),
      frage: P('Wie groß ist der T-Wert von Person A? Rechnen: 50 plus 10 mal z.', 'How large is the T score of person A? Calculate: 50 plus 10 times z.'),
      warum: P('Der T-Wert legt den z-Wert auf eine Skala mit Mittelwert 50 und Standardabweichung 10. Er hat keine Vorzeichen und weniger Dezimalstellen, darum wird er in der Diagnostik gern berichtet.',
        'The T score places the z score on a scale with mean 50 and standard deviation 10. It has no signs and fewer decimals, which is why it is often reported in diagnostics.'),
      tipp: P('10 mal 1,5 ist 15, plus 50.', '10 times 1.5 is 15, plus 50.'),
      fehler: [{ wert: d => 50 + zWert(d, d.a), tipp: P('Hier wurde z nicht mit 10 multipliziert.', 'Here z was not multiplied by 10.') },
        { wert: d => 10 * zWert(d, d.a), tipp: P('Hier fehlt die 50 am Anfang: T ist 50 plus 10 mal z.', 'The 50 at the start is missing here: T is 50 plus 10 times z.') }],
      weg: (d, z) => [P(`T = 50 + 10 · ${z(zWert(d, d.a), 2)} = ${z(tWert(d, d.a), 0)}`, `T = 50 + 10 · ${z(zWert(d, d.a), 2)} = ${z(tWert(d, d.a), 0)}`)] },
    { id: 'z-b', stellen: 2, toleranz: 0.005, soll: d => zWert(d, d.b),
      frage: P('Wie groß ist der z-Wert von Person B?', 'How large is the z score of person B?'),
      warum: P('Liegt ein Wert unter dem Mittelwert, ist z negativ. Das Vorzeichen zeigt die Richtung, der Betrag den Abstand in Standardabweichungen. Person B liegt unter dem Durchschnitt der Norm.',
        'If a value lies below the mean, z is negative. The sign shows the direction, the absolute value the distance in standard deviations. Person B lies below the average of the norm.'),
      tipp: P('44 minus 50 ist -6. -6 durch 8.', '44 minus 50 is -6. -6 divided by 8.'),
      fehler: [{ wert: d => -zWert(d, d.b), tipp: P('Das Vorzeichen ist vertauscht: Der Rohwert liegt unter dem Mittelwert, also ist z negativ.', 'The sign is swapped: the raw score lies below the mean, so z is negative.') }],
      weg: (d, z) => [P(`z = (${z(d.b)} − ${z(d.mittel)}) : ${z(d.sd)} = ${z(zWert(d, d.b), 2)}`, `z = (${z(d.b)} − ${z(d.mittel)}) : ${z(d.sd)} = ${z(zWert(d, d.b), 2)}`)] },
    { id: 't-b', stellen: 1, toleranz: 0.05, soll: d => tWert(d, d.b),
      frage: P('Wie groß ist der T-Wert von Person B?', 'How large is the T score of person B?'),
      warum: P('Auch hier gilt 50 plus 10 mal z. Der T-Wert von Person B liegt unter 50, weil ihr Rohwert unter dem Mittelwert der Norm liegt. Der Abstand der beiden Personen beträgt in T-Punkten mehr als 20.',
        'Here too 50 plus 10 times z applies. The T score of person B lies below 50 because her raw score lies below the mean of the norm. The distance between the two people is more than 20 in T points.'),
      tipp: P('10 mal -0,75 ist -7,5. 50 minus 7,5.', '10 times -0.75 is -7.5. 50 minus 7.5.'),
      fehler: [{ wert: d => 50 + 10 * Math.abs(zWert(d, d.b)), tipp: P('Hier wurde das Vorzeichen von z weggelassen. Person B liegt unter dem Durchschnitt, also unter 50.', 'Here the sign of z was left out. Person B lies below average, so below 50.') }],
      weg: (d, z) => [P(`T = 50 + 10 · (${z(zWert(d, d.b), 2)}) = ${z(tWert(d, d.b), 1)}`, `T = 50 + 10 · (${z(zWert(d, d.b), 2)}) = ${z(tWert(d, d.b), 1)}`)] }
  ],
  merke: P('z = (Rohwert minus Mittelwert) durch Standardabweichung. T = 50 plus 10 mal z. Beide zeigen, wo ein Wert in der Norm liegt; ob der Wert für die Person etwas bedeutet, hängt vom Test und seiner Gültigkeit ab.',
    'z = (raw score minus mean) divided by standard deviation. T = 50 plus 10 times z. Both show where a value lies in the norm; whether the value means something for the person depends on the test and its validity.'),
  ausprobieren: P('Als Nächstes: im Beispiel „Wie hängen zwei Studierfähigkeitstests zusammen? - echte Testwerte“ die Verteilung der ACT-Punkte ansehen und für eine Person den z-Wert von Hand bestimmen.',
    'Next: in the example "How do two aptitude tests relate? - real test scores" look at the distribution of the ACT points and determine the z score for one person by hand.')
});

// ---------------------------------------------------------------- 9. Eta² und F einer Varianzanalyse
/** Drei Trainingsformen mit je vier Personen, Angstwert nach dem Training (Zeilen = Personen). */
export const DATEN_ETA2 = { gruppen: [[4, 6, 7, 7], [6, 9, 8, 9], [8, 10, 11, 11]] };
type DE = typeof DATEN_ETA2;
const eAlle = (d: DE) => d.gruppen.flat();
const eZwischen = (d: DE) => summe(d.gruppen.map(g => g.length * (mittel(g) - mittel(eAlle(d))) ** 2));
const eInnen = (d: DE) => summe(d.gruppen.map(g => quadratsumme(g)));
const eEta2 = (d: DE) => eZwischen(d) / (eZwischen(d) + eInnen(d));
const eF = (d: DE) => (eZwischen(d) / (d.gruppen.length - 1)) / (eInnen(d) / (eAlle(d).length - d.gruppen.length));
const ETA2 = bau({
  id: 'ps-eta2',
  daten: DATEN_ETA2,
  lage: P('Drei Trainingsformen gegen Prüfungsangst wurden mit je vier Personen erprobt; gemessen wurde ein Angstwert nach dem Training. Die Varianzanalyse zerlegt die Streuung in einen Teil zwischen den Gruppen und einen Teil innerhalb der Gruppen. Gerechnet werden diese Quadratsummen, Eta² und F.',
    'Three forms of training against test anxiety were tried with four people each; an anxiety score was measured after the training. The analysis of variance splits the spread into a part between the groups and a part within the groups. These sums of squares, eta squared and F are calculated.'),
  tabelle: { titel: P('Angstwert nach dem Training', 'Anxiety score after the training'), kopf: [P('Person', 'Person'), P('Form 1', 'Form 1'), P('Form 2', 'Form 2'), P('Form 3', 'Form 3')], zeilen: [0, 1, 2, 3].map(i => [`${i + 1}`, ...DATEN_ETA2.gruppen.map(g => g[i]!)]) },
  schritte: [
    { id: 'ss-zwischen', stellen: 0, toleranz: 0.01, soll: eZwischen,
      frage: P('Wie groß ist die Quadratsumme zwischen den Gruppen? Rechnen: je Gruppe n mal (Gruppenmittelwert minus Gesamtmittelwert) zum Quadrat, dann addieren. Die Gruppenmittelwerte sind 6, 8 und 10, der Gesamtmittelwert ist 8.', 'How large is the sum of squares between the groups? Calculate: for each group n times (group mean minus grand mean) squared, then add. The group means are 6, 8 and 10, the grand mean is 8.'),
      warum: P('Die Quadratsumme zwischen den Gruppen misst, wie stark sich die Gruppenmittelwerte voneinander unterscheiden. Sie ist der Teil der Streuung, den die Gruppenzugehörigkeit erklärt.',
        'The sum of squares between the groups measures how strongly the group means differ from one another. It is the part of the spread that group membership explains.'),
      tipp: P('4 mal 4, plus 4 mal 0, plus 4 mal 4.', '4 times 4, plus 4 times 0, plus 4 times 4.'),
      fehler: [{ wert: d => summe(d.gruppen.map(g => (mittel(g) - mittel(eAlle(d))) ** 2)), tipp: P('Hier fehlt die Multiplikation mit der Gruppengröße n = 4.', 'The multiplication by the group size n = 4 is missing here.') }],
      weg: (d, z) => [P(`Zwischen: ${d.gruppen.map(g => `${z(g.length)} · (${z(mittel(g))} − ${z(mittel(eAlle(d)))})²`).join(' + ')} = ${z(eZwischen(d))}`, `Between: ${d.gruppen.map(g => `${z(g.length)} · (${z(mittel(g))} − ${z(mittel(eAlle(d)))})²`).join(' + ')} = ${z(eZwischen(d))}`)] },
    { id: 'ss-innerhalb', stellen: 0, toleranz: 0.01, soll: eInnen,
      frage: P('Wie groß ist die Quadratsumme innerhalb der Gruppen? Rechnen: je Gruppe die quadrierten Abweichungen vom eigenen Gruppenmittelwert, dann addieren.', 'How large is the sum of squares within the groups? Calculate: for each group the squared deviations from its own group mean, then add.'),
      warum: P('Innerhalb jeder Gruppe unterscheiden sich die Personen, obwohl sie dieselbe Behandlung bekamen. Diese Streuung bleibt unerklärt und dient als Vergleichsmaßstab: Der Unterschied zwischen den Gruppen muss groß gegen sie sein.',
        'Within each group the people differ although they received the same treatment. This spread stays unexplained and serves as a yardstick: the difference between the groups has to be large against it.'),
      tipp: P('Jede Gruppe hat die Quadratsumme 6. Dreimal 6.', 'Each group has the sum of squares 6. Three times 6.'),
      fehler: [{ wert: d => quadratsumme(eAlle(d)), tipp: P('Das ist die gesamte Quadratsumme vom Gesamtmittelwert. Gefragt sind die Abweichungen vom Mittelwert der eigenen Gruppe.', 'That is the total sum of squares from the grand mean. The deviations from the mean of the own group are asked for.') }],
      weg: (d, z) => [P(`Innerhalb: ${d.gruppen.map(g => z(quadratsumme(g))).join(' + ')} = ${z(eInnen(d))}`, `Within: ${d.gruppen.map(g => z(quadratsumme(g))).join(' + ')} = ${z(eInnen(d))}`)] },
    { id: 'eta2', stellen: 2, toleranz: 0.005, soll: eEta2,
      frage: P('Wie groß ist Eta²? Rechnen: Quadratsumme zwischen geteilt durch die gesamte Quadratsumme (zwischen plus innerhalb).', 'How large is eta squared? Calculate: sum of squares between divided by the total sum of squares (between plus within).'),
      warum: P('Eta² ist der Anteil der gesamten Streuung, den die Gruppenzugehörigkeit erklärt. Es ist ein Effektmaß und hängt anders als p nicht von der Stichprobengröße ab. Als Faustregel gelten 0,01 als klein, 0,06 als mittel und 0,14 als groß.',
        'Eta squared is the share of the total spread that group membership explains. It is an effect measure and, unlike p, does not depend on the sample size. As a rule of thumb 0.01 counts as small, 0.06 as medium and 0.14 as large.'),
      tipp: P('32 durch (32 plus 18).', '32 divided by (32 plus 18).'),
      fehler: [{ wert: d => eZwischen(d) / eInnen(d), tipp: P('Hier wurde durch die Quadratsumme innerhalb statt durch die gesamte geteilt.', 'Here the division was by the sum of squares within instead of the total.') },
        { wert: d => eInnen(d) / (eZwischen(d) + eInnen(d)), tipp: P('Das ist der Anteil der unerklärten Streuung, der Rest nach Eta².', 'That is the share of unexplained spread, the remainder after eta squared.') }],
      weg: (d, z) => [P(`Eta² = ${z(eZwischen(d))} : (${z(eZwischen(d))} + ${z(eInnen(d))}) = ${z(eEta2(d), 2)}`, `Eta squared = ${z(eZwischen(d))} : (${z(eZwischen(d))} + ${z(eInnen(d))}) = ${z(eEta2(d), 2)}`)] },
    { id: 'f', stellen: 0, toleranz: 0.01, soll: eF,
      frage: P('Wie groß ist F? Rechnen: (Quadratsumme zwischen durch 2) geteilt durch (Quadratsumme innerhalb durch 9). Die Freiheitsgrade sind 3 Gruppen minus 1 = 2 und 12 Personen minus 3 Gruppen = 9.', 'How large is F? Calculate: (sum of squares between divided by 2) divided by (sum of squares within divided by 9). The degrees of freedom are 3 groups minus 1 = 2 and 12 people minus 3 groups = 9.'),
      warum: P('F vergleicht die mittlere Streuung zwischen den Gruppen mit der mittleren Streuung innerhalb der Gruppen. Ein F weit über 1 spricht dafür, dass die Gruppen nicht gleich sind. Welche sich unterscheiden, zeigen erst die Paarvergleiche.',
        'F compares the mean spread between the groups with the mean spread within the groups. An F far above 1 speaks for the groups not being equal. Which ones differ is shown only by the pairwise comparisons.'),
      tipp: P('32 durch 2 ist 16, 18 durch 9 ist 2. 16 durch 2.', '32 divided by 2 is 16, 18 divided by 9 is 2. 16 divided by 2.'),
      fehler: [{ wert: d => eZwischen(d) / eInnen(d), tipp: P('Hier wurden die Quadratsummen nicht durch ihre Freiheitsgrade geteilt.', 'Here the sums of squares were not divided by their degrees of freedom.') },
        { wert: d => eZwischen(d) / (eInnen(d) / (eAlle(d).length - d.gruppen.length)), tipp: P('Hier wurde die Quadratsumme zwischen nicht durch ihre 2 Freiheitsgrade geteilt.', 'Here the sum of squares between was not divided by its 2 degrees of freedom.') }],
      weg: (d, z) => [P(`F = (${z(eZwischen(d))} : ${z(d.gruppen.length - 1)}) : (${z(eInnen(d))} : ${z(eAlle(d).length - d.gruppen.length)}) = ${z(eZwischen(d) / (d.gruppen.length - 1))} : ${z(eInnen(d) / (eAlle(d).length - d.gruppen.length))} = ${z(eF(d), 0)}`, `F = (${z(eZwischen(d))} : ${z(d.gruppen.length - 1)}) : (${z(eInnen(d))} : ${z(eAlle(d).length - d.gruppen.length)}) = ${z(eZwischen(d) / (d.gruppen.length - 1))} : ${z(eInnen(d) / (eAlle(d).length - d.gruppen.length))} = ${z(eF(d), 0)}`)] }
  ],
  merke: P('Zwischen und innerhalb bilden zusammen die gesamte Quadratsumme. Eta² = zwischen durch gesamt (erklärter Anteil). F = mittlere Streuung zwischen durch mittlere Streuung innerhalb, mit den Freiheitsgraden Gruppen minus 1 und Personen minus Gruppen.',
    'Between and within together make up the total sum of squares. Eta squared = between divided by total (explained share). F = mean spread between divided by mean spread within, with the degrees of freedom groups minus 1 and people minus groups.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Wie lassen sich Wörter am besten merken? - echtes Experiment“ öffnen und im Schritt „Drei Darbietungsformen vergleichen (Varianzanalyse mit Post-hoc)“ F und Eta² ansehen.',
    'Next: open the example "How are words best remembered? - real experiment" and look at F and eta squared in the step "Comparing three presentation forms (analysis of variance with post hoc)".')
});

// ---------------------------------------------------------------- 10. Spearman-Brown (Testhalbierung)
/** Sechs Personen: Summe der ersten und der zweiten Testhälfte (Punkte). */
export const DATEN_SB = { h1: [10, 14, 8, 12, 6, 10], h2: [9, 15, 7, 10, 7, 12] };
type DS = typeof DATEN_SB;
const sSxy = (d: DS) => summe(d.h1.map((v, i) => (v - mittel(d.h1)) * (d.h2[i]! - mittel(d.h2))));
const sR = (d: DS) => sSxy(d) / Math.sqrt(quadratsumme(d.h1) * quadratsumme(d.h2));
const sVoll = (d: DS) => (2 * sR(d)) / (1 + sR(d));
const sDrei = (d: DS) => (3 * sVoll(d)) / (1 + 2 * sVoll(d));
const SPEARMAN = bau({
  id: 'ps-spearman-brown',
  daten: DATEN_SB,
  lage: P('Ein Test wurde in zwei Hälften geteilt (erste und zweite Hälfte der Fragen). Sechs Personen haben je Hälfte eine Punktsumme. Die Korrelation der Hälften gilt nur für den halben Test; die Spearman-Brown-Formel rechnet daraus die Zuverlässigkeit des ganzen Tests und eines dreimal so langen Tests.',
    'A test was split into two halves (first and second half of the questions). Six people have a sum of points for each half. The correlation of the halves applies only to the half test; the Spearman-Brown formula turns it into the reliability of the whole test and of a test three times as long.'),
  tabelle: { titel: P('Punktsummen der Testhälften', 'Sum scores of the test halves'), kopf: [P('Person', 'Person'), P('Erste Hälfte', 'First half'), P('Zweite Hälfte', 'Second half')], zeilen: DATEN_SB.h1.map((v, i) => [`${i + 1}`, v, DATEN_SB.h2[i]!]) },
  schritte: [
    { id: 'r-hh', stellen: 2, toleranz: 0.005, soll: sR,
      frage: P('Wie groß ist die Korrelation der beiden Hälften? Die Quadratsummen sind 40 und 48, die Summe der Produkte der Abweichungen ist 38.', 'How large is the correlation of the two halves? The sums of squares are 40 and 48, the sum of the products of the deviations is 38.'),
      warum: P('Die Korrelation der Hälften zeigt, wie ähnlich beide Hälften messen. Sie gilt aber nur für Tests mit der halben Länge. Ein längerer Test ist zuverlässiger, darum muss sie auf die volle Länge hochgerechnet werden.',
        'The correlation of the halves shows how similarly both halves measure. But it applies only to tests of half the length. A longer test is more reliable, so it has to be projected to the full length.'),
      tipp: P('38 geteilt durch die Wurzel aus (40 mal 48), also durch die Wurzel aus 1920.', '38 divided by the square root of (40 times 48), that is by the square root of 1920.'),
      fehler: [{ wert: d => sSxy(d) / (quadratsumme(d.h1) * quadratsumme(d.h2)), tipp: P('Hier fehlt die Wurzel aus dem Produkt der beiden Quadratsummen.', 'Here the square root of the product of the two sums of squares is missing.') },
        { wert: d => sR(d) ** 2, tipp: P('Das ist r im Quadrat. Gefragt ist r selbst.', 'That is r squared. r itself is asked for.') }],
      weg: (d, z) => [P(`r = ${z(sSxy(d))} : Wurzel aus (${z(quadratsumme(d.h1))} · ${z(quadratsumme(d.h2))}) = ${z(sSxy(d))} : ${z(Math.sqrt(quadratsumme(d.h1) * quadratsumme(d.h2)), 2)} = ${z(sR(d), 2)}`, `r = ${z(sSxy(d))} : square root of (${z(quadratsumme(d.h1))} · ${z(quadratsumme(d.h2))}) = ${z(sSxy(d))} : ${z(Math.sqrt(quadratsumme(d.h1) * quadratsumme(d.h2)), 2)} = ${z(sR(d), 2)}`)] },
    { id: 'sb-voll', stellen: 2, toleranz: 0.005, soll: sVoll,
      frage: P('Wie groß ist die Zuverlässigkeit des ganzen Tests nach Spearman-Brown? Rechnen: 2 mal r durch (1 plus r).', 'How large is the reliability of the whole test according to Spearman-Brown? Calculate: 2 times r divided by (1 plus r).'),
      warum: P('Die Formel nimmt an, dass beide Hälften gleich gut messen. Verdoppelt man die Länge, wächst die wahre Streuung stärker als der Zufallsfehler; darum liegt der Wert für den ganzen Test über der Korrelation der Hälften.',
        'The formula assumes that both halves measure equally well. If the length is doubled, the true spread grows more strongly than the random error; therefore the value for the whole test lies above the correlation of the halves.'),
      tipp: P('2 mal 0,867 ist 1,734; 1 plus 0,867 ist 1,867.', '2 times 0.867 is 1.734; 1 plus 0.867 is 1.867.'),
      fehler: [{ wert: d => sR(d), tipp: P('Das ist die Korrelation der Hälften selbst. Die Hochrechnung auf den ganzen Test fehlt.', 'That is the correlation of the halves itself. The projection to the whole test is missing.') },
        { wert: d => 2 * sR(d), tipp: P('Hier fehlt das Teilen durch (1 plus r). Ein Wert über 1 kann keine Zuverlässigkeit sein.', 'Here the division by (1 plus r) is missing. A value above 1 cannot be a reliability.') }],
      weg: (d, z) => [P(`Zuverlässigkeit: 2 · ${z(sR(d), 2)} : (1 + ${z(sR(d), 2)}) = ${z(2 * sR(d), 2)} : ${z(1 + sR(d), 2)} = ${z(sVoll(d), 2)}`, `Reliability: 2 · ${z(sR(d), 2)} : (1 + ${z(sR(d), 2)}) = ${z(2 * sR(d), 2)} : ${z(1 + sR(d), 2)} = ${z(sVoll(d), 2)}`)] },
    { id: 'sb-dreifach', stellen: 2, toleranz: 0.005, soll: sDrei,
      frage: P('Wie groß wäre die Zuverlässigkeit eines Tests, der dreimal so lang ist wie der ganze Test? Rechnen: 3 mal r(ganz) durch (1 plus 2 mal r(ganz)).', 'How large would the reliability be of a test three times as long as the whole test? Calculate: 3 times r(whole) divided by (1 plus 2 times r(whole)).'),
      warum: P('Allgemein gilt für die Verlängerung auf das k-Fache: k mal r durch (1 plus (k minus 1) mal r). Der Gewinn wird kleiner, je höher die Zuverlässigkeit schon ist. Die Formel setzt voraus, dass die zusätzlichen Fragen genauso gut sind wie die vorhandenen.',
        'In general the lengthening to k times applies: k times r divided by (1 plus (k minus 1) times r). The gain gets smaller the higher the reliability already is. The formula assumes that the additional questions are as good as the existing ones.'),
      tipp: P('3 mal 0,929 ist 2,787; 1 plus 2 mal 0,929 ist 2,858.', '3 times 0.929 is 2.787; 1 plus 2 times 0.929 is 2.858.'),
      fehler: [{ wert: d => (3 * sR(d)) / (1 + 2 * sR(d)), tipp: P('Hier wurde mit der Korrelation der Hälften gerechnet. Es soll die Zuverlässigkeit des ganzen Tests eingesetzt werden.', 'Here the correlation of the halves was used. The reliability of the whole test is to be inserted.') },
        { wert: d => 3 * sVoll(d), tipp: P('Hier fehlt das Teilen durch (1 plus 2 mal r). Zuverlässigkeit kann nicht über 1 liegen.', 'Here the division by (1 plus 2 times r) is missing. Reliability cannot lie above 1.') }],
      weg: (d, z) => [P(`Dreifach: 3 · ${z(sVoll(d), 2)} : (1 + 2 · ${z(sVoll(d), 2)}) = ${z(3 * sVoll(d), 2)} : ${z(1 + 2 * sVoll(d), 2)} = ${z(sDrei(d), 2)}`, `Threefold: 3 · ${z(sVoll(d), 2)} : (1 + 2 · ${z(sVoll(d), 2)}) = ${z(3 * sVoll(d), 2)} : ${z(1 + 2 * sVoll(d), 2)} = ${z(sDrei(d), 2)}`)] }
  ],
  merke: P('Ganzer Test = 2 mal r durch (1 plus r), mit r als Korrelation der Hälften. Auf das k-Fache: k mal r durch (1 plus (k minus 1) mal r). Die Formel setzt gleich gute Hälften und gleich gute neue Fragen voraus.',
    'Whole test = 2 times r divided by (1 plus r), with r as the correlation of the halves. To k times: k times r divided by (1 plus (k minus 1) times r). The formula assumes equally good halves and equally good new questions.'),
  ausprobieren: P('Als Nächstes: das Beispiel „Drang zur Schlankheit - eine Skala aus sieben Fragen“ öffnen und prüfen, wie Cronbachs Alpha und die Zuverlässigkeit nach einer Testhalbierung zusammenpassen.',
    'Next: open the example "Drive for thinness - a scale of seven questions" and check how Cronbach alpha and the reliability after a split-half fit together.')
});

export const AUFGABEN_PSYCH: Rechenaufgabe[] = [MITTEL_SD, T_GEPAART, COHEN_D, KORR, ALPHA, CHI2, RCI, ZT, ETA2, SPEARMAN];
