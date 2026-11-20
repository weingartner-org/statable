/**
 * Propensity-Score-Matching (S-H, 22.10.2026), reines JavaScript: Gruppen vergleichbar machen, wenn Personen nicht zufällig zugeteilt wurden.
 *   1. Propensity Score: logistische Regression (IRLS) der Zugehörigkeit zur Behandlungsgruppe auf die gewählten Merkmale; Abstand = Logit des Scores (linearer Prädiktor).
 *   2. 1:1-Zuordnung ohne Zurücklegen, gieriges Nächster-Nachbar-Verfahren: die Behandelten werden vom größten Score an abgearbeitet (wie MatchIt `m.order = "largest"`),
 *      jeder bekommt die nächste noch freie Kontrollperson; mit Caliper (Vorgabe in Standardabweichungen des Logits) kein Paar, wenn der Abstand größer ist.
 *   3. Ausgleich je Merkmal: standardisierte Mittelwertdifferenz vor und nach dem Matching (Nenner: Standardabweichung der Behandelten vor dem Matching, wie MatchIt/cobalt).
 *   4. Wirkung auf das Ergebnis: mittlere Differenz der Paare (ATT) mit t-Test für gepaarte Werte.
 * Sollwerte: R `MatchIt::matchit(…, method = "nearest", distance = "glm", link = "linear.logit", ratio = 1, replace = FALSE)`, siehe matching.test.ts.
 * ⚠ Von der Fachperson abzunehmen: Standardvorgaben (kein Caliper, 1:1, ohne Zurücklegen), die Grenze 0,1 für gut ausgeglichene Merkmale (Austin 2011) und die Hinweise.
 */
import { betai } from './verteilung';

export interface MatchEingabe { y: number[]; behandelt: boolean[]; x: number[][]; namenX: string[] }
export interface MatchAusgleich { name: string; mittelB: number; mittelK: number; smdVorher: number; mittelBMatch: number; mittelKMatch: number; smdNachher: number }
export interface MatchErgebnis {
  nB: number; nK: number; paare: number; ohnePartner: number; n: number;
  /** Positionen (0-basiert in den Eingabedaten) der Paare */
  paarB: number[]; paarK: number[];
  koeff: number[]; konvergiert: boolean;
  ausgleich: MatchAusgleich[];
  /** ungleichgewichtig vor/nach dem Matching: größte |SMD| */
  maxSmdVorher: number; maxSmdNachher: number;
  /** Wirkung: Mittelwert der Paar-Differenzen (Behandelte − Kontrolle), Standardfehler, t, df, p, 95 %-KI; naive Differenz ohne Matching */
  att: number; se: number; t: number; df: number; p: number; lo: number; hi: number; naiv: number;
  /** Überlappung der Scores: Anteil der Behandelten, deren Score über dem größten der Kontrollen (oder unter dem kleinsten) liegt */
  ausserhalb: number;
}
export type MatchFehler = { fehler: 'zu-wenig' | 'eine-gruppe' | 'keine-merkmale' | 'singulaer' | 'trennung' | 'keine-paare' };

function loese(a: number[][], b: number[]): number[] | null {
  const k = a.length, m = a.map((z, i) => [...z, b[i]!]);
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(m[r]![c]!) > Math.abs(m[p]![c]!)) p = r;
    if (Math.abs(m[p]![c]!) < 1e-12) return null;
    [m[c], m[p]] = [m[p]!, m[c]!];
    for (let r = c + 1; r < k; r++) { const f = m[r]![c]! / m[c]![c]!; for (let j = c; j <= k; j++) m[r]![j]! -= f * m[c]![j]!; }
  }
  const z = Array(k).fill(0);
  for (let r = k - 1; r >= 0; r--) { let s = m[r]![k]!; for (let j = r + 1; j < k; j++) s -= m[r]![j]! * z[j]!; z[r] = s / m[r]![r]!; }
  return z;
}
/** Logistische Regression (IRLS); `x` ohne Konstante. Rückgabe: Koeffizienten [Konstante, …], konvergiert? */
export function logistik(y: number[], x: number[][]): { koeff: number[]; konvergiert: boolean } | null {
  const n = y.length, k = (x[0]?.length ?? 0) + 1;
  const X = x.map(r => [1, ...r]);
  let b = Array(k).fill(0), konv = false;
  for (let it = 0; it < 100; it++) {
    const eta = X.map(r => r.reduce((s, v, j) => s + v * b[j]!, 0)), mu = eta.map(e => 1 / (1 + Math.exp(-e)));
    const w = mu.map(m => Math.max(m * (1 - m), 1e-10));
    const A = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((s, r, t) => s + r[i]! * r[j]! * w[t]!, 0)));
    const g = Array.from({ length: k }, (_, i) => X.reduce((s, r, t) => s + r[i]! * (y[t]! - mu[t]!), 0));
    const d = loese(A, g); if (!d) return null;
    b = b.map((v, j) => v + d[j]!);
    if (Math.max(...d.map(Math.abs)) < 1e-10) { konv = true; break; }
  }
  return b.every(Number.isFinite) ? { koeff: b, konvergiert: konv && n > 0 } : null;
}
const mittel = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const sd = (v: number[]) => { const m = mittel(v); return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)); };

