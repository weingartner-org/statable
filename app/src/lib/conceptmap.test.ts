import { describe, expect, it } from 'vitest';
import { conceptRechne, type ConceptErgebnis } from './conceptmap';

// Sollwerte: scripts/conceptmap-erwartet.R (Basis-R 4.6.1: cmdscale, hclust ward.D2, cutree); Zeilen = Personen, Spalten = Aussagen
const SORTS = [
  [1, 1, 3, 1, 2, 2, 2, 2, 3, 2, 3, 3], [1, 1, 1, 1, 2, 3, 2, 2, 3, 3, 3, 3], [1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 2, 3], [1, 1, 1, 1, 2, 3, 2, 2, 3, 3, 3, 2],
  [1, 3, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3], [1, 1, 1, 1, 2, 2, 2, 2, 1, 3, 3, 3], [1, 1, 1, 1, 3, 2, 2, 2, 1, 3, 3, 3], [1, 3, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3],
  [1, 2, 1, 1, 2, 2, 2, 1, 3, 3, 3, 3], [1, 1, 2, 1, 3, 2, 2, 2, 2, 3, 3, 3],
];
const WICHT = [
  [4, 5, 4, 4, 3, 2, 2, 2, 4, 4, 3, 2], [4, 4, 3, 4, 2, 2, 3, 2, 4, 4, 4, 4], [5, 4, 3, 4, 1, 1, 1, 1, 3, 3, 5, 3], [4, 4, 4, 3, 2, 2, 2, 1, 3, 4, 2, 3],
  [4, 5, 4, 5, 1, 2, 2, 2, 3, 3, 2, 3], [3, 5, 5, 5, 2, 2, 2, 3, 3, 2, 4, 2], [5, 5, 4, 3, 3, 3, 2, 3, 4, 3, 3, 2], [5, 4, 5, 5, 2, 3, 1, 2, 4, 3, 4, 2],
  [3, 4, 4, 4, 2, 1, 2, 2, 2, 3, 4, 2], [4, 5, 3, 3, 3, 3, 2, 2, 3, 3, 4, 4],
];
const MACH = [
  [3, 3, 4, 3, 2, 2, 4, 5, 1, 2, 2, 3], [4, 3, 3, 5, 5, 5, 4, 4, 2, 3, 2, 1], [2, 1, 4, 3, 3, 4, 4, 3, 2, 2, 3, 4], [4, 3, 3, 4, 3, 4, 4, 3, 3, 2, 1, 1],
  [3, 2, 4, 3, 4, 3, 4, 4, 1, 3, 2, 2], [4, 3, 2, 3, 2, 5, 4, 4, 2, 3, 1, 2], [3, 3, 3, 3, 4, 3, 5, 4, 4, 2, 2, 1], [4, 2, 1, 2, 4, 4, 4, 3, 3, 2, 2, 1],
  [2, 5, 4, 4, 4, 4, 4, 3, 3, 3, 2, 2], [2, 3, 5, 4, 5, 5, 5, 5, 3, 1, 2, 2],
];
const HOEHEN = [0, 0.0290254778, 0.0541426242, 0.0821521262, 0.0857231188, 0.1177392662, 0.2844144817, 0.2872477292, 0.3923934847, 1.4749133856, 1.8247387826];
const MW = [4.1, 4.5, 3.9, 4.0, 2.1, 2.1, 1.9, 2.0, 3.3, 3.2, 3.5, 2.7];
const nah = (a: number, b: number, t: number) => expect(Math.abs(a - b)).toBeLessThan(t);

describe('Concept Mapping', () => {
  const e = conceptRechne(SORTS, 3, [WICHT, MACH]) as ConceptErgebnis;
  it('Ähnlichkeit, Güte und Ward-Höhen wie R', () => {
    expect(e.fehler).toBeUndefined();
    expect(e.zusammen[0]![1]).toBe(7); expect(e.zusammen[0]![4]).toBe(0);
    nah(e.gof1, 0.7140644132, 1e-8);
    e.hoehen.forEach((h, i) => nah(h, HOEHEN[i]!, 1e-7));
  });
  it('Gruppen und Bewertungen wie R', () => {
    expect(e.gruppe).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]);
    e.aussageMittel[0]!.forEach((m, i) => nah(m, MW[i]!, 1e-9));
    expect(e.goZone!.map(Number)).toEqual([1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
  it('Fehler statt Zahlen bei unbrauchbarer Eingabe', () => {
    expect(conceptRechne([SORTS[0]!], 3)).toEqual({ fehler: 'zu-wenig-personen' });
    expect(conceptRechne(SORTS, 1)).toEqual({ fehler: 'k' });
    expect(conceptRechne(SORTS.map(() => new Array(12).fill(1)), 3)).toEqual({ fehler: 'alle-gleich' });
  });
});
