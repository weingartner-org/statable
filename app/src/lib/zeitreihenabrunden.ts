/**
 * Zeitreihen abrunden (Fachblatt docs/fachblaetter/ZEITREIHEN-ABRUNDEN.md, Abschnitt 2 und 3): Differenzen prüfen (bei „ARIMA selbst wählen“) und das Periodogramm.
 * Gerechnet wird in R (engine/statable-prognose.R: `sp_prog_differenzen`, `sp_periodogramm`, nur stats); hier stehen der Aufruf, das Lesen der Antwort, Sperren, Sätze, Tabellen und der R-Text zum Ansehen.
 * Gespeichert wird die Antwort am Ergebnis des Blatts (`ZeitreiheE.differenzen`, `ZeitreiheE.periodogramm`), damit Bericht und Export ohne R stimmen.
 * SICHERHEIT: Der Aufruf enthält nur feste Wörter und Zahlen (rGanz, rBool); die Reihe geht als Spalte `y` der Tabelle `d` hinein, nie als Text im Code.
 */
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { komma } from './ergebnis';
import { tabelle, fx, type Z } from './mwsaetze';
import { rGanz, rBool, rFange, rAnzeigeName, rAnzeigeZahl } from '../engine/rsicher';
import type { RAufruf } from './kategreg';
import type { PrognoseReihe } from './prognose';

/** Grenze des KPSS-Tests (Niveau, 5 %) und der Saisonstärke, ab der die Automatik D = 1 nimmt. */
export const KPSS_GRENZE = 0.463, STAERKE_GRENZE = 0.64, PERIODOGRAMM_MIN = 20, PERIODOGRAMM_MAX = 10000;

/** Die Beschriftungen (label) der Tabellen, damit das Blatt sie in ihrem Abschnitt zeigt. */
export const DIFFERENZEN_LABELS: readonly string[] = ['Differenzen', 'Differenzen-Korrelogramm'];
export const PERIODOGRAMM_LABELS: readonly string[] = ['Periodogramm'];

const arr = <T>(x: unknown): T[] => (x == null ? [] : Array.isArray(x) ? (x as T[]) : [x as T]);
const endlich = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const eine = (x: unknown): number | null => endlich(arr<unknown>(x)[0]);
const zahlen = (x: unknown): number[] => arr<unknown>(x).map(v => (typeof v === 'number' ? v : NaN));
const mitNull = (x: unknown): (number | null)[] => arr<unknown>(x).map(endlich);
const istObjekt = (o: unknown): o is Record<string, unknown> => !!o && typeof o === 'object' && !Array.isArray(o) && !(Object.keys(o as object).length === 1 && 'type' in (o as object));
const hatLuecken = (y: (number | null)[]) => y.some(v => v === null);

/* ================================================================ Differenzen prüfen */
export type DifferenzenCode = 'log-nicht-positiv' | 'r-fehler';
export interface DifferenzenAntwort {
  /** Zeilen für d = 0, 1, 2 beim gewählten D */
  kpss: (number | null)[]; sd: (number | null)[]; r1: (number | null)[]; nZeile: number[];
  /** beim gewählten d und D */
  n: number; lags: number; grenze: number; acf: number[]; pacf: number[] | null; staerke: number | null;
}
/** Das, was am Blatt gespeichert wird. */
export interface DifferenzenE { d: number; D: number; log: boolean; periode: number; luecken: boolean; antwort: DifferenzenAntwort }

