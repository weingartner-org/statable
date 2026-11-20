/**
 * Texte zum Bayes-Faktor (Zusatzzeile im Ergebnis, nur wenn in den Einstellungen eingeschaltet).
 * Rechnung: bayes.ts. ⚠ Satz-Vorlagen, Schwellen (Lee & Wagenmakers 2013) und Schreibweise von der Fachperson abzunehmen.
 */
import { L } from './sitzung.svelte';
import { komma } from './ergebnis';
import { bfAnova, bfGepaart, bfKorrelation, bfRegression, bfStufe, bfUnabhaengig, R_ANOVA, R_REGRESSION, R_STANDARD, type BfStufe } from './bayes';
import type { ZweiGruppen, PraePost, Zusammenhang, Vorhersage, Anova } from './ergebnis';

const T = L;

export interface BayesZeile {
  bf10: number;
  /** Kurzform für APA-Zeile und Zeilenkopf: „BF₁₀ = 8,4“ bzw. „BF₀₁ = 4,8“ */
  kurz: string;
  /** Zeilenkopf mit Einordnung */
  kopf: string;
  satz: string;
  einordnung: string;
  fachleute: string;
}

const HOCH = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** BF für die Anzeige: unter 100 eine Nachkommastelle, bis 1000 ganzzahlig, darüber 1,2 × 10¹². */
export function bfText(x: number): string {
  if (!Number.isFinite(x)) return '> 1 × 10³⁰⁰';
  if (x < 100) return komma(x, 1);
  if (x < 1000) return komma(Math.round(x), 0);
  const e = Math.floor(Math.log10(x)), m = x / 10 ** e;
  return `${komma(m, 1)} × 10${String(e).split('').map(c => HOCH[Number(c)]).join('')}`;
}
/** „etwa 8-mal“: ab 3 ganzzahlig, darunter eine Stelle, ab 1000 „mehr als 1000-mal“. */
function malText(f: number): string {
  if (f >= 1000) return T('mehr als 1000-mal', 'more than 1000 times');
  const z = f >= 3 ? komma(Math.round(f), 0) : komma(f, 1);
  return T(`etwa ${z}-mal`, `about ${z} times`);
}
const stufeWort = (s: BfStufe) => s === 'anekdotisch' ? L('anekdotische', 'anecdotal') : s === 'moderat' ? L('moderate', 'moderate') : s === 'stark' ? L('starke', 'strong') : s === 'sehr-stark' ? L('sehr starke', 'very strong') : L('extreme', 'extreme');

/** `was`: Substantiv für H₁ im Satz, z. B. „eines Unterschieds“ / „a difference“; `ohne` entsprechend „ohne Unterschied“. */
function zeile(bf10: number, w: { h1: () => string; h0: () => string }, fachleute: string): BayesZeile {
  const { stufe, fuer } = bfStufe(bf10), f = bf10 >= 1 ? bf10 : 1 / bf10;
  const kurz = bf10 >= 1 ? `BF₁₀ = ${bfText(bf10)}` : `BF₀₁ = ${bfText(1 / bf10)}`;
  // T25: BF gerundet 1,0 - weder für noch gegen (Lee & Wagenmakers 2013: „no evidence“), nicht „1,0-mal wahrscheinlicher … Evidenz für H₁“.
  const eins = bfText(f) === bfText(1);
  const satz = eins
    ? T(`${kurz} - die Daten sind unter beiden Annahmen etwa gleich wahrscheinlich.`, `${kurz} - the data are about equally likely under both assumptions.`)
    : bf10 >= 1
    ? T(`${kurz} - die Daten sind ${malText(f)} wahrscheinlicher unter der Annahme ${w.h1()} als ohne.`, `${kurz} - the data are ${malText(f)} more likely under the assumption of ${w.h1()} than without.`)
    : T(`${kurz} (BF₁₀ = ${komma(bf10, 2)}) - die Daten sind ${malText(f)} wahrscheinlicher ${w.h0()} als unter der Annahme ${w.h1()}.`,
      `${kurz} (BF₁₀ = ${komma(bf10, 2)}) - the data are ${malText(f)} more likely ${w.h0()} than under the assumption of ${w.h1()}.`);
  const wort = stufeWort(stufe);
  const lager = fuer === 'H0' ? T('für H₀', 'for H₀') : T('für H₁', 'for H₁');
  const einordnung = T(`Einordnung nach Lee und Wagenmakers (2013): ${wort} Evidenz ${lager}. Ein Bayes-Faktor bewertet beide Annahmen gegeneinander; er sagt nicht, wie wahrscheinlich eine von ihnen ist.`,
    `Classification according to Lee and Wagenmakers (2013): ${wort} evidence ${lager}. A Bayes factor weighs the two assumptions against each other; it does not give the probability of either.`);
  if (eins) return { bf10, kurz, kopf: `${kurz} · ${T('keine Seite belegt', 'inconclusive')}`, satz,
    einordnung: T('Ein Bayes-Faktor nahe 1 spricht weder für noch gegen einen Effekt (Lee und Wagenmakers, 2013). Ein Bayes-Faktor bewertet beide Annahmen gegeneinander; er sagt nicht, wie wahrscheinlich eine von ihnen ist.',
      'A Bayes factor close to 1 favors neither side (Lee and Wagenmakers, 2013). A Bayes factor weighs the two assumptions against each other; it does not give the probability of either.'), fachleute };
  return { bf10, kurz, kopf: `${kurz} · ${wort} ${T('Evidenz', 'evidence')} ${lager}`, satz, einordnung, fachleute };
}

