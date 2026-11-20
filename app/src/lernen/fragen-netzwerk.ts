/**
 * Üben: Netzwerkanalyse (B4 Teil 2, 14.11.2026; Einheit `netzwerkanalyse` in lernplan-netzwerk.ts). Kennungen `nw-<kürzel>-…`, Thema `netzwerk`.
 * Alle Zahlen aus dem Big-Five-Ausschnitt (R-Paket psych, bfi; neun Items, 378 Personen) über scripts/ueben-erwartet-netzwerk.R → lib/testdaten/ueben-erwartet-netzwerk.json
 * (zweiter Weg Regressionsreste und corpcor); Wächter lernen/fragen-netzwerk.test.ts.
 * Eigene Wortlaute. Quellen: Epskamp, Borsboom & Fried (2018), Behavior Research Methods 50 (frei zugänglich); Holm (1979).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const EP = 'Epskamp, Borsboom & Fried 2018, Behavior Research Methods 50, 195-212';
const RECHNUNG = 'Rechnung: scripts/ueben-erwartet-netzwerk.R';
const KOPF_DE = 'Partialkorrelationsnetz aus neun Big-Five-Items (4 zur Verträglichkeit A2-A5, 5 zur emotionalen Stabilität N1-N5; 378 Personen, Pearson, ohne Glättung): 36 mögliche Kanten, 6 deutlich nach Holm.';
const KOPF_EN = 'Partial correlation network of nine Big Five items (4 on agreeableness A2-A5, 5 on emotional stability N1-N5; 378 people, Pearson, without smoothing): 36 possible edges, 6 clear after Holm.';

export const FRAGEN: Frage[] = [
  {
    id: 'nw-kante', thema: 'netzwerk', karte: 'korrmatrix',
    stamm: P(`${KOPF_DE} Die Kante N1 – N2 hat eine Partialkorrelation von 0,59. Was bedeutet das? (Netzwerkanalyse)`, `${KOPF_EN} The edge N1 – N2 has a partial correlation of 0.59. What does that mean? (network analysis)`),
    antworten: [
      a(P('N1 und N2 hängen auch dann noch zusammen (0,59), wenn man alle sieben anderen Items festhält', 'N1 and N2 are still related (0.59) when the seven other items are held constant'), P('Das ist die Partialkorrelation: der Zusammenhang zweier Spalten nach Abzug des linearen Einflusses aller anderen.', 'That is the partial correlation: the relationship of two columns after taking out the linear influence of all the others.'), true),
      a(P('Wer bei N1 hoch antwortet, antwortet bei N2 deshalb hoch (N1 verursacht N2)', 'Whoever answers high on N1 answers high on N2 because of it (N1 causes N2)'), P('Eine Kante hat keine Richtung und beweist keine Ursache; sie beschreibt einen Zusammenhang.', 'An edge has no direction and proves no cause; it describes a relationship.')),
      a(P('59 Prozent der Personen antworten bei beiden Items gleich', '59 percent of the people answer both items alike'), P('Eine Partialkorrelation ist kein Anteil von Personen, sondern ein Korrelationskoeffizient zwischen -1 und 1.', 'A partial correlation is not a share of people but a correlation coefficient between -1 and 1.')),
      a(P('Der einfache Zusammenhang von N1 und N2 ist 0,59', 'The simple relationship of N1 and N2 is 0.59'), P('Der einfache Zusammenhang (Korrelation) ist größer, r = 0,71. Die Partialkorrelation ist kleiner, weil die Wege über die anderen Items abgezogen sind.', 'The simple relationship (correlation) is larger, r = 0.71. The partial correlation is smaller because the paths via the other items are taken out.'))
    ],
    hilfe: ['netzwerkanalyse'], belege: [EP, RECHNUNG, 'Hilfe:netzwerkanalyse']
  },
  {
    id: 'nw-indirekt', thema: 'netzwerk', karte: 'korrmatrix',
    stamm: P(`${KOPF_DE} N1 und N3 haben eine Korrelation von r = 0,51, ihre Kante im Netz hat aber nur 0,12 (nach Holm p = ,49). Wie liest man das? (Netzwerkanalyse)`, `${KOPF_EN} N1 and N3 have a correlation of r = 0.51, but their edge in the network is only 0.12 (after Holm p = .49). How do you read this? (network analysis)`),
    antworten: [
      a(P('Der Zusammenhang von N1 und N3 läuft zum größten Teil über andere Items, vor allem N2; der direkte Teil ist klein und nach Holm nicht deutlich', 'The relationship of N1 and N3 runs for the most part via other items, above all N2; the direct part is small and not clear after Holm'), P('N1 – N2 hat 0,59 und N2 – N3 hat 0,28. Wird N2 (und alles andere) festgehalten, bleibt von den 0,51 nur 0,12.', 'N1 – N2 has 0.59 and N2 – N3 has 0.28. When N2 (and everything else) is held constant, only 0.12 of the 0.51 is left.'), true),
      a(P('N1 und N3 hängen in den Daten gar nicht zusammen', 'N1 and N3 are not related at all in the data'), P('Doch: Die Korrelation beträgt 0,51. Die Kante zeigt nur den Teil, der nach Abzug der anderen Items übrig bleibt.', 'They are: the correlation is 0.51. The edge shows only the part that is left after taking out the other items.')),
      a(P('Die Kante muss falsch gerechnet sein, denn sie müsste so groß sein wie r', 'The edge must have been calculated wrongly, because it ought to be as large as r'), P('Beide Zahlen sind richtig und beantworten verschiedene Fragen: Korrelation = Zusammenhang insgesamt, Kante = direkter Zusammenhang bei festgehaltenen anderen.', 'Both numbers are correct and answer different questions: correlation = relationship overall, edge = direct relationship with the others held constant.')),
      a(P('N3 verursacht bei N1 nichts, weil die Kante nicht deutlich ist', 'N3 does not cause anything in N1 because the edge is not clear'), P('Aus einer nicht deutlichen Kante folgt nichts über Ursachen, und eine deutliche beweist auch keine. Das Netz beschreibt nur Zusammenhänge.', 'A not clear edge implies nothing about causes, and a clear one proves none either. The network only describes relationships.'))
    ],
    hilfe: ['netzwerkanalyse', 'frage-partialkorrelation'], belege: [EP, RECHNUNG, 'Hilfe:netzwerkanalyse']
  },
  {
    id: 'nw-holm', thema: 'netzwerk', karte: 'korrmatrix',
    stamm: P(`${KOPF_DE} Die Kante N1 – N3 hat ohne Korrektur p = ,021, nach Holm aber p = ,49. Warum steht im Netz zunächst nur, was nach Holm deutlich ist? (Netzwerkanalyse)`, `${KOPF_EN} The edge N1 – N3 has p = .021 without correction but p = .49 after Holm. Why does the network at first show only what is clear after Holm? (network analysis)`),
    antworten: [
      a(P('Bei 36 Kanten gleichzeitig würden schon allein durch Zufall einige „deutlich“; die Holm-Korrektur passt die p-Werte an die Zahl der Kanten an', 'With 36 edges at once, some would look "clear" by chance alone; the Holm correction adjusts the p values to the number of edges'), P('Wer viele Tests auf einmal macht, findet sonst leicht Zufallstreffer. Holm ist strenger als ohne Korrektur, aber weniger streng als Bonferroni.', 'Whoever runs many tests at once easily finds chance hits otherwise. Holm is stricter than no correction but less strict than Bonferroni.'), true),
      a(P('Weil Kanten mit p über ,05 sicher keinen Zusammenhang haben', 'Because edges with p above .05 surely have no relationship'), P('Ein großer p-Wert heißt nur: Die Daten reichen nicht, um die Kante von 0 zu unterscheiden. Mit mehr Personen könnte sie deutlich werden.', 'A large p value only means that the data do not suffice to tell the edge from 0. With more people it could become clear.')),
      a(P('Weil Holm die Kanten glättet, so dass kleine auf 0 gesetzt werden', 'Because Holm smooths the edges so that small ones are set to 0'), P('Das wäre das Lasso. Holm ändert nur die p-Werte, nicht die Partialkorrelationen; im Netz bleibt jede Kante so geschätzt, wie sie ist.', 'That would be the lasso. Holm changes only the p values, not the partial correlations; in the network every edge stays as estimated.')),
      a(P('Weil die Holm-Korrektur das Bootstrap-Intervall ersetzt', 'Because the Holm correction replaces the bootstrap interval'), P('Beides steht nebeneinander: Das Intervall zeigt, wie unsicher der Wert der Kante ist, der Holm-p-Wert, ob sie von 0 zu unterscheiden ist.', 'Both stand side by side: the interval shows how uncertain the value of the edge is, the Holm p value whether it can be told from 0.'))
    ],
    hilfe: ['netzwerkanalyse', 'korrelationsmatrix'], belege: ['Holm 1979, Scandinavian Journal of Statistics 6', EP, RECHNUNG]
  },
  {
    id: 'nw-staerke', thema: 'netzwerk', karte: 'korrmatrix',
    stamm: P(`${KOPF_DE} N2 hat mit 1,24 die größte Stärke, A4 mit 0,75 die kleinste. Was ist die Stärke? (Netzwerkanalyse)`, `${KOPF_EN} N2 has the largest strength with 1.24, A4 the smallest with 0.75. What is strength? (network analysis)`),
    antworten: [
      a(P('Die Summe der Beträge aller Kanten eines Punkts: Wie stark er insgesamt mit den anderen direkt verbunden ist', 'The sum of the absolute values of all the edges of a node: how strongly it is directly connected to the others overall'), P('Bei N2 ergeben die acht Kanten zusammen 1,24, bei A4 0,75. Das Vorzeichen zählt nicht, nur die Größe.', 'For N2 the eight edges add up to 1.24, for A4 0.75. The sign does not count, only the size.'), true),
      a(P('Wie stark das Item N2 andere Items verursacht', 'How strongly the item N2 causes other items'), P('Die Stärke hat keine Richtung und sagt nichts über Ursachen.', 'Strength has no direction and says nothing about causes.')),
      a(P('Der Mittelwert der Antworten auf das Item', 'The mean of the answers to the item'), P('Mit den Antworten selbst hat die Stärke nichts zu tun, sie fasst die Kanten des Punkts zusammen.', 'Strength has nothing to do with the answers themselves; it sums up the edges of the node.')),
      a(P('Damit ist gezeigt, dass N2 das wichtigste Item der Skala ist', 'This shows that N2 is the most important item of the scale'), P('Die Stärke hängt von den anderen Items und der Messung ab, und ihr Bootstrap-Intervall zeigt, wie unsicher sie ist; „wichtig“ lässt sich daraus nicht ablesen.', 'Strength depends on the other items and the measurement, and its bootstrap interval shows how uncertain it is; "important" cannot be read from it.'))
    ],
    hilfe: ['netzwerkanalyse'], belege: [EP, RECHNUNG, 'Hilfe:netzwerkanalyse']
  },
  {
    id: 'nw-mehrfach', thema: 'netzwerk', mehrfach: true, karte: 'korrmatrix',
    stamm: P(`${KOPF_DE} Welche Aussagen über dieses Netz und das Partialkorrelationsnetz in Statable stimmen? Mehrere können stimmen. (Netzwerkanalyse)`, `${KOPF_EN} Which statements about this network and the partial correlation network in Statable are true? Several can be true. (network analysis)`),
    antworten: [
      a(P('Die Kanten haben keine Richtung.', 'The edges have no direction.'), P('Stimmt. Eine Partialkorrelation ist symmetrisch: Kante A – B ist dieselbe wie B – A.', 'True. A partial correlation is symmetric: edge A – B is the same as B – A.'), true),
      a(P('Im Big-Five-Beispiel ist keine der 20 Kanten zwischen den A-Items und den N-Items nach Holm deutlich.', 'In the Big Five example none of the 20 edges between the A items and the N items is clear after Holm.'), P('Stimmt. Die größte davon (A5 – N4, -0,14) hat nach Holm p = ,19; die sechs deutlichen Kanten liegen alle innerhalb der Gruppen.', 'True. The largest of them (A5 – N4, -0.14) has p = .19 after Holm; the six clear edges all lie within the groups.'), true),
      a(P('Ein Netz aus Daten zu einem Zeitpunkt zeigt, welche Items sich gegenseitig auslösen.', 'A network from data at one time point shows which items trigger each other.'), P('Stimmt nicht. Es zeigt Zusammenhänge, keine Ursachen und keine Richtung.', 'Not true. It shows relationships, no causes and no direction.')),
      a(P('Statable glättet das Netz mit dem Lasso, so dass kleine Kanten genau 0 sind.', 'Statable smooths the network with the lasso so that small edges are exactly 0.'), P('Stimmt nicht. Statable rechnet ohne Glättung: Jede Kante wird geschätzt, und die Unsicherheit steht in Intervall und Holm-p.', 'Not true. Statable calculates without smoothing: every edge is estimated, and the uncertainty is given by the interval and Holm p.'))
    ],
    hilfe: ['netzwerkanalyse'], belege: [EP, RECHNUNG, 'Hilfe:netzwerkanalyse']
  }
];
