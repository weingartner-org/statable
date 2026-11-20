// Stufe 3B: Antwortsatz, Verschlüsselung (binär und Armor-Text), Prüfung. Rote Tests (Modul ./antwortsatz existiert noch nicht).
//
// Festgelegte Signaturen von app/src/lib/antwortsatz.ts (Fehlerklasse KryptoFehler kommt aus ./schluessel):
//   export const MAX_ARMOR_ZEICHEN = 1_000_000;
//   export interface Antwortsatz { format: 'statable-antwort'; version: 1; plan: { id: string; revision: number }; antwortId: string;
//        code?: string; start?: string; ende?: string; werte: Record<string, number | number[] | string | null>; abgebrochen?: boolean }
//   export function verschluesseleAntwort(satz: Antwortsatz, empfaenger: string, form: 'binaer'): Promise<Uint8Array>;
//   export function verschluesseleAntwort(satz: Antwortsatz, empfaenger: string, form: 'text'): Promise<string>;   // Armor, mit Schlusszeilenumbruch
//   export function entschluesseleAntwort(daten: Uint8Array | string, identitaet: string): Promise<Antwortsatz>;
//        // string = Armor-Text: Leerraum und CRLF am Rand sind erlaubt; länger als MAX_ARMOR_ZEICHEN -> KryptoFehler 'zu-gross' VOR dem Entschlüsseln.
//        // falsche Identität -> 'falsche-identitaet'; kaputte Daten/kein JSON/kein Antwortsatz -> 'kaputt'; ungültiger Empfänger/Identität -> 'ungueltig'.
//        // Das Ergebnis geht durch pruefeAntwortsatz (null -> 'kaputt').
//   export function pruefeAntwortsatz(x: unknown): Antwortsatz | null;
//        // null bei: kein Objekt, format/version falsch, plan.id nicht nichtleerer Text (<= 200 Zeichen), plan.revision keine ganze Zahl >= 0,
//        // antwortId keine UUID v4, start/ende vorhanden aber kein echtes Kalenderdatum JJJJ-MM-TT (Uhrzeit nicht erlaubt), code/abgebrochen vom falschen Typ, werte kein einfaches Objekt.
//        // Einzelne unzulässige Werte-Einträge werden entfernt (der Rest bleibt): erlaubt sind endliche Zahl, Liste endlicher Zahlen, Text <= 10.000 Zeichen, null.
//        // Schlüssel __proto__/constructor/prototype werden entfernt. Unbekannte Felder oben werden verworfen. Die Eingabe wird nicht verändert.
import { describe, expect, it } from 'vitest';
import { ageLauf, ageVorhanden, keygenPaar, tempOrdner } from './age-werkzeug.testhilfe';

type Modul = typeof import('./antwortsatz');
type Schluessel = typeof import('./schluessel');
const laden = (): Promise<Modul> => import('./antwortsatz').catch(() => { throw new Error('app/src/lib/antwortsatz.ts fehlt oder lässt sich nicht laden (roter Test)'); });
const ladenS = (): Promise<Schluessel> => import('./schluessel').catch(() => { throw new Error('app/src/lib/schluessel.ts fehlt oder lässt sich nicht laden (roter Test)'); });

const UUID = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';
const satz = (extra: Record<string, unknown> = {}) => ({
  format: 'statable-antwort', version: 1, plan: { id: 'plan-1', revision: 2 }, antwortId: UUID,
  start: '2026-11-08', ende: '2026-11-09',
  werte: { q1: 3, q2: [1, 2.5, 3], q3: 'Freitext mit Ümläuten\nund Zeilenumbruch', q4: null, 'q3:anders': 'x' },
  ...extra,
});

