/**
 * Rasch-Modell für Aufgaben mit richtig/falsch (S-J, 23.10.2026). Eigener Code, im Browser.
 *   Aufgabenschwierigkeiten: bedingte Maximum-Likelihood (CML, Newton-Raphson über elementar-symmetrische Funktionen), Summe der Schwierigkeiten = 0 (wie R `eRm::RM`);
 *   Standardfehler aus der Informationsmatrix. Personenwerte: ML je Rohwert (Newton); Rohwert 0 und alle richtig bleiben ohne Schätzung (R extrapoliert dort).
 *   Aufgaben-Passung: Infit und Outfit (mittlere Quadrate der standardisierten Residuen, mit den geschätzten Personenwerten), Chi-Quadrat; Rohwert-Trennschärfe.
 *   Andersen-Likelihood-Ratio-Test (Teilung am Median des Rohwerts), Personentrennung (Reliabilität = (Var(θ̂) − Mittel(SE²)) / Var(θ̂)).
 * Sollwerte: R `eRm` (RM, person.parameter, itemfit, LRtest, SepRel), siehe rasch.test.ts.
 * ⚠ Von der Fachperson abzunehmen: Mindestgrößen (100 Personen, 4 Aufgaben), Faustregel Infit/Outfit 0,7 bis 1,3, Umgang mit Rohwerten 0 und alle richtig.
 */
import { chiQuadratP } from './verteilung';

export interface RaschPerson { roh: number; theta: number | null; se: number | null; n: number }
export interface RaschAufgabe { schwierigkeit: number; se: number; chi2: number; df: number; p: number; outfit: number; infit: number; richtig: number; anteil: number }
export interface RaschLR { lr: number; df: number; p: number; nUnten: number; nOben: number }
export interface RaschErgebnis {
  personen: number; aufgaben: number; mitInfo: number; logLik: number;
  aufgabe: RaschAufgabe[]; werte: RaschPerson[]; lr: RaschLR | null; reliabilitaet: number | null; thetaSchaetzer: number[]
}
export type RaschFehler = { fehler: 'zu-wenig-aufgaben' | 'zu-wenig-personen' | 'werte' | 'aufgabe-ohne-streuung' | 'keine-konvergenz' | 'zu-viele-aufgaben' };

/** Elementar-symmetrische Funktionen γ₀ … γ_k der Parameter ε (Reihenfolge der Aufgaben beliebig), nach der üblichen Rekursion. */
function gamma(eps: number[]): number[] {
  const g = [1];
  for (const e of eps) { g.push(0); for (let r = g.length - 1; r >= 1; r--) g[r] = g[r]! + e * g[r - 1]!; }
  return g;
}
const ohne = (eps: number[], i: number) => eps.filter((_, j) => j !== i);
const ohne2 = (eps: number[], i: number, j: number) => eps.filter((_, t) => t !== i && t !== j);

/** Löst A·z = b (Gauß, Spaltenpivot); null bei Singularität. */
function loese(A: number[][], b: number[]): number[] | null {
  const n = A.length, m = A.map((r, i) => [...r, b[i]!]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r]![c]!) > Math.abs(m[p]![c]!)) p = r;
    if (Math.abs(m[p]![c]!) < 1e-13) return null;
    [m[c], m[p]] = [m[p]!, m[c]!];
    for (let r = c + 1; r < n; r++) { const f = m[r]![c]! / m[c]![c]!; for (let j = c; j <= n; j++) m[r]![j]! -= f * m[c]![j]!; }
  }
  const z = Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = m[r]![n]!; for (let j = r + 1; j < n; j++) s -= m[r]![j]! * z[j]!; z[r] = s / m[r]![r]!; }
  return z;
}
function invers(A: number[][]): number[][] | null {
  const n = A.length, cols: number[][] = [];
  for (let c = 0; c < n; c++) { const z = loese(A, Array.from({ length: n }, (_, i) => (i === c ? 1 : 0))); if (!z) return null; cols.push(z); }
  return Array.from({ length: n }, (_, i) => cols.map(c => c[i]!));
}

