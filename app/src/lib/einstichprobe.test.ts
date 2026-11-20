import { describe, expect, it } from 'vitest';
import { einstichprobe, einstichprobeSatz, einstichprobeApa, mitEinstichprobe } from './einstichprobe';
import { s } from './sitzung.svelte';

/** Sollwerte: SPSS 32, T-TEST /TESTVAL=50 /VARIABLES=prae /ES DISPLAY(TRUE) auf pruefdaten/nacht/nacht.sav (Ausgabe pruefdaten/nacht/spss/lauf1.txt):
 *  N 150, M 51.4687, SD 10.20965, t 1.762, df 149, p (zweiseitig) .080, Differenz 1.46867, KI [−.1786; 3.1159], d .144 [−.017; .304]. R: t.test(prae, mu = 50). */
const prae = { name: 'Testwert vorher', n: 150, m: 51.468666666666664, sd: 10.209648 };
describe('t-Test bei einer Stichprobe', () => {
  it('gleich SPSS 32', () => {
    const r = einstichprobe(prae, 50)!;
    expect(r.t).toBeCloseTo(1.762, 3); expect(r.df).toBe(149); expect(r.p).toBeCloseTo(0.0801, 3);
    expect(r.diff).toBeCloseTo(1.46867, 4); expect(r.lo).toBeCloseTo(-0.1786, 3); expect(r.hi).toBeCloseTo(3.1159, 3);
    expect(r.d).toBeCloseTo(0.144, 3); expect(r.dLo).toBeCloseTo(-0.017, 3); expect(r.dHi).toBeCloseTo(0.304, 3);
  });
  it('Satz und Zeile für die Arbeit', () => {
    s.einst.sprache = 'de';
    const r = einstichprobe(prae, 50)!;
    expect(einstichprobeSatz(r)).toMatch(/^Der Mittelwert von „Testwert vorher“ \(51,47\) liegt um 1,47 über dem Vergleichswert 50\. Ein so großer Abstand kommt auch dann nicht selten vor/);
    expect(einstichprobeApa(r)).toMatch(/^t\(149\) = 1,76, p = ,080, d = 0,14, 95\s%-KI \[−0,02; 0,30\] \(Vergleichswert 50\)$/);
    const sig = einstichprobe(prae, 48.5)!;
    expect(sig.p).toBeLessThan(0.05);
    expect(einstichprobeSatz(sig)).toMatch(/liegt um 2,97 über dem Vergleichswert 48,50\. Ein so großer Abstand wäre selten/);
    expect(einstichprobeSatz(einstichprobe(prae, 55)!)).toMatch(/liegt um 3,53 unter dem Vergleichswert 55/);
  });
  it('nicht rechenbar: n < 2, keine Streuung', () => {
    expect(einstichprobe({ ...prae, n: 1 }, 50)).toBeNull();
    expect(einstichprobe({ ...prae, sd: 0 }, 50)).toBeNull();
  });
  it('hängt Satz und APA an die Sätze der Verteilung', () => {
    s.einst.sprache = 'de';
    const st = mitEinstichprobe({ haupt: 'H', zusatz: 'Z', vorsicht: '', apa: 'M = 51,47', marken: [] }, { art: 'verteilung', zahlen: [prae as never], gruppen: [], testwerte: { 'Testwert vorher': 50 } } as never);
    expect(st.zusatz).toContain('über dem Vergleichswert 50');
    expect(st.apa).toMatch(/^M = 51,47; t\(149\) = 1,76/);
    expect(mitEinstichprobe({ haupt: 'H', zusatz: 'Z', vorsicht: '', apa: 'A', marken: [] }, { art: 'verteilung', zahlen: [prae as never], gruppen: [] } as never).apa).toBe('A');
  });
});
