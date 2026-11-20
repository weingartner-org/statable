/**
 * Meta-Analyse (R: metafor über webR) - Eingabe, Prüfung, Daten für R, Lesen der R-Antwort, Rückrechnung, Achsenmarken.
 * Die Rechnung steht in engine/statable.R (sp_meta), der Aufruf in rverfahren.svelte.ts.
 *
 * Aufbau nach den Programmen (nachgesehen 08.10.2026, Quellen in docs/ENTSCHEIDUNGEN-NACH-PROFIPROGRAMMEN-2026-10-08.md): JASP „Classical Meta-Analysis“ und jamovi MAJOR
 * rechnen metafor::rma mit REML; JASP zeigt Effekt mit Intervall, Q, I², τ², Forest- und Funnel-Plot, Egger-Test. Statable ergänzt τ² mit Intervall (confint) und das Prädiktionsintervall.
 * Drei Eingabearten: (a) Effektstärke + SE oder + Intervallgrenzen, (b) zwei Gruppen mit M/SD/n -> Hedges g (escalc „SMD“), (c) Korrelation r + n -> Fisher z (escalc „ZCOR“), Ergebnis zurück nach r.
 *
 * ⚠ Von der Fachperson abzunehmen: REML als Standard, Egger klassisch (lm), die Schwellen für die Hinweise (k < 5: τ² sehr unsicher; k < 10: Egger wenig Aussagekraft, Sterne et al. 2011),
 *   die Intervall-aus-SE-Umrechnung mit 1,96 und die Wörter zur Größe (Cohen; Higgins et al. 2003 für I²).
 */
import { Lp, d } from './sitzung.svelte';
import { ort, zitat } from '../i18n/profil';
import { rAnzeigeZahl, rAnzeigeText } from '../engine/rsicher';

export const R_PAKETE_META = ['metafor'];
export const META_K_WENIG = 5;
export const META_K_EGGER = 10;
/** Mehr Studien rechnet R im Browser nicht (Abschlusstest A7, gemessen: 1.000 Studien 5,5 s, 3.000 Studien 42 s, 5.000 Studien nach 167 s „cannot allocate vector“). */
export const META_K_MAX = 3000;
/** Meldung vor dem Rechnen, wenn es zu viele Studien sind; sonst `null`. */
export function metaGrenzeText(k: number): string | null {
  if (k <= META_K_MAX) return null;
  const a = k.toLocaleString(ort()), b = META_K_MAX.toLocaleString(ort());
  return d(`Das sind ${a} Studien. Statable rechnet eine Meta-Analyse mit bis zu ${b} Studien - darüber reicht der Speicher im Browser nicht. Wähle eine Auswahl aus oder fasse Studien zusammen.`, `Das sind ${a} Studien. Statable rechnet eine Meta-Analyse mit bis zu ${b} Studien - darüber reicht der Speicher im Browser nicht. Wählen Sie eine Auswahl aus oder fassen Sie Studien zusammen.`, `That is ${a} studies. Statable runs a meta-analysis with up to ${b} studies - beyond that the browser runs out of memory. Pick a selection or combine studies.`);
}

export type MetaArt = 'es' | 'smd' | 'r';
export type MetaModus = 'se' | 'ki';
export interface MetaEntwurf { art: MetaArt; modus: MetaModus; massName: string; verhaeltnis: boolean; kh: boolean; zeilen: { name: string; w: string[]; /** Werte der Moderatoren (Meta-Regression), je Moderator einer */ m?: string[] }[]; /** Namen der Moderatoren (Meta-Regression, S-H); leer = keine */ modNamen?: string[] }
/** Was gerechnet wird: nur gültige Zeilen, Zahlen. `zeilen[i]` hat je Art: es = [Effekt, SE]; smd = [M1, SD1, n1, M2, SD2, n2]; r = [r, n]. */
export interface MetaEingabe { art: MetaArt; massName: string; verhaeltnis: boolean; kh: boolean; namen: string[]; zeilen: number[][]; /** Moderatoren der Meta-Regression: je Moderator Name und ein Wert je Studie (gleiche Reihenfolge wie `zeilen`); fehlt = keine */ mods?: { name: string; werte: number[] }[] }
/** Meta-Regression (S-H): ein Modell mit den Moderatoren, REML wie oben. Koeffizienten auf der Rechenskala (g, log, Fisher z), erste Zeile = Konstante. */
export interface MetaReg {
  namen: string[]; b: number[]; se: number[]; stat: number[]; p: number[]; lo: number[]; hi: number[]; df: number | null;
  qm: number; qmDf: number; qmP: number; qe: number; qeDf: number; qeP: number; tau2: number; i2: number; r2: number; k: number;
}
export interface MetaStudie { name: string; yi: number; sei: number; gewicht: number }
export interface Meta {
  art: 'meta'; ein: MetaEingabe; k: number; studien: MetaStudie[];
  est: number; se: number; lo: number; hi: number; stat: number; p: number; statDf: number | null;
  pLo: number; pHi: number;
  /** Prädiktionsintervall nach IntHout et al. (2016), t mit k − 2 Freiheitsgraden (NaN bei k = 2). */
  pitLo: number; pitHi: number;
  tau2: number; tau2Lo: number; tau2Hi: number; tau: number; tauLo: number; tauHi: number; i2: number; i2Lo: number; i2Hi: number; h2: number;
  q: number; qDf: number; qP: number;
  eggerStat: number; eggerP: number; eggerDf: number;
  meldungen: string[];
  /** nur mit Moderatoren */
  reg?: MetaReg;
}

