/**
 * Später S-F2, Teil D: AFT-Modell (Zeitverhältnis, survival::survreg) und Cox mit Kennung (cluster() oder Gamma-Frailty, survival::coxph) in der Karte „Wie lange dauert es bis zu einem Ereignis?“.
 * Typen, Daten für R, Lesen der R-Antwort, Fehlertexte. Die Rechnung steht in engine/statable-ueberleben.R (`sp_aft`, `sp_aft_aic`, `sp_frailty`), der Aufruf in rverfahren.svelte.ts. Sätze und Tabellen: aftsaetze.ts.
 * Fachblatt: docs/fachblaetter/SPAETER-F2-ERGAENZUNGEN.md Abschnitt D und „Entscheidungen Opus (19.10.)“ 9 und 10; Tests: engine/spaeter-f2.webr.test.ts.
 *
 * Entscheidungen: AFT mit Voreinstellung Weibull, AIC-Tabelle aller vier Verteilungen, Vorzeichen-Satz Pflicht; Weibull-HR-Intervall nur als Näherung (σ fest).
 * Kennung: Voreinstellung cluster (robuste Standardfehler, Koeffizient unverändert), Gamma-Frailty als „fortgeschritten“ (bedingte Wirkung, Varianz, Likelihood-Quotienten-Test mit halbiertem p). Kein coxme.
 * Die Kennung geht als Ganzzahl-Code 1 … G nach R, nie als Text. Weniger als 2 Gruppen mit mindestens 2 Zeilen: gesperrt; unter 20 Gruppen: Hinweis.
 */
import type { Spalte } from './verzeichnis';
import type { RSpalte } from '../engine/webr';
import type { Wert } from './eingabe';
import { L } from './sitzung.svelte';
import { coxDaten, type CoxDaten, type CoxPraed } from './cox';
import { rIds, rQ, rWahl, rAnzeigeName, rAnzeigeText } from '../engine/rsicher';

const rn = rAnzeigeName;
const rq = rAnzeigeText;

export const AFT_VERTEILUNGEN = ['weibull', 'exponential', 'lognormal', 'loglogistic'] as const;
export type AftVerteilung = (typeof AFT_VERTEILUNGEN)[number];
export type FrailtyArt = 'cluster' | 'gamma';
export type FrailtyBindung = 'efron' | 'breslow';
/** Weniger Gruppen als das: Hinweis (Vorschlag ohne Quelle, Fachblatt D.2). */
export const FRAILTY_GRUPPEN_WENIG = 20;

/** Name der Verteilung (immer mit dem Wort „Modell“ im Satz zu nennen). */
export const verteilungName = (d: AftVerteilung): string => (d === 'weibull' ? 'Weibull' : d === 'exponential' ? L('exponentiell', 'exponential') : d === 'lognormal' ? L('log-normal', 'log-normal') : L('log-logistisch', 'log-logistic'));

/** Die Verteilung als Wortgruppe im Satz (Hauptwort, daher kein „log-logistisch-Modell“): „Weibull-Verteilung“, „Exponentialverteilung“, „log-normale Verteilung“, „log-logistische Verteilung“. */
export const verteilungWort = (d: AftVerteilung): string => (d === 'weibull' ? L('Weibull-Verteilung', 'Weibull distribution') : d === 'exponential' ? L('Exponentialverteilung', 'exponential distribution') : d === 'lognormal' ? L('log-normale Verteilung', 'log-normal distribution') : L('log-logistische Verteilung', 'log-logistic distribution'));
const gross = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export const verteilungWortGross = (d: AftVerteilung): string => gross(verteilungWort(d));

