/**
 * Gewichtete Regression (Fachblatt docs/fachblaetter/KURSPAKET.md, Abschnitt 5): Option bei der linearen Regression, eine Spalte mit PRÄZISIONSGEWICHTEN.
 * `lm(y ~ x, weights = w)` in R (`sp_wls`, engine/statable-kurspaket.R). w = 0 fällt heraus (die Zahl wird genannt), w < 0 oder ein fehlendes w sperrt.
 * Nicht dasselbe wie das Fallgewicht: Häufigkeitsgewichte zählen Fälle und ändern n; Präzisionsgewichte sagen, wie genau ein Wert ist, n bleibt die Zahl der Zeilen mit w > 0.
 * Beides zugleich ist gesperrt (lib/gewichte.ts, Stelle `vorhersage:wls`). SICHERHEIT: nur feste Wörter und Bezeichner im Aufruf.
 */
import type { TableItem } from '../engine/types';
import type { RSpalte } from '../engine/webr';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { L, Lp, d } from './sitzung.svelte';
import { zitat, aufzaehlung, ki, proz } from '../i18n/profil';
import { komma, ohneNull, pWert, type Saetze } from './ergebnis';
import { tabelle, fx, fo, fp, type Z } from './mwsaetze';
import { spaltenName } from './medmodsaetze';
import { rFange, rIds, rAnzeigeName as rn } from '../engine/rsicher';
import { katDaten, type RAufruf, type KatPraed } from './kategreg';
import { kpName, kpArr, kpZahl, kpText, kpObjekt, kpZuordnen, kpTermName, type KpPunkt } from './kpdaten';

export const R_PAKETE_WLS: string[] = [];

export interface WlsDaten {
  spalten: RSpalte[]; ziel: string; praed: KatPraed[]; gewicht: string;
  /** Zeilen mit Ziel und allen Vorhersagespalten */ vollstaendig: number;
  /** davon ohne Gewicht (leer, Text, „keine Angabe“) */ gewichtFehlt: number; negativ: number; nullen: number;
  /** Zeilen, die in die Rechnung gehen (w > 0) */ n: number; ausgelassen: number; konstant: string[]; gleicheSpalte: boolean;
}
export function wlsDaten(ziel: string, praed: string[], gewicht: string, zeilen: Wert[][], spalten: Spalte[]): WlsDaten {
  const kd = katDaten('zaehlreg', ziel, praed, zeilen, spalten, { zeit: gewicht });
  const g = kd.spalten.find(s => s.name === 'zeit');
  if (!g) throw new Error('Gewichtsspalte fehlt');
  const ohneGewicht = kd.spalten.filter(s => s.name !== 'zeit');
  const voll = zeilen.flatMap((_, r) => (ohneGewicht.every(s => s.werte[r] !== null && s.werte[r] !== undefined) ? [r] : []));
  const w = voll.map(r => g.werte[r] as number | null);
  const fehlt = w.filter(v => v === null).length, negativ = w.filter(v => v !== null && v < 0).length, nullen = w.filter(v => v === 0).length;
  const genutzt = voll.filter((_, i) => w[i] !== null && w[i]! > 0);
  const konstant = praed.filter((_, k) => { const s = kd.spalten[k + 1]!; const v = genutzt.map(r => s.werte[r]); return v.length > 0 && v.every(x => x === v[0]); });
  return { spalten: kd.spalten, ziel, praed: kd.praed, gewicht, vollstaendig: voll.length, gewichtFehlt: fehlt, negativ, nullen, n: genutzt.length, ausgelassen: zeilen.length - voll.length, konstant, gleicheSpalte: gewicht === ziel || praed.includes(gewicht) };
}
export const wlsKoefZahl = (praed: KatPraed[]): number => praed.reduce((a, p) => a + (p.art === 'faktor' ? Math.max(p.stufen.length - 1, 1) : 1), 0);

