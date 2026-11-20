/** Rechenkerne der kleinen „Ausprobieren“-Bausteine (#verstehen/probieren): reine Rechnungen ohne Daten. Sollwerte: scripts/probieren-erwartet.R. */
import { tQuantil } from './verteilung';

/** Standardisiertes Cronbach-Alpha bei k Fragen mit gleichem mittlerem Zusammenhang r (Spearman-Brown). */
export const alphaAusK = (k: number, r: number): number => (k * r) / (1 + (k - 1) * r);

export interface Intervall { halb: number; breite: number; t: number }
/** 95-%-Konfidenzintervall für einen Mittelwert: Halbbreite t(0,975; n−1) · s / √n. */
export function intervallBreite(n: number, s: number): Intervall {
  const t = tQuantil(0.975, n - 1);
  const halb = (t * s) / Math.sqrt(n);
  return { halb, breite: 2 * halb, t };
}

export interface Vierfeld { tp: number; fn: number; fp: number; tn: number; ppv: number; npv: number }
/** Vierfeldertafel für `n` Personen (Standard 1000) aus Sensitivität, Spezifität und Häufigkeit (alle als Anteile 0 bis 1). */
export function vierfeld(sens: number, spez: number, haeuf: number, n = 1000): Vierfeld {
  const tp = n * haeuf * sens, fn = n * haeuf * (1 - sens), fp = n * (1 - haeuf) * (1 - spez), tn = n * (1 - haeuf) * spez;
  return { tp, fn, fp, tn, ppv: tp / (tp + fp), npv: tn / (tn + fn) };
}
