/**
 * Sprechbarer Text (Barrierefreiheit, B10): NVDA liest η², R², χ² als „… hochgestellte 2“ und × als „Kreuz“ vor (Messung docs/barrierefreiheit/NVDA-REST-B.md).
 * Für alles, was GESPROCHEN wird (Bildtexte, aria-label, Ansagen), schreibt `sprechbar` die Zeichen aus: „Eta-Quadrat“, „R-Quadrat“, „mal“.
 * Der SICHTBARE Text behält das Zeichen. Die Wörter sind feste L-Texte (alle Sprachen über den Katalog).
 */
import { L } from './sitzung.svelte';

/** Name des Buchstabens vor dem Quadratzeichen (Deutsch, Englisch); andere Buchstaben bleiben, wie sie sind. */
const GRIECHISCH: Record<string, () => string> = {
  'η': () => L('Eta', 'eta'), 'ω': () => L('Omega', 'omega'), 'χ': () => L('Chi', 'chi'), 'Δ': () => L('Delta', 'delta'),
  'Χ': () => L('Chi', 'chi'), 'Η': () => L('Eta', 'eta'), 'Ω': () => L('Omega', 'omega')
};
const quadrat = (buchstabe: string): string => {
  const name = GRIECHISCH[buchstabe]?.() ?? buchstabe;
  return L(`${name}-Quadrat`, `${name} squared`);
};

/** Text für die Sprachausgabe: Quadratzeichen und Malzeichen ausgeschrieben; sonst unverändert. */
export function sprechbar(text: string): string {
  if (!/[²×]/.test(text)) return text;
  return text
    // partielles Eta-Quadrat (ηp²)
    .replace(/(?<![\p{L}])ηp²/gu, () => L('partielles Eta-Quadrat', 'partial eta squared'))
    // ΔR², R², η², χ² …: ein Buchstabe, nicht Teil eines Wortes
    .replace(/(?<![\p{L}])(Δ)?(\p{L})²/gu, (_m, delta: string | undefined, b: string) => (delta ? `${L('Delta', 'delta')}-${quadrat(b)}` : quadrat(b)).replace(/^delta-/, 'delta '))
    .replace(/²/g, () => ` ${L('hoch 2', 'squared')}`)
    .replace(/\s*×\s*/g, () => ` ${L('mal', 'times')} `)
    .replace(/\s{2,}/g, ' ').trim();
}
