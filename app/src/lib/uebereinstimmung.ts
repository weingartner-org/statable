/**
 * Übereinstimmung von Beurteilungen: Cohens Kappa (ungewichtet und gewichtet) und der Intraklassen-Korrelationskoeffizient (ICC).
 * PSPP 2.1.1 hat kein ICC (RELIABILITY kennt /ICC nicht) und rechnet Kappa nur bei quadratischen Tabellen - deshalb eigener Code,
 * geprüft gegen PSPP (CROSSTABS /STATISTICS=KAPPA), R `irr::kappa2`, `psych::cohen.kappa` und `psych::ICC` (scripts/uebereinstimmung-erwartet.R).
 * ⚠ Satzschwellen und Modellwahl sind von der Fachperson abzunehmen.
 */
import { fQuantil, fVerteilung } from './power';
import { normal } from './verteilung';
import { L, mitFlag } from './sitzung.svelte';

export type Gewicht = 'keins' | 'linear' | 'quadratisch';
export interface KappaZahlen { kappa: number; se: number; z: number; p: number; kiLo: number; kiHi: number }
const Z975 = 1.959963984540054;
export const pNormal = (z: number) => 2 * normal(-Math.abs(z));   // zweiseitig

/** Die Gewichte w_ij für Übereinstimmung: 1 auf der Diagonale; linear 1 − |i−j|/(k−1); quadratisch 1 − ((i−j)/(k−1))². */
function gewichte(k: number, g: Gewicht): number[][] {
  return Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (g === 'keins' ? (i === j ? 1 : 0) : g === 'linear' ? 1 - Math.abs(i - j) / (k - 1) : 1 - ((i - j) / (k - 1)) ** 2)));
}

/** Kappa aus einer quadratischen Zählertabelle (Zeilen: Beurteilende A, Spalten: Beurteilende B, gleiche Kategorien in gleicher Reihenfolge).
 *  Standardfehler nach Fleiss, Cohen & Everitt (1969): ohne Annahme für das KI, unter H0 für z und p. Für `keins` ist das der asymptotische Fehler von PSPP/SPSS. */
export function kappaAusTabelle(tab: number[][], g: Gewicht = 'keins'): KappaZahlen {
  const k = tab.length, N = tab.flat().reduce((a, b) => a + b, 0), w = gewichte(k, g);
  const p = tab.map(r => r.map(v => v / N)), pz = p.map(r => r.reduce((a, b) => a + b, 0)), ps = Array.from({ length: k }, (_, j) => p.reduce((a, r) => a + r[j]!, 0));
  let po = 0, pe = 0;
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) { po += w[i]![j]! * p[i]![j]!; pe += w[i]![j]! * pz[i]! * ps[j]!; }
  const wz = Array.from({ length: k }, (_, i) => ps.reduce((a, pj, j) => a + w[i]![j]! * pj, 0));   // w̄_i.
  const ws = Array.from({ length: k }, (_, j) => pz.reduce((a, pi, i) => a + w[i]![j]! * pi, 0));   // w̄_.j
  const kappa = (po - pe) / (1 - pe);
  let s1 = 0, s0 = 0;
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) {
    s1 += p[i]![j]! * (w[i]![j]! * (1 - pe) - (wz[i]! + ws[j]!) * (1 - po)) ** 2;
    s0 += pz[i]! * ps[j]! * (w[i]![j]! - (wz[i]! + ws[j]!)) ** 2;
  }
  const se = Math.sqrt(Math.max(0, s1 - (po * pe - 2 * pe + po) ** 2) / (N * (1 - pe) ** 4));
  const se0 = Math.sqrt(Math.max(0, s0 - pe * pe) / (N * (1 - pe) ** 2));
  const z = kappa / se0;
  return { kappa, se, z, p: pNormal(z), kiLo: kappa - Z975 * se, kiHi: kappa + Z975 * se };
}

export interface KappaTabelle { kategorien: (string | number)[]; tab: number[][]; n: number; uebereinstimmung: number }
const vergleich = (a: string | number, b: string | number) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de'));
/** Zählertabelle aus den Urteilspaaren. Die Kategorien sind alle, die irgendwer vergeben hat (so wird die Tabelle immer quadratisch), Zahlen der Größe nach, Text alphabetisch. */
export function kappaTabelle(paare: [string | number, string | number][]): KappaTabelle {
  const kategorien = [...new Set(paare.flat())].sort(vergleich), ix = new Map(kategorien.map((k, i) => [k, i]));
  const tab = kategorien.map(() => kategorien.map(() => 0));
  for (const [a, b] of paare) tab[ix.get(a)!]![ix.get(b)!]!++;
  const gleich = paare.filter(([a, b]) => a === b).length;
  return { kategorien, tab, n: paare.length, uebereinstimmung: paare.length ? gleich / paare.length : NaN };
}

/** Landis & Koch (1977). ⚠ Schwellen von der Fachperson abzunehmen. */
export function kappaWort(k0: number, en?: boolean): string {
  const k = Math.round(k0 * 100) / 100;   // Stufe am angezeigten Wert (Abschlusstest T4)
  const i = k < 0 ? 0 : k <= 0.2 ? 1 : k <= 0.4 ? 2 : k <= 0.6 ? 3 : k <= 0.8 ? 4 : 5;
  const wort = () => [L('schlecht (schlechter als Zufall)', 'poor (worse than chance)'), L('gering', 'slight'), L('ausreichend', 'fair'), L('mäßig', 'moderate'), L('beachtlich', 'substantial'), L('fast vollkommen', 'almost perfect')][i]!;
  return en === undefined ? wort() : mitFlag(en, wort);   // en: weggelassen = gewählte Sprache; true/false erzwingt Englisch/Deutsch
}

