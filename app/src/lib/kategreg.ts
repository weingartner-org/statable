/**
 * Welle 3 (Rechnung): ordinale, multinomiale und Zähldaten-Regression in webR - Typen, Daten für R, Lesen der R-Antwort und die reinen Prüfungen
 * (Sperren, Hinweise, Vorschläge). Die Rechnung selbst steht in engine/statable.R (`sp_ordreg`, `sp_multreg`, `sp_zaehlreg`), der Aufruf in rverfahren.svelte.ts.
 * Fachblatt: docs/fachblaetter/WELLE3-REGRESSION-KATEGORIEN-ZAEHLDATEN.md (mit „Nachtrag nach den Sollwerten“), Tests gegen R: engine/welle3.webr.test.ts.
 *
 * Eingabe nach den Regeln der logistischen Regression (lib/regfaktor.ts): Gruppen-Prädiktoren mit 2 bis 12 Stufen werden Faktoren, Vergleichsgruppe = ERSTE Stufe
 * (Zahlen: kleinster Code, Text: alphabetisch). Die Zielstufen der ordinalen Regression stehen in der Ordnung von Statable (lib/reihenfolge.ts: Zahlen nach Code, also
 * nach den Wertebeschriftungen; Text alphabetisch, sofern die Person nicht eine Reihenfolge festgelegt hat) - nie von R sortiert.
 *
 * ⚠ Von der Fachperson abzunehmen: die Schwellen der Hinweise (weniger als 5 Fälle in einer Zielstufe, mehr als 10 Stufen, OR > 1000 oder < 0,001 als Trennungsverdacht,
 * weniger als 10 Fälle je Koeffizient in der kleinsten Kategorie nach Peduzzi et al. 1996) und die Regel „sieht nach Zählwerten aus“ (Fachblatt „Platz in der Oberfläche“).
 */
import { istFehlend } from './fehlend';
import type { Spalte } from './verzeichnis';
import type { RSpalte } from '../engine/webr';
import { L, Lp, d } from './sitzung.svelte';
import { zitat, aufzaehlung } from '../i18n/profil';
import { kategorien } from './reihenfolge';
import { regFaktor } from './regfaktor';
import { schiefe } from './rangtests';
import { textCodes, type Wert } from './eingabe';
import { rFange, rIds, rWahl, rArg, rArgOderNull, rQOderNull, rAnzeigeName, rAnzeigeText } from '../engine/rsicher';

/** R-Pakete je Verfahren (nnet ist neu im webR-Repo; Fachblatt „R laden“). */
export const R_PAKETE_ORD = ['MASS'];
export const R_PAKETE_MULT = ['nnet'];
export const R_PAKETE_ZAEHL = ['MASS'];

export type KatArt = 'ordreg' | 'multreg' | 'zaehlreg';
export type ZaehlModellWahl = 'auto' | 'poisson' | 'negbin';

/* ------------------------------------------------------------ Typen der Ergebnisse */

/** Ein Prädiktor: eine Zahlenspalte oder eine Gruppen-Spalte (`stufen` = Beschriftungen, die erste ist die Vergleichsgruppe). */
export interface KatPraed { name: string; art: 'zahl' | 'faktor'; stufen: string[] }
/** Ein Koeffizient. `pIdx` zeigt auf den Prädiktor (−1 = Konstante), `stufe` ist bei Gruppen die Stufe gegen die erste; `effekt` ist OR (ordinal, multinomial) bzw. IRR (Zähldaten). */
export interface KatKoef { pIdx: number; stufe: string; kategorie?: string; b: number; se: number; z: number; p: number; effekt: number; kiU: number; kiO: number }
/** Likelihood-Quotienten-Test eines Prädiktors (alle seine Hilfsspalten zusammen). `unsicher`: negativ-multinomial geklemmt oder nicht konvergiert. */
export interface KatLr { pIdx: number; chi2: number; df: number; p: number; unsicher?: boolean }
export interface KatTest { chi2: number; df: number; p: number; unsicher?: boolean }
export interface KatBasis { ziel: string; praed: KatPraed[]; n: number; ausgelassen: number; koef: KatKoef[]; lr: KatLr[]; modelltest: KatTest; loglik: number; loglik0: number; warnungen: string[] }

