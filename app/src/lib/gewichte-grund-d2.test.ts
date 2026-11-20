/** Später S-D2, Bauer A1: Fundament für die designbasierte Umfragerechnung - was die Tests des Prüfers (gewichte-spaeter-d2.test.ts, umfrage.test.ts) nicht abdecken:
 *  die Zeile der Tabelle als Mechanismus, Reihenfolge der Status, die Pflichtangabe „Personen einzeln gezogen“ (`Gewicht.klumpenfrei`) in Projektdatei, Datenstand der Blätter und
 *  Pflichtfrage, der Schalter DESIGN_ANGEBUNDEN (die Oberfläche gibt das „Ja“ erst weiter, wenn eine Karte wirklich designbasiert rechnet), Sätze für den Kopf des Blattes. */
import { beforeEach, describe, expect, it } from 'vitest';
import { designInfoSatz, designKleinSatz, gewichtStatus, nutztDesign, schwersterStatus, statusDerZeile, STATUS_RANG, SURVEY_VERSION, type Gewicht, type GewichtStatus } from './gewichte';
import { DESIGN_ANGEBUNDEN, gewichtStellen, klumpenfreiFuer } from './gewichtkarten';
import { s } from './sitzung.svelte';
import { beantworteGewichtFrage, aktivesGewicht } from './fallgewicht.svelte';
import { projektAlsDatei, leseProjektdatei } from './projektdatei';
import { standVon } from './blattstand';
import { tabellenGewichtStatus } from './tabellenblatt';

beforeEach(() => { s.einst.sprache = 'de'; s.einst.anrede = 'du'; Object.assign(s, { gewicht: undefined, gewichtFrage: null, spalten: [], zeilen: [], sets: [] }); });
const u = (klumpenfrei?: boolean): Gewicht => ({ spalte: 'wu', art: 'umfrage', ...(klumpenfrei === undefined ? {} : { klumpenfrei }) });

describe('Zeile der Tabelle als Mechanismus und Reihenfolge der Status', () => {
  it('Häufigkeit: erster Eintrag; Umfrage: zweiter; Umfrage mit „Ja“ und dritter Eintrag: dritter', () => {
    const z: GewichtStatus[] = ['rechnen', 'beschreibend', 'design'];
    expect(statusDerZeile(z, { art: 'haeufigkeit', klumpenfrei: false })).toBe('rechnen');
    expect(statusDerZeile(z, { art: 'haeufigkeit', klumpenfrei: true })).toBe('rechnen');
    expect(statusDerZeile(z, { art: 'umfrage', klumpenfrei: false })).toBe('beschreibend');
    expect(statusDerZeile(z, { art: 'umfrage', klumpenfrei: true })).toBe('design');
    expect(statusDerZeile(['rechnen', 'sperren'], { art: 'umfrage', klumpenfrei: true }), 'ohne dritten Eintrag gilt der zweite').toBe('sperren');
  });
  it('gewichtStatus nimmt die Art als Text oder das Gewicht selbst (auch einen Abdruck); eine ausdrückliche dritte Angabe geht vor', () => {
    expect(gewichtStatus('kreuz:test', u(true))).toBe('design'); expect(gewichtStatus('kreuz:test', u(false))).toBe('sperren'); expect(gewichtStatus('kreuz:test', u())).toBe('sperren');
    expect(gewichtStatus('kreuz:test', 'umfrage', true)).toBe('design'); expect(gewichtStatus('kreuz:test', u(false), true)).toBe('design');
    expect(gewichtStatus('kreuz:test', { spalte: 'x', art: 'haeufigkeit', klumpenfrei: true } as Gewicht)).toBe('rechnen');
    expect(() => gewichtStatus('gibtsnicht:x', u(true))).toThrow();
  });
  it('Rangfolge: unberührt < rechnen < beschreibend < design < hinweis < sperren', () => {
    expect(STATUS_RANG).toEqual(['unberuehrt', 'rechnen', 'beschreibend', 'design', 'hinweis', 'sperren']);
    expect(schwersterStatus(['verteilung:kennwerte'], 'umfrage', true)).toBe('design');
    expect(tabellenGewichtStatus({ bloecke: [] } as never, 'umfrage', true)).toBe('beschreibend');
  });
  it('nutztDesign: nur Umfragegewicht mit „Ja“', () => {
    expect(nutztDesign(u(true))).toBe(true); expect(nutztDesign(u(false))).toBe(false); expect(nutztDesign(u())).toBe(false);
    expect(nutztDesign({ spalte: 'w', art: 'haeufigkeit', klumpenfrei: true } as Gewicht)).toBe(false); expect(nutztDesign(undefined)).toBe(false); expect(nutztDesign(null)).toBe(false);
  });
});

describe('Schalter DESIGN_ANGEBUNDEN: die Oberfläche gibt das „Ja“ erst weiter, wenn die Karte designbasiert rechnet', () => {
  it('jede Karte mit Rechenweg hat eine eigene Zeile; nur Umfragegewicht mit „Ja“ kommt durch', () => {
    expect(Object.keys(DESIGN_ANGEBUNDEN).sort()).toEqual(['gruppen', 'kreuz', 'verteilung', 'vorhersage']);
    for (const [v, an] of Object.entries(DESIGN_ANGEBUNDEN)) {
      expect(klumpenfreiFuer(v, u(true))).toBe(an ? true : undefined);
      expect(klumpenfreiFuer(v, u(false))).toBeUndefined(); expect(klumpenfreiFuer(v, u())).toBeUndefined(); expect(klumpenfreiFuer(v, { spalte: 'w', art: 'haeufigkeit', klumpenfrei: true } as Gewicht)).toBeUndefined();
    }
    expect(klumpenfreiFuer('zusammenhang', u(true))).toBeUndefined(); expect(klumpenfreiFuer('verteilung', null)).toBeUndefined();
  });
  it('eine Karte, die nicht angebunden ist, bekommt über die Oberfläche nie eine design-Stelle', () => {
    for (const v of Object.keys(DESIGN_ANGEBUNDEN)) {
      const k = { verfahren: v, art: 'umfrage' as const, klumpenfrei: klumpenfreiFuer(v, u(true)) };
      if (!DESIGN_ANGEBUNDEN[v]) expect(gewichtStellen(k).some(x => x.status === 'design'), v).toBe(false);
    }
  });
});

