// Gegenprobe: typage (age-encryption 0.3.1) gegen das echte age-Werkzeug 1.3.2. Prüft nur die Bibliothek, nicht Statable-Code.
// Übersprungen (mit Meldung), wenn age.exe fehlt. Läuft ohne Bau.
import { describe, expect, it } from 'vitest';
import * as age from 'age-encryption';
import { ageLauf, ageVorhanden, batchpassVorhanden, keygenPaar, tempOrdner } from './age-werkzeug.testhilfe';

const TEXT = 'Grüße aus Statable: {"werte":{"q1":3}}';
const bytes = (s: string) => new TextEncoder().encode(s);

describe.skipIf(!ageVorhanden)('typage gegen age 1.3.2 (CLI)', () => {
  it('typage verschlüsselt an Empfänger aus age-keygen, age -d -i entschlüsselt gleich', async () => {
    const k = keygenPaar(); const t = tempOrdner();
    try {
      const e = new age.Encrypter(); e.addRecipient(k.empfaenger);
      const ct = await e.encrypt(TEXT);
      const aus = ageLauf('age', ['-d', '-i', t.datei('key.txt', k.dateiInhalt)], ct);
      expect(aus.stderr).toBe(''); expect(aus.status).toBe(0);
      expect(aus.stdout.toString('utf8')).toBe(TEXT);
    } finally { t.aufraeumen(); }
  });

  it('age -r <Empfänger aus typage> verschlüsselt, typage entschlüsselt gleich', async () => {
    const id = await age.generateIdentity(); const rec = await age.identityToRecipient(id);
    expect(id).toMatch(/^AGE-SECRET-KEY-1/); expect(rec).toMatch(/^age1/);
    const r = ageLauf('age', ['-r', rec], TEXT);
    expect(r.status).toBe(0);
    const d = new age.Decrypter(); d.addIdentity(id);
    expect(await d.decrypt(new Uint8Array(r.stdout), 'text')).toBe(TEXT);
  });

  it('Armor: age -a -r wird von typage gelesen; typage-Armor liest age -d', async () => {
    const id = await age.generateIdentity(); const rec = await age.identityToRecipient(id);
    const aus = ageLauf('age', ['-a', '-r', rec], TEXT);
    expect(aus.status).toBe(0);
    const text = aus.stdout.toString('utf8');
    expect(text.startsWith('-----BEGIN AGE ENCRYPTED FILE-----')).toBe(true);
    const d = new age.Decrypter(); d.addIdentity(id);
    expect(await d.decrypt(age.armor.decode(text), 'text')).toBe(TEXT);

    const e = new age.Encrypter(); e.addRecipient(rec);
    const armor = age.armor.encode(await e.encrypt(TEXT));
    const t = tempOrdner();
    try {
      const r = ageLauf('age', ['-d', '-i', t.datei('key.txt', id + '\n')], armor);
      expect(r.stderr).toBe(''); expect(r.stdout.toString('utf8')).toBe(TEXT);
    } finally { t.aufraeumen(); }
  });

  it('Identität aus age-keygen in typage: Empfänger stimmt mit age-keygen überein', async () => {
    const k = keygenPaar();
    expect(await age.identityToRecipient(k.identitaet)).toBe(k.empfaenger);
  });

  describe.skipIf(!batchpassVorhanden)('Passwort (scrypt) über age-plugin-batchpass', () => {
    it('typage mit Passwort verschlüsselt, age -d -j batchpass öffnet (Arbeitsstufe 10 und Standard 18)', async () => {
      for (const stufe of [10, 18]) {
        const e = new age.Encrypter(); e.setScryptWorkFactor(stufe); e.setPassphrase('Pass wort ä€');
        const ct = await e.encrypt(TEXT);
        const r = ageLauf('age', ['-d', '-j', 'batchpass'], ct, { AGE_PASSPHRASE: 'Pass wort ä€' });
        expect(r.stderr).toBe(''); expect(r.status).toBe(0);
        expect(r.stdout.toString('utf8')).toBe(TEXT);
      }
    });
    it('age -e -j batchpass verschlüsselt, typage öffnet mit Passwort', async () => {
      const r = ageLauf('age', ['-e', '-j', 'batchpass'], TEXT, { AGE_PASSPHRASE: 'Pass wort ä€', AGE_PASSPHRASE_WORK_FACTOR: '10' });
      expect(r.status).toBe(0);
      const d = new age.Decrypter(); d.addPassphrase('Pass wort ä€');
      expect(await d.decrypt(new Uint8Array(r.stdout), 'text')).toBe(TEXT);
    });
    it('falsches Passwort wird von beiden abgelehnt', async () => {
      const e = new age.Encrypter(); e.setScryptWorkFactor(10); e.setPassphrase('richtig');
      const ct = await e.encrypt(bytes(TEXT));
      expect(ageLauf('age', ['-d', '-j', 'batchpass'], ct, { AGE_PASSPHRASE: 'falsch' }).status).not.toBe(0);
      const d = new age.Decrypter(); d.addPassphrase('falsch');
      await expect(d.decrypt(ct, 'text')).rejects.toThrow();
    });
  });
});
