import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { s } from './sitzung.svelte';
import {
  geoLesen, geoLandFiltern, giscoAdresse, giscoAdresseOk, giscoAbrufen, giscoLaden, karteZuordnen, eigenschaftVorschlag, klassenBilden, klasseVon, klassenFarbe, projiziere, karteModell, karteTabelle, karteCsv,
  karteVermerk, karteWarnungen, zuordnungSaetze, geoFehlerSatz, giscoBedingungSatz, giscoDatenschutzSatz, klassenSatz, keinWertText, zahlText,
  KARTE_MAX_BYTES, KARTE_MAX_OBJEKTE, GISCO_MAX_BYTES, type GeoDaten, type Gebiet
} from './karte';

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const wurzel = new URL('../../../', import.meta.url);
const quadrat = (x0: number, y0: number, g = 1) => [[[x0, y0], [x0 + g, y0], [x0 + g, y0 + g], [x0, y0 + g], [x0, y0]]];
const feature = (props: unknown, geometry: unknown) => ({ type: 'Feature', properties: props, geometry });
const sammlung = (...f: unknown[]) => ({ type: 'FeatureCollection', features: f });
const poly = (x0: number, y0: number, g = 1) => ({ type: 'Polygon', coordinates: quadrat(x0, y0, g) });
const gut = (): GeoDaten => { const r = geoLesen(sammlung(feature({ NUTS_ID: 'AT11', NAME_LATN: 'Burgenland' }, poly(16, 47)), feature({ NUTS_ID: 'AT12', NAME_LATN: 'Niederösterreich' }, poly(15, 48)), feature({ NUTS_ID: 'AT13', NAME_LATN: 'Wien' }, { type: 'MultiPolygon', coordinates: [quadrat(16, 48), quadrat(17, 48)] }))); if (!r.ok) throw new Error(r.fehler); return r.daten; };

