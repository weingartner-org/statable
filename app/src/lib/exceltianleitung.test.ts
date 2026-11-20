import { afterEach, describe, expect, it } from 'vitest';
import { anleitung } from './exceltianleitung';
import { s } from './sitzung.svelte';
import type { ZweiGruppen, Anova, Kreuz, Zusammenhang } from './ergebnis';

const t: ZweiGruppen = {
  art: 'zwei-gruppen', abhaengig: 'wert', gruppenSpalte: 'gruppe', a: { name: 'A', n: 12, m: 5, sd: 2, kiLo: 3.7, kiHi: 6.3 }, b: { name: 'B', n: 10, m: 3.5, sd: 1.5, kiLo: 2.4, kiHi: 4.6 },
  diff: 1.5, t: 2.007449, df: 19.82296, p: 0.05853023, diffLo: -0.05, diffHi: 3.05, tKlassisch: 1.95456, dfKlassisch: 20, pKlassisch: 0.06475896, d: 0.84, dLo: -0.05, dHi: 1.7, spGepoolt: 1.792345
};
afterEach(() => { s.einst.sprache = 'de'; });

describe('SPSS-Zeilen', () => {
  it('t-Test: Menüpfad deutsch und englisch', () => {
    s.einst.sprache = 'de'; expect(anleitung(t)!.spss[0]).toContain('T-Test bei unabhängigen Stichproben'); s.einst.sprache = 'en'; expect(anleitung(t)!.spss[0]).toContain('Independent-Samples T Test');
  });
});

describe('Excel und TI-84: Regression und Kennzahlen', () => {
  it('Regression mit einer Vorhersagegröße: SLOPE/LinReg, Steigung und r²', () => {
    s.einst.sprache = 'en';
    const e = { art: 'vorhersage', ziel: 'y', r2: 0.25, r2korr: 0.2, f: 6, df1: 1, df2: 18, p: 0.02, praediktoren: [{ name: 'x', b: 0.5, beta: 0.5, p: 0.02, lo: 0.1, hi: 0.9, t: 2.45 }] } as unknown as import('./ergebnis').Vorhersage;
    const a = anleitung(e)!; expect(a.excel.join('\n')).toContain('=SLOPE(Y, X)'); expect(a.ti.join('\n')).toContain('LinReg(a+bx)'); expect(a.soll[0]).toContain('b = 0.500');
    const m = anleitung({ ...e, praediktoren: [e.praediktoren[0]!, { ...e.praediktoren[0]!, name: 'z' }] })!; expect(m.ti.join('\n')).toContain('only calculates regression with one predictor');
  });
  it('Kennzahlen: 1-Var Stats und AVERAGE', () => {
    s.einst.sprache = 'de';
    const v = { art: 'verteilung', zahlen: [{ name: 'w', n: 20, m: 5.5, sd: 1.2, min: 3, max: 8, median: 5.4 }], gruppen: [] } as unknown as import('./ergebnis').Verteilung;
    const a = anleitung(v)!; expect(a.ti.join('\n')).toContain('1-Var Stats'); expect(a.excel.join('\n')).toContain('=MITTELWERT(A)'); expect(a.soll[0]).toContain('Sx = 1,20');
  });
});

describe('Excel und TI-84: Anleitung zu einem Ergebnis', () => {
  it('t-Test (deutsch): T.TEST mit Typ 2 und 3, Kennzahlen für 2-SampTTest, Sollwerte klassisch und Welch', () => {
    s.einst.sprache = 'de'; const a = anleitung(t)!;
    expect(a.excel.join('\n')).toContain('=T.TEST(A; B; 2; 2)'); expect(a.excel.join('\n')).toContain('=T.TEST(A; B; 2; 3)'); expect(a.excel.join('\n')).toContain('=MITTELWERT(A)'); expect(a.excel.join('\n')).toContain('=STABW.S(A)');
    expect(a.ti.join('\n')).toContain('4:2-SampTTest'); expect(a.ti.join('\n')).toContain('n1 = 12'); expect(a.ti.join('\n')).toContain('Sx2 = 1,500');
    expect(a.soll[0]).toContain('t = 1,95'); expect(a.soll[0]).toContain('df = 20'); expect(a.soll[0]).toContain('p = ,065'); expect(a.soll[1]).toContain('df = 19,82');
  });
  it('englische Oberfläche: englische Funktionsnamen und Komma', () => { s.einst.sprache = 'en'; const a = anleitung(t)!; expect(a.excel.join('\n')).toContain('=T.TEST(A, B, 2, 2)'); expect(a.excel.join('\n')).toContain('=AVERAGE(A)'); expect(a.excel.join('\n')).toContain('=STDEV.S(A)'); });
  it('Varianzanalyse: ANOVA am TI-84 und F.VERT.RE', () => {
    const e: Anova = { art: 'anova', abhaengig: 'y', gruppenSpalte: 'g', gruppen: [{ name: 'a', n: 5, m: 1, sd: 1 }, { name: 'b', n: 5, m: 2, sd: 1 }, { name: 'c', n: 5, m: 3, sd: 1 }], n: 15, ssZwischen: 10, ssInnerhalb: 12, dfZwischen: 2, dfInnerhalb: 12, f: 5, p: 0.0263 };
    const a = anleitung(e)!; expect(a.ti.join('\n')).toContain('ANOVA(L1,L2,L3)'); expect(a.excel.join('\n')).toContain('=F.VERT.RE(5,0000; 2; 12)'); expect(a.soll[0]).toContain('F(2, 12) = 5,00');
  });
  it('Chi-Quadrat: Matrix und χ²-Test', () => {
    const k = { art: 'kreuz', gezaehlt: 'antwort', gruppen: 'gruppe', chi2: 4.5, df: 1, p: 0.034, n: 40, v: 0.3, stufen: 2, unter5: 0, zellen: 4, minErwartet: 8, je: [], zaehlung: { zeilen: ['a', 'b'], spalten: ['ja', 'nein'], tab: [[12, 8], [6, 14]] } } as unknown as Kreuz;
    const a = anleitung(k)!; expect(a.ti.join('\n')).toContain('[12, 8] [6, 14]'); expect(a.ti.join('\n')).toContain('C:χ²-Test'); expect(a.soll[0]).toContain('χ²(1) = 4,50');
  });
  it('Korrelation: ohne Pearson oder mit Herausrechnen keine Anleitung', () => {
    const r = { art: 'zusammenhang', x: 'a', y: 'b', r: 0.5, p: 0.01, n: 30, kiLo: 0.2, kiHi: 0.7 } as unknown as Zusammenhang;
    expect(anleitung(r)!.ti.join('\n')).toContain('LinRegTTest'); expect(anleitung({ ...r, methode: 'spearman' })).toBeNull();
  });
});

