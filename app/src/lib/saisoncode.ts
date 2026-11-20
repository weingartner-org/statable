/**
 * Saisonbereinigung nur als R-Code zum Mitnehmen (Fachblatt SAISON-EUROSTAT, Abschnitt 1). Statable rechnet keine Saisonbereinigung:
 * X-13 läuft nicht im Browser (`seasonal` startet einen eigenen Prozess), JDemetra+ braucht Java. Hier entstehen nur zwei Dateien -
 * die Reihe als CSV und ein R-Skript -, die auf dem eigenen Rechner laufen. Das Skript wird in der App nie ausgeführt.
 *
 * SICHERHEIT: Text aus den Daten kommt nie roh in den R-Text. Die Namen der Dateien bestehen nur aus ASCII-Zeichen (`saisonDateiname`) und laufen zusätzlich
 * durch `rAnzeigeText`; Jahr, Periode und Frequenz sind Zahlen (`rAnzeigeZahl`). Die CSV hat feste Spaltennamen (zeit, wert).
 */
import { L } from './sitzung.svelte';
import { rAnzeigeText, rAnzeigeZahl } from '../engine/rsicher';
import { positionIso, type ZeitreiheE } from './zeitreiheblatt';

/** Die Reihe, wie die Saisonbereinigung sie braucht. */
export type SaisonReihe = Pick<ZeitreiheE, 'raster' | 'y' | 't' | 'erster'>;
export type SaisonModell = 'seats' | 'x11';
export type SaisonSperre = 'raster' | 'luecken' | 'zu-kurz';

/** Mindestens 3 volle Jahre (X-13 verlangt das so). */
export const SAISON_JAHRE_MIN = 3;
/** Beobachtungen je Jahr: 12 bei Monaten, 4 bei Quartalen, sonst null (keine Saisonbereinigung). */
export const saisonFrequenz = (r: Pick<SaisonReihe, 'raster'>): 12 | 4 | null => (r.raster === 'monatlich' ? 12 : r.raster === 'vierteljaehrlich' ? 4 : null);

/** Warum keine Saisonbereinigung angeboten wird (oder null): nur Monats- oder Quartalswerte, keine Lücken, mindestens 3 volle Jahre. */
export function saisonSperre(r: SaisonReihe): SaisonSperre | null {
  const f = saisonFrequenz(r);
  if (f === null) return 'raster';
  if (r.y.some(v => v === null || !Number.isFinite(v)) || r.t.some((t, i) => t !== r.t[0]! + i)) return 'luecken';
  if (r.y.length < SAISON_JAHRE_MIN * f) return 'zu-kurz';
  return null;
}
export function saisonSperreSatz(c: SaisonSperre, r?: Pick<SaisonReihe, 'raster'>): string {
  switch (c) {
    case 'raster': return L('Die Saisonbereinigung nach X-13 gibt es nur für Monats- oder Quartalswerte. Diese Reihe hat ein anderes Raster.', 'Seasonal adjustment with X-13 exists only for monthly or quarterly values. This series has a different grid.');
    case 'luecken': return L('X-13 verlangt eine Reihe ohne Lücken. Statable füllt nichts auf.', 'X-13 requires a series without gaps. Statable fills nothing in.');
    case 'zu-kurz': return r?.raster === 'vierteljaehrlich'
      ? L('X-13 verlangt mindestens 3 volle Jahre: bei Quartalswerten 12 Werte.', 'X-13 requires at least 3 full years: 12 values for quarterly data.')
      : L('X-13 verlangt mindestens 3 volle Jahre: bei Monatswerten 36 Werte.', 'X-13 requires at least 3 full years: 36 values for monthly data.');
  }
}

/** Die Warnungen des Fachblatts, immer sichtbar. */
export type SaisonWarnCode = 'nicht-gerechnet' | 'kalender' | 'modell';
export function saisonWarnungen(): { code: SaisonWarnCode; satz: string }[] {
  return [
    { code: 'nicht-gerechnet', satz: L('Statable rechnet das nicht. Das Ergebnis entsteht in R auf dem eigenen Rechner, und Statable hat es nicht geprüft.', 'Statable does not calculate this. The result is produced in R on your own computer, and Statable has not checked it.') },
    { code: 'kalender', satz: L('Kalender: seasonal prüft die Standard-Wochentags- und Ostereffekte. Österreichische Feiertage sind nicht enthalten; die ESS-Leitlinien empfehlen nationale Kalender. Wer sie braucht, ergänzt eigene Regressoren über xreg.', 'Calendar: seasonal tests the standard trading-day and Easter effects. Austrian public holidays are not included; the ESS guidelines recommend national calendars. Whoever needs them adds their own regressors through xreg.') },
    { code: 'modell', satz: L('Die Modellwahl von X-13 ist automatisch. summary(m) und die Diagnosen gehören gelesen.', 'The model choice of X-13 is automatic. summary(m) and the diagnostics need to be read.') }
  ];
}
/** Der Satz, der sagt, was hier geschieht und was nicht (über den Knöpfen). */
export const saisonHilfeSatz = (): string =>
  L('Statable rechnet keine Saisonbereinigung: X-13 läuft nicht im Browser. Statable erzeugt die Reihe als CSV-Datei und ein R-Skript zum Mitnehmen; gerechnet wird in R auf dem eigenen Rechner mit dem Paket seasonal. Die klassische Zerlegung oben ist keine Saisonbereinigung nach X-13.',
    'Statable does not calculate seasonal adjustment: X-13 does not run in the browser. Statable creates the series as a CSV file and an R script to take along; the calculation is done in R on your own computer with the package seasonal. The classical decomposition above is not a seasonal adjustment with X-13.');
