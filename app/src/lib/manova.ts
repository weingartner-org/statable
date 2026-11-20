/**
 * MANOVA (Fachblatt docs/fachblaetter/KURSPAKET.md, Abschnitt 3): „Unterscheiden sich Gruppen in mehreren Zahlen zugleich?“
 * Eine Gruppenspalte, mindestens zwei Zahlen-Zielgrößen. `manova(Y ~ g)` mit den vier Prüfgrößen (Pillai, Wilks, Hotelling-Lawley, Roy) und danach je Zielgröße eine einfaktorielle Varianzanalyse.
 * Hauptzeile ist Pillai (am wenigsten empfindlich gegen verletzte Voraussetzungen); alle vier stehen in der Tabelle. Die Hinweise zur Deutung stehen immer sichtbar.
 * Rechnung: engine/statable-kurspaket.R (`sp_manova`). SICHERHEIT: nur feste Wörter und Bezeichner im Aufruf; die Gruppen stehen als gebundenes Argument.
 */
import type { TableItem } from '../engine/types';
import type { RSpalte } from '../engine/webr';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { L, Lp, d } from './sitzung.svelte';
import { zitat, aufzaehlung } from '../i18n/profil';
import { komma, ohneNull, pWert, type Saetze } from './ergebnis';
import { tabelle, fx, fo, fp, type Z } from './mwsaetze';
import { spaltenName } from './medmodsaetze';
import { rFange, rIds, rArg, rAnzeigeName as rn, rAnzeigeText as rs } from '../engine/rsicher';
import type { RAufruf } from './kategreg';
import { holm, holmKopf, holmFuss, holmRKommentar, manovaWarnMehrfach, manovaWarnVoraus } from './manovafolge';
import { kpName, kpZahlen, kpGruppen, kpIndex, kpInnerhalb, kpVollerRang, kpKonstant, kpArr, kpZahl, kpZahlen2, kpText, kpObjekt, type KpPunkt } from './kpdaten';

export const R_PAKETE_MANOVA: string[] = [];
export const MANOVA_ZIELE_MAX = 10;
/** Ab diesem Betrag der Korrelation zweier Zielgrößen steht der Hinweis (Fachblatt). */
export const MANOVA_KORR_GRENZE = 0.9;

export interface ManovaDaten {
  spalten: RSpalte[]; stufen: string[]; gruppe: string; ziele: string[];
  n: number; ausgelassen: number; gruppenN: { name: string; n: number }[]; konstant: string[]; vollerRang: boolean;
  /** größter Betrag der Korrelation zweier Zielgrößen (0 bei einer) und das Paar */ rmax: number; paar: [string, string] | null;
}
export function manovaDaten(gruppe: string, ziele: string[], zeilen: Wert[][], spalten: Spalte[]): ManovaDaten {
  const gi = kpIndex(spalten, gruppe), gs = spalten.find(x => x.name === gruppe);
  if (!gs || gi < 0) throw new Error('Gruppenspalte fehlt');
  const gr = kpGruppen(gs, gi, zeilen);
  const zahlen = ziele.map(m => { const i = kpIndex(spalten, m); return kpZahlen(spalten[i]!, i, zeilen); });
  const idx = zeilen.flatMap((_, r) => (gr.werte[r] !== null && zahlen.every(z => z[r] !== null) ? [r] : []));
  const nr = new Map(gr.stufen.map((s, i) => [s, i]));
  const grp = idx.map(r => nr.get(gr.werte[r]!)!);
  const je = gr.stufen.map(() => 0); for (const g of grp) je[g]!++;
  const cols = zahlen.map(z => idx.map(r => z[r]!));
  let rmax = 0, paar: [string, string] | null = null;
  for (let a = 0; a < cols.length; a++) for (let b = a + 1; b < cols.length; b++) {
    const r = Math.abs(korr(cols[a]!, cols[b]!));
    if (Number.isFinite(r) && r > rmax) { rmax = r; paar = [ziele[a]!, ziele[b]!]; }
  }
  return {
    spalten: [{ name: 'g', art: 'text', werte: gr.werte }, ...zahlen.map((z, k): RSpalte => ({ name: kpName(k), art: 'zahl', werte: z }))],
    stufen: gr.stufen, gruppe, ziele, n: idx.length, ausgelassen: zeilen.length - idx.length, gruppenN: gr.stufen.map((name, i) => ({ name, n: je[i]! })).filter(g => g.n > 0),
    konstant: ziele.filter((_, k) => kpKonstant(cols[k]!)), vollerRang: idx.length > 0 && kpVollerRang(kpInnerhalb(cols, grp, gr.stufen.length)), rmax, paar
  };
}
function korr(x: number[], y: number[]): number {
  const n = x.length; if (n < 2) return NaN;
  const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i]! - mx) * (y[i]! - my); sxx += (x[i]! - mx) ** 2; syy += (y[i]! - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
}

