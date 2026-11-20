import { describe, expect, it } from 'vitest';
import { nah, obkBreit, soll } from './testdaten/field3';
import { mwGewichte, mwKontraste } from './messwiederholung';
import { stufenWerte } from './messwiederholung2';

/* Sollwerte: R t.test auf den Kontrastwerten je Person (Opus), field-stufe3.json (mw_kontrast); Daten obk.long, Mittel über hour je Person und phase. */
const { daten } = obkBreit(), phasen = stufenWerte(daten, 3, 5, 'a');

describe('Kontraste des Messwiederholungsfaktors mit eigenem Fehler', () => {
  it('linear (−1, 0, 1) und quadratisch (1, −2, 1) wie t.test in R', () => {
    const s = soll.mw_kontrast;
    for (const [art, ref] of [['linear', s.linear], ['quadratisch', s.quadratisch]] as const) {
      const w = mwGewichte(art, 3);
      expect(w).toEqual([ref.gewichte]);
      const k = mwKontraste(phasen, w)![0]!;
      expect(nah(k.schaetzung, ref.schaetzung), 'Schätzung').toBe(true);
      expect(nah(k.t, ref.t), `t ${k.t}`).toBe(true);
      expect(k.df).toBe(ref.df);
      expect(nah(k.p, ref.p), `p ${k.p}`).toBe(true);
      expect(k.lo).toBeLessThan(k.schaetzung); expect(k.hi).toBeGreaterThan(k.schaetzung);
    }
  });
  it('Helmert und wiederholt: je k−1 Kontraste, Holm nie kleiner als p', () => {
    for (const art of ['helmert', 'wiederholt'] as const) {
      const w = mwGewichte(art, 3), r = mwKontraste(phasen, w)!;
      expect(r).toHaveLength(2);
      r.forEach(x => expect(x.pHolm).toBeGreaterThanOrEqual(x.p));
    }
    expect(mwGewichte('wiederholt', 3)).toEqual([[-1, 1, 0], [0, -1, 1]]);
  });
  it('Trend bei vier Stufen: drei Grade, ganzzahlig', () => {
    expect(mwGewichte('trend', 4)).toEqual([[-3, -1, 1, 3], [1, -1, -1, 1], [-1, 3, -3, 1]]);
    expect(mwGewichte('linear', 2)).toEqual([]);
  });
  it('eigene Gewichte: Summe ≠ 0, falsche Länge und Nullzeile werden abgelehnt', () => {
    expect(mwKontraste(phasen, [[1, 1, 0]])).toBeNull();
    expect(mwKontraste(phasen, [[1, -1]])).toBeNull();
    expect(mwKontraste(phasen, [[0, 0, 0]])).toBeNull();
    expect(mwKontraste(phasen, [[2, -1, -1]])).not.toBeNull();
  });
  it('mit Gruppen: Gruppenmittel ungewichtet, df = Personen − Gruppen', () => {
    const grp = daten.map((_, i) => (i < 8 ? 'x' : 'y'));
    const k = mwKontraste(phasen, [[-1, 0, 1]], grp)![0]!;
    expect(k.df).toBe(14);
    const m1 = phasen.slice(0, 8).reduce((s, r) => s + (r[2]! - r[0]!), 0) / 8, m2 = phasen.slice(8).reduce((s, r) => s + (r[2]! - r[0]!), 0) / 8;
    expect(nah(k.schaetzung, (m1 + m2) / 2)).toBe(true);
  });
});
