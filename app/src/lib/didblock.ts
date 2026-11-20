/**
 * B2 Teil 2c: Differenz-in-Differenzen als Block unter der Regression („Hat die Maßnahme etwas verändert? (Differenz-in-Differenzen)“).
 * Daten aus dem Blatt holen (Ziel, Gruppenspalte 0/1, Zeitspalte 0/1, übrige Merkmale; nur vollständige Fälle), Rechenkern lib/did.ts, R-Skript in Basis-R.
 * Fachblatt docs/ausbau/FACHBLATT-B2-OEKONOMETRIE.md, Abschnitt Teil 2c.
 *
 * R-Skript (Regel aus B1): Basis-R, Daten als CSV, keine Zusatzpakete. Rechnet dasselbe wie lib/did.ts von Hand (Matrizen, klassisch und robust HC1, vier Gruppenmittel).
 * Sicherheit wie lib/rskript.ts: Spaltennamen nur über rAnzeigeText, Kommentare über kom.
 * FESTE OBJEKTNAMEN im Skript (Gegenprobe didblock.test.ts): `did` (data.frame koef, b, se, t, p, se_robust, t_robust, p_robust), `mittel` (Liste m00, m01, m10, m11, n00, n01, n10, n11), `did_mittel`, `sigma`, `r2`, `n`.
 */
import { L } from './sitzung.svelte';
import { istFehlend } from './fehlend';
import { didRechnen, type DidErgebnis, type DidFehler } from './did';
import { datenCsv, kom, rDateiBasis, type RSkript, type RSpalte } from './rskript';
import { rAnzeigeText } from '../engine/rsicher';

export const DID_MAX = 100000;

export interface DidDaten { y: number[]; beh: number[]; nach: number[]; exo: number[][]; exoNamen: string[]; weg: number }
export type DidBlockFehler = { fehler: 'keine-auswahl' | 'zu-viele-faelle' | 'doppelt' | DidFehler['fehler'] };

const leer = (sp: RSpalte, v: unknown) => v === null || v === undefined || v === '' || (typeof v === 'number' && (!Number.isFinite(v) || istFehlend(sp, v)));

/** Vollständige Fälle für Ziel, Gruppenspalte, Zeitspalte und übrige Merkmale (alles Zahlen-Spalten, jede Spalte nur an einer Stelle). */
export function didDaten(spalten: RSpalte[], zeilen: (string | number | null)[][], ziel: string, gruppe: string, zeit: string, exo: string[]): DidDaten | DidBlockFehler {
  const alle = [ziel, gruppe, zeit, ...exo];
  if (!ziel || !gruppe || !zeit) return { fehler: 'keine-auswahl' };
  if (new Set(alle).size !== alle.length) return { fehler: 'doppelt' };
  const hol = (n: string) => spalten.find(c => c.name === n && c.art === 'zahl');
  if (alle.some(n => !hol(n))) return { fehler: 'keine-auswahl' };
  const ix = (n: string) => spalten.indexOf(hol(n)!);
  const nimm: number[] = []; let weg = 0;
  zeilen.forEach((z, r) => { if (alle.some(n => leer(hol(n)!, z[ix(n)]))) weg++; else nimm.push(r); });
  if (nimm.length > DID_MAX) return { fehler: 'zu-viele-faelle' };
  const wert = (r: number, n: string) => zeilen[r]![ix(n)] as number;
  return { y: nimm.map(r => wert(r, ziel)), beh: nimm.map(r => wert(r, gruppe)), nach: nimm.map(r => wert(r, zeit)), exo: nimm.map(r => exo.map(n => wert(r, n))), exoNamen: exo, weg };
}

export function didBlockRechne(d: DidDaten, behName = 'Behandelt', nachName = 'Nachher'): DidErgebnis | DidBlockFehler {
  return didRechnen(d.y, d.beh, d.nach, d.exo, d.exoNamen, behName, nachName);
}

const zz = (v: number | undefined, d = 4): string => (typeof v === 'number' && Number.isFinite(v) ? String(Number(v.toFixed(d))) : 'NA');