const WORT_UNT = { h1: () => L('eines Unterschieds', 'a difference'), h0: () => L('ohne Unterschied', 'without a difference') };
const WORT_VER = { h1: () => L('einer Veränderung', 'a change'), h0: () => L('ohne Veränderung', 'without a change') };
const WORT_ZUS = { h1: () => L('eines Zusammenhangs', 'a relationship'), h0: () => L('ohne Zusammenhang', 'without a relationship') };
const rtxt = () => komma(R_STANDARD, 3);

export function bayesZweiGruppen(e: ZweiGruppen): BayesZeile | null {
  const bf = bfUnabhaengig(e.tKlassisch, e.a.n, e.b.n);
  if (Number.isNaN(bf)) return null;
  return zeile(bf, WORT_UNT, T(
    `JZS-Bayes-Faktor für den zweiseitigen t-Test bei unabhängigen Stichproben (Rouder et al., 2009): H₁ nimmt eine Effektstärke δ an, Cauchy-verteilt mit Skala r = √2/2 ≈ ${rtxt()} (Standard in JASP und im R-Paket BayesFactor); H₀: δ = 0. Grundlage ist der Student-t-Wert (t(${e.dfKlassisch}) = ${komma(e.tKlassisch)}, gleiche Streuung angenommen), nicht die Welch-Zeile; das Welch-Ergebnis oben bleibt unverändert.`,
    `JZS Bayes factor for the two-sided independent-samples t test (Rouder et al., 2009): H₁ assumes an effect size δ with a Cauchy prior of scale r = √2/2 ≈ ${rtxt()} (default in JASP and the R package BayesFactor); H₀: δ = 0. It is based on the Student t value (t(${e.dfKlassisch}) = ${komma(e.tKlassisch)}, equal variances assumed), not on the Welch row; the Welch result above is unchanged.`));
}
export function bayesPraePost(e: PraePost): BayesZeile | null {
  const bf = bfGepaart(e.t, e.n);
  if (Number.isNaN(bf)) return null;
  return zeile(bf, WORT_VER, T(
    `JZS-Bayes-Faktor für den zweiseitigen t-Test bei gepaarten Stichproben (Rouder et al., 2009): H₁ nimmt eine standardisierte Veränderung δ an, Cauchy-verteilt mit Skala r = √2/2 ≈ ${rtxt()} (Standard in JASP und im R-Paket BayesFactor); H₀: δ = 0. Grundlage: t(${e.df}) = ${komma(e.t)}, n = ${e.n}.`,
    `JZS Bayes factor for the two-sided paired-samples t test (Rouder et al., 2009): H₁ assumes a standardized change δ with a Cauchy prior of scale r = √2/2 ≈ ${rtxt()} (default in JASP and the R package BayesFactor); H₀: δ = 0. Based on t(${e.df}) = ${komma(e.t)}, n = ${e.n}.`));
}
/** Nur für die Korrelation nach Pearson - bei Spearman und Kendall gibt es hier keinen Bayes-Faktor. */
export function bayesZusammenhang(e: Zusammenhang): BayesZeile | null {
  if ((e.methode ?? 'pearson') !== 'pearson' || e.kontroll?.length) return null;
  const bf = bfKorrelation(e.r, e.n);
  if (Number.isNaN(bf)) return null;
  return zeile(bf, WORT_ZUS, T(
    `Bayes-Faktor für die Korrelation nach Pearson (Ly, Verhagen & Wagenmakers, 2016): H₁ nimmt ρ gleichverteilt über −1 bis 1 an (gestreckte Beta-Verteilung mit κ = 1, wie in JASP); H₀: ρ = 0. Grundlage: r = ${komma(e.r, 3)}, n = ${e.n}. Das R-Paket BayesFactor nimmt in der Voreinstellung einen engeren Prior (rscale = 1/3) an; mit rscale = 1 stimmt es überein.`,
    `Bayes factor for the Pearson correlation (Ly, Verhagen & Wagenmakers, 2016): H₁ assumes ρ uniformly distributed from −1 to 1 (stretched beta prior with κ = 1, as in JASP); H₀: ρ = 0. Based on r = ${komma(e.r, 3)}, n = ${e.n}. The R package BayesFactor uses a narrower prior by default (rscale = 1/3); with rscale = 1 it agrees.`));
}

