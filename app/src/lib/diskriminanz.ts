/**
 * Diskriminanzanalyse (Fachblatt docs/fachblaetter/KURSPAKET.md, Abschnitt 1): „Lässt sich die Gruppe eines Falls aus Zahlen erkennen?“
 * Daten für R, Sperren und Hinweise, Lesen der Antwort von `sp_diskr` (engine/statable-kurspaket.R), Sätze, Tabellen und der R-Text zum Ansehen.
 * Funktionen, Eigenwerte und Wilks hängen NICHT an den Vorwahrscheinlichkeiten (lda ohne prior, wie SPSS); sie wirken nur auf die Einteilung (gleich oder nach Gruppengröße).
 * SICHERHEIT: Der Aufruf enthält nur feste Wörter und Bezeichner (rIds); die Gruppen stehen als gebundenes Argument, die Werte nur in den Daten.
 */
import type { TableItem } from '../engine/types';
import type { RSpalte } from '../engine/webr';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { L, Lp, d } from './sitzung.svelte';
import { zitat, aufzaehlung, proz } from '../i18n/profil';
import { komma, ohneNull, pWert, type Saetze } from './ergebnis';
import { tabelle, fx, fo, fp, type Z } from './mwsaetze';
import { spaltenName } from './medmodsaetze';
import { rFange, rIds, rArg, rAnzeigeName as rn, rAnzeigeText as rs, rAnzeigeZahl } from '../engine/rsicher';
import type { RAufruf } from './kategreg';
import { kpName, kpZahlen, kpGruppen, kpIndex, kpInnerhalb, kpVollerRang, kpKonstant, kpArr, kpZahl, kpZahlen2, kpMatrix, kpText, kpObjekt, type KpPunkt } from './kpdaten';

export const R_PAKETE_DISKR = ['MASS'];
export const DISKR_MERKMALE_MAX = 30;
export type DiskrPrior = 'gleich' | 'groesse';

/* ------------------------------------------------------------ Daten für R und Sperren */
export interface DiskrDaten {
  spalten: RSpalte[]; stufen: string[]; gruppe: string; merkmale: string[];
  /** Fälle mit Angaben in der Gruppe und allen Zahlen; `ausgelassen`: Zeilen mit einer Lücke */
  n: number; ausgelassen: number;
  /** Fälle je Gruppe unter den vollständigen Zeilen, in der Ordnung von Statable (nur Gruppen mit Fällen) */
  gruppenN: { name: string; n: number }[];
  /** Zahlenspalten ohne Streuung unter den vollständigen Fällen */ konstant: string[];
  /** Streumatrix innerhalb der Gruppen hat vollen Rang (sonst ist eine Spalte berechenbar oder in den Gruppen konstant) */ vollerRang: boolean;
}
export function diskrDaten(gruppe: string, merkmale: string[], zeilen: Wert[][], spalten: Spalte[]): DiskrDaten {
  const gi = kpIndex(spalten, gruppe), gs = spalten.find(x => x.name === gruppe);
  if (!gs || gi < 0) throw new Error('Gruppenspalte fehlt');
  const gr = kpGruppen(gs, gi, zeilen);
  const zahlen = merkmale.map(m => { const i = kpIndex(spalten, m); return kpZahlen(spalten[i]!, i, zeilen); });
  const ok = zeilen.map((_, r) => gr.werte[r] !== null && zahlen.every(z => z[r] !== null));
  const idx = ok.flatMap((b, r) => (b ? [r] : []));
  const nr = new Map(gr.stufen.map((s, i) => [s, i]));
  const grp = idx.map(r => nr.get(gr.werte[r]!)!);
  const je = gr.stufen.map(() => 0); for (const g of grp) je[g]!++;
  const spaltenR: RSpalte[] = [{ name: 'g', art: 'text', werte: gr.werte }, ...zahlen.map((z, k): RSpalte => ({ name: kpName(k), art: 'zahl', werte: z }))];
  const cols = zahlen.map(z => idx.map(r => z[r]!));
  return {
    spalten: spaltenR, stufen: gr.stufen, gruppe, merkmale, n: idx.length, ausgelassen: zeilen.length - idx.length,
    gruppenN: gr.stufen.map((name, i) => ({ name, n: je[i]! })).filter(g => g.n > 0),
    konstant: merkmale.filter((_, k) => kpKonstant(cols[k]!)),
    vollerRang: idx.length > 0 && kpVollerRang(kpInnerhalb(cols, grp, gr.stufen.length))
  };
}

