import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mannWhitney, wilcoxon } from './rangtests';
import { kendall, spearman } from './rangkorrelation';
import { s as sitz } from './sitzung.svelte';
import { saetzeRang, tabellenRang } from './rangsaetze';
import { saetzeZusammenhang, zusammenhangMit, type Zusammenhang } from './ergebnis';
import { pKendallExakt, pMannWhitneyExakt, pSpearmanAS89, pWilcoxonExakt, verteilungKendall, verteilungSpearman, verteilungU, verteilungV } from './exakteTests';

/* Vergleichswerte aus R (Skript: scripts/exakte-erwartet.R): wilcox.test (Voreinstellung = exakt), cor.test(method = "kendall" / "spearman"), je zweiseitig und
 * einseitig. Jede Zahl auf 4 Stellen (hier strenger: 1e-9 relativ). Die Rohwerte stehen in der JSON-Datei. */
interface Hl { hl: number; unten: number; oben: number; niveau: number }
interface Mw extends Hl { name: string; x: number[]; y: number[]; W: number; p: number; p_gr: number; p_kl: number }
interface Wx extends Hl { name: string; vor: number[]; nach: number[]; V: number; p: number; p_gr: number; p_kl: number }
interface Rk { name: string; x: number[]; y: number[]; art: string; r: number; p: number; p_gr: number; p_kl: number }
const R = JSON.parse(readFileSync(new URL('./testdaten/exakte-erwartet.json', import.meta.url), 'utf8')) as { mw: Mw[]; wx: Wx[]; kendall: Rk[]; spearman: Rk[] };
const zahl = (v: unknown): number => (v === '-Inf' ? -Infinity : v === 'Inf' ? Infinity : (v as number));
const nah = (a: number, b: number, tol = 1e-9) => { if (!Number.isFinite(b)) expect(a).toBe(b); else expect(Math.abs(a - b) / Math.max(1e-300, Math.abs(b))).toBeLessThan(tol); };
const vier = (a: number) => +a.toFixed(4);
/** Exaktes KI: wie R; ist eine R-Grenze unendlich (zu wenige Werte), gibt es seit G9 kein Intervall (`ohneKi`, Grenzen null) - der Schätzer bleibt. */
function hlExaktGleich(h: { schaetzer: number; unten: number | null; oben: number | null; exakt?: boolean; niveau?: number; ohneKi?: boolean }, f: Hl) {
  expect(h.exakt).toBe(true);
  nah(h.schaetzer, f.hl, 1e-12);
  if (!Number.isFinite(zahl(f.unten)) || !Number.isFinite(zahl(f.oben))) { expect(h.ohneKi).toBe(true); expect([h.unten, h.oben]).toEqual([null, null]); return; }
  nah(h.unten!, zahl(f.unten), 1e-12); nah(h.oben!, zahl(f.oben), 1e-12); nah(h.niveau!, f.niveau, 1e-9);
}

describe('Mann-Whitney exakt gegen R', () => {
  for (const f of R.mw) it(`${f.name} (${f.x.length} + ${f.y.length})`, () => {
    const m = mannWhitney('y', 'g', { name: 'A', werte: f.x }, { name: 'B', werte: f.y })!;
    expect(m.exakt).toBe(true);
    nah(m.uA, f.W); nah(m.p, f.p); expect(vier(m.p)).toBe(vier(f.p));
    nah(pMannWhitneyExakt(f.W, f.x.length, f.y.length, 'gross'), f.p_gr);
    nah(pMannWhitneyExakt(f.W, f.x.length, f.y.length, 'klein'), f.p_kl);
    hlExaktGleich(m.hl!, f);
  });
  it('B1: n = 5 + 5, p = ,0556 statt ,047 (Normalnäherung)', () => {
    const m = mannWhitney('y', 'g', { name: 'A', werte: [1.2, 2.4, 3.1, 4, 8.5] }, { name: 'B', werte: [5, 6.5, 7.6, 9.1, 10.2] })!;
    expect(vier(m.p)).toBe(0.0556); expect(vier(m.pNaeherung)).toBe(0.0472); expect(m.exakt).toBe(true);
  });
  it('ab 50 in einer Gruppe bleibt die Näherung; mit Bindungen unter 50 ist es exakt (G9)', () => {
    const a = [1, 2, 2, 5, 7], b = [2, 6, 8, 9, 10];
    const m = mannWhitney('y', 'g', { name: 'A', werte: a }, { name: 'B', werte: b })!;
    expect(m.exakt).toBe(true); expect(m.hl!.exakt).toBe(true); expect(m.p).not.toBe(m.pNaeherung);   // Bindungen, aber exakt (Werte gegen R: rangtests-bindungen.test.ts)
    const g = Array.from({ length: 50 }, (_, i) => i + 0.5), h = Array.from({ length: 12 }, (_, i) => i * 3 + 0.25);
    const n = mannWhitney('y', 'g', { name: 'A', werte: g }, { name: 'B', werte: h })!;
    expect(n.exakt).toBe(false); nah(n.p, n.pNaeherung); expect(n.hl!.exakt).toBeFalsy();
  });
});

