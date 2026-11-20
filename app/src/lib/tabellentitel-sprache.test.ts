// Barrierefreiheit (NVDA-Messung 07.11.): Der Tabellenname trägt in jeder Sprache den übersetzten Titel, nie den englischen PSPP-Titel („Descriptives“).
// Ursache: Ausgabe.svelte zeichnete die Tabelle schon, bevor das Wörterbuch geladen war - kurz mit dem englischen Titel; der Screenreader behielt ihn als Namen.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { nodeEngine } from './testengine';
import { tabelleDe, woerterbuchBereit } from './export';
import { ladeWoerterbuch } from '../output/woerterbuch.svelte';
import type { TableItem } from '../engine/types';

const DE: Record<string, string> = JSON.parse(readFileSync(new URL('../output/de-dict.json', import.meta.url), 'utf8'));

describe('Tabellentitel: übersetzt, nie das englische PSPP-Original', () => {
  it('Varianzanalyse (Kennwerte, Test der Varianzen, ANOVA), Erkunden: Titel aus dem Wörterbuch', async () => {
    const e = await nodeEngine();
    const items = e.run(`DATA LIST FREE /g x.
BEGIN DATA
1 5 1 6 2 3 2 4.2 3 1 3 2 3 7 3 8
END DATA.
ONEWAY x BY g /STATISTICS=DESCRIPTIVES HOMOGENEITY.
EXAMINE /VARIABLES=x BY g /STATISTICS=DESCRIPTIVES /PLOT=NONE.
CROSSTABS /TABLES=g BY x.`);
    const tabellen = items.filter((i): i is TableItem => i.type === 'table');
    expect(tabellen.length).toBeGreaterThanOrEqual(5);
    for (const t of tabellen) {
      const roh = t.title?.t ?? t.label, titel = tabelleDe(t, DE).titel;
      if (DE[roh] !== undefined && DE[roh] !== roh) expect(titel, roh).toBe(DE[roh]);
    }
    expect(tabelleDe(tabellen.find(t => t.label === 'Descriptives')!, DE).titel).toBe('Deskriptive Statistiken');
  });
  it('jedes Wörterbuch kennt „Descriptives“ und „ANOVA“', () => {
    const ordner = new URL('../output/', import.meta.url);
    for (const f of readdirSync(ordner).filter(n => /-dict\.json$/.test(n))) {
      const d: Record<string, string> = JSON.parse(readFileSync(new URL(f, ordner), 'utf8'));
      expect(d['Descriptives'], f).toBeTruthy();
      expect(d['ANOVA'], f).toBeTruthy();
    }
  });
});

describe('Tabelle erst mit Wörterbuch der Sprache', () => {
  it('woerterbuchBereit: ohne Wörterbuch oder mit dem einer anderen Sprache nein', async () => {
    expect(woerterbuchBereit(null, 'de')).toBe(false);
    const de = await ladeWoerterbuch('de');
    expect(woerterbuchBereit(de, 'de')).toBe(true);
    expect(woerterbuchBereit(de, 'fr')).toBe(false);
    expect(woerterbuchBereit(await ladeWoerterbuch('en'), 'en')).toBe(true);
  });
  it('Ausgabe.svelte zeichnet die Tabelle nur, wenn bereit (kein englischer Titel als Tabellenname)', () => {
    const q = readFileSync(new URL('../bausteine/Ausgabe.svelte', import.meta.url), 'utf8');
    expect(q).toMatch(/woerterbuchBereit\(dc/);
    expect(q).toMatch(/\{#if it\.type === 'table'\}\s*\{#if bereit\}/);
    expect(q).toMatch(/\{#if !bereit && sichtbar/);
  });
});
