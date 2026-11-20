import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { s } from './sitzung.svelte';
import { klassLesen, klassIndex, klassZuordnen, eintraegeJeEbene, ebenenNummer, normalisiere, klassQuelleSatz, klassSchreibweiseSatz, klassNutsWarnung, klassNutsSpracheSatz, KLASSIFIKATIONEN, type KlassId, type Klassifikation } from './klassifikation';

/* NUTS 2021 und NUTS 2024 (Eurostat, Codes und Namen): Dateien unter public/klass, erzeugt von scripts/nuts-holen.mjs. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const ordner = new URL('../../public/klass/', import.meta.url);
const text = (id: string) => readFileSync(new URL(`${id}.json`, ordner), 'utf8');
const laden = (id: KlassId): Klassifikation => { const r = klassLesen(text(id), id); if (!r.ok) throw new Error(r.grund); return r.klass; };
const ZU = { ebene: 0, ziel: 'titel', sprache: 'de' } as const;

describe('NUTS-Dateien', () => {
  for (const id of ['nuts2021', 'nuts2024'] as const) {
    it(`${id}: Aufbau, eindeutige Codes, Ebenen 0 bis 3 (Ebene der Datei = NUTS-Ebene + 1), Lizenz und Herkunft in der Datei`, () => {
      const j = JSON.parse(text(id));
      expect(j.format).toBe('statable-klassifikation');
      expect(j.quelle.adresse).toMatch(/^https:\/\/ec\.europa\.eu\/eurostat\/documents\/345175\/629341\/NUTS2021(-NUTS2024)?\.xlsx$/);
      expect(j.quelle.sha256).toMatch(/^[0-9a-f]{64}$/); expect(j.quelle.abgerufen).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(j.lizenz).toContain('2011/833/EU'); expect(j.lizenz).toContain('Nennung der Quelle');
      expect(j.namensnennung).toBe('Datenquelle: Eurostat - NUTS (Systematik der Gebietseinheiten für die Statistik)');
      expect(Object.keys(j).sort()).toEqual(['anzahl', 'e', 'ebenen', 'format', 'id', 'lizenz', 'name', 'namensnennung', 'quelle', 'version']);
      const k = laden(id);
      expect(k.eintraege.length).toBe(j.anzahl);
      expect(new Set(k.eintraege.map(e => e.edv)).size).toBe(k.eintraege.length);
      expect(k.ebenen).toBe(4);
      for (const e of k.eintraege) { expect(e.edv).toMatch(/^[A-Z]{2}[A-Z0-9]{0,3}$/); expect(e.edv.length, e.edv).toBe(e.ebene + 1); expect(e.de.length, e.edv).toBeGreaterThan(0); }
      expect(klassIndex(k).mehrdeutig).toBe(0);
    });
  }
  it('Zahlen der Fassungen (an der Quelle gezählt) und Gewicht der Dateien', () => {
    expect(eintraegeJeEbene(laden('nuts2021'))).toEqual([37, 162, 371, 1551]);
    expect(eintraegeJeEbene(laden('nuts2024'))).toEqual([39, 162, 365, 1521]);
    for (const id of ['nuts2021', 'nuts2024']) expect(Buffer.byteLength(text(id))).toBeLessThan(150 * 1024);
  });
  it('Österreich: 1 Land, 3 Gruppen von Bundesländern (NUTS 1), 9 Bundesländer (NUTS 2), 35 Regionen (NUTS 3) plus Extra-Regio, in beiden Fassungen', () => {
    for (const id of ['nuts2021', 'nuts2024'] as const) {
      const at = laden(id).eintraege.filter(e => e.edv.startsWith('AT'));
      const ohneZ = at.filter(e => !e.edv.includes('Z'));
      expect(ohneZ.map(e => e.ebene).reduce((a, e) => { a[e - 1]!++; return a; }, [0, 0, 0, 0])).toEqual([1, 3, 9, 35]);
      expect(at.filter(e => e.edv.includes('Z')).map(e => e.edv)).toEqual(['ATZ', 'ATZZ', 'ATZZZ']);
    }
  });
});

describe('Zuordnen: NUTS', () => {
  const k = laden('nuts2024'), idx = klassIndex(k);
  const einer = (c: string, opt: Partial<Parameters<typeof klassZuordnen>[3]> = {}) => klassZuordnen(k, idx, [c], { ...ZU, ...opt });
  it('Beispielcodes: Titel und Vorfahren auf gewählter Ebene (Ebene der Datei 1 = NUTS 0 bis 4 = NUTS 3)', () => {
    expect(einer('AT').werte).toEqual(['Österreich']);
    expect(einer('AT11').werte).toEqual(['Burgenland']);
    expect(einer('AT111').werte).toEqual(['Mittelburgenland']);
    expect(einer('AT111', { ebene: 3 }).werte).toEqual(['Burgenland']);
    expect(einer('AT111', { ebene: 2, ziel: 'code' }).werte).toEqual(['AT1']);
    expect(einer('AT111', { ebene: 1, ziel: 'code' }).werte).toEqual(['AT']);
    expect(einer('AT1', { ebene: 4 }).zuGrob).toBe(1);
    expect(einer('DE300').werte).toEqual(['Berlin']);
  });
  it('Schreibweise: Groß- und Kleinschreibung und Leerzeichen zählen nicht; Punkt und Bindestrich schon (keine Näherungssuche)', () => {
    expect(einer(' at 11 ').werte).toEqual(['Burgenland']);
    expect(einer('AT-11').werte).toEqual([null]); expect(einer('AT.11').nichtGefunden).toBe(1);
    expect(normalisiere(' at 11 ', 'nuts')).toBe('AT11');
    expect(einer('AT999').nichtGefunden).toBe(1); expect(einer('AT999').beispiele).toEqual(['AT999']);
  });
  it('bulgarische und griechische Namen: Landessprache, englisch lateinische Umschrift', () => {
    expect(einer('BG311').werte).toEqual(['Видин']); expect(einer('BG311', { sprache: 'en' }).werte).toEqual(['Vidin']);
    expect(einer('EL301', { sprache: 'en' }).werte).toEqual(['Voreios Tomeas Athinon']);
    expect(einer('AT11', { sprache: 'en' }).werte).toEqual(['Burgenland']);
  });
  it('die Fassungen unterscheiden sich: Region ohne Entsprechung in der anderen Fassung bleibt dort leer und wird gezählt', () => {
    const a = laden('nuts2021'), b = laden('nuts2024');
    const nur21 = a.eintraege.filter(e => !b.eintraege.some(x => x.edv === e.edv)).map(e => e.edv), nur24 = b.eintraege.filter(e => !a.eintraege.some(x => x.edv === e.edv)).map(e => e.edv);
    expect(nur21).toContain('DEG0B'); expect(nur24.length).toBeGreaterThan(0);
    expect(klassZuordnen(b, idx, ['DEG0B', 'AT11'], ZU)).toMatchObject({ gefunden: 1, nichtGefunden: 1 });
    expect(nur21).toContain('UK');   // Vereinigtes Königreich nur 2021
  });
  it('Sätze: Quelle mit Lizenz-Beschluss, Sprache, Schreibweise und die Warnung vor dem Fassungswechsel', () => {
    expect(klassQuelleSatz(k)).toContain('Eurostat'); expect(klassQuelleSatz(k)).toContain('2011/833/EU'); expect(klassQuelleSatz(k)).toContain('Datenquelle: Eurostat - NUTS');
    expect(klassNutsWarnung()).toContain('nicht gleich'); expect(klassNutsWarnung()).toContain('keinen Umsteigeschlüssel');
    expect(klassNutsSpracheSatz()).toContain('Landessprache'); expect(klassSchreibweiseSatz('nuts')).toContain('at11 und AT11');
  });
  it('NUTS-Ebene zählt von 0; Eintrag in KLASSIFIKATIONEN', () => {
    const info = KLASSIFIKATIONEN.find(x => x.id === 'nuts2024')!;
    expect(info.anbieter).toBe('eurostat'); expect([1, 2, 3, 4].map(e => ebenenNummer(info, e))).toEqual([0, 1, 2, 3]);
  });
  it('Herkunft: die Prüfsumme der Quelle in der Datei ist die Prüfsumme der Eurostat-Datei vom Abruf (Form), Skript nennt Lizenz und Adresse', () => {
    const skript = readFileSync(new URL('../../../scripts/nuts-holen.mjs', import.meta.url), 'utf8');
    expect(skript).toContain('2011/833/EU'); expect(skript).toContain('https://ec.europa.eu/eurostat/en/help/copyright-notice');
    expect(createHash('sha256').update(text('nuts2024')).digest('hex')).toMatch(/^[0-9a-f]{64}$/);
  });
});
