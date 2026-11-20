/** Sätze und Beschriftungen zur Rückwärts-Eliminierung (Field-Stufe 3b). Jeder Satz ein ganzer fester Text in `L(de, en)`, keine Du-Form. */
import { L } from './sitzung.svelte';
import { komma, pWert } from './ergebnis';
import { logTermName } from './loglinear';
import type { RueckErgebnis } from './loglinrueck';

/** Wichtig: Die automatische Suche ist zufallsabhängig. */
export const rueckZufall = () => L(
  'Eine automatische Suche ist zufallsabhängig: Sie reagiert auf die Zufallsschwankung dieser einen Stichprobe und auf das gewählte Kriterium. Mit anderen Daten oder einem anderen Kriterium kann ein anderes Modell herauskommen. Das Endmodell ist ein Vorschlag, den die Sachfrage stützen muss; seine p-Werte sind zu günstig, weil das Modell aus denselben Daten gesucht wurde.',
  'An automatic search depends on chance: it reacts to the random fluctuation of this one sample and to the chosen criterion. With other data or another criterion a different model can result. The final model is a suggestion that the subject matter must support; its p values are too favourable because the model was searched in the same data.');

export const rueckWas = () => L(
  'Wie SPSS HILOGLINEAR (Rückwärts): Zuerst die K-Weg-Tabelle (ab welcher Ordnung gibt es keine Effekte mehr), dann beginnt die Suche beim Modell mit allen Wechselwirkungen und entfernt Schritt für Schritt den Term mit dem größten p, solange dieses p über dem Kriterium liegt. Es wird hierarchisch gestrichen: ein Term, der in einem höheren enthalten ist, bleibt.',
  'As SPSS HILOGLINEAR (backward): first the K-way table (from which order on there are no effects), then the search starts at the model with all interactions and removes, step by step, the term with the largest p as long as this p is above the criterion. Deletion is hierarchical: a term contained in a higher one stays.');

export const kwegHinweis = () => L(
  'Zeile k, Spalte „k-Weg- und höhere Effekte sind 0“: Passt ein Modell, das nur Effekte unterhalb der Ordnung k enthält? Ein kleines p heißt: Nein, es gibt Effekte der Ordnung k oder höher. Spalte „genau k-Weg-Effekte sind 0“: Gibt es Effekte genau der Ordnung k?',
  'Row k, column "k-way and higher effects are 0": does a model with only effects below order k fit? A small p means: no, there are effects of order k or higher. Column "exactly k-way effects are 0": are there effects of exactly order k?');

export const ordnungName = (k: number) => (k === 1 ? L('1 (Haupteffekte)', '1 (main effects)') : k === 2 ? L('2 (Paare)', '2 (pairs)') : String(k));

export const modellText = (gen: number[][], faktoren: string[], name: (n: string) => string) => gen.map(t => logTermName(t, faktoren, name)).join(', ');

export function rueckSatz(r: RueckErgebnis, faktoren: string[], name: (n: string) => string): string {
  const entf = r.schritte.filter(x => x.entfernt).map(x => logTermName(x.entfernt!, faktoren, name));
  const krit = komma(r.kriterium, 2).replace(/^0/, '');
  const anfang = entf.length
    ? L(`Die Rückwärts-Eliminierung (Kriterium p > ${krit}) entfernte nacheinander: ${entf.join('; ')}.`, `The backward elimination (criterion p > ${krit}) removed in turn: ${entf.join('; ')}.`)
    : L(`Die Rückwärts-Eliminierung (Kriterium p > ${krit}) entfernte nichts: Jeder Term trägt belegbar bei.`, `The backward elimination (criterion p > ${krit}) removed nothing: every term demonstrably contributes.`);
  const ende = r.df === 0
    ? L('Endmodell: gesättigt (alle Wechselwirkungen), G² = 0, df = 0.', 'Final model: saturated (all interactions), G² = 0, df = 0.')
    : L(`Endmodell, erzeugende Terme: ${modellText(r.gen, faktoren, name)}; G² = ${komma(r.g2, 2)}, df = ${komma(r.df, 0)}, p ${pWert(r.p)}. Ein großes p heißt: Das Modell widerspricht den Daten nicht.`,
      `Final model, generating terms: ${modellText(r.gen, faktoren, name)}; G² = ${komma(r.g2, 2)}, df = ${komma(r.df, 0)}, p ${pWert(r.p)}. A large p means: the model does not contradict the data.`);
  return `${anfang} ${ende}`;
}
export const rueckApa = (r: RueckErgebnis) => (r.df === 0 ? 'G²(0) = 0' : `G²(${komma(r.df, 0)}) = ${komma(r.g2, 2)}, p ${pWert(r.p)}`);
