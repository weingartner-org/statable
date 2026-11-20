/**
 * Später S-F, Teil 1: Sätze, Hinweise und Tabellen zur Sterbetafel (Zahlen: sterbetafel.ts). Ganze Sätze je Fall (übersetzbar), Zahlenformat über das Sprachprofil, p ohne Null.
 * Die Tabellen sind echte Tabellen (TableItem) und werden bei jedem Aufruf neu gebaut, sie folgen so der Sprache.
 * Wörter (Fachblatt „Entscheidungen Opus“ 7): „Sterbetafel“ (auch: Lebenstafel, Überlebenstafel), „Ausfallrate (Hazard)“.
 * ⚠ Satzvorlagen und die Schwellen der Hinweise von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L, Lp, d } from './sitzung.svelte';
import { proz } from '../i18n/profil';
import { komma, pWert } from './ergebnis';
import { tabelle, fo, fd, fp, fx, type Z } from './mwsaetze';
import type { TafelErgebnis, TafelZeile, GehanErgebnis, SterbetafelAnzeige, SterbetafelGruppe, SterbetafelFehler } from './sterbetafel';

const T = L;
const ereignisseT = (n: number) => Lp(n, `${n} Ereignis`, `${n} Ereignisse`, `${n} event`, `${n} events`);
const zahlT = (v: number) => (Number.isInteger(v) ? komma(v, 0) : Number.isInteger(v * 10) ? komma(v, 1) : komma(v, 2));
const prozent = (v: number, st = 1) => proz(komma(v * 100, st));
const medT = (v: number) => komma(v, 1);
const chi = (g: { D: number; df: number; p: number }) => `χ²(${komma(g.df, 0)}) = ${komma(g.D)}, p ${pWert(g.p)}`;

/** Die wählbaren Zeiteinheiten der Karte. Sie stehen im Satz als eigenes Wort („Zeiteinheit: Tage“), nie hinter einer Zahl - so stimmt der Satz in jeder Sprache. */
export const ZEITEINHEITEN = ['tage', 'wochen', 'monate', 'jahre'] as const;
export type Zeiteinheit = (typeof ZEITEINHEITEN)[number];
export const zeiteinheitId = (x: string): Zeiteinheit | null => ((ZEITEINHEITEN as readonly string[]).includes(x) ? (x as Zeiteinheit) : null);
/** Das Wort der Einheit (Mehrzahl, Grundform). */
export const zeiteinheitWort = (e: Zeiteinheit): string => (e === 'tage' ? L('Tage', 'days') : e === 'wochen' ? L('Wochen', 'weeks') : e === 'monate' ? L('Monate', 'months') : L('Jahre', 'years'));
/** Die Zeiteinheit zum Anzeigen: das Wort der gewählten Einheit; ein anderer Text (aus der Programmierschnittstelle oder einem alten Projekt) steht, wie er ist; leer = nichts. */
export const einheitText = (einheit: string) => { const id = zeiteinheitId(einheit); return id ? zeiteinheitWort(id) : einheit.trim(); };

/** Das Intervall als Text: „0 bis unter 100“ und für das offene letzte „1000 und mehr“. */
export const intervallText = (z: TafelZeile) => (z.breite === null ? L(`${zahlT(z.anfang)} und mehr`, `${zahlT(z.anfang)} and more`) : L(`${zahlT(z.anfang)} bis unter ${zahlT(z.anfang + z.breite)}`, `${zahlT(z.anfang)} to under ${zahlT(z.anfang + z.breite)}`));

/** Das Ende des letzten Intervalls vor dem Zeitpunkt, an dem die Tafel erzählt wird: das Intervall, in dem der Median liegt, sonst die Mitte der Tafel. */
function erzaehlZeile(e: TafelErgebnis): TafelZeile | null {
  const zs = e.zeilen.filter(z => z.breite !== null);
  if (!zs.length) return null;
  if (e.median.erreicht && e.median.wert !== null) { const i = zs.findIndex(z => e.median.wert! < z.anfang + z.breite!); if (i >= 0) return zs[i]!; }
  return zs[Math.floor((zs.length - 1) / 2)]!;
}

