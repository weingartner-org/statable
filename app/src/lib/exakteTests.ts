/**
 * Exakte p-Werte der Rangverfahren bei kleinen Stichproben - dieselben Regeln und Zahlen wie R:
 *   - Mann-Whitney (`wilcox.test`):          exakt bei n₁ < 50 und n₂ < 50 (ohne Bindungen die Verteilung von U, `pwilcox`; mit Bindungen die bedingte Verteilung der Mittelränge)
 *   - Wilcoxon, verbunden (`wilcox.test`):   exakt bei weniger als 50 Differenzen ohne Nullen (ohne Bindungen die Verteilung von V, `psignrank`; mit Bindungen die bedingte Verteilung der Mittelränge).
 *                                            Nullen entfallen vor dem Ranken (Wilcoxon-Verfahren wie SPSS; R 4.6 rankt sie mit, Pratt)
 *   - Kendall τ (`cor.test`):                exakt bei n < 50 und ohne Bindungen (Verteilung der Umkehrungen, `ckendall`)
 *   - Spearman (`cor.test`):                 ohne Bindungen bis n = 1289 über den Algorithmus AS 89 (`prho`): n ≤ 9 alle Permutationen (exakt),
 *                                            ab n = 10 die Edgeworth-Reihe (eine Näherung, aber genauer als t); mit Bindungen und ab n = 1290 die t-Näherung.
 * Die Verteilungen werden einmal durch dynamisches Programmieren ausgezählt (Zahl der Anordnungen je Wert) und zwischengespeichert.
 * Mit Bindungen hängt die Verteilung von den beobachteten Rängen ab (bedingte Verteilung, Fachblatt G9): Mittelränge verdoppelt sind ganze Zahlen, dieselbe dynamische Programmierung
 * zählt die Anordnungen (`verteilungRangsumme`, `verteilungVorzeichen`). Erst ab 50 bleibt die Normalnäherung mit Bindungskorrektur (rangtests.ts).
 * Vergleichswerte: scripts/exakte-erwartet.R, Tests: exakteTests.test.ts.
 */
import { normal } from './verteilung';

/** Unter dieser Gruppengröße (je Gruppe bzw. bei verbundenen Stichproben und Kendall: Zahl der Fälle) rechnet R exakt. */
export const EXAKT_UNTER = 50;
/** Spearman: bis zu diesem n alle Permutationen (exakt), darüber bis SPEARMAN_AS89 die Edgeworth-Reihe. */
export const SPEARMAN_EXAKT_BIS = 9;
export const SPEARMAN_AS89_BIS = 1289;

export type Seite = 'zwei' | 'gross' | 'klein';

/** Verteilung auf 0, 1, …, max mit Wahrscheinlichkeiten; `kl(x)` = P(X ≤ x), `gr(x)` = P(X ≥ x), `zwei(x, mitte)` wie R (`2·min(…)`, höchstens 1). */
export class Zaehlverteilung {
  private readonly kum: Float64Array;
  private readonly ober: Float64Array;   // ober[k] = P(X ≥ k), von hinten summiert (keine Auslöschung in kleinen Schwänzen)
  constructor(readonly pmf: Float64Array) {
    const n = pmf.length; this.kum = new Float64Array(n); this.ober = new Float64Array(n);
    let s = 0; for (let i = 0; i < n; i++) { s += pmf[i]!; this.kum[i] = s; }
    let t = 0; for (let i = n - 1; i >= 0; i--) { t += pmf[i]!; this.ober[i] = t; }
    if (s > 0) for (let i = 0; i < n; i++) { this.kum[i] = Math.min(1, this.kum[i]! / s); this.ober[i] = Math.min(1, this.ober[i]! / s); }
  }
  get max() { return this.pmf.length - 1; }
  kl(x: number): number { const k = Math.floor(x + 1e-7); return k < 0 ? 0 : k >= this.max ? 1 : this.kum[k]!; }
  gr(x: number): number { const k = Math.ceil(x - 1e-7); return k <= 0 ? 1 : k > this.max ? 0 : this.ober[k]!; }
  p(x: number, seite: Seite): number {
    if (seite === 'klein') return this.kl(x);
    if (seite === 'gross') return this.gr(x);
    return Math.min(1, 2 * Math.min(this.kl(x), this.gr(x)));
  }
  /** Kleinstes q mit P(X ≤ q) ≥ p (wie R `qwilcox`/`qsignrank`, mit derselben Toleranz). */
  q(p: number): number { const z = p * (1 - 64 * Number.EPSILON); for (let i = 0; i <= this.max; i++) if (this.kum[i]! >= z) return i; return this.max; }
}

