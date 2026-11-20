/**
 * Friedman-Test (drei und mehr Messungen derselben Personen, Rangtest) mit Kendalls W und Paarvergleichen.
 * Fachblatt Welle 2, Paket C (G5). Wie R `friedman.test` und PSPP `NPAR TESTS /FRIEDMAN` (Bindungskorrektur innerhalb der Personen),
 * Kendalls W = χ² / (n (k − 1)) wie `rstatix::friedman_effsize` und PSPP `/KENDALL`. Sollwerte: scripts/friedman-mcnemar-cochran-erwartet.R, Tests: friedman-mcnemar-cochran.test.ts.
 * Paarvergleiche: Wilcoxon gepaart (nachher − vorher = Zeitpunkt j minus i) nach Fachblatt G9/G10 aus `rangtests.ts` (exakt auch bei Bindungen, Nullen vor dem Ranken entfernt),
 * Holm über alle Paare mit p. Werte werden vor dem Ranken auf 12 gültige Stellen gerundet (Kommazahlen, wie rangtests.ts).
 */
import { chiQuadratP } from './verteilung';
import { holm, median, rangDaten, rangVorschlag, wilcoxon, type RangVorschlag } from './rangtests';
import type { StufenGrund } from './stufen';

export interface FriedmanPaar {
  i: number; j: number; von: string; nach: string;
  /** Rangsumme der positiven und der negativen Veränderungen (nachher − vorher), Nullen entfernt. */
  vPlus: number; vMinus: number;
  /** Paare im Test (ohne Veränderung 0) und Paare ohne Veränderung. */
  nTest: number; nNull: number;
  /** `null`: weniger als 2 Paare mit Unterschied, kein Test. */
  p: number | null; pHolm: number | null;
}
export interface Friedman {
  art: 'friedman';
  n: number; k: number;
  /** Jede Person hat in allen Zeitpunkten denselben Wert: kein Test (chi2, p und Kendalls W sind NaN, die Paare haben keinen Test). */
  kein: boolean;
  chi2: number; df: number; p: number; kendallW: number;
  rangsummen: number[]; mittlereRaenge: number[]; mediane: number[];
  paare: FriedmanPaar[];
  zeitpunkte: string[];
  /** Wie bei den anderen Rangtests: spricht etwas für den Rangtest (Schiefe, Ausreißer, gestufte Messgröße)? Grundlage sind die Werte je Zeitpunkt. */
  vorschlag: RangVorschlag;
}

const rund = (v: number) => Number(v.toPrecision(12));

export function friedman(daten: number[][], zeitpunkte: string[], stufen: StufenGrund | null = null): Friedman {
  const n = daten.length, k = zeitpunkte.length;
  if (k < 3) throw new Error('Der Friedman-Test braucht mindestens drei Zeitpunkte');
  if (n < 2) throw new Error('Der Friedman-Test braucht mindestens zwei Personen');
  const w = daten.map(z => z.map(rund));
  const rangsummen = new Array<number>(k).fill(0);
  let bindung = 0;
  for (const z of w) { const r = rangDaten(z); r.rang.forEach((x, j) => { rangsummen[j]! += x; }); bindung += r.bindung; }
  // Nenner wie R: n k (k + 1) − Σ(t³ − t) / (k − 1); mit ganzen Zahlen auf 0 geprüft (alle Personen ohne jeden Unterschied)
  const kein = n * k * (k + 1) * (k - 1) - bindung === 0;
  const mitte = n * (k + 1) / 2;
  const chi2 = kein ? NaN : 12 * rangsummen.reduce((a, r) => a + (r - mitte) ** 2, 0) / (n * k * (k + 1) - bindung / (k - 1)), df = k - 1;
  const paare: FriedmanPaar[] = [];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const d = w.map(z => rund(z[j]! - z[i]!)), nz = d.filter(x => x !== 0), r = rangDaten(nz.map(Math.abs));
    let vPlus = 0, vMinus = 0; nz.forEach((x, q) => { if (x > 0) vPlus += r.rang[q]!; else vMinus += r.rang[q]!; });
    const t = kein ? null : wilcoxon(zeitpunkte[i]!, zeitpunkte[j]!, w.map(z => [z[i]!, z[j]!] as [number, number]));
    paare.push({ i, j, von: zeitpunkte[i]!, nach: zeitpunkte[j]!, vPlus, vMinus, nTest: nz.length, nNull: n - nz.length, p: t ? t.p : null, pHolm: null });
  }
  const mit = paare.filter(q => q.p !== null), ph = holm(mit.map(q => q.p!));
  mit.forEach((q, a) => { q.pHolm = ph[a]!; });
  return {
    art: 'friedman', n, k, kein, chi2, df, p: kein ? NaN : chiQuadratP(chi2, df), kendallW: kein ? NaN : chi2 / (n * (k - 1)),
    rangsummen, mittlereRaenge: rangsummen.map(r => r / n), mediane: zeitpunkte.map((_, j) => median(w.map(z => z[j]!))), paare, zeitpunkte,
    vorschlag: rangVorschlag(zeitpunkte.map((_, j) => w.map(z => z[j]!)), stufen)
  };
}
