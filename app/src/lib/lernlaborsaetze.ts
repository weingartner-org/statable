/**
 * Welle 6, L4 „Lernlabor“: Sätze, Eingabe-Prüfung und Anzeige-Hilfen (Achsen, Zahlenformat). Die Rechnung steht in lib/lernlabor.ts.
 * Alle Sätze sind GANZE Sätze je Fall (übersetzbar: L/Lp/d), nie ein Wort per Ternary; Zahlenformat nur über i18n/profil.ts und lib/format.ts.
 * Jeder Satz einer Simulation nennt den Startwert („Startwert 1“) - ohne ihn lässt sich der Lauf nicht wiederholen.
 * ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import { L, Lp, d } from './sitzung.svelte';
import { P, type Paar } from '../i18n/laufzeit';
import { iv, proz } from '../i18n/profil';
import { zahlDe } from './format';
import { ohneNull, pWert } from './ergebnis';
import { pretty } from './diagrammdaten';
import type { BootstrapErgebnis, Population, RandomisierungErgebnis, Stichprobenverteilung, UeberdeckungErgebnis, Vierfeldertafel } from './lernlabor';
import type { Histogramm } from './lernlabor';
import { BOOTSTRAP_MAX, GRUPPE_MAX, normalDichte, populationKennzahlen } from './lernlabor';

/* ------------------------------------------------------------------ Zahlenformat */
/** Vier gültige Ziffern, ohne überflüssige Nullen (Mittel, Streuung, Intervallgrenzen). */
export const g4 = (v: number) => (Number.isFinite(v) ? zahlDe(Number(v.toPrecision(4))) : '-');
/** Wahrscheinlichkeit als Dezimalzahl UND Prozent: „0,0443 (4,43 %)“; sehr kleine Werte als „< 0,0001“, nie „0“. */
export function wk(p: number): string {
  if (!Number.isFinite(p)) return '-';
  if (p > 0 && p < 0.0001) return `< ${zahlDe(0.0001, 4)} (< ${proz(zahlDe(0.01, 2))})`;
  if (p > 0.9999 && p < 1) {   // knapp unter 1: so viele Stellen, dass man den Abstand zu 1 sieht (nie „1,0000 (100,00 %)“)
    const st = Math.min(9, Math.ceil(-Math.log10(1 - p)) + 1);
    return `${zahlDe(p, st)} (${proz(zahlDe(p * 100, Math.max(2, st - 2)))})`;
  }
  return `${zahlDe(p, 4)} (${proz(zahlDe(p * 100, 2))})`;
}
/** Anteil in Prozent: „4,43 %“. */
export const prozent = (p: number, stellen = 2) => (Number.isFinite(p) ? proz(zahlDe(p * 100, stellen)) : '-');
/** Natürliche Häufigkeit: ganz, sonst mit allen Nachkommastellen bis 6 (nie still gerundet). */
export const haeuf = (v: number) => (Number.isFinite(v) ? zahlDe(v) : '-');
/** Sechs Stellen, damit zwei fast gleiche Zahlen als verschieden erkennbar bleiben (Unabhängigkeits-Check, F18). */
export const sechs = (v: number) => zahlDe(v, 6);

/* ------------------------------------------------------------------ Eingaben lesen */
/** Zahl mit Komma oder Punkt (auch „−“ als Minus); sonst NaN. */
export function leseZahl(t: string): number {
  const x = t.trim().replace(/\s/g, '').replace(',', '.').replace('−', '-');
  return /^-?\d*\.?\d+(e[-+]?\d+)?$|^-?\d+\.$/i.test(x) ? Number(x) : NaN;
}
/** Ganze Zahl (oder NaN). */
export const leseGanz = (t: string) => { const v = leseZahl(t); return Number.isInteger(v) ? v : NaN; };
/** Anteil: „1“ = 1 %, „33,3“ = 33,3 %, oder als Bruch „1/3“ (dann ohne Prozent). NaN bei Unsinn; Werte außerhalb von 0 bis 1 gelten als Fehler (NaN). */
export function leseAnteil(t: string): number {
  const bruch = t.split('/');
  const v = bruch.length === 2 ? leseZahl(bruch[0]!) / leseZahl(bruch[1]!) : bruch.length === 1 ? leseZahl(t) / 100 : NaN;
  return v >= 0 && v <= 1 ? v : NaN;
}
/** Werte aus einem Textfeld: getrennt durch Leerzeichen, Semikolon oder Zeilenwechsel; Komma ist das Dezimalzeichen. */
export function leseReihe(t: string): { werte: number[]; falsch: string | null } {
  const teile = t.split(/[\s;]+/).filter(Boolean), werte: number[] = [];
  for (const x of teile) { const v = leseZahl(x); if (Number.isNaN(v)) return { werte, falsch: x }; werte.push(v); }
  return { werte, falsch: null };
}
/** Zahlen in ein Textfeld schreiben (Dezimalzeichen nach Einstellung). */
export const reiheText = (w: number[]) => w.map(v => zahlDe(v)).join(' ');

