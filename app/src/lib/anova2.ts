/**
 * Zweifaktorielle Varianzanalyse (G3) und Kovarianzanalyse (G6) - Fachblatt Welle 2, Paket A (docs/fachblaetter/WELLE2-PSYCHOLOGIE.md).
 * Sollwerte: scripts/anova2-ancova-erwartet.R (R 4.6.1: car::Anova Typ III mit contr.sum, afex, emmeans, effectsize), Tests: anova2.test.ts, anova2-pspp.test.ts.
 *
 * G3: PSPP `GLM y BY a b /DESIGN=a b a*b` liefert die Typ-III-Tabelle (SS, df, F, p) und den Fehlerterm. Alles Übrige rechnet dieses Modul aus den Rohdaten
 * und dem Fehlerterm des Gesamtmodells: partielles η² mit zweiseitigem 95-%-Intervall (effektki.ts), Zellmittel mit Intervall (t mit df_Fehler, gepoolter Fehler, wie
 * emmeans), einfache Effekte (gemeinsamer Fehlerterm, wie emmeans::joint_tests) mit Holm über die Stufen des festen Faktors.
 * Fallen (vom Prüfer an PSPP 2.1.1 gemessen): GLM wirft Text-Faktoren still aus dem Modell (die Faktoren müssen Zahlen sein: `anova2Lauf` kodiert Text vorher in
 * Zahlen); bei ungleichen Zellen fehlt die Zeile „Intercept“ (die Effektzeilen werden darum von der Zeile „Error“ aus gezählt, nicht nach Namen - Variablenbezeichnungen
 * ändern die Zeilennamen); bei einer leeren Zelle meldet PSPP nichts und rechnet Unsinn - `leereZellen` fängt sie vorher ab, `anova2` liefert dann `null`.
 *
 * G6: GLM kennt in PSPP 2.1.1 keine Kovariate. Statable rechnet vier Regressionen mit denselben Fällen (Dummies der Gruppe wie regfaktor.ts): Gruppe + Kovariate (Fehlerterm,
 * gemeinsame Steigung b, R²), nur Kovariate (Gruppentest Typ III = Zuwachs an Rest-SS), nur Gruppe (Kovariatentest Typ III), Gruppe + Kovariate + Produkte (Test der
 * Steigungen). Adjustierte Mittel beim Mittelwert der Kovariate mit t-Intervall; Paarvergleiche der adjustierten Mittel mit Holm.
 * ⚠ von der Fachperson abzunehmen: Typ III, Holm, Intervall zweiseitig 95 %, Test der Steigungen nur berichtet (kein automatischer Wechsel des Modells).
 */
import type { OutputItem, TableItem } from '../engine/types';
import { zitWert, pk } from './befehlstext';
import { finde, raster, spalte } from './tabelle';
import { betai, tQuantil } from './verteilung';
import { eta2Bereich } from './effektki';
import { holm } from './rangtests';
import { invers } from './robustse';
import { ptukey } from './posthoc';
import { regRecodes, type RegFaktor } from './regfaktor';
import { L } from './sitzung.svelte';

/* ------------------------------------------------------------ Hilfen */

/** p der F-Verteilung (oberer Rand), auch für sehr kleine Werte genau. */
const pF = (f: number, df1: number, df2: number) => (f > 0 && df1 > 0 && df2 > 0 ? betai(df2 / 2, df1 / 2, df2 / (df2 + df1 * f)) : 1);
/** p zweiseitig der t-Verteilung. */
const pT = (t: number, df: number) => (df > 0 ? betai(df / 2, 0.5, df / (df + t * t)) : NaN);
const gueltig = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);
const leer = (v: string | undefined | null) => v === undefined || v === null || v === '';
const summe = (a: number[]) => a.reduce((x, y) => x + y, 0);
/** Gemeinsame Felder eines Effekts. */
export interface Effekt2 { ss: number; df: number; f: number; p: number; etaP: number; etaPLo: number; etaPHi: number;
  /** ω² und partielles ω² (nur bei der zweifaktoriellen Varianzanalyse; Field-Stufe 2) - ungekürzt, kann unter 0 liegen. */ omega2?: number; omega2P?: number }
/** Effekt aus SS, df, F, p und dem Fehlerterm: etaP = SS / (SS + SS_Fehler), 95-%-Intervall zweiseitig über das nichtzentrale F (effektki.ts). */
function effekt(ss: number, df: number, f: number, p: number, sse: number, dfe: number): Effekt2 {
  const [etaPLo, etaPHi] = eta2Bereich(f, df, dfe);
  return { ss, df, f, p, etaP: ss / (ss + sse), etaPLo, etaPHi };
}
const fehlerTerm = (ss: number, df: number) => ({ ss, df, ms: ss / df });

