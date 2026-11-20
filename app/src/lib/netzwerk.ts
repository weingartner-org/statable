/**
 * B4 Teil 2: Partialkorrelationsnetz (Netzwerkanalyse) für die Spalten einer Korrelationsmatrix. Fachblatt docs/ausbau/FACHBLATT-B4-PSYCHOLOGIE.md, Abschnitt Teil 2.
 * Rechnung: Korrelationsmatrix R (Pearson, oder Spearman mit Rängen), P = R⁻¹, Kante i-j = −P_ij / √(P_ii · P_jj) (Partialkorrelation, alle anderen Spalten herausgerechnet);
 * p-Wert wie bei der Partialkorrelation (t mit n − k Freiheitsgraden), Holm über alle Kanten. Kein Lasso (keine Regularisierung): das Netz ist ungeglättet und zeigt jede Kante mit ihrer Unsicherheit.
 * Zentralität: Stärke (Summe der |Kanten|) und erwarteter Einfluss (Summe der Kanten mit Vorzeichen). Nähe und Zwischenzentralität gibt es bewusst nicht: Ohne Regularisierung ist jedes Paar
 * verbunden, Wege über Dritte sind dann kaum aussagekräftig; Epskamp, Borsboom & Fried (2018) fanden sie auch weniger stabil als die Stärke.
 * Bootstrap: Fälle mit Zurücklegen, Perzentilintervall 95 % für jede Kante und jede Stärke; bei Spearman werden die Ränge in jeder Ziehung neu gebildet.
 * Sollwerte: scripts/netzwerk-erwartet.R (zweiter Weg: Regressionsreste), Wächter lib/netzwerk.test.ts.
 *
 * R-Skript (Regel aus B1): Basis-R, Daten als CSV. Die Punktschätzer sind mit Statable gleich; der Bootstrap zieht in R mit set.seed(Startwert) andere Fälle als Statable (andere Zufallszahlen),
 * die Intervalle sind darum nur im Rahmen des Zufalls gleich.
 * FESTE OBJEKTNAMEN im Skript (Gegenprobe netzwerk.test.ts): `X`, `korr`, `partial`, `kanten` (data.frame von, nach, partial, p, p_holm), `zentral` (data.frame knoten, staerke, einfluss), `boot_kanten`, `boot_staerke`.
 */
import { L } from './sitzung.svelte';
import { istFehlend } from './fehlend';
import { strom } from './lernlabor';
import { korrMatrix as korrAusSpalten, umkehren } from './partialkorrelation';
import { raenge } from './rangkorrelation';
import { holm } from './rangtests';
import { tVerteilung } from './verteilung';
import { datenCsv, kom, rDateiBasis, type RSkript, type RSpalte } from './rskript';
import { rAnzeigeText } from '../engine/rsicher';

export type NetzArt = 'pearson' | 'spearman';
export const NETZ_MIN_SPALTEN = 3;
export const NETZ_MAX_SPALTEN = 20;
export const NETZ_MIN_FAELLE = 30;
export const NETZ_ALPHA = 0.05;

export interface NetzDaten { X: number[][]; zeilen: number[]; weg: number }
export type NetzFehler = { fehler: 'zu-wenig-spalten' | 'zu-viele-spalten' | 'zu-wenig-faelle' | 'keine-streuung' | 'abhaengig' };

const leer = (sp: RSpalte, v: unknown) => v === null || v === undefined || v === '' || (typeof v === 'number' && (!Number.isFinite(v) || istFehlend(sp, v)));

