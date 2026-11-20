/**
 * Rangkorrelationen nach Spearman (r_s) und Kendall (τ_b) mit p-Wert und 95 %-Bereich.
 * Warum eigener Code: PSPP 2.1.1 kennt NONPAR CORR nicht („is not yet implemented“, geprüft 08.10.2026).
 * Die Rechnung ist klein und wird in rangkorrelation.test.ts gegen R und gegen PSPP (RANK + CORRELATIONS, CROSSTABS BTAU) geprüft.
 * ⚠ Testwahl, Näherungen und Bereichs-Formeln sind von der Fachperson abzunehmen:
 *   - p-Wert Spearman: mit Bindungen und ab n = 1290 t-Näherung t = r·√((n−2)/(1−r²)), df = n−2 (wie SPSS und R `cor.test`); ohne Bindungen wie R
 *     (AS 89): n ≤ 9 exakt (alle Permutationen), n = 10 bis 1289 Edgeworth-Reihe - das ist eine Näherung (`exakt: false`), aber genau Rs Zahl;
 *   - p-Wert Kendall: ohne Bindungen und n < 50 exakt (wie R `cor.test`), sonst Normalnäherung mit Bindungskorrektur der Varianz (wie SPSS/PSPP und R bei Bindungen);
 *   - 95 %-Bereich: Fisher-z; Spearman SE = √((1 + r²/2)/(n−3)) (Bonett & Wright 2000), Kendall SE = √(0,437/(n−4)) (Fieller, Hartley & Pearson 1957).
 */
import { normal, tVerteilung } from './verteilung';
import { EXAKT_UNTER, SPEARMAN_AS89_BIS, SPEARMAN_EXAKT_BIS, pKendallExakt, pSpearmanAS89 } from './exakteTests';

export type Korrelationsart = 'pearson' | 'spearman' | 'kendall';
export interface Rangkorrelation {
  r: number; p: number; n: number; kiLo: number; kiHi: number;
  /** Nur bei Spearman und Kendall: `true` = p ist exakt (Spearman n ≤ 9, Kendall n < 50, jeweils ohne Bindungen), `false` = Näherung (Edgeworth, t oder Normal). */
  exakt?: boolean;
  /** Nur bei Spearman und Kendall: p der bisherigen Näherung (t bzw. Normal), zum Vergleich. */
  pNaeherung?: number;
}

const Z975 = 1.959963984540054;

/** Mittlere Ränge (Bindungen bekommen den Mittelwert ihrer Plätze). */
export function raenge(w: number[]): number[] {
  const idx = w.map((_, i) => i).sort((a, b) => w[a]! - w[b]!);
  const r = new Array<number>(w.length);
  for (let i = 0; i < idx.length;) {
    let j = i; while (j + 1 < idx.length && w[idx[j + 1]!] === w[idx[i]!]) j++;
    for (let k = i; k <= j; k++) r[idx[k]!] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}

const pearson = (x: number[], y: number[]) => {
  const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i]! - mx) * (y[i]! - my); sxx += (x[i]! - mx) ** 2; syy += (y[i]! - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
};

const bereich = (r: number, se: number): [number, number] => {
  const z = Math.atanh(Math.max(-0.999999999, Math.min(0.999999999, r)));
  return [Math.tanh(z - Z975 * se), Math.tanh(z + Z975 * se)];
};

/** Pearson mit p über t (n − 2 Freiheitsgrade) und 95 %-KI über Fisher-z mit 1/√(n − 3) - wie R cor.test (für die Korrelationsmatrix). */
export function pearsonKorrelation(paare: [number, number][]): Rangkorrelation {
  const n = paare.length, r = pearson(paare.map(p => p[0]), paare.map(p => p[1]));
  const t = Math.abs(r) >= 1 ? Infinity : r * Math.sqrt((n - 2) / (1 - r * r));
  const p = Number.isFinite(t) ? 2 * (1 - tVerteilung(Math.abs(t), n - 2)) : 0;
  const [kiLo, kiHi] = n > 3 ? bereich(r, 1 / Math.sqrt(n - 3)) : [NaN, NaN];
  return { r, p, n, kiLo, kiHi };
}

/** Spearman: Pearson der mittleren Ränge; zweiseitiger p-Wert über t mit n−2 Freiheitsgraden. */
export function spearman(paare: [number, number][]): Rangkorrelation {
  const n = paare.length, rx = raenge(paare.map(p => p[0])), ry = raenge(paare.map(p => p[1])), r = pearson(rx, ry);
  const t = Math.abs(r) >= 1 ? Infinity : r * Math.sqrt((n - 2) / (1 - r * r));
  const pT = Number.isFinite(t) ? 2 * (1 - tVerteilung(Math.abs(t), n - 2)) : 0;
  // Ohne Bindungen und bis n = 1289 rechnet R (cor.test) nach AS 89: n ≤ 9 exakt, darüber die Edgeworth-Reihe.
  const ohneBindung = new Set(rx).size === n && new Set(ry).size === n, as89 = ohneBindung && n >= 3 && n <= SPEARMAN_AS89_BIS && Number.isFinite(r);
  let S = 0; for (let i = 0; i < n; i++) S += (rx[i]! - ry[i]!) ** 2;
  const p = as89 ? pSpearmanAS89(S, n) : pT;
  const [kiLo, kiHi] = bereich(r, Math.sqrt((1 + r * r / 2) / (n - 3)));
  return { r, p, n, kiLo, kiHi, exakt: as89 && n <= SPEARMAN_EXAKT_BIS, pNaeherung: pT };
}

