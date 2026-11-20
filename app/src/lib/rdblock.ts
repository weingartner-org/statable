/**
 * B2 Teil 2d-2: Regressions-Diskontinuität als Block unter der Regression („Gibt es an einer Schwelle einen Sprung? (Regressions-Diskontinuität)“).
 * Daten aus dem Blatt holen (Ergebnis, Zuteilungsvariable; nur vollständige Fälle), mehrere Bandbreiten nebeneinander mit dem Kern lib/rd.ts, R-Skript in Basis-R.
 * Fachblatt docs/ausbau/FACHBLATT-B2-OEKONOMETRIE.md, Abschnitt Teil 2d-2.
 *
 * R-Skript (Regel aus B1): Basis-R, Daten als CSV, keine Zusatzpakete. Rechnet dasselbe wie lib/rd.ts von Hand (gewichtete Kleinste Quadrate, klassisch und HC1).
 * Sicherheit wie lib/rskript.ts: Spaltennamen nur über rAnzeigeText, Zahlen über rZahl, Kommentare über kom.
 * FESTE OBJEKTNAMEN im Skript (Gegenprobe rdblock.test.ts): `rd` (data.frame h, n, n_links, n_rechts, b, se, t, p, se_robust, t_robust, p_robust), `schwelle`, `ordnung`, `kern`.
 */
import { L } from './sitzung.svelte';
import { istFehlend } from './fehlend';
import { rdRechnen, type RdErgebnis, type RdFehler, type RdKern } from './rd';
import { datenCsv, kom, rDateiBasis, type RSkript, type RSpalte } from './rskript';
import { rAnzeigeText, rZahl } from '../engine/rsicher';

export const RD_MAX = 200000;
export const RD_BANDBREITEN_MAX = 6;

export interface RdDaten { y: number[]; x: number[]; weg: number }
export type RdBlockFehler = { fehler: 'keine-auswahl' | 'doppelt' | 'zu-viele-faelle' | 'keine-bandbreite' | 'schwelle' | RdFehler['fehler'] };

const leer = (sp: RSpalte, v: unknown) => v === null || v === undefined || v === '' || (typeof v === 'number' && (!Number.isFinite(v) || istFehlend(sp, v)));

/** Vollständige Fälle für Ergebnis und Zuteilungsvariable (beides Zahlen-Spalten). */
export function rdDaten(spalten: RSpalte[], zeilen: (string | number | null)[][], ziel: string, zuteilung: string): RdDaten | RdBlockFehler {
  if (!ziel || !zuteilung) return { fehler: 'keine-auswahl' };
  if (ziel === zuteilung) return { fehler: 'doppelt' };
  const hol = (n: string) => spalten.find(c => c.name === n && c.art === 'zahl');
  const a = hol(ziel), b = hol(zuteilung);
  if (!a || !b) return { fehler: 'keine-auswahl' };
  const ia = spalten.indexOf(a), ib = spalten.indexOf(b);
  const y: number[] = [], x: number[] = []; let weg = 0;
  for (const z of zeilen) { if (leer(a, z[ia]) || leer(b, z[ib])) weg++; else { y.push(z[ia] as number); x.push(z[ib] as number); } }
  if (y.length > RD_MAX) return { fehler: 'zu-viele-faelle' };
  return { y, x, weg };
}

/** Bandbreiten aus einem Textfeld lesen: getrennt durch Leerzeichen oder Semikolon, Komma oder Punkt als Dezimalzeichen; nur positive Zahlen, ohne Doppelte. */
export function leseBandbreiten(text: string): number[] {
  const aus: number[] = [];
  for (const t of text.split(/[\s;]+/)) { if (!t) continue; const v = Number(t.replace(',', '.')); if (Number.isFinite(v) && v > 0 && !aus.includes(v)) aus.push(v); }
  return aus.slice(0, RD_BANDBREITEN_MAX);
}

/** Vorschlag für Bandbreiten: ein Viertel, die Hälfte und das Ganze der Standardabweichung der Zuteilungsvariablen, auf 2 gültige Stellen gerundet. */
export function bandbreitenVorschlag(x: number[]): number[] {
  const n = x.length; if (n < 3) return [];
  const m = x.reduce((s, v) => s + v, 0) / n, sd = Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1));
  if (!(sd > 0)) return [];
  return [0.25, 0.5, 1].map(f => Number((sd * f).toPrecision(2)));
}

export interface RdZeile { h: number; e: RdErgebnis | RdFehler }

export function rdBlockRechne(d: RdDaten, schwelle: number, bandbreiten: number[], ordnung: 1 | 2, kern: RdKern): RdZeile[] | RdBlockFehler {
  if (!Number.isFinite(schwelle)) return { fehler: 'schwelle' };
  if (!bandbreiten.length) return { fehler: 'keine-bandbreite' };
  return bandbreiten.map(h => ({ h, e: rdRechnen(d.y, d.x, schwelle, h, ordnung, kern) }));
}

const zz = (v: number | undefined, dz = 4): string => (typeof v === 'number' && Number.isFinite(v) ? String(Number(v.toFixed(dz))) : 'NA');

