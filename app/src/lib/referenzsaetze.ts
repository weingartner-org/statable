/**
 * Sätze und Tabelle zum Referenzbereich (Später, Welle S-D, M7; Rechnen: referenzbereich.ts). Sätze ganz je Fall (übersetzbar), Zahlenformat nur über zahlDe, ohneNull und das Sprachprofil.
 * Die Tabelle nennt immer die Regel der Perzentile (Typ 6) und den Hinweis zu den Referenzpersonen; ein auffälliger Wert wird nur gemeldet, nie entfernt.
 */
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { zahlDe } from './format';
import { komma, ohneNull, pWert } from './ergebnis';
import { iv, zitat } from '../i18n/profil';
import { tabelle, fx, type Z } from './mwsaetze';
import { NORMAL_MIN_N, referenzHinweis, type AusreisserHinweis, type BoxCox, type BoxCoxErgebnis, type NormalErgebnis, type RangErgebnis } from './referenzbereich';

const e1 = (v: number): string => zahlDe(Number.isFinite(v) ? v : 0, 1);
const e2 = (v: number): string => zahlDe(Number.isFinite(v) ? v : 0, 2);
const mitEinheit = (einheit: string) => (einheit ? ` ${einheit}` : '');
/** λ ist nicht auf [−1; 1] beschränkt: ohne führende Null nur unter 1, bei 0 die Zahl 0 selbst. */
const lam = (v: number): string => (Math.abs(v) < 0.005 ? '0' : Math.abs(v) < 1 ? ohneNull(v, 2) : komma(v, 2));

export const begriffeSatz = () => L('Ein Referenzbereich beschreibt Referenzpersonen: Zwischen den beiden Grenzen liegen die mittleren 95 % ihrer Werte. Das Konfidenzintervall sagt, wie genau die beiden Grenzen bestimmt sind. Ein Normwert (T-Wert, Prozentrang) ist etwas anderes.', 'A reference range describes reference individuals: the middle 95% of their values lie between the two limits. The confidence interval says how precisely the two limits are determined. A norm value (T score, percentile rank) is something else.');
export const regelSatz = () => L('Perzentile nach Typ 6 (Rang r = p·(n + 1), lineare Interpolation; wie SPSS „gewichteter Durchschnitt“ und CLSI). Der Typ 7 von R und von PSPP ohne die Option COMPATIBLE gibt andere Grenzen.', 'Percentiles by type 6 (rank r = p·(n + 1), linear interpolation; as SPSS "weighted average" and CLSI). Type 7 of R and of PSPP without the option COMPATIBLE gives different limits.');
export const gruppenSatz = () => L('Bei Unterschieden zwischen Gruppen (zum Beispiel nach Alter oder Geschlecht) werden getrennte Bereiche bestimmt. Statable prüft nicht, ob die Gruppen sich unterscheiden.', 'If groups differ (for example by age or sex), separate ranges are determined. Statable does not test whether the groups differ.');
export const stichprobeSatz = () => referenzHinweis();

/** Hinweis zur Rangmethode in Worten (n zu klein, kein Konfidenzintervall, Gleichstände). */
export function rangHinweisSaetze(e: RangErgebnis): string[] {
  const s: string[] = [];
  if (e.fehler) return s;
  if (e.hinweise.includes('n-zu-klein') && e.n >= NORMAL_MIN_N) s.push(L(`Mit der Normalverteilung (oder Box-Cox) gibt es ab ${NORMAL_MIN_N} Werten einen Bereich mit Konfidenzintervall.`, `With the normal distribution (or Box-Cox) there is a range with a confidence interval from ${NORMAL_MIN_N} values.`));
  if (e.hinweise.includes('ki-nicht-moeglich')) s.push(L(`Mit der Normalverteilung (oder Box-Cox) gibt es ab ${NORMAL_MIN_N} Werten ein Konfidenzintervall der Grenzen.`, `With the normal distribution (or Box-Cox) there is a confidence interval of the limits from ${NORMAL_MIN_N} values.`));
  if (e.hinweise.includes('ganzzahlig')) s.push(L('Alle Werte sind ganze Zahlen. Es gibt viele Gleichstände; die Intervalle der Ränge bleiben gültig, die Grenzen liegen aber auf einem gemessenen Wert.', 'All values are whole numbers. There are many ties; the intervals of the ranks remain valid, but the limits lie on a measured value.'));
  if (e.ausgeschlossen > 0) s.push(Lp(e.ausgeschlossen, `${e.ausgeschlossen} Zeile ohne Wert ist nicht berücksichtigt (n = ${e.n}).`, `${e.ausgeschlossen} Zeilen ohne Wert sind nicht berücksichtigt (n = ${e.n}).`, `${e.ausgeschlossen} row without a value is not taken into account (n = ${e.n}).`, `${e.ausgeschlossen} rows without a value are not taken into account (n = ${e.n}).`));
  return s;
}

