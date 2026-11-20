/**
 * Stufe 5C: Projektdatei mit Passwort (age, scrypt). Innen die unveränderte ZIP-Projektdatei.
 * Bibliothek `age-encryption` (typage) mit der Voreinstellung für die Arbeitsstufe, wie in `schluessel.ts`.
 * Das Passwort wird nie gespeichert, nie protokolliert und steht in keiner Fehlermeldung.
 */
// `age-encryption` wird erst beim Ver- oder Entschlüsseln geladen (kleinerer Start; der Bau der Hilfeseiten blieb sonst beim SSR-Schritt hängen, 09.11.).
import type { QualProjekt } from './qualprojekt';

export const AGE_KOPF = 'age-encryption.org/v1';
export const MIN_PASSWORT = 8;

export class PasswortFalsch extends Error { constructor() { super('passwort-falsch'); this.name = 'PasswortFalsch'; } }
/** age-Datei mit Schlüssel-Empfänger (X25519, Plugin, gemischt), nicht mit genau einem Passwort-Eintrag. */
export class NichtMitPasswort extends Error { constructor() { super('nicht-mit-passwort'); this.name = 'NichtMitPasswort'; } }

const KOPF_BYTES = new TextEncoder().encode(AGE_KOPF);

export function istVerschluesselt(bytes: Uint8Array): boolean {
  if (!(bytes instanceof Uint8Array) || bytes.length < KOPF_BYTES.length) return false;
  for (let i = 0; i < KOPF_BYTES.length; i++) if (bytes[i] !== KOPF_BYTES[i]) return false;
  return true;
}

/** Liest die Empfänger-Einträge aus dem Kopf (ohne zu entschlüsseln). */
function empfaengerArten(bytes: Uint8Array): string[] {
  const arten: string[] = [];
  const dec = new TextDecoder();
  let pos = 0;
  let erste = true;
  while (pos < bytes.length) {
    let ende = bytes.indexOf(0x0a, pos);
    if (ende < 0) ende = bytes.length;
    const zeile = dec.decode(bytes.subarray(pos, ende));
    pos = ende + 1;
    if (erste) { erste = false; continue; }
    if (zeile.startsWith('---')) break;
    if (zeile.startsWith('-> ')) arten.push(zeile.slice(3).split(' ')[0] ?? '');
  }
  return arten;
}

export async function verschluesseleProjekt(zip: Uint8Array, passwort: string): Promise<Uint8Array> {
  const { Encrypter } = await import('age-encryption');
  const e = new Encrypter();
  e.setPassphrase(passwort);
  return await e.encrypt(zip);
}

export async function entschluesseleProjekt(bytes: Uint8Array, passwort: string): Promise<Uint8Array> {
  const arten = empfaengerArten(bytes);
  if (arten.length !== 1 || arten[0] !== 'scrypt') throw new NichtMitPasswort();
  const { Decrypter } = await import('age-encryption');
  try {
    const d = new Decrypter();
    d.addPassphrase(passwort);
    return await d.decrypt(bytes);
  } catch (e) {
    if (/no identity matched/i.test(e instanceof Error ? e.message : '')) throw new PasswortFalsch();
    throw new Error('projektdatei-kaputt');
  }
}

const laenge = (s: string): number => Array.from(s).length;

export function pruefePasswort(p1: string, p2: string): 'ok' | 'kurz' | 'verschieden' {
  if (laenge(p1) < MIN_PASSWORT) return 'kurz';
  return p1 === p2 ? 'ok' : 'verschieden';
}

export function enthaeltPersoenliches(q: QualProjekt | undefined, enthaeltZitate: boolean): boolean {
  if (enthaeltZitate) return true;
  if (!q) return false;
  return q.dokumente.length > 0 || q.memos.length > 0 || q.segmente.length > 0;
}
