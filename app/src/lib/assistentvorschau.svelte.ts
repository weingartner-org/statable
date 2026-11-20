/**
 * Vorschau der Daten-Assistenten: rechnet verzögert (Eingaben kommen schnell hintereinander) und verwirft veraltete Läufe.
 * Bei großen Tabellen rechnet die Vorschau nicht von selbst (`AUTO_ZELLEN`), sondern auf Knopfdruck - sonst blockierte jede Eingabe die Seite.
 * Ein Lauf, der Engine-Zeit braucht (Probelauf), zeigt `laeuft` für die Lade-Animation (bausteine/Rechnet.svelte).
 */
export const AUTO_ZELLEN = 400_000;

export class Vorschau<T> {
  wert = $state<T | null>(null);
  laeuft = $state(false);
  fehler = $state<unknown>(null);
  /** Die Vorschau gehört zu Eingaben, die sich seither geändert haben (große Tabelle: auf Knopfdruck neu rechnen). */
  veraltet = $state(false);
  private nr = 0;
  private uhr: ReturnType<typeof setTimeout> | undefined;

  /** Plant einen Lauf; `von` ist der Lauf, der gilt, sobald er fertig ist. `automatisch` false: nur als veraltet markieren. */
  plane(von: () => Promise<T> | T, automatisch = true, ms = 250) {
    clearTimeout(this.uhr);
    if (!automatisch) { this.veraltet = true; return; }
    this.uhr = setTimeout(() => void this.jetzt(von), ms);
  }
  async jetzt(von: () => Promise<T> | T) {
    const mein = ++this.nr;
    this.laeuft = true; this.veraltet = false;
    try {
      const w = await von();
      if (mein === this.nr) { this.wert = w; this.fehler = null; }
    } catch (f) {
      if (mein === this.nr) { this.wert = null; this.fehler = f; }
    } finally { if (mein === this.nr) this.laeuft = false; }
  }
  /** Beim Schließen der Seite: laufende Planung verwerfen. */
  verwerfe() { clearTimeout(this.uhr); this.nr++; }
}
