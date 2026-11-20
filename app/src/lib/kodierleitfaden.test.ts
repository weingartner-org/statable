import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import type { Code } from './qualprojekt';
import { aendereCode, baumListe, eineEbeneHoeher, eineEbeneTiefer, entferne, findeKonflikte, fuegeEin, geschwister, kodierleitfadenWord, luecken, nachOben, nachUnten, neuerCode, renummeriere, unterkategorien, vollstaendigkeit } from './kodierleitfaden';

const c = (id: string, name: string, reihenfolge: number, extra: Partial<Code> = {}): Code => ({ id, name, kodierbar: true, reihenfolge, ...extra });
/** A(0){A1(0){A1a(0)},A2(1)}, B(1), C(2) */
const baum = (): Code[] => [c('a', 'A', 0), c('a1', 'A1', 0, { elternId: 'a' }), c('a1a', 'A1a', 0, { elternId: 'a1' }), c('a2', 'A2', 1, { elternId: 'a' }), c('b', 'B', 1), c('cc', 'C', 2)];
const namen = (cs: Code[]) => baumListe(cs).map(e => `${'-'.repeat(e.ebene)}${e.code.name}`);

describe('Baum', () => {
  it('baumListe: Tiefensuche mit Ebenen', () => { expect(namen(baum())).toEqual(['A', '-A1', '--A1a', '-A2', 'B', 'C']); });
  it('neuer Code und Unterkategorie hinten in der Gruppe', () => {
    const r = neuerCode(baum(), ' D ');
    expect(r.codes.find(k => k.id === r.id)).toMatchObject({ name: 'D', reihenfolge: 3, kodierbar: true });
    const u = neuerCode(baum(), 'A3', 'a');
    expect(u.codes.find(k => k.id === u.id)).toMatchObject({ elternId: 'a', reihenfolge: 2 });
    expect(namen(u.codes)).toEqual(['A', '-A1', '--A1a', '-A2', '-A3', 'B', 'C']);
  });
  it('Eingabeliste bleibt unverändert', () => { const b = baum(), kopie = JSON.stringify(b); nachUnten(b, 'a'); entferne(b, 'a'); eineEbeneTiefer(b, 'b'); expect(JSON.stringify(b)).toBe(kopie); });
  it('nach oben und unten innerhalb der Gruppe; am Rand keine Änderung', () => {
    expect(namen(nachUnten(baum(), 'a'))).toEqual(['B', 'A', '-A1', '--A1a', '-A2', 'C']);
    expect(namen(nachOben(baum(), 'cc'))).toEqual(['A', '-A1', '--A1a', '-A2', 'C', 'B']);
    expect(nachOben(baum(), 'a')).toEqual(baum());
    expect(nachUnten(baum(), 'cc')).toEqual(baum());
    expect(namen(nachUnten(baum(), 'a1'))).toEqual(['A', '-A2', '-A1', '--A1a', 'B', 'C']);
  });
  it('eine Ebene tiefer: unter den Code davor, ans Ende; ohne Vorgänger nichts', () => {
    expect(namen(eineEbeneTiefer(baum(), 'b'))).toEqual(['A', '-A1', '--A1a', '-A2', '-B', 'C']);
    expect(eineEbeneTiefer(baum(), 'a')).toEqual(baum());
    expect(eineEbeneTiefer(baum(), 'a1')).toEqual(baum());
    const r = eineEbeneTiefer(baum(), 'cc');
    expect(geschwister(r, undefined).map(k => k.name)).toEqual(['A', 'B']);
    expect(geschwister(r, 'b').map(k => k.name)).toEqual(['C']);
  });
  it('eine Ebene höher: Geschwister der Eltern, direkt dahinter; Hauptkategorie bleibt', () => {
    expect(namen(eineEbeneHoeher(baum(), 'a1'))).toEqual(['A', '-A2', 'A1', '-A1a', 'B', 'C']);
    expect(namen(eineEbeneHoeher(baum(), 'a1a'))).toEqual(['A', '-A1', '-A1a', '-A2', 'B', 'C']);
    expect(eineEbeneHoeher(baum(), 'b')).toEqual(baum());
    const r = eineEbeneHoeher(baum(), 'a1');
    expect(geschwister(r, undefined).map(k => [k.name, k.reihenfolge])).toEqual([['A', 0], ['A1', 1], ['B', 2], ['C', 3]]);
    expect(r.find(k => k.id === 'a1')!.elternId).toBeUndefined();
  });
  it('entfernen: Unterkategorien rücken an die Stelle eine Ebene hoch', () => {
    expect(namen(entferne(baum(), 'a'))).toEqual(['A1', '-A1a', 'A2', 'B', 'C']);
    expect(namen(entferne(baum(), 'a1'))).toEqual(['A', '-A1a', '-A2', 'B', 'C']);
    expect(namen(entferne(baum(), 'b'))).toEqual(['A', '-A1', '--A1a', '-A2', 'C']);
    const r = entferne(baum(), 'a');
    expect(geschwister(r, undefined).map(k => [k.name, k.reihenfolge])).toEqual([['A1', 0], ['A2', 1], ['B', 2], ['C', 3]]);
  });
  it('unterkategorien zählt alle Ebenen', () => { expect(unterkategorien(baum(), 'a').map(k => k.name).sort()).toEqual(['A1', 'A1a', 'A2']); expect(unterkategorien(baum(), 'b')).toEqual([]); });
  it('renummeriere: je Gruppe 0, 1, 2 …', () => {
    const r = renummeriere([c('x', 'X', 10), c('y', 'Y', 3), c('z', 'Z', 5, { elternId: 'y' })]);
    expect(r.map(k => [k.name, k.reihenfolge])).toEqual([['X', 1], ['Y', 0], ['Z', 0]]);
  });
  it('Ring und fehlende Eltern gehen nicht verloren', () => {
    const r = baumListe([c('p', 'P', 0, { elternId: 'q' }), c('q', 'Q', 0, { elternId: 'p' }), c('w', 'W', 1, { elternId: 'gibtesnicht' })]);
    expect(r.map(e => e.code.name).sort()).toEqual(['P', 'Q', 'W']);
  });
  it('aendereCode: leere Felder entfallen, Ankerbeispiele ohne Text auch', () => {
    const r = aendereCode([c('a', 'A', 0, { definition: 'd', regel: 'r' })], 'a', { definition: '  ', anker: [{ text: ' ' }, { text: ' x ' }], farbe: '' });
    expect(r[0]).not.toHaveProperty('definition'); expect(r[0]).not.toHaveProperty('farbe'); expect(r[0]!.anker).toEqual([{ text: 'x' }]); expect(r[0]!.regel).toBe('r');
  });
});

