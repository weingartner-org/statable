/**
 * „Dieses Modell auf andere Daten anwenden“ (Fachblatt docs/fachblaetter/GLAETTUNG-SERIEN.md, Abschnitt 5): Ein gerechnetes ARIMA-Modell der Prognose wird mit denselben Koeffizienten auf eine andere Spalte
 * oder auf dieselbe Spalte mit neuen Zeilen angewandt. Nichts wird neu geschätzt (R: `arima(..., fixed = b, transform.pars = FALSE)`, engine/statable-glaettung.R: `sp_prognose_neu`); Streuung, Ljung-Box-Test und Prognose
 * kommen von den neuen Daten. Es gibt keine Standardfehler der Koeffizienten und keinen AICc. Hier stehen die Sperren, der Aufruf, das Lesen der Antwort, Sätze, Warnungen, Tabellen und der R-Text zum Ansehen.
 * Gespeichert wird alles am Ergebnis des Blatts (`ZeitreiheE.neu`), damit Bericht und Export ohne R stimmen.
 * SICHERHEIT: Der Aufruf enthält nur feste Wörter und Zahlen (rGanz, rBool, rZahl); die neue Reihe geht als Spalte `y` der Tabelle `d` hinein, die Koeffizienten als Zahlen über rZahl, nie als Text aus Dateien.
 */
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { komma, pWert } from './ergebnis';
import { zitat } from '../i18n/profil';
import { tabelle, fx, type Z } from './mwsaetze';
import { rGanz, rBool, rZahl, rFange, rAnzeigeName, rAnzeigeZahl } from '../engine/rsicher';
import type { RAufruf } from './kategreg';
import type { Raster } from './zeitreihe';
import { PROG_LUECKEN_MAX, horizontMax, logMoeglich, parameterName, prognoseLesen, prognoseCodeSatz, prognoseLjungSatz, prognoseModellText, type PrognoseAntwort, type PrognoseE } from './prognose';

/** Die Beschriftungen (label) der Tabellen, damit das Blatt sie in ihrem Abschnitt zeigt. */
export const NEU_LABELS: readonly string[] = ['Neue-Daten-Prognose', 'Neue-Daten-Modell'];

/** Das angewandte Modell: Ordnung, Konstante und die festen Koeffizienten in der Reihenfolge von arima. */
export interface NeuModell { p: number; d: number; q: number; P: number; D: number; Q: number; konst: boolean; drift: boolean; log: boolean; periode: number; namen: string[]; b: number[] }
/** Die neue Reihe, wie sie gerechnet wurde (nur, was Bild, Tabellen und Sätze brauchen). */
export interface NeuReihe { spalte: string; raster: Raster; periode: number; erster: string; t: number[]; y: (number | null)[]; luecken: number }
/** Das, was am Blatt gespeichert wird. `von`: die Spalte, an der das Modell geschätzt wurde. */
export interface NeuE { von: string; modell: NeuModell; reihe: NeuReihe; h: number; antwort: PrognoseAntwort }

export type NeuCode = 'zu-viele-luecken' | 'ungleich' | 'alle-gleich' | 'zu-kurz' | 'periode' | 'log-nicht-positiv' | 'modell-passt-nicht' | 'kein-modell' | 'r-fehler';

