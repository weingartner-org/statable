/**
 * Üben: Hängen zwei Dinge zusammen? (Korrelation nach Pearson und Spearman, Kausalität, Drittvariable, Streudiagramm, geradlinig).
 * Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R,
 * Daten: datasets::anscombe, cars, mtcars, iris, ToothGrowth).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, zd, ze, zn, zp } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const HK = ['frage-zusammenhang', 'korrelation'];

const QUELLE_ANSCOMBE = P(
  'Daten: datasets::anscombe (Anscombe 1973; Teil von R, Lizenz GPL), vier Datensätze mit je 11 Wertepaaren. Berechnet mit R.',
  'Data: datasets::anscombe (Anscombe 1973; part of R, licence GPL), four data sets of 11 pairs each. Computed with R.');
const QUELLE_CARS = P(
  `Daten: datasets::cars (Ezekiel 1930; Teil von R, Lizenz GPL), ${zn('rb_n')} Fahrversuche aus den 1920er Jahren, Geschwindigkeit in Meilen pro Stunde. Berechnet mit R.`,
  `Data: datasets::cars (Ezekiel 1930; part of R, licence GPL), ${zn('rb_n')} driving trials from the 1920s, speed in miles per hour. Computed with R.`);
const QUELLE_MT = P(
  'Daten: datasets::mtcars (Henderson und Velleman 1981; Teil von R, Lizenz GPL), Wagen der Baujahre 1973/74. Berechnet mit R.',
  'Data: datasets::mtcars (Henderson and Velleman 1981; part of R, licence GPL), cars of model years 1973/74. Computed with R.');
const QUELLE_IRIS = P(
  'Daten: datasets::iris (Anderson 1935, Fisher 1936; Teil von R, Lizenz GPL), 150 Schwertlilien dreier Arten, Länge und Breite des Kelchblatts. Berechnet mit R.',
  'Data: datasets::iris (Anderson 1935, Fisher 1936; part of R, licence GPL), 150 irises of three species, sepal length and width. Computed with R.');
const QUELLE_ZAHN = P(
  `Daten: datasets::ToothGrowth (Bliss 1952; Teil von R, Lizenz GPL), ${zn('rz_n')} Meerschweinchen, Zahnlänge. Berechnet mit R.`,
  `Data: datasets::ToothGrowth (Bliss 1952; part of R, licence GPL), ${zn('rz_n')} guinea pigs, tooth length. Computed with R.`);

const QUELLE_TREES = P(
  `Daten: datasets::trees (Meyer 1953; Ryan, Joiner und Ryan 1976; Teil von R, Lizenz GPL), ${zn('kt_n')} gefällte Schwarzkirschbäume: Umfang in Zoll und Höhe in Fuß. Berechnet mit R.`,
  `Data: datasets::trees (Meyer 1953; Ryan, Joiner and Ryan 1976; part of R, licence GPL), ${zn('kt_n')} felled black cherry trees: girth in inches and height in feet. Computed with R.`);
const QUELLE_TITANIC_PHI = P(
  `Daten: datasets::Titanic (British Board of Trade 1990; Dawson 1995; Teil von R, Lizenz GPL), erwachsene Reisende und Besatzung (${zn('ph_n')} Personen), Geschlecht und Überleben. Berechnet mit R.`,
  `Data: datasets::Titanic (British Board of Trade 1990; Dawson 1995; part of R, licence GPL), adult passengers and crew (${zn('ph_n')} people), sex and survival. Computed with R.`);

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'kor-anscombe': {
    titel: P('Vier Datensätze mit je 11 Wertepaaren. Im Streudiagramm ist Datensatz 1 eine lockere Gerade, Datensatz 2 ein glatter Bogen, Datensatz 3 eine Gerade mit einem Punkt weit daneben, und in Datensatz 4 haben zehn Punkte denselben x-Wert und ein Punkt liegt weit rechts',
      'Four data sets of 11 pairs each. In the scatter plot data set 1 is a loose straight line, data set 2 a smooth arc, data set 3 a straight line with one point far off, and in data set 4 ten points share the same x value and one point lies far to the right'),
    tabellen: [tab('kor-anscombe.0', [P('Datensatz', 'Data set'), P('n', 'n'), P('r', 'r'), P('Steigung der Geraden', 'Slope of the line'), P('Mittelwert x', 'Mean x'), P('Mittelwert y', 'Mean y')], QUELLE_ANSCOMBE, P('Kennzahlen der vier Datensätze', 'Figures of the four data sets'))]
  },
  'kor-cars': {
    titel: P('Fahrversuche: Bremsweg (in Fuß) und Geschwindigkeit (in Meilen pro Stunde), 50 Versuche', 'Driving trials: stopping distance (in feet) and speed (in miles per hour), 50 trials'),
    tabellen: [
      tab('kor-cars.0', [P('Maß', 'Measure'), P('n', 'n'), P('Koeffizient', 'Coefficient'), P('Koeffizient zum Quadrat', 'Coefficient squared'), P('95-%-Intervall unten', '95% interval lower'), P('95-%-Intervall oben', '95% interval upper'), P('Sig.', 'Sig.')], QUELLE_CARS, P('Korrelation von Geschwindigkeit und Bremsweg', 'Correlation of speed and stopping distance')),
      tab('kor-cars.1', [P('Auswahl', 'Selection'), P('n', 'n'), P('Spanne der Geschwindigkeit', 'Range of speed'), P('r', 'r')], QUELLE_CARS, P('Alle Versuche und nur Versuche bis 15 Meilen pro Stunde', 'All trials and only trials up to 15 miles per hour'))
    ]
  },
  'kor-mtcars': {
    titel: P(`Meilen je Gallone (mpg; mehr Meilen heißt sparsamer), Leistung (hp) und Gewicht (wt) von ${zn('km_n')} Wagen`, `Miles per gallon (mpg; more miles means more economical), power (hp) and weight (wt) of ${zn('km_n')} cars`),
    tabellen: [tab('kor-mtcars.0', [P('Größen', 'Variables'), P('r', 'r')], QUELLE_MT, P('Korrelationen; in der letzten Zeile ist das Gewicht herausgerechnet', 'Correlations; in the last row weight is partialled out'))]
  },
  'kor-trees': {
    titel: P('Umfang und Höhe von 31 Bäumen: Test des Zusammenhangs', 'Girth and height of 31 trees: test of the relationship'),
    tabellen: [
      tab('kor-trees.0', [P('Maß', 'Measure'), P('Wert', 'Value'), P('t', 't'), P('Freiheitsgrade', 'Degrees of freedom'), P('Sig.', 'Sig.')], QUELLE_TREES, P('Test von Pearsons r, Steigungstest und Spearmans r_s (t-Näherung)', 'Test of Pearson\'s r, slope test and Spearman\'s r_s (t approximation)'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Fall A: Anscombe ----
  {
    id: 'kor-a-gleich', thema: 'korrelation', fall: 'kor-anscombe',
    stamm: P(`Die vier Datensätze haben r = ${zd('ka_r', 3)}, ${zd('ka_r', 3)}, ${zd('ka_r', 3)} und ${zd('ka_r4', 3)}. Was folgt daraus?`, `The four data sets have r = ${ze('ka_r', 3)}, ${ze('ka_r', 3)}, ${ze('ka_r', 3)} and ${ze('ka_r4', 3)}. What follows from that?`),
    antworten: [
      a(P('Über die Form der Punktwolke folgt nichts; sie ist im Streudiagramm zu prüfen', 'Nothing follows about the shape of the cloud; check it in the scatter plot'),
        P('Dasselbe r kann zu ganz verschiedenen Punktwolken gehören. Auch Steigung und Mittelwerte sind in der Tabelle gleich.', 'The same r can belong to very different point clouds. Slope and means are also the same in the table.'), true),
      a(P('Die vier Punktwolken sehen im Streudiagramm gleich aus, aber mit anderen Zahlen', 'The four point clouds look the same in the scatter plot, but with different numbers'),
        P('Datensatz 2 ist ein Bogen, Datensatz 3 hat einen Ausreißer, Datensatz 4 hängt an einem einzelnen Punkt.', 'Data set 2 is an arc, data set 3 has an outlier, data set 4 hangs on a single point.')),
      a(P('In den vier Datensätzen ist der Zusammenhang gleich eng und geradlinig', 'In the four data sets the relation is equally close and runs in a straight line'),
        P('Nur Datensatz 1 zeigt eine lockere Gerade; die anderen weichen von einer Geraden ab.', 'Only data set 1 shows a loose straight line; the others depart from a straight line.'))
    ],
    hilfe: HK, karte: 'zusammenhang', probieren: 'gerade', belege: ['wissen:r-definition-eigenschaften', 'wissen:r-stichprobeneffekte', 'Anscombe 1973']
  },
  {
    id: 'kor-a-bogen', thema: 'korrelation', fall: 'kor-anscombe',
    stamm: P(`Datensatz 2 liegt auf einem glatten Bogen. Was zeigt r = ${zd('ka_r', 3)} dort?`, `Data set 2 lies on a smooth arc. What does r = ${ze('ka_r', 3)} show there?`),
    antworten: [
      a(P('Den geradlinigen Anteil; die Beziehung ist eng, aber gekrümmt', 'The straight-line part; the relation is close, but curved'),
        P(`Eine Parabel durch die Punkte erklärt fast alles (R² = ${zd('ka_q2', 3)}). r misst nur die geradlinige Beziehung.`, `A parabola through the points explains almost everything (R² = ${ze('ka_q2', 3)}). r measures only the straight-line relation.`), true),
      a(P('Einen lockeren Zusammenhang, denn die Punkte streuen weit', 'A loose relation, since the points scatter widely'),
        P('Die Punkte folgen dem Bogen eng. Dass r unter 1 liegt, kommt von der Krümmung, nicht von Streuung um den Bogen.', 'The points follow the arc closely. That r is below 1 comes from the curvature, not from scatter around the arc.')),
      a(P('Keinen Zusammenhang, denn die Punkte liegen auf keiner Geraden', 'No relation, since the points do not follow a straight line'),
        P('Ein hohes r ist hier vorhanden, und der Zusammenhang ist eng. Er ist nur gekrümmt.', 'A high r is present here, and the relation is close. It is just curved.'))
    ],
    hilfe: HK, probieren: 'gerade', belege: ['wissen:r-definition-eigenschaften', 'wissen:kovarianz-massstab', 'Anscombe 1973']
  },
  {
    id: 'kor-a-ausreisser', thema: 'korrelation', fall: 'kor-anscombe',
    stamm: P(`In Datensatz 3 liegt ein Punkt weit von der Geraden. Die Tabelle zeigt r mit diesem Punkt; ohne ihn ergibt sich (nachgerechnet, auf drei Stellen gerundet) r = ${zd('ka_r3_ohne', 3)}. Was zeigt das?`, `In data set 3 one point lies far from the line. The table shows r with this point; without it (recomputed, rounded to three decimals) r = ${ze('ka_r3_ohne', 3)}. What does that show?`),
    antworten: [
      a(P('Ein einzelner Punkt kann r stark senken; er gehört geprüft, nicht gelöscht', 'A single point can lower r strongly; examine it, do not delete it'),
        P(`Mit dem Punkt ${zd('ka_r', 3)}, ohne ihn ${zd('ka_r3_ohne', 3)}: Einzelne Punkte können r stark verändern. Ob er ein Fehler ist, klärt der Sachverstand.`, `With the point ${ze('ka_r', 3)}, without it ${ze('ka_r3_ohne', 3)}: single points can change r strongly. Whether it is an error is decided by subject knowledge.`), true),
      a(P('Der Punkt kann gelöscht werden, denn er verfälscht den wahren Zusammenhang der übrigen', 'The point can be deleted, since it distorts the true relation of the rest'),
        P('Löschen nach Bedarf verfälscht selbst. Erst die Prüfung auf Messfehler oder andere Herkunft rechtfertigt es.', 'Deleting as needed distorts in itself. Only a check for measurement error or a different origin justifies it.')),
      a(P(`Das r von ${zd('ka_r', 3)} ist das richtige, denn alle Punkte zählen gleich viel`, `The r of ${ze('ka_r', 3)} is the right one, since all points count equally`),
        P('Gerade weil jeder Punkt gleich viel zählt, kann ein einzelner weit entfernter Punkt r stark verändern.', 'Precisely because each point counts equally, a single distant point can change r strongly.'))
    ],
    hilfe: [...HK, 'ausreisser'], probieren: 'gerade', belege: ['wissen:r-stichprobeneffekte', 'Anscombe 1973']
  },
  {
    id: 'kor-a-zehn', thema: 'korrelation', fall: 'kor-anscombe',
    stamm: P(`In Datensatz 4 haben zehn von elf Punkten denselben x-Wert. Woher kommt r = ${zd('ka_r4', 3)}?`, `In data set 4 ten of eleven points share the same x value. Where does r = ${ze('ka_r4', 3)} come from?`),
    antworten: [
      a(P('Vom einzelnen Punkt mit dem größten x-Wert; ohne ihn gäbe es kein r', 'From the single point with the largest x value; without it there is no r'),
        P('Bei zehn gleichen x-Werten gibt es dort keine Korrelation. Der elfte Punkt allein legt die Gerade und das r fest.', 'With ten equal x values there is no correlation among them. The eleventh point alone fixes the line and r.'), true),
      a(P(`Von der Steigung ${zd('ka_slope', 3)}, die in den vier Datensätzen gleich ist und r festlegt`, `From the slope ${ze('ka_slope', 3)}, which is the same in the four data sets and fixes r`),
        P('Gleiche Steigung und gleiches r in der Tabelle sind Zufall der Konstruktion; r ist nicht die Steigung.', 'Equal slope and equal r in the table are an accident of the construction; r is not the slope.')),
      a(P('Vom Zusammenspiel aller elf Punkte, die gemeinsam eine Gerade bilden', 'From the interplay of all eleven points, which together form a straight line'),
        P('Zehn Punkte haben denselben x-Wert und bilden keine Gerade. Die Gerade legt allein der elfte Punkt fest.', 'Ten points share the same x value and form no line. The line is fixed by the eleventh point alone.'))
    ],
    hilfe: HK, probieren: 'gerade', belege: ['wissen:r-stichprobeneffekte', 'Anscombe 1973']
  },
  // ---- Fall B: Bremsweg ----
  {
    id: 'kor-b-quadrat', thema: 'korrelation', fall: 'kor-cars',
    stamm: P(`Der Pearson-Koeffizient ist r = ${zd('kc_r', 3)}. Wie viel gemeinsame Streuung zeigt das?`, `The Pearson coefficient is r = ${ze('kc_r', 3)}. How much shared variation does that show?`),
    antworten: [
      a(P(`Rund ${zp('kc_r2')} Prozent der Streuung des Bremswegs gehören zur Geschwindigkeit`, `About ${zp('kc_r2')} percent of the variation in stopping distance goes with speed`),
        P(`Das Quadrat ${zd('kc_r2', 3)} ist der gemeinsame Anteil. r selbst ist kein Anteil.`, `The square ${ze('kc_r2', 3)} is the shared share. r itself is not a share.`), true),
      a(P(`Der Bremsweg steigt um ${zp('kc_r')} Prozent, wenn die Geschwindigkeit steigt`, `The stopping distance rises by ${zp('kc_r')} percent when the speed rises by a given amount`),
        P('r ist keine prozentuale Steigerung. Wie stark der Bremsweg mit der Geschwindigkeit wächst, sagt die Steigung einer Regression.', 'r is no percentage increase. How strongly stopping distance grows with speed is told by the slope of a regression.')),
      a(P(`Bei ${zp('kc_r')} Prozent der Fahrversuche hängt der Bremsweg mit der Geschwindigkeit zusammen`, `In ${zp('kc_r')} percent of the trials the stopping distance is related to speed`),
        P('r gilt für die Wertepaare zusammen, nicht für einzelne Versuche.', 'r applies to the pairs of values together, not to single trials.'))
    ],
    hilfe: HK, karte: 'zusammenhang', probieren: 'gerade', belege: ['wissen:r-nicht-aequidistant', 'wissen:r-definition-eigenschaften', 'Bortz und Schuster']
  },
  {
    id: 'kor-b-doppelt', thema: 'korrelation', fall: 'kor-cars',
    stamm: P(`Studie A findet r = ${zd('kc_r04', 2)}, die Bremsweg-Studie r = ${zd('kc_r', 3)}. Ist der Zusammenhang in der Bremsweg-Studie doppelt so stark wie in A?`, `Study A finds r = ${ze('kc_r04', 2)}, the stopping distance study r = ${ze('kc_r', 3)}. Is the relation in the stopping distance study twice as strong as in A?`),
    antworten: [
      a(P(`Nein; r ist kein Prozentmaß, die gemeinsamen Anteile sind ${zd('kc_r2', 3)} gegen ${zd('kc_r04_sq', 2)}`, `No; r is no percentage measure, the shared shares are ${ze('kc_r2', 3)} against ${ze('kc_r04_sq', 2)}`),
        P('r ist nicht gleichabständig: Erst r² ist als Anteil gemeinsamer Streuung lesbar. Der gemeinsame Anteil ist hier etwa viermal so groß.', 'r is not evenly spaced: only r² can be read as a share of shared variation. The shared share is about four times as large here.'), true),
      a(P(`Ja, denn ${zd('kc_r', 3)} ist etwa doppelt so groß wie ${zd('kc_r04', 2)}, also ist der Zusammenhang doppelt so stark`, `Yes, since ${ze('kc_r', 3)} is about twice as large as ${ze('kc_r04', 2)}, so the relation is twice as strong`),
        P('Doppelte r-Werte bedeuten nicht doppelte Stärke. Gemeinsame Streuung ist hier etwa viermal so groß.', 'Doubled r values do not mean doubled strength. The shared variation is about four times as large here.')),
      a(P('Das hängt von den Stichproben ab; bei gleicher Größe und gleicher Messung schon', 'That depends on the samples; with the same size and the same measures it is'),
        P('Die Stichprobengröße ändert nichts daran, wie r zu lesen ist.', 'Sample size does not change how r is to be read.'))
    ],
    hilfe: HK, belege: ['wissen:r-nicht-aequidistant', 'wissen:r-cohen-richtwerte', 'Bortz und Schuster']
  },
  {
    id: 'kor-b-spearman', thema: 'korrelation', fall: 'kor-cars',
    stamm: P(`Wann ist die Rangkorrelation nach Spearman (hier ${zd('kc_rho', 3)}) die bessere Wahl gegenüber Pearson?`, `When is the Spearman rank correlation (here ${ze('kc_rho', 3)}) the better choice compared with Pearson?`),
    antworten: [
      a(P('Bei Rangdaten oder wenn der Zusammenhang durchgehend steigt, aber gekrümmt ist', 'With rank data or when the relation keeps rising but is curved'),
        P('Spearman ist Pearson auf den Rangplätzen. Er misst, ob die Werte gleichsinnig steigen, nicht, ob sie einer Geraden folgen.', 'Spearman is Pearson on the ranks. It measures whether the values rise together, not whether they follow a line.'), true),
      a(P('Wenn die Stichprobe klein ist, denn dann liefert Spearman die genauere Schätzung', 'When the sample is small, since Spearman then gives the more accurate estimate'),
        P('Die Stichprobengröße entscheidet die Wahl nicht; es kommt auf Skala und Form des Zusammenhangs an.', 'Sample size does not decide the choice; scale and shape of the relation matter.')),
      a(P('Wenn beide Größen normalverteilt sind, denn dann hat Spearman mehr Teststärke', 'When both variables are normally distributed, since Spearman then has more power'),
        P('Sind die Voraussetzungen von Pearson erfüllt, ist dieser meist der stärkere Test.', 'When the requirements of Pearson are met, Pearson is usually the more powerful test.'))
    ],
    hilfe: ['rangkorrelation', 'frage-zusammenhang'], belege: ['wissen:spearman-rangkorrelation', 'wissen:r-bivariate-normalitaet', 'Bortz und Schuster']
  },
  {
    id: 'kor-b-streubreite', thema: 'korrelation', fall: 'kor-cars',
    stamm: P(`Es werden nur Fahrversuche bis 15 Meilen pro Stunde ausgewertet. Die Tabelle zeigt r = ${zd('kc_r_sub', 3)} statt ${zd('kc_r', 3)}. Wie ist das zu erklären?`, `Only trials up to 15 miles per hour are analysed. The table shows r = ${ze('kc_r_sub', 3)} instead of ${ze('kc_r', 3)}. How is that to be explained?`),
    antworten: [
      a(P('Ein enger Ausschnitt der Geschwindigkeiten senkt r schon für sich, auch ohne dass sich der Zusammenhang ändert', 'A narrow range of speeds lowers r by itself, even without any change in the relationship'),
        P('Eingeschränkte Streubreite drückt r nach unten; r hängt von der Streuung der Größen in der Stichprobe ab.', 'Restricted range pushes r down; r depends on the spread of the variables in the sample.'), true),
      a(P('Bei langsamen Fahrten hängt der Bremsweg gar nicht mehr von der Geschwindigkeit ab, das zeigt das kleinere r', 'At slow speeds the stopping distance no longer depends on speed at all, as the smaller r shows'),
        P('Schon der engere Ausschnitt senkt r. Aus dem kleineren r allein folgt kein schwächerer Zusammenhang.', 'The narrower slice alone lowers r. A weaker relation does not follow from the smaller r alone.')),
      a(P('Die kleinere Stichprobe verkleinert den Zusammenhang, denn r sinkt mit der Zahl der Versuche', 'The smaller sample shrinks the relation, since r falls with the number of trials'),
        P('r hängt nicht von n ab; der Stichprobenumfang bestimmt die Sicherheit der Schätzung, nicht ihre Größe.', 'r does not depend on n; the sample size determines the certainty of the estimate, not its size.'))
    ],
    hilfe: HK, belege: ['wissen:r-stichprobeneffekte', 'wissen:cohen94-korrelation-variabilitaet', 'Cohen 1994']
  },
  // ---- Fall C: Leistung, Meilen je Gallone, Gewicht ----
  {
    id: 'kor-c-dritte', thema: 'korrelation', fall: 'kor-mtcars',
    stamm: P(`Leistung und Meilen je Gallone hängen zusammen (r = ${zd('km_r_mh', 3)}). Das Gewicht hängt mit beiden zusammen. Wie ist das einzuordnen?`, `Power and miles per gallon are related (r = ${ze('km_r_mh', 3)}). Weight is related to both. How is that to be classified?`),
    antworten: [
      a(P('Das Gewicht kann einen Teil des Zusammenhangs von Leistung und Meilen je Gallone tragen', 'Weight can account for part of the relation of power and miles per gallon'),
        P('Eine dritte Größe mit Verbindung zu beiden kann einen Zusammenhang erzeugen oder verstärken. r sagt nicht, welche Deutung gilt.', 'A third variable linked to both can create or strengthen a relation. r does not say which interpretation holds.'), true),
      a(P('Die Leistung bestimmt die Meilen je Gallone, denn der Zusammenhang ist stark', 'Power determines the miles per gallon, since the relation is strong'),
        P('Ein starker Zusammenhang zeigt keine Wirkrichtung. Auch andere Größen wie das Gewicht kommen in Frage.', 'A strong relation shows no direction of effect. Other variables such as weight come into question too.')),
      a(P('Die Meilen je Gallone bestimmen die Leistung, denn Zusammenhänge gelten in beide Richtungen', 'The miles per gallon determine power, since relations hold in both directions'),
        P('Eine Richtung der Wirkung lässt sich aus r nicht ablesen; beide Richtungen und eine gemeinsame Ursache bleiben möglich.', 'A direction of effect cannot be read from r; both directions and a common cause remain possible.'))
    ],
    hilfe: [...HK, 'partialkorrelation'], karte: 'zusammenhang', belege: ['wissen:korrelation-vier-deutungen', 'wissen:scheinkorrelation-gemeinsame-ursache', 'Bortz und Schuster']
  },
  {
    id: 'kor-c-partial', thema: 'korrelation', fall: 'kor-mtcars',
    stamm: P(`Wird das Gewicht herausgerechnet, sinkt r zwischen Leistung und Meilen je Gallone von ${zd('km_r_mh', 3)} auf ${zd('km_part', 3)}. Wie ist das zu lesen?`, `When weight is partialled out, r between power and miles per gallon falls from ${ze('km_r_mh', 3)} to ${ze('km_part', 3)}. How is that to be read?`),
    antworten: [
      a(P('Ein Teil des Zusammenhangs lief über das Gewicht; ein Rest bleibt auch bei gleichem Gewicht', 'Part of the relation ran through weight; a remainder stays at equal weight'),
        P('Die Partialkorrelation sinkt, weil das Gewicht mit beiden zusammenhängt. Sie fällt nicht auf 0, ein Rest bleibt.', 'The partial correlation falls because weight is related to both. It does not fall to 0, a remainder stays.'), true),
      a(P('Der Zusammenhang war ein Scheinzusammenhang und verschwindet bei gleichem Gewicht', 'The relation was a spurious one and vanishes at equal weight'),
        P(`Ein reiner Scheinzusammenhang würde auf etwa 0 fallen. Hier bleibt ein Rest von ${zd('km_part', 3)}.`, `A purely spurious relation would fall to about 0. Here a remainder of ${ze('km_part', 3)} stays.`)),
      a(P('Das Gewicht verursacht den verbleibenden Rest des Zusammenhangs zwischen Leistung und Meilen je Gallone', 'Weight causes the remaining part of the relation between power and miles per gallon'),
        P('Die Partialkorrelation rechnet das Gewicht heraus; sie sagt nicht, was den Rest verursacht.', 'The partial correlation removes weight; it does not say what causes the remainder.'))
    ],
    hilfe: ['partialkorrelation', 'frage-partialkorrelation'], belege: ['wissen:partialkorrelation-wirkung', 'wissen:partialkorrelation-gleicher-zusammenhang', 'Bortz und Schuster']
  },
  // ---- Einzelfragen ----
  {
    id: 'kor-kovarianz', thema: 'korrelation',
    stamm: P('Die Wagen werden von Meilen je Gallone auf Kilometer je Liter umgerechnet. Was ändert sich?', "The cars' fuel economy is converted from miles per gallon to kilometres per litre. What changes?"),
    tabelle: tab('kor-kovarianz', [P('Einheit (Meilen je Gallone oder km je Liter)', 'Unit (miles per gallon or km per litre)'), P('Kovarianz mit dem Gewicht', 'Covariance with weight'), P('Korrelation mit dem Gewicht', 'Correlation with weight')], QUELLE_MT, P('Meilen je Gallone und Gewicht in zwei Einheiten', 'Miles per gallon and weight in two units')),
    antworten: [
      a(P('Die Kovarianz ändert sich, der Korrelationskoeffizient bleibt gleich', 'The covariance changes, the correlation coefficient stays the same'),
        P(`Die Kovarianz hängt vom Maßstab ab (${zd('kv_cov1', 3)} gegen ${zd('kv_cov2', 3)}). r ist standardisiert und bleibt bei ${zd('kv_r', 3)}.`, `The covariance depends on the scale (${ze('kv_cov1', 3)} against ${ze('kv_cov2', 3)}). r is standardised and stays at ${ze('kv_r', 3)}.`), true),
      a(P('Beide Werte bleiben gleich, denn die Wagen sind dieselben', 'Both values stay the same, since the cars are the same'),
        P(`Die Kovarianz nimmt den Maßstab mit; sie ändert sich von ${zd('kv_cov1', 3)} auf ${zd('kv_cov2', 3)}.`, `The covariance takes the scale along; it changes from ${ze('kv_cov1', 3)} to ${ze('kv_cov2', 3)}.`)),
      a(P('Der Korrelationskoeffizient ändert sich, während die Kovarianz gleich bleibt', 'The correlation coefficient changes, while the covariance stays the same'),
        P('Es ist umgekehrt: r ist durch die Standardisierung unabhängig vom Maßstab, die Kovarianz nicht.', 'It is the other way round: r is independent of the scale through standardisation, the covariance is not.'))
    ],
    hilfe: HK, belege: ['wissen:kovarianz-massstab', 'wissen:r-definition-eigenschaften', 'Bortz und Schuster']
  },
  {
    id: 'kor-gruppen-zusammen', thema: 'korrelation',
    stamm: P(`Bei 150 Schwertlilien hängen Länge und Breite des Kelchblatts insgesamt kaum zusammen (r = ${zd('ki_r_all', 3)}). Innerhalb jeder der drei Arten ist r positiv. Was zeigt das?`, `In 150 irises sepal length and width are hardly related overall (r = ${ze('ki_r_all', 3)}). Within each of the three species r is positive. What does that show?`),
    tabelle: tab('kor-gruppen-zusammen', [P('Auswahl', 'Selection'), P('n', 'n'), P('r', 'r')], QUELLE_IRIS, P('Länge und Breite des Kelchblatts: alle Pflanzen und je Art', 'Sepal length and width: all plants and for each species')),
    antworten: [
      a(P('Beim Zusammenwerfen von Arten kann r einen Zusammenhang innerhalb der Arten verdecken', 'When species are pooled, r can hide a relation within each species'),
        P(`Die Arten unterscheiden sich in beiden Maßen. Das Zusammenwerfen mischt diese Unterschiede in r. Innerhalb der Arten liegt r zwischen ${zd('ki_r_vir', 3)} und ${zd('ki_r_set', 3)}.`, `The species differ in both measures. Pooling mixes these differences into r. Within the species r lies between ${ze('ki_r_vir', 3)} and ${ze('ki_r_set', 3)}.`), true),
      a(P('Der Zusammenhang ist insgesamt schwach, also ist er auch innerhalb der einzelnen Arten schwach', 'The relation is weak overall, so it is weak within the species too'),
        P('Das Gesamt-r sagt nichts über die Zusammenhänge innerhalb der Gruppen; sie können ganz anders ausfallen.', 'The overall r says nothing about the relations within the groups; they can turn out quite differently.')),
      a(P('Die positiven r in den Arten sind Zufall, weil das Gesamt-r negativ ist', 'The positive r values in the species are chance, as the overall r is negative'),
        P('Die Zusammenhänge in den Arten sind keine Rechenfehler; das Zusammenwerfen verschiebt das Gesamt-r.', 'The relations in the species are no calculation errors; pooling shifts the overall r.'))
    ],
    hilfe: [...HK, 'partialkorrelation'], belege: ['wissen:partialkorrelation-gleicher-zusammenhang', 'wissen:r-stichprobeneffekte', 'Bortz und Schuster']
  },
  {
    id: 'kor-punktbiserial', thema: 'korrelation',
    stamm: P(`Die Gruppe (VC = 1, OJ = 0) wird mit der Zahnlänge korreliert (r = ${zd('kp_r', 3)}, p = ${zd('gz_p_pooled', 3)}). Welcher Test liefert dasselbe p?`, `The group (VC = 1, OJ = 0) is correlated with tooth length (r = ${ze('kp_r', 3)}, p = ${ze('gz_p_pooled', 3)}). Which test gives the same p?`),
    tabelle: tab('kor-punktbiserial', [P('Verfahren', 'Procedure'), P('Kennwert', 'Statistic'), P('t', 't'), P('Freiheitsgrade', 'Degrees of freedom'), P('Sig.', 'Sig.')], QUELLE_ZAHN, P('Korrelation mit einer 0/1-Gruppe und t-Test', 'Correlation with a 0/1 group and t test')),
    antworten: [
      a(P('Der t-Test für unabhängige Stichproben mit gleichen Streuungen', 'The t test for two independent samples with equal variances'),
        P(`Die Korrelation einer 0/1-Größe mit einer Zahl (punktbiseriale Korrelation) ist derselbe Test: t = ${zd('iz_t', 3)} (dem Betrag nach) bei 58 Freiheitsgraden.`, `The correlation of a 0/1 variable with a number (point-biserial correlation) is the same test: t = ${ze('iz_t', 3)} (in absolute value) with 58 degrees of freedom.`), true),
      a(P('Der gepaarte t-Test, denn die Gruppe wurde als Zahl 0 oder 1 kodiert', 'The paired t test, since the group was coded as a number 0 or 1'),
        P('Die Tiere sind nicht gepaart; jedes Tier gehört nur zu einer Gruppe.', 'The animals are not paired; each animal belongs to one group only.')),
      a(P('Der Chi-Quadrat-Test, denn die Gruppe ist eine Kategorie mit zwei Stufen', 'The chi-square test, since the group is a category with two levels'),
        P('Die Zahnlänge ist ein Messwert, keine Kategorie. Chi-Quadrat zählt Häufigkeiten.', 'Tooth length is a measured value, not a category. Chi-square counts frequencies.'))
    ],
    hilfe: [...HK, 'frage-gruppen'], karte: 'zusammenhang', belege: ['wissen:punktbiseriale-korrelation', 'wissen:t-test-drei-varianten', 'Bortz und Schuster']
  },
  {
    id: 'kor-null', thema: 'korrelation',
    stamm: P('Zwischen zwei Größen ergibt sich r = 0. Welche Schlussfolgerung ist gedeckt?', 'Between two variables r = 0 results. Which conclusion is supported?'),
    antworten: [
      a(P('Es gibt keinen geradlinigen Zusammenhang; ein gekrümmter ist noch möglich', 'There is no straight-line relation; a curved one is still possible'),
        P('Ein Bogen oder eine Kurve kann r = 0 ergeben, obwohl die Größen eng zusammenhängen.', 'An arc or a curve can give r = 0 although the variables are closely related.'), true),
      a(P('Die beiden Größen sind voneinander unabhängig, ein Zusammenhang besteht nicht', 'The two variables are independent of each other, there is no relation'),
        P('Aus r = 0 folgt nur lineare Unabhängigkeit, keine Unabhängigkeit überhaupt.', 'r = 0 implies only linear independence, not independence in general.')),
      a(P('Eine der beiden Größen wurde ungenau gemessen, deshalb fehlt der Zusammenhang', 'One of the two variables was measured imprecisely, which is why the relation is missing'),
        P('Messfehler schwächen einen Zusammenhang ab, sind aber nicht der Grund für ein r von 0.', 'Measurement error weakens a relation, but is not the reason for an r of 0.'))
    ],
    hilfe: HK, probieren: 'gerade', belege: ['wissen:kovarianz-massstab', 'wissen:r-definition-eigenschaften', 'Bortz und Schuster']
  },
  {
    id: 'kor-ki', thema: 'korrelation',
    stamm: P(`Das 95-Prozent-Konfidenzintervall für r = ${zd('kc_r', 3)} reicht von ${zd('kc_lo', 3)} bis ${zd('kc_hi', 3)}. Warum ist das Intervall um r schief?`, `The 95 percent confidence interval for r = ${ze('kc_r', 3)} runs from ${ze('kc_lo', 3)} to ${ze('kc_hi', 3)}. Why is the interval skewed around r?`),
    antworten: [
      a(P('Das Intervall wird über Fisher-Z gebildet und ist deshalb um r schief', 'The interval is formed through Fisher z and is therefore skewed around r'),
        P('r kann höchstens 1 werden. Fisher-Z macht die Verteilung annähernd normal; zurückgerechnet ist das Intervall asymmetrisch.', 'r can be at most 1. Fisher z makes the distribution approximately normal; transformed back the interval is asymmetric.'), true),
      a(P('Das Intervall wurde falsch berechnet, denn es müsste symmetrisch um r liegen', 'The interval was calculated wrongly, since it should be symmetric around r'),
        P('Bei r nahe 1 ist ein symmetrisches Intervall nicht möglich, weil r die Grenze 1 nicht überschreiten kann.', 'For r near 1 a symmetric interval is impossible, because r cannot exceed the limit 1.')),
      a(P('Die Stichprobe ist nicht normalverteilt, deshalb ist das Intervall schief', 'The sample is not normally distributed, which is why the interval is skewed'),
        P('Die Schiefe kommt von der Begrenzung von r auf den Bereich bis 1, nicht von der Verteilung der Rohwerte.', 'The skewness comes from the limit on r at 1, not from the distribution of the raw values.'))
    ],
    hilfe: [...HK, 'konfidenzintervall'], belege: ['wissen:r-konfidenzintervall-asymmetrisch', 'wissen:fisher-z-zweck', 'Bortz und Schuster']
  },

  // ---- Korrelation testen und Phi (Stand 01.11.2026, dritte Charge) ----
  {
    id: 'kor-t-test', thema: 'korrelation', fall: 'kor-trees', karte: 'zusammenhang',
    stamm: P(`Bei ${zn('kt_n')} Bäumen ergibt sich zwischen Umfang und Höhe r = ${zd('kt_r', 3)}. Wie entsteht der Wert t = ${zd('kt_t', 2)} der Tabelle?`, `For ${zn('kt_n')} trees, girth and height give r = ${ze('kt_r', 3)}. How does the value t = ${ze('kt_t', 2)} of the table arise?`),
    antworten: [
      a(P(`t = r · √(n − 2) / √(1 − r²), mit ${zn('kt_df')} Freiheitsgraden`, `t = r · √(n − 2) / √(1 − r²), with ${zn('kt_df')} degrees of freedom`),
        P(`Die Nullhypothese „kein Zusammenhang in der Grundgesamtheit“ wird so geprüft. Der Test der Steigung in der einfachen Regression kommt zum selben Ergebnis (zweite Zeile: t = ${zd('kt_t', 2)}).`,
          `The null hypothesis "no relationship in the population" is tested this way. The test of the slope in simple regression reaches the same result (second row: t = ${ze('kt_t', 2)}).`), true),
      a(P(`t = r / √n, mit ${zn('kt_n1')} Freiheitsgraden`, `t = r / √n, with ${zn('kt_n1')} degrees of freedom`),
        P(`Die Tabelle zeigt ${zn('kt_df')} Freiheitsgrade, also n minus 2, und im Nenner steht die Wurzel aus (1 minus r²).`, `The table shows ${zn('kt_df')} degrees of freedom, that is n minus 2, and the denominator contains the square root of (1 minus r²).`)),
      a(P('t = (r − 0) / Standardabweichung der Höhen aller Bäume', 't = (r − 0) / standard deviation of the heights of all trees'),
        P('Die Prüfgröße hängt nur von r und n ab, nicht von der Standardabweichung der Höhen.', 'The test statistic depends only on r and n, not on the standard deviation of the heights.'))
    ],
    hilfe: ['korrelationstest', 'pearson-korrelation'], belege: ['wissen:r-signifikanztest']
  },
  {
    id: 'kor-t-mehrfach', thema: 'korrelation', fall: 'kor-trees', mehrfach: true, karte: 'zusammenhang',
    stamm: P('Angenommen, für Spearmans r_s genügt die t-Näherung ab etwa n = 30 (darunter gelten Tabellen). Welche Aussagen zur Tabelle stimmen? Mehrere können stimmen.',
      'Suppose that for Spearman\'s r_s the t approximation suffices from about n = 30 (below that, tables apply). Which statements about the table are correct? Several may be correct.'),
    antworten: [
      a(P(`Der Steigungstest der Regression von Höhe auf Umfang liefert dasselbe t wie der Test von r (${zd('kt_t', 2)})`, `The slope test of the regression of height on girth gives the same t as the test of r (${ze('kt_t', 2)})`),
        P(`Beide prüfen dieselbe Nullhypothese; t ist in beiden Zeilen ${zd('kt_t', 2)} bei ${zn('kt_df')} Freiheitsgraden.`, `Both test the same null hypothesis; t is ${ze('kt_t', 2)} in both rows with ${zn('kt_df')} degrees of freedom.`), true),
      a(P(`Bei n = ${zn('kt_n')} genügt für r_s die t-Näherung (r_s = ${zd('kt_rs', 3)}, t = ${zd('kt_ts', 2)})`, `At n = ${zn('kt_n')} the t approximation suffices for r_s (r_s = ${ze('kt_rs', 3)}, t = ${ze('kt_ts', 2)})`),
        P(`Nach der gesetzten Regel gilt die Näherung ab etwa n = 30; hier sind es ${zn('kt_n')} Bäume mit ${zn('kt_df')} Freiheitsgraden.`, `By the rule set, the approximation holds from about n = 30; here there are ${zn('kt_n')} trees with ${zn('kt_df')} degrees of freedom.`), true),
      a(P(`Sig. = ${zd('kt_p', 3)} heißt: Mit Wahrscheinlichkeit ${zd('kt_p', 3)} besteht in der Grundgesamtheit kein Zusammenhang`, `Sig. = ${ze('kt_p', 3)} means: with probability ${ze('kt_p', 3)} there is no relationship in the population`),
        P('Der p-Wert ist keine Wahrscheinlichkeit der Nullhypothese. Er gibt an, wie unwahrscheinlich ein so extremes Ergebnis wäre, wenn sie gilt.', 'The p value is not a probability of the null hypothesis. It tells how unlikely so extreme a result would be if the null hypothesis holds.')),
      a(P(`Wegen Sig. = ${zd('kt_p', 3)} ist der Zusammenhang stark`, `Because Sig. = ${ze('kt_p', 3)}, the relationship is strong`),
        P(`Signifikant sagt nichts über die Größe. Die Stärke zeigt r (${zd('kt_r', 3)}), das Quadrat ${zd('kt_r2', 3)} ist der gemeinsame Streuungsanteil.`, `Significant says nothing about size. The strength is shown by r (${ze('kt_r', 3)}); its square ${ze('kt_r2', 3)} is the shared share of variation.`))
    ],
    hilfe: ['korrelationstest', 'rangkorrelation'], belege: ['wissen:r-signifikanztest', 'wissen:spearman-signifikanz-n30', 'wissen:signifikant-nicht-bedeutsam']
  },
  {
    id: 'kor-phi', thema: 'korrelation', karte: 'zusammenhang',
    tabelle: tab('kor-phi', [P('Zeile', 'Row'), P('Spalte 1: nicht überlebt, sonst Wert', 'Column 1: did not survive, otherwise value'), P('Spalte 2: überlebt', 'Column 2: survived')], QUELLE_TITANIC_PHI, P('Geschlecht und Überleben, Chi-Quadrat und Phi in zwei Kodierungen', 'Sex and survival, chi-square and phi in two codings')),
    stamm: P('Die Tabelle zeigt Geschlecht und Überleben erwachsener Titanic-Reisender. Phi wird einmal mit „Männer = 1“ und einmal mit „Frauen = 1“ gerechnet und hat jeweils ein anderes Vorzeichen. Was bedeutet das?',
      'The table shows sex and survival of adult Titanic passengers. Phi is computed once with "men = 1" and once with "women = 1" and has a different sign each time. What does that mean?'),
    antworten: [
      a(P('Der Betrag ist gleich, das Vorzeichen hängt nur von der Anordnung der Zellen ab', 'The size is the same; the sign depends only on the arrangement of the cells'),
        P(`Phi ist die Pearson-Korrelation zweier 0/1-Variablen: Wurzel aus (${zd('ph_chi', 2)} geteilt durch ${zn('ph_n')}) gleich ${zd('ph_abs', 3)}. Wer die Kodierung einer Variablen vertauscht, kehrt das Vorzeichen um.`,
          `Phi is the Pearson correlation of two 0/1 variables: the square root of (${ze('ph_chi', 2)} divided by ${zn('ph_n')}) equals ${ze('ph_abs', 3)}. Swapping the coding of one variable reverses the sign.`), true),
      a(P('Eine der beiden Rechnungen ist falsch, denn der Zusammenhang kann nur ein Vorzeichen haben', 'One of the two calculations is wrong, since the relationship can have only one sign'),
        P(`Beide stimmen: ${zd('ph_m', 3)} und ${zd('ph_w', 3)}. Die Richtung hängt davon ab, welche Gruppe mit 1 kodiert ist.`, `Both are right: ${ze('ph_m', 3)} and ${ze('ph_w', 3)}. The direction depends on which group is coded 1.`)),
      a(P('Bei „Frauen = 1“ ist der Zusammenhang stärker, weil Phi dort positiv ausfällt', 'With "women = 1" the relationship is stronger because phi comes out positive there'),
        P(`Die Stärke steckt im Betrag, ${zd('ph_abs', 3)} in beiden Fällen. Das Vorzeichen sagt nur, wie kodiert wurde.`, `The strength lies in the size, ${ze('ph_abs', 3)} in both cases. The sign only tells how the coding was done.`))
    ],
    hilfe: ['phi-koeffizient', 'vierfeldertafel'], belege: ['wissen:phi-koeffizient']
  },
];
