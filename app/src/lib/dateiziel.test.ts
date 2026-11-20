import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { holeZugriff, leseZiel, merkeZiel, schreibeInDatei, vergissZiel, type DateiZugriff } from './dateiziel';

/** Ein Ersatz für den Datei-Zugriff des Browsers. */
function handle(o: { recht?: string; nachFrage?: string; schreibFehler?: string } = {}) {
  const log = { inhalt: null as string | null, abgebrochen: false, gefragt: 0 };
  let recht = o.recht ?? 'granted';
  const h: DateiZugriff = {
    name: 'medien.statable',
    queryPermission: async () => recht,
    requestPermission: async () => { log.gefragt++; recht = o.nachFrage ?? 'denied'; return recht; },
    createWritable: async () => {
      if (o.schreibFehler === 'NotFoundError') throw Object.assign(new Error('weg'), { name: 'NotFoundError' });
      let puffer = '';
      return { write: async (t: string) => { if (o.schreibFehler === 'voll') throw new Error('voll'); puffer += t; }, close: async () => { log.inhalt = puffer; }, abort: async () => { log.abgebrochen = true; } };
    }
  };
  return { h, log };
}

describe('Schreiben in die gemerkte Datei', () => {
  it('schreibt bei erteiltem Recht und fragt nicht', async () => {
    const { h, log } = handle();
    expect(await schreibeInDatei(h, 'inhalt', true)).toBe('ok');
    expect(log.inhalt).toBe('inhalt'); expect(log.gefragt).toBe(0);
  });
  it('fragt nach dem Recht, wenn erlaubt, und schreibt dann', async () => {
    const { h, log } = handle({ recht: 'prompt', nachFrage: 'granted' });
    expect(await schreibeInDatei(h, 'x', true)).toBe('ok');
    expect(log.gefragt).toBe(1); expect(log.inhalt).toBe('x');
  });
  it('fragt nicht, wenn nicht erlaubt (ohne Klick), und schreibt nichts', async () => {
    const { h, log } = handle({ recht: 'prompt', nachFrage: 'granted' });
    expect(await schreibeInDatei(h, 'x', false)).toBe('berechtigung');
    expect(log.gefragt).toBe(0); expect(log.inhalt).toBeNull();
  });
  it('verweigertes Recht ändert die Datei nicht', async () => {
    const { h, log } = handle({ recht: 'prompt' });
    expect(await schreibeInDatei(h, 'x', true)).toBe('berechtigung');
    expect(log.inhalt).toBeNull();
  });
  it('meldet eine verschwundene Datei', async () => {
    expect(await schreibeInDatei(handle({ schreibFehler: 'NotFoundError' }).h, 'x', true)).toBe('weg');
  });
  it('bricht bei einem Schreibfehler ab, damit die alte Datei bleibt, und gibt den Fehler weiter', async () => {
    const { h, log } = handle({ schreibFehler: 'voll' });
    await expect(schreibeInDatei(h, 'x', true)).rejects.toThrow('voll');
    expect(log.abgebrochen).toBe(true); expect(log.inhalt).toBeNull();
  });
  it('ohne Rechte-Abfrage (ältere Browser) gilt der Zugriff als erteilt', async () => {
    expect(await holeZugriff({ name: 'a', createWritable: async () => { throw new Error('x'); } }, false)).toBe(true);
  });
});

describe('Gemerktes Ziel je Projekt', () => {
  it('merkt, liest und vergisst', async () => {
    expect(await leseZiel('p1')).toBeUndefined();
    expect(await merkeZiel('p1', { name: 'a.statable', zeit: 5, art: 'download' })).toBe(true);
    expect(await leseZiel('p1')).toMatchObject({ name: 'a.statable', zeit: 5, art: 'download' });
    expect(await leseZiel('p2')).toBeUndefined();
    await vergissZiel('p1');
    expect(await leseZiel('p1')).toBeUndefined();
  });
});
