/**
 * Sätze, APA-Zeilen und Tabellen zur ordinalen, multinomialen und Zähldaten-Regression (Welle 3); Zahlen: kategreg.ts (R, webR).
 * Aufbau wie hierregsaetze.ts: haupt, zusatz, vorsicht, apa, marken; die Tabellen sind echte Tabellen (TableItem) und werden bei jedem Aufruf neu gebaut (folgen so der Sprache).
 *
 * Reihenfolge (Fachblatt, Nachtrag): Hinweise, die das Ergebnis einschränken, stehen ZUERST (am Anfang von `haupt`): bei der ordinalen Regression verletzte Parallelität (Brant)
 * bzw. nicht prüfbar, bei Zähldaten die Wahl des Modells (Überdispersion), bei der multinomialen Regression Nicht-Konvergenz; bei allen Trennung, bei Zähldaten Nullen.
 * Wald-Intervalle, „signifikant“ (nie „deutlich“), nicht kausal. Faktor „um den Faktor“ wie bei der logistischen Regression: bei einem Effekt unter 1 der Kehrwert (sinkt um den Faktor 1/OR), der Effekt selbst steht daneben.
 * ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { aufzaehlung, ki, proz, zitat as anfuehrung } from '../i18n/profil';
import { komma, ohneNull, pWert, kurz, unter05, type Saetze } from './ergebnis';
import { tabelle, fx, fo, fp, fd, type Z } from './mwsaetze';
import { spaltenName } from './medmodsaetze';
import { trennungVerdacht, zielStufenPruefung, type KatKoef, type KatLr, type KatPraed, type OrdReg, type MultReg, type ZaehlReg } from './kategreg';

const T = L;
const q = (t: string) => anfuehrung(kurz(t));
type Name = (n: string) => string;
type Erg = OrdReg | MultReg | ZaehlReg;

/** Ein Effekt (OR bzw. IRR) als Zahl: über 999 und unter 0,001 als Schranke („> 999“, „< 0,001“) - in Satz, APA-Zeile und Tabelle gleich. */
const ef = (v: number) => (!Number.isFinite(v) ? '-' : v > 999 ? `> ${komma(999, 0)}` : v < 0.001 ? `< ${komma(0.001, 3)}` : komma(v, v < 0.1 ? 3 : 2));
/** Dasselbe für die Tabellen (Punkt als Dezimalzeichen, die Ausgabe wandelt). */
const efTab = (v: number): Z => (!Number.isFinite(v) ? '-' : v > 999 ? { t: '> 999', n: v } : v < 0.001 ? { t: '< 0.001', n: v } : { t: v.toFixed(v < 0.1 ? 3 : 2), n: v });
/** B und SE in der Tabelle: Zahlen, nie in Exponentialschreibweise; ab einer Million Schranke. */
const bTab = (v: number): Z => (!Number.isFinite(v) ? '-' : Math.abs(v) >= 1e6 ? { t: v > 0 ? '> 999999' : '< -999999', n: v } : fx(v, 3));
/** z in der Tabelle: ab |z| > 999 Schranke (bei Trennung stehen sonst Rohwerte wie 945019481,83). */
const zTab = (v: number): Z => (!Number.isFinite(v) ? '-' : v > 999 ? { t: '> 999', n: v } : v < -999 ? { t: '< −999', n: v } : fx(v)); 
/** „OR = 1,05“ - bei einer Schranke „OR > 999“ (nicht „OR = > 999“). */
const effTxt = (label: 'OR' | 'IRR', v: number) => { const t = ef(v); return /^[<>]/.test(t) ? `${label} ${t}` : `${label} = ${t}`; };
const extrem = (v: number) => /^[<>]/.test(ef(v));
/** Faktor: bei Effekt unter 1 der Kehrwert (nur für OR). */
const faktor = (v: number) => ef(v >= 1 ? v : 1 / v);
const ohneWirkung = (k: KatKoef) => ef(k.effekt) === ef(1);
const sig = (p: number) => Number.isFinite(p) && p < 0.05;
const kiT = (k: KatKoef) => ki(ef(k.kiU), ef(k.kiO));
const wert = (k: KatKoef, label: 'OR' | 'IRR') => `${effTxt(label, k.effekt)}, ${kiT(k)}, p ${pWert(k.p)}`;
const chi = (t: { chi2: number; df: number; p: number }) => `χ²(${komma(t.df, 0)}) = ${komma(t.chi2)}, p ${pWert(t.p)}`;

/** Name eines Prädiktors in Anführungszeichen. */
const pn = (e: Erg, i: number, name: Name) => q(name(e.praed[i]?.name ?? ''));
/** Vergleichsgruppe eines Gruppen-Prädiktors (erste Stufe). */
const gruppenRef = (p: KatPraed) => anfuehrung(p.stufen[0] ?? '');
const koefOhneKonstante = (e: Erg) => e.koef.filter(k => k.pIdx >= 0);
const einPraed = (e: Erg) => e.praed.length === 1;

/** Hinweis „Trennung“: ein Prädiktor trennt die Stufen fast oder ganz, die Schätzung ist dann nicht verlässlich. */
function trennungHinweis(e: Erg, name: Name): string {
  const idx = trennungVerdacht(e.koef);
  if (!idx.length) return '';
  const liste = aufzaehlung(idx.map(i => pn(e, i, name)));
  return Lp(idx.length, `Trennung: Die Schätzung für ${liste} ist nicht verlässlich (sehr große Werte).`, `Trennung: Die Schätzung für ${liste} ist nicht verlässlich (sehr große Werte).`,
    `Separation: the estimate for ${liste} is not reliable (very large values).`, `Separation: the estimates for ${liste} are not reliable (very large values).`);
}

/**
 * Der Satz zu EINEM Koeffizienten: er nennt den Koeffizienten mit seinem Namen und seiner Stufe („‹Stadt› (‹lage›)“), nie eine Aussage über die ganze Spalte -
 * die macht nur der Likelihood-Quotienten-Test je Prädiktor (`lrSatz`). Jede Richtung ist ein eigener, fester Satz (übersetzbar, keine eingesetzten Wörter).
 * Ordinal und multinomial: Faktor wie bei der logistischen Regression (unter 1 der Kehrwert). Zähldaten: „auf das 0,91-Fache“ mit dem Effekt selbst, danach der Prozentsatz.
 */
