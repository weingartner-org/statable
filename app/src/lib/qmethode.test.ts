import { describe, expect, it } from 'vitest';
import { qRechne, type QErgebnis } from './qmethode';

// Sollwerte: scripts/qmethode-erwartet.R (qmethod 1.8.4, R 4.6.1); Zeilen = Aussagen, Spalten = Personen
const DATEN = [
  [2, 0, 3, 3, -2, 0, -3, -2], [2, 3, 0, 2, -3, -1, -1, -3], [1, 1, 1, 1, 1, 1, 0, -1], [3, 1, 2, 2, 2, 3, 3, 1],
  [1, 2, 2, 1, 3, 1, 1, 2], [-2, 2, 0, -1, 0, -3, 1, -1], [-1, -1, -1, -2, 2, 2, 2, 3], [0, 0, -1, 0, 0, -1, -1, 0],
  [-1, -1, -2, 0, -2, -1, 0, 0], [-2, -2, -2, -2, -1, 0, -1, 1], [0, -3, -1, -1, -1, -2, -2, -2], [-3, -2, -3, -3, -1, -2, -2, -1],
  [-1, -1, 1, -1, 1, 2, 2, 2],
];
const SORTS = DATEN[0]!.map((_, p) => DATEN.map(r => r[p]!)); // je Person
const L1 = [0.9356447158, 0.7343709520, 0.8689780961, 0.9700797783, 0.0743375786, 0.3575970974, 0.1067252211, -0.2661835533];
const L2 = [0.0474111586, 0.0648925483, 0.2741821994, -0.1264712289, 0.9045713774, 0.8013345445, 0.8753211417, 0.9195512542];
const Z1 = [1.5593761101, 1.1089708285, 0.6326016274, 1.3394138270, 0.7363726908, -0.5256901286, -0.8743131200, -0.0264200558, -0.2817526990, -1.1296457632, -0.4549987406, -1.6848963830, -0.3990181936];
const Z2 = [-1.1709864417, -1.3803175683, 0.0943866407, 1.2949328473, 1.2568435168, -0.2809317264, 1.5132105244, -0.1724362680, -0.4011698462, -0.0539539899, -1.0147395296, -0.7954215834, 1.1105834243];
const N1 = [3, 2, 1, 2, 1, -1, -2, 0, 0, -2, -1, -3, -1];
const N2 = [-2, -3, 1, 2, 2, -1, 3, 0, -1, 0, -2, -1, 1];
const nah = (a: number, b: number, t: number) => expect(Math.abs(a - b)).toBeLessThan(t);

describe('Q-Methode', () => {
  const e = qRechne(SORTS, 2) as QErgebnis;
  it('Korrelation, Eigenwerte, Ladungen und Markierung wie qmethod', () => {
    expect(e.fehler).toBeUndefined();
    nah(e.korrelation[0]![1]!, 0.5375494071, 1e-9); nah(e.korrelation[0]![4]!, 0.1007905138, 1e-9);
    nah(e.eigenwerte[0]!, 3.6656265500, 1e-8); nah(e.eigenwerte[2]!, 0.7539175184, 1e-8);
    for (let i = 0; i < 8; i++) { nah(e.ladungen[i]![0]!, L1[i]!, 2e-5); nah(e.ladungen[i]![1]!, L2[i]!, 2e-5); }
    expect(e.markiert.map(r => r.map(Number))).toEqual([[1, 0], [1, 0], [1, 0], [1, 0], [0, 1], [0, 1], [0, 1], [0, 1]]);
    nah(e.erklaert[0]!, 41.58194, 1e-3); nah(e.erklaert[1]!, 39.62222, 1e-3);
  });
  it('z-Werte, Faktor-Q-Sort und Faktorkorrelation wie qmethod', () => {
    for (let a = 0; a < 13; a++) { nah(e.z[a]![0]!, Z1[a]!, 2e-4); nah(e.z[a]![1]!, Z2[a]!, 2e-4); }
    expect(e.erzwungen).toBe(true);
    expect(e.sort!.map(r => r[0])).toEqual(N1);
    expect(e.sort!.map(r => r[1])).toEqual(N2);
    nah(e.faktorKorrelation[0]![1]!, -0.0229259258, 2e-4);
  });
  it('Fehler und freie Verteilung', () => {
    expect(qRechne(SORTS.slice(0, 2), 1)).toEqual({ fehler: 'zu-wenig-personen' });
    expect(qRechne(SORTS, 8)).toEqual({ fehler: 'faktorenzahl' });
    expect(qRechne(SORTS.map(r => r.slice(0, 5)), 2)).toEqual({ fehler: 'zu-wenig-aussagen' });
    const frei = SORTS.map((r, i) => (i === 0 ? r.map((v, a) => (a === 0 ? 3 : v)) : r));
    expect((qRechne(frei, 2) as QErgebnis).sort).toBeNull();
  });
});
