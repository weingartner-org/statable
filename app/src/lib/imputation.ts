/**
 * Mehrfachimputation und Regression mit zusammengefassten Ergebnissen (S-H, 23.10.2026). Reine Rechnung im Browser, Zufall mit festem Startwert.
 *   Imputation wie R `mice` (Standard für Zahlen): verkettete Gleichungen, „predictive mean matching“: jede Spalte mit Lücken wird der Reihe nach aus allen anderen Spalten (mit der Konstante) vorhergesagt;
 *   Schätzer aus den beobachteten Zeilen, eine Ziehung (σ*² = RSS/χ²(n − p), β* ~ N(β̂, σ*²(X'X)⁻¹)); je fehlendem Fall werden die 5 nächsten beobachteten Fälle gesucht
 *   (Vergleich ŷ_beobachtet mit β̂ gegen ŷ_fehlend mit β*, „Typ 1“) und einer davon zufällig übernommen. Start: Zufallsziehung aus den beobachteten Werten, 10 Durchläufe je Datensatz, m Datensätze.
 *   Zusammenfassung nach Rubin (1987): Q̄ = Mittel der Schätzer, Ū = Mittel der Varianzen, B = Varianz der Schätzer, T = Ū + (1 + 1/m)B; Freiheitsgrade nach Barnard und Rubin (1999);
 *   λ = (1 + 1/m)B/T (Anteil der Varianz durch die Lücken), r = (1 + 1/m)B/Ū, FMI = (r + 2/(ν + 3))/(r + 1).
 * Sollwerte: Zusammenfassung exakt gegen R `mice::pool` (gleiche Datensätze); Imputation statistisch gegen `mice` (Zufall, daher Streubereich), siehe imputation.test.ts.
 * ⚠ Von der Fachperson abzunehmen: Mindestzahl m (20), Grenze für den Anteil fehlender Werte, nur Zahlenspalten, nur Annahme „fehlt zufällig gegeben die anderen Spalten“ (MAR).
 */
import { zufall } from './zufall';
import { tQuantil, tSchwaenze } from './verteilung';

/** Gauß-Jordan-Inverse, null bei Singularität. */
function invers(a: number[][]): number[][] | null {
  const n = a.length, m = a.map((z, i) => [...z, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r]![c]!) > Math.abs(m[p]![c]!)) p = r;
    if (Math.abs(m[p]![c]!) < 1e-12) return null;
    [m[c], m[p]] = [m[p]!, m[c]!];
    const d = m[c]![c]!; for (let j = 0; j < 2 * n; j++) m[c]![j]! /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = m[r]![c]!; if (f !== 0) for (let j = 0; j < 2 * n; j++) m[r]![j]! -= f * m[c]![j]!; }
  }
  return m.map(z => z.slice(n));
}
const cholL = (M: number[][]): number[][] | null => {
  const p = M.length, L = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  for (let i = 0; i < p; i++) for (let j = 0; j <= i; j++) { let s = M[i]![j]!; for (let k = 0; k < j; k++) s -= L[i]![k]! * L[j]![k]!; if (i === j) { if (!(s > 0)) return null; L[i]![i] = Math.sqrt(s); } else L[i]![j] = s / L[j]![j]!; }
  return L;
};

/** Kleinste Quadrate mit Konstante: Koeffizienten, Kovarianzmatrix, Freiheitsgrade, Restquadratsumme; null bei Singularität. */
export function olsMitKonstante(x: number[][], y: number[]): { b: number[]; cov: number[][]; df: number; rss: number; xtxInv: number[][] } | null {
  const n = y.length, k = (x[0]?.length ?? 0) + 1, X = x.map(r => [1, ...r]);
  const xtx = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((s, r) => s + r[i]! * r[j]!, 0)));
  const inv = invers(xtx); if (!inv) return null;
  const xty = Array.from({ length: k }, (_, i) => X.reduce((s, r, t) => s + r[i]! * y[t]!, 0));
  const b = inv.map(r => r.reduce((s, v, j) => s + v * xty[j]!, 0));
  const rss = X.reduce((s, r, t) => s + (y[t]! - r.reduce((a, v, j) => a + v * b[j]!, 0)) ** 2, 0), df = n - k;
  if (!(df > 0)) return null;
  const s2 = rss / df;
  return { b, cov: inv.map(r => r.map(v => v * s2)), df, rss, xtxInv: inv };
}

