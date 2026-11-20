/**
 * Lehreinheit „Latente Profile“ (B4 Teil 3, 14.11.2026; Fachblatt docs/ausbau/FACHBLATT-B4-PSYCHOLOGIE.md): eine Einheit mit Erklärung (Hilfe-Artikel `latente-profile` in
 * hilfe/artikel-profile.ts), Ausprobieren in der Karte „Gibt es Gruppen in meinen Daten?“ (Block „latente Profile“ unter der Clusteranalyse) und Fragen `lpr-…`
 * (lernen/fragen-profile.ts, Thema `profile`, Zahlen aus scripts/ueben-erwartet-profile.R). Eingebunden in `lernplan.ts`, Pfad „Statistik in der Psychologie“.
 */
import { P } from '../i18n/laufzeit';
import type { Einheit } from './lernplan';

export const EINHEITEN_PROFILE: Einheit[] = [
  { id: 'latente-profile', bereich: 'fach', alltag: P('Gibt es Gruppen mit ähnlichem Muster?', 'Are there groups with a similar pattern?'), fach: P('Latente Profile (Mischung von Normalverteilungen: Gruppenzahl, BIC, Entropie)', 'Latent profiles (mixture of normal distributions: number of groups, BIC, entropy)'),
    hilfe: ['latente-profile', 'frage-cluster'], beispiele: [{ id: 'pinguine', schritt: 2 }], probieren: [], karte: 'cluster',
    fragen: ['lpr-annahme', 'lpr-bic', 'lpr-entropie', 'lpr-art', 'lpr-mehrfach'] }
];