export type DiskrCode = 'merkmale-wenig' | 'gruppen-wenig' | 'zu-wenig-faelle' | 'gruppe-ein-fall' | 'gruppe-klein' | 'konstant' | 'kollinear' | 'faelle-je-merkmal' | 'r-fehler';
export const DISKR_SPERREN: ReadonlySet<DiskrCode> = new Set<DiskrCode>(['merkmale-wenig', 'gruppen-wenig', 'zu-wenig-faelle', 'gruppe-ein-fall', 'gruppe-klein', 'konstant', 'kollinear', 'r-fehler']);
/** Weniger als so viele Fälle je Zahlenspalte: Hinweis (Fachblatt). */
export const DISKR_FAELLE_JE_MERKMAL = 20;

/** Die Sperren und Hinweise aus den Daten, Sperren zuerst. */
export function diskrCodes(dt: DiskrDaten): DiskrCode[] {
  const p = dt.merkmale.length, aus: DiskrCode[] = [];
  if (p < 2) aus.push('merkmale-wenig');
  if (dt.gruppenN.length < 2) aus.push('gruppen-wenig');
  else if (dt.n <= dt.gruppenN.length) aus.push('zu-wenig-faelle');
  if (dt.gruppenN.length >= 2) {
    if (dt.gruppenN.some(g => g.n === 1)) aus.push('gruppe-ein-fall');
    else if (dt.gruppenN.some(g => g.n < p + 1)) aus.push('gruppe-klein');
  }
  if (dt.konstant.length) aus.push('konstant');
  else if (dt.n > 0 && !dt.vollerRang && !aus.includes('gruppe-ein-fall') && !aus.includes('gruppe-klein')) aus.push('kollinear');
  if (dt.n > 0 && dt.n < DISKR_FAELLE_JE_MERKMAL * p) aus.push('faelle-je-merkmal');
  return aus;
}
export interface DiskrSatzKontext { n?: number; p?: number; namen?: string[]; gruppe?: string; gruppeN?: number }
/** Der Satz zu einem Code (mit dem Grund, nicht die R-Meldung). */
export function diskrCodeSatz(c: DiskrCode, k: DiskrSatzKontext = {}): { text: string; klein?: string } {
  const n = k.n ?? 0, p = k.p ?? 0;
  switch (c) {
    case 'merkmale-wenig': return { text: L('Eine Diskriminanzanalyse braucht mindestens zwei Zahlenspalten.', 'A discriminant analysis needs at least two number columns.') };
    case 'gruppen-wenig': return { text: L('Es bleiben weniger als zwei Gruppen mit Angaben in allen gewählten Spalten.', 'Fewer than two groups with values in all chosen columns remain.') };
    case 'zu-wenig-faelle': return { text: L(`Zu wenige Fälle: Nach dem Weglassen der Zeilen mit einer Lücke bleiben ${n}.`, `Too few cases: ${n} remain after leaving out the rows with a gap.`) };
    case 'gruppe-ein-fall': return { text: L(`Die Gruppe ${zitat(k.gruppe ?? '')} hat nur einen Fall. Mit einem Fall lässt sich die Streuung innerhalb der Gruppe nicht schätzen.`, `The group ${zitat(k.gruppe ?? '')} has only one case. With one case the spread within the group cannot be estimated.`),
      klein: d('Nimm die Gruppe heraus oder fasse sie mit einer anderen zusammen.', 'Nehmen Sie die Gruppe heraus oder fassen Sie sie mit einer anderen zusammen.', 'Leave the group out or merge it with another one.') };
    case 'gruppe-klein': return { text: L(`Die Gruppe ${zitat(k.gruppe ?? '')} hat ${k.gruppeN ?? 0} Fälle. Nötig sind mindestens ${p + 1} (Zahl der Zahlenspalten plus 1).`, `The group ${zitat(k.gruppe ?? '')} has ${k.gruppeN ?? 0} cases. At least ${p + 1} are needed (number of number columns plus 1).`),
      klein: d('Nimm eine Zahlenspalte heraus oder fasse kleine Gruppen zusammen.', 'Nehmen Sie eine Zahlenspalte heraus oder fassen Sie kleine Gruppen zusammen.', 'Leave out a number column or merge small groups.') };
    case 'konstant': return { text: L(`Diese Spalten haben in allen Fällen denselben Wert: ${aufzaehlung((k.namen ?? []).map(zitat))}. Damit lässt sich nichts unterscheiden.`, `These columns have the same value in all cases: ${aufzaehlung((k.namen ?? []).map(zitat))}. Nothing can be told apart with them.`),
      klein: d('Nimm sie heraus.', 'Nehmen Sie sie heraus.', 'Leave them out.') };
    case 'kollinear': return { text: L('Eine Zahlenspalte lässt sich aus den anderen berechnen (zum Beispiel als Summe) oder ist innerhalb der Gruppen konstant. Die Rechnung ist so nicht möglich.', 'A number column can be calculated from the others (for example as a sum) or is constant within the groups. The calculation is not possible this way.'),
      klein: d('Nimm eine der betroffenen Spalten heraus.', 'Nehmen Sie eine der betroffenen Spalten heraus.', 'Leave out one of the affected columns.') };
    case 'faelle-je-merkmal': return { text: L(`Es gibt ${n} Fälle für ${p} Zahlenspalten, weniger als ${DISKR_FAELLE_JE_MERKMAL} je Spalte. Das Ergebnis kann instabil sein.`, `There are ${n} cases for ${p} number columns, fewer than ${DISKR_FAELLE_JE_MERKMAL} per column. The result can be unstable.`) };
    case 'r-fehler': return { text: L('R meldete bei der Diskriminanzanalyse einen Fehler.', 'R reported an error in the discriminant analysis.') };
  }
}
/** Die Prüfliste des Blatts. */
export function diskrPunkte(dt: DiskrDaten, name: (n: string) => string = x => x): KpPunkt[] {
  const p = dt.merkmale.length, codes = diskrCodes(dt);
  const klein = dt.gruppenN.length ? dt.gruppenN.slice().sort((a, b) => a.n - b.n)[0]! : undefined;
  const ctx: DiskrSatzKontext = { n: dt.n, p, namen: dt.konstant.map(name), gruppe: klein?.name, gruppeN: klein?.n };
  const kopf: KpPunkt = { art: 'ok', text: Lp(dt.n, `${dt.n} Fall mit Angaben in allen Spalten`, `${dt.n} Fälle mit Angaben in allen Spalten`, `${dt.n} case with values in all columns`, `${dt.n} cases with values in all columns`),
    ...(dt.ausgelassen > 0 ? { klein: Lp(dt.ausgelassen, `${dt.ausgelassen} Zeile mit einer Lücke wird ausgelassen.`, `${dt.ausgelassen} Zeilen mit einer Lücke werden ausgelassen.`, `${dt.ausgelassen} row with a gap is left out.`, `${dt.ausgelassen} rows with a gap are left out.`) } : {}) };
  return [kopf, ...codes.map((c): KpPunkt => { const s = diskrCodeSatz(c, ctx); return { art: DISKR_SPERREN.has(c) ? 'sperre' : 'hinweis', text: s.text, ...(s.klein ? { klein: s.klein } : {}) }; })];
}