/**
 * Lineare Regression (S-H, 22.10.): Bayes-Faktor des GANZEN Modells gegen das Modell nur mit Konstante, wenn alle Prädiktoren Zahlen sind (bei Gruppen-Prädiktoren gilt in BayesFactor und JASP ein anderer Prior).
 * ⚠ Vorannahme (Prior) von der Fachperson abzunehmen: JZS-Prior mit Skala r = √2/4 ≈ 0,354 („medium“ wie BayesFactor und JASP).
 */
export function bayesVorhersage(e: Vorhersage): BayesZeile | null {
  if (e.faktoren?.length || e.praediktoren.some(p => p.faktor)) return null;
  const p = e.df1, n = e.df1 + e.df2 + 1, bf = bfRegression(e.r2, n, p);
  if (!Number.isFinite(bf) && !(bf === Infinity)) return null;
  const rr = komma(R_REGRESSION, 3), pw = p === 1 ? L('Prädiktor', 'predictor') : L('Prädiktoren', 'predictors');
  return zeile(bf, WORT_ZUS, T(
    `JZS-Bayes-Faktor für das ganze Regressionsmodell gegen das Modell nur mit Konstante (Liang et al., 2008; Rouder & Morey, 2012): H₁ nimmt standardisierte Koeffizienten an, multivariat Cauchy-verteilt mit Skala r = √2/4 ≈ ${rr} („medium“ im R-Paket BayesFactor und in JASP); H₀: alle Koeffizienten = 0. Grundlage: R² = ${komma(e.r2, 3)}, n = ${n}, ${p} ${pw}. Er bewertet das Modell als Ganzes, nicht die einzelnen Prädiktoren; mit mehr Prädiktoren wird die Vorannahme breiter, und überflüssige Prädiktoren senken den Faktor.`,
    `JZS Bayes factor for the whole regression model against the model with only a constant (Liang et al., 2008; Rouder & Morey, 2012): H₁ assumes standardized coefficients with a multivariate Cauchy prior of scale r = √2/4 ≈ ${rr} ("medium" in the R package BayesFactor and in JASP); H₀: all coefficients = 0. Based on R² = ${komma(e.r2, 3)}, n = ${n}, ${p} ${pw}. It weighs the model as a whole, not the single predictors; with more predictors the prior gets wider, and superfluous predictors lower the factor.`));
}

const WORT_ANO = { h1: () => L('eines Unterschieds zwischen den Gruppen', 'a difference between the groups'), h0: () => L('ohne Unterschied zwischen den Gruppen', 'without a difference between the groups') };
/**
 * Einfaktorielle Varianzanalyse (S-H, 22.10.): Bayes-Faktor „alle Gruppenmittel gleich“ gegen „mindestens zwei verschieden“ (Rouder et al., 2012), auch bei ungleich großen Gruppen.
 * ⚠ Vorannahme (Prior) von der Fachperson abzunehmen: Effekte der Stufen Cauchy-verteilt mit Skala r = 0,5 („medium“ wie BayesFactor und JASP).
 */
export function bayesAnova(e: Anova): BayesZeile | null {
  const n = e.gruppen.map(g => g.n), m = e.gruppen.map(g => g.m), eta2 = e.ssZwischen / (e.ssZwischen + e.ssInnerhalb);
  const bf = bfAnova(n, m, eta2);
  if (!Number.isFinite(bf) && bf !== Infinity) return null;
  const rr = komma(R_ANOVA, 1);
  return zeile(bf, WORT_ANO, T(
    `JZS-Bayes-Faktor für die einfaktorielle Varianzanalyse (Rouder et al., 2012): H₁ nimmt Unterschiede zwischen den ${e.gruppen.length} Gruppen an, deren standardisierte Effekte Cauchy-verteilt sind mit Skala r = ${rr} („medium“ im R-Paket BayesFactor und in JASP); H₀: alle Gruppenmittel sind gleich. Grundlage: η² = ${komma(e.ssZwischen / (e.ssZwischen + e.ssInnerhalb), 3)}, n = ${e.n}. Er prüft alle Gruppen gemeinsam; welche sich unterscheiden, zeigt der Paarvergleich.`,
    `JZS Bayes factor for the one-way analysis of variance (Rouder et al., 2012): H₁ assumes differences between the ${e.gruppen.length} groups whose standardized effects have a Cauchy prior of scale r = ${rr} ("medium" in the R package BayesFactor and in JASP); H₀: all group means are equal. Based on η² = ${komma(e.ssZwischen / (e.ssZwischen + e.ssInnerhalb), 3)}, n = ${e.n}. It tests all groups together; which ones differ is shown by the pairwise comparison.`));
}
