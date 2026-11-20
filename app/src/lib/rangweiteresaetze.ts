/**
 * Sätze, APA-Zeilen, Marken und Tabellen zu den weiteren Rangtests (Später, Welle S-B, Teil 3): Vorzeichentest, Mediantest, Jonckheere-Terpstra, Kolmogorov-Smirnov.
 * Zahlen: rangweitere.ts, Ergebnisse des Blatts: rangweitereblatt.ts. Quellen der Formulierungen: Fachblatt SPAETER-B-OPTIONEN.md Abschnitt 3 und „Entscheidungen Opus“.
 * ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L, Lp, d } from './sitzung.svelte';
import { zitat } from '../i18n/profil';
import { komma, ohneNull, pWert, kurz, unter05, type Saetze } from './ergebnis';
import { fd, fp, fx, tabelle, type Z } from './mwsaetze';
import { rangWeitereText } from './rangweitere';
import type { JonckheereE, KsE, MedianE, VorzeichenE, WeitereErgebnis } from './rangweitereblatt';

const T = L;
const q = (x: string) => zitat(kurz(x));
const md = (v: number) => komma(v, Number.isInteger(v) ? 0 : 1);
const prozent = (v: number) => komma(v * 100, 0) + ' %';
const rangMarke = () => ({ text: T('Rangtest (ohne Normalverteilung)', 'Rank test (no normal distribution)'), erklaer: 'rangtest' });

export function weitereName(r: WeitereErgebnis): string {
  return r.art === 'vorzeichen' ? T('Vorzeichentest', 'Sign test') : r.art === 'median' ? T('Mediantest', 'Median test') : r.art === 'jt' ? 'Jonckheere-Terpstra-Test' : T('Kolmogorov-Smirnov-Test (zwei Stichproben)', 'Kolmogorov-Smirnov test (two samples)');
}
/* ===================================================================================================================== Vorzeichentest */
export function saetzeVorzeichen(e: VorzeichenE, label: (s: string) => string): Saetze {
  const r = e.r, v = q(label(e.vorher)), na = q(label(e.nachher));
  const marken = [{ text: T('Vorzeichentest (exakt)', 'Sign test (exact)'), erklaer: 'rangtest' }, rangMarke()];
  if (r.grund === 'keinUnterschied') return { haupt: rangWeitereText('keinUnterschied'), zusatz: '', vorsicht: '', apa: '', marken };
  const p = r.pZwei!, sig = p < 0.05, n = r.n;
  const haupt = r.plus === r.minus
    ? T(`Bei ${r.plus} von ${n} Paaren mit Unterschied lag ${na} höher als ${v}, bei ${r.minus} niedriger: Anstiege und Rückgänge halten sich genau die Waage.`, `In ${r.plus} of ${n} pairs with a difference ${na} was higher than ${v} and in ${r.minus} it was lower: increases and decreases balance exactly.`)
    : T(`Bei ${r.plus} von ${n} Paaren mit Unterschied lag ${na} höher als ${v}, bei ${r.minus} niedriger.`, `In ${r.plus} of ${n} pairs with a difference ${na} was higher than ${v} and in ${r.minus} it was lower.`);
  const hoch = r.plus > r.minus;
  const nullSatz = r.nullen ? ' ' + Lp(r.nullen, `${r.nullen} Paar ohne Unterschied geht nicht in den Test ein.`, `${r.nullen} Paare ohne Unterschied gehen nicht in den Test ein.`, `${r.nullen} pair without a difference is not included in the test.`, `${r.nullen} pairs without a difference are not included in the test.`) : '';
  const wenig = r.grund === 'einPaar' ? ' ' + rangWeitereText('einPaar') : '';
  const zusatz = (sig
    ? (hoch
      ? T(`Die Veränderungen gehen eher nach oben. Wären Anstieg und Rückgang gleich wahrscheinlich, käme eine so einseitige Verteilung selten vor (Vorzeichentest, exakt, p ${pWert(p)}).`,
        `The changes tend to go upwards. If increase and decrease were equally likely, a split this one-sided would be rare (sign test, exact, p ${pWert(p)}).`)
      : T(`Die Veränderungen gehen eher nach unten. Wären Anstieg und Rückgang gleich wahrscheinlich, käme eine so einseitige Verteilung selten vor (Vorzeichentest, exakt, p ${pWert(p)}).`,
        `The changes tend to go downwards. If increase and decrease were equally likely, a split this one-sided would be rare (sign test, exact, p ${pWert(p)}).`))
    : T(`Eine solche Verteilung von Anstiegen und Rückgängen kommt auch dann nicht selten vor, wenn beide gleich wahrscheinlich sind (Vorzeichentest, exakt, p ${pWert(p)}). Die Daten belegen eine Richtung der Veränderung darum nicht - das heißt nicht, dass es keine gibt.`,
      `A split of increases and decreases like this is not unusual even if both are equally likely (sign test, exact, p ${pWert(p)}). So the data do not show a direction of change - that does not mean there is none.`)) + nullSatz + wenig;
  const vorsicht = T('Der Vorzeichentest zählt nur die Richtung der Veränderung, nicht ihre Größe; er ist darum schwächer als der Wilcoxon-Test. Er prüft, ob Anstiege und Rückgänge gleich wahrscheinlich sind, und sagt nichts über das Ausmaß. Ob etwas Bestimmtes die Veränderung bewirkt hat, zeigen diese Daten nicht.',
    'The sign test counts only the direction of the change, not its size, and is therefore weaker than the Wilcoxon test. It tests whether increases and decreases are equally likely and says nothing about the extent. These data do not show whether something specific caused the change.');
  return {
    haupt, zusatz, vorsicht,
    apa: T(`Vorzeichentest (exakt), p ${pWert(p)}; bei ${r.plus} von ${n} Paaren mit Unterschied war der Wert nachher höher`, `Sign test (exact), p ${pWert(p)}; in ${r.plus} of ${n} pairs with a difference the value was higher afterwards`)
      + (r.nullen ? ', ' + Lp(r.nullen, `${r.nullen} Paar ohne Unterschied`, `${r.nullen} Paare ohne Unterschied`, `${r.nullen} pair without a difference`, `${r.nullen} pairs without a difference`) : ''),
    marken: [
      { text: T(`${r.plus} höher, ${r.minus} niedriger`, `${r.plus} higher, ${r.minus} lower`), erklaer: 'rangtest' },
      { text: T(`p ${pWert(p)} (exakt)`, `p ${pWert(p)} (exact)`) + unter05(sig), erklaer: 'p-wert' },
      ...marken,
      ...(n < 6 ? [{ text: T(`Sehr wenige Paare (n = ${n})`, `Very few pairs (n = ${n})`), erklaer: 'stichprobe', hinweis: true }] : [])
    ]
  };
}
export function tabellenVorzeichen(e: VorzeichenE, label: (s: string) => string): TableItem[] {
  const r = e.r, v = label(e.vorher), na = label(e.nachher);
  const haeuf = tabelle('Sign Frequencies', T('Vorzeichen der Veränderung', 'Sign of the change'), [T('Veränderung', 'Change'), 'N'],
    [[T(`${na} niedriger als ${v} (−)`, `${na} lower than ${v} (−)`), fd(r.minus)], [T(`${na} höher als ${v} (+)`, `${na} higher than ${v} (+)`), fd(r.plus)], [T('Ohne Unterschied (Nullen, gehen nicht ein)', 'No difference (zeros, not included)'), fd(r.nullen)], [T('Alle Paare', 'All pairs'), fd(e.n)]],
    [T('Veränderung = nachher − vorher.', 'Change = after − before.')]);
  if (r.pZwei === null) return [haeuf];
  const test = tabelle('Sign Test', T('Vorzeichentest', 'Sign test'), [T('Paare im Test', 'Pairs in the test'), T('p (zweiseitig, exakt)', 'p (two-sided, exact)'), T('p (einseitig, exakt)', 'p (one-sided, exact)'), T('Punktwahrscheinlichkeit', 'Point probability'), T('Median der Veränderung', 'Median change')],
    [[fd(r.n), fp(r.pZwei), fp(r.pEin!), fx(r.pPunkt!, 4), fx(e.medianDiff, 2)]],
    [T('Binomialverteilung mit Wahrscheinlichkeit ½, für alle Zahlen von Paaren exakt. Zweiseitig: kleinere Zahl der beiden Richtungen, p verdoppelt, höchstens 1; bei gleich vielen Plus und Minus ist p = 1. SPSS rechnet ab 25 Paaren mit einer Näherung; Statable rechnet immer exakt.',
      'Binomial distribution with probability ½, exact for every number of pairs. Two-sided: the smaller count of the two directions, p doubled, at most 1; with equal numbers of plus and minus p = 1. SPSS uses an approximation from 25 pairs on; Statable always calculates exactly.')]);
  return [haeuf, test];
}

