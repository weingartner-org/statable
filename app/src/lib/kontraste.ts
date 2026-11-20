/**
 * Geplante Kontraste und Trendanalyse nach einer einfaktoriellen Varianzanalyse (Field-Stufe 2, 05.11.2026). Reine Rechnung aus n, Mittelwert und Standardabweichung
 * je Gruppe (wie posthoc.ts). Ein Kontrast ist eine gewichtete Summe der Gruppenmittel mit Gewichten, die zusammen 0 ergeben.
 *   - mit gemeinsamer Fehlervarianz (wie R emmeans::contrast): SE = √(MSE · Σ c²/n), df = N − k;
 *   - ohne gleiche Varianzen (Welch, Satterthwaite): SE = √(Σ c²·s²/n), df = SE⁴ / Σ((c²s²/n)²/(n−1)).
 * Trend: Polynomkontraste (linear, quadratisch, …) für geordnete Stufen; gleiche Abstände wie emmeans „poly“ (ganzzahlig skaliert) oder echte Abstände aus Zahlen
 * (orthonormal wie R contr.poly(scores = …)).
 * Sollwerte: docs/fachblaetter/sollwerte/field-stufe2.json (kontraste, trend), Test kontraste.test.ts.
 */
import { betai, tQuantil } from './verteilung';
import { phInnerhalb, type PhGruppe } from './posthoc';

export interface KontrastErgebnis { schaetzung: number; se: number; df: number; t: number; p: number; lo: number; hi: number }
export type KontrastAnnahme = 'gemeinsam' | 'welch';

const pT2 = (t: number, df: number) => (df > 0 ? betai(df / 2, 0.5, df / (df + t * t)) : NaN);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/** Ergeben die Gewichte zusammen 0 (bis auf Rundung)? */
export function summeNull(w: number[]): boolean { return Math.abs(sum(w)) <= 1e-9 * Math.max(1, ...w.map(Math.abs)); }

/** Ein Kontrast; `null`, wenn mit diesen Gruppen oder Gewichten nicht gerechnet werden kann (falsche Länge, Summe ≠ 0, alle Gewichte 0, Gruppe unter 2 Fällen, bei Welch Streuung 0). */
export function kontrast(g: PhGruppe[], w: number[], annahme: KontrastAnnahme): KontrastErgebnis | null {
  if (g.length < 2 || w.length !== g.length || !summeNull(w) || w.every(x => x === 0) || g.some(x => x.n < 2 || !Number.isFinite(x.m) || !Number.isFinite(x.sd))) return null;
  const schaetzung = sum(w.map((c, i) => c * g[i]!.m));
  let se: number, df: number;
  if (annahme === 'gemeinsam') {
    const { mse, df: dfw } = phInnerhalb(g);
    se = Math.sqrt(mse * sum(w.map((c, i) => (c * c) / g[i]!.n))); df = dfw;
  } else {
    const teile = w.map((c, i) => (c * c * g[i]!.sd * g[i]!.sd) / g[i]!.n);
    se = Math.sqrt(sum(teile));
    if (!(se > 0)) return null;
    df = se ** 4 / sum(teile.map((v, i) => (v * v) / (g[i]!.n - 1)));
  }
  if (!(se > 0)) return null;
  const t = schaetzung / se, q = tQuantil(0.975, df);
  return { schaetzung, se, df, t, p: pT2(Math.abs(t), df), lo: schaetzung - q * se, hi: schaetzung + q * se };
}

/** Orthogonal (die beiden Schätzungen sind voneinander unabhängig): Σ c·d / n = 0; bei gleich großen Gruppen Σ c·d = 0. */
export function orthogonal(g: PhGruppe[], c: number[], d: number[]): boolean {
  const s = sum(c.map((x, i) => (x * d[i]!) / g[i]!.n)), skala = Math.sqrt(sum(c.map((x, i) => (x * x) / g[i]!.n)) * sum(d.map((x, i) => (x * x) / g[i]!.n)));
  return skala > 0 && Math.abs(s) <= 1e-9 * skala;
}

export type Vorlage = 'helmert' | 'einfach' | 'wiederholt' | 'abweichung';
export const VORLAGEN: Vorlage[] = ['helmert', 'einfach', 'wiederholt', 'abweichung'];
/** Gewichte der Vorlagen für k Gruppen (je Kontrast eine Zeile), Reihenfolge der Gruppen wie am Blatt.
 *  Helmert (wie SPSS): jede Gruppe gegen den Mittelwert aller folgenden. Einfach: jede gegen die erste. Wiederholt: jede gegen die nächste (Nachbarn).
 *  Abweichung: jede (außer der letzten) gegen den Mittelwert aller Gruppen. */
