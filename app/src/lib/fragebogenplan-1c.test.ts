import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dekodiere, leseCsv, leseTabellenkalkulation, type Tabelle } from './einlesen';
import { erkenneFragebogen } from './fragebogen';
import { s } from './sitzung.svelte';

/* ===== Paket 1C (Prüfer, ROTE TESTS vor dem Bau): XLSForm lesen → FragebogenPlan, variablenAusPlan, Zuordnung der Kobo- und ODK-Spaltenköpfe, Kobo/Moodle erkennen =====
 * Grundlage: docs/erheben/ARCHITEKTUR-FRAGEBOGEN-PLAN.md (Abschnitte 1 bis 5), docs/erheben/FACHBLATT-STUFE-1.md (Paket 1C), docs/erheben/KOPFZEILEN-DIENSTE.md (Kobo, ODK).
 * Prüfdateien: testdaten/dienste/xlsform/*.xlsx (von pyxform 4.5.0 angenommen, LIESMICH.md dort), testdaten/dienste/kobo/*. Alles erfunden.
 *
 * ---------------------------------- Festlegungen für den Bauer (vom Prüfer; neue Datei lib/fragebogenplan.ts) ----------------------------------
 *  Typen: FragebogenPlan, Lok, Antwortliste, Option, Frage, Block, Hinweis, Seite, PlanVariable wörtlich nach ARCHITEKTUR-FRAGEBOGEN-PLAN.md (PlanVariable extends KodebuchSpalte aus lib/kodebuch.ts + name: string, quelle, typ).
 *  istXlsform(bytes: ArrayBuffer | Uint8Array): Promise<boolean>
 *      true, wenn die Arbeitsmappe ein Blatt `survey` mit den Spalten `type` und `name` und mindestens einer Spalte `label…` hat (Blatt `choices` darf fehlen). Wirft nie.
 *  planAusXlsform(bytes: ArrayBuffer | Uint8Array, dateiname = 'xlsform.xlsx'): Promise<{ plan: FragebogenPlan; meldungen: PlanMeldung[] }>
 *      Keine XLSForm (kein Blatt `survey`, Spalten fehlen, unlesbar): wirft Error mit „keinXlsform“ in der message.
 *  PlanMeldung =
 *      | { art: 'uebersprungen'; name: string; typ: string; satz: string }          nicht unterstützter Typ (geopoint, image, calculate, begin_repeat …; bei begin_repeat EINE Meldung, der Inhalt der Wiederholung wird mit übersprungen)
 *      | { art: 'filterIgnoriert'; name: string; satz: string }                      choice_filter (name = Frage)
 *      | { art: 'relevant'; name: string; text: string; satz: string }               relevant wird nur gelesen: text = die Zelle wörtlich (der Bedingungsbaum kommt in Stufe 2)
 *      | { art: 'uebersetzungFehlt'; name: string; sprache: string; satz: string }   name = Frage-name oder Option-id; in Lok fehlt dann der Schlüssel der Sprache (KEIN Rückfall auf die Standardsprache, Architekturblatt 1)
 *      | { art: 'labelOhneSprache'; satz: string }                                   Spalte `label` ohne `::Sprache` (einmal je Datei)
 *      | { art: 'codeAbbildung'; liste: string; abbildung: [string, number][]; satz: string }   NUR für Listen, deren Namen nicht alle ganze Zahlen sind (name → Code 1 … k in Listenreihenfolge); sichtbar machen, nie still
 *  Plan aus XLSForm (Festlegungen, die das Architekturblatt offen lässt):
 *      plan.format 'statable-fragebogen', version 1, id = UUID v4, revision 1, herkunft { art: 'xlsform', datei: dateiname, zeit: number }, skalen [], einstellungen beliebig,
 *      titel = settings.form_title für JEDE Sprache (settings kennt keinen Titel je Sprache); fehlt settings/form_title: Dateiname ohne Endung.
 *      sprachen: `label::<Name> (<code>)` → code (de, en) in Spaltenreihenfolge; settings.default_language ((code) oder der ganze Name) steht dann vorn. `label` ohne Sprache heißt Sprache 'default' (pyxform nennt sie ebenso), nimmt in der Spaltenreihenfolge ihren Platz ein.
 *      Seiten: jede oberste begin_group wird eine Seite (id `seite:<name>`, name, titel = Label). Fragen ausserhalb einer Gruppe, die hintereinander stehen, bilden eine automatische Seite: name `seite<n>`, id `seite:seite<n>`, n = 1-basierte Stelle unter den obersten Seiten, kein titel.
 *      Frage.id = XLSForm-name, Frage.name = XLSForm-name; Seite/Gruppe ändert den Variablennamen NICHT. Antwortliste.id = Antwortliste.name = list_name, geordnet false (XLSForm weiss es nicht), Option.id = `<liste>:<name>`, Option.wert = Code, Option.text = Lok.
 *      Typen: select_one → einfach, select_multiple → mehrfach, integer → zahl { ganz: true }, decimal → zahl { ganz: false }, text → text, date → datum, range → regler (zahl.min/max/schritt aus `parameters` start/end/step), rank → rangfolge, acknowledge → einwilligung, note → Hinweis (art 'hinweis', text).
 *      kodebuch.niveau: einfach/mehrfach/einwilligung 'nominal' (die Person entscheidet in der Übergabe), zahl/regler/datum 'skala', rangfolge 'ordinal'. `hint` → hilfe, `required: yes` → pflicht { an: true }, `or_other` → anders { an: true, text } und die Option `other` kommt NICHT in die Liste.
 *      Codes: sind alle Namen einer Liste ganze Zahlen (auch als Excel-Zahl), gelten sie als wert (Reihenfolge bleibt die der Liste); sonst 1 … k in der Reihenfolge der Liste (Meldung codeAbbildung).
 *  variablenAusPlan(plan: FragebogenPlan, sprache: string = plan.sprachen[0]): PlanVariable[]    rein, Regeln Architekturblatt 5.1, Reihenfolge = Reihenfolge der Elemente (die Variable `name_anders` unmittelbar nach den Variablen ihrer Frage).
 *      werteLabels: Schlüssel = Code als Text, Wert = Option.text[sprache]. Mehrfach: werteLabels { '0': …, '1': … } (beide nicht leer), gruppe { id: <Fragename>, art: 'mehrfach', zaehlwert: 1 }; Block: gruppe { id: <Blockname>, art: 'itemblock' }.
 *      fehlend: Optionen mit `fehlend` (-7/-8/-9 oder Wert der Option) → KodebuchSpalte.fehlend = [Codes] (nur bei einfach und Block-Items). quelle: { element: <Frage-/Block-id>, option?: <Option-id>, item?: <Item-id>, teil?: 'anders' | 'kommentar' }.
 *      Block-Item: `${blockname}_${itemname}`. Pretest: bei einstellungen.pretest an jeder FRAGE zusätzlich `${name}_kommentar` (typ 'text', rolle 'text', teil 'kommentar'); für Blöcke ist es im Architekturblatt offen und wird hier nicht geprüft.
 *  optionNachName(plan, frageId: string, name: string): Option | null          XLSForm-Name (Kobo „XML values“) → Option der Frage (ohne `other`).
 *  optionNachBeschriftung(plan, frageId: string, text: string, sprache: string): Option | null    Kobo „Labels“: genau gleicher Text (getrimmt) in der Exportsprache.
 *  ankreuzWert(z: string | number | boolean | null | undefined): 0 | 1 | null    1/0 und True/False (Groß/klein egal, auch echte Wahrheitswerte); leer oder anderes → null
 *  ordneSpalten(plan: FragebogenPlan, kopf: string[]): { zuordnung: SpaltenZuordnung[]; unzugeordnet: string[] }
 *      SpaltenZuordnung = { kopf: string; frage: string /* Frage-id *\/; art: 'antwort' | 'sammelspalte' | 'optionsspalte' | 'anders'; option?: string /* Option-id *\/; variable: string | null }
 *      Kobo: `gruppe/frage`, `frage/option` (0/1 oder True/False), `gruppe/frage/option`, `frage` als Sammelspalte (Mehrfach, Leerzeichen; variable null, die Werte werden in die Optionsspalten zerlegt), `<frage>_other` (mit oder ohne Gruppe) → anders.
 *      ODK: `gruppe-frage` (Gruppentrenner „-“). Gruppenpfad darf auch fehlen (Kobo „Include groups“ aus). Trenner „/“ und „-“ gelten beide, ohne dass die Person einen wählt.
 *      zuordnung hat die Reihenfolge von kopf; unzugeordnet = alle übrigen Köpfe (auch Metaspalten) in der Reihenfolge von kopf; unbekannte Frage oder Option ordnet NICHT zu.
 *      Der ODK-Spaltenkopf einer aufgeteilten oder ungeteilten Mehrfachauswahl ist nicht belegt und wird nicht geprüft.
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';

let mod: any = {};
beforeAll(async () => { const pfad = './fragebogenplan'; mod = await import(/* @vite-ignore */ pfad).catch(() => ({})); });
const f = (name: string): any => { const x = mod[name]; if (typeof x !== 'function') throw new Error(`lib/fragebogenplan.ts: Funktion ${name} fehlt`); return x; };

