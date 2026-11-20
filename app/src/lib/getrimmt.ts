/**
 * Robuste Verfahren mit getrimmten Mitteln nach Wilcox (Field-Stufe 3, 05.11.2026). Reine Rechnung, keine Abhängigkeit von R oder WRS2.
 *   getrimmtes Mittel: je Seite floor(tr · n) Werte weglassen, den Rest mitteln (R: mean(x, trim = tr)).
 *   winsorisierte Varianz: die abgeschnittenen Werte werden durch die Grenzwerte ersetzt (nach Wilcox: sortierte Werte an Platz floor(tr·n)+1 bzw. n−floor(tr·n)).
 *   Yuen (1974): zwei unabhängige Gruppen, Welch-artige Freiheitsgrade; Yuen gepaart (yuend); t1way: einfaktoriell (Welch-artig); lincon: Paarvergleiche, p nach Hochberg.
 * Sollwerte: R WRS2 1.1.7 (yuen, yuend, t1way, lincon), siehe robust.test.ts und docs/fachblaetter/sollwerte/field-stufe3.json (Abschnitt robust).
 */
import { betai, tQuantil, tSchwaenze } from './verteilung';
import { quantil7 } from './diagrammdaten';

export const TRIM_STANDARD = 0.2;
const sortiert = (x: number[]) => [...x].sort((a, b) => a - b);
const wenigFehler = (x: number[], tr: number) => x.length - 2 * Math.floor(tr * x.length) < 2;

/** Zahl der Werte, die nach dem Trimmen übrig bleiben (Wilcox: h). */
export const trimH = (n: number, tr: number) => n - 2 * Math.floor(tr * n);
/** Getrimmtes Mittel wie R `mean(x, trim = tr)` (tr < 0,5). */
export function trimMittel(x: number[], tr = TRIM_STANDARD): number {
  const s = sortiert(x), lo = Math.floor(s.length * tr);
  const m = s.slice(lo, s.length - lo);
  return m.reduce((a, b) => a + b, 0) / m.length;
}
/** Winsorisieren nach Wilcox: kleinste und größte floor(tr·n) Werte durch den nächsten verbleibenden Wert ersetzen (Reihenfolge der Eingabe bleibt). */
export function winsorWilcox(x: number[], tr = TRIM_STANDARD): number[] {
  const s = sortiert(x), g = Math.floor(tr * x.length), lo = s[g]!, hi = s[x.length - g - 1]!;
  return x.map(v => Math.min(hi, Math.max(lo, v)));
}
const mw = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const kov = (a: number[], b: number[]) => { const ma = mw(a), mb = mw(b); return a.reduce((s, v, i) => s + (v - ma) * (b[i]! - mb), 0) / (a.length - 1); };
/** Winsorisierte Varianz (n − 1 im Nenner). */
export const winVar = (x: number[], tr = TRIM_STANDARD) => kov(winsorWilcox(x, tr), winsorWilcox(x, tr));

const pT2 = (t: number, df: number) => 2 * tSchwaenze(Math.abs(t), df).oben;
const pF = (f: number, d1: number, d2: number) => (f > 0 ? betai(d2 / 2, d1 / 2, d2 / (d2 + d1 * f)) : 1);

export interface YuenErgebnis { n1: number; n2: number; m1: number; m2: number; diff: number; se: number; t: number; df: number; p: number; lo: number; hi: number; tr: number }
export type RobustFehler = { fehler: 'zu-wenig' | 'keine-streuung' };

/** Yuen-Test für zwei unabhängige Gruppen (R WRS2::yuen, 95-%-Intervall der Differenz der getrimmten Mittel, Gruppe 1 minus Gruppe 2). */
export function yuen(x: number[], y: number[], tr = TRIM_STANDARD, niveau = 0.95): YuenErgebnis | RobustFehler {
  if (wenigFehler(x, tr) || wenigFehler(y, tr)) return { fehler: 'zu-wenig' };
  const h1 = trimH(x.length, tr), h2 = trimH(y.length, tr);
  const d1 = ((x.length - 1) * winVar(x, tr)) / (h1 * (h1 - 1)), d2 = ((y.length - 1) * winVar(y, tr)) / (h2 * (h2 - 1));
  if (!(d1 + d2 > 0)) return { fehler: 'keine-streuung' };
  const diff = trimMittel(x, tr) - trimMittel(y, tr), se = Math.sqrt(d1 + d2);
  const df = (d1 + d2) ** 2 / (d1 ** 2 / (h1 - 1) + d2 ** 2 / (h2 - 1)), t = diff / se, q = tQuantil(1 - (1 - niveau) / 2, df);
  return { n1: x.length, n2: y.length, m1: trimMittel(x, tr), m2: trimMittel(y, tr), diff, se, t, df, p: pT2(t, df), lo: diff - q * se, hi: diff + q * se, tr };
}

export interface YuendErgebnis { n: number; m1: number; m2: number; diff: number; se: number; t: number; df: number; p: number; lo: number; hi: number; tr: number }
/** Yuen-Test für gepaarte Werte (R WRS2::yuend): vorher `x`, nachher `y` derselben Personen, Differenz getrimmtes Mittel x minus y. */
export function yuend(x: number[], y: number[], tr = TRIM_STANDARD, niveau = 0.95): YuendErgebnis | RobustFehler {
  if (x.length !== y.length || wenigFehler(x, tr)) return { fehler: 'zu-wenig' };
  const n = x.length, h1 = trimH(n, tr), xw = winsorWilcox(x, tr), yw = winsorWilcox(y, tr);
  const q1 = (n - 1) * kov(xw, xw), q2 = (n - 1) * kov(yw, yw), q3 = (n - 1) * kov(xw, yw), df = h1 - 1;
  const v = (q1 + q2 - 2 * q3) / (h1 * (h1 - 1));
  if (!(v > 0)) return { fehler: 'keine-streuung' };
  const se = Math.sqrt(v), diff = trimMittel(x, tr) - trimMittel(y, tr), t = diff / se, q = tQuantil(1 - (1 - niveau) / 2, df);
  return { n, m1: trimMittel(x, tr), m2: trimMittel(y, tr), diff, se, t, df, p: pT2(t, df), lo: diff - q * se, hi: diff + q * se, tr };
}

