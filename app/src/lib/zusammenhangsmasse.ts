/**
 * Kreuztabelle-Maße (Später, Welle S-B, M5): Gamma, Kendalls Tau-b und Tau-c, Somers' d, Lambda, Unsicherheitskoeffizient (UC).
 * Fachblatt docs/fachblaetter/SPAETER-B-OPTIONEN.md, Abschnitt 1 mit „Entscheidungen Opus“ und „Belege IBM“.
 *
 * PSPP rechnet (CROSSTABS … /STATISTICS=CHISQ GAMMA D BTAU CTAU LAMBDA UC); dieses Modul liest die Tabellen „Symmetric Measures“ und „Directional Measures“
 * über ihre Beschriftung (nie über die Reihenfolge) und ergänzt, was PSPP nicht ausgibt:
 *  - KI = Wert ∓ 1,959964 · ASE1 („Asymp. Std. Error“, bei der beobachteten Stärke), begrenzt auf [-1; 1] bzw. [0; 1];
 *  - der Test nutzt T („Approx. T“, ASE unter „Maß = 0“): p = 2 · Φ(-|T|). Gamma, Tau-b, Tau-c und Somers' d haben dasselbe T und damit dasselbe p (eine Zeile „Test (ordinale Maße)“);
 *  - UC: p aus dem Likelihood-Quotienten-Test (G², Zeile „Likelihood Ratio“ von PSPP; so rechnet auch SPSS);
 *  - symmetrisches Somers' d: kein ASE, kein KI (PSPP gibt keinen aus; die IBM-Näherung weicht von der Delta-Methode ab);
 *  - Lambda = 0 (PSPP: ASE 0, T nicht berechenbar): Wert ohne KI, T und p, dazu der Satz „Das heißt nicht, dass es keinen Zusammenhang gibt“;
 *  - weniger als zwei besetzte Zeilen oder Spalten: PSPP gibt NaN, Statable liest nichts und sagt es.
 * Keine Oberfläche, keine Sprache außer den Hinweissätzen (`masseHinweisText`).
 */
import type { OutputItem } from '../engine/types';
import { finde, spalte, type Raster } from './tabelle';
import { normal } from './verteilung';
import { L } from './sitzung.svelte';

export type MassArt = 'gamma' | 'tauB' | 'tauC' | 'somersD' | 'lambda' | 'uc';
export type MassRichtung = 'symmetrisch' | 'zeile' | 'spalte';
export interface Mass {
  art: MassArt; richtung: MassRichtung | null; wert: number; ase1: number | null; kiLo: number | null; kiHi: number | null;
  t: number | null; p: number | null; pQuelle: 'T' | 'G2'; keineStreuung: boolean;
}
export type MasseHinweis = 'kleines-n' | 'keine-streuung' | 'lambda-null';
export interface MasseErgebnis {
  fehler: null | 'zu-wenig'; n: number; q: number; masse: Mass[]; testOrdinal: { t: number; p: number } | null; hinweise: MasseHinweis[];
}
export interface MasseNamen { zeile: string; spalte: string; zeileLabel?: string; spalteLabel?: string }

export const Z975 = 1.959963984540054;
/** Ordinale Maße (ein gemeinsames T) gegenüber den nominalen. */
export const ORDINAL: MassArt[] = ['gamma', 'tauB', 'tauC', 'somersD'];
export const GERICHTET: MassArt[] = ['somersD', 'lambda', 'uc'];

/** PSPP-Befehl: die Tabelle Zeilenvariable BY Spaltenvariable mit allen Maßen (und Chi-Quadrat, wegen Likelihood-Quotient und Hinweisen). */
export function masseBefehl(zeile: string, spalte: string): string {
  return `CROSSTABS /TABLES=${zeile} BY ${spalte}\n  /STATISTICS=CHISQ GAMMA D BTAU CTAU LAMBDA UC.`;
}

/** p = 2 · Φ(−|t|). */
export const pAusT = (t: number): number => 2 * normal(-Math.abs(t));

/** Intervall Wert ∓ 1,959964 · ASE1, begrenzt auf [-1; 1] (Gamma, Tau, d) bzw. [0; 1] (Lambda, UC). `null`, wenn es keinen ASE gibt. */
export function kiAusAse(wert: number, ase1: number | null | undefined, art: MassArt): { lo: number; hi: number } | null {
  if (ase1 === null || ase1 === undefined || !Number.isFinite(ase1) || !Number.isFinite(wert)) return null;
  const unten = art === 'lambda' || art === 'uc' ? 0 : -1;
  return { lo: Math.max(unten, wert - Z975 * ase1), hi: Math.min(1, wert + Z975 * ase1) };
}

