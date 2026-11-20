/**
 * Varianzanalyse mit ZWEI Messwiederholungsfaktoren A × B (jede Person ist in jeder Zelle gemessen), optional mit einem Gruppenfaktor G dazu
 * (Field-Stufe 3, 05.11.2026). Eigener Code auf den Rohdaten, nur vollständige Fälle; Daten breit: eine Spalte je Zelle, Spalte i·b + j = Stufe i von A, Stufe j von B.
 *
 * Wie `afex::aov_ez` (car::Anova, Typ III mit Summenkodierung): Jeder Effekt hat seinen EIGENEN Fehlerterm (Effekt × Person). Rechenweg: Die Zellwerte jeder Person werden mit
 * orthonormalen Kontrasten des Effekts umgerechnet (A: Helmert über A, gemittelt über B; B: umgekehrt; A×B: Produkt beider). Die Quadratsumme des Effekts ist die Spur der
 * Hypothesenmatrix, die Fehlerquadratsumme die Spur der Kreuzproduktmatrix der Reste innerhalb der Gruppen. Greenhouse-Geisser-ε und Huynh-Feldt-ε (Lecoutre 1991, wie car)
 * kommen aus dieser Fehler-Kreuzproduktmatrix. Mit Gruppen testet Typ III (bei ungleich großen Gruppen) die ungewichteten Mittel der Gruppenmittel; bei gleich großen Gruppen
 * sind Typ II und III gleich.
 *
 * Generalisiertes η² (ges, Olejnik & Algina) wie afex ohne „beobachtete“ Faktoren: SS_Effekt / (SS_Effekt + Summe ALLER Fehlerquadratsummen).
 * Sollwerte: docs/fachblaetter/sollwerte/field-stufe3.json (mw_zwei, mw_gemischt), Test messwiederholung2.test.ts.
 *
 * ⚠ Von der Fachperson abzunehmen: Standard-Korrektur Greenhouse-Geisser (wie afex); KI des partiellen η² über das nichtzentrale F mit unkorrigierten Freiheitsgraden.
 */
import { eta2Bereich } from './effektki';
import { invers } from './robustse';
import { holm } from './rangtests';
import { helmertKontraste, korrigiert as korrigiertMw, messwiederholung, mittel, pF, sphaerizitaet, summe, type MwKorrektur } from './messwiederholung';
import { L } from './sitzung.svelte';

/** Kurzschlüssel: g = Gruppe, a, b = die Messwiederholungsfaktoren, Produkte mit „x“. */
export type Mw2Quelle = 'g' | 'a' | 'b' | 'ab' | 'ga' | 'gb' | 'gab';

export interface Mw2Effekt {
  quelle: Mw2Quelle;
  ss: number; df: number; ssFehler: number; dfFehler: number; f: number;
  /** p ohne Korrektur, mit Greenhouse-Geisser und mit Huynh-Feldt; bei Effekten ohne Messwiederholung (nur die Gruppe) alle gleich. */
  p: number; pGG: number; pHF: number;
  /** ε je Korrektur (1 bei Effekten mit nur einem Freiheitsgrad im Messwiederholungsteil). */
  epsGG: number; epsHF: number;
  etaP: number; etaPLo: number; etaPHi: number;
  etaG: number;
}
export interface Mw2Zelle { n: number; m: number; sd: number }
export interface Mw2Levene { zelle: number; f: number; df1: number; df2: number; p: number }
export interface Mw2 {
  art: 'messwiederholung2';
  /** Namen der beiden Faktoren und ihrer Stufen; Zelle (i, j) steht in Spalte i·b + j. */
  faktorA: string; faktorB: string; stufenA: string[]; stufenB: string[];
  gruppenSpalte?: string; gruppen: { name: string; n: number }[];
  n: number; gesamt: number;
  /** [Gruppe][Zelle]; bei einer Gruppe (ohne Gruppenfaktor) genau eine Zeile */
  zellen: Mw2Zelle[][];
  /** Mittel der Zellen über alle Personen (ungewichtetes Mittel der Gruppenmittel) */
  randZellen: number[];
  effekte: Mw2Effekt[];
  korrektur: MwKorrektur;
  /** Levene-Test je Zelle über die Gruppen (nur mit Gruppenfaktor, nur Hinweis) */
  levene: Mw2Levene[];
  /** Quadratsumme „Personen innerhalb der Gruppen“ */
  ssPersonen: number; dfPersonen: number;
}

