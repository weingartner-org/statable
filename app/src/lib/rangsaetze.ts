/**
 * Sätze, Marken, APA-Zeilen und Tabellen zu den Rangtests (Mann-Whitney, Kruskal-Wallis mit Dunn, Wilcoxon). Gerechnet wird in rangtests.ts.
 * ⚠ Satz-Vorlagen, die Faustregeln für r (Cohen: ,1 / ,3 / ,5) und ε² (wie η²: ,01 / ,06 / ,14) und der Hinweis „kleine Gruppe“ (n < 20) sind von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { ki, proz, zitat } from '../i18n/profil';
import { komma, ohneNull, pWert, kurz, type Saetze, unter05, angezeigt } from './ergebnis';
import { fd, fp, fx, tabelle } from './mwsaetze';
import { kleinste } from './menge';
import { WENIGE_STUFEN } from './stufen';
import { saetzeFriedman, tabellenFriedman } from './friedmansaetze';
import { saetzeWeitere, tabellenWeitere, weitereName } from './rangweiteresaetze';
import { type DunnPaar, type HodgesLehmann, type KruskalWallis, type MannWhitney, type RangErgebnis, type RangVorschlag, type Wilcoxon } from './rangtests';

const T = L;
const q = (x: string) => zitat(kurz(x));
const prozent = (v: number) => proz(komma(v * 100, 0));
/** Median für Sätze: eine Stelle, ganze Zahlen ohne Nachkommastelle. */
const md = (v: number) => komma(v, Number.isInteger(v) ? 0 : 1);

/** Erreichtes Niveau eines exakten Hodges-Lehmann-Intervalls in Prozent - nur, wenn es um 0,1 Prozentpunkte oder mehr von 95 % abweicht (Fachblatt G9); sonst `null` („95 %“). */
export const niveauProzent = (h?: HodgesLehmann | null): number | null => {
  if (!h || h.ohneKi || h.niveau === undefined) return null;
  const p = h.niveau * 100;
  return Math.abs(p - 95) >= 0.1 - 1e-9 ? p : null;
};
/** Hodges-Lehmann für Sätze: zwei Stellen, ganz ohne Nachkommastellen, wenn Schätzer und Grenzen ganze Zahlen sind. `kehren`: Vorzeichen umdrehen (b − a statt a − b).
 *  `ki` ist leer ohne Intervall (zu wenige Werte); `hinweis` ist der Satz dazu (kein Intervall bzw. Niveau weicht von 95 % ab), mit führendem Leerzeichen, sonst leer. */
export function hlTeile(h: HodgesLehmann, kehren = false): { wert: string; ki: string; apa: string; hinweis: string } {
  const kein = h.ohneKi || h.unten === null || h.oben === null;
  const [w, u, o] = kehren ? [-h.schaetzer, kein ? NaN : -h.oben!, kein ? NaN : -h.unten!] : [h.schaetzer, kein ? NaN : h.unten!, kein ? NaN : h.oben!];
  const st = [w, u, o].filter(Number.isFinite).every(Number.isInteger) ? 0 : 2;
  const k = (v: number) => komma(v, st);
  if (kein) return { wert: k(w), ki: '', apa: `HL = ${k(w)}`, hinweis: ' ' + T('Mit so wenigen Werten lässt sich kein Konfidenzintervall mit 95 % bilden.', 'With so few values no confidence interval with 95% can be formed.') };
  const niv = niveauProzent(h), kiText = ki(k(u), k(o), niv ?? undefined);
  return { wert: k(w), ki: kiText, apa: `HL = ${k(w)}, ${kiText}`, hinweis: niv === null ? '' : ' ' + T(`Mit diesen Fallzahlen lässt sich ein Niveau von genau 95 % nicht erreichen. Das Intervall hat ein Niveau von ${proz(komma(niv, 1))}.`, `With these sample sizes a level of exactly 95% cannot be reached. The interval has a level of ${proz(komma(niv, 1))}.`) };
}
const hlFuss = (h?: HodgesLehmann) => !h ? '' : h.ohneKi
  ? T('Mit so wenigen Werten lässt sich kein Konfidenzintervall mit 95 % bilden.', 'With so few values no confidence interval with 95% can be formed.')
  : h.exakt
    ? T(`Exaktes KI aus der bedingten Verteilung (wie R wilcox.test(conf.int = TRUE)): Die Grenzen sind Werte aus den Daten, das erreichte Niveau beträgt ${proz(komma((h.niveau ?? 0.95) * 100, 1))} (mindestens 95 %). Es enthält alle Verschiebungen, die der exakte Test bei ,05 nicht verwirft. Schließt es 0 aus, ist auch p < ,05.`,
      `Exact CI from the conditional distribution (as R wilcox.test(conf.int = TRUE)): the limits are values from the data and the achieved level is ${proz(komma((h.niveau ?? 0.95) * 100, 1))} (at least 95%). It contains every shift the exact test does not reject at .05. If it excludes 0, p < .05 as well.`)
    : T('Das KI kehrt denselben Test um (Normalnäherung mit Bindungskorrektur, ohne Stetigkeitskorrektur, wie R wilcox.test(conf.int = TRUE, exact = FALSE, correct = FALSE)): Es enthält alle Verschiebungen, die der Test bei ,05 nicht verwirft. Schließt es 0 aus, ist auch p < ,05.',
      'The CI inverts the same test (normal approximation with tie correction, no continuity correction, as R wilcox.test(conf.int = TRUE, exact = FALSE, correct = FALSE)): it contains every shift the test does not reject at .05. If it excludes 0, p < .05 as well.');
/** Welcher p-Wert steht da: der exakte (weniger als 50 je Gruppe, auch bei gleichen Werten) oder die Normalnäherung. */
export const pArt = (exakt: boolean) => (exakt ? L('exakt', 'exact') : L('Näherung', 'approximate'));
const pKopf = (exakt: boolean) => `p (${pArt(exakt)})`;
/** Grenze im Tabellenfeld; ohne Intervall (zu wenige Werte) ein Strich. */
const grenze = (v: number | null) => (v === null ? '-' : Number.isFinite(v) ? fx(v) : v < 0 ? '-∞' : '∞');
/** Spaltenköpfe der Grenzen; weicht das erreichte Niveau von 95 % ab, steht es im Kopf. */
const kiKopf = (niv: number | null, unten: boolean) => niv === null
  ? (unten ? T('95 %-KI untere Grenze', '95% CI lower') : T('95 %-KI obere Grenze', '95% CI upper'))
  : (unten ? T(`${komma(niv, 1)} %-KI untere Grenze`, `${komma(niv, 1)}% CI lower`) : T(`${komma(niv, 1)} %-KI obere Grenze`, `${komma(niv, 1)}% CI upper`));

