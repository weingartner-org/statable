import { describe, expect, it } from 'vitest';
import { artikelListe, type Block } from './artikel';
import { abschnitte, istUeberschrift } from './aufklappen';
import { artikelText } from './kern';
import { hilfeSeiten } from './seiten';

/**
 * Field-Stufe 3 (05.11.2026): die zwei Didaktik-Bausteine der Hilfe-Artikel.
 *  - „Stimmt nicht - so ist es“ (Block `falsch`): Fehlvorstellung als Behauptung und Richtigstellung.
 *  - „Zum Mitnehmen“ (Block `mitnehmen`): drei bis fünf Merksätze am Ende des Artikels, neutral ohne Anrede, bleibt in der Hilfe offen.
 * Pflicht in allen Artikeln der Lernpfade „Das lineare Modell“, „Varianzanalyse vertiefen“ und „Sauber forschen“.
 */
const LM = ['lm-modell-fehler', 'lm-freiheitsgrade', 'lm-signal-rauschen', 'lm-gruppen-regression', 'lm-annahmen', 'lm-diagramme', 'lm-daten-anlegen'];
const VV = ['vv-kontraste', 'vv-trend', 'vv-wechselwirkung', 'vv-einfache-effekte', 'vv-sphaerizitaet', 'vv-dunnett'];
const SF = ['sf-kreislauf', 'sf-p-hacking', 'sf-vorregistrierung', 'sf-p-grundsaetze', 'sf-bayes-vorwissen'];
const hat = (b: Block, art: 'falsch' | 'mitnehmen') => typeof b === 'object' && art in b;

describe('Didaktik-Bausteine in den Artikeln der Lernpfade', () => {
  for (const sp of ['de', 'en'] as const) {
    for (const id of [...LM, ...VV, ...SF]) {
      it(`${sp} ${id}: mindestens ein „Stimmt nicht - so ist es“ und am Ende „Zum Mitnehmen“ mit 3 bis 5 Sätzen`, () => {
        const art = artikelListe(sp).find(x => x.id === id);
        expect(art, id).toBeTruthy();
        const f = art!.inhalt.filter(b => hat(b, 'falsch'));
        expect(f.length, 'falsch-Block').toBeGreaterThanOrEqual(1);
        for (const b of f) {
          const x = (b as Extract<Block, { falsch: unknown }>).falsch;
          expect(x.kopf).toBe(sp === 'de' ? 'Stimmt nicht - so ist es' : 'Not true - this is how it is');
          expect(x.mythos.length).toBeGreaterThan(20); expect(x.richtig.length).toBeGreaterThan(40);
        }
        const letzter = art!.inhalt.at(-1)!;
        expect(hat(letzter, 'mitnehmen'), 'Zum Mitnehmen steht zuletzt').toBe(true);
        const m = (letzter as Extract<Block, { mitnehmen: unknown }>).mitnehmen;
        expect(m.kopf).toBe(sp === 'de' ? 'Zum Mitnehmen' : 'Take away');
        expect(m.punkte.length).toBeGreaterThanOrEqual(3); expect(m.punkte.length).toBeLessThanOrEqual(5);
        for (const p of m.punkte) { expect(p.length).toBeGreaterThan(15); expect(p).not.toMatch(/[–—]/); }
      });
    }
  }
  it('„Zum Mitnehmen“ beginnt einen eigenen, nie eingeklappten Abschnitt (nicht im „Quellen“)', () => {
    const art = artikelListe('de').find(x => x.id === 'lm-modell-fehler')!;
    const gruppen = abschnitte(art.inhalt);
    const letzte = gruppen.at(-1)!;
    expect(letzte).toHaveLength(1);
    expect(hat(letzte[0]!, 'mitnehmen')).toBe(true);
    expect(istUeberschrift(letzte[0]!)).toBe(false);
    expect(istUeberschrift(gruppen.at(-2)![0]!) && (gruppen.at(-2)![0] as { h: string }).h).toBe('Quellen');
  });
  it('die Suche findet auch Wörter in den neuen Blöcken (artikelText)', () => {
    const art = artikelListe('de').find(x => x.id === 'lm-freiheitsgrade')!;
    expect(artikelText(art)).toContain('Freiheitsgrade zählen die Werte');
    expect(artikelText(art)).toContain('Grundgesamtheit nicht unterschätzt');
  });
  it('feste Webseiten: beide Bausteine erscheinen mit Beschriftung (aside und section)', () => {
    const e = { sprachen: ['de', 'en'] as ('de' | 'en')[], artikel: { de: artikelListe('de'), en: artikelListe('en') }, unterzeile: { de: 'x', en: 'x' }, schrift: { normal: 'a.woff2', fett: 'b.woff2' } };
    const d = hilfeSeiten(e);
    const s = d.find(x => x.pfad === 'de/hilfe/lm-modell-fehler/index.html')!.inhalt;
    expect(s).toContain('<aside class="falsch" aria-label="Stimmt nicht - so ist es">');
    expect(s).toContain('<strong>Stimmt nicht:</strong>'); expect(s).toContain('<strong>So ist es:</strong>');
    expect(s).toContain('<section class="mitnehmen" aria-label="Zum Mitnehmen">');
    const en = d.find(x => x.pfad === 'en/hilfe/lm-modell-fehler/index.html')!.inhalt;
    expect(en).toContain('aria-label="Take away"');
  });
});
