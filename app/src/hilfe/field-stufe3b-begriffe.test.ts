import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { artikelListe } from './artikel';
import { ladeGlossar } from './glossar';
import { baueIndex, finde } from './begriffsfinder';

/**
 * Field-Stufe 3b (05.11.2026): Die Fachbegriffe der neuen Teile (robuste Verfahren, Winsorisieren, HC4, Rückwärts-Eliminierung, Bayes mit Vorwissen) müssen im Glossar stehen (Deutsch und Englisch)
 * und im Text anklickbar werden. Der Verlinker nimmt das Titelwort jedes Eintrags (Titel bis zur Klammer, nur ganze Wörter); die Texte benutzen genau diese Schreibweisen.
 * Neu angelegt: yuen-test, robuste-varianzanalyse, hc4, hierarchisches-loglineares-modell, rueckwaerts-eliminierung, k-weg-effekt; die übrigen waren schon da.
 */
const WOERTER: Record<'de' | 'en', [string, string][]> = {
  de: [['Getrimmtes Mittel', 'getrimmtes-mittel'], ['Winsorisieren', 'winsorisieren'], ['Yuen-Test', 'yuen-test'], ['Robuste Varianzanalyse', 'robuste-varianzanalyse'], ['HC4-Standardfehler', 'hc4'],
    ['Hierarchisches loglineares Modell', 'hierarchisches-loglineares-modell'], ['Rückwärts-Eliminierung', 'rueckwaerts-eliminierung'], ['K-Weg-Effekt', 'k-weg-effekt'],
    ['Prior', 'prior'], ['Posterior', 'posterior'], ['Likelihood', 'likelihood'], ['Glaubwürdigkeitsintervall', 'glaubwuerdigkeitsintervall'], ['Beta-Verteilung', 'beta-verteilung']],
  en: [['Trimmed mean', 'getrimmtes-mittel'], ['Winsorizing', 'winsorisieren'], ['Yuen test', 'yuen-test'], ['Robust analysis of variance', 'robuste-varianzanalyse'], ['HC4 standard error', 'hc4'],
    ['Hierarchical log-linear model', 'hierarchisches-loglineares-modell'], ['Backward elimination', 'rueckwaerts-eliminierung'], ['K-way effect', 'k-weg-effekt'],
    ['Prior', 'prior'], ['Posterior', 'posterior'], ['Likelihood', 'likelihood'], ['Credible interval', 'glaubwuerdigkeitsintervall'], ['Beta distribution', 'beta-verteilung']]
};
const MIT_SATZ = ['getrimmtes-mittel', 'winsorisieren', 'yuen-test', 'robuste-varianzanalyse', 'hc4', 'hierarchisches-loglineares-modell', 'rueckwaerts-eliminierung', 'k-weg-effekt', 'prior', 'posterior', 'likelihood', 'glaubwuerdigkeitsintervall', 'beta-verteilung'];
const NEU = ['yuen-test', 'robuste-varianzanalyse', 'hc4', 'hierarchisches-loglineares-modell', 'rueckwaerts-eliminierung', 'k-weg-effekt'];
/** Wörter, die wirklich in den Texten der Bausteine stehen (nicht nur im Glossar). */
const IM_TEXT: Record<'de' | 'en', string[]> = {
  de: ['Getrimmtes Mittel', 'Yuen-Test', 'Robuste Varianzanalyse', 'Winsorisieren', 'Rückwärts-Eliminierung', 'K-Weg-Effekt', 'HC4-Standardfehler', 'Prior', 'Posterior', 'Likelihood', 'Glaubwürdigkeitsintervall', 'Beta-Verteilung'],
  en: ['Trimmed mean', 'Yuen test', 'Robust analysis of variance', 'Winsorizing', 'Backward elimination', 'K-way effect', 'HC4 standard error', 'Prior', 'Posterior', 'Likelihood', 'credible interval', 'beta distribution']
};
const dateien = ['bausteine/BlattRobust.svelte', 'bausteine/LoglinRueck.svelte', 'bausteine/RobustBlock.svelte', 'bausteine/LernlaborBayes.svelte', 'bausteine/AssistentWinsor.svelte', 'lib/getrimmtsaetze.ts', 'lib/loglinrueck-saetze.ts', 'lib/winsorbefehl.ts', 'lib/datenassistenten.ts'];
const quelltext = dateien.map(f => readFileSync(join(import.meta.dirname, '..', f), 'utf8')).join('\n');
const quelltextKlein = quelltext.toLowerCase();

describe('Neue Fachbegriffe (Field-Stufe 3b) sind im Glossar und im Text anklickbar', () => {
  beforeAll(async () => { await ladeGlossar('de'); await ladeGlossar('en'); });
  for (const sp of ['de', 'en'] as const) {
    it(`${sp}: jeder Begriff in einem Satz führt zum richtigen Eintrag`, () => {
      const ix = baueIndex(artikelListe(sp), sp);
      for (const [wort, id] of WOERTER[sp]) {
        const text = `Im Ergebnis steht ${wort} als Zahl.`;
        const f = finde(text, ix).map(x => `${text.slice(x.von, x.bis)}=${x.id}`).map(x => x.toLowerCase());
        expect(f, wort).toContain(`${wort}=${id}`.toLowerCase());
      }
    });
    it(`${sp}: die Begriffe tragen den Satz „So geht es in Statable“`, () => {
      const vor = sp === 'de' ? 'So geht es in Statable: ' : 'How it works in Statable: ';
      for (const id of MIT_SATZ) {
        const a = artikelListe(sp).find(x => x.id === id);
        expect(a, `${sp} ${id}`).toBeDefined();
        expect(a!.inhalt.some(b => typeof b === 'string' && b.startsWith(vor)), `${sp} ${id}`).toBe(true);
      }
    });
    it(`${sp}: die Wörter stehen wirklich in den Texten der Bausteine`, () => { for (const w of IM_TEXT[sp]) expect(quelltextKlein, w).toContain(w.toLowerCase()); });
  }
  it('Die sechs neuen Einträge haben Beispiel, Vorsicht und gültige Verweise (de und en)', () => {
    const alle = new Set(artikelListe('en').map(a => a.id));
    for (const sp of ['de', 'en'] as const) for (const id of NEU) {
      const a = artikelListe(sp).find(x => x.id === id)!;
      expect(a, `${sp} ${id}`).toBeDefined();
      expect(a.inhalt.length, `${sp} ${id}`).toBeGreaterThanOrEqual(4);
      for (const z of a.verwandt) expect(alle.has(z), `${id} → ${z}`).toBe(true);
    }
  });
  it('Die Hilfe-Artikel zu den robusten Verfahren und zur Rückwärts-Eliminierung gibt es (de und en) und nennen die Kernwörter', () => {
    const text = (sp: 'de' | 'en', id: string) => JSON.stringify(artikelListe(sp).find(x => x.id === id)!.inhalt);
    for (const sp of ['de', 'en'] as const) {
      expect(text(sp, 'robuste-verfahren')).toMatch(/Yuen/); expect(text(sp, 'robuste-verfahren')).toMatch(sp === 'de' ? /Rangtest/ : /rank test/);
      expect(text(sp, 'loglinear-rueckwaerts')).toMatch(sp === 'de' ? /zufallsabhängig/ : /depends on chance/);
      expect(text(sp, 'frage-loglinear')).toMatch(sp === 'de' ? /Rückwärts/ : /backward/i);
    }
  });
});
