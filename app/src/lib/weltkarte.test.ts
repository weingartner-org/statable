import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { s } from './sitzung.svelte';
import { geoLesen, projiziere, karteModell, karteZuordnen, klassenBilden, grenzenQuelleText, zuordnungSaetze, karteGrenzenHinweise, type Gebiet } from './karte';
import { equalEarth, drehen, mitteBerechnen, staatenZuordnen, staatenSpalteVorschlag, staatAnzeige, regionName, indexLesen, ringKarte } from './weltkarte';
import { kartenHolen, kartenIndex, weltLaden, landLaden } from './kartenladen';

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const wurzel = new URL('../../../', import.meta.url);
const karten = new URL('app/public/karten/', wurzel);
const erwartet = JSON.parse(readFileSync(new URL('app/src/lib/testdaten/weltkarte-erwartet.json', wurzel), 'utf8')) as {
  punkte: { lon: number; lat: number; x: number; y: number }[]; flaeche: { breiten: number[]; verhaeltnis: number[] }; mitten: { name: string; lon: number[]; lam0: number }[];
};
const nah = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

describe('Equal Earth gegen die Sollwerte aus R (scripts/weltkarte-erwartet.R)', () => {
  it('zwölf Punkte, relativ 1e-9', () => {
    expect(erwartet.punkte.length).toBe(12);
    for (const p of erwartet.punkte) {
      const [x, y] = equalEarth(p.lon, p.lat);
      expect(nah(x, p.x), `x bei ${p.lon}/${p.lat}: ${x} statt ${p.x}`).toBe(true);
      expect(nah(y, p.y), `y bei ${p.lon}/${p.lat}: ${y} statt ${p.y}`).toBe(true);
    }
  });
  it('flächentreu: Felder von 1 mal 1 Grad behalten ihr Flächenverhältnis zur Kugel', () => {
    const zelle = (la: number) => {
      const n = 200, p: [number, number][] = [];
      for (let i = 0; i <= n; i++) p.push(equalEarth(i / n, la + 1));
      for (let i = n; i >= 0; i--) p.push(equalEarth(i / n, la));
      let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i]!, [x2, y2] = p[(i + 1) % p.length]!; a += x1 * y2 - x2 * y1; }
      return Math.abs(a) / 2;
    };
    const fl = erwartet.flaeche.breiten.map(zelle);
    erwartet.flaeche.verhaeltnis.forEach((v, i) => expect(Math.abs(fl[i]! / fl[0]! - v), `Breite ${erwartet.flaeche.breiten[i]}`).toBeLessThanOrEqual(2e-3));
  });
});

describe('Mitte über die größte leere Lücke der Längengrade', () => {
  for (const f of erwartet.mitten) it(`${f.name}: lam0 ${f.lam0}`, () => { expect(nah(mitteBerechnen(f.lon), f.lam0)).toBe(true); });
  it('ohne Punkte: 0; ein einziger Längengrad: genau dieser', () => { expect(mitteBerechnen([])).toBe(0); expect(mitteBerechnen([42])).toBeCloseTo(42, 9); });
  it('drehen: bei Mitte 0 bleibt +180 und -180, wie es ist; sonst fällt die Datumsgrenze auf eine Stelle', () => {
    expect(drehen(180, 0)).toBe(180); expect(drehen(-180, 0)).toBe(-180);
    expect(drehen(180, 104.95)).toBeCloseTo(75.05, 9); expect(drehen(-180, 104.95)).toBeCloseTo(75.05, 9);
    expect(drehen(-179, 179)).toBeCloseTo(2, 9); expect(drehen(178, 179)).toBeCloseTo(-1, 9);
  });
  it('projiziere übernimmt die Mitte: Weltkarte fest 0, eigene Gebiete automatisch', () => {
    const feld = (lo: number, la: number) => ({ eig: new Map<string, string>(), flaechen: [[new Float64Array([lo, la, lo + 1, la, lo + 1, la + 1, lo, la + 1, lo, la])]] }) as Gebiet;
    expect(projiziere([feld(10, 10), feld(12, 20)], 560, 520, 8, 0).mitte).toBe(0);
    expect(nah(projiziere([feld(177, -17), feld(-180, -17), feld(-179, -18)]).mitte, 179.5)).toBe(true);   // Lücke von -178 bis 177, Gegenseite 179,5
  });
});

