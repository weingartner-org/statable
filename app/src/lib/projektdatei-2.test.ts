/**
 * Paket 2A, Projektdatei Fassung 2 (ZIP): rote Tests vom Prüfer nach „Tests (für den Bau)“ in docs/erheben/ENTWURF-PROJEKTDATEI-2.md, Punkte 1 bis 5.
 * Punkt 6 (Passwort, Stufe 5) gehört nicht hierher. Punkt 2, zweiter Teil (qualitativer Teil mit Emoji im Text): FEHLT ABSICHTLICH, es gibt noch keinen Typ `QualProjekt`;
 * der Test kommt mit dem Paket der qualitativen Daten dazu.
 *
 * ===== Festlegungen für den Bauer (Datei `projektdatei.ts`) =====
 *
 * UMSTELLUNG DER SIGNATUREN (die alten Text-Signaturen fallen weg; Aufrufer und alte Tests werden umgestellt):
 *   projektAlsDatei(p: Projekt): Uint8Array                       (bisher string)
 *   leseProjektdatei(bytes: Uint8Array): Projekt                  (bisher string)
 *   leseProjektdateiMitMeldungen(bytes: Uint8Array): { projekt: Projekt; meldungen: DateiMeldung[] }   (NEU; leseProjektdatei = dasselbe ohne Meldungen)
 *   Aufrufer laut Entwurf: lib/sitzung.svelte.ts (um Zeile 973, schreibeInDatei um 1013), lib/einlesen.ts 71-72, AssistentEigenschaften.svelte, AssistentVergleichen.svelte,
 *   lib/projektlink.ts (MAX_BYTES), lib/konto/sync.ts 66/69. Die alten Tests in projektdatei.test.ts (und weitere, die `projektAlsDatei` als Text benutzen) werden mit umgestellt:
 *   `leseProjektdatei(JSON.stringify(alt))` → `leseProjektdatei(new TextEncoder().encode(JSON.stringify(alt)))`, `JSON.parse(projektAlsDatei(p))` →
 *   `JSON.parse(new TextDecoder().decode(projektAlsDatei(p)))`; erwartet bleibt dasselbe. Beim Umstellen darf kein alter Test schwächer werden.
 *   DateiMeldung = { art: 'unbekannterEintrag'; name: string; satz: string }   (name = Pfad im ZIP; satz = verständlicher deutscher Satz)
 *   ProjektdateiFehler.grund wird 'unlesbar' | 'neuer' | 'zugross'   ('zugross' = Schutz vor ZIP-Bomben, siehe unten)
 *
 * Projekt (lib/ablage.ts) bekommt:
 *   fragebogen?: FragebogenPlan[]                                  (fehlt = keiner; leeres Feld [] zählt als „nichts Neues“)
 *   fragebogenBilder?: Record<string, Uint8Array>                  (Schlüssel `<plan-id>/<datei>`, z. B. `p-1/logo.png`; im ZIP `fragebogen/<plan-id>/<datei>`)
 *   Das Architekturblatt sagt nur „Bilder liegen als Dateien im ZIP“, nicht, wo sie im Projekt-Objekt liegen: diese Festlegung ist neu, siehe Bericht.
 *
 * Schreiben:
 *   Ohne Neues (kein Plan; später auch kein qualitativer Teil): Fassung 1, Datei beginnt mit `{`, JSON wie bisher (version 1, `sav` als Base64).
 *   Mit mindestens einem Plan: Fassung 2, Datei beginnt mit `PK\x03\x04`, der ERSTE Eintrag ist `statable.json` = { format: 'statable-projekt', version: 2, inhalt: string[] }
 *   (inhalt = Pfade aller bekannten Einträge). Einträge: statable.json, projekt.json (alles aus Fassung 1 außer `sav` und ohne `fragebogen`), daten.sav (binär, unverändert),
 *   fragebogen/<plan-id>.json je Plan, fragebogen/<plan-id>/<datei> je Bild. Reihenfolge und Packen wie im Entwurf.
 *
 * Lesen:
 *   Erste Bytes `PK\x03\x04` → Fassung 2; `{` nach Leerraum (auch nach UTF-8-Bytefolge-Marke EF BB BF) → Fassung 1; sonst ProjektdateiFehler('unlesbar').
 *   Fassung 1 mit version > 1 und Fassung 2 mit version > 2: ProjektdateiFehler('neuer'). Dieselben feldweisen Prüfungen wie bisher (namenPruefen, gewichtAus …).
 *   Eintrag im ZIP, der nicht zu den bekannten Namen/Mustern gehört: wird übersprungen (nie ausgeführt oder gelesen) und als DateiMeldung 'unbekannterEintrag' gemeldet.
 *   Gelesene Pläne und Bilder, die in `inhalt` fehlen oder unlesbar sind: ProjektdateiFehler('unlesbar') für kaputtes JSON in projekt.json/statable.json/daten.sav-Mangel; ein kaputter Plan wird nicht still verworfen.
 *
 * Größenschutz (vor dem Entpacken, aus dem ZIP-Verzeichnis = Central Directory gelesen, ohne Entpacken):
 *   Summe der angegebenen entpackten Größen > 2 GB (2 * 1024^3 Bytes) ODER > 100 × Dateigröße (Bytes der ganzen Datei) → ProjektdateiFehler('zugross'). Kein Eintrag wird entpackt.
 *   Gilt auch, wenn nur eine einzelne Größenangabe so hoch ist. Gleich 100 × ist erlaubt. Eine kleine Datei (< 1 KB entpackt) darf nie wegen der 100-fach-Regel abgelehnt werden,
 *   wenn ihre Summe unter 100 KB liegt (Untergrenze 100 KB, damit winzige Projekte nicht fälschlich fallen).
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { leseCsv, zurEngine } from './einlesen';
import { nodeEngine } from './testengine';
import type { Projekt } from './ablage';
import type { Blatt } from './sitzung.svelte';
import type { Antwortliste, FragebogenPlan } from './fragebogenplan';

interface DateiMeldung { art: 'unbekannterEintrag'; name: string; satz: string }
interface Neu {
  projektAlsDatei?: (p: Projekt) => Uint8Array;
  leseProjektdatei?: (b: Uint8Array) => Projekt;
  leseProjektdateiMitMeldungen?: (b: Uint8Array) => { projekt: Projekt; meldungen: DateiMeldung[] };
  ProjektdateiFehler?: new (g: string) => Error & { grund: string };
}
let neu: Neu = {};
beforeAll(async () => { neu = await import('./projektdatei').catch(() => ({})) as Neu; });
function fn<K extends keyof Neu>(k: K): NonNullable<Neu[K]> {
  const f = neu[k]; if (typeof f !== 'function') throw new Error(`${k} fehlt noch (Paket 2A)`);
  return f as NonNullable<Neu[K]>;
}
const schreibe = (p: Projekt): Uint8Array => { const b = fn('projektAlsDatei')(p); if (!(b instanceof Uint8Array)) throw new Error('projektAlsDatei muss Uint8Array liefern (Fassung 2 der Signatur)'); return b; };
const lies = (b: Uint8Array) => fn('leseProjektdatei')(b);
const wirftGrund = (b: Uint8Array, grund: string) => {
  let f: unknown;
  try { fn('leseProjektdatei')(b); } catch (e) { f = e; }
  expect(f, 'es muss ein Fehler kommen').toBeInstanceOf(fn('ProjektdateiFehler'));
  expect((f as { grund: string }).grund).toBe(grund);
};

/* ------------------------------------------------------------------ Fixtures */
const TTEST = "T-TEST GROUPS=handy_im_bett('nein' 'ja') /VARIABLES=konzentration.";
/** Wie in projektdatei.test.ts: echtes Projekt mit echten .sav-Daten und einem Blatt. */
async function projekt(): Promise<Projekt> {
  const e = await nodeEngine();
  const { syntax, csv } = zurEngine(leseCsv(readFileSync(new URL('./testdaten/schlaf-und-konzentration.csv', import.meta.url), 'utf8')));
  e.run(syntax, { '/import.csv': csv });
  e.run("VARIABLE LABELS konzentration 'Konzentration (Punkte)'.\nSAVE OUTFILE='/p.sav'.");
  const items = e.run(TTEST);
  const blatt: Blatt = { id: 'a1', titel: 'Handy im Bett und Konzentration', art: 'zwei', l1: 'konzentration', l2: 'handy_im_bett', syntax: TTEST, items,
    ergebnis: { d: 0.57, leer: NaN, gross: Infinity }, imBericht: true, notiz: 'Für Kapitel 4 - „Gruppen“ prüfen', zeit: 1, dg: { art: 'balken' } as unknown as Blatt['dg'] };
  return { name: 'Meine Studie: Schlaf/Handy', quelle: 'umfrage.xlsx', sav: e.lies('/p.sav'), blaetter: [blatt], entscheid: { 'alter-99': 'erledigt' }, zeit: 1760000000000 };
}
const kleinesProjekt = (): Projekt => ({ name: 'Klein', quelle: 'x.csv', sav: Uint8Array.from({ length: 3000 }, (_, i) => (i * 37 + (i >> 3)) & 255), blaetter: [], entscheid: {}, zeit: 1760000000000 });

