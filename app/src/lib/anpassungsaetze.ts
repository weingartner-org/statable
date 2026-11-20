/**
 * Sätze, APA-Zeile und Tabellen zu den Anpassungstests (Welle 7, T1) in der Karte „Wie verteilt sich etwas?“; Zahlen: anpassung.ts (JavaScript, gegen R und PSPP geprüft).
 *  - Lilliefors-Test (Kolmogorov-Smirnov mit geschätztem Mittelwert und SD) als Zusatz zu Shapiro-Wilk bei Zahlenspalten. Das „Asymp. Sig.“ von PSPP `NPAR TESTS /K-S` (ohne Lilliefors-Korrektur,
 *    zu konservativ) zeigt Statable nie. Ein Test sagt nie „ist normalverteilt“, nur „weicht ab“ bzw. „spricht nicht dagegen“; das Q-Q-Diagramm zeigt mehr.
 *  - χ²-Anpassungstest für Kategorien gegen Gleichverteilung oder eigene Anteile (Cochran-Hinweis: erwartet unter 1 oder mehr als 20 % der Kategorien unter 5 → das p ist unsicher; kein exakter Test).
 * ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { zitat as anfuehrung } from '../i18n/profil';
import { komma, ohneNull, pWert, kurz, type Saetze, type Verteilung, type Haeufigkeit } from './ergebnis';
import { tabelle, fx, fo, fp, fd, type Z } from './mwsaetze';
import { chi2Anpassung, type Chi2Anpassung } from './anpassung';
import { zahlAusText } from './aequirci';

const T = L;
const q = (t: string) => anfuehrung(kurz(t));

/** Anteil oder Gewicht aus dem Eingabefeld: Zahl mit Komma oder Punkt, auch mit „%“; größer als 0. */
export function anteilAusText(t: string): number | null {
  const v = zahlAusText(t.replace(/%/g, '').replace(/\s/g, ''));
  return v !== null && v > 0 ? v : null;
}

export interface AnpassungAnzeige {
  h: Haeufigkeit; r: Chi2Anpassung; eigen: boolean;
  /** Eingabe war da, aber nicht brauchbar (falsche Zahl der Felder, ein Feld leer oder ≤ 0) */ ungueltig: boolean;
  /** die festgelegten Anteile, wie eingegeben („40 : 30 : 20 : 10“); leer bei Gleichverteilung */ anteileText: string;
  /** die Anteile wurden geändert, nachdem schon ein Ergebnis mit eigenen Anteilen da war */ geaendert: boolean }
/** Die Anteile in der Schreibweise des Satzes: „40 : 30 : 20 : 10“. */
export const anteileAlsText = (eingabe: string[]): string => eingabe.map(x => x.trim()).join(' : ');

/** Der χ²-Anpassungstest zu einer Häufigkeitstabelle: mit den eigenen Anteilen (`eingabe`, eine Zahl je Kategorie in der Reihenfolge der Tabelle), sonst gegen die Gleichverteilung. `null`, wenn er nicht rechenbar ist. */
export function anpassungFuer(h: Haeufigkeit, eingabe?: string[], geaendert = false): AnpassungAnzeige | null {
  if (h.werte.length < 2 || h.werte.some(w => !Number.isInteger(w.anzahl) || w.anzahl < 0) || h.werte.reduce((a, w) => a + w.anzahl, 0) === 0) return null;
  const beob = h.werte.map(w => w.anzahl);
  const anteile = eingabe && eingabe.length === h.werte.length && eingabe.some(x => x.trim() !== '') ? eingabe.map(anteilAusText) : null;
  const gut = anteile !== null && anteile.every((x): x is number => x !== null);
  try { return { h, r: chi2Anpassung(beob, gut ? (anteile as number[]) : undefined), eigen: gut, ungueltig: anteile !== null && !gut, anteileText: gut ? anteileAlsText(eingabe!) : '', geaendert: gut && geaendert }; } catch { return null; }
}