export const QUELLEN_OHNE_GRUPPE: Mw2Quelle[] = ['a', 'b', 'ab'];
export const QUELLEN_MIT_GRUPPE: Mw2Quelle[] = ['g', 'a', 'ga', 'b', 'gb', 'ab', 'gab'];

/** Einfaktorielle Varianzanalyse über Gruppen von Werten (klassisch, gemeinsame Varianz). `null` bei weniger als 2 Gruppen, einer Gruppe unter 2 Werten oder ohne Streuung. */
export function einfaktoriell(gruppen: number[][]): { f: number; df1: number; df2: number; p: number; ss: number; ssFehler: number } | null {
  const k = gruppen.length, N = summe(gruppen.map(x => x.length));
  if (k < 2 || gruppen.some(x => x.length < 1) || N - k < 1) return null;
  const gm = gruppen.map(mittel), alle = summe(gruppen.map(x => summe(x))) / N;
  const ss = summe(gruppen.map((x, q) => x.length * (gm[q]! - alle) ** 2));
  const sse = summe(gruppen.map((x, q) => summe(x.map(v => (v - gm[q]!) ** 2))));
  if (!(sse > 0)) return null;
  const f = ss / (k - 1) / (sse / (N - k));
  return { f, df1: k - 1, df2: N - k, p: pF(f, k - 1, N - k), ss, ssFehler: sse };
}

/** Kontrastmatrix des Effekts (Zeilen = orthonormale Kontraste, Spalten = die a·b Zellen). */
function kontrastMatrix(a: number, b: number, art: 'subj' | 'a' | 'b' | 'ab'): number[][] {
  const mA = art === 'a' || art === 'ab' ? helmertKontraste(a) : [Array.from({ length: a }, () => 1 / Math.sqrt(a))];
  const mB = art === 'b' || art === 'ab' ? helmertKontraste(b) : [Array.from({ length: b }, () => 1 / Math.sqrt(b))];
  const aus: number[][] = [];
  for (const ra of mA) for (const rb of mB) aus.push(ra.flatMap(x => rb.map(y => x * y)));
  return aus;
}

const fehler = (t: string) => new Error(t);

/**
 * Berechnet die Varianzanalyse. `daten`: eine Zeile je Person, a·b Spalten (nur vollständige Fälle); `gruppen`: optional die Gruppe jeder Person (2 oder mehr Gruppen mit je mindestens 2 Personen).
 */
