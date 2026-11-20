/**
 * Einzelfallanalyse (Single-Case, A-B-Design): Kennwerte für den Vergleich von Phase A (Ausgangslage) und Phase B (Förderung).
 * Eigener Code, keine PSPP-Rechnung. Alle Werte gegen R geprüft: scripts/einzelfall-erwartet.R (scan 0.68.1, SingleCaseES), Tests: einzelfall.test.ts.
 *
 * - Mittelwert, Median, SD je Phase.
 * - PND (Scruggs et al. 1987): Anteil der B-Werte, die den besten A-Wert übertreffen (scan::pnd).
 * - NAP (Parker & Vannest 2009): Anteil der Paare (je ein Wert aus A und B), in denen B besser ist; Gleichstand zählt halb.
 *   = Mann-Whitney-U / (nA·nB). 95-%-KI nach Newcombe (Score-Intervall für die AUC, wie SingleCaseES::NAP), p aus dem Mann-Whitney-Test
 *   (Normalnäherung mit Bindungs- und Stetigkeitskorrektur, zweiseitig, wie R wilcox.test(exact = FALSE)).
 * - Tau-U (Parker et al. 2011): (Paare B besser − Paare B schlechter [− Kendall-S der Phase A über die Zeit]) / (nA·nB).
 *   Die Varianz von S und damit p entsprechen scan::tau_u(method = "parker") (Kendall mit Bindungskorrektur).
 * - Baseline-korrigiertes Tau (Tarlow 2017, wie scan::corrected_tau): Prüft den Trend in A (Kendall-τb gegen die Zeit, α = ,05). Ist er bedeutsam,
 *   wird die Theil-Sen-Gerade der Phase A von allen Werten abgezogen; dann τb zwischen den Resten und der Phase. Sonst τb ohne Korrektur.
 * - Richtung: „niedriger = besser“ kehrt die Werte für alle Kennwerte um (Mittelwert, Median bleiben in Originaleinheiten).
 * ⚠ Von der Fachperson abzunehmen: NAP als Hauptwert, Einordnungsgrenzen (Parker & Vannest 2009; Vannest & Ninci 2015; Scruggs 1987), Schwelle für die Autokorrelation.
 */
import { normal } from './verteilung';
import { kleinste, groesste } from './menge';

export type Richtung = 'hoch' | 'tief';

const summe = (a: number[]) => a.reduce((x, y) => x + y, 0);
export const mittel = (a: number[]) => (a.length ? summe(a) / a.length : NaN);
export function median(a: number[]): number {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}
const sd = (a: number[]) => { if (a.length < 2) return NaN; const m = mittel(a); return Math.sqrt(summe(a.map(v => (v - m) ** 2)) / (a.length - 1)); };
const zweiseitig = (z: number) => (Number.isFinite(z) ? 2 * (1 - normal(Math.abs(z))) : NaN);

/* ---------------------------------------------------------------- Kendall */

/** Zahl der Paare (i < j) mit y[i] > y[j] in der Reihenfolge der Liste (streng, Gleiche zählen nicht). Zusammenführen: O(n log n). */
function inversionen(werte: ArrayLike<number>): number {
  const n = werte.length;
  let von = Float64Array.from(werte as ArrayLike<number>), nach = new Float64Array(n), inv = 0;
  for (let breite = 1; breite < n; breite *= 2) {
    for (let lo = 0; lo < n; lo += 2 * breite) {
      const mitte = Math.min(lo + breite, n), hi = Math.min(lo + 2 * breite, n);
      let i = lo, j = mitte, k = lo;
      while (i < mitte && j < hi) { if (von[i]! <= von[j]!) nach[k++] = von[i++]!; else { nach[k++] = von[j++]!; inv += mitte - i; } }
      while (i < mitte) nach[k++] = von[i++]!;
      while (j < hi) nach[k++] = von[j++]!;
    }
    [von, nach] = [nach, von];
  }
  return inv;
}
/** Kendall-S = (gleichgerichtete) − (gegenläufige Paare) in O(n log n) (Knight 1966): S = n0 − Bindungen(x) − Bindungen(y) + gemeinsame Bindungen − 2·Inversionen.
 *  Früher wurden alle n·(n−1)/2 Paare einzeln verglichen (bei 10.000 Messungen 31 s, Abschlusstest A4). Ergebnis ganzzahlig und gleich. */
