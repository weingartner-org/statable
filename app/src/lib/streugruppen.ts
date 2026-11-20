/**
 * Streudiagramm nach Gruppe: Punkte je Gruppe mit eigener Farbe UND Form, Gerade je Gruppe (kleinste Quadrate), optional eine LOESS-Linie über alle Punkte,
 * dazu die Textfassung (Sätze und Tabelle). Reine Rechnung; das Bild steht in bausteine/GruppenStreudiagramm.svelte. Test: streugruppen.test.ts.
 */
import { istFehlend } from './fehlend';
import type { Spalte } from './verzeichnis';
import { istKategorie, verschiedene, stufe } from './datendiagramm';
import { FORMEN } from './fragediagramm';
import { loessLinie } from './loess';
import { zahlDe } from './format';
import { L, Lp } from './sitzung.svelte';

type Zeilen = (string | number | null)[][];
/** So viele Gruppen haben eine eigene Form und Farbe-Form-Verbindung (Kreis, Quadrat, Dreieck, Raute); mehr lassen sich nicht sicher unterscheiden. */
export const STREU_GRUPPEN_MAX = FORMEN.length;
export interface StreuGruppe { name: string; n: number; /** Gerade y = a + b·x; null bei weniger als 3 Punkten oder ohne Streuung in x */ a: number | null; b: number | null; r: number | null }
export interface GruppenStreu { gruppen: StreuGruppe[]; punkte: [number, number, number][]; ausgelassen: number; loess: [number, number][] }

const gueltig = (sp: Spalte, v: unknown): v is string | number => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && (!Number.isFinite(v) || istFehlend(sp, v)));
const idx = (sp: Spalte, spalten: Spalte[]) => spalten.findIndex(x => x.name === sp.name);

/** Spalten, die sich als Gruppe eignen: Text, nominal oder beschriftet, mit 2 bis `max` verschiedenen Werten (Standard STREU_GRUPPEN_MAX). */
export function gruppenSpalten(spalten: Spalte[], zeilen: Zeilen, ausser: string[] = [], max: number = STREU_GRUPPEN_MAX): Spalte[] {
  return spalten.filter(sp => {
    if (ausser.includes(sp.name) || sp.art === 'datum' || !istKategorie(sp, zeilen, spalten)) return false;
    const v = verschiedene(sp, zeilen, spalten, max);
    return v >= 2 && v <= max;
  });
}

/** Gerade der kleinsten Quadrate und r. */
export function gerade(p: [number, number][]): { a: number; b: number; r: number } | null {
  const n = p.length;
  if (n < 3) return null;
  const mx = p.reduce((s, q) => s + q[0], 0) / n, my = p.reduce((s, q) => s + q[1], 0) / n;
  const sxx = p.reduce((s, q) => s + (q[0] - mx) ** 2, 0), syy = p.reduce((s, q) => s + (q[1] - my) ** 2, 0), sxy = p.reduce((s, q) => s + (q[0] - mx) * (q[1] - my), 0);
  if (!(sxx > 0)) return null;
  const b = sxy / sxx;
  return { a: my - b * mx, b, r: syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0 };
}

/** Punkte [x, y, Gruppenindex] aus den Zeilen; Zeilen ohne x, y oder Gruppe werden gezählt und ausgelassen. Ohne `g`: eine Gruppe ohne Namen. */
export function gruppenStreu(x: Spalte, y: Spalte, g: Spalte | null, zeilen: Zeilen, spalten: Spalte[], mitLoess = false): GruppenStreu | null {
  const ix = idx(x, spalten), iy = idx(y, spalten), ig = g ? idx(g, spalten) : -1;
  if (ix < 0 || iy < 0 || (g && ig < 0)) return null;
  const roh: [number, number, string | number][] = [];
  let aus = 0;
  for (const z of zeilen) {
    const a = z[ix], b = z[iy], c = g ? z[ig] : 0;
    if (typeof a === 'number' && typeof b === 'number' && gueltig(x, a) && gueltig(y, b) && (!g || gueltig(g, c))) roh.push([a, b, c as string | number]); else aus++;
  }
  const stufen = g ? [...new Set(roh.map(r => r[2]))].sort((p, q) => (typeof p === 'number' && typeof q === 'number' ? p - q : String(p).localeCompare(String(q), undefined, { numeric: true }))) : [0];
  if (g && stufen.length > STREU_GRUPPEN_MAX) return null;
  const punkte = roh.map(r => [r[0], r[1], stufen.indexOf(r[2])] as [number, number, number]);
  const gruppen = stufen.map((s, i) => {
    const p = punkte.filter(q => q[2] === i).map(q => [q[0], q[1]] as [number, number]), l = gerade(p);
    return { name: g ? stufe(g, s) : '', n: p.length, a: l?.a ?? null, b: l?.b ?? null, r: l?.r ?? null };
  });
  return { gruppen, punkte, ausgelassen: aus, loess: mitLoess ? loessLinie(punkte.map(q => [q[0], q[1]] as [number, number])) : [] };
}

