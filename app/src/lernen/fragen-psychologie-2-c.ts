/**
 * Fallreihen zu den Psychologie-Beispielen, Teil c (Stufe 6.3 „nutzen“): Freiwillige für Forschung (`psy2-fr`), Persönlichkeitsfragebogen (`psy2-bf`), Wörter erkennen mit Mehrebenenmodell (`psy2-wo`).
 * Jede Zahl kommt aus lib/testdaten/ueben-erwartet-psych.json (R, vom Prüfer) über `Z(<beispiel>)` mit Platzhaltern (siehe fragen-psychologie-2-bau.ts).
 */
import { P } from '../i18n/laufzeit';
import type { Frage, ThemaModul } from './fragen';
import { a, THEMA, Z, tabelle, QU } from './fragen-psychologie-2-bau';

const FR = Z('freiwilligkeit'), BF = Z('persoenlichkeit-bfi'), WO = Z('woerter-personen-reize');
const Q_FR = QU('Wer meldet sich freiwillig für Forschung?', 'Who volunteers for research?');
const Q_BF = QU('Persönlichkeit mit dem Big-Five-Fragebogen', 'Personality with the Big Five questionnaire');
const Q_WO = QU('Wörter, Personen und Reize', 'Words, people and stimuli');
const SOLL = 'Code:lib/testdaten/ueben-erwartet-psych.json';

export const FAELLE_C: NonNullable<ThemaModul['FAELLE']> = {
  // ======================================================== Freiwillige
  'psy2-fr': {
    titel: P('Melden sich bestimmte Menschen eher für psychologische Forschung, und sagt das etwas über die Studien? 1421 Personen mit Eysenck-Fragebogen (Neurotizismus, Extraversion), Geschlecht und der Angabe, ob sie sich gemeldet haben: Kreuztabelle mit Chi-Quadrat-Test und logistische Regression',
      'Do certain people volunteer more readily for psychological research, and does that say something about the studies? 1421 people with the Eysenck questionnaire (neuroticism, extraversion), gender and whether they volunteered: crosstab with chi-square test and logistic regression'),
    tabellen: [
      tabelle(P('Freiwillige Meldung nach Geschlecht (Zahl der Personen)', 'Volunteering by gender (number of people)'), [P('Geschlecht', 'Gender'), P('Gemeldet', 'Volunteered'), P('Nicht gemeldet', 'Did not volunteer'), P('Gemeldet (Prozent)', 'Volunteered (percent)')],
        [['Frauen', FR.c('frauen_freiwillig', 0), FR.c('frauen_nicht', 0), FR.c('frauen_freiwillig_prozent', 1)], ['Männer', FR.c('maenner_freiwillig', 0), FR.c('maenner_nicht', 0), FR.c('maenner_freiwillig_prozent', 1)]], Q_FR),
      tabelle(P('Chi-Quadrat-Test und Maße des Zusammenhangs', 'Chi-square test and measures of association'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['Chi²', FR.c('chi2', 2)], ['Freiheitsgrade', FR.c('df', 0)], ['p', FR.cp('p')], ['Cramérs V', FR.c('cramers_v', 2)], ['Odds Ratio (Frauen gegen Männer)', FR.c('odds_ratio_frauen_gegen_maenner', 2)]], Q_FR),
      tabelle(P('Logistische Regression: Odds Ratio je Einfluss', 'Logistic regression: odds ratio per predictor'), [P('Einfluss', 'Predictor'), P('Odds Ratio', 'Odds ratio'), P('p', 'p')],
        [['Neurotizismus (je Punkt)', FR.c('or_neurotizismus', 2), FR.c('p_neurotizismus', 2)], ['Extraversion (je Punkt)', FR.c('or_extraversion', 2), FR.cp('p_extraversion')], ['Extraversion (je 5 Punkte)', FR.c('or_extraversion_5_punkte', 2), '']], Q_FR)
    ]
  },
  // ======================================================== Persönlichkeit
  'psy2-bf': {
    titel: P('Lassen sich Persönlichkeitsmerkmale mit Fragebögen zuverlässig messen? 25 Aussagen aus dem International Personality Item Pool, 2800 Personen: Eignung für die Faktorenanalyse, Alpha und Omega je Skala, fehlende Werte',
      'Can personality traits be measured dependably with questionnaires? 25 statements from the International Personality Item Pool, 2800 people: suitability for factor analysis, alpha and omega per scale, missing values'),
    tabellen: [
      tabelle(P('Eignung für die Faktorenanalyse und fehlende Werte', 'Suitability for factor analysis and missing values'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['KMO insgesamt', BF.c('kmo_gesamt', 2)], ['Personen ohne fehlende Werte', BF.c('personen_vollstaendig', 0)], ['Personen mit fehlenden Werten', BF.c('personen_mit_fehlend', 0)], ['Fehlende Antworten in den 25 Fragen', BF.c('fehlend_fragen_gesamt', 0)], ['Höchster Anteil fehlend in einer Frage (Prozent)', BF.c('fehlend_fragen_max_anteil_prozent', 2)], ['Fehlende Angaben zur Bildung', BF.c('fehlend_bildung', 0)]], Q_BF),
      tabelle(P('Skalen aus je fünf Fragen: Alpha vor und nach dem Umpolen, Omega, Trennschärfe', 'Scales of five questions each: alpha before and after reversing, omega, item-total correlation'), [P('Skala', 'Scale'), P('Personen', 'People'), P('Alpha ohne Umpolen', 'Alpha without reversing'), P('Alpha nach Umpolen', 'Alpha after reversing'), P('Omega', 'Omega'), P('Trennschärfe kleinste', 'Item-total correlation smallest'), P('Trennschärfe größte', 'Item-total correlation largest')],
        [['Verträglichkeit', BF.c('n_v', 0), BF.c('alpha_roh_v', 2), BF.c('alpha_v', 2), BF.c('omega_v', 2), BF.c('trennschaerfe_min_v', 2), BF.c('trennschaerfe_max_v', 2)],
          ['Neurotizismus', BF.c('n_n', 0), BF.c('alpha_roh_n', 2), BF.c('alpha_n', 2), BF.c('omega_n', 2), BF.c('trennschaerfe_min_n', 2), BF.c('trennschaerfe_max_n', 2)],
          ['Offenheit', BF.c('n_o', 0), BF.c('alpha_roh_o', 2), BF.c('alpha_o', 2), BF.c('omega_o', 2), BF.c('trennschaerfe_min_o', 2), BF.c('trennschaerfe_max_o', 2)]], Q_BF)
    ]
  },
  // ======================================================== Wörter und Personen
  'psy2-wo': {
    titel: P('Erkennen Menschen Wörter schneller als erfundene Buchstabenfolgen, und wie sehr unterscheiden sie sich voneinander? Reaktionszeit in Millisekunden in Einzelversuchen von 45 Personen auf Wörter und Nichtwörter, seltene und häufige Reize: Mehrebenenmodell mit Personen',
      'Do people recognise words faster than made-up letter strings, and how much do they differ from one another? Reaction time in milliseconds in single trials of 45 people on words and nonwords, rare and frequent stimuli: multilevel model with people'),
    tabellen: [
      tabelle(P('Mittlere Reaktionszeit (Millisekunden) nach Bedingung, alle Versuche', 'Mean reaction time (milliseconds) by condition, all trials'), [P('Bedingung', 'Condition'), P('Mittelwert', 'Mean')],
        [['Vorlesen', WO.c('mittel_vorlesen', 0)], ['Entscheiden', WO.c('mittel_entscheiden', 0)], ['Wort', WO.c('mittel_wort', 0)], ['Nichtwort', WO.c('mittel_nichtwort', 0)], ['Häufiger Reiz', WO.c('mittel_haeufig', 0)], ['Seltener Reiz', WO.c('mittel_selten', 0)]], Q_WO),
      tabelle(P('Nullmodell mit Personen: Streuung zwischen und innerhalb der Personen', 'Null model with people: spread between and within people'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['ICC', WO.c('icc', 2)], ['Standardabweichung zwischen Personen', WO.c('sd_zwischen_personen', 0)], ['Standardabweichung innerhalb einer Person', WO.c('sd_innerhalb_person', 0)]], Q_WO),
      tabelle(P('Modell mit Personen, Aufgabe, Wortart und Häufigkeit: feste Effekte (Millisekunden)', 'Model with people, task, word type and frequency: fixed effects (milliseconds)'), [P('Effekt', 'Effect'), P('Schätzung', 'Estimate'), P('Standardfehler', 'Standard error'), P('t', 't'), P('p', 'p')],
        [['Vorlesen gegen Entscheiden', WO.c('fest_aufgabe_vorlesen', 0), WO.c('se_aufgabe_vorlesen', 1), WO.c('t_aufgabe_vorlesen', 2), WO.cp('p_aufgabe_vorlesen')],
          ['Wort gegen Nichtwort', WO.c('fest_wortart_wort', 0), WO.c('se_wortart_wort', 1), WO.c('t_wortart_wort', 2), WO.cp('p_wortart_wort')],
          ['Selten gegen Häufig', WO.c('fest_haeufigkeit_selten', 0), WO.c('se_haeufigkeit_selten', 1), WO.c('t_haeufigkeit_selten', 2), WO.c('p_haeufigkeit_selten', 2)]], Q_WO),
      tabelle(P('Streuung im Modell (Standardabweichung, Millisekunden)', 'Spread in the model (standard deviation, milliseconds)'), [P('Teil', 'Part'), P('Wert', 'Value')],
        [['Zwischen den Personen', WO.c('sd_person_im_modell', 0)], ['Rest innerhalb der Personen', WO.c('sd_rest_im_modell', 0)]], Q_WO),
      tabelle(P('Wortart (Wort gegen Nichtwort): nur Personen gegen Personen und Reize als gekreuzte Gruppierungen', 'Word type (word against nonword): people only against people and stimuli as crossed groupings'), [P('Modell', 'Model'), P('Standardfehler', 'Standard error'), P('Freiheitsgrade', 'Degrees of freedom')],
        [['Nur Personen', WO.c('se_wortart_wort', 1), WO.c('df_wortart_wort', 0)], ['Personen und Reize, gekreuzt', WO.c('gk_se_wortart', 1), WO.c('gk_df_wortart', 0)]], Q_WO),
      tabelle(P('Nullmodell mit Personen und Reizen: Anteil an der Gesamtvarianz', 'Null model with people and stimuli: share of the total variance'), [P('Gruppierung', 'Grouping'), P('Anteil', 'Share')],
        [['Personen', WO.c('gk_icc_person', 2)], ['Reize', WO.c('gk_icc_reiz', 2)]], Q_WO)
    ]
  }
};