/* ------------------------------------------------------------ Aufruf und Antwort */
export function diskrAufruf(dt: DiskrDaten): RAufruf {
  return { code: rFange(`sp_diskr(d, 'g', ${rIds(dt.merkmale.map((_, k) => kpName(k)))}, ${rArg('stufen')})`), args: { stufen: dt.stufen } };
}
export interface DiskrEinteilung { tabelle: number[][]; tabelleLoo: number[][]; treffer: number; trefferLoo: number }
/** Das, was am Blatt gespeichert wird. Die Zahlen kommen aus R; Sätze und Tabellen entstehen bei jedem Aufruf neu (folgen der Sprache). */
export interface DiskrE {
  gruppe: string; merkmale: string[]; n: number; ausgelassen: number; k: number; p: number; gruppen: { name: string; n: number }[];
  eigen: number[]; anteil: number[]; kanon: number[]; wilks: number[]; chi: number[]; df: number[]; pw: number[];
  /** [Funktion][Zahlenspalte] */ standard: number[][]; /** [Gruppe][Funktion] */ zentroide: number[][];
  einteilung: Record<DiskrPrior, DiskrEinteilung>; prior: DiskrPrior;
}
function einteilungLesen(o: unknown): DiskrEinteilung | null {
  if (!kpObjekt(o)) return null;
  const r: DiskrEinteilung = { tabelle: kpMatrix(o.tabelle), tabelleLoo: kpMatrix(o.tabelle_loo), treffer: kpZahl(o.treffer), trefferLoo: kpZahl(o.treffer_loo) };
  return Number.isFinite(r.treffer) && Number.isFinite(r.trefferLoo) && r.tabelle.length > 0 ? r : null;
}
/** Die Antwort von R lesen. Wirft nie. */
export function diskrLesen(roh: unknown, dt: DiskrDaten): { ok: true; e: DiskrE } | { ok: false; code: DiskrCode } {
  if (!kpObjekt(roh)) return { ok: false, code: 'r-fehler' };
  if (roh.fehler !== undefined) { const t = kpText(roh.fehler); return { ok: false, code: t === 'kollinear' ? 'kollinear' : t === 'zu-wenig' ? 'zu-wenig-faelle' : 'r-fehler' }; }
  const gl = einteilungLesen(roh.gleich), gr = einteilungLesen(roh.groesse), namen = kpArr<string>(roh.gruppen), ns = kpZahlen2(roh.gruppen_n);
  const eigen = kpZahlen2(roh.eigen);
  if (!gl || !gr || !eigen.length || !namen.length || namen.length !== ns.length || eigen.some(v => !Number.isFinite(v))) return { ok: false, code: 'r-fehler' };
  const e: DiskrE = {
    gruppe: dt.gruppe, merkmale: dt.merkmale, n: kpZahl(roh.n), ausgelassen: kpZahl(roh.ausgelassen), k: kpZahl(roh.k), p: kpZahl(roh.p), gruppen: namen.map((name, i) => ({ name, n: ns[i]! })),
    eigen, anteil: kpZahlen2(roh.anteil), kanon: kpZahlen2(roh.kanon), wilks: kpZahlen2(roh.wilks), chi: kpZahlen2(roh.chi), df: kpZahlen2(roh.df), pw: kpZahlen2(roh.pw),
    standard: kpMatrix(roh.standard), zentroide: kpMatrix(roh.zentroide), einteilung: { gleich: gl, groesse: gr }, prior: 'gleich'
  };
  const m = eigen.length;
  if (![e.anteil, e.kanon, e.wilks, e.chi, e.df, e.pw].every(v => v.length === m) || e.standard.length !== m || e.standard.some(z => z.length !== e.p) || e.zentroide.length !== e.k) return { ok: false, code: 'r-fehler' };
  return { ok: true, e };
}
export const diskrFehlerSatz = (c: DiskrCode, k: DiskrSatzKontext = {}): string => diskrCodeSatz(c, k).text;