/** Fehlertext zu einer eingetippten Reihe (Bootstrap: 2 bis 200 Werte; Gruppen: je 2 bis 100); leer = in Ordnung. */
export function fehlerReihe(r: { werte: number[]; falsch: string | null }, min: number, max: number, was: 'reihe' | 'gruppe'): string {
  if (r.falsch !== null) return L(`„${r.falsch}“ ist keine Zahl. Bitte Zahlen mit Leerzeichen oder Semikolon trennen; das Dezimalzeichen ist das Komma.`, `"${r.falsch}" is not a number. Please separate numbers with spaces or semicolons; the decimal mark is the comma.`);
  if (r.werte.length < min) return was === 'reihe' ? L(`Bitte mindestens ${min} Werte eingeben.`, `Please enter at least ${min} values.`) : L(`Jede Gruppe braucht mindestens ${min} Werte.`, `Each group needs at least ${min} values.`);
  if (r.werte.length > max) return was === 'reihe' ? L(`Bitte höchstens ${max} Werte eingeben (es sind ${r.werte.length}).`, `Please enter at most ${max} values (there are ${r.werte.length}).`) : L(`Jede Gruppe darf höchstens ${max} Werte haben (es sind ${r.werte.length}).`, `Each group can have at most ${max} values (there are ${r.werte.length}).`);
  return '';
}
export const reiheHinweisMax = () => L(`Höchstens ${BOOTSTRAP_MAX} Werte.`, `At most ${BOOTSTRAP_MAX} values.`);
export const gruppeHinweisMax = () => L(`Je Gruppe höchstens ${GRUPPE_MAX} Werte.`, `At most ${GRUPPE_MAX} values per group.`);

/* ------------------------------------------------------------------ Achsen */
/** Schöne Marken im Bereich [lo; hi] (wie R pretty), höchstens etwa n. */
export function marken(lo: number, hi: number, n = 5): number[] {
  if (!(hi > lo)) return [lo];
  return pretty(lo, hi, n, 1).filter(v => v >= lo - 1e-9 * (hi - lo) && v <= hi + 1e-9 * (hi - lo));
}
/** Lineare Abbildung [d0; d1] → [r0; r1]. */
export const skala = (d0: number, d1: number, r0: number, r1: number) => (v: number) => (d1 === d0 ? (r0 + r1) / 2 : r0 + ((r1 - r0) * (v - d0)) / (d1 - d0));
/** Logarithmische Abbildung (v ≥ 1). */
export const logSkala = (d0: number, d1: number, r0: number, r1: number) => (v: number) => (d1 <= d0 ? r0 : r0 + ((r1 - r0) * (Math.log10(Math.max(v, d0)) - Math.log10(d0))) / (Math.log10(d1) - Math.log10(d0)));
/** Zehnerpotenzen 1, 10, 100 … bis n als Marken für die Wiederholungs-Achse. */
export const zehnerMarken = (n: number) => { const r: number[] = []; for (let v = 1; v <= n; v *= 10) r.push(v); if (r.at(-1) !== n) r.push(n); return r; };
/** Zahl für Achsenmarken ohne unnötige Stellen. */
export const achsenZahl = (v: number) => zahlDe(Math.abs(v) < 1e-9 ? 0 : Number(v.toPrecision(6)));

