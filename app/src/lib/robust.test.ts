import { beforeAll, describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-b-erwartet.json';
import { nodeEngine } from './testengine';
import * as robust from './robust';
import { getrimmtesMittel } from './robust';

/* ===== Welle S-B, Teil 4: 5 %-getrimmtes Mittel genau wie SPSS/PSPP (Fachblatt Abschnitt 4 und „Entscheidungen Opus“, „Belege IBM“) =====
 * Sollwerte: scripts/spaeter-b-erwartet.R → testdaten/spaeter-b-erwartet.json (Abschnitt robust): die IBM-Formel (SPSS Algorithms, EXAMINE „5% Trimmed Mean“) in R, in einer zweiten Fassung (Überlappung der Gewichtsstrecken)
 * gegengeprüft, und die PSPP-Engine (EXAMINE, Zeile „5% Trimmed Mean“) auf 1e-9 - dieser Test lässt die Engine zusätzlich live laufen. Der Bauer ändert Test und JSON nicht.
 * Das Modul `lib/robust.ts` (reine Funktionen, keine Oberfläche) hat diese API - sie ist hier festgelegt:
 *
 *   getrimmtesMittel(werte: number[], gewichte?: number[], anteil?: number /* 0,05 *\/): number | null
 *       Ohne Gewichte zählt jeder Wert 1. W = Σ Gewichte der gültigen Werte (Wert endlich UND Gewicht endlich > 0; ungültige Paare fallen weg); abgeschnitten werden unten und oben je anteil·W GEWICHTSANTEILE, ein Randwert zählt also ANTEILIG:
 *       TM = Σ x₍ᵢ₎ · w̃ᵢ / ((1 − 2·anteil)·W) mit w̃ᵢ = Länge des Überlapps der Strecke [cum₍ᵢ₋₁₎, cumᵢ] mit [anteil·W, (1 − anteil)·W] (identisch mit der IBM-Formel). Gewichte dürfen Kommazahlen sein.
 *       Kein gültiger Wert: null (nie NaN). n = 1: der Wert; alle Werte gleich: der Wert.
 *       NICHT `mean(x, trim)` aus R: das schneidet floor(n·0,05) GANZE Werte ab (n < 20: nichts) - bei n = 10 ist R-trim das ungetrimmte Mittel (9,10), SPSS/PSPP 7,7778.
 * Huber-M: ENTFÄLLT in S-B (Entscheidung Opus: nur bei vollständig belegter SPSS-Definition UND getroffenem SPSS-Ergebnis). Belegt: Skala (roher MAD), Gewichtsfunktion, k = 1,339, Iteration, Abbruch (0,5 %, 30 Schritte);
 * NICHT belegt: der Startwert und jedes SPSS-Ergebnis. Der Prüferbericht und das JSON (robust.huber) halten die Zahlen fest; Johannes legt einen SPSS-Ausdruck ab (Liste für Johannes).
 */

const R = (erwartet as any).robust;
const nah = (ist: number, soll: number, tol = 1e-9, was = '') => expect(Math.abs(ist - soll), `${was} ${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });
type Item = { type: string; label?: string; rows?: number; cols?: number; cells?: { r: number; c: number; n?: number; t: string }[] };
const csv = (x: number[], w?: number[]) => new TextEncoder().encode(x.map((v, i) => (w ? `${v},${w[i]}` : `${v},1`)).join('\n') + '\n');
/** PSPP EXAMINE: die Zeile „5% Trimmed Mean“ der Tabelle „Descriptives“. */
function engineGetrimmt(x: number[], w?: number[]): number {
  const out = e.run(`DATA LIST FILE='/d.csv' LIST (',') /x w (F10.4).\n${w ? 'WEIGHT BY w.\n' : ''}EXAMINE VARIABLES=x /PLOT=NONE /STATISTICS=DESCRIPTIVES.`, { '/d.csv': csv(x, w) }) as unknown as Item[];
  const t = out.find(i => i.type === 'table' && /Descriptives/.test(i.label ?? '')); expect(t, 'Tabelle Descriptives').toBeTruthy();
  const zeile = t!.cells!.find(c => /5% Trimmed Mean/.test(c.t)); expect(zeile, 'Zeile 5% Trimmed Mean').toBeTruthy();
  const wert = t!.cells!.find(c => c.r === zeile!.r && typeof c.n === 'number'); return wert!.n!;
}
/** Zweite, unabhängige Fassung im Test: Überlappung der Gewichtsstrecken (kein Code der App). */
function ueberlapp(x: number[], w: number[], a: number): number {
  const p = x.map((v, i) => [v, w[i]!] as const).filter(([, g]) => g > 0).sort((u, v) => u[0] - v[0]), W = p.reduce((s, [, g]) => s + g, 0); let cum = 0, s = 0;
  for (const [v, g] of p) { const lo = Math.max(cum, a * W), hi = Math.min(cum + g, (1 - a) * W); if (hi > lo) s += (hi - lo) * v; cum += g; }
  return s / ((1 - 2 * a) * W);
}

describe('5 %-getrimmtes Mittel: Sollwerte aus R (IBM-Formel) und PSPP-Engine', () => {
  for (const name of Object.keys(R.getrimmt)) it(`${name}`, () => {
    const f = R.getrimmt[name], x = f.x as number[], w = f.w as number[] | null;
    const t = getrimmtesMittel(x, w ?? undefined); expect(t).not.toBeNull(); nah(t!, f.getrimmt, 1e-12, 'gegen R');
    if (f.pspp_getrimmt !== undefined && f.pspp_getrimmt !== null) { nah(t!, f.pspp_getrimmt, 1e-9, 'gegen die PSPP-Konstante'); nah(engineGetrimmt(x, w ?? undefined), t!, 1e-9, 'gegen die Engine live'); }
    expect(Number.isNaN(t!)).toBe(false);
  });
  it('n = 10 (2,3,3,4,5,6,7,9,12,40): SPSS/PSPP 7,7778 = (0,5·2 + 3 + 3 + 4 + 5 + 6 + 7 + 9 + 12 + 0,5·40)/9 anteilig - NICHT das ungetrimmte 9,10 von R mean(x, trim = 0,05)', () => {
    const x = R.getrimmt.n10.x as number[]; nah(getrimmtesMittel(x)!, 7.777777777777778, 1e-12); expect(R.getrimmt.n10.r_trim_zur_abgrenzung).toBeCloseTo(9.1, 12); expect(R.getrimmt.n10.r_trim_ist_ungetrimmt).toBe(true);
    nah(getrimmtesMittel(x)!, (0.5 * 2 + 3 + 3 + 4 + 5 + 6 + 7 + 9 + 12 + 0.5 * 40) / 9, 1e-12);
  });
  it('n = 20 (genau ein Wert je Seite) stimmt mit R mean(x, trim) überein, n = 25 (1,25 Werte je Seite) weicht ab', () => {
    const f20 = R.getrimmt.n20, f25 = R.getrimmt.n25; nah(f20.getrimmt, f20.r_trim_zur_abgrenzung, 1e-9); expect(Math.abs(f25.getrimmt - f25.r_trim_zur_abgrenzung)).toBeGreaterThan(1e-3);
  });
  it('gewichtet ganzzahlig = die erweiterte Menge (Zeile w-mal); nicht ganzzahlig geht (PSPP rechnet mit Doubles)', () => {
    const g = R.getrimmt.gewicht_ganz, x = g.x as number[], w = g.w as number[], ext = x.flatMap((v, i) => Array(w[i]).fill(v)); nah(getrimmtesMittel(x, w)!, getrimmtesMittel(ext)!, 1e-12);
    const k = R.getrimmt.gewicht_komma; expect((k.w as number[]).some(v => v !== Math.round(v))).toBe(true); nah(getrimmtesMittel(k.x, k.w)!, k.pspp_getrimmt, 1e-9);
  });
});

describe('Eigenschaften (zweite Fassung im Test: Überlappung der Gewichtsstrecken)', () => {
  const lcg = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  it('300 Zufallsfälle (n = 1 bis 40, mit und ohne Gewichte, Anteil 0,05 / 0,1 / 0,25): gleiche Zahl wie die Überlappung', () => {
    const r = lcg(7);
    for (let k = 0; k < 300; k++) {
      const n = 1 + Math.floor(r() * 40), x = Array.from({ length: n }, () => Math.round((r() * 40 - 10) * 100) / 100), w = k % 2 ? Array.from({ length: n }, () => 0.2 + Math.floor(r() * 50) / 10) : undefined, a = [0.05, 0.1, 0.25][k % 3]!;
      nah(getrimmtesMittel(x, w, a)!, ueberlapp(x, w ?? x.map(() => 1), a), 1e-10, `Fall ${k}`);
    }
  });
  it('Reihenfolge der Eingabe egal; Gewicht 0, fehlende und nicht endliche Werte zählen nicht', () => {
    const x = [40, 3, 2, 12, 5, 6, 7, 9, 4, 3], a = getrimmtesMittel(x)!; nah(a, 7.777777777777778, 1e-12);
    nah(getrimmtesMittel([...x, 99, NaN, Infinity], [...x.map(() => 1), 0, 1, 1])!, a, 1e-12);
    nah(getrimmtesMittel([2, 3, 3, 4, 5, 6, 7, 9, 12, 40, 100], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0])!, a, 1e-12);
  });
  it('Anteil 0 = gewichtetes Mittel; symmetrische Daten: getrimmtes Mittel = Mittel', () => {
    nah(getrimmtesMittel([1, 2, 4, 9], [2, 1, 3, 1], 0)!, (2 + 2 + 12 + 9) / 7, 1e-12); const s = R.getrimmt.symmetrisch; nah(getrimmtesMittel(s.x)!, s.mittel, 1e-12);
  });
  it('Ränder: kein gültiger Wert → null, n = 1 → der Wert, alle Werte gleich → der Wert, n = 2, negative Werte', () => {
    expect(getrimmtesMittel([])).toBeNull(); expect(getrimmtesMittel([NaN, NaN])).toBeNull(); expect(getrimmtesMittel([5, 6], [0, 0])).toBeNull();
    nah(getrimmtesMittel([7])!, 7, 1e-12); nah(getrimmtesMittel(R.getrimmt.alle_gleich.x)!, 4, 1e-12); nah(getrimmtesMittel([3, 9])!, 6, 1e-12);
    nah(getrimmtesMittel(R.getrimmt.negativ.x)!, R.getrimmt.negativ.getrimmt, 1e-12); expect(R.getrimmt.n1.getrimmt).toBe(7); expect(R.getrimmt.n3.n).toBe(3); expect(R.getrimmt.mad_null.x).toEqual([1, 1, 1, 1, 2]);
  });
  it('die Werte bleiben in den Daten: die Funktion verändert ihre Eingabe nicht', () => { const x = [5, 1, 9, 3], w = [1, 2, 1, 1]; getrimmtesMittel(x, w); expect(x).toEqual([5, 1, 9, 3]); expect(w).toEqual([1, 2, 1, 1]); });
});

describe('Huber-M entfällt in S-B (Entscheidung Opus: ohne belegten Startwert und ohne SPSS-Ergebnis keine Zahl mit SPSS-Namen)', () => {
  it('das Modul bietet kein Huber-M an; die IBM-Belege und die Lücke stehen im JSON', () => {
    expect(Object.keys(robust).filter(k => /huber/i.test(k)), 'Huber-M nur bauen, wenn Opus die Entscheidung ändert').toEqual([]);
    const h = R.huber; expect(h.belegt.skala).toMatch(/roh/); expect(h.nicht_belegt.startwert).toBeTruthy(); expect(h.nicht_belegt.gedrucktes_ergebnis).toBeTruthy();
    nah(h.beispiel_ergebnis.fixpunkt, 5.7639, 1e-4);   // der Fixpunkt der IBM-Definition ist die Variante B des Fachblatts, nicht A (6,1157)
  });
  it.todo('Huber-M (IBM-Definition: roher MAD, k = 1,339, Abbruch 0,5 %, 30 Schritte) - erst nach einem SPSS-Ausdruck mit bekanntem Startwert (Liste für Johannes)');
});