/* ------------------------------------------------------------ G3 */

export interface Anova2Daten { a: string[]; b: string[]; y: (number | null)[]; aStufen: string[]; bStufen: string[] }
export interface Zelle2 { a: string; b: string; n: number; mittel: number; sd: number; se: number; lo: number; hi: number }
export interface Einfach2 { stufe: string; df1: number; df2: number; f: number; p: number; pHolm: number }
export interface Anova2 {
  art: 'anova2'; n: number;
  a: Effekt2; b: Effekt2; ab: Effekt2; fehler: { ss: number; df: number; ms: number };
  zellen: Zelle2[];
  einfachAJeB: Einfach2[];
  einfachBJeA: Einfach2[];
  wechselwirkungBedeutsam: boolean;
  /** Randmittel und ihre Paarvergleiche je Faktor mit drei und mehr Stufen (Field-Stufe 2); fehlt bei zwei Stufen. */
  randA?: Randmittel2; randB?: Randmittel2;
  /** Levene-Test auf gleiche Streuung in den Zellen (Abweichung vom Zellmittel, wie PSPP ONEWAY): nur beschreibend, entscheidet nichts. */
  levene?: { f: number; df1: number; df2: number; p: number };
}

/** Randmittel eines Faktors (ungewichtetes Mittel der Zellmittel über den anderen Faktor, wie emmeans) mit Paarvergleichen über die gemeinsame Fehlervarianz des Gesamtmodells.
 *  Differenz = erste genannte Stufe minus zweite (wie emmeans); Tukey (Kramer) und Bonferroni über alle Paare. */
export interface Randmittel2 { faktor: 'a' | 'b'; stufen: { name: string; mittel: number; se: number; lo: number; hi: number }[]; paare: { i: number; j: number; diff: number; se: number; df: number; t: number; pTukey: number; pBonferroni: number }[] }

/** Randmittel von `faktor`: Zellmittel `z[i][j]` (i = Stufe dieses Faktors, j = Stufe des anderen) mit Zellgrößen `n[i][j]`. */
export function randmittel(faktor: 'a' | 'b', namen: string[], z: number[][], n: number[][], mse: number, dfe: number): Randmittel2 {
  const J = z[0]!.length, k = namen.length, t975 = tQuantil(0.975, dfe);
  const mittel = z.map(r => summe(r) / J), vari = n.map(r => (mse / (J * J)) * summe(r.map(x => 1 / x)));
  const stufen = namen.map((name, i) => ({ name, mittel: mittel[i]!, se: Math.sqrt(vari[i]!), lo: mittel[i]! - t975 * Math.sqrt(vari[i]!), hi: mittel[i]! + t975 * Math.sqrt(vari[i]!) }));
  const paare: Randmittel2['paare'] = [], m = (k * (k - 1)) / 2;
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const diff = mittel[i]! - mittel[j]!, se = Math.sqrt((mse / (J * J)) * summe(n[i]!.map((x, c) => 1 / x + 1 / n[j]![c]!))), t = diff / se;
    paare.push({ i, j, diff, se, df: dfe, t, pTukey: Math.max(0, 1 - ptukey(Math.SQRT2 * Math.abs(t), k, dfe)), pBonferroni: Math.min(1, pT(t, dfe) * m) });
  }
  return { faktor, stufen, paare };
}

/** Die Fälle mit gültigem y und beiden Gruppenangaben. */
const faelle2 = (d: Anova2Daten) => d.y.flatMap((y, i) => (gueltig(y) && !leer(d.a[i]) && !leer(d.b[i]) ? [i] : []));

/** Kombinationen aStufe × bStufe ohne gültigen Fall (nach Wegfall fehlender y), a-Stufe zuerst. PSPP meldet leere Zellen nicht - darum fängt Statable sie selbst ab. */
export function leereZellen(d: Anova2Daten): { a: string; b: string }[] {
  const belegt = new Set(faelle2(d).map(i => `${d.a[i]}\u0000${d.b[i]}`));
  return d.aStufen.flatMap(a => d.bStufen.filter(b => !belegt.has(`${a}\u0000${b}`)).map(b => ({ a, b })));
}

