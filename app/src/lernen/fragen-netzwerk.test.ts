/**
 * B4 Teil 2 (14.11.2026): Die Zahlen der Einheit „Netzwerkanalyse“ (Hilfe-Artikel `netzwerkanalyse`, Fragen `nw-…`) stammen aus
 * scripts/ueben-erwartet-netzwerk.R (Big-Five-Ausschnitt, Partialkorrelationsnetz; zweiter Weg Regressionsreste und corpcor). Dieser Wächter vergleicht die Zahlen in Artikel
 * und Fragen mit lib/testdaten/ueben-erwartet-netzwerk.json und prüft, dass Einheit, Pfad, Thema und Sprung zusammenpassen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FRAGEN } from './fragen-netzwerk';
import { ROH_NETZWERK } from '../hilfe/artikel-netzwerk';
import { einheitNach, pfadNach, themaDerFrage } from './lernplan';
import { THEMEN } from './fragen';

type Kante = { r: number; partial: number; p: number; p_holm: number };
const s = JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-netzwerk.json', import.meta.url), 'utf8')) as Record<string, any>;
const de = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const en = (v: number, d = 2) => v.toFixed(d);
const txt = (o: unknown) => JSON.stringify(o);
const artikel = txt(ROH_NETZWERK.find(r => r.id === 'netzwerkanalyse'));
const alleFragen = txt(FRAGEN);
const beide = (t: string, v: number, d = 2) => { expect(t, `${v}`).toContain(de(Math.abs(v), d)); expect(t, `${v}`).toContain(en(Math.abs(v), d)); };

describe('B4 Teil 2: Netzwerkanalyse', () => {
  it('Einheit im Pfad Psychologie, alle Fragen eingebunden, Thema und Sprung stimmen', () => {
    const e = einheitNach('netzwerkanalyse')!;
    expect(e.hilfe[0]).toBe('netzwerkanalyse'); expect(e.karte).toBe('korrmatrix');
    expect(e.fragen).toEqual(FRAGEN.map(q => q.id)); expect(FRAGEN.length).toBeGreaterThanOrEqual(5);
    expect(pfadNach('psychologie')!.einheiten).toContain('netzwerkanalyse');
    for (const q of FRAGEN) { expect(q.thema, q.id).toBe('netzwerk'); expect(themaDerFrage(q.id), q.id).toBe('netzwerk'); expect(q.belege.length, q.id).toBeGreaterThanOrEqual(2); }
    const t = THEMEN.find(th => th.id === 'netzwerk')!; expect(t.n).toBe(FRAGEN.length); expect(t.hilfe).toContain('netzwerkanalyse');
    for (const q of FRAGEN) { const richtig = q.antworten.filter(a => a.richtig).length; if (q.mehrfach) { expect(q.antworten.length).toBe(4); expect(richtig).toBeGreaterThanOrEqual(1); expect(richtig).toBeLessThan(4); } else expect(richtig, q.id).toBe(1); }
  });
  it('Zahlen im Artikel und in den Fragen wie in R', () => {
    expect(s.n).toBe(378); expect(s.k).toBe(9); expect(s.kanten_zahl).toBe(36); expect(s.kanten_deutlich).toBe(6); expect(s.deutlich_zwischen_a_und_n).toBe(0);
    expect(artikel).toContain('378'); expect(artikel).toContain('36'); expect(alleFragen).toContain('36 mögliche Kanten, 6 deutlich');
    for (const k of ['n1n2', 'a3a5', 'n3n4', 'a2a3', 'n4n5', 'n2n3'] as const) { const c = s[k] as Kante; beide(artikel, c.r); beide(artikel, c.partial); expect(c.p_holm, k).toBeLessThan(0.05); }
    const n13 = s.n1n3 as Kante; beide(artikel, n13.r); beide(artikel, n13.partial); expect(n13.p).toBeCloseTo(0.021, 3); expect(n13.p_holm).toBeCloseTo(0.49, 2); expect(artikel).toContain('p = ,021'); expect(artikel).toContain('p = .021');
    beide(alleFragen, n13.r); beide(alleFragen, n13.partial); beide(alleFragen, (s.n1n2 as Kante).partial); beide(alleFragen, (s.n1n2 as Kante).r); beide(alleFragen, (s.n2n3 as Kante).partial);
    const a5 = s.a5n4 as Kante; beide(artikel, a5.partial); beide(alleFragen, a5.partial); expect(a5.p_holm).toBeCloseTo(0.19, 2); expect(alleFragen).toContain('p = ,19'); expect(alleFragen).toContain('p = .19');
    expect(s.staerkste).toBe('N2'); expect(s.schwaechste).toBe('A4'); beide(artikel, s.staerke.N2); beide(artikel, s.staerke.A4); beide(alleFragen, s.staerke.N2); beide(alleFragen, s.staerke.A4);
    const n2 = s.n1n2.partial + s.n2n3.partial; expect(n2).toBeGreaterThan(0);
  });
  it('Behauptungen im Text stimmen: Teilnetz N1-N3 groß in r, klein im Netz; N2-N4 kippt das Vorzeichen; A-N-Kanten nirgends deutlich', () => {
    const n13 = s.n1n3 as Kante; expect(n13.r).toBeGreaterThan(0.5); expect(n13.partial).toBeLessThan(0.15); expect(n13.p_holm).toBeGreaterThan(0.05);
    const n24 = s.n2n4 as Kante; expect(n24.r).toBeGreaterThan(0.3); expect(n24.partial).toBeLessThan(0);
    // Stärke von N2 = Summe von 8 Kanten (Frage nw-staerke)
    expect(Object.keys(s.staerke)).toHaveLength(9);
  });
});
