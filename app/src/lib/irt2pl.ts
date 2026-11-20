/**
 * Zwei-Parameter-Modell (2PL) für Aufgaben mit richtig/falsch (S-J, 23.10.2026). Eigener Code, im Browser.
 *   P(richtig | θ) = 1 / (1 + exp(−a (θ − b))), a = Trennschärfe, b = Schwierigkeit; θ ~ N(0, 1).
 *   Marginale Maximum-Likelihood mit Gauß-Hermite-Stützstellen (21 wie `ltm`): EM zum Anlaufen, dann Newton mit der Hessematrix aus Differenzen des analytischen Gradienten.
 *   Standardfehler: Inverse der beobachteten Information, für (a, b) mit der Delta-Methode aus (Achsenabschnitt c = −a·b, Steigung a).
 * Sollwerte: R `ltm::ltm(y ~ z1)` (Dffclt, Dscrmn, Standardfehler, Log-Likelihood), siehe irt2pl.test.ts.
 * ⚠ Von der Fachperson abzunehmen: Mindestgröße (500 Personen als Warnung), Umgang mit Trennschärfen über 5 (Schätzung unsicher).
 */

export interface Item2PL { a: number; b: number; seA: number; seB: number; anteil: number }
export interface Ergebnis2PL { personen: number; aufgaben: number; logLik: number; aic: number; bic: number; item: Item2PL[]; iterationen: number }
export type Fehler2PL = { fehler: 'zu-wenig-aufgaben' | 'zu-wenig-personen' | 'werte' | 'aufgabe-ohne-streuung' | 'zu-viele-aufgaben' | 'keine-konvergenz' };

/** Gauß-Hermite-Stützstellen und Gewichte für die Standardnormalverteilung (n Punkte, Newton auf die Hermite-Polynome). */
export function gaussHermiteNormal(n: number): { x: number[]; w: number[] } {
  const x = new Array<number>(n), w = new Array<number>(n), m = Math.floor((n + 1) / 2);
  let z = 0;
  for (let i = 0; i < m; i++) {
    z = i === 0 ? Math.sqrt(2 * n + 1) - 1.85575 * Math.pow(2 * n + 1, -1 / 6) : i === 1 ? z - 1.14 * Math.pow(n, 0.426) / z : i === 2 ? 1.86 * z - 0.86 * x[0]! : i === 3 ? 1.91 * z - 0.91 * x[1]! : 2 * z - x[i - 2]!;
    let pp = 0;
    for (let it = 0; it < 60; it++) {
      let p1 = Math.pow(Math.PI, -0.25), p2 = 0;
      for (let j = 0; j < n; j++) { const p3 = p2; p2 = p1; p1 = z * Math.sqrt(2 / (j + 1)) * p2 - Math.sqrt(j / (j + 1)) * p3; }
      pp = Math.sqrt(2 * n) * p2;
      const z1 = z; z = z1 - p1 / pp;
      if (Math.abs(z - z1) < 1e-14) break;
    }
    x[i] = z; x[n - 1 - i] = -z; w[i] = 2 / (pp * pp); w[n - 1 - i] = w[i]!;
  }
  // ∫ exp(−t²) f(t) dt → Erwartung unter N(0,1): t = x/√2
  return { x: x.map(v => v * Math.SQRT2), w: w.map(v => v / Math.sqrt(Math.PI)) };
}

const logistisch = (t: number) => (t >= 0 ? 1 / (1 + Math.exp(-t)) : Math.exp(t) / (1 + Math.exp(t)));

