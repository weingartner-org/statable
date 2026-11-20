/** Excel-Datei der „Tabelle für die Veröffentlichung“ (M5a): nur die veröffentlichbare Fassung (das TableItem), die Zahlen stehen als Zahlen in den Zellen, „x“ als Text. Die Kopfzeile nennt Statable (nicht PSPP). */
import type { TableItem } from '../engine/types';
import { L, melde } from './sitzung.svelte';
import { tabelleDe, deDict, exportiereErgebnisseExcel } from './export';
import { tabellenNummer } from './tabellennummer';

export async function amtlichAlsExcel(item: TableItem, mitR: boolean): Promise<void> {
  const tb = tabelleDe(item, await deDict());
  await exportiereErgebnisseExcel([{ titel: tb.titel, items: [item] }], tb.titel, mitR ? L('Statable (R, Paket survey)', 'Statable (R, package survey)') : 'Statable', `${L('Tabelle', 'Table')} ${tabellenNummer(tb.titel, item)}`);
  melde(L('Excel-Datei gespeichert. Sie liegt bei den Downloads.', 'Excel file saved. You will find it in your downloads.'));
}
