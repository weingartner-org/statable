/** PSPP-Tabellen in jeder Sprache (Bauplan Sprachen, 0.5): Wörterbuch je Sprache, Rückfall auf das englische Original, Zahlen nach dem Sprachprofil. */
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { TableItem } from '../engine/types';
import { s } from '../lib/sitzung.svelte';
import { tabelleDe } from '../lib/export';
import { ladeWoerterbuch, woerterbuch, psppText, hatWoerterbuch } from './woerterbuch.svelte';
import { sammle, aufbau } from '../../i18n/pspp-vorlage.mjs';

const zelle = (r: number, c: number, t: string, o: Record<string, unknown> = {}) => ({ r, c, rs: 1, cs: 1, h: false, a: 'l', t, x: false, ...o });
/** Eine Mini-Tabelle wie von PSPP: Titel „Group Statistics“, Kopf „Mean“ / „Sig.“, eine Zeile mit Prozent und p-Wert. */
const tabelle = (): TableItem => ({
  type: 'table', label: 'Group Statistics', layer: [], title: { ...zelle(0, 0, 'Group Statistics', { x: true }) } as never,
  rows: 2, cols: 4, headRows: [1, 0], headCols: [1, 0],
  cells: [zelle(0, 0, '', { h: true, x: true }), zelle(0, 1, 'Mean', { h: true, x: true }), zelle(0, 2, 'Percent', { h: true, x: true }), zelle(0, 3, 'Sig.', { h: true, x: true }),
    zelle(1, 0, 'Gruppe A', { h: true }), zelle(1, 1, '3.25', { n: 3.25 }), zelle(1, 2, '12.5%', { n: 12.5 }), zelle(1, 3, '.000', { n: 0 })],
  caption: null, footnotes: []
}) as never;
const vorher = s.einst.sprache, zahlVorher = s.einst.zahl;
afterEach(() => { s.einst.sprache = vorher; s.einst.zahl = zahlVorher; });

describe('Wörterbuch je Sprache', () => {
  // Seit alle Sprachen ein Wörterbuch haben (09.10.), prüft „ohne Wörterbuch“ ein von Hand leeres - nie eine echte Sprache (Leitfaden Falle 21).
  it('Deutsch und übersetzte Sprachen haben eines, Englisch nicht', async () => {
    expect(hatWoerterbuch('de')).toBe(true);
    expect(hatWoerterbuch('en')).toBe(false);
    expect(hatWoerterbuch('cs')).toBe(true);
    expect((await ladeWoerterbuch('de'))['Group Statistics']).toBe('Gruppenstatistiken');
    expect((await ladeWoerterbuch('cs'))['Group Statistics']).toBe('Statistiky skupin');
    expect(await ladeWoerterbuch('en')).toEqual({});
  });
  it('woerterbuch() gibt nach dem Laden das Wörterbuch, für Englisch nie', async () => {
    await ladeWoerterbuch('de');
    expect(woerterbuch('de')).not.toBeNull();
    expect(woerterbuch('en')).toBeNull();
    expect(psppText('Group Statistics', 'de')).toBe('Gruppenstatistiken');
    expect(psppText('Coefficients', 'de')).toBe('Koeffizienten');   // Ergänzung zum Wörterbuch
    await ladeWoerterbuch('cs');
    expect(psppText('Group Statistics', 'cs')).toBe('Statistiky skupin');
    expect(psppText('Coefficients', 'cs')).toBe('Koeficienty');    // seit 24.10. im tschechischen Wörterbuch; die deutschen Ergänzungen (format-de.ts) gelten weiter nur im Deutschen
  });
});