export const META_SPALTEN = (art: MetaArt, modus: MetaModus, T: (de: string, en: string) => string): string[] =>
  art === 'smd' ? [T('Mittelwert Gruppe 1', 'Mean group 1'), T('SD Gruppe 1', 'SD group 1'), T('n Gruppe 1', 'n group 1'), T('Mittelwert Gruppe 2', 'Mean group 2'), T('SD Gruppe 2', 'SD group 2'), T('n Gruppe 2', 'n group 2')]
  : art === 'r' ? [T('Korrelation r', 'Correlation r'), 'n']
  : modus === 'ki' ? [T('Effekt', 'Effect'), T('untere Grenze', 'lower limit'), T('obere Grenze', 'upper limit')] : [T('Effekt', 'Effect'), T('Standardfehler (SE)', 'Standard error (SE)')];
export const metaSpaltenZahl = (art: MetaArt, modus: MetaModus) => (art === 'smd' ? 6 : art === 'r' ? 2 : modus === 'ki' ? 3 : 2);

/** Zahl aus Text: Dezimalkomma oder -punkt, Minus auch als − ; sonst null. */
export function parseZahl(t: string): number | null {
  const x = t.trim().replace(/\s/g, '').replace('−', '-').replace(',', '.');
  if (!x || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(x)) return null;
  const v = Number(x);
  return Number.isFinite(v) ? v : null;
}

/** Text aus der Tabellenkalkulation (Tabulator oder Semikolon, eine Studie je Zeile). Erste Spalte = Name. Eine Kopfzeile (ohne Zahlen) wird übersprungen. */
export function metaEinfuegen(text: string, anzahl: number, nMod = 0): { name: string; w: string[]; m?: string[] }[] {
  const zeilen = text.replace(/\r/g, '').split('\n').filter(z => z.trim() !== '');
  const out = zeilen.map(z => {
    const teile = z.split(z.includes('\t') ? '\t' : ';').map(t => t.trim());
    // Beginnt die Zeile mit einer Zahl und gibt es genau so viele Zahlen wie Spalten, fehlt der Name.
    const nurZahlen = teile.length === anzahl + nMod && teile.every(t => parseZahl(t) !== null);
    const mod = (ab: number) => (nMod ? { m: Array.from({ length: nMod }, (_, i) => teile[ab + i] ?? '') } : {});
    return nurZahlen ? { name: '', w: teile.slice(0, anzahl), ...mod(anzahl) } : { name: teile[0] ?? '', w: Array.from({ length: anzahl }, (_, i) => teile[i + 1] ?? ''), ...mod(anzahl + 1) };
  });
  const erste = out[0];
  if (erste && erste.w.every(t => parseZahl(t) === null) && out.length > 1) out.shift();
  return out;
}

