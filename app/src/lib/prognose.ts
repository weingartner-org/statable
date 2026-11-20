/**
 * Prognose für Zeitreihen (Karte „zeitreihen“, Fachblatt docs/fachblaetter/PROGNOSE-ARIMA.md): Wahl, Sperren, Regeln für Horizont und Prüfzeitraum, der Aufruf an R
 * (engine/statable-prognose.R), das Lesen der Antwort, die Leitplanken (Prüfliste) und der R-Text zum Ansehen.
 * Gerechnet wird in R (nur stats); hier steht alles, was ohne R prüfbar ist. Gespeichert wird die Wahl samt Antwort (`PrognoseE`), damit Bericht und Export ohne R stimmen.
 * SICHERHEIT: Der Aufruf enthält nur feste Wörter und Zahlen (rGanz, rBool, rWahl); die Reihe selbst geht als Spalte `y` der Tabelle `d` hinein, nie als Text im Code.
 */
import { L, Lp, d } from './sitzung.svelte';
import { komma, ohneNull, pWert } from './ergebnis';
import { rGanz, rBool, rWahl, rFange, rAnzeigeName, rAnzeigeZahl } from '../engine/rsicher';
import type { RAufruf } from './kategreg';
import type { Raster } from './zeitreihe';

/** 'ets-auto': „Automatisch über die Glättung“ (ETS-Modelle, Fachblatt GLAETTUNG-SERIEN, Abschnitt 3) */
export type PrognoseArt = 'auto' | 'arima' | 'glaettung' | 'ets-auto';
/** 'gedaempft': Glättung mit gedämpftem Trend, Modell ETS(A,Ad,N) (Abschnitt 2); die übrigen vier rechnet HoltWinters */
export type GlaettungArt = 'einfach' | 'holt' | 'add' | 'mult' | 'gedaempft';
export const GLAETTUNGEN: readonly GlaettungArt[] = ['einfach', 'holt', 'add', 'mult', 'gedaempft'];
/** Die Arten, die HoltWinters rechnet. */
export const HW_GLAETTUNGEN: readonly GlaettungArt[] = ['einfach', 'holt', 'add', 'mult'];
/** Die neun ETS-Modelle der Automatik (Fehlerart, Trend, Saison; d = gedämpft), in der Reihenfolge der Rechnung. */
export const ETS_MODELLE = ['ANN', 'AAN', 'AAdN', 'ANA', 'AAA', 'AAdA', 'MNM', 'MAM', 'MAdM'] as const;

/** Was die Person wählt. */
export interface PrognoseWahl {
  art: PrognoseArt;
  /** Horizont: Zahl der Zeitpunkte nach dem letzten Wert */
  h: number;
  /** nur ARIMA: auf der Log-Skala rechnen */
  log: boolean;
  /** nur „selbst wählen“ */
  p: number; d: number; q: number; P: number; D: number; Q: number; konst: boolean;
  glaettung: GlaettungArt;
}

/** Was die Rechnung über die Reihe wissen muss. */
export interface PrognoseReihe { raster: Raster; periode: number; y: (number | null)[] }

/* ---------------------------------------------------------------- Sperren und Regeln */
export const PROG_MIN = 20, PROG_AUTO_MAX = 600, PROG_BOX_JENKINS = 50;
export type PrognoseSperre = 'zu-viele-luecken' | 'ungleich' | 'zu-kurz' | 'alle-gleich';
export type PrognoseWahlCode = 'luecken-nur-selbst' | 'auto-zu-lang' | 'saison-nicht-moeglich' | 'mult-nicht-positiv' | 'log-nicht-positiv' | 'wahl-ungueltig' | 'horizont';
export type PrognoseFehlerCode = 'luecken-nur-selbst' | 'log-nicht-positiv' | 'mult-nicht-positiv' | 'zu-kurz-saison' | 'kein-modell' | 'nicht-konvergiert' | 'r-fehler';
export type PrognoseCode = PrognoseSperre | PrognoseWahlCode | PrognoseFehlerCode;

const werteVon = (r: PrognoseReihe): number[] => r.y.filter((v): v is number => v !== null);
/** Grenze für Lücken: bis 10 % rechnet nur „ARIMA selbst wählen“, darüber gar nichts (dieselbe Grenze wie beim Korrelogramm). */
export const PROG_LUECKEN_MAX = 0.1;
export const hatLuecken = (r: Pick<PrognoseReihe, 'y'>): boolean => r.y.some(v => v === null);
/** Kann für diese Reihe überhaupt eine Prognose gerechnet werden? Sonst der Grund (in der Reihenfolge des Fachblatts: zu viele Lücken, ungleiche Abstände, zu kurz, alle gleich). Mindestens 20 vorhandene Werte. */
export function prognoseSperre(r: PrognoseReihe): PrognoseSperre | null {
  const w = werteVon(r);
  if (r.y.length > 0 && (r.y.length - w.length) / r.y.length > PROG_LUECKEN_MAX) return 'zu-viele-luecken';
  if (r.raster === 'ungleich') return 'ungleich';
  if (w.length < PROG_MIN) return 'zu-kurz';
  if (w.every(v => v === w[0])) return 'alle-gleich';
  return null;
}
/** Die Automatik rechnet bis 600 Werte. */
export const prognoseAutoErlaubt = (T: number): boolean => T <= PROG_AUTO_MAX;
/** Höchster Horizont: bei Saison min(2 m, ⌊T/4⌋), sonst ⌊T/4⌋, mindestens 1. */
export const horizontMax = (T: number, m: number): number => Math.max(1, m > 1 ? Math.min(2 * m, Math.floor(T / 4)) : Math.floor(T / 4));
/** Vorgabe: eine Periode (m > 1) bzw. 5, nie über dem Höchsten. */
export const horizontStandard = (T: number, m: number): number => Math.min(horizontMax(T, m), m > 1 ? m : 5);
/** Länge des Prüfzeitraums: m > 1 und T ≥ 4 m: m; m = 1: min(5, ⌊T/5⌋); sonst 0 (kein Prüfzeitraum). */
export function pruefzeitraumLaenge(T: number, m: number): number {
  if (m > 1) return T >= 4 * m ? m : 0;
  return Math.min(5, Math.floor(T / 5));
}
export const logMoeglich = (r: PrognoseReihe): boolean => { const w = werteVon(r); return w.length > 0 && w.every(v => v > 0); };
/** Die Saison der Glättung: Periode ab 2 und T ≥ 2 m + 1. */
export const glaettungSaisonMoeglich = (T: number, m: number): boolean => m >= 2 && T >= 2 * m + 1;
/** Warum eine Glättungsart nicht geht (oder null). */
export function glaettungGrund(art: GlaettungArt, r: PrognoseReihe): PrognoseWahlCode | null {
  const T = r.y.length;
  if (hatLuecken(r)) return 'luecken-nur-selbst';
  if ((art === 'add' || art === 'mult') && !glaettungSaisonMoeglich(T, r.periode)) return 'saison-nicht-moeglich';
  if (art === 'mult' && !logMoeglich(r)) return 'mult-nicht-positiv';
  return null;
}
/** Die Kandidaten der Glättungs-Automatik in der Reihenfolge der Rechnung (engine/statable-glaettung.R, `sp_prognose_ets_auto`): immer ANN, AAN, AAdN; bei 2 ≤ m ≤ 24 und T ≥ 3 m dazu ANA, AAA, AAdA und, wenn alle Werte über 0 liegen, MNM, MAM, MAdM.
 *  Die Reihenfolge ist Teil der Rechnung: AAdA und MAdM starten vom Ergebnis von AAA und MAM. */