const bytes = (pfad: string) => { const b = readFileSync(new URL(`./testdaten/dienste/${pfad}`, import.meta.url)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; };
const tabelleXlsx = (pfad: string): Promise<Tabelle> => leseTabellenkalkulation(bytes(pfad), pfad);
const csv = (pfad: string): Tabelle => leseCsv(dekodiere(new Uint8Array(bytes(pfad))), pfad);
const plan = async (pfad: string): Promise<{ plan: any; meldungen: any[] }> => f('planAusXlsform')(bytes(pfad), pfad.split('/').pop());
const alleElemente = (p: any): any[] => p.elemente.flatMap((x: any) => (x.art === 'seite' ? x.elemente : [x]));
const frage = (p: any, name: string) => { const x = alleElemente(p).find((e: any) => e.name === name); expect(x, `Element „${name}“ fehlt im Plan`).toBeTruthy(); return x; };
const liste = (p: any, id: string) => { const x = p.antwortlisten.find((l: any) => l.id === id); expect(x, `Antwortliste „${id}“ fehlt`).toBeTruthy(); return x; };
const arten = (m: any[], art: string) => m.filter(x => x.art === art);

/* ------------------------------------------------------------------ XLSForm lesen */
describe('istXlsform: Blatt survey mit type, name, label …', () => {
  it('die drei XLSForm-Dateien ja; Microsoft-, Kobo-Exporte nein; Datenmüll nein, wirft nie', async () => {
    for (const d of ['xlsform/mensa.xlsx', 'xlsform/mensa-grenzfaelle.xlsx', 'xlsform/mensa-geopoint.xlsx']) expect(await f('istXlsform')(bytes(d)), d).toBe(true);
    for (const d of ['msforms/msforms-en.xlsx', 'kobo/kobo-xml-eins-null.xlsx']) expect(await f('istXlsform')(bytes(d)), d).toBe(false);
    expect(await f('istXlsform')(new Uint8Array([1, 2, 3]))).toBe(false);
  });
  it('planAusXlsform wirft bei einer Datei, die keine XLSForm ist, „keinXlsform“', async () => {
    await expect(f('planAusXlsform')(bytes('msforms/msforms-en.xlsx'), 'x.xlsx')).rejects.toThrow(/keinXlsform/);
  });
});

describe('XLSForm mensa.xlsx → FragebogenPlan (Fragen, Listen, Sprachen, Gruppen)', () => {
  it('Kopf des Plans: Format, Sprachen mit Standardsprache (settings.default_language), Titel, Herkunft', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx');
    expect(p).toMatchObject({ format: 'statable-fragebogen', version: 1, revision: 1, sprachen: ['de', 'en'], titel: { de: 'Mensa-Umfrage', en: 'Mensa-Umfrage' }, skalen: [], herkunft: { art: 'xlsform', datei: 'mensa.xlsx' } });
    expect(p.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/); expect(typeof p.herkunft.zeit).toBe('number');
  });
  it('Seiten: die Gruppe „besuch“ ist eine Seite, die übrigen Fragen bilden die automatische Seite „seite2“; Fragen in Reihenfolge', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx');
    expect(p.elemente.map((x: any) => [x.art, x.id, x.name])).toEqual([['seite', 'seite:besuch', 'besuch'], ['seite', 'seite:seite2', 'seite2']]);
    expect(p.elemente[0].titel).toEqual({ de: 'Ihr Besuch', en: 'Your visit' }); expect(p.elemente[1].titel).toBeUndefined();
    expect(p.elemente[0].elemente.map((x: any) => x.name)).toEqual(['mahlzeiten', 'zufrieden', 'verkehr']);
    expect(p.elemente[1].elemente.map((x: any) => x.name)).toEqual(['alter', 'entfernung', 'kommentar', 'termin', 'schmeckt', 'prio', 'einv', 'danke']);
  });
  it('Fragetypen, Pflicht, Hilfe, Zahlen, Regler, or_other', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx');
    const typ = Object.fromEntries(alleElemente(p).filter((e: any) => e.art === 'frage').map((e: any) => [e.name, e.typ]));
    expect(typ).toEqual({ mahlzeiten: 'mehrfach', zufrieden: 'einfach', verkehr: 'einfach', alter: 'zahl', entfernung: 'zahl', kommentar: 'text', termin: 'datum', schmeckt: 'regler', prio: 'rangfolge', einv: 'einwilligung' });
    expect(frage(p, 'mahlzeiten')).toMatchObject({ id: 'mahlzeiten', liste: 'mahlzeit', text: { de: 'Welche Mahlzeiten essen Sie meistens?', en: 'Which meals do you usually eat?' }, pflicht: { an: true }, kodebuch: { niveau: 'nominal' } });
    expect(frage(p, 'zufrieden')).toMatchObject({ liste: 'zufrieden', kodebuch: { niveau: 'nominal' } }); expect(frage(p, 'zufrieden').pflicht).toBeUndefined();
    expect(frage(p, 'alter')).toMatchObject({ zahl: { ganz: true }, pflicht: { an: true }, hilfe: { de: 'Bitte in Jahren', en: 'Please give years' }, kodebuch: { niveau: 'skala' } });
    expect(frage(p, 'entfernung').zahl.ganz).toBe(false);
    expect(frage(p, 'schmeckt')).toMatchObject({ zahl: { min: 0, max: 10, schritt: 1 }, kodebuch: { niveau: 'skala' } });
    expect(frage(p, 'prio')).toMatchObject({ liste: 'prioritaet', kodebuch: { niveau: 'ordinal' } });
    expect(frage(p, 'verkehr').anders).toMatchObject({ an: true }); expect(frage(p, 'zufrieden').anders).toBeUndefined();
    expect(frage(p, 'danke')).toMatchObject({ art: 'hinweis', text: { de: 'Danke für Ihre Teilnahme.', en: 'Thank you for taking part.' } });
  });
  it('Antwortlisten: Namen als Text → Codes 1 bis k in Listenreihenfolge; ganzzahlige Namen gelten (auch absteigend); `other` kommt nicht in die Liste', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx');
    expect(p.antwortlisten.map((l: any) => l.id).sort()).toEqual(['mahlzeit', 'prioritaet', 'verkehr', 'zufrieden']);
    expect(liste(p, 'mahlzeit').optionen.map((o: any) => [o.id, o.wert, o.text.de, o.text.en])).toEqual([['mahlzeit:fruehstueck', 1, 'Frühstück', 'Breakfast'], ['mahlzeit:mittagessen', 2, 'Mittagessen', 'Lunch'], ['mahlzeit:abendessen', 3, 'Abendessen', 'Dinner']]);
    expect(liste(p, 'zufrieden').optionen.map((o: any) => [o.id, o.wert, o.text.de])).toEqual([['zufrieden:5', 5, 'Sehr zufrieden'], ['zufrieden:4', 4, 'Zufrieden'], ['zufrieden:3', 3, 'Teils, teils'], ['zufrieden:2', 2, 'Unzufrieden'], ['zufrieden:1', 1, 'Sehr unzufrieden']]);
    expect(liste(p, 'verkehr').optionen.map((o: any) => [o.id, o.wert])).toEqual([['verkehr:bus', 1], ['verkehr:bahn', 2], ['verkehr:rad', 3]]);
    for (const l of p.antwortlisten) { expect(l.geordnet, l.id).toBe(false); expect(l.name).toBe(l.id); }
  });
  it('Meldungen: die Abbildung Text → Code steht sichtbar da (nicht für „zufrieden“), relevant als Text; nichts übersprungen', async () => {
    const { meldungen: m } = await plan('xlsform/mensa.xlsx');
    expect(arten(m, 'codeAbbildung').map(x => [x.liste, x.abbildung]).sort((a, b) => a[0].localeCompare(b[0]))).toEqual([
      ['mahlzeit', [['fruehstueck', 1], ['mittagessen', 2], ['abendessen', 3]]], ['prioritaet', [['preis', 1], ['geschmack', 2], ['naehe', 3]]], ['verkehr', [['bus', 1], ['bahn', 2], ['rad', 3]]]]);
    expect(arten(m, 'relevant')).toMatchObject([{ name: 'kommentar', text: '${zufrieden} <= 2' }]);
    for (const art of ['uebersprungen', 'filterIgnoriert', 'uebersetzungFehlt', 'labelOhneSprache']) expect(arten(m, art), art).toEqual([]);
    for (const x of m) { expect(typeof x.satz).toBe('string'); expect(x.satz.length).toBeGreaterThan(10); expect(x.satz).not.toMatch(/NaN|undefined|\$\{(?!zufrieden)/); }
  });
  it('jeder Text (Frage, Option, Seite, Hinweis) hat BEIDE Sprachen (nichts fällt still auf die Standardsprache zurück)', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx');
    const loks = [...alleElemente(p).map((e: any) => e.text), ...p.antwortlisten.flatMap((l: any) => l.optionen.map((o: any) => o.text)), p.elemente[0].titel];
    for (const l of loks) { expect(l.de?.length, JSON.stringify(l)).toBeGreaterThan(0); expect(l.en?.length, JSON.stringify(l)).toBeGreaterThan(0); }
  });
});

