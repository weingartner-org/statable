/**
 * Reliable Change Index nach Jacobson & Truax (1991) - G16, Fachblatt Welle 2, Paket D (docs/fachblaetter/WELLE2-PSYCHOLOGIE.md).
 * Sollwerte: scripts/tost-rci-erwartet.R (Formel in R, psych::alpha, Jacobson & Truax 1991 Tabelle 1), Tests: tost-rci.test.ts.
 *
 * S_diff = √2 · SD₁ · √(1 − r), SD₁ = SD (n − 1) der VORHER-Werte (nicht der Differenzen), RCI = (x₂ − x₁) / S_diff. |RCI| > 1,96: verlässliche Veränderung.
 * Grenzregel: |RCI| wird vor dem Vergleich auf 12 gültige Stellen gerundet; genau 1,96 gilt nicht als verlässlich. Gültig für 0 <= r < 1 und SD₁ > 0.
 * Die Reliabilität r ist die Retest-Reliabilität (eigentliche Wahl, aus dem Testhandbuch) oder ersatzweise Cronbachs Alpha der Vorher-Items. Kein Cut-off c (klinische Signifikanz).
 * ⚠ von der Fachperson abzunehmen: Alpha als Ersatz für die Retest-Reliabilität.
 */
export const RCI_GRENZE = 1.96;
export type Einordnung = 'verbessert' | 'unveraendert' | 'verschlechtert';
export interface RciGruppe {
  n: number; sdVorher: number; sDiff: number;
  personen: { rci: number; einordnung: Einordnung }[];
  anzahl: Record<Einordnung, number>; anteil: Record<Einordnung, number>;
}

const endlich = (a: number[]) => a.every(v => typeof v === 'number' && Number.isFinite(v));
const mittel = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const varianz = (a: number[]) => { const m = mittel(a); return a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1); };

export function sDiff(sd1: number, r: number): number | null {
  if (!Number.isFinite(sd1) || sd1 <= 0 || !Number.isFinite(r) || r < 0 || r >= 1) return null;
  return Math.sqrt(2) * sd1 * Math.sqrt(1 - r);
}
export function rciWert(x1: number, x2: number, sd1: number, r: number): number | null {
  const s = sDiff(sd1, r);
  return s === null || !Number.isFinite(x1) || !Number.isFinite(x2) ? null : (x2 - x1) / s;
}
/** Einordnung eines RCI; bei „hohe Werte sind schlechter“ kehren sich verbessert und verschlechtert um. */
export function einordnung(rci: number, hoheBesser: boolean): Einordnung {
  if (Number(Math.abs(rci).toPrecision(12)) <= RCI_GRENZE) return 'unveraendert';
  return (rci > 0) === hoheBesser ? 'verbessert' : 'verschlechtert';
}
/** Cronbachs Alpha: k/(k − 1) · (1 − Σ Var(Item) / Var(Summe)), Varianzen mit n − 1. Zeilen = Personen, Spalten = Items. `null` bei weniger als 2 Items oder Personen oder ohne Streuung der Summe. */
export function cronbachAlpha(zeilen: number[][]): number | null {
  const n = zeilen.length, k = zeilen[0]?.length ?? 0;
  if (n < 2 || k < 2 || zeilen.some(z => z.length !== k || !endlich(z))) return null;
  const vSumme = varianz(zeilen.map(z => z.reduce((a, b) => a + b, 0)));
  if (!(vSumme > 0)) return null;
  let vItems = 0; for (let j = 0; j < k; j++) vItems += varianz(zeilen.map(z => z[j]!));
  return (k / (k - 1)) * (1 - vItems / vSumme);
}
/** RCI aller Personen; `null` bei ungleich langen Listen, weniger als 2 Personen, nicht endlichen Werten, ohne Streuung der Vorher-Werte oder ungültigem r. */
export function rciGruppe(vorher: number[], nachher: number[], r: number, hoheBesser: boolean): RciGruppe | null {
  if (vorher.length !== nachher.length || vorher.length < 2 || !endlich(vorher) || !endlich(nachher)) return null;
  const n = vorher.length, sd = Math.sqrt(varianz(vorher)), sdf = sDiff(sd, r);
  if (sdf === null) return null;
  const personen = vorher.map((v, i) => { const rci = (nachher[i]! - v) / sdf; return { rci, einordnung: einordnung(rci, hoheBesser) }; });
  const anzahl: Record<Einordnung, number> = { verbessert: 0, unveraendert: 0, verschlechtert: 0 };
  for (const p of personen) anzahl[p.einordnung]++;
  return { n, sdVorher: sd, sDiff: sdf, personen, anzahl, anteil: { verbessert: anzahl.verbessert / n, unveraendert: anzahl.unveraendert / n, verschlechtert: anzahl.verschlechtert / n } };
}
/** Summenwerte je Person aus den Items; r = Cronbachs Alpha der Vorher-Items. */
export function rciAusItems(vorher: number[][], nachher: number[][], hoheBesser: boolean): (RciGruppe & { alpha: number }) | null {
  if (vorher.length !== nachher.length || nachher.some(z => !endlich(z))) return null;
  const alpha = cronbachAlpha(vorher);
  if (alpha === null) return null;
  const summe = (z: number[][]) => z.map(r => r.reduce((a, b) => a + b, 0));
  const g = rciGruppe(summe(vorher), summe(nachher), alpha, hoheBesser);
  return g && { ...g, alpha };
}
