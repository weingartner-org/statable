/**
 * Sätze, APA-Zeile, Tabellen und der R-Text zum Ansehen der Quantilregression (Später S-E, Q1). Zahlen: quantil.ts (R, webR).
 * Regeln (Fachblatt „Entscheidungen Opus“): ganze Sätze je Fall, kein p-Wert beim Bootstrap, kein R¹, Niveau 95 % ausdrücklich, die Tabelle und das Bild nehmen dieselben Intervalle.
 * „Bedingtes Quantil“ - die Aussage gilt für Personen mit demselben Wert der Vorhersagegröße, nicht für eine Person „im 75. Perzentil“. ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { aufzaehlung, ki, iv, proz, zitat as anfuehrung } from '../i18n/profil';
import { ohneNull, kurz, type Saetze } from './ergebnis';
import { tabelle, fx, fp, type Z } from './mwsaetze';
import { spaltenName } from './medmodsaetze';
import { quantilCodeSatz, quantilGerechnet, tauText, kwert, grenzeText, untenWert, obenWert, type QuantilErgebnis, type QuantilKoefInfo, type QuantilCode } from './quantil';
import { rAnzeigeName, rAnzeigeText, rAnzeigeZahl } from '../engine/rsicher';

type Name = (n: string) => string;
const T = L;
const q = (t: string) => anfuehrung(kurz(t));

/** Anzeigename einer Zeile der Tabelle. */
function koefName(e: QuantilErgebnis, k: QuantilKoefInfo, name: Name): string {
  if (k.pIdx < 0) return T('Konstante', 'Constant');
  const p = e.praed[k.pIdx]!;
  return p.art === 'faktor' ? T(`${name(p.name)}: ${k.stufe} (gegen ${p.stufen[0]})`, `${name(p.name)}: ${k.stufe} (vs. ${p.stufen[0]})`) : name(p.name);
}
const tauKurz = (t: number) => (t === 0.5 ? T('Median', 'median') : `τ = ${tauText(t)}`);
const tauBei = (t: number) => (t === 0.5 ? T('beim Median', 'at the median') : T(`bei τ = ${tauText(t)}`, `at τ = ${tauText(t)}`));
const intervallWort = (e: QuantilErgebnis) => (e.ki === 'bootstrap' ? T('95 %-Bootstrap-Intervall, Perzentil', '95% bootstrap interval, percentile') : e.ki === 'nid' ? T('95 %-Konfidenzintervall, nid-Näherung', '95% confidence interval, nid approximation') : T('95 %-Konfidenzintervall, Rang-Umkehr', '95% confidence interval, rank inversion'));

