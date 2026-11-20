// Eurostat-Daten öffnen (Fachblatt SAISON-EUROSTAT, Abschnitt 2 und 3): Adresse, Abruf (mit einem falschen fetch), JSON-stat 2.0 lesen, Quelle, Protokoll.
// Die Sollwerte stehen in testdaten/eurostat-une-rt-m.json (echte Antwort vom 30.10.2026) mit eurostat-une-rt-m-erwartet.csv und in testdaten/eurostat-luecken.json (Feld `erwartet`).
// Sie werden hier nur gelesen. Dieser Test ruft das Netz nie ab: `fetch` ist für die ganze Datei durch eine Falle ersetzt.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { s } from './sitzung.svelte';
import {
  EUROSTAT_BASIS, EUROSTAT_MAX_BYTES, EUROSTAT_MAX_ZEILEN, eurostatAbrufen, eurostatAdresse, eurostatAdresseOk, eurostatFehlerSatz, eurostatFilterLesen, eurostatGeladenSatz,
  eurostatHinweisSatz, eurostatLesen, eurostatNachtragSatz, eurostatQuelle, eurostatQuelleLesen, eurostatQuelleZeilen, eurostatSprache, eurostatTabelle, eurostatZeitDatum, eurostatZeitAlsDatum, eurostatZeitSatz, type EurostatFehler, type EurostatTabelle
} from './eurostat';
import { protokollAnhang, protokollCsv, quellenZeilen } from './protokollsaetze';
import { projektAlsDatei, leseProjektdatei } from './projektdatei';
import type { Projekt } from './ablage';

const lies = (n: string) => readFileSync(new URL(`./testdaten/${n}`, import.meta.url), 'utf8');
const ECHT = lies('eurostat-une-rt-m.json'), LUECKEN = JSON.parse(lies('eurostat-luecken.json')) as Record<string, unknown> & { erwartet: { wert: number | null; status: string; [k: string]: unknown }[] };
const sprache = s.einst.sprache;

/* Das Netz ist für diese Datei gesperrt: Jeder Aufruf von fetch, XMLHttpRequest oder WebSocket ist ein Fehler. */
const falle = vi.fn(() => { throw new Error('Netzzugriff im Test'); });
beforeEach(() => { falle.mockClear(); vi.stubGlobal('fetch', falle); });
afterEach(() => { vi.unstubAllGlobals(); s.einst.sprache = sprache; vi.useRealTimers(); });

/** Eine Zeile CSV mit Anführungszeichen (so schreibt R `write.csv`). */
const csvZeile = (z: string): string[] => {
  const aus: string[] = []; let f = '', zit = false;
  for (let i = 0; i <= z.length; i++) {
    const c = z[i];
    if (zit) { if (c === '"' && z[i + 1] === '"') { f += '"'; i++; } else if (c === '"') zit = false; else f += c; }
    else if (c === '"') zit = true; else if (c === ',' || c === undefined) { aus.push(f); f = ''; } else f += c;
  }
  return aus;
};

const gut = (j: unknown) => { const r = eurostatLesen(j); if (!r.ok) throw new Error(`Lesen: ${r.fehler}`); return r.daten; };
/** Eine kleine, gültige Antwort als Ausgangspunkt für die Fälle mit Fehlern. */
const grundfall = (): Record<string, unknown> => JSON.parse(JSON.stringify({
  version: '2.0', class: 'dataset', label: 'Test', source: 'ESTAT', updated: '2026-10-30T11:00:00+0100', id: ['geo', 'time'], size: [2, 2],
  dimension: { geo: { label: 'Land', category: { index: { AT: 0, DE: 1 }, label: { AT: 'Österreich', DE: 'Deutschland' } } }, time: { label: 'Zeit', category: { index: { '2021': 0, '2022': 1 } } } },
  value: { '0': 1, '3': 4 }
}));
const mit = (f: (o: Record<string, any>) => void) => { const o = grundfall(); f(o); return o; };   // eslint-disable-line @typescript-eslint/no-explicit-any

describe('Sollwert: echte Antwort (Arbeitslosenquote, 24 Werte) gegen die in R gelesene Tabelle', () => {
  const daten = gut(ECHT);
  const soll = lies('eurostat-une-rt-m-erwartet.csv').trim().split(/\r?\n/).map(csvZeile);
  it('Kopf, Zahl der Zeilen und jede Zeile (Codes, Wert, Status) stimmen', () => {
    const t = eurostatTabelle(daten, false);
    expect(t.kopf).toEqual(soll[0]);
    expect(t.zeilen).toHaveLength(soll.length - 1);
    const kopf = soll[0]!;
    soll.slice(1).forEach((z, i) => {
      const w = z[kopf.indexOf('wert')]!;
      expect(t.zeilen[i]!.slice(0, -2), `Zeile ${i + 1}: Codes`).toEqual(z.slice(0, kopf.indexOf('wert')));
      expect(t.zeilen[i]![kopf.indexOf('wert')], `Zeile ${i + 1}: Wert`).toBe(w === '' ? null : Number(w));
      expect(t.zeilen[i]![kopf.indexOf('status')], `Zeile ${i + 1}: Status`).toBe(z[kopf.indexOf('status')]);
    });
  });
  it('Dimensionen mit einer einzigen Kategorie bleiben als Spalte; Länder stehen in der Reihenfolge der Position (DE vor AT)', () => {
    const t = eurostatTabelle(daten, false);
    expect(t.kopf).toEqual(['freq', 's_adj', 'age', 'unit', 'sex', 'geo', 'time', 'wert', 'status']);
    expect(t.zeilen[0]![5]).toBe('DE'); expect(t.zeilen[12]![5]).toBe('AT');
  });
  it('Quelle: Beschriftung und Stand aus der Antwort; nichts leer, nichts vorläufig', () => {
    expect(daten.updated).toBe('2026-10-30T11:00:00+0100');
    expect(daten.leer).toBe(0); expect(daten.vorlaeufig).toBe(0);
    expect(daten.dimensionen.find(d => d.id === 'geo')!.labels).toEqual(['Deutschland', 'Österreich']);
  });
  it('die Datei wird nicht verändert gelesen: der Wert 5.0 ist 5', () => { expect(eurostatTabelle(daten, false).zeilen[14]![7]).toBe(5); });
});