/** Der eine Satz bei der klassischen Zerlegung, der hierher verweist. */
export const saisonVerweisSatz = (): string =>
  L('Das ist die klassische Zerlegung, keine Saisonbereinigung nach X-13. Für die Saisonbereinigung gibt es weiter unten R-Code zum Mitnehmen.', 'This is the classical decomposition, not a seasonal adjustment with X-13. Further down there is R code to take along for seasonal adjustment.');

/** Der Name der Dateien: nur ASCII, keine Leerzeichen; so bleibt er in jedem Dateisystem und in R-Text unverfänglich. */
export function saisonDateiname(spalte: string): string {
  const n = String(spalte).normalize('NFD').replace(/\p{M}/gu, '').replace(/ß/g, 'ss').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^[_-]+|[_-]+$/g, '').slice(0, 40);
  return n || 'reihe';
}

/** Jahr und Periode (Monat 1-12 oder Quartal 1-4) des ersten Werts. */
export function saisonStart(r: SaisonReihe): { jahr: number; periode: number } | null {
  const f = saisonFrequenz(r);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(positionIso(r, r.t[0] ?? 1));
  if (f === null || !m) return null;
  const mon = Number(m[2]);
  return { jahr: Number(m[1]), periode: f === 12 ? mon : Math.floor((mon - 1) / 3) + 1 };
}

/** Die CSV der Reihe: Zeitpunkt (JJJJ-MM-TT) und Wert, Punkt als Dezimalzeichen, UTF-8. Nur aufrufen, wenn `saisonSperre` null ist. */
export function saisonCsv(r: SaisonReihe): string {
  const zeilen = r.y.map((v, i) => `${positionIso(r, r.t[i]!)},${v as number}`);
  return ['zeit,wert', ...zeilen].join('\n') + '\n';
}

/** R-Text zum Ansehen und Mitnehmen (wird nie ausgeführt). `csvName` und `bereinigtName` stammen aus `saisonDateiname`. */
export function saisonRCode(o: { csvName: string; bereinigtName: string; modell: SaisonModell; jahr: number; periode: number; frequenz: 12 | 4 }): string {
  const seas = o.modell === 'x11' ? 'seas(y, x11 = "")' : 'seas(y)';
  const andere = o.modell === 'x11' ? L('bei SEATS: seas(y)', 'for SEATS: seas(y)') : L('bei X-11: seas(y, x11 = "")', 'for X-11: seas(y, x11 = "")');
  return [
    `# ${L('Saisonbereinigung mit X-13 (R-Paket seasonal) - erzeugt von Statable, in Statable nicht ausgeführt', 'Seasonal adjustment with X-13 (R package seasonal) - created by Statable, not run in Statable')}`,
    `# install.packages("seasonal")   # ${L('braucht auch x13binary, kommt mit', 'also needs x13binary, comes along')}`,
    'library(seasonal)',
    `d <- read.csv(${rAnzeigeText(o.csvName)})`,
    `y <- ts(d$wert, start = c(${rAnzeigeZahl(o.jahr)}, ${rAnzeigeZahl(o.periode)}), frequency = ${rAnzeigeZahl(o.frequenz)})`,
    `m <- ${seas}   # ${andere}`,
    'summary(m)',
    'plot(m)',
    `bereinigt <- final(m)   # ${L('saisonbereinigte Reihe', 'seasonally adjusted series')}`,
    `write.csv(data.frame(zeit = d$zeit, bereinigt = as.numeric(bereinigt)), ${rAnzeigeText(o.bereinigtName)}, row.names = FALSE)`
  ].join('\n') + '\n';
}

export interface SaisonDateien { csvName: string; bereinigtName: string; rName: string; csv: string; r: string }
/** Beide Dateien für eine Reihe; null, wenn gesperrt. */
export function saisonDateien(r: SaisonReihe, spalte: string, modell: SaisonModell): SaisonDateien | null {
  const f = saisonFrequenz(r), start = saisonStart(r);
  if (saisonSperre(r) || f === null || !start) return null;
  const basis = saisonDateiname(spalte), csvName = `${basis}.csv`, bereinigtName = `${basis}-bereinigt.csv`;
  return { csvName, bereinigtName, rName: `${basis}-saisonbereinigung.R`, csv: saisonCsv(r), r: saisonRCode({ csvName, bereinigtName, modell, jahr: start.jahr, periode: start.periode, frequenz: f }) };
}