/** Hauptsatz: Sterbetafel, Breite der Intervalle mit Einheit, n, Ereignisse, ein Wert zum Anschauen und der Median (oder „nicht erreicht“). */
export function sterbetafelHauptsatz(e: TafelErgebnis, opt: { breite: number; einheit: string }): string {
  const einheit = einheitText(opt.einheit), b = zahlT(opt.breite), z = erzaehlZeile(e);
  if (einheit && !zeiteinheitId(opt.einheit)) return hauptsatzMitText(e, b, einheit, z);   // freier Text der Einheit: er steht hinter der Zahl, wie eingegeben
  const einh = einheit ? L(`Zeiteinheit: ${einheit}; `, `time unit: ${einheit}; `) : '';
  const kopfN = L(`Für die Zeit bis zum Ereignis wurde eine Sterbetafel mit Intervallen der Breite ${b} gerechnet (${einh}n = ${e.n}; ${ereignisseT(e.ereignisse)}, ${e.zensiert} zensiert).`,
    `A life table with intervals of width ${b} was calculated for the time to the event (${einh}n = ${e.n}; ${ereignisseT(e.ereignisse)}, ${e.zensiert} censored).`);
  const rateN = z ? L(` Zum Zeitpunkt ${zahlT(z.anfang + z.breite!)} hatten noch ${prozent(z.kum)} das Ereignis nicht erlebt (Standardfehler ${komma(z.seKum * 100, 1)} Prozentpunkte).`,
    ` At time ${zahlT(z.anfang + z.breite!)}, ${prozent(z.kum)} had still not experienced the event (standard error ${komma(z.seKum * 100, 1)} percentage points).`) : '';
  return kopfN + rateN + medianSatz(e, e.median.erreicht && e.median.wert !== null ? L(` Die mittlere Zeit bis zum Ereignis (Median) lag aus der Tafel bei ${medT(e.median.wert!)}.`, ` The median time to the event from the table was ${medT(e.median.wert!)}.`) : '');
}

/** Der Median-Teil des Hauptsatzes: der Satz mit der Zahl (schon gebaut) oder, wenn der Median nicht angebbar ist, der feste Satz dazu. */
function medianSatz(e: TafelErgebnis, mitZahl: string): string {
  return e.median.erreicht && e.median.wert !== null ? mitZahl
    : e.median.imOffenen
      ? L(' Der Median fällt in das offene letzte Intervall und ist aus der Tafel nicht angebbar.', ' The median falls in the open last interval and cannot be given from the table.')
      : L(' Der Anteil ohne Ereignis bleibt über 50 %: Der Median ist nicht erreicht.', ' The proportion without the event stays above 50%: the median is not reached.');
}

/** Hauptsatz mit einem freien Text als Einheit (nur über die Programmierschnittstelle und in alten Projekten): der Text steht hinter der Zahl. */
function hauptsatzMitText(e: TafelErgebnis, b: string, einheit: string, z: TafelZeile | null): string {
  const kopf = L(`Für die Zeit bis zum Ereignis wurde eine Sterbetafel mit Intervallen von ${b} ${einheit} gerechnet (n = ${e.n}; ${ereignisseT(e.ereignisse)}, ${e.zensiert} zensiert).`,
    `A life table with intervals of ${b} ${einheit} was calculated for the time to the event (n = ${e.n}; ${ereignisseT(e.ereignisse)}, ${e.zensiert} censored).`);
  const rate = z ? L(` Nach ${zahlT(z.anfang + z.breite!)} ${einheit} hatten noch ${prozent(z.kum)} das Ereignis nicht erlebt (Standardfehler ${komma(z.seKum * 100, 1)} Prozentpunkte).`,
    ` After ${zahlT(z.anfang + z.breite!)} ${einheit}, ${prozent(z.kum)} had still not experienced the event (standard error ${komma(z.seKum * 100, 1)} percentage points).`) : '';
  const median = e.median.erreicht && e.median.wert !== null
    ? L(` Die mittlere Zeit bis zum Ereignis (Median) lag aus der Tafel bei ${medT(e.median.wert)} ${einheit}.`, ` The median time to the event from the table was ${medT(e.median.wert)} ${einheit}.`)
    : medianSatz(e, '');
  return kopf + rate + median;
}

