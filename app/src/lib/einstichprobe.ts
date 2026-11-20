/**
 * t-Test bei einer Stichprobe in der Karte „Wie verteilt sich etwas?“ (Nachttest 24.10.2026; SPSS: Analysieren ▸ Mittelwerte vergleichen ▸ T-Test bei einer Stichprobe).
 * Weicht der Mittelwert einer Zahlenspalte von einem vorab festgelegten Wert ab? Gerechnet aus n, Mittelwert und SD der Kennzahlen (dieselben Zahlen wie PSPP FREQUENCIES):
 * t = (M − μ₀) / (SD / √n), df = n − 1, 95 %-KI der Differenz M − μ₀ ± t(0,975; df) · SE, Cohens d = (M − μ₀) / SD mit Intervall über die nichtzentrale t-Verteilung (wie SPSS 27+).
 * Gegen SPSS 32 geprüft (nacht.sav, prae gegen 50: t = 1,762, df 149, p = ,080, Differenz 1,469 [−0,179; 3,116], d = 0,144 [−0,017; 0,304]; lib/einstichprobe.test.ts).
 */
import { L } from './sitzung.svelte';
import { zitat as anfuehrung } from '../i18n/profil';
import { komma, pWert, kurz, type Kennzahl, type Saetze, type Verteilung } from './ergebnis';
import { tSchwaenze, tQuantil, dzBereich } from './verteilung';

const T = L;
const q = (t: string) => anfuehrung(kurz(t));

export interface Einstichprobe { name: string; mu0: number; n: number; m: number; sd: number; diff: number; se: number; t: number; df: number; p: number; lo: number; hi: number; d: number; dLo: number; dHi: number }

/** Der Test für eine Zahlenspalte; `null`, wenn er sich nicht rechnen lässt (weniger als 2 Werte oder keine Streuung). */
export function einstichprobe(z: Pick<Kennzahl, 'name' | 'n' | 'm' | 'sd'>, mu0: number): Einstichprobe | null {
  if (!(z.n >= 2) || !(z.sd > 0) || !Number.isFinite(mu0) || !Number.isFinite(z.m)) return null;
  const df = z.n - 1, se = z.sd / Math.sqrt(z.n), diff = z.m - mu0, t = diff / se;
  const s = tSchwaenze(Math.abs(t), df), p = Math.min(1, 2 * s.oben), tk = tQuantil(0.975, df);
  const d = diff / z.sd, [dLo, dHi] = dzBereich(d, z.n);
  return { name: z.name, mu0, n: z.n, m: z.m, sd: z.sd, diff, se, t, df, p, lo: diff - tk * se, hi: diff + tk * se, d, dLo, dHi };
}

/** Die Tests eines Blatts in der Reihenfolge der Zahlenspalten (nur mit festgelegtem Vergleichswert). */
export function einstichproben(e: Verteilung): Einstichprobe[] {
  return e.zahlen.flatMap(z => { const w = e.testwerte?.[z.name]; const r = w === undefined ? null : einstichprobe(z, w); return r ? [r] : []; });
}

const zw = (v: number) => komma(v, Number.isInteger(v) ? 0 : 2);

/** Der Satz zu einem Test. */
export function einstichprobeSatz(r: Einstichprobe): string {
  const name = q(r.name), m = komma(r.m, 2), w = zw(r.mu0), ab = komma(Math.abs(r.diff), 2);
  if (r.p < 0.05) return r.diff > 0
    ? T(`Der Mittelwert von ${name} (${m}) liegt um ${ab} über dem Vergleichswert ${w}. Ein so großer Abstand wäre selten, wenn der wahre Mittelwert ${w} wäre (p ${pWert(r.p)}).`, `The mean of ${name} (${m}) lies ${ab} above the comparison value ${w}. A distance this large would be rare if the true mean were ${w} (p ${pWert(r.p)}).`)
    : T(`Der Mittelwert von ${name} (${m}) liegt um ${ab} unter dem Vergleichswert ${w}. Ein so großer Abstand wäre selten, wenn der wahre Mittelwert ${w} wäre (p ${pWert(r.p)}).`, `The mean of ${name} (${m}) lies ${ab} below the comparison value ${w}. A distance this large would be rare if the true mean were ${w} (p ${pWert(r.p)}).`);
  return r.diff >= 0
    ? T(`Der Mittelwert von ${name} (${m}) liegt um ${ab} über dem Vergleichswert ${w}. Ein so großer Abstand kommt auch dann nicht selten vor, wenn der wahre Mittelwert ${w} wäre (p ${pWert(r.p)}); die Daten belegen keine Abweichung - das heißt nicht, dass es keine gibt.`, `The mean of ${name} (${m}) lies ${ab} above the comparison value ${w}. A distance this large is not rare even if the true mean were ${w} (p ${pWert(r.p)}); the data show no clear deviation - that does not mean there is none.`)
    : T(`Der Mittelwert von ${name} (${m}) liegt um ${ab} unter dem Vergleichswert ${w}. Ein so großer Abstand kommt auch dann nicht selten vor, wenn der wahre Mittelwert ${w} wäre (p ${pWert(r.p)}); die Daten belegen keine Abweichung - das heißt nicht, dass es keine gibt.`, `The mean of ${name} (${m}) lies ${ab} below the comparison value ${w}. A distance this large is not rare even if the true mean were ${w} (p ${pWert(r.p)}); the data show no clear deviation - that does not mean there is none.`);
}

/** Die Zeile für die Arbeit: t(149) = 1,76, p = ,080, d = 0,14, 95 %-KI [−0,02; 0,30] (Vergleichswert 50). */
export function einstichprobeApa(r: Einstichprobe): string {
  return T(`t(${r.df}) = ${komma(r.t, 2)}, p ${pWert(r.p)}, d = ${komma(r.d, 2)}, 95 %-KI [${komma(r.dLo, 2)}; ${komma(r.dHi, 2)}] (Vergleichswert ${zw(r.mu0)})`, `t(${r.df}) = ${komma(r.t, 2)}, p ${pWert(r.p)}, d = ${komma(r.d, 2)}, 95% CI [${komma(r.dLo, 2)}; ${komma(r.dHi, 2)}] (comparison value ${zw(r.mu0)})`);
}

/** Hängt Satz und APA-Angabe der Tests an die Sätze der Verteilung (Blatt, Bericht, Word, PDF). */
export function mitEinstichprobe(st: Saetze, e: Verteilung): Saetze {
  const rs = einstichproben(e);
  if (!rs.length) return st;
  const mehrere = rs.length > 1;
  return {
    ...st, zusatz: `${st.zusatz} ${rs.map(einstichprobeSatz).join(' ')}`,
    apa: [st.apa, ...rs.map(r => `${mehrere ? `${kurz(r.name, 30)}: ` : ''}${einstichprobeApa(r)}`)].filter(Boolean).join('; '),
    marken: [...st.marken, { text: T(`Vergleich mit ${zw(rs[0]!.mu0)}: p ${pWert(rs[0]!.p)}`, `Comparison with ${zw(rs[0]!.mu0)}: p ${pWert(rs[0]!.p)}`), erklaer: 'p-wert', hinweis: false }]
  };
}
