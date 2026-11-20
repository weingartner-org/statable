/**
 * Kurvenanpassung (S-I, 22.10.2026): „Kurve statt Gerade“ unter dem Streudiagramm. Reine JavaScript-Rechnung (kleinste Quadrate, Normalgleichungen).
 *   gerade        y = a + b·x
 *   quadratisch   y = a + b·x + c·x²
 *   logarithmisch y = a + b·ln x              (nur x > 0)
 *   exponentiell  y = a·e^(b·x)               (nur y > 0; gerechnet als Gerade von ln y gegen x)
 *   potenz        y = a·x^b                   (nur x > 0 und y > 0; Gerade von ln y gegen ln x)
 *   logistisch    y = K / (1 + e^(−r·(x − x₀)))   (Wachstum mit Sättigung K; nichtlineare kleinste Quadrate, Levenberg-Marquardt; nur y > 0)
 *   gompertz      y = K·e^(−b·c^x), 0 < c < 1     (Sättigung K, anfangs langsamer Anstieg; wie R `SSgompertz`: Asym·exp(−b2·b3^x))
 *   vierpl        y = u + (o − u) / (1 + (x/e)^b)  (Dosis-Wirkung, 4PL wie `drc::LL.4`: u unten, o oben, e = EC50, b Steigung; nur x > 0; Koeffizienten [u, o, e, b])
 * R² steht immer auf der ORIGINAL-Skala von y (1 − Σ Rest² / Σ Total²), damit alle Kurven vergleichbar sind; bei exponentiell und Potenz minimiert die Rechnung
 * die Abweichung der LOGARITHMEN (wie Excel und R `lm(log(y) ~ …)`), nicht die der Originalwerte - das steht im Hinweis.
 * Sollwerte: R `lm()` (Gerade, Quadrat, ln x, ln y ~ x, ln y ~ ln x), siehe kurven.test.ts.
 * ⚠ Von der Fachperson abzunehmen: die Hinweise zu Extrapolation und zu R² bei Kurven mit mehr Parametern.
 */
export type KurvenArt = 'gerade' | 'quadratisch' | 'logarithmisch' | 'exponentiell' | 'potenz' | 'logistisch' | 'gompertz' | 'vierpl';
export const KURVEN_ARTEN: KurvenArt[] = ['gerade', 'quadratisch', 'logarithmisch', 'exponentiell', 'potenz', 'logistisch', 'gompertz', 'vierpl'];

export interface Kurve {
  art: KurvenArt;
  /** a, b (, c) wie in der Formel oben */
  koeff: number[];
  /** R² auf der Skala von y */
  r2: number;
  /** bereinigtes R² (Anzahl der Parameter berücksichtigt) */
  r2korr: number;
  /** Streuung der Reste (Wurzel aus Σ Rest² / (n − Parameter)) auf der Skala von y */
  rest: number;
  /** Standardfehler der Koeffizienten (nur bei den nichtlinearen Formen: logistisch, Gompertz, 4PL; Wald, aus der Jacobi-Matrix im Optimum und rest²) */
  se?: number[];
  n: number;
  /** Wert der Kurve an einer Stelle x (NaN, wo sie nicht definiert ist) */
  y: (x: number) => number;
}
export type KurvenFehler = { fehler: 'zu-wenig-punkte' | 'x-nicht-positiv' | 'y-nicht-positiv' | 'keine-streuung' | 'singulaer' | 'keine-konvergenz' };

/** Löst A·z = b für kleine Matrizen (Gauß mit Spaltenpivot); null bei Singularität. */
function loese(a: number[][], b: number[]): number[] | null {
  const k = a.length, m = a.map((z, i) => [...z, b[i]!]);
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(m[r]![c]!) > Math.abs(m[p]![c]!)) p = r;
    if (Math.abs(m[p]![c]!) < 1e-12 * (1 + Math.abs(a[0]![0]!))) return null;
    [m[c], m[p]] = [m[p]!, m[c]!];
    for (let r = c + 1; r < k; r++) { const f = m[r]![c]! / m[c]![c]!; for (let j = c; j <= k; j++) m[r]![j]! -= f * m[c]![j]!; }
  }
  const z = Array(k).fill(0);
  for (let r = k - 1; r >= 0; r--) { let s = m[r]![k]!; for (let j = r + 1; j < k; j++) s -= m[r]![j]! * z[j]!; z[r] = s / m[r]![r]!; }
  return z;
}
/** Kleinste Quadrate mit Basisfunktionen (1, f₁(x), f₂(x) …): Koeffizienten der Normalgleichungen. */
function ols(xs: number[], ys: number[], basis: ((x: number) => number)[]): number[] | null {
  const k = basis.length + 1, B = xs.map(x => [1, ...basis.map(f => f(x))]);
  const A = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => B.reduce((s, r) => s + r[i]! * r[j]!, 0)));
  const v = Array.from({ length: k }, (_, i) => B.reduce((s, r, t) => s + r[i]! * ys[t]!, 0));
  return loese(A, v);
}

