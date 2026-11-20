/**
 * Welle 5, Auftrag B: Die HTML-Ausgaben (Druckansicht für das getaggte PDF, „In Word kopieren“) tragen echte Struktur.
 * Die Prüffunktion `befunde` ist der Wächter; jede Regel hat eine Gegenprobe (der Fehler wird absichtlich eingebaut, dann muss sie rot werden).
 */
import { describe, expect, it } from 'vitest';
import type { TableItem } from '../engine/types';
import { tabelleDe } from './export';
import { apaHtml } from './tabellenexport';
import { berichtDruckHtml, bildAlt, type DruckBericht } from './druckansicht';
import { bildtext } from './bildtext';

const BOOKACCESS = /[{}^|]|-{3,}/;

/** Alle Verstöße gegen die Regeln für zugängliches HTML, als lesbare Liste. */
export function befunde(html: string, opt: { ganzeSeite: boolean; kopierHtml?: boolean }): string[] {
  const b: string[] = [];
  if (opt.ganzeSeite) {
    if (!/<html[^>]*\slang="[a-z]{2,3}(-[A-Za-z]+)?"/.test(html)) b.push('html ohne lang');
    if (!/<title>[^<]+<\/title>/.test(html)) b.push('title fehlt oder leer');
    const h1 = html.match(/<h1[\s>]/g)?.length ?? 0;
    if (h1 !== 1) b.push(`h1: ${h1} statt genau einer`);
  }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const alt = /\salt="([^"]*)"/.exec(m[0]);
    if (!alt || !alt[1]!.trim()) b.push('Bild ohne alt');
    else if (BOOKACCESS.test(alt[1]!)) b.push(`Bild-alt mit BookAccess-Zeichen: ${alt[1]}`);
  }
  for (const f of html.matchAll(/<figure\b[\s\S]*?<\/figure>/g)) {
    if (!/<figcaption[\s>]/.test(f[0])) b.push('figure ohne figcaption');
    // PDF/UA (Block C): ohne role="group" schreibt Chromium zwei verschachtelte Figure-Elemente, das äußere ohne Alternativtext
    if (opt.ganzeSeite && !/^<figure\b[^>]*\srole="group"/.test(f[0])) b.push('figure ohne role="group" (doppeltes Figure im PDF)');
  }
  // Chromium lässt leere Zellen im PDF-Strukturbaum weg: die Tabelle wird unregelmäßig
  for (const z of html.matchAll(/<t[dh]\b[^>]*><\/t[dh]>/g)) b.push(`leere Zelle: ${z[0]}`);
  if (opt.ganzeSeite && !/@media print\{[^}]*html,body\{background:none\}/.test(html)) b.push('Druck-CSS ohne Seitenhintergrund none (3 Inhaltsfehler PDF/UA)');
  for (const t of html.matchAll(/<table\b[\s\S]*?<\/table>/g)) {
    // Kopier-HTML (Word): Word macht ein <caption> zur ersten Tabellenzeile, darum Beschriftung als Absätze davor und Name über aria-label
    if (opt.kopierHtml) { if (/<caption/.test(t[0])) b.push('Kopier-HTML mit caption (Word macht eine Tabellenzeile daraus)'); if (!/^<table\b[^>]*\saria-label="[^"]+"/.test(t[0])) b.push('Tabelle ohne aria-label'); }
    else if (!/<caption/.test(t[0])) b.push('Tabelle ohne caption');
    if (!/<thead>[\s\S]*<th\b/.test(t[0])) b.push('Tabelle ohne Kopfzeile in thead');
    for (const th of t[0].matchAll(/<th\b[^>]*>/g)) if (!/\sscope="(col|row|colgroup|rowgroup)"/.test(th[0])) b.push(`th ohne scope: ${th[0]}`);
  }
  return b;
}

const tabelle = (zeilen: string[][], kopf: string[], fuss: string[] = [], kopfSpalten = 0): TableItem => {
  const cells = [...kopf.map((t, c) => ({ r: 0, c, rs: 1, cs: 1, t, h: true, x: true })), ...zeilen.flatMap((z, r) => z.map((t, c) => ({ r: r + 1, c, rs: 1, cs: 1, t, h: false, x: false, ...(c > 0 ? { n: Number(t.replace(',', '.')) || 0 } : {}) })))];
  return { type: 'table', label: 'T', layer: [], title: { t: 'Gruppenstatistik', x: false }, rows: zeilen.length + 1, cols: kopf.length, headRows: [1, 1], headCols: [kopfSpalten, kopfSpalten], cells, caption: null, footnotes: fuss.map(t => ({ t })) } as never;
};
const tb = tabelleDe(tabelle([['Männlich', '12,5', '3,1'], ['Weiblich', '14,2', '2,8']], ['', 'M', 'SD'], ['a. Nur Fälle mit Angabe.'], 1), null);

