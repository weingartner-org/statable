/**
 * Effektstärken mit 95-%-Konfidenzintervall über die nichtzentrale F- und χ²-Verteilung (Inversion: gesucht ist die
 * Nichtzentralität λ, bei der der beobachtete Wert das 97,5- bzw. 2,5-%-Quantil ist) - dieselben Zahlen wie R `effectsize`
 * (`eta_squared`/`F_to_eta2`, `cramers_v`; Vergleichswerte: scripts/effekte-erwartet.R, Tests: effektki.test.ts).
 *
 * ⚠ Von der Fachperson abzunehmen:
 *  - Das Intervall ist ZWEISEITIG (APA, wie in den übrigen Blättern). `effectsize` rechnet standardmäßig einseitig
 *    (`alternative = "greater"`: untere Grenze des 90-%-Intervalls, obere Grenze = 1); wir rechnen wie `alternative = "two.sided"`.
 *  - η² (und R²) folgen `effectsize`: Grenze = λ / (λ + df_Fehler). Steiger (2004) / MBESS `ci.pvaf` teilen durch λ + N; das
 *    Intervall ist dann etwas schmaler und passt nicht mehr zum Punktwert η² = F·df / (F·df + df_Fehler). Die Wahl von `effectsize`
 *    hat den Vorteil, dass der Punktwert immer im Intervall liegt.
 *  - R²-Intervall bei festen Prädiktoren (wie `effectsize::F_to_eta2` auf den Modelltest). Bei zufällig gezogenen Prädiktoren
 *    (MBESS `ci.R2`, Random.Predictors = TRUE) ist das Intervall etwas breiter.
 *  - ω² bekommt hier kein Intervall: `effectsize` gibt für ω² dasselbe Intervall wie für η² aus; das ist keine eigene Schätzung.
 */
import { chi2Nichtzentral, chi2Verteilung, fNichtzentral, fQuantil, fVerteilung } from './power';

const Z975 = 1.959963984540054;

/** Nichtzentralität λ mit cdf(λ) = ziel; cdf fällt mit λ. Bisektion, obere Grenze durch Verdoppeln. */
function lambdaFuer(cdf: (lambda: number) => number, ziel: number): number {
  let hi = 1;
  while (cdf(hi) > ziel && hi < 1e9) hi *= 2;
  let lo = 0;
  // Ist die Mitte schon eine der beiden Grenzen, ändert kein weiterer Schritt mehr etwas (Ergebnis bit-gleich, rund ein Drittel weniger teure Auswertungen)
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (m <= lo || m >= hi) break; if (cdf(m) > ziel) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/** Grenzen [λ_unten, λ_oben] für den beobachteten Wert; 0, wenn der Wert schon unter dem zentralen Quantil liegt (wie `effectsize`). */
function lambdaBereich(zentral: number, cdf: (lambda: number) => number, niveau: number): [number, number] {
  const a = (1 - niveau) / 2;
  const unten = zentral <= 1 - a ? 0 : lambdaFuer(cdf, 1 - a);
  const oben = zentral <= a ? 0 : lambdaFuer(cdf, a);
  return [unten, oben];
}

/** Grenzen der Nichtzentralität λ für einen beobachteten F-Wert mit df1 Zähler- und df2 Nennerfreiheitsgraden. */
export function lambdaF(f: number, df1: number, df2: number, niveau = 0.95): [number, number] {
  return lambdaBereich(fVerteilung(f, df1, df2), l => fNichtzentral(f, df1, df2, l), niveau);
}

/** Grenzen der Nichtzentralität λ für einen beobachteten χ²-Wert mit df Freiheitsgraden. */
export function lambdaChi2(chi2: number, df: number, niveau = 0.95): [number, number] {
  return lambdaBereich(chi2Verteilung(chi2, df), l => chi2Nichtzentral(chi2, df, l), niveau);
}

/** 95-%-Bereich für η² (einfaktorielle ANOVA) bzw. R² (Regression, feste Prädiktoren): λ/(λ + df₂) an den Grenzen von λ. */
export function eta2Bereich(f: number, df1: number, df2: number, niveau = 0.95): [number, number] {
  if (!(f > 0) || !(df1 > 0) || !(df2 > 0)) return [0, 0];
  const [lo, hi] = lambdaF(f, df1, df2, niveau);
  return [lo / (lo + df2), hi / (hi + df2)];
}

/** 95-%-Bereich für Cramérs V: √(λ / (n · stufen)), nach oben auf 1 begrenzt. `stufen` = min(Zeilen, Spalten) − 1. */
export function vBereich(chi2: number, df: number, n: number, stufen: number, niveau = 0.95): [number, number] {
  if (!(chi2 >= 0) || !(df > 0) || !(n > 0) || !(stufen > 0)) return [0, 0];
  const [lo, hi] = lambdaChi2(chi2, df, niveau);
  return [Math.sqrt(lo / (n * stufen)), Math.min(1, Math.sqrt(hi / (n * stufen)))];
}

/** ω² nach Hays (1963): (SS_zwischen − df·MS_innerhalb) / (SS_gesamt + MS_innerhalb), nicht unter 0 (wie `effectsize::omega_squared`). */
export function omega2(ssZwischen: number, dfZwischen: number, ssInnerhalb: number, dfInnerhalb: number): number {
  const msIn = ssInnerhalb / dfInnerhalb;
  return Math.max(0, (ssZwischen - dfZwischen * msIn) / (ssZwischen + ssInnerhalb + msIn));
}

/**
 * Odds Ratio einer 2×2-Tabelle [[a, b], [c, d]] = (a·d)/(b·c) mit Wald-Intervall exp(ln OR ± 1,96·√(1/a + 1/b + 1/c + 1/d)) -
 * wie R `effectsize::oddsratio`. Fehlt in einer Zelle jede Person, ist das Odds Ratio nicht bestimmt (null).
 */
export function oddsRatio2x2(tab: number[][]): { or: number; lo: number; hi: number } | null {
  const [a, b, c, d] = [tab[0]?.[0], tab[0]?.[1], tab[1]?.[0], tab[1]?.[1]];
  if (a === undefined || b === undefined || c === undefined || d === undefined || a <= 0 || b <= 0 || c <= 0 || d <= 0) return null;
  const l = Math.log((a * d) / (b * c)), se = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
  return { or: Math.exp(l), lo: Math.exp(l - Z975 * se), hi: Math.exp(l + Z975 * se) };
}

/**
 * 95-%-Bereich für Cronbachs Alpha nach Feldt (1965; van Zyl, Neudecker & Nel 2000): mit F = 1/(1−α) ist
 * [1 − (1−α)·F₀,₉₇₅, 1 − (1−α)·F₀,₀₂₅] mit df₁ = n − 1 und df₂ = (n − 1)(k − 1), F-Quantile der zentralen F-Verteilung.
 * n = Personen, k = Fragen. Gleiche Formel wie R `psychometric::alpha.CI` (Quelle des Vergleichs: effekte-erwartet.R).
 */
export function alphaBereich(alpha: number, n: number, k: number, niveau = 0.95): [number, number] {
  if (!(n > 2) || !(k > 1) || !(alpha < 1)) return [NaN, NaN];
  const df1 = n - 1, df2 = (n - 1) * (k - 1), a = (1 - niveau) / 2;
  return [1 - (1 - alpha) * fQuantil(1 - a, df1, df2), 1 - (1 - alpha) * fQuantil(a, df1, df2)];
}
