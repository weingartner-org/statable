/**
 * B4 Teil 1 (14.11.2026): Die Zahlen der Einheit „Wachstumskurven“ (Hilfe-Artikel `wachstumskurvenmodell`, Fragen `lgm-…`) stammen aus
 * scripts/ueben-erwartet-wachstum.R (Schlafentzug-Studie, lavaan::growth; zweiter Weg nlme::lme und Einzel-Regressionen). Dieser Wächter vergleicht die Zahlen in Artikel
 * und Fragen mit lib/testdaten/ueben-erwartet-wachstum.json und prüft, dass Einheit, Pfad, Thema und Sprung zusammenpassen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FRAGEN } from './fragen-wachstum';
import { ROH_WACHSTUM } from '../hilfe/artikel-wachstum';
import { einheitNach, pfadNach, themaDerFrage } from './lernplan';
import { THEMEN } from './fragen';

type Lav = Record<string, any>;
const s = JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-wachstum.json', import.meta.url), 'utf8')) as Record<string, any>;
const f = s.frei as Lav, g = s.gleich as Lav;
const x = (v: any): number => (Array.isArray(v) ? v[0] : v);
const de = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
const en = (v: number, d = 1) => v.toFixed(d);
const txt = (o: unknown) => JSON.stringify(o);
const artikel = txt(ROH_WACHSTUM.find(r => r.id === 'wachstumskurvenmodell'));
const alleFragen = txt(FRAGEN);
const beide = (t: string, v: number, d = 1) => { expect(t, `${v}`).toContain(de(v, d)); expect(t, `${v}`).toContain(en(v, d)); };

describe('B4 Teil 1: Wachstumskurven', () => {
  it('Einheit im Pfad Psychologie, alle Fragen eingebunden, Thema und Sprung stimmen', () => {
    const e = einheitNach('wachstumskurven')!;
    expect(e.hilfe[0]).toBe('wachstumskurvenmodell'); expect(e.karte).toBe('messwiederholung');
    expect(e.fragen).toEqual(FRAGEN.map(q => q.id)); expect(FRAGEN.length).toBeGreaterThanOrEqual(5);
    expect(pfadNach('psychologie')!.einheiten).toContain('wachstumskurven');
    for (const q of FRAGEN) { expect(q.thema, q.id).toBe('wachstum'); expect(themaDerFrage(q.id), q.id).toBe('wachstum'); expect(q.belege.length, q.id).toBeGreaterThanOrEqual(2); }
    const t = THEMEN.find(th => th.id === 'wachstum')!; expect(t.n).toBe(FRAGEN.length); expect(t.hilfe).toContain('wachstumskurvenmodell');
    for (const q of FRAGEN) { const richtig = q.antworten.filter(a => a.richtig).length; if (q.mehrfach) { expect(q.antworten.length).toBe(4); expect(richtig).toBeGreaterThanOrEqual(1); expect(richtig).toBeLessThan(4); } else expect(richtig, q.id).toBe(1); }
  });
  it('Zahlen im Artikel und in den Fragen wie in R', () => {
    expect(x(f.n as number)).toBe(18);
    beide(artikel, x(f.mw_i), 1); beide(artikel, x(f.mw_s), 1); beide(artikel, x(f.se_s), 1); beide(artikel, x(f.var_s), 1); beide(artikel, x(f.kor), 2);
    beide(artikel, Math.sqrt(x(f.var_s)), 1); beide(artikel, x(f.chisq), 2); beide(artikel, x(f.cfi), 2); beide(artikel, x(f.rmsea), 2); beide(artikel, x(f.srmr), 2);
    expect(x(f.df)).toBe(50); expect(artikel).toContain('50 Freiheitsgraden');
    beide(artikel, x(f.mw_s) - 1.96 * x(f.se_s), 1); beide(artikel, x(f.mw_s) + 1.96 * x(f.se_s), 1);
    beide(artikel, s.mw_i_ende, 1); expect(Math.abs(s.mw_i_ende - (x(f.mw_i) + 9 * x(f.mw_s)))).toBeLessThan(1e-3);
    beide(artikel, x(g.chisq), 2); expect(x(g.df)).toBe(59); beide(artikel, x(g.mw_i), 1); beide(artikel, x(g.mw_s), 1);
    beide(alleFragen, x(f.mw_i), 1); beide(alleFragen, x(f.mw_s), 1); beide(alleFragen, x(f.var_s), 1); beide(alleFragen, Math.sqrt(x(f.var_s)), 1); beide(alleFragen, s.mw_i_ende, 1);
    beide(alleFragen, x(f.chisq), 2); beide(alleFragen, x(f.cfi), 2); beide(alleFragen, x(f.rmsea), 2); beide(alleFragen, x(f.srmr), 2); beide(alleFragen, x(f.kor), 2); beide(alleFragen, x(f.se_s), 1);
  });
  it('zweiter Weg stimmt: gleiche Restvarianz entspricht dem gemischten Modell (Mittel der Einzel-Regressionen)', () => {
    expect(Math.abs(x(g.mw_i) - s.ols_mw_i)).toBeLessThan(1e-3); expect(Math.abs(x(g.mw_s) - s.ols_mw_s)).toBeLessThan(1e-4);
    // die Behauptung im Artikel "ein Teil kaum langsamer, andere stark": Einzel-Steigungen reichen von unter 0 bis über 20
    expect(s.ols_min_s).toBeLessThan(0); expect(s.ols_max_s).toBeGreaterThan(20);
  });
  it('Passung wirklich schlecht nach den Richtwerten (Frage lgm-wk-passung)', () => {
    expect(x(f.cfi)).toBeLessThan(0.95); expect(x(f.rmsea)).toBeGreaterThan(0.06);
  });
});
