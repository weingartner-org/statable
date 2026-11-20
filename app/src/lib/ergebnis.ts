/**
 * Ergebnisse aus der PSPP-Ausgabe lesen und in vorsichtige Sätze fassen.
 * ⚠ Die Satz-Vorlagen und Schwellen sind fachlich von einer Statistik-Fachperson abzunehmen (docs/entwurf-opus).
 */
import { type Fehlmenge } from './fehlend';
import type { OutputItem, TableItem } from '../engine/types';
import { finde, raster, spalte } from './tabelle';
import { betai, chiQuadratP, dBereich, dzBereich, lnGamma, tQuantil } from './verteilung';
import { parallelAnalyse } from './parallelanalyse';
import { regGesamttests, type RegFaktor, type RegTerm } from './regfaktor';
import { alphaBereich, eta2Bereich, omega2, oddsRatio2x2, vBereich } from './effektki';
import { L, Lp, s } from './sitzung.svelte';
import { aufzaehlung, dez, dezimal, ki, proz, zitat as anfuehrung, iv, mitNull, dfKlammer } from '../i18n/profil';

/** Ein Wert, der in einer PSPP-Tabelle als Zeilen- oder Spaltenkopf steht („8.10“): PSPP schreibt Zahlen englisch, im Satz gilt das Dezimalzeichen des Sprachprofils. Beschriftungen und Text bleiben, wie sie sind. */
const wertName = (t: string) => (/^-?\d+\.\d+$/.test(t) ? t.replace('.', dezimal()) : t);
import { spearman, kendall, type Korrelationsart, type Rangkorrelation } from './rangkorrelation';
import { partialKorrelation, type PartialArt } from './partialkorrelation';
import { blandAltman, type BlandAltman } from './blandaltman';
import { typicalError, type TypicalError } from './typicalerror';
import { paarvergleiche, PH_STANDARD, streuungUngleich, welchAnova, type PhArt } from './posthoc';
import { diagnose, vierfelder, lrPlusWort, lrMinusWort, type Diagnose, type DiagnoseWahl } from './diagnostik';
import { kappaAusTabelle, kappaTabelle, kappaWort, icc, iccWort, pNormal, type Gewicht, type KappaZahlen, type Icc, type IccMass, type IccModell } from './uebereinstimmung';
import { kleinste, groesste } from './menge';

const T = L;
export { aufzaehlung };

export interface Gruppe { name: string; n: number; m: number; sd: number; kiLo: number; kiHi: number }
export interface ZweiGruppen {
  art: 'zwei-gruppen'; abhaengig: string; gruppenSpalte: string;
  a: Gruppe; b: Gruppe; diff: number; t: number; df: number; p: number; diffLo: number; diffHi: number;
  tKlassisch: number; dfKlassisch: number; pKlassisch: number; d: number; dLo: number; dHi: number; spGepoolt: number;
  /** Hedges g = d · J mit Intervall (Grenzen von d mal J, wie R effectsize::hedges_g); fehlt in alten Projektdateien - dann aus d gerechnet (hedges()). */
  g?: number; gLo?: number; gHi?: number;
}
/** Korrekturfaktor J für Hedges g (exakt über die Gammafunktion, wie R effectsize): J = Γ(df/2) / (√(df/2) · Γ((df − 1)/2)), df = n₁ + n₂ − 2. */
export const hedgesJ = (df: number) => Math.exp(lnGamma(df / 2) - 0.5 * Math.log(df / 2) - lnGamma((df - 1) / 2));
/** Hedges g mit Intervall aus d (Abschlusstest F8). */
export function hedges(e: Pick<ZweiGruppen, 'a' | 'b' | 'd' | 'dLo' | 'dHi' | 'g' | 'gLo' | 'gHi'>): { g: number; gLo: number; gHi: number } {
  if (e.g !== undefined && e.gLo !== undefined && e.gHi !== undefined) return { g: e.g, gLo: e.gLo, gHi: e.gHi };
  const j = hedgesJ(e.a.n + e.b.n - 2);
  return { g: e.d * j, gLo: e.dLo * j, gHi: e.dHi * j };
}
/** Unter dieser Gruppengröße nennt der Satz zum t-Test Hedges g neben d (Abschlusstest F8; Lakens 2013). */
export const HEDGES_UNTER = 20;
/** Warum Statable eine Korrelationsart vorschlägt: 'ordinal' (Skalenniveau), 'stufen' (wenige verschiedene Werte), 'metrisch' (beide Zahlen mit vielen Werten). */
export interface KorrelationsGrund { art: 'ordinal' | 'stufen' | 'metrisch'; /** Bezeichnungen der Spalten, auf die sich der Grund bezieht */ spalten: string[]; stufen?: number }
/** `r`, `p`, `n`, `kiLo`, `kiHi` gelten für `methode` (fehlt = Pearson, alte Projektdateien). `alle` hält die drei Arten, damit das Blatt umschalten kann. */
export interface Zusammenhang {
  art: 'zusammenhang'; x: string; y: string; r: number; p: number; n: number; kiLo: number; kiHi: number;
  /** Nur Spearman/Kendall (ohne Herausrechnen): `true` = p exakt (Spearman n ≤ 9, Kendall n < 50, ohne Bindungen), `false` = Näherung. */
  exakt?: boolean; pNaeherung?: number;
  methode?: Korrelationsart; alle?: Partial<Record<Korrelationsart, Rangkorrelation>>; empfohlen?: Korrelationsart; grund?: KorrelationsGrund;
  /** Partialkorrelation: die Spalten, die herausgerechnet sind. Dann gelten `r`, `p`, `n`, `kiLo`, `kiHi` für die Partialkorrelation (Pearson oder Spearman, nie Kendall),
   *  `einfach` hält die Korrelation von x und y bei denselben Personen ohne Herausrechnen und `df` die Freiheitsgrade (n − 2 − Zahl der Spalten). */
  kontroll?: string[]; einfach?: Partial<Record<Korrelationsart, Rangkorrelation>>; df?: number;
}

const zahl = (v: number | undefined): number => { if (v === undefined || Number.isNaN(v)) throw new Error('Zahl fehlt in der PSPP-Ausgabe'); return v; };

/** t-Test für unabhängige Stichproben. Standard: Welch (Zeile "Equal variances not assumed"). */
export function zweiGruppen(items: OutputItem[], abhaengig: string, gruppenSpalte: string): ZweiGruppen {
  const gs = finde(items, /^Group Statistics$/); const ts = finde(items, /^Independent Samples Test$/);
  if (!gs || !ts) throw new Error('t-Test-Tabellen fehlen');
  const k = { n: spalte(gs, /^N$/), m: spalte(gs, /^Mean$/), sd: spalte(gs, /^Std\. Deviation$/), g: spalte(gs, /^Group$/) };
  const zeilen = gs.t.map((_, i) => i).filter(i => i >= gs.tabelle.headRows[0] && gs.n[i]![k.n] !== undefined);
  const gruppe = (i: number): Gruppe => {
    const n = zahl(gs.n[i]![k.n]), m = zahl(gs.n[i]![k.m]), sd = zahl(gs.n[i]![k.sd]);
    const h = tQuantil(0.975, n - 1) * sd / Math.sqrt(n);
    return { name: gs.t[i]![k.g]!, n, m, sd, kiLo: m - h, kiHi: m + h };
  };
  const a = gruppe(zeilen[0]!), b = gruppe(zeilen[1]!);
  const welch = ts.t.findIndex(z => z.some(c => /not assumed/.test(c)));
  const klass = ts.t.findIndex(z => z.some(c => /Equal variances assumed/.test(c)));
  const c = { t: spalte(ts, /^t$/), df: spalte(ts, /^df$/), p: spalte(ts, /^Sig\. \(2-tailed\)$/), diff: spalte(ts, /^Mean Difference$/), lo: spalte(ts, /^Lower$/), hi: spalte(ts, /^Upper$/) };
  const W = ts.n[welch]!, K = ts.n[klass]!;
  const sp = Math.sqrt(((a.n - 1) * a.sd ** 2 + (b.n - 1) * b.sd ** 2) / (a.n + b.n - 2));
  const d = (a.m - b.m) / sp, [dLo, dHi] = dBereich(d, a.n, b.n);
  return {
    art: 'zwei-gruppen', abhaengig, gruppenSpalte, a, b, diff: zahl(W[c.diff]),
    t: zahl(W[c.t]), df: zahl(W[c.df]), p: zahl(W[c.p]), diffLo: zahl(W[c.lo]), diffHi: zahl(W[c.hi]),
    tKlassisch: zahl(K[c.t]), dfKlassisch: zahl(K[c.df]), pKlassisch: zahl(K[c.p]),
    d, dLo, dHi, spGepoolt: sp, ...hedges({ a, b, d, dLo, dHi })
  };
}

/** Korrelation nach Pearson aus CORRELATIONS; KI über Fisher-z.
 *  Mit `paare` (die Personen mit beiden Angaben) kommen Spearman und Kendall τ_b dazu (eigener Code, PSPP 2.1.1 hat kein NONPAR CORR);
 *  `empfohlen` ist dann die vorgewählte Art. */
export function zusammenhang(items: OutputItem[], x: string, y: string, paare?: [number, number][], empfohlen: Korrelationsart = 'pearson', grund?: KorrelationsGrund): Zusammenhang {
  const t = finde(items, /^Correlations$/); if (!t) throw new Error('Korrelationstabelle fehlt');
  const zeile = (re: RegExp) => t.t.findIndex(z => z.some(c => re.test(c)));
  const zr = zeile(/Pearson Correlation/), zp = zeile(/Sig\. \(2-tailed\)/), zn = t.t.findIndex((z, i) => i > zr && z.some(c => c === 'N'));
  const kol = t.n[zr]!.findIndex(v => v !== undefined && v < 0.99999999);   // die Nicht-Diagonale
  const r = zahl(t.n[zr]![kol]), p = zahl(t.n[zp]![kol]), n = zahl(t.n[zn]![kol]);
  const z = Math.atanh(r), se = 1 / Math.sqrt(n - 3);
  const pe: Rangkorrelation = { r, p, n, kiLo: Math.tanh(z - 1.96 * se), kiHi: Math.tanh(z + 1.96 * se) };
  if (!paare) return { art: 'zusammenhang', x, y, ...pe };
  const alle = { pearson: pe, spearman: spearman(paare), kendall: kendall(paare) };
  return { art: 'zusammenhang', x, y, ...alle[empfohlen], methode: empfohlen, alle, empfohlen, grund };
}

/** Partialkorrelation von x und y bei herausgerechneten `kontroll`-Spalten (eigener Code, partialkorrelation.ts). `zeilen[i] = [x, y, kontrolle1, …]`.
 *  `null`, wenn sie sich nicht rechnen lässt (zu wenige Personen, Spalte ohne Streuung, Kontrollspalten ersetzen einander). */
export function zusammenhangPartial(x: string, y: string, kontroll: string[], zeilen: (number | null | undefined)[][], empfohlen: Korrelationsart = 'pearson', grund?: KorrelationsGrund): Zusammenhang | null {
  const emp: PartialArt = empfohlen === 'spearman' ? 'spearman' : 'pearson';
  const pe = partialKorrelation(zeilen, 'pearson'), sp = partialKorrelation(zeilen, 'spearman');
  const gewaehlt = emp === 'spearman' ? sp : pe;
  if (!gewaehlt) return null;
  const alle: Zusammenhang['alle'] = {}, einfach: Zusammenhang['einfach'] = {};
  if (pe) { alle.pearson = pe.partial; einfach.pearson = pe.einfach; }
  if (sp) { alle.spearman = sp.partial; einfach.spearman = sp.einfach; }
  return { art: 'zusammenhang', x, y, ...gewaehlt.partial, methode: emp, alle, empfohlen: emp, grund, kontroll, einfach, df: gewaehlt.df };
}

/** Dieselbe Auswertung mit einer anderen Korrelationsart (Umschalten im Blatt). Ohne `alle` (alte Projektdatei) bleibt es, wie es ist. */
export function zusammenhangMit(e: Zusammenhang, methode: Korrelationsart): Zusammenhang {
  const z = e.alle?.[methode]; if (!z) return e;
  return { ...e, exakt: undefined, pNaeherung: undefined, ...z, methode, ...(e.kontroll ? { df: z.n - 2 - e.kontroll.length } : {}) };
}

/** Kurzzeichen für den Satz und die APA-Zeile: r, r_s, τ_b (ohne Tiefstellung geschrieben: „rs“, „τb“). */
export const korrZeichen = (m: Korrelationsart = 'pearson') => (m === 'spearman' ? 'rs' : m === 'kendall' ? 'τb' : 'r');
export const korrName = (m: Korrelationsart = 'pearson', partial = false) => partial ? (m === 'spearman' ? T('Partielle Rangkorrelation nach Spearman', "Spearman's partial rank correlation") : T('Partialkorrelation nach Pearson', 'Pearson partial correlation')) : (m === 'spearman' ? T('Rangkorrelation nach Spearman', "Spearman's rank correlation") : m === 'kendall' ? T('Rangkorrelation nach Kendall (τb)', "Kendall's rank correlation (tau-b)") : T('Korrelation nach Pearson', 'Pearson correlation'));

/** Gepaarte Messung (vorher/nachher). Alle Unterschiede sind nachher − vorher; PSPP rechnet vorher − nachher und wird hier umgedreht. */
export interface PraePost {
  art: 'prae-post'; vorher: string; nachher: string; n: number;
  m1: number; sd1: number; m2: number; sd2: number;
  diff: number; sdDiff: number; diffLo: number; diffHi: number; t: number; df: number; p: number; r: number;
  dz: number; dzLo: number; dzHi: number; dav: number;
}

/** t-Test bei gepaarten Stichproben aus `T-TEST PAIRS=vorher WITH nachher (PAIRED)`; d_z = M_diff / SD_diff mit 95 %-Bereich (nichtzentrales t), d_av = M_diff / Mittel der beiden SD (Lakens 2013). */
export function praePost(items: OutputItem[], vorher: string, nachher: string): PraePost {
  const st = finde(items, /^Paired Sample Statistics$/), ko = finde(items, /^Paired Samples Correlations$/), ts = finde(items, /^Paired Samples Test$/);
  if (!st || !ts) throw new Error('t-Test-Tabellen fehlen');
  const k = { n: spalte(st, /^N$/), m: spalte(st, /^Mean$/), sd: spalte(st, /^Std\. Deviation$/) };
  const zeilen = st.t.map((_, i) => i).filter(i => i >= st.tabelle.headRows[0] && st.n[i]![k.n] !== undefined);
  const [a, b] = zeilen as [number, number];
  const n = zahl(st.n[a]![k.n]), m1 = zahl(st.n[a]![k.m]), sd1 = zahl(st.n[a]![k.sd]), m2 = zahl(st.n[b]![k.m]), sd2 = zahl(st.n[b]![k.sd]);
  const c = { m: spalte(ts, /^Mean$/), sd: spalte(ts, /^Std\. Deviation$/), lo: spalte(ts, /^Lower$/), hi: spalte(ts, /^Upper$/), t: spalte(ts, /^t$/), df: spalte(ts, /^df$/), p: spalte(ts, /^Sig\. \(2-tailed\)$/) };
  const z = ts.n.findIndex((r, i) => i >= ts.tabelle.headRows[0] && r[c.t] !== undefined), Z = ts.n[z]!;
  const diff = -zahl(Z[c.m]), sdDiff = zahl(Z[c.sd]), dz = diff / sdDiff, [dzLo, dzHi] = dzBereich(dz, n);
  const kc = ko ? spalte(ko, /^Correlation$/) : -1;
  const rk = ko ? ko.n.find((r, i) => i >= ko.tabelle.headRows[0] && r[kc] !== undefined) : undefined;
  return {
    art: 'prae-post', vorher, nachher, n, m1, sd1, m2, sd2, diff, sdDiff, diffLo: -zahl(Z[c.hi]), diffHi: -zahl(Z[c.lo]),
    t: -zahl(Z[c.t]), df: zahl(Z[c.df]), p: zahl(Z[c.p]), r: rk ? zahl(rk[kc]) : NaN,
    dz, dzLo, dzHi, dav: diff / ((sd1 + sd2) / 2)
  };
}

/** Hat eine Spalte bei allen Personen mit Angabe denselben Wert? Dann liefert PSPP beim t-Test und bei der Korrelation keine Zahl (NaN). */
export function konstant(werte: unknown[], fehlend: Fehlmenge): boolean {
  const gueltig = werte.filter(v => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && fehlend.includes(v)));
  return gueltig.length > 0 && gueltig.every(v => v === gueltig[0]);
}

/** Meldung, wenn sich der Wilcoxon-Test nicht rechnen lässt (`wilcoxonGrund`): weniger als zwei Paare mit Unterschied. */
export const wilcoxonGrundText = (g: 'einPaar' | 'keinUnterschied') => g === 'einPaar'
  ? L('Nur ein Paar hat einen Unterschied. Damit lässt sich kein Test rechnen.', 'Only one pair has a difference. No test can be calculated with that.')
  : L('Kein Paar hat einen Unterschied. Damit lässt sich nichts testen.', 'No pair has a difference. Nothing can be tested with that.');

/** Satz statt Ergebnis, wenn eine Spalte keine Streuung hat (Prüfrunde 07.10., Befund C7) - sonst fehlte der Satz still. */
export function saetzeOhneStreuung(art: 'zwei-gruppen' | 'zusammenhang' | 'prae-post' | 'uebereinstimmung' | 'messwiederholung', name: string, paar: { grund?: 'einPaar' | 'keinUnterschied'; rang?: boolean } = {}): Saetze {
  const was = zitat(name);
  const haupt = art === 'messwiederholung'
    ? T('Die Veränderung über die Zeitpunkte ist bei allen Personen gleich groß (oder es gibt keine Streuung) - so lässt sich nichts testen.', 'The change over the time points is the same for everyone (or there is no spread) - so nothing can be tested.')
    : art === 'uebereinstimmung'
    ? T('Alle Beurteilenden vergeben bei allen Fällen denselben Wert, oder es gibt nur eine einzige Kategorie - so lässt sich keine Übereinstimmung berechnen.', 'All raters give the same value in every case, or there is only one category - so no agreement can be calculated.')
    : art === 'prae-post' && paar.grund
    ? wilcoxonGrundText(paar.grund)
    : art === 'prae-post' && paar.rang
    ? T('Bei allen Personen ist die Veränderung gleich groß - der t-Test lässt sich damit nicht rechnen (keine Streuung). Der Rangtest (Wilcoxon) lässt sich rechnen: Er steht unter dem Ergebnis zur Wahl.', 'The change is the same for everyone - so the t test cannot be calculated (no spread). The rank test (Wilcoxon) can be calculated: choose it below the result.')
    : art === 'prae-post'
    ? T('Bei allen Personen ist die Veränderung gleich groß - so lässt sich nichts über ihre Streuung und damit nichts testen.', 'The change is the same for everyone - so its spread cannot be estimated and nothing can be tested.')
    : art === 'zwei-gruppen'
    ? T(`${was} hat bei allen Personen denselben Wert - so lässt sich nichts vergleichen.`, `${was} has the same value for everyone - so nothing can be compared.`)
    : T(`${was} hat bei allen Personen denselben Wert - so lässt sich nichts über einen Zusammenhang sagen.`, `${was} has the same value for everyone - so nothing can be said about a relationship.`);
  return { haupt, zusatz: '', vorsicht: '', apa: '', marken: [] };
}

/* ---------- Zahlen: Deutsch (DGPs) oder Englisch (APA 7) ---------- */
/** Feste Stellen; Deutsch mit Komma, Englisch mit Punkt. Minus als −. */
/** Nachkommastellen für einen Koeffizienten und sein Intervall: 2, bei |b| < ,1 drei, bei |b| < ,01 vier - sonst steht „0,00 [−0,00; 0,01]“ da (Prüfung C9). */
export const kd = (b: number) => { const a = Math.abs(b); return !Number.isFinite(a) || a === 0 || a >= 0.1 ? 2 : a >= 0.01 ? 3 : 4; };
/** Stellen für einen Mittelwert, eine SD oder eine Spanne (G9): Ab `basis` Stellen, aber nie so wenige, dass ein kleiner Wert als „0,0“ erscheint (zwei gültige Ziffern, höchstens 6 Stellen). */
export const st = (v: number, basis: number) => { const a = Math.abs(v); return !Number.isFinite(a) || a === 0 || a >= 10 ** -basis ? basis : Math.min(6, Math.max(basis, Math.ceil(-Math.log10(a)) + 1)); };
const stMax = (basis: number, ...vs: number[]) => Math.max(...vs.map(v => st(v, basis)));
export const komma = (v: number, stellen = 2) => { const t = (Object.is(Math.round(v * 10 ** stellen), -0) ? 0 : v).toFixed(stellen).replace('-', '−'); return dez(t); };
/** Werte, die nicht größer als 1 werden können (r, p, α, R², β): ohne führende Null. */
export const ohneNull = (v: number, stellen = 2) => (mitNull() ? komma(v, stellen) : komma(v, stellen).replace(/^(−?)0([.,])/, '$1$2'));
/** p-Wert nach APA/DGPs: ohne führende Null, "< ,001" bzw. "< .001" (Dezimalzeichen aus dem Sprachprofil). */
export const pWert = (p: number) => (!Number.isFinite(p) ? '= -' : p < 0.001 ? '< ' + ohneNull(0.001, 3) : p >= 0.9995 ? '> ' + ohneNull(0.999, 3) : '= ' + ohneNull(p, pStellen(p)));
/** Stellen für p: drei, nahe ,05 vier - sonst steht „p = ,050 · unter ,05“ da (Abschlusstest T4; APA 7, 6.36: exakte p-Werte). Rundet es auf ,0500, eine Stelle mehr. */
export const pStellen = (p: number) => { if (!(p >= 0.0495 && p < 0.0505)) return 3; let n = 4; while (n < 6 && Math.round(p * 10 ** n) === 5 * 10 ** (n - 2)) n++; return n; };
/** Wert so gerundet, wie er angezeigt wird (zwei Stellen): Wortstufen hängen daran, nicht am ungerundeten Wert (Abschlusstest T4: „klein · d = 0,50“). */
export const angezeigt = (v: number, stellen = 2) => Math.round(v * 10 ** stellen) / 10 ** stellen;
/** „ · unter ,05“ / „ · über ,05“ (Marke neben dem p-Wert); die Satz-Dateien nutzen dieselbe Funktion. */
export const unter05 = (sig: boolean) => { const g = ohneNull(0.05); return sig ? L(` · unter ${g}`, ` · below ${g}`) : L(` · über ${g}`, ` · above ${g}`); };

export function effektWort(d: number): string {
  const a = angezeigt(Math.abs(d));
  return a < 0.2 ? L('sehr klein', 'very small') : a < 0.5 ? L('klein', 'small') : a < 0.8 ? L('mittelgroß', 'medium-sized') : L('groß', 'large');
}
export function zusammenhangWort(r: number): string {
  const a = angezeigt(Math.abs(r));
  return a < 0.1 ? L('sehr schwach', 'very weak') : a < 0.3 ? L('schwach', 'weak') : a < 0.5 ? L('mittel', 'moderate') : L('stark', 'strong');
}

export interface Saetze { haupt: string; zusatz: string; vorsicht: string; apa: string; marken: { text: string; erklaer: string; hinweis?: boolean }[];
  /** Nur wenn „Bayes-Faktoren zeigen“ an ist (berichtsatz.ts setzt es und hängt den Wert an die APA-Zeile). */
  bayes?: import('./bayessaetze').BayesZeile;
  /** ICC mit zwei Zahlenspalten: die Sätze zu Bland-Altman (Blatt zeigt sie im zugeklappten Abschnitt). */
  ba?: string;
  /** Logistische Regression: der Satz „Ereignis: … (gegen …)“ - der Bericht nennt ihn vor der Statistik-Zeile (N1), das Blatt hat ihn vorn in `zusatz`. */
  ereignis?: string;
  /** Lange Aufzählungen (Faktorenanalyse: Fragen je Komponente). `text` steht wörtlich in `zusatz` (Bericht, Excel, Word lesen ihn so); das Blatt zeigt an seiner
   *  Stelle eine Ausklappliste (`titel`), darin die Gruppen mit Überschrift, ein Eintrag je Zeile, bei viel Breite zweispaltig (Johannes 13.11.: der Fließtext war unlesbar). */
  listen?: { text: string; titel: string; gruppen: { titel?: string; eintraege: string[] }[] }[] }

/** Sätze für den Vergleich zweier Gruppen. `label` übersetzt Spaltennamen in Bezeichnungen. */
export function saetzeZweiGruppen(e0: ZweiGruppen, label: (s: string) => string): Saetze {
  // Kursmodus „klassisch“: t-Test mit gleicher Streuung (gepoolt), Bereich der Differenz mit t(n₁ + n₂ − 2) und dem gepoolten Standardfehler
  const klassisch = kursKlassisch();
  const e: ZweiGruppen = klassisch ? (() => { const se = e0.spGepoolt * Math.sqrt(1 / e0.a.n + 1 / e0.b.n), q = tQuantil(0.975, e0.dfKlassisch); return { ...e0, t: e0.tKlassisch, df: e0.dfKlassisch, p: e0.pKlassisch, diffLo: e0.diff - q * se, diffHi: e0.diff + q * se }; })() : e0;
  const [hoch, tief] = e.a.m >= e.b.m ? [e.a, e.b] : [e.b, e.a];
  const was = zitat(label(e.abhaengig)), grp = label(e.gruppenSpalte);
  const sig = e.p < 0.05;
  const s1 = stMax(1, e.a.m, e.b.m), diff = komma(Math.abs(e.diff), s1);
  // Gerundet kein Unterschied: nicht „0,0 weniger“ (Prüfrunde 07.10., Befund C6). ⚠ Satz-Vorlage von der Fachperson abnehmen lassen.
  const haupt = diff === komma(0, s1)
    ? T(`Die Gruppen „${e.a.name}“ und „${e.b.name}“ (${grp}) hatten bei ${was} im Schnitt fast denselben Wert: ${komma(e.a.m, s1)} gegen ${komma(e.b.m, s1)}.`,
      `The groups "${e.a.name}" and "${e.b.name}" (${grp}) had almost the same value on ${was} on average: ${komma(e.a.m, s1)} vs. ${komma(e.b.m, s1)}.`)
    : T(`Die Gruppe „${tief.name}“ (${grp}) hatte bei ${was} im Schnitt ${diff} weniger als „${hoch.name}“: ${komma(tief.m, s1)} gegen ${komma(hoch.m, s1)}.`,
      `The group "${tief.name}" (${grp}) scored ${diff} lower on ${was} on average than "${hoch.name}": ${komma(tief.m, s1)} vs. ${komma(hoch.m, s1)}.`);
  const zusatz = sig
    ? T(`Der Unterschied ist ${effektWort(e.d)} (nach üblicher Faustregel). Ein mindestens so großer Unterschied wäre selten, wenn es in Wahrheit keinen gäbe (p ${pWert(e.p)}).`,
      `The difference is ${effektWort(e.d)} (by a common rule of thumb). A difference at least this large would be rare if there were truly no difference (p ${pWert(e.p)}).`)
    : T(`Ein so großer Unterschied kommt aber auch dann nicht selten vor, wenn es in Wahrheit keinen gibt (p ${pWert(e.p)}). Die Daten belegen den Unterschied darum nicht - das heißt nicht, dass es keinen gibt.`,
      `A difference this large is not unusual even if there is truly none (p ${pWert(e.p)}). So the data do not show a difference - that does not mean there is none.`);
  const vorsicht = T('Ob die Gruppenzugehörigkeit der Grund ist, zeigen diese Daten nicht.', 'These data do not show whether group membership is the reason.');
  // Welch-Freiheitsgrade mit zwei Stellen wie in den APA-Beispielen. Der Bereich der Differenz zeigt in dieselbe Richtung wie der Satz (Betrag).
  // d und beide Bereiche ebenso, damit Satz, Zeile und Marken zusammenpassen.
  const um = e.diff < 0;
  const [lo, hi] = um ? [-e.diffHi, -e.diffLo] : [e.diffLo, e.diffHi];
  const [dLo, dHi, dW] = um ? [-e.dHi, -e.dLo, -e.d] : [e.dLo, e.dHi, e.d];
  // F8 (Abschlusstest): d rechnet mit der gepoolten SD, der Test nach Welch nicht - das sagt der Satz. Bei einer Gruppe unter 20 steht Hedges g daneben
  // (Korrektur der kleinen Überschätzung von d; Lakens 2013). Gegen R effectsize::hedges_g (scripts/hedges-erwartet.R).
  const hg = hedges(e), [gLo, gHi, gW] = um ? [-hg.gHi, -hg.gLo, -hg.g] : [hg.gLo, hg.gHi, hg.g];
  const kleinG = Math.min(e.a.n, e.b.n) < HEDGES_UNTER;
  const dSatz = klassisch
    ? T(` Gerechnet ist der klassische t-Test, der gleiche Streuung in beiden Gruppen annimmt. Cohens d (${komma(dW)}) nutzt dieselbe gemeinsame (gepoolte) Standardabweichung.`,
      ` The classical t test is calculated, which assumes equal spread in both groups. Cohen's d (${komma(dW)}) uses the same common (pooled) standard deviation.`)
    : T(` Cohens d (${komma(dW)}) rechnet mit der gemeinsamen (gepoolten) Standardabweichung beider Gruppen, der Test nach Welch nicht.`,
    ` Cohen's d (${komma(dW)}) uses the common (pooled) standard deviation of both groups; Welch's test does not.`)
    + (kleinG ? T(` Weil eine Gruppe weniger als 20 Personen hat, steht daneben Hedges g = ${komma(gW)}, ${ki(komma(gLo), komma(gHi))}: Es gleicht aus, dass d bei kleinen Gruppen etwas zu groß ausfällt.`,
      ` Because one group has fewer than 20 people, Hedges' g = ${komma(gW)}, ${ki(komma(gLo), komma(gHi))} is given as well: it corrects for d coming out slightly too large in small groups.`) : '');
  const kiDiff = ki(komma(lo), komma(hi)), kiD = ki(komma(dLo), komma(dHi)), wahl = s.einst.kiT ?? 'd';
  const apa = `t(${komma(e.df, e.df % 1 ? 2 : 0)}) = ${komma(Math.abs(e.t))}, p ${pWert(e.p)}, ` + (wahl === 'd' ? `d = ${komma(dW)}, ${kiD}` : wahl === 'punkte' ? `${kiDiff}, d = ${komma(dW)}` : `${L('Differenz', 'difference')} ${kiDiff}, d = ${komma(dW)}, ${kiD}`);   // „beide“: das erste KI gehört zur Differenz, das zweite zu d - mit Wort davor (B10)
  const klein = Math.min(e.a.n, e.b.n) < 20;
  return {
    haupt, zusatz: zusatz + dSatz, vorsicht, apa,
    marken: [
      { text: `${T('Unterschied', 'Difference')}: ${effektWort(e.d)} · d = ${komma(dW)}`, erklaer: 'effektstaerke' },
      ...(kleinG ? [{ text: `Hedges g = ${komma(gW)}`, erklaer: 'effektstaerke' }] : []),
      { text: `p ${pWert(e.p)}${unter05(sig)}`, erklaer: 'p-wert' },
      // Die Marke zeigt denselben Bereich wie die Zeile für die Arbeit (Einstellung „Bereich beim t-Test“) und sagt, wofür er gilt.
      { text: wahl === 'd' ? T(`Plausibler Bereich für d: ${komma(dLo)} bis ${komma(dHi)}`, `Plausible range for d: ${komma(dLo)} to ${komma(dHi)}`)
        : T(`Plausibler Bereich des Unterschieds: ${komma(lo, 1)} bis ${komma(hi, 1)}`, `Plausible range of the difference: ${komma(lo, 1)} to ${komma(hi, 1)}`), erklaer: 'konfidenzintervall' },
      ...(klein ? [{ text: T(`Kleine Gruppe (n = ${Math.min(e.a.n, e.b.n)})`, `Small group (n = ${Math.min(e.a.n, e.b.n)})`), erklaer: 'stichprobe', hinweis: true }] : [])
    ]
  };
}

