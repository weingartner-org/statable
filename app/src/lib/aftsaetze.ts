/**
 * Sätze, APA-Zeile, Hinweise und Tabellen zum AFT-Modell und zur Cox-Regression mit Kennung (Später S-F2, Teil D); Zahlen: aft.ts (R, survival::survreg und coxph).
 * Sie hängen am Ergebnis der Kaplan-Meier-Karte (`Kaplan.aft`, `Kaplan.frailty`) und werden in ueberlebensaetze.ts an die Sätze der Karte angefügt.
 *
 * Reihenfolge wie bei der Cox-Regression: Hinweise, die das Ergebnis einschränken, stehen ZUERST. Pflicht beim AFT-Modell: der Vorzeichen-Satz („Ein positives b heißt hier eine LÄNGERE Zeit, bei der Cox-Regression ein höheres Risiko“).
 * Beim Weibull-Modell die Hazard Ratio dazu (Intervall nur eine Näherung). Der AIC ist kein Test. Frailty: bedingte Wirkung, nicht dieselbe Zahl wie die HR ohne Frailty; cluster ändert nur den Standardfehler.
 * ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { ki, zitat as anfuehrung } from '../i18n/profil';
import { komma, pWert, kurz } from './ergebnis';
import { tabelle, fx, fp, fd, type Z } from './mwsaetze';
import { hr, hrTxt, sig } from './coxsaetze';
import { verteilungName, verteilungWort, verteilungWortGross, FRAILTY_GRUPPEN_WENIG, type AftErgebnis, type AftKoef, type FrailtyErgebnis, type FrailtyKoef } from './aft';

const T = L;
type Name = (n: string) => string;
export interface AftSaetze { hinweise: string[]; zusatz: string; vorsicht: string; apa: string; marken: { text: string; erklaer: string; hinweis?: boolean }[] }

const personenT = (n: number) => Lp(n, `${n} Person`, `${n} Personen`, `${n} person`, `${n} people`);
const ereignisseT = (n: number) => Lp(n, `${n} Ereignis`, `${n} Ereignisse`, `${n} event`, `${n} events`);
const zeilenT = (n: number) => Lp(n, `${n} Zeile`, `${n} Zeilen`, `${n} row`, `${n} rows`);
const gruppenT = (n: number) => Lp(n, `${n} Gruppe`, `${n} Gruppen`, `${n} group`, `${n} groups`);
const q = (t: string) => anfuehrung(kurz(t));
const pn = (e: { praed: { name: string }[] }, i: number, name: Name) => q(name(e.praed[i]?.name ?? ''));
const wertTr = (k: AftKoef) => `${T('Zeitverhältnis', 'time ratio')} ${hr(k.zv)}, ${ki(hr(k.kiU), hr(k.kiO))}, p ${pWert(k.p)}`;
const eben = (k: AftKoef) => hr(k.zv) === hr(1);
const zahl1 = (v: number) => komma(v, 1);

/** Nur die Koeffizienten der Prädiktoren, ohne Achsenabschnitt. */
const praedKoef = (e: AftErgebnis) => e.koef.filter(k => !k.achsenabschnitt && k.pIdx >= 0);
const aftUnsicher = (e: AftErgebnis, k: AftKoef): boolean => e.trennung && (!Number.isFinite(k.se) || Math.abs(k.b) > 8 || k.se > 20);

