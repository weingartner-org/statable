/**
 * Üben: Läuft ein Prozess stabil, ist er fähig, taugt das Messsystem, wie plant man Versuche?
 * (Regelkarten, Phase 1 und 2, Prozessfähigkeit, Messsystem, Versuchsplanung gegen Ein-Faktor-Änderung).
 * Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R,
 * Daten: datasets::morley, datasets::ToothGrowth; Prozessfähigkeit und Messsystem sind Rechenbeispiele und als solche beschriftet).
 * Mein Fachgebiet: Technik und Qualität (Karten Regelkarten und Messsystem, noch nicht gebaut), nur vermerkt. Karten stehen bewusst nicht im Feld `karte`.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, W, zd, ze, zn, zp, zpr } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const NORM = ['normalverteilung-pruefen', 'voraussetzungen-pruefen'];
const anteilMess = String(Math.round(100 * Number(W.tm_gm_b) / Number(W.tm_gp)));

const QUELLE_REGEL = P(
  'Daten: datasets::morley (Michelson 1879, nach Stigler 1977; Teil von R, Lizenz GPL), 100 Messungen der Lichtgeschwindigkeit in fünf Versuchen als Messreihe genutzt. Mittelwertkarte mit Spannweite, berechnet mit R.',
  'Data: datasets::morley (Michelson 1879, after Stigler 1977; part of R, licence GPL), 100 measurements of the speed of light in five experiments used as a measurement series. Mean chart with range, computed with R.');
const QUELLE_FAEHIG = P(
  'Rechenbeispiel, keine Daten: erfundene Werte (Maße in Millimetern), Indizes und Anteile außerhalb der Grenzen berechnet mit R für einen normalverteilten, stabilen Prozess.',
  'Worked example, no data: invented values (dimensions in millimetres), indices and shares outside the limits computed with R for a normally distributed, stable process.');
const QUELLE_MESS = P(
  'Rechenbeispiel, keine Daten: erfundene Varianzanteile (Einheit zum Quadrat), Anteile, Signal-Rausch-Verhältnis und Diskriminationsverhältnis berechnet mit R.',
  'Worked example, no data: invented variance components (unit squared), shares, signal-to-noise ratio and discrimination ratio computed with R.');
const QUELLE_ZAHN = P(
  'Daten: datasets::ToothGrowth (Bliss 1952; Teil von R, Lizenz GPL), Zahnlänge von Meerschweinchen nach Vitamin-C-Gabe als Orangensaft (OJ) oder Ascorbinsäure (VC) in drei Dosen. Mittelwerte, berechnet mit R.',
  'Data: datasets::ToothGrowth (Bliss 1952; part of R, licence GPL), tooth length of guinea pigs after vitamin C as orange juice (OJ) or ascorbic acid (VC) in three doses. Means, computed with R.');

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'tech-regel': {
    titel: P('Eine Messreihe von 100 Messungen der Lichtgeschwindigkeit (Abweichung von 299000 km/s) in 25 Gruppen zu je 4 aufeinanderfolgenden Messungen. Die Grenzen der Mittelwertkarte stammen aus den ersten 10 Gruppen (Läufe 1 und 2); die übrigen 15 Gruppen (Läufe 3 bis 5) werden daran gemessen',
      'A series of 100 measurements of the speed of light (deviation from 299000 km/s) in 25 groups of 4 consecutive measurements. The limits of the mean chart come from the first 10 groups (experiments 1 and 2); the remaining 15 groups (experiments 3 to 5) are measured against them'),
    tabellen: [
      tab('tech-regel.0', [P('Mittellinie', 'Centre line'), P('Untere Grenze', 'Lower limit'), P('Obere Grenze', 'Upper limit'), P('Mittelwerte außerhalb der Grenzen', 'Means outside the limits'), P('Gruppen nach den ersten zehn', 'Groups after the first ten')], QUELLE_REGEL, P('Mittelwertkarte: Mittellinie und Grenzen bei drei Standardfehlern', 'Mean chart: centre line and limits at three standard errors'))
    ]
  },
  'tech-fae': {
    titel: P(`Ein Maß in Millimetern mit Vorgabe von ${zd('tf_L', 2)} bis ${zd('tf_U', 2)}. Zwei Prozesse mit gleicher Streuung (${zd('tf_sd', 2)}), A in der Mitte, B zur oberen Grenze verschoben`,
      `A dimension in millimetres with a specification of ${ze('tf_L', 2)} to ${ze('tf_U', 2)}. Two processes with the same spread (${ze('tf_sd', 2)}), A in the middle, B shifted towards the upper limit`),
    tabellen: [
      tab('tech-fae.0', [P('Prozess', 'Process'), P('Mittelwert', 'Mean'), P('Standardabweichung', 'Standard deviation'), P('Cp', 'Cp'), P('Cpk', 'Cpk'), P('Anteil außerhalb der Vorgabe (Prozent)', 'Share outside the specification (percent)')], QUELLE_FAEHIG, P('Rechenbeispiel: Prozessfähigkeit bei normalverteiltem, stabilem Prozess', 'Worked example: process capability for a normally distributed, stable process'))
    ]
  },
  'tech-msa': {
    titel: P('Zwei Messsysteme (A und B) für dasselbe Merkmal. Die Streuung der Teile ist gleich, die des Messsystems verschieden. Wiederholbarkeit und Reproduzierbarkeit bilden zusammen die Streuung des Messsystems',
      'Two measurement systems (A and B) for the same attribute. The spread of the parts is the same, that of the measurement system differs. Repeatability and reproducibility together make up the spread of the measurement system'),
    tabellen: [
      tab('tech-msa.0', [P('Messsystem', 'Measurement system'), P('Wiederholbarkeit', 'Repeatability'), P('Reproduzierbarkeit', 'Reproducibility'), P('Messsystem zusammen', 'Measurement system together'), P('Bauteile (Prozess)', 'Parts (process)'), P('Anteil des Prozesses an der Gesamtstreuung', 'Share of the process in the total spread'), P('Signal-Rausch-Verhältnis', 'Signal-to-noise ratio'), P('Diskriminationsverhältnis', 'Discrimination ratio')], QUELLE_MESS, P('Rechenbeispiel: Varianzanteile (Streuung zum Quadrat)', 'Worked example: variance components (spread squared)'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Fall A: Regelkarte ----
  {
    id: 'tech-a-signal', thema: 'technik', fall: 'tech-regel',
    stamm: P(`${zn('tr_aussen')} der ${zn('tr_phase2')} späteren Gruppenmittelwerte liegen unter der unteren Grenze. Was bedeutet das?`, `${zn('tr_aussen')} of the ${zn('tr_phase2')} later group means lie below the lower limit. What does that mean?`),
    antworten: [
      a(P('Ein Signal: Der Prozess hat sich seit den ersten Gruppen verändert, eine Ursache ist zu finden', 'A signal: the process has changed since the first groups, a cause is to be found'),
        P(`Nach der üblichen Näherung liegt bei einem stabilen Prozess nur etwa ${zd('tr_fehl', 2)} Prozent der Punkte außerhalb der Grenzen. Die Grenzen stammen hier aus nur zehn Gruppen und sind ungenau, doch drei von ${zn('tr_phase2')} Punkten sind weit mehr als zu erwarten.`, `By the usual approximation only about ${ze('tr_fehl', 2)} percent of the points lie outside the limits for a stable process. The limits here come from only ten groups and are imprecise, but three of ${zn('tr_phase2')} points are far more than expected.`), true),
      a(P('Die Grenzen sind falsch und werden so lange neu berechnet, bis die Punkte innerhalb der Grenzen liegen', 'The limits are wrong and are recalculated again and again until the points lie inside'),
        P('Grenzen, die man dem Verlauf anpasst, melden nichts mehr. Die Karte soll ungewöhnliche Variation anzeigen, damit man ihre Ursache sucht.', 'Limits that are adjusted to the course report nothing any more. The chart is meant to show unusual variation so that its cause is looked for.')),
      a(P('Zufall: Bei 15 Gruppen sind einzelne Punkte außerhalb der Grenzen durchaus zu erwarten, das kommt vor', 'Chance: with 15 groups a few points outside the limits are quite to be expected'),
        P(`Die Grenzen bei drei Standardfehlern lassen nach der üblichen Näherung bei einem stabilen Prozess etwa ${zd('tr_fehl', 2)} Prozent der Punkte außen. Das sind bei 15 Gruppen kaum einmal ein Punkt, nicht drei.`, `Limits at three standard errors leave about ${ze('tr_fehl', 2)} percent of the points outside by the usual approximation for a stable process. With 15 groups that is hardly ever one point, not three.`))
    ],
    hilfe: ['standardfehler', 'streuung'], belege: ['wissen:woodall00-statistische-kontrolle', 'wissen:woodall00-gemeinsame-besondere-ursachen', 'wissen:woodall00-fehlalarm-0027', 'wissen:woodall99-phase1-umfang', 'Woodall 2000; Woodall und Montgomery 1999']
  },
  {
    id: 'tech-a-phase', thema: 'technik', fall: 'tech-regel',
    stamm: P(`Die Grenzen wurden aus den ersten zehn Gruppen berechnet. Welche Aufgabe hat die Karte bei den späteren ${zn('tr_phase2')} Gruppen?`, `The limits were calculated from the first ten groups. What is the task of the chart for the later ${zn('tr_phase2')} groups?`),
    antworten: [
      a(P('Phase 2: Sie überwacht laufend, ob sich der beherrschte Prozess verändert', 'Phase 2: it monitors continuously whether the controlled process changes over time'),
        P('In Phase 1 werden Daten rückblickend auf Stabilität geprüft und die Grenzen geschätzt, in Phase 2 wird prospektiv überwacht.', 'In phase 1 data are checked retrospectively for stability and the limits are estimated; in phase 2 monitoring is prospective.'), true),
      a(P('Phase 1: Sie prüft rückblickend, ob der Prozess in den vorliegenden Daten stabil war', 'Phase 1: it checks retrospectively whether the process was stable in the data at hand'),
        P('Das war die Aufgabe bei den ersten zehn Gruppen, aus denen die Grenzen stammen. Die späteren Gruppen werden an diesen Grenzen gemessen.', 'That was the task for the first ten groups, from which the limits come. The later groups are measured against these limits.')),
      a(P('Sie bewertet, ob der Prozess die Vorgaben der Kunden einhält, also seine Fähigkeit', 'It assesses whether the process meets the customers\' specifications, that is its capability'),
        P('Die Fähigkeit wird erst beurteilt, wenn die Karte einen stabilen Prozess zeigt. Die Karte selbst fragt nach Stabilität.', 'Capability is assessed only once the chart shows a stable process. The chart itself asks about stability.'))
    ],
    hilfe: ['standardfehler', 'frage-zeitreihen'], belege: ['wissen:woodall00-phase1-phase2', 'wissen:woodall99-phase1-umfang', 'wissen:woodall00-kontrolle-vor-faehigkeit', 'Woodall 2000; Woodall und Montgomery 1999']
  },
  // ---- Einzelfragen zu Regelkarten ----
  {
    id: 'tech-nachregeln', thema: 'technik',
    stamm: P('Ein Prozess ist stabil, seine Messwerte schwanken nur zufällig um den Sollwert. Ein Mitarbeiter verstellt die Maschine nach jeder Abweichung, auch wenn der Punkt in den Grenzen liegt. Wie wirkt das?', 'A process is stable, its measured values fluctuate only by chance around the target. An operator adjusts the machine after every deviation, even if the point lies within the limits. How does that work out?'),
    antworten: [
      a(P('Die Streuung wächst, weil das Nachstellen nur Zufall ausgleicht', 'The spread around the target grows, because adjusting chases chance'),
        P('Das zeigt Demings Trichterexperiment: Wer einen stabilen Prozess nachführt, macht das Ergebnis schlechter. Bei autokorrelierten Prozessen kann Anpassen dagegen nützlich sein.', 'This is shown by Deming\'s funnel experiment: tracking a stable process makes the result worse. For autocorrelated processes adjusting can be useful, however.'), true),
      a(P('Die Streuung sinkt, weil jede Abweichung sofort und gezielt ausgeglichen wird', 'The spread falls, because every deviation is compensated at once'),
        P('Jede Korrektur reagiert auf Zufall und trägt eigene Abweichung ein. Das erhöht die Streuung.', 'Every correction reacts to chance and adds a deviation of its own. That increases the spread.')),
      a(P('Es ändert sich wenig, weil der Prozess ohnehin in statistischer Kontrolle ist', 'Little changes, because the process is in statistical control anyway'),
        P('Bei einem stabilen Prozess macht jedes Nachführen das Ergebnis schlechter, wie Demings Trichterexperiment zeigt. Das Eingreifen fügt selbst Streuung hinzu.', 'For a stable process every adjustment makes the result worse, as Deming\'s funnel experiment shows. The intervention adds spread of its own.'))
    ],
    hilfe: ['streuung', 'frage-zeitreihen'], belege: ['wissen:woodall00-nicht-nachregeln', 'wissen:woodall99-ursachen-kontrolle', 'Woodall 2000']
  },
  {
    id: 'tech-cusum', thema: 'technik',
    stamm: P('Das Prozessmittel verschiebt sich langsam um einen kleinen Betrag, die Punkte der Shewhart-Karte bleiben innerhalb der Grenzen. Welche Karte entdeckt solche Verschiebungen früher?', 'The process mean shifts slowly by a small amount, the points of the Shewhart chart stay within the limits. Which chart detects such shifts earlier?'),
    antworten: [
      a(P('Eine CUSUM- oder EWMA-Karte, weil sie die Information mehrerer Gruppen zusammen auswertet', 'A CUSUM or EWMA chart, because it evaluates the information of several groups together'),
        P('Sie erkennen kleine und mittelgroße anhaltende Verschiebungen wirksamer. Oft werden sie zusammen mit den Shewhart-Grenzen verwendet.', 'They detect small and moderate sustained shifts more effectively. They are often used together with the Shewhart limits.'), true),
      a(P('Eine Shewhart-Karte mit Grenzen bei einem Standardfehler, weil engere Grenzen empfindlicher sind', 'A Shewhart chart with limits at one standard error, because narrower limits are more sensitive'),
        P('Enge Grenzen melden auch bei einem stabilen Prozess ständig. Die Zahl der Fehlalarme steigt stark.', 'Narrow limits report constantly even for a stable process. The number of false alarms rises sharply.')),
      a(P('Eine Karte mit der Zusatzregel „sieben steigende Punkte“, weil sie Trends anzeigt', 'A chart with the extra rule „seven rising points“, because it flags trends'),
        P('Die Regel erkennt einen Trend im Mittel nicht wirksam. Ihre Hauptwirkung ist, die Zahl der Fehlalarme zu erhöhen.', 'The rule does not detect a trend in the mean effectively. Its main effect is to raise the number of false alarms.'))
    ],
    hilfe: ['frage-zeitreihen', 'standardfehler'], belege: ['wissen:woodall00-cusum-ewma', 'wissen:woodall00-trendregel-wirkungslos', 'wissen:woodall99-3sigma-runs', 'Woodall 2000']
  },
  // ---- Fall B: Prozessfähigkeit ----
  {
    id: 'tech-b-cp-cpk', thema: 'technik', fall: 'tech-fae',
    stamm: P('Beide Prozesse haben dieselbe Streuung und dieselbe Vorgabe. Warum ist Cpk bei B viel kleiner als Cp?', 'Both processes have the same spread and the same specification. Why is Cpk for B much smaller than Cp?'),
    antworten: [
      a(P(`Cp ignoriert die Lage des Mittelwerts, Cpk misst den Abstand zur näheren Grenze`, 'Cp ignores the position of the mean, Cpk uses the distance to the nearer limit'),
        P(`B liegt mit ${zd('tf_mu_b', 2)} nahe der oberen Grenze. Darum fällt Cpk auf ${zd('tf_cpk_b', 2)}, während Cp bei ${zd('tf_cp', 2)} bleibt.`, `B lies close to the upper limit at ${ze('tf_mu_b', 2)}. That is why Cpk falls to ${ze('tf_cpk_b', 2)}, while Cp stays at ${ze('tf_cp', 2)}.`), true),
      a(P('B hat die größere Streuung, und eine größere Streuung senkt Cpk stärker als Cp', 'B has the larger spread, and a larger spread lowers Cpk more strongly than Cp'),
        P('Die Streuung ist in beiden Prozessen gleich. Der Unterschied kommt allein aus der Lage des Mittelwerts.', 'The spread is the same in both processes. The difference comes from the position of the mean alone.')),
      a(P('Cpk berechnet die Fähigkeit ohne die auffälligen Werte, Cp rechnet mit allen Werten', 'Cpk calculates the capability without the conspicuous values, Cp uses the data in full'),
        P('Beide Indizes nutzen dieselben Daten. Sie unterscheiden sich in der Formel: Cp ist unabhängig vom Mittelwert, Cpk nicht.', 'Both indices use the same data. They differ in the formula: Cp is independent of the mean, Cpk is not.'))
    ],
    hilfe: NORM, belege: ['wissen:kotz02-definitionen', 'wissen:tech-cpk-hoechstens-cp', 'wissen:kotz02-ordnung', 'Kotz und Lovelace 2002']
  },
  {
    id: 'tech-b-cp1', thema: 'technik', fall: 'tech-fae',
    stamm: P('Ein Prozess ist stabil und normalverteilt, sein Cp ist 1. Was lässt sich über den Anteil außerhalb der Grenzen sagen?', 'A process is stable and normally distributed, its Cp is 1. What can be said about the share outside the limits?'),
    antworten: [
      a(P(`Er liegt bei mindestens ${zd('tr_fehl', 2)} Prozent, bei verschobenem Mittelwert noch höher`, `It is at least ${ze('tr_fehl', 2)} percent, and higher if the mean is off centre`),
        P(`Prozess B der Tabelle hat sogar Cp ${zd('tf_cp', 2)} und trotzdem ${zd('tf_aus_b', 2)} Prozent außerhalb, weil er nicht zentriert ist.`, `Process B in the table even has Cp ${ze('tf_cp', 2)} and still ${ze('tf_aus_b', 2)} percent outside, because it is not centred.`), true),
      a(P(`Er beträgt höchstens ${zd('tr_fehl', 2)} Prozent, auch wenn der Mittelwert verschoben ist`, `It is at most ${ze('tr_fehl', 2)} percent, even if the mean is shifted from the centre`),
        P('Cp sagt nichts über die Lage. Ein höchstens liefert erst Cpk: Cpk gleich 1 heißt bei Normalverteilung höchstens diesen Anteil.', 'Cp says nothing about the position. An upper bound comes only from Cpk: Cpk equal to 1 means at most this share for a normal distribution.')),
      a(P(`Er beträgt ${zd('tr_fehl', 2)} Prozent, denn Cp legt den Anteil fest und die Lage spielt keine Rolle`, `It is ${ze('tr_fehl', 2)} percent, since Cp fixes the share regardless of position`),
        P(`Nur bei zentriertem Prozess stimmt die Zahl. Prozess B hat ${zd('tf_aus_b', 2)} Prozent bei annähernd gleichem Cp.`, `The figure is right only for a centred process. Process B has ${ze('tf_aus_b', 2)} percent at a similar Cp.`))
    ],
    hilfe: NORM, belege: ['wissen:kotz02-cp-cpk-ausschuss', 'wissen:tech-cpk-hoechstens-cp', 'Kotz und Lovelace 2002']
  },
  {
    id: 'tech-kontrolle', thema: 'technik',
    stamm: P('Ein Prozess hat einen hohen Cpk. Die Regelkarte desselben Prozesses zeigt aber mehrere Signale. Wie ist der Index zu bewerten?', 'A process has a high Cpk. The control chart of the same process shows several signals, however. How is the index to be judged?'),
    antworten: [
      a(P('Er sagt wenig, weil Fähigkeitsindizes einen stabilen Prozess brauchen; zuerst die Signale klären', 'It says little, because capability indices presuppose a stable process, the signals come first'),
        P('Fähigkeitsanalysen werden durchgeführt, nachdem festgestellt wurde, dass der Prozess in statistischer Kontrolle ist. Bei Signalen schwankt der Prozess, die Schätzung gilt dann nur für den Moment.', 'Capability analyses are carried out after it has been established that the process is in statistical control. With signals the process fluctuates, so the estimate holds only for the moment.'), true),
      a(P('Er zählt weiter, denn er misst die Einhaltung der Vorgaben, die Karte betrifft die Prozesslenkung', 'It still counts, because it measures compliance with the specification, the chart concerns process control'),
        P('Der Index beschreibt die Vorgaben nur dann verlässlich, wenn sich die Verteilung über die Zeit nicht ändert. Genau das prüft die Karte.', 'The index describes compliance with the specification reliably only if the distribution does not change over time. That is exactly what the chart checks.')),
      a(P('Er ist ungenau, weil die Stichprobe klein ist; mit 30 Teilen wäre er dann verlässlich genug', 'It is imprecise because the sample is small; with 30 parts it would then be reliable enough'),
        P('Auch 25 bis 30 Teile reichen oft nicht aus, die Indizes schwanken mit der Stichprobe. Das Problem hier ist aber die fehlende Stabilität.', 'Even 25 to 30 parts are often not enough, the indices vary with the sample. The problem here is the missing stability, however.'))
    ],
    hilfe: NORM, belege: ['wissen:woodall00-kontrolle-vor-faehigkeit', 'wissen:kotz02-kontrolle-und-normalitaet', 'wissen:kotz02-schaetzung', 'Woodall 2000; Kotz und Lovelace 2002']
  },
  // ---- Versuchsplanung ----
  {
    id: 'tech-ofat', thema: 'technik',
    stamm: P(`Ein Team prüft nur bei der Dosis 0,5, ob OJ besser wirkt als VC (Unterschied ${zd('to_d05', 2)}), und schließt, das gelte für alle Dosen. Was zeigt die Tabelle dazu?`,
      `A team checks only at dose 0.5 whether OJ works better than VC (difference ${ze('to_d05', 2)}) and concludes that this holds for all doses. What does the table show?`),
    tabelle: tab('tech-ofat', [P('Dosis', 'Dose'), P('OJ (Mittelwert)', 'OJ (mean)'), P('VC (Mittelwert)', 'VC (mean)'), P('Unterschied OJ minus VC', 'Difference OJ minus VC')], QUELLE_ZAHN, P('Zahnlänge nach Zufuhrart und Dosis', 'Tooth length by form of supply and dose')),
    antworten: [
      a(P(`Der Unterschied hängt von der Dosis ab, bei Dosis 2 beträgt er ${zd('to_d2', 2)}: eine Wechselwirkung`, `The difference depends on the dose, at dose 2 it is ${ze('to_d2', 2)}: an interaction of the factors`),
        P('Ein Plan, der einen Faktor nach dem anderen ändert, kann eine Wechselwirkung nicht schätzen. Ein Plan mit allen Kombinationen deckt sie auf.', 'A plan that changes one factor at a time cannot estimate an interaction. A plan with all combinations reveals it.'), true),
      a(P('Der Unterschied bleibt über die Dosen etwa gleich, die Abweichungen dazwischen sind Zufall', 'The difference stays about the same across the doses, the deviations in between are chance'),
        P(`Der Unterschied sinkt von ${zd('to_d05', 2)} bei Dosis 0,5 auf ${zd('to_d2', 2)} bei Dosis 2. Das ist keine kleine Schwankung.`, `The difference falls from ${ze('to_d05', 2)} at dose 0.5 to ${ze('to_d2', 2)} at dose 2. That is no small fluctuation.`)),
      a(P('Der Unterschied wächst mit der Dosis, weil OJ bei hoher Dosis stärker wirkt', 'The difference grows with the dose, because OJ works more strongly at a high dose'),
        P(`Es ist umgekehrt: Bei Dosis 2 liegen OJ (${zd('to_oj2', 2)}) und VC (${zd('to_vc2', 2)}) fast gleichauf.`, `It is the other way round: at dose 2 OJ (${ze('to_oj2', 2)}) and VC (${ze('to_vc2', 2)}) are almost level.`))
    ],
    hilfe: ['zweifaktorielle-varianzanalyse', 'frage-gruppen'], belege: ['wissen:czitrom99-doe-vorteile', 'wissen:czitrom99-ofat-wechselwirkung', 'Czitrom 1999']
  },
  {
    id: 'tech-mittelpunkt', thema: 'technik',
    stamm: P('In einem Plan mit zwei stetigen Faktoren auf je zwei Stufen wird zusätzlich der Mittelpunkt mehrfach gemessen. Wozu dient das?', 'In a design with two continuous factors at two levels each, the centre point is additionally measured several times. What is that for?'),
    antworten: [
      a(P('Es zeigt, ob die Antwort gekrümmt verläuft, und die Wiederholungen schätzen die Streuung', 'It shows whether the response is curved, and the repeats estimate the natural variation'),
        P('Bei Krümmung lässt sich der Plan zu einem zentral zusammengesetzten Plan erweitern. Ein Faktor-nach-Faktor-Versuch sieht Krümmung nur längs seiner Linien.', 'If there is curvature the design can be extended to a central composite design. A one-factor-at-a-time study sees curvature only along its lines.'), true),
      a(P('Es ersetzt die Eckläufe, weil der Mittelpunkt beide Faktoren zugleich abdeckt', 'It replaces the corner runs, because the centre point covers both factors at once'),
        P('Im Mittelpunkt stehen beide Faktoren auf mittlerer Stufe. Daraus allein lässt sich kein Effekt eines Faktors schätzen, die Effekte kommen aus den Eckläufen.', 'At the centre point both factors are at the middle level. No effect of a factor can be estimated from it alone; the effects come from the corner runs.')),
      a(P('Es prüft die Wechselwirkung der beiden Faktoren genauer, weil dort beide ausgeglichen sind', 'It checks the interaction of the two factors more precisely, because both are balanced there'),
        P('Die Wechselwirkung schätzt man aus den Eckläufen. Der Mittelpunkt dient der Prüfung auf Krümmung.', 'The interaction is estimated from the corner runs. The centre point serves to check for curvature.'))
    ],
    hilfe: ['zweifaktorielle-varianzanalyse'], belege: ['wissen:czitrom99-mittelpunkte', 'Czitrom 1999']
  },
  // ---- Fall C: Messsystem ----
  {
    id: 'tech-c-reprod', thema: 'technik', fall: 'tech-msa',
    stamm: P('Was ist die Reproduzierbarkeit eines Messsystems?', 'What is the reproducibility of a measurement system?'),
    antworten: [
      a(P('Die Streuung zwischen verschiedenen Prüfern, Aufbauten oder Zeiträumen', 'The spread between different operators, set-ups or periods of time'),
        P('Die Wiederholbarkeit ist dagegen die Streuung des Geräts bei derselben Einheit, demselben Prüfer und demselben Aufbau.', 'Repeatability, by contrast, is the spread of the instrument for the same unit, the same operator and the same set-up.'), true),
      a(P('Die Streuung desselben Prüfers bei derselben Einheit unter gleichen Bedingungen', 'The spread of the same operator for the same unit under the same conditions'),
        P('Das ist die Wiederholbarkeit. Reproduzierbarkeit meint die Streuung zwischen Prüfern, Aufbauten oder Zeiträumen.', 'That is repeatability. Reproducibility means the spread between operators, set-ups or periods.')),
      a(P('Die Streuung der Teile selbst, die das Messsystem unterscheiden soll', 'The spread of the parts themselves, which the system is meant to tell apart'),
        P('Die Streuung der Teile gehört zum Prozess. Das Messsystem hat nur Wiederholbarkeit und Reproduzierbarkeit.', 'The spread of the parts belongs to the process. The measurement system has only repeatability and reproducibility.'))
    ],
    hilfe: ['messgenauigkeit-typical-error', 'icc'], belege: ['wissen:burdick03-grr', 'Burdick u. a. 2003']
  },
  {
    id: 'tech-c-snr', thema: 'technik', fall: 'tech-msa',
    stamm: P('Angenommen, ein Signal-Rausch-Verhältnis ab 5 gilt als ausreichend und eines unter 2 als nutzlos. Wie sind die beiden Messsysteme einzustufen?', 'Assume a signal-to-noise ratio from 5 counts as sufficient and one below 2 as useless. How are the two measurement systems to be classified?'),
    antworten: [
      a(P('A ist ausreichend, B nutzlos, weil sein Messrauschen im Verhältnis zu den Teilen zu groß ist', 'A is sufficient, B is useless, because its noise is too large relative to the parts'),
        P(`A erreicht ${zd('tm_snr_a', 2)}, B nur ${zd('tm_snr_b', 2)}. Das Messrauschen von B ist im Verhältnis zu den Unterschieden zwischen den Teilen zu groß.`, `A reaches ${ze('tm_snr_a', 2)}, B only ${ze('tm_snr_b', 2)}. The measurement noise of B is too large in relation to the differences between the parts.`), true),
      a(P('Beide sind ausreichend, denn bei beiden stammt über die Hälfte der Streuung von den Teilen', 'Both are sufficient, since for both more than half of the spread comes from the parts'),
        P(`Der Anteil des Prozesses liegt bei A bei ${zd('tm_rho_a', 3)} und bei B bei ${zd('tm_rho_b', 3)}. Die Einstufung läuft aber über das Signal-Rausch-Verhältnis, und B bleibt darunter.`, `The share of the process is ${ze('tm_rho_a', 3)} for A and ${ze('tm_rho_b', 3)} for B. The classification runs through the signal-to-noise ratio, however, and B stays below.`)),
      a(P('A ist nutzlos, B ausreichend, weil A die kleinere Streuung des Messsystems hat und B die größere', 'A is useless, B is sufficient, because A has the smaller spread of the measurement system'),
        P('Eine kleinere Streuung des Messsystems macht ein Verhältnis zu den Teilen größer, also besser. Es ist umgekehrt.', 'A smaller spread of the measurement system makes the ratio to the parts larger, so better. It is the other way round.'))
    ],
    hilfe: ['messgenauigkeit-typical-error', 'icc'], belege: ['wissen:burdick03-snr-dr', 'wissen:burdick03-anteile', 'Burdick u. a. 2003']
  },
  {
    id: 'tech-c-anteil', thema: 'technik', fall: 'tech-msa',
    stamm: P('Wie groß ist beim Messsystem B der Anteil der Gesamtstreuung, der vom Messsystem stammt?', 'How large is, for measurement system B, the share of the total spread that comes from the measurement system?'),
    antworten: [
      a(P(`Rund ${zpr('tm_rho_b')} Prozent: eins minus der Anteil des Prozesses an der Streuung`, `About ${zpr('tm_rho_b')} percent: one minus the share of the process in the total spread`),
        P(`Prozess und Messsystem teilen die Gesamtstreuung. Der Prozess hat ${zp('tm_rho_b')} Prozent, also bleiben ${zpr('tm_rho_b')} Prozent für das Messsystem.`, `Process and measurement system share the total spread. The process has ${zp('tm_rho_b')} percent, so ${zpr('tm_rho_b')} percent remain for the measurement system.`), true),
      a(P(`Rund ${zp('tm_rho_b')} Prozent, denn so groß ist der Anteil in der Tabelle selbst`, `About ${zp('tm_rho_b')} percent, since that is the share in the table itself`),
        P('Die Zahl in der Tabelle ist der Anteil des Prozesses. Der Anteil des Messsystems ist der Rest bis 100 Prozent.', 'The figure in the table is the share of the process. The share of the measurement system is the remainder up to 100 percent.')),
      a(P(`Rund ${anteilMess} Prozent: Streuung des Messsystems geteilt durch Streuung der Teile`, `About ${anteilMess} percent: spread of the measurement system divided by spread of the parts`),
        P('Dieser Quotient setzt das Messsystem ins Verhältnis zu den Teilen. Der Anteil an der Gesamtstreuung teilt durch die Summe beider.', 'This quotient relates the measurement system to the parts. The share of the total spread divides by the sum of both.'))
    ],
    hilfe: ['icc', 'messgenauigkeit-typical-error'], belege: ['wissen:burdick03-anteile', 'Burdick u. a. 2003']
  }
];
