/**
 * Lehreinheiten zur Forschungsplanung (V2 Teil 3, 14.11.2026; Fachblatt docs/ausbau/FACHBLATT-V2-FORSCHUNGSPLANUNG.md, Abschnitt 6): `datenmanagementplan` und
 * `praeregistrierung-planen` im Pfad „Daten erheben“, Erklärung in hilfe/artikel-planung.ts, Fragen `eh-pl-…` (lernen/fragen-planung.ts, Thema `erheben`),
 * Ausprobieren auf der Seite `#planung`. Die allgemeine Vorregistrierung bleibt im Pfad „Sauber forschen“ (Einheit `vorregistrierung`).
 */
import { P } from '../i18n/laufzeit';
import type { Einheit } from './lernplan';

export const EINHEITEN_PLANUNG: Einheit[] = [
  { id: 'datenmanagementplan', bereich: 'planen', alltag: P('Was geschieht mit meinen Daten, bevor, während und nachdem ich forsche?', 'What happens to my data before, during and after my research?'), fach: P('Datenmanagementplan (data management plan, FAIR)', 'Data management plan (DMP, FAIR)'),
    hilfe: ['dmp-planen', 'eh-anonym-pseudonym', 'eh-einwilligung-prozess'], beispiele: [], probieren: [],
    ausprobieren: [{ adresse: '#planung', titel: P('Studie planen: Datenmanagementplan', 'Plan the study: data management plan') }],
    fragen: ['eh-pl-dmp-wann', 'eh-pl-dmp-daten', 'eh-pl-dmp-pseudo', 'eh-pl-dmp-fair'] },
  { id: 'praeregistrierung-planen', bereich: 'planen', alltag: P('Wie halte ich Hypothesen und Auswertung vorab fest?', 'How do I fix hypotheses and analysis beforehand?'), fach: P('Präregistrierung (preregistration: bestätigend und erkundend)', 'Preregistration (confirmatory and exploratory)'),
    hilfe: ['prereg-planen', 'sf-vorregistrierung', 'forschungsfreiheitsgrade'], beispiele: [], probieren: [],
    ausprobieren: [{ adresse: '#planung', titel: P('Studie planen: Präregistrierung', 'Plan the study: preregistration') }],
    fragen: ['eh-pl-pr-trennen', 'eh-pl-pr-flexibel', 'eh-pl-pr-stempel', 'eh-pl-pr-grenze'] }
];
