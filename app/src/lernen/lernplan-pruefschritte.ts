/**
 * Usability Stufe 6a (10.11.2026): vier Prüfschritte für eine Fragebogen-Skala, in der Reihenfolge Inhalt → Faktorenanalyse → Reliabilitätsanalyse → alles zusammen
 * (Wunsch der Lehrenden). Jede Einheit ist ein eigener, für sich lösbarer Schritt; Fragen in `fragen-pruefschritte.ts` (Kennungen `pm-…`).
 * Umpolen gehört erst in die Reliabilitätsanalyse: für die Faktorenanalyse ist es nicht nötig, für Alpha und den Summenwert schon.
 * Eingetragen in `lernplan.ts` (Bereich `messen`, Pfad `fragebogen`).
 */
import { P } from '../i18n/laufzeit';
import type { Einheit } from './lernplan';

export const EINHEITEN_PM: Einheit[] = [
  { id: 'pruefschritt-inhalt', bereich: 'messen', alltag: P('Passt jede Frage nach ihrem Wortlaut zu meinem Konstrukt?', 'Does each question fit my construct by its wording?'), fach: P('Prüfschritt 1: Inhalt (Inhaltsvalidität), Fragen den Konstrukten zuordnen', 'Checking step 1: content (content validity), assigning questions to constructs'),
    hilfe: ['inhaltsvaliditaet', 'konstrukt', 'item'],
    beispiele: [], probieren: [],
    fragen: ['pm-in-zuordnen', 'pm-in-gegenlaeufig', 'pm-in-beide', 'pm-in-weder', 'pm-in-warum', 'pm-in-mehrfach'] },
  { id: 'pruefschritt-faktorenanalyse', bereich: 'messen', alltag: P('Welche Fragen hängen zusammen, und passt das zu meinen Konstrukten?', 'Which questions belong together, and does that fit my constructs?'), fach: P('Prüfschritt 2: Faktorenanalyse (Ladungen über einer Grenze, negative Ladung, Doppelladung, Komponente ohne Konstrukt)', 'Checking step 2: factor analysis (loadings above a limit, negative loading, double loading, component without a construct)'),
    hilfe: ['ladung', 'faktorenanalyse', 'hauptkomponenten', 'frage-faktor'],
    beispiele: [{ id: 'persoenlichkeit-bfi', schritt: 1 }], probieren: [], karte: 'faktor',
    fragen: ['pm-fa-grenze', 'pm-fa-negativ', 'pm-fa-zuordnen', 'pm-fa-doppel', 'pm-fa-ohne-konstrukt', 'pm-fa-ohne-ladung', 'pm-fa-mehrfach'] },
  { id: 'pruefschritt-reliabilitaet', bereich: 'messen', alltag: P('Messen die Fragen einer Skala verlässlich zusammen?', 'Do the questions of a scale measure reliably together?'), fach: P('Prüfschritt 3: Reliabilitätsanalyse (Umpolen, Cronbachs Alpha, Alpha, wenn Item gelöscht)', 'Checking step 3: reliability analysis (reverse-coding, Cronbach\'s alpha, alpha if item deleted)'),
    hilfe: ['cronbach-alpha', 'umpolen'],
    beispiele: [], probieren: ['probieren/alpha'], karte: 'skala',
    fragen: ['pm-rel-vorbereiten', 'pm-rel-roh', 'pm-rel-ohne', 'pm-rel-grenze', 'pm-rel-gereizt', 'pm-rel-mehrfach'] },
  { id: 'pruefschritte-zusammen', bereich: 'messen', alltag: P('Welche Fragen behalte ich, und welchen Wert bekommt jede Person?', 'Which questions do I keep, and what score does each person get?'), fach: P('Prüfschritt 4: alles zusammen (Inhalt, Ladung und Alpha abwägen; behalten, umpolen oder entfernen; Skalenwert als Mittelwert)', 'Checking step 4: everything together (weighing content, loading and alpha; keep, reverse-code or remove; scale score as the mean)'),
    hilfe: ['skalenwert', 'faktorwert', 'ladung', 'cronbach-alpha'],
    beispiele: [{ id: 'persoenlichkeit-bfi', schritt: 1 }], probieren: [], karte: 'skala',
    fragen: ['pm-ges-a1', 'pm-ges-e2', 'pm-ges-c2', 'pm-ges-n4', 'pm-ges-wert', 'pm-ges-mehrfach'] }
];
