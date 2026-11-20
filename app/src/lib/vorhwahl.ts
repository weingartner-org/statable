/**
 * Später S-E: die Einstellungen der beiden Optionen „Quantilregression“ (τ, Art des Intervalls) und „Ridge, Lasso, Elastic Net“ (α, Regel für λ, Standardisierung) am Blatt.
 * Die Wahl der Option selbst ist `ZusatzWahl.modell.art` ('quantil' | 'penal'); hier steht, was sie einstellt. Fehlt `vorh` (alte Blätter), gelten die Voreinstellungen.
 */
import type { QuantilKiWunsch } from './quantil';
import type { StrafRegel } from './strafreg';

export interface VorhWahl {
  /** Quantilregression: die τ nebeneinander (Voreinstellung: der Median) */ tau: number[];
  /** Quantilregression: gewünschte Intervall-Methode (Voreinstellung: nach der Fallzahl) */ ki: QuantilKiWunsch;
  /** Strafregression: 0 = Ridge, 1 = Lasso, dazwischen Elastic Net (Voreinstellung: Lasso) */ alpha: number;
  /** Strafregression: λ nach der Ein-Standardfehler-Regel (Voreinstellung) oder mit dem kleinsten Fehler */ regel: StrafRegel;
  /** Strafregression: Spalten standardisieren (Voreinstellung: ja) */ standardisieren: boolean;
}
export const leereVorh = (): VorhWahl => ({ tau: [0.5], ki: 'standard', alpha: 1, regel: 'se1', standardisieren: true });
export function kopiereVorh(v: Partial<VorhWahl> | undefined): VorhWahl {
  const l = leereVorh();
  if (!v) return l;
  return {
    tau: Array.isArray(v.tau) && v.tau.every(t => typeof t === 'number' && Number.isFinite(t)) ? [...v.tau] : l.tau,
    ki: v.ki === 'rang' || v.ki === 'nid' || v.ki === 'bootstrap' ? v.ki : 'standard',
    alpha: typeof v.alpha === 'number' && v.alpha >= 0 && v.alpha <= 1 ? v.alpha : l.alpha,
    regel: v.regel === 'min' ? 'min' : 'se1',
    standardisieren: v.standardisieren !== false
  };
}
/** Weicht die Wahl von der Voreinstellung ab? */
export const vorhAn = (v: VorhWahl | undefined): boolean => !!v && JSON.stringify(kopiereVorh(v)) !== JSON.stringify(leereVorh());