/** Vollständige Fälle (nur Zahlen-Spalten); mindestens max(30, 3 · Spaltenzahl) Fälle. */
export function netzDaten(spalten: RSpalte[], zeilen: (string | number | null)[][], namen: string[]): NetzDaten | NetzFehler {
  const sp = namen.map(n => spalten.find(c => c.name === n)).filter((c): c is RSpalte => !!c && c.art === 'zahl');
  if (sp.length < NETZ_MIN_SPALTEN) return { fehler: 'zu-wenig-spalten' };
  if (sp.length > NETZ_MAX_SPALTEN) return { fehler: 'zu-viele-spalten' };
  const ix = sp.map(c => spalten.indexOf(c)), nimm: number[] = []; let weg = 0;
  zeilen.forEach((z, r) => { if (sp.some((c, k) => leer(c, z[ix[k]!]))) weg++; else nimm.push(r); });
  if (nimm.length < Math.max(NETZ_MIN_FAELLE, 3 * sp.length)) return { fehler: 'zu-wenig-faelle' };
  const X = nimm.map(r => ix.map(i => zeilen[r]![i] as number));
  return { X, zeilen: nimm, weg };
}

/** Partialkorrelationen aller Paare (Matrix, Diagonale 0) aus den Spalten; `null`, wenn eine Spalte nicht streut oder die Korrelationsmatrix singulär ist. */
export function partialMatrix(X: number[][], art: NetzArt): number[][] | null {
  const k = X[0]!.length;
  let sp = Array.from({ length: k }, (_, j) => X.map(z => z[j]!));
  if (art === 'spearman') sp = sp.map(raenge);
  const R = korrAusSpalten(sp); if (!R) return null;
  const P = umkehren(R); if (!P) return null;
  const out = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const r = -P[i]![j]! / Math.sqrt(P[i]![i]! * P[j]![j]!);
    if (!Number.isFinite(r)) return null;
    out[i]![j] = out[j]![i] = Math.max(-1, Math.min(1, r));
  }
  return out;
}

export const staerkeVon = (M: number[][]) => M.map(z => z.reduce((s, v) => s + Math.abs(v), 0));
export const einflussVon = (M: number[][]) => M.map(z => z.reduce((s, v) => s + v, 0));

export interface Kante { i: number; j: number; r: number; p: number; pHolm: number; lo: number; hi: number }
export interface NetzErgebnis {
  n: number; k: number; art: NetzArt; startwert: number; ziehungen: number; gueltig: number;
  matrix: number[][];
  kanten: Kante[];
  staerke: number[]; staerkeLo: number[]; staerkeHi: number[];
  einfluss: number[];
  /** Zahl der Kanten mit p nach Holm < 0,05 */
  nSignifikant: number;
}

/** Zahl der Bootstrap-Ziehungen: 1000, bei großen Daten weniger (Rechenzeit im Browser). */
export const ziehungenFuer = (n: number, k: number) => { const w = n * k * k; return w > 2e6 ? 200 : w > 2e5 ? 500 : 1000; };

const perzentil = (sortiert: number[], p: number) => { const h = (sortiert.length - 1) * p, u = Math.floor(h), o = Math.ceil(h); return sortiert[u]! + (sortiert[o]! - sortiert[u]!) * (h - u); };

