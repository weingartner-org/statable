/**
 * Sätze, APA-Zeile, Hinweise und Tabellen zur Cox-Regression (Welle 7, M1); Zahlen: cox.ts (R, survival::coxph).
 * Sie hängen am Ergebnis der Kaplan-Meier-Karte (`Kaplan.cox`) und werden in ueberlebensaetze.ts an die Sätze der Karte angefügt.
 *
 * Reihenfolge (Fachblatt, Nachtrag): Hinweise, die das Ergebnis einschränken, stehen ZUERST - verletzte Annahme proportionaler Hazards (je Prädiktor, mit p), Trennung.
 * Wald-Intervalle der HR, „signifikant“ (nie „deutlich“), nicht kausal. Die HR ist kein Risikoverhältnis: nie „x-mal so wahrscheinlich“, sondern „zu jedem Zeitpunkt mit x-fachem Hazard“.
 * Jede Richtung ist ein eigener, fester Satz (übersetzbar, keine eingesetzten Wörter). Bindungen nach Efron werden genannt (SPSS COXREG: Breslow).
 * ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { ki, zitat as anfuehrung } from '../i18n/profil';
import { komma, ohneNull, pWert, kurz, unter05 } from './ergebnis';
import { tabelle, fx, fp, fd, type Z } from './mwsaetze';
import { phVerletzt, phGesamtVerletzt, type CoxErgebnis, type CoxKoef, type CoxLr } from './cox';

const T = L;
const personenT = (n: number) => Lp(n, `${n} Person`, `${n} Personen`, `${n} person`, `${n} people`);
const ereignisseT = (n: number) => Lp(n, `${n} Ereignis`, `${n} Ereignisse`, `${n} event`, `${n} events`);
const zeilenT = (n: number) => Lp(n, `${n} Zeile`, `${n} Zeilen`, `${n} row`, `${n} rows`);
const q = (t: string) => anfuehrung(kurz(t));
type Name = (n: string) => string;

/** Hazard Ratio als Zahl: über 999 und unter 0,001 als Schranke - in Satz, APA-Zeile und Tabelle gleich. */
export const hr = (v: number) => (!Number.isFinite(v) ? '-' : v > 999 ? `> ${komma(999, 0)}` : v < 0.001 ? `< ${komma(0.001, 3)}` : komma(v, v < 0.1 ? 3 : 2));
const hrTab = (v: number): Z => (!Number.isFinite(v) ? '-' : v > 999 ? { t: '> 999', n: v } : v < 0.001 ? { t: '< 0.001', n: v } : fx(v, v < 0.1 ? 3 : 2));
const bTab = (v: number): Z => (!Number.isFinite(v) ? '-' : Math.abs(v) >= 1e6 ? { t: v > 0 ? '> 999999' : '< -999999', n: v } : fx(v, 3));
const zTab = (v: number): Z => (!Number.isFinite(v) ? '-' : v > 999 ? { t: '> 999', n: v } : v < -999 ? { t: '< −999', n: v } : fx(v));
/** „HR = 1,05“ - bei einer Schranke „HR > 999“ (nicht „HR = > 999“). */
export const hrTxt = (v: number) => { const t = hr(v); return /^[<>]/.test(t) ? `HR ${t}` : `HR = ${t}`; };
const extrem = (v: number) => /^[<>]/.test(hr(v));
export const sig = (p: number) => Number.isFinite(p) && p < 0.05;
export const chi = (t: { chi2: number; df: number; p: number }) => `χ²(${komma(t.df, 0)}) = ${komma(t.chi2)}, p ${pWert(t.p)}`;
const wert = (k: CoxKoef) => `${hrTxt(k.hr)}, ${ki(hr(k.kiU), hr(k.kiO))}, p ${pWert(k.p)}`;
const pn = (e: CoxErgebnis, i: number, name: Name) => q(name(e.praed[i]?.name ?? ''));
const ohneWirkung = (k: CoxKoef) => hr(k.hr) === hr(1);
/** Bei Trennung (R meldet „coefficient may be infinite“) sind Koeffizienten mit riesigem B oder SE kein Ergebnis: Statable zeigt sie als „nicht schätzbar“, nie als B = −20, HR < 0,001. */
export const coxUnsicher = (e: CoxErgebnis, k: CoxKoef): boolean => e.trennung && (!Number.isFinite(k.se) || !Number.isFinite(k.b) || Math.abs(k.b) > 10 || k.se > 20);

