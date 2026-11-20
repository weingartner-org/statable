/**
 * Q-Methode (B3 Teil 3a): Faktorenanalyse über Personen (Stephenson; Watts & Stenner 2012; qmethod, Zabala 2014).
 * Eingabe: je Person ein Q-Sort (Zahl je Aussage, meist erzwungene Verteilung).
 * Ablauf wie das R-Paket qmethod mit Voreinstellung: Korrelation der Personen (Pearson), Hauptkomponenten,
 * Varimax (Kaiser-normiert, wie stats::varimax), automatisches Markieren, Gewichte f/(1-f²), z-Werte je Aussage,
 * Faktor-Q-Sort nach der erzwungenen Verteilung. Statable deutet nichts: Zahl der Faktoren und Markierungen
 * legt die Person fest (Markierung kann von Hand geändert werden).
 * Vorzeichen: Spalte der Ladungen so gedreht, dass ihre Summe nicht negativ ist.
 * Sollwerte: scripts/qmethode-erwartet.R (qmethod 1.8.4, R 4.6.1), Wächter qmethode.test.ts.
 */
import { eigenSymmetrisch } from './mds';
import { korrelationsMatrix } from './parallelanalyse';

export type QFehler = { fehler: 'zu-wenig-personen' | 'zu-wenig-aussagen' | 'unvollstaendig' | 'konstant' | 'faktorenzahl' };

export interface QErgebnis {
  personen: number;
  aussagen: number;
  faktoren: number;
  /** Alle Q-Sorts haben dieselbe Verteilung (erzwungen). */
  erzwungen: boolean;
  /** Korrelation der Personen. */
  korrelation: number[][];
  /** Eigenwerte der Korrelationsmatrix (alle). */
  eigenwerte: number[];
  /** Ladungen [Person][Faktor] nach Varimax. */
  ladungen: number[][];
  /** Markiert [Person][Faktor] (automatisch oder von der Person übergeben). */
  markiert: boolean[][];
  /** Gewichte [Person][Faktor] = f/(1-f²) für markierte, sonst 0. */
  gewichte: number[][];
  /** z-Werte [Aussage][Faktor] (Mittel 0, Standardabweichung 1 über die Aussagen). */
  z: number[][];
  /** Faktor-Q-Sort [Aussage][Faktor] in der Verteilung des ersten Q-Sorts (nur bei erzwungen). */
  sort: number[][] | null;
  /** Erklärte Varianz je Faktor in Prozent (Summe der quadrierten Ladungen / Personen). */
  erklaert: number[];
  /** Korrelation der Faktor-z-Werte. */
  faktorKorrelation: number[][];
}

const S975 = 1.959963984540054;

/** Varimax wie stats::varimax (normalize = TRUE, eps = 1e-5). */
export function varimax(x: number[][], eps = 1e-5): number[][] {
  const p = x.length, nc = x[0]?.length ?? 0;
  if (nc < 2) return x.map(r => r.slice());
  const sc = x.map(r => Math.sqrt(r.reduce((s, v) => s + v * v, 0)) || 1);
  const xn = x.map((r, i) => r.map(v => v / sc[i]!));
  let T = Array.from({ length: nc }, (_, i) => Array.from({ length: nc }, (_, j) => (i === j ? 1 : 0)));
  let d = 0;
  for (let it = 0; it < 1000; it++) {
    const z = xn.map(r => T[0]!.map((_, j) => r.reduce((s, v, k) => s + v * T[k]![j]!, 0)));
    const sp = Array.from({ length: nc }, (_, j) => z.reduce((s, r) => s + r[j]! * r[j]!, 0));
    // B = x' (z^3 - z diag(sp)/p)
    const m = z.map(r => r.map((v, j) => v * v * v - v * sp[j]! / p));
    const B = Array.from({ length: nc }, (_, i) => Array.from({ length: nc }, (_, j) => xn.reduce((s, r, k) => s + r[i]! * m[k]![j]!, 0)));
    // polare Zerlegung: T = B (B'B)^(-1/2), Summe der Singulärwerte = Spur (B'B)^(1/2)
    const BtB = Array.from({ length: nc }, (_, i) => Array.from({ length: nc }, (_, j) => B.reduce((s, r) => s + r[i]! * r[j]!, 0)));
    const e = eigenSymmetrisch(BtB);
    const invWurzel = Array.from({ length: nc }, (_, i) => Array.from({ length: nc }, (_, j) => e.werte.reduce((s, w, k) => s + (w > 1e-300 ? e.vek[i]![k]! * e.vek[j]![k]! / Math.sqrt(w) : 0), 0)));
    T = Array.from({ length: nc }, (_, i) => Array.from({ length: nc }, (_, j) => B[i]!.reduce((s, v, k) => s + v * invWurzel[k]![j]!, 0)));
    const dAlt = d;
    d = e.werte.reduce((s, w) => s + Math.sqrt(Math.max(w, 0)), 0);
    if (d < dAlt * (1 + eps)) break;
  }
  return xn.map((r, i) => T[0]!.map((_, j) => r.reduce((s, v, k) => s + v * T[k]![j]!, 0) * sc[i]!));
}