function koefSatz(e: Erg, k: KatKoef, name: Name): string {
  const p = e.praed[k.pIdx]!, ziel = q(name(e.ziel)), n = pn(e, k.pIdx, name), s = sig(k.p), gruppe = p.art === 'faktor';
  const hoch = k.effekt >= 1, f = faktor(k.effekt), fe = ef(k.effekt);
  const aussage = wert(k, e.art === 'zaehlreg' ? 'IRR' : 'OR');
  const stufe = anfuehrung(k.stufe), ref = gruppenRef(p), wer = gruppe ? `${stufe} (${n})` : n;
  if (e.art === 'ordreg') {
    if (s && extrem(k.effekt)) return T(`Bei ${wer} ändert sich die Chance, eine höhere Stufe von ${ziel} anzugeben, sehr stark (${aussage}); die Schätzung ist nicht verlässlich.`, `For ${wer} the odds of a higher level of ${ziel} change very strongly (${aussage}); the estimate is not reliable.`);
    if (gruppe) {
      if (!s) return T(`Zwischen ${stufe} und ${ref} (${n}) zeigt sich kein signifikanter Unterschied in der Chance, eine höhere Stufe von ${ziel} anzugeben (${aussage}).`, `Between ${stufe} and ${ref} (${n}) there is no significant difference in the odds of a higher level of ${ziel} (${aussage}).`);
      if (hoch) return T(`Bei ${stufe} (${n}) ist die Chance, eine höhere Stufe von ${ziel} anzugeben, gegenüber ${ref} um den Faktor ${f} höher (${aussage}).`, `For ${stufe} (${n}) the odds of a higher level of ${ziel} are ${f} times higher than for ${ref} (${aussage}).`);
      return T(`Bei ${stufe} (${n}) ist die Chance, eine höhere Stufe von ${ziel} anzugeben, gegenüber ${ref} um den Faktor ${f} niedriger (${aussage}).`, `For ${stufe} (${n}) the odds of a higher level of ${ziel} are ${f} times lower than for ${ref} (${aussage}).`);
    }
    if (!s) return T(`Bei ${n} zeigt sich kein signifikanter Zusammenhang mit höheren Stufen von ${ziel} (${aussage}).`, `For ${n} there is no significant relationship with higher levels of ${ziel} (${aussage}).`);
    if (ohneWirkung(k)) return T(`Mit jeder Einheit mehr bei ${n} ändert sich die Chance, eine höhere Stufe von ${ziel} anzugeben, praktisch nicht (${aussage}).`, `With each additional unit of ${n}, the odds of a higher level of ${ziel} hardly change (${aussage}).`);
    if (hoch) return T(`Mit jeder Einheit mehr bei ${n} steigt die Chance, eine höhere Stufe von ${ziel} anzugeben, um den Faktor ${f} (${aussage}).`, `With each additional unit of ${n}, the odds of a higher level of ${ziel} rise by a factor of ${f} (${aussage}).`);
    return T(`Mit jeder Einheit mehr bei ${n} sinkt die Chance, eine höhere Stufe von ${ziel} anzugeben, um den Faktor ${f} (${aussage}).`, `With each additional unit of ${n}, the odds of a higher level of ${ziel} fall by a factor of ${f} (${aussage}).`);
  }
  if (e.art === 'multreg') {
    const kat = anfuehrung(k.kategorie ?? ''), r = anfuehrung(e.referenz);
    if (s && extrem(k.effekt)) return T(`Bei ${wer} ändert sich die Chance für ${kat} gegenüber ${r} sehr stark (${aussage}); die Schätzung ist nicht verlässlich.`, `For ${wer} the odds of ${kat} versus ${r} change very strongly (${aussage}); the estimate is not reliable.`);
    if (gruppe) {
      if (!s) return T(`Zwischen ${stufe} und ${ref} (${n}) zeigt sich kein signifikanter Unterschied in der Chance für ${kat} gegenüber ${r} (${aussage}).`, `Between ${stufe} and ${ref} (${n}) there is no significant difference in the odds of ${kat} versus ${r} (${aussage}).`);
      if (hoch) return T(`Bei ${stufe} (${n}) ist die Chance für ${kat} gegenüber ${r} um den Faktor ${f} höher als bei ${ref} (${aussage}).`, `For ${stufe} (${n}) the odds of ${kat} versus ${r} are ${f} times higher than for ${ref} (${aussage}).`);
      return T(`Bei ${stufe} (${n}) ist die Chance für ${kat} gegenüber ${r} um den Faktor ${f} niedriger als bei ${ref} (${aussage}).`, `For ${stufe} (${n}) the odds of ${kat} versus ${r} are ${f} times lower than for ${ref} (${aussage}).`);
    }
    if (!s) return T(`Bei ${n} zeigt sich kein signifikanter Zusammenhang mit der Chance für ${kat} gegenüber ${r} (${aussage}).`, `For ${n} there is no significant relationship with the odds of ${kat} versus ${r} (${aussage}).`);
    if (ohneWirkung(k)) return T(`Gegenüber ${r} ändert sich mit jeder Einheit mehr bei ${n} die Chance für ${kat} praktisch nicht (${aussage}).`, `Versus ${r}, with each additional unit of ${n} the odds of ${kat} hardly change (${aussage}).`);
    if (hoch) return T(`Gegenüber ${r} steigt mit jeder Einheit mehr bei ${n} die Chance für ${kat} um den Faktor ${f} (${aussage}).`, `Versus ${r}, with each additional unit of ${n} the odds of ${kat} rise by a factor of ${f} (${aussage}).`);
    return T(`Gegenüber ${r} sinkt mit jeder Einheit mehr bei ${n} die Chance für ${kat} um den Faktor ${f} (${aussage}).`, `Versus ${r}, with each additional unit of ${n} the odds of ${kat} fall by a factor of ${f} (${aussage}).`);
  }
  // Zähldaten: „auf das x-Fache“ (der Effekt selbst), danach der Prozentsatz als eigener Satz; die Zeiteinheit (Offset) als eigener Satz
  const z = e as ZaehlReg, pct = Math.round(Math.abs(k.effekt - 1) * 100);
  const zeit = z.offset ? ' ' + T(`Das gilt je Einheit von ${q(name(z.offset))}.`, `This holds per unit of ${q(name(z.offset))}.`) : '';
  const mehr = pct > 0 && k.effekt < 10 ? ' ' + (hoch ? T(`Das sind etwa ${pct} % mehr.`, `That is about ${pct}% more.`) : T(`Das sind etwa ${pct} % weniger.`, `That is about ${pct}% less.`)) : '';
  if (s && extrem(k.effekt)) return T(`Bei ${wer} ändert sich die erwartete Zahl ${ziel} sehr stark (${aussage}); die Schätzung ist nicht verlässlich.`, `For ${wer} the expected number of ${ziel} changes very strongly (${aussage}); the estimate is not reliable.`) + zeit;
  if (gruppe) {
    if (!s) return T(`Zwischen ${stufe} und ${ref} (${n}) zeigt sich kein signifikanter Unterschied in der erwarteten Zahl ${ziel} (${aussage}).`, `Between ${stufe} and ${ref} (${n}) there is no significant difference in the expected number of ${ziel} (${aussage}).`) + zeit;
    if (hoch) return T(`Bei ${stufe} (${n}) beträgt die erwartete Zahl ${ziel} das ${fe}-Fache der bei ${ref} (${aussage}).`, `For ${stufe} (${n}) the expected number of ${ziel} is ${fe} times that for ${ref} (${aussage}).`) + mehr + zeit;
    return T(`Bei ${stufe} (${n}) beträgt die erwartete Zahl ${ziel} nur das ${fe}-Fache der bei ${ref} (${aussage}).`, `For ${stufe} (${n}) the expected number of ${ziel} is only ${fe} times that for ${ref} (${aussage}).`) + mehr + zeit;
  }
  if (!s) return T(`Bei ${n} zeigt sich kein signifikanter Zusammenhang mit der erwarteten Zahl ${ziel} (${aussage}).`, `For ${n} there is no significant relationship with the expected number of ${ziel} (${aussage}).`) + zeit;
  if (ohneWirkung(k)) return T(`Pro zusätzlicher Einheit ${n} ändert sich die erwartete Zahl ${ziel} praktisch nicht (${aussage}).`, `Per additional unit of ${n}, the expected number of ${ziel} hardly changes (${aussage}).`) + zeit;
  if (hoch) return T(`Pro zusätzlicher Einheit ${n} steigt die erwartete Zahl ${ziel} auf das ${fe}-Fache (${aussage}).`, `Per additional unit of ${n}, the expected number of ${ziel} rises to ${fe} times (${aussage}).`) + mehr + zeit;
  return T(`Pro zusätzlicher Einheit ${n} sinkt die erwartete Zahl ${ziel} auf das ${fe}-Fache (${aussage}).`, `Per additional unit of ${n}, the expected number of ${ziel} falls to ${fe} times (${aussage}).`) + mehr + zeit;
}

