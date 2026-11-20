/**
 * Kleine reine Hilfen für die Oberfläche „Personen unkenntlich machen (Pseudonymisieren)“ (Stufe 5, Paket 5E2).
 * Der Rechenkern steht in `pseudonym.ts` und bleibt unberührt.
 */
import { cpLaenge, cpTeil, positionsKarte, type Dokument, type QualProjekt } from './qualprojekt';
import type { NamensArt, Treffer, TrefferArt } from './pseudonym';

/** Feste Reihenfolge der Gruppen (wie in der Zuordnungsliste). */
export const ART_REIHENFOLGE: TrefferArt[] = ['person', 'ort', 'organisation', 'sonstiges', 'email', 'telefon', 'datum', 'plz', 'adresse', 'url', 'iban'];
export const NAMENS_ARTEN: NamensArt[] = ['person', 'ort', 'organisation', 'sonstiges'];
const istNamensArt = (a: TrefferArt): a is NamensArt => (NAMENS_ARTEN as TrefferArt[]).includes(a);

/** Treffer nach Art gruppiert, in fester Reihenfolge; Arten ohne Treffer fehlen. Innerhalb einer Gruppe bleibt die Reihenfolge. */
export function gruppiere<T extends { art: TrefferArt }>(treffer: T[]): { art: TrefferArt; treffer: T[] }[] {
  return ART_REIHENFOLGE
    .map(art => ({ art, treffer: treffer.filter(t => t.art === art) }))
    .filter(g => g.treffer.length > 0);
}

export interface Kontext { davor: string; treffer: string; danach: string; davorGekuerzt: boolean; danachGekuerzt: boolean }

/** Text um einen Treffer (Positionen in Codepoints): etwa `n` Zeichen davor und danach, Zeilenumbrüche als Leerzeichen. */
export function kontextAusschnitt(text: string, start: number, ende: number, n = 40): Kontext {
  const karte = positionsKarte(text);
  const von = Math.max(0, start - n), bis = Math.min(karte.laenge, ende + n);
  const glatt = (s: string): string => s.replace(/\s+/g, ' ');
  return {
    davor: glatt(cpTeil(text, von, start, karte)),
    treffer: glatt(cpTeil(text, start, ende, karte)),
    danach: glatt(cpTeil(text, ende, bis, karte)),
    davorGekuerzt: von > 0,
    danachGekuerzt: bis < karte.laenge,
  };
}

/** Nummer des Beitrags (ab 1), in dem die Position liegt; nur bei Transkripten, sonst `undefined`. */
export function beitragNr(dok: Pick<Dokument, 'transkript'>, pos: number): number | undefined {
  const a = dok.transkript?.abschnitte;
  if (!a?.length) return undefined;
  const i = a.findIndex(x => pos >= x.start && pos < x.ende);
  return i < 0 ? undefined : i + 1;
}

/** Wie viele Stellen in wie vielen Dokumenten würden ersetzt (nur Treffer mit „an“)? */
export function zaehleAn(treffer: Pick<Treffer, 'an' | 'dokument'>[]): { stellen: number; dokumente: number } {
  const an = treffer.filter(t => t.an);
  return { stellen: an.length, dokumente: new Set(an.map(t => t.dokument)).size };
}

/** Alle Treffer einer Art an- oder abwählen (neue Liste, Eingabe bleibt unverändert). */
export function setzeArt<T extends { art: TrefferArt; an: boolean }>(treffer: T[], art: TrefferArt, an: boolean): T[] {
  return treffer.map(t => (t.art === art ? { ...t, an } : t));
}

/** Die verschiedenen Platzhalter der gewählten Namen-Treffer (zum Umbenennen), je mit dem ersten Klartext und der Zahl der Stellen. */
export function platzhalterListe(treffer: Treffer[]): { ersatz: string; art: NamensArt; klartext: string; stellen: number }[] {
  const m = new Map<string, { ersatz: string; art: NamensArt; klartext: string; stellen: number }>();
  for (const t of treffer) {
    if (!t.an || !istNamensArt(t.art)) continue;
    const z = m.get(t.ersatz);
    if (z) z.stellen++;
    else m.set(t.ersatz, { ersatz: t.ersatz, art: t.art, klartext: t.text, stellen: 1 });
  }
  return [...m.values()];
}

/** Ist der neue Platzhalter brauchbar? Nicht leer, und keinem anderen Platzhalter gleich (sonst würden zwei Personen eine). */
export function pruefeErsatzName(neu: string, alt: string, vorhandene: string[]): 'ok' | 'leer' | 'doppelt' {
  const n = neu.trim();
  if (!n) return 'leer';
  if (n !== alt && vorhandene.includes(n)) return 'doppelt';
  return 'ok';
}

/** Wendet umbenannte Platzhalter (alt → neu) auf die Treffer an; die Eingabe bleibt unverändert. */
export function wendeErsatzAn(treffer: Treffer[], umbenannt: Record<string, string>): Treffer[] {
  return treffer.map(t => {
    const neu = umbenannt[t.ersatz]?.trim();
    return neu && neu !== t.ersatz ? { ...t, ersatz: neu } : t;
  });
}

/** Länge eines Platzhalters in Codepoints (für die Prüfung, dass der Ersatz nie leer ist). */
export const ersatzLaenge = (s: string): number => cpLaenge(s);

/** Die Sprechernamen der Transkripte (ohne die Interview-Rolle), je Name einmal, in der Reihenfolge des ersten Vorkommens. */
export function sprecherNamen(q: Pick<QualProjekt, 'dokumente'> | undefined): string[] {
  const gesehen = new Set<string>(), aus: string[] = [];
  for (const d of q?.dokumente ?? []) {
    for (const s of d.transkript?.sprecher ?? []) {
      const k = s.name.trim().replace(/\s+/g, ' ').toLowerCase();
      if (s.rolle === 'interview' || !k || gesehen.has(k)) continue;
      gesehen.add(k); aus.push(s.name);
    }
  }
  return aus;
}

/** Die gewählten Sprechernamen als Namen der Art Person; `abgewaehlt` enthält die Namen, deren Häkchen fehlt. */
export function gewaehlteSprecher(alle: string[], abgewaehlt: string[]): { text: string; art: 'person' }[] {
  return alle.filter(n => !abgewaehlt.includes(n)).map(text => ({ text, art: 'person' as const }));
}
