/**
 * Tabellen zur Varianzanalyse mit drei und mehr Gruppen: Welch-Varianzanalyse und Paarvergleiche (Tukey, Games-Howell, Bonferroni).
 * Gerechnet in posthoc.ts aus n, Mittelwert und Streuung je Gruppe; hier nur in Tabellen für Blatt, Bericht, Word und Excel gefasst.
 * Spaltennamen und Zahlen folgen der gewählten Sprache (die Ausgabe wandelt den Punkt in Dezimalkomma).
 */
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { anovaHaupt, kd, phArt, phName, type Anova } from './ergebnis';
import { paarvergleiche, welchAnova, type PhArt } from './posthoc';
import { fd, fp, fx, tabelle } from './mwsaetze';

const T = L;

/** Die Welch-Tabelle (eine Zeile); `null`, wenn eine Gruppe keine Streuung hat. */
export function tabelleWelch(e: Anova): TableItem | null {
  const w = welchAnova(e.gruppen);
  if (!w) return null;
  return tabelle('Welch ANOVA', T('Welch-Varianzanalyse', 'Welch analysis of variance'),
    ['', 'F', T('df Zähler', 'df numerator'), T('df Nenner', 'df denominator'), 'p'],
    [[T('Zwischen den Gruppen', 'Between groups'), fx(w.f), fd(w.df1), fx(w.df2, 1), fp(w.p)]],
    [T('Das Hauptergebnis: braucht keine gleich große Streuung. Welch (1951): jede Gruppe wird nach ihrer Streuung gewichtet; die Freiheitsgrade des Nenners sind darum nicht ganzzahlig. Gerechnet wie R oneway.test(var.equal = FALSE).',
      'The main result: does not need equal spread. Welch (1951): each group is weighted by its spread, so the denominator degrees of freedom are not whole numbers. Calculated like R oneway.test(var.equal = FALSE).')]);
}