describe('XLSForm Grenzfälle: gemischte Namen, fehlende Übersetzung, label ohne Sprache, choice_filter', () => {
  it('`label` ohne Sprache neben `label::English (en)`: Sprache „default“ und „en“, eine Meldung', async () => {
    const { plan: p, meldungen: m } = await plan('xlsform/mensa-grenzfaelle.xlsx');
    expect(p.sprachen).toEqual(['default', 'en']); expect(arten(m, 'labelOhneSprache').length).toBe(1);
    expect(frage(p, 'stadtteil').text).toEqual({ default: 'Welcher Stadtteil?', en: 'Which district?' });
  });
  it('Liste mit gemischten Namen (3, 1, andere): Codes nach Listenreihenfolge 1, 2, 3, mit Meldung', async () => {
    const { plan: p, meldungen: m } = await plan('xlsform/mensa-grenzfaelle.xlsx');
    expect(liste(p, 'ort').optionen.map((o: any) => [o.id, o.wert])).toEqual([['ort:3', 1], ['ort:1', 2], ['ort:andere', 3]]);
    expect(arten(m, 'codeAbbildung').find(x => x.liste === 'ort')?.abbildung).toEqual([['3', 1], ['1', 2], ['andere', 3]]);
  });
  it('fehlende Übersetzung: Schlüssel fehlt in Lok und wird gemeldet (Frage und Option); choice_filter wird ignoriert und gemeldet', async () => {
    const { plan: p, meldungen: m } = await plan('xlsform/mensa-grenzfaelle.xlsx');
    expect(frage(p, 'strasse').text).toEqual({ default: 'Welche Straße?' });
    const nordweg = liste(p, 'strasse').optionen.find((o: any) => o.id === 'strasse:nordweg'); expect(nordweg.text).toEqual({ default: 'Nordweg' });
    expect(arten(m, 'uebersetzungFehlt').map(x => [x.name, x.sprache]).sort()).toEqual([['strasse', 'en'], ['strasse:nordweg', 'en']]);
    expect(arten(m, 'filterIgnoriert')).toMatchObject([{ name: 'strasse' }]);
    expect(liste(p, 'strasse').optionen.length).toBe(2);   // der Filter ändert die Liste nicht
  });
});