/** Wirkungsstärke von r (Cohen 1992: ,1 klein, ,3 mittel, ,5 groß). */
export function rWort(r: number): string {
  const a = angezeigt(Math.abs(r));
  return a < 0.1 ? L('sehr klein', 'very small') : a < 0.3 ? L('klein', 'small') : a < 0.5 ? L('mittelgroß', 'medium-sized') : L('groß', 'large');
}
/** Wirkungsstärke von ε² (wie η²: ,01 / ,06 / ,14). */
export function eps2Wort(v0: number): string {
  const v = angezeigt(v0);
  return v < 0.01 ? L('sehr klein', 'very small') : v < 0.06 ? L('klein', 'small') : v < 0.14 ? L('mittelgroß', 'medium-sized') : L('groß', 'large');
}

/** Was Statable zur Wahl des Rangtests sagt - in der Prüfliste vor dem Rechnen und unter dem Ergebnis (Abschlusstest F5): der Grund, nicht „vorgeschlagen“. */
export function rangGruende(v: RangVorschlag, paired: boolean | 'mw' = false): string[] {
  const gruende: string[] = [];
  if (v.schief !== null && v.schief !== undefined) gruende.push(paired === 'mw'
    ? T(`die Werte sind zu einem Zeitpunkt deutlich schief verteilt (Schiefe = ${komma(v.schief)})`, `the values at one time point are clearly skewed (skewness = ${komma(v.schief)})`)
    : paired
    ? T(`die Veränderungen sind deutlich schief verteilt (Schiefe = ${komma(v.schief)})`, `the changes are clearly skewed (skewness = ${komma(v.schief)})`)
    : T(`die Verteilung ist in einer Gruppe deutlich schief (Schiefe = ${komma(v.schief)})`, `the distribution in one group is clearly skewed (skewness = ${komma(v.schief)})`));
  if (v.ausreisser) gruende.push(Lp(v.ausreisser, `${v.ausreisser} sehr auffälliger Einzelwert (Ausreißer)`, `${v.ausreisser} sehr auffällige Einzelwerte (Ausreißer)`, `${v.ausreisser} very unusual single value (outlier)`, `${v.ausreisser} very unusual single values (outliers)`));
  if (v.stufen) {
    const n = v.stufen.spalten.map(q).join(` ${L('und', 'and')} `), mehr = v.stufen.spalten.length > 1;
    gruende.push(v.stufen.art === 'ordinal'
      ? (mehr ? T(`${n} sind ordinal (nur die Reihenfolge der Werte zählt)`, `${n} are ordinal (only the order of the values counts)`) : T(`${n} ist ordinal (nur die Reihenfolge der Werte zählt)`, `${n} is ordinal (only the order of the values counts)`))
      : (mehr ? T(`${n} haben nur ${v.stufen.stufen} oder weniger verschiedene Werte`, `${n} have only ${v.stufen.stufen} or fewer distinct values`) : T(`${n} hat nur ${v.stufen.stufen} verschiedene Werte`, `${n} has only ${v.stufen.stufen} distinct values`)));
  }
  return gruende;
}
const gross1 = (t: string) => t.charAt(0).toLocaleUpperCase() + t.slice(1);
/** Die Gründe als ein Satzstück („Die Verteilung … und …“), erster Buchstabe groß. */
export const rangGruendeText = (v: RangVorschlag, paired: boolean | 'mw' = false) => gross1(rangGruende(v, paired).join(` ${L('und', 'and')} `));
/** Der Punkt in der Prüfliste „Passt das zu deinen Daten?“ vor dem Rechnen (Abschlusstest F5). */
export function rangPruefPunkt(v: RangVorschlag, paired: boolean | 'mw' = false): { art: 'hinweis' | 'ok'; text: string; klein: string; erklaer: string } {
  const g = rangGruende(v, paired);
  return g.length
    ? { art: 'hinweis', text: T('Ein Rangtest passt hier besser', 'A rank test fits better here'), erklaer: 'rangtest',
      klein: T(`${gross1(g.join(` ${L('und', 'and')} `))}. Am besten jetzt festlegen: Unter dem Ergebnis „Ohne Normalverteilung (Rangtest)“ wählen.`, `${gross1(g.join(` ${L('und', 'and')} `))}. Best decided now: choose "No normal distribution (rank test)" below the result.`) }
    : { art: 'ok', text: paired === 'mw' ? T('Varianzanalyse passt', 'Analysis of variance fits') : paired ? T('t-Test passt', 't test fits') : T('Mittelwertvergleich passt', 'Comparison of means fits'), erklaer: 'rangtest',
      klein: paired === 'mw' ? T(`Keine deutliche Schiefe, keine Ausreißer, mehr als ${WENIGE_STUFEN} verschiedene Werte - nichts spricht gegen die Varianzanalyse mit Messwiederholung.`, `No clear skewness, no outliers, more than ${WENIGE_STUFEN} distinct values - nothing speaks against the repeated-measures analysis of variance.`)
        : paired ? T(`Keine deutliche Schiefe der Veränderungen, keine Ausreißer, mehr als ${WENIGE_STUFEN} verschiedene Werte - dann hält der t-Test auch bei wenigen Personen.`, `No clear skewness of the changes, no outliers, more than ${WENIGE_STUFEN} distinct values - the t test then holds even with few people.`)
        : T(`Keine deutliche Schiefe, keine Ausreißer, mehr als ${WENIGE_STUFEN} verschiedene Werte - dann hält der Test nach Welch auch bei kleinen Gruppen.`, `No clear skewness, no outliers, more than ${WENIGE_STUFEN} distinct values - Welch's test then holds even with small groups.`) };
}
export function rangVorschlagText(v: RangVorschlag, paired: boolean | 'mw' = false): string {
  const g = rangGruende(v, paired);
  if (paired === 'mw' && !g.length) return T(`Kein Grund für einen Rangtest: keine deutliche Schiefe, keine Ausreißer und mehr als ${WENIGE_STUFEN} verschiedene Werte. Der Friedman-Test ist trotzdem möglich; er prüft eine etwas andere Frage (ob die Zeitpunkte im Rang verschieden liegen) und braucht weder Normalverteilung noch Sphärizität.`,
    `No reason for a rank test: no clear skewness, no outliers and more than ${WENIGE_STUFEN} distinct values. The Friedman test is still possible; it tests a slightly different question (whether the time points differ in rank) and needs neither a normal distribution nor sphericity.`);
  return g.length
    ? T(`Grund für einen Rangtest: ${gross1(g.join(` ${L('und', 'and')} `))}. Diese Wahl gehört vor das Rechnen (Prüfliste oben) - nicht erst nach dem Blick auf das Ergebnis.`, `Reason for a rank test: ${gross1(g.join(` ${L('und', 'and')} `))}. This choice belongs before the calculation (checklist above) - not after looking at the result.`)
    : paired
      ? T(`Kein Grund für einen Rangtest: keine deutliche Schiefe der Veränderungen, keine Ausreißer und mehr als ${WENIGE_STUFEN} verschiedene Werte. Dann hält der t-Test auch bei wenigen Personen. Der Rangtest ist trotzdem möglich; er prüft eine etwas andere Frage (ob die Veränderungen eher nach oben oder nach unten gehen).`,
        `No reason for a rank test: no clear skewness of the changes, no outliers and more than ${WENIGE_STUFEN} distinct values. The t test then holds even with few people. The rank test is still possible; it tests a slightly different question (whether the changes tend to go up or down).`)
      : T(`Kein Grund für einen Rangtest: keine deutliche Schiefe, keine Ausreißer und mehr als ${WENIGE_STUFEN} verschiedene Werte. Dann hält der Mittelwertvergleich auch bei kleinen Gruppen. Der Rangtest ist trotzdem möglich; er prüft eine etwas andere Frage (ob eine Gruppe tendenziell höhere Werte hat).`,
        `No reason for a rank test: no clear skewness, no outliers and more than ${WENIGE_STUFEN} distinct values. The comparison of means then holds even with small groups. The rank test is still possible; it tests a slightly different question (whether one group tends to have higher values).`);
}
export const rangMitteText = (paired: boolean | 'mw') => paired === 'mw'
  ? T('Der Friedman-Test ordnet die Werte jeder Person über die Zeitpunkte der Größe nach und prüft, ob die Zeitpunkte im Schnitt verschiedene Ränge haben. Er braucht keine normalverteilten Werte und keine Sphärizität. Kendalls W zeigt, wie einheitlich die Personen die Zeitpunkte ordnen.', 'The Friedman test ranks each person\'s values across the time points and tests whether the time points have different mean ranks. It needs neither normally distributed values nor sphericity. Kendall\'s W shows how consistently the people order the time points.')
  : paired
  ? T('Der Wilcoxon-Test ordnet die Veränderungen der Größe nach und prüft, ob die Aufwärts- und die Abwärtsveränderungen im Rang ausgeglichen sind. Er braucht keine normalverteilte Veränderung.', 'The Wilcoxon test ranks the changes by size and tests whether upward and downward changes balance out in rank. It does not need normally distributed changes.')
  : T('Der Rangtest ordnet alle Werte der Größe nach und vergleicht, welche Gruppe im Schnitt höhere Ränge hat. Er braucht keine Normalverteilung und ist unempfindlich gegen einzelne Ausreißer.', 'The rank test orders all values by size and compares which group has the higher ranks on average. It does not need a normal distribution and is insensitive to single outliers.');

