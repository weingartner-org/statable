/**
 * Sätze zum Methodenvergleich (Später S-F, M6; Fachblatt 4.6). Ganze Sätze je Fall, Zahlen über das Sprachprofil (komma, iv), Anrede über d().
 * Regeln (Opus 5): der Cusum nennt Statistik und Residuenbild, KEIN p; die Deutung ist immer „nur ein Hinweis, kein Beweis“; λ wird erklärt, nie aus den Daten geschätzt. ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import { L, d } from './sitzung.svelte';
import { dez, iv } from '../i18n/profil';
import { komma } from './ergebnis';
import type { TableItem } from '../engine/types';
import { tabelle, fx, type Z } from './mwsaetze';
import type { Cusum, DemingErgebnis, MvErgebnis, MvFehler, MvHinweis, PbErgebnis } from './methodenvergleich';
import { MV_MAX_N, MV_MIN_N } from './methodenvergleich';

const z2 = (v: number) => komma(v, 2);
const lamText = (l: number) => dez(String(Math.round(l * 1000) / 1000));
const niveauText = (niveau: number) => dez(String(Math.round(niveau * 1000) / 10));

/** Eine Zahl, die fehlen kann („nicht bestimmbar“): zwei Nachkommastellen. */
const mitNull = (v: number | null) => (v === null ? '-' : z2(v));

/** Passing-Bablok: die Gerade und die Intervalle. */
export function pbSatz(e: PbErgebnis, opt: { n: number; niveau?: number }): string {
  const N = niveauText(opt.niveau ?? 0.95), a = z2(e.konstante), b = z2(e.steigung), n = opt.n;
  const alle = e.steigungUnten !== null && e.steigungOben !== null && e.konstanteUnten !== null && e.konstanteOben !== null;
  if (!alle) {
    return L(`Der Methodenvergleich nach Passing und Bablok (n = ${n}) ergab die Gerade y = ${a} + ${b} · x. Das ${N}-%-Intervall konnte nicht vollständig bestimmt werden, weil zu wenige Steigungen vorliegen.`,
      `The method comparison by Passing and Bablok (n = ${n}) gave the line y = ${a} + ${b} · x. The ${N}% interval could not be fully determined because there are too few slopes.`);
  }
  return L(`Der Methodenvergleich nach Passing und Bablok (n = ${n}) ergab die Gerade y = ${a} + ${b} · x. Das ${N}-%-Intervall der Steigung reicht von ${mitNull(e.steigungUnten)} bis ${mitNull(e.steigungOben)}, das der Konstanten von ${mitNull(e.konstanteUnten)} bis ${mitNull(e.konstanteOben)}.`,
    `The method comparison by Passing and Bablok (n = ${n}) gave the line y = ${a} + ${b} · x. The ${N}% interval of the slope ranges from ${mitNull(e.steigungUnten)} to ${mitNull(e.steigungOben)}, that of the constant from ${mitNull(e.konstanteUnten)} to ${mitNull(e.konstanteOben)}.`);
}

/** Deming: Steigung und Konstante mit dem Jackknife-Intervall. */
export function demingSatz(e: DemingErgebnis, opt: { n: number }): string {
  const lam = lamText(e.lambda), n = opt.n;
  const s = `${z2(e.steigung)} ${iv(z2(e.steigungUnten), z2(e.steigungOben))}`, k = `${z2(e.konstante)} ${iv(z2(e.konstanteUnten), z2(e.konstanteOben))}`;
  return L(`Die Deming-Regression (n = ${n}, λ = ${lam}, Jackknife-Intervall) ergab die Steigung ${s} und die Konstante ${k}.`,
    `The Deming regression (n = ${n}, λ = ${lam}, jackknife interval) gave the slope ${s} and the constant ${k}.`);
}

const schliesstEin = (g: { unten: number | null; oben: number | null }, wert: number): boolean | null =>
  g.unten === null || g.oben === null ? null : g.unten <= wert && wert <= g.oben;