/** Satz zum Beitrag eines Prädiktors als Ganzes (Likelihood-Quotienten-Test) - die einzige Aussage über eine ganze Spalte. */
function lrSatz(e: Erg, l: KatLr, name: Name): string {
  const n = pn(e, l.pIdx, name), s = sig(l.p), c = chi(l);
  if (s && l.unsicher) return T(`${n} trägt insgesamt signifikant zur Vorhersage bei, ${c} (unsicher).`, `${n} contributes significantly to the prediction overall, ${c} (uncertain).`);
  if (s) return T(`${n} trägt insgesamt signifikant zur Vorhersage bei, ${c}.`, `${n} contributes significantly to the prediction overall, ${c}.`);
  if (l.unsicher) return T(`${n} trägt insgesamt nicht signifikant zur Vorhersage bei, ${c} (unsicher).`, `${n} does not contribute significantly to the prediction overall, ${c} (uncertain).`);
  return T(`${n} trägt insgesamt nicht signifikant zur Vorhersage bei, ${c}.`, `${n} does not contribute significantly to the prediction overall, ${c}.`);
}

/** Zusatzzeilen für alle drei: Modelltest (und Pseudo-R²), Beitrag je Prädiktor (LR-Test), Einzelsätze der signifikanten Koeffizienten (mit eigenem Namen und eigener Stufe). */
function gemeinsamerKern(e: Erg, name: Name, mitEinzelnen: KatKoef[]): { modell: string; beitraege: string; einzeln: string } {
  const m = e.modelltest, s = sig(m.p), c = chi(m);
  const nk = e.art === 'zaehlreg' ? '' : T(`Nagelkerkes R² = ${ohneNull((e as OrdReg).nagelkerke)} ist ein Pseudo-R²: nicht wie das R² der linearen Regression als erklärter Anteil zu lesen.`, `Nagelkerke R² = ${ohneNull((e as OrdReg).nagelkerke)} is a pseudo R²: not to be read like the R² of linear regression as a share explained.`);
  const unsicher = m.unsicher ? T('Die Schätzung ist unsicher.', 'The estimate is uncertain.') : '';
  const satz = s
    ? T(`Das Modell passt signifikant besser zu den Daten als ein Modell ohne Prädiktoren (Likelihood-Quotienten-Test ${c}).`, `The model fits the data significantly better than a model without predictors (likelihood ratio test ${c}).`)
    : T(`Das Modell passt nicht signifikant besser zu den Daten als ein Modell ohne Prädiktoren (Likelihood-Quotienten-Test ${c}). Die Daten belegen die Vorhersage darum nicht.`, `The model does not fit the data significantly better than a model without predictors (likelihood ratio test ${c}). So the data do not support the prediction.`);
  const modell = [satz, nk, unsicher].filter(Boolean).join(' ');
  const mehrere = e.praed.length > 1 || e.praed.some(p => p.stufen.length > 2) || e.art === 'multreg';
  const beitraege = mehrere ? e.lr.map(l => lrSatz(e, l, name)).join(' ') : '';
  const einzeln = mitEinzelnen.filter(k => sig(k.p)).map(k => koefSatz(e, k, name)).join(' ');
  return { modell, beitraege, einzeln };
}

/** Fälle: gültige Fälle und ausgelassene Zeilen, zwei feste Sätze. */
const faelle = (e: Erg) => [T(`Gerechnet wurde mit ${e.n} Fällen.`, `Calculated with ${e.n} cases.`),
  e.ausgelassen > 0 ? Lp(e.ausgelassen, 'Eine Zeile mit einer Lücke wurde ausgelassen.', `${e.ausgelassen} Zeilen mit Lücken wurden ausgelassen.`, 'One row with a gap was left out.', `${e.ausgelassen} rows with gaps were left out.`) : ''].filter(Boolean).join(' ');

/** Hinweise zu den Zielstufen (wenige Fälle in einer Stufe, mehr als 10 Stufen, Faustregel Fälle je Koeffizient): im Ergebnis und im Bericht, nach den einschränkenden Hinweisen. */
function stufenHinweise(e: OrdReg | MultReg): string[] {
  const namen = e.art === 'ordreg' ? e.stufen : [e.referenz, ...e.kategorien];
  const koefJe = e.art === 'multreg' ? e.koef.filter(k => k.pIdx >= 0 && k.kategorie === e.kategorien[0]).length : 0;
  return zielStufenPruefung(e.art, namen.map((text, i) => ({ text, anzahl: e.stufenN[i] ?? 0 })), koefJe).filter(b => ['stufe-wenig', 'viele-stufen', 'faelle-je-koeffizient'].includes(b.code)).map(b => b.text);
}

