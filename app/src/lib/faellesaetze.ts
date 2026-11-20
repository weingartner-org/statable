/**
 * Sätze, Prüfliste und Tabellen zu „Fälle vergleichen“ (G1, Zahlen: faelle.ts). Alles beschreibend: kein Test, kein p, keine Verallgemeinerung.
 * Die Tabellen sind echte Tabellen (TableItem) für Blatt, Bericht, Word, PDF und Excel und folgen bei jedem Aufruf der Sprache:
 * das Joint Display (Guetterman, Fetters & Creswell 2015: Gruppe · n · Kennwerte · markierte Zitate · Notiz) und die volle Fall-Tabelle für Excel.
 * Sätze mit „zeigt“ oder „belegt“ gibt es hier nicht (Fachblatt Welle 4).
 */
import type { TableItem } from '../engine/types';
import { L, Lp, d } from './sitzung.svelte';
import { zahlDe } from './format';
import { proz, zitat } from '../i18n/profil';
import { tabelle, fd, fx, type Z } from './mwsaetze';
import type { Saetze } from './ergebnis';
import { FAELLE_GRENZE, FAELLE_HINWEIS, bildeGruppen, kennwerte, zaehlePassung, type Passung, runde2, stufenName, teilungInfo, zitateDerGruppe, type Faelle, type Gruppe, type Kenn, type TeilungInfo } from './faelle';
import type { Werte } from './verfahren';

/** Zahl mit zwei Stellen (Mittelwert, Streuung) bzw. gerundet ohne Endnullen (Median, kleinster und größter Wert). */
const z2 = (v: number) => zahlDe(v, 2);
const zk = (v: number) => zahlDe(runde2(v));

/* ---------- Sätze ---------- */
/** Die Zusammenfassung unter „Ergebnis“: nur Zahl der Gruppen und Fälle, dazu der Hinweis, dass die Tabelle nichts prüft. */
export function saetzeFaelle(e: Faelle, gruppen: Gruppe[]): Saetze {
  const k = gruppen.filter(g => g.mitglieder.length > 0).length, n = e.faelle.length;
  const gruppenText = Lp(k, `${k} Gruppe`, `${k} Gruppen`, `${k} group`, `${k} groups`), faelleText = Lp(n, `${n} Fall`, `${n} Fälle`, `${n} case`, `${n} cases`);
  const deutung = k === 1
    ? d('Die Gruppe ist ein Arbeitsstand deiner Deutung.', 'Die Gruppe ist ein Arbeitsstand Ihrer Deutung.', 'The group is a working draft of your interpretation.')
    : d('Die Gruppen sind ein Arbeitsstand deiner Deutung.', 'Die Gruppen sind ein Arbeitsstand Ihrer Deutung.', 'The groups are a working draft of your interpretation.');
  return {
    haupt: `${gruppenText}, ${faelleText}. ${deutung}`,
    zusatz: beschreibtNurText(),
    vorsicht: '', apa: '',
    marken: [{ text: faelleText, erklaer: 'stichprobe', hinweis: n < 5 }]
  };
}
/** Der Satz, der in jeder Ausgabe steht (Blatt, Bericht, Word, PDF, Excel). */
export const beschreibtNurText = () => L('Die Tabelle beschreibt diese Fälle. Sie prüft nichts und lässt sich nicht auf andere Personen übertragen.', 'The table describes these cases. It tests nothing and cannot be generalized to other people.');

