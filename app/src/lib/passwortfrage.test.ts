/**
 * Paket 5E2: Passwort-Frage beim Speichern und Öffnen (reine Hilfen und der Ablauf des Öffnens ohne Bildschirm).
 */
import { describe, expect, it } from 'vitest';
import { generateIdentity, identityToRecipient, Encrypter } from 'age-encryption';
import type { Projekt } from './ablage';
import { DateiFehler, leseDatei } from './einlesen';
import { projektAlsDatei } from './projektdatei';
import { verschluesseleProjekt } from './projektpasswort';
import { pwUi } from './projektpasswort-ui.svelte';
import { beiGespeichert, meldeGespeichertHaken, nurPasswortEmpfaenger, speichernFrageNoetig } from './passwortfrage';
import { neuesQualProjekt } from './qualprojekt';

const ZEIT = 30_000;
const projekt = (): Projekt => {
  const q = neuesQualProjekt('Interviews');
  q.dokumente = [{ id: 'd1', name: 'Interview 1', art: 'text', text: 'Anna sagt hallo.', erstellt: 1, geaendert: 2 }];
  return { name: 'Mit Passwort', quelle: 'x.csv', sav: Uint8Array.from({ length: 300 }, (_, i) => (i * 37) & 255), blaetter: [], entscheid: {}, zeit: 1760000000000, qual: q };
};
const datei = (bytes: Uint8Array, name = 'p.statable') => new File([bytes as BlobPart], name);
const tick = () => new Promise(r => setTimeout(r, 0));
const schluesselDatei = async () => {
  const e = new Encrypter(); e.addRecipient(await identityToRecipient(await generateIdentity()));
  return e.encrypt(projektAlsDatei(projekt()));
};

describe('speichernFrageNoetig: einmal je Sitzung', () => {
  it('persönliche Daten und noch nicht gefragt: ja', () => expect(speichernFrageNoetig({ gefragt: false, persoenlich: true, verschluesselt: false })).toBe(true));
  it('schon gefragt: nein', () => expect(speichernFrageNoetig({ gefragt: true, persoenlich: true, verschluesselt: false })).toBe(false));
  it('keine persönlichen Daten: nein', () => expect(speichernFrageNoetig({ gefragt: false, persoenlich: false, verschluesselt: false })).toBe(false));
  it('verschlüsselt geöffnet oder gespeichert: immer wieder', () => expect(speichernFrageNoetig({ gefragt: true, persoenlich: false, verschluesselt: true })).toBe(true));
});

describe('nurPasswortEmpfaenger', () => {
  it('scrypt: ja', async () => { expect(nurPasswortEmpfaenger(await verschluesseleProjekt(new Uint8Array([1, 2, 3]), 'Geheim 1234'))).toBe(true); }, ZEIT);
  it('Schlüssel (X25519): nein', async () => { expect(nurPasswortEmpfaenger(await schluesselDatei())).toBe(false); });
  it('kein age: nein', () => expect(nurPasswortEmpfaenger(new Uint8Array([80, 75, 3, 4]))).toBe(false));
});

describe('beiGespeichert', () => {
  it('ruft den Hörer und lässt sich abmelden', () => {
    let n = 0; const weg = beiGespeichert(() => n++);
    meldeGespeichertHaken(); weg(); meldeGespeichertHaken();
    expect(n).toBe(1);
  });
});

describe('Verschlüsselt gespeicherte Projektdatei öffnen (Dialog wird von hier aus bedient)', () => {
  it('falsches, dann richtiges Passwort: Datei bleibt zu, dann Projekt mit Text', async () => {
    const ct = await verschluesseleProjekt(projektAlsDatei(projekt()), 'Geheim 1234');
    const lauf = leseDatei(datei(ct));
    await tick();
    const d = pwUi.dlg;
    expect(d?.art).toBe('oeffnen');
    if (d?.art !== 'oeffnen') return;
    expect(await d.versuch('falsch-falsch')).toBe(false);   // Dialog bleibt, Feld bleibt
    expect(await d.versuch('Geheim 1234')).toBe(true);
    pwUi.dlg = null; d.fertig(true);
    const e = await lauf;
    expect(e.art).toBe('projekt');
    if (e.art !== 'projekt') return;
    expect(e.verschluesselt).toBe(true);
    expect(e.projekt.qual?.dokumente[0]?.text).toBe('Anna sagt hallo.');
  }, ZEIT);

  it('Abbrechen öffnet nichts', async () => {
    const ct = await verschluesseleProjekt(projektAlsDatei(projekt()), 'Geheim 1234');
    const lauf = leseDatei(datei(ct));
    const erwartet = expect(lauf).rejects.toMatchObject({ grund: 'abgebrochen' });
    await tick();
    const d = pwUi.dlg;
    pwUi.dlg = null;
    if (d?.art === 'oeffnen') d.fertig(false);
    await erwartet;
    await expect(lauf).rejects.toBeInstanceOf(DateiFehler);
  }, ZEIT);

  it('Datei mit Schlüssel statt Passwort: erst der Satz, dann nichts geöffnet', async () => {
    const lauf = leseDatei(datei(await schluesselDatei()));
    const erwartet = expect(lauf).rejects.toMatchObject({ grund: 'abgebrochen' });
    await tick();
    const d = pwUi.dlg;
    expect(d?.art).toBe('schluessel');
    pwUi.dlg = null;
    if (d?.art === 'schluessel') d.fertig();
    await erwartet;
  });

  it('unverschlüsselte Datei öffnet ohne Dialog, ohne Merker', async () => {
    const e = await leseDatei(datei(projektAlsDatei(projekt())));
    expect(pwUi.dlg).toBeNull();
    expect(e.art === 'projekt' && e.verschluesselt).toBeFalsy();
  });
});
