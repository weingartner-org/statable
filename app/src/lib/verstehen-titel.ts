/**
 * Stufe 9: die Titel der Kacheln von „Rechner und Regler“ (`#verstehen/<id>`) an einer Stelle.
 * `seiten/Verstehen.svelte` (Seitentitel einer Kachel) und die Befehlspalette lesen von hier. Die Überschriften auf der Übersicht tragen denselben Wortlaut.
 */
import { L } from './sitzung.svelte';

export const verstehenTitel = (): Record<string, string> => ({
  verteilungen: L('Verteilungen berechnen: Wahrscheinlichkeitsverteilungen', 'Calculate distributions: probability distributions'),
  kennzahlen: L('Aus Kennzahlen rechnen: Konfidenzintervall und Test', 'Calculate from summary numbers: confidence interval and test'),
  vergleich: L('Gruppen aus Kennzahlen vergleichen: t-Test, Varianzanalyse, χ²-Test', 'Compare groups from summary numbers: t test, analysis of variance, χ² test'),
  anteilstest: L('Anteilstest verstehen: Binomialtest', 'Understand the test for a proportion: binomial test'),
  lernlabor: L('Lernlabor: Wahrscheinlichkeit und Stichproben', 'Learning lab: probability and samples'),
  zuteilung: L('Zufall zuteilen: Zufallsstichprobe und Randomisierung', 'Allocate by chance: random sample and randomisation'),
  effekt: L('Effektstärke sehen: Cohens d und Teststärke', 'See the effect size: Cohen\'s d and power'),
  kennlinie: L('Aufgabe und Kennlinie: Item-Response-Theorie (Rasch, 2PL)', 'Task and characteristic curve: item response theory (Rasch, 2PL)'),
  gerade: L('Gerade zum Anfassen: Regression und Korrelation', 'A line to play with: regression and correlation'),
  probieren: L('Ausprobieren: Was verändert das Ergebnis?', 'Try it out: what changes the result?'),
  ueben: L('Üben: Fragen mit Erklärung', 'Practise: questions with explanations'),
});
