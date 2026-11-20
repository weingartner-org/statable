import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import { belegeWord } from './kodieren-word';

describe('Belege als Word', () => {
  for (const sp of ['de', 'en'] as const) {
    it(`docx-pruefen ohne Befund (${sp}), Inhalt in der Tabelle`, async () => {
      const bytes = await belegeWord([
        { dokument: 'Interview 1', fall: 'Anna', stelle: sp === 'de' ? 'Absatz 4' : 'Paragraph 4', text: 'Ich hatte „viel“ zu tun & wenig Zeit.' },
        { dokument: 'Interview 2', fall: '', stelle: 'Absatz 1', text: 'Zweiter Beleg' },
      ], { code: 'Belastung', filter: 'Geschlecht = w', sprache: sp });
      expect(pruefeDocx(bytes)).toEqual([]);
      const doc = strFromU8(unzipSync(bytes)['word/document.xml']!);
      expect(doc).toContain('Belastung'); expect(doc).toContain('Interview 2'); expect(doc).toContain('Geschlecht = w');
      expect(doc).toContain(sp === 'de' ? 'Dokument' : 'Document');
    });
  }
  it('mit Untercodes eine Spalte Code; ohne Stellen ein Hinweis', async () => {
    const a = strFromU8(unzipSync(await belegeWord([{ dokument: 'D', fall: 'F', stelle: 'Absatz 1', text: 't', code: 'Belastung: hoch' }], { code: 'Belastung', sprache: 'de' }))['word/document.xml']!);
    expect(a).toContain('Belastung: hoch');
    const leer = await belegeWord([], { code: 'X', sprache: 'de' });
    expect(pruefeDocx(leer)).toEqual([]);
    expect(strFromU8(unzipSync(leer)['word/document.xml']!)).toContain('Es gibt keine Stellen');
  });
});
