/**
 * Gemeinsamer Helfer für die Regel von Johannes (10.10.): Wird etwas nachgeladen oder erzeugt, läuft IMMER die Lade-Animation (bausteine/Rechnet.svelte).
 * Seit der Service Worker Bedarfsteile (Excel, Word, PDF, Hilfe …) erst beim ersten Gebrauch holt, kann das Sekunden dauern.
 * Die Animation erscheint erst nach `VERZOEGERUNG` ms, damit sie bei schnellem Laden nicht flackert - danach bleibt sie, bis alles fertig ist.
 */
export const VERZOEGERUNG = 150;

/** Zustand „läuft“ für einen Knopf oder Bereich: `mit(f)` führt `f` aus, sperrt Doppelklick (`aktiv`) und zeigt die Animation (`sichtbar`). Fehler gehen weiter an den Aufrufer. */
export class Laedt {
  aktiv = $state(false);
  sichtbar = $state(false);
  async mit<T>(f: () => Promise<T> | T): Promise<T | undefined> {
    if (this.aktiv) return undefined;
    this.aktiv = true;
    const uhr = setTimeout(() => (this.sichtbar = true), VERZOEGERUNG);
    try { return await f(); }
    finally { clearTimeout(uhr); this.aktiv = false; this.sichtbar = false; }
  }
}

/** Verzögerte Sichtbarkeit zu einer Bedingung (z. B. „Artikel noch nicht da“). Im Aufbau einer Komponente aufrufen. */
export function verzoegert(aktiv: () => boolean, ms = VERZOEGERUNG) {
  let sicht = $state(false);
  $effect(() => {
    if (!aktiv()) { sicht = false; return; }
    const uhr = setTimeout(() => (sicht = true), ms);
    return () => clearTimeout(uhr);
  });
  return { get an() { return sicht; } };
}
