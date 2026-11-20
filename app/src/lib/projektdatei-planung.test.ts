/**
 * Stufe V2 Teil 2a: die Forschungsplanung in der Projektdatei (Fassung 2, `planung/planung.json`).
 * Ohne Engine: ein kleines Projekt mit erfundenen Bytes reicht.
 */
import { describe, expect, it } from 'vitest';
import { strToU8, unzipSync, zipSync } from 'fflate';
import type { Projekt } from './ablage';
import { leseProjektdatei, leseProjektdateiMitMeldungen, projektAlsDatei } from './projektdatei';
import { lesePlanung, setzeAntwort, type Planung } from './planung';

const klein = (extra: Partial<Projekt> = {}): Projekt => ({ name: 'Klein', quelle: 'x.csv', sav: Uint8Array.from({ length: 300 }, (_, i) => (i * 37) & 255), blaetter: [], entscheid: {}, zeit: 1760000000000, ...extra });
const beispiel = (): Planung[] => {
  let p = setzeAntwort(undefined, 'dmp', 'dmp-1-1', { stand: 'ausgefuellt', text: 'Antworten 😀 aus einem Online-Fragebogen, Größe ca. 2 MB' }, 111);
  p = setzeAntwort(p, 'prereg', 'pre-1-3', { stand: 'offen' }, 222);
  p = setzeAntwort(p, 'dmp', 'dmp-6-3', { stand: 'nicht-zutreffend' }, 333);
  return p!;
};

describe('Planung in der Projektdatei', () => {
  it('Hin- und Rückweg: nur Planung schreibt Fassung 2 mit eigenem Eintrag', () => {
    const p = beispiel();
    const b = projektAlsDatei(klein({ planung: p }));
    expect([b[0], b[1], b[2], b[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(Object.keys(unzipSync(b))).toContain('planung/planung.json');
    const r = leseProjektdateiMitMeldungen(b);
    expect(r.meldungen).toEqual([]);
    expect(r.projekt.planung).toEqual(p);
    expect(Array.from(r.projekt.sav)).toEqual(Array.from(klein().sav));
  });
  it('ohne Planung bleibt es bei Fassung 1; leere Liste auch', () => {
    expect(projektAlsDatei(klein())[0]).toBe(0x7b);
    expect(projektAlsDatei(klein({ planung: [] }))[0]).toBe(0x7b);
    expect(leseProjektdatei(projektAlsDatei(klein())).planung).toBeUndefined();
  });
  it('kaputtes JSON wird gemeldet, das Projekt öffnet trotzdem', () => {
    const z = unzipSync(projektAlsDatei(klein({ planung: beispiel() })));
    const r = leseProjektdateiMitMeldungen(zipSync({ ...z, 'planung/planung.json': strToU8('{"nicht": [') }));
    expect(r.projekt.planung).toBeUndefined();
    expect(r.projekt.name).toBe('Klein');
    expect(r.meldungen.map(m => [m.art, m.name])).toEqual([['planungKaputt', 'planung/planung.json']]);
  });
  it('falsche Kennung, falscher Stand und fremde Liste werden gemeldet, nicht still übernommen', () => {
    const z = unzipSync(projektAlsDatei(klein({ planung: beispiel() })));
    const gut = JSON.parse(new TextDecoder().decode(z['planung/planung.json']!));
    const faelle: ((x: any) => void)[] = [
      x => { x[0].antworten[0].kennung = 'dmp-9-9'; },
      x => { x[0].antworten[0].kennung = 'pre-1-1'; },
      x => { x[0].antworten[0].stand = 'fertig'; },
      x => { x[0].antworten[0].text = 5; },
      x => { x[0].liste = 'alles'; },
      x => { x.push(JSON.parse(JSON.stringify(x[0]))); }
    ];
    for (const f of faelle) {
      const x = JSON.parse(JSON.stringify(gut)); f(x);
      const r = leseProjektdateiMitMeldungen(zipSync({ ...z, 'planung/planung.json': strToU8(JSON.stringify(x)) }));
      expect(r.projekt.planung).toBeUndefined();
      expect(r.meldungen).toHaveLength(1);
    }
  });
  it('Zusatzfelder werden ignoriert, leere Antworten fallen weg, zu langer Text wird gekürzt', () => {
    const l = lesePlanung([{ liste: 'dmp', zusatz: 1, antworten: [{ kennung: 'dmp-1-2', zusatz: 'x' }, { kennung: 'dmp-1-1', text: 'a'.repeat(30000), geaendert: 7 }] }]);
    expect(l).toHaveLength(1);
    expect(l[0]!.antworten).toHaveLength(1);
    expect(l[0]!.antworten[0]!.text!.length).toBe(20000);
    expect(Object.keys(l[0]!)).toEqual(['liste', 'antworten']);
    expect(lesePlanung([{ liste: 'dmp', antworten: [] }])).toEqual([]);
    expect(() => lesePlanung('x')).toThrow();
  });
  it('`planung/zukunft.json` bleibt ein unbekannter Eintrag', () => {
    const z = unzipSync(projektAlsDatei(klein({ planung: beispiel() })));
    const r = leseProjektdateiMitMeldungen(zipSync({ ...z, 'planung/zukunft.json': strToU8('{}') }));
    expect(r.projekt.planung).toEqual(beispiel());
    expect(r.meldungen.map(m => m.art)).toEqual(['unbekannterEintrag']);
  });
  it('Planung, Leitfaden und Fragebogen-Plan nebeneinander ändern einander nicht', () => {
    const p = beispiel();
    const r = leseProjektdatei(projektAlsDatei(klein({ planung: p, leitfaeden: [] })));
    expect(r.planung).toEqual(p);
    expect(r.leitfaeden).toBeUndefined();
  });
});
