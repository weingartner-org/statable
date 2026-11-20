/**
 * Sätze und Tabelle zu „Fälle für Interviews vorschlagen“ (Später, Welle S-D, G11; Rechnen: fallauswahl.ts).
 * Alles beschreibend und ohne Wertung: Die Tabelle nennt Regel, Rechenwert, Rang und Begründung; sie ist ein Vorschlag nach einer Rechenregel, keine Einladung und keine Stichprobe.
 * Sätze ganz je Fall (übersetzbar, kein Wort per ${} eingesetzt); Zahlenformat nur über zahlDe und das Sprachprofil.
 */
import type { TableItem } from '../engine/types';
import { L, Lp, d } from './sitzung.svelte';
import { zahlDe } from './format';
import { aufzaehlung, zitat } from '../i18n/profil';
import { tabelle, fd, fx, type Z } from './mwsaetze';
import type { Auswahl, FallRegel, Vorschlag } from './fallauswahl';

const z2 = (v: number) => zahlDe(v, 2);

/** Die Überschrift der Regel (ein eigener Eintrag je Regel, nie in einen Satz eingesetzt). */
export function regelTitel(regel: FallRegel): string {
  switch (regel) {
    case 'extrem': return L('Extreme Fälle', 'Extreme cases');
    case 'typisch': return L('Typische Fälle', 'Typical cases');
    case 'abweichend': return L('Abweichende Fälle', 'Deviant cases');
    case 'einflussreich': return L('Einflussreiche Fälle (Cook-Distanz)', 'Influential cases (Cook\'s distance)');
    case 'divers': return L('Diverse Fälle (diverse case selection)', 'Diverse cases (diverse case selection)');
    default: return L('Maximale Variation', 'Maximum variation');
  }
}
/** Der Text neben dem Auswahlknopf: bei den neuen Regeln mit Beschreibung und Fachbegriff, sonst die Überschrift. */
export function regelWahl(regel: FallRegel): string {
  switch (regel) {
    case 'einflussreich': return L('Fälle mit großem Einfluss auf das Modell (einflussreiche Fälle, Cook-Distanz)', 'Cases with a large influence on the model (influential cases, Cook\'s distance)');
    case 'divers': return L('Fälle, die zusammen alle Ausprägungen zeigen (diverse Fälle, diverse case selection)', 'Cases that together show all values (diverse cases, diverse case selection)');
    default: return regelTitel(regel);
  }
}
/** Die Frage hinter der Regel in einem Satz. */
export function regelFrage(regel: FallRegel): string {
  switch (regel) {
    case 'extrem': return L('Wer hat die höchsten oder die niedrigsten Werte?', 'Who has the highest or the lowest values?');
    case 'typisch': return L('Wer liegt in der Mitte?', 'Who is in the middle?');
    case 'abweichend': return L('Wer passt nicht zu dem, was man erwartet hätte?', 'Who does not fit what would have been expected?');
    case 'einflussreich': return L('Welche Fälle verändern das Modell am stärksten, wenn man sie weglässt?', 'Which cases change the model most if they are left out?');
    case 'divers': return L('Welche Fälle zeigen zusammen jede vorkommende Kombination der Kategorien?', 'Which cases together show every combination of categories that occurs?');
    default: return L('Wer deckt die Bandbreite ab?', 'Who covers the whole range?');
  }
}

