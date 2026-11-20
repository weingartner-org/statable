/**
 * B2 Teil 2d-3 (14.11.2026): Die Zahlen der Lehreinheit „Regressions-Diskontinuität“ (Hilfe-Artikel `regressions-diskontinuitaet`, Fragen `rd-…`, Beispiel „senatswahlen“) stammen aus
 * scripts/rd-erwartet.R (lib/rd-erwartet.json; lm mit Gewichten, sandwich HC1, zweiter Weg rdrobust). Dieser Wächter vergleicht die Zahlen in Artikel, Fragen und Beispiel damit
 * und prüft, dass Pfad, Einheit, Thema und Beispiel zusammenpassen.
 */
import { describe, it, expect } from 'vitest';
import { FRAGEN } from './fragen-rd';
import { ROH_OEKONOMETRIE } from '../hilfe/artikel-oekonometrie';
import { einheitNach, pfadNach, themaDerFrage } from './lernplan';
import { THEMEN } from './fragen';
import { beispielNach } from '../lib/beispiele';
import { tSchwaenze } from '../lib/verteilung';
import soll from '../lib/rd-erwartet.json';

const s = soll as any;
const dG = (v: number, d: number) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false }).replace('-', '−');
const eG = (v: number, d: number) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false }).replace('-', '−');
const txt = (o: unknown) => JSON.stringify(o);
const artikel = txt(ROH_OEKONOMETRIE.find(r => r.id === 'regressions-diskontinuitaet'));
const frage = (id: string) => txt(FRAGEN.find(f => f.id === id));
const { a, b, c, d } = s;
const pw = (f: any) => 2 * tSchwaenze(Math.abs(f.b / f.seRobust), f.n - f.k).oben;

describe('B2 Teil 2d-3: Lehre Regressions-Diskontinuität', () => {
  it('Einheit im Pfad Ökonometrie, mindestens 3 Fragen, alle Fragen eingebunden, Beispiel senatswahlen', () => {
    const p = pfadNach('oekonometrie')!;
    expect(p.einheiten.slice(0, 6)).toEqual(['panel-feste-effekte', 'cluster-robust', 'hausman-test', 'instrumentvariablen', 'differenz-in-differenzen', 'regressions-diskontinuitaet']);
    const e = einheitNach('regressions-diskontinuitaet')!;
    expect(e.fragen.length).toBeGreaterThanOrEqual(3); expect(e.fragen).toEqual(FRAGEN.map(f => f.id)); expect(e.hilfe[0]).toBe('regressions-diskontinuitaet'); expect(e.karte).toBe('vorhersage');
    expect(e.beispiele.map(x => x.id)).toContain('senatswahlen');
    const bsp = beispielNach('senatswahlen')!; expect(bsp.fach).toBe('sozial'); expect(bsp.fälle).toBe(s.n); expect(bsp.datei).toBe('senatswahlen');
  });
  it('Thema, Belege und Antwortform', () => {
    for (const q of FRAGEN) { expect(q.thema, q.id).toBe('rd'); expect(themaDerFrage(q.id), q.id).toBe('rd'); expect(q.belege.length, q.id).toBeGreaterThanOrEqual(2);
      const richtig = q.antworten.filter(x => x.richtig).length; if (q.mehrfach) { expect(q.antworten.length).toBe(4); expect(richtig).toBeGreaterThanOrEqual(1); expect(richtig).toBeLessThan(4); } else expect(richtig, q.id).toBe(1); }
    const t = THEMEN.find(th => th.id === 'rd')!; expect(t.n).toBe(FRAGEN.length); expect(t.hilfe).toEqual(['regressions-diskontinuitaet']);
  });
  it('Zahlen wie in R (Artikel, Fragen, Beispiel)', () => {
    expect(s.n).toBe(1297); expect([a.n, a.nLinks, a.nRechts]).toEqual([451, 245, 206]); expect(b.n).toBe(735);
    for (const dd of [dG, eG]) {
      for (const x of [a.b, a.se, a.seRobust, b.b, b.se, b.seRobust, c.b, c.seRobust, d.b, d.seRobust]) expect(artikel).toContain(dd(x, 2));
    }
    expect(artikel).toContain('p < ,001'); expect(artikel).toContain('p < .001'); expect(pw(a)).toBeLessThan(0.001);
    const f2 = frage('rd-lesen'); expect(f2).toContain(dG(a.b, 2)); expect(f2).toContain(dG(a.seRobust, 2)); expect(f2).toContain(eG(a.b, 2)); expect(f2).toContain(eG(a.seRobust, 2));
    const f3 = frage('rd-bandbreite'); for (const x of [a.b, a.se, b.b, b.se]) { expect(f3).toContain(dG(x, 2)); expect(f3).toContain(eG(x, 2)); } expect(f3).toContain(String(a.n)); expect(f3).toContain(String(b.n));
    const f4 = frage('rd-ordnung'); for (const x of [b.b, b.seRobust, d.b, d.seRobust]) { expect(f4).toContain(dG(x, 2)); expect(f4).toContain(eG(x, 2)); }
    const f5 = frage('rd-annahme'); expect(f5).toContain(String(a.nLinks)); expect(f5).toContain(String(a.nRechts));
    expect(d.k).toBe(6); expect(b.k).toBe(4);
    const bt = txt(beispielNach('senatswahlen')!.schritte);
    for (const x of [a.b, a.se, a.seRobust, b.b, b.se, b.seRobust, c.b, d.b]) { expect(bt).toContain(dG(x, 2)); expect(bt).toContain(eG(x, 2)); }
    expect(bt).toContain(String(a.n)); expect(bt).toContain(String(b.n));
  });
});
