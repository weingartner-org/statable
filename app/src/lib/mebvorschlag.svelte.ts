/** Übergabe einer Auswahl an die Seite „Neue Auswertung“: Der Hinweis „Die Personen sind in Gruppen eingeteilt“ (in der Prüfliste und im Ergebnis von
 *  „Unterscheiden sich Gruppen?“ und „Lässt sich etwas vorhersagen?“) legt hier die Mehrebenen-Frage vorbefüllt ab und öffnet die neue Frage. */
import type { Werte } from './verfahren';

export const ebenenVorschlag = $state<{ w: Werte | null }>({ w: null });

export function ebenenOeffnen(w: Werte): void {
  ebenenVorschlag.w = w;
  if (location.hash === '#blatt/neu') return;   // schon dort: der Effekt in Blatt.svelte greift den Vorschlag auf
  location.hash = 'blatt/neu';
}