/** Oben über der Tabelle: welche Regel für welche Spalten, mit n und der Zahl der wegen fehlender Werte ausgeschlossenen Fälle. */
export function kopfSatz(a: Auswahl, namen: string[]): string {
  const n = a.n, m = a.ausgeschlossen, k = a.k, sp = zitat(namen[0] ?? ''), alle = aufzaehlung(namen.map(zitat)), x = aufzaehlung(namen.slice(1).map(zitat));
  const ende = L(`n = ${n}; ausgeschlossen wegen fehlender Werte: ${m}.`, `n = ${n}; excluded because of missing values: ${m}.`);
  switch (a.regel) {
    case 'extrem': return `${Lp(k, `Vorschlag nach der Regel „Extrem“ für die Spalte ${sp}: der höchste und der niedrigste Wert.`, `Vorschlag nach der Regel „Extrem“ für die Spalte ${sp}: die ${k} höchsten und die ${k} niedrigsten Werte.`, `Suggestion by the rule "extreme" for the column ${sp}: the highest and the lowest value.`, `Suggestion by the rule "extreme" for the column ${sp}: the ${k} highest and the ${k} lowest values.`)} ${ende}`;
    case 'typisch': return `${namen.length > 1
      ? Lp(k, `Vorschlag nach der Regel „Typisch“ für die Spalten ${alle}: der Fall mit der kleinsten Mahalanobis-Distanz (D²) zum Mittelwertvektor.`, `Vorschlag nach der Regel „Typisch“ für die Spalten ${alle}: die ${k} Fälle mit der kleinsten Mahalanobis-Distanz (D²) zum Mittelwertvektor.`, `Suggestion by the rule "typical" for the columns ${alle}: the case with the smallest Mahalanobis distance (D²) from the vector of means.`, `Suggestion by the rule "typical" for the columns ${alle}: the ${k} cases with the smallest Mahalanobis distance (D²) from the vector of means.`)
      : Lp(k, `Vorschlag nach der Regel „Typisch“ für die Spalte ${sp}: der Fall mit dem kleinsten Abstand zum Median.`, `Vorschlag nach der Regel „Typisch“ für die Spalte ${sp}: die ${k} Fälle mit dem kleinsten Abstand zum Median.`, `Suggestion by the rule "typical" for the column ${sp}: the case with the smallest distance from the median.`, `Suggestion by the rule "typical" for the column ${sp}: the ${k} cases with the smallest distance from the median.`)} ${ende}`;
    case 'abweichend': return `${Lp(k, `Vorschlag nach der Regel „Abweichend“ für die Zielspalte ${sp} (vorhergesagt aus ${x}): der Fall mit dem größten positiven und der Fall mit dem größten negativen studentisierten Residuum.`, `Vorschlag nach der Regel „Abweichend“ für die Zielspalte ${sp} (vorhergesagt aus ${x}): die ${k} Fälle mit den größten positiven und die ${k} mit den größten negativen studentisierten Residuen.`, `Suggestion by the rule "deviant" for the target column ${sp} (predicted from ${x}): the case with the largest positive and the case with the largest negative studentized residual.`, `Suggestion by the rule "deviant" for the target column ${sp} (predicted from ${x}): the ${k} cases with the largest positive and the ${k} with the largest negative studentized residuals.`)} ${ende}`;
    case 'einflussreich': return `${Lp(k, `Vorschlag nach der Regel „Einflussreich“ für die Zielspalte ${sp} (vorhergesagt aus ${x}): der Fall mit der größten Cook-Distanz (D).`, `Vorschlag nach der Regel „Einflussreich“ für die Zielspalte ${sp} (vorhergesagt aus ${x}): die ${k} Fälle mit der größten Cook-Distanz (D).`, `Suggestion by the rule "influential" for the target column ${sp} (predicted from ${x}): the case with the largest Cook's distance (D).`, `Suggestion by the rule "influential" for the target column ${sp} (predicted from ${x}): the ${k} cases with the largest Cook's distance (D).`)} ${ende}`;
    case 'divers': return `${L(`Vorschlag nach der Regel „Divers“ für die Spalten ${alle}: je Kombination der Kategorien ein Fall, die häufigsten Kombinationen zuerst.`, `Suggestion by the rule "diverse" for the columns ${alle}: one case per combination of categories, the most frequent combinations first.`)} ${ende}`;
    default: return `${Lp(k, `Vorschlag nach der Regel „Maximale Variation“ für die Spalten ${alle}: der Fall, der am weitesten vom Schwerpunkt entfernt liegt (Farthest-first auf z-Werten).`, `Vorschlag nach der Regel „Maximale Variation“ für die Spalten ${alle}: ${k} Fälle, die möglichst weit voneinander entfernt liegen (Farthest-first auf z-Werten).`, `Suggestion by the rule "maximum variation" for the columns ${alle}: the case that lies farthest from the centre (farthest-first on z values).`, `Suggestion by the rule "maximum variation" for the columns ${alle}: ${k} cases that lie as far apart from each other as possible (farthest-first on z values).`)} ${ende}`;
  }
}
/** Der Satz, wenn die Zahl je Liste begrenzt wurde: Bei zwei Listen (hoch und tief, besser und schlechter) darf derselbe Fall nicht in beiden stehen. */
export function begrenztSatz(n: number, k: number, gewuenscht: number): string {
  return Lp(k, `Es gibt nur ${n} Fälle mit allen Angaben. Darum wird je Liste 1 Fall vorgeschlagen (gewünscht waren ${gewuenscht}); sonst stünde derselbe Fall in beiden Listen.`, `Es gibt nur ${n} Fälle mit allen Angaben. Darum werden je Liste ${k} Fälle vorgeschlagen (gewünscht waren ${gewuenscht}); sonst stünde derselbe Fall in beiden Listen.`,
    `There are only ${n} cases with all values. So 1 case is suggested per list (${gewuenscht} were wanted); otherwise the same case would appear in both lists.`, `There are only ${n} cases with all values. So ${k} cases are suggested per list (${gewuenscht} were wanted); otherwise the same case would appear in both lists.`);
}
export const gleichstandSatz = () => L('Bei gleichen Werten wurde nach der Zeilennummer entschieden.', 'Where values were equal, the row number decided.');
export const fussSatz = () => L('Das ist ein Vorschlag nach einer Rechenregel, keine Bewertung der Personen und keine Einladung.', 'This is a suggestion by a calculation rule, not an assessment of the people and not an invitation.');
export const einwilligungSatz = () => L('Nur Personen ansprechen, die dem zugestimmt haben.', 'Only approach people who have agreed to it.');
export const wiedererkennungSatz = () => L('Wenige Werte in Kombination können Personen wiedererkennbar machen. Weitere Spalten wie Alter oder Schule nur zeigen, wenn es nötig ist.', 'A few values in combination can make people recognizable. Only show further columns such as age or school if necessary.');
export const stichprobeSatz = () => L('Gezielt ausgewählte Fälle sind keine Zufallsstichprobe. Aus ihnen folgt nichts für alle Befragten.', 'Cases picked on purpose are not a random sample. Nothing follows from them for all respondents.');
export const klarnameSatz = (spalte: string) => L(`Die Kennungsspalte ${zitat(spalte)} sieht nach Namen oder Kontaktdaten aus. Statable listet Klarnamen nie von selbst und zeigt hier nur die Zeilennummern.`, `The ID column ${zitat(spalte)} looks like names or contact details. Statable never lists real names by itself and shows only the row numbers here.`);

