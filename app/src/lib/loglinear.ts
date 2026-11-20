/**
 * Loglineare Modelle (Fachblatt docs/fachblaetter/KURSPAKET.md, Abschnitt 2): „Wie hängen mehrere Kategorien zusammen?“
 * Gezählt wird je Zelle der vollen Tabelle, AUCH die leeren (sonst stimmt df nicht); gerechnet wird glm(Freq ~ Terme, poisson) in R (`sp_loglin`, engine/statable-kurspaket.R).
 * Modellwahl von Hand und hierarchisch: Eine Wechselwirkung schließt ihre Haupteffekte und niedrigeren Wechselwirkungen ein. Die automatische Suche „Rückwärts wie SPSS“ (loglinrueck.ts) steht daneben; sie ist zufallsabhängig und nie voreingestellt.
 * SICHERHEIT: Der Aufruf enthält nur feste Wörter und Bezeichner (rIds, rIdsListen); die Stufen stehen als Beschriftungen in den Daten, nie im Code.
 */
import type { TableItem } from '../engine/types';
import type { RSpalte } from '../engine/webr';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { L, Lp, d } from './sitzung.svelte';
import { zitat, aufzaehlung, proz } from '../i18n/profil';
import { komma, pWert, type Saetze } from './ergebnis';
import { tabelle, fx, fp, type Z } from './mwsaetze';
import { spaltenName } from './medmodsaetze';
import { chiQuadratP } from './verteilung';
import { rFange, rIds, rIdsListen, rQOderNull, rAnzeigeName as rn, rAnzeigeZahl } from '../engine/rsicher';
import type { RAufruf } from './kategreg';
import { kpName, kpZahlen, kpGruppen, kpIndex, kpArr, kpZahl, kpZahlOderNull, kpZahlen2, kpText, kpWahr, kpObjekt, type KpPunkt } from './kpdaten';

export const R_PAKETE_LOGLIN: string[] = [];
export const LOG_ZELLEN_MAX = 20000, LOG_FAKTOREN_MIN = 2, LOG_FAKTOREN_MAX = 5;
export type LogArt = 'unabh' | 'zwei' | 'voll' | 'eigen';
/** Die Wahl der Person: eine Art, bei `eigen` die angekreuzten Wechselwirkungen (Faktor-Nummern, ab 0; jede mit mindestens zwei Faktoren). */
export interface LogWahl { art: LogArt; eigen: number[][] }

