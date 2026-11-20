import { describe, expect, it } from 'vitest';
import { diagnose, lrMinusWort, lrPlusWort, positivVorschlag, standardWahl, vierfelder, wilson } from './diagnostik';

/* Vergleichswerte aus R (scripts/diagnostik-erwartet.R): Wilson-Intervalle wie binom::binom.confint(method = "wilson") (= epiR zwilson),
 * Likelihood-Quotienten mit den Formeln von epiR::epi.tests (Zeilen 316-330 der Quelle), Odds Ratio mit Wald-Intervall. */
const f = (v: number) => v.toFixed(6);
const Z = (a: { wert: number; lo: number; hi: number }) => [f(a.wert), f(a.lo), f(a.hi)];

describe('diagnostische Güte', () => {
  const d = diagnose(45, 12, 5, 88);   // RP, FP, FN, RN
  it('Anteile mit Wilson-Intervall wie R', () => {
    expect(Z(d.se)).toEqual(['0.900000', '0.786398', '0.956524']);
    expect(Z(d.sp)).toEqual(['0.880000', '0.801879', '0.930006']);
    expect(Z(d.ppv)).toEqual(['0.789474', '0.667139', '0.875255']);
    expect(Z(d.npv)).toEqual(['0.946237', '0.880252', '0.976819']);
    expect(Z(d.genauigkeit)).toEqual(['0.886667', '0.825997', '0.928026']);
    expect(Z(d.praevalenz)).toEqual(['0.333333', '0.262888', '0.412102']);
  });
  it('Likelihood-Quotienten und Odds Ratio wie R', () => {
    expect(Z(d.lrPlus)).toEqual(['7.500000', '4.376111', '12.853878']);
    expect(Z(d.lrMinus)).toEqual(['0.113636', '0.049319', '0.261828']);
    expect([f(d.or!.or), f(d.or!.lo), f(d.or!.hi)]).toEqual(['66.000000', '21.895513', '198.944873']);
    expect(d.n).toBe(150);
  });
  it('zweites Beispiel (kleines n)', () => {
    const k = diagnose(18, 3, 2, 27);
    expect(Z(k.se)).toEqual(['0.900000', '0.698966', '0.972134']);
    expect(Z(k.lrPlus)).toEqual(['9.000000', '3.045953', '26.592665']);
    expect(Z(k.lrMinus)).toEqual(['0.111111', '0.029676', '0.416012']);
  });
  it('leere Zelle: Wilson bleibt endlich, LR+ ist unendlich, das Odds Ratio fehlt', () => {
    const k = diagnose(20, 0, 5, 75);
    expect(k.sp.wert).toBe(1); expect(k.sp.hi).toBeCloseTo(1, 10); expect(k.sp.lo).toBeGreaterThan(0.95);
    expect(k.lrPlus.wert).toBe(Infinity); expect(Number.isNaN(k.lrPlus.lo)).toBe(true);
    expect(k.or).toBeNull();
  });
  it('wilson(0, 0) ist NaN, wilson(0, 10) beginnt bei 0', () => {
    expect(Number.isNaN(wilson(0, 0).wert)).toBe(true);
    expect(wilson(0, 10).lo).toBe(0);
  });
});

describe('Vierfelder aus der Kreuztabelle', () => {
  // Zeilen = Gruppen (Referenz), Spalten = Antworten (Test): [[Test −, Test +], [Test −, Test +]]
  const tab = [[88, 12], [5, 45]];   // Zeile 0 = Referenz negativ, Zeile 1 = Referenz positiv
  it('Referenz in den Zeilen', () => { expect(vierfelder(tab, { ref: 'zeilen', refPos: 1, testPos: 1 })).toEqual([45, 12, 5, 88]); });
  it('Referenz in den Spalten (Tafel vertauscht)', () => {
    expect(vierfelder([[88, 5], [12, 45]], { ref: 'spalten', refPos: 1, testPos: 1 })).toEqual([45, 12, 5, 88]);
  });
  it('anderer Wert als positiv: Rollen drehen sich', () => { expect(vierfelder(tab, { ref: 'zeilen', refPos: 0, testPos: 0 })).toEqual([88, 5, 12, 45]); });
  it('Vorschlag: „ja“ und 1 sind positiv, sonst der zweite Wert', () => {
    expect(positivVorschlag(['nein', 'ja'])).toBe(1); expect(positivVorschlag(['ja', 'nein'])).toBe(0);
    expect(positivVorschlag(['0', '1'])).toBe(1); expect(positivVorschlag(['gesund', 'krank'])).toBe(1); expect(positivVorschlag(['A', 'B'])).toBe(1);
    // Verneinung ist nie das Ereignis, wenn die andere Antwort keine hat
    expect(positivVorschlag(['kein Rückfall', 'Rückfall'])).toBe(1); expect(positivVorschlag(['Rückfall', 'kein Rückfall'])).toBe(0); expect(positivVorschlag(['keine Auffälligkeit', 'Auffälligkeit'])).toBe(1);
    expect(positivVorschlag(['bestanden', 'nicht bestanden'])).toBe(0); expect(positivVorschlag(['nicht bestanden', 'bestanden'])).toBe(1); expect(positivVorschlag(['ohne Förderung', 'mit Förderung'])).toBe(1);
    expect(positivVorschlag(['no relapse', 'relapse'])).toBe(1); expect(positivVorschlag(['relapse', 'not relapsed'])).toBe(0); expect(positivVorschlag(['non-smoker', 'smoker'])).toBe(1);
    expect(positivVorschlag(['kein Rückfall', 'nicht rückfällig'])).toBe(1);   // beide verneint: Regel wie bisher (zweite Stufe)
    expect(positivVorschlag(['nicht auffällig', 'auffällig'])).toBe(1); expect(positivVorschlag(['keine', 'ja'])).toBe(1);
    expect(standardWahl(['0', '1'], ['unauffällig', 'auffällig'])).toEqual({ ref: 'zeilen', refPos: 1, testPos: 1 });
  });
});

