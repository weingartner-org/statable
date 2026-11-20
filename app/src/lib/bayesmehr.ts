/**
 * Bayes-Faktoren für die zweifaktorielle Varianzanalyse (S-H, 23.10.2026): alle Modelle aus den zwei Haupteffekten und der Wechselwirkung gegen das Nullmodell,
 * JZS-Prior nach Rouder, Morey, Speckman und Province (2012) wie R `BayesFactor::anovaBF(whichModels = "all")` mit rscaleFixed = „medium“ (0,5).
 *   Jeder Effekt j hat seine eigene Varianz g_j ~ Inverse-Gamma(½, r²/2). Mit Z = [Z_A Z_B Z_AB] (orthonormale Helmert-Kontraste, Wechselwirkung = Produkte, Spalten um die Konstante bereinigt), Q = Z'Z,
 *   b = Z'(y − ȳ), G = diag(g_j) und M = I + G^½ Q G^½:   BF(g) = |M|^(−½) · (1 − (G^½b)'M⁻¹(G^½b) / SST)^(−(N − 1)/2);  BF₁₀ = ∫ BF(g) Π p(g_j) dg_j (Gauß-Legendre über ln g_j, tensorweise).
 *   Modelle mit einem Effekt sind eindimensional (genau); mit zwei und drei Effekten dreidimensional (ln g von −20 bis 14, 8 Knoten je Teilstück der Breite 3).
 * Sollwerte: R `BayesFactor::anovaBF` (500 000 Ziehungen; die Modelle mit mehreren Effekten sind dort Monte-Carlo-Schätzungen mit 0,1 bis 1 % Fehler), siehe bayesmehr.test.ts.
 * ⚠ Von der Fachperson abzunehmen: Prior-Skala 0,5 für alle Effekte, die Einordnung der Wechselwirkung (Vergleich von A + B + A:B mit A + B), nicht-hierarchische Modelle (A:B allein).
 */
import { lnGamma } from './verteilung';
export interface MehrModell { name: string; effekte: ('A' | 'B' | 'AB')[]; logBF10: number; bf10: number }
export interface MehrBayes { n: number; modelle: MehrModell[]; wechsel: number; a: number; b: number }
export type MehrFehler = { fehler: 'zu-wenig' | 'leer' | 'stufen' };

const R_EFFEKT = 0.5;
/** Orthonormale Helmert-Kontraste (K × (K − 1)), Spalten Summe null. */
const helmert = (K: number) => Array.from({ length: K }, (_, i) => Array.from({ length: K - 1 }, (_, j) => { const f = Math.sqrt((j + 1) * (j + 2)); return i <= j ? 1 / f : i === j + 1 ? -(j + 1) / f : 0; }));

function gl(n: number): { x: number[]; w: number[] } {
  const x: number[] = [], w: number[] = [];
  for (let i = 0; i < n; i++) {
    let z = Math.cos(Math.PI * (i + 0.75) / (n + 0.5)), pp = 1;
    for (let it = 0; it < 100; it++) { let p1 = 1, p2 = 0; for (let j = 0; j < n; j++) { const p3 = p2; p2 = p1; p1 = ((2 * j + 1) * z * p2 - j * p3) / (j + 1); } pp = n * (z * p1 - p2) / (z * z - 1); const z1 = z; z = z1 - p1 / pp; if (Math.abs(z - z1) < 1e-15) break; }
    x.push(z); w.push(2 / ((1 - z * z) * pp * pp));
  }
  return { x, w };
}
const G8 = gl(8);
/** Knoten und logarithmierte Gewichte über ln g ∈ [lo, hi] in Teilstücken der Breite `b`. */
function knoten(lo: number, hi: number, b: number): { u: number[]; lw: number[] } {
  const teile = Math.ceil((hi - lo) / b), h = (hi - lo) / teile, u: number[] = [], lw: number[] = [];
  for (let k = 0; k < teile; k++) { const m = lo + (k + 0.5) * h; for (let i = 0; i < G8.x.length; i++) { u.push(m + G8.x[i]! * h / 2); lw.push(Math.log(G8.w[i]! * h / 2)); } }
  return { u, lw };
}

/** Cholesky von M (symmetrisch positiv definit): untere Matrix oder null. */
function chol(M: number[][]): number[][] | null {
  const p = M.length, L = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  for (let i = 0; i < p; i++) for (let j = 0; j <= i; j++) {
    let s = M[i]![j]!; for (let k = 0; k < j; k++) s -= L[i]![k]! * L[j]![k]!;
    if (i === j) { if (!(s > 0)) return null; L[i]![i] = Math.sqrt(s); } else L[i]![j] = s / L[j]![j]!;
  }
  return L;
}