/** Der Aufruf an `sp_prog_differenzen`; die Reihe steht als Spalte `y` in der Tabelle `d`. */
export function differenzenAufruf(m: number, log: boolean, d: number, D: number): RAufruf {
  return { code: rFange(`sp_prog_differenzen(d$y, ${rGanz(m)}, ${rBool(log)}, ${rGanz(d)}, ${rGanz(D)})`), args: {} };
}
/** Die Antwort von R lesen. Wirft nie. */
export function differenzenLesen(roh: unknown): { ok: true; antwort: DifferenzenAntwort } | { ok: false; code: DifferenzenCode } {
  if (!istObjekt(roh)) return { ok: false, code: 'r-fehler' };
  if (roh.fehler !== undefined) return { ok: false, code: String(arr<unknown>(roh.fehler)[0]) === 'log-nicht-positiv' ? 'log-nicht-positiv' : 'r-fehler' };
  const kpss = mitNull(roh.kpss), sd = mitNull(roh.sd), r1 = mitNull(roh.r1), nZeile = zahlen(roh.n_zeile), n = eine(roh.n), lags = eine(roh.lags), grenze = eine(roh.grenze);
  if (kpss.length !== 3 || sd.length !== 3 || r1.length !== 3 || n === null || lags === null || grenze === null) return { ok: false, code: 'r-fehler' };
  const acf = zahlen(roh.acf), pacf = zahlen(roh.pacf);
  if (acf.some(v => !Number.isFinite(v))) return { ok: false, code: 'r-fehler' };
  const pacfOk = pacf.length === acf.length && pacf.every(v => Number.isFinite(v) && Math.abs(v) < 1);
  return { ok: true, antwort: { kpss, sd, r1, nZeile, n, lags, grenze, acf, pacf: pacfOk ? pacf : null, staerke: eine(roh.staerke) } };
}

export type DifferenzenSatzCode = 'immer' | 'kpss' | 'r1' | 'streuung' | 'saison' | 'luecken';
export interface DifferenzenSatz { code: DifferenzenSatzCode; satz: string }
/** Die Sätze des Fachblatts, Abschnitt 2, in der Reihenfolge der Tabelle. Sachlich, ohne zu beruhigen; nie ein p-Wert für KPSS, nur der Vergleich mit 0,463. */
export function differenzenSaetze(p: DifferenzenE): DifferenzenSatz[] {
  const a = p.antwort, aus: DifferenzenSatz[] = [], add = (code: DifferenzenSatzCode, satz: string) => aus.push({ code, satz });
  add('immer', L('KPSS prüft die Reihe um ein festes Niveau und ist ein Hinweis. Eine Saison prüft er nicht.', 'KPSS tests the series around a fixed level and is a hint. It does not test a season.'));
  const k = a.kpss[p.d] ?? null, r1 = a.r1[p.d] ?? null, sd = a.sd[p.d] ?? null, sdVor = p.d >= 1 ? a.sd[p.d - 1] ?? null : null;
  if (k !== null && k > KPSS_GRENZE) add('kpss', L(`Die Reihe wirkt nach diesen Differenzen noch nicht stationär (KPSS ${komma(k, 3)}, Grenze ${komma(KPSS_GRENZE, 3)}).`, `After these differences the series still does not look stationary (KPSS ${komma(k, 3)}, limit ${komma(KPSS_GRENZE, 3)}).`));
  if (r1 !== null && r1 < -0.5) add('r1', L(`Die Autokorrelation bei Verzögerung 1 liegt bei ${komma(r1, 2)}. Ein r1 unter -0,5 ist ein Zeichen für zu viel Differenzieren.`, `The autocorrelation at lag 1 is ${komma(r1, 2)}. An r1 below -0.5 is a sign of too much differencing.`));
  if (sd !== null && sdVor !== null && sd > sdVor) add('streuung', L(`Die Streuung ist höher als mit einer Differenz weniger (${komma(sd, 4)} gegen ${komma(sdVor, 4)}): ebenfalls ein Zeichen für zu viel Differenzieren.`, `The spread is higher than with one difference less (${komma(sd, 4)} against ${komma(sdVor, 4)}): also a sign of too much differencing.`));
  if (p.D === 0 && a.staerke !== null && a.staerke > STAERKE_GRENZE) add('saison', L(`Die Saisonstärke ist hoch (${komma(a.staerke, 3)}, Grenze ${komma(STAERKE_GRENZE, 2)}); die Automatik würde hier D = 1 nehmen.`, `The seasonal strength is high (${komma(a.staerke, 3)}, limit ${komma(STAERKE_GRENZE, 2)}); the automatic selection would take D = 1 here.`));
  if (p.luecken) add('luecken', L('KPSS und Saisonstärke brauchen eine Reihe ohne Lücken und werden nicht gerechnet.', 'KPSS and seasonal strength need a series without gaps and are not calculated.'));
  return aus;
}
export function differenzenFehlerSatz(c: DifferenzenCode): string {
  return c === 'log-nicht-positiv' ? L('Die Log-Skala braucht Werte über 0.', 'The log scale needs values above 0.') : L('R meldete bei der Prüfung der Differenzen einen Fehler.', 'R reported an error while checking the differences.');
}
/** Der Satz, der sagt, wofür die Prüfung da ist (über dem Knopf). */
export const differenzenHilfeSatz = (): string => L('Die Prüfung zeigt, wie sich KPSS, Streuung und Autokorrelation mit 0, 1 und 2 Differenzen verhalten. Sie wählt nichts aus und ändert die Wahl nicht.', 'The check shows how KPSS, spread and autocorrelation behave with 0, 1 and 2 differences. It chooses nothing and does not change the choice.');

