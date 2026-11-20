import { describe, expect, it } from 'vitest';
import { friedman } from './friedman';
import { cochranQ, mcnemar } from './mcnemarcochran';
import erwartet from './testdaten/friedman-mcnemar-cochran-erwartet.json';

/* Fachblatt Welle 2, Paket C (G5): Friedman, McNemar, Cochran-Q gegen R.
 * Sollwerte: scripts/friedman-mcnemar-cochran-erwartet.R (friedman.test + coin + rstatix::friedman_effsize; exact2x2::mcnemar.exact + binom.test;
 * Cochran-Formel + rstatix::cochran_qtest; Paarvergleiche Wilcoxon gepaart nach G9/G10 und McNemar exakt, jeweils Holm). Toleranz 1e-9.
 *
 * Erwartete Programmierschnittstelle (die beiden Module gibt es noch nicht, darum sind diese Tests rot):
 *
 *  app/src/lib/friedman.ts
 *    friedman(daten: number[][], zeitpunkte: string[]): Friedman
 *      daten: eine Zeile je Person, eine Spalte je Zeitpunkt, nur vollständige Fälle (wie messwiederholung). Kommazahlen: Differenzen und Werte vor dem Ranken
 *      auf 12 gültige Stellen runden (wie rangtests.ts). Wirft einen Error bei weniger als 3 Zeitpunkten oder weniger als 2 Personen.
 *    interface Friedman { n; k; kein: boolean; chi2; df; p; kendallW; rangsummen: number[]; mittlereRaenge: number[]; mediane: number[]; paare: FriedmanPaar[] }
 *      chi2 mit Bindungskorrektur innerhalb der Personen (wie R und PSPP), kendallW = chi2 / (n (k - 1)).
 *      kein = true, wenn jede Person in allen Zeitpunkten denselben Wert hat (Nenner der Bindungskorrektur 0; R: NaN): dann chi2, p, kendallW = NaN und alle Paare ohne Test.
 *    interface FriedmanPaar { i; j /* 0-basiert, i < j *\/; von; nach; vPlus; vMinus; nTest; nNull; p: number | null; pHolm: number | null }
 *      Wilcoxon gepaart (nachher - vorher = Zeitpunkt j minus i), exakt auch bei Bindungen, Nullen vor dem Ranken entfernt (lib/wilcoxon). Weniger als 2 Paare mit
 *      Unterschied: p = pHolm = null (kein Test). Holm über alle Paare MIT p.
 *
 *  app/src/lib/mcnemarcochran.ts
 *    mcnemar(vorher: number[], nachher: number[]): McNemar     (Werte 0 und 1, gleich lang, nur vollständige Paare)
 *    interface McNemar { n; a; b; c; d; nDiskordant; kein: boolean; p: number | null; oddsRatio: number | null; kiUnten: number | null; kiOben: number | null }
 *      b = vorher 1, nachher 0; c = vorher 0, nachher 1. p = exakter Binomialtest der b + c Paare, zweiseitig min(1, 2 * P(X <= min(b, c))), nie über 1.
 *      oddsRatio = b / c (Infinity bei c = 0, 0 bei b = 0), KI 95 % exakt (Clopper-Pearson des Anteils b / (b + c), als Odds; kiOben = Infinity bei c = 0, kiUnten = 0 bei b = 0).
 *      Keine diskordanten Paare: kein = true, p = oddsRatio = kiUnten = kiOben = null (KEIN Test; PSPP gibt hier 2,000 aus).
 *    cochranQ(daten: number[][], zeitpunkte: string[]): CochranQ     (Werte 0 und 1; wirft einen Error bei anderen Werten, weniger als 3 Zeitpunkten oder 2 Personen)
 *    interface CochranQ { n; k; q; df; p; spaltensummen: number[]; zeilensummen: number[]; gesamt; paare: CochranPaar[] }
 *      Q = (k - 1)(k ΣC² - N²) / (k N - ΣR²) mit N = gesamt (Summe aller Einsen); p aus der χ²-Verteilung mit df = k - 1.
 *    interface CochranPaar { i; j; von; nach; b; c; p: number | null; pHolm: number | null; oddsRatio: number | null }
 *      McNemar exakt je Paar (b = früher 1, später 0), Holm über alle Paare mit p. */