/* ===================================================================================================================== Mediantest */
const gn = (names: string[], e: { gruppen: { name: string }[] }, i: number) => names[i] || e.gruppen[i]!.name;
export function saetzeMedian(e: MedianE, label: (s: string) => string, gruppenNamen: string[] = []): Saetze {
  const r = e.r, was = q(label(e.abhaengig)), k = r.gruppen;
  const marken = [{ text: T('Mediantest', 'Median test'), erklaer: 'rangtest' }, rangMarke()];
  if (r.grund) return { haupt: rangWeitereText(r.grund, 'median'), zusatz: '', vorsicht: '', apa: '', marken };
  const zwei = k === 2, p = zwei ? r.fisherP! : r.p!, sig = p < 0.05;
  const anteile = e.gruppen.map((g, i) => ({ name: gn(gruppenNamen, e, i), a: r.ueber[i]! / g.n }));
  const hoch = anteile.reduce((a, b) => (b.a > a.a ? b : a)), tief = anteile.reduce((a, b) => (b.a < a.a ? b : a));
  const haupt = hoch.a === tief.a
    ? T(`In allen Gruppen lag derselbe Anteil der Werte von ${was} über dem Gesamtmedian (${md(r.median)}): ${prozent(hoch.a)}.`, `In all groups the same share of the ${was} values lay above the overall median (${md(r.median)}): ${prozent(hoch.a)}.`)
    : T(`Über dem Gesamtmedian (${md(r.median)}) von ${was} lagen in der Gruppe ${q(hoch.name)} ${prozent(hoch.a)} der Werte, in der Gruppe ${q(tief.name)} ${prozent(tief.a)}.`,
      `Above the overall median (${md(r.median)}) of ${was} lay ${prozent(hoch.a)} of the values in the group ${q(hoch.name)} and ${prozent(tief.a)} in the group ${q(tief.name)}.`);
  const testName = zwei ? T(`Mediantest, Fisher-exakt, p ${pWert(p)}`, `median test, Fisher's exact, p ${pWert(p)}`) : T(`Mediantest, χ²(${r.df}) = ${komma(r.chi2!)}, p ${pWert(p)}`, `median test, χ²(${r.df}) = ${komma(r.chi2!)}, p ${pWert(p)}`);
  const auf = r.aufMedian ? ' ' + Lp(r.aufMedian, `${r.aufMedian} Wert liegt genau auf dem Median und zählt zu „≤“.`, `${r.aufMedian} Werte liegen genau auf dem Median und zählen zu „≤“.`, `${r.aufMedian} value lies exactly on the median and counts as "≤".`, `${r.aufMedian} values lie exactly on the median and count as "≤".`) : '';
  const zusatz = (sig
    ? T(`Die Gruppen unterscheiden sich in der Lage: Ein so verschiedener Anteil über dem Gesamtmedian wäre selten, wenn in allen Gruppen derselbe Anteil über dem Median läge (${testName}).`,
      `The groups differ in location: a share above the overall median this different would be rare if the same share lay above the median in all groups (${testName}).`)
    : T(`Der Anteil über dem Gesamtmedian unterscheidet sich nicht deutlich zwischen den Gruppen (${testName}). Die Daten belegen einen Unterschied in der Lage darum nicht - das heißt nicht, dass es keinen gibt.`,
      `The share above the overall median does not differ clearly between the groups (${testName}). So the data do not show a difference in location - that does not mean there is none.`)) + auf
    + (r.hinweise.includes('viel-auf-median') ? ' ' + rangWeitereText('viel-auf-median') : '') + (r.hinweise.includes('erwartet-klein') ? ' ' + rangWeitereText('erwartet-klein') : '');
  const ibm = zwei && r.ibmRegel
    ? ' ' + (r.ibmRegel === 'fisher'
      ? T('SPSS zeigt bei höchstens 30 Fällen das exakte p nach Fisher, ab 31 Fällen das Yates-χ².', 'SPSS shows the exact Fisher p for up to 30 cases and the Yates χ² from 31 cases.')
      : T(`SPSS zeigt ab 31 Fällen das Yates-χ² (hier p ${pWert(r.yates!.p)}); Statable nennt als maßgebliches p immer das exakte nach Fisher.`, `SPSS shows the Yates χ² from 31 cases (here p ${pWert(r.yates!.p)}); Statable always gives the exact Fisher p as the main p.`)) : '';
  const vorsicht = T('Der Mediantest vergleicht, wie viele Werte jeder Gruppe über dem Median ALLER Werte liegen - nicht über dem Median der eigenen Gruppe. Er prüft nur die Lage, nicht Streuung oder Form, und hat bei vielen Werten genau auf dem Median wenig Aussagekraft; bei Likert-Daten ist Kruskal-Wallis meist die bessere Wahl.',
    'The median test compares how many values of each group lie above the median of ALL values - not above the median of the own group. It tests location only, not spread or shape, and has little power when many values lie exactly on the median; for Likert data Kruskal-Wallis is usually the better choice.') + ibm;
  return {
    haupt, zusatz, vorsicht,
    apa: (zwei
      ? T(`Mediantest, Fisher-exakt, p ${pWert(p)}, Gesamtmedian = ${md(r.median)}, N = ${r.n}`, `Median test, Fisher's exact, p ${pWert(p)}, overall median = ${md(r.median)}, N = ${r.n}`)
      : T(`Mediantest, χ²(${r.df}) = ${komma(r.chi2!)}, p ${pWert(p)}, Gesamtmedian = ${md(r.median)}, N = ${r.n}`, `Median test, χ²(${r.df}) = ${komma(r.chi2!)}, p ${pWert(p)}, overall median = ${md(r.median)}, N = ${r.n}`))
      + (r.aufMedian ? '; ' + Lp(r.aufMedian, `${r.aufMedian} Wert auf dem Median (zählt zu ≤)`, `${r.aufMedian} Werte auf dem Median (zählen zu ≤)`, `${r.aufMedian} value on the median (counted as ≤)`, `${r.aufMedian} values on the median (counted as ≤)`) : ''),
    marken: [
      { text: T(`Gesamtmedian ${md(r.median)}`, `Overall median ${md(r.median)}`), erklaer: 'rangtest' },
      { text: `p ${pWert(p)}${zwei ? ' (Fisher)' : ''}${unter05(sig)}`, erklaer: 'p-wert' },
      ...marken,
      ...(r.hinweise.includes('viel-auf-median') ? [{ text: T(`${prozent(r.anteilAufMedian)} der Werte auf dem Median`, `${prozent(r.anteilAufMedian)} of the values on the median`), erklaer: 'rangtest', hinweis: true }] : []),
      ...(r.hinweise.includes('erwartet-klein') ? [{ text: T('Erwartete Häufigkeiten klein', 'Small expected counts'), erklaer: 'chi-quadrat', hinweis: true }] : [])
    ]
  };
}
export function tabellenMedian(e: MedianE, label: (s: string) => string, gruppenNamen: string[] = []): TableItem[] {
  const r = e.r;
  if (r.grund && r.grund !== 'nichts-ueber-median') return [];
  const haeuf = tabelle('Median Frequencies', T('Werte über und bis zum Gesamtmedian', 'Values above and up to the overall median'), [T('Gruppe', 'Group'), 'n', T('über dem Median (>)', 'above the median (>)'), T('bis zum Median (≤)', 'up to the median (≤)'), T('Anteil über dem Median', 'Share above the median')],
    e.gruppen.map((g, i) => [gn(gruppenNamen, e, i), fd(g.n), fd(r.ueber[i]!), fd(r.bis[i]!), fx(r.ueber[i]! / g.n * 100, 1)]),
    [T(`Gesamtmedian aller Werte von ${label(e.abhaengig)}: ${md(r.median)}. Werte genau auf dem Median zählen zu „≤“ (wie in SPSS); das sind ${r.aufMedian} von ${r.n} (${prozent(r.anteilAufMedian)}).`, `Overall median of all values of ${label(e.abhaengig)}: ${md(r.median)}. Values exactly on the median count as "≤" (as in SPSS); that is ${r.aufMedian} of ${r.n} (${prozent(r.anteilAufMedian)}).`)]);
  if (r.grund) return [haeuf];
  const zeilen: Z[][] = [[T('Pearson-χ²', 'Pearson χ²'), fx(r.chi2!), fd(r.df!), fp(r.p!)]];
  if (r.fisherP !== null) zeilen.push([T('Fisher-exakt (maßgeblich)', "Fisher's exact (main)"), '-', '-', fp(r.fisherP)]);
  if (r.yates) zeilen.push([T('Yates-korrigiertes χ² (wie SPSS ab 31 Fällen)', 'Yates-corrected χ² (as SPSS from 31 cases)'), fx(r.yates.chi2), fd(1), fp(r.yates.p)]);
  const test = tabelle('Median Test', T('Mediantest', 'Median test'), [T('Test', 'Test'), 'χ²', 'df', 'p'], zeilen,
    [r.fisherP !== null
      ? T('Zwei Gruppen: maßgeblich ist der exakte Test nach Fisher (zweiseitig, Summe der Tabellen, die höchstens so wahrscheinlich sind wie die beobachtete). Pearson-χ² ohne Stetigkeitskorrektur; Yates mit der IBM-Formel (immer mit N/2). SPSS zeigt bei höchstens 30 Fällen Fisher, darüber Yates.', 'Two groups: the exact test of Fisher is the main one (two-sided, sum of the tables that are at most as likely as the observed one). Pearson χ² without continuity correction; Yates with the IBM formula (always with N/2). SPSS shows Fisher for up to 30 cases and Yates above.')
      : T('Pearson-χ² ohne Stetigkeitskorrektur, df = Zahl der Gruppen − 1. Ein exakter Test für drei und mehr Gruppen (Freeman-Halton) ist nicht enthalten.', 'Pearson χ² without continuity correction, df = number of groups − 1. An exact test for three or more groups (Freeman-Halton) is not included.')]);
  return [haeuf, test];
}

