/**
 * Lehreinheit zum Papierbogen (E8 Teil 2c, 15.11.2026): `papierbogen-scannen` im Pfad „Daten erheben“, Erklärung in hilfe/artikel-papierboegen.ts (`papierbogen-scannen`),
 * Fragen `eh-pb-…` (lernen/fragen-papierbogen.ts, Thema `erheben`). Kein Rechenbeispiel aus Daten: Es geht um Eigenschaften des Verfahrens.
 */
import { P } from '../i18n/laufzeit';
import type { Einheit } from './lernplan';

export const EINHEITEN_PAPIERBOGEN: Einheit[] = [
  { id: 'papierbogen-scannen', bereich: 'daten', alltag: P('Wie lese ich Papierbögen mit dem Scanner ein?', 'How do I read paper questionnaires in with a scanner?'), fach: P('Antwortbogen, Eckmarken, optische Markierungserkennung (optical mark recognition)', 'Answer sheet, corner marks, optical mark recognition'),
    hilfe: ['papierbogen-scannen', 'papierboegen-eingeben'], beispiele: [], probieren: [], ausprobieren: [],
    fragen: ['eh-pb-unsicher', 'eh-pb-kennleiste', 'eh-pb-seiten', 'eh-pb-offen', 'eh-pb-mehrere', 'eh-pb-stichprobe'] }
];