/** PSPP-Syntax. Die Faktoren müssen Zahlen sein (Text wirft PSPP still aus dem Modell): Text-Gruppen kodiert der Aufrufer vorher (`anova2Lauf`). */
export const anova2Befehl = (y: string, a: string, b: string): string => `GLM ${y} BY ${a} ${b}\n  /DESIGN=${a} ${b} ${a}*${b}.`;

/** Eine Gruppen-Spalte für den GLM-Lauf: eine Zahlenspalte geht, wie sie ist; Text wird in Zahlen kodiert (1, 2, 3 in der Reihenfolge von `werte`). */
export interface Kodierung { spalte: string; text: boolean; werte: string[] }
/** Der ganze Lauf für das Blatt: Text-Gruppen werden nur für diese Rechnung in Zahlen kodiert (TEMPORARY), die Daten bleiben unverändert. `vergeben`: alle Spaltennamen. */
export function anova2Lauf(y: string, a: Kodierung, b: Kodierung, vergeben: string[] = []): string {
  const belegt = new Set(vergeben.map(n => n.toUpperCase()));
  const q = zitWert;   // lib/befehlstext.ts
  const kodiere = (k: Kodierung, nr: number): { name: string; recode: string } => {
    if (!k.text) return { name: k.spalte, recode: '' };
    let n = `${k.spalte.slice(0, 58)}_F${nr}`;
    while (belegt.has(n.toUpperCase())) n += 'x';
    belegt.add(n.toUpperCase());
    return { name: n, recode: `RECODE ${k.spalte} ${k.werte.map((w, i) => `(${q(w)}=${i + 1})`).join(' ')} INTO ${n}.` };
  };
  const ka = kodiere(a, 1), kb = kodiere(b, 2);
  const recode = [ka.recode, kb.recode].filter(Boolean).join('\n');
  const kopf = `* ${L('Zweifaktorielle Varianzanalyse, Quadratsummen vom Typ III (wie SPSS); Statable ergänzt Zellmittel, Effektstärken und einfache Effekte.', 'Two-way analysis of variance, Type III sums of squares (as in SPSS); Statable adds cell means, effect sizes and simple effects.')}`;
  const glm = anova2Befehl(y, ka.name, kb.name);
  return recode
    ? `${kopf}\n* ${L('Text-Gruppen gehen als Zahlen ein (PSPP rechnet nur mit Zahlen als Faktoren); die Zahlen gelten nur für die nächste Rechnung (TEMPORARY).', 'Text groups enter as numbers (PSPP only uses numbers as factors); the numbers exist only for the next calculation (TEMPORARY).')}\nTEMPORARY.\n${recode}\n${glm}`
    : `${kopf}\n${glm}`;
}