/** Das Modell aus einer gerechneten Prognose; null, wenn es kein geschätztes ARIMA-Modell ist (Glättung) oder die Koeffizienten fehlen. */
export function neuModell(p: PrognoseE): NeuModell | null {
  const a = p.antwort;
  if (a.art !== 'arima' || a.neu) return null;
  if (a.namen.length !== a.b.length || a.b.some(v => !Number.isFinite(v))) return null;
  return { p: a.p, d: a.d, q: a.q, P: a.P, D: a.D, Q: a.Q, konst: a.konst, drift: a.drift, log: a.log, periode: a.periode, namen: [...a.namen], b: [...a.b] };
}
/** Zu kurz für die Ordnung: T ≤ d + m D + p + m P + 1 (m = Periode des Modells, nur mit Saisonteil). */
export function neuMindestLaenge(m: NeuModell): number {
  const mm = m.P + m.D + m.Q > 0 ? m.periode : 1;
  return m.d + mm * m.D + m.p + mm * m.P + 1;
}
/** Warum das Modell nicht auf diese Reihe angewandt wird (oder null). Lücken bis 10 % gehen wie bei „ARIMA selbst wählen“; die Log-Skala braucht Werte über 0; die Reihe muss länger sein als die Ordnung. */
export function neuSperre(m: NeuModell, r: { raster: Raster; periode: number; y: (number | null)[] }): NeuCode | null {
  const w = r.y.filter((v): v is number => v !== null);
  if (r.y.length > 0 && (r.y.length - w.length) / r.y.length > PROG_LUECKEN_MAX) return 'zu-viele-luecken';
  if (r.raster === 'ungleich') return 'ungleich';
  if (w.length > 0 && w.every(v => v === w[0])) return 'alle-gleich';
  if (m.log && !logMoeglich({ raster: r.raster, periode: r.periode, y: r.y })) return 'log-nicht-positiv';
  if (r.y.length <= neuMindestLaenge(m) || w.length < 2) return 'zu-kurz';
  if (m.P + m.D + m.Q > 0 && r.periode !== m.periode) return 'periode';
  return null;
}
/** Horizont: wie bei der Prognose, nie über dem Höchsten dieser Reihe. */
export const neuHorizont = (h: number, T: number, m: number): number => Math.max(1, Math.min(h, horizontMax(T, m)));

export function neuCodeSatz(c: NeuCode, ctx: { modell?: number; neu?: number } = {}): string {
  switch (c) {
    case 'zu-viele-luecken': return prognoseCodeSatz('zu-viele-luecken');
    case 'ungleich': return prognoseCodeSatz('ungleich');
    case 'alle-gleich': return prognoseCodeSatz('alle-gleich');
    case 'zu-kurz': return L('Die neuen Daten sind für die Ordnung dieses Modells zu kurz.', 'The new data are too short for the order of this model.');
    case 'periode': return L(`Das Modell hat einen Saisonteil mit der Periode ${ctx.modell ?? ''}, die neuen Daten haben die Periode ${ctx.neu ?? ''}. Dann passt das Modell nicht.`, `The model has a seasonal part with period ${ctx.modell ?? ''}, the new data have period ${ctx.neu ?? ''}. The model then does not fit.`);
    case 'log-nicht-positiv': return L('Das Modell rechnet auf der Log-Skala; die neuen Daten haben Werte von 0 oder darunter.', 'The model works on the log scale; the new data have values of 0 or below.');
    case 'modell-passt-nicht': return L('Das Modell lässt sich mit diesen festen Koeffizienten auf die neuen Daten nicht anwenden.', 'The model cannot be applied to the new data with these fixed coefficients.');
    case 'kein-modell': return L('Die Prognose hat noch kein Modell, das sich anwenden ließe.', 'The forecast has no model yet that could be applied.');
    case 'r-fehler': return L('R meldete beim Anwenden des Modells einen Fehler.', 'R reported an error when applying the model.');
  }
}
export const neuHilfeSatz = (): string => L('Das Modell wird mit denselben Koeffizienten auf andere Werte angewandt. Nichts wird neu geschätzt. Das gilt zum Beispiel, wenn zu denselben Zeilen eine andere Spalte gehört oder wenn neue Zeilen dazugekommen sind.', 'The model is applied with the same coefficients to other values. Nothing is estimated anew. That fits, for example, another column on the same rows or new rows that have been added.');