const zwischen = new Map<string, Zaehlverteilung>();
function gemerkt(schluessel: string, bau: () => Float64Array): Zaehlverteilung {
  let v = zwischen.get(schluessel);
  if (!v) { v = new Zaehlverteilung(bau()); zwischen.set(schluessel, v); if (zwischen.size > 60) zwischen.delete(zwischen.keys().next().value!); }
  return v;
}

/** Mann-Whitney: Verteilung von U (0 … n₁·n₂) bei lauter verschiedenen Werten. Zahl der m-Teilmengen von {1 … N} mit Rangsumme s, U = s − m(m+1)/2. */
export function verteilungU(n1: number, n2: number): Zaehlverteilung {
  const m = Math.min(n1, n2), N = n1 + n2;   // U ist symmetrisch in (n₁, n₂)
  return gemerkt(`u${m},${N - m}`, () => {
    const maxU = m * (N - m), smax = maxU + m * (m + 1) / 2;
    const c: Float64Array[] = Array.from({ length: m + 1 }, () => new Float64Array(smax + 1)); c[0]![0] = 1;
    for (let i = 1; i <= N; i++) for (let j = Math.min(i, m); j >= 1; j--) { const von = c[j - 1]!, nach = c[j]!; for (let s = smax; s >= i; s--) nach[s]! += von[s - i]!; }
    const u = new Float64Array(maxU + 1), off = m * (m + 1) / 2;
    for (let k = 0; k <= maxU; k++) u[k] = c[m]![k + off]!;
    return u;
  });
}

/** Wilcoxon, verbunden: Verteilung von V (0 … n(n+1)/2): Zahl der Teilmengen von {1 … n} mit Summe v. */
export function verteilungV(n: number): Zaehlverteilung {
  return gemerkt(`v${n}`, () => {
    const max = n * (n + 1) / 2, c = new Float64Array(max + 1); c[0] = 1;
    for (let i = 1; i <= n; i++) for (let s = max; s >= i; s--) c[s]! += c[s - i]!;
    return c;
  });
}

/** Kendall: Verteilung der Zahl der Umkehrungen (= der diskordanten bzw. konkordanten Paare) bei n verschiedenen Werten: 0 … n(n−1)/2. */
export function verteilungKendall(n: number): Zaehlverteilung {
  return gemerkt(`k${n}`, () => {
    const max = n * (n - 1) / 2; let c = new Float64Array(max + 1); c[0] = 1;
    for (let i = 2; i <= n; i++) {   // Faktor (1 + x + … + x^(i−1))
      const neu = new Float64Array(max + 1);
      for (let s = 0; s <= max; s++) { let a = 0; for (let t = 0; t < i && t <= s; t++) a += c[s - t]!; neu[s] = a; }
      c = neu;
    }
    return c;
  });
}

/** Spearman, n ≤ 9: Verteilung von S = Σ(Rang x − Rang y)² über alle n! Permutationen (S ist immer gerade). Index = S. */
export function verteilungSpearman(n: number): Zaehlverteilung {
  return gemerkt(`s${n}`, () => {
    const max = n * (n * n - 1) / 3, h = new Float64Array(max + 1), a = Array.from({ length: n }, (_, i) => i + 1);
    const rec = (k: number, s: number) => {
      if (k === n) { h[s]!++; return; }
      for (let i = k; i < n; i++) { [a[k], a[i]] = [a[i]!, a[k]!]; rec(k + 1, s + (a[k]! - (k + 1)) ** 2); [a[k], a[i]] = [a[i]!, a[k]!]; }
    };
    rec(0, 0);
    return h;
  });
}

