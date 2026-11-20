import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/kurstests-erwartet.json';
import { anteilTest, eineVarianz, zweiVarianzen, anteilSchritte, eineVarianzSchritte, zweiVarianzenSchritte, anteilSatz } from './kurstests';
import { s } from './sitzung.svelte';

// Sollwerte aus R 4.6.1 (scripts/kurstests-erwartet.R; binom.test, prop.test, var.test, DescTools::VarTest/BinomCI als zweite Quelle).
const nah = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));

describe('Kurs-Tests gegen R', () => {
  for (const e of erwartet.anteil) it(`Anteil: ${e.name}`, () => {
    const r = anteilTest(e.x, e.n, e.p0)!;
    nah(r.pExakt, e.pExakt, 1e-9); nah(r.lo, e.lo, 1e-9); nah(r.hi, e.hi, 1e-9); nah(r.z, e.z, 1e-12); nah(r.pZ, e.pZ, 1e-9);
  });
  for (const e of erwartet.eineVarianz) it(`eine Varianz: ${e.name}`, () => {
    const r = eineVarianz(e.n, e.sd, e.sigma0)!;
    nah(r.chi2, e.chi2, 1e-10); expect(r.df).toBe(e.df); nah(r.p, e.p, 1e-9); nah(r.sdLo, e.sdLo, 1e-8); nah(r.sdHi, e.sdHi, 1e-8);
  });
  for (const e of erwartet.zweiVarianzen) it(`zwei Varianzen: ${e.name}`, () => {
    const r = zweiVarianzen(e.n1, e.sd1, e.n2, e.sd2)!;
    nah(r.f, e.f, 1e-10); expect([r.d1, r.d2]).toEqual([e.d1, e.d2]); nah(r.p, e.p, 1e-9); nah(r.lo, e.lo, 1e-8); nah(r.hi, e.hi, 1e-8);
  });
});

describe('Kurs-Tests: Grenzen und Texte', () => {
  it('nicht rechenbar gibt null', () => {
    expect(anteilTest(3, 0, 0.5)).toBeNull(); expect(anteilTest(3, 10, 0)).toBeNull(); expect(anteilTest(11, 10, 0.5)).toBeNull();
    expect(eineVarianz(1, 2, 1)).toBeNull(); expect(eineVarianz(5, 0, 1)).toBeNull(); expect(zweiVarianzen(5, 1, 1, 1)).toBeNull();
  });
  it('alle Fälle in der Kategorie: Intervall bis 1', () => { const r = anteilTest(10, 10, 0.5)!; expect(r.hi).toBe(1); nah(r.pExakt, 0.001953125, 1e-12); });
  it('Excel deutsch mit Semikolon und Komma, englisch mit Komma und Punkt', () => {
    s.einst.sprache = 'de';
    const a = anteilSchritte(anteilTest(7, 20, 0.2)!);
    expect(a.excel[0]).toBe('z-Wert: =(7/20-0,2)/WURZEL(0,2*(1-0,2)/20)');
    expect(a.excel[2]).toContain('=1-BINOM.VERT(6; 20; 0,2; WAHR)');
    expect(eineVarianzSchritte(eineVarianz(8, 0.87831, 0.5)!).excel[1]).toMatch(/^p-Wert \(zweiseitig\): =2\*MIN\(CHIQU\.VERT\([\d,]+; 7; WAHR\); CHIQU\.VERT\.RE\([\d,]+; 7\)\)$/);
    s.einst.sprache = 'en';
    expect(anteilSchritte(anteilTest(7, 20, 0.2)!).excel[0]).toBe('z value: =(7/20-0.2)/SQRT(0.2*(1-0.2)/20)');
    expect(zweiVarianzenSchritte(zweiVarianzen(5, 1, 7, 2)!).excel[0]).toContain('=F.TEST(A, B)');
    expect(zweiVarianzenSchritte(zweiVarianzen(5, 1, 7, 2)!).ti[0]).toContain('TI-83 Plus: D:2-SampFTest');
    s.einst.sprache = 'de';
  });
  it('unter dem Vergleichswert: binomcdf ohne 1 −', () => {
    s.einst.sprache = 'de';
    expect(anteilSchritte(anteilTest(0, 10, 0.1)!).ti[1]).toContain('binomcdf(10, 0.1, 0) gibt P(X ≤ 0)');
  });
  it('Satz', () => {
    s.einst.sprache = 'de';
    expect(anteilSatz(anteilTest(7, 20, 0.2)!, 'Note', 'sehr gut')).toContain('7 von 20');
  });
});

describe('Kurs-Tests im Bericht', () => {
  it('Satz und APA-Zeile für festgelegten Anteil und Streuung', async () => {
    s.einst.sprache = 'de';
    const { mitKursTests } = await import('./kurstests');
    const e = { art: 'verteilung', zahlen: [{ name: 'Punkte', n: 8, m: 5.3, sd: 0.87831, min: 4, max: 7 }], gruppen: [{ name: 'Note', n: 20, fehlend: 0, werte: [{ name: 'gut', anzahl: 7, anteil: 0.35 }, { name: 'schlecht', anzahl: 13, anteil: 0.65 }] }],
      anteilTests: { Note: { kategorie: 'gut', p0: 0.2 } }, sigmaWerte: { Punkte: 0.5 } } as unknown as import('./ergebnis').Verteilung;
    const st = mitKursTests({ haupt: 'H', zusatz: 'Z', apa: '', marken: [] } as unknown as import('./ergebnis').Saetze, e);
    expect(st.zusatz).toMatch(/7 von 20 zu \(35,0\s%\); das liegt über dem Vergleichswert 20\s%/);
    expect(st.zusatz).toContain('liegt über dem Vergleichswert 0,5.');
    expect(st.apa).toContain('exakter Binomialtest p = ,098');
    expect(st.apa).toContain('χ²(7) = 21,60, p = ,006');
  });
});