const lok = (t: string) => ({ de: t, en: t + ' (en)' });
const liste: Antwortliste = { id: 'l1', name: 'zustimmung', geordnet: true, optionen: [1, 2, 3].map(i => ({ id: `l1:${i}`, wert: i, text: lok(`Stufe ${i}`) })) };
const planMitBild: FragebogenPlan = {
  format: 'statable-fragebogen', version: 1, id: '3f2b8c1e-5d4a-4e7b-9c1d-0a1b2c3d4e5f', revision: 4, titel: lok('Studie ✓ Größe'), sprachen: ['de', 'en'],
  einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' }, antwortlisten: [liste], skalen: [],
  elemente: [{ art: 'seite', id: 's1', name: 'seite1', elemente: [{ art: 'frage', id: 'q1', name: 'zufriedenheit', typ: 'einfach', text: lok('Wie zufrieden? 😀'), liste: 'l1', kodebuch: { niveau: 'ordinal' },
    bild: { datei: 'logo.png', alt: lok('Das Logo') } }] }],
  herkunft: { art: 'neu', zeit: 5 }, geaendert: 1760000000001
};
const planOhneBild: FragebogenPlan = { ...planMitBild, id: '9a8b7c6d-1111-4222-8333-444455556666', titel: lok('Zweiter Plan'), elemente: [{ art: 'seite', id: 's1', name: 'seite1', elemente: [] }] };
/** Bytes mit allen 256 Werten, damit kein stilles Umkodieren (UTF-8, Base64-Zeilen) durchgeht. */
const bildBytes = Uint8Array.from({ length: 700 }, (_, i) => (i * 7 + 3) & 255);
const mitPlan = (p: Projekt): Projekt => ({ ...p, fragebogen: [planMitBild, planOhneBild], fragebogenBilder: { [`${planMitBild.id}/logo.png`]: bildBytes } });