/** Größter waagerechter Sprung zwischen zwei aufeinanderfolgenden Punkten eines Pfads, über alle Pfade. */
const maxSprung = (pfade: string[][]): number => {
  let m = 0;
  for (const g of pfade) for (const d of g) for (const ring of d.split('Z')) {
    const xs = [...ring.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(a => Number(a[1]));
    for (let i = 1; i < xs.length; i++) m = Math.max(m, Math.abs(xs[i]! - xs[i - 1]!));
  }
  return m;
};
const ladeGeo = (datei: string) => { const r = geoLesen(readFileSync(new URL(datei, karten), 'utf8')); if (!r.ok) throw new Error(datei + ': ' + r.fehler); return r.daten; };

describe('Datumsgrenze: keine Linie quer über das Bild', () => {
  it('ein Ring, der von 179 nach -179 läuft, wird fortgesetzt statt quer gezogen', () => {
    // Ein zweites Gebiet bei 0 Grad gibt dem Bild die volle Breite; sonst wäre der Streifen von 178 bis 182 Grad selbst das ganze Bild und jeder Schritt "quer"
    const g: Gebiet[] = [{ eig: new Map(), flaechen: [[new Float64Array([178, 0, 179, 0, -179, 0, -178, 0, -178, 1, 178, 1, 178, 0])]] }, { eig: new Map(), flaechen: [[new Float64Array([-1, 0, 1, 0, 1, 1, -1, 1, -1, 0])]] }];
    const r = projiziere(g, 560, 520, 8, 0);
    expect(maxSprung(r.pfade)).toBeLessThan(0.2 * r.breite);
    const punkte: number[] = [];
    ringKarte(g[0]!.flaechen[0]![0]!, 0, x => punkte.push(x));
    for (let i = 1; i < punkte.length; i++) expect(Math.abs(punkte[i]! - punkte[i - 1]!)).toBeLessThan(0.1);
  });
  it('Fidschi (echte Datei): ein zusammenhängendes Bild, keine Linie über die ganze Breite', () => {
    const r = projiziere(ladeGeo('land/FJI.json').gebiete);
    expect(maxSprung(r.pfade)).toBeLessThan(0.4 * r.breite);
    expect(Math.abs(r.mitte)).toBeGreaterThan(150);   // gedreht um die Gegenseite der Lücke, also in der Nähe der Datumsgrenze
  });
  it('Russland (echte Datei, Gebiete beidseits der Datumsgrenze): kein Sprung über das Bild, Mitte im Osten', () => {
    const r = projiziere(ladeGeo('land/RUS.json').gebiete);
    expect(maxSprung(r.pfade)).toBeLessThan(0.4 * r.breite);
    expect(r.mitte).toBeGreaterThan(60); expect(r.mitte).toBeLessThan(150);
  });
  it('Weltkarte (Mitte 0): außer der Randlinie am Südpol kein Sprung über das Bild', () => {
    const welt = ladeGeo('welt.json');
    const ohneAntarktis = welt.gebiete.filter(g => g.eig.get('iso3') !== 'ATA');
    expect(ohneAntarktis.length).toBe(welt.gebiete.length - 1);
    const r = projiziere(ohneAntarktis, 560, 520, 8, 0);
    expect(maxSprung(r.pfade)).toBeLessThan(0.45 * r.breite);
    expect(r.hoehe / r.breite).toBeGreaterThan(0.3); expect(r.hoehe / r.breite).toBeLessThan(0.6);
  });
});

const welt = () => ladeGeo('welt.json').gebiete;
const sprachen = ['de', 'en'];
describe('Zuordnung der Staaten: genau gleich nach Trimmen, Groß/Klein und NFC; keine Näherungssuche', () => {
  const gebiete = welt();
  const eins = (code: string) => {
    const z = staatenZuordnen(gebiete, [code], [7], sprachen);
    const i = gebiete.findIndex(g => g.eig.get('iso3') === 'AUT');
    return { z, getroffen: z.werte[i] === 7, nurEiner: z.zugeordnet === 1 };
  };
  for (const code of ['AT', 'AUT', 'Österreich', 'Austria', 'austria', '  AUSTRIA ', 'at', 'Österreich'.normalize('NFD')])
    it(`„${code}“ trifft Österreich`, () => { const e = eins(code); expect(e.getroffen).toBe(true); expect(e.nurEiner).toBe(true); });
  it('„Oesterreich“ wird nicht zugeordnet und als Code ohne Gebiet gezählt', () => {
    const e = eins('Oesterreich');
    expect(e.getroffen).toBe(false); expect(e.z.zugeordnet).toBe(0); expect(e.z.codesOhneGebiet).toBe(1); expect(e.z.codesBeispiele).toEqual(['Oesterreich']);
  });
  it('Akzente zählen: „Osterreich“ und „Curacao“ treffen nicht', () => {
    expect(staatenZuordnen(gebiete, ['Osterreich', 'Curacao'], [1, 2], sprachen).zugeordnet).toBe(0);
  });
  it('mehrere Staaten mit Wert: Zählung, Gebiete ohne Wert sind kein Fehler', () => {
    const z = staatenZuordnen(gebiete, ['AT', 'Germany', 'KEN', 'Atlantis', '', null], [1, 2, 3, 4, 5, 6], sprachen);
    expect(z.zugeordnet).toBe(3); expect(z.codesOhneGebiet).toBe(1); expect(z.zeilenOhneCode).toBe(2);
    expect(z.gebieteOhneDaten).toBe(gebiete.length - 3);
    expect(zuordnungSaetze(z, gebiete.length, true).join(' ')).not.toContain('keinen Code in den Daten');   // Länder ohne Wert sind bei der Weltkarte kein Fehler
    expect(zuordnungSaetze(z, gebiete.length, true)[0]).toContain('3 von 258 Gebieten');
  });
  it('„Ägypten“ in der App-Sprache Deutsch und „Egypt“ auf Englisch treffen denselben Staat', () => {
    const a = staatenZuordnen(gebiete, ['Ägypten'], [1], ['de']), b = staatenZuordnen(gebiete, ['Egypt'], [1], ['en']);
    expect(a.zugeordnet).toBe(1); expect(b.zugeordnet).toBe(1);
    expect(a.werte.findIndex(v => v === 1)).toBe(b.werte.findIndex(v => v === 1));
  });
  it('derselbe Staat in zwei Zeilen (oder in zwei Schreibweisen) ist nicht eindeutig: kein Wert', () => {
    const z1 = staatenZuordnen(gebiete, ['AT', 'at'], [1, 2], sprachen), z2 = staatenZuordnen(gebiete, ['AT', 'Austria'], [1, 2], sprachen);
    expect(z1.zugeordnet).toBe(0); expect(z1.codesMehrfach).toBe(1); expect(z2.zugeordnet).toBe(0);
    expect(z2.status.filter(x => x === 'mehrfach').length).toBe(1);
  });
  it('ein Name, der zu zwei Staaten passt, wird nicht zugeordnet, gezählt und genannt', () => {
    const g = (iso2: string, iso3: string, name: string): Gebiet => ({ eig: new Map([['iso2', iso2], ['iso3', iso3], ['name', name]]), flaechen: [] });
    const z = staatenZuordnen([g('AA', 'AAA', 'Congo'), g('BB', 'BBB', 'Congo'), g('CC', 'CCC', 'Chad')], ['Congo', 'AA', 'chad'], [1, 2, 3], []);
    expect(z.codesMehrdeutig).toBe(1); expect(z.mehrdeutigBeispiele).toEqual(['Congo']);
    expect(z.werte).toEqual([2, null, 3]); expect(z.zugeordnet).toBe(2);
    expect(zuordnungSaetze(z, 3, true).join(' ')).toContain('passt zu mehr als einem Staat (zum Beispiel Congo)');
  });
  it('Vorschlag der Spalte: die mit den meisten eindeutigen Treffern', () => {
    const v = staatenSpalteVorschlag(gebiete, [{ name: 'id', werte: [1, 2, 3] }, { name: 'land', werte: ['Austria', 'Kenya', 'Peru', 'x'] }, { name: 'notiz', werte: ['a', 'b'] }], sprachen);
    expect(v).toBe('land');
    expect(staatenSpalteVorschlag(gebiete, [{ name: 'id', werte: [1, 2] }], sprachen)).toBeNull();
  });
  it('Anzeige in der Sprache der App (Intl), sonst Name aus Natural Earth', () => {
    const at = gebiete.find(g => g.eig.get('iso3') === 'AUT')!;
    expect(staatAnzeige(at, 'de')).toBe('Österreich'); expect(staatAnzeige(at, 'en')).toBe('Austria');
    expect(regionName('KE', 'de')).toBe('Kenia'); expect(regionName('', 'de')).toBe('');
    const ohne = gebiete.filter(g => !g.eig.get('iso2'));
    expect(ohne.length).toBeGreaterThan(0);
    for (const g of ohne) expect(staatAnzeige(g, 'de').length).toBeGreaterThan(0);
  });
});

describe('Karten vom eigenen Server: nur feste Adressen, Größe und Prüfsumme', () => {
  const vomPlatz = (geaendert?: (a: string, b: Uint8Array) => Uint8Array): typeof fetch => (async (url: URL | string) => {
    const a = String(url).replace(/^http:\/\/localhost\//, '');
    try {
      let b: Uint8Array = readFileSync(new URL('app/public/' + a, wurzel));
      if (geaendert) b = geaendert(a, b);
      return new Response(new Uint8Array(b), { status: 200 });
    } catch { return new Response('', { status: 404 }); }
  }) as typeof fetch;
  it('Welt und Land werden geholt, gelesen und mit dem Eintrag des Verzeichnisses zurückgegeben', async () => {
    const w = await weltLaden({ fetchFn: vomPlatz() });
    expect(w.ok && w.wert.daten.gebiete.length).toBeGreaterThanOrEqual(240);
    const k = await landLaden('KEN', { fetchFn: vomPlatz() });
    expect(k.ok && k.wert.daten.gebiete.length).toBe(47); expect(k.ok && k.wert.eintrag.quelle).toBe('geoBoundaries');
  });
  it('eine veränderte Datei wird abgelehnt, ein Land ohne Datei und eine fremde Adresse ebenso', async () => {
    const veraendert = await weltLaden({ fetchFn: vomPlatz((a, b) => (a.endsWith('welt.json') ? Buffer.concat([b.subarray(0, b.length - 3), Buffer.from('  \n')]) : b)) });
    expect(veraendert).toEqual({ ok: false, fehler: 'karten-pruefsumme' });
    const kurz = await weltLaden({ fetchFn: vomPlatz((a, b) => (a.endsWith('welt.json') ? b.subarray(0, 100) : b)) });
    expect(kurz).toEqual({ ok: false, fehler: 'karten-pruefsumme' });
    expect(await landLaden('ZZZ', { fetchFn: vomPlatz() })).toEqual({ ok: false, fehler: 'karten-laden' });
    expect(await landLaden('../x', { fetchFn: vomPlatz() })).toEqual({ ok: false, fehler: 'karten-laden' });
    for (const a of ['https://example.org/karten/welt.json', 'karten/../x.json', 'karten/land/KEN.json?x=1', 'klass/oenace2008.json', '//evil/karten/welt.json'])
      expect(await kartenHolen(a, { fetchFn: vomPlatz() }), a).toEqual({ ok: false, fehler: 'karten-laden' });
  });
  it('Netz weg und Antwort 404 geben einen Fehler, werfen nicht', async () => {
    expect(await kartenIndex({ fetchFn: (async () => { throw new Error('netz'); }) as typeof fetch })).toEqual({ ok: false, fehler: 'karten-laden' });
    expect(await kartenIndex({ fetchFn: (async () => new Response('', { status: 404 })) as typeof fetch })).toEqual({ ok: false, fehler: 'karten-laden' });
    expect(await kartenIndex({ fetchFn: (async () => new Response('{"a":1}', { status: 200 })) as typeof fetch })).toEqual({ ok: false, fehler: 'karten-form' });
  });
  it('das Verzeichnis: Einträge mit falschem Land oder ohne https-Adresse fallen weg', () => {
    const j = JSON.parse(readFileSync(new URL('index.json', karten), 'utf8'));
    expect(indexLesen(j)?.welt.iso3).toBe('WELT');
    const kaputt = structuredClone(j); kaputt.laender.KEN.lizenzAdresse = 'javascript:alert(1)'; kaputt.laender.AUT.iso3 = 'XXX';
    const i = indexLesen(kaputt)!;
    expect(i.laender.KEN).toBeUndefined(); expect(i.laender.AUT).toBeUndefined(); expect(i.laender.DEU).toBeDefined();
    expect(indexLesen({ format: 'x' })).toBeNull();
  });
});

describe('Bild und Seite', () => {
  const eintrag = JSON.parse(readFileSync(new URL('index.json', karten), 'utf8')).laender;
  it('die Zeile „Grenzen: …“ nennt Quelle, Lizenz und Stand, auf Deutsch und Englisch', () => {
    const e = indexLesen(JSON.parse(readFileSync(new URL('index.json', karten), 'utf8')))!;
    expect(grenzenQuelleText(e.laender.KEN!)).toMatch(/^Grenzen: geoBoundaries \(.*gemeinfrei.*\), Stand 2020, gbOpen \d{4}-\d{2}-\d{2}\.$/);
    expect(grenzenQuelleText(e.welt)).toBe(`Grenzen: Natural Earth (gemeinfrei), Version ${e.welt.stand}.`);
    s.einst.sprache = 'en';
    try { expect(grenzenQuelleText(e.laender.KEN!)).toMatch(/^Boundaries: geoBoundaries \(.*\), as of 2020, gbOpen/); } finally { s.einst.sprache = 'de'; }
    expect(Object.keys(eintrag).length).toBeGreaterThan(150);
  });
  it('das Bild der Weltkarte trägt die Quelle im SVG selbst und die Hinweise stehen da', async () => {
    const e = indexLesen(JSON.parse(readFileSync(new URL('index.json', karten), 'utf8')))!;
    const gebiete = welt();
    const m = karteModell({ gebiete, rahmen: projiziere(gebiete, 560, 520, 8, 0), zuordnung: staatenZuordnen(gebiete, ['AT'], [5], sprachen), klassen: klassenBilden([5], 'gleich', 3), wertName: 'Rate', gebietName: 'iso3', beschriftung: 'name', quelle: { art: 'welt', name: 'Natural Earth' }, grenzenText: grenzenQuelleText(e.welt) });
    expect(m.fuss.join(' ')).toContain('Equal Earth'); expect(m.fuss.join(' ')).toContain('Natural Earth');
    expect(m.vermerk).toBeNull();
    const { render } = await import('svelte/server');
    const KarteBild = (await import('../bausteine/KarteBild.svelte')).default;
    const svg = render(KarteBild, { props: { modell: m } }).body;
    expect(svg).toContain('Natural Earth (gemeinfrei)'); expect(svg).toContain('role="img"'); expect(svg.match(/<path /g)!.length).toBe(gebiete.length);
    for (const d of svg.match(/ d="([^"]*)"/g) ?? []) expect(d).toMatch(/^ d="[MLZ\d. -]*"$/);
    const h = karteGrenzenHinweise().join(' ');
    expect(h).toContain('keine politische Aussage'); expect(h).toContain('Gliederungen ändern sich');
  });
  it('die Seite bietet Welt, Land, Eurostat und eigene Datei an; Land mit Suche; bei den Staaten die Tabelle neben der Karte', async () => {
    const quelle = readFileSync(new URL('app/src/seiten/Karte.svelte', wurzel), 'utf8');
    expect(quelle).toContain('weltOeffnen'); expect(quelle).toContain('landOeffnen'); expect(quelle).toContain('<table class="karte-tab">'); expect(quelle).toContain('$state.snapshot(quelle)');
    expect(quelle).not.toMatch(/\{@html|innerHTML/); expect(quelle).not.toMatch(/@media\s*\(\s*(max|min)-width/);
    const { render } = await import('svelte/server');
    const Seite = (await import('../seiten/Karte.svelte')).default;
    s.spalten = [{ name: 'land', bezeichnung: '', art: 'text', niveau: 'nominal', format: 'A4', fehlend: [], fehlendText: '', werteLabels: {} }] as never; s.zeilen = [['AT']] as never;
    const html = render(Seite).body;
    for (const t of ['Die ganze Welt (Staaten)', 'Ein Land (Provinzen)', 'Weltkarte öffnen', 'Grenzen von Eurostat laden', 'GeoJSON-Datei öffnen']) expect(html, t).toContain(t);
  });
  it('Zuordnung für Provinzen bleibt exakt: Groß/Klein zählt dort', () => {
    const g = ladeGeo('land/KEN.json').gebiete;
    const code = g[0]!.eig.get('code')!;
    expect(code).toMatch(/^KE-/);
    expect(karteZuordnen(g, 'code', [code], [1]).zugeordnet).toBe(1);
    expect(karteZuordnen(g, 'code', [code.toLowerCase()], [1]).zugeordnet).toBe(0);
  });
});

describe('Zwei Schreibweisen desselben Staats', () => {
  it('„Kenya“ und „KE“ geben keinen Wert und werden als mehrfach gezählt', () => {
    const g = [{ eig: new Map([['iso2', 'KE'], ['iso3', 'KEN'], ['name', 'Kenya']]), flaechen: [] }];
    const z = staatenZuordnen(g, ['Kenya', 'KE'], [1, 2], ['en']);
    expect(z.status).toEqual(['mehrfach']);
    expect(z.werte).toEqual([null]);
    expect(z.codesMehrfach).toBe(1);
  });
});
