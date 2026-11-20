/**
 * B2 Teil 2b: Instrumentvariablen als Block unter der Regression („Ist die Ursache selbst vom Ergebnis beeinflusst? (Instrumentvariablen, 2SLS)“).
 * Daten aus dem Blatt holen (Ziel, endogene Größe(n), übrige Merkmale, Instrumente; nur vollständige Fälle), Rechenkern lib/iv.ts (Teil 2a), R-Skript in Basis-R.
 * Fachblatt docs/ausbau/FACHBLATT-B2-OEKONOMETRIE.md, Abschnitt Teil 2b.
 *
 * R-Skript (Regel aus B1): Basis-R, Daten als CSV, keine Zusatzpakete (kein AER). Das Skript rechnet dasselbe wie lib/iv.ts von Hand (zwei Stufen mit Matrizen, klassisch und
 * robust HC1, erste Stufe mit F aller Instrumente, Wu-Hausman als Kontrollfunktion, Sargan nur bei überzähligen Instrumenten, OLS zum Vergleich).
 * Sicherheit wie lib/rskript.ts: Spaltennamen nur über rAnzeigeText, Kommentare über kom.
 * FESTE OBJEKTNAMEN im Skript (Gegenprobe ivblock.test.ts): `iv` und `ols` (je data.frame koef, b, se, t, p; `iv` zusätzlich se_robust, t_robust, p_robust),
 * `erste` (data.frame endo, F, df1, df2, p, r2), `wu` (Liste F, df1, df2, p), `sargan` (Liste chi2, df, p oder NULL), `sigma`, `r2`, `n`.
 */
import { L } from './sitzung.svelte';
import { istFehlend } from './fehlend';
import { ivRechnen, type IvErgebnis, type IvFehler } from './iv';
import { datenCsv, kom, rDateiBasis, type RSkript, type RSpalte } from './rskript';
import { rAnzeigeText } from '../engine/rsicher';

export const IV_MAX = 100000;
/** Faustregel (Stock & Yogo, Staiger & Stock): erste-Stufe-F unter 10 = schwache Instrumente. */
export const IV_SCHWACH_F = 10;

export interface IvDaten { y: number[]; endo: number[][]; exo: number[][]; inst: number[][]; endoNamen: string[]; exoNamen: string[]; zeilen: number[]; weg: number }
export type IvBlockFehler = { fehler: 'keine-auswahl' | 'zu-viele-faelle' | 'doppelt' | IvFehler['fehler'] };

const leer = (sp: RSpalte, v: unknown) => v === null || v === undefined || v === '' || (typeof v === 'number' && (!Number.isFinite(v) || istFehlend(sp, v)));

/** Vollständige Fälle für Ziel, endogene Größen, übrige Merkmale und Instrumente (alles Zahlen-Spalten, jede Spalte nur an einer Stelle). */
export function ivDaten(spalten: RSpalte[], zeilen: (string | number | null)[][], ziel: string, endo: string[], exo: string[], inst: string[]): IvDaten | IvBlockFehler {
  const alle = [ziel, ...endo, ...exo, ...inst];
  if (!ziel || !endo.length || !inst.length) return { fehler: 'keine-auswahl' };
  if (new Set(alle).size !== alle.length) return { fehler: 'doppelt' };
  const hol = (n: string) => spalten.find(c => c.name === n && c.art === 'zahl');
  const cs = alle.map(hol);
  if (cs.some(c => !c)) return { fehler: 'keine-auswahl' };
  const ix = (n: string) => spalten.indexOf(hol(n)!);
  const nimm: number[] = []; let weg = 0;
  zeilen.forEach((z, r) => { if (alle.some(n => leer(hol(n)!, z[ix(n)]))) weg++; else nimm.push(r); });
  if (nimm.length > IV_MAX) return { fehler: 'zu-viele-faelle' };
  const wert = (r: number, n: string) => zeilen[r]![ix(n)] as number;
  return { y: nimm.map(r => wert(r, ziel)), endo: nimm.map(r => endo.map(n => wert(r, n))), exo: nimm.map(r => exo.map(n => wert(r, n))), inst: nimm.map(r => inst.map(n => wert(r, n))), endoNamen: endo, exoNamen: exo, zeilen: nimm, weg };
}

export function ivBlockRechne(d: IvDaten): IvErgebnis | IvBlockFehler {
  if (d.endo[0] && d.inst[0] && d.inst[0].length < d.endo[0].length) return { fehler: 'zu-wenig-instrumente' };
  return ivRechnen(d.y, d.endo, d.exo, d.inst, d.endoNamen, d.exoNamen);
}

