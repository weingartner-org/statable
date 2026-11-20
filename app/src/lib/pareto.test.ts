import { describe, expect, it } from 'vitest';
import { paretoZeilen, wenigeWichtige } from './pareto';

describe('Pareto-Diagramm: Rechnung', () => {
  const w = [{ name: 'A', anzahl: 5, anteil: 0.05 }, { name: 'B', anzahl: 50, anteil: 0.5 }, { name: 'C', anzahl: 30, anteil: 0.3 }, { name: 'D', anzahl: 15, anteil: 0.15 }];
  it('sortiert absteigend und summiert kumuliert (am Ende 100 %)', () => {
    const z = paretoZeilen(w);
    expect(z.map(r => r.name)).toEqual(['B', 'C', 'D', 'A']);
    expect(z.map(r => r.kumuliert)).toEqual([0.5, 0.8, 0.95, 1]);
    expect(z.at(-1)!.kumuliert).toBeCloseTo(1, 12);
  });
  it('bei gleicher Häufigkeit bleibt die Reihenfolge der Tabelle', () => {
    expect(paretoZeilen([{ name: 'x', anzahl: 3, anteil: 0.5 }, { name: 'y', anzahl: 3, anteil: 0.5 }]).map(r => r.name)).toEqual(['x', 'y']);
  });
  it('wenige Wichtige: bis 80 % erreicht sind', () => {
    expect(wenigeWichtige(paretoZeilen(w))).toBe(2); expect(wenigeWichtige(paretoZeilen(w), 0.9)).toBe(3); expect(wenigeWichtige([])).toBe(0);
  });
  it('keine Angaben: keine Division durch null', () => { expect(paretoZeilen([{ name: 'a', anzahl: 0, anteil: 0 }])[0]!.kumuliert).toBe(0); });
});
