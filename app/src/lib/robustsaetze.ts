/**
 * Tabelle zum 5 %-getrimmten Mittel in der Karte „Wie verteilt sich etwas?“ (Später, Welle S-B, Teil 4; Rechnung: lib/robust.ts, Fachblatt Abschnitt 4).
 * Die Tabelle steht bei den Kennwerten (Bericht, Word, Excel inklusive). Huber-M gibt es nicht (Entscheidung Opus).
 */
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import type { Verteilung } from './ergebnis';
import { fd, fx, tabelle } from './mwsaetze';

/** Unter dieser Zahl von Werten schneidet das 5 %-Mittel weniger als einen ganzen Wert je Seite ab. */
export const GETRIMMT_KLEIN = 20;

/** Die Tabelle „Robuste Lagemaße“: Mittelwert, Median und 5 %-getrimmtes Mittel je Zahlenspalte. Leer, wenn keine Spalte ein getrimmtes Mittel hat. */
export function tabellenRobust(e: Verteilung, label: (s: string) => string = s => s): TableItem[] {
  const z = e.zahlen.filter(k => k.getrimmt !== undefined && Number.isFinite(k.getrimmt));
  if (!z.length) return [];
  const klein = z.some(k => k.n < GETRIMMT_KLEIN);
  const fuss = [
    L('5 %-getrimmtes Mittel: Unten und oben bleiben je 5 % der Werte unberücksichtigt, ein Randwert zählt anteilig - wie in SPSS und PSPP. Es ist nicht der Trim-Wert von R (mean(x, trim = 0,05)): Der schneidet ganze Werte ab und tut bei kleinen Stichproben nichts. Die Werte bleiben in den Daten.',
      '5% trimmed mean: the lowest and highest 5% of the values are left out, a boundary value counts in part - as in SPSS and PSPP. It is not the trim of R (mean(x, trim = 0.05)): that cuts whole values and does nothing in small samples. The values stay in the data.'),
    ...(klein ? [L(`Bei weniger als ${GETRIMMT_KLEIN} Werten schneidet das 5 %-Mittel weniger als einen ganzen Wert je Seite ab; bei kleinen Stichproben schützt es kaum vor einem einzelnen Ausreißer.`, `With fewer than ${GETRIMMT_KLEIN} values the 5% trimmed mean cuts less than one whole value per side; in small samples it hardly protects against a single outlier.`)] : [])
  ];
  return [tabelle('Robust Location', L('Robuste Lagemaße', 'Robust measures of location'), [L('Spalte', 'Column'), 'N', L('Mittelwert', 'Mean'), L('5 %-getrimmtes Mittel', '5% trimmed mean'), 'Median'],
    z.map(k => [label(k.name), fd(k.n), fx(k.m, 2), fx(k.getrimmt!, 2), k.median === undefined ? '-' : fx(k.median, 2)]), fuss)];
}
