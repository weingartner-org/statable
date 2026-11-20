import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { s } from './sitzung.svelte';
import { atIndexLesen, atLaden, atGrenzenText, atKennzahlSaetze, atStandSatz, type AtIndex } from './atgrenzen';
import { geoLesen, karteZuordnen, eigenschaftVorschlag, karteModell, projiziere } from './karte';
import { karteStandLesen } from './zusatz';

/* Bezirke und Gemeinden Österreichs (BEV, CC BY 4.0): Dateien unter public/karten/at, erzeugt von scripts/at-grenzen-holen.mjs. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const ordner = new URL('../../public/karten/at/', import.meta.url);
const lies = (n: string) => readFileSync(new URL(n, ordner));
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const indexRoh = JSON.parse(lies('index.json').toString('utf8'));
const index = atIndexLesen(indexRoh) as AtIndex;
const gebiete = (n: string) => { const r = geoLesen(lies(n).toString('utf8')); if (!r.ok) throw new Error(r.fehler); return r.daten; };

describe('Dateien unter karten/at', () => {
  it('genau drei Dateien; Größe und Prüfsumme wie im Verzeichnis; gepackt: Bezirke unter 300 KB, Gemeinden unter 1,5 MB', () => {
    expect(readdirSync(ordner).sort()).toEqual(['bezirke.json', 'gemeinden.json', 'index.json']);
    for (const st of ['bezirke', 'gemeinden'] as const) {
      const b = lies(`${st}.json`), e = index[st];
      expect(statSync(new URL(`${st}.json`, ordner)).size).toBe(e.bytes); expect(sha(b)).toBe(e.sha256);
      // Die gepackte Größe hängt von der zlib-Fassung in Node ab (am Windows-PC 21 Bytes anders als am Mac, 13.11.2026) - darum nur auf 2 % genau.
      expect(Math.abs(gzipSync(b, { level: 9 }).length - e.gz)).toBeLessThan(e.gz * 0.02);
    }
    expect(index.bezirke.gz).toBeLessThan(300 * 1024); expect(index.gemeinden.gz).toBeLessThan(1.5 * 1024 * 1024);
  });
  it('Herkunft und Lizenz: BEV, Stichtag, CC BY 4.0, Adresse und SHA-256 der Quelle, Namensnennung, Bearbeitung', () => {
    expect(index.quelle.adresse).toBe('https://data.bev.gv.at/download/Verwaltungsgrenzen/shp/20260401/VGD_Oesterreich_gst_20260402.zip');
    expect(index.quelle.sha256).toMatch(/^[0-9a-f]{64}$/); expect(index.quelle.stichtag).toBe('2026-04-01'); expect(index.quelle.abgerufen).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(index.lizenz).toBe('Creative Commons Namensnennung 4.0 International (CC BY 4.0)'); expect(index.lizenzAdresse).toBe('https://creativecommons.org/licenses/by/4.0/deed.de');
    expect(index.namensnennung).toBe('Datenquelle: Bundesamt für Eich- und Vermessungswesen (BEV) - Verwaltungsgrenzen, Stichtag 01.04.2026');
    expect(index.bearbeitung).toContain('vereinfacht');
  });
  it('94 Bezirke (79 politische Bezirke und 15 Statutarstädte) und 2.092 Gemeinden, wie bei Statistik Austria (2026)', () => {
    expect(gebiete('bezirke.json').gebiete).toHaveLength(94); expect(gebiete('gemeinden.json').gebiete).toHaveLength(2092);
    expect(index.bezirke.gebiete).toBe(94); expect(index.gemeinden.gebiete).toBe(2092);
    const b = gebiete('bezirke.json').gebiete;
    const stadt = ['101', '102', '201', '202', '301', '302', '303', '304', '401', '402', '403', '501', '601', '701', '900'];   // die Statutarstädte, einschließlich Wien
    expect(stadt.every(k => b.some(g => g.eig.get('BKZ') === k))).toBe(true);
    expect(b.map(g => g.eig.get('BKZ')).filter(k => k!.endsWith('00') || stadt.includes(k!))).toHaveLength(15);
  });
  it('Kennzahlen sind eindeutig, fünf- und dreistellig; die ersten drei Stellen der Gemeinde sind der Bezirk; jede Gemeinde gehört zu einem Bezirk der Karte', () => {
    const g = gebiete('gemeinden.json').gebiete, b = gebiete('bezirke.json').gebiete;
    const gk = g.map(x => x.eig.get('GKZ')!), bk = b.map(x => x.eig.get('BKZ')!);
    expect(new Set(gk).size).toBe(gk.length); expect(new Set(bk).size).toBe(bk.length);
    for (const x of g) { expect(x.eig.get('GKZ')).toMatch(/^[1-9]\d{4}$/); expect(x.eig.get('GKZ')!.slice(0, 3)).toBe(x.eig.get('BKZ')); expect(x.eig.get('GKZ_G')).toBe('G' + x.eig.get('GKZ')); expect(bk).toContain(x.eig.get('BKZ')); }
    for (const x of b) { expect(x.eig.get('BKZ')).toMatch(/^[1-9]\d{2}$/); expect(x.eig.get('BKZ_B')).toBe('B' + x.eig.get('BKZ')); }
    expect(new Set(g.map(x => x.eig.get('BKZ'))).size).toBe(94);   // kein Bezirk ohne Gemeinde
  });
  it('Beispiele: Eisenstadt 10101, Graz 60101, Wien 90001 (eine Gemeinde, kein Wiener Gemeindebezirk 90101)', () => {
    const g = gebiete('gemeinden.json').gebiete, nach = (k: string) => g.find(x => x.eig.get('GKZ') === k)?.eig;
    expect(nach('10101')?.get('NAME')).toBe('Eisenstadt'); expect(nach('60101')?.get('NAME')).toBe('Graz'); expect(nach('90001')?.get('NAME')).toBe('Wien');
    expect(nach('90101')).toBeUndefined();
  });
  it('gültige Geometrie: Länge 9 bis 18, Breite 46 bis 49,1; nur Polygon und MultiPolygon; kein GeoJSON-Dateiname', () => {
    for (const n of ['bezirke.json', 'gemeinden.json']) {
      const r = geoLesen(lies(n).toString('utf8')); expect(r.ok).toBe(true); if (!r.ok) continue;
      expect(r.daten.ohneFlaeche).toBe(0);
      for (const x of r.daten.gebiete) for (const f of x.flaechen) for (const ring of f) for (let i = 0; i < ring.length; i += 2) { expect(ring[i]).toBeGreaterThan(9.4); expect(ring[i]).toBeLessThan(17.3); expect(ring[i + 1]).toBeGreaterThan(46.3); expect(ring[i + 1]).toBeLessThan(49.1); }
    }
    expect(readdirSync(ordner).filter(n => /geojson|topojson/i.test(n))).toEqual([]);
  });
});

describe('Zuordnung mit der vorhandenen Logik der Karte', () => {
  const g = gebiete('gemeinden.json').gebiete;
  it('Zahlenspalte 10101 passt zu GKZ, „G10101“ zu GKZ_G; der Vorschlag wählt die Eigenschaft, die trifft', () => {
    const codes = [10101, 60101, 90001, 90101, null];
    expect(eigenschaftVorschlag(g, ['GKZ', 'GKZ_G', 'NAME', 'BKZ', 'BEZIRK'], codes)).toBe('GKZ');
    expect(eigenschaftVorschlag(g, ['GKZ', 'GKZ_G', 'NAME'], ['G10101', 'G60101'])).toBe('GKZ_G');
    const z = karteZuordnen(g, 'GKZ', codes, [1, 2, 3, 4, 5], 'NAME');
    expect(z.zugeordnet).toBe(3); expect(z.zeilenOhneCode).toBe(1);
    expect(z.codesOhneGebiet).toBe(1); expect(z.codesBeispiele).toEqual(['90101']);    // Wiener Gemeindebezirk: nicht zugeordnet und gezählt
    expect(z.gebieteOhneDaten).toBe(2092 - 3);
    expect(z.werte[g.findIndex(x => x.eig.get('GKZ') === '60101')]).toBe(2);
  });
  it('Bezirke: 101 und B101 und doppelte Codes', () => {
    const b = gebiete('bezirke.json').gebiete;
    expect(karteZuordnen(b, 'BKZ', [101, 900, 999], [1, 2, 3]).zugeordnet).toBe(2);
    expect(karteZuordnen(b, 'BKZ_B', ['B101', 'B101'], [1, 2])).toMatchObject({ zugeordnet: 0, codesMehrfach: 1 });
    expect(karteZuordnen(b, 'BKZ', ['101', '101 ', '0101'], [1, 2, 3])).toMatchObject({ codesMehrfach: 1, codesOhneGebiet: 1 });   // keine Näherungssuche: 0101 ist ein anderer Code
  });
  it('das Bild trägt Quelle, Stichtag und Lizenz im Fuß', () => {
    const b = gebiete('bezirke.json');
    const zuo = karteZuordnen(b.gebiete, 'BKZ', [101], [5], 'NAME');
    const rahmen = projiziere(b.gebiete, 560, 520, 8);
    const m = karteModell({ gebiete: b.gebiete, rahmen, zuordnung: zuo, klassen: null, wertName: 'Rate', gebietName: 'BKZ', beschriftung: 'NAME', quelle: { art: 'at', name: 'Bezirke', stufe: 'bezirke' }, grenzenText: atGrenzenText(index, 'bezirke') });
    expect(m.fuss.join(' ')).toContain('Bundesamt für Eich- und Vermessungswesen'); expect(m.fuss.join(' ')).toContain('01.04.2026'); expect(m.fuss.join(' ')).toContain('CC BY 4.0'); expect(m.fuss.join(' ')).toContain('Vereinfacht');
    expect(m.gebiete).toHaveLength(94);
  });
  it('Hinweise zur Kennzahl nennen die Form (Zahl, G-, B-Vorsatz), die Wiener Bezirke und den Stichtag', () => {
    const gem = atKennzahlSaetze('gemeinden', index).join(' '), bez = atKennzahlSaetze('bezirke', index).join(' ');
    expect(gem).toContain('fünfstellige'); expect(gem).toContain('G10101'); expect(gem).toContain('2092'); expect(gem).toContain('90101');
    expect(bez).toContain('dreistellige'); expect(bez).toContain('B101'); expect(bez).toContain('94');
    expect(atStandSatz()).toContain('Stichtag');
  });
});

describe('Laden bei Bedarf und fremde Eingabe', () => {
  const antwort = (daten: Buffer | string) => async (url: string | URL | Request) => ({ ok: true, headers: new Headers(), arrayBuffer: async () => { const b = Buffer.from(daten); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); }, url: String(url) }) as unknown as Response;
  const server = (ersetze: Record<string, Buffer | string> = {}) => async (url: string | URL | Request) => {
    const pfad = new URL(String(url)).pathname.replace(/^.*\/karten\//, 'karten/');
    const name = pfad.replace('karten/at/', '');
    return antwort(ersetze[name] ?? lies(name))(url);
  };
  it('Bezirke laden: geprüft gegen Größe und SHA-256, 94 Gebiete; ohne Netz ein Satz statt Absturz', async () => {
    const r = await atLaden('bezirke', { fetchFn: server() as typeof fetch, basis: 'http://localhost/' });
    expect(r.ok).toBe(true); if (r.ok) { expect(r.wert.daten.gebiete).toHaveLength(94); expect(r.wert.stufe).toBe('bezirke'); }
    const aus = await atLaden('gemeinden', { fetchFn: (async () => { throw new Error('kein Netz'); }) as typeof fetch, basis: 'http://localhost/' });
    expect(aus).toEqual({ ok: false, fehler: 'karten-laden' });
  });
  it('veränderte Datei (andere Prüfsumme) und kaputtes Verzeichnis werden abgelehnt', async () => {
    const kaputt = Buffer.from(lies('bezirke.json')); kaputt[10] = kaputt[10] === 65 ? 66 : 65;
    expect(await atLaden('bezirke', { fetchFn: server({ 'bezirke.json': kaputt }) as typeof fetch, basis: 'http://localhost/' })).toEqual({ ok: false, fehler: 'karten-pruefsumme' });
    expect(await atLaden('bezirke', { fetchFn: server({ 'index.json': '{"x":1}' }) as typeof fetch, basis: 'http://localhost/' })).toEqual({ ok: false, fehler: 'karten-form' });
    expect(await atLaden('x' as never, { fetchFn: server() as typeof fetch })).toEqual({ ok: false, fehler: 'karten-laden' });
  });
  it('atIndexLesen: fremdes Format, falscher Dateiname, fehlende Prüfsumme', () => {
    expect(atIndexLesen(null)).toBeNull(); expect(atIndexLesen({ ...indexRoh, format: 'x' })).toBeNull();
    expect(atIndexLesen({ ...indexRoh, bezirke: { ...indexRoh.bezirke, datei: 'karten/at/../x.json' } })).toBeNull();
    expect(atIndexLesen({ ...indexRoh, gemeinden: { ...indexRoh.gemeinden, sha256: 'abc' } })).toBeNull();
    expect(atIndexLesen({ ...indexRoh, lizenzAdresse: 'javascript:alert(1)' })).toBeNull();
  });
  it('am Projekt wird nur Art und Stufe gespeichert, nie die Umrisse; ohne gültige Stufe geht die Karte nicht wieder auf', () => {
    const basis = { gebietSpalte: 'a', wertSpalte: 'b', eigenschaft: 'BKZ', beschriftung: 'NAME', klassenArt: 'quantil', klassen: 5 };
    const r = karteStandLesen({ ...basis, quelle: { art: 'at', name: 'Bezirke Österreichs', stufe: 'bezirke' }, geo: '{"type":"FeatureCollection","features":[]}' });
    expect(r?.quelle).toEqual({ art: 'at', name: 'Bezirke Österreichs', stufe: 'bezirke' }); expect(r?.geo).toBeNull();
    expect(karteStandLesen({ ...basis, quelle: { art: 'at', name: 'x', stufe: '../x' } })).toBeUndefined();
    expect(karteStandLesen({ ...basis, quelle: { art: 'at', name: 'x' } })).toBeUndefined();
  });
  it('das Skript nennt Quelle, Lizenz und die feste Adresse; kein Netz im Test', () => {
    const skript = readFileSync(new URL('../../../scripts/at-grenzen-holen.mjs', import.meta.url), 'utf8');
    expect(skript).toContain('CC BY 4.0'); expect(skript).toContain('https://data.bev.gv.at/download/Verwaltungsgrenzen/shp/20260401/'); expect(skript).toContain('towgs84');
  });
});
