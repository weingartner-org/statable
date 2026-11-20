/**
 * Drei Tests aus der Ordnung „wie im Kurs“ (25.10.2026, Wunsch Andreas: eine/zwei Stichproben × Anteil/Varianz), die Statable vorher nicht als Auswertung hatte:
 *   anteilTest       Anteil einer Kategorie gegen einen festen Wert: exakter Binomialtest (zweiseitig wie R binom.test: Summe aller Wahrscheinlichkeiten ≤ der beobachteten),
 *                    Clopper-Pearson-Intervall, dazu der z-Test ohne Korrektur (TI-84 1-PropZTest, R prop.test(correct = FALSE)).
 *   eineVarianz      Standardabweichung gegen einen festen Wert: χ² = (n − 1) s² / σ₀², zweiseitig kleinerer Schwanz verdoppelt (wie in Lehrbüchern), Intervall für σ.
 *   zweiVarianzen    zwei Standardabweichungen: F = s₁² / s₂² (Reihenfolge der Gruppen wie im t-Test), zweiseitig wie R var.test, Intervall für das Verhältnis der Varianzen.
 * Sollwerte: scripts/kurstests-erwartet.R (R 4.6.1, zweite Quelle DescTools) → lib/testdaten/kurstests-erwartet.json, Test lib/kurstests.test.ts.
 */
import { L } from './sitzung.svelte';
import { zitat as anfuehrung, proz } from '../i18n/profil';
import { komma, pWert, kurz, type Saetze, type Verteilung } from './ergebnis';
import { dbinomRaw, betai, normalOben } from './verteilung';
import { chi2Verteilung, chi2Oben, chi2Quantil, fVerteilung, fOben, fQuantil } from './power';
import { s } from './sitzung.svelte';

const T = L;
const q = (t: string) => anfuehrung(kurz(t));
const pr = (p: number, st = 1) => proz(komma(100 * p, st));
/** Vergleichswert, wie eingegeben: ohne überflüssige Nullen (0,5 statt 0,500), höchstens drei Stellen. */
const zw = (v: number) => Number.isInteger(v) ? komma(v, 0) : komma(v, 3).replace(/0+$/, '');

/* ------------------------------------------------------------------ Anteil */

export interface AnteilTest { x: number; n: number; p0: number; anteil: number; pExakt: number; lo: number; hi: number; z: number; pZ: number; naeherungOk: boolean }

/** Quantil der Beta-Verteilung durch Halbieren (für Clopper-Pearson; betai ist auf 1e-15 genau). */
function qbeta(p: number, a: number, b: number): number {
  let lo = 0, hi = 1;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (betai(a, b, m) < p) lo = m; else hi = m; if (hi - lo < 1e-16) break; }
  return (lo + hi) / 2;
}

/** Exakter zweiseitiger Binomialtest wie R `binom.test`: alle Ausgänge, die nicht wahrscheinlicher sind als der beobachtete (relative Toleranz 1e-7). */
export function binomZweiseitig(x: number, n: number, p0: number): number {
  if (p0 === 0) return x === 0 ? 1 : 0;
  if (p0 === 1) return x === n ? 1 : 0;
  if (x === n * p0) return 1;
  const d = dbinomRaw(x, n, p0, 1 - p0) * (1 + 1e-7);
  let summe = 0;
  for (let i = 0; i <= n; i++) { const di = dbinomRaw(i, n, p0, 1 - p0); if (di <= d) summe += di; }
  return Math.min(1, summe);
}

/** `null`, wenn er sich nicht rechnen lässt (keine Fälle, p₀ nicht zwischen 0 und 1). */
export function anteilTest(x: number, n: number, p0: number): AnteilTest | null {
  if (!(n >= 1) || !Number.isInteger(x) || x < 0 || x > n || !(p0 > 0 && p0 < 1)) return null;
  const lo = x === 0 ? 0 : qbeta(0.025, x, n - x + 1), hi = x === n ? 1 : qbeta(0.975, x + 1, n - x);
  const z = (x / n - p0) / Math.sqrt(p0 * (1 - p0) / n);
  return { x, n, p0, anteil: x / n, pExakt: binomZweiseitig(x, n, p0), lo, hi, z, pZ: Math.min(1, 2 * normalOben(Math.abs(z))), naeherungOk: n * p0 >= 10 && n * (1 - p0) >= 10 };
}