/* ---------- Einfaktorielle Varianzanalyse (drei und mehr Gruppen) ----------
 * `ONEWAY y BY gruppe /STATISTICS=DESCRIPTIVES HOMOGENEITY` (PSPP 2.1.1). Welch-Varianzanalyse und Paarvergleiche (Tukey, Games-Howell, Bonferroni) rechnet
 * Statable selbst aus n, Mittelwert und Streuung je Gruppe (posthoc.ts, gegen R geprüft); die Wahl der Paarvergleiche steht am Blatt (`blatt.ph`).
 * Hauptergebnis ist immer die Welch-Varianzanalyse (R oneway.test(var.equal = FALSE)), die klassische steht daneben; Standard-Paarvergleich Games-Howell.
 * Der Levene-Test beschreibt nur noch (Abschlusstest F2: Zimmerman 2004; Delacre, Leys, Mora & Lakens 2019; Field 2018, Kap. 12).
 * Effektstärke: η² = SS_zwischen / SS_gesamt mit 95-%-Bereich über das nichtzentrale F der klassischen Analyse (effektki.ts, wie R
 * effectsize::eta_squared(alternative = "two.sided")); dazu ω² (Hays 1963). Beide kommen aus den Quadratsummen der klassischen Analyse und sind so gekennzeichnet.
 * Warum nicht aus dem Welch-F: R effectsize rechnet für oneway.test(var.equal = FALSE) η²/ω² aus dem Welch-F mit dessen Nenner-Freiheitsgraden und nennt das selbst
 * eine Näherung („effect size is an approximation“). Die Näherung hängt an den Welch-Freiheitsgraden statt an der Stichprobe: Schlafdaten (konzentration nach
 * semester, df₂ = 10,6) η² = ,39 und ω² = ,15 aus dem Welch-F gegen η² = ,05 und ω² = ,02 aus den Quadratsummen (abschlusstest-2026-10-09/F-methodik/skripte/welch-effekt.R).
 * Der Punktwert η² ist eine Beschreibung der Mittelwertunterschiede und setzt keine gleiche Streuung voraus; nur sein Bereich stützt sich auf das klassische F.
 * ⚠ Satz-Vorlagen, die Faustregel für η² (Cohen 1988: ,01 / ,06 / ,14) und die Grenze „kleine Gruppe“ (n < 20) von der Fachperson abzunehmen. */
export interface AnovaGruppe { name: string; n: number; m: number; sd: number }
export interface Anova {
  art: 'anova'; abhaengig: string; gruppenSpalte: string; gruppen: AnovaGruppe[]; n: number;
  ssZwischen: number; ssInnerhalb: number; dfZwischen: number; dfInnerhalb: number; f: number; p: number; levene?: number; leveneP?: number;
}

export function anova(items: OutputItem[], abhaengig: string, gruppenSpalte: string): Anova {
  const ds = finde(items, /^Descriptives$/), an = finde(items, /^ANOVA$/), lv = finde(items, /^Test of Homogeneity of Variances$/);
  if (!ds || !an) throw new Error('Tabellen der Varianzanalyse fehlen');
  const k = { n: spalte(ds, /^N$/), m: spalte(ds, /^Mean$/), sd: spalte(ds, /^Std\. Deviation$/) };
  const gruppen: AnovaGruppe[] = []; let n = 0;
  for (let i = ds.tabelle.headRows[0]; i < ds.t.length; i++) {
    const name = ds.t[i]![1] ?? '', zn = ds.n[i]![k.n]; if (zn === undefined) continue;
    if (name === 'Total') { n = zn; continue; }
    gruppen.push({ name, n: zn, m: zahl(ds.n[i]![k.m]), sd: ds.n[i]![k.sd] ?? NaN });
  }
  if (!n) n = gruppen.reduce((a, g) => a + g.n, 0);
  const zz = an.t.findIndex(z => z.includes('Between Groups')), zi = an.t.findIndex(z => z.includes('Within Groups'));
  const c = { ss: spalte(an, /^Sum of Squares$/), df: spalte(an, /^df$/), f: spalte(an, /^F$/), p: spalte(an, /^Sig\.$/) };
  const lc = lv ? { l: spalte(lv, /^Levene Statistic$/), p: spalte(lv, /^Sig\./) } : null;
  const lz = lv ? lv.n[lv.tabelle.headRows[0]]! : null;
  return {
    art: 'anova', abhaengig, gruppenSpalte, gruppen, n,
    ssZwischen: zahl(an.n[zz]![c.ss]), ssInnerhalb: zahl(an.n[zi]![c.ss]), dfZwischen: zahl(an.n[zz]![c.df]), dfInnerhalb: zahl(an.n[zi]![c.df]),
    f: zahl(an.n[zz]![c.f]), p: zahl(an.n[zz]![c.p]),
    ...(lc && lz && lz[lc.l] !== undefined && lz[lc.p] !== undefined ? { levene: lz[lc.l]!, leveneP: lz[lc.p]! } : {})
  };
}

/** η² in Worten, Cohens Grenzen ,01 / ,06 / ,14. */
export function eta2Wort(v0: number): string {
  const v = angezeigt(v0);
  return v < 0.01 ? L('sehr klein', 'very small') : v < 0.06 ? L('klein', 'small') : v < 0.14 ? L('mittelgroß', 'medium-sized') : L('groß', 'large');
}

/** Name der Art des Paarvergleichs. */
export const phName = (a: PhArt) => ({ gh: 'Games-Howell', bonferroni: 'Bonferroni', tukey: 'Tukey HSD', scheffe: 'Scheffé', holm: 'Holm', dunnett: 'Dunnett' })[a];
/** Die Art, die gilt: die gewählte, sonst der Standard Games-Howell (unabhängig vom Levene-Test). Der Parameter `e` bleibt für alte Aufrufe. */
/** Kursmodus „klassisch“ (Einstellung): t-Test und Varianzanalyse mit gleicher Streuung als Hauptergebnis, Tukey als Standard-Paarvergleich. */
export const kursKlassisch = () => s.einst.kurs === 'klassisch';
export const phStandard = (): PhArt => (kursKlassisch() ? 'tukey' : PH_STANDARD);
export const phArt = (_e: Anova, gewaehlt?: PhArt): PhArt => gewaehlt ?? phStandard();
/** Das Hauptergebnis der Varianzanalyse: immer die Welch-Analyse; nur wenn sie nicht rechenbar ist (eine Gruppe ohne Streuung oder mit einer Person), die klassische. */
export function anovaHaupt(e: Anova): { welch: boolean; p: number } {
  if (kursKlassisch()) return { welch: false, p: e.p };
  const w = welchAnova(e.gruppen);
  return w ? { welch: true, p: w.p } : { welch: false, p: e.p };
}

/** Sätze für die Varianzanalyse; `ph` = gewählter Paarvergleich (fehlt: Standard Games-Howell). */
export function saetzeAnova(e: Anova, label: (s: string) => string, ph?: PhArt, kontrolle = 0): Saetze {
  const was = zitat(label(e.abhaengig)), grp = label(e.gruppenSpalte), k = e.gruppen.length;
  const ungleich = streuungUngleich(e.leveneP), welch = welchAnova(e.gruppen), haupt0 = anovaHaupt(e), sig = haupt0.p < 0.05;
  const pText = haupt0.welch ? T(`Welch-Varianzanalyse, p ${pWert(haupt0.p)}`, `Welch analysis of variance, p ${pWert(haupt0.p)}`) : `p ${pWert(e.p)}`;
  const eta = e.ssZwischen / (e.ssZwischen + e.ssInnerhalb), [lo, hi] = eta2Bereich(e.f, e.dfZwischen, e.dfInnerhalb), kiEta = ki(ohneNull(lo), ohneNull(hi));
  const om = omega2(e.ssZwischen, e.dfZwischen, e.ssInnerhalb, e.dfInnerhalb), wort = eta2Wort(eta);
  // Bei Welch als Hauptergebnis: η² und ω² ausdrücklich als Kennzahlen der klassischen Analyse (Begründung im Kopf dieses Abschnitts).
  const etaQuelle = haupt0.welch ? T(', aus der klassischen Varianzanalyse', ', from the classical analysis of variance') : '';
  const sortiert = [...e.gruppen].sort((a, b) => b.m - a.m), hoch = sortiert[0]!, tief = sortiert.at(-1)!;
  const q = (x: string) => anfuehrung(kurz(x));
  const s1 = stMax(1, hoch.m, tief.m);
  const haupt = komma(hoch.m, s1) === komma(tief.m, s1)
    ? T(`Die ${k} Gruppen (${grp}) hatten bei ${was} im Schnitt fast denselben Wert (${komma(hoch.m, s1)}).`, `The ${k} groups (${grp}) had almost the same value on ${was} on average (${komma(hoch.m, s1)}).`)
    : T(`Bei ${was} hatte die Gruppe ${q(hoch.name)} (${grp}) im Schnitt den höchsten Wert (${komma(hoch.m, s1)}), die Gruppe ${q(tief.name)} den niedrigsten (${komma(tief.m, s1)}).`,
      `On ${was}, the group ${q(hoch.name)} (${grp}) scored highest on average (${komma(hoch.m, s1)}) and the group ${q(tief.name)} lowest (${komma(tief.m, s1)}).`);
  const omSatz = T(` Der um die Überschätzung korrigierte Schätzer ω² beträgt ${ohneNull(om)}.`, ` The bias-corrected estimate ω² is ${ohneNull(om)}.`);
  // ⚠ von der Fachperson abzunehmen: Paarvergleiche nur, wenn der Gesamttest (Welch) bei α = ,05 deutlich ist; Standard Games-Howell, sonst die Wahl am Blatt.
  const art = phArt(e, ph), paare = sig ? paarvergleiche(e.gruppen, art, kontrolle) : null, deutlich = paare?.filter(x => x.p < 0.05) ?? [];
  const lagePaar = (x: { i: number; j: number; diff: number }) => T(`${q(e.gruppen[x.j]!.name)} liegt ${x.diff > 0 ? L('über', 'above') : L('unter', 'below')} ${q(e.gruppen[x.i]!.name)}`, `${q(e.gruppen[x.j]!.name)} is ${x.diff > 0 ? L('über', 'above') : L('unter', 'below')} ${q(e.gruppen[x.i]!.name)}`);
  const paarSatz = !paare ? '' : deutlich.length === 0
    ? T(` Nach dem Paarvergleich (${phName(art)}) ist kein einzelnes Paar von Gruppen deutlich verschieden.`, ` After the pairwise comparison (${phName(art)}), no single pair of groups differs clearly.`)
    : deutlich.length <= 3
      ? T(` Nach dem Paarvergleich (${phName(art)}, für alle ${paare.length} Paare angepasst) unterscheiden sich deutlich: ${deutlich.map(lagePaar).join('; ')}.`,
        ` After the pairwise comparison (${phName(art)}, adjusted for all ${paare.length} pairs), these differ clearly: ${deutlich.map(lagePaar).join('; ')}.`)
      : T(` Nach dem Paarvergleich (${phName(art)}, für alle ${paare.length} Paare angepasst) unterscheiden sich ${deutlich.length} von ${paare.length} Paaren deutlich (Tabelle).`,
        ` After the pairwise comparison (${phName(art)}, adjusted for all ${paare.length} pairs), ${deutlich.length} of ${paare.length} pairs differ clearly (table).`);
  const zusatz = (sig
    ? T(`Die Gruppen unterscheiden sich insgesamt; der Unterschied ist ${wort} (η² = ${ohneNull(eta)}, ${kiEta}${etaQuelle}, nach üblicher Faustregel). Ein mindestens so großer Unterschied wäre selten, wenn die Gruppen sich in Wahrheit nicht unterschieden (${pText}).${paare ? '' : L(' Welche Gruppen sich voneinander unterscheiden, zeigt dieser Test allein nicht.', ' This test alone does not show which groups differ from one another.')}`,
      `The groups differ overall; the difference is ${wort} (η² = ${ohneNull(eta)}, ${kiEta}${etaQuelle}, by a common rule of thumb). A difference at least this large would be rare if the groups truly did not differ (${pText}).${paare ? '' : L(' Welche Gruppen sich voneinander unterscheiden, zeigt dieser Test allein nicht.', ' This test alone does not show which groups differ from one another.')}`)
    : T(`Die Unterschiede zwischen den Gruppen sind ${wort} (η² = ${ohneNull(eta)}, ${kiEta}${etaQuelle}) und kommen auch dann nicht selten vor, wenn die Gruppen sich in Wahrheit nicht unterscheiden (${pText}). Die Daten belegen darum keinen Unterschied - das heißt nicht, dass es keinen gibt.`,
      `The differences between the groups are ${wort} (η² = ${ohneNull(eta)}, ${kiEta}${etaQuelle}) and are not unusual even if the groups truly do not differ (${pText}). So the data do not show a difference - that does not mean there is none.`)) + paarSatz + omSatz;
  const welchF = welch ? `F${dfKlammer(komma(welch.df1, 0), komma(welch.df2, 1))} = ${komma(welch.f)}, p ${pWert(welch.p)}` : '';
  const klassischF = `F(${komma(e.dfZwischen, 0)}, ${komma(e.dfInnerhalb, 0)}) = ${komma(e.f)}, p ${pWert(e.p)}`;
  // Levene nur beschreibend: Er steht im Satz, entscheidet aber nichts.
  const vorsicht = T('Ob die Gruppenzugehörigkeit der Grund ist, zeigen diese Daten nicht.', 'These data do not show whether group membership is the reason.')
    + (haupt0.welch
      ? T(` Hauptergebnis ist die Welch-Varianzanalyse (${welchF}): Sie braucht keine gleich große Streuung in den Gruppen. Die klassische Varianzanalyse steht daneben (${klassischF}).`,
        ` The main result is the Welch analysis of variance (${welchF}): it does not need equal spread in the groups. The classical analysis of variance is shown next to it (${klassischF}).`)
      : kursKlassisch()
        ? T(` Gerechnet ist die klassische Varianzanalyse (${klassischF}), die gleiche Streuung in den Gruppen annimmt.`,
          ` The classical analysis of variance is calculated (${klassischF}), which assumes equal spread in the groups.`)
          + (welch ? T(` Die Welch-Varianzanalyse (${welchF}) braucht das nicht.`, ` The Welch analysis of variance (${welchF}) does not need that.`) : '')
        : T(' Die Welch-Varianzanalyse ist hier nicht rechenbar (eine Gruppe ohne Streuung oder mit nur einem Fall); darum gilt die klassische Varianzanalyse.', ' The Welch analysis of variance cannot be calculated here (a group without spread or with only one case); so the classical analysis of variance applies.'))
    + (ungleich ? T(` Der Levene-Test spricht gegen gleich große Streuung in den Gruppen (p ${pWert(e.leveneP!)}).`, ` Levene's test indicates unequal spread in the groups (p ${pWert(e.leveneP!)}).`) : '');
  const klein = Math.min(kleinste(e.gruppen.map(g => g.n)));
  const klassischApa = `${klassischF}, η² = ${ohneNull(eta)}, ${kiEta}`;
  const apaPaare = !paare ? '' : deutlich.length === 0
    ? `; ${phName(art)}: ${T('kein Paar mit p < ,05', 'no pair with p < .05')}`
    : deutlich.length <= 4 ? `; ${phName(art)}: ${deutlich.map(x => `${kurz(e.gruppen[x.j]!.name, 20)} - ${kurz(e.gruppen[x.i]!.name, 20)} (p ${pWert(x.p)})`).join(', ')}`
      : `; ${phName(art)}: ${T(`${deutlich.length} von ${paare.length} Paaren mit p < ,05`, `${deutlich.length} of ${paare.length} pairs with p < .05`)}`;
  return {
    haupt, zusatz, vorsicht,
    apa: (haupt0.welch ? `Welch-${welchF}; ${T('klassisch', 'classical')}: ${klassischApa}` : klassischApa) + apaPaare,
    marken: [
      { text: haupt0.welch ? T(`Unterschied: ${wort} · η² = ${ohneNull(eta)} (klassisch)`, `Difference: ${wort} · η² = ${ohneNull(eta)} (classical)`) : `${T('Unterschied', 'Difference')}: ${wort} · η² = ${ohneNull(eta)}`, erklaer: 'eta-quadrat' },
      { text: `p ${pWert(haupt0.p)}${haupt0.welch ? ' (Welch)' : ''}${unter05(sig)}`, erklaer: haupt0.welch ? 'welch-anova' : 'p-wert' },
      { text: T(`Plausibler Bereich für η²: ${ohneNull(lo)} bis ${ohneNull(hi)}`, `Plausible range for η²: ${ohneNull(lo)} to ${ohneNull(hi)}`), erklaer: 'konfidenzintervall' },
      { text: `ω² = ${ohneNull(om)}`, erklaer: 'eta-quadrat' },
      ...(haupt0.welch ? [{ text: T(`Klassisch: ${klassischF}`, `Classical: ${klassischF}`), erklaer: 'welch-anova' }] : []),
      ...(paare ? [{ text: T(`Paarvergleich: ${phName(art)}${ph ? '' : L(' (Standard)', ' (default)')}`, `Pairwise comparison: ${phName(art)}${ph ? '' : L(' (Standard)', ' (default)')}`), erklaer: 'paarvergleich' }] : []),
      ...(klein < 20 ? [{ text: T(`Kleine Gruppe (n = ${klein})`, `Small group (n = ${klein})`), erklaer: 'stichprobe', hinweis: true }] : [])
    ]
  };
}

/** Sätze für die gepaarte Messung. Wortstufe aus d_av (Abschlusstest F4, Lakens 2013), d_z für Intervall und Teststärke. */
export function saetzePraePost(e: PraePost, label: (s: string) => string): Saetze {
  const v = zitat(label(e.vorher)), na = zitat(label(e.nachher)), sig = e.p < 0.05;
  const s1 = stMax(1, e.m1, e.m2), diff = komma(Math.abs(e.diff), s1);
  const haupt = diff === komma(0, s1)
    ? T(`Bei ${na} lag der Wert im Schnitt fast genauso hoch wie bei ${v}: ${komma(e.m2, s1)} gegen ${komma(e.m1, s1)}.`, `On average, ${na} was almost the same as ${v}: ${komma(e.m2, s1)} vs. ${komma(e.m1, s1)}.`)
    : T(`Bei ${na} lag der Wert im Schnitt ${diff} ${e.diff > 0 ? L('höher', 'higher') : L('niedriger', 'lower')} als bei ${v}: ${komma(e.m2, s1)} gegen ${komma(e.m1, s1)}.`,
      `On average, ${na} was ${diff} ${e.diff > 0 ? L('höher', 'higher') : L('niedriger', 'lower')} than ${v}: ${komma(e.m2, s1)} vs. ${komma(e.m1, s1)}.`);
  // F4 (Abschlusstest; Lakens 2013): Die Wortstufe kommt aus dav - nur dav ist mit Cohens Grenzen für d vergleichbar; dz hängt an der Korrelation
  // vorher-nachher (dz = dav / √(2 (1 − r)) bei gleichen SD) und bleibt das Maß für Teststärke und Intervall.
  const zusatz = sig
    ? T(`Die Veränderung ist ${effektWort(e.dav)} (dav = ${komma(e.dav)}, nach üblicher Faustregel für d). Eine mindestens so große Veränderung wäre selten, wenn sich in Wahrheit nichts verändert hätte (p ${pWert(e.p)}).`,
      `The change is ${effektWort(e.dav)} (dav = ${komma(e.dav)}, by a common rule of thumb for d). A change at least this large would be rare if nothing had truly changed (p ${pWert(e.p)}).`)
    : T(`Eine so große Veränderung kommt aber auch dann nicht selten vor, wenn sich in Wahrheit nichts verändert (p ${pWert(e.p)}). Die Daten belegen eine Veränderung darum nicht - das heißt nicht, dass es keine gab.`,
      `A change this large is not unusual even if nothing has truly changed (p ${pWert(e.p)}). So the data do not show a change - that does not mean there was none.`);
  // T20/F4: welches d die Stufe trägt und warum dz anders ausfällt.
  const rT = Number.isFinite(e.r) ? ohneNull(e.r) : '';
  const dzVergleich = Math.abs(e.dz) >= Math.abs(e.dav)
    ? (rT ? T(` dz = ${komma(e.dz)} fällt größer aus, weil vorher und nachher zusammenhängen (r = ${rT}); es ist das Maß für die Teststärke (Lakens 2013).`, ` dz = ${komma(e.dz)} is larger because before and after are related (r = ${rT}); it is the measure for statistical power (Lakens 2013).`)
      : T(` dz = ${komma(e.dz)} fällt größer aus, weil vorher und nachher zusammenhängen; es ist das Maß für die Teststärke (Lakens 2013).`, ` dz = ${komma(e.dz)} is larger because before and after are related; it is the measure for statistical power (Lakens 2013).`))
    : (rT ? T(` dz = ${komma(e.dz)} fällt kleiner aus, weil vorher und nachher nur schwach zusammenhängen (r = ${rT}); es ist das Maß für die Teststärke (Lakens 2013).`, ` dz = ${komma(e.dz)} is smaller because before and after are only weakly related (r = ${rT}); it is the measure for statistical power (Lakens 2013).`)
      : T(` dz = ${komma(e.dz)} fällt kleiner aus, weil vorher und nachher nur schwach zusammenhängen; es ist das Maß für die Teststärke (Lakens 2013).`, ` dz = ${komma(e.dz)} is smaller because before and after are only weakly related; it is the measure for statistical power (Lakens 2013).`));
  const vorsicht = T('Ob etwas Bestimmtes die Veränderung bewirkt hat (etwa ein Kurs), zeigen diese Daten nicht: Ohne Vergleichsgruppe können auch Übung, Zeit oder andere Einflüsse dahinterstecken.',
    'These data do not show whether something specific caused the change (such as a course): without a comparison group, practice, time or other influences may be behind it.')
    + T(' Die Einordnung folgt dav, das wie d aus Gruppenvergleichen gerechnet ist.', ' The classification follows dav, which is calculated like d in group comparisons.') + dzVergleich;
  const wahl = s.einst.kiT ?? 'd';
  const kiDiff = ki(komma(e.diffLo), komma(e.diffHi)), kiD = ki(komma(e.dzLo), komma(e.dzHi));
  const apa = `t(${komma(e.df, e.df % 1 ? 2 : 0)}) = ${komma(e.t)}, p ${pWert(e.p)}, ` + (wahl === 'd' ? `dz = ${komma(e.dz)}, ${kiD}` : wahl === 'punkte' ? `${kiDiff}, dz = ${komma(e.dz)}` : `${L('Veränderung', 'change')} ${kiDiff}, dz = ${komma(e.dz)}, ${kiD}`) + `, dav = ${komma(e.dav)}`;   // B10 wie beim Gruppenvergleich; F4: dav dazu, weil die Wortstufe daraus kommt
  return {
    haupt, zusatz, vorsicht, apa,
    marken: [
      { text: `${T('Veränderung', 'Change')}: ${effektWort(e.dav)} · dav = ${komma(e.dav)}`, erklaer: 'gepaarte-messung' },
      { text: `p ${pWert(e.p)}${unter05(sig)}`, erklaer: 'p-wert' },
      { text: wahl === 'd' ? T(`Plausibler Bereich für dz: ${komma(e.dzLo)} bis ${komma(e.dzHi)}`, `Plausible range for dz: ${komma(e.dzLo)} to ${komma(e.dzHi)}`)
        : T(`Plausibler Bereich der Veränderung: ${komma(e.diffLo, 1)} bis ${komma(e.diffHi, 1)}`, `Plausible range of the change: ${komma(e.diffLo, 1)} to ${komma(e.diffHi, 1)}`), erklaer: 'konfidenzintervall' },
      { text: `dz = ${komma(e.dz)}`, erklaer: 'gepaarte-messung' },
      ...(e.n < 20 ? [{ text: T(`Kleine Stichprobe (n = ${e.n})`, `Small sample (n = ${e.n})`), erklaer: 'stichprobe', hinweis: true }] : [])
    ]
  };
}


/** Stärke in Worten. Kendalls τ_b fällt bei gleich starkem Zusammenhang kleiner aus als r: Umrechnung r = sin(π·τ/2) (gilt bei bivariater Normalverteilung).
 *  ⚠ Schwellen von der Fachperson abzunehmen. */
