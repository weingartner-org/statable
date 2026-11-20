/**
 * Zusammenstellung des Abschlusstests aus den Einheitsfragen (rein): je Einheit mit Fragen eine zufällige Frage, höchstens `MAX_AUTO` Einheiten,
 * in der Reihenfolge des Pfads. Einheiten ohne Fragen werden übersprungen. Gilt für feste und eigene Pfade (`bausteine/PfadAbschluss.svelte`).
 */
import { mische } from './fragen';
import { einheitNach, type Pfad } from './lernplan';

export const MAX_AUTO = 15;

export function stelleZusammen(p: Pick<Pfad, 'einheiten'>, rnd: () => number): string[] {
  const treffer = p.einheiten.map(id => einheitNach(id)).filter(e => !!e?.fragen.length)
    .map(e => ({ id: e!.id, frage: mische(e!.fragen, rnd)[0]! }));
  const gewaehlt = new Set(mische(treffer, rnd).slice(0, MAX_AUTO).map(t => t.id));
  return treffer.filter(t => gewaehlt.has(t.id)).map(t => t.frage);
}
