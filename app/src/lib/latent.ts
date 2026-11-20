/**
 * B4 Teil 3: latente Profile (Profilanalyse, latent profile analysis) - Mischung von Normalverteilungen für Zahlen-Spalten.
 * Fachblatt docs/ausbau/FACHBLATT-B4-PSYCHOLOGIE.md, Abschnitt Teil 3. Rechnung im Browser, kein R.
 *
 * Modell: Jede Person gehört (unbekannt) zu einer von K Gruppen mit Anteil w_k; innerhalb einer Gruppe sind die Spalten unabhängig und normalverteilt
 * (Mittelwert je Gruppe und Spalte). Streuungen: „gleich“ = eine Streuung je Spalte für alle Gruppen (mclust EEI), „frei“ = eine je Gruppe und Spalte (mclust VVI).
 * Schätzung: EM-Algorithmus (Dempster, Laird & Rubin 1977) mit vielen Startwerten (K zufällige Fälle als Mitten, Streuung am Anfang die der ganzen Daten), bestes Ergebnis nach log-Likelihood;
 * entartete Lösungen (Streuung unter 1/10.000 der Gesamtstreuung oder Gruppe mit weniger als 2 Personen) zählen nicht.
 * Kennzahlen: log-Likelihood, Zahl der Parameter, BIC = −2·ll + npar·ln n (kleiner ist besser; Nylund, Asparouhov & Muthén 2007), AIC, relative Entropie
 * (1 + Σ τ ln τ / (n ln K), 1 = jede Person eindeutig zugeordnet), Gruppengrößen, mittlere Zuordnungswahrscheinlichkeit je Gruppe.
 * Gruppen sind nach Größe (absteigend), bei gleicher Größe nach dem Mittelwert der ersten Spalte geordnet; die Nummern sind nur Etiketten.
 * Sollwerte: scripts/profile-erwartet.R (mclust und eigener EM in Basis-R), Wächter lib/latent.test.ts.
 *
 * R-Skript (Regel aus B1): Basis-R mit eigenem EM (kein Paket), dieselben Regeln; die Startwerte sind andere Zufallsfälle als in Statable, das beste Ergebnis ist darum gleich,
 * die Reihenfolge der Gruppen ist nach Größe geordnet wie in Statable.
 * FESTE OBJEKTNAMEN im Skript (Gegenprobe latent.test.ts): `X`, `vergleich` (data.frame K, ll, npar, bic, aic, entropie, kleinste), `profil` (Mittelwerte je Gruppe der gewählten Zahl K), `zuordnung` (Gruppe je Person der gewählten Zahl K).
 */
import { L } from './sitzung.svelte';
import { istFehlend } from './fehlend';
import { strom } from './lernlabor';
import { datenCsv, kom, rDateiBasis, type RSkript, type RSpalte } from './rskript';
import { rAnzeigeText, rZahl, rGanz, rBool } from '../engine/rsicher';

export type LatentModell = 'gleich' | 'frei';
export const PROFIL_MIN_SPALTEN = 2;
export const PROFIL_MAX_SPALTEN = 15;
export const PROFIL_MIN_FAELLE = 30;
export const PROFIL_MAX_FAELLE = 10_000;
export const PROFIL_MAX_K = 8;
export const PROFIL_STARTS = 40;
/** Bei großen Daten weniger Startwerte (Rechenzeit im Browser). */
export const startsFuer = (n: number, p: number) => (n * p > 20_000 ? 20 : PROFIL_STARTS);

export type ProfilFehler = { fehler: 'zu-wenig-spalten' | 'zu-viele-spalten' | 'zu-wenig-faelle' | 'zu-viele-faelle' | 'keine-streuung' | 'k-zu-gross' | 'keine-loesung' };
export interface ProfilDaten { X: number[][]; zeilen: number[]; weg: number }

const leer = (sp: RSpalte, v: unknown) => v === null || v === undefined || v === '' || (typeof v === 'number' && (!Number.isFinite(v) || istFehlend(sp, v)));

