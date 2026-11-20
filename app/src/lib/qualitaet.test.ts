import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { s } from './sitzung.svelte';
import { ladeSprache } from '../i18n/laufzeit';
import { qualitaetKarten } from './qualitaet';
import { qualitaetEintraege, rangiere, anzeige, hilfeArtikel } from './palette-treffer';
/** Wörter mit unverändertem Buchstaben (Prüfsprache xx, Muster lib/sprachrest-f2.test.ts). */
const rest = (t: string): string[] => (t.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) ?? []).filter(w => /[aeiouAEOUcny]/.test(w));

/** Qualität und Prozess: eine Liste für Kacheln (Blatt.svelte) und Befehlspalette; Wächter, dass beide sie nutzen. */
const vorher = s.einst.sprache;
afterEach(() => { s.einst.sprache = vorher; });
const lies = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('Qualitätskarten in der Befehlspalette', () => {
  const e = () => qualitaetEintraege(qualitaetKarten());
  it('Suche trifft die Karten: Regelkarte, Gauge, Messsystem, Cp', () => {
    const erste = (f: string) => rangiere(f, e())[0]?.id;
    expect(erste('Regelkarte')).toBe('auswertung-qualitaet-regelkarte');
    expect(erste('Gauge')).toBe('auswertung-qualitaet-messsystem');
    expect(erste('Messsystem')).toBe('auswertung-qualitaet-messsystem');
    expect(erste('Cp')).toBe('auswertung-qualitaet-regelkarte');
    expect(erste('Nachweisgrenze')).toBe('auswertung-qualitaet-kalibrier');
  });
  it('Auswertung vor Hilfe: bei „Gauge“ steht die Karte vor dem Hilfe-Artikel (Alltagsfrage mit Fachbegriff zuerst)', () => {
    const hilfe = hilfeArtikel([{ id: 'messsystemanalyse-gauge-rr', titel: 'Wie gut ist das Messsystem? (Messsystemanalyse, Gauge R&R)' }]);
    for (const f of ['gauge', 'Gauge R&R', 'messsystemanalyse']) {
      const r = rangiere(f, [...hilfe, ...e()]).map(t => t.quelle);
      expect(r.indexOf('auswertung'), f).toBeGreaterThanOrEqual(0);
      expect(r.indexOf('auswertung'), f).toBeLessThan(r.indexOf('hilfe'));
    }
  });
  it('Fachbegriff steht neben der Alltagsfrage, Aktion springt zum Block', () => {
    const t = rangiere('gauge', e())[0]!;
    expect(anzeige(t)).toBe('Misst mein Messgerät zuverlässig? (Messsystemanalyse (Gauge R&R))');
    expect(t.aktion).toEqual({ art: 'karte', id: 'gruppen', qualitaet: 'messsystem' });
  });
  it('Wächter: Blatt.svelte und Palette nutzen dieselbe Liste, keine zweite lokale', () => {
    expect(lies('../seiten/Blatt.svelte')).toContain('qualitaetKarten()');
    expect(lies('../seiten/Blatt.svelte')).not.toMatch(/id: 'regelkarte'/);
    const p = lies('../bausteine/Befehlspalette.svelte');
    expect(p).toContain('qualitaetEintraege(qualitaetKarten())');
    expect(p).toContain('data-qualitaet');
  });
  it('Prüfsprache xx: kein deutscher oder englischer Rest', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const k of qualitaetKarten()) for (const [n, t] of [['titel', k.titel], ['zusatz', k.zusatz], ['beispiel', k.beispiel]]) {
      expect(t, `${k.id}.${n}`).toMatch(/^\[/);
      expect(rest(t), `${k.id}.${n}: Rest in „${t}“`).toEqual([]);
    }
  });
});