export function baueRdSkript(o: { spalten: RSpalte[]; zeilen: (string | number | null)[][]; ziel: string; zuteilung: string; schwelle: number; bandbreiten: number[]; ordnung: 1 | 2; kern: RdKern; zeilenErg: RdZeile[]; titel: string; datum: string }): RSkript {
  const alle = [o.ziel, o.zuteilung].map(n => o.spalten.find(c => c.name === n)!).filter(Boolean);
  const csv = datenCsv({ spalten: o.spalten, zeilen: o.zeilen, blattSpalten: [], titel: o.titel, datum: o.datum }, alle);
  const basis = rDateiBasis(o.titel), csvName = `${basis}-daten.csv`, rName = `${basis}.R`;
  const q = rAnzeigeText;
  const r = [
    `# ${kom(o.titel)}`,
    `# ${L(`Erstellt mit Statable (statable.eu) am ${kom(o.datum)}`, `Created with Statable (statable.eu) on ${kom(o.datum)}`)}`,
    `# ${L('Regressions-Diskontinuität (scharf): Rund um die Schwelle wird links und rechts getrennt eine Gerade (Ordnung 1) oder Parabel (Ordnung 2) angepasst; der Sprung an der Schwelle steht im Koeffizienten der Zeile „D“. Klassische und robuste Standardfehler (HC1). Von Hand in Basis-R, ohne Zusatzpaket.', 'Regression discontinuity (sharp): around the threshold a line (order 1) or parabola (order 2) is fitted separately on the left and on the right; the jump at the threshold is the coefficient in the row "D". Classical and robust standard errors (HC1). Written out in base R, no extra package.')}`,
    `# ${L('Starten: Ordner entpacken, in R mit setwd() in den Ordner wechseln (in RStudio: Session > Set Working Directory > To Source File Location), dann source() mit dem Namen dieser Datei.', 'How to start it: unzip the folder, change to it with setwd() in R (in RStudio: Session > Set Working Directory > To Source File Location), then source() this file.')}`,
    '',
    `# ${L('Daten lesen (fehlende Werte als leere Zelle); nur Fälle mit Werten in beiden Spalten', 'Read the data (missing values as an empty cell); only cases with values in both columns')}`,
    `daten <- read.csv(${q(csvName)}, fileEncoding = "UTF-8", check.names = FALSE, na.strings = "")`,
    `d <- daten[stats::complete.cases(daten), , drop = FALSE]`,
    `y <- as.numeric(d[[${q(o.ziel)}]]); x <- as.numeric(d[[${q(o.zuteilung)}]])`,
    '',
    `# ${L('Einstellungen: Schwelle, Bandbreiten, Ordnung (1 oder 2), Gewichte ("dreieck" oder "gleich")', 'Settings: threshold, bandwidths, order (1 or 2), weights ("dreieck" = triangular or "gleich" = equal)')}`,
    `schwelle <- ${rZahl(o.schwelle)}`,
    `bandbreiten <- c(${o.bandbreiten.map(h => rZahl(h)).join(', ')})`,
    `ordnung <- ${o.ordnung}`,
    `kern <- ${q(o.kern)}`,
    '',
    `# ${L('Eine Bandbreite rechnen: gewichtete Kleinste Quadrate in Fenster |x - Schwelle| <= h, dazu HC1', 'Fit one bandwidth: weighted least squares in the window |x - threshold| <= h, plus HC1')}`,
    'rd_eine <- function(h) {',
    '  u <- x - schwelle; a <- abs(u) / h',
    '  g <- if (kern == "dreieck") 1 - a else ifelse(a <= 1, 1, 0)',
    '  ok <- g > 0; u <- u[ok]; g <- g[ok]; yy <- y[ok]; D <- as.numeric(u >= 0)',
    '  Z <- if (ordnung == 1) cbind(1, D, u, D * u) else cbind(1, D, u, D * u, u^2, D * u^2)',
    '  k <- ncol(Z); n <- length(yy); df <- n - k',
    '  inv <- solve(crossprod(Z, Z * g)); b <- drop(inv %*% crossprod(Z, g * yy)); e <- drop(yy - Z %*% b)',
    '  s2 <- sum(g * e^2) / df',
    '  VR <- inv %*% crossprod(Z * (g * e)) %*% inv * (n / df)   # HC1',
    '  se <- sqrt(s2 * inv[2, 2]); ser <- sqrt(VR[2, 2])',
    '  data.frame(h = h, n = n, n_links = sum(D == 0), n_rechts = sum(D == 1), b = b[2], se = se, t = b[2] / se, p = 2 * pt(-abs(b[2] / se), df),',
    '             se_robust = ser, t_robust = b[2] / ser, p_robust = 2 * pt(-abs(b[2] / ser), df))',
    '}',
    'rd <- do.call(rbind, lapply(bandbreiten, rd_eine)); rownames(rd) <- NULL',
    '',
    `# ${L('Ausgabe', 'Output')}`,
    'print(rd)',
    '',
    `# ${L('Zum Vergleichen: Das hat Statable gezeigt (Zahlen mit Punkt)', 'To compare: this is what Statable showed (numbers with a decimal point)')}`,
    ...o.zeilenErg.map(z => 'fehler' in z.e
      ? `# ${kom(L(`Bandbreite ${zz(z.h)}: nicht gerechnet (${z.e.fehler})`, `Bandwidth ${zz(z.h)}: not calculated (${z.e.fehler})`))}`
      : `# ${kom(L(`Bandbreite ${zz(z.h)}: ${z.e.n} Fälle (${z.e.nLinks} links, ${z.e.nRechts} rechts), Sprung ${zz(z.e.b)}, Standardfehler ${zz(z.e.se)}, robust ${zz(z.e.seRobust)}`, `Bandwidth ${zz(z.h)}: ${z.e.n} cases (${z.e.nLinks} left, ${z.e.nRechts} right), jump ${zz(z.e.b)}, standard error ${zz(z.e.se)}, robust ${zz(z.e.seRobust)}`))}`),
    ''
  ].join('\n');
  return { r, csv, rName, csvName };
}
