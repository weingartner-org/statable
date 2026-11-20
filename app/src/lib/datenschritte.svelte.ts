/**
 * Datenänderungen, die nicht über einen PSPP-Befehl laufen, aber in Vorlagen wiederholt werden können (Abschnitt 6, Teil B):
 * dieselben Funktionen rufen die Oberfläche (von Hand) und der Vorlage-Lauf auf - es gibt keinen zweiten Rechenweg.
 */
import { s, L, melde, aendereDaten } from './sitzung.svelte';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { lesbar } from './verzeichnis';
import { sortiereDauerhaft, type SortSchluessel } from './datenassistentc';
import { fehlerSatz } from './datenassistentsaetze';

/** Eine Spalte aus den Daten entfernen (ein Rückgängig-Schritt). `false`, wenn es sie nicht gibt oder das Neuaufbauen scheitert. */
export async function entferneSpalte(name: string): Promise<boolean> {
  const i = s.spalten.findIndex(x => x.name === name);
  if (i < 0) return false;
  const sp = s.spalten[i]!;
  return aendereDaten(L(`Spalte „${lesbar(sp, true)}“ entfernt`, `Column "${lesbar(sp, true)}" removed`), $state.snapshot(s.spalten).filter((_, j) => j !== i), s.zeilen.map(z => z.filter((_, j) => j !== i)) as Wert[][], false,
    { art: 'spalteWeg', wiederhol: { typ: 'spalteWeg', name: sp.name } });
}

/** „Dauerhaft sortieren“ (Daten bearbeiten, Sortieren): ein Rückgängig-Schritt. `altName`: Name der Spalte mit der alten Zeilennummer, falls gewünscht. Gibt den Satz für die Meldung zurück oder wirft den Fehler des Assistenten. */
export async function sortiereDauerhaftAn(schluessel: SortSchluessel[], altName: string | null): Promise<{ befehl: string; hinweis: string }> {
  const daten = { spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] };
  const r = sortiereDauerhaft(daten, schluessel, altName ? { altNummer: altName } : {});
  await aendereDaten(r.befehl, r.daten.spalten, r.daten.zeilen, true, { art: 'sortieren', wiederhol: { typ: 'sortieren', schluessel: schluessel.map(k => ({ spalte: k.spalte, richtung: k.richtung, natuerlich: !!k.natuerlich })), altName } });
  return { befehl: r.befehl, hinweis: r.hinweis };
}

/** Wie `sortiereDauerhaftAn`, mit Meldung - für die Oberfläche. */
export async function sortiereMitMeldung(schluessel: SortSchluessel[], altName: string | null) {
  try { const r = await sortiereDauerhaftAn(schluessel, altName); melde(`${r.befehl}. ${r.hinweis}`, true); } catch (f) { melde(fehlerSatz(f)); }
}