const beginntMit = (b: Uint8Array, ...x: number[]) => x.every((v, i) => b[i] === v);
/** Name des ersten Eintrags: lokaler ZIP-Kopf, Namenslänge bei Byte 26, Name ab Byte 30. */
const ersterEintrag = (b: Uint8Array): string => { const n = b[26]! | (b[27]! << 8); return strFromU8(b.subarray(30, 30 + n)); };
const dv = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength);

/** Setzt im ZIP-Verzeichnis (Central Directory, Kennung 0x02014b50) die Angabe „entpackte Größe“ (Byte 24) des Eintrags `name` neu. Die Daten selbst bleiben unverändert. */
function setzeGroesse(zip: Uint8Array, name: string, groesse: number): Uint8Array {
  const aus = zip.slice(), d = dv(aus);
  let gefunden = false;
  for (let i = 0; i + 46 < aus.length; i++) {
    if (d.getUint32(i, true) !== 0x02014b50) continue;
    const nl = d.getUint16(i + 28, true);
    if (strFromU8(aus.subarray(i + 46, i + 46 + nl)) === name) { d.setUint32(i + 24, groesse, true); gefunden = true; }
  }
  if (!gefunden) throw new Error('Eintrag nicht im Verzeichnis: ' + name);
  return aus;
}
/** Ein Fassung-2-Archiv, unabhängig vom Bauer mit fflate gebaut (kleine, echte Fassung-1-Felder). */
function fremdesZip(extra: Record<string, Uint8Array> = {}, inhalt = ['projekt.json', 'daten.sav'], version = 2): Uint8Array {
  const sav = Uint8Array.from({ length: 2000 }, (_, i) => (i * 31 + (i >> 2)) & 255);
  return zipSync({
    'statable.json': strToU8(JSON.stringify({ format: 'statable-projekt', version, inhalt })),
    'projekt.json': strToU8(JSON.stringify({ name: 'Fremd', quelle: 'f.csv', zeit: 1, blaetter: [], sets: [], skalen: [], entscheid: {} })),
    'daten.sav': sav, ...extra
  });
}