/** Vollständige Fälle (nur Zahlen-Spalten). */
export function profilDaten(spalten: RSpalte[], zeilen: (string | number | null)[][], namen: string[]): ProfilDaten | ProfilFehler {
  const sp = namen.map(n => spalten.find(c => c.name === n)).filter((c): c is RSpalte => !!c && c.art === 'zahl');
  if (sp.length < PROFIL_MIN_SPALTEN) return { fehler: 'zu-wenig-spalten' };
  if (sp.length > PROFIL_MAX_SPALTEN) return { fehler: 'zu-viele-spalten' };
  const ix = sp.map(c => spalten.indexOf(c)), nimm: number[] = []; let weg = 0;
  zeilen.forEach((z, r) => { if (sp.some((c, k) => leer(c, z[ix[k]!]))) weg++; else nimm.push(r); });
  if (nimm.length < PROFIL_MIN_FAELLE) return { fehler: 'zu-wenig-faelle' };
  if (nimm.length > PROFIL_MAX_FAELLE) return { fehler: 'zu-viele-faelle' };
  const X = nimm.map(r => ix.map(i => zeilen[r]![i] as number));
  const p = X[0]!.length;
  for (let j = 0; j < p; j++) { const a = X[0]![j]!; if (X.every(z => z[j] === a)) return { fehler: 'keine-streuung' }; }
  return { X, zeilen: nimm, weg };
}

export interface ProfilLoesung {
  K: number; modell: LatentModell; n: number;
  ll: number; npar: number; bic: number; aic: number;
  /** relative Entropie 0 bis 1; bei K = 1 nicht definiert (NaN) */
  entropie: number;
  /** Anteil, Zahl (nach höchster Wahrscheinlichkeit), mittlere Zuordnungswahrscheinlichkeit; Mittelwerte und Streuungen je Gruppe (Zeile) und Spalte */
  anteil: number[]; zahl: number[]; zuordnungsWs: number[];
  mittel: number[][]; sd: number[][];
  /** Gruppe (0-basiert, geordnet) je Person */
  gruppe: number[];
  /** Zahl der Startwerte, die zu einer brauchbaren Lösung kamen, und davon die mit demselben besten Ergebnis */
  starts: number; brauchbar: number; gleichBest: number;
}

interface Roh { ll: number; z: number[][]; mu: number[][]; V: number[][]; w: number[]; nk: number[] }

const logSumExp = (a: number[]) => { let m = -Infinity; for (const v of a) if (v > m) m = v; let s = 0; for (const v of a) s += Math.exp(v - m); return m + Math.log(s); };
const LOG2PI = Math.log(2 * Math.PI);

function emEinmal(X: number[][], K: number, frei: boolean, v0: number[], rng: () => number): Roh | null {
  const n = X.length, p = v0.length;
  // Startmitten: K verschiedene zufällige Fälle
  const idx: number[] = []; let guard = 0;
  while (idx.length < K && guard++ < 1000) { const i = Math.floor(rng() * n); if (!idx.includes(i) && !idx.some(j => X[j]!.every((v, c) => v === X[i]![c]))) idx.push(i); }
  if (idx.length < K) return null;
  let mu = idx.map(i => [...X[i]!]), V = Array.from({ length: K }, () => [...v0]), w = new Array<number>(K).fill(1 / K);
  const z = Array.from({ length: n }, () => new Array<number>(K).fill(0));
  const lg = new Array<number>(K).fill(0);
  let ll0 = -Infinity, ll = -Infinity, nk = new Array<number>(K).fill(0);
  for (let it = 0; it < 1000; it++) {
    ll = 0;
    for (let i = 0; i < n; i++) {
      const x = X[i]!;
      for (let k = 0; k < K; k++) {
        let s = Math.log(w[k]!);
        for (let j = 0; j < p; j++) { const d = x[j]! - mu[k]![j]!; s -= 0.5 * (LOG2PI + Math.log(V[k]![j]!) + d * d / V[k]![j]!); }
        lg[k] = s;
      }
      const t = logSumExp(lg); ll += t;
      for (let k = 0; k < K; k++) z[i]![k] = Math.exp(lg[k]! - t);
    }
    if (!Number.isFinite(ll)) return null;
    if (Math.abs(ll - ll0) < 1e-10 * Math.abs(ll)) break;
    ll0 = ll;
    nk = new Array<number>(K).fill(0);
    for (let i = 0; i < n; i++) for (let k = 0; k < K; k++) nk[k]! += z[i]![k]!;
    if (nk.some(v => !(v > 1e-9))) return null;
    w = nk.map(v => v / n);
    mu = Array.from({ length: K }, () => new Array<number>(p).fill(0));
    for (let i = 0; i < n; i++) for (let k = 0; k < K; k++) { const zk = z[i]![k]!; for (let j = 0; j < p; j++) mu[k]![j]! += zk * X[i]![j]!; }
    for (let k = 0; k < K; k++) for (let j = 0; j < p; j++) mu[k]![j]! /= nk[k]!;
    const Vn = Array.from({ length: K }, () => new Array<number>(p).fill(0));
    for (let i = 0; i < n; i++) for (let k = 0; k < K; k++) { const zk = z[i]![k]!; for (let j = 0; j < p; j++) { const d = X[i]![j]! - mu[k]![j]!; Vn[k]![j]! += zk * d * d; } }
    for (let k = 0; k < K; k++) for (let j = 0; j < p; j++) Vn[k]![j]! /= nk[k]!;
    if (frei) V = Vn.map(r => r.map((v, j) => Math.max(v, 1e-8 * v0[j]!)));
    else { const g = v0.map((_, j) => { let s = 0; for (let k = 0; k < K; k++) s += nk[k]! * Vn[k]![j]!; return s / n; }); V = Array.from({ length: K }, () => [...g]); }
  }
  if (nk.some(v => v < 2) || V.some(r => r.some((v, j) => v < 1e-4 * v0[j]!))) return null;
  return { ll, z, mu, V, w, nk };
}

