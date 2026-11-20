import { describe, expect, it } from 'vitest';
import { spaghetti, spaghettiText, SPAGHETTI_MAX } from './spaghetti';
import { streuMatrix } from './streumatrix';
import type { Spalte } from './verzeichnis';

const sp = (name: string, art: 'zahl' | 'text' = 'zahl'): Spalte => ({ name, art, niveau: art === 'text' ? 'nominal' : 'metrisch', fehlend: [], werteLabels: {} } as unknown as Spalte);
const spalten = [sp('person', 'text'), sp('zeit'), sp('wert'), sp('gruppe', 'text')];
const zeilen: (string | number | null)[][] = [
  ['p1', 0, 10, 'a'], ['p1', 2, 14, 'a'], ['p1', 1, 12, 'a'],
  ['p2', 0, 8, 'b'], ['p2', 1, 7, 'b'], ['p2', 2, 6, 'b'],
  ['p3', 1, 5, 'b'], ['p4', 0, null, 'a']
];

describe('Spaghetti-Diagramm (Linie je Person)', () => {
  const d = spaghetti(spalten[1]!, spalten[2]!, spalten[0]!, spalten[3]!, zeilen, spalten)!;
  it('eine Linie je Person, nach Zeit geordnet, Steigung je Linie', () => {
    expect(d.personen).toBe(3);
    expect(d.linien[0]!.punkte.map(p => p[0])).toEqual([0, 1, 2]);
    expect(d.linien[0]!.steigung).toBeCloseTo(2, 12); expect(d.linien[1]!.steigung).toBeCloseTo(-1, 12); expect(d.linien[2]!.steigung).toBeNull();
    expect(d.nurEinMal).toBe(1); expect(d.ausgelassen).toBe(1);
  });
  it('Mittelwert je Zeitpunkt aus allen Personen', () => {
    expect(d.mittel).toEqual([[0, 9], [1, (12 + 7 + 5) / 3], [2, 10]]);
  });
  it('Gruppen mit Namen; ohne Gruppenspalte keine', () => {
    expect(d.gruppen).toEqual(['a', 'b']);
    expect(spaghetti(spalten[1]!, spalten[2]!, spalten[0]!, null, zeilen, spalten)!.gruppen).toEqual([]);
  });
  it('viele Personen: feste Auswahl, Zahl der Personen bleibt', () => {
    const v = Array.from({ length: 200 }, (_, i) => [['q' + i, 0, i], ['q' + i, 1, i + 1]]).flat();
    const r = spaghetti(spalten[1]!, spalten[2]!, spalten[0]!, null, v, spalten)!;
    expect(r.personen).toBe(200); expect(r.linien).toHaveLength(SPAGHETTI_MAX); expect(r.gekuerzt).toBe(true);
  });
  it('Textfassung: Tabelle mit einer Zeile je gezeichneter Linie', () => {
    const t = spaghettiText(d, 'Zeit', 'Wert', 'Person');
    expect(t.zeilen).toHaveLength(3); expect(t.saetze.join(' ')).toMatch(/Mittelwert je Zeitpunkt/);
  });
});

describe('Streudiagramm-Matrix', () => {
  const z = [[1, 2, 3], [2, 4, 5], [3, 6, 4], [4, 8, 9], [5, null, 1]];
  it('Felder für i < j, r und n paarweise', () => {
    const m = streuMatrix(['a', 'b', 'c'], z)!;
    expect(m.felder.map(f => [f.i, f.j, f.n])).toEqual([[0, 1, 4], [0, 2, 5], [1, 2, 4]]);
    expect(m.felder[0]!.r).toBeCloseTo(1, 12);
  });
  it('nur 3 bis 6 Spalten', () => {
    expect(streuMatrix(['a', 'b'], z)).toBeNull();
    expect(streuMatrix(['a', 'b', 'c', 'd', 'e', 'f', 'g'], z)).toBeNull();
  });
});
