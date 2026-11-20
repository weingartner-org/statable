/**
 * B4 Teil 3b: latente Klassen (latent class analysis) - Mischung für Kategorien-Spalten (Ja/Nein und Antwortstufen). Rechnung im Browser, kein R.
 * Fachblatt docs/ausbau/FACHBLATT-B4-PSYCHOLOGIE.md, Abschnitt Teil 3b. Gegenstück zu lib/latent.ts (Zahlen-Spalten).
 *
 * Modell: Jede Person gehört (unbekannt) zu einer von K Klassen mit Anteil w_k; innerhalb einer Klasse sind die Spalten unabhängig (lokale Unabhängigkeit),
 * und jede Spalte hat in der Klasse eigene Antwortwahrscheinlichkeiten. Schätzung: EM-Algorithmus (Dempster, Laird & Rubin 1977) mit vielen zufälligen Startwerten,
 * bestes Ergebnis nach log-Likelihood; Klassen unter 2 Personen zählen nicht. Kennzahlen wie bei den Profilen: log-Likelihood, Parameter
 * (K−1 + K·Σ(J_j−1)), BIC, AIC, relative Entropie, Klassengrößen. Klassen sind nach Größe (absteigend) geordnet.
 * Sollwerte: scripts/klassen-erwartet.R (poLCA und eigener EM in Basis-R), Wächter lib/klassen.test.ts.
 * Fehlende Werte: Personen mit einer Lücke in einer gewählten Spalte entfallen (wie bei den Profilen).
 */
import { istFehlend } from './fehlend';
import { strom } from './lernlabor';
import { L } from './sitzung.svelte';
import { datenCsv, kom, rDateiBasis, type RSkript, type RSpalte } from './rskript';
import { rAnzeigeText, rZahl, rGanz } from '../engine/rsicher';

export const KLASSEN_MIN_SPALTEN = 3;
export const KLASSEN_MAX_SPALTEN = 15;
export const KLASSEN_MIN_FAELLE = 30;
export const KLASSEN_MAX_FAELLE = 10_000;
export const KLASSEN_MAX_K = 6;
export const KLASSEN_MAX_STUFEN = 8;
export const KLASSEN_STARTS = 60;
export const klassenStartsFuer = (n: number, p: number) => (n * p > 20_000 ? 25 : KLASSEN_STARTS);

export type KlassenFehler = { fehler: 'zu-wenig-spalten' | 'zu-viele-spalten' | 'zu-wenig-faelle' | 'zu-viele-faelle' | 'keine-streuung' | 'zu-viele-stufen' | 'k-zu-gross' | 'keine-loesung' };
export interface KlassenDaten {
  /** Antworten als Nummer 0 bis J−1 je Spalte */
  X: number[][]; zeilen: number[]; weg: number;
  /** je Spalte die vorkommenden Werte (geordnet) = die Stufen */
  stufen: (string | number)[][];
}

const leer = (sp: RSpalte, v: unknown) => v === null || v === undefined || v === '' || (typeof v === 'number' && (!Number.isFinite(v) || istFehlend(sp, v)));