describe('Lizenz: keine Grenzen im Paket', () => {
  const alle = (dir: URL, tiefe = 0): string[] => {
    if (tiefe > 12) return [];
    return readdirSync(dir).flatMap(n => {
      if (['node_modules', '.git', 'dist', 'webr'].includes(n)) return [];
      const u = new URL(n + (statSync(new URL(n, dir)).isDirectory() ? '/' : ''), dir);
      return statSync(u).isDirectory() ? alle(u, tiefe + 1) : [u.pathname];
    });
  };
  it('unter app/public gibt es keine Datei mit NUTS_RG oder LAU_RG im Namen und keine GeoJSON-Datei', () => {
    const dateien = alle(new URL('app/public/', wurzel));
    expect(dateien.filter(f => /NUTS_RG|LAU_RG|\.geojson$|\.topojson$/i.test(f))).toEqual([]);
    expect(dateien.length).toBeGreaterThan(10);   // der Test sucht wirklich in einem gefüllten Ordner
  });
  it('im ganzen Quelltext (ohne node_modules und .git) liegt keine GeoJSON-Datei und keine Datei mit NUTS_RG oder LAU_RG im Namen', () => {
    const dateien = [...alle(new URL('app/src/', wurzel)), ...alle(new URL('scripts/', wurzel)), ...alle(new URL('docs/', wurzel)), ...alle(new URL('data/', wurzel))];
    expect(dateien.filter(f => /NUTS_RG|LAU_RG|\.geojson$|\.topojson$/i.test(f))).toEqual([]);
  });
  it('die Quelltexte enthalten die feste Adresse nur als Muster, keine eingebettete Grenzdatei: keine Datei von app/src enthält mehr als 3 Koordinatenpaare in Folge mit NUTS_ID', () => {
    for (const f of ['app/src/lib/karte.ts', 'app/src/seiten/Karte.svelte']) {
      let t = ''; try { t = readFileSync(new URL(f, wurzel), 'utf8'); } catch { continue; }
      expect(t, f).not.toMatch(/"coordinates"\s*:\s*\[\[\[\[?\s*-?\d/);
    }
  });
  it('die feste Adresse: nur Ebene 0 bis 3 auf gisco-services.ec.europa.eu', () => {
    expect(giscoAdresse(3)).toBe('https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_60M_2024_4326_LEVL_3.geojson');
    for (const e of [-1, 4, 1.5, NaN]) expect(giscoAdresse(e)).toBeNull();
    for (let e = 0; e <= 3; e++) expect(giscoAdresseOk(giscoAdresse(e)!)).toBe(true);
    for (const a of ['http://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_60M_2024_4326_LEVL_3.geojson', 'https://gisco-services.ec.europa.eu.evil.org/distribution/v2/nuts/geojson/NUTS_RG_60M_2024_4326_LEVL_3.geojson',
      'https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_60M_2024_4326_LEVL_3.geojson?x=1', 'https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_60M_2024_4326_LEVL_4.geojson', 'https://ec.europa.eu/']) expect(giscoAdresseOk(a), a).toBe(false);
  });
});

describe('Pflichtvermerk', () => {
  const e = (quelle: 'gisco' | 'datei') => {
    const g = gut();
    return karteModell({ gebiete: g.gebiete, rahmen: projiziere(g.gebiete), zuordnung: karteZuordnen(g.gebiete, 'NUTS_ID', ['AT11'], [1]), klassen: klassenBilden([1], 'gleich', 3), wertName: 'x', gebietName: 'NUTS_ID', beschriftung: 'NAME_LATN', quelle: { art: quelle, name: 'meine.geojson', ebene: 2 } });
  };
  it('Bild und Export tragen bei Grenzen von Eurostat immer den Vermerk, auf Deutsch und Englisch im Wortlaut der Quelle', () => {
    expect(e('gisco').vermerk).toBe('© EuroGeographics bezüglich der Verwaltungsgrenzen');
    s.einst.sprache = 'en';
    try { expect(karteVermerk()).toBe('© EuroGeographics for the administrative boundaries'); expect(e('gisco').vermerk).toBe('© EuroGeographics for the administrative boundaries'); } finally { s.einst.sprache = 'de'; }
  });
  it('eine eigene Datei bekommt keinen Vermerk, den es nicht belegen kann, aber den Hinweis auf Quelle und Rechte', () => {
    expect(e('datei').vermerk).toBeNull();
    expect(e('datei').fuss.join(' ')).toContain('Quelle und Nutzungsrechte der Grenzen');
  });
  it('Bedingungen in Klartext: nicht-kommerziell, Quelle nennen, Datenschutz sagt, was an wen geht', () => {
    const b = giscoBedingungSatz();
    expect(b).toContain('nicht-kommerziell'); expect(b).toContain('Quelle muss genannt werden'); expect(b).toContain('nicht übertragbar'); expect(b).toContain('nur auf deinen Klick');
    expect(giscoDatenschutzSatz()).toContain('IP-Adresse'); expect(giscoDatenschutzSatz()).toContain('Daten aus Statable werden nicht gesendet');
  });
});

describe('GeoJSON lesen (fremde Eingabe)', () => {
  it('Polygon und MultiPolygon, Eigenschaften als Text', () => {
    const g = gut();
    expect(g.gebiete).toHaveLength(3); expect(g.gebiete[2]!.flaechen).toHaveLength(2);
    expect(g.eigenschaften.sort()).toEqual(['NAME_LATN', 'NUTS_ID']);
    expect(g.gebiete[0]!.eig.get('NUTS_ID')).toBe('AT11');
  });
  it('kaputtes GeoJSON: Text, Typen, Koordinaten, zu kleine Ringe', () => {
    const f = (x: unknown) => { const r = geoLesen(x); return r.ok ? 'ok' : r.fehler; };
    expect(f('{')).toBe('unlesbar'); expect(f('[]')).toBe('form'); expect(f('null')).toBe('form'); expect(f({ type: 'Topology' })).toBe('typ');
    expect(f(sammlung())).toBe('leer'); expect(f({ type: 'FeatureCollection' })).toBe('form'); expect(f(sammlung(5))).toBe('form');
    expect(f(sammlung(feature({}, { type: 'Point', coordinates: [1, 1] })))).toBe('typ');
    expect(f(sammlung(feature({}, { type: 'Polygon', coordinates: 'x' })))).toBe('form');
    expect(f(sammlung(feature({}, { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 0]]] })))).toBe('koordinaten');
    expect(f(sammlung(feature({}, { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, NaN], [0, 0]]] })))).toBe('koordinaten');
    expect(f(sammlung(feature({}, { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, Infinity], [0, 0]]] })))).toBe('koordinaten');
    expect(f(sammlung(feature({}, { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, '1'], [0, 0]]] })))).toBe('koordinaten');
    expect(f(sammlung(feature({}, { type: 'Polygon', coordinates: [[[0, 0], [181, 0], [1, 1], [0, 0]]] })))).toBe('koordinaten');
    expect(f(sammlung(feature({}, { type: 'Polygon', coordinates: [[[0, 0], [1, 91], [1, 1], [0, 0]]] })))).toBe('koordinaten');
    expect(f(sammlung(feature('kein Objekt', poly(0, 0))))).toBe('form');
    expect(f(sammlung(feature({}, { type: 'Polygon', coordinates: [] })))).toBe('form');
  });
  it('Objekte ohne Fläche (Punkt, Linie, keine Geometrie) werden gezählt und nicht gezeichnet', () => {
    const r = geoLesen(sammlung(feature({ a: 1 }, poly(0, 0)), feature({ a: 2 }, { type: 'Point', coordinates: [1, 1] }), feature({ a: 3 }, null)));
    expect(r.ok && r.daten.gebiete.length).toBe(1); expect(r.ok && r.daten.ohneFlaeche).toBe(2);
  });
  it('riesige Datei: über 20 MB Text und über 20.000 Objekte werden abgelehnt, bevor etwas gerechnet wird', () => {
    expect(geoLesen(' '.repeat(KARTE_MAX_BYTES + 1))).toEqual({ ok: false, fehler: 'zu-gross' });
    const viele = Array.from({ length: KARTE_MAX_OBJEKTE + 1 }, () => feature({}, poly(0, 0)));
    expect(geoLesen(sammlung(...viele))).toEqual({ ok: false, fehler: 'zu-viele' });
    const ring = Array.from({ length: 400_000 }, (_, i) => [i / 1e4, 0]); ring.push(ring[0]!);
    expect(geoLesen(sammlung(...Array.from({ length: 9 }, () => feature({}, { type: 'Polygon', coordinates: [ring] }))))).toEqual({ ok: false, fehler: 'zu-gross' });   // über 3 Mio. Punkte
  });
  it('<script> als Gebietsname bleibt Text; Steuerzeichen fallen weg; Eigenschaften sind begrenzt; __proto__ ist nur ein Name', () => {
    const roh = JSON.parse('{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"NAME":"<script>alert(1)</script>","__proto__":"x","ctl":"a\\u0000b\\u202Ec","lang":"' + 'y'.repeat(5000) + '","n":1.5,"b":true,"obj":{"a":1},"null":null},"geometry":{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]]]}}]}');
    const r = geoLesen(roh);
    expect(r.ok).toBe(true); if (!r.ok) return;
    const e = r.daten.gebiete[0]!.eig;
    expect(e.get('NAME')).toBe('<script>alert(1)</script>'); expect(e.get('ctl')).toBe('a b c'); expect(e.get('lang')!.length).toBe(200);
    expect(e.get('n')).toBe('1.5'); expect(e.get('b')).toBe('true'); expect(e.has('obj')).toBe(false); expect(e.get('__proto__')).toBe('x');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it('Land aus der Datei von Eurostat: nach NUTS_ID-Anfang oder CNTR_CODE; ungültiges Kürzel ändert nichts', () => {
    const j = sammlung(feature({ NUTS_ID: 'AT11', CNTR_CODE: 'AT' }, poly(0, 0)), feature({ NUTS_ID: 'DE1', CNTR_CODE: 'DE' }, poly(1, 1)), feature({ CNTR_CODE: 'AT' }, poly(2, 2)), feature({ NUTS_ID: 'ATX' }, poly(3, 3)), 5);
    const g = geoLandFiltern(j, 'AT') as { features: unknown[] };
    expect(g.features).toHaveLength(3);
    expect(geoLandFiltern(j, 'at')).toBe(j); expect(geoLandFiltern(j, 'AT; DROP')).toBe(j); expect(geoLandFiltern('x', 'AT')).toBe('x');
  });
});

