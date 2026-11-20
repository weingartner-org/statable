/**
 * „Ausprobieren“ in der Hilfe: welcher Artikel oder Begriff auf welchen Baustein unter #verstehen/ zeigt.
 * Die Ziele sind Teile der Adresse nach `#verstehen/`; der Test prüft, dass es sie alle gibt.
 */
/** Alle Kacheln unter „Verstehen“ (Teil der Adresse, ohne Üben). */
export const VERSTEHEN_KACHELN = ['verteilungen', 'kennzahlen', 'vergleich', 'anteilstest', 'lernlabor', 'zuteilung', 'effekt', 'kennlinie', 'gerade', 'probieren'] as const;
/** Die Bausteine der Kachel „Ausprobieren“ (modell und achse seit 05.11.2026 für den Lernpfad „Das lineare Modell“). */
export const PROBIER_TEILE = ['alpha', 'intervall', 'vorhersage', 'modell', 'achse'] as const;

export const PROBIER_ZIELE: Record<string, string> = {
  reliabilitaet: 'probieren/alpha', 'frage-skala': 'probieren/alpha',
  konfidenzintervall: 'probieren/intervall',
  sensitivitaet: 'probieren/vorhersage', spezifitaet: 'probieren/vorhersage', vorhersagewert: 'probieren/vorhersage',
  effektstaerke: 'effekt',
  regression: 'gerade', korrelation: 'gerade',
  'lm-modell-fehler': 'probieren/modell', 'lm-diagramme': 'probieren/achse',
  baumdiagramm: 'lernlabor/baum', 'bedingte-wahrscheinlichkeit': 'lernlabor/baum', 'satz-von-bayes': 'lernlabor/baum', 'totale-wahrscheinlichkeit': 'lernlabor/baum',
  'bayes-statistik': 'lernlabor/bayes', prior: 'lernlabor/bayes', posterior: 'lernlabor/bayes', likelihood: 'lernlabor/bayes', glaubwuerdigkeitsintervall: 'lernlabor/bayes', 'beta-verteilung': 'lernlabor/bayes', 'bayessche-aktualisierung': 'lernlabor/bayes'
};

/** Das Ziel zu einem Hilfe-Artikel oder Begriff (nach `#verstehen/`), falls es eines gibt. */
export const probierenFuerHilfe = (id: string): string | undefined => PROBIER_ZIELE[id];
