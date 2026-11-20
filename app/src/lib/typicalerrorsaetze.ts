/**
 * Sätze, APA-Zeile und Tabelle zum Typical Error (Welle 7, M8) als Zusatz zu Bland-Altman bei zwei Zahlenspalten; Zahlen: typicalerror.ts (Hopkins 2000).
 * Der Typical Error gilt für zwei Messungen derselben Personen OHNE Eingriff dazwischen (Test-Retest) - bei zwei Beurteilenden oder Messverfahren vermischt er Unterschiede der Beurteilenden
 * mit dem Messfehler. Die Änderung steht ausdrücklich als „zweite minus erste Messung“ (Hopkins); Bland-Altman rechnet in Statable erste minus zweite - die Beschriftung nennt beides.
 * Der Variationskoeffizient (CV) wird aus den logarithmierten Werten gerechnet, 100·(exp(TE_ln) − 1), und nur, wenn alle Werte größer als 0 sind.
 * Abgrenzung: Der Typical Error ist nicht der Standardmessfehler (SEM) aus der Reliabilität; für die verlässliche Veränderung einer Person dient der Reliable Change Index (Hilfe). ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { ki, proz, zitat as anfuehrung } from '../i18n/profil';
import { komma, kurz, type Saetze } from './ergebnis';
import { tabelle, fx, fd, type Z } from './mwsaetze';
import type { TypicalError } from './typicalerror';

const T = L;
const q = (t: string) => anfuehrung(kurz(t));
type Name = (n: string) => string;
/** Prozent mit einer Stelle, in der Schreibweise der Sprache. */
const pz = (v: number) => proz(komma(v, 1));
const kiT = (a: { lo: number; hi: number }, st = 2) => ki(komma(a.lo, st), komma(a.hi, st));

export interface TeSaetze { text: string; vorsicht: string; apa: string; marke: { text: string; erklaer: string } }

/** Die Sätze zum Typical Error. `a`, `b`: Namen der ersten und zweiten Spalte (erste Messung, zweite Messung). */
export function saetzeTypicalError(te: TypicalError, a: string, b: string): TeSaetze {
  const ersteMess = q(a), zweiteMess = q(b);
  const haupt = T(`Typical Error (zwei Messungen derselben Personen ohne Eingriff, ${ersteMess} und ${zweiteMess}, ${te.n} Fälle): Die Differenzen zwischen den beiden Messungen streuen mit SD = ${komma(te.sdDiff)}; der Messfehler einer einzelnen Messung (Typical Error, TE = SD/√2) beträgt TE = ${komma(te.te.wert)}, ${kiT(te.te)}.`,
    `Typical error (two measurements of the same people without an intervention, ${ersteMess} and ${zweiteMess}, ${te.n} cases): the differences between the two measurements scatter with SD = ${komma(te.sdDiff)}; the measurement error of a single measurement (typical error, TE = SD/√2) is TE = ${komma(te.te.wert)}, ${kiT(te.te)}.`);
  const aend = T(`Änderung des Mittelwerts (zweite minus erste Messung): ${komma(te.aenderung.wert)}, ${kiT(te.aenderung)}. Bland-Altman rechnet erste minus zweite Messung; dort hat dieselbe Zahl das umgekehrte Vorzeichen.`,
    `Change of the mean (second minus first measurement): ${komma(te.aenderung.wert)}, ${kiT(te.aenderung)}. Bland-Altman calculates first minus second measurement; there the same number has the opposite sign.`);
  const cvKi = te.cv ? ki(pz(te.cv.lo), pz(te.cv.hi)) : '';
  const cv = te.cv ? T(`Der Variationskoeffizient beträgt ${pz(te.cv.wert)} (${cvKi}), gerechnet aus den logarithmierten Werten nach Hopkins (2000).`,
    `The coefficient of variation is ${pz(te.cv.wert)} (${cvKi}), calculated from the log-transformed values after Hopkins (2000).`)
    : T('Der Variationskoeffizient ist nicht berechenbar, weil mindestens ein Wert 0 oder kleiner ist (er wird aus den Logarithmen der Werte gerechnet).', 'The coefficient of variation cannot be calculated because at least one value is 0 or below (it is calculated from the logarithms of the values).');
  const vorsicht = T('Der Typical Error gilt nur, wenn sich zwischen den beiden Messungen nichts verändert hat (Test-Retest). Er ist nicht der Standardmessfehler (SEM) aus der Reliabilität; ob sich eine einzelne Person verlässlich verändert hat, zeigt der Reliable Change Index.',
    'The typical error only holds if nothing changed between the two measurements (test-retest). It is not the standard error of measurement (SEM) from the reliability; whether a single person has changed reliably is shown by the Reliable Change Index.')
    + (te.n < 20 ? T(` Bei ${te.n} Fällen ist der Typical Error ungenau (das Intervall ist breit).`, ` With ${te.n} cases the typical error is imprecise (the interval is wide).`) : '');
  const apa = T(`Typical Error: TE = ${komma(te.te.wert)}, ${kiT(te.te)}; Änderung (zweite minus erste Messung) = ${komma(te.aenderung.wert)}, ${kiT(te.aenderung)}${te.cv ? `; CV = ${pz(te.cv.wert)}, ${cvKi}` : ''}`,
    `Typical error: TE = ${komma(te.te.wert)}, ${kiT(te.te)}; change (second minus first measurement) = ${komma(te.aenderung.wert)}, ${kiT(te.aenderung)}${te.cv ? `; CV = ${pz(te.cv.wert)}, ${cvKi}` : ''}`);
  return { text: `${haupt} ${aend} ${cv}`, vorsicht, apa, marke: { text: `TE = ${komma(te.te.wert)}`, erklaer: 'typical-error' } };
}

