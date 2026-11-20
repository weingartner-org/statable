/**
 * Lehreinheit „Wachstumskurven“ (B4 Teil 1, 14.11.2026; Fachblatt docs/ausbau/FACHBLATT-B4-PSYCHOLOGIE.md): eine Einheit mit Erklärung (Hilfe-Artikel `wachstumskurvenmodell` in
 * hilfe/artikel-wachstum.ts), Ausprobieren in der Karte „Verändert sich etwas über mehrere Zeitpunkte?“ (Block „Wachstumskurvenmodell“) und Fragen `lgm-…`
 * (lernen/fragen-wachstum.ts, Thema `wachstum`, Zahlen aus scripts/ueben-erwartet-wachstum.R). Eingebunden in `lernplan.ts`, Pfad „Statistik in der Psychologie“.
 */
import { P } from '../i18n/laufzeit';
import type { Einheit } from './lernplan';

export const EINHEITEN_WACHSTUM: Einheit[] = [
  { id: 'wachstumskurven', bereich: 'vergleichen', alltag: P('Wie verläuft die Veränderung bei jeder Person?', 'How does each person change over time?'), fach: P('Wachstumskurvenmodell (Latent Growth: Achsenabschnitt, Steigung, Passung)', 'Growth curve model (latent growth: intercept, slope, fit)'),
    hilfe: ['wachstumskurvenmodell', 'frage-messwiederholung', 'anova-messwiederholung'], beispiele: [{ id: 'schlafentzug', schritt: 0 }], probieren: [], karte: 'messwiederholung',
    fragen: ['lgm-wk-steigung', 'lgm-wk-streuung', 'lgm-wk-nullpunkt', 'lgm-wk-passung', 'lgm-wk-mehrfach'] }
];
