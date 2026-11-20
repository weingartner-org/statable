/**
 * Später S-E, Q2: Ridge, Lasso und Elastic Net (R-Paket glmnet 5.1) als Option unter „Weitere Wege“ der Frage „Lässt sich etwas vorhersagen?“.
 * Reine Funktionen: Faltungen aus JavaScript (unabhängig von der R-Version), Wahl von λ, Auswahl-Stabilität, Pfadbild, Prüfungen, Sätze zu den Hinweisen, R-Aufruf, R-Antwort lesen.
 * Rechnen: engine/statable-vorhersage-e.R (`sp_glmnet`), Aufruf in rverfahren.svelte.ts, Sätze und Tabellen des Ergebnisses: strafregsaetze.ts.
 * Fachblatt: docs/fachblaetter/SPAETER-E-VORHERSAGE-ZEITREIHEN-CLUSTER.md, Abschnitt 2 und „Entscheidungen Opus (18.10.)“ 5: λ.1se als Voreinstellung (λ.min wählbar), 5 × 10-fache Kreuzvalidierung,
 * Maß = mittlerer quadrierter Fehler, Gruppen über die Vergleichsgruppe wie überall (mit Hinweis), KEIN p und KEIN KI nach der Auswahl (auch kein Knopf „gewöhnlich nachrechnen“), Fallgewicht gesperrt.
 * Tests: strafreg.test.ts (Sollwerte aus R), engine/spaeter-e.webr.test.ts (webR gegen R am Mac).
 */
import type { KatDaten, KatPraed, RAufruf } from './kategreg';
import { L, Lp, d } from './sitzung.svelte';
import { zufall } from './zufall';
import { ohneNull } from './ergebnis';
import { BOOT_STARTWERT } from './bootstrap';
import { rFange, rIds, rWahl, rZahl, rBool, rArgListe } from '../engine/rsicher';

/** R-Pakete der Strafregression (glmnet samt foreach, iterators, shape, codetools; 3,4 MB). */
export const R_PAKETE_STRAF = ['glmnet'];

export const STRAF_STARTWERT = BOOT_STARTWERT;
export const STRAF_WDH = 5;
export const STRAF_N_MIN = 25;

export type StrafRegel = 'se1' | 'min';
export type StrafCode =
  | 'gewicht' | 'zu-wenig-faelle' | 'zu-wenige-groessen' | 'zu-viele-hilfsspalten'
  | 'wenig-faelle' | 'mehr-groessen-als-faelle' | 'viele-hilfsspalten' | 'konstant' | 'viele-fehlend' | 'wenige-werte' | 'ohne-standardisierung';

/** Zahl der Faltungen: ab 50 Fällen 10, von 25 bis 49 Fällen 5, darunter keine Strafregression. */
export const strafK = (n: number): 10 | 5 | null => (n >= 50 ? 10 : n >= STRAF_N_MIN ? 5 : null);

/** Die Faltungsnummer 1 … K je Zeile (Wiederholung `r`, 0-basiert): Fisher-Yates-Mischung der Zeilennummern mit `zufall(startwert + r)`, Zeile `perm[pos]` bekommt (pos mod K) + 1. */
export function strafFaltungen(n: number, K: number, startwert: number, r: number): number[] {
  if (!(n >= 1) || !(K >= 1)) return [];
  const rng = zufall(startwert + r), perm = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [perm[i], perm[j]] = [perm[j]!, perm[i]!]; }
  const f = new Array<number>(n);
  perm.forEach((z, pos) => { f[z] = (pos % K) + 1; });
  return f;
}
/** Die Faltungen aller Wiederholungen. */
export const strafAlleFaltungen = (n: number, K: number, startwert = STRAF_STARTWERT, wdh = STRAF_WDH): number[][] => Array.from({ length: wdh }, (_, r) => strafFaltungen(n, K, startwert, r));

