/** Blätter, deren Tabellen Statable selbst baut (PSPP kann das Verfahren nicht oder liefert nicht alles): Bericht, Word, PDF und Excel nehmen dann diese Tabellen. */
import type { Blatt } from './sitzung.svelte';
import { L } from './sitzung.svelte';

export const EIGENE_ARTEN = ['messwiederholung', 'mediation', 'moderation', 'einzelfall', 'mehrebenen', 'meta', 'kaplanmeier', 'korrmatrix', 'faelle', 'tabelle', 'amtlich', 'zeitreihen', 'cluster', 'diskriminanz', 'loglinear', 'manova', 'armut'];
/** Hat das Blatt Ergebnisse aus R (McDonalds Omega bei der Skala, CFA bei der Faktorenanalyse)? */
export const hatR = (b: Blatt) => { const e = (b.ergebnis as { e?: { omega?: unknown; cfa?: unknown } } | null)?.e; return (b.art === 'skala' && !!e?.omega) || (b.art === 'faktor' && !!e?.cfa); };
/** Zweifaktorielle Varianzanalyse und Kovarianzanalyse (G3, G6) sind Blätter der Frage „Unterscheiden sich Gruppen?“, deren Tabellen Statable aus PSPP-Läufen baut. */
const ergebnisTyp = (b: Blatt) => (b.ergebnis as { typ?: string } | null)?.typ;
export const istGruppen2 = (b: Blatt) => b.art === 'gruppen' && (ergebnisTyp(b) === 'anova2' || ergebnisTyp(b) === 'ancova');
/** Hierarchische Regression (G4): Blatt der Frage „Lässt sich etwas vorhersagen?“, dessen Tabellen Statable aus je einem PSPP-Lauf je Block baut. */
export const istHierreg = (b: Blatt) => b.art === 'vorhersage' && ergebnisTyp(b) === 'hierreg';
/** McNemar (G5): Blatt der Frage „Hat sich etwas verändert?“ mit zwei Ja/Nein-Spalten; Statable rechnet selbst, es gibt keine PSPP-Tabellen. */
export const istMcNemar = (b: Blatt) => b.art === 'praepost' && ergebnisTyp(b) === 'mcnemar';
/** Ordinale, multinomiale und Zähldaten-Regression (Welle 3): Blatt der Frage „Lässt sich etwas vorhersagen?“, das R (MASS, nnet) rechnet; die Tabellen baut Statable aus dem gespeicherten Ergebnis. */
export const istKategReg = (b: Blatt) => b.art === 'vorhersage' && ['ordreg', 'multreg', 'zaehlreg', 'quantil', 'penal', 'probit', 'wls', 'nls'].includes(ergebnisTyp(b) ?? '');   // Später S-E: auch Quantilregression (quantreg) und Strafregression (glmnet)
/** Offene Antworten ordnen (Welle 4, G7): Blatt ohne PSPP-Tabellen, Statable zählt die Zuordnung der Person; die Tabellen baut Statable aus dem gespeicherten Ergebnis. */
export const istKategorien = (b: Blatt) => b.art === 'kategorien';
export const eigeneTabellen = (b: Blatt) => EIGENE_ARTEN.includes(b.art) || istKategorien(b) || istGruppen2(b) || istHierreg(b) || istMcNemar(b) || istKategReg(b);

