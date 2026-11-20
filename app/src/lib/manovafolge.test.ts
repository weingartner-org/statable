import { describe, expect, it } from 'vitest';
import { csv, nah } from './testdaten/field2';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sitz } from './kptesthilfe';
import { boxTest, boxSaetze, diskrFunktionen, folgeDaten, holm, leveneTest, type BoxErgebnis } from './manovafolge';
import { s } from './sitzung.svelte';

/* Sollwerte: R (Opus), docs/fachblaetter/sollwerte/field-stufe3.json, Abschnitt manova_folge, iris. Toleranz 1e-6 relativ. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const soll = (JSON.parse(readFileSync(fileURLToPath(new URL('../../../docs/fachblaetter/sollwerte/field-stufe3.json', import.meta.url)), 'utf8')) as any).manova_folge;
const iris = csv('iris.csv');
const ZIELE = ['Sepal.Length', 'Sepal.Width', 'Petal.Length', 'Petal.Width'];
const q = sitz({ Species: iris.map(r => r.Species as string), ...Object.fromEntries(ZIELE.map(z => [z, iris.map(r => r[z] as number)])) }, ['Species']);
const d = folgeDaten('Species', ZIELE, q.zeilen, q.spalten)!;

describe('Box-Test (iris)', () => {
  const b = boxTest(d) as BoxErgebnis;
  it('Box-M, χ²- und F-Näherung wie R', () => {
    expect(nah(b.M, soll.box_M), `M ${b.M}`).toBe(true);
    expect(nah(b.chi2, soll.box_chi2), 'chi2').toBe(true);
    expect(b.chiDf).toBe(soll.box_chi2_df);
    expect(nah(b.chiP, soll.box_chi2_p, 1e-5), `p chi ${b.chiP}`).toBe(true);
    expect(nah(b.F, soll.box_F), 'F').toBe(true);
    expect(b.df1).toBe(soll.box_F_df1);
    expect(nah(b.df2, soll.box_F_df2), `df2 ${b.df2}`).toBe(true);
    expect(nah(b.p, soll.box_F_p, 1e-5), `p F ${b.p}`).toBe(true);
  });
  it('gleich große Gruppen: Satz „robust“, Pillai; ungleich: Richtung nach Größe', () => {
    expect(b.gleichGross).toBe(true); expect(b.richtung).toBe('gleich');
    expect(boxSaetze(b).join(' ')).toMatch(/gleich groß.*robust/);
    const klein = folgeDaten('Species', ZIELE, q.zeilen.filter((_, i) => i < 30 || i >= 50 && i < 100 || i >= 100 && i < 140), q.spalten)!;
    const bk = boxTest(klein) as BoxErgebnis;
    expect(bk.gleichGross).toBe(false); expect(['konservativ', 'liberal']).toContain(bk.richtung);
    expect(boxSaetze(bk).join(' ')).toContain('Pillai');
  });
  it('Fehler: Gruppe mit zu wenig Fällen, eine Gruppe', () => {
    const zu = folgeDaten('Species', ZIELE, q.zeilen.filter((_, i) => i < 50 || i >= 50 && i < 100 || i >= 100 && i < 103), q.spalten)!;
    expect(boxTest(zu)).toEqual({ fehler: 'gruppe-zu-klein' });
    const eine = folgeDaten('Species', ZIELE, q.zeilen.slice(0, 50), q.spalten)!;
    expect(boxTest(eine)).toEqual({ fehler: 'zu-wenig-gruppen' });
  });
});

describe('Levene-Test je Zielgröße (Mittelwert-Zentrierung)', () => {
  it('F und p wie car::leveneTest', () => {
    ZIELE.forEach((_, j) => {
      const l = leveneTest(d.cols[j]!, d.grp, d.je.length)!;
      expect(nah(l.F, soll.levene_F[j]), `F ${j} ${l.F}`).toBe(true);
      expect(nah(l.p, soll.levene_p[j], 1e-5), `p ${j} ${l.p}`).toBe(true);
      expect(l.df1).toBe(2); expect(l.df2).toBe(147);
    });
  });
  it('keine Streuung: null', () => { expect(leveneTest([1, 1, 1, 1], [0, 0, 1, 1], 2)).toBeNull(); });
});

describe('Diskriminanzfunktionen (iris)', () => {
  const f = diskrFunktionen(d)!;
  it('Anteil je Funktion wie R (lda svd²)', () => {
    soll.anteil_funktion.forEach((a: number, i: number) => expect(nah(f.anteil[i]!, a, 1e-6), `Anteil ${i} ${f.anteil[i]}`).toBe(true));
  });
  it('Strukturmatrix wie R, Vorzeichen je Funktion normiert', () => {
    for (let j = 0; j < 2; j++) {
      const vz = Math.sign(f.struktur[0]![j]!) === Math.sign(soll.struktur[0][j]) ? 1 : -1;
      for (let i = 0; i < 4; i++) expect(nah(vz * f.struktur[i]![j]!, soll.struktur[i][j], 1e-6), `Struktur [${i}][${j}] ${f.struktur[i]![j]}`).toBe(true);
    }
  });
  it('Koeffizienten wie MASS::lda (LD1: 0,8293776; erster Koeffizient positiv)', () => {
    expect(nah(f.koeffizienten[0]![0]!, 0.8293776, 1e-6)).toBe(true);
    expect(nah(f.koeffizienten[0]![1]!, 1.5344731, 1e-6)).toBe(true);
    f.koeffizienten.forEach(c => expect(c[0]).toBeGreaterThan(0));
  });
  it('Zentroide: Mittel der Funktionswerte je Gruppe; Gesamtmittel 0', () => {
    expect(f.zentroide).toHaveLength(3);
    const alle = f.werte.map(w => w[0]!).reduce((a, b) => a + b, 0) / f.werte.length;
    expect(Math.abs(alle)).toBeLessThan(1e-9);
    expect(nah(f.zentroide[0]![0]!, 7.607599927, 1e-6), `${f.zentroide[0]![0]}`).toBe(true);   // setosa, LD1 (R: predict(lda)$x)
    expect(nah(f.zentroide[2]![0]!, -5.782550437, 1e-6)).toBe(true);
    expect(nah(Math.abs(f.zentroide[1]![1]!), 0.7278996217, 1e-6)).toBe(true);
  });
});

describe('Holm', () => {
  it('wie p.adjust', () => {
    const h = holm([0.01, 0.04, 0.03, 0.005]);
    [0.03, 0.06, 0.06, 0.02].forEach((v, i) => expect(nah(h[i]!, v)).toBe(true));
  });
});
