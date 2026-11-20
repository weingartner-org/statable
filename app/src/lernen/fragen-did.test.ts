/**
 * B2 Teil 2c (14.11.2026): Die Zahlen der Lehreinheit „Differenz-in-Differenzen“ (Hilfe-Artikel `differenz-in-differenzen`, Fragen `did-…`, Beispiel „hauspreise“) stammen aus
 * scripts/did-erwartet.R (lib/did-erwartet.json; lm mit Wechselwirkung, sandwich HC1, zweiter Weg über die vier Gruppenmittel). Dieser Wächter vergleicht die Zahlen in Artikel,
 * Fragen und Beispiel damit und prüft, dass Pfad, Einheit, Thema und Beispiel zusammenpassen.
 */
import { describe, it, expect } from 'vitest';
import { FRAGEN } from './fragen-did';
import { ROH_OEKONOMETRIE } from '../hilfe/artikel-oekonometrie';
import { einheitNach, pfadNach, themaDerFrage } from './lernplan';
import { THEMEN } from './fragen';
import { beispielNach } from '../lib/beispiele';
import { tSchwaenze } from '../lib/verteilung';
import soll from '../lib/did-erwartet.json';

const s = soll as any;
const dG = (v: number, d: number) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false }).replace('-', '−');
const eG = (v: number, d: number) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false }).replace('-', '−');
const de = (v: number, d: number) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: true }).replace('-', '−');
const en = (v: number, d: number) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: true }).replace('-', '−');
const txt = (o: unknown) => JSON.stringify(o);
const artikel = txt(ROH_OEKONOMETRIE.find(r => r.id === 'differenz-in-differenzen'));
const frage = (id: string) => txt(FRAGEN.find(f => f.id === id));
const o = s.ohne, m = s.mit;
const pw = (b: number, se: number, k: number, n: number) => 2 * tSchwaenze(Math.abs(b / se), n - k).oben;
const pde = (p: number) => `p = ${p.toFixed(3).replace('0.', ',')}`, pen = (p: number) => `p = ${p.toFixed(3).replace('0.', '.')}`;

describe('B2 Teil 2c: Lehre Differenz-in-Differenzen', () => {
  it('Einheit im Pfad Ökonometrie, mindestens 3 Fragen, alle Fragen eingebunden, Beispiel hauspreise', () => {
    const p = pfadNach('oekonometrie')!;
    expect(p.einheiten.slice(0, 5)).toEqual(['panel-feste-effekte', 'cluster-robust', 'hausman-test', 'instrumentvariablen', 'differenz-in-differenzen']);
    const e = einheitNach('differenz-in-differenzen')!;
    expect(e.fragen.length).toBeGreaterThanOrEqual(3); expect(e.fragen).toEqual(FRAGEN.map(f => f.id)); expect(e.hilfe[0]).toBe('differenz-in-differenzen'); expect(e.karte).toBe('vorhersage');
    expect(e.beispiele.map(b => b.id)).toContain('hauspreise');
    const b = beispielNach('hauspreise')!; expect(b.fach).toBe('sozial'); expect(b.fälle).toBe(321); expect(b.datei).toBe('hauspreise-muellofen');
  });
  it('Thema, Belege und Antwortform', () => {
    for (const q of FRAGEN) { expect(q.thema, q.id).toBe('did'); expect(themaDerFrage(q.id), q.id).toBe('did'); expect(q.belege.length, q.id).toBeGreaterThanOrEqual(2);
      const richtig = q.antworten.filter(a => a.richtig).length; if (q.mehrfach) { expect(q.antworten.length).toBe(4); expect(richtig).toBeGreaterThanOrEqual(1); expect(richtig).toBeLessThan(4); } else expect(richtig, q.id).toBe(1); }
    const t = THEMEN.find(th => th.id === 'did')!; expect(t.n).toBe(FRAGEN.length); expect(t.hilfe).toEqual(['differenz-in-differenzen']);
  });
  it('Zahlen wie in R (Artikel, Fragen, Beispiel)', () => {
    const mm = o.mittel, dmi = o.b[3];
    // die Differenz der Mittel ist der Koeffizient (ohne Merkmale)
    expect(Math.abs(o.did2 - dmi)).toBeLessThan(1e-6);
    const aend0 = mm.m01 - mm.m00, aend1 = mm.m11 - mm.m10;
    for (const d of [de, en]) {
      for (const x of [mm.m00, mm.m01, mm.m10, mm.m11, aend0, aend1]) expect(artikel).toContain(d(x, 2));
      expect(artikel).toContain(d(dmi, 2)); expect(artikel).toContain(d(o.se[3], 2)); expect(artikel).toContain(d(o.seRobust[3], 2));
      expect(artikel).toContain(d(m.b[3], 2)); expect(artikel).toContain(d(m.se[3], 2)); expect(artikel).toContain(d(m.seRobust[3], 2));
    }
    const p = [pw(o.b[3], o.se[3], o.k, o.n), pw(o.b[3], o.seRobust[3], o.k, o.n), pw(m.b[3], m.se[3], m.k, m.n), pw(m.b[3], m.seRobust[3], m.k, m.n)];
    for (const x of p) { expect(artikel).toContain(pde(x)); expect(artikel).toContain(pen(x)); }
    expect(o.n).toBe(321); expect([mm.n00, mm.n01, mm.n10, mm.n11]).toEqual([123, 102, 56, 40]);
    // Fragen
    const f2 = frage('did-lesen'); for (const x of [mm.m00, mm.m01, mm.m10, mm.m11, aend0, aend1, dmi]) expect(f2).toContain(dG(x, 2)); for (const x of [mm.m00, mm.m01, mm.m10, mm.m11, aend0, aend1, dmi]) expect(f2).toContain(eG(x, 2));
    expect(f2).toContain(dG(aend0 + aend1, 2)); expect(f2).toContain(dG(o.b[1], 2));
    const f3 = frage('did-trends'); expect(f3).toContain(dG(mm.m00, 2)); expect(f3).toContain(dG(mm.m10, 2));
    const f4 = frage('did-p'); for (const x of [dmi, o.se[3], o.seRobust[3]]) expect(f4).toContain(dG(x, 2)); expect(f4).toContain(pde(p[0]!)); expect(f4).toContain(pde(p[1]!)); expect(f4).toContain(pen(p[0]!)); expect(f4).toContain(pen(p[1]!));
    const f5 = frage('did-merkmale'); for (const x of [m.b[3], m.se[3], m.seRobust[3]]) expect(f5).toContain(dG(x, 2)); expect(f5).toContain(pde(p[2]!)); expect(f5).toContain(pde(p[3]!)); expect(f5).toContain(dG(dmi, 2));
    expect(p[0]).toBeGreaterThan(0.05); expect(p[3]).toBeGreaterThan(0.05); expect(p[2]).toBeLessThan(0.05);
    // Beispiel-Text
    const b = txt(beispielNach('hauspreise')!.schritte); for (const x of [mm.m00, mm.m01, mm.m10, mm.m11, aend0, aend1, dmi, o.se[3], o.seRobust[3], m.b[3], m.se[3], m.seRobust[3]]) { expect(b).toContain(de(x, 2)); expect(b).toContain(en(x, 2)); }
    for (const x of p) { expect(b).toContain(pde(x)); expect(b).toContain(pen(x)); }
  });
});