/** Hängt den Typical Error an die Sätze des ICC-Blatts, wenn er für den Bericht gewählt ist (`an`). */
export function mitTypicalError(st: Saetze, te: TypicalError | undefined, an: boolean | undefined, a: string, b: string): Saetze {
  if (!te || !an) return st;
  const t = saetzeTypicalError(te, a, b);
  return { ...st, zusatz: `${st.zusatz} ${t.text}`, vorsicht: `${st.vorsicht} ${t.vorsicht}`, apa: `${st.apa}; ${t.apa}`, marken: [...st.marken, t.marke] };
}

/** Tabelle zum Typical Error: TE, Änderung (zweite minus erste Messung), SD der Differenzen und CV, mit den Intervallen. */
export function tabellenTypicalError(te: TypicalError | undefined, name: Name, a: string, b: string): TableItem[] {
  if (!te) return [];
  const zeile = (bez: string, w: { wert: number; lo: number; hi: number } | null, d = 2, hinweis = ''): Z[] => [bez, w ? fx(w.wert, d) : hinweis, w ? fx(w.lo, d) : '-', w ? fx(w.hi, d) : '-'];
  return [tabelle('Typical Error', T('Typical Error (Messgenauigkeit bei Wiederholung)', 'Typical error (measurement precision on repetition)'),
    [T('Maß', 'Measure'), T('Wert', 'Value'), T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')],
    [zeile(T('Typical Error (TE)', 'Typical error (TE)'), te.te), zeile(T('Änderung des Mittelwerts (zweite minus erste Messung)', 'Change of the mean (second minus first measurement)'), te.aenderung),
      zeile(T('Variationskoeffizient (CV, %)', 'Coefficient of variation (CV, %)'), te.cv, 1, T('nicht berechenbar (Wert ≤ 0)', 'not calculable (value ≤ 0)')),
      [T('SD der Differenzen', 'SD of the differences'), fx(te.sdDiff), '-', '-'], [T('Fälle (df)', 'Cases (df)'), fd(te.n), fd(te.df), '-']],
    [T(`Erste Messung: ${name(a)}; zweite Messung: ${name(b)}. TE = SD der Differenzen / √2, Intervall über χ² (df = n − 1; Hopkins 2000). Bland-Altman rechnet erste minus zweite Messung: dort hat die Änderung das umgekehrte Vorzeichen. CV = 100 · (exp(TE der ln-Werte) − 1).`,
      `First measurement: ${name(a)}; second measurement: ${name(b)}. TE = SD of the differences / √2, interval via χ² (df = n − 1; Hopkins 2000). Bland-Altman calculates first minus second measurement: there the change has the opposite sign. CV = 100 · (exp(TE of the ln values) − 1).`)])];
}
