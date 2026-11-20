/**
 * Sätze und Tabellen zu „Zahlen nach Themen“ (Später, Welle S-D, G12; Rechnen: themenzahlen.ts).
 * Die Tabelle beschreibt nur diese Personen: kein Test, kein p, keine Sternchen. Sätze ganz je Fall (übersetzbar), Zahlenformat nur über zahlDe und das Sprachprofil.
 */
import type { TableItem } from '../engine/types';
import { L, Lp, d } from './sitzung.svelte';
import { zahlDe } from './format';
import { proz, zitat } from '../i18n/profil';
import { tabelle, fd, fx, type Z } from './mwsaetze';
import { KLEIN_N, type Themenzahlen, type ThemenFrage, type ThemenZeile } from './themenzahlen';

const personen = (n: number) => Lp(n, `${n} Person`, `${n} Personen`, `${n} person`, `${n} people`);

/** Die Zeile über der Tabelle: Basis, leer, offen. */
export function basisSatz(t: Themenzahlen): string {
  if (!t.basis) return L('Noch keine Antwort ist einem Thema zugeordnet. Ohne Thema gibt es keine Zahlen nach Themen.', 'No answer is assigned to a topic yet. Without a topic there are no numbers by topic.');
  return L(`Basis: ${personen(t.basis)} mit mindestens einem Thema; ${t.leer} ohne Antwort, ${t.offen} noch nicht zugeordnet.`, `Base: ${personen(t.basis)} with at least one topic; ${t.leer} without an answer, ${t.offen} not yet assigned.`);
}
/** Die Überlappung mit Zahlen („Summe der n: 59, Basis: 40 Personen“). */
export function ueberlappungSatz(t: Themenzahlen): string {
  return L(`Eine Person kann mehrere Themen nennen, darum überlappen die Zeilen. Summe der n: ${t.summeN}, Basis: ${personen(t.basis)}.`, `A person can name several topics, so the rows overlap. Sum of the n: ${t.summeN}, base: ${personen(t.basis)}.`);
}
export const keineTestsSatz = () => L('Die Tabelle prüft nichts: Die Themen stammen aus denselben Daten, die Zeilen überlappen und die Gruppen sind klein. Wer ein Thema genauer prüfen will, kann es mit der Karte „Gruppen vergleichen“ untersuchen.', 'The table tests nothing: the topics come from the same data, the rows overlap and the groups are small. To examine a topic more closely, use the card "Compare groups".');
export const deutungSatz = () => L('Zitate und Themen sind eine Deutung der Forschenden.', 'Quotes and topics are an interpretation by the researchers.');
export const kleinSatz = () => L(`In Zeilen mit n < ${KLEIN_N} sind Mittelwert und Standardabweichung sehr unsicher.`, `In rows with n < ${KLEIN_N} the mean and the standard deviation are very uncertain.`);
export const genanntSatz = () => L('„Thema genannt“ heißt nicht „Thema wichtig“: Die Zahlen zählen Nennungen, keine Bedeutung.', '"Topic named" does not mean "topic important": the numbers count mentions, not importance.');
export const zitateHinweis = () => L('Zitate können Personen erkennbar machen (Namen, Orte, seltene Angaben). Jeden Satz prüfen, bevor die Tabelle weitergegeben wird.', 'Quotes can make people recognizable (names, places, rare details). Check every sentence before the table is passed on.');
export const exportHinweis = () => L('Die Tabelle mit allen zugeordneten Antworten je Thema steht darunter und lässt sich ebenfalls als Excel-Datei speichern. Sie enthält Kennung, Wortlaut und Wert der Frage, aber keine Namen.', 'The table with all assigned answers per topic is below and can also be saved as an Excel file. It has the ID, the wording and the value of the question, but no names.');
export const zitatGrenzeSatz = (max: number) => L(`Höchstens ${max} Zitate je Thema. Statable wählt nie ein Zitat von selbst aus.`, `At most ${max} quotes per topic. Statable never picks a quote by itself.`);
export const genauerPruefenSatz = () => L('Dieses Thema genauer prüfen', 'Examine this topic more closely');
export const vorlaeufigSatz = () => L('Das Thema wurde aus denselben Daten gebildet. Das Ergebnis ist darum vorläufig.', 'The topic was formed from the same data. The result is therefore preliminary.');
/** Warum etwas nicht geht oder wie viele Themen es sind (Hinweise der Rechnung). */
export function hinweisSaetze(t: Themenzahlen, anzahlThemen: number): string[] {
  const s: string[] = [];
  if (t.hinweise.includes('ueberlappung')) s.push(ueberlappungSatz(t));
  if (t.hinweise.includes('zu-viele-themen')) s.push(L(`Es gibt ${anzahlThemen} Themen. Bei mehr als 20 Themen wird die Tabelle unübersichtlich.`, `There are ${anzahlThemen} topics. With more than 20 topics the table becomes hard to read.`));
  return s;
}

/** M, SD, Median und Spanne einer Zeile als Zellen (fehlt etwas, steht „-“). */
const zahlenZellen = (z: ThemenZeile): Z[] => [z.mw === undefined ? '-' : fx(z.mw, 2), z.sd === undefined ? '-' : fx(z.sd, 2), z.median === undefined ? '-' : fx(z.median, 2), z.min === undefined ? '-' : `${zahlDe(z.min)} - ${zahlDe(z.max!)}`];
const verteilungText = (z: ThemenZeile): string => (z.verteilung && z.nGueltig ? z.verteilung.filter(v => v.n > 0).map(v => `${v.wert} ${v.n} (${proz(zahlDe(v.prozent!, 0))})`).join(', ') : '-');
const nGueltigText = (z: ThemenZeile): string => (z.nGueltig < z.n ? Lp(z.nGueltig, `${z.nGueltig} gültig`, `${z.nGueltig} gültig`, `${z.nGueltig} valid`, `${z.nGueltig} valid`) : '');