/** Ergebnis aus der GLM-Tabelle und den Rohdaten; `null` bei leerer Zelle (kein Ergebnis) oder weniger als zwei Stufen je Faktor. */
export function anova2(items: OutputItem[], d: Anova2Daten): Anova2 | null {
  if (leereZellen(d).length || d.aStufen.length < 2 || d.bStufen.length < 2) return null;
  const t = finde(items, /^Tests of Between-Subjects Effects$/);
  if (!t) throw new Error('GLM-Tabelle fehlt');
  const c = { ss: spalte(t, /^Type III Sum Of Squares$/), df: spalte(t, /^df$/), f: spalte(t, /^F$/), p: spalte(t, /^Sig\.$/) };
  const err = t.t.findIndex(z => z[0] === 'Error');
  if (err < 3) throw new Error('GLM-Tabelle ohne Fehlerzeile');
  const zahl = (i: number, k: number) => { const v = t.n[i]![k]; if (v === undefined || Number.isNaN(v)) throw new Error('Zahl fehlt in der GLM-Tabelle'); return v; };
  const fehler = fehlerTerm(zahl(err, c.ss), zahl(err, c.df));
  const zeile = (i: number) => effekt(zahl(i, c.ss), zahl(i, c.df), zahl(i, c.f), zahl(i, c.p), fehler.ss, fehler.df);
  const [ea, eb, eab] = [zeile(err - 3), zeile(err - 2), zeile(err - 1)] as const;
  // ω² = (SS − df·MSE) / (SS gesamt + MSE) und partielles ω² = (SS − df·MSE) / (SS + (N − df)·MSE) - wie das R-Skript der Sollwerte; N = Fehler-df + Zahl der Parameter. SS gesamt = Summe der vier Zeilen (bei ungleichen Zellen nur ungefähr).
  const nGes = fehler.df + d.aStufen.length * d.bStufen.length, ssGes = ea.ss + eb.ss + eab.ss + fehler.ss;
  for (const ef of [ea, eb, eab]) { ef.omega2 = (ef.ss - ef.df * fehler.ms) / (ssGes + fehler.ms); ef.omega2P = (ef.ss - ef.df * fehler.ms) / (ef.ss + (nGes - ef.df) * fehler.ms); }

  const fall = faelle2(d);
  const t975 = tQuantil(0.975, fehler.df);
  const zellen: Zelle2[] = d.aStufen.flatMap(a => d.bStufen.map(b => {
    const y = fall.filter(i => d.a[i] === a && d.b[i] === b).map(i => d.y[i] as number);
    const n = y.length, m = summe(y) / n, sd = n > 1 ? Math.sqrt(summe(y.map(v => (v - m) ** 2)) / (n - 1)) : NaN;
    const se = Math.sqrt(fehler.ms / n);
    return { a, b, n, mittel: m, sd, se, lo: m - t975 * se, hi: m + t975 * se };
  }));
  const zelle = (a: string, b: string) => zellen.find(z => z.a === a && z.b === b)!;
  /** Alle Zellmittel einer Zeile (oder Spalte) gleich? Gemeinsamer Fehlerterm: F = Σ n·(m − m̄ gewichtet)² / ((k − 1) · MSE). */
  const einfach = (stufe: string, zs: Zelle2[]): Omit<Einfach2, 'pHolm'> => {
    const nGes = summe(zs.map(z => z.n)), mw = summe(zs.map(z => z.n * z.mittel)) / nGes;
    const df1 = zs.length - 1, f = summe(zs.map(z => z.n * (z.mittel - mw) ** 2)) / df1 / fehler.ms;
    return { stufe, df1, df2: fehler.df, f, p: pF(f, df1, fehler.df) };
  };
  const mitHolm = (l: Omit<Einfach2, 'pHolm'>[]): Einfach2[] => { const h = holm(l.map(x => x.p)); return l.map((x, i) => ({ ...x, pHolm: h[i]! })); };
  const einfachAJeB = mitHolm(d.bStufen.map(b => einfach(b, d.aStufen.map(a => zelle(a, b)))));
  const einfachBJeA = mitHolm(d.aStufen.map(a => einfach(a, d.bStufen.map(b => zelle(a, b)))));
  const mat = (f: (a: string, b: string) => number) => d.aStufen.map(a => d.bStufen.map(b => f(a, b)));
  const randA = d.aStufen.length >= 3 ? randmittel('a', d.aStufen, mat((a, b) => zelle(a, b).mittel), mat((a, b) => zelle(a, b).n), fehler.ms, fehler.df) : undefined;
  const randB = d.bStufen.length >= 3 ? randmittel('b', d.bStufen, d.bStufen.map(b => d.aStufen.map(a => zelle(a, b).mittel)), d.bStufen.map(b => d.aStufen.map(a => zelle(a, b).n)), fehler.ms, fehler.df) : undefined;
  return { art: 'anova2', n: fall.length, a: ea, b: eb, ab: eab, fehler, zellen, einfachAJeB, einfachBJeA, wechselwirkungBedeutsam: eab.p < 0.05, ...(randA ? { randA } : {}), ...(randB ? { randB } : {}), levene: levene(d, fall, zellen) };
}

/** Levene-Test über alle Zellen: Varianzanalyse der Beträge |y − Zellmittel| (Mittel als Mitte, wie SPSS und PSPP). `undefined`, wenn nicht rechenbar. */
function levene(d: Anova2Daten, fall: number[], zellen: Zelle2[]): Anova2['levene'] {
  const k = zellen.length, N = fall.length;
  if (N - k < 1 || k < 2) return undefined;
  const abw = zellen.map(z => fall.filter(i => d.a[i] === z.a && d.b[i] === z.b).map(i => Math.abs((d.y[i] as number) - z.mittel)));
  const gm = summe(abw.map(summe)) / N, mz = abw.map(a => summe(a) / a.length);
  const zw = summe(abw.map((a, j) => a.length * (mz[j]! - gm) ** 2)), inn = summe(abw.map((a, j) => summe(a.map(v => (v - mz[j]!) ** 2))));
  if (!(inn > 0)) return undefined;
  const f = zw / (k - 1) / (inn / (N - k));
  return { f, df1: k - 1, df2: N - k, p: pF(f, k - 1, N - k) };
}

/* ------------------------------------------------------------ G6 */

