/**
 * Vergleiche aus Kennzahlen (S-K K4, 23.10.2026): die Rechnungen des TI-84 im Menü „Stats“ und der Taschenrechner-Aufgaben, ohne Rohdaten. Reine Rechnung.
 *   zweiMittel: zwei unabhängige Gruppen (x̄, s, n je Gruppe): klassischer t-Test (gepoolt, df = n₁ + n₂ − 2) und Welch (Welch-Satterthwaite), jeweils t, df, p (zweiseitig), 95-%-Bereich der Differenz; Cohens d, Hedges g.
 *   gepaart: Mittel und Standardabweichung der Unterschiede (d̄, s_d, n): t, df = n − 1, p, Bereich, d_z.
 *   einfaktor: Gruppen (x̄, s, n): Quadratsummen, F, df, p, η² (klassisch, gleiche Streuung).
 *   korrelation: r und n: t = r√((n − 2)/(1 − r²)), p, Bereich über Fisher-z.
 *   tabelle: Häufigkeitstabelle: χ², df, p, Cramérs V, erwartete Anzahlen.
 * Sollwerte: R (`t.test`-Formeln, `pt`, `pf`, `pchisq`), siehe kennzahlenvergleich.test.ts.
 */
import { tQuantil, tSchwaenze, chiQuadratP, dBereich, dzBereich } from './verteilung';
import { fOben } from './power';
import { hedgesJ } from './ergebnis';

export interface GruppeKz { m: number; s: number; n: number }
export interface TErgebnis { t: number; df: number; p: number; diff: number; se: number; lo: number; hi: number }
export interface ZweiMittelErgebnis { klassisch: TErgebnis; welch: TErgebnis; sp: number; d: number; dLo: number; dHi: number; g: number; gLo: number; gHi: number }
export type VergleichFehler = { fehler: 'n' | 's' | 'zahl' | 'gruppen' | 'tabelle' | 'r' };

const p2 = (t: number, df: number) => 2 * tSchwaenze(Math.abs(t), df).oben;
const ok = (...v: number[]) => v.every(Number.isFinite);

export function zweiMittel(a: GruppeKz, b: GruppeKz, niveau = 0.95): ZweiMittelErgebnis | VergleichFehler {
  if (!ok(a.m, a.s, a.n, b.m, b.s, b.n)) return { fehler: 'zahl' };
  if (!(a.n >= 2 && b.n >= 2) || !Number.isInteger(a.n) || !Number.isInteger(b.n)) return { fehler: 'n' };
  if (!(a.s >= 0 && b.s >= 0) || !(a.s > 0 || b.s > 0)) return { fehler: 's' };
  const diff = a.m - b.m, dfK = a.n + b.n - 2, sp = Math.sqrt(((a.n - 1) * a.s ** 2 + (b.n - 1) * b.s ** 2) / dfK);
  const seK = sp * Math.sqrt(1 / a.n + 1 / b.n), qK = tQuantil(1 - (1 - niveau) / 2, dfK);
  const va = a.s ** 2 / a.n, vb = b.s ** 2 / b.n, seW = Math.sqrt(va + vb), dfW = (va + vb) ** 2 / (va ** 2 / (a.n - 1) + vb ** 2 / (b.n - 1)), qW = tQuantil(1 - (1 - niveau) / 2, dfW);
  const d = diff / sp, [dLo, dHi] = dBereich(d, a.n, b.n), J = hedgesJ(dfK);
  return {
    klassisch: { t: diff / seK, df: dfK, p: p2(diff / seK, dfK), diff, se: seK, lo: diff - qK * seK, hi: diff + qK * seK },
    welch: { t: diff / seW, df: dfW, p: p2(diff / seW, dfW), diff, se: seW, lo: diff - qW * seW, hi: diff + qW * seW },
    sp, d, dLo, dHi, g: d * J, gLo: dLo * J, gHi: dHi * J
  };
}

export interface GepaartErgebnis extends TErgebnis { dz: number; dzLo: number; dzHi: number }
export function gepaart(md: number, sd: number, n: number, niveau = 0.95): GepaartErgebnis | VergleichFehler {
  if (!ok(md, sd, n)) return { fehler: 'zahl' };
  if (!(n >= 2) || !Number.isInteger(n)) return { fehler: 'n' };
  if (!(sd > 0)) return { fehler: 's' };
  const df = n - 1, se = sd / Math.sqrt(n), t = md / se, q = tQuantil(1 - (1 - niveau) / 2, df), dz = md / sd, [dzLo, dzHi] = dzBereich(dz, n);
  return { t, df, p: p2(t, df), diff: md, se, lo: md - q * se, hi: md + q * se, dz, dzLo, dzHi };
}