/* ===================================================================================================================== Jonckheere-Terpstra */
const reihenfolge = (e: JonckheereE, names: string[]) => e.gruppen.map((g, i) => gn(names, e, i)).join(' < ');
export function saetzeJt(e: JonckheereE, label: (s: string) => string, gruppenNamen: string[] = []): Saetze {
  const r = e.r, was = q(label(e.abhaengig)), seite = e.wahl.seite ?? 'zwei';
  const marken = [{ text: 'Jonckheere-Terpstra', erklaer: 'rangtest' }, rangMarke()];
  if (r.grund) return { haupt: rangWeitereText(r.grund, 'jt'), zusatz: '', vorsicht: '', apa: '', marken };
  const ord = reihenfolge(e, gruppenNamen), exakt = r.modus === 'exakt';
  const p = seite === 'zwei' ? r.p.zwei : seite === 'steigt' ? r.p.steigt : r.p.faellt, sig = p < 0.05;
  const steigt = r.jt > r.mittel, gleich = r.jt === r.mittel;
  const jtT = komma(r.jt, r.jt % 1 ? 1 : 0), mittelT = komma(r.mittel, r.mittel % 1 ? 1 : 0);
  const haupt = gleich
    ? T(`Die Werte von ${was} steigen mit der Reihenfolge der Gruppen (${ord}) weder an noch ab: Die Prüfgröße liegt genau beim Erwartungswert.`, `The values of ${was} neither rise nor fall with the order of the groups (${ord}): the test statistic lies exactly at its expected value.`)
    : steigt
      ? T(`Die Werte von ${was} steigen mit der Reihenfolge der Gruppen (${ord}): JT = ${jtT}, erwartet bei keinem Zusammenhang ${mittelT}.`, `The values of ${was} rise with the order of the groups (${ord}): JT = ${jtT}, expected with no relationship ${mittelT}.`)
      : T(`Die Werte von ${was} fallen mit der Reihenfolge der Gruppen (${ord}): JT = ${jtT}, erwartet bei keinem Zusammenhang ${mittelT}.`, `The values of ${was} fall with the order of the groups (${ord}): JT = ${jtT}, expected with no relationship ${mittelT}.`);
  const w = pWert(p);
  /** Der p-Wert als eigener Satz: exakt oder genähert, zweiseitig oder einseitig - je Fall ein ganzer Satz. */
  const pSatz = exakt
    ? (seite === 'zwei' ? T(`Exakter p-Wert, zweiseitig: p ${w}.`, `Exact p value, two-sided: p ${w}.`) : seite === 'steigt' ? T(`Exakter p-Wert, einseitig („steigt“): p ${w}.`, `Exact p value, one-sided ("rises"): p ${w}.`) : T(`Exakter p-Wert, einseitig („fällt“): p ${w}.`, `Exact p value, one-sided ("falls"): p ${w}.`))
    : (seite === 'zwei' ? T(`p-Wert (Näherung), zweiseitig: p ${w}.`, `p value (approximation), two-sided: p ${w}.`) : seite === 'steigt' ? T(`p-Wert (Näherung), einseitig („steigt“): p ${w}.`, `p value (approximation), one-sided ("rises"): p ${w}.`) : T(`p-Wert (Näherung), einseitig („fällt“): p ${w}.`, `p value (approximation), one-sided ("falls"): p ${w}.`));
  const zusatz = (sig
    ? T('Ein so deutlicher Trend in der Reihenfolge der Gruppen wäre selten, wenn die Werte nicht von der Gruppe abhingen.', 'A trend this clear in the order of the groups would be rare if the values did not depend on the group.')
    : T('Ein Trend in der Reihenfolge der Gruppen, der so stark ist wie hier, kommt auch dann nicht selten vor, wenn die Werte nicht von der Gruppe abhängen. Die Daten belegen einen Trend darum nicht - das heißt nicht, dass es keinen gibt.', 'A trend in the order of the groups as strong as this is not unusual even if the values do not depend on the group. So the data do not show a trend - that does not mean there is none.'))
    + ' ' + pSatz + ' ' + (exakt ? T(`Exakt gerechnet über alle ${komma(r.aufteilungen, 0)} Aufteilungen der Gruppenmarken auf die Werte (gleiche Werte bleiben gleich).`, `Calculated exactly over all ${komma(r.aufteilungen, 0)} assignments of the group labels to the values (equal values stay equal).`)
      : T(`Näherung mit der Normalverteilung und Korrektur für gleiche Werte (z = ${komma(r.z)}); für diese Gruppengrößen ist die Vollauszählung aller Aufteilungen zu groß.`, `Approximation with the normal distribution and a correction for tied values (z = ${komma(r.z)}); for these group sizes a full count of all assignments is too large.`));
  const vorsicht = T('Der Jonckheere-Terpstra-Test prüft, ob die Werte mit der Reihenfolge der Gruppen steigen oder fallen. Er ist nur sinnvoll, wenn diese Reihenfolge inhaltlich begründet ist (zum Beispiel Klassenstufen 5 < 6 < 7) und vor dem Blick auf die Daten feststeht; sonst passt Kruskal-Wallis. Dreht man die Reihenfolge um, kehrt sich die Richtung um.',
    'The Jonckheere-Terpstra test checks whether the values rise or fall with the order of the groups. It is only meaningful if this order is justified by content (for example grades 5 < 6 < 7) and fixed before looking at the data; otherwise Kruskal-Wallis fits. Reversing the order reverses the direction.')
    + (e.textReihenfolge ? ' ' + T('Die Gruppen sind Text und stehen darum in alphabetischer Reihenfolge; zu klären ist, ob das die gemeinte Reihenfolge ist, sonst ist das Ergebnis sinnlos.', 'The groups are text and are therefore in alphabetical order; it has to be clarified whether that is the intended order, otherwise the result is meaningless.') : '');
  const jt = komma(r.jt, r.jt % 1 ? 1 : 0);
  return {
    haupt, zusatz, vorsicht,
    apa: exakt
      ? (seite === 'zwei'
        ? T(`Jonckheere-Terpstra-Test, JT = ${jt}, exakter p-Wert zweiseitig ${w}, N = ${r.n}`, `Jonckheere-Terpstra test, JT = ${jt}, exact two-sided p ${w}, N = ${r.n}`)
        : T(`Jonckheere-Terpstra-Test, JT = ${jt}, exakter p-Wert einseitig ${w}, N = ${r.n}`, `Jonckheere-Terpstra test, JT = ${jt}, exact one-sided p ${w}, N = ${r.n}`))
      : (seite === 'zwei'
        ? T(`Jonckheere-Terpstra-Test, JT = ${jt}, z = ${komma(r.z)}, p ${w}, N = ${r.n}`, `Jonckheere-Terpstra test, JT = ${jt}, z = ${komma(r.z)}, p ${w}, N = ${r.n}`)
        : T(`Jonckheere-Terpstra-Test, JT = ${jt}, z = ${komma(r.z)}, p ${w} (einseitig), N = ${r.n}`, `Jonckheere-Terpstra test, JT = ${jt}, z = ${komma(r.z)}, p ${w} (one-sided), N = ${r.n}`)),
    marken: [
      { text: T(`Reihenfolge: ${ord}`, `Order: ${ord}`), erklaer: 'rangtest' },
      { text: (exakt ? T(`p ${pWert(p)} (exakt)`, `p ${pWert(p)} (exact)`) : T(`p ${pWert(p)} (Näherung)`, `p ${pWert(p)} (approximation)`)) + unter05(sig), erklaer: 'p-wert' },
      ...marken,
      ...(e.textReihenfolge ? [{ text: T('Reihenfolge der Textgruppen prüfen', 'Check the order of the text groups'), erklaer: 'rangtest', hinweis: true }] : []),
      ...(r.n < 20 ? [{ text: T(`Kleine Stichprobe (N = ${r.n})`, `Small sample (N = ${r.n})`), erklaer: 'stichprobe', hinweis: true }] : [])
    ]
  };
}
export function tabellenJt(e: JonckheereE, label: (s: string) => string, gruppenNamen: string[] = []): TableItem[] {
  const r = e.r;
  if (r.grund) return [];
  const gr = tabelle('Jonckheere-Terpstra Groups', T('Gruppen in der Reihenfolge des Tests', 'Groups in the order of the test'), [T('Rang in der Reihenfolge', 'Position in the order'), T('Gruppe', 'Group'), 'n', 'Mdn'],
    e.gruppen.map((g, i) => [String(i + 1), gn(gruppenNamen, e, i), fd(g.n), fx(g.median, 2)]),
    [e.wahl.umkehren
      ? T(`Reihenfolge der Gruppen: ${reihenfolge(e, gruppenNamen)} (umgekehrt). Mdn = Median.`, `Order of the groups: ${reihenfolge(e, gruppenNamen)} (reversed). Mdn = median.`)
      : T(`Reihenfolge der Gruppen: ${reihenfolge(e, gruppenNamen)}. Mdn = Median.`, `Order of the groups: ${reihenfolge(e, gruppenNamen)}. Mdn = median.`)]);
  const zeilen: Z[][] = [
    [T('Asymptotisch (Näherung)', 'Asymptotic (approximation)'), fp(r.asymptotisch.zwei), fp(r.asymptotisch.steigt), fp(r.asymptotisch.faellt)],
    ...(r.exakt ? [[T('Exakt (alle Aufteilungen)', 'Exact (all assignments)'), fp(r.exakt.zwei), fp(r.exakt.steigt), fp(r.exakt.faellt)]] : [])
  ];
  const test = tabelle('Jonckheere-Terpstra Test', T('Jonckheere-Terpstra-Test', 'Jonckheere-Terpstra test'), [T('Verfahren', 'Method'), T('p zweiseitig', 'p two-sided'), T('p einseitig: steigt', 'p one-sided: rises'), T('p einseitig: fällt', 'p one-sided: falls')], zeilen,
    [r.aufteilungen <= 2_000_000
      ? T(`JT = ${komma(r.jt, r.jt % 1 ? 1 : 0)}, Erwartungswert ${komma(r.mittel, r.mittel % 1 ? 1 : 0)}, SD ${komma(r.sd)}, z = ${komma(r.z)}, N = ${r.n}, ${komma(r.aufteilungen, 0)} mögliche Aufteilungen.`, `JT = ${komma(r.jt, r.jt % 1 ? 1 : 0)}, expected value ${komma(r.mittel, r.mittel % 1 ? 1 : 0)}, SD ${komma(r.sd)}, z = ${komma(r.z)}, N = ${r.n}, ${komma(r.aufteilungen, 0)} possible assignments.`)
      : T(`JT = ${komma(r.jt, r.jt % 1 ? 1 : 0)}, Erwartungswert ${komma(r.mittel, r.mittel % 1 ? 1 : 0)}, SD ${komma(r.sd)}, z = ${komma(r.z)}, N = ${r.n}, mehr als 2 000 000 mögliche Aufteilungen.`, `JT = ${komma(r.jt, r.jt % 1 ? 1 : 0)}, expected value ${komma(r.mittel, r.mittel % 1 ? 1 : 0)}, SD ${komma(r.sd)}, z = ${komma(r.z)}, N = ${r.n}, more than 2,000,000 possible assignments.`),
      T('JT zählt gleiche Werte halb; die Varianz enthält die Korrektur für gleiche Werte.', 'JT counts tied values half; the variance includes the correction for tied values.'),
      r.modus === 'exakt' ? T('Gezeigt wird der exakte Wert (exakt bis 2 000 000 Aufteilungen).', 'The exact value is shown (exact up to 2,000,000 assignments).') : T('Gezeigt wird die Näherung (exakt bis 2 000 000 Aufteilungen).', 'The approximation is shown (exact up to 2,000,000 assignments).'),
      T('Zweiseitig exakt wie IBM SPSS: Abstand vom Erwartungswert mindestens so groß wie beobachtet; Näherung zweiseitig: doppelter kleinerer einseitiger Wert.', 'Two-sided exact as in IBM SPSS: distance from the expected value at least as large as observed; two-sided approximation: twice the smaller one-sided value.'),
      T('PSPP rechnet diesen Test bei gleichen Werten falsch; Statable rechnet selbst.', 'PSPP calculates this test wrongly for tied values; Statable calculates it itself.')]);
  return [gr, test];
}