/* ------------------------------------------------------------------ 1. Fassung 1 bleibt lesbar */
describe('Projektdatei Fassung 2, Punkt 1: Fassung-1-Dateien bleiben lesbar', () => {
  it('von Hand gebaute Fassung-1-Datei (unabhängig vom Schreiber) wird gelesen', () => {
    const sav = Uint8Array.from({ length: 500 }, (_, i) => (i * 13) & 255);
    let t = ''; for (const b of sav) t += String.fromCharCode(b);
    const text = JSON.stringify({ format: 'statable-projekt', version: 1, name: 'Alt', quelle: 'alt.csv', zeit: 42, sav: btoa(t), blaetter: [], sets: [], skalen: [{ name: 'S', fragen: ['a', 'b'] }], entscheid: { x: 'gelassen' } });
    const p = lies(strToU8(text));
    expect(p.name).toBe('Alt'); expect(p.quelle).toBe('alt.csv'); expect(p.zeit).toBe(42);
    expect(Array.from(p.sav)).toEqual(Array.from(sav));
    expect(p.skalen).toEqual([{ name: 'S', fragen: ['a', 'b'] }]); expect(p.entscheid).toEqual({ x: 'gelassen' });
    expect(p.fragebogen ?? []).toEqual([]);
  });
  it('Leerraum und UTF-8-Marke vor dem { werden toleriert', () => {
    const text = JSON.stringify({ format: 'statable-projekt', version: 1, name: 'Alt', quelle: '', zeit: 1, sav: '', blaetter: [], entscheid: {} });
    expect(lies(strToU8('  \n\t' + text)).name).toBe('Alt');
    expect(lies(Uint8Array.from([0xef, 0xbb, 0xbf, ...strToU8(text)])).name).toBe('Alt');
  });
  it('Fassung 1 aus dem echten Projekt: geschrieben und gelesen ergibt dieselben Blätter (NaN, Unendlich, Notiz) und dieselben Daten', async () => {
    const p = await projekt();
    const z = lies(schreibe(p));
    expect(z.name).toBe(p.name); expect(z.quelle).toBe(p.quelle); expect(z.entscheid).toEqual(p.entscheid);
    expect(z.blaetter).toEqual(p.blaetter);
    expect(Array.from(z.sav)).toEqual(Array.from(p.sav));
  });
  it('Fassung 1 mit zu neuer Version und Unsinn: weiter ProjektdateiFehler mit denselben Gründen', () => {
    wirftGrund(strToU8('kein json'), 'unlesbar');
    wirftGrund(strToU8('{"format":"anders"}'), 'unlesbar');
    wirftGrund(strToU8(JSON.stringify({ format: 'statable-projekt', version: 99, sav: '', blaetter: [] })), 'neuer');
    wirftGrund(Uint8Array.of(), 'unlesbar');
    wirftGrund(Uint8Array.of(1, 2, 3, 4, 5, 6), 'unlesbar');
  });
  it('Fassung 2 mit zu neuer Version meldet „neuer“', () => { wirftGrund(fremdesZip({}, ['projekt.json', 'daten.sav'], 99), 'neuer'); });
});

