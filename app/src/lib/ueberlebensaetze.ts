/**
 * Sätze, APA-Zeile, Hinweise und Tabellen zu Kaplan-Meier (Zahlen: ueberleben.ts).
 * Die Tabellen sind echte Tabellen (TableItem) und werden bei jedem Aufruf neu gebaut, sie folgen so der Sprache.
 * ⚠ Satzvorlagen, die Schwellen für die Hinweise (zu wenige Ereignisse, wenige unter Risiko) und die Wörter „Ereignis“ und „zensiert“ von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L, Lp, d } from './sitzung.svelte';
import { ki, proz, zitat as anfuehrung } from '../i18n/profil';
import { komma, pWert, type Saetze } from './ergebnis';
import { tabelle, fo, fp, fd, fx, type Z } from './mwsaetze';
import { beiZeit, type Gruppe, type Kaplan } from './ueberleben';
import { kleinste, groesste } from './menge';
import { saetzeCox, tabellenCox } from './coxsaetze';
import { saetzeSterbetafel, tabellenSterbetafel, sterbetafelHinweise } from './sterbetafelsaetze';
import { saetzeCoxZeit, tabellenCoxZeit } from './coxzeitsaetze';
import { saetzeAft, tabellenAft, saetzeFrailty, tabellenFrailty } from './aftsaetze';

const T = L;
const ereignisseT = (n: number) => Lp(n, `${n} Ereignis`, `${n} Ereignisse`, `${n} event`, `${n} events`);
const prozent = (v: number) => proz(komma(v * 100, 0));
/** Zeitwerte mit höchstens zwei Nachkommastellen, ohne überflüssige Nullen. */
export const zeitText = (v: number) => (Number.isInteger(v) ? komma(v, 0) : Number.isInteger(v * 10) ? komma(v, 1) : komma(v, 2));
const NICHT = () => T('nicht erreicht', 'not reached');
/** Stellen für alle Mediane und Grenzen einer Zeile/eines Satzes: so viele, wie der genaueste Wert braucht (höchstens 2) - sonst stünde „9,2 [8,65; 9,76]; 5,61 [5,42; 5,8]“ (Abschlusstest B6). */
export const medStellen = (gruppen: Gruppe[]) => Math.max(0, ...gruppen.flatMap(g => [g.median.wert, g.median.lo, g.median.hi]).filter(Number.isFinite).map(v => (Number.isInteger(v) ? 0 : Number.isInteger(v * 10) ? 1 : 2)));
const medText = (v: number, st: number) => (Number.isFinite(v) ? komma(v, st) : NICHT());
const medApa = (v: number, st: number) => (Number.isFinite(v) ? komma(v, st) : '-');
const medKi = (g: Gruppe, st: number) => ki(medText(g.median.lo, st), medText(g.median.hi, st));
const medKiApa = (g: Gruppe, st: number) => ki(medApa(g.median.lo, st), medApa(g.median.hi, st));
const p0 = (p: number) => `p ${pWert(p)}`;

/** Wenige Ereignisse je Gruppe: unter dieser Zahl meldet Statable einen Hinweis. ⚠ von der Fachperson abzunehmen. */
export const EREIGNISSE_WENIG = 10;
export const ereignisWort = (k: Kaplan) => k.werte[k.ereignisIndex];
export const zensurWort = (k: Kaplan) => k.werte[k.ereignisIndex === 0 ? 1 : 0];
/** Der Zeitpunkt, zu dem die Raten genannt werden: die Marke, die dem mittleren Median am nächsten liegt, sonst die Mitte der Achse. */
export function ratenZeit(k: Kaplan): number {
  const med = k.gesamt.median.wert, ziel = Number.isFinite(med) ? med : k.ticks[k.ticks.length - 1]! / 2;
  const frei = k.ticks.filter(t => t > 0);
  return frei.reduce((b, t) => (Math.abs(t - ziel) < Math.abs(b - ziel) ? t : b), frei[0] ?? 0);
}