/** Die Tabelle der Paarvergleiche; `null`, wenn mit diesen Gruppen nicht gerechnet werden kann. */
export function tabellePaare(e: Anova, art: PhArt, kontrolle = 0): TableItem | null {
  const paare = paarvergleiche(e.gruppen, art, kontrolle);
  if (!paare) return null;
  const fuss = {
    tukey: T('Tukey HSD (bei ungleich großen Gruppen Tukey-Kramer): setzt gleich große Streuung in den Gruppen voraus.', 'Tukey HSD (Tukey-Kramer for unequal group sizes): assumes equal spread in the groups.'),
    gh: T('Games-Howell: braucht keine gleich große Streuung; Freiheitsgrade nach Welch-Satterthwaite, je Paar eigene.', 'Games-Howell: does not need equal spread; Welch-Satterthwaite degrees of freedom, one set per pair.'),
    bonferroni: T('Bonferroni: t-Tests mit der gemeinsamen Streuung, jedes p mal die Zahl der Paare (höchstens 1); setzt gleich große Streuung voraus.', 'Bonferroni: t tests with the pooled spread, each p times the number of pairs (at most 1); assumes equal spread.'),
    holm: T('Holm: t-Tests mit der gemeinsamen Streuung, die p-Werte schrittweise angepasst (immer mindestens so stark wie nötig, nie strenger als Bonferroni); setzt gleich große Streuung voraus. Holm liefert selbst kein Intervall: gezeigt wird das von Bonferroni.', 'Holm: t tests with the pooled spread, p values adjusted step by step (never stricter than Bonferroni); assumes equal spread. Holm gives no interval of its own: the one from Bonferroni is shown.'),
    scheffe: T('Scheffé: der vorsichtigste Test, gilt für jeden denkbaren Vergleich der Mittelwerte, auch für solche, die erst nach dem Blick auf die Daten einfallen; setzt gleich große Streuung voraus.', 'Scheffé: the most cautious test; it holds for every conceivable comparison of the means, even ones thought of only after looking at the data; assumes equal spread.'),
    dunnett: T(`Dunnett: nur die Vergleiche jeder Gruppe mit der Kontrollgruppe "${e.gruppen[kontrolle]?.name ?? ''}", daher weniger streng als alle Paare; setzt gleich große Streuung voraus. Differenz = Gruppe minus Kontrollgruppe.`, `Dunnett: only the comparisons of each group with the control group "${e.gruppen[kontrolle]?.name ?? ''}", so less strict than all pairs; assumes equal spread. Difference = group minus control group.`)
  }[art];
  return tabelle('Multiple Comparisons', T(`Paarvergleiche (${phName(art)})`, `Pairwise comparisons (${phName(art)})`),
    [T('Vergleich', 'Comparison'), T('Differenz', 'Difference'), T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper'), T('p (angepasst)', 'p (adjusted)')],
    paare.map(x => { const d = kd(x.diff); return [`${e.gruppen[x.j]!.name} - ${e.gruppen[x.i]!.name}`, fx(x.diff, d), fx(x.kiLo, d), fx(x.kiHi, d), fp(x.p)]; }),
    [art === 'dunnett'
      ? Lp(paare.length, `Differenz = Mittelwert der ersten minus der zweiten genannten Gruppe. p-Werte und Intervalle sind für den einen Vergleich angepasst. ${fuss}`, `Differenz = Mittelwert der ersten minus der zweiten genannten Gruppe. p-Werte und Intervalle sind für alle ${paare.length} Vergleiche angepasst. ${fuss}`,
        `Difference = mean of the first minus the second group named. p values and intervals are adjusted for the single comparison. ${fuss}`, `Difference = mean of the first minus the second group named. p values and intervals are adjusted for all ${paare.length} comparisons. ${fuss}`)
      : Lp(paare.length, `Differenz = Mittelwert der ersten minus der zweiten genannten Gruppe. p-Werte und Intervalle sind für das eine Paar angepasst. ${fuss}`, `Differenz = Mittelwert der ersten minus der zweiten genannten Gruppe. p-Werte und Intervalle sind für alle ${paare.length} Paare angepasst. ${fuss}`,
        `Difference = mean of the first minus the second group named. p values and intervals are adjusted for the single pair. ${fuss}`, `Difference = mean of the first minus the second group named. p values and intervals are adjusted for all ${paare.length} pairs. ${fuss}`)]);
}

/** Die zusätzlichen Tabellen der Varianzanalyse: Welch (das Hauptergebnis, wenn rechenbar) und die Paarvergleiche (nur wenn der Gesamttest deutlich ist). */
export function tabellenAnovaZusatz(e: Anova, ph?: PhArt, kontrolle = 0): TableItem[] {
  const w = tabelleWelch(e), p = anovaHaupt(e).p < 0.05 ? tabellePaare(e, phArt(e, ph), kontrolle) : null;
  return [...(w ? [w] : []), ...(p ? [p] : [])];
}

/** Kurzer Rat zur Wahl der Art - wie `dgRat` beim Gruppendiagramm. */
export function phRat(art: PhArt): string {
  return art === 'gh'
    ? T('Der Standard in Statable: braucht keine gleich große Streuung in den Gruppen und hält die Fehlerrate auch bei ungleich großen Gruppen.', 'The default in Statable: does not need equal spread in the groups and keeps the error rate even when the groups differ in size.')
    : art === 'holm'
      ? T('Schrittweise Anpassung: immer mindestens so aussagekräftig wie Bonferroni und genauso sicher. Setzt gleich große Streuung voraus; eine gute Wahl, wenn alle Paare zählen.', 'Step-by-step adjustment: always at least as informative as Bonferroni and just as safe. Assumes equal spread; a good choice when all pairs matter.')
    : art === 'scheffe'
      ? T('Sehr vorsichtig: gilt auch für Vergleiche, die erst nach dem Blick auf die Daten einfallen (zum Beispiel „beide Behandlungen gegen die Kontrolle“). Für reine Paarvergleiche ist Tukey schärfer.', 'Very cautious: also holds for comparisons thought of only after looking at the data (for example "both treatments against the control"). For plain pairwise comparisons Tukey is sharper.')
    : art === 'dunnett'
      ? T('Wenn eine Gruppe die Kontrolle ist und nur ihre Vergleiche zählen: weniger Vergleiche, darum weniger streng als Tukey. Die Kontrollgruppe wird unten gewählt.', 'When one group is the control and only its comparisons matter: fewer comparisons, so less strict than Tukey. The control group is chosen below.')
    : art === 'bonferroni'
      ? T('Streng und einfach: jedes p wird mit der Zahl der Paare malgenommen. Setzt gleich große Streuung voraus; gut, wenn nur wenige Paare zählen.', 'Strict and simple: each p is multiplied by the number of pairs. Assumes equal spread; fine when only a few pairs matter.')
      : T('Setzt gleich große Streuung in den Gruppen voraus. Vergleicht alle Paare und passt die p-Werte dafür an.', 'Assumes equal spread in the groups. Compares all pairs and adjusts the p values for that.');
}
/** Der Levene-Test unter der Auswahl - nur zur Beschreibung, er wählt nichts (Abschlusstest F2). */
export function phLeveneText(pText: string): string {
  return T(`Levene-Test auf gleich große Streuung (nur zur Beschreibung, er entscheidet nichts): p ${pText}.`, `Levene's test for equal spread (descriptive only, it decides nothing): p ${pText}.`);
}