describe('Wilcoxon (verbunden) exakt gegen R', () => {
  for (const f of R.wx) it(`${f.name} (n = ${f.vor.length})`, () => {
    const w = wilcoxon('a', 'b', f.vor.map((v, i) => [v, f.nach[i]!]))!;
    expect(w.exakt).toBe(true);
    nah(w.vPlus, f.V); nah(w.p, f.p); expect(vier(w.p)).toBe(vier(f.p));
    nah(pWilcoxonExakt(f.V, f.vor.length, 'gross'), f.p_gr); nah(pWilcoxonExakt(f.V, f.vor.length, 'klein'), f.p_kl);
    hlExaktGleich(w.hl!, f);
  });
  it('B1: n = 5, alle Veränderungen positiv: p = ,0625 statt ,043', () => {
    const w = wilcoxon('a', 'b', [[10, 11], [12, 14], [9, 12], [15, 19], [11, 17]])!;
    expect(vier(w.p)).toBe(0.0625); expect(vier(w.pNaeherung)).toBe(0.0431); expect(w.exakt).toBe(true);
  });
  it('mit einer Differenz 0 oder Bindungen: exakt (G9, Nullen entfallen vor dem Ranken); ab 50 Differenzen ohne Nullen Näherung', () => {
    const mitNull = wilcoxon('a', 'b', [[1, 1], [2, 5], [3, 9], [4, 12], [5, 20]])!;
    expect(mitNull.exakt).toBe(true); expect(mitNull.nNull).toBe(1);
    expect(wilcoxon('a', 'b', [[1, 2], [2, 3], [3, 5], [4, 8], [5, 9]])!.exakt).toBe(true);   // Differenzen 1, 1, 2, 4, 4
    expect(wilcoxon('a', 'b', Array.from({ length: 50 }, (_, i) => [0, i + 1] as [number, number]))!.exakt).toBe(false);
  });
});

describe('Kendall τ exakt gegen R', () => {
  for (const f of R.kendall) it(`${f.name} (n = ${f.x.length})`, () => {
    const k = kendall(f.x.map((v, i) => [v, f.y[i]!]))!;
    expect(k.exakt).toBe(true);
    nah(k.r, f.r); nah(k.p, f.p, 1e-8); expect(vier(k.p)).toBe(vier(f.p));
    const n = f.x.length, c = Math.round((f.r + 1) * n * (n - 1) / 4);
    nah(pKendallExakt(c, n, 'gross'), f.p_gr, 1e-8); nah(pKendallExakt(c, n, 'klein'), f.p_kl, 1e-8);
  });
  it('mit Bindungen: Näherung', () => { expect(kendall([[1, 2], [2, 2], [3, 5], [4, 7], [5, 6]])!.exakt).toBe(false); });
});

describe('Spearman gegen R (n ≤ 9 exakt, bis n = 1289 AS 89, mit Bindungen t)', () => {
  for (const f of R.spearman) it(`${f.name} (n = ${f.x.length})`, () => {
    const n = f.x.length, s = spearman(f.x.map((v, i) => [v, f.y[i]!]))!;
    nah(s.r, f.r); nah(s.p, f.p, 1e-8); expect(vier(s.p)).toBe(vier(f.p));
    expect(s.exakt).toBe(n <= 9);
    const S = Math.round((n ** 3 - n) * (1 - f.r) / 6);
    nah(pSpearmanAS89(S, n, 'gross'), f.p_gr, 1e-8); nah(pSpearmanAS89(S, n, 'klein'), f.p_kl, 1e-8);
  });
  it('mit Bindungen: t-Näherung wie bisher (R cor.test, exact = NULL)', () => {
    const s = spearman([[1, 3], [2, 3], [3, 5], [4, 7], [5, 6], [6, 9]])!;
    expect(s.exakt).toBe(false); nah(s.p, s.pNaeherung!);
  });
});

describe('Verteilungen', () => {
  it('Summen und Randwerte', () => {
    expect(verteilungU(5, 5).pmf.length).toBe(26); nah(verteilungU(5, 5).kl(3), 7 / 252);   // choose(10,5) = 252
    expect(verteilungV(5).gr(15)).toBeCloseTo(1 / 32, 12);
    expect(verteilungKendall(7).kl(0)).toBeCloseTo(1 / 5040, 12);
    expect(verteilungSpearman(5).pmf.reduce((a, b) => a + b, 0)).toBe(120);
  });
  it('U ist in (n₁, n₂) symmetrisch', () => { nah(pMannWhitneyExakt(5, 4, 9), pMannWhitneyExakt(5, 9, 4)); });
});

