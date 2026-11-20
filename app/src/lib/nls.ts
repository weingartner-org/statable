/**
 * Nichtlineare Regression mit FESTER Formelauswahl (Fachblatt Abschnitt 5): Option bei „Lässt sich etwas vorhersagen?“, Zahl-Ziel und genau eine Zahl als Vorhersage.
 * Vier Formeln, keine freie Formel: Michaelis-Menten a x/(b+x), exponentiell a exp(b x), logistisch a/(1+exp((c−x)/b)), Potenz a x^b.
 * Gerechnet wird in R (`sp_nls`, engine/statable-kurspaket.R, nur `stats`): `nls(…, start = s, control = nls.control(maxiter = 200, tol = 1e-7, minFactor = 1/4096))`,
 * die Startwerte kommen aus linearen Hilfsregressionen (R-Seite). Scheitert die Rechnung, gibt es einen Satz und nie eine Zahl (`nicht-konvergiert`).
 * Es gibt kein R² im Satz. SICHERHEIT: Der Aufruf enthält nur feste Wörter und Bezeichner; Namen aus der Datei stehen nur in den Daten.
 * Sollwerte: lib/testdaten/abschluss-erwartet.json (scripts/abschluss-erwartet.R); Test: engine/nls.webr.test.ts.
 */
import type { TableItem } from '../engine/types';
import type { RSpalte } from '../engine/webr';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { L, Lp, d } from './sitzung.svelte';
import { zitat } from '../i18n/profil';
import { komma, pWert, type Saetze } from './ergebnis';
import { tabelle, fx, fxg, fp, type Z } from './mwsaetze';
import { spaltenName } from './medmodsaetze';
import { rFange, rQ, rWahl, rAnzeigeName as rn } from '../engine/rsicher';
import type { RAufruf } from './kategreg';
import { kpName, kpIndex, kpZahlen, kpArr, kpZahl, kpText, kpWahr, kpObjekt, kpZahlen2, type KpPunkt } from './kpdaten';

export const R_PAKETE_NLS: string[] = [];

export type NlsArt = 'michaelis' | 'exponentiell' | 'logistisch' | 'potenz';
/** Die feste Auswahl; eine andere Formel gibt es nicht. */
export const NLS_FORMELN: readonly NlsArt[] = ['michaelis', 'exponentiell', 'logistisch', 'potenz'];
export const istNlsArt = (x: unknown): x is NlsArt => typeof x === 'string' && (NLS_FORMELN as readonly string[]).includes(x);
/** Anzahl der Parameter je Formel. */
export const NLS_PARAMETER: Record<NlsArt, number> = { michaelis: 2, exponentiell: 2, logistisch: 3, potenz: 2 };
export const nlsFormelName = (a: NlsArt): string => (a === 'michaelis' ? 'Michaelis-Menten' : a === 'exponentiell' ? L('Exponentiell', 'Exponential') : a === 'logistisch' ? L('Logistisch', 'Logistic') : L('Potenz', 'Power'));
/** Die Formel als Text (y in Abhängigkeit von x). */
export const nlsFormelText = (a: NlsArt): string => (a === 'michaelis' ? 'y = a · x / (b + x)' : a === 'exponentiell' ? 'y = a · exp(b · x)' : a === 'logistisch' ? 'y = a / (1 + exp((c − x) / b))' : 'y = a · x^b');
/** Welche Voraussetzung die Startwerte an die Daten stellen: x > 0 und/oder y > 0 (Fachblatt Abschnitt 5). */
export const NLS_POSITIV: Record<NlsArt, { x: boolean; y: boolean }> = { michaelis: { x: true, y: true }, exponentiell: { x: false, y: true }, logistisch: { x: false, y: true }, potenz: { x: true, y: true } };
/** Der Wert der Kurve an der Stelle x (Parameter in der Reihenfolge a, b, c). */
export function nlsWert(art: NlsArt, b: number[], x: number): number {
  const [a, bb, c] = [b[0]!, b[1]!, b[2]!];
  switch (art) {
    case 'michaelis': return (a * x) / (bb + x);
    case 'exponentiell': return a * Math.exp(bb * x);
    case 'logistisch': return a / (1 + Math.exp((c - x) / bb));
    case 'potenz': return a * Math.pow(x, bb);
  }
}

