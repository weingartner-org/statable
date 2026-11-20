/**
 * Die Eingaben des Raten-Rechners (Reiter „Verstehen“, Kachel „Aus Kennzahlen rechnen“, Wahl „Eine Rate“). Zustand nur im Modul: bleibt beim Wechsel zur Hilfe und zurück erhalten,
 * landet nie in einem Projekt. Texte (Namen der Gruppen) setzt die Oberfläche beim ersten Öffnen in der gewählten Sprache.
 */
import type { Zeiteinheit } from './raten';

export interface RatenZeile { name: string; x: string; t: string }
export const rz = $state({
  gestartet: false,
  gruppen: [] as RatenZeile[],
  einheit: 'jahre' as Zeiteinheit,
  je: 1000,
  vergleich: 0,
  niveau: 0.95
});
