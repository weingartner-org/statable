/**
 * B4 Teil 1: Wachstumskurvenmodell (Latent Growth) als Block unter „Verändert sich etwas bei denselben Personen?“ (Messwiederholung).
 * Rechnung: R in webR (sp_wachstum in engine/statable.R, lavaan::growth, ML); Sollwerte aus Desktop-R in scripts/wachstum-erwartet.R.
 * Dieses Modul hält die Eingabe-Regeln (Zeitwerte lesen, Spalten prüfen) und das R-Skript zum Mitnehmen (Regel aus B1: jede neue Auswertung bekommt es gleich mit).
 * Das Skript braucht das R-Paket lavaan (install.packages("lavaan")); alle Namen aus der Datei laufen nur als Text (rAnzeigeText), im Modell stehen t1, t2 …
 * FESTE OBJEKTNAMEN im Skript (Gegenprobe wachstumblock.test.ts): `zeit`, `werte`, `modell`, `fit`, `mittelwerte`, `varianzen`, `kovarianz`, `passung`.
 */
import { L } from './sitzung.svelte';
import { datenCsv, kom, rDateiBasis, type RSkript, type RSpalte } from './rskript';
import { rAnzeigeText, rAnzeigeZahl } from '../engine/rsicher';

export const WACHSTUM_MIN_ZEITPUNKTE = 3;
export const WACHSTUM_MAX_ZEITPUNKTE = 12;

/** Zeitwerte aus dem Eingabefeld. Mit Semikolon als Trenner ist das Dezimalkomma erlaubt („0; 0,5; 1,5“); sonst trennen Komma oder Leerraum und Dezimalzahlen haben einen Punkt („0, 0.5, 1.5“). Leer = 0, 1, 2 …; null = unlesbar oder falsche Anzahl. */
export function zeitwerteLesen(text: string, k: number): number[] | null {
  const t = text.trim();
  if (!t) return Array.from({ length: k }, (_, i) => i);
  const teile = (t.includes(';') ? t.split(/\s*;\s*/) : t.split(/[\s,]+/)).filter(Boolean);
  const zahlen = teile.map(x => (/^[+-]?\d+([.,]\d+)?$/.test(x) && (t.includes(';') || !x.includes(',')) ? Number(x.replace(',', '.')) : NaN));
  if (zahlen.length !== k || zahlen.some(z => !Number.isFinite(z))) return null;
  if (new Set(zahlen).size < WACHSTUM_MIN_ZEITPUNKTE) return null;
  return zahlen;
}

const zz = (v: number | null | undefined, d = 4) => (typeof v === 'number' && Number.isFinite(v) ? String(Number(v.toFixed(d))) : 'NA');

export interface WachstumSkriptEingabe {
  spalten: RSpalte[]; zeilen: (string | number | null)[][]; benutzt: string[]; zeit: number[]; gleichRest: boolean; fiml: boolean; titel: string; datum: string;
  /** Zahlen, die Statable gezeigt hat (zum Vergleichen im Skript) */
  statable: { n: number; mittelI: number; mittelS: number; varI: number; varS: number; kov: number; chisq: number | null; df: number | null; cfi: number | null; rmsea: number | null };
}

