import { beforeAll, describe, expect, it } from 'vitest';
import { faktoren, saetzeFaktoren } from './ergebnis';
import { VERFAHREN } from './verfahren';
import { nodeEngine } from './testengine';

/** Prüfung A9 (08.10.): KMO und Bartlett fehlten. Zahlen gegen R psych::KMO / cortest.bartlett: KMO ,7601, χ²(15) = 280,98. */
let e: Awaited<ReturnType<typeof nodeEngine>>;
const DATEN = Array.from({ length: 60 }, (_, i) => { const f = Math.sin(i * 1.7) * 2, g = Math.cos(i * 0.9) * 2; return [f + Math.sin(i * 3.1), f + Math.cos(i * 2.3), f + Math.sin(i * 5.7) * 0.8, g + Math.sin(i * 1.1), g + Math.cos(i * 4.4), g + Math.sin(i * 2.9) * 0.7].map(x => x.toFixed(3)).join(' '); }).join('\n');
beforeAll(async () => { e = await nodeEngine(); e.run(`DATA LIST FREE /a b c d f g.\nBEGIN DATA.\n${DATEN}\nEND DATA.`); });

describe('Faktorenanalyse: KMO und Bartlett', () => {
  it('stehen im Ergebnis, im Satz und in der APA-Zeile', () => {
    const v = VERFAHREN.find(x => x.id === 'faktor')!;
    const w = { l1: ['a', 'b', 'c', 'd', 'f', 'g'], l2: [], l3: [], l4: [] };
    const r = faktoren(e.run(v.syntax(w, {} as never)));
    expect(r.kmo!.kmo).toBeCloseTo(0.7600914, 6);
    expect(r.kmo!.chi2).toBeCloseTo(280.9822, 3);
    expect(r.kmo!.df).toBe(15);
    const s = saetzeFaktoren(r);
    expect(s.zusatz).toContain('Die Daten eignen sich für diese Analyse (KMO = ,76, mittel; Bartlett-Test χ²(15) = 280,98, p < ,001)');
    expect(s.apa).toMatch(/^KMO = ,76, Bartlett χ²\(15\) = 280,98, p < ,001; Hauptkomponentenanalyse/);
  });
});