/** λ-Wahl wie `cv.glmnet` (getOptcv.glmnet): λ.min = größtes λ mit kleinstem Fehler; λ.1se = größtes λ, dessen Fehler höchstens den kleinsten Fehler plus dessen Standardfehler beträgt. Indizes 0-basiert. */
export function lambdaWahl(lambda: number[], cvm: number[], cvsd: number[], regel: StrafRegel): { lambda: number; index: number; lambdaMin: number; lambda1se: number; indexMin: number; index1se: number } {
  let kleinst = Infinity; for (const v of cvm) if (v < kleinst) kleinst = v;
  let indexMin = -1; cvm.forEach((v, i) => { if (v <= kleinst && (indexMin < 0 || lambda[i]! > lambda[indexMin]!)) indexMin = i; });
  if (indexMin < 0) indexMin = 0;
  const grenze = cvm[indexMin]! + cvsd[indexMin]!;
  let index1se = indexMin; cvm.forEach((v, i) => { if (v <= grenze && lambda[i]! > lambda[index1se]!) index1se = i; });
  const index = regel === 'min' ? indexMin : index1se;
  return { lambda: lambda[index]!, index, lambdaMin: lambda[indexMin]!, lambda1se: lambda[index1se]!, indexMin, index1se };
}
/** Mittel der Fehlerkurven über die Wiederholungen (cvm und cvsd je λ). */
export function cvMittel(kurven: { cvm: number[]; cvsd: number[] }[]): { cvm: number[]; cvsd: number[] } {
  if (!kurven.length) return { cvm: [], cvsd: [] };
  const m = kurven[0]!.cvm.length, mittel = (f: 'cvm' | 'cvsd') => Array.from({ length: m }, (_, i) => kurven.reduce((a, k) => a + k[f][i]!, 0) / kurven.length);
  return { cvm: mittel('cvm'), cvsd: mittel('cvsd') };
}
/** Auswahl-Stabilität: wie oft kam die häufigste Menge gewählter Größen vor, von wie vielen Wiederholungen, und wie viele verschiedene Mengen gab es. */
export function strafStabilitaet(mengen: string[][]): { haeufigste: number; von: number; verschiedene: number } {
  const z = new Map<string, number>();
  for (const m of mengen) { const k = JSON.stringify([...m].sort()); z.set(k, (z.get(k) ?? 0) + 1); }
  return { haeufigste: z.size ? Math.max(...z.values()) : 0, von: mengen.length, verschiedene: z.size };
}
/** Vergleichbare Koeffizienten: b·s_x (die Standardabweichung der Spalte, mit 1/n). */
export const standardisierteKoef = (b: number[], sx: number[]): number[] => b.map((v, i) => v * (sx[i] ?? NaN));
/** Pfadbild: die Indizes (0-basiert) der `max` Größen mit dem größten |b·s_x|, absteigend, bei Gleichstand der kleinere Index zuerst; der Rest wird grau gezeichnet. */
export function pfadAuswahl(stdKoef: number[], max = 20): number[] {
  return stdKoef.map((v, i) => ({ a: Math.abs(v), i })).sort((x, y) => y.a - x.a || x.i - y.i).slice(0, max).map(x => x.i);
}

/* ------------------------------------------------------------ Prüfung und Sätze */