export interface MetaPunkt { art: 'ok' | 'hinweis' | 'info' | 'sperre'; text: string; klein?: string }
export function metaPruefung(en: MetaEntwurf, T: (de: string, en: string) => string): { eingabe: MetaEingabe | null; punkte: MetaPunkt[] } {
  const n = metaSpaltenZahl(en.art, en.modus), punkte: MetaPunkt[] = [];
  const namen: string[] = [], zeilen: number[][] = [], ausgelassen: string[] = [];
  const nMod = en.modNamen?.length ?? 0, modWerte: number[][] = Array.from({ length: nMod }, () => []);
  en.zeilen.forEach((z, i) => {
    if (!z.name.trim() && z.w.slice(0, n).every(t => !t.trim())) return;
    const name = z.name.trim() || T(`Studie ${i + 1}`, `Study ${i + 1}`);
    const v = z.w.slice(0, n).map(parseZahl);
    const grund = zeilenFehler(en, v, T);
    if (grund) { ausgelassen.push(`${name}: ${grund}`); return; }
    const mv = (z.m ?? []).slice(0, nMod).map(parseZahl);
    if (nMod && (mv.length < nMod || mv.some(x => x === null))) { ausgelassen.push(`${name}: ${T('Wert eines Moderators fehlt oder ist nicht lesbar', 'a moderator value is missing or not readable')}`); return; }
    mv.forEach((x, j) => modWerte[j]!.push(x as number));
    let werte = v as number[];
    if (en.art === 'es' && en.modus === 'ki') werte = [werte[0]!, (werte[2]! - werte[1]!) / (2 * 1.96)];
    namen.push(name); zeilen.push(werte);
  });
  const k = zeilen.length;
  // Verhältnismaß: Ergebnis und Diagramme zeigen das zurückgerechnete Maß (OR, RR, HR). Ein Name „log OR“ wäre dort falsch (Abnahme 3, M2): „log“ am Anfang entfällt.
  const roh = en.massName.trim(), verh = en.art === 'es' && en.verhaeltnis;
  const massNameOhneLog = verh && /^(ln|log)(?![a-zäöüß])[\s(_-]*/i.test(roh) && roh.replace(/^(ln|log)(?![a-zäöüß])[\s(_-]*/i, '').replace(/\)$/, '').trim() ? roh.replace(/^(ln|log)(?![a-zäöüß])[\s(_-]*/i, '').replace(/\)$/, '').trim() : roh;
  if (verh && massNameOhneLog !== roh) punkte.push({ art: 'hinweis', text: T(`Der Name heißt „${massNameOhneLog}“, nicht „${roh}“`, `The name is "${massNameOhneLog}", not "${roh}"`), klein: T('Statable zeigt das Ergebnis zurückgerechnet (das Verhältnis selbst), darum ohne „log“.', 'Statable shows the result back-transformed (the ratio itself), hence without "log".') });
  if (k < 2) punkte.push({ art: 'sperre', text: T(`Mindestens zwei Studien nötig, vollständig sind ${k}`, `At least two studies are needed, ${k} complete`), klein: d('Trage in jeder Zeile den Namen und alle Zahlen ein.', 'Tragen Sie in jeder Zeile den Namen und alle Zahlen ein.', 'Enter the name and all numbers in each row.') });
  else punkte.push({ art: k >= META_K_WENIG ? 'ok' : 'hinweis', text: T(`${k} Studien`, `${k} studies`), klein: k < META_K_WENIG ? T(`Bei unter ${META_K_WENIG} Studien ist die Streuung zwischen den Studien (τ²) sehr unsicher; das Ergebnis mit Vorsicht lesen.`, `With fewer than ${META_K_WENIG} studies the between-study variance (τ²) is very uncertain; read the result with caution.`) : undefined });
  if (ausgelassen.length) punkte.push({ art: 'hinweis', text: Lp(ausgelassen.length, `${ausgelassen.length} Zeile wird nicht gerechnet`, `${ausgelassen.length} Zeilen werden nicht gerechnet`, `${ausgelassen.length} row is not included`, `${ausgelassen.length} rows are not included`), klein: ausgelassen.slice(0, 4).join('; ') + (ausgelassen.length > 4 ? ' …' : '') });
  if (new Set(namen).size < namen.length) punkte.push({ art: 'hinweis', text: T('Zwei Studien haben denselben Namen', 'Two studies have the same name'), klein: T('Das stört die Rechnung nicht, die Beschriftung im Diagramm ist dann schwerer zu lesen.', 'This does not affect the calculation, but the labels in the plot are harder to read.') });
  punkte.push({ art: 'info', text: T('Kann Statable nicht prüfen: Messen die Studien dasselbe Maß, und stammen sie von unabhängigen Stichproben?', "Statable can't check this: do the studies measure the same outcome, and are they from independent samples?"), klein: T('Dieselbe Stichprobe darf nicht in zwei Studien stecken, sonst zählt sie doppelt.', 'The same sample must not appear in two studies, or it counts twice.') });
  if (en.art === 'es' && en.verhaeltnis) punkte.push({ art: 'info', text: d('Verhältnismaß: Trage die Logarithmen ein (zum Beispiel log OR).', 'Verhältnismaß: Tragen Sie die Logarithmen ein (zum Beispiel log OR).', 'Ratio measure: enter the logarithms (for example log OR).'), klein: T('Statable rechnet auf der Log-Skala und zeigt Ergebnis und Diagramme zurückgerechnet (OR, RR, HR).', 'Statable calculates on the log scale and shows results and plots back-transformed (OR, RR, HR).') });
  // Meta-Regression (S-H): Moderatoren sind Zahlen je Studie. Nur sinnvoll mit genug Studien (Faustregel: mindestens 10 je Moderator, Borenstein et al. 2009, Kap. 20; Higgins & Thompson 2004).
  let mods: { name: string; werte: number[] }[] | undefined;
  if (nMod && k >= 2) {
    mods = (en.modNamen ?? []).map((n, j) => ({ name: n.trim() || T(`Moderator ${j + 1}`, `Moderator ${j + 1}`), werte: modWerte[j]! }));
    const gleich = mods.find(m => new Set(m.werte).size < 2), modWort = nMod === 1 ? T('Moderator', 'moderator') : T('Moderatoren', 'moderators');
    if (gleich) punkte.push({ art: 'sperre', text: T(`${zitat(gleich.name)} hat bei allen Studien denselben Wert`, `${zitat(gleich.name)} has the same value in all studies`), klein: T('Ein Moderator, der sich zwischen den Studien nicht unterscheidet, kann nichts erklären.', 'A moderator that does not differ between studies cannot explain anything.') });
    else if (k <= nMod + 1) punkte.push({ art: 'sperre', text: T(`Mit ${k} Studien lassen sich nicht ${nMod} Moderatoren schätzen`, `With ${k} studies, ${nMod} moderators cannot be estimated`), klein: T('Es braucht mehr Studien als Koeffizienten (Moderatoren plus Konstante).', 'There must be more studies than coefficients (moderators plus intercept).') });
    else punkte.push({ art: k >= 10 * nMod ? 'ok' : 'hinweis', text: T(`Meta-Regression mit ${nMod} ${modWort}`, `Meta-regression with ${nMod} ${modWort}`), klein: k >= 10 * nMod ? T('Genug Studien für die Faustregel (mindestens 10 je Moderator).', 'Enough studies for the rule of thumb (at least 10 per moderator).') : T(`Faustregel: mindestens 10 Studien je Moderator. Mit ${k} Studien ist das Ergebnis vorläufig und kann leicht zufällig sein.`, `Rule of thumb: at least 10 studies per moderator. With ${k} studies the result is preliminary and may easily be due to chance.`) });
  }
  return { eingabe: k >= 2 ? { art: en.art, massName: massNameOhneLog, verhaeltnis: en.art === 'es' && en.verhaeltnis, kh: en.kh, namen, zeilen, ...(mods ? { mods } : {}) } : null, punkte };
}

function zeilenFehler(en: MetaEntwurf, v: (number | null)[], T: (de: string, en: string) => string): string | null {
  if (v.some(x => x === null)) return T('nicht alle Zahlen ausgefüllt oder lesbar', 'not all numbers filled in or readable');
  const x = v as number[];
  if (en.art === 'es') {
    if (en.modus === 'se') return x[1]! > 0 ? null : T('SE muss größer als 0 sein', 'SE must be greater than 0');
    return x[2]! > x[1]! ? (x[0]! >= x[1]! && x[0]! <= x[2]! ? null : T('Effekt liegt außerhalb des Intervalls', 'effect lies outside the interval')) : T('obere Grenze muss über der unteren liegen', 'upper limit must be above the lower limit');
  }
  if (en.art === 'r') return Math.abs(x[0]!) < 1 && x[1]! >= 4 && Number.isInteger(x[1]!) ? null : T('r muss zwischen −1 und 1 liegen, n mindestens 4', 'r must lie between −1 and 1, n at least 4');
  if (x[1]! <= 0 || x[4]! <= 0) return T('SD muss größer als 0 sein', 'SD must be greater than 0');
  if (x[2]! < 2 || x[5]! < 2 || !Number.isInteger(x[2]!) || !Number.isInteger(x[5]!)) return T('n muss je Gruppe mindestens 2 sein', 'n must be at least 2 per group');
  return null;
}

/* ------------------------------------------------------------ Daten für R */

export function metaDaten(e: MetaEingabe): { name: string; art: 'zahl'; werte: (number | null)[] }[] {
  const spalte = (j: number) => e.zeilen.map(z => z[j]!);
  const namen = e.art === 'smd' ? ['m1i', 'sd1i', 'n1i', 'm2i', 'sd2i', 'n2i'] : e.art === 'r' ? ['ri', 'ni'] : ['yi', 'sei'];
  return [...namen.map((name, j) => ({ name, art: 'zahl' as const, werte: spalte(j) })), ...(e.mods ?? []).map((m, j) => ({ name: `mod${j + 1}`, art: 'zahl' as const, werte: m.werte as (number | null)[] }))];
}

/* ------------------------------------------------------------ R-Antwort lesen */

const arr = <T>(x: unknown): T[] => (x == null ? [] : Array.isArray(x) ? (x as T[]) : [x as T]);
const num = (x: unknown): number => { const v = arr<number | null>(x)[0]; return typeof v === 'number' && Number.isFinite(v) ? v : NaN; };
const nums = (x: unknown): number[] => arr<number | null>(x).map(v => (typeof v === 'number' ? v : NaN));

export function metaLesen(r: Record<string, unknown>, ein: MetaEingabe): Meta {
  const idx = nums(r.idx), yi = nums(r.yi), sei = nums(r.sei), w = nums(r.gewicht);
  const df = num(r.stat_df);
  return {
    art: 'meta', ein, k: num(r.k),
    studien: idx.map((ix, i) => ({ name: ein.namen[ix - 1] ?? `${ix}`, yi: yi[i]!, sei: sei[i]!, gewicht: w[i]! })),
    est: num(r.est), se: num(r.se), lo: num(r.ci_lb), hi: num(r.ci_ub), stat: num(r.stat), p: num(r.p), statDf: Number.isFinite(df) ? df : null,
    pLo: num(r.pi_lb), pHi: num(r.pi_ub), pitLo: num(r.pit_lb), pitHi: num(r.pit_ub),
    tau2: num(r.tau2), tau2Lo: num(r.tau2_lo), tau2Hi: num(r.tau2_hi), tau: num(r.tau), tauLo: num(r.tau_lo), tauHi: num(r.tau_hi), i2: num(r.i2), i2Lo: num(r.i2_lo), i2Hi: num(r.i2_hi), h2: num(r.h2),
    q: num(r.q), qDf: num(r.q_df), qP: num(r.q_p), eggerStat: num(r.egger_stat), eggerP: num(r.egger_p), eggerDf: num(r.egger_df),
    meldungen: arr<string>(r.meldungen),
    ...(ein.mods?.length && r.reg ? { reg: regLesen(r.reg as Record<string, unknown>, ein.mods.map(m => m.name)) } : {})
  };
}
function regLesen(r: Record<string, unknown>, mods: string[]): MetaReg {
  const df = num(r.df);
  return {
    namen: ['(Intercept)', ...mods], b: nums(r.b), se: nums(r.se), stat: nums(r.stat), p: nums(r.p), lo: nums(r.ci_lb), hi: nums(r.ci_ub), df: Number.isFinite(df) ? df : null,
    qm: num(r.qm), qmDf: num(r.qm_df), qmP: num(r.qm_p), qe: num(r.qe), qeDf: num(r.qe_df), qeP: num(r.qe_p), tau2: num(r.tau2), i2: num(r.i2), r2: num(r.r2), k: num(r.k)
  };
}

/* ------------------------------------------------------------ Skala und Rückrechnung */

/** Von der Rechenskala (g, log, Fisher z) auf die Anzeige (g, Verhältnis, r). */
export const rueck = (m: { ein: MetaEingabe }) => (v: number): number => (m.ein.art === 'r' ? Math.tanh(v) : m.ein.verhaeltnis ? Math.exp(v) : v);
/** Name des Maßes für Sätze und Achsen. */
export function massName(ein: MetaEingabe, T: (de: string, en: string) => string): string {
  if (ein.art === 'smd') return 'Hedges g';
  if (ein.art === 'r') return T('Korrelation r', 'correlation r');
  return ein.massName || (ein.verhaeltnis ? T('Verhältnis', 'ratio') : T('Effekt', 'effect'));
}
export const massKurz = (ein: MetaEingabe, T: (de: string, en: string) => string) => (ein.art === 'smd' ? 'g' : ein.art === 'r' ? 'r' : ein.massName || (ein.verhaeltnis ? T('Verhältnis', 'ratio') : T('Effekt', 'effect')));

/** „Schöne“ Achsenmarken auf der Rechenskala, beschriftet in der Anzeige-Skala. */
export function metaTicks(lo: number, hi: number, ein: MetaEingabe): { pos: number; text: string }[] {
  const fmt = (v: number, d: number) => v.toFixed(d).replace('-', '−');
  const mk = (kand: number[], tf: (v: number) => number, back: (v: number) => number, d: (v: number) => number) =>
    kand.filter(v => tf(v) >= lo - 1e-9 && tf(v) <= hi + 1e-9).map(v => ({ pos: tf(v), text: fmt(back(v), d(v)) }));
  if (ein.art === 'r') {
    const kand = [-0.9, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 0.9];
    return mk(kand, Math.atanh, v => v, () => 1);
  }
  if (ein.verhaeltnis) {
    const kand = [0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
    return mk(kand, Math.log, v => v, v => (v >= 10 ? 0 : v >= 1 ? 0 : v >= 0.1 ? 1 : 2));
  }
  const roh = (hi - lo || 1) / 5, mag = 10 ** Math.floor(Math.log10(roh)), st = [1, 2, 5, 10].map(f => f * mag).find(f => f >= roh) ?? mag;
  const out: { pos: number; text: string }[] = [];
  const d = Math.max(0, -Math.floor(Math.log10(st) + 1e-9));
  for (let v = Math.ceil(lo / st - 1e-9) * st; v <= hi + 1e-9; v += st) out.push({ pos: v, text: fmt(Math.abs(v) < 1e-12 ? 0 : v, d) });
  return out;
}

/** Der R-Aufruf zum Nachrechnen. `T` wählt die Sprache der Kommentare. */
export function metaRCode(ein: MetaEingabe, T: (de: string, en: string) => string): string {
  const v = (j: number) => `c(${ein.zeilen.map(z => rAnzeigeZahl(z[j])).join(', ')})`;   // Anzeige: nur endliche Zahlen, nie Text
  const kopf = [T('# Der gleiche Aufruf in R (Paket metafor):', '# The same call in R (package metafor):'), 'library(metafor)'];
  const rma = `res <- rma(yi, vi, data = d, method = "REML"${ein.kh ? ', test = "knha"' : ''})`;
  // Meta-Regression (S-H): die Moderatoren als Spalten und ein zweites Modell mit mods = ~ …
  const regZeilen = ein.mods?.length
    ? [...ein.mods.map((m, j) => `d$mod${j + 1} <- c(${m.werte.map(rAnzeigeZahl).join(', ')})   # ${rAnzeigeText(m.name)}`),
       `reg <- rma(yi, vi, mods = ~ ${ein.mods.map((_, j) => `mod${j + 1}`).join(' + ')}, data = d, method = "REML"${ein.kh ? ', test = "knha"' : ''})   # ${T('Meta-Regression', 'meta-regression')}`, 'summary(reg)']
    : [];
  const rest = [rma, 'summary(res)', ...regZeilen, `confint(res)               # ${T('τ², τ, I² mit Intervall', 'τ², τ, I² with interval')}`, `predict(res)               # ${T('Prädiktionsintervall (wie metafor/JASP)', 'prediction interval (as metafor/JASP)')}`, 'forest(res); funnel(res)', `regtest(res, model = "lm")  # ${T('Egger-Test', 'Egger test')}`];
  if (ein.art === 'smd') return [...kopf, `d <- escalc(measure = "SMD", m1i = ${v(0)}, sd1i = ${v(1)}, n1i = ${v(2)},`, `              m2i = ${v(3)}, sd2i = ${v(4)}, n2i = ${v(5)})   # Hedges g`, ...rest].join('\n');
  if (ein.art === 'r') return [...kopf, `d <- escalc(measure = "ZCOR", ri = ${v(0)}, ni = ${v(1)})   # Fisher z`, ...rest, `predict(res, transf = transf.ztor)   # ${T('zurück nach r', 'back to r')}`].join('\n');
  return [...kopf, `d <- data.frame(yi = ${v(0)}, vi = (${v(1)})^2)   # ${T('Effekt und Varianz = SE²', 'effect and variance = SE²')}`, ...rest].join('\n');
}
