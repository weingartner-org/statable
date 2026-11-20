/**
 * Permutationstest für Gruppen und Korrelation (Später, Welle S-B, Teil 6, L5; Fachblatt SPAETER-B-OPTIONEN.md Abschnitt 6 und „Entscheidungen Opus“).
 * Reine Funktionen ohne Oberfläche; Sätze und Tabellen: lib/zufallsaetze.ts. Das Bootstrap-Gegenstück (geschichtete Ziehung, Regressionskoeffizient) steht in lib/bootstrap.ts.
 *
 *  - Gruppen: 'mittel' permutiert das WELCH-t (studentisiert: der einfache Permutationstest hält das Niveau bei ungleicher Streuung und ungleichem n nicht - Fehler 1. Art
 *    29,7 % gegen 5 %; Boik 1987, Janssen 1997, Chung & Romano 2013); 'median' die rohe Differenz der Mediane; 'mittel-roh' die rohe Differenz der Mittel (Lehrfälle und der Gleichheitstest
 *    mit dem Lernlabor). Zweiseitig: |T*| ≥ |T0| mit relativer Toleranz 1e-9. Bis 20 000 Aufteilungen alle (p = b/Gesamt, die beobachtete ist dabei), sonst B Zufallsaufteilungen
 *    (p = (b + 1)/(B + 1), nie 0; Phipson & Smyth 2010).
 *  - Korrelation: Permutation der y-Werte gegen die x-Werte; bis n = 8 alle n! Anordnungen, darüber B Zufallsanordnungen.
 *  - Läufe in Stücken für die Oberfläche (Lade-Animation, Abbrechen): `permutationGruppenLauf`, `permutationKorrelationLauf` (Muster `Lauf` aus lernlabor.ts).
 * Das Lernlabor bleibt unberührt (eigene Wege, sichtbare Einzelziehungen); der Test sichert die Gleichheit der Vollauszählung.
 * Nicht gebaut (Entscheidung Opus): Freedman-Lane, Residuen-Bootstrap, Permutationstest einzelner Regressionskoeffizienten.
 */
import { zufall } from './zufall';
import { tQuantil } from './verteilung';
import { BOOT_B, BOOT_STARTWERT } from './bootstrap';
import type { Lauf } from './lernlabor';

export const VOLLAUSZAEHLUNG_MAX = 20000;
export const KORRELATION_EXAKT_BIS = 8;
export const ZUFALL_B_MAX = 99999;
export const ZUFALL_GEWICHT_MAX = 100000;

const TOL = 1e-9;
/** |T*| ≥ |T0| mit relativer Toleranz (Gleitkomma-Reste bei gleichen Werten). */
const mindestens = (t: number, t0: number) => Math.abs(t) >= Math.abs(t0) * (1 - TOL);

/** C(n, k), aber nur genau bis `grenze`: darüber Infinity (wie lernlabor.aufteilungen). */
export function aufteilungen(n: number, k: number, grenze = VOLLAUSZAEHLUNG_MAX): number {
  k = Math.min(k, n - k); let r = 1;
  for (let i = 1; i <= k; i++) { r = (r * (n - k + i)) / i; if (r > grenze) return Infinity; }
  return Math.round(r);
}

const mittel = (a: ArrayLike<number>, von = 0, bis = a.length) => { let s = 0; for (let i = von; i < bis; i++) s += a[i]!; return s / (bis - von); };
const varianz = (a: ArrayLike<number>, von = 0, bis = a.length) => { const m = mittel(a, von, bis); let s = 0; for (let i = von; i < bis; i++) s += (a[i]! - m) ** 2; return s / (bis - von - 1); };

