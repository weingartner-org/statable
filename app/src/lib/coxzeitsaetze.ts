/**
 * Später S-F, Teil 2: Sätze zum Umformer (Zeitpunkte je Person → Intervalle), zur Prüfung der Intervall-Form und zum Ergebnis der Cox-Regression mit zeitabhängiger Größe.
 * Zahlen: coxzeit.ts; die Cox-Rechnung selbst und ihre Tabellen: cox.ts / coxsaetze.ts (dieselben Koeffizienten-Sätze). Ganze Sätze je Fall, übersetzbar.
 * ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { ki } from '../i18n/profil';
import { komma, pWert, kurz, unter05 } from './ergebnis';
import { phVerletzt, phGesamtVerletzt, type CoxErgebnis } from './cox';
import { coxPhHinweise, trennungHinweis, epvHinweis, koefSatz, lrSatz, coxUnsicher, tabellenCox, hr, hrTxt, sig, chi, type CoxSaetze } from './coxsaetze';
import type { ZpHinweise, ZpFehlerCode, ZpHinweisCode, IntervallPruefung, CoxZeitInfo } from './coxzeit';

const T = L;
const personen = (n: number) => Lp(n, `${n} Person`, `${n} Personen`, `${n} person`, `${n} people`);
const zeilenT = (n: number) => Lp(n, `${n} Zeile`, `${n} Zeilen`, `${n} row`, `${n} rows`);
const ereignisseT = (n: number) => Lp(n, `${n} Ereignis`, `${n} Ereignisse`, `${n} event`, `${n} events`);
/** Der Betrag des Vorziehens mit drei gültigen Stellen, ohne überflüssige Nullen. */
const betragT = (v: number) => komma(v, Math.min(6, Math.max(0, 2 - Math.floor(Math.log10(v))))).replace(/([.,]\d*?)0+$/, '$1').replace(/[.,]$/, '');

/** Der Satz zum Umformen: was aus den Personen geworden ist und was am Wechseltag und am Rand auffiel. Der Ereignistag wird nur genannt, wenn jemand betroffen ist. */
export function umformSatz(h: ZpHinweise, vorzug?: number): string {
  const geteilt = h.geteilt;
  const teile = [T(`Aus ${personen(h.personen)} sind ${zeilenT(h.zeilen)} geworden (${personen(geteilt)} mit Wechsel; ${ereignisseT(h.ereignisse)}).`,
    `${personen(h.personen)} became ${zeilenT(h.zeilen)} (${personen(geteilt)} with a switch; ${ereignisseT(h.ereignisse)}).`)];
  if (h.wechselAmEnde > 0) teile.push(h.regel === 'zaehlt'
    ? (vorzug !== undefined
      ? T(`Bei ${personen(h.wechselAmEnde)} fiel der Wechsel auf den Tag des Ereignisses; er zählt schon (die Regel der survival-Vignette: der Wechsel wird um ${betragT(vorzug)} Zeiteinheiten vorgezogen, die Hälfte des kleinsten Zeitabstands in den Daten).`, `For ${personen(h.wechselAmEnde)} the switch fell on the day of the event; it counts already (the rule of the survival vignette: the switch is moved forward by ${betragT(vorzug)} time units, half of the smallest time gap in the data).`)
      : T(`Bei ${personen(h.wechselAmEnde)} fiel der Wechsel auf den Tag des Ereignisses; er zählt schon (die Regel der survival-Vignette: der Wechsel wird um die Hälfte des kleinsten Zeitabstands in den Daten vorgezogen).`, `For ${personen(h.wechselAmEnde)} the switch fell on the day of the event; it counts already (the rule of the survival vignette: the switch is moved forward by half of the smallest time gap in the data).`))
    : T(`Bei ${personen(h.wechselAmEnde)} fiel der Wechsel auf den Tag des Ereignisses; er zählt nicht (streng: der Wert gilt erst danach, das Ereignis gehört noch zum alten Wert).`, `For ${personen(h.wechselAmEnde)} the switch fell on the day of the event; it does not count (strict: the value applies only afterwards, the event still belongs to the old value).`));
  if (h.wechselAmAnfang > 0) teile.push(T(`Bei ${personen(h.wechselAmAnfang)} lag der Wechsel am Anfang oder davor; sie haben den Wert 1 von Anfang an.`, `For ${personen(h.wechselAmAnfang)} the switch was at the start or before; they have the value 1 from the beginning.`));
  if (h.wechselNachEnde > 0) teile.push(T(`Bei ${personen(h.wechselNachEnde)} lag der Wechsel nach dem Ende der Beobachtung; sie bleiben ohne Wechsel. Ist das gemeint? Es kann ein Eingabefehler sein.`, `For ${personen(h.wechselNachEnde)} the switch came after the end of observation; they stay without a switch. Is that intended? It may be an input error.`));
  if (h.ausgeschlossen > 0) teile.push(T(`${personen(h.ausgeschlossen)} wurden ausgeschlossen (Ende fehlt oder ist nicht größer als 0, Ereignis nicht 0 oder 1, oder Kennung fehlt).`, `${personen(h.ausgeschlossen)} were excluded (end missing or not greater than 0, event not 0 or 1, or ID missing).`));
  return teile.join(' ');
}