describe('pruefeAntwortsatz', () => {
  it('nimmt einen gültigen Satz unverändert an (auch ohne Zusatzfelder und mit abgebrochen/code)', async () => {
    const m = await laden();
    expect(m.pruefeAntwortsatz(satz())).toEqual(satz());
    const klein = { format: 'statable-antwort', version: 1, plan: { id: 'p', revision: 0 }, antwortId: UUID, werte: {} };
    expect(m.pruefeAntwortsatz(klein)).toEqual(klein);
    expect(m.pruefeAntwortsatz(satz({ code: 'ABCD-EFGH', abgebrochen: true }))).toMatchObject({ code: 'ABCD-EFGH', abgebrochen: true });
  });
  it('lehnt alles ab, was kein Antwortsatz ist', async () => {
    const m = await laden();
    for (const x of [null, undefined, 5, 'text', [], [satz()], true, () => 1]) expect(m.pruefeAntwortsatz(x)).toBeNull();
    expect(m.pruefeAntwortsatz(satz({ format: 'statable-schluessel' }))).toBeNull();
    expect(m.pruefeAntwortsatz(satz({ format: undefined }))).toBeNull();
    expect(m.pruefeAntwortsatz(satz({ version: 2 }))).toBeNull();
    expect(m.pruefeAntwortsatz(satz({ version: '1' }))).toBeNull();
    expect(m.pruefeAntwortsatz(satz({ werte: undefined }))).toBeNull();
    expect(m.pruefeAntwortsatz(satz({ werte: [1, 2] }))).toBeNull();
    expect(m.pruefeAntwortsatz(satz({ werte: 'x' }))).toBeNull();
  });
  it('prüft den Plan: id nichtleer und höchstens 200 Zeichen, Revision ganze Zahl ab 0', async () => {
    const m = await laden();
    for (const plan of [undefined, null, {}, { id: '', revision: 1 }, { id: 5, revision: 1 }, { id: 'a'.repeat(201), revision: 1 }, { id: 'p', revision: -1 }, { id: 'p', revision: 1.5 }, { id: 'p', revision: '1' }, { id: 'p' }])
      expect(m.pruefeAntwortsatz(satz({ plan }))).toBeNull();
  });
  it('prüft die UUID (Version 4)', async () => {
    const m = await laden();
    for (const antwortId of [undefined, '', 'abc', 7, '3f2b8c1e-9a4d-1e6f-8b7a-1c2d3e4f5a6b', '3f2b8c1e9a4d4e6f8b7a1c2d3e4f5a6b', UUID + 'x', '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6g'])
      expect(m.pruefeAntwortsatz(satz({ antwortId }))).toBeNull();
    expect(m.pruefeAntwortsatz(satz({ antwortId: UUID.toUpperCase() }))).not.toBeNull();
  });
  it('Datum nur als JJJJ-MM-TT ohne Uhrzeit und als echtes Kalenderdatum', async () => {
    const m = await laden();
    for (const start of ['2026-11-08T10:15:00Z', '2026-11-08 10:15', '08.11.2026', '2026-13-01', '2026-02-30', '2026-11-8', '', 20261108, null])
      expect(m.pruefeAntwortsatz(satz({ start }))).toBeNull();
    expect(m.pruefeAntwortsatz(satz({ ende: '2026-11-08T00:00:00.000Z' }))).toBeNull();
    expect(m.pruefeAntwortsatz(satz({ start: '2028-02-29' }))).not.toBeNull();   // Schaltjahr
    expect(m.pruefeAntwortsatz(satz({ start: '2027-02-29' }))).toBeNull();
  });
  it('code und abgebrochen müssen Text beziehungsweise Wahrheitswert sein', async () => {
    const m = await laden();
    expect(m.pruefeAntwortsatz(satz({ code: 5 }))).toBeNull();
    expect(m.pruefeAntwortsatz(satz({ abgebrochen: 'ja' }))).toBeNull();
  });
  it('werte: nur Zahl, Zahlenliste, Text bis 10.000 Zeichen und null; alles andere wird verworfen, der Rest bleibt', async () => {
    const m = await laden();
    const r = m.pruefeAntwortsatz(satz({ werte: {
      ok1: 1, ok2: [1, 2], ok3: 'a'.repeat(10000), ok4: null, ok5: [], ok6: '',
      zuLang: 'a'.repeat(10001), bool: true, objekt: { a: 1 }, gemischt: [1, 'x'], verschachtelt: [[1]], nan: NaN, unendlich: Infinity, listeMitNaN: [1, NaN],
      undef: undefined, fkt: () => 1, grossZahl: 10n,
    } }));
    expect(r).not.toBeNull();
    expect(Object.keys(r!.werte).sort()).toEqual(['ok1', 'ok2', 'ok3', 'ok4', 'ok5', 'ok6']);
    expect(r!.werte.ok3).toHaveLength(10000);
  });
  it('werte: gefährliche Schlüssel werden entfernt, die Eingabe bleibt unverändert, kein Prototyp-Eintrag', async () => {
    const m = await laden();
    const eingabe = JSON.parse('{"format":"statable-antwort","version":1,"plan":{"id":"p","revision":1},"antwortId":"' + UUID + '","werte":{"__proto__":{"boese":1},"constructor":5,"prototype":"x","q1":1},"zusatz":"weg"}');
    const kopie = JSON.stringify(eingabe);
    const r = m.pruefeAntwortsatz(eingabe)!;
    expect(r).not.toBeNull();
    expect(Object.keys(r.werte)).toEqual(['q1']);
    expect(({} as Record<string, unknown>).boese).toBeUndefined();
    expect('zusatz' in r).toBe(false);
    expect(JSON.stringify(eingabe)).toBe(kopie);
  });
});

