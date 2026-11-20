import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const sprache = vi.hoisted(() => ({ en: false }));
vi.mock('./sitzung.svelte', () => ({ L: (de: string, en: string) => (sprache.en ? en : de), istEn: () => sprache.en, aktuelleSprache: () => (sprache.en ? 'en' : 'de'), s: { einst: { sprache: 'de', zahl: 'sprache' } }, melde: () => {} }));
import { leseCsv, zurEngine } from './einlesen';
import { leseVerzeichnis, type Spalte } from './verzeichnis';
import { baueSpalte, leseEingabe, leseEinfuegen, leseFehlendCodes, neuAufbauen, type Wert } from './eingabe';
import { parseCsv } from '../dialogs/csv';
import { nodeEngine } from './testengine';

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

/** Liest Spalten und Zeilen aus der Engine - wie sitzung.aktualisiere. */
function lies(): { spalten: Spalte[]; zeilen: Wert[][] } {
  const spalten = leseVerzeichnis(e.run('DISPLAY DICTIONARY.'));
  e.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
  const roh = parseCsv(new TextDecoder().decode(e.lies('/t.csv'))).slice(1);
  const zeilen = roh.map(z => spalten.map((sp, i) => { const w = (z[i] ?? '').trim(); if (w === '') return null; if (sp.art === 'datum') return w.replace(/^(\d{2})\/(\d{2})\/(\d{4})/, '$2.$1.$3'); return sp.art === 'zahl' ? Number(w) : w; }));
  return { spalten, zeilen };
}
const baue = (spalten: Spalte[], zeilen: Wert[][]) => { const { syntax, csv } = neuAufbauen(spalten, zeilen); const r = e.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv }); expect(r.filter(i => i.type === 'message' && /error|warning/.test((i as { severity?: string }).severity ?? ''))).toEqual([]); };

