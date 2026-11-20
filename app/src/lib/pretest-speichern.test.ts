import { describe, expect, it } from 'vitest';
import { strToU8, zipSync, unzipSync, strFromU8 } from 'fflate';
import type { FragebogenPlan, Lok } from './fragebogenplan';
import { leseProjektdateiMitMeldungen, projektAlsDatei } from './projektdatei';
import { lesePretest } from './pretest';

/* Paket 2G, Speichern der Pretest-Kommentare in der Projektdatei: fragebogen/<plan-id>/pretest.json. */
const zw = (t: string): Lok => ({ de: t, en: t });
const plan = { format: 'statable-fragebogen', version: 1, id: 'p-1', revision: 1, titel: zw('T'), sprachen: ['de', 'en'],
  einstellungen: { fortschritt: true, zurueck: true, pretest: true, fehlendFilter: 'code' }, antwortlisten: [], skalen: [], elemente: [], geaendert: 1 } as unknown as FragebogenPlan;
const basis = { name: 'x', quelle: 'y', sav: new Uint8Array([1, 2, 3]), blaetter: [], entscheid: {}, zeit: 1, fragebogen: [plan] };

describe('Pretest in der Projektdatei', () => {
  it('Rundreise: Kommentare kommen zurück; fremde Pläne fallen weg', () => {
    const pretest = { 'p-1': { vorschau: [{ 'q1:kommentar': 'unklar', q1: 2 }], daten: [{ q2_kommentar: 'zu lang' }] }, fremd: { vorschau: [{ a: 'b' }], daten: [] } };
    const bytes = projektAlsDatei({ ...basis, pretest } as never);
    expect(Object.keys(unzipSync(bytes))).toContain('fragebogen/p-1/pretest.json');
    const r = leseProjektdateiMitMeldungen(bytes);
    expect(r.projekt.pretest).toEqual({ 'p-1': pretest['p-1'] });
    expect(r.meldungen).toEqual([]);
  });
  it('alte Dateien ohne Feld sind lesbar; leeres Feld schreibt keinen Eintrag', () => {
    const r = leseProjektdateiMitMeldungen(projektAlsDatei(basis as never));
    expect(r.projekt.pretest).toBeUndefined();
    const leer = unzipSync(projektAlsDatei({ ...basis, pretest: { 'p-1': { vorschau: [], daten: [] } } } as never));
    expect(Object.keys(leer).some(n => n.endsWith('pretest.json'))).toBe(false);
  });
  it('böse Inhalte werden verworfen: Nicht-Objekte, falsche Werte, __proto__, lange Texte', () => {
    expect(lesePretest(null)).toBeNull();
    expect(lesePretest([1])).toBeNull();
    expect(lesePretest('x')).toBeNull();
    expect(lesePretest({ vorschau: 'x', daten: [1, null, [], 'a'] })).toBeNull();
    const r = lesePretest(JSON.parse('{"vorschau":[{"__proto__":{"x":1},"a":{"b":1},"t":"' + 'a'.repeat(20000) + '","n":3,"l":[1,"x"],"ok":[1,2]}],"daten":[]}'))!;
    expect(Object.keys(r.vorschau[0]!).sort()).toEqual(['n', 'ok', 't']);
    expect((r.vorschau[0]!.t as string).length).toBe(10000);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
  it('kaputte pretest.json in der Datei verwirft nur die Kommentare, nicht das Projekt', () => {
    const z = unzipSync(projektAlsDatei(basis as never));
    const zip: Record<string, Uint8Array> = { ...z, 'fragebogen/p-1/pretest.json': strToU8('{kaputt') };
    const kopf = JSON.parse(strFromU8(z['statable.json']!)); kopf.inhalt.push('fragebogen/p-1/pretest.json');
    zip['statable.json'] = strToU8(JSON.stringify(kopf));
    const r = leseProjektdateiMitMeldungen(zipSync(zip));
    expect(r.projekt.pretest).toBeUndefined();
    expect(r.projekt.fragebogen?.length).toBe(1);
  });
});