describe('Sollwert: Handfall mit vertauschtem Index, Wert 0, Lücken und Status', () => {
  it('jede erwartete Zeile stimmt, in der Reihenfolge der laufenden Position', () => {
    const daten = gut(LUECKEN);
    const t = eurostatTabelle(daten, false);
    expect(t.zeilen).toHaveLength(LUECKEN.erwartet.length);
    LUECKEN.erwartet.forEach((e, i) => {
      expect(t.zeilen[i], `Zeile ${i + 1}`).toEqual([e.freq, e.geo, e.time, e.wert, e.status]);
    });
  });
  it('der Index ist die Position, nicht die Reihenfolge im Objekt (AT steht vorn im Objekt, hat aber Position 1)', () => {
    const geo = gut(LUECKEN).dimensionen[1]!;
    expect(Object.keys((LUECKEN.dimension as any).geo.category.index)).toEqual(['AT', 'DE']);   // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(geo.codes).toEqual(['DE', 'AT']);
  });
  it('Wert 0 bleibt 0, ein fehlender Wert bleibt leer (null), nie 0 und nie aufgefüllt', () => {
    const z = gut(LUECKEN).zeilen;
    expect(z[3]!.wert).toBe(0);
    expect(z[1]!.wert).toBeNull(); expect(z[4]!.wert).toBeNull();
    expect(z.filter(x => x.wert === 0)).toHaveLength(1);
  });
  it('Status „:“ und „c“ ohne Wert bleiben leer; „p“ zählt als vorläufig; der Satz nennt beide Zahlen', () => {
    const d = gut(LUECKEN);
    expect(d.leer).toBe(2); expect(d.vorlaeufig).toBe(1);
    expect(d.zeilen.map(x => x.status)).toEqual(['', ':', 'p', '', 'c', '']);
    s.einst.sprache = 'de'; expect(eurostatGeladenSatz(d)).toContain('6 Zeilen, davon 2 ohne Wert und 1 mit vorläufigem Wert');
    s.einst.sprache = 'en'; expect(eurostatGeladenSatz(d)).toContain('6 rows, of which 2 without a value and 1 with a provisional value');
  });
  it('mit Beschriftungen: zusätzliche Spalten hinter dem Code', () => {
    const t = eurostatTabelle(gut(LUECKEN), true);
    expect(t.kopf).toEqual(['freq', 'freq_text', 'geo', 'geo_text', 'time', 'time_text', 'wert', 'status']);
    expect(t.zeilen[0]).toEqual(['A', 'Jährlich', 'DE', 'Deutschland', '2021', '2021', 10.5, '']);
    expect(t.zeilen[3]!.slice(2, 4)).toEqual(['AT', 'Österreich']);
  });
});

