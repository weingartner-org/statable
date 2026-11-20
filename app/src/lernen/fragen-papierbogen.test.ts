/**
 * E8 Teil 2c (15.11.2026): Die Einheit `papierbogen-scannen` (Artikel `papierbogen-scannen`, Fragen `eh-pb-…`) stützt sich auf Eigenschaften des Lesers in lib/papierbogen.ts.
 * Dieser Wächter prüft, dass Pfad, Einheit, Thema und Fragen zusammenpassen und dass die genannten Größen im Quelltext stehen.
 */
import { describe, it, expect } from 'vitest';
import { FRAGEN_PAPIERBOGEN } from './fragen-papierbogen';
import { einheitNach, pfadNach, themaDerFrage } from './lernplan';
import { KAESTCHEN, bogenLayout } from '../lib/papierbogen';

describe('E8 Teil 2c: Lehre Papierbogen', () => {
  it('Einheit im Pfad, sechs Fragen, Thema erheben', () => {
    expect(pfadNach('erheben')!.einheiten).toContain('papierbogen-scannen');
    const e = einheitNach('papierbogen-scannen')!;
    expect(e.fragen).toEqual(FRAGEN_PAPIERBOGEN.map(f => f.id));
    expect(e.fragen.length).toBe(6);
    for (const f of FRAGEN_PAPIERBOGEN) expect(themaDerFrage(f.id)).toBe('erheben');
  });
  it('Zahlen der Fragen stimmen mit dem Aufbau überein', () => {
    expect(KAESTCHEN.maxZeilen).toBe(25);
    expect(KAESTCHEN.maxOptionen).toBe(20);
    const fragen = Array.from({ length: 60 }, (_, i) => ({ nr: i + 1, codes: [1, 2, 3] }));
    expect(bogenLayout(fragen, { planId: 'x', revision: 1, bogen: 1 }).length).toBe(3);
  });
});