/* ---------------------------------------------------------------- Mann-Whitney */
export function saetzeMannWhitney(e: MannWhitney, label: (s: string) => string): Saetze {
  const was = q(label(e.abhaengig)), grp = label(e.gruppenSpalte), sig = e.p < 0.05;
  const [hoch, tief] = e.z >= 0 ? [e.a, e.b] : [e.b, e.a];
  const ue = e.z >= 0 ? e.ueberlegen : 1 - e.ueberlegen;
  // T2: Bei gleichen Rängen (z = 0, die Hälfte der Paare) nicht „höher“; bei gleichem Median, aber verschiedenen Rängen sagen, wo der Unterschied liegt.
  const gleichAuf = Math.abs(e.z) < 1e-9 || Math.abs(e.ueberlegen - 0.5) < 1e-9, mdGleich = md(hoch.median) === md(tief.median);
  const haupt = gleichAuf
    ? T(`Bei ${was} lagen die Werte der Gruppen ${q(e.a.name)} und ${q(e.b.name)} (${grp}) im Rangvergleich gleich hoch: Median ${md(e.a.median)} gegen ${md(e.b.median)}.`,
      `On ${was}, the groups ${q(e.a.name)} and ${q(e.b.name)} (${grp}) ranked equally high: median ${md(e.a.median)} vs. ${md(e.b.median)}.`)
    : mdGleich
    ? T(`Bei ${was} lagen die Werte der Gruppe ${q(hoch.name)} (${grp}) im Rangvergleich höher als die der Gruppe ${q(tief.name)}, obwohl beide denselben Median haben (${md(hoch.median)}): Der Unterschied liegt außerhalb der Mitte.`,
      `On ${was}, the values of the group ${q(hoch.name)} (${grp}) ranked higher than those of the group ${q(tief.name)}, although both have the same median (${md(hoch.median)}): the difference lies away from the middle.`)
    : T(`Bei ${was} lagen die Werte der Gruppe ${q(hoch.name)} (${grp}) im Rangvergleich höher als die der Gruppe ${q(tief.name)}: Median ${md(hoch.median)} gegen ${md(tief.median)}.`,
      `On ${was}, the values of the group ${q(hoch.name)} (${grp}) ranked higher than those of the group ${q(tief.name)}: median ${md(hoch.median)} vs. ${md(tief.median)}.`);
  const paarSatz = T(`In ${prozent(ue)} aller Paare aus je einer Person je Gruppe liegt der Wert von ${q(hoch.name)} über dem von ${q(tief.name)} (Gleichstand zählt halb).`,
    `In ${prozent(ue)} of all pairs of one person from each group, the value of ${q(hoch.name)} is above that of ${q(tief.name)} (a tie counts half).`);
  const zusatz = sig
    ? T(`Der Unterschied ist ${rWort(e.r)} (r = ${ohneNull(e.r)}, nach üblicher Faustregel). ${paarSatz} Ein mindestens so großer Rangunterschied wäre selten, wenn die Verteilungen in Wahrheit gleich wären (p ${pWert(e.p)}, ${pArt(e.exakt)}).`,
      `The difference is ${rWort(e.r)} (r = ${ohneNull(e.r)}, by a common rule of thumb). ${paarSatz} A rank difference at least this large would be rare if the distributions were truly the same (p ${pWert(e.p)}, ${pArt(e.exakt)}).`)
    : T(`${paarSatz} Ein so großer Rangunterschied kommt aber auch dann nicht selten vor, wenn die Verteilungen in Wahrheit gleich sind (p ${pWert(e.p)}, ${pArt(e.exakt)}). Die Daten belegen den Unterschied darum nicht - das heißt nicht, dass es keinen gibt.`,
      `${paarSatz} A rank difference this large is not unusual even if the distributions are truly the same (p ${pWert(e.p)}, ${pArt(e.exakt)}). So the data do not show a difference - that does not mean there is none.`);
  const vorsicht = T('Der Mann-Whitney-Test braucht keine Normalverteilung. Er vergleicht Ränge und zeigt nicht allein einen Unterschied der Mediane. Ob die Gruppenzugehörigkeit der Grund ist, zeigen diese Daten nicht.',
    'The Mann-Whitney test does not need a normal distribution. It compares ranks and does not show a difference in medians alone. These data do not show whether group membership is the reason.');
  const klein = Math.min(e.a.n, e.b.n);
  // Hodges-Lehmann in Richtung „hoch − tief“, damit der Satz zur Überschrift passt.
  const hl = e.hl ? hlTeile(e.hl, e.z < 0) : null;
  const hlSatz = hl ? (hl.ki
    ? T(` Der Median aller Differenzen zwischen je einer Person aus ${q(hoch.name)} und einer aus ${q(tief.name)} beträgt ${hl.wert} (Hodges-Lehmann-Schätzer, ${hl.ki}).`,
      ` The median of all differences between one person from ${q(hoch.name)} and one from ${q(tief.name)} is ${hl.wert} (Hodges-Lehmann estimate, ${hl.ki}).`)
    : T(` Der Median aller Differenzen zwischen je einer Person aus ${q(hoch.name)} und einer aus ${q(tief.name)} beträgt ${hl.wert} (Hodges-Lehmann-Schätzer).`,
      ` The median of all differences between one person from ${q(hoch.name)} and one from ${q(tief.name)} is ${hl.wert} (Hodges-Lehmann estimate).`)) + hl.hinweis : '';
  return {
    haupt, zusatz: zusatz + hlSatz, vorsicht,
    apa: `U = ${komma(e.u, e.u % 1 ? 1 : 0)}, z = ${komma(Math.abs(e.z))}, p ${pWert(e.p)}, r = ${ohneNull(e.r)}, rrb = ${ohneNull(Math.abs(e.rrb))}${hl ? `, ${hl.apa}` : ''}`,
    marken: [
      { text: `${T('Unterschied', 'Difference')}: ${rWort(e.r)} · r = ${ohneNull(e.r)}`, erklaer: 'rangtest' },
      { text: `p ${pWert(e.p)} (${pArt(e.exakt)})${unter05(sig)}`, erklaer: 'p-wert' },
      { text: T(`Rang-biserial: ${ohneNull(Math.abs(e.rrb))}`, `Rank-biserial: ${ohneNull(Math.abs(e.rrb))}`), erklaer: 'rangtest' },
      { text: T('Rangtest (ohne Normalverteilung)', 'Rank test (no normal distribution)'), erklaer: 'rangtest' },
      ...(klein < 20 ? [{ text: T(`Kleine Gruppe (n = ${klein})`, `Small group (n = ${klein})`), erklaer: 'stichprobe', hinweis: true }] : [])
    ]
  };
}

