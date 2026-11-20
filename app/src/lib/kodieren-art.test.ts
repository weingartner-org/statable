/** Stufe A3: `legeMemoAn` mit optionaler Art (fehlt oder 'memo' = wie bisher, Feld nicht gesetzt). */
import { describe, expect, it } from 'vitest';
import { legeMemoAn } from './kodieren';
import { neuesQualProjekt } from './qualprojekt';

describe('legeMemoAn mit Art', () => {
  it('ohne Art und mit „memo“ bleibt das Feld weg', () => {
    const q = neuesQualProjekt('T');
    const a = legeMemoAn(q, { art: 'projekt' }, 'Text');
    const b = legeMemoAn(q, { art: 'projekt' }, 'Text', undefined, undefined, 'memo');
    expect('art' in a.q.memos[0]!).toBe(false);
    expect('art' in b.q.memos[0]!).toBe(false);
  });
  it('setzt die Art, wenn sie gegeben ist', () => {
    const q = neuesQualProjekt('T');
    const r = legeMemoAn(q, { art: 'projekt' }, 'Heute habe ich gemerkt …', 'Tag 1', 'k', 'tagebuch');
    expect(r.q.memos[0]!.art).toBe('tagebuch');
    expect(r.q.memos[0]!.titel).toBe('Tag 1');
    expect(r.q.memos[0]!.kodierende).toBe('k');
  });
  it('leerer Text legt nichts an', () => {
    const q = neuesQualProjekt('T');
    expect(legeMemoAn(q, { art: 'projekt' }, '  ', undefined, undefined, 'tagebuch').id).toBe('');
  });
});