/** Deutung der Intervalle: Hinweis auf konstante und proportionale Abweichung, immer „kein Beweis“. */
export function abweichungSatz(konstante: { unten: number | null; oben: number | null }, steigung: { unten: number | null; oben: number | null }): string {
  const k = schliesstEin(konstante, 0), s = schliesstEin(steigung, 1);
  const beweis = L('Das ist nur ein Hinweis und kein Beweis dafür, dass die Verfahren gleichwertig sind oder sich unterscheiden.', 'This is only an indication and no proof that the methods are equivalent or that they differ.');
  if (k === null || s === null) return `${L('Mindestens ein Intervall ist nicht bestimmbar, darum lässt sich keine Abweichung beurteilen.', 'At least one interval cannot be determined, so no deviation can be assessed.')} ${beweis}`;
  let teil: string;
  if (!k && !s) teil = L('Das Intervall der Konstanten schließt die 0 nicht ein und das der Steigung die 1 nicht: Hinweise auf eine konstante und auf eine proportionale Abweichung.', 'The interval of the constant does not contain 0 and that of the slope does not contain 1: indications of a constant and of a proportional deviation.');
  else if (!k) teil = L('Das Intervall der Konstanten schließt die 0 nicht ein: Hinweis auf eine konstante Abweichung. Das Intervall der Steigung schließt die 1 ein: kein Hinweis auf eine proportionale Abweichung.', 'The interval of the constant does not contain 0: an indication of a constant deviation. The interval of the slope contains 1: no indication of a proportional deviation.');
  else if (!s) teil = L('Das Intervall der Konstanten schließt die 0 ein: kein Hinweis auf eine konstante Abweichung. Das Intervall der Steigung schließt die 1 nicht ein: Hinweis auf eine proportionale Abweichung.', 'The interval of the constant contains 0: no indication of a constant deviation. The interval of the slope does not contain 1: an indication of a proportional deviation.');
  else teil = L('Das Intervall der Konstanten schließt die 0 ein: kein Hinweis auf eine konstante Abweichung. Das Intervall der Steigung schließt die 1 ein: kein Hinweis auf eine proportionale Abweichung.', 'The interval of the constant contains 0: no indication of a constant deviation. The interval of the slope contains 1: no indication of a proportional deviation.');
  return `${teil} ${beweis}`;
}

/** Cusum: Statistik ohne p, Verweis auf das Residuenbild. */
export function cusumSatz(c: Cusum): string {
  const h = z2(c.h);
  return L(`Der Cusum-Test auf Linearität: Von ${c.L + c.M} Resten liegen ${c.L} über und ${c.M} unter der Geraden, die Prüfgröße h beträgt ${h}. Ohne p-Wert gibt es dafür keine Schwelle; maßgeblich ist das Residuenbild. Ein unauffälliger Wert ist kein Beweis für Linearität.`,
    `The cusum test for linearity: of ${c.L + c.M} residuals, ${c.L} lie above and ${c.M} below the line; the test statistic h is ${h}. Without a p value there is no threshold for it; the residual plot is what counts. An unremarkable value is no proof of linearity.`);
}

/** Was λ bedeutet (Richtung wie im R-Paket mcr). */
export const lambdaErklaerung = (): string =>
  L('λ ist die Fehlervarianz der Messung auf der waagerechten Achse geteilt durch die der senkrechten. 2 heißt: Das waagerechte Verfahren misst mit doppelter Fehlervarianz. λ = 1 heißt: Beide Verfahren messen mit gleich großem Fehler.',
    'λ is the error variance of the measurement on the horizontal axis divided by that on the vertical axis. 2 means: the horizontal method measures with twice the error variance. λ = 1 means: both methods measure with equally large error.');

/** λ kommt aus Wiederholungsmessungen, nicht aus den Daten dieses Vergleichs. */
export const lambdaWiederholungSatz = (): string =>
  L('λ lässt sich aus Wiederholungsmessungen bestimmen (zwei Messungen je Probe und Verfahren): Es ist das Verhältnis der Fehlervarianzen beider Verfahren. Aus den Daten dieses Vergleichs allein ist λ nicht schätzbar.',
    'λ can be determined from repeated measurements (two measurements per sample and method): it is the ratio of the error variances of the two methods. From the data of this comparison alone, λ cannot be estimated.');

/** Das Ergebnis hängt von λ ab: die Steigung bei einer anderen Annahme. */
export function lambdaAbhaengigSatz(eigene: number, andere: { lambda: number; steigung: number }): string {
  const l = lamText(andere.lambda);
  let st = 2;
  while (st < 5 && komma(eigene, st) === komma(andere.steigung, st)) st++;
  if (komma(eigene, st) === komma(andere.steigung, st)) return L(`Das Ergebnis hängt kaum von der Annahme über die Fehler ab: Bei λ = ${l} ist die Steigung praktisch gleich (${komma(eigene, 2)}).`, `The result hardly depends on the assumption about the errors: with λ = ${l} the slope is practically the same (${komma(eigene, 2)}).`);
  const a = komma(eigene, Math.max(st, 3)), b = komma(andere.steigung, Math.max(st, 3));
  return L(`Das Ergebnis hängt von der Annahme über die Fehler ab: Bei λ = ${l} ist die Steigung ${b} statt ${a}.`, `The result depends on the assumption about the errors: with λ = ${l} the slope is ${b} instead of ${a}.`);
}