export interface Brant { gesamt: KatTest; praed: (KatTest & { pIdx: number })[] }
export interface OrdReg extends KatBasis {
  art: 'ordreg';
  /** Verwendete Zielstufen von niedrig nach hoch (Stufen ohne Fälle sind weggefallen) und ihre Fallzahlen. */
  stufen: string[]; stufenN: number[];
  schwellen: { name: string; theta: number; se: number }[];
  nagelkerke: number; coxSnell: number;
  /** Brant-Test; `null`, wenn nicht prüfbar (dann `brantFehler`). */
  brant: Brant | null; brantFehler?: string;
}
export interface MultReg extends KatBasis {
  art: 'multreg';
  referenz: string; /** Kategorien ohne die Vergleichskategorie */ kategorien: string[];
  /** Fallzahlen der Zielkategorien: Vergleichskategorie zuerst, dann `kategorien` */ stufenN: number[];
  konvergiert: boolean; nParameter: number; nagelkerke: number; coxSnell: number;
}
export interface ZaehlReg extends KatBasis {
  art: 'zaehlreg';
  modell: 'poisson' | 'negbin'; grund: 'ueberdispersion' | 'keine_ueberdispersion' | 'theta_am_rand' | 'gewaehlt' | 'negbin_fehlt';
  theta: number | null; thetaSe: number | null; thetaAmRand: boolean;
  /** Pearson-χ² / Freiheitsgrade des Poisson-Modells */ pearsonDf: number;
  /** LR-Test Poisson gegen negativ-binomial (p halbiert, bei LR ≤ 0: p = 1); `null`, wenn das negativ-binomiale Modell nicht zu schätzen war */ lrUeber: { chi2: number; p: number } | null;
  nullen: { beobachtet: number; erwartet: number }; nullenHinweis: boolean;
  /** Spalte der Beobachtungszeit (Offset) oder `null` */ offset: string | null;
  mittelwert: number; varianz: number; konvergiert: boolean;
  /** Name der Spalte mit der Beobachtungszeit, wie in Statable (für das R-Skript, B1 Teil 2d); fehlt in älteren Projektdateien */ offsetSpalte?: string;
}

/* ------------------------------------------------------------ Daten für R */

/** Alles, was R braucht: die Spalten (R-Namen y, p01, p02 …, zeit) und was die Oberfläche später zum Beschriften braucht. */
export interface KatDaten { art: KatArt; spalten: RSpalte[]; ziel: string; praed: KatPraed[]; /** Zielstufen in der Ordnung von Statable (nicht bei Zähldaten) */ stufen: string[]; zeit: string | null }

const rName = (k: number) => `p${String(k + 1).padStart(2, '0')}`;

/** Gültiger Wert der Zelle? (Lücke, „keine Angabe“-Zahl, „keine Angabe“-Text und Text in einer Zahlenspalte zählen nicht.) */
export function gueltigFuer(sp: Spalte): (v: Wert | undefined) => v is string | number {
  const fehlText = sp.art === 'text' ? new Set(textCodes(sp.fehlendText)) : new Set<string>();
  return (v): v is string | number => {
    if (v === null || v === undefined || v === '') return false;
    if (sp.art === 'zahl') return typeof v === 'number' && Number.isFinite(v) && !istFehlend(sp, v);
    return typeof v === 'string' && !fehlText.has(v.trimEnd());
  };
}
/** Beschriftung eines Wertes: Wertelabel, sonst der Wert selbst. */
export const beschr = (sp: Spalte, v: string | number): string => sp.werteLabels[String(v)] ?? sp.werteLabels[String(Number(v))] ?? String(v);

export interface KatOptionen { /** Name der Spalte mit der Beobachtungszeit (nur Zähldaten) */ zeit?: string }

/**
 * Baut die Spalten für R. Ordinal/multinomial: Ziel als Text (Beschriftungen) und die Zielstufen in der Ordnung von Statable.
 * Zähldaten: Ziel als Zahl, optional die Beobachtungszeit als Zahl. Prädiktoren: Gruppen als Faktor (Codes 1 … k in Statable-Reihenfolge, erste Stufe = Vergleich), sonst Zahl.
 */
