/**
 * B4 Teil 3 (14.11.2026): Die Zahlen der Einheit „Latente Profile“ (Hilfe-Artikel `latente-profile`, Fragen `lpr-…`) stammen aus scripts/profile-erwartet.R (eigener EM, zweiter Weg mclust)
 * und scripts/ueben-erwartet-profile.R (Pinguine, vier Maße, Streuungen gleich). Dieser Wächter vergleicht die Zahlen in Artikel und Fragen mit lib/testdaten/ueben-erwartet-profile.json
 * und lib/profile-erwartet.json und prüft, dass Einheit, Pfad, Thema und Sprung zusammenpassen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FRAGEN } from './fragen-profile';
import { ROH_PROFILE } from '../hilfe/artikel-profile';
import { einheitNach, pfadNach, themaDerFrage } from './lernplan';
import { THEMEN } from './fragen';

const s = JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-profile.json', import.meta.url), 'utf8')) as Record<string, any>;
const g = JSON.parse(readFileSync(new URL('../lib/profile-erwartet.json', import.meta.url), 'utf8')).pinguine.gleich as { ll: number; npar: number; bic: number }[];
const de = (v: number, d: number) => Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false });
const en = (v: number, d: number) => Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false });
const txt = (o: unknown) => JSON.stringify(o);
const artikel = txt(ROH_PROFILE.find(r => r.id === 'latente-profile'));
const fragen = txt(FRAGEN);

describe('B4 Teil 3: latente Profile', () => {
  it('Einheit im Pfad Psychologie, alle Fragen eingebunden, Thema und Sprung stimmen', () => {
    const e = einheitNach('latente-profile')!;
    expect(e.hilfe[0]).toBe('latente-profile'); expect(e.karte).toBe('cluster');
    expect(e.fragen).toEqual(FRAGEN.map(q => q.id)); expect(FRAGEN.length).toBeGreaterThanOrEqual(5);
    expect(pfadNach('psychologie')!.einheiten).toContain('latente-profile');
    for (const q of FRAGEN) { expect(q.thema, q.id).toBe('profile'); expect(themaDerFrage(q.id), q.id).toBe('profile'); expect(q.belege.length, q.id).toBeGreaterThanOrEqual(2); }
    const t = THEMEN.find(th => th.id === 'profile')!; expect(t.n).toBe(FRAGEN.length); expect(t.hilfe).toContain('latente-profile');
    for (const q of FRAGEN) { const richtig = q.antworten.filter(a => a.richtig).length; if (q.mehrfach) { expect(q.antworten.length).toBe(4); expect(richtig).toBeGreaterThanOrEqual(1); expect(richtig).toBeLessThan(4); } else expect(richtig, q.id).toBe(1); }
  });
  it('BIC-Tabelle, Entropie, Gruppengrößen und Kreuztabelle wie in R', () => {
    expect(s.n).toBe(342); expect(g.length).toBe(6);
    const bic = (Object.values(s.bic) as number[]);
    bic.forEach((v, i) => { expect(artikel, `BIC ${i + 1}`).toContain(de(v, 1)); expect(artikel, `BIC ${i + 1}`).toContain(en(v, 1)); });
    for (const v of bic) { expect(fragen).toContain(de(v, 1)); expect(fragen).toContain(en(v, 1)); }
    expect(bic[5]).toBeLessThan(bic[4]!); expect(bic[0]).toBeGreaterThan(bic[1]!);
    expect(s.bestk).toBe(6);
    expect(de(bic[1]! - bic[2]!, 1)).toBe('156,6'); expect(de(bic[4]! - bic[5]!, 1)).toBe('49,7'); expect(s.delta_bic_5_6).toBeCloseTo(49.7, 1);
    expect(artikel).toContain('156,6'); expect(artikel).toContain('156.6'); expect(artikel).toContain('49,7'); expect(artikel).toContain('49.7'); expect(fragen).toContain('49,7'); expect(fragen).toContain('156,6');
    const ent = Object.values(s.entropie) as (number | null)[];
    expect(ent[1]!).toBeCloseTo(0.998, 3); expect(ent[2]!).toBeCloseTo(0.909, 3);
    expect(artikel).toContain('0,998'); expect(artikel).toContain('0.998'); expect(fragen).toContain('0,998'); expect(fragen).toContain('0,909');
    expect(s.groesse2).toEqual([219, 123]); expect(artikel).toContain('219'); expect(artikel).toContain('123'); expect(fragen).toContain('219 Tiere');
    // Kreuztabelle: Gruppe 2 = alle Eselspinguine, Gruppe 1 = Adelie + Zügel
    expect(s.kreuz2[1]).toEqual({ Adeliepinguin: 0, Eselspinguin: 123, Zügelpinguin: 0 });
    expect(s.kreuz2[0]).toEqual({ Adeliepinguin: 151, Eselspinguin: 0, Zügelpinguin: 68 });
    expect(artikel).toContain('151'); expect(artikel).toContain('68'); expect(fragen).toContain('151'); expect(fragen).toContain('68');
  });
  it('Parameterzahlen: 4 Spalten, 3 Gruppen gleich 18, frei 26', () => {
    const frei = JSON.parse(readFileSync(new URL('../lib/profile-erwartet.json', import.meta.url), 'utf8')).pinguine.frei as { npar: number }[];
    expect(g[2]!.npar).toBe(18); expect(frei[2]!.npar).toBe(26);
    expect(2 + 12 + 4).toBe(18); expect(2 + 12 + 12).toBe(26);
    expect(artikel).toContain('18 Parameter'); expect(artikel).toContain('26 Parameter'); expect(fragen).toContain('18 Parameter');
  });
});