describe('Lesen: fremde Eingabe wird geprüft', () => {
  const fehler = (j: unknown) => { const r = eurostatLesen(j); return r.ok ? 'ok' : r.fehler; };
  it('der Grundfall liest', () => { expect(gut(grundfall()).zeilen.map(z => z.wert)).toEqual([1, null, null, 4]); });
  it('kein JSON, kein Objekt, falsche Version oder Klasse', () => {
    expect(fehler('{')).toBe('kein-json'); expect(fehler('')).toBe('kein-json');
    for (const x of [null, 5, [], true]) expect(fehler(x), JSON.stringify(x)).toBe('form');
    expect(fehler('text')).toBe('kein-json');
    expect(fehler(mit(o => { o.version = '1.0'; }))).toBe('form'); expect(fehler(mit(o => { o.class = 'collection'; }))).toBe('form'); expect(fehler(mit(o => { delete o.version; }))).toBe('form');
  });
  it('Fehlerhinweis von Eurostat: eigener Satz, der Text daraus wird nicht übernommen', () => {
    expect(fehler({ error: [{ status: 413, label: 'Too big, <script>alert(1)</script>' }] })).toBe('abfrage');
    s.einst.sprache = 'de'; expect(eurostatFehlerSatz('abfrage')).not.toContain('script');
  });
  it('falsche Größen: Länge von size ≠ id, Null, negativ, Bruch, Text, zu viele Dimensionen', () => {
    expect(fehler(mit(o => { o.size = [2]; }))).toBe('form');
    for (const g of [0, -1, 1.5, '2', null, Number.NaN]) expect(fehler(mit(o => { o.size = [g, 2]; })), String(g)).toBe('form');
    expect(fehler(mit(o => { o.id = []; o.size = []; }))).toBe('form');
    expect(fehler(mit(o => { o.id = Array.from({ length: 31 }, (_, i) => `d${i}`); o.size = Array(31).fill(1); }))).toBe('form');
  });
  it('Grenze: das Produkt von size gegen 1 Million Zeilen', () => {
    expect(fehler(mit(o => { o.size = [1000, 1001]; }))).toBe('zu-viele-zeilen');
    expect(fehler(mit(o => { o.size = [1e9, 1e9]; }))).toBe('zu-viele-zeilen');
    expect(fehler(mit(o => { o.size = [Number.MAX_SAFE_INTEGER, 2]; }))).toBe('zu-viele-zeilen');
    expect(EUROSTAT_MAX_ZEILEN).toBe(1_000_000);
  });
  it('Dimensionen: Namen nach Muster, doppelte Namen, fehlende Dimension, falscher Typ', () => {
    for (const n of ['a b', 'a-b', 'ä', 'a'.repeat(41), '']) expect(fehler(mit(o => { o.id = ['geo', n]; })), n).toBe('form');
    expect(fehler(mit(o => { o.id = ['geo', 'geo']; }))).toBe('form');
    expect(fehler(mit(o => { delete o.dimension.time; }))).toBe('form');
    expect(fehler(mit(o => { o.dimension.geo = 'AT'; }))).toBe('form'); expect(fehler(mit(o => { o.dimension.geo.category = []; }))).toBe('form');
  });
  it('Kategorien: Position außerhalb, doppelt, nicht ganzzahlig, falsche Zahl, leerer oder zu langer Code', () => {
    expect(fehler(mit(o => { o.dimension.geo.category.index = { AT: 0, DE: 2 }; }))).toBe('form');
    expect(fehler(mit(o => { o.dimension.geo.category.index = { AT: 0, DE: 0 }; }))).toBe('form');
    expect(fehler(mit(o => { o.dimension.geo.category.index = { AT: 0, DE: 0.5 }; }))).toBe('form');
    expect(fehler(mit(o => { o.dimension.geo.category.index = { AT: 0 }; }))).toBe('form');
    expect(fehler(mit(o => { o.dimension.geo.category.index = { AT: 0, DE: 1, FR: 2 }; }))).toBe('form');
    expect(fehler(mit(o => { o.dimension.geo.category.index = { '': 0, DE: 1 }; }))).toBe('form');
    expect(fehler(mit(o => { o.dimension.geo.category.index = { ['x'.repeat(101)]: 0, DE: 1 }; }))).toBe('form');
    expect(fehler(mit(o => { o.dimension.geo.category.index = { 'A\nT': 0, DE: 1 }; }))).toBe('form');
    expect(fehler(mit(o => { o.dimension.geo.category.index = 5; }))).toBe('form');
  });
  it('Index als Liste (JSON-stat erlaubt das) und bei einer einzigen Kategorie ohne Index', () => {
    const l = gut(mit(o => { o.dimension.geo.category.index = ['DE', 'AT']; }));
    expect(l.dimensionen[0]!.codes).toEqual(['DE', 'AT']);
    expect(fehler(mit(o => { o.dimension.geo.category.index = ['DE', 'DE']; }))).toBe('form');
    const eins = gut(mit(o => { o.id = ['geo']; o.size = [1]; o.dimension = { geo: { label: 'Land', category: { label: { AT: 'Österreich' } } } }; o.value = { '0': 3 }; }));
    expect(eins.zeilen).toEqual([{ codes: ['AT'], wert: 3, status: '' }]);
  });
  it('value: Schlüssel nur kanonische Positionen im Bereich, nur endliche Zahlen oder null; als Liste höchstens so lang wie das Produkt', () => {
    for (const k of ['4', '-1', '01', '1.5', '1e1', 'a', '', ' 1', '99999999']) expect(fehler(mit(o => { o.value = { [k]: 1 }; })), k).toBe('form');
    for (const v of ['1', true, {}, [], Number.NaN]) expect(fehler(mit(o => { o.value = { '0': v }; })), JSON.stringify(v)).toBe('form');
    expect(fehler(mit(o => { o.value = { '0': null }; }))).toBe('ok');
    expect(gut(mit(o => { o.value = [1, null, 0, 4]; })).zeilen.map(z => z.wert)).toEqual([1, null, 0, 4]);
    expect(fehler(mit(o => { o.value = [1, 2, 3, 4, 5]; }))).toBe('form'); expect(fehler(mit(o => { o.value = 7; }))).toBe('form');
    expect(fehler(mit(o => { delete o.value; }))).toBe('ok');   // gar keine Werte: alle Zeilen leer, nichts erfunden
    expect(gut(mit(o => { delete o.value; })).zeilen.every(z => z.wert === null)).toBe(true);
  });
  it('status: Text bis 20 Zeichen, als Objekt, Liste oder ein Text für alle; sonst Fehler', () => {
    expect(gut(mit(o => { o.status = { '1': ':' }; })).zeilen[1]!.status).toBe(':');
    expect(gut(mit(o => { o.status = [null, 'p']; })).zeilen[1]!.status).toBe('p');
    expect(gut(mit(o => { o.status = 'e'; })).zeilen.every(z => z.status === 'e')).toBe(true);
    for (const v of [5, 'x'.repeat(21), '\u0000', {}]) expect(fehler(mit(o => { o.status = { '0': v }; })), JSON.stringify(v)).toBe('form');
    expect(fehler(mit(o => { o.status = { '9': 'p' }; }))).toBe('form'); expect(fehler(mit(o => { o.status = 5; }))).toBe('form');
  });
  it('Texte aus der Antwort sind Daten: Steuer- und Richtungszeichen fallen weg, lange Texte werden gekürzt', () => {
    const d = gut(mit(o => { o.label = 'A\u202eB\nC'; o.updated = `2026${'x'.repeat(100)}`; o.dimension.geo.label = 'L'.repeat(500); o.dimension.geo.category.label.AT = '=1+1\u0000'; }));
    expect(d.label).toBe('A B C'); expect(d.updated).toHaveLength(40); expect(d.dimensionen[0]!.label).toHaveLength(200); expect(d.dimensionen[0]!.labels[0]).toBe('=1+1');
    expect(gut(mit(o => { o.label = 5; o.updated = { a: 1 }; })).label).toBe('');
  });
  it('Schlüssel wie __proto__, constructor, toString: nur Daten, nichts wird geerbt oder verändert', () => {
    // Als Dimension: __proto__ passt zum Muster, steht aber nicht in `dimension` → Fehler, kein Zugriff auf Object.prototype
    expect(fehler(mit(o => { o.id = ['__proto__', 'time']; }))).toBe('form');
    expect(fehler(mit(o => { o.id = ['constructor', 'time']; }))).toBe('form');
    expect(fehler(mit(o => { o.id = ['toString', 'time']; }))).toBe('form');
    // Als eigene Dimension aus JSON: gilt wie jede andere
    const roh = '{"version":"2.0","class":"dataset","id":["__proto__","constructor"],"size":[2,1],"dimension":{"__proto__":{"label":"P","category":{"index":{"__proto__":0,"constructor":1},"label":{"__proto__":"Proto","constructor":"Ctor"}}},"constructor":{"label":"C","category":{"index":{"toString":0}}}},"value":{"1":7,"__proto__":9}}';
    expect(fehler(roh)).toBe('form');   // value "__proto__" ist keine Position
    const ohneWert = roh.replace(',"__proto__":9', '');
    const d = gut(ohneWert);
    expect(d.dimensionen[0]!.codes).toEqual(['__proto__', 'constructor']); expect(d.dimensionen[0]!.labels).toEqual(['Proto', 'Ctor']);
    expect(d.zeilen.map(z => z.wert)).toEqual([null, 7]);
    expect(({} as Record<string, unknown>).label).toBeUndefined(); expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'label')).toBe(false);
    // Auch ein gelesenes Objekt mit eigenem __proto__ (JSON.parse) bleibt unschädlich
    const status = JSON.parse('{"__proto__":"p"}') as unknown;
    expect(fehler(mit(o => { o.status = status; }))).toBe('form');
  });
  it('Codes und Beschriftungen, die wie Formeln oder Befehle aussehen, bleiben Text', () => {
    const d = gut(mit(o => { o.dimension.geo.category.index = { '=cmd|x': 0, "'); system('x'); ('": 1 }; }));
    expect(d.zeilen[0]!.codes[0]).toBe('=cmd|x');
  });
  it('schreibt nichts in Object.prototype und ruft das Netz nicht ab', () => {
    gut(JSON.parse(ECHT)); gut(LUECKEN);
    expect(falle).not.toHaveBeenCalled();
    expect(Object.keys(Object.prototype)).toEqual([]);
  });
});

