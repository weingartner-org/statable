/**
 * „Ohne Normalverteilung - mit Zufallsverfahren“ (Später, Welle S-B, Teil 6, L5; Fachblatt SPAETER-B-OPTIONEN.md Abschnitt 6 und „Entscheidungen Opus“):
 * der Lauf für die vier Karten - Gruppen (zwei Gruppen: Permutationstest mit Welch-t oder Median, Bootstrap-KI geschichtet), Zusammenhang (r: Permutationstest, Bootstrap-KI und Fisher-z),
 * Vorhersage (Fall-Bootstrap der Koeffizienten), Verteilung (Bootstrap von Mittelwert oder Median). Reine Rechnung ohne Oberfläche; Sätze und Tabellen: lib/zufallsaetze.ts.
 * Der Lauf rechnet in Stücken von etwa 24 Millisekunden und gibt dazwischen die Hand zurück (Lade-Animation, „Abbrechen“ über `weiter()`).
 * Das Ergebnis (`ZufallErgebnis`) hält nur Zahlen, keine Ziehungen; es steht im `ergebnis.zufall` des Blatts. Gleiche Daten und gleicher Startwert ergeben dieselbe Zahl.
 * Fallgewicht: Häufigkeitsgewicht über die erweiterte Menge (Aufrufer; `erweitern` bis Σw = 100 000), Umfragegewicht gesperrt.
 */
import { Ziehung, hesterberg, intervall, jackknife, koeffizientenAlle, type BootArt, type BootWarnung } from './bootstrap';
import { permutationGruppenLauf, permutationKorrelationLauf, welchKi, type PermStatistik } from './permutation';
import { tQuantil, tSchwaenze } from './verteilung';
import { median } from './rangtests';
import type { ZufallWahl } from './zufallswahl';

export type ZufallKarte = 'gruppen' | 'zusammenhang' | 'vorhersage' | 'verteilung';

export type ZufallDaten =
  /** Zwei Gruppen: Werte der ersten und der zweiten Gruppe (bei Häufigkeitsgewicht schon erweitert) */
  | { karte: 'gruppen'; y: string; g: string; namen: [string, string]; x: number[]; z: number[] }
  | { karte: 'zusammenhang'; x: string; y: string; xs: number[]; ys: number[] }
  /** Spalten der Prädiktoren (Gruppen-Spalten schon als Hilfsspalten 0/1), Ziel y */
  | { karte: 'vorhersage'; ziel: string; namen: string[]; spalten: number[][]; y: number[] }
  | { karte: 'verteilung'; spalten: { name: string; werte: number[] }[] };

/** Ein Bootstrap-Intervall ohne die Ziehungen selbst. */
export interface ZufallIv {
  /** die Art, die tatsächlich gerechnet wurde (BCa fällt auf Perzentil zurück, wenn es nicht geht) */
  art: BootArt; wunsch: BootArt;
  lo: number | null; hi: number | null;
  /** gültige Ziehungen */ B: number; ungueltig: number; anteilGleich: number;
  warnungen: BootWarnung[];
  /** BCa wurde bei n < 5 nicht gerechnet (der Jackknife entartet) */ bcaVerweigert: boolean;
}
export interface ZufallPerm {
  statistik: PermStatistik | 'korrelation'; modus: 'exakt' | 'zufall'; b: number; gesamt: number; p: number; t0: number;
  B: number | null; welchErsatz: boolean;
}
export interface ZufallKoeff { name: string; b: number; boot: ZufallIv; klassisch: { lo: number; hi: number; se: number } | null }
export interface ZufallErgebnis {
  karte: ZufallKarte; B: number; startwert: number; art: BootArt; statistik: 'mittel' | 'median';
  /** Prüfsumme der Daten: ändern sie sich, ist das Ergebnis überholt */ pruef: number;
  gruppen?: { y: string; g: string; namen: [string, string]; n: [number, number]; schaetzer: number; perm: ZufallPerm | null; boot: ZufallIv; welch: { lo: number; hi: number; df: number } | null };
  zusammenhang?: { x: string; y: string; n: number; r: number | null; pT: number | null; perm: ZufallPerm | null; boot: ZufallIv | null; fisher: { lo: number; hi: number } | null };
  vorhersage?: { ziel: string; n: number; koeff: ZufallKoeff[]; klassischDf: number | null };
  verteilung?: { spalten: { name: string; n: number; schaetzer: number; boot: ZufallIv; t: { lo: number; hi: number } | null }[] };
}

