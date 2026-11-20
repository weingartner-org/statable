/** Befehle (Syntax), die auf der Befehle-Seite stehen, und ihre Ausgaben. */
import type { OutputItem } from '../engine/types';
import type { BalkenQuelle } from './balkenquelle';

export const befehle = $state({
  text: '' as string,
  name: '' as string,
  laeufe: [] as { id: number; syntax: string; zeilen?: number[]; items: OutputItem[]; ms: number; zeit: number; /** Reiter, der aus diesem Lauf entstanden ist (03.11.) */ blattId?: string; /** Nachttest 24.10.: was für PSPP angeglichen wurde (lib/spssangleich.ts) */ angeglichen?: import('./spssangleich').Angleich[]; /** Später S-F2 (E): Bild „Mittelwert nach Gruppe“ zum Baustein „Nach Gruppen erkunden“, mit den Daten zur Zeit des Laufs */ balken?: { y: string; g: string; quelle: BalkenQuelle } }[]
});
export function merkeSyntax(text: string, name: string) { befehle.text = text.replace(/\r/g, ''); befehle.name = name; }
