/**
 * Effektstärke sehen (Verstehen, 23.10.2026): zwei Normalverteilungen mit gleicher Streuung, die um d Standardabweichungen auseinanderliegen.
 *   Überlappung OVL = 2 Φ(−|d|/2); Cohens U3 = Φ(d) (Anteil der zweiten Gruppe über dem Mittel der ersten); Wahrscheinlichkeit der Überlegenheit CL = Φ(d/√2)
 *   (eine zufällig gezogene Person der zweiten Gruppe hat einen höheren Wert als eine der ersten); Personen je Gruppe für 80 % Teststärke (zweiseitig, α = 0,05) über die nichtzentrale t-Verteilung ist hier nicht gerechnet,
 *   sondern die Näherung n ≈ 2 (z₁₋α/₂ + z₀,₈)² / d² (Normalnäherung).
 * Sollwerte: Cohen (1988), Tabellen der Überlappung; siehe effektbild.test.ts.
 */
import { links } from './verteilungen';

const phi = (x: number) => links({ art: 'normal', mu: 0, sigma: 1 }, x);
export const ueberlappung = (d: number) => 2 * phi(-Math.abs(d) / 2);
export const u3 = (d: number) => phi(d);
export const ueberlegenheit = (d: number) => phi(d / Math.SQRT2);
/** Personen je Gruppe (Normalnäherung) für 80 % Teststärke bei α = 0,05 zweiseitig; Unendlich bei d = 0. */
export const personenJeGruppe = (d: number) => (Math.abs(d) < 1e-9 ? Infinity : Math.ceil(2 * (1.959963984540054 + 0.8416212335729143) ** 2 / (d * d)));
/** Einordnung nach Cohen (1988): 0 = kleiner als 0,2, 1 = klein, 2 = mittel, 3 = groß, 4 = sehr groß (ab 1,2 nach Sawilowsky 2009). Nur eine Konvention. */
export const einordnungD = (d: number): 0 | 1 | 2 | 3 | 4 => (Math.abs(d) < 0.2 ? 0 : Math.abs(d) < 0.5 ? 1 : Math.abs(d) < 0.8 ? 2 : Math.abs(d) < 1.2 ? 3 : 4);
