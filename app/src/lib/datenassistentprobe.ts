/**
 * Probelauf für die Vorschau der Assistenten „Zählen“, „Rang“, „Datum“ (Später S-C): führt den Befehl in der Engine aus, liest die ersten Zeilen der gewählten Spalten
 * und stellt den Stand davor wieder her (probelauf in datenassistentlauf.ts).
 */
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { probelauf } from './datenassistentlauf';

export interface Probe { spalten: Spalte[]; zeilen: Wert[][]; fehler: string[]; alle?: Wert[][]; alleSpalten?: Spalte[] }
export const PROBE_ZEILEN = 10;
/** Die Spalten `namen` nach dem Befehl `syntax`; die ersten 10 Zeilen (und mit `alle` die ganze Tabelle der Spalten). */
export async function probeSpalten(syntax: string, namen: string[], alle = false): Promise<Probe> {
  const r = await probelauf(syntax);
  if (!r.daten) return { spalten: [], zeilen: [], fehler: r.fehler };
  const spalten = namen.map(n => r.daten!.spalten.find(c => c.name.toUpperCase() === n.toUpperCase())).filter((c): c is Spalte => !!c);
  const idx = spalten.map(c => r.daten!.spalten.indexOf(c));
  const zeilen = r.daten.zeilen.map(row => idx.map(i => row[i] ?? null));
  return { spalten, zeilen: zeilen.slice(0, PROBE_ZEILEN), fehler: [], ...(alle ? { alle: zeilen, alleSpalten: spalten } : {}) };
}