export interface AncovaDaten {
  g: string[]; x: (number | null)[]; y: (number | null)[];
  /** Reihenfolge der Gruppen (erste = Vergleichsgruppe wie in regfaktor.ts); fehlt: Zahlen aufsteigend, sonst Text nach Schrift (Deutsch) - wie `regFaktor`. */
  stufen?: string[];
}
export interface AncovaGruppe { name: string; n: number; mittelRoh: number; mittelAdj: number; se: number; lo: number; hi: number }
export interface AncovaPaar { paar: string; diff: number; se: number; df: number; t: number; pHolm: number }
export interface Ancova {
  art: 'ancova'; n: number; kovariateMittel: number;
  gruppe: Effekt2; kovariate: Effekt2; fehler: { ss: number; df: number; ms: number };
  b: number; r2: number;
  gruppen: AncovaGruppe[];
  paare: AncovaPaar[];
  steigung: { f: number; df1: number; df2: number; p: number; bedeutsam: boolean };
  /** Nur bei mehreren Kontrollvariablen (`kovarianzMehr`); die Felder oben gelten dann für die erste Kontrollvariable. */
  mehr?: AncovaMehr;
}
export interface AncovaTerm { name: string; b: number; se: number; effekt: Effekt2; mittel: number }
export interface AncovaSteigung { name: string; f: number; df1: number; df2: number; p: number; bedeutsam: boolean; jeGruppe: { gruppe: string; b: number; se: number; lo: number; hi: number }[] }
export interface AncovaMehr { kovariaten: AncovaTerm[]; steigungen: AncovaSteigung[]; adjustiertBei: number[] }

/** Namen der Produktspalten Hilfsspalte × Kovariate (nur für die Rechnung). */
const produktNamen = (g: RegFaktor) => g.hilfs.map(h => `${h}P`);

/** Alle PSPP-Läufe der Kovarianzanalyse, alle auf denselben Fällen (Gruppe, Kovariate und Zielwert vorhanden): Gruppe + Kovariate · nur Kovariate · nur Gruppe · Gruppe + Kovariate + Produkte.
 *  Die Hilfsspalten (und Produkte) gelten nur für den jeweils nächsten Lauf (TEMPORARY). */
export function kovarianzBefehl(ziel: string, gruppe: RegFaktor, kovariate: string): string {
  const rec = regRecodes([{ spalte: gruppe.spalte, faktor: gruppe }]);
  const prod = produktNamen(gruppe);
  const compute = gruppe.hilfs.map((h, j) => `COMPUTE ${prod[j]} = ${h} * ${kovariate}.`).join('\n');
  const auswahl = `SELECT IF (NOT MISSING(${kovariate}) AND NOT MISSING(${ziel}) AND NOT MISSING(${gruppe.hilfs[0]})).`;
  const lauf = (vars: string[], mitProdukten: boolean, kommentar: string) =>
    `* ${pk(kommentar)}\nTEMPORARY.\n${rec}\n${mitProdukten ? compute + '\n' : ''}${auswahl}\nREGRESSION\n  /VARIABLES=${vars.join(' ')} ${ziel}\n  /STATISTICS=COEFF R ANOVA CI(95)\n  /DEPENDENT=${ziel}\n  /METHOD=ENTER.`;
  return [
    `* ${L('Kovarianzanalyse: vier Regressionen mit denselben Personen (PSPP kennt bei GLM keine Kovariate). Gruppen gehen als 0/1-Hilfsspalten ein (Vergleichsgruppe: die erste Stufe).', 'Analysis of covariance: four regressions with the same people (PSPP has no covariate in GLM). Groups enter as 0/1 helper columns (reference group: the first level).')}`,
    lauf([...gruppe.hilfs, kovariate], false, L('1. Gruppe und Kovariate: Fehlerterm, gemeinsame Steigung, R².', '1. Group and covariate: error term, common slope, R².')),
    lauf([kovariate], false, L('2. Nur die Kovariate: der Gruppentest ist der Zuwachs an Rest-Quadratsumme (Typ III).', '2. Covariate only: the group test is the increase in residual sum of squares (Type III).')),
    lauf(gruppe.hilfs, false, L('3. Nur die Gruppe: der Test der Kovariate (Typ III).', '3. Group only: the test of the covariate (Type III).')),
    lauf([...gruppe.hilfs, kovariate, ...prod], true, L('4. Mit Gruppe × Kovariate: Test der gleichen Steigungen.', '4. With group × covariate: test of equal slopes.'))
  ].join('\n');
}

const tabellen = (items: OutputItem[], re: RegExp) => items.filter((i): i is TableItem => i.type === 'table' && re.test(i.label)).map(raster);