/** Testsatz: Wilcoxon (Gehan), näherungsweise (die Zeit wird durch den Anfang des Intervalls ersetzt). */
export function sterbetafelTestSatz(g: { D: number; df: number; p: number }): string {
  return g.p < 0.05
    ? L(`Die Gruppen unterscheiden sich im Test nach Wilcoxon (Gehan): ${chi(g)}.`, `The groups differ in the Wilcoxon (Gehan) test: ${chi(g)}.`)
    : L(`Einen Unterschied zwischen den Gruppen belegt der Test nach Wilcoxon (Gehan) nicht: ${chi(g)} - das heißt nicht, dass es keinen gibt.`, `The Wilcoxon (Gehan) test does not show a difference between the groups: ${chi(g)} - that does not mean there is none.`);
}

/** Fußsatz: Gehan gewichtet frühe Ereignisse stärker; den Test vor dem Blick auf die Daten wählen. */
export function sterbetafelFuss(): string {
  return d('Der Test nach Gehan gibt frühen Ereignissen mehr Gewicht als der Log-Rank-Test. Ob du ihn oder den Log-Rank-Test verwendest, entscheide vor dem Blick auf die Daten.',
    'Der Test nach Gehan gibt frühen Ereignissen mehr Gewicht als der Log-Rank-Test. Ob Sie ihn oder den Log-Rank-Test verwenden, entscheiden Sie vor dem Blick auf die Daten.',
    'The Gehan test gives early events more weight than the log-rank test. Decide whether to use it or the log-rank test before looking at the data.')
    + ' ' + L('Statable rechnet den Test nach Gehan ungefähr: Jede Zeit zählt als Anfang ihres Intervalls (in SPSS: /CALCULATE=APPROXIMATE, dort gleich). Ohne diese Angabe rechnet SPSS exakt; darum können die Zahlen abweichen (Beispiel lung nach Geschlecht: hier 13,528, SPSS exakt 12,777).',
      'Statable computes the Gehan test approximately: each time counts as the start of its interval (in SPSS: /CALCULATE=APPROXIMATE, which gives the same). Without this option SPSS computes it exactly, so the numbers can differ (example lung by sex: here 13.528, SPSS exact 12.777).');
}

/** Satz zum Unterschied zur Kaplan-Meier-Kurve (Sterbetafel zählt Ausgeschiedene halb). */
export function sterbetafelVergleichSatz(): string {
  return L('Die Sterbetafel zählt Ausgeschiedene im Intervall halb; deshalb weichen ihre Werte etwas von der Kaplan-Meier-Kurve ab. Bei engen Intervallen und wenigen Ausgeschiedenen sind beide fast gleich.',
    'The life table counts people who drop out within an interval as half; its values therefore differ somewhat from the Kaplan-Meier curve. With narrow intervals and few dropouts the two are almost the same.');
}

/* ------------------------------------------------------------ Hinweise */

export interface SterbeHinweis { art: 'hinweis' | 'info'; text: string; klein?: string }
/** Schwellen (⚠ von der Fachperson abzunehmen): Gruppe unter 5 Fällen, gesamt unter 20, mehr als 30 % ausgeschieden, Zensierungsanteile um mehr als 20 Prozentpunkte verschieden. */
export const STERBE_KLEIN_GRUPPE = 5, STERBE_KLEIN_GESAMT = 20, STERBE_AUSGESCHIEDEN = 0.3, STERBE_ZENS_UNTERSCHIED = 0.2;