/** „6 und 5“, „6, 5 und 3“. */
const aufz = (x: (string | number)[], und: string) => (x.length < 2 ? x.join('') : `${x.slice(0, -1).join(', ')} ${und} ${x[x.length - 1]}`);

export interface Hinweis { art: 'hinweis' | 'info' | 'ok'; text: string; klein?: string }
/** Hinweise zur Prüfliste und zur Vorsicht. */
export function kaplanHinweise(k: Kaplan): Hinweis[] {
  const h: Hinweis[] = [];
  const mitG = k.gruppen.length >= 2, alle = mitG ? k.gruppen : [k.gesamt];
  const nm = (g: Gruppe) => (mitG ? ` (${g.name})` : '');
  /** Der Name der Gruppe, wenn es genau eine ist (sonst leer: bei mehreren steht nur die Zahl im Satz). */
  const nmListe = (gs: Gruppe[]) => (gs.length === 1 ? nm(gs[0]!) : '');
  if (k.einWert) h.push({ art: 'info', text: T(`Nur ein Wert („${ereignisWort(k)}“): Alle hatten das Ereignis, niemand ist zensiert`, `Only one value ("${ereignisWort(k)}"): everyone had the event, nobody is censored`),
    klein: T('Das ist ein gültiger Fall (zum Beispiel: alle Tiere eines Versuchs sind gestorben). Die Kurve ist dann der Anteil, der zu jeder Zeit noch ohne Ereignis ist; Median und Intervall rechnet Statable wie R survfit.', 'This is a valid case (for example: all animals in an experiment died). The curve is then the proportion still without the event at each time; Statable calculates the median and interval as R survfit does.') });
  else h.push({ art: 'info', text: T(`Ereignis ist „${ereignisWort(k)}“, zensiert ist „${zensurWort(k)}“`, `Event is "${ereignisWort(k)}", censored is "${zensurWort(k)}"`),
    klein: d('Zensiert heißt: Die Beobachtung endete, ohne dass das Ereignis eingetreten ist (zum Beispiel Studium bei Erhebungsende noch laufend). Stimmt die Zuordnung nicht, schalte sie um.', 'Zensiert heißt: Die Beobachtung endete, ohne dass das Ereignis eingetreten ist (zum Beispiel Studium bei Erhebungsende noch laufend). Stimmt die Zuordnung nicht, schalten Sie sie um.', 'Censored means: the observation ended without the event having occurred (for example still studying at the end of data collection). If the assignment is wrong, switch it.') });
  const wenig = alle.filter(g => g.ereignisse < EREIGNISSE_WENIG);
  if (wenig.length) h.push({ art: 'hinweis', text: (() => { const liste = aufz(wenig.map(g => g.ereignisse), L('und', 'and')); const wer = nmListe(wenig); return Lp(wenig.length, `Wenige Ereignisse${wer}: ${liste}`, `Wenige Ereignisse in ${wenig.length} Gruppen${wer}: ${liste}`, `Few events${wer}: ${liste}`, `Few events in ${wenig.length} groups${wer}: ${liste}`); })(),
    klein: T('Mit weniger als 10 Ereignissen je Gruppe sind die Kurve, der Median und die Intervalle sehr unsicher; der Log-Rank-Test hat wenig Trennschärfe.', 'With fewer than 10 events per group the curve, the median and the intervals are very uncertain; the log-rank test has little power.') });
  else h.push({ art: 'ok', text: T('Mindestens 10 Ereignisse je Gruppe', 'At least 10 events per group'), klein: T('Das ist eine Faustregel für eine halbwegs stabile Kurve.', 'This is a rule of thumb for a reasonably stable curve.') });
  const ohneMedian = alle.filter(g => !Number.isFinite(g.median.wert));
  if (ohneMedian.length) h.push({ art: 'info', text: (() => { const wer = nmListe(ohneMedian); return Lp(ohneMedian.length, `Median nicht erreicht${wer}`, `Median nicht erreicht in ${ohneMedian.length} Gruppen${wer}`, `Median not reached${wer}`, `Median not reached in ${ohneMedian.length} groups${wer}`); })(),
    klein: d('Die Kurve fällt bis zur längsten Beobachtung nicht unter 50 %. Dann lässt sich keine mediane Zeit nennen; nutze die Anteile zu festen Zeitpunkten.', 'Die Kurve fällt bis zur längsten Beobachtung nicht unter 50 %. Dann lässt sich keine mediane Zeit nennen; nutzen Sie die Anteile zu festen Zeitpunkten.', 'The curve does not fall below 50% up to the longest observation. No median time can then be given; use the proportions at fixed times instead.') });
  const klein = alle.filter(g => g.n < 5);
  if (klein.length) h.push({ art: 'hinweis', text: (() => { const wer = nmListe(klein); return Lp(klein.length, `Sehr kleine Gruppe${wer}: weniger als 5 Personen`, `Sehr kleine Gruppen${wer}: weniger als 5 Personen`, `Very small group${wer}: fewer than 5 people`, `Very small groups${wer}: fewer than 5 people`); })() });
  if (mitG && k.kreuzen) h.push({ art: 'hinweis', text: T('Die Kurven schneiden sich', 'The curves cross'),
    klein: T('Der Log-Rank-Test prüft vor allem Unterschiede, die über die ganze Zeit in dieselbe Richtung gehen. Schneiden sich die Kurven, kann er einen echten Unterschied übersehen.', 'The log-rank test mainly detects differences that go in the same direction throughout. If the curves cross, it can miss a real difference.') });
  if (!k.einWert) h.push({ art: 'info', text: T('Kann Statable nicht prüfen: Hängt das Ausscheiden nicht mit dem Risiko zusammen?', "Statable can't check this: is dropping out unrelated to the risk?"),
    klein: T('Die Methode nimmt an, dass zensierte Personen dasselbe weitere Risiko haben wie die, die unter Beobachtung bleiben (nicht informative Zensierung). Scheiden zum Beispiel gerade Gefährdete aus der Befragung aus, verzerrt das die Kurve.', 'The method assumes that censored people have the same further risk as those who remain under observation (non-informative censoring). If, for example, those at risk are the ones who leave the survey, the curve is biased.') });
  return h;
}