export function kendallS(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const ord = Array.from({ length: n }, (_, i) => i).sort((i, j) => x[i]! - x[j]! || y[i]! - y[j]!);
  let xtie = 0, gemeinsam = 0, ytie = 0;
  for (let i = 0; i < n;) {
    let j = i; while (j + 1 < n && x[ord[j + 1]!] === x[ord[i]!]) j++;
    xtie += (j - i + 1) * (j - i) / 2;
    for (let k = i; k <= j;) { let l = k; while (l + 1 <= j && y[ord[l + 1]!] === y[ord[k]!]) l++; gemeinsam += (l - k + 1) * (l - k) / 2; k = l + 1; }
    i = j + 1;
  }
  const ys = Float64Array.from(y).sort();
  for (let i = 0; i < n;) { let j = i; while (j + 1 < n && ys[j + 1] === ys[i]) j++; ytie += (j - i + 1) * (j - i) / 2; i = j + 1; }
  const n0 = n * (n - 1) / 2;
  return n0 - xtie - ytie + gemeinsam - 2 * inversionen(ord.map(i => y[i]!));
}

export interface KendallErg { n: number; s: number; tauB: number; varS: number; z: number; p: number }
/** Kendall-S, τb und die Varianz von S mit Bindungskorrektur (wie scan:::kendall_tau, tau_method = "b", ohne Stetigkeitskorrektur). */
export function kendall(x: number[], y: number[]): KendallErg {
  const n = x.length;
  const s = kendallS(x, y);
  const bindungen = (v: number[]) => { const m = new Map<number, number>(); for (const w of v) m.set(w, (m.get(w) ?? 0) + 1); return [...m.values()]; };
  const tx = bindungen(x), ty = bindungen(y), n0 = n * (n - 1) / 2;
  const ti = summe(tx.map(t => t * (t - 1) / 2)), ui = summe(ty.map(t => t * (t - 1) / 2));
  const den = Math.sqrt((n0 - ti) * (n0 - ui));
  const v0 = n * (n - 1) * (2 * n + 5);
  const vt = summe(tx.map(t => t * (t - 1) * (2 * t + 5))), vu = summe(ty.map(t => t * (t - 1) * (2 * t + 5)));
  const v1 = summe(tx.map(t => t * (t - 1))) * summe(ty.map(t => t * (t - 1)));
  const v2 = summe(tx.map(t => t * (t - 1) * (t - 2))) * summe(ty.map(t => t * (t - 1) * (t - 2)));
  const varS = (v0 - vt - vu) / 18 + v1 / (2 * n * (n - 1)) + v2 / (9 * n * (n - 1) * (n - 2));
  const z = varS > 0 ? s / Math.sqrt(varS) : NaN;
  return { n, s, tauB: den > 0 ? s / den : NaN, varS, z, p: zweiseitig(z) };
}

/* ---------------------------------------------------------------- NAP */