/* ---------------------------------------------------------------- bedingte Verteilung bei Bindungen */
/** Bedingte exakte Verteilung der Rangsumme (Fachblatt G9): Die Ränge (bei Bindungen Mittelränge) sind fest, nur die Zuordnung zu den Gruppen wird ausgezählt
 *  (Permutationsverteilung, Streitberg & Röhmel 1986). Mittelränge verdoppelt sind ganze Zahlen: `punkte2` = 2 · Rang. Index der Verteilung = verdoppelte Rangsumme.
 *  Gezählt wird für die kleinere Gruppe (m Plätze); ist `m` die größere, wird die Verteilung gespiegelt. Zahl der Anordnungen als Gleitkommazahl (bis C(98, 49) ≈ 2,5·10²⁸). */
export function verteilungRangsumme(punkte2: number[], m: number): Zaehlverteilung {
  const N = punkte2.length, k = Math.min(m, N - m), p = [...punkte2].sort((a, b) => a - b);
  const pre = new Array<number>(N + 1).fill(0); for (let i = 0; i < N; i++) pre[i + 1] = pre[i]! + p[i]!;
  const gesamt = pre[N]!;
  const c: Float64Array[] = Array.from({ length: k + 1 }, () => new Float64Array(gesamt + 1)); c[0]![0] = 1;
  for (let i = 1; i <= N; i++) {
    const v = p[i - 1]!, jHoch = Math.min(i, k), jTief = Math.max(1, k - (N - i));
    for (let j = jHoch; j >= jTief; j--) {
      const von = c[j - 1]!, nach = c[j]!, ab = pre[j - 1]! + v;   // kleinste mögliche Summe mit j Werten aus den ersten i
      for (let s = Math.min(pre[i]!, j * v); s >= ab; s--) nach[s]! += von[s - v]!;
    }
  }
  const klein = c[k]!;
  if (k === m) return new Zaehlverteilung(klein);
  const gespiegelt = new Float64Array(gesamt + 1); for (let s = 0; s <= gesamt; s++) gespiegelt[s] = klein[gesamt - s]!;
  return new Zaehlverteilung(gespiegelt);
}

/** Bedingte exakte Verteilung von V (Summe der Ränge der positiven Differenzen) bei Bindungen: jede Vorzeichenbelegung der festen Ränge (verdoppelt, ganzzahlig) zählt gleich.
 *  Index = verdoppelte Summe. */
export function verteilungVorzeichen(punkte2: number[]): Zaehlverteilung {
  const gesamt = punkte2.reduce((a, b) => a + b, 0), c = new Float64Array(gesamt + 1); c[0] = 1;
  let hoch = 0;
  for (const v of punkte2) { hoch += v; for (let s = hoch; s >= v; s--) c[s]! += c[s - v]!; }
  return new Zaehlverteilung(c);
}

/** Verdoppelte Ränge als ganze Zahlen (Mittelränge sind Vielfache von ½). */
export const verdoppelt = (rang: number[]): number[] => rang.map(r => Math.round(2 * r));

/** Wahrscheinlichkeit der äußersten Rangsumme (alle m höchsten bzw. niedrigsten Ränge in der Gruppe), in geschlossener Form: C(t, r) / C(N, m) mit t gleichen Werten an der Grenze. */
export function pAeusserste(punkte2: number[], m: number, oben: boolean): number {
  const N = punkte2.length, p = [...punkte2].sort((a, b) => (oben ? b - a : a - b)), grenze = p[m - 1]!;
  const t = p.filter(x => x === grenze).length, r = p.slice(0, m).filter(x => x === grenze).length;
  const lnC = (n: number, k: number) => { let a = 0; for (let i = 1; i <= Math.min(k, n - k); i++) a += Math.log((n - i + 1) / i); return a; };
  return Math.exp(lnC(t, r) - lnC(N, m));
}

