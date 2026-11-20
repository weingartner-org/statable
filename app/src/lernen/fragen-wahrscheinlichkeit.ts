/**
 * Üben: Wie wahrscheinlich ist etwas, wenn schon etwas bekannt ist? (Gegenereignis, Addition und Multiplikation, Baumdiagramm, bedingte
 * Wahrscheinlichkeit, totale Wahrscheinlichkeit, Satz von Bayes, Basisrate, Unabhängigkeit, Laplace, Gesetz der großen Zahlen).
 * Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R,
 * Daten: datasets::Titanic, datasets::HairEyeColor; die übrigen Fragen sind als „Rechenbeispiel“ beschriftet und haben keine Daten).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, zd, ze, zn, zp } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const KOLM = 'Kolmogorov 1933';
const GH = 'Gigerenzer und Hoffrage 1995';
const KT73 = 'Kahneman und Tversky 1973';
const TK71 = 'Tversky und Kahneman 1971';
const EDDY = 'Eddy 1982';
const WL16 = 'Wasserstein und Lazar 2016';

const QUELLE_TITANIC = P(
  'Daten: datasets::Titanic (British Board of Trade 1990, Dawson 1995; Teil von R, Lizenz GPL), erwachsene Reisende und Besatzung. Berechnet mit R.',
  'Data: datasets::Titanic (British Board of Trade 1990, Dawson 1995; part of R, licence GPL), adult passengers and crew. Computed with R.');
const QUELLE_HAAR = P(
  `Daten: datasets::HairEyeColor (Snee 1974; Teil von R, Lizenz GPL), ${zn('wa_h_n')} Studierende, Haar- und Augenfarbe. Berechnet mit R.`,
  `Data: datasets::HairEyeColor (Snee 1974; part of R, licence GPL), ${zn('wa_h_n')} students, hair and eye colour. Computed with R.`);

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'wa-titanic': {
    titel: P(`Erwachsene Reisende und Besatzung der Titanic (${zn('wa_t_n')} Personen) nach Geschlecht (Female = Frauen, Male = Männer) und Überleben. Der Baum hat zwei Stufen: erst das Geschlecht, dann das Überleben in dieser Gruppe`,
      `Adult passengers and crew of the Titanic (${zn('wa_t_n')} people) by sex (Female, Male) and survival. The tree has two levels: first sex, then survival within that group`),
    tabellen: [
      tab('wa-titanic.0', [P('Geschlecht', 'Sex'), P('Überlebt', 'Survived'), P('Gestorben', 'Died'), P('Summe', 'Total')], QUELLE_TITANIC, P('Häufigkeiten', 'Frequencies')),
      tab('wa-titanic.1', [P('Geschlecht (erster Ast)', 'Sex (first branch)'), P('Anteil an allen Personen', 'Share of all people'), P('Anteil überlebt in dieser Gruppe (zweiter Ast)', 'Share survived in this group (second branch)')], QUELLE_TITANIC, P('Die Äste des Baums', 'The branches of the tree'))
    ]
  },
  'wa-haar': {
    titel: P(`${zn('wa_h_n')} Studierende: Haarfarbe (Zeilen: Black = schwarz, Brown = braun, Red = rot, Blond = blond) und Augenfarbe (Spalten: Brown = braun, Blue = blau, Hazel = haselnussbraun, Green = grün)`,
      `${zn('wa_h_n')} students: hair colour (rows: Black, Brown, Red, Blond) and eye colour (columns: Brown, Blue, Hazel, Green)`),
    tabellen: [
      tab('wa-haar.0', [P('Haar (Zeilen), Augen (Spalten)', 'Hair (rows), eyes (columns)'), P('Brown', 'Brown'), P('Blue', 'Blue'), P('Hazel', 'Hazel'), P('Green', 'Green'), P('Summe', 'Total')], QUELLE_HAAR, P('Beobachtete Häufigkeiten', 'Observed frequencies'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ---- Fall A: Titanic, Baum und Umkehrung ----
  {
    id: 'wa-t-pfad', thema: 'wahrscheinlichkeit', probieren: 'lernlabor/baum', fall: 'wa-titanic',
    stamm: P('Wie groß ist die Wahrscheinlichkeit, dass eine zufällig gewählte Person eine Frau ist, die überlebt hat?', 'How large is the probability that a randomly chosen person is a woman who survived?'),
    antworten: [
      a(P(`Das Produkt der beiden Äste: ${zd('wa_t_f', 3)} mal ${zd('wa_t_uf', 3)}, also ${zd('wa_t_ff', 3)}`, `The product of the two branches: ${ze('wa_t_f', 3)} times ${ze('wa_t_uf', 3)}, so ${ze('wa_t_ff', 3)}`),
        P(`Entlang eines Pfades werden die Äste multipliziert: erst Frau (${zd('wa_t_f', 3)}), dann überlebt unter den Frauen (${zd('wa_t_uf', 3)}). Zur Kontrolle: ${zn('wa_t_ff_n')} von ${zn('wa_t_n')} Personen.`,
          `Along a path the branches are multiplied: first woman (${ze('wa_t_f', 3)}), then survived among the women (${ze('wa_t_uf', 3)}). As a check: ${zn('wa_t_ff_n')} of ${zn('wa_t_n')} people.`), true),
      a(P(`Die Summe der beiden Äste: ${zd('wa_t_f', 3)} plus ${zd('wa_t_uf', 3)} ergibt das Ergebnis`, `The sum of the two branches: ${ze('wa_t_f', 3)} plus ${ze('wa_t_uf', 3)} gives the result`),
        P('Äste werden nicht addiert. Die Summe wäre größer als jeder einzelne Ast, aber beide Eigenschaften zugleich sind seltener als jede für sich. Addiert werden erst am Ende verschiedene Pfade.', 'Branches are not added. The sum would be larger than either branch, but both properties together are rarer than each alone. Only different paths are added, at the end.')),
      a(P(`Nur der zweite Ast zählt, weil das Überleben die Frage ist: ${zd('wa_t_uf', 3)}`, `Only the second branch counts, since survival is the question: ${ze('wa_t_uf', 3)}`),
        P('Der zweite Ast ist der Anteil der Überlebenden unter den Frauen. Gefragt ist Frau und überlebt zugleich, also gehört der erste Ast mit dazu.', 'The second branch is the share of survivors among the women. The question asks for woman and survived together, so the first branch belongs to it.'))
    ],
    hilfe: ['baumdiagramm', 'wahrscheinlichkeit'], belege: [KOLM, GH]
  },
  {
    id: 'wa-t-total', thema: 'wahrscheinlichkeit', probieren: 'lernlabor/baum', fall: 'wa-titanic',
    stamm: P('Wie groß ist die Wahrscheinlichkeit, dass eine zufällig gewählte Person überlebt hat, ohne das Geschlecht zu beachten?', 'How large is the probability that a randomly chosen person survived, ignoring sex?'),
    antworten: [
      a(P(`Pfade addieren: ${zd('wa_t_ff', 3)} über die Frauen plus ${zd('wa_t_fm', 3)} über die Männer, also ${zd('wa_t_u', 3)}`, `Add the paths: ${ze('wa_t_ff', 3)} via the women plus ${ze('wa_t_fm', 3)} via the men, so ${ze('wa_t_u', 3)}`),
        P(`Zum Überleben führen zwei Pfade: Frau und überlebt, Mann und überlebt. Ihre Wahrscheinlichkeiten werden addiert (Satz der totalen Wahrscheinlichkeit). Zur Kontrolle: ${zn('wa_t_ueb')} von ${zn('wa_t_n')} Personen.`,
          `Two paths lead to survival: woman and survived, man and survived. Their probabilities are added (law of total probability). As a check: ${zn('wa_t_ueb')} of ${zn('wa_t_n')} people.`), true),
      a(P(`Den Mittelwert der beiden Überlebensäste bilden: ${zd('wa_t_uf', 3)} und ${zd('wa_t_um', 3)} ergeben ${zd('wa_t_mittel', 3)}`, `Take the mean of the two survival branches: ${ze('wa_t_uf', 3)} and ${ze('wa_t_um', 3)} give ${ze('wa_t_mittel', 3)}`),
        P(`Der einfache Mittelwert gibt Frauen und Männern gleiches Gewicht. Männer sind aber viel häufiger (${zd('wa_t_m', 3)} gegen ${zd('wa_t_f', 3)}), die Pfade müssen mit diesen Anteilen gewichtet werden.`,
          `The simple mean gives women and men the same weight. Men are far more frequent (${ze('wa_t_m', 3)} against ${ze('wa_t_f', 3)}), so the paths must be weighted by these shares.`)),
      a(P(`Nur den Ast der Frauen verwenden, denn dort ist das Überleben am häufigsten: ${zd('wa_t_uf', 3)}`, `Use only the branch of the women, since survival is most frequent there: ${ze('wa_t_uf', 3)}`),
        P('Dieser Ast gilt nur für Frauen, nicht für alle Personen. Das Gesamtergebnis braucht auch den Pfad über die Männer.', 'This branch applies to women only, not to all people. The overall result needs the path via the men as well.'))
    ],
    hilfe: ['totale-wahrscheinlichkeit', 'baumdiagramm'], belege: [KOLM]
  },
  {
    id: 'wa-t-umkehr', thema: 'wahrscheinlichkeit', probieren: 'lernlabor/baum', fall: 'wa-titanic',
    stamm: P(`In der Tabelle ist ${zd('wa_t_uf', 3)} der Anteil der Überlebenden unter den Frauen. Was beschreibt P(Frau | überlebt), mit der Bedingung hinter dem Strich?`, `In the table ${ze('wa_t_uf', 3)} is the share of survivors among the women. What does P(woman | survived) describe, with the condition behind the bar?`),
    antworten: [
      a(P('Den Anteil der Frauen unter den Überlebenden, bezogen auf diese Gruppe', 'The share of women among the survivors, counted among the survivors only'),
        P(`Hinter dem Strich steht, was schon bekannt ist; es wird nur unter den Überlebenden gezählt: ${zn('wa_t_ff_n')} von ${zn('wa_t_ueb')}, also ${zd('wa_t_fu', 3)}. Das ist eine andere Zahl als ${zd('wa_t_uf', 3)}.`,
          `Behind the bar stands what is already known; counting is among the survivors only: ${zn('wa_t_ff_n')} of ${zn('wa_t_ueb')}, so ${ze('wa_t_fu', 3)}. That is a different number from ${ze('wa_t_uf', 3)}.`), true),
      a(P(`Den Anteil der Überlebenden unter den Frauen, nur anders geschrieben, also ${zd('wa_t_uf', 3)}`, `The share of survivors among the women, just written differently, so ${ze('wa_t_uf', 3)}`),
        P(`Das ist P(überlebt | Frau). Die Bedingung ist vertauscht, und die Werte unterscheiden sich stark: ${zd('wa_t_uf', 3)} gegen ${zd('wa_t_fu', 3)} (Umkehrfehler).`,
          `That is P(survived | woman). The condition is swapped, and the values differ strongly: ${ze('wa_t_uf', 3)} against ${ze('wa_t_fu', 3)} (confusion of the inverse).`)),
      a(P(`Den Anteil der überlebenden Frauen an allen Personen, also ${zd('wa_t_ff', 3)}`, `The share of surviving women among all people, so ${ze('wa_t_ff', 3)}`),
        P(`Das ist P(Frau und überlebt) = ${zd('wa_t_ff', 3)}, geteilt durch alle ${zn('wa_t_n')} Personen. Bei der bedingten Wahrscheinlichkeit wird nur durch die Zahl der Überlebenden geteilt.`,
          `That is P(woman and survived) = ${ze('wa_t_ff', 3)}, divided by all ${zn('wa_t_n')} people. For the conditional probability the division is by the number of survivors only.`))
    ],
    hilfe: ['bedingte-wahrscheinlichkeit', 'satz-von-bayes'], belege: ['wissen:med-umkehrung-bedingung', EDDY, KOLM]
  },
  {
    id: 'wa-t-bayes', thema: 'wahrscheinlichkeit', probieren: 'lernlabor/baum', fall: 'wa-titanic',
    stamm: P('Eine überlebende Person wird zufällig gewählt. Wie wahrscheinlich ist es, dass sie eine Frau ist?', 'A person who survived is chosen at random. How likely is it that she is a woman?'),
    antworten: [
      a(P(`Den Pfad Frau-überlebt durch alle Überlebenden teilen: ${zd('wa_t_ff', 3)} durch ${zd('wa_t_u', 3)}, also ${zd('wa_t_fu', 3)}`, `Divide the path woman-survived by all survivors: ${ze('wa_t_ff', 3)} by ${ze('wa_t_u', 3)}, so ${ze('wa_t_fu', 3)}`),
        P(`Nach der Auswahl bleiben nur die Pfade mit Überleben übrig (${zd('wa_t_ff', 3)} und ${zd('wa_t_fm', 3)}). Der Anteil der Frauen daran ist der Satz von Bayes. Als natürliche Häufigkeit: ${zn('wa_t_ff_n')} von ${zn('wa_t_ueb')} Überlebenden.`,
          `After the choice only the paths with survival remain (${ze('wa_t_ff', 3)} and ${ze('wa_t_fm', 3)}). The share of women among them is Bayes' theorem. As a natural frequency: ${zn('wa_t_ff_n')} of ${zn('wa_t_ueb')} survivors.`), true),
      a(P(`Die Wahrscheinlichkeit, als Frau zu überleben, also ${zd('wa_t_uf', 3)}, denn Frau und Überleben gehören zusammen`, `The probability of surviving as a woman, so ${ze('wa_t_uf', 3)}, since woman and survival go together`),
        P('Das ist die umgekehrte Frage (überlebt unter den Frauen). Hier ist das Überleben die Bedingung, darum wird durch alle Überlebenden geteilt.', 'That is the inverse question (survived among the women). Here survival is the condition, so the division is by all survivors.')),
      a(P(`Den Anteil der Frauen an allen Personen, ${zd('wa_t_f', 3)}, denn die Auswahl ändert das Verhältnis nicht`, `The share of women among all people, ${ze('wa_t_f', 3)}, since the choice does not change the ratio`),
        P(`Die Auswahl der Überlebenden ändert das Verhältnis: Unter ihnen sind Frauen viel häufiger (${zd('wa_t_fu', 3)}) als unter allen (${zd('wa_t_f', 3)}). Wer die neue Information übergeht, bleibt bei der Basisrate.`,
          `The choice of survivors changes the ratio: among them women are much more frequent (${ze('wa_t_fu', 3)}) than among all (${ze('wa_t_f', 3)}). Whoever ignores the new information stays with the base rate.`))
    ],
    hilfe: ['satz-von-bayes', 'baumdiagramm', 'bedingte-wahrscheinlichkeit'], belege: [KOLM, GH, KT73]
  },
  {
    id: 'wa-t-laplace', thema: 'wahrscheinlichkeit', fall: 'wa-titanic',
    stamm: P(`Jemand sagt: Es gibt nur zwei Ausgänge, überleben oder sterben, also ist die Wahrscheinlichkeit zu überleben gleich ${zd('wa_s_p', 1)}. Was trifft zu?`, `Someone says: there are only two outcomes, survive or die, so the probability of surviving is ${ze('wa_s_p', 1)}. What applies?`),
    antworten: [
      a(P(`Zwei Ausgänge genügen nicht, sie müssten gleich wahrscheinlich sein; hier überlebten ${zd('wa_t_u', 3)}`, `Two outcomes are not enough, they would need to be equally likely; here ${ze('wa_t_u', 3)} survived`),
        P(`Die Regel von Laplace setzt gleich wahrscheinliche Ausgänge voraus. Das wäre nur erfüllt, wenn Überleben und Sterben gleich oft vorkämen, die Daten zeigen aber ${zn('wa_t_ueb')} von ${zn('wa_t_n')} Überlebenden.`,
          `Laplace's rule requires equally likely outcomes. That would hold only if surviving and dying were equally frequent, but the data show ${zn('wa_t_ueb')} of ${zn('wa_t_n')} survivors.`), true),
      a(P(`Das stimmt, denn zwei Ausgänge teilen sich die Wahrscheinlichkeit gleichmäßig, jeder erhält ${zd('wa_s_p', 1)}`, `That is right, since two outcomes share the probability equally between them, each gets ${ze('wa_s_p', 1)}`),
        P(`Zwei mögliche Ausgänge sind noch keine zwei gleich wahrscheinlichen Ausgänge. In den Daten ist es ${zd('wa_t_u', 3)} gegen ${zd('wa_t_nu', 3)}.`,
          `Two possible outcomes are not yet two equally likely outcomes. In the data it is ${ze('wa_t_u', 3)} against ${ze('wa_t_nu', 3)}.`)),
      a(P(`Das stimmt, denn Überleben und Sterben sind Gegenereignisse, die zusammen 1 ergeben, also je ${zd('wa_s_p', 1)}`, `That is right, since surviving and dying are complementary events that add up to 1, so ${ze('wa_s_p', 1)} each`),
        P(`Gegenereignisse ergeben zusammen 1, sagen aber nichts über die Aufteilung: ${zd('wa_t_u', 3)} und ${zd('wa_t_nu', 3)} ergeben ebenfalls 1.`,
          `Complementary events add up to 1 but say nothing about the split: ${ze('wa_t_u', 3)} and ${ze('wa_t_nu', 3)} also add up to 1.`))
    ],
    hilfe: ['laplace', 'gegenereignis'], belege: ['Laplace 1812', KOLM]
  },
  // ---- Fall B: Haar- und Augenfarbe, Addition und Unabhängigkeit ----
  {
    id: 'wa-h-unvereinbar', thema: 'wahrscheinlichkeit', fall: 'wa-haar',
    stamm: P('Wie groß ist die Wahrscheinlichkeit, dass eine zufällig gewählte Person blonde oder rote Haare hat?', 'How large is the probability that a randomly chosen person has blond or red hair?'),
    antworten: [
      a(P(`Die Fälle zusammenzählen: ${zn('wa_h_bl_n')} blonde plus ${zn('wa_h_ro_n')} rote von ${zn('wa_h_n')} Personen, also ${zd('wa_h_bl_ro', 3)}`, `Add the cases: ${zn('wa_h_bl_n')} blond plus ${zn('wa_h_ro_n')} red out of ${zn('wa_h_n')} people, which is ${ze('wa_h_bl_ro', 3)} of all`),
        P('Eine Person hat genau eine Haarfarbe, Blond und Rot schließen einander aus (unvereinbar). Dann werden die Wahrscheinlichkeiten addiert (Additionsregel); nichts wird doppelt gezählt. Die allgemeine Regel zieht die Überschneidung ab, sie ist hier 0.', 'A person has exactly one hair colour, blond and red exclude each other (mutually exclusive). Then the probabilities are added (addition rule); nothing is counted twice. The general rule subtracts the overlap, which is 0 here.'), true),
      a(P(`Die beiden Wahrscheinlichkeiten multiplizieren: ${zd('wa_h_bl', 3)} mal ${zd('wa_h_ro', 3)}, weil beide Haarfarben zählen`, `Multiply the two probabilities: ${ze('wa_h_bl', 3)} times ${ze('wa_h_ro', 3)}, because both hair colours count`),
        P('Multipliziert wird bei „und“, wenn beide Ereignisse zugleich eintreten (und bei Unabhängigkeit). Hier steht „oder“, und eine Person kann nicht beide Haarfarben zugleich haben.', 'Multiplication is for "and", when both events occur together (and with independence). Here it says "or", and one person cannot have both hair colours at once.')),
      a(P('Den Mittelwert der beiden Wahrscheinlichkeiten bilden, weil eine von beiden gemeint ist', 'Take the mean of the two probabilities, since one of the two is meant'),
        P('Gesucht ist der Anteil der Personen, die zu mindestens einer der beiden Gruppen gehören, und das ist mehr als jede Gruppe allein. Ein Mittelwert läge zwischen beiden Anteilen.', 'What is asked is the share of people who belong to at least one of the two groups, and that is more than either group alone. A mean would lie between the two shares.'))
    ],
    hilfe: ['wahrscheinlichkeit', 'unabhaengigkeit'], belege: [KOLM]
  },
  {
    id: 'wa-h-ueberlapp', thema: 'wahrscheinlichkeit', fall: 'wa-haar',
    stamm: P('Wie groß ist die Wahrscheinlichkeit, dass eine zufällig gewählte Person blonde Haare oder blaue Augen hat?', 'How large is the probability that a randomly chosen person has blond hair or blue eyes?'),
    antworten: [
      a(P(`Addieren und die Überschneidung abziehen: ${zd('wa_h_bl', 3)} plus ${zd('wa_h_au', 3)} minus ${zd('wa_h_both', 3)}, also ${zd('wa_h_bl_au', 3)}`, `Add and subtract the overlap: ${ze('wa_h_bl', 3)} plus ${ze('wa_h_au', 3)} minus ${ze('wa_h_both', 3)}, so ${ze('wa_h_bl_au', 3)}`),
        P(`Wer blond und blauäugig ist, steckt in beiden Gruppen und würde doppelt gezählt. Die Überschneidung (${zn('wa_h_both_n')} Personen) wird einmal abgezogen: ${zn('wa_h_bl_n')} plus ${zn('wa_h_au_n')} minus ${zn('wa_h_both_n')} gleich ${zn('wa_h_bl_au_n')} von ${zn('wa_h_n')}.`,
          `Whoever is blond and blue-eyed is in both groups and would be counted twice. The overlap (${zn('wa_h_both_n')} people) is subtracted once: ${zn('wa_h_bl_n')} plus ${zn('wa_h_au_n')} minus ${zn('wa_h_both_n')} equals ${zn('wa_h_bl_au_n')} of ${zn('wa_h_n')}.`), true),
      a(P(`Einfach addieren, weil „oder“ gefragt ist: ${zd('wa_h_bl', 3)} plus ${zd('wa_h_au', 3)}, also ${zd('wa_h_summe', 3)}`, `Simply add both probabilities, since "or" is asked: ${ze('wa_h_bl', 3)} plus ${ze('wa_h_au', 3)}, so ${ze('wa_h_summe', 3)}`),
        P(`Die Summe zählt die ${zn('wa_h_both_n')} Personen mit blonden Haaren und blauen Augen doppelt. Einfaches Addieren gilt nur, wenn sich die Ereignisse ausschließen.`,
          `The sum counts the ${zn('wa_h_both_n')} people with blond hair and blue eyes twice. Simple addition holds only if the events exclude each other.`)),
      a(P(`Multiplizieren, weil zwei Merkmale beteiligt sind: ${zd('wa_h_bl', 3)} mal ${zd('wa_h_au', 3)}, also die gesuchte Zahl`, `Multiply, since two characteristics are involved: ${ze('wa_h_bl', 3)} times ${ze('wa_h_au', 3)}, giving the answer`),
        P('Ein Produkt gehört zu „und“, genauer zu „beides zugleich“ bei Unabhängigkeit. Gefragt ist „oder“, also mindestens eines von beiden.', 'A product belongs to "and", more precisely to "both together" under independence. The question is "or", that is at least one of the two.'))
    ],
    hilfe: ['wahrscheinlichkeit', 'gegenereignis'], belege: [KOLM]
  },
  {
    id: 'wa-h-unabh', thema: 'wahrscheinlichkeit', fall: 'wa-haar',
    stamm: P(`Unter den blonden Personen haben ${zd('wa_h_au_bl', 3)} blaue Augen, unter allen Personen ${zd('wa_h_au', 3)}. Was folgt für Haarfarbe und Augenfarbe?`, `Among the blond people ${ze('wa_h_au_bl', 3)} have blue eyes, among all people ${ze('wa_h_au', 3)}. What follows for hair colour and eye colour?`),
    antworten: [
      a(P('Sie sind abhängig: Wer blond ist, hat andere Chancen auf blaue Augen', 'They are dependent: the information "blond" changes the probability of blue eyes'),
        P(`Bei Unabhängigkeit wäre P(blau | blond) gleich P(blau). Hier sind es ${zd('wa_h_au_bl', 3)} gegen ${zd('wa_h_au', 3)}, die Merkmale hängen also zusammen. Ob das mehr als Zufall ist, prüft ein Test.`,
          `Under independence P(blue | blond) would equal P(blue). Here it is ${ze('wa_h_au_bl', 3)} against ${ze('wa_h_au', 3)}, so the characteristics are related. Whether that is more than chance is for a test to decide.`), true),
      a(P('Sie sind unabhängig, denn Haarfarbe und Augenfarbe sind verschiedene Merkmale einer Person', 'They are independent, since hair colour and eye colour are different characteristics of a person'),
        P(`Verschiedene Merkmale sind nicht von selbst unabhängig. Entscheidend ist, ob die Bedingung die Wahrscheinlichkeit ändert, und sie ändert sich von ${zd('wa_h_au', 3)} auf ${zd('wa_h_au_bl', 3)}.`,
          `Different characteristics are not independent by themselves. What matters is whether the condition changes the probability, and it changes from ${ze('wa_h_au', 3)} to ${ze('wa_h_au_bl', 3)}.`)),
      a(P('Sie sind unvereinbar, denn blonde Haare gehen häufig mit blauen Augen einher', 'They are mutually exclusive, since blond hair often goes with blue eyes'),
        P(`Unvereinbar hieße: keine Person hat beides. Die Tabelle zeigt ${zn('wa_h_both_n')} blonde Personen mit blauen Augen.`,
          `Mutually exclusive would mean: no person has both. The table shows ${zn('wa_h_both_n')} blond people with blue eyes.`))
    ],
    hilfe: ['unabhaengigkeit', 'bedingte-wahrscheinlichkeit'], belege: [KOLM, 'wissen:kreuz-chi2-berechnung']
  },
  // ---- Rechenbeispiele ohne Daten ----
  {
    id: 'wa-g-mindestens', thema: 'wahrscheinlichkeit',
    stamm: P(`Rechenbeispiel: Ein fairer Würfel wird ${zn('wa_g_n')}-mal geworfen. Wie groß ist die Wahrscheinlichkeit für mindestens eine Sechs?`, `Worked example: a fair die is thrown ${zn('wa_g_n')} times. How large is the probability of at least one six?`),
    antworten: [
      a(P(`Über das Gegenereignis: 1 minus (${zn('wa_g_nicht')}/${zn('wa_g_seiten')}) hoch ${zn('wa_g_n')}, also ${zd('wa_g_p', 3)}`, `Via the complementary event: 1 minus (${zn('wa_g_nicht')}/${zn('wa_g_seiten')}) to the power ${zn('wa_g_n')}, so ${ze('wa_g_p', 3)}`),
        P(`Das Gegenereignis „keine Sechs in allen Würfen“ ist leichter zu rechnen: ${zd('wa_g_ohne', 3)} (unabhängige Würfe, Äste multipliziert). Die gesuchte Wahrscheinlichkeit ist 1 minus ${zd('wa_g_ohne', 3)}. Zur Kontrolle: ${zn('wa_g_guenstig')} von ${zn('wa_g_ausgaenge')} Ausgängen enthalten eine Sechs.`,
          `The complementary event "no six in all throws" is easier to compute: ${ze('wa_g_ohne', 3)} (independent throws, branches multiplied). The probability asked for is 1 minus ${ze('wa_g_ohne', 3)}. As a check: ${zn('wa_g_guenstig')} of ${zn('wa_g_ausgaenge')} outcomes contain a six.`), true),
      a(P(`Die Einzelwahrscheinlichkeiten addieren: ${zn('wa_g_n')} mal 1/${zn('wa_g_seiten')}, also ${zd('wa_g_summe', 3)}`, `Add the single probabilities: ${zn('wa_g_n')} times 1/${zn('wa_g_seiten')}, so ${ze('wa_g_summe', 3)}, because "or" is meant`),
        P('Addiert werden darf nur bei Ereignissen, die einander ausschließen. Sechsen in verschiedenen Würfen können zugleich auftreten; solche Fälle würden mehrfach gezählt, und bei sehr vielen Würfen käme mehr als 1 heraus.', 'Addition is allowed only for events that exclude each other. Sixes in different throws can occur together; such cases would be counted several times, and with very many throws the result would exceed 1.')),
      a(P(`Jeder Wurf muss eine Sechs zeigen: (1/${zn('wa_g_seiten')}) hoch ${zn('wa_g_n')}, also ${zd('wa_g_alle', 4)}`, `Every throw must show a six: (1/${zn('wa_g_seiten')}) to the power ${zn('wa_g_n')}, so ${ze('wa_g_alle', 4)}`),
        P('Das ist die Wahrscheinlichkeit, dass alle Würfe eine Sechs zeigen. Gefragt ist mindestens eine, eine viel größere Menge von Ausgängen.', 'That is the probability that all throws show a six. The question asks for at least one, a much larger set of outcomes.'))
    ],
    hilfe: ['gegenereignis', 'wahrscheinlichkeit'], belege: [KOLM]
  },
  {
    id: 'wa-add-unabh', thema: 'wahrscheinlichkeit',
    stamm: P('Rechenbeispiel: Ein fairer Würfel wird einmal geworfen. A ist „eine Sechs“, B ist „eine Eins“. Welche Aussage über A und B stimmt?', 'Worked example: a fair die is thrown once. A is "a six", B is "a one". Which statement about A and B is right?'),
    antworten: [
      a(P('Sie sind abhängig, weil das Eintreten von A das Eintreten von B ausschließt', 'They are dependent, because the occurrence of A rules out the occurrence of B'),
        P('Unabhängig hieße P(B | A) = P(B). Hier ist P(B | A) = 0, während P(B) größer als 0 ist. Unvereinbare Ereignisse mit positiver Wahrscheinlichkeit sind also abhängig; beide Begriffe werden oft verwechselt.', 'Independent would mean P(B | A) = P(B). Here P(B | A) = 0, while P(B) is greater than 0. Mutually exclusive events with positive probability are therefore dependent; the two terms are often confused.'), true),
      a(P('Sie sind unabhängig, weil sie einander ausschließen und nichts miteinander gemeinsam haben', 'They are independent, because they exclude each other and have nothing in common'),
        P('Einander ausschließen ist eine starke Form von Abhängigkeit: Wer weiß, dass A eingetreten ist, weiß sicher, dass B nicht eingetreten ist. Das ist eine Information über B.', 'Excluding each other is a strong form of dependence: whoever knows that A occurred knows for sure that B did not occur. That is information about B.')),
      a(P('Sie sind unabhängig, weil beim fairen Würfel jede Augenzahl dieselbe Wahrscheinlichkeit hat', 'They are independent, because with a fair die every number of pips has the same probability'),
        P('Gleiche Wahrscheinlichkeiten der Augenzahlen sagen nichts über die Beziehung von A und B. Geprüft wird, ob die Bedingung die Wahrscheinlichkeit ändert, und sie ändert sie auf 0.', 'Equal probabilities of the numbers of pips say nothing about the relation of A and B. What is checked is whether the condition changes the probability, and it changes it to 0.'))
    ],
    hilfe: ['unabhaengigkeit', 'wahrscheinlichkeit'], belege: [KOLM]
  },
  {
    id: 'wa-urne-mit', thema: 'wahrscheinlichkeit',
    stamm: P(`Rechenbeispiel: Eine Urne enthält ${zn('wa_u_rot')} rote und ${zn('wa_u_blau')} blaue Kugeln. Es wird zweimal gezogen, die Kugel kommt nach jedem Zug zurück. Wie groß ist die Wahrscheinlichkeit für zweimal Rot?`, `Worked example: an urn holds ${zn('wa_u_rot')} red and ${zn('wa_u_blau')} blue balls. Two draws are made, the ball goes back after each draw. How large is the probability of red twice?`),
    antworten: [
      a(P(`Den Anteil mit sich selbst multiplizieren: ${zd('wa_u_anteil', 1)} mal ${zd('wa_u_anteil', 1)}, also ${zd('wa_u_mit', 3)}`, `Multiply the share of red balls by itself: ${ze('wa_u_anteil', 1)} times ${ze('wa_u_anteil', 1)}, so ${ze('wa_u_mit', 3)}`),
        P(`Mit Zurücklegen ist die Urne vor jedem Zug gleich, die Züge sind unabhängig. Der Pfad Rot-Rot hat ${zd('wa_u_anteil', 1)} mal ${zd('wa_u_anteil', 1)}.`, `With replacement the urn is the same before each draw, the draws are independent. The path red-red has ${ze('wa_u_anteil', 1)} times ${ze('wa_u_anteil', 1)}.`), true),
      a(P(`Die Kugelzahl im zweiten Zug anpassen: ${zd('wa_u_anteil', 1)} mal ${zn('wa_u_rest')}/${zn('wa_u_rest_alle')}, also ${zd('wa_u_ohne', 3)}, da eine Kugel fehlt`, `Adjust the second draw: ${ze('wa_u_anteil', 1)} times ${zn('wa_u_rest')}/${zn('wa_u_rest_alle')}, so ${ze('wa_u_ohne', 3)}, since one ball is missing`),
        P(`Das ist die Rechnung für Ziehen ohne Zurücklegen. Hier kommt die Kugel zurück, die Urne hat im zweiten Zug wieder alle ${zn('wa_u_alle')} Kugeln.`, `That is the computation for drawing without replacement. Here the ball goes back, the urn again holds all ${zn('wa_u_alle')} balls in the second draw.`)),
      a(P(`Mindestens einmal Rot suchen: 1 minus ${zd('wa_u_anteil_b', 1)} mal ${zd('wa_u_anteil_b', 1)}, also ${zd('wa_u_min', 3)}, weil zwei Züge zählen`, `Look for red at least once: 1 minus ${ze('wa_u_anteil_b', 1)} times ${ze('wa_u_anteil_b', 1)}, so ${ze('wa_u_min', 3)}`),
        P('Das ist die Wahrscheinlichkeit für mindestens einmal Rot (Gegenereignis: zweimal Blau). Gefragt ist zweimal Rot, also beide Züge zugleich.', 'That is the probability of red at least once (complementary event: blue twice). The question asks for red twice, that is both draws together.'))
    ],
    hilfe: ['unabhaengigkeit', 'baumdiagramm'], belege: [KOLM]
  },
  {
    id: 'wa-urne-ohne', thema: 'wahrscheinlichkeit',
    stamm: P(`Rechenbeispiel: Dieselbe Urne (${zn('wa_u_rot')} rote, ${zn('wa_u_blau')} blaue Kugeln), zwei Züge ohne Zurücklegen. Der erste Zug ergab Rot. Wie groß ist die Wahrscheinlichkeit, dass der zweite Zug ebenfalls Rot ergibt?`, `Worked example: the same urn (${zn('wa_u_rot')} red, ${zn('wa_u_blau')} blue balls), two draws without replacement. The first draw gave red. How large is the probability that the second draw is red as well?`),
    antworten: [
      a(P(`${zn('wa_u_rest')} von ${zn('wa_u_rest_alle')}, also ${zd('wa_u_bed', 3)}, denn die Urne enthält nur noch ${zn('wa_u_rest_alle')} Kugeln, davon ${zn('wa_u_rest')} rote`, `${zn('wa_u_rest')} of ${zn('wa_u_rest_alle')}, so ${ze('wa_u_bed', 3)}, since the urn holds only ${zn('wa_u_rest_alle')} balls, ${zn('wa_u_rest')} red`),
        P(`Das ist eine bedingte Wahrscheinlichkeit: P(Rot im zweiten Zug | Rot im ersten) = ${zn('wa_u_rest')}/${zn('wa_u_rest_alle')} = ${zd('wa_u_bed', 3)}. Die Information über den ersten Zug verändert die Zusammensetzung der Urne.`,
          `This is a conditional probability: P(red on the second draw | red on the first) = ${zn('wa_u_rest')}/${zn('wa_u_rest_alle')} = ${ze('wa_u_bed', 3)}. The information about the first draw changes the make-up of the urn.`), true),
      a(P(`${zn('wa_u_rot')} von ${zn('wa_u_alle')}, also ${zd('wa_u_anteil', 1)}, denn der Anteil roter Kugeln in der Urne steht fest`, `${zn('wa_u_rot')} of ${zn('wa_u_alle')}, so ${ze('wa_u_anteil', 1)}, since the share of red balls in the urn is fixed`),
        P(`Das gilt nur mit Zurücklegen. Ohne Zurücklegen fehlt eine rote Kugel, und der Anteil sinkt auf ${zd('wa_u_bed', 3)}.`, `That holds only with replacement. Without replacement a red ball is missing, and the share falls to ${ze('wa_u_bed', 3)}.`)),
      a(P(`${zd('wa_u_ohne', 3)}, die Wahrscheinlichkeit für zweimal Rot, vor dem ersten Zug berechnet`, `${ze('wa_u_ohne', 3)}, the probability of red twice, computed before the first draw`),
        P(`${zd('wa_u_ohne', 3)} ist der ganze Pfad Rot-Rot, solange noch nichts gezogen ist. Steht der erste Zug schon fest, bleibt nur der zweite Ast.`, `${ze('wa_u_ohne', 3)} is the whole path red-red as long as nothing has been drawn. Once the first draw is known, only the second branch remains.`))
    ],
    hilfe: ['bedingte-wahrscheinlichkeit', 'baumdiagramm'], belege: [KOLM]
  },
  {
    id: 'wa-wuerfel-bedingt', thema: 'wahrscheinlichkeit',
    stamm: P(`Rechenbeispiel: Zwei faire Würfel werden geworfen. Bekannt ist, dass die Augensumme ${zn('wa_w_summe')} beträgt. Wie groß ist die Wahrscheinlichkeit für einen Pasch (zwei gleiche Zahlen)?`, `Worked example: two fair dice are thrown. It is known that the sum of pips is ${zn('wa_w_summe')}. How large is the probability of a double (two equal numbers)?`),
    antworten: [
      a(P(`${zn('wa_w_pasch')} von ${zn('wa_w_gleich')}, also ${zd('wa_w_bed', 3)}: Unter den Ausgängen mit dieser Summe ist einer ein Pasch`, `${zn('wa_w_pasch')} of ${zn('wa_w_gleich')}, so ${ze('wa_w_bed', 3)}: among the outcomes with this sum one is a double`),
        P(`Mit der Information schrumpft die Menge der möglichen Ausgänge auf die ${zn('wa_w_gleich')} mit dieser Summe. Bedingte Wahrscheinlichkeit heißt: günstige durch die verbliebenen Ausgänge teilen.`,
          `With the information the set of possible outcomes shrinks to the ${zn('wa_w_gleich')} with this sum. Conditional probability means dividing the favourable outcomes by the remaining ones.`), true),
      a(P(`${zn('wa_w_pasch')} von ${zn('wa_w_sechs')}, also ${zd('wa_w_pasch_alle', 3)}, denn jeder sechste Wurf ist ein Pasch, das Vorwissen ändert daran nichts`, `${zn('wa_w_pasch')} of ${zn('wa_w_sechs')}, so ${ze('wa_w_pasch_alle', 3)}, since one throw in six is a double, regardless of the sum`),
        P('Das ist die Wahrscheinlichkeit für einen Pasch ohne Vorwissen. Mit der bekannten Summe ändert sie sich, weil nur noch ein Teil der Ausgänge möglich ist.', 'That is the probability of a double without prior knowledge. With the known sum it changes, because only part of the outcomes remain possible.')),
      a(P(`${zn('wa_w_pasch')} von ${zn('wa_w_alle')}, also ${zd('wa_w_beide', 3)}: Von allen Ausgängen ist einer ein Pasch mit dieser Summe`, `${zn('wa_w_pasch')} of ${zn('wa_w_alle')}, so ${ze('wa_w_beide', 3)}: of all outcomes one is a double with this sum`),
        P(`Das ist die Wahrscheinlichkeit für Pasch und diese Summe zugleich, bezogen auf alle ${zn('wa_w_alle')} Ausgänge. Bei der bedingten Wahrscheinlichkeit wird nur durch die Ausgänge mit der bekannten Summe geteilt.`,
          `That is the probability of double and this sum together, relative to all ${zn('wa_w_alle')} outcomes. For the conditional probability the division is by the outcomes with the known sum only.`))
    ],
    hilfe: ['bedingte-wahrscheinlichkeit', 'laplace'], belege: [KOLM]
  },
  {
    id: 'wa-total-gewicht', thema: 'wahrscheinlichkeit', probieren: 'lernlabor/baum',
    stamm: P(`Rechenbeispiel: Maschine A fertigt ${zp('wa_m_a')} Prozent der Teile, davon sind ${zp('wa_m_da')} Prozent defekt. Maschine B fertigt ${zp('wa_m_b')} Prozent, davon sind ${zp('wa_m_db')} Prozent defekt. Wie groß ist der Anteil defekter Teile insgesamt?`, `Worked example: machine A makes ${zp('wa_m_a')} percent of the parts, of which ${zp('wa_m_da')} percent are defective. Machine B makes ${zp('wa_m_b')} percent, of which ${zp('wa_m_db')} percent are defective. How large is the share of defective parts overall?`),
    antworten: [
      a(P(`Die Pfade addieren: ${zd('wa_m_a', 1)} mal ${zd('wa_m_da', 2)} plus ${zd('wa_m_b', 1)} mal ${zd('wa_m_db', 2)}, also ${zd('wa_m_def', 3)}, gewichtet`, `Add the paths: ${ze('wa_m_a', 1)} times ${ze('wa_m_da', 2)} plus ${ze('wa_m_b', 1)} times ${ze('wa_m_db', 2)}, so ${ze('wa_m_def', 3)}, weighted`),
        P(`Zwei Pfade führen zu „defekt“: Maschine A (${zd('wa_m_pa', 3)}) und Maschine B (${zd('wa_m_pb', 3)}). Der Satz der totalen Wahrscheinlichkeit addiert die Pfade; jede Rate ist mit dem Anteil ihrer Maschine gewichtet.`,
          `Two paths lead to "defective": machine A (${ze('wa_m_pa', 3)}) and machine B (${ze('wa_m_pb', 3)}). The law of total probability adds the paths; each rate is weighted by the share of its machine.`), true),
      a(P(`Den Mittelwert der beiden Raten bilden: ${zd('wa_m_da', 2)} und ${zd('wa_m_db', 2)} ergeben ${zd('wa_m_mittel', 3)}, beide zählen gleich`, `Take the mean of the two rates: ${ze('wa_m_da', 2)} and ${ze('wa_m_db', 2)} give ${ze('wa_m_mittel', 3)}, both count equally`),
        P(`Der einfache Mittelwert gibt beiden Maschinen gleiches Gewicht. A fertigt aber mehr Teile (${zd('wa_m_a', 1)} gegen ${zd('wa_m_b', 1)}), darum liegt der Gesamtanteil näher bei ${zd('wa_m_da', 2)}.`,
          `The simple mean gives both machines the same weight. But A makes more parts (${ze('wa_m_a', 1)} against ${ze('wa_m_b', 1)}), so the overall share lies closer to ${ze('wa_m_da', 2)}.`)),
      a(P(`Die beiden Raten addieren: ${zd('wa_m_da', 2)} plus ${zd('wa_m_db', 2)}, also ${zd('wa_m_summe', 2)}, aus beiden Quellen`, `Add the two rates: ${ze('wa_m_da', 2)} plus ${ze('wa_m_db', 2)}, so ${ze('wa_m_summe', 2)}, from both sources`),
        P(`Raten aus verschiedenen Teilmengen werden nicht einfach addiert. ${zd('wa_m_summe', 2)} läge über jeder der beiden Raten, aber der Gesamtanteil muss zwischen ihnen liegen.`,
          `Rates from different subsets are not simply added. ${ze('wa_m_summe', 2)} would exceed both rates, but the overall share must lie between them.`))
    ],
    hilfe: ['totale-wahrscheinlichkeit', 'baumdiagramm'], belege: [KOLM]
  },
  {
    id: 'wa-krank-basisrate', thema: 'wahrscheinlichkeit', probieren: 'lernlabor/baum',
    stamm: P(`Rechenbeispiel: Eine Krankheit betrifft ${zn('wa_k_krank')} von ${zn('wa_k_von')} Personen. Ein Test erkennt ${zn('wa_k_se100')} von 100 Kranken und meldet bei ${zn('wa_k_sp100')} von 100 Gesunden einen negativen Befund. Eine zufällig getestete Person hat ein positives Ergebnis. Wie wahrscheinlich ist sie krank?`,
      `Worked example: a disease affects ${zn('wa_k_krank')} in ${zn('wa_k_von')} people. A test detects ${zn('wa_k_se100')} of 100 people who are ill and gives a negative result for ${zn('wa_k_sp100')} of 100 healthy people. A randomly tested person has a positive result. How likely is that person ill?`),
    antworten: [
      a(P(`Rund ${zp('wa_k_ppv')} von 100, denn die Gesunden liefern die meisten positiven Befunde`, `About ${zp('wa_k_ppv')} in 100, since the healthy people produce most positive results`),
        P(`Bei ${zn('wa_k_N')} Personen sind ${zn('wa_k_kranke')} krank (${zn('wa_k_tp')} positiv) und ${zn('wa_k_gesunde')} gesund (${zn('wa_k_fp')} positiv): ${zn('wa_k_tp')} von ${zn('wa_k_pos')}, also ${zd('wa_k_ppv', 3)}. Wegen der kleinen Basisrate stammen die meisten positiven Befunde von Gesunden.`,
          `Among ${zn('wa_k_N')} people ${zn('wa_k_kranke')} are ill (${zn('wa_k_tp')} positive) and ${zn('wa_k_gesunde')} healthy (${zn('wa_k_fp')} positive): ${zn('wa_k_tp')} of ${zn('wa_k_pos')}, so ${ze('wa_k_ppv', 3)}. Because of the small base rate most positive results come from healthy people.`), true),
      a(P(`Rund ${zn('wa_k_se100')} von 100, denn der Test erkennt ${zn('wa_k_se100')} von 100 Kranken sehr zuverlässig`, `About ${zn('wa_k_se100')} in 100, since the test very reliably detects ${zn('wa_k_se100')} of 100 ill people`),
        P('Das ist die Sensitivität, P(positiv | krank). Gefragt ist die umgekehrte Bedingung P(krank | positiv); beide Werte werden verwechselt (Umkehrfehler).', 'That is the sensitivity, P(positive | ill). The question asks for the inverse condition P(ill | positive); the two values are confused (confusion of the inverse).')),
      a(P(`Rund ${zn('wa_k_sp100')} von 100, denn der Test liegt bei ${zn('wa_k_sp100')} von 100 Gesunden richtig aus`, `About ${zn('wa_k_sp100')} in 100, since the test is right for ${zn('wa_k_sp100')} of 100 healthy people tested`),
        P('Die Spezifität sagt, wie oft Gesunde einen negativen Befund erhalten. Wie viele der positiv Getesteten krank sind, hängt zusätzlich von der Basisrate ab.', 'The specificity tells how often healthy people get a negative result. How many of those who test positive are ill depends on the base rate as well.'))
    ],
    hilfe: ['satz-von-bayes', 'bedingte-wahrscheinlichkeit'], belege: ['wissen:altman94b-geringe-praevalenz-screening', 'wissen:med-umkehrung-bedingung', KT73, EDDY, GH]
  },
  {
    id: 'wa-krank-haeufigkeiten', thema: 'wahrscheinlichkeit', probieren: 'lernlabor/baum',
    stamm: P(`Rechenbeispiel: Derselbe Test (erkennt ${zn('wa_k_se100')} von 100 Kranken, ${zn('wa_k_sp100')} von 100 Gesunden bekommen einen negativen Befund) wird in einer Risikogruppe eingesetzt, in der ${zn('wa_k_pk2_100')} von 100 krank sind. Was gilt dort für positiv Getestete?`,
      `Worked example: the same test (detects ${zn('wa_k_se100')} of 100 ill people, ${zn('wa_k_sp100')} of 100 healthy people get a negative result) is used in a risk group in which ${zn('wa_k_pk2_100')} of 100 are ill. What holds there for those who test positive?`),
    antworten: [
      a(P(`Es sind ${zn('wa_k_tp2')} Kranke und ${zn('wa_k_fp2')} Gesunde positiv, also etwa ${zp('wa_k_ppv2')} von 100 krank`, `${zn('wa_k_tp2')} ill and ${zn('wa_k_fp2')} healthy people test positive, so about ${zp('wa_k_ppv2')} in 100 are ill`),
        P(`${zn('wa_k_kranke2')} Kranke (${zn('wa_k_tp2')} positiv), ${zn('wa_k_gesunde2')} Gesunde (${zn('wa_k_fp2')} positiv): ${zn('wa_k_tp2')} von ${zn('wa_k_pos2')}, also ${zd('wa_k_ppv2', 3)}. Gleicher Test, aber mehr Kranke unter den Getesteten; der Wert war ${zd('wa_k_ppv', 3)} bei der seltenen Krankheit.`,
          `${zn('wa_k_kranke2')} ill (${zn('wa_k_tp2')} positive), ${zn('wa_k_gesunde2')} healthy (${zn('wa_k_fp2')} positive): ${zn('wa_k_tp2')} of ${zn('wa_k_pos2')}, so ${ze('wa_k_ppv2', 3)}. Same test, but more ill people among those tested; the value was ${ze('wa_k_ppv', 3)} for the rare disease.`), true),
      a(P(`Es bleibt bei rund ${zp('wa_k_ppv')} von 100, denn der Test arbeitet unverändert genau wie zuvor`, `It stays at about ${zp('wa_k_ppv')} in 100, since the test works exactly as before`),
        P(`Sensitivität und Spezifität bleiben gleich, der Anteil Kranker unter den positiv Getesteten hängt aber von der Basisrate ab. Bei ${zn('wa_k_pk2_100')} von 100 Kranken beträgt er ${zd('wa_k_ppv2', 3)}.`,
          `Sensitivity and specificity stay the same, but the share of ill people among those who test positive depends on the base rate. With ${zn('wa_k_pk2_100')} of 100 ill it is ${ze('wa_k_ppv2', 3)}.`)),
      a(P(`Es sind rund ${zn('wa_k_se100')} von 100, denn der Test erkennt ${zn('wa_k_se100')} von 100 Kranken sicher`, `It is about ${zn('wa_k_se100')} in 100, since the test reliably detects ${zn('wa_k_se100')} of 100 ill people`),
        P(`Das verwechselt Sensitivität mit dem Anteil Kranker unter den positiv Getesteten. Von ${zn('wa_k_pos2')} positiven Befunden sind nur ${zn('wa_k_tp2')} echt.`,
          `That confuses sensitivity with the share of ill people among those who test positive. Of ${zn('wa_k_pos2')} positive results only ${zn('wa_k_tp2')} are genuine.`))
    ],
    hilfe: ['satz-von-bayes', 'totale-wahrscheinlichkeit'], belege: ['wissen:med-sens-spez-pravalenz', 'wissen:altman94b-praevalenz-beispiel', GH]
  },
  {
    id: 'wa-p-daten', thema: 'wahrscheinlichkeit',
    stamm: P(`Ein Test liefert p = ${zd('wa_p_p', 2)}. Wie ist dieser p-Wert zu lesen?`, `A test gives p = ${ze('wa_p_p', 2)}. How is this p value to be read?`),
    antworten: [
      a(P(`Gilt H0, so haben solche oder extremere Daten die Wahrscheinlichkeit ${zd('wa_p_p', 2)}`, `If H0 holds, such or more extreme data have probability ${ze('wa_p_p', 2)}`),
        P('Der p-Wert ist eine Wahrscheinlichkeit der Daten unter H0, also P(Daten | H0). Er sagt nichts darüber, wie wahrscheinlich H0 selbst ist.', 'The p value is a probability of the data under H0, that is P(data | H0). It says nothing about how probable H0 itself is.'), true),
      a(P(`Die Wahrscheinlichkeit, dass H0 zutrifft, beträgt bei diesen Daten nur ${zd('wa_p_p', 2)}`, `The probability that H0 is true, given these data, is only ${ze('wa_p_p', 2)}`),
        P('Das wäre P(H0 | Daten), die umgekehrte Bedingung. Dafür braucht es unter anderem eine Vorab-Wahrscheinlichkeit für H0 (Satz von Bayes); der p-Wert enthält sie nicht.', 'That would be P(H0 | data), the inverse condition. It needs, among other things, a prior probability of H0 (Bayes\' theorem); the p value does not contain it.')),
      a(P(`Mit Wahrscheinlichkeit ${zd('wa_p_p', 2)} sind diese Daten allein durch Zufall entstanden`, `With probability ${ze('wa_p_p', 2)} the data arose through chance alone and nothing else`),
        P('Auch das ist eine Aussage über die Erklärung statt über die Daten. Der p-Wert rechnet mit der Annahme, dass H0 und alle übrigen Modellannahmen gelten, und bewertet diese Annahme nicht.', 'That too is a statement about the explanation instead of the data. The p value computes under the assumption that H0 and all other model assumptions hold, and does not rate that assumption.'))
    ],
    hilfe: ['bedingte-wahrscheinlichkeit', 'wahrscheinlichkeit'], belege: ['wissen:wasserstein16-p-nicht-wahrscheinlichkeit', 'wissen:p-wert-definition', WL16]
  },
  {
    id: 'wa-p-bayes', thema: 'wahrscheinlichkeit',
    stamm: P('Was braucht zusätzlich zum p-Wert, wer die Wahrscheinlichkeit von H0 selbst aus den Daten wissen möchte, also P(H0 | Daten)?', 'What does someone need in addition to the p value who wants the probability of H0 itself from the data, that is P(H0 | data)?'),
    antworten: [
      a(P('Vorab-Wahrscheinlichkeit für H0 und Daten-Wahrscheinlichkeit unter der Alternative (Satz von Bayes)', 'A prior probability of H0 and the probability of the data under the alternative (Bayes\' theorem)'),
        P('Wie bei der seltenen Krankheit braucht die Umkehrung zwei Angaben: die Basisrate (wie plausibel H0 vorab war) und wie oft solche Daten unter der Alternative vorkommen (dort: die Positiven unter den Kranken).', 'As with the rare disease, the inverse needs two inputs: the base rate (how plausible H0 was beforehand) and how often such data occur under the alternative (there: the positives among the ill).'), true),
      a(P('Weiter nichts, denn P(H0 | Daten) ergibt sich als 1 minus p, wenn der Test sauber gerechnet ist', 'Nothing more, since P(H0 | data) equals 1 minus p when the test has been computed cleanly'),
        P('1 minus p gehört zur Bedingung H0, nicht zu den Daten. Es ist die Wahrscheinlichkeit weniger extremer Daten, falls H0 gilt, und vertauscht Ereignis und Bedingung.', '1 minus p belongs to the condition H0, not to the data. It is the probability of less extreme data if H0 holds, and swaps event and condition.')),
      a(P('Nur mehr Daten, denn bei genügend großer Stichprobe stimmen P(H0 | Daten) und p überein', 'Only more data, since with a large enough sample P(H0 | data) and p agree'),
        P('Auch bei sehr großem n bleiben P(Daten | H0) und P(H0 | Daten) verschiedene Größen; die Basisrate fehlt weiterhin.', 'Even with a very large n, P(data | H0) and P(H0 | data) remain different quantities; the base rate is still missing.'))
    ],
    hilfe: ['satz-von-bayes', 'bedingte-wahrscheinlichkeit'], belege: ['wissen:cohen94-inverse-wahrscheinlichkeit', 'wissen:wasserstein16-p-nicht-wahrscheinlichkeit', WL16]
  },
  {
    id: 'wa-spieler', thema: 'wahrscheinlichkeit',
    stamm: P(`Eine faire Münze zeigte ${zn('wa_s_folge')}-mal hintereinander Kopf. Wie groß ist die Wahrscheinlichkeit für Kopf im nächsten Wurf?`, `A fair coin showed heads ${zn('wa_s_folge')} times in a row. How large is the probability of heads on the next throw?`),
    antworten: [
      a(P(`Weiterhin ${zd('wa_s_p', 1)}, denn die Würfe sind unabhängig, die Münze hat kein Gedächtnis`, `Still ${ze('wa_s_p', 1)}, since the throws are independent, the coin has no memory`),
        P(`Bei Unabhängigkeit ändert die Vorgeschichte nichts: P(Kopf | ${zn('wa_s_folge')}-mal Kopf) = P(Kopf) = ${zd('wa_s_p', 1)}. Der Glaube an einen Ausgleich heißt Spielerfehlschluss.`,
          `Under independence the history changes nothing: P(heads | ${zn('wa_s_folge')} times heads) = P(heads) = ${ze('wa_s_p', 1)}. Believing in a compensation is called the gambler's fallacy.`), true),
      a(P(`Unter ${zd('wa_s_p', 1)}, denn jetzt ist Zahl an der Reihe, um die Folge wieder auszugleichen`, `Below ${ze('wa_s_p', 1)}, since now tails is due in order to even out the sequence`),
        P('Das ist der Spielerfehlschluss. Die Münze „weiß“ nichts von früheren Würfen; ein Ausgleich findet im nächsten Wurf nicht statt.', 'That is the gambler\'s fallacy. The coin "knows" nothing of earlier throws; no compensation takes place on the next throw.')),
      a(P(`Über ${zd('wa_s_p', 1)}, denn Kopf läuft gerade und die Serie setzt sich wahrscheinlich fort`, `Above ${ze('wa_s_p', 1)}, since heads is running and the streak is likely to continue`),
        P('Bei einer fairen Münze folgt aus einer Serie nichts für den nächsten Wurf. Auch die Annahme einer „heißen Serie“ ist ein Fehlschluss.', 'With a fair coin a streak implies nothing for the next throw. The assumption of a "hot streak" is a fallacy as well.'))
    ],
    hilfe: ['unabhaengigkeit', 'wahrscheinlichkeit'], belege: [TK71]
  },
  {
    id: 'wa-gzz', thema: 'wahrscheinlichkeit',
    stamm: P(`Rechenbeispiel: Die Wahrscheinlichkeit, dass eine faire Münze mindestens ${zp('wa_z_anteil')} Prozent Kopf zeigt, beträgt bei ${zn('wa_z_klein')} Würfen ${zd('wa_z_p10', 3)}, bei ${zn('wa_z_gross')} Würfen ${zd('wa_z_p100', 3)}. Wie ist der Unterschied zu deuten?`,
      `Worked example: the probability that a fair coin shows at least ${zp('wa_z_anteil')} percent heads is ${ze('wa_z_p10', 3)} for ${zn('wa_z_klein')} throws and ${ze('wa_z_p100', 3)} for ${zn('wa_z_gross')} throws. How is the difference to be read?`),
    antworten: [
      a(P(`Bei wenigen Würfen weicht der Anteil eher stark von ${zd('wa_s_p', 1)} ab, bei vielen nähert er sich ${zd('wa_s_p', 1)} an`, `With few throws the share tends to depart strongly from ${ze('wa_s_p', 1)}, with many it approaches ${ze('wa_s_p', 1)}`),
        P('Kleine Stichproben streuen stärker. Wer glaubt, auch eine kurze Reihe müsse dem Verhältnis der Münze entsprechen, unterschätzt das (Gesetz der kleinen Zahlen). Das Gesetz der großen Zahlen gilt für den Anteil bei wachsender Zahl der Würfe.', 'Small samples vary more. Whoever believes that even a short series must match the ratio of the coin underestimates this (law of small numbers). The law of large numbers holds for the share as the number of throws grows.'), true),
      a(P('Bei mehr Würfen gleicht die Münze einen Kopf-Überschuss aus, indem sie danach häufiger Zahl zeigt', 'With more throws the coin evens out a surplus of heads by showing tails more often afterwards'),
        P(`Einen Ausgleich gibt es nicht, jeder Wurf ist unabhängig. Der Anteil nähert sich ${zd('wa_s_p', 1)}, weil frühe Abweichungen in der wachsenden Zahl von Würfen an Gewicht verlieren.`, `There is no compensation, each throw is independent. The share approaches ${ze('wa_s_p', 1)} because early deviations lose weight in the growing number of throws.`)),
      a(P(`Bei ${zn('wa_z_gross')} Würfen ist die Münze fairer als bei ${zn('wa_z_klein')} Würfen, weil sie öfter geworfen wird`, `With ${zn('wa_z_gross')} throws the coin is fairer than with ${zn('wa_z_klein')} throws, because it is thrown more often`),
        P('Die Münze ist in beiden Reihen gleich fair. Nur die Streuung des Anteils unterscheidet sich mit der Zahl der Würfe.', 'The coin is equally fair in both series. Only the spread of the share differs with the number of throws.'))
    ],
    hilfe: ['wahrscheinlichkeit', 'unabhaengigkeit'], belege: [TK71]
  }
];
