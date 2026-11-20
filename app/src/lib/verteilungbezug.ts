/**
 * „So geht es in Excel, TI-84, SPSS, R“ für den Rechner „Verteilungen“ (S-K K7, 23.10.2026): zur gewählten Verteilung und Fragestellung (höchstens, mindestens, zwischen, Quantil)
 * die Befehle, mit denen sich dieselbe Zahl ergibt. Reine Texte aus den Eingaben, keine Rechnung. Excel: englische Namen und Komma, bei deutscher Oberfläche deutsche Namen, Semikolon und Dezimalkomma.
 * ⚠ Von der Fachperson (Andreas) gegenzulesen: Namen der TI-84-Befehle und der deutschen Excel-Funktionen.
 */
import type { Verteilung } from './verteilungen';

export type BezugModus = 'links' | 'linksStreng' | 'rechts' | 'rechtsStreng' | 'zwischen' | 'quantil';
export interface VerteilungBezug { excel: string[]; ti: string[]; spss: string[]; r: string[]; geogebra: string[]; hinweise: ('ti-kein-quantil' | 'ti-keine-verteilung')[] }

/** Zahl für den Befehl: höchstens 12 gültige Stellen, bei Deutsch mit Komma. */
const fz = (v: number, deutsch: boolean) => { const t = String(Number(v.toPrecision(12))); return deutsch ? t.replace('.', ',') : t; };

