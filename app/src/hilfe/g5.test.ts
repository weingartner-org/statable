import { describe, it, expect } from 'vitest';
import { artikelListe } from './artikel';
import { suche } from './suche';

/* G5: die Hilfe-Artikel zu Friedman, McNemar und Cochran-Q: unter 250 Wörtern, gleich gebaut in de und en, auffindbar, Gerüst Kurz … Quelle, der PSPP-Hinweis zu McNemar. */
const de = artikelListe('de'), en = artikelListe('en');
const wort = (a: { inhalt: unknown[] }) => a.inhalt.map(b => typeof b === 'string' ? b : Object.values(b as object).flat().join(' ')).join(' ').split(/\s+/).length;
const ids = (q: string, l = de) => suche(l, q).map(t => t.artikel.id);
const IDS = ['friedman-test', 'mcnemar-test-cochran-q'];

describe('Hilfe G5: Friedman, McNemar, Cochran-Q', () => {
  it('unter 450 Wörtern, Gerüst Kurz · So geht es in Statable · … · Für Fachleute (Block 2, 30.10.2026)', () => {
    for (const [l, ueber] of [[de, ['Kurz', 'So geht es in Statable', 'Für Fachleute']], [en, ['In brief', 'How it works in Statable', 'For specialists']]] as const) {
      for (const id of IDS) {
        const a = l.find(x => x.id === id)!;
        expect(a, id).toBeDefined(); expect(wort(a), `${id} Wörter`).toBeLessThan(450);
        const h = a.inhalt.filter(b => typeof b === 'object' && 'h' in (b as object)).map(b => (b as { h: string }).h);
        for (const x of ueber) expect(h, id).toContain(x);
        expect(h[0], id).toBe(ueber[0]); expect(h[h.length - 1], id).toBe(ueber[2]);
      }
    }
  });
  it('Titel, Quelle, McNemar-Satz zu PSPP und R', () => {
    expect(de.find(a => a.id === 'friedman-test')!.titel).toMatch(/\(Friedman-Test\)$/);
    expect(de.find(a => a.id === 'mcnemar-test-cochran-q')!.titel).toMatch(/\(McNemar-Test, Cochran-Q\)$/);
    const t = JSON.stringify(de.find(a => a.id === 'mcnemar-test-cochran-q')!.inhalt), e = JSON.stringify(en.find(a => a.id === 'mcnemar-test-cochran-q')!.inhalt);
    expect(t).toContain('McNemar wird exakt (binomial) gerechnet, wie in PSPP. R mcnemar.test rechnet dagegen χ² mit Stetigkeitskorrektur, darum weichen die p-Werte ab.');
    expect(e).toContain('R mcnemar.test uses χ² with a continuity correction');
    for (const id of IDS) { const j = JSON.stringify(de.find(a => a.id === id)!.inhalt); expect(j).toMatch(/Hollander, M\., Wolfe, D\. A\. & Chicken, E\. \(2014\)/); }
    expect(JSON.stringify(de.find(a => a.id === 'mcnemar-test-cochran-q')!.inhalt)).toContain('Agresti, A. (2013)');
  });
  it('auffindbar in beiden Sprachen', () => {
    for (const q of ['Friedman', 'Kendalls W', 'Rangtest Messwiederholung']) expect(ids(q), q).toContain('friedman-test');
    for (const q of ['McNemar', 'Cochran', 'Ja Nein Veränderung', 'diskordante Paare']) expect(ids(q), q).toContain('mcnemar-test-cochran-q');
    expect(ids('Friedman', en)).toContain('friedman-test'); expect(ids('McNemar', en)).toContain('mcnemar-test-cochran-q'); expect(ids('Cochran', en)).toContain('mcnemar-test-cochran-q');
    expect(ids('McNemar')[0]).toBe('mcnemar-test-cochran-q'); expect(ids('Friedman')[0]).toBe('friedman-test');
  });
  it('die Frageartikel verweisen auf beide', () => {
    for (const id of ['frage-praepost', 'frage-messwiederholung']) { const a = de.find(x => x.id === id)!; expect(a.verwandt.some(v => IDS.includes(v)), id).toBe(true); }
  });
});