/* ------------------------------------------------------------ Typen der Ergebnisse */
/** Ein Koeffizient des AFT-Modells. `pIdx` = −1 beim Achsenabschnitt; `zv` = exp(b) (Zeitverhältnis), Wald-Intervall [kiU, kiO]. */
export interface AftKoef { pIdx: number; achsenabschnitt: boolean; stufe: string; b: number; se: number; z: number; p: number; zv: number; kiU: number; kiO: number }
export interface AftHr { pIdx: number; stufe: string; hr: number; kiU: number; kiO: number }
export interface AftVergleich { dist: AftVerteilung; aic: number; loglik: number }
export interface AftErgebnis {
  art: 'aft'; dist: AftVerteilung; praed: CoxPraed[];
  n: number; ausgelassen: number; ereignisse: number; npar: number;
  koef: AftKoef[]; skala: number; loglik: number; loglik0: number; aic: number;
  /** Nur beim Weibull-Modell: dasselbe als Hazard Ratio, Intervall mit σ fest (Näherung) */
  hrWeibull: AftHr[];
  /** AIC der vier Verteilungen (Reihenfolge Weibull, exponentiell, log-normal, log-logistisch) */
  vergleich: AftVergleich[];
  trennung: boolean; warnungen: string[];
}
export interface FrailtyKoef { pIdx: number; stufe: string; b: number; se: number; seNaiv: number | null; z: number; p: number; hr: number; kiU: number; kiO: number }
export interface FrailtyErgebnis {
  art: 'frailty'; modell: FrailtyArt; ties: FrailtyBindung; praed: CoxPraed[]; kennung: string;
  n: number; ausgelassen: number; ereignisse: number; gruppen: number; npar: number; wenigeGruppen: boolean;
  koef: FrailtyKoef[];
  /** Nur Gamma-Frailty: Varianz θ, korrigierte Log-Likelihood, Log-Likelihood bei θ = 0, Likelihood-Quotient und halbierter p-Wert, Rand des Parameterraums */
  varianz: number | null; cLoglik: number | null; loglik0: number | null; lrChi2: number | null; pHalbiert: number | null; rand: boolean;
  warnungen: string[];
}

/* ------------------------------------------------------------ Daten für R */
export interface FrailtyDaten extends CoxDaten { kennung: string }

/** Ganzzahl-Code 1 … G je verschiedener Kennung (in der Reihenfolge des ersten Auftretens); leere Kennung = fehlend. Text und Zahl bleiben verschieden („1“ ≠ 1 gibt es in einer Spalte nicht). */
export function kennungsCodes(spalte: string, zeilen: Wert[][], spalten: Spalte[]): (number | null)[] {
  const i = spalten.findIndex(x => x.name === spalte);
  const code = new Map<string, number>();
  return zeilen.map(z => {
    const v = i >= 0 ? z[i] : null;
    if (v === null || v === undefined || v === '') return null;
    const k = typeof v === 'number' ? `n${v}` : `t${String(v).trimEnd()}`;
    let c = code.get(k);
    if (c === undefined) { c = code.size + 1; code.set(k, c); }
    return c;
  });
}
export function aftDaten(zeit: string, ereignis: string, ereignisWert: string | number | null, praed: string[], zeilen: Wert[][], spalten: Spalte[]): CoxDaten {
  return coxDaten(zeit, ereignis, ereignisWert, praed, zeilen, spalten);
}
export function frailtyDaten(zeit: string, ereignis: string, ereignisWert: string | number | null, kennung: string, praed: string[], zeilen: Wert[][], spalten: Spalte[]): FrailtyDaten {
  const dt = coxDaten(zeit, ereignis, ereignisWert, praed, zeilen, spalten);
  const sp: RSpalte = { name: 'kennung', art: 'zahl', werte: kennungsCodes(kennung, zeilen, spalten) };
  return { ...dt, spalten: [...dt.spalten, sp], kennung };
}
/** Gruppen der Kennung unter den Zeilen mit gültiger Zeit, Ereignis und Prädiktoren, und wie viele davon mindestens zwei Zeilen haben (Vorprüfung in der Prüfliste; R prüft noch einmal). */
export function kennungsGruppen(dt: FrailtyDaten): { gruppen: number; mitZweiZeilen: number } {
  const col = (n: string) => dt.spalten.find(s => s.name === n)!.werte;
  const spalten = dt.spalten.map(s => s.werte);
  const k = col('kennung');
  const zaehl = new Map<number, number>();
  for (let i = 0; i < k.length; i++) {
    if (k[i] === null || spalten.some(w => w[i] === null || w[i] === undefined)) continue;
    zaehl.set(k[i] as number, (zaehl.get(k[i] as number) ?? 0) + 1);
  }
  return { gruppen: zaehl.size, mitZweiZeilen: [...zaehl.values()].filter(c => c >= 2).length };
}