export function tabellenMannWhitney(e: MannWhitney, label: (s: string) => string): TableItem[] {
  return [
    tabelle('Ranks', T('Ränge und Mediane', 'Ranks and medians'), [label(e.gruppenSpalte), 'n', 'Mdn', T('Mittlerer Rang', 'Mean rank'), T('Rangsumme', 'Sum of ranks')],
      [e.a, e.b].map(g => [g.name, fd(g.n), fx(g.median, 2), fx(g.mittlererRang, 2), fx(g.rangsumme, 1)]),
      [T('Mdn = Median. Die Ränge entstehen über beide Gruppen zusammen; gleiche Werte bekommen den mittleren Rang.', 'Mdn = median. Ranks are formed over both groups together; equal values get the mean rank.')]),
    tabelle('Mann-Whitney U Test', T('Mann-Whitney-U-Test', 'Mann-Whitney U test'), [label(e.abhaengig), 'U', 'z', pKopf(e.exakt), 'r', T('Rang-biserial', 'Rank-biserial'), 'N'],
      [[T('Rangvergleich', 'Rank comparison'), fx(e.u, 1), fx(Math.abs(e.z)), fp(e.p), fx(e.r), fx(Math.abs(e.rrb)), fd(e.n)]],
      [(e.exakt
        ? (e.bindungen
          ? T(`Exakter p-Wert (bedingte Verteilung bei gleichen Werten), zweiseitig; wie R wilcox.test und SPSS „Exakte Signifikanz“, jede Gruppe unter 50. z und r sind die Normalnäherung. `,
            `Exact p value (conditional distribution given the tied values), two-sided; as R wilcox.test and SPSS "Exact Sig.", each group under 50. z and r are the normal approximation. `)
          : T(`Exakter p-Wert (alle Anordnungen der Ränge ausgezählt), zweiseitig; wie R wilcox.test und SPSS „Exakte Signifikanz“, jede Gruppe unter 50. z und r sind die Normalnäherung. `,
            `Exact p value (all arrangements of the ranks counted), two-sided; as R wilcox.test and SPSS "Exact Sig.", each group under 50. z and r are the normal approximation. `))
        : T(`Normalnäherung mit Bindungskorrektur, zweiseitig, ohne Stetigkeitskorrektur (mindestens eine Gruppe hat 50 oder mehr Werte; wie PSPP NPAR TESTS /M-W und R wilcox.test(exact = FALSE, correct = FALSE)). `,
          `Normal approximation with tie correction, two-sided, no continuity correction (at least one group has 50 or more values; as PSPP NPAR TESTS /M-W and R wilcox.test(exact = FALSE, correct = FALSE)). `))
        + T(`U ist der kleinere der beiden Werte. r = |z| / √N. Rang-biserial = 2U/(n₁·n₂) − 1 (Betrag); ${q(e.z >= 0 ? e.a.name : e.b.name)} liegt höher.`,
          `U is the smaller of the two values. r = |z| / √N. Rank-biserial = 2U/(n₁·n₂) − 1 (absolute value); ${q(e.z >= 0 ? e.a.name : e.b.name)} is higher.`)]),
    ...(e.hl ? [tabelle('Hodges-Lehmann Estimate', T('Hodges-Lehmann-Schätzer', 'Hodges-Lehmann estimate'), [T('Differenz', 'Difference'), 'HL', kiKopf(niveauProzent(e.hl), true), kiKopf(niveauProzent(e.hl), false)],
      [[`${e.a.name} − ${e.b.name}`, fx(e.hl.schaetzer), grenze(e.hl.unten), grenze(e.hl.oben)]],
      [T('HL = Hodges-Lehmann-Schätzer: Median aller Differenzen zwischen je einer Person aus der ersten und einer aus der zweiten Gruppe.', 'HL = Hodges-Lehmann estimate: median of all differences between one person from the first and one from the second group.') + ' ' + hlFuss(e.hl)])] : [])
  ];
}

