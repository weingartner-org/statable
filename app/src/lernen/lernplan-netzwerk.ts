/**
 * Lehreinheit „Netzwerkanalyse“ (B4 Teil 2, 14.11.2026; Fachblatt docs/ausbau/FACHBLATT-B4-PSYCHOLOGIE.md): eine Einheit mit Erklärung (Hilfe-Artikel `netzwerkanalyse` in
 * hilfe/artikel-netzwerk.ts), Ausprobieren in der Karte „Wie hängen die Messwerte zusammen?“ (Block „Partialkorrelationsnetz“ unter der Korrelationsmatrix) und Fragen `nw-…`
 * (lernen/fragen-netzwerk.ts, Thema `netzwerk`, Zahlen aus scripts/ueben-erwartet-netzwerk.R). Eingebunden in `lernplan.ts`, Pfad „Statistik in der Psychologie“.
 */
import { P } from '../i18n/laufzeit';
import type { Einheit } from './lernplan';

export const EINHEITEN_NETZWERK: Einheit[] = [
  { id: 'netzwerkanalyse', bereich: 'zusammenhang', alltag: P('Welche Variablen hängen direkt zusammen?', 'Which variables are directly related?'), fach: P('Netzwerkanalyse (Partialkorrelationsnetz: Kanten, Stärke, Bootstrap)', 'Network analysis (partial correlation network: edges, strength, bootstrap)'),
    hilfe: ['netzwerkanalyse', 'korrelationsmatrix', 'frage-partialkorrelation', 'mehrfaches-testen'], beispiele: [], probieren: [], karte: 'korrmatrix',
    fragen: ['nw-kante', 'nw-indirekt', 'nw-holm', 'nw-staerke', 'nw-mehrfach'] }
];