/** Alle Anpassungstests der Häufigkeitstabellen des Blatts - nur für Kategorien, nie für metrische Zahlenspalten mit wenigen Werten. */
export const anpassungen = (e: Verteilung): AnpassungAnzeige[] => e.gruppen.filter(h => h.kategorie !== false).flatMap(h => anpassungFuer(h, e.anteile?.[h.name], !!e.anteileGeaendert?.[h.name]) ?? []);

const chi = (r: Chi2Anpassung) => `χ²(${r.df}, N = ${r.n}) = ${komma(r.chi2)}, p ${pWert(r.p)}`;
const dText = (d: number) => ohneNull(d, 3);

/** Sätze zu einer Häufigkeitstabelle. Jede Richtung ist ein eigener, fester Satz. */
export function anpassungSatz(a: AnpassungAnzeige): string[] {
  const { r, h } = a, n = q(h.name), sig = r.p < 0.05, k = r.k;
  const staerkster = r.stdResiduen.reduce((best, v, i) => (Math.abs(v) > Math.abs(r.stdResiduen[best]!) ? i : best), 0);
  const w = h.werte[staerkster]!;
  const dazu = sig ? T(`Am stärksten weicht ${q(w.name)} ab (beobachtet ${w.anzahl}, erwartet ${komma(r.erwartet[staerkster]!, r.erwartet[staerkster]! < 10 ? 1 : 0)}).`, `${q(w.name)} deviates most (observed ${w.anzahl}, expected ${komma(r.erwartet[staerkster]!, r.erwartet[staerkster]! < 10 ? 1 : 0)}).`) : '';
  // nach dem Ergebnis geänderte Anteile sind nicht mehr „vorab festgelegt“: ganze Sätze je Fall, ohne dieses Wort
  const haupt = a.eigen && a.geaendert
    ? (sig ? T(`Die Häufigkeiten bei ${n} weichen signifikant von den angegebenen Anteilen ab (χ²-Anpassungstest gegen die Anteile ${a.anteileText}, ${chi(r)}).`, `The frequencies for ${n} deviate significantly from the stated proportions (chi-square goodness-of-fit test against the proportions ${a.anteileText}, ${chi(r)}).`)
      : T(`Die Häufigkeiten bei ${n} weichen nicht signifikant von den angegebenen Anteilen ab (χ²-Anpassungstest gegen die Anteile ${a.anteileText}, ${chi(r)}). Das belegt nicht, dass die Anteile stimmen - die Daten sprechen nur nicht dagegen.`, `The frequencies for ${n} do not deviate significantly from the stated proportions (chi-square goodness-of-fit test against the proportions ${a.anteileText}, ${chi(r)}). That does not show that the proportions are right - the data merely do not speak against them.`))
    : a.eigen
    ? (sig ? T(`Die Häufigkeiten bei ${n} weichen signifikant von den vorab festgelegten Anteilen ab (χ²-Anpassungstest gegen vorab festgelegte Anteile ${a.anteileText}, ${chi(r)}).`, `The frequencies for ${n} deviate significantly from the proportions fixed beforehand (chi-square goodness-of-fit test against proportions fixed beforehand ${a.anteileText}, ${chi(r)}).`)
      : T(`Die Häufigkeiten bei ${n} weichen nicht signifikant von den vorab festgelegten Anteilen ab (χ²-Anpassungstest gegen vorab festgelegte Anteile ${a.anteileText}, ${chi(r)}). Das belegt nicht, dass die Anteile stimmen - die Daten sprechen nur nicht dagegen.`, `The frequencies for ${n} do not deviate significantly from the proportions fixed beforehand (chi-square goodness-of-fit test against proportions fixed beforehand ${a.anteileText}, ${chi(r)}). That does not show that the proportions are right - the data merely do not speak against them.`))
    : (sig ? T(`Die ${k} Antworten bei ${n} sind nicht gleichmäßig verteilt: Die Häufigkeiten weichen signifikant von einer Gleichverteilung ab (χ²-Anpassungstest, ${chi(r)}).`, `The ${k} answers for ${n} are not evenly distributed: the frequencies deviate significantly from a uniform distribution (chi-square goodness-of-fit test, ${chi(r)}).`)
      : T(`Die Häufigkeiten bei ${n} weichen nicht signifikant von einer Gleichverteilung ab (χ²-Anpassungstest, ${chi(r)}). Das belegt keine Gleichverteilung - die Daten sprechen nur nicht dagegen.`, `The frequencies for ${n} do not deviate significantly from a uniform distribution (chi-square goodness-of-fit test, ${chi(r)}). That does not show a uniform distribution - the data merely do not speak against it.`));
  // Hinweis zuerst: nach dem Ergebnis geänderte Anteile sind keine vorab festgelegte Annahme mehr
  const geaendert = a.geaendert ? T('Die Anteile wurden nach dem Ergebnis geändert - das p gilt dann nicht mehr als Test einer vorab festgelegten Annahme.', 'The proportions were changed after the result - the p value then no longer counts as a test of an assumption fixed beforehand.') : '';
  const cochran = r.hinweisStreng
    ? T(`Achtung: Bei ${n} wird in ${r.anzahlUnter5} von ${k} Kategorien weniger als 5 erwartet (kleinster Wert ${komma(r.minErwartet, 1)}). Dann ist der χ²-Test ungenau (Cochran 1954), das p ist unsicher. Abhilfe: seltene Kategorien zusammenfassen.`, `Note: for ${n}, fewer than 5 are expected in ${r.anzahlUnter5} of ${k} categories (smallest value ${komma(r.minErwartet, 1)}). The chi-square test is then inaccurate (Cochran 1954), so the p value is uncertain. Remedy: combine rare categories.`)
    : r.hinweisUnter5 ? T(`Bei ${n} wird in ${r.anzahlUnter5} von ${k} Kategorien weniger als 5 erwartet; das ist noch unkritisch (Cochran 1954: höchstens jede fünfte Kategorie).`, `For ${n}, fewer than 5 are expected in ${r.anzahlUnter5} of ${k} categories; this is still acceptable (Cochran 1954: at most one category in five).`) : '';
  const ungueltig = a.ungueltig ? T(`Die eigenen Anteile bei ${n} sind unvollständig oder keine Zahlen größer als 0; Statable rechnet darum gegen die Gleichverteilung.`, `The own proportions for ${n} are incomplete or not numbers above 0; Statable therefore calculates against a uniform distribution.`) : '';
  return [geaendert, ungueltig, haupt, dazu, cochran].filter(Boolean);
}

