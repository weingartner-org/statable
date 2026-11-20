import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

/* Fachblatt WELTKARTE, Abschnitt 6: Die Dateien unter app/public/karten/ (erzeugt von scripts/karten-holen.mjs) sind vollständig, unverändert und gültig. */
const wurzel = new URL('../../../', import.meta.url);
const ordner = new URL('app/public/karten/', wurzel);
const lies = (p: string) => readFileSync(new URL(p, ordner));
const index = JSON.parse(lies('index.json').toString('utf8')) as {
  format: string; quellen: { name: string; adresse: string; sha256: string }[];
  welt: Eintrag; laender: Record<string, Eintrag>;
};
interface Eintrag { iso3: string; quelle: string; lizenz: string; lizenzAdresse: string; klasse: string; stand: string; gebiete: number; bytes: number; gz: number; sha256: string; quelleSha256?: string }
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

/** Die Lizenzen, die als frei gelten oder (ShareAlike) mit Nennung und Lizenz verwendet werden dürfen. Alles andere ist nicht erlaubt. */
const FREI = ['gemeinfrei (Public Domain)', 'CC0 1.0', 'CC BY 2.5', 'CC BY 2.5 IN', 'CC BY 3.0', 'CC BY 3.0 IGO', 'CC BY 4.0', 'Open Government Licence - Canada 2.0', 'Datenlizenz Deutschland - Namensnennung 2.0', 'Licence Ouverte 2.0 (Etalab)'];
const GLEICH = ['ODbL 1.0', 'CC BY-SA 2.0', 'CC BY-SA 3.0'];

const UN_AFRIKA = ['DZA', 'AGO', 'BEN', 'BWA', 'BFA', 'BDI', 'CPV', 'CMR', 'CAF', 'TCD', 'COM', 'COG', 'COD', 'CIV', 'DJI', 'EGY', 'GNQ', 'ERI', 'SWZ', 'ETH', 'GAB', 'GMB', 'GHA', 'GIN', 'GNB', 'KEN', 'LSO', 'LBR', 'LBY', 'MDG', 'MWI', 'MLI', 'MRT', 'MUS', 'MAR', 'MOZ', 'NAM', 'NER', 'NGA', 'RWA', 'STP', 'SEN', 'SYC', 'SLE', 'SOM', 'ZAF', 'SSD', 'SDN', 'TZA', 'TGO', 'TUN', 'UGA', 'ZMB', 'ZWE'];

type Ring = number[][];
function pruefeGeo(text: string, was: string): { gebiete: number; ringe: number } {
  const j = JSON.parse(text);
  expect(j.type, was).toBe('FeatureCollection');
  expect(Array.isArray(j.features), was).toBe(true);
  let ringe = 0;
  for (const f of j.features) {
    expect(f.type, was).toBe('Feature');
    expect(['Polygon', 'MultiPolygon'], `${was}: Geometrie ${f.geometry?.type}`).toContain(f.geometry?.type);
    const polys: Ring[][] = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    expect(polys.length, was).toBeGreaterThan(0);
    for (const p of polys) for (const r of p) {
      ringe++;
      expect(r.length, `${was}: Ring zu kurz`).toBeGreaterThanOrEqual(4);
      const a = r[0]!, z = r[r.length - 1]!;
      if (a[0] !== z[0] || a[1] !== z[1]) throw new Error(`${was}: Ring nicht geschlossen`);
      for (const q of r) {
        if (!(Number.isFinite(q[0]) && Number.isFinite(q[1]) && Math.abs(q[0]!) <= 180 && Math.abs(q[1]!) <= 90)) throw new Error(`${was}: ungültige Koordinate ${q}`);
      }
    }
  }
  return { gebiete: j.features.length, ringe };
}