/** Reihenfolge der Gruppen wie `regFaktor`: Zahlen aufsteigend, sonst Text nach Schrift (Deutsch). */
function gruppenFolge(g: string[]): string[] {
  const roh = [...new Set(g)];
  return roh.every(v => /^-?\d+([.,]\d+)?$/.test(v.trim())) ? roh.sort((a, b) => Number(a.replace(',', '.')) - Number(b.replace(',', '.'))) : roh.sort(new Intl.Collator('de').compare);
}

/** Ergebnis der Kovarianzanalyse aus den vier Läufen von `kovarianzBefehl` und den Rohdaten. */
export function kovarianz(items: OutputItem[], d: AncovaDaten): Ancova {
  const an = tabellen(items, /^ANOVA/), ms = tabellen(items, /^Model Summary/), ko = tabellen(items, /^Coefficients/);
  if (an.length < 4 || ms.length < 1 || ko.length < 1) throw new Error('Regressions-Tabellen fehlen');
  const rest = (r: (typeof an)[number]) => {
    const i = r.t.findIndex(z => z[0] === 'Residual'), cs = spalte(r, /^Sum of Squares$/), cd = spalte(r, /^df$/);
    const ss = r.n[i]?.[cs], df = r.n[i]?.[cd];
    if (ss === undefined || df === undefined) throw new Error('Residual fehlt');
    return { ss, df };
  };
  const [voll, ohneG, ohneX, steig] = [rest(an[0]!), rest(an[1]!), rest(an[2]!), rest(an[3]!)];
  const r2 = ms[0]!.n[ms[0]!.tabelle.headRows[0]]![spalte(ms[0]!, /^R Square$/)]!;
  const kb = spalte(ko[0]!, /^B$/);
  let b = NaN;
  for (let i = ko[0]!.tabelle.headRows[0]; i < ko[0]!.t.length; i++) if (ko[0]!.n[i]![kb] !== undefined) b = ko[0]!.n[i]![kb]!;   // die Kovariate steht als letzte Zeile

  const fall = d.g.flatMap((g, i) => (!leer(g) && gueltig(d.x[i]) && gueltig(d.y[i]) ? [i] : []));
  const folge = (d.stufen ?? gruppenFolge(fall.map(i => d.g[i]!))).filter(s => fall.some(i => d.g[i] === s));
  const k = folge.length, n = fall.length;
  const dfe = voll.df;
  if (dfe !== n - k - 1) throw new Error(`Fälle passen nicht: ${n} Personen, ${dfe} Freiheitsgrade`);
  const mse = voll.ss / dfe;
  const xs = fall.map(i => d.x[i] as number), xm = summe(xs) / n;
  const je = folge.map(s => {
    const ix = fall.filter(i => d.g[i] === s), x = ix.map(i => d.x[i] as number), y = ix.map(i => d.y[i] as number);
    return { name: s, n: ix.length, mx: summe(x) / ix.length, my: summe(y) / ix.length, ssx: summe(x.map(v => (v - summe(x) / ix.length) ** 2)) };
  });
  const ssxIn = summe(je.map(g => g.ssx));
  const t975 = tQuantil(0.975, dfe);

  const ssG = ohneG.ss - voll.ss, fG = ssG / (k - 1) / mse, ssX = ohneX.ss - voll.ss, fX = ssX / mse;
  const gruppe = effekt(ssG, k - 1, fG, pF(fG, k - 1, dfe), voll.ss, dfe), kovariate = effekt(ssX, 1, fX, pF(fX, 1, dfe), voll.ss, dfe);

  const gruppen: AncovaGruppe[] = je.map(g => {
    const adj = g.my - b * (g.mx - xm), se = Math.sqrt(mse * (1 / g.n + (g.mx - xm) ** 2 / ssxIn));
    return { name: g.name, n: g.n, mittelRoh: g.my, mittelAdj: adj, se, lo: adj - t975 * se, hi: adj + t975 * se };
  });
  const roh: (Omit<AncovaPaar, 'pHolm'> & { p: number })[] = [];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const diff = gruppen[i]!.mittelAdj - gruppen[j]!.mittelAdj, se = Math.sqrt(mse * (1 / je[i]!.n + 1 / je[j]!.n + (je[i]!.mx - je[j]!.mx) ** 2 / ssxIn)), t = diff / se;
    roh.push({ paar: `${je[i]!.name} - ${je[j]!.name}`, diff, se, df: dfe, t, p: pT(t, dfe) });
  }
  const h = holm(roh.map(p => p.p));
  const paare: AncovaPaar[] = roh.map(({ paar, diff, se, df, t }, i) => ({ paar, diff, se, df, t, pHolm: h[i]! }));

  const fS = steig.df > 0 ? ((voll.ss - steig.ss) / (k - 1)) / (steig.ss / steig.df) : NaN, pS = pF(fS, k - 1, steig.df);
  return {
    art: 'ancova', n, kovariateMittel: xm, gruppe, kovariate, fehler: fehlerTerm(voll.ss, dfe), b, r2, gruppen, paare,
    steigung: { f: fS, df1: k - 1, df2: steig.df, p: pS, bedeutsam: pS < 0.05 }
  };
}

