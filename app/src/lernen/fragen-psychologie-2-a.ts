/**
 * Fallreihen zu den Psychologie-Beispielen, Teil a (Stufe 6.3 „nutzen“): Wörter erinnern (`psy2-fe`), Gewichtszunahme bei Anorexie (`psy2-an`), Studierfähigkeit (`psy2-sa`).
 * Jede Zahl kommt aus lib/testdaten/ueben-erwartet-psych.json (R, vom Prüfer), geholt über die Hilfe `Z(<beispiel>)` und ihre Platzhalter (siehe fragen-psychologie-2-bau.ts).
 * Jede Reihe beginnt mit einer Frage aus der Psychologie; mindestens zwei Fragen haben eine Fehldeutung aus Liste B (docs/fachblaetter/BELEGE-NUTZEN.json, `nutzen-b-…`) als falsche Antwort.
 */
import { P } from '../i18n/laufzeit';
import type { Frage, ThemaModul } from './fragen';
import { a, THEMA, Z, tabelle, QU } from './fragen-psychologie-2-bau';

const FE = Z('freunde-erinnern'), AN = Z('anorexie-therapie'), SA = Z('studierfaehigkeit');
const Q_FE = QU('Wie lassen sich Wörter am besten merken?', 'How are words best remembered?');
const Q_AN = QU('Gewichtszunahme bei Anorexie', 'Weight gain in anorexia');
const Q_SA = QU('Wie hängen zwei Studierfähigkeitstests zusammen?', 'How do two aptitude tests relate?');
const SOLL = 'Code:lib/testdaten/ueben-erwartet-psych.json';

export const FAELLE_A: NonNullable<ThemaModul['FAELLE']> = {
  // ======================================================== Wörter erinnern
  'psy2-fe': {
    titel: P('Hilft es beim Erinnern, wenn die Wörter vorher gezeigt oder unter andere gemischt werden? Gedächtnisexperiment mit drei Darbietungsformen, je 10 Personen, richtig erinnerte Wörter (von 40): Varianzanalyse mit Paarvergleichen, Welch-Variante und Rangtest',
      'Does it help remembering when the words are shown beforehand or mixed in among others? Memory experiment with three presentation forms, 10 people each, words recalled correctly (of 40): analysis of variance with pairwise comparisons, Welch variant and rank test'),
    tabellen: [
      tabelle(P('Richtig erinnerte Wörter nach Darbietungsform', 'Words recalled correctly by presentation form'), [P('Darbietungsform', 'Presentation form'), P('Personen', 'People'), P('Mittelwert', 'Mean'), P('Standardabweichung', 'Standard deviation')],
        [['Freies Erinnern', FE.c('n_freies_erinnern', 0), FE.c('mittel_freies_erinnern', 1), FE.c('sd_freies_erinnern', 1)], ['Vorher gezeigt', FE.c('n_vorher_gezeigt', 0), FE.c('mittel_vorher_gezeigt', 1), FE.c('sd_vorher_gezeigt', 1)], ['Eingemischt', FE.c('n_eingemischt', 0), FE.c('mittel_eingemischt', 1), FE.c('sd_eingemischt', 1)]], Q_FE),
      tabelle(P('Varianzanalyse (ANOVA) und Welch-Variante', 'Analysis of variance (ANOVA) and Welch variant'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['F', FE.c('anova_f', 2)], ['Freiheitsgrade Zähler', FE.c('anova_df1', 0)], ['Freiheitsgrade Nenner', FE.c('anova_df2', 0)], ['p', FE.cp('anova_p')], ['eta²', FE.c('eta2', 2)], ['Welch-F', FE.c('welch_f', 2)], ['Welch-p', FE.cp('welch_p')]], Q_FE),
      tabelle(P('Paarvergleiche nach Tukey und Rangtest nach Kruskal-Wallis', 'Pairwise comparisons by Tukey and rank test by Kruskal-Wallis'), [P('Vergleich', 'Comparison'), P('p', 'p')],
        [['Freies Erinnern gegen Eingemischt', FE.cp('tukey_p_freies_erinnern_gegen_eingemischt')], ['Vorher gezeigt gegen Eingemischt', FE.c('tukey_p_vorher_gezeigt_gegen_eingemischt', 3)], ['Vorher gezeigt gegen Freies Erinnern', FE.cp('tukey_p_vorher_gezeigt_gegen_freies_erinnern')], ['Kruskal-Wallis H', FE.c('kruskal_h', 2)], ['Kruskal-Wallis p', FE.cp('kruskal_p')]], Q_FE)
    ]
  },
  // ======================================================== Anorexie
  'psy2-an': {
    titel: P('Nehmen junge Frauen mit Anorexie unter einer Therapie zu, und wie sicher lässt sich das sagen? Gewicht in Pfund vor und nach der Behandlungszeit bei Familientherapie, Verhaltenstherapie und Kontrollgruppe: gepaarte t-Tests und Kovarianzanalyse',
      'Do young women with anorexia gain weight under a therapy, and how surely can that be said? Weight in pounds before and after the treatment period with family therapy, behavioural therapy and a control group: paired t tests and analysis of covariance'),
    tabellen: [
      tabelle(P('Gewicht vorher und nachher je Gruppe (gepaarter t-Test)', 'Weight before and after by group (paired t test)'), [P('Gruppe', 'Group'), P('Mittelwert vorher', 'Mean before'), P('Mittelwert nachher', 'Mean after'), P('t', 't'), P('Freiheitsgrade', 'Degrees of freedom'), P('p', 'p')],
        [['Familientherapie', AN.c('mittel_vorher_familientherapie', 1), AN.c('mittel_nachher_familientherapie', 1), AN.c('t_familientherapie', 2), AN.c('df_familientherapie', 0), AN.cp('p_familientherapie')],
          ['Verhaltenstherapie', AN.c('mittel_vorher_verhaltenstherapie', 1), AN.c('mittel_nachher_verhaltenstherapie', 1), AN.c('t_verhaltenstherapie', 2), AN.c('df_verhaltenstherapie', 0), AN.cp('p_verhaltenstherapie')],
          ['Kontrolle', AN.c('mittel_vorher_kontrolle', 1), AN.c('mittel_nachher_kontrolle', 1), AN.c('t_kontrolle', 2), AN.c('df_kontrolle', 0), AN.cp('p_kontrolle')]], Q_AN),
      tabelle(P('Kovarianzanalyse: Gewicht nachher, Gruppe mit Gewicht vorher als Kovariate', 'Analysis of covariance: weight after, group with weight before as covariate'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['F (Gruppe)', AN.c('ancova_f_gruppe', 2)], ['Freiheitsgrade Zähler', AN.c('ancova_df1', 0)], ['Freiheitsgrade Nenner', AN.c('ancova_df2', 0)], ['p (Gruppe)', AN.cp('ancova_p_gruppe')], ['Partielles eta²', AN.c('ancova_partielles_eta2', 2)], ['Steigung des Gewichts vorher', AN.c('ancova_steigung_vorher', 2)]], Q_AN),
      tabelle(P('Prüfung gleicher Steigungen und Zusammenhang vorher mit nachher', 'Check of equal slopes and relationship of before with after'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['F (Wechselwirkung Gruppe mal vorher)', AN.c('steigung_wechselwirkung_f', 2)], ['p (Wechselwirkung Gruppe mal vorher)', AN.cp('steigung_wechselwirkung_p')], ['Korrelation vorher mit nachher', AN.c('r_vorher_nachher', 2)]], Q_AN)
    ]
  },
  // ======================================================== Studierfähigkeit
  'psy2-sa': {
    titel: P('Messen zwei Studierfähigkeitstests dasselbe, und was bestimmt das Ergebnis? Selbst berichtete Punkte in ACT und SAT (Mathematik, Sprache), Alter und Bildungsstufe: Korrelation, Regression mit mehreren Einflüssen und Varianzanalyse nach Bildungsstufe',
      'Do two aptitude tests measure the same thing, and what determines the result? Self-reported scores in ACT and SAT (maths, verbal), age and education level: correlation, regression with several predictors and analysis of variance by education level'),
    tabellen: [
      tabelle(P('Zusammenhang von ACT und SAT Mathematik', 'Relationship of ACT and SAT maths'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['Korrelation r', SA.c('r_act_sat_mathe', 2)], ['Personen mit allen Angaben', SA.c('n_act_sat_mathe', 0)], ['p', SA.cp('p_act_sat_mathe')]], Q_SA),
      tabelle(P('Regression des ACT auf SAT verbal, SAT Mathematik und Alter', 'Regression of the ACT on SAT verbal, SAT maths and age'), [P('Einfluss', 'Predictor'), P('B (Punkte je Einheit)', 'B (points per unit)'), P('Beta (standardisiert)', 'Beta (standardised)'), P('p', 'p')],
        [['SAT verbal', SA.c('b_sat_verbal', 3), SA.c('beta_sat_verbal', 2), SA.cp('p_sat_verbal')], ['SAT Mathematik', SA.c('b_sat_mathe', 3), SA.c('beta_sat_mathe', 2), SA.cp('p_sat_mathe')], ['Alter in Jahren', SA.c('b_alter', 3), SA.c('beta_alter', 2), SA.cp('p_alter')]], Q_SA),
      tabelle(P('Anpassung der Regression und Varianzanalyse des ACT nach Bildungsstufe', 'Fit of the regression and analysis of variance of the ACT by education level'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['R² der Regression', SA.c('reg_r2', 2)], ['R² korrigiert', SA.c('reg_r2_korrigiert', 3)], ['F (Bildungsstufe)', SA.c('anova_bildung_f', 2)], ['Freiheitsgrade Zähler', SA.c('anova_bildung_df1', 0)], ['Freiheitsgrade Nenner', SA.c('anova_bildung_df2', 0)], ['p (Bildungsstufe)', SA.cp('anova_bildung_p')], ['eta² (Bildungsstufe)', SA.c('eta2_bildung', 3)]], Q_SA)
    ]
  }
};

