/** t-Verteilung für Konfidenzintervalle der Gruppenmittel und für den Bereich von d (PSPP liefert beides im t-Test nicht). */

/** ln Γ(x) für x > 0: Stirling-Reihe ab x ≥ 10, darunter über die Rekursion Γ(x) = Γ(x+1)/x nach oben geschoben (relativer Fehler um 1e-15; früher Numerical-Recipes-Lanczos mit etwa 1e-10 absolut). */
export function lnGamma(x: number): number {
  if (!(x > 0)) return NaN;
  let acc = 1, y = x;
  while (y < 10) { acc *= y; y += 1; }
  const y2 = 1 / (y * y);
  const reihe = (1 / 12 - y2 * (1 / 360 - y2 * (1 / 1260 - y2 * (1 / 1680 - y2 * (1 / 1188 - y2 * (691 / 360360 - y2 / 156)))))) / y;
  return (y - 0.5) * Math.log(y) - y + 0.9189385332046727 + reihe - (acc === 1 ? 0 : Math.log(acc));
}

/** Stirling-Fehler stirlerr(n) = ln n! − ln(√(2π n) (n/e)^n) (Loader 1999; wie R `stirlerr`). */
export function stirlerr(n: number): number {
  if (n > 15) {
    const nn = n * n;
    return (1 / 12 - (1 / 360 - (1 / 1260 - (1 / 1680 - 1 / 1188 / nn) / nn) / nn) / nn) / n;
  }
  if (n === 0) return Infinity;
  return lnGamma(n + 1) - (n + 0.5) * Math.log(n) + n - 0.9189385332046727;
}

/** Abweichungsmaß bd0(x, np) = x ln(x/np) + np − x ohne Auslöschung (Loader 1999; wie R `bd0`). */
export function bd0(x: number, np: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(np) || np === 0) return NaN;
  if (Math.abs(x - np) < 0.1 * (x + np)) {
    let v = (x - np) / (x + np), s = (x - np) * v;
    if (Math.abs(s) < Number.MIN_VALUE) return s;
    let ej = 2 * x * v; v *= v;
    for (let j = 1; j < 1000; j++) {
      ej *= v; const s1 = s + ej / (2 * j + 1);
      if (s1 === s) return s1;
      s = s1;
    }
  }
  return x * Math.log(x / np) + np - x;
}

/** Poisson-Dichte λ^x e^−λ / Γ(x+1), auch für nicht ganzes x (wie R `dpois_raw`). */
export function dpoisRaw(x: number, lambda: number): number {
  if (lambda === 0) return x === 0 ? 1 : 0;
  if (!Number.isFinite(lambda) || x < 0) return 0;
  if (x <= lambda * Number.MIN_VALUE) return Math.exp(-lambda);
  if (lambda < x * Number.MIN_VALUE) {
    if (!Number.isFinite(x)) return 0;
    return Math.exp(-lambda + x * Math.log(lambda) - lnGamma(x + 1));
  }
  return Math.exp(-stirlerr(x) - bd0(x, lambda)) / Math.sqrt(2 * Math.PI * x);
}

/** Binomial-Dichte C(n, x) p^x q^(n−x), auch für nicht ganzes x und n (wie R `dbinom_raw`, ohne Auslöschung). */
export function dbinomRaw(x: number, n: number, p: number, q: number): number {
  if (p === 0) return x === 0 ? 1 : 0;
  if (q === 0) return x === n ? 1 : 0;
  if (x < 0 || x > n) return 0;
  if (x === 0) {
    if (n === 0) return 1;
    return Math.exp(p < 0.1 ? -bd0(n, n * q) - n * p : n * Math.log(q));
  }
  if (x === n) return Math.exp(q < 0.1 ? -bd0(n, n * p) - n * q : n * Math.log(p));
  const lc = stirlerr(n) - stirlerr(x) - stirlerr(n - x) - bd0(x, n * p) - bd0(n - x, n * q);
  const lf = Math.log(2 * Math.PI) + Math.log(x) + Math.log1p(-x / n);
  return Math.exp(lc - 0.5 * lf);
}

/** Kettenbruch der unvollständigen Betafunktion (Numerical Recipes, modifiziertes Lentz). */
function betaKettenbruch(a: number, b: number, x: number): number {
  const tiny = 1e-300;
  let c = 1, d = 1 - ((a + b) * x) / (a + 1); d = 1 / (Math.abs(d) < tiny ? tiny : d); let h = d;
  for (let m = 1; m <= 5000; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a - 1 + m2) * (a + m2));
    d = 1 + aa * d; d = 1 / (Math.abs(d) < tiny ? tiny : d); c = 1 + aa / c; c = Math.abs(c) < tiny ? tiny : c; h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + 1 + m2));
    d = 1 + aa * d; d = 1 / (Math.abs(d) < tiny ? tiny : d); c = 1 + aa / c; c = Math.abs(c) < tiny ? tiny : c;
    const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break;
  }
  return h;
}