const intervallArt = (e: QuantilErgebnis) => (e.ki === 'bootstrap' ? T('Bootstrap-Intervall, Perzentil', 'bootstrap interval, percentile') : e.ki === 'nid' ? T('Konfidenzintervall, nid-Näherung', 'confidence interval, nid approximation') : T('Konfidenzintervall, Rang-Umkehr', 'confidence interval, rank inversion'));
/** Die Hinweise, die das Ergebnis einschränken, stehen zuerst. */
const VORN: QuantilCode[] = ['rueckfall-rang', 'nid-nur-gross', 'nid-warnung', 'nicht-eindeutig', 'kreuzen'];
export function quantilHinweise(e: QuantilErgebnis): string[] {
  return VORN.filter(c => e.codes.includes(c)).map(c => quantilCodeSatz(c, { n: e.n, p: e.koef.length, anzahl: e.kreuzen.faelle, von: e.n, raster: e.kreuzen.raster, ki: e.ki }));
}
/** Die Werte einer Vorhersagegröße über die τ: „beim Median 0,68 [0,48; 0,91], bei τ = ,25 …“. */
function wertListe(e: QuantilErgebnis, j: number, mitUm = false): string {
  return aufzaehlung(e.erg.map(t => `${tauBei(t.tau)} ${mitUm ? T('um', 'by') + ' ' : ''}${kwert(t.b[j]!)} ${iv(grenzeText(t.unten[j]!, 'unten'), grenzeText(t.oben[j]!, 'oben'))}`));
}
/** Der Satz zu einem Koeffizienten (nie zur Konstanten): die Veränderung des Quantils, mit Zahl und Intervall. Jede Art ein fester Satz. */
function koefSatz(e: QuantilErgebnis, j: number, name: Name): string {
  const k = e.koef[j]!, p = e.praed[k.pIdx]!, Y = q(name(e.ziel)), X = q(name(p.name)), w = wertListe(e, j), wUm = wertListe(e, j, true), iv = intervallWort(e);
  if (p.art === 'faktor') return T(`Der Unterschied in ${Y} zwischen ${anfuehrung(k.stufe)} und ${anfuehrung(p.stufen[0] ?? '')} (${X}) beträgt ${w} (${iv}).`, `The difference in ${Y} between ${anfuehrung(k.stufe)} and ${anfuehrung(p.stufen[0] ?? '')} (${X}) is ${w} (${iv}).`);
  return T(`Mit jeder weiteren Einheit ${X} ändert sich ${Y} (${iv}) ${wUm}.`, `With each additional unit of ${X}, ${Y} changes (${iv}) ${wUm}.`);
}
/** Liegt die Null im Intervall? (Der Bootstrap und die Rang-Umkehr geben kein p; das Intervall zeigt es.) */
const nullDrin = (e: QuantilErgebnis, j: number) => e.erg.filter(t => untenWert(t.unten[j]) <= 0 && obenWert(t.oben[j]) >= 0).map(t => t.tau);

