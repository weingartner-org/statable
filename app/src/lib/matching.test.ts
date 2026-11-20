import { describe, expect, it } from 'vitest';
import { logistik, propensityMatching, type MatchErgebnis, type MatchFehler } from './matching';

/* Sollwerte: Rscript am Mac (R 4.6.1, MatchIt 4.7.2): matchit(treat ~ x1 + x2, method = "nearest", distance = "glm", link = "linear.logit", ratio = 1, replace = FALSE), 80 simulierte Fälle (set.seed(7)).
 * glm: Konstante −4,034463747, x1 0,07394846167, x2 0,690698235. 38 Paare. ATT = 4,085789474, SE = 0,761913593, t = 5,362536528, df = 37; naive Differenz 4,250789474.
 * Standardisierte Mittelwertdifferenz vorher/nachher: x1 0,651536 → 0,552847, x2 0,597385 → 0,437502. */
const TREAT = [1,1,0,0,0,1,1,0,1,1,1,0,1,1,0,0,1,0,0,1,1,1,0,0,0,0,1,1,1,1,0,1,0,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,1,1,0,1,1,1,1,0,0,0,0,0,0,1,0,1];
const X1 = [72.9,38,43.1,45.9,40.3,40.5,57.5,48.8,51.5,71.9,53.6,77.2,72.8,53.2,69,54.7,41.1,46.9,50,59.9,58.4,57.1,63.1,36.1,62.7,51.8,57.5,55.9,40.2,47.2,41.3,57.2,51.1,49.2,45.8,44.4,60,38.9,48.6,53.1,62.2,43,47.1,36.9,46.1,46,63.5,55.9,51,59.3,47.4,49.9,53.7,67.1,57.2,54.8,34.3,53.2,51.7,41,50.8,51.6,55.4,57,53.2,61.1,57.7,61.5,62.6,57,54.3,40.8,43.8,41.3,33.6,36.7,41.1,44.4,49.4,74.2];
const X2 = [0.34,0,0.03,-0.39,-0.79,-0.31,-0.35,-0.3,-1.79,0.59,1.64,-0.65,0.62,0.24,0.85,-0.57,1.12,-1.54,-0.44,-0.15,0.52,0.59,-0.08,-1.17,0.31,-1.6,0.99,1.02,0.84,0.12,-0.43,0.46,0.65,0.61,-0.89,1.54,-1.24,1.1,0.98,0.3,-1.55,1.57,0.69,-0.18,0.73,1.53,0.51,0.03,-1.47,1.02,-0.59,0.81,0.87,0.37,1.13,-0.76,0.45,0.92,0.27,1.01,-1.46,-0.87,0.17,0.21,0.48,-0.07,-0.89,0.49,0.34,-1.1,-0.36,1.1,-0.91,-0.21,0.68,-0.8,-1.59,1.18,1.22,-0.01];
const Y = [50.45,35.99,32.9,34.99,34.55,30.16,36.9,35.35,30.57,48.15,40.59,37.32,42.77,36.6,39.27,40.03,35.6,32.08,31.23,38.41,39.71,36.21,41.67,30.49,37.6,36.87,40.69,37.92,34.12,30.65,34.66,38.31,36.35,34.89,38.97,33.21,36.09,33.39,38.05,35.08,37.12,35.72,34.25,35.44,35.81,41.98,39.99,36.58,27.61,43.74,28.9,29.27,33.4,41.89,37.7,33.49,29.01,44.61,35.86,34.28,30.77,29.53,47.13,40.56,41.43,41.64,34.12,41.31,38.58,41.47,40.16,34.85,31.2,28.81,31.54,37.2,32.72,39.32,40.9,48];
const PAARE_T = [1, 2, 6, 7, 9, 10, 11, 13, 14, 17, 20, 21, 22, 27, 28, 29, 30, 32, 35, 36, 39, 41, 43, 45, 47, 50, 52, 54, 58, 63, 65, 66, 68, 69, 70, 71, 78, 80];
const PAARE_K = [55, 26, 73, 3, 5, 12, 53, 15, 19, 75, 16, 40, 34, 64, 48, 31, 57, 72, 44, 67, 38, 49, 4, 51, 46, 79, 56, 23, 59, 8, 37, 60, 42, 33, 61, 74, 62, 25];
const ok = (r: MatchErgebnis | MatchFehler): MatchErgebnis => { if ('fehler' in r) throw new Error(r.fehler); return r; };
const nah = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b) / Math.abs(b), `${a} gegen ${b}`).toBeLessThan(tol);
const eing = { y: Y, behandelt: TREAT.map(v => v === 1), x: X1.map((v, i) => [v, X2[i]!]), namenX: ['x1', 'x2'] };

