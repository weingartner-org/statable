/**
 * Sätze, APA-Zeile, Hinweise und Tabellen zu Mehrfachantworten (Zahlen: mehrfach.ts).
 * Die Tabellen sind echte Tabellen (TableItem) und werden bei jedem Aufruf neu gebaut, sie folgen so der Sprache.
 * ⚠ Satzvorlagen, die Faustregel „weniger als 30 Fälle“ und der Verzicht auf einen Test sind von der Statistik-Fachperson abzunehmen.
 * Warum kein χ²: Die Ankreuzungen einer Person sind nicht unabhängig, darum passt der gewöhnliche Chi-Quadrat-Test nicht;
 * geeignet sind Verfahren für „marginale Unabhängigkeit“ mit Mehrfachantworten (Agresti & Liu 1999, Biometrics 55; Bilder & Loughin 2004, Biometrics 60: Bootstrap bzw. Rao-Scott).
 * Statable bietet sie nicht an und beschreibt statt dessen die Unterschiede in Prozentpunkten.
 */
import type { Cell, TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { aufzaehlung, proz as prozZeichen, zitat } from '../i18n/profil';
import { komma, kurz, type Saetze, type Verteilung } from './ergebnis';
import { fd, fx, tabelle, type Z } from './mwsaetze';
import { optionenGeordnet, type Mehrfach } from './mehrfach';
import { kleinste, groesste } from './menge';

const T = L;
const q = (x: string) => zitat(kurz(x));
const proz = (v: number, st = 0) => prozZeichen(komma(v * 100, st));
const proz1 = (v: number) => proz(v, 1);
const personen = (n: number) => Lp(n, `${n} Person`, `${n} Personen`, `${n} person`, `${n} people`);
/** Wenige gültige Fälle: darunter meldet Statable einen Hinweis. ⚠ Faustregel, von der Fachperson abzunehmen. */
export const MEHRFACH_WENIG = 30;

export interface MehrfachHinweis { art: 'hinweis' | 'info' | 'ok'; text: string; klein?: string }
/** Hinweise für die Prüfliste vor dem Rechnen und für die Vorsicht im Ergebnis. */
/** Ab diesem Anteil (Personen mit Angabe, aber ohne Ankreuzung) wird auf die Wahl der Basis hingewiesen. ⚠ Faustregel, von der Fachperson abzunehmen. */
export const MEHRFACH_NICHT_ANGEKREUZT = 0.1;
/** Im Standard (nur Ankreuzer zählen): Wie viele haben geantwortet, aber nichts angekreuzt? null, wenn es nichts zu sagen gibt oder der Wert fehlt (älteres Blatt). */
export function basisFrage(m: Mehrfach): { n: number; von: number; stark: boolean } | null {
  if (m.mitNull || !m.nichtAngekreuzt || !m.mitAngabe) return null;
  return { n: m.nichtAngekreuzt, von: m.mitAngabe, stark: m.nichtAngekreuzt / m.mitAngabe > MEHRFACH_NICHT_ANGEKREUZT };
}
/** „13 von 58 Personen haben die Frage beantwortet, aber nichts angekreuzt - Basis ändern?“ */
export function basisFrageText(m: Mehrfach): string {
  const b = basisFrage(m); if (!b) return '';
  return T(`${b.n} von ${b.von} Personen haben die Frage beantwortet, aber nichts angekreuzt. Sie zählen hier nicht mit (wie in SPSS) - Basis ändern?`, `${b.n} of ${b.von} people answered the question but checked nothing. They are not counted here (as in SPSS) - change the base?`);
}
/** Hinweise für die Prüfliste vor dem Rechnen und für die Vorsicht im Ergebnis. */
export function mehrfachHinweise(m: Mehrfach): MehrfachHinweis[] {
  const h: MehrfachHinweis[] = [];
  const bf = basisFrage(m);
  h.push({ art: m.faelle >= MEHRFACH_WENIG ? 'ok' : 'hinweis', text: m.mitNull ? T(`${personen(m.faelle)} mit mindestens einer Angabe`, `${personen(m.faelle)} with at least one answer`) : T(`${personen(m.faelle)} mit mindestens einer Ankreuzung`, `${personen(m.faelle)} who checked at least one option`),
    klein: (m.fehlend > 0 ? Lp(m.fehlend, `${m.fehlend} von ${m.zeilen} Zeilen zählt nicht (${m.mitNull ? L('ohne jede Angabe', 'no answer at all') : L('ohne Ankreuzung oder Angabe', 'no check or no answer')}). `, `${m.fehlend} von ${m.zeilen} Zeilen zählen nicht (${m.mitNull ? L('ohne jede Angabe', 'no answer at all') : L('ohne Ankreuzung oder Angabe', 'no check or no answer')}). `, `${m.fehlend} of ${m.zeilen} rows does not count (${m.mitNull ? L('ohne jede Angabe', 'no answer at all') : L('ohne Ankreuzung oder Angabe', 'no check or no answer')}). `, `${m.fehlend} of ${m.zeilen} rows do not count (${m.mitNull ? L('ohne jede Angabe', 'no answer at all') : L('ohne Ankreuzung oder Angabe', 'no check or no answer')}). `) : '')
      + (m.faelle < MEHRFACH_WENIG ? T('Bei so wenigen Personen sind die Prozente unsicher.', 'With so few people the percentages are uncertain.') : '') });
  if (bf) h.push({ art: bf.stark ? 'hinweis' : 'info', text: basisFrageText(m), klein: T('„Prozent der Fälle“ bezieht sich auf die Personen mit Ankreuzung; mit dem Schalter „Fälle ohne Ankreuzung mitzählen“ auf alle, die geantwortet haben.', '"Percent of cases" refers to people who checked something; with the switch "Include cases without a check" it refers to everyone who answered.') });
  h.push({ art: 'info', text: T('Prozent der Fälle ergeben mehr als 100 %', 'Percentages of cases add up to more than 100%'),
    klein: T('Jede Person konnte mehrere Optionen ankreuzen. „Prozent der Fälle“ bezieht sich auf die Personen, „Prozent der Antworten“ auf alle Ankreuzungen (zusammen 100 %).', 'Each person could check several options. "Percent of cases" refers to people, "percent of responses" to all checks (together 100%).') });
  return h;
}

export function saetzeMehrfach(m: Mehrfach): Saetze {
  const was = q(m.label), geordnet = [...m.optionen].sort((a, b) => b.anzahl - a.anzahl);
  const oben = geordnet.slice(0, 3).filter(o => o.anzahl > 0);
  const faelleTxt = m.mitNull
    ? Lp(m.faelle, `${m.faelle} Person, die die Frage beantwortet hat`, `${m.faelle} Personen, die die Frage beantwortet haben`, `${m.faelle} person who answered the question`, `${m.faelle} people who answered the question`)
    : Lp(m.faelle, `${m.faelle} Person, die mindestens eine Option angekreuzt hat`, `${m.faelle} Personen, die mindestens eine Option angekreuzt haben`, `${m.faelle} person who checked at least one option`, `${m.faelle} people who checked at least one option`);
  const je = m.faelle ? m.antworten / m.faelle : 0;
  const summeFaelle = m.optionen.reduce((a, o) => a + o.proFaelle, 0);
  const ohne = m.ohneAnkreuzung ? Lp(m.ohneAnkreuzung, ` ${personen(m.ohneAnkreuzung)} hat nichts angekreuzt und zählt mit.`, ` ${personen(m.ohneAnkreuzung)} haben nichts angekreuzt und zählen mit.`, ` ${personen(m.ohneAnkreuzung)} checked nothing and is included.`, ` ${personen(m.ohneAnkreuzung)} checked nothing and are included.`) : '';
  const nA = basisFrage(m);
  const fehlt = nA ? T(` ${nA.n} von ${nA.von} Personen, die die Frage beantwortet haben, ${Lp(nA.n, 'hat nichts angekreuzt und zählt', 'haben nichts angekreuzt und zählen', 'checked nothing and is', 'checked nothing and are')} hier nicht mit; ${Lp(m.zeilen - nA.von, `${m.zeilen - nA.von} von ${m.zeilen} Zeilen hat keine Angabe`, `${m.zeilen - nA.von} von ${m.zeilen} Zeilen haben keine Angabe`, `${m.zeilen - nA.von} of ${m.zeilen} rows has no answer`, `${m.zeilen - nA.von} of ${m.zeilen} rows have no answer`)}. Die Basis lässt sich ändern („Fälle ohne Ankreuzung mitzählen“).`, ` ${nA.n} of ${nA.von} people who answered the question ${Lp(nA.n, 'hat nichts angekreuzt und zählt', 'haben nichts angekreuzt und zählen', 'checked nothing and is', 'checked nothing and are')} not counted here; ${Lp(m.zeilen - nA.von, `${m.zeilen - nA.von} von ${m.zeilen} Zeilen hat keine Angabe`, `${m.zeilen - nA.von} von ${m.zeilen} Zeilen haben keine Angabe`, `${m.zeilen - nA.von} of ${m.zeilen} rows has no answer`, `${m.zeilen - nA.von} of ${m.zeilen} rows have no answer`)}. The base can be changed ("Include cases without a check").`)
    : m.fehlend ? Lp(m.fehlend, ` ${m.fehlend} von ${m.zeilen} Zeilen zählt nicht (${m.mitNull ? L('keine Angabe', 'no answer') : L('nichts angekreuzt oder keine Angabe', 'nothing checked or no answer')}).`, ` ${m.fehlend} von ${m.zeilen} Zeilen zählen nicht (${m.mitNull ? L('keine Angabe', 'no answer') : L('nichts angekreuzt oder keine Angabe', 'nothing checked or no answer')}).`, ` ${m.fehlend} of ${m.zeilen} rows does not count (${m.mitNull ? L('keine Angabe', 'no answer') : L('nichts angekreuzt oder keine Angabe', 'nothing checked or no answer')}).`, ` ${m.fehlend} of ${m.zeilen} rows do not count (${m.mitNull ? L('keine Angabe', 'no answer') : L('nichts angekreuzt oder keine Angabe', 'nothing checked or no answer')}).`) : '';
  const basis = T(`Prozent der Fälle summieren sich auf ${proz(summeFaelle)}, weil Mehrfachnennungen möglich waren.`, `Percentages of cases add up to ${proz(summeFaelle)} because several answers were possible.`);
  const g = m.gruppe;
  let haupt: string, zusatz: string;
  if (!g || g.stufen.length < 2) {
    const folgt = oben.slice(1).map(o => T(`${q(o.name)} (${proz(o.proFaelle)})`, `${q(o.name)} (${proz(o.proFaelle)})`));
    haupt = oben.length
      ? T(`Bei ${was} wurde ${q(oben[0]!.name)} am häufigsten genannt: von ${oben[0]!.anzahl} der ${faelleTxt} (${proz(oben[0]!.proFaelle)} der Fälle)${folgt.length ? L(`, dann ${aufzaehlung(folgt)}`, `, followed by ${aufzaehlung(folgt)}`) : ''}.`,
          `For ${was}, ${q(oben[0]!.name)} was named most often: by ${oben[0]!.anzahl} of ${faelleTxt} (${proz(oben[0]!.proFaelle)} of cases)${folgt.length ? L(`, dann ${aufzaehlung(folgt)}`, `, followed by ${aufzaehlung(folgt)}`) : ''}.`)
      : T(`Bei ${was} hat niemand etwas angekreuzt.`, `For ${was}, nobody checked anything.`);
    zusatz = T(`Insgesamt gab es ${m.antworten} Nennungen, im Mittel ${komma(je, 1)} je Person. ${basis}${ohne}${fehlt}`, `There were ${m.antworten} checks in total, ${komma(je, 1)} per person on average. ${basis}${ohne}${fehlt}`);
  } else {
    const spitze = g.stufen.map(st => { const j = st.proFaelle.indexOf(Math.max(groesste(st.proFaelle))); return { st, j, o: m.optionen[j]! }; });
    const gleich = spitze.every(x => x.j === spitze[0]!.j);
    haupt = gleich
      ? T(`In ${g.stufen.length === 2 ? L('beiden', 'both') : L(`allen ${g.stufen.length}`, `all ${g.stufen.length}`)} Gruppen von ${q(g.name)} wurde bei ${was} ${q(spitze[0]!.o.name)} am häufigsten genannt (${aufzaehlung(spitze.map(x => proz(x.st.proFaelle[x.j]!)))} der Fälle).`,
          `In ${g.stufen.length === 2 ? L('beiden', 'both') : L(`allen ${g.stufen.length}`, `all ${g.stufen.length}`)} groups of ${q(g.name)}, ${q(spitze[0]!.o.name)} was named most often for ${was} (${aufzaehlung(spitze.map(x => proz(x.st.proFaelle[x.j]!)))} of cases).`)
      : T(`Am häufigsten genannt wurde bei ${was} ${g.stufen.length <= 4 ? aufzaehlung(spitze.map(x => T(`in der Gruppe ${q(x.st.name)} ${q(x.o.name)} (${proz(x.st.proFaelle[x.j]!)})`, `${q(x.o.name)} in the group ${q(x.st.name)} (${proz(x.st.proFaelle[x.j]!)})`))) : T('je nach Gruppe Verschiedenes', 'different depending on the group')}.`,
          `For ${was}, the most frequent option was ${g.stufen.length <= 4 ? aufzaehlung(spitze.map(x => T(`in der Gruppe ${q(x.st.name)} ${q(x.o.name)} (${proz(x.st.proFaelle[x.j]!)})`, `${q(x.o.name)} in the group ${q(x.st.name)} (${proz(x.st.proFaelle[x.j]!)})`))) : T('je nach Gruppe Verschiedenes', 'different depending on the group')}.`);
    // Größter Unterschied zwischen höchster und niedrigster Gruppe, in Prozentpunkten (nur beschreibend).
    const diffs = m.optionen.map((o, j) => { const w = g.stufen.map(st => st.proFaelle[j]!); const hi = w.indexOf(Math.max(groesste(w))), lo = w.indexOf(Math.min(kleinste(w))); return { o, hi: g.stufen[hi]!, lo: g.stufen[lo]!, d: w[hi]! - w[lo]! }; });
    const gr = diffs.reduce((a, b) => (b.d > a.d ? b : a), diffs[0]!);
    const pp = Math.round(gr.d * 100);
    const unterschied = gr.d > 0
      ? T(` Der größte Unterschied zwischen den Gruppen liegt bei ${q(gr.o.name)}: ${proz(gr.hi.proFaelle[m.optionen.indexOf(gr.o)]!)} der Fälle in der Gruppe ${q(gr.hi.name)} gegen ${proz(gr.lo.proFaelle[m.optionen.indexOf(gr.o)]!)} in der Gruppe ${q(gr.lo.name)} (${pp} Prozentpunkte).`,
          ` The largest difference between the groups is for ${q(gr.o.name)}: ${proz(gr.hi.proFaelle[m.optionen.indexOf(gr.o)]!)} of cases in the group ${q(gr.hi.name)} against ${proz(gr.lo.proFaelle[m.optionen.indexOf(gr.o)]!)} in the group ${q(gr.lo.name)} (${pp} percentage points).`)
      : '';
    const aus = g.ausgelassen ? Lp(g.ausgelassen, ` ${personen(g.ausgelassen)} ohne Angabe zu ${q(g.name)} bleibt in der Kreuztabelle außen vor.`, ` ${personen(g.ausgelassen)} ohne Angabe zu ${q(g.name)} bleiben in der Kreuztabelle außen vor.`, ` ${personen(g.ausgelassen)} without an answer for ${q(g.name)} is left out of the crosstab.`, ` ${personen(g.ausgelassen)} without an answer for ${q(g.name)} are left out of the crosstab.`) : '';
    zusatz = T(`Die Prozente sind Spalten-Prozente: Anteil der Fälle der Gruppe, die die Option genannt haben (Basis: ${g.stufen.map(st => `${st.faelle} in ${q(st.name)}`).join(', ')}).${unterschied} ${basis}${aus}${ohne}${fehlt}`,
      `The percentages are column percentages: the share of cases in the group that named the option (base: ${g.stufen.map(st => `${st.faelle} in ${q(st.name)}`).join(', ')}).${unterschied} ${basis}${aus}${ohne}${fehlt}`);
  }
  const vorsicht = g
    ? T('Die Ankreuzungen derselben Person hängen zusammen; ein gewöhnlicher Chi-Quadrat-Test über die Tabelle passt darum nicht und wird nicht gerechnet. Die Unterschiede sind beschreibend. Ein Zusammenhang ist keine Ursache.', 'The checks of the same person are not independent, so an ordinary chi-square test on the table does not apply and is not calculated. The differences are descriptive. A relationship is not a cause.')
    : T('Die Zahlen beschreiben nur die Personen in diesen Daten. Die Ankreuzungen derselben Person hängen zusammen.', 'The figures describe only the people in these data. The checks of the same person are not independent.');
  const apa = g && g.stufen.length >= 2
    ? `${kurz(m.label, 30)}: ` + g.stufen.map(st => `${st.name} (n = ${st.faelle})`).join(', ') + '; ' + geordnet.slice(0, 6).map(o => `${kurz(o.name, 25)} ` + g.stufen.map(st => proz1(st.proFaelle[m.optionen.indexOf(o)]!)).join(' / ')).join('; ') + (geordnet.length > 6 ? '; …' : '')
    : `${kurz(m.label, 30)}: ` + geordnet.slice(0, 6).map(o => `${kurz(o.name, 25)} n = ${o.anzahl} (${proz1(o.proFaelle)} ${T('der Fälle', 'of cases')})`).join('; ') + (geordnet.length > 6 ? '; …' : '') + `; N = ${m.faelle} ${T('Fälle', 'cases')}, ${m.antworten} ${T('Antworten', 'responses')}`;
  return {
    haupt, zusatz, vorsicht, apa,
    marken: [
      { text: T('Prozent der Fälle', 'Percent of cases'), erklaer: 'prozent-der-faelle' },
      { text: T('Prozent der Antworten', 'Percent of responses'), erklaer: 'prozent-der-antworten' },
      { text: T('Mehrfachantworten-Set', 'Multiple response set'), erklaer: 'mehrfachantworten-set' },
      { text: m.mitNull ? T(`${personen(m.faelle)} mit mindestens einer Angabe`, `${personen(m.faelle)} with at least one answer`) : T(`${personen(m.faelle)} mit mindestens einer Ankreuzung`, `${personen(m.faelle)} who checked at least one option`), erklaer: 'stichprobe', hinweis: m.faelle < MEHRFACH_WENIG }
    ]
  };
}

/** Sätze für ein Verteilungs-Blatt, in dem Mehrfachantworten-Sets stehen (mit oder ohne gewöhnliche Spalten). */
export function saetzeMitMehrfach(e: Verteilung, ohneSets: (e: Verteilung) => Saetze | null): Saetze {
  const ms = (e.mehrfach ?? []).map(saetzeMehrfach);
  const basis = e.zahlen.length || e.gruppen.length ? ohneSets({ ...e, mehrfach: undefined }) : null;
  if (!basis) {
    const [erste, ...rest] = ms;
    return { ...erste!, zusatz: [erste!.zusatz, ...rest.map(x => `${x.haupt} ${x.zusatz}`)].join(' '), apa: ms.map(x => x.apa).join('; ') };
  }
  return { ...basis, zusatz: [basis.zusatz, ...ms.map(x => `${x.haupt} ${x.zusatz}`)].filter(Boolean).join(' '), vorsicht: `${basis.vorsicht} ${ms[0]!.vorsicht}`, apa: [basis.apa, ...ms.map(x => x.apa)].join('; '), marken: [...basis.marken, ...ms[0]!.marken.slice(0, 3)] };
}

/* ------------------------------------------------------------ Tabellen */

export function tabellenMehrfach(m: Mehrfach): TableItem[] {
  const opt = optionenGeordnet(m);
  const fuss = T(`Gültige Fälle: ${m.faelle} von ${m.zeilen}${m.mitNull ? L(' (alle mit mindestens einer Angabe)', ' (all with at least one answer)') : L(' (alle mit mindestens einer Ankreuzung)', ' (all with at least one check)')}. ${basisFrage(m) ? Lp(m.nichtAngekreuzt ?? 0, `${m.nichtAngekreuzt} Person hat geantwortet, aber nichts angekreuzt (nicht gezählt). `, `${m.nichtAngekreuzt} Personen haben geantwortet, aber nichts angekreuzt (nicht gezählt). `, `${m.nichtAngekreuzt} person answered but checked nothing (not counted). `, `${m.nichtAngekreuzt} people answered but checked nothing (not counted). `) : ''}Zählwert: ${m.zaehlText}. Prozent der Fälle summieren sich auf mehr als 100 %, weil Mehrfachnennungen möglich waren. Berechnung wie SPSS MULT RESPONSE (Mehrfachdichotomie).`,
    `Valid cases: ${m.faelle} of ${m.zeilen}${m.mitNull ? L(' (alle mit mindestens einer Angabe)', ' (all with at least one answer)') : L(' (alle mit mindestens einer Ankreuzung)', ' (all with at least one check)')}. ${basisFrage(m) ? Lp(m.nichtAngekreuzt ?? 0, `${m.nichtAngekreuzt} Person hat geantwortet, aber nichts angekreuzt (nicht gezählt). `, `${m.nichtAngekreuzt} Personen haben geantwortet, aber nichts angekreuzt (nicht gezählt). `, `${m.nichtAngekreuzt} person answered but checked nothing (not counted). `, `${m.nichtAngekreuzt} people answered but checked nothing (not counted). `) : ''}Counted value: ${m.zaehlText}. Percentages of cases add up to more than 100% because several answers were possible. Calculated as in SPSS MULT RESPONSE (multiple dichotomy).`);
  const haeuf = tabelle('Multiple Response Frequencies', T(`Häufigkeiten: ${m.label}`, `Frequencies: ${m.label}`),
    [T('Option', 'Option'), T('Anzahl', 'Count'), T('Prozent der Antworten', 'Percent of responses'), T('Prozent der Fälle', 'Percent of cases')],
    [...opt.map(o => [o.name, fd(o.anzahl), fx(o.proAntworten * 100, 1), fx(o.proFaelle * 100, 1)] as Z[]),
      [T('Gesamt', 'Total'), fd(m.antworten), fx(m.antworten ? 100 : 0, 1), fx(m.optionen.reduce((a, o) => a + o.proFaelle, 0) * 100, 1)]], [fuss]);
  const g = m.gruppe;
  if (!g || !g.stufen.length) return [haeuf];
  const idx = (o: { spalte: string }) => m.optionen.findIndex(x => x.spalte === o.spalte);
  const kopf = [T('Option', 'Option'), ...g.stufen.flatMap(() => [T('Anzahl', 'Count'), T('% der Fälle', '% of cases')]), T('Anzahl', 'Count'), T('% der Fälle', '% of cases')];
  const gesamtFaelle = g.stufen.reduce((a, st) => a + st.faelle, 0);
  const kreuz = tabelle('Multiple Response Crosstab', T(`${m.label} nach ${g.name}`, `${m.label} by ${g.name}`), kopf,
    [...opt.map(o => { const j = idx(o); const n = g.stufen.reduce((a, st) => a + st.anzahl[j]!, 0); return [o.name, ...g.stufen.flatMap(st => [fd(st.anzahl[j]!), fx(st.proFaelle[j]! * 100, 1)]), fd(n), fx(gesamtFaelle ? n / gesamtFaelle * 100 : NaN, 1)] as Z[]; }),
      [T('n (Basis)', 'n (base)'), ...g.stufen.flatMap(st => [fd(st.faelle), '']), fd(gesamtFaelle), '']],
    [T(`Spalten-Prozente: Anteil der Fälle der Gruppe, die die Option genannt haben. Ohne Chi-Quadrat-Test, weil die Ankreuzungen einer Person nicht unabhängig sind. ${g.ausgelassen ? Lp(g.ausgelassen, `${g.ausgelassen} Fall ohne Gruppenangabe ausgelassen. `, `${g.ausgelassen} Fälle ohne Gruppenangabe ausgelassen. `, `${g.ausgelassen} case without a group left out. `, `${g.ausgelassen} cases without a group left out. `) : ''}Mehrfachnennungen: die Prozente summieren sich auf mehr als 100 %.`,
      `Column percentages: share of cases in the group that named the option. No chi-square test because the checks of one person are not independent. ${g.ausgelassen ? Lp(g.ausgelassen, `${g.ausgelassen} Fall ohne Gruppenangabe ausgelassen. `, `${g.ausgelassen} Fälle ohne Gruppenangabe ausgelassen. `, `${g.ausgelassen} case without a group left out. `, `${g.ausgelassen} cases without a group left out. `) : ''}Several answers possible: the percentages add up to more than 100%.`)]);
  // Zweizeiliger Kopf (APA): über je zwei Spalten steht die Gruppe mit ihrer Fallzahl, darunter „Anzahl“ und „% der Fälle“ (Abnahme 4, B8).
  const gesamt = g.stufen.reduce((a, st) => a + st.faelle, 0);
  kreuz.cells = kreuz.cells.map(c => ({ ...c, r: c.r + 1 }));
  const kopfZelle = (r: number, c: number, cs: number, t: string): Cell => ({ r, c, rs: 1, cs, h: true, a: c === 0 ? 'l' : 'c', t });
  kreuz.cells.unshift(kopfZelle(0, 0, 1, ''), ...g.stufen.map((st, i) => kopfZelle(0, 1 + 2 * i, 2, `${st.name} (n = ${st.faelle})`)), kopfZelle(0, 1 + 2 * g.stufen.length, 2, `${T('Gesamt', 'Total')} (n = ${gesamt})`));
  kreuz.rows += 1; kreuz.headRows = [2, 0];
  return [kreuz, haeuf];
}