/** Der ganze Satz zum parametrischen Bereich. */
export function satzReferenzNormal(e: NormalErgebnis, einheit = ''): string {
  if (e.fehler === 'n-zu-klein') return L(`Mit n = ${e.n} lässt sich der parametrische Bereich nicht bestimmen: Dafür braucht es mindestens ${NORMAL_MIN_N} Werte.`, `With n = ${e.n} the parametric range cannot be determined: it needs at least ${NORMAL_MIN_N} values.`);
  if (e.fehler === 'alle-gleich') return L('Alle Werte sind gleich. Daraus lässt sich kein Referenzbereich bestimmen.', 'All values are equal. No reference range can be determined from them.');
  if (e.fehler === 'keine-werte') return L('Es gibt keine Werte, aus denen sich ein Referenzbereich bestimmen ließe.', 'There are no values from which a reference range could be determined.');
  const u = mitEinheit(einheit);
  return L(`Der Referenzbereich (2,5. bis 97,5. Perzentil) liegt bei ${e1(e.unten)} bis ${e1(e.oben)}${u} (n = ${e.n} Referenzpersonen; berechnet unter der Annahme einer Normalverteilung). Das 90-%-Konfidenzintervall der unteren Grenze reicht von ${e1(e.kiUnten[0])} bis ${e1(e.kiUnten[1])}, das der oberen Grenze von ${e1(e.kiOben[0])} bis ${e1(e.kiOben[1])} (exakt über die nichtzentrale t-Verteilung).`,
    `The reference range (2.5th to 97.5th percentile) is ${e1(e.unten)} to ${e1(e.oben)}${u} (n = ${e.n} reference individuals; calculated under the assumption of a normal distribution). The 90% confidence interval of the lower limit ranges from ${e1(e.kiUnten[0])} to ${e1(e.kiUnten[1])}, that of the upper limit from ${e1(e.kiOben[0])} to ${e1(e.kiOben[1])} (exact, using the noncentral t distribution).`);
}
/** Die Warnung, wenn die Normalverteilung fraglich ist (Shapiro-Wilk der Werte). */
export function nichtNormalSatz(p: number): string {
  return L(`Die Werte weichen von einer Normalverteilung ab (Shapiro-Wilk, p ${pWert(p)}). Der parametrische Bereich kann dann falsch liegen; eine Box-Cox-Transformation oder die Rangmethode passt womöglich besser.`, `The values depart from a normal distribution (Shapiro-Wilk, p ${pWert(p)}). The parametric range can then be off; a Box-Cox transformation or the rank method may fit better.`);
}
/** λ der Box-Cox-Transformation mit dem Intervall der Likelihood; sagt, ob 0 (Logarithmus) und 1 (keine Transformation) darin liegen, und dass das Konfidenzintervall der Grenzen λ als bekannt behandelt. */
export function lambdaSatz(b: BoxCox, gewaehlt: number): string {
  const [lo, hi] = b.lambdaKi, ohne = lam;
  const kopf = L(`Die Profil-Likelihood schätzt λ = ${ohne(b.lambda)} (95-%-Intervall ${iv(ohne(lo), ohne(hi))}). Gewählt ist λ = ${ohne(gewaehlt)}.`, `The profile likelihood estimates λ = ${ohne(b.lambda)} (95% interval ${iv(ohne(lo), ohne(hi))}). The chosen value is λ = ${ohne(gewaehlt)}.`);
  const null0 = lo <= 0 && 0 <= hi, eins = lo <= 1 && 1 <= hi;
  const lage = null0 && eins ? L('Im Intervall liegen 0 (Logarithmus) und 1 (keine Transformation): Die Daten entscheiden nicht zwischen ihnen.', 'The interval contains 0 (logarithm) and 1 (no transformation): the data do not decide between them.')
    : null0 ? L('Im Intervall liegt 0 (Logarithmus), 1 (keine Transformation) liegt außerhalb.', 'The interval contains 0 (logarithm); 1 (no transformation) lies outside.')
    : eins ? L('Im Intervall liegt 1 (keine Transformation), 0 (Logarithmus) liegt außerhalb.', 'The interval contains 1 (no transformation); 0 (logarithm) lies outside.')
    : L('Weder 0 (Logarithmus) noch 1 (keine Transformation) liegt im Intervall.', 'Neither 0 (logarithm) nor 1 (no transformation) lies in the interval.');
  return `${kopf} ${lage} ${L('Das Konfidenzintervall der Grenzen behandelt λ als bekannt; die Unsicherheit der Schätzung von λ steckt nicht darin.', 'The confidence interval of the limits treats λ as known; the uncertainty of estimating λ is not included.')}`;
}
/** Der ganze Satz zum Bereich nach Box-Cox. */
export function satzReferenzBoxCox(r: BoxCoxErgebnis, n: number, einheit = ''): string {
  const u = mitEinheit(einheit), l = lam(r.lambda);
  return L(`Der Referenzbereich (2,5. bis 97,5. Perzentil) liegt bei ${e1(r.unten.orig)} bis ${e1(r.oben.orig)}${u} (n = ${n} Referenzpersonen; Normalverteilung nach Box-Cox-Transformation mit λ = ${l}, zurückgerechnet). Das 90-%-Konfidenzintervall der unteren Grenze reicht von ${e1(r.unten.origKi[0])} bis ${e1(r.unten.origKi[1])}, das der oberen Grenze von ${e1(r.oben.origKi[0])} bis ${e1(r.oben.origKi[1])} (exakt über die nichtzentrale t-Verteilung auf der transformierten Skala).`,
    `The reference range (2.5th to 97.5th percentile) is ${e1(r.unten.orig)} to ${e1(r.oben.orig)}${u} (n = ${n} reference individuals; normal distribution after Box-Cox transformation with λ = ${l}, transformed back). The 90% confidence interval of the lower limit ranges from ${e1(r.unten.origKi[0])} to ${e1(r.unten.origKi[1])}, that of the upper limit from ${e1(r.oben.origKi[0])} to ${e1(r.oben.origKi[1])} (exact, using the noncentral t distribution on the transformed scale).`);
}
export const boxCoxFehlerSatz = (f: 'nicht-positiv' | 'n-zu-klein'): string => (f === 'nicht-positiv'
  ? L('Die Box-Cox-Transformation braucht Werte über 0. Diese Spalte hat Werte von 0 oder darunter.', 'The Box-Cox transformation needs values above 0. This column has values of 0 or below.')
  : L(`Die Box-Cox-Transformation braucht mindestens ${NORMAL_MIN_N} Werte.`, `The Box-Cox transformation needs at least ${NORMAL_MIN_N} values.`));