describe('Propensity-Score-Matching gegen R MatchIt', () => {
  it('logistische Regression (IRLS) wie glm', () => {
    const f = logistik(TREAT, eing.x)!; nah(f.koeff[0]!, -4.034463747, 1e-7); nah(f.koeff[1]!, 0.07394846167, 1e-7); nah(f.koeff[2]!, 0.690698235, 1e-7); expect(f.konvergiert).toBe(true);
  });
  const r = ok(propensityMatching(eing));
  it('38 Paare, dieselben Paare wie MatchIt (größter Score zuerst, nächster freier Nachbar auf dem Logit)', () => {
    expect(r.paare).toBe(38); expect(r.nB).toBe(38); expect(r.nK).toBe(42);
    const m = new Map(r.paarB.map((t, i) => [t + 1, r.paarK[i]! + 1]));
    PAARE_T.forEach((t, i) => expect(m.get(t), `behandelt ${t}`).toBe(PAARE_K[i]));
  });
  it('Wirkung: ATT, Standardfehler, t, df und naive Differenz', () => {
    nah(r.att, 4.085789474); nah(r.se, 0.761913593, 1e-7); nah(r.t, 5.362536528, 1e-7); expect(r.df).toBe(37); nah(r.naiv, 4.250789474); expect(r.p).toBeLessThan(0.001); expect(r.lo).toBeLessThan(r.att); expect(r.hi).toBeGreaterThan(r.att);
  });
  it('Ausgleich: standardisierte Mittelwertdifferenz vor und nach dem Matching', () => {
    nah(r.ausgleich[0]!.smdVorher, 0.651536, 1e-5); nah(r.ausgleich[0]!.smdNachher, 0.552847, 1e-5); nah(r.ausgleich[1]!.smdVorher, 0.597385, 1e-5); nah(r.ausgleich[1]!.smdNachher, 0.437502, 1e-5);
    nah(r.ausgleich[0]!.mittelBMatch, 55.192105, 1e-7); nah(r.ausgleich[0]!.mittelKMatch, 49.976316, 1e-7);
  });
});

describe('Propensity-Score-Matching: Caliper und Fehlerfälle', () => {
  it('ein enger Caliper lässt Behandelte ohne Partner weg (ohnePartner > 0), nie mehr Paare als ohne Caliper', () => {
    const r = ok(propensityMatching(eing, { caliper: 0.1 })); expect(r.paare).toBeLessThan(38); expect(r.ohnePartner).toBe(38 - r.paare); expect(r.paare).toBeGreaterThanOrEqual(2);
  });
  it('Fehler: ohne Merkmale, eine Gruppe, zu wenige Fälle', () => {
    expect(propensityMatching({ ...eing, x: eing.x.map(() => []), namenX: [] })).toEqual({ fehler: 'keine-merkmale' });
    expect(propensityMatching({ ...eing, behandelt: eing.behandelt.map(() => false) })).toEqual({ fehler: 'eine-gruppe' });
    expect(propensityMatching({ y: Y.slice(0, 12), behandelt: eing.behandelt.slice(0, 12), x: eing.x.slice(0, 12), namenX: ['x1', 'x2'] })).toEqual({ fehler: 'zu-wenig' });
  });
});