interface PaarF { i: number; j: number; von: string; nach: string; v: number; v_minus: number; n_test: number; n_null: number; p: number; p_holm: number }
interface FriedmanF { name: string; zeitpunkte: string[]; daten: number[][]; n: number; k: number; chi2: number; df: number; p: number; kendall_w: number; rangsummen: number[]; mittlere_raenge: number[]; mediane: number[]; paare: PaarF[] }
type OrWert = number | 'Inf' | null | undefined;
interface McNemarF { name: string; vorher: number[]; nachher: number[]; n: number; a: number; b: number; c: number; d: number; n_diskordant: number; kein_test: boolean; p?: number; odds_ratio?: OrWert; or_unten?: OrWert; or_oben?: OrWert; or_unten_binom?: OrWert; or_oben_binom?: OrWert }
interface CochranPaarF { i: number; j: number; von: string; nach: string; b: number; c: number; p: number; p_holm: number; odds_ratio: OrWert }
interface CochranF { name: string; zeitpunkte: string[]; daten: number[][]; n: number; k: number; q: number; df: number; p: number; spaltensummen: number[]; zeilensummen: number[]; gesamt: number; paare: CochranPaarF[] }
const E = erwartet as unknown as { friedman: FriedmanF[]; mcnemar: McNemarF[]; cochran: CochranF[] };

const tol = 1e-9;
/** Gleich bis 1e-9: relativ zum Sollwert, absolut 1e-14 als Boden. */
const nah = (ist: number | null | undefined, soll: number, was: string, t = tol) => {
  expect(ist, was).toBeTypeOf('number');
  expect(Math.abs(ist! - soll), `${was}: Statable ${ist} gegen R ${soll}`).toBeLessThanOrEqual(t * Math.abs(soll) + 1e-14);
};
const orNah = (ist: number | null | undefined, soll: OrWert, was: string) => {
  if (soll === 'Inf') expect(ist, was).toBe(Infinity); else nah(ist, soll as number, was);
};

