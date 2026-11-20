/**
 * Sätze der Zeitreihen-Karte (Später, Welle S-E, L7): ganze Sätze je Fall, übersetzbar (L, Lp, d). Die Sätze zu den Sperren und Hinweisen hängen an einem Kennwort (`ZeitCode`);
 * die Zahlen kommen aus zeitreihe.ts, gerundet wird erst hier bei der Anzeige. Zahlenformat nur über das Sprachprofil (komma, ohneNull, pWert).
 */
import { L, Lp, d } from './sitzung.svelte';
import { komma, ohneNull, pWert } from './ergebnis';
import { ort } from '../i18n/profil';
import type { Raster } from './zeitreihe';

export type ZeitCode =
  | 'zu-kurz' | 'kurz' | 'doppelt' | 'zu-viele-ungueltig' | 'uhrzeit' | 'periode' | 'raster-passt-nicht' | 'zu-lang'
  | 'ungleich' | 'luecken' | 'zu-viele-luecken' | 'acf-luecken' | 'keine-saison' | 'woche' | 'zu-kurz-fuer-zerlegung' | 'wenige-perioden' | 'nicht-positiv' | 'alle-gleich' | 'intervall-ohne-acf';

export interface ZeitCtx { luecken?: number; n?: number; T?: number; periode?: number; ausgeschlossen?: number }
const zahl = (x: number | undefined) => (typeof x === 'number' && Number.isFinite(x) ? komma(x, 0) : '?');