export type ManovaCode = 'ziele-wenig' | 'ziele-viele' | 'gruppen-wenig' | 'gruppe-ein-fall' | 'zu-wenig-faelle' | 'konstant' | 'kollinear' | 'hoch-korreliert' | 'r-fehler';
export const MANOVA_SPERREN: ReadonlySet<ManovaCode> = new Set<ManovaCode>(['ziele-wenig', 'ziele-viele', 'gruppen-wenig', 'gruppe-ein-fall', 'zu-wenig-faelle', 'konstant', 'kollinear', 'r-fehler']);
export function manovaCodes(dt: ManovaDaten): ManovaCode[] {
  const q = dt.ziele.length, k = dt.gruppenN.length, aus: ManovaCode[] = [];
  if (q < 2) aus.push('ziele-wenig');
  if (q > MANOVA_ZIELE_MAX) aus.push('ziele-viele');
  if (k < 2) aus.push('gruppen-wenig');
  else {
    if (dt.gruppenN.some(g => g.n === 1)) aus.push('gruppe-ein-fall');
    if (dt.n <= q + k) aus.push('zu-wenig-faelle');
  }
  if (dt.konstant.length) aus.push('konstant');
  else if (dt.n > 0 && k >= 2 && !dt.vollerRang && !aus.includes('gruppe-ein-fall')) aus.push('kollinear');
  if (dt.rmax > MANOVA_KORR_GRENZE) aus.push('hoch-korreliert');
  return aus;
}
export interface ManovaSatzKontext { n?: number; q?: number; k?: number; namen?: string[]; gruppe?: string; paar?: [string, string] | null; rmax?: number }
export function manovaCodeSatz(c: ManovaCode, x: ManovaSatzKontext = {}): { text: string; klein?: string } {
  switch (c) {
    case 'ziele-wenig': return { text: L('Eine MANOVA braucht mindestens zwei Zahlen-Zielgrößen.', 'A MANOVA needs at least two number outcomes.') };
    case 'ziele-viele': return { text: L(`Mehr als ${MANOVA_ZIELE_MAX} Zielgrößen rechnet Statable nicht in einer MANOVA.`, `Statable does not calculate more than ${MANOVA_ZIELE_MAX} outcomes in one MANOVA.`) };
    case 'gruppen-wenig': return { text: L('Es bleiben weniger als zwei Gruppen mit Angaben in allen Zielgrößen.', 'Fewer than two groups with values in all outcomes remain.') };
    case 'gruppe-ein-fall': return { text: L('Mindestens eine Gruppe hat nur einen Fall. Mit einem Fall lässt sich die Streuung innerhalb der Gruppe nicht schätzen.', 'At least one group has only one case. With one case the spread within the group cannot be estimated.'),
      klein: d('Nimm die Gruppe heraus oder fasse sie mit einer anderen zusammen.', 'Nehmen Sie die Gruppe heraus oder fassen Sie sie mit einer anderen zusammen.', 'Leave the group out or merge it with another one.') };
    case 'zu-wenig-faelle': return { text: L(`Zu wenige Fälle: ${x.n ?? 0} Fälle für ${x.q ?? 0} Zielgrößen und ${x.k ?? 0} Gruppen. Es müssen mehr Fälle sein als Zielgrößen plus Gruppen.`, `Too few cases: ${x.n ?? 0} cases for ${x.q ?? 0} outcomes and ${x.k ?? 0} groups. There must be more cases than outcomes plus groups.`) };
    case 'konstant': return { text: L(`Diese Zielgrößen haben in allen Fällen denselben Wert: ${aufzaehlung((x.namen ?? []).map(zitat))}. Damit lässt sich nichts vergleichen.`, `These outcomes have the same value in all cases: ${aufzaehlung((x.namen ?? []).map(zitat))}. Nothing can be compared with them.`),
      klein: d('Nimm sie heraus.', 'Nehmen Sie sie heraus.', 'Leave them out.') };
    case 'kollinear': return { text: L('Eine Zielgröße lässt sich aus den anderen berechnen (zum Beispiel als Summe) oder ist innerhalb der Gruppen konstant. Die Rechnung ist so nicht möglich.', 'An outcome can be calculated from the others (for example as a sum) or is constant within the groups. The calculation is not possible this way.'),
      klein: d('Nimm eine der betroffenen Zielgrößen heraus.', 'Nehmen Sie eine der betroffenen Zielgrößen heraus.', 'Leave out one of the affected outcomes.') };
    case 'hoch-korreliert': return { text: x.paar ? L(`${zitat(x.paar[0])} und ${zitat(x.paar[1])} hängen mit r = ${komma(x.rmax ?? 0, 2)} sehr eng zusammen. Dort ist eine Zielgröße fast die andere.`, `${zitat(x.paar[0])} and ${zitat(x.paar[1])} are very closely related, r = ${komma(x.rmax ?? 0, 2)}. There one outcome is almost the other.`)
      : L('Zwei Zielgrößen hängen sehr eng zusammen. Dort ist eine Zielgröße fast die andere.', 'Two outcomes are very closely related. There one outcome is almost the other.') };
    case 'r-fehler': return { text: L('R meldete bei der MANOVA einen Fehler.', 'R reported an error in the MANOVA.') };
  }
}
export function manovaPunkte(dt: ManovaDaten, name: (n: string) => string = x => x): KpPunkt[] {
  const ctx: ManovaSatzKontext = { n: dt.n, q: dt.ziele.length, k: dt.gruppenN.length, namen: dt.konstant.map(name), paar: dt.paar ? [name(dt.paar[0]), name(dt.paar[1])] : null, rmax: dt.rmax };
  const kopf: KpPunkt = { art: 'ok', text: Lp(dt.n, `${dt.n} Fall mit Angaben in allen Zielgrößen`, `${dt.n} Fälle mit Angaben in allen Zielgrößen`, `${dt.n} case with values in all outcomes`, `${dt.n} cases with values in all outcomes`),
    ...(dt.ausgelassen > 0 ? { klein: Lp(dt.ausgelassen, `${dt.ausgelassen} Zeile mit einer Lücke wird ausgelassen.`, `${dt.ausgelassen} Zeilen mit einer Lücke werden ausgelassen.`, `${dt.ausgelassen} row with a gap is left out.`, `${dt.ausgelassen} rows with a gap are left out.`) } : {}) };
  return [kopf, ...manovaCodes(dt).map((c): KpPunkt => { const s = manovaCodeSatz(c, ctx); return { art: MANOVA_SPERREN.has(c) ? 'sperre' : 'hinweis', text: s.text, ...(s.klein ? { klein: s.klein } : {}) }; })];
}

