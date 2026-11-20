/**
 * Lehreinheit zur Q-Methode (B3 Teil 3c, 15.11.2026): `q-methode-sichtweisen` im Pfad „Daten erheben“, Erklärung in hilfe/artikel-q-methode.ts,
 * Fragen `eh-qm-…` (lernen/fragen-qmethode.ts, Thema `erheben`). Kein Beispiel zum Ausprobieren: Es braucht eine eigene Datei (Personen in Zeilen, Aussagen in Spalten).
 */
import { P } from '../i18n/laufzeit';
import type { Einheit } from './lernplan';

export const EINHEITEN_QMETHODE: Einheit[] = [
  { id: 'q-methode-sichtweisen', bereich: 'fach', alltag: P('Welche Sichtweisen gibt es?', 'Which viewpoints are there?'), fach: P('Q-Methode (Q-Sort, Faktorenanalyse über Personen, Ladung, z-Wert, Faktor-Q-Sort)', 'Q methodology (Q sort, factor analysis across people, loading, z score, factor Q sort)'),
    hilfe: ['q-methode'], beispiele: [], probieren: [], ausprobieren: [],
    fragen: ['eh-qm-personen', 'eh-qm-schwelle', 'eh-qm-zahl', 'eh-qm-gegensatz', 'eh-qm-gemeinsam', 'eh-qm-haeufig'] }
];
