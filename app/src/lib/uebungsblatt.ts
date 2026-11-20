/**
 * Übungsblatt drucken (V3, Lehrende): die gewählten Fragen eines eigenen Lernpfads als barrierefreie Druckansicht, dazu ein eigenes Lösungsblatt.
 * Rein bis auf `druckeUebungsblatt` (lädt die Fragen und öffnet das Fenster); `blattDruckHtml` ist ohne Browser prüfbar (lib/uebungsblatt.test.ts).
 *
 * Antworten stehen im Druck immer gemischt (in den Fragedateien steht die richtige oft vorn); mit „mischen“ auch die Fragen.
 * Der Startwert kommt aus Name und Fragen des Pfads (`startwertAus`): Blatt und Lösungsblatt zeigen dieselbe Fassung, auch wenn sie getrennt gedruckt werden.
 * Fragen einer Fallreihe (`Frage.fall`) bleiben beim Mischen beieinander; die Tabellen der Fallreihe stehen beim ersten Auftreten.
 * Streudiagramme stehen im Druck als Beschreibung und Datentabelle (dieselbe Textfassung wie in der App, `textfassung`).
 * Keine Noten, keine Punkte: das Blatt ist zum Üben.
 */
import { L, Lp, d as du, waehle, aktuelleSprache } from './sitzung.svelte';
import { dez } from '../i18n/profil';
import { istRtl } from '../i18n/laufzeit';
import { mische, ladeAuswahl, type Frage, type ThemaModul, type Tabelle, type Diagramm } from '../lernen/fragen';
import { themaDerFrage } from '../lernen/lernplan';
import { ZELLEN } from '../lernen/fragen-zellen';
import { startwertAus, type Blatt } from '../lernen/eigenepfade';
import { textfassung } from './fragediagramm';
import { teileItems } from './item-liste';
import { zufall } from './zufall';
import { CSS, oeffneZumDrucken } from './druckansicht';
import { logoSvg, fussText } from './dokumentmarke';

/** Eine Frage des Blatts: `reihenfolge` sind die Plätze der Antworten aus der Fragedatei in der gedruckten Reihenfolge. */
export interface BlattEintrag { frage: Frage; reihenfolge: number[] }

export const BUCHSTABEN = 'ABCDEFGH';

/** Fragen mischen, die Fragen einer Fallreihe bleiben beieinander und in ihrer Reihenfolge. */
export function mischeMitFall(fragen: readonly Frage[], rnd: () => number): Frage[] {
  const gruppen: Frage[][] = [], faelle = new Map<string, Frage[]>();
  for (const f of fragen) {
    if (!f.fall) { gruppen.push([f]); continue; }
    let g = faelle.get(f.fall);
    if (!g) { g = []; faelle.set(f.fall, g); gruppen.push(g); }
    g.push(f);
  }
  return mische(gruppen, rnd).flat();
}