/** Welch-t: Differenz der Mittel durch √(s₁²/n₁ + s₂²/n₂). SE = 0: 0 bei gleichen Mitteln, sonst ±Infinity; weniger als 2 Werte in einer Gruppe: NaN. */
export function welchT(x: number[], y: number[]): number {
  const n1 = x.length, n2 = y.length;
  if (n1 < 2 || n2 < 2) return NaN;
  const diff = mittel(x) - mittel(y), se2 = varianz(x) / n1 + varianz(y) / n2;
  if (!(se2 > 0)) return diff === 0 ? 0 : diff > 0 ? Infinity : -Infinity;
  return diff / Math.sqrt(se2);
}
/** Welch-t-Intervall (Welch-Satterthwaite) für die Differenz der Mittel - wie R `t.test(var.equal = FALSE)`. */
export function welchKi(x: number[], y: number[], niveau = 0.95): { differenz: number; lo: number; hi: number; df: number } {
  const n1 = x.length, n2 = y.length, a = varianz(x) / n1, b = varianz(y) / n2, se = Math.sqrt(a + b), df = (a + b) ** 2 / (a * a / (n1 - 1) + b * b / (n2 - 1));
  const diff = mittel(x) - mittel(y), t = tQuantil(1 - (1 - niveau) / 2, df);
  return { differenz: diff, lo: diff - t * se, hi: diff + t * se, df };
}

/* ===================================================================================================================== Gruppen */
export type PermStatistik = 'mittel' | 'mittel-roh' | 'median';
export interface PermErgebnis {
  statistik: PermStatistik; modus: 'exakt' | 'zufall'; n1: number; n2: number;
  /** die Prüfgröße der beobachteten Aufteilung (Welch-t bzw. Differenz) */
  t0: number;
  /** Differenz der Mittel (bzw. der Mediane bei 'median') */
  differenz: number;
  b: number; gesamt: number;
  /** Bei grund 'zu-wenig' null (nie NaN). */
  p: number;
  B: number | null; startwert: number | null;
  grund: null | 'zu-wenig'; hinweise: 'welch-ersatz'[];
}
const medianVon = (a: ArrayLike<number>, von: number, bis: number): number => {
  const w = Array.from({ length: bis - von }, (_, i) => a[von + i]!).sort((p, q) => p - q), m = w.length >> 1;
  return w.length % 2 ? w[m]! : (w[m - 1]! + w[m]!) / 2;
};

/** Die Prüfgröße zu einer Anordnung: die ersten n1 Elemente sind Gruppe 1, der Rest Gruppe 2. */
function statistikFunktion(art: PermStatistik, n1: number, n: number): (r: ArrayLike<number>) => number {
  if (art === 'median') return r => medianVon(r, 0, n1) - medianVon(r, n1, n);
  if (art === 'mittel-roh') return r => mittel(r, 0, n1) - mittel(r, n1, n);
  return r => {
    const n2 = n - n1; let s1 = 0, q1 = 0, s2 = 0, q2 = 0;
    for (let i = 0; i < n1; i++) { s1 += r[i]!; q1 += r[i]! * r[i]!; }
    for (let i = n1; i < n; i++) { s2 += r[i]!; q2 += r[i]! * r[i]!; }
    const m1 = s1 / n1, m2 = s2 / n2, v1 = (q1 - n1 * m1 * m1) / (n1 - 1), v2 = (q2 - n2 * m2 * m2) / (n2 - 1), diff = m1 - m2, se2 = Math.max(0, v1) / n1 + Math.max(0, v2) / n2;
    if (!(se2 > 1e-300)) return Math.abs(diff) < 1e-12 * (1 + Math.abs(m1)) ? 0 : diff > 0 ? Infinity : -Infinity;
    return diff / Math.sqrt(se2);
  };
}

export interface PermOpt { statistik?: PermStatistik; B?: number; startwert?: number }