export function anteilSatz(r: AnteilTest, spalte: string, kategorie: string): string {
  const k = q(kategorie), sp = q(spalte), a = pr(r.anteil), w = pr(r.p0, Number.isInteger(Math.round(r.p0 * 1e6) / 1e4) ? 0 : 1);
  // Ganze Sätze je Richtung: ein eingesetztes „über/unter“ lässt sich nicht in jede Sprache übersetzen (es: „por encima de“).
  const grund = r.anteil > r.p0
    ? T(`In ${sp} trifft ${k} auf ${r.x} von ${r.n} zu (${a}); das liegt über dem Vergleichswert ${w}.`, `In ${sp}, ${k} applies to ${r.x} of ${r.n} (${a}); this is above the comparison value ${w}.`)
    : r.anteil < r.p0
      ? T(`In ${sp} trifft ${k} auf ${r.x} von ${r.n} zu (${a}); das liegt unter dem Vergleichswert ${w}.`, `In ${sp}, ${k} applies to ${r.x} of ${r.n} (${a}); this is below the comparison value ${w}.`)
      : T(`In ${sp} trifft ${k} auf ${r.x} von ${r.n} zu (${a}); das ist genau der Vergleichswert ${w}.`, `In ${sp}, ${k} applies to ${r.x} of ${r.n} (${a}); this is exactly the comparison value ${w}.`);
  return r.pExakt < 0.05
    ? `${grund} ${T(`Ein so großer Abstand wäre selten, wenn der wahre Anteil ${w} wäre (exakter Binomialtest, p ${pWert(r.pExakt)}).`, `A distance this large would be rare if the true proportion were ${w} (exact binomial test, p ${pWert(r.pExakt)}).`)}`
    : `${grund} ${T(`Ein solcher Abstand kommt auch dann nicht selten vor, wenn der wahre Anteil ${w} wäre (exakter Binomialtest, p ${pWert(r.pExakt)}); die Daten belegen keine Abweichung - das heißt nicht, dass es keine gibt.`, `A distance like this is not rare even if the true proportion were ${w} (exact binomial test, p ${pWert(r.pExakt)}); the data show no clear deviation - that does not mean there is none.`)}`;
}

/* ------------------------------------------------------------------ eine Varianz */

export interface EineVarianz { n: number; sd: number; sigma0: number; chi2: number; df: number; p: number; sdLo: number; sdHi: number }

export function eineVarianz(n: number, sd: number, sigma0: number): EineVarianz | null {
  if (!(n >= 2) || !(sd > 0) || !(sigma0 > 0) || !Number.isFinite(sd) || !Number.isFinite(sigma0)) return null;
  const df = n - 1, v = df * sd * sd, chi2 = v / (sigma0 * sigma0);
  const p = Math.min(1, 2 * Math.min(chi2Verteilung(chi2, df), chi2Oben(chi2, df)));
  return { n, sd, sigma0, chi2, df, p, sdLo: Math.sqrt(v / chi2Quantil(0.975, df)), sdHi: Math.sqrt(v / chi2Quantil(0.025, df)) };
}

export function eineVarianzSatz(r: EineVarianz, spalte: string): string {
  const sp = q(spalte), w = zw(r.sigma0);
  const grund = r.sd > r.sigma0
    ? T(`Die Standardabweichung von ${sp} (${komma(r.sd, 2)}) liegt über dem Vergleichswert ${w}.`, `The standard deviation of ${sp} (${komma(r.sd, 2)}) is above the comparison value ${w}.`)
    : T(`Die Standardabweichung von ${sp} (${komma(r.sd, 2)}) liegt unter dem Vergleichswert ${w}.`, `The standard deviation of ${sp} (${komma(r.sd, 2)}) is below the comparison value ${w}.`);
  const kennung = `χ²(${r.df}) = ${komma(r.chi2, 2)}, p ${pWert(r.p)}`;
  return r.p < 0.05
    ? `${grund} ${T(`Ein so großer Abstand wäre selten, wenn die wahre Standardabweichung ${w} wäre (${kennung}).`, `A distance this large would be rare if the true standard deviation were ${w} (${kennung}).`)}`
    : `${grund} ${T(`Ein solcher Abstand kommt auch dann nicht selten vor, wenn die wahre Standardabweichung ${w} wäre (${kennung}); die Daten belegen keine Abweichung - das heißt nicht, dass es keine gibt.`, `A distance like this is not rare even if the true standard deviation were ${w} (${kennung}); the data show no clear deviation - that does not mean there is none.`)}`;
}

/* ------------------------------------------------------------------ zwei Varianzen */

export interface ZweiVarianzen { n1: number; sd1: number; n2: number; sd2: number; f: number; d1: number; d2: number; p: number; lo: number; hi: number }

