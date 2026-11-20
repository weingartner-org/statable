/**
 * Üben: Urteilen zwei Personen gleich, und wie gut taugt eine Aufgabe? (Übereinstimmung mit Kappa, Itemschwierigkeit, Itemvarianz, Trennschärfe).
 * Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R). Daten: irr::diagnoses (Fleiss 1971)
 * und lme4::VerbAgg (De Boeck und Wilson 2004). Belege: wissen.json (Bortz Kap. 10, Testtheorie Kap. 7).
 * Zu Kennlinie und Item-Response-Theorie, zu Krippendorffs Alpha und zur Intraklassenkorrelation gibt es keine Quelle, darum dazu keine Frage.
 * Der Zufallsteil von Kappa steht als gesetzte Regel im Stamm (aus den Randsummen berechnet).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, zd, ze, zn } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

const QUELLE_DIAG = P(
  'Daten: irr::diagnoses (Fleiss 1971; Paket irr, Lizenz GPL), 30 Personen mit psychiatrischer Diagnose, beurteilt von Rater 1 und Rater 2; hier die Diagnose Neurose gegen alle übrigen. Berechnet mit R.',
  'Data: irr::diagnoses (Fleiss 1971; package irr, licence GPL), 30 persons with a psychiatric diagnosis, rated by rater 1 and rater 2; here the diagnosis neurosis against all others. Computed with R.');
const QUELLE_VERB = P(
  'Daten: lme4::VerbAgg (De Boeck und Wilson 2004; Paket lme4, Lizenz GPL), 316 Personen, 24 Aussagen zu verbaler Aggression; Antwort „ja“ oder „vielleicht“ gleich 1, „nein“ gleich 0. Berechnet mit R.',
  'Data: lme4::VerbAgg (De Boeck and Wilson 2004; package lme4, licence GPL), 316 persons, 24 statements on verbal aggression; answer "yes" or "perhaps" coded 1, "no" coded 0. Computed with R.');

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'kp-neurose': {
    titel: P('Zwei Raterinnen: Diagnose Neurose oder nicht', 'Two raters: diagnosis neurosis or not'),
    tabellen: [
      tab('kp-neurose.0', [P('Rater 2', 'Rater 2'), P('Rater 1: Neurose', 'Rater 1: neurosis'), P('Rater 1: keine Neurose', 'Rater 1: no neurosis')], QUELLE_DIAG, P('Häufigkeiten', 'Frequencies')),
      tab('kp-neurose.1', [P('Kennzahl', 'Statistic'), P('Wert', 'Value')], QUELLE_DIAG, P('Übereinstimmung und Kappa', 'Agreement and kappa'))
    ]
  },
  'is-verb': {
    titel: P('Sechs Aussagen zu verbaler Aggression (Trennschärfe gegen die Summe aller 24 Aussagen)', 'Six statements on verbal aggression (item-total correlation against the sum of all 24 statements)'),
    tabellen: [
      tab('is-verb.0', [P('Aussage', 'Statement'), P('Schwierigkeitsindex P (Prozent der Antworten „ja“ oder „vielleicht“)', 'Difficulty index P (percent of the answers "yes" or "perhaps")'), P('Varianz', 'Variance'), P('Trennschärfe unkorrigiert (Summe aus 24 Aussagen)', 'Item-total correlation uncorrected (sum of 24 statements)'), P('Trennschärfe korrigiert (Summe aus 24 Aussagen)', 'Item-total correlation corrected (sum of 24 statements)')], QUELLE_VERB,
        P('Itemanalyse: Schwierigkeit, Varianz und Trennschärfe', 'Item analysis: difficulty, variance and item-total correlation'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Übereinstimmung: Kappa ----
  {
    id: 'kp-zufall', thema: 'messen', fall: 'kp-neurose', karte: 'uebereinstimmung',
    stamm: P(`Angenommen, die bei Zufall erwartete Übereinstimmung wird aus den Zeilen- und Spaltensummen berechnet, und Kappa ist (beobachtet minus erwartet) geteilt durch (1 minus erwartet). Zwei Raterinnen stimmen in 87 Prozent der ${zn('kp_n')} Fälle überein, Kappa beträgt aber nur ${zd('kp_k', 3)} (Tabellen). Woran liegt das?`,
      `Suppose the agreement expected by chance is computed from the row and column totals, and kappa is (observed minus expected) divided by (1 minus expected). Two raters agree in 87 percent of the ${zn('kp_n')} cases, but kappa is only ${ze('kp_k', 3)} (tables). What is the reason?`),
    antworten: [
      a(P(`Kappa ist der erreichte Anteil der Übereinstimmung über den Zufall (${zd('kp_pe', 3)}) hinaus`, `Kappa states what share of the agreement possible beyond chance (${ze('kp_pe', 3)}) is reached`),
        P(`Nach der gesetzten Formel ist (${zd('kp_po', 3)} minus ${zd('kp_pe', 3)}) geteilt durch (1 minus ${zd('kp_pe', 3)}) gleich rund ${zd('kp_k1', 1)}, genau ${zd('kp_k', 3)}. Der Zufallsanteil ist hoch, weil in der Tabelle fast alle Fälle bei beiden Raterinnen in die Gruppe „keine Neurose“ fallen.`,
          `By the formula set, (${ze('kp_po', 3)} minus ${ze('kp_pe', 3)}) divided by (1 minus ${ze('kp_pe', 3)}) equals about ${ze('kp_k1', 1)}, exactly ${ze('kp_k', 3)}. The chance share is high because in the table almost all cases fall into the group "no neurosis" for both raters.`), true),
      a(P(`Kappa zählt nur die Fälle mit Neurose und lässt die übrigen ${zn('kp_none')} Fälle ganz außer Acht`, `Kappa counts only the cases with neurosis and disregards the remaining ${zn('kp_none')} cases entirely`),
        P(`Alle ${zn('kp_n')} Fälle gehen ein. Die ${zn('kp_none')} Fälle ohne Neurose stimmen überein, doch ein großer Teil dieser Übereinstimmung wird dem Zufall zugerechnet.`, `All ${zn('kp_n')} cases enter. The ${zn('kp_none')} cases without neurosis agree, but a large part of this agreement is attributed to chance.`)),
      a(P('Kappa ist ein Prozentwert der Übereinstimmung und müsste ebenfalls bei 87 Prozent liegen', 'Kappa is a percentage of agreement and would have to be at 87 percent as well'),
        P('Kappa ist kein Prozentwert der Übereinstimmung, sondern bereinigt sie um den Zufall.', 'Kappa is not a percentage of agreement but corrects it for chance.'))
    ],
    hilfe: ['kappa', 'frage-uebereinstimmung'], belege: ['wissen:bortz-kappa-gewichtet', 'Rechenfolge der Tabellen (gesetzte Formel im Stamm)']
  },
  {
    id: 'kp-mehrfach', thema: 'messen', fall: 'kp-neurose', mehrfach: true, karte: 'uebereinstimmung',
    stamm: P('Angenommen, die bei Zufall erwartete Übereinstimmung wird aus den Zeilen- und Spaltensummen berechnet, und Kappa ist (beobachtet minus erwartet) geteilt durch (1 minus erwartet). Welche Aussagen zu den beiden Tabellen stimmen? Mehrere können stimmen.',
      'Suppose the agreement expected by chance is computed from the row and column totals, and kappa is (observed minus expected) divided by (1 minus expected). Which statements about the two tables are correct? Several may be correct.'),
    antworten: [
      a(P(`Die Raterinnen stimmen bei ${zn('kp_both')} plus ${zn('kp_none')}, also 26 von ${zn('kp_n')} Fällen überein`, `The raters agree in ${zn('kp_both')} plus ${zn('kp_none')}, that is 26 of ${zn('kp_n')} cases`),
        P(`Auf der Diagonale stehen ${zn('kp_both')} und ${zn('kp_none')}; 26 geteilt durch ${zn('kp_n')} ist ${zd('kp_po', 3)}.`, `The diagonal holds ${zn('kp_both')} and ${zn('kp_none')}; 26 divided by ${zn('kp_n')} is ${ze('kp_po', 3)}.`), true),
      a(P(`Von der Übereinstimmung ${zd('kp_po', 3)} ist ein großer Teil schon bei Zufall zu erwarten (${zd('kp_pe', 3)})`, `Of the agreement ${ze('kp_po', 3)} a large part is expected by chance alone (${ze('kp_pe', 3)})`),
        P(`Die erwartete Übereinstimmung folgt aus den Randsummen: (1 mal 5 plus 29 mal 25) geteilt durch ${zn('kp_n')} zum Quadrat gleich ${zd('kp_pe', 3)}.`, `The expected agreement follows from the marginal totals: (1 times 5 plus 29 times 25) divided by ${zn('kp_n')} squared equals ${ze('kp_pe', 3)}.`), true),
      a(P('Kappa ist größer als die beobachtete Übereinstimmung in Prozent', 'Kappa is larger than the observed agreement in percent'),
        P(`Kappa (${zd('kp_k', 3)}) ist kleiner als die Übereinstimmung (${zd('kp_po', 3)}), weil der Zufallsanteil abgezogen wird.`, `Kappa (${ze('kp_k', 3)}) is smaller than the agreement (${ze('kp_po', 3)}) because the chance share is removed.`)),
      a(P('Weil die Übereinstimmung in Prozent hoch ist, ist auch Kappa hoch', 'Because the agreement in percent is high, kappa is high as well'),
        P(`In dieser Tabelle gilt das nicht: ${zd('kp_po', 3)} Übereinstimmung, aber Kappa nur ${zd('kp_k', 3)}.`, `In this table that does not hold: ${ze('kp_po', 3)} agreement, but kappa only ${ze('kp_k', 3)}.`))
    ],
    hilfe: ['kappa', 'frage-uebereinstimmung'], belege: ['wissen:bortz-kappa-gewichtet']
  },

  // ---- Itemanalyse ----
  {
    id: 'is-leicht', thema: 'messen', fall: 'is-verb',
    stamm: P(`Die Tabelle zeigt für sechs Aussagen den Anteil der Antworten „ja“ oder „vielleicht“ als Schwierigkeitsindex P (in Prozent). Was bedeutet P = ${zd('iv_p_c', 1)} bei S2WantCurse?`,
      `The table shows the share of the answers "yes" or "perhaps" for six statements as difficulty index P (in percent). What does P = ${ze('iv_p_c', 1)} mean for S2WantCurse?`),
    antworten: [
      a(P('Viele Personen antworten bei dem Item mit „ja“ oder „vielleicht“; das Item ist leicht', 'Many persons answer the item with "yes" or "perhaps"; the item is easy'),
        P('P ist die Spaltensumme geteilt durch die höchstmögliche Summe mal 100. Der Index misst eigentlich die Leichtigkeit: Ein hoher Wert heißt, dass viele das Item im Sinne des Merkmals beantworten.', 'P is the column sum divided by the highest possible sum times 100. The index actually measures ease: a high value means that many answer the item in the sense of the attribute.'), true),
      a(P('Das Item ist schwer, denn ein hoher Wert des Index steht für hohe Schwierigkeit des Items', 'The item is difficult, since a high value of the index stands for high difficulty of the item'),
        P('Der Name verleitet zur umgekehrten Lesart: Ein hoher Wert bedeutet viele Antworten „ja“ oder „vielleicht“, also ein leichtes Item.', 'The name invites the opposite reading: a high value means many answers "yes" or "perhaps", that is an easy item.')),
      a(P('Das Item trennt besonders gut zwischen den Personen, weil sein Index so hoch ausfällt', 'The item separates the persons particularly well because its index comes out so high'),
        P(`Die Trennschärfe ist eine andere Kennzahl (${zd('iv_u_c', 3)}, korrigiert ${zd('iv_k_c', 3)}). Bei P = ${zd('iv_p_c', 1)} ist die Varianz ${zd('iv_v_c', 3)}, kleiner als bei P = 50 (${zd('iv_max', 3)}).`,
          `Item-total correlation is a different statistic (${ze('iv_u_c', 3)}, corrected ${ze('iv_k_c', 3)}). At P = ${ze('iv_p_c', 1)} the variance is ${ze('iv_v_c', 3)}, smaller than at P = 50 (${ze('iv_max', 3)}).`))
    ],
    hilfe: ['itemschwierigkeit', 'itemanalyse'], belege: ['wissen:schwierigkeitsindex-leichtigkeit']
  },
  {
    id: 'is-varianz', thema: 'messen', fall: 'is-verb',
    stamm: P('Welches Item der Tabelle hat die größte Varianz, und warum?', 'Which item in the table has the largest variance, and why?'),
    antworten: [
      a(P(`S2WantShout, denn bei P = 50 hat die Varianz p(1-p) ihr Maximum`, `S2WantShout, since at P = 50 the variance p(1-p) has its maximum`),
        P(`Die Varianz eines Ja/Nein-Items ist p(1-p) und liegt bei P = 50 mit ${zd('iv_max', 3)} am höchsten. Items mit P = 0 oder P = 100 differenzieren nicht.`, `The variance of a yes/no item is p(1-p) and is highest at P = 50, at ${ze('iv_max', 3)}. Items with P = 0 or P = 100 do not differentiate.`), true),
      a(P(`S3DoShout, denn mit P = ${zd('iv_p_f', 1)} antworten fast alle gleich und eindeutig`, `S3DoShout, since with P = ${ze('iv_p_f', 1)} almost everybody answers alike and clearly`),
        P(`Ein Item, das fast alle gleich beantworten, hat eine kleine Varianz: ${zd('iv_v_f', 3)}.`, `An item that almost everybody answers alike has a small variance: ${ze('iv_v_f', 3)}.`)),
      a(P(`S2WantCurse, denn bei P = ${zd('iv_p_c', 1)} stimmen die meisten Personen überein`, `S2WantCurse, since at P = ${ze('iv_p_c', 1)} most persons give the same answer`),
        P(`Je einheitlicher die Antworten, desto kleiner die Varianz: ${zd('iv_v_c', 3)} gegen ${zd('iv_max', 3)} bei P = 50.`, `The more uniform the answers, the smaller the variance: ${ze('iv_v_c', 3)} against ${ze('iv_max', 3)} at P = 50.`))
    ],
    hilfe: ['itemanalyse', 'itemschwierigkeit'], belege: ['wissen:itemvarianz-dichotom']
  },
  {
    id: 'is-korrektur', thema: 'messen', fall: 'is-verb',
    stamm: P('Die Tabelle zeigt zwei Trennschärfen je Item. Warum ist die unkorrigierte hier größer als die korrigierte?', 'The table shows two item-total correlations per item. Why is the uncorrected one larger than the corrected one here?'),
    antworten: [
      a(P('Unkorrigiert steckt das Item selbst im Testwert; die korrigierte Fassung lässt es heraus', 'Uncorrected, the item itself is part of the test score; the corrected version leaves it out'),
        P('Die Part-whole-Korrektur lässt das Item aus der Summe heraus. Unkorrigiert wird die Trennschärfe überschätzt.', 'The part-whole correction leaves the item out of the sum. Uncorrected, the item-total correlation is overestimated.'), true),
      a(P('Die Korrektur zieht von der Trennschärfe einen festen Betrag ab, der für alle Items gleich ist', 'The correction subtracts a fixed amount from the item-total correlation that is the same for all items'),
        P(`Der Abstand ist nicht fest: Er ist bei S2WantShout (${zd('iv_u_a', 3)} gegen ${zd('iv_k_a', 3)}) größer als bei S3DoShout (${zd('iv_u_f', 3)} gegen ${zd('iv_k_f', 3)}).`, `The gap is not fixed: it is larger for S2WantShout (${ze('iv_u_a', 3)} against ${ze('iv_k_a', 3)}) than for S3DoShout (${ze('iv_u_f', 3)} against ${ze('iv_k_f', 3)}).`)),
      a(P('Die unkorrigierte Fassung berücksichtigt auch Personen mit fehlenden Antworten, die korrigierte nicht', 'The uncorrected version also takes persons with missing answers into account, the corrected one does not'),
        P('In diesen Daten fehlt keine Antwort. Der Unterschied kommt allein daher, ob das Item in der Summe steckt.', 'In these data no answer is missing. The difference arises solely from whether the item is part of the sum.'))
    ],
    hilfe: ['itemanalyse', 'itemparameter'], belege: ['wissen:trennschaerfe-part-whole']
  },
  {
    id: 'is-mehrfach', thema: 'messen', fall: 'is-verb', mehrfach: true,
    stamm: P('Welche Aussagen zur Tabelle der Item-Kennzahlen stimmen? Mehrere können stimmen.', 'Which statements about the table of item statistics are correct? Several may be correct.'),
    antworten: [
      a(P('Der Schwierigkeitsindex P ist hier der Anteil der Antworten „ja“ oder „vielleicht“ mal 100', 'Here the difficulty index P is the share of the answers "yes" or "perhaps" times 100'),
        P('Diese Antworten zählen als 1, „nein“ als 0. P ist die Spaltensumme geteilt durch die höchstmögliche Summe mal 100; bei 0/1-Items ist das der Anteil der Einsen.', 'These answers count as 1, "no" as 0. P is the column sum divided by the highest possible sum times 100; for 0/1 items that is the share of ones.'), true),
      a(P(`S2WantShout hat die größte Varianz (${zd('iv_v_a', 3)}), S1DoScold aber die höchste korrigierte Trennschärfe (${zd('iv_k_b', 3)})`, `S2WantShout has the largest variance (${ze('iv_v_a', 3)}), but S1DoScold has the highest corrected item-total correlation (${ze('iv_k_b', 3)})`),
        P(`Hohe Itemvarianz begünstigt eine hohe Trennschärfe, garantiert sie aber nicht: S2WantShout kommt nur auf ${zd('iv_k_a', 3)}.`, `High item variance favours a high item-total correlation but does not guarantee it: S2WantShout reaches only ${ze('iv_k_a', 3)}.`), true),
      a(P('Hohe Itemvarianz bedeutet zwangsläufig eine hohe Trennschärfe des Items', 'High item variance necessarily means a high item-total correlation of the item'),
        P('Die Varianz begünstigt die Trennschärfe nur; S2WantShout hat die größte Varianz, aber nicht die größte Trennschärfe.', 'Variance only favours item-total correlation; S2WantShout has the largest variance but not the largest item-total correlation.')),
      a(P('Die korrigierte Trennschärfe liegt in der Tabelle höher als die unkorrigierte', 'The corrected item-total correlation in the table is higher than the uncorrected one'),
        P(`Es ist umgekehrt: Die korrigierte Fassung ist kleiner (zum Beispiel ${zd('iv_k_b', 3)} gegen ${zd('iv_u_b', 3)} bei S1DoScold).`, `It is the other way round: the corrected version is smaller (for example ${ze('iv_k_b', 3)} against ${ze('iv_u_b', 3)} for S1DoScold).`))
    ],
    hilfe: ['itemanalyse', 'itemschwierigkeit'], belege: ['wissen:schwierigkeitsindex-leichtigkeit', 'wissen:itemvarianz-und-trennschaerfe', 'wissen:trennschaerfe-part-whole']
  },
  {
    id: 'is-auswahl', thema: 'messen', fall: 'is-verb',
    stamm: P(`Angenommen, Trennschärfen von ${zd('iv_ra', 1)} bis ${zd('iv_rb', 1)} gelten als gut. Das Item S3DoShout hat korrigiert nur ${zd('iv_k_f', 3)} bei P = ${zd('iv_p_f', 1)}. Was ist der nächste Schritt?`,
      `Suppose item-total correlations from ${ze('iv_ra', 1)} to ${ze('iv_rb', 1)} count as good. Item S3DoShout has only ${ze('iv_k_f', 3)} corrected at P = ${ze('iv_p_f', 1)}. What is the next step?`),
    antworten: [
      a(P('Das Item inhaltlich prüfen; nach jeder Auswahl rechnet man alle Kennwerte neu', 'Check the item for content; after every selection recompute all statistics'),
        P('Eine Selektion allein nach Kennzahlen ohne inhaltliche Auseinandersetzung ist nicht zweckmäßig. Nach jeder Selektion werden Testwerte und Trennschärfen neu berechnet.', 'A selection by statistics alone, without engaging with the content, is not appropriate. After every selection test scores and item-total correlations are recomputed.'), true),
      a(P('Das Item ohne weitere Prüfung streichen, weil seine Trennschärfe unter dem Bereich liegt', 'Delete the item without further checking because its item-total correlation lies below the range'),
        P('Eine mechanische Auswahl nach Kennzahlen ist nicht zweckmäßig. Der Bereich der guten Werte ist eine Orientierung, kein Streichkriterium.', 'A mechanical selection by statistics is not appropriate. The range of good values is an orientation, not a deletion criterion.')),
      a(P(`Das Item behalten, weil es mit P = ${zd('iv_p_f', 1)} besonders schwierig und daher wertvoll ist`, `Keep the item because with P = ${ze('iv_p_f', 1)} it is particularly difficult and therefore valuable`),
        P(`P = ${zd('iv_p_f', 1)} zeigt, dass nur wenige zustimmen; die Varianz ist mit ${zd('iv_v_f', 3)} klein. Das allein macht noch kein gutes Item.`, `P = ${ze('iv_p_f', 1)} shows that only few agree; the variance is small at ${ze('iv_v_f', 3)}. That alone does not make a good item.`))
    ],
    hilfe: ['itemanalyse', 'itemparameter'], belege: ['wissen:itemselektion-nicht-mechanisch', 'wissen:trennschaerfe-gut-04-07']
  }
];
