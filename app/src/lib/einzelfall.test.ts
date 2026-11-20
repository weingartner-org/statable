import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { baueFaelle, einzelfallAus, einzelfallMit, kendall, nap, rechneFall, tauU, type Zeile } from './einzelfall';

/* Vergleichswerte aus R: scripts/einzelfall-erwartet.R (scan 0.68.1: nap, tau_u(method = "parker"), corrected_tau, pnd; SingleCaseES::NAP für das Newcombe-KI;
 * wilcox.test(exact = FALSE) für p). Daten: testdaten/einzelfall.csv (Johanna, Karolina, Anja = scan::exampleAB, Peter = exampleAB_decreasing, Lena = erfunden, set.seed(11)). */
const csv = readFileSync(new URL('./testdaten/einzelfall.csv', import.meta.url), 'utf8').trim().split('\n').slice(1).map(z => z.split(';'));
const zeilen: Zeile[] = csv.map(([fall, phase, zeit, wert]) => ({ fall: fall!, phase: phase!, zeit: Number(zeit), mess: Number(wert) }));

// nAB, desk = [Mittel A, Mittel B, Median A, Median B, SD A, SD B], nap = [NAP, SE, KI unten, KI oben, p], tau/tauTrend = [Tau, S, z, p],
// bc = [τ Trend A, p Trend A, unkorrigiert τ, p, korrigiert τ, p, angewendet, berichtet τ, p]
const ERWARTET = [
  { name: 'Johanna', tief: false, nAB: [5, 15], desk: [54.6, 74.133333, 54.0, 74.0, 2.408319, 8.943207], pnd: 1.0,
    nap: [1.0, 0.010874, 1.0, 1.0, 0.00123427], tau: [1.0, 75.0, 3.2745, 0.00105849], tauTrend: [1.0, 75.0, 3.223849, 0.0012648],
    bc: [0.0, 1.0, 0.629941, 0.00105849, 0.628281, 0.00106311, false, 0.629941, 0.00105849] },
  { name: 'Karolina', tief: false, nAB: [5, 15], desk: [51.8, 73.466667, 52.0, 75.0, 6.83374, 9.760464], pnd: 0.866667,
    nap: [0.966667, 0.030538, 0.695107, 0.996781, 0.00258105], tau: [0.933333, 70.0, 3.05735, 0.00223303], tauTrend: [0.933333, 70.0, 3.01017, 0.00261102],
    bc: [0.0, 1.0, 0.589506, 0.00223303, 0.609601, 0.00164913, false, 0.589506, 0.00223303] },
  { name: 'Anja', tief: false, nAB: [5, 15], desk: [53.6, 74.066667, 53.0, 76.0, 3.04959, 7.573135], pnd: 0.933333,
    nap: [0.98, 0.021437, 0.714409, 0.998752, 0.00189073], tau: [0.96, 72.0, 3.15064, 0.00162913], tauTrend: [1.04, 78.0, 3.361002, 0.0007766],
    bc: [-0.6, 0.14164469, 0.612905, 0.00162913, 0.628281, 0.00106311, false, 0.612905, 0.00162913] },
  { name: 'Peter', tief: true, nAB: [7, 13], desk: [104.714286, 79.307692, 105.0, 81.0, 6.047432, 11.513649], pnd: 0.923077,
    nap: [0.989011, 0.010989, 0.764961, 0.999507, 0.00048189], tau: [0.978022, 89.0, 3.530292, 0.0004151], tauTrend: [0.912088, 83.0, 3.183923, 0.00145293],
    bc: [0.29277, 0.36205019, 0.682258, 0.0004151, 0.298171, 0.12200814, false, 0.682258, 0.0004151] },
  { name: 'Lena', tief: false, nAB: [8, 12], desk: [23.875, 37.166667, 23.0, 36.5, 3.136764, 4.323999], pnd: 1.0,
    nap: [1.0, 0.008203, 1.0, 1.0, 0.00023713], tau: [1.0, 96.0, 3.714469, 0.00020363], tauTrend: [0.770833, 74.0, 2.734695, 0.00624381],
    bc: [0.815374, 0.00570213, 0.724286, 0.00020363, 0.57754, 0.00262182, true, 0.57754, 0.00262182] },
] as const;

