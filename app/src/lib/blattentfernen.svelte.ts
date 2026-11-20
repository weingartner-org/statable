/**
 * Eine Auswertung (ein Blatt) schließen = löschen (09.10.). Es gibt keinen Ort, an dem ein geschlossenes Blatt weiterlebt:
 * es verschwindet auch aus dem Bericht. Deshalb fragt der Reiter vorher (bausteine/ReiterSchliessen.svelte).
 */
import { s, sichern, melde, L } from './sitzung.svelte';

export const schliessen = $state({ offen: null as null | { id: string; titel: string } });

export function blattEntfernen(id: string) {
  const i = s.blaetter.findIndex(b => b.id === id);
  if (i < 0) return;
  const offen = location.hash === `#blatt/${id}`, nachbar = s.blaetter[i + 1] ?? s.blaetter[i - 1];
  s.blaetter = s.blaetter.filter(b => b.id !== id);
  sichern();
  if (offen) location.hash = nachbar ? `blatt/${nachbar.id}` : 'daten';
  melde(L('Auswertung geschlossen und gelöscht.', 'Analysis closed and deleted.'));
}