export interface Nap { wert: number; se: number; lo: number; hi: number; p: number; paare: number; besser: number; gleich: number; u: number }
/** NAP mit Newcombe-Intervall (SingleCaseES::NAP, SE = "unbiased") und Mann-Whitney-p. a, b in Richtung „höher = besser“. */
export function nap(a: number[], b: number[], niveau = 0.95): Nap {
  const m = a.length, n = b.length;
  // Alle m·n Paare über Sortieren und Halbieren (O(n log n)); Zählungen ganzzahlig und gleich wie die paarweise Rechnung.
  const sb = Float64Array.from(b).sort(), sa = Float64Array.from(a).sort();
  const unter = (s: Float64Array, v: number) => { let lo = 0, hi = s.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (s[mid]! < v) lo = mid + 1; else hi = mid; } return lo; };      // Anzahl < v
  const bis = (s: Float64Array, v: number) => { let lo = 0, hi = s.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (s[mid]! <= v) lo = mid + 1; else hi = mid; } return lo; };        // Anzahl ≤ v
  let besser = 0, gleich = 0;
  for (const x of a) { const k = bis(sb, x); besser += n - k; gleich += k - unter(sb, x); }
  const u = besser + gleich / 2, wert = u / (m * n);
  // Standardfehler (unverzerrt), Q-Matrix wie in SingleCaseES: Zeilen- und Spaltensummen der Matrix (q − wert) in geschlossener Form
  let q1 = 0, q2 = 0;
  for (const x of a) { const k = bis(sb, x), g = k - unter(sb, x), r = (n - k) + g / 2 - n * wert; q1 += r * r; }
  for (const y of b) { const k = unter(sa, y), g = bis(sa, y) - k, c = k + g / 2 - m * wert; q2 += c * c; }
  let xx = (besser + gleich / 4 - 2 * wert * u + m * n * wert * wert);
  q1 /= m * n * n; q2 /= m * m * n; xx /= m * n;
  const tr = 0.5 / (m * n), wt = Math.min(Math.max(wert, tr), 1 - tr);
  const v = m > 1 && n > 1 ? (wt * (1 - wt) + n * q1 + m * q2 - 2 * xx) / ((m - 1) * (n - 1)) : NaN;
  // Newcombe: Nullstellen von f(x) in [0, wert] bzw. [wert, 1]
  const zq = quantilNormal(1 - (1 - niveau) / 2), h = (m + n) / 2 - 1;
  const f = (x: number) => m * n * (wert - x) ** 2 * (2 - x) * (1 + x) - zq * zq * x * (1 - x) * (2 + h + (1 + 2 * h) * x * (1 - x));
  const wurzel = (lo: number, hi: number) => { let l = lo, r = hi; for (let i = 0; i < 80; i++) { const mid = (l + r) / 2; if (Math.sign(f(mid)) === Math.sign(f(l))) l = mid; else r = mid; } return (l + r) / 2; };
  const lo = wert > 0 ? wurzel(0, wert) : 0, hi = wert < 1 ? wurzel(wert, 1) : 1;
  // Mann-Whitney (R: wilcox.test(a, b, exact = FALSE, correct = TRUE))
  const alle = [...a, ...b], t = new Map<number, number>(); for (const w of alle) t.set(w, (t.get(w) ?? 0) + 1);
  const bind = summe([...t.values()].map(c => c ** 3 - c)), N = m + n;
  // U aus Sicht von A: Paare, in denen A größer ist, plus halbe Gleichstände = m·n − u
  const uA = m * n - u, zr = uA - m * n / 2, korr = Math.sign(zr) * 0.5;
  const sigma = Math.sqrt(m * n / 12 * ((N + 1) - bind / (N * (N - 1))));
  const zz = sigma > 0 ? (zr - korr) / sigma : NaN;
  const p = Number.isFinite(zz) ? Math.min(1, 2 * Math.min(normal(zz), 1 - normal(zz))) : NaN;
  return { wert, se: Math.sqrt(v), lo, hi, p, paare: m * n, besser, gleich, u };
}

/** Quantil der Standardnormalverteilung (Bisektion auf `normal`). */
export function quantilNormal(p: number): number {
  let lo = -10, hi = 10;
  for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (normal(mid) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/* ---------------------------------------------------------------- Tau-U */

export interface TauU { wert: number; s: number; z: number; p: number; paare: number; pos: number; neg: number }
/** Tau-U nach Parker et al. (2011): A gegen B, optional minus Trend in A. Wie scan::tau_u(method = "parker"). */
export function tauU(a: number[], b: number[], mitTrend: boolean): TauU {
  const nA = a.length, nB = b.length, ab = [...a, ...b];
  // Paare A–B über Sortieren und Halbieren, Kendall-S der Phase A über die Zeit in O(n log n) (Abschlusstest A4; vorher alle Paare einzeln)
  const sb = Float64Array.from(b).sort();
  const unter = (v: number) => { let lo = 0, hi = sb.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sb[mid]! < v) lo = mid + 1; else hi = mid; } return lo; };
  const bis = (v: number) => { let lo = 0, hi = sb.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sb[mid]! <= v) lo = mid + 1; else hi = mid; } return lo; };
  let pos = 0, neg = 0;
  for (const x of a) { pos += nB - bis(x); neg += unter(x); }
  const sA = kendallS(a, a.map((_, i) => i + 1));
  const paare = nA * nB;
  if (!mitTrend) {
    const k = kendall(ab, [...a.map(() => 0), ...b.map(() => 1)]);
    return { wert: (pos - neg) / paare, s: pos - neg, z: k.z, p: k.p, paare, pos, neg };
  }
  const k = kendall(ab, [...a.map((_, i) => nA - i), ...b.map(() => nA + 1)]);
  return { wert: (pos - neg - sA) / paare, s: pos - neg - sA, z: k.z, p: k.p, paare, pos, neg };
}