/** Der Satz zum Unsterblichkeitsfehler (Immortal time bias): nur Werte, die zum Zeitpunkt schon bekannt waren. */
export function unsterblichkeitSatz(): string {
  return T('Die zeitabhängige Größe darf zu jedem Zeitpunkt nur Werte haben, die zu diesem Zeitpunkt schon bekannt waren. Wer erst später wechselt, musste bis dahin überleben; zählt man ihn von Anfang an als „gewechselt“, sieht die Gruppe der Gewechselten nur wegen dieses Fehlers (Unsterblichkeitsfehler) länger lebend aus.',
    'The time-dependent covariate may only have values that were already known at that point in time. Anyone who switches later had to survive until then; if such a person is counted as "switched" from the start, the group of those who switched looks longer-lived only because of this error (immortal time bias).');
}

/** Der Satz zur Wahl der Regel am Ereignistag (Hinweis im Assistenten): was „streng“ und was „zählt“ bedeuten. */
export function regelSatz(): string {
  return T('Fällt der Wechsel auf den Tag des Ereignisses, entscheidet die Regel über das Ergebnis. Streng (Voreinstellung): Der Wechsel gilt erst danach, das Ereignis gehört noch zum alten Wert. „Zählt schon“: Der Wechsel wird um die Hälfte des kleinsten Zeitabstands in den Daten vorgezogen (bei Tagen 0,5), so rechnet die survival-Vignette.',
    'If the switch falls on the day of the event, the rule decides the result. Strict (default): the switch applies only afterwards, the event still belongs to the old value. "Counts already": the switch is moved forward by half of the smallest time gap in the data (0.5 for days), as in the survival vignette.');
}

/** Sätze zu den Fehlern und Hinweisen der Prüfung der Intervall-Form. */
export function fehlerSatz(c: ZpFehlerCode): string {
  switch (c) {
    case 'start-nicht-kleiner': return T('In mindestens einer Zeile ist der Start nicht kleiner als das Ende des Abschnitts.', 'In at least one row the start is not less than the end of the interval.');
    case 'ueberlappung': return T('Die Abschnitte einer Person überlappen sich: Ein Abschnitt beginnt vor dem Ende des vorigen.', 'The intervals of one person overlap: an interval starts before the previous one ends.');
    case 'luecke': return T('Zwischen den Abschnitten einer Person gibt es eine Lücke: Ein Abschnitt beginnt erst nach dem Ende des vorigen.', 'There is a gap between the intervals of one person: an interval starts only after the previous one ends.');
    case 'mehrere-ereignisse': return T('Eine Person hat in mehr als einer Zeile ein Ereignis. Mehrfachereignisse sind kein einfaches Cox-Modell; Statable rechnet sie nicht.', 'A person has an event in more than one row. Repeated events are not a simple Cox model; Statable does not calculate them.');
    case 'ereignis-nicht-am-ende': return T('Das Ereignis steht nicht in der letzten Zeile der Person. Das Ereignis (1) gehört nur in die letzte Zeile.', 'The event is not in the person\'s last row. The event (1) belongs only in the last row.');
  }
}
export function pruefHinweisSatz(c: ZpHinweisCode, p: IntervallPruefung): string {
  switch (c) {
    case 'ereignisse-nur-ein-wert': return p.ereignisseBeiWert0 > 0
      ? T('Alle Ereignisse treten beim Wert 0 auf (vor dem Wechsel). Dann lässt sich die Wirkung des Wechsels nicht schätzen.', 'All events occur at the value 0 (before the switch). The effect of the switch cannot be estimated then.')
      : T('Alle Ereignisse treten beim Wert 1 auf (nach dem Wechsel). Dann lässt sich die Wirkung des Wechsels nicht schätzen.', 'All events occur at the value 1 (after the switch). The effect of the switch cannot be estimated then.');
    case 'wenig-wechsel': return Lp(p.personenMitWechsel, `Nur ${p.personenMitWechsel} Person hat einen Wechsel: Das ist wenig Information, die Schätzung ist sehr unsicher.`, `Nur ${p.personenMitWechsel} Personen haben einen Wechsel: Das ist wenig Information, die Schätzung ist sehr unsicher.`, `Only ${p.personenMitWechsel} person has a switch: that is little information, the estimate is very uncertain.`, `Only ${p.personenMitWechsel} people have a switch: that is little information, the estimate is very uncertain.`);
  }
}