const endlich = (v: number | undefined | null): number | null => (v === undefined || v === null || !Number.isFinite(v) ? null : v);

/** Besetzte Zeilen und Spalten, Summe, und Anteil der Zellen mit erwarteter Häufigkeit unter 5 (nur besetzte Zeilen und Spalten). */
export function tabellenKennzahlen(tab: number[][]): { n: number; zeilen: number; spalten: number; q: number; zellen: number; unter5: number } {
  const zs = tab.map(z => z.reduce((a, b) => a + b, 0));
  const ss = (tab[0] ?? []).map((_, j) => tab.reduce((a, z) => a + (z[j] ?? 0), 0));
  const n = zs.reduce((a, b) => a + b, 0);
  const z = zs.filter(v => v > 0).length, sp = ss.filter(v => v > 0).length;
  let zellen = 0, unter5 = 0;
  zs.forEach((r, i) => { if (r > 0) ss.forEach((c, j) => { if (c > 0 && n > 0) { zellen++; if ((r * c) / n < 5) unter5++; } }); void i; });
  return { n, zeilen: z, spalten: sp, q: Math.min(z, sp), zellen, unter5 };
}

/** Zeilen eines PSPP-Maßes: Beschriftung des Maßes (Spalte 1, bei Spannen aufgefüllt) und Richtung (Spalte 2 der „Directional Measures“). */
function leseSymmetrisch(r: Raster) {
  const k = { w: spalte(r, /^Value$/), ase: spalte(r, /^Asymp\. Std\. Error$/), t: spalte(r, /^Approx\. T$/) };
  const aus: Partial<Record<'tauB' | 'tauC' | 'gamma', { wert: number; ase1: number | null; t: number | null }>> = {};
  r.t.forEach((z, i) => {
    const text = z.join('|');
    const art = /Kendall's tau-b/.test(text) ? 'tauB' : /Kendall's tau-c/.test(text) ? 'tauC' : /\|Gamma\b|^Gamma\b/.test(text) ? 'gamma' : null;
    const wert = endlich(r.n[i]?.[k.w]);
    if (art && wert !== null) aus[art] = { wert, ase1: endlich(r.n[i]?.[k.ase]), t: endlich(r.n[i]?.[k.t]) };
  });
  return aus;
}
interface DirZeile { art: 'lambda' | 'uc' | 'somersD'; richtung: string; wert: number; ase1: number | null; t: number | null }
function leseGerichtet(r: Raster): DirZeile[] {
  const k = { w: spalte(r, /^Value$/), ase: spalte(r, /^Asymp\. Std\. Error$/), t: spalte(r, /^Approx\. T$/) };
  const aus: DirZeile[] = [];
  let mass: DirZeile['art'] | 'andere' | null = null;
  const kopf = Math.max(1, r.tabelle.headRows[0]);
  for (let i = kopf; i < r.t.length; i++) {
    const z = r.t[i]!;
    const text = z.slice(0, k.w >= 0 ? k.w : 3).join('|');
    if (/\bLambda\b/.test(text)) mass = 'lambda';
    else if (/Uncertainty Coefficient/.test(text)) mass = 'uc';
    else if (/Somers' d/.test(text)) mass = 'somersD';
    else if (/Goodman and Kruskal tau/.test(text)) mass = 'andere';
    if (!mass || mass === 'andere') continue;
    const richtung = z[Math.max(0, (k.w >= 0 ? k.w : 3) - 1)]!;
    const wert = endlich(r.n[i]?.[k.w]);
    if (wert === null || !richtung) continue;
    aus.push({ art: mass, richtung, wert, ase1: endlich(r.n[i]?.[k.ase]), t: endlich(r.n[i]?.[k.t]) });
  }
  return aus;
}
/** Welche der Richtungen („Symmetric“, „<Name> Dependent“) ist die Zeilenvariable? Zuordnung über die Namen (oder Beschriftungen), nur zur Not über die Reihenfolge der Ausgabe. */
function richtungVon(text: string, namen: MasseNamen, reihenfolge: string[]): MassRichtung | null {
  if (/^Symmetric$/i.test(text.trim())) return 'symmetrisch';
  const m = /^(.*) Dependent$/.exec(text.trim()); if (!m) return null;
  const x = m[1]!.trim().toLowerCase();
  const gleich = (a?: string) => !!a && a.trim().toLowerCase() === x;
  const zi = gleich(namen.zeile) || gleich(namen.zeileLabel), si = gleich(namen.spalte) || gleich(namen.spalteLabel);
  if (zi && !si) return 'zeile';
  if (si && !zi) return 'spalte';
  // Namen passen nicht (oder beide): PSPP schreibt die Zeilenvariable zuerst
  const pos = reihenfolge.indexOf(m[1]!.trim());
  return pos === 0 ? 'zeile' : pos === 1 ? 'spalte' : null;
}

/**
 * Die Maße aus der PSPP-Ausgabe zu `masseBefehl`. `tab`: die Zellhäufigkeiten wie angezeigt (gewichtet = Summen der Gewichte); leere Zeilen und Spalten dürfen darin stehen.
 * `namen`: die Namen der Variablen, wie PSPP sie in „x Dependent“ schreibt (hat die Variable eine Beschriftung, schreibt PSPP diese: dann `zeileLabel`/`spalteLabel`).
 */
export function rechneMasse(items: OutputItem[], tab: number[][], namen: MasseNamen): MasseErgebnis {
  const kz = tabellenKennzahlen(tab);
  if (kz.q <= 1) return { fehler: 'zu-wenig', n: kz.n, q: kz.q, masse: [], testOrdinal: null, hinweise: [] };
  const sym = finde(items, /^Symmetric Measures$/), dir = finde(items, /^Directional Measures$/), chi = finde(items, /^Chi-Square Tests$/);
  const masse: Mass[] = [];
  // Chi-Quadrat: Pearson-p (für den Lambda-Satz) und Likelihood-Quotient (für das p des UC)
  let pPearson: number | null = null, pG2: number | null = null;
  if (chi) {
    const kp = spalte(chi, /^Asymptotic Sig\./);
    chi.t.forEach((z, i) => {
      if (z[0] === 'Pearson Chi-Square') pPearson = endlich(chi.n[i]?.[kp]);
      if (z[0] === 'Likelihood Ratio') pG2 = endlich(chi.n[i]?.[kp]);
    });
  }
  const baue = (art: MassArt, richtung: MassRichtung | null, wert: number, ase1: number | null, t: number | null): Mass => {
    const nullFall = (art === 'lambda' || art === 'uc') && wert === 0 && (ase1 === null || ase1 < 1e-12);   // PSPP: ASE 0, T nicht berechenbar - Statable zeigt dazu kein Intervall und keinen Test
    const asePlausibel = richtung === 'symmetrisch' && art === 'somersD' ? null : ase1;   // symmetrisches Somers' d: kein ASE, kein KI (Entscheidung Opus)
    const kiw = nullFall ? null : kiAusAse(wert, asePlausibel, art);
    const tt = nullFall && art === 'lambda' ? null : t;
    const uc = art === 'uc';
    const p = uc ? pG2 : tt === null ? null : pAusT(tt);
    return {
      art, richtung, wert, ase1: asePlausibel, kiLo: kiw ? kiw.lo : null, kiHi: kiw ? kiw.hi : null, t: tt, p: p !== null && Number.isFinite(p) ? p : null, pQuelle: uc ? 'G2' : 'T',
      keineStreuung: !nullFall && asePlausibel !== null && asePlausibel < 1e-12
    };
  };
  if (sym) {
    const s = leseSymmetrisch(sym);
    for (const art of ['gamma', 'tauB', 'tauC'] as const) { const x = s[art]; if (x) masse.push(baue(art, null, x.wert, x.ase1, x.t)); }
  }
  if (dir) {
    const zeilen = leseGerichtet(dir);
    const reihenfolge: string[] = [];
    for (const z of zeilen) { const m = /^(.*) Dependent$/.exec(z.richtung.trim()); if (m && !reihenfolge.includes(m[1]!.trim())) reihenfolge.push(m[1]!.trim()); }
    for (const z of zeilen) {
      const r = richtungVon(z.richtung, namen, reihenfolge); if (!r) continue;
      masse.push(baue(z.art, r, z.wert, z.ase1, z.t));
    }
  }
  const ordnung: MassArt[] = ['gamma', 'tauB', 'tauC', 'somersD', 'lambda', 'uc'], rr: Record<string, number> = { symmetrisch: 0, zeile: 1, spalte: 2 };
  masse.sort((a, b) => ordnung.indexOf(a.art) - ordnung.indexOf(b.art) || rr[a.richtung ?? 'symmetrisch']! - rr[b.richtung ?? 'symmetrisch']!);
  const g = masse.find(m => m.art === 'gamma') ?? masse.find(m => ORDINAL.includes(m.art) && m.t !== null);
  const testOrdinal = g && g.t !== null ? { t: g.t, p: pAusT(g.t) } : null;
  const hinweise: MasseHinweis[] = [];
  if (kz.n < 30 || (kz.zellen > 0 && kz.unter5 / kz.zellen > 0.2)) hinweise.push('kleines-n');
  if (masse.some(m => m.keineStreuung)) hinweise.push('keine-streuung');
  if (masse.some(m => m.art === 'lambda' && m.wert === 0) && pPearson !== null && pPearson < 0.05) hinweise.push('lambda-null');
  return { fehler: null, n: kz.n, q: kz.q, masse, testOrdinal, hinweise };
}

/** Sätze zu den Hinweisen. */
export function masseHinweisText(code: MasseHinweis | 'zu-wenig'): string {
  switch (code) {
    case 'zu-wenig': return L('Für ein Maß braucht es mindestens zwei Zeilen und zwei Spalten mit Fällen.', 'A measure needs at least two rows and two columns with cases.');
    case 'keine-streuung': return L('Bei diesem perfekten Zusammenhang gibt es keine Streuung - das Intervall ist hier nicht aussagekräftig.', 'With this perfect association there is no scatter - the interval is not meaningful here.');
    case 'kleines-n': return L('Bei so wenigen Fällen ist das Intervall eine Näherung für große Stichproben.', 'With so few cases the interval is an approximation for large samples.');
    case 'lambda-null': return L('λ = 0: Die häufigste Antwort ist in jeder Gruppe dieselbe, darum verbessert die Kenntnis der Gruppe die Vorhersage der häufigsten Antwort nicht. Das heißt nicht, dass es keinen Zusammenhang gibt.', 'λ = 0: the most frequent answer is the same in every group, so knowing the group does not improve the prediction of the most frequent answer. That does not mean there is no association.');
  }
}

/* ------------------------------------------------------------------------------------------------------------------------------ Vorschlag nach Messniveau */
export type SpaltenArt = 'nominal' | 'ordinal' | 'zahl';
export interface MasseVorschlagEingabe { zeile: SpaltenArt; spalte: SpaltenArt; zeilen: number; spalten: number; abhaengig?: 'zeile' | 'spalte' | null; textcodesAlphabetisch?: boolean }
export interface MasseVorschlag { vorgeschlagen: MassArt[]; zuschaltbar: MassArt[]; hinweis: null | 'rang-gruppen' | 'korrelation' | 'ordinal-reihenfolge' }
/** Zahlenspalten mit mehr Stufen gehören nicht in die Kreuztabelle (Hinweis auf die Korrelation). */
export const KORRELATION_AB = 12;

/** Fachblatt 1.2: Welches Maß passt zum Messniveau? Das vorgeschlagene ist vorgewählt, die anderen sind zuschaltbar. Lambda wird nie vorgeschlagen; ordinale Maße gibt es nur bei ordinalen Stufen. */
export function masseVorschlag(o: MasseVorschlagEingabe): MasseVorschlag {
  if ((o.zeile === 'zahl' && o.zeilen > KORRELATION_AB) || (o.spalte === 'zahl' && o.spalten > KORRELATION_AB)) return { vorgeschlagen: [], zuschaltbar: [], hinweis: 'korrelation' };
  const art = (a: SpaltenArt) => (a === 'zahl' ? 'ordinal' : a);
  const a = art(o.zeile), b = art(o.spalte);
  if ((a === 'nominal' && o.zeilen === 2 && b === 'ordinal') || (b === 'nominal' && o.spalten === 2 && a === 'ordinal')) return { vorgeschlagen: [], zuschaltbar: ['uc', 'lambda'], hinweis: 'rang-gruppen' };
  const zwei = o.zeilen === 2 && o.spalten === 2;
  if (zwei) return { vorgeschlagen: [], zuschaltbar: ['gamma', 'uc', 'lambda'], hinweis: null };
  if (a === 'ordinal' && b === 'ordinal') {
    const quadratisch = o.zeilen === o.spalten;
    const hinweis = o.textcodesAlphabetisch ? 'ordinal-reihenfolge' : null;
    if (o.abhaengig) return { vorgeschlagen: ['somersD'], zuschaltbar: quadratisch ? ['tauB', 'gamma'] : ['tauC', 'tauB', 'gamma'], hinweis };
    return quadratisch ? { vorgeschlagen: ['tauB'], zuschaltbar: ['gamma', 'somersD', 'tauC'], hinweis } : { vorgeschlagen: ['tauC'], zuschaltbar: ['somersD', 'gamma', 'tauB'], hinweis };
  }
  return { vorgeschlagen: [], zuschaltbar: ['uc', 'lambda'], hinweis: null };
}
