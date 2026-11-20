import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { eigenwerteSym, korrelationsMatrix, parallelAnalyse, zufall, bartlettKorrelation } from './parallelanalyse';
import { faktoren, faktorTabellenBereinigen, saetzeFaktoren } from './ergebnis';
import { VERFAHREN, type Ctx } from './verfahren';
import { nodeEngine } from './testengine';
import { leseCsv, zurEngine } from './einlesen';
import { s } from './sitzung.svelte';

/* Abschlusstest F3 (10.10.2026): Faktorenanalyse - Parallelanalyse nach Horn (1965) als Vorschlag für die Faktorzahl, Faktorzahl wählbar,
 * Hauptachsen + Promax als zweite Methode. Vergleichswerte: scripts/faktor-parallel-erwartet.R (psych::fa.parallel(fa = "pc", n.iter = 100),
 * psych::fa(fm = "pa", rotate = "Promax"), Daten app/src/lib/testdaten/fa-*.csv). */
const lies = (nm: string) => { const z = readFileSync(new URL(`./testdaten/fa-${nm}.csv`, import.meta.url), 'utf8').trim().split('\n'); return z.slice(1).map(l => l.split(',').map(Number)); };
const R = {
  zwei: { eigen: [2.9248, 1.5493, 0.8627, 0.6629, 0.5842, 0.5448, 0.4831, 0.3883], kaiser: 2, parallel: 2, q95: [1.4, 1.2601, 1.1636, 1.0729, 1.0061, 0.938, 0.8696, 0.7946] },
  drei: { eigen: [2.4582, 1.7222, 1.4715, 1.1636, 0.9544, 0.8675, 0.6964, 0.6647, 0.6083, 0.5596, 0.4402, 0.3935], kaiser: 4, parallel: 3, q95: [1.6234, 1.4394, 1.3221, 1.2271, 1.1453, 1.0668, 0.9983, 0.9297, 0.8653, 0.8011, 0.7324, 0.6584] },
  eins: { eigen: [2.3779, 1.2086, 1.1407, 1.0438, 0.9105, 0.8654, 0.7064, 0.6558, 0.6169, 0.4739], kaiser: 4, parallel: 1, q95: [1.6817, 1.47, 1.3204, 1.1989, 1.0943, 0.9947, 0.9059, 0.8213, 0.7371, 0.6395] }
} as const;

describe('Eigenwerte (Jacobi) und Korrelationsmatrix', () => {
  it('bekannte Matrix', () => {
    const ev = eigenwerteSym([[2, 1, 0], [1, 2, 1], [0, 1, 2]]);
    expect(ev.map(v => v.toFixed(6))).toEqual([(2 + Math.SQRT2).toFixed(6), '2.000000', (2 - Math.SQRT2).toFixed(6)]);
  });
  it('Eigenwerte der Korrelationsmatrix wie R eigen(cor(x))', () => {
    for (const nm of ['zwei', 'drei', 'eins'] as const) expect(eigenwerteSym(korrelationsMatrix(lies(nm))).map(v => v.toFixed(4))).toEqual(R[nm].eigen.map(v => v.toFixed(4)));
  });
});

describe('Parallelanalyse (Horn 1965) wie psych::fa.parallel(fa = "pc", n.iter = 100)', () => {
  it('gleiche Komponentenzahl wie R auf drei Datensätzen, für mehrere Startwerte', () => {
    for (const nm of ['zwei', 'drei', 'eins'] as const) for (const seed of [1, 2, 3, 42, 2026]) {
      expect(parallelAnalyse(R[nm].eigen as unknown as number[], lies(nm).length, { seed }).komponenten).toBe(R[nm].parallel);
    }
  });
  it('95. Perzentil der Zufalls-Eigenwerte (2000 Läufe) liegt beim Wert aus R (Abweichung nur durch den Zufall)', () => {
    for (const nm of ['zwei', 'drei', 'eins'] as const) {
      const pa = parallelAnalyse(R[nm].eigen as unknown as number[], lies(nm).length, { iter: 2000, seed: 7 });
      pa.schwelle.forEach((v, i) => expect(Math.abs(v - R[nm].q95[i]!), `${nm} ${i}`).toBeLessThan(0.03));
    }
  });
  it('Bartlett-Zerlegung = Korrelationen echter Zufallsdaten gleicher Größe (Mittel der Eigenwerte gleich)', () => {
    const n = 40, p = 6, z = zufall(99), iter = 3000;
    const mittel = (f: () => number[]) => { const s = Array(p).fill(0); for (let i = 0; i < iter; i++) f().forEach((v, j) => (s[j] += v / iter)); return s; };
    const direkt = mittel(() => eigenwerteSym(korrelationsMatrix(Array.from({ length: n }, () => Array.from({ length: p }, () => z.normal())))));
    const bartlett = mittel(() => eigenwerteSym(bartlettKorrelation(n, p, z)));
    direkt.forEach((v, i) => expect(Math.abs(v - bartlett[i]!)).toBeLessThan(0.02));
  });
  it('fester Startwert: dasselbe Ergebnis bei jedem Aufruf', () => {
    const a = parallelAnalyse(R.drei.eigen as unknown as number[], 150), b = parallelAnalyse(R.drei.eigen as unknown as number[], 150);
    expect(a).toEqual(b);
  });
});

