/**
 * Delphi-Befragung (B3 Teil 2a): Kennzahlen je Aussage, Konsens nach vorab festgelegter Regel,
 * Kendalls W über die Fachleute, Vergleich zweier Runden.
 * Statable deutet nichts: Die Regel für „Konsens“ legt die Person vorher fest (Hsu & Sandford 2007).
 * Sollwerte: scripts/delphi-erwartet.R (Basis-R, R 4.6.1), Wächter delphi.test.ts.
 */
import { chiQuadratP } from './verteilung';

export type Bewertung = number | null;

export interface DelphiRegel {
  /** Größter erlaubter Quartilsabstand (IQR), z. B. 1 bei fünf Stufen; null = nicht prüfen. */
  maxIqr: number | null;
  /** Bereich, in dem die Bewertungen liegen sollen (z. B. 4 bis 5 = Zustimmung); null = nicht prüfen. */
  band: [number, number] | null;
  /** Kleinster Anteil der Bewertungen im Bereich (0 bis 1), z. B. 0,75. */
  minAnteil: number;
}

export interface DelphiZeile {
  n: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  mittel: number;
  sd: number;
  /** Anteil der Bewertungen im Bereich der Regel (null, wenn kein Bereich gesetzt). */
  anteil: number | null;
  /** Erfüllt die Regel (alle gesetzten Teile). Bei n = 0 immer false. */
  konsens: boolean;
}

export interface KendallW {
  /** Fachleute mit vollständigen Bewertungen (nur diese zählen). */
  m: number;
  /** Aussagen. */
  k: number;
  w: number;
  chi2: number;
  df: number;
  p: number;
}

/** Quantil wie R type 7 (Vorgabe von quantile). */
export function quantil(werte: number[], p: number): number {
  const x = werte.slice().sort((a, b) => a - b);
  if (x.length === 0) return NaN;
  const h = (x.length - 1) * p;
  const u = Math.floor(h);
  const o = Math.min(u + 1, x.length - 1);
  return x[u] + (h - u) * (x[o] - x[u]);
}

function gueltig(w: Bewertung): w is number {
  return typeof w === 'number' && Number.isFinite(w);
}

/** Kennzahlen je Aussage (Spalte). `zeilen` = Fachleute, `spalten` = Aussagen. */
export function delphiKennzahlen(bew: Bewertung[][], regel: DelphiRegel): DelphiZeile[] {
  const k = Math.max(0, ...bew.map(z => z.length));
  const aus: DelphiZeile[] = [];
  for (let j = 0; j < k; j++) {
    const x = bew.map(z => z[j]).filter(gueltig);
    const n = x.length;
    if (n === 0) {
      aus.push({ n: 0, median: NaN, q1: NaN, q3: NaN, iqr: NaN, mittel: NaN, sd: NaN, anteil: null, konsens: false });
      continue;
    }
    const mittel = x.reduce((a, b) => a + b, 0) / n;
    const sd = n > 1 ? Math.sqrt(x.reduce((a, b) => a + (b - mittel) ** 2, 0) / (n - 1)) : NaN;
    const q1 = quantil(x, 0.25);
    const q3 = quantil(x, 0.75);
    const median = quantil(x, 0.5);
    const iqr = q3 - q1;
    const anteil = regel.band ? x.filter(v => v >= regel.band![0] && v <= regel.band![1]).length / n : null;
    let konsens = regel.maxIqr !== null || regel.band !== null;
    if (regel.maxIqr !== null && !(iqr <= regel.maxIqr + 1e-12)) konsens = false;
    if (anteil !== null && !(anteil >= regel.minAnteil - 1e-12)) konsens = false;
    aus.push({ n, median, q1, q3, iqr, mittel, sd, anteil, konsens });
  }
  return aus;
}

function raenge(x: number[]): number[] {
  const idx = x.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(x.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const mitte = (i + j) / 2 + 1;
    for (let t = i; t <= j; t++) r[idx[t][1]] = mitte;
    i = j + 1;
  }
  return r;
}

/** Kendalls W (mit Bindungskorrektur) über Fachleute mit vollständigen Bewertungen; null, wenn nicht berechenbar. */
export function kendallW(bew: Bewertung[][]): KendallW | null {
  const k = Math.max(0, ...bew.map(z => z.length));
  const voll = bew.filter(z => z.length === k && z.every(gueltig)) as number[][];
  const m = voll.length;
  if (m < 2 || k < 3) return null;
  const summe = new Array<number>(k).fill(0);
  let t = 0;
  for (const z of voll) {
    const r = raenge(z);
    r.forEach((v, j) => (summe[j] += v));
    const zaehl = new Map<number, number>();
    z.forEach(v => zaehl.set(v, (zaehl.get(v) ?? 0) + 1));
    zaehl.forEach(c => (t += c ** 3 - c));
  }
  const mw = (m * (k + 1)) / 2;
  const s = summe.reduce((a, b) => a + (b - mw) ** 2, 0);
  const nenner = m * m * (k ** 3 - k) - m * t;
  if (nenner <= 0) return null;
  const w = (12 * s) / nenner;
  const chi2 = m * (k - 1) * w;
  return { m, k, w, chi2, df: k - 1, p: chiQuadratP(chi2, k - 1) };
}

export interface RundenVergleich {
  medianAenderung: number;
  iqrAenderung: number;
  anteilAenderung: number | null;
  /** Konsens neu erreicht, gehalten, verloren oder weiter offen. */
  wechsel: 'neu' | 'gehalten' | 'verloren' | 'offen';
}

/** Vergleicht zwei Runden Aussage für Aussage (gleiche Reihenfolge der Aussagen). */
export function rundenVergleich(vorher: DelphiZeile[], nachher: DelphiZeile[]): RundenVergleich[] {
  return nachher.map((b, j) => {
    const a = vorher[j];
    if (!a) return { medianAenderung: NaN, iqrAenderung: NaN, anteilAenderung: null, wechsel: b.konsens ? 'neu' : 'offen' };
    const wechsel = a.konsens ? (b.konsens ? 'gehalten' : 'verloren') : b.konsens ? 'neu' : 'offen';
    return {
      medianAenderung: b.median - a.median,
      iqrAenderung: b.iqr - a.iqr,
      anteilAenderung: a.anteil !== null && b.anteil !== null ? b.anteil - a.anteil : null,
      wechsel,
    };
  });
}