/** Hinweis: Annahme proportionaler Hazards (Grambsch & Therneau 1994) - je verletztem Prädiktor ein Satz mit seinem p; sonst, wenn nur das Gesamtmaß anschlägt, ein Satz dazu; nicht berechenbar: ein Satz. */
export function coxPhHinweise(e: CoxErgebnis, name: Name): string[] {
  if (!e.ph) return [T('Die Annahme proportionaler Hazards ließ sich nicht prüfen.', 'The assumption of proportional hazards could not be checked.')];
  const aus = phVerletzt(e).map(i => {
    const p = e.ph!.praed.find(x => x.pIdx === i)!;
    return T(`Die Annahme proportionaler Hazards ist für ${pn(e, i, name)} verletzt (p ${pWert(p.p)}): Die Hazard Ratio ändert sich über die Zeit; ein einzelnes Hazard Ratio fasst das nur ungenau zusammen.`,
      `The assumption of proportional hazards is violated for ${pn(e, i, name)} (p ${pWert(p.p)}): the hazard ratio changes over time; a single hazard ratio summarizes that only roughly.`);
  });
  if (!aus.length && phGesamtVerletzt(e)) aus.push(T(`Die Annahme proportionaler Hazards ist für das Modell insgesamt verletzt (p ${pWert(e.ph.gesamt.p)}): Die Hazard Ratios ändern sich über die Zeit; ein einzelnes Hazard Ratio je Angabe fasst das nur ungenau zusammen.`,
    `The assumption of proportional hazards is violated for the model as a whole (p ${pWert(e.ph.gesamt.p)}): the hazard ratios change over time; a single hazard ratio per predictor summarizes that only roughly.`));
  return aus;
}

/** Hinweis „Trennung“: R meldet, dass ein Koeffizient gegen unendlich geht (zum Beispiel eine Gruppe ohne Ereignis). */
export const trennungHinweis = (e: CoxErgebnis): string => (e.trennung ? T('Die Schätzung ist nicht verlässlich: Ein Koeffizient geht gegen unendlich (zum Beispiel hat eine Gruppe kein Ereignis).', 'The estimate is not reliable: a coefficient goes to infinity (for example, a group has no events).') : '');

/** Hinweis „zu wenige Ereignisse“ nach Peduzzi et al. (1995). */
export const epvHinweis = (e: CoxErgebnis): string => (e.epvHinweis
  ? Lp(e.npar, `Wenige Ereignisse: ${ereignisseT(e.ereignisse)} bei ${e.npar} Koeffizient (Faustregel: mindestens 10 je Koeffizient, Peduzzi u. a. 1995) - die Schätzungen sind unsicher.`, `Wenige Ereignisse: ${ereignisseT(e.ereignisse)} bei ${e.npar} Koeffizienten (Faustregel: mindestens 10 je Koeffizient, Peduzzi u. a. 1995) - die Schätzungen sind unsicher.`,
    `Few events: ${ereignisseT(e.ereignisse)} for ${e.npar} coefficient (rule of thumb: at least 10 per coefficient, Peduzzi et al. 1995) - the estimates are uncertain.`, `Few events: ${ereignisseT(e.ereignisse)} for ${e.npar} coefficients (rule of thumb: at least 10 per coefficient, Peduzzi et al. 1995) - the estimates are uncertain.`) : '');

/**
 * Der Satz zu EINEM Koeffizienten: er nennt den Koeffizienten mit seinem Namen und seiner Stufe, nie eine Aussage über die ganze Spalte (die macht nur der Likelihood-Quotienten-Test je Prädiktor).
 * „Hazard“ heißt hier: das momentane Risiko, dass das Ereignis eintritt, bei wem es bis dahin noch nicht eingetreten ist. Nie „x-mal so wahrscheinlich“.
 */