describe('Adresse: nur die eine feste Adresse', () => {
  const ok = (a: Parameters<typeof eurostatAdresse>[0]) => { const r = eurostatAdresse(a); if (!r.ok) throw new Error(r.fehler); return r.adresse; };
  const nein = (a: Parameters<typeof eurostatAdresse>[0]) => { const r = eurostatAdresse(a); return r.ok ? 'ok' : r.fehler; };
  it('Aufbau wie im Fachblatt: Code, format=JSON, lang, Filter, Zeitraum', () => {
    const a = ok({ code: 'une_rt_m', filter: [{ dimension: 's_adj', werte: ['SA'] }, { dimension: 'geo', werte: ['DE', 'AT'] }], seit: '2024-01', bis: '2024-12', sprache: 'de' });
    expect(a).toBe(`${EUROSTAT_BASIS}une_rt_m?format=JSON&lang=DE&s_adj=SA&geo=DE&geo=AT&sinceTimePeriod=2024-01&untilTimePeriod=2024-12`);
    expect(a.startsWith('https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/')).toBe(true);
    expect(eurostatAdresseOk(a)).toBe(true);
  });
  it('lang: DE, EN oder FR je nach Sprache der App, sonst EN', () => {
    expect([eurostatSprache('de'), eurostatSprache('en'), eurostatSprache('fr'), eurostatSprache('es'), eurostatSprache('xx'), eurostatSprache('')]).toEqual(['DE', 'EN', 'FR', 'EN', 'EN', 'EN']);
    expect(ok({ code: 'x', filter: [], sprache: 'fr' })).toContain('lang=FR'); expect(ok({ code: 'x', filter: [] })).toContain('lang=EN');
  });
  it('Code nach Muster ^[A-Za-z0-9_]{1,40}$', () => {
    for (const c of ['', 'a/b', '../x', 'a b', 'a?b=c', 'a#b', 'a.b', 'ä', 'a%2F', 'a'.repeat(41), 'x\ny']) expect(nein({ code: c, filter: [] }), JSON.stringify(c)).toBe('code');
    expect(nein({ code: 'a'.repeat(40), filter: [] })).toBe('ok'); expect(nein({ code: 'A_1', filter: [] })).toBe('ok');
    expect(nein({ code: 5 as unknown as string, filter: [] })).toBe('code');
  });
  it('Namen der Filter nach Muster; reservierte und doppelte Namen sind Fehler', () => {
    for (const d of ['', 'a b', 'a=b', 'a&b', 'geo;x', 'a'.repeat(41)]) expect(nein({ code: 'x', filter: [{ dimension: d, werte: ['A'] }] }), d).toBe('dimension');
    for (const d of ['format', 'lang', 'sinceTimePeriod', 'UntilTimePeriod']) expect(nein({ code: 'x', filter: [{ dimension: d, werte: ['A'] }] }), d).toBe('doppelt');
    expect(nein({ code: 'x', filter: [{ dimension: 'geo', werte: ['A'] }, { dimension: 'GEO', werte: ['B'] }] })).toBe('doppelt');
  });
  it('Werte laufen durch encodeURIComponent: nichts kann einen neuen Parameter, einen Pfad oder eine andere Adresse einschleusen', () => {
    const a = ok({ code: 'x', filter: [{ dimension: 'geo', werte: ['A&lang=EN', 'B#x', 'C/../D', 'Ä ö', 'E?F', '100%'] }] });
    expect(a).toBe(`${EUROSTAT_BASIS}x?format=JSON&lang=EN&geo=A%26lang%3DEN&geo=B%23x&geo=C%2F..%2FD&geo=%C3%84%20%C3%B6&geo=E%3FF&geo=100%25`);
    expect(new URL(a).searchParams.getAll('lang')).toEqual(['EN']); expect(new URL(a).hash).toBe(''); expect(new URL(a).origin).toBe('https://ec.europa.eu');
    expect(ok({ code: 'x', filter: [{ dimension: 'geo', werte: ['Y15-74'] }] })).toContain('geo=Y15-74');
  });
  it('Werte: nicht leer, höchstens 60 Zeichen, keine Steuerzeichen, kein Leerraum am Rand; Zahl der Filter und Werte begrenzt', () => {
    for (const w of ['', ' A', 'A ', 'x'.repeat(61), 'A\nB', 'A\u0000', 'A\u202eB']) expect(nein({ code: 'x', filter: [{ dimension: 'geo', werte: [w] }] }), JSON.stringify(w)).toBe('wert');
    expect(nein({ code: 'x', filter: [{ dimension: 'geo', werte: [] }] })).toBe('wert');
    expect(nein({ code: 'x', filter: [{ dimension: 'geo', werte: Array.from({ length: 201 }, (_, i) => `W${i}`) }] })).toBe('wert');
    expect(nein({ code: 'x', filter: Array.from({ length: 21 }, (_, i) => ({ dimension: `d${i}`, werte: ['A'] })) })).toBe('zahl');
    expect(nein({ code: 'x', filter: Array.from({ length: 20 }, (_, i) => ({ dimension: `d${i}`, werte: Array.from({ length: 200 }, (_, k) => `${'W'.repeat(40)}${k}`) })) })).toBe('zahl');   // zu lange Adresse
  });
  it('Zeitraum: 2020, 2020-01, 2020-Q1, 2020-S2, 2020-W05, 2020-01-31; sonst Fehler', () => {
    for (const z of ['2020', '2020-01', '2020-Q1', '2020-S2', '2020-W05', '2020-01-31']) expect(ok({ code: 'x', filter: [], seit: z })).toContain(`sinceTimePeriod=${z}`);
    for (const z of ['20', '2020-13x', 'heute', '2020&x=1', '2020-Q5', '../2020']) expect(nein({ code: 'x', filter: [], bis: z }), z).toBe('zeit');
    expect(ok({ code: 'x', filter: [], seit: '', bis: '' })).not.toContain('TimePeriod');
  });
  it('eurostatAdresseOk: nur https, Host ec.europa.eu, Pfad unter der Basis, keine Zugangsdaten, kein Anker', () => {
    const b = EUROSTAT_BASIS;
    expect(eurostatAdresseOk(`${b}x?format=JSON`)).toBe(true);
    for (const a of ['http://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/x', 'https://ec.europa.eu.evil.example/eurostat/api/dissemination/statistics/1.0/data/x',
      'https://ec.europa.eu@evil.example/eurostat/api/dissemination/statistics/1.0/data/x', 'https://evil.example/https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/x',
      'https://ec.europa.eu/eurostat/api/other', `${b}x#anker`, 'https://user:pw@ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/x', '', 'ftp://ec.europa.eu/']) expect(eurostatAdresseOk(a), a).toBe(false);
    expect(eurostatAdresseOk(5 as unknown as string)).toBe(false); expect(eurostatAdresseOk(`${b}x/../../../other`)).toBe(false);
  });
  it('Filter eingeben wie bei Eurostat: Name = Wert, Wert', () => {
    expect(eurostatFilterLesen('geo = AT, DE\n\n s_adj=SA \r\nunit = PC_ACT')).toEqual({ ok: true, filter: [{ dimension: 'geo', werte: ['AT', 'DE'] }, { dimension: 's_adj', werte: ['SA'] }, { dimension: 'unit', werte: ['PC_ACT'] }] });
    expect(eurostatFilterLesen('')).toEqual({ ok: true, filter: [] });
    expect(eurostatFilterLesen('geo AT')).toEqual({ ok: false, fehler: 'zeile' }); expect(eurostatFilterLesen('= AT')).toEqual({ ok: false, fehler: 'zeile' });
    expect(eurostatFilterLesen('geo =')).toEqual({ ok: false, fehler: 'wert' }); expect(eurostatFilterLesen('geo = ,')).toEqual({ ok: false, fehler: 'wert' });
    expect(nein2('geo = A=B')).toBe('ok');
    function nein2(t: string) { const f = eurostatFilterLesen(t); if (!f.ok) return f.fehler; const r = eurostatAdresse({ code: 'x', filter: f.filter }); return r.ok ? 'ok' : r.fehler; }
  });
});