export function saetzeQuantil(e: QuantilErgebnis, name: Name = spaltenName): Saetze {
  const Y = q(name(e.ziel)), taus = aufzaehlung(e.taus.map(tauKurz)), nichtK = e.koef.map((k, j) => ({ k, j })).filter(x => x.k.pIdx >= 0);
  const intro = T(`Für ${Y} wurde die Quantilregression gerechnet (n = ${e.n}; ${taus}).`, `The quantile regression was calculated for ${Y} (n = ${e.n}; ${taus}).`);
  const haupt = [...quantilHinweise(e), intro, ...nichtK.slice(0, 4).map(x => koefSatz(e, x.j, name)), ...(nichtK.length > 4 ? [T('Die übrigen Koeffizienten stehen in der Tabelle.', 'The remaining coefficients are in the table.')] : [])].join(' ');
  const nullSaetze = nichtK.map(x => ({ x, t: nullDrin(e, x.j) })).filter(o => o.t.length).map(o => {
    const p = e.praed[o.x.k.pIdx]!, wer = p.art === 'faktor' ? `${anfuehrung(o.x.k.stufe)} (${q(name(p.name))})` : q(name(p.name)), wann = aufzaehlung(o.t.map(tauKurz));
    return T(`Bei ${wer} liegt die Null im Intervall (${wann}): ein Zusammenhang ist dort nicht belegt.`, `For ${wer} zero lies within the interval (${wann}): a relationship is not shown there.`);
  });
  const ols = nichtK.map(({ k, j }) => {
    const p = e.praed[k.pIdx]!, wer = p.art === 'faktor' ? `${anfuehrung(k.stufe)} (${q(name(p.name))})` : q(name(p.name)), jo = e.koef.indexOf(k);
    return T(`Zum Vergleich ergibt die gewöhnliche Regression (Mittelwert) für ${wer} ${kwert(e.ols.b[jo]!)} ${ki(kwert(e.ols.unten[jo]!), kwert(e.ols.oben[jo]!))}.`, `For comparison, the ordinary regression (mean) gives ${kwert(e.ols.b[jo]!)} ${ki(kwert(e.ols.unten[jo]!), kwert(e.ols.oben[jo]!))} for ${wer}.`);
  }).slice(0, 4);
  const faelle = [T(`Gerechnet wurde mit ${e.n} Fällen.`, `Calculated with ${e.n} cases.`), e.ausgelassen > 0 ? T(`${e.ausgelassen} Zeilen mit Lücken wurden ausgelassen.`, `${e.ausgelassen} rows with gaps were left out.`) : ''].filter(Boolean).join(' ');
  const weitere = e.codes.filter(c => !VORN.includes(c) && c !== 'gewicht').map(c => quantilCodeSatz(c, { n: e.n, p: e.koef.length }));
  const zusatz = [...nullSaetze, ...ols, T('Die Intervalle dieser Seite haben alle dasselbe Niveau von 95 %; sie gelten für das einzelne τ.', 'The intervals on this page all have the same level of 95%; they apply to each single τ.'), faelle, ...weitere].filter(Boolean).join('\n');
  const vorsicht = T('Ein bedingtes Quantil beschreibt die Grenze, unter der ein bestimmter Anteil der Personen mit demselben Wert der Vorhersagegröße liegt - nicht, dass eine Person „im 75. Perzentil“ steht. Je weiter τ am Rand liegt (nahe 0 oder 1), desto weniger Fälle bestimmen die Gerade. Überlappen die Intervalle verschiedener τ, belegt das keinen Unterschied der Steigungen, und es widerlegt ihn nicht; ein Test dafür ist dieser Vergleich nicht. Das Modell beschreibt Zusammenhänge, keine Ursachen.',
    'A conditional quantile describes the limit below which a certain share of the people with the same value of the predictor lie - not that a person stands "in the 75th percentile". The closer τ lies to the edge (near 0 or 1), the fewer cases determine the line. If the intervals of different τ overlap, that does not show a difference of the slopes, and it does not rule one out; this comparison is not a test. The model describes relationships, not causes.');
  const apaKoef = nichtK.slice(0, 4).map(({ k, j }) => { const p = e.praed[k.pIdx]!; return `${kurz(name(p.name), 30)}${p.art === 'faktor' ? ` (${k.stufe})` : ''}: ${e.erg.map(t => `${tauKurz(t.tau)}: b = ${kwert(t.b[j]!)}, ${ki(grenzeText(t.unten[j]!, 'unten'), grenzeText(t.oben[j]!, 'oben'))}`).join('; ')}`; });
  const apa = T(`Quantilregression (${taus}), n = ${e.n}; ${intervallArt(e)}; ${apaKoef.join('; ')}`, `Quantile regression (${taus}), n = ${e.n}; ${intervallArt(e)}; ${apaKoef.join('; ')}`);
  return { haupt, zusatz, vorsicht, apa, marken: [
    { text: T(`Quantilregression: ${taus}`, `Quantile regression: ${taus}`), erklaer: 'quantilregression' },
    { text: e.ki === 'bootstrap' ? T(`Bootstrap-Intervall (${e.B} Ziehungen)`, `Bootstrap interval (${e.B} draws)`) : e.ki === 'nid' ? T('nid-Näherung', 'nid approximation') : T('Rang-Umkehr', 'Rank inversion'), erklaer: 'quantilregression' },
    ...(e.codes.includes('nicht-eindeutig') ? [{ text: T('Lösung nicht eindeutig', 'Solution not unique'), erklaer: 'quantilregression', hinweis: true }] : []),
    ...(e.codes.includes('kreuzen') ? [{ text: T('Geraden kreuzen sich', 'Lines cross'), erklaer: 'quantilregression', hinweis: true }] : []),
    { text: T(`${e.n} Fälle`, `${e.n} cases`), erklaer: 'stichprobe' }
  ] };
}

/* ------------------------------------------------------------------------------------------------ Tabellen */

