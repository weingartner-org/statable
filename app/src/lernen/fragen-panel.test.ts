/**
 * B2 Teil 1c (14.11.2026): Die Zahlen der Lehre „Wirtschaft: Ursachen schätzen (Ökonometrie)“ (Hilfe-Artikel `paneldaten`, `cluster-robust`, `hausman-test`, Fragen `pan-…`)
 * stammen aus scripts/ueben-erwartet-panel.R (Grunfeld, plm und sandwich, zweiter Weg von Hand) → lib/testdaten/ueben-erwartet-panel.json. Dieser Wächter vergleicht
 * die Zahlen in Artikeln und Fragen damit und prüft, dass Pfad, Einheiten, Thema und Beispiel zusammenpassen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FRAGEN } from './fragen-panel';
import { ROH_OEKONOMETRIE } from '../hilfe/artikel-oekonometrie';
import { ROH_PANEL } from '../hilfe/artikel-paneldaten';
import { einheitNach, pfadNach, themaDerFrage, PFADE } from './lernplan';
import { pfadGruppen } from './pfadgruppen';
import { THEMEN } from './fragen';
import { beispielNach } from '../lib/beispiele';

const s = JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-panel.json', import.meta.url), 'utf8')) as Record<string, any>;
const de = (v: number, d: number) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false });
const en = (v: number, d: number) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false });
const txt = (o: unknown) => JSON.stringify(o);
const artikel = (id: string) => txt([...ROH_OEKONOMETRIE, ...ROH_PANEL].find(r => r.id === id));
const frage = (id: string) => txt(FRAGEN.find(f => f.id === id));

describe('B2 Teil 1c: Lehre Paneldaten', () => {
  it('Pfad mit drei Einheiten in „Nach Fach“, je Einheit mindestens 3 Fragen, alle Fragen eingebunden, Beispiel Grunfeld', () => {
    const p = pfadNach('oekonometrie')!;
    expect(p.einheiten.slice(0, 3)).toEqual(['panel-feste-effekte', 'cluster-robust', 'hausman-test']); expect(p.einheiten.at(-1)).toBe('abschluss-oekonometrie');
    const alle = p.einheiten.slice(0, 3).flatMap(id => {
      const e = einheitNach(id)!; expect(e.fragen.length).toBeGreaterThanOrEqual(3); expect(e.hilfe[0]).toBe(id === 'panel-feste-effekte' ? 'paneldaten' : id); expect(e.karte).toBe('vorhersage');
      expect(e.beispiele.map(b => b.id)).toContain('grunfeld'); return e.fragen;
    });
    expect(alle).toEqual(FRAGEN.map(f => f.id));
    expect(pfadGruppen(PFADE).find(g => g.id === 'fach')!.pfade.map(x => x.id)).toContain('oekonometrie');
    const b = beispielNach('grunfeld')!; expect(b.fach).toBe('sozial'); expect(b.fälle).toBe(200);
  });
  it('Thema, Belege und Antwortform', () => {
    for (const q of FRAGEN) { expect(q.thema, q.id).toBe('panel'); expect(themaDerFrage(q.id), q.id).toBe('panel'); expect(q.belege.length, q.id).toBeGreaterThanOrEqual(2);
      const richtig = q.antworten.filter(a => a.richtig).length; if (q.mehrfach) { expect(q.antworten.length).toBe(4); expect(richtig).toBeGreaterThanOrEqual(1); expect(richtig).toBeLessThan(4); } else expect(richtig, q.id).toBe(1); }
    const t = THEMEN.find(th => th.id === 'panel')!; expect(t.n).toBe(FRAGEN.length); expect(t.hilfe).toEqual(expect.arrayContaining(['paneldaten', 'cluster-robust', 'hausman-test']));
  });
  it('Zahlen wie in R (Artikel und Fragen)', () => {
    const p = artikel('paneldaten'), c = artikel('cluster-robust'), h = artikel('hausman-test');
    // klassische und cluster-robuste Standardfehler
    expect(c).toContain(de(s.pooled_se[0], 4)); expect(c).toContain(en(s.pooled_se[0], 4)); expect(c).toContain(de(s.pooled_secl[0], 4)); expect(c).toContain(en(s.pooled_secl[0], 4));
    expect(c).toContain(de(s.within_se[0], 4)); expect(c).toContain(de(s.within_secl[0], 4));
    expect(c).toContain(de(s.pooled_verhaeltnis, 1) + '-fache'); expect(c).toContain(en(s.pooled_verhaeltnis, 1) + ' times');
    const f = frage('pan-cr-pooled'); expect(f).toContain(de(s.pooled_se[0], 4)); expect(f).toContain(de(s.pooled_secl[0], 4)); expect(f).toContain(de(s.pooled_verhaeltnis, 1) + '-fache'); expect(f).toContain(en(s.pooled_verhaeltnis, 1) + ' times');
    // F-Test und Hausman
    expect(s.f_df1).toBe(9); expect(s.f_df2).toBe(188); expect(s.hausman_df).toBe(2);
    for (const t of [p, h]) { expect(t).toContain(`F(9; 188) = ${de(s.f, 2)}`); expect(t).toContain(`F(9, 188) = ${en(s.f, 2)}`); expect(t).toContain(`χ²(2) = ${de(s.hausman_chi2, 2)}`); expect(t).toContain(`p = ${de(s.hausman_p, 3).replace('0,', ',')}`); }
    expect(frage('pan-ha-ftest')).toContain(`F(9; 188) = ${de(s.f, 2)}`); expect(frage('pan-ha-lesen')).toContain(`χ²(2) = ${de(s.hausman_chi2, 2)}`);
    // feste gegen zufällige Effekte, Between gegen Within
    expect(h).toContain(de(s.within_b[0], 4)); expect(h).toContain(de(s.random_b[0], 4)); expect(h).toContain(de(s.within_b[1], 4)); expect(h).toContain(de(s.random_b[1], 4));
    expect(frage('pan-ha-lesen')).toContain(de(s.within_b[0], 4)); expect(frage('pan-ha-lesen')).toContain(de(s.random_b[0], 4));
    expect(frage('pan-kapital')).toContain(de(s.between_b[1], 3)); expect(frage('pan-kapital')).toContain(de(s.within_b[1], 3));
    expect(p).toContain(de(s.pooled_b[0], 4)); expect(frage('pan-cr-wenige')).toContain('G − 1 = 9');
    expect(s.pooled_secl[0]! / s.pooled_se[0]!).toBeGreaterThan(2.6);
  });
});
