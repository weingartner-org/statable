/**
 * Sätze, APA-Zeile, Tabellen und der R-Text zum Ansehen der Strafregression (Ridge, Lasso, Elastic Net; Später S-E, Q2). Zahlen: strafreg.ts (R, webR).
 * Regeln (Fachblatt „Entscheidungen Opus“): ganze Sätze je Fall; KEIN p, KEIN Konfidenzintervall und kein Knopf „gewöhnlich nachrechnen“; der Anteil der Wiederholungen, in denen eine Größe gewählt wurde,
 * steht in der Tabelle; Koeffizienten der Originalskala und standardisiert; der Fehler ist der mittlere quadrierte Fehler der Kreuzvalidierung. ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L, Lp, d } from './sitzung.svelte';
import { aufzaehlung, zitat as anfuehrung } from '../i18n/profil';
import { komma, ohneNull, kurz, type Saetze } from './ergebnis';
import { tabelle, fx, fo, type Z } from './mwsaetze';
import { spaltenName } from './medmodsaetze';
import { strafAlphaName, strafGerechnet, strafKeinPSatz, type StrafErgebnis, type StrafKoef } from './strafreg';
import { rAnzeigeName, rAnzeigeText, rAnzeigeZahl } from '../engine/rsicher';

type Name = (n: string) => string;
const T = L;
const q = (t: string) => anfuehrung(kurz(t));

/** Eine Zahl mit etwa drei gültigen Stellen (λ reicht von 0,03 bis 1500). */
export function drei(v: number): string {
  if (!Number.isFinite(v)) return '-';
  const a = Math.abs(v);
  return komma(v, a === 0 ? 0 : a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : a >= 0.1 ? 3 : a >= 0.01 ? 4 : 5);
}
const fehlerText = (v: number) => (Number.isFinite(v) ? komma(v, v >= 100 ? 1 : 2) : '-');
function koefName(e: StrafErgebnis, k: StrafKoef, name: Name): string {
  if (k.pIdx < 0) return k.name;
  const p = e.praed[k.pIdx]!;
  return p.art === 'faktor' ? T(`${name(p.name)}: ${k.stufe} (gegen ${p.stufen[0]})`, `${name(p.name)}: ${k.stufe} (vs. ${p.stufen[0]})`) : name(p.name);
}
/** Kurzer Name einer Größe für das Pfadbild: „gr: B“. */
export function strafPfadName(e: StrafErgebnis, k: StrafKoef, name: Name): string { if (k.pIdx < 0) return k.name; const p = e.praed[k.pIdx]!; return p.art === 'faktor' ? `${name(p.name)}: ${k.stufe}` : name(p.name); }
const kurzName = (e: StrafErgebnis, k: StrafKoef, name: Name) => { if (k.pIdx < 0) return k.name; const p = e.praed[k.pIdx]!; return p.art === 'faktor' ? `${anfuehrung(k.stufe)} (${q(name(p.name))})` : q(name(p.name)); };
/** Die Zahl der Größen im Modell (λ-Wahl). */
export const strafImModell = (e: StrafErgebnis) => e.koef.filter(k => k.b !== 0);
const gruppeDa = (e: StrafErgebnis) => e.praed.some(p => p.art === 'faktor');
const regelWort = (e: StrafErgebnis) => (e.regel === 'se1' ? T('nach der Ein-Standardfehler-Regel', 'by the one-standard-error rule') : T('mit dem kleinsten Fehler', 'with the smallest error'));