describe('Verschlüsseln und Entschlüsseln (Rundreise)', () => {
  it('binär: .age-Datei, nur mit der passenden Identität lesbar', async () => {
    const m = await laden(); const s = await ladenS(); const p = await s.neuesSchluesselpaar();
    const bytes = await m.verschluesseleAntwort(satz() as never, p.empfaenger, 'binaer');
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(bytes.subarray(0, 21))).toBe('age-encryption.org/v1');
    expect(Buffer.from(bytes).toString('latin1')).not.toContain('Freitext');
    expect(await m.entschluesseleAntwort(bytes, p.identitaet)).toEqual(satz());
  });
  it('text: Armor mit BEGIN/END-Zeilen, Zeilen höchstens 64 Zeichen, Rundreise', async () => {
    const m = await laden(); const s = await ladenS(); const p = await s.neuesSchluesselpaar();
    const text = await m.verschluesseleAntwort(satz() as never, p.empfaenger, 'text');
    expect(typeof text).toBe('string');
    expect(text.startsWith('-----BEGIN AGE ENCRYPTED FILE-----\n')).toBe(true);
    expect(text.trimEnd().endsWith('-----END AGE ENCRYPTED FILE-----')).toBe(true);
    for (const z of text.split('\n')) expect(z.length).toBeLessThanOrEqual(64);
    expect(await m.entschluesseleAntwort(text, p.identitaet)).toEqual(satz());
  });
  it('zweimal verschlüsselt ergibt verschiedene Daten (frischer Zufall), beide lesbar', async () => {
    const m = await laden(); const s = await ladenS(); const p = await s.neuesSchluesselpaar();
    const a = await m.verschluesseleAntwort(satz() as never, p.empfaenger, 'text');
    const b = await m.verschluesseleAntwort(satz() as never, p.empfaenger, 'text');
    expect(a).not.toBe(b);
  });
  it('Armor-Text mit Leerzeichen, Leerzeilen und CRLF am Rand wird gelesen', async () => {
    const m = await laden(); const s = await ladenS(); const p = await s.neuesSchluesselpaar();
    const text = await m.verschluesseleAntwort(satz() as never, p.empfaenger, 'text');
    for (const v of ['  \n\n' + text + '\n  \t\n', text.replaceAll('\n', '\r\n'), '\r\n   ' + text.replaceAll('\n', '\r\n') + '   \r\n\r\n', '﻿' + text])
      expect(await m.entschluesseleAntwort(v, p.identitaet)).toEqual(satz());
  });
  it('falsche Identität -> klarer Fehler falsche-identitaet', async () => {
    const m = await laden(); const s = await ladenS(); const p = await s.neuesSchluesselpaar(); const q = await s.neuesSchluesselpaar();
    const bytes = await m.verschluesseleAntwort(satz() as never, p.empfaenger, 'binaer');
    await expect(m.entschluesseleAntwort(bytes, q.identitaet)).rejects.toMatchObject({ name: 'KryptoFehler', code: 'falsche-identitaet' });
    const text = await m.verschluesseleAntwort(satz() as never, p.empfaenger, 'text');
    await expect(m.entschluesseleAntwort(text, q.identitaet)).rejects.toMatchObject({ name: 'KryptoFehler', code: 'falsche-identitaet' });
  });
  it('kaputte Daten -> klarer Fehler kaputt, kein Absturz', async () => {
    const m = await laden(); const s = await ladenS(); const p = await s.neuesSchluesselpaar();
    const gut = await m.verschluesseleAntwort(satz() as never, p.empfaenger, 'binaer') as Uint8Array;
    const verdreht = gut.slice(); verdreht[verdreht.length - 5]! ^= 0x55;
    const text = await m.verschluesseleAntwort(satz() as never, p.empfaenger, 'text');
    const faelle: Array<Uint8Array | string> = [
      new Uint8Array(), new Uint8Array([0, 1, 2, 3]), gut.slice(0, 60), gut.slice(0, gut.length - 8), verdreht,
      '', 'irgendein Text', '-----BEGIN AGE ENCRYPTED FILE-----\n-----END AGE ENCRYPTED FILE-----\n',
      text.replace('-----END AGE ENCRYPTED FILE-----', ''), text.replace(/\n/, '\nÄÖÜ'), text.slice(0, text.length - 60) + '-----END AGE ENCRYPTED FILE-----\n',
    ];
    for (const f of faelle) await expect(m.entschluesseleAntwort(f, p.identitaet)).rejects.toMatchObject({ name: 'KryptoFehler', code: 'kaputt' });
  });
  it('gültig verschlüsselt, aber kein Antwortsatz (anderes JSON, kein JSON) -> kaputt', async () => {
    const m = await laden(); const s = await ladenS(); const p = await s.neuesSchluesselpaar();
    const age = await import('age-encryption');
    for (const inhalt of ['kein json', JSON.stringify({ format: 'statable-antwort', version: 9 }), '[]', 'null']) {
      const e = new age.Encrypter(); e.addRecipient(p.empfaenger);
      await expect(m.entschluesseleAntwort(await e.encrypt(inhalt), p.identitaet)).rejects.toMatchObject({ name: 'KryptoFehler', code: 'kaputt' });
    }
  });
  it('überlanger Armor-Text (> 1 MB) wird vor dem Entschlüsseln abgelehnt, und zwar schnell', async () => {
    const m = await laden(); const s = await ladenS(); const p = await s.neuesSchluesselpaar();
    expect(m.MAX_ARMOR_ZEICHEN).toBe(1_000_000);
    const zeile = 'A'.repeat(64) + '\n';
    const riesig = '-----BEGIN AGE ENCRYPTED FILE-----\n' + zeile.repeat(Math.ceil(1_000_001 / 65)) + '-----END AGE ENCRYPTED FILE-----\n';
    expect(riesig.length).toBeGreaterThan(1_000_000);
    const t0 = performance.now();
    await expect(m.entschluesseleAntwort(riesig, p.identitaet)).rejects.toMatchObject({ name: 'KryptoFehler', code: 'zu-gross' });
    expect(performance.now() - t0).toBeLessThan(500);
    // auch ohne gültige Kopfzeile und mit Leerraum aufgebläht
    await expect(m.entschluesseleAntwort(' '.repeat(1_000_001), p.identitaet)).rejects.toMatchObject({ name: 'KryptoFehler', code: 'zu-gross' });
  });
  it('ungültiger Empfänger oder ungültige Identität -> ungueltig', async () => {
    const m = await laden(); const s = await ladenS(); const p = await s.neuesSchluesselpaar();
    await expect(m.verschluesseleAntwort(satz() as never, 'age1kaputt', 'binaer')).rejects.toMatchObject({ name: 'KryptoFehler', code: 'ungueltig' });
    await expect(m.verschluesseleAntwort(satz() as never, '', 'text')).rejects.toMatchObject({ name: 'KryptoFehler', code: 'ungueltig' });
    const bytes = await m.verschluesseleAntwort(satz() as never, p.empfaenger, 'binaer');
    await expect(m.entschluesseleAntwort(bytes, 'kein-schluessel')).rejects.toMatchObject({ name: 'KryptoFehler', code: 'ungueltig' });
  });
  it('verschlüsselt nur gültige Sätze: ein Satz mit falschem Format wird abgelehnt', async () => {
    const m = await laden(); const s = await ladenS(); const p = await s.neuesSchluesselpaar();
    await expect(m.verschluesseleAntwort(satz({ antwortId: 'nix' }) as never, p.empfaenger, 'binaer')).rejects.toMatchObject({ name: 'KryptoFehler', code: 'ungueltig' });
  });
});

