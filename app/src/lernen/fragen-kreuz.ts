/**
 * Üben: Kommt etwas in Gruppen unterschiedlich oft vor? (Kreuztabelle, Chi-Quadrat-Test, Cramérs V, Odds Ratio, relatives Risiko, erwartete Häufigkeiten).
 * Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R,
 * Daten: datasets::HairEyeColor, UCBAdmissions, Titanic).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, zd, ze, zn, zp } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const HX = ['frage-kreuz', 'chi-quadrat'];

const QUELLE_HAAR = P(
  `Daten: datasets::HairEyeColor (Snee 1974; Teil von R, Lizenz GPL), ${zn('kh_n')} Studierende, Haar- und Augenfarbe. Chi-Quadrat-Test, berechnet mit R.`,
  `Data: datasets::HairEyeColor (Snee 1974; part of R, licence GPL), ${zn('kh_n')} students, hair and eye colour. Chi-square test, computed with R.`);
const QUELLE_UCB = P(
  'Daten: datasets::UCBAdmissions (Bickel, Hammel und O\'Connell 1975; Teil von R, Lizenz GPL), Bewerbungen im Herbst 1973 an sechs Fachbereichen (A bis F). Berechnet mit R.',
  'Data: datasets::UCBAdmissions (Bickel, Hammel and O\'Connell 1975; part of R, licence GPL), applications in autumn 1973 to six departments (A to F). Computed with R.');
const QUELLE_TITANIC = P(
  'Daten: datasets::Titanic (British Board of Trade 1990, Dawson 1995; Teil von R, Lizenz GPL), erwachsene Reisende und Besatzung. Berechnet mit R.',
  'Data: datasets::Titanic (British Board of Trade 1990, Dawson 1995; part of R, licence GPL), adult passengers and crew. Computed with R.');

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'kr-haar': {
    titel: P(`${zn('kh_n')} Studierende: Haarfarbe (Zeilen: Black = schwarz, Brown = braun, Red = rot, Blond = blond) und Augenfarbe (Spalten: Brown = braun, Blue = blau, Hazel = haselnussbraun, Green = grün)`,
      `${zn('kh_n')} students: hair colour (rows: Black, Brown, Red, Blond) and eye colour (columns: Brown, Blue, Hazel, Green)`),
    tabellen: [
      tab('kr-haar.0', [P('Haar (Zeilen), Augen (Spalten)', 'Hair (rows), eyes (columns)'), P('Brown', 'Brown'), P('Blue', 'Blue'), P('Hazel', 'Hazel'), P('Green', 'Green'), P('Summe', 'Total')], QUELLE_HAAR, P('Beobachtete Häufigkeiten', 'Observed frequencies')),
      tab('kr-haar.1', [P('χ²', 'χ²'), P('Freiheitsgrade', 'Degrees of freedom'), P('Sig.', 'Sig.'), P('Cramérs V', 'Cramér\'s V'), P('Kleinste erwartete Häufigkeit', 'Smallest expected frequency')], QUELLE_HAAR, P('Chi-Quadrat-Test auf Unabhängigkeit', 'Chi-square test of independence')),
      tab('kr-haar.2', [P('Haar', 'Hair'), P('Augen', 'Eyes'), P('Beobachtet', 'Observed'), P('Erwartet bei Unabhängigkeit', 'Expected under independence'), P('Standardisiertes Residuum', 'Standardised residual')], QUELLE_HAAR, P('Vier auffällige Zellen', 'Four conspicuous cells'))
    ]
  },
  'kr-ucb': {
    titel: P('Bewerbungen an einer Universität im Herbst 1973 nach Geschlecht (Male = Männer, Female = Frauen) und Fachbereich A bis F', 'Applications to a university in autumn 1973 by sex (Male, Female) and department A to F'),
    tabellen: [
      tab('kr-ucb.0', [P('Geschlecht', 'Sex'), P('Bewerbungen', 'Applications'), P('Zugelassen', 'Admitted'), P('Anteil zugelassen (Prozent)', 'Share admitted (percent)')], QUELLE_UCB, P('Alle Fachbereiche zusammen', 'All departments together')),
      tab('kr-ucb.1', [P('Fachbereich', 'Department'), P('Männer: Bewerbungen', 'Men: applications'), P('Männer: zugelassen (Prozent)', 'Men: admitted (percent)'), P('Frauen: Bewerbungen', 'Women: applications'), P('Frauen: zugelassen (Prozent)', 'Women: admitted (percent)')], QUELLE_UCB, P('Nach Fachbereichen getrennt', 'Separately by department'))
    ]
  },
  'kr-titanic': {
    titel: P('Erwachsene Reisende und Besatzung der Titanic nach Geschlecht und Überleben', 'Adult passengers and crew of the Titanic by sex and survival'),
    tabellen: [
      tab('kr-titanic.0', [P('Geschlecht', 'Sex'), P('Überlebt', 'Survived'), P('Gestorben', 'Died'), P('Anteil überlebt', 'Share survived')], QUELLE_TITANIC, P('Häufigkeiten und Anteile', 'Frequencies and shares')),
      tab('kr-titanic.1', [P('Maß (Frauen gegen Männer)', 'Measure (women against men)'), P('Wert', 'Value')], QUELLE_TITANIC, P('RD = Risikodifferenz, RR = relatives Risiko, OR = Odds Ratio', 'RD = risk difference, RR = relative risk, OR = odds ratio'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Fall A: Haar- und Augenfarbe ----
  {
    id: 'kr-a-pruefung', thema: 'kreuz', fall: 'kr-haar',
    stamm: P('Was prüft der Chi-Quadrat-Test hier?', 'What does the chi-square test check here?'),
    antworten: [
      a(P('Ob Haarfarbe und Augenfarbe in der Population unabhängig sind', 'Whether hair and eye colour are independent in the population'),
        P('Die Nullhypothese heißt: unabhängig. Verworfen wird sie, wenn die beobachteten Häufigkeiten stark von denen bei Unabhängigkeit abweichen.', 'The null hypothesis says independent. It is rejected when the observed frequencies depart strongly from those under independence.'), true),
      a(P('Ob die vier Haarfarben in der Population gleich häufig vorkommen', 'Whether the four hair colours occur equally often in the population'),
        P('Die Gleichverteilung der Häufigkeiten prüft ein Anpassungstest, nicht der Test auf Zusammenhang.', 'The equal distribution of frequencies is checked by a goodness-of-fit test, not by the test of association.')),
      a(P('Welche Haarfarbe am stärksten mit welcher Augenfarbe zusammenhängt', 'Which hair colour is most strongly related to which eye colour'),
        P('Der globale Test zeigt, dass ein Zusammenhang besteht, nicht welche Kombination ihn trägt.', 'The global test shows that a relation exists, not which combination carries it.'))
    ],
    hilfe: HX, karte: 'kreuz', belege: ['wissen:kreuz-chi2-berechnung', 'wissen:kreuz-chi2-global', 'Bortz und Schuster']
  },
  {
    id: 'kr-a-erwartet', thema: 'kreuz', fall: 'kr-haar',
    stamm: P('Wie wird die erwartete Häufigkeit der Zelle „schwarze Haare, blaue Augen“ berechnet?', 'How is the expected frequency of the cell „black hair, blue eyes“ calculated?'),
    antworten: [
      a(P('Zeilensumme mal Spaltensumme durch Gesamtzahl: 108 mal 215 durch 592', 'Row total times column total over the grand total: 108 times 215 over 592'),
        P(`Bei Unabhängigkeit verteilt sich jede Zeile wie die Gesamtheit. Das ergibt rund ${zd('kh_e_sb', 1)}; beobachtet sind 20.`, `Under independence each row is distributed like the whole. That gives about ${ze('kh_e_sb', 1)}; 20 are observed.`), true),
      a(P('Zahl der Personen mit schwarzen Haaren geteilt durch die Zahl der Zellen der Tabelle', 'Number of people with black hair divided by the number of cells of the table'),
        P('Die erwartete Häufigkeit hängt von beiden Randsummen ab, nicht nur von einer Zeile.', 'The expected frequency depends on both marginal totals, not on a single row.')),
      a(P('Zeilensumme geteilt durch Spaltensumme, mit der Gesamtzahl multipliziert', 'Row total divided by column total, multiplied by the grand total'),
        P('Diese Rechnung ergäbe einen anderen Wert. Es braucht Zeilensumme mal Spaltensumme durch Gesamtzahl.', 'This calculation would give a different value. It takes row total times column total divided by the grand total.'))
    ],
    hilfe: HX, karte: 'kreuz', belege: ['wissen:kreuz-chi2-berechnung', 'Bortz und Schuster']
  },
  {
    id: 'kr-a-staerke', thema: 'kreuz', fall: 'kr-haar',
    stamm: P(`Das χ² ist ${zd('kh_chi', 2)}, p kleiner als 0,001. Zeigt das einen starken Zusammenhang?`, `The χ² is ${ze('kh_chi', 2)}, p below 0.001. Does that show a strong relation?`),
    antworten: [
      a(P(`Nicht aus χ² allein, denn χ² wächst mit n. Cramérs V zeigt die Stärke (hier ${zd('kh_v', 3)})`, `Not from χ² alone, since χ² grows with n. Cramér's V shows the strength (here ${ze('kh_v', 3)})`),
        P('χ² hängt von der Zahl der Befragten ab. Cramérs V liegt zwischen 0 und 1 und teilt diese Zahl heraus.', 'χ² depends on the number of respondents. Cramér\'s V lies between 0 and 1 and divides this number out.'), true),
      a(P('Ja, denn χ² misst die Stärke des Zusammenhangs und ist hier sehr groß, wie die Tabelle zeigt', 'Yes, since χ² measures the strength of the relation and is very large here, as the table shows'),
        P('χ² hängt von der Zahl der Befragten ab und taugt deshalb nicht als Stärkemaß.', 'χ² depends on the number of respondents and therefore does not serve as a measure of strength.')),
      a(P('Der p-Wert unter 0,001 zeigt einen starken Zusammenhang zwischen Haar- und Augenfarbe', 'A p below 0.001 shows a strong relation between hair and eye colour'),
        P('Der p-Wert sagt, ob ein Zusammenhang gesichert ist, nicht wie stark er ist.', 'The p value says whether a relation is established, not how strong it is.'))
    ],
    hilfe: [...HX, 'zusammenhangsmasse'], karte: 'kreuz', belege: ['wissen:kreuz-chi2-waechst-mit-n', 'wissen:kreuz-kontingenzkoeffizient', 'wissen:effekt-chi2-w-phi', 'Bortz und Schuster']
  },
  {
    id: 'kr-a-zellen', thema: 'kreuz', fall: 'kr-haar',
    stamm: P('Der globale Test ist signifikant. Zeigt er, welche Kombination von Haar- und Augenfarbe auffällt?', 'The global test is significant. Does it show which combination of hair and eye colour stands out?'),
    antworten: [
      a(P('Nein; dafür vergleicht man beobachtete und erwartete Häufigkeiten je Zelle', 'No; for that, observed and expected frequencies are compared cell by cell'),
        P(`In der letzten Tabelle fällt blond und blau auf: beobachtet 94, erwartet 46,1, standardisiertes Residuum 9,97.`, `In the last table blond and blue stands out: observed 94, expected 46.1, standardised residual 9.97.`), true),
      a(P('Ja, der Test nennt die Zelle mit der größten Abweichung von der Unabhängigkeit', 'Yes, the test names the cell with the largest departure from independence'),
        P('Der Test ist global und ungerichtet: Er sagt, dass ein Zusammenhang besteht, nicht wo.', 'The test is global and undirected: it says that a relation exists, not where.')),
      a(P('Die Zellen mit den meisten Personen sind die auffälligen, wie ihre Häufigkeiten zeigen', 'The cells with the most people are the conspicuous ones, as their frequencies show'),
        P(`Eine Zelle fällt durch die Abweichung vom Erwarteten auf, nicht durch ihre Größe. Blond und braun hat nur 7 Personen bei ${zd('kh_exp_bb', 1)} erwarteten.`, `A cell stands out through its departure from the expected, not through its size. Blond and brown has only 7 people against ${ze('kh_exp_bb', 1)} expected.`))
    ],
    hilfe: HX, karte: 'kreuz', belege: ['wissen:kreuz-chi2-global', 'wissen:kreuz-chi2-berechnung', 'Bortz und Schuster']
  },
  {
    id: 'kr-a-regel', thema: 'kreuz', fall: 'kr-haar',
    stamm: P(`Angenommen, alle erwarteten Häufigkeiten sollen mindestens 5 betragen. Die kleinste ist hier ${zd('kh_min_exp', 3)}. Was folgt?`, `Assume all expected frequencies should be at least 5. The smallest here is ${ze('kh_min_exp', 3)}. What follows?`),
    antworten: [
      a(P('Die Regel ist erfüllt; der Test darf nach ihr angewendet werden', 'The rule is met; according to this rule the test may be used'),
        P(`Die Regel bezieht sich auf die erwarteten Häufigkeiten. Sie liegen über 5 (kleinste ${zd('kh_min_exp', 3)}, rot und grün). Solche Regeln sind Konventionen.`, `The rule refers to the expected frequencies. They are above 5 (smallest ${ze('kh_min_exp', 3)}, red and green). Such rules are conventions.`), true),
      a(P('Die Regel ist verletzt, denn zwei Zellen enthalten weniger als 10 Personen', 'The rule is violated, since two cells contain fewer than 10 people'),
        P(`Beobachtete Häufigkeiten spielen für die Regel keine Rolle; blond und braun hat 7 beobachtet, aber ${zd('kh_exp_bb', 1)} erwartet.`, `Observed frequencies play no role for the rule; blond and brown has 7 observed, but ${ze('kh_exp_bb', 1)} expected.`)),
      a(P('Die Regel gilt nur für die Zeilen- und Spaltensummen, nicht für die einzelnen Zellen', 'The rule applies only to the row and column totals, not to the single cells'),
        P('Die Regel gilt für die einzelnen Zellen der Tabelle, nicht für Summen.', 'The rule applies to the single cells of the table, not to sums.'))
    ],
    hilfe: HX, karte: 'kreuz', belege: ['wissen:kreuz-erwartete-haeufigkeit', 'wissen:campbell07-kleinste-erwartete', 'Campbell 2007']
  },
  {
    id: 'kr-a-prozent', thema: 'kreuz', fall: 'kr-haar',
    stamm: P('Wie viel Prozent der blonden Personen haben blaue Augen?', 'What percentage of the blond people have blue eyes?'),
    antworten: [
      a(P(`94 von 127 blonden Personen, also ${zp('kh_pct_zeile')} Prozent (Zeilenprozent)`, `94 of 127 blond people, so ${zp('kh_pct_zeile')} percent (row percent)`),
        P('Gefragt ist der Anteil innerhalb der Blonden. Die Bezugsgröße ist die Zeilensumme 127.', 'What is asked is the share among the blond people. The base is the row total 127.'), true),
      a(P(`94 von 215 Personen mit blauen Augen, also ${zp('kh_pct_spalte')} Prozent (Spaltenprozent)`, `94 of 215 people with blue eyes, so ${zp('kh_pct_spalte')} percent (column percent)`),
        P(`Das ist ein anderer Anteil: Von den Personen mit blauen Augen sind ${zp('kh_pct_spalte')} Prozent blond.`, `That is a different share: of the people with blue eyes, ${zp('kh_pct_spalte')} percent are blond.`)),
      a(P(`94 von 592 Personen, also ${zp('kh_pct_gesamt')} Prozent (Gesamtprozent)`, `94 of 592 people, so ${zp('kh_pct_gesamt')} percent (total percent)`),
        P('Das ist der Anteil an allen Befragten, nicht an den Blonden.', 'That is the share of all respondents, not of the blond ones.'))
    ],
    hilfe: ['frage-kreuz', 'prozent-der-faelle'], karte: 'kreuz', belege: ['wissen:kreuz-chi2-berechnung', 'Bortz und Schuster']
  },
  // ---- Fall B: Zulassungen, Drittvariable ----
  {
    id: 'kr-b-drittvariable', thema: 'kreuz', fall: 'kr-ucb',
    stamm: P(`Frauen wurden insgesamt seltener zugelassen (${zd('ku_pct_f', 1)} gegen ${zd('ku_pct_m', 1)} Prozent), in vier von sechs Fachbereichen aber häufiger als Männer. Wie lässt sich das erklären?`, `Women were admitted less often overall (${ze('ku_pct_f', 1)} against ${ze('ku_pct_m', 1)} percent), but more often than men in four of six departments. How can that be explained?`),
    antworten: [
      a(P('Frauen bewarben sich häufiger bei Fachbereichen mit niedrigen Quoten', 'Women applied more often to departments with low admission rates'),
        P(`${zp('ku_f_cf')} Prozent der Bewerbungen von Frauen gingen an die Fachbereiche C bis F, bei Männern waren es ${zp('ku_m_cf')} Prozent.`, `${zp('ku_f_cf')} percent of the applications by women went to departments C to F, for men it was ${zp('ku_m_cf')} percent.`), true),
      a(P('Die Zahlen der Fachbereiche sind fehlerhaft, denn die Gesamtquote ist verlässlicher', 'The department figures are faulty, since the overall rate is more reliable'),
        P('Beide Tabellen sind richtig gerechnet. Sie beantworten verschiedene Fragen.', 'Both tables are calculated correctly. They answer different questions.')),
      a(P('Der Zusammenhang der Gesamttabelle gilt in den einzelnen Fachbereichen genauso', 'The relation in the overall table holds in the individual departments just the same'),
        P('In vier der sechs Fachbereiche liegt die Quote der Frauen höher. Die Gesamttabelle gilt nicht für die Gruppen.', 'In four of the six departments the rate for women is higher. The overall table does not hold for the groups.'))
    ],
    hilfe: HX, belege: ['wissen:kreuz-drittvariable', 'wissen:partialkorrelation-gleicher-zusammenhang', 'Bickel u. a. 1975']
  },
  {
    id: 'kr-b-nach-gruppen', thema: 'kreuz', fall: 'kr-ucb',
    stamm: P('Welche Auswertung beantwortet die Frage, ob Frauen und Männer innerhalb eines Fachbereichs gleich oft zugelassen werden?', 'Which analysis answers the question whether women and men are admitted equally often within a department?'),
    antworten: [
      a(P('Je Fachbereich eine eigene Kreuztabelle von Geschlecht und Zulassung', 'A separate crosstab of sex and admission for each department'),
        P('Der Zusammenhang kann sich nach der Drittvariable ändern oder sogar umdrehen. Deshalb wird in den Gruppen der Drittvariable geschaut.', 'The relation can change or even reverse across the third variable. That is why one looks within its groups.'), true),
      a(P('Die Kreuztabelle über die Fachbereiche zusammen, denn sie hat die meisten Fälle', 'The crosstab over the departments together, since it has the most cases'),
        P('Mehr Fälle beheben die Vermischung nicht; sie liegt in der Tabelle selbst.', 'More cases do not remove the mixing; it lies in the table itself.')),
      a(P('Ein Vergleich der Gesamtquote mit der Quote des größten Fachbereichs', 'A comparison of the overall rate with the rate of the largest department'),
        P('Ein einzelner Fachbereich beantwortet die Frage für die übrigen nicht.', 'A single department does not answer the question for the others.'))
    ],
    hilfe: [...HX, 'mantel-haenszel'], belege: ['wissen:kreuz-drittvariable', 'Bickel u. a. 1975']
  },
  // ---- Fall C: Titanic, Odds Ratio und relatives Risiko ----
  {
    id: 'kr-c-or-rr', thema: 'kreuz', fall: 'kr-titanic',
    stamm: P(`Das Odds Ratio ist ${zd('kt_or', 3)}. In einer Zeitung steht: „Frauen überlebten mit mehr als zehnmal so hoher Wahrscheinlichkeit“. Wie ist das zu werten?`, `The odds ratio is ${ze('kt_or', 3)}. A newspaper writes: „Women survived with more than ten times the probability“. How is that to be judged?`),
    antworten: [
      a(P(`Das übertreibt: Das relative Risiko ist ${zd('kt_rr', 3)}, denn das Überleben war nicht selten`, `That exaggerates: the relative risk is ${ze('kt_rr', 3)}, since survival was not rare`),
        P(`Das Odds Ratio vergleicht Chancen, das relative Risiko Wahrscheinlichkeiten (${zd('kt_p_f', 3)} gegen ${zd('kt_p_m', 3)}). Bei häufigen Ereignissen liegt das Odds Ratio weit über dem relativen Risiko.`, `The odds ratio compares odds, the relative risk probabilities (${ze('kt_p_f', 3)} against ${ze('kt_p_m', 3)}). For common events the odds ratio lies far above the relative risk.`), true),
      a(P('Das stimmt, denn das Odds Ratio ist das Verhältnis der Überlebenswahrscheinlichkeiten', 'That is right, since the odds ratio is the ratio of the survival probabilities'),
        P('Chancen und Wahrscheinlichkeiten sind verschieden. Nur bei seltenen Ereignissen liegen beide nahe beieinander.', 'Odds and probabilities are different. Only for rare events do they lie close together.')),
      a(P('Die Aussage gilt nur, wenn Frauen und Männer in gleicher Zahl an Bord waren', 'The statement holds only if women and men were on board in equal numbers'),
        P('Die Gruppengröße ändert den Unterschied zwischen Odds Ratio und relativem Risiko nicht; die Höhe der Überlebensquoten tut es.', 'Group size does not change the difference between odds ratio and relative risk; the level of the survival rates does.'))
    ],
    hilfe: ['odds-ratio', 'relatives-risiko', 'risikomasse'], karte: 'kreuz', belege: ['wissen:lumley-or-nicht-rr', 'wissen:effekt-odds-ratio-uebertreibt-rr', 'wissen:log-odds-ratio-eb', 'Lumley u. a.']
  },
  {
    id: 'kr-c-rd', thema: 'kreuz', fall: 'kr-titanic',
    stamm: P('Welche Zahl nennt den Abstand der Überlebensanteile in Prozentpunkten?', 'Which figure gives the gap between the survival shares in percentage points?'),
    antworten: [
      a(P(`Die Risikodifferenz (RD), hier ${zd('kt_rd', 3)}, etwa ${zp('kt_rd')} Prozentpunkte`, `The risk difference (RD), here ${ze('kt_rd', 3)}, about ${zp('kt_rd')} percentage points`),
        P(`Die Risikodifferenz ist der Anteil der Frauen minus der Anteil der Männer: ${zd('kt_p_f', 3)} minus ${zd('kt_p_m', 3)}.`, `The risk difference is the share of women minus the share of men: ${ze('kt_p_f', 3)} minus ${ze('kt_p_m', 3)}.`), true),
      a(P(`Das relative Risiko (RR), hier ${zd('kt_rr', 3)}, ein Verhältnis der Anteile`, `The relative risk (RR), here ${ze('kt_rr', 3)}, a ratio of the shares`),
        P(`Das relative Risiko ist ein Verhältnis, kein Abstand: ${zd('kt_p_f', 3)} geteilt durch ${zd('kt_p_m', 3)}.`, `The relative risk is a ratio, not a gap: ${ze('kt_p_f', 3)} divided by ${ze('kt_p_m', 3)}.`)),
      a(P(`Das Odds Ratio (OR), hier ${zd('kt_or', 3)}, ein Verhältnis der Chancen`, `The odds ratio (OR), here ${ze('kt_or', 3)}, a ratio of the odds`),
        P('Das Odds Ratio ist ein Verhältnis von Chancen und hat keine Einheit Prozentpunkte.', 'The odds ratio is a ratio of odds and has no unit of percentage points.'))
    ],
    hilfe: ['risikomasse', 'risikodifferenz'], karte: 'kreuz', belege: ['wissen:effekt-relativ-absolut', 'wissen:lumley-or-nicht-rr', 'Bortz und Schuster']
  },
  // ---- Einzelfragen ----
  {
    id: 'kr-klein-erwartet', thema: 'kreuz',
    stamm: P('Angenommen, alle erwarteten Häufigkeiten sollen mindestens 5 betragen. Eine 2x2-Tabelle mit 20 Personen hat eine erwartete Häufigkeit von 2. Was ist ein vernünftiger Weg?', 'Assume all expected frequencies should be at least 5. A 2x2 table with 20 people has an expected frequency of 2. What is a sensible way?'),
    antworten: [
      a(P('Den exakten Test nach Fisher verwenden, der keine Mindestgrößen verlangt', 'Use Fisher\'s exact test, which demands no minimum size of the expected frequencies'),
        P('Bei kleinen erwarteten Häufigkeiten ist die Näherung des Chi-Quadrat-Tests schlecht. Der exakte Test rechnet mit den Randsummen direkt.', 'With small expected frequencies the approximation of the chi-square test is poor. The exact test computes directly from the marginal totals.'), true),
      a(P('Den Chi-Quadrat-Test anwenden, weil die Regel für Tabellen mit mehr als vier Zellen gilt', 'Use the chi-square test, because the rule applies to tables with more than four cells'),
        P('Die Regel gilt auch für 2x2-Tabellen. Solche Regeln sind Konventionen, aber 2 liegt klar darunter.', 'The rule applies to 2x2 tables too. Such rules are conventions, but 2 is clearly below.')),
      a(P('Auf den t-Test wechseln, weil er keine Mindestgröße der erwarteten Häufigkeiten verlangt', 'Switch to the t test, because it demands no minimum size of the expected frequencies'),
        P('Der t-Test vergleicht Mittelwerte und passt nicht zu Häufigkeiten in Kategorien.', 'The t test compares means and does not fit frequencies in categories.'))
    ],
    hilfe: HX, karte: 'kreuz', belege: ['wissen:kreuz-erwartete-haeufigkeit', 'wissen:campbell07-fisher-irwin-varianten', 'Campbell 2007']
  },
  {
    id: 'kr-doppelt-n', thema: 'kreuz',
    stamm: P('Eine Kreuztabelle wird mit gleichen Anteilen in jeder Zelle, aber doppelt so vielen Personen noch einmal ausgewertet. Was geschieht?', 'A crosstab is analysed again with the same shares in each cell, but twice as many people. What happens?'),
    antworten: [
      a(P('χ² verdoppelt sich, Cramérs V bleibt gleich, da der Zusammenhang gleich bleibt', 'χ² doubles, Cramér\'s V stays the same, as the relation stays equally strong'),
        P('χ² wächst mit n; V teilt durch n. Deshalb vergleicht man Zusammenhänge mit V (oder phi), nicht mit χ².', 'χ² grows with n; V divides by n. That is why relations are compared with V (or phi), not with χ².'), true),
      a(P('χ² und Cramérs V verdoppeln sich, weil mehr Personen den Zusammenhang stärken', 'χ² and Cramér\'s V both double, because more people strengthen the relation'),
        P('Mehr Personen sichern den Zusammenhang besser ab, machen ihn aber nicht stärker.', 'More people secure the relation better, but do not make it stronger.')),
      a(P('χ² und Cramérs V bleiben beide gleich, weil die Anteile in den Zellen gleich bleiben', 'χ² and Cramér\'s V both stay the same, because the shares in the cells stay the same'),
        P('Gleiche Anteile heißen nicht gleiches χ²: Es hängt von der Zahl der Personen ab.', 'Equal shares do not mean equal χ²: it depends on the number of people.'))
    ],
    hilfe: [...HX, 'zusammenhangsmasse'], karte: 'kreuz', belege: ['wissen:kreuz-chi2-waechst-mit-n', 'wissen:kreuz-kontingenzkoeffizient', 'Bortz und Schuster']
  },
  {
    id: 'kr-mcnemar', thema: 'kreuz',
    stamm: P('Dieselben 100 Personen werden vor und nach einer Maßnahme befragt (Ja oder Nein). 15 wechseln von Nein auf Ja, 5 von Ja auf Nein, 80 bleiben bei ihrer Antwort. Welche Personen gehen in den McNemar-Test ein?', 'The same 100 people are asked before and after a measure (yes or no). 15 switch from no to yes, 5 from yes to no, 80 stay with their answer. Which people enter the McNemar test?'),
    antworten: [
      a(P('Nur die 20 Personen, die gewechselt haben; verglichen werden 15 gegen 5', 'Only the 20 people who switched; 15 are compared against 5'),
        P('Wer gleich antwortet, trägt nichts zum Vergleich bei. Die Prüfgröße ist 15 minus 5, zum Quadrat, durch 20, also 5.', 'Whoever answers the same contributes nothing to the comparison. The test statistic is 15 minus 5, squared, divided by 20, so 5.'), true),
      a(P('Alle 100 Personen, denn jede wurde vor und nach der Maßnahme befragt', 'All 100 people, since each was asked before and after the measure'),
        P('Die Personen mit gleicher Antwort liefern keine Information über eine Veränderung.', 'The people with the same answer provide no information on a change.')),
      a(P('Die 80 Personen, die gleich geantwortet haben, denn sie zeigen die Stabilität', 'The 80 people who answered the same, since they show the stability'),
        P('Gerade die Stabilen zeigen keine Veränderung und gehören daher nicht in den Test.', 'It is the stable ones who show no change and therefore do not belong in the test.'))
    ],
    hilfe: ['mcnemar-test-cochran-q', 'frage-praepost'], belege: ['wissen:kreuz-mcnemar-wechsler', 'Bortz und Schuster']
  }
];
