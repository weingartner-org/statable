/**
 * Bootstrap-Grundlage: Fall-Bootstrap (Zeilen mit Zurücklegen ziehen), Perzentil- und BCa-Intervall.
 * Reine Funktionen, keine Oberfläche, kein Text (Sätze: lib/bootstrapsaetze.ts). Der Zufall ist lib/zufall.ts (fester Startwert, gleiche Daten ergeben gleiche Ziehungen).
 *
 * Quantile und BCa genau wie das R-Paket `boot` (Canty & Ripley): `norm.inter` (Interpolation auf der Normalskala zwischen zwei Nachbarn der Ordnungsstatistiken,
 * Rang (B + 1) · Niveau), z0 aus dem Anteil der Ziehungen STRIKT unter dem Schätzer, Beschleunigung a aus dem Jackknife (`empinf(type = "jack")`: L = (n − 1)(t0 − Auslassung)).
 * Nur endliche Ziehungen zählen (wie `is.finite`); Ränder und unendliches z0 werden als Warnung gemeldet, nie als NaN in einer Tabelle.
 * Fallgewicht: Die Sperrtabelle (lib/gewichte.ts, `mediation:bootstrap`) sperrt den Bootstrap mit Häufigkeits- und Umfragegewicht. Käme ein Häufigkeitsgewicht dazu, zöge man aus der erweiterten Menge
 * (`erweitern` aus gewichte.ts: die Zeile w-mal; N im Satz = Σw); mit Umfragegewichten bliebe es gesperrt (Stichprobenplan fehlt).
 * Quellen: Efron (1987) JASA 82; Davison & Hinkley (1997) Abschn. 5.3; Hesterberg (2015) The American Statistician 69(4).
 * Geprüft gegen R (scripts/spaeter-a-erwartet.R, Test: bootstrap.test.ts): feste Verteilungen aus R, Treffer auf 1e-9.
 */
import { zufall } from './zufall';
import { qnorm } from './diagrammdaten';
import { normal } from './verteilung';

export const BOOT_B = 9999;
export const BOOT_STARTWERT = 20261008;
/** Ab diesem Anteil gleicher Ziehungen (t = t0) warnt das Modul (Median, Anteile, Rangstatistiken). */
export const GLEICHE_GRENZE = 0.05;

export type BootArt = 'perzentil' | 'bca';
export type BootWarnung = 'rand' | 'z0unendlich' | 'viele-gleiche' | 'a-undefiniert';

/** `boot:::norm.inter`: Quantile der Ziehungen bei den Niveaus `alpha`; nur endliche Ziehungen. */
export function normInter(t: number[], alpha: number[]): number[] {
  const s = t.filter(Number.isFinite).sort((a, b) => a - b), R = s.length;
  if (!R) return alpha.map(() => NaN);
  return alpha.map(a => {
    const rk = (R + 1) * a, k = Math.trunc(rk);
    if (k <= 0 || Number.isNaN(rk)) return s[0]!;
    if (k >= R) return s[R - 1]!;
    if (k === rk) return s[k - 1]!;
    const tk = s[k - 1]!, tk1 = s[k]!, z = qnorm(a), z2 = qnorm(k / (R + 1)), z3 = qnorm((k + 1) / (R + 1));
    return tk + (z - z2) / (z3 - z2) * (tk1 - tk);
  });
}

/**
 * Jackknife wie `boot::empinf(type = "jack")`: Statistik ohne Fall i, und L_i = (n − 1)(t0 − θ_(−i)).
 * Mit `schichten` (Schichtnummer je Zeile; Gruppenvergleiche, Welle S-B) gilt je Fall die Größe seiner Schicht: L_i = (n_h − 1)(t0 − θ_(−i)), n_h = Größe der Schicht von i
 * (wie `boot:::usual.jack` mit `strata`).
 */
export function jackknife(statistik: (indizes: Int32Array) => number, n: number, schichten?: ArrayLike<number>): { t0: number; theta: number[]; L: number[] } {
  const alle = Int32Array.from({ length: n }, (_, i) => i), t0 = statistik(alle), theta: number[] = [];
  for (let i = 0; i < n; i++) {
    const ohne = new Int32Array(n - 1); let k = 0;
    for (let j = 0; j < n; j++) if (j !== i) ohne[k++] = j;
    theta.push(statistik(ohne));
  }
  let groesse: (i: number) => number = () => n;
  if (schichten) {
    const zaehl = new Map<number, number>(); for (let i = 0; i < n; i++) zaehl.set(schichten[i]!, (zaehl.get(schichten[i]!) ?? 0) + 1);
    groesse = i => zaehl.get(schichten[i]!)!;
  }
  return { t0, theta, L: theta.map((v, i) => (groesse(i) - 1) * (t0 - v)) };
}

