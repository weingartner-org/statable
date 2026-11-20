/**
 * Stufenmodell (Graded Response Model, Samejima) für geordnete Antworten wie 1 bis 5 (S-J, 23.10.2026). Eigener Code, im Browser.
 *   P(Antwort ≥ k+1 | θ) = 1 / (1 + exp(−a (θ − b_k))), b_1 < … < b_(K−1) = Schwellen, a = Trennschärfe; θ ~ N(0, 1).
 *   Marginale Maximum-Likelihood mit 21 Gauß-Hermite-Stützstellen (wie `ltm`); gedämpftes Newton-Verfahren mit analytischem Gradienten und der Hessematrix aus Gradientendifferenzen;
 *   Standardfehler aus der Inverse der beobachteten Information. Gleiche Antwortmuster werden zusammengefasst.
 * Sollwerte: R `ltm::grm(Y, Hessian = TRUE)` (Extrmt, Dscrmn, Standardfehler, Log-Likelihood), siehe irtgrm.test.ts.
 * ⚠ Von der Fachperson abzunehmen: Mindestgröße (500 Personen als Warnung), Mindestzahl Antworten je Stufe.
 */
import { gaussHermiteNormal } from './irt2pl';

export interface ItemGrm { stufen: number[]; schwellen: number[]; seSchwellen: number[]; a: number; seA: number }
export interface ErgebnisGrm { personen: number; aufgaben: number; logLik: number; aic: number; bic: number; item: ItemGrm[]; kovarianz: number[][] }
export type FehlerGrm = { fehler: 'zu-wenig-aufgaben' | 'zu-wenig-personen' | 'werte' | 'zu-viele-stufen' | 'stufe-leer' | 'zu-viele-aufgaben' | 'keine-konvergenz' };

const logi = (t: number) => (t >= 0 ? 1 / (1 + Math.exp(-t)) : Math.exp(t) / (1 + Math.exp(t)));

