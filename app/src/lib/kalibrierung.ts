/**
 * Kalibriergerade mit Nachweis-, Erfassungs- und Bestimmungsgrenze nach dem Vorgehen der DIN 32645 (S-I, 22.10.2026). Reine Rechnung.
 *   Gerade y = a + b·x (kleinste Quadrate), Reststreuung s = s_yx, Qxx = Σ(x − x̄)², n Punkte, m = 1 Messung der Probe.
 *   Nachweisgrenze  x_NG = (s/b)·t(f; 1 − α)·√(1/m + 1/n + x̄²/Qxx), einseitig, f = n − 2.
 *   Erfassungsgrenze x_EG = 2·x_NG (Näherung, wie in R `chemCal::lod(method = "din")` bei α = β).
 *   Bestimmungsgrenze: x_BG = k·(s/b)·t(f; 1 − α/2)·√(1/m + 1/n + (x_BG − x̄)²/Qxx), k = 3 (relative Ergebnisunsicherheit 33 %); die Gleichung ist in x_BG quadratisch und wird geschlossen gelöst.
 * Sollwerte: R `chemCal` (lod, loq mit α = 0,01 und 0,05), siehe kalibrierung.test.ts.
 * ⚠ Von der Fachperson abzunehmen: Irrtumswahrscheinlichkeit (DIN: meist 1 %), Mindestzahl und Verteilung der Kalibrierpunkte (DIN: mindestens 6, gleichabstandig, Bereich nahe null), Linearität, Varianzhomogenität.
 */
import { tQuantil } from './verteilung';
export interface Kalibrierung {
  n: number; a: number; b: number; s: number; r2: number; xMittel: number; qxx: number;
  /** Verfahrensstandardabweichung s_x0 = s/b und Verfahrensvariationskoeffizient V_x0 = s_x0/x̄ */
  sx0: number; vx0: number;
  ng: number; eg: number; bg: number | null;
  alpha: number; k: number;
}
export type KalibrierFehler = { fehler: 'zu-wenig-punkte' | 'keine-streuung' | 'keine-steigung' | 'alpha' };

export function kalibrierung(punkte: [number, number][], alpha = 0.01, k = 3): Kalibrierung | KalibrierFehler {
  const p = punkte.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), n = p.length;
  if (!(alpha > 0 && alpha < 0.5)) return { fehler: 'alpha' };
  if (n < 4) return { fehler: 'zu-wenig-punkte' };
  const xm = p.reduce((s, q) => s + q[0], 0) / n, ym = p.reduce((s, q) => s + q[1], 0) / n;
  const qxx = p.reduce((s, q) => s + (q[0] - xm) ** 2, 0), qxy = p.reduce((s, q) => s + (q[0] - xm) * (q[1] - ym), 0), qyy = p.reduce((s, q) => s + (q[1] - ym) ** 2, 0);
  if (!(qxx > 0)) return { fehler: 'keine-streuung' };
  const b = qxy / qxx, a = ym - b * xm;
  if (!(Math.abs(b) > 0)) return { fehler: 'keine-steigung' };
  const rss = p.reduce((s, q) => s + (q[1] - a - b * q[0]) ** 2, 0), f = n - 2, s = Math.sqrt(rss / f);
  const sx0 = s / Math.abs(b), m = 1;
  const ng = sx0 * tQuantil(1 - alpha, f) * Math.sqrt(1 / m + 1 / n + (xm * xm) / qxx);
  // BG: x² = c²(1/m + 1/n + (x − x̄)²/Qxx) mit c = k·s_x0·t(α/2)
  const c = k * sx0 * tQuantil(1 - alpha / 2, f), c2 = c * c, A = 1 - c2 / qxx, B = (2 * c2 * xm) / qxx, C = -c2 * (1 / m + 1 / n + (xm * xm) / qxx);
  let bg: number | null = null;
  if (A > 0) { const D = B * B - 4 * A * C; if (D >= 0) bg = (-B + Math.sqrt(D)) / (2 * A); }
  return { n, a, b, s, r2: qyy > 0 ? 1 - rss / qyy : 1, xMittel: xm, qxx, sx0, vx0: xm !== 0 ? sx0 / Math.abs(xm) : Infinity, ng, eg: 2 * ng, bg, alpha, k };
}
