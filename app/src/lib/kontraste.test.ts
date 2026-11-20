import { describe, expect, it } from 'vitest';
import { csv, kennzahlen, nah, soll } from './testdaten/field2';
import { gewichtLesen, kontrast, orthogonal, polyGewichte, summeNull, trendanalyse, vorlage, zahlenAusNamen } from './kontraste';
import { paarvergleiche } from './posthoc';
import { dunnettKrit, dunnettLambda, pMaxT } from './dunnett';

/* Sollwerte: R (emmeans, multcomp), Opus, docs/fachblaetter/sollwerte/field-stufe2.json. Toleranz 1e-6 relativ; Dunnett wegen numerischer Integration 1e-4. */
const pg = csv('plantgrowth.csv'), g3 = kennzahlen(pg.map(r => r.weight as number), pg.map(r => r.group as string), ['ctrl', 'trt1', 'trt2']);
const tg = csv('toothgrowth.csv'), dosen = [0.5, 1, 2];
const gd = kennzahlen(tg.map(r => r.len as number), tg.map(r => r.dose as number), dosen);

describe('Geplante Kontraste (PlantGrowth)', () => {
  const k = soll.kontraste;
  it('mit gemeinsamer Fehlervarianz wie emmeans', () => {
    (k.gewichte as number[][]).forEach((w, i) => {
      const e = kontrast(g3, w, 'gemeinsam')!;
      expect(nah(e.schaetzung, k.schaetzung[i]), 'Schätzung').toBe(true);
      expect(nah(e.se, k.se[i]), 'se').toBe(true);
      expect(e.df).toBe(k.df[i]);
      expect(nah(e.t, k.t[i]), 't').toBe(true);
      expect(nah(e.p, k.p[i]), `p ${e.p}`).toBe(true);
      expect(nah(e.lo, k.lo[i]), 'lo').toBe(true);
      expect(nah(e.hi, k.hi[i]), 'hi').toBe(true);
    });
  });
  it('ohne gleiche Varianzen (Welch, Satterthwaite)', () => {
    [k.welch_k1, k.welch_k2].forEach((s, i) => {
      const e = kontrast(g3, k.gewichte[i], 'welch')!;
      expect(nah(e.schaetzung, s.est)).toBe(true);
      expect(nah(e.se, s.se), 'se').toBe(true);
      expect(nah(e.df, s.df), `df ${e.df}`).toBe(true);
      expect(nah(e.t, s.t), 't').toBe(true);
      expect(nah(e.p, s.p), 'p').toBe(true);
    });
  });
  it('Summe ungleich 0, falsche Länge und Nullkontrast werden abgelehnt', () => {
    expect(kontrast(g3, [1, 1, 0], 'gemeinsam')).toBeNull();
    expect(kontrast(g3, [1, -1], 'gemeinsam')).toBeNull();
    expect(kontrast(g3, [0, 0, 0], 'gemeinsam')).toBeNull();
    expect(summeNull([-2, 1, 1])).toBe(true);
    expect(summeNull([1 / 3, 1 / 3, -2 / 3])).toBe(true);
  });
  it('orthogonal: die beiden Kontraste des Sollwerts sind es, Kontrolle gegen trt1 und Kontrolle gegen trt2 nicht', () => {
    expect(orthogonal(g3, k.gewichte[0], k.gewichte[1])).toBe(true);
    expect(orthogonal(g3, [-1, 1, 0], [-1, 0, 1])).toBe(false);
  });
  it('Gewichte lesen: Komma, Punkt, Bruch', () => {
    expect(gewichtLesen('-2')).toBe(-2);
    expect(gewichtLesen('0,5')).toBe(0.5);
    expect(gewichtLesen('1/3')).toBeCloseTo(1 / 3, 12);
    expect(gewichtLesen('')).toBeNull();
    expect(gewichtLesen('abc')).toBeNull();
    expect(gewichtLesen('1/0')).toBeNull();
  });
});

describe('Vorlagen füllen die Gewichte (alle Summen 0)', () => {
  it('Helmert, einfach, wiederholt, Abweichung für 4 Gruppen', () => {
    expect(vorlage('helmert', 4)).toEqual([[1, -1 / 3, -1 / 3, -1 / 3], [0, 1, -1 / 2, -1 / 2], [0, 0, 1, -1]]);
    expect(vorlage('einfach', 4)).toEqual([[-1, 1, 0, 0], [-1, 0, 1, 0], [-1, 0, 0, 1]]);
    expect(vorlage('wiederholt', 4)).toEqual([[-1, 1, 0, 0], [0, -1, 1, 0], [0, 0, -1, 1]]);
    for (const a of ['helmert', 'einfach', 'wiederholt', 'abweichung'] as const) for (const w of vorlage(a, 5)) expect(summeNull(w), a).toBe(true);
  });
  it('Helmert-Kontraste sind bei gleich großen Gruppen untereinander orthogonal', () => {
    const g = [1, 2, 3, 4].map(i => ({ name: String(i), n: 10, m: i, sd: 1 })), h = vorlage('helmert', 4);
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) expect(orthogonal(g, h[a]!, h[b]!)).toBe(true);
  });
});

