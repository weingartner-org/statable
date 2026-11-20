/**
 * Befehle für den exakten Binomialtest („Anteilstest“ im Bereich Verstehen) in Excel, TI-84, SPSS und R (S-K K7, 23.10.2026).
 * Ablehnungsbereich rechts: kleinstes c mit P(X ≥ c) ≤ α, also c = BINOM.INV(n, p₀, 1 − α) + 1; p-Wert rechts: 1 − P(X ≤ x − 1), links: P(X ≤ x).
 * Zweiseitig gibt es in Excel und auf dem TI-84 keinen fertigen Befehl; R: binom.test. Reine Texte, keine Rechnung.
 * ⚠ Von der Fachperson (Andreas) gegenzulesen: Namen der TI-84-Befehle und der deutschen Excel-Funktionen.
 */
import type { Seite } from './anteilstest';

export interface AnteilBezug { excel: string[]; ti: string[]; spss: string[]; r: string[]; geogebra: string[] }

const fz = (v: number, deutsch: boolean) => { const t = String(Number(v.toPrecision(12))); return deutsch ? t.replace('.', ',') : t; };

export function anteilBezug(n: number, p0: number, seite: Seite, alphaProz: number, x: number | undefined, deutsch: boolean): AnteilBezug {
  const f = (v: number) => fz(v, deutsch), g = (v: number) => fz(v, false), sep = deutsch ? '; ' : ', ';
  const ex = (en: string, de: string, ...arg: string[]) => `=${deutsch ? de : en}(${arg.join(sep)})`;
  const WAHR = deutsch ? 'WAHR' : 'TRUE';
  const alpha = alphaProz / 100, alt = seite === 'rechts' ? 'greater' : seite === 'links' ? 'less' : 'two.sided';
  const out: AnteilBezug = { excel: [], ti: [], spss: [], r: [], geogebra: [] };
  const cdf = (k: string) => ex('BINOM.DIST', 'BINOM.VERT', k, f(n), f(p0), WAHR);
  if (seite === 'rechts') {
    out.excel.push(`${ex('BINOM.INV', 'BINOM.INV', f(n), f(p0), f(1 - alpha))} + 1`);
    out.r.push(`qbinom(${g(1 - alpha)}, ${g(n)}, ${g(p0)}) + 1`); out.geogebra.push(`InverseBinomial(${g(n)}, ${g(p0)}, ${g(1 - alpha)}) + 1`);
    if (x !== undefined) { out.excel.push(`=1 - ${cdf(f(x - 1)).slice(1)}`); out.ti.push(`1 - binomcdf(${g(n)}, ${g(p0)}, ${g(x - 1)})`); out.geogebra.push(`1 - BinomialDist(${g(n)}, ${g(p0)}, ${g(x - 1)}, true)`); }
  } else if (seite === 'links') {
    if (x !== undefined) { out.excel.push(cdf(f(x))); out.ti.push(`binomcdf(${g(n)}, ${g(p0)}, ${g(x)})`); out.geogebra.push(`BinomialDist(${g(n)}, ${g(p0)}, ${g(x)}, true)`); }
  }
  if (x !== undefined) out.r.push(`binom.test(${g(x)}, ${g(n)}, ${g(p0)}, alternative = "${alt}")`);
  out.spss.push(...(x !== undefined && seite !== 'zwei' ? [seite === 'rechts' ? `COMPUTE p = 1 - CDF.BINOM(${g(x - 1)}, ${g(n)}, ${g(p0)}).` : `COMPUTE p = CDF.BINOM(${g(x)}, ${g(n)}, ${g(p0)}).`] : []));
  return out;
}