/** Der Satz zu EINEM Koeffizienten des AFT-Modells (nie eine Aussage über die ganze Spalte). */
export function aftKoefSatz(e: AftErgebnis, k: AftKoef, name: Name): string {
  const p = e.praed[k.pIdx]!, n = pn(e, k.pIdx, name), s = sig(k.p), gruppe = p.art === 'faktor', mod = verteilungName(e.dist), wort = verteilungWort(e.dist), fe = hr(k.zv), aussage = wertTr(k), hoch = k.zv >= 1;
  const stufe = anfuehrung(k.stufe), ref = anfuehrung(p.stufen[0] ?? '');
  if (aftUnsicher(e, k)) return T(`Für ${gruppe ? `${stufe} (${n})` : n} lässt sich kein Zeitverhältnis schätzen (zum Beispiel, weil in einer Gruppe niemand das Ereignis hat).`, `For ${gruppe ? `${stufe} (${n})` : n} no time ratio can be estimated (for example because nobody in a group has the event).`);
  if (gruppe) {
    if (!s) return T(`Zwischen ${stufe} und ${ref} (${n}) zeigt sich im AFT-Modell (${wort}) kein signifikanter Unterschied in der Zeit bis zum Ereignis (${aussage}).`, `Between ${stufe} and ${ref} (${n}) the ${mod} model shows no significant difference in the time to the event (${aussage}).`);
    if (hoch) return T(`Im AFT-Modell (${wort}) ist die Zeit bis zum Ereignis bei ${stufe} (${n}) um den Faktor ${fe} länger als bei ${ref} (${aussage}), bei sonst gleichen Angaben.`, `In the ${mod} model the time to the event is longer by a factor of ${fe} for ${stufe} (${n}) than for ${ref} (${aussage}), other characteristics being equal.`);
    return T(`Im AFT-Modell (${wort}) ist die Zeit bis zum Ereignis bei ${stufe} (${n}) nur das ${fe}-Fache der Zeit bei ${ref} (${aussage}), bei sonst gleichen Angaben.`, `In the ${mod} model the time to the event for ${stufe} (${n}) is only ${fe} times the time for ${ref} (${aussage}), other characteristics being equal.`);
  }
  if (!s) return T(`Bei ${n} zeigt sich im AFT-Modell (${wort}) kein signifikanter Zusammenhang mit der Zeit bis zum Ereignis (${aussage}).`, `For ${n} the ${mod} model shows no significant relationship with the time to the event (${aussage}).`);
  if (eben(k)) return T(`Mit jeder Einheit mehr bei ${n} ändert sich die Zeit bis zum Ereignis praktisch nicht (${aussage}).`, `With each additional unit of ${n}, the time to the event hardly changes (${aussage}).`);
  if (hoch) return T(`Im AFT-Modell (${wort}) ist die Zeit bis zum Ereignis mit jeder Einheit mehr bei ${n} um den Faktor ${fe} länger (${aussage}), bei sonst gleichen Angaben.`, `In the ${mod} model the time to the event is longer by a factor of ${fe} with each additional unit of ${n} (${aussage}), other characteristics being equal.`);
  return T(`Im AFT-Modell (${wort}) ist die Zeit bis zum Ereignis mit jeder Einheit mehr bei ${n} nur das ${fe}-Fache (${aussage}), bei sonst gleichen Angaben.`, `In the ${mod} model the time to the event is only ${fe} times as long with each additional unit of ${n} (${aussage}), other characteristics being equal.`);
}

/** Pflicht: der Vorzeichen-Satz. Das Vorzeichen von b ist beim AFT-Modell und beim Cox-Modell entgegengesetzt. */
export const vorzeichenSatz = (): string => T('Das Vorzeichen von b ist beim AFT-Modell und beim Cox-Modell entgegengesetzt: Ein positives b heißt hier eine längere Zeit bis zum Ereignis (Zeitverhältnis über 1), bei der Cox-Regression ein höheres Risiko (Hazard Ratio über 1).',
  'The sign of b is opposite in the AFT model and in the Cox model: a positive b here means a longer time to the event (time ratio above 1), in the Cox regression a higher risk (hazard ratio above 1).');

/** Weibull: dasselbe als Hazard Ratio, mit Satz zur Näherung des Intervalls. */
export function weibullHrSatz(e: AftErgebnis, name: Name): string {
  if (e.dist !== 'weibull') return '';
  const k = praedKoef(e).find(x => sig(x.p) && !aftUnsicher(e, x));
  const h = k ? e.hrWeibull.find(x => x.pIdx === k.pIdx && x.stufe === k.stufe) : undefined;
  if (!k || !h) return '';
  const p = e.praed[k.pIdx]!, wer = p.art === 'faktor' ? `${anfuehrung(k.stufe)} (${pn(e, k.pIdx, name)})` : pn(e, k.pIdx, name);
  return T(`Dasselbe als Hazard Ratio (nur im Weibull-Modell möglich) für ${wer}: ${hrTxt(h.hr)}, ${ki(hr(h.kiU), hr(h.kiO))}. Das Intervall ist eine Näherung (es rechnet σ als fest).`,
    `The same as a hazard ratio (only possible in the Weibull model) for ${wer}: ${hrTxt(h.hr)}, ${ki(hr(h.kiU), hr(h.kiO))}. The interval is an approximation (it treats σ as fixed).`);
}

