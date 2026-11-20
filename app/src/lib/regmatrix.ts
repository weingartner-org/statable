/**
 * Entwurfsmatrix der linearen Regression aus den Daten des Projekts (gemeinsam für RobustBlock und DiagnoseBlock, Field-Stufe 1, 05.11.2026).
 * Listenweise: Fälle mit fehlendem Ziel oder fehlender Vorhersagegröße fallen heraus. Gruppen-Spalten (Faktor) werden wie in der Regression selbst
 * zu 0/1-Hilfsspalten (erste Stufe = Vergleichsgruppe, regfaktor.ts). `zeile` ist die Zeilennummer in den Daten (ab 1), wie in der Datenansicht.
 */
import type { RegTerm } from './regfaktor';
import { istFehlend, type FehlendQuelle } from './fehlend';

export interface RegMatrix { x: number[][]; y: number[]; zeile: number[]; zeilenNamen: string[] }
export interface RegSpalte extends FehlendQuelle { name: string }

/** `zielWert`: für Ziele, die kein Messwert sind (Ja/Nein der logistischen Regression): macht aus dem Wert der Zeile 0/1 oder `null` (fehlt). Ohne: das Ziel muss eine gültige Zahl sein. */
export function regMatrix(spalten: RegSpalte[], zeilen: (string | number | null | undefined)[][], terme: RegTerm[], ziel: string, name: (n: string) => string, zielWert?: (v: string | number) => number | null): RegMatrix | null {
  const zi = spalten.findIndex(c => c.name === ziel);
  const sp = terme.map(t => spalten.findIndex(c => c.name === t.spalte));
  if (zi < 0 || sp.some(i => i < 0)) return null;
  const x: number[][] = [], y: number[] = [], zeile: number[] = [], zeilenNamen = terme.flatMap(t => (t.faktor ? t.faktor.labels : [name(t.spalte)]));
  zeilen.forEach((z, nr) => {
    const yr = z[zi];
    if (yr === null || yr === undefined || yr === '' || istFehlend(spalten[zi]!, yr)) return;
    const yv = zielWert ? zielWert(yr) : yr;
    if (typeof yv !== 'number') return;
    const r: number[] = []; let ok = true;
    terme.forEach((t, k) => {
      const v = z[sp[k]!], col = spalten[sp[k]!]!;
      if (v === null || v === undefined || v === '' || istFehlend(col, v)) { ok = false; return; }
      if (t.faktor) { const w = t.faktor.text ? String(v) : String(Number(v)); t.faktor.stufen.slice(1).forEach(st => r.push(st.wert === w ? 1 : 0)); }
      else if (typeof v === 'number') r.push(v); else ok = false;
    });
    if (ok) { x.push(r); y.push(yv); zeile.push(nr + 1); }
  });
  return { x, y, zeile, zeilenNamen };
}