const parameter = (K: number, p: number, frei: boolean) => (K - 1) + K * p + (frei ? K * p : p);

/** Eine Lösung für K Gruppen: bestes von `starts` Läufen. `null`, wenn kein Lauf eine brauchbare Lösung fand. */
export function profilFit(X: number[][], K: number, modell: LatentModell, startwert: number, starts = startsFuer(X.length, X[0]!.length)): ProfilLoesung | null {
  const n = X.length, p = X[0]!.length, frei = modell === 'frei';
  const v0 = Array.from({ length: p }, (_, j) => { let m = 0; for (const z of X) m += z[j]!; m /= n; let s = 0; for (const z of X) s += (z[j]! - m) ** 2; return s / n; });
  let best: Roh | null = null, brauchbar = 0, gleich = 0;
  const lls: number[] = [];
  for (let s = 0; s < (K === 1 ? 1 : starts); s++) {
    const r = emEinmal(X, K, frei, v0, strom(startwert, 1000 * K + s));
    if (!r) continue;
    brauchbar++; lls.push(r.ll);
    if (!best || r.ll > best.ll) best = r;
  }
  if (!best) return null;
  gleich = lls.filter(v => Math.abs(v - best!.ll) < 1e-6 * Math.abs(best!.ll)).length;
  const mod = best.z.map(r => { let b = 0; for (let k = 1; k < K; k++) if (r[k]! > r[b]!) b = k; return b; });
  const zahl = new Array<number>(K).fill(0); for (const g of mod) zahl[g]!++;
  const ord = Array.from({ length: K }, (_, k) => k).sort((a, b) => zahl[b]! - zahl[a]! || best!.mu[a]![0]! - best!.mu[b]![0]!);
  const neu = new Array<number>(K); ord.forEach((alt, i) => { neu[alt] = i; });
  let H = 0; for (const r of best.z) for (const t of r) if (t > 1e-300) H += t * Math.log(t);
  const entropie = K === 1 ? NaN : 1 + H / (n * Math.log(K));
  const ws = new Array<number>(K).fill(0); best.z.forEach((r, i) => { ws[mod[i]!]! += r[mod[i]!]!; });
  const npar = parameter(K, p, frei);
  return {
    K, modell, n, ll: best.ll, npar, bic: -2 * best.ll + npar * Math.log(n), aic: -2 * best.ll + 2 * npar, entropie,
    anteil: ord.map(k => best!.w[k]!), zahl: ord.map(k => zahl[k]!), zuordnungsWs: ord.map(k => (zahl[k]! ? ws[k]! / zahl[k]! : NaN)),
    mittel: ord.map(k => best!.mu[k]!), sd: ord.map(k => best!.V[k]!.map(Math.sqrt)), gruppe: mod.map(g => neu[g]!),
    starts: K === 1 ? 1 : starts, brauchbar, gleichBest: gleich
  };
}

export interface ProfilErgebnis { n: number; p: number; modell: LatentModell; startwert: number; kMax: number; loesungen: (ProfilLoesung | null)[]; bestK: number | null }

