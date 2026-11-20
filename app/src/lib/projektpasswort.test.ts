/**
 * Paket 5C (Prüfer, rot bis `projektpasswort.ts` gebaut ist): Projektdatei mit Passwort (age, scrypt).
 * Gegenprobe mit dem echten age-Werkzeug steht in projektpasswort-gegenprobe.test.ts.
 */
import { describe, expect, it } from 'vitest';
import * as age from 'age-encryption';
import type { Projekt } from './ablage';
import { leseProjektdatei, projektAlsDatei } from './projektdatei';
import { neuesQualProjekt, type QualProjekt } from './qualprojekt';
import { AGE_KOPF, enthaeltPersoenliches, entschluesseleProjekt, istVerschluesselt, MIN_PASSWORT, NichtMitPasswort, PasswortFalsch, pruefePasswort, verschluesseleProjekt } from './projektpasswort';

const klein = (extra: Partial<Projekt> = {}): Projekt => ({ name: 'Klein', quelle: 'x.csv', sav: Uint8Array.from({ length: 300 }, (_, i) => (i * 37) & 255), blaetter: [], entscheid: {}, zeit: 1760000000000, ...extra });
const TEXT = 'Interviewerin: Wie geht es Ihnen? 😀\r\n\r\nPerson 1: Gut, danke.';
const qual = (): QualProjekt => {
  const q = neuesQualProjekt('Interviews');
  q.dokumente = [{ id: 'd1', name: 'Interview 1', art: 'text', text: TEXT, erstellt: 1, geaendert: 2 }];
  q.codes = [{ id: 'c1', name: 'Zeit', kodierbar: true, reihenfolge: 0 }];
  return q;
};
const gleich = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);
const enthaelt = (heu: Uint8Array, nadel: Uint8Array) => {
  for (let i = 0; i + nadel.length <= heu.length; i++) {
    let ok = true;
    for (let j = 0; j < nadel.length; j++) if (heu[i + j] !== nadel[j]) { ok = false; break; }
    if (ok) return true;
  }
  return false;
};
const utf8 = (s: string) => new TextEncoder().encode(s);
const ZEIT = 30_000;

describe('Projektdatei mit Passwort: Hin- und Rückweg', () => {
  it('Fassung 2 mit qualitativem Teil: verschlüsseln, entschlüsseln, Bytes gleich, Projekt lesbar', async () => {
    const zip = projektAlsDatei(klein({ qual: qual() }));
    const ct = await verschluesseleProjekt(zip, 'Geheim 1234');
    expect(istVerschluesselt(ct)).toBe(true);
    expect(gleich(ct, zip)).toBe(false);
    const klar = await entschluesseleProjekt(ct, 'Geheim 1234');
    expect(gleich(klar, zip)).toBe(true);
    expect(leseProjektdatei(klar).qual!.dokumente[0]!.text).toBe(TEXT);
  }, ZEIT);

  it('Kopf der Datei ist der age-Kopf mit scrypt', async () => {
    expect(AGE_KOPF).toBe('age-encryption.org/v1');
    const ct = await verschluesseleProjekt(projektAlsDatei(klein()), 'Geheim 1234');
    expect(new TextDecoder().decode(ct.subarray(0, AGE_KOPF.length))).toBe(AGE_KOPF);
    expect(new TextDecoder().decode(ct.subarray(0, 200))).toContain('-> scrypt ');
  }, ZEIT);

  it('Passwörter mit Umlauten, Emoji und Leerzeichen', async () => {
    const zip = projektAlsDatei(klein({ qual: qual() }));
    for (const pw of ['Äpfel & Öl über Straße', 'pass 😀 wort 👩‍👩‍👧', '  Leer zeichen  ']) {
      const ct = await verschluesseleProjekt(zip, pw);
      expect(gleich(await entschluesseleProjekt(ct, pw), zip)).toBe(true);
    }
  }, ZEIT * 2);

  it('falsches Passwort: PasswortFalsch, auch bei fast gleichem Passwort', async () => {
    const ct = await verschluesseleProjekt(projektAlsDatei(klein()), 'richtig-richtig');
    await expect(entschluesseleProjekt(ct, 'falsch-falsch')).rejects.toBeInstanceOf(PasswortFalsch);
    await expect(entschluesseleProjekt(ct, 'Richtig-richtig')).rejects.toBeInstanceOf(PasswortFalsch);
    await expect(entschluesseleProjekt(ct, 'richtig-richtig ')).rejects.toBeInstanceOf(PasswortFalsch);
  }, ZEIT);

  it('age-Datei mit Schlüssel-Empfänger (X25519): NichtMitPasswort, nicht PasswortFalsch', async () => {
    const id = await age.generateIdentity();
    const rec = await age.identityToRecipient(id);
    const e = new age.Encrypter(); e.addRecipient(rec);
    const ct = await e.encrypt(projektAlsDatei(klein()));
    expect(istVerschluesselt(ct)).toBe(true);
    const f = await entschluesseleProjekt(ct, 'irgendein-passwort').catch(x => x);
    expect(f).toBeInstanceOf(NichtMitPasswort);
    expect(f).not.toBeInstanceOf(PasswortFalsch);
  });

  it('kein Passwort im Ergebnis (UTF-8) und kein Klartext der Interviews', async () => {
    const pw = 'SehrGeheimesPasswort-ÄÖÜ-4711';
    const ct = await verschluesseleProjekt(projektAlsDatei(klein({ qual: qual() })), pw);
    expect(enthaelt(ct, utf8(pw))).toBe(false);
    expect(enthaelt(ct, utf8('Gut, danke'))).toBe(false);
    expect(enthaelt(ct, utf8('statable-projekt'))).toBe(false);
  }, ZEIT);

  it('zwei Verschlüsselungen derselben Datei sind verschieden (neues Salz)', async () => {
    const zip = projektAlsDatei(klein());
    const a = await verschluesseleProjekt(zip, 'Geheim 1234');
    const b = await verschluesseleProjekt(zip, 'Geheim 1234');
    expect(gleich(a, b)).toBe(false);
  }, ZEIT);
});