export function saetzeKaplan(e: Kaplan, name: (n: string) => string = x => x): Saetze {
  const mitG = e.gruppen.length >= 2, ges = e.gesamt, lr = e.logrank, st = medStellen(mitG ? e.gruppen : [ges]);
  const ereignis = ereignisWort(e);
  const zeit = name(e.zeit);
  const personen = (n: number) => Lp(n, `${n} Person`, `${n} Personen`, `${n} person`, `${n} people`);
  const erlebt = (n: number) => Lp(n, `erlebte ${n}`, `erlebten ${n}`, `${n}`, `${n}`);
  const zensiertT = (n: number) => Lp(n, `${n} wurde zensiert`, `${n} wurden zensiert`, `${n} was censored`, `${n} were censored`);
  const rate = (g: Gruppe, t: number) => { const b = beiZeit(g, t); return !Number.isFinite(b.s) ? '-' : Number.isFinite(b.lo) && Number.isFinite(b.hi) ? `${prozent(b.s)} (${ki(prozent(b.lo), prozent(b.hi))})` : prozent(b.s); };
  const tR = ratenZeit(e);
  let haupt: string, zusatz: string;
  const med1 = (g: Gruppe) => Number.isFinite(g.median.wert)
    ? T(`Die mediane Zeit bis zum Ereignis beträgt ${medText(g.median.wert, st)} (${medKi(g, st)}).`, `The median time to the event is ${medText(g.median.wert, st)} (${medKi(g, st)}).`)
    : T(`Die mediane Zeit wurde nicht erreicht: Die geschätzte Überlebensfunktion fällt bis zur längsten Beobachtung (${zeitText(g.maxZeit)}) nicht unter 50 %.`, `The median time was not reached: the estimated survival function does not fall below 50% up to the longest observation (${zeitText(g.maxZeit)}).`);
  if (!mitG) {
    haupt = T(`Von ${personen(ges.n)} ${erlebt(ges.ereignisse)} das Ereignis („${ereignis}“), ${zensiertT(ges.zensiert)} (Zeit in Einheiten von „${zeit}“). ${med1(ges)}`,
      `Of ${personen(ges.n)}, ${ges.ereignisse} experienced the event ("${ereignis}"), ${zensiertT(ges.zensiert)} (time in units of "${zeit}"). ${med1(ges)}`);
    zusatz = T(`Zum Zeitpunkt ${zeitText(tR)} (in Einheiten von „${zeit}“) liegt der geschätzte Anteil ohne Ereignis bei ${rate(ges, tR)}.`, `At time ${zeitText(tR)} (in units of "${zeit}") the estimated proportion without the event is ${rate(ges, tR)}.`);
  } else {
    const teile = e.gruppen.map(g => Number.isFinite(g.median.wert)
      ? T(`${g.name}: ${medText(g.median.wert, st)} (${medKi(g, st)})`, `${g.name}: ${medText(g.median.wert, st)} (${medKi(g, st)})`)
      : T(`${g.name}: nicht erreicht`, `${g.name}: not reached`));
    haupt = T(`Verglichen werden ${e.gruppen.length} Gruppen (${name(e.gruppe)}) mit ${personen(ges.n)}; ${erlebt(ges.ereignisse)} das Ereignis („${ereignis}“), ${zensiertT(ges.zensiert)} (Zeit in Einheiten von „${zeit}“). Mediane Zeit bis zum Ereignis - ${teile.join('; ')}.`,
      `${e.gruppen.length} groups (${name(e.gruppe)}) with ${personen(ges.n)} are compared; ${ges.ereignisse} experienced the event ("${ereignis}"), ${zensiertT(ges.zensiert)} (time in units of "${zeit}"). Median time to the event - ${teile.join('; ')}.`);
    const sig = lr!.p < 0.05;
    // T18: p-Deutung wie in den übrigen Verfahren; der n. s.-Satz mit „belegt nicht - heißt nicht, dass es keinen gibt“.
    const lrText = sig
      ? T(`Die Überlebenskurven unterscheiden sich; ein so großer Unterschied wäre selten, wenn es in Wahrheit keinen gäbe (Log-Rank-Test, χ²(${lr!.df}) = ${komma(lr!.chi2, 2)}, ${p0(lr!.p)}).`,
        `The survival curves differ; a difference this large would be rare if there were truly none (log-rank test, χ²(${lr!.df}) = ${komma(lr!.chi2, 2)}, ${p0(lr!.p)}).`)
      : T(`Einen Unterschied zwischen den Überlebenskurven belegt der Log-Rank-Test nicht (χ²(${lr!.df}) = ${komma(lr!.chi2, 2)}, ${p0(lr!.p)}) - das heißt nicht, dass es keinen gibt.`,
        `The log-rank test does not show a difference between the survival curves (χ²(${lr!.df}) = ${komma(lr!.chi2, 2)}, ${p0(lr!.p)}) - that does not mean there is none.`);
    const raten = e.gruppen.length <= 4 ? T(` Zum Zeitpunkt ${zeitText(tR)} (in Einheiten von „${zeit}“) liegt der geschätzte Anteil ohne Ereignis bei ${e.gruppen.map(g => `${anfuehrung(g.name)}: ${rate(g, tR)}`).join('; ')}.`, ` At time ${zeitText(tR)} (in units of "${zeit}") the estimated proportion without the event is ${e.gruppen.map(g => `${anfuehrung(g.name)}: ${rate(g, tR)}`).join('; ')}.`) : '';
    const paare = e.paarweise.length ? T(` Paarweise Vergleiche (Log-Rank, Holm-Korrektur) stehen in der Tabelle.`, ` Pairwise comparisons (log-rank, Holm correction) are in the table.`) : '';
    zusatz = lrText + raten + paare;
  }
  const hinweise = kaplanHinweise(e).filter(x => x.art === 'hinweis').map(x => x.text);
  const punkt = (x: string) => (/[.!?]$/.test(x) ? x : x + '.');
  const vorsicht = [
    e.einWert
      ? T(`Statable wertet den einzigen Wert „${ereignis}“ als Ereignis: Alle hatten es, niemand ist zensiert; das bitte prüfen.`, `Statable counts the only value "${ereignis}" as the event: everyone had it, nobody is censored; please check this.`)
      : T(`Statable wertet „${ereignis}“ als Ereignis und „${zensurWort(e)}“ als zensiert; das bitte prüfen.`, `Statable counts "${ereignis}" as the event and "${zensurWort(e)}" as censored; please check this.`),
    ...hinweise.map(punkt),
    ...(e.einWert ? [] : [T('Die Methode nimmt an, dass Zensierung nichts mit dem Risiko zu tun hat.', 'The method assumes that censoring is unrelated to the risk.')]),
    ...(mitG ? [T('Ein Unterschied zwischen Gruppen belegt noch keine Ursache; ohne Zufallszuteilung können weitere Merkmale mitwirken.', 'A difference between groups does not show a cause; without random assignment other characteristics may contribute.')] : [])
  ].join(' ');
  const apaMed = (g: Gruppe, lab = '') => `Mdn${lab} = ${medApa(g.median.wert, st)}, ${medKiApa(g, st)}`;
  // „- = nicht erreicht“ nur, wenn in der Zeile wirklich ein Strich steht (Abnahme 3, K3).
  const strich = (mitG ? e.gruppen : [ges]).some(g => !Number.isFinite(g.median.wert) || !Number.isFinite(g.median.lo) || !Number.isFinite(g.median.hi));
  const erkl = strich ? T('; - = nicht erreicht', '; - = not reached') : '';
  const apa = mitG
    ? T(`Log-Rank: χ²(${lr!.df}) = ${komma(lr!.chi2, 2)}, ${p0(lr!.p)}; ${e.gruppen.map(g => apaMed(g, ` (${g.name})`)).join('; ')}; ${personen(ges.n)}, ${ereignisseT(ges.ereignisse)}${erkl}`,
        `Log-rank: χ²(${lr!.df}) = ${komma(lr!.chi2, 2)}, ${p0(lr!.p)}; ${e.gruppen.map(g => apaMed(g, ` (${g.name})`)).join('; ')}; ${personen(ges.n)}, ${ereignisseT(ges.ereignisse)}${erkl}`)
    : T(`${apaMed(ges)}; ${personen(ges.n)}, ${ereignisseT(ges.ereignisse)}${erkl}`,
        `${apaMed(ges)}; ${personen(ges.n)}, ${ereignisseT(ges.ereignisse)}${erkl}`);
  // Cox-Regression (Welle 7): Hinweise zuerst, dann Modell und Koeffizienten; die APA-Zeile und die Marken wachsen mit
  const cx = e.cox ? saetzeCox(e.cox, name, `${name(e.ereignis)} = ${ereignis}`) : null;   // das Ereignis mit Spaltenname, nicht nur „1“
  // Später S-F: Sterbetafel (Teil 1) und Cox mit zeitabhängiger Größe (Teil 2) hängen ihre Sätze an
  const sb = e.sterbe ? saetzeSterbetafel(e.sterbe) : null;
  const cz = e.coxZeit ? saetzeCoxZeit(e.coxZeit.cox, e.coxZeit.info, name, `${name(e.ereignis)} = ${ereignis}`) : null;
  // Später S-F2: AFT-Modell und Cox mit Kennung
  const af = e.aft ? saetzeAft(e.aft, name) : null;
  const fr = e.frailty ? saetzeFrailty(e.frailty, name, `${name(e.ereignis)} = ${ereignis}`) : null;
  const zusatzAlle = [zusatz, ...(sb ? [sb.haupt, sb.zusatz] : []), ...(cx ? [...cx.hinweise, cx.zusatz] : []), ...(cz ? [...cz.hinweise, cz.zusatz] : []), ...(af ? [...af.hinweise, af.zusatz] : []), ...(fr ? [...fr.hinweise, fr.zusatz] : [])].filter(Boolean).join(' ');
  const vorsichtAlle = [vorsicht, ...(sb ? [sb.vorsicht] : []), ...(cx ? [cx.vorsicht] : []), ...(cz ? [cz.vorsicht] : []), ...(af ? [af.vorsicht] : []), ...(fr ? [fr.vorsicht] : [])].filter(Boolean).join(' ');
  const apaAlle = [apa, ...(sb ? [sb.apa] : []), ...(cx ? [cx.apa] : []), ...(cz ? [cz.apa] : []), ...(af ? [af.apa] : []), ...(fr ? [fr.apa] : [])].join('; ');
  return {
    haupt, zusatz: zusatzAlle, vorsicht: vorsichtAlle, apa: apaAlle,
    marken: [
      ...(mitG ? [{ text: `Log-Rank χ²(${lr!.df}) = ${komma(lr!.chi2, 2)}`, erklaer: 'log-rank' }, { text: p0(lr!.p), erklaer: 'p-wert' }]
        : [{ text: `${T('Median', 'Median')} = ${medText(ges.median.wert, st)}`, erklaer: 'median-ueberlebenszeit', hinweis: !Number.isFinite(ges.median.wert) }]),
      { text: T(`${ereignisseT(ges.ereignisse)}, ${ges.zensiert} zensiert`, `${ereignisseT(ges.ereignisse)}, ${ges.zensiert} censored`), erklaer: 'zensierung', hinweis: Math.min(kleinste((mitG ? e.gruppen : [ges]).map(g => g.ereignisse))) < EREIGNISSE_WENIG },
      { text: `n = ${ges.n}`, erklaer: 'kaplan-meier' },
      ...(cx?.marken ?? []),
      ...(cz?.marken ?? []),
      ...(af?.marken ?? []),
      ...(fr?.marken ?? [])
    ]
  };
}

