/**
 * Paket 4D: Interview-Leitfäden in der Projektdatei (Fassung 2, `qualitativ/leitfaeden.json`).
 * Ohne Engine: ein kleines Projekt mit erfundenen Bytes reicht, die Datei prüft nur die Form.
 */
import { describe, expect, it } from 'vitest';
import { strToU8, unzipSync, zipSync } from 'fflate';
import type { Projekt } from './ablage';
import { leseProjektdatei, leseProjektdateiMitMeldungen, projektAlsDatei } from './projektdatei';
import { neuerLeitfaden, neuerBlock, sammleFragen, type Leitfaden } from './leitfaden';

const klein = (extra: Partial<Projekt> = {}): Projekt => ({ name: 'Klein', quelle: 'x.csv', sav: Uint8Array.from({ length: 300 }, (_, i) => (i * 37) & 255), blaetter: [], entscheid: {}, zeit: 1760000000000, ...extra });
const beispiel = (): Leitfaden => {
  let lf = neuerLeitfaden('Studienzeit 😀 Größe', 'de');
  lf = sammleFragen(lf, 'Wie ist Ihr Alltag?\nWie alt sind Sie?');
  lf = { ...lf, forschungsfrage: 'Wie erleben Studierende den Alltag?' };
  lf = neuerBlock(lf, 'Alltag').leitfaden;
  lf.bloecke[0]!.aspekte = ['Zeit', 'Stress'];
  return lf;
};
const ersterEintrag = (b: Uint8Array): string => { const n = b[26]! | (b[27]! << 8); return new TextDecoder().decode(b.subarray(30, 30 + n)); };

describe('Leitfäden in der Projektdatei', () => {
  it('Hin- und Rückweg: nur Leitfäden, ohne Fragebogen, schreibt Fassung 2 (ZIP)', () => {
    const lf = beispiel();
    const b = projektAlsDatei(klein({ leitfaeden: [lf] }));
    expect([b[0], b[1], b[2], b[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(ersterEintrag(b)).toBe('statable.json');
    const z = unzipSync(b);
    expect(Object.keys(z)).toContain('qualitativ/leitfaeden.json');
    const r = leseProjektdateiMitMeldungen(b);
    expect(r.meldungen).toEqual([]);
    expect(r.projekt.leitfaeden).toEqual([lf]);
    expect(r.projekt.fragebogen).toBeUndefined();
    expect(Array.from(r.projekt.sav)).toEqual(Array.from(klein().sav));
  });
  it('ohne Leitfäden bleibt es bei Fassung 1', () => {
    const b = projektAlsDatei(klein());
    expect(b[0]).toBe(0x7b);
    expect(projektAlsDatei(klein({ leitfaeden: [] }))[0]).toBe(0x7b);
    expect(leseProjektdatei(b).leitfaeden).toBeUndefined();
  });
  it('kaputtes JSON wird gemeldet, das Projekt öffnet trotzdem', () => {
    const z = unzipSync(projektAlsDatei(klein({ leitfaeden: [beispiel()] })));
    const kaputt = zipSync({ ...z, 'qualitativ/leitfaeden.json': strToU8('{"nicht": [') });
    const r = leseProjektdateiMitMeldungen(kaputt);
    expect(r.projekt.leitfaeden).toBeUndefined();
    expect(r.projekt.name).toBe('Klein');
    expect(r.meldungen.map(m => [m.art, m.name])).toEqual([['leitfadenKaputt', 'qualitativ/leitfaeden.json']]);
  });
  it('ein Leitfaden mit falschem Feld wird gemeldet, nicht still übernommen', () => {
    const z = unzipSync(projektAlsDatei(klein({ leitfaeden: [beispiel()] })));
    const falsch = JSON.parse(new TextDecoder().decode(z['qualitativ/leitfaeden.json']!));
    falsch[0].sprache = 'fr';
    const r = leseProjektdateiMitMeldungen(zipSync({ ...z, 'qualitativ/leitfaeden.json': strToU8(JSON.stringify(falsch)) }));
    expect(r.projekt.leitfaeden).toBeUndefined();
    expect(r.meldungen).toHaveLength(1);
  });
  it('`qualitativ/zukunft.json` bleibt ein unbekannter Eintrag und wird nicht gelesen', () => {
    const z = unzipSync(projektAlsDatei(klein({ leitfaeden: [beispiel()] })));
    const r = leseProjektdateiMitMeldungen(zipSync({ ...z, 'qualitativ/zukunft.json': strToU8('{}') }));
    expect(r.meldungen.map(m => [m.art, m.name])).toEqual([['unbekannterEintrag', 'qualitativ/zukunft.json']]);
    expect(r.projekt.leitfaeden).toHaveLength(1);
  });
  it('mehrere Leitfäden bleiben in der Reihenfolge', () => {
    const a = neuerLeitfaden('A', 'de'), c = neuerLeitfaden('C', 'en');
    const r = leseProjektdatei(projektAlsDatei(klein({ leitfaeden: [c, a] })));
    expect(r.leitfaeden!.map(l => l.titel)).toEqual(['C', 'A']);
  });
});
