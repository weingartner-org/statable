/**
 * Folgeanalyse nach der MANOVA (Field-Stufe 3, 05.11.2026): Box-Test der Kovarianzmatrizen (Box-M mit χ²- und F-Näherung nach Box), Levene-Test je Zielgröße
 * (Mittelwert-Zentrierung wie SPSS), Holm-Korrektur der Einzel-F und die Diskriminanzfunktionen mit Strukturmatrix, Anteil je Funktion, Funktionswerten und Gruppenzentroiden.
 * Reine Rechnung im Browser aus den vollständigen Fällen (kein R: car und heplots gibt es in webR nicht). Sollwerte: docs/fachblaetter/sollwerte/field-stufe3.json (manova_folge), Test manovafolge.test.ts.
 */
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { betai } from './verteilung';
import { chiQuadratP } from './verteilung';
import { eigenSymmetrisch } from './mds';
import { holmAnpassen } from './posthoc';
import { kpGruppen, kpIndex, kpInnerhalb, kpZahlen } from './kpdaten';
import { L } from './sitzung.svelte';
import { komma, pWert } from './ergebnis';

/** Die vollständigen Fälle: `cols[j][r]` = Wert der Zielgröße j im Fall r, `grp[r]` = Nummer der Gruppe (nur Gruppen mit Fällen). */
export interface FolgeDaten { cols: number[][]; grp: number[]; stufen: string[]; ziele: string[]; n: number; je: number[] }

export function folgeDaten(gruppe: string, ziele: string[], zeilen: Wert[][], spalten: Spalte[]): FolgeDaten | null {
  const gi = kpIndex(spalten, gruppe), gs = spalten.find(x => x.name === gruppe);
  if (!gs || gi < 0) return null;
  const gr = kpGruppen(gs, gi, zeilen);
  const zahlen = ziele.map(m => { const i = kpIndex(spalten, m); return i < 0 ? null : kpZahlen(spalten[i]!, i, zeilen); });
  if (zahlen.some(z => z === null)) return null;
  const z = zahlen as (number | null)[][];
  const idx = zeilen.flatMap((_, r) => (gr.werte[r] !== null && z.every(c => c[r] !== null) ? [r] : []));
  const nr = new Map(gr.stufen.map((s, i) => [s, i]));
  const roh = idx.map(r => nr.get(gr.werte[r]!)!);
  const benutzt = [...new Set(roh)].sort((a, b) => a - b), neu = new Map(benutzt.map((g, i) => [g, i]));
  const grp = roh.map(g => neu.get(g)!), je = benutzt.map(() => 0);
  for (const g of grp) je[g]!++;
  return { cols: z.map(c => idx.map(r => c[r]!)), grp, stufen: benutzt.map(g => gr.stufen[g]!), ziele, n: idx.length, je };
}

/* ------------------------------------------------------------ Verteilungen */
const pF = (f: number, df1: number, df2: number) => (f > 0 ? betai(df2 / 2, df1 / 2, df2 / (df2 + df1 * f)) : 1);
const mittel = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;

/** Kovarianzmatrix (n − 1) der Fälle `idx`. */
function kovarianz(cols: number[][], idx: number[]): number[][] {
  const p = cols.length, n = idx.length, m = cols.map(c => idx.reduce((a, r) => a + c[r]!, 0) / n);
  return Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => idx.reduce((s, r) => s + (cols[a]![r]! - m[a]!) * (cols[b]![r]! - m[b]!), 0) / (n - 1)));
}
/** Cholesky-Zerlegung A = L·Lᵀ; `null`, wenn A nicht positiv definit ist. */
function cholesky(A: number[][]): number[][] | null {
  const p = A.length, Lm = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  for (let i = 0; i < p; i++) for (let j = 0; j <= i; j++) {
    let s = A[i]![j]!; for (let k = 0; k < j; k++) s -= Lm[i]![k]! * Lm[j]![k]!;
    if (i === j) { if (!(s > 1e-300) || !Number.isFinite(s)) return null; Lm[i]![i] = Math.sqrt(s); } else Lm[i]![j] = s / Lm[j]![j]!;
  }
  return Lm;
}
const logDet = (A: number[][]): number | null => { const c = cholesky(A); return c ? 2 * c.reduce((s, z, i) => s + Math.log(z[i]!), 0) : null; };