describe('Faktorenanalyse im Blatt: Methode, Zahl, Sätze', () => {
  let e: Awaited<ReturnType<typeof nodeEngine>>;
  const v = VERFAHREN.find(x => x.id === 'faktor')!;
  const ctx = (fa?: Ctx['fa']) => ({ fa } as unknown as Ctx);
  const w = (p: number) => ({ l1: Array.from({ length: p }, (_, i) => `q${i + 1}`), l2: [], l3: [], l4: [] });
  const lade = async (nm: string) => { e = await nodeEngine(); const { syntax, csv } = zurEngine(leseCsv(readFileSync(new URL(`./testdaten/fa-${nm}.csv`, import.meta.url), 'utf8'))); e.run(syntax, { '/import.csv': csv }); };
  beforeAll(() => { s.einst.sprache = 'de'; s.einst.zahl = 'komma'; });

  it('Befehl: Standard Hauptkomponenten + Varimax + Kaiser; Zahl wählbar; Hauptachsen + Promax(4)', () => {
    expect(v.syntax(w(8), ctx())).toContain('/CRITERIA=MINEIGEN(1) ITERATE(25)\n  /EXTRACTION=PC\n  /ROTATION=VARIMAX.');
    expect(v.syntax(w(8), ctx({ methode: 'pc', zahl: 3, grenze: null }))).toContain('/CRITERIA=FACTORS(3) ITERATE(25)');
    const paf = v.syntax(w(8), ctx({ methode: 'paf', zahl: 2, grenze: null }));
    expect(paf).toContain('/PRINT=UNIVARIATE INITIAL EXTRACTION KMO ROTATION'); expect(paf).toContain('/CRITERIA=FACTORS(2) ITERATE(25)'); expect(paf).toContain('/EXTRACTION=PAF\n  /ROTATION=PROMAX(4).');
  });
  it('drei Faktoren, Hauptkomponenten: Kaiser 4, Parallelanalyse 3 - der Satz nennt beide', async () => {
    await lade('drei');
    const r = faktoren(e.run(v.syntax(w(12), ctx())));
    expect([r.kaiser, r.parallel, r.faktoren.length]).toEqual([4, 3, 4]);
    expect(saetzeFaktoren(r).zusatz).toContain('Die Parallelanalyse schlägt 3 Komponenten vor, das Kaiser-Kriterium 4.');
    const r3 = faktoren(e.run(v.syntax(w(12), ctx({ methode: 'pc', zahl: 3, grenze: null }))), [], 3);
    expect(r3.faktoren.length).toBe(3);
    expect(saetzeFaktoren(r3).zusatz).toContain('Gerechnet mit 3 Komponenten (festgelegt); die Parallelanalyse schlägt 3 vor, das Kaiser-Kriterium 4.');
  });
  it('Hauptachsen, 3 Faktoren (fa-drei): überwiegend negativ ladende Faktoren umgekehrt gelesen; q12 lädt auf keinem Faktor (PSPP lässt die leere Zeile weg)', async () => {
    await lade('drei');
    const items = faktorTabellenBereinigen(e.run(v.syntax(w(12), ctx({ methode: 'paf', zahl: 3, grenze: null }))));
    const r = faktoren(items, w(12).l1.map(n => [n, n] as [string, string]), 3);
    expect(r.fragen).toBe(12); expect(r.ohne).toEqual(['q12']); expect(r.ausgelassen).toBeUndefined();
    expect(r.gespiegelt).toEqual([2, 3]);
    const t = saetzeFaktoren(r);
    expect(t.haupt).toContain('Die 12 Fragen bilden 3 Faktoren');
    expect(t.zusatz).not.toContain('negativ geladen');
    expect(t.zusatz).toContain('Die Faktoren 2 und 3 laden überwiegend negativ; weil das Vorzeichen eines Faktors beliebig ist, sind sie hier umgekehrt gelesen.');
    expect(t.zusatz).toContain('„q12“ lädt auf keinem Faktor (alle Ladungen unter ,30).');
    expect(t.zusatz).toContain('Zusammen erfassen die Faktoren 32\u00a0% der Unterschiede');   // R: ,3183
    // PSPP füllt die Rotationssummen bei Promax mit −1,8·10³⁰⁸/-Infinity - geleert
    const tv = items.find(i => i.type === 'table' && i.label === 'Total Variance Explained') as { cells: { t: string; n?: number }[] };
    expect(tv.cells.some(c => /Infinity/.test(c.t) || (c.n !== undefined && c.n < -1e300))).toBe(false);
  });
  it('ein Faktor: Parallelanalyse 1 gegen Kaiser 4', async () => {
    await lade('eins');
    const r = faktoren(e.run(v.syntax(w(10), ctx())));
    expect([r.kaiser, r.parallel]).toEqual([4, 1]);
    expect(saetzeFaktoren(r).zusatz).toContain('Die Parallelanalyse schlägt 1 Komponente vor, das Kaiser-Kriterium 4.');
  });
  it('Hauptachsen + Promax: Mustermatrix, Faktorkorrelationen, erklärte Varianz wie psych::fa(fm = "pa", rotate = "Promax")', async () => {
    await lade('zwei');
    const r = faktoren(e.run(v.syntax(w(8), ctx({ methode: 'paf', zahl: null, grenze: null }))));
    expect(r.methode).toBe('paf');
    expect([r.kaiser, r.parallel, r.faktoren.length]).toEqual([2, 2, 2]);
    // Zuordnung wie R: q1-q4 auf einem Faktor, q5-q8 auf dem anderen; Ladungen (Mustermatrix) bis auf ,01 wie psych::Promax (m = 4)
    const l = new Map(r.faktoren.flatMap(f => f.fragen.map(q => [q.name, [f.nr, q.ladung] as const])));
    expect(new Set(['q1', 'q2', 'q3', 'q4'].map(n => l.get(n)![0])).size).toBe(1);
    expect(new Set(['q5', 'q6', 'q7', 'q8'].map(n => l.get(n)![0])).size).toBe(1);
    const PSYCH: Record<string, number> = { q1: 0.6809, q2: 0.7813, q3: 0.5519, q4: 0.4755, q5: 0.8344, q6: 0.6098, q7: 0.6004, q8: 0.544 };
    for (const [n, soll] of Object.entries(PSYCH)) expect(Math.abs(l.get(n)![1] - soll), n).toBeLessThan(0.01);
    expect(Math.abs(r.korrelationen![0]![1]! - 0.4066)).toBeLessThan(0.02);   // Φ: PSPP ,4219, psych ,4066 (SPSS-Formel für Φ)
    expect(r.erklaert).toBeCloseTo(0.4239, 3);   // Kommunalitäten / Fragen, wie R sum(communality) / p
    const t = saetzeFaktoren(r);
    expect(t.haupt).toBe('Die 8 Fragen bilden 2 Faktoren (Gruppen von Fragen), die jeweils etwas Gemeinsames messen.');
    expect(t.zusatz).toContain('Die Faktoren hängen zusammen (r = ,42)');
    expect(t.zusatz).toContain('Parallelanalyse und Kaiser-Kriterium schlagen beide 2 Faktoren vor.');
    expect(t.apa).toContain('Hauptachsenanalyse mit Promax-Rotation (κ = 4): 2 Faktoren mit Eigenwert > 1, zusammen 42,4\u00a0% Varianz');
  });
});

describe('Anzeigegrenze der Ladungen', () => {
  it('blendet nur die Tabelle aus, nicht die Zahlen für die Sätze', async () => {
    const { faktorLadungenAusblenden } = await import('./ergebnis');
    const mk = (n: number) => ({ type: 'table', label: 'Rotated Component Matrix', headRows: [1], cells: [{ r: 1, c: 0, t: 'q1' }, { r: 1, c: 1, t: String(n), n }] }) as never;
    const klein = mk(0.2), gross = mk(0.5), alle = mk(0.2);
    faktorLadungenAusblenden([klein, gross], 0.3); faktorLadungenAusblenden([alle], null);
    expect((klein as any).cells[1].t).toBe(''); expect((gross as any).cells[1].t).toBe('0.5'); expect((alle as any).cells[1].t).toBe('0.2');
  });
});