/** Satz zum AIC-Vergleich: Reihenfolge, nie ein Test. */
export function aicSatz(e: AftErgebnis): string {
  const v = [...e.vergleich].sort((a, b) => a.aic - b.aic);
  if (v.length < 2) return '';
  const liste = v.map((x, i) => (i === 0 ? `AIC ${zahl1(x.aic)}` : `${verteilungName(x.dist)} ${zahl1(x.aic)}`)).join('; ');
  const beste = verteilungName(v[0]!.dist), besteWort = verteilungWort(v[0]!.dist), gewaehlt = e.dist === v[0]!.dist;
  return (gewaehlt
    ? T(`Nach dem AIC passt die ${besteWort} am besten (${liste}).`, `By the AIC the ${beste} model fits best (${liste}).`)
    : T(`Nach dem AIC passt die ${besteWort} am besten (${liste}); gewählt ist die ${verteilungWort(e.dist)}.`, `By the AIC the ${beste} model fits best (${liste}); the ${verteilungName(e.dist)} model is chosen.`))
    + ' ' + T('Der AIC ist kein Test: Kleiner heißt besser angepasst, die Verteilung wählt die Person nach der Sachlage.', 'The AIC is not a test: smaller means a better fit, and the person chooses the distribution according to the subject matter.');
}

/** Hinweise vor dem Ergebnis: Trennung, wenige Ereignisse (10 je Koeffizient wie bei der Cox-Regression). */
export function aftHinweise(e: AftErgebnis): string[] {
  const aus: string[] = [];
  if (e.trennung) aus.push(T('Die Schätzung ist nicht verlässlich: Ein Koeffizient geht gegen unendlich (zum Beispiel hat eine Gruppe kein Ereignis).', 'The estimate is not reliable: a coefficient goes to infinity (for example, a group has no events).'));
  const k = praedKoef(e).length;
  if (k > 0 && e.ereignisse / k < 10) aus.push(Lp(k, `Wenige Ereignisse: ${ereignisseT(e.ereignisse)} bei ${k} Koeffizient (Faustregel: mindestens 10 je Koeffizient, Peduzzi u. a. 1995) - die Schätzungen sind unsicher.`, `Wenige Ereignisse: ${ereignisseT(e.ereignisse)} bei ${k} Koeffizienten (Faustregel: mindestens 10 je Koeffizient, Peduzzi u. a. 1995) - die Schätzungen sind unsicher.`,
    `Few events: ${ereignisseT(e.ereignisse)} for ${k} coefficient (rule of thumb: at least 10 per coefficient, Peduzzi et al. 1995) - the estimates are uncertain.`, `Few events: ${ereignisseT(e.ereignisse)} for ${k} coefficients (rule of thumb: at least 10 per coefficient, Peduzzi et al. 1995) - the estimates are uncertain.`));
  return aus;
}