describe('welt.json', () => {
  const b = lies('welt.json'), j = JSON.parse(b.toString('utf8'));
  it('mindestens 240 Gebiete, jedes mit iso3, eindeutiger Kennung und englischem Namen', () => {
    expect(j.features.length).toBeGreaterThanOrEqual(240);
    const iso3 = j.features.map((f: { properties: { iso3: string } }) => f.properties.iso3);
    expect(new Set(iso3).size).toBe(iso3.length);
    for (const f of j.features) { expect(f.properties.iso3).toMatch(/^[A-Z]{3}$/); expect(f.properties.name.length).toBeGreaterThan(1); expect(f.properties.iso2).toMatch(/^([A-Z]{2})?$/); }
  });
  it('gültige Geometrie, Größe um 300 KB gz, Verzeichnis stimmt', () => {
    pruefeGeo(b.toString('utf8'), 'welt.json');
    expect(gzipSync(b, { level: 9 }).length).toBeLessThanOrEqual(320 * 1024);
    expect(index.welt.bytes).toBe(b.length); expect(index.welt.sha256).toBe(sha(b)); expect(index.welt.gebiete).toBe(j.features.length);
  });
  it('Afrika: alle 54 UN-Staaten haben einen Eintrag', () => {
    const iso3 = new Set(j.features.map((f: { properties: { iso3: string } }) => f.properties.iso3));
    expect(UN_AFRIKA.length).toBe(54);
    expect(UN_AFRIKA.filter(x => !iso3.has(x))).toEqual([]);
  });
  it('Kosovo hat den Code XKX; Gebiete mit gleichem Staatscode führen ihr eigenes Kürzel', () => {
    const iso3 = j.features.map((f: { properties: { iso3: string } }) => f.properties.iso3);
    expect(iso3).toContain('XKX'); expect(iso3).not.toContain('KOS'); expect(iso3).toContain('BRI');
  });
});

describe('land/<ISO3>.json', () => {
  const eintraege = Object.values(index.laender);
  it('das Verzeichnis kennt mehr als 190 Länder; jede Datei im Ordner steht im Verzeichnis und umgekehrt', () => {
    expect(eintraege.length).toBeGreaterThan(190);
    const dateien = readdirSync(new URL('land/', ordner)).sort();
    expect(dateien).toEqual(Object.keys(index.laender).map(k => k + '.json').sort());
    for (const [k, e] of Object.entries(index.laender)) expect(e.iso3).toBe(k);
  });
  it('jede Datei hat die Größe und Prüfsumme laut Verzeichnis, gültige Koordinaten, geschlossene Ringe und nur Polygon/MultiPolygon', () => {
    for (const e of eintraege) {
      const p = `land/${e.iso3}.json`, b = lies(p);
      expect(statSync(new URL(p, ordner)).size, p).toBe(e.bytes);
      expect(sha(b), p).toBe(e.sha256);
      const r = pruefeGeo(b.toString('utf8'), p);
      expect(r.gebiete, p).toBe(e.gebiete); expect(e.gebiete, p).toBeGreaterThan(1);
    }
  });
  it('jede Datei ist höchstens 150 KB groß (gz); alle zusammen mit welt.json höchstens 30 MB roh', () => {
    let roh = index.welt.bytes;
    for (const e of eintraege) { roh += e.bytes; expect(gzipSync(lies(`land/${e.iso3}.json`), { level: 9 }).length, e.iso3).toBeLessThanOrEqual(150 * 1024); }
    expect(roh).toBeLessThanOrEqual(30 * 1024 * 1024);
  });
  it('Eigenschaften: nur name und code; Code nie "-99" oder leer als Wert vorhanden', () => {
    for (const e of eintraege) {
      const j = JSON.parse(lies(`land/${e.iso3}.json`).toString('utf8'));
      for (const f of j.features) {
        expect(Object.keys(f.properties).sort(), e.iso3).toEqual(['code', 'name']);
        expect(['-99', 'nan', 'null'], e.iso3).not.toContain(f.properties.code);
        expect(f.properties.name.length, e.iso3).toBeGreaterThan(0);
      }
    }
  });
  it('Afrika (Zahlen aus dem Fachblatt): KEN 47, COD 26, GHA 16, NGA mindestens 36, SSD 10 Gebiete', () => {
    const n = (k: string) => index.laender[k]?.gebiete;
    expect(n('KEN')).toBe(47); expect(n('COD')).toBe(26); expect(n('GHA')).toBe(16); expect(n('NGA')).toBeGreaterThanOrEqual(36); expect(n('SSD')).toBe(10);
  });
});

