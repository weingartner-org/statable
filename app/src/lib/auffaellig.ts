/**
 * Auffällige Fälle (Später S-C; Fachblatt 4.6, Entscheidung Opus 5): NUR HINWEISE mit Kennzeichnungsspalte, nie automatisch löschen.
 * Regeln: z-Werte (|z| > 3,29; Tabachnick & Fidell 2019) mit der Grenze kleiner Stichproben (n − 1)/√n (Shiffler 1988), Mahalanobis-Abstand D² (Vergleichswert χ² bei p < ,001),
 * gleichförmiges Antworten (Itemblock ab 5 Items), sehr kurze Antwortzeit relativ zum Median. Faustregeln, keine Beweise: „Auffällig heißt nicht falsch.“
 * Das Fallgewicht wird nicht verwendet (datencheck:alle = Hinweis). Dieses Modul bietet absichtlich KEINE Funktion zum Entfernen von Fällen an.
 */
import { fehlendMenge } from './fehlend';
import { chiQuadratP } from './verteilung';
import { L, Lp, d as anrede } from './sitzung.svelte';
import type { Daten } from './umformen';

const gut = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** z = (x − Mittel)/SD mit Nenner n − 1 über die gültigen Werte (ohne Fallgewicht); weniger als 2 gültige Werte oder SD 0 → lauter null. */
export function zWerte(werte: (number | null)[]): (number | null)[] {
  const g = werte.filter(gut), n = g.length;
  if (n < 2) return werte.map(() => null);
  const m = g.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(g.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
  if (!(sd > 0)) return werte.map(() => null);
  return werte.map(v => (gut(v) ? (v - m) / sd : null));
}
/** Der größte mögliche |z| bei n Werten: (n − 1)/√n. */
export const zGrenze = (n: number) => (n > 0 ? (n - 1) / Math.sqrt(n) : 0);
/** Kann die z-Regel bei n Werten überhaupt etwas finden? (erst ab n = 13) */
export const zKannFinden = (n: number, grenze = 3.29) => zGrenze(n) > grenze;
export function zAuffaellig(werte: (number | null)[], grenze = 3.29): { zeile: number; wert: number; z: number }[] {
  const z = zWerte(werte);
  return z.flatMap((x, i) => (x !== null && Math.abs(x) > grenze ? [{ zeile: i, wert: werte[i] as number, z: x }] : []));
}

/* ------------------------------------------------------------------ Mahalanobis */
function umkehre(a: number[][]): number[][] | null {
  const n = a.length, m = a.map((z, i) => [...z, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  const maxDiag = Math.max(...a.map((z, i) => Math.abs(z[i]!)));
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r]![c]!) > Math.abs(m[p]![c]!)) p = r;
    if (Math.abs(m[p]![c]!) < 1e-10 * maxDiag) return null;
    [m[c], m[p]] = [m[p]!, m[c]!];
    const v = m[c]![c]!; for (let j = 0; j < 2 * n; j++) m[c]![j]! /= v;
    for (let r = 0; r < n; r++) if (r !== c) { const f = m[r]![c]!; if (f !== 0) for (let j = 0; j < 2 * n; j++) m[r]![j]! -= f * m[c]![j]!; }
  }
  return m.map(z => z.slice(n));
}
/** χ²-Quantil (1 − p; df) durch Halbieren auf die obere Wahrscheinlichkeit. */
function chiQuantil(p: number, df: number): number {
  let lo = 0, hi = 1000;
  while (chiQuadratP(hi, df) > p) hi *= 2;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (chiQuadratP(m, df) > p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
export type MahalanobisFehler = 'singulaer' | 'zuWenigFaelle' | 'konstant' | 'keineSpalten';
export function mahalanobis(zeilen: (number | null)[][], p = 0.001): { d2: (number | null)[]; df: number; grenze: number; funde: number[]; nGeprueft: number; nichtGeprueft: number } | { fehler: MahalanobisFehler } {
  const k = zeilen.length ? Math.max(...zeilen.map(z => z.length)) : 0;
  if (k === 0) return { fehler: 'keineSpalten' };
  const voll = zeilen.map((z, i) => ({ z, i })).filter(x => x.z.length === k && x.z.every(gut));
  const n = voll.length;
  if (n <= k + 1) return { fehler: 'zuWenigFaelle' };
  const m = Array.from({ length: k }, (_, j) => voll.reduce((a, x) => a + (x.z[j] as number), 0) / n);
  const S = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => voll.reduce((s, x) => s + ((x.z[a] as number) - m[a]!) * ((x.z[b] as number) - m[b]!), 0) / (n - 1)));
  if (S.some((r, i) => !(r[i]! > 0))) return { fehler: 'konstant' };
  const inv = umkehre(S);
  if (!inv) return { fehler: 'singulaer' };
  const d2: (number | null)[] = zeilen.map(() => null);
  for (const x of voll) {
    let s = 0;
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) s += ((x.z[a] as number) - m[a]!) * inv[a]![b]! * ((x.z[b] as number) - m[b]!);
    d2[x.i] = s;
  }
  const grenze = chiQuantil(p, k);
  return { d2, df: k, grenze, funde: d2.flatMap((v, i) => (v !== null && v > grenze ? [i] : [])), nGeprueft: n, nichtGeprueft: zeilen.length - n };
}