/* ------------------------------------------------------------ Terme und Modelle (hierarchisch) */
const schluessel = (t: number[]) => t.join('-');
const kleiner = (a: number[], b: number[]) => a.length - b.length || schluessel(a).localeCompare(schluessel(b), 'en', { numeric: true });
/** Alle nichtleeren Teilmengen einer Menge von Faktor-Nummern (sortiert). */
function teilmengen(t: number[]): number[][] {
  const aus: number[][] = [];
  for (let m = 1; m < 1 << t.length; m++) aus.push(t.filter((_, i) => m & (1 << i)).sort((a, b) => a - b));
  return aus;
}
/** Die hierarchische Hülle: jede Wechselwirkung bringt ihre Teile mit; alle Haupteffekte sind immer dabei. Sortiert nach Ordnung. */
export function logHuelle(terme: number[][], k: number): number[][] {
  const m = new Map<string, number[]>();
  for (let i = 0; i < k; i++) m.set(String(i), [i]);
  for (const t of terme) for (const s of teilmengen([...new Set(t)].filter(i => i >= 0 && i < k))) m.set(schluessel(s), s);
  return [...m.values()].sort(kleiner);
}
/** Die Terme eines Modells nach der Wahl, schon hierarchisch geschlossen. */
export function logTerme(w: LogWahl, k: number): number[][] {
  const paare: number[][] = []; for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) paare.push([a, b]);
  if (w.art === 'unabh') return logHuelle([], k);
  if (w.art === 'zwei') return logHuelle(paare, k);
  if (w.art === 'voll') return logHuelle([Array.from({ length: k }, (_, i) => i)], k);
  return logHuelle(w.eigen.filter(t => t.length >= 2), k);
}
/** Alle Wechselwirkungen, die zum Ankreuzen angeboten werden: Paare und Dreier (bei 4 und 5 Faktoren; Vierer und Fünfer nur über „gesättigt“). */
export function logAngebot(k: number): number[][] {
  const aus: number[][] = [];
  for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) { aus.push([a, b]); for (let c = b + 1; c < k; c++) aus.push([a, b, c]); }
  return aus.sort(kleiner);
}
/** Ist das Modell a im Modell b enthalten (jeder Term von a steht in b)? */
export const logEnthalten = (a: number[][], b: number[][]): boolean => a.every(t => b.some(u => schluessel(u) === schluessel(t)));
const gleichesModell = (a: number[][], b: number[][]) => a.length === b.length && logEnthalten(a, b);
/** Die Standardwahl: Unabhängigkeit bei zwei Faktoren, sonst alle Zweifach-Wechselwirkungen. */
export const logStandardWahl = (k: number): LogWahl => ({ art: k <= 2 ? 'unabh' : 'zwei', eigen: [] });
/** Eine gespeicherte oder neue Wahl bereinigen: nur Wechselwirkungen aus dem Angebot, sortiert, ohne Doppelte. */
export function logWahlBereinigen(w: Partial<LogWahl> | undefined, k: number): LogWahl {
  const art: LogArt = w?.art === 'zwei' || w?.art === 'voll' || w?.art === 'eigen' || w?.art === 'unabh' ? w.art : logStandardWahl(k).art;
  const erlaubt = new Set(logAngebot(k).map(schluessel));
  const eigen = [...new Map((w?.eigen ?? []).filter(t => Array.isArray(t) && erlaubt.has(schluessel([...t].sort((a, b) => a - b)))).map(t => [schluessel([...t].sort((a, b) => a - b)), [...t].sort((a, b) => a - b)])).values()].sort(kleiner);
  return { art, eigen };
}
/** Die Modelle, die R rechnet: das gewählte zuerst, dann Unabhängigkeit und alle Zweifach-Wechselwirkungen (ohne Doppelte). */
export function logModelleFuerR(w: LogWahl, k: number): { art: LogArt; terme: number[][] }[] {
  const liste: { art: LogArt; terme: number[][] }[] = [{ art: w.art, terme: logTerme(w, k) }];
  for (const art of ['unabh', 'zwei'] as const) { const terme = logTerme({ art, eigen: [] }, k); if (!liste.some(m => gleichesModell(m.terme, terme))) liste.push({ art, terme }); }
  return liste;
}

/* ------------------------------------------------------------ Daten für R und Sperren */
export interface LogDaten {
  spalten: RSpalte[]; faktoren: string[]; haeuf: string | null;
  /** Zeilen mit Angaben in allen Faktoren (und der Häufigkeit) */ zeilen: number; ausgelassen: number;
  /** Stufen je Faktor, die in den benutzten Zeilen vorkommen */ stufen: number[];
  /** Summe der Häufigkeiten (ohne Häufigkeitsspalte: Zahl der Zeilen) */ n: number;
  zellen: number; leer: number; nichtGanz: boolean; negativ: boolean; doppelt: boolean;
}
export function logDaten(faktoren: string[], haeuf: string | null, zeilen: Wert[][], spalten: Spalte[]): LogDaten {
  const fi = faktoren.map(f => kpIndex(spalten, f));
  if (fi.some(i => i < 0)) throw new Error('Faktorspalte fehlt');
  const gr = fi.map(i => kpGruppen(spalten[i]!, i, zeilen));
  const hi = haeuf ? kpIndex(spalten, haeuf) : -1;
  const hz = hi >= 0 ? kpZahlen(spalten[hi]!, hi, zeilen) : null;
  const ok = zeilen.map((_, r) => gr.every(g => g.werte[r] !== null) && (hz === null || hz[r] !== null));
  const benutzt = ok.flatMap((b, r) => (b ? [r] : []));
  const stufenJe = gr.map(g => g.stufen.filter(s => benutzt.some(r => g.werte[r] === s)));
  const spaltenR: RSpalte[] = gr.map((g, k): RSpalte => ({ name: kpName(k), art: 'faktor', werte: g.werte.map(w => { const j = stufenJe[k]!.indexOf(w ?? ''); return w !== null && j >= 0 ? j + 1 : null; }), labels: stufenJe[k]!.map((s, j) => ({ wert: j + 1, label: s })) }));
  if (hz) spaltenR.push({ name: 'h', art: 'zahl', werte: hz });
  const summe = new Map<string, number>();
  let n = 0, nichtGanz = false, negativ = false;
  for (const r of benutzt) {
    const c = hz ? hz[r]! : 1; n += c;
    if (!Number.isInteger(c)) nichtGanz = true; if (c < 0) negativ = true;
    const key = gr.map((g, k) => stufenJe[k]!.indexOf(g.werte[r]!)).join(','); summe.set(key, (summe.get(key) ?? 0) + c);
  }
  const zellen = stufenJe.reduce((a, s) => a * s.length, 1), belegt = [...summe.values()].filter(v => v > 0).length;
  return { spalten: spaltenR, faktoren, haeuf, zeilen: benutzt.length, ausgelassen: zeilen.length - benutzt.length, stufen: stufenJe.map(s => s.length), n, zellen, leer: zellen - belegt, nichtGanz, negativ, doppelt: !!haeuf && faktoren.includes(haeuf) };
}

