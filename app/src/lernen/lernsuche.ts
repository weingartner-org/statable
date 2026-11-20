/**
 * Suche über alle Lernbereiche (Johannes 31.10.): Kacheln unter „Verstehen“, Karteireiter des Lernlabors, Bausteine von „Ausprobieren“, Üben und Hilfe.
 * Rechnet mit derselben Suche wie die Hilfe (`hilfe/suche.ts`). Die Kacheln tragen die Stichwörter ihres Hilfe-Artikels, Themen die Titel ihrer Hilfe-Artikel.
 */
import { P, paarText, type Paar, type Sprache } from '../i18n/laufzeit';
import type { Artikel } from '../hilfe/kern';
import { suche, glatt, type Treffer } from '../hilfe/suche';
import { sichtbareThemen } from './fragen';
import { EINHEITEN } from './lernplan';
import { BEISPIELE } from '../lib/beispiele';
import { VERFAHREN } from '../lib/verfahren';

export type LaborTab = 'stichprobe' | 'bootstrap' | 'randomisierung' | 'zufall' | 'baum' | 'vierfelder' | 'ueberdeckung' | 'bayes' | 'vorhersagen';
export interface LaborTeil { id: LaborTab; name: Paar; frage: Paar; sw: Paar }

export const LABOR_TEILE: LaborTeil[] = [
  { id: 'stichprobe', name: P('Stichproben', 'Samples'), frage: P('Wie streuen Mittelwerte?', 'How do means vary?'), sw: P('Stichprobenverteilung Standardfehler zentraler Grenzwertsatz', 'sampling distribution standard error central limit theorem') },
  { id: 'bootstrap', name: P('Bootstrap', 'Bootstrap'), frage: P('Wie sicher ist mein Mittelwert?', 'How certain is my mean?'), sw: P('Bootstrap Konfidenzintervall Ziehen mit Zurücklegen', 'bootstrap confidence interval resampling') },
  { id: 'randomisierung', name: P('Randomisierung', 'Randomization'), frage: P('Kann der Unterschied Zufall sein?', 'Could the difference be chance?'), sw: P('Randomisierungstest Permutationstest Nullhypothese p-Wert', 'randomization test permutation test null hypothesis p value') },
  { id: 'zufall', name: P('Zufallsexperimente', 'Random experiments'), frage: P('Was heißt „Wahrscheinlichkeit“?', 'What does "probability" mean?'), sw: P('Wahrscheinlichkeit Zufallsexperiment Münze Würfel Urne Gesetz der großen Zahlen Laplace', 'probability random experiment coin die dice urn law of large numbers Laplace') },
  { id: 'baum', name: P('Baumdiagramm', 'Tree diagram'), frage: P('Wie wahrscheinlich ist ein Weg durch den Baum?', 'How likely is a path through the tree?'), sw: P('Baumdiagramm Wahrscheinlichkeitsbaum Pfadregel bedingte Wahrscheinlichkeit totale Wahrscheinlichkeit Satz von Bayes Unabhängigkeit Umkehrbaum', 'tree diagram probability tree path rule conditional probability total probability Bayes theorem independence reversed tree') },
  { id: 'vierfelder', name: P('Vierfeldertafel und Baum', 'Four-field table and tree'), frage: P('Wie viele Positive sind wirklich krank?', 'How many positives are really ill?'), sw: P('Vierfeldertafel Satz von Bayes Sensitivität Spezifität Vorhersagewert Prävalenz', 'four-field table Bayes theorem sensitivity specificity predictive value prevalence') },
  { id: 'ueberdeckung', name: P('Konfidenzintervalle', 'Confidence intervals'), frage: P('Was bedeutet „95 %“?', 'What does "95%" mean?'), sw: P('Konfidenzintervall Überdeckung Vertrauensintervall', 'confidence interval coverage') },
  { id: 'bayes', name: P('Bayes mit Vorwissen', 'Bayes with prior knowledge'), frage: P('Wie verändert Vorwissen das Ergebnis?', 'How does prior knowledge change the result?'), sw: P('Bayes Vorwissen Prior Posterior Likelihood Glaubwürdigkeitsintervall Beta-Verteilung Bayessche Aktualisierung', 'Bayes prior knowledge prior posterior likelihood credible interval beta distribution Bayesian updating') },
  { id: 'vorhersagen', name: P('Vorhersagen (k-nächste Nachbarn)', 'Predictions (k-nearest neighbours)'), frage: P('Wie gut sagt ein Modell neue Fälle voraus?', 'How well does a model predict new cases?'), sw: P('maschinelles Lernen Klassifikation k-nächste Nachbarn kNN Trainingsdaten Testdaten Überanpassung Kreuzvalidierung Konfusionsmatrix Trefferquote Standardisieren', 'machine learning classification k-nearest neighbours kNN training data test data overfitting cross-validation confusion matrix accuracy standardise') }
];

