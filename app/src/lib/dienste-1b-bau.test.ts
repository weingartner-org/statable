import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { nodeEngine } from './testengine';
import { dekodiere, leseCsv, leseTabellenkalkulation, zurEngine, type Tabelle } from './einlesen';
import { erkenneFragebogen, vorschlagSatz, mehrfachWerte } from './fragebogen';
import { pruefeMehrfachZelle, vorbelegung, endergebnis } from './dienste/mehrfachzelle';
import { mehrfachZelleBefehle, kennzeichenBefehle, zuKennzeichnen } from './dienste/mehrfachzelle-befehle';
import { fallBedingungen } from './dienste/casenum';
import { planAusXlsform, ordneSpalten, kodebuchAusPlan } from './fragebogenplan';
import { wendeKodebuchAn } from './kodebuch';
import { mehrfachRechnen } from './mehrfach';
import { FragebogenImport } from './fragebogenimport.svelte';
import { parseCsv } from '../dialogs/csv';
import { s } from './sitzung.svelte';

/* ===== Paket 1B (Bauer): eigene Tests zu dem, was der Prüfer nicht abdeckt.
 * Optionsliste bearbeiten (Google „Water, still“), Entscheidung für unklare Zeilen, Befehle gegen die PSPP-Engine (auch mit bösem Text), Kobo-Nachträge (Sammelspalte, True/False),
 * Trennung der Meldungen von .sps und XLSForm im Dialog-Zustand, CryptPad-JSON im Dialog-Zustand. Alles nach Dokumentation bzw. Quellcode, nicht an echten Exporten geprüft. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';

let m: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { m = await nodeEngine(); });
const fehler = (items: any[]) => items.filter(i => i.type === 'message' && i.severity === 'error').map(i => i.text);
const buf = (pfad: string) => { const b = readFileSync(new URL(`./testdaten/dienste/${pfad}`, import.meta.url)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; };
const csv = (pfad: string): Tabelle => leseCsv(dekodiere(new Uint8Array(buf(pfad))), pfad);
const google = (zellen: string[]): Tabelle => {
  const zeilen = zellen.map((z, i) => [`1/${i + 1}/2024 10:00:${String(i).padStart(2, '0')}`, z]);
  return leseCsv(['Timestamp,Q', ...zeilen.map(z => z.map(c => (c.includes(',') ? `"${c}"` : c)).join(','))].join('\n'), 'google-klein.csv');
};
const mz = (e: ReturnType<typeof erkenneFragebogen>) => e.vorschlaege.find((v: any) => v.art === 'mehrfachZelle') as any;

describe('Optionsliste: Teile zusammenführen, danach neu aufteilen (Entscheid 2)', () => {
  const zellen = ['Water, still', 'Tea, Water, still', 'Tea, Coffee', 'Tea, Coffee', 'Water, still', 'Coffee, Water, still'];
  it('ohne Zusammenführen zerfällt „Water, still“ in „Water“ und „still“', () => {
    const e = erkenneFragebogen(google(zellen)); expect(mz(e).optionen).toEqual(['Water', 'still', 'Tea', 'Coffee']);
  });
  it('mit der Liste Tea, Coffee, „Water, still“: richtig erkannt, nichts unklar, kein Rest', () => {
    const e = erkenneFragebogen(google(zellen)); const sp = mz(e).spalte;
    const i = e.spalten.findIndex(x => x.name === sp), spalte = e.tabelle.zeilen.map(z => z[i]);
    const erg = pruefeMehrfachZelle(spalte, ', ', ['Tea', 'Coffee', 'Water, still'])!;
    expect(erg.optionen).toEqual(['Tea', 'Coffee', 'Water, still']); expect(erg.anders).toBe(false); expect(erg.unklar).toEqual([]);
    expect(endergebnis(erg).werte).toEqual([[0, 0, 1], [1, 0, 1], [1, 1, 0], [1, 1, 0], [0, 0, 1], [0, 1, 1]]);
  });
  it('eine ergänzte Option („Soda“) und der Fall ohne Option: leere Liste gibt null', () => {
    expect(pruefeMehrfachZelle(['A, B', 'A, Soda'], ', ', ['A', 'Soda'])!.zeilen[1]!.gewaehlt).toEqual([0, 1]);
    expect(pruefeMehrfachZelle(['A, B'], ', ', [])).toBeNull(); expect(pruefeMehrfachZelle(['A, B'], ', ', ['  '])).toBeNull();
  });
  it('Microsoft: Option mit „;“ im Namen lässt sich zusammenführen; Trenner ohne Leerzeichen', () => {
    const erg = pruefeMehrfachZelle(['a;b;', 'x;y;a;b', 'x;y'], ';', ['a;b', 'x;y'])!; expect(erg.zeilen.map(z => z!.gewaehlt)).toEqual([[0], [0, 1], [1]]); expect(erg.anders).toBe(false);
  });
  it('Zahlen- und Datumszellen: keine Mehrfachauswahl (null), Eingabe unverändert', () => {
    const z = ['A, B', 5 as unknown as string]; const vorher = JSON.stringify(z); expect(pruefeMehrfachZelle(z, ', ')).toBeNull(); expect(JSON.stringify(z)).toBe(vorher);
  });
});

describe('Unklare Zeilen: Voreinstellung und Entscheidung der Person', () => {
  const erg = pruefeMehrfachZelle(['Tea, Coffee', 'Tea, Coffee', 'Tea, Soda, Cola', 'Coffee'], ', ')!;
  it('Voreinstellung: gefundene Optionen angekreuzt, Rest als Anderes', () => {
    expect(erg.unklar).toEqual([2]); expect(vorbelegung(erg)).toEqual({ 2: { optionen: [true, false], anders: true } });
    const r = endergebnis(erg); expect(r.werte[2]).toEqual([1, 0]); expect(r.anders).toEqual([null, null, 'Soda, Cola', null]);
  });
  it('Entscheidung: Tee abwählen, Rest nicht als Anderes → nichts angekreuzt, kein Text', () => {
    const r = endergebnis(erg, { 2: { optionen: [false, false], anders: false } }); expect(r.werte[2]).toEqual([0, 0]); expect(r.anders[2]).toBeNull();
  });
  it('Nextcloud-Präfix wird nur beim Schreiben entfernt', () => {
    const e2 = pruefeMehrfachZelle(['A; B', 'A; B', 'A; system-other-answer:Pizza'], '; ')!;
    expect(e2.zeilen[2]!.rest).toBe('system-other-answer:Pizza'); expect(endergebnis(e2, {}, /^system-other-answer:\s*/).anders[2]).toBe('Pizza');
  });
  it('Sätze nennen „nicht eindeutig“ nur bei unklaren Zeilen', () => {
    const e = erkenneFragebogen(google(['A, B', 'A, B', 'A, X, Y', 'A'])); const v = mz(e); expect(v.unklar).toEqual([2]); expect(vorschlagSatz(v)).toMatch(/nicht eindeutig/);
    const e3 = erkenneFragebogen(google(['A, B', 'A, B', 'A', 'B'])); expect(vorschlagSatz(mz(e3))).not.toMatch(/nicht eindeutig/);
  });
});