export const FRAGEN_C: Frage[] = [
  // ---------------------------------------------------------------- Freiwillige
  {
    id: 'psy2-fr-prozent', thema: THEMA, fall: 'psy2-fr',
    stamm: P(`Melden sich Frauen öfter freiwillig für Forschung als Männer? Von den Frauen haben sich ${FR.d('frauen_freiwillig_prozent', 1)} Prozent gemeldet, von den Männern ${FR.d('maenner_freiwillig_prozent', 1)} Prozent; Chi²(${FR.d('df', 0)}) = ${FR.d('chi2', 2)}, p ${FR.pd('p')}. Was folgt?`, `Do women volunteer for research more often than men? Of the women ${FR.e('frauen_freiwillig_prozent', 1)} percent volunteered, of the men ${FR.e('maenner_freiwillig_prozent', 1)} percent; chi-square(${FR.e('df', 0)}) = ${FR.e('chi2', 2)}, p ${FR.pe('p')}. What follows?`),
    antworten: [
      a(P(`Mit ${FR.td('p', 1)} Prozent Wahrscheinlichkeit gilt die Nullhypothese, dass sich Frauen und Männer gleich oft melden.`, `With ${FR.te('p', 1)} percent probability the null hypothesis holds that women and men volunteer equally often.`),
        P(`Der p-Wert ist nicht die Wahrscheinlichkeit der Nullhypothese. Er sagt, wie selten ein Unterschied dieser Größe wäre, wenn beide Gruppen gleich oft zusagen.`, `The p value is not the probability of the null hypothesis. It says how rare a difference of this size would be if both groups agreed equally often.`)),
      a(P(`Bei gleicher Meldebereitschaft wäre ein solcher Unterschied selten; die Daten sprechen dafür.`, `With equal willingness such a difference would be rare; the data speak for a difference.`),
        P(`Der Chi-Quadrat-Test prüft, ob die Anteile in der Grundgesamtheit gleich sein können. Mit p ${FR.pd('p')} spricht das gegen gleiche Anteile; die Größe zeigen Prozentwerte und Odds Ratio.`, `The chi-square test checks whether the population shares can be equal. With p ${FR.pe('p')} that speaks against it; the size is shown by percentages and odds ratio.`), true),
      a(P(`Das Geschlecht bestimmt, ob sich jemand meldet, denn der Test ist signifikant.`, `Gender determines whether someone volunteers, because the test is significant.`),
        P(`Ein signifikanter Test zeigt einen Zusammenhang, nicht seine Ursache. Auch Alter, Persönlichkeit oder die Art der Einladung können eine Rolle spielen.`, `A significant test shows an association, not its cause. Age, personality or the kind of invitation can also play a role.`)),
      a(P(`Weil p unter 0,05 liegt, ist bewiesen, dass sich Frauen häufiger melden als Männer.`, `Because p is below 0.05, it is established that women volunteer more often than men.`),
        P(`Ein signifikantes Ergebnis beweist keine Hypothese. Es gibt Befunde, die bei einer Wiederholung nicht erneut signifikant werden; für die Verlässlichkeit zählen Größe und Wiederholbarkeit.`, `A significant result proves no hypothesis. There are findings that are not significant again on replication; for dependability size and replicability count.`))
    ],
    hilfe: ['chi-quadrat-unabhaengigkeit', 'p-wert'], belege: ['Haller und Krauss 2002', SOLL]
  },
  {
    id: 'psy2-fr-v', thema: THEMA, fall: 'psy2-fr',
    stamm: P(`Cramérs V beträgt ${FR.d('cramers_v', 2)}. Wie groß ist der Zusammenhang zwischen Geschlecht und freiwilliger Meldung, und wie verträgt sich das mit p ${FR.pd('p')}?`, `Cramér V is ${FR.e('cramers_v', 2)}. How large is the association between gender and volunteering, and how does that fit with p ${FR.pe('p')}?`),
    antworten: [
      a(P(`Der Zusammenhang ist sehr klein, bei 1421 Personen aber signifikant.`, `The association is very small, but significant with 1421 people.`),
        P(`Der p-Wert hängt von der Stichprobengröße ab, Cramérs V nicht. V von ${FR.d('cramers_v', 2)} zeigt einen kaum merklichen Zusammenhang.`, `The p value depends on the sample size, Cramér V does not. V of ${FR.e('cramers_v', 2)} shows a barely noticeable association.`), true),
      a(P(`Der Zusammenhang ist stark, denn p ${FR.pd('p')} liegt klar unter 0,05.`, `The association is strong, because p ${FR.pe('p')} lies clearly below 0.05.`),
        P(`Signifikanz ist nicht Bedeutsamkeit. Das p sagt nur, dass der Zusammenhang nicht null ist; seine Stärke zeigt V.`, `Significance is not importance. The p only says that the association is not zero; its strength is shown by V.`)),
      a(P(`Der Zusammenhang erklärt ${FR.td('cramers_v', 0)} Prozent der Unterschiede im Meldeverhalten.`, `The association explains ${FR.te('cramers_v', 0)} percent of the differences in volunteering behaviour.`),
        P(`V ist kein Anteil erklärter Streuung. Erst das Quadrat eines solchen Maßes gäbe einen Anteil, und der wäre noch deutlich kleiner.`, `V is not a share of explained spread. Only the square of such a measure would give a share, and that would be even clearly smaller.`)),
      a(P(`Ein V von ${FR.d('cramers_v', 2)} zeigt, dass der Chi-Quadrat-Test nicht angewendet werden durfte.`, `A V of ${FR.e('cramers_v', 2)} shows that the chi-square test should not have been used.`),
        P(`V und Test beantworten verschiedene Fragen: Der Test prüft, ob es einen Zusammenhang gibt, V beschreibt seine Stärke. Beide gehören in den Bericht.`, `V and test answer different questions: the test checks whether there is an association, V describes its strength. Both belong in the report.`))
    ],
    hilfe: ['cramers-v', 'effektstaerke'], belege: ['Cohen 1988', SOLL]
  },
  {
    id: 'psy2-fr-or', thema: THEMA, fall: 'psy2-fr',
    stamm: P(`Das Odds Ratio für Frauen gegen Männer beträgt ${FR.d('odds_ratio_frauen_gegen_maenner', 2)}. Was heißt das?`, `The odds ratio for women against men is ${FR.e('odds_ratio_frauen_gegen_maenner', 2)}. What does it mean?`),
    antworten: [
      a(P(`Frauen melden sich ${FR.d('odds_ratio_frauen_gegen_maenner', 2)}-mal so oft wie Männer.`, `Women volunteer ${FR.e('odds_ratio_frauen_gegen_maenner', 2)} times as often as men.`),
        P(`Das wäre ein Verhältnis von Wahrscheinlichkeiten. Hier stehen ${FR.d('frauen_freiwillig_prozent', 1)} und ${FR.d('maenner_freiwillig_prozent', 1)} Prozent; deren Verhältnis ist deutlich kleiner als das Odds Ratio.`, `That would be a ratio of probabilities. Here ${FR.e('frauen_freiwillig_prozent', 1)} and ${FR.e('maenner_freiwillig_prozent', 1)} percent are shown; their ratio is clearly smaller than the odds ratio.`)),
      a(P(`Frauen haben eine ${FR.d('odds_ratio_frauen_gegen_maenner', 2)}-mal so hohe Chance sich zu melden.`, `The odds of volunteering are ${FR.e('odds_ratio_frauen_gegen_maenner', 2)} times as high for women as for men.`),
        P(`Das Odds Ratio vergleicht Chancen: Meldende geteilt durch Nichtmeldende, hier ${FR.d('frauen_freiwillig', 0)} zu ${FR.d('frauen_nicht', 0)} bei Frauen und ${FR.d('maenner_freiwillig', 0)} zu ${FR.d('maenner_nicht', 0)} bei Männern.`, `The odds ratio compares odds: volunteers divided by non-volunteers, here ${FR.e('frauen_freiwillig', 0)} to ${FR.e('frauen_nicht', 0)} for women and ${FR.e('maenner_freiwillig', 0)} to ${FR.e('maenner_nicht', 0)} for men.`), true),
      a(P(`Von je ${FR.d('odds_ratio_frauen_gegen_maenner', 1)} Frauen meldet sich eine, bei den Männern ist es seltener.`, `Of every ${FR.e('odds_ratio_frauen_gegen_maenner', 1)} women one volunteers, among men it is rarer.`),
        P(`Ein Odds Ratio gibt keine Zahl von Personen an. Es ist ein Verhältnis zweier Chancen und lässt sich nur im Vergleich der beiden Gruppen lesen.`, `An odds ratio does not give a number of people. It is a ratio of two odds and can only be read by comparing the two groups.`)),
      a(P(`Wegen des Werts über 1 melden sich ${FR.td('odds_ratio_frauen_gegen_maenner', 0)} Prozent mehr Frauen als Männer.`, `Because of the value above 1, ${FR.te('odds_ratio_frauen_gegen_maenner', 0)} percent more women than men volunteer.`),
        P(`Der Wert 1 bedeutet gleiche Chancen. Ein Wert über 1 zeigt höhere Chancen für die erste Gruppe, ohne dass sich daraus ein Prozentwert für die Zahl der Personen ergibt.`, `The value 1 means equal odds. A value above 1 shows higher odds for the first group without yielding a percentage for the number of people.`))
    ],
    hilfe: ['odds-ratio', 'chi-quadrat'], belege: ['Hilfe:odds-ratio', SOLL]
  },
  {
    id: 'psy2-fr-neuro', thema: THEMA, fall: 'psy2-fr',
    stamm: P(`In der logistischen Regression hat Neurotizismus das Odds Ratio ${FR.d('or_neurotizismus', 2)} mit p ${FR.pd('p_neurotizismus')}. Wie ist das zu deuten?`, `In the logistic regression neuroticism has the odds ratio ${FR.e('or_neurotizismus', 2)} with p ${FR.pe('p_neurotizismus')}. How is this to be interpreted?`),
    antworten: [
      a(P(`Ein Einfluss des Neurotizismus ist nicht erkennbar; ohne Einfluss ist er damit nicht gezeigt.`, `No influence of neuroticism is recognisable; that does not show it has none.`),
        P(`Ein Odds Ratio nahe 1 mit großem p bedeutet: Die Daten zeigen keinen Einfluss. Für Einflusslosigkeit bräuchte man ein enges Intervall um 1.`, `An odds ratio near 1 with a large p means: the data show no influence. For no influence one would need a narrow interval around 1.`), true),
      a(P(`Neurotizismus hat nachweislich keinerlei Einfluss auf die Meldung, das Odds Ratio liegt fast bei 1.`, `Neuroticism demonstrably has no influence whatsoever on volunteering, the odds ratio is almost 1.`),
        P(`Ein Odds Ratio nahe 1 mit großem p belegt keinen fehlenden Einfluss. Ein kleiner Einfluss kann bestehen und bei dieser Stichprobe nur nicht deutlich werden.`, `An odds ratio near 1 with a large p does not prove a missing influence. A small influence can exist and merely not become clear in this sample.`)),
      a(P(`Mit ${FR.td('p_neurotizismus', 0)} Prozent Wahrscheinlichkeit hat Neurotizismus einen Einfluss auf die Meldung.`, `With ${FR.te('p_neurotizismus', 0)} percent probability neuroticism has an influence on volunteering.`),
        P(`Der p-Wert ist keine Wahrscheinlichkeit für einen Einfluss. Er gibt an, wie gut die Daten zu einem fehlenden Einfluss passen.`, `The p value is not a probability for an influence. It indicates how well the data fit a missing influence.`)),
      a(P(`Das Odds Ratio über 1 zeigt, dass Neurotizismus die Meldung fördert, auch wenn p groß ist.`, `The odds ratio above 1 shows that neuroticism promotes volunteering, even if p is large.`),
        P(`Mit großem p lässt sich die Richtung nicht sicher lesen. Der Wert ${FR.d('or_neurotizismus', 2)} liegt so nahe bei 1, dass er auch Zufall sein kann.`, `With a large p the direction cannot be read reliably. The value ${FR.e('or_neurotizismus', 2)} lies so close to 1 that it can also be chance.`))
    ],
    hilfe: ['odds-ratio', 'p-wert'], belege: ['Haller und Krauss 2002', SOLL]
  },
  {
    id: 'psy2-fr-extra5', thema: THEMA, fall: 'psy2-fr',
    stamm: P(`Je Punkt mehr Extraversion steigt die Chance, sich zu melden, um den Faktor ${FR.d('or_extraversion', 2)}. Wie groß ist der Faktor für fünf Punkte mehr?`, `With each point more extraversion the odds of volunteering rise by a factor of ${FR.e('or_extraversion', 2)}. How large is the factor for five points more?`),
    antworten: [
      a(P(`Etwa das Fünffache des Faktors für einen Punkt, also deutlich über ${FR.d('or_extraversion_5_punkte', 2)}.`, `About five times the factor for one point, so clearly above ${FR.e('or_extraversion_5_punkte', 2)}.`),
        P(`Odds Ratios wirken multiplikativ, nicht additiv. Das Fünffache des Faktors wäre eine falsche Rechnung; hier würde man fünf Faktoren multiplizieren.`, `Odds ratios work multiplicatively, not additively. Five times the factor would be a wrong calculation; here one would multiply five factors.`)),
      a(P(`Die Faktoren der fünf Punkte werden multipliziert, das ergibt ${FR.d('or_extraversion_5_punkte', 2)}.`, `The factors of the five points are multiplied, which gives ${FR.e('or_extraversion_5_punkte', 2)}.`),
        P(`Ein Odds Ratio je Punkt gilt für jeden weiteren Punkt neu; die Chance wächst mit demselben Faktor von Punkt zu Punkt.`, `An odds ratio per point applies again for each further point; the odds grow by the same factor from point to point.`), true),
      a(P(`Der Faktor bleibt ${FR.d('or_extraversion', 2)}, denn ein Odds Ratio hängt nicht von der Zahl der Punkte ab.`, `The factor stays ${FR.e('or_extraversion', 2)}, because an odds ratio does not depend on the number of points.`),
        P(`Das Odds Ratio gilt für eine Einheit der Skala. Wählt man fünf Einheiten, ändert sich der Wert; die Einheit bestimmt, welches Odds Ratio zu lesen ist.`, `The odds ratio applies to one unit of the scale. If one chooses five units, the value changes; the unit determines which odds ratio is to be read.`)),
      a(P(`Der Faktor ist ${FR.d('or_extraversion', 2)}, geteilt durch fünf, weil sich die Wirkung auf die Punkte verteilt.`, `The factor is ${FR.e('or_extraversion', 2)} divided by five, because the effect is spread across the points.`),
        P(`Die Wirkung verteilt sich nicht auf die Punkte, sie wächst mit ihnen. Mehr Punkte bedeuten ein größeres Odds Ratio und nicht ein kleineres.`, `The effect is not spread across the points, it grows with them. More points mean a larger odds ratio and not a smaller one.`))
    ],
    hilfe: ['odds-ratio', 'koeffizient-b'], belege: ['Hilfe:odds-ratio', SOLL]
  },
  {
    id: 'psy2-fr-ursache', thema: THEMA, fall: 'psy2-fr',
    stamm: P(`Extraversion hängt mit der Meldung zusammen (Odds Ratio ${FR.d('or_extraversion', 2)}, p ${FR.pd('p_extraversion')}). Folgt daraus, dass Extraversion die Menschen zur Meldung bringt, und was sagt es über Studien?`, `Extraversion is related to volunteering (odds ratio ${FR.e('or_extraversion', 2)}, p ${FR.pe('p_extraversion')}). Does it follow that extraversion makes people volunteer, and what does it say about studies?`),
    antworten: [
      a(P(`Ja, denn das Modell berücksichtigt Neurotizismus und Geschlecht, damit ist die Ursache geklärt.`, `Yes, because the model takes neuroticism and gender into account, so the cause is settled.`),
        P(`Das Berücksichtigen weniger Größen schließt andere Einflüsse nicht aus, etwa Alter oder die Art der Einladung. In Beobachtungsdaten bleibt es bei einem Zusammenhang.`, `Taking a few variables into account does not rule out other influences, for instance age or the kind of invitation. In observational data it remains an association.`)),
      a(P(`Zusammenhang, Ursache nicht belegt; Meldende sind zudem eine ausgewählte Gruppe.`, `An association, cause not established; volunteers are also a selected group.`),
        P(`Die Daten sind Beobachtungen. Dass sich Meldende von Nichtmeldenden unterscheiden, heißt: Studien mit Freiwilligen beschreiben vielleicht nur diese Gruppe (Selektion).`, `The data are observations. That volunteers differ from non-volunteers means: studies with volunteers may describe only this group (selection).`), true),
      a(P(`Nein, ein Odds Ratio von ${FR.d('or_extraversion', 2)} ist so klein, dass es keinen Zusammenhang gibt.`, `No, an odds ratio of ${FR.e('or_extraversion', 2)} is so small that there is no association.`),
        P(`Auch ein kleines Odds Ratio kann einen echten Zusammenhang zeigen; es wird signifikant (p ${FR.pd('p_extraversion')}). Ob er bedeutsam ist, zeigt die Größe, etwa je 5 Punkte ${FR.d('or_extraversion_5_punkte', 2)}.`, `Even a small odds ratio can show a real association; it is significant (p ${FR.pe('p_extraversion')}). Whether it is meaningful is shown by the size, for instance per 5 points ${FR.e('or_extraversion_5_punkte', 2)}.`)),
      a(P(`Nein, denn eine Ursache lässt sich nur mit einem p unter 0,001 belegen, und das liegt hier vor.`, `No, because a cause can only be shown with a p below 0.001, and that applies here.`),
        P(`Ursachen belegt man über das Design, etwa die Zufallszuteilung, nicht über die Höhe von p. Auch ein sehr kleines p zeigt einen Zusammenhang, keine Ursache.`, `Causes are shown through the design, for instance random assignment, not through the size of p. Even a very small p shows an association, not a cause.`))
    ],
    hilfe: ['zusammenhang-ursache', 'odds-ratio'], belege: ['Cowles und Davis 1987', SOLL]
  },

  // ---------------------------------------------------------------- Persönlichkeit
  {
    id: 'psy2-bf-kmo', thema: THEMA, fall: 'psy2-bf',
    stamm: P(`Eignen sich die 25 Aussagen für eine Faktorenanalyse? Das Maß von Kaiser, Meyer und Olkin (KMO) beträgt ${BF.d('kmo_gesamt', 2)}. Was sagt es?`, `Are the 25 statements suited to a factor analysis? The measure of Kaiser, Meyer and Olkin (KMO) is ${BF.e('kmo_gesamt', 2)}. What does it say?`),
    antworten: [
      a(P(`Die Fragen haben genug gemeinsame Varianz für eine Faktorenanalyse; ein Wert von ${BF.d('kmo_gesamt', 2)} gilt als gut.`, `The questions share enough variance for a factor analysis; a value of ${BF.e('kmo_gesamt', 2)} counts as good.`),
        P(`Das KMO vergleicht die Korrelationen der Fragen mit ihren partiellen Korrelationen. Werte ab etwa 0,8 gelten als gut; die Zahl der Faktoren sagt es nicht.`, `The KMO compares the correlations of the questions with their partial correlations. Values from about 0.8 count as good; it does not give the number of factors.`), true),
      a(P(`Die Faktoren erklären zusammen ${BF.td('kmo_gesamt', 0)} Prozent der Varianz der 25 Fragen.`, `The factors together explain ${BF.te('kmo_gesamt', 0)} percent of the variance of the 25 questions.`),
        P(`Das KMO ist kein Anteil erklärter Varianz. Wie viel Varianz die Faktoren erklären, zeigt die Auswertung der Faktoren, nach der Rechnung.`, `The KMO is not a share of explained variance. How much variance the factors explain is shown in the evaluation of the factors, after the calculation.`)),
      a(P(`Bei ${BF.td('kmo_gesamt', 0)} Prozent der Personen sind die Fragen verlässlich beantwortet.`, `For ${BF.te('kmo_gesamt', 0)} percent of the people the questions are answered dependably.`),
        P(`Das KMO sagt nichts über Personen. Es beschreibt die Korrelationsmatrix der Fragen, nicht das Antwortverhalten der Befragten.`, `The KMO says nothing about people. It describes the correlation matrix of the questions, not the response behaviour of the respondents.`)),
      a(P(`Mit ${BF.d('kmo_gesamt', 2)} zeigt das KMO, dass es genau fünf Faktoren gibt, die zu den fünf Persönlichkeitsmerkmalen passen.`, `With ${BF.e('kmo_gesamt', 2)} the KMO shows that there are exactly five factors that fit the five personality traits.`),
        P(`Die Zahl der Faktoren bestimmt man mit eigenen Kriterien, etwa Eigenwertverlauf oder Parallelanalyse. Das KMO prüft nur, ob sich die Daten für das Verfahren eignen.`, `The number of factors is determined with criteria of their own, for instance eigenvalue pattern or parallel analysis. The KMO only checks whether the data suit the method.`))
    ],
    hilfe: ['explorative-faktorenanalyse', 'bartlett-test'], belege: ['Hilfe:explorative-faktorenanalyse', SOLL]
  },
  {
    id: 'psy2-bf-umpolen', thema: THEMA, fall: 'psy2-bf',
    stamm: P(`Die Skala Verträglichkeit hat vor dem Umpolen Alpha = ${BF.d('alpha_roh_v', 2)}, nach dem Umpolen der umgekehrt formulierten Aussage Alpha = ${BF.d('alpha_v', 2)}. Warum ändert sich der Wert so stark?`, `The agreeableness scale has alpha = ${BF.e('alpha_roh_v', 2)} before reversing and alpha = ${BF.e('alpha_v', 2)} after reversing the reverse-worded statement. Why does the value change so much?`),
    antworten: [
      a(P(`Eine Aussage ist umgekehrt formuliert; ungepolt steht sie gegen die anderen Fragen und senkt die Konsistenz.`, `One statement is reverse worded; unreversed it stands against the other questions and lowers consistency.`),
        P(`Alpha beruht auf den Korrelationen der Fragen. Eine umgekehrte Frage korreliert negativ mit den anderen und zieht die Summe in die Gegenrichtung.`, `Alpha rests on the correlations of the questions. A reversed question correlates negatively with the others and pulls the sum in the opposite direction.`), true),
      a(P(`Das Umpolen fügt Informationen hinzu und macht die Skala dadurch besser messbar.`, `Reversing adds information and thereby makes the scale better measurable.`),
        P(`Das Umpolen ändert nur die Richtung der Zahlen, keine Information. Das Alpha steigt, weil die Skala zuvor falsch zusammengesetzt war.`, `Reversing only changes the direction of the numbers, not any information. Alpha rises because the scale had been put together wrongly before.`)),
      a(P(`Alpha hängt nicht von der Richtung der Fragen ab; der Unterschied zeigt nur, dass sich die Stichprobe geändert hat.`, `Alpha does not depend on the direction of the questions; the difference only shows that the sample has changed.`),
        P(`Die Stichprobe ist gleich, ${BF.d('n_v', 0)} Personen. Alpha hängt sehr wohl von der Richtung ab, denn es nutzt die Vorzeichen der Korrelationen zwischen den Fragen.`, `The sample is the same, ${BF.e('n_v', 0)} people. Alpha does depend on the direction, because it uses the signs of the correlations between the questions.`)),
      a(P(`Ein Alpha von ${BF.d('alpha_roh_v', 2)} zeigt, dass die Skala unbrauchbar ist, das Umpolen kaschiert dies nur.`, `An alpha of ${BF.e('alpha_roh_v', 2)} shows that the scale is unusable, reversing merely masks this.`),
        P(`Das Alpha ohne Umpolen misst die Skala so, wie sie nicht gedacht ist. Der Wert nach dem Umpolen ist der gültige; er liegt mit ${BF.d('alpha_v', 2)} im brauchbaren Bereich.`, `Alpha without reversing measures the scale in the way it is not meant. The value after reversing is the valid one; at ${BF.e('alpha_v', 2)} it lies in the usable range.`))
    ],
    hilfe: ['umpolen', 'reliabilitaet'], belege: ['Hilfe:umpolen', SOLL]
  },
  {
    id: 'psy2-bf-negativ', thema: THEMA, fall: 'psy2-bf',
    stamm: P(`Für Offenheit ergibt sich vor dem Umpolen ein negatives Alpha von ${BF.d('alpha_roh_o', 2)}, nach dem Umpolen ${BF.d('alpha_o', 2)}. Wie ist ein negatives Alpha zu deuten?`, `For openness a negative alpha of ${BF.e('alpha_roh_o', 2)} results before reversing, ${BF.e('alpha_o', 2)} after reversing. How is a negative alpha to be interpreted?`),
    antworten: [
      a(P(`Die Skala misst das Gegenteil dessen, was sie soll, und ist darum als negatives Merkmal brauchbar.`, `The scale measures the opposite of what it should and is therefore usable as a negative trait.`),
        P(`Ein negatives Alpha zeigt keine Gegenrichtung der Skala. Es entsteht, wenn mittlere Korrelationen zwischen den Fragen negativ sind, meist durch nicht umgepolte Aussagen.`, `A negative alpha shows no opposite direction of the scale. It arises when mean correlations between the questions are negative, usually through non-reversed statements.`)),
      a(P(`Ein Warnzeichen für falsch gepolte Fragen; nach dem Umpolen steigt Alpha auf ${BF.d('alpha_o', 2)}.`, `A warning sign of wrongly keyed questions; after reversing alpha rises to ${BF.e('alpha_o', 2)}.`),
        P(`Alpha kann negativ werden, wenn die Fragen im Mittel negativ miteinander zusammenhängen. Vor jeder Skalenbildung gehört darum die Prüfung der Polung.`, `Alpha can become negative if the questions are on average negatively related to each other. Before any scale construction the check of the keying therefore belongs.`), true),
      a(P(`Das Programm hat sich verrechnet, Alpha liegt per Definition zwischen 0 und 1.`, `The program made a calculation error, alpha lies between 0 and 1 by definition.`),
        P(`Alpha ist nicht auf 0 bis 1 beschränkt. Es kann negativ werden, wenn die Fragen untereinander negativ korrelieren; das ist ein Befund, kein Rechenfehler.`, `Alpha is not limited to 0 to 1. It can become negative if the questions correlate negatively with one another; that is a finding, not a calculation error.`)),
      a(P(`Die Offenheit ist bei den Befragten sehr gering ausgeprägt, darum fällt Alpha negativ aus.`, `Openness is very weakly pronounced in the respondents, which is why alpha turns out negative.`),
        P(`Alpha beschreibt Zusammenhänge zwischen Fragen, nicht die Höhe der Werte. Auch bei niedrigen Mittelwerten ist ein positives Alpha möglich.`, `Alpha describes relationships between questions, not the level of the values. A positive alpha is possible even with low means.`))
    ],
    hilfe: ['umpolen', 'trennschaerfe'], belege: ['Hilfe:umpolen', SOLL]
  },
  {
    id: 'psy2-bf-omega', thema: THEMA, fall: 'psy2-bf',
    stamm: P(`Für Neurotizismus sind Alpha = ${BF.d('alpha_n', 2)} und Omega = ${BF.d('omega_n', 2)} nahezu gleich. Für Offenheit liegt Omega (${BF.d('omega_o', 2)}) etwas über Alpha (${BF.d('alpha_o', 2)}). Was sagt das?`, `For neuroticism alpha = ${BF.e('alpha_n', 2)} and omega = ${BF.e('omega_n', 2)} are almost equal. For openness omega (${BF.e('omega_o', 2)}) lies somewhat above alpha (${BF.e('alpha_o', 2)}). What does this say?`),
    antworten: [
      a(P(`Bei Neurotizismus sind die Ladungen ähnlich hoch, darum liegen Alpha und Omega fast gleich.`, `For neuroticism the loadings are similar in size, so alpha and omega are almost equal.`),
        P(`Alpha setzt gleiche Ladungen der Fragen voraus. Sind sie ähnlich, treffen sich Alpha und Omega; streuen sie, unterschätzt Alpha die Zuverlässigkeit.`, `Alpha assumes equal loadings of the questions. If they are similar, alpha and omega meet; if they vary, alpha underestimates reliability.`), true),
      a(P(`Ein Omega von ${BF.d('omega_n', 2)} zeigt, dass Neurotizismus eindimensional ist.`, `An omega of ${BF.e('omega_n', 2)} shows that neuroticism is unidimensional.`),
        P(`Auch Omega beweist keine Eindimensionalität. Das Maß setzt ein Faktormodell voraus und sagt, wie zuverlässig die Summe ist, nicht ob nur ein Faktor dahintersteckt.`, `Omega too proves no unidimensionality. The measure presupposes a factor model and says how dependable the sum is, not whether only one factor is behind it.`)),
      a(P(`Omega ist grundsätzlich größer als Alpha, darum ist der Befund bei Neurotizismus ein Rechenfehler.`, `Omega is larger than alpha as a matter of principle, so the finding for neuroticism is a calculation error.`),
        P(`Omega ist nicht größer als Alpha. Bei Neurotizismus liegen die Werte ${BF.d('alpha_n', 2)} und ${BF.d('omega_n', 2)} praktisch gleichauf, und Omega kann sogar knapp darunter liegen.`, `Omega is not larger than alpha. For neuroticism the values ${BF.e('alpha_n', 2)} and ${BF.e('omega_n', 2)} are practically level, and omega can even lie just below.`)),
      a(P(`Alpha ist das genauere Maß, denn es braucht kein Faktormodell und ist darum für alle Skalen vorzuziehen.`, `Alpha is the more precise measure, because it needs no factor model and is therefore preferable for all scales.`),
        P(`Dass Alpha kein Modell braucht, ist kein Vorteil in der Genauigkeit. Bei ungleichen Ladungen liegt es zu niedrig; Omega nutzt die Ladungen und ist dann genauer.`, `That alpha needs no model is no advantage in precision. With unequal loadings it lies too low; omega uses the loadings and is then more precise.`))
    ],
    hilfe: ['omega', 'reliabilitaet'], belege: ['Sijtsma 2009', SOLL]
  },
  {
    id: 'psy2-bf-fehlend', thema: THEMA, fall: 'psy2-bf',
    stamm: P(`In den 25 Fragen fehlen ${BF.d('fehlend_fragen_gesamt', 0)} Antworten, bei der Bildung fehlen ${BF.d('fehlend_bildung', 0)} Angaben; ${BF.d('personen_mit_fehlend', 0)} Personen haben Lücken. Wie geht man damit um?`, `In the 25 questions ${BF.e('fehlend_fragen_gesamt', 0)} answers are missing, for education ${BF.e('fehlend_bildung', 0)} entries are missing; ${BF.e('personen_mit_fehlend', 0)} people have gaps. How does one deal with this?`),
    antworten: [
      a(P(`In den Fragen fehlen höchstens ${BF.d('fehlend_fragen_max_anteil_prozent', 1)} Prozent, bei der Bildung ${BF.d('fehlend_max_spalte_alle_anteil_prozent', 1)} Prozent; die Lücken sind zu prüfen.`, `In the questions at most ${BF.e('fehlend_fragen_max_anteil_prozent', 1)} percent are missing, in education ${BF.e('fehlend_max_spalte_alle_anteil_prozent', 1)}; the gaps are to be checked.`),
        P(`Wenige Lücken sind selten ein Problem, aber auch sie können Muster haben. Erst das Prüfen des Fehlens (etwa mit Little-Test) zeigt, was passt.`, `A few gaps are rarely a problem, but even they can have patterns. Only checking the missingness (for instance with Little test) shows what fits.`), true),
      a(P(`Die Lücken sind zufällig entstanden; man darf sie ohne weitere Prüfung übergehen.`, `The gaps arose at random; one may skip them without further checking.`),
        P(`Ob Lücken zufällig sind, ist eine Annahme, die sich prüfen lässt, nicht ein Normalfall. Fehlen sie in Abhängigkeit von Merkmalen, verzerrt ein Ignorieren die Ergebnisse.`, `Whether gaps are random is an assumption that can be checked, not a normal case. If they are missing depending on characteristics, ignoring them biases the results.`)),
      a(P(`Die ${BF.d('personen_mit_fehlend', 0)} Personen mit Lücken müssen aus der Auswertung entfallen, sonst ist keine Faktorenanalyse möglich.`, `The ${BF.e('personen_mit_fehlend', 0)} people with gaps must be dropped from the evaluation, otherwise no factor analysis is possible.`),
        P(`Ein Ausschluss ist eine Möglichkeit, bei ${BF.d('personen_vollstaendig', 0)} vollständigen Personen auch gangbar. Alternativ lassen sich Lücken paarweise behandeln oder auffüllen; eine Pflicht gibt es nicht.`, `Exclusion is one possibility and also workable with ${BF.e('personen_vollstaendig', 0)} complete people. Alternatively gaps can be handled pairwise or filled; there is no obligation.`)),
      a(P(`Der Anteil fehlender Werte ist in jeder Spalte gleich hoch, darum ist jede Spalte unauffällig.`, `The share of missing values is equally high in every column, so every column is unremarkable.`),
        P(`Die Anteile unterscheiden sich stark: Bei den Fragen höchstens ${BF.d('fehlend_fragen_max_anteil_prozent', 1)} Prozent, bei der Bildung ${BF.d('fehlend_max_spalte_alle_anteil_prozent', 1)} Prozent. Die Spalte zur Bildung fällt auf.`, `The shares differ strongly: at most ${BF.e('fehlend_fragen_max_anteil_prozent', 1)} percent for the questions, ${BF.e('fehlend_max_spalte_alle_anteil_prozent', 1)} percent for education. The education column stands out.`))
    ],
    hilfe: ['fehlende-werte-little-imputation', 'explorative-faktorenanalyse'], belege: ['Hilfe:fehlende-werte-little-imputation', SOLL]
  },
  {
    id: 'psy2-bf-trenn', thema: THEMA, fall: 'psy2-bf',
    stamm: P(`Die Skala Offenheit hat Alpha = ${BF.d('alpha_o', 2)}, die Trennschärfen reichen von ${BF.d('trennschaerfe_min_o', 2)} bis ${BF.d('trennschaerfe_max_o', 2)}. Wie ist das einzuordnen?`, `The openness scale has alpha = ${BF.e('alpha_o', 2)}, the item-total correlations range from ${BF.e('trennschaerfe_min_o', 2)} to ${BF.e('trennschaerfe_max_o', 2)}. How is this to be classified?`),
    antworten: [
      a(P(`Alpha ${BF.d('alpha_o', 2)} ist nur mäßig; die Frage mit der geringsten Trennschärfe passt am wenigsten.`, `Alpha ${BF.e('alpha_o', 2)} is only moderate; the question with the lowest item-total correlation fits least.`),
        P(`Bei nur fünf Fragen ist ein Alpha um 0,6 ein mäßiger Wert. Schwache Trennschärfen sind ein Hinweis auf Fragen, die nicht gut zum gemeinsamen Merkmal passen.`, `With only five questions an alpha around 0.6 is a moderate value. Weak item-total correlations are a hint of questions that do not fit the common trait well.`), true),
      a(P(`Ein Alpha unter 0,70 macht jede Skala für Forschung unbrauchbar.`, `An alpha below 0.70 makes every scale unusable for research.`),
        P(`Die Grenze von 0,70 ist eine Faustregel. Für Gruppenvergleiche reichen oft niedrigere Werte, für Einzelentscheidungen sind höhere nötig; es kommt auf den Zweck an.`, `The limit of 0.70 is a rule of thumb. For group comparisons lower values often suffice, for individual decisions higher ones are needed; the purpose matters.`)),
      a(P(`Alle Fragen mit Trennschärfe unter 0,30 sind zu streichen, dann ist die Skala gut.`, `All questions with item-total correlation below 0.30 are to be deleted, then the scale is good.`),
        P(`Eine feste Streichregel gibt es nicht. Wer mechanisch streicht, verengt das Merkmal; der Inhalt der Frage und der Zugewinn an Alpha entscheiden.`, `There is no fixed deletion rule. Whoever deletes mechanically narrows the trait; the content of the question and the gain in alpha decide.`)),
      a(P(`Die Trennschärfen zeigen, dass die Skala mehrere Dimensionen hat, denn sie sind verschieden groß.`, `The item-total correlations show that the scale has several dimensions, because they differ in size.`),
        P(`Unterschiedliche Trennschärfen sind normal. Mehrere Dimensionen zeigt erst eine Faktorenanalyse, nicht das Gefälle von ${BF.d('trennschaerfe_min_o', 2)} bis ${BF.d('trennschaerfe_max_o', 2)}.`, `Different item-total correlations are normal. Several dimensions are shown only by a factor analysis, not by the range from ${BF.e('trennschaerfe_min_o', 2)} to ${BF.e('trennschaerfe_max_o', 2)}.`))
    ],
    hilfe: ['trennschaerfe', 'reliabilitaet'], belege: ['Sijtsma 2009', SOLL]
  },

  // ---------------------------------------------------------------- Wörter und Personen
  {
    id: 'psy2-wo-icc', thema: THEMA, fall: 'psy2-wo',
    stamm: P(`Wie ähnlich sind sich die Reaktionszeiten derselben Person? Das Nullmodell ergibt eine Intraklassenkorrelation (ICC) von ${WO.d('icc', 2)}. Was heißt das?`, `How similar are the reaction times of the same person? The null model gives an intraclass correlation (ICC) of ${WO.e('icc', 2)}. What does this mean?`),
    antworten: [
      a(P(`Etwa ${WO.td('icc', 0)} Prozent der Streuung liegen zwischen Personen; Zeilen einer Person sind abhängig.`, `About ${WO.te('icc', 0)} percent of the spread lies between people; rows of one person are dependent.`),
        P(`Die ICC ist der Anteil der Gesamtstreuung, der auf Unterschiede zwischen den Personen zurückgeht. Ein Wert deutlich über 0 heißt: Wer langsam ist, ist es in allen Bedingungen eher.`, `The ICC is the share of the total spread that goes back to differences between people. A value clearly above 0 means: whoever is slow tends to be slow in all conditions.`), true),
      a(P(`Die Reaktionszeiten einer Person unterscheiden sich kaum von denen anderer Personen.`, `The reaction times of one person hardly differ from those of other people.`),
        P(`Das wäre eine niedrige ICC. Bei ${WO.d('icc', 2)} unterscheiden sich die Personen merklich, und Messungen derselben Person hängen zusammen.`, `That would be a low ICC. At ${WO.e('icc', 2)} the people differ noticeably, and measurements of the same person are related.`)),
      a(P(`${WO.td('icc', 0)} Prozent der Personen reagieren schneller als der Durchschnitt.`, `${WO.te('icc', 0)} percent of the people react faster than average.`),
        P(`Die ICC ist kein Anteil von Personen, sondern ein Anteil der Streuung. Über die Zahl schneller Personen sagt sie nichts.`, `The ICC is not a share of people but a share of the spread. It says nothing about the number of fast people.`)),
      a(P(`Jede Zeile ist eine eigene Messung; ein gewöhnlicher t-Test mit allen Zeilen als Fällen genügt.`, `Each row is a measurement of its own; an ordinary t test with all rows as cases suffices.`),
        P(`Die Zeilen einer Person hängen zusammen. Wer sie wie lauter unabhängige Fälle behandelt, täuscht eine größere Stichprobe vor (Pseudoreplikation) und erhält zu kleine p-Werte.`, `The rows of one person are related. Whoever treats them as nothing but independent cases pretends a larger sample (pseudoreplication) and obtains p values that are too small.`))
    ],
    hilfe: ['icc-mehrebenen', 'mehrebenen'], belege: ['Hilfe:icc-mehrebenen', SOLL]
  },
  {
    id: 'psy2-wo-aufgabe', thema: THEMA, fall: 'psy2-wo',
    stamm: P(`Im Modell steht für „Vorlesen gegen Entscheiden“ der Wert ${WO.d('fest_aufgabe_vorlesen', 0)} Millisekunden (t = ${WO.d('t_aufgabe_vorlesen', 2)}, p ${WO.pd('p_aufgabe_vorlesen')}). Was bedeutet er?`, `In the model the value ${WO.e('fest_aufgabe_vorlesen', 0)} milliseconds stands for "reading aloud against deciding" (t = ${WO.e('t_aufgabe_vorlesen', 2)}, p ${WO.pe('p_aufgabe_vorlesen')}). What does it mean?`),
    antworten: [
      a(P(`Wer vorliest, braucht im Mittel ${WO.da('fest_aufgabe_vorlesen', 0)} Millisekunden länger als wer entscheidet.`, `Whoever reads aloud needs on average ${WO.ea('fest_aufgabe_vorlesen', 0)} milliseconds longer than whoever decides.`),
        P(`Das negative Vorzeichen zeigt, dass die Zeit beim Vorlesen niedriger ist als beim Entscheiden, der Vergleichsgruppe. Die Richtung der Rechnung bestimmt das Vorzeichen.`, `The negative sign shows that the time for reading aloud is lower than for deciding, the reference group. The direction of the calculation determines the sign.`)),
      a(P(`Wer vorliest, reagiert im Mittel ${WO.da('fest_aufgabe_vorlesen', 0)} Millisekunden schneller als wer entscheidet.`, `Whoever reads aloud reacts on average ${WO.ea('fest_aufgabe_vorlesen', 0)} milliseconds faster than whoever decides.`),
        P(`Der feste Effekt ist die mittlere Differenz zur Vergleichsgruppe, im Mittel über alle Personen. Der Standardfehler von ${WO.d('se_aufgabe_vorlesen', 1)} gibt an, wie genau sie geschätzt ist.`, `The fixed effect is the mean difference from the reference group, averaged over all people. The standard error of ${WO.e('se_aufgabe_vorlesen', 1)} states how precisely it is estimated.`), true),
      a(P(`Vorlesen ist ${WO.da('fest_aufgabe_vorlesen', 0)} Prozent schneller als Entscheiden.`, `Reading aloud is ${WO.ea('fest_aufgabe_vorlesen', 0)} percent faster than deciding.`),
        P(`Die Einheit des Effekts sind Millisekunden, keine Prozent. Prozent wären ein Verhältnis zur Vergleichszeit von etwa ${WO.d('fest_achsenabschnitt', 0)} Millisekunden.`, `The unit of the effect is milliseconds, not percent. Percent would be a ratio to the reference time of about ${WO.e('fest_achsenabschnitt', 0)} milliseconds.`)),
      a(P(`Der Wert zeigt, wie stark sich die Personen innerhalb der Aufgabe voneinander unterscheiden.`, `The value shows how strongly the people within the task differ from one another.`),
        P(`Die Unterschiede zwischen Personen stehen in der Streuung der zufälligen Effekte, nicht in einem festen Effekt. Der feste Effekt beschreibt den Mittelwertunterschied der Aufgaben.`, `The differences between people are in the spread of the random effects, not in a fixed effect. The fixed effect describes the mean difference of the tasks.`))
    ],
    hilfe: ['mehrebenen', 'koeffizient-b'], belege: ['Hilfe:mehrebenen', SOLL]
  },
  {
    id: 'psy2-wo-wort', thema: THEMA, fall: 'psy2-wo',
    stamm: P(`Erkennen Menschen Wörter schneller als Nichtwörter? Im Modell steht für „Wort gegen Nichtwort“ ${WO.d('fest_wortart_wort', 0)} Millisekunden (Standardfehler ${WO.d('se_wortart_wort', 1)}, t = ${WO.d('t_wortart_wort', 2)}, p ${WO.pd('p_wortart_wort')}). Wie ist das zu lesen?`, `Do people recognise words faster than nonwords? In the model ${WO.e('fest_wortart_wort', 0)} milliseconds stand for "word against nonword" (standard error ${WO.e('se_wortart_wort', 1)}, t = ${WO.e('t_wortart_wort', 2)}, p ${WO.pe('p_wortart_wort')}). How is this to be read?`),
    antworten: [
      a(P(`Wörter werden im Mittel um ${WO.da('fest_wortart_wort', 0)} Millisekunden schneller erkannt, innerhalb derselben Person verglichen.`, `Words are recognised on average ${WO.ea('fest_wortart_wort', 0)} milliseconds faster, compared within the same person.`),
        P(`Jede Person erlebt Wörter und Nichtwörter, der Vergleich geschieht innerhalb der Person. Das macht ihn genau: Der Standardfehler ist mit ${WO.d('se_wortart_wort', 1)} klein. Das gilt, solange die Reize als feststehend zählen.`, `Each person experiences words and nonwords, the comparison happens within the person. That makes it precise: the standard error is small at ${WO.e('se_wortart_wort', 1)}. This holds as long as the stimuli count as fixed.`), true),
      a(P(`Ein t von ${WO.d('t_wortart_wort', 2)} zeigt, dass der Unterschied praktisch bedeutsam und für die Praxis wichtig ist.`, `A t of ${WO.e('t_wortart_wort', 2)} shows that the difference is practically important and matters a lot for practice.`),
        P(`Die Höhe von t sagt, wie genau der Effekt geschätzt ist, nicht wie bedeutsam er ist. Die Bedeutung zeigt die Größe in Millisekunden im Vergleich zur Streuung.`, `The size of t says how precisely the effect is estimated, not how important it is. The importance is shown by the size in milliseconds compared with the spread.`)),
      a(P(`Nichtwörter werden schneller erkannt, denn der Wert ist negativ und die Differenz geht in diese Richtung.`, `Nonwords are recognised faster, because the value is negative and the difference goes in this direction.`),
        P(`Ein negativer Wert bei „Wort gegen Nichtwort“ heißt: Die Zeit für Wörter ist kürzer, Wörter sind schneller. Das Vorzeichen folgt der Vergleichsrichtung.`, `A negative value for "word against nonword" means: the time for words is shorter, words are faster. The sign follows the direction of comparison.`)),
      a(P(`Der Unterschied gilt nur für die 20 Personen, die laut vorlasen, nicht für die übrigen Personen im Versuch.`, `The difference applies only to the 20 people who read aloud, not to the remaining people in the experiment.`),
        P(`Das Modell schätzt den Unterschied zwischen Wort und Nichtwort über beide Aufgaben hinweg. Eine Beschränkung auf eine Aufgabe zeigt die Tabelle nicht.`, `The model estimates the difference between word and nonword across both tasks. The table shows no restriction to one task.`))
    ],
    hilfe: ['mehrebenen', 'effektstaerke'], belege: ['Hilfe:mehrebenen', SOLL]
  },
  {
    id: 'psy2-wo-haeufig', thema: THEMA, fall: 'psy2-wo',
    stamm: P(`Für „Selten gegen Häufig“ steht ${WO.d('fest_haeufigkeit_selten', 0)} Millisekunden (t = ${WO.d('t_haeufigkeit_selten', 2)}, p ${WO.pd('p_haeufigkeit_selten')}). Was darf man daraus schließen?`, `For "rare against frequent" ${WO.e('fest_haeufigkeit_selten', 0)} milliseconds stand (t = ${WO.e('t_haeufigkeit_selten', 2)}, p ${WO.pe('p_haeufigkeit_selten')}). What may be concluded from this?`),
    antworten: [
      a(P(`Mit ${WO.td('p_haeufigkeit_selten', 0)} Prozent Wahrscheinlichkeit sind seltene und häufige Reize in Wahrheit gleich schnell.`, `With ${WO.te('p_haeufigkeit_selten', 0)} percent probability rare and frequent stimuli are in truth equally fast.`),
        P(`Der p-Wert ist nicht die Wahrscheinlichkeit der Nullhypothese gleicher Zeiten. Er sagt, wie gut die Daten zu gleichen Zeiten passen, nicht wie wahrscheinlich diese Annahme ist.`, `The p value is not the probability of the null hypothesis of equal times. It says how well the data fit equal times, not how probable this assumption is.`)),
      a(P(`${WO.d('fest_haeufigkeit_selten', 0)} Millisekunden sind vom Zufall nicht zu trennen; Gleichheit ist damit nicht belegt.`, `${WO.e('fest_haeufigkeit_selten', 0)} milliseconds cannot be told from chance; equality is not shown by that.`),
        P(`Mit p ${WO.pd('p_haeufigkeit_selten')} sind die Daten mit gleichen Zeiten gut vereinbar. Ein Beleg für Gleichheit wäre ein enges Intervall um 0 oder ein Äquivalenztest.`, `With p ${WO.pe('p_haeufigkeit_selten')} the data are well compatible with equal times. Proof of equality would be a narrow interval around 0 or an equivalence test.`), true),
      a(P(`Seltene Reize sind nachweislich schneller, weil der Wert negativ ist.`, `Rare stimuli are demonstrably faster, because the value is negative.`),
        P(`Ein kleiner Wert mit großem p zeigt keine gesicherte Richtung. Der Standardfehler von ${WO.d('se_haeufigkeit_selten', 1)} ist größer als der Wert selbst.`, `A small value with a large p shows no established direction. The standard error of ${WO.e('se_haeufigkeit_selten', 1)} is larger than the value itself.`)),
      a(P(`Die Häufigkeit eines Reizes spielt bei der Worterkennung generell keine Rolle.`, `The frequency of a stimulus plays no role in word recognition in general.`),
        P(`Das Ergebnis betrifft diese Daten mit diesem Aufbau. Aus einem nicht deutlichen Befund folgt keine Aussage für die Worterkennung insgesamt; ein Häufigkeitseffekt ist in anderer Forschung gut belegt.`, `The result concerns these data with this design. A not clear finding implies no statement about word recognition overall; a frequency effect is well documented in other research.`))
    ],
    hilfe: ['p-wert', 'mehrebenen'], belege: ['Haller und Krauss 2002', SOLL]
  },
  {
    id: 'psy2-wo-streuung', thema: THEMA, fall: 'psy2-wo',
    stamm: P(`Im Nullmodell liegt die Streuung zwischen den Personen bei ${WO.d('sd_zwischen_personen', 0)} und innerhalb bei ${WO.d('sd_innerhalb_person', 0)} Millisekunden, im Modell mit Aufgabe, Wortart und Häufigkeit bei ${WO.d('sd_person_im_modell', 0)} und ${WO.d('sd_rest_im_modell', 0)}. Was zeigt der Vergleich?`, `In the null model the spread between people is ${WO.e('sd_zwischen_personen', 0)} and within people ${WO.e('sd_innerhalb_person', 0)} milliseconds, in the model with task, word type and frequency ${WO.e('sd_person_im_modell', 0)} and ${WO.e('sd_rest_im_modell', 0)}. What does the comparison show?`),
    antworten: [
      a(P(`Beide Streuungen sind kleiner; die festen Effekte erklären einen Teil der Unterschiede.`, `Both spreads are smaller; the fixed effects explain part of the differences.`),
        P(`Die Aufgabe unterscheidet Personen, Wortart und Häufigkeit unterscheiden Versuche innerhalb einer Person. Was die Effekte erklären, steht nicht mehr in den Restgrößen.`, `The task distinguishes people, word type and frequency distinguish trials within a person. What the effects explain is no longer in the residual quantities.`), true),
      a(P(`Die Streuung zwischen den Personen ist verschwunden, alle Personen reagieren gleich schnell.`, `The spread between people has disappeared, all people react equally fast.`),
        P(`Die Streuung zwischen den Personen ist mit ${WO.d('sd_person_im_modell', 0)} Millisekunden weiter groß. Sie ist nur etwas kleiner als im Nullmodell.`, `The spread between people is still large at ${WO.e('sd_person_im_modell', 0)} milliseconds. It is only somewhat smaller than in the null model.`)),
      a(P(`Eine kleinere Streuung heißt ein schlechteres Modell, denn es lässt weniger Unterschiede zu.`, `A smaller spread means a worse model, because it allows fewer differences.`),
        P(`Im Mehrebenenmodell zeigt eine kleinere Reststreuung, dass die festen Effekte etwas erklären. Das Modell wird besser, wenn Rest und Personenstreuung sinken.`, `In the multilevel model a smaller residual spread shows that the fixed effects explain something. The model gets better when the residual and the person spread fall.`)),
      a(P(`Die Zahlen sind Mittelwerte der Reaktionszeiten und zeigen, wie schnell die Personen reagieren.`, `The numbers are means of the reaction times and show how fast the people react.`),
        P(`Es sind Standardabweichungen, also Maße der Streuung. Die Schnelligkeit zeigen die Mittelwerte, etwa ${WO.d('mittel_gesamt', 0)} Millisekunden insgesamt.`, `They are standard deviations, that is measures of spread. The speed is shown by the means, about ${WO.e('mittel_gesamt', 0)} milliseconds overall.`))
    ],
    hilfe: ['mehrebenen', 'icc-mehrebenen'], belege: ['Hilfe:mehrebenen', SOLL]
  },
  {
    id: 'psy2-wo-unabhaengig', thema: THEMA, fall: 'psy2-wo',
    stamm: P(`Die mittlere Reaktionszeit beträgt bei Wörtern ${WO.d('mittel_wort', 0)} und bei Nichtwörtern ${WO.d('mittel_nichtwort', 0)} Millisekunden. Was spricht gegen einen t-Test für unabhängige Gruppen mit allen Zeilen?`, `The mean reaction time is ${WO.e('mittel_wort', 0)} milliseconds for words and ${WO.e('mittel_nichtwort', 0)} for nonwords. What speaks against a t test for independent groups with all rows?`),
    antworten: [
      a(P(`Jede Person liefert viele Zeilen; sie sind nicht unabhängig, das Mehrebenenmodell berücksichtigt das.`, `Each person gives many rows; they are dependent, which the multilevel model respects.`),
        P(`Der t-Test für unabhängige Gruppen setzt voraus, dass jede Zeile eine eigene Person ist. Bei wiederholten Messungen wird p zu klein.`, `The t test for independent groups assumes that each row is a person of its own. With repeated measurements p becomes too small.`), true),
      a(P(`Ein t-Test braucht mehr Zeilen, sonst ist die Teststärke zu gering.`, `A t test needs more rows, otherwise the power is too low.`),
        P(`Die Zahl der Zeilen ist nicht das Problem. Das Problem ist, dass die Zeilen derselben Person zusammenhängen und nicht als unabhängige Fälle zählen.`, `The number of rows is not the problem. The problem is that rows of the same person are related and do not count as independent cases.`)),
      a(P(`Der Unterschied von ${WO.d('mittel_wort', 0)} gegen ${WO.d('mittel_nichtwort', 0)} Millisekunden ist für einen t-Test zu groß.`, `The difference of ${WO.e('mittel_wort', 0)} against ${WO.e('mittel_nichtwort', 0)} milliseconds is too large for a t test.`),
        P(`Ein t-Test ist für Unterschiede jeder Größe geeignet. Gegen ihn spricht hier nicht die Größe, sondern die Abhängigkeit der Messungen.`, `A t test is suitable for differences of any size. What speaks against it here is not the size but the dependence of the measurements.`)),
      a(P(`Wörter und Nichtwörter haben verschiedene Einheiten, darum lassen sich ihre Mittelwerte nicht miteinander vergleichen.`, `Words and nonwords have different units, so their means cannot be compared with each other.`),
        P(`Beide Mittelwerte sind Reaktionszeiten in Millisekunden und lassen sich vergleichen. Die Einheit ist gleich; ungleich ist nur die Art des Reizes.`, `Both means are reaction times in milliseconds and can be compared. The unit is the same; only the type of stimulus differs.`))
    ],
    hilfe: ['pseudoreplikation', 'mehrebenen'], belege: ['Hilfe:pseudoreplikation', SOLL]
  },
  {
    id: 'psy2-wo-gekreuzt-art', thema: THEMA, fall: 'psy2-wo',
    stamm: P(`Im Versuch sieht jede der 45 Personen viele Wörter und Nichtwörter, und jeder Reiz wird von vielen Personen gesehen. Wie hängen Personen und Reize zusammen, und was folgt für das Modell?`, `In the experiment each of the 45 people sees many words and nonwords, and every stimulus is seen by many people. How are people and stimuli related, and what follows for the model?`),
    antworten: [
      a(P(`Sie sind gekreuzt: Keine Gruppierung liegt in der anderen. Beide gehen als zufällige Gruppierung ins Modell ein.`, `They are crossed: neither grouping lies inside the other. Both enter the model as random groupings.`),
        P(`Jede Person kommt mit vielen Reizen vor und jeder Reiz mit vielen Personen. Das nennt man gekreuzt (Kreuzklassifikation). Anders ist es bei Kindern in Klassen: Dort gehört jedes Kind zu genau einer Klasse (geschachtelt).`, `Each person occurs with many stimuli and each stimulus with many people. This is called crossed (cross-classification). It is different for children in classes: there every child belongs to exactly one class (nested).`), true),
      a(P(`Sie sind geschachtelt, denn jede Person hat ihre eigenen Reize, die keine andere Person sieht.`, `They are nested, because each person has stimuli of their own that no other person sees.`),
        P(`Geschachtelt wäre es nur, wenn jeder Reiz bei genau einer Person vorkäme. Hier sehen viele Personen denselben Reiz; darum sind Personen und Reize gekreuzt.`, `It would be nested only if each stimulus occurred with exactly one person. Here many people see the same stimulus; so people and stimuli are crossed.`)),
      a(P(`Die Reize sind nur Bedingungen des Versuchs; als Gruppierung braucht man sie nicht.`, `The stimuli are only conditions of the experiment; one does not need them as a grouping.`),
        P(`Wortart und Häufigkeit sind feste Bedingungen. Der einzelne Reiz ist aber eine Stichprobe aus allen möglichen Reizen; wer ihn übergeht, setzt die Standardfehler zu klein an.`, `Word type and frequency are fixed conditions. The single stimulus, however, is a sample of all possible stimuli; ignoring it makes the standard errors too small.`)),
      a(P(`Gekreuzt heißt, dass Person und Reiz eine Wechselwirkung haben: Manche Personen mögen manche Reize besonders.`, `Crossed means that person and stimulus interact: some people like some stimuli especially.`),
        P(`Das verwechselt zwei Begriffe. Gekreuzt beschreibt nur, wie die Gruppierungen zusammenhängen (keine liegt in der anderen). Eine Wechselwirkung ist ein eigener Effekt und wird hier nicht geschätzt.`, `This mixes up two terms. Crossed only describes how the groupings are related (neither lies inside the other). An interaction is an effect of its own and is not estimated here.`))
    ],
    hilfe: ['frage-mehrebenen', 'mehrebenen'], belege: ['Hilfe:frage-mehrebenen', 'Baayen, Davidson und Bates 2008', SOLL]
  },
  {
    id: 'psy2-wo-gekreuzt-se', thema: THEMA, fall: 'psy2-wo',
    stamm: P(`Für „Wort gegen Nichtwort“ steht nur mit Personen als Gruppierung ein Standardfehler von ${WO.d('se_wortart_wort', 1)} bei ${WO.d('df_wortart_wort', 0)} Freiheitsgraden. Kommen die Reize als zweite, gekreuzte Gruppierung dazu, sind es ${WO.d('gk_se_wortart', 1)} und ${WO.d('gk_df_wortart', 0)}. Der Effekt selbst ändert sich kaum (${WO.da('fest_wortart_wort', 1)} gegen ${WO.da('gk_fest_wortart_wort', 1)} Millisekunden). Was zeigt das?`, `For "word against nonword" the standard error with people only as grouping is ${WO.e('se_wortart_wort', 1)} at ${WO.e('df_wortart_wort', 0)} degrees of freedom. With the stimuli added as a second, crossed grouping it is ${WO.e('gk_se_wortart', 1)} and ${WO.e('gk_df_wortart', 0)}. The effect itself hardly changes (${WO.ea('fest_wortart_wort', 1)} against ${WO.ea('gk_fest_wortart_wort', 1)} milliseconds). What does this show?`),
    antworten: [
      a(P(`Der Befund soll für Reize allgemein gelten. Personen und Reize sind beide Stichproben: Die Schätzung wird ungenauer.`, `The finding should hold for stimuli in general. People and stimuli are both samples: precision drops.`),
        P(`Mit nur Personen als Gruppierung zählen die vielen Einzelversuche wie Stichprobe, das gibt viele Freiheitsgrade und einen kleinen Standardfehler. Mit gekreuzten Reizen bestimmt vor allem die Zahl der Reize, wie sicher der Befund ist.`, `With people only as grouping the many single trials count like a sample, which gives many degrees of freedom and a small standard error. With crossed stimuli the number of stimuli mostly decides how certain the finding is.`), true),
      a(P(`Das Modell mit Reizen ist schlechter, weil der Standardfehler größer wird.`, `The model with stimuli is worse, because the standard error gets larger.`),
        P(`Ein größerer Standardfehler heißt nicht, dass das Modell schlechter ist. Das Modell ohne Reize hatte den Standardfehler zu klein angesetzt; das größere Maß ist das ehrlichere.`, `A larger standard error does not mean the model is worse. The model without stimuli made the standard error too small; the larger value is the more honest one.`)),
      a(P(`Die Reize haben den Effekt der Wortart verkleinert, deshalb ist er unsicherer.`, `The stimuli have shrunk the effect of word type, which is why it is less certain.`),
        P(`Der Effekt bleibt fast gleich (${WO.da('fest_wortart_wort', 1)} gegen ${WO.da('gk_fest_wortart_wort', 1)} Millisekunden). Unsicherer wird er, weil die Reize als Stichprobe zählen, nicht wegen einer Verkleinerung.`, `The effect stays almost the same (${WO.ea('fest_wortart_wort', 1)} against ${WO.ea('gk_fest_wortart_wort', 1)} milliseconds). It becomes less certain because the stimuli count as a sample, not because of a shrinking.`)),
      a(P(`Die Freiheitsgrade sind gefallen, weil für das zweite Modell Versuche weggelassen wurden.`, `The degrees of freedom fell because trials were left out for the second model.`),
        P(`Es wurden keine Versuche weggelassen. Die Freiheitsgrade fallen, weil jetzt die Reize die Stichprobe sind und nicht mehr die Einzelversuche. Die Zahl der Zeilen bleibt gleich, sie zählt nur anders.`, `No trials were left out. The degrees of freedom fall because the stimuli are now the sample and no longer the single trials. The number of rows stays the same, it just counts differently.`))
    ],
    hilfe: ['frage-mehrebenen', 'pseudoreplikation'], belege: ['Hilfe:frage-mehrebenen', 'Clark 1973', SOLL]
  },
  {
    id: 'psy2-wo-gekreuzt-anteil', thema: THEMA, fall: 'psy2-wo',
    stamm: P(`Im Nullmodell mit Personen und Reizen als gekreuzten Gruppierungen steht beim Anteil an der Gesamtvarianz ${WO.d('gk_icc_person', 2)} für die Personen und ${WO.d('gk_icc_reiz', 2)} für die Reize. Was heißt das?`, `In the null model with people and stimuli as crossed groupings the share of the total variance is ${WO.e('gk_icc_person', 2)} for the people and ${WO.e('gk_icc_reiz', 2)} for the stimuli. What does this mean?`),
    antworten: [
      a(P(`Rund ein Viertel der Streuung liegt zwischen den Personen, ein Zwanzigstel zwischen den Reizen, der Rest innerhalb.`, `About a quarter of the spread lies between the people, a twentieth between the stimuli, the rest within.`),
        P(`Der Anteil an der Gesamtvarianz sagt, wie viel der Gesamtstreuung auf die jeweilige Gruppierung zurückgeht: ${WO.td('gk_icc_person', 0)} Prozent auf die Personen, ${WO.td('gk_icc_reiz', 0)} Prozent auf die Reize.`, `The share of the total variance says how much of the total spread comes from each grouping: ${WO.te('gk_icc_person', 0)} percent from the people, ${WO.te('gk_icc_reiz', 0)} percent from the stimuli.`), true),
      a(P(`${WO.td('gk_icc_reiz', 0)} Prozent der Reize sind schwer zu erkennen, die übrigen Reize sind alle leicht zu erkennen.`, `${WO.te('gk_icc_reiz', 0)} percent of the stimuli are hard to recognise, the other stimuli are all easy to recognise.`),
        P(`Der Anteil sagt nichts über die Zahl schwerer Reize. Er ist ein Anteil der Streuung, nicht ein Anteil von Reizen.`, `The share says nothing about the number of hard stimuli. It is a share of the spread, not a share of stimuli.`)),
      a(P(`Die Reize spielen kaum eine Rolle, darum kann man sie im Modell einfach ganz weglassen.`, `The stimuli hardly matter, so one can simply leave them out of the model entirely.`),
        P(`Auch ein kleiner Anteil ändert die Standardfehler der Merkmale der Reize stark: Der Standardfehler der Wortart wächst von ${WO.d('se_wortart_wort', 1)} auf ${WO.d('gk_se_wortart', 1)}. Wer die Reize weglässt, macht den Befund sicherer, als er ist.`, `Even a small share changes the standard errors of the stimulus characteristics a lot: the standard error of word type grows from ${WO.e('se_wortart_wort', 1)} to ${WO.e('gk_se_wortart', 1)}. Leaving the stimuli out makes the finding look more certain than it is.`)),
      a(P(`${WO.d('gk_icc_reiz', 2)} ist ein p-Wert und liegt damit genau an der Grenze zur Signifikanz, der Effekt ist also knapp.`, `${WO.e('gk_icc_reiz', 2)} is a p value and so lies exactly at the limit of significance, so the effect is marginal.`),
        P(`Das ist kein p-Wert, sondern ein Anteil an der Streuung. Mit der Signifikanzgrenze hat er nichts zu tun; ein p-Wert gehört zu einem Test.`, `This is not a p value but a share of the spread. It has nothing to do with the limit of significance; a p value belongs to a test.`))
    ],
    hilfe: ['icc-mehrebenen', 'frage-mehrebenen'], belege: ['Hilfe:icc-mehrebenen', SOLL]
  }
];