/* ---------- Teilung: Sätze und Hinweise ---------- */
/** Was die Teilung einer Zahlenspalte macht, in einem Satz mit den Größen beider Gruppen. */
export function teilungSatz(i: TeilungInfo, bez: string): string {
  if (i.modus === 'keine') return i.verschieden === 0
    ? L(`${bez}: kein Wert vorhanden. Statable teilt die Spalte nicht.`, `${bez}: no value present. Statable does not split the column.`)
    : L(`${bez}: nur ein Wert. Statable teilt die Spalte nicht und zeigt nur ihre Kennwerte.`, `${bez}: only one value. Statable does not split the column and only shows its summary figures.`);
  const st = i.schwelleText!, bis = Lp(i.nBis, `${i.nBis} Fall`, `${i.nBis} Fälle`, `${i.nBis} case`, `${i.nBis} cases`), ueber = Lp(i.nUeber, `${i.nUeber} Fall`, `${i.nUeber} Fälle`, `${i.nUeber} case`, `${i.nUeber} cases`);
  return i.modus === 'median'
    ? L(`${bez}: geteilt am Median ${st}. „bis ${st}“: ${bis}, „über ${st}“: ${ueber}.`, `${bez}: split at the median ${st}. "up to ${st}": ${bis}, "above ${st}": ${ueber}.`)
    : L(`${bez}: geteilt an der eigenen Schwelle ${st}. „bis ${st}“: ${bis}, „über ${st}“: ${ueber}.`, `${bez}: split at your own threshold ${st}. "up to ${st}": ${bis}, "above ${st}": ${ueber}.`);
}
/** Hinweis, wenn mehrere Fälle genau auf der Schwelle liegen: Sie gehören zu „bis“, die Gruppen werden ungleich groß. Beide Größen stehen im Text. */
export function bindungenHinweis(i: TeilungInfo, bez: string): { text: string; klein: string } | null {
  if (i.modus === 'keine' || !i.bindungenAmMedian) return null;
  const st = i.schwelleText!, bis = Lp(i.nBis, `${i.nBis} Fall`, `${i.nBis} Fälle`, `${i.nBis} case`, `${i.nBis} cases`), ueber = Lp(i.nUeber, `${i.nUeber} Fall`, `${i.nUeber} Fälle`, `${i.nUeber} case`, `${i.nUeber} cases`);
  if (i.nUeber === 0) return {
    text: L(`${bez}: Am Median lässt sich hier nicht teilen: kein Fall liegt darüber`, `${bez}: The median cannot split here: no case lies above it`),
    klein: L(`Alle ${i.nBis} gültigen Fälle liegen auf oder unter ${st} und gehören zur Gruppe „bis ${st}“; die Gruppe „über ${st}“ bleibt leer. Unter „Weitere Wege“ lässt sich eine eigene Schwelle setzen.`, `All ${i.nBis} valid cases lie at or below ${st} and belong to the group "up to ${st}"; the group "above ${st}" stays empty. Under "More options" an own threshold can be set.`)
  };
  return {
    text: L(`${bez}: ${i.nGleich} Fälle liegen genau auf ${st}`, `${bez}: ${i.nGleich} cases lie exactly at ${st}`),
    klein: L(`Sie gehören zur Gruppe „bis ${st}“. Darum sind die Gruppen ungleich groß: „bis ${st}“ hat ${bis}, „über ${st}“ hat ${ueber}. Die Teilung am Median ist ein Startpunkt, kein Befund; unter „Weitere Wege“ lässt sich eine eigene Schwelle setzen.`, `They belong to the group "up to ${st}". That is why the groups differ in size: "up to ${st}" has ${bis}, "above ${st}" has ${ueber}. Splitting at the median is a starting point, not a finding; under "More options" you can set your own threshold.`)
  };
}

