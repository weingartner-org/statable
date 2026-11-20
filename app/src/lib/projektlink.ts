/**
 * Projekt per Link öffnen (Lehre, Moodle): `?projekt=<Adresse>` oder `#oeffne=<Adresse>`.
 * Sicherheit: Geladen wird nur von der eigenen Herkunft (die Seite, die Statable ausliefert) oder von einer Herkunft in `ERLAUBTE_HERKUENFTE`.
 * Die Content-Security-Policy (`connect-src 'self'`) lässt fremde Server ohnehin nicht zu und wird dafür nicht gelockert.
 * Für Dateien auf einem Moodle-Server gilt darum: herunterladen und auf die Startseite ziehen.
 * Der Link allein öffnet nie etwas still - die Oberfläche fragt vorher „Projekt … öffnen?“.
 */
import { leseProjektdateiMitMeldungen, type DateiMeldung } from './projektdatei';
import type { Projekt } from './ablage';

/** Weitere ausdrücklich erlaubte Herkünfte (https, z. B. 'https://dateien.uni.example'). Leer; ein Eintrag verlangt zugleich eine Änderung der CSP. */
export const ERLAUBTE_HERKUENFTE: string[] = [];
export const MAX_BYTES = 100 * 1024 * 1024;

export type LinkFehler = 'ungueltig' | 'fremd' | 'laden' | 'zugross' | 'datei' | 'neuer';
export class ProjektlinkFehler extends Error { grund: LinkFehler; host?: string; constructor(grund: LinkFehler, host?: string) { super(grund); this.grund = grund; this.host = host; } }

/** Die Adresse aus `?projekt=` oder `#oeffne=`; `null`, wenn keine da ist. */
export function linkAdresse(search: string, hash: string): string | null {
  const q = new URLSearchParams(search).get('projekt');
  if (q) return q;
  const m = /^#oeffne=(.+)$/.exec(hash);
  if (!m) return null;
  try { return decodeURIComponent(m[1]!); } catch { return m[1]!; }
}

/** Prüft die Herkunft. `basis` ist die Adresse der Seite. */
export function pruefeAdresse(roh: string, basis: string, erlaubt: string[] = ERLAUBTE_HERKUENFTE): URL {
  let u: URL;
  try { u = new URL(roh, basis); } catch { throw new ProjektlinkFehler('ungueltig'); }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new ProjektlinkFehler('ungueltig');
  if (u.username || u.password) throw new ProjektlinkFehler('ungueltig');
  const eigene = new URL(basis).origin;
  if (u.origin !== eigene && !erlaubt.includes(u.origin)) throw new ProjektlinkFehler('fremd', u.host);
  // Von einer https-Seite nie auf eine unverschlüsselte Adresse zurückfallen
  if (new URL(basis).protocol === 'https:' && u.protocol !== 'https:') throw new ProjektlinkFehler('ungueltig');
  return u;
}

/** Lädt und liest die Datei. Ohne Cookies und Anmeldedaten; Weiterleitungen auf andere Herkunft werden abgewiesen. */
export async function holeProjekt(roh: string, basis: string, holen: typeof fetch = fetch, erlaubt: string[] = ERLAUBTE_HERKUENFTE): Promise<{ projekt: Projekt; host: string; meldungen: DateiMeldung[] }> {
  const u = pruefeAdresse(roh, basis, erlaubt);
  let r: Response;
  try { r = await holen(u.href, { credentials: 'omit', redirect: 'follow' }); } catch { throw new ProjektlinkFehler('laden', u.host); }
  if (!r.ok) throw new ProjektlinkFehler('laden', u.host);
  if (r.url) pruefeAdresse(r.url, basis, erlaubt);
  const laenge = Number(r.headers.get('content-length') ?? 0);
  if (laenge > MAX_BYTES) throw new ProjektlinkFehler('zugross', u.host);
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw new ProjektlinkFehler('zugross', u.host);
  try { const l = leseProjektdateiMitMeldungen(bytes); return { projekt: l.projekt, host: u.host, meldungen: l.meldungen }; }
  catch (e) { const g = (e as { grund?: string }).grund; throw new ProjektlinkFehler(g === 'neuer' ? 'neuer' : g === 'zugross' ? 'zugross' : 'datei', u.host); }
}
