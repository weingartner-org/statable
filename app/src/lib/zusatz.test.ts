import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { s, setzeTestMotor, oeffneTabelle, oeffneEurostat, jetzigesProjekt, setzeZusatz, aendereDaten } from './sitzung.svelte';
import { erzeugeTestMotor } from './testmotor';
import { leseCsv } from './einlesen';
import { ladeProjekt, speichereProjekt } from './ablage';
import { projektAlsDatei, leseProjektdatei } from './projektdatei';
import { leseRegeln, type Regel } from './plausibel';
import { leseZusatz, type KarteStand } from './zusatz';
import { geoLesen } from './karte';
import { vorlageAusProjekt, wendeVorlageAn } from './vorlage.svelte';
import { vorlageAlsText, leseVorlage, baueVorlage } from './vorlage';
import { zeitreiheAufbauen } from './zeitreiheblatt';
import { VERFAHREN } from './verfahren';
import type { Spalte } from './verzeichnis';

/* Plausibilitätsregeln und Karte hängen verschachtelt am Projekt. Wie bei Stichprobenplan und Eurostat-Quelle (speichern-verschachtelt.test.ts) wird hier wirklich gespeichert und neu geladen:
 * ein $state-Proxy in der Ablage würde einen DataCloneError werfen, und das Projekt bliebe ungespeichert. */
beforeAll(async () => { setzeTestMotor(await erzeugeTestMotor()); }, 120000);

const REGELN = [{ id: 'a', art: 'bereich', spalte: 'alter', min: 0, max: 120 }, { id: 'b', art: 'werte', spalte: 'geschl', erlaubt: ['w', 'm'] }, { id: 'c', art: 'wenn', wenn: { spalte: 'alter', op: '<', wert: 18 }, dann: { spalte: 'geschl', op: '!=', wert: 'x' } }];
const GEO = JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { NUTS_ID: 'AT11' }, geometry: { type: 'Polygon', coordinates: [[[16, 47], [17, 47], [17, 48], [16, 47]]] } }] });
const KARTE: KarteStand = { quelle: { art: 'gisco', name: 'NUTS_RG_60M_2024_4326_LEVL_2', ebene: 2, land: 'AT' }, geo: GEO, gebietSpalte: 'region', wertSpalte: 'rate', eigenschaft: 'NUTS_ID', beschriftung: 'NUTS_ID', klassenArt: 'quantil', klassen: 5 };
const speichern = async () => { const p = await jetzigesProjekt(); expect(p).not.toBeNull(); await speichereProjekt(p!); return ladeProjekt(p!.id); };

describe('Zusatz am Projekt: Speichern und Neuladen', () => {
  it('Plausibilitätsregeln kommen in die Ablage und wieder heraus', async () => {
    await oeffneTabelle(leseCsv('alter,geschl\n10,w\n200,m\n30,x\n'), 'regeln');
    await setzeZusatz({ plausi: leseRegeln(REGELN) });
    const g = await speichern();
    expect(g?.zusatz?.plausi).toEqual(REGELN);
  }, 120000);
  it('Karte mit Grenzen und Einstellungen: Ablage und Projektdatei', async () => {
    await oeffneTabelle(leseCsv('region,rate\nAT11,1\n'), 'karte');
    await setzeZusatz({ karte: KARTE });
    const g = await speichern();
    expect(g?.zusatz?.karte).toEqual(KARTE);
    expect(geoLesen(g!.zusatz!.karte!.geo!).ok).toBe(true);
    const datei = leseProjektdatei(projektAlsDatei(g!));
    expect(datei.zusatz?.karte).toEqual(KARTE);
  }, 120000);
  it('Projektdatei: Regeln und Karte aus fremder Hand werden geprüft, Kaputtes fällt weg', () => {
    const z = leseZusatz({ plausi: [...REGELN, { art: 'eval', code: 'x' }, 5], karte: { quelle: { art: 'fremd' } } });
    expect(z.plausi).toEqual(REGELN); expect(z.karte).toBeUndefined();
    expect(leseZusatz(null)).toEqual({}); expect(leseZusatz({ plausi: 'x', karte: 3 })).toEqual({});
    const k = leseZusatz({ karte: { ...KARTE, geo: 'x'.repeat(6 * 1024 * 1024), klassen: 99, klassenArt: 'komisch', quelle: { art: 'datei', name: 'n'.repeat(500), land: 'at', ebene: 9 } } }).karte!;
    expect(k.geo).toBeNull(); expect(k.klassen).toBe(7); expect(k.klassenArt).toBe('quantil'); expect(k.quelle.name.length).toBe(200); expect(k.quelle.land).toBeUndefined(); expect(k.quelle.ebene).toBeUndefined();
  });
  it('ohne Regeln und ohne Karte steht kein Feld in der Ablage (ältere Projekte laden weiter)', async () => {
    await oeffneTabelle(leseCsv('a,b\n1,2\n'), 'leer');
    const g = await speichern();
    expect(g && 'zusatz' in g).toBe(false);
    const alt = leseProjektdatei(projektAlsDatei({ ...g!, zusatz: undefined }));
    expect(alt.zusatz).toBeUndefined();
  }, 120000);
});

