/**
 * Schalter für das Konto. Auf live AUS: dann wird nichts davon geladen, nichts angezeigt, keine Anfrage gestellt.
 * Einschalten nur beim Bauen: `VITE_KONTO=1` (und `VITE_PB_URL=https://…`, Adresse des PocketBase-Servers).
 * Weil beides beim Bauen feststeht, entfernt der Bau den ganzen Konto-Code aus der ausgelieferten App, wenn der Schalter aus ist.
 */
export const KONTO_AKTIV: boolean = import.meta.env.VITE_KONTO === '1';
export const PB_URL: string = (import.meta.env.VITE_PB_URL as string | undefined) ?? 'http://127.0.0.1:8091';