/** Alle K von 1 bis kMax; die beste Zahl nach BIC (nur aus brauchbaren Lösungen). */
export function profilRechne(X: number[][], modell: LatentModell, kMax: number, startwert: number): ProfilErgebnis | ProfilFehler {
  const n = X.length, p = X[0]!.length;
  const km = Math.min(kMax, PROFIL_MAX_K, Math.floor(n / 10));
  if (km < 2) return { fehler: 'k-zu-gross' };
  const loesungen: (ProfilLoesung | null)[] = [];
  for (let K = 1; K <= km; K++) loesungen.push(profilFit(X, K, modell, startwert));
  const ok = loesungen.filter((l): l is ProfilLoesung => !!l);
  if (!ok.length) return { fehler: 'keine-loesung' };
  const bestK = ok.reduce((a, b) => (b.bic < a.bic ? b : a)).K;
  return { n, p, modell, startwert, kMax: km, loesungen, bestK };
}

/* ------------------------------------------------------------------ R-Skript */

const zz = (v: number, d = 3) => (Number.isFinite(v) ? String(Number(v.toFixed(d))) : 'NA');

export function baueProfilSkript(o: { spalten: RSpalte[]; zeilen: (string | number | null)[][]; benutzt: string[]; r: ProfilErgebnis; k: number; titel: string; datum: string }): RSkript {
  const sp = o.benutzt.map(n => o.spalten.find(c => c.name === n)!).filter(Boolean);
  const csv = datenCsv({ spalten: sp, zeilen: o.zeilen, blattSpalten: [], titel: o.titel, datum: o.datum }, sp);
  const basis = rDateiBasis(o.titel), csvName = `${basis}-daten.csv`, rName = `${basis}.R`;
  const q = rAnzeigeText, e = o.r, frei = e.modell === 'frei';
  const lg = e.loesungen.find(l => l?.K === o.k);
  const r = [
    `# ${kom(o.titel)}`,
    `# ${L(`Erstellt mit Statable (statable.eu) am ${kom(o.datum)}`, `Created with Statable (statable.eu) on ${kom(o.datum)}`)}`,
    `# ${L('Latente Profile (Mischung von Normalverteilungen): jede Person gehört unbekannt zu einer von K Gruppen, in der Gruppe sind die Spalten unabhängig normalverteilt. EM-Algorithmus in Basis-R, ohne Paket.', 'Latent profiles (mixture of normal distributions): each person belongs, unknown, to one of K groups, within the group the columns are independent and normal. EM algorithm in base R, without a package.')}`,
    `# ${L('Starten: Ordner entpacken, in R mit setwd() in den Ordner wechseln (in RStudio: Session > Set Working Directory > To Source File Location), dann source() mit dem Namen dieser Datei.', 'How to start it: unzip the folder, change to it with setwd() in R (in RStudio: Session > Set Working Directory > To Source File Location), then source() this file.')}`,
    '',
    `# ${L('Daten lesen (fehlende Werte als leere Zelle); nur Personen mit Werten in allen Spalten', 'Read the data (missing values as an empty cell); only people with values in all columns')}`,
    `daten <- read.csv(${q(csvName)}, fileEncoding = "UTF-8", check.names = FALSE, na.strings = "")`,
    `X <- as.matrix(daten[stats::complete.cases(daten), c(${sp.map(c => q(c.name)).join(', ')}), drop = FALSE])`,
    `n <- nrow(X); p <- ncol(X); frei <- ${rBool(frei)}; k_max <- ${rGanz(e.kMax)}; k_gewaehlt <- ${rGanz(o.k)}; starts <- ${rGanz(startsFuer(e.n, e.p))}`,
    `# ${L(`Streuungen: ${frei ? 'frei = je Gruppe und Spalte eine Streuung' : 'gleich = je Spalte eine Streuung für alle Gruppen'}`, `Variances: ${frei ? 'free = one per group and column' : 'equal = one per column for all groups'}`)}`,
    '',
    `# ${L('EM-Algorithmus; Startwerte: K zufällige Personen als Mitten, bestes von mehreren Läufen; entartete Lösungen (Streuung fast 0, Gruppe unter 2 Personen) zählen nicht', 'EM algorithm; start values: K random people as centres, best of several runs; degenerate solutions (variance almost 0, group under 2 people) do not count')}`,
    'v0 <- apply(X, 2, var) * (n - 1) / n',
    'em <- function(K, saat) {',
    '  best <- NULL; set.seed(saat)',
    '  for (s in seq_len(if (K == 1) 1 else starts)) {',
    '    mu <- X[sample(n, K), , drop = FALSE]; V <- matrix(rep(v0, each = K), K); w <- rep(1 / K, K); ll0 <- -Inf; nk <- rep(0, K)',
    '    for (it in 1:1000) {',
    '      lg <- sapply(1:K, function(g) log(w[g]) + rowSums(dnorm(X, matrix(mu[g, ], n, p, byrow = TRUE), matrix(sqrt(V[g, ]), n, p, byrow = TRUE), log = TRUE)))',
    '      if (K == 1) lg <- matrix(lg, n, 1)',
    '      m <- apply(lg, 1, max); t <- m + log(rowSums(exp(lg - m))); ll <- sum(t); z <- exp(lg - t)',
    '      if (abs(ll - ll0) < 1e-10 * abs(ll)) break; ll0 <- ll',
    '      nk <- colSums(z); w <- nk / n; mu <- t(z) %*% X / nk',
    '      Vn <- matrix(t(sapply(1:K, function(g) colSums(z[, g] * (X - matrix(mu[g, ], n, p, byrow = TRUE))^2) / nk[g])), K)',
    '      V <- if (frei) pmax(Vn, 1e-8 * rep(v0, each = K)) else matrix(rep(colSums(nk * Vn) / n, each = K), K)',
    '    }',
    '    if (any(V < 1e-4 * rep(v0, each = K)) || any(nk < 2)) next',
    '    if (is.null(best) || ll > best$ll) best <- list(ll = ll, z = z, mu = mu, V = V)',
    '  }',
    '  best',
    '}',
    '',
    `# ${L('Vergleich der Gruppenzahlen: BIC (kleiner ist besser), AIC, Entropie (1 = jede Person eindeutig zugeordnet)', 'Comparing the numbers of groups: BIC (smaller is better), AIC, entropy (1 = every person clearly assigned)')}`,
    'loes <- lapply(1:k_max, em, saat = ' + rGanz(e.startwert) + ')',
    'vergleich <- do.call(rbind, lapply(1:k_max, function(K) { b <- loes[[K]]; if (is.null(b)) return(NULL)',
    '  npar <- (K - 1) + K * p + (if (frei) K * p else p); mod <- max.col(b$z, ties.method = "first")',
    '  data.frame(K = K, ll = b$ll, npar = npar, bic = -2 * b$ll + npar * log(n), aic = -2 * b$ll + 2 * npar,',
    '    entropie = if (K == 1) NA else 1 + sum(ifelse(b$z > 0, b$z * log(pmax(b$z, 1e-300)), 0)) / (n * log(K)), kleinste = min(tabulate(mod, K))) }))',
    'print(vergleich)',
    '',
    `# ${L('Profil der gewählten Gruppenzahl (Gruppen nach Größe geordnet): Mittelwerte je Gruppe und Spalte, Zuordnung je Person', 'Profile of the chosen number of groups (groups ordered by size): means per group and column, assignment per person')}`,
    'b <- loes[[k_gewaehlt]]; mod <- max.col(b$z, ties.method = "first"); o <- order(-tabulate(mod, k_gewaehlt), b$mu[, 1])',
    'profil <- data.frame(gruppe = seq_len(k_gewaehlt), anzahl = tabulate(mod, k_gewaehlt)[o], b$mu[o, , drop = FALSE]); names(profil)[-(1:2)] <- colnames(X)',
    'zuordnung <- match(mod, o)',
    'print(profil)',
    '',
    `# ${L('Zum Vergleichen: Das hat Statable gezeigt (Zahlen mit Punkt)', 'To compare: this is what Statable showed (numbers with a decimal point)')}`,
    `# ${kom(L(`Personen: ${e.n}, Spalten: ${e.p}, beste Gruppenzahl nach BIC: ${e.bestK ?? '-'}`, `People: ${e.n}, columns: ${e.p}, best number of groups by BIC: ${e.bestK ?? '-'}`))}`,
    ...e.loesungen.filter((l): l is ProfilLoesung => !!l).map(l => `# ${kom(`K = ${l.K}: ll = ${zz(l.ll, 2)}, BIC = ${zz(l.bic, 2)}, ${L('Entropie', 'entropy')} = ${zz(l.entropie)}`)}`),
    ...(lg ? [`# ${kom(L(`Gruppen bei K = ${o.k}: ${lg.zahl.join(', ')} Personen`, `Groups at K = ${o.k}: ${lg.zahl.join(', ')} people`))}`] : []),
    `# ${kom(String(rZahl(e.startwert)))}`,
    ''
  ].join('\n');
  return { r, csv, rName, csvName };
}