export function katDaten(art: KatArt, ziel: string, praed: string[], zeilen: Wert[][], spalten: Spalte[], opt: KatOptionen = {}): KatDaten {
  const ix = (n: string) => spalten.findIndex(x => x.name === n), sp = (n: string) => spalten.find(x => x.name === n)!;
  const zahl = (n: string): (number | null)[] => { const i = ix(n), g = gueltigFuer(sp(n)); return zeilen.map(z => (g(z[i]) && typeof z[i] === 'number' ? (z[i] as number) : null)); };
  const out: RSpalte[] = [];
  let stufen: string[] = [];
  if (art === 'zaehlreg') out.push({ name: 'y', art: 'zahl', werte: zahl(ziel) });
  else {
    const i = ix(ziel), s = sp(ziel), g = gueltigFuer(s);
    const werte = zeilen.map(z => (g(z[i]) ? beschr(s, z[i] as string | number) : null));
    const kat = kategorien(s, i, zeilen);
    stufen = kat ? kat.map(k => k.text) : [...new Set(werte.filter((w): w is string => w !== null))];
    out.push({ name: 'y', art: 'text', werte });
  }
  const infos: KatPraed[] = [];
  praed.forEach((n, k) => {
    const i = ix(n), s = sp(n), g = gueltigFuer(s), rn = rName(k);
    const roh = zeilen.map(z => z[i]).filter((v): v is string | number => g(v));
    const f = regFaktor(s, roh, []);
    if (f) {
      const code = new Map(f.stufen.map((st, j) => [st.wert, j + 1]));
      out.push({ name: rn, art: 'faktor', werte: zeilen.map(z => (g(z[i]) ? code.get(f.text ? String(z[i]) : String(Number(z[i]))) ?? null : null)), labels: f.stufen.map((st, j) => ({ wert: j + 1, label: st.name })) });
      infos.push({ name: n, art: 'faktor', stufen: f.stufen.map(st => st.name) });
    } else {
      out.push({ name: rn, art: 'zahl', werte: zahl(n) });
      infos.push({ name: n, art: 'zahl', stufen: [] });
    }
  });
  if (art === 'zaehlreg' && opt.zeit) out.push({ name: 'zeit', art: 'zahl', werte: zahl(opt.zeit) });
  return { art, spalten: out, ziel, praed: infos, stufen, zeit: art === 'zaehlreg' && opt.zeit ? opt.zeit : null };
}

/* ------------------------------------------------------------ R-Aufrufe */

/** Was `RMotor.rechne` braucht: der Code (nur feste Wörter und Bezeichner) und die gebundenen Argumente (Text aus den Daten, siehe engine/rsicher.ts). */
export interface RAufruf { code: string; args: Record<string, string | string[]> }
const praedNamen = (dt: KatDaten) => dt.praed.map((_, k) => rName(k));
const faktorNamen = (dt: KatDaten) => dt.praed.flatMap((p, k) => (p.art === 'faktor' ? [rName(k)] : []));
const abfangen = rFange;
/** Zielstufen und Vergleichskategorie sind Beschriftungen aus den Daten: sie gehen als gebundene Textliste hinein, nie als Code. */

export const ordAufruf = (dt: KatDaten): RAufruf => ({
  code: abfangen(`sp_ordreg(d, 'y', ${rIds(praedNamen(dt))}, ${rIds(faktorNamen(dt))}, ${rArgOderNull(dt.stufen.length > 0, 'stufen')})`), args: { stufen: dt.stufen }
});
export const multAufruf = (dt: KatDaten, referenz: string): RAufruf => ({
  code: abfangen(`sp_multreg(d, 'y', ${rIds(praedNamen(dt))}, ${rIds(faktorNamen(dt))}, ${rArg('referenz')}, ${rArgOderNull(dt.stufen.length > 0, 'stufen')})`), args: { referenz, stufen: dt.stufen }
});
export const zaehlAufruf = (dt: KatDaten, modell: ZaehlModellWahl = 'auto'): RAufruf => ({
  code: abfangen(`sp_zaehlreg(d, 'y', ${rIds(praedNamen(dt))}, ${rIds(faktorNamen(dt))}, ${rWahl(modell, ['auto', 'poisson', 'negbin'] as const)}, ${rQOderNull(!!dt.zeit, 'zeit')})`), args: {}
});

/* ------------------------------------------------------------ R-Antwort lesen */

const arr = <T>(x: unknown): T[] => (x == null ? [] : Array.isArray(x) ? (x as T[]) : [x as T]);
const num = (x: unknown): number => { const v = arr<number | null>(x)[0]; return typeof v === 'number' && Number.isFinite(v) ? v : NaN; };
const numOrNull = (x: unknown): number | null => { const v = num(x); return Number.isNaN(v) ? null : v; };
const wahr = (x: unknown) => arr<boolean>(x)[0] === true;
const text = (x: unknown): string => String(arr<string>(x)[0] ?? '');
const liste = (x: unknown): Record<string, unknown>[] => arr<Record<string, unknown>>(x).filter(z => z && typeof z === 'object' && !('type' in z && Object.keys(z).length === 1));

