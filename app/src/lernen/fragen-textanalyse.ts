/**
 * Üben: Wörter zählen (B3 Teil 1c, 14.11.2026): Einheit `woerter-zaehlen` (lernen/lernplan-textanalyse.ts), 6 Fragen `eh-ta-…`, Thema `erheben`.
 * Grundlage ist der Hilfe-Artikel `ta-woerter-zaehlen` (hilfe/artikel-textanalyse.ts). Die Zahlen stammen aus dem Rechenbeispiel von scripts/textanalyse-erwartet.R (Basis-R, R 4.6.1;
 * Wächter lernen/fragen-textanalyse.test.ts): Gruppe A = 3 kurze Äußerungen (21 Wörter), Gruppe B = 2 (15 Wörter), alles erfunden.
 * Quellen: Dunning (1993), Computational Linguistics 19; Luhn (1960) für „Schlüsselwort im Kontext“; Krippendorff (2019), Content Analysis, Kap. 3 und 6 (Zählen und Deuten).
 * Formregeln wie `fragen-planung.ts`.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

type Paar = ReturnType<typeof P>;
type A = [Paar, Paar];
const a = (t: Paar, w: Paar, richtig?: true): Antwort => ({ text: t, warum: w, ...(richtig ? { richtig } : {}) });

function fr(id: string, belege: string[], stamm: Paar, platz: number, richtig: A, falsch: [A, A, A]): Frage {
  const antworten: Antwort[] = falsch.map(f => a(f[0], f[1]));
  antworten.splice(platz, 0, a(richtig[0], richtig[1], true));
  return { id, thema: 'erheben', stamm, antworten, hilfe: ['ta-woerter-zaehlen'], belege: [...belege, 'Hilfe:ta-woerter-zaehlen'] };
}
const DU = 'Dunning 1993, Computational Linguistics 19, 61-74';
const KR = 'Krippendorff 2019, Content Analysis, 4. Aufl., Kap. 3 und 6';
const LU = 'Luhn 1960, American Documentation 11, 288-295';

export const FRAGEN_TEXTANALYSE: Frage[] = [
  fr('eh-ta-stopp', [KR],
    P('Die Wortliste von 40 Interviews zeigt oben „und“, „die“ und „ich“. Was heißt das? (Wortliste, Stoppwörter)', 'The word list of 40 interviews shows "and", "the" and "I" at the top. What does that mean? (word list, stop words)'), 2,
    [P('Häufige Funktionswörter; eine sichtbare Stoppwörter-Liste blendet sie aus, damit Inhaltswörter sichtbar werden (Wortliste, Stoppwörter)', 'Frequent function words; a visible stop-word list hides them so that content words become visible (word list, stop words)'),
     P('Häufigkeit sagt nichts über Bedeutung. Wer Stoppwörter ausblendet, sollte die Liste nennen, denn sie verändert das Ergebnis.', 'Frequency says nothing about meaning. Whoever hides stop words should name the list, because it changes the result.')],
    [[P('Das sind die wichtigsten Themen der Interviews, weil sie am häufigsten vorkommen (Wortliste, Stoppwörter)', 'These are the most important topics of the interviews because they occur most often (word list, stop words)'),
      P('Funktionswörter kommen in fast jedem Text häufig vor und sagen wenig über das Thema.', 'Function words occur frequently in nearly every text and say little about the topic.')],
     [P('Das ist ein Fehler im Programm, die Wörter hätten gar nicht gezählt werden dürfen (Wortliste, Stoppwörter)', 'That is an error in the program, the words should not have been counted at all (word list, stop words)'),
      P('Zählen ist richtig. Ob man sie danach ausblendet, ist eine Entscheidung der Forschenden.', 'Counting is right. Whether to hide them afterwards is a decision of the researchers.')],
     [P('Das Programm hat sie schon still entfernt, sonst stünden andere Wörter oben (Wortliste, Stoppwörter)', 'The program has silently removed them already, otherwise other words would be at the top (word list, stop words)'),
      P('Statable entfernt nichts still; die Liste ist sichtbar und änderbar.', 'Statable removes nothing silently; the list is visible and can be changed.')]]),
  fr('eh-ta-anteil', [DU, KR],
    P('„die“ steht in Gruppe A 3-mal (21 Wörter insgesamt), in Gruppe B 2-mal (15 Wörter). Ist „die“ typisch für A? (typische Wörter, Keyness)', '"the" (German "die") stands 3 times in group A (21 words in total), 2 times in group B (15 words). Is it typical for A? (key words, keyness)'), 0,
    [P('Nein, die Anteile sind mit etwa 14 % und 13 % fast gleich; der Test gibt G2 ≈ 0,006 (typische Wörter, Keyness)', 'No, the shares are almost equal at about 14% and 13%; the test gives G2 ≈ 0.006 (key words, keyness)'),
     P('Verglichen wird der Anteil an der jeweiligen Wortzahl, nicht die rohe Anzahl.', 'What is compared is the share of the respective word total, not the raw count.')],
    [[P('Ja, 3 ist mehr als 2, also kommt „die“ in A häufiger vor (typische Wörter, Keyness)', 'Yes, 3 is more than 2, so "the" occurs more often in A (key words, keyness)'),
      P('Gruppe A hat mehr Wörter. Die Texte verschieden langer Gruppen lassen sich nur über Anteile vergleichen.', 'Group A has more words. Texts of groups of different length can be compared only through shares.')],
     [P('Ja, weil „die“ in beiden Gruppen vorkommt und damit ein Unterschied nachweisbar ist (typische Wörter, Keyness)', 'Yes, because "the" occurs in both groups and a difference is thereby demonstrable (key words, keyness)'),
      P('Dass ein Wort in beiden Gruppen steht, sagt nichts; entscheidend ist, ob die Anteile auseinanderliegen.', 'That a word stands in both groups says nothing; what matters is whether the shares lie apart.')],
     [P('Das lässt sich nicht beurteilen, solange keine Fälle mit „die“ in B ausgeschlossen werden (typische Wörter, Keyness)', 'That cannot be judged as long as no cases with "the" in B are excluded (key words, keyness)'),
      P('Man vergleicht beide Gruppen so, wie sie sind; Fälle auszuschließen wäre eine Auswahl nach dem Ergebnis.', 'One compares both groups as they are; excluding cases would be a selection after the result.')]]),
  fr('eh-ta-p', [DU],
    P('„müde“ steht in Gruppe A 4-mal, in B 0-mal; G2 = 4,31, p = 0,038. Was ist richtig? (typische Wörter, p-Wert)', '"tired" (German "müde") stands 4 times in group A, 0 times in B; G2 = 4.31, p = 0.038. What is right? (key words, p-value)'), 3,
    [P('Das Wort fällt für A auf, kann bei vielen geprüften Wörtern aber Zufall sein: ein Hinweis (typische Wörter, p-Wert)', 'The word stands out for A but may be chance among many words tested: a hint (key words, p-value)'),
     P('Statable rechnet ohne Korrektur für viele Tests. Der Wert ist ein Hinweis zum Nachlesen im Text, kein Beweis.', 'Statable computes without correction for many tests. The value is a hint to go and read the text, not a proof.')],
    [[P('Mit 3,8 % Wahrscheinlichkeit stimmt die Annahme, dass „müde“ nicht typisch ist (typische Wörter, p-Wert)', 'With 3.8% probability the assumption that "tired" is not typical is true (key words, p-value)'),
      P('Der p-Wert ist keine Wahrscheinlichkeit der Annahme, sondern sagt, wie ungewöhnlich der Unterschied bei gleicher Häufigkeit wäre.', 'The p-value is not a probability of the assumption but says how unusual the difference would be at equal frequency.')],
     [P('Die Gruppe A ist erschöpft, weil „müde“ dort signifikant häufiger ist (typische Wörter, p-Wert)', 'Group A is exhausted because "tired" is significantly more frequent there (key words, p-value)'),
      P('Gezählt wird ein Wort, nicht ein Befinden. Ob jemand erschöpft ist, zeigt der Text an der Stelle, nicht die Zählung.', 'A word is counted, not a state. Whether somebody is exhausted shows in the text at the place, not in the count.')],
     [P('Das Wort ist unwichtig, weil nur 4 Vorkommen zu wenige für einen Schluss sind (typische Wörter, p-Wert)', 'The word is unimportant because only 4 occurrences are too few for a conclusion (key words, p-value)'),
      P('Wenige Vorkommen machen den Näherungswert unsicherer, nicht das Wort unwichtig. Darum blendet Statable sehr seltene Wörter aus.', 'Few occurrences make the approximation less certain, not the word unimportant. That is why Statable hides very rare words.')]]),
  fr('eh-ta-kwic', [LU, KR],
    P('„Arbeit“ steht zweimal in Gruppe A: „die Arbeit ist schwer“ und „die Arbeit macht Spaß“. Wozu dient die Ansicht Schlüsselwort im Kontext? (Schlüsselwort im Kontext, KWIC)', '"work" (German "Arbeit") stands twice in group A: "the work is hard" and "the work is fun". What is the view key word in context for? (key word in context, KWIC)'), 1,
    [P('Sie zeigt jede Stelle mit den Wörtern davor und danach, sodass man sieht, in welchem Sinn das Wort steht (Schlüsselwort im Kontext, KWIC)', 'It shows each place with the words around it, so one sees in which sense the word is used (key word in context, KWIC)'),
     P('Dieselbe Zahl kann Gegensätzliches meinen; erst der Zusammenhang zeigt es.', 'The same count can mean opposites; only the context shows it.')],
    [[P('Sie zählt, wie oft das Wort vorkommt, und ordnet die Wörter nach Häufigkeit (Schlüsselwort im Kontext, KWIC)', 'It counts how often the word occurs and orders the words by frequency (key word in context, KWIC)'),
      P('Das tut die Wortliste. Die Kontext-Ansicht zeigt die einzelnen Stellen.', 'That is what the word list does. The context view shows the single places.')],
     [P('Sie bewertet, ob die Stelle positiv oder negativ gemeint ist (Schlüsselwort im Kontext, KWIC)', 'It assesses whether the place is meant positively or negatively (key word in context, KWIC)'),
      P('Statable bewertet keine Stimmung. Die Stellen werden gezeigt; die Deutung machen Sie.', 'Statable assesses no sentiment. The places are shown; you do the interpretation.')],
     [P('Sie ersetzt das Lesen der Texte, weil alle wichtigen Stellen gezeigt werden (Schlüsselwort im Kontext, KWIC)', 'It replaces reading the texts because all important places are shown (key word in context, KWIC)'),
      P('Gezeigt werden nur die Stellen des gesuchten Worts. Was sonst im Text steht, bleibt ungelesen.', 'Only the places of the searched word are shown. What else stands in the text stays unread.')]]),
  fr('eh-ta-woerterbuch', [KR],
    P('Ein Team legt das Wörterbuch „Erschöpfung: müde*, schwer“ an und zählt in Gruppe A 5 Treffer. Was zeigt das? (Wörterbuch-Zählung)', 'A team creates the dictionary "exhaustion: tired*, hard" and counts 5 hits in group A. What does that show? (dictionary count)'), 2,
    [P('Fünf Wörter der selbst gewählten Liste kommen vor; ob die Texte Erschöpfung ausdrücken, deuten die Forschenden (Wörterbuch-Zählung)', 'Five words of the self-chosen list occur; whether the texts express exhaustion is interpreted by the researchers (dictionary count)'),
     P('Zählen und Deuten sind getrennt. Die Liste ist eine Annahme der Person, kein Maß.', 'Counting and interpreting are separate. The list is an assumption of the person, not a measure.')],
    [[P('Gruppe A ist zu 5 Prozent erschöpft, weil 5 Treffer gezählt wurden (Wörterbuch-Zählung)', 'Group A is 5 percent exhausted because 5 hits were counted (dictionary count)'),
      P('Treffer sind Wörter, kein Prozentsatz erschöpfter Personen; ein Anteil bezieht sich auf alle Wörter.', 'Hits are words, not a percentage of exhausted people; a share relates to all words.')],
     [P('Statable hat geprüft, dass die Wörter Erschöpfung bedeuten, und die Liste erweitert (Wörterbuch-Zählung)', 'Statable has checked that the words mean exhaustion and extended the list (dictionary count)'),
      P('Statable liefert keine Wörterbücher und ändert die Liste nicht; sie stammt von der Person.', 'Statable supplies no dictionaries and does not change the list; it comes from the person.')],
     [P('Die Treffer zeigen, dass Erschöpfung in den Texten häufiger ist als in anderen Gruppen (Wörterbuch-Zählung)', 'The hits show that exhaustion is more frequent in the texts than in other groups (dictionary count)'),
      P('Ohne zweite Gruppe und Vergleich der Anteile sagt die Zahl nichts über „häufiger“.', 'Without a second group and a comparison of the shares the number says nothing about "more frequent".')]]),
  fr('eh-ta-stern', [KR],
    P('Im Wörterbuch steht „schwer*“. Im Text stehen „schwer“, „schwere“ und „Schwerpunkt“. Was wird gezählt? (Wörterbuch-Zählung, Sternchen)', 'The dictionary holds "hard*". The text holds "hard", "harder" and "hardly". What is counted? (dictionary count, asterisk)'), 1,
    [P('Alle drei, denn das Sternchen steht für beliebige Endungen, auch für Wörter mit anderem Sinn (Wörterbuch-Zählung, Sternchen)', 'All three, because the asterisk stands for any endings, also for words with another sense (dictionary count, asterisk)'),
     P('Das Muster prüft nur den Wortanfang. Darum die Treffer mit Schlüsselwort im Kontext ansehen.', 'The pattern checks only the beginning of the word. That is why the hits should be looked at with key word in context.')],
    [[P('Nur „schwer“, weil das Sternchen nichts ändert (Wörterbuch-Zählung, Sternchen)', 'Only "hard", because the asterisk changes nothing (dictionary count, asterisk)'),
      P('Ohne Sternchen würde nur das genaue Wort zählen; mit Sternchen zählt jeder Wortanfang.', 'Without an asterisk only the exact word would count; with it every word beginning counts.')],
     [P('„schwer“ und „schwere“, weil Statable die Wortstämme erkennt (Wörterbuch-Zählung, Sternchen)', '"hard" and "harder", because Statable recognises word stems (dictionary count, asterisk)'),
      P('Statable kennt keine Wortstämme; es vergleicht nur den Anfang des Worts.', 'Statable knows no word stems; it only compares the beginning of the word.')],
     [P('Keines, weil Muster mit Sternchen nur in der Wortliste gelten (Wörterbuch-Zählung, Sternchen)', 'None, because patterns with an asterisk apply only in the word list (dictionary count, asterisk)'),
      P('Das Sternchen gehört zum Wörterbuch und wirkt dort.', 'The asterisk belongs to the dictionary and works there.')]]),
];
