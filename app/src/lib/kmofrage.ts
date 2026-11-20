/**
 * KMO je Frage (MSA) und Determinante der Korrelationsmatrix (Field-Stufe 1, 05.11.2026). Reine Rechnung aus den Zeilen der gewählten Fragen (listenweise wie PSPP FACTOR).
 *   Korrelationsmatrix R; Anti-Image-Korrelation a_ij = −r^ij / √(r^ii · r^jj) mit r^ij aus R⁻¹ (das sind die negativen partiellen Korrelationen);
 *   MSA_i = Σ_{j≠i} r_ij² / (Σ_{j≠i} r_ij² + Σ_{j≠i} a_ij²) - die Diagonale der Anti-Image-Korrelationsmatrix in SPSS;
 *   KMO gesamt = Σ_{i≠j} r_ij² / (Σ_{i≠j} r_ij² + Σ_{i≠j} a_ij²);  Determinante det(R) (nahe 0: sehr hohe Zusammenhänge, Grenze 0,00001 nach Field).
 * Sollwerte: R `psych::KMO` und `det(cor())` (docs/fachblaetter/sollwerte/field-stufe1.json); Kontrolle: KMO gesamt gegen PSPP FACTOR /PRINT=KMO (kmofrage.test.ts).
 */
import { invers } from './robustse';

export interface KmoFrage { n: number; kmo: number; msa: number[]; determinante: number; antiImage: number[][]; kor: number[][] }
export type KmoFehler = { fehler: 'zu-wenig-faelle' | 'singulaer' | 'konstant' };

function determinante(a: number[][]): number {
  const n = a.length, m = a.map(r => [...r]); let det = 1;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r]![c]!) > Math.abs(m[p]![c]!)) p = r;
    if (m[p]![c] === 0) return 0;
    if (p !== c) { [m[c], m[p]] = [m[p]!, m[c]!]; det = -det; }
    det *= m[c]![c]!;
    for (let r = c + 1; r < n; r++) { const f = m[r]![c]! / m[c]![c]!; for (let j = c; j < n; j++) m[r]![j]! -= f * m[c]![j]!; }
  }
  return det;
}

/** `zeilen`: Fälle × Fragen, alle Werte vorhanden (listenweise). */
export function kmoJeFrage(zeilen: number[][]): KmoFrage | KmoFehler {
  const n = zeilen.length, p = zeilen[0]?.length ?? 0;
  if (p < 3 || n < p + 1) return { fehler: 'zu-wenig-faelle' };
  const mw = Array.from({ length: p }, (_, j) => zeilen.reduce((a, r) => a + r[j]!, 0) / n);
  const kov = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => zeilen.reduce((a, r) => a + (r[i]! - mw[i]!) * (r[j]! - mw[j]!), 0)));
  if (kov.some((r, i) => !(r[i]! > 0))) return { fehler: 'konstant' };
  const kor = kov.map((r, i) => r.map((v, j) => v / Math.sqrt(kov[i]![i]! * kov[j]![j]!)));
  const inv = invers(kor);
  if (!inv) return { fehler: 'singulaer' };
  const anti = inv.map((r, i) => r.map((v, j) => (i === j ? 0 : -v / Math.sqrt(inv[i]![i]! * inv[j]![j]!))));
  let sr = 0, sa = 0; const msa: number[] = [];
  for (let i = 0; i < p; i++) {
    let ri = 0, ai = 0;
    for (let j = 0; j < p; j++) if (j !== i) { ri += kor[i]![j]! ** 2; ai += anti[i]![j]! ** 2; }
    msa.push(ri / (ri + ai)); sr += ri; sa += ai;
  }
  const antiImage = anti.map((r, i) => r.map((v, j) => (i === j ? msa[i]! : v)));
  return { n, kmo: sr / (sr + sa), msa, determinante: determinante(kor), antiImage, kor };
}
