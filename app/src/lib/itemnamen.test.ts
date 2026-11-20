import { describe, it, expect } from 'vitest';
import { itemAnzeige, itemKarte, itemZeilenkoepfe } from './itemnamen';

describe('Fragen mit Namen und Text', () => {
  it('zeigt Name · Bezeichnung, lässt Doppeltes und Fehlendes weg', () => {
    expect(itemAnzeige('Q4', 'Ich kann mich schlecht konzentrieren')).toBe('Q4 · Ich kann mich schlecht konzentrieren');
    expect(itemAnzeige('Q4', '')).toBe('Q4');
    expect(itemAnzeige('Q4', 'Q4 Konzentration')).toBe('Q4 Konzentration');
  });
  it('ersetzt nur Zeilenköpfe, die genau eine gewählte Frage nennen', () => {
    const t = { type: 'table', label: 'Communalities', headRows: [1], cells: [{ r: 1, c: 0, t: 'Konzentration' }, { r: 1, c: 1, t: 'Konzentration' }, { r: 2, c: 0, t: 'Extraction' }] } as never;
    itemZeilenkoepfe([t], itemKarte([{ name: 'Q4', bezeichnung: 'Konzentration', kurz: 'Konzentration' }]));
    expect((t as any).cells.map((c: any) => c.t)).toEqual(['Q4 · Konzentration', 'Konzentration', 'Extraction']);
  });
});
