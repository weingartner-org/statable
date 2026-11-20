/**
 * Paket 4C: das qualitative Projekt in der Projektdatei (Fassung 2, `qualitativ/projekt.json` und `qualitativ/quellen/<id>.txt`).
 */
import { describe, expect, it } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { Projekt } from './ablage';
import { leseProjektdatei, leseProjektdateiMitMeldungen, projektAlsDatei } from './projektdatei';
import { neuesQualProjekt, type QualProjekt } from './qualprojekt';

const klein = (extra: Partial<Projekt> = {}): Projekt => ({ name: 'Klein', quelle: 'x.csv', sav: Uint8Array.from({ length: 300 }, (_, i) => (i * 37) & 255), blaetter: [], entscheid: {}, zeit: 1760000000000, ...extra });
const TEXT = 'Interviewerin: Wie geht es Ihnen? 😀\r\n\r\nPerson 1: Gut, danke.\r\nÄhm, ja.';
const qual = (): QualProjekt => {
  const q = neuesQualProjekt('Interviews');
  q.faelle = [{ id: 'f1', name: 'Interview 1', werte: {} }];
  q.dokumente = [{
    id: 'd1', name: 'Interview 1', art: 'text', text: TEXT, fall: 'f1', datei: { name: 'i1.txt', sha256: 'ab' },
    transkript: { sprecher: [{ id: 's1', name: 'Person 1', rolle: 'befragt' }], abschnitte: [{ start: 0, ende: 3, sprecher: 's1', zeitMs: 1000 }], quelle: 'text' },
    erstellt: 1, geaendert: 2,
  }];
  q.codes = [{ id: 'c1', name: 'Zeit', kodierbar: true, reihenfolge: 0, definition: 'Def' }];
  return q;
};

describe('QualProjekt in der Projektdatei', () => {
  it('Hin- und Rückweg: Text mit Emoji und CRLF bleibt Zeichen für Zeichen gleich; ein Projekt nur mit qual braucht Fassung 2', () => {
    const q = qual();
    const b = projektAlsDatei(klein({ qual: q }));
    expect([b[0], b[1], b[2], b[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const z = unzipSync(b);
    expect(Object.keys(z)).toContain('qualitativ/projekt.json');
    expect(Object.keys(z)).toContain('qualitativ/quellen/d1.txt');
    expect(strFromU8(z['qualitativ/quellen/d1.txt']!)).toBe(TEXT);
    expect(strFromU8(z['qualitativ/projekt.json']!)).not.toContain('Gut, danke');
    const r = leseProjektdateiMitMeldungen(b);
    expect(r.meldungen).toEqual([]);
    expect(r.projekt.qual).toEqual(q);
    expect(r.projekt.qual!.dokumente[0]!.text).toBe(TEXT);
  });
  it('Quelle ist UTF-8 ohne Marke', () => {
    const z = unzipSync(projektAlsDatei(klein({ qual: qual() })));
    const q = z['qualitativ/quellen/d1.txt']!;
    expect(q[0]).toBe('I'.charCodeAt(0));
  });
  it('ohne qual bleibt es bei Fassung 1', () => {
    expect(projektAlsDatei(klein())[0]).toBe(0x7b);
    expect(leseProjektdatei(projektAlsDatei(klein())).qual).toBeUndefined();
  });
  it('fehlende Quelle: Meldung, Dokument leer, Projekt öffnet', () => {
    const z = unzipSync(projektAlsDatei(klein({ qual: qual() })));
    delete z['qualitativ/quellen/d1.txt'];
    const r = leseProjektdateiMitMeldungen(zipSync(z));
    expect(r.meldungen.map(m => m.art)).toEqual(['qualQuelleFehlt']);
    expect(r.projekt.qual!.dokumente[0]!.text).toBe('');
    expect(r.projekt.name).toBe('Klein');
  });
  it('kaputtes JSON: Meldung statt Absturz', () => {
    const z = unzipSync(projektAlsDatei(klein({ qual: qual() })));
    const r = leseProjektdateiMitMeldungen(zipSync({ ...z, 'qualitativ/projekt.json': strToU8('{"nicht": [') }));
    expect(r.projekt.qual).toBeUndefined();
    expect(r.meldungen.map(m => [m.art, m.name])).toEqual([['qualKaputt', 'qualitativ/projekt.json']]);
  });
  it('falsche Form des Modells: Meldung', () => {
    const z = unzipSync(projektAlsDatei(klein({ qual: qual() })));
    const r = leseProjektdateiMitMeldungen(zipSync({ ...z, 'qualitativ/projekt.json': strToU8('{"format":"x"}') }));
    expect(r.projekt.qual).toBeUndefined();
    expect(r.meldungen[0]!.art).toBe('qualKaputt');
  });
  it('unbekannte Namen und Pfad-Tricks werden gemeldet und nicht gelesen', () => {
    const z = unzipSync(projektAlsDatei(klein({ qual: qual() })));
    const r = leseProjektdateiMitMeldungen(zipSync({ ...z, 'qualitativ/zukunft.json': strToU8('{}'), 'qualitativ/quellen/../x.txt': strToU8('x'), 'qualitativ/quellen/a/b.txt': strToU8('x') }));
    const unbekannt = r.meldungen.filter(m => m.art === 'unbekannterEintrag').map(m => m.name).sort();
    expect(unbekannt).toEqual(['qualitativ/quellen/../x.txt', 'qualitativ/quellen/a/b.txt', 'qualitativ/zukunft.json']);
    expect(r.projekt.qual!.dokumente[0]!.text).toBe(TEXT);
  });
});
