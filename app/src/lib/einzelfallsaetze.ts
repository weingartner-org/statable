/**
 * Sätze, APA-Zeile, Prüfhinweise und Tabellen zur Einzelfallanalyse (Zahlen: einzelfall.ts).
 * Die Tabellen sind echte Tabellen (TableItem) wie bei den anderen eigenen Verfahren; sie werden bei jedem Aufruf neu gebaut und folgen so der Sprache.
 * ⚠ Satzvorlagen, Einordnungsworte (NAP, Tau, PND) und die Schwelle für die Autokorrelation von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L, d } from './sitzung.svelte';
import { ki, proz } from '../i18n/profil';
import { komma, ohneNull, pWert, type Saetze } from './ergebnis';
import { tabelle, fx, fo, fp, fd, type Z } from './mwsaetze';
import { napStufe, pndStufe, tauStufe, type Einzelfall, type Fall } from './einzelfall';
import { kleinste, groesste } from './menge';

const T = L;
const prozent = (v: number) => proz(komma(v * 100, 0));
/** Werte von höchstens 1 ohne führende Null; NaN als Strich. */
const w2 = (v: number) => (Number.isFinite(v) ? ohneNull(v, 2) : '-');
const pT = (p: number) => (Number.isFinite(p) ? `p ${pWert(p)}` : 'p -');

export const PHASE_A = () => T('Ausgangslage', 'baseline');
export const PHASE_B = () => T('Förderung', 'intervention');
export const phaseA = () => `A (${PHASE_A()})`;
export const phaseB = () => `B (${PHASE_B()})`;
/** Schwelle für den Hinweis auf Autokorrelation (Lag 1). ⚠ von der Fachperson abzunehmen. */
export const AUTO_HINWEIS = 0.3;

const stufeNap = (v: number) => { const s = napStufe(v); return s === 'stark' ? L('stark', 'strong') : s === 'mittel' ? L('mittel', 'medium') : L('schwach', 'weak'); };
const napAdj = (v: number) => { const s = napStufe(v); return s === 'stark' ? L('starker', 'strong') : s === 'mittel' ? L('mittlerer', 'medium') : L('schwacher', 'weak'); };
const stufeTau = (v: number) => { const s = tauStufe(v); return s === 'klein' ? L('klein', 'small') : s === 'mittel' ? L('mittel', 'moderate') : s === 'groß' ? L('groß', 'large') : L('sehr groß', 'very large'); };
const stufePnd = (v: number) => { const s = pndStufe(v); return s === 'sehr wirksam' ? L('sehr wirksam', 'very effective') : s === 'wirksam' ? L('wirksam', 'effective') : s === 'fraglich' ? L('fraglich', 'questionable') : L('unwirksam', 'ineffective'); };

/** Der Tau-U-Wert, der berichtet wird: nach Abzug des Trends in A, wenn dieser Trend bedeutsam ist (wie beim baseline-korrigierten Tau), sonst A gegen B. */
export const tauHaupt = (f: Fall) => (f.bc.angewendet ? f.tauUTrend : f.tauU);

