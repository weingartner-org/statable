import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import { fallKategorieWord } from './kodieren-word';
import type { FkMatrix } from './kodieren-ansichten';

const M: FkMatrix = {
  zeilen: [{ id: 'f1', name: 'Anna' }, { id: 'dok:d4', name: 'Notiz ohne Fall' }],
  spalten: [{ code: 'c1', name: 'Lernen' }, { code: 'c4', name: 'Familie' }],
  zellen: [
    [{ belege: [{ segment: 's1', dokument: 'd1', start: 0, ende: 32, text: 'Ich lerne abends & „viel“.' }], zusammenfassung: 'Lernt abends.' }, { belege: [] }],
    [{ belege: [] }, { belege: [{ segment: 's9', dokument: 'd4', start: 0, ende: 41, text: 'Meine Eltern fragen oft.' }, { segment: 's10', dokument: 'd4', start: 42, ende: 50, text: 'Zweiter' }] }],
  ],
};

describe('Fall-Kategorie-Matrix als Word', () => {
  for (const sp of ['de', 'en'] as const) {
    it(`docx-pruefen ohne Befund (${sp}), Zusammenfassung und Ersatztext in der Tabelle`, async () => {
      const bytes = await fallKategorieWord(M, { sprache: sp, personen: 'Alle', mitUntercodes: true, mitBelegen: false });
      expect(pruefeDocx(bytes)).toEqual([]);
      const doc = strFromU8(unzipSync(bytes)['word/document.xml']!);
      expect(doc).toContain('Lernt abends.');
      expect(doc).toContain('Notiz ohne Fall');
      expect(doc).toContain(sp === 'de' ? '(2 Belege, keine Zusammenfassung)' : '(2 passages, no summary)');
      expect(doc).not.toContain('Meine Eltern fragen oft.');
    });
  }

  it('mit Belegen stehen die Zitate in der Datei', async () => {
    const bytes = await fallKategorieWord(M, { sprache: 'de', personen: 'Ich', mitUntercodes: false, mitBelegen: true });
    expect(pruefeDocx(bytes)).toEqual([]);
    const doc = strFromU8(unzipSync(bytes)['word/document.xml']!);
    expect(doc).toContain('Meine Eltern fragen oft.');
    expect(doc).toContain('wörtliche Zitate');
  });

  it('leere Matrix: Hinweis statt Tabelle', async () => {
    const bytes = await fallKategorieWord({ zeilen: [], spalten: [], zellen: [] }, { sprache: 'de', personen: 'Alle', mitUntercodes: true, mitBelegen: false });
    expect(pruefeDocx(bytes)).toEqual([]);
    expect(strFromU8(unzipSync(bytes)['word/document.xml']!)).toContain('Die Matrix ist leer.');
  });
});
