/**
 * Plan im Link (Stufe 3C): `https://statable.eu/ausfuellen/#<base64url(deflate(JSON))>`. Der Teil hinter `#` geht nie an einen Server.
 * Reines TypeScript (fflate), läuft in Statable und in der Ausfüllseite. Das Entpacken ist auf 2 MB Ergebnis begrenzt (Schutz vor Zip-Bomben aus fremden Links).
 */
import { Inflate, deflateSync, strFromU8, strToU8 } from 'fflate';

export const MAX_PLAN_BYTES = 2_000_000;
export const MAX_HASH_ZEICHEN = 400_000;

const zuBase64Url = (b: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const vonBase64Url = (t: string): Uint8Array => {
  const roh = atob(t.replace(/-/g, '+').replace(/_/g, '/'));
  const b = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) b[i] = roh.charCodeAt(i);
  return b;
};

/** Plan (ein JSON-Wert) zu einer kurzen Zeichenkette für hinter dem `#`. */
export function kodierePlan(plan: unknown): string {
  return zuBase64Url(deflateSync(strToU8(JSON.stringify(plan)), { level: 9 }));
}

/** Zeichenkette aus dem Link zurück zum JSON-Wert; wirft bei allem, was nicht stimmt (kaputt, zu lang, zu groß entpackt). */
export function dekodierePlan(text: string): unknown {
  const t = text.replace(/^#/, '').trim();
  if (!t || t.length > MAX_HASH_ZEICHEN || !/^[A-Za-z0-9_-]+$/.test(t)) throw new Error('kein Plan im Link');
  const teile: Uint8Array[] = [];
  let gesamt = 0;
  const inf = new Inflate(chunk => {
    gesamt += chunk.length;
    if (gesamt > MAX_PLAN_BYTES) throw new Error('Plan zu groß');
    teile.push(chunk);
  });
  inf.push(vonBase64Url(t), true);
  const alle = new Uint8Array(gesamt);
  let o = 0;
  for (const c of teile) { alle.set(c, o); o += c.length; }
  return JSON.parse(strFromU8(alle));
}