export function saetzeAft(e: AftErgebnis, name: Name): AftSaetze {
  const hinweise = aftHinweise(e), mod = verteilungName(e.dist);
  const pk = praedKoef(e), sigK = pk.filter(k => aftUnsicher(e, k) || sig(k.p));
  const kopf = T(`AFT-Modell (${verteilungWort(e.dist)}, ${personenT(e.n)}, ${ereignisseT(e.ereignisse)}): Es schätzt, um welchen Faktor sich die Zeit bis zum Ereignis ändert (Zeitverhältnis).`, `AFT model (${mod} distribution, ${personenT(e.n)}, ${ereignisseT(e.ereignisse)}): it estimates by which factor the time to the event changes (time ratio).`);
  const einzeln = sigK.map(k => aftKoefSatz(e, k, name)).join(' ');
  const keine = !sigK.length && pk.length ? T('Kein Koeffizient ist signifikant; alle stehen in der Tabelle.', 'No coefficient is significant; all are in the table.') : '';
  const rest = sigK.length < pk.length && sigK.length > 0 ? T('Die übrigen Koeffizienten stehen in der Tabelle.', 'The remaining coefficients are in the table.') : '';
  const zusatz = [kopf, einzeln, keine, rest, vorzeichenSatz(), weibullHrSatz(e, name), aicSatz(e), T(`Gerechnet wurde mit ${e.n} Fällen.`, `Calculated with ${e.n} cases.`),
    e.ausgelassen > 0 ? Lp(e.ausgelassen, 'Eine Zeile mit einer Lücke wurde ausgelassen.', `${e.ausgelassen} Zeilen mit Lücken wurden ausgelassen.`, 'One row with a gap was left out.', `${e.ausgelassen} rows with gaps were left out.`) : ''].filter(Boolean).join(' ');
  const vorsicht = [T('Ein Zeitverhältnis ist keine Hazard Ratio: Es vergleicht die Zeit bis zum Ereignis, nicht das Risiko. Bei einem Ereignis, das erwünscht ist (zum Beispiel Genesung), ist eine längere Zeit nicht besser.', 'A time ratio is not a hazard ratio: it compares the time to the event, not the risk. For an event that is desirable (for example recovery), a longer time is not better.'),
    T('Das Modell nimmt an, dass die Zeit der gewählten Verteilung folgt; die Wahl der Verteilung ändert die Zahlen. Es gibt keine zeitabhängigen Größen und keine Linkstrunkierung.', 'The model assumes that the time follows the chosen distribution; the choice of distribution changes the numbers. There are no time-dependent covariates and no left truncation.'),
    T('Ein Zusammenhang ist keine Ursache; ohne Zufallszuteilung können weitere Merkmale mitwirken.', 'A relationship is not a cause; without random assignment other characteristics may contribute.')].join(' ');
  const trApa = pk.map(k => { const p = e.praed[k.pIdx]!, nm = p.art === 'faktor' ? `${name(p.name)}: ${k.stufe}` : name(p.name); return aftUnsicher(e, k) ? `${T('Zeitverhältnis nicht schätzbar', 'time ratio not estimable')} (${kurz(nm, 30)})` : `${T('ZV', 'TR')} = ${hr(k.zv)}, ${ki(hr(k.kiU), hr(k.kiO))}, p ${pWert(k.p)} (${kurz(nm, 30)})`; });
  const apa = T(`AFT-Modell (${mod}): ${trApa.join('; ')}; σ = ${komma(e.skala, 2)}; AIC = ${zahl1(e.aic)}; ${personenT(e.n)}, ${ereignisseT(e.ereignisse)}`, `AFT model (${mod}): ${trApa.join('; ')}; σ = ${komma(e.skala, 2)}; AIC = ${zahl1(e.aic)}; ${personenT(e.n)}, ${ereignisseT(e.ereignisse)}`);
  const marken = [
    { text: T(`AFT-Modell (${mod})`, `AFT model (${mod})`), erklaer: 'aft-modell' },
    ...pk.filter(k => !aftUnsicher(e, k)).slice(0, 3).map(k => ({ text: `${e.praed[k.pIdx]?.art === 'faktor' ? kurz(`${name(e.praed[k.pIdx]!.name)}: ${k.stufe}`, 28) : kurz(name(e.praed[k.pIdx]?.name ?? ''), 28)}: ${T('ZV', 'TR')} = ${hr(k.zv)}`, erklaer: 'aft-modell' })),
    ...(e.trennung ? [{ text: T('Schätzung unsicher (Trennung)', 'Estimate uncertain (separation)'), erklaer: 'aft-modell', hinweis: true }] : [])
  ];
  return { hinweise, zusatz, vorsicht, apa, marken };
}

/* ------------------------------------------------------------ Kennung: cluster und Frailty */
const frKoefWert = (k: FrailtyKoef) => `${hrTxt(k.hr)}, ${ki(hr(k.kiU), hr(k.kiO))}, p ${pWert(k.p)}`;