export interface LaufHaken {
  /** Anteil 0 bis 1 */ fortschritt?: (anteil: number) => void;
  /** false: abgebrochen */ weiter?: () => boolean;
}

/** Prüfsumme der Daten (auf sechs Stellen gerundet): ändern sie sich, ist ein gespeichertes Ergebnis überholt. */
export function pruefsumme(d: ZufallDaten): number {
  let h = 2166136261;
  const mische = (a: ArrayLike<number>) => { for (let i = 0; i < a.length; i++) { h = Math.imul(h ^ (Math.round(a[i]! * 1e6) | 0), 16777619) >>> 0; } h = Math.imul(h ^ a.length, 16777619) >>> 0; };
  if (d.karte === 'gruppen') { mische(d.x); mische(d.z); }
  else if (d.karte === 'zusammenhang') { mische(d.xs); mische(d.ys); }
  else if (d.karte === 'vorhersage') { for (const c of d.spalten) mische(c); mische(d.y); }
  else for (const c of d.spalten) mische(c.werte);
  return h >>> 0;
}
/** Gehört das gespeicherte Ergebnis zu dieser Wahl und diesen Daten? */
export const passtZu = (z: ZufallErgebnis | undefined, d: ZufallDaten, w: ZufallWahl): boolean =>
  !!z && z.karte === d.karte && z.B === w.B && z.startwert === w.startwert && z.art === w.art && z.pruef === pruefsumme(d) && (d.karte === 'gruppen' || d.karte === 'verteilung' ? z.statistik === w.statistik : true);

const warte = () => new Promise<void>(r => setTimeout(r, 0));
const jetzt = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const STUECK_MS = 24;

/** Rechnet eine Ziehung in Stücken; false, wenn abgebrochen. */
async function ziehe(z: Ziehung, h: LaufHaken, teil: (a: number) => void): Promise<boolean> {
  while (!z.fertig) {
    if (h.weiter && !h.weiter()) return false;
    const t0 = jetzt();
    do { z.weiter(8); } while (!z.fertig && jetzt() - t0 < STUECK_MS);
    teil(z.t.length / z.B);
    await warte();
  }
  return true;
}
/** Rechnet einen Permutationslauf in Stücken; false, wenn abgebrochen. */
async function fahre<T>(l: { fertig(): boolean; anteil(): number; schritt(maxMs?: number): void }, h: LaufHaken, teil: (a: number) => void): Promise<boolean> {
  while (!l.fertig()) {
    if (h.weiter && !h.weiter()) return false;
    l.schritt(STUECK_MS);
    teil(l.anteil());
    await warte();
  }
  return true;
}

