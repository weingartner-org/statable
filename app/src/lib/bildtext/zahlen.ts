/**
 * Zahlen und kleine Bausteine für die Bildtexte (Welle 4): alles über das Sprachprofil (i18n/profil.ts), nie eigene Zeichen für Dezimal oder Prozent.
 * Regeln (BookAccess, ohne deren Zeichen): keine Tausendertrenner, ASCII-Minus, Punkte als „(x; y)“, Intervalle in Worten.
 */
import { L } from '../sitzung.svelte';
import { dez, proz as prozProfil } from '../../i18n/profil';

/** Zahl für den Text: höchstens 3 Nachkommastellen (ohne angehängte Nullen) oder genau `stellen`; Dezimalzeichen nach Profil; ASCII-Minus; nie Exponentschreibweise. */
export function z(v: number | null | undefined, stellen?: number): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return L('unbekannt', 'unknown');
  let t: string;
  if (Math.abs(v) >= 1e15) t = BigInt(Math.round(v)).toString();
  else t = stellen === undefined ? String(Math.round(v * 1000) / 1000) : v.toFixed(stellen);
  if (/e/i.test(t)) t = v.toFixed(stellen ?? 3);
  if (/^-0(\.0+)?$/.test(t)) t = t.slice(1);
  return dez(t);
}
/** Anteil in Prozent: `p` in Prozent (12,5 = 12,5 %), mit Sprachprofil (Leerzeichen vor dem Zeichen). */
export const prozent = (p: number, stellen = 1): string => (Number.isFinite(p) ? prozProfil(z(p, stellen)) : L('unbekannt', 'unknown'));
/** Punkt „(x; y)“. */
export const paar = (x: string, y: string): string => `(${x}; ${y})`;
/** „von a bis b“. */
export const vonBis = (a: string, b: string): string => L(`von ${a} bis ${b}`, `from ${a} to ${b}`);
/** Klasse eines Histogramms: halboffen („von 2 bis unter 4“), die letzte geschlossen. */
export const klasse = (a: string, b: string, letzte: boolean): string => (letzte ? vonBis(a, b) : L(`von ${a} bis unter ${b}`, `from ${a} to under ${b}`));
/** p-Wert im Text: sehr kleine Werte als „kleiner als 0,001“. */
export const pText = (p: number | null | undefined): string => {
  if (p === null || p === undefined || !Number.isFinite(p)) return L('unbekannt', 'unknown');
  if (p < 0.001) return L('kleiner als 0,001', 'less than 0.001');
  return z(p, 3);
};
/** Texte aus Daten (Namen) säubern: keine Zeichen, die in BookAccess etwas bedeuten (Johannes 06.11.). */
export function sauber(t: string): string {
  return t.replace(/\^/g, ` ${L('hoch', 'to the power of')} `).replace(/[{]/g, '(').replace(/[}]/g, ')').replace(/\|/g, '/').replace(/-{3,}/g, '-').replace(/\s{2,}/g, ' ').trim();
}
/** Kleinster Index des größten (bzw. kleinsten) endlichen Werts; -1 bei leerer Liste. */
export function indexMax(w: (number | null | undefined)[]): number { let b = -1; w.forEach((v, i) => { if (v !== null && v !== undefined && Number.isFinite(v) && (b < 0 || v > (w[b] as number))) b = i; }); return b; }
export function indexMin(w: (number | null | undefined)[]): number { let b = -1; w.forEach((v, i) => { if (v !== null && v !== undefined && Number.isFinite(v) && (b < 0 || v < (w[b] as number))) b = i; }); return b; }
/** Verlauf einer Werteliste nach fester Regel: 'steigend' = jeder Wert größer als der vorige, 'fallend' = jeder kleiner, 'gleich' = alle gleich; sonst null (dann sagt der Text nichts). Mindestens 3 Werte. */
export function verlaufsart(w: number[]): 'steigend' | 'fallend' | 'gleich' | null {
  const v = w.filter(x => Number.isFinite(x));
  if (v.length < 3 || v.length !== w.length) return null;
  let auf = true, ab = true, gl = true;
  for (let i = 1; i < v.length; i++) { if (!(v[i]! > v[i - 1]!)) auf = false; if (!(v[i]! < v[i - 1]!)) ab = false; if (v[i] !== v[i - 1]) gl = false; }
  return gl ? 'gleich' : auf ? 'steigend' : ab ? 'fallend' : null;
}
/** Pearson-Korrelation; null bei weniger als 3 Paaren oder ohne Streuung. */
export function pearson(p: [number, number][]): number | null {
  const n = p.length; if (n < 3) return null;
  const mx = p.reduce((a, q) => a + q[0], 0) / n, my = p.reduce((a, q) => a + q[1], 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of p) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  if (!(sxx > 0) || !(syy > 0)) return null;
  return sxy / Math.sqrt(sxx * syy);
}