/* ------------------------------------------------------------------ Namen */
export const POPULATIONEN: { art: Population['art']; name: Paar; text: Paar }[] = [
  { art: 'normal', name: P('Normalverteilung', 'Normal distribution'), text: P('Glockenform, symmetrisch', 'Bell-shaped, symmetric') },
  { art: 'gleich', name: P('Gleichverteilung', 'Uniform distribution'), text: P('Alle Werte gleich häufig, flach', 'All values equally likely, flat') },
  { art: 'exponential', name: P('Stark schief (Exponentialverteilung)', 'Strongly skewed (exponential distribution)'), text: P('Viele kleine, wenige sehr große Werte', 'Many small, a few very large values') },
  { art: 'zweigipflig', name: P('Zweigipflig', 'Two-peaked'), text: P('Zwei Häufungen, in der Mitte kaum Werte', 'Two clusters, hardly any values in the middle') },
  { art: 'wuerfel', name: P('Würfel', 'Die'), text: P('Augenzahl 1 bis 6, jede gleich wahrscheinlich', 'Pips 1 to 6, each equally likely') },
  { art: 'anteil', name: P('Anteil (Ja oder Nein)', 'Proportion (yes or no)'), text: P('Jede Person ist mit Wahrscheinlichkeit p ein Treffer', 'Each person is a hit with probability p') }
];

/* ------------------------------------------------------------------ a) Stichprobenverteilung */
export const SATZ_ZUFALL = () => L('Die Zufallszahlen stimmen nicht mit R oder SPSS überein; gleiche Verteilung, andere Zahlen.', 'The random numbers do not match those of R or SPSS; same distribution, different numbers.');

export function satzStichprobe(e: Stichprobenverteilung, art: Population['art']): string {
  const mw = g4(e.mittelDerWerte), mu = g4(e.theoretischerMittel), se = g4(e.empirischerSE), so = g4(e.theoretischerSE);
  if (art === 'anteil') {
    return L(`Bei ${e.B} Stichproben vom Umfang n = ${e.n} (Startwert ${e.startwert}) liegen die ${e.B} Anteile im Mittel bei ${mw}; in der Grundgesamtheit ist der Anteil ${mu}. Die Anteile streuen mit einem Standardfehler von ${se}; die Formel √(p(1−p)/n) gibt ${so}.`,
      `For ${e.B} samples of size n = ${e.n} (seed ${e.startwert}) the ${e.B} proportions average ${mw}; in the population the proportion is ${mu}. The proportions vary with a standard error of ${se}; the formula √(p(1−p)/n) gives ${so}.`);
  }
  return L(`Bei ${e.B} Stichproben vom Umfang n = ${e.n} (Startwert ${e.startwert}) liegen die ${e.B} Mittelwerte im Mittel bei ${mw}; die Grundgesamtheit hat den Mittelwert ${mu}. Die Mittelwerte streuen mit einem Standardfehler von ${se}; die Formel σ/√n gibt ${so}.`,
    `For ${e.B} samples of size n = ${e.n} (seed ${e.startwert}) the ${e.B} means average ${mw}; the population mean is ${mu}. The means vary with a standard error of ${se}; the formula σ/√n gives ${so}.`);
}
export const lehreStichprobe = () => L('Je größer n, desto schmaler wird die Verteilung der Mittelwerte (Standardfehler σ/√n) und desto mehr gleicht sie einer Glocke - auch wenn die Grundgesamtheit schief ist (Zentraler Grenzwertsatz).',
  'The larger n, the narrower the distribution of the means (standard error σ/√n) and the more it looks like a bell - even if the population is skewed (central limit theorem).');

/* ------------------------------------------------------------------ b) Bootstrap */
export function satzBootstrap(e: BootstrapErgebnis): string {
  const np = zahlDe(e.niveau * 100, 0);
  return L(`Die ${e.n} Werte haben den Mittelwert ${g4(e.mittel)}. In ${e.B} Ziehungen mit Zurücklegen (Startwert ${e.startwert}) streuen die Bootstrap-Mittelwerte mit einem Standardfehler von ${g4(e.se)}; das ${proz(np)}-Perzentil-Intervall ist ${iv(g4(e.lo), g4(e.hi))}.`,
    `The ${e.n} values have the mean ${g4(e.mittel)}. In ${e.B} draws with replacement (seed ${e.startwert}) the bootstrap means vary with a standard error of ${g4(e.se)}; the ${proz(np)} percentile interval is ${iv(g4(e.lo), g4(e.hi))}.`);
}
export const satzBootstrapT = (e: BootstrapErgebnis) => L(`Zum Vergleich das t-Intervall aus den Kennzahlen (Mittelwert, Standardabweichung, n): ${iv(g4(e.tLo), g4(e.tHi))}.`, `For comparison, the t interval from the summary statistics (mean, standard deviation, n): ${iv(g4(e.tLo), g4(e.tHi))}.`);
export const lehreBootstrap = () => L('Das Bootstrap-Intervall mischt nur die vorhandenen Werte neu und nimmt keine Normalverteilung an; es kann deshalb anders ausfallen als das t-Intervall.',
  'The bootstrap interval only reshuffles the values at hand and assumes no normal distribution; it can therefore differ from the t interval.');