export function zweiVarianzen(n1: number, sd1: number, n2: number, sd2: number): ZweiVarianzen | null {
  if (!(n1 >= 2) || !(n2 >= 2) || !(sd1 > 0) || !(sd2 > 0)) return null;
  const d1 = n1 - 1, d2 = n2 - 1, f = (sd1 * sd1) / (sd2 * sd2);
  const p = Math.min(1, 2 * Math.min(fVerteilung(f, d1, d2), fOben(f, d1, d2)));
  return { n1, sd1, n2, sd2, f, d1, d2, p, lo: f / fQuantil(0.975, d1, d2), hi: f / fQuantil(0.025, d1, d2) };
}

export function zweiVarianzenSatz(r: ZweiVarianzen, a: string, b: string): string {
  const ga = q(a), gb = q(b), groesser = r.sd1 >= r.sd2;
  const grund = groesser
    ? T(`Die Standardabweichung ist bei ${ga} (${komma(r.sd1, 2)}) größer als bei ${gb} (${komma(r.sd2, 2)}).`, `The standard deviation is larger for ${ga} (${komma(r.sd1, 2)}) than for ${gb} (${komma(r.sd2, 2)}).`)
    : T(`Die Standardabweichung ist bei ${ga} (${komma(r.sd1, 2)}) kleiner als bei ${gb} (${komma(r.sd2, 2)}).`, `The standard deviation is smaller for ${ga} (${komma(r.sd1, 2)}) than for ${gb} (${komma(r.sd2, 2)}).`);
  const kennung = `F(${r.d1}, ${r.d2}) = ${komma(r.f, 2)}, p ${pWert(r.p)}`;
  return r.p < 0.05
    ? `${grund} ${T(`Ein so großer Unterschied wäre selten, wenn beide Gruppen in Wahrheit gleich streuten (${kennung}).`, `A difference this large would be rare if both groups truly had the same spread (${kennung}).`)}`
    : `${grund} ${T(`Ein solcher Unterschied kommt auch dann nicht selten vor, wenn beide Gruppen in Wahrheit gleich streuen (${kennung}); die Daten belegen keinen Unterschied - das heißt nicht, dass es keinen gibt.`, `A difference like this is not rare even if both groups truly have the same spread (${kennung}); the data show no clear difference - that does not mean there is none.`)}`;
}

/* ------------------------------------------------------------------ Excel, TI-84, R */

export interface KursSchritte { excel: string[]; ti: string[]; r: string[]; soll: string }
const deutsch = () => s.einst.sprache === 'de';
const xl = (en: string, de: string, ...arg: string[]) => `=${deutsch() ? de : en}(${arg.join(deutsch() ? '; ' : ', ')})`;
/** Zahl für Formeln: im deutschen Excel mit Komma, sonst mit Punkt, ohne Tausendertrenner. */
const fz = (v: number, st = 4) => { const t = String(Number(v.toFixed(st))); return deutsch() ? t.replace('.', ',') : t; };
/** Zahl für den TI-84: immer Punkt. */
const tz = (v: number, st = 4) => String(Number(v.toFixed(st)));