/* ------------------------------------------------------------ Sätze */
const quote = (v: number) => proz(komma(v * 100, 1));
/** Die Quote ohne jede Rechnung: immer die größte Gruppe vorhersagen. */
export const diskrGrundquote = (e: DiskrE): number => Math.max(...e.gruppen.map(g => g.n)) / e.n;
export const diskrGewaehlt = (e: DiskrE): DiskrEinteilung => e.einteilung[e.prior];
const priorText = (p: DiskrPrior) => (p === 'gleich' ? L('für alle Gruppen gleich', 'equal for all groups') : L('nach der Größe der Gruppen', 'by the size of the groups'));

/** Die Hinweise zur Deutung; sie stehen immer sichtbar. */
export function diskrWarnungen(e: DiskrE): string[] {
  const w: string[] = [
    L('Die gelernte Trefferquote ist zu gut, weil dieselben Fälle gelernt und geprüft wurden. Maßgeblich ist die Prüfung ohne den Fall selbst (Leave-one-out). Beide Werte stehen im Ergebnis.', 'The learned hit rate is too good because the same cases were learned and checked. What counts is the check without the case itself (leave-one-out). Both values are shown.'),
    L('Die Rechnung setzt gleiche Kovarianzen in den Gruppen und annähernd normalverteilte Zahlen voraus. Statable prüft das nicht mit einem Test.', 'The calculation assumes equal covariances in the groups and approximately normally distributed numbers. Statable does not check this with a test.'),
    L('Das Vorzeichen einer Funktion ist willkürlich: Statable setzt den ersten Koeffizienten jeder Funktion positiv. SPSS kann das umgekehrte Vorzeichen zeigen.', 'The sign of a function is arbitrary: Statable sets the first coefficient of each function positive. SPSS may show the opposite sign.')
  ];
  if (e.n < DISKR_FAELLE_JE_MERKMAL * e.p) w.push(diskrCodeSatz('faelle-je-merkmal', { n: e.n, p: e.p }).text);
  if (e.ausgelassen > 0) w.push(Lp(e.ausgelassen, `${e.ausgelassen} Zeile mit einer Lücke wurde ausgelassen.`, `${e.ausgelassen} Zeilen mit einer Lücke wurden ausgelassen.`, `${e.ausgelassen} row with a gap was left out.`, `${e.ausgelassen} rows with a gap were left out.`));
  return w;
}
export function saetzeDiskr(e: DiskrE, name: (n: string) => string = spaltenName): Saetze {
  const z = diskrGewaehlt(e), grund = diskrGrundquote(e), m = e.eigen.length;
  const haupt = L(`Die ${e.k} Gruppen von ${zitat(name(e.gruppe))} wurden aus ${e.p} Zahlen eingeteilt: Bei der Prüfung ohne den Fall selbst (Leave-one-out) stimmte die Einteilung bei ${quote(z.trefferLoo)} der ${e.n} Fälle. Ohne jede Rechnung, nur mit der größten Gruppe, wären es ${quote(grund)}.`,
    `The ${e.k} groups of ${zitat(name(e.gruppe))} were classified from ${e.p} numbers: in the check without the case itself (leave-one-out) the classification was right for ${quote(z.trefferLoo)} of the ${e.n} cases. Without any calculation, using only the largest group, it would be ${quote(grund)}.`);
  const erste = L(`Die erste Funktion trennt die Gruppen am stärksten (Anteil ${quote(e.anteil[0]!)}, kanonische Korrelation ${ohneNull(e.kanon[0]!, 3)}). Test aller ${m} Funktionen: Wilks' Λ = ${ohneNull(e.wilks[0]!, 3)}, χ²(${komma(e.df[0]!, 0)}) = ${komma(e.chi[0]!)}, p ${pWert(e.pw[0]!)}.`,
    `The first function separates the groups most strongly (share ${quote(e.anteil[0]!)}, canonical correlation ${ohneNull(e.kanon[0]!, 3)}). Test of all ${m} functions: Wilks' Λ = ${ohneNull(e.wilks[0]!, 3)}, χ²(${komma(e.df[0]!, 0)}) = ${komma(e.chi[0]!)}, p ${pWert(e.pw[0]!)}.`);
  const treffer = L(`Gelernt stimmte die Einteilung bei ${quote(z.treffer)} der Fälle. Die Vorwahrscheinlichkeit war ${priorText(e.prior)}.`,
    `Learned, the classification was right for ${quote(z.treffer)} of the cases. The prior probability was ${priorText(e.prior)}.`);
  const apa = L(`Wilks' Λ = ${ohneNull(e.wilks[0]!, 3)}, χ²(${komma(e.df[0]!, 0)}) = ${komma(e.chi[0]!)}, p ${pWert(e.pw[0]!)}; Leave-one-out ${quote(z.trefferLoo)} richtig (größte Gruppe ${quote(grund)})`,
    `Wilks' Λ = ${ohneNull(e.wilks[0]!, 3)}, χ²(${komma(e.df[0]!, 0)}) = ${komma(e.chi[0]!)}, p ${pWert(e.pw[0]!)}; leave-one-out ${quote(z.trefferLoo)} correct (largest group ${quote(grund)})`);
  return { haupt, zusatz: `${erste} ${treffer}`, vorsicht: diskrWarnungen(e).join(' '), apa, marken: [] };
}
export const diskrGerechnet = (e: DiskrE): string => L(`Diskriminanzanalyse (lda, Vorwahrscheinlichkeit ${priorText(e.prior)})`, `Discriminant analysis (lda, prior probability ${priorText(e.prior)})`);
export const diskrFachwort = (): string => L('Diskriminanzanalyse (lineare Diskriminanzfunktionen, Leave-one-out)', 'discriminant analysis (linear discriminant functions, leave-one-out)');
export const diskrWarum = (): string => L('Die Frage ist, ob sich die Gruppe eines Falls aus mehreren Zahlen erkennen lässt. Die Diskriminanzanalyse sucht Funktionen aus diesen Zahlen, die die Gruppen am besten trennen, und teilt jeden Fall der Gruppe zu, zu der er am besten passt. Die Trefferquote auf denselben Fällen ist zu gut; darum prüft Statable zusätzlich jeden Fall mit einer Einteilung, die ihn selbst nicht kennt (Leave-one-out), und nennt die Quote, die ohne jede Rechnung möglich wäre.',
  'The question is whether the group of a case can be recognized from several numbers. The discriminant analysis looks for functions of these numbers that separate the groups best, and assigns each case to the group it fits best. The hit rate on the same cases is too good; so Statable also checks every case with a classification that does not know it (leave-one-out), and gives the rate that would be possible without any calculation.');