/** `p02Stufe` → Prädiktor 1 (0-basiert) und Stufe; `(Intercept)` → −1. */
function zuordnen(name: string, praed: KatPraed[]): { pIdx: number; stufe: string } {
  const m = /^p(\d\d)(.*)$/s.exec(name);
  if (!m) return { pIdx: -1, stufe: '' };
  const pIdx = Number(m[1]) - 1, info = praed[pIdx];
  return { pIdx, stufe: info?.art === 'faktor' ? m[2]! : '' };
}
function koefLesen(r: unknown, praed: KatPraed[], effekt: 'or' | 'irr'): KatKoef[] {
  return liste(r).map(z => {
    const { pIdx, stufe } = zuordnen(text(z.name), praed);
    const k: KatKoef = { pIdx, stufe, b: num(z.b), se: num(z.se), z: num(z.z), p: num(z.p), effekt: num(z[effekt]), kiU: num(z.ki_u), kiO: num(z.ki_o) };
    if (z.kategorie !== undefined) k.kategorie = text(z.kategorie);
    return k;
  });
}
const testLesen = (x: unknown): KatTest => { const z = (x ?? {}) as Record<string, unknown>; const t: KatTest = { chi2: num(z.chi2), df: num(z.df), p: num(z.p) }; if (z.unsicher !== undefined) t.unsicher = wahr(z.unsicher); return t; };
function lrLesen(r: unknown): KatLr[] {
  return liste(r).map(z => { const t = testLesen(z), l: KatLr = { pIdx: Number(text(z.name).slice(1)) - 1, ...t }; return l; });
}
function basisLesen(r: Record<string, unknown>, kopf: { ziel: string; praed: KatPraed[] }, effekt: 'or' | 'irr'): KatBasis {
  return { ziel: kopf.ziel, praed: kopf.praed, n: num(r.n), ausgelassen: num(r.ausgelassen), koef: koefLesen(r.koef, kopf.praed, effekt), lr: lrLesen(r.lr_praed),
    modelltest: testLesen(r.modelltest), loglik: num(r.loglik), loglik0: num(r.loglik0), warnungen: arr<string>(r.warnungen) };
}

/** R-Antwort von `sp_ordreg` lesen. Wirft nicht; ein `fehler` in der Antwort prüft der Aufrufer vorher. */
export function ordLesen(r: Record<string, unknown>, kopf: { ziel: string; praed: KatPraed[] }): OrdReg {
  const o: OrdReg = {
    ...basisLesen(r, kopf, 'or'), art: 'ordreg', stufen: arr<string>(r.stufen), stufenN: arr<number>(r.stufen_n).map(Number),
    schwellen: liste(r.schwellen).map(z => ({ name: text(z.name), theta: num(z.theta), se: num(z.se) })),
    nagelkerke: num(r.nagelkerke), coxSnell: num(r.coxsnell), brant: null
  };
  const b = r.brant as Record<string, unknown> | undefined;
  if (b && typeof b === 'object' && !('type' in b)) o.brant = { gesamt: testLesen(b.gesamt), praed: liste(b.praed).map(z => ({ pIdx: Number(text(z.name).slice(1)) - 1, ...testLesen(z) })) };
  else o.brantFehler = text(r.brant_fehler) || 'not available';
  return o;
}

export function multLesen(r: Record<string, unknown>, kopf: { ziel: string; praed: KatPraed[] }): MultReg {
  return { ...basisLesen(r, kopf, 'or'), art: 'multreg', referenz: text(r.referenz), kategorien: arr<string>(r.kategorien), stufenN: arr<number>(r.stufen_n).map(Number),
    konvergiert: wahr(r.konvergiert), nParameter: num(r.n_parameter), nagelkerke: num(r.nagelkerke), coxSnell: num(r.coxsnell) };
}

export function zaehlLesen(r: Record<string, unknown>, kopf: { ziel: string; praed: KatPraed[] }): ZaehlReg {
  const lu = r.lr_ueber as Record<string, unknown> | undefined, nu = (r.nullen ?? {}) as Record<string, unknown>;
  const modell = text(r.modell) === 'negbin' ? 'negbin' : 'poisson';
  const off = text(r.offset);
  return { ...basisLesen(r, kopf, 'irr'), art: 'zaehlreg', modell, grund: text(r.grund) as ZaehlReg['grund'],
    theta: modell === 'negbin' ? numOrNull(r.theta) : null, thetaSe: modell === 'negbin' ? numOrNull(r.theta_se) : null, thetaAmRand: wahr(r.theta_am_rand),
    pearsonDf: num(r.pearson_df), lrUeber: lu && numOrNull(lu.chi2) !== null ? { chi2: num(lu.chi2), p: num(lu.p) } : null,
    nullen: { beobachtet: num(nu.beobachtet), erwartet: num(nu.erwartet) }, nullenHinweis: wahr(r.nullen_hinweis),
    offset: off && off !== 'NA' ? off : null, mittelwert: num(r.mittelwert), varianz: num(r.varianz), konvergiert: wahr(r.konvergiert) };
}

/* ------------------------------------------------------------ R-Fehlermeldungen in Sätze */

