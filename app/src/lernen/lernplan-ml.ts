/**
 * Lernpfad „Maschinelles Lernen verstehen (Machine Learning)“ (V5 Teil 2, 14.11.2026; Fachblatt docs/ausbau/FACHBLATT-V5-MASCHINELLES-LERNEN.md):
 * vier neue Einheiten mit Erklärung (Hilfe-Artikel `ml-…` in hilfe/artikel-ml.ts), Ausprobieren im Lernlabor-Reiter „Vorhersagen“ und Fragen `ml-…`
 * (lernen/fragen-ml.ts, Thema `ml`, Zahlen aus scripts/ueben-erwartet-ml.R). Dazu zwei vorhandene Einheiten: ROC/AUC und Entscheidungsbaum
 * (logistische-regression-guete) und Überanpassung bei der Regression (ueberanpassung-kreuzvalidierung). Eingebunden in `lernplan.ts`, Gruppe „Vertiefen“.
 */
import { P } from '../i18n/laufzeit';
import type { Einheit, Pfad } from './lernplan';

export const EINHEITEN_ML: Einheit[] = [
  { id: 'ml-grundidee', bereich: 'vorhersage', alltag: P('Wie lernt ein Programm aus Beispielen?', 'How does a program learn from examples?'), fach: P('Überwachtes Lernen (Klassifikation, Trainings- und Testdaten, Datenleck)', 'Supervised learning (classification, training and test data, data leakage)'),
    hilfe: ['ml-grundidee', 'maschinelles-lernen', 'trainingsdaten'], beispiele: [], probieren: ['lernlabor/vorhersagen'],
    fragen: ['ml-gi-zweck', 'ml-gi-leck', 'ml-gi-klassifikation', 'ml-gi-mehrfach'] },
  { id: 'ml-knn', bereich: 'vorhersage', alltag: P('Wie sagt man einen neuen Fall aus ähnlichen Fällen voraus?', 'How do you predict a new case from similar cases?'), fach: P('k-nächste Nachbarn (kNN, Abstand, Standardisieren)', 'k-nearest neighbours (kNN, distance, standardising)'),
    hilfe: ['ml-knn', 'knn', 'standardisierung', 'z-wert'], beispiele: [], probieren: ['lernlabor/vorhersagen'],
    fragen: ['ml-kn-regel', 'ml-kn-hand', 'ml-kn-k-wechsel', 'ml-kn-standard', 'ml-kn-roh-fehler'] },
  { id: 'ml-ueberanpassung', bereich: 'vorhersage', alltag: P('Lernt mein Modell nur auswendig?', 'Is my model just memorising?'), fach: P('Überanpassung (Trainings- und Testfehler, Kreuzvalidierung, k wählen)', 'Overfitting (training and test error, cross-validation, choosing k)'),
    hilfe: ['ml-ueberanpassung', 'overfitting', 'kreuzvalidierung'], beispiele: [], probieren: ['lernlabor/vorhersagen'],
    fragen: ['ml-ue-luecke', 'ml-ue-cv', 'ml-ue-wahl', 'ml-ue-unter', 'ml-ue-mehrfach'] },
  { id: 'ml-konfusionsmatrix', bereich: 'vorhersage', alltag: P('Wie oft trifft ein Klassifikationsmodell?', 'How often does a classification model hit?'), fach: P('Konfusionsmatrix (Trefferquote, Sensitivität, Spezifität, Grundrate)', 'Confusion matrix (accuracy, sensitivity, specificity, base rate)'),
    hilfe: ['ml-konfusionsmatrix', 'klassifikationstabelle', 'sensitivitaet', 'spezifitaet', 'roc-kurve'], beispiele: [], probieren: ['lernlabor/vorhersagen'],
    fragen: ['ml-km-treffer', 'ml-km-sens', 'ml-km-raten', 'ml-km-selten', 'ml-km-mehrfach'] }
];

export const PFAD_ML: Pfad = { id: 'maschinelles-lernen', name: P('Maschinelles Lernen verstehen (Machine Learning)', 'Understanding machine learning'), einheiten: [
  'ml-grundidee', 'ml-knn', 'ml-ueberanpassung', 'ml-konfusionsmatrix', 'logistische-regression-guete', 'ueberanpassung-kreuzvalidierung'] };
