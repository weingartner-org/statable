import { s } from './sitzung.svelte';

/** Fortlaufende Tabellennummer in dieser Arbeit (Abnahme 4, B8): Wer nacheinander Tabellen aus verschiedenen Blättern kopiert, bekommt Tabelle 1, 2, 3 - nicht dreimal 1.
 *  Dieselbe Tabelle behält ihre Nummer. Eine neue Arbeit beginnt wieder bei 1. In Word lässt sich die Nummer immer anpassen.
 *  Prüfung G7: Der Titel allein reicht nicht - „Deskriptive Statistiken“ gibt es in vielen Blättern, und das sind verschiedene Tabellen.
 *  Darum zählt die Tabelle selbst (`quelle`, das Ergebnis-Element); ohne `quelle` gilt der Titel. */
let nummern = new Map<string, number>(), eigene = new WeakMap<object, number>(), zaehler = 0, nummernProjekt: string | null = null;
export function tabellenNummer(titel: string, quelle?: object): number {
  const p = s.projekt?.id ?? '';
  if (p !== nummernProjekt) { nummernProjekt = p; nummern = new Map(); eigene = new WeakMap(); zaehler = 0; }
  if (quelle) { let n = eigene.get(quelle); if (!n) { n = ++zaehler; eigene.set(quelle, n); } return n; }
  let n = nummern.get(titel); if (!n) { n = ++zaehler; nummern.set(titel, n); }
  return n;
}
