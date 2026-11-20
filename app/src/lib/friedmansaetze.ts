/**
 * Sätze, APA-Zeile und Tabellen zum Friedman-Test (Fachblatt Welle 2, Paket C, G5); Zahlen: friedman.ts. Der Friedman-Test ist das Rangtest-Angebot der Frage
 * „Verändert sich etwas über mehrere Zeitpunkte?“ (wie Wilcoxon bei zwei Messungen), er steht im Ergebnis wie die anderen Rangtests (`blatt.rang`, rangsaetze.ts).
 * Kendalls W = χ² / (n (k − 1)): Übereinstimmung der Rangfolge der Zeitpunkte über die Personen (0 bis 1), nicht zu verwechseln mit Cohens Kappa.
 * Faustregel für W wie für r (Cohen 1992; Tomczak & Tomczak 2014): ,1 klein, ,3 mittel, ,5 groß. ⚠ Satzvorlagen und Faustregel von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { zitat as anfuehrung } from '../i18n/profil';
import { komma, ohneNull, pWert, kurz, unter05, angezeigt, type Saetze } from './ergebnis';
import { tabelle, fx, fp, fd } from './mwsaetze';
import type { Friedman, FriedmanPaar } from './friedman';
import { EXAKT_UNTER } from './exakteTests';

const T = L;
const q = (t: string) => anfuehrung(kurz(t));
const md = (v: number) => komma(v, Number.isInteger(v) ? 0 : 1);

/** Wirkungsstärke von Kendalls W (,1 / ,3 / ,5), am angezeigten Wert. */
export function wWort(w: number): string {
  const a = angezeigt(Math.abs(w));
  return a < 0.1 ? L('sehr klein', 'very small') : a < 0.3 ? L('klein', 'small') : a < 0.5 ? L('mittelgroß', 'medium-sized') : L('groß', 'large');
}