/* ------------------------------------------------------------------ 2. Hin und zurück */
describe('Projektdatei Fassung 2, Punkt 2: hin und zurück', () => {
  it('Projekt mit zwei Fragebogen-Plänen und einem Bild: alle Felder gleich, Bild Byte für Byte', async () => {
    const p = mitPlan(await projekt());
    const z = lies(schreibe(p));
    expect(z.name).toBe(p.name); expect(z.quelle).toBe(p.quelle); expect(z.zeit).toBe(p.zeit); expect(z.entscheid).toEqual(p.entscheid);
    expect(z.blaetter).toEqual(p.blaetter);
    expect(Array.from(z.sav)).toEqual(Array.from(p.sav));
    expect(z.fragebogen).toEqual(p.fragebogen);                       // Emoji, ✓ und Umlaute im Text unverändert
    expect(Object.keys(z.fragebogenBilder ?? {})).toEqual([`${planMitBild.id}/logo.png`]);
    expect(Array.from(z.fragebogenBilder![`${planMitBild.id}/logo.png`]!)).toEqual(Array.from(bildBytes));
  });
  it('Sets, Skalen, Gewicht und Protokoll-Felder laufen mit durch (gleiche Prüfungen wie Fassung 1)', () => {
    const set = { name: 'medien', label: 'Genutzte Medien', spalten: ['medien_1', 'medien_2'], zaehlwert: 1 };
    const p = mitPlan({ ...kleinesProjekt(), sets: [set], skalen: [{ name: 'Organisation', fragen: ['FG01', 'FG14'] }], gewicht: { spalte: 'w', art: 'haeufigkeit' } });
    const z = lies(schreibe(p));
    expect(z.sets).toEqual([set]); expect(z.skalen).toEqual([{ name: 'Organisation', fragen: ['FG01', 'FG14'] }]); expect(z.gewicht).toEqual({ spalte: 'w', art: 'haeufigkeit' });
  });
  it('Namen aus einer Fassung-2-Datei werden wie bisher geprüft (Einschleusen über l1 scheitert)', () => {
    const zip = fremdesZip({ 'projekt.json': strToU8(JSON.stringify({ name: 'Fremd', quelle: '', zeit: 1, sets: [], skalen: [], entscheid: {},
      blaetter: [{ id: 'a', titel: 't', art: 'zwei', l1: "x'.\nCOMPUTE y=1.", l2: 'gut', syntax: '', items: [], imBericht: false, notiz: '', zeit: 1 }] })) });
    const p = lies(zip);
    expect(p.blaetter[0]!.l1).toBeNull(); expect(p.blaetter[0]!.l2).toBe('gut');
  });
  it('Projekt mit nur einem Plan ohne Bild: Rundreise, keine Bilder', () => {
    const z = lies(schreibe({ ...kleinesProjekt(), fragebogen: [planOhneBild] }));
    expect(z.fragebogen).toEqual([planOhneBild]); expect(Object.keys(z.fragebogenBilder ?? {})).toEqual([]);
  });
  it.todo('qualitativer Teil mit Emoji im Text, Positionen unverändert (kommt mit dem Typ QualProjekt)');
});

