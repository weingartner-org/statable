/**
 * Sätze, APA-Zeilen und Tabellen zu McNemar-Test und Cochran-Q (Fachblatt Welle 2, Paket C, G5); Zahlen: mcnemarcochran.ts, Ja/Nein-Festlegung: janein.ts.
 * Die Tabellen sind echte Tabellen (TableItem) und werden bei jedem Aufruf neu gebaut (Sprache). Nach dem JSON-Speichern ist Unendlich `null`: gelesen wird über `kein` und `?? Infinity`.
 * Odds Ratio: Statable nennt sie in Richtung der häufigeren Veränderung (immer 1 oder größer: Wechsel zu „ja“ gegenüber Wechseln zu „nein“ bzw. umgekehrt); die Rechnung b / c
 * (mcnemarcochran.ts) und ihr exaktes Intervall bleiben unverändert, nur der Kehrwert wird für die Anzeige genommen, wenn c > b ist.
 * ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { ki, proz, zitat as anfuehrung } from '../i18n/profil';
import { komma, ohneNull, pWert, kurz, unter05, type Saetze } from './ergebnis';
import { tabelle, fx, fp, fd } from './mwsaetze';
import type { McNemarE, CochranE, JaNein } from './janein';
import type { CochranPaar } from './mcnemarcochran';

const T = L;
const q = (t: string) => anfuehrung(kurz(t));
const prozent = (v: number, stellen = 0) => proz(komma(v * 100, stellen));
/** Zwei Anteile als Prozent: ganz, bei gleicher gerundeter Zahl mit einer Stelle. */
const zweiProzent = (a: number, b: number): [string, string] => (Math.round(a * 100) === Math.round(b * 100) && a !== b ? [prozent(a, 1), prozent(b, 1)] : [prozent(a), prozent(b)]);
/** „ja“ und „nein“ in Anführungszeichen: der Name der Antwort, bei 0 und 1 ohne Beschriftung die Wörter selbst. Alte Ergebnisse ohne `beschriftet` gelten als beschriftet. */
const janame = (k: JaNein) => (k.beschriftet === false ? L('ja', 'yes') : k.jaName), neinname = (k: JaNein) => (k.beschriftet === false ? L('nein', 'no') : k.neinName);
const ja = (k: JaNein) => anfuehrung(janame(k)), nein = (k: JaNein) => anfuehrung(neinname(k));
const grenze = (v: number) => (Number.isFinite(v) ? komma(v) : '∞');

/** Der Satz, der sagt, welcher Wert als „ja“ zählt (Prüfliste, Blatt): die feste Regel steht dabei, damit nichts still geraten wird. */
export function jaNeinSatz(k: JaNein): string {
  const regel = k.umgekehrt ? T('von Hand vertauscht', 'swapped by hand')
    : k.regel === 'beschriftung' ? T('nach der Beschriftung', 'by the label')
    : k.regel === 'groesser' ? T('bei Zahlen gilt der größere Wert als „ja“', 'with numbers the larger value counts as "yes"')
    : T('bei Text gilt die alphabetisch zweite Antwort als „ja“', 'with text the alphabetically second answer counts as "yes"');
  return k.beschriftet === false
    ? T(`Als „ja“ zählt der Wert ${k.jaName}, als „nein“ der Wert ${k.neinName} (${regel}).`, `The value ${k.jaName} counts as "yes" and the value ${k.neinName} as "no" (${regel}).`)
    : T(`Als „ja“ zählt ${anfuehrung(k.jaName)}, als „nein“ ${anfuehrung(k.neinName)} (${regel}).`, `${anfuehrung(k.jaName)} counts as "yes" and ${anfuehrung(k.neinName)} as "no" (${regel}).`);
}

