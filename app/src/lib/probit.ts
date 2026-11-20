/**
 * Probit (Fachblatt docs/fachblaetter/KURSPAKET.md, Abschnitt 4): Option bei der Regression mit Ja/Nein-Zielgröße, neben Logit.
 * `glm(y ~ …, family = binomial('probit'), control = glm.control(epsilon = 1e-12, maxit = 100))` in R (`sp_probit`, engine/statable-kurspaket.R). Die Genauigkeit ist Pflicht,
 * sonst weichen fast trennbare Daten ab. Standardfehler aus der Fisher-Information (R); SPSS GENLIN nimmt die Hesse-Matrix.
 * Kein Odds Ratio: b steht auf der Skala der Normalverteilung. Warnungen von R und fast trennbare Daten werden nie verschluckt, sondern als Satz gezeigt.
 * SICHERHEIT: Der Aufruf enthält nur feste Wörter und Bezeichner; Namen und Stufen aus der Datei stehen nur in den Daten.
 */
import type { TableItem } from '../engine/types';
import type { RSpalte } from '../engine/webr';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { L, Lp, d } from './sitzung.svelte';
import { zitat, aufzaehlung, ki } from '../i18n/profil';
import { komma, pWert, type Saetze } from './ergebnis';
import { tabelle, fx, fp, type Z } from './mwsaetze';
import { spaltenName } from './medmodsaetze';
import { rFange, rIds, rAnzeigeName as rn, rAnzeigeText as rs } from '../engine/rsicher';
import { katDaten, type RAufruf, type KatPraed } from './kategreg';
import { kpGruppen, kpIndex, kpArr, kpZahl, kpText, kpWahr, kpObjekt, kpZuordnen, kpTermName, type KpPunkt } from './kpdaten';

export const R_PAKETE_PROBIT: string[] = [];
/** Wie bei der logistischen Regression: weniger Ereignisse (oder Nicht-Ereignisse) je Koeffizient als so viele gelten als knapp (Peduzzi et al. 1996). */
export const PROBIT_EPV = 10;

export interface ProbitDaten {
  spalten: RSpalte[]; ziel: string; praed: KatPraed[];
  /** Ereignis = der größere Wert (Zahl) bzw. die zweite Stufe in der Ordnung von Statable */ ereignis: string; vergleich: string;
  n: number; ausgelassen: number; nEreignis: number; nKein: number; konstant: string[]; werte: number;
}
/** Daten für R: das Ziel als 0/1 (1 = Ereignis), die Vorhersagespalten wie bei den anderen Regressionen (Gruppen als Faktor, erste Stufe = Vergleich). */
export function probitDaten(ziel: string, praed: string[], zeilen: Wert[][], spalten: Spalte[]): ProbitDaten {
  const zi = kpIndex(spalten, ziel), zs = spalten.find(x => x.name === ziel);
  if (!zs || zi < 0) throw new Error('Zielspalte fehlt');
  const kd = katDaten('zaehlreg', ziel, praed, zeilen, spalten);
  const gr = kpGruppen(zs, zi, zeilen);
  const stufen = gr.stufen.filter(s => gr.werte.includes(s));
  const vergleich = stufen[0] ?? '', ereignis = stufen[1] ?? '';
  const y = gr.werte.map(w => (w === null || stufen.length !== 2 ? null : w === ereignis ? 1 : 0));
  const spaltenR: RSpalte[] = [{ name: 'y', art: 'zahl', werte: y }, ...kd.spalten.slice(1)];
  const ok = zeilen.map((_, r) => spaltenR.every(s => s.werte[r] !== null && s.werte[r] !== undefined));
  const idx = ok.flatMap((b, r) => (b ? [r] : []));
  const nE = idx.filter(r => y[r] === 1).length;
  const konstant = praed.filter((_, k) => { const s = kd.spalten[k + 1]!; const w = idx.map(r => s.werte[r]); return w.length > 0 && w.every(v => v === w[0]); });
  return { spalten: spaltenR, ziel, praed: kd.praed, ereignis, vergleich, n: idx.length, ausgelassen: zeilen.length - idx.length, nEreignis: nE, nKein: idx.length - nE, konstant, werte: stufen.length };
}
/** Anzahl der Koeffizienten ohne Konstante (Gruppen mit k Stufen zählen k − 1). */
export const probitKoefZahl = (praed: KatPraed[]): number => praed.reduce((a, p) => a + (p.art === 'faktor' ? Math.max(p.stufen.length - 1, 1) : 1), 0);