describe('Zuordnen: nicht zugeordnete Codes in beide Richtungen, kein Wert ist nie 0', () => {
  const g = gut().gebiete;
  it('Codes ohne Gebiet und Gebiete ohne Code werden gezählt und genannt', () => {
    const z = karteZuordnen(g, 'NUTS_ID', ['AT11', 'AT13', 'DE99', 'XX1', ' AT12x '], [10, 30, 99, 1, 5]);
    expect(z.werte).toEqual([10, null, 30]);
    expect(z.status).toEqual(['wert', 'ohne-daten', 'wert']); expect(z.gebieteOhneDaten).toBe(1); expect(z.gebieteBeispiele).toEqual(['AT12']);
    expect(z.codesOhneGebiet).toBe(3); expect(z.codesBeispiele).toEqual(['DE99', 'XX1', 'AT12x']); expect(z.zugeordnet).toBe(2);
  });
  it('Code vorhanden, Wert fehlt: kein Wert, nicht 0; ein echter Wert 0 bleibt 0', () => {
    const z = karteZuordnen(g, 'NUTS_ID', ['AT11', 'AT12', 'AT13'], [null, 0, NaN]);
    expect(z.werte).toEqual([null, 0, null]); expect(z.status).toEqual(['kein-wert', 'wert', 'kein-wert']); expect(z.gebieteKeinWert).toBe(2);
    expect(Object.is(z.werte[0], 0)).toBe(false);
  });
  it('mehrfacher Code ist nicht eindeutig (kein Wert), Zeile ohne Code wird gezählt; Groß- und Kleinschreibung zählt', () => {
    const z = karteZuordnen(g, 'NUTS_ID', ['AT11', 'AT11', '', null, 'at12', 'AT13'], [1, 2, 3, 4, 5, 6]);
    expect(z.status).toEqual(['mehrfach', 'ohne-daten', 'wert']); expect(z.werte).toEqual([null, null, 6]);
    expect(z.codesMehrfach).toBe(1); expect(z.zeilenOhneCode).toBe(2); expect(z.codesOhneGebiet).toBe(1);
  });
  it('Zahlen als Code werden als Text verglichen; Vorschlag der Eigenschaft nach den meisten Treffern', () => {
    const gz: Gebiet[] = [{ eig: new Map([['id', '1'], ['name', 'Eins']]), flaechen: [] }, { eig: new Map([['id', '2'], ['name', 'Zwei']]), flaechen: [] }];
    expect(karteZuordnen(gz, 'id', [1, 2], [5, 6]).werte).toEqual([5, 6]);
    expect(eigenschaftVorschlag(g, ['NAME_LATN', 'NUTS_ID'], ['AT11', 'AT12', 'AT13'])).toBe('NUTS_ID');
    expect(eigenschaftVorschlag(g, ['NAME_LATN', 'NUTS_ID'], ['ZZ'])).toBeNull();
  });
  it('Sätze: beide Richtungen, ohne Wert, mehrfach', () => {
    const z = karteZuordnen(g, 'NUTS_ID', ['AT11', 'AT11', 'DE99', 'AT13', ''], [1, 2, 3, null, 5]);
    const t = zuordnungSaetze(z, 3).join(' ');
    expect(t).toContain('0 von 3 Gebieten haben einen Wert'); expect(t).toContain('1 Code aus den Daten passt zu keinem Gebiet der Karte (zum Beispiel DE99)');
    expect(t).toContain('1 Gebiet der Karte hat keinen Code in den Daten (zum Beispiel AT12)'); expect(t).toContain('nicht als 0'); expect(t).toContain('mehrfach vor'); expect(t).toContain('1 Zeile hat keinen Code');
  });
});