/* ------------------------------------------------------------ Aufruf und Antwort */
export function manovaAufruf(dt: ManovaDaten): RAufruf {
  return { code: rFange(`sp_manova(d, ${rIds(dt.ziele.map((_, k) => kpName(k)))}, 'g', ${rArg('stufen')})`), args: { stufen: dt.stufen } };
}
export interface ManovaTest { wert: number; F: number; df1: number; df2: number; p: number }
export interface ManovaEinzeln { F: number; df1: number; df2: number; p: number }
export interface ManovaE {
  gruppe: string; ziele: string[]; n: number; ausgelassen: number; q: number; k: number; gruppen: { name: string; n: number }[];
  pillai: ManovaTest; wilks: ManovaTest; hotelling: ManovaTest; roy: ManovaTest; einzeln: ManovaEinzeln[]; rmax: number; paar: [string, string] | null;
}
function testLesen(o: unknown): ManovaTest | null {
  if (!kpObjekt(o)) return null;
  const t = { wert: kpZahl(o.wert), F: kpZahl(o.F), df1: kpZahl(o.df1), df2: kpZahl(o.df2), p: kpZahl(o.p) };
  return Object.values(t).every(Number.isFinite) ? t : null;
}
export function manovaLesen(roh: unknown, dt: ManovaDaten): { ok: true; e: ManovaE } | { ok: false; code: ManovaCode } {
  if (!kpObjekt(roh)) return { ok: false, code: 'r-fehler' };
  if (roh.fehler !== undefined) { const t = kpText(roh.fehler); return { ok: false, code: t === 'kollinear' ? 'kollinear' : t === 'zu-wenig' ? 'zu-wenig-faelle' : 'r-fehler' }; }
  const pi = testLesen(roh.pillai), wi = testLesen(roh.wilks), ho = testLesen(roh.hotelling), ro = testLesen(roh.roy);
  const einzeln = kpArr<unknown>(roh.einzeln).map((o): ManovaEinzeln | null => kpObjekt(o) ? { F: kpZahl(o.F), df1: kpZahl(o.df1), df2: kpZahl(o.df2), p: kpZahl(o.p) } : null);
  const namen = kpArr<string>(roh.gruppen), ns = kpZahlen2(roh.gruppen_n);
  if (!pi || !wi || !ho || !ro || einzeln.length !== dt.ziele.length || einzeln.some(z => !z || !Number.isFinite(z.F)) || !namen.length || namen.length !== ns.length) return { ok: false, code: 'r-fehler' };
  return { ok: true, e: { gruppe: dt.gruppe, ziele: dt.ziele, n: kpZahl(roh.n), ausgelassen: kpZahl(roh.ausgelassen), q: kpZahl(roh.q), k: kpZahl(roh.k), gruppen: namen.map((name, i) => ({ name, n: ns[i]! })),
    pillai: pi, wilks: wi, hotelling: ho, roy: ro, einzeln: einzeln as ManovaEinzeln[], rmax: kpZahl(roh.rmax), paar: dt.paar } };
}