/** Beschleunigung a = ΣL³ / (6 · (ΣL²)^1,5); NaN, wenn ΣL² = 0 (kein Unterschied zwischen den Auslassungen). */
export function beschleunigung(L: number[]): number {
  let s2 = 0, s3 = 0; for (const v of L) { s2 += v * v; s3 += v * v * v; }
  return s2 > 0 ? s3 / (6 * Math.pow(s2, 1.5)) : NaN;
}

/** Bei kleinen Stichproben (n < 30) sind Bootstrap-Intervalle meist zu schmal (Hesterberg 2015). */
export const hesterberg = (n: number): boolean => n < 30;

export interface BootIntervall {
  art: BootArt; niveau: number; lo: number | null; hi: number | null;
  /** gültige (endliche) Ziehungen */
  B: number;
  /** nicht endliche Ziehungen (NaN, ±Inf): zählen nirgends mit */
  ungueltig: number;
  /** Anteil der Ziehungen mit t = t0 */
  anteilGleich: number;
  z0?: number; a?: number; niveauLo?: number; niveauHi?: number;
  warnungen: BootWarnung[];
}

/** Perzentil- oder BCa-Intervall aus den Ziehungen `t` zum Schätzer `t0`. BCa braucht `L` (Jackknife). Nicht berechenbar: lo = hi = null und eine Warnung, nie NaN. */
export function intervall(t: number[], t0: number, art: BootArt, niveau: number, L?: number[]): BootIntervall {
  const gueltig = t.filter(Number.isFinite), B = gueltig.length, ungueltig = t.length - B;
  const anteilGleich = B ? gueltig.reduce((n, v) => n + (v === t0 ? 1 : 0), 0) / B : 0;
  const warnungen: BootWarnung[] = [];
  const rand = (alpha: number[]) => alpha.some(a => { const rk = (B + 1) * a; return !(rk > 1 && rk < B); });
  const gleiche = () => { if (anteilGleich > GLEICHE_GRENZE) warnungen.push('viele-gleiche'); };
  const leer = (w: BootWarnung): BootIntervall => ({ art, niveau, lo: null, hi: null, B, ungueltig, anteilGleich, warnungen: [w] });
  if (!B) return leer('z0unendlich');
  const al = [(1 - niveau) / 2, (1 + niveau) / 2];
  if (art === 'perzentil') {
    const [lo, hi] = normInter(gueltig, al) as [number, number];
    if (rand(al)) warnungen.push('rand');
    gleiche();
    return { art, niveau, lo, hi, B, ungueltig, anteilGleich, warnungen };
  }
  let unter = 0; for (const v of gueltig) if (v < t0) unter++;
  const z0 = qnorm(unter / B);
  if (!Number.isFinite(z0)) return { ...leer('z0unendlich') };
  const a = L ? beschleunigung(L) : NaN;
  if (!Number.isFinite(a)) return { ...leer('a-undefiniert'), z0 };
  const z = al.map(qnorm), adj = z.map(zz => normal(z0 + (z0 + zz) / (1 - a * (z0 + zz))));
  const [lo, hi] = normInter(gueltig, adj) as [number, number];
  if (rand(adj)) warnungen.push('rand');
  gleiche();
  return { art, niveau, lo, hi, B, ungueltig, anteilGleich, z0, a, niveauLo: adj[0]!, niveauHi: adj[1]!, warnungen };
}

/**
 * Ein Fall-Bootstrap: B Ziehungen mit Zurücklegen aus den Fällen 0 … n − 1; die Statistik bekommt je Ziehung die gezogenen Zeilennummern.
 * `weiter(anzahl)` rechnet in Blöcken, damit die Oberfläche Fortschritt und „Abbrechen“ behält. Gleicher Startwert ⇒ gleiche Verteilung, gleichgültig wie groß die Blöcke sind.
 * Mit `schichten` (Schichtnummer je Zeile, beliebige Zahlen) wird je Schicht getrennt gezogen: aus den Zeilen der Schicht h werden n_h Zeilen mit Zurücklegen genommen, die Größe jeder
 * Schicht bleibt also in jeder Ziehung gleich und keine Ziehung enthält eine Gruppe nicht (Welle S-B, Gruppenvergleiche). Ohne `schichten` ist alles wie bisher.
 */
