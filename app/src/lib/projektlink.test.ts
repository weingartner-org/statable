import { describe, expect, it } from 'vitest';
import { holeProjekt, linkAdresse, pruefeAdresse, ProjektlinkFehler } from './projektlink';
import { projektAlsDatei } from './projektdatei';
import type { Projekt } from './ablage';

const BASIS = 'https://statable.example/app/index.html#start';
const grund = (f: () => unknown) => { try { f(); } catch (e) { return (e as ProjektlinkFehler).grund; } return 'kein Fehler'; };
const projekt: Projekt = { name: 'Medien', quelle: 'x.csv', sav: new Uint8Array([1, 2, 3]), blaetter: [], entscheid: {}, zeit: 1 };
const antwort = (inhalt: string | Uint8Array, extra: Partial<Response> & { url?: string } = {}) => async () => { const b = typeof inhalt === 'string' ? new TextEncoder().encode(inhalt) : inhalt; return { ok: true, url: '', headers: new Headers(), arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), ...extra } as unknown as Response; };

describe('Adresse aus dem Link', () => {
  it('liest ?projekt= und #oeffne=', () => {
    expect(linkAdresse('?projekt=kurs%2Fmedien.statable', '')).toBe('kurs/medien.statable');
    expect(linkAdresse('', '#oeffne=https%3A%2F%2Fa.example%2Fb.statable')).toBe('https://a.example/b.statable');
    expect(linkAdresse('?x=1', '#daten')).toBeNull();
  });
});

describe('Herkunftsprüfung', () => {
  it('lässt die eigene Herkunft zu, auch relativ', () => {
    expect(pruefeAdresse('kurs/medien.statable', BASIS).href).toBe('https://statable.example/app/kurs/medien.statable');
    expect(pruefeAdresse('https://statable.example/x.statable', BASIS).host).toBe('statable.example');
  });
  it('weist fremde Herkunft ab - auch ähnlich aussehende', () => {
    expect(grund(() => pruefeAdresse('https://moodle.uni.example/f.statable', BASIS))).toBe('fremd');
    expect(grund(() => pruefeAdresse('https://statable.example.evil.example/f.statable', BASIS))).toBe('fremd');
    expect(grund(() => pruefeAdresse('//evil.example/f.statable', BASIS))).toBe('fremd');
    expect(grund(() => pruefeAdresse('https://statable.example@evil.example/f', BASIS))).toBe('ungueltig');
  });
  it('weist andere Protokolle, Zugangsdaten und unverschlüsselte Adressen ab', () => {
    expect(grund(() => pruefeAdresse('javascript:alert(1)', BASIS))).toBe('ungueltig');
    expect(grund(() => pruefeAdresse('data:text/plain,x', BASIS))).toBe('ungueltig');
    expect(grund(() => pruefeAdresse('file:///etc/passwd', BASIS))).toBe('ungueltig');
    expect(grund(() => pruefeAdresse('https://u:p@statable.example/f', BASIS))).toBe('ungueltig');
    expect(grund(() => pruefeAdresse('http://statable.example/f', BASIS))).toBe('fremd');
  });
  it('eine ausdrücklich erlaubte Herkunft geht', () => {
    expect(pruefeAdresse('https://dateien.uni.example/a.statable', BASIS, ['https://dateien.uni.example']).host).toBe('dateien.uni.example');
  });
});

describe('Datei holen', () => {
  it('liest ein Projekt von der eigenen Herkunft, ohne Cookies', async () => {
    let optionen: RequestInit | undefined;
    const holen = (async (_u: string, o?: RequestInit) => { optionen = o; return antwort(projektAlsDatei(projekt))(); }) as unknown as typeof fetch;
    const r = await holeProjekt('m.statable', BASIS, holen);
    expect(r.projekt.name).toBe('Medien'); expect(r.host).toBe('statable.example');
    expect(optionen?.credentials).toBe('omit');
  });
  it('liest auch ein Projekt mit Fragebogen-Plan (ZIP, Fassung 2) und gibt Meldungen mit', async () => {
    const plan = { format: 'statable-fragebogen', version: 1, id: 'p-1', revision: 1, titel: { de: 'T' }, sprachen: ['de'], einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' }, antwortlisten: [], skalen: [], elemente: [], geaendert: 1 } as unknown as NonNullable<Projekt['fragebogen']>[number];
    const holen = antwort(projektAlsDatei({ ...projekt, fragebogen: [plan] })) as unknown as typeof fetch;
    const r = await holeProjekt('m.statable', BASIS, holen);
    expect(r.projekt.fragebogen?.[0]?.id).toBe('p-1'); expect(r.meldungen).toEqual([]);
  });
  it('holt von fremder Herkunft gar nicht erst', async () => {
    let gerufen = false;
    const holen = (async () => { gerufen = true; return antwort('')(); }) as unknown as typeof fetch;
    await expect(holeProjekt('https://fremd.example/m.statable', BASIS, holen)).rejects.toMatchObject({ grund: 'fremd' });
    expect(gerufen).toBe(false);
  });
  it('weist eine Weiterleitung auf fremde Herkunft ab', async () => {
    const holen = antwort(projektAlsDatei(projekt), { url: 'https://fremd.example/m.statable' }) as unknown as typeof fetch;
    await expect(holeProjekt('m.statable', BASIS, holen)).rejects.toMatchObject({ grund: 'fremd' });
  });
  it('meldet Fehler: nicht erreichbar, kein Projekt, zu groß', async () => {
    await expect(holeProjekt('m.statable', BASIS, (async () => { throw new Error('netz'); }) as unknown as typeof fetch)).rejects.toMatchObject({ grund: 'laden' });
    await expect(holeProjekt('m.statable', BASIS, antwort('{"a":1}') as unknown as typeof fetch)).rejects.toMatchObject({ grund: 'datei' });
    await expect(holeProjekt('m.statable', BASIS, antwort('x', { headers: new Headers({ 'content-length': String(200 * 1024 * 1024) }) }) as unknown as typeof fetch)).rejects.toMatchObject({ grund: 'zugross' });
    await expect(holeProjekt('m.statable', BASIS, antwort('', { ok: false }) as unknown as typeof fetch)).rejects.toMatchObject({ grund: 'laden' });
  });
});