describe('XLSForm mit nicht unterstützten Typen: übersprungen UND gemeldet', () => {
  it('geopoint, image, calculate, begin_repeat (mit Inhalt) fehlen im Plan und stehen in den Meldungen; der Rest bleibt', async () => {
    const { plan: p, meldungen: m } = await plan('xlsform/mensa-geopoint.xlsx');
    expect(p.sprachen).toEqual(['en']);
    expect(alleElemente(p).map((e: any) => e.name)).toEqual(['titel', 'wiederkommen']);
    expect(p.elemente.map((x: any) => x.name)).toEqual(['seite1']);
    expect(arten(m, 'uebersprungen').map(x => [x.name, x.typ])).toEqual([['standort', 'geopoint'], ['foto', 'image'], ['doppelt', 'calculate'], ['kinder', 'begin_repeat']]);
    expect(liste(p, 'ja_nein').optionen.map((o: any) => [o.id, o.wert])).toEqual([['ja_nein:ja', 1], ['ja_nein:nein', 2]]);
    expect(frage(p, 'wiederkommen').text).toEqual({ en: 'Will you come back?' });
  });
});

/* ------------------------------------------------------------------ variablenAusPlan */
describe('variablenAusPlan nach Architekturblatt 5.1 (Plan aus mensa.xlsx)', () => {
  const namen = (v: any[]) => v.map(x => x.name);
  it('Namen und Reihenfolge: Mehrfach → name_wert, anders → name_anders, Rangfolge → name_wert', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx');
    expect(namen(f('variablenAusPlan')(p, 'de'))).toEqual(['mahlzeiten_1', 'mahlzeiten_2', 'mahlzeiten_3', 'zufrieden', 'verkehr', 'verkehr_anders', 'alter', 'entfernung', 'kommentar', 'termin', 'schmeckt', 'prio_1', 'prio_2', 'prio_3', 'einv']);
  });
  it('Mehrfach: 0/1 beschriftet, nominal, Set-Gruppe mit Zählwert 1, Quelle nennt Frage und Option', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx'); const v = f('variablenAusPlan')(p, 'de');
    const m2 = v.find((x: any) => x.name === 'mahlzeiten_2');
    expect(m2).toMatchObject({ typ: 'zahl', niveau: 'nominal', gruppe: { id: 'mahlzeiten', art: 'mehrfach', zaehlwert: 1 }, quelle: { element: 'mahlzeiten', option: 'mahlzeit:mittagessen' } });
    expect(Object.keys(m2.werteLabels).sort()).toEqual(['0', '1']); expect(m2.werteLabels['0'].length).toBeGreaterThan(0); expect(m2.werteLabels['1'].length).toBeGreaterThan(0);
    expect(typeof m2.label).toBe('string'); expect(m2.label.length).toBeGreaterThan(0);
  });
  it('Einfachauswahl: Wertelabels in der gewählten Sprache; anders: Text-Variable mit Rolle text', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx'); const de = f('variablenAusPlan')(p, 'de'), en = f('variablenAusPlan')(p, 'en');
    expect(de.find((x: any) => x.name === 'zufrieden')).toMatchObject({ typ: 'zahl', niveau: 'nominal', werteLabels: { '5': 'Sehr zufrieden', '4': 'Zufrieden', '3': 'Teils, teils', '2': 'Unzufrieden', '1': 'Sehr unzufrieden' }, quelle: { element: 'zufrieden' } });
    expect(en.find((x: any) => x.name === 'zufrieden').werteLabels).toEqual({ '5': 'Very satisfied', '4': 'Satisfied', '3': 'Neither', '2': 'Dissatisfied', '1': 'Very dissatisfied' });
    expect(de.find((x: any) => x.name === 'verkehr').werteLabels).toEqual({ '1': 'Bus', '2': 'Bahn', '3': 'Fahrrad' });
    expect(de.find((x: any) => x.name === 'verkehr_anders')).toMatchObject({ typ: 'text', rolle: 'text', quelle: { element: 'verkehr', teil: 'anders' } });
  });
  it('Zahl, Regler, Text, Datum, Rangfolge, Einwilligung: Typ und Messniveau', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx'); const v = f('variablenAusPlan')(p, 'de'); const g = (n: string) => v.find((x: any) => x.name === n);
    expect(g('alter')).toMatchObject({ typ: 'zahl', niveau: 'skala' }); expect(g('entfernung')).toMatchObject({ typ: 'zahl', niveau: 'skala' }); expect(g('schmeckt')).toMatchObject({ typ: 'zahl', niveau: 'skala' });
    expect(g('kommentar')).toMatchObject({ typ: 'text', rolle: 'text', niveau: 'nominal' }); expect(g('termin')).toMatchObject({ typ: 'datum', niveau: 'skala' });
    expect(g('prio_2')).toMatchObject({ typ: 'zahl', niveau: 'ordinal', quelle: { element: 'prio', option: 'prioritaet:geschmack' } });
    expect(g('einv')).toMatchObject({ typ: 'zahl', niveau: 'nominal' }); expect(Object.keys(g('einv').werteLabels)).toEqual(['1']);
  });
  it('rein: gleicher Plan, gleiche Variablen; der Plan bleibt unverändert; Standardsprache ohne zweites Argument', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx'); const vorher = JSON.stringify(p);
    const a = f('variablenAusPlan')(p, 'de'), b = f('variablenAusPlan')(p, 'de');
    expect(a).toEqual(b); expect(JSON.stringify(p)).toBe(vorher); expect(f('variablenAusPlan')(p)).toEqual(a);
  });
});