/** Was zur Regel noch zu sagen ist (Falle der Regel), je ein ganzer Satz. */
export function regelHinweis(regel: FallRegel): string {
  switch (regel) {
    case 'extrem': return L('Extreme Werte enthalten mehr Messfehler und liegen bei einer zweiten Messung meist näher an der Mitte. Der Rechenwert z sagt, wie weit ein Wert vom Mittelwert entfernt liegt, nicht, wie interessant der Fall ist.', 'Extreme values contain more measurement error and are usually closer to the middle at a second measurement. The value z says how far a value lies from the mean, not how interesting the case is.');
    case 'typisch': return L('Wer in einer Spalte typisch ist, muss es in einer anderen nicht sein. Mit mehreren Spalten zählt der Abstand zum Mittelwertvektor (D²).', 'Whoever is typical in one column does not have to be in another. With several columns the distance from the vector of means (D²) counts.');
    case 'abweichend': return L('Das studentisierte Residuum sagt, wie weit der Wert über oder unter dem liegt, was die Regression aus den anderen Spalten vorhersagt. „Besser als erwartet“ und „schlechter als erwartet“ beschreiben nur diese Rechnung.', 'The studentized residual says how far the value lies above or below what the regression predicts from the other columns. "Better than expected" and "worse than expected" only describe this calculation.');
    case 'einflussreich': return L('Die Cook-Distanz D sagt, wie stark sich die Regression ändert, wenn ein Fall fehlt. Sie ist groß bei Fällen, die ungewöhnliche Werte in den vorhersagenden Spalten haben (Hebelwert) und zugleich weit von der Vorhersage entfernt liegen (Rest). Ein einflussreicher Fall ist nicht automatisch ein Fehler.', 'Cook\'s distance D says how much the regression changes if a case is missing. It is large for cases with unusual values in the predicting columns (leverage) that also lie far from the prediction (residual). An influential case is not automatically an error.');
    case 'divers': return L('Jede Kombination der Kategorien, die vorkommt, ist eine Zelle. Je Zelle wird ein Fall vorgeschlagen: der mit der kleinsten Zeilennummer (feste Regel, kein Zufall). Zellen mit mehr Fällen stehen zuerst. Auch Kombinationen, die nicht vorkommen, werden genannt.', 'Every combination of categories that occurs is a cell. One case is suggested per cell: the one with the smallest row number (fixed rule, not chance). Cells with more cases come first. Combinations that do not occur are named as well.');
    default: return L('Die Regel beginnt mit dem Fall, der am weitesten vom Schwerpunkt entfernt liegt, und nimmt danach immer den Fall, der den bisher gewählten am wenigsten gleicht. Alle Spalten zählen gleich viel (z-Werte).', 'The rule starts with the case that lies farthest from the centre and then always takes the case that is least like those chosen so far. All columns count equally (z values).');
  }
}
export function fehlerSatz(f: NonNullable<Auswahl['fehler']>): string {
  switch (f) {
    case 'keine-faelle': return L('Kein Fall hat in allen gewählten Spalten einen Wert.', 'No case has a value in all chosen columns.');
    case 'zu-wenige-werte': return L('Die erste Spalte hat weniger als 3 verschiedene Werte. Daraus lässt sich keine Rangfolge bilden: Es gibt zu viele Gleichstände.', 'The first column has fewer than 3 different values. No order can be formed from it: there are too many ties.');
    case 'regression-unmoeglich': return L('Die Regression ist mit diesen Spalten und dieser Fallzahl nicht möglich: Es gibt zu wenige Fälle, oder zwei Spalten gleichen einander.', 'The regression is not possible with these columns and this number of cases: there are too few cases, or two columns are alike.');
    default: return L('Die Abstände lassen sich nicht berechnen, weil die Spalten einander zu stark gleichen.', 'The distances cannot be calculated because the columns are too much alike.');
  }
}
/** Hinweise unter der Tabelle (ganze Sätze mit Zahlen). */
export function hinweisSaetze(a: Auswahl, benenne?: (spalte: number, code: number) => string): string[] {
  const t: string[] = [];
  if (a.regel === 'einflussreich' && a.extra.ueber4n !== undefined) {
    const m = a.extra.ueber4n, g = zahlDe(a.extra.grenze4n ?? 0, 3);
    t.push(Lp(m, `${m} Fall liegt über 4/n = ${g}. Das ist eine Daumenregel (Bollen & Jackman 1990), keine feste Grenze.`, `${m} Fälle liegen über 4/n = ${g}. Das ist eine Daumenregel (Bollen & Jackman 1990), keine feste Grenze.`, `${m} case lies above 4/n = ${g}. This is a rule of thumb (Bollen & Jackman 1990), not a fixed limit.`, `${m} cases lie above 4/n = ${g}. This is a rule of thumb (Bollen & Jackman 1990), not a fixed limit.`));
    t.push(a.extra.ueber1 ? L('Mindestens ein Fall liegt über 1. Das ist eine Daumenregel (Cook & Weisberg 1982), keine feste Grenze.', 'At least one case lies above 1. This is a rule of thumb (Cook & Weisberg 1982), not a fixed limit.')
      : L('Kein Fall liegt über 1. Das ist eine Daumenregel (Cook & Weisberg 1982), keine feste Grenze.', 'No case lies above 1. This is a rule of thumb (Cook & Weisberg 1982), not a fixed limit.'));
  }
  if (a.hinweise.includes('hebel-eins')) {
    const z = a.extra.hebelEins ?? [];
    t.push(Lp(z.length, `Bei Zeile ${z.join(', ')} ist der Hebelwert 1: Das Modell geht genau durch diesen Fall. Die Cook-Distanz ist dort nicht bestimmt, der Fall steht nicht in der Rangfolge.`, `Bei den Zeilen ${z.join(', ')} ist der Hebelwert 1: Das Modell geht genau durch diese Fälle. Die Cook-Distanz ist dort nicht bestimmt, diese Fälle stehen nicht in der Rangfolge.`,
      `For row ${z.join(', ')} the leverage is 1: the model passes exactly through this case. Cook's distance is not defined there, the case is not in the ranking.`, `For rows ${z.join(', ')} the leverage is 1: the model passes exactly through these cases. Cook's distance is not defined there, these cases are not in the ranking.`));
  }
  if (a.hinweise.includes('zellen-mehr-als-k')) t.push(Lp(a.k, `Es gibt ${a.extra.zellen} Kombinationen; gezeigt wird die häufigste.`, `Es gibt ${a.extra.zellen} Kombinationen; gezeigt werden die ${a.k} häufigsten.`, `There are ${a.extra.zellen} combinations; the most frequent one is shown.`, `There are ${a.extra.zellen} combinations; the ${a.k} most frequent are shown.`));
  if (a.regel === 'divers' && a.extra.leer?.length) {
    const alle = a.extra.leer.map(c => c.map((v, j) => (benenne ? benenne(j, v) : String(v))).join(' / ')), gezeigt = alle.slice(0, 10), rest = alle.length - gezeigt.length;
    t.push(`${L('Diese Kombinationen kommen nicht vor:', 'These combinations do not occur:')} ${gezeigt.join('; ')}${rest > 0 ? L(` (und ${rest} weitere)`, ` (and ${rest} more)`) : ''}.`);
  }
  if (a.hinweise.includes('gleichstaende')) t.push(`${gleichstandSatz()} ${L('Die Spalte „Weitere“ nennt, wie viele andere Fälle denselben Rechenwert haben.', 'The column "Others" says how many other cases have the same value.')}`);
  if (a.extra.anzahlMax !== undefined) t.push(L(`Fälle mit dem höchsten Wert: ${a.extra.anzahlMax}; Fälle mit dem niedrigsten Wert: ${a.extra.anzahlMin}.`, `Cases with the highest value: ${a.extra.anzahlMax}; cases with the lowest value: ${a.extra.anzahlMin}.`));
  if (a.hinweise.includes('n-klein')) t.push(L(`Es gibt nur ${a.n} Fälle mit allen Angaben. Die Vorschläge decken dann fast alle Fälle ab und sagen wenig.`, `There are only ${a.n} cases with all values. The suggestions then cover almost all cases and say little.`));
  if (a.hinweise.includes('viele-gewaehlt')) {
    const m = new Set(a.vorschlaege.map(v => v.zeile)).size;
    t.push(L(`Mehr als die Hälfte der Fälle wird vorgeschlagen (${m} von ${a.n}). Dann trennt die Regel kaum noch zwischen den Fällen.`, `More than half of the cases are suggested (${m} of ${a.n}). The rule then hardly separates the cases.`));
  }
  return t;
}

