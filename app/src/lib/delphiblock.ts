/**
 * B3 Teil 2b: Daten und R-Skript für den Delphi-Block (Oberfläche in bausteine/DelphiBlock.svelte, Kern lib/delphi.ts).
 * Zeilen = Fachleute, Spalten = Aussagen (Zahlen-Spalten, z. B. 1 bis 5). Lücken bleiben Lücken (Kennzahlen je Aussage nutzen die gültigen Werte).
 * Spaltennamen kommen im R-Skript nur über rAnzeigeText und Bezeichner nur über rId.
 */
import { istFehlend } from './fehlend';
import { L } from './sitzung.svelte';
import { datenCsv, kom, rDateiBasis, type RSkript, type RSpalte } from './rskript';
import { rAnzeigeText, rZahl } from '../engine/rsicher';
import type { Bewertung, DelphiRegel } from './delphi';

export const DELPHI_MIN_SPALTEN = 3;
export const DELPHI_MAX_SPALTEN = 60;
export const DELPHI_MIN_FACHLEUTE = 3;

export type DelphiFehler = { fehler: 'zu-wenig-spalten' | 'zu-viele-spalten' | 'zu-wenig-fachleute' | 'keine-zahlen' };

const leer = (sp: RSpalte, v: unknown) => v === null || v === undefined || v === '' || (typeof v === 'number' && (!Number.isFinite(v) || istFehlend(sp, v)));

/** Bewertungen je Person (Zeile) und Aussage (Spalte); Personen ganz ohne Wert entfallen. */
export function delphiDaten(spalten: RSpalte[], zeilen: (string | number | null)[][], namen: string[]): { bew: Bewertung[][]; weg: number } | DelphiFehler {
  const sp = namen.map(n => spalten.find(c => c.name === n)).filter((c): c is RSpalte => !!c);
  if (sp.length < DELPHI_MIN_SPALTEN) return { fehler: 'zu-wenig-spalten' };
  if (sp.length > DELPHI_MAX_SPALTEN) return { fehler: 'zu-viele-spalten' };
  const ix = sp.map(c => spalten.indexOf(c));
  const bew: Bewertung[][] = []; let weg = 0;
  for (const z of zeilen) {
    const r = sp.map((c, k) => { const v = z[ix[k]!]; return leer(c, v) || typeof v !== 'number' ? null : v; });
    if (r.every(v => v === null)) weg++; else bew.push(r);
  }
  if (bew.length < DELPHI_MIN_FACHLEUTE) return { fehler: 'zu-wenig-fachleute' };
  if (bew.every(r => r.every(v => v === null))) return { fehler: 'keine-zahlen' };
  return { bew, weg };
}

/** R-Skript in Basis-R: Kennzahlen je Aussage (quantile type 7), Konsens nach der gesetzten Regel, Kendalls W mit Bindungskorrektur. */
export function baueDelphiSkript(o: { spalten: RSpalte[]; zeilen: (string | number | null)[][]; benutzt: string[]; regel: DelphiRegel; titel: string; datum: string }): RSkript {
  const sp = o.benutzt.map(n => o.spalten.find(c => c.name === n)!).filter(Boolean);
  const csv = datenCsv({ spalten: sp, zeilen: o.zeilen, blattSpalten: [], titel: o.titel, datum: o.datum }, sp);
  const basis = rDateiBasis(o.titel), csvName = `${basis}-daten.csv`, rName = `${basis}.R`;
  const q = rAnzeigeText, g = o.regel;
  const namen = sp.map(c => q(c.name)).join(', ');
  const na = (v: number | null) => (v === null ? 'NA' : String(rZahl(v)));
  const r = [
    `# ${kom(o.titel)}`,
    `# ${L(`Erstellt mit Statable (statable.eu) am ${kom(o.datum)}`, `Created with Statable (statable.eu) on ${kom(o.datum)}`)}`,
    `# ${L('Delphi-Befragung: Kennzahlen je Aussage, Konsens nach einer Regel, die vorher festgelegt wurde, und Kendalls W über die Fachleute. Basis-R, ohne Paket.', 'Delphi survey: statistics per statement, consensus by a rule that was set beforehand, and Kendall\'s W across the experts. Base R, no package.')}`,
    `# ${L('Starten: Ordner entpacken, in R mit setwd() in den Ordner wechseln (in RStudio: Session > Set Working Directory > To Source File Location), dann source() mit dem Namen dieser Datei.', 'How to start it: unzip the folder, change to it with setwd() in R (in RStudio: Session > Set Working Directory > To Source File Location), then source() this file.')}`,
    '',
    `daten <- read.csv(${q(csvName)}, fileEncoding = "UTF-8", check.names = FALSE, na.strings = "")`,
    `daten <- daten[, c(${namen}), drop = FALSE]`,
    '',
    `# ${L('Die Regel für „Konsens“ (NA = nicht prüfen). Sie gehört vor die Befragung, nicht danach.', 'The rule for “consensus” (NA = do not check). It belongs before the survey, not after.')}`,
    `max_iqr <- ${na(g.maxIqr)}; band_von <- ${na(g.band ? g.band[0] : null)}; band_bis <- ${na(g.band ? g.band[1] : null)}; min_anteil <- ${rZahl(g.minAnteil)}`,
    '',
    'kennzahlen <- do.call(rbind, lapply(names(daten), function(a) {',
    '  x <- daten[[a]]; x <- x[!is.na(x)]; n <- length(x)',
    '  if (n == 0) return(data.frame(aussage = a, n = 0))',
    '  q <- quantile(x, c(0.25, 0.5, 0.75), type = 7, names = FALSE); iqr <- q[3] - q[1]',
    '  anteil <- if (is.na(band_von)) NA else mean(x >= band_von & x <= band_bis)',
    '  gesetzt <- !is.na(max_iqr) || !is.na(band_von)',
    '  konsens <- gesetzt && (is.na(max_iqr) || iqr <= max_iqr + 1e-12) && (is.na(anteil) || anteil >= min_anteil - 1e-12)',
    '  data.frame(aussage = a, n = n, median = q[2], q1 = q[1], q3 = q[3], iqr = iqr, mittel = mean(x), sd = if (n > 1) sd(x) else NA, anteil = anteil, konsens = konsens)',
    '}))',
    'print(kennzahlen)',
    '',
    `# ${L('Kendalls W (nur Fachleute mit allen Bewertungen), mit Bindungskorrektur', 'Kendall\'s W (only experts with all ratings), with ties correction')}`,
    'voll <- as.matrix(daten[stats::complete.cases(daten), , drop = FALSE]); m <- nrow(voll); k <- ncol(voll)',
    'if (m >= 2 && k >= 3) {',
    '  rg <- t(apply(voll, 1, rank)); summe <- colSums(rg)',
    '  t_bind <- sum(apply(voll, 1, function(z) { h <- tabulate(match(z, unique(z))); sum(h^3 - h) }))',
    '  s <- sum((summe - m * (k + 1) / 2)^2); w <- 12 * s / (m^2 * (k^3 - k) - m * t_bind)',
    '  chi2 <- m * (k - 1) * w',
    '  kendall <- data.frame(fachleute = m, aussagen = k, W = w, chi2 = chi2, df = k - 1, p = pchisq(chi2, k - 1, lower.tail = FALSE))',
    '  print(kendall)',
    '}',
    ''
  ].join('\n');
  return { r, csv, rName, csvName };
}