describe('Klassen und Farben', () => {
  const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it('Vorgabe 5 Quantile: Grenzen aus Typ 7 wie R; jede Klasse etwa gleich besetzt', () => {
    const k = klassenBilden(x, 'quantil', 5)!;
    [1, 2.8, 4.6, 6.4, 8.2, 10].forEach((v, i) => expect(k.grenzen[i]!).toBeCloseTo(v, 9));
    const n = new Array(k.anzahl).fill(0); for (const v of x) n[klasseVon(k, v)]++;
    expect(n).toEqual([2, 2, 2, 2, 2]);
  });
  it('gleich breit; 3 bis 7 Klassen (außerhalb wird begrenzt); ohne Werte keine Klassen', () => {
    expect(klassenBilden(x, 'gleich', 3)!.grenzen).toEqual([1, 4, 7, 10]);
    expect(klassenBilden(x, 'gleich', 99)!.anzahl).toBe(7); expect(klassenBilden(x, 'gleich', 1)!.anzahl).toBe(3);
    expect(klassenBilden([], 'quantil', 5)).toBeNull(); expect(klassenBilden([NaN], 'quantil', 5)).toBeNull();
  });
  it('gleiche Werte: weniger Klassen als gewünscht, mit Satz; ein einziger Wert: eine Klasse', () => {
    const k = klassenBilden([1, 1, 1, 1, 1, 1, 1, 1, 1, 9], 'quantil', 5)!;
    expect(k.anzahl).toBeLessThan(5); expect(klassenSatz(k)).toContain('Gewünscht waren 5 Klassen');
    const e = klassenBilden([4, 4, 4], 'gleich', 5)!; expect(e.anzahl).toBe(1); expect(klasseVon(e, 4)).toBe(0);
    expect(klassenSatz(klassenBilden(x, 'gleich', 5)!)).toBe('');
  });
  it('die oberste Klasse schließt den größten Wert ein; Klassengrenzen gehören nach oben', () => {
    const k = klassenBilden(x, 'gleich', 3)!;
    expect([1, 3.99, 4, 6.99, 7, 10].map(v => klasseVon(k, v))).toEqual([0, 0, 1, 1, 2, 2]);
  });
  it('Farbe: Helligkeit nimmt von Klasse zu Klasse ab, auch bei 7 Klassen - in Graustufen zu unterscheiden', () => {
    const lum = (h: string) => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]; return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    for (const n of [3, 5, 7]) {
      const l = Array.from({ length: n }, (_, i) => lum(klassenFarbe(i, n)));
      for (let i = 1; i < n; i++) expect(l[i - 1]! - l[i]!, `${n} Klassen`).toBeGreaterThan(12);
      expect(l[n - 1]!).toBeLessThan(lum('#cfcfcf'));   // die dunkelste Klasse ist dunkler als „kein Wert“
    }
    expect(klassenFarbe(0, 5)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('Projektion und Bild', () => {
  it('flächentreu (Equal Earth): ein Feld von 3 mal 3 Grad bei 60° Breite hat so viel Fläche, wie die Kugel es verlangt, im Verhältnis zum Feld am Äquator', () => {
    const feld = (lo: number, la: number) => new Float64Array([lo, la, lo + 3, la, lo + 3, la + 3, lo, la + 3, lo, la]);
    const q: Gebiet[] = [{ eig: new Map(), flaechen: [[feld(0, -1.5)]] }, { eig: new Map(), flaechen: [[feld(0, 58.5)]] }];
    const r = projiziere(q, 560, 520, 0, 0);
    const flaeche = (d: string) => {
      const p = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])] as const);
      let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i]!, [x2, y2] = p[(i + 1) % p.length]!; a += x1 * y2 - x2 * y1; }
      return Math.abs(a) / 2;
    };
    const rad = (g: number) => (g * Math.PI) / 180;
    const soll = (Math.sin(rad(61.5)) - Math.sin(rad(58.5))) / (Math.sin(rad(1.5)) - Math.sin(rad(-1.5)));
    expect(flaeche(r.pfade[1]![0]!) / flaeche(r.pfade[0]![0]!)).toBeCloseTo(soll, 1);
    expect(r.hoehe).toBeLessThanOrEqual(520); expect(r.pfade[0]![0]!.endsWith('Z')).toBe(true); expect(r.mitte).toBe(0);
  });
  it('der Pfadtext besteht nur aus Befehlsbuchstaben und Zahlen (kein Text aus der Datei)', () => {
    const g = gut(); const r = projiziere(g.gebiete);
    for (const p of r.pfade) expect(p.join('')).toMatch(/^[MLZ\d. -]*$/);
    expect(r.breite).toBe(560);
  });
  it('Modell: Pfade, Legende mit „kein Wert“, Titel je Gebiet, Beschreibung; Namen mit <script> bleiben Text', () => {
    const g = geoLesen(sammlung(feature({ id: 'a', n: '<script>x</script>' }, poly(0, 0)), feature({ id: 'b', n: 'B' }, poly(2, 0))));
    if (!g.ok) throw new Error();
    const z = karteZuordnen(g.daten.gebiete, 'id', ['a'], [5]); const k = klassenBilden([5], 'gleich', 3);
    const m = karteModell({ gebiete: g.daten.gebiete, rahmen: projiziere(g.daten.gebiete), zuordnung: z, klassen: k, wertName: 'Rate', gebietName: 'id', beschriftung: 'n', quelle: { art: 'datei', name: 'x.geojson' } });
    expect(m.gebiete[0]!.titel).toBe('<script>x</script>: 5'); expect(m.gebiete[1]!.titel).toBe('B: kein Wert');
    expect(m.gebiete[1]!.fuell).toBe('#cfcfcf'); expect(m.legende.at(-1)).toEqual({ farbe: '#cfcfcf', text: 'kein Wert', kein: true });
    expect(m.beschreibung).toContain('1 von 2 Gebieten haben einen Wert'); expect(m.beschreibung).toContain('Tabelle neben der Karte');
    expect(m.fuss.join(' ')).toContain('Equal Earth');
  });
});