/** Der Ausreißer-Hinweis nach CLSI in Worten: D/R und Tukey-Zäune; nennt die Zeilen, entfernt nichts. */
export function ausreisserHinweisSaetze(h: AusreisserHinweis): string[] {
  const dr = (v: number) => ohneNull(v, 2), s: string[] = [];
  s.push(h.verdacht
    ? L(`Das Dixon-Verhältnis D/R ist oben ${dr(h.dr.oben)} und unten ${dr(h.dr.unten)}. Ab 1/3 gilt ein Wert als verdächtig (CLSI). Hier besteht ein Verdacht.`, `The Dixon ratio D/R is ${dr(h.dr.oben)} at the top and ${dr(h.dr.unten)} at the bottom. From 1/3 on, a value counts as suspect (CLSI). There is a suspicion here.`)
    : L(`Das Dixon-Verhältnis D/R ist oben ${dr(h.dr.oben)} und unten ${dr(h.dr.unten)}. Ab 1/3 gilt ein Wert als verdächtig (CLSI). Hier besteht kein Verdacht.`, `The Dixon ratio D/R is ${dr(h.dr.oben)} at the top and ${dr(h.dr.unten)} at the bottom. From 1/3 on, a value counts as suspect (CLSI). There is no suspicion here.`));
  const zeilen = [...h.tukey.unten, ...h.tukey.oben];
  const liste = zeilen.join(', ');
  s.push(zeilen.length
    ? L(`Außerhalb der Tukey-Zäune (1,5 · IQR) liegen die Zeilen ${liste}. Bei Normalverteilung sind das etwa 0,7 % der Werte.`, `Outside the Tukey fences (1.5 · IQR) lie the rows ${liste}. With a normal distribution that is about 0.7% of the values.`)
    : L('Kein Wert liegt außerhalb der Tukey-Zäune (1,5 · IQR).', 'No value lies outside the Tukey fences (1.5 · IQR).'));
  s.push(L('Statable entfernt nichts: Der Bereich ist mit allen Werten gerechnet. Ein auffälliger Wert wird nur mit einem Grund entfernt, und der Grund wird dokumentiert.', 'Statable removes nothing: the range is calculated with all values. A conspicuous value is only removed with a reason, and the reason is documented.'));
  s.push(L('Der Daten-Check dieser Seite nutzt eine andere Regel (2,2 · IQR), weil er einen anderen Zweck hat: Er meldet Tippfehler.', 'The data check of this page uses a different rule (2.2 · IQR) because it has a different purpose: it reports typos.'));
  return s;
}