/** Grenze in der Tabelle: eine offene Grenze steht als „−∞“ bzw. „∞“. */
const gz = (v: number, seite: 'unten' | 'oben'): Z => { const w = seite === 'unten' ? untenWert(v) : obenWert(v); return Number.isFinite(w) ? fx(w, 3) : seite === 'unten' ? '−∞' : '∞'; };
export function tabellenQuantil(e: QuantilErgebnis, name: Name = spaltenName): TableItem[] {
  const Y = name(e.ziel), bootstrap = e.ki === 'bootstrap', nid = e.ki === 'nid';
  const kopf = ['τ', T('Prädiktor', 'Predictor'), 'b', ...(bootstrap ? [T('SE (Bootstrap)', 'SE (bootstrap)')] : nid ? ['SE', 't', 'p'] : []), T('95 %-KI unten', '95% CI lower'), T('95 %-KI oben', '95% CI upper')];
  const zeilen: Z[][] = e.erg.flatMap(t => e.koef.map((k, j) => [tauText(t.tau), koefName(e, k, name), fx(t.b[j]!, 3), ...(bootstrap ? [fx(t.se[j]!, 3)] : nid ? [fx(t.se[j]!, 3), fx(t.t![j]!), fp(t.p![j]!)] : []), gz(t.unten[j]!, 'unten'), gz(t.oben[j]!, 'oben')]));
  const fuss = [
    T(`Abhängige Größe: ${Y}; ${e.n} Fälle; Quantile τ = ${e.taus.map(tauText).join(', ')}. b ist die Veränderung des bedingten Quantils je Einheit der Vorhersagegröße; Gruppen-Spalten: Vergleich mit der ersten Stufe.`,
      `Dependent variable: ${Y}; ${e.n} cases; quantiles τ = ${e.taus.map(tauText).join(', ')}. b is the change of the conditional quantile per unit of the predictor; group columns: compared with the first level.`),
    bootstrap ? T(`Intervalle: Fall-Bootstrap (Paare), ${e.B} Ziehungen, Startwert ${e.startwert}, Perzentil-Intervall mit 95 % Niveau. Der Bootstrap gibt kein p; das Intervall zeigt, ob die Null darin liegt.`, `Intervals: case bootstrap (pairs), ${e.B} draws, seed ${e.startwert}, percentile interval at the 95% level. The bootstrap gives no p; the interval shows whether zero lies within it.`)
      : nid ? T('Intervalle: nid-Näherung (Hendricks und Koenker 1992), t-Verteilung mit n − p Freiheitsgraden, 95 % Niveau.', 'Intervals: nid approximation (Hendricks and Koenker 1992), t distribution with n − p degrees of freedom, 95% level.')
        : T('Intervalle: Rang-Umkehr (Koenker 1994) mit ungleicher Streuung, 95 % Niveau; asymmetrisch, ohne Standardfehler und ohne p.', 'Intervals: rank inversion (Koenker 1994) with unequal spread, 95% level; asymmetric, without standard error and without p.')
  ];
  const koef = tabelle('Quantile Regression Coefficients', T('Quantilregression: Koeffizienten', 'Quantile regression: coefficients'), kopf, zeilen, fuss);
  const ols = tabelle('Quantile Regression OLS Comparison', T('Zum Vergleich: gewöhnliche Regression (Mittelwert)', 'For comparison: ordinary regression (mean)'),
    [T('Prädiktor', 'Predictor'), 'b', 'SE', T('95 %-KI unten', '95% CI lower'), T('95 %-KI oben', '95% CI upper')],
    e.koef.map((k, j) => [koefName(e, k, name), fx(e.ols.b[j]!, 3), fx(e.ols.se[j]!, 3), fx(e.ols.unten[j]!, 3), fx(e.ols.oben[j]!, 3)]),
    [T(`Gewöhnliche Regression auf denselben ${e.n} Fällen: R² = ${ohneNull(e.ols.r2)}, ${e.ols.df} Freiheitsgrade. R² gehört nur zu dieser Regression; die Quantilregression hat kein R².`,
      `Ordinary regression on the same ${e.n} cases: R² = ${ohneNull(e.ols.r2)}, ${e.ols.df} degrees of freedom. R² belongs to this regression only; the quantile regression has no R².`)]);
  return [koef, ols];
}