function uebersicht(e: Erg, name: Name): string {
  const namen = aufzaehlung(e.praed.map((p, i) => pn(e, i, name))), ziel = q(name(e.ziel)), s = sig(e.modelltest.p);
  return e.art === 'zaehlreg'
    ? (s ? T(`Mit ${namen} lässt sich die Zahl ${ziel} signifikant vorhersagen.`, `The number of ${ziel} can be significantly predicted from ${namen}.`) : T(`Mit ${namen} lässt sich die Zahl ${ziel} nicht signifikant vorhersagen.`, `The number of ${ziel} cannot be significantly predicted from ${namen}.`))
    : (s ? T(`Mit ${namen} lässt sich ${ziel} signifikant vorhersagen.`, `${ziel} can be significantly predicted from ${namen}.`) : T(`Mit ${namen} lässt sich ${ziel} nicht signifikant vorhersagen.`, `${ziel} cannot be significantly predicted from ${namen}.`));
}

/* ------------------------------------------------------------------------------------------------ ordinal */

export function saetzeOrdreg(e: OrdReg, name: Name = spaltenName): Saetze {
  const ziel = q(name(e.ziel)), hinweise: string[] = [];
  // 1. Parallelität (Brant)
  if (e.brant && sig(e.brant.gesamt.p)) {
    const einzeln = e.brant.praed.filter(b => sig(b.p));
    const wer = einzeln.length ? aufzaehlung(einzeln.map(b => pn(e, b.pIdx, name))) : '';
    hinweise.push(einzeln.length
      ? Lp(einzeln.length,
        `Die Annahme paralleler Linien ist verletzt (Brant-Test ${chi(e.brant.gesamt)}): Die Wirkung von ${wer} ist nicht über alle Stufen gleich. Ein einziges OR fasst sie dann nur ungenau zusammen.`,
        `Die Annahme paralleler Linien ist verletzt (Brant-Test ${chi(e.brant.gesamt)}): Die Wirkung von ${wer} ist nicht über alle Stufen gleich. Ein einziges OR fasst sie dann nur ungenau zusammen.`,
        `The parallel-lines assumption is violated (Brant test ${chi(e.brant.gesamt)}): the effect of ${wer} is not the same across all levels. A single OR then summarizes it only roughly.`,
        `The parallel-lines assumption is violated (Brant test ${chi(e.brant.gesamt)}): the effect of ${wer} is not the same across all levels. A single OR then summarizes it only roughly.`)
      : T(`Die Annahme paralleler Linien ist verletzt (Brant-Test ${chi(e.brant.gesamt)}): Die Wirkung mindestens einer Vorhersagegröße ist nicht über alle Stufen gleich. Ein einziges OR fasst sie dann nur ungenau zusammen.`,
        `The parallel-lines assumption is violated (Brant test ${chi(e.brant.gesamt)}): the effect of at least one predictor is not the same across all levels. A single OR then summarizes it only roughly.`));
  } else if (!e.brant) hinweise.push(T('Die Annahme paralleler Linien lässt sich mit diesen Daten nicht prüfen.', 'The parallel-lines assumption cannot be checked with these data.'));
  const tr = trennungHinweis(e, name); if (tr) hinweise.push(tr);
  // 2. der Ergebnissatz
  const koef = koefOhneKonstante(e), einfach = einPraed(e) && koef.length === 1;
  const kern = einfach ? koefSatz(e, koef[0]!, name) : uebersicht(e, name);
  const haupt = [...hinweise, ...stufenHinweise(e), kern].join(' ');
  const k = gemeinsamerKern(e, name, einfach ? [] : koef);
  const stufenZeile = T(`Die Stufen von ${ziel} gehen von ${anfuehrung(e.stufen[0]!)} bis ${anfuehrung(e.stufen.at(-1)!)}; Gruppen werden mit ihrer ersten Stufe verglichen.`, `The levels of ${ziel} run from ${anfuehrung(e.stufen[0]!)} to ${anfuehrung(e.stufen.at(-1)!)}; groups are compared with their first level.`);
  const brantOk = e.brant && !sig(e.brant.gesamt.p) ? T(`Die Annahme paralleler Linien wird nicht verworfen (Brant-Test ${chi(e.brant.gesamt)}).`, `The parallel-lines assumption is not rejected (Brant test ${chi(e.brant.gesamt)}).`) : '';
  const zusatz = [k.modell, k.beitraege, k.einzeln, brantOk, stufenZeile, faelle(e)].filter(Boolean).join('\n');
  const vorsicht = T('Ein OR ist kein Verhältnis von Wahrscheinlichkeiten: 1 heißt kein Zusammenhang, und liegt 1 im Intervall, ist ein Zusammenhang nicht belegt. Das Modell beschreibt Zusammenhänge, keine Ursachen.',
    'An OR is not a ratio of probabilities: 1 means no relationship, and if 1 lies within the interval, a relationship is not shown. The model describes relationships, not causes.');
  const apaKoef = koef.map(x => { const p = e.praed[x.pIdx]!; return `${kurz(name(p.name), 30)}${p.art === 'faktor' ? ` (${x.stufe})` : ''}: ${wert(x, 'OR')}`; });
  const apa = `${chi(e.modelltest)}, Nagelkerke R² = ${ohneNull(e.nagelkerke)}; ${apaKoef.join('; ')}${e.brant ? `; Brant ${chi(e.brant.gesamt)}` : ''}`;
  return { haupt, zusatz, vorsicht, apa, marken: [
    { text: T(`Nagelkerkes R² = ${ohneNull(e.nagelkerke)} (Pseudo-R²)`, `Nagelkerke R² = ${ohneNull(e.nagelkerke)} (pseudo R²)`), erklaer: 'ordinale-regression' },
    { text: `p ${pWert(e.modelltest.p)}${unter05(sig(e.modelltest.p))}`, erklaer: 'p-wert' },
    ...(e.brant ? [{ text: `Brant: p ${pWert(e.brant.gesamt.p)}`, erklaer: 'ordinale-regression', hinweis: sig(e.brant.gesamt.p) }] : [{ text: T('Parallele Linien: nicht prüfbar', 'Parallel lines: cannot be checked'), erklaer: 'ordinale-regression', hinweis: true }]),
    { text: T(`${e.n} Fälle`, `${e.n} cases`), erklaer: 'stichprobe' }
  ] };
}

/* ------------------------------------------------------------------------------------------------ multinomial */