/** Kendalls S = (gleichgerichtete − gegenläufige Paare), Paare mit Bindung in x oder y zählen nicht - in O(n log n) statt O(n²) (Knight 1966):
 *  nach x, dann y sortieren; die gegenläufigen Paare sind die Umkehrungen in der y-Folge (Mergesort), die gleichgerichteten folgen aus der Zahl aller Paare
 *  abzüglich der Paare mit Bindung in x, in y und (wieder dazu) in beiden. Bei 100.000 Zeilen 6 s → unter 0,1 s (Abschlusstest A2). */
export function kendallS(paare: [number, number][]): number {
  const n = paare.length;
  if (n < 2) return 0;
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => paare[a]![0] - paare[b]![0] || paare[a]![1] - paare[b]![1]);
  let n1 = 0, n3 = 0;   // Paare mit gleichem x; Paare mit gleichem x und y
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) y[i] = paare[idx[i]!]![1];
  for (let i = 0; i < n;) {
    let j = i; while (j + 1 < n && paare[idx[j + 1]!]![0] === paare[idx[i]!]![0]) j++;
    n1 += (j - i + 1) * (j - i) / 2;
    for (let k = i; k <= j;) { let m = k; while (m + 1 <= j && y[m + 1] === y[k]) m++; n3 += (m - k + 1) * (m - k) / 2; k = m + 1; }
    i = j + 1;
  }
  // Umkehrungen (y[i] > y[j] bei i < j) zählen, dabei y sortieren; gleiche y-Werte zählen nicht.
  let D = 0, quelle = y, ziel = new Float64Array(n);
  for (let breite = 1; breite < n; breite *= 2) {
    for (let von = 0; von < n; von += 2 * breite) {
      const mitte = Math.min(von + breite, n), bis = Math.min(von + 2 * breite, n);
      let a = von, b = mitte, k = von;
      while (a < mitte && b < bis) { if (quelle[a]! <= quelle[b]!) ziel[k++] = quelle[a++]!; else { D += mitte - a; ziel[k++] = quelle[b++]!; } }
      while (a < mitte) ziel[k++] = quelle[a++]!;
      while (b < bis) ziel[k++] = quelle[b++]!;
    }
    [quelle, ziel] = [ziel, quelle];
  }
  // Paare mit Bindung in y (n2) kommen aus den sortierten y-Werten (quelle ist jetzt ganz sortiert).
  let n2 = 0;
  for (let i = 0; i < n;) { let j = i; while (j + 1 < n && quelle[j + 1] === quelle[i]) j++; n2 += (j - i + 1) * (j - i) / 2; i = j + 1; }
  const n0 = n * (n - 1) / 2;
  return (n0 - n1 - n2 + n3 - D) - D;
}

/** Kendall τ_b mit Bindungen; p-Wert aus S/√Var₀ (Normalverteilung, Varianz mit Bindungskorrektur). */
export function kendall(paare: [number, number][]): Rangkorrelation {
  const n = paare.length;
  const S = kendallS(paare);
  const bind = (w: number[]) => { const m = new Map<number, number>(); for (const v of w) m.set(v, (m.get(v) ?? 0) + 1); return [...m.values()].filter(t => t > 1); };
  const tx = bind(paare.map(p => p[0])), ty = bind(paare.map(p => p[1]));
  const sum = (l: number[], f: (t: number) => number) => l.reduce((a, t) => a + f(t), 0);
  const n0 = n * (n - 1) / 2, n1 = sum(tx, t => t * (t - 1) / 2), n2 = sum(ty, t => t * (t - 1) / 2);
  const r = S / Math.sqrt((n0 - n1) * (n0 - n2));
  const v0 = n * (n - 1) * (2 * n + 5), vt = sum(tx, t => t * (t - 1) * (2 * t + 5)), vu = sum(ty, t => t * (t - 1) * (2 * t + 5));
  const v1 = sum(tx, t => t * (t - 1)) * sum(ty, t => t * (t - 1)) / (2 * n * (n - 1));
  const v2 = sum(tx, t => t * (t - 1) * (t - 2)) * sum(ty, t => t * (t - 1) * (t - 2)) / (9 * n * (n - 1) * (n - 2));
  const varianz = (v0 - vt - vu) / 18 + v1 + v2;
  const z = S / Math.sqrt(varianz), pN = 2 * (1 - normal(Math.abs(z)));
  const exakt = tx.length === 0 && ty.length === 0 && n >= 2 && n < EXAKT_UNTER;
  const [kiLo, kiHi] = bereich(r, Math.sqrt(0.437 / (n - 4)));
  return { r, p: exakt ? pKendallExakt((S + n0) / 2, n) : pN, n, kiLo, kiHi, exakt, pNaeherung: pN };
}