/* ------------------------------------------------------------ Ergebnis der Cox-Regression mit zeitabhängiger Größe */

/** Der Satz zur zeitabhängigen Größe: Richtung, Stärke, Vorsicht (nie „x-mal so wahrscheinlich“). */
function wertSatz(e: CoxErgebnis, info: CoxZeitInfo, name: (n: string) => string, ereignis: string): string {
  const k = e.koef.find(x => x.pIdx === 0);
  if (!k) return '';
  const n = kurz(name(info.wertName)), s = sig(k.p), aussage = `${hrTxt(k.hr)}, ${ki(hr(k.kiU), hr(k.kiO))}, p ${pWert(k.p)}`;
  if (coxUnsicher(e, k)) return T(`Für ${n} lässt sich keine Hazard Ratio schätzen (zum Beispiel, weil es nach dem Wechsel kein Ereignis gibt).`, `For ${n} no hazard ratio can be estimated (for example because there is no event after the switch).`);
  if (!s) return T(`Für die zeitabhängige Größe ${n} zeigt sich kein signifikanter Zusammenhang mit dem Hazard für ${ereignis} (${aussage}).`, `For the time-dependent covariate ${n} there is no significant relationship with the hazard of ${ereignis} (${aussage}).`);
  const hoch = k.hr >= 1, fe = hr(k.hr);
  if (info.binaer) return hoch
    ? T(`Nach dem Wechsel bei ${n} ist der Hazard für ${ereignis} zu jedem Zeitpunkt auf das ${fe}-Fache erhöht (${aussage}).`, `After the switch in ${n}, the hazard of ${ereignis} is raised to ${fe} times at any time (${aussage}).`)
    : T(`Nach dem Wechsel bei ${n} ist der Hazard für ${ereignis} zu jedem Zeitpunkt auf das ${fe}-Fache gesenkt (${aussage}).`, `After the switch in ${n}, the hazard of ${ereignis} is lowered to ${fe} times at any time (${aussage}).`);
  return hoch
    ? T(`Mit jeder Einheit mehr bei ${n} steigt der Hazard für ${ereignis} zu jedem Zeitpunkt auf das ${fe}-Fache (${aussage}).`, `With each additional unit of ${n}, the hazard of ${ereignis} at any time rises to ${fe} times (${aussage}).`)
    : T(`Mit jeder Einheit mehr bei ${n} sinkt der Hazard für ${ereignis} zu jedem Zeitpunkt auf das ${fe}-Fache (${aussage}).`, `With each additional unit of ${n}, the hazard of ${ereignis} at any time falls to ${fe} times (${aussage}).`);
}