export function etsKandidaten(m: number, T: number, alleWerteUeber0: boolean): (typeof ETS_MODELLE)[number][] {
  const k: (typeof ETS_MODELLE)[number][] = ['ANN', 'AAN', 'AAdN'];
  if (m > 1 && m <= 24 && T >= 3 * m) k.push('ANA', 'AAA', 'AAdA', ...(alleWerteUeber0 ? (['MNM', 'MAM', 'MAdM'] as const) : []));
  return k;
}
/** ARIMA-Saison nur bei 2 ≤ m ≤ 24. */
export const arimaSaisonMoeglich = (m: number): boolean => m >= 2 && m <= 24;

export function prognoseStandardWahl(r: PrognoseReihe, logVorschlag: boolean): PrognoseWahl {
  const T = r.y.length;
  return { art: prognoseAutoErlaubt(T) && !hatLuecken(r) ? 'auto' : 'arima', h: horizontStandard(T, r.periode), log: logVorschlag && logMoeglich(r), p: 0, d: 1, q: 1, P: 0, D: 0, Q: 0, konst: false, glaettung: 'einfach' };
}

const klemme = (x: number, lo: number, hi: number): number => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : lo);
/** Die Wahl in die erlaubten Grenzen: p, q, P, Q 0 bis 5, d 0 bis 2, D 0 bis 1; P, D, Q nur bei 2 ≤ m ≤ 24; Konstante nur bei d + D ≤ 1; Horizont 1 bis zum Höchsten; Log nur bei Werten über 0. */
export function prognoseWahlBereinigen(w: PrognoseWahl, r: PrognoseReihe): PrognoseWahl {
  const T = r.y.length, m = r.periode, saison = arimaSaisonMoeglich(m);
  const o: PrognoseWahl = {
    art: w.art, h: klemme(w.h, 1, horizontMax(T, m)), log: (w.art === 'arima' || w.art === 'auto') && w.log && logMoeglich(r),
    p: klemme(w.p, 0, 5), d: klemme(w.d, 0, 2), q: klemme(w.q, 0, 5), P: saison ? klemme(w.P, 0, 5) : 0, D: saison ? klemme(w.D, 0, 1) : 0, Q: saison ? klemme(w.Q, 0, 5) : 0,
    konst: false, glaettung: GLAETTUNGEN.includes(w.glaettung) ? w.glaettung : 'einfach'
  };
  o.konst = !!w.konst && o.d + o.D <= 1;
  return o;
}
/** Warum die Wahl nicht gerechnet wird (oder null). Prüft nur, was die Oberfläche nicht schon begrenzt. */
export function prognoseWahlGrund(w: PrognoseWahl, r: PrognoseReihe): PrognoseWahlCode | null {
  const T = r.y.length;
  if (w.art !== 'arima' && hatLuecken(r)) return 'luecken-nur-selbst';
  if ((w.art === 'auto' || w.art === 'ets-auto') && !prognoseAutoErlaubt(T)) return 'auto-zu-lang';
  if ((w.art === 'arima' || w.art === 'auto') && w.log && !logMoeglich(r)) return 'log-nicht-positiv';
  if (w.art === 'glaettung') return glaettungGrund(w.glaettung, r);
  if (w.art === 'arima' && (w.P > 0 || w.D > 0 || w.Q > 0) && !arimaSaisonMoeglich(r.periode)) return 'saison-nicht-moeglich';
  return null;
}

