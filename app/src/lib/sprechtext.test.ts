import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { s } from './sitzung.svelte';
import { sprechbar } from './sprechtext';
import { bildtext } from './bildtext';

/* Wächter (B10): gesprochener Text enthält keine Zeichen, die NVDA mit „hochgestellte 2“ oder „Kreuz“ vorliest. Sichtbarer Text behält das Zeichen. */
const vorher = s.einst.sprache;
afterEach(() => { s.einst.sprache = vorher; });
const mit = <T>(sp: 'de' | 'en', f: () => T): T => { s.einst.sprache = sp; return f(); };

describe('sprechbar', () => {
  it('schreibt Quadrat-Zeichen und mal aus (de)', () => {
    mit('de', () => {
      expect(sprechbar('η² = 0,12; ω² = 0,1; R² = 0,5; χ² = 4; G² = 3')).toBe('Eta-Quadrat = 0,12; Omega-Quadrat = 0,1; R-Quadrat = 0,5; Chi-Quadrat = 4; G-Quadrat = 3');
      expect(sprechbar('Alter × Geschlecht')).toBe('Alter mal Geschlecht');
      expect(sprechbar('korr. R² und ΔR²')).toBe('korr. R-Quadrat und Delta-R-Quadrat');
    });
  });
  it('englisch', () => {
    mit('en', () => {
      expect(sprechbar('η² und R²')).toBe('eta squared und R squared');
      expect(sprechbar('A × B')).toBe('A times B');
    });
  });
  it('lässt Text ohne Zeichen unverändert', () => { expect(sprechbar('Alter 12')).toBe('Alter 12'); });
  it('Bildtext sagt kein ² und kein × (auch aus Namen in den Daten)', () => {
    const t = bildtext('saeulen', { kategorieName: 'Fach × Jahr', kategorien: ['A', 'B'], wertName: 'R² je Gruppe', reihen: [{ werte: [1, 2] }] });
    const alles = JSON.stringify(t);
    expect(alles).not.toMatch(/[²×]/);
  });
});

describe('Wächter: Quelltext der Bildtexte', () => {
  it('keine „²“ oder „×“ in lib/bildtext/*.ts (Texte werden ausgeschrieben)', () => {
    const dir = new URL('./bildtext/', import.meta.url);
    for (const f of readdirSync(dir).filter(x => x.endsWith('.ts'))) {
      const code = readFileSync(new URL(f, dir), 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
      expect(code, f).not.toMatch(/[²×]/);
    }
  });
});