/** Zeile „Gerechnet“. */
export function mvGerechnet(a: { art: 'pb' | 'deming'; n: number; lambda?: number }): string {
  if (a.art === 'pb') return L(`Passing-Bablok-Regression wie R-Paket mcr 1.3.3.1 (Winkelmaß, Intervall analytisch nach Passing & Bablok), n = ${a.n}`, `Passing-Bablok regression as in R package mcr 1.3.3.1 (angle measure, analytical interval after Passing & Bablok), n = ${a.n}`);
  const lam = lamText(a.lambda ?? 1);
  return L(`Deming-Regression, λ = ${lam} (Fehlervarianz waagerecht geteilt durch senkrecht), Jackknife-Intervall nach Linnet (1990), n = ${a.n}`, `Deming regression, λ = ${lam} (error variance horizontal divided by vertical), jackknife interval after Linnet (1990), n = ${a.n}`);
}

/** Warum Passing-Bablok nicht gerechnet wurde. */
export function pbGesperrtSatz(grund: 'negativ' | 'tau'): string {
  return grund === 'negativ'
    ? L('Passing-Bablok wird nicht gerechnet, weil negative Werte vorkommen (wie im R-Paket mcr). Die Deming-Regression rechnet auch mit negativen Werten; die Daten zu verschieben, würde die Konstante verändern und geschieht darum nicht.',
      'Passing-Bablok is not calculated because negative values occur (as in the R package mcr). The Deming regression also works with negative values; shifting the data would change the constant and is therefore not done.')
    : L('Passing-Bablok wird nicht gerechnet, weil der Zusammenhang der beiden Verfahren nicht positiv ist (Kendalls τ ist 0 oder negativ). Zwei Verfahren für dieselbe Größe sollten positiv zusammenhängen; bitte die Spalten prüfen.',
      'Passing-Bablok is not calculated because the association between the two methods is not positive (Kendall\'s τ is 0 or negative). Two methods for the same quantity should be positively associated; please check the columns.');
}

/** Hinweise zum Ergebnis. */
export function mvHinweisSatz(h: MvHinweis, n: number): string {
  return h === 'wenig-faelle'
    ? L(`Mit n = ${n} sind die Intervalle unsicher; für einen Methodenvergleich werden meist mindestens 40 Proben empfohlen.`, `With n = ${n} the intervals are uncertain; at least 40 samples are usually recommended for a method comparison.`)
    : L('Es kommen weniger als 20 verschiedene Werte vor. Passing-Bablok braucht stetige Werte: Mit vielen gleichen Werten wird das Intervall grob.', 'Fewer than 20 different values occur. Passing-Bablok needs continuous values: with many equal values the interval becomes coarse.');
}

/** Fehlertexte der Prüfung. */
export function mvFehlerSatz(f: MvFehler['code']): string {
  switch (f) {
    case 'zu-wenig': return L(`Für den Methodenvergleich werden mindestens ${MV_MIN_N} vollständige Paare gebraucht.`, `The method comparison needs at least ${MV_MIN_N} complete pairs.`);
    case 'zu-gross': return L(`Der Methodenvergleich rechnet höchstens ${MV_MAX_N} Paare (Passing-Bablok vergleicht jedes Paar mit jedem anderen).`, `The method comparison handles at most ${MV_MAX_N} pairs (Passing-Bablok compares every pair with every other).`);
    case 'konstant': return L('Eine der beiden Spalten hat nur einen Wert; damit lässt sich keine Gerade bestimmen.', 'One of the two columns has only one value; no line can be fitted to it.');
    case 'wenige-werte': return L('Eine der beiden Spalten hat weniger als 5 verschiedene Werte; der Methodenvergleich braucht stetige Messwerte.', 'One of the two columns has fewer than 5 different values; the method comparison needs continuous measurements.');
    case 'lambda': return L('λ muss eine Zahl größer als 0 sein.', 'λ must be a number greater than 0.');
    case 'laenge': return L('Die beiden Spalten sind verschieden lang.', 'The two columns differ in length.');
    default: return L('Aus diesen Werten lässt sich keine Gerade bestimmen (die Messwerte hängen nicht zusammen).', 'No line can be determined from these values (the measurements are not related).');
  }
}

