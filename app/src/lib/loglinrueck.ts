/**
 * Loglineare Analyse wie SPSS HILOGLINEAR (Field-Stufe 3b, 05.11.2026): K-Weg-Tabelle und schrittweise Rückwärts-Eliminierung, hierarchisch. Reine Rechnung im Browser
 * (iterative proportionale Anpassung, IPF), ohne R: Die Zelltabelle kommt aus `logDaten` (lib/loglinear.ts), jede Zelle gezählt, auch die leeren.
 *
 *  - Test „k-Weg- und höhere Effekte sind 0“: Modell mit allen Effekten bis zur Ordnung k − 1 (k = 1: alle Zellen gleich); G² und Pearson-X² dieses Modells.
 *  - Test „genau k-Weg-Effekte sind 0“: Differenz zum Modell der nächsthöheren Ordnung (bei k = höchste Ordnung: das gesättigte Modell, G² = 0).
 *  - Rückwärts: Start gesättigt. In jedem Schritt wird jeder Term der erzeugenden Klasse (jeder Term, der in keinem anderen Term enthalten ist) probeweise entfernt
 *    (hierarchisch: seine Teilterme bleiben); entfernt wird der Term mit dem größten p des Teilchi-Quadrats ΔG², solange dieses p über dem Kriterium liegt (Standard 0,05).
 * Sollwerte: R (MASS::loglm) für HairEyeColor, docs/fachblaetter/sollwerte/field-stufe3.json, Abschnitt loglinear (Opus); siehe loglinrueck.test.ts.
 * Die automatische Suche ist zufallsabhängig: Ein anderes Stichprobenbild oder ein anderes Kriterium kann ein anderes Endmodell geben; die p-Werte des Endmodells ignorieren die Suche.
 */
import { chiQuadratP } from './verteilung';
import { logDaten, logHuelle, type LogDaten } from './loglinear';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';

export interface ZellTabelle { dims: number[]; zahl: number[]; n: number }
/** Die volle Zelltabelle (letzter Faktor läuft am schnellsten) aus den Zeilen mit Angaben in allen Faktoren; leere Zellen stehen mit 0 da. */
export function zellTabelle(dt: LogDaten): ZellTabelle {
  const k = dt.faktoren.length, dims = dt.stufen, spalten = dt.spalten.slice(0, k), h = dt.haeuf ? dt.spalten[k] : null;
  const zellen = dims.reduce((a, b) => a * b, 1), zahl = new Array<number>(zellen).fill(0);
  const rows = spalten[0]?.werte.length ?? 0;
  for (let r = 0; r < rows; r++) {
    let idx = 0, ok = true;
    for (let j = 0; j < k; j++) { const c = spalten[j]!.werte[r]; if (typeof c !== 'number') { ok = false; break; } idx = idx * dims[j]! + (c - 1); }
    const w = h ? h.werte[r] : 1;
    if (!ok || typeof w !== 'number') continue;
    zahl[idx]! += w;
  }
  return { dims, zahl, n: zahl.reduce((a, b) => a + b, 0) };
}

const sort = (t: number[]) => [...t].sort((a, b) => a - b);
const schl = (t: number[]) => t.join('-');
/** Alle Teilmengen der Größe m von {0..k-1}. */
export function teilmengenGroesse(k: number, m: number): number[][] {
  const aus: number[][] = [];
  const rek = (start: number, akt: number[]) => { if (akt.length === m) { aus.push([...akt]); return; } for (let i = start; i < k; i++) rek(i + 1, [...akt, i]); };
  rek(0, []); return aus;
}
/** Nur die Terme, die in keinem anderen enthalten sind (erzeugende Klasse). */
export function erzeugende(terme: number[][]): number[][] {
  const eind = [...new Map(terme.map(t => [schl(sort(t)), sort(t)])).values()];
  return eind.filter(t => !eind.some(u => u !== t && u.length > t.length && t.every(i => u.includes(i))));
}