/* ------------------------------------------------------------ R-Aufruf */
const rName = (k: number) => `p${String(k + 1).padStart(2, '0')}`;
const faktorNamen = (dt: Pick<CoxDaten, 'praed'>) => dt.praed.flatMap((p, k) => (p.art === 'faktor' ? [rName(k)] : []));
const praedNamen = (dt: Pick<CoxDaten, 'praed'>) => dt.praed.map((_, k) => rName(k));
/** Aufruf von `sp_aft`; im Code stehen nur feste Wörter und Bezeichner (zeit, ereignis, p01 …). */
export function aftAufruf(dt: Pick<CoxDaten, 'praed'>, dist: AftVerteilung): string {
  return `tryCatch(sp_aft(d, ${rQ('zeit')}, ${rQ('ereignis')}, ${rIds(praedNamen(dt))}, ${rIds(faktorNamen(dt))}, ${rWahl(dist, AFT_VERTEILUNGEN)}), error = function(e) list(fehler = conditionMessage(e)))`;
}
export function aftAicAufruf(dt: Pick<CoxDaten, 'praed'>): string {
  return `tryCatch(sp_aft_aic(d, ${rQ('zeit')}, ${rQ('ereignis')}, ${rIds(praedNamen(dt))}, ${rIds(faktorNamen(dt))}), error = function(e) list(fehler = conditionMessage(e)))`;
}
export function frailtyAufruf(dt: Pick<CoxDaten, 'praed'>, art: FrailtyArt, ties: FrailtyBindung): string {
  return `tryCatch(sp_frailty(d, ${rQ('zeit')}, ${rQ('ereignis')}, ${rQ('kennung')}, ${rIds(praedNamen(dt))}, ${rIds(faktorNamen(dt))}, ${rWahl(art, ['cluster', 'gamma'] as const)}, ${rWahl(ties, ['efron', 'breslow'] as const)}), error = function(e) list(fehler = conditionMessage(e)))`;
}