/* ------------------------------------------------------------ Box-Test */
export type BoxRichtung = 'gleich' | 'konservativ' | 'liberal';
export interface BoxErgebnis {
  M: number; chi2: number; chiDf: number; chiP: number; F: number; df1: number; df2: number; p: number;
  /** log der Determinante je Gruppe */ logDets: number[]; gleichGross: boolean;
  /** Bei ungleich großen Gruppen: haben die größeren Gruppen die größere (konservativ) oder die kleinere Kovarianz (liberal)? */ richtung: BoxRichtung;
}
export type BoxFehler = 'zu-wenig-gruppen' | 'gruppe-zu-klein' | 'singulaer';

/** Box-M mit χ²- und F-Näherung nach Box (wie das R-Skript der Sollwerte). */
export function boxTest(d: FolgeDaten): BoxErgebnis | { fehler: BoxFehler } {
  const p = d.cols.length, k = d.je.length, N = d.n;
  if (k < 2) return { fehler: 'zu-wenig-gruppen' };
  if (d.je.some(n => n <= p)) return { fehler: 'gruppe-zu-klein' };
  const idxJe = d.je.map((_, g) => d.grp.flatMap((x, r) => (x === g ? [r] : [])));
  const S = idxJe.map(ix => kovarianz(d.cols, ix));
  const Sp = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => S.reduce((s, m, g) => s + (d.je[g]! - 1) * m[a]![b]!, 0) / (N - k)));
  const ldp = logDet(Sp), lds = S.map(logDet);
  if (ldp === null || lds.some(v => v === null)) return { fehler: 'singulaer' };
  const logDets = lds as number[];
  const M = (N - k) * ldp - d.je.reduce((s, n, g) => s + (n - 1) * logDets[g]!, 0);
  const sum1 = d.je.reduce((s, n) => s + 1 / (n - 1), 0) - 1 / (N - k), sum2 = d.je.reduce((s, n) => s + 1 / (n - 1) ** 2, 0) - 1 / (N - k) ** 2;
  const c1 = sum1 * (2 * p * p + 3 * p - 1) / (6 * (p + 1) * (k - 1)), df = p * (p + 1) * (k - 1) / 2;
  const chi2 = M * (1 - c1);
  const c2 = sum2 * (p - 1) * (p + 2) / (6 * (k - 1)), df2 = (df + 2) / Math.abs(c2 - c1 * c1), bb = df / (1 - c1 - df / df2), F = M / bb;
  const gleichGross = d.je.every(n => n === d.je[0]);
  const gew = d.je.reduce((s, n, g) => s + n * logDets[g]!, 0) / N, ungew = mittel(logDets);
  const richtung: BoxRichtung = gleichGross || Math.abs(gew - ungew) < 1e-9 ? 'gleich' : gew > ungew ? 'konservativ' : 'liberal';
  return { M, chi2, chiDf: df, chiP: chiQuadratP(chi2, df), F, df1: df, df2, p: pF(F, df, df2), logDets, gleichGross, richtung };
}