describe('Satz und Tabelle nennen, welcher p-Wert gezeigt wird', () => {
  const mw5 = () => mannWhitney('y', 'g', { name: 'A', werte: [1.2, 2.4, 3.1, 4, 8.5] }, { name: 'B', werte: [5, 6.5, 7.6, 9.1, 10.2] })!;
  it('Mann-Whitney exakt, deutsch', () => {
    sitz.einst.sprache = 'de';
    const st = saetzeRang(mw5(), x => x);
    expect(st.zusatz).toContain('(p = ,056, exakt)');
    expect(st.marken.map(m => m.text)).toContain('p = ,056 (exakt) · über ,05');
    const t = tabellenRang(mw5(), x => x), tx = JSON.stringify(t);
    expect(tx).toContain('p (exakt)'); expect(tx).toContain('Exakter p-Wert');
    expect(tx).toContain('Exaktes KI');   // Hodges-Lehmann: erreichtes Niveau
  });
  it('Mann-Whitney exakt, englisch', () => {
    sitz.einst.sprache = 'en';
    const st = saetzeRang(mw5(), x => x);
    expect(st.zusatz).toContain('(p = .056, exact)');
    expect(JSON.stringify(tabellenRang(mw5(), x => x))).toContain('p (exact)');
    sitz.einst.sprache = 'de';
  });
  it('Bindungen: exakt, mit der Methodenzeile „bedingte Verteilung“ (G9); Näherung erst ab 50 je Gruppe', () => {
    sitz.einst.sprache = 'de';
    const m = mannWhitney('y', 'g', { name: 'A', werte: [1, 2, 2, 5, 7] }, { name: 'B', werte: [2, 6, 8, 9, 10] })!;
    expect(saetzeRang(m, x => x).zusatz).toContain(', exakt)');
    const tx = JSON.stringify(tabellenRang(m, x => x));
    expect(tx).toContain('p (exakt)'); expect(tx).toContain('Exakter p-Wert (bedingte Verteilung bei gleichen Werten)');
    const gross = mannWhitney('y', 'g', { name: 'A', werte: Array.from({ length: 50 }, (_, i) => (i % 7) + 1) }, { name: 'B', werte: Array.from({ length: 20 }, (_, i) => (i % 5) + 2) })!;
    expect(saetzeRang(gross, x => x).zusatz).toContain(', Näherung)');
    expect(JSON.stringify(tabellenRang(gross, x => x))).toContain('p (Näherung)');
  });
  it('Wilcoxon n = 5, alle positiv (kein 95-%-KI möglich): kein Intervall, Satz sagt es', () => {
    sitz.einst.sprache = 'de';
    const w = wilcoxon('vor', 'nach', [[10, 11], [12, 14], [9, 12], [15, 19], [11, 17]])!;
    const st = saetzeRang(w, x => x);
    expect(st.zusatz).toContain('p = ,063'); expect(st.zusatz).toContain('exakt');
    expect(st.zusatz).toContain('Mit so wenigen Werten lässt sich kein Konfidenzintervall mit 95 % bilden.'); expect(st.zusatz).not.toContain('∞');
    expect(st.apa).toMatch(/HL = 3$/);
  });
  it('Korrelation: Spearman n = 8 exakt, Kendall n = 7 exakt; Pearson ohne Zusatz', () => {
    sitz.einst.sprache = 'de';
    const f = R.spearman.find(r => r.name === 'n8')!, k = R.kendall.find(r => r.name === 'n7')!;
    const sp = spearman(f.x.map((v, i) => [v, f.y[i]!])), ke = kendall(k.x.map((v, i) => [v, k.y[i]!]));
    const z: Zusammenhang = { art: 'zusammenhang', x: 'a', y: 'b', ...sp, methode: 'spearman', alle: { spearman: sp, kendall: ke, pearson: { r: 0.5, p: 0.3, n: 8, kiLo: -0.2, kiHi: 0.9 } } };
    expect(saetzeZusammenhang(z, x => x).zusatz).toContain(', exakt)');
    expect(saetzeZusammenhang(zusammenhangMit(z, 'kendall'), x => x).marken.map(m => m.text).join('|')).toContain('(exakt)');
    expect(saetzeZusammenhang(zusammenhangMit(z, 'pearson'), x => x).zusatz).not.toMatch(/exakt|Näherung/);
  });
});