export interface StrafPruefEingabe { n: number; p: number; gewicht?: boolean; konstante?: number; ausgeschlossen?: number; wenigWerte?: number; ohneStandardisierung?: boolean }
/** Sperren und Hinweise vor dem Rechnen; `p`: Zahl der Vorhersagegrößen (mit den Hilfsspalten der Gruppen). */
export function strafPruefung(e: StrafPruefEingabe): { sperre: boolean; codes: StrafCode[] } {
  const c: StrafCode[] = [];
  if (e.gewicht) c.push('gewicht');
  const zuWenig = !(e.n >= STRAF_N_MIN);
  if (zuWenig) c.push('zu-wenig-faelle');
  if (e.p < 3 || !(e.p >= 0)) c.push('zu-wenige-groessen');
  if (e.p > 500) c.push('zu-viele-hilfsspalten');
  const sperre = c.length > 0;
  if (!zuWenig && e.n < 50) c.push('wenig-faelle');
  if (e.p > e.n) c.push('mehr-groessen-als-faelle');
  if (e.p > 200 && e.p <= 500) c.push('viele-hilfsspalten');
  if ((e.konstante ?? 0) >= 1) c.push('konstant');
  if ((e.ausgeschlossen ?? 0) > 0.2 * (e.n + (e.ausgeschlossen ?? 0))) c.push('viele-fehlend');
  if ((e.wenigWerte ?? 0) >= 1) c.push('wenige-werte');
  if (e.ohneStandardisierung) c.push('ohne-standardisierung');
  return { sperre, codes: c };
}
export function strafCodeSatz(code: StrafCode, e: Partial<StrafPruefEingabe> = {}): string {
  const n = e.n !== undefined && Number.isFinite(e.n) ? String(e.n) : '', p = e.p !== undefined && Number.isFinite(e.p) ? String(e.p) : '';
  switch (code) {
    case 'gewicht': return d('Die Strafregression rechnet nicht mit Fallgewichten: gleiche Fälle würden in Training und Test der Kreuzvalidierung zugleich stehen. Schalte das Fallgewicht aus oder wähle die lineare Regression.',
      'Die Strafregression rechnet nicht mit Fallgewichten: gleiche Fälle würden in Training und Test der Kreuzvalidierung zugleich stehen. Schalten Sie das Fallgewicht aus oder wählen Sie die lineare Regression.',
      'The penalized regression does not work with case weights: identical cases would stand in training and test of the cross-validation at the same time. Switch the case weight off or choose linear regression.');
    case 'zu-wenig-faelle': return n ? L(`Mit ${n} Fällen ist eine Strafregression nicht sinnvoll: Die Kreuzvalidierung braucht mindestens ${STRAF_N_MIN} Fälle.`, `With ${n} cases a penalized regression makes no sense: the cross-validation needs at least ${STRAF_N_MIN} cases.`)
      : L(`Mit so wenigen Fällen ist eine Strafregression nicht sinnvoll: Die Kreuzvalidierung braucht mindestens ${STRAF_N_MIN} Fälle.`, `With so few cases a penalized regression makes no sense: the cross-validation needs at least ${STRAF_N_MIN} cases.`);
    case 'zu-wenige-groessen': return L('Zu wenige Vorhersagegrößen für eine Strafe: Es braucht mindestens drei Spalten. Bei einer oder zwei Größen passt die gewöhnliche Regression.',
      'Too few predictors for a penalty: at least three columns are needed. With one or two predictors the ordinary regression fits.');
    case 'zu-viele-hilfsspalten': return p ? L(`Mit den Hilfsspalten der Gruppen sind es ${p} Vorhersagegrößen. So viele rechnet Statable im Browser nicht (höchstens 500).`, `With the helper columns of the groups there are ${p} predictors. Statable does not calculate so many in the browser (at most 500).`)
      : L('Mit den Hilfsspalten der Gruppen sind es mehr als 500 Vorhersagegrößen. So viele rechnet Statable im Browser nicht (höchstens 500).', 'With the helper columns of the groups there are more than 500 predictors. Statable does not calculate so many in the browser (at most 500).');
    case 'wenig-faelle': return n ? L(`Mit ${n} Fällen rechnet Statable eine 5-fache statt der 10-fachen Kreuzvalidierung; die Wahl der Stärke der Strafe ist unsicher.`, `With ${n} cases Statable runs a 5-fold instead of the 10-fold cross-validation; the choice of the strength of the penalty is uncertain.`)
      : L('Mit weniger als 50 Fällen rechnet Statable eine 5-fache statt der 10-fachen Kreuzvalidierung; die Wahl der Stärke der Strafe ist unsicher.', 'With fewer than 50 cases Statable runs a 5-fold instead of the 10-fold cross-validation; the choice of the strength of the penalty is uncertain.');
    case 'mehr-groessen-als-faelle': return n && p ? L(`Es sind mehr Vorhersagegrößen (${p}) als Fälle (${n}): Das Modell taugt nur zur Vorhersage, nicht zur Erklärung einzelner Größen.`, `There are more predictors (${p}) than cases (${n}): the model is only good for prediction, not for explaining single predictors.`)
      : L('Es sind mehr Vorhersagegrößen als Fälle: Das Modell taugt nur zur Vorhersage, nicht zur Erklärung einzelner Größen.', 'There are more predictors than cases: the model is only good for prediction, not for explaining single predictors.');
    case 'viele-hilfsspalten': return L('Mit den Hilfsspalten der Gruppen sind es mehr als 200 Vorhersagegrößen; die Rechnung dauert länger.', 'With the helper columns of the groups there are more than 200 predictors; the calculation takes longer.');
    case 'konstant': return Lp(e.konstante ?? 1, 'Eine Spalte hat überall denselben Wert; sie wird weggelassen.', `${e.konstante ?? 2} Spalten haben überall denselben Wert; sie werden weggelassen.`,
      'One column has the same value everywhere; it is left out.', `${e.konstante ?? 2} columns have the same value everywhere; they are left out.`);
    case 'viele-fehlend': return e.ausgeschlossen ? L(`Mehr als jeder fünfte Fall fehlt in mindestens einer Spalte (${e.ausgeschlossen} Fälle wurden ausgeschlossen). Die Strafregression rechnet nur mit vollständigen Fällen; das Ergebnis gilt dann für einen kleinen Teil der Daten.`, `More than one in five cases has a gap in at least one column (${e.ausgeschlossen} cases were excluded). The penalized regression only works with complete cases; the result then holds for a small part of the data.`)
      : L('Mehr als jeder fünfte Fall fehlt in mindestens einer Spalte. Die Strafregression rechnet nur mit vollständigen Fällen; das Ergebnis gilt dann für einen kleinen Teil der Daten.', 'More than one in five cases has a gap in at least one column. The penalized regression only works with complete cases; the result then holds for a small part of the data.');
    case 'wenige-werte': return L('Eine Zahlen-Spalte hat weniger als 3 verschiedene Werte. Vielleicht ist sie eine Gruppe; Gruppen mit Beschriftung nimmt Statable als Gruppe.', 'A number column has fewer than 3 distinct values. It may be a group; Statable treats groups with value labels as groups.');
    case 'ohne-standardisierung': return L('Ohne Standardisierung hängt die Strafe von der Einheit jeder Spalte ab (Stunden gegen Tage); die Auswahl ist dann kaum vergleichbar. Das ist nur für Fachleute gedacht.',
      'Without standardization the penalty depends on the unit of each column (hours versus days); the selection is then hardly comparable. This is meant for specialists only.');
  }
}
/** Der Satz, der im Ergebnis immer steht: nach der Auswahl gibt es keine p-Werte und keine Konfidenzintervalle. */
export const strafKeinPSatz = (): string => L('Für die gewählten Vorhersagegrößen gibt es hier keine p-Werte und Konfidenzintervalle. Die Auswahl und die Schätzung stammen aus denselben Daten; gewöhnliche Tests und Intervalle wären zu optimistisch (zu kleine p-Werte, zu schmale Intervalle).',
  'There are no p values and confidence intervals here for the selected predictors. The selection and the estimate come from the same data; ordinary tests and intervals would be too optimistic (p values too small, intervals too narrow).');
