/** Was am Rand steht, weil gerade etwas gewählt wurde (Meldung 31.10.: die Seitenleiste muss auf jede Wahl antworten). Setzt ein Baustein, liest die Seite. */
import type { RandKontext } from '../bausteine/Rand.svelte';

export const randWahl = $state<{ k: RandKontext | null }>({ k: null });
