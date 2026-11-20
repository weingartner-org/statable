import { L } from './sitzung.svelte';

/** Wie das Gruppendiagramm aussieht. Steht am Blatt, damit es gespeichert wird. */
export interface DgOptionen { art: 'punkte' | 'balken' | 'box'; fehler: 'ki' | 'se' | 'sd' | 'keine'; einzel: boolean; sw: boolean; titel: string; y: string; breite: 'spalte' | 'seite' }
export const dgGrund = (titel: string, y: string): DgOptionen => ({ art: 'punkte', fehler: 'ki', einzel: true, sw: false, titel, y, breite: 'spalte' });
export const dgRat = (art: DgOptionen['art']) => (art === 'balken'
  ? L('Säulen verstecken, wie die Werte verteilt sind. Für Mittelwerte sind Punkte meist ehrlicher.', 'Bars hide how the values are spread out. For means, dots are usually more honest.')
  : art === 'box' ? L('Der Kasten zeigt Median und mittlere Hälfte - gut bei Ausreißern.', 'The box shows the median and the middle half - good when there are outliers.') : L('Zeigt jede Person und den Mittelwert. Empfohlen.', 'Shows each person and the mean. Recommended.'));

/**
 * Wahl für die Diagramme von Verteilung, Kreuztabelle, Regression und Faktorenanalyse (anders als `DgOptionen` des Gruppenvergleichs sind das nur wenige Schalter).
 * Steht als `dv` am Blatt und wird mit der Projektdatei gespeichert. Fehlt ein Feld (alte Projekte), gilt der Vorschlag.
 */
export interface DvOptionen {
  /** Zahlenspalte: Histogramm, Boxplot oder Q-Q-Diagramm */
  verteilung: 'hist' | 'box' | 'qq';
  /** Histogramm: Normalverteilungskurve einblenden */
  normal: boolean;
  /** Kategorienspalte: Anzahl oder Prozent */
  haeufig: 'anzahl' | 'prozent';
  /** Kreuztabelle: Balken nebeneinander oder auf 100 % gestapelt */
  kreuz: 'gruppiert' | 'gestapelt';
  /** Gruppierte Balken: Zeilenprozent oder Anzahl */
  kreuzWert: 'prozent' | 'anzahl';
  /** Regression: Reste gegen vorhergesagte Werte oder Q-Q-Diagramm */
  rest: 'rest' | 'qq';
  /** Der Bereich „Diagramme“ ist zugeklappt */
  zu: boolean;
  /** Kategorienspalte: zusätzlich als Pareto-Diagramm (nach Größe sortiert, mit kumulierter Linie) */
  pareto: boolean;
}
export const dvGrund: DvOptionen = { verteilung: 'hist', normal: false, haeufig: 'anzahl', kreuz: 'gruppiert', kreuzWert: 'prozent', rest: 'rest', zu: false, pareto: false };
export const dvMit = (o?: Partial<DvOptionen>): DvOptionen => ({ ...dvGrund, ...(o ?? {}) });

/** Kurzer Rat zur Wahl der Art - wie `dgRat` beim Gruppenvergleich. */
export const dvRat = {
  verteilung: (a: DvOptionen['verteilung']) => (a === 'qq'
    ? L('Liegen die Punkte nah an der Linie, ist die Verteilung annähernd normal. Ein Bogen zeigt Schiefe, ein S Ausreißer an den Enden. Besser als jeder Test, um die Form zu beurteilen.', 'If the points lie close to the line, the distribution is roughly normal. A curve shows skew, an S shows outliers at the ends. Better than any test for judging the shape.')
    : a === 'box'
    ? L('Der Kasten zeigt Median und mittlere Hälfte; einzelne Punkte sind Ausreißer. Gut zum Vergleichen, aber ohne die Form der Verteilung.', 'The box shows the median and the middle half; single dots are outliers. Good for comparing, but it hides the shape of the distribution.')
    : L('Zeigt, wie viele Personen in welchem Bereich liegen - und ob die Verteilung schief ist. Empfohlen.', 'Shows how many people fall into which range - and whether the distribution is skewed. Recommended.')),
  kreuz: (a: DvOptionen['kreuz']) => (a === 'gestapelt'
    ? L('Jede Säule ist 100 %: Sie sieht die Zusammensetzung jeder Gruppe, aber nicht, wie groß die Gruppen sind.', 'Each column is 100%: you see the make-up of each group, but not how big the groups are.')
    : L('Nebeneinander lassen sich die Gruppen Antwort für Antwort vergleichen. Empfohlen.', 'Side by side, you can compare the groups answer by answer. Recommended.')),
  rest: (a: DvOptionen['rest']) => (a === 'qq'
    ? L('Liegen die Punkte nah an der Linie, sind die Reste annähernd normalverteilt - das setzen die Tests der Regression voraus.', 'If the points lie close to the line, the residuals are roughly normally distributed - the tests of the regression assume that.')
    : L('Die Punkte sollten ohne erkennbares Muster um die Null-Linie streuen. Ein Bogen oder Trichter spricht gegen das Modell. Empfohlen.', 'The points should scatter around the zero line with no visible pattern. A curve or funnel points against the model. Recommended.'))
};