describe('Worte', () => {
  it('Jaeschke et al. 1994', () => {
    expect(lrPlusWort(12)).toBe('starke'); expect(lrPlusWort(7)).toBe('mäßige'); expect(lrPlusWort(3)).toBe('geringe'); expect(lrPlusWort(1.5)).toBe('kaum eine');
    expect(lrMinusWort(0.05)).toBe('starke'); expect(lrMinusWort(0.15)).toBe('mäßige'); expect(lrMinusWort(0.4)).toBe('geringe'); expect(lrMinusWort(0.7)).toBe('kaum eine');
  });
});

describe('ROC-Befehl', () => {
  it('läuft in PSPP 2.1.1: Fläche .80 wie von Hand (20 von 25 Paaren, Bindung zählt halb)', async () => {
    const { rocBefehl } = await import('./verfahren');
    const { nodeEngine } = await import('./testengine');
    const e = await nodeEngine();
    e.run("NEW FILE.\nDATA LIST LIST /score (F8.0) diag (A8).\nBEGIN DATA\n3 ja\n5 ja\n7 ja\n8 ja\n9 ja\n2 nein\n4 nein\n5 nein\n6 nein\n3 nein\nEND DATA.\n");
    const r = e.run(rocBefehl('score', 'diag', 'ja'));
    const auc = r.find(i => i.type === 'table' && i.label === 'Area Under the Curve') as import('../engine/types').TableItem;
    expect(auc.cells.find(c => c.r === 2 && c.c === 1)!.n).toBeCloseTo(0.8, 10);
    expect(r.some(i => i.type === 'chart')).toBe(true);
    expect(rocBefehl('x', 'g', 1, false)).toContain('ROC x BY g (1)');
    expect(rocBefehl('x', 'g', "o'k", false)).toContain("('o''k')");
  });
});

describe('Sätze und Tabellen', () => {
  it('Kreuztabelle als Test gegen einen Referenzstandard: Satz, APA-Zeile, Tabellen', async () => {
    const { saetzeKreuz, diagnoseVon } = await import('./ergebnis');
    const { tabelleDiagnose } = await import('./guetetabellen');
    const e = {
      art: 'kreuz' as const, gezaehlt: 'Screening', gruppen: 'Diagnose', chi2: 86.078, df: 1, p: 0, n: 150, v: 0.7575, stufen: 1, unter5: 0, zellen: 4, minErwartet: 19, je: [
        { name: 'nein', n: 100, haeufigst: 'unauffällig', anteil: 0.88, gleichauf: ['unauffällig'] }, { name: 'ja', n: 50, haeufigst: 'auffällig', anteil: 0.9, gleichauf: ['auffällig'] }],
      zaehlung: { zeilen: ['nein', 'ja'], spalten: ['unauffällig', 'auffällig'], tab: [[88, 12], [5, 45]] }
    };
    expect(saetzeKreuz(e).zusatz).not.toContain('Sensitivität');
    expect(diagnoseVon(e)).toBeNull();
    const mit = { ...e, diagnose: { ref: 'zeilen' as const, refPos: 1, testPos: 1 } };
    const st = saetzeKreuz(mit);
    expect(st.zusatz).toContain('Sensitivität 90 %');
    expect(st.zusatz).toContain('Spezifität 88 %');
    expect(st.zusatz).toContain('LR+ = 7,50, 95 %-KI [4,38; 12,85]');
    expect(st.apa).toContain('Sensitivität = ,90, 95 %-KI [,79; ,96]');
    expect(st.marken.map(m => m.erklaer)).toEqual(expect.arrayContaining(['sensitivitaet', 'spezifitaet', 'vorhersagewert']));
    const tab = tabelleDiagnose(mit);
    expect(tab).toHaveLength(2);
    expect(tabelleDiagnose(e)).toEqual([]);
  });
  it('ICC mit zwei Spalten bringt Bland-Altman in Satz, APA-Zeile und Tabelle', async () => {
    const { iccErgebnis, saetzeIcc } = await import('./ergebnis');
    const { tabelleBlandAltman } = await import('./guetetabellen');
    const A = [9, 6, 8, 7, 10, 6, 5, 8, 7, 9, 4, 6, 7, 8, 5], B = [7, 6, 9, 6, 10, 7, 6, 9, 7, 10, 6, 8, 6, 9, 4];
    const e = iccErgebnis(['A', 'B'], A.map((a, i) => [a, B[i]!]), 15);
    expect(e.ba?.n).toBe(15);
    const st = saetzeIcc(e);
    expect(st.zusatz).not.toContain('Bland-Altman');   // der ICC-Absatz bleibt kurz
    expect(st.ba).toContain('Bland-Altman');
    expect(st.ba).toContain('Bias = −0,33');
    expect(st.zusatz.split(/\s+/).length).toBeLessThan(90);
    expect(st.apa).toContain('Bland-Altman: Bias = −0,33');
    expect(st.marken.some(m => m.erklaer === 'bland-altman')).toBe(true);
    expect(tabelleBlandAltman(e)).toHaveLength(1);
    const drei = iccErgebnis(['A', 'B', 'C'], A.map((a, i) => [a, B[i]!, a + 1 - (i % 2)]), 15);
    expect(drei.ba).toBeUndefined(); expect(saetzeIcc(drei).zusatz).not.toContain('Bland-Altman');
  });
});
