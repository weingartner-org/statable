/**
 * Sätze und Tabellen zu „Offene Antworten ordnen“ (Welle 4, G7). Das Ergebnis BESCHREIBT die vorliegenden Antworten: kein Test, kein p-Wert,
 * keine Verallgemeinerung. Die Tabellen sind echte Tabellen (TableItem) wie alle anderen: Blatt, Bericht, Word, PDF und Excel zeigen sie gleich.
 * Prozentbasis: Personen mit zugeordneter Antwort; bei Mehrfachzuordnung zusätzlich Prozent der Nennungen (beide beschriftet).
 */
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { komma, type Saetze } from './ergebnis';
import { zitat } from '../i18n/profil';
import { tabelle, fd, fx, type Z } from './mwsaetze';
import type { KatAnzeige } from './kategorienblatt';
import type { KatHaeufigkeit } from './kategorisieren';

/** „n Personen ohne Antwort, m Antworten noch offen“ - als Zähler im Blatt und Fußnote der Tabelle. */
export const fehlendSatz = (h: Pick<KatHaeufigkeit, 'nLeer' | 'nOffen'>): string =>
  `${Lp(h.nLeer, `${h.nLeer} Person ohne Antwort`, `${h.nLeer} Personen ohne Antwort`, `${h.nLeer} person without an answer`, `${h.nLeer} people without an answer`)}, ${Lp(h.nOffen, `${h.nOffen} Antwort noch offen`, `${h.nOffen} Antworten noch offen`, `${h.nOffen} answer still open`, `${h.nOffen} answers still open`)}`;
/** Woran sich die Prozente messen - ein ganzer Satz je Fall (Einzahl und Mehrzahl getrennt). */
export const basisSatz = (h: Pick<KatHaeufigkeit, 'modus' | 'nZugeordnet' | 'nNennungen'>): string => {
  const n = h.nZugeordnet;
  const personen = Lp(n, `Die Prozente der Personen beziehen sich auf die ${n} Person mit zugeordneter Antwort.`, `Die Prozente der Personen beziehen sich auf die ${n} Personen mit zugeordneter Antwort.`,
    `The percentages of people refer to the ${n} person with an assigned answer.`, `The percentages of people refer to the ${n} people with an assigned answer.`);
  return h.modus === 'mehrfach'
    ? `${personen} ${Lp(h.nNennungen, `Die Prozente der Nennungen beziehen sich auf die ${h.nNennungen} Zuordnung.`, `Die Prozente der Nennungen beziehen sich auf alle ${h.nNennungen} Zuordnungen.`, `The percentages of mentions refer to the ${h.nNennungen} assignment.`, `The percentages of mentions refer to all ${h.nNennungen} assignments.`)}`
    : personen;
};
/** Satz zur Summe über 100 % (nur bei Mehrfachzuordnung, wenn sie wirklich darüber liegt). */
export const summeSatz = (h: Pick<KatHaeufigkeit, 'modus' | 'summePersonenProzent'>): string =>
  h.modus === 'mehrfach' && h.summePersonenProzent > 100.0001
    ? L(`Eine Antwort kann mehreren Kategorien angehören: Die Prozente der Personen ergeben zusammen ${komma(h.summePersonenProzent, 1)} %, also mehr als 100 %.`, `An answer can belong to several categories: the percentages of people add up to ${komma(h.summePersonenProzent, 1)}%, that is more than 100%.`)
    : '';

