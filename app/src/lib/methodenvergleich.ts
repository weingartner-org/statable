/**
 * Methodenvergleich (Später, Welle S-F, M6): Passing-Bablok und Deming für zwei Messverfahren an denselben Proben.
 * Fachblatt docs/fachblaetter/SPAETER-F-UEBERLEBEN-MEDIZIN.md, Abschnitt 4 und „Entscheidungen Opus (18.10.)“ 5. Reine Funktionen in JS (kein R, kein PSPP, keine Spaltennamen).
 *
 * Passing-Bablok: Schritt für Schritt wie R `mcr::calc_PaBa` (mcr 1.3.3.1): Winkel atan(dy/dx) aller Paare mit Toleranz-Differenz, identische Paare weggelassen, Verschiebung durch Winkel ≤ −π/4 und < −π/4,
 *   „Median“ über Ränge, Winkelmaß „radian“ (Mittel zweier Winkel), Intervall analytisch nach Passing & Bablok (C auf eine ganze Zahl gerundet), Konstante = Median(y − b·x).
 *   Die Vorgabe „Gleiche Werte bis auf 1e-12 sind gleich“ gilt auch für die Reste des Cusum. Cusum: NUR Statistik und Residuenbild, KEIN p (Opus 5: die Kolmogorov-Form des p ist am Original nicht belegt).
 * Deming: Linnet (1990), Jackknife-Intervall mit t(n − 2) wie mcr (`mc.calcLinnetCI`); λ = Fehlervarianz der waagerechten Achse (x) geteilt durch die der senkrechten (y).
 * Gesperrt (Opus 5): Passing-Bablok bei Werten < 0 (wie mcr) und bei Kendalls τ ≤ 0; n höchstens 4000. Kein Vergleich mit der gewöhnlichen Regression.
 * Die Funktionen werfen nie; wo etwas nicht bestimmbar ist, steht `null` (nie NaN).
 */
import { tQuantil } from './verteilung';
import { qnorm } from './diagrammdaten';

export const MV_MAX_N = 4000;
export const MV_MIN_N = 10;
const TOL = 1e-12;

export interface Cusum { L: number; M: number; max: number; h: number; reihe: number[] }
export interface PbErgebnis {
  konstante: number; konstanteUnten: number | null; konstanteOben: number | null;
  steigung: number; steigungUnten: number | null; steigungOben: number | null;
  anzahlSteigungen: number; cusum: Cusum; residuen: number[];
}
export interface DemingErgebnis {
  lambda: number;
  konstante: number; konstanteSE: number; konstanteUnten: number; konstanteOben: number;
  steigung: number; steigungSE: number; steigungUnten: number; steigungOben: number;
}

const medianVon = (v: number[]): number => {
  const a = Float64Array.from(v).sort(), n = a.length;
  if (n === 0) return NaN;
  return n % 2 ? a[(n - 1) / 2]! : (a[n / 2 - 1]! + a[n / 2]!) / 2;
};
const endlich = (v: number): number | null => (Number.isFinite(v) ? v : null);

/** Kendalls τ_b (wie R `cor(x, y, method = "kendall")`), exakte Vergleiche. */
export function kendallTau(x: number[], y: number[]): number {
  const n = x.length;
  let kd = 0, tx = 0, ty = 0;
  for (let i = 0; i < n - 1; i++) {
    const xi = x[i]!, yi = y[i]!;
    for (let j = i + 1; j < n; j++) {
      const dx = x[j]! - xi, dy = y[j]! - yi;
      if (dx === 0) tx++;
      if (dy === 0) ty++;
      if (dx !== 0 && dy !== 0) kd += (dx > 0) === (dy > 0) ? 1 : -1;
    }
  }
  const n0 = (n * (n - 1)) / 2, nenner = Math.sqrt((n0 - tx) * (n0 - ty));
  return nenner > 0 ? kd / nenner : 0;
}

/** Differenz wie mcr: gleiche Werte bis auf 1e-12 (relativ zum Mittel der Beträge) gelten als gleich. */
const diffz = (a: number, b: number): number => {
  const d = a - b;
  return d === 0 || Math.abs(d) < (TOL * (Math.abs(a) + Math.abs(b))) / 2 ? 0 : d;
};

