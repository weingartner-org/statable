/**
 * Üben: latente Profile (B4 Teil 3, 14.11.2026; Einheit `latente-profile` in lernplan-profile.ts). Kennungen `lpr-<kürzel>`, Thema `profile`.
 * Alle Zahlen aus den Palmer-Pinguinen (CC0; vier Körpermaße, 342 Tiere, Streuungen „gleich“) über scripts/profile-erwartet.R und scripts/ueben-erwartet-profile.R
 * (zweiter Weg mclust) → lib/testdaten/ueben-erwartet-profile.json; Wächter lernen/fragen-profile.test.ts.
 * Eigene Wortlaute. Quellen: Nylund, Asparouhov & Muthén (2007), Structural Equation Modeling 14; Spurk et al. (2020), Journal of Vocational Behavior 120.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const NY = 'Nylund, Asparouhov & Muthén 2007, Structural Equation Modeling 14, 535-569';
const SP = 'Spurk et al. 2020, Journal of Vocational Behavior 120, 103445';
const RECHNUNG = 'Rechnung: scripts/ueben-erwartet-profile.R';
const KOPF_DE = 'Latente Profilanalyse mit vier Körpermaßen von 342 Pinguinen (Schnabellänge, Schnabeltiefe, Flossenlänge, Körpermasse; Streuungen gleich).';
const KOPF_EN = 'Latent profile analysis with four body measures of 342 penguins (bill length, bill depth, flipper length, body mass; variances equal).';
const TAB_DE = 'BIC bei 1 bis 6 Gruppen: 11933,4 / 11066,3 / 10909,8 / 10748,2 / 10653,3 / 10603,5.';
const TAB_EN = 'BIC for 1 to 6 groups: 11933.4 / 11066.3 / 10909.8 / 10748.2 / 10653.3 / 10603.5.';

export const FRAGEN: Frage[] = [
  {
    id: 'lpr-annahme', thema: 'profile', karte: 'cluster',
    stamm: P('Was nimmt eine latente Profilanalyse über die Personen an? (latente Profile)', 'What does a latent profile analysis assume about the people? (latent profiles)'),
    antworten: [
      a(P('Jede Person gehört, unbekannt, zu einer von K Gruppen; jede Gruppe hat ein eigenes Profil aus Mittelwerten, und gerechnet wird, wie wahrscheinlich die Zugehörigkeit ist', 'Each person belongs, unknown, to one of K groups; each group has its own profile of means, and what is calculated is how probable the membership is'), P('Das ist die Annahme: eine nicht sichtbare (latente) Gruppe je Person, Zugehörigkeit nur als Wahrscheinlichkeit.', 'That is the assumption: one hidden (latent) group per person, membership only as a probability.'), true),
      a(P('Die Gruppen sind vorher bekannt und werden nur noch bestätigt', 'The groups are known beforehand and are only confirmed'), P('Das wäre ein Vergleich bekannter Gruppen (zum Beispiel Varianzanalyse). Hier sind die Gruppen unbekannt und werden aus den Mustern geschätzt.', 'That would be a comparison of known groups (for example analysis of variance). Here the groups are unknown and are estimated from the patterns.')),
      a(P('Jede Person wird fest einer Gruppe zugeordnet, die Wahrscheinlichkeit spielt keine Rolle', 'Each person is firmly assigned to one group, the probability does not matter'), P('Gerade die Wahrscheinlichkeit ist der Unterschied zur Clusteranalyse; Statable zeigt sie je Gruppe als mittlere Zuordnungs-Wahrscheinlichkeit.', 'The probability is precisely the difference from cluster analysis; Statable shows it per group as the mean assignment probability.')),
      a(P('Die Spalten hängen innerhalb einer Gruppe beliebig stark zusammen', 'The columns are related as strongly as you like within a group'), P('Im Modell von Statable sind die Spalten innerhalb einer Gruppe als unabhängig angenommen; das ist eine Vereinfachung.', 'In Statable\'s model the columns within a group are assumed to be independent; that is a simplification.'))
    ],
    hilfe: ['latente-profile'], belege: [SP, NY, 'Hilfe:latente-profile']
  },
  {
    id: 'lpr-bic', thema: 'profile', karte: 'cluster',
    stamm: P(`${KOPF_DE} ${TAB_DE} Der BIC fällt bei jeder weiteren Gruppe, auch bei der letzten gerechneten. Wie geht man damit um? (latente Profile)`, `${KOPF_EN} ${TAB_EN} The BIC falls with every additional group, also with the last one calculated. How do you handle this? (latent profiles)`),
    antworten: [
      a(P('Der BIC ist eine Hilfe, entscheidet aber nicht allein: Entropie, Größe der kleinsten Gruppe und Sinn der Gruppen mit ansehen und gegebenenfalls mehr Gruppen rechnen', 'The BIC is a help but does not decide alone: look at entropy, size of the smallest group and meaning of the groups too and perhaps calculate more groups'), P('Fällt der BIC bis zum Ende, ist die beste Zahl nicht gefunden; der Abfall von 5 auf 6 Gruppen (49,7) ist außerdem viel kleiner als von 2 auf 3 (156,6). Welche Lösung etwas bedeutet, entscheidet der Inhalt.', 'If the BIC falls to the end, the best number has not been found; the fall from 5 to 6 groups (49.7) is also much smaller than from 2 to 3 (156.6). Which solution means something is decided by the content.'), true),
      a(P('Man nimmt 6 Gruppen, weil dort der BIC am kleinsten ist, und ist fertig', 'You take 6 groups because the BIC is smallest there, and are done'), P('Der kleinste BIC einer begrenzten Reihe sagt wenig, wenn er am Rand der Reihe liegt, und er sagt nichts über den Sinn der Gruppen.', 'The smallest BIC of a limited series says little when it is at the edge of the series, and it says nothing about the meaning of the groups.')),
      a(P('Man nimmt 1 Gruppe, weil dort der BIC am größten ist', 'You take 1 group because the BIC is largest there'), P('Kleiner ist besser, nicht größer. Mit einer Gruppe passt das Modell am schlechtesten.', 'Smaller is better, not larger. With one group the model fits worst.')),
      a(P('Der fallende BIC zeigt, dass es in den Daten keine Gruppen gibt', 'The falling BIC shows that there are no groups in the data'), P('Es zeigt das Gegenteil: Mehr Gruppen beschreiben die Daten besser. Das kann aber auch daran liegen, dass die Voraussetzungen nicht stimmen.', 'It shows the opposite: more groups describe the data better. But this may also be because the requirements do not hold.'))
    ],
    hilfe: ['latente-profile'], belege: [NY, SP, RECHNUNG, 'Hilfe:latente-profile']
  },
  {
    id: 'lpr-entropie', thema: 'profile', karte: 'cluster',
    stamm: P(`${KOPF_DE} Bei 2 Gruppen ist die Entropie 0,998, bei 3 Gruppen 0,909. Was sagt die 0,998? (latente Profile)`, `${KOPF_EN} With 2 groups the entropy is 0.998, with 3 groups 0.909. What does the 0.998 say? (latent profiles)`),
    antworten: [
      a(P('Fast jedes Tier ist eindeutig einer der beiden Gruppen zugeordnet: Die Gruppen überlappen kaum', 'Almost every animal is clearly assigned to one of the two groups: the groups hardly overlap'), P('Die Entropie (hier die relative) liegt zwischen 0 und 1; nahe 1 heißt klare Zuordnung, nahe 0 starke Überlappung.', 'Entropy (here the relative one) lies between 0 and 1; near 1 means clear assignment, near 0 strong overlap.'), true),
      a(P('99,8 % der Tiere sind der richtigen Art zugeordnet', '99.8% of the animals are assigned to the correct species'), P('Die Entropie kennt keine Arten und keine „richtige“ Gruppe; sie misst nur, wie eindeutig das Modell zuordnet.', 'Entropy knows no species and no "correct" group; it only measures how clearly the model assigns.')),
      a(P('Das Modell erklärt 99,8 % der Streuung', 'The model explains 99.8% of the variation'), P('Das ist ein anderes Maß (erklärte Streuung); die Entropie sagt nichts über erklärte Streuung.', 'That is another measure (explained variation); entropy says nothing about explained variation.')),
      a(P('Die Unordnung in den Daten ist fast vollständig', 'The disorder in the data is almost complete'), P('Umgekehrt: Die Statable-Entropie ist so gewendet, dass 1 die klarste Zuordnung ist.', 'The other way round: Statable\'s entropy is turned so that 1 is the clearest assignment.'))
    ],
    hilfe: ['latente-profile'], belege: [SP, RECHNUNG, 'Hilfe:latente-profile']
  },
  {
    id: 'lpr-art', thema: 'profile', karte: 'cluster',
    stamm: P(`${KOPF_DE} Bei 2 Gruppen hat die eine 219 Tiere (151 Adelie- und 68 Zügelpinguine), die andere 123 Tiere (alle 123 Eselspinguine); das Modell hatte die Art nie gesehen. Was folgt daraus? (latente Profile)`, `${KOPF_EN} With 2 groups one has 219 animals (151 Adelie and 68 Chinstrap penguins), the other 123 animals (all 123 Gentoo penguins); the model had never seen the species. What follows? (latent profiles)`),
    antworten: [
      a(P('Die Gruppen trennen nach dem Muster in den vier Maßen (vor allem Größe und Gewicht), nicht nach den drei Arten; Adelie und Zügel sehen in diesen Maßen sehr ähnlich aus', 'The groups separate by the pattern in the four measures (mainly size and weight), not by the three species; Adelie and Chinstrap look very similar in these measures'), P('Latente Profile finden Muster in den Zahlen. Ob ein Muster einer bekannten Kategorie entspricht, ist ein Fund, kein Ziel, und hier stimmt es nur für die Eselspinguine.', 'Latent profiles find patterns in the numbers. Whether a pattern corresponds to a known category is a finding, not a goal, and here it holds only for the Gentoo penguins.'), true),
      a(P('Das Modell ist falsch, weil es nicht drei Gruppen (die drei Arten) gefunden hat', 'The model is wrong because it did not find three groups (the three species)'), P('Das Modell sucht Muster, nicht Arten. Drei Gruppen gibt es in der Rechnung auch (Entropie 0,909), aber sie entsprechen nicht den Arten.', 'The model looks for patterns, not species. Three groups are also in the calculation (entropy 0.909), but they do not correspond to the species.')),
      a(P('Gruppe 1 ist die Art Adelie, denn sie ist die größere der beiden Gruppen', 'Group 1 is the species Adelie because it is the larger of the two groups'), P('Gruppe 1 enthält zwei Arten (151 Adelie und 68 Zügel). Gruppennummern sind nur Etiketten, nach Größe geordnet.', 'Group 1 contains two species (151 Adelie and 68 Chinstrap). Group numbers are only labels, ordered by size.')),
      a(P('Mit der Art als zusätzlicher Spalte käme genau dasselbe heraus', 'With the species as an additional column exactly the same would come out'), P('Das ist nicht gesagt: Eine zusätzliche Spalte ändert das Muster, und Arten sind Namen, keine Zahlen, die Statable hier rechnen kann.', 'That is not certain: an additional column changes the pattern, and species are names, not numbers that Statable can use here.'))
    ],
    hilfe: ['latente-profile'], belege: [SP, RECHNUNG, 'Hilfe:latente-profile']
  },
  {
    id: 'lpr-mehrfach', thema: 'profile', mehrfach: true, karte: 'cluster',
    stamm: P(`${KOPF_DE} Welche Aussagen über latente Profile in Statable stimmen? Mehrere können stimmen. (latente Profile)`, `${KOPF_EN} Which statements about latent profiles in Statable are true? Several can be true. (latent profiles)`),
    antworten: [
      a(P('Die Gruppennummern sind nur Etiketten; bei einem anderen Startwert können sie vertauscht herauskommen.', 'The group numbers are only labels; with another seed they can come out swapped.'), P('Stimmt. Statable ordnet die Gruppen zwar nach Größe, aber „Gruppe 1“ ist keine feste Eigenschaft.', 'True. Statable orders the groups by size, but "group 1" is not a fixed property.'), true),
      a(P('Mit 4 Spalten und 3 Gruppen hat das Modell mit gleichen Streuungen 18 Parameter, das mit freien Streuungen 26.', 'With 4 columns and 3 groups the model with equal variances has 18 parameters, the one with free variances 26.'), P('Stimmt: 2 Anteile + 12 Mittelwerte + 4 Streuungen = 18; statt der 4 Streuungen 12 = 26. Mehr Parameter bestraft der BIC.', 'True: 2 proportions + 12 means + 4 variances = 18; with 12 instead of the 4 variances = 26. The BIC penalises more parameters.'), true),
      a(P('Eine latente Profilanalyse beweist, dass es in der Bevölkerung diese Typen von Menschen (oder Tieren) gibt.', 'A latent profile analysis proves that these types of people (or animals) exist in the population.'), P('Stimmt nicht. Sie zeigt Muster in den Messwerten; auch Daten ohne echte Gruppen liefern oft mehrere „Gruppen“.', 'Not true. It shows patterns in the measurements; even data without real groups often yield several "groups".')),
      a(P('Der BIC wird bei mehr Gruppen größer, weil jede Gruppe Parameter kostet.', 'The BIC gets larger with more groups because each group costs parameters.'), P('Stimmt nicht: Der BIC verrechnet die bessere Passung (log-Likelihood) mit den Parametern; bei den Pinguinen fällt er bis 6 Gruppen.', 'Not true: the BIC offsets the better fit (log-likelihood) against the parameters; with the penguins it falls up to 6 groups.'))
    ],
    hilfe: ['latente-profile'], belege: [NY, RECHNUNG, 'Hilfe:latente-profile']
  }
];