export function propensityMatching(e: MatchEingabe, opt: { caliper?: number } = {}): MatchErgebnis | MatchFehler {
  const n = e.y.length;
  if (e.namenX.length < 1) return { fehler: 'keine-merkmale' };
  const nB = e.behandelt.filter(Boolean).length, nK = n - nB;
  if (nB < 2 || nK < 2) return { fehler: 'eine-gruppe' };
  if (n < e.namenX.length * 5 + 10) return { fehler: 'zu-wenig' };
  const fit = logistik(e.behandelt.map(b => (b ? 1 : 0)), e.x);
  if (!fit) return { fehler: 'singulaer' };
  const logit = e.x.map(r => fit.koeff[0]! + r.reduce((s, v, j) => s + v * fit.koeff[j + 1]!, 0));
  if (logit.some(v => Math.abs(v) > 30)) return { fehler: 'trennung' };
  const cal = opt.caliper && opt.caliper > 0 ? opt.caliper * sd(logit) : Infinity;
  const behandelte = e.behandelt.map((b, i) => (b ? i : -1)).filter(i => i >= 0).sort((a, b) => logit[b]! - logit[a]! || a - b);
  const frei = new Set(e.behandelt.map((b, i) => (b ? -1 : i)).filter(i => i >= 0));
  const paarB: number[] = [], paarK: number[] = [];
  for (const t of behandelte) {
    let best = -1, bd = Infinity;
    for (const c of frei) { const dd = Math.abs(logit[c]! - logit[t]!); if (dd < bd || (dd === bd && c < best)) { bd = dd; best = c; } }
    if (best >= 0 && bd <= cal) { paarB.push(t); paarK.push(best); frei.delete(best); }
  }
  if (paarB.length < 2) return { fehler: 'keine-paare' };
  const idxB = e.behandelt.map((b, i) => (b ? i : -1)).filter(i => i >= 0), idxK = e.behandelt.map((b, i) => (b ? -1 : i)).filter(i => i >= 0);
  const ausgleich: MatchAusgleich[] = e.namenX.map((name, j) => {
    const col = (ix: number[]) => ix.map(i => e.x[i]![j]!), sB = sd(col(idxB));
    const mB = mittel(col(idxB)), mK = mittel(col(idxK)), mBm = mittel(col(paarB)), mKm = mittel(col(paarK));
    return { name, mittelB: mB, mittelK: mK, smdVorher: (mB - mK) / sB, mittelBMatch: mBm, mittelKMatch: mKm, smdNachher: (mBm - mKm) / sB };
  });
  const diff = paarB.map((t, i) => e.y[t]! - e.y[paarK[i]!]!), m = paarB.length, att = mittel(diff), se = sd(diff) / Math.sqrt(m), df = m - 1;
  const t = att / se, p = 2 * tUpper(Math.abs(t), df), tq = tQuantil(0.975, df);
  const sc = (ix: number[]) => ix.map(i => logit[i]!), minK = Math.min(...sc(idxK)), maxK = Math.max(...sc(idxK));
  return {
    nB, nK, paare: m, ohnePartner: nB - m, n, paarB, paarK, koeff: fit.koeff, konvergiert: fit.konvergiert, ausgleich,
    maxSmdVorher: Math.max(...ausgleich.map(a => Math.abs(a.smdVorher))), maxSmdNachher: Math.max(...ausgleich.map(a => Math.abs(a.smdNachher))),
    att, se, t, df, p, lo: att - tq * se, hi: att + tq * se,
    naiv: mittel(idxB.map(i => e.y[i]!)) - mittel(idxK.map(i => e.y[i]!)),
    ausserhalb: idxB.filter(i => logit[i]! > maxK || logit[i]! < minK).length / nB
  };
}

/* t-Verteilung: obere Fläche über die unvollständige Betafunktion und Quantil per Bisektion (lokal, klein gehalten). */
function tUpper(t: number, df: number): number { return 0.5 * betai(df / 2, 0.5, df / (df + t * t)); }
function tQuantil(p: number, df: number): number { let lo = 0, hi = 100; for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (1 - tUpper(mid, df) < p) lo = mid; else hi = mid; } return (lo + hi) / 2; }