const staerke = (r: number, m: Korrelationsart) => zusammenhangWort(m === 'kendall' ? Math.sin(Math.PI * r / 2) : r);
/** „sehr schwach“ (|r| angezeigt unter ,10): Der Hauptsatz behauptet dann keine Tendenz (Abschlusstest T3: „tendenziell auch mehr“ bei r = ,00). */
const kaum = (r: number, m: Korrelationsart) => angezeigt(Math.abs(m === 'kendall' ? Math.sin(Math.PI * angezeigt(r) / 2) : r)) < 0.1;
/** Hauptsatz: Richtung mit Bezugswort, bei sehr schwachem Zusammenhang „kaum ein Zusammenhang“. */
function korrHaupt(x: string, y: string, r: number, zeichen: string, m: Korrelationsart): string {
  return kaum(r, m)
    ? T(`Zwischen ${x} und ${y} zeigt sich kaum ein Zusammenhang (${zeichen} = ${ohneNull(r)}).`, `There is hardly any relationship between ${x} and ${y} (${zeichen} = ${ohneNull(r)}).`)
    : r >= 0
      ? T(`Wer bei ${x} höhere Werte hat, hat bei ${y} tendenziell auch höhere Werte.`, `People with higher values on ${x} tend to have higher values on ${y}.`)
      : T(`Wer bei ${x} höhere Werte hat, hat bei ${y} tendenziell niedrigere Werte.`, `People with higher values on ${x} tend to have lower values on ${y}.`);
}

/** Partialkorrelation in Worten. ⚠ von der Fachperson abzunehmen: Zeichen pr / prs, die Schwelle 0,03 für „ändert kaum etwas“ und der Wortlaut „gleich hält“. */
function saetzePartial(e: Zusammenhang, label: (s: string) => string): Saetze {
  const m = e.methode ?? 'pearson', rang = m === 'spearman', zeichen = rang ? 'prs' : 'pr';
  const sig = e.p < 0.05, wort = staerke(e.r, m), r = ohneNull(e.r), kon = aufzaehlung(e.kontroll!.map(k => zitat(label(k)))), df = e.df ?? e.n - 2 - e.kontroll!.length;
  const ein = e.einfach?.[m];
  const aendert = !ein ? '' : Math.abs(Math.abs(e.r) - Math.abs(ein.r)) < 0.03 ? T(' Das Herausrechnen ändert kaum etwas.', ' Controlling changes hardly anything.')
    : Math.sign(e.r) !== Math.sign(ein.r) && Math.abs(ein.r) >= 0.05 && Math.abs(e.r) >= 0.05 ? T(' Das Herausrechnen kehrt die Richtung um.', ' Controlling reverses the direction.')
    : Math.abs(e.r) < Math.abs(ein.r) ? T(` Der Zusammenhang wird kleiner, wenn man ${kon} herausrechnet: Ein Teil davon geht mit ${e.kontroll!.length > 1 ? L('diesen Spalten', 'these columns') : L('dieser Spalte', 'this column')} einher.`, ` The relationship gets smaller when ${kon} is controlled for: part of it goes along with ${e.kontroll!.length > 1 ? L('diesen Spalten', 'these columns') : L('dieser Spalte', 'this column')}.`)
    : T(' Der Zusammenhang wird größer, wenn man herausrechnet.', ' The relationship gets larger when controlling.');
  return {
    haupt: kaum(e.r, m)
      ? T(`Wenn man ${kon} gleich hält, zeigt sich zwischen ${zitat(label(e.x))} und ${zitat(label(e.y))} kaum ein Zusammenhang (${zeichen} = ${r}).`,
        `Holding ${kon} constant, there is hardly any relationship between ${zitat(label(e.x))} and ${zitat(label(e.y))} (${zeichen} = ${r}).`)
      : e.r >= 0
        ? T(`Wenn man ${kon} gleich hält: Wer bei ${zitat(label(e.x))} höhere Werte hat, hat bei ${zitat(label(e.y))} tendenziell auch höhere Werte.`,
          `Holding ${kon} constant: people with higher values on ${zitat(label(e.x))} tend to have higher values on ${zitat(label(e.y))}.`)
        : T(`Wenn man ${kon} gleich hält: Wer bei ${zitat(label(e.x))} höhere Werte hat, hat bei ${zitat(label(e.y))} tendenziell niedrigere Werte.`,
          `Holding ${kon} constant: people with higher values on ${zitat(label(e.x))} tend to have lower values on ${zitat(label(e.y))}.`),
    zusatz: (sig
      ? T(`Der Zusammenhang ist ${wort} (${zeichen} = ${r}). Ein mindestens so starker wäre selten, wenn es in Wahrheit keinen gäbe (p ${pWert(e.p)}).`,
        `The relationship is ${wort} (${zeichen} = ${r}). One at least this strong would be rare if there were truly no relationship (p ${pWert(e.p)}).`)
      : T(`Der Zusammenhang ist ${wort} (${zeichen} = ${r}) und kommt auch ohne echten Zusammenhang nicht selten vor (p ${pWert(e.p)}).`,
        `The relationship is ${wort} (${zeichen} = ${r}) and is not unusual even without a real relationship (p ${pWert(e.p)}).`))
      + (ein ? T(` Ohne Herausrechnen, bei denselben Personen: ${korrZeichen(m)} = ${ohneNull(ein.r)}.`, ` Without controlling, for the same people: ${korrZeichen(m)} = ${ohneNull(ein.r)}.`) : '') + aendert,
    vorsicht: T('Ein Zusammenhang ist keine Ursache. Herausgerechnet wird nur, was in den Daten gemessen ist und geradlinig wirkt.', 'A relationship is not a cause. Only what is measured in the data and acts in a straight line can be controlled for.')
      + (rang ? T(' Die Rangkorrelation fragt nur, ob höhere Werte tendenziell mit höheren einhergehen - nicht, ob die Punkte auf einer Geraden liegen.', ' A rank correlation only asks whether higher values tend to go with higher values - not whether the points lie on a straight line.') : ''),
    apa: `${zeichen}(${df}) = ${r}, p ${pWert(e.p)}, ${ki(ohneNull(e.kiLo), ohneNull(e.kiHi))}, ${T('kontrolliert für', 'controlling for')} ${aufzaehlung(e.kontroll!.map(k => label(k)))}`,
    marken: [
      { text: `${T('Zusammenhang', 'Relationship')}: ${wort} · ${zeichen} = ${r}`, erklaer: rang ? 'rangkorrelation' : 'korrelation' },
      { text: `p ${pWert(e.p)}${unter05(sig)}`, erklaer: 'p-wert' },
      { text: T(`${e.n} Personen mit allen Angaben`, `${e.n} people with all answers`), erklaer: 'stichprobe' }
    ]
  };
}

export function saetzeZusammenhang(e: Zusammenhang, label: (s: string) => string): Saetze {
  if (e.kontroll?.length) return saetzePartial(e, label);
  const m = e.methode ?? 'pearson', z = korrZeichen(m);
  const sig = e.p < 0.05, wort = staerke(e.r, m), r = ohneNull(e.r);
  const rang = m !== 'pearson', pa = rang && e.exakt !== undefined ? `, ${e.exakt ? L('exakt', 'exact') : L('Näherung', 'approximate')}` : '';
  return {
    haupt: korrHaupt(zitat(label(e.x)), zitat(label(e.y)), e.r, z, m),
    zusatz: sig
      ? T(`Der Zusammenhang ist ${wort} (${z} = ${r}). Ein mindestens so starker wäre selten, wenn es in Wahrheit keinen gäbe (p ${pWert(e.p)}${pa}).`,
        `The relationship is ${wort} (${z} = ${r}). One at least this strong would be rare if there were truly no relationship (p ${pWert(e.p)}${pa}).`)
      : T(`Der Zusammenhang ist ${wort} (${z} = ${r}) und kommt auch ohne echten Zusammenhang nicht selten vor (p ${pWert(e.p)}${pa}).`,
        `The relationship is ${wort} (${z} = ${r}) and is not unusual even without a real relationship (p ${pWert(e.p)}${pa}).`),
    vorsicht: T('Ein Zusammenhang ist keine Ursache.', 'A relationship is not a cause.')
      + (rang ? T(' Die Rangkorrelation fragt nur, ob höhere Werte tendenziell mit höheren einhergehen - nicht, ob die Punkte auf einer Geraden liegen.', ' A rank correlation only asks whether higher values tend to go with higher values - not whether the points lie on a straight line.') : ''),
    // Kendall hat keine Freiheitsgrade: dort steht n wie üblich (⚠ Schreibweise von der Fachperson abzunehmen).
    apa: `${m === 'kendall' ? `${z} = ${r}, p ${pWert(e.p)}, n = ${e.n}` : `${z}(${e.n - 2}) = ${r}, p ${pWert(e.p)}`}, ${ki(ohneNull(e.kiLo), ohneNull(e.kiHi))}`,
    marken: [
      { text: `${T('Zusammenhang', 'Relationship')}: ${wort} · ${z} = ${r}`, erklaer: rang ? 'rangkorrelation' : 'korrelation' },
      { text: `p ${pWert(e.p)}${pa ? ` (${pa.slice(2)})` : ''}${unter05(sig)}`, erklaer: 'p-wert' },
      { text: T(`${e.n} Personen mit beiden Angaben`, `${e.n} people with both answers`), erklaer: 'stichprobe' }
    ]
  };
}

/* ---------- Kurs-Verfahren: Regression, Reliabilität, Faktorenanalyse ----------
 * ⚠ Faustregeln und Satz-Vorlagen fachlich abnehmen lassen (R² nach Cohen 1988; Alpha nach George & Mallery 2003;
 *   Ladungen ab |,30| wie bei SPSS /FORMAT=BLANK(.30)). Zeilennamen kommen so, wie PSPP sie druckt (Bezeichnung, sonst Name). */

/** Lange Fragetexte für Sätze kürzen: „Frage 22 Es fällt mir schwer, bei …“. Schlusspunkt weg. */
// Schlusspunkt nur nach Wörtern über 3 Zeichen weg - Abkürzungen („k. A.“, „usw.“) behalten ihn (Prüfrunde 07.10., Befund D3).
export const kurz = (t: string, max = 40) => { const o = t.trim().replace(/:+$/, '').replace(/(\S+?)\.+$/, (g, w: string) => (w.replace(/\./g, '').length > 3 ? w : g)); return o.length > max ? o.slice(0, max).replace(/[\s,;-]+\S*$/, '') + ' …' : o; };
const zitat = (t: string) => anfuehrung(kurz(t));

/** `spalte`: die gewählte Spalte (fehlt in alten Projektdateien); `faktor`: bei einer Gruppen-Spalte die Stufe dieser Hilfsspalte (`wert` wie in den Daten) und die Vergleichsgruppe. */
export interface Praediktor { name: string; b: number; beta: number; p: number; lo: number; hi: number; t?: number; spalte?: string; faktor?: { wert: string; stufe: string; referenz: string } }
/** Gesamttest einer Gruppen-Spalte (regfaktor.ts): ΔR² und F der Änderung (bei zwei Stufen t² der einen Hilfsspalte, allein im Modell der Modelltest). */
export interface FaktorTest { spalte: string; referenz: string; stufen: number; werte: string[]; dr2: number; f: number; df1: number; df2: number; p: number }
export interface Vorhersage { art: 'vorhersage'; ziel: string; r2: number; r2korr: number; f: number; df1: number; df2: number; p: number; praediktoren: Praediktor[]; /** Gruppen-Spalten (fehlt ohne) */ faktoren?: FaktorTest[] }

/** Obere Wahrscheinlichkeit der F-Verteilung. */
const pF = (f: number, df1: number, df2: number) => (f > 0 ? betai(df2 / 2, df1 / 2, df2 / (df2 + df1 * f)) : 1);
/** Alle Tabellen mit diesem Namen, in der Reihenfolge der Ausgabe (das volle Modell zuerst, danach die Modelle für die Gesamttests). */
const alleTabellen = (items: OutputItem[], re: RegExp) => items.filter((i): i is TableItem => i.type === 'table' && re.test(i.label)).map(raster);

/** `terme`: die Prädiktoren, wie der Befehl sie gebaut hat (regfaktor.ts) - ordnet die Zeilen der Koeffizienten den Spalten zu und liest die Gesamttests der Gruppen-Spalten. */
export function vorhersage(items: OutputItem[], ziel: string, terme?: RegTerm[]): Vorhersage {
  const ms = finde(items, /^Model Summary/), an = finde(items, /^ANOVA/), ko = finde(items, /^Coefficients/);
  if (!ms || !an || !ko) throw new Error('Regressions-Tabellen fehlen');
  const z0 = ms.tabelle.headRows[0];
  const r2 = zahl(ms.n[z0]![spalte(ms, /^R Square$/)]), r2korr = zahl(ms.n[z0]![spalte(ms, /^Adjusted R Square$/)]);
  const reg = an.t.findIndex(z => z[0] === 'Regression'), res = an.t.findIndex(z => z[0] === 'Residual');
  const c = { df: spalte(an, /^df$/), f: spalte(an, /^F$/), p: spalte(an, /^Sig\.$/), ss: spalte(an, /^Sum of Squares$/) };
  const k = { b: spalte(ko, /^B$/), beta: spalte(ko, /^Beta$/), t: spalte(ko, /^t$/), p: spalte(ko, /^Sig\.$/), lo: spalte(ko, /^Lower Bound$/), hi: spalte(ko, /^Upper Bound$/) };
  const praediktoren: Praediktor[] = [];
  for (let i = ko.tabelle.headRows[0]; i < ko.t.length; i++) {
    const name = ko.t[i]![0] ?? '';
    if (!name || /^\(Constant\)$/.test(name) || ko.n[i]![k.b] === undefined) continue;
    praediktoren.push({ name, b: zahl(ko.n[i]![k.b]), beta: zahl(ko.n[i]![k.beta]), p: zahl(ko.n[i]![k.p]), lo: zahl(ko.n[i]![k.lo]), hi: zahl(ko.n[i]![k.hi]), ...(k.t >= 0 && ko.n[i]![k.t] !== undefined ? { t: ko.n[i]![k.t]! } : {}) });
  }
  const e: Vorhersage = { art: 'vorhersage', ziel, r2, r2korr, f: zahl(an.n[reg]![c.f]), df1: zahl(an.n[reg]![c.df]), df2: zahl(an.n[res]![c.df]), p: zahl(an.n[reg]![c.p]), praediktoren };
  return terme ? mitFaktoren(e, terme, alleTabellen(items, /^ANOVA/).slice(1).map(a => zahl(a.n[a.t.findIndex(z => z[0] === 'Residual')]![c.ss])), zahl(an.n[res]![c.ss]), zahl(an.n[reg]![c.ss]) + zahl(an.n[res]![c.ss])) : e;
}
/** Zeilen den Spalten zuordnen (Reihenfolge der Hilfsspalten = Reihenfolge im Befehl) und je Gruppen-Spalte den Gesamttest bilden.
 *  `ssRestOhne`: Quadratsumme der Reste der Modelle ohne die Gruppen-Spalte, in der Reihenfolge von `regGesamttests`. */
function mitFaktoren(e: Vorhersage, terme: RegTerm[], ssRestOhne: number[], ssRest: number, ssGesamt: number): Vorhersage {
  const zeilen = terme.flatMap((x): { spalte: string; f: RegFaktor | null; j: number }[] => (x.faktor ? x.faktor.hilfs.map((_, j) => ({ spalte: x.spalte, f: x.faktor, j })) : [{ spalte: x.spalte, f: null, j: 0 }]));
  if (zeilen.length !== e.praediktoren.length) return e;
  const praediktoren = e.praediktoren.map((p, i) => { const z = zeilen[i]!; return { ...p, spalte: z.spalte, ...(z.f ? { faktor: { wert: z.f.stufen[z.j + 1]!.wert, stufe: z.f.stufen[z.j + 1]!.name, referenz: z.f.stufen[0]!.name } } : {}) }; });
  const tests = regGesamttests(terme);
  const faktoren: FaktorTest[] = terme.flatMap(x => {
    if (!x.faktor) return [];
    const f = x.faktor, basis = { spalte: x.spalte, referenz: f.stufen[0]!.name, stufen: f.stufen.length, werte: f.stufen.map(st => st.wert) };
    if (terme.length === 1) return [{ ...basis, dr2: e.r2, f: e.f, df1: e.df1, df2: e.df2, p: e.p }];
    if (f.hilfs.length === 1) {
      const p = praediktoren.find(q => q.spalte === x.spalte)!, t = p.t ?? NaN, F = t * t;
      return [{ ...basis, dr2: (F * (1 - e.r2)) / e.df2, f: F, df1: 1, df2: e.df2, p: p.p }];
    }
    const ohne = ssRestOhne[tests.indexOf(x)];
    if (ohne === undefined) return [];
    const q = f.hilfs.length, F = ((ohne - ssRest) / q) / (ssRest / e.df2);
    return [{ ...basis, dr2: (ohne - ssRest) / ssGesamt, f: F, df1: q, df2: e.df2, p: pF(F, q, e.df2) }];
  });
  return { ...e, praediktoren, faktoren };
}

/** Gebeugte Form für den Satz („ein kleiner Anteil“) nach Cohens Grenzen für R² der linearen Regression (,02 / ,13 / ,26); englisch „very small“, „small“, „medium“, „large“. */
const r2Nom = (r20: number, r2 = angezeigt(r20)) => r2 < 0.02 ? L('sehr kleiner', 'very small') : r2 < 0.13 ? L('kleiner', 'small') : r2 < 0.26 ? L('mittlerer', 'medium') : L('großer', 'large');
const prozent = (v: number) => (v > 0 && v < 0.005 ? T(`weniger als ${proz(komma(1, 0))}`, `less than ${proz(komma(1, 0))}`) : proz(komma(v * 100, 0)));   // T30: nicht „0 %“, wenn etwas erklärt wird
/** 95-%-Bereich des standardisierten β: der Bereich von B mal sx/sy (= β/B) - wie bei R effectsize::standardize_parameters(method = "refit"). Ohne Angabe, wenn B = 0. */
export const betaBereich = (x: Praediktor): [number, number] | null => (x.b !== 0 && Number.isFinite(x.b) ? [x.beta / x.b * x.lo, x.beta / x.b * x.hi] : null);

/** paar(name): bei einer Gruppe mit zwei Werten im Abstand 1 (z. B. 0 = männlich, 1 = weiblich) die beiden Namen [tief, hoch], sonst null. */
export function saetzeVorhersage(e: Vorhersage, label: (s: string) => string, paar: (s: string) => [string, string] | null = () => null): Saetze {
  if (e.faktoren?.length) return saetzeMitGruppen(e, label);
  const ziel = zitat(label(e.ziel)), sig = e.p < 0.05, einfach = e.praediktoren.length === 1;
  const p1 = e.praediktoren[0]!;
  // R² mit 95-%-Bereich über das nichtzentrale F (feste Prädiktoren; wie R effectsize::F_to_eta2(…, alternative = "two.sided")).
  const [r2Lo, r2Hi] = eta2Bereich(e.f, e.df1, e.df2), kiR2 = ki(ohneNull(r2Lo), ohneNull(r2Hi));
  const gruppe = einfach ? paar(p1.name) : null;
  const haupt = gruppe
    ? T(`„${gruppe[1]}“ (${kurz(p1.name)}) hatte bei ${ziel} im Schnitt ${komma(Math.abs(p1.b), kd(p1.b))} ${p1.b >= 0 ? L('mehr', 'higher') : L('weniger', 'lower')} als „${gruppe[0]}“.`,
      `"${gruppe[1]}" (${kurz(p1.name)}) scored ${komma(Math.abs(p1.b), kd(p1.b))} ${p1.b >= 0 ? L('mehr', 'higher') : L('weniger', 'lower')} on ${ziel} on average than "${gruppe[0]}".`)
    : einfach
    // T5: B mit so vielen Stellen, dass kein „0,00 mehr“ entsteht (kd wie bei Mediation, Moderation, Mehrebenen).
    ? T(`Wer bei ${zitat(p1.name)} eine Einheit mehr hat, hat bei ${ziel} im Schnitt ${komma(Math.abs(p1.b), kd(p1.b))} ${p1.b >= 0 ? L('mehr', 'higher') : L('weniger', 'lower')}.`,
      `For each one-unit increase in ${zitat(p1.name)}, ${ziel} was ${komma(Math.abs(p1.b), kd(p1.b))} ${p1.b >= 0 ? L('mehr', 'higher') : L('weniger', 'lower')} on average.`)
    : T(`${aufzaehlung(e.praediktoren.map(x => zitat(x.name)))} erklären zusammen ${prozent(e.r2)} der Unterschiede bei ${ziel}.`,
      `${aufzaehlung(e.praediktoren.map(x => zitat(x.name)))} together explain ${prozent(e.r2)} of the differences in ${ziel}.`);
  const anteil = T(`Das ${einfach ? L(`erklärt ${prozent(e.r2)} der Unterschiede - ein`, `That explains ${prozent(e.r2)} of the differences - a`) : L('ist ein', 'That is a')} ${r2Nom(e.r2)} Anteil (R² = ${ohneNull(e.r2)}, ${kiR2}, nach üblicher Faustregel).`,
    `${einfach ? L(`erklärt ${prozent(e.r2)} der Unterschiede - ein`, `That explains ${prozent(e.r2)} of the differences - a`) : L('ist ein', 'That is a')} ${r2Nom(e.r2)} share (R² = ${ohneNull(e.r2)}, ${kiR2}, by a common rule of thumb).`);
  const zufall = sig
    ? T(`Eine mindestens so gute Vorhersage wäre selten, wenn es in Wahrheit keinen Zusammenhang gäbe (p ${pWert(e.p)}).`, `A prediction at least this good would be rare if there were truly no relationship (p ${pWert(e.p)}).`)
    : T(`Eine so gute Vorhersage kommt aber auch ohne echten Zusammenhang nicht selten vor (p ${pWert(e.p)}). Die Daten belegen die Vorhersage darum nicht.`, `A prediction this good is not unusual even without a real relationship (p ${pWert(e.p)}). So the data do not support the prediction.`);
  const eigen = e.praediktoren.filter(x => x.p < 0.05).sort((a, b) => Math.abs(b.beta) - Math.abs(a.beta));
  const betaText = (x: Praediktor) => { const b = betaBereich(x); return `β = ${ohneNull(x.beta)}${b ? ', ' + ki(ohneNull(b[0]), ohneNull(b[1])) : ''}`; };
  const liste = aufzaehlung(eigen.map(x => `${zitat(x.name)} (${betaText(x)})`));
  const rest = e.praediktoren.filter(x => !eigen.includes(x));
  const restSatz = rest.length === 1 ? T(`, ${zitat(rest[0]!.name)} nicht deutlich`, `; ${zitat(rest[0]!.name)} does not clearly`) : rest.length ? T(', die anderen nicht deutlich', '; the others do not clearly') : '';
  const beitrag = einfach ? '' : eigen.length
    ? T(` Einen eigenen Beitrag ${eigen.length > 1 ? L('leisten', 'make their own contribution') : L('leistet', 'makes its own contribution')} ${liste}${restSatz}.`,
      ` ${liste} ${eigen.length > 1 ? L('leisten', 'make their own contribution') : L('leistet', 'makes its own contribution')}${restSatz}.`)
    : T(' Keine der Größen leistet für sich einen deutlichen eigenen Beitrag.', ' None of them makes a clear contribution of its own.');
  const bp1 = betaBereich(p1);
  const apa = `R² = ${ohneNull(e.r2)}, ${kiR2}, F(${e.df1}, ${e.df2}) = ${komma(e.f)}, p ${pWert(e.p)}` + (einfach ? `; B = ${komma(p1.b, kd(p1.b))}, ${ki(komma(p1.lo, kd(p1.b)), komma(p1.hi, kd(p1.b)))}` + (bp1 ? `; β = ${ohneNull(p1.beta)}, ${ki(ohneNull(bp1[0]), ohneNull(bp1[1]))}` : '') : '');
  return {
    haupt, zusatz: `${anteil} ${zufall}${beitrag}`, vorsicht: T('Vorhersagen heißt nicht verursachen.', 'Predicting does not mean causing.'), apa,
    marken: [
      { text: T(`Erklärt: ${prozent(e.r2)} · R² = ${ohneNull(e.r2)}`, `Explained: ${prozent(e.r2)} · R² = ${ohneNull(e.r2)}`), erklaer: 'regression' },
      { text: `p ${pWert(e.p)}${unter05(sig)}`, erklaer: 'p-wert' },
      { text: T(`Plausibler Bereich für R²: ${ohneNull(r2Lo)} bis ${ohneNull(r2Hi)}`, `Plausible range for R²: ${ohneNull(r2Lo)} to ${ohneNull(r2Hi)}`), erklaer: 'konfidenzintervall' },
      { text: T(`${e.df1 + e.df2 + 1} Personen mit allen Angaben`, `${e.df1 + e.df2 + 1} people with all answers`), erklaer: 'stichprobe' }
    ]
  };
}
/** Regression mit Gruppen-Spalten (Abschlusstest F1): Gruppen sprechen von Unterschieden „gegenüber“ der Vergleichsgruppe in der Einheit der Zielgröße (B),
 *  nicht „je Einheit“; ihr Beitrag als Ganzes ist der Gesamttest (ΔR², F). Die standardisierten β der 0/1-Hilfsspalten gehen in keine Rangfolge ein (Gelman 2008). */
