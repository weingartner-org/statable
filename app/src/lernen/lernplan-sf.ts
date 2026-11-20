/**
 * Lernpfad „Sauber forschen“ (Field-Stufe 3, 05.11.2026): fünf neue Einheiten und der Pfad. Jede neue Einheit hat Erklärung (Hilfe-Artikel `sf-…`), Selbst rechnen (4 Schritte,
 * `rechenaufgaben-sf.ts`), Ausprobieren und 7 Fragen (`fragen-sauber-forschen.ts`, Thema `sauberforschen`). Eingebunden in `lernplan.ts`.
 * `bayes-vorwissen` probiert im Lernlabor-Versuch „Bayes mit Vorwissen“ (`lernlabor/bayes`).
 */
import { P } from '../i18n/laufzeit';
import type { Einheit, Pfad } from './lernplan';

export const EINHEITEN_SF: Einheit[] = [
  { id: 'forschungskreislauf', bereich: 'planen', alltag: P('Wie komme ich von einer Beobachtung zu einer prüfbaren Vorhersage?', 'How do I get from an observation to a testable prediction?'), fach: P('Forschungskreislauf (Beobachtung, Theorie, Hypothese, Vorhersage, Prüfung; unabhängige und abhängige Größe)', 'Research cycle (observation, theory, hypothesis, prediction, test; independent and dependent variable)'),
    hilfe: ['sf-kreislauf', 'forschungskreislauf', 'hypothese', 'theorie', 'unabhaengige-variable', 'abhaengige-groesse', 'forschungsfrage', 'falsifikation'],
    rechnen: ['forschungskreislauf-vorhersage'], beispiele: [{ id: 'depression', schritt: 3 }], probieren: ['lernlabor/randomisierung'],
    fragen: ['sf-kr-reihenfolge', 'sf-kr-hypothese', 'sf-kr-variablen', 'sf-kr-vorhersage', 'sf-kr-bestaetigt', 'sf-kr-richtung', 'sf-kr-mehrfach'] },
  { id: 'vorregistrierung', bereich: 'planen', alltag: P('Was lege ich fest, bevor ich die Daten sehe?', 'What do I fix before I see the data?'), fach: P('Vorregistrierung (Präregistrierung, Analyseplan, registrierter Bericht)', 'Preregistration (analysis plan, registered report)'),
    hilfe: ['sf-vorregistrierung', 'praeregistrierung', 'registrierter-bericht', 'analyseplan', 'fallzahlplanung', 'open-science', 'optionales-stoppen'],
    rechnen: ['vorregistrierung-plan'], beispiele: [{ id: 'lesetraining', schritt: 7 }], probieren: ['effekt'],
    fragen: ['sf-vr-was', 'sf-vr-wege', 'sf-vr-abweichen', 'sf-vr-zusatz', 'sf-vr-bericht', 'sf-vr-rekrutieren', 'sf-vr-mehrfach'] },
  { id: 'p-wert-grundsaetze', bereich: 'schliessen', alltag: P('Was sagt ein p-Wert, und was sagt er nicht?', 'What does a p value say, and what does it not say?'), fach: P('Grundsätze zum p-Wert (Fallzahl, Effektgröße, Schwelle, selektives Berichten)', 'Principles on the p value (sample size, effect size, threshold, selective reporting)'),
    hilfe: ['sf-p-grundsaetze', 'p-wert', 'signifikanzniveau', 'effektstaerke', 'konfidenzintervall', 'signifikant'],
    rechnen: ['p-bei-n'], beispiele: [{ id: 'depression', schritt: 3 }, { id: 'lesetraining', schritt: 3 }], probieren: ['vergleich'], karte: 'gruppen',
    fragen: ['sf-pg-bedeutung', 'sf-pg-fallzahl', 'sf-pg-wurzel', 'sf-pg-nicht-sig', 'sf-pg-groesse', 'sf-pg-selektiv', 'sf-pg-mehrfach'] },
  { id: 'p-hacking-erkennen', bereich: 'schliessen', alltag: P('Wie entsteht ein Fehlalarm, ohne dass jemand schummelt?', 'How does a false alarm arise without anyone cheating?'), fach: P('p-Hacking erkennen (Forschungsfreiheitsgrade, HARKing, mehrere Zielgrößen, optionales Stoppen)', 'Recognising p-hacking (researcher degrees of freedom, HARKing, several outcomes, optional stopping)'),
    hilfe: ['sf-p-hacking', 'p-hacking', 'harking', 'forschungsfreiheitsgrade', 'familienfehlerrate', 'optionales-stoppen', 'alpha-kumulierung', 'bonferroni'],
    rechnen: ['fehlalarm-zielgroessen'], beispiele: [], probieren: ['lernlabor/zufall'],
    fragen: ['sf-ph-risiko3', 'sf-ph-risiko20', 'sf-ph-bonferroni', 'sf-ph-stoppen', 'sf-ph-harking', 'sf-ph-absicht', 'sf-ph-mehrfach'] },
  { id: 'bayes-vorwissen', bereich: 'schliessen', alltag: P('Wie verbinden sich Vorwissen und neue Daten?', 'How do prior knowledge and new data combine?'), fach: P('Bayes mit Vorwissen (Prior, Posterior, Beta-Verteilung für einen Anteil)', 'Bayes with prior knowledge (prior, posterior, beta distribution for a proportion)'),
    hilfe: ['sf-bayes-vorwissen', 'prior', 'posterior', 'beta-verteilung', 'beta-binomial-modell', 'prior-staerke', 'a-priori', 'bayes-statistik'],
    rechnen: ['beta-posterior'], beispiele: [], probieren: ['lernlabor/bayes'],
    fragen: ['sf-bv-prior', 'sf-bv-posterior', 'sf-bv-mittel', 'sf-bv-staerke', 'sf-bv-zwischen', 'sf-bv-subjektiv', 'sf-bv-mehrfach'] },
  // LE3 (14.11.2026): Ergebnis in R nachrechnen - Erklärung `sf-r-skript`, Zahlen aus scripts/ueben-erwartet-r-skript.R, 7 Fragen `sf-rs-…`
  { id: 'r-skript-nachrechnen', bereich: 'daten', alltag: P('Wie prüfe ich ein Ergebnis mit einem zweiten Programm?', 'How do I check a result with a second program?'), fach: P('Ergebnis in R nachrechnen (R-Skript, Reproduzierbarkeit, Quadratsummen Typ III)', 'Recalculating a result in R (R script, reproducibility, type III sums of squares)'),
    hilfe: ['sf-r-skript', 'r-skript', 'typ-iii-quadratsumme', 'levene-test', 'zweifaktorielle-varianzanalyse', 'open-science'],
    beispiele: [], probieren: [],
    fragen: ['sf-rs-zweck', 'sf-rs-welch', 'sf-rs-levene', 'sf-rs-typ3', 'sf-rs-gewicht', 'sf-rs-rundung', 'sf-rs-mehrfach'] }
];

export const PFAD_SF: Pfad = { id: 'sauber-forschen', name: P('Sauber forschen', 'Doing research cleanly'), einheiten: [
  'forschungskreislauf', 'studie-design-randomisierung', 'vorregistrierung', 'p-wert-deuten', 'p-wert-grundsaetze', 'konfidenzintervall-bedeutung', 'effektstaerke', 'teststaerke-fehlerarten',
  'kleine-studien-falsch-positiv', 'mehrfach-testen', 'p-hacking-erkennen', 'bayes-faktor', 'bayes-vorwissen', 'r-skript-nachrechnen'] };