export function messwiederholung2(
  daten: number[][], a: number, b: number,
  opt: { faktorA?: string; faktorB?: string; stufenA?: string[]; stufenB?: string[]; gruppen?: (string | number)[]; gruppenSpalte?: string; gesamt?: number } = {}
): Mw2 {
  const N = daten.length, m = a * b;
  if (a < 2 || b < 2) throw fehler(L('Jeder Faktor braucht mindestens zwei Stufen', 'Each factor needs at least two levels'));
  if (daten.some(r => r.length !== m)) throw fehler(L('Zahl der Spalten passt nicht zu den Stufen', 'The number of columns does not match the levels'));
  const vergleich = (x: string | number, y: string | number) => (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'de'));
  const namen = opt.gruppen ? [...new Set(opt.gruppen)].sort(vergleich) : [''];
  const g = namen.length, mitGruppe = !!opt.gruppen && g > 1;
  const zu = opt.gruppen ? opt.gruppen.map(x => namen.indexOf(x)) : daten.map(() => 0);
  const idx = namen.map((_, q) => zu.flatMap((z, i) => (z === q ? [i] : [])));
  const ng = idx.map(l => l.length);
  if (ng.some(n => n < 2)) throw fehler(L('Jede Gruppe braucht mindestens 2 Personen', 'Each group needs at least 2 people'));
  const dfe = N - g;
  if (dfe < Math.max(a, b)) throw fehler(L('Zu wenige Personen für diese Faktoren', 'Too few people for these factors'));
  const nHarm = g / summe(ng.map(n => 1 / n));

  // Je Kontrast-Art: Umrechnung, Fehler-Kreuzprodukte, Quadratsummen der Hypothesen
  const arten: Record<'subj' | 'a' | 'b' | 'ab', { q: number; sspe: number[][]; mInt: number[]; ssInt: number; ssGruppe: number }> = {} as never;
  for (const art of ['subj', 'a', 'b', 'ab'] as const) {
    const C = kontrastMatrix(a, b, art), q = C.length;
    const y = daten.map(r => C.map(c => summe(c.map((v, j) => v * r[j]!))));
    const gm = idx.map(l => Array.from({ length: q }, (_, c) => mittel(l.map(i => y[i]![c]!))));
    const sspe = Array.from({ length: q }, (_, c1) => Array.from({ length: q }, (_, c2) => summe(y.map((r, i) => (r[c1]! - gm[zu[i]!]![c1]!) * (r[c2]! - gm[zu[i]!]![c2]!)))));
    const mInt = Array.from({ length: q }, (_, c) => mittel(gm.map(x => x[c]!)));
    // Typ III für „Achsenabschnitt“: ungewichtetes Mittel der Gruppenmittel, Gewicht g · harmonisches Mittel der Gruppengrößen
    const ssInt = g * nHarm * summe(mInt.map(v => v * v));
    let ssGruppe = 0;
    if (mitGruppe) {
      const LG = Array.from({ length: g - 1 }, (_, j) => Array.from({ length: g }, (__, q2) => (q2 === j ? 1 : q2 === g - 1 ? -1 : 0)));
      const S = LG.map(r1 => LG.map(r2 => summe(r1.map((v, q2) => (v * r2[q2]!) / ng[q2]!))));
      const Si = invers(S);
      if (!Si) throw fehler(L('Gruppen nicht rechenbar', 'Groups cannot be calculated'));
      const LM = LG.map(r => Array.from({ length: q }, (_, c) => summe(r.map((v, q2) => v * gm[q2]![c]!))));
      // Spur von LM' S⁻¹ LM
      for (let c = 0; c < q; c++) for (let i = 0; i < g - 1; i++) for (let j = 0; j < g - 1; j++) ssGruppe += LM[i]![c]! * Si[i]![j]! * LM[j]![c]!;
    }
    arten[art] = { q, sspe, mInt, ssInt, ssGruppe };
  }
  const spur = (mat: number[][]) => mat.reduce((x, r, i) => x + r[i]!, 0);
  const ssFehlerArt = (art: 'subj' | 'a' | 'b' | 'ab') => spur(arten[art].sspe);
  const alleFehler = summe((['subj', 'a', 'b', 'ab'] as const).map(ssFehlerArt));
  if (!(ssFehlerArt('ab') > 1e-12 * Math.max(1, alleFehler))) throw fehler(L('Keine Streuung der Veränderung', 'No variation in the change'));

  const bauen = (quelle: Mw2Quelle, art: 'subj' | 'a' | 'b' | 'ab', gruppe: boolean): Mw2Effekt => {
    const x = arten[art], ssF = ssFehlerArt(art), dfF = x.q * dfe;
    const ss = gruppe ? x.ssGruppe : x.ssInt, df = gruppe ? (g - 1) * x.q : x.q;
    const f = ss / df / (ssF / dfF), [lo, hi] = eta2Bereich(f, df, dfF);
    let epsGG = 1, epsHF = 1;
    if (art !== 'subj' && x.q >= 2) {
      const sp = sphaerizitaet(x.sspe, dfe, x.q + 1);
      epsGG = sp.gg; epsHF = Math.min(1, ((dfe + 1) * x.q * epsGG - 2) / (x.q * (dfe - x.q * epsGG)));
      // Huynh-Feldt: die Formel selbst (wie car); `sphaerizitaet` kappt zusätzlich nach unten bei GG
    }
    return {
      quelle, ss, df, ssFehler: ssF, dfFehler: dfF, f, p: pF(f, df, dfF),
      pGG: pF(f, df * epsGG, dfF * epsGG), pHF: pF(f, df * epsHF, dfF * epsHF), epsGG, epsHF,
      etaP: ss / (ss + ssF), etaPLo: lo, etaPHi: hi, etaG: ss / (ss + alleFehler)
    };
  };
  const effekte: Mw2Effekt[] = mitGruppe
    ? [bauen('g', 'subj', true), bauen('a', 'a', false), bauen('ga', 'a', true), bauen('b', 'b', false), bauen('gb', 'b', true), bauen('ab', 'ab', false), bauen('gab', 'ab', true)]
    : [bauen('a', 'a', false), bauen('b', 'b', false), bauen('ab', 'ab', false)];

  const zellen = idx.map(l => Array.from({ length: m }, (_, j) => {
    const v = l.map(i => daten[i]![j]!), mw = mittel(v);
    return { n: v.length, m: mw, sd: Math.sqrt(summe(v.map(x => (x - mw) ** 2)) / (v.length - 1)) };
  }));
  const randZellen = Array.from({ length: m }, (_, j) => mittel(zellen.map(z => z[j]!.m)));

  // Levene (Abweichungen vom Gruppenmittel der Zelle) je Zelle über die Gruppen - nur Hinweis
  const levene: Mw2Levene[] = [];
  if (mitGruppe) {
    for (let j = 0; j < m; j++) {
      const ab = idx.map((l, q) => l.map(i => Math.abs(daten[i]![j]! - zellen[q]![j]!.m)));
      const r = einfaktoriell(ab);
      if (r) levene.push({ zelle: j, f: r.f, df1: r.df1, df2: r.df2, p: r.p });
    }
  }

  return {
    art: 'messwiederholung2',
    faktorA: opt.faktorA ?? 'A', faktorB: opt.faktorB ?? 'B',
    stufenA: opt.stufenA ?? Array.from({ length: a }, (_, i) => String(i + 1)), stufenB: opt.stufenB ?? Array.from({ length: b }, (_, i) => String(i + 1)),
    gruppenSpalte: opt.gruppenSpalte, gruppen: namen.map((nm, q) => ({ name: String(nm), n: ng[q]! })),
    n: N, gesamt: opt.gesamt ?? N, zellen, randZellen, effekte, korrektur: 'gg', levene,
    ssPersonen: ssFehlerArt('subj'), dfPersonen: dfe
  };
}