function saetzeMitGruppen(e: Vorhersage, label: (s: string) => string): Saetze {
  const ziel = zitat(label(e.ziel)), sig = e.p < 0.05, fk = e.faktoren!;
  const [r2Lo, r2Hi] = eta2Bereich(e.f, e.df1, e.df2), kiR2 = ki(ohneNull(r2Lo), ohneNull(r2Hi));
  const zahlen = e.praediktoren.filter(x => !x.faktor), nTerme = zahlen.length + fk.length, einfach = nTerme === 1;
  const fName = (f: FaktorTest) => zitat(label(f.spalte));
  const termNamen = [...new Set(e.praediktoren.map(x => (x.faktor ? `f:${x.spalte}` : `z:${x.name}`)))].map(k => (k.startsWith('f:') ? fName(fk.find(f => f.spalte === k.slice(2))!) : zitat(k.slice(2))));
  const hilfs = (f: FaktorTest) => e.praediktoren.filter(x => x.faktor && x.spalte === f.spalte);
  // Betrag mit „mehr“/„weniger“; der Bereich zeigt in dieselbe Richtung wie der Satz (wie beim t-Test).
  const kiB = (x: Praediktor) => (x.b >= 0 ? ki(komma(x.lo), komma(x.hi)) : ki(komma(-x.hi), komma(-x.lo)));
  const diff = (x: Praediktor, mitP: boolean) => T(`${zitat(x.faktor!.stufe)} ${komma(Math.abs(x.b))} ${x.b >= 0 ? L('mehr', 'higher') : L('weniger', 'lower')} (${kiB(x)}${mitP ? `, p ${pWert(x.p)}` : ''})`,
    `${zitat(x.faktor!.stufe)} scored ${komma(Math.abs(x.b))} ${x.b >= 0 ? L('mehr', 'higher') : L('weniger', 'lower')} (${kiB(x)}${mitP ? `, p ${pWert(x.p)}` : ''})`);
  const f1 = fk[0]!, h1 = hilfs(f1)[0]!;
  const haupt = einfach && f1.stufen === 2
    ? T(`${zitat(h1.faktor!.stufe)} (${kurz(label(f1.spalte))}) hatte bei ${ziel} im Schnitt ${komma(Math.abs(h1.b))} ${h1.b >= 0 ? L('mehr', 'higher') : L('weniger', 'lower')} als ${zitat(h1.faktor!.referenz)}.`,
      `${zitat(h1.faktor!.stufe)} (${kurz(label(f1.spalte))}) scored ${komma(Math.abs(h1.b))} ${h1.b >= 0 ? L('mehr', 'higher') : L('weniger', 'lower')} on ${ziel} on average than ${zitat(h1.faktor!.referenz)}.`)
    : einfach
    ? T(`${fName(f1)} erklärt ${prozent(e.r2)} der Unterschiede bei ${ziel}.`, `${fName(f1)} explains ${prozent(e.r2)} of the differences in ${ziel}.`)
    : T(`${aufzaehlung(termNamen)} erklären zusammen ${prozent(e.r2)} der Unterschiede bei ${ziel}.`,
      `${aufzaehlung(termNamen)} together explain ${prozent(e.r2)} of the differences in ${ziel}.`);
  const anteil = einfach && f1.stufen === 2
    ? T(`Das ${L(`erklärt ${prozent(e.r2)} der Unterschiede - ein`, `That explains ${prozent(e.r2)} of the differences - a`)} ${r2Nom(e.r2)} Anteil (R² = ${ohneNull(e.r2)}, ${kiR2}, nach üblicher Faustregel).`,
      `${L(`erklärt ${prozent(e.r2)} der Unterschiede - ein`, `That explains ${prozent(e.r2)} of the differences - a`)} ${r2Nom(e.r2)} share (R² = ${ohneNull(e.r2)}, ${kiR2}, by a common rule of thumb).`)
    : T(`Das ${L('ist ein', 'That is a')} ${r2Nom(e.r2)} Anteil (R² = ${ohneNull(e.r2)}, ${kiR2}, nach üblicher Faustregel).`, `${L('ist ein', 'That is a')} ${r2Nom(e.r2)} share (R² = ${ohneNull(e.r2)}, ${kiR2}, by a common rule of thumb).`);
  const zufall = sig
    ? T(`Eine mindestens so gute Vorhersage wäre selten, wenn es in Wahrheit keinen Zusammenhang gäbe (p ${pWert(e.p)}).`, `A prediction at least this good would be rare if there were truly no relationship (p ${pWert(e.p)}).`)
    : T(`Eine so gute Vorhersage kommt aber auch ohne echten Zusammenhang nicht selten vor (p ${pWert(e.p)}). Die Daten belegen die Vorhersage darum nicht.`, `A prediction this good is not unusual even without a real relationship (p ${pWert(e.p)}). So the data do not support the prediction.`);
  // Je Gruppen-Spalte: Gesamttest (bei drei und mehr Stufen und weiteren Prädiktoren) und die Unterschiede gegenüber der Vergleichsgruppe.
  const bei = einfach ? '' : L(', bei gleichen übrigen Angaben', ', with the other predictors held constant');
  const gruppenSaetze = fk.map(f => {
    const zwei = f.stufen === 2, test = !einfach && !zwei;
    const ganz = !test ? '' : f.p < 0.05
      ? T(` ${fName(f)} trägt als Ganzes deutlich bei (ΔR² = ${ohneNull(f.dr2)}, F(${f.df1}, ${f.df2}) = ${komma(f.f)}, p ${pWert(f.p)}).`, ` ${fName(f)} contributes clearly as a whole (ΔR² = ${ohneNull(f.dr2)}, F(${f.df1}, ${f.df2}) = ${komma(f.f)}, p ${pWert(f.p)}).`)
      : T(` ${fName(f)} trägt als Ganzes nicht deutlich bei (ΔR² = ${ohneNull(f.dr2)}, F(${f.df1}, ${f.df2}) = ${komma(f.f)}, p ${pWert(f.p)}).`, ` ${fName(f)} does not contribute clearly as a whole (ΔR² = ${ohneNull(f.dr2)}, F(${f.df1}, ${f.df2}) = ${komma(f.f)}, p ${pWert(f.p)}).`);
    const zeigen = zwei ? !einfach : f.p < 0.05;
    const h = hilfs(f), was = aufzaehlung(h.map(x => diff(x, zwei)));
    const unterschiede = !zeigen ? '' : Lp(h.length, ` Gegenüber ${zitat(f.referenz)} hatte bei ${ziel} im Schnitt ${was}${bei}.`, ` Gegenüber ${zitat(f.referenz)} hatten bei ${ziel} im Schnitt ${was}${bei}.`,
      ` Compared with ${zitat(f.referenz)}, ${was} on ${ziel} on average${bei}.`, ` Compared with ${zitat(f.referenz)}, ${was} on ${ziel} on average${bei}.`);
    return ganz + unterschiede;
  }).join('');
  // Zahlen-Spalten: eigener Beitrag mit β (nur unter den Zahlen-Spalten verglichen).
  const eigen = zahlen.filter(x => x.p < 0.05).sort((a, b) => Math.abs(b.beta) - Math.abs(a.beta)), rest = zahlen.filter(x => !eigen.includes(x));
  const betaText = (x: Praediktor) => { const b = betaBereich(x); return `β = ${ohneNull(x.beta)}${b ? ', ' + ki(ohneNull(b[0]), ohneNull(b[1])) : ''}`; };
  const liste = aufzaehlung(eigen.map(x => `${zitat(x.name)} (${betaText(x)})`)), restListe = aufzaehlung(rest.map(x => zitat(x.name)));
  const zahlSatz = einfach || !zahlen.length ? '' : eigen.length
    ? Lp(eigen.length, ` Einen eigenen Beitrag leistet ${liste}.`, ` Einen eigenen Beitrag leisten ${liste}.`, ` ${liste} makes its own contribution.`, ` ${liste} make their own contribution.`)
      + (rest.length ? Lp(rest.length, ` ${restListe} trägt nicht deutlich bei.`, ` ${restListe} tragen nicht deutlich bei.`, ` ${restListe} does not contribute clearly.`, ` ${restListe} do not contribute clearly.`) : '')
    : Lp(rest.length, ` ${restListe} leistet keinen deutlichen eigenen Beitrag.`, ` ${restListe} leisten keinen deutlichen eigenen Beitrag.`, ` ${restListe} makes no clear contribution of its own.`, ` ${restListe} make no clear contribution of their own.`);
  const apa = `R² = ${ohneNull(e.r2)}, ${kiR2}, F(${e.df1}, ${e.df2}) = ${komma(e.f)}, p ${pWert(e.p)}`
    + (einfach && f1.stufen === 2 ? `; B = ${komma(h1.b)}, ${ki(komma(h1.lo), komma(h1.hi))}` : '')
    + (einfach ? '' : fk.filter(f => f.stufen > 2).map(f => `; ${kurz(label(f.spalte), 30)}: ΔR² = ${ohneNull(f.dr2)}, F(${f.df1}, ${f.df2}) = ${komma(f.f)}, p ${pWert(f.p)}`).join(''));
  return {
    haupt, zusatz: `${anteil} ${zufall}${gruppenSaetze}${zahlSatz}`,
    vorsicht: T('Vorhersagen heißt nicht verursachen.', 'Predicting does not mean causing.')
      + T(' Gruppen-Spalten gehen als Vergleiche mit ihrer ersten Gruppe ein (0/1-Hilfsspalten); ihre standardisierten β sind keine Rangfolge der Einflüsse.', ' Group columns enter as comparisons with their first group (0/1 helper columns); their standardized β are not a ranking of influences.'),
    apa,
    marken: [
      { text: T(`Erklärt: ${prozent(e.r2)} · R² = ${ohneNull(e.r2)}`, `Explained: ${prozent(e.r2)} · R² = ${ohneNull(e.r2)}`), erklaer: 'regression' },
      { text: `p ${pWert(e.p)}${unter05(sig)}`, erklaer: 'p-wert' },
      { text: T(`Plausibler Bereich für R²: ${ohneNull(r2Lo)} bis ${ohneNull(r2Hi)}`, `Plausible range for R²: ${ohneNull(r2Lo)} to ${ohneNull(r2Hi)}`), erklaer: 'konfidenzintervall' },
      ...fk.map(f => ({ text: T(`${kurz(label(f.spalte), 30)}: Vergleichsgruppe ${zitat(f.referenz)}`, `${kurz(label(f.spalte), 30)}: reference group ${zitat(f.referenz)}`), erklaer: 'regression' })),
      { text: T(`${e.df1 + e.df2 + 1} Personen mit allen Angaben`, `${e.df1 + e.df2 + 1} people with all answers`), erklaer: 'stichprobe' }
    ]
  };
}

/* ---------- Binäre logistische Regression ----------
 * PSPP 2.1.1: `LOGISTIC REGRESSION ziel WITH x1 x2 /PRINT=CI(95)` modelliert die Chance für den Wert mit interner Kodierung 1. Welcher Wert das ist, entscheidet PSPP selbst
 * (Zahlen: der größere; bei Text hängt es von der Zeilenreihenfolge ab - Abschlusstest B3). Darum rechnet Statable nicht mit der Zielspalte, sondern mit einer Hilfsspalte
 * (`logistikBefehl` in verfahren.ts): Ereignis = 1, Vergleichswert = 0. Das Ereignis legt die feste Regel `logistikWerte` fest (Zahlen der größere Wert, Text die alphabetisch
 * zweite Antwort - wie R `glm` mit Faktor und SPSS-Gewohnheit); „Ereignis umkehren“ im Blatt vertauscht die beiden und PSPP rechnet neu. Alle PSPP-Tabellen, der Satz und der Export
 * zeigen so dieselbe Richtung; es wird nichts nachträglich gedreht.
 * Das 95-%-KI der Odds Ratios ist das Wald-Intervall exp(B ± 1,96·SE) - wie R `exp(confint.default(glm))`.
 * PSPP gibt keinen Modelltest aus: χ² = −2LL(nur Konstante) − −2LL(Modell); −2LL der Nullmodells aus den beiden Gruppengrößen (Klassifikationstabelle).
 * ⚠ Satz-Vorlagen, Schwelle (mindestens 10 Fälle je Prädiktor nach Peduzzi et al. 1996) von der Fachperson abzunehmen. Nagelkerkes R² ohne Wortstufe (F6). */
export interface LogPraediktor { name: string; b: number; se: number; p: number; or: number; orLo: number; orHi: number; spalte?: string; faktor?: { wert: string; stufe: string; referenz: string } }
/** Gesamttest einer Gruppen-Spalte in der logistischen Regression: Likelihood-Quotienten-Test (drei und mehr Stufen), Wald-Test der einen Hilfsspalte (zwei Stufen) oder Modelltest (allein im Modell). */
export interface LogFaktorTest { spalte: string; referenz: string; stufen: number; werte: string[]; chi2: number; df: number; p: number; art: 'lr' | 'wald' | 'modell' }
export interface Logistik {
  art: 'logistik'; ziel: string; ereignis: string; referenz: string; n: number; nEreignis: number; nReferenz: number;
  minus2ll: number; chi2: number; df: number; p: number; coxSnell: number; nagelkerke: number; treffer: number; praediktoren: LogPraediktor[];
  /** `true`: Das Ereignis wurde im Blatt gegenüber der festen Regel umgekehrt („Ereignis umkehren“). */
  umgekehrt?: boolean;
  /** Gruppen-Spalten als Prädiktoren (fehlt ohne) */
  faktoren?: LogFaktorTest[];
}

/** Feste Regel für das Ereignis einer Spalte mit genau zwei Werten: bei Zahlen (auch mit Wertebeschriftung) der größere Wert - 1 bei 0/1, 2 bei 1/2 -,
 *  bei Text die alphabetisch zweite Antwort (Reihenfolge der Schrift, wie R `factor` und `glm`). Unabhängig von der Zeilenreihenfolge. Sonst `undefined`. */
export function logistikWerte(werte: (string | number)[], istZahl: boolean): { ereignis: string; referenz: string } | undefined {
  const w = [...new Set(werte.filter(v => v !== '' && v !== null && v !== undefined).map(v => (istZahl ? Number(v) : String(v).trim())))];
  if (w.length !== 2) return undefined;
  const [referenz, ereignis] = istZahl ? (w as number[]).sort((a, b) => a - b).map(String) : (w as string[]).sort(new Intl.Collator('de').compare);
  return { ereignis: ereignis!, referenz: referenz! };
}

/** Liest das Ergebnis von PSPP, das mit der Hilfsspalte gerechnet hat (interne 1 = `kod.ereignis`, interne 0 = `kod.referenz`; Werte so geschrieben wie in den Daten). `kod.umgekehrt`: im Blatt umgekehrt gewählt.
 *  `terme`: die Prädiktoren, wie der Befehl sie gebaut hat (regfaktor.ts) - für Gruppen-Spalten und ihren Gesamttest. */
export function logistik(items: OutputItem[], ziel: string, kod: { ereignis: string; referenz: string; umgekehrt?: boolean }, terme?: RegTerm[]): Logistik {
  const ms = finde(items, /^Model Summary/), kl = finde(items, /^Classification Table/), gl = finde(items, /^Variables in the Equation/);
  if (!ms || !kl || !gl) throw new Error('Tabellen der logistischen Regression fehlen');
  const { ereignis, referenz } = kod;
  const z0 = ms.tabelle.headRows[0];
  const minus2ll = zahl(ms.n[z0]![spalte(ms, /^-2 Log likelihood$/)]), coxSnell = zahl(ms.n[z0]![spalte(ms, /^Cox & Snell R Square$/)]), nagelkerke = zahl(ms.n[z0]![spalte(ms, /^Nagelkerke R Square$/)]);
  // Gruppengrößen und Trefferquote: Zeilen der Klassifikationstabelle mit Prozent am Ende (Zeile 1 = interne 0, Zeile 2 = interne 1); die Gesamtzeile hat die Gesamt-Trefferquote.
  const pk = kl.tabelle.cols - 1, zeilen = kl.t.map((_, i) => i).filter(i => i >= kl.tabelle.headRows[0] && /%$/.test(kl.t[i]![pk]!));
  const gruppe = (i: number) => kl.n[i]!.slice(pk - 2, pk).reduce((a: number, v) => a + (v ?? 0), 0);
  const nReferenz = gruppe(zeilen[0]!), nEreignis = gruppe(zeilen[1]!), n = nReferenz + nEreignis;
  const treffer = zahl(kl.n[zeilen[2]!]![pk]) / 100;
  const nullLL = -2 * (nEreignis * Math.log(nEreignis / n) + nReferenz * Math.log(nReferenz / n));
  const k = { b: spalte(gl, /^B$/), se: spalte(gl, /^S\.E\.$/), p: spalte(gl, /^Sig\.$/), or: spalte(gl, /^Exp\(B\)$/), lo: spalte(gl, /^Lower$/), hi: spalte(gl, /^Upper$/) };
  const praediktoren: LogPraediktor[] = [];
  for (let i = gl.tabelle.headRows[0]; i < gl.t.length; i++) {
    const name = gl.t[i]![1] || gl.t[i]![0] || '';
    if (!name || /^Step\b/.test(name) || /^Constant$/.test(name) || gl.n[i]![k.b] === undefined) continue;
    praediktoren.push({ name, b: zahl(gl.n[i]![k.b]), se: zahl(gl.n[i]![k.se]), p: zahl(gl.n[i]![k.p]), or: zahl(gl.n[i]![k.or]), orLo: zahl(gl.n[i]![k.lo]), orHi: zahl(gl.n[i]![k.hi]) });
  }
  const chi2 = nullLL - minus2ll, df = praediktoren.length;
  const e: Logistik = { art: 'logistik', ziel, ereignis, referenz, n, nEreignis, nReferenz, minus2ll, chi2, df, p: chiQuadratP(chi2, df), coxSnell, nagelkerke, treffer, praediktoren, ...(kod.umgekehrt ? { umgekehrt: true } : {}) };
  if (!terme?.some(x => x.faktor)) return e;
  // Gruppen-Spalten: Zeilen zuordnen (Reihenfolge wie im Befehl); Gesamttest aus −2LL der Modelle ohne die Spalte (Reihenfolge von regGesamttests).
  const reihen = terme.flatMap((x): { spalte: string; f: RegFaktor | null; j: number }[] => (x.faktor ? x.faktor.hilfs.map((_, j) => ({ spalte: x.spalte, f: x.faktor, j })) : [{ spalte: x.spalte, f: null, j: 0 }]));
  if (reihen.length !== praediktoren.length) return e;
  const mit = praediktoren.map((p, i) => { const z = reihen[i]!; return { ...p, spalte: z.spalte, ...(z.f ? { faktor: { wert: z.f.stufen[z.j + 1]!.wert, stufe: z.f.stufen[z.j + 1]!.name, referenz: z.f.stufen[0]!.name } } : {}) }; });
  const ohne = alleTabellen(items, /^Model Summary/).slice(1).map(m => zahl(m.n[m.tabelle.headRows[0]]![spalte(m, /^-2 Log likelihood$/)])), tests = regGesamttests(terme);
  const faktoren: LogFaktorTest[] = terme.flatMap((x): LogFaktorTest[] => {
    if (!x.faktor) return [];
    const f = x.faktor, basis = { spalte: x.spalte, referenz: f.stufen[0]!.name, stufen: f.stufen.length, werte: f.stufen.map(st => st.wert) };
    if (terme.length === 1) return [{ ...basis, chi2: e.chi2, df: e.df, p: e.p, art: 'modell' as const }];
    if (f.hilfs.length === 1) { const p = mit.find(q => q.spalte === x.spalte)!; return [{ ...basis, chi2: (p.b / p.se) ** 2, df: 1, p: p.p, art: 'wald' as const }]; }
    const m2 = ohne[tests.indexOf(x)];
    if (m2 === undefined) return [];
    const c2 = m2 - minus2ll;
    return [{ ...basis, chi2: c2, df: f.hilfs.length, p: chiQuadratP(c2, f.hilfs.length), art: 'lr' as const }];
  });
  return { ...e, praediktoren: mit, faktoren };
}

/** `wert(spalte, wert)`: Anzeigename eines Werts (Wertebeschriftung, sonst der Wert selbst). */
export function saetzeLogistik(e: Logistik, label: (s: string) => string, wert: (spalte: string, w: string) => string = (_, w) => w): Saetze {
  const ziel = zitat(label(e.ziel)), ev = zitat(wert(e.ziel, e.ereignis)), ref = zitat(wert(e.ziel, e.referenz));
  const einfach = e.praediktoren.length === 1, p1 = e.praediktoren[0]!, sig = e.p < 0.05;
  // F6 (Abschlusstest 10.10.): Nagelkerkes R² ist ein Pseudo-R², kein Anteil erklärter Varianz; Cohens Grenzen (,02/,13/,26) gelten für das R² der linearen
  // Regression und werden hier nicht angewandt - die Zahl steht ohne Wortstufe (Hosmer, Lemeshow & Sturdivant 2013, Kap. 5.2.5; Menard 2000).
  const nk = T(`Nagelkerkes R² = ${ohneNull(e.nagelkerke)} ist ein Pseudo-R²: nicht wie das R² der linearen Regression als erklärter Anteil zu lesen.`, `Nagelkerke R² = ${ohneNull(e.nagelkerke)} is a pseudo R²: not to be read like the R² of linear regression as a share explained.`);
  const orT = (x: LogPraediktor) => `${komma(x.or)}, ${ki(komma(x.orLo), komma(x.orHi))}`;
  // Gruppen-Spalten (Abschlusstest F1): als Vergleich mit der ersten Gruppe, nicht „je Einheit“; im Kopfsatz der Name der Spalte statt der Hilfsspalten.
  const fk = e.faktoren ?? [], fName = (f: LogFaktorTest) => zitat(label(f.spalte));
  const namen = fk.length ? [...new Set(e.praediktoren.map(x => (x.faktor ? `f:${x.spalte}` : `z:${x.name}`)))].map(k => (k.startsWith('f:') ? label(k.slice(2)) : k.slice(2))) : e.praediktoren.map(x => x.name);
  const haupt = einfach && p1.faktor
    ? T(`Bei ${zitat(p1.faktor.stufe)} (${kurz(label(p1.spalte!))}) ist die Chance (Odds) für ${ev} gegenüber ${ref} bei ${ziel} um den Faktor ${komma(p1.or >= 1 ? p1.or : 1 / p1.or)} ${p1.or >= 1 ? L('höher', 'higher') : L('niedriger', 'lower')} als bei ${zitat(p1.faktor.referenz)}: Odds Ratio = ${komma(p1.or)}, ${ki(komma(p1.orLo), komma(p1.orHi))}.`,
      `For ${zitat(p1.faktor.stufe)} (${kurz(label(p1.spalte!))}), the odds of ${ev} versus ${ref} on ${ziel} are ${komma(p1.or >= 1 ? p1.or : 1 / p1.or)} times ${p1.or >= 1 ? L('höher', 'higher') : L('niedriger', 'lower')} than for ${zitat(p1.faktor.referenz)}: odds ratio = ${komma(p1.or)}, ${ki(komma(p1.orLo), komma(p1.orHi))}.`)
    : einfach && komma(p1.or) === komma(1)
    // T31: Odds Ratio gerundet 1,00 - nicht „steigt um den Faktor 1,00“.
    ? T(`Mit jeder Einheit mehr bei ${zitat(p1.name)} ändert sich bei ${ziel} die Chance (Odds) für ${ev} gegenüber ${ref} praktisch nicht: Odds Ratio = ${komma(p1.or)}, ${ki(komma(p1.orLo), komma(p1.orHi))}.`,
      `With each additional unit of ${zitat(p1.name)}, the odds of ${ev} versus ${ref} on ${ziel} hardly change: odds ratio = ${komma(p1.or)}, ${ki(komma(p1.orLo), komma(p1.orHi))}.`)
    : einfach
    ? T(`Mit jeder Einheit mehr bei ${zitat(p1.name)} ${p1.or >= 1 ? L('steigt', 'rise') : L('sinkt', 'fall')} bei ${ziel} die Chance (Odds) für ${ev} gegenüber ${ref} um den Faktor ${komma(p1.or >= 1 ? p1.or : 1 / p1.or)}: Odds Ratio = ${komma(p1.or)}, ${ki(komma(p1.orLo), komma(p1.orHi))}.`,
      `With each additional unit of ${zitat(p1.name)}, the odds of ${ev} versus ${ref} on ${ziel} ${p1.or >= 1 ? L('steigt', 'rise') : L('sinkt', 'fall')} by a factor of ${komma(p1.or >= 1 ? p1.or : 1 / p1.or)}: odds ratio = ${komma(p1.or)}, ${ki(komma(p1.orLo), komma(p1.orHi))}.`)
    // Prüfung A13: die Überschrift behauptet keine Vorhersage, die der Modelltest nicht trägt.
    : sig ? T(`Mit ${aufzaehlung(namen)} lässt sich ${label(e.ziel)} vorhersagen (${ev} gegenüber ${ref}; Nagelkerkes R² = ${ohneNull(e.nagelkerke)}).`,
      `${aufzaehlung(namen)} together predict ${label(e.ziel)} (${ev} versus ${ref}; Nagelkerke R² = ${ohneNull(e.nagelkerke)}).`)
      : T(`Mit ${aufzaehlung(namen)} lässt sich ${label(e.ziel)} nicht deutlich vorhersagen (${ev} gegenüber ${ref}; Nagelkerkes R² = ${ohneNull(e.nagelkerke)}).`,
      `${aufzaehlung(namen)} do not clearly predict ${label(e.ziel)} (${ev} versus ${ref}; Nagelkerke R² = ${ohneNull(e.nagelkerke)}).`);
  // T7: Der Modelltest ist ein Likelihood-Quotienten-Test der Anpassung, keine Aussage über die Trennung (die zeigt die Trefferquote).
  const modell = sig
    ? T(`Das Modell passt besser zu den Daten als ein Modell ohne Prädiktoren (Likelihood-Quotienten-Test); ein so großer Vorsprung wäre selten, wenn es in Wahrheit keinen Zusammenhang gäbe (χ²(${e.df}) = ${komma(e.chi2)}, p ${pWert(e.p)}). ${nk}`,
      `The model fits the data better than a model without predictors (likelihood ratio test); an improvement this large would be rare if there were truly no relationship (χ²(${e.df}) = ${komma(e.chi2)}, p ${pWert(e.p)}). ${nk}`)
    : T(`Das Modell passt aber nicht deutlich besser zu den Daten als ein Modell ohne Prädiktoren (Likelihood-Quotienten-Test, χ²(${e.df}) = ${komma(e.chi2)}, p ${pWert(e.p)}). Die Daten belegen die Vorhersage darum nicht.`,
      `But the model does not fit the data clearly better than a model without predictors (likelihood ratio test, χ²(${e.df}) = ${komma(e.chi2)}, p ${pWert(e.p)}). So the data do not support the prediction.`);
  const eigen = e.praediktoren.filter(x => x.p < 0.05 && !x.faktor);
  // Je Gruppen-Spalte: Gesamttest (Likelihood-Quotient) bei drei und mehr Stufen neben weiteren Prädiktoren, dann die Odds Ratios gegenüber der Vergleichsgruppe.
  const gruppenSaetze = einfach ? '' : fk.map(f => {
    const h = e.praediktoren.filter(x => x.faktor && x.spalte === f.spalte), zwei = f.stufen === 2, test = f.art === 'lr';
    const ganz = !test ? '' : f.p < 0.05
      ? T(` ${fName(f)} trägt als Ganzes deutlich bei (Likelihood-Quotienten-Test χ²(${f.df}) = ${komma(f.chi2)}, p ${pWert(f.p)}).`, ` ${fName(f)} contributes clearly as a whole (likelihood ratio test χ²(${f.df}) = ${komma(f.chi2)}, p ${pWert(f.p)}).`)
      : T(` ${fName(f)} trägt als Ganzes nicht deutlich bei (Likelihood-Quotienten-Test χ²(${f.df}) = ${komma(f.chi2)}, p ${pWert(f.p)}).`, ` ${fName(f)} does not contribute clearly as a whole (likelihood ratio test χ²(${f.df}) = ${komma(f.chi2)}, p ${pWert(f.p)}).`);
    const zeigen = zwei || f.art === 'modell' ? true : f.p < 0.05;
    const liste = aufzaehlung(h.map(x => `${zitat(x.faktor!.stufe)} ${komma(x.or)}, ${ki(komma(x.orLo), komma(x.orHi))}${zwei ? `, p ${pWert(x.p)}` : ''}`));
    return ganz + (zeigen ? T(` Odds Ratio gegenüber ${zitat(f.referenz)} (${label(f.spalte)}): ${liste}.`, ` Odds ratio versus ${zitat(f.referenz)} (${label(f.spalte)}): ${liste}.`) : '');
  }).join('');
  const orListe = aufzaehlung(eigen.map(x => `${zitat(x.name)} (${L('Odds Ratio', 'odds ratio')} = ${orT(x)})`));
  const beitrag = einfach ? '' : eigen.length && !sig
    ? T(` Für sich genommen ist bei ${orListe} der Wald-Test unter ,05; weil das Modell als Ganzes nicht trägt, ist das kein Beleg - mit Vorsicht lesen.`, ` Taken on its own, the Wald test for ${orListe} is below .05; because the model as a whole does not hold, this is not evidence - read with caution.`)
    : eigen.length
    ? Lp(eigen.length, ` Einen eigenen Beitrag leistet ${orListe}.`, ` Einen eigenen Beitrag leisten ${orListe}.`, ` ${orListe} makes a contribution of its own.`, ` ${orListe} make a contribution of their own.`)
    : fk.length ? '' : T(' Keine der Größen leistet für sich einen deutlichen eigenen Beitrag.', ' None of the predictors makes a clear contribution of its own.');
  const basis = Math.max(e.nEreignis, e.nReferenz) / e.n;
  const ereignisSatz = T(`Ereignis: ${ev} (gegen ${ref})${e.umgekehrt ? L(', umgekehrt gewählt', ', reversed') : ''}. `, `Event: ${ev} (versus ${ref})${e.umgekehrt ? L(', umgekehrt gewählt', ', reversed') : ''}. `);
  const treffer = T(` Richtig zugeordnet wurden ${prozent(e.treffer)} der Personen; ohne Vorhersage läge die Trefferquote bei ${prozent(basis)} (immer die häufigere Gruppe).`, ` ${prozent(e.treffer)} of the people were classified correctly; without any prediction the hit rate would be ${prozent(basis)} (always the more frequent group).`);
  const klein = Math.min(e.nEreignis, e.nReferenz) / e.praediktoren.length < 10, trennung = e.praediktoren.some(x => Math.abs(x.b) > 15 || x.se > 50);
  return {
    haupt, zusatz: ereignisSatz + modell + beitrag + gruppenSaetze + treffer, ereignis: ereignisSatz.trim(),
    vorsicht: T('Ein Odds Ratio ist kein Verhältnis von Wahrscheinlichkeiten: 1 heißt kein Zusammenhang, und liegt 1 im Bereich, ist ein Zusammenhang nicht belegt. Eine Ursache zeigt es nicht.',
      'An odds ratio is not a ratio of probabilities: 1 means no relationship, and if 1 lies within the range, there is no clear evidence of a relationship. It does not show a cause.'),
    apa: `χ²(${e.df}) = ${komma(e.chi2)}, p ${pWert(e.p)}, Nagelkerke R² = ${ohneNull(e.nagelkerke)}` + (einfach ? `; OR = ${orT(p1)}` : `; ${e.praediktoren.map(x => `${x.name}: OR = ${orT(x)}, p ${pWert(x.p)}`).join('; ')}`)
      + fk.filter(f => f.art === 'lr').map(f => `; ${kurz(label(f.spalte), 30)}: χ²(${f.df}) = ${komma(f.chi2)}, p ${pWert(f.p)}`).join(''),
    marken: [
      { text: T(`Nagelkerkes R² = ${ohneNull(e.nagelkerke)} (Pseudo-R²)`, `Nagelkerke R² = ${ohneNull(e.nagelkerke)} (pseudo R²)`), erklaer: 'logistische-regression' },
      { text: `p ${pWert(e.p)}${unter05(sig)}`, erklaer: 'p-wert' },
      ...(einfach ? [{ text: T(`Odds Ratio = ${komma(p1.or)}`, `Odds Ratio = ${komma(p1.or)}`), erklaer: 'odds-ratio' }] : []),
      { text: T(`${prozent(e.treffer)} richtig zugeordnet`, `${prozent(e.treffer)} classified correctly`), erklaer: 'logistische-regression' },
      ...(klein ? [{ text: T(`Wenige Fälle (${Math.min(e.nEreignis, e.nReferenz)} in der kleineren Gruppe)`, `Few cases (${Math.min(e.nEreignis, e.nReferenz)} in the smaller group)`), erklaer: 'stichprobe', hinweis: true }] : []),
      ...(trennung ? [{ text: T('Sehr große Werte: Gruppen fast vollständig getrennt?', 'Very large values: groups almost perfectly separated?'), erklaer: 'logistische-regression', hinweis: true }] : [])
    ]
  };
}