export type LogCode = 'faktoren-wenig' | 'faktoren-viele' | 'ein-faktor-eine-stufe' | 'haeuf-doppelt' | 'haeuf-nicht-ganz' | 'haeuf-negativ' | 'zellen-viele' | 'zu-wenig-faelle' | 'leere-zellen' | 'r-fehler';
export const LOG_SPERREN: ReadonlySet<LogCode> = new Set<LogCode>(['faktoren-wenig', 'faktoren-viele', 'ein-faktor-eine-stufe', 'haeuf-doppelt', 'haeuf-nicht-ganz', 'haeuf-negativ', 'zellen-viele', 'zu-wenig-faelle', 'r-fehler']);
export function logCodes(dt: LogDaten): LogCode[] {
  const aus: LogCode[] = [], k = dt.faktoren.length;
  if (k < LOG_FAKTOREN_MIN) aus.push('faktoren-wenig');
  if (k > LOG_FAKTOREN_MAX) aus.push('faktoren-viele');
  if (dt.doppelt) aus.push('haeuf-doppelt');
  if (dt.haeuf && dt.nichtGanz) aus.push('haeuf-nicht-ganz');
  if (dt.haeuf && dt.negativ) aus.push('haeuf-negativ');
  if (dt.zeilen === 0 || dt.n <= 0) aus.push('zu-wenig-faelle');
  else if (dt.stufen.some(s => s < 2)) aus.push('ein-faktor-eine-stufe');
  if (dt.zellen > LOG_ZELLEN_MAX) aus.push('zellen-viele');
  if (dt.leer > 0 && !aus.some(c => LOG_SPERREN.has(c))) aus.push('leere-zellen');
  return aus;
}
export interface LogSatzKontext { zellen?: number; leer?: number; n?: number }
export function logCodeSatz(c: LogCode, k: LogSatzKontext = {}): { text: string; klein?: string } {
  switch (c) {
    case 'faktoren-wenig': return { text: L(`Loglineare Modelle brauchen mindestens ${LOG_FAKTOREN_MIN} Kategorie-Spalten.`, `Log-linear models need at least ${LOG_FAKTOREN_MIN} category columns.`) };
    case 'faktoren-viele': return { text: L(`Mehr als ${LOG_FAKTOREN_MAX} Kategorie-Spalten rechnet Statable nicht. Die Tabelle würde zu viele Zellen haben.`, `Statable does not calculate more than ${LOG_FAKTOREN_MAX} category columns. The table would have too many cells.`) };
    case 'ein-faktor-eine-stufe': return { text: L('Eine Kategorie-Spalte hat in den Daten nur eine Stufe. Damit lässt sich kein Zusammenhang prüfen.', 'A category column has only one level in the data. No association can be examined with it.') };
    case 'haeuf-doppelt': return { text: L('Die Spalte mit den Häufigkeiten kann nicht zugleich eine Kategorie-Spalte sein.', 'The column with the frequencies cannot also be a category column.') };
    case 'haeuf-nicht-ganz': return { text: L('Die Häufigkeiten müssen ganze Zahlen sein. In der gewählten Spalte steht mindestens ein Wert mit Nachkommastellen.', 'The frequencies must be whole numbers. The chosen column contains at least one value with decimals.') };
    case 'haeuf-negativ': return { text: L('Die Häufigkeiten dürfen nicht negativ sein. In der gewählten Spalte steht mindestens ein negativer Wert.', 'The frequencies must not be negative. The chosen column contains at least one negative value.') };
    case 'zellen-viele': return { text: L(`Die Tabelle hätte ${komma(k.zellen ?? 0, 0)} Zellen, erlaubt sind höchstens ${komma(LOG_ZELLEN_MAX, 0)}.`, `The table would have ${komma(k.zellen ?? 0, 0)} cells; at most ${komma(LOG_ZELLEN_MAX, 0)} are allowed.`),
      klein: d('Nimm eine Spalte heraus oder fasse Stufen zusammen.', 'Nehmen Sie eine Spalte heraus oder fassen Sie Stufen zusammen.', 'Leave out a column or merge levels.') };
    case 'zu-wenig-faelle': return { text: L('Es bleiben keine Fälle mit Angaben in allen gewählten Spalten.', 'No cases with values in all chosen columns remain.') };
    case 'leere-zellen': return { text: Lp(k.leer ?? 0, `${k.leer} von ${k.zellen} Zellen der Tabelle sind leer.`, `${k.leer} von ${k.zellen} Zellen der Tabelle sind leer.`, `${k.leer} of ${k.zellen} cells of the table are empty.`, `${k.leer} of ${k.zellen} cells of the table are empty.`),
      klein: L('Leere Zellen werden mitgezählt; sie gehen in die Freiheitsgrade ein.', 'Empty cells are counted; they enter the degrees of freedom.') };
    case 'r-fehler': return { text: L('R meldete bei der Rechnung der loglinearen Modelle einen Fehler.', 'R reported an error in the log-linear model calculation.') };
  }
}
export function logPunkte(dt: LogDaten, name: (n: string) => string = x => x): KpPunkt[] {
  void name;
  const kopf: KpPunkt = { art: 'ok', text: Lp(dt.n, `${komma(dt.n, 0)} Beobachtung in ${komma(dt.zellen, 0)} Zellen`, `${komma(dt.n, 0)} Beobachtungen in ${komma(dt.zellen, 0)} Zellen`, `${komma(dt.n, 0)} observation in ${komma(dt.zellen, 0)} cells`, `${komma(dt.n, 0)} observations in ${komma(dt.zellen, 0)} cells`),
    ...(dt.ausgelassen > 0 ? { klein: Lp(dt.ausgelassen, `${dt.ausgelassen} Zeile mit einer Lücke wird ausgelassen.`, `${dt.ausgelassen} Zeilen mit einer Lücke werden ausgelassen.`, `${dt.ausgelassen} row with a gap is left out.`, `${dt.ausgelassen} rows with a gap are left out.`) } : {}) };
  return [kopf, ...logCodes(dt).map((c): KpPunkt => { const s = logCodeSatz(c, { zellen: dt.zellen, leer: dt.leer, n: dt.n }); return { art: LOG_SPERREN.has(c) ? 'sperre' : 'hinweis', text: s.text, ...(s.klein ? { klein: s.klein } : {}) }; })];
}

