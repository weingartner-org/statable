/**
 * S-G: Tabellen umbauen („Pivot“, Johannes 22.10.). Gilt für einfache Tabellen (eine Kopfzeile, keine verbundenen Zellen, gleich viele Zellen je Zeile):
 *   - Zeilen und Spalten tauschen,
 *   - Zeilen und Spalten ausblenden (zum Beispiel nur Mittelwert und Standardabweichung),
 *   - Zeilen und Spalten umordnen.
 * Die Zahlen werden nie neu gerechnet oder geändert, nur anders gestellt. Zeilen und Spalten sind durch ihre Nummer in der ORIGINAL-Tabelle benannt
 * (die Tabelle ändert sich nicht, solange der Fingerabdruck gleich bleibt); der Tausch gilt zuletzt.
 */
import type { TabelleDe } from './export';

export interface Pivot {
  /** Zeilen und Spalten tauschen */
  tausch: boolean;
  /** Datenzeilen (0 = erste unter dem Kopf) und Datenspalten (0 = erste nach der Zeilenüberschrift), die fehlen */
  zeilenAus: number[]; spaltenAus: number[];
  /** Reihenfolge der Original-Nummern; leer = wie berechnet */
  zeilenFolge: number[]; spaltenFolge: number[];
}
export const pivotGrund = (): Pivot => ({ tausch: false, zeilenAus: [], spaltenAus: [], zeilenFolge: [], spaltenFolge: [] });
export const pivotIstGrund = (p: Pivot | undefined) => !p || (!p.tausch && !p.zeilenAus.length && !p.spaltenAus.length && !p.zeilenFolge.length && !p.spaltenFolge.length);

type Zellen = TabelleDe['zeilen'];

/** Eine Kopfzeile, gleich viele Zellen je Zeile, keine verbundenen Zellen, mindestens eine Datenzeile und eine Datenspalte. */
export function istEinfach(zeilen: Zellen, kopfZeilen: number): boolean {
  if (kopfZeilen !== 1 || zeilen.length < 2) return false;
  const n = zeilen[0]!.length;
  return n >= 2 && zeilen.every(r => r.length === n && r.every(c => c.span <= 1 && !c.ueber && !(c.rs && c.rs > 1)));
}

/** Fingerabdruck einer Tabelle: gleiche Tabelle, gleicher Schlüssel (Name, Größe und alle Texte der Zellen). */
export function tabellenSchluessel(label: string, zellen: { t: string }[], rows: number, cols: number): string {
  let h = 5381;
  for (const c of zellen) for (let i = 0; i < c.t.length; i++) h = ((h * 33) ^ c.t.charCodeAt(i)) >>> 0;
  return `${label}|${rows}x${cols}|${h.toString(36)}`;
}

const ordne = (n: number, aus: number[], folge: number[]): number[] => {
  const alle = Array.from({ length: n }, (_, i) => i);
  const reihe = [...folge.filter(i => i >= 0 && i < n), ...alle.filter(i => !folge.includes(i))];
  return reihe.filter(i => !aus.includes(i));
};
/** Die Nummern in der Reihenfolge, wie sie der Umbau zeigt (für das Bedienfeld). */
export const reihenfolge = ordne;

export function pivotiere(zeilen: Zellen, kopfZeilen: number, p: Pivot): { zeilen: Zellen; kopfZeilen: number } {
  if (!istEinfach(zeilen, kopfZeilen) || pivotIstGrund(p)) return { zeilen, kopfZeilen };
  const kopf = zeilen[0]!, koerper = zeilen.slice(1);
  const sp = ordne(kopf.length - 1, p.spaltenAus, p.spaltenFolge), ze = ordne(koerper.length, p.zeilenAus, p.zeilenFolge);
  const nKopf = [kopf[0]!, ...sp.map(j => kopf[j + 1]!)];
  const nKoerper = ze.map(i => { const r = koerper[i]!; return [r[0]!, ...sp.map(j => r[j + 1]!)]; });
  if (!p.tausch) return { zeilen: [nKopf, ...nKoerper], kopfZeilen: 1 };
  // Tausch: aus den Zeilenüberschriften wird die Kopfzeile, aus den Spaltenköpfen werden die Zeilenüberschriften.
  const eckeN = { ...nKopf[0]!, t: '' };
  const kopfNeu = [eckeN, ...nKoerper.map(r => ({ ...r[0]!, kopf: true, zahl: false }))];
  const koerperNeu = nKopf.slice(1).map((k, j) => [{ ...k, kopf: true, zahl: false, tipp: undefined }, ...nKoerper.map(r => r[j + 1]!)]);
  return { zeilen: [kopfNeu, ...koerperNeu], kopfZeilen: 1 };
}
