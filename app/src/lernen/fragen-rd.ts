/**
 * Üben: Regressions-Diskontinuität (B2 Teil 2d-3, 14.11.2026; Einheit `regressions-diskontinuitaet` in lernen/lernplan-panel.ts). Kennungen `rd-<kürzel>`, Thema `rd`.
 * Alle Zahlen: US-Senatswahlen 1914-2010 (rdrobust_RDsenate, 1297 Wahlen; margin = Vorsprung der Demokraten in Prozentpunkten, vote = Stimmenanteil der Demokraten bei der nächsten
 * Wahl desselben Sitzes) aus scripts/rd-erwartet.R (lib/rd-erwartet.json; lm mit Gewichten und sandwich HC1, zweiter Weg rdrobust); Wächter lernen/fragen-rd.test.ts. Eigene Wortlaute.
 * Quellen: Cattaneo, Idrobo & Titiunik, A Practical Introduction to Regression Discontinuity Designs: Foundations (Cambridge Elements, frei zugänglich);
 * Cunningham, Causal Inference: The Mixtape, Kap. Regression Discontinuity (frei zugänglich); Cattaneo, Frandsen & Titiunik (2015), Randomization inference in the regression discontinuity design (Datensatz).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const CA = 'Cattaneo, Idrobo & Titiunik, A Practical Introduction to Regression Discontinuity Designs: Foundations (Cambridge Elements)';
const CU = 'Cunningham, Causal Inference: The Mixtape, Kap. Regression Discontinuity (mixtape.scunning.com)';
const RECHNUNG = 'Rechnung: scripts/rd-erwartet.R';
const KOPF_DE = 'US-Senatswahlen 1914 bis 2010 (1297 Wahlen): Wer mit einem Vorsprung von mehr als 0 Prozentpunkten gewinnt, gewinnt das Amt. Verglichen wird der Stimmenanteil der Demokraten bei der nächsten Wahl desselben Sitzes.';
const KOPF_EN = 'US Senate elections 1914 to 2010 (1297 elections): whoever wins with a margin of more than 0 percentage points wins the seat. The Democrats’ vote share at the next election for the same seat is compared.';

export const FRAGEN: Frage[] = [
  {
    id: 'rd-idee', thema: 'rd', karte: 'vorhersage',
    stamm: P('Was wird bei der Regressions-Diskontinuität verglichen? (Regressions-Diskontinuität)', 'What is compared in a regression discontinuity? (regression discontinuity)'),
    antworten: [
      a(P('Fälle knapp unter und knapp über einer Schwelle, ab der eine Maßnahme einsetzt', 'Cases just below and just above a threshold from which a measure starts'), P('Genau das: Nahe der Schwelle unterscheiden sich die Fälle sonst kaum, ein Sprung des Ergebnisses dort spricht für die Maßnahme.', 'Exactly that: near the threshold the cases hardly differ otherwise; a jump of the outcome there points to the measure.'), true),
      a(P('Alle Fälle mit Maßnahme gegen alle Fälle ohne Maßnahme', 'All cases with the measure against all cases without it'), P('Das wäre ein einfacher Gruppenvergleich; weit von der Schwelle entfernt unterscheiden sich die Gruppen auch in anderem.', 'That would be a simple group comparison; far from the threshold the groups also differ in other things.')),
      a(P('Dieselben Fälle vor und nach der Maßnahme', 'The same cases before and after the measure'), P('Das ist ein Vorher-Nachher-Vergleich (oder Differenz-in-Differenzen), kein Vergleich an einer Schwelle.', 'That is a before-after comparison (or difference-in-differences), not a comparison at a threshold.')),
      a(P('Die Mittelwerte aller Fälle auf beiden Seiten der Schwelle', 'The means of all cases on both sides of the threshold'), P('Gerade die weit entfernten Fälle sollen nicht stark zählen; es geht um das Ergebnis direkt an der Schwelle.', 'Precisely the far-away cases should not count strongly; what matters is the outcome right at the threshold.'))
    ],
    hilfe: ['regressions-diskontinuitaet'], belege: [CA, CU, 'Hilfe:regressions-diskontinuitaet']
  },
  {
    id: 'rd-lesen', thema: 'rd', karte: 'vorhersage',
    stamm: P(`${KOPF_DE} Mit Bandbreite 10, Gerade und dreieckigen Gewichten springt der Stimmenanteil an der Schwelle um 7,98 Prozentpunkte (Standardfehler robust 1,84, p < ,001). Wie liest man das? (Regressions-Diskontinuität)`, `${KOPF_EN} With bandwidth 10, a line and triangular weights the vote share jumps at the threshold by 7.98 percentage points (robust standard error 1.84, p < .001). How is that read? (regression discontinuity)`),
    antworten: [
      a(P('Wer knapp gewinnt, hat bei der nächsten Wahl desselben Sitzes im Mittel etwa 8 Prozentpunkte mehr Stimmenanteil als wer knapp verliert; das ist deutlich von Null verschieden', 'Whoever wins narrowly has on average about 8 percentage points more vote share at the next election for the same seat than whoever loses narrowly; this is clearly different from zero'), P('Der Sprung gilt für knappe Wahlen und ist im Vergleich zum Standardfehler groß.', 'The jump holds for close elections and is large compared with the standard error.'), true),
      a(P('Jeder Sieger bekommt bei der nächsten Wahl 7,98 Prozentpunkte mehr als zuvor', 'Every winner gets 7.98 percentage points more at the next election than before'), P('Der Sprung vergleicht knappe Sieger mit knappen Verlierern, nicht die Entwicklung der Sieger über die Zeit.', 'The jump compares narrow winners with narrow losers, not the development of winners over time.')),
      a(P('Alle Wahlen im Datensatz zeigen diesen Sprung', 'All elections in the data set show this jump'), P('Die Schätzung gilt nur für Fälle direkt an der Schwelle, nicht für klare Siege oder klare Niederlagen.', 'The estimate holds only for cases right at the threshold, not for clear wins or clear defeats.')),
      a(P('Der Sprung ist unsicher, weil p < ,001 ist', 'The jump is uncertain because p < .001'), P('Ein kleiner p-Wert heißt: Der Sprung ist deutlich von Null verschieden, nicht: er ist unsicher.', 'A small p value means: the jump is clearly different from zero, not: it is uncertain.'))
    ],
    hilfe: ['regressions-diskontinuitaet', 'cluster-robust'], belege: [CA, RECHNUNG, 'Hilfe:regressions-diskontinuitaet']
  },
  {
    id: 'rd-bandbreite', thema: 'rd', karte: 'vorhersage',
    stamm: P(`${KOPF_DE} Bandbreite 10 (451 Wahlen) ergibt einen Sprung von 7,98 (Standardfehler 1,53), Bandbreite 20 (735 Wahlen) ergibt 7,27 (Standardfehler 1,18). Was sagt das über die Wahl der Bandbreite? (Regressions-Diskontinuität)`, `${KOPF_EN} Bandwidth 10 (451 elections) gives a jump of 7.98 (standard error 1.53), bandwidth 20 (735 elections) gives 7.27 (standard error 1.18). What does that say about the choice of the bandwidth? (regression discontinuity)`),
    antworten: [
      a(P('Eine größere Bandbreite nimmt mehr Fälle auf (kleinerer Standardfehler), holt aber auch Fälle weit von der Schwelle herein, für die eine Gerade weniger passt; stehen die Schätzungen nah beieinander, hängt der Befund wenig von der Wahl ab', 'A larger bandwidth takes in more cases (smaller standard error), but also brings in cases far from the threshold for which a line fits less well; if the estimates are close, the finding depends little on the choice'), P('Das ist der Kompromiss zwischen Genauigkeit und Verzerrung; deshalb rechnet Statable mehrere Bandbreiten nebeneinander.', 'That is the trade-off between precision and bias; that is why Statable calculates several bandwidths side by side.'), true),
      a(P('Man nimmt die Bandbreite mit dem größten Sprung', 'One takes the bandwidth with the largest jump'), P('Wer sich den größten Sprung aussucht, wählt das Ergebnis nach dem Wunsch; die Bandbreite gehört vorher begründet.', 'Whoever picks the largest jump selects the result by wish; the bandwidth must be justified beforehand.')),
      a(P('Man nimmt die größte Bandbreite, weil mehr Fälle von Vorteil sind', 'One takes the largest bandwidth because more cases are an advantage'), P('Mehr Fälle senken den Standardfehler, aber weit entfernte Fälle können den Sprung verzerren.', 'More cases lower the standard error, but far-away cases can distort the jump.')),
      a(P('Verschiedene Ergebnisse bei zwei Bandbreiten zeigen einen Rechenfehler', 'Different results for two bandwidths show a calculation error'), P('Kleine Unterschiede sind normal, weil jede Bandbreite andere Fälle verwendet.', 'Small differences are normal, because each bandwidth uses different cases.'))
    ],
    hilfe: ['regressions-diskontinuitaet'], belege: [CA, RECHNUNG, 'Hilfe:regressions-diskontinuitaet']
  },
  {
    id: 'rd-ordnung', thema: 'rd', karte: 'vorhersage',
    stamm: P(`${KOPF_DE} Mit Bandbreite 20 ergibt eine Gerade einen Sprung von 7,27 (Standardfehler robust 1,38), eine Parabel 8,16 (Standardfehler robust 1,96). Was ist dazu zu sagen? (Regressions-Diskontinuität)`, `${KOPF_EN} With bandwidth 20 a line gives a jump of 7.27 (robust standard error 1.38), a parabola 8.16 (robust standard error 1.96). What is to be said about this? (regression discontinuity)`),
    antworten: [
      a(P('Die Parabel hat mehr Spielraum und ist darum weniger genau (größerer Standardfehler); beide Rechnungen zeigen einen deutlichen Sprung in dieselbe Richtung, der Befund hängt also wenig von der Form ab', 'The parabola has more freedom and is therefore less precise (larger standard error); both calculations show a clear jump in the same direction, so the finding depends little on the shape'), P('Mehr Parameter kosten Genauigkeit; stimmt die Richtung und ist der Abstand klein, ist das ein gutes Zeichen.', 'More parameters cost precision; if the direction agrees and the distance is small, that is a good sign.'), true),
      a(P('Die Parabel ist besser, weil sie den größeren Sprung findet', 'The parabola is better because it finds the larger jump'), P('Ein größerer Sprung ist kein Maß für Güte; entscheidend ist, ob der Befund von der Form abhängt.', 'A larger jump is no measure of quality; what matters is whether the finding depends on the shape.')),
      a(P('Die Gerade ist besser, weil ihr Standardfehler kleiner ist', 'The line is better because its standard error is smaller'), P('Ein kleinerer Standardfehler allein beweist nicht, dass die Form richtig ist; eine zu einfache Form kann verzerren.', 'A smaller standard error alone does not prove that the shape is right; a shape that is too simple can distort.')),
      a(P('Zwei verschiedene Zahlen heißen, dass es keinen Sprung gibt', 'Two different numbers mean that there is no jump'), P('Beide Zahlen liegen weit über ihren Standardfehlern und zeigen in dieselbe Richtung.', 'Both numbers are far above their standard errors and point in the same direction.'))
    ],
    hilfe: ['regressions-diskontinuitaet'], belege: [CA, RECHNUNG, 'Hilfe:regressions-diskontinuitaet']
  },
  {
    id: 'rd-annahme', thema: 'rd', karte: 'vorhersage',
    stamm: P('Welche Annahme muss gelten, damit der Sprung als Wirkung der Maßnahme gelesen werden darf? (Regressions-Diskontinuität)', 'Which assumption must hold for the jump to be read as the effect of the measure? (regression discontinuity)'),
    antworten: [
      a(P('Niemand konnte die Zuteilungsvariable gezielt knapp über die Schwelle schieben, und an derselben Schwelle setzt nichts anderes ein', 'Nobody could push the assignment variable just above the threshold on purpose, and nothing else starts at the same threshold'), P('Dann sind Fälle knapp links und rechts vergleichbar, und der Sprung kommt von der Maßnahme.', 'Then cases just left and right are comparable, and the jump comes from the measure.'), true),
      a(P('Die Fälle weit von der Schwelle müssen genauso aussehen wie die Fälle an der Schwelle', 'The cases far from the threshold must look the same as the cases at the threshold'), P('Gerade weit entfernte Fälle dürfen anders sein; die Annahme betrifft nur die Nähe der Schwelle.', 'Far-away cases may well be different; the assumption concerns only the neighbourhood of the threshold.')),
      a(P('Es müssen links und rechts gleich viele Fälle liegen', 'There must be equally many cases left and right'), P('Die Zahl der Fälle (hier 245 links und 206 rechts bei Bandbreite 10) beeinflusst nur die Genauigkeit.', 'The number of cases (here 245 left and 206 right at bandwidth 10) affects only precision.')),
      a(P('Der p-Wert des Sprungs muss unter ,05 liegen', 'The p value of the jump must be below .05'), P('Ein p-Wert prüft nicht die Annahme, sondern einen Null-Sprung unter der Annahme.', 'A p value does not check the assumption but a zero jump under the assumption.'))
    ],
    hilfe: ['regressions-diskontinuitaet'], belege: [CA, CU, 'Hilfe:regressions-diskontinuitaet']
  },
  {
    id: 'rd-mehrfach', thema: 'rd', mehrfach: true, karte: 'vorhersage',
    stamm: P('Welche Aussagen über die Regressions-Diskontinuität stimmen? Mehrere können stimmen. (Regressions-Diskontinuität)', 'Which statements about regression discontinuity are true? Several can be true. (regression discontinuity)'),
    antworten: [
      a(P('Der Sprung gilt nur für Fälle an und nahe der Schwelle, nicht für alle Fälle.', 'The jump holds only for cases at and near the threshold, not for all cases.'), P('Stimmt: Für Fälle weit davon sagt die Rechnung nichts.', 'True: for cases far from it the calculation says nothing.'), true),
      a(P('Fällt der Sprung bei mehreren Bandbreiten ähnlich aus, ist das ein gutes Zeichen.', 'If the jump is similar for several bandwidths, that is a good sign.'), P('Stimmt: Dann hängt der Befund wenig von der Wahl ab.', 'True: then the finding depends little on the choice.'), true),
      a(P('Mit einer Parabel statt einer Geraden findet man einen größeren Sprung.', 'With a parabola instead of a line one finds a larger jump.'), P('Stimmt nicht: Die Parabel kann auch einen kleineren Sprung ergeben; nur der Standardfehler wird meist größer.', 'Not true: the parabola can also give a smaller jump; only the standard error usually grows.')),
      a(P('Der Sprung beweist eine Wirkung, auch wenn die Zuteilungsvariable manipuliert wurde.', 'The jump proves an effect even if the assignment variable was manipulated.'), P('Stimmt nicht: Bei Manipulation sind die Fälle links und rechts nicht mehr vergleichbar.', 'Not true: with manipulation the cases left and right are no longer comparable.'))
    ],
    hilfe: ['regressions-diskontinuitaet'], belege: [CA, CU, 'Hilfe:regressions-diskontinuitaet']
  }
];