describe('Vorlage: Regeln sind enthalten und werden angewendet', () => {
  it('Regeln gehen in die Vorlage, durch den Text und wieder heraus; eine Vorlage ohne Regeln bleibt gültig', async () => {
    await oeffneTabelle(leseCsv('alter,geschl\n10,w\n'), 'vorlage');
    await setzeZusatz({ plausi: leseRegeln(REGELN) });
    const { vorlage } = vorlageAusProjekt();
    expect(vorlage.plausi).toEqual(REGELN);
    const r = leseVorlage(vorlageAlsText(vorlage));
    expect(r.ok && r.vorlage.plausi).toEqual(REGELN);
    const ohne = baueVorlage([], { spalten: [] }, [], [], [], 'x', false, 0);
    expect(ohne.vorlage.plausi).toBeUndefined();
    const text = JSON.parse(vorlageAlsText(ohne.vorlage)); expect('plausi' in text).toBe(false);
    expect(leseVorlage(JSON.stringify({ ...text, plausi: [{ art: 'eval' }, ...REGELN] })).ok).toBe(true);
    const fremd = leseVorlage(JSON.stringify({ ...text, plausi: [{ art: 'eval' }] }));
    expect(fremd.ok && fremd.vorlage.plausi).toBeUndefined();
  }, 120000);
  it('Anwenden auf neue Daten: die Regeln kommen ans Projekt, zweimal angewendet gibt es keine Doppelten', async () => {
    await oeffneTabelle(leseCsv('alter,geschl\n10,w\n'), 'quelle');
    await setzeZusatz({ plausi: leseRegeln(REGELN) });
    const { vorlage } = vorlageAusProjekt();
    await oeffneTabelle(leseCsv('alter,geschl\n20,m\n'), 'ziel');
    expect(s.zusatz.plausi).toBeUndefined();
    const o = { dateiname: 'v', pruefsummeVorlage: null, bestaetigt: true };
    expect((await wendeVorlageAn(vorlage, o)).ok).toBe(true);
    expect(s.zusatz.plausi).toHaveLength(3);
    expect(s.zusatz.plausi!.map(r => (r as Regel).art)).toEqual(['bereich', 'werte', 'wenn']);
    expect((await wendeVorlageAn(vorlage, o)).ok).toBe(true);
    expect(s.zusatz.plausi).toHaveLength(3);
    const g = await speichern();
    expect(g?.zusatz?.plausi).toHaveLength(3);
  }, 120000);
});