/* ---------------------------------------------------------------- Kruskal-Wallis */
function dunnSatz(e: KruskalWallis, namen: string[]): { satz: string; apa: string; deutlich: DunnPaar[] } {
  const deutlich = e.dunn.filter(x => x.pHolm < 0.05), m = e.dunn.length;
  const lagePaar = (x: { i: number; j: number; z: number }) => T(`${q(namen[x.j]!)} liegt ${x.z > 0 ? L('über', 'above') : L('unter', 'below')} ${q(namen[x.i]!)}`, `${q(namen[x.j]!)} is ${x.z > 0 ? L('über', 'above') : L('unter', 'below')} ${q(namen[x.i]!)}`);
  const satz = deutlich.length === 0
    ? T(` Nach dem Paarvergleich (Dunn, Holm-angepasst) ist kein einzelnes Paar von Gruppen deutlich verschieden.`, ` After the pairwise comparison (Dunn, Holm-adjusted), no single pair of groups differs clearly.`)
    : deutlich.length <= 3
      ? T(` Nach dem Paarvergleich (Dunn, Holm-angepasst für alle ${m} Paare) unterscheiden sich deutlich: ${deutlich.map(lagePaar).join('; ')}.`,
        ` After the pairwise comparison (Dunn, Holm-adjusted for all ${m} pairs), these differ clearly: ${deutlich.map(lagePaar).join('; ')}.`)
      : T(` Nach dem Paarvergleich (Dunn, Holm-angepasst für alle ${m} Paare) unterscheiden sich ${deutlich.length} von ${m} Paaren deutlich (Tabelle).`, ` After the pairwise comparison (Dunn, Holm-adjusted for all ${m} pairs), ${deutlich.length} of ${m} pairs differ clearly (table).`);
  const apa = deutlich.length === 0 ? `; Dunn (Holm): ${T('kein Paar mit p < ,05', 'no pair with p < .05')}`
    : deutlich.length <= 4 ? `; Dunn (Holm): ${deutlich.map(x => `${kurz(namen[x.j]!, 20)} - ${kurz(namen[x.i]!, 20)} (p ${pWert(x.pHolm)})`).join(', ')}`
      : `; Dunn (Holm): ${T(`${deutlich.length} von ${m} Paaren mit p < ,05`, `${deutlich.length} of ${m} pairs with p < .05`)}`;
  return { satz, apa, deutlich };
}