export interface NlsDaten {
  spalten: RSpalte[]; ziel: string; praed: string[]; art: NlsArt | '';
  /** Anzahl gewählter Vorhersagespalten und ob die eine eine Zahlenspalte ist */ anzahlPraed: number; praedZahl: boolean; zielZahl: boolean;
  n: number; ausgelassen: number; nichtPositivX: number; nichtPositivY: number; verschiedenX: number;
}
/** Daten für R: das Ziel als `y`, die eine Vorhersagespalte als `p01`. Zeilen mit Lücke in einer der beiden Spalten fallen heraus (gezählt). */
export function nlsDaten(ziel: string, praed: string[], art: NlsArt | '', zeilen: Wert[][], spalten: Spalte[]): NlsDaten {
  const zi = kpIndex(spalten, ziel), pi = praed.length === 1 ? kpIndex(spalten, praed[0]!) : -1;
  const zs = zi >= 0 ? spalten[zi] : undefined, ps = pi >= 0 ? spalten[pi] : undefined;
  const zielZahl = !!zs && zs.art === 'zahl', praedZahl = !!ps && ps.art === 'zahl';
  const aus = (x: Partial<NlsDaten>): NlsDaten => ({ spalten: [], ziel, praed, art, anzahlPraed: praed.length, praedZahl, zielZahl, n: 0, ausgelassen: zeilen.length, nichtPositivX: 0, nichtPositivY: 0, verschiedenX: 0, ...x });
  if (!zs || !ps || !zielZahl || !praedZahl) return aus({});
  const y = kpZahlen(zs, zi, zeilen), x = kpZahlen(ps, pi, zeilen);
  const idx = zeilen.flatMap((_, r) => (y[r] !== null && x[r] !== null ? [r] : []));
  const xs = idx.map(r => x[r]!), ys = idx.map(r => y[r]!);
  const pos = (art && NLS_POSITIV[art as NlsArt]) || { x: false, y: false };
  return aus({
    spalten: [{ name: 'y', art: 'zahl', werte: ys }, { name: kpName(0), art: 'zahl', werte: xs }],
    n: idx.length, ausgelassen: zeilen.length - idx.length, verschiedenX: new Set(xs).size,
    nichtPositivX: pos.x ? xs.filter(v => !(v > 0)).length : 0, nichtPositivY: pos.y ? ys.filter(v => !(v > 0)).length : 0
  });
}

