import { describe, expect, it } from 'vitest';
import { rechnung } from './rechnungmitlesen';
import type { ZweiGruppen, Anova } from './ergebnis';

const t: ZweiGruppen = {
  art: 'zwei-gruppen', abhaengig: 'wert', gruppenSpalte: 'gruppe', a: { name: 'A', n: 12, m: 5, sd: 2, kiLo: 3.7, kiHi: 6.3 }, b: { name: 'B', n: 10, m: 3.5, sd: 1.5, kiLo: 2.4, kiHi: 4.6 },
  diff: 1.5, t: 2.007449, df: 19.82296, p: 0.05853023, diffLo: -0.05, diffHi: 3.05, tKlassisch: 1.95456, dfKlassisch: 20, pKlassisch: 0.06475896, d: 0.84, dLo: -0.05, dHi: 1.7, spGepoolt: 1.792345
};
describe('Rechnung zum Mitlesen', () => {
  it('t-Test: gemeinsame SD 1,792, SE 0,7674, t 1,955 (R: sp = 1.792345, t = 1.95456)', () => {
    const r = rechnung(t)!, s = (i: number) => r.schritte[i]!;
    expect(s(1).eingesetzt).toContain('= 1,792'); expect(s(2).eingesetzt).toContain('= 0,7674'); expect(s(3).eingesetzt).toContain('= 1,955'); expect(s(4).eingesetzt).toContain('df = 20'); expect(s(4).eingesetzt).toContain('p = ,065'); expect(s(7).eingesetzt).toContain('t = 2,007');
  });
  it('Varianzanalyse: F aus den Quadratsummen', () => {
    const e: Anova = { art: 'anova', abhaengig: 'y', gruppenSpalte: 'g', gruppen: [{ name: 'a', n: 10, m: 5.1, sd: 1.2 }, { name: 'b', n: 12, m: 6.3, sd: 1.5 }, { name: 'c', n: 9, m: 7.2, sd: 1.1 }], n: 31, ssZwischen: 21.19935, ssInnerhalb: 47.39, dfZwischen: 2, dfInnerhalb: 28, f: 6.262734, p: 0.005649628 };
    const r = rechnung(e)!; expect(r.schritte[1]!.eingesetzt).toContain('= 21,199'); expect(r.schritte[2]!.eingesetzt).toContain('= 47,390'); expect(r.schritte[4]!.eingesetzt).toContain('F(2, 28) = 6,263'); expect(r.schritte[5]!.eingesetzt).toContain('= 0,309');
  });
});
