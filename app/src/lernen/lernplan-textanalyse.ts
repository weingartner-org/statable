/**
 * Lehreinheit zur Textanalyse (B3 Teil 1c, 14.11.2026): `woerter-zaehlen` im Pfad „Interviews und qualitative Auswertung“, Erklärung in hilfe/artikel-textanalyse.ts,
 * Fragen `eh-ta-…` (lernen/fragen-textanalyse.ts, Thema `erheben`), Ausprobieren in der Ansicht „Wörter zählen“ des Kodier-Arbeitsplatzes (`#kodieren/textanalyse`).
 */
import { P } from '../i18n/laufzeit';
import type { Einheit } from './lernplan';

export const EINHEITEN_TEXTANALYSE: Einheit[] = [
  { id: 'woerter-zaehlen', bereich: 'fach', alltag: P('Welche Wörter kommen in meinen Texten vor, und was sagt das?', 'Which words occur in my texts, and what does that say?'), fach: P('Wörter zählen (Wortliste, Stoppwörter, Schlüsselwort im Kontext, Wörterbuch, typische Wörter)', 'Counting words (word list, stop words, key word in context, dictionary, key words)'),
    hilfe: ['ta-woerter-zaehlen', 'eh-kodieren-ansichten', 'eh-aehnliche-stellen'], beispiele: [], probieren: [],
    ausprobieren: [{ adresse: '#kodieren/textanalyse', titel: P('Kodieren: Wörter zählen (Beispielprojekt laden, Wortliste ansehen, „Arbeit“ im Kontext suchen)', 'Coding: count words (load the example project, look at the word list, search "work" in context)') }],
    fragen: ['eh-ta-stopp', 'eh-ta-anteil', 'eh-ta-p', 'eh-ta-kwic', 'eh-ta-woerterbuch', 'eh-ta-stern'] }
];
