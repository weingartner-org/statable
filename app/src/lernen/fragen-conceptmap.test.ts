/**
 * B3 Teil 4c (15.11.2026): Die Zahlen der Einheit `concept-mapping-karte` (Artikel `concept-mapping`, Fragen `eh-cm-…`) stammen aus scripts/ueben-erwartet-conceptmap.R (Basis-R, R 4.6.1).
 * Dieser Wächter rechnet sie mit lib/conceptmap.ts nach und prüft, dass Pfad, Einheit, Thema und Fragen zusammenpassen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FRAGEN_CONCEPTMAP } from './fragen-conceptmap';
import { einheitNach, pfadNach, themaDerFrage } from './lernplan';
import { conceptRechne, type ConceptErgebnis } from '../lib/conceptmap';

const SORTS = [
  [1, 1, 3, 1, 2, 2, 2, 2, 3, 2, 3, 3], [1, 1, 1, 1, 2, 3, 2, 2, 3, 3, 3, 3], [1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 2, 3], [1, 1, 1, 1, 2, 3, 2, 2, 3, 3, 3, 2],
  [1, 3, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3], [1, 1, 1, 1, 2, 2, 2, 2, 1, 3, 3, 3], [1, 1, 1, 1, 3, 2, 2, 2, 1, 3, 3, 3], [1, 3, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3],
  [1, 2, 1, 1, 2, 2, 2, 1, 3, 3, 3, 3], [1, 1, 2, 1, 3, 2, 2, 2, 2, 3, 3, 3],
];
const erw = JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-conceptmap.json', import.meta.url), 'utf8')) as Record<string, number>;
const near = (x: number, y: number, t = 1e-8) => expect(Math.abs(x - y)).toBeLessThan(t);

describe('B3 Teil 4c: Lehre Concept Mapping', () => {
  it('Einheit im Pfad, sechs Fragen, Thema erheben', () => {
    expect(pfadNach('erheben')!.einheiten).toContain('concept-mapping-karte');
    const e = einheitNach('concept-mapping-karte')!;
    expect(e.fragen).toEqual(FRAGEN_CONCEPTMAP.map(f => f.id));
    expect(e.fragen.length).toBe(6);
    for (const f of FRAGEN_CONCEPTMAP) expect(themaDerFrage(f.id)).toBe('erheben');
  });
  it('Zahlen der Fragen stimmen mit der Bibliothek und den R-Sollwerten überein', () => {
    const c = conceptRechne(SORTS, 3) as ConceptErgebnis;
    expect(c.zusammen[0]![1]).toBe(erw.zus12); expect(c.zusammen[0]![4]).toBe(erw.zus15);
    near(c.abstand[0]![1]!, erw.abstand12); near(c.abstand[0]![4]!, erw.abstand15);
    near(c.gof1, erw.gof1);
    near(c.hoehen[8]!, erw.hoehe9, 1e-7); near(c.hoehen[9]!, erw.hoehe10, 1e-7); near(c.hoehen[10]!, erw.hoehe11, 1e-7);
  });
});