/** Ganze Rechnung mit festem Startwert. `null`, wenn die Korrelationsmatrix nicht umkehrbar ist. */
export function netzRechne(X: number[][], art: NetzArt, startwert: number, B = ziehungenFuer(X.length, X[0]!.length)): NetzErgebnis | NetzFehler {
  const n = X.length, k = X[0]!.length;
  const M = partialMatrix(X, art);
  if (!M) return { fehler: 'abhaengig' };
  const paare: [number, number][] = []; for (let j = 1; j < k; j++) for (let i = 0; i < j; i++) paare.push([i, j]);   // Reihenfolge wie which(upper.tri(), arr.ind = TRUE) in R (spaltenweise)
  const df = n - k;
  const p = paare.map(([i, j]) => { const r = M[i]![j]!, t = Math.abs(r) >= 1 ? Infinity : r * Math.sqrt(df / (1 - r * r)); return Number.isFinite(t) ? 2 * (1 - tVerteilung(Math.abs(t), df)) : 0; });
  const ph = holm(p);
  const rng = strom(startwert, 0);
  const kantenB = paare.map(() => [] as number[]), staerkeB = Array.from({ length: k }, () => [] as number[]);
  let gueltig = 0;
  for (let b = 0; b < B; b++) {
    const Xb = new Array<number[]>(n);
    for (let t = 0; t < n; t++) Xb[t] = X[Math.floor(rng() * n)]!;
    const Mb = partialMatrix(Xb, art);
    if (!Mb) continue;
    gueltig++;
    paare.forEach(([i, j], q) => kantenB[q]!.push(Mb[i]![j]!));
    staerkeVon(Mb).forEach((v, i) => staerkeB[i]!.push(v));
  }
  const ci = (v: number[]): [number, number] => { if (v.length < 20) return [NaN, NaN]; const s = [...v].sort((a, b) => a - b); return [perzentil(s, 0.025), perzentil(s, 0.975)]; };
  const kanten: Kante[] = paare.map(([i, j], q) => { const [lo, hi] = ci(kantenB[q]!); return { i, j, r: M[i]![j]!, p: p[q]!, pHolm: ph[q]!, lo, hi }; });
  const st = staerkeVon(M), sci = staerkeB.map(ci);
  return {
    n, k, art, startwert, ziehungen: B, gueltig, matrix: M, kanten,
    staerke: st, staerkeLo: sci.map(c => c[0]), staerkeHi: sci.map(c => c[1]), einfluss: einflussVon(M),
    nSignifikant: kanten.filter(e => e.pHolm < NETZ_ALPHA).length
  };
}

/** Punkt auf dem Kreis für Knoten i von k (oben beginnend, im Uhrzeigersinn). */
export const knotenPunkt = (i: number, k: number, radius: number, mx: number, my: number): [number, number] => {
  const w = (2 * Math.PI * i) / k - Math.PI / 2;
  return [mx + radius * Math.cos(w), my + radius * Math.sin(w)];
};

/* ------------------------------------------------------------------ R-Skript */

const zz = (v: number, d = 4) => (Number.isFinite(v) ? String(Number(v.toFixed(d))) : 'NA');