export type WlsCode = 'keine-praed' | 'gleiche-spalte' | 'gewicht-fehlt' | 'gewicht-negativ' | 'zu-wenig-faelle' | 'konstant' | 'nullen' | 'r-fehler';
export const WLS_SPERREN: ReadonlySet<WlsCode> = new Set<WlsCode>(['keine-praed', 'gleiche-spalte', 'gewicht-fehlt', 'gewicht-negativ', 'zu-wenig-faelle', 'konstant', 'r-fehler']);
export function wlsCodes(dt: WlsDaten): WlsCode[] {
  const aus: WlsCode[] = [];
  if (!dt.praed.length) aus.push('keine-praed');
  if (dt.gleicheSpalte) aus.push('gleiche-spalte');
  if (dt.gewichtFehlt > 0) aus.push('gewicht-fehlt');
  if (dt.negativ > 0) aus.push('gewicht-negativ');
  if (dt.n <= wlsKoefZahl(dt.praed) + 1) aus.push('zu-wenig-faelle');
  if (dt.konstant.length) aus.push('konstant');
  if (dt.nullen > 0 && !aus.some(c => WLS_SPERREN.has(c))) aus.push('nullen');
  return aus;
}
export interface WlsSatzKontext { n?: number; k?: number; zahl?: number; namen?: string[] }
export function wlsCodeSatz(c: WlsCode, x: WlsSatzKontext = {}): { text: string; klein?: string } {
  switch (c) {
    case 'keine-praed': return { text: L('Es fehlt mindestens eine Vorhersagespalte.', 'At least one predictor column is missing.') };
    case 'gleiche-spalte': return { text: L('Die Gewichtsspalte muss eine andere Spalte sein als das Ziel und die Vorhersagespalten.', 'The weight column must be a different column from the target and the predictors.') };
    case 'gewicht-fehlt': return { text: Lp(x.zahl ?? 0, `Bei ${x.zahl} Fall fehlt das Gewicht. Fehlende Gewichte sind nicht erlaubt.`, `Bei ${x.zahl} Fällen fehlt das Gewicht. Fehlende Gewichte sind nicht erlaubt.`, `The weight is missing for ${x.zahl} case. Missing weights are not allowed.`, `The weight is missing for ${x.zahl} cases. Missing weights are not allowed.`),
      klein: d('Ergänze die Gewichte oder nimm die Fälle heraus.', 'Ergänzen Sie die Gewichte oder nehmen Sie die Fälle heraus.', 'Add the weights or leave the cases out.') };
    case 'gewicht-negativ': return { text: Lp(x.zahl ?? 0, `${x.zahl} Gewicht ist negativ. Präzisionsgewichte müssen 0 oder größer sein.`, `${x.zahl} Gewichte sind negativ. Präzisionsgewichte müssen 0 oder größer sein.`, `${x.zahl} weight is negative. Precision weights must be 0 or greater.`, `${x.zahl} weights are negative. Precision weights must be 0 or greater.`) };
    case 'zu-wenig-faelle': return { text: L(`Zu wenige Fälle mit Gewicht über 0: ${x.n ?? 0} für ${x.k ?? 0} Koeffizienten und die Konstante.`, `Too few cases with a weight above 0: ${x.n ?? 0} for ${x.k ?? 0} coefficients and the constant.`) };
    case 'konstant': return { text: L(`Diese Spalten haben bei den Fällen mit Gewicht über 0 denselben Wert: ${aufzaehlung((x.namen ?? []).map(zitat))}. Sie lassen sich nicht von der Konstanten trennen.`, `These columns have the same value in the cases with a weight above 0: ${aufzaehlung((x.namen ?? []).map(zitat))}. They cannot be told apart from the constant.`),
      klein: d('Nimm sie heraus.', 'Nehmen Sie sie heraus.', 'Leave them out.') };
    case 'nullen': return { text: Lp(x.zahl ?? 0, `${x.zahl} Fall mit Gewicht 0 fällt heraus.`, `${x.zahl} Fälle mit Gewicht 0 fallen heraus.`, `${x.zahl} case with weight 0 drops out.`, `${x.zahl} cases with weight 0 drop out.`) };
    case 'r-fehler': return { text: L('R meldete bei der gewichteten Regression einen Fehler.', 'R reported an error in the weighted regression.') };
  }
}
/** Der Satz, der sagt, dass Präzisionsgewichte nicht das Fallgewicht sind (für die Wahl und die Sperre bei beiden zugleich). */
export const wlsNichtFallgewicht = (): string => L('Präzisionsgewichte sind nicht das Fallgewicht. Ein Fallgewicht zählt Fälle und ändert n; ein Präzisionsgewicht sagt, wie genau ein Wert ist, und n bleibt die Zahl der Zeilen mit Gewicht über 0. Beides zugleich rechnet Statable nicht.',
  'Precision weights are not the case weight. A case weight counts cases and changes n; a precision weight says how exact a value is, and n stays the number of rows with a weight above 0. Statable does not calculate both at the same time.');
