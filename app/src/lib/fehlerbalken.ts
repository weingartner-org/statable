/**
 * Fehlerbalken für Messungen an denselben Personen (Messwiederholung, Vorher-Nachher): Wahl zwischen 95 %-Intervall, Standardfehler, Standardabweichung
 * und dem Intervall nach Cousineau (2005) mit Morey-Korrektur (2008). Das letzte nimmt aus jeder Messung die Unterschiede zwischen den Personen heraus
 * (jede Person wird auf ihren eigenen Durchschnitt gelegt) und zeigt so, wie sicher die Unterschiede ZWISCHEN den Messungen sind.
 * Nur zum Ansehen, nicht zum Testen: der Test der Messwiederholung rechnet anders (Test: fehlerbalken.test.ts gegen R, docs/fachblaetter/sollwerte/field-stufe2.json).
 */
import { tQuantil } from './verteilung';

export type FehlerArt = 'ki' | 'se' | 'sd' | 'cm';
export interface Balken { n: number; mittel: number[]; /** halbe Länge des Balkens je Messung */ halb: number[]; lo: number[]; hi: number[]; se: number[]; sd: number[] }

const mw = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const sd = (v: number[]) => { const m = mw(v); return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)); };

/** `personen[p][j]`: Wert der Person p bei Messung j; nur vollständige Zeilen (keine Lücken). `null`, wenn weniger als 3 Personen oder keine zwei Messungen. */
export function balkenWiederholt(personen: number[][], art: FehlerArt): Balken | null {
  const voll = personen.filter(z => z.length > 0 && z.every(v => Number.isFinite(v)));
  const n = voll.length, J = voll[0]?.length ?? 0;
  if (n < 3 || J < 2 || voll.some(z => z.length !== J)) return null;
  const spalte = (j: number, z: number[][] = voll) => z.map(r => r[j]!);
  const mittel = Array.from({ length: J }, (_, j) => mw(spalte(j)));
  const sdRoh = mittel.map((_, j) => sd(spalte(j))), seRoh = sdRoh.map(s => s / Math.sqrt(n));
  const t = tQuantil(0.975, n - 1);
  let se = seRoh, halb: number[];
  if (art === 'cm') {
    const gross = mw(voll.flat());
    const norm = voll.map(r => { const m = mw(r); return r.map(v => v - m + gross); });
    se = mittel.map((_, j) => (sd(spalte(j, norm)) / Math.sqrt(n)) * Math.sqrt(J / (J - 1)));
    halb = se.map(s => t * s);
  } else if (art === 'ki') halb = seRoh.map(s => t * s);
  else if (art === 'se') halb = seRoh;
  else halb = sdRoh;
  return { n, mittel, halb, lo: mittel.map((m, j) => m - halb[j]!), hi: mittel.map((m, j) => m + halb[j]!), se, sd: sdRoh };
}