export const FRAGEN_A: Frage[] = [
  // ---------------------------------------------------------------- Wörter erinnern
  {
    id: 'psy2-fe-lesen', thema: THEMA, fall: 'psy2-fe',
    stamm: P(`Hilft eine der drei Darbietungsformen beim Erinnern? Die Varianzanalyse ergibt F(${FE.d('anova_df1', 0)}; ${FE.d('anova_df2', 0)}) = ${FE.d('anova_f', 2)}, p ${FE.pd('anova_p')}. Was folgt daraus?`, `Does one of the three presentation forms help remembering? The analysis of variance gives F(${FE.e('anova_df1', 0)}, ${FE.e('anova_df2', 0)}) = ${FE.e('anova_f', 2)}, p ${FE.pe('anova_p')}. What follows from this?`),
    antworten: [
      a(P(`Die Nullhypothese gleicher Mittelwerte gilt mit einer Wahrscheinlichkeit von ${FE.td('anova_p', 1)} Prozent.`, `The null hypothesis of equal means holds with a probability of ${FE.te('anova_p', 1)} percent.`),
        P(`Der p-Wert ist nicht die Wahrscheinlichkeit der Nullhypothese. Er gibt an, wie wahrscheinlich Daten wie diese oder noch extremere sind, wenn die Nullhypothese gilt.`, `The p value is not the probability of the null hypothesis. It tells how probable data like these or more extreme ones are if the null hypothesis holds.`)),
      a(P(`Mindestens zwei Formen unterscheiden sich im Mittel; welche, zeigen die Paarvergleiche.`, `At least two forms differ in mean; the pairwise comparisons show which.`),
        P(`Die Varianzanalyse prüft gemeinsam, ob alle Mittelwerte gleich sind. Fällt sie signifikant aus, ist mindestens ein Paar verschieden; welches, zeigt Tukey.`, `The analysis of variance jointly tests whether all means are equal. If significant, at least one pair differs; Tukey shows which.`), true),
      a(P(`Alle drei Darbietungsformen unterscheiden sich paarweise voneinander im Mittel.`, `All three presentation forms differ from one another in their means, pair by pair.`),
        P(`Das folgt aus dem F-Test nicht. Er zeigt nur, dass nicht alle Mittelwerte gleich sind; zwei Formen können gleich gut sein, wie die Mittelwerte der Tabelle zeigen.`, `That does not follow from the F test. It only shows that not all means are equal; two forms can be equally good, as the means in the table show.`)),
      a(P(`Die Alternativhypothese ist mit p ${FE.pd('anova_p')} gesichert, mindestens eine Form wirkt also.`, `The alternative hypothesis is secured with p ${FE.pe('anova_p')}, so at least one form has an effect.`),
        P(`Ein signifikantes Ergebnis sichert die Alternativhypothese nicht. Es zeigt nur, dass die Daten schlecht zur Nullhypothese passen; ein Zufallsbefund bleibt möglich.`, `A significant result does not secure the alternative hypothesis. It only shows that the data fit the null hypothesis poorly; a chance finding remains possible.`))
    ],
    hilfe: ['f-test', 'p-wert'], belege: ['Haller und Krauss 2002', SOLL]
  },
  {
    id: 'psy2-fe-posthoc', thema: THEMA, fall: 'psy2-fe',
    stamm: P(`Welche Darbietungsformen unterscheiden sich nach den Paarvergleichen (Tukey, setzt gleiche Streuung voraus) und den Mittelwerten der Tabellen?`, `Which presentation forms differ according to the pairwise comparisons (Tukey, which assumes equal spread) and the means in the tables?`),
    antworten: [
      a(P(`Nach Tukey unterscheidet sich freies Erinnern von beiden anderen Formen, diese unter sich nicht.`, `According to Tukey, free recall differs from both other forms, these two do not differ from each other.`),
        P(`Beide p-Werte von freiem Erinnern liegen unter 0,05 (Mittelwerte ${FE.d('mittel_freies_erinnern', 1)} gegen ${FE.d('mittel_vorher_gezeigt', 1)}). Vorbehalt: Tukey setzt gleiche Streuung voraus; Welch (p ${FE.pd('welch_p')}) und Games-Howell sind hier nicht signifikant.`, `Both p values of free recall are below 0.05 (means ${FE.e('mittel_freies_erinnern', 1)} against ${FE.e('mittel_vorher_gezeigt', 1)}). Caveat: Tukey assumes equal spread; Welch (p ${FE.pe('welch_p')}) and Games-Howell are not significant here.`), true),
      a(P(`Vorher gezeigt und eingemischt sind gleich, weil p = ${FE.d('tukey_p_vorher_gezeigt_gegen_eingemischt', 2)} die Gleichheit der Formen belegt.`, `Shown before and mixed in are equal, because p = ${FE.e('tukey_p_vorher_gezeigt_gegen_eingemischt', 2)} proves the equality of the forms.`),
        P(`Ein großes p belegt keine Gleichheit. Hier sind die Mittelwerte tatsächlich gleich, aber ein Test mit wenigen Personen könnte einen echten Unterschied genauso übersehen.`, `A large p does not prove equality. Here the means really are equal, but a test with few people could overlook a real difference just as well.`)),
      a(P(`Nur eingemischt unterscheidet sich von den anderen, weil es als einzige Form den Mittelwert ${FE.d('mittel_eingemischt', 1)} hat.`, `Only mixed in differs from the others, because it is the only form with the mean ${FE.e('mittel_eingemischt', 1)}.`),
        P(`Auch vorher gezeigt hat den Mittelwert ${FE.d('mittel_vorher_gezeigt', 1)}. Zwei Formen mit demselben Mittelwert unterscheiden sich nicht; abweichend ist freies Erinnern.`, `Shown before also has the mean ${FE.e('mittel_vorher_gezeigt', 1)}. Two forms with the same mean do not differ; the odd one is free recall.`)),
      a(P(`Alle drei Paare sind signifikant, weil die Varianzanalyse insgesamt signifikant war.`, `All three pairs are significant because the analysis of variance was significant overall.`),
        P(`Das Gesamtergebnis sagt nichts über jedes Paar. Die Paarvergleiche entscheiden einzeln, und eines der drei Paare liegt bei p = ${FE.d('tukey_p_vorher_gezeigt_gegen_eingemischt', 2)}.`, `The overall result says nothing about each pair. The pairwise comparisons decide one by one, and one of the three pairs lies at p = ${FE.e('tukey_p_vorher_gezeigt_gegen_eingemischt', 2)}.`))
    ],
    hilfe: ['post-hoc', 'paarvergleich'], belege: ['Greenland et al. 2016', SOLL]
  },
  {
    id: 'psy2-fe-welch', thema: THEMA, fall: 'psy2-fe',
    stamm: P(`Die Standardabweichungen der Gruppen sind verschieden (${FE.d('sd_eingemischt', 1)} bis ${FE.d('sd_freies_erinnern', 1)}). Die Welch-Varianzanalyse ergibt p ${FE.pd('welch_p')}, die klassische p ${FE.pd('anova_p')}. Wie ist das zu lesen?`, `The standard deviations of the groups differ (${FE.e('sd_eingemischt', 1)} to ${FE.e('sd_freies_erinnern', 1)}). The Welch analysis of variance gives p ${FE.pe('welch_p')}, the classical one p ${FE.pe('anova_p')}. How is this to be read?`),
    antworten: [
      a(P(`Die Welch-Variante ist verlässlicher, da sie ungleiche Streuungen zulässt; ihr p liegt über 0,05.`, `The Welch variant is more dependable as it allows unequal spreads; its p lies above 0.05.`),
        P(`Bei sehr ungleichen Streuungen rechnet die Welch-Variante mit eigenen Streuungen je Gruppe und eigenen Freiheitsgraden (${FE.d('welch_df2', 1)}). Der Befund bleibt unklar.`, `With very unequal spreads the Welch variant works with separate spreads per group and its own degrees of freedom (${FE.e('welch_df2', 1)}). The finding stays unclear.`), true),
      a(P(`Der Welch-Wert p ${FE.pd('welch_p')} zeigt, dass zwischen den Gruppen kein Unterschied besteht.`, `The Welch value p ${FE.pe('welch_p')} shows that there is no difference between the groups.`),
        P(`Ein p über 0,05 zeigt nicht, dass kein Unterschied besteht. Es zeigt nur, dass die Daten den Unterschied bei dieser Stichprobengröße nicht deutlich belegen.`, `A p above 0.05 does not show that there is no difference. It only shows that the data do not clearly document the difference at this sample size.`)),
      a(P(`Man wählt das Verfahren mit dem kleineren p, hier die klassische Varianzanalyse mit p ${FE.pd('anova_p')}.`, `One picks the method with the smaller p, here the classical analysis of variance with p ${FE.pe('anova_p')}.`),
        P(`Das Verfahren wird vor dem Blick auf p nach den Voraussetzungen gewählt. Wer das kleinere p aussucht, erhöht die Rate falsch positiver Befunde.`, `The method is chosen by its assumptions before looking at p. Choosing the smaller p raises the rate of false positive findings.`)),
      a(P(`Die Welch-Variante gilt nur für zwei Gruppen, bei drei Gruppen gilt allein die klassische Rechnung.`, `The Welch variant applies only to two groups, with three groups only the classical calculation applies.`),
        P(`Es gibt eine Welch-Varianzanalyse für mehr als zwei Gruppen; die Tabelle zeigt sie mit F(${FE.d('welch_df1', 0)}; ${FE.d('welch_df2', 1)}). Sie ist gerade bei ungleichen Streuungen üblich.`, `There is a Welch analysis of variance for more than two groups; the table shows it with F(${FE.e('welch_df1', 0)}, ${FE.e('welch_df2', 1)}). It is common precisely when spreads are unequal.`))
    ],
    hilfe: ['welch-anova', 'levene-test'], belege: ['Welch 1951', SOLL]
  },
  {
    id: 'psy2-fe-eta', thema: THEMA, fall: 'psy2-fe',
    stamm: P(`Wie viel der Unterschiede zwischen den Personen im Erinnern hängt an der Darbietungsform? Die Tabelle nennt eta² = ${FE.d('eta2', 2)}.`, `How much of the differences between people in remembering depends on the presentation form? The table gives eta squared = ${FE.e('eta2', 2)}.`),
    antworten: [
      a(P(`Etwa ${FE.td('eta2', 0)} Prozent der Streuung der erinnerten Wörter gehen auf die Form zurück.`, `About ${FE.te('eta2', 0)} percent of the spread in the words recalled goes back to the form.`),
        P(`Eta² ist der Anteil der gesamten Streuung, den die Gruppenzugehörigkeit erklärt; der Rest ist Streuung innerhalb der Gruppen.`, `Eta squared is the share of the total spread explained by group membership; the rest is spread within the groups.`), true),
      a(P(`${FE.td('eta2', 0)} Prozent der Personen erinnern mit der besten Darbietungsform mehr Wörter als im Mittel.`, `${FE.te('eta2', 0)} percent of the people recall more words than average with the best presentation form.`),
        P(`Eta² beschreibt keinen Anteil von Personen, sondern einen Anteil der Streuung. Über einzelne Personen sagt es nichts aus.`, `Eta squared does not describe a share of people but a share of the spread. It says nothing about single people.`)),
      a(P(`Weil p ${FE.pd('anova_p')} klein ist, ist der Effekt der Darbietungsform groß.`, `Because p ${FE.pe('anova_p')} is small, the effect of the presentation form is large.`),
        P(`Der p-Wert misst nicht die Größe eines Effekts. Er hängt von der Stichprobengröße ab; die Größe zeigt eta² oder ein Maß wie Cohens f.`, `The p value does not measure the size of an effect. It depends on the sample size; the size is shown by eta squared or a measure such as Cohen f.`)),
      a(P(`Die Darbietungsform erklärt ${FE.td('eta2', 0)} Prozent der Wörter, die insgesamt zu lernen waren.`, `The presentation form explains ${FE.te('eta2', 0)} percent of the words that had to be learned in total.`),
        P(`Die Liste hatte 40 Wörter; eta² bezieht sich nicht auf diese Wortzahl, sondern auf die Varianz der erinnerten Wörter über alle Personen.`, `The list had 40 words; eta squared does not refer to this word count but to the variance of the words recalled across all people.`))
    ],
    hilfe: ['eta-quadrat', 'effektstaerke'], belege: ['Haller und Krauss 2002', SOLL]
  },
  {
    id: 'psy2-fe-kruskal', thema: THEMA, fall: 'psy2-fe',
    stamm: P(`Viele Personen erreichen fast die Höchstzahl der Wörter, die Werte sind schief. Der Rangtest (Kruskal-Wallis) ergibt H = ${FE.d('kruskal_h', 2)} mit p ${FE.pd('kruskal_p')}. Was zeigt er neben der Varianzanalyse?`, `Many people reach almost the maximum number of words, the values are skewed. The rank test (Kruskal-Wallis) gives H = ${FE.e('kruskal_h', 2)} with p ${FE.pe('kruskal_p')}. What does it show beside the analysis of variance?`),
    antworten: [
      a(P(`Der Rangtest widerlegt die Varianzanalyse; es gibt demnach keinen Effekt der Darbietungsform.`, `The rank test refutes the analysis of variance; accordingly there is no effect of the presentation form.`),
        P(`Zwei Verfahren mit knapp verschiedenem p widerlegen einander nicht. Ein p knapp über 0,05 zeigt keinen fehlenden Effekt, sondern einen unklaren Befund.`, `Two methods with slightly different p do not refute each other. A p just above 0.05 does not show a missing effect but an unclear finding.`)),
      a(P(`Der Rangtest hängt von der Normalverteilung nicht ab und bleibt knapp über 0,05: Der Unterschied ist damit weder belegt noch widerlegt.`, `The rank test does not depend on the normal distribution and stays just above 0.05: the difference is neither shown nor refuted.`),
        P(`Bei schiefen Werten und nur 10 Personen je Gruppe ist der Rangtest eine sinnvolle Gegenprobe. Weichen die Verfahren ab, hilft ein Bericht beider.`, `With skewed values and only 10 people per group the rank test is a sensible cross-check. If the methods differ, reporting both helps.`), true),
      a(P(`Rangtests haben mehr Teststärke als die Varianzanalyse und sind darum vorzuziehen, sobald Werte schief sind.`, `Rank tests have more power than the analysis of variance and are therefore preferable as soon as values are skewed.`),
        P(`Bei annähernd normalen Daten hat die Varianzanalyse eher mehr Teststärke. Der Rangtest ist wegen der Voraussetzungen sinnvoll, nicht weil er stärker ist.`, `With roughly normal data the analysis of variance tends to have more power. The rank test makes sense because of the assumptions, not because it is stronger.`)),
      a(P(`Der Rangtest vergleicht die Mittelwerte der Gruppen und kommt darum zu einem anderen p.`, `The rank test compares the means of the groups and therefore arrives at a different p.`),
        P(`Der Kruskal-Wallis-Test vergleicht Ränge, also die Rangordnung der Werte, nicht Mittelwerte. Er fragt, ob Werte einer Gruppe tendenziell über denen einer anderen liegen.`, `The Kruskal-Wallis test compares ranks, that is the order of the values, not means. It asks whether values of one group tend to lie above those of another.`))
    ],
    hilfe: ['rangtest', 'welch-anova'], belege: ['Greenland et al. 2016', SOLL]
  },
  {
    id: 'psy2-fe-klein', thema: THEMA, fall: 'psy2-fe',
    stamm: P(`Mit nur ${FE.d('n_eingemischt', 0)} Personen je Gruppe liegen Welch-Test und Rangtest über 0,05. Was darf man aus einem p über 0,05 für den Unterschied zwischen freiem Erinnern und eingemischt schließen?`, `With only ${FE.e('n_eingemischt', 0)} people per group the Welch test and the rank test lie above 0.05. What may be concluded from a p above 0.05 about the difference between free recall and mixed in?`),
    antworten: [
      a(P(`Der Unterschied ist hier nicht deutlich belegt; „nicht deutlich“ heißt nicht „kein Unterschied“.`, `The difference is not clearly documented here; "not clear" does not mean "no difference".`),
        P(`Mit wenigen Personen ist die Teststärke gering, auch ein echter Unterschied wird dann oft nicht signifikant. Die Mittelwerte ${FE.d('mittel_freies_erinnern', 1)} und ${FE.d('mittel_eingemischt', 1)} liegen deutlich auseinander.`, `With few people power is low, so even a real difference often is not significant. The means ${FE.e('mittel_freies_erinnern', 1)} and ${FE.e('mittel_eingemischt', 1)} lie clearly apart.`), true),
      a(P(`Freies Erinnern und eingemischt wirken gleich gut, denn die Nullhypothese wurde nicht verworfen.`, `Free recall and mixed in work equally well, because the null hypothesis was not rejected.`),
        P(`Nicht verwerfen heißt nicht bestätigen. Gleichheit müsste ein Äquivalenztest oder ein Intervall um die Differenz belegen, nicht ein großes p.`, `Not rejecting does not mean confirming. Equality would have to be shown by an equivalence test or an interval around the difference, not by a large p.`)),
      a(P(`Die Nullhypothese ist durch p über 0,05 bestätigt, mehr Personen würden nichts ändern.`, `The null hypothesis is confirmed by p above 0.05, more people would change nothing.`),
        P(`Mit mehr Personen schrumpft der Standardfehler, und derselbe Mittelwertunterschied kann deutlich signifikant werden. Das Ergebnis hängt also an der Gruppengröße.`, `With more people the standard error shrinks, and the same difference in means can become clearly significant. The result thus depends on the group size.`)),
      a(P(`Mit ${FE.d('n_eingemischt', 0)} Personen je Gruppe ist jeder Befund wertlos, auch das signifikante Ergebnis des Tukey-Tests.`, `With ${FE.e('n_eingemischt', 0)} people per group any finding is worthless, including the significant result of the Tukey test.`),
        P(`Kleine Studien sind nicht wertlos. Sie sind ungenau, ihre Intervalle sind breit, und ein signifikanter Befund überschätzt den Effekt oft; sie liefern aber Hinweise für spätere Studien.`, `Small studies are not worthless. They are imprecise, their intervals are wide, and a significant finding often overestimates the effect; but they give hints for later studies.`))
    ],
    hilfe: ['signifikanz', 'teststaerke'], belege: ['Greenland et al. 2016', SOLL]
  },

  // ---------------------------------------------------------------- Anorexie
  {
    id: 'psy2-an-gepaart', thema: THEMA, fall: 'psy2-an',
    stamm: P(`Nehmen Frauen mit Familientherapie zu? Die Tabelle zeigt für sie Mittelwerte vorher ${AN.d('mittel_vorher_familientherapie', 1)} und nachher ${AN.d('mittel_nachher_familientherapie', 1)}, t(${AN.d('df_familientherapie', 0)}) = ${AN.d('t_familientherapie', 2)}. Was bedeutet das?`, `Do women with family therapy gain weight? The table shows for them means before ${AN.e('mittel_vorher_familientherapie', 1)} and after ${AN.e('mittel_nachher_familientherapie', 1)}, t(${AN.e('df_familientherapie', 0)}) = ${AN.e('t_familientherapie', 2)}. What does this mean?`),
    antworten: [
      a(P(`Im Mittel liegt das Gewicht nachher höher; die Daten wären unter der Nullhypothese unwahrscheinlich (p ${AN.pd('p_familientherapie')}).`, `On average the weight afterwards is higher; the data would be unlikely under the null hypothesis (p ${AN.pe('p_familientherapie')}).`),
        P(`Der gepaarte t-Test vergleicht je Frau nachher mit vorher und prüft, ob die mittlere Veränderung von 0 abweicht. Er zeigt die Veränderung, nicht ihre Ursache.`, `The paired t test compares after with before for each woman and checks whether the mean change differs from 0. It shows the change, not its cause.`), true),
      a(P(`Weil der gepaarte t-Test signifikant ist, ist die Familientherapie als Ursache der Zunahme belegt.`, `Because the paired t test is significant, family therapy is established as the cause of the gain.`),
        P(`Ohne Vergleich mit einer Kontrollgruppe können auch Zeit, Reifung oder Messfehler die Zunahme erklären. Der gepaarte Test sagt nichts über Ursachen.`, `Without comparison with a control group, time, maturation or measurement error can also explain the gain. The paired test says nothing about causes.`)),
      a(P(`Es wird der Mittelwert der Familientherapie mit dem der Verhaltenstherapie verglichen.`, `The mean of family therapy is compared with that of behavioural therapy.`),
        P(`Der gepaarte Test vergleicht innerhalb einer Gruppe dieselben Frauen vorher und nachher. Der Vergleich der Therapien ist ein eigener Schritt, etwa die Kovarianzanalyse.`, `The paired test compares the same women before and after within one group. The comparison of the therapies is a step of its own, for instance the analysis of covariance.`)),
      a(P(`Die Zahl ${AN.d('t_familientherapie', 2)} gibt die Wahrscheinlichkeit an, dass die Zunahme zufällig ist.`, `The number ${AN.e('t_familientherapie', 2)} gives the probability that the gain is due to chance.`),
        P(`Die Wahrscheinlichkeit gibt der p-Wert an, nicht die t-Statistik. t misst die mittlere Veränderung in Einheiten ihres Standardfehlers.`, `The probability is given by the p value, not by the t statistic. t measures the mean change in units of its standard error.`))
    ],
    hilfe: ['gepaarte-messung', 'effektstaerke'], belege: ['Greenland et al. 2016', SOLL]
  },
  {
    id: 'psy2-an-kontrolle', thema: THEMA, fall: 'psy2-an',
    stamm: P(`In der Kontrollgruppe gilt t(${AN.d('df_kontrolle', 0)}) = ${AN.d('t_kontrolle', 2)} mit p ${AN.pd('p_kontrolle')}, der Mittelwert bleibt bei etwa ${AN.d('mittel_vorher_kontrolle', 1)} gegen ${AN.d('mittel_nachher_kontrolle', 1)}. Wie ist das zu lesen?`, `In the control group t(${AN.e('df_kontrolle', 0)}) = ${AN.e('t_kontrolle', 2)} with p ${AN.pe('p_kontrolle')}, the mean stays at about ${AN.e('mittel_vorher_kontrolle', 1)} against ${AN.e('mittel_nachher_kontrolle', 1)}. How is this to be read?`),
    antworten: [
      a(P(`Ohne Therapie zeigt sich keine Gewichtsveränderung; die Mittelwerte liegen praktisch gleich.`, `Without therapy no change in weight can be shown; the means are practically equal.`),
        P(`Mit p = ${AN.d('p_kontrolle', 2)} passen die Daten gut zur Annahme „keine mittlere Veränderung“. Das ist der Vergleichsmaßstab für die beiden Therapiegruppen.`, `With p = ${AN.e('p_kontrolle', 2)} the data fit the assumption "no mean change" well. This is the yardstick for the two therapy groups.`), true),
      a(P(`Mit ${AN.td('p_kontrolle', 0)} Prozent Wahrscheinlichkeit hat sich das Gewicht der Kontrollgruppe nicht verändert.`, `With ${AN.te('p_kontrolle', 0)} percent probability the weight of the control group has not changed.`),
        P(`Der p-Wert ist keine Wahrscheinlichkeit für die Nullhypothese. Er gibt an, wie häufig solche oder größere Abweichungen auftreten, wenn es keine Veränderung gibt.`, `The p value is not a probability for the null hypothesis. It tells how often such or larger deviations occur if there is no change.`)),
      a(P(`Das negative Vorzeichen von t zeigt, dass die Kontrollgruppe bedeutsam Gewicht verloren hat.`, `The negative sign of t shows that the control group lost weight in a meaningful way.`),
        P(`Das Vorzeichen gibt nur die Richtung an, nach der die Differenz gebildet ist. Mit p = ${AN.d('p_kontrolle', 2)} ist der kleine Rückgang nicht von Zufall zu unterscheiden.`, `The sign only gives the direction in which the difference is formed. With p = ${AN.e('p_kontrolle', 2)} the small decrease cannot be told from chance.`)),
      a(P(`Weil p groß ist, ist bewiesen, dass die Behandlungsform der Kontrollgruppe überhaupt nichts bewirkt.`, `Because p is large, it is established that the treatment form of the control group has no effect whatsoever.`),
        P(`Ein großes p belegt keinen fehlenden Effekt, besonders bei ${AN.d('df_kontrolle', 0)} Freiheitsgraden und kleinen Veränderungen. Es zeigt nur, dass die Daten keinen Effekt belegen.`, `A large p does not prove a missing effect, especially with ${AN.e('df_kontrolle', 0)} degrees of freedom and small changes. It only shows that the data do not establish an effect.`))
    ],
    hilfe: ['p-wert', 'gepaarte-messung'], belege: ['Haller und Krauss 2002', SOLL]
  },
  {
    id: 'psy2-an-ancova', thema: THEMA, fall: 'psy2-an',
    stamm: P(`Die Kovarianzanalyse vergleicht das Gewicht nachher zwischen den Behandlungen, mit dem Gewicht vorher als Kovariate: F(${AN.d('ancova_df1', 0)}; ${AN.d('ancova_df2', 0)}) = ${AN.d('ancova_f_gruppe', 2)}, p ${AN.pd('ancova_p_gruppe')}, partielles eta² = ${AN.d('ancova_partielles_eta2', 2)}. Was sagt sie?`, `The analysis of covariance compares the weight afterwards between the treatments, with weight before as covariate: F(${AN.e('ancova_df1', 0)}, ${AN.e('ancova_df2', 0)}) = ${AN.e('ancova_f_gruppe', 2)}, p ${AN.pe('ancova_p_gruppe')}, partial eta squared = ${AN.e('ancova_partielles_eta2', 2)}. What does it say?`),
    antworten: [
      a(P(`Bei gleichem Ausgangsgewicht unterscheiden sich die Behandlungen im Gewicht nachher.`, `At the same starting weight the treatments differ in weight afterwards.`),
        P(`Die Kovarianzanalyse rechnet den Einfluss des Ausgangsgewichts heraus und vergleicht angepasste Mittelwerte.`, `The analysis of covariance removes the influence of the starting weight and compares adjusted means.`), true),
      a(P(`Die Behandlungsgruppen hatten schon vor der Behandlung deutlich verschiedene Gewichte.`, `The treatment groups already had clearly different weights before the treatment.`),
        P(`Das zeigt die Tabelle nicht. Die Mittelwerte vorher liegen mit ${AN.d('mittel_vorher_familientherapie', 1)} bis ${AN.d('mittel_vorher_kontrolle', 1)} nah beieinander; die Kovariate gleicht Restunterschiede aus.`, `The table does not show that. The means before lie close together at ${AN.e('mittel_vorher_familientherapie', 1)} to ${AN.e('mittel_vorher_kontrolle', 1)}; the covariate evens out remaining differences.`)),
      a(P(`Die Kovariate Gewicht vorher verursacht das Gewicht nachher, der Gruppenunterschied ist nur Zufall.`, `The covariate weight before causes the weight afterwards, the group difference is just chance.`),
        P(`Das Gewicht vorher hängt mit dem Gewicht nachher zusammen (Steigung ${AN.d('ancova_steigung_vorher', 2)}), aber der Gruppenunterschied bleibt mit p ${AN.pd('ancova_p_gruppe')} bestehen.`, `Weight before is related to weight afterwards (slope ${AN.e('ancova_steigung_vorher', 2)}), but the group difference remains with p ${AN.pe('ancova_p_gruppe')}.`)),
      a(P(`${AN.td('ancova_partielles_eta2', 0)} Prozent der Frauen haben durch die Therapie zugenommen.`, `${AN.te('ancova_partielles_eta2', 0)} percent of the women gained weight through the therapy.`),
        P(`Partielles eta² ist keine Anzahl von Frauen, sondern ein Anteil der Streuung. Wie viele Frauen zugenommen haben, steht an anderer Stelle der Auswertung.`, `Partial eta squared is not a number of women but a share of the spread. How many women gained weight is shown elsewhere in the analysis.`))
    ],
    hilfe: ['kovarianzanalyse', 'ancova'], belege: ['Greenland et al. 2016', SOLL]
  },
  {
    id: 'psy2-an-steigung', thema: THEMA, fall: 'psy2-an',
    stamm: P(`Vor der Kovarianzanalyse wird geprüft, ob das Gewicht vorher in allen Gruppen gleich stark mit dem Gewicht nachher zusammenhängt. Die Wechselwirkung Gruppe mal vorher ergibt F = ${AN.d('steigung_wechselwirkung_f', 2)}, p ${AN.pd('steigung_wechselwirkung_p')}. Was heißt das?`, `Before the analysis of covariance it is checked whether weight before is related to weight afterwards equally strongly in all groups. The interaction group times before gives F = ${AN.e('steigung_wechselwirkung_f', 2)}, p ${AN.pe('steigung_wechselwirkung_p')}. What does this mean?`),
    antworten: [
      a(P(`Die Steigungen der Gruppen unterscheiden sich; die Annahme der Kovarianzanalyse ist verletzt.`, `The group slopes differ; the assumption of the covariance analysis is violated.`),
        P(`Die Kovarianzanalyse nimmt eine gemeinsame Steigung an. Unterscheiden sich die Steigungen, hängt der Gruppenunterschied vom Ausgangsgewicht ab.`, `The analysis of covariance assumes a common slope. If the slopes differ, the group difference depends on the starting weight.`), true),
      a(P(`Eine Wechselwirkung liegt vor, wenn beide Haupteffekte, Gruppe und Gewicht vorher, signifikant sind.`, `An interaction exists when both main effects, group and weight before, are significant.`),
        P(`Eine Wechselwirkung heißt, dass der Effekt des einen Faktors von der Stufe des anderen abhängt. Sie ist unabhängig davon, ob die Haupteffekte signifikant sind.`, `An interaction means that the effect of one factor depends on the level of the other. It is independent of whether the main effects are significant.`)),
      a(P(`Mit ${AN.td('steigung_wechselwirkung_p', 1)} Prozent Wahrscheinlichkeit sind die Steigungen in Wahrheit gleich.`, `With ${AN.te('steigung_wechselwirkung_p', 1)} percent probability the slopes are in truth equal.`),
        P(`Der p-Wert ist nicht die Wahrscheinlichkeit der Nullhypothese gleicher Steigungen. Er zeigt, dass die Daten bei gleichen Steigungen nur schwer zu erwarten wären.`, `The p value is not the probability of the null hypothesis of equal slopes. It shows that the data would hardly be expected with equal slopes.`)),
      a(P(`Die Therapien wirken in allen Gruppen gleich stark, weil der Test signifikant ausfiel.`, `The therapies act equally strongly in all groups, because the test came out significant.`),
        P(`Ein signifikanter Test auf Wechselwirkung zeigt gerade ungleiche Steigungen. Gleiche Wirkungen würden ein großes p ergeben, und selbst das würde sie nicht belegen.`, `A significant test of interaction shows precisely unequal slopes. Equal effects would give a large p, and even that would not prove them.`))
    ],
    hilfe: ['kovarianzanalyse', 'wechselwirkung'], belege: ['Greenland et al. 2016', SOLL]
  },
  {
    id: 'psy2-an-signifikant', thema: THEMA, fall: 'psy2-an',
    stamm: P(`Bei der Verhaltenstherapie ist der gepaarte Test signifikant (p ${AN.pd('p_verhaltenstherapie')}), bei der Kontrolle liegt p über 0,05 (p ${AN.pd('p_kontrolle')}). Darf man daraus schließen, dass die Verhaltenstherapie anders wirkt als keine Therapie?`, `With behavioural therapy the paired test is significant (p ${AN.pe('p_verhaltenstherapie')}), with the control p lies above 0.05 (p ${AN.pe('p_kontrolle')}). May one conclude from this that behavioural therapy works differently from no therapy?`),
    antworten: [
      a(P(`Ja, der Unterschied zwischen signifikant und nicht signifikant zeigt, dass die Verhaltenstherapie wirkt.`, `Yes, the difference between significant and not significant shows that behavioural therapy works.`),
        P(`Der Unterschied zwischen „signifikant“ und „nicht signifikant“ ist selbst kein signifikanter Unterschied. Zwei p-Werte lassen sich nicht gegeneinander lesen.`, `The difference between "significant" and "not significant" is not itself a significant difference. Two p values cannot be read against each other.`)),
      a(P(`Noch nicht; dafür müssen die Gruppen direkt verglichen werden, etwa in der Veränderung.`, `Not yet; for that the groups must be compared directly, for instance in the change.`),
        P(`Die Frage nach einem Unterschied der Wirkung ist eine Frage nach einer Wechselwirkung Gruppe mal Zeit. Sie braucht einen eigenen Test, nicht zwei getrennte.`, `The question of a difference in effect is a question of an interaction group times time. It needs a test of its own, not two separate ones.`), true),
      a(P(`Nein, denn die Verhaltenstherapie wirkt bei p ${AN.pd('p_verhaltenstherapie')} nur schwach und darum nicht.`, `No, because behavioural therapy with p ${AN.pe('p_verhaltenstherapie')} acts only weakly and therefore not at all.`),
        P(`Der p-Wert misst nicht die Stärke der Wirkung. Auch ein kleiner Effekt kann mit einer größeren Stichprobe deutlich signifikant werden.`, `The p value does not measure the strength of the effect. Even a small effect can become clearly significant with a larger sample.`)),
      a(P(`Ja, aber nur, weil die Gruppen verschieden groß sind und deshalb verschiedene p-Werte entstehen.`, `Yes, but only because the groups differ in size and therefore different p values arise.`),
        P(`Verschiedene Gruppengrößen verändern p-Werte, ersetzen aber keinen Gruppenvergleich. Auch bei gleich großen Gruppen müsste die Wirkung direkt verglichen werden.`, `Different group sizes change p values but do not replace a group comparison. Even with groups of equal size the effect would have to be compared directly.`))
    ],
    hilfe: ['signifikanz', 'wechselwirkung'], belege: ['Gelman und Stern 2006', SOLL]
  },
  {
    id: 'psy2-an-mitte', thema: THEMA, fall: 'psy2-an',
    stamm: P(`Das Gewicht vorher und nachher korreliert mit r = ${AN.d('r_vorher_nachher', 2)}. Frauen mit dem niedrigsten Ausgangsgewicht nehmen im Mittel stärker zu als die übrigen. Warum ist die Kontrollgruppe dafür wichtig?`, `Weight before and after correlate with r = ${AN.e('r_vorher_nachher', 2)}. Women with the lowest starting weight gain more on average than the others. Why is the control group important for this?`),
    antworten: [
      a(P(`Extrem niedrige Werte liegen bei der zweiten Messung näher am Durchschnitt, auch ohne Therapie.`, `Extremely low values lie closer to the average at the second measurement, even without therapy.`),
        P(`Bei r unter 1 liegen extreme Werte der ersten Messung bei der zweiten näher am Durchschnitt, weil ein Teil davon Zufall war. Die Kontrollgruppe zeigt das Ausmaß.`, `With r below 1 extreme values of the first measurement lie closer to the average at the second, because part of them was chance. The control group shows the extent.`), true),
      a(P(`Wer sehr leicht beginnt, nimmt wegen der Therapie am meisten zu, die Kontrollgruppe ist darum entbehrlich.`, `Whoever starts very light gains the most because of the therapy, so the control group is dispensable.`),
        P(`Genau diesen Schluss erlaubt die Beobachtung allein nicht. Ohne Kontrollgruppe lässt sich Wirkung der Therapie von Regression zur Mitte nicht trennen.`, `This is exactly the conclusion the observation alone does not allow. Without a control group the effect of the therapy cannot be separated from regression to the mean.`)),
      a(P(`Bei r = ${AN.d('r_vorher_nachher', 2)} spielt das Ausgangsgewicht für die Zunahme keine Rolle.`, `With r = ${AN.e('r_vorher_nachher', 2)} the starting weight plays no role for the gain.`),
        P(`Ein r von ${AN.d('r_vorher_nachher', 2)} ist ein mittlerer Zusammenhang; er ist gerade der Grund, warum die Regression zur Mitte deutlich ausfällt. Je kleiner r, desto stärker der Effekt.`, `An r of ${AN.e('r_vorher_nachher', 2)} is a medium relationship; it is precisely the reason why regression to the mean is pronounced. The smaller r, the stronger the effect.`)),
      a(P(`Die erste Messung war falsch, bei der Nachmessung stimmen die Gewichte besser.`, `The first measurement was wrong, at the follow-up the weights are more accurate.`),
        P(`Beide Messungen enthalten Messfehler und Zufall. Die erste ist nicht falscher als die zweite; extrem ausgewählte Werte enthalten aber im Mittel mehr zufällige Abweichung nach unten.`, `Both measurements contain measurement error and chance. The first is not more wrong than the second; but extremely selected values contain on average more random deviation downwards.`))
    ],
    hilfe: ['regression-zur-mitte', 'korrelation'], belege: ['Barnett et al. 2005', SOLL]
  },

  // ---------------------------------------------------------------- Studierfähigkeit
  {
    id: 'psy2-sa-korr', thema: THEMA, fall: 'psy2-sa',
    stamm: P(`Hängen die Ergebnisse im ACT und im SAT Mathematik zusammen? Die Tabelle zeigt r = ${SA.d('r_act_sat_mathe', 2)} bei n = ${SA.d('n_act_sat_mathe', 0)} Personen, p ${SA.pd('p_act_sat_mathe')}.`, `Are the results in the ACT and in SAT maths related? The table shows r = ${SA.e('r_act_sat_mathe', 2)} with n = ${SA.e('n_act_sat_mathe', 0)} people, p ${SA.pe('p_act_sat_mathe')}.`),
    antworten: [
      a(P(`Wer im ACT hoch liegt, liegt häufig auch im SAT Mathematik hoch; eine Ursache folgt daraus nicht.`, `Whoever scores high in the ACT usually also scores high in SAT maths; no cause follows from this.`),
        P(`Eine Korrelation beschreibt, wie gemeinsam sich zwei Werte ändern. Gemeinsame Ursachen wie Begabung oder Schulbildung erklären den Zusammenhang ebenso gut.`, `A correlation describes how two values change together. Common causes such as aptitude or schooling explain the relationship equally well.`), true),
      a(P(`Der ACT bestimmt das Ergebnis im SAT Mathematik, wer im ACT hoch liegt, schneidet im SAT darum besser ab.`, `The ACT determines the result in SAT maths, so whoever scores high in the ACT does better in the SAT.`),
        P(`Aus einer Korrelation folgt keine Wirkrichtung. Beide Tests können von denselben Fähigkeiten abhängen, ohne dass einer den anderen beeinflusst.`, `A correlation implies no direction of effect. Both tests can depend on the same abilities without either influencing the other.`)),
      a(P(`Das p der Tabelle zeigt, dass der Zusammenhang sehr stark ist; deshalb ist er bedeutsam.`, `The p of the table shows that the relationship is very strong; therefore it is meaningful.`),
        P(`Das p zeigt nur, dass der Zusammenhang nicht null ist. Die Stärke zeigt r selbst, und auch bei ${SA.d('n_act_sat_mathe', 0)} Personen würde ein kleines r signifikant.`, `The p only shows that the relationship is not zero. The strength is shown by r itself, and with ${SA.e('n_act_sat_mathe', 0)} people even a small r would become significant.`)),
      a(P(`Ein r von ${SA.d('r_act_sat_mathe', 2)} heißt, dass ${SA.td('r_act_sat_mathe', 0)} Prozent der Personen in beiden Tests hoch liegen.`, `An r of ${SA.e('r_act_sat_mathe', 2)} means that ${SA.te('r_act_sat_mathe', 0)} percent of the people score high in both tests.`),
        P(`r ist kein Anteil von Personen. Erst r im Quadrat gibt den Anteil gemeinsamer Streuung an, und der ist deutlich kleiner als ${SA.td('r_act_sat_mathe', 0)} Prozent.`, `r is not a share of people. Only r squared gives the share of shared spread, and that is clearly smaller than ${SA.te('r_act_sat_mathe', 0)} percent.`))
    ],
    hilfe: ['korrelation', 'zusammenhang-ursache'], belege: ['Haller und Krauss 2002', SOLL]
  },
  {
    id: 'psy2-sa-beta', thema: THEMA, fall: 'psy2-sa',
    stamm: P(`Welcher der drei Einflüsse hängt nach der Regression am stärksten mit dem ACT zusammen: SAT verbal (B = ${SA.d('b_sat_verbal', 3)}), SAT Mathematik (B = ${SA.d('b_sat_mathe', 3)}) oder Alter (B = ${SA.d('b_alter', 3)})?`, `Which of the three predictors is most strongly related to the ACT after the regression: SAT verbal (B = ${SA.e('b_sat_verbal', 3)}), SAT maths (B = ${SA.e('b_sat_mathe', 3)}) or age (B = ${SA.e('b_alter', 3)})?`),
    antworten: [
      a(P(`Das Alter, denn sein B von ${SA.d('b_alter', 3)} ist das größte der drei.`, `Age, because its B of ${SA.e('b_alter', 3)} is the largest of the three.`),
        P(`B hängt von der Einheit ab: Alter in Jahren, SAT in Punkten. Verschiedene Einheiten lassen sich nicht über B vergleichen; dazu dienen die standardisierten Werte Beta.`, `B depends on the unit: age in years, SAT in points. Different units cannot be compared via B; the standardised values beta serve for that.`)),
      a(P(`SAT Mathematik: Beta ${SA.d('beta_sat_mathe', 2)} ist das größte, vor SAT verbal (${SA.d('beta_sat_verbal', 2)}).`, `SAT maths: its beta of ${SA.e('beta_sat_mathe', 2)} is the largest, ahead of SAT verbal (${SA.e('beta_sat_verbal', 2)}).`),
        P(`Beta rechnet jede Größe auf Standardabweichungen um und macht Einflüsse mit verschiedenen Einheiten vergleichbar. Das Alter liegt mit ${SA.d('beta_alter', 2)} deutlich dahinter.`, `Beta converts every variable to standard deviations and makes predictors with different units comparable. Age lies clearly behind with ${SA.e('beta_alter', 2)}.`), true),
      a(P(`SAT verbal, denn nur dieser Einfluss hat das kleinste p der Tabelle.`, `SAT verbal, because only this predictor has the smallest p in the table.`),
        P(`Das p zeigt, ob ein Einfluss von null abweicht, nicht wie stark er ist. Gerade der zweite Einfluss hat ein noch kleineres p als SAT verbal.`, `The p shows whether a predictor differs from zero, not how strong it is. Precisely the second predictor has an even smaller p than SAT verbal.`)),
      a(P(`Alle drei Einflüsse sind gleich stark, denn alle drei Werte sind signifikant.`, `All three predictors are equally strong, because all three values are significant.`),
        P(`Signifikant heißt nur, dass ein Einfluss von null abweicht. Die Stärke unterscheidet sich: Beta reicht von ${SA.d('beta_alter', 2)} bis ${SA.d('beta_sat_mathe', 2)}.`, `Significant only means that a predictor differs from zero. The strength differs: beta ranges from ${SA.e('beta_alter', 2)} to ${SA.e('beta_sat_mathe', 2)}.`))
    ],
    hilfe: ['beta', 'koeffizient-b'], belege: ['Haller und Krauss 2002', SOLL]
  },
  {
    id: 'psy2-sa-r2', thema: THEMA, fall: 'psy2-sa',
    stamm: P(`Die Regression hat R² = ${SA.d('reg_r2', 2)} (korrigiert ${SA.d('reg_r2_korrigiert', 3)}). Was sagt das über die Vorhersage des ACT aus den drei Einflüssen?`, `The regression has R squared = ${SA.e('reg_r2', 2)} (adjusted ${SA.e('reg_r2_korrigiert', 3)}). What does this say about the prediction of the ACT from the three predictors?`),
    antworten: [
      a(P(`Die Vorhersage trifft den ACT bei ${SA.td('reg_r2', 0)} Prozent der Personen genau.`, `The prediction hits the ACT exactly for ${SA.te('reg_r2', 0)} percent of the people.`),
        P(`R² ist keine Trefferquote. Es gibt den Anteil der Streuung an, den das Modell erklärt, nicht den Anteil der Personen mit richtig vorhergesagtem Wert.`, `R squared is not a hit rate. It gives the share of the spread that the model explains, not the share of people with a correctly predicted value.`)),
      a(P(`Die drei Einflüsse erklären etwa ${SA.td('reg_r2', 0)} Prozent der Streuung im ACT.`, `The three predictors explain about ${SA.te('reg_r2', 0)} percent of the spread in the ACT.`),
        P(`R² ist der erklärte Anteil der Streuung. Das korrigierte R² zieht ab, was durch die Zahl der Einflüsse und die Stichprobe zufällig hinzukommt; hier ändert es sich kaum.`, `R squared is the explained share of the spread. Adjusted R squared deducts what comes in by chance through the number of predictors and the sample; here it hardly changes.`), true),
      a(P(`Das Alter erklärt ${SA.td('reg_r2', 0)} Prozent des ACT, die beiden Tests den Rest.`, `Age explains ${SA.te('reg_r2', 0)} percent of the ACT, the two tests the rest.`),
        P(`R² gehört zum ganzen Modell, nicht zu einem einzelnen Einfluss. Der Beitrag des Alters ist klein, wie sein Beta von ${SA.d('beta_alter', 2)} zeigt.`, `R squared belongs to the whole model, not to a single predictor. The contribution of age is small, as its beta of ${SA.e('beta_alter', 2)} shows.`)),
      a(P(`Mit R² = ${SA.d('reg_r2', 2)} ist das Modell wertlos, weil unter ${SA.td('reg_r2', 0)} Prozent erklärt werden.`, `With R squared = ${SA.e('reg_r2', 2)} the model is worthless, because less than ${SA.te('reg_r2', 0)} percent is explained.`),
        P(`Wie viel erklärte Streuung genügt, hängt vom Fach ab. In der Psychologie gelten viele Modelle mit weniger als der Hälfte erklärter Streuung als brauchbar; es gibt keine feste Grenze.`, `How much explained spread suffices depends on the field. In psychology many models with less than half of the spread explained count as useful; there is no fixed limit.`))
    ],
    hilfe: ['r-quadrat', 'koeffizient-b'], belege: ['Cohen 1988', SOLL]
  },
  {
    id: 'psy2-sa-anova', thema: THEMA, fall: 'psy2-sa',
    stamm: P(`Unterscheidet sich der ACT zwischen den Bildungsstufen? Die Varianzanalyse ergibt F(${SA.d('anova_bildung_df1', 0)}; ${SA.d('anova_bildung_df2', 0)}) = ${SA.d('anova_bildung_f', 2)}, p ${SA.pd('anova_bildung_p')}, eta² = ${SA.d('eta2_bildung', 3)}. Was ist die passende Lesart?`, `Does the ACT differ between the education levels? The analysis of variance gives F(${SA.e('anova_bildung_df1', 0)}, ${SA.e('anova_bildung_df2', 0)}) = ${SA.e('anova_bildung_f', 2)}, p ${SA.pe('anova_bildung_p')}, eta squared = ${SA.e('eta2_bildung', 3)}. What is the fitting reading?`),
    antworten: [
      a(P(`Der Unterschied ist deutlich, erklärt aber nur rund ${SA.td('eta2_bildung', 0)} Prozent der Streuung.`, `The difference is clear but explains only about ${SA.te('eta2_bildung', 0)} percent of the spread.`),
        P(`Mit ${SA.d('anova_bildung_df2', 0)} Freiheitsgraden im Nenner wird schon ein kleiner Unterschied signifikant. Die Größe liest man an eta², nicht an p.`, `With ${SA.e('anova_bildung_df2', 0)} degrees of freedom in the denominator even a small difference becomes significant. The size is read from eta squared, not from p.`), true),
      a(P(`Mit p ${SA.pd('anova_bildung_p')} ist der Effekt der Bildung groß und für die Praxis bedeutsam.`, `With p ${SA.pe('anova_bildung_p')} the effect of education is large and meaningful for practice.`),
        P(`Signifikanz ist nicht Bedeutsamkeit. Ein kleines p entsteht bei großer Stichprobe schon bei geringen Unterschieden, die praktisch kaum zählen.`, `Significance is not importance. A small p arises with a large sample even with slight differences that hardly matter in practice.`)),
      a(P(`Nur die höchste Bildungsstufe unterscheidet sich von den übrigen fünf Stufen.`, `Only the highest education level differs from the other five levels.`),
        P(`Die Varianzanalyse zeigt nur, dass nicht alle sechs Mittelwerte gleich sind. Welche Stufen sich unterscheiden, zeigen erst Paarvergleiche.`, `The analysis of variance only shows that not all six means are equal. Which levels differ is shown only by pairwise comparisons.`)),
      a(P(`Die Bildung verursacht ${SA.td('eta2_bildung', 1)} Prozent der Unterschiede im ACT zwischen den Personen.`, `Education causes ${SA.te('eta2_bildung', 1)} percent of the differences in the ACT between people.`),
        P(`Eta² beschreibt einen Zusammenhang, keine Wirkung. Bildung, Alter und Fähigkeiten hängen in den selbst berichteten Daten zusammen, und die Richtung der Wirkung bleibt offen.`, `Eta squared describes a relationship, not an effect. Education, age and abilities are related in the self-reported data, and the direction of effect stays open.`))
    ],
    hilfe: ['eta-quadrat', 'signifikanz'], belege: ['Cohen 1988', SOLL]
  },
  {
    id: 'psy2-sa-fehlend', thema: THEMA, fall: 'psy2-sa',
    stamm: P(`Das Beispiel hat 700 Personen, die Korrelation und die Regression stützen sich aber nur auf ${SA.d('reg_n', 0)}. Woran liegt das?`, `The example has 700 people, but the correlation and the regression are based on only ${SA.e('reg_n', 0)}. What is the reason?`),
    antworten: [
      a(P(`Wer bei einer verwendeten Angabe keinen Wert hat, wird ausgelassen (fallweiser Ausschluss).`, `Whoever lacks a value for one of the variables used is left out (listwise deletion).`),
        P(`Die Regression braucht von jeder Person alle Angaben. Fehlt ein ACT-Wert oder ein SAT-Wert, entfällt die Person; die Fallzahl ist dann kleiner als die Zeilenzahl.`, `The regression needs all values from each person. If an ACT or SAT value is missing, the person drops out; the number of cases is then smaller than the number of rows.`), true),
      a(P(`Die ${SA.d('reg_n', 0)} Personen wurden zufällig aus den 700 gezogen, um die Rechnung zu beschleunigen.`, `The ${SA.e('reg_n', 0)} people were drawn at random from the 700 to speed up the calculation.`),
        P(`Statable zieht keine Stichprobe von sich aus. Eine kleinere Fallzahl entsteht durch fehlende Werte, nicht durch eine Auswahl.`, `Statable does not draw a sample by itself. A smaller number of cases arises from missing values, not from a selection.`)),
      a(P(`Personen mit sehr hohen Werten werden als Ausreißer gestrichen, das macht die Rechnung stabiler.`, `People with very high values are removed as outliers, which makes the calculation more stable.`),
        P(`Ausreißer werden nur nach einer eigenen Entscheidung entfernt, und die Höchstwerte des SAT sind erreichbar. Die Differenz zu 700 kommt von fehlenden Angaben.`, `Outliers are removed only after a decision of their own, and the top scores of the SAT are attainable. The difference to 700 comes from missing values.`)),
      a(P(`Die Tabelle zählt nur Personen mit Hochschulbildung, denn nur sie haben beide Tests abgelegt.`, `The table counts only people with university education, because only they took both tests.`),
        P(`Die Bildungsstufe ist eine Spalte der Daten und wird für Korrelation und Regression nicht gebraucht. Ausgeschlossen werden Personen mit fehlenden Testwerten oder fehlendem Alter.`, `The education level is a column of the data and is not needed for correlation and regression. People with missing test values or missing age are excluded.`))
    ],
    hilfe: ['fehlende-werte-little-imputation', 'korrelation'], belege: ['Hilfe:fehlende-werte-little-imputation', SOLL]
  }
];