/** Vollständige Fälle; jede Spalte mit höchstens 8 verschiedenen Werten, mindestens 2. */
export function klassenDaten(spalten: RSpalte[], zeilen: (string | number | null)[][], namen: string[]): KlassenDaten | KlassenFehler {
  const sp = namen.map(n => spalten.find(c => c.name === n)).filter((c): c is RSpalte => !!c);
  if (sp.length < KLASSEN_MIN_SPALTEN) return { fehler: 'zu-wenig-spalten' };
  if (sp.length > KLASSEN_MAX_SPALTEN) return { fehler: 'zu-viele-spalten' };
  const ix = sp.map(c => spalten.indexOf(c)), nimm: number[] = []; let weg = 0;
  zeilen.forEach((z, r) => { if (sp.some((c, k) => leer(c, z[ix[k]!]))) weg++; else nimm.push(r); });
  if (nimm.length < KLASSEN_MIN_FAELLE) return { fehler: 'zu-wenig-faelle' };
  if (nimm.length > KLASSEN_MAX_FAELLE) return { fehler: 'zu-viele-faelle' };
  const stufen: (string | number)[][] = [];
  for (let k = 0; k < sp.length; k++) {
    const m = new Set<string | number>(); for (const r of nimm) m.add(zeilen[r]![ix[k]!] as string | number);
    const l = [...m].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))));
    if (l.length < 2) return { fehler: 'keine-streuung' };
    if (l.length > KLASSEN_MAX_STUFEN) return { fehler: 'zu-viele-stufen' };
    stufen.push(l);
  }
  const X = nimm.map(r => ix.map((i, k) => stufen[k]!.indexOf(zeilen[r]![i] as string | number)));
  return { X, zeilen: nimm, weg, stufen };
}

export interface KlassenLoesung {
  K: number; n: number; ll: number; npar: number; bic: number; aic: number; entropie: number;
  anteil: number[]; zahl: number[]; zuordnungsWs: number[];
  /** wahrsch[klasse][spalte][stufe] */
  wahrsch: number[][][];
  gruppe: number[];
  starts: number; brauchbar: number; gleichBest: number;
}
interface Roh { ll: number; z: number[][]; w: number[]; pr: number[][][]; nk: number[] }

const logSumExp = (a: number[]) => { let m = -Infinity; for (const v of a) if (v > m) m = v; let s = 0; for (const v of a) s += Math.exp(v - m); return m + Math.log(s); };

function emEinmal(X: number[][], J: number[], K: number, rng: () => number): Roh | null {
  const n = X.length, p = J.length;
  let w = new Array<number>(K).fill(1 / K);
  let pr = Array.from({ length: K }, () => J.map(Jj => { const r = Array.from({ length: Jj }, () => rng() + 1e-6); const s = r.reduce((a, b) => a + b, 0); return r.map(v => v / s); }));
  const z = Array.from({ length: n }, () => new Array<number>(K).fill(0));
  const lg = new Array<number>(K).fill(0);
  let ll0 = -Infinity, ll = -Infinity, nk = new Array<number>(K).fill(0);
  for (let it = 0; it < 5000; it++) {
    ll = 0;
    for (let i = 0; i < n; i++) {
      const x = X[i]!;
      for (let k = 0; k < K; k++) { let s = Math.log(w[k]!); for (let j = 0; j < p; j++) s += Math.log(Math.max(pr[k]![j]![x[j]!]!, 1e-300)); lg[k] = s; }
      const t = logSumExp(lg); ll += t;
      for (let k = 0; k < K; k++) z[i]![k] = Math.exp(lg[k]! - t);
    }
    if (!Number.isFinite(ll)) return null;
    if (Math.abs(ll - ll0) < 1e-12 * Math.abs(ll)) break;
    ll0 = ll;
    nk = new Array<number>(K).fill(0);
    for (let i = 0; i < n; i++) for (let k = 0; k < K; k++) nk[k]! += z[i]![k]!;
    if (nk.some(v => !(v > 1e-9))) return null;
    w = nk.map(v => v / n);
    pr = Array.from({ length: K }, () => J.map(Jj => new Array<number>(Jj).fill(0)));
    for (let i = 0; i < n; i++) for (let k = 0; k < K; k++) { const zk = z[i]![k]!; for (let j = 0; j < p; j++) pr[k]![j]![X[i]![j]!]! += zk; }
    for (let k = 0; k < K; k++) for (let j = 0; j < p; j++) for (let v = 0; v < J[j]!; v++) pr[k]![j]![v]! /= nk[k]!;
  }
  if (nk.some(v => v < 2)) return null;
  return { ll, z, w, pr, nk };
}

const parameter = (K: number, J: number[]) => (K - 1) + K * J.reduce((a, b) => a + b - 1, 0);