export function saetzeFriedman(e: Friedman, label: (s: string) => string): Saetze {
  const nm = (i: number) => q(label(e.zeitpunkte[i]!)), k = e.k;
  if (e.kein) {
    return {
      haupt: T('Alle Personen haben zu allen Zeitpunkten denselben Wert. Damit lässt sich kein Test rechnen.', 'Everyone has the same value at all time points. No test can be calculated with that.'),
      zusatz: '', vorsicht: '', apa: '', marken: [{ text: T('Rangtest (ohne Normalverteilung)', 'Rank test (no normal distribution)'), erklaer: 'rangtest' }]
    };
  }
  const sig = e.p < 0.05, wort = wWort(e.kendallW);
  const ix = e.mittlereRaenge.map((_, i) => i).sort((a, b) => e.mittlereRaenge[b]! - e.mittlereRaenge[a]!), hoch = ix[0]!, tief = ix.at(-1)!;
  const haupt = e.mittlereRaenge[hoch] === e.mittlereRaenge[tief]
    ? T(`Im Rangvergleich lagen die Werte zu allen ${k} Zeitpunkten gleich hoch.`, `On the rank comparison the values were equally high at all ${k} time points.`)
    : T(`Im Rangvergleich lagen die Werte bei ${nm(hoch)} am höchsten (mittlerer Rang ${komma(e.mittlereRaenge[hoch]!, 2)}, Median ${md(e.mediane[hoch]!)}), bei ${nm(tief)} am niedrigsten (mittlerer Rang ${komma(e.mittlereRaenge[tief]!, 2)}, Median ${md(e.mediane[tief]!)}).`,
      `On the rank comparison the values were highest at ${nm(hoch)} (mean rank ${komma(e.mittlereRaenge[hoch]!, 2)}, median ${md(e.mediane[hoch]!)}) and lowest at ${nm(tief)} (mean rank ${komma(e.mittlereRaenge[tief]!, 2)}, median ${md(e.mediane[tief]!)}).`);
  const mit = e.paare.filter(p => p.p !== null), m = mit.length, sigPaare = e.paare.filter(p => p.pHolm !== null && p.pHolm < 0.05);
  const lage = (p: FriedmanPaar) => (p.vPlus > p.vMinus ? T(`${nm(p.j)} liegt über ${nm(p.i)}`, `${nm(p.j)} is above ${nm(p.i)}`) : T(`${nm(p.j)} liegt unter ${nm(p.i)}`, `${nm(p.j)} is below ${nm(p.i)}`));
  const paare = !sig ? '' : m === 0 ? '' : sigPaare.length === 0
    ? T(' Nach den Paarvergleichen (Wilcoxon, Holm-angepasst) ist kein einzelnes Paar von Zeitpunkten signifikant verschieden.', ' After the pairwise comparisons (Wilcoxon, Holm-adjusted), no single pair of time points differs significantly.')
    : sigPaare.length <= 3
      ? T(` Nach den Paarvergleichen (Wilcoxon, Holm-angepasst für alle ${m} Paare) unterscheiden sich signifikant: ${sigPaare.map(lage).join('; ')}.`, ` After the pairwise comparisons (Wilcoxon, Holm-adjusted for all ${m} pairs), these differ significantly: ${sigPaare.map(lage).join('; ')}.`)
      : T(` Nach den Paarvergleichen (Wilcoxon, Holm-angepasst für alle ${m} Paare) unterscheiden sich ${sigPaare.length} von ${m} Paaren signifikant (Tabelle).`, ` After the pairwise comparisons (Wilcoxon, Holm-adjusted for all ${m} pairs), ${sigPaare.length} of ${m} pairs differ significantly (table).`);
  const zusatz = (sig
    ? T(`Die Werte verändern sich über die Zeitpunkte; der Effekt ist ${wort} (Kendalls W = ${ohneNull(e.kendallW)}, nach üblicher Faustregel). Ein mindestens so großer Rangunterschied wäre selten, wenn sich in Wahrheit nichts verändert hätte (p ${pWert(e.p)}).`,
      `The values change across the time points; the effect is ${wort} (Kendall's W = ${ohneNull(e.kendallW)}, by a common rule of thumb). A rank difference at least this large would be rare if nothing had truly changed (p ${pWert(e.p)}).`)
    : T(`Die Unterschiede zwischen den Zeitpunkten sind ${wort} (Kendalls W = ${ohneNull(e.kendallW)}) und kommen auch dann nicht selten vor, wenn sich in Wahrheit nichts verändert (p ${pWert(e.p)}). Die Daten belegen eine Veränderung darum nicht - das heißt nicht, dass es keine gab.`,
      `The differences between the time points are ${wort} (Kendall's W = ${ohneNull(e.kendallW)}) and are not unusual even if nothing has truly changed (p ${pWert(e.p)}). So the data do not show a change - that does not mean there was none.`)) + paare;
  const vorsicht = T('Der Friedman-Test braucht keine normalverteilten Werte. Er vergleicht Ränge innerhalb jeder Person und zeigt nicht allein Unterschiede der Mediane. Kendalls W misst, wie einheitlich die Personen die Zeitpunkte ordnen (0 bis 1), und ist etwas anderes als Cohens Kappa. Ob etwas Bestimmtes die Veränderung bewirkt hat, zeigen diese Daten nicht.',
    'The Friedman test does not need normally distributed values. It compares ranks within each person and does not show differences in medians alone. Kendall\'s W measures how consistently the people order the time points (0 to 1) and is something different from Cohen\'s kappa. These data do not show whether something specific caused the change.');
  const apaPaare = !sig || m === 0 ? '' : sigPaare.length === 0 ? `; Wilcoxon (Holm): ${T('kein Paar mit p < ,05', 'no pair with p < .05')}`
    : sigPaare.length <= 4 ? `; Wilcoxon (Holm): ${sigPaare.map(p => `${kurz(label(e.zeitpunkte[p.j]!), 20)} - ${kurz(label(e.zeitpunkte[p.i]!), 20)} (p ${pWert(p.pHolm!)})`).join(', ')}`
      : `; Wilcoxon (Holm): ${T(`${sigPaare.length} von ${m} Paaren mit p < ,05`, `${sigPaare.length} of ${m} pairs with p < .05`)}`;
  return {
    haupt, zusatz, vorsicht,
    apa: `χ²(${e.df}) = ${komma(e.chi2)}, p ${pWert(e.p)}, ${T('Kendalls W', "Kendall's W")} = ${ohneNull(e.kendallW)}${apaPaare}`,
    marken: [
      { text: `${T('Veränderung', 'Change')}: ${wort} · W = ${ohneNull(e.kendallW)}`, erklaer: 'rangtest' },
      { text: `p ${pWert(e.p)}${unter05(sig)}`, erklaer: 'p-wert' },
      { text: T('Rangtest (ohne Normalverteilung)', 'Rank test (no normal distribution)'), erklaer: 'rangtest' },
      ...(sig && m ? [{ text: T('Paarvergleiche: Wilcoxon mit Holm', 'Pairwise comparisons: Wilcoxon with Holm'), erklaer: 'paarvergleich' }] : []),
      ...(e.n < 20 ? [{ text: T(`Kleine Stichprobe (n = ${e.n})`, `Small sample (n = ${e.n})`), erklaer: 'stichprobe', hinweis: true }] : [])
    ]
  };
}