describe('Friedman gegen R friedman.test, coin und rstatix::friedman_effsize', () => {
  for (const f of E.friedman) {
    describe(f.name, () => {
      const e = friedman(f.daten, f.zeitpunkte);
      it('n, k, chi2 (mit Bindungskorrektur), df, p, Kendalls W', () => {
        expect(e.n).toBe(f.n); expect(e.k).toBe(f.k); expect(e.df).toBe(f.df);
        nah(e.chi2, f.chi2, 'chi2'); nah(e.p, f.p, 'p'); nah(e.kendallW, f.kendall_w, 'Kendalls W');
      });
      it('Rangsummen, mittlere Ränge, Mediane', () => {
        f.rangsummen.forEach((s, i) => nah(e.rangsummen[i], s, `Rangsumme ${i + 1}`));
        f.mittlere_raenge.forEach((s, i) => nah(e.mittlereRaenge[i], s, `mittlerer Rang ${i + 1}`));
        f.mediane.forEach((s, i) => nah(e.mediane[i], s, `Median ${i + 1}`));
      });
      it('Paarvergleiche Wilcoxon gepaart (exakt, Nullen entfernt) mit Holm über alle Paare', () => {
        expect(e.paare.length).toBe(f.paare.length);
        for (const s of f.paare) {
          const z = e.paare.find(q => q.i === s.i - 1 && q.j === s.j - 1)!;
          expect(z, `Paar ${s.von} / ${s.nach}`).toBeDefined();
          expect([z.von, z.nach]).toEqual([s.von, s.nach]);
          expect([z.nTest, z.nNull]).toEqual([s.n_test, s.n_null]);
          nah(z.vPlus, s.v, `V ${s.von}/${s.nach}`); nah(z.vMinus, s.v_minus, `V- ${s.von}/${s.nach}`);
          nah(z.p, s.p, `p ${s.von}/${s.nach}`); nah(z.pHolm, s.p_holm, `p Holm ${s.von}/${s.nach}`);
        }
      });
    });
  }

  it('Holm: Paare mit verschiedenem p können denselben Holm-Wert haben (Fall b: 0,0281 und 0,0252 werden beide 0,0503), und kein Wert liegt über 1 (Fall a: t3/t4 = 1)', () => {
    const fb = E.friedman[1]!, b = friedman(fb.daten, fb.zeitpunkte), fa = E.friedman[0]!, a = friedman(fa.daten, fa.zeitpunkte);
    const gleichHolm = fb.paare.filter(s => fb.paare.some(t => t !== s && t.p_holm === s.p_holm && t.p !== s.p));
    expect(gleichHolm.length, 'Fall b enthält zwei Paare mit verschiedenem p und gleichem Holm-p').toBe(2);
    const [z1, z2] = gleichHolm.map(s => b.paare.find(q => q.i === s.i - 1 && q.j === s.j - 1)!);
    expect(z1!.pHolm).toBe(z2!.pHolm); expect(z1!.p).not.toBe(z2!.p);
    expect(Math.max(...a.paare.map(z => z.pHolm!))).toBe(1);
  });
  it('Bindungskorrektur wirkt: ohne sie wäre chi2 kleiner (Fall a hat Bindungen in 11 von 12 Personen)', () => {
    const f = E.friedman[0]!, e = friedman(f.daten, f.zeitpunkte);
    const n = f.n, k = f.k, rs = e.rangsummen;
    const ohne = 12 / (n * k * (k + 1)) * rs.reduce((s, x) => s + x * x, 0) - 3 * n * (k + 1);
    expect(ohne).toBeLessThan(e.chi2 - 0.1);
  });
  it('wirft bei weniger als 3 Zeitpunkten und bei weniger als 2 Personen', () => {
    expect(() => friedman([[1, 2], [2, 3], [3, 1]], ['a', 'b'])).toThrow();
    expect(() => friedman([[1, 2, 3]], ['a', 'b', 'c'])).toThrow();
  });
  it('alle Personen ohne jeden Unterschied zwischen den Zeitpunkten: kein Test (R gibt chi2 = NaN, p = NA; Festlegung: kein = true, chi2 und p = NaN, Paare ohne Test) und kein Absturz', () => {
    const e = friedman([[2, 2, 2], [3, 3, 3], [1, 1, 1], [4, 4, 4]], ['a', 'b', 'c']);
    expect(e.kein).toBe(true); expect(Number.isNaN(e.chi2)).toBe(true); expect(Number.isNaN(e.p)).toBe(true);
    expect(e.paare.every(z => z.p === null && z.pHolm === null && z.nTest === 0)).toBe(true);
  });
});