/** 2PL schätzen. `y`: Personen × Aufgaben, nur 0 und 1, keine Lücken. */
export function zweiPL(y: number[][]): Ergebnis2PL | Fehler2PL {
  const n = y.length, J = y[0]?.length ?? 0;
  if (J < 3) return { fehler: 'zu-wenig-aufgaben' };
  if (J > 40) return { fehler: 'zu-viele-aufgaben' };
  if (n < 30) return { fehler: 'zu-wenig-personen' };
  if (y.some(r => r.some(v => v !== 0 && v !== 1))) return { fehler: 'werte' };
  const summe = new Array<number>(J).fill(0);
  for (const r of y) r.forEach((v, j) => { summe[j]! += v; });
  if (summe.some(s => s === 0 || s === n)) return { fehler: 'aufgabe-ohne-streuung' };
  const { x: kn, w: kw } = gaussHermiteNormal(21), Q = kn.length;
  // gleiche Antwortmuster zusammenfassen: die Rechenzeit hängt dann von der Zahl verschiedener Muster ab, nicht von der Personenzahl
  const muster = new Map<string, number>(), mRows: number[][] = [], mGew: number[] = [];
  for (const r of y) { const k = r.join(''); const i = muster.get(k); if (i === undefined) { muster.set(k, mRows.length); mRows.push(r); mGew.push(1); } else mGew[i]!++; }
  const nM = mRows.length;
  // par = [c_1, a_1, c_2, a_2, …]
  const par = new Array<number>(2 * J);
  for (let j = 0; j < J; j++) { par[2 * j] = Math.log(summe[j]! / (n - summe[j]!)); par[2 * j + 1] = 1; }

  /** Log-Likelihood, Gradient und die erwarteten Zählungen (Posterior) bei `p`. */
  function auswerten(p: number[], mitGrad = true): { ll: number; grad: number[]; n1: number[][]; nq: number[] } {
    const P: number[][] = [];
    for (let j = 0; j < J; j++) P.push(kn.map(q => logistisch(p[2 * j]! + p[2 * j + 1]! * q)));
    let ll = 0;
    const n1 = Array.from({ length: J }, () => new Array<number>(Q).fill(0)), nq = new Array<number>(Q).fill(0);
    const lw = new Array<number>(Q);
    for (let i = 0; i < nM; i++) {
      const r = mRows[i]!, gw = mGew[i]!;
      let mx = -Infinity;
      for (let q = 0; q < Q; q++) { let s = Math.log(kw[q]!); for (let j = 0; j < J; j++) { const pj = P[j]![q]!; s += r[j] === 1 ? Math.log(pj) : Math.log(1 - pj); } lw[q] = s; if (s > mx) mx = s; }
      let tot = 0; for (let q = 0; q < Q; q++) { lw[q] = Math.exp(lw[q]! - mx); tot += lw[q]!; }
      ll += gw * (mx + Math.log(tot));
      if (!mitGrad) continue;
      for (let q = 0; q < Q; q++) { const post = gw * lw[q]! / tot; nq[q]! += post; for (let j = 0; j < J; j++) if (r[j] === 1) n1[j]![q]! += post; }
    }
    const grad = new Array<number>(2 * J).fill(0);
    if (mitGrad) for (let j = 0; j < J; j++) for (let q = 0; q < Q; q++) { const d = n1[j]![q]! - nq[q]! * P[j]![q]!; grad[2 * j]! += d; grad[2 * j + 1]! += d * kn[q]!; }
    return { ll, grad, n1, nq };
  }

  // EM zum Anlaufen: je Aufgabe eine gewichtete logistische Regression auf die Stützstellen (Newton)
  let iter = 0;
  let ll0 = -Infinity;
  for (let em = 0; em < 60; em++) {
    const e = auswerten(par);
    for (let j = 0; j < J; j++) {
      let c = par[2 * j]!, a = par[2 * j + 1]!;
      for (let k = 0; k < 4; k++) {
        let g0 = 0, g1 = 0, h00 = 0, h01 = 0, h11 = 0;
        for (let q = 0; q < Q; q++) { const p = logistisch(c + a * kn[q]!), d = e.n1[j]![q]! - e.nq[q]! * p, v = e.nq[q]! * p * (1 - p); g0 += d; g1 += d * kn[q]!; h00 += v; h01 += v * kn[q]!; h11 += v * kn[q]! * kn[q]!; }
        const det = h00 * h11 - h01 * h01; if (Math.abs(det) < 1e-12) break;
        c += (h11 * g0 - h01 * g1) / det; a += (-h01 * g0 + h00 * g1) / det;
      }
      par[2 * j] = c; par[2 * j + 1] = Math.max(-15, Math.min(15, a));
    }
    iter++;
    if (Math.abs(e.ll - ll0) < 1e-6) break;
    ll0 = e.ll;
  }

  /** Hessematrix aus zentralen Differenzen des Gradienten */
  function hesse(p: number[]): number[][] {
    const m = p.length, H = Array.from({ length: m }, () => new Array<number>(m).fill(0)), h = 1e-5;
    for (let k = 0; k < m; k++) {
      const pp = p.slice(), pm = p.slice(); pp[k]! += h; pm[k]! -= h;
      const gp = auswerten(pp).grad, gm = auswerten(pm).grad;
      for (let l = 0; l < m; l++) H[l]![k] = (gp[l]! - gm[l]!) / (2 * h);
    }
    for (let k = 0; k < m; k++) for (let l = k + 1; l < m; l++) { const v = (H[k]![l]! + H[l]![k]!) / 2; H[k]![l] = v; H[l]![k] = v; }
    return H;
  }
  function loese(A: number[][], b: number[]): number[] | null {
    const m = b.length, M = A.map((r, i) => [...r, b[i]!]);
    for (let c = 0; c < m; c++) {
      let piv = c; for (let r = c + 1; r < m; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r;
      if (Math.abs(M[piv]![c]!) < 1e-12) return null;
      [M[c], M[piv]] = [M[piv]!, M[c]!];
      for (let r = 0; r < m; r++) if (r !== c) { const f = M[r]![c]! / M[c]![c]!; for (let k = c; k <= m; k++) M[r]![k]! -= f * M[c]![k]!; }
    }
    return M.map((r, i) => r[m]! / r[i]!);
  }

  // Newton auf der marginalen Log-Likelihood (Maximum: Hesse negativ definit)
  let aktuell = auswerten(par);
  let ok = false;
  for (let it = 0; it < 40; it++) {
    iter++;
    const g = aktuell.grad;
    if (Math.max(...g.map(Math.abs)) < 1e-7) { ok = true; break; }
    const H = hesse(par), schritt = loese(H.map(r => r.map(v => -v)), g);
    if (!schritt) break;
    let t = 1, neu: number[] = par;
    for (let ls = 0; ls < 30; ls++) {
      neu = par.map((v, i) => v + t * schritt[i]!);
      if (neu.every((v, i) => i % 2 === 0 || Math.abs(v) < 40) && auswerten(neu, false).ll >= aktuell.ll - 1e-12) break;
      t /= 2;
    }
    for (let i = 0; i < par.length; i++) par[i] = neu[i]!;
    aktuell = auswerten(par);
  }
  if (!ok && Math.max(...aktuell.grad.map(Math.abs)) > 1e-4) return { fehler: 'keine-konvergenz' };

  // Standardfehler: Inverse von −H, Delta-Methode für (a, b = −c/a)
  const info = hesse(par).map(r => r.map(v => -v)), m = par.length, inv: number[][] = [];
  for (let k = 0; k < m; k++) { const e = new Array<number>(m).fill(0); e[k] = 1; const s = loese(info, e); if (!s) return { fehler: 'keine-konvergenz' }; inv.push(s); }
  const item: Item2PL[] = [];
  for (let j = 0; j < J; j++) {
    const c = par[2 * j]!, a = par[2 * j + 1]!;
    const vcc = inv[2 * j]![2 * j]!, vca = inv[2 * j]![2 * j + 1]!, vaa = inv[2 * j + 1]![2 * j + 1]!;
    const g = [-1 / a, c / (a * a)];  // ∂b/∂c, ∂b/∂a
    const vb = g[0]! * g[0]! * vcc + 2 * g[0]! * g[1]! * vca + g[1]! * g[1]! * vaa;
    item.push({ a, b: -c / a, seA: Math.sqrt(Math.max(vaa, 0)), seB: Math.sqrt(Math.max(vb, 0)), anteil: summe[j]! / n });
  }
  const k = 2 * J;
  return { personen: n, aufgaben: J, logLik: aktuell.ll, aic: -2 * aktuell.ll + 2 * k, bic: -2 * aktuell.ll + Math.log(n) * k, item, iterationen: iter };
}
