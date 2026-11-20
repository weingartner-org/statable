import { describe, it, expect, afterEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { L, d, s } from '../lib/sitzung.svelte';
import { ladeSprache, IN_ARBEIT } from './laufzeit';
// @ts-expect-error reines Node-Werkzeug ohne Typen
import { sammle } from '../../i18n/katalog.mjs';

const katalog: Record<string, { de: string | string[]; en?: string | string[] }> = JSON.parse(readFileSync(new URL('./katalog.json', import.meta.url), 'utf8'));
const platz = (t: string) => [...t.matchAll(/\{(\d+)\}/g)].map(m => m[1]).sort().join(',');

describe('Sprachkatalog', () => {
  afterEach(() => { s.einst.sprache = 'de'; });

  it('katalog.json ist aktuell (sonst: node i18n/katalog.mjs)', () => {
    expect(JSON.stringify(sammle(), null, 1) + '\n').toBe(readFileSync(new URL('./katalog.json', import.meta.url), 'utf8'));
  });

  it('Deutsch und Englisch kommen weiter aus dem Code', () => {
    s.einst.sprache = 'de'; expect(L('Abbrechen', 'Cancel')).toBe('Abbrechen');
    s.einst.sprache = 'en'; expect(L('Abbrechen', 'Cancel')).toBe('Cancel');
  });

  it('jede andere Sprache aus ihrer Datei, mit eingesetzten Werten', async () => {
    await ladeSprache('xx');
    s.einst.sprache = 'xx';
    const n = 3;
    expect(L('Abbrechen', 'Cancel')).toBe('[Cáñçël ···]');
    const t = L(`${n} Personen`, `${n} people`);
    expect(t).toMatch(/^\[3 /);
    expect(d('Deine Daten', 'Ihre Daten', 'Your data')).toMatch(/^\[/);
  });

  it('fehlt ein Text, gilt Englisch', async () => {
    await ladeSprache('xx');
    s.einst.sprache = 'xx';
    const nichtImKatalog = ['Gibt es nicht', 'Does not exist'] as const;
    expect(L(nichtImKatalog[0], nichtImKatalog[1])).toBe('Does not exist');
  });

  it('jede Sprachdatei: nur bekannte Schlüssel, Platzhalter vollständig', () => {
    const ordner = new URL('./sprachen/', import.meta.url);
    for (const f of readdirSync(ordner).filter(f => f.endsWith('.json'))) {
      const tab: Record<string, string | Record<string, string>> = JSON.parse(readFileSync(new URL(f, ordner), 'utf8'));
      // Sprachen in Arbeit (V6a, sprachen7) tragen noch Schlüssel alter de/en-Texte; die räumt `uebersetzen.mjs --zusammen` beim Nachziehen (V6b) weg.
      const inArbeit = (IN_ARBEIT as string[]).includes(f.replace(/\.(hilfe\.)?json$/, ''));
      for (const [k, t] of Object.entries(tab)) {
        const q = katalog[k];
        if (inArbeit && !q) continue;
        expect(q, `${f}: ${k} steht nicht im Katalog`).toBeDefined();
        const vorlage = [q!.en ?? q!.de].flat().at(-1)!;
        // Mehrzahl: eine Form darf die Zahl weglassen („eine Zeile“), aber keinen fremden Platzhalter haben
        if (typeof t === 'string') expect(platz(t), `${f}: ${k} Platzhalter`).toBe(platz(vorlage));
        else for (const form of Object.values(t)) expect(platz(vorlage).split(',').filter(Boolean), `${f}: ${k}`).toEqual(expect.arrayContaining(platz(form).split(',').filter(Boolean)));
      }
    }
  });
});