export const hinweisKleinBootstrap = () => L('Bei weniger als 10 Werten fällt das Perzentil-Intervall oft zu eng aus (Hesterberg 2015); dann besser dem t-Intervall oder einer größeren Stichprobe trauen.',
  'With fewer than 10 values the percentile interval is often too narrow (Hesterberg 2015); prefer the t interval or a larger sample.');

/* ------------------------------------------------------------------ c) Randomisierungstest */
export function satzRandomisierung(e: RandomisierungErgebnis): string {
  return L(`Die beiden Gruppen unterscheiden sich im Mittel um ${g4(e.beobachtet)} (Gruppe 1 minus Gruppe 2). Von ${e.B} Mischungen (Startwert ${e.startwert}) liefern ${e.anzahl} einen Unterschied, der dem Betrag nach mindestens so groß ist: p ≈ ${ohneNull(e.p, 3)} = (${e.anzahl} + 1)/(${e.B} + 1).`,
    `The two groups differ on average by ${g4(e.beobachtet)} (group 1 minus group 2). Of ${e.B} shuffles (seed ${e.startwert}), ${e.anzahl} give a difference at least as large in absolute value: p ≈ ${ohneNull(e.p, 3)} = (${e.anzahl} + 1)/(${e.B} + 1).`);
}
export const satzRandomisierungExakt = (x: { p: number; anzahl: number; gesamt: number }) => L(`Alle ${x.gesamt} möglichen Aufteilungen durchgezählt: ${x.anzahl} davon liefern einen mindestens so großen Unterschied, also p = ${x.anzahl}/${x.gesamt} = ${ohneNull(x.p, 4)}.`,
  `Counting all ${x.gesamt} possible splits: ${x.anzahl} of them give a difference at least as large, so p = ${x.anzahl}/${x.gesamt} = ${ohneNull(x.p, 4)}.`);
export const hinweisKeineVollauszaehlung = () => L('Es gibt mehr als 20 000 mögliche Aufteilungen; dann wird nicht alles durchgezählt, es bleibt bei der Simulation.',
  'There are more than 20,000 possible splits; then not everything is counted, the simulation stands.');
export function satzWelch(w: { t: number; df: number; p: number }): string {
  const df = Number.isInteger(w.df) ? zahlDe(w.df) : zahlDe(w.df, 1);
  return L(`Zum Vergleich der Welch-t-Test (nach der Formel gerechnet): t(${df}) = ${zahlDe(w.t, 2)}, p ${pWert(w.p)}.`, `For comparison, the Welch t test (computed by formula): t(${df}) = ${zahlDe(w.t, 2)}, p ${pWert(w.p)}.`);
}
export const lehreRandomisierung = () => L('Der p-Wert ist der Anteil der Mischungen, die bei zufällig zugeordneten Gruppen einen so großen Unterschied liefern wie die beobachtete Einteilung. Die „+1“ sorgt dafür, dass p nie genau 0 ist.',
  'The p value is the share of shuffles that give a difference as large as the observed split when groups are assigned at random. The "+1" makes sure p is never exactly 0.');

