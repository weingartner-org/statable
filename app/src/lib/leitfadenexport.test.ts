import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import { aendereBlock, neuerBlock, neuerLeitfaden, ordneZu, sammleFragen, setzeStatus, type Leitfaden } from './leitfaden';
import { leitfadenDateiname, leitfadenMitnehmenWord, leitfadenWord } from './leitfadenexport';

function beispiel(sprache: 'de' | 'en' = 'de'): Leitfaden {
  let lf = neuerLeitfaden(sprache === 'de' ? 'Studienzeit <&> Test' : 'Study time', sprache);
  lf = { ...lf, forschungsfrage: 'Wie erleben Studierende ihren Alltag?' };
  lf = sammleFragen(lf, 'Wie alt sind Sie?\nWarum haben Sie das getan?\nErzählen Sie von Ihrem Tag.');
  lf = setzeStatus(lf, lf.gesammelt[0]!.id, 'kurzfragebogen');
  lf = setzeStatus(lf, lf.gesammelt[1]!.id, 'gestrichen', 'klingt wie ein Vorwurf');
  const a = neuerBlock(lf, 'Alltag'); lf = a.leitfaden;
  lf = aendereBlock(lf, a.id, { erzaehlaufforderung: 'Erzählen Sie von einem typischen Tag.', aspekte: ['Zeitplanung', 'Stress'], konkret: ['Wie viele Stunden lernen Sie?'], aufrechterhaltung: ['Und dann?'] });
  lf = setzeStatus(lf, lf.gesammelt[2]!.id, 'behalten'); lf = ordneZu(lf, lf.gesammelt[2]!.id, a.id);
  return lf;
}
const docXml = (b: Uint8Array) => strFromU8(unzipSync(b)['word/document.xml']!);

describe('Leitfaden als Word', () => {
  for (const sp of ['de', 'en'] as const) {
    it(`${sp}: Tabellenfassung ohne Befund, mit Kopfzeile, Sprache und Titel`, async () => {
      const b = await leitfadenWord(beispiel(sp), { gestrichen: true });
      expect(pruefeDocx(b)).toEqual([]);
      const x = docXml(b);
      expect(x).toContain('w:tblHeader');
      expect(x).toContain(sp === 'de' ? 'Erzählaufforderung (Leitfrage)' : 'Narrative prompt');
      expect(x).toContain(sp === 'de' ? 'Block 1: Alltag' : 'Block 1:');
      expect(x).toContain('Zeitplanung');
      expect(x).toContain(sp === 'de' ? 'Gestrichene Fragen' : 'Deleted questions');
      expect(x).toContain('klingt wie ein Vorwurf');
      expect(strFromU8(unzipSync(b)['word/styles.xml']!)).toContain(`w:lang w:val="${sp}"`);
    });
  }
  it('Spaltenreihenfolge nach Entscheid 10', async () => {
    const x = docXml(await leitfadenWord(beispiel()));
    const pos = ['Erzählaufforderung (Leitfrage)', 'Inhaltliche Aspekte (Check)', 'Konkrete Fragen', 'Aufrechterhaltungsfragen'].map(s => x.indexOf(s));
    expect(pos.every(p => p > 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
  });
  it('gestrichene Fragen fehlen ohne Schalter, Kurzfragebogen steht', async () => {
    const x = docXml(await leitfadenWord(beispiel()));
    expect(x).not.toContain('klingt wie ein Vorwurf');
    expect(x).toContain('Für den Kurzfragebogen');
    expect(x).toContain('Wie alt sind Sie?');
  });
  it('Sonderzeichen im Titel bleiben Text, Datei bleibt gültig', async () => {
    const b = await leitfadenWord(beispiel());
    expect(pruefeDocx(b)).toEqual([]);
    expect(docXml(b)).toContain('&lt;&amp;&gt;');
  });
  it('Fassung zum Mitnehmen: 16 pt, ohne Tabelle, ohne Befund', async () => {
    const b = await leitfadenMitnehmenWord(beispiel());
    expect(pruefeDocx(b)).toEqual([]);
    const x = docXml(b);
    expect(x).not.toContain('<w:tbl>');
    expect(x).toContain('w:val="32"');
    expect(x).toContain('Erzählen Sie von einem typischen Tag.');
    expect(x).toContain('Stress');
    expect(x).not.toContain('Und dann?');
  });
  it('leerer Leitfaden geht auch', async () => {
    const lf = neuerLeitfaden('', 'de');
    expect(pruefeDocx(await leitfadenWord(lf))).toEqual([]);
    expect(pruefeDocx(await leitfadenMitnehmenWord(lf))).toEqual([]);
  });
  it('Dateiname ohne verbotene Zeichen', () => {
    expect(leitfadenDateiname(neuerLeitfaden('A/B: c?', 'de'))).toBe('AB c.docx');
    expect(leitfadenDateiname(neuerLeitfaden('X', 'de'), true)).toBe('X-zum-Mitnehmen.docx');
  });
});
