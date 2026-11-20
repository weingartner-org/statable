/**
 * B3 Teil 1c (14.11.2026): Die Zahlen der Einheit `woerter-zaehlen` (Artikel `ta-woerter-zaehlen`, Fragen `eh-ta-…`) stammen aus scripts/textanalyse-erwartet.R (Basis-R, R 4.6.1).
 * Dieser Wächter rechnet sie mit lib/textanalyse.ts nach (die Bibliothek ist gegen R geprüft: lib/textanalyse.test.ts) und prüft, dass Pfad, Einheit, Thema und Fragen zusammenpassen.
 */
import { describe, it, expect } from 'vitest';
import { FRAGEN_TEXTANALYSE } from './fragen-textanalyse';
import { ROH_TEXTANALYSE } from '../hilfe/artikel-textanalyse';
import { einheitNach, pfadNach, themaDerFrage } from './lernplan';
import { typischeWoerter, woerterbuchZaehlen, wortliste, kwic } from '../lib/textanalyse';

const A = ['Ich bin heute müde und die Arbeit ist schwer', 'Die Arbeit macht Spaß, die Kollegen sind nett', 'Müde, müde, immer müde'];
const B = ['Der Urlaub war schön und die Sonne schien', 'Spaß am Strand, die Kinder sind froh'];
const txt = (o: unknown) => JSON.stringify(o);

describe('B3 Teil 1c: Lehre Wörter zählen', () => {
  it('Einheit im Pfad, sechs Fragen, Thema erheben', () => {
    expect(pfadNach('interviews-qualitativ')!.einheiten).toContain('woerter-zaehlen');
    const e = einheitNach('woerter-zaehlen')!;
    expect(e.fragen).toEqual(FRAGEN_TEXTANALYSE.map(f => f.id));
    expect(e.fragen.length).toBe(6);
    for (const f of FRAGEN_TEXTANALYSE) expect(themaDerFrage(f.id)).toBe('erheben');
    expect(ROH_TEXTANALYSE[0].id).toBe('ta-woerter-zaehlen');
  });
  it('Zahlen im Beispiel stimmen mit der Bibliothek (und damit mit R) überein', () => {
    expect(wortliste(A).gesamt).toBe(21);
    expect(wortliste(B).gesamt).toBe(15);
    const t = typischeWoerter(A, B);
    const m = t.find(z => z.wort === 'müde')!, d = t.find(z => z.wort === 'die')!;
    expect([m.a, m.b]).toEqual([4, 0]);
    expect(m.g2.toFixed(2)).toBe('4.31');
    expect(m.p.toFixed(3)).toBe('0.038');
    expect([d.a, d.b]).toEqual([3, 2]);
    expect(d.g2.toFixed(3)).toBe('0.006');
    expect(Math.round(100 * 3 / 21)).toBe(14);
    expect(Math.round(100 * 2 / 15)).toBe(13);
    expect(kwic(A, 'Arbeit')).toHaveLength(2);
    expect(woerterbuchZaehlen(A, [{ name: 'E', woerter: ['müde*', 'schwer'] }]).zeilen[0].summe).toBe(5);
    expect(woerterbuchZaehlen(['schwer schwere Schwerpunkt'], [{ name: 'S', woerter: ['schwer*'] }]).zeilen[0].summe).toBe(3);
  });
  it('Artikel und Fragen nennen dieselben Zahlen', () => {
    const art = txt(ROH_TEXTANALYSE[0]);
    for (const z of ['21 Wörtern', '15 Wörtern', '4,31', '0,038', '0,006']) expect(art).toContain(z);
    const p = txt(FRAGEN_TEXTANALYSE.find(f => f.id === 'eh-ta-p'));
    for (const z of ['4,31', '0,038', '4.31', '0.038']) expect(p).toContain(z);
  });
});