/** Der Satz zu einer Sperre oder einem Hinweis der Zeitreihen-Karte. */
export function zeitreiheCodeSatz(code: ZeitCode, ctx: ZeitCtx = {}): string {
  const l = ctx.luecken ?? 0, T = zahl(ctx.T), aus = ctx.ausgeschlossen ?? 0;
  switch (code) {
    case 'zu-kurz': return L('Eine Zeitreihe braucht mindestens 10 Werte mit Zeitangabe; hier sind es weniger.', 'A time series needs at least 10 values with a time; there are fewer here.');
    case 'kurz': return L('Die Reihe ist kurz (unter 20 Werte); Trend und Autokorrelation sind dann sehr unsicher.', 'The series is short (under 20 values); trend and autocorrelation are then very uncertain.');
    case 'doppelt': return d('Je Zeitpunkt darf nur ein Wert stehen. Fasse die Werte zuerst mit dem Daten-Assistenten „Aggregieren“ zusammen (zum Beispiel als Mittel).',
      'Je Zeitpunkt darf nur ein Wert stehen. Fassen Sie die Werte zuerst mit dem Daten-Assistenten „Aggregieren“ zusammen (zum Beispiel als Mittel).', 'Only one value may stand at each point in time. First combine the values with the data assistant "Aggregate" (for example as a mean).');
    case 'zu-viele-ungueltig': return Lp(aus, `${aus} Zeitangabe ist leer oder kein gültiges Datum, das sind mehr als 5 % der Zeilen. Eine Reihe mit so vielen Lücken in der Zeit rechnet Statable nicht.`,
      `${aus} Zeitangaben sind leer oder kein gültiges Datum, das sind mehr als 5 % der Zeilen. Eine Reihe mit so vielen Lücken in der Zeit rechnet Statable nicht.`,
      `${aus} time entry is empty or not a valid date, which is more than 5% of the rows. Statable does not calculate a series with so many gaps in time.`, `${aus} time entries are empty or not valid dates, which is more than 5% of the rows. Statable does not calculate a series with so many gaps in time.`);
    case 'uhrzeit': return L('Die Zeitangaben haben verschiedene Uhrzeiten. Stündliche oder minütliche Reihen rechnet Statable nicht; es zählt das Datum, und alle Zeilen müssten dieselbe Uhrzeit haben.', 'The time entries have different times of day. Statable does not calculate hourly or minute series; the date counts, and all rows would need the same time of day.');
    case 'periode': return L('Die Periode muss eine ganze Zahl sein, die höchstens halb so groß ist wie die Zahl der Werte (1 heißt: keine Saison).', 'The period must be a whole number that is at most half the number of values (1 means: no season).');
    case 'raster-passt-nicht': return L('Das gewählte Raster passt nicht zu den Zeitpunkten.', 'The chosen grid does not fit the points in time.');
    case 'zu-lang': return L('Die Reihe hat mehr als 50 000 Plätze auf dem Zeitraster. Das rechnet Statable im Browser nicht.', 'The series has more than 50,000 places on the time grid. Statable does not calculate this in the browser.');
    case 'ungleich': return d('Die Abstände zwischen den Zeitpunkten sind ungleich (zum Beispiel Börsentage ohne Wochenende); Autokorrelation und Zerlegung setzen gleiche Abstände voraus. Verlauf, gleitender Mittelwert und Trend laufen mit der echten Zeit. Du kannst auch die Reihenfolge der Zeilen als Zeit nehmen; das setzt die Abstände gleich.',
      'Die Abstände zwischen den Zeitpunkten sind ungleich (zum Beispiel Börsentage ohne Wochenende); Autokorrelation und Zerlegung setzen gleiche Abstände voraus. Verlauf, gleitender Mittelwert und Trend laufen mit der echten Zeit. Sie können auch die Reihenfolge der Zeilen als Zeit nehmen; das setzt die Abstände gleich.',
      'The intervals between the points in time are unequal (for example trading days without weekends); autocorrelation and decomposition need equal intervals. The plot, the moving average and the trend use the real time. You can also take the row order as time; that makes the intervals equal.');
    case 'luecken': return Lp(l, `In den Daten fehlt ${l} von ${T} Zeitpunkten. Die Zerlegung braucht lückenlose Daten über mindestens zwei volle Perioden; Ljung-Box und Durbin-Watson ebenfalls. Lücken werden nie aufgefüllt.`,
      `In den Daten fehlen ${l} von ${T} Zeitpunkten. Die Zerlegung braucht lückenlose Daten über mindestens zwei volle Perioden; Ljung-Box und Durbin-Watson ebenfalls. Lücken werden nie aufgefüllt.`,
      `${l} of ${T} points in time are missing in the data. The decomposition needs data without gaps over at least two full periods; so do Ljung-Box and Durbin-Watson. Gaps are never filled in.`,
      `${l} of ${T} points in time are missing in the data. The decomposition needs data without gaps over at least two full periods; so do Ljung-Box and Durbin-Watson. Gaps are never filled in.`);
    case 'zu-viele-luecken': return L('Mehr als 10 % der Zeitpunkte fehlen; die Autokorrelation wird dann nicht gerechnet. Verlauf, gleitender Mittelwert und Trend laufen.', 'More than 10% of the points in time are missing; autocorrelation is then not calculated. The plot, the moving average and the trend still run.');
    case 'acf-luecken': return L('Die Autokorrelation ist hier eine Näherung, weil einzelne Zeitpunkte fehlen (Lücken werden nicht aufgefüllt).', 'Autocorrelation is an approximation here because some points in time are missing (gaps are not filled in).');
    case 'keine-saison': return L('Bei Jahreswerten oder mit Periode 1 gibt es keine Saison; die Zerlegung entfällt.', 'With yearly values or a period of 1 there is no season; the decomposition does not apply.');
    case 'woche': return L('Bei Wochenwerten ist die Periode 52 nur eine Näherung (ein Jahr hat nicht genau 52 Wochen); eine Zerlegung bietet Statable dafür nicht an.', 'With weekly values the period 52 is only an approximation (a year does not have exactly 52 weeks); Statable does not offer a decomposition for it.');
    case 'zu-kurz-fuer-zerlegung': return L('Die Zerlegung braucht mindestens zwei volle Perioden.', 'The decomposition needs at least two full periods.');
    case 'wenige-perioden': return L('Das Saisonmuster beruht auf weniger als drei Wiederholungen und ist entsprechend unsicher.', 'The seasonal pattern rests on fewer than three repetitions and is correspondingly uncertain.');
    case 'nicht-positiv': return L('Es gibt Werte von 0 oder darunter; die multiplikative Zerlegung ist dann nicht möglich.', 'There are values of 0 or below; the multiplicative decomposition is then not possible.');
    case 'intervall-ohne-acf': return L('Die Autokorrelation ließ sich hier nicht prüfen (ungleiche Abstände oder mehr als 10 % Lücken). Das Intervall des Trends setzt unabhängige Werte voraus und ist bei aufeinanderfolgenden, abhängigen Werten zu schmal.', 'Autocorrelation could not be checked here (unequal intervals or more than 10% gaps). The interval of the trend assumes independent values and is too narrow if successive values depend on each other.');
    case 'alle-gleich': return L('Alle Werte sind gleich; es gibt keinen Verlauf, den man beschreiben könnte.', 'All values are equal; there is no course that could be described.');
  }
}