/** Ein Permutationstest für zwei Gruppen als Lauf in Stücken (`schritt(maxMs)`), für die Oberfläche; `permutationGruppen` rechnet bis zum Ende. */
export function permutationGruppenLauf(x: number[], y: number[], opt: PermOpt = {}): Lauf<PermErgebnis> {
  const xs = x.filter(Number.isFinite), ys = y.filter(Number.isFinite), n1 = xs.length, n2 = ys.length, n = n1 + n2;
  let art = opt.statistik ?? 'mittel';
  const hinweise: 'welch-ersatz'[] = [];
  const B = Math.min(Math.max(Math.round(opt.B ?? BOOT_B), 1), ZUFALL_B_MAX), startwert = opt.startwert ?? BOOT_STARTWERT;
  if (!n1 || !n2) {
    const r: PermErgebnis = { statistik: art, modus: 'exakt', n1, n2, t0: 0, differenz: 0, b: 0, gesamt: 0, p: null as unknown as number, B: null, startwert: null, grund: 'zu-wenig', hinweise };
    return { fertig: () => true, anteil: () => 1, schritt: () => {}, ergebnis: () => r };
  }
  if (art === 'mittel' && (n1 < 2 || n2 < 2)) { art = 'mittel-roh'; hinweise.push('welch-ersatz'); }   // Welch-t braucht in jeder Gruppe zwei Werte
  // Zentrieren (nur Mittelwerte: das Welch-t und die Differenz ändern sich dadurch nicht, die Rechnung wird genauer)
  const gm = art === 'median' ? 0 : mittel([...xs, ...ys]);
  const alle = [...xs, ...ys].map(v => v - gm), f = statistikFunktion(art, n1, n);
  const t0 = f(alle), differenz = art === 'median' ? medianVon(alle, 0, n1) - medianVon(alle, n1, n) : mittel(xs) - mittel(ys);
  const gesamtAlle = aufteilungen(n, n1), exakt = Number.isFinite(gesamtAlle);
  const zaehl = { b: 0, i: 0 };
  const kopf = { statistik: art, n1, n2, t0, differenz, grund: null as null, hinweise };
  if (exakt) {
    let fertig = false, erg: PermErgebnis | null = null;
    const rechne = () => {
      const reihe = new Float64Array(n), gewaehlt = new Uint8Array(n);
      let b = 0;
      const rek = (start: number, k: number) => {
        if (k === n1) {
          let a = 0, c = n1; for (let i = 0; i < n; i++) { if (gewaehlt[i]) reihe[a++] = alle[i]!; else reihe[c++] = alle[i]!; }
          if (mindestens(f(reihe), t0)) b++;
          return;
        }
        for (let i = start; i <= n - (n1 - k); i++) { gewaehlt[i] = 1; rek(i + 1, k + 1); gewaehlt[i] = 0; }
      };
      rek(0, 0);
      erg = { ...kopf, modus: 'exakt', b, gesamt: gesamtAlle, p: b / gesamtAlle, B: null, startwert: null };
      fertig = true;
    };
    return { fertig: () => fertig, anteil: () => (fertig ? 1 : 0), schritt: () => { if (!fertig) rechne(); }, ergebnis: () => { if (!erg) throw new Error('Lauf nicht fertig'); return erg; } };
  }
  const rng = zufall(startwert), reihe = Float64Array.from(alle);
  const jetzt = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  return {
    fertig: () => zaehl.i >= B,
    anteil: () => zaehl.i / B,
    schritt(maxMs = Infinity) {
      const start = maxMs === Infinity ? 0 : jetzt();
      while (zaehl.i < B) {
        for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = reihe[i]!; reihe[i] = reihe[j]!; reihe[j] = t; }   // Fisher-Yates
        if (mindestens(f(reihe), t0)) zaehl.b++;
        zaehl.i++;
        if (maxMs !== Infinity && (zaehl.i & 15) === 0 && jetzt() - start >= maxMs) break;
      }
    },
    ergebnis() {
      if (zaehl.i < B) throw new Error('Lauf nicht fertig');
      return { ...kopf, modus: 'zufall', b: zaehl.b, gesamt: B, p: (zaehl.b + 1) / (B + 1), B, startwert };
    }
  };
}
export function permutationGruppen(x: number[], y: number[], opt: PermOpt = {}): PermErgebnis {
  const l = permutationGruppenLauf(x, y, opt); l.schritt(Infinity); return l.ergebnis();
}