/* ------------------------------------------------------------ Sätze */
export function manovaWarnungen(e: ManovaE, name: (n: string) => string = spaltenName): string[] {
  const w: string[] = [
    L('Das Ergebnis sagt nur, dass sich die Gruppen in der Kombination der Zielgrößen unterscheiden. Es sagt nicht, in welcher Zielgröße oder zwischen welchen Gruppen.', 'The result only says that the groups differ in the combination of the outcomes. It does not say in which outcome or between which groups.'),
    manovaWarnMehrfach(),
    L('Roys Wert ist für F eine obere Grenze, sein p ist zu klein.', "Roy's value is an upper bound for F; its p is too small."),
    manovaWarnVoraus(),
  ];
  if (e.rmax > MANOVA_KORR_GRENZE) w.push(manovaCodeSatz('hoch-korreliert', { paar: e.paar ? [name(e.paar[0]), name(e.paar[1])] : null, rmax: e.rmax }).text);
  if (e.ausgelassen > 0) w.push(Lp(e.ausgelassen, `${e.ausgelassen} Zeile mit einer Lücke wurde ausgelassen.`, `${e.ausgelassen} Zeilen mit einer Lücke wurden ausgelassen.`, `${e.ausgelassen} row with a gap was left out.`, `${e.ausgelassen} rows with a gap were left out.`));
  return w;
}
const fTxt = (t: { F: number; df1: number; df2: number; p: number }) => `F(${komma(t.df1, 0)}, ${komma(t.df2, 0)}) = ${komma(t.F, 2)}, p ${pWert(t.p)}`;
export function saetzeManova(e: ManovaE, name: (n: string) => string = spaltenName): Saetze {
  const p = e.pillai, sig = p.p < 0.05, g = zitat(name(e.gruppe));
  const haupt = sig
    ? L(`Die ${e.k} Gruppen von ${g} unterscheiden sich in der Kombination der ${e.q} Zielgrößen (Pillai-Spur = ${komma(p.wert, 3)}, ${fTxt(p)}).`, `The ${e.k} groups of ${g} differ in the combination of the ${e.q} outcomes (Pillai's trace = ${komma(p.wert, 3)}, ${fTxt(p)}).`)
    : L(`Ein Unterschied der ${e.k} Gruppen von ${g} in der Kombination der ${e.q} Zielgrößen lässt sich nicht belegen (Pillai-Spur = ${komma(p.wert, 3)}, ${fTxt(p)}). Das heißt nicht, dass es keinen gibt.`, `A difference between the ${e.k} groups of ${g} in the combination of the ${e.q} outcomes cannot be shown (Pillai's trace = ${komma(p.wert, 3)}, ${fTxt(p)}). That does not mean there is none.`);
  const vier = L(`Die anderen Prüfgrößen: Wilks' Λ = ${ohneNull(e.wilks.wert, 3)} (p ${pWert(e.wilks.p)}), Hotelling-Lawley-Spur = ${komma(e.hotelling.wert, 3)} (p ${pWert(e.hotelling.p)}), Roys größte Wurzel = ${komma(e.roy.wert, 3)} (p ${pWert(e.roy.p)}, zu klein).`,
    `The other statistics: Wilks' Λ = ${ohneNull(e.wilks.wert, 3)} (p ${pWert(e.wilks.p)}), Hotelling-Lawley trace = ${komma(e.hotelling.wert, 3)} (p ${pWert(e.hotelling.p)}), Roy's largest root = ${komma(e.roy.wert, 3)} (p ${pWert(e.roy.p)}, too small).`);
  const apa = L(`Pillai-Spur = ${komma(p.wert, 3)}, ${fTxt(p)}`, `Pillai's trace = ${komma(p.wert, 3)}, ${fTxt(p)}`);
  return { haupt, zusatz: vier, vorsicht: manovaWarnungen(e, name).join(' '), apa, marken: [] };
}
export const manovaGerechnet = (): string => L('MANOVA (manova, Pillai-Spur als Hauptzeile)', 'MANOVA (manova, Pillai trace as the main line)');
export const manovaFachwort = (): string => L('MANOVA (Pillai-Spur, Wilks, Hotelling-Lawley, Roy)', 'MANOVA (Pillai trace, Wilks, Hotelling-Lawley, Roy)');
export const manovaWarum = (): string => L('Die Frage ist, ob sich Gruppen in mehreren Zahlen zugleich unterscheiden. Die MANOVA prüft das für die Kombination der Zielgrößen auf einmal. Als Hauptzeile nimmt Statable die Pillai-Spur, weil sie gegen verletzte Voraussetzungen am wenigsten empfindlich ist; Wilks, Hotelling-Lawley und Roy stehen daneben. Danach zeigt Statable je Zielgröße eine einfaktorielle Varianzanalyse. Die einzelnen Tests sind nicht gegen mehrfaches Testen abgesichert.',
  "The question is whether groups differ on several numbers at once. The MANOVA tests this for the combination of the outcomes in one step. Statable takes Pillai's trace as the main line because it is the least sensitive to violated assumptions; Wilks, Hotelling-Lawley and Roy are shown next to it. Statable then shows a one-way analysis of variance for each outcome. The individual tests are not protected against multiple testing.");