/** Satz zur Autokorrelation der Residuen: mit Befund (Ljung-Box p < ,05) die Warnung und die effektive Fallzahl, sonst „keine deutliche Autokorrelation“. */
export function zeitreiheAutokorrSatz(e: { r1: number; q: number; h: number; p: number; nEff: number; n: number }): string {
  const q = `Q(${e.h}) = ${komma(e.q, 1)}`, p = pWert(e.p), r1 = ohneNull(e.r1, 2);
  if (!(e.p < 0.05)) {
    return L(`Die Residuen zeigen keine deutliche Autokorrelation (r₁ = ${r1}; Ljung-Box ${q}, p ${p}).`, `The residuals show no clear autocorrelation (r₁ = ${r1}; Ljung-Box ${q}, p ${p}).`);
  }
  if (e.nEff < e.n) {
    return L(`Aufeinanderfolgende Werte hängen voneinander ab (r₁ = ${r1}; Ljung-Box ${q}, p ${p}). Das gewöhnliche Intervall des Trends ist dann zu schmal; mit Rücksicht darauf zählt die Reihe wie ${komma(e.nEff, 1)} unabhängige Werte statt ${komma(e.n, 0)}.`,
      `Successive values depend on each other (r₁ = ${r1}; Ljung-Box ${q}, p ${p}). The ordinary interval of the trend is then too narrow; taking this into account, the series counts as ${komma(e.nEff, 1)} independent values instead of ${komma(e.n, 0)}.`);
  }
  return L(`Die Residuen zeigen Autokorrelation (r₁ = ${r1}; Ljung-Box ${q}, p ${p}), aber keine positive: Das Intervall des Trends wird nicht verändert.`, `The residuals show autocorrelation (r₁ = ${r1}; Ljung-Box ${q}, p ${p}), but not a positive one: the interval of the trend is not changed.`);
}

/* ---------------------------------------------------------------- Namen der Positionen in der Saisonfigur */
/** Monats- und Wochentagsnamen in der Sprache der Oberfläche (Intl mit dem Gebietsschema des Sprachprofils), nicht fest deutsch oder englisch. */
const monatsName = (m0: number): string => { const n = new Date(Date.UTC(2000, m0 % 12, 15)).toLocaleDateString(ort(), { month: 'long', timeZone: 'UTC' }); return n.charAt(0).toLocaleUpperCase(ort()) + n.slice(1); };
const wochentagsName = (t0: number): string => { const n = new Date(Date.UTC(2000, 0, 2 + (t0 % 7))).toLocaleDateString(ort(), { weekday: 'long', timeZone: 'UTC' }); return n.charAt(0).toLocaleUpperCase(ort()) + n.slice(1); };   // 2.1.2000 war ein Sonntag
const erstesJahrMonat = (iso: string): { j: number; m: number; t: number } | null => { const r = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso); return r ? { j: Number(r[1]), m: Number(r[2]), t: Number(r[3]) } : null; };
/** Name der i-ten Position (0-basiert) der Saisonfigur; sie beginnt beim ersten Zeitpunkt der Reihe. Periode 12: Monat, 4: Quartal, 7: Wochentag, sonst „Position i“. */
export function positionName(i: number, periode: number, erstesDatum: string): string {
  const d0 = erstesJahrMonat(erstesDatum);
  if (periode === 12 && d0) return monatsName(d0.m - 1 + i);
  if (periode === 4 && d0) { const q = (Math.floor((d0.m - 1) / 3) + i) % 4 + 1; return L(`Quartal ${q}`, `quarter ${q}`); }
  if (periode === 7 && d0) { const tag = new Date(Date.UTC(d0.j, d0.m - 1, d0.t)).getUTCDay(); return wochentagsName(tag + i); }
  const nr = i + 1;
  return L(`Position ${nr}`, `position ${nr}`);
}

