/**
 * Parallelanalyse nach Horn (1965) als Vorschlag für die Zahl der Faktoren (Abschlusstest F3; Fabrigar et al. 1999; Zwick & Velicer 1986).
 * Rechnung wie R psych::fa.parallel(fa = "pc", n.iter = 100, quant = .95): Die Eigenwerte der Korrelationsmatrix der Daten werden mit dem
 * 95. Perzentil (R quantile, Typ 7) der Eigenwerte aus 100 Zufallsdatensätzen derselben Größe (n Personen, p Fragen, normalverteilt, unkorreliert)
 * verglichen; vorgeschlagen werden so viele Komponenten, wie führende Eigenwerte darüber liegen (psych: which(!(beobachtet > Perzentil))[1] - 1).
 *
 * Die Zufallsdaten werden nicht Zeile für Zeile erzeugt, sondern gleich ihre Korrelationsmatrix über die Bartlett-Zerlegung der Wishart-Verteilung:
 * Für n unabhängige normalverteilte Zeilen ist die Matrix der Kreuzprodukte (zentriert) Wishart(n − 1, I) verteilt, W = L·Lᵀ mit unterer Dreiecksmatrix L,
 * L_ii = √χ²(n − i) und L_ij ~ N(0, 1) (Bartlett 1933). Die Korrelationen haben damit genau die Verteilung wie bei echten Zufallsdaten gleicher Größe
 * (Test in faktorwahl.test.ts), der Aufwand hängt aber nicht von n ab - auch 100 000 Zeilen rechnen sofort.
 * Fester Startwert: dasselbe Ergebnis bei jedem Aufruf. Prüfwerte: scripts/faktor-parallel-erwartet.R.
 */

/** Zufallszahlen mit festem Startwert (mulberry32), dazu Normal- (Box-Muller) und χ²-verteilte Werte (Marsaglia-Tsang, Gamma). */
export function zufall(seed: number) {
  let a = seed >>> 0;
  const gleich = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let vorrat: number | null = null;
  const normal = () => {
    if (vorrat !== null) { const v = vorrat; vorrat = null; return v; }
    let u = 0; while (u === 0) u = gleich();
    const r = Math.sqrt(-2 * Math.log(u)), w = 2 * Math.PI * gleich();
    vorrat = r * Math.sin(w); return r * Math.cos(w);
  };
  /** Gamma(form, 1) nach Marsaglia & Tsang (2000); form < 1 über den Umweg form + 1. */
  const gamma = (form: number): number => {
    if (form < 1) return gamma(form + 1) * Math.pow(gleich() || 1e-300, 1 / form);
    const d = form - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x: number, v: number;
      do { x = normal(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v; const u = gleich();
      if (u < 1 - 0.0331 * x * x * x * x || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  };
  return { gleich, normal, chi2: (df: number) => 2 * gamma(df / 2) };
}

/** Eigenwerte einer symmetrischen Matrix (zyklisches Jacobi-Verfahren), absteigend sortiert. */
export function eigenwerteSym(m: number[][]): number[] {
  const p = m.length, a = m.map(z => [...z]);
  for (let runde = 0; runde < 100; runde++) {
    let aus = 0;
    for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) aus += a[i]![j]! * a[i]![j]!;
    if (aus < 1e-22) break;
    for (let i = 0; i < p - 1; i++) for (let j = i + 1; j < p; j++) {
      const aij = a[i]![j]!; if (Math.abs(aij) < 1e-300) continue;
      const theta = (a[j]![j]! - a[i]![i]!) / (2 * aij);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < p; k++) { const aki = a[k]![i]!, akj = a[k]![j]!; a[k]![i] = c * aki - s * akj; a[k]![j] = s * aki + c * akj; }
      for (let k = 0; k < p; k++) { const aik = a[i]![k]!, ajk = a[j]![k]!; a[i]![k] = c * aik - s * ajk; a[j]![k] = s * aik + c * ajk; }
    }
  }
  return a.map((z, i) => z[i]!).sort((x, y) => y - x);
}

/** Korrelationsmatrix (Pearson) aus vollständigen Zeilen. */
export function korrelationsMatrix(zeilen: number[][]): number[][] {
  const n = zeilen.length, p = zeilen[0]?.length ?? 0;
  const m = Array.from({ length: p }, (_, j) => zeilen.reduce((s, z) => s + z[j]!, 0) / n);
  const c = Array.from({ length: p }, () => Array<number>(p).fill(0));
  for (const z of zeilen) for (let i = 0; i < p; i++) { const di = z[i]! - m[i]!; for (let j = i; j < p; j++) c[i]![j]! += di * (z[j]! - m[j]!); }
  const d = c.map((z, i) => z[i]!);
  for (let i = 0; i < p; i++) for (let j = i; j < p; j++) { const r = i === j ? 1 : c[i]![j]! / Math.sqrt(d[i]! * d[j]!); c[i]![j] = r; c[j]![i] = r; }
  return c;
}

/** Korrelationsmatrix von n normalverteilten, unkorrelierten Zeilen mit p Spalten - über die Bartlett-Zerlegung (siehe oben). */
export function bartlettKorrelation(n: number, p: number, z: ReturnType<typeof zufall>): number[][] {
  const L = Array.from({ length: p }, () => Array<number>(p).fill(0));
  for (let i = 0; i < p; i++) { L[i]![i] = Math.sqrt(z.chi2(n - 1 - i)); for (let j = 0; j < i; j++) L[i]![j] = z.normal(); }
  const w = Array.from({ length: p }, () => Array<number>(p).fill(0));
  for (let i = 0; i < p; i++) for (let j = 0; j <= i; j++) { let s = 0; for (let k = 0; k <= j; k++) s += L[i]![k]! * L[j]![k]!; w[i]![j] = s; w[j]![i] = s; }
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) if (i !== j) w[i]![j] = w[i]![j]! / Math.sqrt(w[i]![i]! * w[j]![j]!);
  for (let i = 0; i < p; i++) w[i]![i] = 1;
  return w;
}

/** R quantile(x, q) mit Typ 7 (Standard in R). */
function quantil7(x: number[], q: number): number {
  const a = [...x].sort((u, v) => u - v), h = (a.length - 1) * q, lo = Math.floor(h);
  return a[lo]! + (h - lo) * ((a[Math.min(lo + 1, a.length - 1)] ?? a[lo]!) - a[lo]!);
}

export const PA_ITER = 100, PA_QUANTIL = 0.95, PA_SEED = 20261010;

/** Parallelanalyse: `eigen` = beobachtete Eigenwerte der Korrelationsmatrix (absteigend), `n` = Personen mit allen Antworten.
 *  `komponenten` = Vorschlag, `schwelle` = 95. Perzentil je Rang. `null` unter 3 Personen mehr als Fragen (Korrelationsmatrix nicht schätzbar). */
export function parallelAnalyse(eigen: number[], n: number, o: { iter?: number; quantil?: number; seed?: number } = {}): { komponenten: number; schwelle: number[] } {
  const p = eigen.length, iter = o.iter ?? PA_ITER, z = zufall(o.seed ?? PA_SEED);
  const werte = Array.from({ length: p }, () => [] as number[]);
  for (let k = 0; k < iter; k++) eigenwerteSym(bartlettKorrelation(n, p, z)).forEach((v, i) => werte[i]!.push(v));
  const schwelle = werte.map(w => quantil7(w, o.quantil ?? PA_QUANTIL));
  const erst = eigen.findIndex((v, i) => !(v > schwelle[i]!));
  return { komponenten: erst < 0 ? p : erst, schwelle };
}
