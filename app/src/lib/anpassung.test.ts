import { beforeAll, describe, expect, it } from 'vitest';
import { chi2Anpassung, lilliefors } from './anpassung';
import { shapiroWilk } from './normalitaet';
import { nodeEngine } from './testengine';
import ERW from './testdaten/welle7-erwartet.json';

/* Welle 7, T1 Anpassungstests: Lilliefors-Normalverteilungstest und χ²-Anpassungstest. ROTE TESTS des Prüfers (Fachblatt docs/fachblaetter/WELLE7-MEDIZIN-TESTS-PCA.md, Nachtrag Punkt 4).
 * Der Bauer darf diese Datei nicht ändern; er baut app/src/lib/anpassung.ts, bis sie grün ist.
 * Sollwerte: scripts/welle7-erwartet.R -> testdaten/welle7-erwartet.json (`lilliefors`, `lilliefors_fehler`, `chi2_anpassung`; R 4.6.1, nortest 1.0.4).
 *
 * API (Modul lib/anpassung.ts, JS; wiederverwendet: chi2Verteilung aus power.ts, normal() aus verteilung.ts oder pnorm aus diagrammdaten.ts):
 *   lilliefors(werte) : { d: number; p: number; n: number } | null
 *     Kolmogorov-Smirnov-Test auf Normalverteilung mit aus den Daten geschätztem Mittelwert und SD, mit Lilliefors-Korrektur der p-Werte: GENAU die Rechnung von nortest::lillie.test
 *     (Dallal & Wilkinson 1986): x sortieren, p_i = pnorm((x_i - mean)/sd), D = max(max(i/n - p_i), max(p_i - (i - 1)/n)), SD mit n - 1; dann nortest-Quelltext:
 *       n <= 100: Kd = D, nd = n; sonst Kd = D·(n/100)^0,49, nd = 100.
 *       p = exp(-7,01256·Kd²·(nd + 2,78019) + 2,99587·Kd·√(nd + 2,78019) - 0,122119 + 0,974598/√nd + 1,67997/nd)
 *       ist p > 0,1: KK = (√n - 0,01 + 0,85/√n)·D; KK <= 0,302: p = 1; KK <= 0,5: p = 2,76773 - 19,828315·KK + 80,709644·KK² - 138,55152·KK³ + 81,218052·KK⁴;
 *                   KK <= 0,9: p = -4,901232 + 40,662806·KK - 97,490286·KK² + 94,029866·KK³ - 32,355711·KK⁴; (KK > 0,9 kommt für n >= 5 nie vor - Gittersuche im Skript; die nortest-Zweige für KK <= 1,31 und p = 0 sind darum toter Code.)
 *     Die Werte in `werte` sind die gültigen Zahlen (NaN/Infinity filtert der Aufrufer oder die Funktion). null bei n < 5 (nortest bricht dort ab: "sample size must be greater than 4") und bei konstanten Daten (SD = 0).
 *     KEIN Clamp: Wert wie nortest. D auf 1e-12 relativ, p auf 1e-9 relativ (auch für p ~ 1e-20).
 *     ⚠ PSPP NPAR TESTS /K-S(NORMAL) hat dasselbe D (siehe PSPP-Gegenprobe unten), aber KEINE Lilliefors-Korrektur: sein "Asymp. Sig." ist zu groß (zu konservativ). Statable zeigt diese PSPP-Zahl nie.
 *   chi2Anpassung(beobachtet, anteile?) : Chi2Anpassung
 *     beobachtet = Häufigkeiten je Kategorie (ganze Zahlen >= 0, auch 0 erlaubt); anteile = optional erwartete Anteile ODER Gewichte je Kategorie (werden auf Summe 1 gebracht, wie chisq.test(rescale.p = TRUE));
 *     ohne anteile: Gleichverteilung. Wirft Error bei weniger als 2 Kategorien, negativen/nicht ganzzahligen Häufigkeiten, n = 0, anteile mit anderer Länge, anteile <= 0 oder nicht endlich.
 *   Chi2Anpassung = { n, k, df (= k - 1), chi2, p, anteile (normiert), erwartet[], residuen[] (Pearson (o - e)/√e), stdResiduen[] ((o - e)/√(e·(1 - π)), = chisq.test()$stdres),
 *                     minErwartet, anzahlUnter5, anteilUnter5, hinweisUnter5 (min e < 5), hinweisStreng (min e < 1 ODER mehr als 20 % der Kategorien mit e < 5; Cochran 1954) }
 *     Kein Stetigkeitskorrektur-Schalter, kein exakter Test in Welle 7 (Entscheidung des Prüfers: bei hinweisStreng sagt die Oberfläche, dass p unsicher ist; Fall d: asymptotisch p = ,016, exakt p = ,032).
 * Zweite Quelle: PSPP 2.1.1 in Node (NPAR TESTS /CHISQUARE mit /EXPECTED; /K-S(NORMAL)) - unabhängig vom Modul. */

