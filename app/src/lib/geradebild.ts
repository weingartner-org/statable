/**
 * Gerade zum Anfassen (Verstehen, 23.10.2026): Regressionsgerade, Korrelation und Bestimmtheitsmaß für Punktwolken.
 * Daten: Anscombe (1973) Quartett (vier Punktwolken mit fast gleichen Kennzahlen); Simpson-Paradox und Ausreißer sind erfundene Lehrbeispiele.
 * Sollwerte: Anscombe: Steigung 0,500, Achsenabschnitt 3,00, r = 0,8165 in allen vier Wolken; siehe geradebild.test.ts.
 */
export type Punkt = { x: number; y: number; g?: number };
export type Gerade = { steigung: number; achse: number; r: number; r2: number; n: number };

export function anpassen(p: Punkt[]): Gerade {
  const n = p.length;
  const mx = p.reduce((s, q) => s + q.x, 0) / n, my = p.reduce((s, q) => s + q.y, 0) / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const q of p) { sxx += (q.x - mx) ** 2; syy += (q.y - my) ** 2; sxy += (q.x - mx) * (q.y - my); }
  const steigung = sxx > 0 ? sxy / sxx : 0;
  const r = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
  return { steigung, achse: my - steigung * mx, r, r2: r * r, n };
}

const X123 = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5];
const Y1 = [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68];
const Y2 = [9.14, 8.14, 8.74, 8.77, 9.26, 8.1, 6.13, 3.1, 9.13, 7.26, 4.74];
const Y3 = [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73];
const X4 = [8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8];
const Y4 = [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.5, 5.56, 7.91, 6.89];
const zip = (xs: number[], ys: number[]): Punkt[] => xs.map((x, i) => ({ x, y: ys[i]! }));

export const ANSCOMBE: Punkt[][] = [zip(X123, Y1), zip(X123, Y2), zip(X123, Y3), zip(X4, Y4)];

/** Drei Gruppen: innerhalb jeder Gruppe steigt y mit x, über alle zusammen fällt y (Simpson-Paradox). Erfunden. */
export const SIMPSON: Punkt[] = (() => {
  const rausch = [0.3, -0.4, 0.2, -0.1, 0.4];
  const gr = [{ x0: 1, y0: 10 }, { x0: 4, y0: 6.5 }, { x0: 7, y0: 3 }];
  return gr.flatMap((g, k) => rausch.map((e, i) => ({ x: g.x0 + i, y: g.y0 + 0.8 * i + e, g: k })));
})();

/** Zehn Punkte nahe einer steigenden Geraden (erfunden); ein elfter Punkt bei x = 14 mit frei wählbarem y. */
export const AUSREISSER_BASIS: Punkt[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((x, i) => ({ x, y: 2 + 0.6 * x + [0.4, -0.5, 0.3, -0.2, 0.5, -0.4, 0.2, -0.3, 0.4, -0.1][i]! }));
export const AUSREISSER_X = 14;
export const mitAusreisser = (y: number): Punkt[] => [...AUSREISSER_BASIS, { x: AUSREISSER_X, y }];