/* ------------------------------------------------------------ Aufruf und Antwort */
export function logAufruf(dt: LogDaten, w: LogWahl): RAufruf {
  const k = dt.faktoren.length;
  const rTeilModelle = rIdsListen(logModelleFuerR(w, k).map(m => m.terme.map(t => t.map(i => kpName(i)))));
  const rTeilFaktoren = rIds(dt.faktoren.map((_, i) => kpName(i)));
  return { code: rFange(`sp_loglin(d, ${rTeilFaktoren}, ${rQOderNull(!!dt.haeuf, 'h')}, ${rTeilModelle})`), args: {} };
}
export interface LogModell {
  art: LogArt; terme: number[][]; g2: number; df: number; p: number | null; x2: number; pX2: number | null; aic: number; erwartetMin: number; kleiner5: number; konvergiert: boolean;
}
export interface LogE {
  faktoren: string[]; haeuf: string | null; stufen: number[]; n: number; ausgelassen: number; zellen: number; leer: number; wahl: LogWahl;
  /** das gewählte Modell zuerst, dann Unabhängigkeit und alle Zweifach-Wechselwirkungen, soweit verschieden */ modelle: LogModell[];
}
const pAus = (x: number, df: number): number | null => (df > 0 && Number.isFinite(x) ? chiQuadratP(Math.max(x, 0), df) : null);
/** Die Antwort von R lesen. Wirft nie. */
export function logLesen(roh: unknown, dt: LogDaten, w: LogWahl): { ok: true; e: LogE } | { ok: false; code: LogCode } {
  if (!kpObjekt(roh)) return { ok: false, code: 'r-fehler' };
  if (roh.fehler !== undefined) { const t = kpText(roh.fehler); return { ok: false, code: /too many cells/.test(t) ? 'zellen-viele' : /negative frequency/.test(t) ? 'haeuf-negativ' : /whole numbers/.test(t) ? 'haeuf-nicht-ganz' : 'r-fehler' }; }
  const soll = logModelleFuerR(w, dt.faktoren.length), liste = kpArr<unknown>(roh.modelle);
  if (liste.length !== soll.length) return { ok: false, code: 'r-fehler' };
  const modelle: LogModell[] = [];
  for (let i = 0; i < soll.length; i++) {
    const o = liste[i];
    if (!kpObjekt(o)) return { ok: false, code: 'r-fehler' };
    const g2 = kpZahl(o.g2), df = kpZahl(o.df), x2 = kpZahl(o.x2);
    if (!Number.isFinite(g2) || !Number.isFinite(df)) return { ok: false, code: 'r-fehler' };
    modelle.push({ art: soll[i]!.art, terme: soll[i]!.terme, g2, df, p: df > 0 ? (kpZahlOderNull(o.p) ?? pAus(g2, df)) : null, x2, pX2: df > 0 ? (kpZahlOderNull(o.p_x2) ?? pAus(x2, df)) : null, aic: kpZahl(o.aic), erwartetMin: kpZahl(o.erwartet_min), kleiner5: kpZahl(o.kleiner5), konvergiert: kpWahr(o.konvergiert) });
  }
  return { ok: true, e: { faktoren: dt.faktoren, haeuf: dt.haeuf, stufen: kpZahlen2(roh.stufen).length ? kpZahlen2(roh.stufen) : dt.stufen, n: kpZahl(roh.n), ausgelassen: dt.ausgelassen, zellen: kpZahl(roh.zellen), leer: kpZahl(roh.leer), wahl: w, modelle } };
}

