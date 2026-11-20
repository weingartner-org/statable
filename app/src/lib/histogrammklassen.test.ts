import { describe, expect, it } from 'vitest';
import { klassenMit, klassenVorschlag, klassenJeGruppe, gipfel } from './histogrammklassen';
import { histogramm } from './diagrammdaten';

describe('Histogramm mit freien Klassen', () => {
  const w = [1, 2, 2, 3, 5, 5, 5, 6, 9, 10];
  it('zählt links geschlossen, rechts offen; der größte Wert gehört in die letzte Klasse', () => {
    const k = klassenMit(w, 2, 0)!;
    expect(k.grenzen).toEqual([0, 2, 4, 6, 8, 10, 12]);   // 10 liegt in [10, 12)
    expect(k.anzahl).toEqual([1, 3, 3, 1, 1, 1]);
    expect(k.anzahl.reduce((a, b) => a + b, 0)).toBe(w.length);
  });
  it('Werte unter dem Anfang werden gemeldet, nicht gezählt', () => {
    const k = klassenMit(w, 5, 3)!;
    expect(k.darunter).toBe(3); expect(k.n).toBe(7);
  });
  it('ungültige Wahl und zu viele Klassen: null', () => {
    expect(klassenMit(w, 0, 0)).toBeNull();
    expect(klassenMit(w, 0.01, 0)).toBeNull();
    expect(klassenMit([], 1, 0)).toBeNull();
  });
  it('Vorschlag entspricht dem gewöhnlichen Histogramm', () => {
    const v = klassenVorschlag(w)!, h = histogramm(w)!;
    expect(v.breite).toBe(h.breite); expect(v.anfang).toBe(h.grenzen[0]);
  });
  it('Gruppen: gleiche Grenzen, gleiche Zahl Klassen, höchste Säule über alle', () => {
    const r = klassenJeGruppe({ a: [1, 2, 3], b: [8, 9, 9, 9] }, 2, 0)!;
    expect(r.klassen.a!.anzahl).toHaveLength(r.klassen.b!.anzahl.length);
    expect(r.hoechste).toBe(4);
    expect(r.klassen.a!.grenzen).toEqual(r.klassen.b!.grenzen);
  });
  it('Gipfel zählen', () => { expect(gipfel([1, 3, 1, 4, 2])).toBe(2); expect(gipfel([2, 2, 2])).toBe(1); expect(gipfel([1, 2, 3])).toBe(1); });
});