describe('Trendanalyse (ToothGrowth: Dosis 0,5 / 1 / 2)', () => {
  it('gleiche Abstände: ganzzahlige Gewichte, Schätzung, SE, t, p wie emmeans poly', () => {
    const s = soll.trend.gleich_abstand, e = trendanalyse(gd)!;
    e.forEach((z, i) => z.gewichte.forEach((w, j) => expect(w + 0, `Gewicht ${i}/${j}`).toBe(s.gewichte[j][i] + 0)));   // die Matrix im JSON steht je Stufe eine Zeile
    e.forEach((z, i) => {
      expect(nah(z.schaetzung, s.schaetzung[i]), 'Schätzung').toBe(true);
      expect(nah(z.se, s.se[i]), 'se').toBe(true);
      expect(nah(z.t, s.t[i]), 't').toBe(true);
      expect(nah(z.p, s.p[i], 1e-6, 1e-20), `p ${z.p}`).toBe(true);
    });
  });
  it('echte Abstände aus den Zahlenwerten wie contr.poly(scores = …)', () => {
    const s = soll.trend.echte_abstaende, e = trendanalyse(gd, dosen)!;
    e.forEach((z, i) => {
      const soll_w = [0, 1, 2].map(j => s.gewichte[j][i]);
      z.gewichte.forEach((w, j) => expect(nah(w, soll_w[j], 1e-9, 1e-12), `Gewicht ${i}/${j}`).toBe(true));
      expect(nah(z.schaetzung, s.schaetzung[i]), 'Schätzung').toBe(true);
      expect(nah(z.se, s.se[i]), 'se').toBe(true);
      expect(nah(z.t, s.t[i]), 't').toBe(true);
      expect(nah(z.p, s.p[i], 1e-6, 1e-20), 'p').toBe(true);
    });
  });
  it('Anteile der Trends an der Streuung zwischen den Gruppen ergeben bei gleich großen Gruppen 100 %', () => {
    expect(trendanalyse(gd)!.reduce((a, z) => a + z.anteil, 0)).toBeCloseTo(1, 9);
  });
  it('Zahlen aus Gruppennamen; vier Gruppen geben Grad 3', () => {
    expect(zahlenAusNamen(['0,5', '1', '2'])).toEqual([0.5, 1, 2]);
    expect(zahlenAusNamen(['a', '1', '2'])).toBeNull();
    expect(zahlenAusNamen(['1', '1', '2'])).not.toBeNull();   // Prüfung auf verschiedene Werte macht trendanalyse
    expect(trendanalyse(gd, [1, 1, 2])).toBeNull();
    expect(polyGewichte([1, 2, 3, 4])).toHaveLength(3);
    expect(trendanalyse([...gd, { name: 'x', n: 20, m: 30, sd: 5 }])).toHaveLength(3);
  });
});

describe('Weitere Paarvergleiche (PlantGrowth)', () => {
  it('Dunnett (gegen ctrl): Differenz, t-Wert und p wie multcomp, Toleranz 1e-4', () => {
    const d = soll.kontraste.dunnett, e = paarvergleiche(g3, 'dunnett', 0)!;
    expect(e).toHaveLength(2);
    e.forEach((x, i) => {
      expect([x.i, x.j]).toEqual([0, i + 1]);
      expect(nah(x.diff, d.diff[i], 1e-9)).toBe(true);
      expect(nah(x.diff / x.se, d.t[i], 1e-6), 't').toBe(true);
      expect(Math.abs(x.p - d.p[i]), `p ${x.p} gegen ${d.p[i]}`).toBeLessThan(1e-4);
    });
  });
  it('Dunnett: Intervall passt zum p (Rand des Intervalls bei p = 0,05) und die Zahl der Gruppen ändert nur die Anpassung', () => {
    const lam = dunnettLambda([10, 10], 10), c = dunnettKrit(lam, 27);
    expect(pMaxT(c, lam, 27)).toBeCloseTo(0.95, 9);
    expect(c).toBeGreaterThan(2.05); expect(c).toBeLessThan(2.4);   // zwischen t(27) zweiseitig (2,05) und Bonferroni für 2 Vergleiche (2,37)
    const lam1 = dunnettLambda([10], 10);
    expect(dunnettKrit(lam1, 27)).toBeCloseTo(2.0518, 3);   // ein Vergleich = gewöhnliches zweiseitiges t(27)
  });
  it('Dunnett mit anderer Kontrollgruppe und mit ungleich großen Gruppen rechnet ohne Fehler', () => {
    const ung = [{ name: 'k', n: 8, m: 5, sd: 1 }, { name: 'a', n: 12, m: 6, sd: 1.2 }, { name: 'b', n: 5, m: 7, sd: 0.9 }];
    for (const kontr of [0, 1, 2]) { const e = paarvergleiche(ung, 'dunnett', kontr)!; expect(e).toHaveLength(2); for (const x of e) { expect(x.p).toBeGreaterThanOrEqual(0); expect(x.p).toBeLessThanOrEqual(1); expect(x.kiLo).toBeLessThan(x.kiHi); } }
    expect(paarvergleiche(ung, 'dunnett', 3)).toBeNull();
  });
  it('Scheffé wie emmeans (p)', () => {
    const s = soll.kontraste.scheffe, e = paarvergleiche(g3, 'scheffe')!;
    e.forEach((x, i) => { expect(nah(Math.abs(x.diff), Math.abs(s.diff[i]), 1e-9)).toBe(true); expect(nah(x.p, s.p[i]), `p ${x.p}`).toBe(true); });
  });
  it('Holm wie emmeans (p)', () => {
    const s = soll.kontraste.holm, e = paarvergleiche(g3, 'holm')!;
    e.forEach((x, i) => { expect(nah(Math.abs(x.diff), Math.abs(s.diff[i]), 1e-9)).toBe(true); expect(nah(x.p, s.p[i]), `p ${x.p}`).toBe(true); });
  });
});
