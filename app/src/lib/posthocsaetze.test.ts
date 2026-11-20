import { describe, expect, it } from 'vitest';
import type { Cell } from '../engine/types';
import { saetzeAnova, type Anova } from './ergebnis';
import { tabellenAnovaZusatz } from './posthocsaetze';
import { s } from './sitzung.svelte';
import erwartet from './testdaten/posthoc-erwartet.json';

/* Airquality (Ozon nach Monat): Levene p = ,0039; ToothGrowth: Levene p = ,49 - in beiden Fällen Welch als Hauptergebnis und Games-Howell (F2).
 * Die Zahlen der Gruppen und die Paare stammen aus R (scripts/posthoc-erwartet.R, in posthoc.test.ts geprüft). */
type Fall = { name: string; gruppen: string[]; n: number[]; m: number[]; sd: number[]; mse: number; dfw: number; levene: { F: number; p: number }; welch: { F: number; df1: number; df2: number; p: number }; klassisch: { F: number; p: number } };
const anovaVon = (f: Fall): Anova => {
  const gruppen = f.gruppen.map((name, i) => ({ name, n: f.n[i]!, m: f.m[i]!, sd: f.sd[i]! }));
  const n = f.n.reduce((a, b) => a + b, 0), gm = gruppen.reduce((a, g) => a + g.n * g.m, 0) / n;
  const ssZ = gruppen.reduce((a, g) => a + g.n * (g.m - gm) ** 2, 0), ssI = f.mse * f.dfw;
  return { art: 'anova', abhaengig: 'y', gruppenSpalte: 'g', gruppen, n, ssZwischen: ssZ, ssInnerhalb: ssI, dfZwischen: gruppen.length - 1, dfInnerhalb: f.dfw, f: f.klassisch.F, p: f.klassisch.p, levene: f.levene.F, leveneP: f.levene.p };
};
const falle = erwartet as unknown as Fall[];
const text = (c: Cell[]) => c.map(x => x.t);

describe('Tabellen und Sätze der Varianzanalyse mit Paarvergleichen', () => {
  const air = anovaVon(falle.find(f => f.name === 'airquality')!), tooth = anovaVon(falle.find(f => f.name === 'toothgrowth')!);
  it('ungleiche Streuung: Welch ist Hauptergebnis, Games-Howell der Standard, 10 Paare', () => {
    s.einst.sprache = 'de';
    const t = tabellenAnovaZusatz(air);
    expect(t.map(x => x.label)).toEqual(['Welch ANOVA', 'Multiple Comparisons']);
    expect(t[1]!.title!.t).toBe('Paarvergleiche (Games-Howell)');
    expect(t[1]!.rows).toBe(11);
    const st = saetzeAnova(air, x => x);
    expect(st.apa).toMatch(/^Welch-F\(4; 42,7\) = 8,03, p < ,001; klassisch: F\(4, 111\) = 8,54/);
    expect(st.apa).toContain('Games-Howell: 6 von 10 Paaren mit p < ,05');
    expect(st.zusatz).toContain('Welch-Varianzanalyse, p < ,001');
  });
  // Abschlusstest F2: Welch ist immer das Hauptergebnis, Games-Howell immer der Standard - auch wenn Levene nicht gegen gleiche Streuung spricht (ToothGrowth: p = ,49).
  // R: oneway.test(len ~ dose, ToothGrowth) F = 68,40, df = 2 / 37,74, p = 2,8e-13 (scripts/posthoc-erwartet.R).
  it('gleiche Streuung: trotzdem Welch als Hauptergebnis und Games-Howell als Standard, klassisch daneben, Tukey wählbar', () => {
    const st = saetzeAnova(tooth, x => x);
    expect(st.apa).toMatch(/^Welch-F\(2; 37,7\) = 68,40, p < ,001; klassisch: F\(2, 57\) = 67,42, p < ,001, η² = ,70, 95 %-KI \[,57; ,79\]; Games-Howell:/);
    expect(st.zusatz).toContain('(Welch-Varianzanalyse, p < ,001)');
    expect(st.marken.map(m => m.text)).toContain('p < ,001 (Welch) · unter ,05');
    expect(st.marken.map(m => m.text)).toContain('Paarvergleich: Games-Howell (Standard)');
    expect(st.marken.some(m => m.erklaer === 'voraussetzung' && m.hinweis)).toBe(false);
    expect(tabellenAnovaZusatz(tooth)[1]!.title!.t).toBe('Paarvergleiche (Games-Howell)');
    expect(saetzeAnova(tooth, x => x, 'tukey').apa).toContain('Tukey HSD:');
  });
  it('η² ist als Kennzahl der klassischen Analyse gekennzeichnet (Welch-Hauptergebnis)', () => {
    const st = saetzeAnova(tooth, x => x);
    expect(st.zusatz).toContain('η² = ,70, 95 %-KI [,57; ,79], aus der klassischen Varianzanalyse');
    expect(st.marken.map(m => m.text)).toContain('Unterschied: groß · η² = ,70 (klassisch)');
  });
  it('Welch nicht rechenbar (eine Gruppe ohne Streuung): klassisch als Hauptergebnis mit Hinweis', () => {
    const ohne: Anova = { ...tooth, gruppen: tooth.gruppen.map((g, i) => (i === 0 ? { ...g, sd: 0 } : g)) };
    const st = saetzeAnova(ohne, x => x);
    expect(st.apa.startsWith('F(2, 57) = 67,42')).toBe(true);
    expect(st.vorsicht).toContain('Die Welch-Varianzanalyse ist hier nicht rechenbar');
  });
  it('englisch: p ohne führende Null, Punkt als Dezimalzeichen, englische Kopfzeile', () => {
    s.einst.sprache = 'en';
    try {
      const st = saetzeAnova(air, x => x);
      expect(st.apa).toMatch(/^Welch-F\(4, 42\.7\) = 8\.03, p < \.001; classical: /);
      const t = tabellenAnovaZusatz(air)[1]!;
      expect(text(t.cells.filter(c => c.r === 0))).toEqual(['Comparison', 'Difference', '95% CI lower', '95% CI upper', 'p (adjusted)']);
    } finally { s.einst.sprache = 'de'; }
  });
  it('Gesamttest (Welch) nicht deutlich: keine Paarvergleiche, nur die Welch-Tabelle', () => {
    const still: Anova = { ...tooth, gruppen: tooth.gruppen.map(g => ({ ...g, m: 20 + g.m / 100 })), p: 0.4, leveneP: 0.6 };
    expect(tabellenAnovaZusatz(still).map(x => x.label)).toEqual(['Welch ANOVA']);
    expect(saetzeAnova(still, x => x).apa).not.toContain('Games-Howell');
  });
});