/** Hinweise zur Prüfliste und zur Vorsicht, je Fall. kurz: für die Vorsicht-Zeile. */
export interface Hinweis { art: 'hinweis' | 'info' | 'ok'; text: string; klein?: string; /** steht schon im Ergebnissatz, nicht noch einmal unter „Vorsicht“ */ nurListe?: boolean }
export function einzelfallHinweise(e: Einzelfall): Hinweis[] {
  const h: Hinweis[] = [];
  const vz = e.richtung === 'tief' ? -1 : 1;
  const wo = (f: Fall) => (f.name ? ` (${f.name})` : '');
  const klein = e.faelle.filter(f => Math.min(f.a.n, f.b.n) < 3);
  const mittel = e.faelle.filter(f => Math.min(f.a.n, f.b.n) >= 3 && Math.min(f.a.n, f.b.n) < 5);
  if (klein.length) h.push({ art: 'hinweis', text: T(`Zu wenige Messpunkte${klein.length === 1 ? wo(klein[0]!) : L(` bei ${klein.length} Fällen`, ` in ${klein.length} cases`)}: höchstens ${Math.min(kleinste(klein.map(f => Math.min(f.a.n, f.b.n))))} in einer Phase`, `Too few data points${klein.length === 1 ? wo(klein[0]!) : L(` bei ${klein.length} Fällen`, ` in ${klein.length} cases`)}: at most ${Math.min(kleinste(klein.map(f => Math.min(f.a.n, f.b.n))))} in one phase`),
    klein: T('Die What Works Clearinghouse-Standards verlangen mindestens 3 Messpunkte je Phase, besser 5. Mit weniger sind die Kennwerte kaum belastbar.', 'The What Works Clearinghouse standards require at least 3 data points per phase, preferably 5. With fewer, the indices are hardly reliable.') });
  else if (mittel.length) h.push({ art: 'info', text: T(`Wenige Messpunkte${mittel.length === 1 ? wo(mittel[0]!) : L(` bei ${mittel.length} Fällen`, ` in ${mittel.length} cases`)}`, `Few data points${mittel.length === 1 ? wo(mittel[0]!) : L(` bei ${mittel.length} Fällen`, ` in ${mittel.length} cases`)}`),
    klein: T('Mindestens 3 Messpunkte je Phase sind erfüllt (What Works Clearinghouse); 5 oder mehr sind besser.', 'The minimum of 3 data points per phase is met (What Works Clearinghouse); 5 or more is better.') });
  else h.push({ art: 'ok', text: T('Mindestens 5 Messpunkte je Phase', 'At least 5 data points per phase'), klein: T('Das erfüllt die Empfehlung der What Works Clearinghouse-Standards.', 'This meets the recommendation of the What Works Clearinghouse standards.') });
  for (const f of e.faelle.filter(x => x.bc.trendP <= 0.05)) {
    const gegen = (f.bc.steigung * vz) > 0;
    h.push({ art: 'hinweis', text: T(`Trend in Phase A${wo(f)}: τ = ${w2(f.bc.trendTau)}, ${pT(f.bc.trendP)}`, `Trend in phase A${wo(f)}: τ = ${w2(f.bc.trendTau)}, ${pT(f.bc.trendP)}`),
      klein: gegen ? T('Die Werte steigen schon in der Ausgangslage in die gewünschte Richtung. NAP und PND berücksichtigen das nicht; Tau-U (minus Trend A) und das baseline-korrigierte Tau schon.', 'The values already move in the desired direction during baseline. NAP and PND do not take this into account; Tau-U (minus trend A) and baseline-corrected Tau do.')
        : T('Die Werte laufen schon in der Ausgangslage in die ungünstige Richtung. NAP und PND berücksichtigen das nicht; Tau-U (minus Trend A) und das baseline-korrigierte Tau schon.', 'The values already move in the unfavorable direction during baseline. NAP and PND do not take this into account; Tau-U (minus trend A) and baseline-corrected Tau do.') });
  }
  if (e.gesamt && !e.gesamt.gleich) h.push({ art: 'hinweis', nurListe: true, text: T(`Die Fälle gehen in verschiedene Richtungen (${e.gesamt.nBesser} besser, ${e.gesamt.nSchlechter} schlechter)`, `The cases go in different directions (${e.gesamt.nBesser} better, ${e.gesamt.nSchlechter} worse)`),
    klein: d('Die Richtung „besser“ gilt für alle Fälle gemeinsam. Gilt für einzelne Fälle das umgekehrte Ziel (z. B. Fehler sollen sinken, richtige Wörter steigen), rechne sie getrennt, jeweils mit eigener Richtung. Ein Mittel über gegenläufige Fälle wird nicht gebildet.', 'Die Richtung „besser“ gilt für alle Fälle gemeinsam. Gilt für einzelne Fälle das umgekehrte Ziel (z. B. Fehler sollen sinken, richtige Wörter steigen), rechnen Sie sie getrennt, jeweils mit eigener Richtung. Ein Mittel über gegenläufige Fälle wird nicht gebildet.', 'The direction “better” applies to all cases together. If some cases have the opposite goal (e.g. errors should fall, correct words rise), calculate them separately, each with its own direction. A mean across opposing cases is not formed.') });
  const auto = e.faelle.filter(f => Number.isFinite(f.auto) && f.auto >= AUTO_HINWEIS);
  if (auto.length) h.push({ art: 'hinweis', text: T(`Aufeinanderfolgende Messungen hängen zusammen${auto.length === 1 ? wo(auto[0]!) : L(` (${auto.length} Fälle)`, ` (${auto.length} cases)`)}: Autokorrelation (Lag 1) = ${w2(Math.max(groesste(auto.map(f => f.auto))))}`, `Consecutive measurements are related${auto.length === 1 ? wo(auto[0]!) : L(` (${auto.length} Fälle)`, ` (${auto.length} cases)`)}: autocorrelation (lag 1) = ${w2(Math.max(groesste(auto.map(f => f.auto))))}`),
    klein: T('Die p-Werte setzen unabhängige Messungen voraus und sind dann zu optimistisch. Die Kennwerte selbst (NAP, Tau) bleiben beschreibend gültig.', 'The p values assume independent measurements and are then too optimistic. The indices themselves (NAP, Tau) remain valid as descriptions.') });
  return h;
}