export type NlsCode = 'keine-praed' | 'mehrere-praed' | 'keine-zahl' | 'formel-fehlt' | 'zu-wenig-faelle' | 'nicht-positiv-x' | 'nicht-positiv-y' | 'nicht-konvergiert' | 'r-fehler';
export const NLS_SPERREN: ReadonlySet<NlsCode> = new Set<NlsCode>(['keine-praed', 'mehrere-praed', 'keine-zahl', 'formel-fehlt', 'zu-wenig-faelle', 'nicht-positiv-x', 'nicht-positiv-y', 'nicht-konvergiert', 'r-fehler']);
export function nlsCodes(dt: NlsDaten): NlsCode[] {
  const aus: NlsCode[] = [];
  if (dt.anzahlPraed === 0) aus.push('keine-praed');
  else if (dt.anzahlPraed > 1) aus.push('mehrere-praed');
  else if (!dt.praedZahl || !dt.zielZahl) aus.push('keine-zahl');
  if (!dt.art) aus.push('formel-fehlt');
  if (aus.length) return aus;
  const k = NLS_PARAMETER[dt.art as NlsArt];
  if (dt.n <= k || dt.verschiedenX <= k) aus.push('zu-wenig-faelle');
  if (dt.nichtPositivX > 0) aus.push('nicht-positiv-x');
  if (dt.nichtPositivY > 0) aus.push('nicht-positiv-y');
  return aus;
}
export interface NlsSatzKontext { n?: number; k?: number; zahl?: number; art?: NlsArt | '' }
export function nlsCodeSatz(c: NlsCode, x: NlsSatzKontext = {}): { text: string; klein?: string } {
  switch (c) {
    case 'keine-praed': return { text: L('Es fehlt die Vorhersagespalte. Die nichtlineare Regression braucht genau eine Zahlenspalte.', 'The predictor column is missing. Nonlinear regression needs exactly one number column.') };
    case 'mehrere-praed': return { text: L('Die nichtlineare Regression rechnet mit genau einer Zahlenspalte als Vorhersage, nicht mit mehreren.', 'Nonlinear regression calculates with exactly one number column as the predictor, not with several.') };
    case 'keine-zahl': return { text: L('Ziel und Vorhersage müssen Zahlenspalten sein.', 'The target and the predictor must be number columns.') };
    case 'formel-fehlt': return { text: L('Es fehlt die Wahl der Formel.', 'The choice of the formula is missing.'),
      klein: d('Wähle sie unter „Weitere Wege“ bei „Modell“. Sie muss sachlich begründet sein.', 'Wählen Sie sie unter „Weitere Wege“ bei „Modell“. Sie muss sachlich begründet sein.', 'Choose it under "More options" at "Model". It must be justified by subject matter.') };
    case 'zu-wenig-faelle': return { text: L(`Zu wenige Fälle: ${x.n ?? 0} Fälle mit Angaben, die Formel hat ${x.k ?? 0} Parameter. Es braucht mehr Fälle und mehr verschiedene x-Werte als Parameter.`, `Too few cases: ${x.n ?? 0} cases with values, the formula has ${x.k ?? 0} parameters. You need more cases and more different x values than parameters.`) };
    case 'nicht-positiv-x': return { text: Lp(x.zahl ?? 0, `Bei ${x.zahl} Fall ist x nicht größer als 0. Diese Formel braucht für die Startwerte x größer als 0.`, `Bei ${x.zahl} Fällen ist x nicht größer als 0. Diese Formel braucht für die Startwerte x größer als 0.`, `x is not greater than 0 for ${x.zahl} case. This formula needs x greater than 0 for the starting values.`, `x is not greater than 0 for ${x.zahl} cases. This formula needs x greater than 0 for the starting values.`) };
    case 'nicht-positiv-y': return { text: Lp(x.zahl ?? 0, `Bei ${x.zahl} Fall ist y nicht größer als 0. Diese Formel braucht für die Startwerte y größer als 0.`, `Bei ${x.zahl} Fällen ist y nicht größer als 0. Diese Formel braucht für die Startwerte y größer als 0.`, `y is not greater than 0 for ${x.zahl} case. This formula needs y greater than 0 for the starting values.`, `y is not greater than 0 for ${x.zahl} cases. This formula needs y greater than 0 for the starting values.`) };
    case 'nicht-konvergiert': return { text: L('Die Rechnung hat bei dieser Formel kein Ergebnis gefunden (keine Konvergenz). Die Formel passt vermutlich nicht zu den Daten, oder die Startwerte reichen nicht. Es gibt deshalb keine Zahlen.', 'The calculation found no result for this formula (no convergence). The formula probably does not fit the data, or the starting values are not enough. There are therefore no numbers.') };
    case 'r-fehler': return { text: L('R meldete bei der nichtlinearen Regression einen Fehler.', 'R reported an error in the nonlinear regression.') };
  }
}
export function nlsPunkte(dt: NlsDaten): KpPunkt[] {
  const k = dt.art ? NLS_PARAMETER[dt.art] : 0;
  const zahlFuer = (c: NlsCode) => (c === 'nicht-positiv-x' ? dt.nichtPositivX : c === 'nicht-positiv-y' ? dt.nichtPositivY : undefined);
  const kopf: KpPunkt = { art: 'ok', text: Lp(dt.n, `${dt.n} Fall mit Angaben in beiden Spalten`, `${dt.n} Fälle mit Angaben in beiden Spalten`, `${dt.n} case with values in both columns`, `${dt.n} cases with values in both columns`),
    ...(dt.ausgelassen > 0 && dt.zielZahl && dt.praedZahl ? { klein: Lp(dt.ausgelassen, `${dt.ausgelassen} Zeile mit einer Lücke wird ausgelassen.`, `${dt.ausgelassen} Zeilen mit einer Lücke werden ausgelassen.`, `${dt.ausgelassen} row with a gap is left out.`, `${dt.ausgelassen} rows with a gap are left out.`) } : {}) };
  return [kopf, ...nlsCodes(dt).map((c): KpPunkt => { const s = nlsCodeSatz(c, { n: dt.n, k, zahl: zahlFuer(c) }); return { art: NLS_SPERREN.has(c) ? 'sperre' : 'hinweis', text: s.text, ...(s.klein ? { klein: s.klein } : {}) }; })];
}