export function wlsPunkte(dt: WlsDaten, name: (n: string) => string = x => x): KpPunkt[] {
  const k = wlsKoefZahl(dt.praed);
  const zahlFuer = (c: WlsCode) => (c === 'gewicht-fehlt' ? dt.gewichtFehlt : c === 'gewicht-negativ' ? dt.negativ : c === 'nullen' ? dt.nullen : undefined);
  const kopf: KpPunkt = { art: 'ok', text: Lp(dt.n, `${dt.n} Fall mit Gewicht über 0 und allen Angaben`, `${dt.n} Fälle mit Gewicht über 0 und allen Angaben`, `${dt.n} case with a weight above 0 and all values`, `${dt.n} cases with a weight above 0 and all values`) };
  return [kopf, ...wlsCodes(dt).map((c): KpPunkt => { const s = wlsCodeSatz(c, { n: dt.n, k, zahl: zahlFuer(c), namen: dt.konstant.map(name) }); return { art: WLS_SPERREN.has(c) ? 'sperre' : 'hinweis', text: s.text, ...(s.klein ? { klein: s.klein } : {}) }; })];
}

/* ------------------------------------------------------------ Aufruf und Antwort */
export function wlsAufruf(dt: WlsDaten): RAufruf {
  const namen = dt.praed.map((_, k) => kpName(k)), fak = dt.praed.flatMap((p, k) => (p.art === 'faktor' ? [namen[k]!] : []));
  return { code: rFange(`sp_wls(d, 'y', ${rIds(namen)}, ${rIds(fak)}, 'zeit')`), args: {} };
}
export interface WlsKoef { pIdx: number; stufe: string; b: number; se: number; t: number; p: number; kiU: number; kiO: number }
export interface WlsE {
  ziel: string; praed: KatPraed[]; gewicht: string; n: number; ausgelassen: number; nullen: number; koef: WlsKoef[];
  r2: number; r2Korr: number; sigma: number; df: number; f: number | null; fDf1: number | null; fDf2: number | null; fP: number | null; gewichtMin: number; gewichtMax: number;
}
export function wlsLesen(roh: unknown, dt: WlsDaten): { ok: true; e: WlsE } | { ok: false; code: WlsCode } {
  if (!kpObjekt(roh)) return { ok: false, code: 'r-fehler' };
  if (roh.fehler !== undefined) { const t = kpText(roh.fehler); return { ok: false, code: /negative weight/.test(t) ? 'gewicht-negativ' : /too few/.test(t) ? 'zu-wenig-faelle' : 'r-fehler' }; }
  const koef = kpArr<unknown>(roh.koef).map((o): WlsKoef | null => {
    if (!kpObjekt(o)) return null;
    return { ...kpZuordnen(kpText(o.name), dt.praed), b: kpZahl(o.b), se: kpZahl(o.se), t: kpZahl(o.t), p: kpZahl(o.p), kiU: kpZahl(o.ki_u), kiO: kpZahl(o.ki_o) };
  });
  if (!koef.length || koef.some(k => !k || !Number.isFinite(k.b))) return { ok: false, code: 'r-fehler' };
  const oder = (x: unknown) => { const v = kpZahl(x); return Number.isFinite(v) ? v : null; };
  return { ok: true, e: { ziel: dt.ziel, praed: dt.praed, gewicht: dt.gewicht, n: kpZahl(roh.n), ausgelassen: kpZahl(roh.ausgelassen), nullen: kpZahl(roh.nullen), koef: koef as WlsKoef[],
    r2: kpZahl(roh.r2), r2Korr: kpZahl(roh.r2_korr), sigma: kpZahl(roh.sigma), df: kpZahl(roh.df), f: oder(roh.f), fDf1: oder(roh.f_df1), fDf2: oder(roh.f_df2), fP: oder(roh.f_p), gewichtMin: kpZahl(roh.gewicht_min), gewichtMax: kpZahl(roh.gewicht_max) } };
}
export const wlsFehlerSatz = (c: WlsCode): string => wlsCodeSatz(c).text;