export type ProbitCode = 'ziel-keine-zwei' | 'ein-wert' | 'keine-praed' | 'zu-wenig-faelle' | 'konstant' | 'wenige-ereignisse' | 'r-fehler';
export const PROBIT_SPERREN: ReadonlySet<ProbitCode> = new Set<ProbitCode>(['ziel-keine-zwei', 'ein-wert', 'keine-praed', 'zu-wenig-faelle', 'konstant', 'r-fehler']);
export function probitCodes(dt: ProbitDaten): ProbitCode[] {
  const aus: ProbitCode[] = [], k = probitKoefZahl(dt.praed);
  if (dt.werte !== 2) aus.push('ziel-keine-zwei');
  else if (dt.nEreignis === 0 || dt.nKein === 0) aus.push('ein-wert');
  if (!dt.praed.length) aus.push('keine-praed');
  if (dt.n <= k + 1) aus.push('zu-wenig-faelle');
  if (dt.konstant.length) aus.push('konstant');
  if (!aus.some(c => PROBIT_SPERREN.has(c)) && Math.min(dt.nEreignis, dt.nKein) < PROBIT_EPV * k) aus.push('wenige-ereignisse');
  return aus;
}
export interface ProbitSatzKontext { n?: number; k?: number; namen?: string[]; kleinste?: number }
export function probitCodeSatz(c: ProbitCode, x: ProbitSatzKontext = {}): { text: string; klein?: string } {
  switch (c) {
    case 'ziel-keine-zwei': return { text: L('Das Ziel hat nicht genau zwei verschiedene Werte. Probit rechnet nur mit einer Ja/Nein-Zielgröße.', 'The target does not have exactly two different values. Probit calculates only with a yes/no target.') };
    case 'ein-wert': return { text: L('Unter den Fällen mit allen Angaben kommt nur einer der beiden Werte vor. Damit lässt sich nichts schätzen.', 'Among the cases with all values only one of the two values occurs. Nothing can be estimated with that.') };
    case 'keine-praed': return { text: L('Es fehlt mindestens eine Vorhersagespalte.', 'At least one predictor column is missing.') };
    case 'zu-wenig-faelle': return { text: L(`Zu wenige Fälle: ${x.n ?? 0} für ${x.k ?? 0} Koeffizienten und die Konstante.`, `Too few cases: ${x.n ?? 0} for ${x.k ?? 0} coefficients and the constant.`) };
    case 'konstant': return { text: L(`Diese Spalten haben in allen Fällen denselben Wert: ${aufzaehlung((x.namen ?? []).map(zitat))}. Sie lassen sich nicht von der Konstanten trennen.`, `These columns have the same value in all cases: ${aufzaehlung((x.namen ?? []).map(zitat))}. They cannot be told apart from the constant.`),
      klein: d('Nimm sie heraus.', 'Nehmen Sie sie heraus.', 'Leave them out.') };
    case 'wenige-ereignisse': return { text: L(`Die kleinere der beiden Gruppen hat ${x.kleinste ?? 0} Fälle, weniger als ${PROBIT_EPV} je Koeffizient. Das Ergebnis kann instabil sein.`, `The smaller of the two groups has ${x.kleinste ?? 0} cases, fewer than ${PROBIT_EPV} per coefficient. The result can be unstable.`) };
    case 'r-fehler': return { text: L('R meldete bei der Probit-Rechnung einen Fehler.', 'R reported an error in the probit calculation.') };
  }
}
export function probitPunkte(dt: ProbitDaten, name: (n: string) => string = x => x): KpPunkt[] {
  const ctx: ProbitSatzKontext = { n: dt.n, k: probitKoefZahl(dt.praed), namen: dt.konstant.map(name), kleinste: Math.min(dt.nEreignis, dt.nKein) };
  const kopf: KpPunkt = { art: 'ok', text: Lp(dt.n, `${dt.n} Fall mit Angaben in allen Spalten`, `${dt.n} Fälle mit Angaben in allen Spalten`, `${dt.n} case with values in all columns`, `${dt.n} cases with values in all columns`),
    ...(dt.ausgelassen > 0 ? { klein: Lp(dt.ausgelassen, `${dt.ausgelassen} Zeile mit einer Lücke wird ausgelassen.`, `${dt.ausgelassen} Zeilen mit einer Lücke werden ausgelassen.`, `${dt.ausgelassen} row with a gap is left out.`, `${dt.ausgelassen} rows with a gap are left out.`) } : {}) };
  return [kopf, ...probitCodes(dt).map((c): KpPunkt => { const s = probitCodeSatz(c, ctx); return { art: PROBIT_SPERREN.has(c) ? 'sperre' : 'hinweis', text: s.text, ...(s.klein ? { klein: s.klein } : {}) }; })];
}