/* ---------- Prüfliste vor dem Anlegen ---------- */
export interface PruefPunkt { art: 'ok' | 'hinweis' | 'info' | 'sperre'; text: string; klein?: string }
/** Zeilen, ab denen Statable gar nicht erst versucht, Fälle zu bilden (die Seite würde zu schwer). */
const ZEILEN_GRENZE = 50000;
/** Prüfliste der Frage „Wie passen Zahlen und Aussagen zusammen?“. `bauen` baut die Fälle aus den Daten (erst, wenn die Auswahl in Ordnung ist). */
export function faellePruefliste(w: Werte, zeilen: number, bauen: () => Faelle): PruefPunkt[] {
  const alle = [...w.l1, ...w.l2, ...w.l3];
  const doppelt = alle.filter((n, i) => alle.indexOf(n) !== i);
  if (doppelt.length) return [{ art: 'sperre', text: L('Eine Spalte steht mehrfach', 'A column is used more than once'), klein: L('Zahlen und Gruppen, Aussagen und Kennung müssen verschiedene Spalten sein.', 'Numbers and groups, statements and case ID must be different columns.') }];
  if (w.l1.length > 4 || w.l2.length > 3) return [{ art: 'sperre', text: L('Zu viele Spalten', 'Too many columns'), klein: L('Höchstens 4 Spalten mit Zahlen oder Gruppen und 3 Textspalten: mit mehr wird die Tabelle unlesbar.', 'At most 4 columns with numbers or groups and 3 text columns: with more the table becomes unreadable.') }];
  if (zeilen > ZEILEN_GRENZE) return [{ art: 'sperre', text: Lp(zeilen, `Zu viele Zeilen: ${zeilen}`, `Zu viele Zeilen: ${zeilen}`, `Too many rows: ${zeilen}`, `Too many rows: ${zeilen}`), klein: L(`Der Fallvergleich ist für wenige Fälle gedacht (bis ${FAELLE_GRENZE}); Texte lassen sich nur lesen, solange es überschaubar bleibt.`, `Comparing cases is meant for a small number of cases (up to ${FAELLE_GRENZE}); texts can only be read while the number stays manageable.`) }];
  const e = bauen(), n = e.faelle.length, p: PruefPunkt[] = [];
  if (!n) return [{ art: 'sperre', text: L('Keine Zeile mit Angaben', 'No row with an entry'), klein: L('In den gewählten Spalten steht in keiner Zeile etwas.', 'None of the rows has an entry in the chosen columns.') }];
  if (n > FAELLE_GRENZE) return [{ art: 'sperre', text: Lp(n, `Zu viele Fälle: ${n}`, `Zu viele Fälle: ${n}`, `Too many cases: ${n}`, `Too many cases: ${n}`), klein: L(`Der Fallvergleich rechnet bis ${FAELLE_GRENZE} Fälle.`, `Comparing cases works up to ${FAELLE_GRENZE} cases.`) }];
  const gruppen = bildeGruppen(e), k = gruppen.length;
  p.push({ art: 'ok', text: `${Lp(n, `${n} Fall`, `${n} Fälle`, `${n} case`, `${n} cases`)}, ${Lp(k, `${k} Gruppe vorgeschlagen`, `${k} Gruppen vorgeschlagen`, `${k} group suggested`, `${k} groups suggested`)}`,
    klein: L('Der Vorschlag entsteht aus den Wertkombinationen der Zahlen und Gruppen. Er ist ein Startpunkt: Im Blatt lassen sich Fälle verschieben, Gruppen umbenennen und deuten.', 'The suggestion comes from the combinations of the numbers and groups. It is a starting point: on the page you can move cases, rename groups and interpret them.') });
  for (const sp of e.q) {
    const i = teilungInfo(e, sp.name);
    if (!i) continue;
    p.push({ art: i.modus === 'keine' ? 'hinweis' : 'info', text: teilungSatz(i, sp.bezeichnung), klein: i.modus === 'median' ? L('Voreinstellung ist der Median; „bis“ schließt den Wert ein. Eine eigene Schwelle lässt sich im Blatt unter „Weitere Wege“ setzen.', 'The default is the median; "up to" includes the value. You can set your own threshold on the page under "More options".') : undefined });
    const b = bindungenHinweis(i, sp.bezeichnung);
    if (b) p.push({ art: 'hinweis', text: b.text, klein: b.klein });
  }
  if (k > 12) p.push({ art: 'hinweis', text: Lp(k, `${k} Gruppen`, `${k} Gruppen`, `${k} group`, `${k} groups`), klein: L('Bei so vielen Gruppen bleiben nur wenige Fälle in jeder. Weniger Spalten oder eine eigene Schwelle machen die Gruppen größer.', 'With this many groups only a few cases remain in each. Fewer columns or your own threshold make the groups larger.') });
  if (n > FAELLE_HINWEIS) p.push({ art: 'hinweis', text: Lp(n, `${n} Fälle`, `${n} Fälle`, `${n} cases`, `${n} cases`), klein: L('Die Tabelle bleibt bedienbar, aber Texte zu lesen und Fälle zu verschieben wird bei so vielen mühsam. Ordnen hilft: nach Spalten sortieren.', 'The table stays usable, but reading texts and moving cases becomes tedious with so many. Sorting by columns helps.') });
  if (e.ausgelassen > 0) p.push({ art: 'info', text: Lp(e.ausgelassen, `${e.ausgelassen} Zeile ohne Angabe in diesen Spalten wird ausgelassen`, `${e.ausgelassen} Zeilen ohne Angabe in diesen Spalten werden ausgelassen`, `${e.ausgelassen} row without an entry in these columns is left out`, `${e.ausgelassen} rows without an entry in these columns are left out`) });
  const ohne = gruppen.filter(g => g.fehlendBei.length > 0).reduce((a, g) => a + g.mitglieder.length, 0);
  if (ohne > 0) p.push({ art: 'info', text: Lp(ohne, `${ohne} Fall mit fehlender Angabe bekommt eine eigene Gruppe`, `${ohne} Fälle mit fehlender Angabe bekommen eine eigene Gruppe`, `${ohne} case with a missing entry gets a group of its own`, `${ohne} cases with a missing entry get a group of their own`), klein: L('Fälle mit fehlendem Wert in einer Zahl oder Gruppe stehen in Gruppen „ohne Angabe bei …“. Statable lässt sie nie still weg.', 'Cases with a missing value in a number or group are in groups "no answer for …". Statable never leaves them out silently.') });
  if (!w.l3.length) p.push({ art: 'info', text: L('Ohne Kennung zählen die Zeilennummern', 'Without a case ID the row numbers count'), klein: L('Gruppen, Notizen und Markierungen hängen dann an der Zeilennummer. Ändern sich die Zeilen (eingefügt, gelöscht, sortiert), passen sie nicht mehr sicher. Eine Kennungsspalte unter „Weitere Wege“ vermeidet das.', 'Groups, notes and marks are then tied to the row number. If rows change (inserted, deleted, sorted) they no longer fit reliably. A case ID column under "More options" avoids this.') });
  p.push({ art: 'info', text: beschreibtNurText(), klein: L('Die Gruppen sind eine Deutung der Forschenden, kein Befund. Texte lesen, Gruppen prüfen und anpassen gehört zur Methode (Schoonenboom, 2023).', 'The groups are the researchers\' interpretation, not a finding. Reading the texts, checking and adjusting the groups is part of the method (Schoonenboom, 2023).') });
  return p;
}