/** Eine Lösung für K Klassen: bestes von `starts` Läufen. `null`, wenn kein Lauf eine brauchbare Lösung fand. */
export function klassenFit(X: number[][], J: number[], K: number, startwert: number, starts = klassenStartsFuer(X.length, J.length)): KlassenLoesung | null {
  const n = X.length;
  let best: Roh | null = null, brauchbar = 0;
  const lls: number[] = [];
  for (let s = 0; s < (K === 1 ? 1 : starts); s++) {
    const r = emEinmal(X, J, K, strom(startwert, 1000 * K + s));
    if (!r) continue;
    brauchbar++; lls.push(r.ll);
    if (!best || r.ll > best.ll) best = r;
  }
  if (!best) return null;
  const gleich = lls.filter(v => Math.abs(v - best!.ll) < 1e-6 * Math.abs(best!.ll)).length;
  const mod = best.z.map(r => { let b = 0; for (let k = 1; k < K; k++) if (r[k]! > r[b]!) b = k; return b; });
  const zahl = new Array<number>(K).fill(0); for (const g of mod) zahl[g]!++;
  const ord = Array.from({ length: K }, (_, k) => k).sort((a, b) => zahl[b]! - zahl[a]! || best!.pr[a]![0]![0]! - best!.pr[b]![0]![0]!);
  const neu = new Array<number>(K); ord.forEach((alt, i) => { neu[alt] = i; });
  let H = 0; for (const r of best.z) for (const t of r) if (t > 1e-300) H += t * Math.log(t);
  const entropie = K === 1 ? NaN : 1 + H / (n * Math.log(K));
  const ws = new Array<number>(K).fill(0); best.z.forEach((r, i) => { ws[mod[i]!]! += r[mod[i]!]!; });
  const npar = parameter(K, J);
  return {
    K, n, ll: best.ll, npar, bic: -2 * best.ll + npar * Math.log(n), aic: -2 * best.ll + 2 * npar, entropie,
    anteil: ord.map(k => best!.w[k]!), zahl: ord.map(k => zahl[k]!), zuordnungsWs: ord.map(k => (zahl[k]! ? ws[k]! / zahl[k]! : NaN)),
    wahrsch: ord.map(k => best!.pr[k]!), gruppe: mod.map(g => neu[g]!),
    starts: K === 1 ? 1 : starts, brauchbar, gleichBest: gleich
  };
}

export interface KlassenErgebnis { n: number; p: number; J: number[]; startwert: number; kMax: number; loesungen: (KlassenLoesung | null)[]; bestK: number | null }

/** Alle K von 1 bis kMax; die beste Zahl nach BIC (nur aus brauchbaren Lösungen). */
export function klassenRechne(X: number[][], J: number[], kMax: number, startwert: number): KlassenErgebnis | KlassenFehler {
  const n = X.length, p = J.length;
  const km = Math.min(kMax, KLASSEN_MAX_K, Math.floor(n / 10));
  if (km < 2) return { fehler: 'k-zu-gross' };
  const loesungen: (KlassenLoesung | null)[] = [];
  for (let K = 1; K <= km; K++) loesungen.push(klassenFit(X, J, K, startwert));
  const ok = loesungen.filter((l): l is KlassenLoesung => !!l);
  if (!ok.length) return { fehler: 'keine-loesung' };
  const bestK = ok.reduce((a, b) => (b.bic < a.bic ? b : a)).K;
  return { n, p, J, startwert, kMax: km, loesungen, bestK };
}

/* ------------------------------------------------------------------ R-Skript */

const zz = (v: number, d = 3) => (Number.isFinite(v) ? String(Number(v.toFixed(d))) : 'NA');