/** Eine Zeile je Grenze: Gruppe (falls es mehrere gibt) · Grenze · Wert · 90-%-Konfidenzintervall · Verfahren. */
export interface BereichZeile { gruppe?: string; art: 'rang' | 'normal' | 'boxcox'; n: number; unten: number | null; oben: number | null; kiUnten: [number, number] | null; kiOben: [number, number] | null }
export function tabelleReferenz(zeilen: BereichZeile[], spalte: string, einheit = ''): TableItem {
  const mitGruppe = zeilen.some(z => z.gruppe !== undefined);
  const verfahren = (a: BereichZeile['art']) => (a === 'rang' ? L('Rangmethode (Typ 6)', 'Rank method (type 6)') : a === 'normal' ? L('Normalverteilung, exakt', 'Normal distribution, exact') : L('Box-Cox, exakt', 'Box-Cox, exact'));
  const ki = (k: [number, number] | null): Z => (k ? `${iv(zahlDe(k[0], 2), zahlDe(k[1], 2))}` : '-');
  const kopf = [...(mitGruppe ? [L('Gruppe', 'Group')] : []), L('Grenze', 'Limit'), 'n', L('Wert', 'Value'), L('90-%-Konfidenzintervall', '90% confidence interval'), L('Verfahren', 'Method')];
  const rows: Z[][] = zeilen.flatMap(z => {
    const g = z.gruppe === undefined ? [] : [z.gruppe];
    return [
      [...g, L('2,5. Perzentil (unten)', '2.5th percentile (lower)'), String(z.n), z.unten === null ? '-' : fx(z.unten, 2), ki(z.kiUnten), verfahren(z.art)],
      [...g, L('97,5. Perzentil (oben)', '97.5th percentile (upper)'), String(z.n), z.oben === null ? '-' : fx(z.oben, 2), ki(z.kiOben), verfahren(z.art)]
    ];
  });
  const titel = einheit ? L(`Referenzbereich für ${zitat(spalte)} (${einheit})`, `Reference range for ${zitat(spalte)} (${einheit})`) : L(`Referenzbereich für ${zitat(spalte)}`, `Reference range for ${zitat(spalte)}`);
  return tabelle('Referenzbereich', titel, kopf, rows, [regelSatz(), referenzHinweis(), L('Das 90-%-Konfidenzintervall zeigt, wie genau die Grenzen bestimmt sind.', 'The 90% confidence interval shows how precisely the limits are determined.')]);
}
