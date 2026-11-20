/**
 * Fallreihen zu den Psychologie-Beispielen, Teil b (Stufe 6.3 „nutzen“): Skala Körperbild (`psy2-ko`), Protest gegen Benachteiligung, Moderation (`psy2-mod`) und Mediation (`psy2-med`).
 * Jede Zahl kommt aus lib/testdaten/ueben-erwartet-psych.json (R, vom Prüfer) über `Z(<beispiel>)` mit Platzhaltern (siehe fragen-psychologie-2-bau.ts).
 */
import { P } from '../i18n/laufzeit';
import type { Frage, ThemaModul } from './fragen';
import { a, THEMA, Z, tabelle, QU } from './fragen-psychologie-2-bau';

const KO = Z('koerperbild-skala'), GA = Z('diskriminierung-garcia');
const Q_KO = QU('Körperbild-Skala', 'Body image scale');
const Q_GA = QU('Protest gegen Benachteiligung', 'Protest against discrimination');
const SOLL = 'Code:lib/testdaten/ueben-erwartet-psych.json';

export const FAELLE_B: NonNullable<ThemaModul['FAELLE']> = {
  // ======================================================== Körperbild-Skala
  'psy2-ko': {
    titel: P('Messen sieben Fragen zum Drang zur Schlankheit dasselbe, und wie verlässlich ist die Summe? Skala mit sieben Fragen (je 0 bis 3) bei 191 Personen: Cronbachs Alpha, Trennschärfe und Alpha ohne die jeweilige Frage',
      'Do seven questions on the drive for thinness measure the same thing, and how dependable is the sum? Scale with seven questions (0 to 3 each) in 191 people: Cronbach alpha, item-total correlation and alpha without each question'),
    tabellen: [
      tabelle(P('Verlässlichkeit der ganzen Skala', 'Reliability of the whole scale'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['Cronbachs Alpha', KO.c('alpha', 2)], ['Personen', KO.c('n', 0)], ['Personen mit 0 bei allen sieben Fragen', KO.c('summe_null_alle_sieben_n', 0)]], Q_KO),
      tabelle(P('Trennschärfe je Frage und Alpha, wenn die Frage wegfiele', 'Item-total correlation per question and alpha if the question were dropped'), [P('Frage', 'Question'), P('Trennschärfe', 'Item-total correlation'), P('Alpha ohne die Frage', 'Alpha without the question')],
        Array.from({ length: 7 }, (_, j) => [`Frage ${j + 1}`, KO.c(`trennschaerfe_frage_${j + 1}`, 2), KO.c(`alpha_ohne_frage_${j + 1}`, 2)]), Q_KO)
    ]
  },
  // ======================================================== Moderation (Garcia)
  'psy2-mod': {
    titel: P('Mögen Frauen eine Kollegin mehr, die gegen eine ungerechte Beförderung protestiert, und hängt das vom Sexismus ab? Experiment mit drei Bedingungen (kein, individueller, gemeinsamer Protest): Gruppenvergleich der Sympathie und Moderation durch den Sexismus-Wert',
      'Do women like a colleague more who protests against an unfair promotion, and does that depend on sexism? Experiment with three conditions (no, individual, collective protest): group comparison of liking and moderation by the sexism score'),
    tabellen: [
      tabelle(P('Sympathie für die Kollegin (1 bis 7) nach Bedingung', 'Liking of the colleague (1 to 7) by condition'), [P('Bedingung', 'Condition'), P('Mittelwert', 'Mean')],
        [['Kein Protest', GA.c('mittel_sympathie_kein_protest', 2)], ['Individueller Protest', GA.c('mittel_sympathie_individueller_protest', 2)], ['Gemeinsamer Protest', GA.c('mittel_sympathie_gemeinsamer_protest', 2)], ['Welch-F', GA.c('welch_f', 2)], ['Welch-p', GA.c('welch_p', 3)]], Q_GA),
      tabelle(P('Moderation: Sympathie, vorhergesagt aus Protest, Sexismus und ihrem Produkt', 'Moderation: liking, predicted from protest, sexism and their product'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['b der Wechselwirkung Protest mal Sexismus', GA.c('moderation_b_wechselwirkung', 2)], ['Standardfehler', GA.c('moderation_se', 2)], ['p', GA.cp('moderation_p')], ['R² des Modells', GA.c('moderation_r2', 2)], ['Zuwachs an R² durch die Wechselwirkung', GA.c('moderation_r2_zuwachs', 2)]], Q_GA)
    ]
  },
  // ======================================================== Mediation (Garcia)
  'psy2-med': {
    titel: P('Wodurch wirkt ein Protest auf die Sympathie: Hält man die Reaktion für angemessener, und mag man die Kollegin darum mehr? Mediation mit Pfaden a und b, direktem und indirektem Effekt mit Bootstrap-Intervall',
      'Through what does a protest affect liking: does one find the reaction more appropriate, and therefore like the colleague more? Mediation with paths a and b, direct and indirect effect with bootstrap interval'),
    tabellen: [
      tabelle(P('Pfade der Mediation (Protest, Angemessenheit, Sympathie)', 'Paths of the mediation (protest, appropriateness, liking)'), [P('Pfad', 'Path'), P('Koeffizient', 'Coefficient'), P('p', 'p')],
        [['a: Protest auf Angemessenheit', GA.c('mediation_a', 2), GA.cp('mediation_p_a')], ['b: Angemessenheit auf Sympathie', GA.c('mediation_b', 2), GA.cp('mediation_p_b')], ['c: Gesamteffekt des Protests', GA.c('mediation_c', 2), GA.cp('mediation_p_c')], ['c\': direkter Effekt des Protests', GA.c('mediation_c_strich', 2), GA.cp('mediation_p_c_strich')]], Q_GA),
      tabelle(P('Indirekter Effekt a mal b mit Bootstrap-Intervall', 'Indirect effect a times b with bootstrap interval'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['Indirekter Effekt a mal b', GA.c('mediation_indirekt_ab', 2)], ['Intervall, untere Grenze', GA.c('mediation_bootstrap_ki_unten', 2)], ['Intervall, obere Grenze', GA.c('mediation_bootstrap_ki_oben', 2)]], Q_GA)
    ]
  }
};

