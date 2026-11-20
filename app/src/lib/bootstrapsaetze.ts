/**
 * Sätze zum Bootstrap (Zahlen: lib/bootstrap.ts): der Satz „Gerechnet“ mit Methode, Zahl der Ziehungen und Startwert, und die Hinweise
 * (Rand, nicht berechenbar, viele gleiche Ziehungen, ungültige Ziehungen, kleine Stichprobe). Ganze Sätze je Fall, nie Wörter per Bedingung getauscht.
 * Der Satz nennt die Methode immer: keine Mischung ohne Namen (Fachblatt S-A 2.7).
 */
import { d, L } from './sitzung.svelte';
import { hesterberg, type BootArt, type BootWarnung } from './bootstrap';
import { iv } from '../i18n/profil';
import { komma } from './ergebnis';

const T = L;

export interface BootAngaben { art: BootArt; ziehungen: number; startwert: number; n: number; ungueltig?: number; warnungen?: BootWarnung[]; wunsch?: BootArt;
  /** Welle S-B: das t-Intervall derselben Zahl (Gruppenunterschied: Welch; Mittelwert: t); der Hesterberg-Satz nennt es bei n < 30. */ tIntervall?: { lo: number; hi: number } }

/** „Gerechnet: Bootstrap …“ - Methode, B und Startwert, so dass jemand die Rechnung wiederholen kann. */
export function bootstrapGerechnet(e: BootAngaben, was = ''): string {
  const ziel = was ? was + ' ' : '';
  if (e.art === 'bca') return T(
    `Gerechnet: ${ziel}Bootstrap mit BCa-Intervall (verzerrungskorrigiert und beschleunigt), B = ${e.ziehungen} Ziehungen mit Zurücklegen aus den ${e.n} vollständigen Fällen, Startwert ${e.startwert}. Gleiche Daten und gleicher Startwert ergeben dasselbe Intervall; ein anderer Startwert verschiebt die Grenzen ein wenig. Quantile und BCa wie im R-Paket boot.`,
    `Calculated: ${ziel}bootstrap with a BCa interval (bias-corrected and accelerated), B = ${e.ziehungen} draws with replacement from the ${e.n} complete cases, seed ${e.startwert}. The same data and the same seed give the same interval; another seed moves the limits a little. Quantiles and BCa as in the R package boot.`);
  return T(
    `Gerechnet: ${ziel}Bootstrap mit Perzentil-Intervall, B = ${e.ziehungen} Ziehungen mit Zurücklegen aus den ${e.n} vollständigen Fällen, Startwert ${e.startwert}. Gleiche Daten und gleicher Startwert ergeben dasselbe Intervall; ein anderer Startwert verschiebt die Grenzen ein wenig. Quantile wie im R-Paket boot.`,
    `Calculated: ${ziel}bootstrap with a percentile interval, B = ${e.ziehungen} draws with replacement from the ${e.n} complete cases, seed ${e.startwert}. The same data and the same seed give the same interval; another seed moves the limits a little. Quantiles as in the R package boot.`);
}

/** Ein Satz je Warnung (bei BCa; `art` ist die Art, die gewählt war). */
export function bootstrapWarnSatz(w: BootWarnung, art: BootArt): string {
  switch (w) {
    case 'rand': return art === 'bca'
      ? d('BCa ist hier nicht verlässlich: Eine Grenze liegt am Rand der Ziehungen. Nimm mehr Ziehungen oder das Perzentil-Intervall.', 'BCa ist hier nicht verlässlich: Eine Grenze liegt am Rand der Ziehungen. Nehmen Sie mehr Ziehungen oder das Perzentil-Intervall.', 'BCa is not reliable here: a limit lies at the edge of the draws. Use more draws or the percentile interval.')
      : d('Eine Grenze liegt am Rand der Ziehungen und ist nicht verlässlich. Nimm mehr Ziehungen.', 'Eine Grenze liegt am Rand der Ziehungen und ist nicht verlässlich. Nehmen Sie mehr Ziehungen.', 'A limit lies at the edge of the draws and is not reliable. Use more draws.');
    case 'z0unendlich': return T('BCa lässt sich nicht berechnen: Alle Ziehungen liegen auf derselben Seite des Schätzwerts. Es steht das Perzentil-Intervall da.', 'BCa cannot be calculated: all draws lie on the same side of the estimate. The percentile interval is shown instead.');
    case 'a-undefiniert': return T('BCa lässt sich nicht berechnen: Das Weglassen einzelner Fälle ändert den Schätzwert nicht, die Beschleunigung ist nicht definiert. Es steht das Perzentil-Intervall da.', 'BCa cannot be calculated: leaving out single cases does not change the estimate, so the acceleration is not defined. The percentile interval is shown instead.');
    case 'viele-gleiche': return d('Bei mehr als 5 % der Ziehungen kommt genau der Schätzwert heraus (typisch bei Median und Anteilen). BCa ist dann unsicher; das Perzentil-Intervall ist die bessere Wahl.', 'Bei mehr als 5 % der Ziehungen kommt genau der Schätzwert heraus (typisch bei Median und Anteilen). BCa ist dann unsicher; das Perzentil-Intervall ist die bessere Wahl.', 'In more than 5% of the draws the result equals the estimate exactly (typical for the median and proportions). BCa is uncertain then; the percentile interval is the better choice.');
  }
}