export function frailtyHinweise(e: FrailtyErgebnis, name: Name): string[] {
  const aus: string[] = [];
  const kn = q(name(e.kennung));
  if (e.wenigeGruppen) aus.push(T(`Wenige Gruppen: nur ${gruppenT(e.gruppen)} bei ${kn} (Faustregel: mindestens ${FRAILTY_GRUPPEN_WENIG}). Standardfehler und Varianz sind dann unsicher.`, `Few groups: only ${gruppenT(e.gruppen)} for ${kn} (rule of thumb: at least ${FRAILTY_GRUPPEN_WENIG}). Standard errors and variance are then uncertain.`));
  if (e.rand) aus.push(T('Die geschätzte Varianz der Gruppen liegt am Rand (nahe 0): Über die Angaben hinaus unterscheiden sich die Gruppen nicht. Die Koeffizienten sind dann wie ohne Frailty.', 'The estimated variance of the groups is at the boundary (near 0): beyond the predictors the groups do not differ. The coefficients are then as without frailty.'));
  const k = e.npar;
  if (k > 0 && e.ereignisse / k < 10) aus.push(T(`Wenige Ereignisse: ${ereignisseT(e.ereignisse)} bei ${k} Koeffizienten (Faustregel: mindestens 10 je Koeffizient, Peduzzi u. a. 1995).`, `Few events: ${ereignisseT(e.ereignisse)} for ${k} coefficients (rule of thumb: at least 10 per coefficient, Peduzzi et al. 1995).`));
  return aus;
}

