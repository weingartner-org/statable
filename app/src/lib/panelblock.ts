/**
 * B2 Teil 1b: Paneldaten als Block unter der Regression („Gleiche Einheiten über die Zeit? (Paneldaten, feste und zufällige Effekte)“).
 * Daten aus dem Blatt holen (Gruppenkennung, Ziel, Zahlen-Merkmale, nur vollständige Fälle), Rechenkern lib/panel.ts (Teil 1a), R-Skript in Basis-R.
 * Fachblatt docs/ausbau/FACHBLATT-B2-OEKONOMETRIE.md, Abschnitt Teil 1b.
 *
 * R-Skript (Regel aus B1): Basis-R, Daten als CSV, keine Zusatzpakete (kein plm). Das Skript rechnet dasselbe wie lib/panel.ts von Hand (Within, Pooled, Between,
 * zufällige Effekte nur bei ausgewogenem Panel, Hausman, F-Test, cluster-robust CR1). Sicherheit wie lib/rskript.ts: Spaltennamen nur über rAnzeigeText, Kommentare über kom.
 * FESTE OBJEKTNAMEN im Skript (Gegenprobe panelblock.test.ts): `fe`, `pooled`, `be`, `re` (je data.frame koef, b, se, t, p, se_cluster, t_cluster, p_cluster), `r2_fe`, `ftest` (Liste F, df1, df2, p),
 * `hausman` (Liste chi2, df, p; nur bei ausgewogenem Panel), `theta`, `sigma_u2`, `sigma_e2`, `N`, `n`, `k`.
 */
import { L } from './sitzung.svelte';
import { istFehlend } from './fehlend';
import { panelRechnen, type PanelErgebnis, type PanelFehler } from './panel';
import { datenCsv, kom, rDateiBasis, type RSkript, type RSpalte } from './rskript';
import { rAnzeigeText } from '../engine/rsicher';

export const PANEL_MAX = 100000;
/** Unter so vielen Gruppen sind die cluster-robusten Fehler unsicher (Faustregel, Cameron & Miller 2015). */
export const PANEL_WENIG_GRUPPEN = 30;

export interface PanelDaten { id: (string | number)[]; x: number[][]; y: number[]; namen: string[]; zeilen: number[]; weg: number }
export type PanelBlockFehler = { fehler: 'keine-merkmale' | 'zu-viele-faelle' | PanelFehler['fehler']; namen?: string[] };

const leer = (sp: RSpalte, v: unknown) => v === null || v === undefined || v === '' || (typeof v === 'number' && (!Number.isFinite(v) || istFehlend(sp, v)));

/** Vollständige Fälle für Gruppenkennung (beliebige Spalte), Ziel und Zahlen-Merkmale. */
export function panelDaten(spalten: RSpalte[], zeilen: (string | number | null)[][], gruppe: string, ziel: string, merkmale: string[]): PanelDaten | PanelBlockFehler {
  const sg = spalten.find(c => c.name === gruppe), sz = spalten.find(c => c.name === ziel && c.art === 'zahl');
  const sm = merkmale.map(n => spalten.find(c => c.name === n)).filter((c): c is RSpalte => !!c && c.art === 'zahl' && c.name !== gruppe && c.name !== ziel);
  if (!sg || !sz || !sm.length) return { fehler: 'keine-merkmale' };
  const ig = spalten.indexOf(sg), iz = spalten.indexOf(sz), im = sm.map(c => spalten.indexOf(c));
  const nimm: number[] = []; let weg = 0;
  zeilen.forEach((z, r) => { if (leer(sg, z[ig]) || leer(sz, z[iz]) || sm.some((c, k) => leer(c, z[im[k]!]))) weg++; else nimm.push(r); });
  if (nimm.length > PANEL_MAX) return { fehler: 'zu-viele-faelle' };
  return { id: nimm.map(r => zeilen[r]![ig]!), x: nimm.map(r => im.map(i => zeilen[r]![i] as number)), y: nimm.map(r => zeilen[r]![iz] as number), namen: sm.map(c => c.name), zeilen: nimm, weg };
}

/** Rechnet; bei „konstant“ nennt der Fehler die Merkmale, die innerhalb jeder Gruppe gleich bleiben (sie fallen bei festen Effekten weg). */
export function panelBlockRechne(d: PanelDaten): PanelErgebnis | PanelBlockFehler {
  const e = panelRechnen(d.id, d.x, d.y, d.namen);
  if (!('fehler' in e)) return e;
  if (e.fehler !== 'konstant') return e;
  const erste = new Map<string | number, number[]>(); const konst = d.namen.map(() => true);
  d.id.forEach((g, i) => { const r = erste.get(g); if (!r) erste.set(g, d.x[i]!.slice()); else d.x[i]!.forEach((v, j) => { if (v !== r[j]) konst[j] = false; }); });
  return { fehler: 'konstant', namen: d.namen.filter((_, j) => konst[j]) };
}