/* ---------------------------------------------------------------- Aufruf an R */
/** Der Aufruf an `sp_prognose_neu`; die neue Reihe steht als Spalte `y` in der Tabelle `d`, die Koeffizienten gehen als Zahlen hinein. `m`: Periode der neuen Reihe. */
export function neuAufruf(mo: NeuModell, m: number, h: number): RAufruf {
  const rTeilB = mo.b.length ? `c(${mo.b.map(rZahl).join(', ')})` : 'numeric(0)';
  return { code: rFange(`sp_prognose_neu(d$y, ${rGanz(m)}, ${rGanz(h)}, ${rBool(mo.log)}, ${rGanz(mo.p)}, ${rGanz(mo.d)}, ${rGanz(mo.q)}, ${rGanz(mo.P)}, ${rGanz(mo.D)}, ${rGanz(mo.Q)}, ${rBool(mo.konst)}, ${rTeilB})`), args: {} };
}
const CODES: readonly string[] = ['zu-viele-luecken', 'ungleich', 'alle-gleich', 'zu-kurz', 'log-nicht-positiv', 'modell-passt-nicht', 'kein-modell'];
/** Die Antwort von R lesen: Fehlerkennwörter zu Codes, sonst wie bei der Prognose. Wirft nie. */
export function neuLesen(roh: unknown): { ok: true; antwort: PrognoseAntwort } | { ok: false; code: NeuCode } {
  const f = roh && typeof roh === 'object' ? (roh as { fehler?: unknown }).fehler : undefined;
  if (f !== undefined) { const t = String(Array.isArray(f) ? f[0] : f); return { ok: false, code: (CODES.includes(t) ? t : 'r-fehler') as NeuCode }; }
  const l = prognoseLesen(roh);
  return l.ok ? l : { ok: false, code: 'r-fehler' };
}

/* ---------------------------------------------------------------- Sätze und Warnungen */
export interface NeuSatzEin { name: string; zeiten: string[]; stellen: number }
/** Der Hauptsatz für Blatt und Bericht: welches Modell auf welche Daten angewandt wurde und was herauskam. */
export function neuHauptsatz(n: NeuE, s: NeuSatzEin): string {
  const a = n.antwort, k = a.mittel.length, f = (v: number) => komma(v, s.stellen), modell = prognoseModellText(a);
  const kopf = L(`Das Modell ${modell}, geschätzt an ${zitat(n.von)}, wurde ohne Neuschätzung auf ${s.name} angewandt. Streuung, Ljung-Box-Test und Prognose kommen von den neuen Daten.`,
    `The model ${modell}, estimated on ${zitat(n.von)}, was applied to ${s.name} without re-estimation. Spread, Ljung-Box test and forecast come from the new data.`);
  const iv = L('95-%-Prognoseintervall', '95% prediction interval');
  const erste = `${s.zeiten[0] ?? ''}: ${f(a.mittel[0]!)} (${iv} [${f(a.u95[0]!)}; ${f(a.o95[0]!)}])`;
  if (k === 1) return `${kopf} ${L(`Prognose für ${erste}.`, `Forecast for ${erste}.`)}`;
  const letzte = `${s.zeiten[k - 1] ?? ''}: ${f(a.mittel[k - 1]!)} (${iv} [${f(a.u95[k - 1]!)}; ${f(a.o95[k - 1]!)}])`;
  return `${kopf} ${L(`Die Prognose reicht über ${k} Zeitpunkte. Zuerst ${erste}, zuletzt ${letzte}.`, `The forecast covers ${k} points in time. First ${erste}, last ${letzte}.`)}`;
}
export const neuLjungSatz = prognoseLjungSatz;
export type NeuWarnCode = 'nicht-neu' | 'veraenderung' | 'ljung' | 'luecken' | 'log';
export interface NeuWarnung { code: NeuWarnCode; satz: string }
/** Die Warnungen des Fachblatts, immer sichtbar: nichts wurde neu geschätzt, eine Veränderung erkennt die Rechnung nicht von selbst; dazu bedingt Ljung-Box, Lücken und Log-Skala. Sachlich, ohne zu beruhigen. */
export function neuWarnungen(n: NeuE, T: number): NeuWarnung[] {
  const a = n.antwort, aus: NeuWarnung[] = [];
  aus.push({ code: 'nicht-neu', satz: L('Das Modell wurde nicht neu geschätzt. Das ist nur sinnvoll, wenn die neuen Daten dasselbe messen und sich das Muster nicht verändert hat.', 'The model was not estimated anew. That makes sense only if the new data measure the same thing and the pattern has not changed.') });
  aus.push({ code: 'veraenderung', satz: L('Eine Veränderung erkennt diese Rechnung nicht von selbst; der Ljung-Box-Test ist ein erster Hinweis.', 'This calculation does not detect a change by itself; the Ljung-Box test is a first hint.') });
  if (a.ljung && a.ljung.p < 0.05) aus.push({ code: 'ljung', satz: L(`Die Residuen hängen noch zusammen (Ljung-Box, p ${pWert(a.ljung.p)}): Das Modell erfasst das Muster der neuen Daten nicht, und die Intervalle sind unzuverlässig.`, `The residuals are still related (Ljung-Box, p ${pWert(a.ljung.p)}): the model does not capture the pattern of the new data, and the intervals are unreliable.`) });
  const k = n.reihe.luecken;
  if (k > 0) aus.push({ code: 'luecken', satz: Lp(k, `Die neue Reihe hat ${k} Lücke von ${T} Zeitpunkten. Das Modell rechnet über die Lücke hinweg und füllt nichts auf.`, `Die neue Reihe hat ${k} Lücken von ${T} Zeitpunkten. Das Modell rechnet über die Lücken hinweg und füllt nichts auf.`,
    `The new series has ${k} gap in ${T} points in time. The model calculates across the gap and fills in nothing.`, `The new series has ${k} gaps in ${T} points in time. The model calculates across the gaps and fills in nothing.`) });
  if (a.log) aus.push({ code: 'log', satz: L('Prognose und Grenzen sind von der Log-Skala zurückgerechnet: Die Prognose ist ein Median, kein Mittelwert.', 'Forecast and limits are back-transformed from the log scale: the forecast is a median, not a mean.') });
  return aus;
}
export function neuApa(n: NeuE): string {
  const a = n.antwort, t: string[] = [`${prognoseModellText(a)} (${L('ohne Neuschätzung', 'without re-estimation')})`];
  if (a.sigma2 !== null) t.push(`σ² = ${komma(a.sigma2, 4)}`);
  if (a.rmse !== null) t.push(`RMSE = ${komma(a.rmse, 2)}`);
  if (a.ljung) t.push(`Ljung-Box Q(${a.ljung.h}) = ${komma(a.ljung.q, 2)}, df = ${komma(a.ljung.h, 0)}, p ${pWert(a.ljung.p)}`);
  return t.join(', ');
}