function cusumVon(x: number[], y: number[], a: number, b: number): { cusum: Cusum; residuen: number[] } {
  const n = x.length, res = new Array<number>(n), zeichen = new Int8Array(n);
  let L = 0, M = 0;
  for (let i = 0; i < n; i++) {
    const e = y[i]! - a - b * x[i]!;
    res[i] = e;
    const ist0 = Math.abs(e) <= TOL * (Math.abs(y[i]!) + Math.abs(a) + Math.abs(b * x[i]!));
    zeichen[i] = ist0 ? 0 : e > 0 ? 1 : -1;
    if (zeichen[i] === 1) L++; else if (zeichen[i] === -1) M++;
  }
  const plus = L > 0 ? Math.sqrt(M / L) : 0, minus = M > 0 ? -Math.sqrt(L / M) : 0, w = Math.sqrt(1 + 1 / (b * b));
  const D = x.map((xi, i) => (b === 0 ? xi : (y[i]! + xi / b - a) / w));
  const ordnung = D.map((_, i) => i).sort((p, q) => D[p]! - D[q]!);
  const reihe: number[] = [];
  let s = 0, max = 0;
  for (const i of ordnung) {
    s += zeichen[i] === 1 ? plus : zeichen[i] === -1 ? minus : 0;
    reihe.push(s);
    if (Math.abs(s) > max) max = Math.abs(s);
  }
  return { cusum: { L, M, max, h: L + M > 0 ? max / Math.sqrt(L + M) : 0, reihe }, residuen: res };
}

/** Passing-Bablok-Regression wie mcr (Kern ohne Sperren: rechnet auch bei Werten < 0 und negativem Zusammenhang). Mindestens zwei Punkte. */
export function passingBablok(x: number[], y: number[], niveau = 0.95): PbErgebnis {
  const n = x.length, positiv = kendallTau(x, y) > 0;
  const winkel = new Float64Array((n * (n - 1)) / 2);
  let N = 0;
  const halb = Math.PI / 2, viertel = Math.PI / 4;
  for (let i = 0; i < n - 1; i++) {
    const xi = x[i]!, yi = y[i]!;
    for (let j = i + 1; j < n; j++) {
      const dx = diffz(x[j]!, xi), dy = diffz(y[j]!, yi);
      if (dx === 0) { if (dy === 0) continue; winkel[N++] = positiv ? halb : -halb; }
      else winkel[N++] = Math.atan(dy / dx);
    }
  }
  const ang = winkel.subarray(0, N).sort();
  let nNeg = 0, nNeg2 = 0, nPos = 0, nPos2 = 0;
  for (let k = 0; k < N; k++) { const w = ang[k]!; if (w <= -viertel) nNeg++; if (w < -viertel) nNeg2++; if (w >= viertel) nPos++; if (w > viertel) nPos2++; }
  const offset = positiv ? nNeg + nNeg2 : -(nPos + nPos2);
  /** „Median“ der Länge nInd über 1-basierte Ränge (Mittel zweier Winkel bei gerader Länge); NaN, wenn der Rang außerhalb liegt. */
  const med2 = (nInd: number): number => {
    const half = Math.floor((nInd + 1) / 2);
    const w = (r: number) => (r >= 1 && r <= N ? ang[r - 1]! : NaN);
    if (nInd % 2 === 0) return Math.tan((w(half) + w(half + 1)) / 2);
    return Math.tan(w(half));
  };
  const b = med2(N + offset);
  const C = Math.round(qnorm(1 - (1 - niveau) / 2) * Math.sqrt((n * (n - 1) * (2 * n + 5)) / 18));
  const niedrigste = positiv ? 2 * (nNeg - nNeg2) + 1 : 2 * (nPos - nPos2) + 1;
  const nIndL = N - C + offset, nItL = Math.floor((nIndL + 1) / 2), nIndU = N + C + offset, nItU = Math.floor((nIndU + 1) / 2);
  const bl = nItL >= niedrigste ? endlich(med2(nIndL)) : null, bu = nItU <= N ? endlich(med2(nIndU)) : null;
  const a = medianVon(y.map((yi, i) => yi - b * x[i]!));
  const aUnten = bu === null ? null : endlich(medianVon(y.map((yi, i) => yi - bu * x[i]!)));
  const aOben = bl === null ? null : endlich(medianVon(y.map((yi, i) => yi - bl * x[i]!)));
  const { cusum, residuen } = cusumVon(x, y, a, b);
  return { konstante: a, konstanteUnten: aUnten, konstanteOben: aOben, steigung: b, steigungUnten: bl, steigungOben: bu, anzahlSteigungen: N, cusum, residuen };
}

/** Deming-Steigung und -Konstante aus den Summen (λ = Fehlervarianz x / Fehlervarianz y). */
function demingPunkt(x: number[], y: number[], lambda: number, aus = -1): { a: number; b: number } {
  let n = 0, sx = 0, sy = 0;
  for (let i = 0; i < x.length; i++) if (i !== aus) { n++; sx += x[i]!; sy += y[i]!; }
  const mx = sx / n, my = sy / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < x.length; i++) if (i !== aus) { const dx = x[i]! - mx, dy = y[i]! - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  const dd = 1 / lambda, A = syy - dd * sxx, w = Math.sqrt(A * A + 4 * dd * sxy * sxy);
  const b = A >= 0 ? (A + w) / (2 * sxy) : (2 * dd * sxy) / (w - A);          // zweite Form ohne Auslöschung, wenn A negativ ist
  return { a: my - b * mx, b };
}
/** Nur die Steigung der Deming-Regression (für die Tabelle zu verschiedenen λ). */
export const demingSteigung = (x: number[], y: number[], lambda: number): number => demingPunkt(x, y, lambda).b;

