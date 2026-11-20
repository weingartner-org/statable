import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { s, setzeTestMotor, oeffneTabelle, oeffneEurostat, jetzigesProjekt, setzeZusatz } from './sitzung.svelte';
import { leseZusatz } from './zusatz';
import { erzeugeTestMotor } from './testmotor';
import { leseCsv } from './einlesen';
import { ladeProjekt, speichereProjekt } from './ablage';

/* Gefunden bei der Abnahme am 31.10.2026: Stichprobenplan (s.gewicht.entwurf) und Eurostat-Quelle (s.datei.eurostat) sind verschachtelt. Ein flaches `{ ...s.datei }` ließ einen $state-Proxy
 * darin; IndexedDB warf DataCloneError im Rückruf, das Projekt blieb ungespeichert, und oben stand trotzdem „Gespeichert“. Darum hier der Weg bis in die Ablage und zurück. */

beforeAll(async () => { setzeTestMotor(await erzeugeTestMotor()); }, 120000);

const speichern = async () => {
  const p = await jetzigesProjekt();
  expect(p).not.toBeNull();
  await speichereProjekt(p!);
  return ladeProjekt(p!.id);
};

describe('Verschachtelte Angaben kommen in die Ablage und wieder heraus', () => {
  it('Stichprobenplan am Fallgewicht', async () => {
    await oeffneTabelle(leseCsv('x,w,k\n1,2,a\n2,3,a\n3,2,b\n4,1,b\n'), 'plan');
    s.gewicht = { spalte: 'w', art: 'umfrage', klumpenfrei: true, entwurf: { klumpen: 'k', einsam: 'adjust' } };
    const g = await speichern();
    expect(g?.gewicht?.entwurf).toEqual({ klumpen: 'k', einsam: 'adjust' });
  }, 120000);

  it('Eurostat-Quelle an den Daten', async () => {
    const q = { datensatz: 'une_rt_m', abruf: '2026-10-31', updated: '2026-10-30T11:00:00+0100', adresse: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m?format=JSON' };
    await oeffneEurostat({ kopf: ['time', 'wert'], bezeichnungen: ['', ''], art: ['text', 'zahl'], zeilen: [['2024-01', 3.2], ['2024-02', null]] }, q as never, 'abc');
    const g = await speichern();
    expect(g?.datei?.eurostat?.datensatz).toBe('une_rt_m');
  }, 120000);

  it('Karte der Welt und eines Landes: nur Art und ISO3 liegen in der Ablage, keine Umrisse; Speichern und Neuladen', async () => {
    await oeffneTabelle(leseCsv('land,x\nAT,1\nKE,2\n'), 'karte');
    const rest = { gebietSpalte: 'land', wertSpalte: 'x', eigenschaft: 'iso3', beschriftung: 'anzeige', klassenArt: 'quantil' as const, klassen: 5 };
    // verschachtelt wie auf der Seite: die Quelle ist ein eigenes Objekt
    await setzeZusatz({ karte: { quelle: { art: 'welt', name: 'Natural Earth' }, geo: null, ...rest } });
    let g = await speichern();
    expect(g?.zusatz?.karte?.quelle).toEqual({ art: 'welt', name: 'Natural Earth' }); expect(g?.zusatz?.karte?.geo).toBeNull(); expect(g?.zusatz?.karte?.gebietSpalte).toBe('land');
    await setzeZusatz({ karte: { quelle: { art: 'land', name: 'Kenia', iso3: 'KEN' }, geo: null, ...rest, eigenschaft: 'code', beschriftung: 'name' } });
    g = await speichern();
    expect(g?.zusatz?.karte?.quelle).toEqual({ art: 'land', name: 'Kenia', iso3: 'KEN' }); expect(g?.zusatz?.karte?.geo).toBeNull(); expect(g?.zusatz?.karte?.eigenschaft).toBe('code');
    expect(JSON.stringify(g?.zusatz)).not.toContain('coordinates');
  }, 120000);

  it('Alte Karten laden weiter: eigene Datei mit Grenzen im Projekt; ein Land ohne ISO3 und eine unbekannte Art fallen weg', async () => {
    const text = '{"type":"FeatureCollection","features":[]}';
    await setzeZusatz({ karte: { quelle: { art: 'datei', name: 'alt.geojson' }, geo: text, gebietSpalte: 'land', wertSpalte: 'x', eigenschaft: 'id', beschriftung: 'n', klassenArt: 'gleich', klassen: 4 } });
    const g = await speichern();
    expect(g?.zusatz?.karte?.quelle.art).toBe('datei'); expect(g?.zusatz?.karte?.geo).toBe(text); expect(g?.zusatz?.karte?.klassenArt).toBe('gleich');
    const roh = { quelle: { art: 'land', name: 'x' }, geo: null, gebietSpalte: '', wertSpalte: '', eigenschaft: '', beschriftung: '', klassenArt: 'quantil', klassen: 5 };
    expect(leseZusatz({ karte: roh }).karte).toBeUndefined();
    expect(leseZusatz({ karte: { ...roh, quelle: { art: 'land', name: 'x', iso3: 'KEN' }, geo: 'sollte wegfallen' } }).karte?.geo).toBeNull();
    expect(leseZusatz({ karte: { ...roh, quelle: { art: 'andere', name: 'x' } } }).karte).toBeUndefined();
  }, 120000);

  it('Scheitert das Ablegen, meldet die Ablage das, statt still fertig zu werden', async () => {
    const p = await jetzigesProjekt();
    await expect(speichereProjekt({ ...p!, entscheid: { kaputt: () => 1 } as never })).rejects.toBeDefined();
  }, 120000);
});
