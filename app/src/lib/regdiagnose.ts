/**
 * Regression prüfen (Field-Stufe 1, 05.11.2026). Reine Rechnung wie robustse.ts, aus Zeilen der Vorhersagegrößen (ohne Konstante) und y.
 *   je Vorhersagegröße: VIF = Diagonale der inversen Korrelationsmatrix der Vorhersagegrößen, Toleranz = 1/VIF, sr² = t²(1 − R²)/df (quadrierte semipartielle Korrelation);
 *   je Fall: Hebelwert h, standardisiertes Residuum e/(s√(1−h)), studentisiertes (ausgelassenes) Residuum e/(s₍ᵢ₎√(1−h)), Cook-Abstand, DFFITS, DFBETAS;
 *   dazu Durbin-Watson (Reihenfolge der Zeilen wie in den Daten).
 * Sollwerte: R `lm`, `hatvalues`, `rstandard`, `rstudent`, `cooks.distance`, `dffits`, `dfbetas` (docs/fachblaetter/sollwerte/field-stufe1.json), Test regdiagnose.test.ts.
 * Grenzen (Faustregeln, keine Gesetze): |studentisiertes Residuum| > 2, Cook > 4/n (Hinweis stärker bei > 1), Hebel > 2(k + 1)/n (k = Zahl der Vorhersagegrößen), VIF 5 bzw. 10 (Field 2018; Cohen et al. 2003).
 */
import { invers } from './robustse';

export interface DiagnoseGroesse { vif: number; toleranz: number; sr2: number }
export interface DiagnoseFall { hebel: number; rstandard: number; rstudent: number; cook: number; dffits: number; dfbetas: number[] }
export interface DiagnoseErgebnis { n: number; k: number; df: number; r2: number; groessen: DiagnoseGroesse[]; faelle: DiagnoseFall[]; durbinWatson: number; grenzen: { hebel: number; cook: number } }
export type DiagnoseFehler = { fehler: 'zu-wenig-faelle' | 'singulaer' | 'hebel' };

/** `x`: Zeilen der Vorhersagegrößen OHNE Konstante. `dfbetas[j]` eines Falls: j = 0 Konstante, danach die Vorhersagegrößen. */
export function regDiagnose(x: number[][], y: number[]): DiagnoseErgebnis | DiagnoseFehler {
  const n = y.length, p = x[0]?.length ?? 0, k = p + 1;
  if (p < 1 || n < k + 2) return { fehler: 'zu-wenig-faelle' };
  const X = x.map(r => [1, ...r]);
  const xtx = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((s, r) => s + r[i]! * r[j]!, 0)));
  const inv = invers(xtx);
  if (!inv) return { fehler: 'singulaer' };
  const xty = Array.from({ length: k }, (_, j) => X.reduce((s, r, i) => s + r[j]! * y[i]!, 0));
  const b = inv.map(r => r.reduce((s, v, j) => s + v * xty[j]!, 0));
  const e = X.map((r, i) => y[i]! - r.reduce((s, v, j) => s + v * b[j]!, 0));
  const h = X.map(r => { let s = 0; for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) s += r[i]! * inv[i]![j]! * r[j]!; return s; });
  if (h.some(v => v >= 1 - 1e-9)) return { fehler: 'hebel' };
  const df = n - k, rss = e.reduce((s, v) => s + v * v, 0), s2 = rss / df, s = Math.sqrt(s2);
  const my = y.reduce((a, v) => a + v, 0) / n, tss = y.reduce((a, v) => a + (v - my) ** 2, 0), r2 = 1 - rss / tss;
  // Korrelationsmatrix der Vorhersagegrößen und ihre Inverse (VIF)
  const mw = Array.from({ length: p }, (_, j) => x.reduce((a, r) => a + r[j]!, 0) / n);
  const kov = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => x.reduce((a, r) => a + (r[i]! - mw[i]!) * (r[j]! - mw[j]!), 0)));
  const kor = kov.map((r, i) => r.map((v, j) => v / Math.sqrt(kov[i]![i]! * kov[j]![j]!)));
  const korInv = p === 1 ? (Number.isFinite(kor[0]![0]!) ? [[1]] : null) : invers(kor);
  if (!korInv) return { fehler: 'singulaer' };
  const groessen = Array.from({ length: p }, (_, j) => {
    const vif = korInv[j]![j]!, t = b[j + 1]! / Math.sqrt(s2 * inv[j + 1]![j + 1]!);
    return { vif, toleranz: 1 / vif, sr2: (t * t * (1 - r2)) / df };
  });
  const faelle = X.map((r, i) => {
    const hi = h[i]!, ei = e[i]!, s2i = (rss - (ei * ei) / (1 - hi)) / (df - 1), si = Math.sqrt(s2i);
    const rstandard = ei / (s * Math.sqrt(1 - hi)), rstudent = ei / (si * Math.sqrt(1 - hi));
    const cook = (rstandard * rstandard * hi) / (k * (1 - hi));
    const dffits = rstudent * Math.sqrt(hi / (1 - hi));
    const dfbetas = Array.from({ length: k }, (_, j) => { const dfb = (inv[j]!.reduce((a, v, c) => a + v * r[c]!, 0) * ei) / (1 - hi); return dfb / (si * Math.sqrt(inv[j]![j]!)); });
    return { hebel: hi, rstandard, rstudent, cook, dffits, dfbetas };
  });
  let zaehler = 0; for (let i = 1; i < n; i++) zaehler += (e[i]! - e[i - 1]!) ** 2;
  return { n, k, df, r2, groessen, faelle, durbinWatson: zaehler / rss, grenzen: { hebel: (2 * k) / n, cook: 4 / n } };
}

export interface Auffaellig { index: number; grund: { resid: boolean; cook: boolean; cook1: boolean; hebel: boolean } }
/** Fälle mit |studentisiertes Residuum| > 2, Cook > 4/n oder Hebel > 2(k + 1)/n; `index` zählt in `faelle`. */
export function auffaelligeFaelle(r: DiagnoseErgebnis): Auffaellig[] {
  const aus: Auffaellig[] = [];
  r.faelle.forEach((f, index) => {
    const grund = { resid: Math.abs(f.rstudent) > 2, cook: f.cook > r.grenzen.cook, cook1: f.cook > 1, hebel: f.hebel > r.grenzen.hebel };
    if (grund.resid || grund.cook || grund.hebel) aus.push({ index, grund });
  });
  return aus;
}
/** Wie viele Fälle |studentisiertes Residuum| > 2 haben (erwartet bei Normalverteilung etwa 5 %). */
export function residuenUeberZwei(r: DiagnoseErgebnis): { anzahl: number; anteil: number } {
  const anzahl = r.faelle.filter(f => Math.abs(f.rstudent) > 2).length;
  return { anzahl, anteil: anzahl / r.n };
}
