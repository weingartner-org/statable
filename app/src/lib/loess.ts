/**
 * LOESS-Linie (lokale Regression, eigene Umsetzung wie R `loess(y ~ x)`): Spannweite 0,75, Grad 2, Gewichte nach Tricube, gaußsch (ohne Robustifizierung).
 * R rechnet nur an den Ecken eines Baums aus Zellen (kd-Baum, Zellgröße 0,2) und verbindet dazwischen mit Kurven dritten Grades (`surface = "interpolate"`);
 * genau das ist hier nachgebaut, damit die Zahlen gleich sind (Test: loess.test.ts gegen `predict(loess(mpg ~ wt))` aus R, Daten mtcars).
 * Nur für das Ansehen im Streudiagramm: gerechnet wird nichts, was in einen Bericht geht.
 */
export interface LoessModell {
  /** Geglätteter Wert an der Stelle z (innerhalb des Bereichs der x-Werte). */
  bei: (z: number) => number;
  /** Anzahl der Nachbarn je lokaler Anpassung */
  q: number;
}
export const LOESS_SPANNE = 0.75;

/** Lokale Anpassung vom Grad 2 an der Stelle z: [Wert, Steigung]. `null`, wenn sie sich nicht lösen lässt. */
function lokal(z: number, x: number[], y: number[], q: number, span: number): [number, number] | null {
  const n = x.length, d = x.map(v => Math.abs(v - z)), h = [...d].sort((a, b) => a - b)[q - 1]! * Math.max(1, span);
  if (!(h > 0)) return null;
  const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], b = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    if (d[i]! >= h) continue;
    const w = (1 - (d[i]! / h) ** 3) ** 3, u = x[i]! - z, c = [1, u, u * u];
    for (let r = 0; r < 3; r++) { b[r]! += w * c[r]! * y[i]!; for (let k = 0; k < 3; k++) S[r]![k]! += w * c[r]! * c[k]!; }
  }
  const A = S.map((r, i) => [...r, b[i]!]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(A[r]![c]!) > Math.abs(A[p]![c]!)) p = r;
    [A[c], A[p]] = [A[p]!, A[c]!];
    if (Math.abs(A[c]![c]!) < 1e-12) return null;
    for (let r = 0; r < 3; r++) if (r !== c) { const f = A[r]![c]! / A[c]![c]!; for (let k = c; k < 4; k++) A[r]![k]! -= f * A[c]![k]!; }
  }
  return [A[0]![3]! / A[0]![0]!, A[1]![3]! / A[1]![1]!];
}

/** Ecken der Zellen: Rand des Bereichs (0,5 % erweitert) und die Teilungsstellen (Wert des mittleren Punktes, gleiche Werte bleiben zusammen). */
function ecken(x: number[], fc: number): number[] {
  let a = Math.min(...x), b = Math.max(...x);
  const mu = 0.005 * Math.max(b - a, 1e-10 * Math.max(Math.abs(a), Math.abs(b)) + 1e-30);
  a -= mu; b += mu;
  const ecke = new Set<number>([a, b]);
  const teile = (pts: number[]) => {
    if (pts.length <= fc || pts.length < 2) return;
    const s = [...pts].sort((p, q) => p - q);
    let m = Math.floor((1 + s.length) / 2);
    while (m > 1 && s[m - 2] === s[m - 1]) m--;
    const t = s[m - 1]!, tief = s.filter(v => v <= t), hoch = s.filter(v => v > t);
    if (!hoch.length || !tief.length || ecke.has(t)) return;
    ecke.add(t); teile(tief); teile(hoch);
  };
  teile(x);
  return [...ecke].sort((p, q) => p - q);
}

/** LOESS-Modell oder `null` (weniger als 5 Punkte, kaum verschiedene x-Werte, nicht lösbar). */
export function loess(x: number[], y: number[], span = LOESS_SPANNE): LoessModell | null {
  const n = x.length;
  if (n < 5 || y.length !== n || new Set(x).size < 4) return null;
  const q = Math.min(n, Math.floor(n * span + 1e-5));
  if (q < 4) return null;
  const v = ecken(x, Math.floor(n * span * 0.2));
  const f: [number, number][] = [];
  for (const e of v) { const r = lokal(e, x, y, q, span); if (!r) return null; f.push(r); }
  return {
    q,
    bei: (z: number) => {
      let k = 0;
      while (k < v.length - 2 && z > v[k + 1]!) k++;
      const h = v[k + 1]! - v[k]!, t = (z - v[k]!) / h, [y0, s0] = f[k]!, [y1, s1] = f[k + 1]!, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * s0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * s1;
    }
  };
}

/** Punkte der Linie zwischen kleinstem und größtem x (gleich verteilt), für das Zeichnen. Leer, wenn sich LOESS nicht rechnen lässt. */
export function loessLinie(punkte: [number, number][], schritte = 60): [number, number][] {
  const m = loess(punkte.map(p => p[0]), punkte.map(p => p[1]));
  if (!m) return [];
  const a = Math.min(...punkte.map(p => p[0])), b = Math.max(...punkte.map(p => p[0]));
  return Array.from({ length: schritte + 1 }, (_, i) => { const z = a + ((b - a) * i) / schritte; return [z, m.bei(z)] as [number, number]; });
}