export interface Anpassung { erwartet: number[]; g2: number; df: number; x2: number; iter: number; konvergiert: boolean }
/** Iterative proportionale Anpassung an die Randtabellen der erzeugenden Terme. */
export function anpassen(tab: ZellTabelle, gen: number[][]): Anpassung {
  const { dims, zahl, n } = tab, k = dims.length, zellen = zahl.length;
  const schritt = new Array<number>(k); schritt[k - 1] = 1; for (let j = k - 2; j >= 0; j--) schritt[j] = schritt[j + 1]! * dims[j + 1]!;
  const koord = (i: number, j: number) => Math.floor(i / schritt[j]!) % dims[j]!;
  // je Term: Zuordnung Zelle → Randzelle
  const rand = gen.map(t => { const rd = t.map(j => dims[j]!), anz = rd.reduce((a, b) => a * b, 1); const zu = new Array<number>(zellen); for (let i = 0; i < zellen; i++) { let m = 0; for (const j of t) m = m * dims[j]! + koord(i, j); zu[i] = m; } const soll = new Array<number>(anz).fill(0); for (let i = 0; i < zellen; i++) soll[zu[i]!]! += zahl[i]!; return { zu, soll, anz }; });
  const fit = new Array<number>(zellen).fill(n / zellen);
  let iter = 0, konv = gen.length === 0;
  for (; iter < 2000 && !konv; iter++) {
    let diff = 0;
    for (const r of rand) {
      const ist = new Array<number>(r.anz).fill(0); for (let i = 0; i < zellen; i++) ist[r.zu[i]!]! += fit[i]!;
      for (let i = 0; i < zellen; i++) { const q = ist[r.zu[i]!]!; if (q > 0) { const neu = (fit[i]! * r.soll[r.zu[i]!]!) / q; diff = Math.max(diff, Math.abs(neu - fit[i]!)); fit[i] = neu; } }
    }
    if (diff < 1e-11 * Math.max(1, n)) { konv = true; iter++; break; }
  }
  let g2 = 0, x2 = 0;
  for (let i = 0; i < zellen; i++) { const o = zahl[i]!, e = fit[i]!; if (o > 0 && e > 0) g2 += o * Math.log(o / e); if (e > 0) x2 += (o - e) ** 2 / e; }
  const param = 1 + parameterZahl(gen, dims);
  return { erwartet: fit, g2: 2 * g2, df: zellen - param, x2, iter, konvergiert: konv };
}
/** Zahl der freien Parameter der Terme der Hülle (ohne Konstante): Produkt (Stufen − 1) je Term. Faktoren ohne Term im Modell zählen nicht. */
function parameterZahl(gen: number[][], dims: number[]): number {
  const alle = new Map<string, number[]>();
  for (const t of gen) for (let m = 1; m < 1 << t.length; m++) { const s = sort(t.filter((_, i) => m & (1 << i))); alle.set(schl(s), s); }
  let p = 0; for (const t of alle.values()) p += t.reduce((a, j) => a * (dims[j]! - 1), 1);
  return p;
}

export interface KWegZeile { k: number; g2Hoeher: number; dfHoeher: number; pHoeher: number; x2Hoeher: number; pX2Hoeher: number; g2Genau: number; dfGenau: number; pGenau: number; x2Genau: number; pX2Genau: number }
const pc = (x: number, df: number) => (df > 0 ? chiQuadratP(Math.max(x, 0), df) : NaN);
/** K-Weg-Tabelle für k = 1 … Zahl der Faktoren. */
export function kWegTabelle(tab: ZellTabelle): KWegZeile[] {
  const K = tab.dims.length;
  const ohne = (k: number) => anpassen(tab, k === 1 ? [] : teilmengenGroesse(K, k - 1));   // Modell mit allen Effekten bis Ordnung k − 1
  const voll: Anpassung = { erwartet: tab.zahl.slice(), g2: 0, df: 0, x2: 0, iter: 0, konvergiert: true };
  const m = Array.from({ length: K }, (_, i) => ohne(i + 1));
  return m.map((a, i) => {
    const b = i + 1 < K ? m[i + 1]! : voll;
    const g2g = a.g2 - b.g2, dfg = a.df - b.df, x2g = a.x2 - b.x2;
    return { k: i + 1, g2Hoeher: a.g2, dfHoeher: a.df, pHoeher: pc(a.g2, a.df), x2Hoeher: a.x2, pX2Hoeher: pc(a.x2, a.df), g2Genau: g2g, dfGenau: dfg, pGenau: pc(g2g, dfg), x2Genau: x2g, pX2Genau: pc(x2g, dfg) };
  });
}

