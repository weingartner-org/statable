/**
 * Lernpfad „Varianzanalyse vertiefen“ (Field-Stufe 3, 05.11.2026): sechs neue Einheiten und der Pfad. Jede neue Einheit hat Erklärung (Hilfe-Artikel `vv-…`),
 * Selbst rechnen (4 Schritte, `rechenaufgaben-vv.ts`), Ausprobieren (Beispiel in Statable öffnen) und sieben Fragen (`fragen-varianzanalyse-vertiefen.ts`). Eingebunden in `lernplan.ts`.
 */
import { P } from '../i18n/laufzeit';
import type { Einheit, Pfad } from './lernplan';

export const EINHEITEN_VV: Einheit[] = [
  { id: 'kontraste-statt-posthoc', bereich: 'vergleichen', alltag: P('Lässt sich eine gezielte Frage statt aller Paare prüfen?', 'Can a targeted question be tested instead of all pairs?'), fach: P('Geplante Vergleiche (Kontraste) statt Post-hoc-Tests', 'Planned comparisons (contrasts) instead of post-hoc tests'),
    hilfe: ['vv-kontraste', 'geplanter-kontrast', 'kontrast', 'kontrastgewicht', 'kontrastwert', 'orthogonal', 'post-hoc', 'scheffe'],
    rechnen: ['kontrast-rechnen'], beispiele: [{ id: 'nitrat', schritt: 1 }], probieren: [], karte: 'gruppen',
    fragen: ['vv-ko-gewichte', 'vv-ko-wert', 'vv-ko-niveau', 'vv-ko-orthogonal', 'vv-ko-anzahl', 'vv-ko-se', 'vv-ko-mehrfach'] },
  { id: 'trend-ueber-stufen', bereich: 'vergleichen', alltag: P('Steigt der Mittelwert gleichmäßig mit den Stufen, oder biegt er sich?', 'Does the mean rise evenly with the levels, or does it bend?'), fach: P('Trendanalyse (linear, quadratisch)', 'Trend analysis (linear, quadratic)'),
    hilfe: ['vv-trend', 'trendanalyse', 'linearer-trend', 'quadratischer-trend', 'kontrast', 'orthogonal'],
    rechnen: ['trend-kontrast'], beispiele: [{ id: 'nitrat', schritt: 1 }], probieren: [], karte: 'gruppen',
    fragen: ['vv-tr-gewichte', 'vv-tr-wert', 'vv-tr-ordnung', 'vv-tr-lesen', 'vv-tr-anteil', 'vv-tr-abstand', 'vv-tr-mehrfach'] },
  { id: 'wechselwirkung-differenz', bereich: 'vergleichen', alltag: P('Wie rechne ich aus, ob der Effekt von einer zweiten Größe abhängt?', 'How do I calculate whether the effect depends on a second variable?'), fach: P('Wechselwirkung als Differenz der Differenzen (2×2-Tabelle)', 'Interaction as the difference of the differences (2×2 table)'),
    hilfe: ['vv-wechselwirkung', 'wechselwirkung', 'differenz-der-differenzen', 'interaktion', 'haupteffekt', 'faktor', 'faktorstufe'],
    rechnen: ['wechselwirkung-differenz'], beispiele: [{ id: 'lesetraining', schritt: 4 }, { id: 'anker-effekt', schritt: 3 }], probieren: [], karte: 'gruppen',
    fragen: ['vv-wi-rechnen', 'vv-wi-parallel', 'vv-wi-haupt', 'vv-wi-kreuz', 'vv-wi-null', 'vv-wi-mittel', 'vv-wi-mehrfach'] },
  { id: 'einfache-effekte', bereich: 'vergleichen', alltag: P('Was bringt ein Faktor in jeder Stufe des anderen?', 'What does a factor bring at each level of the other?'), fach: P('Einfache Effekte (Haupteffekt bei Wechselwirkung nicht deuten)', 'Simple effects (do not interpret the main effect with an interaction)'),
    hilfe: ['vv-einfache-effekte', 'einfache-effekte', 'einfacher-haupteffekt', 'haupteffekt', 'wechselwirkung', 'holm'],
    rechnen: ['einfache-effekte-rechnen'], beispiele: [{ id: 'lesetraining', schritt: 4 }], probieren: [], karte: 'gruppen',
    fragen: ['vv-ee-wann', 'vv-ee-rechnen', 'vv-ee-haupt', 'vv-ee-se', 'vv-ee-mehrere', 'vv-ee-t', 'vv-ee-mehrfach'] },
  { id: 'sphaerizitaet-verstehen', bereich: 'vergleichen', alltag: P('Streuen die Unterschiede zwischen den Zeitpunkten ähnlich stark?', 'Do the differences between the points in time vary about equally?'), fach: P('Sphärizität (Varianz der Differenzen, Epsilon-Korrektur statt Mauchly-Entscheid)', 'Sphericity (variance of the differences, epsilon correction instead of Mauchly decision)'),
    hilfe: ['vv-sphaerizitaet', 'varianz-der-differenzen', 'sphaerizitaet', 'mauchly', 'epsilon', 'greenhouse-geisser-korrektur', 'huynh-feldt'],
    rechnen: ['sphaerizitaet-differenzen'], beispiele: [{ id: 'lesetraining', schritt: 2 }], probieren: [], karte: 'messwiederholung',
    fragen: ['vv-sp-was', 'vv-sp-ab', 'vv-sp-rechnen', 'vv-sp-eps1', 'vv-sp-freiheit', 'vv-sp-mauchly', 'vv-sp-mehrfach'] },
  { id: 'kontrollgruppe-dunnett', bereich: 'vergleichen', alltag: P('Wann genügt der Vergleich mit einer Kontrollgruppe, und wie groß wird der Familienfehler?', 'When is a comparison with a control group enough, and how large does the family error get?'), fach: P('Dunnett-Test und Familienfehlerrate', 'Dunnett test and family-wise error rate'),
    hilfe: ['vv-dunnett', 'dunnett', 'kontrollgruppe', 'familienfehlerrate', 'alpha-kumulierung', 'tukey', 'bonferroni'],
    rechnen: ['familienfehler-dunnett'], beispiele: [{ id: 'nitrat', schritt: 1 }], probieren: [], karte: 'gruppen',
    fragen: ['vv-du-wann', 'vv-du-paare', 'vv-du-kontrolle', 'vv-du-formel', 'vv-du-ergebnis', 'vv-du-vorab', 'vv-du-mehrfach'] }
];

export const PFAD_VV: Pfad = { id: 'varianzanalyse-vertiefen', name: P('Varianzanalyse vertiefen', 'Deepening the analysis of variance'), einheiten: [
  'anova-posthoc', 'mehrfach-testen', 'kontraste-statt-posthoc', 'trend-ueber-stufen', 'kontrollgruppe-dunnett', 'zweifaktoriell-versuchsplan', 'wechselwirkung-differenz', 'einfache-effekte',
  'messwiederholung', 'sphaerizitaet-verstehen', 'kovarianzanalyse', 'effektstaerke', 'gruppenvergleich-ist-regression'] };
