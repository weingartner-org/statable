/**
 * Kreuztabelle: Residuen je Zelle und weitere Chi-Quadrat-Werte (Field-Stufe 1, 05.11.2026). Reine Rechnung aus den Zählungen (Kreuz.zaehlung.tab).
 *   erwartet E = Zeilensumme · Spaltensumme / n;  standardisiertes Residuum (O − E)/√E;
 *   angepasstes (korrigiertes) Residuum (O − E)/√(E · (1 − Zeilenanteil) · (1 − Spaltenanteil)) - nähert sich einer Standardnormalverteilung (Haberman 1973; wie R `chisq.test()$stdres`);
 *   Likelihood-Quotient G² = 2 Σ O ln(O/E), df = (r − 1)(c − 1), p aus χ²;
 *   bei 2 × 2 Yates-Korrektur: χ² mit (|O − E| − 0,5)² je Zelle (wie R `chisq.test(correct = TRUE)`, dort höchstens um |O − E|).
 * Sollwerte: R (docs/fachblaetter/sollwerte/field-stufe1.json), Kontrolle: PSPP „Likelihood Ratio“ und „Continuity Correction“ (kreuzresiduen.test.ts).
 * Grenze für „auffällig“: |angepasst| > 1,96; bei vielen Zellen die Bonferroni-Grenze z(1 − 0,05/(2·Zellen)).
 */
import { chiQuadratP } from './verteilung';
import { qnorm } from './diagrammdaten';

export interface KreuzResiduen {
  n: number; zeilen: number; spalten: number; df: number;
  erwartet: number[][]; stdres: number[][]; adjres: number[][];
  chi2: number; chi2p: number; g2: number; g2p: number;
  /** Nur bei 2 × 2. */
  yates?: { chi2: number; p: number };
  /** Bonferroni-Grenze für |angepasst| bei dieser Zahl Zellen (immer ≥ 1,96). */
  bonferroni: number;
}

export function kreuzResiduen(tab: number[][]): KreuzResiduen | null {
  const r = tab.length, c = tab[0]?.length ?? 0;
  if (r < 2 || c < 2) return null;
  const zs = tab.map(z => z.reduce((a, v) => a + v, 0)), ss = Array.from({ length: c }, (_, j) => tab.reduce((a, z) => a + z[j]!, 0)), n = zs.reduce((a, v) => a + v, 0);
  if (!n || zs.some(v => v === 0) || ss.some(v => v === 0)) return null;   // leere Zeile oder Spalte: keine erwarteten Häufigkeiten
  const erwartet = tab.map((_, i) => ss.map(sj => (zs[i]! * sj) / n));
  const stdres = tab.map((z, i) => z.map((o, j) => (o - erwartet[i]![j]!) / Math.sqrt(erwartet[i]![j]!)));
  const adjres = tab.map((z, i) => z.map((o, j) => (o - erwartet[i]![j]!) / Math.sqrt(erwartet[i]![j]! * (1 - zs[i]! / n) * (1 - ss[j]! / n))));
  const df = (r - 1) * (c - 1);
  const chi2 = stdres.flat().reduce((a, v) => a + v * v, 0);
  const g2 = 2 * tab.flatMap((z, i) => z.map((o, j) => (o > 0 ? o * Math.log(o / erwartet[i]![j]!) : 0))).reduce((a, v) => a + v, 0);
  const yates = r === 2 && c === 2 ? (() => { const y = tab.flatMap((z, i) => z.map((o, j) => { const d = Math.abs(o - erwartet[i]![j]!); return (d - Math.min(0.5, d)) ** 2 / erwartet[i]![j]!; })).reduce((a, v) => a + v, 0); return { chi2: y, p: chiQuadratP(y, 1) }; })() : undefined;
  return { n, zeilen: r, spalten: c, df, erwartet, stdres, adjres, chi2, chi2p: chiQuadratP(chi2, df), g2, g2p: chiQuadratP(g2, df), ...(yates ? { yates } : {}), bonferroni: Math.max(1.959964, qnorm(1 - 0.05 / (2 * r * c))) };
}

export interface AuffaelligeZelle { zeile: number; spalte: number; beobachtet: number; erwartet: number; adj: number; mehr: boolean; ueberBonferroni: boolean }
/** Zellen mit |angepasst| > 1,96, nach Betrag absteigend. */
export function auffaelligeZellen(tab: number[][], k: KreuzResiduen): AuffaelligeZelle[] {
  const aus: AuffaelligeZelle[] = [];
  tab.forEach((z, i) => z.forEach((o, j) => { const a = k.adjres[i]![j]!; if (Math.abs(a) > 1.959964) aus.push({ zeile: i, spalte: j, beobachtet: o, erwartet: k.erwartet[i]![j]!, adj: a, mehr: a > 0, ueberBonferroni: Math.abs(a) > k.bonferroni }); }));
  return aus.sort((x, y) => Math.abs(y.adj) - Math.abs(x.adj));
}