describe('Pflichtangabe „Personen einzeln gezogen“: gespeichert mit dem Gewicht', () => {
  const proj = (g: Gewicht) => ({ name: 'p', quelle: 'q', sav: new Uint8Array([1]), blaetter: [], entscheid: {}, zeit: 1, gewicht: g });
  it('Projektdatei: Ja und Nein überleben, bei Umfrage; fehlt die Angabe (alte Dateien), fehlt sie auch danach; bei Häufigkeit nicht übernommen; Unsinn verworfen', () => {
    expect(leseProjektdatei(projektAlsDatei(proj(u(true)))).gewicht).toEqual({ spalte: 'wu', art: 'umfrage', klumpenfrei: true });
    expect(leseProjektdatei(projektAlsDatei(proj(u(false)))).gewicht).toEqual({ spalte: 'wu', art: 'umfrage', klumpenfrei: false });
    expect(leseProjektdatei(projektAlsDatei(proj(u()))).gewicht).toEqual({ spalte: 'wu', art: 'umfrage' });
    expect(leseProjektdatei(projektAlsDatei(proj({ spalte: 'w', art: 'haeufigkeit', klumpenfrei: true }))).gewicht).toEqual({ spalte: 'w', art: 'haeufigkeit' });
    const roh = JSON.parse(new TextDecoder().decode(projektAlsDatei(proj(u(true))))); roh.gewicht.klumpenfrei = 'ja';
    expect(leseProjektdatei(new TextEncoder().encode(JSON.stringify(roh))).gewicht).toEqual({ spalte: 'wu', art: 'umfrage' });
  });
  it('Datenstand der Blätter: „Ja“ macht Blätter veraltet (anderer Rechenweg), „Nein“ und unbeantwortet rechnen gleich', () => {
    const dd = { spalten: [{ name: 'y' }, { name: 'wu' }], zeilen: [[1, 1.5], [2, 0.5]] as (number | null)[][], sets: [] };
    const w = { l1: ['y'], l2: [], l3: [], l4: [] };
    const offen = standVon(w, { ...dd, gewicht: u() }), nein = standVon(w, { ...dd, gewicht: u(false) }), ja = standVon(w, { ...dd, gewicht: u(true) });
    expect(nein).toBe(offen); expect(ja).not.toBe(offen);
    expect(standVon(w, { ...dd, gewicht: { spalte: 'wu', art: 'haeufigkeit', klumpenfrei: true } })).toBe(standVon(w, { ...dd, gewicht: { spalte: 'wu', art: 'haeufigkeit' } }));
  });
  it('Pflichtfrage nach einem Gewicht aus SPSS/Befehl: beantworteGewichtFrage speichert die Antwort nur bei Umfrage', async () => {
    Object.assign(s, { spalten: [{ name: 'wu', bezeichnung: '', art: 'zahl', werteLabels: {}, fehlend: [], niveau: 'scale' }], zeilen: [[1.5], [0.5], [1]] });
    s.gewichtFrage = 'wu'; expect(await beantworteGewichtFrage('umfrage', true)).toBeNull();
    expect(s.gewicht).toEqual({ spalte: 'wu', art: 'umfrage', klumpenfrei: true }); expect(aktivesGewicht()).toMatchObject({ klumpenfrei: true, summe: 3, zeilen: 3 });
    s.gewicht = undefined; s.gewichtFrage = 'wu'; expect(await beantworteGewichtFrage('umfrage', false)).toBeNull(); expect(s.gewicht).toEqual({ spalte: 'wu', art: 'umfrage', klumpenfrei: false });
    s.gewicht = undefined; s.gewichtFrage = 'wu'; expect(await beantworteGewichtFrage('umfrage')).toBeNull(); expect(s.gewicht).toEqual({ spalte: 'wu', art: 'umfrage' });
    Object.assign(s, { zeilen: [[1], [2]] });
    s.gewicht = undefined; s.gewichtFrage = 'wu'; expect(await beantworteGewichtFrage('haeufigkeit', true)).toBeNull(); expect(s.gewicht).toEqual({ spalte: 'wu', art: 'haeufigkeit' });
  });
});

describe('Sätze für den Kopf des Blattes (Fachblatt 0.6)', () => {
  it('Info: Gewicht, „Personen einzeln gezogen“, designbasiert, Taylor; der kleine Satz sagt, wann es nicht gilt (du/Sie, Englisch)', () => {
    const info = designInfoSatz(u(true)); expect(info).toContain('wu'); expect(info).toContain('Personen einzeln gezogen'); expect(info).toContain('designbasiert'); expect(info).toContain('Taylor-Linearisierung');
    expect(designKleinSatz()).toContain('einzeln gezogen'); expect(designKleinSatz()).toContain('Statable kennt den Stichprobenplan nicht');
    s.einst.anrede = 'sie'; expect(designKleinSatz()).toContain('Sie angegeben haben');
    s.einst.sprache = 'en'; expect(designInfoSatz(u(true))).toMatch(/design-based/); expect(designKleinSatz()).not.toContain('gezogen');
    expect(SURVEY_VERSION).toBe('4.5');
  });
});