/* ---------------------------------------------------------------- McNemar */
/** Odds Ratio in Richtung der häufigeren Veränderung. `zuJa`: Wechsel zu „ja“ sind die häufigeren (c ≥ b). */
export function orientiert(e: McNemarE): { zuJa: boolean; or: number; lo: number; hi: number } {
  const or = e.oddsRatio ?? Infinity, lo = e.kiUnten ?? 0, hi = e.kiOben ?? Infinity;
  return e.c >= e.b ? { zuJa: true, or: 1 / or, lo: 1 / hi, hi: lo === 0 ? Infinity : 1 / lo } : { zuJa: false, or, lo, hi };
}

export function saetzeMcNemar(e: McNemarE, label: (s: string) => string): Saetze {
  const v = q(label(e.vorher)), na = q(label(e.nachher)), J = ja(e.ja), N = nein(e.ja), nD = e.nDiskordant;
  const [p1, p2] = zweiProzent(e.anteilVorher, e.anteilNachher);
  const klein = e.n < 20 ? [{ text: T(`Kleine Stichprobe (n = ${e.n})`, `Small sample (n = ${e.n})`), erklaer: 'stichprobe', hinweis: true }] : [];
  const vorsicht = T('Der McNemar-Test prüft nur die Personen, die ihre Antwort geändert haben (exakter Binomialtest, ohne Näherung). Ob etwas Bestimmtes die Veränderung bewirkt hat (etwa ein Kurs), zeigen diese Daten nicht: Ohne Vergleichsgruppe können auch Übung, Zeit oder andere Einflüsse dahinterstecken.',
    'The McNemar test only looks at the people who changed their answer (exact binomial test, no approximation). These data do not show whether something specific caused the change (such as a course): without a comparison group, practice, time or other influences may be behind it.');
  if (e.kein) {
    return {
      haupt: T(`Keine Person hat die Antwort geändert: Alle ${e.n} Personen antworteten bei ${v} und ${na} gleich. Damit lässt sich kein Test rechnen.`, `No one changed their answer: all ${e.n} people answered the same at ${v} and ${na}. No test can be calculated with that.`),
      zusatz: T(`Ohne Personen, die ihre Antwort geändert haben, gibt es nichts zu testen; der Anteil ${J} liegt bei ${p1}.`, `Without people who changed their answer there is nothing to test; the share of ${J} is ${p1}.`),
      vorsicht, apa: '', marken: [{ text: T('Keine Veränderung der Antworten', 'No change in answers'), erklaer: 'gepaarte-messung' }, ...klein]
    };
  }
  const sig = (e.p ?? 1) < 0.05, o = orientiert(e);
  const verlauf = e.c > e.b ? T(`Von ${v} zu ${na} stieg der Anteil ${J} von ${p1} auf ${p2}.`, `From ${v} to ${na} the share of ${J} rose from ${p1} to ${p2}.`)
    : e.b > e.c ? T(`Von ${v} zu ${na} sank der Anteil ${J} von ${p1} auf ${p2}.`, `From ${v} to ${na} the share of ${J} fell from ${p1} to ${p2}.`)
    : T(`Von ${v} zu ${na} blieb der Anteil ${J} bei ${p1}.`, `From ${v} to ${na} the share of ${J} stayed at ${p1}.`);
  const wechsel = T(`Wechsel von ${N} zu ${J}: ${e.c}, von ${J} zu ${N}: ${e.b}`, `Changes from ${N} to ${J}: ${e.c}, from ${J} to ${N}: ${e.b}`);
  const zielWort = o.zuJa ? J : N, gegenWort = o.zuJa ? N : J;
  const kiText = ki(komma(o.lo), grenze(o.hi));
  const orSatz = e.c === e.b
    ? T(` Beide Richtungen sind gleich häufig (Odds Ratio ${komma(o.or)}, ${kiText}).`, ` Both directions are equally frequent (odds ratio ${komma(o.or)}, ${kiText}).`)
    : !Number.isFinite(o.or)
    ? T(` Es gab nur Wechsel zu ${zielWort} und keinen zu ${gegenWort} (Odds Ratio nicht endlich, ${kiText}).`, ` There were only changes to ${zielWort} and none to ${gegenWort} (odds ratio not finite, ${kiText}).`)
    : T(` Wechsel zu ${zielWort} waren ${komma(o.or)}-mal so häufig wie Wechsel zu ${gegenWort} (Odds Ratio, ${kiText}).`, ` Changes to ${zielWort} were ${komma(o.or)} times as frequent as changes to ${gegenWort} (odds ratio, ${kiText}).`);
  const zusatz = sig
    ? T(`Die Antworten haben sich verändert. ${wechsel}.${orSatz} Eine so einseitige Verteilung der Wechsel wäre selten, wenn sich in Wahrheit nichts verändert hätte (exakter Test, p ${pWert(e.p!)}).`,
      `The answers have changed. ${wechsel}.${orSatz} Changes this one-sided would be rare if nothing had truly changed (exact test, p ${pWert(e.p!)}).`)
    : T(`${wechsel}.${orSatz} Eine solche Verteilung der Wechsel kommt auch dann nicht selten vor, wenn sich in Wahrheit nichts verändert (exakter Test, p ${pWert(e.p!)}). Die Daten belegen eine Veränderung darum nicht - das heißt nicht, dass es keine gab.`,
      `${wechsel}.${orSatz} A distribution of changes like this is not unusual even if nothing has truly changed (exact test, p ${pWert(e.p!)}). So the data do not show a change - that does not mean there was none.`);
  const orApa = Number.isFinite(o.or) ? `OR = ${komma(o.or)}` : 'OR = ∞';
  /** Die APA-Zeile nennt die Richtung des OR (zwei feste Texte): zu „ja“ häufiger (c ≥ b) oder zu „nein“ häufiger. */
  const richtung = o.zuJa ? T(`Wechsel zu ${J} : Wechsel zu ${N}`, `changes to ${J} : changes to ${N}`) : T(`Wechsel zu ${N} : Wechsel zu ${J}`, `changes to ${N} : changes to ${J}`);
  return {
    haupt: verlauf, zusatz, vorsicht,
    apa: `${T('exakter McNemar-Test', 'exact McNemar test')}, p ${pWert(e.p!)}, ${orApa} (${richtung}), ${kiText}`,
    marken: [
      { text: T(`Anteil ${J}: ${p1} → ${p2}`, `Share of ${J}: ${p1} → ${p2}`), erklaer: 'gepaarte-messung' },
      { text: `p ${pWert(e.p!)} (${T('exakt', 'exact')})${unter05(sig)}`, erklaer: 'p-wert' },
      { text: `${orApa}`, erklaer: 'odds-ratio' },
      { text: T('Exakter McNemar-Test', 'Exact McNemar test'), erklaer: 'gepaarte-messung' },
      ...(nD < 10 ? [{ text: Lp(nD, `Nur ${nD} Wechsel`, `Nur ${nD} Wechsel`, `Only ${nD} change`, `Only ${nD} changes`), erklaer: 'stichprobe', hinweis: true }] : []),
      ...klein
    ]
  };
}