export const strafAlphaName = (alpha: number): string => (alpha === 0 ? 'Ridge' : alpha === 1 ? 'Lasso' : 'Elastic Net');
/** Zeile „Gerechnet“. */
export function strafGerechnet(o: { alpha: number; regel: StrafRegel; K: number; R: number; startwert: number; n: number }): string {
  const a = `${strafAlphaName(o.alpha)} (α = ${ohneNull(o.alpha, o.alpha === 0 || o.alpha === 1 ? 0 : 2)})`;
  const regel = o.regel === 'se1' ? L('Ein-Standardfehler-Regel', 'one-standard-error rule') : L('kleinster Fehler', 'smallest error');
  return L(`Strafregression (R-Paket glmnet 5.1; Friedman, Hastie, Tibshirani 2010): ${a}, standardisiert; λ durch ${o.R} × ${o.K}-fache Kreuzvalidierung, ${regel}, Startwert ${o.startwert}; n = ${o.n}`,
    `Penalized regression (R package glmnet 5.1; Friedman, Hastie, Tibshirani 2010): ${a}, standardized; λ by ${o.R} × ${o.K}-fold cross-validation, ${regel}, seed ${o.startwert}; n = ${o.n}`);
}

/* ------------------------------------------------------------ R-Aufruf */

/** Der Aufruf von `sp_glmnet`: nur feste Wörter, eigene Namen und Zahlen; die Faltungen gehen als Ganzzahl-Vektoren (als Text) in `args`, nie in den Code (engine/rsicher.ts). */
export function strafAufruf(dt: KatDaten, o: { alpha: number; foldids: number[][]; regel: StrafRegel; standardisieren: boolean }): RAufruf {
  const praed = dt.praed.map((_, k) => `p${String(k + 1).padStart(2, '0')}`), faktoren = dt.praed.flatMap((p, k) => (p.art === 'faktor' ? [`p${String(k + 1).padStart(2, '0')}`] : []));
  if (!o.foldids.length) throw new Error('Keine Faltungen für R');
  const args: Record<string, string[]> = {};
  o.foldids.forEach((f, i) => { if (f.some(v => !Number.isSafeInteger(v))) throw new Error('Faltung ohne ganze Zahlen'); args[`fa${i + 1}`] = f.map(String); });
  const rTeilFalten = rArgListe(o.foldids.map((_, i) => `fa${i + 1}`));
  return { code: rFange(`sp_glmnet(d, 'y', ${rIds(praed)}, ${rIds(faktoren)}, ${rZahl(o.alpha)}, ${rTeilFalten}, ${rWahl(o.regel, ['se1', 'min'] as const)}, ${rBool(o.standardisieren)})`), args };
}