/* ---------------------------------------------------------------- Aufruf an R */
/** Der Aufruf an `sp_prognose_ets`: ein gewähltes ETS-Modell (nur aus der Liste der neun). Die Reihe steht als Spalte `y` in der Tabelle `d`. */
export const etsAufruf = (modell: (typeof ETS_MODELLE)[number], m: number, h: number, pr: number): RAufruf => ({ code: rFange(`sp_prognose_ets(d$y, ${rGanz(m)}, ${rGanz(h)}, ${rWahl(modell, ETS_MODELLE)}, ${rGanz(pr)})`), args: {} });
/** Die Automatik über die Glättung in drei Schritten (damit die Oberfläche den Fortschritt zeigen kann): Start (die Liste der Kandidaten), je ein Modell, Ende (Wahl und Antwort). Dieselbe Rechnung wie `sp_prognose_ets_auto`. */
export const etsAutoStartAufruf = (m: number): RAufruf => ({ code: rFange(`sp_ets_start(d$y, ${rGanz(m)})`), args: {} });
export const etsAutoKandidatAufruf = (m: number, modell: (typeof ETS_MODELLE)[number]): RAufruf => ({ code: rFange(`sp_ets_kandidat(d$y, ${rGanz(m)}, ${rWahl(modell, ETS_MODELLE)})`), args: {} });
export const etsAutoEndeAufruf = (m: number, h: number, pr: number): RAufruf => ({ code: rFange(`sp_ets_ende(d$y, ${rGanz(m)}, ${rGanz(h)}, ${rGanz(pr)})`), args: {} });
/** Die Antwort von `sp_ets_start`: die Kandidaten (nur Modelle aus der Liste der neun) oder ein Fehlerkennwort. */
export function etsAutoStartLesen(roh: unknown): { ok: true; kandidaten: (typeof ETS_MODELLE)[number][] } | { ok: false; code: PrognoseFehlerCode } {
  if (!istObjekt(roh)) return { ok: false, code: 'r-fehler' };
  if (roh.fehler !== undefined) { const f = text(roh.fehler); return { ok: false, code: (FEHLER.includes(f) ? f : 'r-fehler') as PrognoseFehlerCode }; }
  const k = arr<unknown>(roh.k).map(String);
  return k.length && k.every(x => (ETS_MODELLE as readonly string[]).includes(x)) ? { ok: true, kandidaten: k as (typeof ETS_MODELLE)[number][] } : { ok: false, code: 'r-fehler' };
}
/** Der Aufruf an `sp_prognose_arima`, `sp_prognose_glaettung`, `sp_prognose_ets` oder `sp_prognose_ets_auto`; die Reihe steht als Spalte `y` in der Tabelle `d`. `wahl` ist schon bereinigt. Fehler kommen als `list(fehler = …)` zurück. */
export function prognoseAufruf(w: PrognoseWahl, m: number, pr: number): RAufruf {
  if (w.art === 'ets-auto') return { code: rFange(`sp_prognose_ets_auto(d$y, ${rGanz(m)}, ${rGanz(w.h)}, ${rGanz(pr)})`), args: {} };
  if (w.art === 'glaettung' && w.glaettung === 'gedaempft') return etsAufruf('AAdN', m, w.h, pr);
  if (w.art === 'glaettung') return { code: rFange(`sp_prognose_glaettung(d$y, ${rGanz(m)}, ${rGanz(w.h)}, ${rWahl(w.glaettung, HW_GLAETTUNGEN)}, ${rGanz(pr)})`), args: {} };
  const auto = w.art === 'auto';
  return { code: rFange(`sp_prognose_arima(d$y, ${rGanz(m)}, ${rGanz(w.h)}, ${rBool(w.log)}, ${rBool(auto)}, ${rGanz(auto ? 0 : w.p)}, ${rGanz(auto ? 0 : w.d)}, ${rGanz(auto ? 0 : w.q)}, ${rGanz(auto ? 0 : w.P)}, ${rGanz(auto ? 0 : w.D)}, ${rGanz(auto ? 0 : w.Q)}, ${rBool(auto ? true : w.konst)}, ${rGanz(pr)})`), args: {} };
}

/* ---------------------------------------------------------------- Antwort */
export interface PrognoseLjung { q: number; h: number; p: number; fitdf: number }
export interface PrognosePruef { rmse: number; mae: number; rmseNaiv: number; maeNaiv: number; pr: number }
export interface PrognoseKandidat { p: number; q: number; P: number; Q: number; konst: boolean; aicc: number }
export interface PrognoseAutomatik { d: number; D: number; kpss: number; staerke: number | null; geprueft: number; liste: PrognoseKandidat[] }
export interface PrognoseAutomatikEts { modelle: string[]; aicc: number[]; geprueft: number }
export interface PrognoseAntwort {
  art: 'arima' | 'glaettung';
  periode: number;
  /** ARIMA */
  log: boolean; p: number; d: number; q: number; P: number; D: number; Q: number; konst: boolean; drift: boolean;
  namen: string[]; b: number[]; se: number[];
  sigma2: number | null; aic: number | null; aicc: number | null; bic: number | null; nobs: number; tauglich: boolean;
  /** Glättung */
  glaettung: GlaettungArt | null; alpha: number | null; beta: number | null; gamma: number | null;
  /** ETS (Abschnitt 5): der Code des Modells (zum Beispiel MAM), die Dämpfung φ, die log-Likelihood, die besten fünf der Automatik; fehlt bei HoltWinters, ARIMA und in alten Projektdateien */
  ets?: string | null; phi?: number | null; loglik?: number | null; wahlEts?: PrognoseAutomatikEts | null;
  /** Ein ARIMA-Modell, das auf andere Daten angewandt wurde (nichts neu geschätzt) */
  neu?: boolean;
  mittel: number[]; u80: number[]; o80: number[]; u95: number[]; o95: number[];
  rmse: number | null; mae: number | null; mape: number | null;
  ljung: PrognoseLjung | null; acfRes: number[];
  pruef: PrognosePruef | null;
  wahl: PrognoseAutomatik | null;
}
/** Das, was am Blatt gespeichert wird. */
export interface PrognoseE { wahl: PrognoseWahl; pr: number; antwort: PrognoseAntwort }

const arr = <T>(x: unknown): T[] => (x == null ? [] : Array.isArray(x) ? (x as T[]) : [x as T]);
const num = (x: unknown): number | null => { const v = arr<unknown>(x)[0]; return typeof v === 'number' && Number.isFinite(v) ? v : null; };
const zahl0 = (x: unknown, ersatz = 0): number => num(x) ?? ersatz;
const nums = (x: unknown): number[] => arr<unknown>(x).map(v => (typeof v === 'number' ? v : NaN));
const text = (x: unknown): string => String(arr<unknown>(x)[0] ?? '');
const bool = (x: unknown): boolean => arr<unknown>(x)[0] === true;
const istObjekt = (o: unknown): o is Record<string, unknown> => !!o && typeof o === 'object' && !Array.isArray(o) && !(Object.keys(o as object).length === 1 && 'type' in (o as object));
const FEHLER: readonly string[] = ['luecken-nur-selbst', 'log-nicht-positiv', 'mult-nicht-positiv', 'zu-kurz-saison', 'kein-modell', 'nicht-konvergiert', 'r-fehler'];