export function saetzeMultreg(e: MultReg, name: Name = spaltenName): Saetze {
  const ziel = q(name(e.ziel)), ref = anfuehrung(e.referenz), hinweise: string[] = [];
  if (!e.konvergiert) hinweise.push(T('Die Schätzung ist nicht sicher zu Ende gekommen; die Zahlen sind nicht verlässlich - meist trennt ein Prädiktor die Kategorien.', 'The estimation did not finish reliably; the numbers are not reliable - usually a predictor separates the categories.'));
  const tr = trennungHinweis(e, name); if (tr) hinweise.push(tr);
  const koef = koefOhneKonstante(e);
  const modellSatz = sig(e.modelltest.p)
    ? T(`Mit ${aufzaehlung(e.praed.map((_, i) => pn(e, i, name)))} lässt sich ${ziel} signifikant vorhersagen (Vergleich mit ${ref}).`, `${ziel} can be significantly predicted from ${aufzaehlung(e.praed.map((_, i) => pn(e, i, name)))} (compared with ${ref}).`)
    : T(`Mit ${aufzaehlung(e.praed.map((_, i) => pn(e, i, name)))} lässt sich ${ziel} nicht signifikant vorhersagen (Vergleich mit ${ref}).`, `${ziel} cannot be significantly predicted from ${aufzaehlung(e.praed.map((_, i) => pn(e, i, name)))} (compared with ${ref}).`);
  // je Prädiktor zuerst der Likelihood-Quotienten-Test, dann die Einzel-OR
  const beitraege = e.lr.map(l => lrSatz(e, l, name));
  const haupt = [...hinweise, ...stufenHinweise(e), e.praed.length === 1 ? beitraege[0] ?? modellSatz : modellSatz].join(' ');
  const k = gemeinsamerKern(e, name, koef);
  const zusatz = [k.modell, e.praed.length === 1 ? '' : k.beitraege, k.einzeln,
    T(`Jede Kategorie von ${ziel} wird mit ${ref} verglichen (Vergleichskategorie); gerechnet wurde mit den Kategorien ${aufzaehlung(e.kategorien.map(x => anfuehrung(x)))}.`, `Every category of ${ziel} is compared with ${ref} (reference category); the categories calculated were ${aufzaehlung(e.kategorien.map(x => anfuehrung(x)))}.`),
    faelle(e)].filter(Boolean).join('\n');
  const vorsicht = T('Ein OR vergleicht die Chance für eine Kategorie mit der für die Vergleichskategorie, nicht Wahrscheinlichkeiten. Andere Vergleichskategorie, andere OR - die Anpassung bleibt gleich. Das Modell beschreibt Zusammenhänge, keine Ursachen.',
    'An OR compares the odds for one category with those for the reference category, not probabilities. A different reference category gives different ORs - the fit stays the same. The model describes relationships, not causes.');
  const apa = `${chi(e.modelltest)}, Nagelkerke R² = ${ohneNull(e.nagelkerke)}; ${e.lr.map(l => `${kurz(name(e.praed[l.pIdx]!.name), 30)}: ${chi(l)}`).join('; ')}`;
  return { haupt, zusatz, vorsicht, apa, marken: [
    { text: T(`Nagelkerkes R² = ${ohneNull(e.nagelkerke)} (Pseudo-R²)`, `Nagelkerke R² = ${ohneNull(e.nagelkerke)} (pseudo R²)`), erklaer: 'multinomiale-regression' },
    { text: `p ${pWert(e.modelltest.p)}${unter05(sig(e.modelltest.p))}`, erklaer: 'p-wert' },
    { text: T(`Vergleich mit ${ref}`, `Compared with ${ref}`), erklaer: 'multinomiale-regression' },
    ...(!e.konvergiert ? [{ text: T('Nicht sicher zu Ende gerechnet', 'Not reliably finished'), erklaer: 'multinomiale-regression', hinweis: true }] : []),
    { text: T(`${e.n} Fälle`, `${e.n} cases`), erklaer: 'stichprobe' }
  ] };
}

/* ------------------------------------------------------------------------------------------------ Zähldaten */

/** Das Verfahren in einem Satzteil: für die Frage vor dem Rechnen (`zaehl`: die Wahl, bei „auto“ steht beides) und im Ergebnis. */
export function katFachwort(art: 'ordreg' | 'multreg' | 'zaehlreg', o: { referenz?: string; zaehl?: 'auto' | 'poisson' | 'negbin' } = {}): string {
  if (art === 'ordreg') return T('ordinale Regression (Proportional-Odds-Modell)', 'ordinal regression (proportional-odds model)');
  if (art === 'multreg') return T(`multinomiale logistische Regression, Vergleich mit ${anfuehrung(o.referenz ?? '')}`, `multinomial logistic regression, compared with ${anfuehrung(o.referenz ?? '')}`);
  return o.zaehl === 'negbin' ? T('negativ-binomiale Regression', 'negative binomial regression') : o.zaehl === 'poisson' ? T('Poisson-Regression', 'Poisson regression') : T('Zähldaten-Regression (Poisson oder negativ-binomial)', 'count regression (Poisson or negative binomial)');
}
/** „Gerechnet“-Zeile: das Verfahren, wie es im Blatt und im Bericht genannt wird. */
export function gerechnetText(e: Erg): string {
  return e.art === 'zaehlreg' ? katFachwort('zaehlreg', { zaehl: e.modell }) : katFachwort(e.art, { referenz: e.art === 'multreg' ? e.referenz : undefined });
}