/* ------------------------------------------------------------------ d) Zufallsexperimente */
export function satzExperiment(ereignis: string, N: number, startwert: number, relativ: number, p: number): string {
  return L(`Nach ${N} Wiederholungen (Startwert ${startwert}) ist die relative Häufigkeit für „${ereignis}“ ${wk(relativ)}; die Wahrscheinlichkeit ist ${wk(p)}.`,
    `After ${N} repetitions (seed ${startwert}) the relative frequency of "${ereignis}" is ${wk(relativ)}; the probability is ${wk(p)}.`);
}
export const lehreGrosseZahlen = () => L('Je mehr Wiederholungen, desto näher liegt die relative Häufigkeit an der Wahrscheinlichkeit (Gesetz der großen Zahlen). Am Anfang sind große Ausschläge ganz normal; die Häufigkeit gleicht frühere Abweichungen nicht „aus“, sie verdünnt sie nur.',
  'The more repetitions, the closer the relative frequency gets to the probability (law of large numbers). Large swings at the start are perfectly normal; the frequency does not "make up" for earlier deviations, it only dilutes them.');
export const ereignisMuenze = () => L('Treffer', 'Hit');
export const ereignisAugenzahl = (k: number) => L(`Augenzahl ${k}`, `Pips ${k}`);
export const ereignisSumme = (k: number) => L(`Augensumme ${k}`, `Sum ${k}`);
export const ereignisRot = (k: number) => Lp(k, `genau ${k} rote Kugel`, `genau ${k} rote Kugeln`, `exactly ${k} red ball`, `exactly ${k} red balls`);

/* ------------------------------------------------------------------ e) Vierfeldertafel und Baum */
export function saetzeBayes(v: Vierfeldertafel): string[] {
  const s: string[] = [];
  s.push(L(`Unter ${haeuf(v.n)} Personen sind ${haeuf(v.krank)} krank.`, `Among ${haeuf(v.n)} people, ${haeuf(v.krank)} are ill.`));
  s.push(L(`Von diesen ${haeuf(v.krank)} Kranken testen ${haeuf(v.rp)} positiv (richtig positiv) und ${haeuf(v.fn)} negativ (falsch negativ).`, `Of these ${haeuf(v.krank)} ill people, ${haeuf(v.rp)} test positive (true positive) and ${haeuf(v.fn)} negative (false negative).`));
  s.push(L(`Von den ${haeuf(v.gesund)} Gesunden testen ${haeuf(v.fp)} positiv (falsch positiv) und ${haeuf(v.rn)} negativ (richtig negativ).`, `Of the ${haeuf(v.gesund)} healthy people, ${haeuf(v.fp)} test positive (false positive) and ${haeuf(v.rn)} negative (true negative).`));
  s.push(L(`Von den ${haeuf(v.positiv)} positiv Getesteten sind ${haeuf(v.rp)} wirklich krank: ${wk(v.ppv)} (positiver Vorhersagewert).`, `Of the ${haeuf(v.positiv)} who tested positive, ${haeuf(v.rp)} are really ill: ${wk(v.ppv)} (positive predictive value).`));
  s.push(L(`Von den ${haeuf(v.negativ)} negativ Getesteten sind ${haeuf(v.rn)} wirklich gesund: ${wk(v.npv)} (negativer Vorhersagewert).`, `Of the ${haeuf(v.negativ)} who tested negative, ${haeuf(v.rn)} are really healthy: ${wk(v.npv)} (negative predictive value).`));
  return s;
}
export const hinweisNichtGanz = () => L('Die Zahlen sind nicht alle ganz. Sie werden nicht gerundet, damit die Vorhersagewerte stimmen; mit einer größeren Bezugsgröße (zum Beispiel 100 000) werden sie meist ganz.',
  'Not all numbers are whole. They are not rounded so that the predictive values stay correct; a larger reference size (for example 100,000) usually makes them whole.');
export const lehreBayes = () => L('Die Bayes-Formel ist der umgekehrte Baum: Man fragt nicht „Wie viele Kranke testen positiv?“, sondern „Wie viele positiv Getestete sind krank?“. Bei seltenen Krankheiten sind unter den positiv Getesteten viele Gesunde, selbst bei einem guten Test.',
  'The Bayes formula is the reversed tree: instead of "How many ill people test positive?" it asks "How many of those who test positive are ill?". For rare diseases many of those who test positive are healthy, even with a good test.');