describe('Abruf: mit einem falschen fetch, nie mit dem Netz', () => {
  const adresse = `${EUROSTAT_BASIS}une_rt_m?format=JSON&lang=DE`;
  const antwort = (text: string, init: ResponseInit = {}) => new Response(text, { status: 200, ...init });
  const mitFetch = (f: (u: string, i: RequestInit) => Promise<Response> | Response) => vi.fn(async (u: unknown, i?: RequestInit) => f(String(u), i ?? {}));
  it('sendet genau diese Adresse als GET, ohne Cookies, ohne Referrer, ohne Inhalt, ohne Weiterleitung', async () => {
    const f = mitFetch(() => antwort(ECHT));
    const r = await eurostatAbrufen(adresse, { fetchFn: f as unknown as typeof fetch });
    expect(r.ok).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
    const [u, i] = f.mock.calls[0]! as [string, RequestInit];
    expect(u).toBe(adresse);
    expect(i).toMatchObject({ method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store' });
    expect(i.body).toBeUndefined();
    expect(Object.keys(i.headers as object)).toEqual(['Accept']);
    expect(falle).not.toHaveBeenCalled();
    if (r.ok) { expect(r.bytes.byteLength).toBe(new TextEncoder().encode(ECHT).byteLength); expect(eurostatLesen(r.text).ok).toBe(true); }
  });
  it('eine andere Adresse wird nicht abgerufen', async () => {
    const f = mitFetch(() => antwort('{}'));
    for (const a of ['https://example.org/x', 'http://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/x', `${EUROSTAT_BASIS}x#a`, '']) {
      expect(await eurostatAbrufen(a, { fetchFn: f as unknown as typeof fetch }), a).toEqual({ ok: false, fehler: 'adresse' });
    }
    expect(f).not.toHaveBeenCalled(); expect(falle).not.toHaveBeenCalled();
  });
  it('HTTP-Fehler: 404, 4xx, 429 und 5xx', async () => {
    const f = (status: number) => eurostatAbrufen(adresse, { fetchFn: mitFetch(() => antwort('Fehler', { status })) as unknown as typeof fetch });
    expect(await f(404)).toEqual({ ok: false, fehler: 'nicht-gefunden' });
    for (const st of [400, 413, 416]) expect(await f(st), String(st)).toEqual({ ok: false, fehler: 'abfrage' });
    for (const st of [429, 500, 502, 503]) expect(await f(st), String(st)).toEqual({ ok: false, fehler: 'dienst' });
  });
  it('Netzfehler: Satz, kein Absturz', async () => {
    const r = await eurostatAbrufen(adresse, { fetchFn: mitFetch(() => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch });
    expect(r).toEqual({ ok: false, fehler: 'netz' });
    s.einst.sprache = 'de'; expect(eurostatFehlerSatz('netz')).toMatch(/Verbindung zu Eurostat/);
  });
  it('Weiterleitung: wird nicht akzeptiert (auch wenn der Browser sie meldet)', async () => {
    const umgeleitet = Object.defineProperty(antwort(ECHT), 'redirected', { value: true });
    expect(await eurostatAbrufen(adresse, { fetchFn: mitFetch(() => umgeleitet) as unknown as typeof fetch })).toEqual({ ok: false, fehler: 'umleitung' });
    const fremd = Object.defineProperty(antwort(ECHT), 'url', { value: 'https://evil.example/x' });
    expect(await eurostatAbrufen(adresse, { fetchFn: mitFetch(() => fremd) as unknown as typeof fetch })).toEqual({ ok: false, fehler: 'umleitung' });
  });
  it('Grenze 20 MB: nach Content-Length und beim Lesen', async () => {
    expect(EUROSTAT_MAX_BYTES).toBe(20 * 1024 * 1024);
    const gross = antwort('x', { headers: { 'content-length': String(EUROSTAT_MAX_BYTES + 1) } });
    expect(await eurostatAbrufen(adresse, { fetchFn: mitFetch(() => gross) as unknown as typeof fetch })).toEqual({ ok: false, fehler: 'zu-gross' });
    // ohne Längenangabe: der Strom wird beim Lesen abgebrochen
    let gelesen = 0, abgebrochen = false;
    const strom = new ReadableStream<Uint8Array>({ pull(c) { gelesen += 1024 * 1024; c.enqueue(new Uint8Array(1024 * 1024)); }, cancel() { abgebrochen = true; } });
    const r = await eurostatAbrufen(adresse, { fetchFn: mitFetch(() => new Response(strom, { status: 200 })) as unknown as typeof fetch });
    expect(r).toEqual({ ok: false, fehler: 'zu-gross' }); expect(abgebrochen).toBe(true); expect(gelesen).toBeLessThanOrEqual(EUROSTAT_MAX_BYTES + 4 * 1024 * 1024);
    // genau an der Grenze geht
    const knapp = await eurostatAbrufen(adresse, { fetchFn: mitFetch(() => new Response(new Uint8Array(EUROSTAT_MAX_BYTES), { status: 200 })) as unknown as typeof fetch });
    expect(knapp.ok).toBe(true);
  });
  it('Zeitüberschreitung: nach der eingestellten Zeit wird abgebrochen (60 s im Betrieb)', async () => {
    vi.useFakeTimers();
    const haengt = mitFetch((_u, i) => new Promise<Response>((_res, rej) => { i.signal!.addEventListener('abort', () => rej(new DOMException('abgebrochen', 'AbortError'))); }));
    const p = eurostatAbrufen(adresse, { fetchFn: haengt as unknown as typeof fetch });
    await vi.advanceTimersByTimeAsync(59_999);
    let fertig = false; void p.then(() => { fertig = true; });
    await Promise.resolve(); expect(fertig).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(await p).toEqual({ ok: false, fehler: 'zeitlimit' });
  });
  it('Abbrechen durch die Person', async () => {
    const ac = new AbortController();
    const haengt = mitFetch((_u, i) => new Promise<Response>((_res, rej) => { i.signal!.addEventListener('abort', () => rej(new DOMException('abgebrochen', 'AbortError'))); }));
    const p = eurostatAbrufen(adresse, { fetchFn: haengt as unknown as typeof fetch, signal: ac.signal });
    ac.abort();
    expect(await p).toEqual({ ok: false, fehler: 'abgebrochen' });
    const schon = new AbortController(); schon.abort();
    expect(await eurostatAbrufen(adresse, { fetchFn: haengt as unknown as typeof fetch, signal: schon.signal })).toEqual({ ok: false, fehler: 'abgebrochen' });
  });
  it('jeder Fehler hat einen Satz in Deutsch und Englisch, ohne Text aus der Antwort', () => {
    const alle: EurostatFehler[] = ['code', 'dimension', 'wert', 'zeit', 'zahl', 'doppelt', 'zeile', 'netz', 'zeitlimit', 'abgebrochen', 'umleitung', 'nicht-gefunden', 'abfrage', 'dienst', 'zu-gross', 'adresse', 'kein-json', 'form', 'zu-viele-zeilen', 'leer'];
    for (const sp of ['de', 'en'] as const) { s.einst.sprache = sp; for (const f of alle) { const t = eurostatFehlerSatz(f); expect(t.length, f).toBeGreaterThan(20); expect(t).not.toMatch(/undefined|\$\{/); } }
  });
});

describe('Quelle an den Daten, im Protokoll und im Bericht', () => {
  const daten = gut(ECHT);
  const abfrage = { code: 'une_rt_m', filter: [{ dimension: 'geo', werte: ['DE', 'AT'] }], sprache: 'de' };
  const adresse = (() => { const r = eurostatAdresse(abfrage); if (!r.ok) throw new Error('x'); return r.adresse; })();
  const q = eurostatQuelle(abfrage, adresse, daten, new Date('2026-10-31T12:00:00Z'));
  it('Datensatz, Abrufdatum, updated und genaue Abfrage', () => {
    expect(q).toEqual({ datensatz: 'une_rt_m', abruf: '2026-10-31', aktualisiert: '2026-10-30T11:00:00+0100', adresse });
    s.einst.sprache = 'de';
    const z = eurostatQuelleZeilen(q);
    expect(z[0]).toBe('Quelle: Eurostat, Datensatz une_rt_m.'); expect(z[1]).toBe('Abgerufen am 2026-10-31.'); expect(z[2]).toContain('2026-10-30T11:00:00+0100'); expect(z[3]).toBe(`Abfrage: ${adresse}`);
    s.einst.sprache = 'en'; expect(eurostatQuelleZeilen(q)[0]).toBe('Source: Eurostat, dataset une_rt_m.');
  });
  it('ohne updated sagt der Satz das, statt etwas zu erfinden', () => {
    s.einst.sprache = 'de'; expect(eurostatQuelleZeilen({ ...q, aktualisiert: '' })[2]).toContain('keinen Stand');
  });
  it('Protokoll (Anhang für den Bericht und CSV) enthält Quelle, Abfrage und die Warnung zum nachträglichen Ändern', () => {
    s.einst.sprache = 'de';
    const datei = { name: 'Eurostat une_rt_m', sha256: 'a'.repeat(64), eurostat: q };
    const a = protokollAnhang([], datei);
    const text = a.zeilen.map(z => z.join(' | ')).join('\n');
    expect(text).toContain('Quelle: Eurostat, Datensatz une_rt_m.'); expect(text).toContain(adresse); expect(text).toContain('Eurostat kann Daten nachträglich ändern'); expect(text).toContain('a'.repeat(64));
    for (const z of a.zeilen) expect(z).toHaveLength(a.kopf.length);
    const csv = protokollCsv([], datei);
    expect(csv).toContain('Quelle: Eurostat, Datensatz une_rt_m.'); expect(csv).toContain(adresse);
    expect(quellenZeilen({ name: 'x.csv', sha256: null })).toEqual([]);
    expect(protokollAnhang([], { name: 'x.csv', sha256: null }).zeilen).toHaveLength(1);
    expect(protokollCsv([]).trim().split('\r\n')).toHaveLength(1);
  });
  it('Projektdatei: die Quelle bleibt erhalten; was nicht zur festen Adresse passt, wird verworfen', () => {
    const p: Projekt = { name: 'Eurostat une_rt_m', quelle: 'Eurostat', sav: new Uint8Array([1, 2, 3]), blaetter: [], entscheid: {}, zeit: 1, datei: { name: 'Eurostat une_rt_m', sha256: 'b'.repeat(64), eurostat: q } } as unknown as Projekt;
    const zurueck = leseProjektdatei(projektAlsDatei(p));
    expect(zurueck.datei).toEqual({ name: 'Eurostat une_rt_m', sha256: 'b'.repeat(64), eurostat: q });
    const fremd = JSON.parse(new TextDecoder().decode(projektAlsDatei(p))); fremd.datei.eurostat.adresse = 'https://evil.example/x';
    expect(leseProjektdatei(new TextEncoder().encode(JSON.stringify(fremd))).datei).toEqual({ name: 'Eurostat une_rt_m', sha256: 'b'.repeat(64) });
  });
  it('eurostatQuelleLesen: Muster für Datensatz und Datum, __proto__ wird nicht gelesen', () => {
    expect(eurostatQuelleLesen(q)).toEqual(q);
    for (const x of [null, 5, [], { ...q, datensatz: 'a b' }, { ...q, abruf: '31.10.2026' }, { ...q, adresse: 'https://ec.europa.eu/x' }, { ...q, adresse: 5 }, { datensatz: 'x' }]) expect(eurostatQuelleLesen(x), JSON.stringify(x)).toBeUndefined();
    expect(eurostatQuelleLesen({ ...q, aktualisiert: 'x\u202ey'.repeat(30) })!.aktualisiert.length).toBeLessThanOrEqual(40);
    expect(eurostatQuelleLesen(JSON.parse('{"__proto__":{"datensatz":"x"}}'))).toBeUndefined();
  });
  it('Warnung und Hinweis vor dem Klick', () => {
    s.einst.sprache = 'de';
    expect(eurostatNachtragSatz()).toContain('Abrufdatum gehört zum Ergebnis');
    expect(eurostatHinweisSatz()).toMatch(/Europäische Kommission/); expect(eurostatHinweisSatz()).toMatch(/IP-Adresse/); expect(eurostatHinweisSatz()).toMatch(/nicht gesendet/);
    s.einst.sprache = 'en'; expect(eurostatHinweisSatz()).toMatch(/European Commission/); expect(eurostatHinweisSatz()).toMatch(/IP address/);
  });
});

describe('Quelltext: nur diese eine Adresse, nur auf Klick', () => {
  const SRC = join(import.meta.dirname, '..');
  const dateien = (ordner: string, aus: string[] = []): string[] => {
    for (const n of readdirSync(ordner)) { const p = join(ordner, n); if (statSync(p).isDirectory()) { if (!['node_modules', 'i18n', 'testdaten'].includes(n)) dateien(p, aus); } else if (/\.(ts|svelte)$/.test(n) && !/\.test\.ts$/.test(n)) aus.push(p); }
    return aus;
  };
  const alle = dateien(SRC).map(p => ({ p: p.slice(SRC.length + 1).split('\\').join('/'), t: readFileSync(p, 'utf8') }));
  it('die Adresse ec.europa.eu steht nur in eurostatquelle.ts (Code) und in den Texten der Seiten Datenschutz und Behörden', () => {
    const mit = alle.filter(f => f.t.includes('ec.europa.eu')).map(f => f.p).sort();
    expect(mit).toEqual(['hilfe/artikel.ts', 'lib/eurostatquelle.ts', 'lib/karte.ts', 'seiten/Rechtliches.svelte']);   // hilfe/artikel.ts: nur der Hinweis auf die Anfrage, kein Abruf   // lib/karte.ts: die Adresse gisco-services.ec.europa.eu der Grenzen (eigener Abruf, eigene Prüfung in karte.test.ts)
  });
  it('fetch wird in eurostat.ts genau einmal aufgerufen, mit credentials omit; die Oberfläche ruft kein fetch auf', () => {
    const t = alle.find(f => f.p === 'lib/eurostat.ts')!.t;
    expect((t.match(/\bf\(adresse,/g) ?? []).length).toBe(1);
    expect(t).toContain("credentials: 'omit'"); expect(t).toContain("redirect: 'error'"); expect(t).not.toMatch(/credentials:\s*'(include|same-origin)'/);
    expect(t).not.toMatch(/\bXMLHttpRequest\b|\bWebSocket\b|\bsendBeacon\b|\bEventSource\b/);
    const d = alle.find(f => f.p === 'bausteine/EurostatDialog.svelte')!.t;
    expect(d).not.toMatch(/\bfetch\s*\(/); expect(d).toContain('eurostatAbrufen');
    // nur auf Klick: der Abruf steht in einer Funktion, die vom Knopf aufgerufen wird, nicht im Aufbau der Seite
    expect(d).toMatch(/onclick=\{laden\}/); expect(d).not.toMatch(/onMount|\$effect[\s\S]{0,80}eurostatAbrufen/);
    expect(alle.filter(f => f.p !== 'lib/eurostat.ts' && f.t.includes('eurostatAbrufen')).map(f => f.p).sort()).toEqual(['bausteine/EurostatDialog.svelte']);
  });
  it('die Offline-Fassung bietet es nicht an', () => {
    const st = alle.find(f => f.p === 'seiten/Start.svelte')!.t;
    expect(st).toContain('{#if !OFFLINE}'); expect(st).toMatch(/eurostatOffen && !OFFLINE/);
  });
  it('kein Durchreich-Dienst, kein STATcube, keine frei eingebbare Adresse', () => {
    for (const f of alle.filter(x => /data\.statistik\.gv\.at|statcube/i.test(x.t))) expect(f.t, `${f.p} nennt Statistik Austria und ruft doch ab`).not.toMatch(/\bfetch\s*\(|XMLHttpRequest/);   // Beispiele nennen die Quelle, rufen aber nichts ab
    const d = alle.find(f => f.p === 'bausteine/EurostatDialog.svelte')!.t;
    expect(d).not.toMatch(/type="url"|placeholder="https?:/);
  });
});

describe('Zeitspalte als Datum (wie beim Einlesen einer CSV-Datei)', () => {
  const tab = (zeiten: string[], kopf = 'time'): EurostatTabelle => ({ kopf: ['geo', kopf, 'wert', 'status'], bezeichnungen: ['', '', '', ''], art: ['text', 'text', 'zahl', 'text'], zeilen: zeiten.map((z, i) => ['AT', z, i + 0.5, ''] as (string | number | null)[]) });
  it('Monate, Tage und Jahre: derselbe Weg wie beim Einlesen; ein Monat ist der 1. des Monats, ein Jahr der 1. Januar', () => {
    expect(eurostatZeitDatum('2024-01')).toEqual({ datum: '01.01.2024', jahr: false });
    expect(eurostatZeitDatum('1949-12')).toEqual({ datum: '01.12.1949', jahr: false });
    expect(eurostatZeitDatum('2024-01-31')).toEqual({ datum: '31.01.2024', jahr: false });
    expect(eurostatZeitDatum('2024')).toEqual({ datum: '01.01.2024', jahr: true });
    expect(eurostatZeitDatum(' 2024-03 ')).toEqual({ datum: '01.03.2024', jahr: false });
  });
  it('Quartale, Halbjahre, Wochen und Ungültiges sind kein Datum - es wird nichts geraten', () => {
    for (const nein of ['2024-Q1', '2024-S1', '2024-W05', '2024-13', '2024-00', '2024-02-30', '20240', '0999', '3001', 'abc', '', '2024-1', '24-01', '2024/01', '2024-01-31 10:00']) expect(eurostatZeitDatum(nein), nein).toBeNull();
  });
  it('echte Antwort: die Zeitspalte wird ein Datum, alles andere bleibt, die Eingabe wird nicht verändert; der Sollwert in eurostat-une-rt-m-erwartet.csv bleibt der Text', () => {
    const roh = eurostatTabelle(gut(JSON.parse(ECHT)), false);
    const vorher = JSON.stringify(roh);
    const u = eurostatZeitAlsDatum(roh);
    expect(u.ergebnis).toBe('datum'); expect(u.spalte).toBe('time'); expect(u.jahre).toBe(false);
    const i = roh.kopf.indexOf('time');
    expect(u.tab.art[i]).toBe('datum'); expect(u.tab.art.filter((_, k) => k !== i)).toEqual(roh.art.filter((_, k) => k !== i));
    expect(u.tab.zeilen.map(z => z[i]).slice(0, 3)).toEqual(['01.01.2024', '01.02.2024', '01.03.2024']);
    expect(u.tab.zeilen.map(z => z.filter((_, k) => k !== i))).toEqual(roh.zeilen.map(z => z.filter((_, k) => k !== i)));
    expect(JSON.stringify(roh)).toBe(vorher);
    const erwartet = lies('eurostat-une-rt-m-erwartet.csv').trim().split(/\r?\n/).slice(1).map(csvZeile);
    expect(roh.zeilen.map(z => String(z[i]))).toEqual(erwartet.map(z => z[i]!));
  });
  it('Jahre: Datum, mit Satz (1. Januar); Monate: Satz ohne Januar', () => {
    const j = eurostatZeitAlsDatum(tab(['2020', '2021', '2022']));
    expect(j.ergebnis).toBe('datum'); expect(j.jahre).toBe(true); expect(j.tab.zeilen.map(z => z[1])).toEqual(['01.01.2020', '01.01.2021', '01.01.2022']);
    expect(eurostatZeitSatz(j)).toContain('Ein Jahr steht als 1. Januar');
    const m = eurostatZeitAlsDatum(tab(['2020-01', '2020-02']));
    expect(eurostatZeitSatz(m)).toContain('Ein Monat steht als der 1. des Monats'); expect(eurostatZeitSatz(m)).not.toContain('Januar');
    expect(eurostatZeitAlsDatum(tab(['2020', '2021-01'])).ergebnis).toBe('datum');
  });
  it('Quartale: die Spalte bleibt Text, unverändert, mit Satz und Beispielen; so auch Halbjahre, Wochen und gemischte Angaben', () => {
    const q = tab(['2024-Q1', '2024-Q2']);
    const u = eurostatZeitAlsDatum(q);
    expect(u.ergebnis).toBe('text'); expect(u.grund).toBe('quartal'); expect(u.tab).toBe(q); expect(u.beispiele).toEqual(['2024-Q1', '2024-Q2']);
    const satz = eurostatZeitSatz(u);
    expect(satz).toContain('bleibt Text (2024-Q1, 2024-Q2)'); expect(satz).toContain('Quartale wie 2024-Q1 liest Statable nicht als Datum'); expect(satz).toContain('Wähle in Eurostat');
    expect(eurostatZeitAlsDatum(tab(['2024-S1'])).grund).toBe('halbjahr'); expect(eurostatZeitAlsDatum(tab(['2024-W05'])).grund).toBe('woche'); expect(eurostatZeitAlsDatum(tab(['x'])).grund).toBe('sonst');
    const gemischt = eurostatZeitAlsDatum(tab(['2024-01', '2024-Q1']));
    expect(gemischt.ergebnis).toBe('text'); expect(gemischt.beispiele).toEqual(['2024-Q1']);
    s.einst.sprache = 'en';
    try { expect(eurostatZeitSatz(u)).toContain('does not read quarters such as 2024-Q1 as a date'); } finally { s.einst.sprache = sprache; }
  });
  it('TIME_PERIOD heißt dieselbe Zeitspalte; ohne Zeitspalte oder mit Zahlenspalte bleibt alles, wie es ist', () => {
    expect(eurostatZeitAlsDatum(tab(['2020-01'], 'TIME_PERIOD')).ergebnis).toBe('datum');
    const ohne = eurostatZeitAlsDatum(tab(['2020-01'], 'periode'));
    expect(ohne).toMatchObject({ ergebnis: null, spalte: null }); expect(eurostatZeitSatz(ohne)).toBe('');
    const zahl: EurostatTabelle = { kopf: ['time', 'wert'], bezeichnungen: ['', ''], art: ['zahl', 'zahl'], zeilen: [[2020, 1]] };
    expect(eurostatZeitAlsDatum(zahl).ergebnis).toBeNull();
  });
  it('dreihunderttausend Zeilen: nur die verschiedenen Zeitangaben werden gelesen', () => {
    const z: (string | number | null)[][] = new Array(300_000);
    for (let i = 0; i < z.length; i++) z[i] = ['AT', `20${String(10 + (i % 10))}-${String(1 + (i % 12)).padStart(2, '0')}`, i, ''];
    const u = eurostatZeitAlsDatum({ kopf: ['geo', 'time', 'wert', 'status'], bezeichnungen: ['', '', '', ''], art: ['text', 'text', 'zahl', 'text'], zeilen: z });
    expect(u.ergebnis).toBe('datum'); expect(u.tab.zeilen).toHaveLength(300_000);
  });
});
