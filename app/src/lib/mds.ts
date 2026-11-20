/**
 * Klassische mehrdimensionale Skalierung (Torgerson, 23.10.2026). Eigener Code, im Browser.
 *   Gegeben Abstände D (symmetrisch, Diagonale 0): B = −½ J D² J mit J = I − 11ᵀ/n; Eigenzerlegung (Jacobi), Koordinaten = Eigenvektoren · √Eigenwert der größten positiven Eigenwerte.
 *   Anpassungsgüte (wie R `cmdscale(…, eig = TRUE)$GOF`): GOF1 = Σ(k größte λ) / Σ|λ|, GOF2 = Σ(k größte λ) / Σ max(λ, 0).
 *   Aus Daten: Abstand zwischen zwei Spalten = √(2 (1 − r)) (Pearson-Korrelation r), so liegen stark zusammenhängende Fragen nahe beieinander.
 * Sollwerte: R `cmdscale`, siehe mds.test.ts.
 * ⚠ Von der Fachperson abzunehmen: Abstandsmaß √(2(1−r)) für Fragen, Lesehinweis (nur Lage der Punkte zueinander zählt; Achsen und Drehung sind beliebig).
 */

export interface MdsErgebnis { koord: number[][]; eigenwerte: number[]; gof1: number; gof2: number; dimensionen: number }
export type MdsFehler = { fehler: 'zu-wenig-punkte' | 'abstaende' };

/** Eigenzerlegung einer symmetrischen Matrix (zyklisches Jacobi-Verfahren): Eigenwerte absteigend, Eigenvektoren als Spalten. */
export function eigenSymmetrisch(M: number[][]): { werte: number[]; vek: number[][] } {
  const n = M.length, A = M.map(r => r.slice()), V: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let aus = 0;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) aus += A[p]![q]! * A[p]![q]!;
    if (aus < 1e-24) break;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      const apq = A[p]![q]!; if (Math.abs(apq) < 1e-300) continue;
      const theta = (A[q]![q]! - A[p]![p]!) / (2 * apq), t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(1 + theta * theta)), c = 1 / Math.sqrt(1 + t * t), s = t * c;
      for (let k = 0; k < n; k++) { const akp = A[k]![p]!, akq = A[k]![q]!; A[k]![p] = c * akp - s * akq; A[k]![q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = A[p]![k]!, aqk = A[q]![k]!; A[p]![k] = c * apk - s * aqk; A[q]![k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k]![p]!, vkq = V[k]![q]!; V[k]![p] = c * vkp - s * vkq; V[k]![q] = s * vkp + c * vkq; }
    }
  }
  const ord = A.map((_, i) => i).sort((a, b) => A[b]![b]! - A[a]![a]!);
  return { werte: ord.map(i => A[i]![i]!), vek: V.map(r => ord.map(j => r[j]!)) };
}

/** Klassische MDS in `k` Dimensionen aus einer Abstandsmatrix. */
export function mds(D: number[][], k = 2): MdsErgebnis | MdsFehler {
  const n = D.length;
  if (n < 3) return { fehler: 'zu-wenig-punkte' };
  if (D.some((r, i) => r.length !== n || r.some((v, j) => !Number.isFinite(v) || v < 0 || Math.abs(v - D[j]![i]!) > 1e-9) || r[i] !== 0)) return { fehler: 'abstaende' };
  const D2 = D.map(r => r.map(v => v * v)), rm = D2.map(r => r.reduce((a, v) => a + v, 0) / n), gm = rm.reduce((a, v) => a + v, 0) / n;
  const B = D2.map((r, i) => r.map((v, j) => -0.5 * (v - rm[i]! - rm[j]! + gm)));
  const { werte, vek } = eigenSymmetrisch(B), kk = Math.min(k, n - 1);
  if (!werte.some(v => v > 1e-12)) return { fehler: 'abstaende' };
  const pos = werte.map(v => Math.max(v, 0)), top = werte.slice(0, kk).reduce((a, v) => a + Math.max(v, 0), 0);
  return {
    koord: vek.map(r => Array.from({ length: kk }, (_, d) => r[d]! * Math.sqrt(pos[d]!))), eigenwerte: werte, dimensionen: kk,
    gof1: top / werte.reduce((a, v) => a + Math.abs(v), 0), gof2: top / pos.reduce((a, v) => a + v, 0)
  };
}

/** Abstände √(2 (1 − r)) zwischen den Spalten von `x` (Zeilen = Personen, vollständig). */
export function abstandAusKorrelation(x: number[][]): number[][] {
  const n = x.length, p = x[0]?.length ?? 0, m = Array.from({ length: p }, (_, j) => x.reduce((a, r) => a + r[j]!, 0) / n);
  const sd = m.map((mj, j) => Math.sqrt(x.reduce((a, r) => a + (r[j]! - mj) ** 2, 0)));
  const D: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  for (let a = 0; a < p; a++) for (let b = a + 1; b < p; b++) {
    const r = sd[a]! === 0 || sd[b]! === 0 ? 0 : x.reduce((s, row) => s + (row[a]! - m[a]!) * (row[b]! - m[b]!), 0) / (sd[a]! * sd[b]!);
    D[a]![b] = D[b]![a] = Math.sqrt(Math.max(0, 2 * (1 - r)));
  }
  return D;
}