export function koefSatz(e: CoxErgebnis, k: CoxKoef, name: Name, ereignis: string): string {
  const p = e.praed[k.pIdx]!, n = pn(e, k.pIdx, name), s = sig(k.p), gruppe = p.art === 'faktor', hoch = k.hr >= 1, fe = hr(k.hr);
  const stufe = anfuehrung(k.stufe), ref = anfuehrung(p.stufen[0] ?? ''), wer = gruppe ? `${stufe} (${n})` : n, aussage = wert(k), ev = anfuehrung(ereignis);
  if (coxUnsicher(e, k)) return T(`Für ${wer} lässt sich keine Hazard Ratio schätzen (zum Beispiel, weil in dieser Gruppe niemand das Ereignis ${ev} hat).`, `For ${wer} no hazard ratio can be estimated (for example because nobody in this group has the event ${ev}).`);
  if (s && extrem(k.hr)) return T(`Bei ${wer} ändert sich der Hazard für ${ev} sehr stark (${aussage}); die Schätzung ist nicht verlässlich.`, `For ${wer} the hazard of ${ev} changes very strongly (${aussage}); the estimate is not reliable.`);
  if (gruppe) {
    if (!s) return T(`Zwischen ${stufe} und ${ref} (${n}) zeigt sich kein signifikanter Unterschied im Hazard für ${ev} (${aussage}).`, `Between ${stufe} and ${ref} (${n}) there is no significant difference in the hazard of ${ev} (${aussage}).`);
    if (hoch) return T(`Bei ${stufe} (${n}) tritt ${ev} zu jedem Zeitpunkt mit ${fe}-fachem Hazard auf wie bei ${ref} (${aussage}).`, `For ${stufe} (${n}), ${ev} occurs at any time with ${fe} times the hazard of ${ref} (${aussage}).`);
    return T(`Bei ${stufe} (${n}) tritt ${ev} zu jedem Zeitpunkt nur mit ${fe}-fachem Hazard auf wie bei ${ref} (${aussage}).`, `For ${stufe} (${n}), ${ev} occurs at any time with only ${fe} times the hazard of ${ref} (${aussage}).`);
  }
  if (!s) return T(`Bei ${n} zeigt sich kein signifikanter Zusammenhang mit dem Hazard für ${ev} (${aussage}).`, `For ${n} there is no significant relationship with the hazard of ${ev} (${aussage}).`);
  if (ohneWirkung(k)) return T(`Mit jeder Einheit mehr bei ${n} ändert sich der Hazard für ${ev} praktisch nicht (${aussage}).`, `With each additional unit of ${n}, the hazard of ${ev} hardly changes (${aussage}).`);
  if (hoch) return T(`Mit jeder Einheit mehr bei ${n} steigt der Hazard für ${ev} zu jedem Zeitpunkt auf das ${fe}-Fache (${aussage}).`, `With each additional unit of ${n}, the hazard of ${ev} at any time rises to ${fe} times (${aussage}).`);
  return T(`Mit jeder Einheit mehr bei ${n} sinkt der Hazard für ${ev} zu jedem Zeitpunkt auf das ${fe}-Fache (${aussage}).`, `With each additional unit of ${n}, the hazard of ${ev} at any time falls to ${fe} times (${aussage}).`);
}

/** Satz zum Beitrag eines Prädiktors als Ganzes (Likelihood-Quotienten-Test) - die einzige Aussage über eine ganze Spalte. */
export function lrSatz(e: CoxErgebnis, l: CoxLr, name: Name): string {
  const n = pn(e, l.pIdx, name), c = chi(l);
  return sig(l.p) ? T(`${n} trägt insgesamt signifikant zur Erklärung der Zeit bis zum Ereignis bei, ${c}.`, `${n} contributes significantly to explaining the time to the event overall, ${c}.`)
    : T(`${n} trägt insgesamt nicht signifikant zur Erklärung der Zeit bis zum Ereignis bei, ${c}.`, `${n} does not contribute significantly to explaining the time to the event overall, ${c}.`);
}

export interface CoxSaetze { hinweise: string[]; zusatz: string; vorsicht: string; apa: string; marken: { text: string; erklaer: string; hinweis?: boolean }[] }