/** Sätze zu Lilliefors bei einer Zahlenspalte. */
export function lillieSatz(z: Verteilung['zahlen'][number]): string {
  const l = z.lil!, nm = q(z.name), werte = `D = ${dText(l.d)}, p ${pWert(l.p)}`;
  return l.p < 0.05 ? T(`Bei ${nm} weicht die Verteilung nach dem Lilliefors-Test von einer Normalverteilung ab (${werte}).`, `${nm}: the distribution departs from a normal distribution according to the Lilliefors test (${werte}).`)
    : T(`Bei ${nm} spricht der Lilliefors-Test nicht gegen eine Normalverteilung (${werte}).`, `${nm}: the Lilliefors test does not indicate a departure from a normal distribution (${werte}).`);
}

/** APA-Zeile: die festgelegten Anteile nennen, und wenn sie nach dem Ergebnis geändert wurden, auch das. */
const apaAnteile = (a: AnpassungAnzeige): string => (!a.eigen ? '' : a.geaendert
  ? T(` (gegen Anteile ${a.anteileText}, nach dem Ergebnis geändert)`, ` (against proportions ${a.anteileText}, changed after the result)`)
  : T(` (gegen vorab festgelegte Anteile ${a.anteileText})`, ` (against proportions fixed beforehand ${a.anteileText})`));