/* ------------------------------------------------------------ Namen, Vergleiche, Sätze */
export const logTermName = (t: number[], faktoren: string[], name: (n: string) => string = spaltenName): string => t.map(i => name(faktoren[i]!)).join(' × ');
/** Der Name eines Modells für Sätze und Tabellen. */
export function logModellName(m: LogModell, faktoren: string[], name: (n: string) => string = spaltenName): string {
  const wechsel = m.terme.filter(t => t.length >= 2);
  if (m.art === 'unabh') return L('Unabhängigkeit (nur Haupteffekte)', 'independence (main effects only)');
  if (m.art === 'zwei') return L('alle Zweifach-Wechselwirkungen', 'all two-way interactions');
  if (m.art === 'voll') return L('gesättigt (alle Wechselwirkungen)', 'saturated (all interactions)');
  return wechsel.length ? L(`Wechselwirkungen ${wechsel.map(t => logTermName(t, faktoren, name)).join(', ')}`, `interactions ${wechsel.map(t => logTermName(t, faktoren, name)).join(', ')}`) : L('Unabhängigkeit (nur Haupteffekte)', 'independence (main effects only)');
}
export interface LogVergleich { einfach: LogModell; dG2: number; dDf: number; p: number | null }
/** Das gewählte Modell gegen jedes einfachere, in ihm enthaltene Modell: Differenz von G² und df. */
export function logVergleiche(e: LogE): LogVergleich[] {
  const [gew, ...rest] = e.modelle;
  if (!gew) return [];
  return rest.filter(m => m.df > gew.df && logEnthalten(m.terme, gew.terme) && !gleichesModell(m.terme, gew.terme)).map(m => ({ einfach: m, dG2: m.g2 - gew.g2, dDf: m.df - gew.df, p: pAus(m.g2 - gew.g2, m.df - gew.df) }));
}
const proz1 = (v: number) => proz(komma(v * 100, 1));
/** Erwartete Häufigkeiten: unzuverlässig bei mehr als 20 % der Zellen unter 5 oder einem Wert unter 1. */
export const logErwartetUnsicher = (m: LogModell): boolean => m.kleiner5 > 0.2 || m.erwartetMin < 1;
export function logWarnungen(e: LogE): string[] {
  const m = e.modelle[0]!, w: string[] = [];
  if (m.df > 0) {
    w.push(L('Ein großes p heißt hier: Das Modell widerspricht den Daten nicht. Es beweist nicht, dass das Modell stimmt. Die Richtung ist umgekehrt wie bei den meisten Tests, bei denen ein kleines p für einen Effekt spricht.', 'A large p means here: the model does not contradict the data. It does not prove that the model is right. The direction is the reverse of most tests, where a small p speaks for an effect.'));
    w.push(L(`Erwartete Häufigkeit unter 5 in ${proz1(m.kleiner5)} der Zellen (kleinster Wert ${komma(m.erwartetMin, 2)}).`, `Expected frequency below 5 in ${proz1(m.kleiner5)} of the cells (smallest value ${komma(m.erwartetMin, 2)}).`));
    if (logErwartetUnsicher(m)) w.push(L('Bei mehr als 20 % der Zellen unter 5 oder einem Wert unter 1 ist p unzuverlässig.', 'With more than 20% of the cells below 5 or a value below 1, p is unreliable.'));
  }
  if (e.leer > 0) w.push(Lp(e.leer, `${e.leer} von ${e.zellen} Zellen sind leer; sie wurden mitgezählt.`, `${e.leer} von ${e.zellen} Zellen sind leer; sie wurden mitgezählt.`, `${e.leer} of ${e.zellen} cells are empty; they were counted.`, `${e.leer} of ${e.zellen} cells are empty; they were counted.`));
  if (e.ausgelassen > 0) w.push(Lp(e.ausgelassen, `${e.ausgelassen} Zeile mit einer Lücke wurde ausgelassen.`, `${e.ausgelassen} Zeilen mit einer Lücke wurden ausgelassen.`, `${e.ausgelassen} row with a gap was left out.`, `${e.ausgelassen} rows with a gap were left out.`));
  return w;
}
export function saetzeLog(e: LogE, name: (n: string) => string = spaltenName): Saetze {
  const m = e.modelle[0]!, mn = logModellName(m, e.faktoren, name), g = `G² = ${komma(m.g2, 2)}, df = ${komma(m.df, 0)}`;
  let haupt: string, apa: string;
  if (m.df === 0) {
    haupt = L(`Das gesättigte Modell enthält alle Wechselwirkungen und gibt die Zellhäufigkeiten genau wieder (G² = ${komma(0, 2)}, df = 0). Es gibt keinen Test.`, `The saturated model contains all interactions and reproduces the cell frequencies exactly (G² = ${komma(0, 2)}, df = 0). There is no test.`);
    apa = L('gesättigtes Modell, G² = 0, df = 0', 'saturated model, G² = 0, df = 0');
  } else if ((m.p ?? 1) < 0.05) {
    haupt = L(`Das Modell ${mn} widerspricht den Daten: ${g}, p ${pWert(m.p!)}. Die Zellhäufigkeiten weichen stärker vom Modell ab, als der Zufall erwarten ließe; dem Modell fehlt etwas.`, `The model ${mn} contradicts the data: ${g}, p ${pWert(m.p!)}. The cell frequencies differ from the model more than chance would lead us to expect; the model is missing something.`);
    apa = `G²(${komma(m.df, 0)}) = ${komma(m.g2, 2)}, p ${pWert(m.p!)}; X²(${komma(m.df, 0)}) = ${komma(m.x2, 2)}`;
  } else {
    haupt = L(`Das Modell ${mn} widerspricht den Daten nicht: ${g}, p ${pWert(m.p!)}.`, `The model ${mn} does not contradict the data: ${g}, p ${pWert(m.p!)}.`);
    apa = `G²(${komma(m.df, 0)}) = ${komma(m.g2, 2)}, p ${pWert(m.p!)}; X²(${komma(m.df, 0)}) = ${komma(m.x2, 2)}`;
  }
  const v = logVergleiche(e).map(c => {
    const kopf = L(`Gegen das einfachere Modell ${logModellName(c.einfach, e.faktoren, name)}: ΔG² = ${komma(c.dG2, 2)}, Δdf = ${komma(c.dDf, 0)}, p ${pWert(c.p ?? NaN)}.`, `Against the simpler model ${logModellName(c.einfach, e.faktoren, name)}: ΔG² = ${komma(c.dG2, 2)}, Δdf = ${komma(c.dDf, 0)}, p ${pWert(c.p ?? NaN)}.`);
    const ende = (c.p ?? 1) < 0.05 ? L('Die zusätzlichen Terme verbessern die Passung.', 'The additional terms improve the fit.') : L('Die zusätzlichen Terme verbessern die Passung nicht belegbar.', 'The additional terms do not demonstrably improve the fit.');
    return `${kopf} ${ende}`;
  });
  const mehr = L(`Gezählt wurden ${komma(e.n, 0)} Beobachtungen in ${komma(e.zellen, 0)} Zellen, davon ${komma(e.leer, 0)} leer.`, `${komma(e.n, 0)} observations were counted in ${komma(e.zellen, 0)} cells, ${komma(e.leer, 0)} of them empty.`);
  return { haupt, zusatz: [mehr, ...v].join(' '), vorsicht: logWarnungen(e).join(' '), apa, marken: [] };
}
export const logGerechnet = (e: LogE, name: (n: string) => string = spaltenName): string => L(`Loglineares Modell (Poisson-Regression auf den Zellhäufigkeiten): ${logModellName(e.modelle[0]!, e.faktoren, name)}`, `Log-linear model (Poisson regression on the cell frequencies): ${logModellName(e.modelle[0]!, e.faktoren, name)}`);
export const logFachwort = (): string => L('loglineares Modell (G² und X² der Zellhäufigkeiten)', 'log-linear model (G² and X² of the cell frequencies)');
export const logWarum = (): string => L('Die Frage ist, wie mehrere Kategorien zusammenhängen. Ein loglineares Modell erklärt die Häufigkeit jeder Zelle der Tabelle aus Haupteffekten und Wechselwirkungen. Statable zählt jede Zelle, auch die leeren, und prüft ein Modell, das Person wählt, mit G² und X². Anders als bei den meisten Tests spricht ein großes p dafür, dass das Modell die Daten nicht verfehlt. Eine automatische Suche (Rückwärts wie SPSS) gibt es zusätzlich; sie ist zufallsabhängig und nie voreingestellt.',
  'The question is how several categories are related. A log-linear model explains the frequency of each cell of the table from main effects and interactions. Statable counts every cell, including the empty ones, and tests a model that the person chooses with G² and X². Unlike most tests, a large p speaks for the model not missing the data. An automatic search (backward as SPSS) is available in addition; it depends on chance and is never the default.');