/* ---------------------------------------------------------------- Baseline-korrigiertes Tau */

/** Bis zu dieser Zahl von Punktpaaren werden alle Steigungen einzeln berechnet (wie bisher); darüber zählt ein O(n log n)-Verfahren (siehe `medianSteigung`). */
const THEIL_SEN_PAARE = 2_000_000;
/**
 * Median aller Steigungen (y[j] − y[i]) / (x[j] − x[i]), i < j, bei streng aufsteigendem x, ohne die Paare aufzuzählen (Abschlusstest A4):
 * Wie viele Steigungen größer als s sind, ist die Zahl der Paare i < j mit z[j] > z[i] für z = y − s·x - das zählt ein Zusammenführen in O(n log n).
 * Eine Halbierung über s findet damit die k-te Steigung auf Gleitkomma-Genauigkeit (die Ergebnisse stimmen bis zur letzten Stelle).
 */
function medianSteigung(x: number[], y: number[]): number {
  const n = x.length, paare = n * (n - 1) / 2;
  const minDx = x.reduce((m, v, i) => (i ? Math.min(m, v - x[i - 1]!) : m), Infinity);
  const spanne = (Math.max(groesste(y)) - Math.min(kleinste(y))) / minDx;
  const z = new Float64Array(n);
  const hoeherAls = (s: number) => { for (let i = 0; i < n; i++) z[i] = y[i]! - s * x[i]!; return inversionenAbsteigend(z); };   // Paare mit Steigung > s
  /** Die k-te kleinste Steigung (k ab 1): kleinstes s, für das mindestens k Steigungen ≤ s sind. */
  const kte = (k: number) => {
    let lo = -spanne - 1, hi = spanne + 1;
    for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (mid <= lo || mid >= hi) break; if (paare - hoeherAls(mid) >= k) hi = mid; else lo = mid; }
    return hi;
  };
  return paare % 2 ? kte((paare + 1) / 2) : (kte(paare / 2) + kte(paare / 2 + 1)) / 2;
}
/** Paare i < j mit z[j] > z[i] (aufsteigende Paare). */
function inversionenAbsteigend(z: Float64Array): number { return inversionen(z.map(v => -v)); }
/** Theil-Sen-Gerade (Median der Steigungen aller Punktpaare, Achsenabschnitt als Median der Reste). x sind die Zeitpunkte. `schwelle`: ab so vielen Paaren das schnelle Verfahren (nur für Tests änderbar). */
export function theilSen(x: number[], y: number[], schwelle = THEIL_SEN_PAARE): { steigung: number; achse: number } {
  const n = x.length;
  let steigung: number;
  if (n * (n - 1) / 2 > schwelle && x.every((v, i) => !i || v > x[i - 1]!)) steigung = medianSteigung(x, y);
  else {
    const st: number[] = [];
    for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) if (x[j] !== x[i]) st.push((y[j]! - y[i]!) / (x[j]! - x[i]!));
    steigung = st.length ? median(st) : 0;
  }
  return { steigung, achse: median(y.map((v, i) => v - steigung * x[i]!)) };
}

