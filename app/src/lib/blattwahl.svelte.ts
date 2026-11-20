/** Excel-Blatt wählen (S-F2 D1): Hat eine Arbeitsmappe mehrere Blätter mit Inhalt, fragt `leseTabellenkalkulation` über diese Anmeldung; der Dialog (bausteine/BlattWahl.svelte) antwortet. */
import { setzeBlattFrager, type BlattInfo } from './einlesen';

export const blattwahl = $state({ offen: null as null | { datei: string; blaetter: BlattInfo[] }, gewaehlt: '' });
let antworte: ((name: string | null) => void) | null = null;

/** Die Antwort der Person: der Name des Blatts, oder null (Abbrechen). */
export function beantworteBlatt(name: string | null) { antworte?.(name); antworte = null; blattwahl.offen = null; }

setzeBlattFrager((datei, blaetter) => new Promise<string | null>(ok => {
  antworte?.(null);   // eine ältere Frage, die noch offen war, gilt als abgebrochen
  antworte = ok; blattwahl.gewaehlt = blaetter[0]!.name; blattwahl.offen = { datei, blaetter };
}));