/** Die Antwort von R lesen. `fehler` (ein Kennwort der R-Funktion oder ein R-Text) wird zum Fehlercode. Wirft nie. */
export function prognoseLesen(roh: unknown): { ok: true; antwort: PrognoseAntwort } | { ok: false; code: PrognoseFehlerCode } {
  if (!istObjekt(roh)) return { ok: false, code: 'r-fehler' };
  if (roh.fehler !== undefined) { const f = text(roh.fehler); return { ok: false, code: (FEHLER.includes(f) ? f : 'r-fehler') as PrognoseFehlerCode }; }
  const art = text(roh.art);
  if (art !== 'arima' && art !== 'glaettung') return { ok: false, code: 'r-fehler' };
  const mittel = nums(roh.mittel);
  if (!mittel.length || mittel.some(v => !Number.isFinite(v))) return { ok: false, code: 'r-fehler' };
  const lj = istObjekt(roh.ljung) ? roh.ljung : null, pj = istObjekt(roh.pruef) ? roh.pruef : null, wj = istObjekt(roh.wahl) ? roh.wahl : null;
  const ljung = lj && num(lj.q) !== null && num(lj.p) !== null ? { q: zahl0(lj.q), h: zahl0(lj.h), p: zahl0(lj.p), fitdf: zahl0(lj.fitdf) } : null;
  const pruef = pj && num(pj.rmse) !== null ? { rmse: zahl0(pj.rmse), mae: zahl0(pj.mae), rmseNaiv: zahl0(pj.rmse_naiv), maeNaiv: zahl0(pj.mae_naiv), pr: zahl0(roh.pr) } : null;
  let wahl: PrognoseAutomatik | null = null;
  if (wj) {
    const lp = nums(wj.lp), lq = nums(wj.lq), lP = nums(wj.lP), lQ = nums(wj.lQ), lk = arr<unknown>(wj.lk), la = nums(wj.la);
    const liste = la.map((a, i) => ({ p: lp[i]!, q: lq[i]!, P: lP[i]!, Q: lQ[i]!, konst: lk[i] === true, aicc: a })).slice(0, 5);
    const st = num(wj.staerke);
    wahl = { d: zahl0(wj.d), D: zahl0(wj.D), kpss: zahl0(wj.kpss), staerke: st !== null && st >= 0 ? st : null, geprueft: zahl0(wj.geprueft), liste };
  }
  const g = text(roh.glaettung), ets = text(roh.ets), we = istObjekt(roh.wahl_ets) ? roh.wahl_ets : null;
  const wahlEts: PrognoseAutomatikEts | null = we ? { modelle: arr<unknown>(we.modell).map(String), aicc: nums(we.aicc), geprueft: zahl0(we.geprueft) } : null;
  return { ok: true, antwort: {
    ets: (ETS_MODELLE as readonly string[]).includes(ets) ? ets : null, phi: num(roh.phi), loglik: num(roh.loglik), wahlEts: wahlEts && wahlEts.modelle.length ? wahlEts : null, neu: bool(roh.neu),
    art, periode: zahl0(roh.periode, 1), log: bool(roh.log), p: zahl0(roh.p), d: zahl0(roh.d), q: zahl0(roh.q), P: zahl0(roh.P), D: zahl0(roh.D), Q: zahl0(roh.Q), konst: bool(roh.konst), drift: bool(roh.drift),
    namen: arr<unknown>(roh.namen).map(String), b: nums(roh.b), se: nums(roh.se), sigma2: num(roh.sigma2), aic: num(roh.aic), aicc: num(roh.aicc), bic: num(roh.bic), nobs: zahl0(roh.nobs),
    tauglich: art === 'arima' ? roh.tauglich === undefined || bool(roh.tauglich) : true,
    glaettung: (GLAETTUNGEN as readonly string[]).includes(g) ? (g as GlaettungArt) : null, alpha: num(roh.alpha), beta: num(roh.beta), gamma: num(roh.gamma),
    mittel, u80: nums(roh.u80), o80: nums(roh.o80), u95: nums(roh.u95), o95: nums(roh.o95), rmse: num(roh.rmse), mae: num(roh.mae), mape: num(roh.mape),
    ljung, acfRes: nums(roh.acf_res), pruef, wahl
  } };
}

/* ---------------------------------------------------------------- Namen */
/** `ARIMA(0,1,1)(0,1,1)[12]` bzw. `ARIMA(2,1,1)` ohne Saisonteil. */
export function prognoseModellName(a: Pick<PrognoseAntwort, 'p' | 'd' | 'q' | 'P' | 'D' | 'Q' | 'periode'>): string {
  const saison = a.P + a.D + a.Q > 0;
  return `ARIMA(${a.p},${a.d},${a.q})${saison ? `(${a.P},${a.D},${a.Q})[${a.periode}]` : ''}`;
}
export const glaettungName = (g: GlaettungArt): string =>
  g === 'einfach' ? L('Einfache exponentielle Glättung', 'Simple exponential smoothing') : g === 'holt' ? L('Exponentielle Glättung mit Trend (Holt)', 'Exponential smoothing with trend (Holt)')
    : g === 'add' ? L('Holt-Winters, additiv', 'Holt-Winters, additive') : g === 'mult' ? L('Holt-Winters, multiplikativ', 'Holt-Winters, multiplicative')
      : L('Exponentielle Glättung mit gedämpftem Trend', 'Exponential smoothing with damped trend');