/** Hängt Lilliefors und die χ²-Anpassungstests an die Sätze der Verteilung. */
export function mitAnpassung(st: Saetze, e: Verteilung): Saetze {
  const lil = e.zahlen.filter(z => z.lil), an = anpassungen(e);
  // metrische Zahlenspalte mit wenigen verschiedenen Werten: kein Normalverteilungstest, aber ein Satz dazu
  const wenige = e.zahlen.filter(z => z.stufen && e.gruppen.some(h => h.name === z.name && h.kategorie === false));
  if (!lil.length && !an.length && !wenige.length) return st;
  const zusatz = [...lil.map(lillieSatz), ...wenige.map(z => T(`Bei ${q(z.name)} gibt es nur wenige verschiedene Werte: Mit nur wenigen verschiedenen Werten sagt ein Normalverteilungstest wenig; das Q-Q-Diagramm zeigt mehr.`, `${q(z.name)} has only a few different values: with only a few different values a normality test says little; the Q-Q plot shows more.`)), ...an.flatMap(anpassungSatz)].join(' ');
  // der Hinweis zu Shapiro-Wilk steht schon in den Sätzen der Verteilung: hier nur, wenn Lilliefors allein da ist - nie zweimal
  const vorsicht = [lil.length && !e.zahlen.some(z => z.sw) ? T('Der Lilliefors-Test prüft nur, ob die Daten von einer Normalverteilung abweichen; er belegt keine. Bei wenigen Personen übersieht er große Abweichungen, bei vielen schlägt er schon bei kleinen an - das Q-Q-Diagramm zeigt mehr.', 'The Lilliefors test only tests whether the data depart from a normal distribution; it does not show one. With few people it misses large departures, with many it flags even small ones - the Q-Q plot shows more.') : '',
    an.some(x => x.r.hinweisStreng) ? T('Bei kleinen erwarteten Häufigkeiten ist der χ²-Test ungenau.', 'With small expected frequencies the chi-square test is inaccurate.') : ''].filter(Boolean).join(' ');
  const mehrere = lil.length + an.length > 1;
  const vor = (n: string) => (mehrere ? `${kurz(n, 30)}: ` : '');
  const apa = [...lil.map(z => `${vor(z.name)}Lilliefors D = ${dText(z.lil!.d)}, p ${pWert(z.lil!.p)}`), ...an.map(a => `${vor(a.h.name)}${chi(a.r)}${apaAnteile(a)}`)].join('; ');
  return {
    ...st, zusatz: `${st.zusatz} ${zusatz}`, vorsicht: vorsicht && !st.vorsicht.includes(vorsicht) ? `${st.vorsicht} ${vorsicht}` : st.vorsicht, apa: apa ? `${st.apa}; ${apa}` : st.apa,
    marken: [...st.marken, ...(lil[0] ? [{ text: T(`Normalverteilung (Lilliefors): p ${pWert(lil[0].lil!.p)}`, `Normality (Lilliefors): p ${pWert(lil[0].lil!.p)}`), erklaer: 'lilliefors', hinweis: lil[0].lil!.p < 0.05 }] : []),
      ...(an[0] ? [{ text: T(`Anpassung (χ²): p ${pWert(an[0].r.p)}`, `Goodness of fit (χ²): p ${pWert(an[0].r.p)}`), erklaer: 'chi-quadrat-anpassung', hinweis: an[0].r.hinweisStreng }] : [])]
  };
}