export function saetzeFrailty(e: FrailtyErgebnis, name: Name, ereignis: string): AftSaetze {
  const hinweise = frailtyHinweise(e, name), kn = q(name(e.kennung)), cluster = e.modell === 'cluster';
  const wer = (k: FrailtyKoef) => { const p = e.praed[k.pIdx]; return p?.art === 'faktor' ? `${anfuehrung(k.stufe)} (${pn(e, k.pIdx, name)})` : pn(e, k.pIdx, name); };
  const sigK = e.koef.filter(k => sig(k.p));
  const einzeln = (sigK.length ? sigK : e.koef.slice(0, 1)).map(k => (sig(k.p)
    ? T(`${wer(k)}: ${frKoefWert(k)}.`, `${wer(k)}: ${frKoefWert(k)}.`)
    : T(`${wer(k)}: kein signifikanter Zusammenhang (${frKoefWert(k)}).`, `${wer(k)}: no significant relationship (${frKoefWert(k)}).`))).join(' ');
  const kopf = cluster
    ? T(`Die Zeilen mit derselben Kennung ${kn} wurden mit robusten Standardfehlern berücksichtigt (Cluster, ${gruppenT(e.gruppen)}, ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}; Bindungen nach ${e.ties === 'breslow' ? 'Breslow' : 'Efron'}). Die Koeffizienten bleiben, die Standardfehler ändern sich.`,
      `Rows with the same identifier ${kn} were taken into account with robust standard errors (cluster, ${gruppenT(e.gruppen)}, ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}; ties by ${e.ties === 'breslow' ? 'Breslow' : 'Efron'}). The coefficients stay, the standard errors change.`)
    : T(`Mit einer Gamma-Frailty je ${kn} (Varianz ${komma(e.varianz ?? NaN, 2)}; Test auf Varianz 0: p ${pWert(e.pHalbiert ?? NaN)}; ${gruppenT(e.gruppen)}, ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}; Bindungen nach ${e.ties === 'breslow' ? 'Breslow' : 'Efron'}) gilt die Hazard Ratio für Zeilen derselben Gruppe (z. B. derselben Person); das ist die bedingte Wirkung.`,
      `With a gamma frailty for ${kn} (variance ${komma(e.varianz ?? NaN, 2)}; test for variance 0: p ${pWert(e.pHalbiert ?? NaN)}; ${gruppenT(e.gruppen)}, ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}; ties by ${e.ties === 'breslow' ? 'Breslow' : 'Efron'}) the hazard ratio applies within the same group (conditional effect).`);
  const art = cluster
    ? T('Die Hazard Ratio mit Cluster beschreibt die Wirkung im Mittel über die Gruppen (marginal).', 'The hazard ratio with cluster describes the effect on average over the groups (marginal).')
    : T('Die bedingte Hazard Ratio ist nicht dieselbe Zahl wie die ohne Frailty oder mit Cluster: Bei großer Varianz liegt sie weiter von 1 entfernt.', 'The conditional hazard ratio is not the same number as the one without frailty or with cluster: with a large variance it lies further from 1.');
  const zusatz = [kopf, einzeln, art, T(`Das Ereignis ist ${q(ereignis)}.`, `The event is ${q(ereignis)}.`), e.ausgelassen > 0 ? Lp(e.ausgelassen, 'Eine Zeile mit einer Lücke wurde ausgelassen.', `${e.ausgelassen} Zeilen mit Lücken wurden ausgelassen.`, 'One row with a gap was left out.', `${e.ausgelassen} rows with gaps were left out.`) : ''].filter(Boolean).join(' ');
  const vorsicht = [T('Eine Hazard Ratio ist kein Risikoverhältnis: Sie vergleicht das Momentanrisiko zu jedem Zeitpunkt.', 'A hazard ratio is not a risk ratio: it compares the instantaneous risk at any time.'),
    cluster ? T('Cluster ändert nur die Standardfehler; ob die Zeilen einer Gruppe einander ähneln, zeigt es nicht. Dafür gibt es die Frailty.', 'Cluster changes only the standard errors; it does not show whether the rows of a group resemble each other. The frailty does that.')
      : T('Die Frailty ist gamma-verteilt angenommen; eine andere Verteilung (zum Beispiel normal) gibt eine andere Varianz.', 'The frailty is assumed to be gamma distributed; another distribution (for example normal) gives another variance.'),
    T('Ein Zusammenhang ist keine Ursache; ohne Zufallszuteilung können weitere Merkmale mitwirken.', 'A relationship is not a cause; without random assignment other characteristics may contribute.')].join(' ');
  const hrApa = e.koef.map(k => { const p = e.praed[k.pIdx]!, nm = p.art === 'faktor' ? `${name(p.name)}: ${k.stufe}` : name(p.name); return `${hrTxt(k.hr)}, ${ki(hr(k.kiU), hr(k.kiO))}, p ${pWert(k.p)} (${kurz(nm, 30)})`; });
  const apa = cluster
    ? T(`Cox-Regression mit Cluster (${gruppenT(e.gruppen)}): ${hrApa.join('; ')}; ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}`, `Cox regression with cluster (${gruppenT(e.gruppen)}): ${hrApa.join('; ')}; ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}`)
    : T(`Cox-Regression mit Gamma-Frailty (Varianz ${komma(e.varianz ?? NaN, 2)}, p ${pWert(e.pHalbiert ?? NaN)}): ${hrApa.join('; ')}; ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}`, `Cox regression with gamma frailty (variance ${komma(e.varianz ?? NaN, 2)}, p ${pWert(e.pHalbiert ?? NaN)}): ${hrApa.join('; ')}; ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}`);
  const marken = [
    { text: cluster ? T('Cox mit Cluster', 'Cox with cluster') : T(`Frailty: Varianz ${komma(e.varianz ?? NaN, 2)}`, `Frailty: variance ${komma(e.varianz ?? NaN, 2)}`), erklaer: 'frailty' },
    ...e.koef.slice(0, 3).map(k => ({ text: `${e.praed[k.pIdx]?.art === 'faktor' ? kurz(`${name(e.praed[k.pIdx]!.name)}: ${k.stufe}`, 28) : kurz(name(e.praed[k.pIdx]?.name ?? ''), 28)}: ${hrTxt(k.hr)}`, erklaer: 'frailty' })),
    ...(e.wenigeGruppen ? [{ text: T(`Nur ${gruppenT(e.gruppen)}`, `Only ${gruppenT(e.gruppen)}`), erklaer: 'frailty', hinweis: true }] : [])
  ];
  return { hinweise, zusatz, vorsicht, apa, marken };
}

/* ------------------------------------------------------------ Tabellen */
const bTab = (v: number): Z => (!Number.isFinite(v) ? '-' : Math.abs(v) >= 1e6 ? { t: v > 0 ? '> 999999' : '< -999999', n: v } : fx(v, 3));
const hrTab = (v: number): Z => (!Number.isFinite(v) ? '-' : v > 999 ? { t: '> 999', n: v } : v < 0.001 ? { t: '< 0.001', n: v } : fx(v, v < 0.1 ? 3 : 2));