const zz = (v: number | undefined, d = 4): string => (typeof v === 'number' && Number.isFinite(v) ? String(Number(v.toFixed(d))) : 'NA');

export function bauePanelSkript(o: { spalten: RSpalte[]; zeilen: (string | number | null)[][]; gruppe: string; ziel: string; merkmale: string[]; r: PanelErgebnis; titel: string; datum: string }): RSkript {
  const alle = [o.gruppe, o.ziel, ...o.merkmale].map(n => o.spalten.find(c => c.name === n)!).filter(Boolean);
  const csv = datenCsv({ spalten: o.spalten, zeilen: o.zeilen, blattSpalten: [], titel: o.titel, datum: o.datum }, alle);
  const basis = rDateiBasis(o.titel), csvName = `${basis}-daten.csv`, rName = `${basis}.R`;
  const q = rAnzeigeText, e = o.r;
  const r = [
    `# ${kom(o.titel)}`,
    `# ${L(`Erstellt mit Statable (statable.eu) am ${kom(o.datum)}`, `Created with Statable (statable.eu) on ${kom(o.datum)}`)}`,
    `# ${L('Paneldaten: feste Effekte (Within), Pooled-OLS, Between, zufällige Effekte (nur bei ausgewogenem Panel), Hausman-Test, F-Test auf Gruppen-Effekte und cluster-robuste Standardfehler (CR1). Von Hand in Basis-R, ohne Zusatzpaket.', 'Panel data: fixed effects (within), pooled OLS, between, random effects (balanced panel only), Hausman test, F test for group effects and cluster-robust standard errors (CR1). Written out in base R, no extra package.')}`,
    `# ${L('Starten: Ordner entpacken, in R mit setwd() in den Ordner wechseln (in RStudio: Session > Set Working Directory > To Source File Location), dann source() mit dem Namen dieser Datei.', 'How to start it: unzip the folder, change to it with setwd() in R (in RStudio: Session > Set Working Directory > To Source File Location), then source() this file.')}`,
    '',
    `# ${L('Daten lesen (fehlende Werte als leere Zelle); nur Fälle mit Werten in allen Spalten', 'Read the data (missing values as an empty cell); only cases with values in all columns')}`,
    `daten <- read.csv(${q(csvName)}, fileEncoding = "UTF-8", check.names = FALSE, na.strings = "")`,
    `d <- daten[stats::complete.cases(daten), , drop = FALSE]`,
    `id <- factor(d[[${q(o.gruppe)}]])`,
    `y <- as.numeric(d[[${q(o.ziel)}]])`,
    `X <- as.matrix(d[, c(${o.merkmale.map(m => q(m)).join(', ')}), drop = FALSE])`,
    'N <- length(y); n <- nlevels(id); k <- ncol(X)',
    'Xm <- apply(X, 2, function(v) ave(v, id)); ym <- ave(y, id)   # Gruppenmittel je Fall',
    'erste <- !duplicated(id)',
    '',
    `# ${L('Hilfsfunktionen: kleinste Quadrate, cluster-robuste Varianz CR1 (wie Stata und sandwich::vcovCL mit HC1), Koeffiziententabelle', 'Helpers: least squares, cluster-robust variance CR1 (as Stata and sandwich::vcovCL with HC1), coefficient table')}`,
    'ols <- function(M, v) { inv <- solve(crossprod(M)); b <- drop(inv %*% crossprod(M, v)); e <- drop(v - M %*% b); list(b = b, inv = inv, e = e, rss = sum(e^2)) }',
    'cr1 <- function(M, e, inv, kk) { S <- rowsum(M * e, id); G <- nrow(S); (inv %*% crossprod(S) %*% inv) * (G / (G - 1)) * ((N - 1) / (N - kk)) }',
    'tabelle <- function(nm, b, V, VC, df, dfC) { se <- sqrt(diag(V)); sc <- sqrt(diag(VC)); data.frame(koef = nm, b = b, se = se, t = b / se, p = 2 * pt(-abs(b / se), df), se_cluster = sc, t_cluster = b / sc, p_cluster = 2 * pt(-abs(b / sc), dfC), row.names = NULL) }',
    '',
    `# ${L('Feste Effekte (Within): Abweichungen vom Gruppenmittel; die Konstante und Merkmale, die in jeder Gruppe gleich bleiben, fallen weg', 'Fixed effects (within): deviations from the group mean; the constant and features that stay the same within every group drop out')}`,
    'w <- ols(X - Xm, y - ym)',
    'df_w <- N - n - k; s2_w <- w$rss / df_w; sigma_e2 <- s2_w',
    'fe <- tabelle(colnames(X), w$b, w$inv * s2_w, cr1(X - Xm, w$e, w$inv, k), df_w, n - 1)',
    'r2_fe <- 1 - w$rss / sum((y - ym)^2)',
    '',
    `# ${L('Pooled (alle Fälle in einem Topf, mit Konstante)', 'Pooled (all cases in one pot, with a constant)')}`,
    'Xp <- cbind(1, X); p <- ols(Xp, y)',
    'df_p <- N - k - 1; s2_p <- p$rss / df_p',
    'pooled <- tabelle(c("(Intercept)", colnames(X)), p$b, p$inv * s2_p, cr1(Xp, p$e, p$inv, k + 1), df_p, n - 1)',
    '',
    `# ${L('Between (Regression der Gruppenmittel)', 'Between (regression of the group means)')}`,
    'be <- NULL; s2_b <- NA',
    'if (n > k + 1) { Xb <- cbind(1, Xm[erste, , drop = FALSE]); b <- ols(Xb, ym[erste]); df_b <- n - k - 1; s2_b <- b$rss / df_b; V <- b$inv * s2_b; be <- tabelle(c("(Intercept)", colnames(X)), b$b, V, V, df_b, df_b) }',
    '',
    `# ${L('F-Test: Gibt es Gruppen-Effekte? (Pooled gegen Within)', 'F test: are there group effects? (pooled against within)')}`,
    'F <- ((p$rss - w$rss) / (n - 1)) / (w$rss / df_w)',
    'ftest <- list(F = F, df1 = n - 1, df2 = df_w, p = pf(F, n - 1, df_w, lower.tail = FALSE))',
    '',
    `# ${L('Zufällige Effekte (Swamy-Arora) und Hausman-Test: nur wenn jede Gruppe gleich viele Zeitpunkte hat', 'Random effects (Swamy-Arora) and Hausman test: only if every group has the same number of time points')}`,
    're <- NULL; hausman <- NULL; theta <- NA; sigma_u2 <- NA',
    'if (length(unique(table(id))) == 1 && !is.null(be)) {',
    '  Tn <- N / n; sigma_u2 <- max(0, s2_b - s2_w / Tn); theta <- 1 - sqrt(s2_w / (s2_w + Tn * sigma_u2))',
    '  Xr <- cbind(1 - theta, X - theta * Xm); rr <- ols(Xr, y - theta * ym); df_r <- N - k - 1; VR <- rr$inv * (rr$rss / df_r)',
    '  re <- tabelle(c("(Intercept)", colnames(X)), rr$b, VR, cr1(Xr, rr$e, rr$inv, k + 1), df_r, n - 1)',
    '  if (theta > 1e-9) { dd <- w$b - rr$b[-1]; DD <- w$inv * s2_w - VR[-1, -1, drop = FALSE]; h <- drop(t(dd) %*% solve(DD) %*% dd); hausman <- list(chi2 = h, df = k, p = pchisq(h, k, lower.tail = FALSE)) }',
    '}',
    '',
    `# ${L('Ausgabe', 'Output')}`,
    'print(fe); print(pooled); print(be); print(re); print(ftest); print(hausman)',
    '',
    `# ${L('Zum Vergleichen: Das hat Statable gezeigt (Zahlen mit Punkt)', 'To compare: this is what Statable showed (numbers with a decimal point)')}`,
    `# ${kom(L(`Fälle: ${e.N}, Gruppen: ${e.n}, ${e.ausgewogen ? `je ${e.minT} Zeitpunkte` : `${e.minT} bis ${e.maxT} Zeitpunkte je Gruppe`}; F-Test auf Gruppen-Effekte: F = ${zz(e.ftest.F)}, p = ${zz(e.ftest.p, 6)}`, `Cases: ${e.N}, groups: ${e.n}, ${e.ausgewogen ? `${e.minT} time points each` : `${e.minT} to ${e.maxT} time points per group`}; F test for group effects: F = ${zz(e.ftest.F)}, p = ${zz(e.ftest.p, 6)}`))}`,
    ...e.within.koef.map(c => `# ${kom(`${L('Feste Effekte', 'Fixed effects')} ${o.merkmale[e.within.koef.indexOf(c)]}: b = ${zz(c.b)}, ${L('Standardfehler', 'standard error')} ${zz(c.se)}, ${L('cluster-robust', 'cluster-robust')} ${zz(c.seCluster)}`)}`),
    ''
  ].join('\n');
  return { r, csv, rName, csvName };
}