/** Zusatz hinter „gerechnet mit GNU PSPP 2.1.1“: nennt die Verfahren, die Statable selbst rechnet. */
export function rechenZusatz(blaetter: Blatt[]): string {
  const namen = EIGENE_ARTEN.filter(a => blaetter.some(b => b.art === a)).map(a => (a === 'messwiederholung' ? L('Messwiederholung', 'repeated measures') : a === 'mediation' ? L('Mediation', 'mediation') : a === 'einzelfall' ? L('Einzelfallanalyse', 'single-case analysis') : a === 'mehrebenen' ? L('Mehrebenenmodell mit R, lme4 und lmerTest', 'multilevel model with R, lme4 and lmerTest') : a === 'meta' ? L('Meta-Analyse mit R und metafor', 'meta-analysis with R and metafor') : a === 'kaplanmeier' ? L('Kaplan-Meier', 'Kaplan-Meier') : a === 'korrmatrix' ? L('Korrelationsmatrix', 'correlation matrix') : a === 'faelle' ? L('Fallvergleich', 'case comparison') : a === 'tabelle' ? L('zusammengestellte Tabelle', 'assembled table') : a === 'amtlich' ? L('Tabelle für die Veröffentlichung', 'table for publication') : a === 'zeitreihen' ? L('Zeitreihe', 'time series') : a === 'cluster' ? L('Clusteranalyse mit R (Basispaket stats)', 'cluster analysis with R (base package stats)') : a === 'diskriminanz' ? L('Diskriminanzanalyse mit R und MASS', 'discriminant analysis with R and MASS') : a === 'loglinear' ? L('loglineare Modelle mit R (Basispaket stats)', 'log-linear models with R (base package stats)') : a === 'manova' ? L('MANOVA mit R (Basispaket stats)', 'MANOVA with R (base package stats)') : a === 'armut' ? L('Armut und Ungleichheit mit R und survey', 'poverty and inequality with R and survey') : L('Moderation', 'moderation')));
  if (blaetter.some(b => b.art === 'gruppen' && ergebnisTyp(b) === 'anova2')) namen.push(L('zweifaktorielle Varianzanalyse', 'two-way analysis of variance'));
  if (blaetter.some(b => b.art === 'gruppen' && ergebnisTyp(b) === 'ancova')) namen.push(L('Kovarianzanalyse', 'analysis of covariance'));
  if (blaetter.some(istMcNemar)) namen.push(L('McNemar-Test', 'McNemar test'));
  if (blaetter.some(b => b.art === 'messwiederholung' && ergebnisTyp(b) === 'cochran')) namen.push(L('Cochran-Q-Test', "Cochran's Q test"));
  if (blaetter.some(istKategorien)) namen.push(L('Häufigkeiten der Kategorien offener Antworten', 'frequencies of the categories of open answers'));
  if (blaetter.some(istHierreg)) namen.push(L('hierarchische Regression', 'hierarchical regression'));
  if (blaetter.some(b => b.art === 'vorhersage' && ['ordreg', 'multreg', 'zaehlreg'].includes(ergebnisTyp(b) ?? ''))) namen.push(L('ordinale, multinomiale und Zähldaten-Regression mit R, MASS und nnet', 'ordinal, multinomial and count regression with R, MASS and nnet'));
  if (blaetter.some(b => b.art === 'vorhersage' && ergebnisTyp(b) === 'quantil')) namen.push(L('Quantilregression mit R und quantreg', 'quantile regression with R and quantreg'));
  if (blaetter.some(b => b.art === 'vorhersage' && ergebnisTyp(b) === 'probit')) namen.push(L('Probit-Regression mit R (Basispaket stats)', 'probit regression with R (base package stats)'));
  if (blaetter.some(b => b.art === 'vorhersage' && ergebnisTyp(b) === 'nls')) namen.push(L('nichtlineare Regression mit R (Basispaket stats)', 'nonlinear regression with R (base package stats)'));
  if (blaetter.some(b => b.art === 'vorhersage' && ergebnisTyp(b) === 'wls')) namen.push(L('gewichtete Regression mit R (Basispaket stats)', 'weighted regression with R (base package stats)'));
  if (blaetter.some(b => b.art === 'vorhersage' && ergebnisTyp(b) === 'penal')) namen.push(L('Ridge, Lasso und Elastic Net mit R und glmnet', 'ridge, lasso and elastic net with R and glmnet'));
  if (blaetter.some(b => b.art === 'kaplanmeier' && (b.ergebnis as { e?: { cox?: unknown } } | null)?.e?.cox)) namen.push(L('Cox-Regression mit R und survival', 'Cox regression with R and survival'));
  if (blaetter.some(b => b.art === 'kaplanmeier' && (b.ergebnis as { e?: { coxZeit?: unknown } } | null)?.e?.coxZeit)) namen.push(L('Cox-Regression mit zeitabhängiger Größe mit R und survival', 'Cox regression with a time-dependent covariate with R and survival'));
  if (blaetter.some(b => b.art === 'kaplanmeier' && (b.ergebnis as { e?: { aft?: unknown } } | null)?.e?.aft)) namen.push(L('AFT-Modell mit R und survival', 'AFT model with R and survival'));
  if (blaetter.some(b => b.art === 'kaplanmeier' && (b.ergebnis as { e?: { frailty?: unknown } } | null)?.e?.frailty)) namen.push(L('Cox-Regression mit Cluster oder Frailty mit R und survival', 'Cox regression with cluster or frailty with R and survival'));
  if (blaetter.some(b => b.art === 'kaplanmeier' && (b.ergebnis as { e?: { sterbe?: unknown } } | null)?.e?.sterbe)) namen.push(L('Sterbetafel nach IBM SPSS Statistics (SURVIVAL)', 'life table after IBM SPSS Statistics (SURVIVAL)'));
  if (blaetter.some(b => (b.ergebnis as { typ?: string; e?: { inter?: unknown } } | null)?.typ === 'inter' || (b.ergebnis as { e?: { inter?: unknown } } | null)?.e?.inter)) namen.push(L('Intercoder-Kennwerte', 'intercoder coefficients'));
  if (blaetter.some(hatR)) namen.push(L('R mit lavaan und psych', 'R with lavaan and psych'));
  if (blaetter.some(b => b.rang && (b.ergebnis as { rang?: unknown } | null)?.rang)) namen.push(L('Rangtests', 'rank tests'));
  return namen.length ? L(` und Statable (${namen.join(', ')})`, ` and Statable (${namen.join(', ')})`) : '';
}

/** Blätter, die PSPP nicht anfasst (Statable rechnet selbst, mit R oder eigenem Code): steht nur so etwas im Bericht, nennt die Kopfzeile PSPP nicht (Abnahme 3, M13). */
const OHNE_PSPP = ['meta', 'kaplanmeier', 'mehrebenen', 'einzelfall', 'messwiederholung', 'faelle', 'tabelle', 'amtlich', 'zeitreihen', 'cluster', 'diskriminanz', 'loglinear', 'manova', 'armut'];
/** Der Text hinter „gerechnet mit“ in der Kopfzeile von Word, PDF und Excel: „GNU PSPP 2.1.1 und Statable (…)“ bzw. nur „Statable (…)“. */
export function rechenText(blaetter: Blatt[]): string {
  const zusatz = rechenZusatz(blaetter);
  if (blaetter.length && blaetter.every(b => OHNE_PSPP.includes(b.art) || istMcNemar(b) || istKategReg(b) || istKategorien(b)) && zusatz) return zusatz.replace(/^ (und|and) /, '');
  return `GNU PSPP 2.1.3${zusatz}`;
}
