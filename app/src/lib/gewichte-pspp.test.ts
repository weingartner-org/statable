import { beforeAll, describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-a-erwartet.json';
import { nodeEngine } from './testengine';
import { gewichtBefehl, leseEngineGewicht, normiere, wQuantil, wMittel, wVarianz } from './gewichte';

/* ===== Welle S-A, Teil 1 (Gewichte), zweite Quelle: PSPP selbst. Rechnet die ECHTE Engine (2.1.1) mit WEIGHT BY dasselbe wie R auf der rep()-erweiterten Datei? =====
 * Sollwerte: scripts/spaeter-a-erwartet.R → testdaten/spaeter-a-erwartet.json. API: Kopf von gewichte.test.ts. Der Bauer ändert diesen Test nicht.
 *
 * ---------------------------------------------- Was PSPP anders macht als R / das Fachblatt (alle in Tests festgehalten) ----------------------------------------------
 *  1. Zeilen mit Gewicht 0, fehlendem oder negativem Gewicht zählen nicht - PSPP meldet das als WARNUNG („At least one case … had a weight value that was user-missing,
 *     system-missing, zero, or negative“) bei jedem Verfahren. Statable zeigt diese Meldung nicht roh, sondern sagt die Zahl der Zeilen selbst (Fachblatt 1.7).
 *  2. QUARTILE: FREQUENCIES /PERCENTILES rechnet im Standard (ALGORITHM=ENHANCED) Typ 7, mit /ALGORITHM=COMPATIBLE Typ 6 (Statable setzt das so). Bei GANZZAHLIGEN Gewichten
 *     ist COMPATIBLE = R quantile(rep(y, w), type = 6). Bei KOMMAGEWICHTEN rechnet FREQUENCIES COMPATIBLE etwas anderes als EXAMINE /PERCENTILES = HAVERAGE
 *     (Beispiel Median 4,9 gegen 6,4). SOLL für Umfragegewichte ist EXAMINE-HAVERAGE (percentile.c), gebaut als wQuantil(). FREQUENCIES nicht benutzen, wo das Gewicht Komma hat.
 *  3. Kommagewichte werden nicht gerundet (N = 9,1; Prozente aus den ungerundeten Summen). PSPP rechnet mit ihnen die Verfahren wie mit Häufigkeiten (t-Test df = Σw − 2 …) - darum die Sperre.
 *  4. AGGREGATE: N = Summe der Gewichte, NU = Zahl der ZEILEN (auch die mit Gewicht 0!), MEAN/SUM/SD/MEDIAN sind gewichtet. Der Kommentar in datenassistent.ts war falsch.
 *  5. Das Gewicht steht im .sav und kommt beim Öffnen zurück (SHOW WEIGHT zeigt es). `SHOW WEIGHT.` ist die Abfrage (Tabelle „Settings“, Zeile WEIGHT, Wert Spaltenname oder OFF).
 * ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ */

const E = (erwartet as any).gewichte;
const H = E.haeufigkeit, U = E.umfrage, F = E.fachblatt;
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

type Item = { type: string; label?: string; rows?: number; cols?: number; cells?: { r: number; c: number; n?: number; t: string }[]; severity?: string; text?: string };
type Gitter = (number | string | null)[][];
const gitter = (t: Item): Gitter => { const g: Gitter = Array.from({ length: t.rows! }, () => Array(t.cols!).fill(null)); for (const c of t.cells!) g[c.r]![c.c] = c.n !== undefined ? c.n : c.t; return g; };
const tische = (out: Item[]) => out.filter(i => i.type === 'table').map(gitter);
const tabelle = (out: Item[], re: RegExp): Gitter => { const t = out.find(i => i.type === 'table' && re.test(i.label ?? '')); expect(t, `Tabelle ${re} fehlt: ${out.filter(i => i.type === 'table').map(i => i.label)}`).toBeTruthy(); return gitter(t!); };
const alle = (out: Item[], re: RegExp): Gitter[] => out.filter(i => i.type === 'table' && re.test(i.label ?? '')).map(gitter);
const zeile = (g: Gitter, re: RegExp, ab = 0) => { const r = g.slice(ab).find(z => z.some(c => typeof c === 'string' && re.test(c))); expect(r, `Zeile ${re} fehlt`).toBeTruthy(); return r!; };
const nah = (ist: unknown, soll: number, was = '', tol = 1e-9) => { expect(typeof ist, `${was}: ${ist}`).toBe('number'); expect(Math.abs((ist as number) - soll), `${was}: PSPP ${ist} gegen R ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll))); };
const meldungen = (out: Item[]) => out.filter(i => i.type === 'message').map(i => `${i.severity}: ${i.text}`);
const GEWICHTSWARNUNG = /weight value that was user-missing, system-missing, zero, or negative/;
/** Läuft ohne Fehler; die Gewichtswarnung (Zeilen mit Gewicht 0) ist erlaubt, alles andere nicht. */
const lauf = (syntax: string, dateien: Record<string, Uint8Array> = {}) => {
  const out = e.run(syntax, dateien) as Item[];
  expect(meldungen(out).filter(m => !GEWICHTSWARNUNG.test(m)), `PSPP meldet Probleme bei:\n${syntax}`).toEqual([]);
  return out;
};
const csv = (d: Record<string, number[]>, namen: string[], w?: number[]) => {
  const n = d[namen[0]!]!.length, zeilen: string[] = [];
  for (let i = 0; i < n; i++) for (let k = 0; k < (w ? w[i]! : 1); k++) zeilen.push(namen.map(x => d[x]![i]).join(','));
  return new TextEncoder().encode(zeilen.join('\n') + '\n');
};
const NAMEN_H = ['g', 'kat', 'jn', 'y', 'x', 'w'];
const KOPF_H = `DATA LIST FILE='/d.csv' LIST (',') /g kat jn y x w (F8.2).`;
/** Alle Verfahren der Fallgewicht-Tabelle, die „rechnen“ und von PSPP kommen. */
const SUITE = `FREQUENCIES kat g /STATISTICS=MEAN.
DESCRIPTIVES y x /STATISTICS=MEAN SEMEAN STDDEV VARIANCE MIN MAX.
FREQUENCIES y /FORMAT=NOTABLE /PERCENTILES=25 50 75 /ALGORITHM=COMPATIBLE.
CROSSTABS g BY jn /CELLS=COUNT EXPECTED ROW COLUMN TOTAL /STATISTICS=CHISQ PHI.
CROSSTABS kat BY g /CELLS=COUNT ROW /STATISTICS=CHISQ.
T-TEST GROUPS=g(1,2) /VARIABLES=y.
CORRELATIONS /VARIABLES=y x.
REGRESSION /STATISTICS=COEFF R ANOVA CI /DEPENDENT=y /METHOD=ENTER x.
ONEWAY y BY kat /STATISTICS=DESCRIPTIVES HOMOGENEITY.`;

function ladeGewichtet(): Item[] { return lauf(`NEW FILE.\n${KOPF_H}\n${gewichtBefehl({ spalte: 'w', art: 'haeufigkeit' })}\n${SUITE}`, { '/d.csv': csv(H.daten, NAMEN_H) }); }

describe('Häufigkeitsgewicht: PSPP WEIGHT BY gegen R auf der erweiterten Datei', () => {
  let out: Item[];
  beforeAll(() => { out = ladeGewichtet(); });
  it('der Befehl kommt aus gewichtBefehl, die zwei Zeilen mit Gewicht 0 lösen die PSPP-Warnung aus (Statable meldet die Zahl selbst)', () => {
    expect(gewichtBefehl({ spalte: 'w', art: 'haeufigkeit' })).toBe('WEIGHT BY w.');
    expect(meldungen(out).some(m => GEWICHTSWARNUNG.test(m))).toBe(true);
  });
  it('Häufigkeiten: Zahl, Prozent, gültige Prozent, kumuliert', () => {
    const t = tabelle(out, /^kat$/), r = H.haeufigkeit_kat;
    const zeilen = t.filter(z => typeof z[1] === 'number');
    expect(zeilen.length).toBe(r.werte.length);
    zeilen.forEach((z, i) => { nah(z[1], r.werte[i], 'Wert'); nah(z[2], r.n[i], 'Zahl'); nah(z[3], r.prozent[i], 'Prozent'); nah(z[4], r.prozent[i], 'gültige Prozent'); nah(z[5], r.kumuliert[i], 'kumuliert'); });
  });
  it('DESCRIPTIVES: N = Σw, Mittel, SE, SD, Varianz, Spanne', () => {
    const t = tabelle(out, /^Descriptive Statistics$/);
    for (const [name, k] of [['y', H.kennwerte_y], ['x', H.kennwerte_x]] as [string, any][]) {
      const z = zeile(t, new RegExp('^' + name + '$'));
      nah(z[1], k.n, 'N'); nah(z[2], k.mittel, 'Mittel'); nah(z[3], k.se, 'SE'); nah(z[4], k.sd, 'SD'); nah(z[5], k.var, 'Varianz'); nah(z[6], k.min, 'min'); nah(z[7], k.max, 'max');
    }
  });
  it('Quartile: FREQUENCIES /ALGORITHM=COMPATIBLE = R Typ 6 auf der erweiterten Datei = wQuantil() (bei ganzzahligem Gewicht)', () => {
    const t = alle(out, /^Statistics$/).find(g => g.some(z => z.includes('Percentiles')))!;
    const q = t.filter(z => typeof z[z.length - 1] === 'number' && [25, 50, 75].includes(z[z.length - 2] as number)).map(z => z[z.length - 1] as number);
    expect(q.length).toBe(3);
    nah(q[0], H.kennwerte_y.q25, 'Q1'); nah(q[1], H.kennwerte_y.q50, 'Median'); nah(q[2], H.kennwerte_y.q75, 'Q3');
    nah(wQuantil(H.daten.y, H.daten.w, .25), q[0]!, 'wQuantil Q1'); nah(wQuantil(H.daten.y, H.daten.w, .75), q[2]!, 'wQuantil Q3');
  });
  it('Kreuztabelle g × jn: Zählung, erwartet, Zeilen-, Spalten-, Gesamtprozent, Chi-Quadrat, Likelihood, Yates, Fisher, Cramérs V', () => {
    const g = tabelle(out, /^g × jn$/), r = H.kreuz_g_jn;
    const art = (z: Gitter[number]) => z.find(c => typeof c === 'string' && /^(Count|Expected|Row %|Column %|Total %)$/.test(c)) as string;
    const werte = (z: Gitter[number]) => z.filter((c, i) => typeof c === 'number' && i > z.indexOf(art(z))) as number[];
    const je: Record<string, number[][]> = {};
    for (const z of g) { if (!art(z)) continue; (je[art(z)] ??= []).push(werte(z)); }
    // je[art] = Zeile 1, Zeile 2, Summenzeile; Spalten j = 0, 1, Summe
    r.n.forEach((zz: number[], i: number) => zz.forEach((v, j) => nah(je['Count']![i]![j], v, `Zählung ${i}${j}`)));
    r.erwartet.forEach((zz: number[], i: number) => zz.forEach((v, j) => nah(je['Expected']![i]![j], v, `erwartet ${i}${j}`)));
    r.zeilenprozent.forEach((zz: number[], i: number) => zz.forEach((v, j) => nah(je['Row %']![i]![j], v, `Zeilen-% ${i}${j}`)));
    r.gesamtprozent.forEach((zz: number[], i: number) => zz.forEach((v, j) => nah(je['Total %']![i]![j], v, `Gesamt-% ${i}${j}`)));
    r.spaltenprozent.forEach((sp: number[], j: number) => sp.forEach((v, i) => nah(je['Column %']![i]![j], v, `Spalten-% ${i}${j}`)));
    const c = tabelle(out, /^Chi-Square Tests$/);
    nah(zeile(c, /^Pearson/)[1], r.chi2, 'χ²'); nah(zeile(c, /^Pearson/)[2], r.df); nah(zeile(c, /^Pearson/)[3], r.p, 'p');
    nah(zeile(c, /^Likelihood/)[1], r.lr, 'LR'); nah(zeile(c, /^Likelihood/)[3], r.lrP, 'LR p');
    nah(zeile(c, /^Continuity/)[1], r.yates, 'Yates'); nah(zeile(c, /^Continuity/)[3], r.yatesP, 'Yates p');
    nah(zeile(c, /^Fisher/)[4], r.fisherP, 'Fisher zweiseitig (PSPP rechnet exakt anders im 9. Stellenwert)', 1e-7);
    nah(zeile(tabelle(out, /^Symmetric Measures$/), /^Cramer/)[2], r.cramerV, 'Cramérs V');
    expect(zeile(c, /^N of Valid/)[1]).toBe(H.summe);
  });
  it('Kreuztabelle kat × g (3 × 2): χ², df, p', () => {
    const c = alle(out, /^Chi-Square Tests$/)[1]!;
    const z = zeile(c, /^Pearson/), r = H.kreuz_kat_g;
    nah(z[1], r.chi2, 'χ²'); nah(z[2], r.df); nah(z[3], r.p, 'p');
  });
  it('t-Test: Gruppen (N = Σw je Gruppe), Mittel, SD, Student und Welch (t, df, p, KI), Levene', () => {
    const gs = tabelle(out, /^Group Statistics$/), t = H.ttest_y_g;
    const g1 = gs.filter(z => typeof z[1] === 'number' || (z[1] as unknown) === 1)[0]!;
    const zeilen = gs.slice(1);
    nah(zeilen[0]![2], t.n1, 'n1'); nah(zeilen[1]![2], t.n2, 'n2'); nah(zeilen[0]![3], t.m1, 'm1'); nah(zeilen[1]![3], t.m2, 'm2'); nah(zeilen[0]![4], t.sd1, 'sd1'); nah(zeilen[1]![4], t.sd2, 'sd2'); void g1;
    const it = tabelle(out, /^Independent Samples Test$/);
    const a = zeile(it, /^Equal variances assumed$/), w = zeile(it, /^Equal variances not assumed$/);
    nah(a[2], t.levene.F, 'Levene F'); nah(a[3], t.levene.p, 'Levene p');
    nah(a[4], t.student.t, 't'); nah(a[5], t.student.df, 'df'); nah(a[6], t.student.p, 'p'); nah(a[7], t.diff, 'Differenz'); nah(a[9], t.student.kiLo, 'KI u'); nah(a[10], t.student.kiHi, 'KI o');
    nah(w[4], t.welch.t, 'Welch t'); nah(w[5], t.welch.df, 'Welch df'); nah(w[6], t.welch.p, 'Welch p'); nah(w[9], t.welch.kiLo, 'Welch KI u'); nah(w[10], t.welch.kiHi, 'Welch KI o');
  });
  it('Pearson-Korrelation: r, p, N = Σw', () => {
    const c = tabelle(out, /^Correlations$/), k = H.korrelation_y_x;
    nah(c[1]![3], k.r, 'r'); nah(c[2]![3], k.p, 'p'); nah(c[3]![3], k.n, 'N');
  });
  it('lineare Regression: B, SE, t, p, KI, R², F, df (N − 2 = Σw − 2)', () => {
    const co = tabelle(out, /^Coefficients/), r = H.regression_y_x;
    const k = zeile(co, /^\(Constant\)$/), x = zeile(co, /^x$/);
    nah(k[1], r.b0, 'B0'); nah(k[2], r.se0, 'SE0'); nah(k[4], r.t0, 't0');
    // Sig. der Konstanten: PSPP 2.1.3 rechnet mit N − 2 Freiheitsgraden wie R (ca216c6); 2.1.1 nahm N − 1 (Wert in abweichungen.pspp_regression_konstante).
    nah(k[5], r.p0, 'p der Konstanten');
    nah(x[1], r.b1, 'B1'); nah(x[2], r.se1, 'SE1'); nah(x[4], r.t1, 't1'); nah(x[5], r.p1, 'p1');
    const ms = tabelle(out, /^Model Summary/)[1]!; nah(ms[1], r.r2, 'R²'); nah(ms[2], r.r2adj, 'R² adj'); nah(ms[3], r.sdRest, 'SE Schätzung');
    const an = tabelle(out, /^ANOVA \(y\)$/); nah(zeile(an, /^Regression$/)[4], r.F, 'F'); nah(zeile(an, /^Residual$/)[2], r.dfRest, 'df');
  });
  it('einfaktorielle Varianzanalyse y nach kat: F, p, df, Quadratsummen', () => {
    const an = tabelle(out, /^ANOVA$/), r = H.anova_y_kat;
    const z = zeile(an, /^Between Groups$/), w = zeile(an, /^Within Groups$/);
    nah(z[5], r.F, 'F'); nah(z[6], r.p, 'p'); nah(z[3], r.dfZwischen); nah(w[3], r.dfInnerhalb); nah(z[2], r.ssZwischen, 'SS zw'); nah(w[2], r.ssInnerhalb, 'SS inn');
  });
});

describe('EIGENSCHAFT gewichtet = erweitert (PSPP): jede Zahl jeder Tabelle gleich, mit WEIGHT BY und auf der Datei mit w-mal wiederholten Zeilen', () => {
  it('alle Verfahren der Suite: gleiche Tabellen bis 1e-9', () => {
    const a = tische(ladeGewichtet()).slice(1);
    const b = tische(lauf(`NEW FILE.\n${KOPF_H}\nWEIGHT OFF.\n${SUITE}`, { '/d.csv': csv(H.daten, NAMEN_H, H.daten.w) })).slice(1);
    expect(a.length).toBe(b.length);
    a.forEach((ta, k) => {
      expect(ta.length, `Tabelle ${k}: Zeilen`).toBe(b[k]!.length);
      ta.forEach((z, i) => z.forEach((c, j) => {
        const d = b[k]![i]![j];
        if (typeof c === 'number' && typeof d === 'number') expect(Math.abs(c - d), `Tabelle ${k} [${i}][${j}]: ${c} gegen ${d}`).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(d)));
        else expect(c, `Tabelle ${k} [${i}][${j}]`).toBe(d);
      }));
    });
  });
  it('Gewicht 0, fehlendes und negatives Gewicht zählen nicht (PSPP-Warnung, N bleibt Σw der gültigen Zeilen)', () => {
    const o = e.run(`NEW FILE.\nDATA LIST LIST (',') /y w (F8.2).\nBEGIN DATA\n1,2\n2,0\n3,-1\n4,.\n5,3\nEND DATA.\nWEIGHT BY w.\nDESCRIPTIVES y /STATISTICS=MEAN.`) as Item[];
    expect(meldungen(o).some(m => GEWICHTSWARNUNG.test(m))).toBe(true);
    const t = tabelle(o, /^Descriptive Statistics$/); const z = zeile(t, /^y$/);
    nah(z[1], 5, 'N = 2 + 3'); nah(z[2], (1 * 2 + 5 * 3) / 5, 'Mittel');
  });
});

describe('Falle 3 in PSPP-Zahlen: die Skala der Gewichte ändert den Standardfehler (Fachblatt-Beispiel)', () => {
  for (const sk of F.skala) it(`Gewichte × ${sk.faktor}: SE der Häufigkeitsformel ${sk.se_haeufigkeitsformel.toFixed(7)}`, () => {
    const d = { y: F.y, w: F.w.map((v: number) => v * sk.faktor) };
    const out = lauf(`NEW FILE.\nDATA LIST FILE='/d.csv' LIST (',') /y w (F8.2).\nWEIGHT BY w.\nDESCRIPTIVES y /STATISTICS=MEAN SEMEAN STDDEV.`, { '/d.csv': csv(d, ['y', 'w']) });
    const z = zeile(tabelle(out, /^Descriptive Statistics$/), /^y$/);
    nah(z[1], sk.summe, 'N = Σw'); nah(z[2], sk.mittel, 'Mittel'); nah(z[3], sk.se_haeufigkeitsformel, 'SE');
  });
});

describe('Umfragegewichte (Kommazahlen) in PSPP: beschreibend wie R; die Quartile sind HAVERAGE (EXAMINE), nicht FREQUENCIES', () => {
  const NAMEN_U = ['gruppe', 'jn', 'kat', 'y', 'wu'];
  const kopf = `NEW FILE.\nDATA LIST FILE='/u.csv' LIST (',') /gruppe jn kat y wu (F8.2).\nWEIGHT BY wu.`;
  const dat = { '/u.csv': csv(U.daten, NAMEN_U) };
  it('N = Σw unabgerundet, Mittel, SD (Nenner Σw − 1) wie R', () => {
    const out = lauf(`${kopf}\nDESCRIPTIVES y /STATISTICS=MEAN STDDEV VARIANCE MIN MAX.\nFREQUENCIES kat.`, dat);
    const z = zeile(tabelle(out, /^Descriptive Statistics$/), /^y$/);
    nah(z[1], U.summe, 'N'); nah(z[2], U.mittel, 'Mittel'); nah(z[3], U.sd, 'SD'); nah(z[4], U.varianz, 'Varianz'); nah(z[5], U.min); nah(z[6], U.max);
    const t = tabelle(out, /^kat$/).filter(r => typeof r[1] === 'number');
    t.forEach((r, i) => { nah(r[2], U.prozent_kat.summe[i], 'gewichtete Zahl (nicht gerundet)'); nah(r[3], U.prozent_kat.prozent[i], 'Prozent'); });
  });
  it('Kreuztabelle gruppe × jn: gewichtete Zählungen und Zeilenprozente wie R (Chi-Quadrat rechnet PSPP trotzdem - Statable sperrt es)', () => {
    const out = lauf(`${kopf}\nCROSSTABS gruppe BY jn /CELLS=COUNT ROW /STATISTICS=CHISQ.`, dat);
    const g = tabelle(out, /^gruppe × jn$/);
    const zeilen = g.filter(z => z.includes('Count')).map(z => z.filter(c => typeof c === 'number').slice(1) as number[]);
    const zp = g.filter(z => z.includes('Row %')).map(z => z.filter(c => typeof c === 'number') as number[]);
    U.kreuz_gruppe_jn.summe.forEach((zz: number[], i: number) => zz.forEach((v, j) => nah(zeilen[i]![j], v, `Zählung ${i}${j}`)));
    U.kreuz_gruppe_jn.zeilenprozent.forEach((zz: number[], i: number) => zz.forEach((v, j) => nah(zp[i]![j], v, `Zeilen-% ${i}${j}`)));
    const c = zeile(tabelle(out, /^Chi-Square Tests$/), /^N of Valid/);
    nah(c[1], U.summe, 'N im Chi-Quadrat-Test = Σw (Kommazahl) - so würde ein Umfragegewicht fälschlich als Häufigkeit behandelt');
  });
  it('Quartile: EXAMINE /PERCENTILES = HAVERAGE mit den auf Σw = Zeilen normierten Gewichten = wQuantil(normiere(w)) = R-Nachbau; mit den rohen Gewichten die rohen Werte', () => {
    const wn = normiere(U.daten.wu);
    const roh = lauf(`${kopf}\nEXAMINE VARIABLES=y /PERCENTILES(25,50,75)=HAVERAGE /PLOT=NONE /STATISTICS=NONE.`, dat);
    const normiertCsv = { '/u.csv': csv({ ...U.daten, wn }, ['gruppe', 'jn', 'kat', 'y', 'wn']) };
    const nor = lauf(`NEW FILE.\nDATA LIST FILE='/u.csv' LIST (',') /gruppe jn kat y wn (F8.8).\nWEIGHT BY wn.\nEXAMINE VARIABLES=y /PERCENTILES(25,50,75)=HAVERAGE /PLOT=NONE /STATISTICS=NONE.`, normiertCsv);
    const lese = (out: Item[]) => zeile(tabelle(out, /^Percentiles$/), /^Weighted Average$/).filter(c => typeof c === 'number') as number[];
    const q = lese(nor), r = lese(roh);
    nah(q[0], U.q25, 'Q1 normiert', 1e-6); nah(q[1], U.q50, 'Median normiert', 1e-6); nah(q[2], U.q75, 'Q3 normiert', 1e-6);
    nah(r[0]!, U.q25_roh, 'Q1 roh'); nah(r[1]!, U.q50_roh, 'Median roh'); nah(r[2]!, U.q75_roh, 'Q3 roh');
    nah(wQuantil(U.daten.y, wn, .25), U.q25); nah(wQuantil(U.daten.y, wn, .5), U.q50); nah(wQuantil(U.daten.y, wn, .75), U.q75);
    nah(wQuantil(U.daten.y, U.daten.wu, .5), U.q50_roh);
  });
  it('Abweichung festgehalten: FREQUENCIES /ALGORITHM=COMPATIBLE gibt bei Kommagewichten ANDERE Quartile als HAVERAGE (Beispiel des Fachblatts, Summe 9,6)', () => {
    const b = (erwartet as any).abweichungen.percentile_kommagewichte;
    const out = lauf(`NEW FILE.\nDATA LIST FILE='/b.csv' LIST (',') /y w (F8.2).\nWEIGHT BY w.\nFREQUENCIES y /FORMAT=NOTABLE /PERCENTILES=25 50 75 /ALGORITHM=COMPATIBLE.\nEXAMINE VARIABLES=y /PERCENTILES(25,50,75)=HAVERAGE /PLOT=NONE /STATISTICS=NONE.`, { '/b.csv': csv({ y: b.y, w: b.w }, ['y', 'w']) });
    const st = tabelle(out, /^Statistics$/).filter(z => [25, 50, 75].includes(z[z.length - 2] as number)).map(z => z[z.length - 1] as number);
    nah(st[0], b.frequencies_compatible.q25); nah(st[1], b.frequencies_compatible.q50); nah(st[2], b.frequencies_compatible.q75);
    const ex = (zeile(tabelle(out, /^Percentiles$/), /^Weighted Average$/).filter(c => typeof c === 'number') as number[]);
    nah(ex[0]!, b.haverage.q25); nah(ex[1]!, b.haverage.q50); nah(ex[2]!, b.haverage.q75);
    expect(Math.abs(st[1]! - ex[1]!)).toBeGreaterThan(1);
  });
  it('Skalierung der Umfragegewichte: Mittel bleibt, Varianz (Nenner Σw − 1) ändert sich - darum nur „beschreibend“', () => {
    const mit = (f: number) => lauf(`NEW FILE.\nDATA LIST FILE='/u.csv' LIST (',') /gruppe jn kat y wu (F8.2).\nCOMPUTE wf = wu * ${f}.\nWEIGHT BY wf.\nDESCRIPTIVES y /STATISTICS=MEAN VARIANCE.`, dat);
    const z1 = zeile(tabelle(mit(1), /^Descriptive Statistics$/), /^y$/), z7 = zeile(tabelle(mit(7), /^Descriptive Statistics$/), /^y$/);
    nah(z7[2], z1[2] as number, 'Mittel'); expect(Math.abs((z7[3] as number) - (z1[3] as number))).toBeGreaterThan(1e-3);
    nah(z7[3], U.skalen[2].varianz, 'Varianz ×7 wie wVarianz');
    nah(wVarianz(U.daten.y, U.daten.wu.map((v: number) => 7 * v)), U.skalen[2].varianz); nah(wMittel(U.daten.y, U.daten.wu), U.mittel);
  });
});

describe('Aggregieren mit Gewicht (Falle 2): N ist gewichtet, NU zählt Zeilen', () => {
  it('N = Σw, N(y) = Σw der gültigen, NU = Zeilen (auch die mit Gewicht 0), MEAN/SUM/SD/MEDIAN gewichtet', () => {
    const out = lauf(`NEW FILE.\n${KOPF_H}\nWEIGHT BY w.\nAGGREGATE OUTFILE=* /BREAK=g /n=N /nu=NU /nn=N(y) /nnu=NU(y) /m=MEAN(y) /s=SUM(y) /sd=SD(y) /med=MEDIAN(y).\nLIST.`, { '/d.csv': csv(H.daten, NAMEN_H) });
    const t = tabelle(out, /^Data List$/);
    const w: number[] = H.daten.w, g: number[] = H.daten.g, y: number[] = H.daten.y;
    [1, 2].forEach((grp, i) => {
      const z = t[i + 1]!, idx = g.map((v, k) => v === grp ? k : -1).filter(k => k >= 0);
      nah(z[1], idx.reduce((a, k) => a + w[k]!, 0), `N Gruppe ${grp}`); nah(z[2], idx.length, `NU Gruppe ${grp} = Zeilen`);
      nah(z[5], wMittel(idx.map(k => y[k]!), idx.map(k => w[k]!)), 'MEAN gewichtet'); nah(z[6], idx.reduce((a, k) => a + w[k]! * y[k]!, 0), 'SUM gewichtet');
    });
  });
});

describe('Gewichtszustand der Engine: SHOW WEIGHT lesen, Gewicht im .sav, WEIGHT OFF', () => {
  it('leseEngineGewicht liest die echte Ausgabe: Spaltenname, OFF = null', () => {
    e.run(`NEW FILE.\n${KOPF_H}`, { '/d.csv': csv(H.daten, NAMEN_H) });
    expect(leseEngineGewicht(e.run('SHOW WEIGHT.') as never)).toBeNull();
    e.run(gewichtBefehl({ spalte: 'w', art: 'haeufigkeit' }));
    expect(leseEngineGewicht(e.run('SHOW WEIGHT.') as never)).toBe('w');
    e.run(gewichtBefehl());
    expect(leseEngineGewicht(e.run('SHOW WEIGHT.') as never)).toBeNull();
  });
  it('das Gewicht wandert ins .sav und kommt beim Öffnen zurück (die Art steht NICHT darin - sie gehört ans Projekt)', () => {
    e.run(`NEW FILE.\n${KOPF_H}\nWEIGHT BY w.\nSAVE OUTFILE='/mit.sav'.\nNEW FILE.`, { '/d.csv': csv(H.daten, NAMEN_H) });
    expect(leseEngineGewicht(e.run('SHOW WEIGHT.') as never)).toBeNull();
    e.run(`GET FILE='/mit.sav'.`);
    expect(leseEngineGewicht(e.run('SHOW WEIGHT.') as never)).toBe('w');
  });
  it('WEIGHT BY per Hand wird sichtbar: die Abfrage zeigt es auch dann', () => {
    e.run(`NEW FILE.\n${KOPF_H}\nWEIGHT BY kat.`, { '/d.csv': csv(H.daten, NAMEN_H) });
    expect(leseEngineGewicht(e.run('SHOW WEIGHT.') as never)).toBe('kat');
  });
});
