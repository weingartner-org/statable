/**
 * Paket 5C Gegenprobe: Projektdatei mit Passwort gegen das echte age 1.3.2 (über age-plugin-batchpass).
 * Übersprungen (mit Meldung aus der Testhilfe), wenn age.exe oder batchpass fehlen.
 */
import { describe, expect, it } from 'vitest';
import type { Projekt } from './ablage';
import { projektAlsDatei } from './projektdatei';
import { neuesQualProjekt } from './qualprojekt';
import { ageLauf, batchpassVorhanden } from './age-werkzeug.testhilfe';
import { entschluesseleProjekt, verschluesseleProjekt } from './projektpasswort';

const klein = (extra: Partial<Projekt> = {}): Projekt => ({ name: 'Klein', quelle: 'x.csv', sav: Uint8Array.from({ length: 300 }, (_, i) => (i * 37) & 255), blaetter: [], entscheid: {}, zeit: 1760000000000, ...extra });
const zipMitQual = (): Uint8Array => {
  const q = neuesQualProjekt('Interviews');
  q.dokumente = [{ id: 'd1', name: 'Interview 1', art: 'text', text: 'Person 1: Grüße 😀', erstellt: 1, geaendert: 2 }];
  return projektAlsDatei(klein({ qual: q }));
};
const gleich = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);
const ZEIT = 60_000;
const PASSWOERTER = ['Pass wort ä€', 'Emoji 😀 ok', 'einfach1234'];

describe.skipIf(!batchpassVorhanden)('Projektpasswort gegen age 1.3.2 (batchpass)', () => {
  it('Statable verschlüsselt, age -d -j batchpass entschlüsselt: gleiche ZIP-Bytes', async () => {
    const zip = zipMitQual();
    for (const pw of PASSWOERTER) {
      const ct = await verschluesseleProjekt(zip, pw);
      const r = ageLauf('age', ['-d', '-j', 'batchpass'], ct, { AGE_PASSPHRASE: pw });
      expect(r.stderr).toBe('');
      expect(r.status).toBe(0);
      expect(gleich(new Uint8Array(r.stdout), zip)).toBe(true);
    }
  }, ZEIT);

  it('age -e -j batchpass verschlüsselt (wie age -p), entschluesseleProjekt öffnet: gleiche ZIP-Bytes', async () => {
    const zip = zipMitQual();
    for (const pw of PASSWOERTER) {
      const r = ageLauf('age', ['-e', '-j', 'batchpass'], zip, { AGE_PASSPHRASE: pw, AGE_PASSPHRASE_WORK_FACTOR: '12' });
      expect(r.status).toBe(0);
      const klar = await entschluesseleProjekt(new Uint8Array(r.stdout), pw);
      expect(gleich(klar, zip)).toBe(true);
    }
  }, ZEIT);

  it('falsches Passwort lehnen beide ab', async () => {
    const zip = zipMitQual();
    const ct = await verschluesseleProjekt(zip, 'richtig-richtig');
    expect(ageLauf('age', ['-d', '-j', 'batchpass'], ct, { AGE_PASSPHRASE: 'falsch-falsch' }).status).not.toBe(0);
    const r = ageLauf('age', ['-e', '-j', 'batchpass'], zip, { AGE_PASSPHRASE: 'richtig-richtig', AGE_PASSPHRASE_WORK_FACTOR: '12' });
    await expect(entschluesseleProjekt(new Uint8Array(r.stdout), 'falsch-falsch')).rejects.toThrow();
  }, ZEIT);
});