/** „Warum dieses Verfahren?“ */
export const quantilWarum = (): string => T('Die Quantilregression sagt nicht den Mittelwert voraus, sondern den Median oder ein anderes Quantil. Sie zeigt, ob der Zusammenhang am oberen und unteren Rand der Verteilung anders verläuft als in der Mitte, und ist robuster gegen Ausreißer im Ziel und gegen schiefe Verteilungen als die gewöhnliche Regression. Sie nimmt keine gleiche Streuung an. Die Intervalle rechnet Statable mit dem Bootstrap (bis 1000 Fälle), darüber mit der nid-Näherung.',
  'Quantile regression does not predict the mean but the median or another quantile. It shows whether the relationship runs differently at the upper and lower edge of the distribution than in the middle, and it is more robust against outliers in the target and against skewed distributions than ordinary regression. It assumes no equal spread. Statable calculates the intervals with the bootstrap (up to 1000 cases) and above that with the nid approximation.');
/** Das Verfahren in einem Satzteil. */
export const quantilFachwort = (): string => T('Quantilregression (Median und andere Quantile)', 'quantile regression (median and other quantiles)');
export const quantilGerechnetBlatt = (e: QuantilErgebnis): string => quantilGerechnet({ n: e.n, ki: e.ki, B: e.B, startwert: e.startwert });

/* ------------------------------------------------------------------------------------------------ R-Text zum Ansehen */

const rn = rAnzeigeName, rs = rAnzeigeText, rz = rAnzeigeZahl;
/** Der gleiche Aufruf in R (wird nie ausgeführt; Namen und Texte aus den Daten werden maskiert). */
export function quantilRCode(e: { ziel: string; praed: { name: string; art: 'zahl' | 'faktor'; stufen: string[] }[]; taus: number[]; ki: 'bootstrap' | 'nid' | 'rang'; B: number; startwert: number }): string {
  const gruppen = e.praed.filter(p => p.art === 'faktor').map(p => `daten$${rn(p.name)} <- factor(daten$${rn(p.name)}, levels = c(${p.stufen.map(rs).join(', ')}))   # ${T('erste Stufe = Vergleichsgruppe', 'first level = reference group')}`);
  const f = e.praed.map(p => rn(p.name)).join(' + '), tau = e.taus.length === 1 ? rz(e.taus[0]) : `c(${e.taus.map(rz).join(', ')})`;
  const iv = e.ki === 'bootstrap'
    ? [`X <- model.matrix(~ ${f}, data = daten)   # ${T('nur vollständige Fälle', 'complete cases only')}`, `y <- daten$${rn(e.ziel)}`, 'RNGkind("Mersenne-Twister", "Inversion", "Rejection")',
      `for (t in ${tau}) { set.seed(${e.startwert}); B <- boot.rq(X, y, tau = t, R = ${e.B}, bsmethod = "xy")$B   # ${T('Fall-Bootstrap (Paare)', 'case bootstrap (pairs)')}`,
      `  print(apply(B, 2, function(z) boot:::norm.inter(z, c(.025, .975))[, 2])) }   # ${T('Perzentil-Intervall, wie Statable es rechnet', 'percentile interval, as Statable calculates it')}`]
    : e.ki === 'nid' ? [`summary(m, se = "nid")   # ${T('Hendricks und Koenker (1992), t-Verteilung', 'Hendricks and Koenker (1992), t distribution')}`]
      : [`summary(m, se = "rank", alpha = 0.05, iid = FALSE)   # ${T('95 %, ungleiche Streuung (die Voreinstellung wäre 90 % mit gleicher Streuung)', '95%, unequal spread (the default would be 90% with equal spread)')}`];
  return [
    T('# Der gleiche Aufruf in R (Paket quantreg), mit den Einstellungen, die Statable benutzt:', '# The same call in R (package quantreg), with the settings Statable uses:'), 'library(quantreg)', ...gruppen,
    `m <- rq(${rn(e.ziel)} ~ ${f}, tau = ${tau}, data = daten, method = "br")   # ${T('Simplex nach Barrodale und Roberts', 'simplex of Barrodale and Roberts')}`,
    'coef(m)', ...iv,
    T(`# Niveau 95 % setzt Statable ausdrücklich (${proz('95')}); die Voreinstellung von summary.rq wäre ein anderes Intervall.`, `# Statable sets the level of 95% explicitly (${proz('95')}); the default of summary.rq would be a different interval.`)
  ].join('\n');
}