describe('Tabelle in verschiedenen Sprachen', () => {
  it('Deutsch wie bisher, Prozent mit geschütztem Leerzeichen', async () => {
    s.einst.sprache = 'de'; s.einst.zahl = 'sprache';
    const t = tabelleDe(tabelle(), await ladeWoerterbuch('de'));
    expect(t.titel).toBe('Gruppenstatistiken');
    expect(t.zeilen[0]!.map(c => c.t)).toEqual(['', 'Mittelwert', 'Prozent', 'Sig.']);
    expect(t.zeilen[1]!.map(c => c.t)).toEqual(['Gruppe A', '3,25', '12,5 %', '< ,001']);
  });
  it('Englisch: Original, Dezimalpunkt', async () => {
    s.einst.sprache = 'en'; s.einst.zahl = 'sprache';
    const t = tabelleDe(tabelle(), await ladeWoerterbuch('en'));
    expect(t.titel).toBe('Group Statistics');
    expect(t.zeilen[0]!.map(c => c.t)).toEqual(['', 'Mean', 'Percent', 'Sig.']);
    expect(t.zeilen[1]!.map(c => c.t)).toEqual(['Gruppe A', '3.25', '12.5%', '< .001']);
  });
  it('Text nicht im Wörterbuch: englischer Text, Zahlen nach dem Profil (Tschechisch: Komma, „12,5 %“)', () => {
    s.einst.sprache = 'cs'; s.einst.zahl = 'sprache';
    const t = tabelleDe(tabelle(), {});
    expect(t.titel).toBe('Group Statistics');
    expect(t.zeilen[0]!.map(c => c.t)).toEqual(['', 'Mean', 'Percent', 'Sig.']);
    expect(t.zeilen[1]!.map(c => c.t)).toEqual(['Gruppe A', '3,25', '12,5 %', '< ,001']);
  });
  it('Italienisch ohne Leerzeichen vor %, Punkt-Einstellung bleibt beim Punkt', async () => {
    s.einst.sprache = 'it'; s.einst.zahl = 'sprache';
    expect(tabelleDe(tabelle(), {}).zeilen[1]!.map(c => c.t)).toEqual(['Gruppe A', '3,25', '12,5%', '< ,001']);
    s.einst.zahl = 'punkt';
    expect(tabelleDe(tabelle(), {}).zeilen[1]!.map(c => c.t)).toEqual(['Gruppe A', '3.25', '12.5%', '< .001']);
  });
  it('ein Wörterbuch einer anderen Sprache wird nicht benutzt (Sprachwechsel bei offener Anzeige)', async () => {
    const de = await ladeWoerterbuch('de');
    s.einst.sprache = 'cs'; s.einst.zahl = 'sprache';
    expect(tabelleDe(tabelle(), de).titel).not.toBe('Gruppenstatistiken');
    s.einst.sprache = 'en';
    expect(tabelleDe(tabelle(), de).titel).toBe('Group Statistics');
  });
  it('ein von Hand übergebenes Wörterbuch gilt wie es ist', () => {
    s.einst.sprache = 'cs'; s.einst.zahl = 'sprache';
    const t = tabelleDe(tabelle(), { 'Group Statistics': 'Statistiques de groupe', Mean: 'Moyenne' });
    expect(t.titel).toBe('Statistiques de groupe');
    expect(t.zeilen[0]![1]!.t).toBe('Moyenne');
  });
});

describe('Vorlage für Übersetzende', () => {
  it('src/i18n/pspp-vorlage.json ist aktuell (sonst: node i18n/pspp-vorlage.mjs)', () => {
    const datei = readFileSync(new URL('../i18n/pspp-vorlage.json', import.meta.url), 'utf8');
    expect(aufbau(sammle())).toBe(datei);
  });
  it('rund 240 Texte, je englisch und deutsch, darunter die häufigsten Köpfe', () => {
    const liste: { en: string; de: string }[] = JSON.parse(readFileSync(new URL('../i18n/pspp-vorlage.json', import.meta.url), 'utf8')).eintraege;
    expect(liste.length).toBeGreaterThan(90);
    expect(liste.length).toBeLessThan(400);   // 24.10.: 321 (sichtbare Texte typischer Läufe, testdaten/nacht-pspp-texte.json)
    const de = (en: string) => liste.find(e => e.en === en)?.de;
    expect(de('Std. Deviation')).toBeTruthy();
    expect(de('Sig. (2-tailed)')).toBeTruthy();
    expect(de('Group Statistics')).toBe('Gruppenstatistiken');
    // Spaltenköpfe, die PSPP mit Tabulator in einer Zeile ablegt, einzeln (fehlten bis 09.10. in allen Sprachen)
    expect(de("Cronbach's Alpha if Item Deleted")).toBeTruthy();
    expect(de('Nagelkerke R Square')).toBeTruthy();
    expect(de('% of Variance')).toBe('% der Varianz');
    expect(de('S.E.')).toBeTruthy();
    expect(liste.every(e => e.en && e.de)).toBe(true);
  });
});