/** Rechenweg Schritt für Schritt (Prävalenz π, Sensitivität Se, Spezifität Sp als Dezimalzahlen). */
export function rechenwegBayes(v: Vierfeldertafel): string[] {
  const pi = v.praevalenz, se = v.se, sp = v.sp, pPos = se * pi + (1 - sp) * (1 - pi), pNeg = (1 - se) * pi + sp * (1 - pi);
  const f = (x: number) => zahlDe(Number(x.toPrecision(6)));
  return [
    `P(${L('positiv', 'positive')}) = Se·π + (1 − Sp)·(1 − π) = ${f(se)}·${f(pi)} + ${f(1 - sp)}·${f(1 - pi)} = ${f(pPos)}`,
    `PPV = P(${L('krank | positiv', 'ill | positive')}) = Se·π / P(${L('positiv', 'positive')}) = ${f(se * pi)} / ${f(pPos)} = ${f((se * pi) / pPos)}`,
    `P(${L('negativ', 'negative')}) = (1 − Se)·π + Sp·(1 − π) = ${f(1 - se)}·${f(pi)} + ${f(sp)}·${f(1 - pi)} = ${f(pNeg)}`,
    `NPV = P(${L('gesund | negativ', 'healthy | negative')}) = Sp·(1 − π) / P(${L('negativ', 'negative')}) = ${f(sp * (1 - pi))} / ${f(pNeg)} = ${f((sp * (1 - pi)) / pNeg)}`
  ];
}
export function satzUnabhaengig(pA: number, pB: number, pAB: number, gleich: boolean): string {
  const a = sechs(pAB), b = sechs(pA * pB);
  return gleich
    ? L(`P(krank und positiv) = ${a} und P(krank)·P(positiv) = ${b} sind gleich: Krankheit und Testergebnis sind unabhängig (der Test sagt nichts über die Krankheit).`, `P(ill and positive) = ${a} and P(ill)·P(positive) = ${b} are equal: illness and test result are independent (the test says nothing about the illness).`)
    : L(`P(krank und positiv) = ${a} und P(krank)·P(positiv) = ${b} sind verschieden: Krankheit und Testergebnis sind abhängig (das Testergebnis sagt etwas über die Krankheit).`, `P(ill and positive) = ${a} and P(ill)·P(positive) = ${b} differ: illness and test result are dependent (the test result says something about the illness).`);
}
export const hinweisRundung = () => L('Als gleich gilt nur, was auf 9 Stellen übereinstimmt. Gerundete Prozentwerte können Unabhängigkeit „zerstören“: 33 % sind nicht 1/3. Dafür kann man Brüche wie 1/3 eintippen.', 'Only what agrees to 9 decimals counts as equal. Rounded percentages can "destroy" independence: 33% is not 1/3. You can type fractions such as 1/3 instead.');

/** Eingabefehler Vierfeldertafel (leer = in Ordnung). */
export function fehlerRate(pi: number, se: number, sp: number, N: number | undefined): string {
  if (Number.isNaN(pi)) return L('Die Prävalenz muss zwischen 0 und 100 % liegen (oder ein Bruch wie 1/200 sein).', 'The prevalence must be between 0 and 100% (or a fraction such as 1/200).');
  if (Number.isNaN(se)) return L('Die Sensitivität muss zwischen 0 und 100 % liegen.', 'The sensitivity must be between 0 and 100%.');
  if (Number.isNaN(sp)) return L('Die Spezifität muss zwischen 0 und 100 % liegen.', 'The specificity must be between 0 and 100%.');
  if (N !== undefined && !(Number.isInteger(N) && N >= 1 && N <= 1e9)) return L('Die Bezugsgröße muss eine ganze Zahl von 1 bis 1 000 000 000 sein.', 'The reference size must be a whole number from 1 to 1,000,000,000.');
  if (pi * se + (1 - sp) * (1 - pi) === 0) return L('Mit diesen Werten gibt es nie ein positives Ergebnis; der positive Vorhersagewert ist nicht definiert.', 'With these values there is never a positive result; the positive predictive value is undefined.');
  if ((1 - se) * pi + sp * (1 - pi) === 0) return L('Mit diesen Werten gibt es nie ein negatives Ergebnis; der negative Vorhersagewert ist nicht definiert.', 'With these values there is never a negative result; the negative predictive value is undefined.');
  return '';
}
export function fehlerHaeufig(z: number[]): string {
  if (!z.every(v => Number.isInteger(v) && v >= 0)) return L('Die vier Häufigkeiten müssen ganze Zahlen von 0 an sein.', 'The four frequencies must be whole numbers of 0 or more.');
  const [rp, fp, fn, rn] = z as [number, number, number, number];
  if (rp + fp + fn + rn === 0) return L('Mindestens eine Häufigkeit muss größer als 0 sein.', 'At least one frequency must be greater than 0.');
  if (rp + fn === 0 || fp + rn === 0) return L('Es braucht Kranke und Gesunde (beide Summen größer als 0), sonst sind Sensitivität und Spezifität nicht definiert.', 'There must be ill and healthy people (both sums greater than 0), otherwise sensitivity and specificity are undefined.');
  if (rp + fp === 0 || fn + rn === 0) return L('Es braucht positive und negative Testergebnisse, sonst sind die Vorhersagewerte nicht definiert.', 'There must be positive and negative test results, otherwise the predictive values are undefined.');
  return '';
}