export function sterbetafelHinweise(a: SterbetafelAnzeige): SterbeHinweis[] {
  const h: SterbeHinweis[] = [];
  const g = a.gesamt;
  h.push({ art: 'info', text: L('Die Sterbetafel ist kein Kaplan-Meier', 'The life table is not a Kaplan-Meier estimate'), klein: sterbetafelVergleichSatz() });
  if (a.aufgerundet) h.push({ art: 'hinweis', text: L(`Das Ende der Intervalle liegt bei ${zahlT(a.ende)}`, `The intervals end at ${zahlT(a.ende)}`), klein: L('Das gewählte Ende war kein Vielfaches der Breite und wurde aufgerundet; die Breite bleibt, wie gewählt.', 'The chosen end was not a multiple of the width and was rounded up; the width stays as chosen.') });
  if (a.ausgeschlossen > 0) h.push({ art: 'info', text: Lp(a.ausgeschlossen, `${a.ausgeschlossen} Zeile ohne gültige Zeit oder ohne Angabe zum Ereignis wurde ausgelassen`, `${a.ausgeschlossen} Zeilen ohne gültige Zeit oder ohne Angabe zum Ereignis wurden ausgelassen`, `${a.ausgeschlossen} row without a valid time or an entry for the event was left out`, `${a.ausgeschlossen} rows without a valid time or an entry for the event were left out`) });
  if (g.n < STERBE_KLEIN_GESAMT) h.push({ art: 'hinweis', text: L(`Wenige Fälle: n = ${g.n}`, `Few cases: n = ${g.n}`), klein: L('Mit weniger als 20 Fällen ist eine Sterbetafel sehr unsicher.', 'With fewer than 20 cases a life table is very uncertain.') });
  const klein = a.gruppen.filter(x => x.tafel && x.tafel.n < STERBE_KLEIN_GRUPPE);
  if (klein.length) h.push({ art: 'hinweis', text: (() => { const wer = klein.length === 1 ? ` (${klein[0]!.name})` : ''; return Lp(klein.length, `Sehr kleine Gruppe${wer}: weniger als 5 Fälle`, `Sehr kleine Gruppen${wer}: weniger als 5 Fälle`, `Very small group${wer}: fewer than 5 cases`, `Very small groups${wer}: fewer than 5 cases`); })() });
  if (g.zensiert / g.n > STERBE_AUSGESCHIEDEN) h.push({ art: 'hinweis', text: L(`Mehr als 30 % scheiden im Lauf der Beobachtung aus (${prozent(g.zensiert / g.n, 0)})`, `More than 30% drop out during follow-up (${prozent(g.zensiert / g.n, 0)})`),
    klein: L('Die Tafel zählt Ausgeschiedene im Intervall halb. Das stimmt nur, wenn sie gleichmäßig über das Intervall ausscheiden; scheiden viele am Anfang oder am Ende aus, ist die Tafel verzerrt. Engere Intervalle helfen.', 'The table counts people who drop out within an interval as half. That is right only if they drop out evenly across the interval; if many drop out at the start or the end, the table is biased. Narrower intervals help.') });
  const ohneM = [g, ...a.gruppen.map(x => x.tafel).filter((x): x is TafelErgebnis => !!x)].filter(x => !x.median.erreicht);
  if (ohneM.length) h.push({ art: 'info', text: L('Median aus der Tafel nicht angebbar', 'Median cannot be given from the table'), klein: d('Der Anteil ohne Ereignis fällt innerhalb der Tafel nicht unter 50 % (oder erst im offenen letzten Intervall). Nutze die Anteile zu festen Zeitpunkten.', 'Der Anteil ohne Ereignis fällt innerhalb der Tafel nicht unter 50 % (oder erst im offenen letzten Intervall). Nutzen Sie die Anteile zu festen Zeitpunkten.', 'The proportion without the event does not fall below 50% within the table (or only in the open last interval). Use the proportions at fixed times.') });
  if (a.gehan && a.gruppen.length >= 2) {
    const anteile = a.gruppen.filter(x => x.tafel).map(x => x.tafel!.zensiert / x.tafel!.n);
    if (anteile.length >= 2 && Math.max(...anteile) - Math.min(...anteile) > STERBE_ZENS_UNTERSCHIED)
      h.push({ art: 'hinweis', text: L(`Die Gruppen sind sehr verschieden zensiert (${prozent(Math.min(...anteile), 0)} bis ${prozent(Math.max(...anteile), 0)})`, `The groups are censored very differently (${prozent(Math.min(...anteile), 0)} to ${prozent(Math.max(...anteile), 0)})`),
        klein: L('Der Test nach Gehan hängt vom Muster der Zensierung ab. Bei sehr verschiedener Zensierung ist der Log-Rank-Test in der Karte die sicherere Wahl.', 'The Gehan test depends on the pattern of censoring. With very different censoring, the log-rank test in the card is the safer choice.') });
  }
  h.push({ art: 'info', text: L('Das letzte Intervall ist offen', 'The last interval is open'), klein: L('Es reicht bis zur längsten Zeit; für das offene Intervall gibt es keine Dichte und keine Ausfallrate.', 'It reaches to the longest time; the open interval has no density and no hazard.') });
  return h;
}