export function saetzeStraf(e: StrafErgebnis, name: Name = spaltenName): Saetze {
  const im = strafImModell(e), p = e.koef.length, a = strafAlphaName(e.alpha), Y = q(name(e.ziel));
  const fuenf = T(`${a} (α = ${ohneNull(e.alpha, e.alpha === 0 || e.alpha === 1 ? 0 : 2)}) und ${e.R} × ${e.K}-facher Kreuzvalidierung (λ ${regelWort(e)}, Startwert ${e.startwert})`, `${a} (α = ${ohneNull(e.alpha, e.alpha === 0 || e.alpha === 1 ? 0 : 2)}) and ${e.R} × ${e.K}-fold cross-validation (λ ${regelWort(e)}, seed ${e.startwert})`);
  const wer = aufzaehlung(im.map(k => kurzName(e, k, name)));
  const auswahl = e.alpha === 0
    ? T(`Mit ${fuenf} bleiben alle ${p} Vorhersagegrößen im Modell; ihre Koeffizienten sind zur Null gezogen (λ = ${drei(e.lambdaGewaehlt)}).`, `With ${fuenf} all ${p} predictors stay in the model; their coefficients are pulled towards zero (λ = ${drei(e.lambdaGewaehlt)}).`)
    : im.length === 0
      ? T(`Mit ${fuenf} blieb keine der ${p} Vorhersagegrößen im Modell: Die Strafe ist so stark, dass nur die Konstante übrig bleibt. ${Y} lässt sich damit nicht besser vorhersagen als mit dem Mittelwert.`, `With ${fuenf} none of the ${p} predictors stayed in the model: the penalty is so strong that only the constant remains. ${Y} is then no better predicted than by the mean.`)
      : Lp(im.length, `Mit ${fuenf} blieb ${im.length} von ${p} Vorhersagegrößen im Modell: ${wer}.`, `Mit ${fuenf} blieben ${im.length} von ${p} Vorhersagegrößen im Modell: ${wer}.`, `With ${fuenf} ${im.length} of ${p} predictors stayed in the model: ${wer}.`, `With ${fuenf} ${im.length} of ${p} predictors stayed in the model: ${wer}.`);
  const fehler = T(`Der mittlere quadrierte Vorhersagefehler in der Kreuzvalidierung betrug ${fehlerText(e.cvFehler)} (± ${fehlerText(e.cvSe)}); das Modell nur mit dem Mittelwert hat ${fehlerText(e.nullfehler)}.`,
    `The mean squared prediction error in the cross-validation was ${fehlerText(e.cvFehler)} (± ${fehlerText(e.cvSe)}); the model with the mean alone has ${fehlerText(e.nullfehler)}.`);
  const haupt = [auswahl, fehler].join(' ');
  const stab = e.stabilitaet;
  const stabil = stab.von > 1 ? (stab.haeufigste === stab.von
    ? T(`In allen ${stab.von} Wiederholungen der Kreuzvalidierung wurde dieselbe Auswahl getroffen.`, `In all ${stab.von} repetitions of the cross-validation the same selection was made.`)
    : d(`In den ${stab.von} Wiederholungen der Kreuzvalidierung blieb die Auswahl ${stab.haeufigste}-mal gleich (${stab.verschiedene} verschiedene Auswahlen). Wähle die Größen nicht allein nach diesem Ergebnis.`,
      `In den ${stab.von} Wiederholungen der Kreuzvalidierung blieb die Auswahl ${stab.haeufigste}-mal gleich (${stab.verschiedene} verschiedene Auswahlen). Wählen Sie die Größen nicht allein nach diesem Ergebnis.`,
      `In the ${stab.von} repetitions of the cross-validation the selection stayed the same ${stab.haeufigste} times (${stab.verschiedene} different selections). Do not choose the predictors on this result alone.`)) : '';
  const train = e.trainOls !== null
    ? T(`Die gewöhnliche Regression passt die Daten besser an (mittlerer quadrierter Fehler ${fehlerText(e.trainOls)} gegen ${fehlerText(e.trainPen)} bei der Strafregression); das ist kein Maß für die Vorhersage neuer Fälle.`, `The ordinary regression fits the data better (mean squared error ${fehlerText(e.trainOls)} versus ${fehlerText(e.trainPen)} for the penalized regression); that is not a measure of how well new cases are predicted.`)
    : '';
  const gruppe = gruppeDa(e) ? T('Die Auswahl einer Gruppenstufe hängt davon ab, welche Gruppe als Vergleich dient; welche Größen bleiben, ist darum nur mit Vorsicht zu vergleichen.', 'The selection of a group level depends on which group serves as the reference; which predictors stay can therefore be compared only with caution.') : '';
  const konstant = e.konstant.length ? Lp(e.konstant.length, 'Eine Spalte hat überall denselben Wert und wurde weggelassen.', `${e.konstant.length} Spalten haben überall denselben Wert und wurden weggelassen.`, 'One column has the same value everywhere and was left out.', `${e.konstant.length} columns have the same value everywhere and were left out.`) : '';
  const faelle = [T(`Gerechnet wurde mit ${e.n} Fällen.`, `Calculated with ${e.n} cases.`), e.ausgelassen > 0 ? T(`${e.ausgelassen} Zeilen mit Lücken wurden ausgelassen.`, `${e.ausgelassen} rows with gaps were left out.`) : ''].filter(Boolean).join(' ');
  const zusatz = [strafKeinPSatz(), stabil, train, gruppe, konstant, e.standardisieren ? T('Die Spalten wurden vor der Rechnung standardisiert; die Koeffizienten stehen auf der Originalskala und standardisiert in der Tabelle.', 'The columns were standardized before the calculation; the coefficients are given on the original scale and standardized in the table.') : T('Die Spalten wurden nicht standardisiert; die Strafe hängt von der Einheit jeder Spalte ab.', 'The columns were not standardized; the penalty depends on the unit of each column.'), faelle].filter(Boolean).join('\n');
  const vorsicht = T('Ein Koeffizient ist keine Wirkung. Dass eine Größe „gewählt“ wurde, heißt nicht, dass sie wichtig ist: Hängen Größen eng zusammen, wählt das Lasso eine von ihnen eher zufällig. Der Fehler der Kreuzvalidierung ist leicht zu günstig, weil die Stärke der Strafe aus denselben Daten gewählt wurde. Die Werte von λ sind nur innerhalb von glmnet vergleichbar, nicht mit anderer Software. Das Modell dient der Vorhersage, nicht dem Erklären einzelner Größen.',
    'A coefficient is not an effect. That a predictor was "selected" does not mean it is important: if predictors are closely related, the lasso picks one of them rather at random. The error of the cross-validation is slightly too favorable, because the strength of the penalty was chosen from the same data. The values of λ are only comparable within glmnet, not with other software. The model serves prediction, not explaining single predictors.');
  const apa = T(`${a} (α = ${ohneNull(e.alpha, e.alpha === 0 || e.alpha === 1 ? 0 : 2)}), λ = ${drei(e.lambdaGewaehlt)} (${regelWort(e)}), ${e.R} × ${e.K}-fache Kreuzvalidierung, MSE = ${fehlerText(e.cvFehler)} (SE = ${fehlerText(e.cvSe)}); ${im.length} von ${p} Größen im Modell`,
    `${a} (α = ${ohneNull(e.alpha, e.alpha === 0 || e.alpha === 1 ? 0 : 2)}), λ = ${drei(e.lambdaGewaehlt)} (${regelWort(e)}), ${e.R} × ${e.K}-fold cross-validation, MSE = ${fehlerText(e.cvFehler)} (SE = ${fehlerText(e.cvSe)}); ${im.length} of ${p} predictors in the model`);
  return { haupt, zusatz, vorsicht, apa, marken: [
    { text: T(`${a}, ${e.R} × ${e.K}-fache Kreuzvalidierung`, `${a}, ${e.R} × ${e.K}-fold cross-validation`), erklaer: 'strafregression' },
    { text: T(`${im.length} von ${p} Größen im Modell`, `${im.length} of ${p} predictors in the model`), erklaer: 'strafregression' },
    { text: T('Kein p, kein Konfidenzintervall nach der Auswahl', 'No p, no confidence interval after the selection'), erklaer: 'strafregression', hinweis: true },
    { text: T(`${e.n} Fälle`, `${e.n} cases`), erklaer: 'stichprobe' }
  ] };
}