/** Die Sätze unter einem Bootstrap-Ergebnis: Warnungen, ungültige Ziehungen, kleine Stichprobe. Leer, wenn nichts zu sagen ist. */
export function bootstrapHinweise(e: BootAngaben): string[] {
  const aus: string[] = [];
  for (const w of e.warnungen ?? []) aus.push(bootstrapWarnSatz(w, e.wunsch ?? e.art));
  const u = e.ungueltig ?? 0;
  if (u > 0) {
    const mehr = u > e.ziehungen * 0.01;
    aus.push(mehr
      ? d(`${u} von ${e.ziehungen} Ziehungen waren nicht auswertbar (zum Beispiel ohne Streuung) und zählen nicht mit. Das sind mehr als 1 %: Prüfe die Daten.`, `${u} von ${e.ziehungen} Ziehungen waren nicht auswertbar (zum Beispiel ohne Streuung) und zählen nicht mit. Das sind mehr als 1 %: Prüfen Sie die Daten.`, `${u} of ${e.ziehungen} draws could not be evaluated (for example no variation) and are not counted. That is more than 1%: check the data.`)
      : T(`${u} von ${e.ziehungen} Ziehungen waren nicht auswertbar (zum Beispiel ohne Streuung) und zählen nicht mit.`, `${u} of ${e.ziehungen} draws could not be evaluated (for example no variation) and are not counted.`));
  }
  if (hesterberg(e.n)) {
    const tz = e.tIntervall && Number.isFinite(e.tIntervall.lo) && Number.isFinite(e.tIntervall.hi) ? iv(komma(e.tIntervall.lo), komma(e.tIntervall.hi)) : '';
    aus.push(tz
      ? d(`Bei nur ${e.n} Personen sind Bootstrap-Intervalle meist zu schmal (Hesterberg 2015). Das t-Intervall wäre hier ${tz}. Lies das Bootstrap-Intervall vorsichtig.`, `Bei nur ${e.n} Personen sind Bootstrap-Intervalle meist zu schmal (Hesterberg 2015). Das t-Intervall wäre hier ${tz}. Lesen Sie das Bootstrap-Intervall vorsichtig.`, `With only ${e.n} people, bootstrap intervals are usually too narrow (Hesterberg 2015). The t interval would be ${tz} here. Read the bootstrap interval with care.`)
      : d(`Bei nur ${e.n} Personen sind Bootstrap-Intervalle meist zu schmal (Hesterberg 2015). Lies das Intervall vorsichtig.`, `Bei nur ${e.n} Personen sind Bootstrap-Intervalle meist zu schmal (Hesterberg 2015). Lesen Sie das Intervall vorsichtig.`, `With only ${e.n} people, bootstrap intervals are usually too narrow (Hesterberg 2015). Read the interval with care.`));
  }
  return aus;
}

/** Kurzform für die Zeile „Gerechnet: …“ über dem Ergebnis: Verfahren, Art des Intervalls, B und Startwert. */
export function bootstrapKurz(e: { intervallArt?: BootArt; ziehungen: number; startwert: number }): string {
  return e.intervallArt === 'bca'
    ? T(`Mediationsanalyse, indirekter Effekt mit Bootstrap (BCa-Intervall, B = ${e.ziehungen}, Startwert ${e.startwert})`, `mediation analysis, indirect effect with bootstrap (BCa interval, B = ${e.ziehungen}, seed ${e.startwert})`)
    : T(`Mediationsanalyse, indirekter Effekt mit Bootstrap (Perzentil-Intervall, B = ${e.ziehungen}, Startwert ${e.startwert})`, `mediation analysis, indirect effect with bootstrap (percentile interval, B = ${e.ziehungen}, seed ${e.startwert})`);
}