/** `ETS(M,A,M)`: Fehlerart, Trend (N keiner, A gleichmäßig, Ad gedämpft), Saison (N keine, A additiv, M multiplikativ). */
export function etsName(code: string): string {
  return `ETS(${code.slice(0, 1)},${code.slice(1, -1)},${code.slice(-1)})`;
}
/** Ein ganzer Satz, der den Namen des ETS-Modells erklärt (für Hauptsatz und Tabellen). */
export function etsSatz(code: string): string {
  switch (code) {
    case 'ANN': return L('ETS(A,N,N) ist die einfache exponentielle Glättung: ein Niveau, kein Trend, keine Saison.', 'ETS(A,N,N) is simple exponential smoothing: a level, no trend, no season.');
    case 'AAN': return L('ETS(A,A,N) ist die Glättung mit Trend nach Holt: ein Niveau und ein gleichmäßiger Trend, keine Saison.', 'ETS(A,A,N) is smoothing with a trend after Holt: a level and a steady trend, no season.');
    case 'AAdN': return L('ETS(A,Ad,N) ist die Glättung mit gedämpftem Trend: ein Niveau und ein Trend, der mit der Zeit abflacht, keine Saison.', 'ETS(A,Ad,N) is smoothing with a damped trend: a level and a trend that flattens out over time, no season.');
    case 'ANA': return L('ETS(A,N,A) ist eine Glättung mit additiver Saison ohne Trend.', 'ETS(A,N,A) is smoothing with an additive season and no trend.');
    case 'AAA': return L('ETS(A,A,A) ist die Glättung mit gleichmäßigem Trend und additiver Saison (Holt-Winters, additiv).', 'ETS(A,A,A) is smoothing with a steady trend and an additive season (Holt-Winters, additive).');
    case 'AAdA': return L('ETS(A,Ad,A) ist die Glättung mit gedämpftem Trend und additiver Saison.', 'ETS(A,Ad,A) is smoothing with a damped trend and an additive season.');
    case 'MNM': return L('ETS(M,N,M) ist eine Glättung mit multiplikativer Saison ohne Trend; die Fehler sind multiplikativ, das heißt relativ zum Wert.', 'ETS(M,N,M) is smoothing with a multiplicative season and no trend; the errors are multiplicative, that is relative to the value.');
    case 'MAM': return L('ETS(M,A,M) ist die Glättung mit gleichmäßigem Trend und multiplikativer Saison (Holt-Winters, multiplikativ); die Fehler sind multiplikativ, das heißt relativ zum Wert.', 'ETS(M,A,M) is smoothing with a steady trend and a multiplicative season (Holt-Winters, multiplicative); the errors are multiplicative, that is relative to the value.');
    case 'MAdM': return L('ETS(M,Ad,M) ist die Glättung mit gedämpftem Trend und multiplikativer Saison; die Fehler sind multiplikativ, das heißt relativ zum Wert.', 'ETS(M,Ad,M) is smoothing with a damped trend and a multiplicative season; the errors are multiplicative, that is relative to the value.');
    default: return '';
  }
}
/** Hat die Prognose ein Band (Intervall)? Bei ETS mit multiplikativer Fehlerart nicht. */
export const hatBand = (a: Pick<PrognoseAntwort, 'u95' | 'o95'>): boolean => a.u95.length > 0 && a.o95.length > 0;
/** Name des Modells mit dem, was dazugehört (Konstante, Log). */
export function prognoseModellText(a: PrognoseAntwort): string {
  if (a.ets) return etsName(a.ets);
  if (a.art === 'glaettung') return glaettungName(a.glaettung ?? 'einfach');
  const k = a.drift ? L(' mit Drift', ' with drift') : a.konst ? L(' mit Mittelwert', ' with mean') : '';
  return `${prognoseModellName(a)}${k}${a.log ? L(', Log-Skala', ', log scale') : ''}`;
}
/** Name eines Parameters in der Oberfläche: `intercept` → Mittelwert, `drift` → Drift, `ar1` und Verwandte mit Erklärung. */
export function parameterName(n: string): string {
  if (n === 'intercept') return L('Mittelwert', 'Mean');
  if (n === 'drift') return L('Drift', 'Drift');
  const m = /^(ar|ma|sar|sma)(\d+)$/.exec(n);
  if (!m) return n;
  const k = m[2]!;
  return m[1] === 'ar' ? L(`AR ${k} (${n})`, `AR ${k} (${n})`) : m[1] === 'ma' ? L(`MA ${k} (${n})`, `MA ${k} (${n})`)
    : m[1] === 'sar' ? L(`saisonales AR ${k} (${n})`, `seasonal AR ${k} (${n})`) : L(`saisonales MA ${k} (${n})`, `seasonal MA ${k} (${n})`);
}
export function parameterNameGlaettung(n: 'alpha' | 'beta' | 'gamma' | 'phi'): string {
  return n === 'alpha' ? L('α (Niveau)', 'α (level)') : n === 'beta' ? L('β (Trend)', 'β (trend)') : n === 'phi' ? L('φ (Dämpfung)', 'φ (damping)') : L('γ (Saison)', 'γ (season)');
}

/* ---------------------------------------------------------------- Sätze zu Sperren, Wahl und Fehlern */
export function prognoseCodeSatz(code: PrognoseCode): string {
  switch (code) {
    case 'zu-viele-luecken': return L('In der Reihe fehlen mehr als 10 % der Werte. Dafür rechnet Statable keine Prognose und füllt nichts auf.', 'More than 10% of the values are missing in the series. Statable calculates no forecast for that and fills in nothing.');
    case 'luecken-nur-selbst': return L('In der Reihe fehlen Werte. Dann geht nur „ARIMA selbst wählen“: KPSS, STL und HoltWinters vertragen keine Lücken. Statable füllt nichts auf.', 'Values are missing in the series. Then only "Choose ARIMA yourself" works: KPSS, STL and HoltWinters cannot handle gaps. Statable fills in nothing.');
    case 'ungleich': return L('Die Abstände zwischen den Zeitpunkten sind ungleich. Eine Prognose braucht gleiche Abstände.', 'The intervals between the points in time are unequal. A forecast needs equal intervals.');
    case 'zu-kurz': return L('Für eine Prognose braucht die Reihe mindestens 20 Werte.', 'A forecast needs a series of at least 20 values.');
    case 'alle-gleich': return L('Alle Werte sind gleich; es gibt nichts, was sich fortschreiben ließe.', 'All values are equal; there is nothing to extend.');
    case 'auto-zu-lang': return d('Die Automatik rechnet bis 600 Werte. Wähle das Modell selbst oder nimm eine exponentielle Glättung.', 'Die Automatik rechnet bis 600 Werte. Wählen Sie das Modell selbst oder nehmen Sie eine exponentielle Glättung.', 'The automatic selection works up to 600 values. Choose the model yourself or use exponential smoothing.');
    case 'saison-nicht-moeglich': return L('Eine Saison geht nur mit einer Periode ab 2 (bei ARIMA bis 24) und, bei der Glättung, mit mindestens zwei Perioden plus einem Wert.', 'A season needs a period of 2 or more (up to 24 for ARIMA) and, for smoothing, at least two periods plus one value.');
    case 'mult-nicht-positiv': return L('Die multiplikative Glättung braucht Werte über 0.', 'Multiplicative smoothing needs values above 0.');
    case 'log-nicht-positiv': return L('Die Log-Skala braucht Werte über 0.', 'The log scale needs values above 0.');
    case 'wahl-ungueltig': return L('Die Wahl ist ungültig: p, q, P und Q gehen von 0 bis 5, d bis 2, D bis 1.', 'The choice is invalid: p, q, P and Q range from 0 to 5, d to 2, D to 1.');
    case 'horizont': return L('Der Horizont ist zu groß für diese Reihe.', 'The horizon is too large for this series.');
    case 'zu-kurz-saison': return L('Die Reihe ist für die Glättung mit Saison zu kurz (mindestens zwei Perioden plus ein Wert).', 'The series is too short for smoothing with a season (at least two periods plus one value).');
    case 'kein-modell': return L('Die Automatik fand kein Modell, das sich rechnen lässt.', 'The automatic selection found no model that can be estimated.');
    case 'nicht-konvergiert': return d('Das gewählte Modell ließ sich nicht schätzen (die Rechnung konvergiert nicht). Wähle eine einfachere Ordnung.', 'Das gewählte Modell ließ sich nicht schätzen (die Rechnung konvergiert nicht). Wählen Sie eine einfachere Ordnung.', 'The chosen model could not be estimated (the calculation does not converge). Choose a simpler order.');
    case 'r-fehler': return L('R meldete bei der Prognose einen Fehler.', 'R reported an error during the forecast.');
  }
}

