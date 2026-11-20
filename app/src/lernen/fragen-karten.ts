/**
 * Üben: Was leistet die Karte, wann passt sie, und was bedeutet ihre Ausgabe? (Funktionsfragen, Charge 4, 01.11.2026)
 * Korrelationsmatrix, Clusteranalyse, Diskriminanzanalyse, loglineare Modelle, MANOVA, Armut und Ungleichheit, Einzelfallanalyse, offene Antworten,
 * Fallvergleichstabelle, Intercoder-Übereinstimmung, Methodenvergleich. Quelle: die Hilfe-Artikel der Karten und die Fachblätter (Belege `Hilfe:<id>`,
 * `Fachblatt:<NAME>`); die Knopfnamen stehen wörtlich wie in der App. Ohne Zahlen aus Rechnungen und ohne Tabellen.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

export const FRAGEN: Frage[] = [
  // ---- Korrelationsmatrix ----
  {
    id: 'ka-korr-paare', thema: 'karten', karte: 'korrmatrix',
    stamm: P('Bei zehn Zahlenspalten zeigt die Karte "Wie hängen mehrere Zahlen zusammen?" 45 Paare. Was ist dabei zu bedenken?',
      'With ten number columns the card "How are several numbers related?" shows 45 pairs. What has to be kept in mind?'),
    antworten: [
      a(P('Auch ohne echten Zusammenhang fällt leicht ein Paar zufällig unter 5 %', 'Even without a real relationship one pair easily falls below 5% by chance'),
        P('Die Korrektur ist standardmäßig aus, wie in SPSS. Eine vorher geplante Frage zu einem Paar darf ohne Korrektur berichtet werden.',
          'The correction is off by default, as in SPSS. A question about one pair planned beforehand may be reported without correction.'), true),
      a(P('Ab zehn Spalten schaltet Statable ohne Rückfrage automatisch auf Spearman um', 'From ten columns on Statable switches to Spearman automatically without asking'),
        P('Statable schlägt Spearman vor, sobald eine Spalte ordinal ist oder höchstens 7 verschiedene Werte hat, nicht wegen der Zahl der Spalten.',
          'Statable suggests Spearman as soon as a column is ordinal or has at most 7 different values, not because of the number of columns.')),
      a(P('Mit so vielen Paaren sperrt Statable die Matrix, weil sie unzuverlässig würde', 'With so many pairs Statable blocks the matrix because it would become unreliable'),
        P('Die Matrix wird nicht gesperrt. Die Hilfe warnt nur, dass bei der Suche nach Zusammenhängen die p-Werte zu korrigieren sind.',
          'The matrix is not blocked. The help only warns that p values must be corrected when searching for relationships.'))
    ],
    hilfe: ['frage-korrmatrix'], belege: ['Hilfe:frage-korrmatrix', 'Fachblatt:SPAETER-A-GRUNDLAGEN']
  },

  {
    id: 'ka-korr-art', thema: 'karten', karte: 'korrmatrix',
    stamm: P('Wann schlägt Statable in der Korrelationsmatrix die Rangkorrelation nach Spearman vor?', 'When does Statable suggest the Spearman rank correlation in the correlation matrix?'),
    antworten: [
      a(P('Sobald eine Spalte ordinal ist oder höchstens 7 verschiedene Werte hat', 'As soon as a column is ordinal or has at most 7 different values'),
        P('Im Ergebnis lässt sich die Art (Pearson oder Spearman) für alle Paare umschalten. Je Paar zählen alle Personen mit beiden Angaben.',
          'In the result the kind (Pearson or Spearman) can be switched for all pairs. For each pair all people with both values count.'), true),
      a(P('Sobald in einer der gewählten Spalten Werte fehlen, auch wenn es nur wenige sind', 'As soon as values are missing in one of the chosen columns, even if there are only a few'),
        P('Fehlende Werte führen zum paarweisen Ausschluss, nicht zu einer anderen Korrelationsart; n kann je Paar verschieden sein.',
          'Missing values lead to pairwise exclusion, not to another kind of correlation; n can differ from pair to pair.')),
      a(P('Sobald mehr als fünf Spalten gewählt sind, weil die Matrix sonst unübersichtlich wird', 'As soon as more than five columns are chosen, because the matrix otherwise gets cluttered'),
        P('Die Zahl der Spalten spielt für die Art keine Rolle. Sie entscheidet nur, wie viele Paare entstehen.',
          'The number of columns plays no role for the kind. It only decides how many pairs arise.'))
    ],
    hilfe: ['frage-korrmatrix'], belege: ['Hilfe:frage-korrmatrix', 'Fachblatt:SPAETER-A-GRUNDLAGEN']
  },
  // ---- Clusteranalyse ----
  {
    id: 'ka-clu-findet', thema: 'karten', karte: 'cluster',
    stamm: P('Die Clusteranalyse hat in den Daten Gruppen gefunden. Was folgt daraus?', 'The cluster analysis has found groups in the data. What follows from that?'),
    antworten: [
      a(P('Sie findet in jedem Fall Gruppen; ob sie sinnvoll sind, entscheidet das Fach', 'It finds groups in any case; whether they are meaningful is decided by the field'),
        P('Die Silhouette misst, wie gut jeder Fall in seine Gruppe passt. Statable nennt die Zahl mit der größten Silhouette als Hinweis; die Person entscheidet.',
          'The silhouette measures how well each case fits its group. Statable names the number with the largest silhouette as a hint; the person decides.'), true),
      a(P('Die Gruppen sind damit belegt, denn sie unterscheiden sich deutlich in den Merkmalen', 'The groups are thereby proved, since they differ clearly in the features'),
        P('Sie wurden gerade so gebildet, dass sie sich unterscheiden. Das beweist nicht, dass es diese Gruppen in der Wirklichkeit gibt.',
          'They were formed precisely so that they differ. That does not prove that these groups exist in reality.')),
      a(P('Die Gruppen sind echt, wenn der Test auf Gruppenunterschiede danach signifikant ausfällt', 'The groups are real if the test for group differences afterwards turns out significant'),
        P('Statable rechnet bewusst keine p-Werte zu den Unterschieden zwischen den Gruppen. Mit diesen Gruppen sollte nicht getestet werden, ob sie sich unterscheiden.',
          'Statable deliberately computes no p values for the differences between the groups. One should not test with these groups whether they differ.'))
    ],
    hilfe: ['frage-cluster'], belege: ['Hilfe:frage-cluster', 'Fachblatt:SPAETER-E-VORHERSAGE-ZEITREIHEN-CLUSTER']
  },
  {
    id: 'ka-clu-test', thema: 'karten', karte: 'cluster',
    stamm: P('Warum zeigt die Clusteranalyse keine p-Werte zu den Unterschieden zwischen den Gruppen?', 'Why does the cluster analysis show no p values for the differences between the groups?'),
    antworten: [
      a(P('Die Gruppen sind auf Unterschiede hin gebildet; ein Test bestätigte das nur scheinbar', 'The groups are built on differences; a test would only seemingly confirm them'),
        P('Statt der p-Werte zeigen die Profile je Gruppe den Mittelwert jedes Merkmals und die Abweichung vom Gesamtmittel; η² beschreibt nur.', 'Instead of p values the profiles show for each group the mean of every feature and the deviation from the overall mean; η² only describes.'), true),
      a(P('Die Gruppen sind für Tests zu klein, weil jede Gruppe höchstens 30 Fälle haben darf', 'The groups are too small for tests, since each group may have at most 30 cases'),
        P('Die Fallzahl ist nicht der Grund. Ward rechnet bis 3 000 Fälle, k-Means bis 100 000; die Gruppen können groß sein.',
          'The sample size is not the reason. Ward works up to 3,000 cases, k-means up to 100,000; the groups can be large.')),
      a(P('Das Ward-Verfahren liefert nur ein Dendrogramm und keine Zahlen, die sich testen ließen', 'The Ward method delivers only a dendrogram and no numbers that could be tested'),
        P('Ward liefert Zuordnung, Höhen der Zusammenlegung und Profile. Der Verzicht auf p-Werte liegt an der Art, wie die Gruppen entstehen.',
          'Ward delivers the assignment, merge heights and profiles. The lack of p values lies in the way the groups arise.'))
    ],
    hilfe: ['frage-cluster'], belege: ['Hilfe:frage-cluster', 'Fachblatt:SPAETER-E-VORHERSAGE-ZEITREIHEN-CLUSTER']
  },
  {
    id: 'ka-clu-zahl', thema: 'karten', mehrfach: true, karte: 'cluster',
    stamm: P('Welche Aussagen zur Clusteranalyse in Statable stimmen? Mehrere können stimmen.', 'Which statements about the cluster analysis in Statable are correct? Several may be correct.'),
    antworten: [
      a(P('Im Ellbogenbild bringt eine weitere Gruppe wenig, wo die Kurve abknickt', 'In the elbow plot another group adds little where the curve bends'),
        P('Das Bild zeigt die Streuung innerhalb der Gruppen je Gruppenzahl. Zusammen mit der Silhouette hilft es, die Zahl der Gruppen abzuwägen.',
          'The plot shows the spread within the groups for each number of groups. Together with the silhouette it helps weigh the number of groups.'), true),
      a(P('Statable standardisiert die Werte (z), damit große Zahlen eines Merkmals nicht allein bestimmen', 'Statable standardises the values (z) so that large numbers of one feature do not decide alone'),
        P('Das ist eine fachliche Entscheidung und lässt sich ausschalten, wenn alle Merkmale dieselbe Einheit haben.',
          'This is a substantive decision and can be switched off if all features have the same unit.'), true),
      a(P('Bei k-Means rechnet Statable mit einem einzigen Start, wie SPSS', 'For k-means Statable works with a single start, like SPSS'),
        P('Statable sucht mit 25 Starts die Lösung mit der kleinsten Streuung. SPSS nimmt einen Start und kann bei einer schlechteren Lösung stehen bleiben.',
          'Statable searches with 25 starts for the solution with the smallest spread. SPSS takes one start and may stop at a worse solution.')),
      a(P('Auch Kategorien oder Text dürfen als Merkmale dienen', 'Categories or text may also serve as features'),
        P('Text oder Kategorien als Merkmale gehen nicht; dafür braucht es das Abstandsmaß nach Gower. Gewählt werden Zahlenspalten, mindestens zwei.',
          'Text or categories as features are not possible; that needs the Gower distance. Number columns are chosen, at least two.'))
    ],
    hilfe: ['frage-cluster'], belege: ['Hilfe:frage-cluster', 'Fachblatt:SPAETER-E-VORHERSAGE-ZEITREIHEN-CLUSTER']
  },
  // ---- Diskriminanzanalyse ----
  {
    id: 'ka-dis-treffer', thema: 'karten', karte: 'diskriminanz',
    stamm: P('Eine Diskriminanzanalyse zeigt zwei Trefferquoten, "gelernt" und die Prüfung ohne den Fall selbst (Leave-one-out). Welche gilt?',
      'The discriminant analysis shows two hit rates, "learned" and the check without the case itself (leave-one-out). Which one counts?'),
    antworten: [
      a(P('Die Leave-one-out-Quote; bei "gelernt" wurden dieselben Fälle gelernt und geprüft', 'The leave-one-out rate; for "learned" the same cases were learned and checked'),
        P('Jeder Fall wird mit einer Einteilung geprüft, die ihn nicht kennt. Das kommt der Prüfung an neuen Fällen nahe; "gelernt" ist zu gut.',
          'Each case is checked with a classification that does not know it. This comes close to checking new cases; "learned" is too good.'), true),
      a(P('Die gelernte Quote, weil sie alle Fälle nutzt und darum die genauere Quote ist', 'The learned rate, because it uses all cases and is therefore the more accurate rate'),
        P('Gerade weil dieselben Fälle zum Lernen und zum Prüfen dienen, fällt die Quote zu gut aus.',
          'Precisely because the same cases serve for learning and checking, the rate turns out too good.')),
      a(P('Beide gelten gleich, denn sie unterscheiden sich nur in der Rundung der Prozentzahl', 'Both count equally, since they differ only in the rounding of the percentage'),
        P('Sie unterscheiden sich im Verfahren, nicht in der Rundung. Maßgeblich ist die Prüfung ohne den Fall selbst.',
          'They differ in the procedure, not in rounding. What counts is the check without the case itself.'))
    ],
    hilfe: ['frage-diskriminanz'], belege: ['Hilfe:frage-diskriminanz', 'Fachblatt:KURSPAKET']
  },
  {
    id: 'ka-dis-basis', thema: 'karten', karte: 'diskriminanz',
    stamm: P('Wann hilft die Diskriminanzanalyse tatsächlich bei der Einteilung?', 'When does the discriminant analysis actually help with classification?'),
    antworten: [
      a(P('Wenn die Leave-one-out-Quote deutlich über der Quote des Tipps auf die größte Gruppe liegt', 'When the leave-one-out rate lies clearly above the rate of guessing the largest group'),
        P('Statable nennt diese Quote ohne jede Rechnung dazu. Nur wenn die Prüfung deutlich darüber liegt, hilft die Rechnung.', 'Statable names this rate without any calculation alongside. Only if the check lies clearly above it does the calculation help.'), true),
      a(P('Sobald Wilks Λ berechnet ist und ein p-Wert dazu angezeigt wird, der klein genug ist', 'As soon as Wilks Λ is calculated and a p value is shown that is small enough'),
        P('Wilks Λ prüft, ob die Funktionen die Gruppen überhaupt trennen. Wie gut die Einteilung ist, zeigt die Trefferquote im Vergleich.',
          'Wilks Λ checks whether the functions separate the groups at all. How good the classification is shows in the hit rate in comparison.')),
      a(P('Wenn die gelernte Trefferquote über der Hälfte liegt, weil dann mehr als Raten erreicht ist', 'When the learned hit rate is above half, since more than guessing has then been reached'),
        P('Eine feste Hälfte sagt nichts: Bei einer sehr großen Gruppe wäre sie ohne Rechnung schon erreicht. Und die gelernte Quote ist ohnehin zu gut.',
          'A fixed half says nothing: with a very large group it would be reached without any calculation. And the learned rate is too good anyway.'))
    ],
    hilfe: ['frage-diskriminanz'], belege: ['Hilfe:frage-diskriminanz', 'Fachblatt:KURSPAKET']
  },
  // ---- Loglineare Modelle ----
  {
    id: 'ka-log-richtung', thema: 'karten', karte: 'loglinear',
    stamm: P('Beim loglinearen Modell ergibt sich ein großes p. Was heißt das?', 'A large p results in the loglinear model. What does that mean?'),
    antworten: [
      a(P('Das Modell widerspricht den Daten nicht; das beweist nicht, dass es stimmt', 'The model does not contradict the data; that does not prove it is right'),
        P('Die Richtung ist umgekehrt wie bei den meisten Tests, bei denen ein kleines p für einen Effekt spricht. Ein kleines p heißt hier: Dem Modell fehlt etwas.',
          'The direction is the reverse of most tests, where a small p speaks for an effect. A small p here means: the model is missing something.'), true),
      a(P('Das Modell ist falsch, weil die Zellhäufigkeiten stark vom Modell abweichen', 'The model is wrong because the cell counts deviate strongly from the model'),
        P('Starke Abweichungen zeigt ein kleines p an. Ein großes p heißt, dass sie nicht größer sind, als der Zufall erwarten lässt.',
          'Strong deviations show up as a small p. A large p means they are no larger than chance would lead one to expect.')),
      a(P('Die Kategorien hängen miteinander zusammen, sie sind nicht unabhängig', 'The categories are related to each other; they are not independent'),
        P('Das hängt vom gewählten Modell ab. Bei einem Unabhängigkeitsmodell würde ein großes p sogar für fehlenden Zusammenhang sprechen.',
          'That depends on the chosen model. With an independence model a large p would even speak for a missing relationship.'))
    ],
    hilfe: ['frage-loglinear'], belege: ['Hilfe:frage-loglinear', 'Fachblatt:KURSPAKET']
  },
  {
    id: 'ka-log-modell', thema: 'karten', karte: 'loglinear',
    stamm: P('Wie kommt Statable beim loglinearen Modell zu dem Modell, das geprüft wird?', 'How does Statable arrive at the model that is tested in the loglinear model?'),
    antworten: [
      a(P('Es prüft das selbst gewählte Modell; die automatische Rückwärtssuche wie SPSS ist ein Zusatz und nicht voreingestellt', 'It tests the model chosen by the user; the automatic backward search as in SPSS is an add-on and not preselected'),
        P('Zur Wahl stehen Unabhängigkeit, alle Zweifach-Wechselwirkungen, gesättigt oder einzelne Wechselwirkungen. Im gesättigten Modell ist G² = 0 und es gibt keinen Test. Die Rückwärtssuche ist datengetrieben, ihre p-Werte sind zu optimistisch; sie bleibt ein Vorschlag.',
          'The choices are independence, all two-way interactions, saturated or single interactions. In the saturated model G² = 0 and there is no test. The backward search is data-driven, its p values are too optimistic; it remains a suggestion.'), true),
      a(P('Es sucht von selbst das einfachste passende Modell heraus; eine Wahl von Hand gibt es nicht', 'It picks the simplest fitting model itself; there is no choice by hand'),
        P('Voreingestellt ist das Modell, das die Person wählt. Die Rückwärtssuche steht nur zusätzlich bereit. Zum Vergleich steht der AIC bereit.',
          'The default is the model the person chooses. The backward search is only an additional option. The AIC is available for comparison.')),
      a(P('Es rechnet das gesättigte Modell und zeigt dessen Tests als einzige Möglichkeit', 'It calculates the saturated model and shows its tests as the only possibility'),
        P('Das gesättigte Modell gibt die Zellhäufigkeiten genau wieder und hat keinen Test. Es ist nur eine der Wahlmöglichkeiten.',
          'The saturated model reproduces the cell counts exactly and has no test. It is only one of the options.'))
    ],
    hilfe: ['frage-loglinear'], belege: ['Hilfe:frage-loglinear', 'Fachblatt:KURSPAKET']
  },
  // ---- MANOVA ----
  {
    id: 'ka-man-gesamt', thema: 'karten', karte: 'manova',
    stamm: P('Eine MANOVA ist signifikant. Was sagt das über die Gruppen?', 'The MANOVA is significant. What does that say about the groups?'),
    antworten: [
      a(P('Sie unterscheiden sich in der Kombination der Zahlen, nicht unbedingt in jeder einzelnen', 'They differ in the combination of numbers, not necessarily in each one'),
        P('Die einzelnen Tests je Zahl sind nicht gegen mehrfaches Testen abgesichert. Für Vergleiche zwischen Gruppen braucht es Paarvergleiche mit Schutz davor.', 'The single tests for each number are not protected against multiple testing. Comparisons between groups need pairwise comparisons with such protection.'), true),
      a(P('Sie unterscheiden sich in jeder einzelnen der gemessenen Zahlen, auch in den schwächsten', 'They differ in every single one of the measured numbers, even the weakest'),
        P('Das Gesamtergebnis macht die einzelnen Tests nicht signifikant. Eine einzelne Zahl kann ohne Unterschied bleiben.',
          'The overall result does not make the single tests significant. A single number can remain without a difference.')),
      a(P('Zwei bestimmte Gruppen unterscheiden sich deutlich, und die übrigen Gruppen sind ähnlich', 'Two particular groups differ clearly, and the remaining groups are similar'),
        P('Welche Gruppen sich unterscheiden, beantwortet die MANOVA nicht. Dafür braucht es Vergleiche zwischen den Gruppen.',
          'Which groups differ is not answered by the MANOVA. That needs comparisons between the groups.'))
    ],
    hilfe: ['frage-manova'], belege: ['Hilfe:frage-manova', 'Fachblatt:KURSPAKET']
  },
  {
    id: 'ka-man-pillai', thema: 'karten', karte: 'manova',
    stamm: P('Warum nimmt Statable bei der MANOVA die Pillai-Spur als Hauptzeile?', 'Why does Statable take the Pillai trace as the main line in the MANOVA?'),
    antworten: [
      a(P('Sie ist unter den vier gegen verletzte Voraussetzungen am wenigsten empfindlich', 'Of the four statistics it is the least sensitive to violated assumptions'),
        P('Neben der Pillai-Spur stehen Wilks Λ, die Hotelling-Lawley-Spur und Roys größte Wurzel. Bei Roy ist das p zu klein, weil F nur eine obere Grenze ist.', 'Next to the Pillai trace stand Wilks Λ, the Hotelling-Lawley trace and Roy largest root. For Roy the p is too small because F is only an upper bound.'), true),
      a(P('Sie liefert von den vier Prüfgrößen den kleinsten p-Wert und zeigt Effekte am deutlichsten', 'Of the four statistics it gives the smallest p value and shows effects most clearly'),
        P('Welche Prüfgröße das kleinste p hat, hängt von den Daten ab. Gewählt wurde nach der Robustheit, nicht nach dem Ergebnis.',
          'Which statistic has the smallest p depends on the data. The choice was made by robustness, not by the result.')),
      a(P('Sie ist die einzige Prüfgröße, die SPSS ebenfalls berechnet und in der Ausgabe zeigt', 'It is the only statistic that SPSS also calculates and shows in its output'),
        P('SPSS (GLM, multivariat) zeigt alle vier Prüfgrößen mit denselben Zahlen wie Statable.',
          'SPSS (GLM, multivariate) shows all four statistics with the same numbers as Statable.'))
    ],
    hilfe: ['frage-manova'], belege: ['Hilfe:frage-manova', 'Fachblatt:KURSPAKET']
  },
  // ---- Armut und Ungleichheit ----
  {
    id: 'ka-arm-quote', thema: 'karten', karte: 'armut',
    stamm: P('Wie bildet Statable die Armutsgefährdungsquote?', 'How does Statable form the at-risk-of-poverty rate?'),
    antworten: [
      a(P('Als gewichteter Anteil unter einer Schwelle, üblich 60 % des gewichteten Medians', 'As the weighted share below a threshold, customarily 60% of the weighted median'),
        P('Der Median ist der Wert, unter dem die Hälfte der gewichteten Fälle liegt. Unter "Weitere Wege" lassen sich 40, 50, 60 und 70 % wählen; die Wahl ändert nur die Quote.', 'The median is the value below which half the weighted cases lie. Under "More options" 40, 50, 60 and 70% can be chosen; the choice changes only the rate.'), true),
      a(P('Als Anteil der Fälle unter 60 % des gewichteten Mittelwerts aller Einkommen im Datensatz', 'As the share of cases below 60% of the weighted mean of all incomes in the data set'),
        P('Die Schwelle hängt am gewichteten Median, nicht am Mittelwert. Der Median wird von sehr hohen Einkommen nicht gezogen.',
          'The threshold depends on the weighted median, not on the mean. The median is not pulled by very high incomes.')),
      a(P('Als Anteil der Fälle im unteren Fünftel der Einkommen, gemessen am gewichteten Median', 'As the share of cases in the bottom fifth of incomes, measured against the weighted median'),
        P('Das untere Fünftel gehört zum Verhältnis S80/S20. Die Quote misst Einkommen unter einer Schwelle, die aus dem Median folgt.',
          'The bottom fifth belongs to the ratio S80/S20. The rate measures incomes below a threshold derived from the median.'))
    ],
    hilfe: ['frage-armut'], belege: ['Hilfe:frage-armut', 'Fachblatt:INDEX-ARMUT']
  },
  {
    id: 'ka-arm-relativ', thema: 'karten', karte: 'armut',
    stamm: P('Alle Einkommen steigen im selben Verhältnis. Was geschieht mit der Armutsgefährdungsquote?', 'All incomes rise in the same proportion. What happens to the at-risk-of-poverty rate?'),
    antworten: [
      a(P('Sie bleibt gleich, denn sie misst relative Armutsgefährdung und nicht den Lebensstandard', 'It stays the same, since it measures relative risk of poverty, not living standard'),
        P('Mit den Einkommen steigt auch der Median und damit die Schwelle im gleichen Verhältnis. Wer vorher darunter lag, liegt auch nachher darunter.', 'With the incomes the median rises as well, and with it the threshold in the same proportion. Whoever was below it before is below it afterwards.'), true),
      a(P('Sie sinkt, weil weniger Fälle unter die Schwelle fallen, wenn alle Einkommen höher sind', 'It falls because fewer cases drop below the threshold when all incomes are higher'),
        P('Die Schwelle steigt mit. Eine feste Euro-Grenze würde anders wirken, aber die Quote folgt dem Median.',
          'The threshold rises along. A fixed monetary limit would act differently, but the rate follows the median.')),
      a(P('Sie steigt, weil der Median schneller wächst als die unteren Einkommen, die zurückbleiben', 'It rises because the median grows faster than the lower incomes, which fall behind'),
        P('Alle Einkommen wachsen im selben Verhältnis, auch die unteren. Der Median wächst nicht schneller als sie.',
          'All incomes grow in the same proportion, the lower ones too. The median does not grow faster than they do.'))
    ],
    hilfe: ['frage-armut'], belege: ['Hilfe:frage-armut', 'Fachblatt:INDEX-ARMUT']
  },
  // ---- Einzelfallanalyse ----
  {
    id: 'ka-ein-nap', thema: 'karten', karte: 'einzelfall',
    stamm: P('Der NAP (Anteil der Paare aus A- und B-Messung, in denen B besser ist; Gleichstand zählt halb) beträgt 0,75. Was heißt das?',
      'The NAP (share of pairs of an A and a B measurement in which B is better; a tie counts half) is 0.75. What does that mean?'),
    antworten: [
      a(P('In drei Vierteln der Paare liegt B vorn, ein Hinweis auf eine Wirkung', 'B is ahead in three quarters of the pairs, a hint of an effect'),
        P('Nach der Hilfe heißt 0,5 kein Unterschied und 1 vollständige Trennung; 0,75 liegt dazwischen. Ein Hinweis, kein Beweis: ein A-B-Design allein belegt keine Ursache.', 'According to the help, 0.5 means no difference and 1 complete separation; 0.75 lies in between. A hint, not proof: an A-B design alone does not prove a cause.'), true),
      a(P('Die Förderung hat bei drei von vier Messungen gewirkt und bei der vierten nicht', 'The support worked for three of four measurements and not for the fourth'),
        P('Der NAP vergleicht Paare aus je einer A- und B-Messung, er sagt nichts über Wirkung bei einzelnen Messungen.',
          'The NAP compares pairs of one A and one B measurement; it says nothing about effects at single measurements.')),
      a(P('Die Phasen sind vollständig getrennt, denn B liegt über dem Wert von A', 'The phases are completely separated, since B lies above the value of A'),
        P('Vollständige Trennung hieße, dass B in allen Paaren besser ist, also der Wert 1. Bei 0,75 überlappen die Phasen noch.',
          'Complete separation would mean that B is better in all pairs, that is the value 1. At 0.75 the phases still overlap.'))
    ],
    hilfe: ['frage-einzelfall'], belege: ['Hilfe:frage-einzelfall']
  },
  {
    id: 'ka-ein-mehrfach', thema: 'karten', mehrfach: true, karte: 'einzelfall',
    stamm: P('Welche Aussagen zur Einzelfallanalyse (NAP, Tau-U) in Statable stimmen? Mehrere können stimmen.',
      'Which statements about single-case analysis (NAP, Tau-U) in Statable are correct? Several may be correct.'),
    antworten: [
      a(P('Ein A-B-Design allein belegt keine Ursache', 'An A-B design alone does not prove a cause'),
        P('Reifung, Zufall oder andere Ereignisse können dahinterstecken. Aufeinanderfolgende Messungen sind außerdem oft ähnlich, dann sind die p-Werte zu optimistisch.',
          'Maturation, chance or other events may be behind it. Successive measurements are also often similar, and then the p values are too optimistic.'), true),
      a(P('Weniger als 3 Messpunkte je Phase meldet Statable als Hinweis', 'Statable reports fewer than 3 measurement points per phase as a note'),
        P('Verlangt werden mindestens 3 Messpunkte je Phase, besser 5 (What Works Clearinghouse).',
          'At least 3 measurement points per phase are required, preferably 5 (What Works Clearinghouse).'), true),
      a(P('Wechselnde Phasen (A-B-A-B) rechnet Statable', 'Statable calculates alternating phases (A-B-A-B)'),
        P('Wechselnde Phasen rechnet Statable noch nicht. Erst alle Messungen der Ausgangslage, dann alle der Förderung.',
          'Statable does not yet calculate alternating phases. First all baseline measurements, then all of the support.')),
      a(P('Ein Trend in der Ausgangslage wird von NAP und PND berücksichtigt', 'A trend in the baseline is taken into account by NAP and PND'),
        P('NAP und PND berücksichtigen den Trend nicht. Tau-U ("minus Trend A") und das baseline-korrigierte Tau tun es.',
          'NAP and PND do not account for the trend. Tau-U ("minus trend A") and the baseline-corrected tau do.'))
    ],
    hilfe: ['frage-einzelfall'], belege: ['Hilfe:frage-einzelfall']
  },
  // ---- Offene Antworten und Fälle ----
  {
    id: 'ka-kat-zustand', thema: 'karten', karte: 'kategorien',
    stamm: P('Eine Antwortzeile ist leer oder noch offen. Wie behandelt Statable sie beim Zählen der Kategorien?',
      'An answer row is empty or still open. How does Statable treat it when counting categories?'),
    antworten: [
      a(P('Als fehlend: gezählt, aber ohne stilles Auffüllen mit "keine Kategorie" oder 0', 'As missing: counted, but without silent filling with "no category" or 0'),
        P('Jede Zeile ist in genau einem von drei Zuständen: keine Antwort, Antwort noch offen oder zugeordnet. Wer "passt nirgends" festhalten will, legt eine Kategorie "Sonstiges" an.',
          'Each row is in exactly one of three states: no answer, answer still open or assigned. Anyone who wants to record "fits nowhere" creates a category "Other".'), true),
      a(P('Als Kategorie "Sonstiges", die Statable bei Bedarf von selbst für diese Zeilen anlegt', 'As a category "Other" that Statable creates by itself for these rows when needed'),
        P('Statable legt keine Kategorie von selbst an. "Sonstiges" legt die auswertende Person an, wenn sie es braucht.',
          'Statable creates no category by itself. The person doing the analysis creates "Other" if needed.')),
      a(P('Als 0 in der 0/1-Spalte der Kategorie, weil dort keine Zuordnung vorliegt', 'As 0 in the 0/1 column of the category, since there is no assignment'),
        P('Leer und offen bleiben fehlend. Eine 0 steht nur für eine beantwortete Zeile mit anderer Kategorie.',
          'Empty and open stay missing. A 0 stands only for an answered row with another category.'))
    ],
    hilfe: ['frage-kategorien'], belege: ['Hilfe:frage-kategorien', 'Fachblatt:WELLE4-FAELLE-OFFENE-ANTWORTEN']
  },
  {
    id: 'ka-kat-ki', thema: 'karten', karte: 'kategorien',
    stamm: P('Warum überlässt Statable die Zuordnung offener Antworten zu Kategorien der Person, statt sie selbst vorzunehmen?', 'Why does Statable leave the assignment of open answers to categories to the person instead of doing it itself?'),
    antworten: [
      a(P('Jede Zuordnung kommt von einer Person, ohne KI; Belastbarkeit hängt am Kodierleitfaden', 'Each assignment comes from a person, without AI; reliability rests on the coding guide'),
        P('Der Grund sind Datenschutz und Nachvollziehbarkeit. Eine zweite Person kann dieselben Antworten kodieren; "Übereinstimmung prüfen" öffnet dann die Frage "Stimmen Beurteilungen überein?".', 'The reasons are data protection and traceability. A second person can code the same answers; "Check agreement" then opens the question "Do ratings agree?".'), true),
      a(P('Die automatische Zuordnung ist bei weniger als 100 Antworten noch zu ungenau und wird geprüft', 'Automatic assignment is still too inaccurate with fewer than 100 answers and is being tested'),
        P('Eine Mindestzahl ist nicht der Grund. Es gibt keine automatische Kategorisierung, auch nicht bei vielen Antworten.',
          'A minimum number is not the reason. There is no automatic categorisation, not even with many answers.')),
      a(P('Kurze Freitexte lassen sich grundsätzlich nicht kodieren, auch nicht von Hand und mit Leitfaden', 'Short free texts cannot be coded in principle, not even by hand and with a guide'),
        P('Gerade für kurze Freitexte im Fragebogen ist die Karte gedacht. Für Interviews und lange Texte eignen sich Programme wie MAXQDA oder QualCoder.',
          'The card is meant precisely for short free texts in a questionnaire. For interviews and long texts programs such as MAXQDA or QualCoder are suitable.'))
    ],
    hilfe: ['frage-kategorien'], belege: ['Hilfe:frage-kategorien', 'Fachblatt:WELLE4-FAELLE-OFFENE-ANTWORTEN']
  },
  {
    id: 'ka-fae-gruppen', thema: 'karten', karte: 'faelle',
    stamm: P('Die Fallvergleichstabelle zeigt Fälle in Gruppen. Was sind diese Gruppen?', 'The case comparison table shows cases in groups. What are these groups?'),
    antworten: [
      a(P('Eine Deutung der Forschenden, kein Befund; der erste Vorschlag teilt am Median', 'An interpretation by the researchers, not a finding; first split at the median'),
        P('Eine andere Schwelle ergibt andere Gruppen. Fälle lassen sich verschieben, Gruppen umbenennen, und die Notiz der Gruppe hält die Deutung fest.', 'Another threshold gives other groups. Cases can be moved, groups renamed, and the note of the group records the interpretation.'), true),
      a(P('Das Ergebnis einer Clusteranalyse, die Statable im Hintergrund über die Zahlen rechnet', 'The result of a cluster analysis that Statable runs in the background on the numbers'),
        P('Statable rechnet hier keine Clusteranalyse. Es beschreibt nur, testet nichts und ordnet nicht mit künstlicher Intelligenz.',
          'Statable runs no cluster analysis here. It only describes, tests nothing and does not sort with artificial intelligence.')),
      a(P('Getestete Gruppen, deren Unterschied mit einem p-Wert und einer Effektstärke belegt ist', 'Tested groups whose difference is supported by a p value and an effect size'),
        P('Es gibt kein p, kein Konfidenzintervall und keine Effektstärke. Die Tabelle beschreibt diese Fälle und lässt sich nicht auf andere Personen übertragen.',
          'There is no p, no confidence interval and no effect size. The table describes these cases and cannot be transferred to other people.'))
    ],
    hilfe: ['frage-faelle'], belege: ['Hilfe:frage-faelle', 'Fachblatt:WELLE4-FAELLE-OFFENE-ANTWORTEN']
  },
  // ---- Übereinstimmung: Intercoder, Methodenvergleich ----
  {
    id: 'ka-int-paradox', thema: 'karten', karte: 'uebereinstimmung',
    stamm: P('Zwei Kodierende stimmen in 90 % der Fälle überein, doch κ ist niedrig. Wie kann das sein?', 'Two coders agree in 90% of the cases, yet κ is low. How can that be?'),
    antworten: [
      a(P('Wegen einer seltenen Kategorie (Kappa-Paradox); Brennan-Prediger hängt nicht davon ab', 'Because of a rare category (kappa paradox); Brennan-Prediger does not depend on it'),
        P('κ hängt von der Häufigkeit der Kategorien ab. Der Brennan-Prediger-Koeffizient rechnet die Zufallsübereinstimmung mit 1/q und ist davon unabhängig.', 'κ depends on the frequency of the categories. The Brennan-Prediger coefficient computes chance agreement as 1/q and is independent of it.'), true),
      a(P('Weil κ die zufällig erwartete Übereinstimmung nicht abzieht und deshalb zu streng urteilt', 'Because κ does not subtract the agreement expected by chance and therefore judges too strictly'),
        P('κ zieht gerade die Zufallsübereinstimmung ab. Dadurch kann es bei hoher Prozentübereinstimmung niedrig ausfallen.',
          'κ subtracts exactly the chance agreement. That can make it low despite a high percentage agreement.')),
      a(P('Weil κ nur ordinale Daten bewertet und hier nominale Kategorien vorliegen, die es ablehnt', 'Because κ rates only ordinal data and nominal categories are present here, which it rejects'),
        P('Cohens und Fleiss\' κ gelten für nominale Kategorien; für ordinale gibt es das gewichtete κ und Krippendorffs α.',
          'Cohen\'s and Fleiss\' κ are for nominal categories; for ordinal ones there are weighted κ and Krippendorff\'s α.'))
    ],
    hilfe: ['intercoder'], belege: ['Hilfe:intercoder', 'Fachblatt:G2-INTERCODER']
  },
  {
    id: 'ka-met-konstante', thema: 'karten', karte: 'uebereinstimmung',
    stamm: P('Beim Methodenvergleich mit Passing-Bablok schließt das Intervall der Konstanten die 0 aus. Was folgt?', 'In the method comparison with Passing-Bablok the interval of the constant excludes 0. What follows?'),
    antworten: [
      a(P('Ein Hinweis auf eine konstante Abweichung der Verfahren; ein Beweis ist es nicht', 'A hint of a constant difference between the methods; it is not proof'),
        P('Schließt das Intervall der Steigung die 1 aus, ist es ein Hinweis auf eine proportionale Abweichung. Beides bleibt ein Hinweis.',
          'If the interval of the slope excludes 1, it is a hint of a proportional difference. Both remain hints.'), true),
      a(P('Die Verfahren sind gleichwertig, denn die Abweichung ist gering und damit bedeutungslos', 'The methods are equivalent, since the deviation is small and therefore meaningless'),
        P('Eine Konstante ungleich null ist ein Hinweis auf eine feste Abweichung, kein Beweis für Gleichwertigkeit oder Unterschied. Auch ein Intervall mit der 0 würde Gleichwertigkeit nicht belegen.',
          'A constant different from zero is a hint of a fixed difference, not proof of equivalence or difference. Even an interval containing 0 would not prove equivalence.')),
      a(P('Die Steigung weicht von 1 ab, und die Verfahren unterscheiden sich proportional', 'The slope differs from 1, and the methods differ proportionally'),
        P('Konstante und Steigung werden getrennt beurteilt. Ein Intervall der Konstanten sagt nichts über die Steigung.',
          'Constant and slope are judged separately. An interval of the constant says nothing about the slope.'))
    ],
    hilfe: ['methodenvergleich'], belege: ['Hilfe:methodenvergleich', 'Fachblatt:SPAETER-F-UEBERLEBEN-MEDIZIN']
  },
  {
    id: 'ka-korr-mehrfach', thema: 'karten', mehrfach: true, karte: 'korrmatrix',
    stamm: P('Welche Aussagen zur Korrelationsmatrix in Statable stimmen? Mehrere können stimmen.', 'Which statements about the correlation matrix in Statable are correct? Several may be correct.'),
    antworten: [
      a(P('Je Paar zählen alle Personen mit beiden Angaben, also kann n je Paar verschieden sein', 'For each pair all people with both values count, so n can differ from pair to pair'),
        P('Das ist der paarweise Ausschluss. n, p und das 95-%-Konfidenzintervall stehen darum je Paar unter der Matrix.', 'That is pairwise exclusion. n, p and the 95% confidence interval therefore appear for each pair below the matrix.'), true),
      a(P('Die Holm-Korrektur ist standardmäßig aus, wie in SPSS', 'The Holm correction is off by default, as in SPSS'),
        P('Bei der Suche nach Zusammenhängen schaltet man "p-Werte nach Holm korrigieren" ein. Eine vorher geplante Frage zu einem Paar darf ohne Korrektur berichtet werden.', 'When searching for relationships one switches on "Holm-adjust the p values". A question about one pair planned beforehand may be reported without correction.'), true),
      a(P('Signifikante Paare kennzeichnet Statable mit Sternen', 'Statable marks significant pairs with stars'),
        P('Sterne setzt Statable nicht: p steht je Paar in der Tabelle.', 'Statable sets no stars: p appears for each pair in the table.')),
      a(P('Die Grenzen für schwach, mittel und stark sind feste Werte, die für jedes Fach gelten', 'The limits for weak, medium and strong are fixed values that apply to every field'),
        P('Es sind grobe Verabredungen nach Cohen; im eigenen Fach kann es abweichen.', 'They are rough conventions after Cohen; in one\'s own field it may differ.'))
    ],
    hilfe: ['frage-korrmatrix'], belege: ['Hilfe:frage-korrmatrix', 'Fachblatt:SPAETER-A-GRUNDLAGEN']
  },
  {
    id: 'ka-man-mehrfach', thema: 'karten', mehrfach: true, karte: 'manova',
    stamm: P('Welche Aussagen zur MANOVA in Statable stimmen? Mehrere können stimmen.', 'Which statements about the MANOVA in Statable are correct? Several may be correct.'),
    antworten: [
      a(P('Roys größte Wurzel hat ein zu kleines p, weil F nur eine obere Grenze ist', 'Roy largest root has a p that is too small, because F is only an upper bound'),
        P('Der Satz dazu steht bei Roy in der Tabelle. Als Hauptzeile gilt die Pillai-Spur.', 'The sentence on this appears at Roy in the table. The Pillai trace is the main line.'), true),
      a(P('Hängen zwei Zahlen sehr eng zusammen, weist Statable darauf hin; oft reicht dann eine davon', 'If two numbers are very closely related, Statable points this out; often one of them then suffices'),
        P('Bei einer Korrelation von mehr als neun Zehnteln ist die eine Zahl fast die andere.', 'With a correlation of more than nine tenths one number is almost the other.'), true),
      a(P('Gleiche Kovarianzen in den Gruppen prüft Statable mit einem eigenen Test', 'Statable checks equal covariances in the groups with a test of its own'),
        P('Die Voraussetzungen werden nicht mit einem Test geprüft: gleiche Kovarianzen und multivariate Normalverteilung.', 'The assumptions are not checked with a test: equal covariances and multivariate normality.')),
      a(P('Nach der MANOVA zeigt Statable, welche Gruppen sich unterscheiden', 'After the MANOVA Statable shows which groups differ'),
        P('Dafür braucht es Vergleiche zwischen den Gruppen mit Schutz vor mehrfachem Testen. Die Tests je Zahl sind nicht abgesichert.', 'That needs comparisons between the groups with protection against multiple testing. The tests for each number are not protected.'))
    ],
    hilfe: ['frage-manova'], belege: ['Hilfe:frage-manova', 'Fachblatt:KURSPAKET']
  },
  {
    id: 'ka-arm-mehrfach', thema: 'karten', mehrfach: true, karte: 'armut',
    stamm: P('Welche Aussagen zu Armut und Ungleichheit in Statable stimmen? Mehrere können stimmen.', 'Which statements about poverty and inequality in Statable are correct? Several may be correct.'),
    antworten: [
      a(P('S80/S20 teilt das Einkommen des oberen Fünftels durch das des unteren; dafür gibt es keinen Standardfehler', 'S80/S20 divides the income of the top fifth by that of the bottom fifth; there is no standard error for it'),
        P('Bei einem Wert von 4 hat das obere Fünftel viermal so viel wie das untere.', 'With a value of 4 the top fifth has four times as much as the bottom fifth.'), true),
      a(P('Der Gini-Koeffizient läuft von 0 (alle haben gleich viel) bis 100 (eine Person hat alles)', 'The Gini coefficient runs from 0 (everyone has the same) to 100 (one person has everything)'),
        P('Negative Einkommen sperren Gini und S80/S20, mit dem Grund.', 'Negative incomes block Gini and S80/S20, with the reason.'), true),
      a(P('Statable rechnet das Einkommen selbst auf Haushaltsgröße um (Äquivalenzskala)', 'Statable converts income to household size itself (equivalence scale)'),
        P('Statable rechnet keine Äquivalenzskala. Das Einkommen muss schon so vorliegen, wie es verglichen werden soll.', 'Statable computes no equivalence scale. The income must already be in the form in which it is to be compared.')),
      a(P('Das Gewicht ist freiwillig; ohne Gewicht rechnet die Karte einfach ungewichtet', 'The weight is optional; without a weight the card simply calculates unweighted'),
        P('Das Gewicht ist Pflicht: Es sagt, wie viele Personen ein Fall vertritt.', 'The weight is required: it says how many people a case represents.'))
    ],
    hilfe: ['frage-armut'], belege: ['Hilfe:frage-armut', 'Fachblatt:INDEX-ARMUT']
  },
  {
    id: 'ka-kat-mehrfach', thema: 'karten', mehrfach: true, karte: 'kategorien',
    stamm: P('Welche Aussagen zum Ordnen offener Antworten in Statable stimmen? Mehrere können stimmen.', 'Which statements about sorting open answers in Statable are correct? Several may be correct.'),
    antworten: [
      a(P('Die Tasten 1 bis 9 ordnen eine Antwort der Kategorie zu, 0 nimmt die Zuordnung zurück', 'Keys 1 to 9 assign an answer to a category, 0 takes the assignment back'),
        P('Die Tasten gelten nur, solange der Fokus in der Zuordnung liegt, nie in einem Textfeld.', 'The keys apply only while focus is in the assignment, never in a text field.'), true),
      a(P('Bei der zweiten Kodierung ist die erste Zuordnung verborgen', 'For the second coding the first assignment is hidden'),
        P('"Zweite Kodierung anlegen" erzeugt dafür eine eigene Zuordnung. Für wirklich unabhängige Kodierung arbeitet die zweite Person in einer eigenen Kopie der Projektdatei.', '"Create a second coding" creates a separate assignment for it. For truly independent coding the second person works in a copy of the project file of their own.'), true),
      a(P('Statable schlägt aus dem Text die passende Kategorie vor', 'Statable suggests the fitting category from the text'),
        P('Statable ordnet nichts selbst zu: keine KI, und kein Text wird verschickt.', 'Statable assigns nothing itself: no AI, and no text is sent.')),
      a(P('Die Tabelle prüft mit einem Test, ob die Verteilung vom Zufall abweicht', 'The table tests whether the distribution deviates from chance'),
        P('Die Tabelle beschreibt diese Antworten. Sie prüft nichts: kein Test, kein p-Wert.', 'The table describes these answers. It checks nothing: no test, no p value.'))
    ],
    hilfe: ['frage-kategorien'], belege: ['Hilfe:frage-kategorien', 'Fachblatt:WELLE4-FAELLE-OFFENE-ANTWORTEN']
  }
];
export const FAELLE: ThemaModul['FAELLE'] = {};
