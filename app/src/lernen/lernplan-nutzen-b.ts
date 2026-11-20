/**
 * Stufe 4 „nutzen“ (09.11.2026, Fachblatt docs/nutzen/FACHBLATT-STUFE-4-2026-11-09.md): sechs neue Einheiten aus Abschnitt (a). Jede hat Erklärung (erster Hilfe-Artikel),
 * Selbst rechnen (`rechenaufgaben-nutzen-b.ts`), Ausprobieren (Schritt eines Beispiels) und Fragen (`fragen-nutzen-b.ts`, Kennungen `nb-…`).
 * Sie stehen hinten in den Pfaden `daten`, `gruppen`, `studie-planen`, `technik`, `medizin` und `kategorien` (in `lernplan.ts`). Die Abschnitte in bestehenden Einheiten (b)
 * stehen dort in den Feldern `hilfe` und `fragen` der jeweiligen Einheit.
 */
import { P } from '../i18n/laufzeit';
import type { Einheit } from './lernplan';

export const EINHEITEN_NB: Einheit[] = [
  { id: 'fehlende-werte-imputation', bereich: 'daten', alltag: P('Was passiert mit meinen Ergebnissen, wenn Werte fehlen und ich die Lücken auffülle?', 'What happens to my results when values are missing and I fill the gaps?'), fach: P('Fehlende Werte: MCAR und MAR, Mittelwert-Imputation, multiple Imputation', 'Missing values: MCAR and MAR, mean imputation, multiple imputation'),
    hilfe: ['fehlende-werte-little-imputation', 'fehlende-werte', 'mcar', 'mar', 'mnar', 'imputation', 'multiple-imputation', 'listenweiser-ausschluss'],
    rechnen: ['nb-imputation'], beispiele: [{ id: 'luftqualitaet', schritt: 0 }, { id: 'persoenlichkeit-bfi', schritt: 0 }], probieren: [], karte: 'verteilung',
    fragen: ['nb-im-mittel', 'nb-im-little', 'nb-im-mar', 'nb-im-mehrfach'] },
  { id: 'robuste-verfahren', bereich: 'vergleichen', alltag: P('Was tun bei schiefen Daten und Ausreißern, wenn Gruppen verglichen werden?', 'What to do about skewed data and outliers when groups are compared?'), fach: P('Robuste Verfahren: getrimmtes Mittel, Winsorisieren, Yuen-Test', 'Robust procedures: trimmed mean, winsorising, Yuen test'),
    hilfe: ['robuste-verfahren', 'getrimmtes-mittel', 'winsorisieren', 'median', 'ausreisser'],
    rechnen: ['nb-robust'], beispiele: [{ id: 'lalonde', schritt: 0 }], probieren: [], karte: 'gruppen',
    fragen: ['nb-rb-trim', 'nb-rb-winsor', 'nb-rb-wann', 'nb-rb-ausreisser'] },
  { id: 'propensity-matching', bereich: 'planen', alltag: P('Wie vergleiche ich Gruppen, die nicht zufällig entstanden sind?', 'How do I compare groups that did not arise by chance?'), fach: P('Matching mit dem Propensity Score, standardisierte Mittelwertdifferenz (SMD)', 'Matching on the propensity score, standardised mean difference (SMD)'),
    hilfe: ['matching-propensity-score', 'propensity-score', 'matching'],
    rechnen: ['nb-matching'], beispiele: [{ id: 'lalonde', schritt: 0 }], probieren: [], karte: 'gruppen',
    fragen: ['nb-pm-score', 'nb-pm-smd', 'nb-pm-grenze', 'nb-pm-eng'] },
  { id: 'kalibrierung-nachweisgrenze', bereich: 'technik', alltag: P('Wie wenig lässt sich noch messen, und wie rechne ich vom Signal auf die Menge zurück?', 'How little can still be measured, and how do I calculate back from the signal to the amount?'), fach: P('Kalibriergerade, Nachweis-, Erfassungs- und Bestimmungsgrenze', 'Calibration line, limit of detection, of identification and of quantification'),
    hilfe: ['kalibriergerade-nachweisgrenze', 'nachweisgrenze', 'bestimmungsgrenze'],
    rechnen: ['nb-kalibrierung'], beispiele: [{ id: 'kalibrierung', schritt: 0 }], probieren: [], karte: 'zusammenhang',
    fragen: ['nb-ka-grenzen', 'nb-ka-rueck', 'nb-ka-bereich', 'nb-ka-r2'] },
  { id: 'referenzbereich-ausreisser', bereich: 'fach', alltag: P('In welchem Bereich liegen die Werte der meisten Gesunden, und ist dieser Wert wirklich ungewöhnlich?', 'In what range do the values of most healthy people lie, and is this value really unusual?'), fach: P('Referenzbereich (Perzentile) und Ausreißertests (Grubbs, ESD, Dixon)', 'Reference range (percentiles) and outlier tests (Grubbs, ESD, Dixon)'),
    hilfe: ['referenzbereich', 'ausreisser-tests', 'perzentil', 'grubbs'],
    rechnen: ['nb-referenz'], beispiele: [{ id: 'welt-gesundheit', schritt: 0 }], probieren: [], karte: 'verteilung',
    fragen: ['nb-rf-aussen', 'nb-rf-innen', 'nb-rf-wenige', 'nb-rf-grubbs'] },
  { id: 'korrespondenzanalyse', bereich: 'kategorien', alltag: P('Wie hängen die Zeilen und Spalten einer großen Tabelle zusammen?', 'How are the rows and columns of a large table related?'), fach: P('Korrespondenzanalyse: Zeilenprofile und Karte der Tabelle', 'Correspondence analysis: row profiles and map of the table'),
    hilfe: ['korrespondenzanalyse', 'chi-quadrat', 'kreuztabelle'],
    rechnen: ['nb-korrespondenz'], beispiele: [{ id: 'titanic', schritt: 1 }], probieren: [], karte: 'kreuz',
    fragen: ['nb-ko-zeilen', 'nb-ko-richtung', 'nb-ko-mitte', 'nb-ko-anteil'] }
];