/** Nichtlineare kleinste Quadrate (Levenberg-Marquardt, Jacobi-Matrix numerisch) für beliebig viele Parameter; null, wenn sie nicht konvergiert. */
function nlsN(xs: number[], ys: number[], f: (x: number, p: number[]) => number, start: number[]): number[] | null {
  let p = [...start], lam = 1e-3;
  const k = p.length;
  const rss = (q: number[]) => ys.reduce((a, y, i) => { const v = f(xs[i]!, q); return a + (Number.isFinite(v) ? (y - v) ** 2 : 1e300); }, 0);
  let cur = rss(p);
  for (let it = 0; it < 800; it++) {
    const J = xs.map(x => p.map((pj, j) => { const h = 1e-6 * Math.max(Math.abs(pj), 1e-3), q = [...p]; q[j] = pj + h; return (f(x, q) - f(x, p)) / h; }));
    const r = ys.map((y, i) => y - f(xs[i]!, p));
    const A = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => J.reduce((s, z) => s + z[a]! * z[b]!, 0)));
    const g = Array.from({ length: k }, (_, a) => J.reduce((s, z, i) => s + z[a]! * r[i]!, 0));
    let besser = false;
    for (let t = 0; t < 30 && !besser; t++) {
      const M = A.map((z, a) => z.map((v, b) => v + (a === b ? lam * (v || 1) : 0))), d = loese(M, g);
      if (!d) { lam *= 10; continue; }
      const q = p.map((v, j) => v + d[j]!), v = rss(q);
      if (Number.isFinite(v) && v < cur) { const rel = (cur - v) / (cur || 1); p = q; cur = v; lam = Math.max(lam / 10, 1e-12); besser = true; if (rel < 1e-14) return p; } else lam *= 10;
    }
    if (!besser) return p;   // kein Schritt verbessert mehr: Minimum erreicht
  }
  return p;
}