/* ------------------------------------------------------------ Levene-Test */
export interface LeveneErgebnis { F: number; df1: number; df2: number; p: number }
/** Levene-Test mit Mittelwert-Zentrierung (wie SPSS und `car::leveneTest(center = mean)`): einfaktorielle Varianzanalyse der Beträge der Abweichungen vom Gruppenmittel. */
export function leveneTest(x: number[], grp: number[], k: number): LeveneErgebnis | null {
  const n = x.length, ns = new Array<number>(k).fill(0), ms = new Array<number>(k).fill(0);
  x.forEach((v, r) => { ns[grp[r]!]!++; ms[grp[r]!]! += v; });
  if (ns.some(c => c < 1) || n - k < 1 || k < 2) return null;
  for (let g = 0; g < k; g++) ms[g]! /= ns[g]!;
  const z = x.map((v, r) => Math.abs(v - ms[grp[r]!]!)), zm = new Array<number>(k).fill(0);
  z.forEach((v, r) => { zm[grp[r]!]! += v / ns[grp[r]!]!; });
  const gm = mittel(z);
  const ssb = zm.reduce((s, m, g) => s + ns[g]! * (m - gm) ** 2, 0), ssw = z.reduce((s, v, r) => s + (v - zm[grp[r]!]!) ** 2, 0);
  if (!(ssw > 0)) return ssb > 0 ? { F: Infinity, df1: k - 1, df2: n - k, p: 0 } : null;
  const F = (ssb / (k - 1)) / (ssw / (n - k));
  return { F, df1: k - 1, df2: n - k, p: pF(F, k - 1, n - k) };
}

/** p-Werte nach Holm (wie R `p.adjust(method = "holm")`). */
export const holm = (p: number[]): number[] => holmAnpassen(p);

/* ------------------------------------------------------------ Diskriminanzfunktionen */
export interface Funktionen {
  eigen: number[]; anteil: number[];
  /** [Funktion][Zielgröße]: Koeffizienten (innerhalb der Gruppen auf Varianz 1 skaliert, wie MASS::lda; erster Koeffizient positiv) */ koeffizienten: number[][];
  /** [Fall][Funktion] */ werte: number[][];
  /** [Zielgröße][Funktion]: Korrelationen innerhalb der Gruppen zwischen Zielgröße und Funktionswert */ struktur: number[][];
  /** [Gruppe][Funktion] */ zentroide: number[][];
}
/** Lineare Diskriminanzfunktionen aus den vollständigen Fällen; `null`, wenn die Streuung innerhalb der Gruppen nicht invertierbar ist oder weniger als zwei Gruppen bleiben. */
export function diskrFunktionen(d: FolgeDaten): Funktionen | null {
  const p = d.cols.length, k = d.je.length, N = d.n;
  if (k < 2 || p < 1 || N <= k) return null;
  const W = kpInnerhalb(d.cols, d.grp, k), T = kpInnerhalb(d.cols, new Array<number>(N).fill(0), 1);
  const B = T.map((z, a) => z.map((v, b) => v - W[a]![b]!));
  const Lm = cholesky(W); if (!Lm) return null;
  // L⁻¹ B L⁻ᵀ (symmetrisch): zuerst Y = L⁻¹ B, dann Y L⁻ᵀ
  const vorw = (rechts: number[]) => { const y = new Array<number>(p).fill(0); for (let i = 0; i < p; i++) { let s = rechts[i]!; for (let j = 0; j < i; j++) s -= Lm[i]![j]! * y[j]!; y[i] = s / Lm[i]![i]!; } return y; };
  const rueck = (rechts: number[]) => { const x = new Array<number>(p).fill(0); for (let i = p - 1; i >= 0; i--) { let s = rechts[i]!; for (let j = i + 1; j < p; j++) s -= Lm[j]![i]! * x[j]!; x[i] = s / Lm[i]![i]!; } return x; };
  const cols = Array.from({ length: p }, (_, c) => vorw(B.map(r => r[c]!)));   // Spalten von L⁻¹B
  const Y = Array.from({ length: p }, (_, a) => cols.map(c => c[a]!));          // Y[a][b]
  const M = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  for (let a = 0; a < p; a++) { const zeile = vorw(Y[a]!); for (let b = 0; b < p; b++) M[a]![b] = zeile[b]!; }   // Zeile a von Y L⁻ᵀ = L⁻¹ (Zeile a von Y)ᵀ
  for (let a = 0; a < p; a++) for (let b = a + 1; b < p; b++) { const m = (M[a]![b]! + M[b]![a]!) / 2; M[a]![b] = m; M[b]![a] = m; }
  const { werte: lam, vek } = eigenSymmetrisch(M), m = Math.min(p, k - 1);
  const koeff: number[][] = [];
  for (let f = 0; f < m; f++) {
    const u = vek.map(r => r[f]!), v = rueck(u).map(x => x * Math.sqrt(N - k));
    const vz = v[0]! < 0 ? -1 : 1; koeff.push(v.map(x => x * vz));
  }
  const eigen = lam.slice(0, m).map(v => Math.max(v, 0)), sumEig = eigen.reduce((a, b) => a + b, 0);
  const gm = d.cols.map(mittel);
  const werte = Array.from({ length: N }, (_, r) => koeff.map(c => c.reduce((s, b, j) => s + b * (d.cols[j]![r]! - gm[j]!), 0)));
  const zentroide = d.je.map((_, g) => koeff.map((_, f) => { let s = 0, c = 0; d.grp.forEach((x, r) => { if (x === g) { s += werte[r]![f]!; c++; } }); return s / c; }));
  // Korrelation innerhalb der Gruppen: beide Seiten um das Gruppenmittel bereinigt
  const gmw = (v: number[]) => { const s = new Array<number>(k).fill(0); v.forEach((x, r) => { s[d.grp[r]!]! += x; }); return v.map((x, r) => x - s[d.grp[r]!]! / d.je[d.grp[r]!]!); };
  const ra = d.cols.map(gmw), rf = koeff.map((_, f) => gmw(werte.map(w => w[f]!)));
  const struktur = ra.map(a => rf.map(b => { let sab = 0, saa = 0, sbb = 0; for (let r = 0; r < N; r++) { sab += a[r]! * b[r]!; saa += a[r]! ** 2; sbb += b[r]! ** 2; } return sab / Math.sqrt(saa * sbb); }));
  return { eigen, anteil: eigen.map(v => (sumEig > 0 ? v / sumEig : 0)), koeffizienten: koeff, werte, struktur, zentroide };
}