describe('Befehle gegen die PSPP-Engine (auch mit bösem Text)', () => {
  function lade(t: Tabelle) { const z = zurEngine(t); expect(fehler(m.run('NEW FILE.\n' + z.syntax, { '/import.csv': z.csv }))).toEqual([]); }
  const lies = () => { m.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES."); return parseCsv(new TextDecoder().decode(m.lies('/t.csv'))); };
  it('0/1-Spalten, Text „Anderes“ mit Apostroph und Zeilenumbruch, leere Zelle → 0; nichts wird eingeschleust', () => {
    const boese = "x'\n. DELETE VARIABLES ALL.\n'";
    const t: Tabelle = { kopf: ['Q'], zeilen: [['A;B'], ['A;B'], ['A;' + boese], ['B'], [null]], quelle: 'x.csv' };
    lade(t);
    const erg = pruefeMehrfachZelle(t.zeilen.map(z => z[0]), ';')!;
    expect(erg.optionen).toEqual(['A', 'B']); const r = endergebnis(erg);
    const b = mehrfachZelleBefehle({ spalte: 'Q', frage: 'Frage mit \'Apostroph\'', optionen: erg.optionen, werte: r.werte, anders: r.anders, vorhanden: ['Q'], nein: 'nein', ja: 'ja', anderes: 'anderes' });
    for (const x of b.befehle.join('\n').split('\n')) expect(x).not.toMatch(/^\s*\.\s*DELETE/);
    expect(fehler(m.run(b.befehle.join('\n')))).toEqual([]);
    expect(b.neu).toEqual(['Q_A', 'Q_B']); expect(b.andersSpalte).toBe('Q_anders'); expect(b.nAnders).toBe(1);
    const z = lies(); const kopf = z[0]!; const sp = (n: string) => z.slice(1).map(row => row[kopf.indexOf(n)]!.trim());
    expect(kopf).toEqual(['Q', 'Q_A', 'Q_B', 'Q_anders']); expect(sp('Q_A')).toEqual(['1', '1', '1', '0', '0']); expect(sp('Q_B')).toEqual(['1', '1', '0', '1', '0']);
    expect(sp('Q_anders')[2]).toContain('DELETE VARIABLES ALL'); expect(sp('Q_anders').filter(x => x !== '').length).toBe(1);
  });
  it('doppelte: Gruppe 0 erste Zeile behalten, Gruppe 1 abgewählt (bleibt unverändert), Gruppe 2 die zweite Zeile behalten', () => {
    expect(zuKennzeichnen([[0, 2], [1, 3], [4, 5]], { 1: false }, { 2: 5 })).toEqual([2, 4]);
  });
  it('zuKennzeichnen: behaltene Zeile wählbar, ungültige Wahl fällt auf die erste zurück', () => {
    expect(zuKennzeichnen([[0, 2], [4, 5]], {}, { 1: 5 })).toEqual([2, 4]); expect(zuKennzeichnen([[0, 2]], {}, { 0: 9 })).toEqual([2]); expect(zuKennzeichnen([[0, 1, 2]], {}, {})).toEqual([1, 2]);
  });
  it('kennzeichenBefehle läuft in der Engine', () => {
    lade(leseCsv('Q\na\nb\na\nb\nc', 'x.csv'));
    expect(fehler(m.run(kennzeichenBefehle('doppelt', [2, 3], "Doppelte 'Antwort'", 'nein', 'ja').join('\n')))).toEqual([]);
    const z = lies(); expect(z.slice(1).map(r => r[1]!.trim())).toEqual(['0', '0', '1', '1', '0']);
  });
  it('fallBedingungen: Bereiche, höchstens 20 Teile je Bedingung, doppelte und Unsinn fallen weg', () => {
    expect(fallBedingungen([0, 1, 2, 5, 5, 7])).toEqual(['RANGE($CASENUM, 1, 3) OR $CASENUM = 6 OR $CASENUM = 8']);
    expect(fallBedingungen(Array.from({ length: 50 }, (_, i) => i * 2)).length).toBe(3); expect(fallBedingungen([NaN, 1.5, -0] as number[])).toEqual(['$CASENUM = 1']);
  });
});

describe('Kobo-Nachträge aus Paket 1C', () => {
  const planVon = async (pfad: string) => (await planAusXlsform(buf(pfad), pfad)).plan;
  it('(b) True/False-Optionsspalten → Mehrfachantwort-Set mit Zählwert „True“ aus dem Kodebuch', async () => {
    const p = await planVon('xlsform/mensa.xlsx'), t = csv('kobo/kobo-xml-true-false.csv');
    const { zuordnung } = ordneSpalten(p, t.kopf);
    const { kodebuch, hinweise } = kodebuchAusPlan(p, zuordnung, t, 'kobo');
    expect(kodebuch.spalten['besuch/mahlzeiten/fruehstueck']!.gruppe).toMatchObject({ art: 'mehrfach', zaehlwert: 'True' }); expect(hinweise.join(' ')).not.toMatch(/True\/False/);
    const e = erkenneFragebogen(t, kodebuch); const set = e.vorschlaege.find((v: any) => v.art === 'mehrfachset') as any;
    expect(set).toMatchObject({ name: 'mahlzeiten', zaehlwert: 'True', umkodierung: 'zaehlwert', quelle: 'kodebuch' }); expect(set.spalten.length).toBe(3);
    // mehrfachWerte zählt Text-Zählwert ohne Rücksicht auf Groß/klein; die Rechnung zählt genau
    expect(mehrfachWerte(e, 'mahlzeiten')).toEqual([[1, 1, 0], [0, 1, 0], [0, 0, 0]]);
    const r = mehrfachRechnen({ set: { name: 'mahlzeiten', label: 'Mahlzeiten', spalten: set.spalten, zaehlwert: 'True' }, optionsNamen: ['f', 'm', 'a'], zeilen: t.zeilen.map(z => [2, 3, 4].map(i => z[i] as string)), fehlend: [[], [], []], mitNull: false });
    expect(r.optionen.map(o => o.anzahl)).toEqual([1, 2, 0]); expect(r.faelle).toBe(2); expect(r.antworten).toBe(3);
  });
  it('(b) wendeKodebuchAn legt das Set mit Text-Zählwert an', async () => {
    const p = await planVon('xlsform/mensa.xlsx'), t = csv('kobo/kobo-xml-true-false.csv');
    const { zuordnung } = ordneSpalten(p, t.kopf); const { kodebuch } = kodebuchAusPlan(p, zuordnung, t, 'kobo');
    const sp = (n: string) => ({ name: n, bezeichnung: '', art: 'text' as const, niveau: 'nominal' as const, format: 'A5', fehlend: [] as number[], fehlendText: '', werteLabels: {} });
    const kb2 = { ...kodebuch, spalten: Object.fromEntries(Object.entries(kodebuch.spalten).map(([k, v]) => [k.replace(/\//g, '_'), v])) };
    const r = wendeKodebuchAn({ spalten: ['besuch_mahlzeiten_fruehstueck', 'besuch_mahlzeiten_mittagessen', 'besuch_mahlzeiten_abendessen'].map(sp) as any, zeilen: [] }, kb2, { mehrfachsets: true });
    expect(r.sets).toMatchObject([{ name: 'mahlzeiten', zaehlwert: 'True' }]);
  });
  it('(b) gemischte Schreibweise (True und TRUE) oder 1 und True: kein Set, ein Hinweis', async () => {
    const p = await planVon('xlsform/mensa.xlsx');
    const t: Tabelle = { kopf: ['besuch/mahlzeiten/fruehstueck'], zeilen: [['True'], ['TRUE'], ['False']], quelle: 'x.csv' };
    const { zuordnung } = ordneSpalten(p, t.kopf); const { kodebuch, hinweise } = kodebuchAusPlan(p, zuordnung, t, 'kobo');
    expect(kodebuch.spalten['besuch/mahlzeiten/fruehstueck']!.gruppe).toBeUndefined(); expect(hinweise.length).toBe(1);
  });
  it('(a) nur Sammelspalte mit Leerzeichen und XLSForm: mehrfachZelle mit Trenner „ “ und den Optionen aus dem Plan', async () => {
    const p = await planVon('xlsform/mensa.xlsx');
    const t0 = await leseTabellenkalkulation(buf('kobo/kobo-xml-eins-null.xlsx'), 'k.xlsx');
    const weg = new Set(['besuch/mahlzeiten/fruehstueck', 'besuch/mahlzeiten/mittagessen', 'besuch/mahlzeiten/abendessen']);
    const behalte = t0.kopf.map((k, i) => ({ k, i })).filter(x => !weg.has(x.k));
    const t: Tabelle = { ...t0, kopf: behalte.map(x => x.k), zeilen: t0.zeilen.map(z => behalte.map(x => z[x.i] ?? null)) };
    const { zuordnung } = ordneSpalten(p, t.kopf); const { kodebuch, hinweise } = kodebuchAusPlan(p, zuordnung, t, 'kobo');
    expect(kodebuch.spalten['besuch/mahlzeiten']!.mehrfachZelle).toEqual({ trenner: ' ', optionen: ['fruehstueck', 'mittagessen', 'abendessen'] });
    expect(hinweise.join(' ')).not.toMatch(/mehrere Antworten in einer Zelle/);
    const e = erkenneFragebogen(t, kodebuch); const v = mz(e);
    expect(v).toMatchObject({ trenner: ' ', optionen: ['fruehstueck', 'mittagessen', 'abendessen'], anders: false, unklar: [] });
    // ohne Plan: nie ein Vorschlag (Freitext mit Leerzeichen würde sonst aufgeteilt)
    expect(erkenneFragebogen(t).vorschlaege.some((x: any) => x.art === 'mehrfachZelle')).toBe(false);
  });
});

describe('Dialog-Zustand (FragebogenImport)', () => {
  const datei = (text: string, name: string) => new File([text], name);
  it('Google-CSV: Voreinstellungen, Optionsliste bearbeiten (Zusammenführen, Ergänzen, Entfernen), Entscheidung', async () => {
    const fb = new FragebogenImport();
    const r = await fb.pruefe(datei(readFileSync(new URL('./testdaten/dienste/googleforms/googleforms-en.csv', import.meta.url), 'utf8'), 'g.csv'));
    expect(r.offen).toBe(true); expect(fb.erk!.sicher).toBe(false);
    const ids = fb.erk!.vorschlaege.filter(v => v.art === 'mehrfachZelle').map(v => v.id);
    expect(ids.length).toBe(3); for (const id of ids) expect(fb.wahl.haken[id], 'bei „vermutlich“ nie vorangekreuzt').toBe(false);
    expect(fb.wahl.haken['doppelte']).toBe(true);
    const kontakt = ids.find(id => fb.mz[id]!.optionen.includes('any way'))!;
    expect(fb.mz[kontakt]!.optionen).toEqual(['Mail', 'Phone', 'Yes', 'any way']);
    expect(fb.mzZusammen(kontakt, 'Yes', 'any way')).toBe(true); expect(fb.mz[kontakt]!.optionen).toEqual(['Mail', 'Phone', 'Yes, any way']);
    expect(fb.mz[kontakt]!.erg.unklar).toEqual([]); expect(fb.mz[kontakt]!.erg.anders).toBe(false);
    expect(fb.mzZusammen(kontakt, 'Mail', 'Mail')).toBe(false);
    expect(fb.mzDazu(kontakt, 'Fax')).toBe(true); expect(fb.mzDazu(kontakt, 'Fax')).toBe(false); expect(fb.mzDazu(kontakt, '  ')).toBe(false);
    expect(fb.mzWeg(kontakt, 'Fax')).toBe(true);
    const getraenke = ids.find(id => fb.mz[id]!.optionen.includes('Tea'))!;
    expect(fb.mz[getraenke]!.erg.unklar).toEqual([3]); expect(fb.mz[getraenke]!.entscheid[3]).toEqual({ optionen: [true, false, false], anders: true });
    fb.mzEntscheide(getraenke, 3, 0, false); fb.mzEntscheide(getraenke, 3, 'anders', false);
    expect(fb.mz[getraenke]!.entscheid[3]).toEqual({ optionen: [false, false, false], anders: false });
    expect(fb.mzZelle(getraenke, 3)).toBe('Tea, Soda, Cola');
    fb.schliesse(); expect(fb.mz).toEqual({});
  });
  it('(c) XLSForm-Fehler und Ladeanzeige stehen NICHT im Kästchen des .sps-Kodebuchs', async () => {
    const fb = new FragebogenImport();
    await fb.pruefe(datei(readFileSync(new URL('./testdaten/dienste/kobo/kobo-xml-true-false.csv', import.meta.url), 'utf8'), 'k.csv'));
    expect(fb.erk!.hersteller).toBe('kobo');
    const p = fb.ladeXlsform(datei('keine;xlsform', 'x.xlsx')); expect(fb.xlsLiest).toBe(true); expect(fb.liest).toBe(false);
    await p; expect(fb.xlsLiest).toBe(false); expect(fb.xlsFehler).not.toBe(''); expect(fb.kbFehler).toBe('');
    const q = fb.ladeKodebuch(datei('kein Kodebuch', 'x.sps')); expect(fb.liest).toBe(true); expect(fb.xlsLiest).toBe(false);
    await q; expect(fb.kbFehler).not.toBe(''); expect(fb.xlsFehler).not.toBe('');   // jede Wahl behält ihre eigene Meldung
    fb.ohneKodebuch(); expect(fb.kbFehler).toBe(''); expect(fb.xlsFehler).toBe('');
  });
  it('CryptPad-JSON: wird erkannt, Fragetexte werden Beschriftungen; anderes JSON öffnet der gewohnte Weg', async () => {
    const fb = new FragebogenImport();
    const r = await fb.pruefe(datei(readFileSync(new URL('./testdaten/dienste/cryptpad/cryptpad-en.json', import.meta.url), 'utf8'), 'c.json'));
    expect(r.offen).toBe(true); expect(fb.erk!.hersteller).toBe('cryptpad'); expect(fb.erk!.beschriftungen).toEqual({ q1: 'How satisfied are you?', q2: 'Any comments?' });
    fb.ohneKodebuch(); expect(fb.erk!.beschriftungen.q1).toBe('How satisfied are you?');
    fb.schliesse();
    expect((await fb.pruefe(datei('{"a":1}', 'x.json'))).offen).toBe(false); expect((await fb.pruefe(datei('kein json', 'x.json'))).offen).toBe(false);
  });
});