export function saetzeZaehlreg(e: ZaehlReg, name: Name = spaltenName): Saetze {
  const hinweise: string[] = [], lu = e.lrUeber;
  // Modell zuerst: Überdispersion (Modellwechsel), keine Überdispersion, Poisson trotz Überdispersion, θ am Rand. Jeder Fall ein fester Satz, die Zahlen stehen darin.
  if (lu) {
    const pe = komma(e.pearsonDf, 1), lc = komma(lu.chi2, 1), lp = pWert(lu.p);
    if (e.grund === 'ueberdispersion') hinweise.push(T(`Die Werte streuen stärker, als ein Poisson-Modell erlaubt (Pearson χ²/df = ${pe}; LR-Test χ² = ${lc}, p ${lp}). Statable rechnet darum negativ-binomial; mit Poisson wären die p-Werte zu klein.`, `The values vary more than a Poisson model allows (Pearson χ²/df = ${pe}; LR test χ² = ${lc}, p ${lp}). Statable therefore calculates negative binomial; with Poisson the p values would be too small.`));
    else if (e.grund === 'keine_ueberdispersion') hinweise.push(T(`Keine Überdispersion (Pearson χ²/df = ${pe}; LR-Test χ² = ${lc}, p ${lp}): Statable rechnet Poisson.`, `No overdispersion (Pearson χ²/df = ${pe}; LR test χ² = ${lc}, p ${lp}): Statable calculates Poisson.`));
    else if (e.grund === 'theta_am_rand') hinweise.push(T(`Keine Überdispersion erkennbar (Pearson χ²/df = ${pe}; LR-Test χ² = ${lc}, p ${lp}): Statable rechnet Poisson.`, `No overdispersion found (Pearson χ²/df = ${pe}; LR test χ² = ${lc}, p ${lp}): Statable calculates Poisson.`));
    else if (e.modell === 'poisson' && sig(lu.p)) hinweise.push(T(`Poisson wurde gewählt, die Werte streuen aber stärker, als das Modell erlaubt (Pearson χ²/df = ${pe}; LR-Test χ² = ${lc}, p ${lp}). Die p-Werte sind dann zu klein; das negativ-binomiale Modell passt besser.`, `Poisson was chosen, but the values vary more than the model allows (Pearson χ²/df = ${pe}; LR test χ² = ${lc}, p ${lp}). The p values are then too small; the negative binomial model fits better.`));
    else if (e.modell === 'negbin' && e.thetaAmRand) hinweise.push(T(`Das negativ-binomiale Modell wurde gewählt, die Werte zeigen aber keine Überdispersion (Pearson χ²/df = ${pe}; LR-Test χ² = ${lc}, p ${lp}): θ geht gegen unendlich, das Ergebnis gleicht Poisson.`, `The negative binomial model was chosen, but the values show no overdispersion (Pearson χ²/df = ${pe}; LR test χ² = ${lc}, p ${lp}): θ goes towards infinity, the result is the same as Poisson.`));
  } else if (e.grund === 'negbin_fehlt') hinweise.push(T('Das negativ-binomiale Modell ließ sich nicht schätzen; Statable rechnet Poisson. Die p-Werte können zu klein sein, wenn die Werte stärker streuen, als Poisson erlaubt.', 'The negative binomial model could not be estimated; Statable calculates Poisson. The p values may be too small if the values vary more than Poisson allows.'));
  if (!e.konvergiert) hinweise.push(T('Die Schätzung ist nicht sicher zu Ende gekommen; die Zahlen sind nicht verlässlich.', 'The estimation did not finish reliably; the numbers are not reliable.'));
  const tr = trennungHinweis(e, name); if (tr) hinweise.push(tr);
  if (e.nullenHinweis) hinweise.push(T(`Mehr Nullen, als das Modell erwartet (${proz(komma(e.nullen.beobachtet * 100, 0))} beobachtet, ${proz(komma(e.nullen.erwartet * 100, 0))} erwartet) - ein Modell für Null-Überschuss wäre zu prüfen (nicht in Statable).`, `More zeros than the model expects (${proz(komma(e.nullen.beobachtet * 100, 0))} observed, ${proz(komma(e.nullen.erwartet * 100, 0))} expected) - a model for excess zeros would need to be checked (not in Statable).`));
  const koef = koefOhneKonstante(e), einfach = einPraed(e) && koef.length === 1;
  const kern = einfach ? koefSatz(e, koef[0]!, name) : uebersicht(e, name);
  const haupt = [...hinweise, kern].join(' ');
  const k = gemeinsamerKern(e, name, einfach ? [] : koef);
  const theta = e.modell === 'negbin' && e.theta !== null ? T(`θ = ${komma(e.theta)} (SPSS gibt stattdessen α = 1/θ = ${komma(1 / e.theta)} aus).`, `θ = ${komma(e.theta)} (SPSS gives α = 1/θ = ${komma(1 / e.theta)} instead).`) : '';
  const offset = e.offset ? T(`Mit der Beobachtungszeit ${q(name(e.offset))} als Offset: Die Effekte sind Rate-Verhältnisse je Zeiteinheit.`, `With the observation time ${q(name(e.offset))} as offset: the effects are rate ratios per unit of time.`) : '';
  const zusatz = [k.modell, k.beitraege, k.einzeln, theta, offset, faelle(e)].filter(Boolean).join('\n');
  const vorsicht = T('IRR sind Rate-Verhältnisse (exp(B)): 1 heißt kein Zusammenhang. Für Zähldaten gibt Statable kein R² an: Pseudo-R² sind uneinheitlich und werden leicht als erklärter Anteil gelesen. Das Modell beschreibt Zusammenhänge, keine Ursachen.',
    'IRR are rate ratios (exp(B)): 1 means no relationship. For count data Statable gives no R²: pseudo R² measures are inconsistent and are easily read as a share explained. The model describes relationships, not causes.');
  const modellname = e.modell === 'negbin' ? T('negativ-binomiale Regression', 'negative binomial regression') : T('Poisson-Regression', 'Poisson regression');
  const apa = `${modellname}${e.modell === 'negbin' && e.theta !== null ? `, θ = ${komma(e.theta)}` : ''}; ${chi(e.modelltest)}; ${koef.map(x => { const p = e.praed[x.pIdx]!; return `${kurz(name(p.name), 30)}${p.art === 'faktor' ? ` (${x.stufe})` : ''}: ${wert(x, 'IRR')}`; }).join('; ')}`;
  return { haupt, zusatz, vorsicht, apa, marken: [
    { text: modellname, erklaer: 'zaehldaten-regression' },
    { text: `p ${pWert(e.modelltest.p)}${unter05(sig(e.modelltest.p))}`, erklaer: 'p-wert' },
    ...(e.modell === 'negbin' && e.theta !== null ? [{ text: `θ = ${komma(e.theta)}`, erklaer: 'zaehldaten-regression' }] : []),
    ...(e.nullenHinweis ? [{ text: T('Mehr Nullen als erwartet', 'More zeros than expected'), erklaer: 'zaehldaten-regression', hinweis: true }] : []),
    { text: T(`${e.n} Fälle`, `${e.n} cases`), erklaer: 'stichprobe' }
  ] };
}

/* ------------------------------------------------------------------------------------------------ Tabellen */