export interface T1wayGruppe { name: string; n: number; h: number; mittel: number; winVar: number }
export interface T1wayErgebnis { F: number; df1: number; df2: number; p: number; tr: number; gruppen: T1wayGruppe[] }
/** Getrimmte einfaktorielle Varianzanalyse (R WRS2::t1way, Welch-artig). `gruppen`: mindestens zwei. */
export function t1way(gruppen: { name: string; werte: number[] }[], tr = TRIM_STANDARD): T1wayErgebnis | RobustFehler {
  const J = gruppen.length;
  if (J < 2 || gruppen.some(g => wenigFehler(g.werte, tr))) return { fehler: 'zu-wenig' };
  const gr = gruppen.map(g => ({ name: g.name, n: g.werte.length, h: trimH(g.werte.length, tr), mittel: trimMittel(g.werte, tr), winVar: winVar(g.werte, tr) }));
  if (gr.some(g => !(g.winVar > 0))) return { fehler: 'keine-streuung' };
  const w = gr.map(g => (g.h * (g.h - 1)) / ((g.n - 1) * g.winVar)), u = w.reduce((a, b) => a + b, 0);
  const xt = w.reduce((s, wi, i) => s + wi * gr[i]!.mittel, 0) / u;
  const A = w.reduce((s, wi, i) => s + wi * (gr[i]!.mittel - xt) ** 2, 0) / (J - 1);
  const sw = w.reduce((s, wi, i) => s + (1 - wi / u) ** 2 / (gr[i]!.h - 1), 0);
  const B = (2 * (J - 2) * sw) / (J * J - 1), F = A / (B + 1), df1 = J - 1, df2 = 1 / ((3 * sw) / (J * J - 1));
  return { F, df1, df2, p: pF(F, df1, df2), tr, gruppen: gr };
}

export interface LinconPaar { i: number; j: number; psihat: number; se: number; t: number; df: number; pRoh: number; p: number }
/** Hochberg-Korrektur (wie R `p.adjust(method = "hochberg")`). */
export function hochberg(p: number[]): number[] {
  const m = p.length, ord = p.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]), aus = new Array<number>(m);
  let laufend = Infinity;
  ord.forEach(([v, i], r) => { laufend = Math.min(laufend, (r + 1) * v); aus[i] = Math.min(1, laufend); });
  return aus;
}
/** Paarvergleiche der getrimmten Mittel (R WRS2::lincon): Differenz, Yuen-t, Freiheitsgrade, rohes p und p nach Hochberg (wie WRS2). Die Intervalle von WRS2 brauchen die studentisierte Maximum-Modulus-Verteilung und fehlen hier. */
export function lincon(gruppen: { name: string; werte: number[] }[], tr = TRIM_STANDARD): LinconPaar[] | RobustFehler {
  if (gruppen.length < 2 || gruppen.some(g => wenigFehler(g.werte, tr))) return { fehler: 'zu-wenig' };
  const m = gruppen.map(g => trimMittel(g.werte, tr)), h = gruppen.map(g => trimH(g.werte.length, tr));
  const w = gruppen.map((g, i) => ((g.werte.length - 1) * winVar(g.werte, tr)) / (h[i]! * (h[i]! - 1)));
  if (w.some(v => !(v > 0))) return { fehler: 'keine-streuung' };
  const paare: LinconPaar[] = [];
  for (let i = 0; i < gruppen.length; i++) for (let j = i + 1; j < gruppen.length; j++) {
    const se = Math.sqrt(w[i]! + w[j]!), psihat = m[i]! - m[j]!, df = (w[i]! + w[j]!) ** 2 / (w[i]! ** 2 / (h[i]! - 1) + w[j]! ** 2 / (h[j]! - 1)), t = psihat / se;
    paare.push({ i, j, psihat, se, t, df, pRoh: pT2(t, df), p: 0 });
  }
  const adj = hochberg(paare.map(q => q.pRoh)); paare.forEach((q, k) => { q.p = adj[k]!; });
  return paare;
}

/** Winsorisieren als Datenschritt: Grenzen sind Perzentile (R `quantile`, type 7) der vorhandenen Werte, Werte außerhalb werden auf die Grenzen gesetzt. Lücken (null) bleiben Lücken. */
export function winsorisiere(werte: (number | null)[], unten = 0.2, oben = 0.8): { neu: (number | null)[]; lo: number; hi: number; geaendert: number } | null {
  const v = sortiert(werte.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)));
  if (v.length < 2 || !(unten >= 0 && oben <= 1 && unten < oben)) return null;
  const lo = quantil7(v, unten), hi = quantil7(v, oben); let geaendert = 0;
  const neu = werte.map(x => { if (typeof x !== 'number' || !Number.isFinite(x)) return x; const y = Math.min(hi, Math.max(lo, x)); if (y !== x) geaendert++; return y; });
  return { neu, lo, hi, geaendert };
}
