/**
 * Üben: Übereinstimmung auf Segmentebene, Quantifizieren und Pseudonymisieren (Erheben, Stufe 5, Paket 5F-b, 09.11.2026): drei Einheiten
 * (uebereinstimmung-segmente, quantifizieren-grenzen, pseudonymisieren), 16 Fragen. Belege: `Beleg:<id>` verweist auf docs/fachblaetter/BELEGE-ERHEBEN.json
 * (O'Connor und Joffe 2020, MAXQDA-Handbuch MX22 nur in Zusammenfassung gelesen, Sandelowski, Voils und Knafl 2009, Schoonenboom 2023, UK Data Service, DSGVO);
 * Statable-Funktionen stützen sich auf die Hilfe-Artikel (`Hilfe:<id>`). Meyermann und Porzelt (2014) und Maxwell (2010) sind nicht gelesen und stehen hier nicht als Beleg.
 * Eigene Wortlaute, keine Dezimalzahlen. Formregeln aus den Blindrunden der Stufe 4: falsche Antworten so lang und so vorsichtig wie die richtige, Fachbegriff in
 * Klammern bei jeder Antwort, echte Fehldeutungen statt Unsinn, Lösungsplätze verteilt.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

export const FRAGEN_QUALITATIV: Frage[] = [
  // ---------------------------------------------------------------- Übereinstimmung auf Segmentebene
  {
    id: 'eh-us-regel', thema: 'erheben',
    stamm: P('Person A hat eine Textstelle von 100 Zeichen mit dem Code „Planung“ markiert. Person B hat mit demselben Code die ersten 80 dieser Zeichen markiert. Gelten beide Stellen bei einer Schwelle von 90 Prozent als gleich?',
      'Person A marked a passage of 100 characters with the code “Planning”. Person B marked the first 80 of these characters with the same code. Do both passages count as the same at a threshold of 90 percent?'),
    antworten: [
      a(P('Ja: B hat 80 der 100 Zeichen getroffen, und weil beide Stellen im selben Bereich liegen und denselben Code tragen, genügt das für die Übereinstimmung (Teilmenge)',
        'Yes: B hit 80 of the 100 characters, and because both passages lie in the same area and carry the same code, that is enough for agreement (subset)'),
        P('Es zählt der gemeinsame Text geteilt durch den Text beider zusammen, nicht der Anteil an der Stelle von A. Das ergibt 80 Prozent, und das liegt unter der Schwelle.',
          'What counts is the shared text divided by the text of both together, not the share of A’s passage. That gives 80 percent, which is below the threshold.')),
      a(P('Nein: Gemeinsam sind 80 Zeichen, zusammen belegen beide Stellen 100 Zeichen, die Überlappung beträgt also 80 Prozent und liegt unter der Schwelle (Überlappung)',
        'No: 80 characters are shared, together both passages cover 100 characters, so the overlap is 80 percent and lies below the threshold (overlap)'),
        P('So rechnet es Statable, und so steht es auch im MAXQDA-Handbuch: gemeinsame Fläche im Verhältnis zur gesamten Fläche beider Zuordnungen. Bei einer Schwelle von 60 Prozent wären die Stellen gleich.',
          'That is how Statable calculates, and how the MAXQDA manual puts it: shared area relative to the total area of both assignments. At a threshold of 60 percent the passages would be the same.'), true),
      a(P('Nein: Sobald zwei Stellen verschieden lang sind, gelten sie ohne Rücksicht auf die eingestellte Schwelle als verschieden, weil die Grenzen nicht übereinstimmen (Längenunterschied)',
        'No: as soon as two passages differ in length they count as different regardless of the threshold set, because the boundaries do not match (difference in length)'),
        P('Verschiedene Länge allein entscheidet nicht. Die Schwelle erlaubt gerade kleine Unterschiede in den Grenzen; bei 60 Prozent wären diese beiden Stellen gleich.',
          'Different length alone does not decide. The threshold exists precisely to allow small differences in the boundaries; at 60 percent these two passages would be the same.')),
      a(P('Ja: Bei Stellen mit gleichem Code zählt nur, ob sie sich überhaupt berühren; die Schwelle gilt erst, wenn die beiden Personen verschiedene Codes vergeben haben (Codevergleich)',
        'Yes: for passages with the same code it only matters whether they touch at all; the threshold applies only when the two persons assigned different codes (code comparison)'),
        P('Es ist umgekehrt: Derselbe Code ist die Voraussetzung, und die Schwelle prüft dann, ob sich die Stellen genug decken. Bei verschiedenen Codes gibt es kein Gegenstück.',
          'It is the other way round: the same code is the precondition, and the threshold then checks whether the passages coincide enough. With different codes there is no counterpart.'))
    ],
    hilfe: ['eh-uebereinstimmung-segmente'], belege: ['Beleg:maxqda-segment-90', 'Hilfe:eh-uebereinstimmung-segmente']
  },
  {
    id: 'eh-us-je-code', thema: 'erheben',
    stamm: P('Ein Team kodiert mit zwölf Codes und berichtet für die Übereinstimmung nur einen Gesamtwert, der gut aussieht. Welche Angabe ergänzen O’Connor und Joffe?',
      'A team codes with twelve codes and reports only one overall value for agreement, which looks good. Which information do O’Connor and Joffe add?'),
    antworten: [
      a(P('Die Zahl der Kodierenden, weil ein Gesamtwert erst mit mehr als zwei Personen aussagekräftig wird und sich dann besser mit anderen Studien vergleichen lässt (Teamgröße)',
        'The number of coders, because an overall value becomes informative only with more than two persons and can then be compared better with other studies (team size)'),
        P('Die Teamgröße ändert nichts daran, dass ein Sammelwert einzelne Codes verdecken kann. Gefordert sind Werte je Code.',
          'The team size does not change the fact that a pooled value can hide single codes. Values per code are called for.')),
      a(P('Die Prozentzahl in Klammern, weil zufallsbereinigte Maße in der qualitativen Forschung als zu streng gelten und der Gesamtwert sonst unnötig schlecht wirkt (Prozentwert)',
        'The percentage in brackets, because chance-corrected measures count as too strict in qualitative research and the overall value would otherwise look needlessly poor (percentage)'),
        P('Nach der Quelle gelten zufallsbereinigte Maße als aussagekräftiger als reine Prozentwerte, nicht als zu streng.',
          'According to the source chance-corrected measures count as more informative than plain percentages, not as too strict.')),
      a(P('Die durchschnittliche Länge der Segmente, weil lange Segmente die Übereinstimmung künstlich erhöhen und der Gesamtwert sonst überschätzt wird (Segmentlänge)',
        'The average length of the segments, because long segments raise agreement artificially and the overall value would otherwise be overestimated (segment length)'),
        P('Die Segmentlänge ist ein eigenes Thema; die Quelle verlangt als Ergänzung Werte je Code, damit schlecht übereinstimmende Codes nicht verschwinden.',
          'Segment length is a topic of its own; the source calls for values per code as an addition so that poorly agreeing codes do not disappear.')),
      a(P('Die Übereinstimmung für jeden einzelnen Code, denn ein Gesamtwert kann einen Code verdecken, bei dem sich die beiden kaum einig sind (Einzelwerte je Code)',
        'The agreement for each single code, because an overall value can hide a code on which the two hardly agree (values per code)'),
        P('So steht es bei O’Connor und Joffe (2020): Kennwerte je Code angeben, sonst verschwinden schlechte Codes im Sammelwert.',
          'This is what O’Connor and Joffe (2020) say: report values per code, otherwise poor codes vanish in the pooled value.'), true)
    ],
    hilfe: ['eh-uebereinstimmung-segmente'], belege: ['Beleg:oconnor2020-je-code', 'O’Connor und Joffe 2020']
  },
  {
    id: 'eh-us-segmentieren', thema: 'erheben',
    stamm: P('Zwei Kodierende markieren und kodieren denselben Text, und jede Person setzt die Segmentgrenzen selbst. Welches Problem beschreiben O’Connor und Joffe dabei?',
      'Two coders mark and code the same text, and each person sets the segment boundaries themselves. Which problem do O’Connor and Joffe describe?'),
    antworten: [
      a(P('Schon kleinste Unterschiede in den Grenzen, etwa eine Ziffer oder ein Satzzeichen, gefährden automatische Maße; ein Ausweg ist, dass eine Person segmentiert (Segmentgrenzen)',
        'Even the smallest differences in the boundaries, such as a digit or a punctuation mark, endanger automatic measures; one way out is that one person segments (segment boundaries)'),
        P('Das beschreiben die Autoren: Kleinste Unterschiede genügen, und der Vorschlag lautet, dass eine Person segmentiert und die andere diese Segmente kodiert.',
          'The authors describe this: the smallest differences suffice, and the suggestion is that one person segments and the other codes these segments.'), true),
      a(P('Selbst gesetzte Grenzen führen zu sehr hohen Werten, weil beide Personen den Text gleich lesen und dieselben Stellen für wichtig halten, sodass die Übereinstimmung überschätzt wird (Überschätzung)',
        'Boundaries set by the coders themselves lead to very high values because both persons read the text alike and consider the same passages important, so agreement is overestimated (overestimation)'),
        P('Die Quelle nennt das Gegenteil des Problems: Die Werte werden unzuverlässig, weil Grenzen schon um eine Kleinigkeit abweichen.',
          'The source names a different problem: values become unreliable because boundaries already differ by a trifle.')),
      a(P('Überlappende Segmente machen die Rechnung mehrdeutig; darum empfehlen sie, Segmente vor jedem Maß zusammenzulegen, auch wenn dabei feine Unterschiede der Grenzen verloren gehen (Zusammenlegen)',
        'Overlapping segments make the calculation ambiguous; that is why they recommend merging segments before any measure, even if fine differences in the boundaries get lost (merging)'),
        P('Überlappende Segmente sind der Normalfall. Das Problem ist, dass automatische Maße schon bei kleinen Abweichungen der Grenzen unzuverlässig werden.',
          'Overlapping segments are the normal case. The problem is that automatic measures become unreliable already with small deviations of the boundaries.')),
      a(P('Die Einheit der Kodierung wird erst nach der Auswertung festgelegt, weil sich zeigt, welche Segmente die Kodierenden tatsächlich bilden (nachträgliche Einheit)',
        'The unit of coding is fixed only after the analysis because it then becomes clear which segments the coders actually form (unit fixed afterwards)'),
        P('Die Quelle verlangt, vorab festzulegen, was die Einheit ist. Nachträgliches Festlegen verschärft das Problem.',
          'The source demands that the unit be fixed in advance. Fixing it afterwards makes the problem worse.'))
    ],
    hilfe: ['eh-uebereinstimmung-segmente'], belege: ['Beleg:oconnor2020-segmentierung', 'O’Connor und Joffe 2020']
  },
  {
    id: 'eh-us-schwelle', thema: 'erheben',
    stamm: P('Im Beispielprojekt von Statable steigt die Übereinstimmung auf Segmentebene deutlich, wenn man die Schwelle von 90 auf 60 Prozent senkt. Wie ist das zu lesen?',
      'In the Statable example project agreement at segment level rises clearly when the threshold is lowered from 90 to 60 percent. How should this be read?'),
    antworten: [
      a(P('Die beiden Kodierenden haben sich beim zweiten Durchgang angenähert, weil sie mit der niedrigeren Schwelle genauer gearbeitet haben (Lerneffekt)',
        'The two coders came closer together in the second pass because they worked more precisely with the lower threshold (learning effect)'),
        P('Die Kodierungen bleiben dieselben, nur die Regel dafür, was als gleich gilt, wird weicher. Ein Lerneffekt ist daran nicht zu erkennen.',
          'The codings stay the same, only the rule for what counts as the same becomes softer. No learning effect can be seen in it.')),
      a(P('Statable gleicht die Kodierungen bei einer niedrigeren Schwelle selbstständig an, damit die Segmente besser zusammenpassen und die Abweichungsliste kürzer wird (Angleichung)',
        'At a lower threshold Statable adjusts the codings by itself so that the segments fit together better and the list of disagreements becomes shorter (adjustment)'),
        P('Statable ändert nie von selbst Kodierungen. Es zählt nur anders, wann zwei Stellen als gleich gelten.',
          'Statable never changes codings by itself. It only counts differently when two passages count as the same.')),
      a(P('Mit der Schwelle ändert sich nur, welche Paare als gleich gelten; darum gibt man die Schwelle mit an und schaut in die Abweichungsliste (Schwellenwert)',
        'The threshold only changes which pairs count as the same; so the threshold is stated along with it and the list of disagreements is consulted (threshold)'),
        P('Die Kodierungen sind dieselben, nur gelten mehr Paare als gleich. Die Hilfe von Statable rät, die Schwelle zu nennen und die Abweichungen zu zeigen.',
          'The codings are the same, only more pairs count as the same. Statable’s help advises stating the threshold and showing the disagreements.'), true),
      a(P('Die Prozentzahl bei 60 Prozent ist die zuverlässigere, weil sie mehr Einheiten erfasst und deshalb weniger vom Zufall abhängt (Stichprobengröße)',
        'The percentage at 60 percent is the more reliable one because it covers more units and therefore depends less on chance (sample size)'),
        P('Die Zahl der Einheiten bleibt gleich. Eine weichere Schwelle macht den Wert nicht zuverlässiger, sondern nachsichtiger.',
          'The number of units stays the same. A softer threshold makes the value not more reliable but more lenient.'))
    ],
    hilfe: ['eh-uebereinstimmung-segmente'], belege: ['Hilfe:eh-uebereinstimmung-segmente', 'Beispielprojekt scripts/beispiel-qdpx/README.md']
  },
  {
    id: 'eh-us-konsens', thema: 'erheben',
    stamm: P('Zwei Kodierende haben sich in Statable auf eine gemeinsame Kodierung geeinigt (Konsens) und vergleichen danach jede Person mit dem Konsens. Wofür steht die hohe Übereinstimmung?',
      'Two coders agreed on a joint coding in Statable (consensus) and then compare each person with the consensus. What does the high agreement stand for?'),
    antworten: [
      a(P('Sie belegt, dass die Kodierung jetzt besonders zuverlässig ist, weil beide Personen nach der Einigung dasselbe Ergebnis tragen (Zuverlässigkeit)',
        'It proves that the coding is now particularly reliable because both persons stand behind the same result after the agreement (reliability)'),
        P('Eine gemeinsam verantwortete Kodierung ist nicht zuverlässig im Sinn des Maßes. Für die Zuverlässigkeit zählt der Wert vor der Einigung.',
          'A jointly owned coding is not reliable in the sense of the measure. For reliability the value before the agreement counts.')),
      a(P('Sie zeigt, wie viel sich für jede Person durch die Einigung geändert hat; ein Gütemaß ist sie nicht, zählen soll der Wert vor der Einigung (Änderungsausmaß)',
        'It shows how much changed for each person through the agreement; it is no quality measure, what should count is the value before the agreement (degree of change)'),
        P('So steht es in der Hilfe von Statable: Nach der Einigung ist die Übereinstimmung mit dem Konsens kein Gütemaß mehr, sondern zeigt, wie viel sich geändert hat.',
          'This is what Statable’s help says: after the agreement the agreement with the consensus is no longer a quality measure but shows how much has changed.'), true),
      a(P('Sie ersetzt die ursprüngliche Berechnung, denn die Kodierungen von A und B werden durch die Einigung überschrieben und zählen nicht mehr (Überschreiben)',
        'It replaces the original calculation because the codings of A and B are overwritten by the agreement and no longer count (overwriting)'),
        P('Der Konsens ist eine neue, dritte Kodierung; die Kodierungen von A und B bleiben unverändert.',
          'The consensus is a new, third coding; the codings of A and B remain unchanged.')),
      a(P('Sie ist bei einer hohen Schwelle am aussagekräftigsten, sodass man nach der Einigung die Schwelle anhebt, um die Qualität der Entscheidungen zu prüfen (Schwellenwahl)',
        'It is most informative at a high threshold, so after the agreement one raises the threshold to check the quality of the decisions (choice of threshold)'),
        P('Die Schwelle ändert nichts an der Deutung: Der Vergleich mit dem Konsens misst das Ausmaß der Änderung, nicht die Qualität der Entscheidungen.',
          'The threshold does not change the interpretation: the comparison with the consensus measures the extent of change, not the quality of the decisions.'))
    ],
    hilfe: ['eh-konsens', 'eh-uebereinstimmung-segmente'], belege: ['Hilfe:eh-konsens']
  },
  {
    id: 'eh-qg-null', thema: 'erheben',
    stamm: P('In einer Fall-Code-Matrix steht für Fall 4 beim Code „Unterstützung“ eine 0. Was darf man daraus schließen?',
      'In a case-code matrix a 0 stands for case 4 at the code “Support”. What may one conclude from it?'),
    antworten: [
      a(P('Dass die Person keine Unterstützung erlebt hat, denn sonst hätte sie das Thema im Interview angesprochen und es wäre kodiert worden (fehlende Unterstützung)',
        'That the person experienced no support, because otherwise she would have raised the topic in the interview and it would have been coded (lack of support)'),
        P('Das lässt sich nicht schließen. Die Person kann es nicht erwähnt haben, nicht gefragt worden sein, oder die Stelle wurde übersehen.',
          'That cannot be concluded. The person may not have mentioned it, may not have been asked, or the passage was overlooked.')),
      a(P('Dass das Merkmal in diesem Fall fehlt und der Wert deshalb wie ein fehlender Wert aus der Rechnung genommen werden kann (fehlender Wert)',
        'That the feature is absent in this case and the value can therefore be taken out of the calculation like a missing value (missing value)'),
        P('Eine 0 steht für „nicht kodiert“. Sie wie einen fehlenden Wert wegzulassen oder wie „trifft nicht zu“ zu lesen, würde mehr behaupten, als die Tabelle weiß.',
          'A 0 stands for “not coded”. Leaving it out like a missing value or reading it as “does not apply” would claim more than the table knows.')),
      a(P('Nur, dass im Interview dieses Falls an keiner Stelle mit diesem Code kodiert wurde; ob das Thema fehlt, war nicht gefragt oder übersehen wurde, bleibt offen (nicht kodiert)',
        'Only that the interview of this case was coded with this code nowhere; whether the topic is absent, was not asked about or was overlooked stays open (not coded)'),
        P('So sehen es Sandelowski, Voils und Knafl (2009): „nicht erwähnt“ ist nicht „nicht vorhanden“, und das Fehlen kann an der Struktur des Interviews liegen.',
          'This is how Sandelowski, Voils and Knafl (2009) see it: “not mentioned” is not “not present”, and the absence can be due to the structure of the interview.'), true),
      a(P('Vorsichtig gelesen, dass das Thema für diese Person eher weniger wichtig war; mehrere Nullen in einem Fall lassen sich als Hinweis auf geringe Bedeutung deuten (geringe Bedeutung)',
        'Read cautiously, that the topic was rather less important for this person; several zeros in one case can be interpreted as a hint at low importance (low importance)'),
        P('Wie oft etwas kodiert ist, hängt auch von Länge und Feinheit der Kodierung ab. Auf die Bedeutung lässt sich aus einer 0 nicht schließen.',
          'How often something is coded also depends on the length and fineness of the coding. A 0 does not allow conclusions about importance.'))
    ],
    hilfe: ['eh-fall-code-matrix'], belege: ['Beleg:sandelowski2009-null', 'Sandelowski, Voils und Knafl 2009']
  },
  {
    id: 'eh-qg-zaehlen', thema: 'erheben',
    stamm: P('In der Matrix steht für Fall 2 beim Code „Zeitdruck“ eine 4, für Fall 1 eine 1. Das Interview von Fall 2 war kürzer als das von Fall 1. Was lässt sich über den Zeitdruck sagen?',
      'In the matrix a 4 stands for case 2 at the code “Time pressure”, a 1 for case 1. The interview of case 2 was shorter than that of case 1. What can be said about time pressure?'),
    antworten: [
      a(P('Er ist in Fall 2 viermal so stark, denn die Zahl der Kodierungen misst die Stärke, und die kürzere Gesprächsdauer spricht sogar für eine noch höhere Dichte (Stärke)',
        'It is four times as strong in case 2, because the number of codings measures strength, and the shorter conversation even points to a still higher density (strength)'),
        P('Die Anzahl misst nicht die Stärke. Sie hängt von Ausführlichkeit der Person und Feinheit der Kodierung ab, und ein Zählen verlangt Urteile darüber, was als eine Stelle gilt.',
          'The count does not measure strength. It depends on how detailed the person was and how finely it was coded, and counting requires judgements about what counts as one passage.')),
      a(P('Zunächst nur, dass in Fall 2 mehr Stellen kodiert sind; ob der Zeitdruck dort größer ist, zeigen die Texte oder eine Einstufung, denn Zählen ist Deuten (Anzahl)',
        'First only that more passages are coded in case 2; whether the time pressure is higher there is shown by the texts or a rating, because counting is interpreting (count)'),
        P('So sehen es die Quellen: Zählen ist eine deutende Tätigkeit, und die Zahl hängt von Entscheidungen der Kodierenden und von der Länge ab (Sandelowski, Voils und Knafl 2009).',
          'This is how the sources see it: counting is an interpretive activity, and the number depends on decisions of the coders and on length (Sandelowski, Voils and Knafl 2009).'), true),
      a(P('Teilt man die Anzahl durch die Länge des Interviews, ist der Vergleich fair; dann zeigt sich, dass der Zeitdruck in Fall 2 deutlich höher ist (Dichte)',
        'If one divides the count by the length of the interview, the comparison is fair; it then shows that the time pressure in case 2 is clearly higher (density)'),
        P('Auch eine Dichte zählt nur Stellen. Ob der Zeitdruck stärker ist, zeigt erst der Text oder eine Einstufung.',
          'A density also only counts passages. Whether the time pressure is stronger only the text or a rating shows.')),
      a(P('Dass Fall 2 genauer kodiert wurde, weil die Kodierenden bei kürzeren Interviews mehr Zeit je Stelle haben und dadurch mehr Stellen finden (Kodiergenauigkeit)',
        'That case 2 was coded more carefully because with shorter interviews the coders have more time per passage and thereby find more passages (coding accuracy)'),
        P('Das ist eine Vermutung ohne Beleg. Sicher ist nur, dass die Zahl von Ausführlichkeit und Kodierfeinheit abhängt.',
          'That is a conjecture without evidence. All that is certain is that the number depends on how detailed the person was and how fine the coding is.'))
    ],
    hilfe: ['eh-fall-code-matrix'], belege: ['Beleg:sandelowski2009-zaehlen-deutung', 'Sandelowski, Voils und Knafl 2009']
  },
  {
    id: 'eh-qg-stufen', thema: 'erheben',
    stamm: P('Eine Forscherin will in der Matrix für „Belastung“ möglichst viel von dem behalten, was die Interviews hergeben. Welche Zellenart passt dazu am besten?',
      'A researcher wants to keep as much of what the interviews offer as possible in the matrix for “Strain”. Which kind of cell suits best?'),
    antworten: [
      a(P('Vorhanden oder nicht (0 und 1), weil diese Form am einfachsten zu lesen ist und die Forscherin so keine eigene Skala begründen muss (Dichotomisieren)',
        'Present or absent (0 and 1), because this form is the easiest to read and the researcher then does not have to justify a scale of her own (dichotomising)'),
        P('Diese Form verliert nach Sandelowski, Voils und Knafl (2009) am meisten Information, obwohl sie am häufigsten ist.',
          'According to Sandelowski, Voils and Knafl (2009) this form loses the most information although it is the most common.')),
      a(P('Die Zahl der Kodierungen, weil sie feiner abstuft als drei Stufen und häufige Erwähnung oft auf eine stärkere Belastung hinweist (Anzahl)',
        'The number of codings, because it grades more finely than three levels and frequent mention often points to stronger strain (count)'),
        P('Die Anzahl hängt von Länge und Feinheit der Kodierung ab und misst die Stärke nicht. Geordnete Stufen halten mehr fest.',
          'The count depends on length and fineness of the coding and does not measure strength. Ordered levels keep more.')),
      a(P('Die Zahl der Wörter in den kodierten Stellen, weil längere Passagen meist eine stärkere Belastung zeigen und das feiner abstuft als drei Stufen (Segmentlänge)',
        'The number of words in the coded passages, because longer passages usually show stronger strain and that grades more finely than three levels (segment length)'),
        P('Wie lang jemand über etwas spricht, sagt nichts über die Stärke. Geordnete Stufen halten fest, was die Kodierenden im Text erkannt haben.',
          'How long someone talks about something says nothing about its strength. Ordered levels keep what the coders recognised in the text.')),
      a(P('Eine Einstufung aus Untercodes (niedrig, mittel, hoch), weil geordnete Stufen mehr festhalten als vorhanden oder nicht (ordinale Stufen)',
        'A rating from sub-codes (low, medium, high), because ordered levels keep more than present or absent (ordinal levels)'),
        P('So rät es die Quelle (Sandelowski, Voils und Knafl 2009), und Statable bietet es als Einstufung aus Untercodes an.',
          'This is what the source advises (Sandelowski, Voils and Knafl 2009), and Statable offers it as a rating from sub-codes.'), true)
    ],
    hilfe: ['eh-fall-code-matrix'], belege: ['Beleg:sandelowski2009-ordinal', 'Hilfe:eh-fall-code-matrix']
  },
  {
    id: 'eh-qg-pwert', thema: 'erheben',
    stamm: P('Ein Student übernimmt die Matrix aus zwölf gezielt ausgewählten Interviews als Datensatz und rechnet damit einen Test mit p-Wert. Wie ist das einzuordnen?',
      'A student takes the matrix from twelve purposefully chosen interviews over as a data set and runs a test with a p-value. How should this be classified?'),
    antworten: [
      a(P('Die Rechnung ist vertretbar, wenn man das Ergebnis vorsichtig deutet; weil sorgfältig kodiert wurde, gleicht die Qualität der Kodierung die fehlende Zufallsauswahl teilweise aus (Kodierqualität)',
        'The calculation is justifiable if one interprets the result cautiously; because the coding was careful, the quality of the coding partly makes up for the missing random selection (coding quality)'),
        P('Sorgfältiges Kodieren ersetzt keine Zufallsauswahl. Schoonenboom (2023): Wer die Zahlen statistisch auswertet, führt eine quantitative Analyse durch und muss deren Annahmen erfüllen.',
          'Careful coding does not replace random selection. Schoonenboom (2023): whoever analyses the numbers statistically carries out a quantitative analysis and has to meet its assumptions.')),
      a(P('Der p-Wert gilt dann für alle Studierenden des Fachs, denn zwölf Interviews sind für einen Test ausreichend, wenn sie sorgfältig kodiert wurden (Verallgemeinerung)',
        'The p-value then holds for all students of the subject, because twelve interviews are sufficient for a test if they were coded carefully (generalisation)'),
        P('Gezielt ausgewählte, wenige Fälle sind keine Zufallsstichprobe; ein p-Wert sagt dann wenig. Statable zeigt darauf einen Hinweis.',
          'A few purposefully chosen cases are no random sample; a p-value then says little. Statable shows a note about this.')),
      a(P('Der Datensatz ist ein neuer, quantitativer Datensatz mit den Annahmen quantitativer Verfahren; bei wenigen gezielt gewählten Fällen sagt ein p-Wert wenig (Quantifizieren)',
        'The data set is a new, quantitative data set with the assumptions of quantitative methods; with few purposefully chosen cases a p-value says little (quantitising)'),
        P('So ist es: Schoonenboom (2023) beschreibt den Datensatz aus Zahlen als quantitativ, und Statable weist bei wenigen gezielt gewählten Fällen auf die Grenze des p-Werts hin.',
          'That is right: Schoonenboom (2023) describes the data set of numbers as quantitative, and with few purposefully chosen cases Statable points to the limit of the p-value.'), true),
      a(P('Der Test ist erst zulässig, wenn zusätzlich die Zitate als Textspalten im Datensatz stehen, weil er sonst keine qualitativen Daten enthält (Zitatspalten)',
        'The test is permissible only if the quotes are also in the data set as text columns, because otherwise it contains no qualitative data (quote columns)'),
        P('Die Textspalten sind nur eine Möglichkeit, Zitate mitzuführen. Sie ändern nichts daran, dass die Zahlen selbst eine quantitative Auswertung bilden.',
          'The text columns are only one way of carrying quotes along. They do not change the fact that the numbers themselves form a quantitative analysis.'))
    ],
    hilfe: ['eh-fall-code-matrix'], belege: ['Beleg:schoonenboom2023-quantitizing', 'Hilfe:eh-fall-code-matrix']
  },
  {
    id: 'eh-qg-gleicher-wert', thema: 'erheben',
    stamm: P('In der Matrix haben zwei Personen beim Code „Planung“ eine 1. Was folgt daraus?',
      'In the matrix two persons have a 1 for the code “Planning”. What follows from it?'),
    antworten: [
      a(P('Dass beide Personen ihre Planung gleich erleben, denn derselbe Wert steht für dieselbe Erfahrung, sonst hätten die Kodierenden verschieden kodiert (gleiche Erfahrung)',
        'That both persons experience their planning alike, because the same value stands for the same experience, otherwise the coders would have coded differently (same experience)'),
        P('Derselbe Zahlenwert kann sehr verschiedene Vorgänge verbergen (Schoonenboom 2023). Die Texte sind reicher als die Zahl.',
          'The same numerical value can hide very different processes (Schoonenboom 2023). The texts are richer than the number.')),
      a(P('Dass beide Personen gleich viel über Planung gesagt haben, weil die 1 die Zahl der Wortbeiträge zum Thema wiedergibt und dadurch vergleichbar ist (Redeanteil)',
        'That both persons said the same amount about planning, because the 1 reflects the number of speech contributions on the topic and is therefore comparable (speaking share)'),
        P('Die 1 sagt nur „mindestens eine Stelle kodiert“. Über Umfang oder Wortbeiträge sagt sie nichts.',
          'The 1 only says “at least one passage coded”. It says nothing about extent or speech contributions.')),
      a(P('Nur, dass bei beiden mindestens eine Stelle so kodiert ist; ihre Erfahrungen können sehr verschieden sein, bei Auffälligkeiten geht man zu den Textstellen zurück (Verdichtung)',
        'Only that at least one passage is coded this way for both; their experiences can be very different, and when something stands out one returns to the passages (condensation)'),
        P('So sieht es Schoonenboom (2023): Qualitative Daten tragen reichere Bedeutung als stark verdichtete Zahlenwerte.',
          'This is how Schoonenboom (2023) sees it: qualitative data carry richer meaning than strongly condensed numerical values.'), true),
      a(P('Dass beide zu derselben Gruppe von Befragten gehören und daher gemeinsam ausgewertet werden dürfen, ohne die Texte erneut zu lesen (Gruppenbildung)',
        'That both belong to the same group of respondents and may therefore be analysed together without reading the texts again (grouping)'),
        P('Ein gleicher Wert in einem Code macht noch keine Gruppe. Gruppen bildet man nach Fallvariablen oder inhaltlichen Typen, und die Texte bleiben maßgeblich.',
          'An equal value in one code does not make a group. Groups are formed by case variables or content-based types, and the texts remain decisive.'))
    ],
    hilfe: ['eh-fall-code-matrix'], belege: ['Beleg:schoonenboom2023-qual-reich', 'Schoonenboom 2023']
  },
  {
    id: 'eh-qg-untercode', thema: 'erheben',
    stamm: P('In einer Fall-Code-Matrix von Statable zeigt die Einstufung von „Belastung“ in einem Fall eine leere Zelle; die Liste „uneindeutig“ ist leer. Was bedeutet das?',
      'In a case-code matrix of Statable the rating of “Strain” shows an empty cell for one case; the list “ambiguous” is empty. What does that mean?'),
    antworten: [
      a(P('Für diesen Fall steht kein Untercode von „Belastung“; die Zelle gilt als fehlend und ist keine 0, weil eine Stufe fehlt und nicht die niedrigste Stufe vorliegt (fehlende Einstufung)',
        'No sub-code of “Strain” stands for this case; the cell counts as missing and is no 0, because a level is lacking and not the lowest level present (missing rating)'),
        P('So steht es in der Hilfe von Statable: Fehlt ein Untercode, ist die Zelle fehlend und nicht 0.',
          'That is what Statable’s help says: if no sub-code is present the cell is missing, not 0.'), true),
      a(P('Die Person hat keine Belastung erlebt, deshalb ist die niedrigste Stufe eingetragen und als Leerzelle dargestellt, damit sie nicht mit gerechnet wird (keine Belastung)',
        'The person experienced no strain, therefore the lowest level is entered and shown as an empty cell so that it is not included in calculations (no strain)'),
        P('Die Zelle sagt nur, dass keine Stufe kodiert wurde. Ob die Person keine Belastung hatte, geht daraus nicht hervor.',
          'The cell only says that no level was coded. Whether the person had no strain does not follow from it.')),
      a(P('Die Kodierenden haben sich bei diesem Fall nicht einigen können und die Zelle deshalb offen gelassen, bis ein Konsens vorliegt (offene Abweichung)',
        'The coders could not agree on this case and therefore left the cell open until a consensus exists (open disagreement)'),
        P('Uneinigkeit zeigt Statable anders: Bei verschiedenen Stufen im selben Fall heißt die Zelle „uneindeutig“.',
          'Statable shows disagreement differently: with different levels in the same case the cell reads “ambiguous”.')),
      a(P('Der Fall wurde aus der Matrix ausgeschlossen, weil er zu wenige Kodierungen hat, um eine Einstufung zu rechtfertigen (Mindestzahl)',
        'The case was excluded from the matrix because it has too few codings to justify a rating (minimum number)'),
        P('Statable schließt keine Fälle aus. Die Zeile bleibt in der Matrix, nur die Einstufung ist fehlend.',
          'Statable excludes no cases. The row stays in the matrix, only the rating is missing.'))
    ],
    hilfe: ['eh-fall-code-matrix'], belege: ['Hilfe:eh-fall-code-matrix']
  },

  // ---------------------------------------------------------------- Pseudonymisieren
  {
    id: 'eh-ps-anonym', thema: 'erheben',
    stamm: P('In einem Interview sind alle Namen durch Platzhalter ersetzt, die Zuordnungsliste mit den Klarnamen liegt in einem Schrank der Forscherin. Wie nennt man den Zustand der Daten?',
      'In an interview all names are replaced by placeholders, the key list with the real names lies in a cupboard of the researcher. What is the state of the data called?'),
    antworten: [
      a(P('Anonymisiert, denn die Namen kommen im Text nicht mehr vor, und die Liste im Schrank ist ein Teil der Forschungsunterlagen und nicht der Daten (Anonymisierung)',
        'Anonymised, because the names no longer occur in the text and the list in the cupboard is part of the research files and not of the data (anonymisation)'),
        P('Mit der Liste lassen sich die Personen wieder zuordnen. Dann sind die Daten pseudonymisiert und bleiben personenbezogen.',
          'With the list the persons can be assigned again. Then the data are pseudonymised and stay personal data.')),
      a(P('Weder noch, denn solange die Platzhalter im Text stehen, gelten die Daten als unverändert und unterliegen denselben Regeln wie die Originale (unverändert)',
        'Neither, because as long as the placeholders stand in the text the data count as unchanged and are subject to the same rules as the originals (unchanged)'),
        P('Das Ersetzen durch Platzhalter ist gerade Pseudonymisierung. Die Datenschutz-Grundverordnung kennt den Begriff ausdrücklich.',
          'Replacing by placeholders is precisely pseudonymisation. The General Data Protection Regulation names the term explicitly.')),
      a(P('Anonymisiert, sobald die Liste verschlüsselt ist, weil dann niemand die Zuordnung ohne Schlüssel herstellen kann und die Daten für Dritte unbrauchbar sind (Verschlüsselung)',
        'Anonymised as soon as the list is encrypted, because then nobody can restore the assignment without a key and the data are useless to third parties (encryption)'),
        P('Verschlüsseln schützt die Liste, hebt aber die Möglichkeit der Zuordnung nicht auf. Wer den Schlüssel hat, kann die Personen erkennen; das bleibt Pseudonymisierung.',
          'Encrypting protects the list but does not remove the possibility of assignment. Whoever has the key can recognise the persons; that remains pseudonymisation.')),
      a(P('Pseudonymisiert: Ohne die gesondert aufbewahrte Zusatzinformation sind die Personen nicht zuzuordnen, mit ihr schon, deshalb bleiben es Daten über identifizierbare Personen (Pseudonymisierung)',
        'Pseudonymised: without the separately kept additional information the persons cannot be assigned, with it they can, which is why they remain data on identifiable persons (pseudonymisation)'),
        P('So legt es die Datenschutz-Grundverordnung fest (Artikel 4 Nummer 5 und Erwägungsgrund 26).',
          'This is how the General Data Protection Regulation lays it down (Article 4 No. 5 and recital 26).'), true)
    ],
    hilfe: ['eh-pseudonymisieren'], belege: ['Beleg:dsgvo-pseudonymisierung', 'Hilfe:eh-pseudonymisieren']
  },
  {
    id: 'eh-ps-indirekt', thema: 'erheben',
    stamm: P('Ein Transkript nennt keinen Namen, aber „die einzige Hebamme in unserem Dorf mit dreihundert Einwohnern“. Warum ist das für den Schutz der Person ein Problem?',
      'A transcript names no name, but “the only midwife in our village of three hundred inhabitants”. Why is this a problem for protecting the person?'),
    antworten: [
      a(P('Eine Angabe wie diese ist für sich genommen harmlos; ein Problem entsteht erst, wenn dazu eine Adresse oder eine Telefonnummer im Text steht (direktes Kennzeichen)',
        'A detail like this is harmless in itself; a problem arises only if an address or a phone number is also in the text (direct identifier)'),
        P('Gerade das widerspricht der Quelle: Indirekte Kennzeichen machen schon im Zusammenspiel miteinander erkennbar, auch ohne Adresse.',
          'This is precisely what the source contradicts: indirect identifiers make someone recognisable in combination with each other, even without an address.')),
      a(P('Die Person lässt sich über Beruf und Ort erkennen, auch ohne Namen; solche indirekten Kennzeichen machen erst zusammen erkennbar (indirekter Identifikator)',
        'The person can be recognised through occupation and place, even without a name; such indirect identifiers make someone recognisable only in combination (indirect identifier)'),
        P('So beschreibt es der UK Data Service: seltene Berufe in kleinen Gemeinden gehören zu den Angaben, die zusammen („jigsaw identification“) erkennbar machen.',
          'This is how the UK Data Service describes it: rare occupations in small communities belong to the details that make someone recognisable together (“jigsaw identification”).'), true),
      a(P('Die Zahl der Einwohner ist eine statistische Angabe und fällt unter die Veröffentlichungspflicht, deshalb darf sie in Interviewdaten nicht vorkommen (Veröffentlichungspflicht)',
        'The number of inhabitants is a statistical figure and falls under the duty to publish, which is why it may not occur in interview data (duty to publish)'),
        P('Eine solche Pflicht gibt es nicht. Die Einwohnerzahl ist nur zusammen mit dem Beruf ein Hinweis auf die Person.',
          'There is no such duty. The number of inhabitants is only in combination with the occupation a clue to the person.')),
      a(P('Hebammen sind in vielen Ländern berufsrechtlich zur Verschwiegenheit verpflichtet, und diese Pflicht gilt auch für das Transkript eines Interviews mit ihnen (Schweigepflicht)',
        'In many countries midwives are bound to confidentiality by professional law, and this duty also applies to the transcript of an interview with them (confidentiality)'),
        P('Darum geht es hier nicht. Gefragt ist, wodurch die Person selbst erkennbar wird, und das sind die indirekten Angaben.',
          'That is not the point here. The question is by what the person herself becomes recognisable, and that is the indirect details.'))
    ],
    hilfe: ['eh-pseudonymisieren'], belege: ['Beleg:ukds-direkt-indirekt', 'UK Data Service']
  },
  {
    id: 'eh-ps-ersatz', thema: 'erheben',
    stamm: P('Im Transkript steht „meine Kollegin Sabine hat das damals auch so gesehen“. Wie sieht ein guter Ersatz für den Namen aus?',
      'The transcript says “my colleague Sabine saw it the same way back then”. What does a good replacement for the name look like?'),
    antworten: [
      a(P('Eine beschreibende Marke in eckigen Klammern wie „[Kollegin 1]“, die für dieselbe Person im ganzen Text gleich lautet und als Ersatz erkennbar ist (Ersatzmarke)',
        'A descriptive label in square brackets such as “[colleague 1]”, which is the same for the same person throughout the text and recognisable as a replacement (replacement label)'),
        P('So zeigen es die Beispiele des UK Data Service („[colleague 1]“): beschreibend, in Klammern, überall gleich angewendet.',
          'This is how the examples of the UK Data Service show it (“[colleague 1]”): descriptive, in brackets, applied the same everywhere.'), true),
      a(P('Ein anderer, wirklich existierender Vorname, der im Transkript nicht vorkommt und deshalb unauffällig bleibt und den Lesefluss nicht stört (Tarnname)',
        'Another, really existing first name that does not occur in the transcript and therefore stays inconspicuous and does not disturb the reading flow (cover name)'),
        P('Der Ersatz soll im Text deutlich als Ersatz erkennbar sein. Ein echter Name täuscht und kann zu einer anderen Person führen.',
          'The replacement should be clearly recognisable as a replacement in the text. A real name deceives and can point to another person.')),
      a(P('Eine Reihe von Platzhalterzeichen ohne weitere Angabe, damit der Text keinerlei Hinweis auf die Rolle der Person mehr enthält (Schwärzung)',
        'A row of placeholder characters without further information so that the text no longer contains any hint of the person’s role (blacking out)'),
        P('Beschreibende Marken sind besser: Sie erhalten, wer gemeint ist (Kollegin), ohne die Person zu nennen, und lassen sich überall gleich anwenden.',
          'Descriptive labels are better: they keep who is meant (colleague) without naming the person, and can be applied the same everywhere.')),
      a(P('Die ganze Aussage streichen und kein Zeichen davon im Text stehen lassen, denn jede Spur einer Ersetzung könnte Rückschlüsse auf die Person zulassen (Streichung)',
        'Delete the whole statement and leave no trace of it in the text, because any trace of a replacement could allow conclusions about the person (deletion)'),
        P('Streichungen sollen offen gekennzeichnet werden, zum Beispiel mit „[section removed]“. Ein heimliches Entfernen verfälscht den Text.',
          'Deletions should be marked openly, for example with “[section removed]”. Removing something secretly falsifies the text.'))
    ],
    hilfe: ['eh-pseudonymisieren'], belege: ['Beleg:ukds-ersatz-klammern', 'UK Data Service']
  },
  {
    id: 'eh-ps-liste', thema: 'erheben',
    stamm: P('Nach dem Pseudonymisieren entsteht eine Zuordnungsliste mit Platzhaltern und Klarnamen. Wo gehört sie hin?',
      'After pseudonymising a key list with placeholders and real names results. Where does it belong?'),
    antworten: [
      a(P('In die Projektdatei neben die Interviews, damit beim Weiterarbeiten alles an einem Ort liegt und kein Teil des Projekts verloren geht (Gesamtablage)',
        'Into the project file next to the interviews so that everything lies in one place when continuing work and no part of the project is lost (joint storage)'),
        P('Dann wäre die Trennung aufgehoben, und wer die Datei hat, kann die Personen erkennen. Statable legt die Liste darum nie in die Projektdatei.',
          'Then the separation would be gone, and whoever has the file can recognise the persons. Statable therefore never puts the list into the project file.')),
      a(P('Getrennt von den Daten und geschützt, am besten verschlüsselt, denn wer beides hat, erkennt die Personen wieder (getrennte Aufbewahrung)',
        'Separately from the data and protected, preferably encrypted, because whoever has both recognises the persons again (separate storage)'),
        P('So fordert es die Datenschutz-Grundverordnung für die Zusatzinformation, und so rät es die Hilfe von Statable.',
          'This is what the General Data Protection Regulation demands for the additional information, and what Statable’s help advises.'), true),
      a(P('Sie wird gelöscht, sobald der letzte Treffer ersetzt ist, weil die Daten dann anonym sind und die Liste nur noch ein Risiko darstellt (Löschen)',
        'It is deleted as soon as the last match has been replaced, because the data are then anonymous and the list is only a risk (deletion)'),
        P('Mit dem Löschen entfällt die Rückführung, aber die Daten sind erst anonym, wenn auch indirekte Hinweise beseitigt sind. Eine Wiederherstellung ist dann nicht mehr möglich.',
          'Deleting removes the way back, but the data are anonymous only when indirect clues are removed as well. Restoring is then no longer possible.')),
      a(P('Im Anhang der Abschlussarbeit, weil die Prüfenden die Zuordnung nachvollziehen können müssen und dies zur guten wissenschaftlichen Praxis gehört (Transparenz)',
        'In the appendix of the thesis, because the examiners must be able to follow the assignment and this is part of good scientific practice (transparency)'),
        P('Die Liste würde die Personen offenlegen. Nachvollziehbarkeit schafft man mit einem Protokoll der Ersetzungen, nicht mit den Klarnamen.',
          'The list would disclose the persons. Traceability is achieved by a log of the replacements, not with the real names.'))
    ],
    hilfe: ['eh-pseudonymisieren', 'eh-projekt-passwort'], belege: ['Beleg:dsgvo-pseudonymisierung', 'Hilfe:eh-pseudonymisieren']
  },
  {
    id: 'eh-ps-automatik', thema: 'erheben',
    stamm: P('Statable sucht im Transkript nach den Namen der Liste und zeigt jeden Treffer zum Bestätigen. Warum bleibt trotzdem eine eigene Durchsicht nötig?',
      'Statable searches the transcript for the names on the list and shows every match for confirmation. Why is a review of your own still necessary?'),
    antworten: [
      a(P('Weil Statable Namen erst nach dem Ersetzen prüft und Fehler darum erst im fertigen Text auffallen, wenn sich nichts mehr rückgängig machen lässt (späte Prüfung)',
        'Because Statable checks names only after replacing and mistakes therefore show up only in the finished text when nothing can be undone any more (late check)'),
        P('Der Lauf lässt sich bis zum Speichern rückgängig machen, und jeder Treffer wird vorher bestätigt. Der Grund liegt woanders.',
          'The run can be undone until saving, and every match is confirmed beforehand. The reason lies elsewhere.')),
      a(P('Weil die Suche nur schreibgeschützte Dokumente erfasst, sodass alle nachträglich bearbeiteten Transkripte von ihr ausgenommen bleiben (Dokumentstatus)',
        'Because the search covers only read-only documents so that all transcripts edited afterwards stay excluded from it (document status)'),
        P('Eine solche Einschränkung gibt es nicht. Gesucht wird in allen Dokumenten des Projekts.',
          'There is no such restriction. The search covers all documents of the project.')),
      a(P('Weil die Suche Namen in anderer Groß- und Kleinschreibung meist übersieht und solche Stellen deshalb oft unverändert im Text stehen bleiben (Schreibweise)',
        'Because the search mostly misses names in different upper and lower case, so such passages often remain unchanged in the text (spelling)'),
        P('Groß- und Kleinschreibung spielt bei der Suche keine Rolle. Das Problem sind andere Schreibvarianten und Namen, die nicht auf der Liste stehen.',
          'Case does not matter in the search. The problem is other spelling variants and names that are not on the list.')),
      a(P('Weil nur gefunden wird, was auf der Liste steht oder eine Regel trifft; andere Schreibweisen und indirekte Hinweise bleiben stehen (Vollständigkeit)',
        'Because only what stands on the list or what a rule hits is found; other spellings and indirect clues stay in (completeness)'),
        P('So warnt der UK Data Service vor automatischem Suchen, und so erklärt es die Hilfe von Statable: Namen mit Bindestrich oder ein seltener Beruf werden nicht von selbst gefunden.',
          'This is how the UK Data Service warns about automatic searching, and how Statable’s help explains it: hyphenated names or a rare occupation are not found by themselves.'), true)
    ],
    hilfe: ['eh-pseudonymisieren'], belege: ['Beleg:ukds-protokoll-automatik', 'Hilfe:eh-pseudonymisieren']
  }
];