/**
 * Das Joint Display: eine Zeile je Thema (n, Prozent der Personen, Kennwerte der Frage, Zitate), zuerst die Gesamt-Zeile, dann auf Wunsch „ohne dieses Thema“.
 * `frage`: Name und Art der Frage (oder `null`: nur n und Prozent). `zitate`: je Thema die von der Person gewählten Zitate.
 */
export function tabelleThemen(t: Themenzahlen, frage: { name: string; art: ThemenFrage['art'] } | null, zitate: Record<string, { kennung: string; text: string }[]> = {}): TableItem {
  const mitFrage = frage !== null, istZahl = frage?.art === 'zahl', mitZitat = Object.values(zitate).some(l => l.length > 0);
  const kopf = [L('Thema', 'Topic'), 'n', L('Prozent der Personen', 'Percent of the people'),
    ...(mitFrage ? (istZahl ? ['M', 'SD', 'Mdn', L('Spanne', 'Range')] : [L('Verteilung', 'Distribution')]) : []),
    ...(mitFrage ? [L('Gültige Werte', 'Valid values')] : []), ...(mitZitat ? [L('Zitate', 'Quotes')] : [])];
  const kennwerte = (z: ThemenZeile): Z[] => (!mitFrage ? [] : [...(istZahl ? zahlenZellen(z) : [verteilungText(z)]), nGueltigText(z)]);
  const zeile = (name: string, z: ThemenZeile, zit: string): Z[] => [name, fd(z.n), fx(z.prozent, 1), ...kennwerte(z), ...(mitZitat ? [zit] : [])];
  const text = (l: { kennung: string; text: string }[] | undefined) => (l ?? []).map(x => `${zitat(x.text)} (${x.kennung})`).join(' ');
  const rows: Z[][] = [zeile(L('Alle Personen mit Thema', 'All people with a topic'), t.gesamt, ''), ...t.zeilen.map(z => zeile(z.name ?? '', z, text(zitate[z.name ?? ''])))];
  if (t.ohne) t.ohne.forEach(z => rows.push(zeile(L(`ohne das Thema ${zitat(z.name ?? '')}`, `without the topic ${zitat(z.name ?? '')}`), z, '')));
  const unterschrift = L(`Themen aus den offenen Antworten (N = ${t.basis} Personen mit mindestens einem Thema; ${t.leer} ohne Antwort, ${t.offen} noch nicht zugeordnet)`, `Topics from the open answers (N = ${t.basis} people with at least one topic; ${t.leer} without an answer, ${t.offen} not yet assigned)`);
  const fuss: string[] = [];
  if (t.hinweise.includes('ueberlappung')) fuss.push(ueberlappungSatz(t));
  else fuss.push(L('Jede Person nennt höchstens ein Thema; die Summe der n ist die Basis.', 'Each person names at most one topic; the sum of the n is the base.'));
  if (mitFrage) fuss.push(istZahl ? L(`M, SD, Mdn und Spanne von ${zitat(frage.name)} für die Personen, die das Thema nennen (SD mit n − 1; bei einem Fall „-“).`, `M, SD, Mdn and range of ${zitat(frage.name)} for the people who name the topic (SD with n − 1; "-" for one case).`)
    : L(`Verteilung von ${zitat(frage.name)} unter den Personen, die das Thema nennen (Prozent innerhalb der Zeile).`, `Distribution of ${zitat(frage.name)} among the people who name the topic (percent within the row).`));
  if (mitFrage && istZahl && [t.gesamt, ...t.zeilen].some(z => z.klein && z.n > 0)) fuss.push(kleinSatz());
  fuss.push(`${deutungSatz()} ${L('Die Tabelle prüft nichts.', 'The table tests nothing.')}`);
  return tabelle('Joint Display Themen', unterschrift, kopf, rows, fuss);
}

/** Der zweite Teil für Excel: alle zugeordneten Antworten je Thema (nur Kennung, Wortlaut, Wert der Frage; keine Namen). */
export function tabelleAntworten(
  themen: { name: string; werte: (number | null)[] }[], kennungen: string[], texte: (string | null)[], frage: { name: string; werte: (string | number | null)[] } | null
): TableItem {
  const rows: Z[][] = [];
  for (const th of themen) th.werte.forEach((w, i) => { if (w === 1) rows.push([th.name, kennungen[i] ?? String(i + 1), texte[i] ?? '', frage ? (frage.werte[i] === null || frage.werte[i] === undefined ? '' : String(frage.werte[i])) : '']); });
  const kopf = [L('Thema', 'Topic'), L('Kennung', 'ID'), L('Wortlaut', 'Wording'), frage ? frage.name : L('Wert der Frage', 'Value of the question')];
  return tabelle('Antworten je Thema', L('Alle zugeordneten Antworten je Thema', 'All assigned answers per topic'), kopf, rows, [zitateHinweis(), deutungSatz()]);
}
/** Anrede für den Hinweis im Dialog: „Wähle bis zu 3 Antworten“. */
export const zitatWahlHinweis = (max: number) => d(`Wähle bis zu ${max} Antworten als Zitate. Statable wählt keine von selbst aus.`, `Wählen Sie bis zu ${max} Antworten als Zitate. Statable wählt keine von selbst aus.`, `Choose up to ${max} answers as quotes. Statable does not pick any by itself.`);