/** Fußnote der Anpassungstabelle: eigene Anteile oder Gleichverteilung (zwei feste Sätze), danach ein fester Hinweis nach Cochran. */
function fuss(a: AnpassungAnzeige): string {
  const r = a.r, c = `χ²(${r.df}, N = ${r.n}) = ${komma(r.chi2)}, p ${pWert(r.p)}`;
  const kopf = a.eigen && a.geaendert ? T(`Angegebene Anteile ${a.anteileText}. ${c}. Ohne Stetigkeitskorrektur; kein exakter Test.`, `Stated proportions ${a.anteileText}. ${c}. No continuity correction; no exact test.`)
    : a.eigen ? T(`Vorab festgelegte Anteile ${a.anteileText}. ${c}. Ohne Stetigkeitskorrektur; kein exakter Test.`, `Proportions fixed beforehand ${a.anteileText}. ${c}. No continuity correction; no exact test.`)
    : T(`Gleichverteilung. ${c}. Ohne Stetigkeitskorrektur; kein exakter Test.`, `Uniform distribution. ${c}. No continuity correction; no exact test.`);
  const warn = r.hinweisStreng ? T('Achtung: erwartete Häufigkeiten unter 1 oder in mehr als 20 % der Kategorien unter 5 (Cochran 1954) - das p ist unsicher.', 'Note: expected frequencies below 1 or below 5 in more than 20% of the categories (Cochran 1954) - the p value is uncertain.') : '';
  const gea = a.geaendert ? T('Die Anteile wurden nach dem Ergebnis geändert - das p gilt dann nicht mehr als Test einer vorab festgelegten Annahme.', 'The proportions were changed after the result - the p value then no longer counts as a test of an assumption fixed beforehand.') : '';
  return `${gea} ${kopf} ${warn}`.trim();
}

/** Tabellen: Tests auf Normalverteilung (Shapiro-Wilk und Lilliefors je Zahlenspalte) und je Häufigkeitstabelle der χ²-Anpassungstest. */
export function tabellenAnpassung(e: Verteilung): TableItem[] {
  const aus: TableItem[] = [];
  const zn = e.zahlen.filter(z => z.sw || z.lil);
  if (zn.length) aus.push(tabelle('Normality Tests', T('Tests auf Normalverteilung', 'Tests of normality'), [T('Spalte', 'Column'), T('Test', 'Test'), T('Statistik', 'Statistic'), 'n', 'p'],
    zn.flatMap(z => [...(z.sw ? [[z.name, 'Shapiro-Wilk (W)', fo(z.sw.w, 3), fd(z.sw.n), fp(z.sw.p)] as Z[]] : []), ...(z.lil ? [[z.name, 'Lilliefors (D)', fo(z.lil.d, 3), fd(z.lil.n), fp(z.lil.p)] as Z[]] : [])]),
    [T('Beide Tests prüfen, ob die Daten von einer Normalverteilung abweichen (p unter ,05). Lilliefors: Kolmogorov-Smirnov mit aus den Daten geschätztem Mittelwert und SD, p-Näherung wie R nortest::lillie.test. Sie belegen keine Normalverteilung.', 'Both tests check whether the data depart from a normal distribution (p below .05). Lilliefors: Kolmogorov-Smirnov with mean and SD estimated from the data, p approximation as in R nortest::lillie.test. They do not show a normal distribution.')]));
  for (const a of anpassungen(e)) {
    const r = a.r;
    aus.push(tabelle('Goodness of Fit', T(`χ²-Anpassungstest: ${a.h.name}`, `Chi-square goodness-of-fit test: ${a.h.name}`), [T('Kategorie', 'Category'), T('Beobachtet', 'Observed'), T('Erwartet', 'Expected'), T('Erwarteter Anteil (%)', 'Expected proportion (%)'), T('Standardisiertes Residuum', 'Standardized residual')],
      a.h.werte.map((w, i) => [w.name, fd(w.anzahl), fx(r.erwartet[i]!, 1), fx(r.anteile[i]! * 100, 1), fx(r.stdResiduen[i]!)] as Z[]),
      [fuss(a)]));
  }
  return aus;
}
