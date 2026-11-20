/** Zustand der Befehlspalette (Strg+K). Vertrag zwischen `kuerzel.ts` (öffnet) und `bausteine/Befehlspalette.svelte` (zeigt). */
export const palette = $state({ offen: false, mal: 0 });
/** `mal` zählt jedes Öffnen: Kommt Strg+K, bevor das `close`-Ereignis des letzten Schließens eingetroffen ist (`offen` noch `true`), öffnet die Palette trotzdem. */
export function oeffnePalette(): void { palette.offen = true; palette.mal++; }
export function schliessePalette(): void { palette.offen = false; }
