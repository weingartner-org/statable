import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { leseCsv, leseDatei, zurEngine } from './einlesen';
import { komma, zweiGruppen } from './ergebnis';
import { leseProjektdatei, projektAlsDatei, projektDateiname, ProjektdateiFehler } from './projektdatei';
import { nodeEngine } from './testengine';
import type { Projekt } from './ablage';
import type { Blatt } from './sitzung.svelte';

const TTEST = "T-TEST GROUPS=handy_im_bett('nein' 'ja') /VARIABLES=konzentration.";

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

describe('Projekt als Datei (.statable)', () => {
  it('Rundreise: speichern und öffnen ergibt dieselben Blätter und dieselben Zahlen', async () => {
    const p = await projekt();
    const zurueck = leseProjektdatei(projektAlsDatei(p));
    expect(zurueck.name).toBe(p.name);
    expect(zurueck.quelle).toBe(p.quelle);
    expect(zurueck.entscheid).toEqual(p.entscheid);
    expect(zurueck.blaetter).toEqual(p.blaetter);   // auch Notiz, Diagramm-Einstellung, NaN und Unendlich
    expect(Array.from(zurueck.sav)).toEqual(Array.from(p.sav));

    // Die Daten aus der Datei rechnen wie vorher.
    const e = await nodeEngine();
    e.run("GET FILE='/q.sav'.", { '/q.sav': zurueck.sav });
    const r = zweiGruppen(e.run(TTEST), 'konzentration', 'handy_im_bett');
    expect([r.a.n, komma(r.a.m), komma(r.t), komma(r.df), komma(r.d)]).toEqual([43, '60,72', '2,86', '77,46', '0,57']);
  });

  it('Mehrfachantworten-Sets bleiben erhalten; alte Dateien ohne Sets laden weiter', async () => {
    const p = await projekt();
    const set = { name: 'medien', label: 'Genutzte Medien', spalten: ['medien_1', 'medien_2'], zaehlwert: 1 };
    expect(leseProjektdatei(projektAlsDatei({ ...p, sets: [set] })).sets).toEqual([set]);
    const alt = JSON.parse(new TextDecoder().decode(projektAlsDatei(p))); delete alt.sets;
    expect(leseProjektdatei(new TextEncoder().encode(JSON.stringify(alt))).sets).toEqual([]);
  });

  it('Skalen bleiben erhalten; alte Dateien ohne Skalen laden weiter; Kaputtes fällt weg', async () => {
    const p = await projekt();
    const sk = { name: 'Organisation', fragen: ['FG01', 'FG14', 'FG27'] };
    expect(leseProjektdatei(projektAlsDatei({ ...p, skalen: [sk] })).skalen).toEqual([sk]);
    const alt = JSON.parse(new TextDecoder().decode(projektAlsDatei(p))); delete alt.skalen;
    expect(leseProjektdatei(new TextEncoder().encode(JSON.stringify(alt))).skalen).toEqual([]);
    alt.skalen = [sk, { name: 3 }, { name: 'x', fragen: [1] }, null];
    expect(leseProjektdatei(new TextEncoder().encode(JSON.stringify(alt))).skalen).toEqual([sk]);
  });

  it('wird beim Öffnen als Projekt erkannt', async () => {
    const p = await projekt();
    const e = await leseDatei(new File([projektAlsDatei(p) as BlobPart], 'Meine Studie.statable'));
    expect(e.art).toBe('projekt');
    if (e.art === 'projekt') expect(e.projekt.blaetter.length).toBe(1);
  });

  it('meldet kaputte und zu neue Dateien verständlich', () => {
    expect(() => leseProjektdatei(new TextEncoder().encode('kein json'))).toThrow(ProjektdateiFehler);
    expect(() => leseProjektdatei(new TextEncoder().encode('{"format":"anders"}'))).toThrow(ProjektdateiFehler);
    try { leseProjektdatei(new TextEncoder().encode(JSON.stringify({ format: 'statable-projekt', version: 99, sav: '', blaetter: [] }))); expect.unreachable(); }
    catch (f) { expect((f as ProjektdateiFehler).grund).toBe('neuer'); }
  });

  it('Dateiname ohne verbotene Zeichen', () => {
    expect(projektDateiname('Meine Studie: Schlaf/Handy')).toBe('Meine Studie SchlafHandy.statable');
    expect(projektDateiname('')).toBe('Statable.statable');
  });
});