/* ------------------------------------------------------------ Tabellen */
export function tabellenLog(e: LogE, name: (n: string) => string = spaltenName): TableItem[] {
  const aus: TableItem[] = [];
  aus.push(tabelle('Loglinear Modelle', L('Loglineare Modelle: Passung', 'Log-linear models: fit'), [L('Modell', 'Model'), 'G²', 'df', 'p', 'X²', 'p (X²)', 'AIC'],
    e.modelle.map((m, i): Z[] => [`${i === 0 ? '► ' : ''}${logModellName(m, e.faktoren, name)}`, fx(m.g2, 3), fx(m.df, 0), m.p === null ? '-' : fp(m.p), fx(m.x2, 3), m.pX2 === null ? '-' : fp(m.pX2), fx(m.aic, 2)]),
    [L('G² ist die Devianz, X² die Pearson-Prüfgröße. Ein großes p heißt hier: Das Modell widerspricht den Daten nicht. Es beweist nicht, dass es stimmt.', 'G² is the deviance, X² the Pearson statistic. A large p means here: the model does not contradict the data. It does not prove that it is right.'),
      L('Das erste Modell (►) ist das gewählte.', 'The first model (►) is the chosen one.')]));
  const v = logVergleiche(e);
  if (v.length) aus.push(tabelle('Loglinear Vergleich', L('Vergleich mit einfacheren Modellen', 'Comparison with simpler models'), [L('Einfacheres Modell', 'Simpler model'), 'ΔG²', 'Δdf', 'p'],
    v.map((c): Z[] => [logModellName(c.einfach, e.faktoren, name), fx(c.dG2, 3), fx(c.dDf, 0), c.p === null ? '-' : fp(c.p)]),
    [L('Differenz von G² und df zwischen dem einfacheren und dem gewählten Modell (verschachtelte Modelle). Ein kleines p spricht für die zusätzlichen Terme.', 'Difference in G² and df between the simpler and the chosen model (nested models). A small p speaks for the additional terms.')]));
  aus.push(tabelle('Loglinear Tabelle', L('Die Tabelle', 'The table'), [L('Kennzahl', 'Measure'), L('Wert', 'Value')], [
    ...e.faktoren.map((f, i): Z[] => [name(f), Lp(e.stufen[i] ?? 0, `${e.stufen[i]} Stufe`, `${e.stufen[i]} Stufen`, `${e.stufen[i]} level`, `${e.stufen[i]} levels`)]),
    [L('Beobachtungen', 'Observations'), fx(e.n, 0)], [L('Zellen', 'Cells'), fx(e.zellen, 0)], [L('Leere Zellen', 'Empty cells'), fx(e.leer, 0)],
    [L('Erwartet unter 5 (gewähltes Modell)', 'Expected below 5 (chosen model)'), fx(e.modelle[0]!.kleiner5 * 100, 1)], [L('Kleinster erwarteter Wert', 'Smallest expected value'), fx(e.modelle[0]!.erwartetMin, 2)]],
    [L('Leere Zellen werden mitgezählt; sie gehen in die Freiheitsgrade ein.', 'Empty cells are counted; they enter the degrees of freedom.')]));
  return aus;
}

/** R-Text zum Ansehen (wird nie ausgeführt). `terme`: die Terme des Modells (Faktor-Nummern), schon hierarchisch. */
export function logRCode(faktoren: string[], haeuf: string | null, terme: number[][]): string {
  const rnamen = faktoren.map(rn), formel = terme.map(t => t.map(i => rnamen[i]!).join(':')).join(' + '), summe = rnamen.join(' + ');
  return [
    `# ${L('daten: die Tabelle in R. Jede Zelle wird gezählt, auch die leeren.', 'daten: your table in R. Every cell is counted, including the empty ones.')}`,
    haeuf ? `zellen <- as.data.frame(xtabs(${rn(haeuf)} ~ ${summe}, data = daten))` : `zellen <- as.data.frame(xtabs(~ ${summe}, data = daten))`,
    `m <- glm(Freq ~ ${formel}, family = poisson, data = zellen)`,
    "c(G2 = deviance(m), df = df.residual(m), X2 = sum(residuals(m, 'pearson')^2), p = pchisq(deviance(m), df.residual(m), lower.tail = FALSE), AIC = AIC(m))"
  ].join('\n');
}