export function baueWachstumSkript(o: WachstumSkriptEingabe): RSkript {
  const sp = o.benutzt.map(n => o.spalten.find(c => c.name === n)!).filter(Boolean);
  const csv = datenCsv({ spalten: sp, zeilen: o.zeilen, blattSpalten: [], titel: o.titel, datum: o.datum }, sp);
  const basis = rDateiBasis(o.titel), csvName = `${basis}-daten.csv`, rName = `${basis}.R`;
  const q = rAnzeigeText;
  const k = sp.length;
  const r = [
    `# ${kom(o.titel)}`,
    `# ${L(`Erstellt mit Statable (statable.eu) am ${kom(o.datum)}`, `Created with Statable (statable.eu) on ${kom(o.datum)}`)}`,
    `# ${L('Lineares Wachstumskurvenmodell (Latent Growth): Achsenabschnitt und Steigung je Person, Schätzung mit ML. Braucht das R-Paket lavaan: install.packages("lavaan").', 'Linear growth curve model (latent growth): intercept and slope per person, ML estimation. Needs the R package lavaan: install.packages("lavaan").')}`,
    `# ${L('Starten: Ordner entpacken, in R mit setwd() in den Ordner wechseln (in RStudio: Session > Set Working Directory > To Source File Location), dann source() mit dem Namen dieser Datei.', 'How to start it: unzip the folder, change to it with setwd() in R (in RStudio: Session > Set Working Directory > To Source File Location), then source() this file.')}`,
    '',
    'library(lavaan)',
    `# ${L('Daten lesen (fehlende Werte als leere Zelle)', 'Read the data (missing values as an empty cell)')}`,
    `daten <- read.csv(${q(csvName)}, fileEncoding = "UTF-8", check.names = FALSE, na.strings = "")`,
    `# ${L('Die Messzeitpunkte in der Reihenfolge der Spalten; im Modell heißen sie t1, t2 …', 'The time points in the order of the columns; in the model they are called t1, t2 …')}`,
    `werte <- daten[, c(${sp.map(c => q(c.name)).join(', ')}), drop = FALSE]`,
    `names(werte) <- paste0("t", 1:${k})`,
    `werte[] <- lapply(werte, as.numeric)`,
    `# ${L('Zeitwerte: Der Achsenabschnitt gilt beim Zeitwert 0.', 'Time values: the intercept applies at time value 0.')}`,
    `zeit <- c(${o.zeit.map(z => rAnzeigeZahl(z)).join(', ')})`,
    '',
    `# ${L('Modell: i = Achsenabschnitt (alle Ladungen 1), s = Steigung (Ladungen = Zeitwerte)', 'Model: i = intercept (all loadings 1), s = slope (loadings = time values)')}`,
    `modell <- paste(c(paste0("i =~ ", paste0("1*t", 1:${k}, collapse = " + ")), paste0("s =~ ", paste0(zeit, "*t", 1:${k}, collapse = " + "))${o.gleichRest ? `, paste0("t", 1:${k}, " ~~ r*t", 1:${k})` : ''}), collapse = "\n")`,
    `# ${L(o.fiml ? 'Personen mit Lücken gehen mit ein (FIML).' : 'Nur Personen mit Werten zu allen Zeitpunkten.', o.fiml ? 'People with gaps are included (FIML).' : 'Only people with values at all time points.')}`,
    `fit <- growth(modell, data = werte, estimator = "ML", missing = ${o.fiml ? '"fiml"' : '"listwise"'})`,
    'pe <- parameterEstimates(fit)',
    'mittelwerte <- pe[pe$op == "~1" & pe$lhs %in% c("i", "s"), c("lhs", "est", "se", "pvalue")]',
    'varianzen <- pe[pe$op == "~~" & pe$lhs %in% c("i", "s") & pe$lhs == pe$rhs, c("lhs", "est", "se", "pvalue")]',
    'kovarianz <- pe[pe$op == "~~" & pe$lhs == "i" & pe$rhs == "s", c("est", "se", "pvalue")]',
    'passung <- fitMeasures(fit, c("chisq", "df", "pvalue", "cfi", "rmsea", "srmr"))',
    'print(mittelwerte); print(varianzen); print(kovarianz); print(round(passung, 3))',
    '',
    `# ${L('Zum Vergleichen: Das hat Statable gezeigt (Zahlen mit Punkt)', 'To compare: this is what Statable showed (numbers with a decimal point)')}`,
    `# ${kom(L(`Personen: ${o.statable.n}; Mittelwert Achsenabschnitt ${zz(o.statable.mittelI)}, Mittelwert Steigung ${zz(o.statable.mittelS)}`, `People: ${o.statable.n}; mean intercept ${zz(o.statable.mittelI)}, mean slope ${zz(o.statable.mittelS)}`))}`,
    `# ${kom(L(`Varianz Achsenabschnitt ${zz(o.statable.varI)}, Varianz Steigung ${zz(o.statable.varS)}, Kovarianz ${zz(o.statable.kov)}`, `Variance intercept ${zz(o.statable.varI)}, variance slope ${zz(o.statable.varS)}, covariance ${zz(o.statable.kov)}`))}`,
    `# ${kom(L(`Passung: χ² = ${zz(o.statable.chisq, 3)} (df = ${zz(o.statable.df, 0)}), CFI = ${zz(o.statable.cfi, 3)}, RMSEA = ${zz(o.statable.rmsea, 3)}`, `Fit: χ² = ${zz(o.statable.chisq, 3)} (df = ${zz(o.statable.df, 0)}), CFI = ${zz(o.statable.cfi, 3)}, RMSEA = ${zz(o.statable.rmsea, 3)}`))}`,
    ''
  ].join('\n');
  return { r, csv, rName, csvName };
}
