/**
 * Lehre „Wirtschaft: Ursachen schätzen (Ökonometrie)“ (B2 Teil 1c, 14.11.2026; Fachblatt docs/ausbau/FACHBLATT-B2-OEKONOMETRIE.md): drei Einheiten mit Erklärung
 * (Hilfe-Artikel `paneldaten` in hilfe/artikel-paneldaten.ts, `cluster-robust` und `hausman-test` in hilfe/artikel-oekonometrie.ts), Ausprobieren im Block
 * „Gleiche Einheiten über die Zeit?“ der Regressionskarte am Beispiel „Grunfeld“ und Fragen `pan-…` (lernen/fragen-panel.ts, Thema `panel`,
 * Zahlen aus scripts/panel-erwartet.R). Eingebunden in `lernplan.ts`, Gruppe „Nach Fach“. Teil 2b hängt Instrumentvariablen an; Teil 2 (Differenz-in-Differenzen,
 * Regressions-Diskontinuität) hängt hier weitere Einheiten an.
 */
import { P } from '../i18n/laufzeit';
import type { Einheit, Pfad } from './lernplan';

export const EINHEITEN_PANEL: Einheit[] = [
  { id: 'panel-feste-effekte', bereich: 'vorhersage', alltag: P('Wird jede Firma mit sich selbst verglichen?', 'Do I compare each firm with itself?'), fach: P('Paneldaten: feste und zufällige Effekte (Within, Between, Pooled)', 'Panel data: fixed and random effects (within, between, pooled)'),
    hilfe: ['paneldaten', 'mehrebenen'], beispiele: [{ id: 'grunfeld', schritt: 0 }], probieren: [], karte: 'vorhersage',
    fragen: ['pan-within', 'pan-konstant', 'pan-kapital', 'pan-mehrfach'] },
  { id: 'cluster-robust', bereich: 'vorhersage', alltag: P('Wie genau ist mein Ergebnis, wenn dieselben Einheiten mehrfach vorkommen?', 'How precise is my result when the same units appear several times?'), fach: P('Cluster-robuste Standardfehler (Cluster, Sandwich-Schätzer)', 'Cluster-robust standard errors (cluster, sandwich estimator)'),
    hilfe: ['cluster-robust', 'paneldaten'], beispiele: [{ id: 'grunfeld', schritt: 0 }], probieren: [], karte: 'vorhersage',
    fragen: ['pan-cr-warum', 'pan-cr-pooled', 'pan-cr-wenige', 'pan-cr-mehrfach'] },
  { id: 'hausman-test', bereich: 'vorhersage', alltag: P('Reichen zufällige Effekte, oder braucht es feste?', 'Are random effects enough, or are fixed ones needed?'), fach: P('Hausman-Test und F-Test auf Einheiten-Effekte', 'Hausman test and F test for unit effects'),
    hilfe: ['hausman-test', 'paneldaten'], beispiele: [{ id: 'grunfeld', schritt: 0 }], probieren: [], karte: 'vorhersage',
    fragen: ['pan-ha-ftest', 'pan-ha-lesen', 'pan-ha-idee', 'pan-ha-mehrfach'] },
  /* B2 Teil 2b: Instrumentvariablen (Hilfe-Artikel `instrumentvariablen` in hilfe/artikel-oekonometrie.ts, Fragen `iv-…` in lernen/fragen-iv.ts, Beispiel „zigaretten“, Block IvBlock.svelte). */
  { id: 'instrumentvariablen', bereich: 'vorhersage', alltag: P('Was tun, wenn die Ursache selbst vom Ergebnis beeinflusst ist?', 'What can I do when the cause is itself influenced by the outcome?'), fach: P('Instrumentvariablen (2SLS): erste Stufe, schwache Instrumente, Wu-Hausman, Sargan', 'Instrumental variables (2SLS): first stage, weak instruments, Wu-Hausman, Sargan'),
    hilfe: ['instrumentvariablen', 'regression'], beispiele: [{ id: 'zigaretten', schritt: 0 }], probieren: [], karte: 'vorhersage',
    fragen: ['iv-grund', 'iv-instrument', 'iv-erste-stufe', 'iv-ergebnis', 'iv-sargan', 'iv-mehrfach'] },
  /* B2 Teil 2c: Differenz-in-Differenzen (Hilfe-Artikel `differenz-in-differenzen` in hilfe/artikel-oekonometrie.ts, Fragen `did-…` in lernen/fragen-did.ts, Beispiel „hauspreise“, Block DidBlock.svelte). */
  { id: 'differenz-in-differenzen', bereich: 'vorhersage', alltag: P('Hat eine Maßnahme etwas verändert, wenn ich nur eine Gruppe mit einer anderen vergleichen kann?', 'Did a measure change anything when I can only compare one group with another?'), fach: P('Differenz-in-Differenzen: Behandelte und Vergleichsgruppe, gleichlaufende Trends', 'Difference-in-differences: treated and comparison group, parallel trends'),
    hilfe: ['differenz-in-differenzen', 'regression'], beispiele: [{ id: 'hauspreise', schritt: 0 }], probieren: [], karte: 'vorhersage',
    fragen: ['did-idee', 'did-lesen', 'did-trends', 'did-p', 'did-merkmale', 'did-mehrfach'] },
  /* B2 Teil 2d-3: Regressions-Diskontinuität (Hilfe-Artikel `regressions-diskontinuitaet` in hilfe/artikel-oekonometrie.ts, Fragen `rd-…` in lernen/fragen-rd.ts, Beispiel „senatswahlen“, Block RdBlock.svelte). */
  { id: 'regressions-diskontinuitaet', bereich: 'vorhersage', alltag: P('Gibt es an einer Schwelle einen Sprung, der auf eine Wirkung hindeutet?', 'Is there a jump at a threshold that points to an effect?'), fach: P('Regressions-Diskontinuität: Schwelle, Bandbreite, lokal lineare Schätzung, Annahmen', 'Regression discontinuity: threshold, bandwidth, local linear estimation, assumptions'),
    hilfe: ['regressions-diskontinuitaet', 'regression'], beispiele: [{ id: 'senatswahlen', schritt: 0 }], probieren: [], karte: 'vorhersage',
    fragen: ['rd-idee', 'rd-lesen', 'rd-bandbreite', 'rd-ordnung', 'rd-annahme', 'rd-mehrfach'] }
];

export const PFAD_PANEL: Pfad = { id: 'oekonometrie', name: P('Wirtschaft: Ursachen schätzen (Ökonometrie)', 'Economics: estimating causes (econometrics)'), einheiten: [
  'panel-feste-effekte', 'cluster-robust', 'hausman-test', 'instrumentvariablen', 'differenz-in-differenzen', 'regressions-diskontinuitaet'] };
