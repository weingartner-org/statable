/**
 * Paket 2A, zusätzliche Tests des Bauers zu den Entscheiden vom 08.11. (Fachblatt Stufe 2, „Entscheide nach den Prüfer-Tests“):
 *  (a) eine verborgene Seite verbirgt ihre Fragen (zeigen, auch für die Kaskade; unerreichbar),
 *  (b) `unerreichbar` erkennt auch eine einzelne Bedingung außerhalb des Wertebereichs,
 *  (d) Größenschutz der Projektdatei, Untergrenze, Öffnen einer Fassung-2-Datei über `leseDatei` mit Meldung.
 * Regeln, keine Rechen-Sollwerte. Die Prüfer-Dateien fragebogenplan-2a.test.ts und projektdatei-2.test.ts bleiben unberührt.
 *
 * HINWEIS zu (d): Das Fachblatt sagt „über 2 GB oder (über 100 MB und über dem 100-fachen)“, der Kopf von projektdatei-2.test.ts (und seine Tests, z. B. 50 MB aus ~2 KB)
 * verlangen die 100-fach-Regel schon ab 100 KB entpackt. Gebaut ist, was die Prüfer-Tests verlangen (Untergrenze 100 KB); die Abweichung steht im Bericht.
 */
import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { leseDatei } from './einlesen';
import { leseProjektdatei, leseProjektdateiMitMeldungen, projektAlsDatei, ProjektdateiFehler, FAKTOR_AB } from './projektdatei';
import { unerreichbar, zeigen, type Antwortliste, type Bedingung, type Element, type Frage, type FragebogenPlan, type Lok, type Seite } from './fragebogenplan';
import type { Projekt } from './ablage';