export function saetzeCoxZeit(e: CoxErgebnis, info: CoxZeitInfo, name: (n: string) => string, ereignis: string): CoxSaetze {
  const m = e.modelltest;
  const hinweise = [...coxPhHinweise(e, name), trennungHinweis(e), epvHinweis(e),
    T('Bei zeitabhängigen Größen ist der Test der proportionalen Hazards nur ein Anhaltspunkt.', 'With time-dependent covariates the test of proportional hazards is only a guide.')].filter(Boolean);
  const kopf = (sg: boolean) => sg
    ? T(`Für die Zeit bis zum Ereignis wurde eine Cox-Regression mit zeitabhängiger Größe gerechnet (${personen(info.personen)} in ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}, Bindungen nach Efron): Das Modell erklärt die Zeit bis zum Ereignis signifikant besser als ein Modell ohne Angaben (Likelihood-Quotienten-Test ${chi(m)}).`,
      `A Cox regression with a time-dependent covariate was calculated for the time to the event (${personen(info.personen)} in ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}, ties by Efron): the model explains the time to the event significantly better than a model without predictors (likelihood ratio test ${chi(m)}).`)
    : T(`Für die Zeit bis zum Ereignis wurde eine Cox-Regression mit zeitabhängiger Größe gerechnet (${personen(info.personen)} in ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}, Bindungen nach Efron): Das Modell erklärt die Zeit bis zum Ereignis nicht signifikant besser als ein Modell ohne Angaben (Likelihood-Quotienten-Test ${chi(m)}).`,
      `A Cox regression with a time-dependent covariate was calculated for the time to the event (${personen(info.personen)} in ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}, ties by Efron): the model does not explain the time to the event significantly better than a model without predictors (likelihood ratio test ${chi(m)}).`);
  const modell = kopf(sig(m.p));
  const wert = wertSatz(e, info, name, `„${ereignis}“`);
  const andere = e.koef.filter(k => k.pIdx !== 0 && (coxUnsicher(e, k) || sig(k.p))).map(k => koefSatz(e, k, name, ereignis)).join(' ');
  const rest = e.koef.length > 1 ? T('Die übrigen Koeffizienten stehen in der Tabelle.', 'The remaining coefficients are in the table.') : '';
  const mehrere = e.praed.length > 1 ? e.lr.map(l => lrSatz(e, l, name)).join(' ') : '';
  const zusatz = [modell, wert, mehrere, andere, rest, e.ausgelassen > 0 ? Lp(e.ausgelassen, 'Eine Zeile mit einer Lücke wurde ausgelassen.', `${e.ausgelassen} Zeilen mit Lücken wurden ausgelassen.`, 'One row with a gap was left out.', `${e.ausgelassen} rows with gaps were left out.`) : ''].filter(Boolean).join(' ');
  const vorsicht = [unsterblichkeitSatz(),
    T('Das Ergebnis beschreibt einen Zusammenhang mit dem Risiko nach dem Wechsel, keinen Beweis für eine Wirkung. Ist die Größe selbst eine Folge der Krankheit (zum Beispiel ein Laborwert), verrät sie schon etwas über das Ereignis.', 'The result describes a relationship with the risk after the switch, not proof of an effect. If the covariate is itself a consequence of the illness (for example a lab value), it already says something about the event.'),
    T('Eine Hazard Ratio ist kein Risikoverhältnis: HR = 1,8 heißt nicht, dass das Ereignis 1,8-mal so wahrscheinlich ist, sondern dass es zu jedem Zeitpunkt mit 1,8-fachem Hazard (Momentanrisiko) auftritt.', 'A hazard ratio is not a risk ratio: HR = 1.8 does not mean that the event is 1.8 times as likely, but that it occurs at any time with 1.8 times the hazard (instantaneous risk).')].join(' ');
  const k0 = e.koef.find(k => k.pIdx === 0);
  const apa = T(`Cox-Regression mit zeitabhängiger Größe: LR-Test ${chi(m)}${k0 && !coxUnsicher(e, k0) ? `; ${hrTxt(k0.hr)}, ${ki(hr(k0.kiU), hr(k0.kiO))}, p ${pWert(k0.p)} (${kurz(name(info.wertName), 30)})` : ''}; ${personen(info.personen)} in ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}`,
    `Cox regression with a time-dependent covariate: LR test ${chi(m)}${k0 && !coxUnsicher(e, k0) ? `; ${hrTxt(k0.hr)}, ${ki(hr(k0.kiU), hr(k0.kiO))}, p ${pWert(k0.p)} (${kurz(name(info.wertName), 30)})` : ''}; ${personen(info.personen)} in ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}`);
  const marken = [
    { text: T(`Cox mit zeitabhängiger Größe: p ${pWert(m.p)}${unter05(sig(m.p))}`, `Cox with time-dependent covariate: p ${pWert(m.p)}${unter05(sig(m.p))}`), erklaer: 'hazard-ratio' },
    ...(k0 && !coxUnsicher(e, k0) ? [{ text: `${kurz(name(info.wertName), 28)}: ${hrTxt(k0.hr)}`, erklaer: 'hazard-ratio' }] : []),
    ...(phVerletzt(e).length || phGesamtVerletzt(e) ? [{ text: T('Proportionale Hazards verletzt', 'Proportional hazards violated'), erklaer: 'proportionale-hazards', hinweis: true }] : []),
    ...(e.epvHinweis ? [{ text: Lp(e.npar, `${ereignisseT(e.ereignisse)} bei ${e.npar} Koeffizient`, `${ereignisseT(e.ereignisse)} bei ${e.npar} Koeffizienten`, `${ereignisseT(e.ereignisse)} for ${e.npar} coefficient`, `${ereignisseT(e.ereignisse)} for ${e.npar} coefficients`), erklaer: 'hazard-ratio', hinweis: true }] : [])
  ];
  return { hinweise, zusatz, vorsicht, apa, marken };
}

export const tabellenCoxZeit = (e: CoxErgebnis, info: CoxZeitInfo, name: (n: string) => string): TableItem[] => tabellenCox(e, name, { personen: info.personen });
