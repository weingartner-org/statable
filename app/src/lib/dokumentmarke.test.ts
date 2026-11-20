/** Wächter für die gemeinsame Dokumentmarke (Logo, statable.eu, Datum, Seitenzahl). */
import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import type { TableItem } from '../engine/types';
import type { Blatt } from './sitzung.svelte';
import { baueBerichtWord } from './export';
import { fussText, logoSvg, excelFuss, MARKE } from './dokumentmarke';
import { logoInhalt } from './logo';

const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
const blatt = { id: 'a', titel: 'A', art: 'x', l1: null, l2: null, syntax: '', items: [], ergebnis: null, imBericht: true, notiz: '', zeit: 0 } as never as Blatt;
async function word(logo?: Uint8Array) {
  const D = await import('docx');
  const doc = baueBerichtWord(D, [blatt], [], 'Bericht', null, () => [], undefined, { logo }, () => [] as TableItem[]);
  return unzipSync(new Uint8Array(await D.Packer.toBuffer(doc)));
}

describe('Dokumentmarke', () => {
  it('fussText: Adresse und Datum', () => { expect(fussText('10.11.2026')).toBe('statable.eu · 10.11.2026'); });
  it('logoSvg enthält das Logo aus logo.ts', () => {
    const s = logoSvg('x', 16);
    expect(s).toContain(logoInhalt('x')); expect(s).toContain('viewBox="0 0 64 64"'); expect(s).toContain('aria-hidden="true"');
  });
  it('Fußgrau hat auf Weiß mindestens 4,5:1', () => {
    const l = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i]!, 0);
    expect(1.05 / (l(MARKE.fussGrau) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
  it('Word ohne Logo: Fußzeile mit statable.eu und Seitenzahl-Feldern', async () => {
    const z = await word(), f = Object.keys(z).filter(k => /^word\/footer\d*\.xml$/.test(k));
    expect(f.length).toBe(1);
    const x = strFromU8(z[f[0]!]!);
    expect(x).toContain('statable.eu'); expect(x).toMatch(/PAGE/); expect(x).toMatch(/NUMPAGES/); expect(x).not.toContain('<w:drawing');
  });
  it('Word mit Logo: Bild mit Alternativtext in der Fußzeile', async () => {
    const x = strFromU8((await word(PNG))['word/footer1.xml']!);
    expect(x).toMatch(/<wp:docPr\b[^>]*descr="[^"]+"/);
  });
  it('excelFuss setzt die gedruckte Fußzeile', () => {
    const ws: { headerFooter: { oddFooter?: string } } = { headerFooter: {} };
    excelFuss(ws);
    expect(ws.headerFooter.oddFooter).toContain('statable.eu'); expect(ws.headerFooter.oddFooter).toContain('&P'); expect(ws.headerFooter.oddFooter).toContain('&D');
  });
});
