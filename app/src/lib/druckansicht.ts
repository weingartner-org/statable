/**
 * Barrierefreie Druckansicht des Berichts (Welle 5, Barrierefreiheit): jsPDF kann keine Tags, der Browser schon.
 * Der Bericht entsteht als sauberes, semantisches HTML (lang, title, eine h1, Überschriften, table mit caption/thead/th scope, figure mit alt und figcaption,
 * Beschreibung und Datentabelle nach jedem Diagramm). „Drucken → Als PDF speichern“ (Chrome, Edge) macht daraus ein getaggtes PDF.
 *
 *   berichtDruckHtml(d)                  reine Funktion, ohne Browser prüfbar (lib/export-barrierefrei-html.test.ts)
 *   druckeBerichtBarrierefrei(...)       sammelt Tabellen und Diagramme, öffnet ein Fenster und ruft print() auf
 *
 * PDF/UA (Block C, Messung `docs/barrierefreiheit/PDF-UA-BEFUNDE.md`): `<figure>` bekommt `role="group"`, sonst schreibt Chromium zwei verschachtelte Figure-Elemente
 * (das äußere ohne Alternativtext); leere Zellen bekommen ein geschütztes Leerzeichen; im Druck kein Seitenhintergrund (er wäre Inhalt ohne Tag und ohne Artefakt).
 * Bildtexte: jedes Diagramm-Bild (lib/diagrammbild.ts: `Png.text`) darf `text` (Ergebnis von `bildtext(art, daten)`) mitbringen. Fehlt er, steht nur „Abbildung N: Titel des Blatts“
 * als Alternativtext und es gibt keine Beschreibung (der Mangel ist dann sichtbar, nicht versteckt). Keine BookAccess-Zeichen: alles läuft durch `sauber`.
 */
import { L, aktuelleSprache, type Blatt } from './sitzung.svelte';
import { istRtl } from '../i18n/laufzeit';
import { teile, type Stueck } from './kursiv';
import { tabelleHtmlStruktur, type StrukturZelle } from './tabellenstruktur';
import { sauber } from './bildtext/zahlen';
import type { BildText } from './bildtext/typen';
import type { TabelleDe } from './export';
import type { BerichtAnhang } from './protokollsaetze';
import { logoSvg, fussText, MARKE } from './dokumentmarke';

export interface DruckBild { src: string; breite: number; hoehe: number; /** halbe Seitenbreite statt ganzer */ schmal?: boolean; text?: BildText }
export interface DruckAbschnitt { titel: string; veraltet?: string; satz?: string; notiz?: string; bilder: DruckBild[]; tabellen: TabelleDe[] }
export interface DruckBericht {
  /** Sprachcode für `lang` (zum Beispiel „de“) */ sprache: string;
  titel: string; erstellt: string; /** Datum für die Fußmarke */ datum?: string; einleitung: string[]; abschnitte: DruckAbschnitt[]; anhang?: BerichtAnhang;
  /** Beschreibung und Datentabelle sichtbar nach dem Bild (Vorgabe ja); der Alternativtext bleibt immer */ mitBeschreibung?: boolean;
}

/** Leere Zelle: Chromium lässt Zellen ohne Inhalt im PDF-Strukturbaum weg, die Tabelle wird dann unregelmäßig (PDF/UA). Geschütztes Leerzeichen hält die Zelle im Baum. */
const LEER = '&nbsp;';
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const kursiv = (t: string) => teile(t).map((x: Stueck) => (x.stil === 'italic' ? `<i>${esc(x.t)}</i>` : x.stil === 'bold' ? `<b>${esc(x.t)}</b>` : esc(x.t))).join('');

/** Alternativtext eines Bildes: Kurztext plus Beschreibung, nie nur der Titel; ohne Bildtext der Titel des Blatts mit Nummer. */
export function bildAlt(nr: number, titel: string, t?: BildText): string {
  if (!t) return sauber(`${L('Abbildung', 'Figure')} ${nr}: ${titel}`);
  return sauber([t.kurz, ...t.beschreibung].join(' '));
}

