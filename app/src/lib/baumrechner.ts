/**
 * Baumrechner im Lernlabor (Johannes 31.10.): zweistufiger Baum mit eigenen Begriffen. Rechnet über `vierfeldertafel` (lib/lernlabor.ts):
 * P(A) ist dort die Prävalenz, P(B | A) die Sensitivität und 1 − P(B | nicht A) die Spezifität. Sollwerte: scripts/baumrechner-erwartet.R.
 */
import { bayes, unabhaengig, vierfeldertafel, type Vierfeldertafel } from './lernlabor';

export interface Baumrechnung {
  v: Vierfeldertafel; pA: number; pBgA: number; pBgN: number;
  /** Die vier Pfade: A und B, A und nicht B, nicht A und B, nicht A und nicht B. */
  pAB: number; pAN: number; pNB: number; pNN: number;
  pB: number; /** Nicht bestimmt (NaN), wenn B nie oder immer eintritt. */ pAgB: number; pAgNB: number; unabhaengig: boolean;
}

/** `N`: Bezugsgröße der natürlichen Häufigkeiten; ohne sie die kleinste Zehnerpotenz, bei der alle Zahlen ganz sind. */
export function baumrechnung(pA: number, pBgA: number, pBgN: number, N?: number): Baumrechnung {
  const v = vierfeldertafel({ modus: 'rate', praevalenz: pA, se: pBgA, sp: 1 - pBgN, ...(N === undefined ? {} : { N }) });
  const pAB = pA * pBgA, pAN = pA * (1 - pBgA), pNB = (1 - pA) * pBgN, pNN = (1 - pA) * (1 - pBgN), pB = pAB + pNB;
  const g = bayes(pA, pBgA, 1 - pBgN);
  return { v, pA, pBgA, pBgN, pAB, pAN, pNB, pNN, pB, pAgB: pB > 0 ? pAB / pB : NaN, pAgNB: pB < 1 ? pAN / (1 - pB) : NaN, unabhaengig: Number.isFinite(g.pPositiv) && unabhaengig(pA, pB, pAB).gleich };
}