/* ------------------------------------------------------------ G6 mit mehreren Kontrollvariablen (Field-Stufe 2) */

export interface AncovaMehrDaten { g: string[]; xs: (number | null)[][]; y: (number | null)[]; namen: string[]; stufen?: string[] }
interface Kq { b: number[]; xtxi: number[][]; sse: number; df: number }
/** Kleinste Quadrate mit den Spalten von `X` (Konstante gehört dazu); `null`, wenn die Spalten voneinander abhängen. */
function kq(X: number[][], y: number[]): Kq | null {
  const p = X[0]!.length, n = y.length;
  const xtx = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => X.reduce((a, r) => a + r[i]! * r[j]!, 0)));
  const inv = invers(xtx);
  if (!inv) return null;
  const xty = Array.from({ length: p }, (_, j) => X.reduce((a, r, i) => a + r[j]! * y[i]!, 0));
  const b = inv.map(r => summe(r.map((v, j) => v * xty[j]!)));
  const sse = summe(X.map((r, i) => (y[i]! - summe(r.map((v, j) => v * b[j]!))) ** 2));
  return { b, xtxi: inv, sse, df: n - p };
}
const quad = (c: number[], m: number[][]) => summe(c.map((ci, i) => summe(c.map((cj, j) => ci * m[i]![j]! * cj))));

/**
 * Kovarianzanalyse mit EINER oder MEHREREN Kontrollvariablen (Typ III, Dummy-Kodierung der Gruppe, erste Stufe als Vergleichsgruppe), ganz in TypeScript gerechnet.
 *   F je Term = Zuwachs der Rest-Quadratsumme beim Weglassen des Terms (Typ III); adjustierte Mittel bei den Mittelwerten ALLER Kontrollvariablen, SE aus (X'X)⁻¹;
 *   Steigungshomogenität je Kontrollvariable: Modell mit Gruppe × diese Kontrollvariable gegen das Modell ohne (die übrigen bleiben additiv); bei auffälligem Test die Steigung je Gruppe
 *   (Steigung der Vergleichsgruppe + Unterschiedsterm, SE aus (X'X)⁻¹ des erweiterten Modells).
 * Sollwerte: R car::Anova(type = 3), emmeans, anova(lm, lm mit Wechselwirkung) - docs/fachblaetter/sollwerte/field-stufe2.json (ancova), Test anova2.test.ts.
 * `null` bei weniger als zwei Gruppen, zu wenig Fällen oder voneinander abhängigen Spalten.
 */