/* ------------------------------------------------------------ Sätze */
const z2 = (v: number) => komma(v, 2);
/** Die Sätze zum Box-Test: Ergebnis, Deutung, Empfindlichkeit, Gruppengrößen und die Empfehlung (Pillai-Spur). */
export function boxSaetze(b: BoxErgebnis): string[] {
  const aus: string[] = [];
  aus.push(L(`Box-M-Test auf gleiche Kovarianzmatrizen: M = ${z2(b.M)}, F(${komma(b.df1, 0)}; ${komma(b.df2, 1)}) = ${z2(b.F)}, p ${pWert(b.p)} (χ²-Näherung: χ²(${komma(b.chiDf, 0)}) = ${z2(b.chi2)}, p ${pWert(b.chiP)}).`,
    `Box\'s M test for equal covariance matrices: M = ${z2(b.M)}, F(${komma(b.df1, 0)}, ${komma(b.df2, 1)}) = ${z2(b.F)}, p ${pWert(b.p)} (χ² approximation: χ²(${komma(b.chiDf, 0)}) = ${z2(b.chi2)}, p ${pWert(b.chiP)}).`));
  aus.push(b.p < 0.001
    ? L('Die Kovarianzmatrizen der Gruppen unterscheiden sich deutlich: Die Streuung und der Zusammenhang der Zielgrößen sind nicht in allen Gruppen gleich.', 'The covariance matrices of the groups differ clearly: the spread and the relationships among the outcomes are not the same in all groups.')
    : L('Ein Unterschied der Kovarianzmatrizen lässt sich nicht belegen. Das heißt nicht, dass es keinen gibt.', 'A difference between the covariance matrices cannot be shown. That does not mean there is none.'));
  aus.push(L('Der Box-M-Test ist sehr empfindlich: Bei vielen Fällen wird schon ein kleiner Unterschied signifikant, und er reagiert stark auf Abweichungen von der Normalverteilung. Deshalb gilt meist die strengere Schwelle p < ,001.', 'Box\'s M test is very sensitive: with many cases even a small difference becomes significant, and it reacts strongly to departures from normality. That is why the stricter threshold p < .001 is usually used.'));
  if (b.gleichGross) aus.push(L('Die Gruppen sind gleich groß. Dann sind die MANOVA-Prüfgrößen, vor allem die Pillai-Spur, gegen ungleiche Kovarianzmatrizen weitgehend robust.', 'The groups are equally large. Then the MANOVA statistics, above all Pillai\'s trace, are largely robust against unequal covariance matrices.'));
  else if (b.richtung === 'konservativ') aus.push(L('Die Gruppen sind ungleich groß, und die größeren Gruppen haben die größere Kovarianz. Dann ist der Test eher zu vorsichtig: Ein Unterschied wird seltener gefunden, als er es sollte. Die Pillai-Spur ist hier am robustesten.', 'The groups are unequal in size, and the larger groups have the larger covariance. Then the test is rather too cautious: a difference is found less often than it should be. Pillai\'s trace is the most robust here.'));
  else if (b.richtung === 'liberal') aus.push(L('Die Gruppen sind ungleich groß, und die größeren Gruppen haben die kleinere Kovarianz. Dann ist der Test zu großzügig: Ein Unterschied wird häufiger gefunden, als er es sollte, auch wenn es keinen gibt. Die Pillai-Spur ist hier am robustesten; ein knappes Ergebnis mit Vorsicht lesen.', 'The groups are unequal in size, and the larger groups have the smaller covariance. Then the test is too liberal: a difference is found more often than it should be, even if there is none. Pillai\'s trace is the most robust here; read a borderline result with caution.'));
  else aus.push(L('Die Gruppen sind ungleich groß, die Kovarianzen unterscheiden sich aber nicht in einer festen Richtung mit der Größe. Die Pillai-Spur ist am robustesten.', 'The groups are unequal in size, but the covariances do not differ in a fixed direction with size. Pillai\'s trace is the most robust.'));
  return aus;
}
export const boxFehlerSatz = (f: BoxFehler): string => f === 'zu-wenig-gruppen' ? L('Der Box-M-Test braucht mindestens zwei Gruppen.', 'Box\'s M test needs at least two groups.')
  : f === 'gruppe-zu-klein' ? L('Der Box-M-Test braucht in jeder Gruppe mehr Fälle als Zielgrößen.', 'Box\'s M test needs more cases than outcomes in every group.')
  : L('Eine Kovarianzmatrix ist nicht invertierbar (eine Zielgröße ist in einer Gruppe konstant oder aus den anderen berechenbar).', 'A covariance matrix cannot be inverted (an outcome is constant in a group or can be calculated from the others).');