export interface PoolZeile { q: number; se: number; t: number; df: number; p: number; lo: number; hi: number; lambda: number; riv: number; fmi: number }
/** Zusammenfassung nach Rubin; `q[i][j]`: Schätzer j im Datensatz i, `u[i][j]`: seine Varianz; `dfCom`: Freiheitsgrade der Analyse bei vollständigen Daten. */
export function poolen(q: number[][], u: number[][], dfCom: number): PoolZeile[] {
  const m = q.length, k = q[0]!.length;
  return Array.from({ length: k }, (_, j) => {
    const qs = q.map(r => r[j]!), qb = qs.reduce((a, v) => a + v, 0) / m, ub = u.reduce((a, r) => a + r[j]!, 0) / m;
    const b = m > 1 ? qs.reduce((a, v) => a + (v - qb) ** 2, 0) / (m - 1) : 0, t = ub + (1 + 1 / m) * b;
    const lambda = t > 0 ? ((1 + 1 / m) * b) / t : 0, riv = ub > 0 ? ((1 + 1 / m) * b) / ub : 0;
    const dfAlt = lambda > 0 ? (m - 1) / lambda ** 2 : Infinity, dfBeob = ((dfCom + 1) / (dfCom + 3)) * dfCom * (1 - lambda);
    const df = Number.isFinite(dfAlt) ? (dfAlt * dfBeob) / (dfAlt + dfBeob) : dfBeob;
    const se = Math.sqrt(t), tw = qb / se, qq = tQuantil(0.975, df);
    return { q: qb, se, t: tw, df, p: 2 * tSchwaenze(Math.abs(tw), df).oben, lo: qb - qq * se, hi: qb + qq * se, lambda, riv, fmi: (riv + 2 / (df + 3)) / (riv + 1) };
  });
}

/* ---------- Imputation ---------- */
export interface ImputOpt { m?: number; durchlaeufe?: number; donoren?: number; startwert?: number }
export type ImputFehler = { fehler: 'zu-wenig-faelle' | 'keine-luecken' | 'zu-viele-luecken' | 'spalte-leer' | 'singulaer' };