export function differenzenTabellen(p: DifferenzenE, name: string): TableItem[] {
  const a = p.antwort, ohneLuecke = !p.luecken;
  const z = (v: number | null, s: number): Z => (v === null ? '-' : fx(v, s));
  const zeilen: Z[][] = [0, 1, 2].map(k => [String(k), z(a.kpss[k] ?? null, 4), z(a.sd[k] ?? null, 4), z(a.r1[k] ?? null, 4), String(a.nZeile[k] ?? '')]);
  const aus: TableItem[] = [];
  aus.push(tabelle('Differenzen', L(`Differenzen prüfen: ${name}`, `Checking the differences: ${name}`),
    [L('Gewöhnliche Differenzen d', 'Ordinary differences d'), 'KPSS', L('Streuung', 'Spread'), 'r1', 'n'], zeilen,
    [L(`Saisonale Differenzen D = ${p.D}; erst saisonal, dann gewöhnlich.`, `Seasonal differences D = ${p.D}; seasonal first, then ordinary.`),
      ...(p.log ? [L('Die Reihe ist auf der Log-Skala gerechnet.', 'The series is calculated on the log scale.')] : []),
      L(`KPSS (Niveau) wird nur mit dem Wert ${komma(KPSS_GRENZE, 3)} verglichen, es gibt dafür keinen p-Wert. Streuung = Standardabweichung der differenzierten Reihe.`, `KPSS (level) is only compared with the value ${komma(KPSS_GRENZE, 3)}; there is no p value for it. Spread = standard deviation of the differenced series.`),
      ...(ohneLuecke ? [] : [L('KPSS wird bei Lücken nicht gerechnet.', 'KPSS is not calculated with gaps.')])]));
  const kz: Z[][] = a.acf.map((r, i) => [{ t: komma(i + 1, 0), n: i + 1 }, fx(r, 3), a.pacf ? fx(a.pacf[i]!, 3) : '-']);
  aus.push(tabelle('Differenzen-Korrelogramm', L(`Korrelogramm bei d = ${p.d}, D = ${p.D}`, `Correlogram at d = ${p.d}, D = ${p.D}`), [L('Verzögerung', 'Lag'), 'ACF', 'PACF'], kz,
    [L(`Grenzen ±${komma(a.grenze, 3)} (1,96/√n, n = ${a.n}), je Verzögerung einzeln.`, `Limits ±${komma(a.grenze, 3)} (1.96/√n, n = ${a.n}), per lag.`)]));
  return aus;
}
/** R-Text zum Ansehen (wird nie ausgeführt). */
export function differenzenRCode(p: DifferenzenE, spalte: string): string {
  const a = p.antwort;
  const z = [`# ${L('daten: die Tabelle in R', 'daten: your table in R')}`, `z <- ${p.log ? 'log(' : ''}daten$${rAnzeigeName(spalte)}${p.log ? ')' : ''}`];
  if (p.D > 0) z.push(`v <- diff(z, lag = ${rAnzeigeZahl(p.periode)})`); else z.push('v <- z');
  if (p.d > 0) z.push(`v <- diff(v, differences = ${rAnzeigeZahl(p.d)})`);
  z.push(`acf(v, lag.max = ${rAnzeigeZahl(a.lags)}, na.action = na.pass)`, `pacf(v, lag.max = ${rAnzeigeZahl(a.lags)}, na.action = na.pass)`);
  return z.join('\n');
}