/* ------------------------------------------------------------ Ergebnis */

export interface StrafKoef { name: string; pIdx: number; stufe: string; b: number; sx: number; std: number; /** in wie vielen Wiederholungen gewählt */ wiederholungen: number }
export interface StrafWdh { lambdaMin: number; lambda1se: number; lambda: number; gewaehlt: string[] }
export interface StrafErgebnis {
  art: 'penal'; ziel: string; praed: KatPraed[]; n: number; ausgelassen: number; alpha: number; regel: StrafRegel; standardisieren: boolean; K: number; R: number; startwert: number;
  koef: StrafKoef[]; konstante: number; konstant: string[];
  lambda: number[]; nzero: number[]; cvm: number[]; cvsd: number[];
  lambdaMin: number; lambda1se: number; lambdaGewaehlt: number; cvMin: number; cvMinSe: number; cv1se: number; cv1seSe: number; cvFehler: number; cvSe: number;
  df: number; nullfehler: number; trainPen: number; trainOls: number | null; wiederholungen: StrafWdh[]; stabilitaet: { haeufigste: number; von: number; verschiedene: number };
  pfadStd: number[][]; warnungen: string[];
}
const arr = <T>(x: unknown): T[] => (x == null ? [] : Array.isArray(x) ? (x as T[]) : [x as T]);
const num = (x: unknown): number => { const v = arr<number | null>(x)[0]; return typeof v === 'number' && Number.isFinite(v) ? v : NaN; };
const nums = (x: unknown): number[] => arr<number | null>(x).map(v => (typeof v === 'number' ? v : NaN));
const hatFeld = (o: unknown): o is Record<string, unknown> => !!o && typeof o === 'object' && !Array.isArray(o) && !('type' in (o as object) && Object.keys(o as object).length === 1);