/* ------------------------------------------------------------ Sätze der Karte */

export interface SterbeSaetze { haupt: string; zusatz: string; vorsicht: string; apa: string }
export function saetzeSterbetafel(a: SterbetafelAnzeige): SterbeSaetze {
  const opt = { breite: a.breite, einheit: a.einheit };
  const mitG = a.gruppen.length >= 2;
  const einzel = mitG ? a.gruppen.filter(x => x.tafel).map(x => { const m = x.tafel!.median; return m.erreicht && m.wert !== null ? L(`${x.name}: ${medT(m.wert)}`, `${x.name}: ${medT(m.wert)}`) : L(`${x.name}: nicht erreicht`, `${x.name}: not reached`); }) : [];
  const haupt = sterbetafelHauptsatz(a.gesamt, opt) + (mitG && einzel.length ? L(` Median je Gruppe: ${einzel.join('; ')}.`, ` Median by group: ${einzel.join('; ')}.`) : '');
  const paar = a.paarweise.length ? L(' Paarweise Vergleiche (Wilcoxon-Gehan, Holm-Korrektur) stehen in der Tabelle.', ' Pairwise comparisons (Wilcoxon-Gehan, Holm correction) are in the table.') : '';
  const zusatz = (a.gehan ? sterbetafelTestSatz(a.gehan) + paar : '');
  const vorsicht = [sterbetafelVergleichSatz(), a.gehan ? sterbetafelFuss() : '', L('Mehrere Ereignisarten (konkurrierende Risiken) überschätzt die Tafel, wie die Kaplan-Meier-Kurve.', 'Several kinds of events (competing risks) are overestimated by the table, as by the Kaplan-Meier curve.')].filter(Boolean).join(' ');
  const apa = a.gehan
    ? L(`Sterbetafel (Intervalle ${zahlT(a.breite)}): Wilcoxon (Gehan) ${chi(a.gehan)}; n = ${a.gesamt.n}, ${ereignisseT(a.gesamt.ereignisse)}`, `Life table (intervals ${zahlT(a.breite)}): Wilcoxon (Gehan) ${chi(a.gehan)}; n = ${a.gesamt.n}, ${ereignisseT(a.gesamt.ereignisse)}`)
    : L(`Sterbetafel (Intervalle ${zahlT(a.breite)}): ${a.gesamt.median.erreicht && a.gesamt.median.wert !== null ? `Mdn = ${medT(a.gesamt.median.wert)}` : 'Mdn: -'}; n = ${a.gesamt.n}, ${ereignisseT(a.gesamt.ereignisse)}`, `Life table (intervals ${zahlT(a.breite)}): ${a.gesamt.median.erreicht && a.gesamt.median.wert !== null ? `Mdn = ${medT(a.gesamt.median.wert)}` : 'Mdn: -'}; n = ${a.gesamt.n}, ${ereignisseT(a.gesamt.ereignisse)}`);
  return { haupt, zusatz, vorsicht, apa };
}

/* ------------------------------------------------------------ Tabellen */