export const FRAGEN_B: Frage[] = [
  // ---------------------------------------------------------------- Körperbild-Skala
  {
    id: 'psy2-ko-alpha', thema: THEMA, fall: 'psy2-ko',
    stamm: P(`Misst die Skala den Drang zur Schlankheit verlässlich? Für die sieben Fragen ist Cronbachs Alpha = ${KO.d('alpha', 2)}. Was sagt dieser Wert?`, `Does the scale measure the drive for thinness dependably? For the seven questions Cronbach alpha = ${KO.e('alpha', 2)}. What does this value say?`),
    antworten: [
      a(P(`Die Fragen hängen eng zusammen, die Skala misst zuverlässig; ihre Gültigkeit zeigt Alpha nicht.`, `The questions are closely related, the scale measures dependably; alpha does not show its validity.`),
        P(`Alpha beschreibt die innere Konsistenz, also die Zuverlässigkeit. Gültigkeit (Validität) braucht andere Belege, etwa Zusammenhänge mit verwandten Maßen.`, `Alpha describes internal consistency, that is reliability. Validity needs other evidence, for instance relationships with related measures.`), true),
      a(P(`Alpha von ${KO.d('alpha', 2)} zeigt, dass die sieben Fragen genau eine Eigenschaft messen, die Skala ist eindimensional.`, `An alpha of ${KO.e('alpha', 2)} shows that the seven questions measure exactly one trait, the scale is unidimensional.`),
        P(`Ein hohes Alpha belegt keine Eindimensionalität. Auch Skalen aus mehreren zusammenhängenden Teilen können hohe Werte erreichen; dafür dienen Faktorenanalyse und Omega.`, `A high alpha does not prove unidimensionality. Scales from several related parts can also reach high values; factor analysis and omega serve for that.`)),
      a(P(`Bei ${KO.td('alpha', 0)} Prozent der Personen stimmt die Einstufung durch die Skala.`, `For ${KO.te('alpha', 0)} percent of the people the classification by the scale is correct.`),
        P(`Alpha ist ein Koeffizient zwischen 0 und 1, kein Anteil richtig eingestufter Personen. Er beschreibt, wie viel der Streuung der Summenwerte wahre Unterschiede sind.`, `Alpha is a coefficient between 0 and 1, not a share of correctly classified people. It describes how much of the spread of the sum scores is true differences.`)),
      a(P(`Mit ${KO.d('alpha', 2)} ist die Skala gültig, weil der Wert über 0,70 liegt.`, `With ${KO.e('alpha', 2)} the scale is valid, because the value lies above 0.70.`),
        P(`Die Grenze von 0,70 ist eine Faustregel für Zuverlässigkeit, nicht für Gültigkeit. Eine zuverlässige Skala kann etwas ganz anderes messen als gedacht.`, `The limit of 0.70 is a rule of thumb for reliability, not for validity. A reliable scale can measure something quite different from what was intended.`))
    ],
    hilfe: ['reliabilitaet', 'eindimensionalitaet'], belege: ['Sijtsma 2009', SOLL]
  },
  {
    id: 'psy2-ko-schwach', thema: THEMA, fall: 'psy2-ko',
    stamm: P(`Frage ${KO.d('trennschaerfe_min_frage', 0)} hat mit ${KO.d('trennschaerfe_min', 2)} die niedrigste Trennschärfe, und ohne sie stiege Alpha auf ${KO.d('alpha_ohne_schwaechste_frage', 2)}. Was ist die passende Entscheidung?`, `Question ${KO.e('trennschaerfe_min_frage', 0)} has the lowest item-total correlation at ${KO.e('trennschaerfe_min', 2)}, and without it alpha would rise to ${KO.e('alpha_ohne_schwaechste_frage', 2)}. What is the fitting decision?`),
    antworten: [
      a(P(`Frage ${KO.d('trennschaerfe_min_frage', 0)} sofort streichen, denn eine Trennschärfe unter 0,50 macht die Frage ungültig.`, `Delete question ${KO.e('trennschaerfe_min_frage', 0)} at once, because an item-total correlation below 0.50 makes the question invalid.`),
        P(`Es gibt keine feste Grenze, ab der eine Frage ungültig ist. Werte um ${KO.d('trennschaerfe_min', 1)} gelten als mäßig; entscheidend sind Inhalt und Zweck der Skala.`, `There is no fixed limit from which a question is invalid. Values around ${KO.e('trennschaerfe_min', 1)} count as moderate; content and purpose of the scale are decisive.`)),
      a(P(`Inhalt und Gewinn abwägen: Alpha stiege nur von ${KO.d('alpha', 2)} auf ${KO.d('alpha_ohne_schwaechste_frage', 2)}.`, `Weigh content and gain: alpha would only rise from ${KO.e('alpha', 2)} to ${KO.e('alpha_ohne_schwaechste_frage', 2)}.`),
        P(`Der Gewinn an Alpha ist klein. Eine Frage, die einen Aspekt des Konstrukts abdeckt, wird nicht allein wegen einer niedrigeren Trennschärfe gestrichen.`, `The gain in alpha is small. A question that covers an aspect of the construct is not deleted merely because of a lower item-total correlation.`), true),
      a(P(`Frage ${KO.d('trennschaerfe_min_frage', 0)} behalten, denn bei Alpha über ${KO.d('alpha', 1)} darf keine Frage verändert werden.`, `Keep question ${KO.e('trennschaerfe_min_frage', 0)}, because with alpha above ${KO.e('alpha', 1)} no question may be changed.`),
        P(`Auch bei hohem Alpha lässt sich eine Skala prüfen und kürzen. Ein hoher Wert schließt Verbesserungen nicht aus, er macht sie nur weniger dringend.`, `Even with a high alpha a scale can be checked and shortened. A high value does not rule out improvements, it only makes them less urgent.`)),
      a(P(`Die Trennschärfe der Frage ${KO.d('trennschaerfe_min_frage', 0)} ist negativ und zeigt umgekehrte Formulierung, also umpolen.`, `The item-total correlation of question ${KO.e('trennschaerfe_min_frage', 0)} is negative and indicates reverse wording, so reverse it.`),
        P(`Die Trennschärfe der Frage ${KO.d('trennschaerfe_min_frage', 0)} ist positiv, ${KO.d('trennschaerfe_min', 2)}. Umpolen braucht man bei einem negativen Wert; hier ist die Frage nur schwächer mit dem Rest verbunden.`, `The item-total correlation of question ${KO.e('trennschaerfe_min_frage', 0)} is positive, ${KO.e('trennschaerfe_min', 2)}. Reversing is needed with a negative value; here the question is merely connected more weakly with the rest.`))
    ],
    hilfe: ['trennschaerfe', 'reliabilitaet'], belege: ['Sijtsma 2009', SOLL]
  },
  {
    id: 'psy2-ko-ohne', thema: THEMA, fall: 'psy2-ko',
    stamm: P(`Fiele Frage ${KO.d('trennschaerfe_max_frage', 0)} weg, sänke Alpha auf ${KO.d('alpha_ohne_frage_3', 2)}. Warum sinkt Alpha, obwohl dann weniger Fragen mitzählen?`, `If question ${KO.e('trennschaerfe_max_frage', 0)} were dropped, alpha would fall to ${KO.e('alpha_ohne_frage_3', 2)}. Why does alpha fall although fewer questions then count?`),
    antworten: [
      a(P(`Frage ${KO.d('trennschaerfe_max_frage', 0)} gehört mit ${KO.d('trennschaerfe_max', 2)} zu den Fragen, die am engsten mit dem Rest zusammenhängen.`, `Question ${KO.e('trennschaerfe_max_frage', 0)} is among the questions most closely related to the rest of the scale (${KO.e('trennschaerfe_max', 2)}).`),
        P(`Fragen mit hoher Trennschärfe halten die Skala zusammen. Fällt eine weg, verliert die Summe gemeinsame Information, und Alpha sinkt.`, `Questions with high item-total correlation hold the scale together. If one drops out, the sum loses shared information, and alpha falls.`), true),
      a(P(`Jede weggelassene Frage senkt Alpha, weil Alpha nur von der Zahl der Fragen abhängt.`, `Every dropped question lowers alpha, because alpha depends only on the number of questions.`),
        P(`Alpha hängt auch von den Zusammenhängen der Fragen ab. Bei der schwächsten Frage steigt es beim Weglassen sogar, von ${KO.d('alpha', 2)} auf ${KO.d('alpha_ohne_frage_1', 2)}.`, `Alpha also depends on the relationships between the questions. With the weakest question it even rises when dropped, from ${KO.e('alpha', 2)} to ${KO.e('alpha_ohne_frage_1', 2)}.`)),
      a(P(`Frage ${KO.d('trennschaerfe_max_frage', 0)} misst etwas anderes als die übrigen Fragen und stört darum die Skala.`, `Question ${KO.e('trennschaerfe_max_frage', 0)} measures something different from the other questions and therefore disturbs the scale.`),
        P(`Dann wäre die Trennschärfe niedrig, nicht die höchste der Skala. Eine hohe Trennschärfe zeigt, dass die Frage gut zum Rest passt.`, `Then the item-total correlation would be low, not the highest of the scale. A high item-total correlation shows that the question fits well with the rest.`)),
      a(P(`Das Alpha von ${KO.d('alpha_ohne_frage_3', 2)} ist ein Rechenfehler, Alpha kann beim Weglassen einer Frage nur steigen.`, `The alpha of ${KO.e('alpha_ohne_frage_3', 2)} is a calculation error, alpha can only rise when a question is dropped.`),
        P(`Beides trifft zu: Beim Weglassen kann Alpha steigen, wenn die Frage schwach ist, und fallen, wenn sie stark ist. Eine feste Richtung gibt es nicht.`, `Both occur: dropping a question can raise alpha if it is weak and lower it if it is strong. There is no fixed direction.`))
    ],
    hilfe: ['trennschaerfe', 'inter-item-korrelation'], belege: ['Sijtsma 2009', SOLL]
  },
  {
    id: 'psy2-ko-null', thema: THEMA, fall: 'psy2-ko',
    stamm: P(`Bei ${KO.d('summe_null_alle_sieben_n', 0)} von ${KO.d('n', 0)} Personen steht bei allen sieben Fragen eine 0. Was bedeutet das für die Auswertung der Summe?`, `In ${KO.e('summe_null_alle_sieben_n', 0)} of ${KO.e('n', 0)} people a 0 stands for all seven questions. What does this mean for the evaluation of the sum?`),
    antworten: [
      a(P(`Diese Personen haben die Fragen nicht beantwortet, ihre Werte fehlen und werden ausgelassen.`, `These people did not answer the questions, their values are missing and are left out.`),
        P(`Eine 0 ist ein gültiger Wert: kein Drang zur Schlankheit. Fehlende Werte wären leer oder markiert. Wer 0 als fehlend behandelt, verfälscht die Auswertung.`, `A 0 is a valid value: no drive for thinness. Missing values would be empty or marked. Treating 0 as missing distorts the evaluation.`)),
      a(P(`Die Summen häufen sich unten (Bodeneffekt), die Verteilung ist schief.`, `The sums pile up at the bottom (floor effect), the distribution is skewed.`),
        P(`Viele Personen am unteren Rand heißen: Die Skala unterscheidet dort nicht. Dann passen Verfahren ohne Normalverteilung oder eine Auswertung nach Gruppen besser.`, `Many people at the lower edge mean: the scale does not distinguish there. Then methods without normal distribution or an evaluation by groups fit better.`), true),
      a(P(`Die Summenwerte sind normalverteilt, weil die Mehrheit bei null liegt und wenige hoch.`, `The sum scores are normally distributed, because the majority lie at zero and a few high.`),
        P(`Eine Häufung am unteren Ende mit einem langen Schwanz nach oben ist das Bild einer schiefen Verteilung, nicht einer Normalverteilung.`, `A pile-up at the lower end with a long tail upwards is the picture of a skewed distribution, not of a normal distribution.`)),
      a(P(`Die ${KO.d('summe_null_alle_sieben_n', 0)} Personen haben zu wenig Streuung und verbessern darum Alpha.`, `The ${KO.e('summe_null_alle_sieben_n', 0)} people have too little spread and therefore improve alpha.`),
        P(`Personen mit gleichen Antworten tragen zur Streuung zwischen den Personen bei, indem sie einen Pol bilden. Ob sie Alpha heben oder senken, lässt sich so nicht sagen.`, `People with identical answers contribute to the spread between people by forming one pole. Whether they raise or lower alpha cannot be said this way.`))
    ],
    hilfe: ['antwortstufen', 'reliabilitaet'], belege: ['Hilfe:antwortstufen', SOLL]
  },
  {
    id: 'psy2-ko-itemzahl', thema: THEMA, fall: 'psy2-ko',
    stamm: P(`Eine Studierende liest Alpha = ${KO.d('alpha', 2)} bei nur 7 Fragen. Eine andere sagt, mit 20 Fragen wäre der Wert bei gleich guten Fragen noch höher. Wer hat recht?`, `One student reads alpha = ${KO.e('alpha', 2)} with only 7 questions. Another says that with 20 questions the value would be even higher with equally good questions. Who is right?`),
    antworten: [
      a(P(`Die zweite Person: Alpha steigt mit der Zahl der Fragen, auch bei gleichen Zusammenhängen.`, `The second person: alpha rises with the number of questions, even with the same relationships.`),
        P(`Alpha hängt von der Zahl der Fragen und ihrer mittleren Korrelation ab. Mit mehr gleich guten Fragen wächst es.`, `Alpha depends on the number of questions and their mean correlation. With more equally good questions it grows.`), true),
      a(P(`Die erste Person, denn Alpha ist von der Zahl der Fragen unabhängig und bleibt bei jeder Länge gleich.`, `The first person, because alpha is independent of the number of questions and stays the same at any length.`),
        P(`Alpha ist nicht unabhängig von der Länge. Bei gleichen Zusammenhängen steigt es mit jeder zusätzlichen Frage, auch wenn die Skala nichts Neues misst.`, `Alpha is not independent of length. With equal relationships it rises with every additional question, even if the scale measures nothing new.`)),
      a(P(`Keine von beiden, denn Alpha sinkt mit mehr Fragen, weil sich die Fehler addieren.`, `Neither of the two, because alpha falls with more questions, since the errors add up.`),
        P(`Bei der Summe addieren sich zwar die Fehler, aber auch die wahren Anteile, und diese wachsen stärker. Darum steigt die Zuverlässigkeit mit der Länge.`, `In the sum the errors do add up, but so do the true parts, and these grow more strongly. That is why reliability rises with length.`)),
      a(P(`Beide liegen falsch, denn Alpha zeigt nur, ob die Skala eindimensional ist, nicht ihre Zuverlässigkeit.`, `Both are wrong, because alpha only shows whether the scale is unidimensional, not its reliability.`),
        P(`Alpha ist ein Maß der Zuverlässigkeit (innere Konsistenz). Die Dimensionen einer Skala prüft man mit der Faktorenanalyse; ein hohes Alpha sagt darüber wenig.`, `Alpha is a measure of reliability (internal consistency). The dimensions of a scale are checked with factor analysis; a high alpha says little about them.`))
    ],
    hilfe: ['inter-item-korrelation', 'reliabilitaet'], belege: ['Sijtsma 2009', SOLL]
  },
  {
    id: 'psy2-ko-gueltig', thema: THEMA, fall: 'psy2-ko',
    stamm: P(`Die Skala hat Alpha = ${KO.d('alpha', 2)}. Eine Gruppe will daraus schließen, dass sie „Drang zur Schlankheit“ gültig misst. Was fehlt noch für diese Aussage?`, `The scale has alpha = ${KO.e('alpha', 2)}. A group wants to conclude from this that it measures "drive for thinness" validly. What is still missing for this statement?`),
    antworten: [
      a(P(`Belege zur Gültigkeit, etwa Zusammenhänge mit anderen Maßen.`, `Evidence on validity, for instance relationships with other measures.`),
        P(`Gültigkeit ist ein eigener Nachweis. Er stützt sich auf Inhalt, Zusammenhänge mit anderen Maßen und Gruppenvergleiche; Alpha beschreibt nur die Verlässlichkeit.`, `Validity is a proof of its own. It rests on content, relationships with other measures and group comparisons; alpha describes only dependability.`), true),
      a(P(`Nichts, denn ein Alpha über ${KO.d('alpha', 1)} bestätigt die Gültigkeit der Skala.`, `Nothing, because an alpha above ${KO.e('alpha', 1)} confirms the validity of the scale.`),
        P(`Alpha bestätigt keine Gültigkeit. Eine Skala kann sehr zuverlässig und doch ungültig sein, etwa wenn sie ein anderes Merkmal erfasst als beabsichtigt.`, `Alpha does not confirm validity. A scale can be very reliable and still invalid, for instance if it records a different trait from the one intended.`)),
      a(P(`Eine größere Stichprobe, denn mit mehr als ${KO.d('n', 0)} Personen wird die Skala gültig.`, `A larger sample, because with more than ${KO.e('n', 0)} people the scale becomes valid.`),
        P(`Mehr Personen machen eine Schätzung genauer, aber nicht gültiger. Gültigkeit hängt davon ab, was die Skala misst, nicht von der Zahl der Befragten.`, `More people make an estimate more precise, but not more valid. Validity depends on what the scale measures, not on the number of respondents.`)),
      a(P(`Ein signifikanter Test für Alpha, denn erst ein p unter 0,05 belegt die Gültigkeit.`, `A significant test for alpha, because only a p below 0.05 documents validity.`),
        P(`Ein Test auf Alpha prüft höchstens, ob es von null abweicht, und auch das sagt nichts über Gültigkeit. Ein p-Wert ersetzt keinen inhaltlichen Nachweis.`, `A test of alpha at most checks whether it differs from zero, and even that says nothing about validity. A p value does not replace proof in content.`))
    ],
    hilfe: ['validitaet', 'reliabilitaet'], belege: ['Sijtsma 2009', SOLL]
  },

  // ---------------------------------------------------------------- Moderation
  {
    id: 'psy2-mod-gruppen', thema: THEMA, fall: 'psy2-mod',
    stamm: P(`Mögen die Frauen die protestierende Kollegin mehr? Die Mittelwerte der Sympathie sind ${GA.d('mittel_sympathie_kein_protest', 2)}, ${GA.d('mittel_sympathie_individueller_protest', 2)} und ${GA.d('mittel_sympathie_gemeinsamer_protest', 2)}, Welch-F(${GA.d('welch_df1', 0)}; ${GA.d('welch_df2', 1)}) = ${GA.d('welch_f', 2)}, p ${GA.pd('welch_p')}. Wie ist das zu lesen?`, `Do the women like the protesting colleague more? The means of liking are ${GA.e('mittel_sympathie_kein_protest', 2)}, ${GA.e('mittel_sympathie_individueller_protest', 2)} and ${GA.e('mittel_sympathie_gemeinsamer_protest', 2)}, Welch F(${GA.e('welch_df1', 0)}, ${GA.e('welch_df2', 1)}) = ${GA.e('welch_f', 2)}, p ${GA.pe('welch_p')}. How is this to be read?`),
    antworten: [
      a(P(`Mit p ${GA.pd('welch_p')} ist der Unterschied zwischen den Bedingungen nicht deutlich belegt; „kein Effekt“ folgt daraus nicht.`, `With p ${GA.pe('welch_p')} the difference between the conditions is not clearly documented; "no effect" does not follow from it.`),
        P(`Ein p knapp über 0,05 zeigt einen unklaren Befund. Der Unterschied von etwa einem halben Punkt zugunsten des Protests ist in den Mittelwerten da.`, `A p just above 0.05 shows an unclear finding. The difference of about half a point in favour of protest is there in the means.`), true),
      a(P(`Mit ${GA.td('welch_p', 1)} Prozent Wahrscheinlichkeit gibt es keinen Unterschied zwischen den Bedingungen.`, `With ${GA.te('welch_p', 1)} percent probability there is no difference between the conditions.`),
        P(`Der p-Wert ist nicht die Wahrscheinlichkeit der Nullhypothese. Er sagt, wie gut die Daten zu gleichen Mittelwerten passen, nicht wie wahrscheinlich diese Annahme ist.`, `The p value is not the probability of the null hypothesis. It says how well the data fit equal means, not how probable this assumption is.`)),
      a(P(`Der individuelle Protest wird mit ${GA.d('mittel_sympathie_individueller_protest', 2)} nachweislich mehr gemocht als kein Protest.`, `Individual protest is demonstrably liked more with ${GA.e('mittel_sympathie_individueller_protest', 2)} than no protest.`),
        P(`Der Test zeigt, dass ein Unterschied nicht deutlich belegt ist. Ein höherer Mittelwert der Stichprobe ist noch kein Nachweis für einen höheren Wert in der Grundgesamtheit.`, `The test shows that a difference is not clearly documented. A higher sample mean is not yet proof of a higher value in the population.`)),
      a(P(`Die drei Bedingungen sind gleich, weil das Ergebnis nicht signifikant ist und die Welch-Variante vorsichtig rechnet.`, `The three conditions are equal, because the result is not significant and the Welch variant calculates cautiously.`),
        P(`Nicht signifikant heißt nicht gleich. Die Welch-Variante schützt vor falschen Rechenannahmen, sie macht aus einem unklaren Befund keinen Beleg für Gleichheit.`, `Not significant does not mean equal. The Welch variant protects against wrong calculation assumptions, it does not turn an unclear finding into proof of equality.`))
    ],
    hilfe: ['p-wert', 'welch-anova'], belege: ['Haller und Krauss 2002', SOLL]
  },
  {
    id: 'psy2-mod-wechsel', thema: THEMA, fall: 'psy2-mod',
    stamm: P(`In der Moderation hat die Wechselwirkung Protest mal Sexismus b = ${GA.d('moderation_b_wechselwirkung', 2)} (Standardfehler ${GA.d('moderation_se', 2)}), p ${GA.pd('moderation_p')}. Was zeigt sie?`, `In the moderation the interaction protest times sexism has b = ${GA.e('moderation_b_wechselwirkung', 2)} (standard error ${GA.e('moderation_se', 2)}), p ${GA.pe('moderation_p')}. What does it show?`),
    antworten: [
      a(P(`Die Wirkung des Protests hängt vom Sexismus-Wert ab und wächst bei höherem Wert.`, `The effect of protest depends on the sexism score and grows with it.`),
        P(`Eine Wechselwirkung heißt, dass der Effekt einer Größe von der Stufe einer zweiten abhängt. Das positive b zeigt, dass der Protest bei höherem Sexismus mehr Sympathie bringt.`, `An interaction means that the effect of one variable depends on the level of a second. The positive b shows that protest brings more liking with higher sexism.`), true),
      a(P(`Protest und Sexismus hängen zusammen, das zeigt die Wechselwirkung.`, `Protest and sexism are related, that is what the interaction shows.`),
        P(`Eine Wechselwirkung ist kein Zusammenhang zwischen zwei Einflüssen. Sie beschreibt, wie sich die Wirkung des einen mit dem anderen ändert; zwei Einflüsse können dabei unkorreliert sein.`, `An interaction is not a relationship between two predictors. It describes how the effect of one changes with the other; two predictors can be uncorrelated in this.`)),
      a(P(`Die Wechselwirkung ist nur gültig, wenn auch die beiden Haupteffekte signifikant sind.`, `The interaction is only valid if the two main effects are significant as well.`),
        P(`Eine Wechselwirkung kann auch ohne signifikante Haupteffekte bestehen, und umgekehrt. Sie ist ein eigener Term im Modell mit eigenem Test.`, `An interaction can exist even without significant main effects, and vice versa. It is a term of its own in the model with its own test.`)),
      a(P(`Wegen p ${GA.pd('moderation_p')} liegt die Wahrscheinlichkeit für einen Zufallsbefund bei unter ${GA.td('moderation_p', 1)} Prozent.`, `Because of p ${GA.pe('moderation_p')} the probability of a chance finding lies below ${GA.te('moderation_p', 1)} percent.`),
        P(`Der p-Wert gibt keine Wahrscheinlichkeit dafür an, dass der Befund Zufall ist. Er sagt, wie selten solche Daten bei fehlender Wechselwirkung wären.`, `The p value gives no probability that the finding is chance. It says how rare such data would be without an interaction.`))
    ],
    hilfe: ['moderation', 'wechselwirkung'], belege: ['Haller und Krauss 2002', SOLL]
  },
  {
    id: 'psy2-mod-verdeckt', thema: THEMA, fall: 'psy2-mod',
    stamm: P(`Der Gruppenvergleich ergibt p ${GA.pd('welch_p')}, die Wechselwirkung dagegen p ${GA.pd('moderation_p')}. Wie passt das zusammen?`, `The group comparison gives p ${GA.pe('welch_p')}, the interaction on the other hand p ${GA.pe('moderation_p')}. How do these fit together?`),
    antworten: [
      a(P(`Der Protest wirkt bei niedrigem Sexismus kaum, bei hohem stark; der Durchschnitt verwischt das.`, `Protest hardly works with low sexism, strongly with high; the average blurs this.`),
        P(`Die Moderation zeigt, für wen ein Effekt besteht. Ein Gruppenvergleich ohne den Moderator mittelt über alle Frauen und kann einen Effekt in einer Teilgruppe verdecken.`, `The moderation shows for whom an effect exists. A group comparison without the moderator averages over all women and can hide an effect in a subgroup.`), true),
      a(P(`Der Gruppenvergleich war falsch gerechnet, die Moderation hat ihn korrigiert.`, `The group comparison was calculated wrongly, the moderation corrected it.`),
        P(`Beide Rechnungen sind richtig, sie beantworten verschiedene Fragen: im Durchschnitt über alle Frauen, und abhängig vom Sexismus-Wert.`, `Both calculations are correct, they answer different questions: on average over all women, and depending on the sexism score.`)),
      a(P(`Zwei Tests derselben Daten dürfen nicht verschieden ausfallen; einer von beiden ist ein Zufallsbefund.`, `Two tests of the same data must not come out differently; one of them is a chance finding.`),
        P(`Verschiedene Tests prüfen verschiedene Nullhypothesen und können verschieden ausfallen. Allerdings erhöht jeder weitere Test das Risiko eines falsch positiven Befunds, darum gehört die Moderation vorab geplant.`, `Different tests check different null hypotheses and can come out differently. However, every further test raises the risk of a false positive finding, so the moderation belongs to the plan beforehand.`)),
      a(P(`Der kleinere p-Wert gilt, weil er zeigt, dass die Moderation mehr Teststärke hat.`, `The smaller p value counts, because it shows that the moderation has more power.`),
        P(`Ein kleineres p beweist keine größere Teststärke und macht eine Rechnung nicht richtiger. Welche Rechnung passt, richtet sich nach der Frage und der vorher gewählten Auswertung.`, `A smaller p does not prove greater power and does not make a calculation more correct. Which calculation fits depends on the question and the analysis chosen beforehand.`))
    ],
    hilfe: ['moderation', 'wechselwirkung'], belege: ['Hayes 2022', SOLL]
  },

  // ---------------------------------------------------------------- Mediation
  {
    id: 'psy2-med-pfade', thema: THEMA, fall: 'psy2-med',
    stamm: P(`Wodurch wirkt der Protest auf die Sympathie? In der Tabelle ist a = ${GA.d('mediation_a', 2)} und b = ${GA.d('mediation_b', 2)}. Was bedeuten die beiden Pfade?`, `Through what does protest affect liking? In the table a = ${GA.e('mediation_a', 2)} and b = ${GA.e('mediation_b', 2)}. What do the two paths mean?`),
    antworten: [
      a(P(`a: Protest geht mit ${GA.d('mediation_a', 2)} Punkten mehr Angemessenheit einher; b: je Skalenpunkt mehr Angemessenheit ${GA.d('mediation_b', 2)} Punkte mehr Sympathie.`, `a: protest goes with ${GA.e('mediation_a', 2)} points more appropriateness; b: each point more goes with ${GA.e('mediation_b', 2)} points more liking.`),
        P(`Pfad a verbindet die Bedingung mit dem Zwischenschritt, Pfad b den Zwischenschritt mit dem Ergebnis, bei Kontrolle des Protests. Zusammen ergeben sie den indirekten Weg.`, `Path a links the condition with the intermediate step, path b the intermediate step with the outcome, controlling for protest. Together they make up the indirect route.`), true),
      a(P(`a: Angemessenheit auf Sympathie, b: Protest auf Angemessenheit; die Pfade sind nur anders benannt.`, `a: appropriateness on liking, b: protest on appropriateness; the paths are merely named differently.`),
        P(`Die Benennung folgt der Reihenfolge der Kausalkette: a ist der erste Schritt von der Bedingung zum Mediator, b der zweite vom Mediator zum Ergebnis. Vertauscht man sie, ändert sich die Bedeutung.`, `The naming follows the order of the causal chain: a is the first step from condition to mediator, b the second from mediator to outcome. If swapped, the meaning changes.`)),
      a(P(`a und b sind zwei Gruppenmittelwerte, nämlich der von Protest und der von keinem Protest.`, `a and b are two group means, namely that of protest and that of no protest.`),
        P(`Die Pfade sind Regressionskoeffizienten, keine Mittelwerte. Jeder gibt an, um wie viele Punkte sich eine Größe ändert, wenn die andere um eine Einheit steigt.`, `The paths are regression coefficients, not means. Each states by how many points one variable changes when the other rises by one unit.`)),
      a(P(`Die Summe a plus b ergibt den Gesamteffekt des Protests auf die Sympathie.`, `The sum of a plus b gives the total effect of protest on liking.`),
        P(`Der indirekte Effekt ist das Produkt a mal b, nicht die Summe. Der Gesamteffekt c ist die Summe aus indirektem Effekt und direktem Effekt c-Strich.`, `The indirect effect is the product a times b, not the sum. The total effect c is the sum of the indirect effect and the direct effect c prime.`))
    ],
    hilfe: ['mediation', 'koeffizient-b'], belege: ['Hayes 2022', SOLL]
  },
  {
    id: 'psy2-med-direkt', thema: THEMA, fall: 'psy2-med',
    stamm: P(`Der Gesamteffekt des Protests ist c = ${GA.d('mediation_c', 2)} (p ${GA.pd('mediation_p_c')}), der direkte Effekt nach Berücksichtigung der Angemessenheit nur noch c' = ${GA.d('mediation_c_strich', 2)} (p ${GA.pd('mediation_p_c_strich')}). Was folgt?`, `The total effect of protest is c = ${GA.e('mediation_c', 2)} (p ${GA.pe('mediation_p_c')}), the direct effect after taking appropriateness into account only c' = ${GA.e('mediation_c_strich', 2)} (p ${GA.pe('mediation_p_c_strich')}). What follows?`),
    antworten: [
      a(P(`Der direkte Effekt ist nicht deutlich von null; der Protest wirkt weitgehend über die Angemessenheit.`, `The direct effect is not clearly different from zero; protest acts largely through appropriateness.`),
        P(`c ist der Gesamteffekt; ob nach dem Mediator noch etwas bleibt, sagt c'. Ein kleiner Rest spricht für einen weitgehend indirekten Weg („vollständige Mediation“ nur vorsichtig).`, `c is the total effect; whether something remains after the mediator is told by c'. A small remainder speaks for a largely indirect route ("full mediation" only with care).`), true),
      a(P(`Mit p ${GA.pd('mediation_p_c_strich')} ist erwiesen, dass der Protest keinen direkten Einfluss auf die Sympathie hat.`, `With p ${GA.pe('mediation_p_c_strich')} it is established that protest has no direct influence on liking.`),
        P(`Ein großes p belegt nicht, dass ein Effekt null ist. Es zeigt nur, dass die Daten keinen direkten Effekt belegen; ein kleiner Rest bleibt möglich.`, `A large p does not prove that an effect is zero. It only shows that the data do not document a direct effect; a small remainder is possible.`)),
      a(P(`Das negative Vorzeichen von c' heißt, dass der Protest die Sympathie senkt.`, `The negative sign of c' means that protest lowers liking.`),
        P(`Der Wert ${GA.d('mediation_c_strich', 2)} ist von null kaum verschieden (p ${GA.pd('mediation_p_c_strich')}). Sein Vorzeichen ist bei so einem Wert nicht zu deuten.`, `The value ${GA.e('mediation_c_strich', 2)} hardly differs from zero (p ${GA.pe('mediation_p_c_strich')}). Its sign cannot be interpreted with such a value.`)),
      a(P(`Der Gesamteffekt c ist falsch, weil er größer als c' ist; beide müssten gleich sein.`, `The total effect c is wrong because it is larger than c'; both would have to be equal.`),
        P(`c und c' unterscheiden sich gerade deshalb, weil ein Teil des Effekts über den Mediator läuft. Der Unterschied c minus c' ist der indirekte Effekt.`, `c and c' differ precisely because part of the effect runs through the mediator. The difference c minus c' is the indirect effect.`))
    ],
    hilfe: ['mediation', 'p-wert'], belege: ['Hayes 2022', SOLL]
  },
  {
    id: 'psy2-med-bootstrap', thema: THEMA, fall: 'psy2-med',
    stamm: P(`Der indirekte Effekt ist a mal b = ${GA.d('mediation_indirekt_ab', 2)}, das Bootstrap-Intervall reicht von ${GA.d('mediation_bootstrap_ki_unten', 2)} bis ${GA.d('mediation_bootstrap_ki_oben', 2)}. Wie ist das Intervall zu lesen?`, `The indirect effect is a times b = ${GA.e('mediation_indirekt_ab', 2)}, the bootstrap interval runs from ${GA.e('mediation_bootstrap_ki_unten', 2)} to ${GA.e('mediation_bootstrap_ki_oben', 2)}. How is the interval to be read?`),
    antworten: [
      a(P(`Der wahre indirekte Effekt liegt mit 95 Prozent Wahrscheinlichkeit zwischen ${GA.d('mediation_bootstrap_ki_unten', 2)} und ${GA.d('mediation_bootstrap_ki_oben', 2)}.`, `The true indirect effect lies with 95 percent probability between ${GA.e('mediation_bootstrap_ki_unten', 2)} and ${GA.e('mediation_bootstrap_ki_oben', 2)}.`),
        P(`Ein Konfidenzintervall ist keine Wahrscheinlichkeitsaussage über den wahren Wert. 95 Prozent beschreibt das Verfahren: Bei vielen Wiederholungen enthielten etwa 95 Prozent der Intervalle den wahren Wert.`, `A confidence interval is not a probability statement about the true value. 95 percent describes the procedure: in many repetitions about 95 percent of the intervals would contain the true value.`)),
      a(P(`Das Intervall schließt 0 nicht ein; der indirekte Effekt weicht von null ab.`, `The interval does not include 0; the indirect effect differs from zero.`),
        P(`Der Bootstrap zieht viele Stichproben aus den Daten, denn das Produkt a mal b ist nicht normalverteilt. Schließt es 0 nicht ein, spricht das bei diesem Niveau dafür, dass der indirekte Effekt nicht null ist (ohne kausalen Beleg).`, `The bootstrap draws many samples from the data and forms an interval from them, because the product a times b is not normally distributed. If it does not include 0, that speaks at this level for the indirect effect not being zero (without causal proof).`), true),
      a(P(`Das Intervall zeigt, dass ${GA.td('mediation_indirekt_ab', 0)} Prozent des Gesamteffekts über die Angemessenheit laufen.`, `The interval shows that ${GA.te('mediation_indirekt_ab', 0)} percent of the total effect runs through appropriateness.`),
        P(`Das Intervall gibt die Unsicherheit der Schätzung an, keinen Anteil. Ein Anteil des indirekten Effekts am Gesamteffekt wäre eine eigene Rechnung.`, `The interval gives the uncertainty of the estimate, not a share. A share of the indirect effect in the total effect would be a calculation of its own.`)),
      a(P(`Das Intervall ist breiter als der Effekt selbst und darum wertlos.`, `The interval is wider than the effect itself and therefore worthless.`),
        P(`Die Breite des Intervalls zeigt die Genauigkeit der Schätzung, nicht ihren Wert. Entscheidend ist, ob es 0 enthält; hier tut es das nicht.`, `The width of the interval shows the precision of the estimate, not its worth. What matters is whether it contains 0; here it does not.`))
    ],
    hilfe: ['mediation', 'konfidenzintervall'], belege: ['Hoekstra et al. 2014', SOLL]
  },
  {
    id: 'psy2-med-kausal', thema: THEMA, fall: 'psy2-med',
    stamm: P(`Der Protest war den Frauen zufällig zugeteilt, die Angemessenheit wurde gemessen. Beweist die Mediation (indirekter Effekt ${GA.d('mediation_indirekt_ab', 2)}), dass die Angemessenheit der Zwischenschritt ist?`, `The protest was randomly assigned to the women, the appropriateness was measured. Does the mediation (indirect effect ${GA.e('mediation_indirekt_ab', 2)}) prove that appropriateness is the intermediate step?`),
    antworten: [
      a(P(`Ja, denn der indirekte Effekt ist von null verschieden, damit ist der Zwischenschritt gesichert.`, `Yes, because the indirect effect differs from zero, so the intermediate step is established.`),
        P(`Aus einem signifikanten indirekten Effekt folgt noch keine Ursache. Der Zusammenhang zwischen Angemessenheit und Sympathie kann auch von einer dritten Größe stammen.`, `A significant indirect effect does not yet imply a cause. The relationship between appropriateness and liking can also come from a third variable.`)),
      a(P(`Nein; nur der Protest ist zufällig zugeteilt, bei der Angemessenheit wirken andere Einflüsse mit.`, `No; only protest is randomly assigned, other influences act on appropriateness.`),
        P(`Bei der Randomisierung entfällt eine Störung des ersten Pfads, aber nicht des zweiten. Dass die Angemessenheit der Zwischenschritt ist, braucht eine Begründung oder eine Studie, die sie selbst verändert.`, `Randomisation removes confounding of the first path but not of the second. That appropriateness is the intermediate step needs a justification or a study that changes it itself.`), true),
      a(P(`Ja, denn der Protest war zufällig zugeteilt, und damit ist jede Teilbeziehung der Studie ursächlich.`, `Yes, because protest was randomly assigned, and so every partial relationship in the study is causal.`),
        P(`Die Zufallszuteilung sichert die Ursache nur für den zugeteilten Faktor. Beziehungen zwischen gemessenen Größen bleiben Zusammenhänge.`, `Random assignment secures the cause only for the assigned factor. Relationships between measured variables remain associations.`)),
      a(P(`Nein, denn eine Mediation mit nur einem Zwischenschritt kann Ursachen grundsätzlich nicht prüfen.`, `No, because a mediation with only one intermediate step cannot test causes at all.`),
        P(`Eine Mediation kann zu einer ursächlichen Erklärung beitragen, wenn die Annahmen erfüllt sind. Mit einem Zwischenschritt ist sie in vielen Studien üblich; ihre Annahmen müssen aber begründet werden.`, `A mediation can contribute to a causal explanation when its assumptions are met. With one intermediate step it is common in many studies; its assumptions must be justified, though.`))
    ],
    hilfe: ['mediation', 'zusammenhang-ursache'], belege: ['Hayes 2022', SOLL]
  }
];