/* ------------------------------------------------------------------ 3. Welche Fassung wird geschrieben */
describe('Projektdatei Fassung 2, Punkt 3: ohne Neues Fassung 1, mit Plan Fassung 2', () => {
  it('ohne Plan: Datei beginnt mit { und ist JSON mit version 1', async () => {
    const b = schreibe(await projekt());
    expect(b[0]).toBe(0x7b);
    const o = JSON.parse(strFromU8(b)); expect(o.format).toBe('statable-projekt'); expect(o.version).toBe(1); expect(typeof o.sav).toBe('string');
  });
  it('leeres fragebogen-Feld zählt als „nichts Neues“: Fassung 1', () => {
    expect(schreibe({ ...kleinesProjekt(), fragebogen: [] })[0]).toBe(0x7b);
  });
  it('mit Plan: PK\\x03\\x04, statable.json zuerst, Kopf mit version 2 und inhalt', () => {
    const b = schreibe(mitPlan(kleinesProjekt()));
    expect(beginntMit(b, 0x50, 0x4b, 0x03, 0x04)).toBe(true);
    expect(ersterEintrag(b)).toBe('statable.json');
    const z = unzipSync(b);
    const kopf = JSON.parse(strFromU8(z['statable.json']!));
    expect(kopf.format).toBe('statable-projekt'); expect(kopf.version).toBe(2);
    expect(Array.isArray(kopf.inhalt)).toBe(true);
    const erwartet = ['projekt.json', 'daten.sav', `fragebogen/${planMitBild.id}.json`, `fragebogen/${planOhneBild.id}.json`, `fragebogen/${planMitBild.id}/logo.png`];
    expect([...kopf.inhalt].sort()).toEqual([...erwartet].sort());
    expect(Object.keys(z).sort()).toEqual(['statable.json', ...erwartet].sort());
  });
  it('mit Plan: daten.sav binär und unverändert, projekt.json ohne sav und ohne Plan-Inhalt', () => {
    const p = mitPlan(kleinesProjekt());
    const z = unzipSync(schreibe(p));
    expect(Array.from(z['daten.sav']!)).toEqual(Array.from(p.sav));
    const pj = JSON.parse(strFromU8(z['projekt.json']!));
    expect(pj.sav).toBeUndefined(); expect(pj.fragebogen).toBeUndefined(); expect(pj.name).toBe('Klein');
    expect(JSON.parse(strFromU8(z[`fragebogen/${planMitBild.id}.json`]!))).toEqual(planMitBild);
    expect(Array.from(z[`fragebogen/${planMitBild.id}/logo.png`]!)).toEqual(Array.from(bildBytes));
  });
});