/** Die Begründung zu einer Zeile: warum dieser Fall vorgeschlagen wird (ganzer Satz). */
export function begruendung(a: Auswahl, v: Vorschlag): string {
  const r = v.rang;
  switch (a.regel) {
    case 'einflussreich': return L(`Einfluss auf das Modell: Cook-Distanz D = ${zahlDe(v.wert, 3)}.`, `Influence on the model: Cook's distance D = ${zahlDe(v.wert, 3)}.`);
    case 'divers': return v.weitere === 0 ? L('1 Fall in dieser Kombination.', '1 case in this combination.')
      : Lp(v.weitere, `${v.wert} Fälle in dieser Kombination, 1 weiterer neben diesem Fall.`, `${v.wert} Fälle in dieser Kombination, ${v.weitere} weitere neben diesem Fall.`, `${v.wert} cases in this combination, 1 other besides this one.`, `${v.wert} cases in this combination, ${v.weitere} others besides this one.`);
    case 'extrem': return v.richtung === 'hoch'
      ? L(`Höchster Wert Nr. ${r}: z = ${z2(v.wert)}.`, `Highest value no. ${r}: z = ${z2(v.wert)}.`)
      : L(`Niedrigster Wert Nr. ${r}: z = ${z2(v.wert)}.`, `Lowest value no. ${r}: z = ${z2(v.wert)}.`);
    case 'typisch': return v.rohwert !== null
      ? L(`Abstand zum Median ${zahlDe(a.extra.median ?? 0)}: ${z2(v.wert)}.`, `Distance from the median ${zahlDe(a.extra.median ?? 0)}: ${z2(v.wert)}.`)
      : L(`Abstand zum Mittelwertvektor: D² = ${zahlDe(v.wert, 3)}.`, `Distance from the vector of means: D² = ${zahlDe(v.wert, 3)}.`);
    case 'abweichend': return v.richtung === 'besser'
      ? L(`Besser als erwartet: Rest ${z2(v.rohwert ?? 0)}, studentisiertes Residuum ${z2(v.wert)}.`, `Better than expected: residual ${z2(v.rohwert ?? 0)}, studentized residual ${z2(v.wert)}.`)
      : L(`Schlechter als erwartet: Rest ${z2(v.rohwert ?? 0)}, studentisiertes Residuum ${z2(v.wert)}.`, `Worse than expected: residual ${z2(v.rohwert ?? 0)}, studentized residual ${z2(v.wert)}.`);
    default: return r === 1
      ? L(`Start: größter Abstand zum Schwerpunkt (${z2(v.wert)} in z-Einheiten).`, `Start: largest distance from the centre (${z2(v.wert)} in z units).`)
      : L(`Kleinster Abstand zu den bisher Gewählten: ${z2(v.wert)} in z-Einheiten, der größte unter allen Fällen.`, `Smallest distance from those chosen so far: ${z2(v.wert)} in z units, the largest among all cases.`);
  }
}
const listenName = (v: Vorschlag): string => {
  switch (v.richtung) {
    case 'hoch': return L('höchste Werte', 'highest values');
    case 'tief': return L('niedrigste Werte', 'lowest values');
    case 'besser': return L('besser als erwartet', 'better than expected');
    case 'schlechter': return L('schlechter als erwartet', 'worse than expected');
    default: return L('Vorschlag', 'Suggestion');
  }
};