export function tabellenMcNemar(e: McNemarE, label: (s: string) => string): TableItem[] {
  const v = label(e.vorher), na = label(e.nachher), J = janame(e.ja), N = neinname(e.ja);
  const kreuz = tabelle('McNemar Crosstabulation', T('Vorher × nachher', 'Before × after'), [`${v} ↓ · ${na} →`, J, N, T('Summe', 'Total')],
    [[J, fd(e.a), fd(e.b), fd(e.a + e.b)], [N, fd(e.c), fd(e.d), fd(e.c + e.d)], [T('Summe', 'Total'), fd(e.a + e.c), fd(e.b + e.d), fd(e.n)]],
    [T(`b = ${J} vorher, ${N} nachher; c = ${N} vorher, ${J} nachher. Nur b und c gehen in den Test ein.`, `b = ${J} before, ${N} after; c = ${N} before, ${J} after. Only b and c enter the test.`)]);
  if (e.kein) return [kreuz];
  const o = orientiert(e);
  const test = tabelle('McNemar Test', T('McNemar-Test (exakt)', 'McNemar test (exact)'),
    [T(`Anteil ${J} vorher`, `Share of ${J} before`), T(`Anteil ${J} nachher`, `Share of ${J} after`), 'n', 'b', 'c', T('p (exakt)', 'p (exact)'), 'OR', T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')],
    [[prozent(e.anteilVorher, 1), prozent(e.anteilNachher, 1), fd(e.n), fd(e.b), fd(e.c), fp(e.p!), Number.isFinite(o.or) ? fx(o.or) : '∞', fx(o.lo), Number.isFinite(o.hi) ? fx(o.hi) : '∞']],
    [T('Exakter Binomialtest der b + c Paare, die sich geändert haben, zweiseitig (wie PSPP NPAR TESTS /MCNEMAR, ohne χ²-Näherung und ohne Stetigkeitskorrektur); p höchstens 1. R mcnemar.test rechnet dagegen χ² mit Stetigkeitskorrektur, darum weichen die p-Werte dort ab.',
      'Exact binomial test of the b + c pairs that changed, two-sided (as PSPP NPAR TESTS /MCNEMAR, no χ² approximation and no continuity correction); p at most 1. R mcnemar.test uses χ² with a continuity correction instead, so its p values differ.'),
    o.zuJa ? T(`OR = c / b: Wechsel zu ${J} im Verhältnis zu Wechseln zu ${N}, mit exaktem 95 %-KI (Clopper-Pearson der Wechsel-Anteile, als Odds).`, `OR = c / b: changes to ${J} relative to changes to ${N}, with exact 95% CI (Clopper-Pearson of the change proportions, as odds).`)
      : T(`OR = b / c: Wechsel zu ${N} im Verhältnis zu Wechseln zu ${J}, mit exaktem 95 %-KI (Clopper-Pearson der Wechsel-Anteile, als Odds).`, `OR = b / c: changes to ${N} relative to changes to ${J}, with exact 95% CI (Clopper-Pearson of the change proportions, as odds).`)]);
  return [kreuz, test];
}

/* ---------------------------------------------------------------- Cochran-Q */
/** Das Paar, in Richtung „nach liegt höher / niedriger als von“ als Satzteil. */
const paarLage = (p: CochranPaar, J: string, name: (n: string) => string) =>
  p.c > p.b ? T(`${name(p.nach)} hat mehr ${J} als ${name(p.von)}`, `${name(p.nach)} has more ${J} than ${name(p.von)}`) : T(`${name(p.nach)} hat weniger ${J} als ${name(p.von)}`, `${name(p.nach)} has less ${J} than ${name(p.von)}`);

export function saetzeCochran(e: CochranE, label: (s: string) => string): Saetze {
  const J = ja(e.ja), N = nein(e.ja), k = e.k, sig = e.p < 0.05;
  const ix = e.anteile.map((_, i) => i).sort((a, b) => e.anteile[b]! - e.anteile[a]!), hoch = ix[0]!, tief = ix.at(-1)!;
  const nm = (n: string) => q(label(n));
  const sigPaare = e.paare.filter(p => p.pHolm !== null && p.pHolm < 0.05), m = e.paare.filter(p => p.p !== null).length;
  const haupt = e.anteile[hoch] === e.anteile[tief]
    ? T(`Der Anteil ${J} lag zu allen ${k} Zeitpunkten bei ${prozent(e.anteile[hoch]!)}.`, `The share of ${J} was ${prozent(e.anteile[hoch]!)} at all ${k} time points.`)
    : T(`Der Anteil ${J} lag je nach Zeitpunkt zwischen ${prozent(e.anteile[tief]!)} (${nm(e.spalten[tief]!)}) und ${prozent(e.anteile[hoch]!)} (${nm(e.spalten[hoch]!)}).`,
      `The share of ${J} ranged from ${prozent(e.anteile[tief]!)} (${nm(e.spalten[tief]!)}) to ${prozent(e.anteile[hoch]!)} (${nm(e.spalten[hoch]!)}) across the time points.`);
  const paare = !sig ? '' : sigPaare.length === 0
    ? T(` Nach den Paarvergleichen (McNemar exakt, Holm-angepasst) ist kein einzelnes Paar von Zeitpunkten signifikant verschieden.`, ` After the pairwise comparisons (exact McNemar, Holm-adjusted), no single pair of time points differs significantly.`)
    : sigPaare.length <= 3
      ? T(` Nach den Paarvergleichen (McNemar exakt, Holm-angepasst für alle ${m} Paare) unterscheiden sich signifikant: ${sigPaare.map(p => paarLage(p, J, nm)).join('; ')}.`, ` After the pairwise comparisons (exact McNemar, Holm-adjusted for all ${m} pairs), these differ significantly: ${sigPaare.map(p => paarLage(p, J, nm)).join('; ')}.`)
      : T(` Nach den Paarvergleichen (McNemar exakt, Holm-angepasst für alle ${m} Paare) unterscheiden sich ${sigPaare.length} von ${m} Paaren signifikant (Tabelle).`, ` After the pairwise comparisons (exact McNemar, Holm-adjusted for all ${m} pairs), ${sigPaare.length} of ${m} pairs differ significantly (table).`);
  const zusatz = (sig
    ? T(`Der Anteil ${J} unterscheidet sich zwischen den Zeitpunkten. Ein so großer Unterschied wäre selten, wenn sich in Wahrheit nichts verändert hätte (Cochran-Q, p ${pWert(e.p)}).`,
      `The share of ${J} differs between the time points. A difference this large would be rare if nothing had truly changed (Cochran's Q, p ${pWert(e.p)}).`)
    : T(`Die Unterschiede im Anteil ${J} kommen auch dann nicht selten vor, wenn sich in Wahrheit nichts verändert (Cochran-Q, p ${pWert(e.p)}). Die Daten belegen eine Veränderung darum nicht - das heißt nicht, dass es keine gab.`,
      `Differences in the share of ${J} are not unusual even if nothing has truly changed (Cochran's Q, p ${pWert(e.p)}). So the data do not show a change - that does not mean there was none.`)) + paare;
  const vorsicht = T(`Cochran-Q prüft, ob sich der Anteil ${J} über die ${k} Zeitpunkte bei denselben Personen verändert; es zählen nur Personen mit Angaben zu allen Zeitpunkten. Personen, die immer ${J} oder immer ${N} antworten, tragen nichts bei. Ob etwas Bestimmtes die Veränderung bewirkt hat, zeigen diese Daten nicht.`,
    `Cochran's Q tests whether the share of ${J} changes over the ${k} time points for the same people; only people with answers at all time points count. People who always answer ${J} or always ${N} contribute nothing. These data do not show whether something specific caused the change.`);
  const apaPaare = !sig ? '' : sigPaare.length === 0 ? `; McNemar (Holm): ${T('kein Paar mit p < ,05', 'no pair with p < .05')}`
    : sigPaare.length <= 4 ? `; McNemar (Holm): ${sigPaare.map(p => `${kurz(label(p.nach), 20)} - ${kurz(label(p.von), 20)} (p ${pWert(p.pHolm!)})`).join(', ')}`
      : `; McNemar (Holm): ${T(`${sigPaare.length} von ${m} Paaren mit p < ,05`, `${sigPaare.length} of ${m} pairs with p < .05`)}`;
  return {
    haupt, zusatz, vorsicht,
    apa: `Q(${e.df}) = ${komma(e.q)}, p ${pWert(e.p)}${apaPaare}`,
    marken: [
      { text: T(`Anteil ${J}: ${prozent(e.anteile[tief]!)} bis ${prozent(e.anteile[hoch]!)}`, `Share of ${J}: ${prozent(e.anteile[tief]!)} to ${prozent(e.anteile[hoch]!)}`), erklaer: 'gepaarte-messung' },
      { text: `Q(${e.df}) = ${komma(e.q)}, p ${pWert(e.p)}${unter05(sig)}`, erklaer: 'p-wert' },
      { text: T('Cochran-Q-Test', "Cochran's Q test"), erklaer: 'gepaarte-messung' },
      ...(sig ? [{ text: T('Paarvergleiche: McNemar mit Holm', 'Pairwise comparisons: McNemar with Holm'), erklaer: 'paarvergleich' }] : []),
      ...(e.n < 20 ? [{ text: T(`Kleine Stichprobe (n = ${e.n})`, `Small sample (n = ${e.n})`), erklaer: 'stichprobe', hinweis: true }] : [])
    ]
  };
}

export function tabellenCochran(e: CochranE, label: (s: string) => string): TableItem[] {
  const J = janame(e.ja), sig = e.p < 0.05, nm = (n: string) => label(n);
  const haeuf = tabelle('Cochran Frequencies', T('Häufigkeiten je Zeitpunkt', 'Frequencies by time point'), [T('Zeitpunkt', 'Time point'), T(`n ${J}`, `n ${J}`), T(`Anteil ${J}`, `Share of ${J}`)],
    e.spalten.map((s, i) => [nm(s), fd(e.spaltensummen[i]!), prozent(e.anteile[i]!, 1)]),
    [T(`Anteil an den ${e.n} Personen mit Angaben zu allen Zeitpunkten. ${jaNeinSatz(e.ja)}`, `Share of the ${e.n} people with answers at all time points. ${jaNeinSatz(e.ja)}`)]);
  const test = tabelle('Cochran Q Test', T('Cochran-Q-Test', "Cochran's Q test"), ['n', 'Q', 'df', 'p'], [[fd(e.n), fx(e.q), fd(e.df), fp(e.p)]],
    [T('Q = (k − 1) (k ΣC² − N²) / (k N − ΣR²), χ²-verteilt mit df = Zeitpunkte − 1 (wie PSPP NPAR TESTS /COCHRAN und R rstatix::cochran_qtest). C = Summe je Zeitpunkt, R = Summe je Person, N = alle Einsen.',
      'Q = (k − 1) (k ΣC² − N²) / (k N − ΣR²), χ²-distributed with df = time points − 1 (as PSPP NPAR TESTS /COCHRAN and R rstatix::cochran_qtest). C = sum per time point, R = sum per person, N = all ones.')]);
  const gueltig = e.paare.filter(p => p.p !== null);
  const paare = sig ? [tabelle('McNemar Pairwise', T('Paarvergleiche (McNemar exakt, Holm)', 'Pairwise comparisons (exact McNemar, Holm)'), [T('Vergleich', 'Comparison'), 'b', 'c', T('p (unangepasst)', 'p (unadjusted)'), 'p (Holm)'],
    e.paare.map(p => [`${nm(p.nach)} - ${nm(p.von)}`, fd(p.b), fd(p.c), p.p === null ? '-' : fp(p.p), p.pHolm === null ? '-' : fp(p.pHolm)]),
    [T(`b = früher ${J}, später nicht; c = früher nicht, später ${J}. Exakter Binomialtest der Paare, die sich geändert haben; die p-Werte sind nach Holm für die ${gueltig.length} Paare mit Test angepasst. Paare ohne Wechsel haben keinen Test.`,
      `b = ${J} earlier, not later; c = not earlier, ${J} later. Exact binomial test of the pairs that changed; the p values are Holm-adjusted for the ${gueltig.length} pairs with a test. Pairs without a change have no test.`)])] : [];
  return [haeuf, test, ...paare];
}