/* ------------------------------------------------------------------ 4. Unbekannte Einträge */
describe('Projektdatei Fassung 2, Punkt 4: unbekannter Eintrag', () => {
  it('wird übersprungen und gemeldet; der Rest ist unverändert lesbar', () => {
    const b = schreibe(mitPlan(kleinesProjekt()));
    const z = unzipSync(b);
    const mehr = zipSync({ 'statable.json': z['statable.json']!, ...Object.fromEntries(Object.entries(z).filter(([k]) => k !== 'statable.json')), 'zukunft/etwas.bin': Uint8Array.of(1, 2, 3), 'notizen.js': strToU8('alert(1)') });
    const r = fn('leseProjektdateiMitMeldungen')(mehr);
    expect(r.projekt.fragebogen).toEqual([planMitBild, planOhneBild]);
    const namen = r.meldungen.filter(m => m.art === 'unbekannterEintrag').map(m => m.name).sort();
    expect(namen).toEqual(['notizen.js', 'zukunft/etwas.bin']);
    for (const m of r.meldungen) expect(m.satz.length).toBeGreaterThan(10);
    expect(() => lies(mehr)).not.toThrow();
  });
  it('eine saubere Datei meldet nichts', () => {
    expect(fn('leseProjektdateiMitMeldungen')(schreibe(mitPlan(kleinesProjekt()))).meldungen).toEqual([]);
    expect(fn('leseProjektdateiMitMeldungen')(schreibe(kleinesProjekt())).meldungen).toEqual([]);   // auch Fassung 1
  });
  it('fremdes, selbst gebautes Archiv mit unbekanntem Eintrag', () => {
    const r = fn('leseProjektdateiMitMeldungen')(fremdesZip({ 'qualitativ/zukunft.json': strToU8('{}') }));
    expect(r.projekt.name).toBe('Fremd');
    expect(r.meldungen.map(m => m.name)).toEqual(['qualitativ/zukunft.json']);
  });
  it('Archiv ohne statable.json oder mit falschem Format: unlesbar', () => {
    expect(lies(fremdesZip()).name).toBe('Fremd');   // Gegenprobe: ein gültiges Archiv geht
    wirftGrund(zipSync({ 'a.txt': strToU8('x') }), 'unlesbar');
    wirftGrund(zipSync({ 'statable.json': strToU8('{"format":"anders","version":2,"inhalt":[]}') }), 'unlesbar');
    wirftGrund(zipSync({ 'statable.json': strToU8('{"format":"statable-projekt","version":2,"inhalt":[]}') }), 'unlesbar');   // ohne projekt.json/daten.sav
  });
});

/* ------------------------------------------------------------------ 5. Größenschutz */
describe('Projektdatei Fassung 2, Punkt 5: ZIP-Bombe, Abbruch vor dem Entpacken', () => {
  it('unverändertes Fremd-Archiv ist lesbar (Gegenprobe zu den folgenden)', () => { expect(lies(fremdesZip()).name).toBe('Fremd'); });
  it('Verzeichnis meldet 3 GB entpackt (über 2 GB): zugross', () => {
    const t0 = Date.now();
    wirftGrund(setzeGroesse(fremdesZip(), 'daten.sav', 3 * 1024 ** 3), 'zugross');
    expect(Date.now() - t0, 'es darf nichts entpackt (oder 3 GB angelegt) worden sein').toBeLessThan(2000);
  });
  it('Verzeichnis meldet genau 2 GB + 1 Byte: zugross; die Summe über mehrere Einträge zählt (je 1,5 GB)', () => {
    wirftGrund(setzeGroesse(fremdesZip(), 'daten.sav', 2 * 1024 ** 3 + 1), 'zugross');
    wirftGrund(setzeGroesse(setzeGroesse(fremdesZip(), 'daten.sav', 1.5 * 1024 ** 3), 'projekt.json', 1.5 * 1024 ** 3), 'zugross');
  });
  it('mehr als das 100-fache der Dateigröße: zugross, auch weit unter 2 GB', () => {
    const z = fremdesZip();
    wirftGrund(setzeGroesse(z, 'daten.sav', z.length * 100 + 100_000), 'zugross');
    wirftGrund(setzeGroesse(z, 'daten.sav', 50 * 1024 * 1024), 'zugross');   // 50 MB aus ~2 KB
  });
  it('knapp unter den Grenzen wird nicht abgelehnt (Fehler dann aber anderer Art: die Daten stimmen ja nicht), Grenzfall 100-fach nicht „zugross“', () => {
    const z = fremdesZip();
    // 10-fach der Dateigröße: kein „zugross“.
    expect(lies(z).name).toBe('Fremd');
    let grund = '';
    try { lies(setzeGroesse(z, 'daten.sav', z.length * 10)); } catch (e) { grund = (e as { grund?: string }).grund ?? 'anders'; }
    expect(grund).not.toBe('zugross');
  });
});