/** Textfassung: Sätze und Tabelle (eine Zeile je Gruppe), bei höchstens 60 Punkten dazu jeder Punkt in einer zweiten Tabelle. */
export function streuText(d: GruppenStreu, xText: string, yText: string, loessAn: boolean) {
  const n = d.punkte.length, mitGruppen = d.gruppen.length > 1 || !!d.gruppen[0]?.name;
  const xs = d.punkte.map(p => p[0]), ys = d.punkte.map(p => p[1]);
  const saetze: string[] = [
    Lp(n, `Streudiagramm (Punktwolke) mit ${n} Punkt.`, `Streudiagramm (Punktwolke) mit ${n} Punkten.`, `Scatter plot with ${n} point.`, `Scatter plot with ${n} points.`),
    L(`Waagrechte Achse: ${xText}, Werte von ${zahlDe(Math.min(...xs))} bis ${zahlDe(Math.max(...xs))}. Senkrechte Achse: ${yText}, Werte von ${zahlDe(Math.min(...ys))} bis ${zahlDe(Math.max(...ys))}.`,
      `Horizontal axis: ${xText}, values from ${zahlDe(Math.min(...xs))} to ${zahlDe(Math.max(...xs))}. Vertical axis: ${yText}, values from ${zahlDe(Math.min(...ys))} to ${zahlDe(Math.max(...ys))}.`)
  ];
  if (d.ausgelassen) saetze.push(Lp(d.ausgelassen, `${d.ausgelassen} Zeile ohne alle Angaben bleibt weg.`, `${d.ausgelassen} Zeilen ohne alle Angaben bleiben weg.`, `${d.ausgelassen} row without all values is left out.`, `${d.ausgelassen} rows without all values are left out.`));
  const form = [L('Kreis', 'circle'), L('Quadrat', 'square'), L('Dreieck', 'triangle'), L('Raute', 'diamond')];
  d.gruppen.forEach((g, i) => {
    const wer = mitGruppen ? `${g.name} (${L('Form', 'shape')}: ${form[i % form.length]})` : L('Alle Punkte', 'All points');
    saetze.push(g.b === null
      ? L(`${wer}: ${g.n} Punkte, keine Gerade (zu wenig Punkte oder keine Streuung in ${xText}).`, `${wer}: ${g.n} points, no line (too few points or no spread in ${xText}).`)
      : L(`${wer}: ${g.n} Punkte. Gerade: ${yText} = ${zahlDe(g.a!, 2)} ${g.b >= 0 ? '+' : '-'} ${zahlDe(Math.abs(g.b), 2)} · ${xText}, Korrelation r = ${zahlDe(g.r!, 2)}.`,
        `${wer}: ${g.n} points. Line: ${yText} = ${zahlDe(g.a!, 2)} ${g.b >= 0 ? '+' : '-'} ${zahlDe(Math.abs(g.b), 2)} · ${xText}, correlation r = ${zahlDe(g.r!, 2)}.`));
  });
  if (loessAn && d.loess.length) {
    const nahe = [0, 15, 30, 45, 60].map(i => d.loess[Math.min(i, d.loess.length - 1)]!);
    saetze.push(L(`LOESS-Linie (gepunktet, über alle Punkte): ${nahe.map(p => `bei ${zahlDe(p[0], 2)} ist sie ${zahlDe(p[1], 2)}`).join('; ')}.`,
      `LOESS line (dotted, across all points): ${nahe.map(p => `at ${zahlDe(p[0], 2)} it is ${zahlDe(p[1], 2)}`).join('; ')}.`));
  } else if (loessAn) saetze.push(L('Die LOESS-Linie lässt sich hier nicht rechnen (zu wenige Punkte oder zu wenige verschiedene Werte).', 'The LOESS line cannot be calculated here (too few points or too few different values).'));
  const kopf = [mitGruppen ? L('Gruppe', 'Group') : L('Punkte', 'Points'), 'n', L('Achsenabschnitt', 'Intercept'), L('Steigung', 'Slope'), 'r'];
  const zeilen = d.gruppen.map(g => [g.name || L('alle', 'all'), String(g.n), g.a === null ? '-' : zahlDe(g.a, 3), g.b === null ? '-' : zahlDe(g.b, 3), g.r === null ? '-' : zahlDe(g.r, 3)]);
  const punkteTabelle = n <= 60 ? { kopf: [L('Nr.', 'No.'), xText, yText, ...(mitGruppen ? [L('Gruppe', 'Group')] : [])], zeilen: d.punkte.map((p, i) => [String(i + 1), zahlDe(p[0]), zahlDe(p[1]), ...(mitGruppen ? [d.gruppen[p[2]]!.name] : [])]) } : null;
  return { saetze, kopf, zeilen, punkteTabelle };
}
