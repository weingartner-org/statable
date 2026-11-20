/**
 * Korrespondenzanalyse einer Kreuztabelle (Warteliste, 23.10.2026). Eigener Code, im Browser.
 *   S = D_r^(−1/2) (P − r cᵀ) D_c^(−1/2), P = N / n; Singulärwertzerlegung S = U Σ Vᵀ (einseitiges Jacobi-Verfahren).
 *   Hauptkoordinaten: Zeilen D_r^(−1/2) U Σ, Spalten D_c^(−1/2) V Σ (symmetrische Karte); Trägheit je Dimension = σ², gesamt = χ² / n.
 * Sollwerte: R `MASS::corresp` (Singulärwerte `cor`, Werte `rscore`·cor und `cscore`·cor bis auf das Vorzeichen), siehe korrespondenz.test.ts.
 * ⚠ Von der Fachperson abzunehmen: Hinweise zur Lesart (Abstände zwischen Zeilen und Spalten sind nicht direkt vergleichbar) und die Mindestgröße.
 */

export interface KorrespondenzErgebnis {
  n: number; dimensionen: number;
  /** Singulärwerte, Trägheit (σ²) und Anteil je Dimension */
  singulaer: number[]; traegheit: number[]; anteil: number[];
  gesamt: number; chi2: number;
  zeilen: { masse: number; koord: number[] }[]; spalten: { masse: number; koord: number[] }[];
}
export type KorrespondenzFehler = { fehler: 'zu-klein' | 'leere-zeile' | 'leere-spalte' | 'werte' };

/** Einseitiges Jacobi-Verfahren (Hestenes): A (m × n, m ≥ n nicht nötig) = U Σ Vᵀ; gibt Σ absteigend sortiert, U-Spalten und V-Spalten. */
function svd(A: number[][]): { s: number[]; U: number[][]; V: number[][] } {
  const m = A.length, n = A[0]!.length;
  const W = A.map(r => r.slice()), V: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 60; sweep++) {
    let aus = 0;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      let a = 0, b = 0, c = 0;
      for (let i = 0; i < m; i++) { a += W[i]![p]! * W[i]![p]!; b += W[i]![q]! * W[i]![q]!; c += W[i]![p]! * W[i]![q]!; }
      if (Math.abs(c) < 1e-15 * Math.sqrt(a * b) || c === 0) continue;
      aus = Math.max(aus, Math.abs(c) / Math.sqrt(a * b));
      const zeta = (b - a) / (2 * c), t = Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta)), cs = 1 / Math.sqrt(1 + t * t), sn = cs * t;
      for (let i = 0; i < m; i++) { const x = W[i]![p]!, y = W[i]![q]!; W[i]![p] = cs * x - sn * y; W[i]![q] = sn * x + cs * y; }
      for (let i = 0; i < n; i++) { const x = V[i]![p]!, y = V[i]![q]!; V[i]![p] = cs * x - sn * y; V[i]![q] = sn * x + cs * y; }
    }
    if (aus < 1e-14) break;
  }
  const norm = Array.from({ length: n }, (_, j) => Math.sqrt(W.reduce((a, r) => a + r[j]! * r[j]!, 0)));
  const ord = norm.map((_, j) => j).sort((x, y) => norm[y]! - norm[x]!);
  return { s: ord.map(j => norm[j]!), U: W.map(r => ord.map(j => (norm[j]! > 1e-300 ? r[j]! / norm[j]! : 0))), V: V.map(r => ord.map(j => r[j]!)) };
}

/** `tab`: Häufigkeiten, Zeilen × Spalten (mindestens 2 × 2, keine leeren Zeilen oder Spalten, keine negativen Werte). */
export function korrespondenz(tab: number[][], nDim = 2): KorrespondenzErgebnis | KorrespondenzFehler {
  const R = tab.length, C = tab[0]?.length ?? 0;
  if (R < 2 || C < 2) return { fehler: 'zu-klein' };
  if (tab.some(r => r.length !== C || r.some(v => !Number.isFinite(v) || v < 0))) return { fehler: 'werte' };
  const n = tab.reduce((a, r) => a + r.reduce((b, v) => b + v, 0), 0);
  if (n <= 0) return { fehler: 'leere-zeile' };
  const rs = tab.map(r => r.reduce((a, v) => a + v, 0) / n), cs = Array.from({ length: C }, (_, j) => tab.reduce((a, r) => a + r[j]!, 0) / n);
  if (rs.some(v => v === 0)) return { fehler: 'leere-zeile' };
  if (cs.some(v => v === 0)) return { fehler: 'leere-spalte' };
  const S = tab.map((r, i) => r.map((v, j) => (v / n - rs[i]! * cs[j]!) / Math.sqrt(rs[i]! * cs[j]!)));
  const { s, U, V } = svd(S), K = Math.min(R, C) - 1;
  const sing = s.slice(0, K), trae = sing.map(v => v * v), gesamt = trae.reduce((a, v) => a + v, 0);
  const d = Math.min(nDim, K);
  return {
    n, dimensionen: K, singulaer: sing, traegheit: trae, anteil: trae.map(v => (gesamt > 0 ? v / gesamt : 0)), gesamt, chi2: gesamt * n,
    zeilen: rs.map((m, i) => ({ masse: m, koord: Array.from({ length: d }, (_, k) => (U[i]![k]! * sing[k]!) / Math.sqrt(m)) })),
    spalten: cs.map((m, j) => ({ masse: m, koord: Array.from({ length: d }, (_, k) => (V[j]![k]! * sing[k]!) / Math.sqrt(m)) }))
  };
}