export function imputiere(spalten: (number | null)[][], opt: ImputOpt = {}): number[][][] | ImputFehler {
  const m = opt.m ?? 20, iter = opt.durchlaeufe ?? 10, d = opt.donoren ?? 5, zuf = zufall(opt.startwert ?? 1);
  const p = spalten.length, n = spalten[0]?.length ?? 0;
  if (p < 2 || n < p + 3) return { fehler: 'zu-wenig-faelle' };
  const fehlt = spalten.map(c => c.map(v => v === null || !Number.isFinite(v)));
  if (!fehlt.some(f => f.some(Boolean))) return { fehler: 'keine-luecken' };
  if (fehlt.some(f => f.every(Boolean))) return { fehler: 'spalte-leer' };
  if (fehlt.some(f => f.filter(Boolean).length / n > 0.5)) return { fehler: 'zu-viele-luecken' };
  const normal = () => { let u = 0; while (u === 0) u = zuf(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * zuf()); };
  const gamma = (a: number): number => { if (a < 1) return gamma(a + 1) * zuf() ** (1 / a); const dd = a - 1 / 3, c = 1 / Math.sqrt(9 * dd); for (;;) { let x: number, v: number; do { x = normal(); v = 1 + c * x; } while (v <= 0); v = v ** 3; const u = zuf(); if (Math.log(u) < 0.5 * x * x + dd - dd * v + dd * Math.log(v)) return dd * v; } };
  const chi2 = (nu: number) => 2 * gamma(nu / 2);
  const ergebnis: number[][][] = [];
  for (let kette = 0; kette < m; kette++) {
    const voll = spalten.map((c, j) => { const beob = c.filter((v, i) => !fehlt[j]![i]) as number[]; return c.map((v, i) => (fehlt[j]![i] ? beob[Math.floor(zuf() * beob.length)]! : (v as number))); });
    for (let it = 0; it < iter; it++) {
      for (let j = 0; j < p; j++) {
        const mis = fehlt[j]!.map((f, i) => (f ? i : -1)).filter(i => i >= 0); if (!mis.length) continue;
        const beob = fehlt[j]!.map((f, i) => (f ? -1 : i)).filter(i => i >= 0), andere = Array.from({ length: p }, (_, q) => q).filter(q => q !== j);
        const row = (i: number) => andere.map(q => voll[q]![i]!);
        const fit = olsMitKonstante(beob.map(row), beob.map(i => voll[j]![i]!));
        if (!fit) return { fehler: 'singulaer' };
        // Ziehung wie mice: σ* = √(RSS / χ²(df)), β* = β̂ + σ*·chol(X'X)⁻¹·z
        const sigmaStern = Math.sqrt(fit.rss / chi2(fit.df)), L = cholL(fit.xtxInv.map((r, a) => r.map((v, b) => v + (a === b ? 1e-10 : 0))));
        if (!L) return { fehler: 'singulaer' };
        const z = L.map(() => normal()), bStern = fit.b.map((v, a) => v + sigmaStern * L[a]!.reduce((s, l, c) => s + l * z[c]!, 0));
        const vorh = (b: number[], i: number) => b[0]! + andere.reduce((s, q, c) => s + b[c + 1]! * voll[q]![i]!, 0);
        const yBeob = beob.map(i => vorh(fit.b, i));
        for (const i of mis) {
          const ym = vorh(bStern, i), abstand = beob.map((_, t) => ({ t, a: Math.abs(yBeob[t]! - ym) })).sort((a, b) => a.a - b.a).slice(0, Math.min(d, beob.length));
          voll[j]![i] = voll[j]![beob[abstand[Math.floor(zuf() * abstand.length)]!.t]!]!;
        }
      }
    }
    ergebnis.push(voll);
  }
  return ergebnis;
}

export interface ImputRegression { n: number; m: number; anteilFehlend: number[]; koeff: PoolZeile[]; vollstaendig: { n: number; b: number[]; se: number[] } | null; dfCom: number }
/** Regression von Spalte 0 (Ergebnis) auf die übrigen Spalten (Konstante zuerst) mit Mehrfachimputation und Zusammenfassung. */
export function regressionMitImputation(spalten: (number | null)[][], opt: ImputOpt = {}): ImputRegression | ImputFehler {
  const sätze = imputiere(spalten, opt);
  if (!Array.isArray(sätze)) return sätze;
  const n = spalten[0]!.length, k = spalten.length;
  const q: number[][] = [], u: number[][] = []; let dfCom = n - k;
  for (const voll of sätze) {
    const x = Array.from({ length: n }, (_, i) => voll.slice(1).map(c => c[i]!)), fit = olsMitKonstante(x, voll[0]!);
    if (!fit) return { fehler: 'singulaer' };
    q.push(fit.b); u.push(fit.cov.map((r, i) => r[i]!)); dfCom = fit.df;
  }
  const zeilen = Array.from({ length: n }, (_, i) => spalten.map(c => c[i]!));
  const ganz = zeilen.filter(z => z.every(v => v !== null && Number.isFinite(v as number))) as number[][];
  const cc = ganz.length > k + 1 ? olsMitKonstante(ganz.map(z => z.slice(1)), ganz.map(z => z[0]!)) : null;
  return {
    n, m: sätze.length, anteilFehlend: spalten.map(c => c.filter(v => v === null || !Number.isFinite(v as number)).length / n), koeff: poolen(q, u, dfCom), dfCom,
    vollstaendig: cc ? { n: ganz.length, b: cc.b, se: cc.cov.map((r, i) => Math.sqrt(r[i]!)) } : null
  };
}