/** Freiheitsgrade und p-Wert eines Effekts unter der gewählten Korrektur (die Gruppe allein wird nie korrigiert). */
export function korrigiert2(e: Mw2, ef: Mw2Effekt, kor: MwKorrektur = e.korrektur): { df1: number; df2: number; p: number; eps: number } {
  if (ef.quelle === 'g' || kor === 'keine') return { df1: ef.df, df2: ef.dfFehler, p: ef.p, eps: 1 };
  const eps = kor === 'gg' ? ef.epsGG : ef.epsHF;
  return { df1: ef.df * eps, df2: ef.dfFehler * eps, p: kor === 'gg' ? ef.pGG : ef.pHF, eps };
}
/** Name eines Effekts mit den Namen der Faktoren („A × B“). */
export function effektName(e: Mw2, q: Mw2Quelle): string {
  const n = { g: e.gruppenSpalte ?? L('Gruppe', 'Group'), a: e.faktorA, b: e.faktorB };
  return q.split('').map(c => n[c === 'a' ? 'a' : c === 'b' ? 'b' : 'g']).join(' × ');
}

/* ------------------------------------------------------------------------------------------------------------------
 * Einfache Effekte bei bedeutsamer Wechselwirkung (Field-Stufe 3): jeder einfache Effekt ist eine EIGENE Varianzanalyse auf der Teilmenge
 * (A je Stufe von B und B je Stufe von A: einfaktorielle Messwiederholung über alle Personen; Gruppe je Stufe von A bzw. B: einfaktorielle
 * Varianzanalyse über die Gruppen auf dem Mittel der anderen Faktoren). Holm-Anpassung je Familie (je Faktor „je Stufe von“). Keine Fehlerterm-Teilung mit dem Gesamtmodell.
 * ------------------------------------------------------------------------------------------------------------------ */