export interface BcTau {
  /** τ der Basislinie gegen die Zeit (Trend in A) und sein p */
  trendTau: number; trendP: number;
  unkorrigiert: { tau: number; z: number; p: number };
  korrigiert: { tau: number; z: number; p: number };
  /** wurde korrigiert (Trend in A bedeutsam)? */
  angewendet: boolean;
  /** der berichtete Wert: korrigiert, wenn angewendet, sonst unkorrigiert */
  tau: number; p: number;
  steigung: number; achse: number;
}
/** Baseline corrected Tau (Tarlow 2017), α = ,05 für den Trendtest. Zeitpunkte sind 1…n. */
export function bcTau(a: number[], b: number[], alpha = 0.05): BcTau {
  const y = [...a, ...b], x = y.map((_, i) => i + 1), phase = y.map((_, i) => (i < a.length ? 1 : 2));
  const trend = a.length >= 3 && new Set(a).size > 1 ? kendall(a, a.map((_, i) => i + 1)) : null;
  const ts = theilSen(x.slice(0, a.length), a);
  const unk = kendall(y, phase), kor = kendall(y.map((v, i) => v - (ts.achse + ts.steigung * x[i]!)), phase);
  const angewendet = !!trend && Number.isFinite(trend.p) && trend.p <= alpha;
  const w = angewendet ? kor : unk;
  return {
    trendTau: trend?.tauB ?? NaN, trendP: trend?.p ?? NaN,
    unkorrigiert: { tau: unk.tauB, z: unk.z, p: unk.p }, korrigiert: { tau: kor.tauB, z: kor.z, p: kor.p },
    angewendet, tau: w.tauB, p: w.p, steigung: ts.steigung, achse: ts.achse
  };
}

/* ---------------------------------------------------------------- PND, Autokorrelation */

/** PND: Anteil der B-Werte, die den besten A-Wert übertreffen (höher = besser). */
export function pnd(a: number[], b: number[]): number {
  if (!a.length || !b.length) return NaN;
  const m = Math.max(groesste(a));
  return b.filter(v => v > m).length / b.length;
}
/** Autokorrelation (Lag 1) der Reste um die Phasenmittelwerte; nur als Hinweis. NaN bei weniger als 4 Werten. */
export function autokorrelation(a: number[], b: number[]): number {
  const reste = [a, b].map(p => { const m = mittel(p); return p.map(v => v - m); });
  let zaehler = 0, nenner = 0;
  for (const r of reste) { for (let i = 0; i < r.length - 1; i++) zaehler += r[i]! * r[i + 1]!; nenner += summe(r.map(v => v * v)); }
  return a.length + b.length >= 4 && nenner > 0 ? zaehler / nenner : NaN;
}

/* ---------------------------------------------------------------- Ein Fall, mehrere Fälle */

export interface Phase { n: number; m: number; sd: number; median: number; min: number; max: number }
export interface Fall {
  name: string;
  /** Messwerte in zeitlicher Reihenfolge, wie in den Daten; istB[i]: gehört Messung i zu Phase B? */
  y: number[]; istB: boolean[];
  a: Phase; b: Phase;
  pnd: number; nap: Nap; tauU: TauU; tauUTrend: TauU; bc: BcTau;
  /** Theil-Sen-Trend je Phase (Steigung je Messzeitpunkt) */
  trendA: number; trendB: number;
  /** Trend in A läuft in Richtung „besser“? (nur sinnvoll, wenn bc.trendP ≤ ,05) */
  trendAbesser: boolean;
  auto: number;
}
const phase = (v: number[]): Phase => ({ n: v.length, m: mittel(v), sd: sd(v), median: median(v), min: v.length ? Math.min(kleinste(v)) : NaN, max: v.length ? Math.max(groesste(v)) : NaN });