/* ------------------------------------------------------------ R-Antwort lesen */
const arr = <T>(x: unknown): T[] => (x == null ? [] : Array.isArray(x) ? (x as T[]) : [x as T]);
const num = (x: unknown): number => { const v = arr<number | null>(x)[0]; return typeof v === 'number' && Number.isFinite(v) ? v : NaN; };
const numOderNull = (x: unknown): number | null => { const v = num(x); return Number.isFinite(v) ? v : null; };
const wahr = (x: unknown) => arr<boolean>(x)[0] === true;
const text = (x: unknown): string => String(arr<string>(x)[0] ?? '');
const liste = (x: unknown): Record<string, unknown>[] => arr<Record<string, unknown>>(x).filter(z => z && typeof z === 'object' && !('type' in z && Object.keys(z).length === 1));
const verteilung = (x: unknown): AftVerteilung => { const t = text(x); return (AFT_VERTEILUNGEN as readonly string[]).includes(t) ? (t as AftVerteilung) : 'weibull'; };
function zuordnen(name: string, praed: CoxPraed[]): { pIdx: number; stufe: string } {
  const m = /^p(\d\d)(.*)$/s.exec(name);
  if (!m) return { pIdx: -1, stufe: '' };
  const pIdx = Number(m[1]) - 1;
  return { pIdx, stufe: praed[pIdx]?.art === 'faktor' ? m[2]! : '' };
}
export function aftLesen(r: Record<string, unknown>, dt: Pick<CoxDaten, 'praed'>, vergleich: AftVergleich[] = []): AftErgebnis {
  return {
    art: 'aft', dist: verteilung(r.dist), praed: dt.praed,
    n: num(r.n), ausgelassen: num(r.ausgelassen), ereignisse: num(r.ereignisse), npar: num(r.npar),
    koef: liste(r.koef).map(z => { const nm = text(z.name), { pIdx, stufe } = zuordnen(nm, dt.praed); return { pIdx, achsenabschnitt: nm === 'achsenabschnitt', stufe, b: num(z.b), se: num(z.se), z: num(z.z), p: num(z.p), zv: num(z.zeitverhaeltnis), kiU: num(z.ki_u), kiO: num(z.ki_o) }; }),
    skala: num(r.skala), loglik: num(r.loglik), loglik0: num(r.loglik0), aic: num(r.aic),
    hrWeibull: liste(r.hr_weibull).map(z => { const { pIdx, stufe } = zuordnen(text(z.name), dt.praed); return { pIdx, stufe, hr: num(z.hr), kiU: num(z.ki_u), kiO: num(z.ki_o) }; }),
    vergleich, trennung: wahr(r.trennung), warnungen: arr<string>(r.warnungen).map(String)
  };
}
export function aftVergleichLesen(r: Record<string, unknown>): AftVergleich[] {
  return liste(r.vergleich).map(z => ({ dist: verteilung(z.dist), aic: num(z.aic), loglik: num(z.loglik) })).filter(v => Number.isFinite(v.aic));
}
export function frailtyLesen(r: Record<string, unknown>, dt: Pick<FrailtyDaten, 'praed' | 'kennung'>): FrailtyErgebnis {
  const gamma = text(r.art) === 'gamma';
  return {
    art: 'frailty', modell: gamma ? 'gamma' : 'cluster', ties: text(r.ties) === 'breslow' ? 'breslow' : 'efron', praed: dt.praed, kennung: dt.kennung,
    n: num(r.n), ausgelassen: num(r.ausgelassen), ereignisse: num(r.ereignisse), gruppen: num(r.gruppen), npar: num(r.npar), wenigeGruppen: wahr(r.wenige_gruppen),
    koef: liste(r.koef).map(z => { const { pIdx, stufe } = zuordnen(text(z.name), dt.praed); return { pIdx, stufe, b: num(z.b), se: num(z.se), seNaiv: numOderNull(z.se_naiv), z: num(z.z), p: num(z.p), hr: num(z.hr), kiU: num(z.ki_u), kiO: num(z.ki_o) }; }),
    varianz: gamma ? numOderNull(r.varianz) : null, cLoglik: gamma ? numOderNull(r.c_loglik) : null, loglik0: gamma ? numOderNull(r.loglik0) : null,
    lrChi2: gamma ? numOderNull(r.lr_chi2) : null, pHalbiert: gamma ? numOderNull(r.p_halbiert) : null, rand: gamma && wahr(r.rand),
    warnungen: arr<string>(r.warnungen).map(String)
  };
}

/* ------------------------------------------------------------ R-Fehlermeldungen in Sätze */
/** Die Kurztexte aus statable-ueberleben.R in Sätze; `null`, wenn die Meldung nicht von diesen Modellen stammt. */
export function aftFehlerText(roh: string): string | null {
  const m = roh.toLowerCase();
  if (/greater than zero/.test(m)) return L('Das AFT-Modell rechnet mit dem Logarithmus der Zeit und braucht Zeiten größer als 0. In der Zeitspalte steht mindestens eine 0. (Die Cox-Regression kommt mit 0 zurecht.)', 'The AFT model works with the logarithm of the time and needs times greater than 0. The time column contains at least one 0. (The Cox regression can handle 0.)');
  if (/at least two groups with two rows/.test(m)) return L('Für die Kennung braucht es mindestens zwei Gruppen mit je mindestens zwei Zeilen. Sonst gibt es keine Zeilen, die zusammengehören und sich vergleichen ließen.', 'The identifier needs at least two groups with at least two rows each. Otherwise there are no rows that belong together and could be compared.');
  if (/unknown distribution|unknown method|unknown tie method/.test(m)) return L('Diese Wahl gibt es nicht.', 'This choice does not exist.');
  return null;
}