/** Eine Zeile der Tabelle für die Anzeige. `kennung`: die Kennung des Falls (oder die Zeilennummer), `weitere`: Werte weiterer Spalten, die die Person ausdrücklich gewählt hat. */
export interface Zeile { v: Vorschlag; kennung: string; weitere: string[]; /** divers: die Kombination der Kategorien dieses Falls */ kombi?: string }
/** Der Kopf der Spalte mit der Kennzahl: bei den neuen Regeln mit Namen. */
export const rechenwertSpalte = (regel?: FallRegel): string => (regel === 'einflussreich' ? L('Cook-Distanz D', 'Cook\'s distance D') : regel === 'divers' ? L('Fallzahl der Zelle', 'Cases in the cell') : L('Rechenwert', 'Calculated value'));
/** Die Kennzahl der Zeile als Text (Cook-Distanz mit 3 Stellen, Fallzahl ganz). */
export const kennzahlText = (a: Auswahl, v: Vorschlag): string => zahlDe(v.wert, a.regel === 'divers' ? 0 : a.regel === 'einflussreich' || (a.regel === 'typisch' && v.rohwert === null) ? 3 : 2);
/** Der Satz unter beiden neuen Regeln. */
export const festeRegelnSatz = () => d('Das ist ein Vorschlag nach festen Regeln. Ob die Fälle für deine Frage passen, entscheidest du.', 'Das ist ein Vorschlag nach festen Regeln. Ob die Fälle für Ihre Frage passen, entscheiden Sie.', 'This is a suggestion by fixed rules. You decide whether the cases fit your question.');
/** Die Tabelle des Vorschlags (nur Kennung und Rechenwerte): Liste · Rang · Kennung · Rechenwert · Wert · Weitere · Begründung. Nichts wird gewertet. */
export function tabelleAuswahl(a: Auswahl, zeilen: Zeile[], weitereKoepfe: string[] = []): TableItem {
  const wert = (v: Vorschlag): Z => (a.regel === 'divers' ? fd(v.wert) : a.regel === 'einflussreich' || (a.regel === 'typisch' && v.rohwert === null) ? fx(v.wert, 3) : fx(v.wert, 2));
  const mitKombi = a.regel === 'divers';
  const kopf = [L('Liste', 'List'), L('Rang', 'Rank'), L('Kennung', 'ID'), ...(mitKombi ? [L('Kombination', 'Combination')] : []), rechenwertSpalte(a.regel), L('Wert', 'Value'), L('Weitere', 'Others'), ...weitereKoepfe, L('Begründung', 'Reason')];
  const rows: Z[][] = zeilen.map(({ v, kennung, weitere, kombi }) => [listenName(v), fd(v.rang), kennung, ...(mitKombi ? [kombi ?? ''] : []), wert(v), v.rohwert === null ? '-' : fx(v.rohwert, 2), fd(v.weitere), ...weitere, begruendung(a, v)]);
  return tabelle('Interview-Vorschlag', regelTitel(a.regel), kopf, rows, [fussSatz(), stichprobeSatz(), ...(a.regel === 'einflussreich' || a.regel === 'divers' ? [festeRegelnSatz()] : []), ...(a.hinweise.includes('gleichstaende') ? [gleichstandSatz()] : [])]);
}
/** Der Satz für den Methodenteil: welche Regel mit welchen Spalten, ohne Namen von Personen. */
export function methodenSatz(a: Auswahl, namen: string[]): string {
  return L(`Für die Interviews wurden Fälle nach einer Rechenregel vorgeschlagen. ${kopfSatz(a, namen)} ${gleichstandSatz()} ${fussSatz()}`,
    `Cases for the interviews were suggested by a calculation rule. ${kopfSatz(a, namen)} ${gleichstandSatz()} ${fussSatz()}`);
}