export function saetzeEinzelfall(e: Einzelfall): Saetze {
  const mehr = e.faelle.length > 1, f1 = e.faelle[0]!, g = e.gesamt;
  const besser = e.richtung === 'tief' ? T('niedriger', 'lower') : T('höher', 'higher');
  const m = (v: number) => komma(v, 1);
  let haupt: string, zusatz: string;
  if (!mehr) {
    const f = f1, n = f.nap, tau = tauHaupt(f);
    const gleich = m(f.a.m) === m(f.b.m);
    // T23: Tau-BC nicht berechenbar (nach Abzug des Trends keine Streuung) - sagen statt „Tau = - (p -)“. T18: „signifikant“ statt „bedeutsam“.
    const bcText = !Number.isFinite(f.bc.tau)
      ? (f.bc.angewendet ? T('baseline-korrigiertes Tau lässt sich hier nicht berechnen (nach Abzug des Trends in A bleibt in den Werten keine Streuung)', 'baseline-corrected Tau cannot be calculated here (no variation is left in the values once the trend in A is removed)')
        : T('baseline-korrigiertes Tau lässt sich hier nicht berechnen', 'baseline-corrected Tau cannot be calculated here'))
      : T(`baseline-korrigiertes Tau = ${w2(f.bc.tau)} (${pT(f.bc.p)})${f.bc.angewendet ? L(', mit Abzug des Trends in A', ', with the trend in A removed') : L(', ohne Trendabzug, denn in A zeigt sich kein signifikanter Trend', ', without trend removal, as there is no significant trend in A')}`,
        `baseline-corrected Tau = ${w2(f.bc.tau)} (${pT(f.bc.p)})${f.bc.angewendet ? L(', mit Abzug des Trends in A', ', with the trend in A removed') : L(', ohne Trendabzug, denn in A zeigt sich kein signifikanter Trend', ', without trend removal, as there is no significant trend in A')}`);
    const tauUeber1 = Math.abs(tau.wert) > 1 ? T(' Tau-U kann nach Abzug des Trends in A über 1 liegen; es ist dann kein Anteil mehr, sondern ein Wert auf offener Skala.', ' Tau-U can exceed 1 after the trend in A is removed; it is then no longer a proportion but a value on an open scale.') : '';
    haupt = gleich
      ? T(`In Phase ${phaseB()} liegt der Mittelwert bei ${m(f.b.m)} (SD ${m(f.b.sd)}), in Phase ${phaseA()} bei ${m(f.a.m)} (SD ${m(f.a.sd)}): praktisch kein Unterschied.`, `In phase ${phaseB()} the mean is ${m(f.b.m)} (SD ${m(f.b.sd)}), in phase ${phaseA()} it is ${m(f.a.m)} (SD ${m(f.a.sd)}): practically no difference.`)
      : T(`In Phase ${phaseB()} liegt der Mittelwert bei ${m(f.b.m)} (SD ${m(f.b.sd)}), in Phase ${phaseA()} bei ${m(f.a.m)} (SD ${m(f.a.sd)}); Median ${m(f.b.median)} gegen ${m(f.a.median)}.`,
        `In phase ${phaseB()} the mean is ${m(f.b.m)} (SD ${m(f.b.sd)}), in phase ${phaseA()} it is ${m(f.a.m)} (SD ${m(f.a.sd)}); median ${m(f.b.median)} vs. ${m(f.a.median)}.`);
    zusatz = T(`NAP = ${w2(n.wert)} (${ki(w2(n.lo), w2(n.hi))}): In ${prozent(n.wert)} aller Paare aus je einer Messung in A und in B liegt der Wert in B ${besser} (Gleichstand zählt halb) - ein ${napAdj(n.wert)} Effekt nach Parker und Vannest (2009; schwach bis ,65, mittel bis ,92, stark ab ,93). Der Mann-Whitney-Test gibt ${pT(n.p)}. PND = ${prozent(f.pnd)}: ${f.b.n ? Math.round(f.pnd * f.b.n) : 0} von ${f.b.n} B-Werten liegen ${besser} als der beste A-Wert (${stufePnd(f.pnd)}). Tau-U${f.bc.angewendet ? L(' (A gegen B minus Trend in A)', ' (A vs. B minus trend in A)') : L(' (A gegen B)', ' (A vs. B)')} = ${w2(tau.wert)} (${stufeTau(tau.wert)}, ${pT(tau.p)}); ${bcText}.${tauUeber1}`,
      `NAP = ${w2(n.wert)} (${ki(w2(n.lo), w2(n.hi))}): In ${prozent(n.wert)} of all pairs of one measurement in A and one in B, the value in B is ${besser} (a tie counts half) - a ${stufeNap(n.wert)} effect according to Parker and Vannest (2009; weak up to .65, medium up to .92, strong from .93). The Mann-Whitney test gives ${pT(n.p)}. PND = ${prozent(f.pnd)}: ${f.b.n ? Math.round(f.pnd * f.b.n) : 0} of ${f.b.n} B values are ${besser} than the best A value (${stufePnd(f.pnd)}). Tau-U${f.bc.angewendet ? L(' (A gegen B minus Trend in A)', ' (A vs. B minus trend in A)') : L(' (A gegen B)', ' (A vs. B)')} = ${w2(tau.wert)} (${stufeTau(tau.wert)}, ${pT(tau.p)}); ${bcText}.${tauUeber1}`);
  } else if (!g!.gleich) {
    haupt = T(`Die ${g!.n} Fälle gehen in verschiedene Richtungen: Bei ${g!.nBesser} liegt der Wert in Phase ${phaseB()} ${besser} als in Phase ${phaseA()}, bei ${g!.nSchlechter} nicht. Ein Mittel über die Fälle wird deshalb nicht gebildet.`,
      `The ${g!.n} cases go in different directions: in ${g!.nBesser} the value in phase ${phaseB()} is ${besser} than in phase ${phaseA()}, in ${g!.nSchlechter} it is not. A mean across the cases is therefore not formed.`);
    zusatz = T(`NAP je Fall zwischen ${w2(g!.napMin)} und ${w2(g!.napMax)}, baseline-korrigiertes Tau zwischen ${w2(g!.bcMin)} und ${w2(g!.bcMax)}. Die Richtung ("${besser} = besser") gilt für alle Fälle gemeinsam; jeder Fall steht einzeln in den Tabellen.`,
      `NAP per case ranges from ${w2(g!.napMin)} to ${w2(g!.napMax)}, baseline-corrected Tau from ${w2(g!.bcMin)} to ${w2(g!.bcMax)}. The direction ("${besser} = better") applies to all cases together; every case is listed separately in the tables.`);
  } else {
    const d = g!.diff;
    haupt = T(`Bei ${g!.n} Fällen liegt der Wert in Phase ${phaseB()} im Mittel um ${m(Math.abs(d))} ${d >= 0 ? L('höher', 'higher') : L('niedriger', 'lower')} als in Phase ${phaseA()} (Mittel der Fall-Differenzen).`,
      `In ${g!.n} cases the value in phase ${phaseB()} is on average ${m(Math.abs(d))} ${d >= 0 ? L('höher', 'higher') : L('niedriger', 'lower')} than in phase ${phaseA()} (mean of the case differences).`);
    zusatz = T(`NAP je Fall zwischen ${w2(g!.napMin)} und ${w2(g!.napMax)}, im Mittel ${w2(g!.nap)} (${napAdj(g!.nap)} Effekt nach Parker und Vannest 2009). Mittleres baseline-korrigiertes Tau = ${w2(g!.bc)} (Spanne ${w2(g!.bcMin)} bis ${w2(g!.bcMax)}), mittleres Tau-U = ${w2(g!.tauU)}, mittleres PND = ${prozent(g!.pnd)}. Die Mittel sind einfache Mittelwerte der Fall-Kennwerte, ohne Gewichtung; jeder Fall steht einzeln in den Tabellen.`,
      `NAP per case ranges from ${w2(g!.napMin)} to ${w2(g!.napMax)}, mean ${w2(g!.nap)} (a ${stufeNap(g!.nap)} effect according to Parker and Vannest 2009). Mean baseline-corrected Tau = ${w2(g!.bc)} (range ${w2(g!.bcMin)} to ${w2(g!.bcMax)}), mean Tau-U = ${w2(g!.tauU)}, mean PND = ${prozent(g!.pnd)}. The means are simple averages of the case indices, unweighted; every case is listed separately in the tables.`);
  }
  const hinweise = einzelfallHinweise(e).filter(x => x.art === 'hinweis' && !x.nurListe).map(x => x.text);
  // T16: Bei gegenläufigen Fällen wird kein Mittel gebildet - dann auch kein Richtungs-Hinweis aus dem Mittel.
  const richtungsHinweis = (!mehr || g!.gleich) && (mehr ? g!.diff : f1.b.m - f1.a.m) * (e.richtung === 'tief' ? -1 : 1) < 0
    ? [T(`Die Werte in B liegen im Mittel ${e.richtung === 'tief' ? L('höher', 'higher') : L('niedriger', 'lower')} als in A, obwohl „${e.richtung === 'tief' ? L('niedriger', 'lower') : L('höher', 'higher')} = besser“ gilt. Ist es umgekehrt gemeint, die Richtung oben umschalten.`, `The values in B are on average ${e.richtung === 'tief' ? L('höher', 'higher') : L('niedriger', 'lower')} than in A although "${e.richtung === 'tief' ? L('niedriger', 'lower') : L('höher', 'higher')} = better" applies. If the opposite is meant, switch the direction above.`)] : [];
  const punkt = (x: string) => (/[.!?]$/.test(x) ? x : x + '.');
  const vorsicht = [...richtungsHinweis, ...hinweise.map(punkt),
    T('Ein A-B-Design allein belegt nicht, dass die Förderung die Ursache ist: Reifung, Zufall oder andere Ereignisse können dahinterstecken. Belastbarer sind Wiederholungen (A-B-A-B oder mehrere Personen mit versetztem Beginn).', 'An A-B design alone does not show that the intervention is the cause: maturation, chance or other events may be behind it. Replications (A-B-A-B or several people with staggered starts) are more reliable.')].join(' ');

  const apaFall = (f: Fall) => {
    const t = tauHaupt(f);
    return T(`NAP = ${w2(f.nap.wert)}, ${ki(w2(f.nap.lo), w2(f.nap.hi))}, ${pT(f.nap.p)}; Tau-U = ${w2(t.wert)}, ${pT(t.p)}; Tau-BC = ${w2(f.bc.tau)}, ${pT(f.bc.p)}; PND = ${prozent(f.pnd)}`,
      `NAP = ${w2(f.nap.wert)}, ${ki(w2(f.nap.lo), w2(f.nap.hi))}, ${pT(f.nap.p)}; Tau-U = ${w2(t.wert)}, ${pT(t.p)}; Tau-BC = ${w2(f.bc.tau)}, ${pT(f.bc.p)}; PND = ${prozent(f.pnd)}`);
  };
  const apa = mehr && !g!.gleich
    ? T(`NAP je Fall ${w2(g!.napMin)}-${w2(g!.napMax)}, Tau-BC je Fall ${w2(g!.bcMin)}-${w2(g!.bcMax)}; ${g!.n} Fälle, Richtung uneinheitlich`, `NAP per case ${w2(g!.napMin)}-${w2(g!.napMax)}, Tau-BC per case ${w2(g!.bcMin)}-${w2(g!.bcMax)}; ${g!.n} cases, direction not uniform`)
    : mehr
    ? T(`M(NAP) = ${w2(g!.nap)} (Spanne ${w2(g!.napMin)}-${w2(g!.napMax)}), M(Tau-BC) = ${w2(g!.bc)} (Spanne ${w2(g!.bcMin)}-${w2(g!.bcMax)}), M(PND) = ${prozent(g!.pnd)}; ${g!.n} Fälle`,
      `M(NAP) = ${w2(g!.nap)} (range ${w2(g!.napMin)}-${w2(g!.napMax)}), M(Tau-BC) = ${w2(g!.bc)} (range ${w2(g!.bcMin)}-${w2(g!.bcMax)}), M(PND) = ${prozent(g!.pnd)}; ${g!.n} cases`)
    : apaFall(f1);

  const nHauptwert = mehr ? g!.nap : f1.nap.wert;
  const nA = Math.min(kleinste(e.faelle.map(f => f.a.n))), nB = Math.min(kleinste(e.faelle.map(f => f.b.n)));
  const mitMittel = !mehr || g!.gleich;
  return {
    haupt, zusatz, vorsicht, apa,
    marken: [
      mitMittel
        ? { text: `${mehr ? T('Mittleres NAP', 'Mean NAP') : 'NAP'} = ${w2(nHauptwert)}${mehr ? ` (${w2(g!.napMin)} ${T('bis', 'to')} ${w2(g!.napMax)})` : ''} · ${stufeNap(nHauptwert)}`, erklaer: 'nap' }
        : { text: T(`NAP je Fall: ${w2(g!.napMin)} bis ${w2(g!.napMax)}`, `NAP per case: ${w2(g!.napMin)} to ${w2(g!.napMax)}`), erklaer: 'nap', hinweis: true },
      ...(!mehr ? [{ text: T(`NAP-Bereich: ${w2(f1.nap.lo)} bis ${w2(f1.nap.hi)}`, `NAP range: ${w2(f1.nap.lo)} to ${w2(f1.nap.hi)}`), erklaer: 'konfidenzintervall' }, { text: `p ${pWert(f1.nap.p)}`, erklaer: 'p-wert' }] : []),
      ...(mitMittel ? [
        { text: `PND = ${prozent(mehr ? g!.pnd : f1.pnd)}`, erklaer: 'pnd' },
        { text: `Tau-U = ${w2(mehr ? g!.tauU : tauHaupt(f1).wert)}`, erklaer: 'tau-u' },
        { text: `Tau-BC = ${w2(mehr ? g!.bc : f1.bc.tau)}`, erklaer: 'tau-u' }] : []),
      { text: T(`${mehr ? L(`${g!.n} Fälle, mindestens `, `${g!.n} cases, at least `) : ''}n = ${nA} (A) / ${nB} (B)`, `${mehr ? L(`${g!.n} Fälle, mindestens `, `${g!.n} cases, at least `) : ''}n = ${nA} (A) / ${nB} (B)`), erklaer: 'einzelfall', hinweis: Math.min(nA, nB) < 3 }
    ]
  };
}