/* ===================================================================================================================== Kolmogorov-Smirnov */
export function saetzeKs(e: KsE, label: (s: string) => string, gruppenNamen: string[] = []): Saetze {
  const r = e.r, was = q(label(e.abhaengig)), a = q(gn(gruppenNamen, e, 0)), b = q(gn(gruppenNamen, e, 1));
  const marken = [{ text: T('Kolmogorov-Smirnov (zwei Stichproben)', 'Kolmogorov-Smirnov (two samples)'), erklaer: 'rangtest' }, rangMarke()];
  if (r.grund) return { haupt: rangWeitereText('zu-wenig-werte', 'ks'), zusatz: '', vorsicht: '', apa: '', marken };
  const p = r.p, sig = p < 0.05, exakt = r.modus === 'exakt';
  const haupt = r.d === 0
    ? T(`Die Verteilungen von ${was} in den Gruppen ${a} und ${b} sind in den Daten gleich: Der größte Abstand der beiden Verteilungsfunktionen ist 0.`, `The distributions of ${was} in the groups ${a} and ${b} are identical in the data: the largest distance between the two distribution functions is 0.`)
    : T(`Die beiden Verteilungen von ${was} (${a} und ${b}) liegen höchstens ${ohneNull(r.d)} auseinander (größter Abstand der Verteilungsfunktionen, D).`, `The two distributions of ${was} (${a} and ${b}) are at most ${ohneNull(r.d)} apart (largest distance between the distribution functions, D).`);
  const pSatz = exakt ? T(`Exakter p-Wert: p ${pWert(p)}.`, `Exact p value: p ${pWert(p)}.`) : T(`p-Wert (Näherung): p ${pWert(p)}.`, `p value (approximation): p ${pWert(p)}.`);
  const zusatz = (sig
    ? T('Ein so großer Abstand wäre selten, wenn beide Gruppen aus derselben Verteilung stammten. Die Verteilungen unterscheiden sich - in der Lage, der Streuung oder der Form.',
      'A distance this large would be rare if both groups came from the same distribution. The distributions differ - in location, spread or shape.')
    : T('Ein so großer Abstand kommt auch dann nicht selten vor, wenn beide Gruppen aus derselben Verteilung stammen. Die Daten belegen einen Unterschied der Verteilungen darum nicht - das heißt nicht, dass es keinen gibt.',
      'A distance this large is not unusual even if both groups come from the same distribution. So the data do not show a difference between the distributions - that does not mean there is none.')) + ' ' + pSatz
    + (exakt && r.pAsymptotisch > p * 1.2 && r.pAsymptotisch - p > 0.01 ? ' ' + T(`Die Näherung von SPSS wäre hier ${pWert(r.pAsymptotisch)}: Sie ist bei gleichen Werten zu groß, darum rechnet Statable exakt.`, `The SPSS approximation would be ${pWert(r.pAsymptotisch)} here: it is too large with tied values, which is why Statable calculates exactly.`) : '')
    + (!exakt ? ' ' + T(`Näherung nach Smirnov (z = ${komma(r.z)}); bei n₁ · n₂ über 10 000 wird nicht mehr exakt gerechnet.`, `Smirnov approximation (z = ${komma(r.z)}); above n₁ · n₂ = 10,000 the calculation is no longer exact.`) : '');
  const vorsicht = T('Der Kolmogorov-Smirnov-Test reagiert auf jeden Unterschied der Verteilungen, nicht nur auf die Lage. Er ist gegenüber einer reinen Verschiebung schwächer als Mann-Whitney und kein Test auf Mittelwerte oder Mediane. Bei gleichen Werten ist die übliche Näherung zu vorsichtig.',
    'The Kolmogorov-Smirnov test reacts to any difference between the distributions, not just to location. Against a pure shift it is weaker than Mann-Whitney, and it is not a test of means or medians. With tied values the usual approximation is too conservative.');
  return {
    haupt, zusatz, vorsicht,
    apa: exakt ? T(`Kolmogorov-Smirnov-Test, D = ${ohneNull(r.d)}, exakter p-Wert ${pWert(p)}; n₁ = ${r.n1}, n₂ = ${r.n2}`, `Kolmogorov-Smirnov test, D = ${ohneNull(r.d)}, exact p ${pWert(p)}; n₁ = ${r.n1}, n₂ = ${r.n2}`)
      : T(`Kolmogorov-Smirnov-Test, D = ${ohneNull(r.d)}, Z = ${komma(r.z)}, p ${pWert(p)}; n₁ = ${r.n1}, n₂ = ${r.n2}`, `Kolmogorov-Smirnov test, D = ${ohneNull(r.d)}, Z = ${komma(r.z)}, p ${pWert(p)}; n₁ = ${r.n1}, n₂ = ${r.n2}`),
    marken: [
      { text: `D = ${ohneNull(r.d)}`, erklaer: 'rangtest' },
      { text: (exakt ? T(`p ${pWert(p)} (exakt)`, `p ${pWert(p)} (exact)`) : T(`p ${pWert(p)} (Näherung)`, `p ${pWert(p)} (approximation)`)) + unter05(sig), erklaer: 'p-wert' },
      ...marken,
      ...(Math.min(r.n1, r.n2) < 10 ? [{ text: T(`Kleine Stichprobe (n = ${Math.min(r.n1, r.n2)})`, `Small sample (n = ${Math.min(r.n1, r.n2)})`), erklaer: 'stichprobe', hinweis: true }] : [])
    ]
  };
}
export function tabellenKs(e: KsE, label: (s: string) => string, gruppenNamen: string[] = []): TableItem[] {
  const r = e.r;
  if (r.grund) return [];
  const gr = tabelle('KS Groups', T('Gruppen', 'Groups'), [T('Gruppe', 'Group'), 'n', 'Mdn'], e.gruppen.map((g, i) => [gn(gruppenNamen, e, i), fd(g.n), fx(g.median, 2)]), [T('Mdn = Median.', 'Mdn = median.')]);
  const test = tabelle('KS Test', T('Kolmogorov-Smirnov-Test (zwei Stichproben)', 'Kolmogorov-Smirnov test (two samples)'), ['D', 'Z', T('p (Näherung, wie SPSS)', 'p (approximation, as SPSS)'), T('p (exakt)', 'p (exact)')],
    [[fx(r.d, 4), fx(r.z, 3), fp(r.pAsymptotisch), r.pExakt === null ? '-' : fp(r.pExakt)]],
    [T(`D = größter Abstand der beiden Verteilungsfunktionen; Z = D · √(n₁n₂/(n₁ + n₂)). Die Näherung ist die Smirnov-Reihe (wie SPSS) und bei gleichen Werten zu groß. Exakt bedingt auf die Werte über alle Aufteilungen, gleiche Werte bleiben gleich, gerechnet in ganzen Zahlen; exakt bis n₁ · n₂ ≤ 10 000, hier ${komma(r.n1 * r.n2, 0)}. Nur zweiseitig.`,
      `D = largest distance between the two distribution functions; Z = D · √(n₁n₂/(n₁ + n₂)). The approximation is the Smirnov series (as SPSS) and is too large with tied values. Exact conditional on the values over all assignments, tied values stay equal, calculated in whole numbers; exact up to n₁ · n₂ ≤ 10,000, here ${komma(r.n1 * r.n2, 0)}. Two-sided only.`)]);
  return [gr, test];
}