/** `namen`: Anzeigenamen der Gruppen (Wertebeschriftung), in der Reihenfolge von `e.gruppen`. */
export function saetzeKruskal(e: KruskalWallis, label: (s: string) => string, namen: string[]): Saetze {
  const was = q(label(e.abhaengig)), grp = label(e.gruppenSpalte), sig = e.p < 0.05;
  const ix = e.gruppen.map((_, i) => i).sort((a, b) => e.gruppen[b]!.mittlererRang - e.gruppen[a]!.mittlererRang), hoch = ix[0]!, tief = ix.at(-1)!;
  const haupt = T(`Bei ${was} lagen die Werte der Gruppe ${q(namen[hoch]!)} (${grp}) im Rangvergleich am höchsten (mittlerer Rang ${komma(e.gruppen[hoch]!.mittlererRang, 2)}, Median ${md(e.gruppen[hoch]!.median)}), die der Gruppe ${q(namen[tief]!)} am niedrigsten (mittlerer Rang ${komma(e.gruppen[tief]!.mittlererRang, 2)}, Median ${md(e.gruppen[tief]!.median)}).`,
    `On ${was}, the values of the group ${q(namen[hoch]!)} (${grp}) ranked highest (mean rank ${komma(e.gruppen[hoch]!.mittlererRang, 2)}, median ${md(e.gruppen[hoch]!.median)}) and those of the group ${q(namen[tief]!)} lowest (mean rank ${komma(e.gruppen[tief]!.mittlererRang, 2)}, median ${md(e.gruppen[tief]!.median)}).`);
  const dunn = sig ? dunnSatz(e, namen) : null, wort = eps2Wort(e.eps2);
  const zusatz = (sig
    ? T(`Die Gruppen unterscheiden sich insgesamt; der Unterschied ist ${wort} (ε² = ${ohneNull(e.eps2)}, nach üblicher Faustregel). Ein mindestens so großer Rangunterschied wäre selten, wenn die Verteilungen in Wahrheit gleich wären (p ${pWert(e.p)}).`,
      `The groups differ overall; the difference is ${wort} (ε² = ${ohneNull(e.eps2)}, by a common rule of thumb). A rank difference at least this large would be rare if the distributions were truly the same (p ${pWert(e.p)}).`)
    : T(`Die Unterschiede zwischen den Gruppen sind ${wort} (ε² = ${ohneNull(e.eps2)}) und kommen auch dann nicht selten vor, wenn die Verteilungen in Wahrheit gleich sind (p ${pWert(e.p)}). Die Daten belegen darum keinen Unterschied - das heißt nicht, dass es keinen gibt.`,
      `The differences between the groups are ${wort} (ε² = ${ohneNull(e.eps2)}) and are not unusual even if the distributions are truly the same (p ${pWert(e.p)}). So the data do not show a difference - that does not mean there is none.`)) + (dunn?.satz ?? '');
  const vorsicht = T('Der Kruskal-Wallis-Test braucht keine Normalverteilung. Er vergleicht Ränge und zeigt nicht allein Unterschiede der Mediane. Ob die Gruppenzugehörigkeit der Grund ist, zeigen diese Daten nicht.',
    'The Kruskal-Wallis test does not need a normal distribution. It compares ranks and does not show differences in medians alone. These data do not show whether group membership is the reason.');
  const klein = kleinste(e.gruppen.map(g => g.n));
  return {
    haupt, zusatz, vorsicht,
    apa: `H(${e.df}) = ${komma(e.h)}, p ${pWert(e.p)}, ε² = ${ohneNull(e.eps2)}${dunn?.apa ?? ''}`,
    marken: [
      { text: `${T('Unterschied', 'Difference')}: ${wort} · ε² = ${ohneNull(e.eps2)}`, erklaer: 'rangtest' },
      { text: `p ${pWert(e.p)}${unter05(sig)}`, erklaer: 'p-wert' },
      { text: T('Rangtest (ohne Normalverteilung)', 'Rank test (no normal distribution)'), erklaer: 'rangtest' },
      ...(dunn ? [{ text: T('Paarvergleich: Dunn mit Holm', 'Pairwise comparison: Dunn with Holm'), erklaer: 'rangtest' }] : []),
      ...(klein < 20 ? [{ text: T(`Kleine Gruppe (n = ${klein})`, `Small group (n = ${klein})`), erklaer: 'stichprobe', hinweis: true }] : [])
    ]
  };
}

export function tabellenKruskal(e: KruskalWallis, label: (s: string) => string, namen: string[]): TableItem[] {
  const sig = e.p < 0.05;
  return [
    tabelle('Ranks', T('Ränge und Mediane', 'Ranks and medians'), [label(e.gruppenSpalte), 'n', 'Mdn', T('Mittlerer Rang', 'Mean rank')],
      e.gruppen.map((g, i) => [namen[i]!, fd(g.n), fx(g.median, 2), fx(g.mittlererRang, 2)]),
      [T('Mdn = Median. Die Ränge entstehen über alle Gruppen zusammen; gleiche Werte bekommen den mittleren Rang.', 'Mdn = median. Ranks are formed over all groups together; equal values get the mean rank.')]),
    tabelle('Kruskal-Wallis Test', T('Kruskal-Wallis-Test', 'Kruskal-Wallis test'), [label(e.abhaengig), 'H', 'df', 'p', 'ε²', 'N'],
      [[T('Rangvergleich', 'Rank comparison'), fx(e.h), fd(e.df), fp(e.p), fx(e.eps2), fd(e.n)]],
      [T('H ist χ²-verteilt mit df = Gruppen − 1, mit Bindungskorrektur (wie PSPP NPAR TESTS /K-W und R kruskal.test). ε² = H / (N − 1).', 'H is χ²-distributed with df = groups − 1, with tie correction (as PSPP NPAR TESTS /K-W and R kruskal.test). ε² = H / (N − 1).')]),
    ...(sig ? [tabelle('Dunn Multiple Comparisons', T('Paarvergleiche (Dunn, Holm)', 'Pairwise comparisons (Dunn, Holm)'), [T('Vergleich', 'Comparison'), 'z', T('p (unangepasst)', 'p (unadjusted)'), T('p (Holm)', 'p (Holm)')],
      e.dunn.map(x => [`${namen[x.j]} - ${namen[x.i]}`, fx(x.z), fp(x.p), fp(x.pHolm)]),
      [T(`z > 0: die erste genannte Gruppe hat den höheren mittleren Rang. Dunn-Test mit Bindungskorrektur; die p-Werte sind nach Holm für alle ${e.dunn.length} Paare angepasst.`, `z > 0: the first group named has the higher mean rank. Dunn test with tie correction; the p values are Holm-adjusted for all ${e.dunn.length} pairs.`)])] : [])
  ];
}