/* ------------------------------------------------------------ Tabellen */
export function tabellenManova(e: ManovaE, name: (n: string) => string = spaltenName): TableItem[] {
  const zeile = (text: string, t: ManovaTest): Z[] => [text, fx(t.wert, 4), fx(t.F, 3), fx(t.df1, 0), fx(t.df2, 0), fp(t.p)];
  const aus: TableItem[] = [];
  aus.push(tabelle('MANOVA Prüfgrößen', L('MANOVA: Prüfgrößen', 'MANOVA: test statistics'), [L('Prüfgröße', 'Statistic'), L('Wert', 'Value'), 'F', 'df1', 'df2', 'p'], [
    zeile(L('Pillai-Spur (Hauptzeile)', "Pillai's trace (main line)"), e.pillai), zeile("Wilks' Λ", e.wilks), zeile(L('Hotelling-Lawley-Spur', 'Hotelling-Lawley trace'), e.hotelling), zeile(L('Roys größte Wurzel', "Roy's largest root"), e.roy)],
    [L('Roys Wert ist für F eine obere Grenze; sein p ist zu klein.', "Roy's value is an upper bound for F; its p is too small."),
      L('Das Ergebnis gilt für die Kombination der Zielgrößen. Es sagt nicht, in welcher Zielgröße oder zwischen welchen Gruppen sich die Gruppen unterscheiden.', 'The result holds for the combination of the outcomes. It does not say in which outcome or between which groups the groups differ.')]));
  const ph = holm(e.einzeln.map(t => t.p));
  aus.push(tabelle('MANOVA Einzeln', L('Die einzelnen Zielgrößen', 'The individual outcomes'), [L('Zielgröße', 'Outcome'), 'F', 'df1', 'df2', 'p', holmKopf()],
    e.einzeln.map((t, i): Z[] => [name(e.ziele[i]!), fx(t.F, 3), fx(t.df1, 0), fx(t.df2, 0), fp(t.p), fp(ph[i]!)]),
    [holmFuss()]));
  aus.push(tabelle('MANOVA Gruppen', L('Die Gruppen', 'The groups'), [L('Gruppe', 'Group'), 'n'], [...e.gruppen.map((g): Z[] => [g.name, fx(g.n, 0)]), [L('Gesamt', 'Total'), fx(e.n, 0)]]));
  return aus;
}
/** R-Text zum Ansehen (wird nie ausgeführt). */
export function manovaRCode(gruppe: string, ziele: string[]): string {
  const zeilen = ziele.map(rs).join(', ');
  return [
    `# ${L('daten: die Tabelle in R (ohne Zeilen mit Lücken)', 'daten: your table in R (without rows with gaps)')}`,
    `g <- factor(daten$${rn(gruppe)})`, `Y <- as.matrix(daten[, c(${zeilen})])`, 'f <- manova(Y ~ g)',
    "for (t in c('Pillai', 'Wilks', 'Hotelling-Lawley', 'Roy')) print(summary(f, test = t))",
    `pj <- sapply(seq_len(ncol(Y)), function(j) anova(lm(Y[, j] ~ g))[1, 'Pr(>F)'])   # ${L('je Zielgröße, ohne Schutz vor mehrfachem Testen', 'for each outcome, without protection against multiple testing')}`,
    `p.adjust(pj, method = 'holm')   # ${holmRKommentar()}`
  ].join('\n');
}