function ivVon(z: { t: number[]; t0: number }, wunsch: BootArt, n: number, jk: () => number[] | null): ZufallIv {
  let art: BootArt = wunsch, verweigert = false;
  if (wunsch === 'bca' && n < 5) { art = 'perzentil'; verweigert = true; }   // der Jackknife entartet (S-A)
  let iv = art === 'bca' ? intervall(z.t, z.t0, 'bca', 0.95, jk() ?? undefined) : intervall(z.t, z.t0, 'perzentil', 0.95);
  if (art === 'bca' && iv.lo === null) { const warn = [...iv.warnungen]; iv = { ...intervall(z.t, z.t0, 'perzentil', 0.95), warnungen: warn }; art = 'perzentil'; }
  return { art, wunsch, lo: iv.lo, hi: iv.hi, B: iv.B, ungueltig: iv.ungueltig, anteilGleich: iv.anteilGleich, warnungen: iv.warnungen, bcaVerweigert: verweigert };
}
const mittelVon = (a: ArrayLike<number>) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]!; return s / a.length; };
const sdVon = (a: ArrayLike<number>) => { const m = mittelVon(a); let s = 0; for (let i = 0; i < a.length; i++) s += (a[i]! - m) ** 2; return Math.sqrt(s / (a.length - 1)); };
const tIv = (werte: number[]): { lo: number; hi: number } | null => {
  const n = werte.length; if (n < 2) return null;
  const m = mittelVon(werte), se = sdVon(werte) / Math.sqrt(n), t = tQuantil(0.975, n - 1);
  return Number.isFinite(se) && se > 0 ? { lo: m - t * se, hi: m + t * se } : null;
};

