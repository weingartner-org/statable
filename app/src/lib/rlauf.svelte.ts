/**
 * Zustand von R für die Oberfläche. Eigene kleine Datei: Die App-Hülle (bausteine/RLauft.svelte) braucht ihn immer, darf aber den R-Code nicht beim Start mitladen.
 * Gefüllt wird er von lib/rverfahren.svelte.ts.
 */

/** Ab hier sagt die Oberfläche, dass die Rechnung länger dauert. Ein Worker im Rechnen antwortet nicht, darum lässt sich „rechnet noch“ von „hängt“ nicht unterscheiden. */
export const R_HINWEIS_MS = 60_000;

export const rStatus = $state<{ bereit: boolean; text: string; geladen: number; gesamt: number; laedt: boolean; /** R wird schon vor der Rechnung geladen (Vorwärmen) */ vor: boolean; /** Eine Rechnung läuft oder wartet: Abbrechen hat etwas zu tun */ belegt: boolean; /** So viele RStart zeigen gerade ihren eigenen Knopf „Abbrechen“; dann braucht es die Leiste nicht */ knoepfe: number }>({ bereit: false, text: '', geladen: 0, gesamt: 0, laedt: false, vor: false, belegt: false, knoepfe: 0 });

let abbrechen = () => {};
export function setzeRAbbrechen(f: () => void) { abbrechen = f; }
/** Die laufende Rechnung abbrechen: R wird beendet und startet beim nächsten Rechnen neu. Die Rechnung endet mit `RAbgebrochen`. */
export function rAbbrechen(): void { abbrechen(); }