/* ================================================================ Periodogramm */
export type PeriodogrammSperre = 'luecken' | 'ungleich' | 'zu-kurz' | 'zu-lang' | 'alle-gleich';
export type PeriodogrammCode = PeriodogrammSperre | 'r-fehler';
export interface PeriodogrammSpitze { periode: number; anteil: number; index: number }
export interface PeriodogrammAntwort { n: number; freq: number[]; spec: number[]; spitzen: PeriodogrammSpitze[] }
export interface PeriodogrammE { antwort: PeriodogrammAntwort }

/** Warum kein Periodogramm gerechnet wird (oder null): Lücken, ungleiche Abstände, unter 20 Werte, alle Werte gleich. Nichts wird aufgefüllt. */
export function periodogrammSperre(r: PrognoseReihe): PeriodogrammSperre | null {
  const w = r.y.filter((v): v is number => v !== null);
  if (hatLuecken(r.y)) return 'luecken';
  if (r.raster === 'ungleich') return 'ungleich';
  if (w.length < PERIODOGRAMM_MIN) return 'zu-kurz';
  if (w.length > PERIODOGRAMM_MAX) return 'zu-lang';   // fast = FALSE: Die Rechenzeit kann bei langen Reihen quadratisch wachsen
  if (w.every(v => v === w[0])) return 'alle-gleich';
  return null;
}
export function periodogrammCodeSatz(c: PeriodogrammCode): string {
  switch (c) {
    case 'luecken': return L('In der Reihe fehlen Werte. Das Periodogramm braucht eine Reihe ohne Lücken; Statable füllt nichts auf.', 'Values are missing in the series. The periodogram needs a series without gaps; Statable fills in nothing.');
    case 'ungleich': return L('Die Abstände zwischen den Zeitpunkten sind ungleich. Das Periodogramm braucht gleiche Abstände.', 'The intervals between the points in time are unequal. The periodogram needs equal intervals.');
    case 'zu-kurz': return L('Für ein Periodogramm braucht die Reihe mindestens 20 Werte.', 'A periodogram needs a series of at least 20 values.');
    case 'zu-lang': return L('Das Periodogramm rechnet bis 10.000 Werte; die Reihe ist länger.', 'The periodogram works up to 10,000 values; the series is longer.');
    case 'alle-gleich': return L('Alle Werte sind gleich; es gibt keine Periode, die sich finden ließe.', 'All values are equal; there is no period to be found.');
    case 'r-fehler': return L('R meldete beim Periodogramm einen Fehler.', 'R reported an error during the periodogram.');
  }
}
/** Der Aufruf an `sp_periodogramm`; die Reihe steht als Spalte `y` in der Tabelle `d`. */
export const periodogrammAufruf = (): RAufruf => ({ code: rFange('sp_periodogramm(d$y)'), args: {} });
/** Die Antwort von R lesen. Wirft nie. */
export function periodogrammLesen(roh: unknown): { ok: true; antwort: PeriodogrammAntwort } | { ok: false; code: PeriodogrammCode } {
  if (!istObjekt(roh)) return { ok: false, code: 'r-fehler' };
  if (roh.fehler !== undefined) { const f = String(arr<unknown>(roh.fehler)[0]); return { ok: false, code: f === 'luecken' || f === 'zu-kurz' ? f : 'r-fehler' }; }
  const n = eine(roh.n), freq = zahlen(roh.freq), spec = zahlen(roh.spec), per = zahlen(roh.spitzen_periode), anteil = zahlen(roh.spitzen_anteil), index = zahlen(roh.spitzen_index);
  if (n === null || !freq.length || freq.length !== spec.length || [...freq, ...spec, ...per, ...anteil, ...index].some(v => !Number.isFinite(v)) || per.length !== anteil.length || per.length !== index.length) return { ok: false, code: 'r-fehler' };
  return { ok: true, antwort: { n, freq, spec, spitzen: per.map((periode, i) => ({ periode, anteil: anteil[i]!, index: index[i]! })) } };
}
export type PeriodogrammWarnCode = 'nachweis' | 'aufloesung' | 'glaubhaft';
/** Die Warnungen des Fachblatts, immer sichtbar. */
export function periodogrammWarnungen(): { code: PeriodogrammWarnCode; satz: string }[] {
  return [
    { code: 'nachweis', satz: L('Die größte Spitze ist kein Nachweis einer Periode. Auch reines Rauschen hat eine größte Spitze.', 'The largest peak is no proof of a period. Even pure noise has a largest peak.') },
    { code: 'aufloesung', satz: L('Die Auflösung ist grob: Die Frequenzen sind Vielfache von 1/n. Eine wahre Periode 17 erscheint bei 120 Werten als 17,1. Der Wert ist eine Näherung.', 'The resolution is coarse: the frequencies are multiples of 1/n. A true period of 17 appears as 17.1 with 120 values. The value is an approximation.') },
    { code: 'glaubhaft', satz: L('Eine Periode ist nur glaubhaft, wenn sie sachlich erklärbar ist und im Korrelogramm wiederkehrt.', 'A period is only credible if it can be explained by the subject matter and returns in the correlogram.') }
  ];
}
const periodeText = (v: number) => komma(v, 1);
const prozent = (v: number) => `${komma(100 * v, 1)} %`;
/** Der Satz zum Ergebnis; ohne Spitze ein Satz, dass keine gefunden wurde. */
export function periodogrammHauptsatz(p: PeriodogrammE): string {
  const s = p.antwort.spitzen[0];
  if (!s) return L('Im Periodogramm gibt es keine Spitze mit einer Periode von 2 bis n/2.', 'The periodogram has no peak with a period from 2 to n/2.');
  return L(`Die größte Spitze liegt bei einer Periode von ${periodeText(s.periode)} Zeitpunkten und trägt ${prozent(s.anteil)} des Spektrums.`, `The largest peak lies at a period of ${periodeText(s.periode)} points in time and carries ${prozent(s.anteil)} of the spectrum.`);
}
export function periodogrammTabellen(p: PeriodogrammE, name: string): TableItem[] {
  const a = p.antwort;
  const zeilen: Z[][] = a.spitzen.map((s, i) => [{ t: komma(i + 1, 0), n: i + 1 }, { t: periodeText(s.periode), n: s.periode }, fx(a.freq[s.index - 1] ?? NaN, 4), { t: prozent(s.anteil), n: s.anteil }]);
  if (!zeilen.length) zeilen.push(['-', '-', '-', '-']);
  return [tabelle('Periodogramm', L(`Periodogramm ${name}: die größten Spitzen`, `Periodogram ${name}: the largest peaks`), [L('Rang', 'Rank'), L('Periode (Zeitpunkte)', 'Period (points in time)'), L('Frequenz', 'Frequency'), L('Anteil am Spektrum', 'Share of the spectrum')], zeilen,
    [L(`n = ${a.n}. Lineare Entwicklung herausgerechnet, ohne Glättung; Periode = 1/Frequenz in Zeitpunkten, unabhängig vom Raster. Spitzen: lokale Maxima mit einer Periode von 2 bis n/2. Es gibt keinen Test für die Spitzen.`,
      `n = ${a.n}. Linear trend removed, no smoothing; period = 1/frequency in points in time, regardless of the grid. Peaks: local maxima with a period from 2 to n/2. There is no test for the peaks.`)])];
}
export function periodogrammRCode(spalte: string): string {
  return `# ${L('daten: die Tabelle in R', 'daten: your table in R')}\ns <- spec.pgram(ts(daten$${rAnzeigeName(spalte)}), taper = 0, detrend = TRUE, fast = FALSE)\n1 / s$freq[which.max(s$spec)]   # ${L('Periode der größten Spitze', 'period of the largest peak')}`;
}