export function tabellenStraf(e: StrafErgebnis, name: Name = spaltenName): TableItem[] {
  const Y = name(e.ziel), a = strafAlphaName(e.alpha);
  const koef = tabelle('Penalized Regression Coefficients', T('Strafregression: Koeffizienten', 'Penalized regression: coefficients'),
    [T('Prädiktor', 'Predictor'), T('Koeffizient', 'Coefficient'), T('standardisiert', 'standardized'), T('im Modell', 'in the model'), T(`gewählt in (von ${e.R})`, `selected in (of ${e.R})`)],
    [[T('Konstante', 'Constant'), fx(e.konstante, 4), '-', '-', '-'] as Z[], ...e.koef.map(k => [koefName(e, k, name), fx(k.b, 4), fx(k.std, 4), k.b !== 0 ? T('ja', 'yes') : T('nein', 'no'), String(k.wiederholungen)] as Z[])],
    [T(`Abhängige Größe: ${Y}; ${a}; λ = ${drei(e.lambdaGewaehlt)} (${regelWort(e)}); ${e.n} Fälle. Koeffizient: auf der Originalskala; standardisiert: Koeffizient mal Standardabweichung der Spalte (vergleichbar zwischen den Größen). Gruppen-Spalten: Vergleich mit der ersten Stufe.`,
      `Dependent variable: ${Y}; ${a}; λ = ${drei(e.lambdaGewaehlt)} (${regelWort(e)}); ${e.n} cases. Coefficient: on the original scale; standardized: coefficient times the standard deviation of the column (comparable between predictors). Group columns: compared with the first level.`),
    T('Es gibt hier keine Standardfehler, p-Werte und Konfidenzintervalle: Auswahl und Schätzung stammen aus denselben Daten.', 'There are no standard errors, p values or confidence intervals here: selection and estimate come from the same data.')]);
  const kopf = tabelle('Penalized Regression Cross-Validation', T('Strafregression: Kreuzvalidierung', 'Penalized regression: cross-validation'), [T('Maß', 'Measure'), T('Wert', 'Value')], [
    ['α', fo(e.alpha, 2)], [T('λ (gewählt)', 'λ (chosen)'), drei(e.lambdaGewaehlt)], ['λ (min)', drei(e.lambdaMin)], ['λ (1se)', drei(e.lambda1se)],
    [T('Größen im Modell', 'Predictors in the model'), `${strafImModell(e).length} / ${e.koef.length}`],
    [T('Fehler der Kreuzvalidierung (gewählt)', 'Cross-validation error (chosen)'), `${fehlerText(e.cvFehler)} (± ${fehlerText(e.cvSe)})`],
    [T('Fehler der Kreuzvalidierung bei λ (min)', 'Cross-validation error at λ (min)'), `${fehlerText(e.cvMin)} (± ${fehlerText(e.cvMinSe)})`],
    [T('Fehler nur mit dem Mittelwert', 'Error with the mean alone'), fehlerText(e.nullfehler)],
    [T('Fehler an den Trainingsdaten (Strafregression)', 'Error on the training data (penalized regression)'), fehlerText(e.trainPen)],
    ...(e.trainOls !== null ? [[T('Fehler an den Trainingsdaten (gewöhnliche Regression)', 'Error on the training data (ordinary regression)'), fehlerText(e.trainOls)] as Z[]] : []),
    [T('Faltungen × Wiederholungen', 'Folds × repetitions'), `${e.K} × ${e.R}`], [T('Startwert', 'Seed'), String(e.startwert)]
  ], [T('Fehler = mittlerer quadrierter Fehler an den Fällen, die in der jeweiligen Faltung nicht zur Anpassung benutzt wurden, gemittelt über die Wiederholungen. Der Trainingsfehler ist kein Maß für die Vorhersage neuer Fälle.', 'Error = mean squared error on the cases that were not used for fitting in the respective fold, averaged over the repetitions. The training error is not a measure of how well new cases are predicted.')]);
  return [koef, kopf];
}

