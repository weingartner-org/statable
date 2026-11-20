/**
 * Tabellen und Sätze zur Prognose der Zeitreihen-Karte (Fachblatt docs/fachblaetter/PROGNOSE-ARIMA.md, Abschnitt 3): Prognosetabelle, Modell, Gütemaße, Automatik, Prüfzeitraum.
 * Die Zeitpunkte (Beschriftung der Zeilen) kommen fertig vom Aufrufer (zeitreiheblatt.ts), damit dieses Teil nichts von der Zeitachse wissen muss.
 */
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { komma, ohneNull, pWert } from './ergebnis';
import { tabelle, fx, type Z } from './mwsaetze';
import { normalOben } from './verteilung';
import {
  prognoseModellName, prognoseModellText, parameterName, parameterNameGlaettung, prognosePruefSatz, glaettungName, hatBand, etsName, etsSatz,
  type PrognoseE, type PrognoseKandidat
} from './prognose';

/** Die Beschriftungen (label) der Prognose-Tabellen: das Blatt zeigt sie im Abschnitt „Prognose“, nicht bei den übrigen Tabellen der Karte. */
export const PROGNOSE_LABELS: readonly string[] = ['Prognose', 'Prognosemodell', 'Prognose-Gütemaße', 'Prognose-Automatik', 'Prognose-Prüfzeitraum'];

export interface PrognoseTabEin { name: string; zeiten: string[]; stellen: number }
/** Feste Stellen mit Punkt (die Ausgabe wandelt in Dezimalkomma); '-' wenn keine Zahl. */
const zfx = (v: number | null, d: number): Z => (v === null || !Number.isFinite(v) ? '-' : fx(v, d));

/** Name eines Modells aus der Automatik (Tabelle der besten fünf). */
function kandidatName(k: PrognoseKandidat, d: number, D: number, m: number): string {
  const c = prognoseModellName({ p: k.p, d, q: k.q, P: k.P, D, Q: k.Q, periode: m });
  const dd = d + D;
  return `${c}${k.konst ? (dd === 1 ? L(' mit Drift', ' with drift') : L(' mit Mittelwert', ' with mean')) : ''}`;
}

