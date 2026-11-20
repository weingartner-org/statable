/**
 * Üben: Paneldaten (B2 Teil 1c, 14.11.2026; Einheiten `panel-feste-effekte`, `cluster-robust`, `hausman-test` in lernen/lernplan-panel.ts). Kennungen `pan-<kürzel>`, Thema `panel`.
 * Alle Zahlen: Grunfeld-Daten (zehn US-Firmen, 1935 bis 1954, 200 Beobachtungen; inv erklärt durch value und capital) aus scripts/panel-erwartet.R
 * (lib/panel-erwartet.json; plm und sandwich, zweiter Weg von Hand); Wächter lernen/fragen-panel.test.ts. Eigene Wortlaute.
 * Quellen: Cameron & Miller (2015), Journal of Human Resources 50(2); Croissant & Millo (2008), Journal of Statistical Software 27(2).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const CM = 'Cameron & Miller 2015, Journal of Human Resources 50(2), 317-372';
const CR = 'Croissant & Millo 2008, Journal of Statistical Software 27(2)';
const RECHNUNG = 'Rechnung: scripts/panel-erwartet.R';
const KOPF_DE = 'Grunfeld-Daten: zehn US-Firmen, 20 Jahre (200 Beobachtungen); die Investition (inv) wird durch Marktwert (value) und Kapitalstock (capital) erklärt.';
const KOPF_EN = 'Grunfeld data: ten US firms, 20 years (200 observations); investment (inv) is explained by market value (value) and capital stock (capital).';

export const FRAGEN: Frage[] = [
  {
    id: 'pan-within', thema: 'panel', karte: 'vorhersage',
    stamm: P('Woraus schätzt ein Modell mit festen Effekten (Within) den Zusammenhang? (Paneldaten)', 'What does a fixed-effects (within) model estimate the relationship from? (panel data)'),
    antworten: [
      a(P('Nur aus den Veränderungen innerhalb jeder Einheit; jede Einheit wird mit sich selbst verglichen', 'Only from the changes within each unit; each unit is compared with itself'), P('Das ist der Kern: Jede Einheit bekommt ihren eigenen Ausgangswert, alles, was bei ihr gleich bleibt, fällt heraus.', 'That is the core: each unit gets its own starting level, everything that stays the same for it drops out.'), true),
      a(P('Nur aus dem Vergleich der Einheitsmittelwerte untereinander', 'Only from the comparison of the unit means with each other'), P('Das beschreibt das Between-Modell. Feste Effekte schalten genau diesen Vergleich zwischen den Einheiten aus.', 'That describes the between model. Fixed effects switch off exactly this comparison between units.')),
      a(P('Aus allen Zeilen, als wären es lauter verschiedene Einheiten', 'From all rows as if they were all different units'), P('Das ist das Pooled-Modell, das die Einheiten nicht unterscheidet.', 'That is the pooled model, which does not distinguish the units.')),
      a(P('Aus einer zufälligen Auswahl von Zeitpunkten je Einheit', 'From a random selection of time points per unit'), P('Es werden alle Zeitpunkte genutzt; Zufall kommt in den „zufälligen Effekten“ nur als Annahme über die Einheiten vor.', 'All time points are used; chance appears in "random effects" only as an assumption about the units.'))
    ],
    hilfe: ['paneldaten'], belege: [CR, CM, 'Hilfe:paneldaten']
  },
  {
    id: 'pan-konstant', thema: 'panel', karte: 'vorhersage',
    stamm: P('In einer Panel-Tabelle mit Firma und Jahr gibt es auch die Spalte „Gründungsjahr der Firma“, die sich bei jeder Firma nie ändert. Was passiert damit im Modell mit festen Effekten? (Paneldaten)', 'In a panel table with firm and year there is also the column "year the firm was founded", which never changes for any firm. What happens to it in the fixed-effects model? (panel data)'),
    antworten: [
      a(P('Ihr Zusammenhang lässt sich nicht schätzen; sie fällt weg, Statable nennt sie mit Namen', 'Its relationship cannot be estimated; it drops out, Statable names it'), P('Innerhalb einer Firma bleibt das Gründungsjahr gleich, also gibt es keine Veränderung, aus der sich etwas schätzen ließe.', 'Within a firm the founding year stays the same, so there is no change from which anything could be estimated.'), true),
      a(P('Sie wird besonders genau geschätzt, weil sie nicht schwankt', 'It is estimated especially precisely because it does not vary'), P('Ohne Schwankung innerhalb der Einheit gibt es keine Information für diese Schätzung.', 'Without variation within the unit there is no information for this estimate.')),
      a(P('Sie wird automatisch durch das Jahr ersetzt', 'It is automatically replaced by the year'), P('Statable ersetzt nichts heimlich, es nennt die Spalte mit Namen und rechnet das Modell erst ohne sie.', 'Statable replaces nothing secretly, it names the column and only calculates the model without it.')),
      a(P('Sie geht unverändert ins Modell ein wie jedes andere Merkmal', 'It enters the model unchanged like any other feature'), P('Gerade das geht bei festen Effekten nicht: Die Einheiten-Unterschiede stecken schon in den festen Effekten.', 'That is exactly what does not work with fixed effects: the unit differences are already in the fixed effects.'))
    ],
    hilfe: ['paneldaten'], belege: [CR, 'Hilfe:paneldaten']
  },
  {
    id: 'pan-kapital', thema: 'panel', karte: 'vorhersage',
    stamm: P(`${KOPF_DE} Der Kapitalstock hat im Between-Modell (Firmenmittelwerte) die Steigung 0,032, im Modell mit festen Effekten 0,310. Wie lesen Sie das? (Paneldaten)`, `${KOPF_EN} The capital stock has the slope 0.032 in the between model (firm means), 0.310 in the fixed-effects model. How do you read this? (panel data)`),
    antworten: [
      a(P('Firmen mit viel Kapital investieren nicht mehr als andere, aber dieselbe Firma investiert mehr, wenn ihr Kapital wächst', 'Firms with a lot of capital do not invest more than others, but the same firm invests more when its capital grows'), P('Between vergleicht Firmen miteinander (kaum Zusammenhang), Within vergleicht jede Firma mit sich selbst (deutlicher Zusammenhang). Beide Fragen sind verschieden.', 'Between compares firms with each other (hardly any relationship), within compares each firm with itself (a clear relationship). They are different questions.'), true),
      a(P('Eines der beiden Modelle ist fehlerhaft gerechnet', 'One of the two models was calculated wrongly'), P('Beide sind richtig; sie beantworten verschiedene Fragen und dürfen verschieden ausfallen.', 'Both are right; they answer different questions and may differ.')),
      a(P('Kapital wirkt zehnmal stärker auf Investitionen, als der Between-Wert zeigt, und das ist bewiesen', 'Capital has ten times the effect on investment than the between value shows, and this is proven'), P('Ein Zusammenhang innerhalb der Firmen ist kein bewiesener Wirkungsfaktor; zudem hängt die Zahl von der Frage ab (zwischen oder innerhalb).', 'A relationship within the firms is not a proven effect; the number also depends on the question (between or within).')),
      a(P('Der Unterschied ist Zufall und darf ignoriert werden', 'The difference is chance and may be ignored'), P('Der Unterschied ist groß und hat einen Sinn: Er zeigt, dass Vergleich zwischen und innerhalb der Firmen Verschiedenes sagt.', 'The difference is large and has meaning: it shows that comparison between and within firms says different things.'))
    ],
    hilfe: ['paneldaten'], belege: [CR, RECHNUNG, 'Hilfe:paneldaten']
  },
  {
    id: 'pan-mehrfach', thema: 'panel', mehrfach: true, karte: 'vorhersage',
    stamm: P('Welche Aussagen über Paneldaten stimmen? Mehrere können stimmen. (Paneldaten)', 'Which statements about panel data are true? Several can be true. (panel data)'),
    antworten: [
      a(P('Mit festen Effekten fällt alles heraus, was bei einer Einheit über die Zeit gleich bleibt, auch wenn es nicht gemessen wurde.', 'With fixed effects everything drops out that stays the same for a unit over time, even if it was not measured.'), P('Stimmt: Jede Einheit bekommt ihren eigenen Ausgangswert.', 'True: each unit gets its own starting level.'), true),
      a(P('Zufällige Effekte und der Hausman-Test rechnet Statable nur bei einem Panel, in dem jede Einheit gleich oft gemessen wurde.', 'Statable calculates random effects and the Hausman test only for a panel in which every unit was measured equally often.'), P('Stimmt: Bei ungleichen Zahlen gibt es mehrere gebräuchliche Rechenwege, Statable wählt keinen heimlich.', 'True: with unequal numbers there are several common ways of calculating, Statable does not choose one secretly.'), true),
      a(P('Feste Effekte belegen, dass die Veränderung im Merkmal die Veränderung im Ergebnis verursacht.', 'Fixed effects prove that the change in the feature causes the change in the outcome.'), P('Stimmt nicht: Was sich bei der Einheit zugleich ändert und nicht gemessen ist, bleibt als Erklärung möglich.', 'Not true: what changes for the unit at the same time and is not measured remains a possible explanation.')),
      a(P('Das Pooled-Modell ist das beste Modell, weil es die meisten Zeilen nutzt.', 'The pooled model is the best model because it uses the most rows.'), P('Stimmt nicht: Es ignoriert, dass sich die Einheiten unterscheiden. Beim Grunfeld-Beispiel zeigt der F-Test deutliche Firmen-Unterschiede.', 'Not true: it ignores that the units differ. In the Grunfeld example the F test shows clear differences between firms.'))
    ],
    hilfe: ['paneldaten'], belege: [CR, 'Hilfe:paneldaten']
  },

  {
    id: 'pan-cr-warum', thema: 'panel', karte: 'vorhersage',
    stamm: P('Warum sind gewöhnliche Standardfehler bei Paneldaten oft zu klein? (cluster-robuste Standardfehler)', 'Why are ordinary standard errors often too small with panel data? (cluster-robust standard errors)'),
    antworten: [
      a(P('Weil Zeilen derselben Einheit einander ähneln und weniger neue Information bringen, als die Rechnung annimmt', 'Because rows of the same unit resemble each other and bring less new information than the calculation assumes'), P('Gewöhnliche Standardfehler gehen von unabhängigen Zeilen aus. Zwanzig Jahre derselben Firma sind keine zwanzig unabhängigen Firmen.', 'Ordinary standard errors assume independent rows. Twenty years of the same firm are not twenty independent firms.'), true),
      a(P('Weil die Software bei vielen Zeilen zu klein rechnet', 'Because the software calculates too small with many rows'), P('Die Zahl der Zeilen ist nicht das Problem, sondern die Abhängigkeit zwischen Zeilen derselben Einheit.', 'The number of rows is not the problem but the dependence between rows of the same unit.')),
      a(P('Weil die Schätzwerte selbst falsch sind', 'Because the estimates themselves are wrong'), P('Die Schätzwerte bleiben gleich, nur ihre Genauigkeit wird überschätzt.', 'The estimates stay the same, only their precision is overstated.')),
      a(P('Weil Paneldaten normalverteilt sein müssen', 'Because panel data must be normally distributed'), P('Um Normalverteilung geht es hier nicht, sondern um Unabhängigkeit.', 'This is not about normal distribution but about independence.'))
    ],
    hilfe: ['cluster-robust'], belege: [CM, 'Hilfe:cluster-robust']
  },
  {
    id: 'pan-cr-pooled', thema: 'panel', karte: 'vorhersage',
    stamm: P(`${KOPF_DE} Im Pooled-Modell ist der klassische Standardfehler des Marktwerts 0,0058, der cluster-robuste 0,0159. Was folgt? (cluster-robuste Standardfehler)`, `${KOPF_EN} In the pooled model the classical standard error of market value is 0.0058, the cluster-robust one 0.0159. What follows? (cluster-robust standard errors)`),
    antworten: [
      a(P('Der klassische Wert überschätzt die Genauigkeit stark: Der cluster-robuste Fehler ist das 2,7-fache', 'The classical value overstates the precision considerably: the cluster-robust error is 2.7 times as large'), P('0,0159 geteilt durch 0,0058 sind etwa 2,7. Konfidenzintervalle und p-Werte sollen mit dem größeren Wert gebildet werden.', '0.0159 divided by 0.0058 is about 2.7. Confidence intervals and p values should be formed with the larger value.'), true),
      a(P('Beide Werte sind praktisch gleich', 'Both values are practically the same'), P('Sie unterscheiden sich um das 2,7-fache.', 'They differ by a factor of 2.7.')),
      a(P('Der cluster-robuste Wert ist kleiner, weil er genauer rechnet', 'The cluster-robust value is smaller because it calculates more precisely'), P('Er ist größer: Er berücksichtigt, dass Zeilen derselben Firma zusammenhängen.', 'It is larger: it takes into account that rows of the same firm are related.')),
      a(P('Der Marktwert hat im Modell keinen Einfluss', 'Market value has no influence in the model'), P('Die Schätzung (0,1156) bleibt gleich; nur ihre Unsicherheit ist größer, als der klassische Fehler zeigt.', 'The estimate (0.1156) stays the same; only its uncertainty is larger than the classical error shows.'))
    ],
    hilfe: ['cluster-robust'], belege: [CM, RECHNUNG, 'Hilfe:cluster-robust']
  },
  {
    id: 'pan-cr-wenige', thema: 'panel', karte: 'vorhersage',
    stamm: P(`${KOPF_DE} Statable warnt bei zehn Firmen: „unter etwa 30 Einheiten sind auch cluster-robuste Standardfehler zu klein“. Warum? (cluster-robuste Standardfehler)`, `${KOPF_EN} Statable warns with ten firms: "below about 30 units even cluster-robust standard errors are too small". Why? (cluster-robust standard errors)`),
    antworten: [
      a(P('Die Theorie dahinter gilt für viele Einheiten; mit nur zehn Blöcken ist die Schätzung der Streuung selbst ungenau und tendiert zu klein', 'The theory behind it holds for many units; with only ten blocks the estimate of the variation is itself imprecise and tends to be too small'), P('Je weniger Cluster, desto schlechter schätzt die Rechnung die Unsicherheit. Deshalb verwendet Statable für die p-Werte die t-Verteilung mit G − 1 = 9 Freiheitsgraden, und die Warnung bleibt.', 'The fewer clusters, the worse the calculation estimates the uncertainty. That is why Statable uses the t distribution with G − 1 = 9 degrees of freedom for the p values, and the warning stays.'), true),
      a(P('Weil zehn Firmen zu wenig Zeilen sind (es sind 200)', 'Because ten firms are too few rows (there are 200)'), P('Es kommt auf die Zahl der Einheiten an, nicht der Zeilen: 200 Zeilen aus nur 10 Firmen sind 10 Blöcke.', 'It is the number of units that counts, not of rows: 200 rows from only 10 firms are 10 blocks.')),
      a(P('Weil die Software nur ab 30 Einheiten rechnen kann', 'Because the software can only calculate from 30 units'), P('Sie rechnet auch mit zehn; die Warnung sagt nur, dass das Ergebnis dann unsicher ist.', 'It also calculates with ten; the warning only says that the result is then uncertain.')),
      a(P('Weil mit wenigen Einheiten alle Standardfehler gleich groß werden', 'Because with few units all standard errors become the same size'), P('Das ist keine Folge; die Warnung betrifft nur die Verlässlichkeit.', 'That is not a consequence; the warning concerns only reliability.'))
    ],
    hilfe: ['cluster-robust'], belege: [CM, 'Hilfe:cluster-robust']
  },
  {
    id: 'pan-cr-mehrfach', thema: 'panel', mehrfach: true, karte: 'vorhersage',
    stamm: P('Welche Aussagen über cluster-robuste Standardfehler stimmen? Mehrere können stimmen. (cluster-robuste Standardfehler)', 'Which statements about cluster-robust standard errors are true? Several can be true. (cluster-robust standard errors)'),
    antworten: [
      a(P('Sie ändern die Standardfehler, nicht die geschätzten Werte.', 'They change the standard errors, not the estimated values.'), P('Stimmt: Die Koeffizienten b bleiben gleich.', 'True: the coefficients b stay the same.'), true),
      a(P('Jede Einheit wird als ein Block behandelt; innerhalb des Blocks darf alles zusammenhängen.', 'Each unit is treated as one block; within the block anything may be related.'), P('Stimmt: Nur zwischen den Blöcken wird Unabhängigkeit angenommen.', 'True: only between the blocks is independence assumed.'), true),
      a(P('Sie beseitigen eine Verzerrung durch fehlende Merkmale.', 'They remove bias caused by missing features.'), P('Stimmt nicht: Sie berühren nur die Standardfehler.', 'Not true: they touch only the standard errors.')),
      a(P('Sie helfen auch, wenn die Einheiten selbst voneinander abhängen (zum Beispiel durch einen gemeinsamen Konjunkturschock).', 'They also help when the units themselves depend on each other (for example through a common economic shock).'), P('Stimmt nicht: Sie nehmen Unabhängigkeit zwischen den Einheiten an.', 'Not true: they assume independence between the units.'))
    ],
    hilfe: ['cluster-robust'], belege: [CM, 'Hilfe:cluster-robust']
  },

  {
    id: 'pan-ha-ftest', thema: 'panel', karte: 'vorhersage',
    stamm: P(`${KOPF_DE} Der F-Test auf Firmen-Effekte ergibt F(9; 188) = 49,18, p < ,001. Was heißt das? (F-Test, Hausman-Test)`, `${KOPF_EN} The F test for firm effects gives F(9, 188) = 49.18, p < .001. What does this mean? (F test, Hausman test)`),
    antworten: [
      a(P('Die Firmen unterscheiden sich deutlich; ein Modell, das alle Firmen gleich behandelt (Pooled), ist nicht angemessen', 'The firms differ clearly; a model that treats all firms alike (pooled) is not appropriate'), P('Der Test vergleicht Pooled mit dem Modell mit festen Effekten; ein so großes F spricht klar für die Unterschiede.', 'The test compares pooled with the fixed-effects model; such a large F speaks clearly for the differences.'), true),
      a(P('Die Firmen unterscheiden sich nicht', 'The firms do not differ'), P('Ein deutliches Ergebnis (p < ,001) spricht für Unterschiede.', 'A clear result (p < .001) speaks for differences.')),
      a(P('Zufällige Effekte sind den festen vorzuziehen', 'Random effects are to be preferred to fixed ones'), P('Dazu sagt dieser Test nichts; das ist Aufgabe des Hausman-Tests.', 'This test says nothing about that; that is the job of the Hausman test.')),
      a(P('Der Marktwert erklärt die Investition besonders gut', 'Market value explains investment particularly well'), P('Der Test betrifft Unterschiede zwischen den Firmen, nicht die Stärke eines einzelnen Merkmals.', 'The test concerns differences between the firms, not the strength of a single feature.'))
    ],
    hilfe: ['hausman-test'], belege: [CR, RECHNUNG, 'Hilfe:hausman-test']
  },
  {
    id: 'pan-ha-lesen', thema: 'panel', karte: 'vorhersage',
    stamm: P(`${KOPF_DE} Der Hausman-Test ergibt χ²(2) = 2,33, p = ,312. Was darf man daraus ableiten? (F-Test, Hausman-Test)`, `${KOPF_EN} The Hausman test gives χ²(2) = 2.33, p = .312. What may be concluded? (F test, Hausman test)`),
    antworten: [
      a(P('Der Test sieht keinen deutlichen Unterschied zwischen festen und zufälligen Effekten; bewiesen ist damit nicht, dass zufällige Effekte stimmen, zumal er bei zehn Firmen wenig Kraft hat', 'The test sees no clear difference between fixed and random effects; this does not prove that random effects hold, especially as it has little power with ten firms'), P('Ein nicht deutliches Ergebnis ist kein Beleg für die Annahme; die Schätzungen liegen nahe beieinander (value 0,1101 gegen 0,1098).', 'A non-significant result is no evidence for the assumption; the estimates lie close together (value 0.1101 against 0.1098).'), true),
      a(P('Zufällige Effekte sind damit bewiesen', 'Random effects are thereby proven'), P('Das wäre ein Schluss aus „nicht deutlich“ auf „bewiesen“.', 'That would be a conclusion from "not clear" to "proven".')),
      a(P('Feste Effekte sind damit widerlegt', 'Fixed effects are thereby refuted'), P('Feste Effekte bleiben gültig; sie brauchen die fragliche Annahme gar nicht.', 'Fixed effects remain valid; they do not need the assumption in question at all.')),
      a(P('Die Modelle sind alle gleich gut, und man muss nichts mehr überlegen', 'The models are all equally good and nothing more needs to be considered'), P('Die Wahl hängt auch an der Frage und an der Auswahl der Einheiten (alle großen US-Firmen sind keine Zufallsstichprobe aus einer großen Menge).', 'The choice also depends on the question and on how the units were selected (all large US firms are not a random sample from a large set).'))
    ],
    hilfe: ['hausman-test'], belege: [CR, RECHNUNG, 'Hilfe:hausman-test']
  },
  {
    id: 'pan-ha-idee', thema: 'panel', karte: 'vorhersage',
    stamm: P('Was vergleicht der Hausman-Test? (F-Test, Hausman-Test)', 'What does the Hausman test compare? (F test, Hausman test)'),
    antworten: [
      a(P('Die Schätzungen der festen und der zufälligen Effekte: Liegen sie weit auseinander, ist die Annahme der zufälligen Effekte zweifelhaft', 'The estimates of fixed and random effects: if they lie far apart, the assumption of random effects is doubtful'), P('Zufällige Effekte nehmen an, dass die Einheiten-Unterschiede nichts mit den Merkmalen zu tun haben; bei Verletzung weichen die beiden Schätzungen ab.', 'Random effects assume that the unit differences have nothing to do with the features; if violated the two estimates diverge.'), true),
      a(P('Das Pooled-Modell mit dem Between-Modell', 'The pooled model with the between model'), P('Das sind andere Modelle; der Hausman-Test stellt feste und zufällige Effekte gegenüber.', 'Those are other models; the Hausman test contrasts fixed and random effects.')),
      a(P('Den klassischen mit dem cluster-robusten Standardfehler', 'The classical with the cluster-robust standard error'), P('Standardfehler vergleicht er nicht, sondern Schätzwerte; der klassische Test gilt außerdem nur mit gewöhnlichen Standardfehlern.', 'It does not compare standard errors but estimates; the classical test also holds only with ordinary standard errors.')),
      a(P('Zwei Gruppen von Einheiten', 'Two groups of units'), P('Es geht um zwei Schätzverfahren für dieselben Daten, nicht um zwei Gruppen.', 'It is about two estimation methods for the same data, not about two groups.'))
    ],
    hilfe: ['hausman-test'], belege: [CR, 'Hilfe:hausman-test']
  },
  {
    id: 'pan-ha-mehrfach', thema: 'panel', mehrfach: true, karte: 'vorhersage',
    stamm: P('Welche Aussagen über die Wahl zwischen festen und zufälligen Effekten stimmen? Mehrere können stimmen. (F-Test, Hausman-Test)', 'Which statements about choosing between fixed and random effects are true? Several can be true. (F test, Hausman test)'),
    antworten: [
      a(P('Zufällige Effekte sind genauer, stimmen aber nur, wenn die Einheiten-Unterschiede nichts mit den Merkmalen zu tun haben.', 'Random effects are more precise but hold only if the unit differences have nothing to do with the features.'), P('Stimmt: Gilt die Annahme nicht, ist die Schätzung verzerrt.', 'True: if the assumption does not hold the estimate is biased.'), true),
      a(P('Der klassische Hausman-Test gilt nicht, wenn man cluster-robuste Standardfehler verwendet; die robuste Fassung (Mundlak-Regression) rechnet Statable nicht.', 'The classical Hausman test does not hold when cluster-robust standard errors are used; the robust version (Mundlak regression) is not calculated by Statable.'), P('Stimmt: Er gehört dann in R.', 'True: it then belongs in R.'), true),
      a(P('Ein nicht deutlicher Hausman-Test beweist, dass zufällige Effekte richtig sind.', 'A non-significant Hausman test proves that random effects are right.'), P('Stimmt nicht: Mit wenigen Einheiten sieht der Test kaum einen Unterschied.', 'Not true: with few units the test hardly ever sees a difference.')),
      a(P('Wer eine Ursache schätzen will und alle Einheiten einer kleinen Menge untersucht, nimmt besser zufällige Effekte, weil sie genauer sind.', 'Whoever wants to estimate a cause and studies all units of a small set had better take random effects because they are more precise.'), P('Stimmt nicht: Meist nimmt man dann feste Effekte, weil sie die Annahme nicht brauchen.', 'Not true: one usually takes fixed effects then because they do not need the assumption.'))
    ],
    hilfe: ['hausman-test'], belege: [CR, CM, 'Hilfe:hausman-test']
  }
];