describe('variablenAusPlan: Block, negative Codes, Fehlendcodes, Pretest (von Hand gebauter Plan)', () => {
  const lok = (de: string) => ({ de });
  const bau = (pretest: boolean): any => ({
    format: 'statable-fragebogen', version: 1, id: 'p1', revision: 1, titel: lok('T'), sprachen: ['de'], geaendert: 0,
    einstellungen: { fortschritt: true, zurueck: true, pretest, fehlendFilter: 'code' }, skalen: [],
    antwortlisten: [
      { id: 'l3', name: 'l3', geordnet: true, optionen: [{ id: 'o1', wert: 1, text: lok('stimme nicht zu') }, { id: 'o2', wert: 2, text: lok('teils') }, { id: 'o3', wert: 3, text: lok('stimme zu') }, { id: 'o9', wert: -9, text: lok('keine Angabe'), fehlend: 'keineAngabe' }] },
      { id: 'lw', name: 'lw', geordnet: false, optionen: [{ id: 'a', wert: 1, text: lok('Auto') }, { id: 'b', wert: 2, text: lok('Bahn') }, { id: 'n', wert: -8, text: lok('weiß nicht'), fehlend: 'weissNicht', ausschliessend: true }] }
    ],
    elemente: [{ art: 'seite', id: 's1', name: 's1', elemente: [
      { art: 'block', id: 'b1', name: 'zuf', text: lok('Wie zufrieden?'), liste: 'l3', kodebuch: { niveau: 'ordinal' }, items: [{ id: 'i1', name: 'essen', text: lok('Essen') }, { id: 'i2', name: 'service', text: lok('Service'), umgepolt: true }] },
      { art: 'frage', id: 'f1', name: 'weg', typ: 'mehrfach', text: lok('Wie kommen Sie?'), liste: 'lw', anders: { an: true, text: lok('Anderes') }, kodebuch: { niveau: 'nominal' } },
      { art: 'frage', id: 'f2', name: 'ein', typ: 'einfach', text: lok('Zustimmung?'), liste: 'l3', kodebuch: { niveau: 'ordinal' } }
    ] }]
  });
  it('Block: je Item blockname_itemname, Codes und Labels der Liste, Itemblock-Gruppe, Fehlendcode -9 erklärt', () => {
    const v = f('variablenAusPlan')(bau(false), 'de');
    expect(v.map((x: any) => x.name)).toEqual(['zuf_essen', 'zuf_service', 'weg_1', 'weg_2', 'weg_m8', 'weg_anders', 'ein']);
    expect(v[0]).toMatchObject({ typ: 'zahl', niveau: 'ordinal', werteLabels: { '1': 'stimme nicht zu', '2': 'teils', '3': 'stimme zu', '-9': 'keine Angabe' }, fehlend: [-9], gruppe: { id: 'zuf', art: 'itemblock' }, quelle: { element: 'b1', item: 'i1' } });
    expect(v[1]).toMatchObject({ quelle: { element: 'b1', item: 'i2' }, fehlend: [-9] });
    expect(v[6]).toMatchObject({ niveau: 'ordinal', fehlend: [-9], werteLabels: { '1': 'stimme nicht zu', '2': 'teils', '3': 'stimme zu', '-9': 'keine Angabe' } });
  });
  it('Mehrfach: negativer Code → name_m8; 0/1 statt Fehlendcode; anders als Text', () => {
    const v = f('variablenAusPlan')(bau(false), 'de'); const m8 = v.find((x: any) => x.name === 'weg_m8');
    expect(m8).toMatchObject({ typ: 'zahl', niveau: 'nominal', gruppe: { id: 'weg', art: 'mehrfach', zaehlwert: 1 }, quelle: { element: 'f1', option: 'n' } });
    expect(m8.fehlend ?? []).toEqual([]); expect(Object.keys(m8.werteLabels).sort()).toEqual(['0', '1']);
    expect(v.find((x: any) => x.name === 'weg_anders')).toMatchObject({ typ: 'text', rolle: 'text', quelle: { element: 'f1', teil: 'anders' } });
  });
  it('Pretest: bei einstellungen.pretest zusätzlich name_kommentar an jeder Frage (Text); ohne Pretest nicht', () => {
    expect(f('variablenAusPlan')(bau(false), 'de').map((x: any) => x.name)).not.toContain('ein_kommentar');
    const v = f('variablenAusPlan')(bau(true), 'de'); const k = v.find((x: any) => x.name === 'ein_kommentar');
    expect(k).toMatchObject({ typ: 'text', rolle: 'text', quelle: { element: 'f2', teil: 'kommentar' } });
    expect(v.map((x: any) => x.name)).toContain('weg_kommentar');
  });
});

