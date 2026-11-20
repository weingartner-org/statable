/**
 * B4 Teil 3b-3 (14.11.2026): Die Zahlen der Einheit „Latente Klassen“ (Hilfe-Artikel `latente-klassen`, Fragen `lkl-…`) stammen aus scripts/klassen-erwartet.R (eigener EM, gegen poLCA geprüft)
 * und scripts/ueben-erwartet-klassen.R (abgeleitete Zahlen). Dieser Wächter vergleicht die Zahlen in Artikel und Fragen mit lib/testdaten/ueben-erwartet-klassen.json und lib/klassen-erwartet.json
 * und prüft, dass Einheit, Pfad, Thema und Sprung zusammenpassen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FRAGEN } from './fragen-klassen';
import { ROH_KLASSEN } from '../hilfe/artikel-klassen';
import { einheitNach, pfadNach, themaDerFrage } from './lernplan';
import { THEMEN } from './fragen';

const s = JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-klassen.json', import.meta.url), 'utf8')) as Record<string, any>;
const roh = JSON.parse(readFileSync(new URL('../lib/klassen-erwartet.json', import.meta.url), 'utf8')) as Record<string, any>;
const de = (v: number, d: number) => Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false });
const en = (v: number, d: number) => Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false });
const txt = (o: unknown) => JSON.stringify(o);
const artikel = txt(ROH_KLASSEN.find(r => r.id === 'latente-klassen'));
const fragen = txt(FRAGEN);

describe('B4 Teil 3b-3: latente Klassen', () => {
  it('Einheit im Pfad Psychologie, alle Fragen eingebunden, Thema und Sprung stimmen', () => {
    const e = einheitNach('latente-klassen')!;
    expect(e.hilfe[0]).toBe('latente-klassen'); expect(e.karte).toBe('skala');
    expect(e.fragen).toEqual(FRAGEN.map(q => q.id)); expect(FRAGEN.length).toBeGreaterThanOrEqual(5);
    expect(pfadNach('psychologie')!.einheiten).toContain('latente-klassen');
    for (const q of FRAGEN) { expect(q.thema, q.id).toBe('klassen'); expect(themaDerFrage(q.id), q.id).toBe('klassen'); expect(q.belege.length, q.id).toBeGreaterThanOrEqual(2); }
    const t = THEMEN.find(th => th.id === 'klassen')!; expect(t.n).toBe(FRAGEN.length); expect(t.hilfe).toContain('latente-klassen');
    for (const q of FRAGEN) { const richtig = q.antworten.filter(a => a.richtig).length; if (q.mehrfach) { expect(q.antworten.length).toBe(4); expect(richtig).toBeGreaterThanOrEqual(1); expect(richtig).toBeLessThan(4); } else expect(richtig, q.id).toBe(1); }
  });
  it('Sollwerte der Datei passen zu den Rohwerten aus klassen-erwartet.json', () => {
    const c = roh.carcinoma.loesungen as { bic: number; npar: number; entropie: number | null }[];
    expect(s.carcinoma.bic).toEqual(c.map(l => l.bic)); expect(roh.carcinoma.n).toBe(118); expect(s.carcinoma.spalten).toBe(7);
    expect(s.carcinoma.delta_bic_2_3).toBeCloseTo(c[1]!.bic - c[2]!.bic, 8); expect(s.carcinoma.delta_bic_3_4).toBeCloseTo(c[3]!.bic - c[2]!.bic, 8);
  });
  it('BIC-Tabelle, Entropie, Parameter und Anteile (Pathologen) wie in R', () => {
    const bic = s.carcinoma.bic as number[]; const ent = s.carcinoma.entropie as (number | string)[];
    bic.forEach((v, i) => { expect(artikel, `BIC ${i + 1}`).toContain(de(v, 1)); expect(artikel, `BIC ${i + 1}`).toContain(en(v, 1)); expect(fragen).toContain(de(v, 1)); expect(fragen).toContain(en(v, 1)); });
    expect(s.carcinoma.bestk).toBe(3); expect(bic[2]).toBeLessThan(bic[1]!); expect(bic[3]).toBeGreaterThan(bic[2]!);
    expect(de(s.carcinoma.delta_bic_2_3, 1)).toBe('8,9'); expect(de(s.carcinoma.delta_bic_3_4, 1)).toBe('29,3');
    for (const t of ['8,9', '29,3']) { expect(artikel).toContain(t); expect(fragen).toContain(t); }
    for (const t of ['8.9', '29.3']) { expect(artikel).toContain(t); expect(fragen).toContain(t); }
    expect(de(ent[1] as number, 3)).toBe('0,986'); expect(de(ent[2] as number, 3)).toBe('0,926'); expect(de(ent[3] as number, 3)).toBe('0,902');
    for (const t of ['0,986', '0,926', '0,902', '0.986', '0.926', '0.902']) expect(artikel, t).toContain(t);
    expect(fragen).toContain('0,986'); expect(fragen).toContain('0,926');
    expect(s.carcinoma.npar3).toBe(23); expect(s.carcinoma.npar2).toBe(15); expect(2 + 3 * 7).toBe(23);
    expect(artikel).toContain('2 + 3 · 7 = 23'); expect(fragen).toContain('23 Parameter');
    expect(s.carcinoma.anteil2_prozent).toEqual([50.1, 49.9]);
    for (const t of ['50,1 %', '49,9 %', '50.1%', '49.9%']) { expect(artikel, t).toContain(t); expect(fragen, t).toContain(t); }
  });
  it('Antwortwahrscheinlichkeiten der 2-Klassen-Lösung und zweites Beispiel (gss82) wie in R', () => {
    const k1 = s.carcinoma.ja2_klasse1_prozent as number[]; const k2 = s.carcinoma.ja2_klasse2_prozent as number[];
    // Pathologe A = 1, F = 6
    expect(k1[0]).toBe(100); expect(k2[0]).toBe(11.7); expect(k1[5]).toBe(42.3); expect(k2[5]).toBe(0);
    for (const t of ['100 %', '11,7 %', '42,3 %', '0,0 %', '100%', '11.7%', '42.3%', '0.0%']) expect(artikel, t).toContain(t);
    for (const t of ['100 %', '11,7 %', '42,3 %', '0,0 %', '100%', '11.7%', '42.3%', '0.0%']) expect(fragen, t).toContain(t);
    const gb = s.gss82.bic as number[], ge = s.gss82.entropie as (number | string)[];
    expect(s.gss82.n).toBe(1202); expect(s.gss82.bestk).toBe(3);
    expect(de(gb[2]!, 1)).toBe('5650,9'); expect(de(s.gss82.delta_bic_2_3, 1)).toBe('7,8'); expect(de(ge[1] as number, 3)).toBe('0,703');
    expect(s.gss82.anteil2_prozent).toEqual([80.8, 19.2]);
    for (const t of ['5650,9', '5650.9', '7,8', '7.8', '0,703', '0.703', '80,8 %', '19,2 %', '80.8%', '19.2%', '1202']) expect(artikel, t).toContain(t);
    for (const t of ['0,703', '0.703', '80,8 %', '19,2 %', '80.8%', '19.2%', '1202']) expect(fragen, t).toContain(t);
  });
});