/* ------------------------------------------------------------ Aufruf und Antwort */
export function nlsAufruf(dt: NlsDaten): RAufruf {
  return { code: rFange(`sp_nls(d, ${rWahl(dt.art, NLS_FORMELN)}, ${rQ(kpName(0))}, 'y')`), args: {} };
}
export interface NlsKoef { name: string; b: number; se: number; t: number; p: number; waldU: number; waldO: number; profilU: number; profilO: number }
export interface NlsE {
  art: NlsArt; ziel: string; praed: string; /** die Startwerte der Rechnung (aus den linearen Hilfsregressionen) */ start: number[]; n: number; ausgelassen: number; koef: NlsKoef[];
  rss: number; sigma: number; df: number; aic: number; profil: boolean; x: number[]; y: number[]; angepasst: number[]; rest: number[]; warnung: boolean;
}
export function nlsLesen(roh: unknown, dt: NlsDaten): { ok: true; e: NlsE } | { ok: false; code: NlsCode } {
  if (!kpObjekt(roh)) return { ok: false, code: 'r-fehler' };
  if (roh.fehler !== undefined) {
    const t = kpText(roh.fehler);
    return { ok: false, code: /nicht-konvergiert/.test(t) ? 'nicht-konvergiert' : /too few/.test(t) ? 'zu-wenig-faelle' : /x and y must be positive/.test(t) ? 'nicht-positiv-x' : /y must be positive/.test(t) ? 'nicht-positiv-y' : 'r-fehler' };
  }
  const koef = kpArr<unknown>(roh.koef).map((o): NlsKoef | null => {
    if (!kpObjekt(o)) return null;
    return { name: kpText(o.name), b: kpZahl(o.b), se: kpZahl(o.se), t: kpZahl(o.t), p: kpZahl(o.p), waldU: kpZahl(o.wald_u), waldO: kpZahl(o.wald_o), profilU: kpZahl(o.profil_u), profilO: kpZahl(o.profil_o) };
  });
  const art = kpText(roh.art);
  if (!istNlsArt(art) || !koef.length || koef.length !== NLS_PARAMETER[art] || koef.some(k => !k || !Number.isFinite(k.b) || !Number.isFinite(k.se))) return { ok: false, code: 'r-fehler' };
  const x = kpZahlen2(roh.x), y = kpZahlen2(roh.y), angepasst = kpZahlen2(roh.angepasst), rest = kpZahlen2(roh.rest);
  if (!x.length || x.length !== y.length || angepasst.length !== x.length || rest.length !== x.length || ![...x, ...y, ...angepasst, ...rest].every(Number.isFinite)) return { ok: false, code: 'r-fehler' };
  return { ok: true, e: { art, ziel: dt.ziel, praed: dt.praed[0] ?? '', start: kpZahlen2(roh.start), n: kpZahl(roh.n), ausgelassen: dt.ausgelassen + kpZahl(roh.ausgelassen), koef: koef as NlsKoef[],
    rss: kpZahl(roh.rss), sigma: kpZahl(roh.sigma), df: kpZahl(roh.df), aic: kpZahl(roh.aic), profil: kpWahr(roh.profil), x, y, angepasst, rest, warnung: kpWahr(roh.warnung) } };
}
export const nlsFehlerSatz = (c: NlsCode): string => nlsCodeSatz(c).text;

