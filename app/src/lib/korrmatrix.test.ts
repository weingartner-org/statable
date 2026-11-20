import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { korrMatrix, paarWert } from './korrmatrix';
import { saetzeKorrMatrix, tabellenKorrMatrix } from './korrmatrixsaetze';
import { s } from './sitzung.svelte';
import { tabelleDe } from './export';

/* Vergleichswerte aus R (scripts/korrmatrix-erwartet.R): cor.test je Paar (Pearson; Spearman mit exact = FALSE), Lücken paarweise, p.adjust("holm").
 * airquality hat Lücken (n je Paar 111 bis 153) und Bindungen; mtcars ist vollständig. */
interface Paar { i: number; j: number; n: number; r: number; p: number; lo: number; hi: number; rs: number; ps: number; pHolm: number; psHolm: number }
const R = JSON.parse(readFileSync(new URL('./testdaten/korrmatrix-erwartet.json', import.meta.url), 'utf8')) as { name: string; spalten: string[]; daten: (number | null)[][]; paare: Paar[] }[];
const nah = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b) / Math.max(1e-300, Math.abs(b) < 1 ? 1 : Math.abs(b))).toBeLessThan(tol);
const zeilenAus = (d: (number | null)[][]) => d[0]!.map((_, p) => d.map(spalte => spalte[p] ?? null));

describe('Korrelationsmatrix gegen R', () => {
  for (const f of R) it(f.name, () => {
    const m = korrMatrix(f.spalten, zeilenAus(f.daten), { methode: 'pearson' });
    expect(m.paare.length).toBe(f.paare.length);
    m.paare.forEach((q, x) => {
      const e = f.paare[x]!;
      expect([q.i, q.j, q.n]).toEqual([e.i, e.j, e.n]);
      nah(q.pearson!.r, e.r, 1e-12); nah(q.pearson!.p, e.p, 1e-7); nah(q.pearson!.kiLo, e.lo, 1e-12); nah(q.pearson!.kiHi, e.hi, 1e-12);
      nah(q.spearman!.r, e.rs, 1e-12); nah(q.spearman!.p, e.ps, 1e-7);
      nah(q.holmPearson, e.pHolm, 1e-7); nah(q.holmSpearman, e.psHolm, 1e-7);
    });
  });
  it('Holm wirkt auf p, nicht auf r; Spearman umschaltbar', () => {
    const f = R[1]!, m = korrMatrix(f.spalten, zeilenAus(f.daten), { methode: 'spearman', holm: true });
    const w = paarWert(m, m.paare[2]!)!;   // mpg - qsec
    nah(w.r, f.paare[2]!.rs, 1e-12); nah(w.p, f.paare[2]!.psHolm, 1e-7); nah(w.pRoh, f.paare[2]!.ps, 1e-7);
  });
  it('zu wenige Personen oder keine Streuung: kein Wert, nicht im Holm', () => {
    const m = korrMatrix(['a', 'b', 'c'], [[1, 2, 5], [2, 4, 5], [3, 5, 5], [4, 4, null]], { methode: 'pearson', holm: true });
    expect(m.paare.map(p => !!p.pearson)).toEqual([true, false, false]);
    expect(m.paare[0]!.holmPearson).toBe(m.paare[0]!.pearson!.p);
  });
});

describe('Sätze und Tabellen', () => {
  const f = R[1]!, label = (x: string) => x;
  it('deutsch, ohne Holm: Zahl der deutlichen Paare, stärkstes und schwächstes, Hinweis auf Holm', () => {
    s.einst.sprache = 'de';
    const st = saetzeKorrMatrix(korrMatrix(f.spalten, zeilenAus(f.daten), { methode: 'pearson' }), label);
    expect(st.haupt).toBe('Korrelationen nach Pearson zwischen 5 Spalten (10 Paare): Bei 8 von 10 Paaren ist der Zusammenhang deutlich (p < ,05). Am stärksten hängen „mpg“ und „wt“ zusammen (r = −,87), am schwächsten „qsec“ und „drat“ (r = ,09).');
    expect(st.zusatz).toContain('die Holm-Korrektur gleicht das aus');
    expect(st.apa).toBe('mpg - wt: r(30) = −,87, p < ,001; mpg - hp: r(30) = −,78, p < ,001; wt - drat: r(30) = −,71, p < ,001; alle Paare in der Tabelle');
  });
  it('mit Holm: mpg - qsec fällt heraus (p ,017 → ,051 wie p.adjust)', () => {
    s.einst.sprache = 'de';
    const st = saetzeKorrMatrix(korrMatrix(f.spalten, zeilenAus(f.daten), { methode: 'pearson', holm: true }), label);
    expect(st.haupt).toContain('Bei 7 von 10 Paaren ist der Zusammenhang deutlich (p < ,05 nach Holm)');
  });
  it('Tabellen: Unterdreieck und Paare; englisch', () => {
    s.einst.sprache = 'en';
    const t = tabellenKorrMatrix(korrMatrix(f.spalten, zeilenAus(f.daten), { methode: 'pearson', holm: true }), label);
    expect(t.map(x => x.label)).toEqual(['Correlation Matrix', 'Correlation Pairs']);
    const zelle = (tb: typeof t[number], r: number, c: number) => tb.cells.find(x => x.r === r && x.c === c)?.t;
    expect(zelle(t[0]!, 2, 1)).toBe('-.78');   // hp (Zeile 2) mit mpg (Spalte 1)
    expect(zelle(t[0]!, 1, 2)).toBe('');       // Oberdreieck leer
    expect(t[1]!.cells.filter(c => c.r === 0).map(c => c.t)).toEqual(['Pair', 'r', '95% CI lower', '95% CI upper', 'p', 'p (Holm)', 'n']);
    s.einst.sprache = 'de';
  });
  it('Anzeige: Korrelationen und ihre Grenzen ohne Null vor dem Komma (APA), n bleibt', () => {
    s.einst.sprache = 'de'; s.einst.zahl = 'komma';
    const [mx, pa] = tabellenKorrMatrix(korrMatrix(f.spalten, zeilenAus(f.daten), { methode: 'pearson' }), label);
    expect(tabelleDe(mx!, null).zeilen[2]![1]!.t).toBe('−,78');
    const z = tabelleDe(pa!, null).zeilen[1]!.map(c => c.t);
    expect(z.slice(1)).toEqual(['−,78', '−,89', '−,59', '<\u00a0,001', '32']);
  });
});