/** Alle Kennwerte eines Falls. y in Zeitreihenfolge, istB je Messung. */
export function rechneFall(name: string, y: number[], istB: boolean[], richtung: Richtung): Fall {
  const v = richtung === 'tief' ? y.map(w => -w) : y;
  const aR = y.filter((_, i) => !istB[i]), bR = y.filter((_, i) => istB[i]);
  const a = v.filter((_, i) => !istB[i]), b = v.filter((_, i) => istB[i]);
  const bc = bcTau(a, b);
  return {
    name, y, istB, a: phase(aR), b: phase(bR),
    pnd: pnd(a, b), nap: nap(a, b), tauU: tauU(a, b, false), tauUTrend: tauU(a, b, true), bc,
    trendA: theilSen(aR.map((_, i) => i + 1), aR).steigung, trendB: theilSen(bR.map((_, i) => i + 1), bR).steigung,
    trendAbesser: bc.steigung > 0, auto: autokorrelation(a, b)
  };
}

/** gleich: Gehen alle Fälle in dieselbe Richtung (B besser als A bzw. B schlechter als A)? Nur dann ist ein Mittel über die Fälle sinnvoll. */
export interface Gesamt { gleich: boolean; nBesser: number; nSchlechter: number; n: number; nap: number; napMin: number; napMax: number; pnd: number; tauU: number; tauUTrend: number; bc: number; bcMin: number; bcMax: number; diff: number }
const mm = (v: number[]) => v.filter(Number.isFinite);

export interface Einzelfall {
  art: 'einzelfall';
  /** Spaltennamen */
  mess: string; phase: string; zeit: string; fall: string;
  richtung: Richtung;
  /** Anzeigenamen der beiden Phasen (Werte der Phasenspalte): A zuerst */
  phasenA: string; phasenB: string;
  faelle: Fall[];
  /** Mittel der Kennwerte über die Fälle (nur bei mehr als einem Fall; gezeigt nur, wenn `gleich`) */
  gesamt: Gesamt | null;
  /** Linien im Verlaufsdiagramm */
  linien: 'keine' | 'mittel' | 'trend';
  /** Zeilen der Daten insgesamt, ausgelassene (ohne Messwert oder Phase) */
  zeilen: number; ausgelassen: number;
}

export function gesamtVon(faelle: Fall[], richtung: Richtung = 'hoch'): Gesamt | null {
  if (faelle.length < 2) return null;
  const vz = richtung === 'tief' ? -1 : 1;
  const nBesser = faelle.filter(f => (f.b.m - f.a.m) * vz > 0).length, nSchlechter = faelle.filter(f => (f.b.m - f.a.m) * vz < 0).length;
  const n = (f: (x: Fall) => number) => mm(faelle.map(f));
  const me = (v: number[]) => (v.length ? mittel(v) : NaN);
  const naps = n(f => f.nap.wert), bcs = n(f => f.bc.tau);
  return {
    gleich: nBesser === 0 || nSchlechter === 0, nBesser, nSchlechter,
    n: faelle.length, nap: me(naps), napMin: Math.min(kleinste(naps)), napMax: Math.max(groesste(naps)),
    pnd: me(n(f => f.pnd)), tauU: me(n(f => f.tauU.wert)), tauUTrend: me(n(f => f.tauUTrend.wert)),
    bc: me(bcs), bcMin: Math.min(kleinste(bcs)), bcMax: Math.max(groesste(bcs)),
    diff: me(n(f => f.b.m - f.a.m))
  };
}

export interface RohFall { name: string; y: number[]; istB: boolean[] }
export function einzelfallAus(roh: RohFall[], kopf: Pick<Einzelfall, 'mess' | 'phase' | 'zeit' | 'fall' | 'phasenA' | 'phasenB' | 'zeilen' | 'ausgelassen'>, richtung: Richtung = 'hoch', linien: Einzelfall['linien'] = 'mittel'): Einzelfall {
  const faelle = roh.map(r => rechneFall(r.name, r.y, r.istB, richtung));
  return { art: 'einzelfall', ...kopf, richtung, faelle, gesamt: gesamtVon(faelle, richtung), linien };
}
/** Dieselben Daten mit anderer Richtung neu rechnen (Umschalter im Blatt). */
export const einzelfallMit = (e: Einzelfall, richtung: Richtung): Einzelfall => einzelfallAus(e.faelle.map(f => ({ name: f.name, y: f.y, istB: f.istB })), e, richtung, e.linien);

/* ---------------------------------------------------------------- Daten → Fälle */

