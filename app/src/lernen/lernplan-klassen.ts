/**
 * Lehreinheit „Latente Klassen“ (B4 Teil 3b-3, 14.11.2026; Fachblatt docs/ausbau/FACHBLATT-B4-PSYCHOLOGIE.md): eine Einheit mit Erklärung (Hilfe-Artikel `latente-klassen` in
 * hilfe/artikel-klassen.ts), Ausprobieren in der Karte „Messen meine Fragen dasselbe?“ (Block „latente Klassen“ unter der Skalen-Auswertung) und Fragen `lkl-…`
 * (lernen/fragen-klassen.ts, Thema `klassen`, Zahlen aus scripts/ueben-erwartet-klassen.R). Eingebunden in `lernplan.ts`, Pfad „Statistik in der Psychologie“.
 */
import { P } from '../i18n/laufzeit';
import type { Einheit } from './lernplan';

export const EINHEITEN_KLASSEN: Einheit[] = [
  { id: 'latente-klassen', bereich: 'fach', alltag: P('Gibt es Gruppen mit ähnlichen Antworten?', 'Are there groups with similar answers?'), fach: P('Latente Klassen (Latent Class Analysis: Klassenzahl, BIC, Entropie)', 'Latent classes (latent class analysis: number of classes, BIC, entropy)'),
    hilfe: ['latente-klassen', 'latente-profile'], beispiele: [], probieren: [], karte: 'skala',
    fragen: ['lkl-annahme', 'lkl-bic', 'lkl-parameter', 'lkl-entropie', 'lkl-klasse-lesen', 'lkl-mehrfach'] }
];