/** Die feste Fassung des Blatts: Reihenfolge der Fragen (nur mit `mischen` gemischt) und je Frage die gemischte Reihenfolge der Antworten. */
export function blattFassung(fragen: readonly Frage[], mischen: boolean, startwert: number): BlattEintrag[] {
  const rnd = zufall(startwert);
  const liste = mischen ? mischeMitFall(fragen, rnd) : [...fragen];
  return liste.map(f => ({ frage: f, reihenfolge: mische(f.antworten.map((_, i) => i), rnd) }));
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const zelle = (v: string | number) => (typeof v === 'number' ? dez(String(v)) : /^<?-?\d*\.\d+$/.test(v) ? dez(v) : Object.hasOwn(ZELLEN, v) ? waehle(ZELLEN[v]!) : v);
const istZahl = (v: string | number) => typeof v === 'number' || /^<?-?\d*[.,]?\d+$/.test(String(v));

/** Fließtext mit Item-Listen (wie `TextMitItems` in der App): Absätze und Aufzählungen. */
function textHtml(t: string): string {
  return teileItems(t).map(x => (x.art === 'liste' ? `<ul>${x.eintraege.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : x.t.split(/\n+/).filter(s => s.trim()).map(s => `<p>${esc(s)}</p>`).join(''))).join('');
}

function tabelleHtml(t: Tabelle, nr: number): string {
  const zahlSpalte = (i: number) => i > 0 && t.zeilen.length > 0 && t.zeilen.every(z => z[i] === undefined || istZahl(z[i]!));
  const kopf = `<thead><tr>${t.kopf.map((k, i) => `<th scope="col"${zahlSpalte(i) ? ' class="z"' : ''}>${esc(waehle(k)) || '&nbsp;'}</th>`).join('')}</tr></thead>`;
  const zeilen = t.zeilen.map(z => `<tr>${z.map((c, i) => (i === 0 ? `<th scope="row">${esc(String(zelle(c)))}</th>` : `<td${istZahl(c) ? ' class="z"' : ''}>${esc(String(zelle(c))) || '&nbsp;'}</td>`)).join('')}</tr>`).join('');
  const titel = t.titel ? ` <i>${esc(waehle(t.titel))}</i>` : '';
  return `<table><caption><b>${L('Tabelle', 'Table')} ${nr}.</b>${titel}</caption>${kopf}<tbody>${zeilen}</tbody></table><p class="fuss">${esc(L('Quelle: ', 'Source: '))}${esc(waehle(t.quelle))}</p>`;
}

function diagrammHtml(d: Diagramm, nr: number): string {
  const tf = textfassung(d);
  const kopf = `<thead><tr>${tf.kopf.map(k => `<th scope="col">${esc(k)}</th>`).join('')}</tr></thead>`;
  const zeilen = tf.zeilen.map(z => `<tr>${z.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td class="z">${esc(c)}</td>`)).join('')}</tr>`).join('');
  return `<div class="diagramm"><p><b>${L('Abbildung', 'Figure')} ${nr}.</b> ${esc(waehle(d.titel ?? d.kurz))}</p><p>${esc(waehle(d.kurz))} ${esc(tf.saetze.join(' '))}</p>`
    + `<table><caption>${esc(L('Daten der Abbildung als Tabelle', 'Data of the figure as a table'))}</caption>${kopf}<tbody>${zeilen}</tbody></table><p class="fuss">${esc(L('Quelle: ', 'Source: '))}${esc(waehle(d.quelle))}</p></div>`;
}

const BLATT_CSS = `
.frage{break-inside:avoid-page;margin:0 0 1.2rem}
.frage h2{font-size:12pt;margin:1.2rem 0 .3rem}
.antw{list-style:none;padding:0;margin:.4rem 0}
.antw li{margin:.25rem 0;display:flex;gap:.5rem}
.kasten{display:inline-block;min-width:1.2em}
.aussagen th,.aussagen td{vertical-align:top}
.aussagen td.wahl{white-space:nowrap}
.kopfzeile{display:flex;flex-wrap:wrap;gap:1rem 2rem;margin:.4rem 0 1rem}
.loesung li{margin:.4rem 0}
.diagramm{margin:.6rem 0}
`;

export interface BlattDruck {
  sprache: string; name: string; eintraege: BlattEintrag[]; faelle: ThemaModul['FAELLE'];
  minuten?: number; datum: string; art: 'blatt' | 'loesung';
}

/** Ganze Seite: Übungsblatt (Fragen mit Kästchen) oder Lösungsblatt (je Frage die richtige Antwort und warum). */
export function blattDruckHtml(d: BlattDruck): string {
  const titel = d.art === 'blatt' ? `${L('Übungsblatt', 'Practice sheet')}: ${d.name}` : `${L('Lösungen zum Übungsblatt', 'Answers to the practice sheet')}: ${d.name}`;
  const n = d.eintraege.length;
  let tabNr = 0, abbNr = 0;
  const fallBei = new Map<string, number>();
  const teile: string[] = [];
  d.eintraege.forEach((e, i) => {
    const f = e.frage, nr = i + 1;
    if (d.art === 'loesung') {
      if (!f.mehrfach) {
        const platz = e.reihenfolge.findIndex(k => f.antworten[k]?.richtig);
        const a = f.antworten[e.reihenfolge[platz]!]!;
        teile.push(`<li><b>${BUCHSTABEN[platz]}</b>: ${esc(waehle(a.text))}<br>${esc(L('Warum: ', 'Why: '))}${esc(waehle(a.warum))}</li>`);
      } else {
        const zeilen = e.reihenfolge.map((k, p) => { const a = f.antworten[k]!; return `<li><b>${BUCHSTABEN[p]}</b> ${esc(a.richtig ? L('stimmt', 'correct') : L('stimmt nicht', 'not correct'))}: ${esc(waehle(a.text))}<br>${esc(L('Warum: ', 'Why: '))}${esc(waehle(a.warum))}</li>`; }).join('');
        teile.push(`<li>${esc(L('Mehrere möglich', 'Several possible'))}<ul>${zeilen}</ul></li>`);
      }
      return;
    }
    let fallTeil = '';
    if (f.fall && d.faelle?.[f.fall]) {
      const fall = d.faelle[f.fall]!;
      const schon = fallBei.get(f.fall);
      if (schon === undefined) {
        fallBei.set(f.fall, nr);
        fallTeil = `<div class="fall">${textHtml(waehle(fall.titel))}${fall.tabellen.map(t => tabelleHtml(t, ++tabNr)).join('')}${(fall.diagramme ?? []).map(g => diagrammHtml(g, ++abbNr)).join('')}</div>`;
      } else fallTeil = `<p><i>${esc(L(`Tabellen wie bei Frage ${schon}.`, `Tables as in question ${schon}.`))}</i></p>`;
    }
    const eigenes = (f.tabelle ? tabelleHtml(f.tabelle, ++tabNr) : '') + (f.diagramm ? diagrammHtml(f.diagramm, ++abbNr) : '');
    const antworten = f.mehrfach
      ? `<p><i>${esc(L('Welche Aussagen stimmen? Mehrere können stimmen.', 'Which statements are correct? Several can be correct.'))}</i></p><table class="aussagen"><caption class="nur-vorleser">${esc(L(`Aussagen zu Frage ${nr}`, `Statements for question ${nr}`))}</caption><thead><tr><th scope="col">${esc(L('Aussage', 'Statement'))}</th><th scope="col">${esc(L('stimmt', 'correct'))}</th><th scope="col">${esc(L('stimmt nicht', 'not correct'))}</th></tr></thead><tbody>`
        + e.reihenfolge.map((k, p) => `<tr><th scope="row">${BUCHSTABEN[p]}. ${esc(waehle(f.antworten[k]!.text))}</th><td class="wahl"><span aria-hidden="true">☐</span></td><td class="wahl"><span aria-hidden="true">☐</span></td></tr>`).join('') + '</tbody></table>'
      : `<ol class="antw">${e.reihenfolge.map((k, p) => `<li><span class="kasten" aria-hidden="true">☐</span><span><b>${BUCHSTABEN[p]}</b> ${esc(waehle(f.antworten[k]!.text))}</span></li>`).join('')}</ol>`;
    teile.push(`<section class="frage" aria-labelledby="f${nr}"><h2 id="f${nr}">${esc(L(`Frage ${nr} von ${n}`, `Question ${nr} of ${n}`))}</h2>${fallTeil}${textHtml(waehle(f.stamm))}${eigenes}${antworten}</section>`);
  });
  const zeit = d.minuten ? L(`Vorgesehene Zeit: etwa ${d.minuten} Minuten.`, `Suggested time: about ${d.minuten} minutes.`) : '';
  const kopf = d.art === 'blatt'
    ? `<div class="kopfzeile"><span>${esc(L('Name:', 'Name:'))} ____________________</span><span>${esc(L('Datum:', 'Date:'))} ____________</span></div><p>${esc([Lp(n, `${n} Frage.`, `${n} Fragen.`, `${n} question.`, `${n} questions.`), zeit, du('Kreuze bei jeder Frage an, was stimmt.', 'Kreuzen Sie bei jeder Frage an, was stimmt.', 'Tick what is correct for each question.')].filter(Boolean).join(' '))}</p>`
    : `<p>${esc(Lp(n, `${n} Frage.`, `${n} Fragen.`, `${n} question.`, `${n} questions.`))} ${esc(L('Die Buchstaben gelten für das Übungsblatt mit demselben Namen, gedruckt aus diesem Lernpfad.', 'The letters refer to the practice sheet with the same name, printed from this learning path.'))}</p>`;
  const inhalt = d.art === 'blatt' ? teile.join('') : `<ol class="loesung">${teile.join('')}</ol>`;
  const hinweis = L('Zum Speichern als PDF: Drucken wählen, als Drucker „Als PDF speichern“.', 'To save as PDF: choose Print, then "Save as PDF" as the printer.');
  return `<!doctype html>\n<html lang="${esc(d.sprache)}"${istRtl(d.sprache) ? ' dir="rtl"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titel)}</title><style>${CSS}${BLATT_CSS}</style></head><body>`
    + `<div class="bildschirm" role="region" aria-label="${esc(L('Drucken', 'Print'))}"><button type="button" id="drucken">${esc(L('Drucken oder als PDF speichern', 'Print or save as PDF'))}</button><span>${esc(hinweis)}</span></div>`
    + `<main><h1>${esc(titel)}</h1>${kopf}${inhalt}<footer class="marke">${logoSvg('dm', 16)}<span>${esc(fussText(d.datum))}</span></footer></main></body></html>`;
}

/** Fragen laden, feste Fassung bilden, Druckansicht öffnen. */
export async function druckeUebungsblatt(name: string, blatt: Blatt, art: 'blatt' | 'loesung'): Promise<void> {
  const themen = [...new Set(blatt.fragen.map(themaDerFrage).filter((t): t is string => !!t))];
  const modul = await ladeAuswahl(themen, blatt.fragen);
  const eintraege = blattFassung(modul.FRAGEN, !!blatt.mischen, startwertAus(`${name}|${blatt.fragen.join(',')}`));
  const { heute } = await import('./export');
  oeffneZumDrucken(blattDruckHtml({ sprache: aktuelleSprache(), name, eintraege, faelle: modul.FAELLE, minuten: blatt.minuten, datum: heute(), art }));
}