/* ===================================================================================================================== Korrelation */
export interface PermKorrelation {
  modus: 'exakt' | 'zufall'; n: number; r: number | null; b: number; gesamt: number; p: number | null; B: number | null; startwert: number | null;
  grund: null | 'keine-streuung' | 'zu-wenig';
}
export interface PermKorrOpt { B?: number; startwert?: number }
/** Permutationstest für r als Lauf in Stücken. p zweiseitig: |r*| ≥ |r₀| (die Nenner sind in allen Anordnungen gleich, verglichen wird die zentrierte Kreuzproduktsumme). */
export function permutationKorrelationLauf(x: number[], y: number[], opt: PermKorrOpt = {}): Lauf<PermKorrelation> {
  const n = Math.min(x.length, y.length);
  const B = Math.min(Math.max(Math.round(opt.B ?? BOOT_B), 1), ZUFALL_B_MAX), startwert = opt.startwert ?? BOOT_STARTWERT;
  const fertigMit = (r: PermKorrelation): Lauf<PermKorrelation> => ({ fertig: () => true, anteil: () => 1, schritt: () => {}, ergebnis: () => r });
  const leer = { modus: 'exakt' as const, n, r: null, b: 0, gesamt: 0, p: null, B: null, startwert: null };
  if (n < 2) return fertigMit({ ...leer, grund: 'zu-wenig' });
  const mx = mittel(x, 0, n), my = mittel(y, 0, n), xc = Float64Array.from({ length: n }, (_, i) => x[i]! - mx), yc = Float64Array.from({ length: n }, (_, i) => y[i]! - my);
  let sxx = 0, syy = 0, sxy = 0; for (let i = 0; i < n; i++) { sxx += xc[i]! * xc[i]!; syy += yc[i]! * yc[i]!; sxy += xc[i]! * yc[i]!; }
  if (!(sxx > 0) || !(syy > 0)) return fertigMit({ ...leer, grund: 'keine-streuung' });
  const r = sxy / Math.sqrt(sxx * syy), schwelle = Math.abs(sxy) - TOL * Math.sqrt(sxx * syy);
  const kreuz = (p: ArrayLike<number>) => { let s = 0; for (let i = 0; i < n; i++) s += xc[i]! * p[i]!; return s; };
  if (n <= KORRELATION_EXAKT_BIS) {
    let fertig = false, erg: PermKorrelation | null = null;
    const rechne = () => {
      const a = Float64Array.from(yc); let b = 0, gesamt = 0;
      const c = new Array<number>(n).fill(0);   // Heap-Algorithmus (nicht rekursiv)
      const pruefe = () => { gesamt++; if (Math.abs(kreuz(a)) >= schwelle) b++; };
      pruefe();
      let i = 0;
      while (i < n) {
        if (c[i]! < i) { const j = i % 2 === 0 ? 0 : c[i]!; const t = a[j]!; a[j] = a[i]!; a[i] = t; pruefe(); c[i]!++; i = 0; } else { c[i] = 0; i++; }
      }
      erg = { modus: 'exakt', n, r, b, gesamt, p: b / gesamt, B: null, startwert: null, grund: null };
      fertig = true;
    };
    return { fertig: () => fertig, anteil: () => (fertig ? 1 : 0), schritt: () => { if (!fertig) rechne(); }, ergebnis: () => { if (!erg) throw new Error('Lauf nicht fertig'); return erg; } };
  }
  const rng = zufall(startwert), a = Float64Array.from(yc), zaehl = { b: 0, i: 0 };
  const jetzt = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  return {
    fertig: () => zaehl.i >= B,
    anteil: () => zaehl.i / B,
    schritt(maxMs = Infinity) {
      const start = maxMs === Infinity ? 0 : jetzt();
      while (zaehl.i < B) {
        for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]!; a[i] = a[j]!; a[j] = t; }
        if (Math.abs(kreuz(a)) >= schwelle) zaehl.b++;
        zaehl.i++;
        if (maxMs !== Infinity && (zaehl.i & 15) === 0 && jetzt() - start >= maxMs) break;
      }
    },
    ergebnis() {
      if (zaehl.i < B) throw new Error('Lauf nicht fertig');
      return { modus: 'zufall', n, r, b: zaehl.b, gesamt: B, p: (zaehl.b + 1) / (B + 1), B, startwert, grund: null };
    }
  };
}
export function permutationKorrelation(x: number[], y: number[], opt: PermKorrOpt = {}): PermKorrelation {
  const l = permutationKorrelationLauf(x, y, opt); l.schritt(Infinity); return l.ergebnis();
}