describe('R- und jamovi-Zeilen (S-K K7 Schritt 4)', () => {
  it('t-Test: R-Befehle mit den Spaltennamen, Rückstriche bei Sonderzeichen', async () => {
    const { rZeilen, jamoviZeilen } = await import('./exceltianleitung');
    const e = { art: 'zwei-gruppen', abhaengig: 'Punkte', gruppenSpalte: 'Gruppe A' } as never;
    expect(rZeilen(e)[0]).toBe('t.test(Punkte ~ `Gruppe A`, data = daten, var.equal = TRUE)  # Student');
    expect(rZeilen(e)[1]).toContain('# Welch');
    expect(jamoviZeilen(e)[0]).toContain('Independent Samples T-Test');
    expect(rZeilen({ art: 'prae-post', vorher: 'v', nachher: 'n' } as never)).toEqual(['t.test(daten$v, daten$n, paired = TRUE)']);
  });
});

describe('Stata-Zeilen (S-K K7)', () => {
  it('t-Test und Regression', async () => {
    const { stataZeilen } = await import('./exceltianleitung');
    expect(stataZeilen({ art: 'zwei-gruppen', abhaengig: 'Punkte', gruppenSpalte: 'Gruppe A' } as never)).toEqual(['ttest Punkte, by(Gruppe_A)', 'ttest Punkte, by(Gruppe_A) unequal']);
    expect(stataZeilen({ art: 'prae-post', vorher: 'v', nachher: 'n' } as never)).toEqual(['ttest v == n']);
  });
});

describe('Gepaarter t-Test: Richtung vorher − nachher (Andreas 25.10.)', () => {
  // Statable hält nachher − vorher (diff = +2, t = +4); TI-84 (L3 = L1 − L2), Excel, SPSS und R rechnen vorher − nachher.
  const pp = { art: 'prae-post', vorher: 'v', nachher: 'n', n: 10, m1: 5, sd1: 1, m2: 7, sd2: 1, diff: 2, sdDiff: 1.581139, diffLo: 0.87, diffHi: 3.13, t: 4, df: 9, p: 0.0031, r: 0.5, dz: 1.26, dzLo: 0.4, dzHi: 2.1, dav: 2 } as unknown as import('./ergebnis').PraePost;
  it('Kennzahlen und Soll-Werte haben dasselbe Vorzeichen wie L1 − L2', () => {
    s.einst.sprache = 'de';
    const a = anleitung(pp)!;
    expect(a.ti[0]).toContain('L3 = L1 − L2');
    expect(a.ti[1]).toContain('x̄ = −2,000');
    expect(a.soll[0]).toContain('t(9) = −4,00');
    expect(a.soll[0]).toContain('vorher − nachher −2,000');
  });
});

describe('TI-83 Plus: abweichende Menübuchstaben', () => {
  it('ANOVA und LinRegTTest nennen den TI-83-Buchstaben', () => {
    s.einst.sprache = 'de';
    const an: Anova = { art: 'anova', gruppen: [{ name: 'a', n: 5, m: 1 }, { name: 'b', n: 5, m: 2 }, { name: 'c', n: 5, m: 3 }], f: 3, dfZwischen: 2, dfInnerhalb: 12, p: 0.08, ssZwischen: 10, ssInnerhalb: 20, gruppenSpalte: 'g', abhaengig: 'y' } as unknown as Anova;
    expect(anleitung(an)!.ti.join(' ')).toContain('TI-83 Plus: F:ANOVA(');
  });
});
