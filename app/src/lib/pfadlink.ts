/**
 * Kurzlinks für geteilte Lernpfade (Johannes 13.11.2026): statable.eu/l/<name-des-pfads> statt #lernen/import/<langer Code>.
 * Der Server (server/pb_hooks/pfadlinks.pb.js) legt nur Name und Einheiten ab, keine Personendaten. Caddy leitet /l/<kurz> auf #lernen/l/<kurz> um.
 * Ohne Server (Uni-Installation, Offline-Fassung, Netz weg) bleibt der lange Link: Er trägt alles selbst.
 */
import { MELDEN_SERVER } from './melden';

/** Gibt es den Server? Dieselbe Bedingung wie beim Melden (Bau mit `VITE_MELDEN_SERVER=1`, in der Entwicklung immer). */
export const KURZLINK_SERVER = MELDEN_SERVER && import.meta.env.VITE_OFFLINE !== '1';
const ROUTE = 'api/statable/pfadlink';
export const KURZ = /^[a-z0-9][a-z0-9-]{0,79}$/;

const mitFrist = (ms: number) => { const a = new AbortController(); const u = setTimeout(() => a.abort(), ms); return { signal: a.signal, fertig: () => clearTimeout(u) }; };

/** Fragt den Server nach dem Kurzlink; `null`, wenn es keinen gibt (dann gilt der lange Link). */
export async function holeKurzlink(name: string, einheiten: string[], pruefung: boolean): Promise<string | null> {
  if (!KURZLINK_SERVER) return null;
  const f = mitFrist(6000);
  try {
    const r = await fetch(ROUTE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pruefung ? { n: name, e: einheiten } : { n: name, e: einheiten, p: 0 }), signal: f.signal });
    if (!r.ok) return null;
    const { kurz } = (await r.json()) as { kurz?: unknown };
    return typeof kurz === 'string' && KURZ.test(kurz) ? `${location.origin}${location.pathname.replace(/[^/]*$/, '')}l/${kurz}` : null;
  } catch { return null; } finally { f.fertig(); }
}

export type Geladen = { name: string; einheiten: string[]; pruefung: boolean } | 'unbekannt' | 'kein-server';
/** Holt den Pfad zu einem Kurzlink. */
export async function ladeKurzlink(kurz: string): Promise<Geladen> {
  if (!KURZ.test(kurz)) return 'unbekannt';
  const f = mitFrist(8000);
  try {
    const r = await fetch(`${ROUTE}/${kurz}`, { signal: f.signal });
    if (r.status === 404) return (r.headers.get('content-type') || '').includes('json') ? 'unbekannt' : 'kein-server';
    if (!r.ok) return 'kein-server';
    const o = (await r.json()) as { n?: unknown; e?: unknown; p?: unknown };
    if (typeof o.n !== 'string' || !Array.isArray(o.e)) return 'unbekannt';
    return { name: o.n, einheiten: o.e.map(String), pruefung: o.p !== 0 };
  } catch { return 'kein-server'; } finally { f.fertig(); }
}
