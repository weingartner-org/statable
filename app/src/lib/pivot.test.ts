import { describe, expect, it } from 'vitest';
import { istEinfach, pivotGrund, pivotiere, reihenfolge, tabellenSchluessel } from './pivot';

const z = (t: string, kopf = false, zahl = false) => ({ t, kopf, span: 1, zahl });
const T = [
  [z('', true), z('N', true), z('Mittelwert', true), z('SD', true)],
  [z('A', true), z('5', false, true), z('5,0', false, true), z('0,3', false, true)],
  [z('B', true), z('6', false, true), z('6,9', false, true), z('0,4', false, true)],
];
const text = (r: typeof T) => r.map(x => x.map(c => c.t).join('|'));

describe('Tabelle umbauen', () => {
  it('ohne Wahl bleibt alles gleich', () => { expect(pivotiere(T, 1, pivotGrund()).zeilen).toBe(T); });
  it('Spalten ausblenden und umordnen, Zahlen unverändert', () => {
    const r = pivotiere(T, 1, { ...pivotGrund(), spaltenAus: [0], spaltenFolge: [2, 1] });
    expect(text(r.zeilen)).toEqual(['|SD|Mittelwert', 'A|0,3|5,0', 'B|0,4|6,9']);
  });
  it('Zeilen umordnen und ausblenden', () => {
    expect(text(pivotiere(T, 1, { ...pivotGrund(), zeilenFolge: [1, 0] }).zeilen)).toEqual(['|N|Mittelwert|SD', 'B|6|6,9|0,4', 'A|5|5,0|0,3']);
    expect(text(pivotiere(T, 1, { ...pivotGrund(), zeilenAus: [0] }).zeilen)).toEqual(['|N|Mittelwert|SD', 'B|6|6,9|0,4']);
  });
  it('Tausch: Zeilen werden Spalten', () => {
    const r = pivotiere(T, 1, { ...pivotGrund(), tausch: true });
    expect(text(r.zeilen)).toEqual(['|A|B', 'N|5|6', 'Mittelwert|5,0|6,9', 'SD|0,3|0,4']);
    expect(r.zeilen[1]![0]!.kopf).toBe(true); expect(r.zeilen[1]![1]!.zahl).toBe(true);
  });
  it('Tausch zweimal ergibt die Ausgangstabelle', () => {
    const a = pivotiere(T, 1, { ...pivotGrund(), tausch: true });
    expect(text(pivotiere(a.zeilen, 1, { ...pivotGrund(), tausch: true }).zeilen)).toEqual(text(T));
  });
  it('verbundene Zellen oder zwei Kopfzeilen: nicht einfach, unverändert', () => {
    const v = [[{ ...z('a', true), span: 2 }, z('b', true)], [z('x', true), z('1', false, true)]];
    expect(istEinfach(v, 1)).toBe(false); expect(istEinfach(T, 2)).toBe(false);
    expect(pivotiere(v, 1, { ...pivotGrund(), tausch: true }).zeilen).toBe(v);
  });
  it('Reihenfolge ergänzt Fehlendes und lässt Unbekanntes weg', () => {
    expect(reihenfolge(4, [], [2, 9])).toEqual([2, 0, 1, 3]);
    expect(reihenfolge(4, [1], [3])).toEqual([3, 0, 2]);
  });
  it('Fingerabdruck: gleicher Inhalt gleich, anderer Inhalt anders', () => {
    const a = tabellenSchluessel('D', T.flat(), 3, 4), b = tabellenSchluessel('D', T.flat(), 3, 4);
    const c = tabellenSchluessel('D', [...T.flat().slice(0, 5), z('9,9')], 3, 4);
    expect(a).toBe(b); expect(a).not.toBe(c);
  });
});