describe('istVerschluesselt', () => {
  it('age-Kopf: ja', () => { expect(istVerschluesselt(utf8('age-encryption.org/v1\n-> scrypt abc 18\n'))).toBe(true); });
  it('normale ZIP-Projektdatei: nein', () => { expect(istVerschluesselt(projektAlsDatei(klein({ qual: qual() })))).toBe(false); });
  it('alte JSON-Projektdatei (Fassung 1): nein', () => {
    const b = projektAlsDatei(klein());
    expect(b[0]).toBe(0x7b);
    expect(istVerschluesselt(b)).toBe(false);
  });
  it('leere und zu kurze Bytes: nein, kein Fehler', () => {
    expect(istVerschluesselt(new Uint8Array(0))).toBe(false);
    expect(istVerschluesselt(utf8('age-enc'))).toBe(false);
  });
  it('Kopf nicht am Anfang: nein', () => { expect(istVerschluesselt(utf8(' age-encryption.org/v1\n'))).toBe(false); });
});

describe('pruefePasswort', () => {
  it('Mindestlänge ist 8', () => { expect(MIN_PASSWORT).toBe(8); });
  it('7 Zeichen: kurz, 8: ok', () => {
    expect(pruefePasswort('1234567', '1234567')).toBe('kurz');
    expect(pruefePasswort('12345678', '12345678')).toBe('ok');
  });
  it('Länge zählt in Codepoints: Emoji zählt eins', () => {
    expect(pruefePasswort('abcdefg😀', 'abcdefg😀')).toBe('ok');
    expect(pruefePasswort('abcdef😀', 'abcdef😀')).toBe('kurz');
    expect(pruefePasswort('😀😀😀😀😀😀😀😀', '😀😀😀😀😀😀😀😀')).toBe('ok');
  });
  it('verschieden', () => {
    expect(pruefePasswort('12345678', '12345679')).toBe('verschieden');
    expect(pruefePasswort('12345678', '1234567 8')).toBe('verschieden');
    expect(pruefePasswort('Abcdefgh', 'abcdefgh')).toBe('verschieden');
  });
  it('Leerzeichen zählen mit und werden nicht abgeschnitten', () => { expect(pruefePasswort('        ', '        ')).toBe('ok'); });
  it('leer und gleich: kurz', () => { expect(pruefePasswort('', '')).toBe('kurz'); });
});

describe('enthaeltPersoenliches', () => {
  const leer = () => neuesQualProjekt('Leer');
  it('undefined ohne Zitate: nein', () => { expect(enthaeltPersoenliches(undefined, false)).toBe(false); });
  it('undefined mit Zitate-Kennzeichen: ja', () => { expect(enthaeltPersoenliches(undefined, true)).toBe(true); });
  it('leeres QualProjekt: nein; mit Zitate-Kennzeichen: ja', () => {
    expect(enthaeltPersoenliches(leer(), false)).toBe(false);
    expect(enthaeltPersoenliches(leer(), true)).toBe(true);
  });
  it('mit Dokument: ja', () => { expect(enthaeltPersoenliches(qual(), false)).toBe(true); });
  it('nur Memo: ja', () => {
    const q = leer(); q.memos = [{ id: 'm1', text: 'Notiz', bezug: [{ art: 'projekt' }], erstellt: 1 }];
    expect(enthaeltPersoenliches(q, false)).toBe(true);
  });
  it('nur Segment: ja', () => {
    const q = leer(); q.segmente = [{ id: 's1', dokument: 'd1', start: 0, ende: 3, erstellt: 1 }];
    expect(enthaeltPersoenliches(q, false)).toBe(true);
  });
  it('nur Codes und Fälle ohne Texte: nein', () => {
    const q = leer();
    q.codes = [{ id: 'c1', name: 'Zeit', kodierbar: true, reihenfolge: 0 }];
    q.faelle = [{ id: 'f1', name: 'Fall 1', werte: {} }];
    expect(enthaeltPersoenliches(q, false)).toBe(false);
  });
});