describe('Vollständigkeit', () => {
  it('zählt fehlende Definitionen und Ankerbeispiele', () => {
    const cs = [c('a', 'A', 0, { definition: 'x', anker: [{ text: 'y' }] }), c('b', 'B', 1, { definition: ' ' }), c('c', 'C', 2, { anker: [{ text: '' }] })];
    expect(vollstaendigkeit(cs)).toEqual({ gesamt: 3, ohneDefinition: 2, ohneAnker: 2 });
    expect(luecken(cs[0]!)).toEqual({ ohneDefinition: false, ohneAnker: false });
  });
});

describe('Einlesen (Konflikte und Einfügen)', () => {
  const neu = (): Code[] => [c('n1', ' a ', 0, { definition: 'neue Def', farbe: '#ff0000' }), c('n2', 'a1', 0, { elternId: 'n1', definition: 'neue Def A1' }), c('n3', 'Neu', 1)];
  it('findet gleiche Namen auf derselben Ebene (ohne Groß-/Kleinschreibung, auch in der Tiefe)', () => {
    const k = findeKonflikte(baum(), neu());
    expect(k.map(x => [x.neu.id, x.bestehend.id])).toEqual([['n1', 'a'], ['n2', 'a1']]);
  });
  it('gleicher Name auf anderer Ebene ist kein Konflikt', () => {
    expect(findeKonflikte(baum(), [c('n', 'A1', 0)])).toEqual([]);
  });
  it('ohne Wahl: beide behalten, hinten angehängt, Baum und Reihenfolge stimmen', () => {
    const r = fuegeEin(baum(), neu());
    expect(r).toMatchObject({ neu: 3, ersetzt: 0, uebersprungen: 0 });
    expect(namen(r.codes)).toEqual(['A', '-A1', '--A1a', '-A2', 'B', 'C', ' a ', '-a1', 'Neu']);
    expect(geschwister(r.codes, undefined).map(k => k.reihenfolge)).toEqual([0, 1, 2, 3, 4]);
  });
  it('überspringen lässt den ganzen Zweig weg', () => {
    const r = fuegeEin(baum(), neu(), { n1: 'ueberspringen' });
    expect(r).toMatchObject({ neu: 1, uebersprungen: 2 });
    expect(namen(r.codes)).toEqual(['A', '-A1', '--A1a', '-A2', 'B', 'C', 'Neu']);
  });
  it('ersetzen behält die id des vorhandenen Codes und nimmt Felder aus der Datei; Kinder werden verglichen', () => {
    const r = fuegeEin(baum(), neu(), { n1: 'ersetzen', n2: 'ersetzen' });
    expect(r).toMatchObject({ neu: 1, ersetzt: 2 });
    const a = r.codes.find(k => k.id === 'a')!;
    expect(a).toMatchObject({ name: ' a ', definition: 'neue Def', farbe: '#ff0000', reihenfolge: 0 });
    expect(r.codes.find(k => k.id === 'a1')!.definition).toBe('neue Def A1');
    expect(r.codes.find(k => k.id === 'a1a')!.elternId).toBe('a1');
  });
  it('gleiche ids (zweimal dieselbe Datei) bekommen neue ids', () => {
    const r = fuegeEin(baum(), baum());
    expect(new Set(r.codes.map(k => k.id)).size).toBe(12);
    expect(namen(r.codes).slice(6)).toEqual(['A', '-A1', '--A1a', '-A2', 'B', 'C']);
  });
});

