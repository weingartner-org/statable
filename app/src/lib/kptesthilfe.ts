/** Nur für Tests des Kurs-Pakets: eine Statable-Sitzung (Spalten und Zeilen) aus Spalten von Zahlen und Texten. Zahlenspalten sind „metrisch“, Textspalten „nominal“. */
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';

export function sitz(cols: Record<string, (number | string | null)[]>, text: string[] = []): { spalten: Spalte[]; zeilen: Wert[][] } {
  const namen = Object.keys(cols), n = cols[namen[0]!]!.length;
  const spalten: Spalte[] = namen.map(name => ({ name, bezeichnung: name, art: text.includes(name) ? 'text' : 'zahl', niveau: text.includes(name) ? 'nominal' : 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {} }));
  const zeilen: Wert[][] = Array.from({ length: n }, (_, i) => namen.map((nm): Wert => cols[nm]![i] ?? null));
  return { spalten, zeilen };
}
/** Eine Reihe von n Zahlen mit festem Muster (kein Zufall): a + b · (i mod m). */
export const reihe = (n: number, a: number, b: number, m: number): number[] => Array.from({ length: n }, (_, i) => a + b * (i % m));
