import { describe, expect, it } from 'vitest';
import { localizeCell, translate } from './format-de';

describe('localizeCell', () => {
  it('lässt Text unverändert', () => expect(localizeCell({ t: 'Valid' })).toBe('Valid'));
  it('setzt Dezimalkomma', () => expect(localizeCell({ t: '3.02', n: 3.02 })).toBe('3,02'));
  it('behält die Null bei normalen Werten ohne Vorkomma-Ziffer', () => expect(localizeCell({ t: '.44', n: 0.44 })).toBe(',44'));
  it('Prozentwerte mit Leerzeichen', () => expect(localizeCell({ t: '50.0%', n: 50 })).toBe('50,0\u00a0%'));
  it('Abnahme 31.10. F5: ein p in einer Zeile ohne p-Kopf („< .001“ aus fp) wird zu „< ,001“', () => { expect(localizeCell({ t: '< .001', n: 0.00001 }, 'Wert')).toBe('<\u00a0,001'); expect(localizeCell({ t: '.047', n: 0.047 }, 'Wert')).toBe(',047'); });
  it('p-Wert 0 wird "< ,001"', () => expect(localizeCell({ t: '.000', n: 0 }, 'Sig.')).toBe('<\u00a0,001'));
  it('p-Wert ohne führende Null', () => expect(localizeCell({ t: '.047', n: 0.047 }, 'Sig. (2-tailed)')).toBe(',047'));
  it('p-Wert zwischen ,0005 und ,001: „< ,001“ wie im Satz (B4)', () => {
    expect(localizeCell({ t: '.001', n: 0.000507 }, 'Sig. (2-tailed)')).toBe('<\u00a0,001');
    expect(localizeCell({ t: '.001', n: 0.00099 }, 'Sig.')).toBe('<\u00a0,001');
    expect(localizeCell({ t: '.001', n: 0.001 }, 'Sig.')).toBe(',001');
    expect(localizeCell({ t: '.001', n: 0.0007 }, 'Sig. (2-tailed)', { dezimal: '.', proz: '' })).toBe('<\u00a0.001');
  });
  it('weitere p-Köpfe: Asymp. Sig., Exact Sig., Approx. Sig.', () => {
    for (const k of ['Asymp. Sig. (2-sided)', 'Exact Sig. (2-sided)', 'Approx. Sig.']) expect(localizeCell({ t: '.000', n: 0 }, k)).toBe('<\u00a0,001');
  });
  it('Exponentenschreibweise (B5): p-Spalte „< ,001“, sonst lesbar', () => {
    expect(localizeCell({ t: '7.20E-015', n: 7.2e-15 }, 'Sig.')).toBe('<\u00a0,001');
    expect(localizeCell({ t: '7.20E-015', n: 7.2e-15 }, 'Mean')).toBe('0,00');
    expect(localizeCell({ t: '2.47E-007', n: 2.47e-7 }, 'Skewness')).toBe('0,00000025');
    expect(localizeCell({ t: '4.58E-005', n: 4.58e-5 }, 'R Square')).toBe('0,000046');
    expect(localizeCell({ t: '-9.01E-005', n: -9.01e-5 }, 'B')).toBe('-0,000090');
    expect(localizeCell({ t: '4.58E-005', n: 4.58e-5 }, 'R Square', { dezimal: '.', proz: '' })).toBe('0.000046');
    expect(localizeCell({ t: '1.50E+008', n: 1.5e8 }, 'Sum')).toBe('150.000.000,00')   // B2 (18.10.): ausgeschrieben mit Tausendertrenner;
  });
  it('ganze Zahlen bleiben', () => expect(localizeCell({ t: '198.00', n: 198 })).toBe('198,00'));
  it('negative Werte', () => expect(localizeCell({ t: '-.09', n: -0.09 })).toBe('-,09'));
});

describe('translate', () => {
  const dict = { 'Group Statistics': 'Gruppenstatistiken', Mean: 'Mittelwert' };
  it('übersetzt bekannte Texte', () => expect(translate('Mean', dict)).toBe('Mittelwert'));
  it('Vorlagen mit Platzhaltern (Pair %zu, %g%% Confidence Interval for Mean)', () => {
    const d2 = { 'Pair %zu': 'Paar %zu', '%g%% Confidence Interval for Mean': '%g%% Konfidenzintervall für Mittelwert', '%s': 'X' };
    expect(translate('Pair 1', d2)).toBe('Paar 1');
    expect(translate('95% Confidence Interval for Mean', d2)).toBe('95% Konfidenzintervall für Mittelwert');
    expect(translate('irgendwas', d2)).toBe('irgendwas');
  });
  it('behält Klammerzusatz', () => expect(translate('Group Statistics (note)', dict)).toBe('Gruppenstatistiken (note)'));
  it('verschachtelte Klammer und Muster mit %s', () => {
    expect(translate('Group Statistics (Konzentration (Punkte))', dict)).toBe('Gruppenstatistiken (Konzentration (Punkte))');
    expect(translate('Model Summary (x (y))', { 'Model Summary (%s)': 'Modellzusammenfassung (%s)' })).toBe('Modellzusammenfassung (x (y))');
    expect(translate('Coefficients (Konzentration)', {})).toBe('Koeffizienten (Konzentration)');
    expect(translate('(nur Klammer)', dict)).toBe('(nur Klammer)');
  });
  it('lässt Unbekanntes und ohne Wörterbuch unverändert', () => {
    expect(translate('Foo', dict)).toBe('Foo');
    expect(translate('Mean', null)).toBe('Mean');
  });
});
