/**
 * Beurteilung der Messinvarianz (S-J, 23.10.2026): Änderung der Passung von einer Stufe zur nächsten nach der Faustregel von Chen (2007):
 * Die strengere Stufe gilt als NICHT erfüllt, wenn ΔCFI ≤ −0,010 und zugleich ΔRMSEA ≥ 0,015 oder ΔSRMR ≥ 0,030 (metrisch) bzw. ≥ 0,010 (skalar).
 * ⚠ Von der Fachperson abzunehmen: die Schwellen sind Simulationsergebnisse für bestimmte Stichproben (n > 300 je Gruppe, ungleiche Gruppen anders), keine Gesetze.
 */
import type { InvarianzErg } from './rverfahren.svelte';
export interface StufenUrteil { stufe: 'metrisch' | 'skalar'; dCfi: number; dRmsea: number; dSrmr: number; erfuellt: boolean; chisqP: number }
export function invarianzUrteile(e: Pick<InvarianzErg, 'stufen' | 'diff'>): StufenUrteil[] {
  const [k, m, sk] = e.stufen;
  if (!k || !m || !sk) return [];
  const u = (vor: typeof k, nach: typeof k, stufe: 'metrisch' | 'skalar', i: number): StufenUrteil => {
    const dCfi = nach.cfi - vor.cfi, dRmsea = nach.rmsea - vor.rmsea, dSrmr = nach.srmr - vor.srmr;
    const srmrGrenze = stufe === 'metrisch' ? 0.03 : 0.01;
    return { stufe, dCfi, dRmsea, dSrmr, erfuellt: !(dCfi <= -0.01 && (dRmsea >= 0.015 || dSrmr >= srmrGrenze)), chisqP: e.diff[i]?.p ?? NaN };
  };
  return [u(k, m, 'metrisch', 0), u(m, sk, 'skalar', 1)];
}