describe('Quelle und Lizenz je Datei', () => {
  const alle = [index.welt, ...Object.values(index.laender)];
  it('jede Datei trägt Quelle, Lizenz aus der Liste, Adresse der Lizenz (https) und Stand; geoBoundaries nie unter einer unbekannten Lizenz', () => {
    for (const e of alle) {
      expect(['Natural Earth', 'geoBoundaries'], e.iso3).toContain(e.quelle);
      expect([...FREI, ...GLEICH], `${e.iso3}: Lizenz ${e.lizenz}`).toContain(e.lizenz);
      expect(e.lizenzAdresse, e.iso3).toMatch(/^https:\/\//); expect(e.stand.length, e.iso3).toBeGreaterThan(3);
      expect(e.klasse, e.iso3).toBe(GLEICH.includes(e.lizenz) ? 'sa' : 'frei');
      if (e.quelle === 'Natural Earth') expect(e.lizenz).toBe('gemeinfrei (Public Domain)');
    }
  });
  it('die Datei selbst nennt Quelle, Lizenz und Stand (bei ShareAlike also auch im Datenwerk)', () => {
    for (const e of alle) {
      const j = JSON.parse(lies(e === index.welt ? 'welt.json' : `land/${e.iso3}.json`).toString('utf8'));
      expect(j.statable?.quelle, e.iso3).toBe(e.quelle); expect(j.statable?.lizenz, e.iso3).toBe(e.lizenz); expect(j.statable?.lizenzAdresse, e.iso3).toBe(e.lizenzAdresse);
    }
  });
  it('das Verzeichnis nennt die Ausgangsdateien mit SHA-256', () => {
    expect(index.format).toBe('statable-karten');
    expect(index.quellen.length).toBeGreaterThanOrEqual(3);
    for (const q of index.quellen) { expect(q.sha256).toMatch(/^[0-9a-f]{64}$/); expect(q.adresse).toMatch(/^https:\/\//); }
  });
  it('keine Grenzen von GISCO und GADM unter app/public', () => {
    const rekursiv = (u: URL): string[] => readdirSync(u).flatMap(n => { if (n === 'webr') return []; const v = new URL(n + (statSync(new URL(n, u)).isDirectory() ? '/' : ''), u); return statSync(v).isDirectory() ? rekursiv(v) : [v.pathname]; });
    const dateien = rekursiv(new URL('app/public/', wurzel));
    expect(dateien.filter(f => /NUTS_RG|LAU_RG|gisco|gadm/i.test(f))).toEqual([]);
  });
  it('Herkunftssperre: Der ganze Kopf jeder Datei (statable) und jeder Eintrag des Verzeichnisses nennt weder EuroGeographics noch GISCO noch GADM, ohne Rücksicht auf Groß- und Kleinschreibung', () => {
    const gesperrt = /eurogeographics|gisco|gadm/i;
    const kopf = (p: string) => JSON.stringify(JSON.parse(lies(p).toString('utf8')).statable);
    expect(gesperrt.test(kopf('welt.json'))).toBe(false);
    for (const e of Object.values(index.laender)) {
      const k = kopf(`land/${e.iso3}.json`);
      expect(k, e.iso3).toContain('"quelle"');
      expect(gesperrt.test(k), `${e.iso3}: ${k}`).toBe(false);
      expect(gesperrt.test(JSON.stringify(e)), e.iso3).toBe(false);
    }
  });
  it('Griechenland und Nordmazedonien (Herkunft EuroGeographics) stehen auf Natural Earth', () => {
    for (const k of ['GRC', 'MKD']) expect(index.laender[k]?.quelle, k).toBe('Natural Earth');
  });
  it('das Skript sperrt die Herkunft ausdrücklich', () => {
    expect(readFileSync(new URL('scripts/karten-holen.mjs', wurzel), 'utf8')).toContain('/eurogeographics|gisco|gadm/i');
  });
  it('das Skript hat die Liste der freien Lizenzen ausdrücklich; Unbekanntes gilt als nicht frei', () => {
    const skript = readFileSync(new URL('scripts/karten-holen.mjs', wurzel), 'utf8');
    expect(skript).toContain("LIZENZEN.get(String(name).trim())?.klasse ?? 'unbekannt'");
    expect(skript).toContain('Alles, was hier nicht steht, gilt als nicht frei');
    expect(existsSync(new URL('scripts/karten-holen.mjs', wurzel))).toBe(true);
  });
});