export type KachelId = 'verteilungen' | 'kennzahlen' | 'vergleich' | 'anteilstest' | 'lernlabor' | 'zuteilung' | 'effekt' | 'kennlinie' | 'gerade';
/** Die Rechen- und Lernkacheln mit dem Hilfe-Artikel, dessen Stichwörter die Suche nutzt. */
export const KACHELN: { id: KachelId; titel: Paar; hilfe: string }[] = [
  { id: 'verteilungen', titel: P('Verteilungen berechnen: Wahrscheinlichkeitsverteilungen', 'Calculate distributions: probability distributions'), hilfe: 'verstehen-verteilungen' },
  { id: 'kennzahlen', titel: P('Aus Kennzahlen rechnen: Konfidenzintervall und Test', 'Calculate from summary numbers: confidence interval and test'), hilfe: 'verstehen-kennzahlen' },
  { id: 'vergleich', titel: P('Gruppen aus Kennzahlen vergleichen: t-Test, Varianzanalyse, χ²-Test', 'Compare groups from summary numbers: t test, analysis of variance, χ² test'), hilfe: 'verstehen-kennzahlen' },
  { id: 'anteilstest', titel: P('Anteilstest verstehen: Binomialtest', 'Understand the test for a proportion: binomial test'), hilfe: 'verstehen-anteilstest' },
  { id: 'lernlabor', titel: P('Lernlabor: Wahrscheinlichkeit und Stichproben', 'Learning lab: probability and samples'), hilfe: 'lernlabor' },
  { id: 'zuteilung', titel: P('Zufall zuteilen: Zufallsstichprobe und Randomisierung', 'Allocate by chance: random sample and randomisation'), hilfe: 'verstehen-zuteilung' },
  { id: 'effekt', titel: P('Effektstärke sehen: Cohens d und Teststärke', 'See the effect size: Cohen\'s d and power'), hilfe: 'verstehen-effekt' },
  { id: 'kennlinie', titel: P('Aufgabe und Kennlinie: Item-Response-Theorie (Rasch, 2PL)', 'Task and characteristic curve: item response theory (Rasch, 2PL)'), hilfe: 'verstehen-kennlinie' },
  { id: 'gerade', titel: P('Gerade zum Anfassen: Regression und Korrelation', 'A line to play with: regression and correlation'), hilfe: 'verstehen-gerade' }
];

/** Die Bausteine von „Ausprobieren“; ihre Fachbegriffe kommen aus dem Hilfe-Artikel. */
export const PROBIEREN: { id: string; titel: Paar; hilfe: string }[] = [
  { id: 'alpha', titel: P('Alpha: Zahl der Fragen', 'Alpha: number of questions'), hilfe: 'reliabilitaet' },
  { id: 'intervall', titel: P('Intervall: Zahl der Personen', 'Interval: number of people'), hilfe: 'konfidenzintervall' },
  { id: 'vorhersage', titel: P('Vorhersagewert: seltene Krankheit', 'Predictive value: rare disease'), hilfe: 'vorhersagewert' },
  { id: 'modell', titel: P('Modellwert: Wo liegt die kleinste Quadratsumme?', 'Model value: where is the smallest sum of squares?'), hilfe: 'lm-modell-fehler' },
  { id: 'achse', titel: P('Achse: Wie sehr täuscht ein später Achsenbeginn?', 'Axis: how much does a late axis start mislead?'), hilfe: 'lm-diagramme' }
];

/** Titel eines Reglers aus dem Lernplan (`probieren` einer Einheit: Teil der Adresse nach `#verstehen/`). */
export function reglerTitel(ziel: string): Paar {
  const [a, b] = ziel.split('/');
  if (a === 'lernlabor' && b) { const t = LABOR_TEILE.find(x => x.id === b); if (t) return P(`${t.name.de}: ${t.frage.de}`, `${t.name.en}: ${t.frage.en}`); }
  if (a === 'probieren' && b) { const t = PROBIEREN.find(x => x.id === b); if (t) return t.titel; }
  return KACHELN.find(k => k.id === a)?.titel ?? P(ziel, ziel);
}

export type LernArt = 'einheit' | 'beispiel' | 'kachel' | 'labor' | 'probieren' | 'ueben' | 'hilfe';
export interface LernTreffer {
  art: LernArt; href: string; treffer: Treffer;
  /** Bei Üben und Einheit: Zahl der Fragen. */
  n?: number;
  /** Nur bei einer Einheit: ihre Kennung (für den Lernstand). */
  einheit?: string;
}