/* ---------------------------------------------------------------- Tabellen */
const zfx = (v: number | null, d: number): Z => (v === null || !Number.isFinite(v) ? '-' : fx(v, d));
export function neuTabellen(n: NeuE, ein: NeuSatzEin): TableItem[] {
  const a = n.antwort, st = ein.stellen, k = a.mittel.length;
  const prog = tabelle('Neue-Daten-Prognose', L(`Prognose ${ein.name} mit dem Modell von ${zitat(n.von)}`, `Forecast ${ein.name} with the model of ${zitat(n.von)}`),
    [L('Zeitpunkt', 'Point in time'), L('Prognose', 'Forecast'), L('80 % unten', '80% lower'), L('80 % oben', '80% upper'), L('95 % unten', '95% lower'), L('95 % oben', '95% upper')],
    Array.from({ length: k }, (_, i) => [ein.zeiten[i] ?? String(i + 1), zfx(a.mittel[i]!, st), zfx(a.u80[i]!, st), zfx(a.o80[i]!, st), zfx(a.u95[i]!, st), zfx(a.o95[i]!, st)]),
    [a.log ? L('Die Grenzen sind Prognoseintervalle der Normalverteilung auf der Log-Skala, zurückgerechnet; die Prognose ist ein Median.', 'The limits are prediction intervals of the normal distribution on the log scale, back-transformed; the forecast is a median.') : L('Die Grenzen sind Prognoseintervalle der Normalverteilung (stats::predict).', 'The limits are prediction intervals of the normal distribution (stats::predict).')]);
  const zeilen: Z[][] = a.namen.map((nm, i) => [parameterName(nm), zfx(a.b[i]!, 4)]);
  if (!zeilen.length) zeilen.push([L('(keine Parameter)', '(no parameters)'), '-']);
  const g: Z[][] = [];
  if (a.sigma2 !== null) g.push(['σ²', zfx(a.sigma2, 4)]);
  if (a.loglik != null) g.push([L('log-Likelihood', 'log-likelihood'), zfx(a.loglik, 2)]);
  if (a.rmse !== null) g.push(['RMSE', zfx(a.rmse, 2)]);
  if (a.mae !== null) g.push(['MAE', zfx(a.mae, 2)]);
  if (a.ljung) g.push([`Ljung-Box Q(${a.ljung.h})`, zfx(a.ljung.q, 2)], [L('Freiheitsgrade', 'Degrees of freedom'), { t: komma(a.ljung.h, 0), n: a.ljung.h }], ['p', { t: pWert(a.ljung.p).replace(/^= /, ''), n: a.ljung.p }]);
  const modell = tabelle('Neue-Daten-Modell', L(`Modell: ${prognoseModellText(a)}`, `Model: ${prognoseModellText(a)}`), [L('Koeffizient (fest)', 'Coefficient (fixed)'), L('Wert', 'Value')], [...zeilen, ...g],
    [L('Die Koeffizienten stammen aus der Schätzung an der ursprünglichen Reihe und wurden an den neuen Daten nicht geschätzt; darum gibt es keine Standardfehler und keinen AICc. σ², Ljung-Box und Prognose kommen von den neuen Daten.', 'The coefficients come from the estimation on the original series and were not estimated on the new data; so there are no standard errors and no AICc. σ², Ljung-Box and the forecast come from the new data.')]);
  return [prog, modell];
}