/* ------------------------------------------------------------------ Gleichförmig, schnell */
/** Je Person der größte Anteil gleicher Antworten unter den gültigen Items (≥ anteil → Fund). Personen mit weniger als minItems gültigen Antworten werden nicht geprüft. */
export function gleichfoermig(block: (number | null)[][], o: { minItems?: number; anteil?: number; umgepolt?: boolean[] } = {}): { zeile: number; anteil: number; staerke: 'deutlich' | 'schwach' }[] {
  const minItems = o.minItems ?? 5, schwelle = o.anteil ?? 0.9;
  const breite = block.length ? Math.max(...block.map(z => z.length)) : 0;
  if (breite < minItems) return [];
  const gemischt = !!o.umgepolt && o.umgepolt.includes(true) && o.umgepolt.includes(false);
  return block.flatMap((z, i) => {
    const g = z.filter(gut);
    if (g.length < minItems) return [];
    const zaehl = new Map<number, number>(); for (const v of g) zaehl.set(v, (zaehl.get(v) ?? 0) + 1);
    const anteil = Math.max(...zaehl.values()) / g.length;
    return anteil >= schwelle - 1e-12 ? [{ zeile: i, anteil, staerke: gemischt ? 'deutlich' as const : 'schwach' as const }] : [];
  });
}
/** „Sehr schnell“: Zeit < anteilMedian · Median der gültigen Zeiten (Faustregel; Leiner 2019 nennt TIME_RSI ≥ 2). */
export function schnell(zeiten: (number | null)[], anteilMedian = 0.4): { zeilen: number[]; median: number; grenze: number } {
  const g = zeiten.filter(gut).sort((a, b) => a - b);
  if (!g.length) return { zeilen: [], median: 0, grenze: 0 };
  const median = g.length % 2 ? g[(g.length - 1) / 2]! : (g[g.length / 2 - 1]! + g[g.length / 2]!) / 2, grenze = anteilMedian * median;
  return { zeilen: zeiten.flatMap((v, i) => (gut(v) && v < grenze ? [i] : [])), median, grenze };
}

/* ------------------------------------------------------------------ Zusammen */
export interface AuffGrund { regel: 'z' | 'D2' | 'gleichfoermig' | 'schnell'; spalte?: string; wert?: number; z?: number; d2?: number; staerke?: 'deutlich' | 'schwach' }
export interface AuffErgebnis {
  faelle: { zeile: number; gruende: AuffGrund[] }[];
  kennzeichen: { name: 'auffaellig_z' | 'auffaellig_D2' | 'auffaellig_gleichfoermig' | 'auffaellig_schnell'; werte: (0 | 1)[] }[];
  hinweise: { art: 'zKannNichtsFinden' | 'mahalanobis' | 'wenigeFaelle'; satz: string }[];
}
const FEHLER_SATZ = (f: MahalanobisFehler) => ({
  singulaer: L('Zwei der gewählten Spalten hängen vollständig zusammen (eine ist ein Vielfaches oder eine Summe der anderen); der Abstand D² lässt sich so nicht berechnen.', 'Two of the chosen columns are completely dependent on each other (one is a multiple or a sum of the others); the distance D² cannot be calculated.'),
  zuWenigFaelle: L('Für den Abstand D² gibt es zu wenige vollständige Fälle (mehr Fälle als Spalten plus eins sind nötig).', 'There are too few complete cases for the distance D² (more cases than columns plus one are needed).'),
  konstant: L('Eine der gewählten Spalten hat keine Streuung (alle Werte gleich); der Abstand D² lässt sich so nicht berechnen.', 'One of the chosen columns has no spread (all values equal); the distance D² cannot be calculated.'),
  keineSpalten: L('Für den Abstand D² sind mindestens zwei Spalten nötig.', 'The distance D² needs at least two columns.')
})[f];

