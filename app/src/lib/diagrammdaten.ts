import { kleinste, groesste } from './menge';
/**
 * Rechnungen hinter den Diagrammen von Verteilung, Kreuztabelle, Regression und Faktorenanalyse.
 * Reine Funktionen ohne Oberfläche; die Vergleichswerte stammen aus R (scripts/diagramme-erwartet.R, Test: diagrammdaten.test.ts).
 */

/** Die Zahlen sortiert (aufsteigend), Kopie. */
export const sortiert = (v: number[]): number[] => [...v].sort((a, b) => a - b);
export const mittel = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
/** Standardabweichung mit n - 1 (wie R sd). */
export const sdStich = (v: number[]) => { const m = mittel(v); return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)); };

/** Quantil nach R `quantile` (type 7), auf bereits sortierten Zahlen. */
export function quantil7(s: number[], p: number): number {
  const i = (s.length - 1) * p, u = Math.floor(i);
  return s[u]! + ((s[Math.min(s.length - 1, u + 1)]! - s[u]!) * (i - u));
}

/* ---------- pretty(): R_pretty aus R (src/appl/pretty.c) ---------- */
/** Schöne Achsengrenzen wie R `pretty(c(lo, hi), n, min.n)`; `min.n` = 1 ist der Wert, den `hist()` benutzt. */
export function pretty(lo: number, hi: number, n = 5, minN = Math.floor(n / 3)): number[] {
  const h = 1.5, h5 = 0.5 + 1.5 * h, eps = 2.220446049250313e-16, rundEps = 1e-10;
  const dx = hi - lo;
  let cell: number, klein: boolean;
  if (dx === 0 && hi === 0) { cell = 1; klein = true; }
  else {
    cell = Math.max(Math.abs(lo), Math.abs(hi));
    const U = (1 + (h5 >= 1.5 * h + 0.5 ? 1 / (1 + h) : 1.5 / (1 + h5))) * Math.max(1, n) * eps;
    klein = dx < cell * U * 3;
  }
  if (klein) { if (cell > 10) cell = 9 + cell / 10; cell *= 0.75; if (minN > 1) cell /= minN; }
  else { cell = dx; if (n > 1) cell /= n; }
  if (cell < 20 * 2.2250738585072014e-308) cell = 20 * 2.2250738585072014e-308;
  const base = 10 ** Math.floor(Math.log10(cell));
  let unit = base;
  if (2 * base - cell < h * (cell - unit)) { unit = 2 * base;
    if (5 * base - cell < h5 * (cell - unit)) { unit = 5 * base;
      if (10 * base - cell < h * (cell - unit)) unit = 10 * base; } }
  let ns = Math.floor(lo / unit + 1e-7), nu = Math.ceil(hi / unit - 1e-7);
  while (ns * unit > lo + rundEps * unit) ns--;
  while (nu * unit < hi - rundEps * unit) nu++;
  let k = Math.trunc(0.5 + nu - ns);
  if (k < minN) {
    k = minN - k;
    if (ns >= 0) { nu += Math.trunc(k / 2); ns -= Math.trunc(k / 2) + (k % 2); }
    else { ns -= Math.trunc(k / 2); nu += Math.trunc(k / 2) + (k % 2); }
  }
  const out: number[] = [];
  for (let i = ns; i <= nu; i++) out.push(Number((i * unit).toPrecision(12)));
  return out;
}

