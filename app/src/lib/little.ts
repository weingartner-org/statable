/**
 * Little-MCAR-Test (S-H, 22.10.2026): Fehlen die Werte ohne erkennbares Muster (Missing Completely At Random)? Reines JavaScript, kein R.
 * Rechnung nach Little (1988): EM-Schätzung von Mittelwerten und Kovarianzmatrix der multivariaten Normalverteilung aus allen Fällen (auch mit Lücken), dann
 *   d² = Σ_j n_j (ȳ_j − μ_j)' Σ_j⁻¹ (ȳ_j − μ_j)  über die Fehlend-Muster j (nur die beobachteten Spalten), df = Σ_j k_j − p.  Unter MCAR ist d² näherungsweise χ²-verteilt.
 * Sollwerte: R `naniar::mcar_test` (1.1.0) und dieselbe Formel mit eng konvergiertem `norm::em.norm` (airquality: χ² = 35,106, df = 14, p = ,0014).
 * ⚠ Von der Fachperson abzunehmen: Der Test setzt annähernd normalverteilte Zahlen voraus, ist bei großen Stichproben sehr empfindlich und bei kleinen kraftlos; ein
 *   unauffälliges Ergebnis belegt MCAR nicht (es spricht nur nicht dagegen), und MAR gegen MNAR kann kein Test trennen (Graham 2009; Enders 2010, Kap. 1).
 */
import { gammaPQ } from './power';

export interface LittleMuster { n: number; fehlt: number[]; anteil: number }
export interface Little {
  /** Namen der Spalten in der Reihenfolge der Rechnung */
  spalten: string[]; n: number; nGanz: number; nOhneAlles: number;
  chi2: number; df: number; p: number; muster: LittleMuster[];
  mittel: number[]; iterationen: number; konvergiert: boolean;
  /** Anteil fehlender Werte je Spalte */
  fehltAnteil: number[];
}
export type LittleFehler = { fehler: 'zu-wenig-spalten' | 'zu-wenig-faelle' | 'keine-luecken' | 'keine-streuung' | 'singulaer' | 'kein-df'; spalte?: string };

/** Kleine Matrix-Hilfen (Zeilenlisten). Gauß-Jordan mit Spaltenpivot; `null` bei Singularität. */
function invers(a: number[][]): number[][] | null {
  const n = a.length, m = a.map((z, i) => [...z, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r]![c]!) > Math.abs(m[p]![c]!)) p = r;
    if (Math.abs(m[p]![c]!) < 1e-12) return null;
    [m[c], m[p]] = [m[p]!, m[c]!];
    const d = m[c]![c]!; for (let j = 0; j < 2 * n; j++) m[c]![j]! /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = m[r]![c]!; if (f !== 0) for (let j = 0; j < 2 * n; j++) m[r]![j]! -= f * m[c]![j]!; }
  }
  return m.map(z => z.slice(n));
}
const teil = (s: number[][], zi: number[], sp: number[]) => zi.map(i => sp.map(j => s[i]![j]!));
const mal = (a: number[][], b: number[][]) => a.map(z => b[0]!.map((_, j) => z.reduce((s, v, k) => s + v * b[k]![j]!, 0)));
const malV = (a: number[][], v: number[]) => a.map(z => z.reduce((s, x, k) => s + x * v[k]!, 0));