/** `y`: Personen × Aufgaben, ganze Zahlen (geordnete Antworten), keine Lücken. Die Stufen jeder Aufgabe sind ihre vorkommenden Werte, aufsteigend. */
export function stufenModell(y: number[][]): ErgebnisGrm | FehlerGrm {
  const n = y.length, J = y[0]?.length ?? 0;
  if (J < 3) return { fehler: 'zu-wenig-aufgaben' };
  if (J > 30) return { fehler: 'zu-viele-aufgaben' };
  if (n < 50) return { fehler: 'zu-wenig-personen' };
  if (y.some(r => r.some(v => !Number.isInteger(v)))) return { fehler: 'werte' };
  const stufen = Array.from({ length: J }, (_, j) => [...new Set(y.map(r => r[j]!))].sort((a, b) => a - b));
  if (stufen.some(s => s.length < 2 || s.length > 8)) return { fehler: stufen.some(s => s.length < 2) ? 'stufe-leer' : 'zu-viele-stufen' };
  const K = stufen.map(s => s.length);
  const yc = y.map(r => r.map((v, j) => stufen[j]!.indexOf(v)));
  const { x: kn, w: kw } = gaussHermiteNormal(21), Q = kn.length;
  // Muster zusammenfassen
  const muster = new Map<string, number>(), mRows: number[][] = [], mGew: number[] = [];
  for (const r of yc) { const k = r.join(','); const i = muster.get(k); if (i === undefined) { muster.set(k, mRows.length); mRows.push(r); mGew.push(1); } else mGew[i]!++; }
  const nM = mRows.length;
  // Parameterlage: je Aufgabe K−1 Schwellen, dann a
  const off: number[] = []; let np = 0; for (let j = 0; j < J; j++) { off.push(np); np += K[j]!; }
  const par = new Array<number>(np).fill(0);
  for (let j = 0; j < J; j++) {
    const kk = K[j]!;
    for (let k = 1; k < kk; k++) { const anteil = yc.filter(r => r[j]! >= k).length / n; par[off[j]! + k - 1] = -Math.log(Math.min(Math.max(anteil, 0.01), 0.99) / (1 - Math.min(Math.max(anteil, 0.01), 0.99))); }
    par[off[j]! + kk - 1] = 1;
    for (let k = 1; k < kk - 1; k++) if (par[off[j]! + k]! <= par[off[j]! + k - 1]!) par[off[j]! + k] = par[off[j]! + k - 1]! + 0.2;
  }
  const geordnet = (p: number[]) => { for (let j = 0; j < J; j++) { for (let k = 1; k < K[j]! - 1; k++) if (p[off[j]! + k]! <= p[off[j]! + k - 1]! + 1e-6) return false; if (p[off[j]! + K[j]! - 1]! <= 0.01 || p[off[j]! + K[j]! - 1]! > 40) return false; } return true; };

  function auswerten(p: number[], mitGrad = true): { ll: number; grad: number[] } {
    // Kategorienwahrscheinlichkeiten P[j][c][q] und die Hilfsgrößen für die Ableitungen
    const Pstar: number[][][] = [], Pc: number[][][] = [];
    for (let j = 0; j < J; j++) {
      const a = p[off[j]! + K[j]! - 1]!, ps: number[][] = [], pc: number[][] = [];
      ps.push(new Array(Q).fill(1));
      for (let k = 1; k < K[j]!; k++) ps.push(kn.map(q => logi(a * (q - p[off[j]! + k - 1]!))));
      ps.push(new Array(Q).fill(0));
      for (let c = 0; c < K[j]!; c++) pc.push(kn.map((_, q) => Math.max(ps[c]![q]! - ps[c + 1]![q]!, 1e-300)));
      Pstar.push(ps); Pc.push(pc);
    }
    let ll = 0;
    const grad = new Array<number>(np).fill(0), lw = new Array<number>(Q);
    for (let i = 0; i < nM; i++) {
      const r = mRows[i]!, gw = mGew[i]!;
      let mx = -Infinity;
      for (let q = 0; q < Q; q++) { let s = Math.log(kw[q]!); for (let j = 0; j < J; j++) s += Math.log(Pc[j]![r[j]!]![q]!); lw[q] = s; if (s > mx) mx = s; }
      let tot = 0; for (let q = 0; q < Q; q++) { lw[q] = Math.exp(lw[q]! - mx); tot += lw[q]!; }
      ll += gw * (mx + Math.log(tot));
      if (!mitGrad) continue;
      for (let q = 0; q < Q; q++) {
        const post = gw * lw[q]! / tot, th = kn[q]!;
        for (let j = 0; j < J; j++) {
          const c = r[j]!, a = p[off[j]! + K[j]! - 1]!, pcq = Pc[j]![c]![q]!, o = off[j]!;
          const fU = c >= 1 ? Pstar[j]![c]![q]! * (1 - Pstar[j]![c]![q]!) : 0, fL = c <= K[j]! - 2 ? Pstar[j]![c + 1]![q]! * (1 - Pstar[j]![c + 1]![q]!) : 0;
          if (c >= 1) { grad[o + c - 1]! += post * (-a * fU) / pcq; }
          if (c <= K[j]! - 2) { grad[o + c]! += post * (a * fL) / pcq; }
          grad[o + K[j]! - 1]! += post * ((c >= 1 ? (th - p[o + c - 1]!) * fU : 0) - (c <= K[j]! - 2 ? (th - p[o + c]!) * fL : 0)) / pcq;
        }
      }
    }
    return { ll, grad };
  }
  function hesse(p: number[]): number[][] {
    const H = Array.from({ length: np }, () => new Array<number>(np).fill(0)), h = 1e-5;
    for (let k = 0; k < np; k++) {
      const pp = p.slice(), pm = p.slice(); pp[k]! += h; pm[k]! -= h;
      const gp = auswerten(pp).grad, gm = auswerten(pm).grad;
      for (let l = 0; l < np; l++) H[l]![k] = (gp[l]! - gm[l]!) / (2 * h);
    }
    for (let k = 0; k < np; k++) for (let l = k + 1; l < np; l++) { const v = (H[k]![l]! + H[l]![k]!) / 2; H[k]![l] = v; H[l]![k] = v; }
    return H;
  }
  function loese(A: number[][], b: number[]): number[] | null {
    const m = b.length, M = A.map((r, i) => [...r, b[i]!]);
    for (let c = 0; c < m; c++) {
      let piv = c; for (let r = c + 1; r < m; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r;
      if (Math.abs(M[piv]![c]!) < 1e-13) return null;
      [M[c], M[piv]] = [M[piv]!, M[c]!];
      for (let r = 0; r < m; r++) if (r !== c) { const f = M[r]![c]! / M[c]![c]!; for (let k = c; k <= m; k++) M[r]![k]! -= f * M[c]![k]!; }
    }
    return M.map((r, i) => r[m]! / r[i]!);
  }

  let aktuell = auswerten(par), lambda = 1, ok = false;
  for (let it = 0; it < 120; it++) {
    if (Math.max(...aktuell.grad.map(Math.abs)) < 1e-6) { ok = true; break; }
    const H = hesse(par);
    let angenommen = false;
    for (let t = 0; t < 25 && !angenommen; t++) {
      const A = H.map((r, i) => r.map((v, j) => -v + (i === j ? lambda * Math.max(1, Math.abs(H[i]![i]!)) : 0)));
      const s = loese(A, aktuell.grad);
      if (!s) { lambda *= 10; continue; }
      const neu = par.map((v, i) => v + s[i]!);
      if (geordnet(neu)) { const e = auswerten(neu, false); if (Number.isFinite(e.ll) && e.ll >= aktuell.ll - 1e-10) { for (let i = 0; i < np; i++) par[i] = neu[i]!; aktuell = auswerten(par); lambda = Math.max(lambda / 3, 1e-8); angenommen = true; break; } }
      lambda *= 4;
    }
    if (!angenommen) break;
  }
  if (!ok && Math.max(...aktuell.grad.map(Math.abs)) > 1e-3) return { fehler: 'keine-konvergenz' };
  const info = hesse(par).map(r => r.map(v => -v)), inv: number[][] = [];
  for (let k = 0; k < np; k++) { const e = new Array<number>(np).fill(0); e[k] = 1; const s = loese(info, e); if (!s) return { fehler: 'keine-konvergenz' }; inv.push(s); }
  const item: ItemGrm[] = [];
  for (let j = 0; j < J; j++) {
    const o = off[j]!, kk = K[j]!;
    item.push({ stufen: stufen[j]!, schwellen: par.slice(o, o + kk - 1), seSchwellen: Array.from({ length: kk - 1 }, (_, k) => Math.sqrt(Math.max(inv[o + k]![o + k]!, 0))), a: par[o + kk - 1]!, seA: Math.sqrt(Math.max(inv[o + kk - 1]![o + kk - 1]!, 0)) });
  }
  return { personen: n, aufgaben: J, logLik: aktuell.ll, aic: -2 * aktuell.ll + 2 * np, bic: -2 * aktuell.ll + Math.log(n) * np, item, kovarianz: inv };
}