/** Die Kurztexte aus statable.R in Sätze; `null`, wenn die Meldung nicht von diesen drei Verfahren stammt. */
export function katFehlerText(roh: string): string | null {
  const m = roh.toLowerCase();
  if (/only two levels/.test(m)) return L('Das Ziel hat nur zwei Stufen. Das ist der Fall der logistischen Regression - sie gibt es mit zwei Stufen als eigenes Verfahren.', 'The outcome has only two levels. That is the case for logistic regression, which is its own procedure for two levels.');
  if (/polr failed|starting values|separation/.test(m)) return L('Die Schätzung gelingt mit diesen Daten nicht - vermutlich trennt ein Prädiktor die Stufen vollständig.', 'The estimation does not work with these data - probably a predictor separates the levels completely.');
  if (/only one level/.test(m)) return L('Das Ziel hat nur eine Stufe. Damit lässt sich nichts vorhersagen.', 'The outcome has only one level. There is nothing to predict.');
  if (/only one group left/.test(m)) return L('Eine Gruppen-Spalte hat nach dem Weglassen der Lücken nur noch eine Gruppe. Damit lässt sich kein Unterschied zwischen Gruppen schätzen.', 'A group column has only one group left once gaps are left out. No difference between groups can be estimated.');
  if (/reference category not found/.test(m)) return d('Die Vergleichskategorie kommt in den Daten nicht vor. Wähle eine Kategorie, die Fälle hat.', 'Die Vergleichskategorie kommt in den Daten nicht vor. Wählen Sie eine Kategorie, die Fälle hat.', 'The reference category does not occur in the data. Choose a category that has cases.');
  if (/count outcome must not be negative/.test(m)) return L('Die Zielspalte enthält negative Werte. Zähldaten sind ganze Zahlen ab 0.', 'The outcome column contains negative values. Count data are whole numbers from 0.');
  if (/count outcome must be whole numbers/.test(m)) return L('Die Zielspalte enthält Werte mit Nachkommastellen. Zähldaten sind ganze Zahlen (0, 1, 2 …).', 'The outcome column contains values with decimals. Count data are whole numbers (0, 1, 2 …).');
  if (/observation time must be greater than 0/.test(m)) return L('Die Beobachtungszeit enthält Werte von 0 oder darunter. Sie muss überall größer als 0 sein.', 'The observation time contains values of 0 or below. It must be greater than 0 everywhere.');
  if (/negative binomial model could not be estimated/.test(m)) return d('Das negativ-binomiale Modell lässt sich mit diesen Daten nicht schätzen. Rechne mit Poisson.', 'Das negativ-binomiale Modell lässt sich mit diesen Daten nicht schätzen. Rechnen Sie mit Poisson.', 'The negative binomial model cannot be estimated with these data. Use Poisson.');
  if (/no predictors/.test(m)) return d('Wähle mindestens eine Spalte, aus der vorhergesagt wird.', 'Wählen Sie mindestens eine Spalte, aus der vorhergesagt wird.', 'Choose at least one column to predict from.');
  return null;
}

/* ------------------------------------------------------------ Prüfungen vor dem Rechnen (reine Funktionen) */

/** `sperre`: es wird nicht gerechnet. `hinweis`: es wird gerechnet, der Text steht in der Prüfliste. `ohneRechnung`: R könnte hier nicht rechnen (zwei Stufen, eine Stufe). */
export interface KatBefund { art: 'sperre' | 'hinweis'; code: string; text: string; ohneRechnung?: boolean }

/** Zielspalte der Zähldaten-Regression: ganze Zahlen ab 0. `werte`: die gültigen Werte, `name`: Bezeichnung der Spalte. */
export function zaehlZielPruefung(werte: number[], name: string): KatBefund | null {
  if (werte.some(v => v < 0)) return { art: 'sperre', code: 'zaehl-negativ', text: L(`${zitat(name)} enthält negative Werte. Zähldaten sind ganze Zahlen ab 0 - damit lässt sich keine Zähldaten-Regression rechnen.`, `${zitat(name)} contains negative values. Count data are whole numbers from 0, so a count regression cannot be calculated.`) };
  if (werte.some(v => !Number.isInteger(v))) return { art: 'sperre', code: 'zaehl-nicht-ganz', text: L(`${zitat(name)} enthält Werte mit Nachkommastellen. Zähldaten sind ganze Zahlen (0, 1, 2 …); für Messwerte mit Nachkommastellen passt die lineare Regression.`, `${zitat(name)} contains values with decimals. Count data are whole numbers (0, 1, 2 …); for measured values with decimals, linear regression fits.`) };
  return null;
}