/** Deming-Regression mit Jackknife-Intervall nach Linnet (1990): Pseudowerte n·θ − (n − 1)·θ(−i), SE = sd(Pseudowerte)/√n, Intervall θ ± t(1 − α/2; n − 2)·SE (wie mcr). */
export function deming(x: number[], y: number[], lambda = 1, niveau = 0.95): DemingErgebnis {
  const n = x.length, est = demingPunkt(x, y, lambda);
  const pa: number[] = [], pb: number[] = [];
  for (let i = 0; i < n; i++) { const e = demingPunkt(x, y, lambda, i); pa.push(n * est.a - (n - 1) * e.a); pb.push(n * est.b - (n - 1) * e.b); }
  const sd = (v: number[]) => { const m = v.reduce((s, t) => s + t, 0) / v.length; return Math.sqrt(v.reduce((s, t) => s + (t - m) ** 2, 0) / (v.length - 1)); };
  const seA = sd(pa) / Math.sqrt(n), seB = sd(pb) / Math.sqrt(n), t = tQuantil(1 - (1 - niveau) / 2, n - 2);
  return { lambda, konstante: est.a, konstanteSE: seA, konstanteUnten: est.a - t * seA, konstanteOben: est.a + t * seA, steigung: est.b, steigungSE: seB, steigungUnten: est.b - t * seB, steigungOben: est.b + t * seB };
}

/* ------------------------------------------------------------------ die Funktion der Oberfläche */
export type MvHinweis = 'wenig-faelle' | 'wenige-werte';
export interface MvErgebnis {
  ok: true; n: number; ausgelassen: number; tau: number;
  pb: PbErgebnis | null; pbFehler: 'negativ' | 'tau' | null;
  deming: DemingErgebnis; lambdaTabelle: { lambda: number; steigung: number }[];
  hinweise: MvHinweis[];
}
export interface MvFehler { ok: false; code: 'zu-wenig' | 'zu-gross' | 'konstant' | 'wenige-werte' | 'lambda' | 'laenge' | 'unbestimmt' }
export const LAMBDA_TABELLE = [0.5, 1, 2];

/** Listenweise (Paare mit fehlendem Wert fallen weg), mit allen Sperren. Reihenfolge der Prüfungen: Länge, λ, Auslassen, zu wenig, zu groß, konstant, wenige Werte. */
export function methodenvergleich(x: (number | null)[], y: (number | null)[], opt: { lambda?: number; niveau?: number } = {}): MvErgebnis | MvFehler {
  const lambda = opt.lambda ?? 1, niveau = opt.niveau ?? 0.95;
  if (x.length !== y.length) return { ok: false, code: 'laenge' };
  if (!(typeof lambda === 'number' && Number.isFinite(lambda) && lambda > 0)) return { ok: false, code: 'lambda' };
  const xs: number[] = [], ys: number[] = [];
  x.forEach((v, i) => { const w = y[i]; if (typeof v === 'number' && Number.isFinite(v) && typeof w === 'number' && Number.isFinite(w)) { xs.push(v); ys.push(w); } });
  const n = xs.length, ausgelassen = x.length - n;
  if (n < MV_MIN_N) return { ok: false, code: 'zu-wenig' };
  if (n > MV_MAX_N) return { ok: false, code: 'zu-gross' };
  const vx = new Set(xs).size, vy = new Set(ys).size;
  if (vx < 2 || vy < 2) return { ok: false, code: 'konstant' };
  if (vx < 5 || vy < 5) return { ok: false, code: 'wenige-werte' };
  const tau = kendallTau(xs, ys), negativ = xs.some(v => v < 0) || ys.some(v => v < 0);
  const dem = deming(xs, ys, lambda, niveau);
  if (![dem.steigung, dem.konstante, dem.steigungSE, dem.konstanteSE].every(Number.isFinite)) return { ok: false, code: 'unbestimmt' };
  const pbFehler = negativ ? 'negativ' : tau <= 0 ? 'tau' : null;
  const hinweise: MvHinweis[] = [];
  if (n < 40) hinweise.push('wenig-faelle');
  if (vx < 20 || vy < 20) hinweise.push('wenige-werte');
  return {
    ok: true, n, ausgelassen, tau, pb: pbFehler ? null : passingBablok(xs, ys, niveau), pbFehler, deming: dem,
    lambdaTabelle: LAMBDA_TABELLE.map(l => ({ lambda: l, steigung: demingSteigung(xs, ys, l) })), hinweise
  };
}