/* ===================================================================================================================== gemeinsam */
export function saetzeWeitere(r: WeitereErgebnis, label: (s: string) => string, gruppenNamen: string[] = []): Saetze {
  return r.art === 'vorzeichen' ? saetzeVorzeichen(r, label) : r.art === 'median' ? saetzeMedian(r, label, gruppenNamen) : r.art === 'jt' ? saetzeJt(r, label, gruppenNamen) : saetzeKs(r, label, gruppenNamen);
}
export function tabellenWeitere(r: WeitereErgebnis, label: (s: string) => string, gruppenNamen: string[] = []): TableItem[] {
  return r.art === 'vorzeichen' ? tabellenVorzeichen(r, label) : r.art === 'median' ? tabellenMedian(r, label, gruppenNamen) : r.art === 'jt' ? tabellenJt(r, label, gruppenNamen) : tabellenKs(r, label, gruppenNamen);
}

/** Erklärung der Wahl unter dem Ergebnis (wie rangMitteText bei den Standard-Rangtests). */
export function weitereMitteText(r: WeitereErgebnis): string {
  switch (r.art) {
    case 'vorzeichen': return T('Der Vorzeichentest zählt, bei wie vielen Personen der Wert gestiegen und bei wie vielen gesunken ist, und prüft, ob beides gleich wahrscheinlich ist. Er braucht keine Annahme über die Größe der Veränderung und keine Normalverteilung; Paare ohne Unterschied entfallen.', 'The sign test counts for how many people the value rose and for how many it fell and tests whether both are equally likely. It needs no assumption about the size of the change and no normal distribution; pairs without a difference are dropped.');
    case 'median': return T('Der Mediantest legt den Median aller Werte fest und vergleicht, welcher Anteil jeder Gruppe darüber liegt. Er braucht keine Normalverteilung und ist unempfindlich gegen Ausreißer, hat aber weniger Aussagekraft als Kruskal-Wallis.', 'The median test fixes the median of all values and compares which share of each group lies above it. It needs no normal distribution and is insensitive to outliers, but has less power than Kruskal-Wallis.');
    case 'jt': return T('Der Jonckheere-Terpstra-Test prüft, ob die Werte mit der Reihenfolge der Gruppen steigen oder fallen. Er ist schärfer als Kruskal-Wallis, wenn es eine begründete Richtung gibt. Die Reihenfolge der Gruppen ist sichtbar und umkehrbar.', 'The Jonckheere-Terpstra test checks whether the values rise or fall with the order of the groups. It is sharper than Kruskal-Wallis when there is a justified direction. The order of the groups is visible and can be reversed.');
    case 'ks': return T('Der Kolmogorov-Smirnov-Test sucht die Stelle, an der sich die Verteilungen beider Gruppen am meisten unterscheiden. Er reagiert auf Unterschiede in Lage, Streuung und Form, nicht nur in der Lage.', 'The Kolmogorov-Smirnov test looks for the point at which the distributions of both groups differ most. It reacts to differences in location, spread and shape, not just in location.');
  }
}
/** Hinweis, wenn der Test zu den Daten nicht passt oder nicht geht (für die Wahl im Blatt). */
export function weitereGeht(art: 'vorzeichen' | 'median' | 'jt' | 'ks', k: number): string | null {
  if (art === 'jt' && k < 3) return d('Jonckheere-Terpstra braucht mindestens drei Gruppen mit einer begründeten Reihenfolge. Bei zwei Gruppen nimm Mann-Whitney.', 'Jonckheere-Terpstra braucht mindestens drei Gruppen mit einer begründeten Reihenfolge. Bei zwei Gruppen nehmen Sie Mann-Whitney.', 'Jonckheere-Terpstra needs at least three groups with a justified order. With two groups use Mann-Whitney.');
  if (art === 'ks' && k !== 2) return L('Der Kolmogorov-Smirnov-Test für zwei Stichproben braucht genau zwei Gruppen.', 'The Kolmogorov-Smirnov test for two samples needs exactly two groups.');
  return null;
}
