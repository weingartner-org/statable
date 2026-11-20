import { describe, expect, it } from 'vitest';
import { alsHex, graustufen, istGrund, istNeutral, istZahlText, gestaltMit, eigenerText } from './gestalt';

describe('Diagramm gestalten: reine Teile', () => {
  it('Zahlen bleiben unveränderbar, Wörter nicht', () => {
    for (const t of ['12', '1,5', '-3', '−0,2', '45 %', '< ,001', '12.345', '(95 %)', 'n = 12', 'p < ,05', 'M = 5,0', '']) expect(istZahlText(t), t).toBe(true);
    for (const t of ['Mittelwert', 'Gruppe A', 'Klasse 5a', 'M']) expect(istZahlText(t), t).toBe(false);
  });
  it('rgb zu Hex, durchsichtig und none ohne Farbe', () => {
    expect(alsHex('rgb(23, 117, 106)')).toBe('#17756a');
    expect(alsHex('rgba(23, 117, 106, 0.5)')).toBe('#17756a');
    expect(alsHex('rgba(0, 0, 0, 0)')).toBeNull();
    expect(alsHex('none')).toBeNull();
  });
  it('Grau gilt als neutral, Farbe nicht', () => {
    expect(istNeutral('#8c8c8c')).toBe(true); expect(istNeutral('#ffffff')).toBe(true);
    expect(istNeutral('#17756a')).toBe(false); expect(istNeutral('#e8735a')).toBe(false);
  });
  it('Graustufen: gleich viele, dunkel nach hell, alle neutral', () => {
    const g = graustufen(4); expect(g).toHaveLength(4); expect(g.every(istNeutral)).toBe(true);
    expect(g[0]! < g[3]!).toBe(true);
  });
  it('Grundzustand und Zusammenführen', () => {
    expect(istGrund(undefined)).toBe(true); expect(istGrund(gestaltMit({ schrift: 120 }))).toBe(false);
    expect(gestaltMit({ texte: { a: 'b' } }).schrift).toBe(100);
  });
});

import { ordneNach, reiheFuer, haeufigGeordnet, kreuzGeordnet, type Gestalt } from './gestalt';
describe('Reihenfolge der Kategorien', () => {
  const g = (r: Partial<Gestalt>): Record<string, Gestalt> => ({ x: { ...gestaltMit(undefined), ...r } });
  it('ordneNach: gewünschte Reihenfolge, Neues hinten, Unbekanntes weg', () => {
    expect(ordneNach(['a', 'b', 'c'], ['c', 'a'])).toEqual(['c', 'a', 'b']);
    expect(ordneNach(['a', 'b'], ['z', 'b'])).toEqual(['b', 'a']);
    expect(ordneNach(['a', 'b'], undefined)).toEqual(['a', 'b']);
  });
  it('reiheFuer findet die Reihenfolge nur bei genau denselben Namen', () => {
    const alle = g({ reihe: ['b', 'a'] });
    expect(reiheFuer(alle, ['a', 'b'])).toEqual(['b', 'a']);
    expect(reiheFuer(alle, ['a', 'b', 'c'])).toBeUndefined();
    expect(reiheFuer(undefined, ['a'])).toBeUndefined();
  });
  it('Häufigkeiten: Stufen samt Zahlen in die neue Reihenfolge', () => {
    const h = { name: 'Zufriedenheit', werte: [{ name: 'niedrig', anzahl: 2 }, { name: 'mittel', anzahl: 5 }, { name: 'hoch', anzahl: 3 }] };
    const r = haeufigGeordnet(h, g({ reihe: ['niedrig', 'mittel', 'hoch'].reverse() }));
    expect(r.werte.map(w => [w.name, w.anzahl])).toEqual([['hoch', 3], ['mittel', 5], ['niedrig', 2]]);
    expect(haeufigGeordnet(h, undefined)).toBe(h);
  });
  it('Kreuztabelle: Zahlen wandern mit ihren Antworten und Gruppen', () => {
    const e = { zaehlung: { zeilen: ['A', 'B'], spalten: ['ja', 'nein', 'k.A.'], tab: [[1, 2, 3], [4, 5, 6]] } };
    const r = kreuzGeordnet(e, g({ reihe: ['nein', 'ja', 'k.A.'], reiheB: ['B', 'A'] }));
    expect(r.zaehlung!.spalten).toEqual(['nein', 'ja', 'k.A.']); expect(r.zaehlung!.zeilen).toEqual(['B', 'A']);
    expect(r.zaehlung!.tab).toEqual([[5, 4, 6], [2, 1, 3]]);
    expect(kreuzGeordnet(e, undefined)).toBe(e);
  });
});

describe('Gestalten: welche Texte sich ändern lassen', () => {
  const knoten = (typ: number, wert: string) => ({ nodeType: typ, nodeValue: wert });
  it('eigener Textknoten zählt, <title> und <tspan> nicht („diversdivers“)', () => {
    expect(eigenerText({ dataset: {}, childNodes: [knoten(3, 'Anzahl')] })).toBe('Anzahl');
    expect(eigenerText({ dataset: {}, childNodes: [knoten(1, ''), knoten(1, '')] })).toBeNull();   // nur <title> und <tspan>
    expect(eigenerText({ dataset: { gO: 'Original' }, childNodes: [knoten(3, 'Neu')] })).toBe('Original');
  });
});
