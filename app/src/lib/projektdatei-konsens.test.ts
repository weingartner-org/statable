/**
 * Paket 5E1: offene Konsens-Entscheidungen in der Projektdatei (Fassung 2, `qualitativ/konsens.json`) und der Vermerk `enthaeltZitate`.
 * Muster wie `projektdatei-qual.test.ts`: ohne Engine, nur die Form wird geprüft.
 */
import { describe, expect, it } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { Projekt } from './ablage';
import { leseProjektdatei, leseProjektdateiMitMeldungen, projektAlsDatei } from './projektdatei';
import { neuesQualProjekt } from './qualprojekt';
import { leseKonsensEntwurf, istEntschieden, zahlEntschieden, KonsensFehler, type KonsensEntwurf } from './konsens-zustand';

const qual = () => { const q = neuesQualProjekt('Interviews 😀'); q.kodierende = [{ id: 'p-a', name: 'A' }, { id: 'p-b', name: 'B' }]; return q; };
const klein = (extra: Partial<Projekt> = {}): Projekt => ({ name: 'Klein', quelle: 'x.csv', sav: Uint8Array.from({ length: 300 }, (_, i) => (i * 37) & 255), blaetter: [], entscheid: {}, zeit: 1760000000000, ...extra });
const entwurf = (): KonsensEntwurf => ({
  a: 'p-a', b: 'p-b', codes: ['c1', 'c2'], schwelle: 0.9, position: 2, name: 'Einigung',
  entscheidungen: [
    { abweichung: 'd1:0:10', wahl: 'a', begruendung: 'Passt zur Definition 😀' },
    { abweichung: 'd1:20:30', wahl: 'keiner', begruendung: '', regel: { code: 'c1', text: 'Nur ganze Sätze' } },
  ],
});

describe('Konsens in der Projektdatei', () => {
  it('Hin- und Rückweg: Entwurf und qualitatives Projekt, Eintrag im Inhaltsverzeichnis', () => {
    const e = entwurf();
    const b = projektAlsDatei(klein({ qual: qual(), konsens: e }));
    const z = unzipSync(b);
    expect(Object.keys(z)).toContain('qualitativ/konsens.json');
    expect(JSON.parse(strFromU8(z['statable.json']!)).inhalt).toContain('qualitativ/konsens.json');
    const r = leseProjektdateiMitMeldungen(b);
    expect(r.meldungen).toEqual([]);
    expect(r.projekt.konsens).toEqual(e);
    expect(r.projekt.qual?.kodierende).toHaveLength(2);
  });
  it('ohne Entwurf kein Eintrag; Entwurf ohne qualitatives Projekt wird nicht geschrieben', () => {
    expect(Object.keys(unzipSync(projektAlsDatei(klein({ qual: qual() }))))).not.toContain('qualitativ/konsens.json');
    expect(projektAlsDatei(klein({ konsens: entwurf() }))[0]).toBe(0x7b);   // Fassung 1, kein ZIP
    expect(leseProjektdatei(projektAlsDatei(klein({ konsens: entwurf() }))).konsens).toBeUndefined();
  });
  it('kaputtes JSON wird gemeldet, das Projekt öffnet trotzdem', () => {
    const z = unzipSync(projektAlsDatei(klein({ qual: qual(), konsens: entwurf() })));
    const r = leseProjektdateiMitMeldungen(zipSync({ ...z, 'qualitativ/konsens.json': strToU8('{"nicht": [') }));
    expect(r.projekt.konsens).toBeUndefined();
    expect(r.projekt.qual).toBeDefined();
    expect(r.meldungen.map(m => [m.art, m.name])).toEqual([['konsensKaputt', 'qualitativ/konsens.json']]);
  });
  for (const [was, aendere] of [
    ['falsche Wahl', (o: Record<string, any>) => { o.entscheidungen[0].wahl = 'alle'; }],
    ['Schwelle über 1', (o: Record<string, any>) => { o.schwelle = 1.5; }],
    ['Schwelle unter 0,5', (o: Record<string, any>) => { o.schwelle = 0.2; }],
    ['Position negativ', (o: Record<string, any>) => { o.position = -1; }],
    ['Begründung keine Zahl erlaubt', (o: Record<string, any>) => { o.entscheidungen[0].begruendung = 5; }],
    ['Regel ohne Text', (o: Record<string, any>) => { o.entscheidungen[1].regel = { code: 'c1' }; }],
    ['doppelte Abweichung', (o: Record<string, any>) => { o.entscheidungen[1].abweichung = o.entscheidungen[0].abweichung; }],
    ['Codes keine Liste', (o: Record<string, any>) => { o.codes = 'c1'; }],
    ['unbekannte Fassung', (o: Record<string, any>) => { o.version = 2; }],
    ['unbekannte Person', (o: Record<string, any>) => { o.a = 'p-x'; }],
  ] as const) {
    it(`Feld geprüft, wird gemeldet statt still übernommen: ${was}`, () => {
      const z = unzipSync(projektAlsDatei(klein({ qual: qual(), konsens: entwurf() })));
      const o = JSON.parse(strFromU8(z['qualitativ/konsens.json']!));
      aendere(o);
      const r = leseProjektdateiMitMeldungen(zipSync({ ...z, 'qualitativ/konsens.json': strToU8(JSON.stringify(o)) }));
      expect(r.projekt.konsens).toBeUndefined();
      expect(r.meldungen.map(m => m.art)).toEqual(['konsensKaputt']);
    });
  }
  it('unbekannte Zusatzfelder fallen weg', () => {
    const o = { version: 1, ...entwurf(), boese: '__proto__' };
    expect(leseKonsensEntwurf(o)).toEqual(entwurf());
    expect(() => leseKonsensEntwurf(null)).toThrow(KonsensFehler);
  });
  it('„entschieden“ heißt Wahl und Begründung mit mindestens einem Wort', () => {
    const e = entwurf();
    expect(istEntschieden(e.entscheidungen[0])).toBe(true);
    expect(istEntschieden(e.entscheidungen[1])).toBe(false);
    expect(istEntschieden({ ...e.entscheidungen[0]!, begruendung: '   ' })).toBe(false);
    expect(zahlEntschieden(e)).toBe(1);
  });
});

describe('Vermerk „enthält Zitate“', () => {
  it('bleibt in Fassung 1 und Fassung 2 erhalten, fehlt sonst', () => {
    expect(leseProjektdatei(projektAlsDatei(klein({ enthaeltZitate: true }))).enthaeltZitate).toBe(true);
    expect(leseProjektdatei(projektAlsDatei(klein({ qual: qual(), enthaeltZitate: true }))).enthaeltZitate).toBe(true);
    expect(leseProjektdatei(projektAlsDatei(klein())).enthaeltZitate).toBeUndefined();
    expect(leseProjektdatei(projektAlsDatei(klein({ enthaeltZitate: false }))).enthaeltZitate).toBeUndefined();
  });
});