/* ------------------------------------------------------------ Aufruf und Antwort */
export function probitAufruf(dt: ProbitDaten): RAufruf {
  const namen = dt.praed.map((_, k) => `p${String(k + 1).padStart(2, '0')}`), fak = dt.praed.flatMap((p, k) => (p.art === 'faktor' ? [namen[k]!] : []));
  return { code: rFange(`sp_probit(d, 'y', ${rIds(namen)}, ${rIds(fak)})`), args: {} };
}
export interface ProbitKoef { pIdx: number; stufe: string; b: number; se: number; z: number; p: number; kiU: number; kiO: number }
export interface ProbitE {
  ziel: string; praed: KatPraed[]; ereignis: string; vergleich: string; n: number; ausgelassen: number; ereignisse: number; koef: ProbitKoef[];
  aic: number; devianz: number; nullDevianz: number; dfRes: number; dfNull: number; modelltest: { chi2: number; df: number; p: number };
  konvergiert: boolean; fastTrennbar: boolean; warnung: boolean;
}
export function probitLesen(roh: unknown, dt: ProbitDaten): { ok: true; e: ProbitE } | { ok: false; code: ProbitCode } {
  if (!kpObjekt(roh)) return { ok: false, code: 'r-fehler' };
  if (roh.fehler !== undefined) return { ok: false, code: /both values 0 and 1/.test(kpText(roh.fehler)) ? 'ein-wert' : 'r-fehler' };
  const koef = kpArr<unknown>(roh.koef).map((o): ProbitKoef | null => {
    if (!kpObjekt(o)) return null;
    const z = kpZuordnen(kpText(o.name), dt.praed);
    return { ...z, b: kpZahl(o.b), se: kpZahl(o.se), z: kpZahl(o.z), p: kpZahl(o.p), kiU: kpZahl(o.ki_u), kiO: kpZahl(o.ki_o) };
  });
  const mt = roh.modelltest;
  if (!koef.length || koef.some(k => !k || !Number.isFinite(k.b)) || !kpObjekt(mt)) return { ok: false, code: 'r-fehler' };
  return { ok: true, e: {
    ziel: dt.ziel, praed: dt.praed, ereignis: dt.ereignis, vergleich: dt.vergleich, n: kpZahl(roh.n), ausgelassen: kpZahl(roh.ausgelassen), ereignisse: kpZahl(roh.ereignisse), koef: koef as ProbitKoef[],
    aic: kpZahl(roh.aic), devianz: kpZahl(roh.devianz), nullDevianz: kpZahl(roh.null), dfRes: kpZahl(roh.df_res), dfNull: kpZahl(roh.df_null),
    modelltest: { chi2: kpZahl(mt.chi2), df: kpZahl(mt.df), p: kpZahl(mt.p) }, konvergiert: kpWahr(roh.konvergiert), fastTrennbar: kpWahr(roh.fast_trennbar), warnung: kpWahr(roh.warnung)
  } };
}
export const probitFehlerSatz = (c: ProbitCode): string => probitCodeSatz(c).text;