describe('McNemar (exakter Binomialtest) gegen exact2x2::mcnemar.exact und binom.test', () => {
  for (const f of E.mcnemar.filter(x => !x.kein_test)) {
    it(`${f.name}: a, b, c, d, p, Odds Ratio und exaktes 95-%-KI`, () => {
      const e = mcnemar(f.vorher, f.nachher);
      expect([e.n, e.a, e.b, e.c, e.d, e.nDiskordant]).toEqual([f.n, f.a, f.b, f.c, f.d, f.n_diskordant]);
      expect(e.kein).toBe(false);
      nah(e.p, f.p!, 'p'); orNah(e.oddsRatio, f.odds_ratio, 'Odds Ratio');
      orNah(e.kiUnten, f.or_unten, 'KI unten (mcnemar.exact)'); orNah(e.kiOben, f.or_oben, 'KI oben (mcnemar.exact)');
      orNah(e.kiUnten, f.or_unten_binom, 'KI unten (binom.test)'); orNah(e.kiOben, f.or_oben_binom, 'KI oben (binom.test)');
    });
  }
  it('b = c = 7: p = 1 (nicht 1,209 wie PSPP), Odds Ratio 1', () => {
    const f = E.mcnemar.find(x => x.name === 'e2_b7_c7')!, e = mcnemar(f.vorher, f.nachher);
    expect(e.p).toBe(1); nah(e.oddsRatio, 1, 'OR');
  });
  it('b = 3, c = 0: p = 0,25, Odds Ratio unendlich, KI [0,4132; unendlich]', () => {
    const f = E.mcnemar.find(x => x.name === 'e_b3_c0')!, e = mcnemar(f.vorher, f.nachher);
    nah(e.p, 0.25, 'p'); expect(e.oddsRatio).toBe(Infinity); expect(e.kiOben).toBe(Infinity); expect(e.kiUnten).toBeGreaterThan(0.41); expect(e.kiUnten).toBeLessThan(0.42);
  });
  it('b = 0, c > 0 (Gegenrichtung): Odds Ratio 0, untere Grenze 0 (Spiegelung von b = 3, c = 0)', () => {
    const f = E.mcnemar.find(x => x.name === 'e_b3_c0')!, e = mcnemar(f.nachher, f.vorher);   // vorher und nachher vertauscht
    expect([e.b, e.c]).toEqual([0, 3]); nah(e.p, 0.25, 'p'); expect(e.oddsRatio).toBe(0); expect(e.kiUnten).toBe(0);
    nah(e.kiOben, 1 / (f.or_unten_binom as number), 'KI oben = 1 / KI unten der Spiegelung');
  });
  it('keine diskordanten Paare: KEIN Test (p, Odds Ratio und KI sind null; PSPP gibt 2,000 aus)', () => {
    const f = E.mcnemar.find(x => x.name === 'f_keine_diskordanten')!, e = mcnemar(f.vorher, f.nachher);
    expect(e.kein).toBe(true); expect(e.nDiskordant).toBe(0);
    expect([e.p, e.oddsRatio, e.kiUnten, e.kiOben]).toEqual([null, null, null, null]);
    expect([e.a, e.d]).toEqual([10, 15]);
  });
  it('wirft bei verschieden langen Spalten und bei anderen Werten als 0 und 1', () => {
    expect(() => mcnemar([1, 0], [1])).toThrow();
    expect(() => mcnemar([1, 2], [1, 0])).toThrow();
  });
});

describe('Cochran-Q gegen die Formel von Hand und rstatix::cochran_qtest', () => {
  for (const f of E.cochran) {
    describe(f.name, () => {
      const e = cochranQ(f.daten, f.zeitpunkte);
      it('n, k, Q, df, p, Summen', () => {
        expect(e.n).toBe(f.n); expect(e.k).toBe(f.k); expect(e.df).toBe(f.df); expect(e.gesamt).toBe(f.gesamt);
        nah(e.q, f.q, 'Q'); nah(e.p, f.p, 'p');
        expect(e.spaltensummen).toEqual(f.spaltensummen); expect(e.zeilensummen).toEqual(f.zeilensummen);
      });
      it('Paarvergleiche McNemar exakt mit Holm über alle Paare', () => {
        expect(e.paare.length).toBe(f.paare.length);
        for (const s of f.paare) {
          const z = e.paare.find(q => q.i === s.i - 1 && q.j === s.j - 1)!;
          expect(z, `Paar ${s.von} / ${s.nach}`).toBeDefined();
          expect([z.von, z.nach, z.b, z.c]).toEqual([s.von, s.nach, s.b, s.c]);
          nah(z.p, s.p, `p ${s.von}/${s.nach}`); nah(z.pHolm, s.p_holm, `p Holm ${s.von}/${s.nach}`); orNah(z.oddsRatio, s.odds_ratio, `OR ${s.von}/${s.nach}`);
        }
      });
    });
  }
  it('Personen mit lauter Nullen oder lauter Einsen ändern Q nicht (sie tragen nichts bei)', () => {
    const f = E.cochran[0]!, e = cochranQ([...f.daten, [0, 0, 0], [1, 1, 1], [0, 0, 0]], f.zeitpunkte);
    nah(e.q, f.q, 'Q mit Zusatzzeilen'); expect(e.n).toBe(f.n + 3);
  });
  it('wirft bei Werten außer 0 und 1, bei weniger als 3 Zeitpunkten und bei weniger als 2 Personen', () => {
    expect(() => cochranQ([[0, 1, 2], [1, 0, 1]], ['a', 'b', 'c'])).toThrow();
    expect(() => cochranQ([[0, 1], [1, 0], [1, 1]], ['a', 'b'])).toThrow();
    expect(() => cochranQ([[0, 1, 1]], ['a', 'b', 'c'])).toThrow();
  });
});