/* ------------------------------------------------------------------ Zuordnung Kobo / ODK → Plan */
describe('Werte: XLSForm-Name oder Beschriftung → Option; ankreuzWert (1/0 und True/False)', () => {
  it('optionNachName: Namen aus „XML values“ → Option mit Code', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx'); const o = f('optionNachName');
    expect(o(p, 'verkehr', 'bahn')).toMatchObject({ id: 'verkehr:bahn', wert: 2 }); expect(o(p, 'zufrieden', '5')).toMatchObject({ id: 'zufrieden:5', wert: 5 }); expect(o(p, 'zufrieden', 5)?.wert).toBe(5);
    expect(o(p, 'zufrieden', '6')).toBeNull(); expect(o(p, 'verkehr', 'other')).toBeNull(); expect(o(p, 'gibtsnicht', 'bus')).toBeNull();
  });
  it('optionNachBeschriftung: Kobo „Labels“ in der Exportsprache', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx'); const o = f('optionNachBeschriftung');
    expect(o(p, 'zufrieden', 'Zufrieden', 'de')?.wert).toBe(4); expect(o(p, 'zufrieden', 'Satisfied', 'en')?.wert).toBe(4); expect(o(p, 'zufrieden', ' Sehr zufrieden ', 'de')?.wert).toBe(5);
    expect(o(p, 'zufrieden', 'Satisfied', 'de')).toBeNull(); expect(o(p, 'verkehr', 'Fahrrad', 'de')?.wert).toBe(3);
  });
  it('ankreuzWert: 1/0, True/False in jeder Schreibweise, echte Wahrheitswerte; leer und Fremdes → null', () => {
    const a = f('ankreuzWert');
    for (const z of [1, '1', 'True', 'true', 'TRUE', true]) expect(a(z), String(z)).toBe(1);
    for (const z of [0, '0', 'False', 'false', 'FALSE', false]) expect(a(z), String(z)).toBe(0);
    for (const z of [null, undefined, '', ' ', 'x', 'ja', 2]) expect(a(z), String(z)).toBeNull();
  });
});