/** CML-Schätzung der Leichtigkeiten η (Summe 0). `s[i]`: Zahl richtiger Antworten der Aufgabe i, `nr[r]`: Zahl der Personen mit Rohwert r (nur 1 … k − 1). */
function cml(k: number, s: number[], nr: number[]): { eta: number[]; logLik: number; cov: number[][] } | null {
  const A: number[][] = Array.from({ length: k }, (_, i) => Array.from({ length: k - 1 }, (_, j) => (i < k - 1 ? (i === j ? 1 : 0) : -1)));
  let theta = new Array<number>(k - 1).fill(0);
  const auswerten = (th: number[]) => {
    const eta = A.map(r => r.reduce((a, v, j) => a + v * th[j]!, 0)), eps = eta.map(Math.exp), g = gamma(eps);
    let ll = eta.reduce((a, e, i) => a + e * s[i]!, 0); for (let r = 1; r < k; r++) if (nr[r]) ll -= nr[r]! * Math.log(g[r]!);
    const P = Array.from({ length: k }, () => new Array<number>(k + 1).fill(0));   // P[i][r] = P(X_i = 1 | r)
    const gi = eps.map((_, i) => gamma(ohne(eps, i)));
    for (let i = 0; i < k; i++) for (let r = 1; r < k; r++) P[i]![r] = (eps[i]! * gi[i]![r - 1]!) / g[r]!;
    const grad = new Array<number>(k).fill(0), H = Array.from({ length: k }, () => new Array<number>(k).fill(0));
    for (let i = 0; i < k; i++) grad[i] = s[i]! - Array.from({ length: k - 1 }, (_, r0) => nr[r0 + 1]! * P[i]![r0 + 1]!).reduce((a, v) => a + v, 0);
    for (let i = 0; i < k; i++) for (let j = i; j < k; j++) {
      let v = 0;
      for (let r = 1; r < k; r++) {
        if (!nr[r]) continue;
        const pij = i === j ? P[i]![r]! : r >= 2 ? (eps[i]! * eps[j]! * gamma(ohne2(eps, i, j))[r - 2]!) / g[r]! : 0;
        v += nr[r]! * (pij - P[i]![r]! * P[j]![r]!);
      }
      H[i]![j] = H[j]![i] = -v;
    }
    return { eta, ll, grad, H };
  };
  const proj = (e: ReturnType<typeof auswerten>) => ({ g: A[0]!.map((_, j) => A.reduce((a, r, i) => a + r[j]! * e.grad[i]!, 0)), H: A[0]!.map((_, a) => A[0]!.map((_, b) => A.reduce((s2, r, i) => s2 + r[a]! * A.reduce((s3, q, j) => s3 + e.H[i]![j]! * q[b]!, 0), 0))) });
  let e = auswerten(theta);
  for (let it = 0; it < 100; it++) {
    const { g, H } = proj(e), schritt = loese(H.map(r => r.map(v => -v)), g);
    if (!schritt) return null;
    let fak = 1, neu = theta, en = e;
    for (let h = 0; h < 30; h++) { neu = theta.map((v, j) => v + fak * schritt[j]!); en = auswerten(neu); if (Number.isFinite(en.ll) && en.ll >= e.ll - 1e-12) break; fak /= 2; }
    const diff = Math.max(...schritt.map(v => Math.abs(v * fak)));
    theta = neu; e = en;
    if (diff < 1e-10) break;
    if (it === 99) return null;
  }
  const { H } = proj(e), infoInv = invers(H.map(r => r.map(v => -v)));
  if (!infoInv) return null;
  const covEta = A.map((r, i) => A.map((q, j) => r.reduce((a, v, a2) => a + v * q.reduce((b, w, b2) => b + w * infoInv[a2]![b2]!, 0), 0)));
  return { eta: e.eta, logLik: e.ll, cov: covEta };
}

/** ML-Personenwert zum Rohwert r (0 < r < k): Σ p_i(θ) = r mit Schwierigkeiten b. */
function thetaZuRoh(b: number[], r: number): { theta: number; se: number } {
  let th = 0;
  for (let it = 0; it < 200; it++) {
    const p = b.map(bi => 1 / (1 + Math.exp(-(th - bi)))), f = p.reduce((a, v) => a + v, 0) - r, info = p.reduce((a, v) => a + v * (1 - v), 0), d = f / info;
    th -= Math.max(-3, Math.min(3, d)); if (Math.abs(d) < 1e-12) break;
  }
  const info = b.reduce((a, bi) => { const p = 1 / (1 + Math.exp(-(th - bi))); return a + p * (1 - p); }, 0);
  return { theta: th, se: 1 / Math.sqrt(info) };
}