/** Automatisches Markieren wie qmethod: |Ladung| über 1,96/√Aussagen und Ladung² größer als die Summe der übrigen Ladung². */
export function qMarkiere(ladungen: number[][], aussagen: number): boolean[][] {
  const schwelle = S975 / Math.sqrt(aussagen);
  return ladungen.map(r => {
    const quad = r.map(v => v * v), summe = quad.reduce((s, v) => s + v, 0);
    return r.map((v, j) => Math.abs(v) > schwelle && quad[j]! > summe - quad[j]!);
  });
}

/** Faktor-z-Werte und Faktor-Q-Sort aus Ladungen und Markierung. */
export function qFaktoren(sorts: number[][], ladungen: number[][], markiert: boolean[][]) {
  const n = sorts.length, k = sorts[0]!.length, nf = ladungen[0]!.length;
  const gewichte = ladungen.map((r, i) => r.map((f, j) => (markiert[i]![j] ? f / (1 - f * f) : 0)));
  const z = Array.from({ length: k }, () => Array<number>(nf).fill(0));
  for (let j = 0; j < nf; j++) {
    const roh = Array.from({ length: k }, (_, a) => sorts.reduce((s, r, i) => s + gewichte[i]![j]! * r[a]!, 0));
    const m = roh.reduce((s, v) => s + v, 0) / k, sd = Math.sqrt(roh.reduce((s, v) => s + (v - m) * (v - m), 0) / (k - 1));
    roh.forEach((v, a) => { z[a]![j] = sd > 0 ? (v - m) / sd : 0; });
  }
  void n;
  return { gewichte, z };
}

export function qRechne(sorts: number[][], faktoren: number, markiertVorgabe?: boolean[][]): QErgebnis | QFehler {
  const n = sorts.length, k = sorts[0]?.length ?? 0;
  if (n < 3) return { fehler: 'zu-wenig-personen' };
  if (k < 8) return { fehler: 'zu-wenig-aussagen' };
  if (sorts.some(r => r.length !== k || r.some(v => typeof v !== 'number' || !Number.isFinite(v)))) return { fehler: 'unvollstaendig' };
  if (sorts.some(r => r.every(v => v === r[0]))) return { fehler: 'konstant' };
  if (!Number.isInteger(faktoren) || faktoren < 1 || faktoren >= n || faktoren > 7) return { fehler: 'faktorenzahl' };
  // Korrelation der Personen: Zeilen = Aussagen, Spalten = Personen
  const spalten = Array.from({ length: k }, (_, a) => sorts.map(r => r[a]!));
  const korrelation = korrelationsMatrix(spalten);
  const e = eigenSymmetrisch(korrelation);
  const roh = korrelation.map((_, i) => Array.from({ length: faktoren }, (_, j) => e.vek[i]![j]! * Math.sqrt(Math.max(e.werte[j]!, 0))));
  const ladungen = varimax(roh);
  for (let j = 0; j < faktoren; j++) {
    if (ladungen.reduce((s, r) => s + r[j]!, 0) < 0) ladungen.forEach(r => { r[j] = -r[j]!; });
  }
  const markiert = markiertVorgabe && markiertVorgabe.length === n && markiertVorgabe.every(r => r.length === faktoren) ? markiertVorgabe : qMarkiere(ladungen, k);
  const { gewichte, z } = qFaktoren(sorts, ladungen, markiert);
  const verteilung = sorts[0]!.slice().sort((a, b) => a - b);
  const erzwungen = sorts.every(r => r.slice().sort((a, b) => a - b).every((v, i) => v === verteilung[i]));
  let sort: number[][] | null = null;
  if (erzwungen) {
    sort = Array.from({ length: k }, () => Array<number>(faktoren).fill(0));
    for (let j = 0; j < faktoren; j++) {
      const ord = z.map((r, a) => a).sort((a, b) => (z[a]![j]! - z[b]![j]!) || (a - b));
      ord.forEach((a, pos) => { sort![a]![j] = verteilung[pos]!; });
    }
  }
  const erklaert = Array.from({ length: faktoren }, (_, j) => 100 * ladungen.reduce((s, r) => s + r[j]! * r[j]!, 0) / n);
  const faktorKorrelation = Array.from({ length: faktoren }, (_, i) => Array.from({ length: faktoren }, (_, j) => {
    if (i === j) return 1;
    const a = z.map(r => r[i]!), b = z.map(r => r[j]!);
    const ma = a.reduce((s, v) => s + v, 0) / k, mb = b.reduce((s, v) => s + v, 0) / k;
    const c = a.reduce((s, v, t) => s + (v - ma) * (b[t]! - mb), 0);
    return c / Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0) * b.reduce((s, v) => s + (v - mb) ** 2, 0));
  }));
  return { personen: n, aussagen: k, faktoren, erzwungen, korrelation, eigenwerte: e.werte, ladungen, markiert, gewichte, z, sort, erklaert, faktorKorrelation };
}
