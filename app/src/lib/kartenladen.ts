/**
 * Holt die Grenzen der Welt und der Länder von diesem Server (nie von einem fremden): karten/index.json, karten/welt.json, karten/land/<ISO3>.json neben der App, erst beim Gebrauch.
 * Größe und Prüfsumme laut Verzeichnis werden geprüft. Getrennt von karte.ts, damit die Rechnung keinen Abruf enthält.
 */
import { geoLesen, type GeoDaten } from './karte';
import { indexLesen, type KartenEintrag, type KartenIndex } from './weltkarte';

export type KartenFehler = 'karten-laden' | 'karten-pruefsumme' | 'karten-form';
export const KARTEN_MAX_BYTES = 6 * 1024 * 1024;
export interface KartenOpt { fetchFn?: typeof fetch; basis?: string; signal?: AbortSignal }
export type KartenErgebnis<T> = { ok: true; wert: T } | { ok: false; fehler: KartenFehler };

const ADRESSE = /^karten\/(index|welt|land\/[A-Z]{3}|at\/(index|bezirke|gemeinden))\.json$/;
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');

/** Ein Abruf der festen Adresse auf diesem Server; wirft nie. Mit "erwartet" (Verzeichnis) prüft Größe und SHA-256. */
export async function kartenHolen(adresse: string, opt: KartenOpt = {}, erwartet?: { bytes: number; sha256: string }): Promise<KartenErgebnis<string>> {
  if (!ADRESSE.test(adresse)) return { ok: false, fehler: 'karten-laden' };
  const f = opt.fetchFn ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
  if (!f) return { ok: false, fehler: 'karten-laden' };
  try {
    const basis = opt.basis ?? (typeof document !== 'undefined' ? document.baseURI : 'http://localhost/');
    const r = await f(new URL(adresse, basis), { credentials: 'omit', signal: opt.signal });
    if (!r.ok) return { ok: false, fehler: 'karten-laden' };
    const laenge = Number(r.headers.get('content-length'));
    if (Number.isFinite(laenge) && laenge > KARTEN_MAX_BYTES) return { ok: false, fehler: 'karten-laden' };
    const roh = await r.arrayBuffer();
    if (roh.byteLength > KARTEN_MAX_BYTES) return { ok: false, fehler: 'karten-laden' };
    if (erwartet) {
      if (roh.byteLength !== erwartet.bytes) return { ok: false, fehler: 'karten-pruefsumme' };
      const sub = (globalThis as { crypto?: Crypto }).crypto?.subtle;
      if (sub && hex(await sub.digest('SHA-256', roh)) !== erwartet.sha256) return { ok: false, fehler: 'karten-pruefsumme' };
    }
    return { ok: true, wert: new TextDecoder('utf-8').decode(roh) };
  } catch { return { ok: false, fehler: 'karten-laden' }; }
}

let indexMerker: Promise<KartenErgebnis<KartenIndex>> | null = null;
/** Das Verzeichnis der Dateien (einmal geholt, dann gemerkt; ein Fehlschlag wird nicht gemerkt). */
export function kartenIndex(opt: KartenOpt = {}): Promise<KartenErgebnis<KartenIndex>> {
  if (opt.fetchFn) return kartenIndexHolen(opt);
  if (!indexMerker) indexMerker = kartenIndexHolen(opt).then(r => { if (!r.ok) indexMerker = null; return r; });
  return indexMerker;
}
async function kartenIndexHolen(opt: KartenOpt): Promise<KartenErgebnis<KartenIndex>> {
  const r = await kartenHolen('karten/index.json', opt);
  if (!r.ok) return r;
  let j: unknown;
  try { j = JSON.parse(r.wert); } catch { return { ok: false, fehler: 'karten-form' }; }
  const i = indexLesen(j);
  return i ? { ok: true, wert: i } : { ok: false, fehler: 'karten-form' };
}

export interface GrenzenGeladen { daten: GeoDaten; eintrag: KartenEintrag }
async function datei(adresse: string, eintrag: KartenEintrag, opt: KartenOpt): Promise<KartenErgebnis<GrenzenGeladen>> {
  const r = await kartenHolen(adresse, opt, eintrag);
  if (!r.ok) return r;
  const g = geoLesen(r.wert);
  if (!g.ok) return { ok: false, fehler: 'karten-form' };
  return { ok: true, wert: { daten: g.daten, eintrag } };
}
/** Die Staaten der Welt. */
export async function weltLaden(opt: KartenOpt = {}): Promise<KartenErgebnis<GrenzenGeladen>> {
  const i = await kartenIndex(opt);
  return i.ok ? datei('karten/welt.json', i.wert.welt, opt) : i;
}
/** Die oberste Gliederung eines Landes (ISO3). */
export async function landLaden(iso3: string, opt: KartenOpt = {}): Promise<KartenErgebnis<GrenzenGeladen>> {
  if (!/^[A-Z]{3}$/.test(iso3)) return { ok: false, fehler: 'karten-laden' };
  const i = await kartenIndex(opt);
  if (!i.ok) return i;
  const e = i.wert.laender[iso3];
  return e ? datei(`karten/land/${iso3}.json`, e, opt) : { ok: false, fehler: 'karten-laden' };
}
