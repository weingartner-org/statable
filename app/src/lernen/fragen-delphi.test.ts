/**
 * B3 Teil 2c (15.11.2026): Die Zahlen der Einheit `delphi-befragung` (Artikel `delphi`, Fragen `eh-dl-…`) stammen aus scripts/ueben-erwartet-delphi.R (Basis-R, R 4.6.1).
 * Dieser Wächter rechnet sie mit lib/delphi.ts nach (die Bibliothek ist gegen R geprüft: lib/delphi.test.ts) und prüft, dass Pfad, Einheit, Thema und Fragen zusammenpassen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FRAGEN_DELPHI } from './fragen-delphi';
import { einheitNach, pfadNach, themaDerFrage } from './lernplan';
import { delphiKennzahlen, kendallW } from '../lib/delphi';

const R1 = [[5, 4, 2, 3, 1], [4, 4, 3, 3, 2], [5, 3, 2, 4, 1], [4, 5, 1, 3, 2], [5, 4, 2, 2, 1], [3, 4, 3, 3, null]];
const R2 = [[5, 4, 2, 3, 1], [5, 4, 2, 3, 2], [5, 4, 2, 3, 1], [4, 4, 2, 3, 1], [5, 4, 2, 3, 1], [4, 4, 3, 3, 2]];
const regel = { maxIqr: 1, band: [4, 5] as [number, number], minAnteil: 0.75 };
const erw = JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-delphi.json', import.meta.url), 'utf8')) as Record<string, number>;
const near = (x: number, y: number) => expect(Math.abs(x - y)).toBeLessThan(1e-8);

describe('B3 Teil 2c: Lehre Delphi-Befragung', () => {
  it('Einheit im Pfad, sechs Fragen, Thema erheben', () => {
    expect(pfadNach('erheben')!.einheiten).toContain('delphi-befragung');
    const e = einheitNach('delphi-befragung')!;
    expect(e.fragen).toEqual(FRAGEN_DELPHI.map(f => f.id));
    expect(e.fragen.length).toBe(6);
    for (const f of FRAGEN_DELPHI) expect(themaDerFrage(f.id)).toBe('erheben');
  });
  it('Zahlen der Fragen stimmen mit der Bibliothek und den R-Sollwerten überein', () => {
    const z1 = delphiKennzahlen(R1, regel), z2 = delphiKennzahlen(R2, regel);
    near(z1[0].median, erw.a1Median); near(z1[0].iqr, erw.a1Iqr); near(100 * z1[0].anteil!, erw.a1AnteilProzent);
    near(z1[2].median, erw.a3Median); near(z1[2].iqr, erw.a3Iqr); near(100 * z1[2].anteil!, erw.a3AnteilProzent);
    near(z2[0].iqr, erw.runde2A1Iqr); near(100 * z2[0].anteil!, erw.runde2A1AnteilProzent);
    expect(z1[0].konsens).toBe(true);
    expect(z1[2].konsens).toBe(false);
    const w = kendallW(R1)!;
    expect(w.m).toBe(erw.personenInW);
    near(w.w, erw.kendallW); near(w.p, erw.p);
  });
});
