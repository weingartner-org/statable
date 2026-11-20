import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { FREIGEGEBEN, IN_ARBEIT, SPRACHNAMEN, vorhanden } from './laufzeit';
import { browserSprache } from '../lib/sitzung.svelte';

const LADE = readFileSync(new URL('../../public/lade-sprache.js', import.meta.url), 'utf8');

/** Führt den Ladebildschirm-Code (public/lade-sprache.js) mit einer Systemsprache aus und gibt die Sprache der Seite zurück. */
function ladebildschirm(system: string, suche = ''): string {
  const html = { lang: 'de' };
  const karte = { textContent: '' };
  const lade = { setAttribute: () => {}, querySelector: () => karte };
  runInNewContext(LADE, {
    URLSearchParams, JSON,
    location: { search: suche },
    localStorage: { getItem: () => null },
    navigator: { languages: [system], language: system },
    document: { documentElement: html, getElementById: () => lade }
  });
  return html.lang;
}

describe('Freigabe der Sprachen (09.10.2026: alle 15)', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('alle Sprachen außer den Prüfsprachen xx und xr und den Sprachen in Arbeit sind freigegeben und haben ihre Texte', () => {
    expect([...FREIGEGEBEN].sort()).toEqual(Object.keys(SPRACHNAMEN).filter(x => x !== 'xx' && x !== 'xr' && !IN_ARBEIT.includes(x as never)).sort());
    for (const sp of FREIGEGEBEN) expect(vorhanden(sp), sp).toBe(true);
  });

  it('der Ladebildschirm kennt dieselbe Liste wie die App', () => {
    const frei = /var FREI = (\[[^\]]*\])/.exec(LADE)?.[1];
    expect(frei).toBeTruthy();
    expect(JSON.parse(frei!.replace(/'/g, '"'))).toEqual(FREIGEGEBEN);
  });

  it('ein polnischer Rechner bekommt Polnisch - schon im Ladebildschirm und in der App', () => {
    expect(ladebildschirm('pl-PL')).toBe('pl');
    vi.stubGlobal('document', {});
    vi.stubGlobal('location', { search: '' });
    vi.stubGlobal('navigator', { languages: ['pl-PL', 'en-US'], language: 'pl-PL' });
    expect(browserSprache()).toBe('pl');
  });

  it('jede freigegebene Systemsprache wird übernommen, eine fremde wird Englisch', () => {
    vi.stubGlobal('document', {});
    vi.stubGlobal('location', { search: '' });
    for (const [system, soll] of [['uk-UA', 'uk'], ['el-GR', 'el'], ['pt-PT', 'pt'], ['sv-SE', 'sv'], ['de-AT', 'de'], ['ja-JP', 'en'], ['ru-RU', 'en']] as const) {
      vi.stubGlobal('navigator', { languages: [system], language: system });
      expect(browserSprache(), system).toBe(soll);
      expect(ladebildschirm(system), system).toBe(soll);
    }
  });

  it('die Prüfsprache gibt es nur über die Adresse', () => {
    expect(FREIGEGEBEN).not.toContain('xx');
    expect(ladebildschirm('en-US', '?sprache=xx')).toBe('en');   // xx zeigt die Seite als englisch an
  });
});