describe('Tabelle neben der Karte und CSV', () => {
  const g = gut().gebiete;
  it('dieselben Werte wie die Karte; kein Wert ist leer, nicht 0; Zahlen im Sprachformat in der Legende', () => {
    const z = karteZuordnen(g, 'NUTS_ID', ['AT11', 'AT12'], [1.5, null]); const k = klassenBilden([1.5], 'gleich', 3);
    const t = karteTabelle(g, z, k, 'NAME_LATN', 'NUTS_ID');
    expect(t.map(r => [r.code, r.wert])).toEqual([['AT11', 1.5], ['AT12', null], ['AT13', null]]);
    expect(t[1]!.klasse).toBe(keinWertText());
    const csv = karteCsv(t, karteVermerk());
    expect(csv.split('\n')[0]).toBe('Gebiet;Code;Wert;Klasse'); expect(csv).toContain('Burgenland;AT11;1,5;'); expect(csv).toMatch(/Niederösterreich;AT12;;kein Wert/); expect(csv).toContain('© EuroGeographics bezüglich der Verwaltungsgrenzen');
    expect(zahlText(1234.56789)).toBe('1234,568'); expect(zahlText(0.0001234)).toBe('0,000123');
  });
  it('CSV: Formel-Zeichen am Anfang eines Namens werden entschärft', () => {
    const c = karteCsv([{ name: '=HYPERLINK("x")', code: '+1', wert: 2, klasse: '@a', status: 'wert' }], null);
    expect(c).toContain('"\'=HYPERLINK(""x"")"'); expect(c).toContain(";'+1;"); expect(c).toContain(";'@a");
  });
});