export function anteilSchritte(r: AnteilTest): KursSchritte {
  const z = fz(r.z, 4), w = deutsch() ? 'WAHR' : 'TRUE', wurzel = deutsch() ? 'WURZEL' : 'SQRT', trenn = deutsch() ? '; ' : ', ';
  const p0 = fz(r.p0), unten = r.anteil < r.p0;
  // Einseitig in Richtung der Abweichung: P(X ≤ x) unter dem Vergleichswert, sonst P(X ≥ x) = 1 − P(X ≤ x − 1).
  const exXl = unten ? xl('BINOM.DIST', 'BINOM.VERT', String(r.x), String(r.n), p0, w) : `=1-${xl('BINOM.DIST', 'BINOM.VERT', String(r.x - 1), String(r.n), p0, w).slice(1)}`;
  const exTi = unten ? `binomcdf(${r.n}, ${tz(r.p0)}, ${r.x})` : `1 − binomcdf(${r.n}, ${tz(r.p0)}, ${r.x - 1})`;
  const ereignis = unten ? `P(X ≤ ${r.x})` : `P(X ≥ ${r.x})`;
  return {
    excel: [
      L(`z-Wert: =(${r.x}/${r.n}-${p0})/${wurzel}(${p0}*(1-${p0})/${r.n})`, `z value: =(${r.x}/${r.n}-${p0})/${wurzel}(${p0}*(1-${p0})/${r.n})`),
      L(`p-Wert des z-Tests (zweiseitig): =2*(1-${deutsch() ? 'NORM.S.VERT' : 'NORM.S.DIST'}(ABS(${z})${trenn}${w}))`, `p value of the z test (two-sided): =2*(1-${deutsch() ? 'NORM.S.VERT' : 'NORM.S.DIST'}(ABS(${z})${trenn}${w}))`),
      L(`Exakt, einseitig: ${exXl} gibt ${ereignis}. Den zweiseitigen exakten Wert rechnet Excel nicht in einer Formel.`, `Exact, one-sided: ${exXl} gives ${ereignis}. Excel has no single formula for the two-sided exact value.`)
    ],
    ti: [
      L(`STAT ▸ TESTS ▸ 5:1-PropZTest …, p0: ${tz(r.p0)}, x: ${r.x}, n: ${r.n}, prop ≠p0, Calculate.`, `STAT ▸ TESTS ▸ 5:1-PropZTest …, p0: ${tz(r.p0)}, x: ${r.x}, n: ${r.n}, prop ≠p0, Calculate.`),
      L(`Exakt, einseitig: 2nd ▸ DISTR ▸ ${exTi} gibt ${ereignis}.`, `Exact, one-sided: 2nd ▸ DISTR ▸ ${exTi} gives ${ereignis}.`)
    ],
    r: [`binom.test(${r.x}, ${r.n}, p = ${tz(r.p0)})`, `prop.test(${r.x}, ${r.n}, p = ${tz(r.p0)}, correct = FALSE)`],
    soll: L(`z-Test: z = ${komma(r.z, 2)}, p ${pWert(r.pZ)}. Exakter Binomialtest: p ${pWert(r.pExakt)}.`, `z test: z = ${komma(r.z, 2)}, p ${pWert(r.pZ)}. Exact binomial test: p ${pWert(r.pExakt)}.`)
  };
}

export function eineVarianzSchritte(r: EineVarianz): KursSchritte {
  const c = fz(r.chi2, 4), w = deutsch() ? 'WAHR' : 'TRUE';
  return {
    excel: [
      L(`Prüfgröße: =(${r.n}-1)*${xl('VAR.S', 'VAR.S', 'A').slice(1)}/${fz(r.sigma0)}^2 (Bereich A mit den Werten)`, `Test statistic: =(${r.n}-1)*${xl('VAR.S', 'VAR.S', 'A').slice(1)}/${fz(r.sigma0)}^2 (range A with the values)`),
      L(`p-Wert (zweiseitig): =2*${xl('MIN', 'MIN', xl('CHISQ.DIST', 'CHIQU.VERT', c, String(r.df), w).slice(1), xl('CHISQ.DIST.RT', 'CHIQU.VERT.RE', c, String(r.df)).slice(1)).slice(1)}`, `p value (two-sided): =2*${xl('MIN', 'MIN', xl('CHISQ.DIST', 'CHIQU.VERT', c, String(r.df), w).slice(1), xl('CHISQ.DIST.RT', 'CHIQU.VERT.RE', c, String(r.df)).slice(1)).slice(1)}`)
    ],
    ti: [
      L(`Der TI-84 hat keinen fertigen Test dafür. Prüfgröße von Hand: (${r.n} − 1) · ${tz(r.sd, 4)}² / ${tz(r.sigma0)}² = ${tz(r.chi2, 4)}.`, `The TI-84 has no ready-made test for this. Test statistic by hand: (${r.n} − 1) · ${tz(r.sd, 4)}² / ${tz(r.sigma0)}² = ${tz(r.chi2, 4)}.`),
      L(`2nd ▸ DISTR ▸ χ²cdf(0, ${tz(r.chi2, 4)}, ${r.df}) und χ²cdf(${tz(r.chi2, 4)}, 1E99, ${r.df}); den kleineren Wert verdoppeln.`, `2nd ▸ DISTR ▸ χ²cdf(0, ${tz(r.chi2, 4)}, ${r.df}) and χ²cdf(${tz(r.chi2, 4)}, 1E99, ${r.df}); double the smaller value.`)
    ],
    r: [`x <- daten$spalte; chi <- (length(x) - 1) * var(x) / ${tz(r.sigma0)}^2`, `2 * min(pchisq(chi, ${r.df}), pchisq(chi, ${r.df}, lower.tail = FALSE))`],
    soll: L(`χ²(${r.df}) = ${komma(r.chi2, 2)}, p ${pWert(r.p)}.`, `χ²(${r.df}) = ${komma(r.chi2, 2)}, p ${pWert(r.p)}.`)
  };
}