/** Regularisierte unvollständige Betafunktion I_x(a, b) als unterer UND oberer Schwanz, beide direkt gerechnet (kein 1 − P bei kleinen Werten); y = 1 − x wird mitgegeben, damit es nicht ausgelöscht wird. */
export function betaiXY(a: number, b: number, x: number, y: number): { unten: number; oben: number } {
  if (!(x > 0)) return { unten: 0, oben: 1 };
  if (!(y > 0)) return { unten: 1, oben: 0 };
  const bt = (dbinomRaw(a, a + b, x, y) * a * b) / (a + b);       // x^a y^b / B(a, b)
  if (x < (a + 1) / (a + b + 2)) { const u = Math.min(1, (bt * betaKettenbruch(a, b, x)) / a); return { unten: u, oben: 1 - u }; }
  const o = Math.min(1, (bt * betaKettenbruch(b, a, y)) / b);
  return { unten: 1 - o, oben: o };
}

/** Regularisierte unvollständige Beta-Funktion (Kettenbruch, Numerical Recipes). */
export function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0; if (x >= 1) return 1;
  return betaiXY(a, b, x, 1 - x).unten;
}

/** P(T ≤ t) und P(T ≥ t) der t-Verteilung mit df Freiheitsgraden, beide direkt (Symmetrie; sehr große |t| über die Randentwicklung, kein Überlauf von t²). */
export function tSchwaenze(t: number, df: number): { unten: number; oben: number } {
  if (Number.isNaN(t)) return { unten: NaN, oben: NaN };
  const at = Math.abs(t);
  let schwanz: number;
  if (at === Infinity) schwanz = 0;
  else if (at === 0) schwanz = 0.5;
  else if (at > 1e100) {
    const a = df / 2;
    const lnB = lnGamma(a) + 0.5 * Math.log(Math.PI) - lnGamma(a + 0.5);
    schwanz = 0.5 * Math.exp(a * (Math.log(df) - 2 * Math.log(at)) - Math.log(a) - lnB);
  } else {
    const t2 = at * at;
    schwanz = 0.5 * betaiXY(df / 2, 0.5, df / (df + t2), t2 / (df + t2)).unten;
  }
  return t >= 0 ? { unten: 1 - schwanz, oben: schwanz } : { unten: schwanz, oben: 1 - schwanz };
}

/** P(T ≤ t) für df Freiheitsgrade. */
export function tVerteilung(t: number, df: number): number { return tSchwaenze(t, df).unten; }
/** P(T ≥ t), oberer Schwanz direkt. */
export function tVerteilungOben(t: number, df: number): number { return tSchwaenze(t, df).oben; }

/** Quantil der t-Verteilung zur Wahrscheinlichkeit p (Bisektion auf dem Schwanz, Bereich bis 1e300; p = 0 und 1 geben ∓∞). */
export function tQuantil(p: number, df: number): number {
  if (!(p >= 0 && p <= 1)) return NaN;
  if (p === 0) return -Infinity; if (p === 1) return Infinity;
  if (p === 0.5) return 0;
  const q = Math.min(p, 1 - p);                                   // 1 − p ist für p ≥ 0,5 exakt
  const schwanz = (x: number) => tSchwaenze(x, df).oben;          // P(T ≥ x), fällt von 0,5 auf 0
  let hi = 1;
  while (schwanz(hi) > q && hi < 1e300) hi *= 2;
  let lo = schwanz(1) > q ? hi / 2 : 0;
  for (let i = 0; i < 110; i++) { const m = (lo + hi) / 2; if (schwanz(m) > q) lo = m; else hi = m; }
  const x = (lo + hi) / 2;
  return p < 0.5 ? -x : x;
}

