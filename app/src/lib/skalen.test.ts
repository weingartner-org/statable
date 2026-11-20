import { describe, it, expect } from 'vitest';
import { skalaNameFehler, gehoertZu, belegteFragen, brauchbareSkalen, skalaMitFragen, skalaHinweise, antwortSpanne } from './skalen';
import { spaltenGruppen } from './spaltengruppen';
import type { Spalte } from './verzeichnis';

const sp = (name: string, w: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'ordinal', format: 'F1.0', fehlend: [], fehlendText: '', werteLabels: {}, ...w });
const org = { name: 'Organisation', fragen: ['FG01', 'FG14', 'FG27'] };

describe('Skalen festlegen', () => {
  it('Name: frei, aber nicht leer, ohne „=“, nicht doppelt', () => {
    expect(skalaNameFehler('Organisation', [])).toBe('');
    expect(skalaNameFehler('Lernen mit Anderen', [])).toBe('');
    expect(skalaNameFehler('  ', [])).toBe('leer');
    expect(skalaNameFehler('a=b', [])).toBe('zeichen');
    expect(skalaNameFehler('x'.repeat(65), [])).toBe('zeichen');
    expect(skalaNameFehler('organisation', [org])).toBe('vergeben');
    expect(skalaNameFehler('Organisation', [org], 'Organisation')).toBe('');
  });
  it('umgepolte Fassung gehört zur Skala; belegte Fragen', () => {
    expect(gehoertZu('FG14', org)).toBe(true);
    expect(gehoertZu('fg14r', org)).toBe(true);
    expect(gehoertZu('FG15', org)).toBe(false);
    expect([...belegteFragen([org, { name: 'B', fragen: ['FG02'] }], 'B')]).toEqual([['FG01', 'Organisation'], ['FG14', 'Organisation'], ['FG27', 'Organisation']]);
  });
  it('brauchbar nur mit allen Fragen; dieselbe Skala erkennen', () => {
    expect(brauchbareSkalen([org], [sp('FG01'), sp('FG14')])).toEqual([]);
    expect(brauchbareSkalen([org], [sp('FG01'), sp('FG14'), sp('FG27')])).toEqual([org]);
    expect(skalaMitFragen(['FG27', 'FG01', 'FG14R'], [org])).toBe(org);
    expect(skalaMitFragen(['FG27', 'FG01'], [org])).toBeUndefined();
  });
  it('Hinweise: zwei Fragen, Text, verschiedene Antwortskalen', () => {
    const fuenf = { 1: 'nie', 2: '', 3: '', 4: '', 5: 'sehr oft' };
    const spalten = [sp('a', { werteLabels: fuenf }), sp('b', { werteLabels: fuenf }), sp('c', { werteLabels: { 1: 'nie', 7: 'immer' } }), sp('t', { art: 'text' })];
    expect(skalaHinweise(['a', 'b'], spalten, [])).toEqual([{ art: 'zwei' }]);
    expect(skalaHinweise(['a', 'b', 'c'], spalten, [])).toEqual([{ art: 'spanne', spannen: [{ von: 1, bis: 5, fragen: ['a', 'b'] }, { von: 1, bis: 7, fragen: ['c'] }], ausDaten: false }]);
    expect(skalaHinweise(['a', 't', 'weg'], spalten, []).map(h => h.art)).toEqual(['fehlt', 'keineZahl']);
  });
  it('aus den Antworten: fast gleiche Spannen können eine nie gewählte Randantwort sein, weit verschiedene nicht', () => {
    const spalten = [sp('a'), sp('b'), sp('j')];
    const zeilen = [[1, 1, 0], [5, 4, 29], [3, 2, 12]];
    expect(skalaHinweise(['a', 'b'], spalten, zeilen)).toEqual([{ art: 'zwei' }, { art: 'spanne', spannen: [{ von: 1, bis: 5, fragen: ['a'] }, { von: 1, bis: 4, fragen: ['b'] }], ausDaten: true }]);
    expect((skalaHinweise(['a', 'b', 'j'], spalten, zeilen)[0] as { ausDaten: boolean }).ausDaten).toBe(false);
  });
  it('Antwortspanne ohne Labels aus den Antworten, „keine Angabe“ zählt nicht', () => {
    expect(antwortSpanne(sp('a', { fehlend: [99] }), [1, 4, 99, null, 2])).toEqual({ von: 1, bis: 4, ausDaten: true });
    expect(antwortSpanne(sp('a'), [null])).toBeNull();
  });
});

describe('Spaltenauswahl nach Skalen gliedern', () => {
  const n = (...x: string[]) => x.map(name => ({ name }));
  it('Skalen zuerst, Rest nach Namen; umgepolte Frage bei ihrer Skala', () => {
    const g = spaltenGruppen(n('FG01', 'FG02', 'FG14', 'FG15', 'FG27', 'FG14R', 'alter'), [org, { name: 'Leer', fragen: ['XY1', 'XY2'] }])!;
    expect(g.map(x => x.skala ?? x.stamm)).toEqual(['Organisation', 'FG', null]);
    expect(g[0]!.spalten.map(x => x.name)).toEqual(['FG01', 'FG14', 'FG27', 'FG14R']);
    expect(g[1]!.spalten.map(x => x.name)).toEqual(['FG02', 'FG15']);
  });
  it('eine Skala genügt zum Gliedern; ohne Skalen wie bisher', () => {
    expect(spaltenGruppen(n('FG01', 'FG14', 'FG27'), [org])!.map(x => x.skala)).toEqual(['Organisation']);
    expect(spaltenGruppen(n('FG01', 'FG14', 'FG27'))).toBeNull();
  });
});
