/**
 * Psychometrie-Einheiten der Stufe 4 „nutzen“ (Fachblatt docs/nutzen/FACHBLATT-STUFE-4-2026-11-09.md): irt-rasch, konfirmatorische-fa, messinvarianz, pfadmodell-sem.
 * Jede Einheit hat die Erklärung (Hilfe-Artikel der Funktion), Selbst rechnen (`rechenaufgaben-nutzen.ts`), Ausprobieren (Beispielschritt in Statable) und Fragen
 * (`fragen-nutzen-psychometrie.ts`, Kennungen `np-…`). Die Einheiten stehen hinten im Pfad „Fragebogen vertiefen“ (`lernplan.ts`). Eingebunden in `lernplan.ts`.
 * Der Abschnitt „Karte der Fragen“ (karte-der-fragen-mds) gehört zur bestehenden Einheit `skala-dimension-omega` und steht dort in `lernplan.ts`.
 */
import { P } from '../i18n/laufzeit';
import type { Einheit } from './lernplan';

export const EINHEITEN_NUTZEN: Einheit[] = [
  { id: 'irt-rasch', bereich: 'messen', alltag: P('Wie schwer ist jede Aufgabe, wie gut trennt sie, und ist sie für alle Gruppen fair?', 'How hard is each task, how well does it separate, and is it fair to all groups?'), fach: P('Item-Response-Theorie: Rasch-Modell, 2PL-Modell, Stufenmodell (GRM) und DIF', 'Item response theory: Rasch model, 2PL model, graded response model (GRM) and DIF'),
    hilfe: ['rasch-modell', 'zwei-pl-modell', 'stufenmodell-grm', 'faire-aufgaben-dif', 'trennschaerfe', 'mantel-haenszel'],
    rechnen: ['irt-wahrscheinlichkeit'], beispiele: [{ id: 'aggression', schritt: 0 }], probieren: [], karte: 'skala',
    fragen: ['np-ir-trennschaerfe', 'np-ir-rasch-2pl', 'np-ir-stufen', 'np-ir-dif', 'np-ir-mehrfach'] },
  { id: 'konfirmatorische-fa', bereich: 'messen', alltag: P('Stimmt meine Vermutung, welche Fragen zusammengehören, und wie zuverlässig misst die Skala?', 'Is my idea right which questions belong together, and how reliably does the scale measure?'), fach: P('Konfirmatorische Faktorenanalyse (CFA) und McDonalds Omega', 'Confirmatory factor analysis (CFA) and McDonald\'s omega'),
    hilfe: ['konfirmatorische-faktorenanalyse-omega', 'cfa', 'omega', 'fit-indizes'],
    rechnen: ['omega-ladungen'], beispiele: [{ id: 'pruefungsangst', schritt: 1 }], probieren: [], karte: 'faktor',
    fragen: ['np-cf-omega-alpha', 'np-cf-cfa-efa', 'np-cf-passung', 'np-cf-knopf'] },
  { id: 'messinvarianz', bereich: 'messen', alltag: P('Messen meine Fragen in allen Gruppen dasselbe?', 'Do my questions measure the same in all groups?'), fach: P('Messinvarianz (konfigural, metrisch, skalar; ΔCFI)', 'Measurement invariance (configural, metric, scalar; ΔCFI)'),
    hilfe: ['messinvarianz', 'fit-indizes', 'konfirmatorische-faktorenanalyse-omega'],
    rechnen: ['invarianz-cfi'], beispiele: [{ id: 'pruefungsangst', schritt: 1 }], probieren: [], karte: 'faktor',
    fragen: ['np-mi-stufe', 'np-mi-cfi', 'np-mi-teilweise', 'np-mi-vorher'] },
  { id: 'pfadmodell-sem', bereich: 'messen', alltag: P('Wer wirkt auf wen, und was läuft über einen Umweg?', 'Who affects whom, and what runs via a detour?'), fach: P('Pfadmodell und Strukturgleichungsmodell (SEM): indirekter und totaler Effekt', 'Path model and structural equation model (SEM): indirect and total effect'),
    hilfe: ['pfadmodell-sem', 'fit-indizes', 'bootstrap-intervalle'],
    rechnen: ['pfad-indirekt'], beispiele: [{ id: 'arbeitsklima', schritt: 1 }], probieren: [], karte: 'vorhersage',
    fragen: ['np-se-indirekt', 'np-se-gesamt', 'np-se-bootstrap', 'np-se-ursache'] },
  // Stufe 6.6 (09.11.2026): Testhalbierung (Spearman-Brown) und Retest-Reliabilität; Beispiel koerperbild-skala, Schritt 1 (Testhalbierung)
  { id: 'testhalbierung-retest', bereich: 'messen', alltag: P('Wie zuverlässig ist die Skala, wenn man sie halbiert, und bleibt sie bei Wiederholung gleich?', 'How reliable is the scale when it is cut in half, and does it stay the same when repeated?'), fach: P('Testhalbierung (Split-Half, Spearman-Brown) und Retest-Reliabilität (ICC, r_tt)', 'Split-half reliability (Spearman-Brown) and test-retest reliability (ICC, r_tt)'),
    hilfe: ['testhalbierung', 'retest-reliabilitaet', 'spearman-brown-formel', 'guttman-split-half', 'retest-korrelation', 'reliabilitaet', 'icc', 'reliable-change-index'],
    rechnen: ['spearman-brown'], beispiele: [{ id: 'koerperbild-skala', schritt: 1 }], probieren: [], karte: 'skala',
    fragen: ['np-th-hochrechnen', 'np-th-reihenfolge', 'np-th-retest-icc', 'np-th-rtt-rci'] }
];
