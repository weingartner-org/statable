/**
 * Mehrebenen: Modelle vergleichen (Field-Stufe 2b, 05.11.2026). Die Rechnung steht in engine/statable.R (sp_meb_vergleich): alle Modelle mit ML (nicht REML), damit Modelle mit
 * verschiedenen festen Effekten vergleichbar sind. Schritte: Nullmodell (ICC) · feste Haupteffekte · plus Wechselwirkungen · plus zufällige Steigung.
 * Likelihood-Quotienten-Test je Schritt gegen das Modell davor: χ² = 2 (logLik größer − logLik kleiner), df = Unterschied der Parameter.
 * Sollwerte: R (lme4, nlme::MathAchieve, docs/fachblaetter/sollwerte/field-stufe2.json, Abschnitt mehrebenen), Test engine/mehrebenen-vergleich.webr.test.ts.
 */
import { mebDaten, type Mehrebenen, type MebTeil, type MebZentrierung } from './mehrebenen';
import type { RSpalte } from '../engine/webr';
import type { Spalte } from './verzeichnis';

export type MebSchluessel = 'm0' | 'm1' | 'm2' | 'm3';
export interface MebModell { schluessel: MebSchluessel; aic: number; bic: number; minus2ll: number; loglik: number; npar: number; singular: boolean; konv: boolean }
export interface MebLrt { von: MebSchluessel; nach: MebSchluessel; chi2: number; df: number; p: number }
export interface MebVergleich {
  modelle: MebModell[]; tests: MebLrt[]; icc: number; fest: { name: string; b: number; se: number }[]; meldungen: string[];
  /** Spalte der zufälligen Steigung (Kennung der Größe im Modell), leer = keine */
  steigung: string;
}

const arr = <T>(x: unknown): T[] => (x == null ? [] : Array.isArray(x) ? (x as T[]) : [x as T]);
const nums = (x: unknown): number[] => arr<number | null>(x).map(v => (typeof v === 'number' ? v : NaN));

export function mebVergleichLesen(r: Record<string, unknown>, steigung: string): MebVergleich {
  const nm = arr<string>(r.modell) as MebSchluessel[], aic = nums(r.aic), bic = nums(r.bic), m2 = nums(r.minus2ll), ll = nums(r.loglik), np = nums(r.npar), sg = arr<boolean>(r.singular), kv = arr<boolean>(r.konv);
  const von = arr<string>(r.vgl_von) as MebSchluessel[], nach = arr<string>(r.vgl_nach) as MebSchluessel[], chi = nums(r.vgl_chi2), df = nums(r.vgl_df), p = nums(r.vgl_p);
  const fn = arr<string>(r.fest_name), fb = nums(r.fest_b), fs = nums(r.fest_se);
  return {
    modelle: nm.map((k, i) => ({ schluessel: k, aic: aic[i]!, bic: bic[i]!, minus2ll: m2[i]!, loglik: ll[i]!, npar: np[i]!, singular: sg[i] === true, konv: kv[i] === true })),
    tests: nach.map((k, i) => ({ von: von[i]!, nach: k, chi2: chi[i]!, df: df[i]!, p: p[i]! })),
    icc: nums(r.icc)[0] ?? NaN, fest: fn.map((name, i) => ({ name, b: fb[i]!, se: fs[i]! })), meldungen: arr<string>(r.meldungen), steigung
  };
}

/** Die Daten und Namen für `sp_meb_vergleich`: Haupteffekte und Produkte getrennt (Produkt = Größe mit zwei Teilen), `steigung` = Kennung einer Größe des Ergebnisses `e` ('' = keine). */
export function mebVergleichAuftrag(e: Pick<Mehrebenen, 'y' | 'gruppe' | 'praedOrig' | 'praed' | 'zentrierArt' | 'zentriert' | 'wechsel' | 'zentrierSpalten'>, steigung: string, zeilen: (string | number | null)[][], spalten: Spalte[]):
  { spalten: RSpalte[]; feste: string[]; produkte: string[]; steigung: string; binaer: boolean } {
  const orig = e.praedOrig ?? e.praed.map(p => p.name);
  const art: MebZentrierung = e.zentrierArt ?? (e.zentriert ? 'gesamt' : 'keine');
  const d = mebDaten(e.y, e.gruppe, orig, zeilen, spalten, { zentrieren: art, wechsel: (e.wechsel ?? []) as [MebTeil, MebTeil][], ...(e.zentrierSpalten ? { zentrierSpalten: e.zentrierSpalten } : {}) });
  const rn = (i: number) => `p${String(i + 1).padStart(2, '0')}`;
  const feste: string[] = [], produkte: string[] = [];
  d.praed.forEach((p, i) => ((p.teile?.length ?? 0) === 2 ? produkte : feste).push(rn(i)));
  const si = d.praed.findIndex(p => p.name === steigung);
  const yWerte = new Set((d.spalten[0]!.werte as (number | null)[]).filter((v): v is number => v !== null));
  return { spalten: d.spalten, feste, produkte, steigung: si >= 0 ? rn(si) : '', binaer: yWerte.size === 2 };
}