const aufbau = baueFaelle(zeilen);
describe('Einzelfallanalyse gegen R (scan, SingleCaseES)', () => {
  it('baut fünf Fälle, A = Ausgangslage', () => {
    expect(aufbau.faelle.map(f => f.name)).toEqual(['Johanna', 'Karolina', 'Anja', 'Peter', 'Lena']);
    expect(aufbau.phasenA).toBe('Ausgangslage'); expect(aufbau.phasenB).toBe('Förderung');
    expect(aufbau.wechselt).toEqual([]); expect(aufbau.ohnePhase).toEqual([]);
  });
  for (const x of ERWARTET) {
    it(`${x.name}${x.tief ? ' (niedriger = besser)' : ''}`, () => {
      const roh = aufbau.faelle.find(f => f.name === x.name)!;
      const f = rechneFall(x.name, roh.y, roh.istB, x.tief ? 'tief' : 'hoch');
      expect([f.a.n, f.b.n]).toEqual(x.nAB);
      expect([f.a.m, f.b.m, f.a.median, f.b.median, f.a.sd, f.b.sd].map((v, i) => [v, x.desk[i]])).toSatisfy((p: number[][]) => p.every(([a, b]) => Math.abs(a! - b!) < 1e-5));
      expect(f.pnd).toBeCloseTo(x.pnd, 5);
      expect(f.nap.wert).toBeCloseTo(x.nap[0], 5); expect(f.nap.se).toBeCloseTo(x.nap[1], 5);
      // R-uniroot ist auf etwa 1e-4 genau (4 Stellen). Bei NAP = 1 liefert SingleCaseES (uniroot) als untere Grenze die triviale Nullstelle 1; das Newcombe-Intervall hat dort eine echte untere Grenze (< 1). Wir prüfen sie nicht gegen R.
      if (x.nap[0] < 1) expect(f.nap.lo).toBeCloseTo(x.nap[2], 4); else expect(f.nap.lo).toBeLessThan(1);
      expect(f.nap.hi).toBeCloseTo(x.nap[3], 4); expect(f.nap.p).toBeCloseTo(x.nap[4], 6);
      for (const [t, e] of [[f.tauU, x.tau], [f.tauUTrend, x.tauTrend]] as const) {
        expect(t.wert).toBeCloseTo(e[0], 5); expect(t.s).toBe(e[1]); expect(t.z).toBeCloseTo(e[2], 5); expect(t.p).toBeCloseTo(e[3], 6);
      }
      const b = x.bc;
      expect(f.bc.trendTau).toBeCloseTo(b[0] as number, 5); expect(f.bc.trendP).toBeCloseTo(b[1] as number, 6);
      expect(f.bc.unkorrigiert.tau).toBeCloseTo(b[2] as number, 5); expect(f.bc.unkorrigiert.p).toBeCloseTo(b[3] as number, 6);
      expect(f.bc.korrigiert.tau).toBeCloseTo(b[4] as number, 5); expect(f.bc.korrigiert.p).toBeCloseTo(b[5] as number, 6);
      expect(f.bc.angewendet).toBe(b[6]); expect(f.bc.tau).toBeCloseTo(b[7] as number, 5); expect(f.bc.p).toBeCloseTo(b[8] as number, 6);
    });
  }
});

describe('Einzelfall: Randfälle und Aufbau', () => {
  it('NAP: Gleichstand zählt halb, volle Trennung gibt 1', () => {
    const r = nap([1, 2, 3], [3, 4, 5]);
    expect(r.besser).toBe(8); expect(r.gleich).toBe(1); expect(r.wert).toBeCloseTo(8.5 / 9, 12);
    expect(nap([1, 2, 3], [4, 5, 6]).wert).toBe(1);
  });
  it('Kendall: τb ohne Bindungen = klassisches τ', () => { const k = kendall([1, 2, 3, 4], [1, 3, 2, 4]); expect(k.s).toBe(4); expect(k.tauB).toBeCloseTo(4 / 6, 12); });
  it('Tau-U ohne Trendkorrektur = (Paare besser − schlechter) / Paare', () => { expect(tauU([5, 4, 6], [7, 4, 8], false).wert).toBeCloseTo((6 - 2) / 9, 12); });
  it('Richtung umkehren kehrt NAP um', () => {
    const roh = [{ name: '', y: [9, 8, 9, 3, 2, 3, 2], istB: [false, false, false, true, true, true, true] }];
    const kopf = { mess: 'w', phase: 'p', zeit: '', fall: '', phasenA: 'A', phasenB: 'B', zeilen: 7, ausgelassen: 0 };
    const hoch = einzelfallAus(roh, kopf, 'hoch'), tief = einzelfallMit(hoch, 'tief');
    expect(hoch.faelle[0]!.nap.wert).toBe(0); expect(tief.faelle[0]!.nap.wert).toBe(1);
    expect(tief.faelle[0]!.a.m).toBeCloseTo(26 / 3, 10);   // Mittelwerte bleiben in Originaleinheiten
    expect(tief.faelle[0]!.pnd).toBe(1);
  });
  it('mehrere Fälle: Mittel der Kennwerte', () => {
    const roh = ['Anja', 'Peter', 'Lena'].map(n => aufbau.faelle.find(f => f.name === n)!);
    const e = einzelfallAus(roh, { mess: 'w', phase: 'p', zeit: 'z', fall: 'f', phasenA: 'A', phasenB: 'B', zeilen: 60, ausgelassen: 0 }, 'hoch');
    expect(e.gesamt!.n).toBe(3); expect(e.gesamt!.nap).toBeCloseTo((e.faelle[0]!.nap.wert + e.faelle[1]!.nap.wert + e.faelle[2]!.nap.wert) / 3, 12);
  });
  it('sortiert nach Messzeitpunkt und erkennt wechselnde Phasen', () => {
    const z: Zeile[] = [{ mess: 5, phase: 'B', zeit: 3 }, { mess: 1, phase: 'A', zeit: 1 }, { mess: 2, phase: 'A', zeit: 2 }, { mess: 7, phase: 'B', zeit: 4 }];
    const a = baueFaelle(z);
    expect(a.faelle[0]!.y).toEqual([1, 2, 5, 7]); expect(a.faelle[0]!.istB).toEqual([false, false, true, true]);
    const w = baueFaelle([...z, { mess: 1, phase: 'A', zeit: 5 }]);
    expect(w.wechselt).toEqual(['']);
  });
  it('lässt Zeilen ohne Messwert oder Phase aus', () => {
    const a = baueFaelle([{ mess: null, phase: 'A' }, { mess: 3, phase: null }, { mess: 3, phase: 'A' }, { mess: 4, phase: 'B' }]);
    expect(a.ausgelassen).toBe(2); expect(a.faelle[0]!.y).toEqual([3, 4]);
  });
  it('lauter gleiche Werte: keine Abstürze, NaN statt Zahl', () => {
    const f = rechneFall('x', [3, 3, 3, 3, 3, 3], [false, false, false, true, true, true], 'hoch');
    expect(f.nap.wert).toBe(0.5); expect(f.pnd).toBe(0); expect(Number.isNaN(f.bc.tau)).toBe(true);
  });
});