export function rasch(x: number[][]): RaschErgebnis | RaschFehler {
  const N = x.length, k = x[0]?.length ?? 0;
  if (k < 3) return { fehler: 'zu-wenig-aufgaben' };
  if (k > 60) return { fehler: 'zu-viele-aufgaben' };
  if (x.some(z => z.length !== k || z.some(v => v !== 0 && v !== 1))) return { fehler: 'werte' };
  const roh = x.map(z => z.reduce((a, v) => a + v, 0)), info = x.filter((_, i) => roh[i]! > 0 && roh[i]! < k);
  if (info.length < k + 5) return { fehler: 'zu-wenig-personen' };
  const s = Array.from({ length: k }, (_, i) => info.reduce((a, z) => a + z[i]!, 0));
  if (s.some(v => v === 0 || v === info.length)) return { fehler: 'aufgabe-ohne-streuung' };
  const nr = new Array<number>(k + 1).fill(0); for (const z of info) nr[z.reduce((a, v) => a + v, 0)]!++;
  const fit = cml(k, s, nr);
  if (!fit) return { fehler: 'keine-konvergenz' };
  const b = fit.eta.map(e => -e), se = fit.cov.map((r, i) => Math.sqrt(r[i]!));
  const werte: RaschPerson[] = []; const thetaZuRohMap = new Map<number, { theta: number; se: number }>();
  for (let r = 0; r <= k; r++) {
    const n = roh.filter(v => v === r).length;
    if (r === 0 || r === k) { werte.push({ roh: r, theta: null, se: null, n }); continue; }
    const t = thetaZuRoh(b, r); thetaZuRohMap.set(r, t); werte.push({ roh: r, theta: t.theta, se: t.se, n });
  }
  // Aufgaben-Passung mit den Personen ohne Extremwert
  const aufgabe: RaschAufgabe[] = b.map((bi, i) => {
    let sz = 0, sw = 0, sr = 0;
    for (const z of info) { const t = thetaZuRohMap.get(z.reduce((a, v) => a + v, 0))!.theta, p = 1 / (1 + Math.exp(-(t - bi))), w = p * (1 - p), res = (z[i]! - p) ** 2; sz += res / w; sw += w; sr += res; }
    const n = info.length;
    return { schwierigkeit: bi, se: se[i]!, chi2: sz, df: n - 1, p: chiQuadratP(sz, n - 1), outfit: sz / n, infit: sr / sw, richtig: s[i]!, anteil: s[i]! / n };
  });
  const thetas = info.map(z => thetaZuRohMap.get(z.reduce((a, v) => a + v, 0))!), vt = varianz(thetas.map(t => t.theta));
  const rel = vt > 0 ? (vt - thetas.reduce((a, t) => a + t.se ** 2, 0) / thetas.length) / vt : null;
  // Andersen-Test: Teilung der Personen mit Rohwert 1 … k − 1 am Median des Rohwerts (unten: Rohwert ≤ Median)
  const med = median(roh.filter(v => v > 0 && v < k));
  const teile = [info.filter(z => z.reduce((a, v) => a + v, 0) <= med), info.filter(z => z.reduce((a, v) => a + v, 0) > med)];
  let lr: RaschLR | null = null;
  if (teile.every(t => t.length >= k + 5)) {
    const fits = teile.map(t => { const ss = Array.from({ length: k }, (_, i) => t.reduce((a, z) => a + z[i]!, 0)); if (ss.some(v => v === 0 || v === t.length)) return null; const nn = new Array<number>(k + 1).fill(0); for (const z of t) nn[z.reduce((a, v) => a + v, 0)]!++; return cml(k, ss, nn); });
    if (fits.every(f => f)) { const l = -2 * (fit.logLik - fits.reduce((a, f) => a + f!.logLik, 0)); lr = { lr: l, df: k - 1, p: chiQuadratP(l, k - 1), nUnten: teile[0]!.length, nOben: teile[1]!.length }; }
  }
  return { personen: N, aufgaben: k, mitInfo: info.length, logLik: fit.logLik, aufgabe, werte, lr, reliabilitaet: rel, thetaSchaetzer: thetas.map(t => t.theta) };
}
const varianz = (a: number[]) => { const m = a.reduce((s, v) => s + v, 0) / a.length; return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1); };
const median = (a: number[]) => { const s = [...a].sort((p, q) => p - q), n = s.length; return n % 2 ? s[(n - 1) / 2]! : (s[n / 2 - 1]! + s[n / 2]!) / 2; };