/** Punkte der Kurve zum Zeichnen: nur innerhalb der beobachteten x-Werte (keine Verlängerung darüber hinaus). */
export function nlsKurve(e: NlsE, schritte = 120): { x: number; y: number }[] {
  const lo = Math.min(...e.x), hi = Math.max(...e.x), b = e.koef.map(k => k.b);
  if (!(hi > lo)) return [];
  return Array.from({ length: schritte + 1 }, (_, i) => { const x = lo + ((hi - lo) * i) / schritte; return { x, y: nlsWert(e.art, b, x) }; }).filter(p => Number.isFinite(p.y));
}

/* ------------------------------------------------------------ Sätze */
/** Die Warnungen: immer sichtbar, sachlich. Es gibt kein R² im Satz. */
export function nlsWarnungen(e: NlsE): string[] {
  const lo = Math.min(...e.x), hi = Math.max(...e.x);
  const w: string[] = [
    L('Die Formel muss sachlich begründet sein. Dass eine Kurve gut passt, belegt noch nicht, dass der Zusammenhang so verläuft.', 'The formula must be justified by subject matter. That a curve fits well does not yet show that the relationship runs that way.'),
    L('Die Rechnung findet ein lokales Optimum. Mit anderen Startwerten kann eine andere Lösung herauskommen.', 'The calculation finds a local optimum. With other starting values a different solution can result.'),
    L(`Aussagen für x außerhalb von ${komma(lo, 2)} bis ${komma(hi, 2)} sind durch die Daten nicht gedeckt: Dort kann die Kurve ganz anders verlaufen.`, `Statements for x outside ${komma(lo, 2)} to ${komma(hi, 2)} are not covered by the data: the curve can run quite differently there.`),
    L('Die p-Werte und Intervalle sind Näherungen. Das Wald-Intervall und das Profil-Intervall können deutlich voneinander abweichen. Die Residuen sollten angesehen werden.', 'The p values and intervals are approximations. The Wald interval and the profile interval can differ considerably. The residuals should be inspected.'),
    L('Ein R² wird nicht angegeben: Bei nichtlinearen Modellen ist das scheinbare R² nicht so zu lesen wie bei der linearen Regression.', 'No R² is given: in nonlinear models the apparent R² cannot be read as in linear regression.')
  ];
  if (!e.profil) w.push(L('Das Profil-Intervall ließ sich nicht berechnen. Es steht nur das Wald-Intervall.', 'The profile interval could not be calculated. Only the Wald interval is shown.'));
  if (e.warnung) w.push(L('R hat bei der Rechnung eine Warnung gemeldet. Die Ergebnisse sind mit Vorsicht zu lesen.', 'R reported a warning during the calculation. Read the results with caution.'));
  if (e.ausgelassen > 0) w.push(Lp(e.ausgelassen, `${e.ausgelassen} Zeile mit einer Lücke wurde ausgelassen.`, `${e.ausgelassen} Zeilen mit einer Lücke wurden ausgelassen.`, `${e.ausgelassen} row with a gap was left out.`, `${e.ausgelassen} rows with a gap were left out.`));
  return w;
}
const kiText = (u: number, o: number) => (Number.isFinite(u) && Number.isFinite(o) ? `[${komma(u, 3)}; ${komma(o, 3)}]` : '-');
export function saetzeNls(e: NlsE, name: (n: string) => string = spaltenName): Saetze {
  const ziel = zitat(name(e.ziel)), pr = zitat(name(e.praed)), f = nlsFormelName(e.art), ft = nlsFormelText(e.art);
  const par = e.koef.map(k => `${k.name} = ${komma(k.b, 3)} (SE ${komma(k.se, 3)})`).join(', ');
  const haupt = L(`Die Formel ${f} (${ft}) wurde an ${ziel} in Abhängigkeit von ${pr} angepasst (n = ${e.n}): ${par}. Die Quadratsumme der Reste ist ${komma(e.rss, 2)}, σ = ${komma(e.sigma, 3)}.`,
    `The formula ${f} (${ft}) was fitted to ${ziel} as a function of ${pr} (n = ${e.n}): ${par}. The sum of squared residuals is ${komma(e.rss, 2)}, σ = ${komma(e.sigma, 3)}.`);
  const teile = e.koef.map(k => L(`${k.name}: ${komma(k.b, 3)}, 95 %-Wald-Intervall ${kiText(k.waldU, k.waldO)}, p ${pWert(k.p)}.`, `${k.name}: ${komma(k.b, 3)}, 95% Wald interval ${kiText(k.waldU, k.waldO)}, p ${pWert(k.p)}.`));
  return { haupt, zusatz: teile.join(' '), vorsicht: nlsWarnungen(e).join(' '), apa: L(`nichtlineare Regression (${f}), ${e.koef.map(k => `${k.name} = ${komma(k.b, 2)}`).join(', ')}, RSS = ${komma(e.rss, 2)}, df = ${komma(e.df, 0)}`, `nonlinear regression (${f}), ${e.koef.map(k => `${k.name} = ${komma(k.b, 2)}`).join(', ')}, RSS = ${komma(e.rss, 2)}, df = ${komma(e.df, 0)}`), marken: [] };
}
export const nlsGerechnet = (): string => L('nichtlineare Regression (nls, kleinste Quadrate)', 'nonlinear regression (nls, least squares)');
export const nlsFachwort = (): string => L('nichtlineare Regression (feste Formel)', 'nonlinear regression (fixed formula)');
export const nlsWarum = (): string => L('Das Ziel ist eine Zahl, und der Zusammenhang mit der einen Vorhersage verläuft nicht als Gerade, sondern als Kurve, für die es eine sachlich begründete Formel gibt. Statable bietet vier feste Formeln an (Michaelis-Menten, exponentiell, logistisch, Potenz) und passt die gewählte mit der Methode der kleinsten Quadrate an. Die Rechnung findet ein lokales Optimum; scheitert sie, gibt es keine Zahlen, sondern einen Satz.',
  'The target is a number, and the relationship with the one predictor does not run as a straight line but as a curve for which there is a formula justified by subject matter. Statable offers four fixed formulas (Michaelis-Menten, exponential, logistic, power) and fits the chosen one by least squares. The calculation finds a local optimum; if it fails, there are no numbers, only a sentence.');

