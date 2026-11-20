/**
 * Lesemodus der Datentabelle (Barrierefreiheit Welle 3): Seiten zu 50 Zeilen als echte Tabelle statt der virtuellen.
 * Wird in `seiten/Daten.svelte` am Knopf geschaltet und gemerkt (nur in diesem Browser).
 * Einstellungs-Schlüssel für später (wenn es in `s.einst` wandern soll): `datenLesemodus` (boolean, Vorgabe aus).
 */
/** Bis zu so vielen Zellen (Zeilen mal Spalten) wird die Datentabelle ganz gezeichnet; darüber ist sie virtuell und der Lesemodus bleibt als Reserve. */
export const ALLES_BIS_ZELLEN = 20000;

const SCHLUESSEL = 'statable.datenLesemodus';

function lies(): boolean {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem(SCHLUESSEL) === '1'; } catch { return false; }
}

/** `anfrage` zählt, wie oft jemand von außen (Befehlspalette) den Lesemodus verlangt hat; die Datenseite reagiert darauf. */
export const lesemodus = $state({ an: lies(), anfrage: 0 });

export function setzeLesemodus(an: boolean): void {
  lesemodus.an = an;
  try { localStorage.setItem(SCHLUESSEL, an ? '1' : '0'); } catch { /* ohne Speicher: gilt nur bis zum Neuladen */ }
}

/** Von außen verlangt (Befehlspalette): Lesemodus an, und die Datenseite räumt das Eingeben weg. */
export function verlangeLesemodus(): void {
  setzeLesemodus(true);
  lesemodus.anfrage++;
}