function tabelleHtml(tb: TabelleDe, nr: number): string {
  const st = tabelleHtmlStruktur(tb, { praefix: `t${nr}` });
  const zelle = (c: StrukturZelle): string => {
    const attr = [c.id ? `id="${c.id}"` : '', c.scope ? `scope="${c.scope === 'col' && c.colspan && c.colspan > 1 ? 'colgroup' : c.scope}"` : '', c.headers ? `headers="${c.headers}"` : '', c.describedby ? `aria-describedby="${c.describedby}"` : '',
      c.colspan ? `colspan="${c.colspan}"` : '', c.rowspan ? `rowspan="${c.rowspan}"` : '', c.art === 'td' && c.z.zahl ? 'class="z"' : ''].filter(Boolean).join(' ');
    const inhalt = `${c.text ? esc(c.text) : c.marken ? '' : LEER}${c.marken ? `<sup>${esc(c.marken)}</sup>` : ''}`;
    return `<${c.art}${attr ? ' ' + attr : ''}>${inhalt}</${c.art}>`;
  };
  const zeilen = (z: StrukturZelle[][]) => z.map(r => `<tr>${r.map(zelle).join('')}</tr>`).join('');
  const kopf = st.kopf.length ? `<thead>${zeilen(st.kopf)}</thead>` : '';
  const fuss = st.fuss.length ? `<p class="fuss"><i>${L('Anmerkung. ', 'Note. ')}</i>${st.fuss.map(f => `<span id="${f.id}">${esc(f.text)}</span>`).join(' ')}</p>` : '';
  return `<table><caption><b>${L('Tabelle', 'Table')} ${nr}.</b> <i>${esc(tb.titel)}</i></caption>${kopf}<tbody>${zeilen(st.koerper)}</tbody></table>${fuss}`;
}