export interface Frage { name: string; trennschaerfe: number; alphaOhne: number }
export interface Skala { art: 'skala'; alpha: number; fragen: Frage[]; n: number; /** McDonalds Omega (R/lavaan), erst nach „Omega berechnen“ */ omega?: import('./rverfahren.svelte').OmegaErg;
  /** Testhalbierung (PSPP RELIABILITY /MODEL=SPLIT), erst nach „Halbierung rechnen“ */ splitHalf?: SplitHalf }

export function skala(items: OutputItem[]): Skala {
  const rs = finde(items, /^Reliability Statistics$/), it = finde(items, /^Item-Total Statistics$/), cp = finde(items, /^Case Processing Summary$/);
  if (!rs) throw new Error('Reliabilitäts-Tabelle fehlt');
  const alpha = zahl(rs.n[rs.tabelle.headRows[0]]![spalte(rs, /^Cronbach's Alpha$/)]);
  const fragen: Frage[] = [];
  if (it) {
    const k = { r: spalte(it, /^Corrected Item-Total Correlation$/), a: spalte(it, /^Cronbach's Alpha if Item Deleted$/) };
    // Prüfrunde 07.10.: PSPP lässt Felder leer, wenn sie nicht definiert sind - „Alpha ohne“ bei zwei Fragen, die Trennschärfe
    // einer Frage ohne Streuung. Vorher brach der Satz dann ab, oder die Frage fiel aus der Zählung („Die 2 Fragen“ bei drei).
    for (let i = it.tabelle.headRows[0]; i < it.t.length; i++) if (it.t[i]![0]) fragen.push({ name: it.t[i]![0]!, trennschaerfe: it.n[i]![k.r] ?? NaN, alphaOhne: it.n[i]![k.a] ?? NaN });
  }
  const gueltig = cp?.t.findIndex(z => z[0] === 'Valid') ?? -1;
  return { art: 'skala', alpha, fragen, n: gueltig >= 0 ? zahl(cp!.n[gueltig]![spalte(cp!, /^N$/)]) : 0 };
}

/** Testhalbierung (Split-Half): Teil 1 = die ersten `k1` Fragen in der gewählten Reihenfolge, Teil 2 = die übrigen `k2`. */
export interface SplitHalf { art: 'splithalf'; n: number; k1: number; k2: number; /** Korrelation der Hälften */ r: number; /** Spearman-Brown, gleiche Länge */ sbGleich: number; /** Spearman-Brown, ungleiche Länge */ sbUngleich: number; guttman: number; alpha1: number; alpha2: number }
/** Teilungspunkt ceil(k/2): PSPP bricht bei `/MODEL=SPLIT` ohne Zahl ab. Die Namen sind PSPP-Spaltennamen (nie freier Text). */
export const splitHalfSyntax = (spalten: string[]) => `RELIABILITY\n  /VARIABLES=${spalten.join(' ')}\n  /MODEL=SPLIT(${Math.ceil(spalten.length / 2)}).`;
export function splitHalf(items: OutputItem[]): SplitHalf {
  const rs = finde(items, /^Reliability Statistics$/), cp = finde(items, /^Case Processing Summary$/);
  if (!rs) throw new Error(L('Tabelle der Testhalbierung fehlt', 'Split-half table is missing'));
  // Zeilen der PSPP-Tabelle: [Gruppe, Teil, Größe | Wert]; der Zahlenwert steht in der letzten Spalte
  const wert = (g: RegExp, t?: RegExp): number => {
    const i = rs.t.findIndex(z => g.test(z[0] ?? '') && (!t || t.test(z[1] ?? '')));
    if (i < 0) throw new Error(L('Tabelle der Testhalbierung unvollständig', 'Split-half table is incomplete'));
    return rs.n[i]![rs.n[i]!.length - 1] ?? NaN;
  };
  const teil = (nr: number, was: string): number => {
    const i = rs.t.findIndex(z => z[1] === `Part ${nr}` && z[2] === was);
    if (i < 0) throw new Error(L('Tabelle der Testhalbierung unvollständig', 'Split-half table is incomplete'));
    return rs.n[i]![rs.n[i]!.length - 1] ?? NaN;
  };
  const gueltig = cp?.t.findIndex(z => z[0] === 'Valid') ?? -1;
  return { art: 'splithalf', n: gueltig >= 0 ? zahl(cp!.n[gueltig]![spalte(cp!, /^N$/)]) : 0, k1: teil(1, 'N of Items'), k2: teil(2, 'N of Items'),
    r: wert(/^Correlation Between Forms$/), sbGleich: wert(/^Spearman-Brown/, /^Equal Length$/), sbUngleich: wert(/^Spearman-Brown/, /^Unequal Length$/), guttman: wert(/^Guttman Split-Half/),
    alpha1: teil(1, 'Value'), alpha2: teil(2, 'Value') };
}

export function alphaWort(a0: number): string {
  const a = angezeigt(a0);
  return a >= 0.9 ? L('sehr gut', 'excellent') : a >= 0.8 ? L('gut', 'good') : a >= 0.7 ? L('akzeptabel', 'acceptable') : a >= 0.6 ? L('fragwürdig', 'questionable') : a >= 0.5 ? L('schwach', 'poor') : L('nicht ausreichend', 'unacceptable');
}
export function saetzeSkala(e: Skala): Saetze {
  const k = e.fragen.length || 0, wort = alphaWort(e.alpha), al = ohneNull(e.alpha);
  const besser = e.fragen.filter(f => f.alphaOhne > e.alpha + 0.01).sort((a, b) => b.alphaOhne - a.alphaOhne);
  const negativ = e.fragen.filter(f => f.trennschaerfe < 0);
  const gleich = e.fragen.filter(f => Number.isNaN(f.trennschaerfe));
  const hinweise = [
    ...gleich.map(f => T(`${zitat(f.name)} hat bei allen Personen denselben Wert und trägt nichts zur Skala bei.`, `${zitat(f.name)} has the same value for everyone and adds nothing to the scale.`)),
    ...(negativ.length === 1 ? [T(`${zitat(negativ[0]!.name)} läuft gegen die anderen Fragen - vielleicht ist sie umgekehrt gestellt und muss umgepolt werden.`, `${zitat(negativ[0]!.name)} runs against the other questions - it may be worded the other way round and need to be reverse-coded.`)]
      : negativ.length ? [T(`${aufzaehlung(negativ.map(f => zitat(f.name)))} laufen gegen die anderen Fragen - vielleicht sind sie umgekehrt gestellt und müssen umgepolt werden.`, `${aufzaehlung(negativ.map(f => zitat(f.name)))} run against the other questions - they may be worded the other way round and need to be reverse-coded.`)] : []),
    ...besser.filter(f => !negativ.includes(f)).slice(0, 2).map(f => T(`Ohne ${zitat(f.name)} wäre Alpha höher (${ohneNull(f.alphaOhne)}). Gehört diese Frage inhaltlich dazu?`, `Without ${zitat(f.name)}, alpha would be higher (${ohneNull(f.alphaOhne)}). Does this question belong with the others?`))
  ];
  const pruefen = gleich.length + negativ.length + besser.filter(f => !negativ.includes(f)).slice(0, 2).length;
  const gut = angezeigt(e.alpha) >= 0.7;
  // 95-%-Bereich für Alpha nach Feldt (1965), F-Verteilung mit n − 1 und (n − 1)(k − 1) Freiheitsgraden; wie R psych::alpha()$feldt. Braucht die Zahl der Personen (alte Projektdateien: n kann fehlen).
  const [aLo, aHi] = alphaBereich(e.alpha, e.n, k), kiA = Number.isFinite(aLo) && Number.isFinite(aHi) ? ki(ohneNull(aLo), ohneNull(aHi)) : '';
  return {
    // F7 (Abschlusstest 10.10.): α beschreibt die interne Konsistenz. Ob die Fragen ein gemeinsames Merkmal messen (Eindimensionalität), prüft α nicht
    // (Cortina 1993; Sijtsma 2009) - darum folgt aus α ≥ ,70 nicht mehr „lassen sich zu einem Wert zusammenfassen“.
    haupt: T(`Die Zuverlässigkeit der ${k ? k + ' ' : ''}Fragen (interne Konsistenz) ist ${wort}: Cronbachs Alpha = ${al}${kiA ? ', ' + kiA : ''}.`,
      `The reliability of the ${k ? k + ' ' : ''}questions (internal consistency) is ${wort}: Cronbach's alpha = ${al}${kiA ? ', ' + kiA : ''}.`),
    zusatz: ((hinweise.length ? hinweise.join(' ') : gut ? T('Keine Frage fällt aus der Reihe.', 'No question stands out.') : '')
      + (gut ? T(' Ob die Fragen ein gemeinsames Merkmal messen (Eindimensionalität), zeigt Alpha nicht - das prüft eine Faktorenanalyse.', ' Alpha does not show whether the questions measure one common trait (unidimensionality) - a factor analysis tests that.') : T(' Ein gemeinsamer Wert aus diesen Fragen wäre unsicher.', ' A combined score from these questions would be uncertain.'))).trim(),
    vorsicht: T('Alpha steigt mit der Zahl der Fragen und zeigt nicht, ob die Fragen das Richtige messen.', 'Alpha rises with the number of questions and does not show whether the questions measure the right thing.'),
    apa: T(`Cronbachs α = ${al}${kiA ? ', ' + kiA : ''} (${k} Items${e.n ? `, n = ${e.n}` : ''})`, `Cronbach's α = ${al}${kiA ? ', ' + kiA : ''} (${k} items${e.n ? `, n = ${e.n}` : ''})`),
    marken: [
      { text: `${T('Zuverlässigkeit', 'Reliability')}: ${wort} · α = ${al}`, erklaer: 'reliabilitaet' },
      ...(hinweise.length ? [{ text: Lp(pruefen, `${pruefen} Frage prüfen`, `${pruefen} Fragen prüfen`, `Check ${pruefen} question`, `Check ${pruefen} questions`), erklaer: 'reliabilitaet', hinweis: true }] : []),
      ...(e.n ? [{ text: T(`${e.n} Personen mit allen Antworten`, `${e.n} people with all answers`), erklaer: 'stichprobe' }] : []),
      ...(kiA ? [{ text: T(`Plausibler Bereich für α: ${ohneNull(aLo)} bis ${ohneNull(aHi)}`, `Plausible range for α: ${ohneNull(aLo)} to ${ohneNull(aHi)}`), erklaer: 'konfidenzintervall' }] : [])
    ]
  };
}
export interface Faktor { nr: number; fragen: { name: string; ladung: number }[] }
export interface Faktoren { art: 'faktor';
  /** Abschlusstest F3: 'pc' = Hauptkomponenten + Varimax (fehlt in alten Projekten = 'pc'), 'paf' = Hauptachsen + Promax. */
  methode?: 'pc' | 'paf';
  /** Zahl nach dem Kaiser-Kriterium (Eigenwerte > 1), Vorschlag der Parallelanalyse (Horn 1965, parallelanalyse.ts) und die selbst festgelegte Zahl (null = Kaiser). */
  kaiser?: number; parallel?: number; /** Parallelanalyse mit Fallgewicht ausgeschaltet (Sperrtabelle `faktor:parallel`): das Ergebnis sagt es in einem Satz */ parallelAus?: boolean; zahlGewaehlt?: number | null; /** Anzeigegrenze der Ladungen (null = alle gezeigt; fehlt in alten Projekten = ,30) */ grenze?: number | null;
  /** Faktoren, deren Fragen überwiegend negativ laden: im Satz umgekehrt gelesen (Vorzeichen beliebig); fehlt = keiner. */
  gespiegelt?: number[];
  /** Promax: Korrelationen der Faktoren (PSPP „Factor Correlation Matrix“), mit den umgekehrt gelesenen Faktoren. */
  korrelationen?: number[][];
  faktoren: Faktor[]; erklaert: number; doppelt: string[]; ohne: string[]; /** Gewählte Spalten, die PSPP gar nicht in die Matrix aufgenommen hat (G12) - fehlt in alten Projektdateien */ ausgelassen?: string[]; n: number; fragen: number; /** KMO und Bartlett (Prüfung A9) */ kmo?: { kmo: number; chi2: number; df: number; p: number }; /** Alle Eigenwerte der Korrelationsmatrix (Spalte „Initial Eigenvalues“ von PSPP, Befehl PRINT=INITIAL); fehlt in Projekten von vor dem Scree-Plot. */ eigen?: number[]; /** Konfirmatorische Faktorenanalyse (R/lavaan), erst nach „CFA rechnen“ */ cfa?: import('./rverfahren.svelte').CfaErg }

/** `gewaehlt`: die gewählten Spalten als [Name, Bezeichnung] - Spalten, die in der Matrix fehlen, werden als `ausgelassen` gemeldet (G12: sonst fehlte eine Zeile ohne Hinweis). */
export function faktoren(items: OutputItem[], gewaehlt: [string, string][] = [], zahlGewaehlt: number | null = null): Faktoren {
  // Promax (Hauptachsen): die Zuordnung folgt der Mustermatrix („Pattern Matrix“), wie in SPSS und psych.
  const m = finde(items, /^Rotated Component Matrix$|^Rotated Factor Matrix$|^Pattern Matrix$/) ?? finde(items, /^Component Matrix$|^Factor Matrix$/);
  if (!m) throw new Error('Ladungsmatrix fehlt');
  const kopf = m.tabelle.headRows[0], spalten = m.tabelle.cols - 1;
  const faktoren: Faktor[] = Array.from({ length: spalten }, (_, i) => ({ nr: i + 1, fragen: [] }));
  const doppelt: string[] = [], ohne: string[] = [];
  let fragen = 0;
  for (let i = kopf; i < m.t.length; i++) {
    const name = m.t[i]![0] ?? ''; if (!name) continue; fragen++;
    const l = m.n[i]!.slice(1).map((v, j) => ({ j, v })).filter(x => x.v !== undefined && Math.abs(x.v) >= 0.3);
    if (!l.length) { ohne.push(name); continue; }
    if (l.length > 1) doppelt.push(name);
    const st = l.reduce((a, b) => (Math.abs(b.v!) > Math.abs(a.v!) ? b : a));
    faktoren[st.j]!.fragen.push({ name, ladung: st.v! });
  }
  const inMatrix = new Set(m.t.slice(kopf).map(z => (z[0] ?? '').trim().toLowerCase()).filter(Boolean));
  // PSPP lässt mit BLANK(.30) eine Zeile ganz weg, wenn alle Ladungen darunter liegen (Hauptachsen: Frage q12 in fa-drei.csv). Steht die Frage in den
  // Kommunalitäten, ist sie mitgerechnet worden und lädt auf keinem Faktor („ohne“); fehlt sie auch dort, hat PSPP sie nicht aufgenommen („ausgelassen“).
  const ko = finde(items, /^Communalities$/);
  const imModell = ko ? new Set(ko.t.slice(ko.tabelle.headRows[0]).map(z => (z[0] ?? '').trim().toLowerCase()).filter(Boolean)) : null;
  // Lange Bezeichnungen kommen gekürzt mit „ …“ an (lesbar(…, true)); die Matrix hat den vollen Text - dann zählt der Anfang.
  const hat = (menge: Set<string>, [n, b]: [string, string]) => {
    const bk = b.trim().toLowerCase();
    if (menge.has(n.trim().toLowerCase()) || menge.has(bk)) return true;
    if (!bk.endsWith('…')) return false;
    const anfang = bk.slice(0, -1).trimEnd();
    return anfang.length > 0 && [...menge].some(z => z.startsWith(anfang));
  };
  const fehlen = gewaehlt.filter(x => !hat(inMatrix, x));
  for (const x of fehlen) if (imModell && hat(imModell, x)) { ohne.push(x[1]); fragen++; }
  const ausgelassen = fehlen.filter(x => !(imModell && hat(imModell, x))).map(([, b]) => b);
  const tv = finde(items, /^Total Variance Explained$/);
  let erklaert = 0;
  // Erklärte Varianz: „Extraction Sums … Cumulative %“, wenn da (Hauptachsen; bei Promax sind die Rotationssummen nicht additiv und in PSPP 2.1.1 leer), sonst die letzte Kumuliert-Spalte (Hauptkomponenten: Rotation = Extraktion).
  if (tv) {
    const kum = tv.t[1] ? tv.t[1].flatMap((t, i) => (/Cumulative %/.test(t) ? [i] : [])) : [];
    const ex = tv.t[0] ? tv.t[0].findIndex(t => /Extraction Sums/.test(t)) : -1;
    const k = ex >= 0 ? kum.find(i => i > ex) ?? -1 : kum.at(-1) ?? -1;
    if (k >= 0) for (let i = tv.tabelle.headRows[0]; i < tv.t.length; i++) { const v = tv.n[i]![k]; if (v !== undefined && Number.isFinite(v) && v > -1e300 && i - tv.tabelle.headRows[0] < spalten) erklaert = v; }
  }
  const ds = finde(items, /^Descriptive Statistics$/), nk = ds ? spalte(ds, /^Analysis N$/) : -1;
  const n = ds && nk >= 0 ? ds.n[ds.tabelle.headRows[0]]![nk] ?? 0 : 0;
  const km = finde(items, /^KMO and Bartlett's Test$/);
  const kw = (re: RegExp) => { const i = km ? km.t.findIndex(z => z.some(x => re.test(x))) : -1; return i >= 0 ? km!.n[i]!.at(-1) : undefined; };
  const kmo = km ? { kmo: kw(/Kaiser-Meyer-Olkin/), chi2: kw(/Approx\. Chi-Square/), df: kw(/^df$/), p: kw(/^Sig\.$/) } : undefined;
  // Eigenwerte aller Komponenten (für den Scree-Plot): erste Zahlenspalte unter „Initial Eigenvalues“, eine Zeile je Komponente.
  let eigen: number[] | undefined;
  if (tv && tv.t[0]?.some(x => /Initial Eigenvalues/.test(x))) {
    const ev = tv.t[0].findIndex(x => /Initial Eigenvalues/.test(x));
    const werte: number[] = [];
    for (let i = tv.tabelle.headRows[0]; i < tv.t.length; i++) { const v = tv.n[i]![ev]; if (v !== undefined && Number.isFinite(v)) werte.push(v); }
    if (werte.length >= 2) eigen = werte;
  }
  // Das Vorzeichen eines Faktors (einer Komponente) ist beliebig. Laden die zugeordneten Fragen überwiegend negativ, wird er umgekehrt gelesen (wie psych
  // es tut); „negativ geladen“ heißt dann nur noch: die Frage läuft gegen die anderen ihres Faktors. Die PSPP-Tabelle bleibt, wie sie ist.
  const gespiegelt: number[] = [];
  for (const f of faktoren) if (f.fragen.reduce((a, q) => a + q.ladung, 0) < 0) { gespiegelt.push(f.nr); for (const q of f.fragen) q.ladung = -q.ladung; }
  const methode: 'pc' | 'paf' = /Factor/.test(m.tabelle.label) || !!finde(items, /^Pattern Matrix$/) ? 'paf' : 'pc';
  const fk = finde(items, /^Factor Correlation Matrix$/);
  const vz = (i: number) => (gespiegelt.includes(i + 1) ? -1 : 1);
  const korrelationen = fk ? fk.n.slice(fk.tabelle.headRows[0]).map((z, i) => z.slice(1).map((v, j) => (v ?? NaN) * vz(i) * vz(j))).filter(z => z.length === spalten) : undefined;
  // Kaiser-Kriterium und Parallelanalyse aus den Eigenwerten der Korrelationsmatrix (PSPP „Initial Eigenvalues“) und n (Personen mit allen Antworten)
  const kaiser = eigen ? eigen.filter(v => v > 1).length : undefined;
  const parallel = eigen && n > eigen.length ? parallelAnalyse(eigen, n).komponenten : undefined;
  return { art: 'faktor', methode, ...(gespiegelt.length ? { gespiegelt } : {}), ...(kaiser !== undefined ? { kaiser } : {}), ...(parallel !== undefined ? { parallel } : {}), zahlGewaehlt, ...(korrelationen?.length ? { korrelationen } : {}),
    faktoren, erklaert: erklaert / 100, doppelt, ohne, ...(ausgelassen.length ? { ausgelassen } : {}), n, fragen, ...(eigen ? { eigen } : {}),
    ...(kmo && kmo.kmo !== undefined && kmo.chi2 !== undefined && kmo.df !== undefined && kmo.p !== undefined ? { kmo: kmo as NonNullable<Faktoren['kmo']> } : {}) };
}

/** PSPP 2.1.1 füllt bei Promax die Spalten „Rotation Sums of Squared Loadings“ mit −1,8·10³⁰⁸ bzw. „-Infinity“ (bei schiefwinkliger Rotation gibt es keine
 *  additiven Summen). Diese Zellen werden geleert, damit die Tabelle keine Unsinnswerte zeigt (Abschlusstest F3). Ändert `items` an Ort und Stelle. */
/** Blendet in den Ladungsmatrizen Werte mit kleinerem Betrag als `grenze` aus (wie /FORMAT=BLANK, aber erst nach dem Lesen der Zahlen). Ändert `items` an Ort und Stelle. */
export function faktorLadungenAusblenden(items: OutputItem[], grenze: number | null): OutputItem[] {
  if (grenze === null || grenze <= 0) return items;
  for (const i of items) if (i.type === 'table' && /^(Rotated )?(Component|Factor) Matrix$|^Pattern Matrix$|^Structure Matrix$/.test(i.label))
    for (const c of i.cells) if (c.r >= i.headRows[0] && c.c > 0 && c.n !== undefined && c.n !== null && Number.isFinite(c.n) && Math.abs(c.n) < grenze) { c.t = ''; delete c.n; }
  return items;
}

export function faktorTabellenBereinigen(items: OutputItem[]): OutputItem[] {
  for (const i of items) if (i.type === 'table' && i.label === 'Total Variance Explained')
    for (const c of i.cells) if (c.r >= i.headRows[0] && c.c > 0 && ((c.n !== undefined && (c.n === null || !Number.isFinite(c.n) || c.n < -1e300)) || /^(-?Infinity|\.)$/.test(c.t.trim()))) { c.t = ''; delete c.n; }
  return items;
}

export function saetzeFaktoren(e: Faktoren): Saetze {
  const m = e.faktoren.length, pr = e.doppelt.length + e.ohne.length + (e.ausgelassen?.length ?? 0);
  // T11/T45: Eine Hauptkomponentenanalyse liefert Komponenten - so heißen sie in Satz, Marke und APA-Zeile („Gruppe“ steht in Statable für Personengruppen).
  // F3 (Abschlusstest): Die Hauptachsen-Faktorenanalyse liefert Faktoren.
  const paf = e.methode === 'paf';
  const viele = (k: number) => (paf ? Lp(k, `${k} Faktor`, `${k} Faktoren`, `${k} factor`, `${k} factors`) : Lp(k, `${k} Komponente`, `${k} Komponenten`, `${k} component`, `${k} components`));
  const liste = e.faktoren.map(f => `${paf ? T('Faktor', 'Factor') : T('Komponente', 'Component')} ${f.nr}: ${f.fragen.map(q => q.ladung < 0 ? `${zitat(q.name)} (${T('negativ geladen', 'negative loading')})` : zitat(q.name)).join(', ') || '-'}.`).join(' ');
  const fragenZahl = (k: number) => Lp(k, `${k} Frage`, `${k} Fragen`, `${k} question`, `${k} questions`);
  const gruppen = e.faktoren.map(f => ({ titel: `${paf ? T('Faktor', 'Factor') : T('Komponente', 'Component')} ${f.nr} · ${fragenZahl(f.fragen.length)}`,
    eintraege: f.fragen.map(q => (q.ladung < 0 ? `${q.name} (${T('negativ geladen', 'negative loading')})` : q.name)) }));
  const doppeltSatz = !e.doppelt.length ? '' : (paf
      ? Lp(e.doppelt.length, `${aufzaehlung(e.doppelt.map(zitat))} lädt auf mehr als einem Faktor (hier dem stärksten zugeordnet).`, `${aufzaehlung(e.doppelt.map(zitat))} laden auf mehr als einem Faktor (hier dem stärksten zugeordnet).`, `${aufzaehlung(e.doppelt.map(zitat))} loads on more than one factor (assigned to the strongest here).`, `${aufzaehlung(e.doppelt.map(zitat))} load on more than one factor (assigned to the strongest here).`)
      : Lp(e.doppelt.length, `${aufzaehlung(e.doppelt.map(zitat))} lädt auf mehr als einer Komponente (hier der stärksten zugeordnet).`, `${aufzaehlung(e.doppelt.map(zitat))} laden auf mehr als einer Komponente (hier der stärksten zugeordnet).`, `${aufzaehlung(e.doppelt.map(zitat))} loads on more than one component (assigned to the strongest here).`, `${aufzaehlung(e.doppelt.map(zitat))} load on more than one component (assigned to the strongest here).`));
  const doppeltTitel = `${paf ? T('Auf mehr als einem Faktor (hier dem stärksten zugeordnet)', 'On more than one factor (assigned to the strongest here)') : T('Auf mehr als einer Komponente (hier der stärksten zugeordnet)', 'On more than one component (assigned to the strongest here)')} · ${fragenZahl(e.doppelt.length)}`;
  const extra = [
    doppeltSatz,
    e.ohne.length ? (paf
      ? Lp(e.ohne.length, `${aufzaehlung(e.ohne.map(zitat))} lädt auf keinem Faktor (alle Ladungen unter ,30).`, `${aufzaehlung(e.ohne.map(zitat))} laden auf keinem Faktor (alle Ladungen unter ,30).`, `${aufzaehlung(e.ohne.map(zitat))} loads on no factor (all loadings below .30).`, `${aufzaehlung(e.ohne.map(zitat))} load on no factor (all loadings below .30).`)
      : Lp(e.ohne.length, `${aufzaehlung(e.ohne.map(zitat))} lädt auf keiner Komponente (alle Ladungen unter ,30).`, `${aufzaehlung(e.ohne.map(zitat))} laden auf keiner Komponente (alle Ladungen unter ,30).`, `${aufzaehlung(e.ohne.map(zitat))} loads on no component (all loadings below .30).`, `${aufzaehlung(e.ohne.map(zitat))} load on no component (all loadings below .30).`)) : '',
    e.ausgelassen?.length ? Lp(e.ausgelassen.length, `${aufzaehlung(e.ausgelassen.map(zitat))} ist nicht in die Rechnung eingegangen (kaum Zusammenhang mit den anderen Fragen oder keine Streuung) - die Zahl der Fragen oben gilt ohne sie.`, `${aufzaehlung(e.ausgelassen.map(zitat))} sind nicht in die Rechnung eingegangen (kaum Zusammenhang mit den anderen Fragen oder keine Streuung) - die Zahl der Fragen oben gilt ohne sie.`, `${aufzaehlung(e.ausgelassen.map(zitat))} was left out of the calculation (hardly any relationship with the other questions, or no variation) - the number of questions above does not include it.`, `${aufzaehlung(e.ausgelassen.map(zitat))} were left out of the calculation (hardly any relationship with the other questions, or no variation) - the number of questions above does not include them.`) : ''
  ].filter(Boolean).join(' ');
  // ⚠ von der Fachperson abzunehmen: Worte zum KMO nach Kaiser (1974): ab ,90 sehr gut, ,80 gut, ,70 mittel, ,60 mäßig, ,50 schwach, darunter ungeeignet.
  const kmoWort = (k0: number, k = angezeigt(k0)) => (k >= 0.9 ? T('sehr gut', 'excellent') : k >= 0.8 ? T('gut', 'good') : k >= 0.7 ? T('mittel', 'middling') : k >= 0.6 ? T('mäßig', 'mediocre') : k >= 0.5 ? T('schwach', 'poor') : T('ungeeignet', 'unacceptable'));
  // T11: Unter ,50 („unacceptable“, Kaiser 1974) behauptet der Hauptsatz kein inhaltliches Ergebnis; ,50 bis ,59 heißt „nur knapp“.
  const ungeeignet = !!e.kmo && angezeigt(e.kmo.kmo) < 0.5, knapp = !!e.kmo && !ungeeignet && angezeigt(e.kmo.kmo) < 0.6;
  const bartlett = e.kmo ? T(`Bartlett-Test χ²(${e.kmo.df}) = ${komma(e.kmo.chi2)}, p ${pWert(e.kmo.p)}`, `Bartlett's test χ²(${e.kmo.df}) = ${komma(e.kmo.chi2)}, p ${pWert(e.kmo.p)}`) : '';
  const kmoSatz = !e.kmo ? '' : ungeeignet ? `${bartlett}. `
    : knapp ? T(`Die Daten eignen sich nur knapp für diese Analyse (KMO = ${ohneNull(e.kmo.kmo)}, ${kmoWort(e.kmo.kmo)}; ${bartlett}). `, `The data are only barely suitable for this analysis (KMO = ${ohneNull(e.kmo.kmo)}, ${kmoWort(e.kmo.kmo)}; ${bartlett}). `)
    : T(`Die Daten eignen sich für diese Analyse (KMO = ${ohneNull(e.kmo.kmo)}, ${kmoWort(e.kmo.kmo)}; ${bartlett}). `, `The data are suitable for this analysis (KMO = ${ohneNull(e.kmo.kmo)}, ${kmoWort(e.kmo.kmo)}; ${bartlett}). `);
  const erfasst = e.erklaert ? m > 1
    ? (paf ? T(`Zusammen erfassen die Faktoren ${prozent(e.erklaert)} der Unterschiede in den Antworten (gemeinsame Varianz nach der Extraktion).`, `Together the factors capture ${prozent(e.erklaert)} of the differences in the answers (common variance after extraction).`)
      : T(`Zusammen erfassen die Komponenten ${prozent(e.erklaert)} der Unterschiede in den Antworten (erklärte Varianz).`, `Together the components capture ${prozent(e.erklaert)} of the differences in the answers (explained variance).`))
    : (paf ? T(`Er erfasst ${prozent(e.erklaert)} der Unterschiede in den Antworten (gemeinsame Varianz nach der Extraktion).`, `It captures ${prozent(e.erklaert)} of the differences in the answers (common variance after extraction).`)
      : T(`Sie erfasst ${prozent(e.erklaert)} der Unterschiede in den Antworten (erklärte Varianz).`, `It captures ${prozent(e.erklaert)} of the differences in the answers (explained variance).`)) : '';
  // F3: Promax lässt die Faktoren zusammenhängen - der größte Zusammenhang steht im Satz.
  const rMax = paf && e.korrelationen && m > 1 ? groesste(e.korrelationen.flatMap((z, i) => z.filter((_, j) => j !== i).map(Math.abs))) : NaN;
  // Bei zwei Faktoren steht r mit Vorzeichen wie in der Faktor-Korrelationsmatrix (Nachttest 24.10.: der Satz zeigte ,04 bei −0,04 in der Tabelle).
  const r12 = m === 2 && e.korrelationen?.[0]?.[1] !== undefined && Number.isFinite(e.korrelationen[0][1]) ? e.korrelationen[0][1] : rMax;
  const kor = Number.isFinite(rMax) ? (angezeigt(rMax) >= 0.1
    ? (m === 2 ? T(`Die Faktoren hängen zusammen (r = ${ohneNull(r12)}).`, `The factors are correlated (r = ${ohneNull(r12)}).`) : T(`Die Faktoren hängen zusammen (r bis ${ohneNull(rMax)}).`, `The factors are correlated (r up to ${ohneNull(rMax)}).`))
    : (m === 2 ? T(`Die Faktoren hängen kaum zusammen (r = ${ohneNull(r12)}).`, `The factors are hardly correlated (r = ${ohneNull(r12)}).`) : T(`Die Faktoren hängen kaum zusammen (r bis ${ohneNull(rMax)}).`, `The factors are hardly correlated (r up to ${ohneNull(rMax)}).`))) : '';
  // F3: Parallelanalyse (Horn 1965) neben dem Kaiser-Kriterium, das die Zahl oft überschätzt (Zwick & Velicer 1986; Fabrigar et al. 1999).
  const pa = e.parallel, ka = e.kaiser;
  const zahlSatz = e.parallelAus ? T('Die Parallelanalyse rechnet mit einem Fallgewicht nicht richtig und ist daher aus.', 'The parallel analysis does not calculate correctly with a case weight and is therefore off.')
    : pa === undefined || ka === undefined ? ''
    : e.zahlGewaehlt ? T(`Gerechnet mit ${viele(e.zahlGewaehlt)} (festgelegt); die Parallelanalyse schlägt ${pa} vor, das Kaiser-Kriterium ${ka}.`, `Calculated with ${viele(e.zahlGewaehlt)} (fixed); parallel analysis suggests ${pa}, the Kaiser criterion ${ka}.`)
    : pa !== ka ? T(`Die Parallelanalyse schlägt ${viele(pa)} vor, das Kaiser-Kriterium ${ka}. Das Kaiser-Kriterium nennt oft zu viele; die Zahl lässt sich in der Auswahl festlegen.`, `Parallel analysis suggests ${viele(pa)}, the Kaiser criterion ${ka}. The Kaiser criterion often gives too many; the number can be fixed in the selection.`)
    : T(`Parallelanalyse und Kaiser-Kriterium schlagen beide ${viele(ka)} vor.`, `Parallel analysis and the Kaiser criterion both suggest ${viele(ka)}.`);
  const regel = e.zahlGewaehlt ? T('(festgelegt)', '(fixed)') : T('mit Eigenwert > 1', 'with eigenvalue > 1');
  const gs = e.gespiegelt ?? [], gn = aufzaehlung(gs.map(String));
  const spiegel = !gs.length ? '' : paf
    ? Lp(gs.length, `Faktor ${gn} lädt überwiegend negativ; weil das Vorzeichen eines Faktors beliebig ist, ist er hier umgekehrt gelesen.`, `Die Faktoren ${gn} laden überwiegend negativ; weil das Vorzeichen eines Faktors beliebig ist, sind sie hier umgekehrt gelesen.`, `Factor ${gn} loads mostly negatively; because the sign of a factor is arbitrary, it is read reversed here.`, `Factors ${gn} load mostly negatively; because the sign of a factor is arbitrary, they are read reversed here.`)
    : Lp(gs.length, `Komponente ${gn} lädt überwiegend negativ; weil das Vorzeichen einer Komponente beliebig ist, ist sie hier umgekehrt gelesen.`, `Die Komponenten ${gn} laden überwiegend negativ; weil das Vorzeichen einer Komponente beliebig ist, sind sie hier umgekehrt gelesen.`, `Component ${gn} loads mostly negatively; because the sign of a component is arbitrary, it is read reversed here.`, `Components ${gn} load mostly negatively; because the sign of a component is arbitrary, they are read reversed here.`);
  return {
    haupt: ungeeignet ? T(`Die Daten eignen sich nicht für eine Faktorenanalyse (KMO = ${ohneNull(e.kmo!.kmo)}, ${kmoWort(e.kmo!.kmo)}); die Zuordnung der Fragen unten ist nicht belastbar.`, `The data are not suitable for a factor analysis (KMO = ${ohneNull(e.kmo!.kmo)}, ${kmoWort(e.kmo!.kmo)}); the assignment of the questions below is not reliable.`)
      : paf ? (m === 1 ? T(`Die ${e.fragen} Fragen bilden einen einzigen Faktor: Sie messen im Wesentlichen etwas Gemeinsames.`, `The ${e.fragen} questions form a single factor: they essentially measure something in common.`)
        : T(`Die ${e.fragen} Fragen bilden ${m} Faktoren (Gruppen von Fragen), die jeweils etwas Gemeinsames messen.`, `The ${e.fragen} questions form ${m} factors (groups of questions) that each measure something in common.`))
      : m === 1 ? T(`Die ${e.fragen} Fragen bilden eine einzige Komponente: Sie fasst die Varianz aller Fragen zusammen.`, `The ${e.fragen} questions form a single component: it summarizes the variance of all the questions.`)
      : T(`Die ${e.fragen} Fragen bilden ${m} Komponenten (Gruppen von Fragen): Jede Komponente fasst die Varianz mehrerer Fragen zusammen.`, `The ${e.fragen} questions form ${m} components (groups of questions): each component summarizes the variance of several questions.`),
    zusatz: `${kmoSatz}${m > 1 ? liste + ' ' : ''}${erfasst}${kor ? ' ' + kor : ''}${zahlSatz ? ' ' + zahlSatz : ''}${extra ? ' ' + extra : ''}${spiegel ? ' ' + spiegel : ''}`.trim(),
    vorsicht: paf ? T('Wie ein Faktor heißt, ergibt sich aus dem Inhalt der Fragen - die Rechnung kennt nur Zahlen. Die Ladungen sind Musterladungen (Promax): der eigene Beitrag des Faktors zu einer Frage.', 'What a factor is called follows from the content of the questions - the calculation only knows numbers. The loadings are pattern loadings (promax): the factor\'s own contribution to a question.')
      : T('Wie eine Komponente heißt, ergibt sich aus dem Inhalt der Fragen - die Rechnung kennt nur Zahlen.', 'What a component is called follows from the content of the questions - the calculation only knows numbers.'),
    // Englisch: "components" (Hauptkomponentenanalyse), wie SPSS/PSPP es nennen.
    apa: (e.kmo ? `KMO = ${ohneNull(e.kmo.kmo)}, ${T('Bartlett', "Bartlett's test")} χ²(${e.kmo.df}) = ${komma(e.kmo.chi2)}, p ${pWert(e.kmo.p)}; ` : '')
      + (paf ? T(`Hauptachsenanalyse mit Promax-Rotation (κ = 4): ${viele(m)} ${regel}${e.erklaert ? L(`, zusammen ${prozent1(e.erklaert)} Varianz`, `, ${prozent1(e.erklaert)} of variance in total`) : ''}${e.n ? ` (n = ${e.n})` : ''}`,
        `Principal axis factoring with promax rotation (κ = 4): ${viele(m)} ${regel}${e.erklaert ? L(`, zusammen ${prozent1(e.erklaert)} Varianz`, `, ${prozent1(e.erklaert)} of variance in total`) : ''}${e.n ? ` (n = ${e.n})` : ''}`)
        : T(`Hauptkomponentenanalyse mit Varimax-Rotation: ${viele(m)} ${regel}${e.erklaert ? L(`, zusammen ${prozent1(e.erklaert)} Varianz`, `, ${prozent1(e.erklaert)} of variance in total`) : ''}${e.n ? ` (n = ${e.n})` : ''}`,
        `Principal component analysis with varimax rotation: ${viele(m)} ${regel}${e.erklaert ? L(`, zusammen ${prozent1(e.erklaert)} Varianz`, `, ${prozent1(e.erklaert)} of variance in total`) : ''}${e.n ? ` (n = ${e.n})` : ''}`))
      + (pa !== undefined && ka !== undefined ? T(`; Parallelanalyse: ${pa}, Kaiser-Kriterium: ${ka}`, `; parallel analysis: ${pa}, Kaiser criterion: ${ka}`) : ''),
    marken: [
      { text: T(`${viele(m)} · ${prozent(e.erklaert)} erklärt`, `${viele(m)} · ${prozent(e.erklaert)} explained`), erklaer: 'faktorenanalyse' },
      ...(pa !== undefined ? [{ text: T(`Parallelanalyse: ${pa}`, `Parallel analysis: ${pa}`), erklaer: 'eigenwert-rotation', ...(pa !== m ? { hinweis: true } : {}) }] : []),
      ...(e.kmo ? [{ text: `KMO = ${ohneNull(e.kmo.kmo)} · ${kmoWort(e.kmo.kmo)}`, erklaer: 'faktorenanalyse', ...(e.kmo.kmo < 0.6 ? { hinweis: true } : {}) }] : []),
      ...(pr ? [{ text: Lp(pr, `${pr} Frage prüfen`, `${pr} Fragen prüfen`, `Check ${pr} question`, `Check ${pr} questions`), erklaer: 'faktorenanalyse', hinweis: true }] : []),
      ...(e.n ? [{ text: T(`${e.n} Personen mit allen Antworten`, `${e.n} people with all answers`), erklaer: 'stichprobe' }] : [])
    ],
    listen: [...(m > 1 ? [{ text: liste, titel: `${paf ? T('Welche Fragen zu welchem Faktor gehören', 'Which questions belong to which factor') : T('Welche Fragen zu welcher Komponente gehören', 'Which questions belong to which component')} · ${fragenZahl(e.faktoren.reduce((a, f) => a + f.fragen.length, 0))}`, gruppen }] : []),
      ...(doppeltSatz ? [{ text: doppeltSatz, titel: doppeltTitel, gruppen: [{ eintraege: e.doppelt }] }] : [])]
  };
}

/* ---------- Kreuztabelle mit Chi-Quadrat (Test 07.10.: bisher ohne Sätze) ----------
 * ⚠ Faustregeln fachlich abnehmen lassen: Cramérs V nach Cohen (1988) über w = V·√(min(r, c) − 1);
 *   erwartete Häufigkeiten unter 5 in mehr als 20 % der Zellen oder unter 1 → Test ungenau (Cochran 1954). */
export interface KreuzGruppe { name: string; n: number; haeufigst: string; anteil: number; gleichauf: string[] }
export interface Kreuz {
  art: 'kreuz'; gezaehlt: string; gruppen: string; chi2: number; df: number; p: number; n: number; v: number; stufen: number;
  unter5: number; zellen: number; minErwartet: number; fisherP?: number; je: KreuzGruppe[];
  /** Gezählte Personen: Zeilen = Gruppen (`gruppen`), Spalten = Antworten (`gezaehlt`), in der Reihenfolge der PSPP-Tabelle; fehlt in alten Projektdateien. */
  zaehlung?: { zeilen: string[]; spalten: string[]; tab: number[][] }
  /** Nur bei 2 × 2: die Tabelle wird als Test gegen einen Referenzstandard gelesen (Sensitivität, Spezifität …). Fehlt = nicht gewählt. */
  diagnose?: DiagnoseWahl;
  /** Nur bei 2 × 2: Rollen für die Risikomaße (Risikodifferenz, relatives Risiko, NNT; Welle 7, M2). Fehlt = nicht gewählt. */
  risiko?: import('./risikosaetze').RisikoWahl;
  /** Studiendesign aus „Weitere Wege“: bei der Fall-Kontroll-Studie ist nur das Odds Ratio zulässig. Fehlt = Kohorte oder Experiment. */
  studie?: 'fallKontrolle';
  /** Später S-B, M5: Stärke des Zusammenhangs (Gamma, Tau, Somers d, Lambda, UC); fehlt = nicht gewählt. Rechnen: zusammenhangsmasse.ts, Sätze: massesaetze.ts. */
  masse?: import('./massesaetze').MasseDaten;
  /** Später S-B, M3: Aufteilung nach einer Schichtvariable (Mantel-Haenszel); fehlt = nicht gewählt. Rechnen: mantelhaenszel.ts, Sätze: schichtsaetze.ts. */
  schicht?: import('./schichtsaetze').SchichtDaten;
}

/** Die diagnostische Güte, wenn die Kreuztabelle 2 × 2 ist und die Wahl getroffen wurde; sonst `null`. */
export function diagnoseVon(e: Kreuz): { d: Diagnose; refName: string; testName: string; refPositiv: string; testPositiv: string } | null {
  const z = e.zaehlung, w = e.diagnose;
  if (!z || !w || z.tab.length !== 2 || z.spalten.length !== 2) return null;
  const [rp, fp, fn, rn] = vierfelder(z.tab, w);
  const zeilenRef = w.ref === 'zeilen';
  return { d: diagnose(rp, fp, fn, rn), refName: zeilenRef ? e.gruppen : e.gezaehlt, testName: zeilenRef ? e.gezaehlt : e.gruppen,
    refPositiv: (zeilenRef ? z.zeilen : z.spalten)[w.refPos]!, testPositiv: (zeilenRef ? z.spalten : z.zeilen)[w.testPos]! };
}

export function kreuz(items: OutputItem[]): Kreuz {
  const it = items.find((i): i is import('../engine/types').TableItem => i.type === 'table' && i.cells.some(c => c.x && c.t === 'Expected'));
  const cs = finde(items, /^Chi-Square Tests$/);
  if (!it || !cs) throw new Error('Kreuztabelle fehlt');
  const t = finde([it], /./)!;
  const daten = it.headCols[0] + it.headCols[1], gesamt = it.cols - 1, kopf = it.headRows[0];
  const art = it.headCols[0] - 1;   // Spalte mit „Count“ / „Expected“ / „Row %“
  const zeile = (gruppe: string, was: string) => t.t.findIndex((z, i) => i >= kopf && z[0] !== 'Total' && z[1] === gruppe && z[art] === was);
  const namen = [...new Set(t.t.slice(kopf).filter(z => z[0] !== 'Total' && z[art] === 'Count').map(z => z[1]!))];
  let unter5 = 0, zellen = 0, minErwartet = Infinity;
  const tab: number[][] = [];
  const je: KreuzGruppe[] = namen.map(name => {
    const a = t.n[zeile(name, 'Count')]!, e = t.n[zeile(name, 'Expected')];
    tab.push(a.slice(daten, gesamt).map(v => v ?? 0));
    let best = daten;
    for (let k = daten; k < gesamt; k++) {
      if ((a[k] ?? 0) > (a[best] ?? 0)) best = k;
      const w = e?.[k]; if (w !== undefined) { zellen++; if (w < 5) unter5++; minErwartet = Math.min(minErwartet, w); }
    }
    const n = zahl(a[gesamt]);
    const gleichauf: string[] = [];
    for (let k = daten; k < gesamt; k++) if ((a[k] ?? 0) === (a[best] ?? 0)) gleichauf.push(wertName(t.t[kopf - 1]![k]!));
    return { name: wertName(name), n, haeufigst: wertName(t.t[kopf - 1]![best]!), anteil: n ? (a[best] ?? 0) / n : 0, gleichauf };
  });
  const pe = cs.t.findIndex(z => z[0] === 'Pearson Chi-Square'), nz = cs.t.findIndex(z => z[0] === 'N of Valid Cases'), fi = cs.t.findIndex(z => z[0] === "Fisher's Exact Test");
  const k = { v: spalte(cs, /^Value$/), df: spalte(cs, /^df$/), p: spalte(cs, /^Asymptotic Sig\./), f: spalte(cs, /^Exact Sig\. \(2-tailed\)$/) };
  // Nur eine besetzte Zeile oder Spalte: PSPP gibt keinen Chi-Quadrat-Test aus (nur „N der gültigen Fälle“). Das Ergebnis bleibt lesbar (df = 0), die Sätze sagen es (saetzeKreuz).
  const ohneTest = pe < 0 && nz >= 0;
  const chi2 = ohneTest ? 0 : zahl(cs.n[pe]![k.v]), n = zahl(cs.n[nz]![k.v]), stufen = Math.min(namen.length, gesamt - daten) - 1;
  const fisherP = fi >= 0 && k.f >= 0 ? cs.n[fi]![k.f] : undefined;
  return {
    art: 'kreuz', gezaehlt: t.t[0]![daten] ?? '', gruppen: t.t[kopf]![0] ?? '', chi2, df: ohneTest ? 0 : zahl(cs.n[pe]![k.df]), p: ohneTest ? 1 : zahl(cs.n[pe]![k.p]), n,
    v: stufen > 0 && n ? Math.sqrt(chi2 / (n * stufen)) : 0, stufen, unter5, zellen, minErwartet: Number.isFinite(minErwartet) ? minErwartet : 0, ...(fisherP !== undefined ? { fisherP } : {}), je,
    zaehlung: { zeilen: namen.map(wertName), spalten: t.t[kopf - 1]!.slice(daten, gesamt).map(wertName), tab }
  };
}

/** Der Teil `/CELLS=…` des CROSSTABS-Befehls. Ohne Angabe wie bisher (Anzahl, Zeilenprozent, Erwartet); Später S-C: mit `basen` kommen Spalten- und Gesamtprozent dazu (die Zeilenprozente nur, wenn 'zeile' dabei ist). */
export function kreuzZellenSyntax(basen?: ('zeile' | 'spalte' | 'gesamt')[]): string {
  if (!basen) return '/CELLS=COUNT ROW EXPECTED.';
  return `/CELLS=COUNT${basen.includes('zeile') ? ' ROW' : ''}${basen.includes('spalte') ? ' COLUMN' : ''}${basen.includes('gesamt') ? ' TOTAL' : ''} EXPECTED.`;
}
/** Die Prozente einer Kreuztabelle aus PSPPs Ausgabe, gelesen NACH BESCHRIFTUNG („Count“, „Row %“, „Column %“, „Total %“), nie nach der Position der Zeile.
 *  Prozente 0 bis 100. Die Randzellen (Spalte und Zeile „Total“) und die „Expected“-Zahlen werden nie gelesen: PSPP gibt dort unbrauchbare Zahlen (0,4167 statt 5).
 *  Eine nicht angeforderte Art bleibt eine leere Liste. */
export function kreuzProzente(items: OutputItem[]): { zeilen: string[]; spalten: string[]; n: number[][]; zeile: number[][]; spalte: number[][]; gesamt: number[][] } {
  const it = items.find((i): i is TableItem => i.type === 'table' && i.cells.some(c => c.x && c.t === 'Count'));
  if (!it) throw new Error('Kreuztabelle fehlt');
  const t = raster(it), daten = it.headCols[0] + it.headCols[1], gesamt = it.cols - 1, kopf = it.headRows[0], art = it.headCols[0] - 1;
  const mitte = (z: string[]) => z[0] !== 'Total';
  const namen = [...new Set(t.t.slice(kopf).filter(z => mitte(z) && z[art] === 'Count').map(z => z[1]!))];
  const lies = (was: string): number[][] => {
    if (!t.t.some((z, i) => i >= kopf && mitte(z) && z[art] === was)) return [];
    return namen.map(name => { const i = t.t.findIndex((z, r) => r >= kopf && mitte(z) && z[1] === name && z[art] === was); return t.n[i]!.slice(daten, gesamt).map(v => v ?? 0); });
  };
  return {
    zeilen: namen.map(wertName), spalten: t.t[kopf - 1]!.slice(daten, gesamt).map(wertName),
    n: lies('Count'), zeile: lies('Row %'), spalte: lies('Column %'), gesamt: lies('Total %')
  };
}

/** Cramérs V in Worten: Cohens Grenzen für w (,10 / ,30 / ,50), umgerechnet auf die Größe der Tabelle. */
export function vWort(v: number, stufen: number): string {
  const w = angezeigt(v) * Math.sqrt(Math.max(1, stufen));
  return w < 0.1 ? L('sehr schwach', 'very weak') : w < 0.3 ? L('schwach', 'weak') : w < 0.5 ? L('mittel', 'moderate') : L('stark', 'strong');
}
const prozent1 = (v: number) => proz(komma(v * 100, 1));


const lrT = (x: number) => (x === Infinity ? '∞' : Number.isFinite(x) ? komma(x) : '-');
const lrKi = (q: { wert: number; lo: number; hi: number }) => (Number.isFinite(q.lo) ? `, ${ki(lrT(q.lo), lrT(q.hi))}` : '');
/** Sätze zur diagnostischen Güte (2 × 2, Test gegen Referenzstandard). Anteile mit Wilson-Intervall, LR mit Log-Intervall (lib/diagnostik.ts).
 *  ⚠ Satzvorlagen und die Worte zu den Likelihood-Quotienten (Jaeschke et al. 1994) von der Fachperson abzunehmen. */
function diagnoseSatz(g: NonNullable<ReturnType<typeof diagnoseVon>>): { zusatz: string; vorsicht: string; apa: string; marken: Saetze['marken'] } {
  const { d } = g, q = (x: string) => anfuehrung(kurz(x));
  const pr = (a: { wert: number }) => prozent(a.wert), prKi = (a: { lo: number; hi: number }) => ki(prozent(a.lo as number), prozent(a.hi as number)).replace(/\u00a0/g, ' ');
  const ap = (a: { wert: number; lo: number; hi: number }) => `${ohneNull(a.wert)}, ${ki(ohneNull(a.lo), ohneNull(a.hi))}`;
  const wortP = lrPlusWort(d.lrPlus.wert), wortM = lrMinusWort(d.lrMinus.wert);
  const kopf = T(`Gelesen als Test gegen einen Referenzstandard (Referenz: ${q(g.refName)}, positiv = ${q(g.refPositiv)}; Test: ${q(g.testName)}, positiv = ${q(g.testPositiv)}):`,
    `Read as a test against a reference standard (reference: ${q(g.refName)}, positive = ${q(g.refPositiv)}; test: ${q(g.testName)}, positive = ${q(g.testPositiv)}):`);
  const guete = T(`Sensitivität ${pr(d.se)} (${prKi(d.se)}; ${d.rp} von ${d.rp + d.fn} Positiven werden erkannt), Spezifität ${pr(d.sp)} (${prKi(d.sp)}; ${d.rn} von ${d.rn + d.fp} Negativen werden erkannt). Von den positiv Getesteten sind ${pr(d.ppv)} tatsächlich positiv (positiver Vorhersagewert, ${prKi(d.ppv)}), von den negativ Getesteten ${pr(d.npv)} tatsächlich negativ (negativer Vorhersagewert, ${prKi(d.npv)}). Die Genauigkeit liegt bei ${pr(d.genauigkeit)}.`,
    `Sensitivity ${pr(d.se)} (${prKi(d.se)}; ${d.rp} of ${d.rp + d.fn} positives are detected), specificity ${pr(d.sp)} (${prKi(d.sp)}; ${d.rn} of ${d.rn + d.fp} negatives are detected). Of those testing positive, ${pr(d.ppv)} are truly positive (positive predictive value, ${prKi(d.ppv)}); of those testing negative, ${pr(d.npv)} are truly negative (negative predictive value, ${prKi(d.npv)}). Accuracy is ${pr(d.genauigkeit)}.`);
  const lr = Number.isFinite(d.lrPlus.wert) && Number.isFinite(d.lrMinus.wert)
    ? T(` Likelihood-Quotienten: LR+ = ${lrT(d.lrPlus.wert)}${lrKi(d.lrPlus)} (${wortP} Verschiebung zugunsten „positiv“), LR− = ${lrT(d.lrMinus.wert)}${lrKi(d.lrMinus)} (${wortM} Verschiebung zugunsten „negativ“; Einordnung nach Jaeschke et al., 1994).`,
      ` Likelihood ratios: LR+ = ${lrT(d.lrPlus.wert)}${lrKi(d.lrPlus)} (${wortP} shift towards "positive"), LR− = ${lrT(d.lrMinus.wert)}${lrKi(d.lrMinus)} (${wortM} shift towards "negative"; classification according to Jaeschke et al., 1994).`)
    : T(` Likelihood-Quotienten: LR+ = ${lrT(d.lrPlus.wert)}, LR− = ${lrT(d.lrMinus.wert)} (bei einer leeren Zelle ohne Intervall).`, ` Likelihood ratios: LR+ = ${lrT(d.lrPlus.wert)}, LR− = ${lrT(d.lrMinus.wert)} (no interval with an empty cell).`);
  const wenig = d.rp + d.fn < 10 || d.fp + d.rn < 10;
  return {
    zusatz: `${kopf} ${guete}${lr}`,
    vorsicht: T(`Die Vorhersagewerte gelten nur bei der Häufigkeit der Referenz in dieser Stichprobe (${prozent(d.praevalenz.wert)}); ist sie in der Praxis anders, ändern sie sich, Sensitivität und Spezifität nicht.`, `The predictive values only hold for the prevalence of the reference in this sample (${prozent(d.praevalenz.wert)}); if it differs in practice they change, sensitivity and specificity do not.`)
      + (wenig ? T(` Es gibt weniger als 10 Personen ${d.rp + d.fn < 10 ? L('mit positiver', 'with a positive') : L('mit negativer', 'with a negative')} Referenz - die Intervalle sind breit.`, ` There are fewer than 10 people ${d.rp + d.fn < 10 ? L('mit positiver', 'with a positive') : L('mit negativer', 'with a negative')} reference - the intervals are wide.`) : ''),
    apa: `${T('Sensitivität', 'sensitivity')} = ${ap(d.se)}; ${T('Spezifität', 'specificity')} = ${ap(d.sp)}; PPV = ${ap(d.ppv)}; NPV = ${ap(d.npv)}; LR+ = ${lrT(d.lrPlus.wert)}${lrKi(d.lrPlus)}; LR− = ${lrT(d.lrMinus.wert)}${lrKi(d.lrMinus)}`,
    marken: [
      { text: `${T('Sensitivität', 'Sensitivity')} ${pr(d.se)}`, erklaer: 'sensitivitaet' },
      { text: `${T('Spezifität', 'Specificity')} ${pr(d.sp)}`, erklaer: 'spezifitaet' },
      { text: `PPV ${pr(d.ppv)} · NPV ${pr(d.npv)}`, erklaer: 'vorhersagewert' }
    ]
  };
}

/** Werden in zu vielen Zellen weniger als 5 Personen erwartet (Cochran 1954), ist der χ²-Test ungenau. */
export const kreuzUngenau = (e: Kreuz) => e.zellen > 0 && (e.unter5 / e.zellen > 0.2 || e.minErwartet < 1);
/** Der p-Wert, der gilt: bei ungenauem χ²-Test und vorhandenem exaktem Test der nach Fisher (Abschlusstest T1; Cochran 1954; Field 2018, Kap. 19), sonst der χ²-Test. */
export function kreuzHauptP(e: Kreuz): { p: number; fisher: boolean } {
  return kreuzUngenau(e) && e.fisherP !== undefined ? { p: e.fisherP, fisher: true } : { p: e.p, fisher: false };
}

export function saetzeKreuz(e: Kreuz): Saetze {
  // Ohne Chi-Quadrat-Test (nur eine besetzte Zeile oder Spalte): kein Vergleich möglich, kein Satz mit Zahlen
  if (e.df === 0) return { haupt: T('Die Tabelle hat nur eine Zeile oder Spalte mit Fällen: Ein Vergleich der Gruppen ist nicht möglich.', 'The table has only one row or column with cases: a comparison of the groups is not possible.'), zusatz: '', vorsicht: '', apa: '', marken: [] };
  const hp = kreuzHauptP(e);
  const was = zitat(e.gezaehlt), grp = zitat(e.gruppen), sig = hp.p < 0.05, wort = vWort(e.v, e.stufen), v = ohneNull(e.v);
  // Im Satz steht der p-Wert, der gilt; bei Fisher mit Namen.
  const pSatz = hp.fisher ? T(`exakter Test nach Fisher, p ${pWert(hp.p)}`, `Fisher's exact test, p ${pWert(hp.p)}`) : `p ${pWert(e.p)}`;
  // Cramérs V mit 95-%-Bereich (nichtzentrales χ²; wie R effectsize::cramers_v(adjust = FALSE, alternative = "two.sided")). Bei 2 × 2 Feldern zusätzlich Odds Ratio mit Wald-Bereich.
  // Liegt V außerhalb seines (an 0 gestutzten) Bereichs (sehr kleines χ²), nur den Punktwert zeigen - SPSS/JASP zeigen für V kein KI (ENTSCHEIDUNGEN-NACH-PROFIPROGRAMMEN Nr. 24).
  const [vLo, vHi] = vBereich(e.chi2, e.df, e.n, e.stufen), vKiZeigen = e.v >= vLo && e.v <= vHi, kiV = vKiZeigen ? ', ' + ki(ohneNull(vLo), ohneNull(vHi)) : '';
  const z = e.zaehlung, orr = z && z.tab.length === 2 && z.spalten.length === 2 && !e.risiko && !e.studie ? oddsRatio2x2(z.tab) : null;   // mit gewählten Rollen oder Fall-Kontroll-Design steht genau ein OR: das der Risikomaße (risikosaetze.ts)
  const q = (x: string) => anfuehrung(kurz(x));
  // Gleichstand der häufigsten Antworten: „„0“ und „1“ gleich oft (je 50 %)“ (Prüfrunde 07.10., Befund D2).
  const oben = (g: KreuzGruppe) => (g.gleichauf?.length ?? 1) > 1 ? aufzaehlung(g.gleichauf.map(q)) : q(g.haeufigst);
  const gleich = e.je.length > 1 && e.je.every(g => (g.gleichauf?.length ?? 1) <= 1 && g.haeufigst === e.je[0]!.haeufigst);
  const spitzen = aufzaehlung(e.je.map(g => (g.gleichauf?.length ?? 1) > 1
    ? T(`in der Gruppe ${q(g.name)} ${oben(g)} gleich oft (je ${prozent(g.anteil)})`, `${oben(g)} equally often in the group ${q(g.name)} (${prozent(g.anteil)} each)`)
    : T(`in der Gruppe ${q(g.name)} ${q(g.haeufigst)} (${prozent(g.anteil)})`, `${q(g.haeufigst)} in the group ${q(g.name)} (${prozent(g.anteil)})`)));
  const haupt = gleich
    ? T(`In ${e.je.length === 2 ? L('beiden', 'both') : L(`allen ${e.je.length}`, `all ${e.je.length}`)} Gruppen von ${grp} ist bei ${was} ${q(e.je[0]!.haeufigst)} am häufigsten (${aufzaehlung(e.je.map(g => prozent(g.anteil)))}).`,
      `In ${e.je.length === 2 ? L('beiden', 'both') : L(`allen ${e.je.length}`, `all ${e.je.length}`)} groups of ${grp}, ${q(e.je[0]!.haeufigst)} is the most common answer to ${was} (${aufzaehlung(e.je.map(g => prozent(g.anteil)))}).`)
    : e.je.length <= 4
    ? T(`Am häufigsten ist bei ${was} ${spitzen}.`,
      `The most common answer to ${was} is ${spitzen}.`)
    : T(`Die Tabelle zeigt, wie oft jede Antwort bei ${was} in den ${e.je.length} Gruppen von ${grp} vorkommt.`, `The table shows how often each answer to ${was} occurs in the ${e.je.length} groups of ${grp}.`);
  const zusatz = sig
    ? T(`Die Gruppen unterscheiden sich darin; der Zusammenhang ist ${wort} (Cramérs V = ${v}${kiV}, nach üblicher Faustregel). Ein mindestens so großer Unterschied wäre selten, wenn es in Wahrheit keinen gäbe (${pSatz}).`,
      `The groups differ in this; the relationship is ${wort} (Cramér's V = ${v}${kiV}, by a common rule of thumb). A difference at least this large would be rare if there were truly none (${pSatz}).`)
    : T(`Die Unterschiede zwischen den Gruppen sind ${wort} (Cramérs V = ${v}${kiV}) und kommen auch ohne echten Zusammenhang nicht selten vor (${pSatz}). Die Daten belegen darum keinen Unterschied - das heißt nicht, dass es keinen gibt.`,
      `The differences between the groups are ${wort} (Cramér's V = ${v}${kiV}) and are not unusual even without a real relationship (${pSatz}). So the data do not show a difference - that does not mean there is none.`);
  // 2 × 2: V ist dort gleich φ. ⚠ Satz-Vorlage von der Fachperson abzunehmen.
  const orSatz = !orr || !z ? '' : T(` Bei zwei mal zwei Feldern ist V gleich φ. Das Odds Ratio ist ${komma(orr.or)}, ${ki(komma(orr.lo), komma(orr.hi))}: die Chance (Odds) für ${q(z.spalten[0]!)} statt ${q(z.spalten[1]!)} in der Gruppe ${q(z.zeilen[0]!)} im Vergleich zur Gruppe ${q(z.zeilen[1]!)}.`,
    ` With a 2 × 2 table, V equals φ. The odds ratio is ${komma(orr.or)}, ${ki(komma(orr.lo), komma(orr.hi))}: the odds of ${q(z.spalten[0]!)} rather than ${q(z.spalten[1]!)} in the group ${q(z.zeilen[0]!)} compared with the group ${q(z.zeilen[1]!)}.`);
  const ungenau = kreuzUngenau(e);
  const warnung = !ungenau ? '' : hp.fisher
    ? T(` Achtung: In ${e.unter5} von ${e.zellen} Zellen werden weniger als 5 Personen erwartet. Der Chi-Quadrat-Test ist dann ungenau; darum gilt hier der exakte Test nach Fisher (Chi-Quadrat zum Vergleich: p ${pWert(e.p)}).`,
      ` Note: in ${e.unter5} of ${e.zellen} cells, fewer than 5 people are expected. The chi-square test is then inaccurate, so Fisher's exact test is used here (chi-square for comparison: p ${pWert(e.p)}).`)
    : T(` Achtung: In ${e.unter5} von ${e.zellen} Zellen werden weniger als 5 Personen erwartet. Dann ist der Chi-Quadrat-Test ungenau (Faustregel: höchstens jede fünfte Zelle unter 5).`,
      ` Note: in ${e.unter5} of ${e.zellen} cells, fewer than 5 people are expected. The chi-square test is then inaccurate (rule of thumb: at most one cell in five below 5).`)
      + T(' Abhilfe: seltene Antworten zu einer Gruppe zusammenfassen.', ' Remedy: combine rare answers into one group.');
  const dg = diagnoseVon(e), dgS = dg ? diagnoseSatz(dg) : null;
  return {
    haupt, zusatz: zusatz + orSatz + warnung + (dgS ? ' ' + dgS.zusatz : ''),
    vorsicht: T('Ein Zusammenhang ist keine Ursache.', 'A relationship is not a cause.') + (dgS ? ' ' + dgS.vorsicht : ''),
    apa: `χ²(${e.df}, N = ${e.n}) = ${komma(e.chi2)}, p ${pWert(e.p)}, V = ${v}${kiV}` + (orr ? `; OR = ${komma(orr.or)}, ${ki(komma(orr.lo), komma(orr.hi))}` : '')
      + (hp.fisher ? `; ${T(`exakter Fisher-Test: p ${pWert(hp.p)}`, `Fisher's exact test: p ${pWert(hp.p)}`)}` : '') + (dgS ? '; ' + dgS.apa : ''),
    marken: [
      { text: `${T('Zusammenhang', 'Relationship')}: ${wort} · V = ${v}`, erklaer: 'effektstaerke' },
      { text: `p ${pWert(hp.p)}${hp.fisher ? ' (Fisher)' : ''}${unter05(sig)}`, erklaer: 'p-wert' },
      ...(vKiZeigen ? [{ text: T(`Plausibler Bereich für V: ${ohneNull(vLo)} bis ${ohneNull(vHi)}`, `Plausible range for V: ${ohneNull(vLo)} to ${ohneNull(vHi)}`), erklaer: 'konfidenzintervall' }] : []),
      ...(orr ? [{ text: T(`Odds Ratio = ${komma(orr.or)}`, `Odds Ratio = ${komma(orr.or)}`), erklaer: 'odds-ratio' }] : []),
      ...(ungenau ? [{ text: T(`${e.unter5} von ${e.zellen} Zellen: unter 5 erwartet`, `${e.unter5} of ${e.zellen} cells: below 5 expected`), erklaer: 'chi-quadrat', hinweis: true }] : []),
      ...(dgS?.marken ?? []),
      { text: Lp(e.n, `${e.n} Person mit beiden Angaben`, `${e.n} Personen mit beiden Angaben`, `${e.n} person with both answers`, `${e.n} people with both answers`), erklaer: 'stichprobe' }
    ]
  };
}

/* ---------- Verteilung: Kennzahlen (DESCRIPTIVES) und Häufigkeiten (FREQUENCIES) ---------- */
export interface Kennzahl { name: string; n: number; m: number; sd: number; min: number; max: number;
  /** Median, Quartile, Schiefe und Wölbung (Exzess) aus PSPP FREQUENCIES (Prüfung A8); fehlen bei DESCRIPTIVES und in alten Projektdateien. */
  median?: number; q1?: number; q3?: number; schiefe?: number; kurtosis?: number;
  /** Nachkommastellen, mit denen PSPP Median und Quartile in der Tabelle schreibt (Spaltenformat): der Satz nennt dieselben Stellen (Abschlusstest B7). */
  qStellen?: number;
  /** Shapiro-Wilk-Test auf Normalverteilung (eigener Code, normalitaet.ts); fehlt bei gestuften Spalten, über 5000 Werten und in alten Projektdateien. */
  sw?: { w: number; p: number; n: number };
  /** Lilliefors-Test (Welle 7, T1; lib/anpassung.ts): Kolmogorov-Smirnov mit geschätztem Mittelwert und SD; gilt für dieselben Spalten wie `sw`. Fehlt in alten Projektdateien. */
  lil?: { d: number; p: number; n: number };
  /** Gestufte Zahlenspalte (Likert, höchstens 12 Werte): steht zusätzlich als Häufigkeit in `gruppen`; kein Histogramm. */
  stufen?: boolean;
  /** Welle S-B: 5 %-getrimmtes Mittel genau wie SPSS und PSPP (anteilig, mit Häufigkeitsgewicht; lib/robust.ts); fehlt in alten Projektdateien und bei Umfragegewicht. */
  getrimmt?: number }
/** Ab dieser Schiefe (Betrag) nennen Sätze den Median und die Quartile statt des Mittelwerts. ⚠ Schwelle von der Fachperson abzunehmen. */
export const SCHIEFE_SCHWELLE = 1;
export interface Haeufigkeit { name: string; n: number; fehlend: number; werte: { name: string; anzahl: number; anteil: number }[];
  /** Welle 7: Kategorien (Text, Wertebeschriftungen, Messniveau nominal oder ordinal) - nur für diese gibt es den χ²-Anpassungstest; `false` bei einer metrischen Zahlenspalte mit wenigen Werten; fehlt in alten Projektdateien (dann gilt: Kategorien). */ kategorie?: boolean }
export interface Verteilung { art: 'verteilung'; zahlen: Kennzahl[]; gruppen: Haeufigkeit[];
  /** Mehrfachantworten-Sets in diesem Blatt (Statable rechnet sie selbst, lib/mehrfach.ts); fehlt in alten Projekten. */
  mehrfach?: import('./mehrfach').Mehrfach[];
  /** Eigene erwartete Anteile für den χ²-Anpassungstest (Welle 7, T1): je Häufigkeitstabelle (nach Namen) ein Text je Kategorie in der Reihenfolge der Tabelle. Fehlt = Gleichverteilung. */
  anteile?: Record<string, string[]>;
  /** Je Häufigkeitstabelle: Die festgelegten Anteile wurden geändert, nachdem schon ein Ergebnis mit eigenen Anteilen da war - das p gilt dann nicht mehr als Test einer vorab festgelegten Annahme. */
  anteileGeaendert?: Record<string, boolean>;
  /** t-Test bei einer Stichprobe (Nachttest 24.10.): je Zahlenspalte (nach Namen) der vorab festgelegte Vergleichswert; fehlt = kein Test (lib/einstichprobe.ts). */
  testwerte?: Record<string, number>;
  /** Kurs-Tests (25.10.2026, lib/kurstests.ts): je Häufigkeitstabelle (nach Namen) die geprüfte Kategorie und ihr vorab festgelegter Anteil; je Zahlenspalte die vorab festgelegte Standardabweichung. */
  anteilTests?: Record<string, { kategorie: string; p0: number }>;
  sigmaWerte?: Record<string, number>;
  /** Welle S-B, „Wie vielfältig?“: Wahl je Häufigkeitstabelle (nach Namen) - nur die besetzten Kategorien zählen (statt aller möglichen Antworten) - und ob „Weitere Zahlen“ in Tabelle und Bericht stehen. */
  vielfalt?: { nurBesetzte?: Record<string, boolean>; mehr?: boolean } }

export function verteilung(items: OutputItem[]): Verteilung {
  const zahlen: Kennzahl[] = [], gruppen: Haeufigkeit[] = [];
  const ds = finde(items, /^Descriptive Statistics$/);
  if (ds) {
    const k = { n: spalte(ds, /^N$/), m: spalte(ds, /^Mean$/), sd: spalte(ds, /^Std Dev/), min: spalte(ds, /^Minimum$/), max: spalte(ds, /^Maximum$/) };
    for (let i = ds.tabelle.headRows[0]; i < ds.t.length; i++) {
      const name = ds.t[i]![0] ?? ''; if (!name || /^(Valid|Missing) N/.test(name) || ds.n[i]![k.m] === undefined) continue;
      zahlen.push({ name, n: zahl(ds.n[i]![k.n]), m: zahl(ds.n[i]![k.m]), sd: zahl(ds.n[i]![k.sd]), min: zahl(ds.n[i]![k.min]), max: zahl(ds.n[i]![k.max]) });
    }
  }
  // FREQUENCIES … /STATISTICS: Tabelle „Statistics“, Kennzahlen in den Zeilen, je Spalte eine Variable (Median, Quartile, Schiefe, Wölbung).
  for (const it of items) {
    if (it.type !== 'table' || !/^Statistics$/.test(it.label)) continue;
    const r = raster(it), kopf = it.headRows[0] - 1, ab = it.headCols[0];
    const zeile = (f: (a: string, b: string) => boolean) => r.t.findIndex((x, i) => i >= it.headRows[0] && f(x[0]!, x[1]!));
    const iN = zeile((a, b) => a === 'N' && b === 'Valid'), iM = zeile(a => a === 'Mean'), iSd = zeile(a => /^Std Dev/.test(a)), iMin = zeile(a => a === 'Minimum'), iMax = zeile(a => a === 'Maximum');
    const iMd = zeile(a => a === 'Median'), iSk = zeile(a => a === 'Skewness'), iKu = zeile(a => a === 'Kurtosis');
    const iP = (p: number) => zeile((a, b) => a === 'Percentiles' && b !== '' && Number(b) === p);
    if (iN < 0 || iM < 0 || iSd < 0 || iMin < 0 || iMax < 0) continue;
    const i25 = iP(25), i50 = iP(50), i75 = iP(75);
    for (let k = ab; k < it.cols; k++) {
      const wert = (i: number) => (i >= 0 ? r.n[i]![k] : undefined);
      if (wert(iM) === undefined) continue;
      const z: Kennzahl = { name: r.t[kopf]![k]!, n: zahl(wert(iN)), m: zahl(wert(iM)), sd: zahl(wert(iSd)), min: zahl(wert(iMin)), max: zahl(wert(iMax)) };
      const md = wert(iMd) ?? wert(i50), q1 = wert(i25), q3 = wert(i75), sk = wert(iSk), ku = wert(iKu);
      if (md !== undefined) z.median = md;
      if (q1 !== undefined) z.q1 = q1;
      if (q3 !== undefined) z.q3 = q3;
      const stellenVon = (i: number) => (i >= 0 ? (/[.,](\d+)\s*$/.exec(r.t[i]![k] ?? '')?.[1]?.length ?? 0) : -1);
      const qs = Math.max(stellenVon(i50), stellenVon(i25), stellenVon(i75));   // die Perzentil-Zeilen der Tabelle (Spaltenformat), nicht die Median-Zeile (immer zwei Stellen)
      if (qs >= 0) z.qStellen = qs;
      if (sk !== undefined && Number.isFinite(sk)) z.schiefe = sk;
      if (ku !== undefined && Number.isFinite(ku)) z.kurtosis = ku;
      zahlen.push(z);
    }
  }
  for (const it of items) {
    if (it.type !== 'table' || !it.cells.some(c => c.h && c.t === 'Valid Percent')) continue;
    const r = finde([it], /./)!, kf = spalte(r, /^Frequency$/), kv = spalte(r, /^Valid Percent$/), w = it.headCols[0] - 1;
    const h: Haeufigkeit = { name: it.title?.t ?? it.label, n: 0, fehlend: 0, werte: [] };
    for (let i = it.headRows[0]; i < r.t.length; i++) {
      const teil = r.t[i]![0], a = r.n[i]![kf];
      if (a === undefined || teil === 'Total') continue;
      if (teil === 'Missing') { h.fehlend += a; continue; }
      if (teil === 'Valid' && r.t[i]![w] && r.n[i]![kv] !== undefined) { h.werte.push({ name: wertName(r.t[i]![w]!), anzahl: a, anteil: r.n[i]![kv]! / 100 }); h.n += a; }
    }
    if (h.werte.length) gruppen.push(h);
  }
  if (!zahlen.length && !gruppen.length) throw new Error('Verteilungs-Tabellen fehlen');
  for (const z of zahlen) if (gruppen.some(g => g.name === z.name)) z.stufen = true;
  return { art: 'verteilung', zahlen, gruppen };
}
/** Verteilung, in der nur Mehrfachantworten-Sets stehen (PSPP rechnet dann nichts). */
export function verteilungNurSets(mehrfach: import('./mehrfach').Mehrfach[]): Verteilung {
  return { art: 'verteilung', zahlen: [], gruppen: [], mehrfach };
}

const ganz = (v: number) => komma(v, Number.isInteger(v) ? 0 : st(v, 2));
/** Median und Quartile: mit den Stellen der PSPP-Tabelle (`stellen`, B7); ohne Angabe (alte Projekte) ganze Zahl ohne Nachkommastellen, sonst so viele, dass die Zahl nicht genauer tut, als PSPP rundet (ab 100: eine, darunter zwei; ein Nullen-Ende fällt weg). */
const lage = (v: number, stellen?: number) => { if (stellen !== undefined) { const t = komma(v, stellen); return stellen > 0 ? t.replace(/([.,]\d*?)0+$/, '$1').replace(/[.,]$/, '') : t; } if (Number.isInteger(v)) return komma(v, 0); const t = komma(v, Math.abs(v) >= 100 ? 1 : 2); return t.replace(/([.,]\d)0$/, '$1').replace(/[.,]0$/, ''); };
/** Median: Hat er mehr Nachkommastellen, als das Spaltenformat der Perzentile zeigt (Median 16,5 bei ganzzahliger Spalte), steht er mit zwei Stellen da - sonst stünde im Satz „17“ neben „16,50“ in der Tabelle. */
const lageMd = (v: number, stellen?: number) => lage(v, stellen !== undefined && Math.abs(v * 10 ** stellen - Math.round(v * 10 ** stellen)) > 1e-6 ? Math.max(stellen, 2) : stellen);
const personen = (n: number) => Lp(n, `${n} Person`, `${n} Personen`, `${n} person`, `${n} people`);

export function saetzeVerteilung(e: Verteilung): Saetze {
  const q = (x: string) => anfuehrung(kurz(x));
  const schief = (z: Kennzahl) => z.schiefe !== undefined && Math.abs(z.schiefe) > SCHIEFE_SCHWELLE && z.median !== undefined && z.q1 !== undefined && z.q3 !== undefined;
  const mitte = (z: Kennzahl) => T(`Der Median liegt bei ${lageMd(z.median!, z.qStellen)}${z.q1 !== undefined && z.q3 !== undefined ? L(`, die mittleren 50 % der Werte zwischen ${lage(z.q1, z.qStellen)} (Q1) und ${lage(z.q3, z.qStellen)} (Q3)`, `, the middle 50% of values lie between ${lage(z.q1, z.qStellen)} (Q1) and ${lage(z.q3, z.qStellen)} (Q3)`) : ''}.`,
    `The median is ${lageMd(z.median!, z.qStellen)}${z.q1 !== undefined && z.q3 !== undefined ? L(`, die mittleren 50 % der Werte zwischen ${lage(z.q1, z.qStellen)} (Q1) und ${lage(z.q3, z.qStellen)} (Q3)`, `, the middle 50% of values lie between ${lage(z.q1, z.qStellen)} (Q1) and ${lage(z.q3, z.qStellen)} (Q3)`) : ''}.`);
  /** [Hauptsatz, Zusatz]: Bei schiefen Daten (|Schiefe| > 1) steht der Median im Hauptsatz und der Mittelwert nur noch mit seinem Grund; sonst Mittelwert und SD wie bisher, der Median im Zusatz. */
  const ueberZahl = (z: Kennzahl): [string, string] => {
    if (schief(z)) {
      const hoch = z.schiefe! > 0;
      return [T(`Bei ${zitat(z.name)} ist die Verteilung schief (Schiefe = ${komma(z.schiefe!)}). ${mitte(z)} Der Mittelwert (${komma(z.m, st(z.m, 1))}, SD = ${komma(z.sd, st(z.sd, 1))}) wird hier ${hoch ? L('von einzelnen sehr hohen', 'high') : L('von einzelnen sehr niedrigen', 'low')} Werten am Rand gezogen und beschreibt die Mitte schlecht; die Werte reichen von ${ganz(z.min)} bis ${ganz(z.max)}.`,
        `${zitat(z.name)} is skewed (skewness = ${komma(z.schiefe!)}). ${mitte(z)} The mean (${komma(z.m, st(z.m, 1))}, SD = ${komma(z.sd, st(z.sd, 1))}) is pulled by a few very ${hoch ? L('von einzelnen sehr hohen', 'high') : L('von einzelnen sehr niedrigen', 'low')} values at the edge and describes the center poorly; values range from ${ganz(z.min)} to ${ganz(z.max)}.`), ''];
    }
    return [T(`Bei ${zitat(z.name)} liegt der Mittelwert bei ${komma(z.m, st(z.m, 1))}; die Werte reichen von ${ganz(z.min)} bis ${ganz(z.max)}.`,
      `The mean of ${zitat(z.name)} is ${komma(z.m, st(z.m, 1))}; values range from ${ganz(z.min)} to ${ganz(z.max)}.`),
      z.median === undefined ? '' : `${T(`Bei ${zitat(z.name)}:`, `${zitat(z.name)}:`)} ${mitte(z)}${z.schiefe === undefined ? '' : T(` Schiefe = ${komma(z.schiefe)}${z.kurtosis === undefined ? '' : L(`, Wölbung = ${komma(z.kurtosis)}`, `, kurtosis = ${komma(z.kurtosis)}`)}.`, ` Skewness = ${komma(z.schiefe)}${z.kurtosis === undefined ? '' : L(`, Wölbung = ${komma(z.kurtosis)}`, `, kurtosis = ${komma(z.kurtosis)}`)}.`)}`];
  };
  const ueberGruppe = (g: Haeufigkeit) => {
    const w = [...g.werte].sort((a, b) => b.anzahl - a.anzahl), [a, ...rest] = w;
    // Gleichstand an der Spitze (Nachttest 24.10.: „„nein“ mit 50 % am häufigsten, dann „ja“ mit 50 %“): gleich häufige Antworten zusammen nennen
    const gleich = w.filter(x => x.anzahl === a!.anzahl);
    if (gleich.length > 1 && gleich.length === w.length) return T(`Bei ${zitat(g.name)} sind alle ${w.length} Antworten gleich häufig (je ${prozent(a!.anteil)}).`, `For ${zitat(g.name)}, all ${w.length} answers are equally common (${prozent(a!.anteil)} each).`);
    if (gleich.length > 1) {
      const danach = w.slice(gleich.length, gleich.length + 2).map(x => T(`${q(x.name)} mit ${prozent(x.anteil)}`, `${q(x.name)} with ${prozent(x.anteil)}`));
      return T(`Bei ${zitat(g.name)} sind ${aufzaehlung(gleich.map(x => q(x.name)))} gleich häufig am häufigsten (je ${prozent(a!.anteil)})${danach.length ? L(`, dann ${aufzaehlung(danach)}`, `, followed by ${aufzaehlung(danach)}`) : ''}.`,
        `For ${zitat(g.name)}, ${aufzaehlung(gleich.map(x => q(x.name)))} are equally the most common (${prozent(a!.anteil)} each)${danach.length ? L(`, dann ${aufzaehlung(danach)}`, `, followed by ${aufzaehlung(danach)}`) : ''}.`);
    }
    const folgt = rest.slice(0, 2).map(x => T(`${q(x.name)} mit ${prozent(x.anteil)}`, `${q(x.name)} with ${prozent(x.anteil)}`));
    return T(`Bei ${zitat(g.name)} ist ${q(a!.name)} mit ${prozent(a!.anteil)} am häufigsten${folgt.length ? L(`, dann ${aufzaehlung(folgt)}`, `, followed by ${aufzaehlung(folgt)}`) : ''}${w.length > 3 ? L(` (${w.length} verschiedene Antworten)`, ` (${w.length} different answers)`) : ''}.`,
      `For ${zitat(g.name)}, ${q(a!.name)} is the most common at ${prozent(a!.anteil)}${folgt.length ? L(`, dann ${aufzaehlung(folgt)}`, `, followed by ${aufzaehlung(folgt)}`) : ''}${w.length > 3 ? L(` (${w.length} verschiedene Antworten)`, ` (${w.length} different answers)`) : ''}.`);
  };
  const zs = e.zahlen.map(ueberZahl);
  const saetze = [...zs.map(x => x[0]), ...e.gruppen.map(ueberGruppe)];
  const median = zs.map(x => x[1]).filter(Boolean);
  // ⚠ von der Fachperson abzunehmen: Shapiro-Wilk, Grenze p < ,05 und der Wortlaut.
  const normal = e.zahlen.filter(z => z.sw).map(z => z.sw!.p < 0.05
    ? T(`Bei ${zitat(z.name)} weicht die Verteilung nach dem Shapiro-Wilk-Test von einer Normalverteilung ab (W = ${ohneNull(z.sw!.w, 3)}, p ${pWert(z.sw!.p)}).`, `${zitat(z.name)}: the distribution departs from a normal distribution according to the Shapiro-Wilk test (W = ${ohneNull(z.sw!.w, 3)}, p ${pWert(z.sw!.p)}).`)
    : T(`Bei ${zitat(z.name)} spricht der Shapiro-Wilk-Test nicht gegen eine Normalverteilung (W = ${ohneNull(z.sw!.w, 3)}, p ${pWert(z.sw!.p)}).`, `${zitat(z.name)}: the Shapiro-Wilk test does not indicate a departure from a normal distribution (W = ${ohneNull(z.sw!.w, 3)}, p ${pWert(z.sw!.p)}).`));
  const fehlt = e.gruppen.filter(g => g.fehlend).map(g => Lp(g.fehlend, `Bei ${zitat(g.name)} fehlt ${g.fehlend} Angabe.`, `Bei ${zitat(g.name)} fehlen ${g.fehlend} Angaben.`, `${zitat(g.name)}: ${g.fehlend} missing answer.`, `${zitat(g.name)}: ${g.fehlend} missing answers.`));
  const mehrere = e.zahlen.length + e.gruppen.length > 1;
  const vor = (n: string) => (mehrere ? `${kurz(n, 30)}: ` : '');
  const apa = [
    ...e.zahlen.map(z => `${vor(z.name)}M = ${komma(z.m, st(z.m, 2))}, SD = ${komma(z.sd, st(z.sd, 2))}${z.median !== undefined ? `, Mdn = ${komma(z.median, st(z.median, 2))}` : ''}, n = ${z.n}${z.sw ? `, Shapiro-Wilk W = ${ohneNull(z.sw.w, 3)}, p ${pWert(z.sw.p)}` : ''}`),
    ...e.gruppen.map(g => `${vor(g.name)}${g.werte.slice(0, 6).map(x => `${prozent1(x.anteil)} ${kurz(x.name, 25)}`).join(', ')}${g.werte.length > 6 ? ', …' : ''}, n = ${g.n}`)
  ].join('; ');
  // Die Marke steht neben Mittelwert und SD der ersten Zahl - also deren n (Prüfrunde 07.10.: vorher das größte n aller Spalten).
  const n = e.zahlen.length ? e.zahlen[0]!.n : Math.max(groesste(e.gruppen.map(g => g.n)));
  return {
    haupt: saetze[0]!, zusatz: [...saetze.slice(1), ...median, ...normal, ...fehlt].join(' '),
    vorsicht: T('Die Zahlen beschreiben nur die Personen in diesen Daten.', 'The figures describe only the people in these data.')
      + (normal.length ? T(' Bei vielen Personen wird der Shapiro-Wilk-Test schon bei kleinen Abweichungen auffällig, bei wenigen übersieht er große - das Q-Q-Diagramm zeigt es besser.', ' With many people the Shapiro-Wilk test flags even small departures, with few it misses large ones - the Q-Q plot shows it better.') : ''),
    apa,
    marken: [
      ...(e.zahlen.length ? [{ text: T(`Mittelwert ${komma(e.zahlen[0]!.m, st(e.zahlen[0]!.m, 1))}`, `Mean ${komma(e.zahlen[0]!.m, st(e.zahlen[0]!.m, 1))}`), erklaer: 'mittelwert' }, { text: `SD = ${komma(e.zahlen[0]!.sd, st(e.zahlen[0]!.sd, 1))}`, erklaer: 'standardabweichung' },
        ...(e.zahlen[0]!.median !== undefined ? [{ text: `Median = ${lageMd(e.zahlen[0]!.median!, e.zahlen[0]!.qStellen)}`, erklaer: 'mittelwert' }] : []),
        ...(schief(e.zahlen[0]!) ? [{ text: T(`Schiefe = ${komma(e.zahlen[0]!.schiefe!)}: Mittelwert wird vom Rand gezogen`, `Skewness = ${komma(e.zahlen[0]!.schiefe!)}: mean is pulled by the tail`), erklaer: 'mittelwert', hinweis: true }] : [])] : []),
      ...(e.zahlen[0]?.sw ? [{ text: T(`Normalverteilung (Shapiro-Wilk): p ${pWert(e.zahlen[0].sw.p)}${unter05(e.zahlen[0].sw.p < 0.05)}`, `Normality (Shapiro-Wilk): p ${pWert(e.zahlen[0].sw.p)}${unter05(e.zahlen[0].sw.p < 0.05)}`), erklaer: 'p-wert', hinweis: e.zahlen[0].sw.p < 0.05 }] : []),
      { text: T(`${personen(n)} mit Angabe`, `${personen(n)} with an answer`), erklaer: 'stichprobe' }
    ]
  };
}

/* ---------- Übereinstimmung von Beurteilungen: Cohens Kappa und ICC ---------- */

/** Kappa für zwei Beurteilende mit Kategorien. Die obersten Zahlen (`kappa` … `kiHi`) gelten für `gewicht`; `alle` hält die drei Gewichtungen, damit das Blatt umschalten kann.
 *  Ungewichtet kommen Kappa, asymptotischer Fehler und T aus PSPP (CROSSTABS /STATISTICS=KAPPA), sonst (andere Gewichtung, nicht-quadratische PSPP-Tabelle) aus eigenem Code. */
export interface Kappa extends KappaZahlen {
  art: 'kappa'; a: string; b: string; n: number; kategorien: (string | number)[]; tab: number[][]; uebereinstimmung: number;
  gewicht: Gewicht; alle: Record<Gewicht, KappaZahlen>;
  /** Darf gewichtet werden: beide Spalten Zahlen (also geordnet) und mindestens drei Kategorien */
  gewichtbar: boolean; empfohlen: Gewicht; quelle: 'pspp' | 'eigen';
  /** Krippendorffs Alpha, Brennan-Prediger und Prozent zu denselben zwei Kodierenden (Fachblatt G2); fehlt in alten Projektdateien. */
  inter?: import('./intercodersaetze').Inter;
}
export function kappa(items: OutputItem[], a: string, b: string, paare: [string | number, string | number][], gewichtbar: boolean, empfohlen: Gewicht = 'keins'): Kappa {
  const t = kappaTabelle(paare);
  if (t.kategorien.length < 2) throw new Error(L('Nur eine Kategorie', 'Only one category'));
  const eigen = (g: Gewicht) => kappaAusTabelle(t.tab, g);
  const alle: Record<Gewicht, KappaZahlen> = { keins: eigen('keins'), linear: eigen('linear'), quadratisch: eigen('quadratisch') };
  let quelle: 'pspp' | 'eigen' = 'eigen';
  const sm = finde(items, /^Symmetric Measures$/);
  const zeile = sm ? sm.t.findIndex(r => r.some(c => c === 'Kappa')) : -1;
  if (sm && zeile >= 0) {
    const zahlen = sm.n[zeile]!.filter((v): v is number => v !== undefined);
    const [wert, se, z] = zahlen;
    if (wert !== undefined && se !== undefined && z !== undefined && Number.isFinite(wert) && Number.isFinite(se) && se > 0) {
      alle.keins = { kappa: wert, se, z, p: pNormal(z), kiLo: wert - 1.959963984540054 * se, kiHi: wert + 1.959963984540054 * se };
      quelle = 'pspp';
    }
  }
  if (!Number.isFinite(alle.keins.kappa)) throw new Error(L('Kappa nicht berechenbar', 'Kappa cannot be calculated'));
  const gewicht = gewichtbar ? empfohlen : 'keins';
  return { art: 'kappa', a, b, n: t.n, kategorien: t.kategorien, tab: t.tab, uebereinstimmung: t.uebereinstimmung, ...alle[gewicht], gewicht, alle, gewichtbar, empfohlen: gewicht, quelle };
}
/** Dieselbe Auswertung mit anderer Gewichtung (Umschalten im Blatt). */
export function kappaMit(e: Kappa, gewicht: Gewicht): Kappa { return { ...e, ...e.alle[gewicht], gewicht }; }
export const gewichtName = (g: Gewicht) => (g === 'linear' ? T('linear gewichtet', 'linearly weighted') : g === 'quadratisch' ? T('quadratisch gewichtet', 'quadratically weighted') : T('ungewichtet', 'unweighted'));

/** ICC: Beurteilende in `spalten`, `modell` wählt absolute Übereinstimmung (ICC(2,·)) oder Konsistenz (ICC(3,·)). `gesamt` = alle Zeilen der Daten (für den Hinweis auf ausgelassene Fälle). */
export interface IccErgebnis { art: 'icc'; spalten: string[]; modell: IccModell; icc: Icc; gesamt: number; mittelwerte: number[]; /** Nur bei genau zwei Spalten: Retest-Korrelation r_tt (Pearson); fehlt in alten Projektdateien. */ rtt?: number; /** Nur bei genau zwei Spalten: Bland-Altman-Analyse (erste minus zweite Spalte); fehlt in alten Projektdateien. */ ba?: BlandAltman;
  /** Nur bei genau zwei Spalten: Typical Error (Welle 7, M8; zweite minus erste Messung) und ob er im Bericht steht. Fehlt in alten Projektdateien. */ te?: import('./typicalerror').TypicalError; teBericht?: boolean }
export function iccErgebnis(spalten: string[], daten: number[][], gesamt: number, modell: IccModell = 'absolut'): IccErgebnis {
  const r = icc(daten);
  const mittelwerte = spalten.map((_, j) => daten.reduce((a, z) => a + z[j]!, 0) / daten.length);
  if (!Number.isFinite(r.absolut.einzel.icc) || !Number.isFinite(r.konsistenz.einzel.icc)) throw new Error(L('ICC nicht berechenbar', 'ICC cannot be calculated'));
  let ba: BlandAltman | undefined, te: TypicalError | undefined;
  if (spalten.length === 2) {
    const paare = daten.map(z => [z[0]!, z[1]!] as [number, number]);
    try { ba = blandAltman(paare); } catch { /* keine Streuung der Differenzen oder weniger als 3 Fälle: keine Bland-Altman-Analyse */ }
    try { te = typicalError(paare); } catch { /* dasselbe: kein Typical Error */ }
  }
  // Retest-Korrelation r_tt (Pearson) nur bei genau zwei Spalten; ohne Streuung in einer Spalte nicht berechenbar
  let rtt: number | undefined;
  if (spalten.length === 2 && daten.length >= 3) {
    const m1 = mittelwerte[0]!, m2 = mittelwerte[1]!;
    let sxy = 0, sxx = 0, syy = 0;
    for (const z of daten) { sxy += (z[0]! - m1) * (z[1]! - m2); sxx += (z[0]! - m1) ** 2; syy += (z[1]! - m2) ** 2; }
    const v = sxy / Math.sqrt(sxx * syy);
    if (Number.isFinite(v)) rtt = Math.max(-1, Math.min(1, v));
  }
  return { art: 'icc', spalten, modell, icc: r, gesamt, mittelwerte, ...(rtt !== undefined ? { rtt } : {}), ...(ba ? { ba } : {}), ...(te ? { te } : {}) };
}

const wortK = (k: number) => kappaWort(k);
const iccName = (modell: IccModell, mittel: boolean, k: number) => `ICC(${modell === 'absolut' ? 2 : 3},${mittel ? k : 1})`;

/** Sätze für Kappa. ⚠ Satzvorlagen und Einordnung (Landis & Koch 1977) von der Fachperson abzunehmen. */
export function saetzeKappa(e: Kappa, label: (s: string) => string): Saetze {
  const a = zitat(label(e.a)), b = zitat(label(e.b)), sig = e.p < 0.05, gew = e.gewicht !== 'keins';
  const k = ohneNull(e.kappa), proz = prozent(e.uebereinstimmung);
  const haupt = T(`Die Beurteilungen in ${a} und ${b} stimmen bei ${proz} der ${e.n} Fälle überein; um den Zufall bereinigt ist die Übereinstimmung ${wortK(e.kappa)} (Cohens κ = ${k}${gew ? `, ${gewichtName(e.gewicht)}` : ''}).`,
    `The ratings in ${a} and ${b} agree in ${proz} of the ${e.n} cases; corrected for chance, the agreement is ${wortK(e.kappa)} (Cohen's κ = ${k}${gew ? `, ${gewichtName(e.gewicht)}` : ''}).`);
  const lo = e.kiLo < 0 ? T('schlecht', 'poor') : wortK(e.kiLo), hi = wortK(Math.min(1, e.kiHi));
  const zusatz = T(`Das 95 %-Konfidenzintervall ${iv(ohneNull(e.kiLo), ohneNull(Math.min(1, e.kiHi)))} ${lo === hi ? L(`liegt ganz im Bereich „${lo}“`, `lies entirely within "${lo}"`) : L(`reicht von „${lo}“ bis „${hi}“`, `ranges from "${lo}" to "${hi}"`)} (Einordnung nach Landis & Koch, 1977). Der p-Wert (p ${pWert(e.p)}) prüft nur, ob κ von null abweicht - ${sig ? L('das tut es', 'it does') : L('das lässt sich hier nicht belegen', 'that cannot be shown here')}; ob die Übereinstimmung für den Zweck reicht, zeigt die Höhe von κ.`,
    `The 95% confidence interval ${iv(ohneNull(e.kiLo), ohneNull(Math.min(1, e.kiHi)))} ${lo === hi ? L(`liegt ganz im Bereich „${lo}“`, `lies entirely within "${lo}"`) : L(`reicht von „${lo}“ bis „${hi}“`, `ranges from "${lo}" to "${hi}"`)} (classification according to Landis & Koch, 1977). The p value (p ${pWert(e.p)}) only tests whether κ differs from zero - ${sig ? L('das tut es', 'it does') : L('das lässt sich hier nicht belegen', 'that cannot be shown here')}; whether the agreement is sufficient for your purpose depends on the size of κ.`);
  const vorsicht = (e.n < 30 ? T(`Bei ${e.n} Fällen ist κ ungenau. `, `With ${e.n} cases κ is imprecise. `) : '')
    + T('κ hängt davon ab, wie oft jede Kategorie vorkommt: Ist eine Kategorie sehr selten oder sehr häufig, kann κ trotz hoher Übereinstimmung niedrig ausfallen.',
      'κ depends on how often each category occurs: if one category is very rare or very common, κ can be low despite high agreement.')
    + (gew ? T(' Gewichtet zählt eine Abweichung um eine Stufe weniger als eine um mehrere Stufen.', ' With weights, a difference of one level counts less than a difference of several levels.') : '');
  const apa = `κ${gew ? ` (${e.gewicht === 'linear' ? T('linear', 'linear') : T('quadratisch', 'quadratic')})` : ''} = ${ohneNull(e.kappa)}, p ${pWert(e.p)}, ${ki(ohneNull(e.kiLo), ohneNull(Math.min(1, e.kiHi)))}, n = ${e.n}`;
  return {
    haupt, zusatz, vorsicht, apa,
    marken: [
      { text: `${T('Übereinstimmung', 'Level of agreement')}: ${wortK(e.kappa)} · κ = ${k}`, erklaer: 'kappa' },
      { text: T(`${proz} gleich beurteilt`, `${proz} rated the same`), erklaer: 'kappa' },
      { text: `p ${pWert(e.p)}${unter05(sig)}`, erklaer: 'p-wert' },
      { text: T(`Plausibler Bereich für κ: ${ohneNull(e.kiLo)} bis ${ohneNull(Math.min(1, e.kiHi))}`, `Plausible range for κ: ${ohneNull(e.kiLo)} to ${ohneNull(Math.min(1, e.kiHi))}`), erklaer: 'konfidenzintervall' },
      ...(e.n < 30 ? [{ text: T(`Wenige Fälle (n = ${e.n})`, `Few cases (n = ${e.n})`), erklaer: 'stichprobe', hinweis: true }] : [])
    ]
  };
}


/** Bland-Altman-Sätze (bei genau zwei Zahlenspalten), Einheit = Einheit der Spalten. ⚠ Satzvorlagen von der Fachperson abzunehmen. */
function baSatz(e: IccErgebnis): { zusatz: string; vorsicht: string; apa: string; marke: { text: string; erklaer: string } } | null {
  const b = e.ba; if (!b) return null;
  const a = zitat(e.spalten[0]!), c = zitat(e.spalten[1]!), bias = komma(b.bias), sig = b.biasLo > 0 || b.biasHi < 0;
  const lage = Math.abs(b.bias) < 1e-9 ? T('gleich hoch wie', 'as high as') : b.bias > 0 ? T('höher als', 'higher than') : T('niedriger als', 'lower than');
  const bereich = ki(komma(b.biasLo), komma(b.biasHi));
  const prop = b.steigungP < 0.05;
  const zusatz = T(`Bland-Altman (Differenz: ${a} minus ${c}): ${a} liegt im Mittel ${Math.abs(b.bias) < 1e-9 ? lage : L(`um ${komma(Math.abs(b.bias))} ${lage}`, `${komma(Math.abs(b.bias))} ${lage}`)} ${c} (Bias = ${bias}, ${bereich}${sig ? '' : L(' - enthält 0, ein fester Unterschied ist nicht belegt', ' - includes 0, so there is no clear evidence of a constant difference')}). 95 % der Unterschiede zwischen beiden liegen zwischen ${komma(b.untere.wert)} und ${komma(b.obere.wert)} (Übereinstimmungsgrenzen, Bias ± 1,96 SD; Intervall der unteren Grenze ${komma(b.untere.lo)} bis ${komma(b.untere.hi)}, der oberen ${komma(b.obere.lo)} bis ${komma(b.obere.hi)}). Ob diese Spanne klein genug ist, entscheidet das Fach, nicht die Statistik.`,
    `Bland-Altman (difference: ${a} minus ${c}): ${a} is on average ${Math.abs(b.bias) < 1e-9 ? lage : L(`um ${komma(Math.abs(b.bias))} ${lage}`, `${komma(Math.abs(b.bias))} ${lage}`)} ${c} (bias = ${bias}, ${bereich}${sig ? '' : L(' - enthält 0, ein fester Unterschied ist nicht belegt', ' - includes 0, so there is no clear evidence of a constant difference')}). 95% of the differences between the two lie between ${komma(b.untere.wert)} and ${komma(b.obere.wert)} (limits of agreement, bias ± 1.96 SD; interval of the lower limit ${komma(b.untere.lo)} to ${komma(b.untere.hi)}, of the upper ${komma(b.obere.lo)} to ${komma(b.obere.hi)}). Whether this range is small enough is a matter for the field, not for statistics.`);
  const vorsicht = (prop ? T(`Die Unterschiede hängen vom Mittelwert ab (Steigung ${komma(b.steigung)}, p ${pWert(b.steigungP)}): Die Übereinstimmungsgrenzen sind dann nicht über den ganzen Bereich gleich gut.`, `The differences depend on the mean (slope ${komma(b.steigung)}, p ${pWert(b.steigungP)}): the limits of agreement are then not equally good across the whole range.`) + ' ' : '')
    + (b.n < 30 ? T(`Bei ${b.n} Fällen sind die Grenzen ungenau; Bland und Altman empfehlen mindestens 100.`, `With ${b.n} cases the limits are imprecise; Bland and Altman recommend at least 100.`) : '');
  const apa = T(`Bland-Altman: Bias = ${bias}, ${bereich}; Übereinstimmungsgrenzen ${iv(komma(b.untere.wert), komma(b.obere.wert))}`, `Bland-Altman: bias = ${bias}, ${bereich}; limits of agreement ${iv(komma(b.untere.wert), komma(b.obere.wert))}`);
  return { zusatz, vorsicht: vorsicht.trim(), apa, marke: { text: T(`Bias ${bias} · Grenzen ${komma(b.untere.wert)} bis ${komma(b.obere.wert)}`, `Bias ${bias} · limits ${komma(b.untere.wert)} to ${komma(b.obere.wert)}`), erklaer: 'bland-altman' } };
}

/** Sätze für den ICC. Einordnung nach Koo & Li (2016). ⚠ Satzvorlagen, Schwellen und Standardwahl (absolute Übereinstimmung) von der Fachperson abzunehmen. */
export function saetzeIcc(e: IccErgebnis): Saetze {
  const r = e.icc, m = e.modell, sig = r.p < 0.05, ein = r[m === 'absolut' ? 'absolut' : 'konsistenz'].einzel, mit = r[m === 'absolut' ? 'absolut' : 'konsistenz'].mittel;
  const wort = (x: number) => iccWort(x), kiT = (x: IccMass) => (Number.isFinite(x.kiLo) ? ki(ohneNull(Math.max(-1, x.kiLo)), ohneNull(Math.min(1, x.kiHi))) : '');
  const nameE = iccName(m, false, r.k), nameM = iccName(m, true, r.k);
  const was = m === 'absolut' ? T('absolute Übereinstimmung: die Werte sollen gleich sein', 'absolute agreement: the values should be the same') : T('Konsistenz: ein fester Unterschied zwischen den Beurteilenden ist erlaubt, die Abstände sollen gleich sein', 'consistency: a constant difference between raters is allowed, the distances should be the same');
  const haupt = T(`Die Übereinstimmung der ${r.k} Beurteilenden ist bei ${r.n} Fällen ${wort(ein.icc)} (${was}).`,
    `The agreement of the ${r.k} raters on ${r.n} cases is ${wort(ein.icc)} (${was}).`);
  const kiVon = wort(ein.kiLo) === wort(ein.kiHi) ? L(`liegt ganz im Bereich „${wort(ein.kiLo)}“`, `lies entirely within "${wort(ein.kiLo)}"`) : L(`reicht von „${wort(ein.kiLo)}“ bis „${wort(ein.kiHi)}“`, `ranges from "${wort(ein.kiLo)}" to "${wort(ein.kiHi)}"`);
  const bereich = Number.isFinite(ein.kiLo) ? T(` Das 95 %-Konfidenzintervall ${kiVon}.`, ` The 95% confidence interval ${kiVon}.`) : '';
  // T9: Koo & Li (2016, S. 158) empfehlen, das ganze Intervall zu betrachten - der Hauptsatz nennt den Schätzwert, hier steht, wofür die Untergrenze spricht.
  const unten = Number.isFinite(ein.kiLo) ? T(` Sie empfehlen, das ganze Intervall zu betrachten: Hier spricht die Untergrenze für „${wort(ein.kiLo)}“.`, ` They recommend considering the whole interval: here the lower limit points to "${wort(ein.kiLo)}".`) : '';
  // Retest-Reliabilität (Stufe 6.6): bei genau zwei Messungen steht die Retest-Korrelation im Text; der Reliable Change Index braucht sie.
  const retest = e.rtt === undefined ? '' : T(` Retest-Korrelation r_tt = ${ohneNull(e.rtt)} (Pearson). Für Retest-Reliabilität empfiehlt sich die ICC für absolute Übereinstimmung (Koo & Li 2016); r_tt ist der Wert, den der Reliable Change Index braucht.`,
    ` Test-retest correlation r_tt = ${ohneNull(e.rtt)} (Pearson). For test-retest reliability the ICC for absolute agreement is recommended (Koo & Li 2016); r_tt is the value the Reliable Change Index needs.`);
  const zusatz = T(`Für ein einzelnes Urteil gilt ${nameE} = ${ohneNull(ein.icc)}.${bereich} Der Mittelwert aller ${r.k} Urteile ist verlässlicher: ${nameM} = ${ohneNull(mit.icc)}. Einordnung nach Koo & Li (2016): unter ,50 gering, bis ,75 mäßig, bis ,90 gut, darüber ausgezeichnet.${unten}`,
    `For a single rating, ${nameE} = ${ohneNull(ein.icc)}.${bereich} The mean of all ${r.k} ratings is more reliable: ${nameM} = ${ohneNull(mit.icc)}. Classification according to Koo & Li (2016): below .50 poor, up to .75 moderate, up to .90 good, above that excellent.${unten}`) + retest;
  const vorsicht = (r.n < 30 ? T(`Bei ${r.n} Fällen ist der ICC ungenau (Koo & Li empfehlen mindestens 30). `, `With ${r.n} cases the ICC is imprecise (Koo & Li recommend at least 30). `) : '')
    + (m === 'absolut' ? T('Ein Beurteilender, der durchgehend strenger bewertet, senkt diesen Wert; die Konsistenz würde das nicht tun.', 'A rater who is consistently stricter lowers this value; consistency would not.')
      : T('Die Konsistenz sieht über Unterschiede in der Strenge hinweg: Wer immer zwei Punkte mehr gibt, schadet ihr nicht.', 'Consistency ignores differences in strictness: a rater who always gives two points more does not harm it.'));
  const apa = `${nameE} = ${ohneNull(ein.icc)}${kiT(ein) ? `, ${kiT(ein)}` : ''}; ${nameM} = ${ohneNull(mit.icc)}${kiT(mit) ? `, ${kiT(mit)}` : ''}; F(${r.df1}, ${r.df2}) = ${Number.isFinite(r.f) ? komma(r.f) : '∞'}, p ${pWert(r.p)}`;
  const bas = baSatz(e);
  return {
    haupt, zusatz, vorsicht, apa: apa + (e.rtt !== undefined ? `; r_tt = ${ohneNull(e.rtt)}` : '') + (bas ? '; ' + bas.apa : ''),
    // Bland-Altman steht im zugeklappten Teil des Blattes, nicht im Absatz zum ICC
    ...(bas ? { ba: bas.zusatz + (bas.vorsicht ? ' ' + bas.vorsicht : '') } : {}),
    marken: [
      // Kennzeichen eigener Text, nicht der Blatttitel „Agreement: Spalte A, B“ (verfahren.ts) - das Hauptwort muss zum eingesetzten Wort passen (el: „Επίπεδο συμφωνίας: μέτριο“).
      { text: `${T('Übereinstimmung', 'Level of agreement')}: ${wort(ein.icc)} · ${nameE} = ${ohneNull(ein.icc)}`, erklaer: 'icc' },
      ...(bas ? [bas.marke] : []),
      { text: `${nameM} = ${ohneNull(mit.icc)}`, erklaer: 'icc' },
      ...(Number.isFinite(ein.kiLo) ? [{ text: T(`Plausibler Bereich für ${nameE}: ${ohneNull(Math.max(-1, ein.kiLo))} bis ${ohneNull(Math.min(1, ein.kiHi))}`, `Plausible range for ${nameE}: ${ohneNull(Math.max(-1, ein.kiLo))} to ${ohneNull(Math.min(1, ein.kiHi))}`), erklaer: 'konfidenzintervall' }] : []),
      { text: T(`${r.n} Fälle`, `${r.n} cases`) + (e.gesamt > r.n ? T(` (${e.gesamt - r.n} unvollständige ausgelassen)`, ` (${e.gesamt - r.n} incomplete left out)`) : ''), erklaer: 'stichprobe' },
      ...(r.n < 30 ? [{ text: T(`Wenige Fälle (n = ${r.n})`, `Few cases (n = ${r.n})`), erklaer: 'stichprobe', hinweis: true }] : [])
    ]
  };
}
