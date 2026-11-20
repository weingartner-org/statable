import { describe, expect, it } from 'vitest';
import { zweiPL, gaussHermiteNormal } from './irt2pl';
import DATEN from './irt2pl-daten.csv?raw';

/* Sollwerte: R `ltm::ltm(Y ~ z1)` (ltm 1.2-0) auf irt2pl-daten.csv (500 Personen, 8 Aufgaben, set.seed(11)): Dffclt, Dscrmn und Standardfehler aus summary(), Log-Likelihood. */
const B = [-1.19607142, -0.65811897, -0.09559076, 0.04264556, 0.29887741, 0.90613681, 1.06967981, 0.03759378];
const A = [0.67655923, 1.20452639, 1.47287151, 0.92667969, 0.92878711, 1.70368237, 0.78983234, 2.50777677];
const SEB = [0.25505817, 0.11797885, 0.08570912, 0.11437455, 0.11985359, 0.11125866, 0.20777760, 0.06810526];
const SEA = [0.13744302, 0.18121148, 0.20870135, 0.14957313, 0.15046844, 0.26977700, 0.14684865, 0.42751766];
const y = DATEN.trim().split('\n').slice(1).map(z => z.split(',').map(Number));

describe('2PL gegen ltm', () => {
  it('Stützstellen: Gewichte summieren zu 1, Erwartung 0, Varianz 1', () => {
    const { x, w } = gaussHermiteNormal(21);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(x.reduce((a, v, i) => a + v * w[i]!, 0)).toBeCloseTo(0, 12);
    expect(x.reduce((a, v, i) => a + v * v * w[i]!, 0)).toBeCloseTo(1, 12);
  });
  it('Schwierigkeit, Trennschärfe, Standardfehler und Log-Likelihood wie ltm', () => {
    const r = zweiPL(y);
    if ('fehler' in r) throw new Error(r.fehler);
    expect(r.logLik).toBeCloseTo(-2427.713958, 3);
    r.item.forEach((it, j) => {
      expect(it.b, `b${j}`).toBeCloseTo(B[j]!, 4); expect(it.a, `a${j}`).toBeCloseTo(A[j]!, 4);
      expect(Math.abs(it.seB - SEB[j]!) / SEB[j]!, `seB${j}`).toBeLessThan(2e-3); expect(Math.abs(it.seA - SEA[j]!) / SEA[j]!, `seA${j}`).toBeLessThan(2e-3);
    });
    expect(r.aic).toBeCloseTo(-2 * r.logLik + 32, 8);
  });
  it('Fehlerfälle', () => {
    expect(zweiPL(y.map(r => r.slice(0, 2)))).toEqual({ fehler: 'zu-wenig-aufgaben' });
    expect(zweiPL(y.map(r => [r[0]!, r[1]!, 2]))).toEqual({ fehler: 'werte' });
    expect(zweiPL(y.map(r => [r[0]!, r[1]!, 1]))).toEqual({ fehler: 'aufgabe-ohne-streuung' });
    expect(zweiPL(y.slice(0, 10))).toEqual({ fehler: 'zu-wenig-personen' });
  });
});