describe('ordneSpalten: Kobo-Köpfe (gruppe/frage, frage/option, Leerzeichen-Spalte, 1/0 und True/False)', () => {
  it('Excel mit XML-Köpfen: Sammelspalte, Optionsspalten, anders (_other), Antworten; Metaspalten und Unbekanntes bleiben übrig', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx'); const t = await tabelleXlsx('kobo/kobo-xml-eins-null.xlsx');
    const r = f('ordneSpalten')(p, t.kopf);
    expect(r.zuordnung.map((z: any) => z.kopf)).toEqual(['besuch/mahlzeiten', 'besuch/mahlzeiten/fruehstueck', 'besuch/mahlzeiten/mittagessen', 'besuch/mahlzeiten/abendessen', 'besuch/zufrieden', 'besuch/verkehr', 'besuch/verkehr_other', 'alter', 'entfernung', 'kommentar', 'termin', 'schmeckt']);
    const z = (k: string) => r.zuordnung.find((x: any) => x.kopf === k);
    expect(z('besuch/mahlzeiten')).toEqual({ kopf: 'besuch/mahlzeiten', frage: 'mahlzeiten', art: 'sammelspalte', variable: null });
    expect(z('besuch/mahlzeiten/fruehstueck')).toEqual({ kopf: 'besuch/mahlzeiten/fruehstueck', frage: 'mahlzeiten', art: 'optionsspalte', option: 'mahlzeit:fruehstueck', variable: 'mahlzeiten_1' });
    expect(z('besuch/mahlzeiten/mittagessen')).toMatchObject({ option: 'mahlzeit:mittagessen', variable: 'mahlzeiten_2' }); expect(z('besuch/mahlzeiten/abendessen')).toMatchObject({ option: 'mahlzeit:abendessen', variable: 'mahlzeiten_3' });
    expect(z('besuch/zufrieden')).toEqual({ kopf: 'besuch/zufrieden', frage: 'zufrieden', art: 'antwort', variable: 'zufrieden' }); expect(z('besuch/verkehr')).toMatchObject({ frage: 'verkehr', art: 'antwort', variable: 'verkehr' });
    expect(z('besuch/verkehr_other')).toEqual({ kopf: 'besuch/verkehr_other', frage: 'verkehr', art: 'anders', variable: 'verkehr_anders' });
    for (const k of ['alter', 'entfernung', 'kommentar', 'termin', 'schmeckt']) expect(z(k)).toEqual({ kopf: k, frage: k, art: 'antwort', variable: k });
    expect(r.unzugeordnet).toEqual(t.kopf.filter((k: string) => !r.zuordnung.some((x: any) => x.kopf === k)));
    expect(r.unzugeordnet).toEqual(['start', 'end', '__version__', 'meta/instanceID', '_id', '_uuid', '_submission_time', '_validation_status', '_notes', '_status', '_submitted_by', '_tags', '_index', 'zusatz_unbekannt']);
  });
  it('jede zugeordnete Variable gibt es in variablenAusPlan (außer der Sammelspalte)', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx'); const t = await tabelleXlsx('kobo/kobo-xml-eins-null.xlsx');
    const namen = new Set(f('variablenAusPlan')(p, 'de').map((x: any) => x.name));
    for (const z of f('ordneSpalten')(p, t.kopf).zuordnung) { if (z.variable === null) expect(z.art).toBe('sammelspalte'); else expect(namen.has(z.variable), z.kopf).toBe(true); }
  });
  it('CSV nur mit getrennten Spalten (True/False, „;“): drei Optionsspalten ohne Sammelspalte', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx'); const t = csv('kobo/kobo-xml-true-false.csv'); const r = f('ordneSpalten')(p, t.kopf);
    expect(r.zuordnung.map((z: any) => [z.kopf, z.art, z.variable])).toEqual([['besuch/mahlzeiten/fruehstueck', 'optionsspalte', 'mahlzeiten_1'], ['besuch/mahlzeiten/mittagessen', 'optionsspalte', 'mahlzeiten_2'], ['besuch/mahlzeiten/abendessen', 'optionsspalte', 'mahlzeiten_3'], ['besuch/zufrieden', 'antwort', 'zufrieden'], ['besuch/verkehr', 'antwort', 'verkehr'], ['alter', 'antwort', 'alter']]);
    expect(r.unzugeordnet).toEqual(['start', 'end', '_id', '_uuid', '_submission_time', '_validation_status', '_index']);
    const i = t.kopf.indexOf('besuch/mahlzeiten/fruehstueck'); expect(t.zeilen.map(z => f('ankreuzWert')(z[i]))).toEqual([1, 0, 0]);
  });
  it('Excel: die Optionsspalten (1/0) und die Sammelspalte (Leerzeichen) sagen dasselbe', async () => {
    const t = await tabelleXlsx('kobo/kobo-xml-eins-null.xlsx'); const sammel = t.kopf.indexOf('besuch/mahlzeiten');
    for (const o of ['fruehstueck', 'mittagessen', 'abendessen']) {
      const j = t.kopf.indexOf(`besuch/mahlzeiten/${o}`);
      t.zeilen.forEach((z, zi) => { const gewaehlt = String(z[sammel] ?? '').split(' ').includes(o); expect(f('ankreuzWert')(z[j]), `${o} Zeile ${zi}`).toBe(gewaehlt ? 1 : 0); });
    }
    expect(t.zeilen[2]![sammel]).toBeNull();   // Zeile 2: nichts gewählt, Sammelspalte leer, alle Optionsspalten 0
  });
  it('ohne Gruppen in den Köpfen („Include groups in headers“ aus) und unbekannte Fragen/Optionen', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx');
    const r = f('ordneSpalten')(p, ['zufrieden', 'mahlzeiten/mittagessen', 'verkehr_other', 'besuch/gibtsnicht', 'besuch/mahlzeiten/kaesekuchen', 'gibtsnicht']);
    expect(r.zuordnung.map((z: any) => [z.kopf, z.art, z.variable])).toEqual([['zufrieden', 'antwort', 'zufrieden'], ['mahlzeiten/mittagessen', 'optionsspalte', 'mahlzeiten_2'], ['verkehr_other', 'anders', 'verkehr_anders']]);
    expect(r.unzugeordnet).toEqual(['besuch/gibtsnicht', 'besuch/mahlzeiten/kaesekuchen', 'gibtsnicht']);
  });
  it('ODK-Schreibweise: Gruppentrenner „-“, meta-instanceID bleibt übrig', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx');
    const r = f('ordneSpalten')(p, ['meta-instanceID', 'besuch-zufrieden', 'alter', 'besuch-verkehr', 'besuch-verkehr_other']);
    expect(r.zuordnung.map((z: any) => [z.kopf, z.frage, z.art, z.variable])).toEqual([['besuch-zufrieden', 'zufrieden', 'antwort', 'zufrieden'], ['alter', 'alter', 'antwort', 'alter'], ['besuch-verkehr', 'verkehr', 'antwort', 'verkehr'], ['besuch-verkehr_other', 'verkehr', 'anders', 'verkehr_anders']]);
    expect(r.unzugeordnet).toEqual(['meta-instanceID']);
  });
  it('ändert den Plan nicht', async () => {
    const { plan: p } = await plan('xlsform/mensa.xlsx'); const vorher = JSON.stringify(p); f('ordneSpalten')(p, ['besuch/zufrieden', 'x']); expect(JSON.stringify(p)).toBe(vorher);
  });
});

