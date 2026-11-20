import { describe, expect, it, beforeEach } from 'vitest';
import { s } from './sitzung.svelte';
import { mebLesen, mebRCode, type MebPraed } from './mehrebenen';
import { saetzeMehrebenen, tabellenMehrebenen, mebApa, mor } from './mehrebenensaetze';

/* Ja/Nein-Ergebnis im Mehrebenenmodell (S-H, 22.10.). Zahlen: Rscript am Mac (lme4 glmer, Simulation set.seed(42), 14 Gruppen zu 9 Fällen); dieselben Zahlen prüft
 * engine/mehrebenen-logit.webr.test.ts in echtem webR. Hier: Lesen der Antwort, Sätze, Tabellen und R-Aufruf. */
const roh = {
  n: [126], n_alle: [126], ng: [14], gn_min: [9], gn_med: [9], gn_max: [9], gn_mittel: [9], y_mittel: [0.6], y_sd: [0.49],
  null_tau: [0.223477249925], null_sigma: [3.289868133696], null_icc: [0.0636081072379], null_const: [0.40670998051], null_const_se: [0.226381883947], null_const_df: [null], deff: [null], null_singular: [false], binaer: [true],
  fest_name: ['(Intercept)', 'p01', 'p02'], fest_term: [0, 1, 2], fest_b: [-2.19732615971, 0.0517857526371, 0.173453094022], fest_se: [1.08051176159, 0.0215574996627, 0.388890287343], fest_df: [null, null, null],
  fest_t: [-2.033597632, 2.4022151663, 0.446020637871], fest_p: [0.0419921807938, 0.0162961199797, 0.655582338287], fest_lo: [-4.31509, 0.00953, -0.58876], fest_hi: [-0.0796, 0.094, 0.9357],
  tau: [0.374555713151], sigma: [3.289868133696], icc_voll: [0.1022], r2_m: [0.0729514590897], r2_c: [0.167708873046], var_fest: [0.2], var_zuf: [0.37],
  gruppe: ['S01', 'S02'], gruppe_n: [9, 9], gruppe_mittel: [0.5, 0.7], gruppe_abw: [0.1, -0.2], gruppe_se: [0.5, 0.5], singular: [false], konv: [false], meldungen: [], mit_praed: [true]
};
const praed: MebPraed[] = [{ name: 'Alter', art: 'zahl', stufen: [] }, { name: 'Gruppe', art: 'faktor', stufen: ['A', 'B'] }];
const kopf = { y: 'Abitur', gruppe: 'Klasse', praed, steigung: '', zentriert: false, ereignis: 'Ja' };
beforeEach(() => { s.einst.sprache = 'de'; s.einst.zahl = 'komma'; });

describe('Mehrebenenmodell für Ja/Nein', () => {
  const e = () => mebLesen(roh, kopf);
  it('Lesen: Ja/Nein-Kennzeichen, Ereignis, Wald-z statt t, keine Freiheitsgrade', () => {
    const m = e();
    expect(m.binaer).toBe(true); expect(m.ereignis).toBe('Ja');
    expect(m.fest[1]!.t).toBeCloseTo(2.4022151663, 8); expect(Number.isNaN(m.fest[1]!.df)).toBe(true); expect(m.sigma).toBeCloseTo(Math.PI ** 2 / 3, 8);
  });
  it('Median-Odds-Ratio (Larsen und Merlo 2005): exp(√(2τ²) · z₀,₇₅)', () => {
    expect(mor(0.223477249925)).toBeCloseTo(Math.exp(Math.sqrt(2 * 0.223477249925) * 0.6744897501960817), 12);
    expect(mor(0)).toBe(1);
  });
  it('Sätze: Chance auf das Ereignis, Odds Ratio mit Intervall, latenter ICC, Median-Odds-Ratio, Hinweis auf Odds Ratios', () => {
    const t = saetzeMehrebenen(e(), n => n);
    expect(t.haupt).toContain('der Chance auf „Ja“ bei „Abitur“');
    expect(t.zusatz).toContain('latenter ICC = ,06'); expect(t.zusatz).toContain('Median-Odds-Ratio'); expect(t.zusatz).toMatch(/OR = 1,05, \[1,01; 1,10\]|OR = 1,05, 95 %-KI \[1,0\d; 1,10\]/);
    expect(t.zusatz).not.toContain('Designeffekt'); expect(t.zusatz).not.toContain('NaN'); expect(t.zusatz).not.toContain('Gegenüber dem Nullmodell'); expect(t.vorsicht).toContain('keine Risikoverhältnisse');
    expect(t.marken.some(m => m.text.startsWith('MOR = '))).toBe(true); expect(t.marken.every(m => !m.text.startsWith('Designeffekt'))).toBe(true);
  });
  it('APA-Zeile und Tabellen: Odds Ratio, π²/3 fest, Median-Odds-Ratio', () => {
    const m = e();
    expect(mebApa(m, n => n)).toContain('Ja/Nein'); expect(mebApa(m, n => n)).toMatch(/Alter: OR = 1,05/);
    const tab = tabellenMehrebenen(m, n => n);
    const namen = tab.map(x => x.label); expect(namen).toEqual(['Fixed Effects', 'Random Effects', 'Model Fit']);
    const koepfe = tab[0]!.cells.filter(c => c.r === 0).map(c => c.t); expect(koepfe).toContain('OR'); expect(koepfe).toContain('z'); expect(koepfe).not.toContain('df');
  });
  it('R-Aufruf zum Nachrechnen: glmer mit family = binomial, Ereignis = der größere Wert', () => {
    const code = mebRCode(e(), (de) => de);
    expect(code).toContain('glmer('); expect(code).toContain('family = binomial'); expect(code).toContain('max('); expect(code).toContain('exp(fixef(m1))');
  });
  it('ohne binaer bleibt alles wie vorher (Designeffekt, kein MOR)', () => {
    const m = mebLesen({ ...roh, binaer: [false], deff: [2.1], fest_df: [20, 100, 90] }, { ...kopf, ereignis: undefined });
    expect(m.binaer).toBeUndefined(); const t = saetzeMehrebenen(m, n => n);
    expect(t.zusatz).toContain('Designeffekt'); expect(t.marken.some(x => x.text.startsWith('MOR'))).toBe(false);
  });
});