export function tabellenFriedman(e: Friedman, label: (s: string) => string): TableItem[] {
  const nm = (i: number) => label(e.zeitpunkte[i]!);
  const raenge = tabelle('Ranks', T('Ränge und Mediane', 'Ranks and medians'), [T('Zeitpunkt', 'Time point'), 'n', 'Mdn', T('Mittlerer Rang', 'Mean rank'), T('Rangsumme', 'Sum of ranks')],
    e.zeitpunkte.map((_, i) => [nm(i), fd(e.n), fx(e.mediane[i]!, 2), fx(e.mittlereRaenge[i]!, 2), fx(e.rangsummen[i]!, 1)]),
    [T('Mdn = Median. Die Ränge entstehen innerhalb jeder Person über die Zeitpunkte; gleiche Werte bekommen den mittleren Rang.', 'Mdn = median. Ranks are formed within each person across the time points; equal values get the mean rank.')]);
  if (e.kein) return [raenge];
  const test = tabelle('Friedman Test', T('Friedman-Test', 'Friedman test'), ['n', 'χ²', 'df', 'p', T('Kendalls W', "Kendall's W")], [[fd(e.n), fx(e.chi2), fd(e.df), fp(e.p), fx(e.kendallW)]],
    [T('χ²-verteilt mit df = Zeitpunkte − 1, mit Bindungskorrektur innerhalb der Personen (wie PSPP NPAR TESTS /FRIEDMAN und R friedman.test). Kendalls W = χ² / (n (k − 1)) (wie PSPP /KENDALL und R rstatix::friedman_effsize).', 'χ²-distributed with df = time points − 1, with tie correction within people (as PSPP NPAR TESTS /FRIEDMAN and R friedman.test). Kendall\'s W = χ² / (n (k − 1)) (as PSPP /KENDALL and R rstatix::friedman_effsize).')]);
  const mit = e.paare.filter(p => p.p !== null);
  const paare = e.p < 0.05 && mit.length ? [tabelle('Wilcoxon Pairwise', T('Paarvergleiche (Wilcoxon gepaart, Holm)', 'Pairwise comparisons (paired Wilcoxon, Holm)'), [T('Vergleich', 'Comparison'), T('n im Test', 'n in test'), 'V⁺', 'V⁻', T('p (unangepasst)', 'p (unadjusted)'), 'p (Holm)'],
    e.paare.map(p => [`${nm(p.j)} - ${nm(p.i)}`, fd(p.nTest), fx(p.vPlus, 1), fx(p.vMinus, 1), p.p === null ? '-' : fp(p.p), p.pHolm === null ? '-' : fp(p.pHolm)]),
    [T(`Veränderung = später − früher; V⁺ = Rangsumme der Anstiege. Wilcoxon-Test für gepaarte Werte: Paare ohne Unterschied entfallen vor dem Ranken; bei weniger als ${EXAKT_UNTER} Paaren im Test exakt, sonst Normalnäherung. Die p-Werte sind nach Holm für die ${mit.length} Paare mit Test angepasst. Weniger als 2 Paare mit Unterschied: kein Test.`,
      `Change = later − earlier; V⁺ = sum of ranks of the increases. Wilcoxon test for paired values: pairs without a difference are dropped before ranking; exact with fewer than ${EXAKT_UNTER} pairs in the test, otherwise normal approximation. The p values are Holm-adjusted for the ${mit.length} pairs with a test. Fewer than 2 pairs with a difference: no test.`)])] : [];
  return [raenge, test, ...paare];
}