export interface RueckKandidat { term: number[]; dG2: number; dDf: number; p: number }
export interface RueckSchritt { gen: number[][]; g2: number; df: number; kandidaten: RueckKandidat[]; entfernt: number[] | null }
export interface RueckErgebnis {
  kriterium: number; schritte: RueckSchritt[]; gen: number[][]; terme: number[][]; g2: number; df: number; p: number; x2: number; pX2: number; erwartet: number[]; konvergiert: boolean
}
/** Modell ohne den Term `t` (hierarchisch): seine nächstkleineren Teilterme bleiben, soweit nicht schon von einem anderen Term abgedeckt. */
export function ohneTerm(gen: number[][], t: number[]): number[][] {
  const rest = gen.filter(g => schl(sort(g)) !== schl(sort(t)));
  const unter = t.length > 1 ? teilmengenGroesse(t.length, t.length - 1).map(ix => ix.map(i => t[i]!)) : [];
  return erzeugende([...rest, ...unter]);
}
/** Rückwärts-Eliminierung wie SPSS HILOGLINEAR /METHOD=BACKWARD /CRITERIA=P(kriterium). */
export function loglinRueckwaerts(tab: ZellTabelle, kriterium = 0.05): RueckErgebnis {
  const K = tab.dims.length;
  let gen: number[][] = [Array.from({ length: K }, (_, i) => i)];
  let akt = anpassen(tab, gen);
  const schritte: RueckSchritt[] = [];
  for (let guard = 0; guard < 200; guard++) {
    const kand: RueckKandidat[] = gen.map(t => {
      const neu = anpassen(tab, ohneTerm(gen, t)), dG2 = neu.g2 - akt.g2, dDf = neu.df - akt.df;
      return { term: t, dG2, dDf, p: pc(dG2, dDf) };
    }).filter(c => c.dDf > 0);
    const schlechtester = kand.reduce<RueckKandidat | null>((b, c) => (b === null || c.p > b.p ? c : b), null);
    const entf = schlechtester && schlechtester.p > kriterium ? schlechtester : null;
    schritte.push({ gen: gen.map(sort), g2: akt.g2, df: akt.df, kandidaten: kand, entfernt: entf ? entf.term : null });
    if (!entf) break;
    gen = ohneTerm(gen, entf.term); akt = anpassen(tab, gen);
  }
  return { kriterium, schritte, gen: gen.map(sort), terme: logHuelle(gen, K), g2: akt.g2, df: akt.df, p: pc(akt.g2, akt.df), x2: akt.x2, pX2: pc(akt.x2, akt.df), erwartet: akt.erwartet, konvergiert: akt.konvergiert };
}

export interface ZellZeile { stufen: string[]; beob: number; erw: number; rest: number; stdRest: number }
/** Beobachtet und erwartet je Zelle des Endmodells; `labels[j][c]` ist die Beschriftung der Stufe c + 1 von Faktor j. */
export function zellZeilen(tab: ZellTabelle, erwartet: number[], labels: string[][]): ZellZeile[] {
  const { dims } = tab;
  return tab.zahl.map((o, i) => {
    let rest = i; const st: string[] = [];
    for (let j = dims.length - 1; j >= 0; j--) { st[j] = labels[j]?.[rest % dims[j]!] ?? String((rest % dims[j]!) + 1); rest = Math.floor(rest / dims[j]!); }
    const e = erwartet[i]!;
    return { stufen: st, beob: o, erw: e, rest: o - e, stdRest: e > 0 ? (o - e) / Math.sqrt(e) : NaN };
  });
}

export interface RueckLauf { tab: ZellTabelle; kweg: KWegZeile[]; rueck: RueckErgebnis; labels: string[][] }
/** Alles zusammen aus den Zeilen der Tabelle (wie das Modell oben, ohne R): Zelltabelle, K-Weg-Tabelle, Rückwärts-Eliminierung. Wirft bei fehlenden Spalten. */
export function rueckwaertsAusDaten(faktoren: string[], haeuf: string | null, zeilen: Wert[][], spalten: Spalte[], kriterium = 0.05): RueckLauf {
  const dt = logDaten(faktoren, haeuf, zeilen, spalten), tab = zellTabelle(dt);
  return { tab, kweg: kWegTabelle(tab), rueck: loglinRueckwaerts(tab, kriterium), labels: dt.spalten.slice(0, faktoren.length).map(sp => (sp.labels ?? []).map(l => l.label)) };
}