describe('Neue Spalten aus Klassifikation und Plausibilität: Protokoll und Vorlage', () => {
  it('beide Schritte stehen im Protokoll und sind in der Vorlage „nicht wiederholbar“', async () => {
    await oeffneTabelle(leseCsv('code\n0111\n'), 'protokoll');
    const nSp = (name: string): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {} });
    for (const [art, name] of [['klassifikation', 'Titel1'], ['plausibel', 'Verletzt1']] as const) {
      const ok = await aendereDaten('x', [...(JSON.parse(JSON.stringify(s.spalten)) as Spalte[]), nSp(name)], s.zeilen.map(z => [...z, 1]), true, { art, nicht: 'art' });
      expect(ok).toBe(true);
    }
    const e = s.protokoll.slice(-2);
    expect(e.map(x => x.art)).toEqual(['klassifikation', 'plausibel']);
    expect(e.every(x => x.nicht === 'art' && !x.wiederhol)).toBe(true);
    const { vorlage, hinweise } = vorlageAusProjekt();
    expect(vorlage.schritte.slice(-2).map(x => [x.art, x.nicht])).toEqual([['klassifikation', 'art'], ['plausibel', 'art']]);
    expect(hinweise.nichtWiederholbar.map(x => x.art)).toEqual(expect.arrayContaining(['klassifikation', 'plausibel']));
    const g = await speichern();
    expect(g?.protokoll?.slice(-2).map(x => x.art)).toEqual(['klassifikation', 'plausibel']);
  }, 120000);
});

describe('Eurostat: Zeitspalte als Datum im offenen Projekt', () => {
  const q = { datensatz: 'une_rt_m', abruf: '2026-10-31', aktualisiert: '', adresse: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m?format=JSON' };
  const monate = Array.from({ length: 24 }, (_, i) => `${2023 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`);
  const tab = (zeiten: string[]) => ({ kopf: ['geo', 'time', 'wert', 'status'], bezeichnungen: ['', '', '', ''], art: ['text', 'text', 'zahl', 'text'] as ('text' | 'zahl')[], zeilen: zeiten.map((z, i) => ['AT', z, 3 + (i % 5) / 10, ''] as (string | number | null)[]) });
  it('Monate: eine Datumsspalte; die Zeitreihen-Karte bietet sie an und baut daraus eine Monatsreihe; Speichern und Neuladen', async () => {
    await oeffneEurostat(tab(monate), q, 'abc');
    const i = s.spalten.findIndex(c => c.name === 'time');
    expect(s.spalten[i]!.art).toBe('datum');
    expect(s.zeilen[0]![i]).toBe('01.01.2023'); expect(s.zeilen[13]![i]).toBe('01.02.2024');
    const zeit = VERFAHREN.find(v => v.id === 'zeitreihen')!;
    expect(zeit.luecken.find(l => l.schluessel === 'l2')!.passt(s.spalten[i]!, undefined as never)).toBe(true);
    const r = zeitreiheAufbauen('wert', 'time');
    expect(r.ok && r.reihe.raster).toBe('monatlich'); expect(r.ok && r.reihe.y).toHaveLength(24);
    const g = await speichern();
    expect(g?.datei?.eurostat?.datensatz).toBe('une_rt_m');
  }, 120000);
  it('Jahre: ebenfalls ein Datum (1. Januar)', async () => {
    await oeffneEurostat(tab(Array.from({ length: 12 }, (_, k) => String(2010 + k))), q, 'abc');
    const i = s.spalten.findIndex(c => c.name === 'time');
    expect(s.spalten[i]!.art).toBe('datum'); expect(s.zeilen.map(z => z[i]).slice(0, 3)).toEqual(['01.01.2010', '01.01.2011', '01.01.2012']);
    const r = zeitreiheAufbauen('wert', 'time');
    expect(r.ok && r.reihe.raster).toBe('jaehrlich');
  }, 120000);
  it('Quartale: die Spalte bleibt Text, wie bisher, und die Zeitreihen-Karte bietet sie nicht an', async () => {
    await oeffneEurostat(tab(['2024-Q1', '2024-Q2', '2024-Q3']), q, 'abc');
    const i = s.spalten.findIndex(c => c.name === 'time');
    expect(s.spalten[i]!.art).toBe('text'); expect(s.zeilen.map(z => z[i])).toEqual(['2024-Q1', '2024-Q2', '2024-Q3']);
    const zeit = VERFAHREN.find(v => v.id === 'zeitreihen')!;
    expect(zeit.luecken.find(l => l.schluessel === 'l2')!.passt(s.spalten[i]!, undefined as never)).toBe(false);
  }, 120000);
});