/* ------------------------------------------------------------ Sätze */
/** Die Warnungen von R und der Prüfbedingung (angepasste Werte unter 1e-8 oder über 1 − 1e-8, oder keine Konvergenz). Sie werden nie verschluckt. */
export function probitWarnungen(e: ProbitE): string[] {
  const w: string[] = [];
  if (e.fastTrennbar) w.push(L('Die Daten sind fast oder ganz trennbar: Für einzelne Fälle liegen die angepassten Wahrscheinlichkeiten bei 0 oder 1. Die Standardfehler sind dann unzuverlässig.', 'The data are almost or fully separable: for some cases the fitted probabilities are 0 or 1. The standard errors are then unreliable.'));
  if (e.warnung) w.push(L('R hat bei der Rechnung eine Warnung gemeldet (zum Beispiel angepasste Wahrscheinlichkeiten von genau 0 oder 1). Die Ergebnisse sind mit Vorsicht zu lesen.', 'R reported a warning during the calculation (for example fitted probabilities of exactly 0 or 1). Read the results with caution.'));
  if (!e.konvergiert) w.push(L('Die Rechnung ist nicht zu einem Ergebnis gekommen (keine Konvergenz). Die Koeffizienten sind nicht verlässlich.', 'The calculation did not arrive at a result (no convergence). The coefficients are not reliable.'));
  w.push(L('Beim Probit steht b auf der Skala der Normalverteilung. Ein Odds Ratio gibt es nur beim Logit.', 'In probit, b is on the scale of the normal distribution. An odds ratio exists only for logit.'));
  w.push(L('Logit und Probit geben fast immer dieselbe Aussage. Die Wahl ist keine Frage des Ergebnisses.', 'Logit and probit almost always give the same message. The choice is not a matter of the result.'));
  if (e.ausgelassen > 0) w.push(Lp(e.ausgelassen, `${e.ausgelassen} Zeile mit einer Lücke wurde ausgelassen.`, `${e.ausgelassen} Zeilen mit einer Lücke wurden ausgelassen.`, `${e.ausgelassen} row with a gap was left out.`, `${e.ausgelassen} rows with a gap were left out.`));
  return w;
}
const kiText = (k: ProbitKoef) => ki(komma(k.kiU, 2), komma(k.kiO, 2));
export function saetzeProbit(e: ProbitE, name: (n: string) => string = spaltenName): Saetze {
  const mt = e.modelltest, besser = mt.p < 0.05, ereignis = zitat(e.ereignis), vergleich = zitat(e.vergleich);
  const haupt = besser
    ? L(`Ein Probit-Modell sagt das Ereignis ${ereignis} (gegen ${vergleich}) besser voraus als ein Modell ohne Vorhersagespalten: χ²(${komma(mt.df, 0)}) = ${komma(mt.chi2, 2)}, p ${pWert(mt.p)}, ${e.n} Fälle.`, `A probit model predicts the event ${ereignis} (against ${vergleich}) better than a model without predictors: χ²(${komma(mt.df, 0)}) = ${komma(mt.chi2, 2)}, p ${pWert(mt.p)}, ${e.n} cases.`)
    : L(`Ein Probit-Modell sagt das Ereignis ${ereignis} (gegen ${vergleich}) nicht belegbar besser voraus als ein Modell ohne Vorhersagespalten: χ²(${komma(mt.df, 0)}) = ${komma(mt.chi2, 2)}, p ${pWert(mt.p)}, ${e.n} Fälle.`, `A probit model does not demonstrably predict the event ${ereignis} (against ${vergleich}) better than a model without predictors: χ²(${komma(mt.df, 0)}) = ${komma(mt.chi2, 2)}, p ${pWert(mt.p)}, ${e.n} cases.`);
  const teile = e.koef.filter(k => k.pIdx >= 0).map(k => {
    const tn = kpTermName(k.pIdx, k.stufe, e.praed, name), wert = `b = ${komma(k.b, 3)}, ${kiText(k)}, p ${pWert(k.p)}`;
    if (k.p >= 0.05) return L(`${tn}: Ein Zusammenhang lässt sich nicht belegen (${wert}).`, `${tn}: an association cannot be shown (${wert}).`);
    return k.b > 0
      ? L(`${tn}: Ein höherer Wert geht mit einer höheren Wahrscheinlichkeit des Ereignisses einher (${wert}).`, `${tn}: a higher value goes with a higher probability of the event (${wert}).`)
      : L(`${tn}: Ein höherer Wert geht mit einer niedrigeren Wahrscheinlichkeit des Ereignisses einher (${wert}).`, `${tn}: a higher value goes with a lower probability of the event (${wert}).`);
  });
  const apa = L(`Probit, χ²(${komma(mt.df, 0)}) = ${komma(mt.chi2, 2)}, p ${pWert(mt.p)}, AIC = ${komma(e.aic, 2)}`, `Probit, χ²(${komma(mt.df, 0)}) = ${komma(mt.chi2, 2)}, p ${pWert(mt.p)}, AIC = ${komma(e.aic, 2)}`);
  return { haupt, zusatz: teile.join(' '), vorsicht: probitWarnungen(e).join(' '), apa, marken: [] };
}
export const probitGerechnet = (): string => L('Probit-Regression (glm, Fisher-Information)', 'Probit regression (glm, Fisher information)');
export const probitFachwort = (): string => L('Probit-Regression (Normalverteilung als Verknüpfung)', 'probit regression (normal distribution as the link)');
export const probitWarum = (): string => L('Die Zielgröße hat zwei Werte. Das Probit-Modell schätzt die Wahrscheinlichkeit des Ereignisses mit der Normalverteilung als Verknüpfung; b steht auf deren Skala, ein Odds Ratio gibt es nicht. Logit und Probit geben fast immer dieselbe Aussage; die Wahl ist keine Frage des Ergebnisses. Statable rechnet mit R und hoher Genauigkeit, damit auch fast trennbare Daten stimmen, und zeigt eine Warnung von R immer an.',
  'The target has two values. The probit model estimates the probability of the event with the normal distribution as the link; b is on its scale, there is no odds ratio. Logit and probit almost always give the same message; the choice is not a matter of the result. Statable calculates with R and high precision so that almost separable data are right too, and always shows a warning from R.');