describe('Daten eingeben', () => {
  it('Neuaufbau verliert nichts (Beispiel mit Bezeichnungen, Gruppen, keine Angabe, Niveau)', () => {
    const { syntax, csv } = zurEngine(leseCsv(readFileSync(new URL('./testdaten/schlaf-und-konzentration.csv', import.meta.url), 'utf8')));
    e.run('NEW FILE.\n' + syntax, { '/import.csv': csv });
    e.run("VARIABLE LABELS semester 'Semester'.\nVALUE LABELS semester 1 'erstes' 2 'zweites'.\nMISSING VALUES schlaf_stunden (99).\nVARIABLE LEVEL semester (ORDINAL).");
    const vorher = lies();
    baue(vorher.spalten, vorher.zeilen);
    const nachher = lies();
    expect(nachher.spalten).toEqual(vorher.spalten);
    expect(nachher.zeilen).toEqual(vorher.zeilen);
  });

  it('Zelle ändern, Zeile und Spalte anfügen, Text länger als vorher', () => {
    const { spalten, zeilen } = lies();
    const neu = zeilen.map(z => [...z]);
    neu[0]![spalten.findIndex(s => s.name === 'konzentration')] = 77.25;
    neu[1]![spalten.findIndex(s => s.name === 'geschlecht')] = 'eine sehr lange Angabe mit Umlauten äöü';
    neu.push(spalten.map(() => null));
    const sp = [...spalten, baueSpalte({ bezeichnung: 'Note Mathe', art: 'zahl', gruppen: '1 = sehr gut, 5 = nicht genügend' }, spalten.map(s => s.name))];
    baue(sp, neu.map((z, i) => [...z, i === 0 ? 2 : null]));
    const r = lies();
    expect(r.zeilen.length).toBe(zeilen.length + 1);
    expect(r.zeilen[0]![spalten.findIndex(s => s.name === 'konzentration')]).toBe(77.25);
    expect(r.zeilen[1]![spalten.findIndex(s => s.name === 'geschlecht')]).toBe('eine sehr lange Angabe mit Umlauten äöü');
    const note = r.spalten.at(-1)!;
    expect([note.name, note.bezeichnung, note.werteLabels, note.niveau]).toEqual(['Note_Mathe', 'Note Mathe', { 1: 'sehr gut', 5: 'nicht genügend' }, 'nominal']);
    expect(r.zeilen[0]!.at(-1)).toBe(2);
  });

  it('neue leere Studie mit Datum', () => {
    const sp = [baueSpalte({ bezeichnung: 'Klasse', art: 'text' }, []), baueSpalte({ bezeichnung: 'Punkte', art: 'zahl' }, ['Klasse']), baueSpalte({ bezeichnung: 'Testtag', art: 'datum' }, ['Klasse', 'Punkte'])];
    baue(sp, [[null, null, null]]);
    baue(lies().spalten, [['3a', 12.5, '02.09.2026'], ['3b', null, null]]);
    const r = lies();
    expect(r.zeilen).toEqual([['3a', 12.5, '02.09.2026'], ['3b', null, null]]);
    expect(r.spalten.map(s => s.art)).toEqual(['text', 'zahl', 'datum']);
  });

  it('Eingaben lesen', () => {
    expect(leseEingabe({ art: 'zahl' }, ' 2,5 ')).toEqual({ wert: 2.5 });
    expect(leseEingabe({ art: 'zahl' }, '')).toEqual({ wert: null });
    expect('fehler' in leseEingabe({ art: 'zahl' }, 'abc')).toBe(true);
    expect(leseEingabe({ art: 'datum' }, '2.9.26')).toEqual({ wert: '02.09.2026' });
    expect('fehler' in leseEingabe({ art: 'datum' }, '31.02.2026')).toBe(true);
    expect('fehler' in leseEingabe({ art: 'datum' }, '09/02/2026')).toBe(true);   // Deutsch: nur TT.MM.JJJJ
  });

  it('Eingaben lesen (Englisch: MM/DD/YYYY, YYYY-MM-DD, Dezimalpunkt)', () => {
    sprache.en = true;
    try {
      expect(leseEingabe({ art: 'datum' }, '09/02/2026')).toEqual({ wert: '02.09.2026' });
      expect(leseEingabe({ art: 'datum' }, '9/2/26')).toEqual({ wert: '02.09.2026' });
      expect(leseEingabe({ art: 'datum' }, '2026-09-02')).toEqual({ wert: '02.09.2026' });
      expect(leseEingabe({ art: 'datum' }, '2.9.2026')).toEqual({ wert: '02.09.2026' });
      expect(leseEingabe({ art: 'datum' }, '12/31/2026')).toEqual({ wert: '31.12.2026' });
      expect('fehler' in leseEingabe({ art: 'datum' }, '31/12/2026')).toBe(true);
      expect('fehler' in leseEingabe({ art: 'datum' }, '2026-02-30')).toBe(true);
      expect(leseEingabe({ art: 'zahl' }, '2.5')).toEqual({ wert: 2.5 });
      expect(leseEingabe({ art: 'zahl' }, '1,200')).toEqual({ wert: 1200 });
      expect(leseEingabe({ art: 'zahl' }, '2,5')).toEqual({ wert: 2.5 });
      const f = leseEingabe({ art: 'zahl' }, 'abc');
      expect('fehler' in f && f.fehler).toMatch(/^This column holds numbers/);
    } finally { sprache.en = false; }
  });
});

