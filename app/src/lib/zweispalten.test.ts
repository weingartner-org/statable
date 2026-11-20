import { describe, expect, it } from 'vitest';
import type { Spalte } from './verzeichnis';
import { s } from './sitzung.svelte';
import { stapleZweiSpalten } from './zweispalten';

const sp = (name: string, rest: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });

describe('zwei Listen untereinander', () => {
  const d = { spalten: [sp('a', { bezeichnung: 'Liste A' }), sp('b', { fehlend: [99] }), sp('t', { art: 'text', niveau: 'nominal' })], zeilen: [[1, 5, 'x'], [2, 99, 'y'], [3, null, 'z'], [null, 7, 'u']] as (number | string | null)[][] };
  it('stapelt, lässt Leeres und Fehlcodes weg, zählt je Liste', () => {
    const r = stapleZweiSpalten(d, 'a', 'b');
    expect(r.zeilen).toEqual([[1, 1], [2, 1], [3, 1], [5, 2], [7, 2]]);
    expect(r.anzahl).toEqual([3, 2]);
    expect(r.spalten.map(s => s.name)).toEqual(['wert', 'gruppe']);
    s.einst.sprache = 'en';
    try { expect(stapleListen(d, ['a', 'b'], false).spalten.map(x => x.name)).toEqual(['value', 'group']); } finally { s.einst.sprache = 'de'; }
    expect(r.spalten[1]!.werteLabels).toEqual({ '1': 'Liste A', '2': 'b' });
  });
  it('lehnt Text und dieselbe Spalte ab', () => {
    expect(() => stapleZweiSpalten(d, 'a', 't')).toThrow('zahl');
    expect(() => stapleZweiSpalten(d, 'a', 'a')).toThrow('spalten');
  });
});

import { stapleListen, MAX_LISTEN } from './zweispalten';
describe('drei und mehr Listen untereinander', () => {
  const d = { spalten: [sp('a'), sp('b', { bezeichnung: 'Liste B' }), sp('c', { fehlend: [99] }), sp('t', { art: 'text', niveau: 'nominal' })], zeilen: [[1, 4, 7, 'x'], [2, 5, 99, 'y'], [3, null, 9, 'z']] as (number | string | null)[][] };
  it('stapelt alle Listen, Gruppe 1 bis n mit den Spaltennamen als Beschriftung', () => {
    const r = stapleListen(d, ['a', 'b', 'c']);
    expect(r.zeilen).toEqual([[1, 1], [2, 1], [3, 1], [4, 2], [5, 2], [7, 3], [9, 3]]);
    expect(r.anzahl).toEqual([3, 2, 2]);
    expect(r.spalten[1]!.werteLabels).toEqual({ '1': 'a', '2': 'Liste B', '3': 'c' });
  });
  it('Grenzen: mindestens zwei, höchstens zwölf, keine Wiederholung, nur Zahlen', () => {
    expect(() => stapleListen(d, ['a'])).toThrow('spalten');
    expect(() => stapleListen(d, ['a', 'a'])).toThrow('spalten');
    expect(() => stapleListen(d, ['a', 't'])).toThrow('zahl');
    expect(MAX_LISTEN).toBe(12);
  });
});
