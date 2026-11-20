/**
 * Lehreinheit zur Delphi-Befragung (B3 Teil 2c, 15.11.2026): `delphi-befragung` im Pfad „Daten erheben“, Erklärung in hilfe/artikel-delphi.ts,
 * Fragen `eh-dl-…` (lernen/fragen-delphi.ts, Thema `erheben`). Kein Beispiel zum Ausprobieren: Es braucht eine eigene Datei (Fachleute in Zeilen, Aussagen in Spalten).
 */
import { P } from '../i18n/laufzeit';
import type { Einheit } from './lernplan';

export const EINHEITEN_DELPHI: Einheit[] = [
  { id: 'delphi-befragung', bereich: 'fach', alltag: P('Sind sich die Fachleute einig?', 'Do the experts agree?'), fach: P('Delphi-Befragung (Konsensregel, Quartilsabstand, Kendalls W, Runden)', 'Delphi survey (consensus rule, interquartile range, Kendall\'s W, rounds)'),
    hilfe: ['delphi'], beispiele: [], probieren: [], ausprobieren: [],
    fragen: ['eh-dl-regel', 'eh-dl-iqr', 'eh-dl-einig', 'eh-dl-w', 'eh-dl-fehlend', 'eh-dl-runden'] }
];
