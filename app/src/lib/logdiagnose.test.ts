import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { logDiagnose, logAuffaellige, hosmerLemeshow, boxTidwell, boxTidwellSpalten, logBlock, logitAnpassen, quantil7, type LogDiagnoseErgebnis } from './logdiagnose';

/* Sollwerte: docs/fachblaetter/sollwerte/field-stufe2.json, Abschnitt logistisch (R: glm(low ~ age + lwt + smoke + ht, binomial, MASS::birthwt), Opus 05.11.2026).
 * Daten: docs/fachblaetter/sollwerte/birthwt.csv. Toleranz 1e-6 relativ. */
const ordner = join(__dirname, '../../../docs/fachblaetter/sollwerte');
const zusatz = JSON.parse(readFileSync(join(ordner, 'field-stufe2b-zusatz.json'), 'utf8'));   // R 4.6.1: rstandard(type = "deviance") bzw. "pearson" (field-stufe2b-zusatz.R)
const soll = JSON.parse(readFileSync(join(ordner, 'field-stufe2.json'), 'utf8')).logistisch;
const zeilen = readFileSync(join(ordner, 'birthwt.csv'), 'utf8').trim().split('\n');
const kopf = zeilen[0]!.split(',').map(s => s.replace(/"/g, ''));
const roh = zeilen.slice(1).map(z => z.split(',').map(Number));
const sp = (n: string) => roh.map(r => r[kopf.indexOf(n)]!);
const y = sp('low');
const x = roh.map(r => ['age', 'lwt', 'smoke', 'ht'].map(n => r[kopf.indexOf(n)]!));
const nah = (a: number, b: number, tol = 1e-6, was = '') => expect(Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-12) + 1e-12, `${was} ${a} gegen ${b}`).toBe(true);
const g = (r: ReturnType<typeof logDiagnose>): LogDiagnoseErgebnis => { if ('fehler' in r) throw new Error(r.fehler); return r; };

describe('Logistische Regression prüfen gegen R (birthwt)', () => {
  const r = g(logDiagnose(x, y));
  it('189 Fälle, Hebelwert, standardisiertes Devianzresiduum und Pearson-Residuum, Cooks Distanz', () => {
    expect(r.faelle).toHaveLength(189);
    r.faelle.forEach((f, i) => { nah(f.hebel, soll.hebel[i], 1e-6, `h ${i}`); nah(f.pearsonRest, soll.devres_std[i], 1e-6, `rstandard (Voreinstellung R 4.6 = Pearson) ${i}`); nah(f.devRest, zusatz.devres_std_deviance[i], 1e-6, `rstandard deviance ${i}`); nah(f.cook, soll.cook[i], 1e-6, `cook ${i}`); });
  });
  it('DFBETA (Rohwerte: Konstante und vier Vorhersagegrößen)', () => {
    r.faelle.forEach((f, i) => f.dfbeta.forEach((v, j) => nah(v, soll.dfbeta[i][j], 1e-5, `dfbeta ${i},${j}`)));
  });
  it('VIF der vier Vorhersagegrößen', () => { r.vif.forEach((v, j) => nah(v, soll.vif[j], 1e-6, 'vif')); });
  it('auffällige Fälle: Hebel über 2k/n = 10/189, Cook über 4/n, Residuum über 2', () => {
    const a = logAuffaellige(r);
    expect(a.length).toBeGreaterThan(0);
    for (const q of a) { const f = r.faelle[q.index]!; expect(q.grund.hebel).toBe(f.hebel > 10 / 189); expect(q.grund.cook).toBe(f.cook > 4 / 189); expect(q.grund.resid).toBe(Math.abs(f.devRest) > 2); }
  });
  it('Hosmer-Lemeshow mit 10 Gruppen: χ², df, p', () => {
    const fit = logitAnpassen(x, y);
    if ('fehler' in fit) throw new Error(fit.fehler);
    const hl = hosmerLemeshow(fit.mu, y)!;
    nah(hl.chi2, soll.hl.chi2, 1e-6, 'chi2'); expect(hl.df).toBe(soll.hl.df); nah(hl.p, soll.hl.p, 1e-6, 'p');
  });
  it('Box-Tidwell: nur age und lwt (alle Werte positiv, mehr als zwei Werte); z und p wie R', () => {
    const spalten = boxTidwellSpalten(x, [true, true, true, true]);
    expect(spalten).toEqual([0, 1]);
    const bt = boxTidwell(x, y, spalten);
    if (!bt || 'fehler' in bt) throw new Error('Box-Tidwell');
    bt.forEach((t, i) => { nah(t.z, soll.box_tidwell.z[i], 1e-6, 'z'); nah(t.p, soll.box_tidwell.p[i], 1e-6, 'p'); });
  });
  it('Block 2 (smoke + ht) gegen Block 1 (age + lwt): χ², df, p', () => {
    const b = logBlock(x, y, [0, 1]);
    if (!b || 'fehler' in b) throw new Error('Block');
    nah(b.chi2, soll.block_chi2, 1e-6, 'chi2'); expect(b.df).toBe(soll.block_df); nah(b.p, soll.block_p, 1e-6, 'p');
    expect(b.nagelkerkeZwei).toBeGreaterThan(b.nagelkerkeEins);
  });
});

describe('Hilfen und Fehlerfälle', () => {
  it('quantil7 wie R: 1:10, probs 0,25 → 3,25; Gleichstand bleibt exakt', () => {
    nah(quantil7([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [0.25])[0]!, 3.25);
    expect(quantil7([1, 1, 1, 2], [0.1, 0.5])).toEqual([1, 1]);
  });
  it('keine Streuung im Ziel, zu wenig Fälle, vollständige Trennung', () => {
    expect(logitAnpassen([[1], [2], [3], [4], [5]], [0, 0, 0, 0, 0])).toEqual({ fehler: 'keine-streuung' });
    expect(logitAnpassen([[1], [2]], [0, 1])).toEqual({ fehler: 'zu-wenig-faelle' });
    expect(logitAnpassen([[1], [2], [3], [4], [5], [6]], [0, 0, 0, 1, 1, 1])).toEqual({ fehler: 'trennung' });
  });
  it('Block ohne Block 1 oder mit allen Spalten: kein Test', () => {
    expect(logBlock(x, y, [])).toBeNull(); expect(logBlock(x, y, [0, 1, 2, 3])).toBeNull();
  });
});