describe.skipIf(!ageVorhanden)('Gegenprobe mit dem echten age: Antworten', () => {
  it('Statable verschlüsselt (binär) an Empfänger aus age-keygen, age -d -i entschlüsselt gleich', async () => {
    const m = await laden(); const k = keygenPaar(); const t = tempOrdner();
    try {
      const bytes = await m.verschluesseleAntwort(satz() as never, k.empfaenger, 'binaer');
      const r = ageLauf('age', ['-d', '-i', t.datei('key.txt', k.dateiInhalt)], bytes);
      expect(r.stderr).toBe(''); expect(JSON.parse(r.stdout.toString('utf8'))).toEqual(satz());
    } finally { t.aufraeumen(); }
  });
  it('age -r verschlüsselt, Statable entschlüsselt gleich (binär und mit -a als Armor)', async () => {
    const m = await laden(); const s = await ladenS(); const p = await s.neuesSchluesselpaar();
    const json = JSON.stringify(satz());
    const bin = ageLauf('age', ['-r', p.empfaenger], json);
    expect(await m.entschluesseleAntwort(new Uint8Array(bin.stdout), p.identitaet)).toEqual(satz());
    const arm = ageLauf('age', ['-a', '-r', p.empfaenger], json);
    expect(await m.entschluesseleAntwort(arm.stdout.toString('utf8'), p.identitaet)).toEqual(satz());
  });
  it('Statable-Armor liest age -d', async () => {
    const m = await laden(); const k = keygenPaar(); const t = tempOrdner();
    try {
      const text = await m.verschluesseleAntwort(satz() as never, k.empfaenger, 'text');
      const r = ageLauf('age', ['-d', '-i', t.datei('key.txt', k.dateiInhalt)], text);
      expect(r.stderr).toBe(''); expect(JSON.parse(r.stdout.toString('utf8'))).toEqual(satz());
    } finally { t.aufraeumen(); }
  });
});