export interface EinfaktorErgebnis { ssZwischen: number; ssInnerhalb: number; dfZwischen: number; dfInnerhalb: number; msZwischen: number; msInnerhalb: number; f: number; p: number; eta2: number; gesamtMittel: number; n: number }
export function einfaktor(gruppen: GruppeKz[]): EinfaktorErgebnis | VergleichFehler {
  if (gruppen.length < 2) return { fehler: 'gruppen' };
  if (gruppen.some(g => !ok(g.m, g.s, g.n))) return { fehler: 'zahl' };
  if (gruppen.some(g => !(g.n >= 2) || !Number.isInteger(g.n))) return { fehler: 'n' };
  if (gruppen.some(g => !(g.s >= 0)) || !gruppen.some(g => g.s > 0)) return { fehler: 's' };
  const n = gruppen.reduce((a, g) => a + g.n, 0), gm = gruppen.reduce((a, g) => a + g.n * g.m, 0) / n;
  const ssb = gruppen.reduce((a, g) => a + g.n * (g.m - gm) ** 2, 0), ssw = gruppen.reduce((a, g) => a + (g.n - 1) * g.s ** 2, 0), dfb = gruppen.length - 1, dfw = n - gruppen.length;
  const msb = ssb / dfb, msw = ssw / dfw, f = msb / msw;
  return { ssZwischen: ssb, ssInnerhalb: ssw, dfZwischen: dfb, dfInnerhalb: dfw, msZwischen: msb, msInnerhalb: msw, f, p: fOben(f, dfb, dfw), eta2: ssb / (ssb + ssw), gesamtMittel: gm, n };
}

export interface KorrErgebnis { t: number; df: number; p: number; lo: number; hi: number }
export function korrelation(r: number, n: number, niveau = 0.95): KorrErgebnis | VergleichFehler {
  if (!ok(r, n)) return { fehler: 'zahl' };
  if (!(n >= 4) || !Number.isInteger(n)) return { fehler: 'n' };
  if (!(Math.abs(r) < 1)) return { fehler: 'r' };
  const df = n - 2, t = r * Math.sqrt(df / (1 - r * r)), z = Math.atanh(r), se = 1 / Math.sqrt(n - 3), q = zQuantil(1 - (1 - niveau) / 2);
  return { t, df, p: p2(t, df), lo: Math.tanh(z - q * se), hi: Math.tanh(z + q * se) };
}
/** Quantil der Standardnormalverteilung (Beasley-Springer-Moro genügt nicht für 1e-9; hier über t mit sehr vielen Freiheitsgraden). */
const zQuantil = (p: number) => tQuantil(p, 1e9);

export interface TabelleErgebnis { chi2: number; df: number; p: number; v: number; n: number; erwartet: number[][]; minErwartet: number; unter5: number }
export function tabelle(tab: number[][]): TabelleErgebnis | VergleichFehler {
  if (tab.length < 2 || (tab[0]?.length ?? 0) < 2 || tab.some(z => z.length !== tab[0]!.length)) return { fehler: 'tabelle' };
  if (tab.some(z => z.some(v => !(v >= 0) || !Number.isFinite(v)))) return { fehler: 'zahl' };
  const zs = tab.map(z => z.reduce((a, v) => a + v, 0)), ss = tab[0]!.map((_, j) => tab.reduce((a, z) => a + z[j]!, 0)), n = zs.reduce((a, v) => a + v, 0);
  if (!(n > 0) || zs.some(v => v === 0) || ss.some(v => v === 0)) return { fehler: 'tabelle' };
  const erw = tab.map((z, i) => z.map((_, j) => (zs[i]! * ss[j]!) / n));
  const chi2 = tab.reduce((a, z, i) => a + z.reduce((b, v, j) => b + (v - erw[i]![j]!) ** 2 / erw[i]![j]!, 0), 0), df = (tab.length - 1) * (tab[0]!.length - 1), flat = erw.flat();
  return { chi2, df, p: chiQuadratP(chi2, df), v: Math.sqrt(chi2 / (n * Math.min(tab.length - 1, tab[0]!.length - 1))), n, erwartet: erw, minErwartet: Math.min(...flat), unter5: flat.filter(v => v < 5).length };
}
