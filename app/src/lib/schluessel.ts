/**
 * Stufe 3A: Schlüsselpaar (age, X25519) und passwortgeschützte Schlüsseldatei `.statable-schluessel`.
 * typage wird nur über benannte Importe geladen (Größe der Fragebogen-Datei). Der private Schlüssel wird hier nie geloggt und nie gespeichert.
 * Fehler sind immer `KryptoFehler` mit `code`; die englischen Texte von typage gelangen nicht nach außen.
 */
import { Decrypter, Encrypter, generateIdentity, identityToRecipient } from 'age-encryption';

export type KryptoFehlerCode = 'falsches-passwort' | 'falsche-identitaet' | 'kaputt' | 'zu-gross' | 'ungueltig';
export class KryptoFehler extends Error {
  code: KryptoFehlerCode;
  constructor(code: KryptoFehlerCode, message?: string) { super(message ?? code); this.name = 'KryptoFehler'; this.code = code; }
}

/** scrypt-Arbeitsstufe für Schlüsseldateien (typage-Standard, rund 0,8 s am Rechner). */
const SCRYPT_STUFE = 18;
const KOPF = 'age-encryption.org/v1';
export const IDENTITAET_MUSTER = /^AGE-SECRET-KEY-1[A-Z0-9]+$/;

export async function neuesSchluesselpaar(): Promise<{ identitaet: string; empfaenger: string }> {
  const identitaet = await generateIdentity();
  return { identitaet, empfaenger: await identityToRecipient(identitaet) };
}

export async function empfaengerAusIdentitaet(identitaet: string): Promise<string> {
  if (typeof identitaet !== 'string' || !IDENTITAET_MUSTER.test(identitaet.trim())) throw new KryptoFehler('ungueltig');
  try { return await identityToRecipient(identitaet.trim()); } catch { throw new KryptoFehler('ungueltig'); }
}

export async function schluesselDatei(identitaet: string, name: string, passwort: string): Promise<Uint8Array> {
  if (typeof passwort !== 'string' || passwort === '') throw new KryptoFehler('ungueltig');
  await empfaengerAusIdentitaet(identitaet);
  const inhalt = JSON.stringify({ format: 'statable-schluessel', version: 1, name, erstellt: new Date().toISOString().slice(0, 10), identitaet: identitaet.trim() });
  try {
    const e = new Encrypter(); e.setScryptWorkFactor(SCRYPT_STUFE); e.setPassphrase(passwort);
    return await e.encrypt(inhalt);
  } catch { throw new KryptoFehler('ungueltig'); }
}

export async function leseSchluesselDatei(bytes: Uint8Array, passwort: string): Promise<{ identitaet: string; name: string; erstellt: string }> {
  if (!(bytes instanceof Uint8Array) || bytes.length < KOPF.length || new TextDecoder().decode(bytes.subarray(0, KOPF.length)) !== KOPF) throw new KryptoFehler('kaputt');
  if (typeof passwort !== 'string' || passwort === '') throw new KryptoFehler('falsches-passwort');
  let text: string;
  try {
    const d = new Decrypter(); d.addPassphrase(passwort);
    text = await d.decrypt(bytes, 'text');
  } catch (e) {
    throw new KryptoFehler(/no identity matched/i.test(e instanceof Error ? e.message : '') ? 'falsches-passwort' : 'kaputt');
  }
  let j: unknown;
  try { j = JSON.parse(text); } catch { throw new KryptoFehler('kaputt'); }
  const o = j as Record<string, unknown> | null;
  if (!o || typeof o !== 'object' || o.format !== 'statable-schluessel' || o.version !== 1 || typeof o.identitaet !== 'string' || !IDENTITAET_MUSTER.test(o.identitaet)) throw new KryptoFehler('kaputt');
  try { await identityToRecipient(o.identitaet); } catch { throw new KryptoFehler('kaputt'); }
  return { identitaet: o.identitaet, name: typeof o.name === 'string' ? o.name : '', erstellt: typeof o.erstellt === 'string' ? o.erstellt : '' };
}