/* ------------------------------------------------------------ Tabellen */
export function tabellenProbit(e: ProbitE, name: (n: string) => string = spaltenName): TableItem[] {
  const aus: TableItem[] = [];
  aus.push(tabelle('Probit Koeffizienten', L('Probit-Regression: Koeffizienten', 'Probit regression: coefficients'), ['', 'b', 'SE', 'z', 'p', L('95 %-KI unten', '95% CI lower'), L('95 %-KI oben', '95% CI upper')],
    e.koef.map((k): Z[] => [kpTermName(k.pIdx, k.stufe, e.praed, name), fx(k.b, 4), fx(k.se, 4), fx(k.z, 3), fp(k.p), fx(k.kiU, 4), fx(k.kiO, 4)]),
    [L(`Ereignis: ${e.ereignis} (gegen ${e.vergleich}). b steht auf der Skala der Normalverteilung; es gibt kein Odds Ratio.`, `Event: ${e.ereignis} (against ${e.vergleich}). b is on the scale of the normal distribution; there is no odds ratio.`),
      L('Standardfehler aus der Fisher-Information (R). SPSS nimmt die Hesse-Matrix und kann um einige Prozent abweichen.', 'Standard errors from the Fisher information (R). SPSS uses the Hessian and can differ by a few percent.'),
      L('Das Intervall ist ein Wald-Intervall.', 'The interval is a Wald interval.')]));
  aus.push(tabelle('Probit Modell', L('Probit-Regression: Modell', 'Probit regression: model'), [L('Kennzahl', 'Measure'), L('Wert', 'Value')], [
    ['n', fx(e.n, 0)], [L('Ereignisse', 'Events'), fx(e.ereignisse, 0)], ['AIC', fx(e.aic, 3)], [L('Devianz', 'Deviance'), fx(e.devianz, 3)], [L('Devianz des Nullmodells', 'Deviance of the null model'), fx(e.nullDevianz, 3)],
    [`χ² (${L('Modell gegen Nullmodell', 'model against null model')})`, fx(e.modelltest.chi2, 3)], ['df', fx(e.modelltest.df, 0)], ['p', fp(e.modelltest.p)]]));
  return aus;
}
/** R-Text zum Ansehen (wird nie ausgeführt). */
export function probitRCode(ziel: string, praed: string[]): string {
  const summe = praed.map(rn).join(' + ');
  return [
    `# ${L('daten: die Tabelle in R. Das Ziel ist 0/1, 1 = Ereignis.', 'daten: your table in R. The target is 0/1, 1 = event.')}`,
    `m <- glm(${rn(ziel)} ~ ${summe}, family = binomial('probit'), data = daten, control = glm.control(epsilon = 1e-12, maxit = 100))`,
    'summary(m)', 'confint.default(m)   # Wald'
  ].join('\n');
}
