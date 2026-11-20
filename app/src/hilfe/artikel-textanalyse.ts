/**
 * Hilfe-Artikel zur Textanalyse (B3 Teil 1c, 14.11.2026): `ta-woerter-zaehlen`, zugleich die Erklärung der Einheit `woerter-zaehlen` (lernen/lernplan-textanalyse.ts).
 * Nur Deutsch und Englisch, jeder Text ein Textpaar P(de, en). Das Rechenbeispiel (3 Äußerungen in Gruppe A mit 21 Wörtern, 2 in Gruppe B mit 15 Wörtern, alles erfunden) stammt aus
 * scripts/textanalyse-erwartet.R (Basis-R, R 4.6.1); die Zahlen prüft lernen/fragen-textanalyse.test.ts gegen lib/textanalyse.ts.
 * Quellen (eigene Worte): Dunning (1993), Computational Linguistics 19; Luhn (1960), American Documentation 11; Krippendorff (2019), Content Analysis.
 */
import { P } from '../i18n/laufzeit';
import { a, falsch, mitnehmen, type Roh } from './artikel-roh';

const Q_TA = P('Dunning, T. (1993). Accurate methods for the statistics of surprise and coincidence. Computational Linguistics, 19, 61-74. Luhn, H. P. (1960). Key word-in-context index for technical literature (KWIC index). American Documentation, 11, 288-295. Krippendorff, K. (2019). Content Analysis: An Introduction to Its Methodology (4. Aufl.), Kap. 3 und 6. Sage.',
  'Dunning, T. (1993). Accurate methods for the statistics of surprise and coincidence. Computational Linguistics, 19, 61-74. Luhn, H. P. (1960). Key word-in-context index for technical literature (KWIC index). American Documentation, 11, 288-295. Krippendorff, K. (2019). Content Analysis: An Introduction to Its Methodology (4th ed.), ch. 3 and 6. Sage.');