/* ------------------------------------------------------------ Tabellen */
export function tabellenDiskr(e: DiskrE, name: (n: string) => string = spaltenName): TableItem[] {
  const m = e.eigen.length, aus: TableItem[] = [], z = diskrGewaehlt(e);
  const funk = (j: number) => L(`Funktion ${j + 1}`, `Function ${j + 1}`);
  let kum = 0;
  aus.push(tabelle('Diskriminanz Eigenwerte', L('Eigenwerte der Funktionen', 'Eigenvalues of the functions'), [L('Funktion', 'Function'), L('Eigenwert', 'Eigenvalue'), L('Anteil (%)', 'Share (%)'), L('Kumuliert (%)', 'Cumulative (%)'), L('Kanonische Korrelation', 'Canonical correlation')],
    e.eigen.map((v, j): Z[] => { kum += e.anteil[j]!; return [funk(j), fx(v, 3), fx(e.anteil[j]! * 100, 1), fx(kum * 100, 1), fo(e.kanon[j]!, 3)]; }),
    [L('Die Eigenwerte hängen nicht von den Vorwahrscheinlichkeiten ab.', 'The eigenvalues do not depend on the prior probabilities.')]));
  aus.push(tabelle('Diskriminanz Wilks', L("Wilks' Lambda", "Wilks' lambda"), [L('Test der Funktionen', 'Test of functions'), "Wilks' Λ", 'χ²', 'df', 'p'],
    e.wilks.map((w, j): Z[] => [j === 0 ? (m === 1 ? '1' : `1 ${L('bis', 'to')} ${m}`) : (m - j === 1 ? String(m) : `${j + 1} ${L('bis', 'to')} ${m}`), fo(w, 3), fx(e.chi[j]!, 2), fx(e.df[j]!, 0), fp(e.pw[j]!)])));
  aus.push(tabelle('Diskriminanz Koeffizienten', L('Standardisierte Koeffizienten der Funktionen', 'Standardized coefficients of the functions'), [L('Zahl', 'Number'), ...e.standard.map((_, j) => funk(j))],
    e.merkmale.map((mk, i): Z[] => [name(mk), ...e.standard.map(f => fx(f[i]!, 3))]),
    [L('Das Vorzeichen ist willkürlich: Der erste Koeffizient jeder Funktion ist positiv gesetzt. SPSS kann das umgekehrte Vorzeichen zeigen.', 'The sign is arbitrary: the first coefficient of each function is set positive. SPSS may show the opposite sign.')]));
  aus.push(tabelle('Diskriminanz Zentroide', L('Funktionen an den Gruppenmitteln', 'Functions at the group means'), [L('Gruppe', 'Group'), ...e.eigen.map((_, j) => funk(j))],
    e.gruppen.map((g, i): Z[] => [g.name, ...e.zentroide[i]!.map(v => fx(v, 3))])));
  const einT = (t: number[][], label: string, titel: string, fuss: string[]) => tabelle(label, titel, [L('Tatsächliche Gruppe', 'Actual group'), ...e.gruppen.map(g => g.name), L('Gesamt', 'Total'), L('Richtig (%)', 'Correct (%)')],
    t.map((row, i): Z[] => { const s = row.reduce((a, b) => a + b, 0); return [e.gruppen[i]!.name, ...row.map(v => String(v)), String(s), fx(s > 0 ? (row[i]! / s) * 100 : NaN, 1)]; }), fuss);
  aus.push(einT(z.tabelle, 'Diskriminanz Einteilung', L('Einteilung der Fälle (gelernt)', 'Classification of the cases (learned)'), [L('Zeilen: tatsächliche Gruppe, Spalten: zugeteilte Gruppe. Dieselben Fälle wurden gelernt und geprüft; die Quote ist zu gut.', 'Rows: actual group, columns: assigned group. The same cases were learned and checked; the rate is too good.')]));
  aus.push(einT(z.tabelleLoo, 'Diskriminanz Leave-one-out', L('Einteilung der Fälle (Leave-one-out)', 'Classification of the cases (leave-one-out)'), [L('Jeder Fall wurde mit einer Einteilung geprüft, die ihn selbst nicht kannte. Das ist der maßgebliche Wert.', 'Each case was checked with a classification that did not know it. This is the value that counts.')]));
  aus.push(tabelle('Diskriminanz Trefferquote', L('Trefferquote', 'Hit rate'), [L('Quote', 'Rate'), L('Richtig (%)', 'Correct (%)')], [
    [L('Gelernt (zu gut)', 'Learned (too good)'), fx(z.treffer * 100, 2)], [L('Leave-one-out (maßgeblich)', 'Leave-one-out (counts)'), fx(z.trefferLoo * 100, 2)], [L('Ohne Rechnung (größte Gruppe)', 'Without calculation (largest group)'), fx(diskrGrundquote(e) * 100, 2)]],
    [L(`Vorwahrscheinlichkeit: ${priorText(e.prior)}.`, `Prior probability: ${priorText(e.prior)}.`)]));
  return aus;
}

