/**
 * Offline-Fassung (Johannes 24.10.2026): das ganze Paket als ZIP herunterladen und am Rechner ohne Netz starten - für Prüfungen und Orte ohne Netz.
 * Gebaut mit `bash scripts/offline-paket.sh` (setzt VITE_OFFLINE=1 und VITE_OFFLINE_STAND=JJJJ-MM-TT). Ein kleiner Server im Paket
 * (start/server.pl für Mac und Linux, start/server.ps1 für Windows) liefert die Dateien an den Browser; Statable selbst ist unverändert.
 * Sie wird nicht aktualisiert - darum die Leiste oben (bausteine/OfflineHinweis.svelte) und kein Service Worker (main.ts).
 */
import { ort } from '../i18n/profil';

export const OFFLINE: boolean = import.meta.env.VITE_OFFLINE === '1';
/** Tag des Baus, JJJJ-MM-TT (leer außerhalb der Offline-Fassung) */
export const OFFLINE_STAND: string = String(import.meta.env.VITE_OFFLINE_STAND ?? '');
/** Der Tag des Baus in der Sprache der Oberfläche, z. B. „24. Oktober 2026“ */
export const offlineStandText = (): string => {
  const t = /^\d{4}-\d{2}-\d{2}$/.test(OFFLINE_STAND) ? new Date(`${OFFLINE_STAND}T12:00:00`) : null;
  return t ? t.toLocaleDateString(ort(), { day: 'numeric', month: 'long', year: 'numeric' }) : OFFLINE_STAND;
};
/** Wo das Paket auf statable.eu liegt (relativ zur Seite; entsteht beim Ausliefern, DEPLOY.md) */
export const OFFLINE_PAKET = 'offline/statable-offline.zip';
/** Stand und Größe des Pakets auf dem Server (offline/stand.json, entsteht mit dem Paket); null, wenn es keins gibt oder in der Offline-Fassung selbst. */
export async function offlinePaketStand(): Promise<{ stand: string; bytes: number } | null> {
  if (OFFLINE) return null;
  try {
    const j = await (await fetch('offline/stand.json', { cache: 'no-store' })).json();
    return j && typeof j.bytes === 'number' && typeof j.stand === 'string' ? j : null;
  } catch { return null; }
}