function beschreibungHtml(nr: number, t: BildText): string {
  const tab = t.tabelle, hat = tab.kopf.length > 0 && tab.zeilen.length > 0;
  const kopf = tab.kopf.map(k => `<th scope="col">${k ? esc(k) : `<span class="nur-vorleser">${L('Name', 'Name')}</span>`}</th>`).join('');
  const zeilen = tab.zeilen.map(z => `<tr>${z.map((c, i) => (i === 0 && tab.zeilenKopf ? `<th scope="row">${esc(String(c))}</th>` : `<td class="z">${esc(String(c))}</td>`)).join('')}</tr>`).join('');
  return `<div class="bildbeschreibung"><h3>${L('Beschreibung und Daten zu Abbildung', 'Description and data for figure')} ${nr}</h3>`
    + t.beschreibung.map(a => `<p>${esc(a)}</p>`).join('')
    + (t.liste.length ? `<ul>${t.liste.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '')
    + (hat ? `<table><caption>${esc(tab.titel)}</caption><thead><tr>${kopf}</tr></thead><tbody>${zeilen}</tbody></table>` : '') + `</div>`;
}

export const CSS = `
:root{color-scheme:light}
*{box-sizing:border-box}
body{margin:0;padding:0 1.2rem 2rem;background:#fff;color:#000;font:11pt/1.5 Arial,"Liberation Sans",Helvetica,sans-serif}
main{max-width:46rem;margin:0 auto}
h1{font-size:18pt;margin:1rem 0 .3rem}
h2{font-size:14pt;margin:1.6rem 0 .4rem;break-after:avoid}
h3{font-size:11.5pt;margin:1rem 0 .3rem;break-after:avoid}
p{margin:.3rem 0 .6rem}
.erstellt{font-size:9pt;font-style:italic}
.veraltet{color:#b00020;font-weight:700}
table{border-collapse:collapse;margin:.6rem 0;font-size:9.5pt;max-width:100%}
caption{text-align: start;font-size:11pt;padding-bottom:.3rem;break-after:avoid}
th,td{padding:.15rem .5rem;text-align: start;vertical-align:top}
thead th{border-top:1pt solid #000;border-bottom:.5pt solid #000;text-align:right}
thead th:first-child{text-align: start}
thead th[colspan]{text-align:center}
tbody tr:last-child>*{border-bottom:1pt solid #000}
td.z{text-align:right;font-variant-numeric:tabular-nums}
tbody th{font-weight:400}
.fuss{font-size:8.5pt}
figure{margin:1rem 0;break-inside:avoid}
figure img{max-width:100%;height:auto;display:block}
figure.schmal img{max-width:75%}
figcaption{font-size:10pt;margin-top:.3rem}
.bildbeschreibung{font-size:10pt;margin:.3rem 0 1rem}
.bildbeschreibung ul{margin:.3rem 0;padding-inline-start:1.4rem}
.nur-vorleser{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.bildschirm{position:sticky;top:0;background:#eef6f4;border-bottom:1px solid #17756a;padding:.6rem 1.2rem;margin:0 -1.2rem 1rem;font-size:10pt}
.bildschirm button{font:inherit;padding:.4rem .9rem;margin-inline-end:.8rem;cursor:pointer}
@page{size:A4;margin:20mm 18mm 22mm}
.marke{margin-top:2rem;padding-top:.4rem;border-top:.5pt solid #DDD8CF;font-size:8pt;color:#5A646E;display:flex;align-items:center;gap:.35rem}
@media print{
  html,body{background:none}
  body{padding:0;font-size:10.5pt}
  .bildschirm{display:none}
  main{max-width:none}
  thead{display:table-header-group}
  tr,.fuss{break-inside:avoid}
  h2{break-before:auto}
  a{color:inherit;text-decoration:none}
}`;

/* Kein Seitenfuß über @page-Randfelder: Chrome schreibt sie ohne Tag und ohne Artefakt-Markierung ins getaggte PDF (geprüft 10.11.2026), das bricht PDF/UA.
   Die Marke steht darum einmal lesbar am Ende des Dokuments (footer.marke). */
/** Der ganze Bericht als eigenständige, semantische HTML-Seite. */
export function berichtDruckHtml(d: DruckBericht): string {
  const mit = d.mitBeschreibung ?? true;
  let tabNr = 0, abbNr = 0;
  const abschnitte = d.abschnitte.map(a => {
    const bilder = a.bilder.map(b => {
      abbNr++;
      const alt = bildAlt(abbNr, a.titel, b.text), unter = sauber(b.text?.kurz ?? a.titel);
      return `<figure role="group" aria-labelledby="abb${abbNr}"${b.schmal ? ' class="schmal"' : ''}><img src="${b.src}" alt="${esc(alt)}" width="${Math.round(b.breite)}" height="${Math.round(b.hoehe)}"><figcaption id="abb${abbNr}"><b>${L('Abbildung', 'Figure')} ${abbNr}.</b> ${esc(unter)}</figcaption></figure>`
        + (mit && b.text && (b.text.beschreibung.length || b.text.tabelle.zeilen.length) ? beschreibungHtml(abbNr, b.text) : '');
    }).join('');
    const tabellen = a.tabellen.map(tb => tabelleHtml(tb, ++tabNr)).join('');
    return `<section><h2>${esc(a.titel)}</h2>${a.veraltet ? `<p class="veraltet">${esc(a.veraltet.charAt(0).toUpperCase() + a.veraltet.slice(1))}.</p>` : ''}${a.satz ? `<p>${kursiv(a.satz)}</p>` : ''}${a.notiz ? `<p><i>${esc(a.notiz)}</i></p>` : ''}${bilder}${tabellen}</section>`;
  }).join('');
  const anhang = d.anhang ? `<section><h2>${esc(d.anhang.titel)}</h2><table><caption>${esc(d.anhang.titel)}</caption><thead><tr>${d.anhang.kopf.map(k => `<th scope="col">${esc(k)}</th>`).join('')}</tr></thead><tbody>${d.anhang.zeilen.map(z => `<tr>${z.map(c => `<td>${c ? esc(c) : LEER}</td>`).join('')}</tr>`).join('')}</tbody></table></section>` : '';
  const hinweis = L('Zum Speichern als PDF: Drucken wählen, als Drucker „Als PDF speichern“. Dann enthält das PDF Überschriften, Tabellenköpfe und Bildbeschreibungen.', 'To save as PDF: choose Print, then "Save as PDF" as the printer. The PDF then contains headings, table headers and image descriptions.');
  return `<!doctype html>\n<html lang="${esc(d.sprache)}"${istRtl(d.sprache) ? ' dir="rtl"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.titel)}</title><style>${CSS}</style></head><body>`
    + `<div class="bildschirm" role="region" aria-label="${esc(L('Drucken', 'Print'))}"><button type="button" id="drucken">${esc(L('Drucken oder als PDF speichern', 'Print or save as PDF'))}</button><span>${esc(hinweis)}</span></div>`
    + `<main><h1>${esc(d.titel)}</h1><p class="erstellt">${esc(d.erstellt)}</p>`
    + (d.einleitung.length ? `<section><h2>${esc(L('Ergebnisse', 'Results'))}</h2>${d.einleitung.map(e => `<p>${kursiv(e)}</p>`).join('')}</section>` : '')
    + abschnitte + anhang + `<footer class="marke">${logoSvg('dm', 16)}<span>${esc(fussText(d.datum ?? ''))}</span></footer></main></body></html>`;
}

/** Bericht sammeln (Tabellen und Diagramme wie im Word-Bericht) und als Druckansicht öffnen. Das ist der einzige PDF-Weg (Johannes 10.11.2026: alle Dokumente barrierefrei). */
export async function druckeBerichtBarrierefrei(blaetter: Blatt[], einleitung: { titel: string; text: string }[], name: string, spaltenName: (n: string) => string, anhang?: BerichtAnhang, mitBeschreibung = true): Promise<void> {
  const [{ tabelleDe, deDict, heute, veraltetMarke }, { diagrammBilder }, { berichtSatz, berichtTabellen }, { rechenText }] = await Promise.all([import('./export'), import('./diagrammbild'), import('./berichtsatz'), import('./eigenercode')]);
  const dc = await deDict(), abschnitte: DruckAbschnitt[] = [];
  for (const b of blaetter) {
    const bilder: DruckBild[] = [];
    for (const bild of await diagrammBilder(b, spaltenName)) bilder.push({ src: bild.url, breite: bild.breite, hoehe: bild.hoehe, schmal: b.dg?.breite !== 'seite', text: (bild as { text?: BildText }).text });
    abschnitte.push({ titel: b.titel, veraltet: veraltetMarke(b) || undefined, satz: berichtSatz(b) || undefined, notiz: b.notiz || undefined, bilder, tabellen: berichtTabellen(b).slice(0, 20).map(it => tabelleDe(it, dc)) });
  }
  const html = berichtDruckHtml({ sprache: aktuelleSprache(), titel: name, erstellt: `${L('Erstellt mit Statable am', 'Created with Statable on')} ${heute()} · ${L('gerechnet mit', 'calculated with')} ${rechenText(blaetter)}`, datum: heute(), einleitung: einleitung.map(e => e.text), abschnitte, anhang, mitBeschreibung });
  oeffneZumDrucken(html);
}

/** Eine Abbildung allein als getaggtes PDF (Johannes 10.11.2026: alle Dokumente barrierefrei; ersetzt das jsPDF-Bild ohne Tags).
 *  Seite so groß wie die Abbildung (breiteMm plus 5 mm Rand), Überschrift nur für Vorleser, Bild mit Alternativtext.
 *  Das Logo steckt im Bild selbst (Einstellung „Statable-Logo klein unten in Diagrammen“); ohne Logo bleibt die Abbildung frei von Marken. */
export function abbildungDruckHtml(d: { sprache: string; titel: string; src: string; breite: number; hoehe: number; text?: BildText; breiteMm?: number }): string {
  const bm = d.breiteMm ?? 160, hm = Math.ceil(bm * d.hoehe / d.breite), rand = 5;
  const alt = bildAlt(1, d.titel, d.text);
  const seite = `@page{size:${bm + 2 * rand}mm ${hm + 2 * rand}mm;margin:${rand}mm}@media print{body{padding:0}main{margin:0}figure{margin:0}figure img{width:${bm}mm;max-width:none}}`;
  const hinweis = L('Zum Speichern als PDF: Drucken wählen, als Drucker „Als PDF speichern“. Dann hat das PDF einen Alternativtext für das Bild.', 'To save as PDF: choose Print, then "Save as PDF" as the printer. The PDF then has an alternative text for the image.');
  return `<!doctype html>\n<html lang="${esc(d.sprache)}"${istRtl(d.sprache) ? ' dir="rtl"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.titel)}</title><style>${CSS}${seite}</style></head><body>`
    + `<div class="bildschirm" role="region" aria-label="${esc(L('Drucken', 'Print'))}"><button type="button" id="drucken">${esc(L('Drucken oder als PDF speichern', 'Print or save as PDF'))}</button><span>${esc(hinweis)}</span></div>`
    + `<main><h1 class="nur-vorleser">${esc(d.titel)}</h1><figure role="group" aria-label="${esc(d.titel)}"><img src="${d.src}" alt="${esc(alt)}" width="${Math.round(d.breite)}" height="${Math.round(d.hoehe)}"></figure></main></body></html>`;
}

/** Diagramm aus der App als getaggtes PDF über die Druckansicht; `ort` ist der Behälter mit dem Bildtext (`data-bildtext`). */
export async function druckeAbbildungBarrierefrei(svg: SVGSVGElement, titel: string, ort?: Element): Promise<void> {
  const [{ alsPng }, { druckFaktor }, { bildTextVon }] = await Promise.all([import('./bild'), import('./pngdpi'), import('./diagrammbild')]);
  const bild = await alsPng(svg, druckFaktor(svg.viewBox.baseVal.width));
  oeffneZumDrucken(abbildungDruckHtml({ sprache: aktuelleSprache(), titel, src: bild.url, breite: bild.breite, hoehe: bild.hoehe, text: ort ? bildTextVon(ort, svg).text : undefined }));
}

/** Neues Fenster (Titel des Fensters wird zum Vorschlag für den Dateinamen); sperrt der Browser Fenster, druckt ein unsichtbarer Rahmen. */
export function oeffneZumDrucken(html: string) {
  const w = window.open('', '_blank');
  if (w) {
    w.document.open(); w.document.write(html); w.document.close();
    w.document.getElementById('drucken')?.addEventListener('click', () => w.print());
    w.focus(); setTimeout(() => w.print(), 500);
    return;
  }
  const rahmen = document.createElement('iframe');
  rahmen.setAttribute('aria-hidden', 'true'); rahmen.title = L('Druckansicht', 'Print view'); rahmen.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.append(rahmen);
  const dok = rahmen.contentDocument!; dok.open(); dok.write(html); dok.close();
  rahmen.contentWindow!.addEventListener('afterprint', () => rahmen.remove());
  setTimeout(() => rahmen.contentWindow!.print(), 500);
}
