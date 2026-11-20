/**
 * Üben: Psychologie, zweites Paket (Stufe 6.3 des Vorhabens „nutzen“, Johannes 09.11.2026). Kennungen `psy2-…`.
 *  - Fallreihen zu den acht neuen Psychologie-Beispielen (`psy2-<kurz>-…`, je Reihe 4 bis 6 Fragen mit Ergebnistabelle): Teil a, b, c in `fragen-psychologie-2-a/b/c.ts`.
 *    ALLE Zahlen kommen aus app/src/lib/testdaten/ueben-erwartet-psych.json (R, vom Prüfer, scripts/ueben-erwartet-psych.R); der Wächter fragen-psychologie-2.test.ts prüft das.
 *  - Begriffsfragen ohne neue Zahlen (`psy2-be-…`) und zu offenen Antworten (`psy2-oa-…`): `fragen-psychologie-2-begriffe.ts`.
 * Das Thema ist verborgen (wie „beispiele“): Die Fragen stehen in den Einheiten des Lernplans (Pfade „Statistik in der Psychologie“ und „Fachvertiefung Bildung“), nicht in der Themenliste.
 */
import type { Frage, ThemaModul } from './fragen';
import { FAELLE_A, FRAGEN_A } from './fragen-psychologie-2-a';
import { FAELLE_B, FRAGEN_B } from './fragen-psychologie-2-b';
import { FAELLE_C, FRAGEN_C } from './fragen-psychologie-2-c';
import { FRAGEN_BEGRIFFE } from './fragen-psychologie-2-begriffe';
export { PSY_JSON } from './fragen-psychologie-2-bau';

/** Fallreihe → Beispiel (der Wächter holt damit die Sollwerte). */
export const PSY2_FALL: Record<string, string> = {
  'psy2-fe': 'freunde-erinnern', 'psy2-an': 'anorexie-therapie', 'psy2-sa': 'studierfaehigkeit', 'psy2-ko': 'koerperbild-skala',
  'psy2-mod': 'diskriminierung-garcia', 'psy2-med': 'diskriminierung-garcia', 'psy2-fr': 'freiwilligkeit', 'psy2-bf': 'persoenlichkeit-bfi', 'psy2-wo': 'woerter-personen-reize'
};

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = { ...FAELLE_A, ...FAELLE_B, ...FAELLE_C };

/** Fragen aus den Fallreihen (mit Tabelle) und Begriffsfragen. */
export const FRAGEN_FAELLE: Frage[] = [...FRAGEN_A, ...FRAGEN_B, ...FRAGEN_C];
export const FRAGEN: Frage[] = [...FRAGEN_FAELLE, ...FRAGEN_BEGRIFFE];
