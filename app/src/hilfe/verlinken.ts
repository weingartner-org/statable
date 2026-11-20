/**
 * Begriffe im Text verlinken. Ohne HTML: der Text wird in Teile zerlegt, die Seite setzt daraus <a>-Elemente
 * (wie bei der Suche, so lässt sich nichts einschleusen). Jedes Vorkommen eines Begriffs wird Link (Johannes 2.11.),
 * nur ganze Wörter, nie der Begriff des Artikels selbst.
 */
import type { Block } from './kern';

export interface Linkteil { text: string; id?: string }
export interface Kandidat { id: string; wort: string }

const MIN_LAENGE = 5;
const maskiere = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Das Titelwort eines Begriffs: der Titel ohne die Klammer („Konfidenzintervall (KI)“ wird „Konfidenzintervall“). */
export const titelwort = (titel: string): string => titel.replace(/\s*\(.*$/, '').trim();

/** Kandidaten aus (id, Titel); kurze und mehrteilige Titel mit Komma oder „und“ bleiben weg. Längste zuerst. */
export function kandidaten(liste: { id: string; titel: string }[], ausser?: string): Kandidat[] {
  return liste
    .map(a => ({ id: a.id, wort: titelwort(a.titel) }))
    .filter(k => k.id !== ausser && k.wort.length >= MIN_LAENGE && !/[,:]| und /.test(k.wort))
    .sort((a, b) => b.wort.length - a.wort.length);
}

/** Zerlegt einen Absatz; `schon` sammelt die verlinkten Begriffe des Abschnitts. */
export function verlinke(text: string, kand: Kandidat[], schon: Set<string>): Linkteil[] {
  const funde: { von: number; bis: number; id: string }[] = [];
  for (const k of kand) {
    for (const m of text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${maskiere(k.wort)}(?![\\p{L}\\p{N}])`, 'giu'))) {
      const von = m.index!, bis = von + m[0].length;
      if (funde.some(f => von < f.bis && bis > f.von)) continue;
      funde.push({ von, bis, id: k.id });
    }
  }
  const gewaehlt = funde.sort((a, b) => a.von - b.von);
  if (!gewaehlt.length) return [{ text }];
  const teile: Linkteil[] = [];
  let pos = 0;
  for (const f of gewaehlt) {
    if (f.von > pos) teile.push({ text: text.slice(pos, f.von) });
    teile.push({ text: text.slice(f.von, f.bis), id: f.id });
    schon.add(f.id);
    pos = f.bis;
  }
  if (pos < text.length) teile.push({ text: text.slice(pos) });
  return teile;
}

/** Ein Abschnitt (Liste von Blöcken): nur Absätze werden verlinkt, Überschriften, Listen, Befehle und APA-Zeilen nie. */
export function verlinkeAbschnitt(bloecke: Block[], kand: Kandidat[]): (Linkteil[] | undefined)[] {
  const schon = new Set<string>();
  return bloecke.map(b => (typeof b === 'string' ? verlinke(b, kand, schon) : undefined));
}