const fz = (v: number | null, st: number): Z => (v === null || !Number.isFinite(v) ? '-' : fo(v, st));
function tafelTabelle(titel: string, t: TafelErgebnis, einheit: string): TableItem {
  const einheitTeil = einheitText(einheit) ? L(`Zeiteinheit: ${einheitText(einheit)}. `, `Time unit: ${einheitText(einheit)}. `) : '';
  const rows = t.zeilen.map(z => [intervallText(z), fd(z.amAnfang), fd(z.ausgeschieden), fd(z.ereignisse), fx(z.risiko, 1), fo(z.q, 3), fo(z.kum, 3), fo(z.seKum, 3), fz(z.dichte, 5), fz(z.seDichte, 5), fz(z.hazard, 5), fz(z.seHazard, 5)] as Z[]);
  return tabelle('Life Table', titel,
    [T('Intervall', 'Interval'), T('Am Anfang dabei', 'Entering'), T('Ausgeschieden', 'Withdrawn'), T('Ereignisse', 'Events'), T('Dem Risiko ausgesetzt', 'Exposed to risk'), T('Anteil mit Ereignis', 'Proportion with event'),
      T('Kumuliert ohne Ereignis', 'Cumulative without event'), T('SE (kumuliert)', 'SE (cumulative)'), T('Dichte', 'Density'), T('SE (Dichte)', 'SE (density)'), T('Ausfallrate (Hazard)', 'Hazard rate'), T('SE (Ausfallrate)', 'SE (hazard rate)')],
    rows,
    [T(`${einheitTeil}Ausgeschiedene zählen im Intervall halb (dem Risiko ausgesetzt = am Anfang dabei − Ausgeschiedene / 2). Das letzte Intervall ist offen: Dichte und Ausfallrate gibt es dort nicht. Standardfehler nach Greenwood; Dichte und Ausfallrate nach IBM SPSS Statistics Algorithms (SURVIVAL), Dichte-Standardfehler mit dem Anteil am Anfang des Intervalls.`,
      `${einheitTeil}People who drop out count as half within the interval (exposed to risk = entering − withdrawn / 2). The last interval is open: it has no density and no hazard rate. Standard errors by Greenwood; density and hazard rate after IBM SPSS Statistics Algorithms (SURVIVAL), the standard error of the density uses the proportion at the start of the interval.`)]);
}

export function tabellenSterbetafel(a: SterbetafelAnzeige, name: (n: string) => string = x => x): TableItem[] {
  const mitG = a.gruppen.length >= 2;
  const aus: TableItem[] = [tafelTabelle(mitG ? T('Sterbetafel, alle Fälle', 'Life table, all cases') : T('Sterbetafel', 'Life table'), a.gesamt, a.einheit)];
  if (mitG) for (const g of a.gruppen) if (g.tafel) aus.push(tafelTabelle(`${T('Sterbetafel', 'Life table')}: ${name(a.gruppe)} = ${g.name}`, g.tafel, a.einheit));
  const med = (g: SterbetafelGruppe | { name: string; tafel: TafelErgebnis }): Z[] => { const t = g.tafel; return [g.name, t ? fd(t.n) : '-', t ? fd(t.ereignisse) : '-', t ? fd(t.zensiert) : '-', t && t.median.erreicht && t.median.wert !== null ? fx(t.median.wert, 1) : T('nicht erreicht', 'not reached')]; };
  aus.push(tabelle('Life Table Median', T('Sterbetafel: Median', 'Life table: median'), [mitG ? T('Gruppe', 'Group') : '', 'n', T('Ereignisse', 'Events'), T('Zensiert', 'Censored'), T('Median aus der Tafel', 'Median from the table')],
    [...(mitG ? a.gruppen.map(g => med(g)) : []), med({ name: mitG ? T('Gesamt', 'Total') : T('Alle', 'All'), tafel: a.gesamt })],
    [T('Median = Anfang des Intervalls + Breite · (Anteil am Anfang − 0,5) / (Anteil am Anfang − Anteil am Ende) in dem Intervall, in dem der kumulierte Anteil unter 50 % fällt. Der Kaplan-Meier-Median steht in der Tabelle der Karte.', 'Median = start of the interval + width · (proportion at the start − 0.5) / (proportion at the start − proportion at the end) in the interval where the cumulative proportion falls below 50%. The Kaplan-Meier median is in the card\'s table.')]));
  if (a.gehan) {
    const gz = (x: GehanErgebnis, bez: string): Z[] => [bez, fx(x.D, 2), fd(x.df), fp(x.p)];
    aus.push(tabelle('Wilcoxon Gehan', T('Wilcoxon (Gehan), näherungsweise', 'Wilcoxon (Gehan), approximate'), [T('Vergleich', 'Comparison'), 'χ²', 'df', a.paarweise.length ? 'p (Holm)' : 'p'],
      [gz(a.gehan, T('Alle Gruppen', 'All groups')), ...a.paarweise.map(p => [p.name, fx(p.D, 2), fd(p.df), fp(p.pHolm)] as Z[])],
      [T('Die Zeit jedes Falls wird durch den Anfang seines Intervalls ersetzt (wie SPSS „approximativ“); bei gleicher Zeit gilt „Ereignis kürzer als zensiert“. In der Zeile „Alle Gruppen“ ist p nicht korrigiert (ein einzelner Test), in den Zeilen der Paare steht p mit Holm-Korrektur.', 'The time of each case is replaced by the start of its interval (as SPSS "approximate"); with tied times "event shorter than censored" applies. In the row "All groups" p is not corrected (a single test), in the rows for pairs p is Holm-corrected.')]));
  }
  return aus;
}