export function kovarianzMehr(d: AncovaMehrDaten): Ancova | null {
  const p = d.xs.length;
  const fall = d.g.flatMap((g, i) => (!leer(g) && gueltig(d.y[i]) && d.xs.every(x => gueltig(x[i])) ? [i] : []));
  const folge = (d.stufen ?? gruppenFolge(fall.map(i => d.g[i]!))).filter(s => fall.some(i => d.g[i] === s));
  const k = folge.length, n = fall.length;
  if (p < 1 || k < 2 || n < k + p + 2) return null;
  const y = fall.map(i => d.y[i] as number), xs = d.xs.map(x => fall.map(i => x[i] as number)), gi = fall.map(i => folge.indexOf(d.g[i]!));
  const dummy = (r: number) => Array.from({ length: k - 1 }, (_, c) => (gi[r] === c + 1 ? 1 : 0));
  const bau = (mitG: boolean, ohneX: number, produktMit: number): number[][] => fall.map((_, r) => [
    1, ...(mitG ? dummy(r) : []), ...xs.flatMap((x, j) => (j === ohneX ? [] : [x[r]!])), ...(produktMit >= 0 ? dummy(r).map(v => v * xs[produktMit]![r]!) : [])]);
  const voll = kq(bau(true, -1, -1), y);
  if (!voll || voll.df < 1) return null;
  const mse = voll.sse / voll.df, dfe = voll.df, xm = xs.map(x => summe(x) / n);
  const ohneG = kq(bau(false, -1, -1), y);
  if (!ohneG) return null;
  const F = (sseKlein: number, df1: number, sseGross: number, dfGross: number) => ((sseKlein - sseGross) / df1) / (sseGross / dfGross);
  const fG = F(ohneG.sse, k - 1, voll.sse, dfe), gruppe = effekt(ohneG.sse - voll.sse, k - 1, fG, pF(fG, k - 1, dfe), voll.sse, dfe);
  const terme: AncovaTerm[] = [];
  for (let j = 0; j < p; j++) {
    const o = kq(bau(true, j, -1), y);
    if (!o) return null;
    const f = F(o.sse, 1, voll.sse, dfe), c = k + j;   // Spalte der Kontrollvariable j im Vollmodell
    terme.push({ name: d.namen[j]!, b: voll.b[c]!, se: Math.sqrt(mse * voll.xtxi[c]![c]!), effekt: effekt(o.sse - voll.sse, 1, f, pF(f, 1, dfe), voll.sse, dfe), mittel: xm[j]! });
  }
  const steigungen: AncovaSteigung[] = [];
  const t975 = tQuantil(0.975, dfe);
  for (let j = 0; j < p; j++) {
    const m1 = kq(bau(true, -1, j), y);
    if (!m1 || m1.df < 1) return null;
    const f = F(voll.sse, k - 1, m1.sse, m1.df), pw = pF(f, k - 1, m1.df), mse1 = m1.sse / m1.df, t1 = tQuantil(0.975, m1.df);
    const sp = 1 + (k - 1) + j, pc = 1 + (k - 1) + p;   // Spalte der Kontrollvariable j; ab pc die Produkte
    const jeGruppe = folge.map((gruppeName, gIdx) => {
      const c = new Array<number>(m1.b.length).fill(0); c[sp] = 1; if (gIdx > 0) c[pc + gIdx - 1] = 1;
      const b = summe(c.map((v, i) => v * m1.b[i]!)), se = Math.sqrt(mse1 * quad(c, m1.xtxi));
      return { gruppe: gruppeName, b, se, lo: b - t1 * se, hi: b + t1 * se };
    });
    steigungen.push({ name: d.namen[j]!, f, df1: k - 1, df2: m1.df, p: pw, bedeutsam: pw < 0.05, jeGruppe });
  }
  const zeile = (gIdx: number): number[] => [1, ...Array.from({ length: k - 1 }, (_, c) => (gIdx === c + 1 ? 1 : 0)), ...xm];
  const gruppen: AncovaGruppe[] = folge.map((name, gIdx) => {
    const c = zeile(gIdx), adj = summe(c.map((v, i) => v * voll.b[i]!)), se = Math.sqrt(mse * quad(c, voll.xtxi)), ix = gi.map((v, r) => (v === gIdx ? r : -1)).filter(r => r >= 0);
    return { name, n: ix.length, mittelRoh: summe(ix.map(r => y[r]!)) / ix.length, mittelAdj: adj, se, lo: adj - t975 * se, hi: adj + t975 * se };
  });
  const roh: (Omit<AncovaPaar, 'pHolm'> & { p: number })[] = [];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const c = zeile(i).map((v, q) => v - zeile(j)[q]!), diff = summe(c.map((v, q) => v * voll.b[q]!)), se = Math.sqrt(mse * quad(c, voll.xtxi)), t = diff / se;
    roh.push({ paar: `${folge[i]} - ${folge[j]}`, diff, se, df: dfe, t, p: pT(t, dfe) });
  }
  const h = holm(roh.map(q => q.p));
  const paare: AncovaPaar[] = roh.map(({ paar, diff, se, df, t }, i) => ({ paar, diff, se, df, t, pHolm: h[i]! }));
  const sst = summe(y.map(v => (v - summe(y) / n) ** 2)), erste = terme[0]!, ersteS = steigungen[0]!;
  return {
    art: 'ancova', n, kovariateMittel: xm[0]!, gruppe, kovariate: erste.effekt, fehler: fehlerTerm(voll.sse, dfe), b: erste.b, r2: 1 - voll.sse / sst, gruppen, paare,
    steigung: { f: ersteS.f, df1: ersteS.df1, df2: ersteS.df2, p: ersteS.p, bedeutsam: ersteS.bedeutsam },
    mehr: { kovariaten: terme, steigungen, adjustiertBei: xm }
  };
}
