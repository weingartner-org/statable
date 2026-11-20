/** Stufe A3: Fall-Kategorie-Matrix mit Themen als Spalten, Zusammenfassungen je Thema getrennt von denen der Codes. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import { fallKategorieMatrix, setzeZusammenfassung } from './kodieren-ansichten';
import { ordneBelegZu, ordneCodeZu, legeThemaAn, setzeThemaStand } from './themen';
import { fallKategorieWord } from './kodieren-word';
import { pruefeQualProjekt, qualFassung, type QualProjekt } from './qualprojekt';

const PFAD = fileURLToPath(new URL('../../../docs/erheben/stufe6c/testprojekt-6c.json', import.meta.url));
const basis: QualProjekt = pruefeQualProjekt(JSON.parse(readFileSync(PFAD, 'utf8')));

function mitThemen(): { q: QualProjekt; t1: string; t2: string; t3: string } {
  let q = basis;
  const a = legeThemaAn(q, 'Lernweg'); q = a.q;
  const b = legeThemaAn(q, 'Sorgen'); q = b.q;
  const c = legeThemaAn(q, 'Altes Thema'); q = c.q;
  q = ordneCodeZu(q, a.id, 'c1', true);
  q = ordneCodeZu(q, a.id, 'c3', true);
  q = ordneCodeZu(q, b.id, 'c2', true);
  q = setzeThemaStand(q, c.id, 'verworfen', 'passt nicht');
  return { q, t1: a.id, t2: b.id, t3: c.id };
}

describe('Fall-Kategorie-Matrix mit Themen', () => {
  const { q, t1, t2 } = mitThemen();

  it('Spalten sind die Themen (Art thema), Zellen aus Stellen mit Codes des Themas', () => {
    const m = fallKategorieMatrix(q, { codes: [], kodierende: 'alle', mitUntercodes: true, themen: [t1, t2] });
    expect(m.spalten).toEqual([{ code: t1, name: 'Lernweg', art: 'thema' }, { code: t2, name: 'Sorgen', art: 'thema' }]);
    const code = fallKategorieMatrix(q, { codes: ['c1', 'c3'], kodierende: 'alle', mitUntercodes: false });
    for (let z = 0; z < m.zeilen.length; z++) {
      const erwartet = new Set([...code.zellen[z]![0]!.belege, ...code.zellen[z]![1]!.belege].map(b => b.segment));
      expect(new Set(m.zellen[z]![0]!.belege.map(b => b.segment))).toEqual(erwartet);
    }
    expect(m.zellen.flat().every(z => z.zusammenfassung === undefined)).toBe(true);
  });

  it('ausdrücklich gewählte Belege stehen zuerst, auch ohne Code des Themas', () => {
    const f1 = fallKategorieMatrix(q, { codes: [], kodierende: 'alle', mitUntercodes: true, themen: [t2] });
    const alle = f1.zellen[0]![0]!.belege;
    const fremd = fallKategorieMatrix(q, { codes: ['c1'], kodierende: 'alle', mitUntercodes: false }).zellen[0]![0]!.belege.find(b => !alle.some(x => x.segment === b.segment))!;
    expect(fremd).toBeTruthy();
    const q2 = ordneBelegZu(q, t2, fremd.segment, true);
    const m = fallKategorieMatrix(q2, { codes: [], kodierende: 'alle', mitUntercodes: true, themen: [t2] });
    expect(m.zellen[0]![0]!.belege[0]!.segment).toBe(fremd.segment);
    expect(m.zellen[0]![0]!.belege.length).toBe(alle.length + 1);
  });

  it('Zusammenfassung je Thema mit art thema, getrennt von der Zusammenfassung zum Code', () => {
    let r = setzeZusammenfassung(q, 'f1', t1, 'Anna geht den Weg langsam.', 'p1', 'thema');
    r = setzeZusammenfassung(r, 'f1', 'c1', 'Anna lernt abends.', 'p1');
    expect(r.zusammenfassungen).toHaveLength(2);
    expect(r.zusammenfassungen!.find(z => z.code === t1)!.art).toBe('thema');
    expect(r.zusammenfassungen!.find(z => z.code === 'c1')!.art).toBeUndefined();
    const mt = fallKategorieMatrix(r, { codes: [], kodierende: 'alle', mitUntercodes: true, themen: [t1] });
    expect(mt.zellen[0]![0]!.zusammenfassung).toBe('Anna geht den Weg langsam.');
    const mc = fallKategorieMatrix(r, { codes: ['c1'], kodierende: 'alle', mitUntercodes: false });
    expect(mc.zellen[0]![0]!.zusammenfassung).toBe('Anna lernt abends.');
    const leer = setzeZusammenfassung(r, 'f1', t1, '  ', undefined, 'thema');
    expect(leer.zusammenfassungen!.map(z => z.code)).toEqual(['c1']);
    expect(qualFassung(r)).toBe(3);
  });

  it('unbekanntes Thema und unbekannter Code ändern nichts', () => {
    expect(setzeZusammenfassung(q, 'f1', 'gibtsnicht', 'x', undefined, 'thema')).toBe(q);
    expect(setzeZusammenfassung(q, 'f1', t1, 'x')).toBe(q);
  });

  it('bestehende Code-Matrix bleibt gleich (ohne themen)', () => {
    const a = fallKategorieMatrix(basis, { codes: ['c1', 'c4'], kodierende: 'alle', mitUntercodes: true });
    const b = fallKategorieMatrix(q, { codes: ['c1', 'c4'], kodierende: 'alle', mitUntercodes: true });
    expect(b).toEqual(a);
    expect(a.spalten.every(s => s.art === undefined)).toBe(true);
  });

  it('Word mit Themen-Spalten', async () => {
    const r = setzeZusammenfassung(q, 'f1', t1, 'Anna geht den Weg langsam.', 'p1', 'thema');
    const m = fallKategorieMatrix(r, { codes: [], kodierende: 'alle', mitUntercodes: true, themen: [t1, t2] });
    const bytes = await fallKategorieWord(m, { sprache: 'de', personen: 'Alle', mitUntercodes: true, mitBelegen: false, themen: true });
    expect(pruefeDocx(bytes)).toEqual([]);
    const doc = strFromU8(unzipSync(bytes)['word/document.xml']!);
    expect(doc).toContain('Lernweg'); expect(doc).toContain('Sorgen');
    expect(doc).toContain('Anna geht den Weg langsam.');
    expect(doc).toContain('Spalten sind Themen');
    expect(doc).not.toContain('Altes Thema');
  });
});