export function baueDidSkript(o: { spalten: RSpalte[]; zeilen: (string | number | null)[][]; ziel: string; gruppe: string; zeit: string; exo: string[]; r: DidErgebnis; titel: string; datum: string }): RSkript {
  const alle = [o.ziel, o.gruppe, o.zeit, ...o.exo].map(n => o.spalten.find(c => c.name === n)!).filter(Boolean);
  const csv = datenCsv({ spalten: o.spalten, zeilen: o.zeilen, blattSpalten: [], titel: o.titel, datum: o.datum }, alle);
  const basis = rDateiBasis(o.titel), csvName = `${basis}-daten.csv`, rName = `${basis}.R`;
  const q = rAnzeigeText, e = o.r, m = e.mittel;
  const vek = (ns: string[]) => (ns.length ? `c(${ns.map(x => q(x)).join(', ')})` : 'character(0)');
  const r = [
    `# ${kom(o.titel)}`,
    `# ${L(`Erstellt mit Statable (statable.eu) am ${kom(o.datum)}`, `Created with Statable (statable.eu) on ${kom(o.datum)}`)}`,
    `# ${L('Differenz-in-Differenzen: Vier Gruppenmittel (Behandelte und Vergleichsgruppe, vorher und nachher) und die Regression mit Wechselwirkung; deren Koeffizient ist die Differenz-in-Differenzen. Klassische und robuste Standardfehler (HC1). Von Hand in Basis-R, ohne Zusatzpaket.', 'Difference-in-differences: four group means (treated and comparison group, before and after) and the regression with an interaction; its coefficient is the difference-in-differences. Classical and robust standard errors (HC1). Written out in base R, no extra package.')}`,
    `# ${L('Starten: Ordner entpacken, in R mit setwd() in den Ordner wechseln (in RStudio: Session > Set Working Directory > To Source File Location), dann source() mit dem Namen dieser Datei.', 'How to start it: unzip the folder, change to it with setwd() in R (in RStudio: Session > Set Working Directory > To Source File Location), then source() this file.')}`,
    '',
    `# ${L('Daten lesen (fehlende Werte als leere Zelle); nur Fälle mit Werten in allen Spalten', 'Read the data (missing values as an empty cell); only cases with values in all columns')}`,
    `daten <- read.csv(${q(csvName)}, fileEncoding = "UTF-8", check.names = FALSE, na.strings = "")`,
    `d <- daten[stats::complete.cases(daten), , drop = FALSE]`,
    `exo_namen <- ${vek(o.exo)}`,
    `y <- as.numeric(d[[${q(o.ziel)}]]); beh <- as.numeric(d[[${q(o.gruppe)}]]); nach <- as.numeric(d[[${q(o.zeit)}]])`,
    `stopifnot(all(beh %in% c(0, 1)), all(nach %in% c(0, 1)))   # ${L('Gruppe und Zeit müssen 0 oder 1 sein', 'group and time must be 0 or 1')}`,
    'W <- as.matrix(d[, exo_namen, drop = FALSE]); n <- length(y)',
    '',
    `# ${L('Vier Gruppenmittel: erste Ziffer Gruppe (1 = behandelt), zweite Ziffer Zeit (1 = nachher)', 'Four group means: first digit group (1 = treated), second digit time (1 = after)')}`,
    'mw <- function(g, t) mean(y[beh == g & nach == t]); an <- function(g, t) sum(beh == g & nach == t)',
    'mittel <- list(m00 = mw(0, 0), m01 = mw(0, 1), m10 = mw(1, 0), m11 = mw(1, 1), n00 = an(0, 0), n01 = an(0, 1), n10 = an(1, 0), n11 = an(1, 1))',
    `# ${L('Differenz-in-Differenzen aus den Mitteln (stimmt mit dem Koeffizienten unten überein, wenn keine übrigen Merkmale im Modell stehen)', 'Difference-in-differences from the means (equals the coefficient below when there are no other features in the model)')}`,
    'did_mittel <- (mittel$m11 - mittel$m10) - (mittel$m01 - mittel$m00)',
    '',
    `# ${L('Regression mit Wechselwirkung: Konstante, Gruppe, Zeit, Gruppe × Zeit, übrige Merkmale', 'Regression with interaction: constant, group, time, group × time, other features')}`,
    'X <- cbind(1, beh, nach, beh * nach, W); k <- ncol(X)',
    'namen <- c("(Intercept)", "group", "time", "group:time", exo_namen)',
    'inv <- solve(crossprod(X)); b <- drop(inv %*% crossprod(X, y)); res <- drop(y - X %*% b)',
    'rss <- sum(res^2); df <- n - k; s2 <- rss / df; sigma <- sqrt(s2); r2 <- 1 - rss / sum((y - mean(y))^2)',
    'V <- s2 * inv; VR <- inv %*% crossprod(X * res) %*% inv * (n / df)   # HC1',
    'se <- sqrt(diag(V)); ser <- sqrt(diag(VR))',
    'did <- data.frame(koef = namen, b = b, se = se, t = b / se, p = 2 * pt(-abs(b / se), df), se_robust = ser, t_robust = b / ser, p_robust = 2 * pt(-abs(b / ser), df), row.names = NULL)',
    '',
    `# ${L('Ausgabe', 'Output')}`,
    'print(unlist(mittel)); print(did_mittel); print(did)',
    '',
    `# ${L('Zum Vergleichen: Das hat Statable gezeigt (Zahlen mit Punkt)', 'To compare: this is what Statable showed (numbers with a decimal point)')}`,
    `# ${kom(L(`Fälle: ${e.n}; Mittel (Gruppe 0 vorher, nachher; Gruppe 1 vorher, nachher): ${zz(m.m00, 2)}, ${zz(m.m01, 2)}; ${zz(m.m10, 2)}, ${zz(m.m11, 2)}; Differenz der Mittel: ${zz(e.didMittel, 2)}`, `Cases: ${e.n}; means (group 0 before, after; group 1 before, after): ${zz(m.m00, 2)}, ${zz(m.m01, 2)}; ${zz(m.m10, 2)}, ${zz(m.m11, 2)}; difference of means: ${zz(e.didMittel, 2)}`))}`,
    ...e.koef.map(c => `# ${kom(`${c.name}: b = ${zz(c.b)}, ${L('Standardfehler', 'standard error')} ${zz(c.se)}, ${L('robust', 'robust')} ${zz(c.seRobust)}`)}`),
    ''
  ].join('\n');
  return { r, csv, rName, csvName };
}