/* ---------------------------------------------------------------- R-Text zum Ansehen (wird nie ausgeführt) */
/** Der R-Aufruf zum Nachrechnen: `arima` mit festen Koeffizienten (`fixed`, `transform.pars = FALSE`) und `predict`. Spaltenname nur über rAnzeigeName, Zahlen über rAnzeigeZahl. */
export function neuRCode(n: NeuE): string {
  const a = n.antwort, mo = n.modell, m = n.reihe.periode, h = a.mittel.length;
  const saison = mo.P + mo.D + mo.Q > 0, reihe = mo.log ? 'log(y)' : 'y', dd = mo.d + mo.D;
  const kname = (i: number): string => { const z = mo.namen[i] ?? ''; return /^[a-z]+\d*$/.test(z) ? z : 'k' + (i + 1); };   // nur Namen wie ar1, ma1, sma1, intercept, drift (aus arima), sonst k1, k2 …
  const koeff = mo.b.map((v, i) => kname(i) + ' = ' + rAnzeigeZahl(v)).join(', ');
  const ordnung = `order = c(${rAnzeigeZahl(mo.p)}, ${rAnzeigeZahl(mo.d)}, ${rAnzeigeZahl(mo.q)})${saison ? `, seasonal = list(order = c(${rAnzeigeZahl(mo.P)}, ${rAnzeigeZahl(mo.D)}, ${rAnzeigeZahl(mo.Q)}), period = ${rAnzeigeZahl(mo.periode)})` : ''}`;
  const mittel = dd === 0 ? `, include.mean = ${mo.konst ? 'TRUE' : 'FALSE'}` : '';
  const xreg = mo.drift ? ', xreg = seq_along(y)' : '';
  const vor = mo.drift ? `predict(fit, n.ahead = ${rAnzeigeZahl(h)}, newxreg = ${rAnzeigeZahl(n.reihe.y.length)} + seq_len(${rAnzeigeZahl(h)}))` : `predict(fit, n.ahead = ${rAnzeigeZahl(h)})`;
  return [`# ${L('daten: die Tabelle in R', 'daten: your table in R')}`, `y <- ts(daten$${rAnzeigeName(n.reihe.spalte)}, frequency = ${rAnzeigeZahl(m)})`,
    `b <- c(${koeff})   # ${L('fest übernommen, nicht neu geschätzt', 'taken over as fixed, not estimated anew')}`,
    `fit <- arima(${reihe}, ${ordnung}${mittel}${xreg}, fixed = unname(b), transform.pars = FALSE)`, `p <- ${vor}`, mo.log ? `exp(p$pred)   # ${L('Median', 'median')}` : 'p$pred'].join('\n');
}