/** Der Satz, wenn die Sterbetafel nicht gerechnet werden kann (nie ein Absturz, nie NaN). */
export function sterbetafelFehlerSatz(c: SterbetafelFehler['fehler']): string {
  switch (c) {
    case 'breite': return d('Die Breite der Intervalle muss eine Zahl größer als 0 sein. Lass das Feld leer, dann wählt Statable eine Breite.', 'Die Breite der Intervalle muss eine Zahl größer als 0 sein. Lassen Sie das Feld leer, dann wählt Statable eine Breite.', 'The width of the intervals must be a number greater than 0. Leave the field empty and Statable chooses a width.');
    case 'zu-wenige-intervalle': return d('Die Tafel braucht mindestens zwei Intervalle. Die Breite ist größer als die längste Zeit, oder das Ende ist 0. Wähle eine kleinere Breite.', 'Die Tafel braucht mindestens zwei Intervalle. Die Breite ist größer als die längste Zeit, oder das Ende ist 0. Wählen Sie eine kleinere Breite.', 'The table needs at least two intervals. The width is larger than the longest time, or the end is 0. Choose a smaller width.');
    case 'zu-viele-intervalle': return d('Mehr als 50 Intervalle sind zu viele für eine Sterbetafel. Wähle eine größere Breite.', 'Mehr als 50 Intervalle sind zu viele für eine Sterbetafel. Wählen Sie eine größere Breite.', 'More than 50 intervals are too many for a life table. Choose a larger width.');
    case 'anfaenge': return L('Die Anfänge der Intervalle sind nicht in Ordnung: Sie müssen bei 0 beginnen und aufsteigen.', 'The starts of the intervals are not valid: they must begin at 0 and increase.');
    case 'keine-faelle': return L('Keine Zeile hat zugleich eine gültige Zeit und eine Angabe zum Ereignis.', 'No row has both a valid time and an entry for the event.');
    case 'kein-ereignis': return d('Bei niemandem tritt das Ereignis ein. Ohne Ereignis gibt es keine Sterbetafel. Schalte um, welcher Wert das Ereignis ist, wenn die Zuordnung nicht stimmt.', 'Bei niemandem tritt das Ereignis ein. Ohne Ereignis gibt es keine Sterbetafel. Schalten Sie um, welcher Wert das Ereignis ist, wenn die Zuordnung nicht stimmt.', 'The event occurs for nobody. Without an event there is no life table. Switch which value is the event if the assignment is wrong.');
    case 'alle-zeiten-gleich': return L('Alle Zeiten sind gleich. Dann lässt sich keine Sterbetafel rechnen.', 'All times are equal. A life table cannot be calculated then.');
  }
}