/* ------------------------------------------------------------ Sätze */
export function wlsWarnungen(e: WlsE, name: (n: string) => string = spaltenName): string[] {
  const w: string[] = [
    L('Die Gewichte müssen aus Wissen über die Messgenauigkeit kommen. Gewichte, die man aus den Residuen derselben Daten schätzt, machen die Standardfehler zu klein.', 'The weights must come from knowledge about the measurement precision. Weights that are estimated from the residuals of the same data make the standard errors too small.'),
    L('R² ist gewichtet und nicht mit dem ungewichteten R² vergleichbar.', 'R² is weighted and not comparable with the unweighted R².'),
    L(`Präzisionsgewichte sind nicht das Fallgewicht: Sie zählen keine Fälle. n ist die Zahl der Zeilen mit Gewicht über 0 (${e.n}).`, `Precision weights are not the case weight: they do not count cases. n is the number of rows with a weight above 0 (${e.n}).`)
  ];
  void name;
  if (e.nullen > 0) w.push(wlsCodeSatz('nullen', { zahl: e.nullen }).text);
  if (e.ausgelassen > 0) w.push(Lp(e.ausgelassen, `${e.ausgelassen} Zeile mit einer Lücke wurde ausgelassen.`, `${e.ausgelassen} Zeilen mit einer Lücke wurden ausgelassen.`, `${e.ausgelassen} row with a gap was left out.`, `${e.ausgelassen} rows with a gap were left out.`));
  return w;
}
export function saetzeWls(e: WlsE, name: (n: string) => string = spaltenName): Saetze {
  const sig = e.fP !== null && e.fP < 0.05, ziel = zitat(name(e.ziel)), pr = aufzaehlung(e.praed.map(p => zitat(name(p.name)))), gw = zitat(name(e.gewicht));
  const f = e.f !== null && e.fDf1 !== null && e.fDf2 !== null ? `F(${komma(e.fDf1, 0)}, ${komma(e.fDf2, 0)}) = ${komma(e.f, 2)}${e.fP !== null ? `, p ${pWert(e.fP)}` : ''}` : '';
  // Fehlt p, sagt der Satz nichts über den Zusammenhang (nie „kein Zusammenhang“ aus einem fehlenden p).
  const haupt = e.fP === null
    ? L(`Die gewichtete Regression von ${ziel} auf ${pr} (Präzisionsgewichte aus ${gw}, n = ${e.n}): R² = ${ohneNull(e.r2, 2)}, ${f}. Das p des Gesamttests liegt nicht vor.`, `The weighted regression of ${ziel} on ${pr} (precision weights from ${gw}, n = ${e.n}): R² = ${ohneNull(e.r2, 2)}, ${f}. The p of the overall test is not available.`)
    : sig
    ? L(`Die gewichtete Regression von ${ziel} auf ${pr} (Präzisionsgewichte aus ${gw}, n = ${e.n}) erklärt ${proz(komma(e.r2 * 100, 1))} der gewichteten Streuung: R² = ${ohneNull(e.r2, 2)}, ${f}.`, `The weighted regression of ${ziel} on ${pr} (precision weights from ${gw}, n = ${e.n}) explains ${proz(komma(e.r2 * 100, 1))} of the weighted variance: R² = ${ohneNull(e.r2, 2)}, ${f}.`)
    : L(`Die gewichtete Regression von ${ziel} auf ${pr} (Präzisionsgewichte aus ${gw}, n = ${e.n}) zeigt keinen belegbaren Zusammenhang: R² = ${ohneNull(e.r2, 2)}, ${f}.`, `The weighted regression of ${ziel} on ${pr} (precision weights from ${gw}, n = ${e.n}) shows no demonstrable relationship: R² = ${ohneNull(e.r2, 2)}, ${f}.`);
  const teile = e.koef.filter(k => k.pIdx >= 0).map(k => L(`${kpTermName(k.pIdx, k.stufe, e.praed, name)}: b = ${komma(k.b, 3)}, ${ki(komma(k.kiU, 2), komma(k.kiO, 2))}, p ${pWert(k.p)}.`, `${kpTermName(k.pIdx, k.stufe, e.praed, name)}: b = ${komma(k.b, 3)}, ${ki(komma(k.kiU, 2), komma(k.kiO, 2))}, p ${pWert(k.p)}.`));
  return { haupt, zusatz: teile.join(' '), vorsicht: wlsWarnungen(e, name).join(' '), apa: L(`gewichtet, R² = ${ohneNull(e.r2, 2)}, ${f}`, `weighted, R² = ${ohneNull(e.r2, 2)}, ${f}`), marken: [] };
}
export const wlsGerechnet = (): string => L('gewichtete Regression mit Präzisionsgewichten (lm, weights)', 'weighted regression with precision weights (lm, weights)');
export const wlsFachwort = (): string => L('gewichtete Regression (Präzisionsgewichte)', 'weighted regression (precision weights)');
export const wlsWarum = (): string => L('Die Zielgröße ist eine Zahl, und die Werte sind unterschiedlich genau. Die gewichtete Regression gibt genauen Werten mehr Gewicht (Präzisionsgewichte). Das ist nicht das Fallgewicht: Es zählt keine Fälle und ändert n nicht. Die Gewichte müssen aus Wissen über die Messgenauigkeit kommen, nicht aus den Residuen derselben Daten.',
  'The target is a number, and the values differ in precision. The weighted regression gives exact values more weight (precision weights). This is not the case weight: it does not count cases and does not change n. The weights must come from knowledge about the measurement precision, not from the residuals of the same data.');