/* ---------------------------------------------------------------- Wilcoxon */
export function saetzeWilcoxon(e: Wilcoxon, label: (s: string) => string): Saetze {
  const v = q(label(e.vorher)), na = q(label(e.nachher)), sig = e.p < 0.05, m = e.nPlus + e.nMinus;
  const mdGleich = md(e.medianNachher) === md(e.medianVorher);
  const haupt = e.z === 0 || e.vPlus === e.vMinus
    ? T(`Bei ${na} lag der Wert im Rangvergleich genauso hoch wie bei ${v}: Median ${md(e.medianNachher)} gegen ${md(e.medianVorher)}.`, `On the rank comparison, ${na} was as high as ${v}: median ${md(e.medianNachher)} vs. ${md(e.medianVorher)}.`)
    : mdGleich
    ? (e.z > 0
      ? T(`Bei ${na} lag der Median ebenso hoch wie bei ${v} (${md(e.medianNachher)}), die Veränderungen gingen im Rangvergleich aber eher nach oben.`, `The median of ${na} was as high as that of ${v} (${md(e.medianNachher)}), but on the rank comparison the changes tended to go up.`)
      : T(`Bei ${na} lag der Median ebenso hoch wie bei ${v} (${md(e.medianNachher)}), die Veränderungen gingen im Rangvergleich aber eher nach unten.`, `The median of ${na} was as high as that of ${v} (${md(e.medianNachher)}), but on the rank comparison the changes tended to go down.`))
    : T(`Bei ${na} lag der Wert im Rangvergleich ${e.z > 0 ? L('höher', 'higher') : L('niedriger', 'lower')} als bei ${v}: Median ${md(e.medianNachher)} gegen ${md(e.medianVorher)}.`,
      `On the rank comparison, ${na} was ${e.z > 0 ? L('höher', 'higher') : L('niedriger', 'lower')} than ${v}: median ${md(e.medianNachher)} vs. ${md(e.medianVorher)}.`);
  // Paare ohne Unterschied (Differenz 0) entfallen vor dem Ranken: der Satz nennt, wie viele es sind
  const nullSatz = e.nNull ? Lp(e.nNull,
    `${e.n} Paare, davon ${e.nNull} ohne Unterschied; dieses geht nicht in den Test ein.`, `${e.n} Paare, davon ${e.nNull} ohne Unterschied; diese gehen nicht in den Test ein.`,
    `${e.n} pairs, ${e.nNull} of them without a difference; it is not included in the test.`, `${e.n} pairs, ${e.nNull} of them without a difference; they are not included in the test.`) : '';
  const richtung = T(`Bei ${e.nPlus} von ${m} Personen mit einer Veränderung stieg der Wert, bei ${e.nMinus} sank er.`,
    `For ${e.nPlus} of ${m} people with a change the value rose and for ${e.nMinus} it fell.`) + (nullSatz ? ' ' + nullSatz : '');
  const zusatz = sig
    ? T(`Die Veränderung ist ${rWort(e.r)} (r = ${ohneNull(e.r)}, nach üblicher Faustregel). ${richtung} Eine so deutlich in eine Richtung gehende Veränderung wäre selten, wenn sich in Wahrheit nichts verändert hätte (p ${pWert(e.p)}, ${pArt(e.exakt)}).`,
      `The change is ${rWort(e.r)} (r = ${ohneNull(e.r)}, by a common rule of thumb). ${richtung} A change this consistently in one direction would be rare if nothing had truly changed (p ${pWert(e.p)}, ${pArt(e.exakt)}).`)
    : T(`${richtung} Ein solches Verhältnis von Anstiegen und Rückgängen kommt auch dann nicht selten vor, wenn sich in Wahrheit nichts verändert (p ${pWert(e.p)}, ${pArt(e.exakt)}). Die Daten belegen eine Veränderung darum nicht - das heißt nicht, dass es keine gab.`,
      `${richtung} A balance of increases and decreases like this is not unusual even if nothing has truly changed (p ${pWert(e.p)}, ${pArt(e.exakt)}). So the data do not show a change - that does not mean there was none.`);
  const vorsicht = T('Der Wilcoxon-Test braucht keine normalverteilte Veränderung. Ob etwas Bestimmtes die Veränderung bewirkt hat (etwa ein Kurs), zeigen diese Daten nicht: Ohne Vergleichsgruppe können auch Übung, Zeit oder andere Einflüsse dahinterstecken.',
    'The Wilcoxon test does not need normally distributed changes. These data do not show whether something specific caused the change (such as a course): without a comparison group, practice, time or other influences may be behind it.');
  const hl = e.hl ? hlTeile(e.hl) : null;
  const hlSatz = hl ? (hl.ki
    ? T(` Der Pseudo-Median der Veränderung beträgt ${hl.wert} (Hodges-Lehmann-Schätzer: Median der Mittelwerte aus je zwei Veränderungen, ${hl.ki}).`,
      ` The pseudo-median of the change is ${hl.wert} (Hodges-Lehmann estimate: median of the means of every two changes, ${hl.ki}).`)
    : T(` Der Pseudo-Median der Veränderung beträgt ${hl.wert} (Hodges-Lehmann-Schätzer: Median der Mittelwerte aus je zwei Veränderungen).`,
      ` The pseudo-median of the change is ${hl.wert} (Hodges-Lehmann estimate: median of the means of every two changes).`)) + hl.hinweis : '';
  return {
    haupt, zusatz: zusatz + hlSatz, vorsicht,
    // T32: Teststatistik V (Rangsumme der Anstiege, wie R wilcox.test) vor z.
    apa: `V = ${komma(e.vPlus, e.vPlus % 1 ? 1 : 0)}, z = ${komma(Math.abs(e.z))}, p ${pWert(e.p)}, r = ${ohneNull(e.r)}, rrb = ${ohneNull(Math.abs(e.rrb))}${hl ? `, ${hl.apa}` : ''}`,
    marken: [
      { text: `${T('Veränderung', 'Change')}: ${rWort(e.r)} · r = ${ohneNull(e.r)}`, erklaer: 'rangtest' },
      { text: `p ${pWert(e.p)} (${pArt(e.exakt)})${unter05(sig)}`, erklaer: 'p-wert' },
      { text: T(`Rang-biserial: ${ohneNull(Math.abs(e.rrb))}`, `Rank-biserial: ${ohneNull(Math.abs(e.rrb))}`), erklaer: 'rangtest' },
      { text: T('Rangtest (ohne Normalverteilung)', 'Rank test (no normal distribution)'), erklaer: 'rangtest' },
      ...(e.n < 20 ? [{ text: T(`Kleine Stichprobe (n = ${e.n})`, `Small sample (n = ${e.n})`), erklaer: 'stichprobe', hinweis: true }] : [])
    ]
  };
}

