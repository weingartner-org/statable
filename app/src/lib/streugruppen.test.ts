import { describe, expect, it } from 'vitest';
import { gerade, gruppenStreu, gruppenSpalten, streuText, STREU_GRUPPEN_MAX } from './streugruppen';
import type { Spalte } from './verzeichnis';

const sp = (name: string, art: 'zahl' | 'text' = 'zahl', extra: Partial<Spalte> = {}): Spalte => ({ name, art, niveau: art === 'text' ? 'nominal' : 'metrisch', fehlend: [], werteLabels: {}, ...extra } as unknown as Spalte);
const spalten = [sp('x'), sp('y'), sp('grp', 'text')];
const zeilen: (string | number | null)[][] = [[1, 2, 'a'], [2, 4, 'a'], [3, 6, 'a'], [1, 6, 'b'], [2, 4, 'b'], [3, 2, 'b'], [null, 5, 'b'], [4, 4, null]];

describe('Streudiagramm nach Gruppe', () => {
  it('Gerade je Gruppe (kleinste Quadrate, wie lm)', () => {
    const g = gerade([[1, 2], [2, 4], [3, 6]])!;
    expect(g.a).toBeCloseTo(0, 12); expect(g.b).toBeCloseTo(2, 12); expect(g.r).toBeCloseTo(1, 12);
    const k = gerade([[1, 6], [2, 4], [3, 2]])!;
    expect(k.b).toBeCloseTo(-2, 12); expect(k.r).toBeCloseTo(-1, 12);
    expect(gerade([[1, 1], [1, 2], [1, 3]])).toBeNull();
  });
  it('zwei Gruppen, Zeilen mit Lücken fallen weg und werden gezählt', () => {
    const d = gruppenStreu(spalten[0]!, spalten[1]!, spalten[2]!, zeilen, spalten)!;
    expect(d.gruppen.map(g => [g.name, g.n])).toEqual([['a', 3], ['b', 3]]);
    expect(d.ausgelassen).toBe(2);
    expect(d.gruppen[0]!.b).toBeCloseTo(2, 12); expect(d.gruppen[1]!.b).toBeCloseTo(-2, 12);
  });
  it('ohne Gruppe: eine Gruppe ohne Namen', () => {
    const d = gruppenStreu(spalten[0]!, spalten[1]!, null, zeilen, spalten)!;
    expect(d.gruppen).toHaveLength(1); expect(d.gruppen[0]!.name).toBe('');
  });
  it('mehr Gruppen als Formen: null; als Gruppenspalte angeboten werden nur 2 bis 4 Stufen', () => {
    const viele = Array.from({ length: 12 }, (_, i) => [i, i, 'g' + (i % 6)]);
    expect(gruppenStreu(spalten[0]!, spalten[1]!, spalten[2]!, viele, spalten)).toBeNull();
    expect(gruppenSpalten(spalten, viele)).toEqual([]);
    expect(gruppenSpalten(spalten, zeilen).map(s => s.name)).toEqual(['grp']);
    expect(STREU_GRUPPEN_MAX).toBe(4);
  });
  it('Textfassung nennt jede Gruppe mit Form und die Tabelle hat eine Zeile je Gruppe', () => {
    const d = gruppenStreu(spalten[0]!, spalten[1]!, spalten[2]!, zeilen, spalten)!, t = streuText(d, 'x', 'y', false);
    expect(t.saetze.join(' ')).toMatch(/a \(/); expect(t.zeilen).toHaveLength(2); expect(t.punkteTabelle?.zeilen).toHaveLength(6);
  });
});