describe('Abruf von Eurostat (GISCO): kein Netz im Test, fester Weg', () => {
  const adresse = giscoAdresse(2)!;
  const antwort = (text: string, init: Partial<{ status: number; url: string; redirected: boolean; laenge: string }> = {}) => ({
    ok: (init.status ?? 200) < 400, status: init.status ?? 200, redirected: init.redirected ?? false, url: init.url ?? adresse,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-length' ? init.laenge ?? null : null) },
    body: new Response(text).body, arrayBuffer: async () => new TextEncoder().encode(text).buffer
  });
  const holer = (a: ReturnType<typeof antwort>) => async () => a as unknown as Response;
  it('fremde Adresse: kein Abruf', async () => {
    let n = 0;
    expect(await giscoAbrufen('https://example.org/x.geojson', { fetchFn: (async () => { n++; return {} as Response; }) as typeof fetch })).toEqual({ ok: false, fehler: 'adresse' });
    expect(n).toBe(0);
  });
  it('gesendet wird ohne Cookies, ohne Referrer, ohne Weiterleitung', async () => {
    let init: RequestInit | undefined;
    const r = await giscoAbrufen(adresse, { fetchFn: (async (_a: string, i: RequestInit) => { init = i; return antwort('{}') as unknown as Response; }) as unknown as typeof fetch });
    expect(r.ok).toBe(true);
    expect(init).toMatchObject({ method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store' });
    expect(init!.body).toBeUndefined();
  });
  it('Weiterleitung, 404, Fehler des Dienstes, zu groß (Kopfzeile und beim Lesen), Netz weg, Zeitlimit', async () => {
    const f = async (a: ReturnType<typeof antwort>) => (await giscoAbrufen(adresse, { fetchFn: holer(a) as unknown as typeof fetch })) as { ok: boolean; fehler?: string };
    expect((await f(antwort('x', { redirected: true }))).fehler).toBe('umleitung');
    expect((await f(antwort('x', { url: 'https://example.org/' }))).fehler).toBe('umleitung');
    expect((await f(antwort('x', { status: 404 }))).fehler).toBe('nicht-gefunden');
    expect((await f(antwort('x', { status: 503 }))).fehler).toBe('dienst');
    expect((await f(antwort('x', { laenge: String(GISCO_MAX_BYTES + 1) }))).fehler).toBe('zu-gross');
    expect((await f(antwort('x'.repeat(GISCO_MAX_BYTES + 1)))).fehler).toBe('zu-gross');
    expect(await giscoAbrufen(adresse, { fetchFn: (async () => { throw new TypeError('x'); }) as typeof fetch })).toEqual({ ok: false, fehler: 'netz' });
    expect(await giscoAbrufen(adresse, { zeitlimitMs: 20, fetchFn: ((_a: string, i: RequestInit) => new Promise((_ok, nein) => i.signal!.addEventListener('abort', () => nein(new DOMException('a', 'AbortError'))))) as unknown as typeof fetch })).toEqual({ ok: false, fehler: 'zeitlimit' });
    const ac = new AbortController(); ac.abort();
    expect(await giscoAbrufen(adresse, { signal: ac.signal, fetchFn: holer(antwort('x')) as unknown as typeof fetch })).toEqual({ ok: false, fehler: 'abgebrochen' });
  });
  it('Laden: nur das gewählte Land wird gelesen und für das Blatt aufgehoben; falsches Kürzel oder Land ohne Gebiet', async () => {
    const j = sammlung(feature({ NUTS_ID: 'AT11', CNTR_CODE: 'AT', NAME_LATN: 'Burgenland' }, poly(16, 47)), feature({ NUTS_ID: 'DE1', CNTR_CODE: 'DE' }, poly(8, 48)));
    const fetchFn = (async () => antwort(JSON.stringify(j))) as unknown as typeof fetch;   // jedes Mal eine neue Antwort: ein Körper lässt sich nur einmal lesen
    const r = await giscoLaden(2, 'AT', { fetchFn });
    expect(r.ok && r.daten.gebiete.length).toBe(1);
    expect(r.ok && JSON.parse(r.text).features).toHaveLength(1);
    expect(await giscoLaden(2, 'at', { fetchFn })).toEqual({ ok: false, fehler: 'land' });
    expect(await giscoLaden(2, 'FR', { fetchFn })).toEqual({ ok: false, fehler: 'land' });
    expect(await giscoLaden(7, 'AT', { fetchFn })).toEqual({ ok: false, fehler: 'adresse' });
    expect(await giscoLaden(2, 'AT', { fetchFn: holer(antwort('kein json')) as unknown as typeof fetch })).toEqual({ ok: false, fehler: 'unlesbar' });
  });
  it('Fehlersätze und Warnungen sind da, in beiden Sprachen', () => {
    for (const f of ['unlesbar', 'form', 'typ', 'zu-gross', 'zu-viele', 'koordinaten', 'leer', 'netz', 'zeitlimit', 'abgebrochen', 'umleitung', 'nicht-gefunden', 'dienst', 'adresse', 'land'] as const) expect(geoFehlerSatz(f).length).toBeGreaterThan(10);
    expect(karteWarnungen()).toHaveLength(4);
    expect(karteWarnungen()[0]).toContain('Flächen, nicht Menschen'); expect(karteWarnungen()[1]).toContain('Absolute Zahlen'); expect(karteWarnungen()[3]).toContain('Kleine Gebiete');
    s.einst.sprache = 'en';
    try { expect(karteWarnungen()[0]).toContain('areas, not people'); expect(geoFehlerSatz('netz')).toContain('connection to Eurostat'); } finally { s.einst.sprache = 'de'; }
  });
});

describe('Das Bild und die Seite: wie sie wirklich gezeichnet werden (Server-Zeichnung, kein Browser)', () => {
  const baue = (quelle: 'gisco' | 'datei', namen = ['<script>alert(1)</script>', 'B']) => {
    const g = geoLesen(sammlung(feature({ id: 'a', n: namen[0] }, poly(0, 0)), feature({ id: 'b', n: namen[1] }, poly(2, 0))));
    if (!g.ok) throw new Error();
    return karteModell({ gebiete: g.daten.gebiete, rahmen: projiziere(g.daten.gebiete), zuordnung: karteZuordnen(g.daten.gebiete, 'id', ['a'], [5]), klassen: klassenBilden([5], 'gleich', 3), wertName: '<b>Rate</b>', gebietName: 'id', beschriftung: 'n', quelle: { art: quelle, name: '"><script>x</script>.geojson', ebene: 2 } });
  };
  it('der Vermerk steht im SVG selbst, sodass auch Export und PNG ihn tragen', async () => {
    const { render } = await import('svelte/server');
    const KarteBild = (await import('../bausteine/KarteBild.svelte')).default;
    const svg = render(KarteBild, { props: { modell: baue('gisco') } }).body;
    const innen = svg.slice(svg.indexOf('<svg'), svg.indexOf('</svg>'));
    expect(innen).toContain('© EuroGeographics bezüglich der Verwaltungsgrenzen');
    expect(innen).toContain('role="img"'); expect(innen).toContain('kein Wert');
    expect(innen).toContain('Karte: &lt;b>Rate&lt;/b>');
    const ohne = render(KarteBild, { props: { modell: baue('datei') } }).body;
    expect(ohne).not.toContain('EuroGeographics'); expect(ohne).toContain('Grenzen: eigene Datei'); expect(ohne).toContain('Nutzungsrechte');   // der Satz bricht im Bild um
  });
  it('Texte aus der Datei bleiben Text: nirgends ein echtes <script> oder ein ausbrechendes Anführungszeichen', async () => {
    const { render } = await import('svelte/server');
    const KarteBild = (await import('../bausteine/KarteBild.svelte')).default;
    const body = render(KarteBild, { props: { modell: baue('datei') } }).body;
    expect(body).not.toMatch(/<script/i); expect(body).toContain('&lt;script>alert(1)&lt;/script>: 5');   // das öffnende Zeichen eines Tags ist maskiert: es ist Text, kein Tag
    expect(body).not.toContain('"><script'); expect(body.match(/<path /g)!.length).toBeGreaterThanOrEqual(2);
    for (const d of body.match(/ d="([^"]*)"/g) ?? []) expect(d).toMatch(/^ d="[MLZ\d. -]*"$/);
  });
  it('der Quelltext der Bilder setzt nirgends HTML aus Daten ein', () => {
    for (const f of ['app/src/bausteine/KarteBild.svelte', 'app/src/seiten/Karte.svelte']) expect(readFileSync(new URL(f, wurzel), 'utf8'), f).not.toMatch(/\{@html|innerHTML|insertAdjacentHTML|outerHTML/);
  });
  it('die Seite nennt die Bedingungen vor dem Laden, lädt nur auf Klick und zeigt immer die vier Warnungen und eine echte Tabelle', async () => {
    const quelle = readFileSync(new URL('app/src/seiten/Karte.svelte', wurzel), 'utf8');
    expect(quelle).toMatch(/onclick=\{giscoHolen\}/); expect(quelle).toContain('disabled={!bestaetigt || laden.aktiv}');
    expect(quelle).not.toMatch(/onMount|\$effect[\s\S]{0,300}giscoLaden/);
    expect(quelle).toContain('karteWarnungen()'); expect(quelle).toMatch(/<table class="karte-tab">[\s\S]*<thead>[\s\S]*<tbody>/); expect(quelle).toContain('{#if !OFFLINE}');
    const { render } = await import('svelte/server');
    const Seite = (await import('../seiten/Karte.svelte')).default;
    s.spalten = [{ name: 'region', bezeichnung: '', art: 'text', niveau: 'nominal', format: 'A4', fehlend: [], fehlendText: '', werteLabels: {} }] as never; s.zeilen = [['AT11']] as never;
    const html = render(Seite).body;
    expect(html).toContain('Die Grenzen kommen von Eurostat (GISCO)'); expect(html).toContain('nur nicht-kommerziell'); expect(html).toContain('Die Grenzen werden nur nicht-kommerziell verwendet, und die Quelle wird genannt.');
    const ende = html.indexOf('Grenzen von Eurostat laden</button>');
    expect(ende).toBeGreaterThan(-1);
    expect(html.slice(html.lastIndexOf('<button', ende), ende)).toContain('disabled');   // ohne Bestätigung gesperrt
  });
});