export function saetzeKategorien(e: KatAnzeige): Saetze {
  const h = e.h, mitText = h.nZeilen - h.nLeer;
  const top = h.kategorien.reduce<KatHaeufigkeit['kategorien'][number] | null>((a, k) => (k.n > (a?.n ?? 0) ? k : a), null);
  const zugeordnet = Lp(mitText, `Zugeordnet ist ${h.nZugeordnet} von ${mitText} Antwort mit Text.`, `Zugeordnet sind ${h.nZugeordnet} von ${mitText} Antworten mit Text.`, `${h.nZugeordnet} of ${mitText} answer with text is assigned.`, `${h.nZugeordnet} of ${mitText} answers with text are assigned.`);
  const haeufig = top ? ' ' + Lp(top.n, `Am häufigsten: ${zitat(top.name)} (${top.n} Antwort, ${komma(top.prozentPersonen, 1)} % der Personen).`, `Am häufigsten: ${zitat(top.name)} (${top.n} Antworten, ${komma(top.prozentPersonen, 1)} % der Personen).`,
    `Most frequent: ${zitat(top.name)} (${top.n} answer, ${komma(top.prozentPersonen, 1)}% of people).`, `Most frequent: ${zitat(top.name)} (${top.n} answers, ${komma(top.prozentPersonen, 1)}% of people).`) : '';
  const haupt = h.nZugeordnet ? zugeordnet + haeufig : L('Noch keine Antwort ist einer Kategorie zugeordnet.', 'No answer is assigned to a category yet.');
  const zusatz = [
    h.nZugeordnet ? basisSatz(h) + (summeSatz(h) ? ' ' + summeSatz(h) : '') : '',
    fehlendSatz(h) + '.',
    L('Die Tabelle beschreibt diese Antworten. Sie prüft nichts und lässt sich nicht auf andere Personen übertragen.', 'The table describes these answers. It tests nothing and cannot be generalized to other people.')
  ].filter(Boolean).join('\n');
  const vorsicht = h.nOffen > 0
    ? Lp(h.nOffen, `${h.nOffen} Antwort ist noch nicht zugeordnet und fehlt in der Tabelle.`, `${h.nOffen} Antworten sind noch nicht zugeordnet und fehlen in der Tabelle.`, `${h.nOffen} answer is not assigned yet and is missing from the table.`, `${h.nOffen} answers are not assigned yet and are missing from the table.`)
    : '';
  return { haupt, zusatz, vorsicht, apa: '', marken: [] };
}

/** Häufigkeiten je Kategorie als Tabelle (beide Prozentbasen beschriftet). */
export function haeufigkeitsTabelle(h: KatHaeufigkeit, titel: string, label = 'Open Answers Frequencies'): TableItem {
  const mehr = h.modus === 'mehrfach';
  const kopf = mehr
    ? [L('Kategorie', 'Category'), 'n', L(`% der Personen (Basis ${h.nZugeordnet})`, `% of people (base ${h.nZugeordnet})`), L(`% der Nennungen (Basis ${h.nNennungen})`, `% of mentions (base ${h.nNennungen})`)]
    : [L('Kategorie', 'Category'), L('Code', 'Code'), 'n', L(`% der Personen (Basis ${h.nZugeordnet})`, `% of people (base ${h.nZugeordnet})`)];
  const zeilen: Z[][] = h.kategorien.map(k => (mehr ? [k.name, fd(k.n), fx(k.prozentPersonen, 1), fx(k.prozentNennungen, 1)] : [k.name, fd(k.code), fd(k.n), fx(k.prozentPersonen, 1)]));
  zeilen.push(mehr ? [L('Nennungen zusammen', 'Mentions in total'), fd(h.nNennungen), fx(h.summePersonenProzent, 1), fx(h.nNennungen ? 100 : 0, 1)] : [L('Zusammen', 'Total'), '', fd(h.nZugeordnet), fx(h.nZugeordnet ? 100 : 0, 1)]);
  const fuss = [fehlendSatz(h) + '.', h.nZugeordnet ? basisSatz(h) : '', summeSatz(h)].filter(Boolean);
  return tabelle(label, titel, kopf, zeilen, fuss);
}
/** Kodierleitfaden: Code, Kategorie, Kurzbeschreibung, Ankerbeispiel (nur wenn etwas davon ausgefüllt ist). */
export function leitfadenTabelle(e: KatAnzeige): TableItem | null {
  if (!e.leitfaden.some(k => k.beschreibung.trim() || k.beispiel.trim())) return null;
  const t = tabelle('Open Answers Coding Guide', L('Kodierleitfaden', 'Coding guide'), [L('Code', 'Code'), L('Kategorie', 'Category'), L('Kurzbeschreibung', 'Short description'), L('Ankerbeispiel', 'Anchor example')],
    e.leitfaden.map((k, i) => [String(i + 1), k.name, k.beschreibung, k.beispiel]));
  for (const c of t.cells) c.a = 'l';   // lange Texte linksbündig
  return t;
}
export function tabellenKategorien(e: KatAnzeige): TableItem[] {
  const leit = leitfadenTabelle(e);
  return [
    haeufigkeitsTabelle(e.h, e.h2 ? L('Häufigkeiten (erste Kodierung)', 'Frequencies (first coding)') : L('Häufigkeiten der Kategorien', 'Frequencies of the categories')),
    ...(e.h2 ? [haeufigkeitsTabelle(e.h2, L('Häufigkeiten (zweite Kodierung)', 'Frequencies (second coding)'), 'Open Answers Frequencies (second coding)')] : []),
    ...(leit ? [leit] : [])
  ];
}