/* ------------------------------------------------------------ Texte, die die MANOVA-Seite (manova.ts) von hier holt (neue Sätze der Folgeanalyse; Übersetzungen folgen später) */
export const manovaWarnMehrfach = (): string => L('Bei den einzelnen Tests unten schützt nur die Spalte p (Holm) gegen mehrfaches Testen; ein signifikantes Gesamtergebnis schützt sie nicht.', 'For the individual tests below only the column p (Holm) protects against multiple testing; a significant overall result does not protect them.');
export const manovaWarnVoraus = (): string => L('Die Rechnung setzt gleiche Kovarianzen in den Gruppen und eine multivariate Normalverteilung voraus. Die gleichen Kovarianzen prüfen der Box-M-Test und der Levene-Test unter dem Ergebnis; die Normalverteilung prüft Statable nicht mit einem Test.', 'The calculation assumes equal covariances in the groups and a multivariate normal distribution. Box\'s M test and the Levene test below the result check the equal covariances; Statable does not check the normal distribution with a test.');
export const holmKopf = (): string => L('p (Holm)', 'p (Holm)');
export const holmFuss = (): string => L('Einfaktorielle Varianzanalyse je Zielgröße. Die Spalte p (Holm) schützt gegen mehrfaches Testen (Holm-Korrektur über alle Zielgrößen); die Spalte p davor ist ohne Schutz.', 'One-way analysis of variance for each outcome. The column p (Holm) protects against multiple testing (Holm correction across all outcomes); the column p before it is without protection.');
export const holmRKommentar = (): string => L('mit Holm-Korrektur', 'with Holm correction');