/** Beobachtungszeit (Offset): eine Zahlenspalte mit Werten größer als 0. `werte` = `null`, wenn die gewählte Spalte nicht (mehr) da ist; sonst die gültigen Werte. */
export function zeitPruefung(werte: number[] | null, name: string): KatBefund | null {
  if (werte === null || !werte.length) return { art: 'sperre', code: 'zeit-fehlt', text: werte === null
    ? d('Die gewählte Spalte für die Beobachtungszeit gibt es nicht mehr. Wähle eine andere oder lass sie weg.', 'Die gewählte Spalte für die Beobachtungszeit gibt es nicht mehr. Wählen Sie eine andere oder lassen Sie sie weg.', 'The chosen observation-time column no longer exists. Choose another one or leave it out.')
    : L(`${zitat(name)} hat keine gültigen Werte und lässt sich nicht als Beobachtungszeit verwenden.`, `${zitat(name)} has no valid values and cannot be used as observation time.`) };
  if (werte.some(v => !(v > 0))) return { art: 'sperre', code: 'zeit-nicht-positiv', text: L(`Die Beobachtungszeit ${zitat(name)} enthält Werte von 0 oder darunter. Gebraucht wird der Logarithmus der Zeit, darum muss jeder Wert größer als 0 sein.`, `The observation time ${zitat(name)} contains values of 0 or below. The logarithm of the time is needed, so every value must be greater than 0.`) };
  return null;
}

/** Eine Zielstufe mit ihren Fällen. */
export interface ZielStufe { text: string; anzahl: number }
/** Weniger Fälle als das, ab dem eine Zielstufe als zu klein gilt (Fachblatt G18a). */
export const KAT_STUFE_WENIG = 5;
/** Mehr Zielstufen als das: eine lineare Regression ist oft angemessener (Fachblatt G18a). */
export const ORD_STUFEN_VIEL = 10;
/** Weniger Fälle je Koeffizient in der kleinsten Zielkategorie: Faustregel nach Peduzzi et al. (1996). */
export const MULT_FAELLE_JE_KOEFFIZIENT = 10;

/**
 * Hinweise zur Zielspalte der ordinalen und multinomialen Regression (`stufen` mit Fällen; Stufen ohne Fälle zählen nicht mit):
 * zwei Stufen → Sperre mit dem Satz zur logistischen Regression (R rechnet dann nicht; bei genau zwei Werten in der Zielspalte rechnet die Karte ohnehin logistisch); eine Stufe mit weniger als 5 Fällen; ordinal: mehr als 10 Stufen;
 * multinomial: weniger als 10 Fälle je Koeffizient in der kleinsten Kategorie (`koeffizienten` = Zahl der Koeffizienten ohne Konstante).
 */
export function zielStufenPruefung(art: 'ordreg' | 'multreg', stufen: ZielStufe[], koeffizienten = 0): KatBefund[] {
  const mit = stufen.filter(s => s.anzahl > 0), aus: KatBefund[] = [];
  if (mit.length < 2) { aus.push({ art: 'sperre', code: 'eine-stufe', text: L('Das Ziel hat nur eine Stufe mit Fällen. Damit lässt sich nichts vorhersagen.', 'The outcome has only one level with cases. There is nothing to predict.'), ohneRechnung: true }); return aus; }
  if (mit.length === 2) aus.push({ art: 'sperre', code: 'zwei-stufen', ohneRechnung: true, text: d('Das Ziel hat nur zwei Stufen. Das ist die logistische Regression - rechne dort.', 'Das Ziel hat nur zwei Stufen. Das ist die logistische Regression - rechnen Sie dort.', 'The outcome has only two levels. That is logistic regression - calculate it there.') });
  const wenig = mit.filter(s => s.anzahl < KAT_STUFE_WENIG), liste = aufzaehlung(wenig.map(s => `${zitat(s.text)} (${s.anzahl})`));
  if (wenig.length) aus.push({ art: 'hinweis', code: 'stufe-wenig', text: Lp(wenig.length,
    `Wenige Fälle in der Stufe ${liste}: Die Schätzung ist unsicher.`, `Wenige Fälle in den Stufen ${liste}: Die Schätzung ist unsicher.`,
    `Few cases in the level ${liste}: the estimate is uncertain.`, `Few cases in the levels ${liste}: the estimate is uncertain.`) });
  if (art === 'ordreg' && mit.length > ORD_STUFEN_VIEL) aus.push({ art: 'hinweis', code: 'viele-stufen', text: L(`Das Ziel hat ${mit.length} Stufen. Bei so vielen Stufen ist oft eine lineare Regression angemessener.`, `The outcome has ${mit.length} levels. With so many levels, linear regression is often more appropriate.`) });
  if (art === 'multreg' && koeffizienten > 0 && mit.length > 2) {
    const klein = mit.reduce((a, b) => (b.anzahl < a.anzahl ? b : a));
    if (klein.anzahl < MULT_FAELLE_JE_KOEFFIZIENT * koeffizienten) aus.push({ art: 'hinweis', code: 'faelle-je-koeffizient', text: L(
      `Die kleinste Kategorie ${zitat(klein.text)} hat ${klein.anzahl} Fälle bei ${koeffizienten} Koeffizienten. Als Faustregel (Peduzzi u. a. 1996) braucht es mindestens 10 Fälle je Koeffizient; sonst ist die Schätzung unsicher.`,
      `The smallest category ${zitat(klein.text)} has ${klein.anzahl} cases for ${koeffizienten} coefficients. As a rule of thumb (Peduzzi et al. 1996), at least 10 cases per coefficient are needed; otherwise the estimate is uncertain.`) });
  }
  return aus;
}

