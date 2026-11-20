// Stufe 3A: Schlüsselpaar und passwortgeschützte Schlüsseldatei. Rote Tests (Modul ./schluessel existiert noch nicht).
//
// Festgelegte Signaturen von app/src/lib/schluessel.ts:
//   export type KryptoFehlerCode = 'falsches-passwort' | 'falsche-identitaet' | 'kaputt' | 'zu-gross' | 'ungueltig';
//   export class KryptoFehler extends Error { code: KryptoFehlerCode }       // auch für antwortsatz.ts
//   export function neuesSchluesselpaar(): Promise<{ identitaet: string; empfaenger: string }>;   // AGE-SECRET-KEY-1… / age1…
//   export function empfaengerAusIdentitaet(identitaet: string): Promise<string>;
//   export function schluesselDatei(identitaet: string, name: string, passwort: string): Promise<Uint8Array>;
//        // binäre age-Datei (scrypt, Arbeitsstufe 18), Inhalt UTF-8-JSON { format: 'statable-schluessel', version: 1, name, erstellt, identitaet }
//        // erstellt = ISO-Datum OHNE Uhrzeit. Leeres Passwort oder ungültige Identität -> KryptoFehler 'ungueltig'.
//   export function leseSchluesselDatei(bytes: Uint8Array, passwort: string): Promise<{ identitaet: string; name: string; erstellt: string }>;
//        // falsches Passwort -> 'falsches-passwort'; keine age-Datei / falscher Inhalt -> 'kaputt'; nie ein Absturz mit anderem Fehlertyp.
import { describe, expect, it } from 'vitest';
import * as age from 'age-encryption';
import { ageLauf, ageVorhanden, batchpassVorhanden, keygenPaar } from './age-werkzeug.testhilfe';

type Modul = typeof import('./schluessel');
const laden = (): Promise<Modul> => import('./schluessel').catch(() => { throw new Error('app/src/lib/schluessel.ts fehlt oder lässt sich nicht laden (roter Test)'); });

describe('Schlüsselpaar', () => {
  it('erzeugt ein age-Paar (AGE-SECRET-KEY-1… / age1…), jedes Mal ein anderes', async () => {
    const m = await laden();
    const a = await m.neuesSchluesselpaar(); const b = await m.neuesSchluesselpaar();
    expect(a.identitaet).toMatch(/^AGE-SECRET-KEY-1[A-Z0-9]{50,}$/);
    expect(a.empfaenger).toMatch(/^age1[a-z0-9]{50,}$/);
    expect(a.identitaet).not.toBe(b.identitaet);
    expect(await m.empfaengerAusIdentitaet(a.identitaet)).toBe(a.empfaenger);
  });
  it('empfaengerAusIdentitaet lehnt Unsinn mit klarem Fehler ab', async () => {
    const m = await laden();
    await expect(m.empfaengerAusIdentitaet('kein Schlüssel')).rejects.toMatchObject({ name: 'KryptoFehler', code: 'ungueltig' });
  });
});