export const strafWarum = (): string => T('Es sollen viele Vorhersagegrößen genutzt werden, ohne dass das Modell auf die Zufälligkeiten der Stichprobe überanpasst. Eine Strafe zieht die Koeffizienten zur Null (Ridge) oder setzt unwichtige ganz auf Null (Lasso); Elastic Net mischt beides. Die Stärke der Strafe wählt eine Kreuzvalidierung nach dem Fehler an neuen Fällen. Das passt zur Vorhersage, nicht zum Prüfen einzelner Effekte: nach der Auswahl gibt es keine p-Werte.',
  'Many predictors are to be used without the model overfitting the chance features of the sample. A penalty pulls the coefficients towards zero (ridge) or sets unimportant ones exactly to zero (lasso); elastic net mixes both. A cross-validation chooses the strength of the penalty by the error on new cases. This suits prediction, not testing single effects: after the selection there are no p values.');
export const strafFachwort = (alpha: number): string => T(`Strafregression (${strafAlphaName(alpha)})`, `penalized regression (${strafAlphaName(alpha)})`);
export const strafGerechnetBlatt = (e: StrafErgebnis): string => strafGerechnet({ alpha: e.alpha, regel: e.regel, K: e.K, R: e.R, startwert: e.startwert, n: e.n });

/* ------------------------------------------------------------------------------------------------ R-Text zum Ansehen */