/* ---------- Histogramm: R hist() mit Sturges ---------- */
export interface Histogramm { grenzen: number[]; anzahl: number[]; n: number; breite: number; mittel: number; sd: number }
/** Klassen wie R `hist(x)`: Sturges-Anzahl, `pretty`-Grenzen, rechts abgeschlossen, links die kleinste Grenze eingeschlossen. */
export function histogramm(werte: number[]): Histogramm | null {
  const x = werte.filter(Number.isFinite);
  if (x.length < 2) return null;
  const lo = Math.min(kleinste(x)), hi = Math.max(groesste(x)), sturges = Math.ceil(Math.log2(x.length) + 1);
  const g = pretty(lo, hi, sturges, 1);
  const spannen = g.slice(1).map((v, i) => v - g[i]!).sort((a, b) => a - b);
  const fuzz = 1e-7 * (spannen.length > 5 ? (spannen.length % 2 ? spannen[(spannen.length - 1) / 2]! : (spannen[spannen.length / 2 - 1]! + spannen[spannen.length / 2]!) / 2) : spannen.length <= 3 ? hi - lo : spannen[0]!);
  const anzahl = new Array<number>(g.length - 1).fill(0);
  for (const v of x) {
    for (let i = 0; i < anzahl.length; i++) {
      const unten = g[i]! + (i === 0 ? -fuzz : fuzz), oben = g[i + 1]! + fuzz;
      if (v > unten && v <= oben) { anzahl[i]!++; break; }
    }
  }
  return { grenzen: g, anzahl, n: x.length, breite: g[1]! - g[0]!, mittel: mittel(x), sd: sdStich(x) };
}
/** Dichte der Normalverteilung. */
export const dnorm = (x: number, m: number, sd: number) => Math.exp(-0.5 * ((x - m) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
/** Höhe der Normalverteilungskurve in „Personen je Klasse“: n · Klassenbreite · Dichte (passt zur Höhe der Balken). */
export const normalHoehe = (h: Histogramm, x: number) => h.n * h.breite * dnorm(x, h.mittel, h.sd);

/* ---------- Boxplot: R boxplot.stats (Tukey) ---------- */
export interface BoxStat { unten: number; q1: number; median: number; q3: number; oben: number; ausreisser: number[]; n: number }
/** Fünf Zahlen nach Tukey (R `fivenum`). */
export function fivenum(s: number[]): number[] {
  const n = s.length, n4 = Math.floor((n + 3) / 2) / 2;
  return [1, n4, (n + 1) / 2, n + 1 - n4, n].map(d => 0.5 * (s[Math.floor(d) - 1]! + s[Math.ceil(d) - 1]!));
}
/** Wie R `boxplot.stats(x)`: Kasten von Hinge zu Hinge, Fühler bis zum letzten Wert innerhalb von 1,5 Kastenlängen, die übrigen Werte einzeln. */
export function boxStat(werte: number[], koef = 1.5): BoxStat | null {
  const s = sortiert(werte.filter(Number.isFinite));
  if (s.length < 2) return null;
  const [, q1, md, q3] = fivenum(s) as [number, number, number, number, number], iqr = q3 - q1;
  const raus = (v: number) => v < q1 - koef * iqr || v > q3 + koef * iqr;
  const drin = s.filter(v => !raus(v));
  return { unten: drin[0]!, q1, median: md, q3, oben: drin.at(-1)!, ausreisser: s.filter(raus), n: s.length };
}

/* ---------- Normalverteilung: Quantile (Wichura, AS 241, PPND16) ---------- */
export function qnorm(p: number): number {
  if (!(p > 0 && p < 1)) return p === 0 ? -Infinity : p === 1 ? Infinity : NaN;
  const q = p - 0.5;
  const poly = (c: number[], x: number) => c.reduce((a, k) => a * x + k, 0);
  if (Math.abs(q) <= 0.425) {
    const r = 0.180625 - q * q;
    return q * poly([2509.0809287301226727, 33430.575583588128105, 67265.770927008700853, 45921.953931549871457, 13731.693765509461125, 1971.5909503065514427, 133.14166789178437745, 3.387132872796366608], r) /
      poly([5226.495278852545925, 28729.085735721942674, 39307.89580009271061, 21213.794301586595867, 5394.1960214247511077, 687.1870074920579083, 42.313330701600911252, 1], r);
  }
  let r = q < 0 ? p : 1 - p;
  r = Math.sqrt(-Math.log(r));
  let v: number;
  if (r <= 5) {
    r -= 1.6;
    v = poly([7.7454501427834140764e-4, 0.0227238449892691845833, 0.24178072517745061177, 1.27045825245236838258, 3.64784832476320460504, 5.7694972214606914055, 4.6303378461565452959, 1.42343711074968357734], r) /
      poly([1.05075007164441684324e-9, 5.475938084995344946e-4, 0.0151986665636164571966, 0.14810397642748007459, 0.68976733498510000455, 1.6763848301838038494, 2.05319162663775882187, 1], r);
  } else {
    r -= 5;
    v = poly([2.01033439929228813265e-7, 2.71155556874348757815e-5, 0.0012426609473880784386, 0.026532189526576123093, 0.29656057182850489123, 1.7848265399172913358, 5.4637849111641143699, 6.6579046435011037772], r) /
      poly([2.04426310338993978564e-15, 1.4215117583164458887e-7, 1.8463183175100546818e-5, 7.868691311456132591e-4, 0.0148753612908506148525, 0.13692988092273580531, 0.59983220655588793769, 1], r);
  }
  return q < 0 ? -v : v;
}

/** Wahrscheinlichkeitspunkte wie R `ppoints(n)`. */
export function ppoints(n: number): number[] {
  const a = n <= 10 ? 3 / 8 : 1 / 2;
  return Array.from({ length: n }, (_, i) => (i + 1 - a) / (n + 1 - 2 * a));
}

/* ---------- Q-Q-Diagramm: R qqnorm und qqline ---------- */
export interface QQ { punkte: [number, number][]; steigung: number; achsenabschnitt: number }
/** Punkte (theoretisches Quantil, beobachteter Wert) wie `qqnorm(y)`; die Gerade wie `qqline(y)` (durch die Quartile). Sortiert nach dem theoretischen Quantil. */
export function qqnorm(werte: number[]): QQ | null {
  const y = sortiert(werte.filter(Number.isFinite));
  if (y.length < 3) return null;
  const x = ppoints(y.length).map(qnorm);
  const yq = [quantil7(y, 0.25), quantil7(y, 0.75)], xq = [qnorm(0.25), qnorm(0.75)];
  const steigung = (yq[1]! - yq[0]!) / (xq[1]! - xq[0]!);
  return { punkte: y.map((v, i) => [x[i]!, v] as [number, number]), steigung, achsenabschnitt: yq[0]! - steigung * xq[0]! };
}

/* ---------- Regression: Vorhersagen und Reste ---------- */
export interface Reste { vorhergesagt: number[]; rest: number[]; konstante: number; n: number }
/**
 * Vorhergesagte Werte und Reste einer linearen Regression aus den Rohdaten und den Koeffizienten B (ohne Konstante) in der Reihenfolge der Spalten.
 * Wie PSPP (und R `lm`) nur Fälle, bei denen alle Spalten eine Zahl haben. Die Konstante ist ȳ − Σ B·x̄ - das ist bei Regression mit Konstante dieselbe Zahl wie in der Tabelle der Koeffizienten.
 * `zeilen[i] = [y, x1, x2, …]`; Lücken als null/NaN.
 */
export function reste(zeilen: (number | null | undefined)[][], b: number[]): Reste | null {
  const voll = zeilen.filter(z => z.length === b.length + 1 && z.every(v => typeof v === 'number' && Number.isFinite(v))) as number[][];
  if (voll.length < b.length + 2) return null;
  const my = mittel(voll.map(z => z[0]!)), mx = b.map((_, j) => mittel(voll.map(z => z[j + 1]!)));
  const konstante = my - b.reduce((a, bj, j) => a + bj * mx[j]!, 0);
  const vorhergesagt = voll.map(z => konstante + b.reduce((a, bj, j) => a + bj * z[j + 1]!, 0));
  return { vorhergesagt, rest: voll.map((z, i) => z[0]! - vorhergesagt[i]!), konstante, n: voll.length };
}

/* ---------- Kreuztabelle ---------- */
/** Anteile je Zeile (Zeilenprozent als Bruch 0 bis 1); eine leere Zeile bleibt 0. */
export const zeilenAnteile = (tab: number[][]): number[][] => tab.map(z => { const s = z.reduce((a, b) => a + b, 0); return z.map(v => (s ? v / s : 0)); });

/* ---------- Achsen ---------- */
/** Gleichmäßige Teilung für eine Zahlenachse von `lo` bis `hi` (etwa `n` Marken, „schöne“ Schritte). */
export function achsenMarken(lo: number, hi: number, n = 5): number[] {
  if (!(hi > lo)) return [lo];
  return pretty(lo, hi, n, 1).filter(v => v >= lo - 1e-9 * (hi - lo) && v <= hi + 1e-9 * (hi - lo));
}
/** Achsenbereich, der alle Zahlen umfasst, mit schönen Grenzen. */
export function achsenBereich(lo: number, hi: number, n = 5): [number, number] {
  const m = pretty(lo, hi, n, 1);
  return [m[0]!, m.at(-1)!];
}

/** Pfad eines Balkens mit abgerundetem freiem Ende (`oben`: Säule, `rechts`: waagrechter Balken); die Wurzel am Achsenrand bleibt eckig. */
export function balkenPfad(x: number, y: number, w: number, h: number, r: number, ende: 'oben' | 'rechts' = 'oben'): string {
  if (w <= 0 || h <= 0) return '';
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  const f = (v: number) => Number(v.toFixed(2));
  return ende === 'oben'
    ? `M${f(x)} ${f(y + h)}V${f(y + k)}Q${f(x)} ${f(y)} ${f(x + k)} ${f(y)}H${f(x + w - k)}Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + k)}V${f(y + h)}Z`
    : `M${f(x)} ${f(y)}H${f(x + w - k)}Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + k)}V${f(y + h - k)}Q${f(x + w)} ${f(y + h)} ${f(x + w - k)} ${f(y + h)}H${f(x)}Z`;
}
