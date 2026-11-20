/**
 * Zustand einer laufenden Simulation im Lernlabor (Kachel L4): „läuft“ und Fortschritt für die Lade-Animation (bausteine/Rechnet.svelte).
 * Rechnet in Stücken (lib/lernlabor.ts laufeInStuecken), die Oberfläche bleibt bedienbar. Ein neuer Start bricht den alten ab; ein alter Lauf schreibt nie ins Neue.
 */
import { laufeInStuecken, type Lauf } from './lernlabor';

export class Simulation {
  laeuft = $state(false);
  anteil = $state(0);
  private marke = 0;
  /** Rechnet den Lauf (in Stücken) und gibt das Ergebnis zurück; undefined, wenn inzwischen ein neuer Lauf gestartet oder abgebrochen wurde. */
  async starte<T>(l: Lauf<T>): Promise<T | undefined> {
    const meine = ++this.marke;
    this.laeuft = true; this.anteil = 0;
    try { return await laufeInStuecken(l, () => meine === this.marke, a => { if (meine === this.marke) this.anteil = a; }); }
    finally { if (meine === this.marke) this.laeuft = false; }
  }
  abbrechen() { this.marke++; this.laeuft = false; }
}
