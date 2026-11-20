/**
 * Wächter Word-Export (Welle 5): ein Bericht mit t-Test, Kreuztabelle, Histogramm und Boxplot wird gebaut und mit derselben Prüflogik
 * wie `scripts/docx-pruefen.mjs` geprüft. Gegenprobe: wer Alternativtext, Kopfzeile, Sprache oder Titel entfernt, wird rot.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { strToU8, strFromU8, unzipSync, zipSync } from 'fflate';
import type { TableItem } from '../engine/types';
import type { Blatt } from './sitzung.svelte';
import { baueBerichtWord, flacheTabelle, tabelleDe, blattName, bildAltText } from './export';
import { bildtext } from './bildtext';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';

type Zelle = { r: number; c: number; rs?: number; cs?: number; t: string; h?: boolean; n?: number; fn?: string[] };
const tabelle = (titel: string, rows: number, cols: number, kopfZeilen: number, kopfSpalten: number, zellen: Zelle[], footnotes: string[] = []): TableItem => ({
  type: 'table', label: titel, layer: [], title: { t: titel, x: false }, rows, cols, headRows: [kopfZeilen, 0], headCols: [kopfSpalten, 0],
  cells: zellen.map(z => ({ rs: 1, cs: 1, h: false, x: false, ...z })), caption: null, footnotes: footnotes.map(t => ({ t })), ...({}) } as never);

// t-Test: zwei Kopfzeilen (mit verbundener Zelle „t-Test für die Mittelwertgleichheit“), eine Zeilenüberschrift
const tTest = tabelle('Test bei unabhängigen Stichproben', 3, 4, 2, 1, [
  { r: 0, c: 0, rs: 2, t: '', h: true }, { r: 0, c: 1, t: 'Levene-Test', h: true }, { r: 0, c: 2, cs: 2, t: 't-Test für die Mittelwertgleichheit', h: true },
  { r: 1, c: 1, t: 'Sig.', h: true }, { r: 1, c: 2, t: 't', h: true }, { r: 1, c: 3, t: 'Sig. (2-seitig)', h: true },
  { r: 2, c: 0, t: 'Varianzen gleich', h: true }, { r: 2, c: 1, t: '.512', n: 0.512 }, { r: 2, c: 2, t: '-2.31', n: -2.31 }, { r: 2, c: 3, t: '.024', n: 0.024 }
]);
// Kreuztabelle: Gruppenzelle über zwei Zeilen (Zeilenspanne), Fußnote an einer Zelle
const kreuz = tabelle('Geschlecht * Antwort Kreuztabelle', 5, 3, 1, 2, [
  { r: 0, c: 0, cs: 2, t: '', h: true }, { r: 0, c: 2, t: 'Anzahl', h: true },
  { r: 1, c: 0, rs: 2, t: 'weiblich', h: true }, { r: 1, c: 1, t: 'ja', h: true }, { r: 1, c: 2, t: '12', n: 12, fn: ['a'] },
  { r: 2, c: 1, t: 'nein', h: true }, { r: 2, c: 2, t: '8', n: 8 },
  { r: 3, c: 0, rs: 2, t: 'männlich', h: true }, { r: 3, c: 1, t: 'ja', h: true }, { r: 3, c: 2, t: '9', n: 9 },
  { r: 4, c: 1, t: 'nein', h: true }, { r: 4, c: 2, t: '11', n: 11 }
], ['a. Erwartete Zellhäufigkeit unter 5.']);

const blatt = (titel: string, items: TableItem[]): Blatt => ({ id: titel, titel, art: 'x', l1: null, l2: null, syntax: '', items, ergebnis: null, imBericht: true, notiz: '', zeit: 0 } as never);
const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
const png = (text?: ReturnType<typeof bildtext>) => ({ daten: PNG, url: '', breite: 400, hoehe: 300, ...(text ? { text } : {}) });

const histo = bildtext('histogramm', { name: 'Alter', grenzen: [20, 30, 40, 50], anzahl: [5, 12, 3], n: 20, mittel: 33, median: 32 });
const box = bildtext('boxplot', { name: 'Punkte', gruppenName: 'Gruppe', gruppen: [{ name: 'A', n: 10, min: 1, unten: 3, median: 5, oben: 7, max: 9, aus: [] }, { name: 'B', n: 10, min: 2, unten: 4, median: 6, oben: 8, max: 10, aus: [] }] } as never);

async function bericht(opt = {}) {
  const D = await import('docx');
  const a = blatt('Alter nach Gruppe', [tTest, kreuz]), b = blatt('Verteilung', []);
  const doc = baueBerichtWord(D, [a, b], [{ titel: '', text: 'An der Untersuchung nahmen 20 Personen teil.' }], 'Testbericht', null, x => (x === a ? [png(histo)] : [png(box)]), undefined, opt, x => x.items.filter((i): i is TableItem => i.type === 'table'));
  return new Uint8Array(await D.Packer.toBuffer(doc));
}
const aendere = (bytes: Uint8Array, datei: string, f: (x: string) => string) => {
  const z = unzipSync(bytes); z[datei] = strToU8(f(strFromU8(z[datei]!))); return zipSync(z);
};
const regeln = (b: ReturnType<typeof pruefeDocx>) => [...new Set(b.map(x => x.regel))].sort();

describe('Word-Bericht ist barrierefrei', () => {
  it('t-Test, Kreuztabelle, Histogramm und Boxplot: kein Befund der Prüfung', async () => {
    const b = pruefeDocx(await bericht());
    expect(b, JSON.stringify(b, null, 1)).toEqual([]);
  });

  it('Tabellen: eine Kopfzeile mit zusammengesetzten Köpfen, Zeilenspanne in jeder Zeile wiederholt', () => {
    const t = flacheTabelle(tabelleDe(tTest, null));
    expect(t.kopf.map(k => k.t)).toEqual(['', 'Levene-Test: Sig.', 't-Test für die Mittelwertgleichheit: t', 't-Test für die Mittelwertgleichheit: Sig. (2-seitig)']);
    const k = flacheTabelle(tabelleDe(kreuz, null));
    expect(k.rumpf.map(z => z.map(c => c.t).slice(0, 2))).toEqual([['weiblich', 'ja'], ['weiblich', 'nein'], ['männlich', 'ja'], ['männlich', 'nein']]);
  });

  it('Bild: Alternativtext = Kurztext plus Beschreibung, Titel = Kurztext, keine BookAccess-Zeichen', async () => {
    const x = unzipSync(await bericht()), doc = strFromU8(x['word/document.xml']!);
    const docPr = [...doc.matchAll(/<wp:docPr\b[^>]*>/g)].map(m => m[0]);
    expect(docPr).toHaveLength(2);
    const at = bildAltText('Alter', histo);
    for (const d of docPr) { const descr = /descr="([^"]*)"/.exec(d)![1]!, titel = /title="([^"]*)"/.exec(d)![1]!; expect(descr.length).toBeGreaterThan(titel.length + 20); expect(descr).not.toMatch(/[{}^|]|-{3}/); }
    expect(at.description.length).toBeGreaterThan(at.title.length);
  });

  it('Sichtbare Beschreibung und Datentabelle nach dem Bild; der Schalter nimmt sie weg, der Alternativtext bleibt', async () => {
    const mit = strFromU8(unzipSync(await bericht())['word/document.xml']!), ohne = strFromU8(unzipSync(await bericht({ bildbeschreibungen: false }))['word/document.xml']!);
    expect(mit).toContain('w:val="Bildbeschreibung"');
    expect(ohne).not.toContain('w:val="Bildbeschreibung"');
    expect((mit.match(/<w:tbl>/g) ?? []).length).toBe((ohne.match(/<w:tbl>/g) ?? []).length + 2);
    expect((ohne.match(/descr="[^"]{40,}"/g) ?? []).length).toBe(2);
    expect(pruefeDocx(await bericht({ bildbeschreibungen: false }))).toEqual([]);
  });

  it('Titel, Sprache, Überschriften und Beschriftungen stehen als Formatvorlagen', async () => {
    const x = unzipSync(await bericht()), doc = strFromU8(x['word/document.xml']!), stile = strFromU8(x['word/styles.xml']!), kern = strFromU8(x['docProps/core.xml']!);
    expect(kern).toContain('<dc:title>Testbericht</dc:title>');
    expect(stile).toMatch(/<w:lang w:val="[a-z]{2}-[A-Z]{2}"/);
    expect(doc).toMatch(/w:val="Heading1"/); expect(doc).toMatch(/w:val="Heading2"/); expect(doc).toMatch(/w:val="Title"/); expect(doc).toMatch(/w:val="Caption"/);
    expect(doc).toContain('<w:tblLook'); expect(doc).toMatch(/w:firstColumn="1"|w:firstColumn="true"|w:val="[0-9A-Fa-f]*"[^>]*w:firstColumn/);
  });
});

describe('Schalter „Bildbeschreibungen im Text“ (Word)', () => {
  const quelle = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');
  it('Einstellung gibt es, ist standardmäßig an und wird beim Export an Word weitergegeben', () => {
    expect(quelle('./sitzung.svelte.ts')).toMatch(/wordBildbeschreibungen\?: boolean/);
    expect(quelle('./export.ts')).toMatch(/opt\.bildbeschreibungen \?\? s\.einst\.wordBildbeschreibungen !== false/);
  });
  it('Echtes Kontrollkästchen mit sichtbarem Namen im Bericht und in den Einstellungen', () => {
    for (const f of ['../seiten/Bericht.svelte', '../seiten/Einstellungen.svelte']) {
      const q = quelle(f);
      const m = /<label[^>]*>(?:(?!<\/label>)[\s\S])*wordBildbeschreibungen(?:(?!<\/label>)[\s\S])*<\/label>/.exec(q);
      expect(m, f).not.toBeNull();
      expect(m![0], f).toContain('type="checkbox"');
      expect(m![0], f).toContain('Bildbeschreibungen im Text');
    }
  });
});

describe('Gegenprobe: der Wächter wird rot, wenn der Fehler drin ist', () => {
  it('Alternativtext entfernt', async () => {
    const b = pruefeDocx(aendere(await bericht(), 'word/document.xml', x => x.replace(/ descr="[^"]*"/g, '')));
    expect(regeln(b)).toContain('bild-alt');
  });
  it('Alternativtext nur der Titel', async () => {
    const b = pruefeDocx(aendere(await bericht(), 'word/document.xml', x => x.replace(/(<wp:docPr\b[^>]*?) descr="[^"]*"([^>]*?title="([^"]*)")/g, '$1 descr="$3"$2')));
    expect(regeln(b)).toContain('bild-alt');
  });
  it('BookAccess-Zeichen im Alternativtext', async () => {
    const b = pruefeDocx(aendere(await bericht(), 'word/document.xml', x => x.replace(/ descr="/, ' descr="x { y } ^ | --- ')));
    expect(regeln(b)).toContain('bild-zeichen');
  });
  it('Kopfzeile entfernt', async () => {
    const b = pruefeDocx(aendere(await bericht(), 'word/document.xml', x => x.replace(/<w:tblHeader\s*\/>|<w:tblHeader [^>]*\/>/g, '')));
    expect(regeln(b)).toContain('tabelle-kopf');
  });
  it('Sprache entfernt', async () => {
    const z = unzipSync(await bericht());
    for (const f of ['word/styles.xml', 'word/document.xml']) z[f] = strToU8(strFromU8(z[f]!).replace(/<w:lang\b[^>]*\/>/g, ''));
    expect(regeln(pruefeDocx(zipSync(z)))).toContain('sprache');
  });
  it('Titel entfernt', async () => {
    expect(regeln(pruefeDocx(aendere(await bericht(), 'docProps/core.xml', x => x.replace(/<dc:title>[\s\S]*?<\/dc:title>/, ''))))).toContain('titel');
  });
  it('Überschrift springt von Ebene 1 auf Ebene 3', async () => {
    const b = pruefeDocx(aendere(await bericht(), 'word/document.xml', x => x.replace(/<w:pStyle w:val="Heading2"\s*\/>/g, '<w:pStyle w:val="Heading3"/>')));
    expect(regeln(b)).toContain('ueberschrift-sprung');
  });
  it('Überschrift ohne Formatvorlage und zwei leere Absätze', async () => {
    const b = pruefeDocx(aendere(await bericht(), 'word/document.xml', x => x.replace(/<w:pStyle w:val="Heading[12]"\s*\/>/g, '').replace(/<w:body>/, '<w:body><w:p/><w:p/>')));
    expect(regeln(b)).toEqual(expect.arrayContaining(['ueberschrift', 'leere-absaetze']));
  });
});

describe('Excel-Blattnamen', () => {
  it('höchstens 31 Zeichen, ohne verbotene Zeichen, eindeutig', () => {
    const benutzt = new Set<string>();
    const a = blattName('1 Test bei unabhängigen Stichproben: [Alter] / Gruppe?', benutzt), b = blattName('1 Test bei unabhängigen Stichproben: [Alter] / Gruppe?', benutzt);
    expect(a.length).toBeLessThanOrEqual(31); expect(b.length).toBeLessThanOrEqual(31);
    expect(a).not.toMatch(/[:\\/?*[\]]/); expect(a).not.toBe(b);
  });
});