const zz = (v: number | undefined, d = 4): string => (typeof v === 'number' && Number.isFinite(v) ? String(Number(v.toFixed(d))) : 'NA');

export function baueIvSkript(o: { spalten: RSpalte[]; zeilen: (string | number | null)[][]; ziel: string; endo: string[]; exo: string[]; inst: string[]; r: IvErgebnis; titel: string; datum: string }): RSkript {
  const alle = [o.ziel, ...o.endo, ...o.exo, ...o.inst].map(n => o.spalten.find(c => c.name === n)!).filter(Boolean);
  const csv = datenCsv({ spalten: o.spalten, zeilen: o.zeilen, blattSpalten: [], titel: o.titel, datum: o.datum }, alle);
  const basis = rDateiBasis(o.titel), csvName = `${basis}-daten.csv`, rName = `${basis}.R`;
  const q = rAnzeigeText, e = o.r;
  const vek = (ns: string[]) => (ns.length ? `c(${ns.map(m => q(m)).join(', ')})` : 'character(0)');
  const r = [
    `# ${kom(o.titel)}`,
    `# ${L(`Erstellt mit Statable (statable.eu) am ${kom(o.datum)}`, `Created with Statable (statable.eu) on ${kom(o.datum)}`)}`,
    `# ${L('Instrumentvariablen (zweistufige Kleinste Quadrate, 2SLS): Schätzer, klassische und robuste Standardfehler (HC1), erste Stufe mit F-Test aller Instrumente, Wu-Hausman-Test, Sargan-Test (nur bei mehr Instrumenten als endogenen Größen) und gewöhnliche Regression (OLS) zum Vergleich. Von Hand in Basis-R, ohne Zusatzpaket.', 'Instrumental variables (two-stage least squares, 2SLS): estimate, classical and robust standard errors (HC1), first stage with the F test of all instruments, Wu-Hausman test, Sargan test (only with more instruments than endogenous variables) and ordinary regression (OLS) for comparison. Written out in base R, no extra package.')}`,
    `# ${L('Starten: Ordner entpacken, in R mit setwd() in den Ordner wechseln (in RStudio: Session > Set Working Directory > To Source File Location), dann source() mit dem Namen dieser Datei.', 'How to start it: unzip the folder, change to it with setwd() in R (in RStudio: Session > Set Working Directory > To Source File Location), then source() this file.')}`,
    '',
    `# ${L('Daten lesen (fehlende Werte als leere Zelle); nur Fälle mit Werten in allen Spalten', 'Read the data (missing values as an empty cell); only cases with values in all columns')}`,
    `daten <- read.csv(${q(csvName)}, fileEncoding = "UTF-8", check.names = FALSE, na.strings = "")`,
    `d <- daten[stats::complete.cases(daten), , drop = FALSE]`,
    `endo_namen <- ${vek(o.endo)}; exo_namen <- ${vek(o.exo)}; inst_namen <- ${vek(o.inst)}`,
    `y <- as.numeric(d[[${q(o.ziel)}]])`,
    'E <- as.matrix(d[, endo_namen, drop = FALSE]); W <- as.matrix(d[, exo_namen, drop = FALSE]); I <- as.matrix(d[, inst_namen, drop = FALSE])',
    'n <- length(y); q <- ncol(E); m <- ncol(I)',
    'X <- cbind(1, E, W); Z <- cbind(1, W, I); k <- ncol(X)',
    'namen <- c("(Intercept)", endo_namen, exo_namen)',
    '',
    `# ${L('Hilfsfunktion: kleinste Quadrate', 'Helper: least squares')}`,
    'ols_fit <- function(M, v) { inv <- solve(crossprod(M)); b <- drop(inv %*% crossprod(M, v)); e <- drop(v - M %*% b); list(b = b, inv = inv, e = e, rss = sum(e^2)) }',
    '',
    `# ${L('Erste Stufe: jede endogene Größe auf alle Instrumente und die übrigen Merkmale; F-Test aller Instrumente zusammen', 'First stage: each endogenous variable on all instruments and the other features; F test of all instruments together')}`,
    'Zr <- cbind(1, W); Xh <- X; res1 <- matrix(0, n, q); erste <- NULL',
    'for (j in seq_len(q)) {',
    '  voll <- ols_fit(Z, E[, j]); eing <- ols_fit(Zr, E[, j]); df1 <- m; df2 <- n - ncol(Z)',
    '  Fj <- ((eing$rss - voll$rss) / df1) / (voll$rss / df2); tss <- sum((E[, j] - mean(E[, j]))^2)',
    '  Xh[, 1 + j] <- E[, j] - voll$e; res1[, j] <- voll$e',
    '  erste <- rbind(erste, data.frame(endo = endo_namen[j], F = Fj, df1 = df1, df2 = df2, p = pf(Fj, df1, df2, lower.tail = FALSE), r2 = 1 - voll$rss / tss))',
    '}',
    '',
    `# ${L('Zweite Stufe: Schätzer mit den angepassten Werten der ersten Stufe, Fehler aber mit den echten Werten', 'Second stage: estimate with the fitted values of the first stage, but residuals with the real values')}`,
    'inv <- solve(crossprod(Xh)); b <- drop(inv %*% crossprod(Xh, y)); res <- drop(y - X %*% b)',
    'rss <- sum(res^2); df <- n - k; s2 <- rss / df; sigma <- sqrt(s2); r2 <- 1 - rss / sum((y - mean(y))^2)',
    'V <- s2 * inv; VR <- inv %*% crossprod(Xh * res) %*% inv * (n / df)   # HC1',
    'se <- sqrt(diag(V)); ser <- sqrt(diag(VR))',
    'iv <- data.frame(koef = namen, b = b, se = se, t = b / se, p = 2 * pt(-abs(b / se), df), se_robust = ser, t_robust = b / ser, p_robust = 2 * pt(-abs(b / ser), df), row.names = NULL)',
    '',
    `# ${L('Zum Vergleich: gewöhnliche Regression (OLS) und Wu-Hausman-Test (Residuen der ersten Stufe als Zusatzgrößen)', 'For comparison: ordinary regression (OLS) and the Wu-Hausman test (first-stage residuals as extra terms)')}`,
    'o <- ols_fit(X, y); se_o <- sqrt((o$rss / (n - k)) * diag(o$inv))',
    'ols <- data.frame(koef = namen, b = o$b, se = se_o, t = o$b / se_o, p = 2 * pt(-abs(o$b / se_o), n - k), row.names = NULL)',
    'ku <- ols_fit(cbind(X, res1), y); wdf2 <- n - k - q; wF <- ((o$rss - ku$rss) / q) / (ku$rss / wdf2)',
    'wu <- list(F = wF, df1 = q, df2 = wdf2, p = pf(wF, q, wdf2, lower.tail = FALSE))',
    '',
    `# ${L('Sargan-Test: nur wenn es mehr Instrumente als endogene Größen gibt (er prüft nur relativ: mindestens ein Instrument muss gültig sein)', 'Sargan test: only if there are more instruments than endogenous variables (it only tests relatively: at least one instrument must be valid)')}`,
    'sargan <- NULL',
    'if (m > q) { h <- ols_fit(Z, res); chi2 <- n * (1 - h$rss / rss); sargan <- list(chi2 = chi2, df = m - q, p = pchisq(chi2, m - q, lower.tail = FALSE)) }',
    '',
    `# ${L('Ausgabe', 'Output')}`,
    'print(iv); print(erste); print(wu); print(sargan); print(ols)',
    '',
    `# ${L('Zum Vergleichen: Das hat Statable gezeigt (Zahlen mit Punkt)', 'To compare: this is what Statable showed (numbers with a decimal point)')}`,
    `# ${kom(L(`Fälle: ${e.n}; erste Stufe: ${e.ersteStufen.map(s => `${s.name} F(${s.df1}, ${s.df2}) = ${zz(s.F, 2)}`).join('; ')}; Wu-Hausman: F(${e.wuHausman.df1}, ${e.wuHausman.df2}) = ${zz(e.wuHausman.F, 2)}, p = ${zz(e.wuHausman.p, 4)}`, `Cases: ${e.n}; first stage: ${e.ersteStufen.map(s => `${s.name} F(${s.df1}, ${s.df2}) = ${zz(s.F, 2)}`).join('; ')}; Wu-Hausman: F(${e.wuHausman.df1}, ${e.wuHausman.df2}) = ${zz(e.wuHausman.F, 2)}, p = ${zz(e.wuHausman.p, 4)}`))}`,
    ...e.koef.map(c => `# ${kom(`${c.name}: b = ${zz(c.b)}, ${L('Standardfehler', 'standard error')} ${zz(c.se)}, ${L('robust', 'robust')} ${zz(c.seRobust)}`)}`),
    ''
  ].join('\n');
  return { r, csv, rName, csvName };
}