function koefInfo(name: string, praed: KatPraed[]): { pIdx: number; stufe: string } {
  const m = /^p(\d\d)(.*)$/s.exec(name);
  if (!m) return { pIdx: -1, stufe: '' };
  const pIdx = Number(m[1]) - 1;
  return { pIdx, stufe: praed[pIdx]?.art === 'faktor' ? m[2]! : '' };
}
/** Wie viele Fälle in die Rechnung gehen (Zeilen ohne Lücke in Ziel und Vorhersagegrößen) - nach dieser Zahl werden die Faltungen gebildet. */
export function strafVollstaendig(dt: KatDaten): number {
  const n = dt.spalten[0]?.werte.length ?? 0; let k = 0;
  for (let i = 0; i < n; i++) if (dt.spalten.every(s => s.werte[i] !== null && s.werte[i] !== undefined)) k++;
  return k;
}
/** Die R-Antwort von `sp_glmnet` lesen. */
export function strafLesen(r: Record<string, unknown>, dt: KatDaten, o: { K: number; R: number; startwert: number }): StrafErgebnis {
  const namen = arr<string>(r.namen).map(String), b = nums(r.koef), sx = nums(r.sx), std = nums(r.std_koef);
  const wd: StrafWdh[] = arr<Record<string, unknown>>(r.wiederholungen).filter(hatFeld).map(w => ({ lambdaMin: num(w.lambda_min), lambda1se: num(w.lambda_1se), lambda: num(w.lambda), gewaehlt: arr<string>(w.gewaehlt).map(String) }));
  const koef: StrafKoef[] = namen.map((name, i) => ({ name, ...koefInfo(name, dt.praed), b: b[i] ?? NaN, sx: sx[i] ?? NaN, std: std[i] ?? NaN, wiederholungen: wd.filter(w => w.gewaehlt.includes(name)).length }));
  const ols = arr<number>(r.train_ols);
  return {
    art: 'penal', ziel: dt.ziel, praed: dt.praed, n: num(r.n), ausgelassen: num(r.ausgelassen), alpha: num(r.alpha), regel: arr<string>(r.regel)[0] === 'min' ? 'min' : 'se1', standardisieren: arr<boolean>(r.standardisieren)[0] !== false,
    K: o.K, R: o.R, startwert: o.startwert, koef, konstante: num(r.konstante), konstant: arr<string>(r.konstant).map(String),
    lambda: nums(r.lambda), nzero: nums(r.nzero), cvm: nums(r.cvm), cvsd: nums(r.cvsd),
    lambdaMin: num(r.lambda_min), lambda1se: num(r.lambda_1se), lambdaGewaehlt: num(r.lambda_gewaehlt), cvMin: num(r.cvm_min), cvMinSe: num(r.cvsd_min), cv1se: num(r.cvm_1se), cv1seSe: num(r.cvsd_1se), cvFehler: num(r.cv_fehler), cvSe: num(r.cv_se),
    df: num(r.df), nullfehler: num(r.nullfehler), trainPen: num(r.train_pen), trainOls: ols.length && typeof ols[0] === 'number' && Number.isFinite(ols[0]) ? ols[0] : null,
    wiederholungen: wd, stabilitaet: strafStabilitaet(wd.map(w => w.gewaehlt)), pfadStd: arr<unknown>(r.pfad_std).map(nums), warnungen: arr<string>(r.warnungen).map(String)
  };
}
/** Fehler aus R als Satz. */
export function strafFehlerSatz(meldung: string): string {
  if (/the folds do not match/i.test(meldung)) return L('Die Faltungen der Kreuzvalidierung passen nicht zu den Fällen.', 'The folds of the cross-validation do not match the cases.');
  if (/too few predictors/i.test(meldung)) return L('Zu wenige Vorhersagegrößen für eine Strafe: Es braucht mindestens drei Spalten. Bei einer oder zwei Größen passt die gewöhnliche Regression.', 'Too few predictors for a penalty: at least three columns are needed. With one or two predictors the ordinary regression fits.');
  if (/only one group left/i.test(meldung)) return L('Eine Gruppen-Spalte hat nach dem Weglassen der Lücken nur noch eine Gruppe. Damit lässt sich kein Unterschied zwischen Gruppen schätzen.', 'A group column has only one group left once gaps are left out. No difference between groups can be estimated.');
  if (/no predictors/i.test(meldung)) return d('Wähle mindestens eine Spalte, aus der vorhergesagt wird.', 'Wählen Sie mindestens eine Spalte, aus der vorhergesagt wird.', 'Choose at least one column to predict from.');
  const m = meldung.replace(/\s+/g, ' ').trim().slice(0, 160);
  return L(`Die Strafregression konnte mit diesen Daten nicht rechnen${m ? ` (R: ${m})` : ''}.`, `The penalized regression could not calculate with these data${m ? ` (R: ${m})` : ''}.`);
}