export function tabellenWilcoxon(e: Wilcoxon, label: (s: string) => string): TableItem[] {
  const v = label(e.vorher), na = label(e.nachher);
  return [
    tabelle('Ranks', T('Ränge der Veränderungen', 'Ranks of the changes'), ['', 'n', T('Mittlerer Rang', 'Mean rank'), T('Rangsumme', 'Sum of ranks')],
      [[T(`${na} niedriger als ${v}`, `${na} lower than ${v}`), fd(e.nMinus), fx(e.nMinus ? e.vMinus / e.nMinus : NaN, 2), fx(e.vMinus, 1)],
        [T(`${na} höher als ${v}`, `${na} higher than ${v}`), fd(e.nPlus), fx(e.nPlus ? e.vPlus / e.nPlus : NaN, 2), fx(e.vPlus, 1)],
        [T('Gleich (zählt nicht mit)', 'Equal (does not count)'), fd(e.nNull), '', ''],
        [T('Alle Paare', 'All pairs'), fd(e.n), '', '']],
      [T('Die Ränge gehören zur Größe der Veränderung (ohne Vorzeichen); gleich große Veränderungen bekommen den mittleren Rang.', 'The ranks belong to the size of the change (without sign); equally large changes get the mean rank.')]),
    tabelle('Wilcoxon Signed Ranks Test', T('Wilcoxon-Test', 'Wilcoxon test'), [`Mdn ${v}`, `Mdn ${na}`, T('Mdn Veränderung', 'Mdn change'), 'z', pKopf(e.exakt), 'r', T('Rang-biserial', 'Rank-biserial'), 'n', T('n im Test', 'n in test')],
      [[fx(e.medianVorher), fx(e.medianNachher), fx(e.medianDiff), fx(Math.abs(e.z)), fp(e.p), fx(e.r), fx(Math.abs(e.rrb)), fd(e.n), fd(e.nTest ?? e.n - e.nNull)]],
      [(e.exakt
        ? (e.bindungen
          ? T('Exakter p-Wert (bedingte Verteilung bei gleichen Werten), zweiseitig; wie SPSS „Exakte Signifikanz“: Paare ohne Unterschied entfallen, weniger als 50 Paare im Test. z und r sind die Normalnäherung. ',
            'Exact p value (conditional distribution given the tied values), two-sided; as SPSS "Exact Sig.": pairs without a difference are dropped, fewer than 50 pairs in the test. z and r are the normal approximation. ')
          : T('Exakter p-Wert (alle Vorzeichenverteilungen der Ränge ausgezählt), zweiseitig; wie SPSS „Exakte Signifikanz“: Paare ohne Unterschied entfallen, weniger als 50 Paare im Test. z und r sind die Normalnäherung. ',
            'Exact p value (all sign assignments of the ranks counted), two-sided; as SPSS "Exact Sig.": pairs without a difference are dropped, fewer than 50 pairs in the test. z and r are the normal approximation. '))
        : T('Normalnäherung mit Bindungskorrektur, zweiseitig, ohne Stetigkeitskorrektur (50 oder mehr Paare im Test; wie PSPP NPAR TESTS /WILCOXON und R wilcox.test(paired = TRUE, exact = FALSE, correct = FALSE)). ',
          'Normal approximation with tie correction, two-sided, no continuity correction (50 or more pairs in the test; as PSPP NPAR TESTS /WILCOXON and R wilcox.test(paired = TRUE, exact = FALSE, correct = FALSE)). '))
        + T('Veränderung = nachher − vorher. r = |z| / √n mit n = alle Paare mit beiden Werten. Rang-biserial = (V⁺ − V⁻) / (V⁺ + V⁻) (Betrag).',
          'Change = after − before. r = |z| / √n with n = all pairs with both values. Rank-biserial = (V⁺ − V⁻) / (V⁺ + V⁻) (absolute value).')
        + (e.nNull ? ' ' + Lp(e.nNull,
          `${e.n} Paare, davon ${e.nNull} ohne Unterschied; dieses geht nicht in den Test ein.`, `${e.n} Paare, davon ${e.nNull} ohne Unterschied; diese gehen nicht in den Test ein.`,
          `${e.n} pairs, ${e.nNull} of them without a difference; it is not included in the test.`, `${e.n} pairs, ${e.nNull} of them without a difference; they are not included in the test.`) : '')]),
    ...(e.hl ? [tabelle('Hodges-Lehmann Estimate', T('Hodges-Lehmann-Schätzer', 'Hodges-Lehmann estimate'), [T('Veränderung', 'Change'), T('HL (Pseudo-Median)', 'HL (pseudo-median)'), kiKopf(niveauProzent(e.hl), true), kiKopf(niveauProzent(e.hl), false)],
      [[`${na} − ${v}`, fx(e.hl.schaetzer), grenze(e.hl.unten), grenze(e.hl.oben)]],
      [T('HL = Hodges-Lehmann-Schätzer: Median aller Mittelwerte aus je zwei Veränderungen (Walsh-Mittel, jede Veränderung auch mit sich selbst; Veränderungen von 0 entfallen vorher). Er kann vom Median der Veränderung abweichen.', 'HL = Hodges-Lehmann estimate: median of all means of every two changes (Walsh averages, each change also with itself; changes of 0 are dropped beforehand). It can differ from the median of the change.') + ' ' + hlFuss(e.hl)])] : [])
  ];
}

/* ---------------------------------------------------------------- gemeinsam */
export function saetzeRang(r: RangErgebnis, label: (s: string) => string, gruppenNamen: string[] = []): Saetze {
  if (r.art === 'friedman') return saetzeFriedman(r, label);
  if (r.art === 'vorzeichen' || r.art === 'median' || r.art === 'jt' || r.art === 'ks') return saetzeWeitere(r, label, gruppenNamen);
  return r.art === 'mann-whitney' ? saetzeMannWhitney(r, label) : r.art === 'kruskal-wallis' ? saetzeKruskal(r, label, gruppenNamen) : saetzeWilcoxon(r, label);
}
export function tabellenRang(r: RangErgebnis, label: (s: string) => string, gruppenNamen: string[] = []): TableItem[] {
  if (r.art === 'friedman') return tabellenFriedman(r, label);
  if (r.art === 'vorzeichen' || r.art === 'median' || r.art === 'jt' || r.art === 'ks') return tabellenWeitere(r, label, gruppenNamen);
  return r.art === 'mann-whitney' ? tabellenMannWhitney(r, label) : r.art === 'kruskal-wallis' ? tabellenKruskal(r, label, gruppenNamen) : tabellenWilcoxon(r, label);
}
export const rangTestName = (r: RangErgebnis) => (r.art === 'vorzeichen' || r.art === 'median' || r.art === 'jt' || r.art === 'ks' ? weitereName(r) : r.art === 'friedman' ? 'Friedman-Test' : r.art === 'mann-whitney' ? 'Mann-Whitney-U-Test' : r.art === 'kruskal-wallis' ? 'Kruskal-Wallis-Test' : 'Wilcoxon-Test');