/* ------------------------------------------------------------ Tabellen */
export function tabellenNls(e: NlsE, name: (n: string) => string = spaltenName): TableItem[] {
  const aus: TableItem[] = [];
  aus.push(tabelle('NLS Koeffizienten', L(`Nichtlineare Regression (${nlsFormelName(e.art)}): Parameter`, `Nonlinear regression (${nlsFormelName(e.art)}): parameters`), ['', 'b', 'SE', 't', 'p', L('Wald-KI unten', 'Wald CI lower'), L('Wald-KI oben', 'Wald CI upper'), L('Profil-KI unten', 'Profile CI lower'), L('Profil-KI oben', 'Profile CI upper')],
    e.koef.map((k): Z[] => [k.name, fx(k.b, 4), fx(k.se, 4), fx(k.t, 3), fp(k.p), fx(k.waldU, 4), fx(k.waldO, 4), fx(k.profilU, 4), fx(k.profilO, 4)]),
    [L(`Formel: ${nlsFormelText(e.art)}; y = ${name(e.ziel)}, x = ${name(e.praed)}. Das Wald-Intervall nutzt die t-Verteilung mit ${e.df} Freiheitsgraden.`, `Formula: ${nlsFormelText(e.art)}; y = ${name(e.ziel)}, x = ${name(e.praed)}. The Wald interval uses the t distribution with ${e.df} degrees of freedom.`),
      L('Die p-Werte und Intervalle sind Näherungen.', 'The p values and intervals are approximations.')]));
  aus.push(tabelle('NLS Modell', L('Nichtlineare Regression: Modell', 'Nonlinear regression: model'), [L('Kennzahl', 'Measure'), L('Wert', 'Value')], [
    ['n', fx(e.n, 0)], [L('Freiheitsgrade', 'Degrees of freedom'), fx(e.df, 0)], [L('Quadratsumme der Reste (RSS)', 'Residual sum of squares (RSS)'), fxg(e.rss, 3)], ['σ', fx(e.sigma, 3)], ['AIC', fx(e.aic, 3)]]));
  const zeilen = e.x.slice(0, 100).map((x, i): Z[] => [fx(x, 4), fx(e.y[i]!, 4), fx(e.angepasst[i]!, 4), fx(e.rest[i]!, 4)]);
  aus.push(tabelle('NLS Residuen', L('Nichtlineare Regression: angepasste Werte und Residuen', 'Nonlinear regression: fitted values and residuals'), ['x', 'y', L('angepasst', 'fitted'), L('Residuum', 'Residual')], zeilen,
    e.x.length > 100 ? [L(`Die ersten 100 von ${e.x.length} Fällen.`, `The first 100 of ${e.x.length} cases.`)] : []));
  return aus;
}
/** R-Text zum Ansehen (wird nie ausgeführt). */
export function nlsRCode(ziel: string, praed: string, art: NlsArt): string {
  const spX = rn(praed), spY = rn(ziel);
  const start = art === 'michaelis' ? `k <- coef(lm(I(1 / ${spY}) ~ I(1 / ${spX}), data = daten))\nstart <- list(a = 1 / k[1], b = k[2] / k[1])`
    : art === 'exponentiell' ? `k <- coef(lm(log(${spY}) ~ ${spX}, data = daten))\nstart <- list(a = exp(k[1]), b = k[2])`
    : art === 'logistisch' ? `a0 <- 1.05 * max(daten$${spY})\nk <- coef(lm(log(${spY} / (a0 - ${spY})) ~ ${spX}, data = daten))\nstart <- list(a = a0, b = 1 / k[2], c = -k[1] / k[2])`
    : `k <- coef(lm(log(${spY}) ~ log(${spX}), data = daten))\nstart <- list(a = exp(k[1]), b = k[2])`;
  const formel = art === 'michaelis' ? `${spY} ~ a * ${spX} / (b + ${spX})` : art === 'exponentiell' ? `${spY} ~ a * exp(b * ${spX})` : art === 'logistisch' ? `${spY} ~ a / (1 + exp((c - ${spX}) / b))` : `${spY} ~ a * ${spX}^b`;
  return [
    `# ${L('daten: die Tabelle in R. Die Startwerte kommen aus einer linearen Hilfsregression.', 'daten: your table in R. The starting values come from a linear auxiliary regression.')}`,
    start,
    `m <- nls(${formel}, data = daten, start = start, control = nls.control(maxiter = 200, tol = 1e-7, minFactor = 1/4096))`,
    'summary(m)', 'confint(m)   # Profil'
  ].join('\n');
}