/* ---------------------------------------------------------------- R-Regeln */
/** Mann-Whitney: p aus U der Gruppe A. `gross` = A liegt höher (alternative = "greater"), `klein` = A liegt tiefer. */
export const pMannWhitneyExakt = (u: number, n1: number, n2: number, seite: Seite = 'zwei') => verteilungU(n1, n2).p(u, seite);
/** Wilcoxon: p aus V = Rangsumme der positiven Differenzen. */
export const pWilcoxonExakt = (v: number, n: number, seite: Seite = 'zwei') => verteilungV(n).p(v, seite);
/** Kendall: p aus der Zahl der konkordanten Paare C (= (S + n(n−1)/2) / 2). */
export const pKendallExakt = (konkordant: number, n: number, seite: Seite = 'zwei') => verteilungKendall(n).p(konkordant, seite);

/** Hodges-Lehmann-KI (95 %) exakt wie R ≥ 4.4 (`.wilcox_test_two_cint_exact` / `…_one_…`): Indizes der Grenzen in der sortierten Liste der Differenzen bzw. Walsh-Mittel
 *  (1-basiert) und das erreichte Niveau (mindestens ,95). `unten` = 0: bei so wenigen Werten gibt es kein 95-%-KI, R gibt (−∞, ∞) mit Niveau 1. */
export interface HlIndex { unten: number; oben: number; niveau: number }
const TOLER = 10 * Number.EPSILON;
function hlIndex(v: Zaehlverteilung, anzahl: number, alpha: number): HlIndex {
  let qu = v.q(alpha / 2); if (v.kl(qu) <= alpha / 2 + TOLER) qu++;
  if (qu === 0 || qu > anzahl) return { unten: 0, oben: 0, niveau: 1 };
  return { unten: qu, oben: anzahl - qu + 1, niveau: 1 - Math.min(1, 2 * v.kl(qu - 1)) };
}
export const hlIndexZwei = (n1: number, n2: number, alpha = 0.05): HlIndex => hlIndex(verteilungU(n1, n2), n1 * n2, alpha);
export const hlIndexEins = (n: number, alpha = 0.05): HlIndex => hlIndex(verteilungV(n), n * (n + 1) / 2, alpha);

/* ---------------------------------------------------------------- Spearman: AS 89 wie R (prho.c) */
/** P(S ≥ is) bzw. (lower) P(S < is) nach AS 89: n ≤ 9 exakt, sonst Edgeworth-Reihe. Gibt es nur für n ≥ 2. */
function prho(is: number, n: number, lower: boolean): number {
  let pv = lower ? 0 : 1;
  if (n <= 1 || is <= 0) return pv;
  const n3 = n * (n * n - 1) / 3;
  if (is > n3) return 1 - pv;
  if (n <= SPEARMAN_EXAKT_BIS) { const oben = verteilungSpearman(n).gr(is); return lower ? 1 - oben : oben; }
  const b = 1 / n, x = (6 * (is - 1) * b / (n * n - 1) - 1) * Math.sqrt(1 / b - 1);
  let y = x * x;
  const u = x * b * (0.2274 + b * (0.2531 + 0.1745 * b) + y * (-0.0758 + b * (0.1033 + 0.3932 * b) - y * b * (0.0879 + 0.0151 * b - y * (0.0072 - 0.0831 * b + y * b * (0.0131 - 4.6e-4 * y)))));
  y = u / Math.exp(y / 2);
  pv = (lower ? -y : y) + (lower ? normal(x) : normal(-x));
  return Math.min(1, Math.max(0, pv));
}
/** Spearman-p wie R `cor.test(method = "spearman")` ohne Bindungen und n ≤ 1289; `S` = Σ(Rang x − Rang y)². */
export function pSpearmanAS89(S: number, n: number, seite: Seite = 'zwei'): number {
  const q = S, mitte = (n * n * n - n) / 6;
  const oben = (a: number) => prho(Math.round(a), n, false), unten = (a: number) => prho(Math.round(a) + 2, n, true);
  if (seite === 'gross') return unten(q);
  if (seite === 'klein') return oben(q);
  return Math.min(1, 2 * (q > mitte ? oben(q) : unten(q)));
}