/* ------------------------------------------------------------ Tabellen */

export function tabellenEinzelfall(e: Einzelfall, name: (n: string) => string = x => x): TableItem[] {
  const mehr = e.faelle.length > 1, g = e.gesamt;
  const fall = (f: Fall, i: number) => f.name || T(`Fall ${i + 1}`, `Case ${i + 1}`);
  const kopfFall = mehr ? [T('Fall', 'Case')] : [];
  const vorn = (f: Fall, i: number): Z[] => (mehr ? [fall(f, i)] : []);
  const phasen = tabelle('Phase Statistics', T('Kennwerte je Phase', 'Statistics by phase'),
    [...kopfFall, T('Phase', 'Phase'), 'n', 'M', 'SD', 'Md', 'Min', 'Max'],
    e.faelle.flatMap((f, i) => [[...vorn(f, i), phaseA(), fd(f.a.n), fx(f.a.m), fx(f.a.sd), fx(f.a.median), fx(f.a.min), fx(f.a.max)] as Z[], [...vorn(f, i), phaseB(), fd(f.b.n), fx(f.b.m), fx(f.b.sd), fx(f.b.median), fx(f.b.min), fx(f.b.max)] as Z[]]),
    [T(`${name(e.mess)}, Phasen aus ${name(e.phase)}: A = „${e.phasenA}“, B = „${e.phasenB}“. Reihenfolge: ${e.zeit ? name(e.zeit) : L('Zeilenfolge der Daten', 'row order of the data')}. Richtung: ${e.richtung === 'tief' ? L('niedriger = besser', 'lower = better') : L('höher = besser', 'higher = better')}.`,
      `${name(e.mess)}, phases from ${name(e.phase)}: A = "${e.phasenA}", B = "${e.phasenB}". Order: ${e.zeit ? name(e.zeit) : L('Zeilenfolge der Daten', 'row order of the data')}. Direction: ${e.richtung === 'tief' ? L('niedriger = besser', 'lower = better') : L('höher = besser', 'higher = better')}.`)]);
  const napZeilen: Z[][] = e.faelle.map((f, i) => [...vorn(f, i), fo(f.nap.wert), fo(f.nap.lo), fo(f.nap.hi), fp(f.nap.p), fx(f.pnd * 100, 0)]);
  if (g?.gleich) napZeilen.push([T('Mittel', 'Mean'), fo(g.nap), '', '', '', fx(g.pnd * 100, 0)]);
  const napT = tabelle('NAP and PND', T('NAP und PND', 'NAP and PND'),
    [...kopfFall, 'NAP', T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper'), 'p', 'PND (%)'],
    napZeilen,
    [T('NAP nach Parker und Vannest (2009): Anteil der Paare, in denen B besser ist, Gleichstand zählt halb. KI nach Newcombe, p aus dem Mann-Whitney-Test (zweiseitig, Normalnäherung mit Stetigkeitskorrektur). PND: Anteil der B-Werte jenseits des besten A-Werts.', 'NAP after Parker and Vannest (2009): proportion of pairs in which B is better, a tie counts half. CI after Newcombe, p from the Mann-Whitney test (two-sided, normal approximation with continuity correction). PND: proportion of B values beyond the best A value.')]);
  const tauZeilen: Z[][] = e.faelle.map((f, i) => [...vorn(f, i), fo(f.tauU.wert), fp(f.tauU.p), fo(f.tauUTrend.wert), fp(f.tauUTrend.p), fo(f.bc.tau), fp(f.bc.p)]);
  if (g?.gleich) tauZeilen.push([T('Mittel', 'Mean'), fo(g.tauU), '', fo(g.tauUTrend), '', fo(g.bc), '']);
  const tauT = tabelle('Tau', T('Tau-U und baseline-korrigiertes Tau', 'Tau-U and baseline-corrected Tau'),
    [...kopfFall, 'Tau-U (A-B)', 'p', T('Tau-U (− Trend A)', 'Tau-U (− trend A)'), 'p', 'Tau-BC', 'p'],
    tauZeilen,
    [T('Tau-U nach Parker et al. (2011); Tau-U (− Trend A) kann über 1 liegen, weil der Abzug des Trends in A nicht auf den Bereich −1 bis 1 begrenzt wird (so rechnet auch R scan). p über Kendall-S mit Bindungskorrektur (wie R scan, method = „parker“). Tau-BC ist das baseline-korrigierte Tau nach Tarlow (2017), berichtet mit der Korrektur, wenn der Trend in A signifikant ist, sonst ohne (siehe nächste Tabelle).', 'Tau-U after Parker et al. (2011); Tau-U (− trend A) can exceed 1 because removing the trend in A is not limited to the range −1 to 1 (R scan does the same). p from Kendall S with tie correction (as in R scan, method = "parker"). Tau-BC is baseline-corrected Tau after Tarlow (2017), reported with the correction if the trend in A is significant, otherwise without (see next table).')]);
  const trendT = tabelle('Baseline Trend', T('Trend in Phase A und Korrektur', 'Trend in phase A and correction'),
    [...kopfFall, T('Trend A (τ)', 'Trend A (τ)'), 'p', T('τ ohne Korrektur', 'τ uncorrected'), T('τ korrigiert', 'τ corrected'), T('Korrektur angewendet', 'Correction applied')],
    e.faelle.map((f, i) => [...vorn(f, i), fo(f.bc.trendTau), fp(f.bc.trendP), fo(f.bc.unkorrigiert.tau), fo(f.bc.korrigiert.tau), f.bc.angewendet ? T('ja', 'yes') : T('nein', 'no')]),
    [T('Der Trend in A wird mit Kendall-τ gegen die Zeit geprüft (α = ,05). Ist er signifikant, zieht Statable die Theil-Sen-Gerade von A von allen Werten ab, bevor τ zwischen den Resten und der Phase berechnet wird.', 'The trend in A is tested with Kendall τ against time (α = .05). If it is significant, Statable subtracts the Theil-Sen line of A from all values before τ is computed between the residuals and the phase.')]);
  return [phasen, napT, tauT, trendT];
}