export interface Zeile { mess: number | null; phase: string | number | null; zeit?: string | number | null; fall?: string | number | null }
export interface Aufbau {
  faelle: RohFall[]; phasenA: string; phasenB: string; ausgelassen: number;
  /** Probleme, die ein sinnvolles Rechnen verhindern bzw. Hinweise */
  wechselt: string[];   // Fälle, in denen die Phasen mehrfach wechseln
  ohnePhase: string[];  // Fälle, in denen A oder B fehlt
}
/**
 * Zeilen → Fälle: je Fall nach Messzeitpunkt (sonst Zeilenfolge) sortiert; A ist die Phase, die in der Zeitfolge zuerst kommt (beim ersten Fall).
 * @param name Anzeige der Phasenwerte
 */
export function baueFaelle(zeilen: Zeile[], name: (w: string | number) => string = String, fallName: (w: string | number) => string = String): Aufbau {
  const ok = zeilen.map((z, i) => ({ ...z, i })).filter(z => z.mess !== null && Number.isFinite(z.mess) && z.phase !== null && z.phase !== '');
  const gruppen = new Map<string, typeof ok>();
  for (const z of ok) { const k = z.fall === null || z.fall === undefined || z.fall === '' ? '' : String(z.fall); const g = gruppen.get(k) ?? []; g.push(z); gruppen.set(k, g); }
  const vergleich = (x: typeof ok[number], y: typeof ok[number]) => {
    const a = x.zeit, b = y.zeit;
    if (a !== null && a !== undefined && b !== null && b !== undefined && a !== '' && b !== '' && a !== b) return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
    return x.i - y.i;
  };
  const sortiert = [...gruppen].map(([k, g]) => [k, [...g].sort(vergleich)] as const);
  const erste = sortiert[0]?.[1][0]?.phase;
  const phasenWerte = [...new Set(ok.map(z => String(z.phase)))];
  const a = erste === undefined ? '' : String(erste), b = phasenWerte.find(w => w !== a) ?? '';
  const wechselt: string[] = [], ohnePhase: string[] = [];
  const faelle: RohFall[] = sortiert.map(([k, g]) => {
    const istB = g.map(z => String(z.phase) === b), anzeige = k === '' ? '' : fallName(k);
    let wechsel = 0; for (let i = 1; i < istB.length; i++) if (istB[i] !== istB[i - 1]) wechsel++;
    if (wechsel > 1 || (istB.length && istB[0])) wechselt.push(anzeige);
    if (!istB.some(x => x) || istB.every(x => x)) ohnePhase.push(anzeige);
    return { name: anzeige, y: g.map(z => z.mess as number), istB };
  });
  void name;
  return { faelle, phasenA: a, phasenB: b, ausgelassen: zeilen.length - ok.length, wechselt, ohnePhase };
}

/* ---------------------------------------------------------------- Einordnung */

/** NAP nach Parker & Vannest (2009): 0–,65 schwach, ,66–,92 mittel, ,93–1 stark (Wirkung). */
export const napStufe = (v: number): 'schwach' | 'mittel' | 'stark' => (v >= 0.93 ? 'stark' : v >= 0.66 ? 'mittel' : 'schwach');
/** Tau nach Vannest & Ninci (2015): bis ,20 klein, bis ,60 mittel, bis ,80 groß, darüber sehr groß (Betrag). */
export const tauStufe = (v: number): 'klein' | 'mittel' | 'groß' | 'sehr groß' => (Math.abs(v) > 0.8 ? 'sehr groß' : Math.abs(v) > 0.6 ? 'groß' : Math.abs(v) > 0.2 ? 'mittel' : 'klein');
/** PND nach Scruggs & Mastropieri (1998): über 90 % sehr wirksam, 70–90 wirksam, 50–70 fraglich, darunter unwirksam. */
export const pndStufe = (v: number): 'sehr wirksam' | 'wirksam' | 'fraglich' | 'unwirksam' => (v > 0.9 ? 'sehr wirksam' : v >= 0.7 ? 'wirksam' : v >= 0.5 ? 'fraglich' : 'unwirksam');
