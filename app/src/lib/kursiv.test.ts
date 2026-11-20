import { describe, expect, it } from 'vitest';
import { teile, kursivHtml } from './kursiv';

const kursiv = (t: string) => teile(t).filter(s => s.stil === 'italic').map(s => s.t);
describe('APA-Kursivsetzung', () => {
  it('Kennwerte kursiv, Wörter nicht', () => {
    expect(kursiv('Mittelwert 16,1 gegen 25,3 (t(6,0) = 6,59, p < ,001, d = 4,17, 95 %-KI [1,96; 6,37]).')).toEqual(['t', 'p', 'd']);
    expect(kursiv('r(113) = ,19, p = ,039, n = 115, M = 3,1, SD = 1,2, R² = ,12, F(2, 112) = 7,4')).toEqual(['r', 'p', 'n', 'M', 'SD', 'R²', 'F']);
    expect(kursiv('Die Gruppe „ja“ hatte mehr. Cronbachs α = ,77 (4 Items, n = 196)')).toEqual(['n']);
  });
  it('Rangtests: U, z, H, r, rrb kursiv; ε² und Dunn-Namen nicht', () => {
    expect(kursiv('U = 127,5, z = 3,85, p < ,001, r = ,53, rrb = ,62')).toEqual(['U', 'z', 'p', 'r', 'rrb']);
    expect(kursiv('H(4) = 29,27, p < ,001, ε² = ,25; Dunn (Holm): Mai - Juli (p = ,010)')).toEqual(['H', 'p', 'p']);
  });
  it('Text bleibt vollständig', () => {
    const t = 't(77,5) = 2,86, p = ,005';
    expect(teile(t).map(s => s.t).join('')).toBe(t);
  });
  it('t-Test deutsch und englisch', () => {
    expect(kursiv('t(77,46) = 2,86, p = ,005, d = 0,57, 95 %-KI [0,19; 0,95]')).toEqual(['t', 'p', 'd']);
    expect(kursiv('t(77.46) = 2.86, p = .005, d = 0.57, 95% CI [0.19, 0.95]')).toEqual(['t', 'p', 'd']);
    expect(kursiv('t(41) = 2,10, p = ,042, dz = 0,32')).toEqual(['t', 'p', 'dz']);
  });
  it('ANOVA mit η² und χ² (griechisch bleibt aufrecht)', () => {
    expect(kursiv('F(2, 112) = 7,40, p = ,001, η² = ,12')).toEqual(['F', 'p']);
    expect(kursiv('χ²(2, N = 196) = 5,1, p = ,078, V = ,16; OR = 2,1, 95 %-KI [1,1; 4,0]')).toEqual(['N', 'p', 'V']);
  });
  it('Regression, Kappa, Korrelation, Mediation', () => {
    expect(kursiv('R² = ,12, 95 %-KI [,03; ,24], F(2, 112) = 7,4, p < ,001; B = 0,45, 95 %-KI [0,2; 0,7]; β = ,30')).toEqual(['R²', 'F', 'p', 'B']);
    expect(kursiv('κ (linear) = ,61, p < ,001, 95 %-KI [,50; ,70], n = 120')).toEqual(['p', 'n']);
    expect(kursiv('rs(358) = ,11, p = ,043')).toEqual(['rs', 'p']);
    expect(kursiv('ab = 0,12, 95 %-KI [0,02; 0,25]; a = 0,40, p = ,002; b = 0,30, p = ,010; c′ = 0,05, p = ,600; c = 0,17, p = ,040')).toEqual(['ab', 'a', 'p', 'b', 'p', 'c′', 'p', 'c', 'p']);
    expect(kursiv('Nagelkerke R² = ,21; OR = 1,8, p = ,02; LR+ = 3,1; PPV = ,80')).toEqual(['R²', 'p']);
  });
  it('HTML mit <i> und Maskierung', () => {
    expect(kursivHtml('p < ,001')).toBe('<i>p</i> &lt; ,001');
  });
});