/** R-Skript zum Mitnehmen: eigener EM in Basis-R, feste Namen `vergleich`, `klassen`, `antwort`, `zuordnung`. Spaltennamen nur über rAnzeigeText. */
export function baueKlassenSkript(o: { spalten: RSpalte[]; zeilen: (string | number | null)[][]; benutzt: string[]; r: KlassenErgebnis; k: number; titel: string; datum: string }): RSkript {
  const sp = o.benutzt.map(n => o.spalten.find(c => c.name === n)!).filter(Boolean);
  const csv = datenCsv({ spalten: sp, zeilen: o.zeilen, blattSpalten: [], titel: o.titel, datum: o.datum }, sp);
  const basis = rDateiBasis(o.titel), csvName = `${basis}-daten.csv`, rName = `${basis}.R`;
  const q = rAnzeigeText, e = o.r;
  const lg = e.loesungen.find(l => l?.K === o.k);
  const namen = sp.map(c => q(c.name)).join(', ');
  const r = [
    `# ${kom(o.titel)}`,
    `# ${L(`Erstellt mit Statable (statable.eu) am ${kom(o.datum)}`, `Created with Statable (statable.eu) on ${kom(o.datum)}`)}`,
    `# ${L('Latente Klassen (latent class analysis): jede Person gehört unbekannt zu einer von K Klassen, in der Klasse sind die Spalten unabhängig und haben eigene Antwortwahrscheinlichkeiten. EM-Algorithmus in Basis-R, ohne Paket.', 'Latent classes (latent class analysis): each person belongs, unknown, to one of K classes, within the class the columns are independent and have their own answer probabilities. EM algorithm in base R, without a package.')}`,
    `# ${L('Starten: Ordner entpacken, in R mit setwd() in den Ordner wechseln (in RStudio: Session > Set Working Directory > To Source File Location), dann source() mit dem Namen dieser Datei.', 'How to start it: unzip the folder, change to it with setwd() in R (in RStudio: Session > Set Working Directory > To Source File Location), then source() this file.')}`,
    '',
    `# ${L('Daten lesen (fehlende Werte als leere Zelle); nur Personen mit Werten in allen Spalten; jede Spalte wird in Stufen 1 bis J gezählt', 'Read the data (missing values as an empty cell); only people with values in all columns; each column is counted in levels 1 to J')}`,
    `daten <- read.csv(${q(csvName)}, fileEncoding = "UTF-8", check.names = FALSE, na.strings = "")`,
    `daten <- daten[stats::complete.cases(daten[, c(${namen}), drop = FALSE]), c(${namen}), drop = FALSE]`,
    'stufen <- lapply(daten, function(x) sort(unique(x)))',
    'X <- sapply(seq_along(daten), function(j) match(daten[[j]], stufen[[j]]))',
    'colnames(X) <- names(daten); J <- lengths(stufen)',
    `n <- nrow(X); p <- ncol(X); k_max <- ${rGanz(e.kMax)}; k_gewaehlt <- ${rGanz(o.k)}; starts <- ${rGanz(klassenStartsFuer(e.n, e.p))}`,
    '',
    `# ${L('EM-Algorithmus; Startwerte: zufällige Antwortwahrscheinlichkeiten, bestes von mehreren Läufen; Klassen unter 2 Personen zählen nicht', 'EM algorithm; start values: random answer probabilities, best of several runs; classes under 2 people do not count')}`,
    'em <- function(K, saat) {',
    '  best <- NULL; set.seed(saat)',
    '  for (s in seq_len(if (K == 1) 1 else starts)) {',
    '    w <- rep(1 / K, K); nk <- rep(n / K, K); ll0 <- -Inf',
    '    pr <- lapply(1:K, function(k) lapply(J, function(Jj) { v <- runif(Jj) + 1e-6; v / sum(v) }))',
    '    for (it in 1:5000) {',
    '      lg <- sapply(1:K, function(k) log(w[k]) + Reduce(`+`, lapply(1:p, function(j) log(pmax(pr[[k]][[j]][X[, j]], 1e-300)))))',
    '      if (K == 1) lg <- matrix(lg, n, 1)',
    '      m <- apply(lg, 1, max); t <- m + log(rowSums(exp(lg - m))); ll <- sum(t); z <- exp(lg - t)',
    '      if (abs(ll - ll0) < 1e-10 * abs(ll)) break; ll0 <- ll',
    '      nk <- colSums(z); if (any(nk < 1e-9)) break; w <- nk / n',
    '      pr <- lapply(1:K, function(k) lapply(1:p, function(j) vapply(seq_len(J[j]), function(v) sum(z[X[, j] == v, k]), 0) / nk[k]))',
    '    }',
    '    if (any(nk < 2)) next',
    '    if (is.null(best) || ll > best$ll) best <- list(ll = ll, z = z, w = w, pr = pr)',
    '  }',
    '  best',
    '}',
    '',
    `# ${L('Vergleich der Klassenzahlen: BIC (kleiner ist besser), AIC, Entropie (1 = jede Person eindeutig zugeordnet)', 'Comparing the numbers of classes: BIC (smaller is better), AIC, entropy (1 = every person clearly assigned)')}`,
    `loes <- lapply(1:k_max, em, saat = ${rGanz(e.startwert)})`,
    'vergleich <- do.call(rbind, lapply(1:k_max, function(K) { b <- loes[[K]]; if (is.null(b)) return(NULL)',
    '  npar <- (K - 1) + K * sum(J - 1); mod <- max.col(b$z, ties.method = "first")',
    '  data.frame(K = K, ll = b$ll, npar = npar, bic = -2 * b$ll + npar * log(n), aic = -2 * b$ll + 2 * npar,',
    '    entropie = if (K == 1) NA else 1 + sum(ifelse(b$z > 0, b$z * log(pmax(b$z, 1e-300)), 0)) / (n * log(K)), kleinste = min(tabulate(mod, K))) }))',
    'print(vergleich)',
    '',
    `# ${L('Klassen der gewählten Klassenzahl (nach Größe geordnet): Größe, Antwortwahrscheinlichkeiten je Klasse, Zuordnung je Person', 'Classes of the chosen number of classes (ordered by size): size, answer probabilities per class, assignment per person')}`,
    'b <- loes[[k_gewaehlt]]; mod <- max.col(b$z, ties.method = "first"); o <- order(-tabulate(mod, k_gewaehlt))',
    'klassen <- data.frame(klasse = seq_len(k_gewaehlt), anzahl = tabulate(mod, k_gewaehlt)[o], anteil = b$w[o])',
    'antwort <- do.call(rbind, lapply(1:p, function(j) data.frame(spalte = colnames(X)[j], stufe = stufen[[j]], do.call(cbind, lapply(o, function(k) b$pr[[k]][[j]])))))',
    'names(antwort)[-(1:2)] <- paste0("klasse", seq_len(k_gewaehlt))',
    'zuordnung <- match(mod, o)',
    'print(klassen); print(antwort)',
    '',
    `# ${L('Zum Vergleichen: Das hat Statable gezeigt (Zahlen mit Punkt)', 'To compare: this is what Statable showed (numbers with a decimal point)')}`,
    `# ${kom(L(`Personen: ${e.n}, Spalten: ${e.p}, beste Klassenzahl nach BIC: ${e.bestK ?? '-'}`, `People: ${e.n}, columns: ${e.p}, best number of classes by BIC: ${e.bestK ?? '-'}`))}`,
    ...e.loesungen.filter((l): l is KlassenLoesung => !!l).map(l => `# ${kom(`K = ${l.K}: ll = ${zz(l.ll, 2)}, BIC = ${zz(l.bic, 2)}, ${L('Entropie', 'entropy')} = ${zz(l.entropie)}`)}`),
    ...(lg ? [`# ${kom(L(`Klassen bei K = ${o.k}: ${lg.zahl.join(', ')} Personen`, `Classes at K = ${o.k}: ${lg.zahl.join(', ')} people`))}`] : []),
    `# ${kom(String(rZahl(e.startwert)))}`,
    ''
  ].join('\n');
  return { r, csv, rName, csvName };
}