/* ---------------------------------------------------------------- Leitplanken (Prüfliste) */
export type LeitCode = 'ets-grenze' | 'ets-kein-intervall' | 'ets-rand' | 'immer' | 'luecken' | 'auto' | 'ljung' | 'pruef-nicht-besser' | 'kein-pruefzeitraum' | 'pruef-luecke' | 'aehnlich' | 'kurz' | 'keine-saison' | 'nicht-tauglich' | 'log' | 'untergrenze' | 'holt-winters';
export interface Leitplanke { code: LeitCode; satz: string }
export interface LeitEin {
  wahl: PrognoseWahl; antwort: PrognoseAntwort; T: number; periode: number; alleWerteUeber0: boolean;
  /** Zahl der Lücken der Reihe (fehlt: keine) und ob im Prüfzeitraum oder in den Vergleichswerten Werte fehlen (`pruefzeitraumLuecke`) */
  luecken?: number; pruefLuecke?: boolean;
}
/** Fehlt im Prüfzeitraum (die letzten `pr` Plätze) oder in den Vergleichswerten der einfachen Regel (bei Periode über 1 der Wert eine Periode davor, sonst der letzte Wert davor) ein Wert? */
export function pruefzeitraumLuecke(y: (number | null)[], m: number, pr: number): boolean {
  const T = y.length;
  if (pr <= 0 || pr >= T) return false;
  const N = T - pr;
  for (let i = 0; i < pr; i++) {
    const naiv = m > 1 ? N - m + (i % m) : N - 1;
    if (y[N + i] === null || y[naiv] === null || y[naiv] === undefined) return true;
  }
  return false;
}

/** Die Leitplanken des Fachblatts, Abschnitt 4, in der Reihenfolge der Tabelle. Sachlich, ohne zu beruhigen. */
export function prognoseLeitplanken(e: LeitEin): Leitplanke[] {
  const { wahl, antwort: a, T } = e, aus: Leitplanke[] = [];
  const add = (code: LeitCode, satz: string) => aus.push({ code, satz });
  const arima = a.art === 'arima';
  add('immer', L('Eine Prognose schreibt die Vergangenheit fort. Sie gilt nur, wenn die Bedingungen gleich bleiben.', 'A forecast extends the past. It holds only if the conditions stay the same.'));
  const k = e.luecken ?? 0;
  if (k > 0) add('luecken', Lp(k, `Die Reihe hat ${k} Lücke von ${T} Zeitpunkten. Das Modell rechnet über die Lücke hinweg und füllt nichts auf. Fehlen die Werte nicht zufällig, kann das Ergebnis verzerrt sein. Ljung-Box ist bei Lücken eine Näherung aus den vorhandenen Paaren.`, `Die Reihe hat ${k} Lücken von ${T} Zeitpunkten. Das Modell rechnet über die Lücken hinweg und füllt nichts auf. Fehlen die Werte nicht zufällig, kann das Ergebnis verzerrt sein. Ljung-Box ist bei Lücken eine Näherung aus den vorhandenen Paaren.`,
    `The series has ${k} gap in ${T} points in time. The model calculates across the gap and fills in nothing. If the values are not missing at random, the result can be biased. With gaps, Ljung-Box is an approximation from the available pairs.`, `The series has ${k} gaps in ${T} points in time. The model calculates across the gaps and fills in nothing. If the values are not missing at random, the result can be biased. With gaps, Ljung-Box is an approximation from the available pairs.`));
  if (wahl.art === 'auto') add('auto', L('Das Modell ist ein Vorschlag nach AICc. Der kleinste Wert heißt nicht, dass das Modell richtig ist.', 'The model is a suggestion based on the AICc. The smallest value does not mean that the model is right.'));
  if (wahl.art === 'ets-auto') add('ets-grenze', d('Die Automatik ist ein Vorschlag. Der Optimierer kann bei Saison ein besseres Modell verpassen; vergleiche Modelle mit ähnlichem AICc.', 'Die Automatik ist ein Vorschlag. Der Optimierer kann bei Saison ein besseres Modell verpassen; vergleichen Sie Modelle mit ähnlichem AICc.', 'The automatic selection is a suggestion. With a season the optimizer can miss a better model; compare models with a similar AICc.'));
  if (a.ljung && a.ljung.p < 0.05) add('ljung', L(`Die Residuen hängen noch zusammen (Ljung-Box, p ${pWert(a.ljung.p)}): Das Modell erfasst nicht das ganze Muster, und die Intervalle sind unzuverlässig.`, `The residuals are still related (Ljung-Box, p ${pWert(a.ljung.p)}): the model does not capture the whole pattern, and the intervals are unreliable.`));
  if (a.pruef) {
    if (a.pruef.rmse >= a.pruef.rmseNaiv) add('pruef-nicht-besser', L(`Im Prüfzeitraum (${a.pruef.pr} Werte) war das Modell nicht besser als die einfache Regel (RMSE ${komma(a.pruef.rmse, 2)} gegen ${komma(a.pruef.rmseNaiv, 2)}). Die Prognose ist dann kein Gewinn.`, `In the test period (${a.pruef.pr} values) the model was not better than the simple rule (RMSE ${komma(a.pruef.rmse, 2)} against ${komma(a.pruef.rmseNaiv, 2)}). The forecast is then no gain.`));
  } else if (e.pruefLuecke) add('pruef-luecke', L('Im Prüfzeitraum oder in den Vergleichswerten fehlen Werte; die Güte der Prognose ist nicht geprüft.', 'Values are missing in the test period or in the comparison values; the quality of the forecast has not been checked.'));
  else add('kein-pruefzeitraum', L('Die Reihe ist für einen Prüfzeitraum zu kurz; die Güte der Prognose ist nicht geprüft.', 'The series is too short for a test period; the quality of the forecast has not been checked.'));
  if (wahl.art === 'auto' && a.wahl && a.wahl.liste.length >= 2) {
    const delta = a.wahl.liste[1]!.aicc - a.wahl.liste[0]!.aicc;
    if (delta < 2) add('aehnlich', d(`Mehrere Modelle sind etwa gleich gut (ΔAICc = ${komma(delta, 2)}); vergleiche ihre Prognosen.`, `Mehrere Modelle sind etwa gleich gut (ΔAICc = ${komma(delta, 2)}); vergleichen Sie ihre Prognosen.`, `Several models are about equally good (ΔAICc = ${komma(delta, 2)}); compare their forecasts.`));
  }
  if (arima && T < PROG_BOX_JENKINS) add('kurz', L(`Für ARIMA sind 50 Werte eine übliche Untergrenze (Box & Jenkins); die Reihe hat ${T}. Bei dieser Länge ist die Modellwahl unsicher.`, `For ARIMA, 50 values are a common lower limit (Box & Jenkins); the series has ${T}. At this length the choice of model is uncertain.`));
  if (wahl.art === 'auto' || wahl.art === 'ets-auto') {
    if (e.periode > 24) add('keine-saison', L(`Die Periode ist ${e.periode}, größer als 24: Die Automatik berücksichtigt keine Saison.`, `The period is ${e.periode}, larger than 24: the automatic selection does not take a season into account.`));
    else if (e.periode > 1 && T < 3 * e.periode) add('keine-saison', L('Die Reihe hat weniger als 3 volle Perioden: Die Automatik berücksichtigt keine Saison.', 'The series has fewer than 3 full periods: the automatic selection does not take a season into account.'));
  }
  if (arima && wahl.art === 'arima' && !a.tauglich) add('nicht-tauglich', L('Das Modell liegt nahe an der Grenze zur Instabilität; den AICc-Vergleich nicht verwenden.', 'The model is close to the limit of instability; do not use the AICc comparison.'));
  if (a.ets && !hatBand(a)) add('ets-kein-intervall', L('Für dieses Modell rechnet Statable kein Intervall. Wer eines braucht, nimmt ARIMA oder Holt-Winters.', 'For this model Statable calculates no interval. Anyone who needs one uses ARIMA or Holt-Winters.'));
  if (a.ets) {
    const phiRand = a.phi != null && (a.phi >= 0.98 - 1e-4 || a.phi <= 0.8 + 1e-4), alphaRand = a.alpha != null && a.alpha >= 0.999;
    if (phiRand && alphaRand) add('ets-rand', L(`Die Dämpfung φ (${ohneNull(a.phi!, 2)}) und α (${ohneNull(a.alpha!, 4)}) liegen an der Grenze des erlaubten Bereichs: Die Grenze bestimmt das Ergebnis, nicht allein die Daten.`, `The damping φ (${ohneNull(a.phi!, 2)}) and α (${ohneNull(a.alpha!, 4)}) lie at the limit of the allowed range: the limit determines the result, not the data alone.`));
    else if (phiRand) add('ets-rand', L(`Die Dämpfung φ liegt mit ${ohneNull(a.phi!, 2)} an der Grenze des erlaubten Bereichs (${ohneNull(0.8, 2)} bis ${ohneNull(0.98, 2)}): Die Grenze bestimmt das Ergebnis, nicht allein die Daten.`, `The damping φ lies at ${ohneNull(a.phi!, 2)} at the limit of the allowed range (${ohneNull(0.8, 2)} to ${ohneNull(0.98, 2)}): the limit determines the result, not the data alone.`));
    else if (alphaRand) add('ets-rand', L(`α liegt mit ${ohneNull(a.alpha!, 4)} nahe bei 1: Das Modell folgt fast nur dem letzten Wert, und die obere Grenze von α bestimmt das Ergebnis.`, `α is ${ohneNull(a.alpha!, 4)}, close to 1: the model follows almost only the last value, and the upper limit of α determines the result.`));
  }
  if (arima && a.log) add('log', L('Prognose und Grenzen sind von der Log-Skala zurückgerechnet: Die Prognose ist ein Median, kein Mittelwert.', 'Forecast and limits are back-transformed from the log scale: the forecast is a median, not a mean.'));
  if (e.alleWerteUeber0 && [...a.u80, ...a.u95].some(v => v < 0)) add('untergrenze', L('Die untere Grenze ist negativ, obwohl alle Werte positiv sind; das Modell kennt die Untergrenze 0 nicht. Log-Skala prüfen.', 'The lower limit is negative although all values are positive; the model does not know the lower bound of 0. Check the log scale.'));
  if (a.art === 'glaettung' && !a.ets) add('holt-winters', L('Die Intervalle von HoltWinters sind eine Näherung, vor allem bei multiplikativer Saison.', 'The intervals of HoltWinters are an approximation, especially with a multiplicative season.'));
  return aus;
}

