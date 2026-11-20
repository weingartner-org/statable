/**
 * Stufe 3B: Antwortsatz (JSON), Prüfung, Verschlüsselung an den öffentlichen Schlüssel (age; binär oder Armor-Text) und Entschlüsselung.
 * Armor-Text über 1 MB wird vor dem Entschlüsseln abgelehnt (typage begrenzt selbst nicht). Fehler: `KryptoFehler` aus ./schluessel.
 */
import { Decrypter, Encrypter, armor } from 'age-encryption';
import { KryptoFehler, empfaengerAusIdentitaet } from './schluessel';

export const MAX_ARMOR_ZEICHEN = 1_000_000;
export type Antwortwert = number | number[] | string | null;
export interface Antwortsatz {
  format: 'statable-antwort'; version: 1; plan: { id: string; revision: number }; antwortId: string;
  code?: string; start?: string; ende?: string; werte: Record<string, Antwortwert>; abgebrochen?: boolean;
}

const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GEFAEHRLICH = new Set(['__proto__', 'constructor', 'prototype']);
const einfachesObjekt = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const endlich = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

function istKalenderdatum(t: unknown): t is string {
  if (typeof t !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
  return d.getUTCFullYear() === +m[1]! && d.getUTCMonth() === +m[2]! - 1 && d.getUTCDate() === +m[3]!;
}

export function pruefeAntwortsatz(x: unknown): Antwortsatz | null {
  if (!einfachesObjekt(x) || x.format !== 'statable-antwort' || x.version !== 1) return null;
  const p = x.plan;
  if (!einfachesObjekt(p) || typeof p.id !== 'string' || p.id === '' || p.id.length > 200 || !Number.isInteger(p.revision) || (p.revision as number) < 0) return null;
  if (typeof x.antwortId !== 'string' || !UUID4.test(x.antwortId)) return null;
  if (x.start !== undefined && !istKalenderdatum(x.start)) return null;
  if (x.ende !== undefined && !istKalenderdatum(x.ende)) return null;
  if (x.code !== undefined && typeof x.code !== 'string') return null;
  if (x.abgebrochen !== undefined && typeof x.abgebrochen !== 'boolean') return null;
  if (!einfachesObjekt(x.werte)) return null;
  const werte: Record<string, Antwortwert> = {};
  for (const k of Object.keys(x.werte)) {
    if (GEFAEHRLICH.has(k)) continue;
    const v = x.werte[k];
    if (v === null || endlich(v) || (typeof v === 'string' && v.length <= 10000) || (Array.isArray(v) && v.every(endlich))) werte[k] = v as Antwortwert;
  }
  const r: Antwortsatz = { format: 'statable-antwort', version: 1, plan: { id: p.id, revision: p.revision as number }, antwortId: x.antwortId, werte };
  if (x.code !== undefined) r.code = x.code as string;
  if (x.start !== undefined) r.start = x.start as string;
  if (x.ende !== undefined) r.ende = x.ende as string;
  if (x.abgebrochen !== undefined) r.abgebrochen = x.abgebrochen as boolean;
  return r;
}

export function verschluesseleAntwort(satz: Antwortsatz, empfaenger: string, form: 'binaer'): Promise<Uint8Array>;
export function verschluesseleAntwort(satz: Antwortsatz, empfaenger: string, form: 'text'): Promise<string>;
export async function verschluesseleAntwort(satz: Antwortsatz, empfaenger: string, form: 'binaer' | 'text'): Promise<Uint8Array | string> {
  const geprueft = pruefeAntwortsatz(satz);
  if (!geprueft || typeof empfaenger !== 'string' || !/^age1[a-z0-9]+$/.test(empfaenger)) throw new KryptoFehler('ungueltig');
  let bytes: Uint8Array;
  try {
    const e = new Encrypter(); e.addRecipient(empfaenger);
    bytes = await e.encrypt(JSON.stringify(geprueft));
  } catch { throw new KryptoFehler('ungueltig'); }
  return form === 'text' ? armor.encode(bytes) : bytes;
}

export async function entschluesseleAntwort(daten: Uint8Array | string, identitaet: string): Promise<Antwortsatz> {
  if (daten.length > MAX_ARMOR_ZEICHEN) throw new KryptoFehler('zu-gross');
  await empfaengerAusIdentitaet(identitaet);
  let bytes: Uint8Array;
  try { bytes = typeof daten === 'string' ? armor.decode(daten) : daten; } catch { throw new KryptoFehler('kaputt'); }
  let text: string;
  try {
    const d = new Decrypter(); d.addIdentity(identitaet.trim());
    text = await d.decrypt(bytes, 'text');
  } catch (e) {
    throw new KryptoFehler(/no identity matched/i.test(e instanceof Error ? e.message : '') ? 'falsche-identitaet' : 'kaputt');
  }
  let j: unknown;
  try { j = JSON.parse(text); } catch { throw new KryptoFehler('kaputt'); }
  const r = pruefeAntwortsatz(j);
  if (!r) throw new KryptoFehler('kaputt');
  return r;
}