/** Satz zur gewöhnlichen Regression: nur als Erklärung, ohne Zahlen. */
export const mvOlsSatz = (): string =>
  L('Eine gewöhnliche Regression ist hier ungeeignet, weil sie annimmt, dass nur y Messfehler hat; die Steigung fällt dann zu flach aus.', 'An ordinary regression is unsuitable here because it assumes that only y has measurement error; the slope then comes out too flat.');

/** Die Gerade gilt nur im beobachteten Messbereich. */
export const mvBereichSatz = (): string =>
  L('Die Gerade gilt nur im Bereich der gemessenen Werte; außerhalb sagt sie nichts.', 'The line applies only within the range of the measured values; outside it says nothing.');

/** Die Achsen: Referenzverfahren waagerecht. */
export const mvAchsenSatz = (x: string, y: string): string =>
  L(`Waagerecht: ${x}; senkrecht: ${y}. Passing-Bablok ist in den Achsen symmetrisch (getauscht ergibt sich die umgekehrte Gerade); Deming gilt mit λ = 1 ebenso, mit einem anderen λ nicht.`,
    `Horizontal: ${x}; vertical: ${y}. Passing-Bablok is symmetric in the axes (swapped, it gives the inverse line); Deming with λ = 1 is too, with another λ it is not.`);

/** Ob eine Anrede nötig ist, zeigt dieser Satz: Hinweis zum Residuenbild (mit Anrede). */
export const mvResiduenHinweis = (): string =>
  d('Sieh dir das Residuenbild an: Die Punkte sollten ohne erkennbare Form um die Null streuen.', 'Sehen Sie sich das Residuenbild an: Die Punkte sollten ohne erkennbare Form um die Null streuen.', 'Look at the residual plot: the points should scatter around zero without a visible pattern.');

/** Tabellen: Konstante und Steigung je Verfahren mit Intervall, darunter die Steigung bei verschiedenen λ (Sensitivität). */
export function tabelleMethodenvergleich(e: MvErgebnis, xName: string, yName: string): TableItem[] {
  const z = (v: number | null): Z => (v === null ? '-' : fx(v, 3));
  const kopf = [L('Verfahren', 'Method'), L('Konstante', 'Constant'), L('95 %-KI untere Grenze', '95% CI lower'), L('95 %-KI obere Grenze', '95% CI upper'), L('Steigung', 'Slope'), L('95 %-KI untere Grenze', '95% CI lower'), L('95 %-KI obere Grenze', '95% CI upper')];
  const zeilen: Z[][] = [];
  if (e.pb) zeilen.push(['Passing-Bablok', z(e.pb.konstante), z(e.pb.konstanteUnten), z(e.pb.konstanteOben), z(e.pb.steigung), z(e.pb.steigungUnten), z(e.pb.steigungOben)]);
  const dm = e.deming;
  zeilen.push([`Deming (λ = ${lamText(dm.lambda)})`, z(dm.konstante), z(dm.konstanteUnten), z(dm.konstanteOben), z(dm.steigung), z(dm.steigungUnten), z(dm.steigungOben)]);
  const tau = komma(e.tau, 3);
  const fuss = [L(`Waagerecht: ${xName}; senkrecht: ${yName}. n = ${e.n}, Kendalls τ = ${tau}. Passing-Bablok wie R-Paket mcr (Intervall analytisch), Deming mit Jackknife-Intervall nach Linnet (1990).`, `Horizontal: ${xName}; vertical: ${yName}. n = ${e.n}, Kendall's τ = ${tau}. Passing-Bablok as in R package mcr (analytical interval), Deming with jackknife interval after Linnet (1990).`)];
  if (e.pb) fuss.push(L(`Cusum: ${e.pb.cusum.L} Reste über und ${e.pb.cusum.M} unter der Geraden, Prüfgröße h = ${komma(e.pb.cusum.h, 2)} (ohne p-Wert).`, `Cusum: ${e.pb.cusum.L} residuals above and ${e.pb.cusum.M} below the line, test statistic h = ${komma(e.pb.cusum.h, 2)} (no p value).`));
  return [
    tabelle('Methodenvergleich', L('Methodenvergleich', 'Method comparison'), kopf, zeilen, fuss),
    tabelle('Methodenvergleich-Lambda', L('Steigung der Deming-Regression bei verschiedenem λ', 'Slope of the Deming regression for different λ'), ['λ', L('Steigung', 'Slope')], e.lambdaTabelle.map(r => [lamText(r.lambda), fx(r.steigung, 3)]),
      [L('λ = Fehlervarianz des waagerechten Verfahrens geteilt durch die des senkrechten.', 'λ = error variance of the horizontal method divided by that of the vertical method.')])
  ];
}