export function verteilungBezug(v: Verteilung, modus: BezugModus, x: number, a: number, b: number, q: number, deutsch: boolean): VerteilungBezug | null {
  if (v.art === 'eigen') return null;
  const n = (w: number) => fz(w, deutsch), ns = (w: number) => fz(w, false), sep = deutsch ? '; ' : ', ';
  const ex = (en: string, de: string, ...arg: string[]) => `${deutsch ? de : en}(${arg.join(sep)})`;
  const WAHR = deutsch ? 'WAHR' : 'TRUE';
  const diskret = v.art === 'binom' || v.art === 'poisson' || v.art === 'hyper';
  const out: VerteilungBezug = { excel: [], ti: [], spss: [], r: [], geogebra: [], hinweise: [] };

  // Verteilungsfunktion P(X ≤ k) als Ausdruck je Programm
  const cdf = {
    excel: (k: number): string => {
      switch (v.art) {
        case 'normal': return ex('NORM.DIST', 'NORM.VERT', n(k), n(v.mu), n(v.sigma), WAHR);
        case 't': return ex('T.DIST', 'T.VERT', n(k), n(v.df), WAHR);
        case 'chi2': return ex('CHISQ.DIST', 'CHIQU.VERT', n(k), n(v.df), WAHR);
        case 'f': return ex('F.DIST', 'F.VERT', n(k), n(v.d1), n(v.d2), WAHR);
        case 'binom': return ex('BINOM.DIST', 'BINOM.VERT', n(k), n(v.n), n(v.p), WAHR);
        case 'poisson': return ex('POISSON.DIST', 'POISSON.VERT', n(k), n(v.lambda), WAHR);
        case 'hyper': return ex('HYPGEOM.DIST', 'HYPGEOM.VERT', n(k), n(v.n), n(v.K), n(v.N), WAHR);
      }
    },
    spss: (k: number): string => {
      switch (v.art) {
        case 'normal': return `CDF.NORMAL(${ns(k)}, ${ns(v.mu)}, ${ns(v.sigma)})`;
        case 't': return `CDF.T(${ns(k)}, ${ns(v.df)})`;
        case 'chi2': return `CDF.CHISQ(${ns(k)}, ${ns(v.df)})`;
        case 'f': return `CDF.F(${ns(k)}, ${ns(v.d1)}, ${ns(v.d2)})`;
        case 'binom': return `CDF.BINOM(${ns(k)}, ${ns(v.n)}, ${ns(v.p)})`;
        case 'poisson': return `CDF.POISSON(${ns(k)}, ${ns(v.lambda)})`;
        case 'hyper': return `CDF.HYPER(${ns(k)}, ${ns(v.N)}, ${ns(v.n)}, ${ns(v.K)})`;
      }
    },
    r: (k: number): string => {
      switch (v.art) {
        case 'normal': return `pnorm(${fz(k, false)}, ${fz(v.mu, false)}, ${fz(v.sigma, false)})`;
        case 't': return `pt(${fz(k, false)}, ${fz(v.df, false)})`;
        case 'chi2': return `pchisq(${fz(k, false)}, ${fz(v.df, false)})`;
        case 'f': return `pf(${fz(k, false)}, ${fz(v.d1, false)}, ${fz(v.d2, false)})`;
        case 'binom': return `pbinom(${fz(k, false)}, ${fz(v.n, false)}, ${fz(v.p, false)})`;
        case 'poisson': return `ppois(${fz(k, false)}, ${fz(v.lambda, false)})`;
        case 'hyper': return `phyper(${fz(k, false)}, ${fz(v.K, false)}, ${fz(v.N - v.K, false)}, ${fz(v.n, false)})`;
      }
    }
  };
  /** GeoGebra: Verteilungsfunktion bis k (englische Befehlsnamen, Dezimalpunkt) */
  const gg = (k: number): string => {
    const f = (w: number) => fz(w, false);
    switch (v.art) {
      case 'normal': return `Normal(${f(v.mu)}, ${f(v.sigma)}, ${f(k)}, true)`;
      case 't': return `TDistribution(${f(v.df)}, ${f(k)})`;
      case 'chi2': return `ChiSquared(${f(v.df)}, ${f(k)})`;
      case 'f': return `FDistribution(${f(v.d1)}, ${f(v.d2)}, ${f(k)})`;
      case 'binom': return `BinomialDist(${f(v.n)}, ${f(v.p)}, ${f(k)}, true)`;
      case 'poisson': return `Poisson(${f(v.lambda)}, ${f(k)}, true)`;
      case 'hyper': return `HyperGeometric(${f(v.N)}, ${f(v.K)}, ${f(v.n)}, ${f(k)}, true)`;
    }
  };
  // TI-84: Verteilungsfunktion über ein Intervall (untere, obere Grenze); Diskrete mit binomcdf/poissoncdf bis k
  const unten = '-1E99', oben = '1E99';
  const tiIntervall = (lo: string, hi: string): string | null => {
    switch (v.art) {
      case 'normal': return `normalcdf(${lo}, ${hi}, ${fz(v.mu, false)}, ${fz(v.sigma, false)})`;
      case 't': return `tcdf(${lo}, ${hi}, ${fz(v.df, false)})`;
      case 'chi2': return `χ²cdf(${lo}, ${hi}, ${fz(v.df, false)})`;
      case 'f': return `Fcdf(${lo}, ${hi}, ${fz(v.d1, false)}, ${fz(v.d2, false)})`;
      default: return null;
    }
  };
  const tiDiskret = (k: number): string | null => (v.art === 'binom' ? `binomcdf(${fz(v.n, false)}, ${fz(v.p, false)}, ${fz(k, false)})` : v.art === 'poisson' ? `poissoncdf(${fz(v.lambda, false)}, ${fz(k, false)})` : null);
  const um = diskret ? 1 : 0;  // bei Diskreten rückt eine strenge Grenze um 1

  const eins = (s: string) => `=${s}`;
  switch (modus) {
    case 'links': case 'linksStreng': {
      const k = modus === 'links' ? x : x - um;
      out.excel.push(eins(cdf.excel(k))); out.spss.push(`COMPUTE p = ${cdf.spss(k)}.`); out.r.push(cdf.r(k)); out.geogebra.push(gg(k));
      const t = diskret ? tiDiskret(k) : tiIntervall(unten, fz(k, false)); if (t) out.ti.push(t);
      break;
    }
    case 'rechts': case 'rechtsStreng': {
      const k = modus === 'rechtsStreng' ? x : x - um;
      out.excel.push(eins(`1 - ${cdf.excel(k)}`)); out.spss.push(`COMPUTE p = 1 - ${cdf.spss(k)}.`); out.r.push(`1 - ${cdf.r(k)}`); out.geogebra.push(`1 - ${gg(k)}`);
      const t = diskret ? (tiDiskret(k) ? `1 - ${tiDiskret(k)}` : null) : tiIntervall(fz(x, false), oben); if (t) out.ti.push(t);
      break;
    }
    case 'zwischen': {
      const ka = a - um;
      out.excel.push(eins(`${cdf.excel(b)} - ${cdf.excel(ka)}`)); out.spss.push(`COMPUTE p = ${cdf.spss(b)} - ${cdf.spss(ka)}.`); out.r.push(`${cdf.r(b)} - ${cdf.r(ka)}`); out.geogebra.push(`${gg(b)} - ${gg(ka)}`);
      const t = diskret ? (tiDiskret(b) ? `${tiDiskret(b)} - ${tiDiskret(ka)}` : null) : tiIntervall(fz(a, false), fz(b, false)); if (t) out.ti.push(t);
      break;
    }
    case 'quantil': {
      switch (v.art) {
        case 'normal': out.geogebra.push(`InverseNormal(${fz(v.mu, false)}, ${fz(v.sigma, false)}, ${fz(q, false)})`); out.excel.push(eins(ex('NORM.INV', 'NORM.INV', n(q), n(v.mu), n(v.sigma)))); out.ti.push(`invNorm(${fz(q, false)}, ${fz(v.mu, false)}, ${fz(v.sigma, false)})`); out.spss.push(`COMPUTE x = IDF.NORMAL(${ns(q)}, ${ns(v.mu)}, ${ns(v.sigma)}).`); out.r.push(`qnorm(${fz(q, false)}, ${fz(v.mu, false)}, ${fz(v.sigma, false)})`); break;
        case 't': out.geogebra.push(`InverseTDistribution(${fz(v.df, false)}, ${fz(q, false)})`); out.excel.push(eins(ex('T.INV', 'T.INV', n(q), n(v.df)))); out.ti.push(`invT(${fz(q, false)}, ${fz(v.df, false)})`); out.spss.push(`COMPUTE x = IDF.T(${ns(q)}, ${ns(v.df)}).`); out.r.push(`qt(${fz(q, false)}, ${fz(v.df, false)})`); break;
        case 'chi2': out.geogebra.push(`InverseChiSquared(${fz(v.df, false)}, ${fz(q, false)})`); out.excel.push(eins(ex('CHISQ.INV', 'CHIQU.INV', n(q), n(v.df)))); out.spss.push(`COMPUTE x = IDF.CHISQ(${ns(q)}, ${ns(v.df)}).`); out.r.push(`qchisq(${fz(q, false)}, ${fz(v.df, false)})`); out.hinweise.push('ti-kein-quantil'); break;
        case 'f': out.geogebra.push(`InverseFDistribution(${fz(v.d1, false)}, ${fz(v.d2, false)}, ${fz(q, false)})`); out.excel.push(eins(ex('F.INV', 'F.INV', n(q), n(v.d1), n(v.d2)))); out.spss.push(`COMPUTE x = IDF.F(${ns(q)}, ${ns(v.d1)}, ${ns(v.d2)}).`); out.r.push(`qf(${fz(q, false)}, ${fz(v.d1, false)}, ${fz(v.d2, false)})`); out.hinweise.push('ti-kein-quantil'); break;
        case 'binom': out.geogebra.push(`InverseBinomial(${fz(v.n, false)}, ${fz(v.p, false)}, ${fz(q, false)})`); out.excel.push(eins(ex('BINOM.INV', 'BINOM.INV', n(v.n), n(v.p), n(q)))); out.r.push(`qbinom(${fz(q, false)}, ${fz(v.n, false)}, ${fz(v.p, false)})`); out.hinweise.push('ti-kein-quantil'); break;
        case 'poisson': out.geogebra.push(`InversePoisson(${fz(v.lambda, false)}, ${fz(q, false)})`); out.r.push(`qpois(${fz(q, false)}, ${fz(v.lambda, false)})`); out.hinweise.push('ti-kein-quantil'); break;
        case 'hyper': out.geogebra.push(`InverseHyperGeometric(${fz(v.N, false)}, ${fz(v.K, false)}, ${fz(v.n, false)}, ${fz(q, false)})`); out.r.push(`qhyper(${fz(q, false)}, ${fz(v.K, false)}, ${fz(v.N - v.K, false)}, ${fz(v.n, false)})`); out.hinweise.push('ti-kein-quantil'); break;
      }
    }
  }
  if (!out.ti.length && modus !== 'quantil') out.hinweise.push('ti-keine-verteilung');
  return out;
}
