/**
 * Wahl unter „Weitere Wege“: „Ohne Normalverteilung - mit Zufallsverfahren“ (Später, Welle S-B, Teil 6, L5; Fachblatt SPAETER-B-OPTIONEN.md Abschnitt 6).
 * Gehört zur ZusatzWahl des Blatts (`zus.zufall`, aequirci.ts). Gerechnet wird in lib/zufallslauf.ts (Permutationstest: lib/permutation.ts; Bootstrap: lib/bootstrap.ts).
 * Immer sichtbar: Zahl der Ziehungen B (Voreinstellung 9999), Startwert (20261008) und Art des Intervalls (Perzentil, wählbar BCa).
 */
import { BOOT_B, BOOT_STARTWERT, type BootArt } from './bootstrap';
import { ZUFALL_B_MAX } from './permutation';

export interface ZufallWahl {
  an: boolean;
  /** Zahl der Ziehungen bzw. Zufallsaufteilungen, 99 bis 99 999 */
  B: number;
  startwert: number;
  art: BootArt;
  /** Gruppen und Verteilung: Mittelwert (Voreinstellung) oder Median */
  statistik: 'mittel' | 'median';
}
export const B_MIN = 99;
export const leereZufall = (): ZufallWahl => ({ an: false, B: BOOT_B, startwert: BOOT_STARTWERT, art: 'perzentil', statistik: 'mittel' });
export function kopiereZufall(z: Partial<ZufallWahl> | undefined): ZufallWahl {
  const l = leereZufall();
  if (!z) return l;
  const B = Number.isInteger(z.B) && z.B! >= B_MIN && z.B! <= ZUFALL_B_MAX ? z.B! : l.B;
  return { an: !!z.an, B, startwert: Number.isInteger(z.startwert) && z.startwert! >= 0 && z.startwert! <= 4294967295 ? z.startwert! : l.startwert, art: z.art === 'bca' ? 'bca' : 'perzentil', statistik: z.statistik === 'median' ? 'median' : 'mittel' };
}
/** Eine ganze Zahl aus dem Eingabefeld (nur Ziffern, ohne Tausenderpunkt); sonst null. */
export function ganzeZahlAusText(t: string): number | null {
  const x = t.trim().replace(/[\s.]/g, '');
  return /^\d{1,10}$/.test(x) ? Number(x) : null;
}
/** Stimmt die Zahl der Ziehungen (99 bis 99 999)? */
export const bGueltig = (B: number) => Number.isInteger(B) && B >= B_MIN && B <= ZUFALL_B_MAX;
/** Ist der Zufall eingeschaltet? */
export const zufallAn = (z: ZufallWahl | undefined) => !!z?.an;