/** R-Text zum Ansehen (wird nie ausgeführt). */
export function diskrRCode(gruppe: string, merkmale: string[], prior: DiskrPrior = 'gleich'): string {
  const spalten = `c(${merkmale.map(rs).join(', ')})`;
  const pr = prior === 'gleich' ? 'rep(1 / nlevels(g), nlevels(g))' : 'as.numeric(table(g)) / length(g)';
  return [
    `# ${L('daten: die Tabelle in R (ohne Zeilen mit Lücken)', 'daten: your table in R (without rows with gaps)')}`,
    'library(MASS)',
    `g <- factor(daten$${rn(gruppe)})`, `X <- as.matrix(daten[, ${spalten}])`,
    `# ${L('Funktionen, Eigenwerte und Wilks ohne prior: sie hängen nicht von den Vorwahrscheinlichkeiten ab', 'functions, eigenvalues and Wilks without prior: they do not depend on the prior probabilities')}`,
    'f <- lda(X, g)', 'eigenwerte <- f$svd^2 * (nlevels(g) - 1) / (nrow(X) - nlevels(g))',
    prior === 'gleich' ? `# ${L('Einteilung mit gleicher Vorwahrscheinlichkeit für alle Gruppen', 'classification with equal prior probability for all groups')}` : `# ${L('Einteilung mit der Vorwahrscheinlichkeit nach der Größe der Gruppen', 'classification with the prior probability by the size of the groups')}`,
    `pr <- ${pr}`, 'predict(f, X, prior = pr)$class', 'lda(X, g, prior = pr, CV = TRUE)$class   # Leave-one-out'
  ].join('\n');
}
