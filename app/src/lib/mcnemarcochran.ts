/**
 * McNemar-Test (zwei Ja/Nein-Messungen derselben Personen) und Cochran-Q (drei und mehr). Fachblatt Welle 2, Paket C (G5).
 *
 * McNemar: IMMER der exakte Binomialtest der Paare, die sich verändert haben (b + c), zweiseitig min(1, 2 · Pr(X ≤ min(b, c))), nie über 1 - wie R `exact2x2::mcnemar.exact`
 * und PSPP `NPAR TESTS /MCNEMAR`. Abweichungen von PSPP (Messung 15.10., friedman-mcnemar-cochran-pspp.test.ts): bei b = c gibt PSPP p > 1 aus (1,209), bei b = c = 0 den Wert 2,000; Statable
 * deckelt bei 1 und rechnet ohne veränderte Paare keinen Test. R `mcnemar.test` rechnet dagegen χ² mit Stetigkeitskorrektur, darum weichen deren p-Werte ab.
 * Odds Ratio = b / c mit exaktem 95-%-KI (Clopper-Pearson des Anteils b / (b + c), als Odds) - PSPP gibt beides nicht aus.
 * Cochran-Q: Q = (k − 1)(k ΣC² − N²) / (k N − ΣR²), p aus χ² mit k − 1 Freiheitsgraden; Paarvergleiche McNemar exakt mit Holm. Der Wert 1 zählt als „ja“.
 */
import { betai, chiQuadratP } from './verteilung';
import { holm } from './rangtests';

export interface McNemar {
  n: number; a: number; b: number; c: number; d: number; nDiskordant: number;
  /** Keine veränderten Paare (b = c = 0): kein Test, p, Odds Ratio und KI sind null. */
  kein: boolean;
  p: number | null; oddsRatio: number | null; kiUnten: number | null; kiOben: number | null;
}

/** Pr(X ≤ k) für X ~ Binomial(N, p). Summe in Logarithmen (genau auf etwa 1e-13); über 20 000 Versuchen die unvollständige Betafunktion. */
function binomUnten(k: number, N: number, p: number): number {
  if (k < 0) return 0; if (k >= N) return 1;
  if (p <= 0) return 1; if (p >= 1) return 0;
  if (N > 20000) return 1 - betai(k + 1, N - k, p);
  // log C(N, i) schrittweise: C(N, i) = C(N, i − 1) · (N − i + 1) / i
  const lp = Math.log(p), lq = Math.log(1 - p);
  let lc = 0, s = 0;
  for (let i = 0; i <= k; i++) { if (i > 0) lc += Math.log((N - i + 1) / i); s += Math.exp(lc + i * lp + (N - i) * lq); }
  return Math.min(1, s);
}

/** Exakter zweiseitiger p-Wert der Binomialprobe b gegen c (Wahrscheinlichkeit 1/2), höchstens 1. */
export const pMcNemarExakt = (b: number, c: number): number => Math.min(1, 2 * binomUnten(Math.min(b, c), b + c, 0.5));

/** Clopper-Pearson-Grenzen des Anteils b / N (zweiseitig 95 %) durch Halbierung auf dem exakten Schwanz. */
function clopperPearson(b: number, N: number): [number, number] {
  const suche = (f: (p: number) => number): number => { let lo = 0, hi = 1; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; } return (lo + hi) / 2; };
  // untere Grenze: Pr(X ≥ b | p) = 0,025 (steigt mit p); obere Grenze: Pr(X ≤ b | p) = 0,025 (fällt mit p)
  const unten = b === 0 ? 0 : suche(p => 0.025 - (1 - binomUnten(b - 1, N, p)));
  const oben = b === N ? 1 : suche(p => binomUnten(b, N, p) - 0.025);
  return [unten, oben];
}

/** `vorher` und `nachher`: Werte 0 und 1 (1 = „ja“), gleich lang, nur vollständige Paare. b = vorher 1, nachher 0; c = vorher 0, nachher 1. */
export function mcnemar(vorher: number[], nachher: number[]): McNemar {
  if (vorher.length !== nachher.length) throw new Error('Vorher und nachher müssen gleich viele Werte haben');
  let a = 0, b = 0, c = 0, d = 0;
  vorher.forEach((v, i) => {
    const w = nachher[i]!;
    if ((v !== 0 && v !== 1) || (w !== 0 && w !== 1)) throw new Error('McNemar braucht Werte 0 und 1');
    if (v === 1 && w === 1) a++; else if (v === 1) b++; else if (w === 1) c++; else d++;
  });
  const nD = b + c, n = a + b + c + d;
  if (nD === 0) return { n, a, b, c, d, nDiskordant: 0, kein: true, p: null, oddsRatio: null, kiUnten: null, kiOben: null };
  const [pl, pu] = clopperPearson(b, nD), odds = (x: number) => (x >= 1 ? Infinity : x / (1 - x));
  return { n, a, b, c, d, nDiskordant: nD, kein: false, p: pMcNemarExakt(b, c), oddsRatio: c === 0 ? Infinity : b / c, kiUnten: b === 0 ? 0 : odds(pl), kiOben: c === 0 ? Infinity : odds(pu) };
}

export interface CochranPaar { i: number; j: number; von: string; nach: string; b: number; c: number; p: number | null; pHolm: number | null; oddsRatio: number | null }
export interface CochranQ {
  n: number; k: number; q: number; df: number; p: number;
  spaltensummen: number[]; zeilensummen: number[]; gesamt: number;
  paare: CochranPaar[]; zeitpunkte: string[];
}

export function cochranQ(daten: number[][], zeitpunkte: string[]): CochranQ {
  const n = daten.length, k = zeitpunkte.length;
  if (k < 3) throw new Error('Cochran-Q braucht mindestens drei Zeitpunkte');
  if (n < 2) throw new Error('Cochran-Q braucht mindestens zwei Personen');
  if (daten.some(z => z.some(v => v !== 0 && v !== 1))) throw new Error('Cochran-Q braucht Werte 0 und 1');
  const spaltensummen = zeitpunkte.map((_, j) => daten.reduce((s, z) => s + z[j]!, 0)), zeilensummen = daten.map(z => z.reduce((s, v) => s + v, 0));
  const N = spaltensummen.reduce((a, b) => a + b, 0), c2 = spaltensummen.reduce((s, x) => s + x * x, 0), r2 = zeilensummen.reduce((s, x) => s + x * x, 0);
  const nenner = k * N - r2, q = nenner === 0 ? 0 : (k - 1) * (k * c2 - N * N) / nenner, df = k - 1;
  const paare: CochranPaar[] = [];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const m = mcnemar(daten.map(z => z[i]!), daten.map(z => z[j]!));
    paare.push({ i, j, von: zeitpunkte[i]!, nach: zeitpunkte[j]!, b: m.b, c: m.c, p: m.p, pHolm: null, oddsRatio: m.oddsRatio });
  }
  const mit = paare.filter(x => x.p !== null), ph = holm(mit.map(x => x.p!));
  mit.forEach((x, a) => { x.pHolm = ph[a]!; });
  return { n, k, q, df, p: chiQuadratP(q, df), spaltensummen, zeilensummen, gesamt: N, paare, zeitpunkte };
}