/** Ljung-Box-Satz zu den Residuen: Kennzahlen und Bewertung (Freiheitsgrade = Verzögerungen − geschätzte Parameter). */
export function prognoseLjungSatz(l: PrognoseLjung): string {
  const df = l.h - l.fitdf, q = `Q(${l.h}) = ${komma(l.q, 2)}, df = ${komma(df, 0)}, p ${pWert(l.p)}`;
  return l.p < 0.05
    ? L(`Ljung-Box für die Residuen: ${q}. Die Residuen hängen noch zusammen.`, `Ljung-Box for the residuals: ${q}. The residuals are still related.`)
    : L(`Ljung-Box für die Residuen: ${q}. Es zeigt sich keine deutliche Abhängigkeit der Residuen.`, `Ljung-Box for the residuals: ${q}. No clear dependence of the residuals shows.`);
}
export const prognosePruefSatz = (p: PrognosePruef): string =>
  L(`Prüfzeitraum: Die letzten ${p.pr} Werte wurden zurückgehalten und dasselbe Modell wurde mit den früheren Werten neu geschätzt. Dann wurden diese ${p.pr} Werte vorhergesagt und mit der Prognose der einfachen Regel verglichen (letzter Wert, bei Saison der Wert eine Periode davor).`,
    `Test period: the last ${p.pr} values were held back and the same model was estimated anew with the earlier values. These ${p.pr} values were then predicted and compared with the forecast of the simple rule (last value, with a season the value one period earlier).`);

/** Stellen für die Anzeige der Prognose: so viele, dass die Streuung der Reihe noch aufgelöst wird (Streuung ≥ 100: ganze Zahlen). */
export function prognoseStellen(y: (number | null)[]): number {
  const w = werteVon({ raster: 'monatlich', periode: 1, y });
  if (w.length < 2) return 2;
  const m = w.reduce((s, v) => s + v, 0) / w.length, sd = Math.sqrt(w.reduce((s, v) => s + (v - m) ** 2, 0) / (w.length - 1));
  return sd > 0 ? Math.min(4, Math.max(0, 2 - Math.floor(Math.log10(sd)))) : 2;
}