export class Ziehung {
  readonly n: number; readonly B: number; readonly startwert: number;
  readonly t0: number; readonly t: number[] = [];
  private readonly rng: () => number; private readonly idx: Int32Array; private readonly schichten: Int32Array[] | null;
  constructor(n: number, private readonly statistik: (indizes: Int32Array) => number, opt: { startwert?: number; B?: number; schichten?: ArrayLike<number> } = {}) {
    this.n = n; this.B = opt.B ?? BOOT_B; this.startwert = opt.startwert ?? BOOT_STARTWERT;
    this.rng = zufall(this.startwert); this.idx = new Int32Array(n);
    this.t0 = statistik(Int32Array.from({ length: n }, (_, i) => i));
    if (opt.schichten) {
      const m = new Map<number, number[]>();
      for (let i = 0; i < n; i++) { const h = opt.schichten[i]!; (m.get(h) ?? m.set(h, []).get(h)!).push(i); }
      this.schichten = [...m.keys()].sort((a, b) => a - b).map(h => Int32Array.from(m.get(h)!));
    } else this.schichten = null;
  }
  get fertig(): boolean { return this.t.length >= this.B; }
  weiter(anzahl: number): number {
    const { n, idx, rng, schichten } = this;
    const bis = Math.min(this.B, this.t.length + anzahl);
    while (this.t.length < bis) {
      if (schichten) {
        let pos = 0;
        for (const z of schichten) { const m = z.length; for (let i = 0; i < m; i++) idx[pos++] = z[Math.floor(rng() * m)]!; }
      } else for (let i = 0; i < n; i++) idx[i] = Math.floor(rng() * n);
      this.t.push(this.statistik(idx));
    }
    return this.t.length;
  }
}

/**
 * Alle Regressionskoeffizienten (ohne Konstante) des Modells y ~ 1 + x₀ + x₁ + … für die gezogenen Zeilen (Kleinste Quadrate; Spalten im Fall-Bootstrap mitgezogen), oder `null` bei Rangmangel.
 * Die Spalten werden je Ziehung zuerst zentriert (genau auch bei großen Mittelwerten). Rangmangel (z. B. ein Dummy ohne Einsen in der Ziehung, zwei gleiche Spalten): `null`.
 */
export function koeffizientenAlle(x: number[][], y: number[]): (indizes: Int32Array) => number[] | null {
  const p = x.length;
  return (idx: Int32Array) => {
    const m = idx.length;
    if (m < p + 1) return null;
    const mw = new Array<number>(p).fill(0); let my = 0;
    for (let a = 0; a < m; a++) { const i = idx[a]!; my += y[i]!; for (let c = 0; c < p; c++) mw[c]! += x[c]![i]!; }
    for (let c = 0; c < p; c++) mw[c]! /= m; my /= m;
    const S: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0)), r = new Array<number>(p).fill(0);
    for (let a = 0; a < m; a++) {
      const i = idx[a]!, dy = y[i]! - my;
      for (let c = 0; c < p; c++) { const dc = x[c]![i]! - mw[c]!; r[c]! += dc * dy; for (let e = c; e < p; e++) S[c]![e]! += dc * (x[e]![i]! - mw[e]!); }
    }
    for (let c = 0; c < p; c++) for (let e = 0; e < c; e++) S[c]![e] = S[e]![c]!;
    // Cholesky; ein Pivot nahe 0 gegenüber der Diagonalen = Rangmangel
    const Lm: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0)), diag = S.map((row, c) => row[c]!);
    for (let c = 0; c < p; c++) {
      if (!(diag[c]! > 0)) return null;
      for (let e = 0; e <= c; e++) {
        let sum = S[c]![e]!; for (let k = 0; k < e; k++) sum -= Lm[c]![k]! * Lm[e]![k]!;
        if (c === e) { if (!(sum > 1e-10 * diag[c]!)) return null; Lm[c]![c] = Math.sqrt(sum); } else Lm[c]![e] = sum / Lm[e]![e]!;
      }
    }
    const zw = new Array<number>(p).fill(0);
    for (let c = 0; c < p; c++) { let sum = r[c]!; for (let k = 0; k < c; k++) sum -= Lm[c]![k]! * zw[k]!; zw[c] = sum / Lm[c]![c]!; }
    const b = new Array<number>(p).fill(0);
    for (let c = p - 1; c >= 0; c--) { let sum = zw[c]!; for (let k = c + 1; k < p; k++) sum -= Lm[k]![c]! * b[k]!; b[c] = sum / Lm[c]![c]!; }
    return b;
  };
}
/** Regressionskoeffizient des Prädiktors `j` (0-basiert) für die gezogenen Zeilen; Rangmangel: NaN (zählt als ungültige Ziehung, `intervall()` zählt sie). */
export function koeffizientStatistik(x: number[][], y: number[], j: number): (indizes: Int32Array) => number {
  const alle = koeffizientenAlle(x, y);
  return (idx: Int32Array) => { const b = alle(idx); return b ? b[j]! : NaN; };
}