export function auffaelligeFaelle(d: Daten, o: { z?: string[]; mahalanobis?: string[]; gleichfoermig?: string[]; umgepolt?: string[]; zeit?: string }): AuffErgebnis {
  const n = d.zeilen.length;
  const idx = (name: string) => d.spalten.findIndex(s => s.name.toUpperCase() === name.toUpperCase());
  /** Zahlen einer Spalte: fehlende Codes und Leeres sind null. */
  const werte = (name: string): (number | null)[] => { const i = idx(name); if (i < 0) return d.zeilen.map(() => null); const fl = fehlendMenge(d.spalten[i]); return d.zeilen.map(z => { const v = z[i]; return gut(v) && !fl.includes(v) ? v : null; }); };
  const gruende = new Map<number, AuffGrund[]>();
  const merke = (zeile: number, g: AuffGrund) => { (gruende.get(zeile) ?? gruende.set(zeile, []).get(zeile)!).push(g); };
  const kennzeichen: AuffErgebnis['kennzeichen'] = [];
  const hinweise: AuffErgebnis['hinweise'] = [];
  const markiere = (name: AuffErgebnis['kennzeichen'][number]['name'], zeilen: number[]) => { const w = Array.from({ length: n }, () => 0 as 0 | 1); for (const z of zeilen) w[z] = 1; kennzeichen.push({ name, werte: w }); };

  if (o.z?.length) {
    const fund: number[] = []; let kleinesN = false;
    for (const name of o.z) {
      const w = werte(name);
      if (!zKannFinden(w.filter(gut).length)) kleinesN = true;
      for (const f of zAuffaellig(w)) { merke(f.zeile, { regel: 'z', spalte: d.spalten[idx(name)]!.name, wert: f.wert, z: f.z }); fund.push(f.zeile); }
    }
    markiere('auffaellig_z', fund);
    if (kleinesN) hinweise.push({ art: 'zKannNichtsFinden', satz: anrede('Bei so wenigen Fällen kann die z-Regel nichts finden; schau dir die Werte selbst an.', 'Bei so wenigen Fällen kann die z-Regel nichts finden; schauen Sie sich die Werte selbst an.', 'With so few cases the z rule cannot find anything; look at the values yourself.') });
  }
  if (o.mahalanobis?.length) {
    const spalten = o.mahalanobis.map(werte);
    const r = mahalanobis(Array.from({ length: n }, (_, i) => spalten.map(s => s[i]!)));
    if ('fehler' in r) { hinweise.push({ art: 'mahalanobis', satz: FEHLER_SATZ(r.fehler) }); markiere('auffaellig_D2', []); }
    else {
      for (const i of r.funde) merke(i, { regel: 'D2', d2: r.d2[i]! });
      markiere('auffaellig_D2', r.funde);
      if (r.nichtGeprueft > 0) hinweise.push({ art: 'mahalanobis', satz: Lp(r.nichtGeprueft, `${r.nichtGeprueft} von ${n} Fällen hat in den gewählten Spalten eine Lücke und wurde beim Abstand D² nicht geprüft.`, `${r.nichtGeprueft} von ${n} Fällen haben in den gewählten Spalten eine Lücke und wurden beim Abstand D² nicht geprüft.`, `${r.nichtGeprueft} of ${n} cases has a gap in the chosen columns and was not checked for the distance D².`, `${r.nichtGeprueft} of ${n} cases have a gap in the chosen columns and were not checked for the distance D².`) });
      if (r.nGeprueft < 10 * r.df) hinweise.push({ art: 'wenigeFaelle', satz: L('Für so viele Spalten sind es wenige Fälle; der Abstand D² findet dann kaum etwas (Faustregel: mindestens das Zehnfache der Spaltenzahl).', 'For this many columns there are few cases; the distance D² then finds hardly anything (rule of thumb: at least ten times the number of columns).') });
    }
  }
  if (o.gleichfoermig?.length) {
    const spalten = o.gleichfoermig.map(werte), polung = o.gleichfoermig.map(nm => !!o.umgepolt?.some(u => u.toUpperCase() === nm.toUpperCase()));
    const block = Array.from({ length: n }, (_, i) => spalten.map(s => s[i]!));
    const f = gleichfoermig(block, { umgepolt: polung });
    for (const x of f) merke(x.zeile, { regel: 'gleichfoermig', wert: x.anteil, staerke: x.staerke });
    markiere('auffaellig_gleichfoermig', f.map(x => x.zeile));
  }
  if (o.zeit) {
    const s = schnell(werte(o.zeit));
    for (const i of s.zeilen) merke(i, { regel: 'schnell', spalte: d.spalten[idx(o.zeit)]!.name, wert: werte(o.zeit)[i]! });
    markiere('auffaellig_schnell', s.zeilen);
  }
  return { faelle: [...gruende].sort((a, b) => a[0] - b[0]).map(([zeile, g]) => ({ zeile, gruende: g })), kennzeichen, hinweise };
}