export function bayesMehrfaktor(y: number[], a: number[], b: number[], r = R_EFFEKT): MehrBayes | MehrFehler {
  const N = y.length;
  if (N < 6 || a.length !== N || b.length !== N) return { fehler: 'zu-wenig' };
  const KA = Math.max(...a) + 1, KB = Math.max(...b) + 1;
  if (KA < 2 || KB < 2 || new Set(a).size !== KA || new Set(b).size !== KB) return { fehler: 'stufen' };
  const zellen = new Set(a.map((v, i) => `${v}/${b[i]}`));
  if (zellen.size < KA * KB) return { fehler: 'leer' };
  const CA = helmert(KA), CB = helmert(KB);
  const spalten: Record<'A' | 'B' | 'AB', number[][]> = {
    A: CA[0]!.map((_, j) => a.map(v => CA[v]![j]!)), B: CB[0]!.map((_, j) => b.map(v => CB[v]![j]!)),
    AB: CA[0]!.flatMap((_, i) => CB[0]!.map((_, j) => a.map((v, t) => CA[v]![i]! * CB[b[t]!]![j]!)))
  };
  const zentriere = (c: number[]) => { const m = c.reduce((s, v) => s + v, 0) / N; return c.map(v => v - m); };
  const ym = y.reduce((s, v) => s + v, 0) / N, yc = y.map(v => v - ym), sst = yc.reduce((s, v) => s + v * v, 0);
  if (!(sst > 0)) return { fehler: 'zu-wenig' };
  const Z = { A: spalten.A.map(zentriere), B: spalten.B.map(zentriere), AB: spalten.AB.map(zentriere) };
  const beta = (r * r) / 2, lKonst = 0.5 * Math.log(beta) - lnGamma(0.5);
  const dot = (p: number[], q: number[]) => p.reduce((s, v, i) => s + v * q[i]!, 0);
  const logBF = (eff: ('A' | 'B' | 'AB')[]): number => {
    const cols = eff.flatMap(e => Z[e].map(c => ({ c, e })));
    const p = cols.length, Q = cols.map(u => cols.map(v => dot(u.c, v.c))), bv = cols.map(u => dot(u.c, yc));
    const idx = eff.map(e => cols.map(c => c.e === e));
    const kn = knoten(-20, 14, eff.length === 1 ? 1 : 3);
    const J = eff.length, lw = (i: number) => kn.lw[i]!;
    const terme: number[] = [];
    const cur = new Array<number>(J).fill(0);
    const wert = (): number => {
      const g = cols.map((_, k) => Math.exp(kn.u[cur[idx.findIndex(m => m[k])!]!]!));
      const sg = g.map(Math.sqrt), M = Q.map((row, i) => row.map((v, j) => (i === j ? 1 : 0) + sg[i]! * v * sg[j]!)), L = chol(M);
      if (!L) return -Infinity;
      const bt = bv.map((v, i) => sg[i]! * v), zz: number[] = [];
      for (let i = 0; i < p; i++) { let s = bt[i]!; for (let k = 0; k < i; k++) s -= L[i]![k]! * zz[k]!; zz.push(s / L[i]![i]!); }
      const q = zz.reduce((s, v) => s + v * v, 0), inner = 1 - q / sst;
      if (!(inner > 0)) return -Infinity;
      let logdet = 0; for (let i = 0; i < p; i++) logdet += 2 * Math.log(L[i]![i]!);
      return -0.5 * logdet - (N - 1) / 2 * Math.log(inner);
    };
    const prior = (k: number) => lKonst - 1.5 * kn.u[k]! - beta / Math.exp(kn.u[k]!) + kn.u[k]!;
    const rekursiv = (d: number, acc: number) => {
      if (d === J) { const v = wert(); if (Number.isFinite(v)) terme.push(v + acc); return; }
      for (let k = 0; k < kn.u.length; k++) { cur[d] = k; rekursiv(d + 1, acc + lw(k) + prior(k)); }
    };
    rekursiv(0, 0);
    let mx = -Infinity; for (const v of terme) if (v > mx) mx = v;
    return mx + Math.log(terme.reduce((s, v) => s + Math.exp(v - mx), 0));
  };
  const modelle: { name: string; effekte: ('A' | 'B' | 'AB')[] }[] = [
    { name: 'A', effekte: ['A'] }, { name: 'B', effekte: ['B'] }, { name: 'A:B', effekte: ['AB'] }, { name: 'A + B', effekte: ['A', 'B'] },
    { name: 'A + A:B', effekte: ['A', 'AB'] }, { name: 'B + A:B', effekte: ['B', 'AB'] }, { name: 'A + B + A:B', effekte: ['A', 'B', 'AB'] }
  ];
  const erg = modelle.map(m => { const l = logBF(m.effekte); return { ...m, logBF10: l, bf10: Math.exp(l) }; });
  const l = (n: string) => erg.find(m => m.name === n)!.logBF10;
  // Vergleiche mit dem jeweils nächsten Modell ohne den Effekt: Wechselwirkung = (A + B + A:B) gegen (A + B); A = (A + B) gegen B; B = (A + B) gegen A
  return { n: N, modelle: erg, wechsel: Math.exp(l('A + B + A:B') - l('A + B')), a: Math.exp(l('A + B') - l('B')), b: Math.exp(l('A + B') - l('A')) };
}