export function zweiVarianzenSchritte(r: ZweiVarianzen): KursSchritte {
  return {
    excel: [
      L(`p-Wert (zweiseitig): ${xl('F.TEST', 'F.TEST', 'A', 'B')} (Bereich A erste Gruppe, B zweite Gruppe).`, `p value (two-sided): ${xl('F.TEST', 'F.TEST', 'A', 'B')} (range A first group, B second group).`),
      L(`Prüfgröße: =${xl('VAR.S', 'VAR.S', 'A').slice(1)}/${xl('VAR.S', 'VAR.S', 'B').slice(1)}. Mit Tabelle: Daten ▸ Datenanalyse ▸ „Zwei-Stichproben F-Test“ (einseitig; den p-Wert verdoppeln).`, `Test statistic: =${xl('VAR.S', 'VAR.S', 'A').slice(1)}/${xl('VAR.S', 'VAR.S', 'B').slice(1)}. With a table: Data ▸ Data Analysis ▸ "F-Test Two-Sample for Variances" (one-sided; double the p value).`)
    ],
    ti: [
      L(`STAT ▸ TESTS ▸ E:2-SampFTest … (TI-83 Plus: D:2-SampFTest), Inpt: Stats, Sx1 = ${tz(r.sd1, 4)}, n1 = ${r.n1}, Sx2 = ${tz(r.sd2, 4)}, n2 = ${r.n2}, σ1: ≠σ2, Calculate (mit Listen: Inpt: Data, List1 = L1, List2 = L2).`, `STAT ▸ TESTS ▸ E:2-SampFTest … (TI-83 Plus: D:2-SampFTest), Inpt: Stats, Sx1 = ${tz(r.sd1, 4)}, n1 = ${r.n1}, Sx2 = ${tz(r.sd2, 4)}, n2 = ${r.n2}, σ1: ≠σ2, Calculate (with lists: Inpt: Data, List1 = L1, List2 = L2).`)
    ],
    r: ['var.test(wert ~ gruppe, data = daten)'],
    soll: L(`F(${r.d1}, ${r.d2}) = ${komma(r.f, 2)}, p ${pWert(r.p)}.`, `F(${r.d1}, ${r.d2}) = ${komma(r.f, 2)}, p ${pWert(r.p)}.`)
  };
}

/* ------------------------------------------------------------------ Bericht */

/** Hängt die Sätze der festgelegten Kurs-Tests (Anteil, Streuung) an die Sätze der Verteilung (Blatt-Kopf, Bericht, Word, PDF) - wie mitEinstichprobe. */
export function mitKursTests(st: Saetze, e: Verteilung): Saetze {
  const saetze: string[] = [], apa: string[] = [];
  for (const [name, f] of Object.entries(e.anteilTests ?? {})) {
    const h = e.gruppen.find(g => g.name === name), w = h?.werte.find(x => x.name === f.kategorie), r = h && w ? anteilTest(w.anzahl, h.n, f.p0) : null;
    if (!r) continue;
    saetze.push(anteilSatz(r, name, f.kategorie));
    apa.push(T(`${kurz(f.kategorie, 30)}: ${r.x} von ${r.n} (${pr(r.anteil)}), exakter Binomialtest p ${pWert(r.pExakt)} (Vergleichswert ${pr(r.p0, Number.isInteger(Math.round(r.p0 * 1e6) / 1e4) ? 0 : 1)})`, `${kurz(f.kategorie, 30)}: ${r.x} of ${r.n} (${pr(r.anteil)}), exact binomial test p ${pWert(r.pExakt)} (comparison value ${pr(r.p0, Number.isInteger(Math.round(r.p0 * 1e6) / 1e4) ? 0 : 1)})`));
  }
  for (const [name, s0] of Object.entries(e.sigmaWerte ?? {})) {
    const z = e.zahlen.find(x => x.name === name), r = z ? eineVarianz(z.n, z.sd, s0) : null;
    if (!r) continue;
    saetze.push(eineVarianzSatz(r, name));
    apa.push(T(`${kurz(name, 30)}: χ²(${r.df}) = ${komma(r.chi2, 2)}, p ${pWert(r.p)} (Vergleichswert σ = ${zw(r.sigma0)})`, `${kurz(name, 30)}: χ²(${r.df}) = ${komma(r.chi2, 2)}, p ${pWert(r.p)} (comparison value σ = ${zw(r.sigma0)})`));
  }
  if (!saetze.length) return st;
  return { ...st, zusatz: `${st.zusatz} ${saetze.join(' ')}`, apa: [st.apa, ...apa].filter(Boolean).join('; ') };
}
