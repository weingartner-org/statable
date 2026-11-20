/** Abschlusstest A4: Einzelfallanalyse in O(n log n). Die alten, paarweisen Rechnungen stehen hier als Vergleich (Ergebnis muss gleich sein). */
import { describe, expect, it } from 'vitest';
import { kendall, nap, rechneFall, tauU, theilSen, median } from './einzelfall';

const zufall = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const daten = (n: number, seed: number, stufen: number) => { const z = zufall(seed); return Array.from({ length: n }, () => Math.round(z() * stufen) / (stufen > 50 ? 7 : 1)); };

// Vergleich: die bisherige paarweise Rechnung
const kendallSAlt = (x: number[], y: number[]) => { let s = 0; for (let i = 0; i < x.length - 1; i++) for (let j = i + 1; j < x.length; j++) s += Math.sign(x[j]! - x[i]!) * Math.sign(y[j]! - y[i]!); return s; };
const napAlt = (a: number[], b: number[]) => {
  const m = a.length, n = b.length; let besser = 0, gleich = 0;
  for (const x of a) for (const y of b) { if (y > x) besser++; else if (y === x) gleich++; }
  const wert = (besser + gleich / 2) / (m * n), q = (x: number, y: number) => (y > x ? 1 : y === x ? 0.5 : 0);
  let q1 = 0, q2 = 0, xx = 0;
  for (const x of a) { let r = 0; for (const y of b) { r += q(x, y) - wert; xx += (q(x, y) - wert) ** 2; } q1 += r * r; }
  for (const y of b) { let c = 0; for (const x of a) c += q(x, y) - wert; q2 += c * c; }
  q1 /= m * n * n; q2 /= m * m * n; xx /= m * n;
  const tr = 0.5 / (m * n), wt = Math.min(Math.max(wert, tr), 1 - tr);
  return { wert, v: (wt * (1 - wt) + n * q1 + m * q2 - 2 * xx) / ((m - 1) * (n - 1)), besser, gleich };
};
const theilSenAlt = (x: number[], y: number[]) => { const st: number[] = []; for (let i = 0; i < x.length - 1; i++) for (let j = i + 1; j < x.length; j++) if (x[j] !== x[i]) st.push((y[j]! - y[i]!) / (x[j]! - x[i]!)); const s = st.length ? median(st) : 0; return { steigung: s, achse: median(y.map((v, i) => v - s * x[i]!)) }; };

describe('Einzelfall schnell = Einzelfall paarweise', () => {
  for (const [n, stufen] of [[8, 3], [25, 4], [60, 100], [200, 6], [300, 1000]] as const) {
    it(`Kendall-S, NAP, Tau-U und Theil-Sen bei ${n} Werten (mit Bindungen)`, () => {
      const a = daten(n, n + 1, stufen), b = daten(Math.ceil(n * 1.5), n + 2, stufen).map(v => v + 1);
      const x = [...a, ...b], y = daten(n + b.length, n + 3, stufen);
      expect(kendall(x, y).s).toBe(kendallSAlt(x, y));
      expect(kendall(a, a.map((_, i) => i + 1)).s).toBe(kendallSAlt(a, a.map((_, i) => i + 1)));
      const alt = napAlt(a, b), neu = nap(a, b);
      expect(neu.besser).toBe(alt.besser); expect(neu.gleich).toBe(alt.gleich); expect(neu.wert).toBeCloseTo(alt.wert, 12);
      expect(neu.se).toBeCloseTo(Math.sqrt(alt.v), 10);
      const t = tauU(a, b, false), tt = tauU(a, b, true);
      expect(t.s).toBe(alt.besser + 0 - (a.length * b.length - alt.besser - alt.gleich));
      expect(tt.s).toBe(t.s - kendallSAlt(a, a.map((_, i) => i + 1)));
      const idx = a.map((_, i) => i + 1), ts = theilSenAlt(idx, a);
      expect(theilSen(idx, a).steigung).toBeCloseTo(ts.steigung, 10); expect(theilSen(idx, a).achse).toBeCloseTo(ts.achse, 9);
    });
  }
  it('Theil-Sen über den Zähl-Weg (erzwungen) = paarweise, gerade und ungerade Paarzahl', () => {
    for (const n of [4, 5, 9, 40, 123]) {
      const y = daten(n, 7 * n, 20), x = y.map((_, i) => i + 1), alt = theilSenAlt(x, y);
      const neu = theilSen(x, y, 0);   // Schwelle 0: immer der Zähl-Weg
      expect(neu.steigung).toBeCloseTo(alt.steigung, 10); expect(neu.achse).toBeCloseTo(alt.achse, 9);
    }
  });
  // Zeitgrenzen: Die Aussage ist „die Rechnung kommt in vertretbarer Zeit“ (vorher 129 s bei 20.000, bei 100.000 nie). Allein dauert
  // der 100.000er-Test 2-3 s, im Gesamtlauf der Suite (parallel, 2300+ Tests) 7-10 s und riss die Voreinstellung von 5 s Test-Timeout
  // (16.10.). Darum: eigener Test-Timeout (120 s) und Zeitgrenze 30 s, also weit unter „vorher 129 s / nie“, aber nicht an der Lastschwankung.
  it('20.000 Messungen (A 10.000, B 10.000): alle Kennwerte in wenigen Sekunden (vorher 129 s)', () => {
    const y = daten(20000, 99, 60).map((v, i) => v + (i >= 10000 ? 5 : 0));
    const t0 = Date.now(), f = rechneFall('x', y, y.map((_, i) => i >= 10000), 'hoch');
    expect(Date.now() - t0).toBeLessThan(30000);
    expect(f.nap.wert).toBeGreaterThan(0.5); expect(Number.isFinite(f.bc.tau)).toBe(true);
  }, 120000);
  it('100.000 Messungen: Ergebnis kommt (vorher nie)', () => {
    const y = daten(100000, 5, 60).map((v, i) => v + (i >= 50000 ? 3 : 0));
    const t0 = Date.now(), f = rechneFall('x', y, y.map((_, i) => i >= 50000), 'hoch');
    expect(Date.now() - t0).toBeLessThan(30000); expect(f.nap.wert).toBeGreaterThan(0.5);
  }, 120000);
});
