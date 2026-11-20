import { describe, it, expect } from 'vitest';
import { namensStamm, spaltenGruppen, gruppenSpanne } from './spaltengruppen';

const sp = (...n: string[]) => n.map(name => ({ name }));

describe('Spalten gliedern', () => {
  it('Stamm aus den Buchstaben vor der Nummer', () => {
    expect(namensStamm('FG01')).toBe('FG');
    expect(namensStamm('DA06_01')).toBe('DA');
    expect(namensStamm('FG54UMCODIERT')).toBe('FG');
    expect(namensStamm('jahre_Matura')).toBeNull();
    expect(namensStamm('item_3')).toBe('ITEM');
  });
  it('Fragebogen mit Blöcken: Gruppen in Reihenfolge, Rest am Ende', () => {
    const g = spaltenGruppen(sp('DA06_01', 'jahre_Matura', 'DA07', 'FG01', 'FG02', 'FG03', 'geschlecht'))!;
    expect(g.map(x => x.stamm)).toEqual(['DA', 'FG', null]);
    expect(g[2]!.spalten.map(s => s.name)).toEqual(['jahre_Matura', 'geschlecht']);
    expect(gruppenSpanne(g[1]!, 'bis')).toBe('FG01 bis FG03');
    expect(gruppenSpanne(g[0]!, 'bis')).toBe('DA06_01, DA07');
    expect(gruppenSpanne({ stamm: 'FG', spalten: sp('FG01', 'FG02', 'FG77', 'FG54UMCODIERT') }, 'bis')).toBe('FG01 bis FG77');
  });
  it('nichts zu gliedern: keine Blöcke oder nur ein Block', () => {
    expect(spaltenGruppen(sp('alter', 'geschlecht', 'punkte'))).toBeNull();
    expect(spaltenGruppen(sp('FG01', 'FG02', 'FG03'))).toBeNull();
    expect(spaltenGruppen(sp('alter', 'FG1'))).toBeNull();
  });
});