const rn = rAnzeigeName, rs = rAnzeigeText, rz = rAnzeigeZahl;
/** Der gleiche Aufruf in R (wird nie ausgeführt; Namen und Texte aus den Daten werden maskiert). Die Faltungen sind Zahlen von Statable und stehen hier nur als Hinweis. */
export function strafRCode(e: { ziel: string; praed: { name: string; art: 'zahl' | 'faktor'; stufen: string[] }[]; alpha: number; regel: 'se1' | 'min'; standardisieren: boolean; K: number; R: number; startwert: number }): string {
  const gruppen = e.praed.filter(p => p.art === 'faktor').map(p => `daten$${rn(p.name)} <- factor(daten$${rn(p.name)}, levels = c(${p.stufen.map(rs).join(', ')}))   # ${T('erste Stufe = Vergleichsgruppe', 'first level = reference group')}`);
  const f = e.praed.map(p => rn(p.name)).join(' + ');
  return [
    T('# Der gleiche Aufruf in R (Paket glmnet), mit den Einstellungen, die Statable benutzt:', '# The same call in R (package glmnet), with the settings Statable uses:'), 'library(glmnet)', ...gruppen,
    `x <- model.matrix(~ ${f}, data = daten)[, -1]   # ${T('nur vollständige Fälle', 'complete cases only')}`, `y <- daten$${rn(e.ziel)}`,
    `voll <- glmnet(x, y, alpha = ${rz(e.alpha)}, standardize = ${e.standardisieren ? 'TRUE' : 'FALSE'}, control = list(thresh = 1e-14))   # ${T('Folge der λ aus allen Daten', 'sequence of λ from all the data')}`,
    `# ${T(`${e.R} Wiederholungen mit anderer Faltung (Statable mischt die Zeilen mit Startwert ${e.startwert} + Nummer der Wiederholung):`, `${e.R} repetitions with a different fold (Statable shuffles the rows with seed ${e.startwert} + number of the repetition):`)}`,
    `cv <- cv.glmnet(x, y, alpha = ${rz(e.alpha)}, foldid = foldid, lambda = voll$lambda, standardize = ${e.standardisieren ? 'TRUE' : 'FALSE'})   # ${T(`foldid: Zahlen 1 bis ${e.K}, je Fall eine`, `foldid: numbers 1 to ${e.K}, one per case`)}`,
    `coef(voll, s = ${e.regel === 'se1' ? 'cv$lambda.1se' : 'cv$lambda.min'})   # ${e.regel === 'se1' ? T('Ein-Standardfehler-Regel', 'one-standard-error rule') : T('kleinster Fehler', 'smallest error')}; ${T('Statable mittelt cvm und cvsd über die Wiederholungen', 'Statable averages cvm and cvsd over the repetitions')}`
  ].join('\n');
}