/* ------------------------------------------------------------------ f) Überdeckung */
/** Liegt die exakte Überdeckung mehr als drei Prozentpunkte unter dem gewählten Niveau? */
export const deutlichDarunter = (exakt: number, niveau: number) => exakt < niveau - 0.03;
/**
 * Erster Satz der Überdeckung. Das gewählte Niveau ist das ZIEL des Verfahrens; liegt die exakte Überdeckung (nur Anteile) deutlich darunter, steht stattdessen
 * ein ganzer anderer Schlusssatz mit der exakten Zahl - „etwa 95 von 100“ bleibt dann nicht stehen.
 */
export function satzUeberdeckung(e: UeberdeckungErgebnis, runde: number, gesamt: number, gesamtUeberdeckt: number, exakt?: number | null): string {
  const nv = zahlDe(e.niveau * 100, 0);
  const a = L(`Von diesen ${e.anzahl} Intervallen (Startwert ${e.startwert}, Durchgang ${runde}) überdecken ${e.ueberdeckt} den wahren Wert ${g4(e.wahr)}.`, `Of these ${e.anzahl} intervals (seed ${e.startwert}, round ${runde}) ${e.ueberdeckt} cover the true value ${g4(e.wahr)}.`);
  const b = gesamt > e.anzahl ? ' ' + L(`Zusammen sind es ${gesamtUeberdeckt} von ${gesamt} (${prozent(gesamtUeberdeckt / gesamt, 1)}).`, `Together that is ${gesamtUeberdeckt} of ${gesamt} (${prozent(gesamtUeberdeckt / gesamt, 1)}).`) : '';
  if (exakt !== null && exakt !== undefined && deutlichDarunter(exakt, e.niveau)) {
    const ex = zahlDe(Math.round(exakt * 100), 0);
    return a + b + ' ' + L(`Das Verfahren zielt auf ein Niveau von ${nv} %, überdeckt aber bei diesen Eingaben auf lange Sicht nur etwa ${ex} von 100 Mal - ein einzelnes Intervall überdeckt oder nicht.`,
      `The procedure aims at a level of ${nv}%, but with these inputs it covers the true value only about ${ex} times in 100 in the long run - a single interval either covers it or not.`);
  }
  return a + b + ' ' + L(`Das Verfahren zielt auf ein Niveau von ${nv} %: auf lange Sicht soll es etwa ${nv} von 100 Mal überdecken - ein einzelnes Intervall überdeckt oder nicht.`,
    `The procedure aims at a level of ${nv}%: in the long run it should cover the true value about ${nv} times in 100 - a single interval either covers it or not.`);
}