/** Die Sätze der Cox-Regression: Hinweise zuerst, dann Modell, Koeffizienten, Konkordanz. `ereignis` = Anzeigetext des Ereignisses (zum Beispiel „abgebrochen“). */
export function saetzeCox(e: CoxErgebnis, name: Name, ereignis: string): CoxSaetze {
  const hinweise = [...coxPhHinweise(e, name), trennungHinweis(e), epvHinweis(e)].filter(Boolean);
  const m = e.modelltest, mehrere = e.praed.length > 1 || e.praed.some(p => p.stufen.length > 2);
  const modell = sig(m.p)
    ? T(`Cox-Regression (${personenT(e.n)}, ${ereignisseT(e.ereignisse)}, Bindungen nach Efron): Das Modell erklärt die Zeit bis zum Ereignis signifikant besser als ein Modell ohne Angaben (Likelihood-Quotienten-Test ${chi(m)}).`,
      `Cox regression (${personenT(e.n)}, ${ereignisseT(e.ereignisse)}, ties by Efron): the model explains the time to the event significantly better than a model without predictors (likelihood ratio test ${chi(m)}).`)
    : phVerletzt(e).length || phGesamtVerletzt(e)
      ? T(`Cox-Regression (${personenT(e.n)}, ${ereignisseT(e.ereignisse)}, Bindungen nach Efron): Das Modell erklärt die Zeit bis zum Ereignis nicht signifikant besser als ein Modell ohne Angaben (Likelihood-Quotienten-Test ${chi(m)}). Das HR ist nicht signifikant, aber die Annahme proportionaler Hazards ist verletzt: Gegenläufige Effekte zu verschiedenen Zeiten (sich kreuzende Kurven) können sich im HR aufheben. Die Kaplan-Meier-Kurven zeigen den Verlauf.`,
        `Cox regression (${personenT(e.n)}, ${ereignisseT(e.ereignisse)}, ties by Efron): the model does not explain the time to the event significantly better than a model without predictors (likelihood ratio test ${chi(m)}). The HR is not significant, but the assumption of proportional hazards is violated: opposite effects at different times (crossing curves) can cancel out in the HR. The Kaplan-Meier curves show the course.`)
      : T(`Cox-Regression (${personenT(e.n)}, ${ereignisseT(e.ereignisse)}, Bindungen nach Efron): Das Modell erklärt die Zeit bis zum Ereignis nicht signifikant besser als ein Modell ohne Angaben (Likelihood-Quotienten-Test ${chi(m)}). Die Daten belegen den Zusammenhang darum nicht.`,
        `Cox regression (${personenT(e.n)}, ${ereignisseT(e.ereignisse)}, ties by Efron): the model does not explain the time to the event significantly better than a model without predictors (likelihood ratio test ${chi(m)}). So the data do not show the relationship.`);
  const beitraege = mehrere ? e.lr.map(l => lrSatz(e, l, name)).join(' ') : '';
  const sigK = e.koef.filter(k => coxUnsicher(e, k) || sig(k.p));
  const einzeln = sigK.map(k => koefSatz(e, k, name, ereignis)).join(' ');
  const rest = sigK.length < e.koef.length && sigK.length > 0 ? T('Die übrigen Koeffizienten stehen in der Tabelle.', 'The remaining coefficients are in the table.') : '';
  const c = e.konkordanz.c;
  const konk = Number.isFinite(c) ? T(`Die Konkordanz (Harrells C) beträgt ${ohneNull(c)}: Das Modell ordnet vergleichbare Paare in dieser Höhe richtig ein (,50 wäre Zufall); sie beschreibt nur, nicht mehr.`,
    `The concordance (Harrell's C) is ${ohneNull(c)}: the model orders comparable pairs correctly to this degree (.50 would be chance); it only describes.`) : '';
  const zusatz = [modell, beitraege, einzeln, rest, konk, T(`Gerechnet wurde mit ${e.n} Fällen.`, `Calculated with ${e.n} cases.`),
    e.ausgelassen > 0 ? Lp(e.ausgelassen, 'Eine Zeile mit einer Lücke wurde ausgelassen.', `${e.ausgelassen} Zeilen mit Lücken wurden ausgelassen.`, 'One row with a gap was left out.', `${e.ausgelassen} rows with gaps were left out.`) : ''].filter(Boolean).join(' ');
  const vorsicht = [T('Eine Hazard Ratio ist kein Risikoverhältnis: HR = 1,8 heißt nicht, dass das Ereignis 1,8-mal so wahrscheinlich ist, sondern dass es zu jedem Zeitpunkt mit 1,8-fachem Hazard (Momentanrisiko) auftritt.', 'A hazard ratio is not a risk ratio: HR = 1.8 does not mean that the event is 1.8 times as likely, but that it occurs at any time with 1.8 times the hazard (instantaneous risk).'),
    T('Ein Zusammenhang ist keine Ursache; ohne Zufallszuteilung können weitere Merkmale mitwirken.', 'A relationship is not a cause; without random assignment other characteristics may contribute.'),
    T('SPSS (COXREG) behandelt gleiche Zeiten nach Breslow; bei vielen gleichen Zeiten weichen die Zahlen leicht ab.', 'SPSS (COXREG) handles tied times by Breslow; with many tied times the numbers differ slightly.')].join(' ');
  const hrApa = e.koef.map(k => { const p = e.praed[k.pIdx]!, nm = p.art === 'faktor' ? `${name(p.name)}: ${k.stufe}` : name(p.name); return coxUnsicher(e, k) ? `HR ${T('nicht schätzbar', 'not estimable')} (${kurz(nm, 30)})` : `${hrTxt(k.hr)}, ${ki(hr(k.kiU), hr(k.kiO))}, p ${pWert(k.p)} (${kurz(nm, 30)})`; });
  const apa = T(`Cox-Regression: LR-Test ${chi(m)}; ${hrApa.join('; ')}; ${personenT(e.n)}, ${ereignisseT(e.ereignisse)}${Number.isFinite(c) ? `; C = ${ohneNull(c)}` : ''}`,
    `Cox regression: LR test ${chi(m)}; ${hrApa.join('; ')}; ${personenT(e.n)}, ${ereignisseT(e.ereignisse)}${Number.isFinite(c) ? `; C = ${ohneNull(c)}` : ''}`);
  const marken = [
    { text: T(`Cox-Regression: p ${pWert(m.p)}${unter05(sig(m.p))}`, `Cox regression: p ${pWert(m.p)}${unter05(sig(m.p))}`), erklaer: 'hazard-ratio' },
    ...e.koef.filter(k => !coxUnsicher(e, k)).slice(0, 3).map(k => ({ text: `${e.praed[k.pIdx]?.art === 'faktor' ? kurz(`${name(e.praed[k.pIdx]!.name)}: ${k.stufe}`, 28) : kurz(name(e.praed[k.pIdx]?.name ?? ''), 28)}: ${hrTxt(k.hr)}`, erklaer: 'hazard-ratio' })),
    ...(phVerletzt(e).length || phGesamtVerletzt(e) ? [{ text: T('Proportionale Hazards verletzt', 'Proportional hazards violated'), erklaer: 'proportionale-hazards', hinweis: true }] : []),
    ...(e.epvHinweis ? [{ text: Lp(e.npar, `${ereignisseT(e.ereignisse)} bei ${e.npar} Koeffizient`, `${ereignisseT(e.ereignisse)} bei ${e.npar} Koeffizienten`, `${ereignisseT(e.ereignisse)} for ${e.npar} coefficient`, `${ereignisseT(e.ereignisse)} for ${e.npar} coefficients`), erklaer: 'hazard-ratio', hinweis: true }] : [])
  ];
  return { hinweise, zusatz, vorsicht, apa, marken };
}

