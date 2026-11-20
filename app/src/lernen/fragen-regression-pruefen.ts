/**
 * Üben: Lernpfad „Regression prüfen“ (Einheiten einflussreiche-faelle, eindeutiger-beitrag, ueberanpassung-kreuzvalidierung, korrelationen-vergleichen
 * und der Ausbau von regression-kollinearitaet und kovarianzanalyse; Johannes 05.11.2026). Eigene Wortlaute und eigene erfundene Zahlenbeispiele, nichts aus einem Lehrbuch.
 * Kennungen `rp-<kürzel>-…` (ef, eb, ue, kv, ka, kl). Jede Dezimalzahl im Text stammt aus app/src/lib/testdaten/ueben-erwartet.json
 * (scripts/ueben-erwartet-regression-pruefen.R, jede Rechnung mit zweitem Weg); ganze Zahlen im Text sind einfache Rechenbeispiele.
 * Belege: wissen.json (nur mc: true oder Aussage) und der jeweilige Hilfe-Artikel (`Hilfe:<id>`).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { zd, ze } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const T = 'regpruefen';

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {};

export const FRAGEN: Frage[] = [
  // ======================================================== 1. Einflussreiche Fälle (ef)
  {
    id: 'rp-ef-hebel-sinn', thema: T,
    stamm: P('Was sagt der Hebelwert (Leverage) eines Falls in einer Regression aus?', 'What does the leverage of a case in a regression tell?'),
    antworten: [
      a(P('Wie weit seine Vorhersagegröße vom Durchschnitt aller Fälle entfernt liegt, also wie stark er die Gerade zu sich ziehen kann', 'How far its predictor value is from the average of all cases, so how strongly it can pull the line towards itself'), P('Der Hebelwert hängt nur von den Werten der Vorhersagegrößen ab. Ein Fall am Rand hat mehr Hebel wie ein langes Ende einer Wippe.', 'The leverage depends only on the values of the predictors. A case at the edge has more leverage, like the long end of a seesaw.'), true),
      a(P('Wie weit sein gemessener Wert von der Geraden entfernt liegt', 'How far its measured value is from the line'), P('Das ist das Residuum. Der Hebelwert ist davon unabhängig: Er kommt ohne den gemessenen Wert y aus.', 'That is the residual. The leverage is independent of it: it works without the measured value y.')),
      a(P('Wie stark der Zusammenhang aller Fälle zusammen ist', 'How strong the relationship of all cases together is'), P('Das misst die Korrelation r oder R². Der Hebelwert gehört zu einem einzelnen Fall, nicht zum ganzen Modell.', 'That is measured by the correlation r or R². The leverage belongs to a single case, not to the whole model.')),
      a(P('Wie ungewöhnlich sein Wert der Zielgröße im Vergleich zu den anderen ist', 'How unusual its value of the outcome is compared with the others'), P('Die Zielgröße y geht in den Hebelwert nicht ein. Ein Fall mit gewöhnlichem y kann trotzdem hohen Hebel haben.', 'The outcome y does not enter the leverage. A case with an ordinary y can still have high leverage.'))
    ],
    hilfe: ['hebelwert', 'rp-einfluss'], belege: ['wissen:reg-ausreisser-hebel', 'wissen:kohn-hebelwerte-cook', 'Hilfe:rp-einfluss']
  },
  {
    id: 'rp-ef-hebel-rechnen', thema: T,
    stamm: P(`Fünf Fälle haben die Werte x = 2, 4, 6, 8 und 20. Der Mittelwert ist 8, die Summe der quadrierten Abweichungen vom Mittelwert ist 200. Welchen Hebelwert hat der Fall mit x = 20 in einer einfachen Regression? Formel: h = 1 : n + (x − Mittelwert)² : Summe der quadrierten Abweichungen.`,
      `Five cases have the values x = 2, 4, 6, 8 and 20. The mean is 8, the sum of the squared deviations from the mean is 200. What is the leverage of the case with x = 20 in a simple regression? Formula: h = 1 : n + (x − mean)² : sum of squared deviations.`),
    antworten: [
      a(P(`Hebelwert ${zd('rp_ef_h')}`, `Leverage ${ze('rp_ef_h')}`), P(`Der erste Summand ist 1 : 5 = ${zd('rp_ef_h_nur_n')}, der zweite 12² : 200 = ${zd('rp_ef_h_ohne_n')}. Zusammen ${zd('rp_ef_h')}: Der Fall bestimmt seine eigene Vorhersage fast allein.`, `The first term is 1 : 5 = ${ze('rp_ef_h_nur_n')}, the second 12² : 200 = ${ze('rp_ef_h_ohne_n')}. Together ${ze('rp_ef_h')}: the case almost alone determines its own prediction.`), true),
      a(P(`Hebelwert ${zd('rp_ef_h_ohne_n')}`, `Leverage ${ze('rp_ef_h_ohne_n')}`), P('Das ist nur der zweite Summand für den Abstand. Es fehlt noch 1 : n.', 'That is only the second term for the distance. 1 : n is still missing.')),
      a(P(`Hebelwert ${zd('rp_ef_h_nur_n')}`, `Leverage ${ze('rp_ef_h_nur_n')}`), P('Das ist nur 1 : n, der Hebelwert eines Falls genau in der Mitte. Der Abstand vom Mittelwert fehlt.', 'That is only 1 : n, the leverage of a case exactly in the middle. The distance from the mean is missing.')),
      a(P(`Hebelwert ${zd('rp_ef_h_lin')}`, `Leverage ${ze('rp_ef_h_lin')}`), P(`Hier wurde der Abstand nicht quadriert: 12 : 200 = ${zd('rp_ef_gr_k')}, dazu ${zd('rp_ef_h_nur_n')}. Im Zähler steht (x − Mittelwert)².`, `Here the distance was not squared: 12 : 200 = ${ze('rp_ef_gr_k')}, plus ${ze('rp_ef_h_nur_n')}. The numerator is (x − mean)².`))
    ],
    hilfe: ['hebelwert', 'rp-einfluss'], belege: ['wissen:kohn-hebelwerte-cook', 'wissen:reg-ausreisser-hebel', 'Hilfe:rp-einfluss']
  },
  {
    id: 'rp-ef-grenze-hebel', thema: T,
    stamm: P('Eine Regression hat 50 Fälle und 3 Vorhersagegrößen. Welche Faustgrenze für den Hebelwert nutzt Statable (2 · (k + 1) : n)?', 'A regression has 50 cases and 3 predictors. Which rule of thumb for the leverage does Statable use (2 · (k + 1) : n)?'),
    antworten: [
      a(P(`Grenze ${zd('rp_ef_gr_hebel')}`, `Limit ${ze('rp_ef_gr_hebel')}`), P(`2 · (3 + 1) : 50 = 8 : 50 = ${zd('rp_ef_gr_hebel')}. Der Durchschnitt aller Hebelwerte ist (k + 1) : n, die Grenze ist das Doppelte.`, `2 · (3 + 1) : 50 = 8 : 50 = ${ze('rp_ef_gr_hebel')}. The average of all leverages is (k + 1) : n, the limit is twice that.`), true),
      a(P(`Grenze ${zd('rp_ef_gr_2k')}`, `Limit ${ze('rp_ef_gr_2k')}`), P(`Das wäre 2 · 3 : 50. Die Konstante zählt mit: Es heißt k + 1 = 4, nicht k = 3.`, `That would be 2 · 3 : 50. The constant counts: it is k + 1 = 4, not k = 3.`)),
      a(P(`Grenze ${zd('rp_ef_gr_k')}`, `Limit ${ze('rp_ef_gr_k')}`), P(`Das wäre k : n = 3 : 50. Es fehlen die Konstante und der Faktor 2.`, `That would be k : n = 3 : 50. The constant and the factor 2 are missing.`)),
      a(P(`Grenze ${zd('rp_ef_gr_4k')}`, `Limit ${ze('rp_ef_gr_4k')}`), P('Das wäre 4 · (k + 1) : n, das Vierfache des Durchschnitts. Die Grenze ist das Doppelte.', 'That would be 4 · (k + 1) : n, four times the average. The limit is twice that.'))
    ],
    hilfe: ['hebelwert', 'rp-einfluss'], belege: ['wissen:kohn-hebelwerte-cook', 'wissen:reg-ausreisser-schwellen', 'Hilfe:rp-einfluss']
  },
  {
    id: 'rp-ef-resid-hebel', thema: T,
    stamm: P(`Ein Fall liegt fast genau auf der Regressionsgeraden, sein Hebelwert beträgt ${zd('rp_ef_h')}. Was lässt sich über ihn sagen?`, `A case lies almost exactly on the regression line, its leverage is ${ze('rp_ef_h')}. What can be said about it?`),
    antworten: [
      a(P('Er kann trotzdem einflussreich sein: Er hat die Gerade zu sich gezogen und liegt deshalb so nahe an ihr', 'It can still be influential: it has pulled the line towards itself and therefore lies so close to it'), P('Bei hohem Hebel passt sich die Gerade dem Fall an, sein Residuum wird klein. Darum verrät das Residuum allein einen einflussreichen Fall nicht.', 'With high leverage the line adapts to the case, its residual becomes small. That is why the residual alone does not reveal an influential case.'), true),
      a(P('Er ist unauffällig, denn nur ein großes Residuum macht einen Fall einflussreich', 'It is inconspicuous, because only a large residual makes a case influential'), P('Der Einfluss wächst mit Residuum und Hebel zusammen. Ein kleines Residuum bei sehr hohem Hebel kann ihn trotzdem groß halten, weil die Gerade dem Fall nachgegeben hat.', 'Influence grows with residual and leverage together. A small residual at very high leverage can still keep the influence large, because the line has given way to the case.')),
      a(P('Er ist ein Messfehler, denn so hohe Hebelwerte kommen in echten Daten nicht vor', 'It is a measurement error, because such high leverages do not occur in real data'), P('Hohe Hebelwerte kommen vor, etwa bei einer Person mit extremem Wert der Vorhersagegröße. Ob es ein Fehler ist, klärt der Blick in die Rohdaten.', 'High leverages do occur, for instance for a person with an extreme value of the predictor. Whether it is an error is settled by looking at the raw data.')),
      a(P('Er ist bedeutungslos, solange sein Hebelwert unter 1 bleibt', 'It is meaningless as long as its leverage stays below 1'), P(`Der Hebelwert kann höchstens 1 werden. ${zd('rp_ef_h')} liegt weit über jeder üblichen Faustgrenze.`, `The leverage can reach 1 at most. ${ze('rp_ef_h')} is far above any usual rule of thumb.`))
    ],
    hilfe: ['einflussreiche-werte', 'rp-einfluss'], belege: ['wissen:reg-ausreisser-hebel', 'Hilfe:rp-einfluss']
  },
  {
    id: 'rp-ef-student', thema: T,
    stamm: P('Ein Regressionsmodell passt zu den Daten, die Reste sind annähernd normalverteilt. Wie viele von 200 Fällen erwartet man mit einem studentisierten Residuum über 2 im Betrag?', 'A regression model suits the data, the residuals are approximately normally distributed. How many of 200 cases does one expect to have a studentised residual above 2 in absolute value?'),
    antworten: [
      a(P('Etwa 10, das sind rund 5 Prozent', 'About 10, that is around 5 percent'), P('Bei Normalverteilung liegen etwa 95 Prozent der Werte zwischen −2 und +2. Ein paar auffällige Fälle sind also erwartbar und kein Grund zur Sorge.', 'With a normal distribution about 95 percent of the values lie between −2 and +2. A few conspicuous cases are therefore expected and no reason to worry.'), true),
      a(P('Keinen einzigen, ein passendes Modell hat keine auffälligen Fälle', 'None at all, a suitable model has no conspicuous cases'), P('Auch bei passendem Modell liegen etwa 5 Prozent der Fälle außerhalb von ±2. Gar keinen zu finden wäre eher verdächtig.', 'Even with a suitable model about 5 percent of the cases lie outside ±2. Finding none at all would rather be suspicious.')),
      a(P('Etwa 2, das ist ein Prozent', 'About 2, that is one percent'), P('Ein Prozent entspräche einer deutlich höheren Grenze als 2. Bei der Grenze 2 sind es rund 5 Prozent.', 'One percent would correspond to a clearly higher limit than 2. With the limit 2 it is around 5 percent.')),
      a(P('Etwa 20, das sind 10 Prozent', 'About 20, that is 10 percent'), P('Zehn Prozent wären viel zu viele: Ein so hoher Anteil spräche gegen das Modell, zum Beispiel wegen ungleicher Streuung oder Kurven.', 'Ten percent would be far too many: such a high share would speak against the model, for example because of unequal spread or curves.'))
    ],
    hilfe: ['studentisiertes-residuum', 'rp-einfluss'], belege: ['wissen:reg-ausreisser-schwellen', 'Hilfe:rp-einfluss']
  },
  {
    id: 'rp-ef-cook', thema: T,
    stamm: P('Eine Regression hat 50 Fälle. Welche Faustgrenze für Cooks Distanz (4 : n) markiert einen Fall, den man genauer ansehen sollte?', 'A regression has 50 cases. Which rule of thumb for Cook\'s distance (4 : n) marks a case that should be looked at more closely?'),
    antworten: [
      a(P(`Grenze ${zd('rp_ef_gr_cook')}`, `Limit ${ze('rp_ef_gr_cook')}`), P(`4 : 50 = ${zd('rp_ef_gr_cook')}. Die Grenze sinkt mit der Fallzahl: In großen Datensätzen fällt schon ein kleinerer Einfluss auf.`, `4 : 50 = ${ze('rp_ef_gr_cook')}. The limit falls with the number of cases: in large data sets a smaller influence already stands out.`), true),
      a(P(`Grenze ${zd('rp_ef_gr_cook_2')}`, `Limit ${ze('rp_ef_gr_cook_2')}`), P(`Das wäre 2 : 50. Im Zähler steht 4.`, `That would be 2 : 50. The numerator is 4.`)),
      a(P(`Grenze ${zd('rp_ef_gr_cook_8')}`, `Limit ${ze('rp_ef_gr_cook_8')}`), P(`Das wäre 8 : 50, die Grenze für den Hebelwert bei 3 Vorhersagegrößen. Für Cooks Distanz gilt 4 : n.`, `That would be 8 : 50, the limit for the leverage with 3 predictors. For Cook's distance 4 : n applies.`)),
      a(P(`Grenze ${zd('rp_ef_gr_cook_1')}`, `Limit ${ze('rp_ef_gr_cook_1')}`), P(`Das wäre 1 : 50, der Durchschnitt eines Hebelwerts bei nur einer Größe ohne Konstante. Cooks Distanz hat eine eigene Grenze: 4 : n.`, `That would be 1 : 50. Cook's distance has a limit of its own: 4 : n.`))
    ],
    hilfe: ['cooks-distanz', 'rp-einfluss'], belege: ['wissen:reg-ausreisser-schwellen', 'wissen:kohn-hebelwerte-cook', 'Hilfe:rp-einfluss']
  },
  {
    id: 'rp-ef-umgang', thema: T, mehrfach: true,
    stamm: P('Ein Fall fällt in der Prüfung der Regression auf: Seine Cooks Distanz liegt über der Faustgrenze. Welche Schritte sind sinnvoll? Mehrere können stimmen.', 'A case stands out in the check of the regression: its Cook\'s distance is above the rule of thumb. Which steps make sense? Several can be true.'),
    antworten: [
      a(P('Zuerst prüfen, ob ein Tippfehler oder ein Messfehler vorliegt', 'First check whether a typing error or a measurement error is present'), P('Ein Fehler in den Daten ist der häufigste harmlose Grund. Dann wird er verbessert, nicht der Fall gelöscht.', 'An error in the data is the most common harmless reason. Then it is corrected, the case is not deleted.'), true),
      a(P('Das Modell mit und ohne den Fall rechnen und beide Ergebnisse vergleichen', 'Calculate the model with and without the case and compare both results'), P('So sieht man, ob die Schlussfolgerung vom Fall abhängt. Beide Ergebnisse gehören in den Bericht.', 'This shows whether the conclusion depends on the case. Both results belong in the report.'), true),
      a(P('Den Fall sofort löschen, damit das Modell besser passt', 'Delete the case at once so that the model fits better'), P('Löschen allein, weil es besser passt, verfälscht das Ergebnis. Gelöscht wird nur mit sachlichem Grund, und die Löschung wird dokumentiert.', 'Deleting merely because it fits better distorts the result. Cases are deleted only with a substantive reason, and the deletion is documented.')),
      a(P('Den Fall behalten, weil Cooks Distanz nichts über Einfluss sagt', 'Keep the case because Cook\'s distance says nothing about influence'), P('Cooks Distanz misst genau den Einfluss: wie stark sich die Vorhersagen ändern würden, wenn der Fall fehlte.', 'Cook\'s distance measures exactly the influence: how strongly the predictions would change if the case were missing.'))
    ],
    hilfe: ['ausreisser', 'rp-einfluss'], belege: ['wissen:reg-ausreisser-umgang', 'Hilfe:rp-einfluss']
  },

  // ======================================================== 2. Eindeutiger Beitrag (eb)
  {
    id: 'rp-eb-bedeutung', thema: T,
    stamm: P(`Ein Modell mit zwei Vorhersagegrößen erklärt R² = ${zd('rp_eb_q3_r2')}. Für die Größe A beträgt die quadrierte Semipartialkorrelation sr² = ${zd('rp_eb_q3_a')}. Was bedeutet das?`, `A model with two predictors explains R² = ${ze('rp_eb_q3_r2')}. For the variable A the squared semipartial correlation is sr² = ${ze('rp_eb_q3_a')}. What does this mean?`),
    antworten: [
      a(P('Nur A erklärt zusätzlich 10 Prozent der Streuung, wenn B schon im Modell steht', 'Only A explains an additional 10 percent of the spread when B is already in the model'), P('sr² ist der Zuwachs an R², wenn man A zuletzt ins Modell nimmt. Ohne A läge R² um 0,10 niedriger.', 'sr² is the gain in R² when A is added to the model last. Without A, R² would be lower by 0.10.'), true),
      a(P('A erklärt für sich allein 10 Prozent der Streuung, unabhängig von B', 'A on its own explains 10 percent of the spread, independent of B'), P('Das wäre das einfache r² von A mit dem Ergebnis. Es schließt auch den Teil ein, den A mit B gemeinsam hat.', 'That would be the simple r² of A with the outcome. It also includes the part that A shares with B.')),
      a(P('A erklärt 10 Prozent von dem, was B übrig lässt', 'A explains 10 percent of what B leaves over'), P('Das wäre die quadrierte Partialkorrelation. Sie bezieht sich auf die Streuung, die B übrig lässt, sr² dagegen auf die gesamte Streuung.', 'That would be the squared partial correlation. It refers to the spread that B leaves over, sr² to the total spread.')),
      a(P('Von 100 Personen werden 10 allein durch A richtig vorhergesagt', 'Of 100 people, 10 are predicted correctly by A alone'), P('sr² ist ein Anteil an der Streuung, keine Trefferquote. Über einzelne Personen sagt es nichts.', 'sr² is a share of the spread, not a hit rate. It says nothing about single people.'))
    ],
    hilfe: ['semipartialkorrelation', 'rp-beitrag'], belege: ['wissen:reg-partielle-koeffizienten', 'wissen:reg-r2-definition', 'Hilfe:rp-beitrag']
  },
  {
    id: 'rp-eb-rechnen', thema: T,
    stamm: P(`Ein Modell mit 2 Vorhersagegrößen und 30 Fällen erklärt R² = ${zd('rp_eb_q2_r2')}. Die Größe A hat den t-Wert 3, die Freiheitsgrade sind df = 27. Wie groß ist ihr eigener Beitrag sr² = t² · (1 − R²) : df?`,
      `A model with 2 predictors and 30 cases explains R² = ${ze('rp_eb_q2_r2')}. The variable A has the t value 3, the degrees of freedom are df = 27. How large is its own contribution sr² = t² · (1 − R²) : df?`),
    antworten: [
      a(P(`sr² = ${zd('rp_eb_q2_sr2')}`, `sr² = ${ze('rp_eb_q2_sr2')}`), P(`9 · ${zd('rp_eb_q2_r2')} : 27 = 4,5 : 27 = ${zd('rp_eb_q2_sr2')}. A erklärt allein gut ein Sechstel der Streuung.`, `9 · ${ze('rp_eb_q2_r2')} : 27 = 4.5 : 27 = ${ze('rp_eb_q2_sr2')}. A alone explains a good sixth of the spread.`), true),
      a(P(`sr² = ${zd('rp_eb_q2_ohne')}`, `sr² = ${ze('rp_eb_q2_ohne')}`), P('Das wäre t² : df = 9 : 27. Der Faktor (1 − R²) fehlt, der den t-Wert in einen Anteil an der gesamten Streuung umrechnet.', 'That would be t² : df = 9 : 27. The factor (1 − R²) is missing, which converts the t value into a share of the total spread.')),
      a(P(`sr² = ${zd('rp_eb_q2_partial')}`, `sr² = ${ze('rp_eb_q2_partial')}`), P('Das ist t² : (t² + df) = 9 : 36, die quadrierte Partialkorrelation. Sie bezieht sich nur auf die Streuung, die die andere Größe übrig lässt.', 'That is t² : (t² + df) = 9 : 36, the squared partial correlation. It refers only to the spread that the other variable leaves over.')),
      a(P(`sr² = ${zd('rp_eb_q2_r2')}`, `sr² = ${ze('rp_eb_q2_r2')}`), P('Das ist das R² des ganzen Modells. Der eigene Beitrag einer einzelnen Größe ist kleiner als das gesamte R².', 'That is the R² of the whole model. The own contribution of a single variable is smaller than the total R².'))
    ],
    hilfe: ['semipartialkorrelation', 'rp-beitrag'], belege: ['wissen:reg-partielle-koeffizienten', 'wissen:reg-t-test-steigung', 'Hilfe:rp-beitrag']
  },
  {
    id: 'rp-eb-gemeinsam', thema: T,
    stamm: P(`Zwei Vorhersagegrößen erklären zusammen R² = ${zd('rp_eb_q3_r2')}. Der eigene Beitrag von A ist sr² = ${zd('rp_eb_q3_a')}, der von B sr² = ${zd('rp_eb_q3_b')}. Welcher Anteil der Streuung wird nur von A und B gemeinsam erklärt?`,
      `Two predictors together explain R² = ${ze('rp_eb_q3_r2')}. The own contribution of A is sr² = ${ze('rp_eb_q3_a')}, that of B sr² = ${ze('rp_eb_q3_b')}. What share of the spread is explained only by A and B together?`),
    antworten: [
      a(P(`Anteil ${zd('rp_eb_q3_gem')}`, `Share ${ze('rp_eb_q3_gem')}`), P(`${zd('rp_eb_q3_r2')} − ${zd('rp_eb_q3_a')} − ${zd('rp_eb_q3_b')} = ${zd('rp_eb_q3_gem')}. Das ist die Überlappung im Venn-Bild: erklärt, aber keiner Größe allein zuzurechnen.`, `${ze('rp_eb_q3_r2')} − ${ze('rp_eb_q3_a')} − ${ze('rp_eb_q3_b')} = ${ze('rp_eb_q3_gem')}. That is the overlap in the Venn picture: explained, but attributable to no variable alone.`), true),
      a(P(`Anteil ${zd('rp_eb_q3_summe')}`, `Share ${ze('rp_eb_q3_summe')}`), P(`Das ist die Summe der beiden eigenen Beiträge (${zd('rp_eb_q3_a')} + ${zd('rp_eb_q3_b')}). Gefragt ist der Teil, der danach von R² übrig bleibt.`, `That is the sum of the two own contributions (${ze('rp_eb_q3_a')} + ${ze('rp_eb_q3_b')}). What is asked is the part of R² that is left after them.`)),
      a(P(`Anteil ${zd('rp_eb_q3_ohne_a')}`, `Share ${ze('rp_eb_q3_ohne_a')}`), P(`Das ist R² minus nur den Beitrag von B. Darin steckt noch der Beitrag von A allein.`, `That is R² minus only the contribution of B. The contribution of A alone is still in it.`)),
      a(P(`Anteil ${zd('rp_eb_q3_rest')}`, `Share ${ze('rp_eb_q3_rest')}`), P('Das ist 1 − R², die Streuung, die das Modell gar nicht erklärt.', 'That is 1 − R², the spread the model does not explain at all.'))
    ],
    hilfe: ['venn-diagramm', 'rp-beitrag'], belege: ['wissen:reg-partielle-koeffizienten', 'Hilfe:rp-beitrag']
  },
  {
    id: 'rp-eb-venn', thema: T,
    stamm: P('Im Venn-Diagramm einer Regression überschneiden sich die Kreise zweier Vorhersagegrößen. Was zeigt die Überlappung?', 'In the Venn diagram of a regression the circles of two predictors overlap. What does the overlap show?'),
    antworten: [
      a(P('Streuung des Ergebnisses, die beide Größen erklären können und die keiner von beiden allein gehört', 'Spread of the outcome that both variables can explain and that belongs to neither alone'), P('Die Überlappung ist erklärt, aber nicht einer Größe zuzurechnen. Darum ergeben die eigenen Beiträge (sr²) zusammen weniger als R².', 'The overlap is explained but cannot be attributed to one variable. That is why the own contributions (sr²) add up to less than R².'), true),
      a(P('Streuung, die nur durch Zufall erklärt wird', 'Spread that is explained only by chance'), P('Zufall ist kein Teil dieses Bildes. Der Überlappungsteil ist echte gemeinsame Information der Vorhersagegrößen über das Ergebnis.', 'Chance is no part of this picture. The overlap is real shared information of the predictors about the outcome.')),
      a(P('Streuung, die das Modell nicht erklärt', 'Spread that the model does not explain'), P('Der nicht erklärte Rest liegt außerhalb aller Kreise, im Bild also im Rechteck um sie herum.', 'The unexplained remainder lies outside all circles, in the picture in the rectangle around them.')),
      a(P('Den Teil, den nur die Größe mit dem größeren sr² erklärt', 'The part that only the variable with the larger sr² explains'), P('Das wäre der Teil außerhalb der Überlappung. Die Überlappung gehört beiden Größen gemeinsam.', 'That would be the part outside the overlap. The overlap belongs to both variables together.'))
    ],
    hilfe: ['venn-diagramm', 'rp-beitrag'], belege: ['wissen:reg-partielle-koeffizienten', 'Hilfe:rp-beitrag']
  },
  {
    id: 'rp-eb-kollinear', thema: T,
    stamm: P('Zwei Vorhersagegrößen hängen sehr eng miteinander zusammen. Jede für sich hängt stark mit dem Ergebnis zusammen. Was ist von ihren eigenen Beiträgen sr² im gemeinsamen Modell zu erwarten?', 'Two predictors are very closely related to each other. Each on its own is strongly related to the outcome. What is to be expected of their own contributions sr² in the joint model?'),
    antworten: [
      a(P('Beide sr² fallen klein aus, obwohl das Modell viel erklären kann, denn das meiste Erklärte gehört beiden gemeinsam', 'Both sr² turn out small although the model can explain a lot, because most of what is explained belongs to both together'), P('Bei starker Überlappung bleibt für jede Größe allein wenig übrig. Das ist die Kollinearität: Man kann den Beitrag der einzelnen Größe kaum trennen.', 'With strong overlap little remains for each variable alone. That is collinearity: the contribution of the single variable can hardly be separated.'), true),
      a(P('Beide sr² sind groß, weil beide stark mit dem Ergebnis zusammenhängen', 'Both sr² are large because both are strongly related to the outcome'), P('Der starke Zusammenhang jeder Größe mit dem Ergebnis steckt zum großen Teil in der Überlappung. Sie zählt für keine der beiden allein.', 'The strong relationship of each variable with the outcome lies largely in the overlap. It counts for neither alone.')),
      a(P('Beide sr² gleichen ihrem einfachen r² mit dem Ergebnis', 'Both sr² equal their simple r² with the outcome'), P('Das gälte nur bei völlig unabhängigen Vorhersagegrößen. Bei eng verbundenen Größen ist sr² viel kleiner als r².', 'That would hold only for completely independent predictors. For closely related variables sr² is much smaller than r².')),
      a(P('Eine sr² ist groß, die andere genau null', 'One sr² is large, the other exactly zero'), P('Das ist möglich, aber kein Muster der Kollinearität: Meist fallen beide klein aus, und welche ein wenig größer ist, hängt vom Zufall der Stichprobe ab.', 'That is possible but no pattern of collinearity: usually both turn out small, and which one is a little larger depends on the chance of the sample.'))
    ],
    hilfe: ['kollinearitaet', 'rp-beitrag'], belege: ['wissen:reg-multikollinearitaet-folgen', 'wissen:reg-partielle-koeffizienten', 'Hilfe:rp-beitrag']
  },
  {
    id: 'rp-eb-partial', thema: T,
    stamm: P('Was unterscheidet die Semipartialkorrelation von der Partialkorrelation?', 'What distinguishes the semipartial correlation from the partial correlation?'),
    antworten: [
      a(P('Bei der Semipartialkorrelation werden die anderen Größen nur aus der Vorhersagegröße herausgerechnet, bei der Partialkorrelation auch aus dem Ergebnis', 'In the semipartial correlation the other variables are removed only from the predictor, in the partial correlation also from the outcome'), P('Darum bezieht sich sr² auf die gesamte Streuung des Ergebnisses, die quadrierte Partialkorrelation nur auf den Rest, den die anderen Größen übrig lassen. Sie fällt größer aus.', 'That is why sr² refers to the total spread of the outcome, the squared partial correlation only to the remainder that the other variables leave over. It turns out larger.'), true),
      a(P('Die Partialkorrelation gibt es nur bei zwei Vorhersagegrößen, die Semipartialkorrelation bei beliebig vielen', 'The partial correlation exists only for two predictors, the semipartial correlation for any number'), P('Beide lassen sich für beliebig viele Kontrollgrößen berechnen.', 'Both can be calculated for any number of control variables.')),
      a(P('Die Semipartialkorrelation kann Werte über 1 annehmen', 'The semipartial correlation can take values above 1'), P('Wie jede Korrelation liegt sie zwischen −1 und +1.', 'Like every correlation it lies between −1 and +1.')),
      a(P('Es gibt keinen Unterschied, es sind zwei Namen für dieselbe Zahl', 'There is no difference, they are two names for the same number'), P('Die Zahlen unterscheiden sich, weil der Nenner verschieden ist: bei der Partialkorrelation wird auch das Ergebnis bereinigt.', 'The numbers differ because the denominator is different: in the partial correlation the outcome is adjusted as well.'))
    ],
    hilfe: ['semipartialkorrelation', 'partialkorrelation'], belege: ['wissen:reg-partielle-koeffizienten', 'Hilfe:semipartialkorrelation']
  },
  {
    id: 'rp-eb-mehrfach', thema: T, mehrfach: true,
    stamm: P('Welche Aussagen über den eigenen Beitrag sr² einer Vorhersagegröße stimmen? Mehrere können stimmen.', 'Which statements about the own contribution sr² of a predictor are true? Several can be true.'),
    antworten: [
      a(P('sr² ändert sich, wenn man dem Modell eine weitere Vorhersagegröße hinzufügt, die mit der ersten zusammenhängt', 'sr² changes when a further predictor that is related to the first is added to the model'), P('Der eigene Beitrag gilt für genau dieses Modell: Er hängt davon ab, welche anderen Größen schon drin sind.', 'The own contribution holds for exactly this model: it depends on which other variables are already in.'), true),
      a(P('Zwei Größen können beide ein kleines sr² haben und zusammen doch viel erklären', 'Two variables can both have a small sr² and still explain a lot together'), P('Das ist die Überlappung im Venn-Bild: gemeinsam erklärt, keiner allein zuzurechnen.', 'That is the overlap in the Venn picture: explained together, attributable to neither alone.'), true),
      a(P('Die Größe mit dem größten sr² ist die, die den Ausgang ursächlich am stärksten bestimmt', 'The variable with the largest sr² is the one that causally determines the outcome most strongly'), P('sr² beschreibt statistische Erklärkraft in diesen Daten, keine Ursache. Eine Größe kann viel erklären, ohne etwas zu bewirken.', 'sr² describes statistical explanatory power in these data, not a cause. A variable can explain a lot without causing anything.')),
      a(P('sr² kann negativ sein, wenn die Größe dem Ergebnis entgegenwirkt', 'sr² can be negative when the variable works against the outcome'), P('sr² ist ein Anteil und damit ein Quadrat. Die Richtung steckt im Vorzeichen von B, nicht in sr².', 'sr² is a share and thus a square. The direction is in the sign of B, not in sr².'))
    ],
    hilfe: ['semipartialkorrelation', 'rp-beitrag'], belege: ['wissen:reg-partielle-koeffizienten', 'wissen:reg-suppression', 'Hilfe:rp-beitrag']
  },

  // ======================================================== 3. Überanpassung und Kreuzvalidierung (ue)
  {
    id: 'rp-ue-r2-steigt', thema: T,
    stamm: P(`Ein Modell mit zwei Vorhersagegrößen erklärt R² = ${zd('rp_ue_q1_r2')}. Man fügt eine dritte Größe hinzu, eine Spalte mit reinen Zufallszahlen. Was geschieht mit R²?`, `A model with two predictors explains R² = ${ze('rp_ue_q1_r2')}. A third variable is added, a column of pure random numbers. What happens to R²?`),
    antworten: [
      a(P('R² bleibt gleich oder steigt ein wenig; ein Sinken ist ausgeschlossen', 'R² stays the same or rises a little; a fall is ruled out'), P('Die Methode der kleinsten Quadrate nutzt jede zusätzliche Spalte, um die Reste ein wenig zu verkleinern, auch eine Zufallsspalte. Darum steigt R² mit jeder Größe.', 'The method of least squares uses every additional column to make the residuals a little smaller, even a random column. That is why R² rises with every variable.'), true),
      a(P('R² sinkt, denn Zufallszahlen verschlechtern die Vorhersage', 'R² falls, because random numbers worsen the prediction'), P('Im Modell bekommt die Zufallsspalte ein B nahe null, aber nie genau null passend zu den Daten. Die Reste können dadurch nur kleiner werden, nicht größer.', 'In the model the random column gets a B near zero, fitted to these data. The residuals can only get smaller, not larger.')),
      a(P('R² bleibt auf die Stelle genau gleich, denn Zufallszahlen erklären nichts', 'R² stays exactly the same, because random numbers explain nothing'), P('In einer Stichprobe hängt auch eine Zufallsspalte ein wenig mit dem Ergebnis zusammen. Darum steigt R² meist ein wenig an.', 'In a sample even a random column is a little related to the outcome. That is why R² usually rises a little.')),
      a(P('R² steigt deutlich, weil das Modell mit drei Größen vollständiger ist', 'R² rises clearly, because the model with three variables is more complete'), P('Bei einer Zufallsspalte ist der Zuwachs winzig. Deutlich steigt R² nur, wenn die Größe wirklich etwas erklärt.', 'With a random column the gain is tiny. R² rises clearly only if the variable really explains something.'))
    ],
    hilfe: ['korrigiertes-r2', 'rp-ueberanpassung'], belege: ['wissen:reg-r2-adjustiert', 'Hilfe:rp-ueberanpassung']
  },
  {
    id: 'rp-ue-korrigiert', thema: T,
    stamm: P('Wozu dient das korrigierte R² (R²adj)?', 'What is the adjusted R² (R²adj) for?'),
    antworten: [
      a(P('Es zieht den Gewinn ab, den schon Zufallszahlen als zusätzliche Größen bringen würden, und kann deshalb sinken', 'It subtracts the gain that even random numbers would bring as additional variables, and can therefore fall'), P('Je mehr Größen bei gleich vielen Fällen im Modell stehen, desto stärker wird abgezogen. Eine nützliche Größe hebt das korrigierte R², eine nutzlose senkt es.', 'The more variables are in the model for the same number of cases, the more is subtracted. A useful variable raises the adjusted R², a useless one lowers it.'), true),
      a(P('Es rechnet R² in einen Prozentwert um', 'It converts R² into a percentage'), P('Prozent ist nur eine andere Schreibweise des Anteils. Das korrigierte R² ist ein anderer Wert, nicht dieselbe Zahl in anderer Schreibweise.', 'Percent is only another way of writing the share. The adjusted R² is another value, not the same number written differently.')),
      a(P('Es zeigt, ob das Modell signifikant ist', 'It shows whether the model is significant'), P('Das zeigt der F-Test des Modells. Das korrigierte R² beschreibt die Erklärkraft, ohne Signifikanzaussage.', 'That is shown by the F test of the model. The adjusted R² describes the explanatory power without a statement on significance.')),
      a(P('Es berichtigt Messfehler in den Daten', 'It corrects measurement errors in the data'), P('Messfehler lassen sich nicht herausrechnen. Die Korrektur betrifft nur die Zahl der Größen im Verhältnis zur Zahl der Fälle.', 'Measurement errors cannot be calculated away. The correction concerns only the number of variables in relation to the number of cases.'))
    ],
    hilfe: ['korrigiertes-r2', 'rp-ueberanpassung'], belege: ['wissen:reg-r2-adjustiert', 'Hilfe:rp-ueberanpassung']
  },
  {
    id: 'rp-ue-rechnen', thema: T,
    stamm: P(`Ein Modell mit 4 Vorhersagegrößen und 20 Fällen erklärt R² = ${zd('rp_ue_q3_r2')}. Wie groß ist das korrigierte R²? Formel: 1 − (1 − R²) · (n − 1) : (n − k − 1).`, `A model with 4 predictors and 20 cases explains R² = ${ze('rp_ue_q3_r2')}. How large is the adjusted R²? Formula: 1 − (1 − R²) · (n − 1) : (n − k − 1).`),
    antworten: [
      a(P(`R²adj = ${zd('rp_ue_q3_adj')}`, `R²adj = ${ze('rp_ue_q3_adj')}`), P(`1 − 0,50 · 19 : 15 = 1 − 0,63 = ${zd('rp_ue_q3_adj')}. Vom R² von 0,50 bleibt nach dem Abzug etwas mehr als ein Drittel.`, `1 − 0.50 · 19 : 15 = 1 − 0.63 = ${ze('rp_ue_q3_adj')}. Of the R² of 0.50 a little more than a third remains after the deduction.`), true),
      a(P(`R²adj = ${zd('rp_ue_q3_nk')}`, `R²adj = ${ze('rp_ue_q3_nk')}`), P('Hier steht im Nenner n − k = 16 statt n − k − 1 = 15. Die Konstante wird ebenfalls aus den Daten geschätzt.', 'Here the denominator is n − k = 16 instead of n − k − 1 = 15. The constant is also estimated from the data.')),
      a(P(`R²adj = ${zd('rp_ue_q3_n')}`, `R²adj = ${ze('rp_ue_q3_n')}`), P('Hier steht im Zähler n = 20 statt n − 1 = 19. Es sind n − 1 Freiheitsgrade der Gesamtstreuung.', 'Here the numerator is n = 20 instead of n − 1 = 19. The total spread has n − 1 degrees of freedom.')),
      a(P(`R²adj = ${zd('rp_ue_q3_r2')}`, `R²adj = ${ze('rp_ue_q3_r2')}`), P('Das ist das einfache R². Der Abzug für die vier Größen fehlt.', 'That is the plain R². The deduction for the four variables is missing.'))
    ],
    hilfe: ['korrigiertes-r2', 'rp-ueberanpassung'], belege: ['wissen:reg-r2-adjustiert', 'Hilfe:rp-ueberanpassung']
  },
  {
    id: 'rp-ue-faelle', thema: T,
    stamm: P('Eine Studie hat 40 Fälle und prüft 8 Vorhersagegrößen in einer Regression. Was lässt sich dazu sagen?', 'A study has 40 cases and tests 8 predictors in a regression. What can be said about this?'),
    antworten: [
      a(P('Das sind nur 5 Fälle je Größe; das Modell passt sich vermutlich stark dem Zufall an, üblich sind etwa 10 bis 15 Fälle je Größe', 'That is only 5 cases per variable; the model probably adapts strongly to chance, usual is about 10 to 15 cases per variable'), P('Mit wenigen Fällen je Größe findet das Modell Muster, die nur in dieser Stichprobe vorkommen. Das ist Überanpassung (Overfitting).', 'With few cases per variable the model finds patterns that exist only in this sample. That is overfitting.'), true),
      a(P('Das genügt, denn 40 ist größer als 30', 'That is enough, because 40 is larger than 30'), P('Die Zahl 30 ist eine Faustregel für einfache Mittelwerte und keine Grenze für Regressionen. Entscheidend sind die Fälle je Vorhersagegröße.', 'The number 30 is a rule of thumb for simple means and no limit for regressions. What matters is the cases per predictor.')),
      a(P('Das genügt, solange R² hoch ist', 'That is enough as long as R² is high'), P('Gerade bei vielen Größen und wenigen Fällen ist R² hoch, ohne dass das Modell trägt. Ein hohes R² beweist hier nichts.', 'Precisely with many variables and few cases R² is high without the model holding. A high R² proves nothing here.')),
      a(P('Das ist zu wenig, weil jede Regression mindestens 100 Fälle braucht', 'That is too few, because every regression needs at least 100 cases'), P('Eine feste Zahl von 100 gibt es nicht. Es kommt auf die Zahl der Größen an: Mit 2 Größen können 40 Fälle gut reichen.', 'There is no fixed number of 100. It depends on the number of variables: with 2 variables 40 cases may be quite enough.'))
    ],
    hilfe: ['overfitting', 'rp-ueberanpassung'], belege: ['wissen:reg-fallzahl-faustregeln', 'Hilfe:rp-ueberanpassung']
  },
  {
    id: 'rp-ue-schrittweise', thema: T,
    stamm: P('Warum täuscht eine automatische schrittweise Auswahl von Vorhersagegrößen?', 'Why does an automatic stepwise selection of predictors mislead?'),
    antworten: [
      a(P('Sie sucht unter vielen Größen die, die in diesen Daten zufällig am besten passen; R² und p-Werte des gewählten Modells fallen deshalb zu günstig aus', 'It looks among many variables for those that happen to fit best in these data; R² and p values of the chosen model therefore turn out too favourable'), P('Wer viele Größen ausprobiert und die besten behält, nutzt den Zufall dieser Stichprobe. Bei neuen Daten sinkt die Erklärkraft, und die p-Werte gelten nicht mehr so, wie sie gedruckt sind.', 'Whoever tries many variables and keeps the best uses the chance of this sample. With new data the explanatory power falls, and the p values no longer hold as printed.'), true),
      a(P('Sie wählt Größen nach ihrer Korrelation mit den anderen Vorhersagegrößen statt mit dem Ergebnis', 'It chooses variables by their correlation with the other predictors instead of with the outcome'), P('Die Auswahl richtet sich nach dem Beitrag zum Ergebnis, nicht nach der Verwandtschaft der Vorhersagegrößen. Das Problem ist ein anderes: das vielfache Probieren.', 'The selection follows the contribution to the outcome, not the kinship of the predictors. The problem is another one: trying many times.')),
      a(P('Sie rechnet nur mit der Hälfte der Fälle', 'It calculates with only half of the cases'), P('Es werden alle Fälle benutzt. Gerade das ist ein Teil des Problems: Auswahl und Prüfung geschehen an denselben Daten.', 'All cases are used. That is exactly part of the problem: selection and checking happen on the same data.')),
      a(P('Sie lässt Größen mit mehr als zwei Stufen weg', 'It leaves out variables with more than two levels'), P('Die Art der Größe spielt keine Rolle für das Problem. Es entsteht aus der Auswahl unter vielen Möglichkeiten.', 'The kind of variable plays no role for the problem. It arises from the choice among many possibilities.'))
    ],
    hilfe: ['schrittweise-regression', 'rp-ueberanpassung'], belege: ['wissen:reg-schrittweise', 'wissen:hayes-teilskalen-ueberanpassung', 'Hilfe:rp-ueberanpassung']
  },
  {
    id: 'rp-ue-kreuz', thema: T,
    stamm: P('Was geschieht bei einer Kreuzvalidierung?', 'What happens in a cross-validation?'),
    antworten: [
      a(P('Das Modell wird an einem Teil der Daten angepasst und an einem anderen Teil geprüft; so zeigt sich, wie gut es neue Fälle vorhersagt', 'The model is fitted on one part of the data and checked on another part; this shows how well it predicts new cases'), P('Beim mehrfachen Wechsel der Teile wird jeder Fall einmal zum Prüfen benutzt. Der mittlere Fehler dort schätzt die Güte bei neuen Daten ehrlicher als R².', 'When the parts are swapped several times, every case is used once for checking. The mean error there estimates the quality for new data more honestly than R².'), true),
      a(P('Jede Größe wird mit jeder anderen korreliert, um Überschneidungen zu finden', 'Every variable is correlated with every other to find overlaps'), P('Das wäre eine Korrelationsmatrix. Sie prüft Kollinearität, nicht die Güte für neue Fälle.', 'That would be a correlation matrix. It checks collinearity, not the quality for new cases.')),
      a(P('Zwei Forschungsgruppen rechnen dieselben Daten unabhängig und vergleichen ihre Ergebnisse', 'Two research groups analyse the same data independently and compare their results'), P('Das ist eine Replikation der Auswertung. Kreuzvalidierung teilt dagegen die Fälle der einen Stichprobe in Teile.', 'That is a replication of the analysis. Cross-validation, by contrast, splits the cases of one sample into parts.')),
      a(P('Alle Fälle werden zweimal eingegeben, um Tippfehler zu finden', 'All cases are entered twice to find typing errors'), P('Doppelte Eingabe ist eine Datenkontrolle. Bei der Kreuzvalidierung bleiben die Daten gleich, nur die Rolle der Fälle wechselt.', 'Double entry is a data check. In cross-validation the data stay the same, only the role of the cases changes.'))
    ],
    hilfe: ['kreuzvalidierung', 'rp-ueberanpassung'], belege: ['wissen:hayes-teilskalen-ueberanpassung', 'Hilfe:kreuzvalidierung']
  },
  {
    id: 'rp-ue-mehrfach', thema: T, mehrfach: true,
    stamm: P('Welche Aussagen über R² und korrigiertes R² stimmen? Mehrere können stimmen.', 'Which statements about R² and adjusted R² are true? Several can be true.'),
    antworten: [
      a(P('Das korrigierte R² kann kleiner sein als R²', 'The adjusted R² can be smaller than R²'), P('Es zieht einen Teil von R² ab. Der Abzug ist umso größer, je mehr Größen bei wenigen Fällen im Modell stehen.', 'It subtracts a part of R². The deduction is the larger, the more variables are in the model for few cases.'), true),
      a(P('Fügt man eine Größe hinzu, die fast nichts erklärt, sinkt das korrigierte R² meist', 'If a variable that explains almost nothing is added, the adjusted R² usually falls'), P('Der kleine Gewinn an R² wiegt den Abzug für den verbrauchten Freiheitsgrad nicht auf.', 'The small gain in R² does not make up for the deduction for the degree of freedom used up.'), true),
      a(P('Ein höheres R² heißt, dass das Modell neue Fälle besser vorhersagt', 'A higher R² means that the model predicts new cases better'), P('R² gilt nur für die Daten, an denen das Modell angepasst wurde. Wie gut neue Fälle vorhergesagt werden, zeigt erst die Prüfung an neuen Daten.', 'R² holds only for the data on which the model was fitted. How well new cases are predicted is shown only by checking with new data.')),
      a(P('Das korrigierte R² liegt zwischen 0 und 1; es kann nicht negativ werden', 'The adjusted R² lies between 0 and 1; it cannot become negative'), P('Bei sehr schwachen Modellen mit vielen Größen kann es unter null fallen. Das zeigt dann: Das Modell erklärt nichts, was über Zufall hinausgeht.', 'For very weak models with many variables it can fall below zero. That then shows: the model explains nothing beyond chance.'))
    ],
    hilfe: ['korrigiertes-r2', 'rp-ueberanpassung'], belege: ['wissen:reg-r2-adjustiert', 'Hilfe:rp-ueberanpassung']
  },

  // ======================================================== 4. Korrelationen vergleichen (kv)
  {
    id: 'rp-kv-warum-z', thema: T,
    stamm: P('Zwei Korrelationen aus verschiedenen Gruppen sollen verglichen werden. Warum werden sie vorher in Fisher-z umgerechnet?', 'Two correlations from different groups are to be compared. Why are they converted into Fisher z beforehand?'),
    antworten: [
      a(P('Die Verteilung von r ist schief; die von Fisher-z ist annähernd normal, mit einem Standardfehler, der nur von n abhängt', 'The distribution of r is skewed; that of Fisher z is approximately normal, with a standard error that depends only on n'), P('Erst dadurch lässt sich der Unterschied durch einen Standardfehler teilen und mit der Normalverteilung beurteilen.', 'Only then can the difference be divided by a standard error and judged with the normal distribution.'), true),
      a(P('Fisher-z macht aus r einen Prozentwert, der sich leichter vergleichen lässt', 'Fisher z turns r into a percentage that is easier to compare'), P('Fisher-z ist kein Prozentwert, sondern eine gestreckte Skala von r. Sie wird nur für die Rechnung gebraucht.', 'Fisher z is no percentage but a stretched scale of r. It is needed only for the calculation.')),
      a(P('Fisher-z gleicht verschieden große Gruppen aus, sodass n keine Rolle mehr spielt', 'Fisher z balances groups of different size, so that n no longer matters'), P('Die Gruppengröße steckt im Standardfehler 1 : √(n − 3) und geht ausdrücklich in den Test ein.', 'The group size is in the standard error 1 : √(n − 3) and expressly enters the test.')),
      a(P('Fisher-z entfernt Ausreißer aus den Daten', 'Fisher z removes outliers from the data'), P('Die Umrechnung ändert keine Daten, nur die Skala der Zahl r.', 'The conversion changes no data, only the scale of the number r.'))
    ],
    hilfe: ['fisher-z', 'rp-korrelationen-vergleichen'], belege: ['wissen:fisher-z-zweck', 'Hilfe:rp-korrelationen-vergleichen']
  },
  {
    id: 'rp-kv-z-rechnen', thema: T,
    stamm: P('Wie groß ist Fisher-z für r = 0,50? Formel: z = ½ · ln((1 + r) : (1 − r)).', 'How large is Fisher z for r = 0.50? Formula: z = ½ · ln((1 + r) : (1 − r)).'),
    antworten: [
      a(P(`z = ${zd('rp_kv_z_r')}`, `z = ${ze('rp_kv_z_r')}`), P(`(1 + 0,50) : (1 − 0,50) = 3; ln 3 = ${zd('rp_kv_z_ohne_halb')}; die Hälfte davon ist ${zd('rp_kv_z_r')}. Fisher-z liegt über r.`, `(1 + 0.50) : (1 − 0.50) = 3; ln 3 = ${ze('rp_kv_z_ohne_halb')}; half of it is ${ze('rp_kv_z_r')}. Fisher z lies above r.`), true),
      a(P(`z = ${zd('rp_kv_z_r_gleich')}`, `z = ${ze('rp_kv_z_r_gleich')}`), P('Das ist r selbst. Nur bei sehr kleinem r sind r und Fisher-z fast gleich; bei 0,50 unterscheiden sie sich schon deutlich.', 'That is r itself. Only for very small r are r and Fisher z almost equal; at 0.50 they already differ clearly.')),
      a(P(`z = ${zd('rp_kv_z_ohne_halb')}`, `z = ${ze('rp_kv_z_ohne_halb')}`), P('Das ist ln 3 ohne den Faktor ½. Die Formel verlangt die Hälfte.', 'That is ln 3 without the factor ½. The formula asks for half.')),
      a(P(`z = ${zd('rp_eb_q2_partial')}`, `z = ${ze('rp_eb_q2_partial')}`), P('Das wäre r : 2. Fisher-z halbiert nicht r, sondern den Logarithmus des Verhältnisses (1 + r) : (1 − r).', 'That would be r : 2. Fisher z does not halve r but the logarithm of the ratio (1 + r) : (1 − r).'))
    ],
    hilfe: ['fisher-z', 'rp-korrelationen-vergleichen'], belege: ['wissen:fisher-z-zweck', 'Hilfe:rp-korrelationen-vergleichen']
  },
  {
    id: 'rp-kv-se', thema: T,
    stamm: P('Zwei unabhängige Gruppen haben n₁ = 20 und n₂ = 30 Personen. Wie groß ist der Standardfehler des Unterschieds ihrer Fisher-z? Formel: √(1 : (n₁ − 3) + 1 : (n₂ − 3)).', 'Two independent groups have n₁ = 20 and n₂ = 30 people. How large is the standard error of the difference of their Fisher z? Formula: √(1 : (n₁ − 3) + 1 : (n₂ − 3)).'),
    antworten: [
      a(P(`Standardfehler ${zd('rp_kv_se', 3)}`, `Standard error ${ze('rp_kv_se', 3)}`), P(`1 : 17 + 1 : 27 = 0,096; die Wurzel daraus ist ${zd('rp_kv_se', 3)}. Die Varianzen unabhängiger Gruppen addieren sich.`, `1 : 17 + 1 : 27 = 0.096; the root of it is ${ze('rp_kv_se', 3)}. The variances of independent groups add up.`), true),
      a(P(`Standardfehler ${zd('rp_kv_se_n', 3)}`, `Standard error ${ze('rp_kv_se_n', 3)}`), P('Hier wurde durch n statt durch n − 3 geteilt. Die 3 gehört zur Formel von Fisher-z.', 'Here the divisor was n instead of n − 3. The 3 belongs to the formula of Fisher z.')),
      a(P(`Standardfehler ${zd('rp_kv_se_ohne_wurzel', 3)}`, `Standard error ${ze('rp_kv_se_ohne_wurzel', 3)}`), P('Das ist die Varianz, die Summe 1 : 17 + 1 : 27. Der Standardfehler ist ihre Wurzel.', 'That is the variance, the sum 1 : 17 + 1 : 27. The standard error is its root.')),
      a(P(`Standardfehler ${zd('rp_kv_se_gemeinsam', 3)}`, `Standard error ${ze('rp_kv_se_gemeinsam', 3)}`), P('Hier wurden beide Gruppen zu einer mit 47 Personen zusammengeworfen. Unabhängige Gruppen behalten ihr eigenes n; ihre Varianzen werden addiert.', 'Here both groups were thrown together into one of 47 people. Independent groups keep their own n; their variances are added.'))
    ],
    hilfe: ['fisher-z', 'rp-korrelationen-vergleichen'], belege: ['wissen:fisher-z-zweck', 'Hilfe:rp-korrelationen-vergleichen']
  },
  {
    id: 'rp-kv-entscheid', thema: T,
    stamm: P(`Zwei Korrelationen, r = 0,60 (n = 20) und r = 0,30 (n = 30), ergeben beim Vergleich über Fisher-z den Prüfwert Z = ${zd('rp_kv_z')} (p = ${zd('rp_kv_p')}). Was folgt daraus?`, `Two correlations, r = 0.60 (n = 20) and r = 0.30 (n = 30), give the test value Z = ${ze('rp_kv_z')} (p = ${ze('rp_kv_p')}) when compared via Fisher z. What follows?`),
    antworten: [
      a(P('Der Unterschied ist mit diesen Gruppengrößen nicht gesichert; das heißt aber nicht, dass die Zusammenhänge gleich sind', 'The difference is not established with these group sizes; but that does not mean the relationships are equal'), P(`Z liegt unter ${zd('rp_kv_krit')}, der Grenze bei 5 Prozent. Mit 20 und 30 Personen kann ein Unterschied von 0,60 und 0,30 noch Zufall sein. Kein Beleg für einen Unterschied ist kein Beleg für Gleichheit.`, `Z is below ${ze('rp_kv_krit')}, the limit at 5 percent. With 20 and 30 people a difference between 0.60 and 0.30 can still be chance. No evidence for a difference is no evidence for equality.`), true),
      a(P('Die Zusammenhänge sind in beiden Gruppen gleich stark', 'The relationships are equally strong in both groups'), P('Ein nicht signifikantes Ergebnis beweist keine Gleichheit. Es heißt nur: Die Daten reichen nicht, um einen Unterschied zu sichern.', 'A non-significant result proves no equality. It only says: the data are not enough to establish a difference.')),
      a(P('Die erste Korrelation ist signifikant stärker, denn 0,60 ist doppelt so groß wie 0,30', 'The first correlation is significantly stronger, because 0.60 is twice as large as 0.30'), P('Ob der Unterschied signifikant ist, entscheidet der Test, nicht der Augenschein. Er hängt von den Gruppengrößen ab.', 'Whether the difference is significant is decided by the test, not by appearance. It depends on the group sizes.')),
      a(P('Der Test ist ungültig, weil Z kleiner ist als die Gruppengröße', 'The test is invalid, because Z is smaller than the group size'), P('Z wird nicht mit der Gruppengröße verglichen, sondern mit der Grenze der Normalverteilung.', 'Z is not compared with the group size but with the limit of the normal distribution.'))
    ],
    hilfe: ['fisher-z', 'rp-korrelationen-vergleichen'], belege: ['wissen:fisher-z-zweck', 'Hilfe:rp-korrelationen-vergleichen']
  },
  {
    id: 'rp-kv-groesser', thema: T,
    stamm: P('Dieselben Korrelationen (0,60 und 0,30), aber jetzt mit je 200 Personen statt mit 20 und 30. Was ändert sich beim Vergleich?', 'The same correlations (0.60 and 0.30), but now with 200 people each instead of 20 and 30. What changes in the comparison?'),
    antworten: [
      a(P(`Der Standardfehler wird kleiner, Z steigt auf etwa ${zd('rp_kv_z200')}, und der Unterschied ist gesichert`, `The standard error gets smaller, Z rises to about ${ze('rp_kv_z200')}, and the difference is established`), P(`Mit 200 Personen je Gruppe beträgt der Standardfehler etwa 0,10 statt 0,31. Derselbe Unterschied der z ist jetzt etwa ${zd('rp_kv_z200')} Standardfehler groß, weit über ${zd('rp_kv_krit')}.`, `With 200 people per group the standard error is about 0.10 instead of 0.31. The same difference of the z is now about ${ze('rp_kv_z200')} standard errors large, far above ${ze('rp_kv_krit')}.`), true),
      a(P('Nichts, denn die Korrelationen sind dieselben geblieben', 'Nothing, because the correlations have stayed the same'), P('Die Beurteilung hängt von den Fallzahlen ab. Mit mehr Personen wird derselbe Unterschied sicherer.', 'The judgement depends on the numbers of cases. With more people the same difference becomes more certain.')),
      a(P('Z sinkt, weil mehr Personen den Unterschied ausgleichen', 'Z falls, because more people balance out the difference'), P('Mehr Personen verkleinern den Standardfehler, nicht den Unterschied. Z steigt deshalb.', 'More people shrink the standard error, not the difference. Z therefore rises.')),
      a(P('Die beiden Korrelationen nähern sich einander an', 'The two correlations move closer to each other'), P('Die Korrelationen sind hier vorgegeben und bleiben bei 0,60 und 0,30. Nur die Genauigkeit der Beurteilung ändert sich.', 'The correlations are given here and stay at 0.60 and 0.30. Only the precision of the judgement changes.'))
    ],
    hilfe: ['fisher-z', 'rp-korrelationen-vergleichen'], belege: ['wissen:fisher-z-zweck', 'Hilfe:rp-korrelationen-vergleichen']
  },
  {
    id: 'rp-kv-abhaengig', thema: T,
    stamm: P('Dieselben 80 Personen wurden zweimal befragt. Man will wissen, ob die Korrelation von Lernstunden und Punkten beim zweiten Mal anders ist als beim ersten Mal. Welches Vorgehen passt?', 'The same 80 people were surveyed twice. One wants to know whether the correlation of study hours and points is different the second time than the first. Which procedure fits?'),
    antworten: [
      a(P('Ein Test für abhängige Korrelationen, denn beide r stammen von denselben Personen und hängen deshalb zusammen', 'A test for dependent correlations, because both r come from the same people and are therefore related'), P('Der Fisher-z-Test für zwei Gruppen setzt voraus, dass die Korrelationen unabhängig sind. Bei denselben Personen braucht man einen Test, der ihren Zusammenhang berücksichtigt.', 'The Fisher z test for two groups requires the correlations to be independent. For the same people a test is needed that takes their relation into account.'), true),
      a(P('Derselbe Fisher-z-Test wie bei zwei Gruppen, mit n = 80 für beide', 'The same Fisher z test as for two groups, with n = 80 for both'), P('Die Formel nimmt zwei getrennte Stichproben an. Bei denselben Personen unterschätzt sie, wie ähnlich die beiden r einander sind.', 'The formula assumes two separate samples. For the same people it underestimates how similar the two r are to each other.')),
      a(P('Ein t-Test für die Lernstunden zwischen den beiden Zeitpunkten', 'A t test of the study hours between the two time points'), P('Das vergleicht Mittelwerte, nicht Korrelationen. Gefragt ist, ob der Zusammenhang anders ist.', 'That compares means, not correlations. What is asked is whether the relationship is different.')),
      a(P('Gar keiner, denn Korrelationen lassen sich überhaupt nicht vergleichen', 'None at all, because correlations cannot be compared in any way'), P('Sie lassen sich vergleichen, mit dem passenden Test für abhängige oder unabhängige Korrelationen.', 'They can be compared, with the suitable test for dependent or independent correlations.'))
    ],
    hilfe: ['fisher-z', 'rp-korrelationen-vergleichen'], belege: ['wissen:fisher-z-zweck', 'Hilfe:rp-korrelationen-vergleichen']
  },
  {
    id: 'rp-kv-mehrfach', thema: T, mehrfach: true,
    stamm: P('Welche Aussagen zum Vergleich zweier Korrelationen über Fisher-z stimmen? Mehrere können stimmen.', 'Which statements about comparing two correlations via Fisher z are true? Several can be true.'),
    antworten: [
      a(P('Der Test setzt zwei unabhängige Stichproben voraus', 'The test requires two independent samples'), P('Die Varianzen der beiden Fisher-z werden addiert, das geht nur, wenn die Gruppen verschiedene Personen enthalten.', 'The variances of the two Fisher z are added, which works only if the groups contain different people.'), true),
      a(P('Mit kleinen Gruppen bleibt auch ein großer Unterschied der r oft ungesichert', 'With small groups even a large difference of the r often stays unestablished'), P('Der Standardfehler ist bei kleinen Gruppen groß. Der Unterschied muss dann sehr groß sein, um Z über 1,96 zu bringen.', 'The standard error is large for small groups. The difference must then be very large to bring Z above 1.96.'), true),
      a(P('Man kann einfach prüfen, ob sich die beiden Konfidenzintervalle überlappen; das ist gleichwertig', 'One can simply check whether the two confidence intervals overlap; that is equivalent'), P('Überlappende Intervalle können trotzdem einen signifikanten Unterschied bedeuten. Die Überlappungsregel ist ein grobes und vorsichtiges Verfahren, kein gleichwertiger Test.', 'Overlapping intervals can still mean a significant difference. The overlap rule is a rough and cautious procedure, not an equivalent test.')),
      a(P('Gleiche Korrelationen bedeuten gleiche Steigungen der Regressionsgeraden', 'Equal correlations mean equal slopes of the regression lines'), P('Die Steigung hängt auch von der Streuung der Vorhersagegröße ab. Bei gleichem r können die Steigungen verschieden sein, wenn die Streuungen verschieden sind.', 'The slope also depends on the spread of the predictor. With equal r the slopes can differ if the spreads differ.'))
    ],
    hilfe: ['fisher-z', 'rp-korrelationen-vergleichen'], belege: ['wissen:fisher-z-zweck', 'wissen:baron86-moderator-korrelation', 'Hilfe:rp-korrelationen-vergleichen']
  },

  // ======================================================== 5. Kovarianzanalyse ausgebaut (ka), zusätzlich zu ve-kov-wann und ve-kov-steigung
  {
    id: 'rp-ka-adjustiert', thema: T, karte: 'gruppen',
    stamm: P(`Zwei Gruppen lernen mit Programm A oder B. Vorwissen (Mittelwert): A 40, B 48. Ergebnis (Mittelwert): A 55, B 61. In der Kovarianzanalyse hat das Vorwissen die Steigung b = ${zd('rp_ka_b')}. Wie groß ist der um das Vorwissen bereinigte Unterschied B minus A? Formel: Unterschied − b · Unterschied im Vorwissen.`,
      `Two groups learn with programme A or B. Prior knowledge (mean): A 40, B 48. Outcome (mean): A 55, B 61. In the analysis of covariance the prior knowledge has the slope b = ${ze('rp_ka_b')}. How large is the difference B minus A adjusted for prior knowledge? Formula: difference − b · difference in prior knowledge.`),
    antworten: [
      a(P('2 Punkte', '2 points'), P(`6 − ${zd('rp_ka_b')} · 8 = 6 − 4 = 2. Gruppe B startete mit mehr Vorwissen; der bereinigte Unterschied ist darum kleiner als der rohe.`, `6 − ${ze('rp_ka_b')} · 8 = 6 − 4 = 2. Group B started with more prior knowledge; the adjusted difference is therefore smaller than the raw one.`), true),
      a(P('6 Punkte', '6 points'), P('Das ist der rohe Unterschied der Mittelwerte. Der Startvorsprung von B ist noch nicht herausgerechnet.', 'That is the raw difference of the means. The head start of B is not yet adjusted away.')),
      a(P('10 Punkte', '10 points'), P('Hier wurde der Startvorsprung addiert statt abgezogen (6 + 4). B hatte mehr Vorwissen, also wird davon abgezogen.', 'Here the head start was added instead of subtracted (6 + 4). B had more prior knowledge, so it is subtracted.')),
      a(P('4 Punkte', '4 points'), P('Das ist nur der Abzug b · 8. Vom rohen Unterschied 6 ist er abzuziehen, er ist nicht selbst das Ergebnis.', 'That is only the deduction b · 8. It has to be subtracted from the raw difference 6, it is not the result itself.'))
    ],
    hilfe: ['ancova', 'kovarianzanalyse'], belege: ['Hilfe:kovarianzanalyse', 'Hilfe:ancova']
  },
  {
    id: 'rp-ka-nutzen', thema: T, karte: 'gruppen',
    stamm: P('In einem Experiment mit Zufallszuteilung wird das Vorwissen als Kovariate ins Modell genommen. Wozu nützt das?', 'In an experiment with random assignment the prior knowledge is taken into the model as a covariate. What is it good for?'),
    antworten: [
      a(P('Es erklärt einen Teil der Streuung innerhalb der Gruppen; der Fehler wird kleiner und der Gruppenvergleich genauer', 'It explains a part of the spread within the groups; the error gets smaller and the group comparison more precise'), P('Weniger unerklärte Streuung heißt kleinerer Standardfehler und mehr Teststärke. Das ist der Hauptnutzen der Kovariate im Experiment.', 'Less unexplained spread means a smaller standard error and more power. That is the main benefit of the covariate in an experiment.'), true),
      a(P('Es macht die Gruppen erst vergleichbar, denn ohne Kovariate unterscheiden sie sich systematisch', 'It makes the groups comparable in the first place, because without a covariate they differ systematically'), P('Bei Zufallszuteilung sind die Gruppen im Mittel schon vergleichbar. Die Kovariate erhöht nur die Genauigkeit.', 'With random assignment the groups are already comparable on average. The covariate only raises the precision.')),
      a(P('Es ersetzt die Zufallszuteilung', 'It replaces the random assignment'), P('Das Herausrechnen einer gemessenen Größe ersetzt die Zuteilung durch Zufall nicht, denn ungemessene Unterschiede bleiben.', 'Adjusting for a measured variable does not replace assignment by chance, because unmeasured differences remain.')),
      a(P('Es vergrößert die Zahl der Freiheitsgrade des Fehlers', 'It increases the degrees of freedom of the error'), P('Das Gegenteil: Die Kovariate kostet einen Freiheitsgrad. Das lohnt sich, wenn sie genug Streuung erklärt.', 'The opposite: the covariate costs one degree of freedom. That pays off if it explains enough spread.'))
    ],
    hilfe: ['ancova', 'kovarianzanalyse'], belege: ['Hilfe:kovarianzanalyse', 'Hilfe:ancova']
  },
  {
    id: 'rp-ka-kaum', thema: T, karte: 'gruppen',
    stamm: P('Die Kovariate zeigt fast keinen Zusammenhang mit dem Ergebnis (r = 0,05). Was bringt sie dem Modell?', 'The covariate shows almost no relationship with the outcome (r = 0.05). What does it bring to the model?'),
    antworten: [
      a(P('Kaum etwas: Die Streuung im Fehler wird kaum kleiner, und ein Freiheitsgrad geht verloren', 'Hardly anything: the spread in the error hardly gets smaller, and one degree of freedom is lost'), P('Nur eine Kovariate, die mit dem Ergebnis zusammenhängt, kann Streuung erklären. Eine unnütze kostet Teststärke statt sie zu erhöhen.', 'Only a covariate that is related to the outcome can explain spread. A useless one costs power instead of raising it.'), true),
      a(P('Viel, denn jede Kovariate erhöht die Teststärke', 'A lot, because every covariate raises the power'), P('Die Teststärke steigt nur, wenn die Kovariate Streuung erklärt. Bei r = 0,05 ist das kaum der Fall.', 'The power rises only if the covariate explains spread. With r = 0.05 that is hardly the case.')),
      a(P('Sie verkleinert den Gruppenunterschied zwangsläufig', 'It necessarily shrinks the group difference'), P('Der bereinigte Unterschied ändert sich nur, wenn sich die Gruppen in der Kovariate unterscheiden und diese mit dem Ergebnis zusammenhängt.', 'The adjusted difference changes only if the groups differ in the covariate and it is related to the outcome.')),
      a(P('Sie macht den Gruppentest ungültig', 'It makes the group test invalid'), P('Der Test bleibt gültig, er wird nur nicht genauer.', 'The test stays valid, it just does not become more precise.'))
    ],
    hilfe: ['ancova', 'kovarianzanalyse'], belege: ['Hilfe:kovarianzanalyse', 'Hilfe:ancova']
  },
  {
    id: 'rp-ka-ungleich', thema: T, karte: 'gruppen',
    stamm: P('Zwei bestehende Klassen (ohne Zufallszuteilung) unterscheiden sich schon im Vorwissen. Man rechnet eine Kovarianzanalyse mit dem Vorwissen als Kovariate. Was gleicht sie aus?', 'Two existing classes (without random assignment) already differ in prior knowledge. An analysis of covariance is calculated with the prior knowledge as covariate. What does it adjust for?'),
    antworten: [
      a(P('Nur den Unterschied im gemessenen Vorwissen; andere Unterschiede der Klassen bleiben bestehen', 'Only the difference in the measured prior knowledge; other differences between the classes remain'), P('Die Kovarianzanalyse kann nur herausrechnen, was gemessen und ins Modell genommen wurde. Ungemessene Unterschiede, etwa Motivation, wirken weiter.', 'The analysis of covariance can only adjust for what was measured and put into the model. Unmeasured differences, such as motivation, continue to act.'), true),
      a(P('Alle Unterschiede der Klassen, so wie bei einer Zufallszuteilung', 'All differences between the classes, as with random assignment'), P('Nur die Zufallszuteilung gleicht auch ungemessene Unterschiede im Mittel aus. Die Kovariate kann das nicht ersetzen.', 'Only random assignment also balances unmeasured differences on average. The covariate cannot replace that.')),
      a(P('Nur Unterschiede in der Klassengröße', 'Only differences in class size'), P('Die Klassengröße spielt dafür keine Rolle. Herausgerechnet wird der Unterschied in der Kovariate.', 'Class size plays no role here. What is adjusted for is the difference in the covariate.')),
      a(P('Nichts, bei bestehenden Gruppen ist die Kovariate wirkungslos', 'Nothing, with existing groups the covariate has no effect'), P('Die Kovariate wirkt auch hier: Sie bereinigt um den Unterschied im Vorwissen, aber nur um diesen.', 'The covariate works here too: it adjusts for the difference in prior knowledge, but only for that.'))
    ],
    hilfe: ['ancova', 'kovarianzanalyse'], belege: ['Hilfe:kovarianzanalyse', 'Hilfe:ancova']
  },
  {
    id: 'rp-ka-mehrfach', thema: T, mehrfach: true, karte: 'gruppen',
    stamm: P('Welche Aussagen zur Kovarianzanalyse (ANCOVA) stimmen? Mehrere können stimmen.', 'Which statements about the analysis of covariance (ANCOVA) are true? Several can be true.'),
    antworten: [
      a(P('Sie ist eine Regression mit der Gruppe und der Kovariate als Vorhersagegrößen', 'It is a regression with the group and the covariate as predictors'), P('Die Gruppe geht als 0/1-Spalte ein, die Kovariate als Zahl. Der Gruppeneffekt gilt bei gleichem Wert der Kovariate.', 'The group enters as a 0/1 column, the covariate as a number. The group effect holds at the same value of the covariate.'), true),
      a(P('Adjustierte Mittelwerte sind die Gruppenmittelwerte bei gleichem Wert der Kovariate', 'Adjusted means are the group means at the same value of the covariate'), P('Man schätzt, wie die Gruppen bei demselben Vorwissen im Mittel abgeschnitten hätten, meist beim Gesamtmittel der Kovariate.', 'One estimates how the groups would have done on average with the same prior knowledge, usually at the overall mean of the covariate.'), true),
      a(P('Die Kovariate wird wie ein zweiter Faktor mit Stufen behandelt', 'The covariate is treated like a second factor with levels'), P('Die Kovariate ist eine Zahl mit einer einzigen Steigung. Ein Faktor hat Stufen und je Stufe einen eigenen Mittelwert.', 'The covariate is a number with a single slope. A factor has levels and a mean of its own for each level.')),
      a(P('Der Gruppentest bleibt mit und ohne Kovariate gleich, denn die Gruppen ändern sich nicht', 'The group test stays the same with and without a covariate, because the groups do not change'), P('Mit Kovariate ändern sich Fehlerstreuung und bereinigte Mittelwerte. Darum ändert sich auch der Gruppentest.', 'With a covariate the error spread and the adjusted means change. So the group test changes too.'))
    ],
    hilfe: ['ancova', 'kovarianzanalyse'], belege: ['Hilfe:kovarianzanalyse', 'Hilfe:ancova']
  },

  // ======================================================== 6. Kollinearität ausgebaut (kl), zusätzlich zu den vorhandenen fünf Fragen
  {
    id: 'rp-kl-vif-rechnen', thema: T,
    stamm: P(`Eine Vorhersagegröße lässt sich aus den anderen Vorhersagegrößen mit R² = ${zd('rp_kl_r2')} vorhersagen. Wie groß ist ihr VIF? Formel: 1 : (1 − R²).`, `A predictor can be predicted from the other predictors with R² = ${ze('rp_kl_r2')}. How large is its VIF? Formula: 1 : (1 − R²).`),
    antworten: [
      a(P('VIF = 5', 'VIF = 5'), P(`1 : (1 − ${zd('rp_kl_r2')}) = 1 : ${zd('rp_kl_tol')} = 5. Der VIF liegt an der ersten Faustgrenze: Ab 5 sieht man genauer hin.`, `1 : (1 − ${ze('rp_kl_r2')}) = 1 : ${ze('rp_kl_tol')} = 5. The VIF is at the first rule of thumb: from 5 one looks more closely.`), true),
      a(P(`VIF = ${zd('rp_kl_r2_inv')}`, `VIF = ${ze('rp_kl_r2_inv')}`), P('Das ist 1 : R². Im Nenner steht 1 − R², also der nicht erklärte Teil.', 'That is 1 : R². The denominator is 1 − R², the part not explained.')),
      a(P(`VIF = ${zd('rp_kl_tol')}`, `VIF = ${ze('rp_kl_tol')}`), P('Das ist die Toleranz 1 − R². Der VIF ist ihr Kehrwert.', 'That is the tolerance 1 − R². The VIF is its reciprocal.')),
      a(P('VIF = 4', 'VIF = 4'), P('Das ist R² : (1 − R²), ein anderes Verhältnis (Odds). Beim VIF steht im Zähler 1.', 'That is R² : (1 − R²), another ratio (odds). For the VIF the numerator is 1.'))
    ],
    hilfe: ['vif', 'toleranz'], belege: ['wissen:reg-toleranz-vif', 'wissen:reg-vif-schwellen', 'Hilfe:vif']
  },
  {
    id: 'rp-kl-faktor', thema: T,
    stamm: P('Der VIF einer Vorhersagegröße beträgt 9. Um welchen Faktor ist ihr Standardfehler größer, als er ohne Überschneidung mit den anderen Größen wäre?', 'The VIF of a predictor is 9. By which factor is its standard error larger than it would be without overlap with the other variables?'),
    antworten: [
      a(P('3, die Wurzel aus dem VIF', '3, the root of the VIF'), P('Der VIF bläht die Varianz auf, der Standardfehler ist die Wurzel der Varianz. Er wächst also um √VIF = 3.', 'The VIF inflates the variance, the standard error is the root of the variance. It therefore grows by √VIF = 3.'), true),
      a(P('9, derselbe Wert wie der VIF', '9, the same value as the VIF'), P('Der VIF bezieht sich auf die Varianz. Der Standardfehler wächst nur um deren Wurzel.', 'The VIF refers to the variance. The standard error grows only by its root.')),
      a(P('81, das Quadrat des VIF', '81, the square of the VIF'), P('Das wäre die falsche Richtung: Quadrieren statt die Wurzel zu ziehen.', 'That would be the wrong direction: squaring instead of taking the root.')),
      a(P('Ein Neuntel, denn eine Überschneidung verkleinert den Standardfehler', 'One ninth, because overlap shrinks the standard error'), P('Überschneidung vergrößert den Standardfehler, sie verkleinert ihn nicht. Die Schätzung des B wird unsicherer.', 'Overlap enlarges the standard error, it does not shrink it. The estimate of B becomes more uncertain.'))
    ],
    hilfe: ['vif', 'kollinearitaet'], belege: ['wissen:reg-toleranz-vif', 'wissen:reg-multikollinearitaet-folgen', 'Hilfe:vif']
  }
];