const hist = bildtext('histogramm', { name: 'Alter', grenzen: [10, 20, 30, 40], anzahl: [4, 9, 2], n: 15 });
const bericht = (ueber: Partial<DruckBericht> = {}): DruckBericht => ({
  sprache: 'de', titel: 'Bericht Beispiel', erstellt: 'Erstellt mit Statable', einleitung: ['An der Untersuchung nahmen 15 Personen teil.'],
  abschnitte: [{ titel: 'Alter nach Gruppe', satz: 'M = 3,1 (SD = 0,2)', bilder: [{ src: 'data:image/png;base64,AAAA', breite: 400, hoehe: 300, text: hist }], tabellen: [tb] }], ...ueber
});
const html = berichtDruckHtml(bericht());

describe('Druckansicht (getaggtes PDF über den Browser)', () => {
  it('erfüllt alle Regeln', () => expect(befunde(html, { ganzeSeite: true })).toEqual([]));
  it('lang, title, genau eine h1, Überschriften der Blätter als h2', () => {
    expect(html).toContain('<html lang="de">');
    expect(html).toContain('<title>Bericht Beispiel</title>');
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('<h2>Alter nach Gruppe</h2>');
  });
  it('Tabelle: caption, thead, th scope col, Zeilenkopf nach kopfSpalten, Fußnote mit Verweis', () => {
    expect(html).toContain('<caption><b>Tabelle 1.</b> <i>Gruppenstatistik</i></caption>');
    expect(html).toMatch(/<thead><tr><td>|<thead><tr><th scope="col"/);
    expect(html).toMatch(/<th [^>]*scope="col"[^>]*>M<\/th>/);
    expect(html).toMatch(/<th [^>]*scope="row"[^>]*>Männlich<\/th>/);
    expect(html).toMatch(/<tr><th [^>]*scope="row"[^>]*>Männlich<\/th><td[^>]*>12,5/);
    expect(html).toContain('<i>Anmerkung. </i><span id="t1-fn0">a. Nur Fälle mit Angabe.</span>');
  });
  it('Bild: alt = Kurztext plus Beschreibung, nicht nur der Titel; figcaption; Beschreibung und Datentabelle danach', () => {
    const alt = /<img [^>]*alt="([^"]*)"/.exec(html)![1]!;
    expect(alt.length).toBeGreaterThan(hist.kurz.length);
    expect(alt.startsWith(hist.kurz)).toBe(true);
    expect(html).toContain('<figcaption id="abb1"><b>Abbildung 1.</b>');
    expect(html.indexOf('</figure>')).toBeLessThan(html.indexOf('class="bildbeschreibung"'));
    expect(html.slice(html.indexOf('class="bildbeschreibung"'))).toMatch(/<table><caption>[^<]+<\/caption><thead><tr><th scope="col">/);
  });
  it('Beschreibung im Text ausschaltbar, der Alternativtext bleibt', () => {
    const o = berichtDruckHtml(bericht({ mitBeschreibung: false }));
    expect(o).not.toContain('bildbeschreibung"');
    expect(/<img [^>]*alt="([^"]*)"/.exec(o)![1]!.length).toBeGreaterThan(hist.kurz.length);
  });
  it('Bild ohne Bildtext bekommt den Titel mit Nummer als alt (nie leer)', () => {
    expect(bildAlt(2, 'Alter nach Gruppe')).toBe('Abbildung 2: Alter nach Gruppe');
    const o = berichtDruckHtml(bericht({ abschnitte: [{ titel: 'T', bilder: [{ src: 'data:,', breite: 1, hoehe: 1 }], tabellen: [] }] }));
    expect(befunde(o, { ganzeSeite: true })).toEqual([]);
  });
  it('keine BookAccess-Zeichen aus Namen: sie werden gesäubert', () => {
    expect(bildAlt(1, 'a | b ^2 {x}')).not.toMatch(BOOKACCESS);
  });
  it('Druck-CSS: Tabellenköpfe wiederholen, Umbrüche nach Überschriften vermeiden', () => {
    expect(html).toMatch(/@media print\{[\s\S]*thead\{display:table-header-group\}/);
    expect(html).toContain('h2{font-size:14pt;margin:1.6rem 0 .4rem;break-after:avoid}');
  });
  it('PDF/UA: Eckzelle der Kopfzeile ist nicht leer, Bild steht in figure role="group" mit Beschriftung', () => {
    expect(html).toMatch(/<thead><tr><td>&nbsp;<\/td><th /);
    expect(html).toMatch(/<figure role="group" aria-labelledby="abb1"[^>]*><img [^>]*><figcaption id="abb1">/);
  });
  it('englisch: lang und Beschriftungen', () => {
    expect(berichtDruckHtml(bericht({ sprache: 'en' }))).toContain('<html lang="en">');
  });
});

