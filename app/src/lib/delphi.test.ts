import { describe, expect, it } from 'vitest';
import { delphiKennzahlen, kendallW, rundenVergleich, type DelphiRegel } from './delphi';

// Sollwerte: scripts/delphi-erwartet.R (Basis-R, R 4.6.1)
const R1 = [[5, 4, 2, 3, 1], [4, 4, 3, 3, 2], [5, 3, 2, 4, 1], [4, 5, 1, 3, 2], [5, 4, 2, 2, 1], [3, 4, 3, 3, null]];
const R2 = [[5, 4, 2, 3, 1], [5, 4, 2, 3, 2], [5, 4, 2, 3, 1], [4, 4, 2, 3, 1], [5, 4, 2, 3, 1], [4, 4, 3, 3, 2]];
const REGEL: DelphiRegel = { maxIqr: 1, band: [4, 5], minAnteil: 0.75 };
const nah = (a: number, b: number, t = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(t);

describe('Delphi', () => {
  it('Kennzahlen Runde 1 wie R (quantile type 7)', () => {
    const k = delphiKennzahlen(R1, REGEL);
    expect(k[0]).toMatchObject({ n: 6, median: 4.5, q1: 4, q3: 5, iqr: 1, konsens: true });
    nah(k[0].mittel, 4.3333333333); nah(k[0].sd, 0.8164965809); nah(k[0].anteil!, 0.8333333333);
    expect(k[2]).toMatchObject({ median: 2, iqr: 0.75, konsens: false });
    nah(k[2].sd, 0.7527726527);
    expect(k[4].n).toBe(5); nah(k[4].mittel, 1.4); nah(k[4].sd, 0.5477225575);
    expect(k[3].konsens).toBe(false); // IQR 0, aber nur 17 % im Bereich
  });
  it('Kendalls W mit Bindungen und fehlenden Werten wie R', () => {
    const w1 = kendallW(R1)!;
    expect([w1.m, w1.k, w1.df]).toEqual([5, 5, 4]);
    nah(w1.w, 0.8597938144); nah(w1.chi2, 17.1958762887); expect(Math.abs(w1.p - 1.7706831515e-3) / 1.77e-3).toBeLessThan(1e-6);
    const w2 = kendallW(R2)!;
    expect(w2.m).toBe(6);
    nah(w2.w, 0.9727011494); nah(w2.chi2, 23.3448275862); expect(Math.abs(w2.p - 1.0804245519e-4) / 1.08e-4).toBeLessThan(1e-6);
    expect(kendallW([[1, 2, 3]])).toBeNull();
  });
  it('Vergleich der Runden und Regel ohne Teile', () => {
    const v = rundenVergleich(delphiKennzahlen(R1, REGEL), delphiKennzahlen(R2, REGEL));
    expect(v[0]).toMatchObject({ wechsel: 'gehalten', medianAenderung: 0.5 });
    expect(v[3].wechsel).toBe('offen');
    expect(delphiKennzahlen(R1, { maxIqr: null, band: null, minAnteil: 0 })[0].konsens).toBe(false);
    expect(delphiKennzahlen([], REGEL)).toEqual([]);
  });
});