export function baueNetzSkript(o: { spalten: RSpalte[]; zeilen: (string | number | null)[][]; benutzt: string[]; r: NetzErgebnis; titel: string; datum: string }): RSkript {
  const sp = o.benutzt.map(n => o.spalten.find(c => c.name === n)!).filter(Boolean);
  const csv = datenCsv({ spalten: sp, zeilen: o.zeilen, blattSpalten: [], titel: o.titel, datum: o.datum }, sp);
  const basis = rDateiBasis(o.titel), csvName = `${basis}-daten.csv`, rName = `${basis}.R`;
  const q = rAnzeigeText, e = o.r, spear = e.art === 'spearman';
  const r = [
    `# ${kom(o.titel)}`,
    `# ${L(`Erstellt mit Statable (statable.eu) am ${kom(o.datum)}`, `Created with Statable (statable.eu) on ${kom(o.datum)}`)}`,
    `# ${L('Partialkorrelationsnetz (Netzwerkanalyse): jede Kante ist die Partialkorrelation zweier Spalten, alle anderen herausgerechnet. Ohne Regularisierung, nur Basis-R.', 'Partial correlation network (network analysis): each edge is the partial correlation of two columns with all the others held constant. Without regularisation, base R only.')}`,
    `# ${L('Starten: Ordner entpacken, in R mit setwd() in den Ordner wechseln (in RStudio: Session > Set Working Directory > To Source File Location), dann source() mit dem Namen dieser Datei.', 'How to start it: unzip the folder, change to it with setwd() in R (in RStudio: Session > Set Working Directory > To Source File Location), then source() this file.')}`,
    '',
    `# ${L('Daten lesen (fehlende Werte als leere Zelle); nur Personen mit Werten in allen Spalten', 'Read the data (missing values as an empty cell); only people with values in all columns')}`,
    `daten <- read.csv(${q(csvName)}, fileEncoding = "UTF-8", check.names = FALSE, na.strings = "")`,
    `X <- as.matrix(daten[stats::complete.cases(daten), c(${sp.map(c => q(c.name)).join(', ')}), drop = FALSE])`,
    'n <- nrow(X); k <- ncol(X)',
    '',
    `# ${L(spear ? 'Rangkorrelation (Spearman): Ränge, dann wie Pearson.' : 'Korrelation nach Pearson.', spear ? 'Rank correlation (Spearman): ranks, then as Pearson.' : 'Pearson correlation.')}`,
    `partial_von <- function(M) { R <- cor(${spear ? 'apply(M, 2, rank)' : 'M'}); P <- solve(R); p <- -P / sqrt(outer(diag(P), diag(P))); diag(p) <- 0; p }`,
    'korr <- cor(' + (spear ? 'apply(X, 2, rank)' : 'X') + ')',
    'partial <- partial_von(X)',
    `# ${L('Kanten: p-Wert wie bei der Partialkorrelation (t-Test mit n − k Freiheitsgraden), Holm-Korrektur über alle Kanten', 'Edges: p value as for the partial correlation (t test with n − k degrees of freedom), Holm correction over all edges')}`,
    'ij <- which(upper.tri(partial), arr.ind = TRUE)',
    'kanten <- data.frame(von = colnames(X)[ij[, 1]], nach = colnames(X)[ij[, 2]], partial = partial[ij])',
    'kanten$p <- 2 * pt(-abs(kanten$partial * sqrt((n - k) / (1 - kanten$partial^2))), n - k)',
    'kanten$p_holm <- p.adjust(kanten$p, method = "holm")',
    `# ${L('Zentralität: Stärke = Summe der Beträge, erwarteter Einfluss = Summe mit Vorzeichen', 'Centrality: strength = sum of the absolute values, expected influence = sum with signs')}`,
    'zentral <- data.frame(knoten = colnames(X), staerke = rowSums(abs(partial)), einfluss = rowSums(partial))',
    'print(kanten); print(zentral)',
    '',
    `# ${L(`Bootstrap (Fälle mit Zurücklegen, ${e.ziehungen} Ziehungen); die Fälle sind andere als in Statable, die Intervalle gleichen sich darum nur im Rahmen des Zufalls an.`, `Bootstrap (cases with replacement, ${e.ziehungen} draws); the cases differ from those in Statable, so the intervals agree only within chance.`)}`,
    `set.seed(${e.startwert})`,
    `boot <- replicate(${e.ziehungen}, { m <- tryCatch(partial_von(X[sample(n, replace = TRUE), , drop = FALSE]), error = function(e) NULL); if (is.null(m)) rep(NA_real_, nrow(kanten) + k) else c(m[ij], rowSums(abs(m))) })`,
    'boot_kanten <- t(apply(boot[seq_len(nrow(kanten)), , drop = FALSE], 1, quantile, c(0.025, 0.975), na.rm = TRUE))',
    'boot_staerke <- t(apply(boot[nrow(kanten) + seq_len(k), , drop = FALSE], 1, quantile, c(0.025, 0.975), na.rm = TRUE))',
    'kanten <- cbind(kanten, ki_unten = boot_kanten[, 1], ki_oben = boot_kanten[, 2])',
    'zentral <- cbind(zentral, ki_unten = boot_staerke[, 1], ki_oben = boot_staerke[, 2])',
    'print(kanten); print(zentral)',
    '',
    `# ${L('Zum Vergleichen: Das hat Statable gezeigt (Zahlen mit Punkt)', 'To compare: this is what Statable showed (numbers with a decimal point)')}`,
    `# ${kom(L(`Personen: ${e.n}, Spalten: ${e.k}, Kanten mit p (Holm) < 0.05: ${e.nSignifikant}`, `People: ${e.n}, columns: ${e.k}, edges with p (Holm) < 0.05: ${e.nSignifikant}`))}`,
    ...e.kanten.slice().sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 5).map(c => `# ${kom(`${o.benutzt[c.i]} - ${o.benutzt[c.j]}: ${zz(c.r)}`)}`),
    ''
  ].join('\n');
  return { r, csv, rName, csvName };
}
