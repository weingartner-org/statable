import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import { leseTranskript, transkriptDokument, vorschlagZuordnung } from './transkript-lesen';
import { betonungTeile, transkriptWordFL, RAND_RECHTS_TWIPS } from './transkript-word-fl';
import type { Dokument } from './qualprojekt';

const BEISPIEL = '../docs/feinstruktur/beispiele/interview-a-fl.txt';
async function dokumentAus(pfad: string, name: string): Promise<{ dok: Dokument; text: string }> {
  const text = readFileSync(pfad, 'utf8');
  const roh = await leseTranskript(name, new Uint8Array(readFileSync(pfad)));
  return { dok: transkriptDokument(roh, vorschlagZuordnung(roh), 'Interview A').dokument, text };
}
const xml = (b: Uint8Array) => strFromU8(unzipSync(b)['word/document.xml']!);
const sichtbar = (d: string) => [...d.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]!.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")).join('');

describe('Word nach Froschauer und Lueger', () => {
  it('Zeilennummern als Word-Eigenschaft, Abstand 1,5, Rand 3,5 cm, Kodierschema als Tabelle', async () => {
    const { dok } = await dokumentAus(BEISPIEL, 'interview-a-fl.txt');
    const bytes = await transkriptWordFL(dok, 'de');
    const d = xml(bytes);
    expect(d).toMatch(/<w:lnNumType\b[^>]*w:countBy="1"/);
    expect(d).toMatch(/<w:lnNumType\b[^>]*w:restart="continuous"/);
    expect(d).toContain('w:line="360"');
    expect(RAND_RECHTS_TWIPS).toBe(1984);
    expect(d).toMatch(/<w:pgMar\b[^>]*w:right="1984"/);
    // Zeilennummer nicht als Text: kein Absatz beginnt mit Ziffern und Tab/Leerzeichen
    expect(d).not.toMatch(/<w:t[^>]*>\s*\d+\s*<\/w:t><w:tab/);
    expect(d).not.toMatch(/<w:p\b[^>]*>(?:<w:pPr>[\s\S]*?<\/w:pPr>)?<w:r><w:t[^>]*>\d+[.)]?\s/);
    // Kodierschema
    expect(d).toContain('<w:tbl>');
    expect(d).toContain('<w:tblHeader');
    const tab = d.slice(d.indexOf('<w:tbl>'), d.indexOf('</w:tbl>'));
    const tabText = sichtbar(tab);
    expect(tabText).toContain('I1');
    expect(tabText).toContain('B1');
    expect(tabText).toContain('interviewende Person');
    expect(tabText).toContain('Befragte Person');
    // Zeitmarken wie im Text
    for (const z of ['[00:00:03]', '[00:00:11]', '[00:01:55]', '[00:02:21]']) expect(sichtbar(d)).toContain(z);
    // Angabe der Regeln
    expect(sichtbar(d)).toContain('nach Froschauer und Lueger');
  });

  it('alle Wörter des Transkripts kommen vor', async () => {
    const { dok, text } = await dokumentAus(BEISPIEL, 'interview-a-fl.txt');
    const ausgabe = sichtbar(xml(await transkriptWordFL(dok, 'de')));
    // Beiträge: alles nach der ersten Leerzeile des Textes
    const beitragsText = text.slice(text.indexOf('[00:00:03]'));
    const woerter = beitragsText.match(/[\p{L}\p{N}][\p{L}\p{N}'’:-]*/gu)!;
    const fehlen = woerter.filter((w) => !ausgabe.includes(w));
    expect(fehlen).toEqual([]);
  });

  it('docx-pruefen ohne Befund (de und en)', async () => {
    const { dok } = await dokumentAus(BEISPIEL, 'interview-a-fl.txt');
    for (const sp of ['de', 'en']) {
      const bytes = await transkriptWordFL(dok, sp);
      expect(pruefeDocx(bytes)).toEqual([]);
      const ordner = join(tmpdir(), 'statable-word-fl');
      mkdirSync(ordner, { recursive: true });
      writeFileSync(join(ordner, `interview-a-fl-${sp}.docx`), bytes);
    }
  });

  it('Betonung _Wort_ wird zu echter Unterstreichung, Unterstriche fallen weg', async () => {
    expect(betonungTeile('Das war _wirklich_ gut und a_b_c bleibt.')).toEqual([
      { text: 'Das war ', unterstrichen: false }, { text: 'wirklich', unterstrichen: true }, { text: ' gut und a_b_c bleibt.', unterstrichen: false }
    ]);
    const { dok } = await dokumentAus(BEISPIEL, 'interview-a-fl.txt');
    const d2: Dokument = { ...dok, text: dok.text.replace('Des hab i erst', '_Des_ hab i erst') };
    // Positionen verschieben sich um zwei Zeichen: Abschnitte ab dem zweiten Beitrag mitschieben
    const pos = dok.text.indexOf('Des hab i erst');
    d2.transkript = { ...dok.transkript!, abschnitte: dok.transkript!.abschnitte.map((a) => ({ ...a, start: a.start > pos ? a.start + 2 : a.start, ende: a.ende > pos ? a.ende + 2 : a.ende })) };
    const d = xml(await transkriptWordFL(d2, 'de'));
    expect(d).toMatch(/<w:u w:val="single"\/>[\s\S]{0,200}<w:t[^>]*>Des<\/w:t>/);
    expect(sichtbar(d)).not.toContain('_Des_');
    expect(pruefeDocx(await transkriptWordFL(d2, 'de'))).toEqual([]);
  });
});