/** Klassische Kleinste-Quadrate-Schätzung mit Standardfehlern (für den Vergleich mit dem Bootstrap): Koeffizienten, SE und Freiheitsgrade; null bei Rangmangel. */
export function olsKlassisch(x: number[][], y: number[]): { b: number[]; se: number[]; df: number } | null {
  const p = x.length, n = y.length;
  if (n < p + 2) return null;
  const mw = x.map(c => mittelVon(c)), my = mittelVon(y);
  const S: number[][] = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => { let s = 0; for (let k = 0; k < n; k++) s += (x[i]![k]! - mw[i]!) * (x[j]![k]! - mw[j]!); return s; }));
  const r = x.map((c, i) => { let s = 0; for (let k = 0; k < n; k++) s += (c[k]! - mw[i]!) * (y[k]! - my); return s; });
  // Gauss-Jordan: S⁻¹
  const A = S.map((row, i) => [...row, ...Array.from({ length: p }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < p; c++) {
    let best = c; for (let i = c + 1; i < p; i++) if (Math.abs(A[i]![c]!) > Math.abs(A[best]![c]!)) best = i;
    if (Math.abs(A[best]![c]!) < 1e-12 * Math.max(1, Math.abs(S[c]![c]!))) return null;
    [A[c], A[best]] = [A[best]!, A[c]!];
    const piv = A[c]![c]!; for (let j = 0; j < 2 * p; j++) A[c]![j]! /= piv;
    for (let i = 0; i < p; i++) if (i !== c) { const f = A[i]![c]!; if (f) for (let j = 0; j < 2 * p; j++) A[i]![j]! -= f * A[c]![j]!; }
  }
  const inv = A.map(row => row.slice(p)), b = inv.map(row => row.reduce((a, v, j) => a + v * r[j]!, 0));
  let sse = 0; for (let k = 0; k < n; k++) { let fit = my; for (let i = 0; i < p; i++) fit += b[i]! * (x[i]![k]! - mw[i]!); sse += (y[k]! - fit) ** 2; }
  const df = n - p - 1, s2 = sse / df;
  return { b, se: inv.map((row, i) => Math.sqrt(Math.max(0, s2 * row[i]!))), df };
}

const ANTEIL = (von: number, bis: number, h: LaufHaken) => (a: number) => h.fortschritt?.(von + (bis - von) * Math.min(1, Math.max(0, a)));

/** Der Lauf. `undefined`, wenn abgebrochen wurde. */
export async function zufallLauf(daten: ZufallDaten, wahl: ZufallWahl, h: LaufHaken = {}): Promise<ZufallErgebnis | undefined> {
  const { B, startwert, art } = wahl, kopf = { karte: daten.karte, B, startwert, art, statistik: wahl.statistik, pruef: pruefsumme(daten) };
  if (daten.karte === 'gruppen') {
    const { x, z, namen } = daten, n1 = x.length, n2 = z.length, n = n1 + n2, alle = [...x, ...z], schichten = alle.map((_, i) => (i < n1 ? 0 : 1));
    const med = wahl.statistik === 'median';
    let perm: ZufallPerm | null = null;
    const pl = permutationGruppenLauf(x, z, { statistik: med ? 'median' : 'mittel', B, startwert });
    if (!(await fahre(pl, h, ANTEIL(0, 0.5, h)))) return undefined;
    const pr = pl.ergebnis();
    if (pr.grund === null) perm = { statistik: pr.statistik, modus: pr.modus, b: pr.b, gesamt: pr.gesamt, p: pr.p, t0: pr.t0, B: pr.B, welchErsatz: pr.hinweise.includes('welch-ersatz') };
    const stat = (idx: Int32Array): number => {
      if (!med) { let s1 = 0, c1 = 0, s2 = 0, c2 = 0; for (let k = 0; k < idx.length; k++) { const i = idx[k]!; if (i < n1) { s1 += alle[i]!; c1++; } else { s2 += alle[i]!; c2++; } } return s1 / c1 - s2 / c2; }
      const a: number[] = [], b: number[] = []; for (let k = 0; k < idx.length; k++) { const i = idx[k]!; (i < n1 ? a : b).push(alle[i]!); } return median(a) - median(b);
    };
    const zi = new Ziehung(n, stat, { startwert, B, schichten });
    if (!(await ziehe(zi, h, ANTEIL(0.5, 1, h)))) return undefined;
    const boot = ivVon(zi, art, n, () => jackknife(stat, n, schichten).L);
    const w = !med && n1 >= 2 && n2 >= 2 ? welchKi(x, z) : null;
    return { ...kopf, gruppen: { y: daten.y, g: daten.g, namen, n: [n1, n2], schaetzer: zi.t0, perm, boot, welch: w && Number.isFinite(w.lo) ? { lo: w.lo, hi: w.hi, df: w.df } : null } };
  }
  if (daten.karte === 'zusammenhang') {
    const { xs, ys } = daten, n = xs.length;
    const pl = permutationKorrelationLauf(xs, ys, { B, startwert });
    if (!(await fahre(pl, h, ANTEIL(0, 0.5, h)))) return undefined;
    const pr = pl.ergebnis();
    const perm: ZufallPerm | null = pr.grund === null && pr.p !== null ? { statistik: 'korrelation', modus: pr.modus, b: pr.b, gesamt: pr.gesamt, p: pr.p, t0: pr.r!, B: pr.B, welchErsatz: false } : null;
    if (pr.grund !== null) return { ...kopf, zusammenhang: { x: daten.x, y: daten.y, n, r: null, pT: null, perm: null, boot: null, fisher: null } };
    const r = pr.r!;
    const stat = (idx: Int32Array): number => {
      const m = idx.length; let sx = 0, sy = 0; for (let k = 0; k < m; k++) { sx += xs[idx[k]!]!; sy += ys[idx[k]!]!; }
      const mx = sx / m, my = sy / m; let sxx = 0, syy = 0, sxy = 0;
      for (let k = 0; k < m; k++) { const a = xs[idx[k]!]! - mx, b = ys[idx[k]!]! - my; sxx += a * a; syy += b * b; sxy += a * b; }
      return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
    };
    const zi = new Ziehung(n, stat, { startwert, B });
    if (!(await ziehe(zi, h, ANTEIL(0.5, 1, h)))) return undefined;
    const boot = ivVon(zi, art, n, () => jackknife(stat, n).L);
    const fisher = n >= 4 && Math.abs(r) < 1 ? (() => { const zz = Math.atanh(r), se = 1 / Math.sqrt(n - 3); return { lo: Math.tanh(zz - 1.959963984540054 * se), hi: Math.tanh(zz + 1.959963984540054 * se) }; })() : null;
    const pT = n >= 3 && Math.abs(r) < 1 ? Math.min(1, 2 * tSchwaenze(-Math.abs(r * Math.sqrt((n - 2) / (1 - r * r))), n - 2).unten) : null;
    return { ...kopf, zusammenhang: { x: daten.x, y: daten.y, n, r, pT, perm, boot, fisher } };
  }
  if (daten.karte === 'vorhersage') {
    const { spalten, y, namen } = daten, n = y.length, p = spalten.length, alle = koeffizientenAlle(spalten, y);
    const t0s: number[] = new Array(p).fill(NaN), ts: number[][] = Array.from({ length: p }, () => []);
    let erste = true;
    const stat = (idx: Int32Array): number => {
      const b = alle(idx);
      if (erste) { erste = false; for (let j = 0; j < p; j++) t0s[j] = b ? b[j]! : NaN; return t0s[0]!; }
      for (let j = 0; j < p; j++) ts[j]!.push(b ? b[j]! : NaN);
      return b ? b[0]! : NaN;
    };
    const zi = new Ziehung(n, stat, { startwert, B });
    if (!(await ziehe(zi, h, ANTEIL(0, 1, h)))) return undefined;
    let loo: number[][] | null = null;
    const jk = (j: number) => {
      if (!loo) { loo = Array.from({ length: p }, () => []); for (let i = 0; i < n; i++) { const idx = new Int32Array(n - 1); let k = 0; for (let q = 0; q < n; q++) if (q !== i) idx[k++] = q; const b = alle(idx); for (let c = 0; c < p; c++) loo[c]!.push(b ? b[c]! : NaN); } }
      return loo[j]!.map(v => (n - 1) * (t0s[j]! - v));
    };
    const kl = olsKlassisch(spalten, y), t975 = kl ? tQuantil(0.975, kl.df) : NaN;
    const koeff: ZufallKoeff[] = namen.map((name, j) => ({
      name, b: t0s[j]!, boot: ivVon({ t: ts[j]!, t0: t0s[j]! }, art, n, () => jk(j)),
      klassisch: kl ? { lo: kl.b[j]! - t975 * kl.se[j]!, hi: kl.b[j]! + t975 * kl.se[j]!, se: kl.se[j]! } : null
    }));
    return { ...kopf, vorhersage: { ziel: daten.ziel, n, koeff, klassischDf: kl ? kl.df : null } };
  }
  // Verteilung: Bootstrap von Mittelwert oder Median je Spalte
  const med = wahl.statistik === 'median', aus: NonNullable<ZufallErgebnis['verteilung']>['spalten'] = [];
  const k = daten.spalten.length;
  for (let c = 0; c < k; c++) {
    const sp = daten.spalten[c]!, v = sp.werte, n = v.length;
    const stat = (idx: Int32Array): number => { if (!med) { let s = 0; for (let i = 0; i < idx.length; i++) s += v[idx[i]!]!; return s / idx.length; } const a = new Array<number>(idx.length); for (let i = 0; i < idx.length; i++) a[i] = v[idx[i]!]!; return median(a); };
    const zi = new Ziehung(n, stat, { startwert, B });
    if (!(await ziehe(zi, h, ANTEIL(c / k, (c + 1) / k, h)))) return undefined;
    aus.push({ name: sp.name, n, schaetzer: zi.t0, boot: ivVon(zi, art, n, () => jackknife(stat, n).L), t: med ? null : tIv(v) });
  }
  return { ...kopf, verteilung: { spalten: aus } };
}

/** Der Hesterberg-Hinweis braucht n; hier der kleinste Umfang einer Auswertung. */
export function kleinsteGroesse(e: ZufallErgebnis): number {
  if (e.gruppen) return Math.min(...e.gruppen.n);
  if (e.zusammenhang) return e.zusammenhang.n;
  if (e.vorhersage) return e.vorhersage.n;
  return Math.min(...(e.verteilung?.spalten.map(s => s.n) ?? [Infinity]));
}
export const kleineStichprobe = (e: ZufallErgebnis) => hesterberg(kleinsteGroesse(e));
