/**
 * Hilfe-Artikel einklappen (30.10.2026): Abschnitte sind Gruppen von Blöcken, jede beginnt mit einer Zwischenüberschrift (die erste kann ohne sein).
 * `trefferAbschnitte` sagt, welche Abschnitte sich öffnen, wenn man aus der Suche kommt: die mit den meisten Suchwörtern (mindestens eins).
 */
import { artikelText, type Block } from './kern';
import { glatt } from './suche';

export const istUeberschrift = (b: Block): b is { h: string } => typeof b === 'object' && 'h' in b;

/** Der Baustein „Zum Mitnehmen“ steht am Ende und bleibt offen: er beginnt einen eigenen Abschnitt ohne Überschrift (sonst läge er im eingeklappten „Quellen“). */
const istMitnehmen = (b: Block) => typeof b === 'object' && 'mitnehmen' in b;
/** Teilt Blöcke an den Zwischenüberschriften. */
export function abschnitte(bl: Block[]): Block[][] {
  const aus: Block[][] = [];
  for (const b of bl) { if (istUeberschrift(b) || istMitnehmen(b) || !aus.length) aus.push([]); aus.at(-1)!.push(b); }
  return aus;
}

/** Nummern der eingeklappten Abschnitte mit den meisten Suchwörtern; leer, wenn die Suche leer ist oder nichts trifft. */
export function trefferAbschnitte(gruppen: Block[][], frage: string, offen: string[]): Set<number> {
  const w = [...new Set(glatt(frage).match(/[\p{L}\p{N}]{3,}/gu) ?? [])];
  if (!w.length) return new Set();
  const punkte = gruppen.map(g => { const k = g[0]; if (!k || !istUeberschrift(k) || offen.includes(k.h)) return 0; const t = glatt(artikelText({ id: '', bereich: 'start', titel: '', stichwoerter: [], inhalt: g, verwandt: [] })); return w.filter(x => t.includes(x)).length; });
  const m = Math.max(0, ...punkte);
  return new Set(m ? punkte.flatMap((p, i) => (p === m ? [i] : [])) : []);
}
