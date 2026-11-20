/** Export einzelner Tabellen und Abbildungen: APA-HTML (Linien, Titel, Zahlen) und PNG mit dpi-Angabe. */
import { describe, expect, it } from 'vitest';
import type { TableItem } from '../engine/types';
import { tabelleDe } from './export';
import { apaHtml, apaText } from './tabellenexport';
import { druckFaktor, pngMitDpi, pngDpi } from './pngdpi';

const tabelle = (zeilen: [string, number | undefined][][], kopf: string[], fuss: string[] = []): TableItem => {
  const cells = [...kopf.map((t, c) => ({ r: 0, c, rs: 1, cs: 1, t, h: true, x: true })), ...zeilen.flatMap((z, r) => z.map(([t, n], c) => ({ r: r + 1, c, rs: 1, cs: 1, t, h: false, x: false, ...(n !== undefined ? { n } : {}) })))];
  return { type: 'table', label: 'T', layer: [], title: { t: 'Korrelationen <ausgewählt>', x: false }, rows: zeilen.length + 1, cols: kopf.length, headRows: [1, 1], headCols: [0, 0], cells, caption: null, footnotes: fuss.map(t => ({ t })) } as never;
};
const tb = tabelleDe(tabelle([[['Mathe', undefined], ['-.98', -0.98], ['.000', 0]], [['Deutsch', undefined], ['.35', 0.35], ['.040', 0.04]]], ['', 'r', 'Sig. (2-tailed)'], ['p zweiseitig.']), null);

describe('APA-HTML einer Tabelle', () => {
  const html = apaHtml(tb, 3);
  it('Nummer fett, Titel kursiv in der nächsten Zeile, Anmerkung kursiv eingeleitet', () => {
    expect(html).toContain('<b>Tabelle 3</b>');
    expect(html).toContain('<i>Korrelationen &lt;ausgewählt&gt;</i>');
    expect(html.indexOf('<b>Tabelle 3</b>')).toBeLessThan(html.indexOf('<i>Korrelationen'));
    expect(html).toContain('<i>Anmerkung. </i>p zweiseitig.');
  });
  it('nur waagrechte Linien: oben, unter dem Kopf, unten; nie senkrecht', () => {
    const zeilen = html.split('<tr>').slice(1);
    expect(zeilen).toHaveLength(3);
    expect(zeilen[0]).toContain('border-top:1pt solid');           // über dem Kopf
    expect(zeilen[0]).toContain('border-bottom:0.5pt solid');      // unter dem Kopf
    expect(zeilen[1]).not.toMatch(/border-(top|bottom):\d/);       // Rumpf ohne Linien
    expect(zeilen[2]).toContain('border-bottom:1pt solid');        // unter der Tabelle
    expect(html).not.toMatch(/border-(left|right):[^n]/);
    expect(html).toContain('border-left:none');
  });
  it('Zahlen rechtsbündig, Text links; Zahlen wie in der Word-Datei (Komma, Minus, p ohne führende Null)', () => {
    expect(html).toMatch(/text-align:right[^>]*>−,98</);
    expect(html).toMatch(/text-align:right[^>]*>&lt; ,001</);
    expect(html).toMatch(/text-align:left[^>]*>Mathe</);
    expect(html).toMatch(/text-align:right[^>]*>,040</);
  });
  it('Kopfzellen über Zahlenspalten rechtsbündig, die erste Kopfzelle links', () => {
    expect(html).toMatch(/text-align:left[^>]*>&nbsp;<\/th>/);
    expect(html).toMatch(/text-align:right[^>]*>r<\/th>/);
    expect(html).toMatch(/text-align:right[^>]*>Sig\. \(2-tailed\)<\/th>/);
  });
  it('englisch: „Table“ und „Note.“', () => {
    const en = apaHtml(tb, 1, true);
    expect(en).toContain('<b>Table 1</b>');
    expect(en).toContain('<i>Note. </i>');
  });
  it('Text-Ersatz mit Tabulatoren', () => {
    const t = apaText(tb, 2).split('\n');
    expect(t[0]).toBe('Tabelle 2');
    expect(t[2]).toBe('\tr\tSig. (2-tailed)');
    expect(t[3]).toBe('Mathe\t−,98\t<\u00a0,001');
  });
});

describe('PNG für den Druck', () => {
  it('Faktor: bei 16 cm Breite 300 dpi sind 1890 Pixel', () => {
    expect(Math.round(720 * druckFaktor(720))).toBe(1890);
    expect(Math.round(1890 * druckFaktor(1890))).toBe(1890);
  });
  it('Faktor ist auf 8000 Pixel Breite begrenzt', () => {
    expect(100 * druckFaktor(100, 100)).toBe(8000);
  });
  // kleinstes gültiges PNG: 1x1 Pixel
  const eins = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
  it('pHYs-Block mit 300 dpi = 11811 Punkte je Meter, Rest unverändert, gültige Prüfsumme', () => {
    const neu = pngMitDpi(eins, 300), dv = new DataView(neu.buffer);
    expect(neu.length).toBe(eins.length + 21);
    expect(String.fromCharCode(...neu.subarray(37, 41))).toBe('pHYs');
    expect(dv.getUint32(41)).toBe(11811);
    expect(dv.getUint32(45)).toBe(11811);
    expect(neu[49]).toBe(1);
    expect(pngDpi(neu)).toBe(300);
    expect([...neu.subarray(0, 33)]).toEqual([...eins.subarray(0, 33)]);
    expect([...neu.subarray(54)]).toEqual([...eins.subarray(33)]);
  });
  it('ersetzt einen vorhandenen Block, statt einen zweiten anzuhängen', () => {
    const zweimal = pngMitDpi(pngMitDpi(eins, 72), 300);
    expect(zweimal.length).toBe(eins.length + 21);
    expect(pngDpi(zweimal)).toBe(300);
  });
  it('lehnt Nicht-PNG ab', () => { expect(() => pngMitDpi(new Uint8Array(40), 300)).toThrow(); });
});