describe('Word', () => {
  const cs = [c('a', 'Zeitplanung', 0, { kodierbar: false, definition: 'Wie die Person Zeit einteilt', anker: [{ text: 'Ich schreibe es auf' }, { text: 'Ohne Kalender' }], regel: 'Nur bei Planung' }), c('a1', 'Wochenplan', 0, { elternId: 'a' }), c('a1a', 'Montag', 0, { elternId: 'a1', definition: 'Montags' })];
  for (const sp of ['de', 'en'] as const) {
    it(`${sp}: gültig, Tabelle mit Kopfzeile, Überschriften, Etiketten`, async () => {
      const bytes = await kodierleitfadenWord(cs, sp);
      expect(await pruefeDocx(bytes)).toEqual([]);
      const xml = strFromU8(unzipSync(bytes)['word/document.xml']!);
      expect(xml).toContain('w:tblHeader');
      expect(xml).toContain('Zeitplanung'); expect(xml).toContain('Montag');
      expect(xml).toContain(sp === 'de' ? 'Oberkategorie:' : 'Parent category:');
      expect(xml).toContain(sp === 'de' ? 'Ankerbeispiel:' : 'Anchor example:');
      expect(xml).toContain('w:numPr');
    });
  }
  it('ohne Codes: gültiges Dokument mit Satz', async () => { expect(await pruefeDocx(await kodierleitfadenWord([], 'de'))).toEqual([]); });
});
