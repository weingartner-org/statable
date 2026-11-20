/**
 * Üben: Was zeigen die Rechner unter "Verstehen", das Lernlabor und die Werkzeuge für Planen und Berichten? (Funktionsfragen, Charge 4, 01.11.2026)
 * Verteilungen berechnen, Aus Kennzahlen rechnen, Anteilstest verstehen, Aufgabe und Kennlinie, Zufall zuteilen, Lernlabor, Studie planen,
 * Ergebnissatz, Diagramm anpassen, Tabelle für die Veröffentlichung, Mittelwert nach Gruppe. Quelle: die Hilfe-Artikel (Belege `Hilfe:<id>`).
 * Ohne Zahlen aus Rechnungen und ohne Tabellen.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

export const FRAGEN: Frage[] = [
  {
    id: 'rc-hoechstens', thema: 'rechner', probieren: 'verteilungen',
    stamm: P('Im Rechner "Verteilungen berechnen" wird eine Binomialverteilung gewählt. Worin unterscheiden sich "höchstens 5" und "weniger als 5"?',
      'In the calculator "Calculate distributions" a binomial distribution is chosen. How do "at most 5" and "fewer than 5" differ?'),
    antworten: [
      a(P('"Höchstens 5" enthält den Wert 5 mit seiner eigenen Wahrscheinlichkeit, "weniger als 5" nicht', '"At most 5" includes the value 5 with its own probability, "fewer than 5" does not'),
        P('Das ist der häufigste Schulfehler; darum zeigt Statable alle vier Fragen untereinander. Bei Normal-, t-, χ²- und F-Verteilung haben einzelne Werte die Wahrscheinlichkeit 0, dort sind beide gleich.', 'This is the most common school mistake; that is why Statable shows all four questions one below the other. For normal, t, χ² and F distributions single values have probability 0, so both are equal there.'), true),
      a(P('Es gibt keinen Unterschied, weil einzelne Werte bei jeder Verteilung die Wahrscheinlichkeit 0 haben', 'There is no difference, because single values have probability 0 in every distribution'),
        P('Das gilt nur für stetige Verteilungen. Bei Binomial-, Poisson- und hypergeometrischer Verteilung zählt X ganze Werte.',
          'That holds only for continuous distributions. For binomial, Poisson and hypergeometric distributions X counts whole values.')),
      a(P('"Weniger als 5" schließt den Wert 5 ein, während "höchstens 5" ihn ausschließt', '"Fewer than 5" includes the value 5, whereas "at most 5" excludes it'),
        P('Es ist umgekehrt. Höchstens 5 heißt 5 oder weniger.',
          'It is the other way round. At most 5 means 5 or fewer.'))
    ],
    hilfe: ['verstehen-verteilungen'], belege: ['Hilfe:verstehen-verteilungen']
  },
  {
    id: 'rc-eigene', thema: 'rechner', probieren: 'verteilungen',
    stamm: P('Bei einer eigenen Verteilung weicht die Summe der eingetragenen Wahrscheinlichkeiten P(x) von 1 ab. Wie geht der Rechner damit um?',
      'For a custom distribution the sum of the entered probabilities P(x) deviates from 1. How does the calculator handle this?'),
    antworten: [
      a(P('Er passt nichts still an und fragt nach: "Auf 1 setzen" oder "So lassen", falls gerundet', 'It adjusts nothing silently and asks: "Scale to 1" or "Leave as is", if rounded'),
        P('Nichts wird still angepasst. E(X) ist der Mittelwert auf lange Sicht, nicht der häufigste Wert.', 'Nothing is adjusted silently. E(X) is the long-run mean, not the most frequent value.'), true),
      a(P('Er teilt alle P(x) durch die Summe und rechnet sofort weiter, ohne den Anwender zu fragen', 'It divides all P(x) by the sum and carries on immediately, without asking the user'),
        P('Das wäre eine stille Anpassung. Der Rechner fragt stattdessen nach, damit ein Tippfehler auffällt.',
          'That would be a silent adjustment. The calculator asks instead, so that a typing error becomes noticeable.')),
      a(P('Er sperrt die Rechnung und lässt dem Anwender keine Wahl, bis die Summe genau 1 ergibt', 'It blocks the calculation and offers the user no choice until the sum is exactly 1'),
        P('Es gibt zwei Wahlmöglichkeiten. Gerundete Werte wie 1/3 sind ein häufiger, harmloser Grund für die Abweichung.',
          'There are two options. Rounded values such as 1/3 are a frequent, harmless reason for the deviation.'))
    ],
    hilfe: ['verstehen-verteilungen'], belege: ['Hilfe:verstehen-verteilungen']
  },
  {
    id: 'rc-wilson', thema: 'rechner', probieren: 'kennzahlen',
    stamm: P('Das Intervall der Kachel "Aus Kennzahlen rechnen" weicht von der Schulbuchformel ab. Woran liegt das?', 'The interval of the tile "Calculate from summary numbers" differs from the textbook formula. What is the reason?'),
    antworten: [
      a(P('Statable rechnet Wilson; die Schulformel (Wald) ist eine Näherung, bei kleinem n ungenau', 'Statable uses Wilson; the school formula (Wald) is an approximation, poor for small n'),
        P('Die Zahl im Buch ist nicht falsch gerechnet, sondern eine Näherung. Wilson kehrt den Score-Test um und hält die Überdeckung auch bei kleinem n gut; exakt ist es nicht. Die Näherung kann sogar über 1 hinausragen.', 'The number in the book is not miscalculated, but an approximation. Wilson inverts the score test and keeps good coverage even for small n; it is not exact. The approximation can even exceed 1.'), true),
      a(P('Das Schulbuch rechnet falsch, denn die Formel ist veraltet und wurde durch Wilson ersetzt', 'The textbook calculates wrongly, since the formula is outdated and has been replaced by Wilson'),
        P('Das Schulbuch rechnet die Näherung richtig aus. Sie ist nur ungenauer als Wilson.',
          'The textbook calculates the approximation correctly. It is merely less exact than Wilson.')),
      a(P('Statable verwendet eine Stetigkeitskorrektur, wie R mit prop.test, das Schulbuch nicht', 'Statable uses a continuity correction, like R with prop.test, whereas the textbook does not'),
        P('Statable rechnet ohne Stetigkeitskorrektur; prop.test hat sie als Voreinstellung und gibt darum wieder andere Grenzen.',
          'Statable calculates without continuity correction; prop.test has it as default and therefore gives yet other limits.'))
    ],
    hilfe: ['verstehen-kennzahlen'], belege: ['Hilfe:verstehen-kennzahlen']
  },
  {
    id: 'rc-anteil-alpha', thema: 'rechner', probieren: 'anteilstest',
    stamm: P('Im Rechner "Anteilstest verstehen" liegt das tatsächliche α unter dem gewählten. Woran liegt das?', 'In the calculator "Understand the test for a proportion" the actual α lies below the chosen one. What is the reason?'),
    antworten: [
      a(P('X hat nur ganze Werte, darum bleibt das tatsächliche α oft unter dem gewählten', 'X has only whole values, so the actual α often stays below the chosen one'),
        P('Rechtsseitig ist K = {g, …, n} mit dem kleinsten g, für das P(X ≥ g) ≤ α gilt. Ist K leer, kann H₀ bei diesem n auf dem Niveau nie abgelehnt werden.', 'One-sided to the right K = {g, …, n} with the smallest g for which P(X ≥ g) ≤ α. If K is empty, H₀ can never be rejected at this level for this n.'), true),
      a(P('Statable halbiert das Niveau absichtlich, um bei der Entscheidung vorsichtig zu sein', 'Statable halves the level on purpose in order to be careful in the decision'),
        P('Es wird nichts halbiert. Beim zweiseitigen Test teilt sich α auf beide Seiten, das ist aber ein anderer Punkt.',
          'Nothing is halved. In the two-sided test α is split between both sides, but that is a different point.')),
      a(P('Der Test ist einseitig, und einseitige Tests rechnen grundsätzlich mit dem halben Niveau', 'The test is one-sided, and one-sided tests calculate with half the level as a rule'),
        P('Das tatsächliche α liegt auch beim zweiseitigen Test unter dem gewählten. Ursache ist die Diskretheit der Verteilung.',
          'The actual α lies below the chosen one in the two-sided test, too. The cause is the discreteness of the distribution.'))
    ],
    hilfe: ['verstehen-anteilstest'], belege: ['Hilfe:verstehen-anteilstest']
  },
  {
    id: 'rc-anteil-p', thema: 'rechner', probieren: 'anteilstest',
    stamm: P('Wie bildet der Rechner "Anteilstest verstehen" den zweiseitigen p-Wert?', 'How does the calculator "Understand the test for a proportion" form the two-sided p value?'),
    antworten: [
      a(P('Er verdoppelt den kleineren einseitigen Wert (höchstens 1); so stimmen Entscheidung und p', 'It doubles the smaller one-sided value (at most 1), so decision and p agree'),
        P('Es gilt: x liegt in K genau dann, wenn p ≤ α. R (binom.test) rechnet zweiseitig anders und kann bei p₀ ungleich der Mitte einen kleineren p-Wert geben.', 'The rule: x lies in K exactly when p ≤ α. R (binom.test) calculates two-sided differently and can give a smaller p value when p₀ is not in the middle.'), true),
      a(P('Er addiert alle Wahrscheinlichkeiten, die höchstens so groß sind wie die des beobachteten Werts', 'It adds all probabilities that are at most as large as that of the observed value'),
        P('Das ist die Rechnung von binom.test in R. Der Rechner nimmt die einfache Verdopplung.',
          'That is the calculation of binom.test in R. The calculator takes the simple doubling.')),
      a(P('Er nimmt den einseitigen Wert unverändert, weil die Richtung bereits gewählt ist', 'It takes the one-sided value unchanged, because the direction is already chosen'),
        P('Beim zweiseitigen Test fließen beide Seiten ein. Der einseitige Wert allein wäre zu klein.',
          'In the two-sided test both sides count. The one-sided value alone would be too small.'))
    ],
    hilfe: ['verstehen-anteilstest'], belege: ['Hilfe:verstehen-anteilstest']
  },
  {
    id: 'rc-kennlinie', thema: 'rechner', probieren: 'kennlinie',
    stamm: P('In der Kachel "Aufgabe und Kennlinie": Was bedeuten die Schwierigkeit b und die Trennschärfe a einer Aufgabe?', 'In the tile "Task and characteristic curve": what do the difficulty b and the discrimination a of a task mean?'),
    antworten: [
      a(P('b ist die Fähigkeit bei 50 % Lösungswahrscheinlichkeit, a die Steilheit dort', 'b is the ability at 50% solving probability, a the steepness there'),
        P('Im Rasch-Modell haben alle Aufgaben dieselbe Steilheit. Im 2PL-Modell darf jede Aufgabe eine eigene Steilheit haben, die Kurven können sich kreuzen.', 'In the Rasch model all tasks have the same steepness. In the 2PL model each task may have its own steepness, so the curves can cross.'), true),
      a(P('b ist der Anteil der Personen, die die Aufgabe lösen; a ist die Zahl der Antworten', 'b is the share of people who solve the task; a is the number of answers'),
        P('b liegt auf der Fähigkeitsskala, nicht bei einem Anteil. a beschreibt die Steilheit, nicht die Zahl der Antworten.',
          'b lies on the ability scale, not on a share. a describes the steepness, not the number of answers.')),
      a(P('b ist die Steilheit der Kurve; a ist die Fähigkeit bei 50 % Lösungswahrscheinlichkeit', 'b is the steepness of the curve; a is the ability at 50% solving probability'),
        P('Die Rollen sind vertauscht: a ist die Trennschärfe (Steilheit), b die Schwierigkeit (Lage).',
          'The roles are swapped: a is the discrimination (steepness), b the difficulty (location).'))
    ],
    hilfe: ['verstehen-kennlinie'], belege: ['Hilfe:verstehen-kennlinie']
  },
  {
    id: 'rc-zuteilung', thema: 'rechner', probieren: 'zuteilung',
    stamm: P('Die Kachel "Zufall zuteilen" zeigt den Startwert der Liste. Was folgt daraus für den Einsatz in einer echten Studie?', 'The tile "Allocate by chance" shows the start value of the list. What follows for use in a real study?'),
    antworten: [
      a(P('Sie ist ein Lehrmittel: Startwert und Verfahren erlauben, die Liste vorab zu berechnen', 'It is a teaching aid: start value and method allow the list to be computed beforehand'),
        P('Eine echte Studie braucht ein dafür zugelassenes System, eine unabhängige Person und das Protokoll der Einrichtung. Darum beginnt jede exportierte Datei mit einer entsprechenden Zeile.', 'A real study needs an approved system, an independent person and the protocol of the institution. That is why every exported file begins with a corresponding line.'), true),
      a(P('Sie taugt, denn der sichtbare Startwert macht die Zuteilung für alle Beteiligten nachprüfbar und fair', 'It is suitable, because the visible start value makes the allocation verifiable and fair for everyone involved'),
        P('Sichtbar heißt auch vorhersehbar. Nachprüfbarkeit ersetzt die verdeckte Zuteilung nicht.',
          'Visible also means predictable. Verifiability does not replace concealed allocation.')),
      a(P('Sie taugt, wenn der Startwert aus der Uhr kommt, weil ihn dann niemand im Voraus kennen kann', 'It is suitable if the start value comes from the clock, because then nobody can know it in advance'),
        P('Der Startwert kommt nie aus der Uhr; er ist voreingestellt und sichtbar. Nur der verdeckte Modus nutzt den Zufall des Browsers.',
          'The start value never comes from the clock; it is preset and visible. Only the concealed mode uses the randomness of the browser.'))
    ],
    hilfe: ['verstehen-zuteilung'], belege: ['Hilfe:verstehen-zuteilung']
  },
  {
    id: 'rc-block', thema: 'rechner', probieren: 'zuteilung',
    stamm: P('Bei der Blockrandomisierung in "Zufall zuteilen" werden mehrere Blockgrößen gemischt. Warum?', 'In the block randomisation in "Allocate by chance" several block sizes are mixed. Why?'),
    antworten: [
      a(P('Wer die Blockgröße kennt, kann den letzten Fall jedes Blocks erraten', 'Whoever knows the block size can guess the last case of each block'),
        P('Nach jedem vollständigen Block sind die Gruppen genau ausgeglichen. Der letzte Block kann unvollständig bleiben; dann sind die Gruppen am Ende nicht genau gleich groß.',
          'After each complete block the groups are exactly balanced. The last block may remain incomplete; then the groups are not exactly equal at the end.'), true),
      a(P('Damit die Gruppen am Ende der Liste genau gleich groß sind, auch bei einem letzten Block', 'So that the groups are exactly equal in size at the end of the list, even with a last block'),
        P('Das erreicht man nicht durch das Mischen der Größen. Ein unvollständiger letzter Block lässt Unterschiede.',
          'That is not achieved by mixing the sizes. An incomplete last block leaves differences.')),
      a(P('Damit mehr Personen in die größere Gruppe kommen, wenn das Verhältnis es verlangt', 'So that more people end up in the larger group when the ratio demands it'),
        P('Das Verhältnis der Gruppen steht fest, zum Beispiel 1:1. Gemischt werden nur die Blockgrößen.',
          'The ratio of the groups is fixed, for example 1:1. Only the block sizes are mixed.'))
    ],
    hilfe: ['verstehen-zuteilung'], belege: ['Hilfe:verstehen-zuteilung']
  },
  {
    id: 'rc-labor-stichprobe', thema: 'rechner', probieren: 'lernlabor',
    stamm: P('Im Lernlabor, Karteireiter "Stichproben", wächst der Stichprobenumfang n. Wie ändert sich die Verteilung der Mittelwerte?', 'In the learning lab, tab "Samples", the sample size n grows. How does the distribution of the means change?'),
    antworten: [
      a(P('Sie wird schmaler und glockenförmiger; der Standardfehler liegt nahe bei σ/√n', 'It becomes narrower and more bell-shaped; the standard error is close to σ/√n'),
        P('Das gilt für Mittelwerte, auch bei stark schiefen Grundgesamtheiten. Das Bild legt die Kurve der Theorie über die Simulation.',
          'This holds for means, even for strongly skewed populations. The plot lays the curve of the theory over the simulation.'), true),
      a(P('Sie wird breiter, weil mehr Werte in jede Stichprobe kommen und mehr Streuung bringen', 'It becomes wider, because more values enter each sample and bring more spread'),
        P('Mehr Werte mitteln die Streuung heraus. Der Standardfehler nimmt mit der Wurzel aus n ab.',
          'More values average the spread out. The standard error decreases with the square root of n.')),
      a(P('Sie übernimmt die Form der Grundgesamtheit, etwa deren Schiefe, zunehmend genauer', 'It takes over the shape of the population, for example its skewness, ever more exactly'),
        P('Mit wachsendem n nähert sich die Verteilung der Mittelwerte der Glockenform, auch wenn die Grundgesamtheit schief oder zweigipflig ist.',
          'As n grows, the distribution of the means approaches the bell shape, even if the population is skewed or bimodal.'))
    ],
    hilfe: ['lernlabor'], belege: ['Hilfe:lernlabor']
  },
  {
    id: 'rc-labor-mehrfach', thema: 'rechner', mehrfach: true, probieren: 'lernlabor',
    stamm: P('Welche Aussagen zum Lernlabor (Bootstrap, Randomisierung, Startwert) stimmen? Mehrere können stimmen.', 'Which statements about the learning lab (bootstrap, randomisation, start value) are correct? Several may be correct.'),
    antworten: [
      a(P('Der Bootstrap zieht mit Zurücklegen, im Umfang der eingetippten Reihe, und notiert jedes Mal den Mittelwert', 'The bootstrap draws with replacement, with the size of the typed series, and notes the mean each time'),
        P('Das Perzentil-Intervall steht neben dem t-Intervall. Bei weniger als 10 Werten fällt es oft zu eng aus.',
          'The percentile interval is shown next to the t interval. With fewer than 10 values it is often too narrow.'), true),
      a(P('Bei der Randomisierung wird nach jedem Mischen der Unterschied der Mittelwerte notiert', 'In the randomisation the difference of the means is noted after each shuffle'),
        P('Der p-Wert ist (Zahl der mindestens so großen Unterschiede + 1)/(Mischungen + 1), damit er nicht genau 0 wird. Zum Vergleich steht der Welch-t-Test daneben.',
          'The p value is (number of differences at least as large + 1)/(shuffles + 1), so that it does not become exactly 0. The Welch t test is shown for comparison.'), true),
      a(P('Der Zufall des Lernlabors stimmt mit dem von R und SPSS überein', 'The randomness of the learning lab matches that of R and SPSS'),
        P('Die Zufallszahlen stimmen nicht mit R oder SPSS überein: gleiche Verteilung, andere Zahlen. Gleicher Startwert gibt dieselben Zahlen im Lernlabor.',
          'The random numbers do not match R or SPSS: same distribution, other numbers. The same start value gives the same numbers in the learning lab.')),
      a(P('Der Bootstrap im Lernlabor rechnet wahlweise Mittelwert, Median oder Standardabweichung', 'The bootstrap in the learning lab calculates mean, median or standard deviation as chosen'),
        P('Der Bootstrap rechnet nur den Mittelwert, die Randomisierung nur die Mittelwertdifferenz.',
          'The bootstrap calculates only the mean, the randomisation only the difference of means.'))
    ],
    hilfe: ['lernlabor'], belege: ['Hilfe:lernlabor']
  },
  {
    id: 'rc-fallzahl-f2', thema: 'rechner', karte: 'vorhersage',
    stamm: P('Beim "Zuwachs an R²" in "Studie planen" gelten Cohens Richtwerte für klein, mittel und groß. Wofür gelten sie?', 'For the "increase in R²" in "Plan a study" Cohen\'s benchmarks for small, medium and large apply. What do they apply to?'),
    antworten: [
      a(P('Für f², nicht für den Zuwachs; f² ist der Zuwachs durch eins minus R² des vollen Modells', 'For f², not for the increase; f² is the increase over one minus R² of the full model'),
        P('Die Seite macht aus dem Zuwachs ΔR² der hierarchischen Regression das f². Ein Zuwachs von ,10 sieht kleiner aus, als er als f² ist.', 'The page turns the increase ΔR² of the hierarchical regression into f². An increase of .10 looks smaller than it is as f².'), true),
      a(P('Für den Zuwachs an R² selbst, so wie er in der Ausgabe der hierarchischen Regression steht', 'For the increase in R² itself, as it appears in the output of the hierarchical regression'),
        P('Die Richtwerte gehören zu f². Den Zuwachs an R² muss man erst in f² umrechnen.',
          'The benchmarks belong to f². The increase in R² must first be converted to f².')),
      a(P('Für das partielle η² aus SPSS, das sich ohne Umrechnung in die Planung übernehmen lässt', 'For the partial η² from SPSS, which can be taken into the planning without conversion'),
        P('Das partielle η² aus SPSS hängt vom Design der Vorstudie ab und überschätzt den Effekt bei kleinen Stichproben. Das Hilfsfenster "f ausrechnen" rechnet es auf das f um.',
          'The partial η² from SPSS depends on the design of the pilot study and overestimates the effect in small samples. The helper window "Calculate f" converts it to f.'))
    ],
    hilfe: ['fallzahl-ergaenzen'], belege: ['Hilfe:fallzahl-ergaenzen', 'Fachblatt:SPAETER-F2-ERGAENZUNGEN']
  },
  {
    id: 'rc-ergebnissatz', thema: 'rechner',
    stamm: P('Der Ergebnissatz nennt einen Effekt "mittel". Wie ist das Wort zu verstehen?', 'The result sentence calls an effect "medium". How is the word to be understood?'),
    antworten: [
      a(P('Es folgt einer Faustregel, einer groben Verabredung; im eigenen Fach kann anderes gelten', 'It follows a rule of thumb, a rough convention; other fields may differ'),
        P('Der Ergebnissatz ersetzt nicht die Interpretation im Text der Arbeit, sondern liefert die Zahlen dafür.', 'The result sentence does not replace the interpretation in the text of the paper, but supplies the numbers for it.'), true),
      a(P('Es ist ein fester Grenzwert, den Statable aus den vorliegenden Daten selbst ableitet', 'It is a fixed limit that Statable derives from the data at hand itself'),
        P('Die Wörter "klein", "mittel" und "groß" folgen Verabredungen, nicht einer Ableitung aus den Daten.',
          'The words "small", "medium" and "large" follow conventions, not a derivation from the data.')),
      a(P('Es belegt, dass der Effekt praktisch bedeutsam ist und in der Arbeit so benannt werden darf', 'It proves that the effect is practically important and may be named so in the paper'),
        P('Die Einordnung beschreibt nur die Größe. Ob ein Effekt praktisch zählt, entscheidet das Fach.',
          'The classification describes only the size. Whether an effect matters in practice is decided by the field.'))
    ],
    hilfe: ['ergebnissatz'], belege: ['Hilfe:ergebnissatz']
  },
  {
    id: 'rc-diagramm', thema: 'rechner',
    stamm: P('Warum bietet Statable kein Kreisdiagramm an?', 'Why does Statable offer no pie chart?'),
    antworten: [
      a(P('Balken lassen sich genauer vergleichen, weil das Auge Längen besser schätzt als Winkel', 'Bars can be compared more exactly, since the eye judges lengths better than angles'),
        P('Für Kategorien bietet Statable Balken (liegend) oder Säulen (stehend), in Anzahl oder Prozent.', 'For categories Statable offers bars (horizontal) or columns (vertical), in counts or percent.'), true),
      a(P('Kreisdiagramme sind nur für zwei Kategorien erlaubt, und Statable zeigt mehr Kategorien', 'Pie charts are allowed only for two categories, and Statable shows more categories'),
        P('Eine solche Regel gibt es nicht. Der Grund ist die Lesbarkeit.',
          'There is no such rule. The reason is readability.')),
      a(P('Prozente lassen sich in einem Kreis nicht darstellen, weil die Summe selten genau 100 ergibt', 'Percentages cannot be shown in a circle, because the sum rarely gives exactly 100'),
        P('Darstellbar wären sie. Statable bevorzugt Balken, weil sie sich genauer vergleichen lassen.',
          'They could be shown. Statable prefers bars because they can be compared more exactly.'))
    ],
    hilfe: ['diagramm-anpassen'], belege: ['Hilfe:diagramm-anpassen']
  },
  {
    id: 'rc-tabelle', thema: 'rechner', mehrfach: true,
    stamm: P('Welche Aussagen zur "Tabelle für die Veröffentlichung" stimmen? Mehrere können stimmen.', 'Which statements about the "Table for publication" are correct? Several may be correct.'),
    antworten: [
      a(P('Ein "x" in der Tabelle steht für eine gesperrte Zelle (zu wenige Fälle oder Geheimhaltung)', 'An "x" in the table stands for a suppressed cell (too few cases or confidentiality)'),
        P('Beim Sperren werden Zellen unter der Mindestfallzahl gesperrt, dazu so viele weitere, dass sich keine gesperrte Zahl aus den Summen zurückrechnen lässt.',
          'In suppression cells below the minimum case number are suppressed, plus as many others that no suppressed number can be recomputed from the totals.'), true),
      a(P('Ein Wert in Klammern "( )" steht für geringe Zuverlässigkeit', 'A value in brackets "( )" stands for low reliability'),
        P('Gemeint sind wenige Fälle oder ein großer Variationskoeffizient. Die Grenzen legt die Organisation fest; die Voreinstellungen sind Beispiele.',
          'This means few cases or a large coefficient of variation. The limits are set by the organisation; the default values are examples.'), true),
      a(P('Ein Strich "-" steht für eine gesperrte Zelle', 'A dash "-" stands for a suppressed cell'),
        P('Der Strich bedeutet: nichts vorhanden. Der Punkt bedeutet: nicht verfügbar. Gesperrt ist ein "x".',
          'The dash means: nothing present. The full stop means: not available. A suppressed cell is an "x".')),
      a(P('Das Prüfprotokoll mit den Gründen der Sperrung kommt in den Export', 'The audit log with the reasons for suppression goes into the export'),
        P('Das Prüfprotokoll dient nur der Prüfung und kommt nicht in den Export.',
          'The audit log serves only for checking and does not go into the export.'))
    ],
    hilfe: ['tabelle-veroeffentlichung'], belege: ['Hilfe:tabelle-veroeffentlichung', 'Fachblatt:BEHOERDEN']
  },
  {
    id: 'rc-balken-ueber', thema: 'rechner', karte: 'gruppen',
    stamm: P('Bei "Mittelwert nach Gruppe" überlappen sich die 95-%-Intervalle zweier Gruppen. Was folgt für den Unterschied?', 'In "Mean by group" the 95% intervals of two groups overlap. What follows for the difference?'),
    antworten: [
      a(P('Ein Unterschied bleibt möglich; das Bild ersetzt keinen Test, erst der Test entscheidet', 'A difference remains possible; the plot does not replace a test'),
        P('Zwei gleich breite 95-%-Intervalle berühren sich erst bei einem Abstand von rund vier Standardfehlern, signifikant ist der Unterschied aber schon deutlich früher.',
          'Two equally wide 95% intervals touch only at a distance of roughly four standard errors, but the difference is significant considerably earlier.'), true),
      a(P('Der Unterschied ist damit ausgeschlossen, denn sich überlappende Intervalle zeigen Gleichheit', 'The difference is thereby ruled out, since overlapping intervals show equality'),
        P('Überlappende Intervalle schließen einen Unterschied nicht aus. Beim Beispiel horsebean gegen linseed überlappen sie, und der Welch-Test ist trotzdem signifikant.',
          'Overlapping intervals do not rule out a difference. In the example horsebean against linseed they overlap, and the Welch test is significant nonetheless.')),
      a(P('Der Unterschied ist belegt, sobald sich die Intervalle überhaupt überlappen', 'The difference is shown as soon as the intervals overlap at all'),
        P('Eine Überlappung schließt einen Unterschied nicht aus, belegt ihn aber auch nicht; wie viel Überlappung noch signifikant ist, sagt nur der Test. Der Satz unter dem Bild verweist darum immer auf den Test.',
          'An overlap does not rule out a difference, but does not prove one either; how much overlap is still significant only the test tells. The sentence under the plot therefore always refers to the test.'))
    ],
    hilfe: ['balken-mittelwerte'], belege: ['Hilfe:balken-mittelwerte']
  },
  {
    id: 'rc-balken-se', thema: 'rechner', karte: 'gruppen',
    stamm: P('Beim Bild "Mittelwert nach Gruppe" fehlt der Standardfehler allein als Strich, obwohl 95-%-Intervall und Standardabweichung wählbar sind. Warum?', 'In the plot "Mean by group" the standard error alone is missing as a bar, although the 95% interval and the standard deviation can be chosen. Why?'),
    antworten: [
      a(P('Er wird als Intervall gelesen, obwohl er nur ein Intervall von etwa 68 % Überdeckung ist', 'It is read as an interval, although it is only an interval with about 68% coverage'),
        P('Das 95-%-Intervall wird für jede Gruppe mit ihrer eigenen Streuung und der t-Verteilung gerechnet. Alternativ gibt es ± 1 Standardabweichung oder keine Striche.', 'The 95% interval is calculated for each group with its own spread and the t distribution. Alternatives are ± 1 standard deviation or no bars.'), true),
      a(P('Er lässt sich bei Gruppen mit ungleicher Größe nicht sinnvoll berechnen, anders als die Standardabweichung', 'It cannot be calculated sensibly for groups of unequal size, unlike the standard deviation'),
        P('Der Standardfehler lässt sich für jede Gruppe berechnen. Der Grund liegt in der Lesart.',
          'The standard error can be calculated for each group. The reason lies in the reading.')),
      a(P('Er ist gleich der Standardabweichung durch zwei und bringt darum keine zusätzliche Information', 'It equals the standard deviation divided by two and therefore brings no additional information'),
        P('Der Standardfehler ist die Standardabweichung geteilt durch die Wurzel aus n, nicht durch zwei.',
          'The standard error is the standard deviation divided by the square root of n, not by two.'))
    ],
    hilfe: ['balken-mittelwerte'], belege: ['Hilfe:balken-mittelwerte']
  },
  {
    id: 'rc-labor-zufall', thema: 'rechner', probieren: 'lernlabor',
    stamm: P('Im Lernlabor, Reiter "Zufallsexperimente", wird eine Münze sehr oft geworfen. Was zeigt der Verlauf?', 'In the learning lab, tab "Random experiments", a coin is tossed very many times. What does the course show?'),
    antworten: [
      a(P('Die relative Häufigkeit gegen die Wahrscheinlichkeit (Gesetz der großen Zahlen)', 'The relative frequency against the probability (law of large numbers)'),
        P('Die Tabelle stellt Häufigkeiten und die exakten Wahrscheinlichkeiten nebeneinander. Es sind bis zu 100 000 Wiederholungen möglich.', 'The table sets frequencies and the exact probabilities side by side. Up to 100,000 repetitions are possible.'), true),
      a(P('Die Wahrscheinlichkeit selbst, die mit jedem Wurf von Kopf zu Zahl wechselt', 'The probability itself, which changes from heads to tails with every toss'),
        P('Die Wahrscheinlichkeit des Zufallsexperiments bleibt gleich. Sich ändern kann nur die relative Häufigkeit.', 'The probability of the random experiment stays the same. Only the relative frequency can change.')),
      a(P('Die Zahl der Würfe, die noch nötig sind, bis das Gegenteil des letzten Ergebnisses kommt', 'The number of tosses still needed until the opposite of the last result comes'),
        P('Der Verlauf sagt nichts darüber, wann welches Ergebnis fällig wäre. Jeder Wurf ist unabhängig von den vorigen.', 'The course says nothing about when which result is due. Each toss is independent of the previous ones.'))
    ],
    hilfe: ['lernlabor'], belege: ['Hilfe:lernlabor']
  },
  {
    id: 'rc-labor-vier', thema: 'rechner', probieren: 'lernlabor',
    stamm: P('Welche Angaben braucht der Lernlabor-Reiter "Vierfeldertafel und Baum", um die Vorhersagewerte (PPV, NPV) zu zeigen?', 'Which inputs does the learning-lab tab "Four-field table and tree" need to show the predictive values (PPV, NPV)?'),
    antworten: [
      a(P('Prävalenz, Sensitivität und Spezifität, oder alternativ vier Häufigkeiten', 'Prevalence, sensitivity and specificity, or alternatively four frequencies'),
        P('Daraus entstehen Tafel, Baum mit natürlichen Häufigkeiten, Umkehrbaum und der Rechenweg der Bayes-Formel. Die Bezugsgröße wird so gewählt, dass alle Zahlen ganz sind.', 'From these arise the table, the tree with natural frequencies, the reversed tree and the calculation path of Bayes formula. The reference size is chosen so that all numbers are whole.'), true),
      a(P('Sensitivität und Spezifität allein, weil die Häufigkeit der Krankheit im Test steckt', 'Sensitivity and specificity alone, because the frequency of the disease is contained in the test'),
        P('Ohne die Prävalenz lassen sich die Vorhersagewerte nicht berechnen. Dieselben Testeigenschaften geben bei anderer Häufigkeit andere Vorhersagewerte.', 'Without the prevalence the predictive values cannot be calculated. The same test properties give other predictive values at another frequency.')),
      a(P('Nur die Zahl der positiv und negativ Getesteten, ohne zu wissen, wer wirklich krank ist', 'Only the number of those tested positive and negative, without knowing who is really ill'),
        P('Dann fehlt die Zuordnung zu den wirklich Kranken, und weder Sensitivität noch Spezifität sind bestimmbar.', 'Then the assignment to the really ill is missing, and neither sensitivity nor specificity can be determined.'))
    ],
    hilfe: ['lernlabor'], belege: ['Hilfe:lernlabor']
  }
];
export const FAELLE: ThemaModul['FAELLE'] = {};
