/**
 * B3 Teil 3b: Daten und R-Skript für den Q-Methode-Block (Oberfläche in bausteine/QBlock.svelte, Kern lib/qmethode.ts).
 * Zeilen = Personen (je Zeile ein Q-Sort), Spalten = Aussagen (Zahl = Spalte im Raster, z. B. -4 bis +4). Personen mit einer Lücke entfallen.
 * Spaltennamen kommen im R-Skript nur über rAnzeigeText, Bezeichner nur über rId.
 */
import { istFehlend } from './fehlend';
import { L } from './sitzung.svelte';
import { datenCsv, kom, rDateiBasis, type RSkript, type RSpalte } from './rskript';
import { rAnzeigeText, rGanz } from '../engine/rsicher';

export const Q_MIN_SPALTEN = 8;
export const Q_MAX_SPALTEN = 80;
export const Q_MIN_PERSONEN = 3;

export type QDatenFehler = { fehler: 'zu-wenig-spalten' | 'zu-viele-spalten' | 'zu-wenig-personen' };

const leer = (sp: RSpalte, v: unknown) => v === null || v === undefined || v === '' || typeof v !== 'number' || !Number.isFinite(v) || istFehlend(sp, v);

/** Q-Sorts je Person; Personen mit einer Lücke werden gezählt und weggelassen. */
export function qDaten(spalten: RSpalte[], zeilen: (string | number | null)[][], namen: string[]): { sorts: number[][]; weg: number } | QDatenFehler {
  const sp = namen.map(n => spalten.find(c => c.name === n)).filter((c): c is RSpalte => !!c);
  if (sp.length < Q_MIN_SPALTEN) return { fehler: 'zu-wenig-spalten' };
  if (sp.length > Q_MAX_SPALTEN) return { fehler: 'zu-viele-spalten' };
  const ix = sp.map(c => spalten.indexOf(c));
  const sorts: number[][] = []; let weg = 0;
  for (const z of zeilen) {
    const r = sp.map((c, k) => z[ix[k]!]);
    if (r.some((v, k) => leer(sp[k]!, v))) weg++; else sorts.push(r as number[]);
  }
  if (sorts.length < Q_MIN_PERSONEN) return { fehler: 'zu-wenig-personen' };
  return { sorts, weg };
}

/** R-Skript in Basis-R: wie lib/qmethode.ts (Pearson zwischen Personen, Hauptkomponenten, stats::varimax, Markieren, z-Werte, Faktor-Q-Sort). */
export function baueQSkript(o: { spalten: RSpalte[]; zeilen: (string | number | null)[][]; benutzt: string[]; faktoren: number; titel: string; datum: string }): RSkript {
  const sp = o.benutzt.map(n => o.spalten.find(c => c.name === n)!).filter(Boolean);
  const csv = datenCsv({ spalten: sp, zeilen: o.zeilen, blattSpalten: [], titel: o.titel, datum: o.datum }, sp);
  const basis = rDateiBasis(o.titel), csvName = `${basis}-daten.csv`, rName = `${basis}.R`;
  const q = rAnzeigeText;
  const namen = sp.map(c => q(c.name)).join(', ');
  const r = [
    `# ${kom(o.titel)}`,
    `# ${L(`Erstellt mit Statable (statable.eu) am ${kom(o.datum)}`, `Created with Statable (statable.eu) on ${kom(o.datum)}`)}`,
    `# ${L('Q-Methode: Faktorenanalyse über Personen (Hauptkomponenten, Varimax), Markieren, Faktor-z-Werte und Faktor-Q-Sort. Basis-R, ohne Paket. Das Ergebnis deutet sich nicht selbst: Die Zahl der Faktoren legen Sie fest.', 'Q methodology: factor analysis across people (principal components, varimax), flagging, factor z-scores and factor Q sort. Base R, no package. The result does not interpret itself: you decide the number of factors.')}`,
    `# ${L('Starten: Ordner entpacken, in R mit setwd() in den Ordner wechseln (in RStudio: Session > Set Working Directory > To Source File Location), dann source() mit dem Namen dieser Datei.', 'How to start it: unzip the folder, change to it with setwd() in R (in RStudio: Session > Set Working Directory > To Source File Location), then source() this file.')}`,
    '',
    `daten <- read.csv(${q(csvName)}, fileEncoding = "UTF-8", check.names = FALSE, na.strings = "")`,
    `daten <- daten[, c(${namen}), drop = FALSE]`,
    `sorts <- as.matrix(daten[stats::complete.cases(daten), , drop = FALSE])  # ${L('je Zeile ein Q-Sort', 'one Q sort per row')}`,
    `nf <- ${rGanz(o.faktoren)}  # ${L('Zahl der Faktoren (Ihre Entscheidung)', 'number of factors (your decision)')}`,
    '',
    'n <- nrow(sorts); k <- ncol(sorts)',
    'e <- eigen(cor(t(sorts)), symmetric = TRUE)',
    'roh <- e$vectors[, 1:nf, drop = FALSE] %*% diag(sqrt(pmax(e$values[1:nf], 0)), nf)',
    'lad <- if (nf > 1) unclass(varimax(roh)$loadings) else roh',
    'for (j in seq_len(nf)) if (sum(lad[, j]) < 0) lad[, j] <- -lad[, j]',
    'markiert <- abs(lad) > qnorm(0.975) / sqrt(k) & lad^2 > rowSums(lad^2) - lad^2',
    'gewicht <- ifelse(markiert, lad / (1 - lad^2), 0)',
    'z <- sapply(seq_len(nf), function(j) { s <- colSums(gewicht[, j] * sorts); (s - mean(s)) / sd(s) })',
    'erklaert <- 100 * colSums(lad^2) / n',
    'print(round(lad, 4)); print(markiert); print(round(erklaert, 2)); print(round(z, 4))',
    '',
    `# ${L('Faktor-Q-Sort (nur wenn alle Q-Sorts dieselbe Verteilung haben)', 'Factor Q sort (only if all Q sorts share the same distribution)')}`,
    'verteilung <- sort(sorts[1, ])',
    'if (all(apply(sorts, 1, function(s) all(sort(s) == verteilung)))) {',
    '  faktorsort <- sapply(seq_len(nf), function(j) { res <- numeric(k); res[order(z[, j])] <- verteilung; res })',
    '  print(faktorsort)',
    '}',
    ''
  ].join('\n');
  return { r, csv, rName, csvName };
}
