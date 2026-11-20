/**
 * Lehreinheit zum Concept Mapping (B3 Teil 4c, 15.11.2026): `concept-mapping-karte` im Pfad „Daten erheben“, Erklärung in hilfe/artikel-concept-mapping.ts,
 * Fragen `eh-cm-…` (lernen/fragen-conceptmap.ts, Thema `erheben`). Kein Beispiel zum Ausprobieren: Es braucht eine eigene Datei (Personen in Zeilen, Aussagen in Spalten).
 */
import { P } from '../i18n/laufzeit';
import type { Einheit } from './lernplan';

export const EINHEITEN_CONCEPTMAP: Einheit[] = [
  { id: 'concept-mapping-karte', bereich: 'fach', alltag: P('Welche Aussagen gehören zusammen?', 'Which statements belong together?'), fach: P('Concept Mapping (Sortierung in Stapel, Ähnlichkeitsmatrix, Karte, Ward-Gruppen)', 'Concept mapping (sorting into piles, similarity matrix, map, Ward groups)'),
    hilfe: ['concept-mapping'], beispiele: [], probieren: [], ausprobieren: [],
    fragen: ['eh-cm-zusammen', 'eh-cm-abstand', 'eh-cm-guete', 'eh-cm-gruppenzahl', 'eh-cm-achsen', 'eh-cm-benennen'] }
];