/** Vorschlag „Zähldaten-Regression“: ganze Zahlen ab 0, mindestens eine 0, mindestens drei verschiedene Werte (zwei Werte sind eine 0/1-Spalte: logistische Regression)
 *  und (Schiefe > 1 oder Anteil Nullen ≥ 10 %). Nicht bei Messniveau „ordinal“ oder „nominal“. Sonst `null`. */
export const ZAEHL_NULLEN_ANTEIL = 0.1;
export const ZAEHL_SCHIEFE = 1;
export interface ZaehlVorschlag { /** Schiefe, wenn sie über der Schwelle liegt, sonst null */ schief: number | null; /** Anteil der Nullen (0 … 1) */ nullen: number; /** Anteil der Nullen ab 10 % */ vieleNullen: boolean }
export function zaehlVorschlag(werte: number[], niveau?: Spalte['niveau']): ZaehlVorschlag | null {
  if (niveau === 'ordinal' || niveau === 'nominal') return null;   // Stufen oder Gruppen sind keine Zählung, auch wenn sie bei 0 beginnen
  if (werte.length < 3 || werte.some(v => !Number.isInteger(v) || v < 0)) return null;
  const nullen = werte.filter(v => v === 0).length / werte.length;
  if (nullen === 0 || new Set(werte).size < 3) return null;
  const sk = schiefe(werte), schief = Number.isFinite(sk) && sk > ZAEHL_SCHIEFE ? sk : null, viele = nullen >= ZAEHL_NULLEN_ANTEIL;
  return schief !== null || viele ? { schief, nullen, vieleNullen: viele } : null;
}
/** Vorschlag „ordinale Regression“: Messniveau ordinal und 3 bis 10 Stufen. */
export const ordinalVorschlag = (sp: Pick<Spalte, 'niveau'>, stufen: number): boolean => sp.niveau === 'ordinal' && stufen >= 3 && stufen <= ORD_STUFEN_VIEL;

/** Verdacht auf Trennung (ein Prädiktor trennt die Stufen fast oder ganz): ein Standardfehler über 20 (auf der Log-Skala) oder ein Effekt über 1000 bzw. unter 0,001. Gibt die Indizes der Prädiktoren zurück. */
export const TRENNUNG_EFFEKT = 1000;
export const TRENNUNG_SE = 20;
export function trennungVerdacht(koef: KatKoef[]): number[] {
  const hit = koef.filter(k => k.pIdx >= 0 && (!Number.isFinite(k.se) || k.se > TRENNUNG_SE || k.effekt > TRENNUNG_EFFEKT || k.effekt < 1 / TRENNUNG_EFFEKT));
  return [...new Set(hit.map(k => k.pIdx))].sort((a, b) => a - b);
}

/* ------------------------------------------------------------ R-Aufruf zum Nachrechnen („Befehl“) */

