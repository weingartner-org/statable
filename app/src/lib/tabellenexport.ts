/** Eine Tabelle für Word kopieren: HTML im APA-7-Stil (Nummer fett, Titel kursiv, nur waagrechte Linien) plus Text mit Tabulatoren. */
import { tonHex, tonFett } from './tabellenfarben';
import type { TableItem } from '../engine/types';
import { tabelleDe, deDict, type TabelleDe } from './export';
import { L, mitFlag } from './sitzung.svelte';
import { tabellenNummer } from './tabellennummer';

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FARBE = '#000000', SCHRIFT = 'Arial';
/** Beschriftungen in der gewählten Sprache; `en` bleibt für Tests und alte Aufrufe (true = Englisch, false = Deutsch, null = gewählte Sprache). */
const LABEL = { tabelle: () => L('Tabelle', 'Table'), anmerkung: () => L('Anmerkung. ', 'Note. ') };

/** APA-HTML einer Tabelle. Die Zahlen sind genau die der Word-Datei (`tabelleDe`): Dezimalkomma, echtes Minus, p ohne führende Null. */
export function apaHtml(tb: TabelleDe, nr: number, en: boolean | null = false): string {
  return en === null ? apaHtmlJetzt(tb, nr) : mitFlag(en, () => apaHtmlJetzt(tb, nr));
}
function apaHtmlJetzt(tb: TabelleDe, nr: number): string {
  const letzte = tb.zeilen.length - 1;
  // Kopfzellen über Zahlenspalten stehen rechtsbündig (wie die Zahlen), Kopfzellen über mehreren Spalten zentriert.
  const rumpf = tb.zeilen.slice(tb.kopfZeilen), zahlSpalte = (k: number) => rumpf.filter(z => z[k]).length > 0 && rumpf.filter(z => z[k]?.zahl).length * 2 > rumpf.filter(z => z[k]).length;
  const stil = (r: number, c: TabelleDe['zeilen'][number][number], k: number) => {
    const linien = [r === 0 ? `border-top:1pt solid ${FARBE}` : 'border-top:none', r === tb.kopfZeilen - 1 ? `border-bottom:0.5pt solid ${FARBE}` : r === letzte ? `border-bottom:1pt solid ${FARBE}` : 'border-bottom:none', 'border-left:none', 'border-right:none'];
    return `${linien.join(';')};padding:2pt 6pt;text-align:${r < tb.kopfZeilen ? (c.span > 1 ? 'center' : zahlSpalte(k) ? 'right' : 'left') : c.zahl ? 'right' : 'left'};vertical-align:top;font-family:${SCHRIFT};font-size:10pt`;
  };
  // Echte Struktur für Word, Screenreader und Weitergabe: Kopfzeilen in <thead> mit th scope (col, bei Gruppenzellen colgroup), Zeilenköpfe nach `kopfSpalten` als th scope="row", Beschriftung als zwei Absätze vor der Tabelle (siehe unten).
  const zelle = (c: TabelleDe['zeilen'][number][number], r: number, k: number, pos: number): string => {
    const imKopf = r < tb.kopfZeilen, zeilenKopf = !imKopf && pos < tb.kopfSpalten && c.t.trim() !== '';
    const tag = imKopf || zeilenKopf ? 'th' : 'td', scope = imKopf ? (c.span > 1 ? 'colgroup' : 'col') : zeilenKopf ? 'row' : '';
    const hg = tonHex(c.ton);
    return `<${tag}${scope ? ` scope="${scope}"` : ''}${c.span > 1 ? ` colspan="${c.span}"` : ''} style="${stil(r, c, k)};font-weight:${tonFett(c.ton) ? 'bold' : 'normal'}${hg ? `;background:#${hg}` : ''}">${c.t ? esc(c.t) : '&nbsp;'}</${tag}>`;
  };
  const zeile = (row: TabelleDe['zeilen'][number], r: number) => { let pos = 0; return `<tr>${row.map((c, k) => { const h = zelle(c, r, k, pos); pos += Math.max(1, c.span); return h; }).join('')}</tr>`; };
  const kopfHtml = tb.zeilen.slice(0, tb.kopfZeilen).map((row, r) => zeile(row, r)).join(''), rumpfHtml = tb.zeilen.slice(tb.kopfZeilen).map((row, r) => zeile(row, r + tb.kopfZeilen)).join('');
  const absatz = (inhalt: string, extra = '') => `<p style="margin:0 0 4pt 0;font-family:${SCHRIFT};font-size:11pt;${extra}">${inhalt}</p>`;
  // Kein <caption>: Word macht daraus eine verbundene erste Tabellenzeile. Beschriftung als zwei Absätze davor (APA: Nummer, darunter kursiver Titel); die Tabelle trägt den Titel als aria-label und title.
  const beschriftung = absatz(`<b>${LABEL.tabelle()} ${nr}</b>`, 'margin-bottom:0') + absatz(`<i>${esc(tb.titel)}</i>`, 'margin-bottom:6pt');
  const name = esc(tb.titel);
  return `<div>${beschriftung}<table aria-label="${name}" title="${name}" cellpadding="3" cellspacing="0" style="border-collapse:collapse;border:none;font-family:${SCHRIFT}">${kopfHtml ? `<thead>${kopfHtml}</thead>` : ''}<tbody>${rumpfHtml}</tbody></table>`
    + (tb.fuss.length ? absatz(`<i>${LABEL.anmerkung()}</i>${esc(tb.fuss.join(' '))}`, 'font-size:9pt;margin-top:4pt') : '') + `</div>`;
}

/** Dieselbe Tabelle als Text mit Tabulatoren (für Editoren ohne HTML-Einfügen). */
export function apaText(tb: TabelleDe, nr: number, en: boolean | null = false): string {
  return en === null ? apaTextJetzt(tb, nr) : mitFlag(en, () => apaTextJetzt(tb, nr));
}
function apaTextJetzt(tb: TabelleDe, nr: number): string {
  const ausgabe: string[] =[`${LABEL.tabelle()} ${nr}`, tb.titel];
  for (const row of tb.zeilen) ausgabe.push(row.flatMap(c => [c.t, ...Array<string>(Math.max(0, c.span - 1)).fill('')]).join('\t'));
  if (tb.fuss.length) ausgabe.push(LABEL.anmerkung() + tb.fuss.join(' '));
  return ausgabe.join('\n');
}

/** Legt die Tabelle als HTML und Text in die Zwischenablage. Gibt die verwendete Tabellennummer zurück, oder 0, wenn der Browser das Schreiben verweigert. */
export async function kopiereTabelleApa(it: TableItem, nr?: number): Promise<number> {
  const tb = tabelleDe(it, await deDict()), n = nr ?? tabellenNummer(tb.titel, it), html = apaHtml(tb, n, null), text = apaText(tb, n, null);
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
    return n;
  } catch {
    // Ältere Browser: über ein markiertes, unsichtbares Element kopieren.
    const el = document.createElement('div'); el.innerHTML = html; el.style.cssText = 'position:fixed;left:-10000px;top:0'; document.body.append(el);
    const sel = getSelection()!, r = document.createRange(); r.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(r);
    const ok = document.execCommand('copy'); sel.removeAllRanges(); el.remove(); return ok ? n : 0;
  }
}