/* ------------------------------------------------------------------ Kobo und Moodle Questionnaire erkennen (ausführlich in dienste-1b.test.ts) */
describe('Erkennung mit Metaspalten (Kurzprobe; die ganze Prüfung steht in dienste-1b.test.ts)', () => {
  const meta = (e: any) => e.spalten.filter((x: any) => x.rolle === 'metadaten').map((x: any) => x.kopf);
  it('Kobo (Excel, 1/0): Hersteller kobo, Systemspalten als Metadaten, Fragespalten nicht', async () => {
    const e = erkenneFragebogen(await tabelleXlsx('kobo/kobo-xml-eins-null.xlsx'));
    expect(e.hersteller).toBe('kobo'); expect(meta(e)).toEqual(expect.arrayContaining(['_id', '_uuid', '_submission_time', '_validation_status', '_index', 'start', 'end']));
    expect(meta(e)).not.toContain('besuch/zufrieden'); expect(meta(e)).not.toContain('alter');
  });
  it('Kobo (CSV, True/False): Hersteller kobo', () => { expect(erkenneFragebogen(csv('kobo/kobo-xml-true-false.csv')).hersteller).toBe('kobo'); });
  it('Moodle Questionnaire: Hersteller moodlequestionnaire, Response und Submitted on: als Metadaten, Q01_… nicht', () => {
    const e = erkenneFragebogen(csv('moodlequestionnaire/moodlequestionnaire.csv'));
    expect(e.hersteller).toBe('moodlequestionnaire'); expect(meta(e)).toEqual(expect.arrayContaining(['Response', 'Submitted on:', 'User id', 'Full name'])); expect(meta(e)).not.toContain('Q01_zufriedenheit');
  });
});