const zw = (t: string): Lok => ({ de: t, en: t + ' (en)' });
const liste: Antwortliste = { id: 'l5', name: 'l5', geordnet: true, optionen: [1, 2, 3, 4, 5].map(i => ({ id: `l5:${i}`, wert: i, text: zw(`Stufe ${i}`) })) };
const frage = (id: string, extra: Partial<Frage> = {}): Frage => ({ art: 'frage', id, name: id, typ: 'einfach', text: zw(id), liste: 'l5', kodebuch: { niveau: 'ordinal' }, ...extra });
const zahl = (id: string, extra: Partial<Frage> = {}): Frage => frage(id, { typ: 'zahl', liste: undefined, zahl: { min: 0, max: 120, ganz: true }, kodebuch: { niveau: 'skala' }, ...extra });
const seite = (id: string, elemente: Element[], wennGezeigt?: Bedingung): Seite => ({ art: 'seite', id, name: id, elemente, ...(wennGezeigt ? { wennGezeigt } : {}) });
const plan = (seiten: Seite[]): FragebogenPlan => ({ format: 'statable-fragebogen', version: 1, id: 'p-1', revision: 1, titel: zw('T'), sprachen: ['de', 'en'],
  einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' }, antwortlisten: [liste], skalen: [], elemente: seiten, geaendert: 1 });

describe('(a) verborgene Seite verbirgt ihre Fragen', () => {
  const p = plan([seite('s1', [frage('A')]), seite('s2', [frage('B'), frage('C', { wennGezeigt: { frage: 'B', ist: '=', wert: 1 } })], { frage: 'A', ist: '=', wert: 1 }),
    seite('s3', [frage('D', { wennGezeigt: { frage: 'B', beantwortet: false } }), frage('E', { wennGezeigt: { frage: 'C', ist: '=', wert: 1 } })])]);
  const s2 = p.elemente[1]!, B = s2.elemente[0]!, C = s2.elemente[1]!, D = p.elemente[2]!.elemente[0]!, E = p.elemente[2]!.elemente[1]!;
  it('Seite gezeigt: ihre Fragen werden nach ihren eigenen Bedingungen gezeigt', () => {
    expect([zeigen(s2, { A: 1 }, p), zeigen(B, { A: 1 }, p), zeigen(C, { A: 1, B: 1 }, p), zeigen(C, { A: 1, B: 2 }, p)]).toEqual([true, true, true, false]);
  });
  it('Seite verborgen: Fragen darauf gelten als nicht gezeigt, auch ohne eigene Bedingung', () => {
    expect([zeigen(s2, { A: 2 }, p), zeigen(B, { A: 2 }, p), zeigen(C, { A: 2, B: 1 }, p)]).toEqual([false, false, false]);
  });
  it('Kaskade: eine Frage auf verborgener Seite gilt für andere Bedingungen als unbeantwortet', () => {
    expect(zeigen(D, { A: 2, B: 7 }, p)).toBe(true);      // B ist verborgen: „unbeantwortet“ ist wahr
    expect(zeigen(D, { A: 1, B: 7 }, p)).toBe(false);     // B sichtbar und beantwortet
    expect(zeigen(E, { A: 2, B: 1, C: 1 }, p)).toBe(false);
  });
  it('ohne plan wird nicht kaskadiert und die Seite nicht beachtet', () => {
    expect(zeigen(B, { A: 2 })).toBe(true);
    expect(zeigen(D, { A: 2, B: 7 })).toBe(false);
  });
  it('unerreichbar: Fragen auf einer unerreichbaren Seite sind ebenfalls unerreichbar (Folgefragen über Verweis auch)', () => {
    const leer: Bedingung = { und: [{ frage: 'A', ist: '<', wert: 2 }, { frage: 'A', ist: '>', wert: 4 }] };
    const q = plan([seite('s1', [frage('A')]), seite('s2', [frage('B')], leer), seite('s3', [frage('C', { wennGezeigt: { frage: 'B', beantwortet: true } })])]);
    expect(unerreichbar(q)).toEqual(['s2', 'B', 'C']);
    expect(unerreichbar(plan([seite('s1', [frage('A')]), seite('s2', [frage('B')], { frage: 'A', ist: '=', wert: 1 })]))).toEqual([]);
  });
});

describe('(b) einzelne Bedingung außerhalb des Wertebereichs ist unerreichbar', () => {
  const f = (b: Bedingung, ersteFrage: Frage = zahl('alter')) => unerreichbar(plan([seite('s1', [ersteFrage, frage('q2', { wennGezeigt: b })])]));
  it('Zahl mit Höchstwert: alter > 150 bei max 120', () => {
    expect(f({ frage: 'alter', ist: '>', wert: 150 })).toEqual(['q2']);
    expect(f({ frage: 'alter', ist: '≥', wert: 121 })).toEqual(['q2']);
    expect(f({ frage: 'alter', ist: '=', wert: 130 })).toEqual(['q2']);
    expect(f({ frage: 'alter', ist: '<', wert: 0 })).toEqual(['q2']);
    expect(f({ frage: 'alter', ist: '<', wert: -1 })).toEqual(['q2']);
  });
  it('innerhalb des Bereichs und an der Grenze: erreichbar', () => {
    expect(f({ frage: 'alter', ist: '>', wert: 119 })).toEqual([]);
    expect(f({ frage: 'alter', ist: '≥', wert: 120 })).toEqual([]);
    expect(f({ frage: 'alter', ist: '=', wert: 0 })).toEqual([]);
    expect(f({ frage: 'alter', ist: '≤', wert: 0 })).toEqual([]);
    expect(f({ frage: 'alter', ist: '≠', wert: 50 })).toEqual([]);
  });
  it('ohne Grenzen in der Frage gibt es nichts zu überschreiten', () => {
    expect(f({ frage: 'alter', ist: '>', wert: 1e9 }, zahl('alter', { zahl: { ganz: true } }))).toEqual([]);
  });
  it('nur ganze Zahlen: alter > 119,5 bei max 120 geht (120), alter > 120 nicht', () => {
    expect(f({ frage: 'alter', ist: '>', wert: 119.5 })).toEqual([]);
    expect(f({ frage: 'alter', ist: '>', wert: 120 })).toEqual(['q2']);
  });
  it('Antwortliste: Code nicht in der Liste, auch über und unter dem Bereich', () => {
    const e = frage('a');   // Codes 1 bis 5
    expect(f({ frage: 'a', ist: '=', wert: 9 }, e)).toEqual(['q2']);
    expect(f({ frage: 'a', ist: '>', wert: 5 }, e)).toEqual(['q2']);
    expect(f({ frage: 'a', ist: '<', wert: 1 }, e)).toEqual(['q2']);
    expect(f({ frage: 'a', ist: '=', wert: 3 }, e)).toEqual([]);
    expect(f({ frage: 'a', ist: '≥', wert: 5 }, e)).toEqual([]);
    expect(f({ frage: 'a', ist: '≠', wert: 9 }, e)).toEqual([]);
  });
  it('Fehlendcodes der Liste zählen zum Wertebereich', () => {
    const l = { ...liste, optionen: [...liste.optionen, { id: 'l5:m', wert: -8, text: zw('weiß nicht'), fehlend: 'weissNicht' as const }] };
    const p = { ...plan([seite('s1', [frage('a'), frage('q2', { wennGezeigt: { frage: 'a', ist: '=', wert: -8 } })])]), antwortlisten: [l] };
    expect(unerreichbar(p)).toEqual([]);
  });
  it('nicht und oder: nicht wird nicht untersucht; oder nur, wenn alle Zweige es sind', () => {
    expect(f({ nicht: { frage: 'alter', ist: '>', wert: 150 } })).toEqual([]);
    expect(f({ oder: [{ frage: 'alter', ist: '>', wert: 150 }, { frage: 'alter', ist: '<', wert: 10 }] })).toEqual([]);
    expect(f({ oder: [{ frage: 'alter', ist: '>', wert: 150 }, { frage: 'alter', ist: '<', wert: -5 }] })).toEqual(['q2']);
  });
});

/* ------------------------------------------------------------------ Projektdatei: Größenschutz (d), Öffnen */
const dv = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength);
function setzeGroesse(zip: Uint8Array, name: string, groesse: number): Uint8Array {
  const aus = zip.slice(), d = dv(aus);
  for (let i = 0; i + 46 < aus.length; i++) {
    if (d.getUint32(i, true) !== 0x02014b50) continue;
    const nl = d.getUint16(i + 28, true);
    if (new TextDecoder().decode(aus.subarray(i + 46, i + 46 + nl)) === name) d.setUint32(i + 24, groesse, true);
  }
  return aus;
}
const kleinesZip = (extra: Record<string, Uint8Array> = {}) => zipSync({
  'statable.json': strToU8(JSON.stringify({ format: 'statable-projekt', version: 2, inhalt: ['projekt.json', 'daten.sav'] })),
  'projekt.json': strToU8(JSON.stringify({ name: 'Klein', quelle: '', zeit: 1, blaetter: [], sets: [], skalen: [], entscheid: {} })),
  'daten.sav': Uint8Array.of(1, 2, 3, 4), ...extra
});
const grundVon = (b: Uint8Array) => { try { leseProjektdatei(b); } catch (e) { return e instanceof ProjektdateiFehler ? e.grund : 'anderer Fehler'; } return 'kein Fehler'; };

describe('Projektdatei Fassung 2: Größenschutz und Öffnen (Bau-Tests)', () => {
  it('winzige Datei: die 100-fach-Regel greift unter der Untergrenze (100 KB entpackt) nie', () => {
    const z = kleinesZip();
    expect(z.length * 100).toBeLessThan(FAKTOR_AB);   // Voraussetzung: die Datei ist so klein, dass ein Vielfaches noch unter der Untergrenze liegt
    expect(grundVon(setzeGroesse(z, 'daten.sav', FAKTOR_AB - 5000))).not.toBe('zugross');
    expect(grundVon(z)).toBe('kein Fehler');
  });
  it('über der Untergrenze und über dem 100-fachen: zugross', () => {
    const z = kleinesZip();
    const gross = Math.max(FAKTOR_AB + 1000, z.length * 100 + 1000);
    expect(grundVon(setzeGroesse(z, 'daten.sav', gross))).toBe('zugross');
  });
  it('2 GB: die Grenze zählt je Eintrag und als Summe', () => {
    const z = kleinesZip();
    expect(grundVon(setzeGroesse(z, 'daten.sav', 2 * 1024 ** 3 + 1))).toBe('zugross');
    expect(grundVon(setzeGroesse(setzeGroesse(z, 'daten.sav', 1.2 * 1024 ** 3), 'projekt.json', 1.2 * 1024 ** 3))).toBe('zugross');
  });
  it('Zip64-Verzeichnis (Größe 0xFFFFFFFF) gilt als zu groß', () => {
    expect(grundVon(setzeGroesse(kleinesZip(), 'daten.sav', 0xffffffff))).toBe('zugross');
  });
  it('kein ZIP-Verzeichnis (abgeschnitten): unlesbar, kein anderer Fehler', () => {
    const z = kleinesZip();
    expect(grundVon(z.subarray(0, z.length - 30))).toBe('unlesbar');
  });
  it('unbekannte Einträge werden nicht entpackt: ein kaputter Datenstrom im unbekannten Eintrag stört nicht', () => {
    const z = kleinesZip({ 'zukunft/x.bin': strToU8('a'.repeat(4000)) });
    const d = dv(z);
    let kaputt = 0;
    for (let i = 0; i + 30 < z.length; i++) {
      if (d.getUint32(i, true) !== 0x04034b50) continue;
      const nl = d.getUint16(i + 26, true), el = d.getUint16(i + 28, true), cs = d.getUint32(i + 18, true);
      if (new TextDecoder().decode(z.subarray(i + 30, i + 30 + nl)) === 'zukunft/x.bin') { z.fill(0xff, i + 30 + nl + el, i + 30 + nl + el + cs); kaputt = cs; }
    }
    expect(kaputt).toBeGreaterThan(0);
    const r = leseProjektdateiMitMeldungen(z);
    expect(r.projekt.name).toBe('Klein'); expect(r.meldungen.map(m => m.name)).toEqual(['zukunft/x.bin']);
  });
  it('Pfade mit .., Rückstrich oder führendem Schrägstrich sind unbekannt (werden gemeldet, nie gelesen)', () => {
    const z = kleinesZip({ 'fragebogen/../projekt.json': strToU8('{}'), 'fragebogen/a\\b.json': strToU8('{}'), '/daten.sav': strToU8('x'), 'fragebogen/p/../x.png': strToU8('x') });
    const r = leseProjektdateiMitMeldungen(z);
    expect(r.projekt.name).toBe('Klein');
    expect(r.meldungen.map(m => m.name).sort()).toEqual(['/daten.sav', 'fragebogen/../projekt.json', 'fragebogen/a\\b.json', 'fragebogen/p/../x.png'].sort());
  });
  it('ein Eintrag aus `inhalt`, der im ZIP fehlt, macht die Datei unlesbar', () => {
    const z = zipSync({ 'statable.json': strToU8(JSON.stringify({ format: 'statable-projekt', version: 2, inhalt: ['projekt.json', 'daten.sav', 'fragebogen/x.json'] })),
      'projekt.json': strToU8(JSON.stringify({ name: 'K', blaetter: [] })), 'daten.sav': Uint8Array.of(1) });
    expect(grundVon(z)).toBe('unlesbar');
  });
  it('ein kaputter Plan wird nicht still verworfen: unlesbar', () => {
    expect(grundVon(kleinesZip({ 'fragebogen/p-1.json': strToU8('{kaputt') }))).toBe('unlesbar');
    expect(grundVon(kleinesZip({ 'fragebogen/p-1.json': strToU8('{"format":"anders"}') }))).toBe('unlesbar');
  });
  it('leseDatei öffnet eine Fassung-2-Datei (.statable) und gibt Meldungen mit', async () => {
    const p: Projekt = { name: 'Mit Plan', quelle: '', sav: Uint8Array.of(9, 8, 7), blaetter: [], entscheid: {}, zeit: 1, fragebogen: [plan([seite('s1', [frage('A')])])] };
    const e = await leseDatei(new File([projektAlsDatei(p) as BlobPart], 'm.statable'));
    expect(e.art).toBe('projekt');
    if (e.art === 'projekt') { expect(e.projekt.fragebogen?.length).toBe(1); expect(e.meldungen).toBeUndefined(); }
    const mehr = zipSync({ ...Object.fromEntries(Object.entries(await (await import('fflate')).unzipSync(projektAlsDatei(p)))), 'neu.bin': Uint8Array.of(1) });
    const e2 = await leseDatei(new File([mehr as BlobPart], 'm.statable'));
    if (e2.art === 'projekt') expect(e2.meldungen?.map(m => m.name)).toEqual(['neu.bin']); else expect.unreachable();
  });
  it('Fassung 2: statable.json bleibt der erste Eintrag, auch mit mehreren Bildern; Bilder sind ungepackt, Text gepackt', () => {
    const bild = Uint8Array.from({ length: 5000 }, () => 7);   // gut packbar: wäre gepackt viel kleiner
    const p: Projekt = { name: 'x', quelle: '', sav: new Uint8Array(3000), blaetter: [], entscheid: {}, zeit: 1, fragebogen: [plan([seite('s1', [frage('A')])])], fragebogenBilder: { 'p-1/a.png': bild, 'p-1/b.png': bild } };
    const b = projektAlsDatei(p);
    expect(new TextDecoder().decode(b.subarray(30, 30 + 13))).toBe('statable.json');
    expect(b.length).toBeGreaterThan(2 * bild.length);   // zwei Bilder ungepackt
    const d = dv(b); const methoden: Record<string, number> = {};
    for (let i = 0; i + 30 < b.length; i++) if (d.getUint32(i, true) === 0x04034b50) { const nl = d.getUint16(i + 26, true); methoden[new TextDecoder().decode(b.subarray(i + 30, i + 30 + nl))] = d.getUint16(i + 8, true); }
    expect(methoden['fragebogen/p-1/a.png']).toBe(0);
    expect(methoden['projekt.json']).toBe(8); expect(methoden['fragebogen/p-1.json']).toBe(8);
  });
});