/** Tabellen: Koeffizienten (B, SE, HR, Wald-KI, p), Tests (Modell, je Prädiktor, Annahme proportionaler Hazards). */
export function tabellenCox(e: CoxErgebnis, name: Name, zp?: { personen: number }): TableItem[] {
  const nm = (i: number) => name(e.praed[i]?.name ?? '');
  const zeile = (k: CoxKoef): Z[] => { const p = e.praed[k.pIdx], bez = p?.art === 'faktor' ? `${nm(k.pIdx)}: ${k.stufe} (${T('gegen', 'vs.')} ${p.stufen[0] ?? ''})` : nm(k.pIdx); if (coxUnsicher(e, k)) return [bez, T('nicht schätzbar', 'not estimable'), '-', '-', '-', '-', '-', '-']; return [bez, bTab(k.b), bTab(k.se), zTab(k.z), fp(k.p), hrTab(k.hr), hrTab(k.kiU), hrTab(k.kiO)]; };
  const koef = tabelle('Cox Regression', T('Cox-Regression: Hazard Ratios', 'Cox regression: hazard ratios'),
    [T('Angabe', 'Predictor'), 'B', 'SE', 'z', 'p', 'HR', T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')],
    e.koef.map(zeile),
    [zp ? T(`${personenT(zp.personen)} in ${zeilenT(e.n)} (Zählprozess-Form), ${ereignisseT(e.ereignisse)}, Bindungen nach Efron (R survival::coxph). HR = exp(B); Wald-Intervall und Wald-Test (Normalverteilung). Eine HR ist kein Risikoverhältnis: Sie vergleicht das Momentanrisiko.`,
      `${personenT(zp.personen)} in ${zeilenT(e.n)} (counting-process form), ${ereignisseT(e.ereignisse)}, ties by Efron (R survival::coxph). HR = exp(B); Wald interval and Wald test (normal distribution). An HR is not a risk ratio: it compares the instantaneous risk.`)
      : T(`${personenT(e.n)}, ${ereignisseT(e.ereignisse)}, Bindungen nach Efron (R survival::coxph). HR = exp(B); Wald-Intervall und Wald-Test (Normalverteilung). Eine HR ist kein Risikoverhältnis: Sie vergleicht das Momentanrisiko.`,
      `${personenT(e.n)}, ${ereignisseT(e.ereignisse)}, ties by Efron (R survival::coxph). HR = exp(B); Wald interval and Wald test (normal distribution). An HR is not a risk ratio: it compares the instantaneous risk.`)]);
  const ph = e.ph;
  const phZ = (t: { chi2: number; df: number; p: number }, bez: string): Z[] => [bez, fx(t.chi2), fd(t.df), fp(t.p)];
  const tests = tabelle('Cox Tests', T('Cox-Regression: Tests', 'Cox regression: tests'),
    [T('Test', 'Test'), 'χ²', 'df', 'p'],
    [phZ(e.modelltest, T('Modell (Likelihood-Quotienten-Test)', 'Model (likelihood ratio test)')),
      ...(e.praed.length > 1 || e.praed.some(p => p.stufen.length > 2) ? e.lr.map(l => phZ(l, `${T('Likelihood-Quotienten-Test', 'Likelihood ratio test')}: ${nm(l.pIdx)}`)) : []),
      ...(ph ? [...ph.praed.map(x => phZ(x, `${T('Proportionale Hazards', 'Proportional hazards')}: ${nm(x.pIdx)}`)), ...(ph.praed.length > 1 ? [phZ(ph.gesamt, T('Proportionale Hazards: gesamt', 'Proportional hazards: overall'))] : [])] : [])],
    [zp ? T('Annahme proportionaler Hazards: Score-Test cox.zph (Grambsch & Therneau 1994); p unter ,05 spricht gegen die Annahme. Bei zeitabhängigen Größen ist der Test nur ein Anhaltspunkt. Eine Konkordanz gibt es bei Zählprozess-Daten nicht.', 'Assumption of proportional hazards: score test cox.zph (Grambsch & Therneau 1994); p below .05 speaks against the assumption. With time-dependent covariates the test is only a guide. There is no concordance for counting-process data.')
      : T(`Konkordanz (Harrells C) = ${ohneNull(e.konkordanz.c, 3)}, SE = ${ohneNull(e.konkordanz.se, 3)}. Annahme proportionaler Hazards: Score-Test cox.zph (Grambsch & Therneau 1994); p unter ,05 spricht gegen die Annahme.`,
      `Concordance (Harrell's C) = ${ohneNull(e.konkordanz.c, 3)}, SE = ${ohneNull(e.konkordanz.se, 3)}. Assumption of proportional hazards: score test cox.zph (Grambsch & Therneau 1994); p below .05 speaks against the assumption.`)]);
  return [koef, tests];
}
