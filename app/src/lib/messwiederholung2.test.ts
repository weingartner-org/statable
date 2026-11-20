import { describe, expect, it } from 'vitest';
import { nah, obkBreit, soll } from './testdaten/field3';
import { einfacheEffekte, einfaktoriell, korrigiert2, messwiederholung2, rasterVorschlag, stufenWerte } from './messwiederholung2';
import { messwiederholung, korrigiert } from './messwiederholung';
import { holm } from './rangtests';

/* Sollwerte: R afex::aov_ez (Opus), docs/fachblaetter/sollwerte/field-stufe3.json (mw_zwei, mw_gemischt). Toleranz 1e-6 relativ. */
const { daten, treatment } = obkBreit();
const STUFEN_A = ['pre', 'post', 'fup'], STUFEN_B = ['1', '2', '3', '4', '5'];

describe('Zwei Messwiederholungsfaktoren (obk.long, phase × hour, n = 16) gegen afex', () => {
  const s = soll.mw_zwei, e = messwiederholung2(daten, 3, 5, { stufenA: STUFEN_A, stufenB: STUFEN_B, faktorA: 'phase', faktorB: 'hour' });
  it('F, df, p, ε, korrigiertes p, partielles und generalisiertes η² je Effekt', () => {
    expect(e.effekte.map(x => x.quelle)).toEqual(['a', 'b', 'ab']);
    e.effekte.forEach((x, i) => {
      expect([x.df, x.dfFehler], 'df').toEqual([s.df1[i], s.df2[i]]);
      expect(nah(x.f, s.F[i]), `F ${x.f}`).toBe(true);
      expect(nah(x.p, s.p[i]), `p ${x.p}`).toBe(true);
      expect(nah(x.epsGG, s.gg_eps[i]), `GG ${x.epsGG}`).toBe(true);
      expect(nah(x.epsHF, s.hf_eps[i]), `HF ${x.epsHF}`).toBe(true);
      expect(nah(x.pGG, s.gg_p[i]), `pGG ${x.pGG}`).toBe(true);
      expect(nah(x.etaP, s.pes[i]), `pes ${x.etaP}`).toBe(true);
      expect(nah(x.etaG, s.ges[i]), `ges ${x.etaG}`).toBe(true);
      expect(x.etaPLo).toBeLessThanOrEqual(x.etaP); expect(x.etaPHi).toBeGreaterThanOrEqual(x.etaP);
    });
  });
  it('korrigiert2 liefert Freiheitsgrade mal ε und das gewählte p', () => {
    const x = e.effekte[0]!, k = korrigiert2(e, x, 'gg');
    expect(nah(k.df1, 2 * x.epsGG)).toBe(true); expect(nah(k.p, x.pGG)).toBe(true);
    expect(korrigiert2(e, x, 'keine').p).toBe(x.p);
  });
  it('mit einem Faktor mit 2 Stufen bleibt ε = 1', () => {
    const x = messwiederholung2(daten.map(r => [r[0]!, r[1]!, r[5]!, r[6]!]), 2, 2);
    expect(x.effekte.every(y => y.epsGG === 1 && y.epsHF === 1)).toBe(true);
  });
});