/* ------------------------------------------------------------ Tabellen */

export function tabellenKaplan(e: Kaplan, name: (n: string) => string = x => x): TableItem[] {
  const mitG = e.gruppen.length >= 2;
  const gr = mitG ? e.gruppen : [{ ...e.gesamt, name: T('Alle', 'All') }];
  // Eine Spalte, eine Schreibweise: alle Median-Werte mit gleich vielen Stellen („52,50“ neben „103,00“ statt „103“ neben „52,50“; Abnahme 3, K4b).
  const alleMed = [...gr, ...(mitG ? [e.gesamt] : [])].flatMap(g => [g.median.wert, g.median.lo, g.median.hi]).filter(Number.isFinite);
  const stellen = alleMed.some(v => !Number.isInteger(v * 10)) ? 2 : alleMed.some(v => !Number.isInteger(v)) ? 1 : 0;
  const nicht = (v: number): Z => (Number.isFinite(v) ? fx(v, stellen) : NICHT());
  const med = tabelle('Survival Time', T('Mediane Zeit bis zum Ereignis', 'Median time to the event'),
    [mitG ? T('Gruppe', 'Group') : '', 'n', T('Median', 'Median'), T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper'), T('Ereignisse', 'Events'), T('Zensiert', 'Censored'), T('Zensiert (%)', 'Censored (%)')],
    [...gr.map(g => [g.name, fd(g.n), nicht(g.median.wert), nicht(g.median.lo), nicht(g.median.hi), fd(g.ereignisse), fd(g.zensiert), fx(g.n ? g.zensiert / g.n * 100 : NaN, 0)] as Z[]),
      ...(mitG ? [[T('Gesamt', 'Total'), fd(e.gesamt.n), nicht(e.gesamt.median.wert), nicht(e.gesamt.median.lo), nicht(e.gesamt.median.hi), fd(e.gesamt.ereignisse), fd(e.gesamt.zensiert), fx(e.gesamt.n ? e.gesamt.zensiert / e.gesamt.n * 100 : NaN, 0)] as Z[]] : [])],
    [T(`Zeit: ${name(e.zeit)}. Ereignis: „${ereignisWort(e)}“ (${name(e.ereignis)}), ${e.einWert ? L('zensiert: niemand (nur ein Wert)', 'censored: nobody (only one value)') : L(`zensiert: „${zensurWort(e)}“`, `censored: "${zensurWort(e)}"`)}. Median wie R print(survfit); „nicht erreicht“: die Kurve (oder ihr Intervall) fällt nicht auf 50 %.`,
      `Time: ${name(e.zeit)}. Event: "${ereignisWort(e)}" (${name(e.ereignis)}), ${e.einWert ? L('zensiert: niemand (nur ein Wert)', 'censored: nobody (only one value)') : L(`zensiert: „${zensurWort(e)}“`, `censored: "${zensurWort(e)}"`)}. Median as in R print(survfit); "not reached": the curve (or its interval) does not fall to 50%.`)]);
  const zeiten = e.ticks.filter(t => t > 0);
  const raten = tabelle('Survival Function', T('Überlebensfunktion zu ausgewählten Zeitpunkten', 'Survival function at selected times'),
    [mitG ? T('Gruppe', 'Group') : '', T('Zeit', 'Time'), T('Unter Risiko', 'At risk'), 'S(t)', 'SE', T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')],
    gr.flatMap(g => zeiten.map(t => { const b = beiZeit(g, t); return [g.name, fd(t), fd(b.nRisiko), fo(b.s, 3), fo(b.se, 3), fo(b.lo, 3), fo(b.hi, 3)] as Z[]; })),
    [T('S(t): geschätzter Anteil ohne Ereignis zur Zeit t (Kaplan-Meier); SE nach Greenwood; Intervall auf der Log-Skala (wie R survfit). „Unter Risiko“: Personen, deren Beobachtung mindestens bis t reicht.', 'S(t): estimated proportion without the event at time t (Kaplan-Meier); SE by Greenwood; interval on the log scale (as R survfit). "At risk": people observed at least until t.')]);
  const aus: TableItem[] = [med, raten];
  if (mitG && e.logrank) {
    const lr = e.logrank, O = lr.beobachtet.reduce((a, b) => a + b, 0), E = lr.erwartet.reduce((a, b) => a + b, 0);
    aus.push(tabelle('Log-Rank Test', T('Log-Rank-Test', 'Log-rank test'),
      [T('Gruppe', 'Group'), T('Beobachtet', 'Observed'), T('Erwartet', 'Expected'), 'χ²', 'df', 'p'],
      [...e.gruppen.map((g, i) => [g.name, fd(lr.beobachtet[i]!), fx(lr.erwartet[i]!, 2), '', '', ''] as Z[]), [T('Gesamt', 'Total'), fd(O), fx(E, 2), fx(lr.chi2, 2), fd(lr.df), fp(lr.p)]],
      [T('Log-Rank-Test (Mantel-Cox, Gewicht 1) wie R survdiff(rho = 0); Ereignisse beobachtet gegen erwartet bei gleicher Kurve.', 'Log-rank test (Mantel-Cox, weight 1) as in R survdiff(rho = 0); observed against expected events under identical curves.')]));
    if (e.paarweise.length) aus.push(tabelle('Pairwise Log-Rank', T('Paarweise Log-Rank-Tests', 'Pairwise log-rank tests'),
      [T('Vergleich', 'Comparison'), 'χ²', 'p', T('p (Holm)', 'p (Holm)')],
      e.paarweise.map(p => [`${e.gruppen[p.a]!.name} - ${e.gruppen[p.b]!.name}`, fx(p.chi2, 2), fp(p.p), fp(p.pHolm)] as Z[]),
      [T('Je Paar ein Log-Rank-Test mit df = 1, p-Werte nach Holm für die Zahl der Vergleiche korrigiert.', 'One log-rank test (df = 1) per pair, p values corrected for the number of comparisons by Holm.')]));
  }
  if (e.sterbe) aus.push(...tabellenSterbetafel(e.sterbe, name));
  if (e.cox) aus.push(...tabellenCox(e.cox, name));
  if (e.coxZeit) aus.push(...tabellenCoxZeit(e.coxZeit.cox, e.coxZeit.info, name));
  if (e.aft) aus.push(...tabellenAft(e.aft, name));
  if (e.frailty) aus.push(...tabellenFrailty(e.frailty, name));
  return aus;
}