export const ROH_TEXTANALYSE: Roh[] = [
  a('ta-woerter-zaehlen', 'verstehen', P('Welche Wörter kommen in meinen Texten vor, und was sagt das? (Wörter zählen, Textanalyse)', 'Which words occur in my texts, and what does that say? (counting words, text analysis)'),
    P('Wörter zählen Textanalyse Wortliste Worthäufigkeit Stoppwörter Schlüsselwort im Kontext KWIC Wörterbuch Keyness typische Wörter Log-Likelihood G2 Inhaltsanalyse Interviews', 'counting words text analysis word list word frequency stop words key word in context KWIC dictionary keyness key words log-likelihood G2 content analysis interviews'),
    [
      { h: P('Kurz', 'In brief') },
      P('Wörter zu zählen ist ein Weg, große Textmengen zu überblicken: Welche Wörter sind häufig, wo und wie steht ein Wort, und welche Wörter unterscheiden zwei Gruppen von Texten? Die Zählung zeigt, wohin man genauer lesen sollte. Sie ersetzt das Lesen und Deuten nicht, denn ein Wort ist noch keine Bedeutung.',
        'Counting words is one way to survey large amounts of text: which words are frequent, where and how does a word stand, and which words distinguish two groups of texts? The count shows where to read more closely. It does not replace reading and interpreting, because a word is not yet a meaning.'),
      { h: P('Die vier Werkzeuge', 'The four tools') },
      { ul: [
        P('Wortliste (word list): Wörter mit Anzahl, Anteil und Zahl der Dokumente. Sehr häufig sind Funktionswörter wie „und“ und „die“. Mit einer sichtbaren Stoppwörter-Liste lassen sie sich ausblenden; die Liste verändert das Ergebnis und gehört in die Methodenbeschreibung.', 'Word list: words with count, share and number of documents. Very frequent are function words such as "and" and "the". With a visible stop-word list they can be hidden; the list changes the result and belongs in the description of the method.'),
        P('Schlüsselwort im Kontext (key word in context, KWIC): jede Stelle eines Worts mit den Wörtern davor und danach. Hier sieht man, in welchem Sinn das Wort steht: „die Arbeit ist schwer“ und „die Arbeit macht Spaß“ zählen beide als „Arbeit“.', 'Key word in context (KWIC): each place of a word with the words before and after. Here one sees in which sense the word is used: "the work is hard" and "the work is fun" both count as "work".'),
        P('Wörterbuch (dictionary): eine Liste eigener Wörter zu einem Thema, zum Beispiel „müde*, schwer“. Das Sternchen steht für beliebige Endungen und prüft nur den Wortanfang. Statable zählt die Treffer; ob sie das Thema ausdrücken, deuten Sie. Statable liefert keine fertigen Wörterbücher und keine Stimmungsbewertung.', 'Dictionary: a list of your own words on a topic, for example "tired*, hard". The asterisk stands for any endings and checks only the beginning of the word. Statable counts the hits; whether they express the topic you interpret. Statable supplies no ready-made dictionaries and no sentiment assessment.'),
        P('Typische Wörter (key words, keyness): Welche Wörter sind in Gruppe A relativ häufiger als in Gruppe B? Verglichen werden Anteile an der jeweiligen Wortzahl, nicht rohe Anzahlen. Das Maß ist die Log-Likelihood G2 (Dunning 1993) mit p-Wert.', 'Key words (keyness): which words are relatively more frequent in group A than in group B? What is compared are shares of the respective word total, not raw counts. The measure is the log-likelihood G2 (Dunning 1993) with a p-value.')
      ] },
      { h: P('Ein Rechenbeispiel', 'A worked example') },
      P('Gruppe A hat drei kurze Äußerungen mit zusammen 21 Wörtern, Gruppe B zwei mit zusammen 15 Wörtern (erfunden). „müde“ steht 4-mal in A, 0-mal in B: G2 = 4,31, p = 0,038, ein Hinweis, dass das Wort für A auffällt. „die“ steht 3-mal in A und 2-mal in B; die Anteile sind mit etwa 14 % und 13 % fast gleich, G2 = 0,006. Obwohl die rohe Anzahl in A höher ist, ist „die“ nicht typisch für A, weil A länger ist.',
        'Group A has three short statements with 21 words in total, group B two with 15 words in total (invented). "tired" (German "müde") occurs 4 times in A, 0 times in B: G2 = 4.31, p = 0.038, a hint that the word stands out for A. "the" (German "die") occurs 3 times in A and 2 times in B; the shares are almost equal at about 14% and 13%, G2 = 0.006. Although the raw count is higher in A, "the" is not typical for A, because A is longer.'),
      { h: P('So geht es in Statable', 'How to do it in Statable') },
      { ol: [
        P('Im Kodier-Arbeitsplatz (Strg+K: „Wörter zählen“) den Bereich „Auswerten“ und die Ansicht „Welche Wörter kommen vor?“ öffnen. Dokumente wählen; die Wortliste erscheint sofort.', 'In the coding workspace (Ctrl+K: "count words") open the section "Analysis" and the view "Which words occur?". Choose documents; the word list appears at once.'),
        P('Stoppwörter ansehen und bei Bedarf ändern, Mindestlänge und Mindestzahl setzen. Mit „Als CSV“ speichern Sie die Tabelle.', 'Look at the stop words and change them if need be, set minimum length and minimum count. With "As CSV" you save the table.'),
        P('Ein Wort in „Schlüsselwort im Kontext“ eingeben und die Stellen lesen. Im Wörterbuch eine Zeile „Name: Wort, Wort*“ schreiben.', 'Enter a word in "Key word in context" and read the places. In the dictionary write a line "Name: word, word*".'),
        P('Für „Typische Wörter“ Dokumente der Gruppe A und der Gruppe B wählen und die Tabelle der G2-Werte ansehen; Treffer anschließend im Kontext lesen.', 'For "Key words" choose documents of group A and of group B and look at the table of G2 values; then read the hits in context.')
      ] },
      { h: P('Grenzen', 'Limits') },
      { ul: [
        P('Statable erkennt keine Wortstämme: „Arbeit“ und „Arbeiten“ sind zwei Wörter; das Sternchen im Wörterbuch hilft. Es gibt keine Stimmungsbewertung (Sentiment) und keine mitgelieferten Wörterbücher.', 'Statable recognises no word stems: "Arbeit" and "Arbeiten" are two words; the asterisk in the dictionary helps. There is no sentiment assessment and no supplied dictionaries.'),
        P('Der p-Wert bei „Typische Wörter“ ist ohne Korrektur für viele Tests gerechnet. Bei langen Wortlisten fallen einzelne Wörter zufällig auf; sehr seltene Wörter (unter 5 Vorkommen) werden ausgeblendet. Ein Treffer ist ein Hinweis zum Nachlesen, kein Beweis.', 'The p-value for "Key words" is computed without correction for many tests. With long word lists single words stand out by chance; very rare words (under 5 occurrences) are hidden. A hit is a hint to read on, not a proof.'),
        P('Einstellungen und Wörterbuch bleiben nur in der Ansicht und werden nicht im Projekt gespeichert. Alles rechnet im Browser.', 'Settings and dictionary stay only in the view and are not saved in the project. Everything is computed in the browser.')
      ] },
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      falsch(P('Das häufigste Wort ist das wichtigste Thema.', 'The most frequent word is the most important topic.'),
        P('Oben stehen meist Funktionswörter. Auch bei Inhaltswörtern sagt die Anzahl nicht, ob das Wort für die Forschungsfrage wichtig ist.', 'At the top there are mostly function words. Also with content words the count does not say whether the word matters for the research question.')),
      falsch(P('Mehr Treffer im Wörterbuch heißt: die Texte drücken das Thema stärker aus.', 'More hits in the dictionary means: the texts express the topic more strongly.'),
        P('Es sind Wörter einer von Ihnen gewählten Liste. Länge der Texte, Verneinung und Ironie fließen nicht ein; erst der Kontext zeigt es.', 'They are words of a list chosen by you. Length of the texts, negation and irony do not come in; only the context shows it.')),
      { h: P('Quellen', 'Sources') },
      Q_TA,
      mitnehmen(
        P('Eine Zählung zeigt, wohin man lesen sollte; sie deutet nichts.', 'A count shows where to read; it interprets nothing.'),
        P('Stoppwörter blenden Funktionswörter aus; die Liste ist sichtbar und gehört in die Methodenbeschreibung.', 'Stop words hide function words; the list is visible and belongs in the description of the method.'),
        P('Typische Wörter vergleichen Anteile, nicht rohe Anzahlen; der p-Wert ist ein Hinweis ohne Mehrfachtest-Korrektur.', 'Key words compare shares, not raw counts; the p-value is a hint without multiple-test correction.'),
        P('Das Sternchen im Wörterbuch prüft den Wortanfang; Treffer im Kontext nachlesen.', 'The asterisk in the dictionary checks the beginning of the word; read the hits in context.')
      )
    ], ['eh-kodieren-ansichten', 'eh-aehnliche-stellen', 'eh-fall-kategorie-matrix'])
];