/* ------------------------------------------------------------ Tabellen */
export function tabellenWls(e: WlsE, name: (n: string) => string = spaltenName): TableItem[] {
  const aus: TableItem[] = [];
  aus.push(tabelle('WLS Koeffizienten', L('Gewichtete Regression: Koeffizienten', 'Weighted regression: coefficients'), ['', 'b', 'SE', 't', 'p', L('95 %-KI unten', '95% CI lower'), L('95 %-KI oben', '95% CI upper')],
    e.koef.map((k): Z[] => [kpTermName(k.pIdx, k.stufe, e.praed, name), fx(k.b, 4), fx(k.se, 4), fx(k.t, 3), fp(k.p), fx(k.kiU, 4), fx(k.kiO, 4)]),
    [L(`Präzisionsgewichte aus ${name(e.gewicht)}. Das Intervall nutzt die t-Verteilung mit ${e.df} Freiheitsgraden.`, `Precision weights from ${name(e.gewicht)}. The interval uses the t distribution with ${e.df} degrees of freedom.`)]));
  aus.push(tabelle('WLS Modell', L('Gewichtete Regression: Modell', 'Weighted regression: model'), [L('Kennzahl', 'Measure'), L('Wert', 'Value')], [
    ['n', fx(e.n, 0)], [L('Zeilen mit Gewicht 0 (herausgefallen)', 'Rows with weight 0 (dropped)'), fx(e.nullen, 0)], [L('R² (gewichtet)', 'R² (weighted)'), fo(e.r2, 4)], [L('R² korrigiert (gewichtet)', 'Adjusted R² (weighted)'), fo(e.r2Korr, 4)],
    ['σ', fx(e.sigma, 3)], [L('Freiheitsgrade', 'Degrees of freedom'), fx(e.df, 0)], ...(e.f !== null ? [['F', fx(e.f, 3)] as Z[], ['p (F)', fp(e.fP ?? NaN)] as Z[]] : []),
    [L('Kleinstes Gewicht', 'Smallest weight'), fx(e.gewichtMin, 4)], [L('Größtes Gewicht', 'Largest weight'), fx(e.gewichtMax, 4)]],
    [L('R² ist gewichtet und nicht mit dem ungewichteten R² vergleichbar.', 'R² is weighted and not comparable with the unweighted R².')]));
  return aus;
}
/** R-Text zum Ansehen (wird nie ausgeführt). */
export function wlsRCode(ziel: string, praed: string[], gewicht: string): string {
  const summe = praed.map(rn).join(' + ');
  return [
    `# ${L('daten: die Tabelle in R. Zeilen mit Gewicht 0 fallen heraus.', 'daten: your table in R. Rows with weight 0 drop out.')}`,
    `daten <- daten[daten$${rn(gewicht)} > 0, ]`,
    `m <- lm(${rn(ziel)} ~ ${summe}, data = daten, weights = ${rn(gewicht)})`,
    'summary(m)', 'confint(m)'
  ].join('\n');
}