/* ---------------------------------------------------------------- Satz zur Prognose (Haupt- und APA-Zeile) */
export interface PrognoseSatzEin { name: string; zeiten: string[]; stellen: number; automatik: boolean }
export function prognoseHauptsatz(p: PrognoseE, s: PrognoseSatzEin): string {
  const a = p.antwort, n = a.mittel.length, f = (v: number) => komma(v, s.stellen);
  const modell = prognoseModellText(a);
  const kopf0 = p.wahl.art === 'auto' || p.wahl.art === 'ets-auto'
    ? L(`Die Automatik wählte für ${s.name} nach dem kleinsten AICc das Modell ${modell}.`, `The automatic selection chose the model ${modell} for ${s.name} by the smallest AICc.`)
    : L(`Für ${s.name} wurde das Modell ${modell} gerechnet.`, `The model ${modell} was fitted for ${s.name}.`);
  const kopf = a.ets ? `${kopf0} ${etsSatz(a.ets)}` : kopf0;
  const band = hatBand(a);
  const von = s.zeiten[0] ?? '', bis = s.zeiten[n - 1] ?? '';
  const erste = `${von}: ${f(a.mittel[0]!)}${band ? ` (${L('95-%-Prognoseintervall', '95% prediction interval')} [${f(a.u95[0]!)}; ${f(a.o95[0]!)}])` : ''}`;
  if (n === 1) return `${kopf} ${L(`Prognose für ${erste}.`, `Forecast for ${erste}.`)}`;
  const letzte = `${bis}: ${f(a.mittel[n - 1]!)}${band ? ` (${L('95-%-Prognoseintervall', '95% prediction interval')} [${f(a.u95[n - 1]!)}; ${f(a.o95[n - 1]!)}])` : ''}`;
  return `${kopf} ${L(`Die Prognose reicht über ${n} Zeitpunkte. Zuerst ${erste}, zuletzt ${letzte}.`, `The forecast covers ${n} points in time. First ${erste}, last ${letzte}.`)}`;
}
export function prognoseApa(p: PrognoseE): string {
  const a = p.antwort, t: string[] = [prognoseModellText(a)];
  if (a.aicc !== null) t.push(`AICc = ${komma(a.aicc, 2)}`);
  if (a.rmse !== null) t.push(`RMSE = ${komma(a.rmse, 2)}`);
  if (a.ljung) t.push(`Ljung-Box Q(${a.ljung.h}) = ${komma(a.ljung.q, 2)}, df = ${komma(a.ljung.h - a.ljung.fitdf, 0)}, p ${pWert(a.ljung.p)}`);
  if (a.pruef) t.push(`${L('Prüfzeitraum', 'test period')} (${a.pruef.pr}): RMSE ${komma(a.pruef.rmse, 2)} ${L('gegen', 'vs.')} ${komma(a.pruef.rmseNaiv, 2)} (${L('einfache Regel', 'simple rule')})`);
  return t.join(', ');
}

/* ---------------------------------------------------------------- R-Text zum Ansehen (wird nie ausgeführt) */
/** Der R-Aufruf zum Nachrechnen: `arima` bzw. `HoltWinters` mit `predict`. Spaltenname nur über rAnzeigeName, Zahlen über rAnzeigeZahl. */
export function prognoseRCode(p: PrognoseE, spalte: string, T: number, luecken = 0): string {
  const a = p.antwort, m = a.periode, h = p.wahl.h;
  const hinweis = luecken > 0 ? `\n# ${L('y muss an den fehlenden Zeitpunkten NA enthalten; fehlende Datumszeilen stehen sonst gar nicht in der Tabelle, und arima würde die Abstände falsch nehmen.', 'y must contain NA at the missing points in time; missing date rows would otherwise not be in the table at all, and arima would take the intervals wrongly.')}` : '';
  const kopf = `# ${L('daten: die Tabelle in R', 'daten: your table in R')}${hinweis}\ny <- ts(daten$${rAnzeigeName(spalte)}, frequency = ${rAnzeigeZahl(m)})`;
  if (a.ets) {
    const e = a.ets, modell = `${e.slice(0, 2).replace('Ad', 'A')}${e.slice(-1)}`, gedaempft = e.includes('Ad');
    return `${kopf}\n# ${L('Statable rechnet das ETS-Modell selbst (optim, nur Basis-R). Gleichwertig in R mit dem Paket forecast; beim Optimum können die Parameter leicht abweichen.', 'Statable calculates the ETS model itself (optim, base R only). Equivalent in R with the forecast package; the parameters can differ slightly at the optimum.')}\nfit <- ets(y, model = '${modell}', damped = ${gedaempft ? 'TRUE' : 'FALSE'})\nforecast(fit, h = ${rAnzeigeZahl(h)}, level = 95)`;
  }
  if (a.art === 'glaettung') {
    const g = a.glaettung ?? 'einfach';
    const aufruf = g === 'einfach' ? 'HoltWinters(y, beta = FALSE, gamma = FALSE)' : g === 'holt' ? 'HoltWinters(y, gamma = FALSE)' : `HoltWinters(y, seasonal = '${g === 'add' ? 'additive' : 'multiplicative'}')`;
    return `${kopf}\nfit <- ${aufruf}\npredict(fit, n.ahead = ${rAnzeigeZahl(h)}, prediction.interval = TRUE, level = 0.95)`;
  }
  const saison = a.P + a.D + a.Q > 0;
  const reihe = a.log ? 'log(y)' : 'y';
  const xreg = a.drift ? `, xreg = seq_along(y)` : '';
  const ordnung = `order = c(${rAnzeigeZahl(a.p)}, ${rAnzeigeZahl(a.d)}, ${rAnzeigeZahl(a.q)})${saison ? `, seasonal = list(order = c(${rAnzeigeZahl(a.P)}, ${rAnzeigeZahl(a.D)}, ${rAnzeigeZahl(a.Q)}), period = ${rAnzeigeZahl(m)})` : ''}`;
  const mittel = a.d + a.D === 0 ? `, include.mean = ${a.konst ? 'TRUE' : 'FALSE'}` : '';
  const vor = a.drift ? `predict(fit, n.ahead = ${rAnzeigeZahl(h)}, newxreg = ${rAnzeigeZahl(T)} + seq_len(${rAnzeigeZahl(h)}))` : `predict(fit, n.ahead = ${rAnzeigeZahl(h)})`;
  const rueck = a.log ? `\nexp(p$pred)   # ${L('Median', 'median')}\nexp(p$pred + qnorm(0.975) * p$se)   # ${L('obere 95-%-Grenze', 'upper 95% limit')}` : `\np$pred\np$pred + qnorm(0.975) * p$se   # ${L('obere 95-%-Grenze', 'upper 95% limit')}`;
  return `${kopf}\nfit <- arima(${reihe}, ${ordnung}${mittel}${xreg})\np <- ${vor}${rueck}`;
}
