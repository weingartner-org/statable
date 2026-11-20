/**
 * Die Gegenstelle zum Konto-Server (PocketBase) und die Anmeldung. Wird nur geladen, wenn `KONTO_AKTIV` an ist
 * (alle Zugriffe laufen über `await import('./pb')` in `konto.svelte.ts`; bei ausgeschaltetem Schalter entfällt das ganz).
 * Anmeldung: was der Server unter `listAuthMethods` meldet. Später trägt Johannes in der PocketBase-Verwaltung
 * die Uni-Anmeldung (OIDC) ein, dann erscheint hier der Knopf von selbst; E-Mail/Passwort nur, solange es dort an ist.
 */
import PocketBase, { type AuthProviderInfo, type RecordModel } from 'pocketbase';
import { PB_URL } from './config';
import type { FernEintrag, Gegenstelle } from './sync';

export const pb = new PocketBase(PB_URL);
/** Gleichzeitige Anfragen sollen sich nicht gegenseitig abbrechen. */
const FREI = { requestKey: null } as const;
const SAMMLUNG = 'projekte';

export interface Methoden { passwort: boolean; anbieter: { name: string; anzeige: string }[] }
export interface Person { id: string; name: string }

export const angemeldet = (): boolean => pb.authStore.isValid;
export const person = (): Person | null => {
  const r = pb.authStore.record; if (!pb.authStore.isValid || !r) return null;
  return { id: r.id, name: String(r['name'] || r['email'] || r.id) };
};

/** Fragt den Server, welche Anmeldewege eingerichtet sind. Wirft, wenn er nicht erreichbar ist. */
export async function methoden(): Promise<Methoden> {
  const m = await pb.collection('users').listAuthMethods({ requestKey: null });
  return {
    passwort: !!m.password?.enabled,
    anbieter: (m.oauth2?.enabled ? m.oauth2.providers : []).map((p: AuthProviderInfo) => ({ name: p.name, anzeige: p.displayName || p.name }))
  };
}
export const meldeAn = (email: string, passwort: string) => pb.collection('users').authWithPassword(email, passwort, FREI).then(() => undefined);
/** Öffnet das Anmeldefenster der Uni (PocketBase leitet über seinen eigenen Rückkehr-Weg zurück). */
export const meldeAnMitAnbieter = (provider: string) => pb.collection('users').authWithOAuth2({ provider, ...FREI }).then(() => undefined);
export const meldeAb = () => pb.authStore.clear();
/** Erneuert die Anmeldung; false, wenn sie abgelaufen ist. Bei Netzfehler wirft es (dann bleibt man angemeldet, nur offline). */
export async function erneuere(): Promise<boolean> {
  if (!pb.authStore.isValid) return false;
  try { await pb.collection('users').authRefresh(FREI); return true; }
  catch (e) { if ((e as { status?: number }).status === 401 || (e as { status?: number }).status === 403 || (e as { status?: number }).status === 404) { pb.authStore.clear(); return false; } throw e; }
}
/** Löscht das Konto samt allen Projekten im Konto (die Sammlung hängt per cascadeDelete am Konto). */
export async function loescheKonto(): Promise<void> {
  const id = pb.authStore.record?.id; if (!id) return;
  await pb.collection('users').delete(id, FREI); pb.authStore.clear();
}
export const beiAenderung = (f: () => void) => pb.authStore.onChange(f);

/** PocketBase liefert „2026-10-08 12:00:00.123Z“; mit Leerzeichen lesen nicht alle Browser das Datum. */
const serverZeit = (v: unknown): number | undefined => { const t = Date.parse(String(v ?? '').replace(' ', 'T')); return Number.isFinite(t) ? t : undefined; };
const alsEintrag = (r: RecordModel): FernEintrag =>
  ({ cid: String(r['cid']), satzId: r.id, name: String(r['name']), zeit: Number(r['zeit']), aktualisiert: serverZeit(r['updated']), groesse: Number(r['groesse']) || undefined, spalten: Number(r['spalten']) || undefined, faelle: Number(r['faelle']) || undefined, blaetter: Number(r['blaetter']) || 0 });

export const gegenstelle: Gegenstelle = {
  async liste() {
    return (await pb.collection(SAMMLUNG).getFullList({ sort: '-zeit', ...FREI })).map(alsEintrag);
  },
  async hoch(cid, daten, meta, vorhanden) {
    const owner = pb.authStore.record?.id; if (!owner) throw new Error('Nicht angemeldet');
    const form = new FormData();
    form.set('inhalt', new Blob([daten as BlobPart], { type: 'application/octet-stream' }), 'projekt.statable');
    form.set('name', meta.name); form.set('zeit', String(meta.zeit)); form.set('groesse', String(daten.length)); form.set('blaetter', String(meta.blaetter));
    if (meta.spalten !== undefined) form.set('spalten', String(meta.spalten));
    if (meta.faelle !== undefined) form.set('faelle', String(meta.faelle));
    if (vorhanden) return alsEintrag(await pb.collection(SAMMLUNG).update(vorhanden.satzId, form, FREI));
    form.set('owner', owner); form.set('cid', cid);
    return alsEintrag(await pb.collection(SAMMLUNG).create(form, FREI));
  },
  async runter(e) {
    const satz = await pb.collection(SAMMLUNG).getOne(e.satzId, FREI);
    const token = await pb.files.getToken(FREI);
    const res = await fetch(pb.files.getURL(satz, String(satz['inhalt']), { token }));
    if (!res.ok) throw new Error(`Datei konnte nicht geladen werden (HTTP ${res.status})`);
    return new Uint8Array(await res.arrayBuffer());
  },
  async loesche(e) { await pb.collection(SAMMLUNG).delete(e.satzId, FREI); }
};
