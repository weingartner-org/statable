/** Projekt per Link öffnen: lädt die Datei (nur von erlaubter Herkunft, `projektlink.ts`) und fragt vor dem Öffnen. Nie still. */
import { holeProjekt, linkAdresse, ProjektlinkFehler, type LinkFehler } from './projektlink';
import { oeffneProjekt, meldeUnbekannteEintraege } from './sitzung.svelte';
import type { DateiMeldung } from './projektdatei';
import type { Projekt } from './ablage';

/** Beim Holen übersprungene Einträge der Datei: werden nach dem Öffnen einmal angesagt. */
let linkMeldungen: DateiMeldung[] = [];
export const linkFrage = $state({ phase: 'aus' as 'aus' | 'frage' | 'fehler', name: '', host: '', projekt: null as Projekt | null, grund: 'laden' as LinkFehler | 'oeffnen', laeuft: false });

/** Liest den Link beim Start und nimmt ihn aus der Adresszeile (sonst läse die Seitenführung `#oeffne=…` als Seite). Gibt die Adresse zurück oder null. */
export function nimmLinkAusAdresse(): string | null {
  const roh = linkAdresse(location.search, location.hash);
  if (roh === null) return null;
  const q = new URLSearchParams(location.search); q.delete('projekt');
  history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + '#start');
  return roh;
}
export async function pruefeLink(roh: string) {
  try {
    const { projekt, host, meldungen } = await holeProjekt(roh, location.href); linkMeldungen = meldungen;
    Object.assign(linkFrage, { phase: 'frage', name: projekt.name, host, projekt, laeuft: false });
  } catch (e) {
    Object.assign(linkFrage, { phase: 'fehler', grund: e instanceof ProjektlinkFehler ? e.grund : 'laden', host: e instanceof ProjektlinkFehler ? (e.host ?? '') : '', projekt: null, laeuft: false });
  }
}
export function linkAbbrechen() { Object.assign(linkFrage, { phase: 'aus', projekt: null, laeuft: false }); }
export async function linkBestaetigen(): Promise<boolean> {
  const p = linkFrage.projekt; if (!p) return false;
  linkFrage.laeuft = true;
  try { await oeffneProjekt(p); Object.assign(linkFrage, { phase: 'aus', projekt: null, laeuft: false }); meldeUnbekannteEintraege(linkMeldungen); linkMeldungen = []; return true; }
  catch { Object.assign(linkFrage, { phase: 'fehler', grund: 'oeffnen', projekt: null, laeuft: false }); return false; }
}