describe('Abschlusstest D3: Einfügen aus Excel', () => {
  const zahl = { art: 'zahl' as const, werteLabels: {} }, text = { art: 'text' as const, werteLabels: {} };
  it('Leerraum zwischen Ziffern wird nicht mehr weggeworfen (212223)', () => {
    expect('fehler' in leseEingabe({ art: 'zahl' }, '21 22 23')).toBe(true);
    expect('fehler' in leseEingabe({ art: 'zahl' }, '21\n22')).toBe(true);
    expect('fehler' in leseEingabe({ art: 'zahl' }, '1 0000')).toBe(true);
  });
  it('„1 000“ bleibt ein Tausender (genau drei Ziffern nach dem Leerzeichen)', () => {
    expect(leseEingabe({ art: 'zahl' }, '1 000')).toEqual({ wert: 1000 });
    expect(leseEingabe({ art: 'zahl' }, '12 345,5')).toEqual({ wert: 12345.5 });
    expect(leseEingabe({ art: 'zahl' }, '- 5')).toEqual({ wert: -5 });
  });
  it('eine Spalte aus Excel verteilt sich auf Zeilen und legt neue an', () => {
    const r = leseEinfuegen([zahl], [[1], [null]], '21\r\n22\r\n23\r\n', { zeile: 0, spalte: 0 });
    expect(r).toEqual({ zeilen: [[21], [22], [23]], anzahl: 3 });
  });
  it('ein Block aus zwei Spalten ab einer Zelle in der Mitte', () => {
    const r = leseEinfuegen([zahl, text, zahl], [[1, 'a', 1], [2, 'b', 2], [3, 'c', 3]], '10,5\tx\n11,5\ty', { zeile: 1, spalte: 0 });
    expect(r).toEqual({ zeilen: [[1, 'a', 1], [10.5, 'x', 2], [11.5, 'y', 3]], anzahl: 4 });
  });
  it('Excel setzt Zellen mit Umbruch oder Anführungszeichen in Anführungszeichen', () => {
    const r = leseEinfuegen([text], [[null]], '"zwei\nZeilen"\n"sie sagte ""hi"""', { zeile: 0, spalte: 0 });
    expect(r).toEqual({ zeilen: [['zwei Zeilen'], ['sie sagte "hi"']], anzahl: 2 });
  });
  it('ein Fehler in einer Zelle: nichts wird eingefügt, die Meldung nennt Zeile und Spalte', () => {
    const r = leseEinfuegen([zahl, zahl], [[1, 1]], '5\t6\n7\tabc', { zeile: 0, spalte: 0 });
    expect(r).toMatchObject({ fehler: expect.stringContaining('2') });
    expect(r).not.toHaveProperty('zeilen');
  });
  it('mehr Spalten als ab hier da sind: Fehler', () => {
    expect(leseEinfuegen([zahl, zahl], [[1, 1]], '1\t2\t3', { zeile: 0, spalte: 0 })).toHaveProperty('fehler');
    expect(leseEinfuegen([zahl, zahl], [[1, 1]], '1\t2', { zeile: 0, spalte: 1 })).toHaveProperty('fehler');
  });
  it('ein einzelner Wert (auch mit Zeilenende wie aus Excel) ist kein Block', () => {
    expect(leseEinfuegen([zahl], [[1]], '21', { zeile: 0, spalte: 0 })).toBeNull();
    expect(leseEinfuegen([zahl], [[1]], '21\r\n', { zeile: 0, spalte: 0 })).toBeNull();
  });
  it('Gruppen mit Zahlen: der Name wird zum Code', () => {
    const g = { art: 'zahl' as const, werteLabels: { '1': 'ja', '2': 'nein' } };
    expect(leseEinfuegen([g], [[null]], 'nein\nja', { zeile: 0, spalte: 0 })).toEqual({ zeilen: [[2], [1]], anzahl: 2 });
  });
});

describe('Abschlusstest D4: „Keine Angabe steht für“', () => {
  it('60,34 ist eine Dezimalzahl', () => { expect(leseFehlendCodes('60,34')).toEqual(['60.34']); });
  it('getrennt wird an Semikolon, Leerraum und an Komma mit Leerraum danach', () => {
    expect(leseFehlendCodes('99; -9')).toEqual(['99', '-9']);
    expect(leseFehlendCodes('99, 98 97')).toEqual(['99', '98', '97']);
    expect(leseFehlendCodes('99,-9')).toEqual(['99', '-9']);
    expect(leseFehlendCodes('-9,99; 98')).toEqual(['-9.99', '98']);
  });
  it('Text-Codes', () => { expect(leseFehlendCodes('k.A., n.a.')).toEqual(['k.A.', 'n.a.']); });
});