/* ---------------------------------------------------------------- ICC */

export type IccModell = 'absolut' | 'konsistenz';
export interface IccMass { icc: number; kiLo: number; kiHi: number }
export interface Icc {
  n: number; k: number; msz: number; msb: number; mse: number;
  /** F-Test der Zeilen (Fälle) gegen den Rest: F = MS_Zeilen / MS_Rest */
  f: number; df1: number; df2: number; p: number;
  absolut: { einzel: IccMass; mittel: IccMass };      // ICC(2,1) und ICC(2,k)
  konsistenz: { einzel: IccMass; mittel: IccMass };   // ICC(3,1) und ICC(3,k)
}

/** ICC aus einer Matrix Fälle × Beurteilende (nur vollständige Fälle). Zweifache Varianzanalyse ohne Wiederholung (Shrout & Fleiss 1979, McGraw & Wong 1996).
 *  Konfidenzgrenzen: ICC(2,1) mit Satterthwaite-Näherung (McGraw & Wong, Tab. 4), ICC(3,1) über F-Quantile; Mittelwert-Maße per Spearman-Brown aus den Grenzen der Einzelmaße. */
export function icc(daten: number[][]): Icc {
  const n = daten.length, k = daten[0]!.length;
  const gm = daten.flat().reduce((a, b) => a + b, 0) / (n * k);
  const zm = daten.map(r => r.reduce((a, b) => a + b, 0) / k), sm = Array.from({ length: k }, (_, j) => daten.reduce((a, r) => a + r[j]!, 0) / n);
  const ssz = k * zm.reduce((a, m) => a + (m - gm) ** 2, 0), ssb = n * sm.reduce((a, m) => a + (m - gm) ** 2, 0);
  const sst = daten.flat().reduce((a, v) => a + (v - gm) ** 2, 0), sse = sst - ssz - ssb;
  const msz = ssz / (n - 1), msb = ssb / (k - 1), mse = sse / ((n - 1) * (k - 1));
  const df1 = n - 1, df2 = (n - 1) * (k - 1);
  if (!(sst > 0)) throw new Error(L('Alle Werte sind gleich', 'All values are the same'));
  if (sse <= 1e-12 * sst) {   // alle Beurteilenden vergeben in jedem Fall denselben Wert (bis auf einen festen Versatz): volle Konsistenz, F unendlich
    const eins: IccMass = { icc: 1, kiLo: 1, kiHi: 1 };
    const konst = { einzel: eins, mittel: eins };
    return { n, k, msz, msb, mse: 0, f: Infinity, df1, df2, p: 0, absolut: msb > 1e-12 * sst ? { einzel: { icc: msz / (msz + (k * msb) / n), kiLo: NaN, kiHi: NaN }, mittel: { icc: msz / (msz + msb / n), kiLo: NaN, kiHi: NaN } } : konst, konsistenz: konst };
  }
  const f = msz / mse;
  const mittel = (e: number) => (k * e) / (1 + (k - 1) * e);
  const mass = (e: number, lo: number, hi: number): { einzel: IccMass; mittel: IccMass } => ({ einzel: { icc: e, kiLo: lo, kiHi: hi }, mittel: { icc: mittel(e), kiLo: mittel(lo), kiHi: mittel(hi) } });
  // ICC(3,1) - Konsistenz
  const i3 = (msz - mse) / (msz + (k - 1) * mse);
  const fl = f / fQuantil(0.975, df1, df2), fu = f * fQuantil(0.975, df2, df1);
  const konsistenz = mass(i3, (fl - 1) / (fl + k - 1), (fu - 1) / (fu + k - 1));
  // ICC(2,1) - absolute Übereinstimmung
  const i2 = (msz - mse) / (msz + (k - 1) * mse + (k * (msb - mse)) / n);
  const fj = msb / mse, a = n * (1 + (k - 1) * i2) - k * i2;
  const v = ((k - 1) * (n - 1) * (k * i2 * fj + a) ** 2) / ((n - 1) * k * k * i2 * i2 * fj * fj + a * a);
  const fo = fQuantil(0.975, n - 1, v), fuu = fQuantil(0.975, v, n - 1), q = k * msb + (k * n - k - n) * mse;
  const absolut = mass(i2, (n * (msz - fo * mse)) / (fo * q + n * msz), (n * (fuu * msz - mse)) / (q + n * fuu * msz));
  return { n, k, msz, msb, mse, f, df1, df2, p: 1 - fVerteilung(f, df1, df2), absolut, konsistenz };
}

/** Koo & Li (2016) - die Autoren beurteilen nach der Untergrenze des 95 %-KI; Statable nennt das Wort für den Schätzwert und die Spanne des KI.
 *  Grenzen: < ,50 gering, ,50-,75 mäßig, ,75-,90 gut, > ,90 ausgezeichnet. ⚠ Schwellen von der Fachperson abzunehmen. */
export function iccWort(x0: number, en?: boolean): string {
  const x = Math.round(x0 * 100) / 100;   // Stufe am angezeigten Wert (Abschlusstest T4)
  const i = x < 0.5 ? 0 : x < 0.75 ? 1 : x < 0.9 ? 2 : 3;
  const wort = () => [L('gering', 'poor'), L('mäßig', 'moderate'), L('gut', 'good'), L('ausgezeichnet', 'excellent')][i]!;
  return en === undefined ? wort() : mitFlag(en, wort);
}