/** Was der R-Aufruf braucht: Spaltennamen der Daten, Stufen des Ziels (ordinal: Ordnung von Statable; multinomial: alle Kategorien), Vergleichskategorie. */
export interface KatCodeEingabe { art: KatArt; ziel: string; praed: KatPraed[]; stufen: string[]; referenz?: string; modell?: ZaehlModellWahl; zeit?: string }
// Nur zum Anzeigen (wird nie ausgeführt, aber vielleicht in RStudio eingefügt): Namen und Texte aus den Daten werden maskiert (engine/rsicher.ts).
const rn = rAnzeigeName;
const rs = rAnzeigeText;
/** Der gleiche Aufruf in R, den Statable rechnet (für „Befehl ansehen“ und den Bericht). `T` wählt die Sprache der Kommentare. */
export function katRCode(e: KatCodeEingabe, T: (de: string, en: string) => string): string {
  const rhs = (extra: string[] = []) => [...e.praed.map(p => rn(p.name)), ...extra].join(' + ');
  const gruppen = e.praed.filter(p => p.art === 'faktor').map(p => `daten$${rn(p.name)} <- factor(daten$${rn(p.name)}, levels = c(${p.stufen.map(rs).join(', ')}))   # ${T('erste Stufe = Vergleichsgruppe', 'first level = reference group')}`);
  const koeff = e.praed.reduce((a, p) => a + (p.art === 'faktor' ? Math.max(p.stufen.length - 1, 1) : 1), 0);
  if (e.art === 'ordreg') return [
    T('# Der gleiche Aufruf in R (Paket MASS), mit den Einstellungen, die Statable benutzt:', '# The same call in R (package MASS), with the settings Statable uses:'), 'library(MASS)', ...gruppen,
    `daten$${rn(e.ziel)} <- factor(daten$${rn(e.ziel)}, levels = c(${e.stufen.map(rs).join(', ')}), ordered = TRUE)   # ${T('Stufen von niedrig nach hoch', 'levels from low to high')}`,
    `m <- polr(${rn(e.ziel)} ~ ${rhs()}, data = daten, method = 'logistic', Hess = TRUE,`,
    `          control = list(reltol = 1e-14, maxit = 1000, ndeps = rep(1e-6, ${koeff + Math.max(e.stufen.length - 1, 1)})))   # ${T('feste Einstellungen der Optimierung (Koeffizienten + Schwellen)', 'fixed optimizer settings (coefficients + thresholds)')}`,
    `summary(m)   # ${T('B, SE und die Schwellen; Statable nimmt für p und KI den Wald-Test (Normalverteilung, qnorm(.975))', 'B, SE and the thresholds; Statable uses the Wald test (normal distribution, qnorm(.975)) for p and CI')}`,
    T('# Den Brant-Test (1990) rechnet Statable selbst (J - 1 binäre Logit-Modelle, kein Paket).', '# Statable calculates the Brant test (1990) itself (J - 1 binary logit models, no package).')
  ].join('\n');
  if (e.art === 'multreg') return [
    T('# Der gleiche Aufruf in R (Paket nnet), mit den Einstellungen, die Statable benutzt:', '# The same call in R (package nnet), with the settings Statable uses:'), 'library(nnet)', ...gruppen,
    `daten$${rn(e.ziel)} <- relevel(factor(daten$${rn(e.ziel)}), ref = ${rs(e.referenz ?? e.stufen[0] ?? '')})   # ${T('Vergleichskategorie', 'reference category')}`,
    `m <- multinom(${rn(e.ziel)} ~ ${rhs()}, data = daten, Hess = TRUE, maxit = 1000, reltol = 1e-12, trace = FALSE)`, 'summary(m)'
  ].join('\n');
  const off = e.zeit ? ` + offset(log(${rn(e.zeit)}))` : '';
  const pois = `glm(${rn(e.ziel)} ~ ${rhs()}${off}, family = poisson, data = daten)`;
  const negb = [
    `nb <- function(th) glm(${rn(e.ziel)} ~ ${rhs()}${off}, family = MASS::negative.binomial(th), data = daten)`,
    `ll <- function(lt) sum(dnbinom(daten$${rn(e.ziel)}, size = exp(lt), mu = fitted(nb(exp(lt))), log = TRUE))`,
    `theta <- exp(optimize(ll, log(c(1e-3, 1e4)), maximum = TRUE, tol = 1e-10)$maximum)   # ${T('θ über die Profil-Likelihood (nicht glm.nb, das bei vielen Nullen versagt)', 'θ by profile likelihood (not glm.nb, which fails with many zeros)')}`,
    `m <- nb(theta); summary(m, dispersion = 1)   # ${T('B und SE bei festem θ, wie SPSS GENLIN', 'B and SE with θ fixed, as SPSS GENLIN')}`
  ];
  return [
    T('# Der gleiche Aufruf in R (Paket MASS), mit den Einstellungen, die Statable benutzt:', '# The same call in R (package MASS), with the settings Statable uses:'), 'library(MASS)', ...gruppen,
    ...(e.modell === 'negbin' ? negb
      : e.modell === 'poisson' ? [`m <- ${pois}`, 'summary(m)']
        : [`m <- ${pois}   # ${T('Poisson', 'Poisson')}`, 'summary(m)', T('# Streuen die Werte stärker, als Poisson erlaubt (Likelihood-Quotienten-Test, p halbiert), rechnet Statable negativ-binomial:', '# If the values vary more than Poisson allows (likelihood ratio test, p halved), Statable calculates negative binomial:'), ...negb])
  ].join('\n');
}
