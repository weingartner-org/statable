/**
 * Unterschiedliches Funktionieren von Aufgaben (DIF) nach Mantel-Haenszel (Holland & Thayer 1988), 23.10.2026. Eigener Code, im Browser; die Rechnung ist `lib/mantelhaenszel.ts`.
 *   Je Aufgabe (0/1) und je Gruppe (Referenz, Fokus) eine 2×2-Tabelle (richtig/falsch) in jeder Schicht des Gesamtwerts (Summe aller Aufgaben); gemeinsames Odds Ratio α_MH und CMH-χ² mit Stetigkeitskorrektur.
 *   ETS-Maß Δ_MH = −2,35 · ln(α_MH); negativ = die Aufgabe ist für die Fokusgruppe schwerer als für gleich fähige Personen der Referenzgruppe.
 *   ETS-Klassen (Faustregel): A = |Δ| < 1 oder nicht signifikant; C = |Δ| ≥ 1,5 und signifikant (p < 0,05); sonst B. Die strenge ETS-Regel prüft zusätzlich, ob |Δ| signifikant über 1 liegt; das ist hier nicht enthalten.
 * Sollwerte: R `mantelhaen.test(…, correct = TRUE)` je Aufgabe, siehe dif.test.ts.
 * ⚠ Von der Fachperson abzunehmen: Klassengrenzen, Mindestgröße (je Gruppe mindestens etwa 100 Personen), Schichtung nach dem Gesamtwert einschließlich der geprüften Aufgabe (nicht gereinigt).
 */
import { mantelHaenszel, MH_MAX_SCHICHTEN, type Schicht } from './mantelhaenszel';

export interface DifAufgabe { orMH: number | null; delta: number | null; chi2: number | null; p: number | null; klasse: 'A' | 'B' | 'C' | null; richtigRef: number; richtigFokus: number }
export interface DifErgebnis { referenz: number; fokus: number; aufgaben: DifAufgabe[]; schichten: number }
export type DifFehler = { fehler: 'zu-wenig-aufgaben' | 'werte' | 'eine-gruppe' | 'zu-wenig-personen' };

/** `x`: Personen × Aufgaben (0/1), `fokus[i]`: Person i gehört zur Fokusgruppe. */
export function dif(x: number[][], fokus: boolean[]): DifErgebnis | DifFehler {
  const n = x.length, J = x[0]?.length ?? 0;
  if (J < 3) return { fehler: 'zu-wenig-aufgaben' };
  if (x.some(r => r.some(v => v !== 0 && v !== 1))) return { fehler: 'werte' };
  const nF = fokus.filter(Boolean).length, nR = n - nF;
  if (nF < 1 || nR < 1) return { fehler: 'eine-gruppe' };
  if (nF < 20 || nR < 20) return { fehler: 'zu-wenig-personen' };
  const roh = x.map(r => r.reduce((a, v) => a + v, 0));
  // Schichten: die Gesamtwerte; bei mehr als MH_MAX_SCHICHTEN Werten benachbarte Werte nach Rang zusammenfassen
  const werte = [...new Set(roh)].sort((a, b) => a - b);
  const schichtVon = new Map<number, number>();
  const k = Math.min(werte.length, MH_MAX_SCHICHTEN);
  werte.forEach((w, i) => schichtVon.set(w, Math.min(k - 1, Math.floor(i * k / werte.length))));
  const aufgaben: DifAufgabe[] = [];
  for (let j = 0; j < J; j++) {
    const tab: number[][][] = Array.from({ length: k }, () => [[0, 0], [0, 0]]);
    let rR = 0, rF = 0;
    for (let i = 0; i < n; i++) {
      const s = schichtVon.get(roh[i]!)!, zeile = fokus[i] ? 1 : 0, spalte = x[i]![j] === 1 ? 0 : 1;
      tab[s]![zeile]![spalte]!++;
      if (x[i]![j] === 1) { if (fokus[i]) rF++; else rR++; }
    }
    const m = mantelHaenszel(tab as Schicht[]);
    const or = m.orMH?.or ?? null, chi2 = m.cmh.chi2, p = m.cmh.p;
    const delta = or !== null && or > 0 ? -2.35 * Math.log(or) : null;
    const klasse: 'A' | 'B' | 'C' | null = delta === null || p === null ? null : p >= 0.05 || Math.abs(delta) < 1 ? 'A' : Math.abs(delta) >= 1.5 ? 'C' : 'B';
    aufgaben.push({ orMH: or, delta, chi2, p, klasse, richtigRef: rR / nR, richtigFokus: rF / nF });
  }
  return { referenz: nR, fokus: nF, aufgaben, schichten: k };
}
