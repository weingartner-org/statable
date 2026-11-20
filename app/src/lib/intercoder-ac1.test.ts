import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { intercoder } from './intercoder';

/* Stufe 5, Paket 5B: Gwets AC1 im Ergebnis von `intercoder` (Feld `ac1: Koef`, immer nominal, ungerundet, nach irrCAC::gwet.ac1.raw; Fachblatt "Gwets AC1 (neu in intercoder.ts)").
 * Sollwerte: scripts/intercoder-ac1-erwartet.R -> testdaten/intercoder-ac1-erwartet.json; Daten wie in intercoder-erwartet.json (Fälle A bis K).
 * Veröffentlichtes Beispiel: irrCAC-Vignette (CRAN), cac.raw4raters = Fall A: AC1 0,77544, SE 0,14295, KI (0,461; 1).
 * Absichtlich ROT, bis `ac1` in lib/intercoder.ts gebaut ist.
 * AC1 bei "alles gleich": null (Opus-Entscheid, wie bp); irrCAC-Rohwert 1 steht nur als `ac1_irrCAC_roh` im JSON. */

type Wert = string | number | null;
type Koef = { wert: number | null; se: number | null; unten: number | null; oben: number | null };
const lies = (p: string) => JSON.parse(readFileSync(new URL(`./testdaten/${p}`, import.meta.url), 'utf8'));
const D = lies('intercoder-erwartet.json') as { faelle: { name: string; daten: Wert[][]; n_kodierende: number; skalen: ('nominal' | 'ordinal' | 'interval')[]; alles_gleich: boolean }[] };
const A = lies('intercoder-ac1-erwartet.json') as { veroeffentlicht: { wert: number; se: number; ki_unten_gerundet: number; ki_oben: number; pa: number; pe: number }; faelle: { name: string; alles_gleich: boolean; ac1: Koef & { pa?: number; pe?: number } }[] };
const spalten = (f: (typeof D.faelle)[number]): Wert[][] => Array.from({ length: f.n_kodierende }, (_, j) => f.daten.map(z => z[j]!));
const nah = (a: number | null | undefined, b: number | null, tol: number) => {
  if (b === null) { expect(a ?? null).toBeNull(); return; }
  expect(a, 'Wert fehlt').toBeTypeOf('number');
  expect(Math.abs(a! - b) / Math.max(1, Math.abs(b))).toBeLessThan(tol);
};
const ac1 = (e: unknown) => (e as { ac1?: Koef }).ac1;

describe('Gwets AC1 gegen R (irrCAC::gwet.ac1.raw ungerundet; Wert 1e-9, SE und KI 1e-8)', () => {
  for (const s of A.faelle) {
    if (s.alles_gleich) continue;
    const f = D.faelle.find(x => x.name === s.name)!;
    it(`${s.name}`, () => {
      const e = intercoder(spalten(f), f.skalen[0]!);
      const k = ac1(e);
      expect(k, 'ac1 fehlt im Ergebnis').toBeTruthy();
      nah(k!.wert, s.ac1.wert, 1e-9); nah(k!.se, s.ac1.se, 1e-8); nah(k!.unten, s.ac1.unten, 1e-8); nah(k!.oben, s.ac1.oben, 1e-8);
    });
  }
  it('AC1 ist immer nominal: die Skala (nominal, ordinal, interval) ändert den Wert nicht', () => {
    for (const f of D.faelle.filter(x => x.skalen.length === 3 && !x.alles_gleich)) {
      const n = ac1(intercoder(spalten(f), 'nominal'))?.wert, o = ac1(intercoder(spalten(f), 'ordinal'))?.wert, i = ac1(intercoder(spalten(f), 'interval'))?.wert;
      expect(n, f.name).toBeTypeOf('number'); expect(o).toBe(n); expect(i).toBe(n);
    }
  });
  it('"alles gleich" (Opus-Entscheid): ac1 ist ein Koef mit allen Feldern null, wie bp; allesGleich bleibt true', () => {
    const f = D.faelle.find(x => x.alles_gleich)!, e = intercoder(spalten(f), 'nominal');
    expect(e.allesGleich).toBe(true);
    expect(ac1(e)).toEqual({ wert: null, se: null, unten: null, oben: null });
  });
});

describe('Veröffentlichtes Beispiel: irrCAC-Vignette, cac.raw4raters (4 Kodierende, 12 Einheiten, Lücken)', () => {
  const f = D.faelle.find(x => x.name === 'A_krippendorff_beispiel')!;
  it('AC1 = 0,77544, SE = 0,14295 (5 Stellen), KI-Untergrenze 0,461, Obergrenze 1', () => {
    const k = ac1(intercoder(spalten(f), 'nominal'))!;
    expect(k).toBeTruthy();
    expect(Math.round(k.wert! * 1e5) / 1e5).toBe(A.veroeffentlicht.wert);
    expect(Math.round(k.se! * 1e5) / 1e5).toBe(A.veroeffentlicht.se);
    expect(Math.round(k.unten! * 1e3) / 1e3).toBe(A.veroeffentlicht.ki_unten_gerundet);
    expect(k.oben).toBe(A.veroeffentlicht.ki_oben);
  });
  it('Gegenprobe der Teile aus der Vignette: Paar-Übereinstimmung pa = 0,8181818 und Zufallsübereinstimmung pe = 0,1903212 ergeben AC1 = (pa - pe) / (1 - pe)', () => {
    const { pa, pe } = A.veroeffentlicht;
    nah((pa - pe) / (1 - pe), A.veroeffentlicht.wert, 1e-5);
    const e = intercoder(spalten(f), 'nominal');
    nah(e.prozent.wert, pa, 1e-6);   // pa.coeff.raw: gleiche Paar-Übereinstimmung
  });
});

describe('AC1 bei hoher Übereinstimmung (Kappa-Paradox, Fall C): AC1 bleibt hoch, Fleiss-Kappa kippt', () => {
  it('seltene Kategorie: AC1 > 0,9 und Fleiss < 0,4', () => {
    const f = D.faelle.find(x => x.name === 'C_seltene_kategorie')!, e = intercoder(spalten(f), 'nominal');
    expect(ac1(e)!.wert!).toBeGreaterThan(0.9); expect(e.fleiss!.wert!).toBeLessThan(0.4);
  });
});