/** `zeilen[i][j]` = Zahl oder null (fehlt). Spalten ohne Streuung oder ohne Lücken in der Auswahl werden NICHT stillschweigend entfernt: sie führen zu einem Fehler/Hinweis der Oberfläche. */
export function littleMcar(spalten: string[], zeilen: (number | null)[][], opt: { maxIter?: number; toleranz?: number } = {}): Little | LittleFehler {
  const p = spalten.length, maxIter = opt.maxIter ?? 5000, tol = opt.toleranz ?? 1e-11;
  if (p < 2) return { fehler: 'zu-wenig-spalten' };
  const nGanz = zeilen.length;
  const x = zeilen.filter(z => z.some(v => v !== null && Number.isFinite(v)));
  const n = x.length;
  if (n < p + 1) return { fehler: 'zu-wenig-faelle' };
  const beob = x.map(z => z.map(v => v !== null && Number.isFinite(v)));
  if (beob.every(b => b.every(Boolean))) return { fehler: 'keine-luecken' };
  // Muster
  const key = (b: boolean[]) => b.map(v => (v ? '1' : '0')).join('');
  const gruppen = new Map<string, number[]>();
  beob.forEach((b, i) => { const k = key(b); (gruppen.get(k) ?? gruppen.set(k, []).get(k)!).push(i); });
  // Startwerte: Mittel und Varianz aus den beobachteten Werten
  const mu = Array.from({ length: p }, (_, j) => { let s = 0, c = 0; x.forEach((z, i) => { if (beob[i]![j]) { s += z[j]!; c++; } }); return c ? s / c : NaN; });
  const sg: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  for (let j = 0; j < p; j++) {
    let s = 0, c = 0; x.forEach((z, i) => { if (beob[i]![j]) { s += (z[j]! - mu[j]!) ** 2; c++; } });
    if (c < 2) return { fehler: 'zu-wenig-faelle', spalte: spalten[j] };
    const v = s / (c - 1); if (!(v > 0)) return { fehler: 'keine-streuung', spalte: spalten[j] };
    sg[j]![j] = v;
  }
  // EM
  let it = 0, konv = false;
  for (; it < maxIter; it++) {
    const s1 = Array(p).fill(0), s2: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
    for (const [k, idx] of gruppen) {
      const o = [...k].map((c, j) => (c === '1' ? j : -1)).filter(j => j >= 0), m = [...k].map((c, j) => (c === '0' ? j : -1)).filter(j => j >= 0);
      let B: number[][] = [], C: number[][] = [];
      if (m.length) {
        const A = invers(teil(sg, o, o)); if (!A) return { fehler: 'singulaer' };
        const smo = teil(sg, m, o); B = mal(smo, A);
        const BS = mal(B, teil(sg, o, m)); C = teil(sg, m, m).map((z, i) => z.map((v, j) => v - BS[i]![j]!));
      }
      for (const i of idx) {
        const xh = Array(p).fill(0);
        o.forEach(j => { xh[j] = x[i]![j]!; });
        if (m.length) { const dlt = malV(B, o.map(j => x[i]![j]! - mu[j]!)); m.forEach((j, a) => { xh[j] = mu[j]! + dlt[a]!; }); }
        for (let a = 0; a < p; a++) { s1[a] += xh[a]; for (let b = 0; b < p; b++) s2[a]![b]! += xh[a] * xh[b]; }
        m.forEach((ja, a) => m.forEach((jb, b) => { s2[ja]![jb]! += C[a]![b]!; }));
      }
    }
    const mu2 = s1.map(v => v / n), sg2 = s2.map((z, a) => z.map((v, b) => v / n - mu2[a]! * mu2[b]!));
    let diff = 0; for (let a = 0; a < p; a++) { diff = Math.max(diff, Math.abs(mu2[a]! - mu[a]!) / (1 + Math.abs(mu[a]!))); for (let b = 0; b < p; b++) diff = Math.max(diff, Math.abs(sg2[a]![b]! - sg[a]![b]!) / (1 + Math.abs(sg[a]![b]!))); }
    for (let a = 0; a < p; a++) { mu[a] = mu2[a]!; for (let b = 0; b < p; b++) sg[a]![b] = sg2[a]![b]!; }
    if (diff < tol) { konv = true; it++; break; }
  }
  // Little-Statistik
  let chi2 = 0, dfSumme = 0;
  const muster: LittleMuster[] = [];
  for (const [k, idx] of gruppen) {
    const o = [...k].map((c, j) => (c === '1' ? j : -1)).filter(j => j >= 0);
    muster.push({ n: idx.length, fehlt: [...k].map((c, j) => (c === '0' ? j : -1)).filter(j => j >= 0), anteil: idx.length / n });
    if (!o.length) continue;
    const A = invers(teil(sg, o, o)); if (!A) return { fehler: 'singulaer' };
    const dv = o.map(j => idx.reduce((s, i) => s + x[i]![j]!, 0) / idx.length - mu[j]!);
    chi2 += idx.length * dv.reduce((s, v, a) => s + v * malV(A, dv)[a]!, 0);
    dfSumme += o.length;
  }
  const df = dfSumme - p;
  if (df < 1) return { fehler: 'kein-df' };
  muster.sort((a, b) => b.n - a.n);
  const fehltAnteil = spalten.map((_, j) => beob.filter(b => !b[j]).length / n);
  return { spalten, n, nGanz, nOhneAlles: nGanz - n, chi2, df, p: gammaPQ(df / 2, chi2 / 2).oben, muster, mittel: [...mu], iterationen: it, konvergiert: konv, fehltAnteil };
}