describe('Schlüsseldatei mit Passwort', () => {
  it('Rundreise: Name, Datum (ohne Uhrzeit) und Identität kommen unverändert zurück', async () => {
    const m = await laden(); const p = await m.neuesSchluesselpaar();
    const bytes = await m.schluesselDatei(p.identitaet, 'Umfrage Seminar ä', 'Ein gutes Passwort 123');
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(bytes.subarray(0, 21))).toBe('age-encryption.org/v1'); // binäres age-Format, kein Armor
    const r = await m.leseSchluesselDatei(bytes, 'Ein gutes Passwort 123');
    expect(r.identitaet).toBe(p.identitaet); expect(r.name).toBe('Umfrage Seminar ä');
    expect(r.erstellt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('die Datei enthält den privaten Schlüssel nicht im Klartext', async () => {
    const m = await laden(); const p = await m.neuesSchluesselpaar();
    const bytes = await m.schluesselDatei(p.identitaet, 'x', 'pw-pw-pw');
    expect(Buffer.from(bytes).toString('latin1')).not.toContain(p.identitaet.slice(0, 20));
    expect(Buffer.from(bytes).toString('latin1')).not.toContain('statable-schluessel');
  });
  it('falsches Passwort -> klarer Fehler falsches-passwort', async () => {
    const m = await laden(); const p = await m.neuesSchluesselpaar();
    const bytes = await m.schluesselDatei(p.identitaet, 'x', 'richtig');
    await expect(m.leseSchluesselDatei(bytes, 'falsch')).rejects.toMatchObject({ name: 'KryptoFehler', code: 'falsches-passwort' });
    await expect(m.leseSchluesselDatei(bytes, '')).rejects.toMatchObject({ name: 'KryptoFehler' });
  });
  it('kaputte Daten -> klarer Fehler, kein Absturz', async () => {
    const m = await laden(); const p = await m.neuesSchluesselpaar();
    const gut = await m.schluesselDatei(p.identitaet, 'x', 'pw');
    const abgeschnitten = gut.slice(0, gut.length - 10);
    const verdreht = gut.slice(); verdreht[verdreht.length - 3]! ^= 0xff;
    for (const kaputt of [new Uint8Array(), new Uint8Array([1, 2, 3]), new TextEncoder().encode('hallo welt'), abgeschnitten, verdreht]) {
      await expect(m.leseSchluesselDatei(kaputt, 'pw')).rejects.toMatchObject({ name: 'KryptoFehler', code: expect.stringMatching(/^(kaputt|falsches-passwort)$/) });
    }
  });
  it('eine age-Datei mit fremdem Inhalt (kein Statable-Schlüssel) -> kaputt', async () => {
    const m = await laden();
    const e = new age.Encrypter(); e.setScryptWorkFactor(10); e.setPassphrase('pw');
    const fremd = await e.encrypt(JSON.stringify({ format: 'etwas-anderes', version: 1 }));
    await expect(m.leseSchluesselDatei(fremd, 'pw')).rejects.toMatchObject({ name: 'KryptoFehler', code: 'kaputt' });
    const e2 = new age.Encrypter(); e2.setScryptWorkFactor(10); e2.setPassphrase('pw');
    const ohneSchluessel = await e2.encrypt(JSON.stringify({ format: 'statable-schluessel', version: 1, name: 'x', erstellt: '2026-11-08', identitaet: 'kein-schluessel' }));
    await expect(m.leseSchluesselDatei(ohneSchluessel, 'pw')).rejects.toMatchObject({ name: 'KryptoFehler', code: 'kaputt' });
  });
  it('leeres Passwort oder ungültige Identität beim Speichern -> ungueltig', async () => {
    const m = await laden(); const p = await m.neuesSchluesselpaar();
    await expect(m.schluesselDatei(p.identitaet, 'x', '')).rejects.toMatchObject({ name: 'KryptoFehler', code: 'ungueltig' });
    await expect(m.schluesselDatei('Unsinn', 'x', 'pw')).rejects.toMatchObject({ name: 'KryptoFehler', code: 'ungueltig' });
  });
});

describe.skipIf(!ageVorhanden)('Gegenprobe mit dem echten age: Schlüssel', () => {
  it('Schlüsselpaar aus Statable verschlüsselt mit age -r, Statable-Identität entschlüsselt (und umgekehrt mit age-keygen)', async () => {
    const m = await laden(); const p = await m.neuesSchluesselpaar();
    const aus = ageLauf('age', ['-r', p.empfaenger], 'Hallo');
    const d = new age.Decrypter(); d.addIdentity(p.identitaet);
    expect(await d.decrypt(new Uint8Array(aus.stdout), 'text')).toBe('Hallo');
    const k = keygenPaar();
    expect(await m.empfaengerAusIdentitaet(k.identitaet)).toBe(k.empfaenger);
  });
  it.skipIf(!batchpassVorhanden)('Schlüsseldatei aus Statable öffnet age -d mit Passwort; age-verschlüsselte Datei öffnet Statable', async () => {
    const m = await laden(); const p = await m.neuesSchluesselpaar();
    const bytes = await m.schluesselDatei(p.identitaet, 'Gegenprobe', 'pw ä 1');
    const r = ageLauf('age', ['-d', '-j', 'batchpass'], bytes, { AGE_PASSPHRASE: 'pw ä 1' });
    expect(r.status).toBe(0);
    const inhalt = JSON.parse(r.stdout.toString('utf8'));
    expect(inhalt).toMatchObject({ format: 'statable-schluessel', version: 1, name: 'Gegenprobe', identitaet: p.identitaet });
    expect(inhalt.erstellt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // umgekehrt: age erzeugt die Schlüsseldatei
    const von = ageLauf('age', ['-e', '-j', 'batchpass'], JSON.stringify(inhalt), { AGE_PASSPHRASE: 'anderes pw', AGE_PASSPHRASE_WORK_FACTOR: '10' });
    expect(von.status).toBe(0);
    expect(await m.leseSchluesselDatei(new Uint8Array(von.stdout), 'anderes pw')).toMatchObject({ identitaet: p.identitaet, name: 'Gegenprobe' });
  });
});