export interface Mw2Einfach { stufe: string; df1: number; df2: number; f: number; p: number; pHolm: number }
export interface Mw2EinfacheEffekte {
  /** A je Stufe von B (eine Zeile je Stufe von B) und B je Stufe von A */
  aJeB: Mw2Einfach[]; bJeA: Mw2Einfach[];
  /** nur mit Gruppen: Gruppe je Stufe von A bzw. B */
  gruppeJeA: Mw2Einfach[]; gruppeJeB: Mw2Einfach[];
}

function familie(namen: string[], r: ({ f: number; df1: number; df2: number; p: number } | null)[]): Mw2Einfach[] {
  const ok = r.map((x, i) => (x ? i : -1)).filter(i => i >= 0);
  const ph = holm(ok.map(i => r[i]!.p));
  return ok.map((i, k) => ({ stufe: namen[i]!, df1: r[i]!.df1, df2: r[i]!.df2, f: r[i]!.f, p: r[i]!.p, pHolm: ph[k]! }));
}

export function einfacheEffekte(daten: number[][], a: number, b: number, stufenA: string[], stufenB: string[], korrektur: MwKorrektur, gruppen?: (string | number)[]): Mw2EinfacheEffekte {
  const mw = (spalten: number[], namen: string[]) => {
    try {
      const e = messwiederholung(daten.map(r => spalten.map(c => r[c]!)), namen);
      const k = korrigiertMw(e, e.zeit, korrektur);
      return { f: e.zeit.f, df1: k.df1, df2: k.df2, p: k.p };
    } catch { return null; }
  };
  const aJeB = familie(stufenB, stufenB.map((_, j) => mw(Array.from({ length: a }, (__, i) => i * b + j), stufenA)));
  const bJeA = familie(stufenA, stufenA.map((_, i) => mw(Array.from({ length: b }, (__, j) => i * b + j), stufenB)));
  const gl = (zellen: number[]) => {
    if (!gruppen) return null;
    const namen = [...new Set(gruppen)];
    const e = einfaktoriell(namen.map(nm => daten.filter((_, i) => gruppen[i] === nm).map(r => mittel(zellen.map(c => r[c]!)))));
    return e ? { f: e.f, df1: e.df1, df2: e.df2, p: e.p } : null;
  };
  const gruppeJeA = gruppen ? familie(stufenA, stufenA.map((_, i) => gl(Array.from({ length: b }, (__, j) => i * b + j)))) : [];
  const gruppeJeB = gruppen ? familie(stufenB, stufenB.map((_, j) => gl(Array.from({ length: a }, (__, i) => i * b + j)))) : [];
  return { aJeB, bJeA, gruppeJeA, gruppeJeB };
}

/** Wertetabelle aus den Spalten einer Zeile: Mittel über die Zellen eines Faktors, für Kontraste je Faktor (Personen × Stufen des gewählten Faktors, gemittelt über den anderen). */
export function stufenWerte(daten: number[][], a: number, b: number, faktor: 'a' | 'b'): number[][] {
  return daten.map(r => faktor === 'a'
    ? Array.from({ length: a }, (_, i) => mittel(Array.from({ length: b }, (__, j) => r[i * b + j]!)))
    : Array.from({ length: b }, (_, j) => mittel(Array.from({ length: a }, (__, i) => r[i * b + j]!))));
}

/** Vorschlag für die Zuordnung aus Spaltennamen: gleiche Namensteile vor und nach einem Trennzeichen (z. B. „vorher_morgens“). `null`, wenn die Namen nicht in ein Raster passen. */
export function rasterVorschlag(namen: string[]): { a: string[]; b: string[]; reihenfolge: number[] } | null {
  const teile = namen.map(n => n.split(/[_\-. ]+/).filter(Boolean));
  if (teile.length < 4 || teile.some(t => t.length !== 2)) return null;
  const aStufen = [...new Set(teile.map(t => t[0]!))], bStufen = [...new Set(teile.map(t => t[1]!))];
  if (aStufen.length < 2 || bStufen.length < 2 || aStufen.length * bStufen.length !== namen.length) return null;
  const reihenfolge = aStufen.flatMap(x => bStufen.map(y => teile.findIndex(t => t[0] === x && t[1] === y)));
  if (reihenfolge.some(i => i < 0) || new Set(reihenfolge).size !== namen.length) return null;
  return { a: aStufen, b: bStufen, reihenfolge };
}
