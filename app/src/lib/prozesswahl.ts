/**
 * Wahl unter „Weitere Wege“ der Karte Mediation (Später, Welle S-D, G14): bedingte und serielle Mediation (PROCESS 7, 14, 6).
 * Gehört zur ZusatzWahl des Blatts (`zus.prozess`, aequirci.ts). Gerechnet wird in lib/prozess.ts. Die vierte Spalte (Lücke l4 der Karte) ist je nach Modell der Moderator W (7, 14)
 * oder der zweite Zwischenschritt M2 (6). Modell 4 (Voreinstellung) ist die einfache Mediation wie bisher.
 */
export type ProzessModell = 4 | 7 | 14 | 6;
export interface ProzessWahl {
  modell: ProzessModell;
  /** Welche Werte von W: 16./50./84. Perzentil (Voreinstellung), Mittelwert ± 1 SD oder eigene Werte */
  regel: 'perzentil' | 'sd' | 'eigen';
  /** eigene Werte, durch Semikolon oder Leerzeichen getrennt (Dezimalzeichen: Komma oder Punkt) */
  eigen: string;
}
export const leereProzess = (): ProzessWahl => ({ modell: 4, regel: 'perzentil', eigen: '' });
export function kopiereProzess(p: Partial<ProzessWahl> | undefined): ProzessWahl {
  const l = leereProzess();
  if (!p) return l;
  return { modell: p.modell === 7 || p.modell === 14 || p.modell === 6 ? p.modell : 4, regel: p.regel === 'sd' || p.regel === 'eigen' ? p.regel : 'perzentil', eigen: typeof p.eigen === 'string' ? p.eigen : '' };
}
/** Ist ein anderes Modell als die einfache Mediation gewählt (dann wird die Wahl am Blatt gespeichert)? */
export const prozessAn = (p: ProzessWahl | undefined): boolean => !!p && p.modell !== 4;

/** Eigene W-Werte aus dem Eingabefeld: durch Semikolon oder Leerzeichen getrennt, Dezimalzeichen Komma oder Punkt. `null`, wenn etwas keine Zahl ist oder weniger als ein, mehr als fünf Werte stehen. */
export function eigeneWerte(text: string): number[] | null {
  const teile = text.trim().split(/[;\s]+/).filter(Boolean);
  if (!teile.length || teile.length > 5) return null;
  const aus: number[] = [];
  for (const t of teile) {
    const x = t.replace(/−/g, '-');
    if (!/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(x)) return null;
    aus.push(Number(x.replace(',', '.')));
  }
  return aus;
}
