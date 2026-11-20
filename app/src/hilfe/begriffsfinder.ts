/**
 * Findet Begriffe der Hilfe (Glossar, über 1.400) in einem beliebigen Text (Johannes 31.10.: jeder Text der App verlinkt sie).
 * Rein und ohne DOM, damit der Verlinker (`lib/begriffsverlinker.ts`) und die Tests dasselbe benutzen.
 * Der Index ordnet die Begriffe nach ihrem ersten Wort; geprüft wird nur an Wortanfängen.
 */
import { kandidaten, type Kandidat } from './verlinken';

export interface Fund { von: number; bis: number; id: string }
export interface BegriffsIndex { nachWort: Map<string, { id: string; woerter: string[]; laenge: number }[]>; endungen: string[] }

/** Deutsche Beugung: „Mittelwerte“, „Mittelwertes“, „Varianzen“ gehören zum Begriff. Andere Sprachen: nur das ganze Wort. */
const ENDUNGEN_DE = ['e', 'en', 'es', 'er', 'n', 's'];

const wortRe = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
const klein = (t: string) => t.toLocaleLowerCase();

export function baueIndex(liste: { id: string; titel: string }[], sprache: string): BegriffsIndex {
  const nachWort: BegriffsIndex['nachWort'] = new Map();
  for (const k of kandidaten(liste)) {
    const woerter = klein(k.wort).match(wortRe);
    if (!woerter?.length || !/^\p{L}/u.test(woerter[0]!)) continue;
    // Zeichen, die beim Zerlegen wegfallen (%, ‰, /, =, +), würden den Begriff verfälschen: aus „% and ‰“ bliebe nur „and“ (Mac-Befund M1, 14.11.). Solche Titel bleiben weg.
    if (klein(k.wort).replace(wortRe, '').replace(/[\s.]/gu, '') !== '') continue;
    const l = nachWort.get(woerter[0]!) ?? [];
    l.push({ id: k.id, woerter, laenge: k.wort.length });
    nachWort.set(woerter[0]!, l);
  }
  for (const l of nachWort.values()) l.sort((a, b) => b.laenge - a.laenge);
  return { nachWort, endungen: sprache === 'de' ? ENDUNGEN_DE : [] };
}

/** Funde in einem Text: von links nach rechts, jedes Vorkommen jedes Begriffs, auch wenn er mehrmals steht (Johannes 2.11.: sonst verwirrt es); `max` nur für Tests (längster Treffer gewinnt, keine Überlappung). */
export function finde(text: string, ix: BegriffsIndex, ausser?: string, max = Infinity): Fund[] {
  if (text.length < 5) return [];
  const funde: Fund[] = [];
  const woerter = [...text.matchAll(wortRe)].map(m => ({ w: klein(m[0]), von: m.index!, bis: m.index! + m[0].length }));
  for (let i = 0; i < woerter.length && funde.length < max; i++) {
    const kand = ix.nachWort.get(woerter[i]!.w) ?? sucheMitEndung(woerter[i]!.w, ix);
    if (!kand) continue;
    for (const k of kand) {
      if (k.id === ausser) continue;
      const n = k.woerter.length, letztes = woerter[i + n - 1];
      if (!letztes) continue;
      let ok = true;
      for (let j = 0; j < n - 1; j++) if (woerter[i + j]!.w !== k.woerter[j] || text.slice(woerter[i + j]!.bis, woerter[i + j + 1]!.von).trim() !== '') { ok = false; break; }
      if (!ok) continue;
      const lw = letztes.w, soll = k.woerter[n - 1]!;
      if (lw !== soll && !(ix.endungen.some(e => lw === soll + e))) continue;
      funde.push({ von: woerter[i]!.von, bis: letztes.bis, id: k.id });
      i += n - 1; break;
    }
  }
  return funde;
}
/** Wort mit deutscher Endung: „Mittelwerte“ findet die Begriffe, die mit „mittelwert“ beginnen. */
function sucheMitEndung(w: string, ix: BegriffsIndex) {
  for (const e of ix.endungen) if (w.endsWith(e) && w.length - e.length >= 4) { const l = ix.nachWort.get(w.slice(0, -e.length)); if (l) return l; }
  return undefined;
}
export type { Kandidat };