/** Satz zur Saisonfigur: höchster und niedrigster Wert mit Namen der Position (Monat, Quartal, Wochentag). Additiv als Abweichung (+6,3), multiplikativ als Faktor (1,23). */
export function zeitreiheZerlegungSatz(e: { figur: number[]; periode: number; erstesDatum: string; art: 'additiv' | 'multiplikativ' }): string {
  if (!e.figur.length) return '';
  let hi = 0, lo = 0;
  e.figur.forEach((v, i) => { if (v > e.figur[hi]!) hi = i; if (v < e.figur[lo]!) lo = i; });
  const hn = positionName(hi, e.periode, e.erstesDatum), ln = positionName(lo, e.periode, e.erstesDatum), p = e.periode;
  if (e.art === 'additiv') {
    const a = (v: number) => (v >= 0 ? `+${komma(v, 1)}` : komma(v, 1)), h = a(e.figur[hi]!), t = a(e.figur[lo]!);
    return L(`Die klassische Zerlegung (additiv, Periode ${p}) zeigt ein Saisonmuster mit dem höchsten Wert bei ${hn} (${h}) und dem niedrigsten bei ${ln} (${t}).`,
      `The classical decomposition (additive, period ${p}) shows a seasonal pattern with the highest value at ${hn} (${h}) and the lowest at ${ln} (${t}).`);
  }
  const h = komma(e.figur[hi]!, 2), t = komma(e.figur[lo]!, 2);
  return L(`Die klassische Zerlegung (multiplikativ, Periode ${p}) zeigt ein Saisonmuster mit dem höchsten Faktor bei ${hn} (${h}) und dem niedrigsten bei ${ln} (${t}); 1 wäre der Durchschnitt.`,
    `The classical decomposition (multiplicative, period ${p}) shows a seasonal pattern with the highest factor at ${hn} (${h}) and the lowest at ${ln} (${t}); 1 would be the average.`);
}

/* ---------------------------------------------------------------- Zeile „Gerechnet“ */
export const rasterWort = (r: Raster): string =>
  r === 'monatlich' ? L('monatlich', 'monthly') : r === 'vierteljaehrlich' ? L('vierteljährlich', 'quarterly') : r === 'jaehrlich' ? L('jährlich', 'yearly')
    : r === 'woechentlich' ? L('wöchentlich', 'weekly') : r === 'taeglich' ? L('täglich', 'daily') : r === 'zeilen' ? L('Reihenfolge der Zeilen', 'row order') : L('ungleiche Abstände', 'unequal intervals');

/** „Gerechnet“: Raster, Zahl der Werte, Trend, Ljung-Box, Zerlegung (nur was wirklich gerechnet wurde) mit der Quelle. */
export function zeitreiheGerechnet(e: { raster: Raster; periode: number; n: number; T: number; luecken: number; art?: 'additiv' | 'multiplikativ'; h?: number }): string {
  const n = komma(e.n, 0), T = komma(e.T, 0), r = rasterWort(e.raster), p = e.periode;
  const kopf = e.luecken > 0
    ? L(`Zeitreihe: Raster ${r} (Periode ${p}), n = ${n} Werte auf ${T} Plätzen, ${e.luecken} Lücken (nicht aufgefüllt)`, `Time series: grid ${r} (period ${p}), n = ${n} values on ${T} places, ${e.luecken} gaps (not filled in)`)
    : L(`Zeitreihe: Raster ${r} (Periode ${p}), n = ${n} von ${T} Zeitpunkten (keine Lücken)`, `Time series: grid ${r} (period ${p}), n = ${n} of ${T} points in time (no gaps)`);
  const df = e.n - 2;
  const trend = L(`lineare Trendregression, 95-%-Intervall aus t(${komma(df, 0)})`, `linear trend regression, 95% interval from t(${komma(df, 0)})`);
  const lb = e.h ? L(`Ljung-Box mit ${e.h} Verzögerungen`, `Ljung-Box with ${e.h} lags`) : '';
  const zer = e.art ? (e.art === 'additiv' ? L('Zerlegung: klassisch, additiv (Hyndman und Athanasopoulos, 2021)', 'decomposition: classical, additive (Hyndman and Athanasopoulos, 2021)') : L('Zerlegung: klassisch, multiplikativ (Hyndman und Athanasopoulos, 2021)', 'decomposition: classical, multiplicative (Hyndman and Athanasopoulos, 2021)')) : '';
  return [kopf, trend, lb, zer].filter(Boolean).join('; ') + '.';
}

/** Fußzeile der Karte: der Trend beschreibt die Reihe im beobachteten Zeitraum, er sagt keine Zukunft. */
export const zeitreiheFussSatz = (): string => L('Der Trend beschreibt die Reihe im beobachteten Zeitraum; er sagt nicht, dass sie so weitergeht. Eine Prognose rechnet Statable nur auf Klick, im Abschnitt „Wie könnte es weitergehen?“.', 'The trend describes the series in the observed period; it does not say that it will continue like that. Statable calculates a forecast only on request, in the section "What might happen next?".');
/** Warnung: Scheintrend bei starker Autokorrelation. */
export const zeitreiheScheintrendSatz = (): string => L('Ein Trend in einer Reihe mit starker Autokorrelation kann Zufall sein; die Aussage „der Trend ist von null verschieden“ ist dann weniger sicher, als die Zahl wirkt.', 'A trend in a series with strong autocorrelation can be chance; the statement "the trend differs from zero" is then less certain than the number looks.');