const konstante = () => T('Konstante', 'Constant');
function koefName(e: Erg, k: KatKoef, name: Name): string {
  if (k.pIdx < 0) return konstante();
  const p = e.praed[k.pIdx]!;
  return p.art === 'faktor' ? T(`${name(p.name)}: ${k.stufe} (gegen ${p.stufen[0]})`, `${name(p.name)}: ${k.stufe} (vs. ${p.stufen[0]})`) : name(p.name);
}
function koefTabelle(e: Erg, name: Name, effekt: string, label: string, titel: string, fuss: string[]): TableItem {
  const mit = e.art === 'multreg';
  const kopf = [...(mit ? [T('Kategorie', 'Category')] : []), T('Prädiktor', 'Predictor'), 'B', 'SE', 'z', 'p', effekt, T('95 %-KI unten', '95% CI lower'), T('95 %-KI oben', '95% CI upper')];
  const zeilen: Z[][] = e.koef.map(k => [...(mit ? [(k.kategorie ?? '')] : []), koefName(e, k, name), bTab(k.b), bTab(k.se), zTab(k.z), fp(k.p), efTab(k.effekt), efTab(k.kiU), efTab(k.kiO)]);
  return tabelle(label, titel, kopf, zeilen, fuss);
}
function lrTabelle(e: Erg, name: Name, label: string, titel: string, fuss: string[]): TableItem {
  const m = e.modelltest;
  const zeile = (l: KatLr): string => { const n = name(e.praed[l.pIdx]!.name); return l.unsicher ? T(`Ohne ${n} gegen mit (unsicher)`, `Without ${n} vs. with (uncertain)`) : T(`Ohne ${n} gegen mit`, `Without ${n} vs. with`); };
  return tabelle(label, titel, [T('Test', 'Test'), 'χ²', 'df', 'p'],
    [[T('Modell gegen Modell ohne Prädiktoren', 'Model vs. model without predictors'), fx(m.chi2), fd(m.df), fp(m.p)], ...e.lr.map(l => [zeile(l), fx(l.chi2), fd(l.df), fp(l.p)])], fuss);
}
const logLik = (e: Erg) => T(`logLik = ${komma(e.loglik)}, logLik ohne Prädiktoren = ${komma(e.loglik0)}.`, `logLik = ${komma(e.loglik)}, logLik without predictors = ${komma(e.loglik0)}.`);

export function tabellenOrdreg(e: OrdReg, name: Name = spaltenName): TableItem[] {
  const Y = name(e.ziel);
  const koef = koefTabelle(e, name, 'OR', 'Ordinal Regression Coefficients', T('Ordinale Regression: Koeffizienten', 'Ordinal regression: coefficients'),
    [T(`Abhängige Größe: ${Y}, Stufen von niedrig nach hoch: ${e.stufen.join(' < ')}; ${e.n} Fälle. Schreibweise logit P(Y ≤ j) = θⱼ − Σ βx wie R MASS::polr und SPSS PLUM: B > 0 heißt, höhere Werte gehen mit höheren Stufen einher. OR = exp(B); 95 %-KI und p nach Wald (Normalverteilung). Gruppen-Spalten: Vergleich mit der ersten Stufe.`,
      `Dependent variable: ${Y}, levels from low to high: ${e.stufen.join(' < ')}; ${e.n} cases. Written as logit P(Y ≤ j) = θⱼ − Σ βx like R MASS::polr and SPSS PLUM: B > 0 means higher values go with higher levels. OR = exp(B); 95% CI and p by Wald (normal distribution). Group columns: compared with the first level.`)]);
  const schwellen = tabelle('Ordinal Regression Thresholds', T('Ordinale Regression: Schwellen', 'Ordinal regression: thresholds'), [T('Schwelle', 'Threshold'), 'θ', 'SE'],
    e.schwellen.map(s => [s.name, fx(s.theta, 3), fx(s.se, 3)]), [T('Die Schwellen gehören zur Modellgleichung; sie werden nicht im Satz gedeutet.', 'The thresholds belong to the model equation; they are not interpreted in the sentence.')]);
  const lr = lrTabelle(e, name, 'Ordinal Regression Model Tests', T('Ordinale Regression: Modelltests', 'Ordinal regression: model tests'),
    [`${logLik(e)} ${T(`Nagelkerke R² = ${ohneNull(e.nagelkerke)}, Cox & Snell R² = ${ohneNull(e.coxSnell)} (Pseudo-R²).`, `Nagelkerke R² = ${ohneNull(e.nagelkerke)}, Cox & Snell R² = ${ohneNull(e.coxSnell)} (pseudo R²).`)}`]);
  const brant: TableItem[] = e.brant ? [tabelle('Ordinal Regression Brant Test', T('Test der Annahme paralleler Linien (Brant)', 'Test of the parallel-lines assumption (Brant)'), [T('Prädiktor', 'Predictor'), 'χ²', 'df', 'p'],
    [[T('Gesamt', 'Overall'), fx(e.brant.gesamt.chi2), fd(e.brant.gesamt.df), fp(e.brant.gesamt.p)], ...e.brant.praed.map(b => [name(e.praed[b.pIdx]!.name), fx(b.chi2), fd(b.df), fp(b.p)])],
    [T('Brant (1990): Wald-Test, dass die Wirkung an allen Trennstellen gleich ist. Bei großen Stichproben schlägt jeder Test schon bei kleinen Abweichungen an. SPSS berichtet stattdessen einen Likelihood-Quotienten-Test („Test der Parallelität der Linien“); die Zahlen weichen ab.', 'Brant (1990): Wald test that the effect is the same at all cut points. With large samples any test reacts to small departures. SPSS reports a likelihood ratio test instead (“test of parallel lines”); the numbers differ.')])] : [];
  return [koef, schwellen, lr, ...brant];
}

export function tabellenMultreg(e: MultReg, name: Name = spaltenName): TableItem[] {
  const Y = name(e.ziel);
  const koef = koefTabelle(e, name, 'OR', 'Multinomial Logistic Regression Coefficients', T('Multinomiale Regression: Koeffizienten', 'Multinomial regression: coefficients'),
    [T(`Abhängige Größe: ${Y}; jede Kategorie gegenüber „${e.referenz}“ (Vergleichskategorie); ${e.n} Fälle. OR = exp(B); 95 %-KI und p nach Wald. Gruppen-Spalten: Vergleich mit der ersten Stufe. Andere Vergleichskategorie, andere Zahlen - die Anpassung bleibt gleich.`,
      `Dependent variable: ${Y}; each category versus "${e.referenz}" (reference category); ${e.n} cases. OR = exp(B); 95% CI and p by Wald. Group columns: compared with the first level. A different reference category gives different numbers - the fit stays the same.`)]);
  const lr = lrTabelle(e, name, 'Multinomial Logistic Regression Model Tests', T('Multinomiale Regression: Modelltests', 'Multinomial regression: model tests'),
    [`${logLik(e)} ${T(`Nagelkerke R² = ${ohneNull(e.nagelkerke)}, Cox & Snell R² = ${ohneNull(e.coxSnell)} (Pseudo-R²).`, `Nagelkerke R² = ${ohneNull(e.nagelkerke)}, Cox & Snell R² = ${ohneNull(e.coxSnell)} (pseudo R²).`)}`, ...(e.konvergiert ? [] : [T('Die Schätzung ist nicht sicher zu Ende gekommen.', 'The estimation did not finish reliably.')])]);
  return [koef, lr];
}