/** Q(x) = P(Z ≥ x) für x ≥ 0: Reihe bis 2,5, darüber Kettenbruch (Mills-Quotient, modifiziertes Lentz); relativer Fehler um 1e-14 bis in den Rand (x ≤ 38,6; darüber 0). */
function normalSchwanz(x: number): number {
  if (x > 38.6) return 0;
  const e = Math.exp(-x * x / 2) * 0.3989422804014327;
  if (x < 2.5) {
    const x2 = x * x;
    let term = x, summe = x;
    for (let i = 1; i < 300; i++) { term *= x2 / (2 * i + 1); summe += term; if (term < summe * 1e-17) break; }
    return Math.max(0, 0.5 - e * summe);
  }
  const tiny = 1e-300;
  let f = x, c = x, d = 0;
  for (let k = 1; k < 2000; k++) {
    d = x + k * d; if (d === 0) d = tiny;
    c = x + k / c; if (c === 0) c = tiny;
    d = 1 / d; const del = c * d; f *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return e / f;
}

/** P(Z ≤ z), Standardnormalverteilung (beide Schwänze direkt; früher West 2005 mit 1e-9 relativem Fehler im Rand). */
export function normal(z: number): number {
  if (Number.isNaN(z)) return NaN;
  return z > 0 ? 1 - normalSchwanz(z) : normalSchwanz(-z);
}

/** P(Z ≥ z), oberer Schwanz direkt (Symmetrie, kein 1 − P). */
export function normalOben(z: number): number { return normal(-z); }

/** P(T ≤ t) der nichtzentralen t-Verteilung mit df Freiheitsgraden und Nichtzentralität ncp (AS 243, Lenth 1989; wie R `pt(t, df, ncp)`). */
export function tNichtzentral(t: number, df: number, ncp: number): number {
  const neg = t < 0, tt = neg ? -t : t, del = neg ? -ncp : ncp;
  const x = tt * tt / (tt * tt + df);
  let tnc = 0;
  if (x > 0) {
    const lambda = del * del;
    let p = 0.5 * Math.exp(-0.5 * lambda), q = Math.sqrt(2 / Math.PI) * p * del, s = 0.5 - p, a = 0.5;
    const b = 0.5 * df, rxb = Math.pow(1 - x, b), albeta = 0.5 * Math.log(Math.PI) + lnGamma(b) - lnGamma(0.5 + b);
    let xodd = betai(a, b, x), godd = 2 * rxb * Math.exp(a * Math.log(x) - albeta), xeven = b * x < 1e-12 ? b * x : 1 - rxb, geven = b * x * rxb;
    tnc = p * xodd + q * xeven;
    for (let it = 1; it <= 1000; it++) {
      a += 1; xodd -= godd; xeven -= geven; godd *= x * (a + b - 1) / a; geven *= x * (a + b - 0.5) / (a + 0.5);
      p *= lambda / (2 * it); q *= lambda / (2 * it + 1); tnc += p * xodd + q * xeven; s -= p;
      if ((s <= 0 && it > 1) || Math.abs(2 * s * (xodd - godd)) < 1e-14) break;
    }
  }
  tnc += normal(-del);
  return neg ? 1 - tnc : tnc;
}

/** Ab dieser Nichtzentralität wird die nichtzentrale t-Verteilung ungenau (R nennt etwa 37,6 als Grenze von `pt(…, ncp)`); darüber gilt die Normalnäherung. Gefunden im Browser: dz = 4,1 bei n = 117 ergab einen Bereich, der dz nicht enthielt. */
const NCP_GRENZE = 30;

/** 95 %-Bereich für Cohens d (zwei unabhängige Gruppen, gepoolte SD) über die nichtzentrale t-Verteilung - wie SPSS ab 27 und R `MBESS::ci.smd`.
 *  Gesucht ist die Nichtzentralität, bei der das beobachtete t das 97,5- bzw. 2,5-%-Quantil ist; d = ncp · √(1/n₁ + 1/n₂). */
export function dBereich(d: number, n1: number, n2: number): [number, number] {
  const f = Math.sqrt(1 / n1 + 1 / n2), t = d / f, df = n1 + n2 - 2;
  if (Math.abs(t) > NCP_GRENZE) { const se = Math.sqrt(1 / n1 + 1 / n2 + d * d / (2 * (n1 + n2))); return [d - 1.959964 * se, d + 1.959964 * se]; }   // Hedges & Olkin
  const ncp = (ziel: number) => {
    let lo = t - 40, hi = t + 40;                     // P(T ≤ t | ncp) fällt mit ncp
    for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (tNichtzentral(t, df, m) > ziel) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  return [ncp(0.975) * f, ncp(0.025) * f];
}

/** 95 %-Bereich für d_z (gepaarte Messung, d_z = M_diff / SD_diff) über die nichtzentrale t-Verteilung: ncp = d_z · √n, df = n − 1; wie R `uniroot(pt(t, n-1, ncp))` (Quelle des Vergleichs: ergebnis.test.ts). */
export function dzBereich(dz: number, n: number): [number, number] {
  const f = Math.sqrt(1 / n), t = dz / f, df = n - 1;
  if (Math.abs(t) > NCP_GRENZE) { const se = Math.sqrt(1 / n + dz * dz / (2 * n)); return [dz - 1.959964 * se, dz + 1.959964 * se]; }   // Normalnäherung (Hedges & Olkin)
  const ncp = (ziel: number) => {
    let lo = t - 40, hi = t + 40;
    for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (tNichtzentral(t, df, m) > ziel) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  return [ncp(0.975) * f, ncp(0.025) * f];
}

/** P(χ² ≥ x) bei df Freiheitsgraden (obere regularisierte Gammafunktion Q(df/2, x/2); Reihe bzw. Kettenbruch, Numerical Recipes). Für den Modelltest der logistischen Regression. */
export function chiQuadratP(x: number, df: number): number {
  if (x <= 0) return 1;
  const a = df / 2, xx = x / 2, vor = Math.exp(-xx + a * Math.log(xx) - lnGamma(a));
  if (xx < a + 1) {
    let summe = 1 / a, term = summe;
    for (let n = 1; n < 500; n++) { term *= xx / (a + n); summe += term; if (Math.abs(term) < Math.abs(summe) * 1e-15) break; }
    return 1 - vor * summe;
  }
  let b = xx + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a); b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break;
  }
  return vor * h;
}