interface Ziel { art: LernArt; href: string; n?: number; einheit?: string; /** Einheit: der Fachbegriff, zum Vorziehen, wenn die Suche mit ihm beginnt. */ fach?: string }

/** Baut die Einträge einmal je Artikelliste (und Sprache); die Suche merkt sich ihren Index an der Liste. */
export function lernIndex(liste: Artikel[], sp: Sprache): { eintraege: Artikel[]; ziele: Map<string, Ziel> } {
  const nach = new Map(liste.map(a => [a.id, a]));
  const sw = (id: string) => nach.get(id)?.stichwoerter ?? [];
  const eintraege: Artikel[] = [], ziele = new Map<string, Ziel>();
  const dazu = (id: string, titel: string, stichwoerter: string[], text: string, ziel: Ziel) => {
    eintraege.push({ id, bereich: 'verstehen', titel, stichwoerter, inhalt: [text], verwandt: [] });
    ziele.set(id, ziel);
  };
  for (const e of EINHEITEN) {
    const fach = paarText(sp, e.fach);
    dazu(`einheit:${e.id}`, `${paarText(sp, e.alltag)} (${fach})`, [...fach.split(/[\s,:()]+/), ...e.hilfe.flatMap(h => (nach.get(h)?.titel ?? '').split(' '))], '', { art: 'einheit', href: `#lernen/${e.id}`, n: e.fragen.length, einheit: e.id, fach });
  }
  for (const b of BEISPIELE) {
    const verfahren = [...new Set(b.schritte.map(x => x.art))].map(a => (a === 'planen' ? paarText(sp, P('Studie planen', 'Plan a study')) : [VERFAHREN.find(v => v.id === a)?.titel, VERFAHREN.find(v => v.id === a)?.zusatz].filter(Boolean).join(' ')));
    dazu(`beispiel:${b.id}`, paarText(sp, b.titel), verfahren.flatMap(v => v.split(' ')), '', { art: 'beispiel', href: '#beispiele/' + b.id });
  }
  for (const k of KACHELN) dazu(`kachel:${k.id}`, paarText(sp, k.titel), sw(k.hilfe), nach.get(k.hilfe)?.titel ?? '', { art: 'kachel', href: `#verstehen/${k.id}` });
  for (const t of LABOR_TEILE) dazu(`labor:${t.id}`, `${paarText(sp, t.name)}: ${paarText(sp, t.frage)}`, paarText(sp, t.sw).split(' '), '', { art: 'labor', href: `#verstehen/lernlabor/${t.id}` });
  for (const t of PROBIEREN) dazu(`probieren:${t.id}`, paarText(sp, t.titel), [nach.get(t.hilfe)?.titel ?? '', ...sw(t.hilfe)], '', { art: 'probieren', href: `#verstehen/probieren/${t.id}` });
  for (const t of sichtbareThemen()) {
    const titel = `${paarText(sp, t.alltag)} (${paarText(sp, t.fach)})`;
    dazu(`ueben:${t.id}`, titel, t.hilfe.flatMap(h => (nach.get(h)?.titel ?? '').split(' ')), '', { art: 'ueben', href: `#verstehen/ueben/${t.id}`, n: t.n });
  }
  for (const a of liste) { eintraege.push(a); ziele.set(a.id, { art: 'hilfe', href: `#hilfe/${a.id}` }); }
  return { eintraege, ziele };
}

const REIHE: LernArt[] = ['einheit', 'kachel', 'labor', 'probieren', 'ueben', 'beispiel', 'hilfe'];

/** Treffer nach Lernbereich: erst was man tun kann (Rechnen, Ausprobieren, Üben), dann die Hilfe. Je Bereich die beste zuerst. */
export function lernSuche(ix: ReturnType<typeof lernIndex>, frage: string, sp: Sprache, maxHilfe = 8): LernTreffer[] {
  const alle = suche(ix.eintraege, frage, sp).map(treffer => { const z = ix.ziele.get(treffer.artikel.id)!; return { art: z.art, href: z.href, n: z.n, einheit: z.einheit, vorn: !!z.fach && glatt(z.fach).startsWith(glatt(frage.trim())), treffer }; });
  // Beginnt der Fachbegriff einer Einheit mit der Suche („t-Test“ vor „Gepaarter t-Test“), steht sie vor den übrigen Einheiten.
  return REIHE.flatMap(art => { const g = alle.filter(t => t.art === art); if (art === 'einheit') g.sort((x, y) => Number(y.vorn) - Number(x.vorn)); return (art === 'hilfe' ? g.slice(0, maxHilfe) : g).map(({ vorn: _v, ...rest }) => rest); });
}