/** Liegt die EXAKTE Überdeckung (Summe über alle möglichen Ausgänge) deutlich unter dem Niveau, sagt der Satz es; sonst leer. */
export function satzExakteUeberdeckung(exakt: number, niveau: number, mitWald: boolean, exaktWald?: number): string {
  const zahl = zahlDe(Math.round(exakt * 100), 0);
  const a = deutlichDarunter(exakt, niveau)
    ? L(`Bei kleinem n und p nahe 0 oder 1 überdeckt auch Wilson seltener als das Niveau, hier etwa ${zahl} von 100.`, `With small n and p close to 0 or 1, Wilson also covers less often than the level, here about ${zahl} in 100.`)
    : '';
  const b = mitWald && exaktWald !== undefined
    ? L(`Die Schulformel (Wald) überdeckt bei diesen Eingaben auf lange Sicht genau ${prozent(exaktWald, 1)}, Wilson ${prozent(exakt, 1)}.`, `With these inputs the textbook formula (Wald) covers exactly ${prozent(exaktWald, 1)} in the long run, Wilson ${prozent(exakt, 1)}.`)
    : '';
  return [a, b].filter(Boolean).join(' ');
}
export function satzWaldVergleich(wilsonU: number, waldU: number, gesamt: number): string {
  return L(`Die Schulformel (Wald) überdeckt in dieser Simulation ${prozent(waldU / gesamt, 1)} der ${gesamt} Intervalle, Wilson ${prozent(wilsonU / gesamt, 1)}. Bei kleinem n und kleinem oder großem p kann Wald auf lange Sicht deutlich unter dem Niveau liegen (Brown, Cai & DasGupta 2001); deshalb rechnet Statable mit Wilson.`,
    `In this simulation the textbook formula (Wald) covers ${prozent(waldU / gesamt, 1)} of the ${gesamt} intervals, Wilson ${prozent(wilsonU / gesamt, 1)}. With small n and small or large p, Wald can fall clearly below the level in the long run (Brown, Cai & DasGupta 2001); this is why Statable uses Wilson.`);
}
export const lehreKiNiveau = (niveau: number) => {
  const nv = zahlDe(niveau * 100, 0);
  return L(`Das Niveau gehört zum Verfahren, nicht zu einem einzelnen Intervall. Richtig ist nicht „mit ${nv} % liegt p in diesem Intervall“, sondern „so ein Verfahren überdeckt auf lange Sicht etwa ${nv} von 100 Mal“.`,
    `The level belongs to the procedure, not to a single interval. What is right is not "p lies in this interval with ${nv}%" but "in the long run such a procedure covers the true value about ${nv} times in 100".`);
};

/** Bild der Grundgesamtheit als Säulen (Wahrscheinlichkeit je Klasse; Fläche 1): `zaehler` sind hier Wahrscheinlichkeiten, nicht Anzahlen. */
export function populationBild(pop: Population): Histogramm {
  const klassen = (lo: number, hi: number, k: number, wk: (a: number, b: number) => number): Histogramm => {
    const w = (hi - lo) / k, kanten = Array.from({ length: k + 1 }, (_, i) => lo + i * w), zaehler = Array.from({ length: k }, (_, i) => wk(kanten[i]!, kanten[i + 1]!));
    return { kanten, zaehler, dichte: zaehler.map(c => c / w), diskret: false, schritt: w };
  };
  const nv = (a: number, b: number, mu: number, sd: number) => ((b - a) / 6) * (normalDichte(a, mu, sd) + 4 * normalDichte((a + b) / 2, mu, sd) + normalDichte(b, mu, sd));   // Simpson je Klasse
  switch (pop.art) {
    case 'normal': return klassen(pop.mu - 4 * pop.sigma, pop.mu + 4 * pop.sigma, 40, (a, b) => nv(a, b, pop.mu, pop.sigma));
    case 'gleich': return klassen(pop.a, pop.b, 20, (a, b) => (b - a) / (pop.b - pop.a));
    case 'exponential': return klassen(0, 6 / pop.rate, 40, (a, b) => Math.exp(-pop.rate * a) - Math.exp(-pop.rate * b));
    case 'zweigipflig': return klassen(Math.min(pop.mu1, pop.mu2) - 4 * pop.sigma, Math.max(pop.mu1, pop.mu2) + 4 * pop.sigma, 48, (a, b) => 0.5 * nv(a, b, pop.mu1, pop.sigma) + 0.5 * nv(a, b, pop.mu2, pop.sigma));
    case 'wuerfel': return { kanten: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5], zaehler: Array(6).fill(1 / 6), dichte: Array(6).fill(1 / 6), diskret: true, schritt: 1 };
    case 'anteil': return { kanten: [-0.5, 0.5, 1.5], zaehler: [1 - pop.p, pop.p], dichte: [1 - pop.p, pop.p], diskret: true, schritt: 1 };
  }
}
/** μ und σ der Grundgesamtheit als Text für die Beschriftung. */
export const popKennText = (pop: Population) => { const k = populationKennzahlen(pop); return `μ = ${g4(k.mittel)}, σ = ${g4(k.sd)}`; };