export function passeKurveAn(art: KurvenArt, punkte: [number, number][]): Kurve | KurvenFehler {
  const p = punkte.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), n = p.length;
  const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
  const npar = art === 'vierpl' ? 4 : art === 'quadratisch' || art === 'logistisch' || art === 'gompertz' ? 3 : 2;
  if (n < npar + 1) return { fehler: 'zu-wenig-punkte' };
  if (new Set(xs).size < npar || new Set(ys).size < 2) return { fehler: 'keine-streuung' };
  if ((art === 'logarithmisch' || art === 'potenz' || art === 'vierpl') && xs.some(x => !(x > 0))) return { fehler: 'x-nicht-positiv' };
  if ((art === 'exponentiell' || art === 'potenz' || art === 'logistisch' || art === 'gompertz') && ys.some(y => !(y > 0))) return { fehler: 'y-nicht-positiv' };
  let koeff: number[] | null, f: (x: number) => number, nlsModell: ((x: number, q: number[]) => number) | null = null;
  if (art === 'gerade') { koeff = ols(xs, ys, [x => x]); f = x => koeff![0]! + koeff![1]! * x; }
  else if (art === 'quadratisch') { koeff = ols(xs, ys, [x => x, x => x * x]); f = x => koeff![0]! + koeff![1]! * x + koeff![2]! * x * x; }
  else if (art === 'logarithmisch') { koeff = ols(xs, ys, [Math.log]); f = x => (x > 0 ? koeff![0]! + koeff![1]! * Math.log(x) : NaN); }
  else if (art === 'exponentiell') { const c = ols(xs, ys.map(Math.log), [x => x]); koeff = c && [Math.exp(c[0]!), c[1]!]; f = x => koeff![0]! * Math.exp(koeff![1]! * x); }
  else if (art === 'potenz') { const c = ols(xs.map(Math.log), ys.map(Math.log), [x => x]); koeff = c && [Math.exp(c[0]!), c[1]!]; f = x => (x > 0 ? koeff![0]! * x ** koeff![1]! : NaN); }
  else if (art === 'vierpl') {
    // Startwerte: oben/unten aus den äußeren Werten (nach x geordnet), EC50 beim mittleren y, Steigung b = ±1 je nach Richtung
    const o = punkte.filter(q => Number.isFinite(q[0]) && Number.isFinite(q[1])).sort((a, b) => a[0] - b[0]), m = Math.max(1, Math.floor(o.length / 5));
    const links = o.slice(0, m).reduce((a, q) => a + q[1], 0) / m, rechts = o.slice(-m).reduce((a, q) => a + q[1], 0) / m, mitteY = (links + rechts) / 2;
    const e0 = o.reduce((best, q) => (Math.abs(q[1] - mitteY) < Math.abs(best[1] - mitteY) ? q : best), o[0]!)[0];
    const modell = (x: number, q: number[]) => q[0]! + (q[1]! - q[0]!) / (1 + (x / q[2]!) ** q[3]!);
    koeff = nlsN(xs, ys, modell, [rechts, links, e0, links > rechts ? 1 : -1]);
    if (!koeff || koeff.some(v => !Number.isFinite(v)) || !(koeff[2]! > 0)) return { fehler: 'keine-konvergenz' };
    const q = koeff; f = x => (x > 0 ? modell(x, q) : NaN); nlsModell = modell;
  } else {
    // Wachstum mit Sättigung: Startwerte aus der Linearisierung mit K₀ = 1,1 · größtes y, danach nichtlineare kleinste Quadrate
    const K0 = 1.1 * Math.max(...ys), lin = art === 'logistisch' ? ys.map(y => Math.log(y / (K0 - y))) : ys.map(y => Math.log(-Math.log(y / K0)));
    const c = ols(xs, lin, [x => x]); if (!c) return { fehler: 'singulaer' };
    let start: number[], modell: (x: number, q: number[]) => number;
    if (art === 'logistisch') { const r0 = c[1]!, x00 = -c[0]! / (c[1]! || 1e-9); start = [K0, r0, x00]; modell = (x, q) => q[0]! / (1 + Math.exp(-q[1]! * (x - q[2]!))); }
    else { start = [K0, Math.exp(c[0]!), Math.exp(c[1]!)]; modell = (x, q) => q[0]! * Math.exp(-q[1]! * q[2]! ** x); }
    koeff = nlsN(xs, ys, modell, start);
    if (!koeff || koeff.some(v => !Number.isFinite(v)) || (art === 'gompertz' && !(koeff[2]! > 0 && koeff[2]! < 1)) || (koeff[0]! <= 0)) return { fehler: 'keine-konvergenz' };
    const q = koeff; f = x => modell(x, q); nlsModell = modell;
  }
  if (!koeff) return { fehler: 'singulaer' };
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const ssr = ys.reduce((a, y, i) => a + (y - f(xs[i]!)) ** 2, 0), sst = ys.reduce((a, y) => a + (y - my) ** 2, 0);
  const r2 = 1 - ssr / sst;
  const k: Kurve = { art, koeff, r2, r2korr: 1 - (1 - r2) * (n - 1) / (n - npar), rest: Math.sqrt(ssr / (n - npar)), n, y: f };
  if (nlsModell) { const se = nlsSE(xs, nlsModell, koeff, k.rest); if (se) k.se = se; }
  return k;
}

/** Standardfehler der Koeffizienten einer nichtlinearen Anpassung: √diag(rest² · (JᵀJ)⁻¹), J mit zentralen Differenzen im Optimum; null, wenn JᵀJ singulär ist. */
function nlsSE(xs: number[], f: (x: number, p: number[]) => number, p: number[], rest: number): number[] | null {
  const k = p.length;
  const J = xs.map(x => p.map((pj, j) => { const h = 1e-5 * Math.max(Math.abs(pj), 1e-3), a = [...p], b = [...p]; a[j] = pj + h; b[j] = pj - h; return (f(x, a) - f(x, b)) / (2 * h); }));
  const A = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => J.reduce((s, z) => s + z[a]! * z[b]!, 0)));
  const se: number[] = [];
  for (let c = 0; c < k; c++) { const e = Array.from({ length: k }, (_, i) => (i === c ? 1 : 0)), z = loese(A, e); if (!z || !(z[c]! > 0)) return null; se.push(rest * Math.sqrt(z[c]!)); }
  return se;
}

/** Passt alle Kurven an, die die Daten zulassen; die übrigen mit dem Grund. */
export function alleKurven(punkte: [number, number][]): { kurven: Kurve[]; fehlen: { art: KurvenArt; grund: KurvenFehler['fehler'] }[] } {
  const kurven: Kurve[] = [], fehlen: { art: KurvenArt; grund: KurvenFehler['fehler'] }[] = [];
  for (const a of KURVEN_ARTEN) { const k = passeKurveAn(a, punkte); if ('fehler' in k) fehlen.push({ art: a, grund: k.fehler }); else kurven.push(k); }
  return { kurven, fehlen };
}
