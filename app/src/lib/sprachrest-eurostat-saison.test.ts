import { afterEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { ladeSprache } from '../i18n/laufzeit';
import {
  eurostatFehlerSatz, eurostatGeladenSatz, eurostatHinweisSatz, eurostatLizenzSatz, eurostatNachtragSatz, eurostatQuelleZeilen, eurostatTabelle, eurostatLesen, type EurostatFehler
} from './eurostat';
import { saisonHilfeSatz, saisonRCode, saisonSperreSatz, saisonVerweisSatz, saisonWarnungen } from './saisoncode';
import { protokollAnhang, quellenZeilen } from './protokollsaetze';
import { klumpenSperrSatz } from './gewichte';

/* Leitfaden Falle 12 und 20 für „Eurostat-Daten öffnen“ und „Saisonbereinigung als R-Code“ (Fachblatt SAISON-EUROSTAT): Ein fertiger Sprachtext, der in ein anderes `L(…)` eingesetzt wird, bleibt in jeder Sprache deutsch oder englisch.
 * Die Prüfsprache „xx“ setzt jeden übersetzten Text in [Klammern] mit Akzentbuchstaben (i18n/katalog.mjs, `pseudo`); was außerhalb übrig bleibt, ist fest eingesetzter deutscher oder englischer Text.
 * Voraussetzung: `node i18n/katalog.mjs` wurde nach dem letzten Ändern der Texte gelaufen (schreibt sprachen/xx.json). Muster: lib/sprachrest-massnahme.test.ts. Die Übersetzungen in die 13 Sprachen kommen aus einem anderen Auftrag. */
const vorher = s.einst.sprache;
afterEach(() => { s.einst.sprache = vorher; });
const AUSNAHMEN = ['ESS', 'SEATS', 'seasonal', 'summary', 'xreg', 'JSON', 'IP', 'SHA', 'ZZ'];
const rest = (t: string): string[] => (t.replace(/https?:\/\/\S+/g, '').match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) ?? []).filter(w => /[aeiouAEOUcny]/.test(w) && !AUSNAHMEN.includes(w));
const pruefe = (name: string, t: string) => { expect(t, name).toMatch(/^\[/); expect(rest(t), `${name}: Rest außerhalb der Klammern in „${t}“`).toEqual([]); };

const daten = (() => {
  const r = eurostatLesen({ version: '2.0', class: 'dataset', id: ['geo', 'time'], size: [1, 2], updated: '2026', dimension: { geo: { category: { index: { ZZ: 0 } } }, time: { category: { index: { '2021': 0, '2022': 1 } } } }, value: { '0': 1 }, status: { '1': 'p' } });
  if (!r.ok) throw new Error('Lesen'); return r.daten;
})();

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen von „Eurostat-Daten öffnen“', () => {
  it('alle Fehlersätze', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const alle: EurostatFehler[] = ['code', 'dimension', 'wert', 'zeit', 'zahl', 'doppelt', 'zeile', 'netz', 'zeitlimit', 'abgebrochen', 'umleitung', 'nicht-gefunden', 'abfrage', 'dienst', 'zu-gross', 'adresse', 'kein-json', 'form', 'zu-viele-zeilen', 'leer'];
    for (const f of alle) pruefe(`fehler ${f}`, eurostatFehlerSatz(f));
  });
  it('Satz nach dem Laden (Einzahl und Mehrzahl), Hinweis vor dem Klick, Nachtrag, Lizenz', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    pruefe('geladen', eurostatGeladenSatz(daten)); pruefe('geladen eine Zeile', eurostatGeladenSatz({ ...daten, zeilen: daten.zeilen.slice(0, 1) }));
    pruefe('hinweis', eurostatHinweisSatz()); pruefe('nachtrag', eurostatNachtragSatz()); pruefe('lizenz', eurostatLizenzSatz());
  });
  it('Quellenzeilen für Protokoll und Bericht (die Adresse bleibt, wie sie ist)', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const q = { datensatz: 'ZZ_1', abruf: '2026-10-31', aktualisiert: '2026-10-30T11:00:00+0100', adresse: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ZZ_1?format=JSON' };
    for (const z of eurostatQuelleZeilen(q)) pruefe('quelle', z);
    for (const z of eurostatQuelleZeilen({ ...q, aktualisiert: '' })) pruefe('quelle ohne updated', z);
    for (const z of quellenZeilen({ name: 'x', sha256: null, eurostat: q })) pruefe('protokoll', z);
    const a = protokollAnhang([], { name: 'x', sha256: null, eurostat: q });
    for (const z of a.zeilen) pruefe('anhang Quelle', z[1]!);
  });
  it('Köpfe der Tabelle mit Beschriftung: „Wert“, „Status“, „Beschriftung“', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const t = eurostatTabelle(daten, true);
    t.bezeichnungen.filter((_, i) => t.kopf[i] === 'wert' || t.kopf[i] === 'status').forEach(b => pruefe('Spalte', b));
    expect(t.kopf).toEqual(['geo', 'geo_text', 'time', 'time_text', 'wert', 'status']);
  });
});

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen der Saisonbereinigung', () => {
  it('Sperren, Hilfe, Verweis und die drei Warnungen', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const c of ['raster', 'luecken', 'zu-kurz'] as const) pruefe(`sperre ${c}`, saisonSperreSatz(c, { raster: 'monatlich' }));
    pruefe('sperre Quartal', saisonSperreSatz('zu-kurz', { raster: 'vierteljaehrlich' }));
    pruefe('hilfe', saisonHilfeSatz()); pruefe('verweis', saisonVerweisSatz());
    for (const w of saisonWarnungen()) pruefe(`warnung ${w.code}`, w.satz);
  });
  it('R-Text: die Kommentare sind übersetzt, der Code bleibt R', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const m of ['seats', 'x11'] as const) {
      const r = saisonRCode({ csvName: 'a.csv', bereinigtName: 'a-bereinigt.csv', modell: m, jahr: 1949, periode: 1, frequenz: 12 });
      const kommentare = r.split('\n').flatMap(z => (/^#/.test(z) ? [z.slice(2)] : /\s#\s/.test(z) ? [z.slice(z.indexOf('# ') + 2)] : []));
      expect(kommentare.length).toBeGreaterThanOrEqual(4);
      for (const k of kommentare.filter(x => !/^install\.packages/.test(x))) pruefe(`Kommentar ${m}`, k);
      expect(r).toContain('library(seasonal)'); expect(r).toContain('final(m)');
    }
  });
});

describe('Prüfsprache xx: der berichtigte Satz zum Stichprobenplan', () => {
  it('klumpenSperrSatz', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    pruefe('klumpen', klumpenSperrSatz());
  });
});
