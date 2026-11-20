import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { messwiederholung } from './messwiederholung';
import { saetzeMesswiederholung, tabellenMesswiederholung } from './mwsaetze';
import { tabelleDe } from './export';

const A = [[2, 3, 3], [4, 3, 4], [6, 5, 7], [5, 3, 4], [4, 6, 4], [8, 9, 9], [5, 8, 9], [3, 5, 6], [4, 4, 5], [4, 7, 8], [3, 5, 6], [6, 9, 8], [6, 6, 8], [2, 5, 6], [3, 7, 7], [5, 7, 8]];
const TR = ['control', 'control', 'control', 'control', 'control', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B', 'B'];
const zn = (i: number) => ['vorher', 'nachher', 'Nachtest'][i]!;

describe('Sätze zur Messwiederholung', () => {
  it('APA-Zeile wie afex (F, korrigierte df, p, ηp², KI) auf Deutsch', () => {
    s.einst.sprache = 'de';
    const st = saetzeMesswiederholung(messwiederholung(A, ['a', 'b', 'c']), zn);
    expect(st.apa).toBe('F(1,54; 23,16) = 14,85, p < ,001, ηp² = ,50, 95 %-KI [,22; ,67], ηG² = ,18 (Greenhouse-Geisser)');
    expect(st.haupt).toMatch(/steigt der Wert über die 3 Zeitpunkte: 4,4 → 5,8 → 6,4\.$/);
    expect(st.zusatz).toContain('Nach Bonferroni-Korrektur unterscheiden sich vorher/nachher und vorher/Nachtest.');
    expect(st.vorsicht).toContain('Der Mauchly-Test spricht nicht gegen Sphärizität (W = ,70, p = ,086)');
    expect(st.marken.some(m => m.erklaer === 'sphaerizitaet')).toBe(true);
  });
  it('englisch mit Punkt, Korrektur umschaltbar', () => {
    s.einst.sprache = 'en';
    const e = messwiederholung(A, ['a', 'b', 'c']);
    expect(saetzeMesswiederholung(e, zn).apa).toBe('F(1.54, 23.16) = 14.85, p < .001, ηp² = .50, 95% CI [.22, .67], ηG² = .18 (Greenhouse-Geisser)');
    expect(saetzeMesswiederholung({ ...e, korrektur: 'keine' }, zn).apa).toBe('F(2, 30) = 14.85, p < .001, ηp² = .50, 95% CI [.22, .67], ηG² = .18');
    expect(saetzeMesswiederholung({ ...e, korrektur: 'hf' }, zn).apa).toMatch(/\(Huynh-Feldt\)$/);
    s.einst.sprache = 'de';
  });
  it('gemischt: drei Effekte in der APA-Zeile', () => {
    s.einst.sprache = 'de';
    const st = saetzeMesswiederholung(messwiederholung(A, ['a', 'b', 'c'], TR, 'g'), zn, 'Gruppe');
    expect(st.apa).toMatch(/^Gruppe: F\(2, 13\) = 2,91, p = ,090, ηp² = ,31, .*; Zeit: F\(1,74; 22,64\) = 19,29, p < ,001, ηp² = ,60, .*; Zeit × Gruppe: F\(3,48; 22,64\) = 5,43, p = ,004, ηp² = ,46, .* \(Greenhouse-Geisser\)$/);
    expect(st.zusatz).toContain('Wechselwirkung Zeit × Gruppe ist signifikant');
  });
  it('T61 (Abschlusstest F4): Wortstufe aus ηG² (Bakeman 2005; afex ges), ηp² mit Intervall daneben', () => {
    s.einst.sprache = 'de'; s.einst.zahl = 'komma';
    const e = messwiederholung(A, ['a', 'b', 'c']);   // ηp² = ,4975, ηG² = ,1782 (afex, messwiederholung.test.ts)
    const st = saetzeMesswiederholung(e, zn);
    expect(st.zusatz).toContain('der Effekt ist groß (ηG² = ,18, nach üblicher Faustregel für ηG²; ηp² = ,50, 95 %-KI [,22; ,67])');
    expect(st.vorsicht).toContain('Die Einordnung folgt ηG², das mit η² aus Gruppenvergleichen vergleichbar ist; ηp² fällt bei Messwiederholung meist deutlich größer aus (Olejnik und Algina 2003; Bakeman 2005).');
    expect(st.marken[0]!.text).toBe('Veränderung über die Zeit: groß · ηG² = ,18');
    expect(st.marken.map(m => m.text)).toContain('ηp² = ,50');
    // flacher Verlauf (Befund T61): ηp² = ,06 hieß „mittelgroß“, ηG² = ,00 ist sehr klein
    const flach = saetzeMesswiederholung({ ...e, zeit: { ...e.zeit, f: 1.1, p: 0.35, etaP: 0.06, etaG: 0.004, etaPLo: 0, etaPHi: 0.2 }, korrektur: 'keine' }, zn);
    expect(flach.zusatz).toContain('Die Unterschiede über die Zeit sind sehr klein (ηG² = ,00; ηp² = ,06, 95 %-KI [,00; ,20])');
    s.einst.sprache = 'en'; s.einst.zahl = 'sprache';
    expect(saetzeMesswiederholung(e, zn).zusatz).toContain('the effect is large (ηG² = .18, by a common rule of thumb for ηG²; ηp² = .50, 95% CI [.22, .67])');
    s.einst.sprache = 'de'; s.einst.zahl = 'komma';
  });
});

describe('Tabellen zur Messwiederholung', () => {
  it('vier echte Tabellen im APA-Stil, Dezimalkomma, p ohne führende Null', () => {
    s.einst.sprache = 'de'; s.einst.zahl = 'komma';
    const ts = tabellenMesswiederholung(messwiederholung(A, ['a', 'b', 'c']), zn);
    expect(ts.map(t => t.label)).toEqual(['Descriptive Statistics', 'Mauchly Test', 'Tests of Within-Subjects Effects', 'Pairwise Comparisons']);
    const mauchly = tabelleDe(ts[1]!, null), anova = tabelleDe(ts[2]!, null), paare = tabelleDe(ts[3]!, null);
    expect(mauchly.zeilen[1]!.map(c => c.t)).toEqual(['Zeit', ',705', '4,90', '2', ',086', ',772', ',844']);
    expect(anova.zeilen[1]!.map(c => c.t).slice(0, 3)).toEqual(['Zeit', '33,50', '1,54']);
    expect(anova.zeilen[1]![4]!.t).toBe('14,85'); expect(anova.zeilen[1]![6]!.t).toBe(',50');
    expect(anova.zeilen[1]![2]!.t).toBe('1,54'); expect(anova.zeilen[1]![5]!.t).toBe('<\u00a0,001');
    expect(paare.zeilen[1]!.map(c => c.t).slice(0, 2)).toEqual(['nachher − vorher', '1,38']);
    expect(paare.zeilen[1]![5]!.t).toBe(',020');
    expect(paare.fuss[0]).toContain('Bonferroni');
  });
});
