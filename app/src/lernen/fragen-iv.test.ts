/**
 * B2 Teil 2b (14.11.2026): Die Zahlen der Lehreinheit „Instrumentvariablen“ (Hilfe-Artikel `instrumentvariablen`, Fragen `iv-…`, Beispiel „zigaretten“) stammen aus
 * scripts/iv-erwartet.R (lib/iv-erwartet.json; AER::ivreg, sandwich, zweiter Weg von Hand). Dieser Wächter vergleicht die Zahlen in Artikel, Fragen und Beispiel damit
 * und prüft, dass Pfad, Einheit, Thema und Beispiel zusammenpassen.
 */
import { describe, it, expect } from 'vitest';
import { FRAGEN } from './fragen-iv';
import { ROH_OEKONOMETRIE } from '../hilfe/artikel-oekonometrie';
import { einheitNach, pfadNach, themaDerFrage } from './lernplan';
import { THEMEN } from './fragen';
import { beispielNach } from '../lib/beispiele';
import soll from '../lib/iv-erwartet.json';

const s = soll as any;
const de = (v: number, d: number) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false }).replace('-', '−');
const en = (v: number, d: number) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false }).replace('-', '−');
const txt = (o: unknown) => JSON.stringify(o);
const artikel = txt(ROH_OEKONOMETRIE.find(r => r.id === 'instrumentvariablen'));
const frage = (id: string) => txt(FRAGEN.find(f => f.id === id));
const ein = s.einIV, zwei = s.zweiIV;

describe('B2 Teil 2b: Lehre Instrumentvariablen', () => {
  it('Einheit im Pfad Ökonometrie, mindestens 3 Fragen, alle Fragen eingebunden, Beispiel zigaretten', () => {
    const p = pfadNach('oekonometrie')!;
    expect(p.einheiten.slice(0, 4)).toEqual(['panel-feste-effekte', 'cluster-robust', 'hausman-test', 'instrumentvariablen']);
    const e = einheitNach('instrumentvariablen')!;
    expect(e.fragen.length).toBeGreaterThanOrEqual(3); expect(e.fragen).toEqual(FRAGEN.map(f => f.id)); expect(e.hilfe[0]).toBe('instrumentvariablen'); expect(e.karte).toBe('vorhersage');
    expect(e.beispiele.map(b => b.id)).toContain('zigaretten');
    const b = beispielNach('zigaretten')!; expect(b.fach).toBe('sozial'); expect(b.fälle).toBe(48); expect(b.datei).toBe('zigaretten-steuern');
  });
  it('Thema, Belege und Antwortform', () => {
    for (const q of FRAGEN) { expect(q.thema, q.id).toBe('iv'); expect(themaDerFrage(q.id), q.id).toBe('iv'); expect(q.belege.length, q.id).toBeGreaterThanOrEqual(2);
      const richtig = q.antworten.filter(a => a.richtig).length; if (q.mehrfach) { expect(q.antworten.length).toBe(4); expect(richtig).toBeGreaterThanOrEqual(1); expect(richtig).toBeLessThan(4); } else expect(richtig, q.id).toBe(1); }
    const t = THEMEN.find(th => th.id === 'iv')!; expect(t.n).toBe(FRAGEN.length); expect(t.hilfe).toEqual(['instrumentvariablen']);
  });
  it('Zahlen wie in R (Artikel und Fragen)', () => {
    // gewöhnliche Regression und IV, Preis (Index 1)
    for (const [d, t] of [[de, artikel], [en, artikel]] as const) {
      expect(t).toContain(d(ein.ols.b[1], 4)); expect(t).toContain(d(ein.ols.se[1], 4)); expect(t).toContain(d(ein.b[1], 4)); expect(t).toContain(d(ein.se[1], 4));
      expect(t).toContain(d(zwei.b[1], 4)); expect(t).toContain(d(zwei.se[1], 4)); expect(t).toContain(d(ein.ersteStufe.F, 2)); expect(t).toContain(d(zwei.sargan.chi2, 2));
      expect(t).toContain(d(ein.wuHausman.t ** 2, 2));
    }
    expect(ein.ersteStufe.df1).toBe(1); expect(ein.ersteStufe.df2).toBe(45); expect(artikel).toContain('F(1; 45)'); expect(artikel).toContain('F(1, 45)');
    expect(artikel).toContain(`p = ${de(ein.wuHausman.p, 3).replace('0,', ',')}`); expect(artikel).toContain(`p = ${de(zwei.sargan.p, 3).replace('0,', ',')}`);
    expect(artikel).toContain(`p = ${en(ein.wuHausman.p, 3).replace('0.', '.')}`); expect(artikel).toContain(`p = ${en(zwei.sargan.p, 3).replace('0.', '.')}`);
    expect(zwei.sargan.df).toBe(1);
    // Fragen
    const f1 = frage('iv-erste-stufe'); expect(f1).toContain(`F(1; 45) = ${de(ein.ersteStufe.F, 2)}`); expect(f1).toContain(`F(1, 45) = ${en(ein.ersteStufe.F, 2)}`);
    const f2 = frage('iv-ergebnis'); for (const x of [ein.ols.b[1], ein.b[1]]) expect(f2).toContain(de(x, 4)); for (const x of [ein.ols.se[1], ein.se[1]]) expect(f2).toContain(de(x, 4));
    expect(ein.se[1]).toBeGreaterThan(ein.ols.se[1]); expect(Math.abs(ein.b[1])).toBeLessThan(Math.abs(ein.ols.b[1]));
    const f3 = frage('iv-sargan'); expect(f3).toContain(`χ²(1) = ${de(zwei.sargan.chi2, 2)}`); expect(f3).toContain(`p = ${de(zwei.sargan.p, 3).replace('0,', ',')}`); expect(f3).toContain(`p = ${en(zwei.sargan.p, 3).replace('0.', '.')}`);
    // Beispiel-Text
    const b = JSON.stringify(beispielNach('zigaretten')!.schritte); expect(b).toContain(de(ein.ols.b[1], 4)); expect(b).toContain(de(ein.b[1], 4)); expect(b).toContain(de(zwei.b[1], 4));
  });
});