type Z = Record<string, any>;
const E = ERW as unknown as { lilliefors: Z[]; lilliefors_fehler: Z; chi2_anpassung: Z[] };
const nah = (ist: number | null | undefined, soll: number, was: string, tol = 1e-9) => {
  expect(typeof ist, `${was}: Zahl erwartet`).toBe('number');
  expect(Math.abs((ist as number) - soll), `${was}: ist ${ist}, soll ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
};
const rel = (ist: number | null | undefined, soll: number, was: string, tol = 1e-9) => {
  expect(typeof ist, `${was}: Zahl erwartet`).toBe('number');
  expect(Math.abs((ist as number) - soll) / Math.abs(soll), `${was}: ist ${ist}, soll ${soll}`).toBeLessThanOrEqual(tol);
};
const alle = (ist: number[], soll: number[], was: string, tol = 1e-9) => { expect(ist.length, `${was}: Länge`).toBe(soll.length); soll.forEach((s, i) => nah(ist[i], s, `${was}[${i}]`, tol)); };

describe('Lilliefors-Test gegen nortest::lillie.test', () => {
  it('die Fälle decken jeden erreichbaren Zweig der nortest-Formel ab (formel1, p = 1, Polynom B, Polynom C; je n <= 100 und n > 100)', () => {
    const z = new Set(E.lilliefors.map(f => `${f.zweig}${f.n_gross ? '>100' : ''}`));
    for (const s of ['formel1', 'p_eins', 'poly_b', 'poly_c', 'formel1>100', 'p_eins>100', 'poly_b>100', 'poly_c>100']) expect(z.has(s), `Zweig ${s}`).toBe(true);
    expect(Math.min(...E.lilliefors.map(f => f.n))).toBe(5); expect(Math.max(...E.lilliefors.map(f => f.n))).toBe(500);
  });
  for (const f of E.lilliefors) {
    it(`${f.name} (n = ${f.n}, Zweig ${f.zweig}): D und p wie R`, () => {
      const r = lilliefors(f.x as number[])!;
      expect(r, 'Ergebnis').not.toBeNull(); expect(r.n).toBe(f.n);
      nah(r.d, f.d, 'D', 1e-12); rel(r.p, f.p, 'p', 1e-9);
    });
  }
  it('n < 5 und konstante Daten: null (nortest: Fehler bzw. NaN)', () => {
    expect(E.lilliefors_fehler.n4).toMatch(/greater than 4/);
    expect(lilliefors([1, 2, 3, 5])).toBeNull();
    expect(lilliefors([3, 3, 3, 3, 3, 3, 3, 3])).toBeNull();
    expect(lilliefors([])).toBeNull();
  });
  it('die Monte-Carlo-Gegenprobe im Skript liegt innerhalb von 0,02 beim nortest-p (nortest ist eine Näherung; Sollwert bleibt nortest)', () => {
    const mc = E.lilliefors.filter(f => f.monte_carlo);
    expect(mc.length).toBeGreaterThanOrEqual(2);
    for (const f of mc) expect(Math.abs(f.p - f.monte_carlo.p), f.name).toBeLessThan(0.02);
  });
  it('Gegenprobe Shapiro-Wilk (vorhanden in lib/normalitaet.ts) auf denselben Daten wie R', () => {
    for (const f of E.lilliefors.filter(x => x.n >= 5 && x.shapiro)) {
      const s = shapiroWilk(f.x as number[])!; nah(s.w, f.shapiro.w, `${f.name} W`, 1e-6);
      expect(Math.abs(Math.log(s.p / f.shapiro.p)), `${f.name} p`).toBeLessThan(2e-3);
    }
  });
});

describe('χ²-Anpassungstest gegen chisq.test(x, p)', () => {
  it('es gibt 11 Fälle: Gleichverteilung, eigene Anteile, Gewichte, kleine Erwartung, Nullzelle, k = 2', () => expect(E.chi2_anpassung.length).toBe(11));
  for (const f of E.chi2_anpassung) {
    describe(f.name, () => {
      const r = () => chi2Anpassung(f.beobachtet as number[], (f.anteile_eingabe ?? undefined) as number[] | undefined);
      it('n, k, df, χ² und p wie R', () => {
        expect(r().n).toBe(f.n); expect(r().k).toBe(f.k); expect(r().df).toBe(f.df);
        nah(r().chi2, f.chi2, 'chi2', 1e-12); rel(r().p, f.p, 'p', 1e-8);
      });
      it('Anteile (normiert), erwartete Häufigkeiten, Residuen und standardisierte Residuen', () => {
        alle(r().anteile, f.anteile, 'anteile', 1e-12); alle(r().erwartet, f.erwartet, 'erwartet', 1e-12);
        alle(r().residuen, f.residuen, 'residuen', 1e-10); alle(r().stdResiduen, f.std_residuen, 'stdResiduen', 1e-10);
      });
      it('Hinweis bei kleinen erwarteten Häufigkeiten (< 5 überhaupt; streng nach Cochran: < 1 oder > 20 % der Kategorien < 5)', () => {
        nah(r().minErwartet, f.min_erwartet, 'minErwartet', 1e-12); expect(r().anzahlUnter5).toBe(f.anzahl_unter5); nah(r().anteilUnter5, f.anteil_unter5, 'anteilUnter5', 1e-12);
        expect(r().hinweisUnter5).toBe(f.hinweis_unter5); expect(r().hinweisStreng).toBe(f.hinweis_streng);
      });
    });
  }
  it('Mendel (9 : 3 : 3 : 1, 315/108/101/32): χ² = 0,470, p = ,925 (Lehrbuch)', () => {
    const m = E.chi2_anpassung.find(f => f.name === 'k_mendel')!; const r = chi2Anpassung(m.beobachtet, m.anteile_eingabe);
    expect(r.chi2).toBeCloseTo(0.470, 3); expect(r.p).toBeCloseTo(0.925, 3);
  });
  it('Randfälle: eine Kategorie mit 0 Beobachtungen zählt mit (df = k - 1); keine Stetigkeitskorrektur bei k = 2; chi2 = 0 gibt p = 1', () => {
    const g = chi2Anpassung([12, 0, 8, 10]); expect(g.df).toBe(3); expect(g.erwartet).toEqual([7.5, 7.5, 7.5, 7.5]);
    const h = chi2Anpassung([60, 40]); expect(h.df).toBe(1); nah(h.chi2, 4, 'chi2', 1e-12);
    const j = chi2Anpassung([10, 10, 10]); expect(j.chi2).toBe(0); expect(j.p).toBe(1);
  });
  it('wirft bei zu wenigen Kategorien, falschen Häufigkeiten, n = 0 und falschen Anteilen', () => {
    expect(() => chi2Anpassung([5])).toThrow();
    expect(() => chi2Anpassung([5, -1])).toThrow();
    expect(() => chi2Anpassung([5, 1.5])).toThrow();
    expect(() => chi2Anpassung([0, 0, 0])).toThrow();
    expect(() => chi2Anpassung([5, 5, 5], [0.5, 0.5])).toThrow();
    expect(() => chi2Anpassung([5, 5, 5], [0.5, 0.5, 0])).toThrow();
    expect(() => chi2Anpassung([5, 5, 5], [0.5, -0.1, 0.6])).toThrow();
    expect(() => chi2Anpassung([5, 5, 5], [0.5, NaN, 0.5])).toThrow();
  });
});

/* ---------- Zweite Quelle: PSPP 2.1.1 (NPAR TESTS), unabhängig vom Modul ---------- */
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });
type Tab = { type: 'table'; label: string; cells: { r: number; c: number; t: string; n?: number }[] };
const tabellen = (items: unknown[]) => items.filter((i): i is Tab => (i as Tab).type === 'table');
const nach = (t: Tab, r: number, c: number) => t.cells.find(x => x.r === r && x.c === c)?.n;
/** Zahl unmittelbar nach der Beschriftungszelle (Tabelle der K-S-Probe ist als Liste von Beschriftung, Wert aufgebaut). */
const nachLabel = (t: Tab, text: string) => { const i = t.cells.findIndex(x => x.t === text); return t.cells[i + 1]?.n; };

describe('PSPP NPAR TESTS /CHISQUARE als zweite Quelle', () => {
  for (const f of E.chi2_anpassung) {
    it(`${f.name}: χ², df, Asymp. Sig. und Erwartungswerte wie das Modul und wie R`, () => {
      const k = f.k as number, zeilen = (f.beobachtet as number[]).map((v, i) => [i + 1, v] as const).filter(([, v]) => v > 0).map(([i, v]) => `${i} ${v}`).join('\n');
      const erwartet = f.anteile_eingabe ? `/EXPECTED=${(f.anteile_eingabe as number[]).map(a => a.toPrecision(17)).join(' ')}` : '/EXPECTED=EQUAL';
      const items = e.run(`NEW FILE.\nDATA LIST NOTABLE LIST /kat anz.\nBEGIN DATA\n${zeilen}\nEND DATA.\nWEIGHT BY anz.\nNPAR TESTS /CHISQUARE=kat(1,${k}) ${erwartet}.`);
      const ts = tabellen(items).find(t => t.label === 'Test Statistics')!; expect(ts, 'PSPP-Tabelle Test Statistics').toBeDefined();
      nah(nach(ts, 1, 1), f.chi2, 'PSPP chi2', 1e-9); expect(nach(ts, 1, 2)).toBe(f.df); rel(nach(ts, 1, 3), f.p, 'PSPP p', 1e-7);
      const fr = tabellen(items).find(t => t.cells.some(c => c.t === 'Expected N'))!; const spalte = fr.cells.find(c => c.t === 'Expected N')!.c;
      const ex = fr.cells.filter(c => c.c === spalte && c.r >= 1 && typeof c.n === 'number').map(c => c.n as number);
      alle(ex, f.erwartet, 'PSPP erwartet', 1e-9);
      const r = chi2Anpassung(f.beobachtet, f.anteile_eingabe ?? undefined);
      nah(r.chi2, nach(ts, 1, 1)!, 'Modul gegen PSPP chi2', 1e-9); rel(r.p, nach(ts, 1, 3)!, 'Modul gegen PSPP p', 1e-7);
    });
  }
});

describe('PSPP NPAR TESTS /K-S(NORMAL): dasselbe D, aber OHNE Lilliefors-Korrektur', () => {
  const psppKs = (x: number[]) => {
    const items = e.run(`NEW FILE.\nDATA LIST NOTABLE LIST /x.\nBEGIN DATA\n${x.join('\n')}\nEND DATA.\nNPAR TESTS /K-S(NORMAL)=x.`);
    const t = tabellen(items).find(i => /Kolmogorov-Smirnov/.test(i.label))!; expect(t, 'PSPP-Tabelle K-S').toBeDefined();
    return { d: nachLabel(t, 'Absolute')!, p: nachLabel(t, 'Asymp. Sig. (2-tailed)')! };
  };
  const fall = E.lilliefors.filter(f => f.n >= 5);
  for (const f of fall) {
    it(`${f.name}: PSPP-D = Lilliefors-D`, () => {
      const q = psppKs(f.x as number[]); nah(q.d, f.d, 'D PSPP', 1e-9); nah(lilliefors(f.x as number[])!.d, q.d, 'D Modul', 1e-9);
    });
  }
  it('bei kleinem Lilliefors-p ist das p von PSPP deutlich größer (ohne Korrektur zu konservativ) - Statable zeigt die PSPP-Zahl nie', () => {
    const klein = fall.filter(f => f.p < 0.05 && f.n <= 150); expect(klein.length).toBeGreaterThanOrEqual(3);
    for (const f of klein) expect(psppKs(f.x as number[]).p, f.name).toBeGreaterThan(f.p);
    const f = fall.find(x => x.name === 'd_n20_formel1_p_klein')!; const q = psppKs(f.x as number[]);
    expect(q.p).toBeGreaterThan(0.1); expect(f.p).toBeLessThan(0.01);               // n = 20, D = ,24: PSPP p = ,18, Lilliefors p = ,003
  });
});
