import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { dokumentAusText, leseDokument, pdfZeilenZuText, textAusBytes } from './dokument-lesen';

const bytes = (...teile: number[][]) => Uint8Array.from(teile.flat());
const utf16le = (s: string) => bytes([0xff, 0xfe], [...s].flatMap(c => [c.charCodeAt(0) & 255, c.charCodeAt(0) >> 8]));
const utf16be = (s: string) => bytes([0xfe, 0xff], [...s].flatMap(c => [c.charCodeAt(0) >> 8, c.charCodeAt(0) & 255]));

/** Kleines, gültiges PDF von Hand (eine Textzeile je Eintrag, Helvetica, ASCII), seit jsPDF aus Statable entfernt ist. Leere Seitenliste-Einträge = Seite ohne Text. */
function minipdf(seiten: string[][]): Uint8Array {
  const obj: string[] = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
  const kinder: number[] = [];
  for (const zeilen of seiten) {
    const inhalt = zeilen.map((z, i) => `BT /F1 12 Tf 56 ${780 - 20 * i} Td (${z.replace(/[\\()]/g, m => '\\' + m)}) Tj ET`).join('\n');
    obj.push(`<< /Length ${inhalt.length} >>\nstream\n${inhalt}\nendstream`);
    obj.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${obj.length} 0 R >>`);
    kinder.push(obj.length);
  }
  obj[1] = `<< /Type /Pages /Kids [${kinder.map(k => `${k} 0 R`).join(' ')}] /Count ${kinder.length} >>`;
  let s = '%PDF-1.4\n';
  const lage: number[] = [];
  obj.forEach((o, i) => { lage.push(s.length); s += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = s.length;
  s += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n` + lage.map(l => `${String(l).padStart(10, '0')} 00000 n \n`).join('');
  s += `trailer\n<< /Size ${obj.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return strToU8(s);
}

describe('Text einlesen', () => {
  it('UTF-8 mit BOM: BOM weg, Hinweis', async () => {
    const roh = bytes([0xef, 0xbb, 0xbf], [...strToU8('Grüße aus dem Büro')]);
    const r = await leseDokument('a.txt', roh);
    expect(r.text).toBe('Grüße aus dem Büro');
    expect(r.hinweise.length).toBe(1);
    expect(r.art).toBe('text');
  });
  it('UTF-8 ohne BOM: kein Hinweis', async () => {
    const r = await leseDokument('a.txt', strToU8('Hallo Welt'));
    expect(r.text).toBe('Hallo Welt');
    expect(r.hinweise).toEqual([]);
  });
  it('UTF-16 LE und BE mit BOM', () => {
    expect(textAusBytes(utf16le('Größe')).text).toBe('Größe');
    expect(textAusBytes(utf16be('Größe')).text).toBe('Größe');
    expect(textAusBytes(utf16le('x')).hinweise.length).toBe(1);
  });
  it('Windows-1252 als Rückfall mit Hinweis', () => {
    const r = textAusBytes(bytes([0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72]));
    expect(r.text).toBe('Müller');
    expect(r.hinweise.length).toBe(1);
  });
  it('leere Datei: Fehler', async () => {
    await expect(leseDokument('a.txt', strToU8('  \n '))).rejects.toThrow();
  });
  it('Zeilenumbrüche \\r\\n bleiben unverändert', async () => {
    expect((await leseDokument('a.txt', strToU8('a\r\nb'))).text).toBe('a\r\nb');
  });
});

describe('Word einlesen', () => {
  it('docx: Absätze mit Umlauten', async () => {
    const xml = '<?xml version="1.0"?><w:document xmlns:w="x"><w:body><w:p><w:r><w:t>Erster Absatz äöü</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">Zweiter </w:t></w:r><w:r><w:t>Absatz &amp; mehr</w:t></w:r></w:p></w:body></w:document>';
    const docx = zipSync({ 'word/document.xml': strToU8(xml) });
    const r = await leseDokument('b.docx', docx);
    expect(r.text).toBe('Erster Absatz äöü\nZweiter Absatz & mehr');
    expect(r.art).toBe('text');
  });
  it('kaputte docx: Fehler', async () => {
    await expect(leseDokument('b.docx', strToU8('kein zip'))).rejects.toThrow();
  });
  it('.rtf: verständlicher Fehler', async () => {
    await expect(leseDokument('b.rtf', strToU8('{\\rtf1 x}'))).rejects.toThrow(/docx/);
  });
});

describe('PDF-Zeilen zusammenfügen', () => {
  it('Silbentrennung', () => {
    expect(pdfZeilenZuText([['Die Ver-', 'bindung steht.']])).toBe('Die Verbindung steht.');
  });
  it('Zeile ohne Satzzeichen + klein: Leerzeichen', () => {
    expect(pdfZeilenZuText([['Ich ging nach', 'Hause und las.']])).toBe('Ich ging nach Hause und las.');
  });
  it('Punkt + groß: neuer Absatz', () => {
    expect(pdfZeilenZuText([['Das war schön.', 'Dann kam der Winter.']])).toBe('Das war schön.\nDann kam der Winter.');
  });
  it('ohne Satzzeichen + groß: Leerzeichen (Namen)', () => {
    expect(pdfZeilenZuText([['Ich sprach mit', 'Frau Meier.']])).toBe('Ich sprach mit Frau Meier.');
  });
  it('zwei Seiten mit Leerzeile dazwischen', () => {
    expect(pdfZeilenZuText([['Seite eins.'], ['Seite zwei.']])).toBe('Seite eins.\n\nSeite zwei.');
  });
  it('leere Seiten werden übersprungen, alles leer: leer', () => {
    expect(pdfZeilenZuText([[''], ['  ']])).toBe('');
  });
  it('Bindestrich vor Großbuchstaben bleibt (Ost-West)', () => {
    expect(pdfZeilenZuText([['Ost-', 'West-Verbindung']])).toBe('Ost- West-Verbindung');
  });
});

describe('PDF einlesen (echtes PDF von Hand, pdfjs in Node)', () => {
  it('liest Text aus einem erzeugten PDF', async () => {
    const roh = minipdf([['Das erste Interview war lang.', 'Es ging um den Studienalltag.'], ['Zweite Seite.']]);
    const modul = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const r = await leseDokument('c.pdf', roh, { pdfModul: modul as never });
    expect(r.art).toBe('pdftext');
    expect(r.text).toBe('Das erste Interview war lang.\nEs ging um den Studienalltag.\n\nZweite Seite.');
    expect(r.hinweise[0]).toMatch(/PDF/);
  });
  it('PDF ohne Text: Fehler mit Kernsatz', async () => {
    const roh = minipdf([[]]);
    const modul = await import('pdfjs-dist/legacy/build/pdf.mjs');
    await expect(leseDokument('d.pdf', roh, { pdfModul: modul as never })).rejects.toThrow(/Gescannte PDFs/);
  });
});

describe('Dokument bauen', () => {
  it('dokumentAusText legt Text, Art und Zeiten fest', () => {
    const d = dokumentAusText(' Interview 1 ', 'Text', 'pdftext', 'de');
    expect(d.name).toBe('Interview 1');
    expect(d.art).toBe('pdftext');
    expect(d.sprache).toBe('de');
    expect(d.id).toMatch(/[0-9a-f-]{36}/);
    expect(d.erstellt).toBe(d.geaendert);
    expect(dokumentAusText('x', 'y', 'text').sprache).toBeUndefined();
  });
});
