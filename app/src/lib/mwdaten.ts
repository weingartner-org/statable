/** Holt die Zeilen für die Messwiederholung aus den geladenen Daten: nur Personen mit gültigen Zahlen in allen Spalten (und gültiger Gruppe), Spalten in der Reihenfolge der Namen. */
import { s } from './sitzung.svelte';
import { istFehlend } from './fehlend';

export function mwZeilen(namen: string[], gruppenSpalte?: string): { zeilen: number[][]; gruppen?: (string | number)[] } | null {
  const ix = namen.map(n => s.spalten.findIndex(c => c.name === n)), gi = gruppenSpalte ? s.spalten.findIndex(c => c.name === gruppenSpalte) : -1;
  if (ix.some(i => i < 0) || (gruppenSpalte && gi < 0)) return null;
  const cs = ix.map(i => s.spalten[i]!), zeilen: number[][] = [], gruppen: (string | number)[] = [];
  for (const z of s.zeilen) {
    const w = ix.map(i => z[i]);
    if (w.some((v, q) => typeof v !== 'number' || istFehlend(cs[q]!, v))) continue;
    if (gi >= 0) { const g = z[gi]; if (g === null || g === undefined || istFehlend(s.spalten[gi]!, g)) continue; gruppen.push(g); }
    zeilen.push(w as number[]);
  }
  return { zeilen, gruppen: gi >= 0 ? gruppen : undefined };
}