describe('Gegenproben der Prüfregeln (Fehler absichtlich einbauen: der Wächter muss rot werden)', () => {
  const rot = (kaputt: string, erwartet: RegExp) => expect(befunde(kaputt, { ganzeSeite: true }).join('|')).toMatch(erwartet);
  it('ohne lang', () => rot(html.replace(' lang="de"', ''), /ohne lang/));
  it('ohne title', () => rot(html.replace('<title>Bericht Beispiel</title>', '<title></title>'), /title/));
  it('zwei h1', () => rot(html.replace('<h2>Alter nach Gruppe</h2>', '<h1>Alter</h1>'), /h1: 2/));
  it('Bild ohne alt', () => rot(html.replace(/ alt="[^"]*"/, ''), /Bild ohne alt/));
  it('Bild mit BookAccess-Zeichen im alt', () => rot(html.replace(/ alt="/, ' alt="a | '), /BookAccess/));
  it('th ohne scope', () => rot(html.replace(/ scope="col"/, ''), /th ohne scope/));
  it('Tabelle ohne thead', () => rot(html.replace(/<thead>[\s\S]*?<\/thead>/, ''), /ohne Kopfzeile/));
  it('Tabelle ohne caption', () => rot(html.replace(/<caption>[\s\S]*?<\/caption>/, ''), /ohne caption/));
  it('figure ohne figcaption', () => rot(html.replace(/<figcaption[\s\S]*?<\/figcaption>/, ''), /figcaption/));
  it('figure ohne role="group"', () => rot(html.replace(' role="group"', ''), /role="group"/));
  it('leere Zelle (auch die Eckzelle der Kopfzeile)', () => rot(html.replace('<td>&nbsp;</td>', '<td></td>'), /leere Zelle/));
  it('Druck-CSS ohne Seitenhintergrund', () => rot(html.replace('html,body{background:none}', ''), /Seitenhintergrund/));
});

describe('„In Word kopieren (APA)“: echte Tabellenstruktur im kopierten HTML', () => {
  const a = apaHtml(tb, 3);
  it('erfüllt die Tabellenregeln', () => expect(befunde(a, { ganzeSeite: false, kopierHtml: true })).toEqual([]));
  it('Beschriftung als zwei Absätze vor der Tabelle (Nummer fett, Titel kursiv), kein caption, Tabelle mit aria-label und title', () => {
    expect(a).not.toContain('<caption');
    expect(a).toMatch(/<div><p [^>]*><b>Tabelle 3<\/b><\/p><p [^>]*><i>Gruppenstatistik<\/i><\/p><table [^>]*aria-label="Gruppenstatistik"[^>]*title="Gruppenstatistik"/);
  });
  it('Gegenprobe: caption im Kopier-HTML oder fehlendes aria-label schlägt an', () => {
    expect(befunde(a.replace('<thead>', '<caption>x</caption><thead>'), { ganzeSeite: false, kopierHtml: true }).join()).toMatch(/mit caption/);
    expect(befunde(a.replace(/ aria-label="[^"]*"/, ''), { ganzeSeite: false, kopierHtml: true }).join()).toMatch(/ohne aria-label/);
  });
  it('Kopfzeile in thead mit th scope="col", Rumpf in tbody mit Zeilenköpfen th scope="row"', () => {
    expect(a).toMatch(/<thead><tr><th scope="col"[^>]*>&nbsp;<\/th><th scope="col"[^>]*>M<\/th><th scope="col"[^>]*>SD<\/th><\/tr><\/thead>/);
    expect(a).toMatch(/<tbody><tr><th scope="row"[^>]*>Männlich<\/th><td[^>]*>12,5<\/td>/);
  });
  it('ohne Zeilenüberschriften (kopfSpalten 0) ist die erste Spalte td', () => {
    const o = apaHtml(tabelleDe(tabelle([['Mathe', '1,0']], ['', 'r']), null), 1);
    expect(o).toMatch(/<td[^>]*>Mathe<\/td>/);
    expect(o).not.toContain('scope="row"');
  });
  it('Gegenprobe: ohne scope oder thead schlägt der Wächter an', () => {
    expect(befunde(a.replace(/ scope="col"/, ''), { ganzeSeite: false, kopierHtml: true }).join()).toMatch(/th ohne scope/);
    expect(befunde(a.replace(/<thead>[\s\S]*?<\/thead>/, ''), { ganzeSeite: false, kopierHtml: true }).join()).toMatch(/ohne Kopfzeile/);
  });
});