export function tabellenAft(e: AftErgebnis, name: Name): TableItem[] {
  const mod = verteilungName(e.dist);
  const zeile = (k: AftKoef): Z[] => {
    if (k.achsenabschnitt) return [T('Achsenabschnitt', 'Intercept'), bTab(k.b), bTab(k.se), fx(k.z), fp(k.p), hrTab(k.zv), hrTab(k.kiU), hrTab(k.kiO)];
    const p = e.praed[k.pIdx], nm = name(p?.name ?? ''), bez = p?.art === 'faktor' ? `${nm}: ${k.stufe} (${T('gegen', 'vs.')} ${p.stufen[0] ?? ''})` : nm;
    if (aftUnsicher(e, k)) return [bez, T('nicht schätzbar', 'not estimable'), '-', '-', '-', '-', '-', '-'];
    return [bez, bTab(k.b), bTab(k.se), fx(k.z), fp(k.p), hrTab(k.zv), hrTab(k.kiU), hrTab(k.kiO)];
  };
  const koef = tabelle('AFT Model', T('AFT-Modell: Zeitverhältnisse', 'AFT model: time ratios'),
    [T('Angabe', 'Predictor'), 'B', 'SE', 'z', 'p', T('Zeitverhältnis', 'Time ratio'), T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')],
    e.koef.map(zeile),
    [T(`${verteilungWortGross(e.dist)}, ${personenT(e.n)}, ${ereignisseT(e.ereignisse)} (R survival::survreg). Zeitverhältnis = exp(B): Faktor, um den sich die Zeit bis zum Ereignis ändert; Wald-Intervall und Wald-Test (Normalverteilung). Skala σ = ${komma(e.skala, 3)}, Log-Likelihood = ${komma(e.loglik, 2)}, AIC = ${komma(e.aic, 1)}. Ein positives B heißt: längere Zeit (bei der Cox-Regression: höheres Risiko).`,
      `${mod} distribution, ${personenT(e.n)}, ${ereignisseT(e.ereignisse)} (R survival::survreg). Time ratio = exp(B): factor by which the time to the event changes; Wald interval and Wald test (normal distribution). Scale σ = ${komma(e.skala, 3)}, log-likelihood = ${komma(e.loglik, 2)}, AIC = ${komma(e.aic, 1)}. A positive B means a longer time (in the Cox regression: a higher risk).`)]);
  const aus: TableItem[] = [koef];
  if (e.vergleich.length >= 2) {
    const best = Math.min(...e.vergleich.map(v => v.aic));
    aus.push(tabelle('AFT Distributions', T('AFT-Modell: Vergleich der Verteilungen', 'AFT model: comparison of distributions'),
      [T('Verteilung', 'Distribution'), T('Log-Likelihood', 'Log-likelihood'), 'AIC', T('Unterschied zum besten AIC', 'Difference from the best AIC')],
      e.vergleich.map(v => [verteilungName(v.dist), fx(v.loglik, 2), fx(v.aic, 1), fx(v.aic - best, 1)] as Z[]),
      [T('Kleinerer AIC heißt besser angepasst; ein Test ist das nicht. Die Verteilung wählt die Person nach der Sachlage.', 'A smaller AIC means a better fit; this is not a test. The person chooses the distribution according to the subject matter.')]));
  }
  if (e.dist === 'weibull' && e.hrWeibull.length) {
    aus.push(tabelle('Weibull Hazard Ratios', T('Weibull-Modell: dasselbe als Hazard Ratio', 'Weibull model: the same as a hazard ratio'),
      [T('Angabe', 'Predictor'), 'HR', T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')],
      e.hrWeibull.map(h => { const p = e.praed[h.pIdx], nm = name(p?.name ?? ''); return [p?.art === 'faktor' ? `${nm}: ${h.stufe}` : nm, hrTab(h.hr), hrTab(h.kiU), hrTab(h.kiO)] as Z[]; }),
      [T('HR = exp(−B/σ). Das Intervall ist eine Näherung: Es rechnet σ als fest. Nur das Weibull-Modell ist zugleich ein Modell proportionaler Hazards.', 'HR = exp(−B/σ). The interval is an approximation: it treats σ as fixed. Only the Weibull model is also a proportional hazards model.')]));
  }
  return aus;
}

export function tabellenFrailty(e: FrailtyErgebnis, name: Name): TableItem[] {
  const cluster = e.modell === 'cluster';
  const zeile = (k: FrailtyKoef): Z[] => {
    const p = e.praed[k.pIdx], nm = name(p?.name ?? ''), bez = p?.art === 'faktor' ? `${nm}: ${k.stufe} (${T('gegen', 'vs.')} ${p.stufen[0] ?? ''})` : nm;
    return cluster ? [bez, bTab(k.b), k.seNaiv === null ? '-' : bTab(k.seNaiv), bTab(k.se), fx(k.z), fp(k.p), hrTab(k.hr), hrTab(k.kiU), hrTab(k.kiO)]
      : [bez, bTab(k.b), bTab(k.se), fx(k.z), fp(k.p), hrTab(k.hr), hrTab(k.kiU), hrTab(k.kiO)];
  };
  const kopfCluster = [T('Angabe', 'Predictor'), 'B', T('SE (naiv)', 'SE (naive)'), T('SE (robust)', 'SE (robust)'), 'z', 'p', 'HR', T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')];
  const kopfGamma = [T('Angabe', 'Predictor'), 'B', 'SE', 'z', 'p', 'HR', T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')];
  const koef = tabelle(cluster ? 'Cox Cluster' : 'Cox Frailty', cluster ? T('Cox-Regression mit Cluster: Hazard Ratios', 'Cox regression with cluster: hazard ratios') : T('Cox-Regression mit Gamma-Frailty: Hazard Ratios', 'Cox regression with gamma frailty: hazard ratios'),
    cluster ? kopfCluster : kopfGamma, e.koef.map(zeile),
    [cluster
      ? T(`${gruppenT(e.gruppen)}, ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}, Bindungen nach ${e.ties === 'breslow' ? 'Breslow' : 'Efron'} (R survival::coxph mit cluster()). B und HR sind die der Cox-Regression ohne Cluster; p und Intervall nehmen den robusten Standardfehler (Wald, Normalverteilung).`,
        `${gruppenT(e.gruppen)}, ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}, ties by ${e.ties === 'breslow' ? 'Breslow' : 'Efron'} (R survival::coxph with cluster()). B and HR are those of the Cox regression without cluster; p and interval use the robust standard error (Wald, normal distribution).`)
      : T(`${gruppenT(e.gruppen)}, ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}, Bindungen nach ${e.ties === 'breslow' ? 'Breslow' : 'Efron'} (R survival::coxph mit frailty(), Gamma, EM-Verfahren). Bedingte Hazard Ratio: gilt bei gleicher Gruppe.`,
        `${gruppenT(e.gruppen)}, ${zeilenT(e.n)}, ${ereignisseT(e.ereignisse)}, ties by ${e.ties === 'breslow' ? 'Breslow' : 'Efron'} (R survival::coxph with frailty(), gamma, EM algorithm). Conditional hazard ratio: applies within the same group.`)]);
  const aus: TableItem[] = [koef];
  if (!cluster && e.varianz !== null) {
    aus.push(tabelle('Frailty Variance', T('Frailty: Varianz der Gruppen', 'Frailty: variance of the groups'),
      [T('Größe', 'Quantity'), T('Wert', 'Value')],
      [[T('Varianz der Frailty (θ)', 'Variance of the frailty (θ)'), fx(e.varianz, 3)], [T('Log-Likelihood (korrigiert)', 'Log-likelihood (corrected)'), fx(e.cLoglik ?? NaN, 2)], [T('Log-Likelihood bei θ = 0', 'Log-likelihood at θ = 0'), fx(e.loglik0 ?? NaN, 2)],
        ['χ² (Likelihood-Quotient)', fx(e.lrChi2 ?? NaN, 2)], [T('p (halbiert, Rand des Parameterraums)', 'p (halved, boundary of the parameter space)'), fp(e.pHalbiert ?? NaN)]] as Z[][],
      [T('Test auf Varianz 0: Likelihood-Quotient mit halbiertem p, weil θ nicht unter 0 liegen kann (Rand des Parameterraums). Der p-Wert der Zeile „frailty“ in der R-Ausgabe ist kein Test auf θ = 0.', 'Test for variance 0: likelihood ratio with halved p, because θ cannot be below 0 (boundary of the parameter space). The p value in the row "frailty" of the R output is not a test of θ = 0.')]));
  }
  return aus;
}