/* ---------- Tabellen für Bericht, Word, PDF und Excel ---------- */
/** Kennwerte einer Spalte in einer Zeile: Zahl „M, SD, Mdn, Spanne“, Gruppe „Stufe n (%)“; SD bei einem Fall „-“. */
export function kennText(k: Kenn, bez: string): string {
  if (k.art === 'zahl') {
    if (!k.n) return `${bez}: -`;
    return `${bez}: M = ${z2(k.mean!)}, SD = ${k.sd === null ? '-' : z2(k.sd)}, Mdn = ${zk(k.median!)}, ${L('Min bis Max', 'min to max')} ${zk(k.min!)} ${L('bis', 'to')} ${zk(k.max!)}`;
  }
  const teile = k.stufen.filter(x => x.n > 0).map(x => `${x.name} ${x.n} (${proz(zahlDe(x.prozent!, 0))})`);
  return `${bez}: ${teile.length ? teile.join(', ') : '-'}`;
}
/** Name der Passung für Anzeige und Export (Fachbegriff immer dabei: Fetters, Curry & Creswell 2013). */
export const passungName = (p: Passung): string => ({ offen: L('offen', 'open'), bestaetigung: L('Bestätigung', 'Confirmation'), erweiterung: L('Erweiterung', 'Expansion'), widerspruch: L('Widerspruch', 'Discordance') })[p];
/** Die Zählung unter der Tabelle, z. B. „Bestätigung 4, Erweiterung 2, Widerspruch 1, offen 3“; nur Zahlen, keine Bewertung. */
export function passungZaehlung(gruppen: Gruppe[]): string {
  const z = zaehlePassung(gruppen);
  return (['bestaetigung', 'erweiterung', 'widerspruch', 'offen'] as const).map(p => `${passungName(p)} ${z[p]}`).join(', ');
}
/** Das Joint Display: eine Zeile je Gruppe mit n, Kennwerten, markierten Zitaten und Notiz. */
export function tabellenFaelle(e: Faelle, gruppen: Gruppe[] = bildeGruppen(e)): TableItem[] {
  const zeilen: Z[][] = gruppen.filter(g => g.mitglieder.length > 0 || g.notiz.trim() || g.metaInferenz.trim() || g.passung !== 'offen').map(g => {
    const ks = kennwerte(e, g.mitglieder);
    const kenn = g.mitglieder.length ? ks.map((k, i) => kennText(k, e.q[i]!.bezeichnung)).join('; ') : '';
    const zitate = zitateDerGruppe(e, g).map(z => `${zitat(z.text)} (${z.kennung}${e.t.length > 1 ? `, ${z.bezeichnung}` : ''})`).join(' ');
    return [g.name, fd(g.mitglieder.length), kenn, zitate, g.notiz.trim(), passungName(g.passung), g.metaInferenz.trim()];
  });
  return [tabelle('Joint Display', L('Gruppen im Vergleich (Joint Display)', 'Groups compared (joint display)'),
    [L('Gruppe', 'Group'), 'n', L('Kennwerte', 'Summary figures'), L('Markierte Zitate', 'Marked quotes'), L('Notiz', 'Note'), L('Passung', 'Fit'), L('Meta-Inferenz', 'Meta-inference')], zeilen,
    [beschreibtNurText(), L('M = Mittelwert, SD = Standardabweichung (mit n − 1; bei einem Fall „-“), Mdn = Median. Gruppen und Notizen sind eine Deutung der Forschenden.', 'M = mean, SD = standard deviation (with n − 1; "-" for one case), Mdn = median. Groups and notes are the researchers\' interpretation.'), L('Passung (fit) und Meta-Inferenz (meta-inference) tragen die Forschenden selbst ein; Statable bewertet sie nicht.', 'Fit and meta-inference are entered by the researchers themselves; Statable does not judge them.')])];
}
/** Die volle Fall-Tabelle (Anhang im Excel-Export): eine Zeile je Fall mit Kennung, Gruppe, Zahlen und Gruppen und den vollständigen Texten. */
export function tabelleAlleFaelle(e: Faelle, gruppen: Gruppe[] = bildeGruppen(e)): TableItem {
  const gruppeVon = new Map<number, string>(), gruppeObj = new Map<number, Gruppe>();
  for (const g of gruppen) for (const i of g.mitglieder) { gruppeVon.set(i, g.name); gruppeObj.set(i, g); }
  const stellen = e.q.map((sp, qi) => (sp.art === 'zahl' ? Math.min(3, Math.max(0, ...e.faelle.map(f => (typeof f.q[qi] === 'number' ? (String(f.q[qi]).split('.')[1] ?? '').length : 0)))) : -1));
  const zeilen: Z[][] = e.faelle.map((f, i) => [f.kennung, gruppeVon.get(i) ?? '',
    ...e.q.map((sp, qi): Z => { const v = f.q[qi]; return v === null || v === undefined ? '' : sp.art === 'zahl' ? fx(v as number, stellen[qi]!) : stufenName(e, qi, v); }),
    ...f.t,
    gruppeObj.has(i) ? passungName(gruppeObj.get(i)!.passung) : '', gruppeObj.get(i)?.metaInferenz.trim() ?? '']);
  return tabelle('Case Comparison Table', L('Alle Fälle', 'All cases'),
    [e.kennung ? (e.kennungName ?? e.kennung) : L('Zeile', 'Row'), L('Gruppe', 'Group'), ...e.q.map(sp => sp.bezeichnung), ...e.t.map(sp => sp.bezeichnung), L('Passung', 'Fit'), L('Meta-Inferenz', 'Meta-inference')], zeilen,
    [beschreibtNurText()]);
}