export function vorlage(art: Vorlage, k: number): number[][] {
  const zeile = (f: (j: number) => number) => Array.from({ length: k }, (_, j) => f(j));
  const idx = (n: number) => Array.from({ length: n }, (_, i) => i);
  switch (art) {
    case 'helmert': return idx(k - 1).map(i => zeile(j => (j === i ? 1 : j > i ? -1 / (k - 1 - i) : 0)));
    case 'einfach': return idx(k - 1).map(i => zeile(j => (j === 0 ? -1 : j === i + 1 ? 1 : 0)));
    case 'wiederholt': return idx(k - 1).map(i => zeile(j => (j === i ? -1 : j === i + 1 ? 1 : 0)));
    case 'abweichung': return idx(k - 1).map(i => zeile(j => (j === i ? 1 - 1 / k : -1 / k)));
  }
}

/** Zahl oder Bruch aus einer Eingabe („-2“, „0,5“, „1/3“); `null`, wenn nichts Rechenbares dasteht. */
export function gewichtLesen(text: string): number | null {
  const t = text.trim().replace(/\s+/g, '').replace(/,/g, '.');
  if (t === '') return null;
  const bruch = /^([+-]?\d*\.?\d+)\/(\d*\.?\d+)$/.exec(t);
  if (bruch) { const n = Number(bruch[2]); return n === 0 ? null : Number(bruch[1]) / n; }
  return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : null;
}

/* ---------------------------------------------------------------- Trend */
export interface TrendZeile { grad: number; gewichte: number[]; schaetzung: number; se: number; df: number; t: number; p: number; anteil: number }
/** Orthogonale Polynomgewichte (Grad 1 bis k−1) für die Werte `x` (Gram-Schmidt auf 1, x, x², …), je Grad auf Länge 1 gebracht (wie R contr.poly). */
export function polyGewichte(x: number[]): number[][] {
  const k = x.length, m = x.reduce((a, v) => a + v, 0) / k, xc = x.map(v => v - m), basis: number[][] = [x.map(() => 1)];
  for (let grad = 1; grad < k; grad++) {
    let v = xc.map(a => a ** grad);
    for (const b of basis) { const f = sum(v.map((a, i) => a * b[i]!)) / sum(b.map(a => a * a)); v = v.map((a, i) => a - f * b[i]!); }
    basis.push(v);
  }
  return basis.slice(1).map(v => { const l = Math.sqrt(sum(v.map(a => a * a))); return v.map(a => a / l); });
}
/** Ganzzahlige Darstellung gleicher Abstände (wie emmeans „poly“): durch den kleinsten Betrag ≠ 0 geteilt, wenn dann alles ganzzahlig ist. */
export function ganzzahlig(v: number[]): number[] {
  const kleinster = Math.min(...v.filter(a => Math.abs(a) > 1e-9).map(Math.abs));
  for (const f of [1, 2, 3, 4, 5, 6, 10]) { const w = v.map(a => (a / kleinster) * f); if (w.every(a => Math.abs(a - Math.round(a)) < 1e-9)) return w.map(Math.round); }
  return v;
}

/** Trendanalyse über die Gruppen in ihrer Reihenfolge; `abstaende`: echte Zahlenwerte der Gruppen, sonst gleiche Abstände. `null` ab weniger als 3 Gruppen oder bei gleichen Zahlenwerten. */
export function trendanalyse(g: PhGruppe[], abstaende?: number[]): TrendZeile[] | null {
  const k = g.length;
  if (k < 3 || g.some(x => x.n < 2 || !Number.isFinite(x.m) || !Number.isFinite(x.sd))) return null;
  if (abstaende && (abstaende.length !== k || new Set(abstaende).size < k)) return null;
  const roh = polyGewichte(abstaende ?? Array.from({ length: k }, (_, i) => i + 1));
  const { mse, df } = phInnerhalb(g), ssZw = (() => { const N = sum(g.map(x => x.n)), mw = sum(g.map(x => x.n * x.m)) / N; return sum(g.map(x => x.n * (x.m - mw) ** 2)); })();
  return roh.map((r, i) => {
    const w = abstaende ? r : ganzzahlig(r), schaetzung = sum(w.map((c, j) => c * g[j]!.m)), se = Math.sqrt(mse * sum(w.map((c, j) => (c * c) / g[j]!.n))), t = schaetzung / se;
    // Anteil des Trends an der Streuung zwischen den Gruppen (Quadratsumme des Kontrasts); bei gleich großen Gruppen summieren sich alle Trends auf 100 %
    const ssK = schaetzung ** 2 / sum(w.map((c, j) => (c * c) / g[j]!.n));
    return { grad: i + 1, gewichte: w, schaetzung, se, df, t, p: pT2(Math.abs(t), df), anteil: ssZw > 0 ? ssK / ssZw : NaN };
  });
}

/** Sind alle Gruppennamen Zahlen (Komma oder Punkt)? Dann gibt es echte Abstände; sonst `null`. */
export function zahlenAusNamen(namen: string[]): number[] | null {
  const z = namen.map(n => (/^\s*[+-]?(\d+([.,]\d+)?|[.,]\d+)\s*$/.test(n) ? Number(n.trim().replace(',', '.')) : NaN));
  return z.length >= 3 && z.every(Number.isFinite) ? z : null;
}