/* ------------------------------------------------------------ R-Aufruf zum Nachrechnen („Befehl“) */
/** Der Aufruf in R zum Ansehen („Befehl“, Bericht): wird nie ausgeführt; Namen aus den Daten nur über rAnzeigeName. */
// Nur zum Anzeigen (wird nie ausgeführt): Namen und Texte aus den Daten werden maskiert (engine/rsicher.ts).
export function aftRCode(e: { zeit: string; ereignis: string; ereignisWert: string | null; praed: string[]; dist: AftVerteilung; faktoren?: Record<string, string[]> }, T2: (de: string, en: string) => string): string {
  const gruppen = Object.entries(e.faktoren ?? {}).map(([n, st]) => `daten$${rn(n)} <- factor(daten$${rn(n)}, levels = c(${st.map(rq).join(', ')}))   # ${T2('erste Stufe = Vergleichsgruppe', 'first level = reference group')}`);
  const status = e.ereignisWert === null ? '1' : `as.numeric(daten$${rn(e.ereignis)} == ${rq(e.ereignisWert)})`;
  return [
    T2('# Der gleiche Aufruf in R (Paket survival), AFT-Modell:', '# The same call in R (package survival), AFT model:'), 'library(survival)', ...gruppen,
    `daten$ereignis01 <- ${status}   # ${T2('1 = Ereignis, 0 = zensiert', '1 = event, 0 = censored')}`,
    `m <- survreg(Surv(${rn(e.zeit)}, ereignis01) ~ ${e.praed.map(rn).join(' + ')}, data = daten, dist = '${e.dist}')   # ${T2('Zeit muss größer als 0 sein; exp(Koeffizient) = Zeitverhältnis', 'time must be greater than 0; exp(coefficient) = time ratio')}`,
    `summary(m)   # ${T2('Statable nimmt für p und KI den Wald-Test (qnorm(.975)); AIC(m) für den Vergleich der Verteilungen', 'Statable uses the Wald test (qnorm(.975)) for p and CI; AIC(m) for comparing distributions')}`
  ].join('\n');
}
export function frailtyRCode(e: { zeit: string; ereignis: string; ereignisWert: string | null; kennung: string; praed: string[]; art: 'cluster' | 'gamma'; ties: 'efron' | 'breslow'; faktoren?: Record<string, string[]> }, T2: (de: string, en: string) => string): string {
  const gruppen = Object.entries(e.faktoren ?? {}).map(([n, st]) => `daten$${rn(n)} <- factor(daten$${rn(n)}, levels = c(${st.map(rq).join(', ')}))   # ${T2('erste Stufe = Vergleichsgruppe', 'first level = reference group')}`);
  const status = e.ereignisWert === null ? '1' : `as.numeric(daten$${rn(e.ereignis)} == ${rq(e.ereignisWert)})`;
  const term = e.art === 'cluster' ? `cluster(${rn(e.kennung)})` : `frailty(${rn(e.kennung)}, distribution = 'gamma')`;
  return [
    e.art === 'cluster' ? T2('# Der gleiche Aufruf in R (Paket survival), Cox-Regression mit robusten Standardfehlern je Kennung:', '# The same call in R (package survival), Cox regression with robust standard errors per identifier:')
      : T2('# Der gleiche Aufruf in R (Paket survival), Cox-Regression mit Gamma-Frailty je Kennung:', '# The same call in R (package survival), Cox regression with a gamma frailty per identifier:'), 'library(survival)', ...gruppen,
    `daten$ereignis01 <- ${status}   # ${T2('1 = Ereignis, 0 = zensiert', '1 = event, 0 = censored')}`,
    `m <- coxph(Surv(${rn(e.zeit)}, ereignis01) ~ ${e.praed.map(rn).join(' + ')} + ${term}, data = daten, ties = '${e.ties}')`,
    `summary(m)   # ${e.art === 'cluster' ? T2('B wie ohne cluster(); „robust se“ ist der Standardfehler, den Statable nimmt', 'B as without cluster(); "robust se" is the standard error Statable uses') : T2('B ist die bedingte Wirkung; die Varianz steht in m$history', 'B is the conditional effect; the variance is in m$history')}`
  ].join('\n');
}
