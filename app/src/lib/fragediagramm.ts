/**
 * Streudiagramm in Üben-Fragen (bausteine/FrageDiagramm.svelte): reine Rechnung und Textfassung.
 * Die Textfassung („Daten als Tabelle“) ist Teil jeder Diagramm-Frage: sie nennt Achsen, Gruppen, Geraden und jeden Punkt,
 * so dass Screenreader und Braillezeile dasselbe sagen wie das Bild. Zahlformat über lib/format.ts (i18n/profil.ts), Texte über L/Lp/waehle.
 */
import type { Diagramm } from '../lernen/fragen';
import { achsenBereich, achsenMarken } from './diagrammdaten';
import { zahlDe } from './format';
import { L, Lp, waehle } from './sitzung.svelte';

/** Formen der Gruppen; Farbe allein unterscheidet nie (Reihenfolge = Gruppen-Index). */
export const FORMEN = ['kreis', 'quadrat', 'dreieck', 'raute'] as const;
export type Form = typeof FORMEN[number];
/** Strichart der Gerade je Gruppe (Reihenfolge = Gruppen-Index). */
export const STRICHE = ['', '8 5', '2 5', '10 4 2 4'] as const;
export const form = (gruppe: number): Form => FORMEN[gruppe % FORMEN.length]!;
/** Farbe nach Gruppen-Index: zwei Farben der App im Wechsel; die Form trägt den Unterschied. */
export const farbe = (gruppe: number): 'a' | 'b' => (gruppe % 2 === 0 ? 'a' : 'b');

/** Umriss einer Marke mit Mitte (cx, cy) und Halbmaß r (Kreis: <circle>, sonst Pfad). */
export function markenPfad(f: Exclude<Form, 'kreis'>, cx: number, cy: number, r: number): string {
  const p = (x: number, y: number) => `${(cx + x).toFixed(2)} ${(cy + y).toFixed(2)}`;
  if (f === 'quadrat') return `M${p(-r, -r)}L${p(r, -r)}L${p(r, r)}L${p(-r, r)}Z`;
  if (f === 'dreieck') return `M${p(0, -r * 1.2)}L${p(r * 1.15, r * 0.85)}L${p(-r * 1.15, r * 0.85)}Z`;
  return `M${p(0, -r * 1.3)}L${p(r * 1.3, 0)}L${p(0, r * 1.3)}L${p(-r * 1.3, 0)}Z`;
}

const gruppeVon = (z: readonly number[]): number => z[2] ?? 0;
/** Ende einer Gerade am linken und rechten Rand der Punkte ihrer Gruppe (ohne `gruppe`: aller Punkte). */
export function geradenEnden(d: Diagramm): { x0: number; y0: number; x1: number; y1: number; gruppe?: number }[] {
  return (d.geraden ?? []).map(g => {
    const xs = d.punkte.filter(z => g.gruppe === undefined || gruppeVon(z) === g.gruppe).map(z => z[0]!);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    return { x0, y0: g.a + g.b * x0, x1, y1: g.a + g.b * x1, ...(g.gruppe !== undefined ? { gruppe: g.gruppe } : {}) };
  });
}

/** Achsenbereiche und -marken: umfassen alle Punkte und die Enden der Geraden. */
export function bereiche(d: Diagramm) {
  const xs = d.punkte.map(z => z[0]!), ys = d.punkte.map(z => z[1]!);
  for (const e of geradenEnden(d)) ys.push(e.y0, e.y1);
  const xb = achsenBereich(Math.min(...xs), Math.max(...xs)), yb = achsenBereich(Math.min(...ys), Math.max(...ys));
  return { xb, yb, xm: achsenMarken(xb[0], xb[1]), ym: achsenMarken(yb[0], yb[1]) };
}

export const gruppenZahl = (d: Diagramm) => d.gruppen?.length ?? 0;

/** Textfassung: Sätze und Tabelle. Jede Zeile der Tabelle ist ein Punkt, in der Reihenfolge der Daten. */
export function textfassung(d: Diagramm) {
  const n = d.punkte.length;
  const xs = d.punkte.map(z => z[0]!), ys = d.punkte.map(z => z[1]!);
  const von = (v: number[]) => `${zahlDe(Math.min(...v))}`, bis = (v: number[]) => `${zahlDe(Math.max(...v))}`;
  const xn = waehle(d.x), yn = waehle(d.y);
  const saetze: string[] = [
    Lp(n, `Streudiagramm (Punktwolke) mit ${n} Punkt.`, `Streudiagramm (Punktwolke) mit ${n} Punkten.`, `Scatter plot with ${n} point.`, `Scatter plot with ${n} points.`),
    L(`Waagrechte Achse: ${xn}, Werte von ${von(xs)} bis ${bis(xs)}.`, `Horizontal axis: ${xn}, values from ${von(xs)} to ${bis(xs)}.`),
    L(`Senkrechte Achse: ${yn}, Werte von ${von(ys)} bis ${bis(ys)}.`, `Vertical axis: ${yn}, values from ${von(ys)} to ${bis(ys)}.`)
  ];
  d.gruppen?.forEach((g, i) => {
    const m = d.punkte.filter(z => gruppeVon(z) === i).length;
    saetze.push(Lp(m, `Gruppe ${waehle(g)}: ${m} Punkt.`, `Gruppe ${waehle(g)}: ${m} Punkte.`, `Group ${waehle(g)}: ${m} point.`, `Group ${waehle(g)}: ${m} points.`));
  });
  for (const g of d.geraden ?? []) {
    const a = zahlDe(g.a, 2), b = zahlDe(g.b, 2);
    const wer = g.gruppe !== undefined && d.gruppen?.[g.gruppe] ? waehle(d.gruppen[g.gruppe]!) : '';
    saetze.push(wer
      ? L(`Regressionsgerade (Gerade der besten Anpassung) für Gruppe ${wer}: Achsenabschnitt ${a}, Steigung ${b}.`, `Regression line (line of best fit) for group ${wer}: intercept ${a}, slope ${b}.`)
      : L(`Regressionsgerade (Gerade der besten Anpassung): Achsenabschnitt ${a}, Steigung ${b}.`, `Regression line (line of best fit): intercept ${a}, slope ${b}.`));
  }
  const kopf = [L('Nr.', 'No.'), ...(d.gruppen ? [L('Gruppe', 'Group')] : []), xn, yn];
  const zeilen = d.punkte.map((z, i) => [String(i + 1), ...(d.gruppen ? [waehle(d.gruppen[gruppeVon(z)] ?? d.gruppen[0]!)] : []), zahlDe(z[0]!), zahlDe(z[1]!)]);
  return { saetze, kopf, zeilen };
}