describe('Gemischt: zwei Messwiederholungsfaktoren plus Gruppe (obk.long, treatment: 5/4/7) gegen afex Typ III', () => {
  const s = soll.mw_gemischt, e = messwiederholung2(daten, 3, 5, { gruppen: treatment, gruppenSpalte: 'treatment' });
  it('Gruppengrößen sind ungleich (Typ III wird gebraucht)', () => { expect(new Set(e.gruppen.map(g => g.n)).size).toBeGreaterThan(1); });
  it('alle sieben Effekte', () => {
    expect(e.effekte.map(x => x.quelle)).toEqual(['g', 'a', 'ga', 'b', 'gb', 'ab', 'gab']);
    e.effekte.forEach((x, i) => {
      expect([x.df, x.dfFehler], `df ${x.quelle}`).toEqual([s.df1[i], s.df2[i]]);
      expect(nah(x.f, s.F[i]), `F ${x.quelle} ${x.f}`).toBe(true);
      expect(nah(x.p, s.p[i]), `p ${x.quelle} ${x.p}`).toBe(true);
      expect(nah(x.etaP, s.pes[i]), `pes ${x.quelle}`).toBe(true);
      expect(nah(x.etaG, s.ges[i]), `ges ${x.quelle} ${x.etaG}`).toBe(true);
    });
  });
  it('ε und korrigiertes p der sechs Effekte mit Messwiederholung', () => {
    const mitEps = e.effekte.filter(x => x.quelle !== 'g');
    mitEps.forEach((x, i) => {
      expect(nah(x.epsGG, s.gg_eps[i]), `GG ${x.quelle} ${x.epsGG}`).toBe(true);
      expect(nah(x.epsHF, s.hf_eps[i]), `HF ${x.quelle} ${x.epsHF}`).toBe(true);
      expect(nah(x.pGG, s.gg_p[i]), `pGG ${x.quelle} ${x.pGG}`).toBe(true);
    });
  });
  it('Levene je Zelle: 15 Tests, p zwischen 0 und 1', () => {
    expect(e.levene).toHaveLength(15);
    e.levene.forEach(l => { expect(l.p).toBeGreaterThanOrEqual(0); expect(l.p).toBeLessThanOrEqual(1); expect([l.df1, l.df2]).toEqual([2, 13]); });
  });
});

describe('Einfache Effekte = Ein-Faktor-Rechnung auf der Teilmenge, Holm', () => {
  const x = einfacheEffekte(daten, 3, 5, STUFEN_A, STUFEN_B, 'gg');
  it('A je Stufe von B', () => {
    expect(x.aJeB).toHaveLength(5);
    const roh = STUFEN_B.map((_, j) => messwiederholung(daten.map(r => [r[j]!, r[5 + j]!, r[10 + j]!]), STUFEN_A));
    const ph = holm(roh.map(e => korrigiert(e, e.zeit, 'gg').p));
    x.aJeB.forEach((z, j) => { expect(nah(z.f, roh[j]!.zeit.f)).toBe(true); expect(nah(z.p, korrigiert(roh[j]!, roh[j]!.zeit, 'gg').p)).toBe(true); expect(nah(z.pHolm, ph[j]!)).toBe(true); });
  });
  it('B je Stufe von A', () => {
    const e0 = messwiederholung(daten.map(r => r.slice(0, 5)), STUFEN_B);
    expect(nah(x.bJeA[0]!.f, e0.zeit.f)).toBe(true);
    expect(x.bJeA).toHaveLength(3);
  });
  it('Gruppe je Stufe von A: einfaktorielle Varianzanalyse auf dem Mittel über B', () => {
    const g = einfacheEffekte(daten, 3, 5, STUFEN_A, STUFEN_B, 'gg', treatment);
    const namen = [...new Set(treatment)], werte = namen.map(n => daten.filter((_, i) => treatment[i] === n).map(r => (r[0]! + r[1]! + r[2]! + r[3]! + r[4]!) / 5));
    expect(nah(g.gruppeJeA[0]!.f, einfaktoriell(werte)!.f)).toBe(true);
    expect(g.gruppeJeB).toHaveLength(5);
    expect(x.gruppeJeA).toHaveLength(0);
  });
  it('stufenWerte mittelt über den anderen Faktor', () => {
    const w = stufenWerte(daten, 3, 5, 'a');
    expect(w[0]).toHaveLength(3); expect(w[0]![0]).toBeCloseTo((daten[0]!.slice(0, 5).reduce((s, v) => s + v, 0)) / 5, 12);
  });
});

describe('Raster aus Spaltennamen', () => {
  it('erkennt Zeit_Tageszeit', () => {
    const r = rasterVorschlag(['v_m', 'v_a', 'n_m', 'n_a']);
    expect(r).toEqual({ a: ['v', 'n'], b: ['m', 'a'], reihenfolge: [0, 1, 2, 3] });
    expect(rasterVorschlag(['x', 'y', 'z', 'w'])).toBeNull();
    expect(rasterVorschlag(['n_a', 'v_m', 'n_m', 'v_a'])!.reihenfolge).toEqual([0, 2, 3, 1]);
  });
});