export function prognoseTabellen(p: PrognoseE, ein: PrognoseTabEin): TableItem[] {
  const a = p.antwort, aus: TableItem[] = [], w = ein.name, st = ein.stellen;
  const n = a.mittel.length;
  // 1 Prognose
  const band = hatBand(a);
  aus.push(tabelle('Prognose', L(`Prognose ${w}`, `Forecast ${w}`),
    band ? [L('Zeitpunkt', 'Point in time'), L('Prognose', 'Forecast'), L('80 % unten', '80% lower'), L('80 % oben', '80% upper'), L('95 % unten', '95% lower'), L('95 % oben', '95% upper')] : [L('Zeitpunkt', 'Point in time'), L('Prognose', 'Forecast')],
    Array.from({ length: n }, (_, i) => band ? [ein.zeiten[i] ?? String(i + 1), zfx(a.mittel[i]!, st), zfx(a.u80[i]!, st), zfx(a.o80[i]!, st), zfx(a.u95[i]!, st), zfx(a.o95[i]!, st)] : [ein.zeiten[i] ?? String(i + 1), zfx(a.mittel[i]!, st)]),
    [a.ets
      ? (band ? L('Die Grenzen sind Prognoseintervalle der Normalverteilung nach der Varianzformel des ETS-Modells.', 'The limits are prediction intervals of the normal distribution from the variance formula of the ETS model.') : L('Für dieses Modell rechnet Statable kein Intervall.', 'For this model Statable calculates no interval.'))
      : a.art === 'arima'
        ? (a.log ? L('Die Grenzen sind Prognoseintervalle der Normalverteilung auf der Log-Skala, zurückgerechnet; die Prognose ist ein Median.', 'The limits are prediction intervals of the normal distribution on the log scale, back-transformed; the forecast is a median.') : L('Die Grenzen sind Prognoseintervalle der Normalverteilung (stats::predict).', 'The limits are prediction intervals of the normal distribution (stats::predict).'))
        : L('Die Intervalle von HoltWinters sind eine Näherung.', 'The intervals of HoltWinters are an approximation.')]));
  // 2 Modell
  const kopf = ['', L('Schätzung', 'Estimate'), L('Standardfehler', 'Standard error'), 'z', 'p'];
  if (a.art === 'arima') {
    const zeilen: Z[][] = a.namen.map((nm, i) => {
      const b = a.b[i]!, se = a.se[i]!, z = se > 0 ? b / se : NaN;
      return [parameterName(nm), zfx(b, 4), zfx(se, 4), zfx(z, 2), Number.isFinite(z) ? { t: pWert(2 * normalOben(Math.abs(z))).replace(/^= /, ''), n: 2 * normalOben(Math.abs(z)) } : '-'];
    });
    if (!zeilen.length) zeilen.push([L('(keine Parameter)', '(no parameters)'), '-', '-', '-', '-']);
    aus.push(tabelle('Prognosemodell', L(`Modell: ${prognoseModellText(a)}`, `Model: ${prognoseModellText(a)}`), kopf, zeilen,
      [L('z = Schätzung / Standardfehler; p aus der Normalverteilung. Die MA-Koeffizienten stehen in der Schreibweise von R (Box und Jenkins); SPSS zeigt sie mit umgekehrtem Vorzeichen.', 'z = estimate / standard error; p from the normal distribution. The MA coefficients use the notation of R (Box and Jenkins); SPSS shows them with the opposite sign.')]));
  } else {
    const zeilen: Z[][] = ([['alpha', a.alpha], ['beta', a.beta], ['phi', a.phi ?? null], ['gamma', a.gamma]] as const).filter(([, v]) => v !== null && v !== undefined && Number.isFinite(v)).map(([nm, v]) => [parameterNameGlaettung(nm), zfx(v as number, 4), '-', '-', '-']);
    if (a.ets) aus.push(tabelle('Prognosemodell', L(`Modell: ${etsName(a.ets)}`, `Model: ${etsName(a.ets)}`), kopf, zeilen,
      [etsSatz(a.ets), L('Die Parameter werden über die Wahrscheinlichkeit geschätzt (optim) und haben keinen Standardfehler. α, β, γ und φ liegen in festen Grenzen; Startwerte und Optimierer weichen von anderen Programmen ab.', 'The parameters are estimated through the likelihood (optim) and have no standard error. α, β, γ and φ lie within fixed limits; starting values and optimizer differ from other programs.')]));
    else aus.push(tabelle('Prognosemodell', L(`Modell: ${glaettungName(a.glaettung ?? 'einfach')}`, `Model: ${glaettungName(a.glaettung ?? 'einfach')}`), kopf, zeilen,
      [L('Die Glättungsparameter liegen zwischen 0 und 1 und werden durch Minimieren der Summe der quadrierten Einschrittfehler geschätzt (HoltWinters); sie haben keinen Standardfehler. Die Startwerte weichen von SPSS ab.', 'The smoothing parameters lie between 0 and 1 and are estimated by minimizing the sum of squared one-step errors (HoltWinters); they have no standard error. The starting values differ from SPSS.')]));
  }
  // 3 Gütemaße
  const g: Z[][] = [];
  if (a.aicc !== null) g.push(['AICc', zfx(a.aicc, 2)]);
  if (a.aic !== null) g.push(['AIC', zfx(a.aic, 2)]);
  if (a.ets && a.loglik != null) g.push([L('log-Likelihood', 'log-likelihood'), zfx(a.loglik, 2)]);
  if (a.bic !== null) g.push(['BIC', zfx(a.bic, 2)]);
  if (a.sigma2 !== null) g.push(['σ²', zfx(a.sigma2, 4)]);
  if (a.rmse !== null) g.push(['RMSE', zfx(a.rmse, 2)]);
  if (a.mae !== null) g.push(['MAE', zfx(a.mae, 2)]);
  if (a.mape !== null) g.push(['MAPE (%)', zfx(a.mape, 2)]);
  if (a.ljung) { g.push([`Ljung-Box Q(${a.ljung.h})`, zfx(a.ljung.q, 2)], [L('Freiheitsgrade', 'Degrees of freedom'), { t: komma(a.ljung.h - a.ljung.fitdf, 0), n: a.ljung.h - a.ljung.fitdf }], ['p', { t: pWert(a.ljung.p).replace(/^= /, ''), n: a.ljung.p }]); }
  aus.push(tabelle('Prognose-Gütemaße', L('Güte der Anpassung', 'Fit'), [L('Kennzahl', 'Measure'), L('Wert', 'Value')], g,
    [L('RMSE, MAE und MAPE beschreiben die Anpassung an die vorhandenen Werte (Einschrittfehler), nicht die Güte der Prognose; diese zeigt der Prüfzeitraum.', 'RMSE, MAE and MAPE describe the fit to the existing values (one-step errors), not the quality of the forecast; the test period shows that.')]));
  // 4 Automatik
  if (a.wahl) {
    const best = a.wahl.liste[0]?.aicc ?? 0;
    const zeilen: Z[][] = a.wahl.liste.map(k => [kandidatName(k, a.wahl!.d, a.wahl!.D, a.periode), zfx(k.aicc, 2), zfx(k.aicc - best, 2)]);
    const staerke = a.wahl.staerke !== null ? L(`; Saisonstärke ${ohneNull(a.wahl.staerke, 3)} (Grenze ${ohneNull(0.64, 2)}): D = ${a.wahl.D}`, `; seasonal strength ${ohneNull(a.wahl.staerke, 3)} (limit ${ohneNull(0.64, 2)}): D = ${a.wahl.D}`) : '';
    aus.push(tabelle('Prognose-Automatik', L('Automatische Modellwahl: die besten fünf Modelle', 'Automatic model selection: the best five models'), [L('Modell', 'Model'), 'AICc', 'ΔAICc'], zeilen,
      [L(`Gewöhnliche Differenzen: d = ${a.wahl.d} (KPSS = ${ohneNull(a.wahl.kpss, 3)}, Grenze ${ohneNull(0.463, 3)})${staerke}. ${a.wahl.geprueft} Modelle geprüft, geordnet nach AICc.`,
        `Ordinary differences: d = ${a.wahl.d} (KPSS = ${ohneNull(a.wahl.kpss, 3)}, limit ${ohneNull(0.463, 3)})${staerke}. ${a.wahl.geprueft} models checked, ordered by AICc.`)]));
  }
  if (a.wahlEts) {
    const best = a.wahlEts.aicc[0] ?? 0;
    const zeilen: Z[][] = a.wahlEts.modelle.map((k, i) => [etsName(k), zfx(a.wahlEts!.aicc[i] ?? null, 2), zfx((a.wahlEts!.aicc[i] ?? NaN) - best, 2)]);
    aus.push(tabelle('Prognose-Automatik', L('Automatische Modellwahl über die Glättung: die besten fünf Modelle', 'Automatic model selection through smoothing: the best five models'), [L('Modell', 'Model'), 'AICc', 'ΔAICc'], zeilen,
      [L(`${a.wahlEts.geprueft} Modelle gerechnet, geordnet nach AICc.`, `${a.wahlEts.geprueft} models calculated, ordered by AICc.`)]));
  }
  // 5 Prüfzeitraum
  if (a.pruef) {
    aus.push(tabelle('Prognose-Prüfzeitraum', L(`Prüfzeitraum: die letzten ${a.pruef.pr} Werte`, `Test period: the last ${a.pruef.pr} values`), [L('Verfahren', 'Method'), 'RMSE', 'MAE'],
      [[prognoseModellText(a), zfx(a.pruef.rmse, 2), zfx(a.pruef.mae, 2)], [L('Einfache Regel', 'Simple rule'), zfx(a.pruef.rmseNaiv, 2), zfx(a.pruef.maeNaiv, 2)]], [prognosePruefSatz(a.pruef)]));
  }
  return aus;
}
