import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { istXlsform, planAusXlsform, variablenAusPlan, ordneSpalten, abbildungsBefehl, kodebuchAusPlan } from './fragebogenplan';
import { s } from './sitzung.svelte';

/* ===== Paket 1C, Nachtrag Nr. 6: eine öffentlich lizenzierte XLSForm (pyxform, BSD 2-Clause; Herkunft in testdaten/dienste/LIESMICH.md) wird ohne Ausnahme gelesen.
 * Die Datei ist von pyxform 4.5.0 angenommen („Conversion complete!“). Sie benutzt alte Typnamen (string, int, trigger, select one from list, select all that apply from list) und
 * Typen, die Statable überspringt (geopoint, barcode, image, audio, video, time, dateTime). */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const bytes = () => { const b = readFileSync(new URL('./testdaten/dienste/xlsform/pyxform-widgets.xlsx', import.meta.url)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; };

describe('öffentliche XLSForm (pyxform widgets.xlsx)', () => {
  it('istXlsform: ja; planAusXlsform liest ohne Ausnahme, übersprungene Typen stehen in den Meldungen', async () => {
    expect(await istXlsform(bytes())).toBe(true);
    const { plan, meldungen } = await planAusXlsform(bytes(), 'pyxform-widgets.xlsx');
    expect(plan.sprachen).toEqual(['default']);
    const namen = plan.elemente.flatMap(x => x.elemente).map(e => e.name);
    expect(namen).toContain('my_select'); expect(namen).toContain('my_string'); expect(namen).not.toContain('my_geopoint');
    const uebers = meldungen.filter(m => m.art === 'uebersprungen').map((m: any) => m.name);
    expect(uebers).toEqual(expect.arrayContaining(['my_geopoint', 'my_barcode', 'my_image', 'my_audio', 'my_video', 'locationMap', 'dateTime']));
    for (const m of meldungen) { expect(m.satz.length).toBeGreaterThan(10); expect(m.satz).not.toMatch(/NaN|undefined/); }
  });
  it('alte Typnamen werden wie bei pyxform gelesen; Gruppen sind Seiten; Variablen und Zuordnung laufen ohne Ausnahme', async () => {
    const { plan } = await planAusXlsform(bytes(), 'pyxform-widgets.xlsx');
    const f = (n: string) => plan.elemente.flatMap(x => x.elemente).find(e => e.name === n) as any;
    expect(f('my_string')).toMatchObject({ typ: 'text' }); expect(f('my_int')).toMatchObject({ typ: 'zahl', zahl: { ganz: true } });
    expect(f('my_trigger')).toMatchObject({ typ: 'einwilligung' }); expect(f('my_select')).toMatchObject({ typ: 'mehrfach', liste: 'list' }); expect(f('my_select1')).toMatchObject({ typ: 'einfach', liste: 'list2' });
    expect(plan.elemente.map(x => x.name)).toEqual(expect.arrayContaining(['table_list_test', 'happy_sad_table']));
    const v = variablenAusPlan(plan);
    expect(v.map(x => x.name)).toEqual(expect.arrayContaining(['my_select_1', 'my_select_4', 'my_select1', 'my_int']));
    expect(new Set(v.map(x => x.name.toLowerCase())).size).toBe(v.length);
    const r = ordneSpalten(plan, ['my_int', 'table_list_test/table_list_1', 'unbekannt']);
    expect(r.zuordnung.map(z => z.variable)).toEqual(['my_int', 'table_list_1']); expect(r.unzugeordnet).toEqual(['unbekannt']);
  });
  it('Kodebuch aus Plan und Zuordnung: Text-Namen verlangen die Abbildung, ganzzahlige Listen behalten ihre Codes', async () => {
    const { plan } = await planAusXlsform(bytes(), 'pyxform-widgets.xlsx');
    const tabelle = { kopf: ['my_select1', 'table_list_test/table_list_1'], zeilen: [[8, 'yes'], [3, 'no']], quelle: 'x' };
    const k = kodebuchAusPlan(plan, ordneSpalten(plan, tabelle.kopf).zuordnung, tabelle);
    expect(k.kodebuch.spalten['my_select1']!.werteLabels).toMatchObject({ '8': 'option 8' });
    expect(k.abbildungen.map(a => [a.liste, a.spalten])).toEqual([['yes_no', ['table_list_test/table_list_1']]]);
    expect(k.kodebuch.spalten['table_list_test/table_list_1']!.werteLabels).toBeUndefined();
    const a = k.abbildungen[0]!;
    const r = abbildungsBefehl('q1', 'q1_zahl', a, ['yes', 'no'], false, 'Frage 1') as { befehl: string };
    expect(r.befehl).toContain("RECODE q1 ('yes'=1) ('no'=2) INTO q1_zahl.");
    expect(r.befehl).toContain('VALUE LABELS q1_zahl 1 ');
    expect(abbildungsBefehl('q1', 'q1_zahl', a, ['yes', 'vielleicht'], false)).toEqual({ offen: ['vielleicht'] });
  });
  it('Einschleusversuch: Anführungszeichen und Zeilenumbrüche in Antworten gelangen nur über zit in den Befehl', async () => {
    const { plan } = await planAusXlsform(bytes(), 'pyxform-widgets.xlsx');
    const k = kodebuchAusPlan(plan, ordneSpalten(plan, ['table_list_test/table_list_1']).zuordnung, { kopf: ['table_list_test/table_list_1'], zeilen: [['yes']], quelle: 'x' });
    const a = { ...k.abbildungen[0]!, optionen: [{ name: "x'.\nCOMPUTE a=1.\n*'", text: "Ja'.\nCOMPUTE b=2.", code: 1 }] };
    const r = abbildungsBefehl('q1', 'q1_zahl', a, ["x'.\nCOMPUTE a=1.\n*'"], false) as { befehl: string };
    expect(r.befehl.split('\n').filter(z => /^COMPUTE/i.test(z.trim()))).toEqual([]);
  });
});