export function tabellenZaehlreg(e: ZaehlReg, name: Name = spaltenName): TableItem[] {
  const Y = name(e.ziel);
  const kopf = e.modell === 'negbin' ? T(`Abhängige Größe: ${Y}; negativ-binomial, Log-Link; ${e.n} Fälle.`, `Dependent variable: ${Y}; negative binomial, log link; ${e.n} cases.`) : T(`Abhängige Größe: ${Y}; Poisson, Log-Link; ${e.n} Fälle.`, `Dependent variable: ${Y}; Poisson, log link; ${e.n} cases.`);
  const koef = koefTabelle(e, name, 'IRR', 'Count Regression Coefficients', T('Zähldaten-Regression: Koeffizienten', 'Count regression: coefficients'),
    [kopf, ...(e.offset ? [T(`Offset: log(${name(e.offset)}).`, `Offset: log(${name(e.offset)}).`)] : []), T('IRR = exp(B) (Rate-Verhältnis); 95 %-KI und p nach Wald.', 'IRR = exp(B) (rate ratio); 95% CI and p by Wald.'),
      ...(e.theta !== null ? [T(`θ = ${komma(e.theta)}, SE(θ) = ${komma(e.thetaSe ?? NaN)}; die Wald-SE behandeln θ als fest (wie SPSS GENLIN).`, `θ = ${komma(e.theta)}, SE(θ) = ${komma(e.thetaSe ?? NaN)}; the Wald SE treat θ as fixed (as SPSS GENLIN).`)] : [])]);
  const lr = lrTabelle(e, name, 'Count Regression Model Tests', T('Zähldaten-Regression: Modelltests', 'Count regression: model tests'),
    [`${logLik(e)} ${T('Kein R² für Zähldaten.', 'No R² for count data.')}`]);
  const ueber = e.lrUeber ? [tabelle('Count Regression Overdispersion', T('Zähldaten-Regression: Überdispersion', 'Count regression: overdispersion'), [T('Prüfung', 'Check'), T('Wert', 'Value'), 'p'],
    [['Pearson χ²/df (Poisson)', fx(e.pearsonDf), ''], [T('LR-Test Poisson gegen negativ-binomial (χ²)', 'LR test Poisson vs. negative binomial (χ²)'), fx(e.lrUeber.chi2), fp(e.lrUeber.p)],
      [T('Nullen beobachtet / erwartet', 'Zeros observed / expected'), `${ohneNull(e.nullen.beobachtet)} / ${ohneNull(e.nullen.erwartet)}`, '']],
    [T('Die Nullhypothese liegt am Rand (α = 1/θ = 0): p = ½ · P(χ²₁ > LR) (Self & Liang 1987); bei LR ≤ 0 ist p = 1.', 'The null hypothesis lies on the boundary (α = 1/θ = 0): p = ½ · P(χ²₁ > LR) (Self & Liang 1987); for LR ≤ 0, p = 1.')])] : [];
  return [koef, lr, ...ueber];
}

/** Sätze zu einem der drei Ergebnisse. */
export function saetzeKategreg(e: Erg, name: Name = spaltenName): Saetze { return e.art === 'ordreg' ? saetzeOrdreg(e, name) : e.art === 'multreg' ? saetzeMultreg(e, name) : saetzeZaehlreg(e, name); }
export function tabellenKategreg(e: Erg, name: Name = spaltenName): TableItem[] { return e.art === 'ordreg' ? tabellenOrdreg(e, name) : e.art === 'multreg' ? tabellenMultreg(e, name) : tabellenZaehlreg(e, name); }

/** „Warum dieses Verfahren?“ für das gewählte Modell. */
export function katWarum(art: 'ordreg' | 'multreg' | 'zaehlreg'): string {
  if (art === 'ordreg') return T('Das, was vorhergesagt werden soll, besteht aus geordneten Stufen (zum Beispiel „unzufrieden“ bis „zufrieden“). Die ordinale Regression (Proportional-Odds-Modell) nutzt die Reihenfolge, ohne gleiche Abstände zwischen den Stufen anzunehmen, und zeigt für jede Vorhersagegröße ein Odds Ratio: um welchen Faktor die Chance für eine höhere Stufe steigt. Das gilt für jede Trennstelle gleich - das ist die Annahme paralleler Linien, die Statable mit dem Brant-Test prüft.',
    'What is to be predicted consists of ordered levels (for example "dissatisfied" to "satisfied"). Ordinal regression (proportional-odds model) uses the order without assuming equal distances between the levels and shows an odds ratio for each predictor: by which factor the odds of a higher level rise. This holds equally at every cut point - the parallel-lines assumption, which Statable checks with the Brant test.');
  if (art === 'multreg') return T('Das, was vorhergesagt werden soll, besteht aus Kategorien (zum Beispiel Verkehrsmittel). Die multinomiale logistische Regression vergleicht jede Kategorie mit einer Vergleichskategorie und zeigt, wie sich die Chance für sie ändert, wenn eine Vorhersagegröße steigt. Sie nimmt keine Ordnung an, braucht aber mehr Fälle, weil sie für jede Kategorie eigene Koeffizienten schätzt.',
    'What is to be predicted consists of categories (for example means of transport). Multinomial logistic regression compares each category with a reference category and shows how its odds change when a predictor rises. It assumes no order but needs more cases because it estimates separate coefficients for each category.');
  return T('Das, was vorhergesagt werden soll, ist eine Zählung (ganze Zahlen ab 0, zum Beispiel Fehltage). Die Zähldaten-Regression nimmt eine Verteilung für Zählungen (Poisson oder negativ-binomial) und einen logarithmischen Zusammenhang; das Ergebnis sind Rate-Verhältnisse (IRR). Streuen die Werte stärker, als Poisson erlaubt, wählt Statable das negativ-binomiale Modell - sonst wären die p-Werte zu klein.',
    'What is to be predicted is a count (whole numbers from 0, for example days absent). Count regression assumes a distribution for counts (Poisson or negative binomial) and a logarithmic relationship; the result is rate ratios (IRR). If the values vary more than Poisson allows, Statable chooses the negative binomial model - otherwise the p values would be too small.');
}
