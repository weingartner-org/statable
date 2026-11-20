/**
 * Später S-D2, Bauer A2: Tabellen und Sätze der Karten Verteilung und Kreuztabelle, wenn das Umfragegewicht designbasiert gerechnet wurde (`GewichtetE.design`).
 * Die beschreibenden Tabellen (lib/gewichtbeschreibend.ts) bleiben; dazu kommen die Tabelle „Mittelwert mit Intervall“, die Häufigkeitstabelle mit Standardfehler und Intervall und der Rao-Scott-Test.
 * lib/gewichtbeschreibend.ts reicht hierher, sobald `e.design` da ist. Alle Texte ganze Sätze; Zahlen nur über komma/ohneNull/pWert und das Sprachprofil.
 */
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { fd, fp, fx, tabelle, type Z } from './mwsaetze';
import { komma, type Saetze } from './ergebnis';
import { proz, zitat } from '../i18n/profil';
import { anteilGrenzeSatz, hinweisSatz, umfrageFehlerSatz, umfrageHinweise, umfrageMethode, umfrageSatz } from './umfrage';
import type { DesignKreuzE, DesignVerteilungE } from './umfragedaten';
import type { GewichtetE } from './gewichtbeschreibend';
import { entwurfWorte, type Entwurf } from './gewichte';

type Name = (spalte: string) => string;
type Wert = (spalte: string, wert: string | number) => string;
type R = Record<string, any>;   // eslint-disable-line @typescript-eslint/no-explicit-any

/** Die Fußnote unter den Tabellen: wie gerechnet wurde (ersetzt „Nur beschreibend …“). */
export const designFuss = (plan?: Entwurf) => plan ? L(`Umfragegewicht: Mittelwerte, Anteile und Prozente sind gewichtet; Standardfehler, Intervalle und Tests sind designbasiert gerechnet (Taylor-Linearisierung, Stichprobenplan: ${entwurfWorte(plan)}).`,
  `Survey weight: means, proportions and percentages are weighted; standard errors, intervals and tests are design-based (Taylor linearization, sampling design: ${entwurfWorte(plan)}).`) : L('Umfragegewicht: Mittelwerte, Anteile und Prozente sind gewichtet; Standardfehler, Intervalle und Tests sind designbasiert gerechnet (Taylor-Linearisierung, Personen einzeln gezogen, ohne Schichten und Klumpen).',
  'Survey weight: means, proportions and percentages are weighted; standard errors, intervals and tests are design-based (Taylor linearization, people drawn individually, without strata and clusters).');
const fussZelle = (t: string) => ({ r: 0, c: 0, rs: 1, cs: 1, h: false, a: 'l' as const, t });
/** Die Fußnoten einer beschreibenden Tabelle: der Satz „Nur beschreibend …“ weicht dem Satz der designbasierten Rechnung; weitere Zeilen kommen dazu. */
function mitDesignFuss(t: TableItem, nurBeschreibend: string, zusatz: string[] = [], plan?: Entwurf): TableItem {
  t.footnotes = [...t.footnotes.filter(f => f.t !== nurBeschreibend), fussZelle(designFuss(plan)), ...zusatz.map(fussZelle)];
  return t;
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Tabellen */
function tabelleMittel(d: DesignVerteilungE, name: Name, plan?: Entwurf): TableItem | null {
  if (!d.mittel) return null;
  const rows = d.mittel.e.ergebnisse as R[], mitTest = rows.some(r => r.test);
  const kopf = [L('Spalte', 'Column'), 'n', 'M', 'SE', L('KI unten', 'CI lower'), L('KI oben', 'CI upper'), ...(mitTest ? [L('Testwert', 'Test value'), L('Differenz', 'Difference'), 't', 'df', 'p'] : [])];
  const zeilen: Z[][] = rows.map((r, i) => {
    const n = name(d.mittel!.spalten[i]!);
    if (r.fehlerCode) return [n, ...Array(kopf.length - 1).fill('-')];
    const test: Z[] = mitTest ? (r.test ? [fx(r.test.mu0), fx(r.test.diff), fx(r.test.t), fd(r.test.df), fp(r.test.p)] : Array(5).fill('-')) : [];
    return [n, fd(r.n), fx(r.mittel), fx(r.se), r.kiU === null ? '-' : fx(r.kiU), r.kiO === null ? '-' : fx(r.kiO), ...test];
  });
  const foot = [plan
    ? L('M: gewichtetes Mittel. SE: Standardfehler (Taylor-Linearisierung). KI: 95-%-Konfidenzintervall mit t-Quantil (Freiheitsgrade: Klumpen minus Schichten des Stichprobenplans), nie mit z.', 'M: weighted mean. SE: standard error (Taylor linearization). CI: 95% confidence interval with a t quantile (degrees of freedom: clusters minus strata of the sampling design), never z.')
    : L('M: gewichtetes Mittel. SE: Standardfehler (Taylor-Linearisierung). KI: 95-%-Konfidenzintervall mit t-Quantil (Freiheitsgrade: Fälle minus 1), nie mit z.', 'M: weighted mean. SE: standard error (Taylor linearization). CI: 95% confidence interval with a t quantile (degrees of freedom: cases minus 1), never z.')];
  if (mitTest) foot.push(plan ? L('Test gegen einen Wert: zweiseitig, t mit den Freiheitsgraden des Stichprobenplans (Klumpen minus Schichten).', 'Test against a value: two-sided, t with the degrees of freedom of the sampling design (clusters minus strata).') : L('Test gegen einen Wert: zweiseitig, t mit n − 1 Freiheitsgraden (das Paket survey rechnet bei einer Stichprobe mit n − 2; Statable folgt dem Intervall des Mittelwerts).', 'Test against a value: two-sided, t with n − 1 degrees of freedom (the survey package uses n − 2 for one sample; Statable follows the interval of the mean).'));
  rows.forEach(r => { if (r.fehlerCode) foot.push(umfrageFehlerSatz(r as { fehlerCode?: string })); if (r.konstant) foot.push(L('Alle Werte sind gleich: SE = 0, kein Intervall.', 'All values are the same: SE = 0, no interval.')); });
  const hw = [...new Set(rows.flatMap(r => (r.fehlerCode ? [] : umfrageHinweise('mittel', { ergebnisse: [r] }).map(c => hinweisSatz(c, { ergebnisse: [r] })))))];
  return mitDesignFuss(tabelle('Weighted Mean Interval', L('Mittelwert mit Konfidenzintervall (designbasiert)', 'Mean with confidence interval (design-based)'), kopf, zeilen, foot), '', hw, plan);
}
function tabelleAnteile(d: DesignVerteilungE, a: DesignVerteilungE['anteile'][number], k: GewichtetE['kategorien'][number], name: Name, wert: Wert, plan?: Entwurf): TableItem {
  const beta = d.anteilKi === 'beta', e = a.e;
  const kopf = [L('Wert', 'Value'), L('Gewichtete Häufigkeit', 'Weighted frequency'), L('Prozent', 'Percent'), L('SE (Prozentpunkte)', 'SE (percentage points)'), L('KI unten (%)', 'CI lower (%)'), L('KI oben (%)', 'CI upper (%)')];
  const zeilen: Z[][] = k.werte.map((w, i) => {
    const z = e.fehlerCode ? undefined : (e.kategorien as R[]).find(x => x.wert === i + 1), basis: Z[] = [wert(k.spalte, w), fx(k.summe[i]!), fx(k.prozent[i]!, 1)];
    const ki = z && !z.grenze ? (beta ? z.beta : z.logit) : null;
    return [...basis, z && !z.grenze ? fx(100 * z.se, 1) : '-', ki ? fx(100 * ki.u, 1) : '-', ki ? fx(100 * ki.o, 1) : '-'];
  });
  const foot = [beta
    ? (plan ? L('Konfidenzintervall nach Korn-Graubard (mit effektiver Fallzahl; t-Quantil mit Freiheitsgraden: Klumpen minus Schichten).', 'Confidence interval after Korn-Graubard (with effective sample size; t quantile with degrees of freedom: clusters minus strata).')
        : L('Konfidenzintervall nach Korn-Graubard (mit effektiver Fallzahl; t-Quantil mit Freiheitsgraden: Fälle minus 1).', 'Confidence interval after Korn-Graubard (with effective sample size; t quantile with degrees of freedom: cases minus 1).'))
    : (plan ? L(`Konfidenzintervall: Logit-Intervall (Wald-Intervall auf der Logit-Skala, t-Quantil mit Freiheitsgraden: Klumpen minus Schichten), liegt immer zwischen ${proz('0')} und ${proz('100')}.`, `Confidence interval: logit interval (Wald interval on the logit scale, t quantile with degrees of freedom: clusters minus strata), always between ${proz('0')} and ${proz('100')}.`)
        : L(`Konfidenzintervall: Logit-Intervall (Wald-Intervall auf der Logit-Skala, t-Quantil mit Freiheitsgraden: Fälle minus 1), liegt immer zwischen ${proz('0')} und ${proz('100')}.`, `Confidence interval: logit interval (Wald interval on the logit scale, t quantile with degrees of freedom: cases minus 1), always between ${proz('0')} and ${proz('100')}.`))];
  if (e.fehlerCode) foot.push(umfrageFehlerSatz(e as { fehlerCode?: string }));
  else {
    if (a.codes.length < k.werte.length) foot.push(L(`Intervalle nur für die ${a.codes.length} häufigsten Kategorien.`, `Intervals only for the ${a.codes.length} most frequent categories.`));
    for (const z of e.kategorien as R[]) if (z.grenze) foot.push(`${wert(k.spalte, k.werte[z.wert - 1]!)}: ${anteilGrenzeSatz(z.p)}`);
    for (const c of umfrageHinweise('anteil', e)) foot.push(hinweisSatz(c, e));
  }
  return mitDesignFuss(tabelle('Weighted Frequencies', name(k.spalte), kopf, zeilen, foot), '', [], plan);
}
function tabelleRaoScott(d: DesignKreuzE, plan?: Entwurf): TableItem | null {
  const e = d.e as R;
  if (e.fehlerCode) return null;
  const kopf = [L('Test', 'Test'), L('Wert', 'Value'), L('df (Zähler)', 'df (numerator)'), L('df (Nenner)', 'df (denominator)'), 'p'];
  const zeilen: Z[][] = [[L('Rao-Scott F (zweite Ordnung)', 'Rao-Scott F (second order)'), fx(e.f), fx(e.ndf), fx(e.ddf), fp(e.pF)], [L('Rao-Scott χ² (erste Ordnung)', 'Rao-Scott χ² (first order)'), fx(e.chi2Rs1), fd(e.dfChi2), '-', fp(e.pChi2)]];
  const ganz = Number.isInteger(e.ndf) && Number.isInteger(e.ddf);
  const foot = [ganz
    ? L('Der Test ist der Rao-Scott-korrigierte Pearson-Test für gewichtete Daten: F zweiter Ordnung ist der Test; χ² erster Ordnung steht für alle, die es berichten müssen. Ein Pearson-χ² der hochgerechneten Zählungen zeigt Statable nie.',
      'The test is the Rao-Scott corrected Pearson test for weighted data: second-order F is the test; first-order χ² is there for those who must report it. Statable never shows a Pearson χ² of the scaled-up counts.')
    : L('Der Test ist der Rao-Scott-korrigierte Pearson-Test für gewichtete Daten: F mit nicht ganzzahligen Freiheitsgraden (das ist richtig) ist der Test; χ² erster Ordnung steht für alle, die es berichten müssen. Ein Pearson-χ² der hochgerechneten Zählungen zeigt Statable nie.',
      'The test is the Rao-Scott corrected Pearson test for weighted data: F with non-integer degrees of freedom (that is correct) is the test; first-order χ² is there for those who must report it. Statable never shows a Pearson χ² of the scaled-up counts.')];
  if (e.deltaMittel !== null && e.deltaMittel !== undefined) foot.push(L(`Mittlerer Designeffekt der Tabelle: ${komma(e.deltaMittel)}.`, `Mean design effect of the table: ${komma(e.deltaMittel)}.`));
  for (const c of umfrageHinweise('kreuz', e)) foot.push(hinweisSatz(c, e));
  return mitDesignFuss(tabelle('Rao-Scott Test', L('Test auf Zusammenhang (Rao-Scott, designbasiert)', 'Test of association (Rao-Scott, design-based)'), kopf, zeilen, foot), '', [], plan);
}

/** Die Fußnote „Nur beschreibend“ der beschreibenden Tabellen durch `neu` ersetzen (ohne Angabe: ganz weglassen). */
function ersetzeFuss(t: TableItem, nurBeschreibend: string, neu: string[] = []): TableItem {
  t.footnotes = [...t.footnotes.filter(f => f.t !== nurBeschreibend), ...neu.map(fussZelle)];
  return t;
}
const nurBeschr = () => L('Nur beschreibend: Für diese Zahlen gibt es mit einem Umfragegewicht keinen Standardfehler und kein Intervall.', 'Descriptive only: with a survey weight there is no standard error and no interval for these numbers.');

/** Die Tabellen der designbasierten Karte: die beschreibenden (`basis`, aus `tabellenGewichtet` ohne Design) mit passender Fußnote, dazu die neuen. */
export function designTabellen(e: GewichtetE, basis: TableItem[], nurBeschreibend: string, name: Name, wert: Wert): TableItem[] {
  const d = e.design!, aus: TableItem[] = [];
  if (d.art === 'verteilung') {
    let j = 0;
    for (const t of basis) {
      if (t.label === 'Weighted Frequencies') { const a = d.anteile[j], k = e.kategorien[j]; j++; aus.push(a && k ? tabelleAnteile(d, a, k, name, wert, e.gewicht?.entwurf) : ersetzeFuss(t, nurBeschreibend, [nurBeschr()])); continue; }
      if (t.label === 'Weighted Descriptive Statistics') {
        aus.push(ersetzeFuss(t, nurBeschreibend, [d.mittel ? L('Beschreibend: SD, Quartile, kleinster und größter Wert zeigen nur die Streuung in der Stichprobe. Standardfehler und Intervall des Mittelwerts stehen in der Tabelle „Mittelwert mit Konfidenzintervall (designbasiert)“.', 'Descriptive: SD, quartiles, smallest and largest value show only the spread in the sample. Standard error and interval of the mean are in the table "Mean with confidence interval (design-based)".') : nurBeschr()]));
        const m = tabelleMittel(d, name, e.gewicht?.entwurf); if (m) aus.push(m);
        continue;
      }
      aus.push(ersetzeFuss(t, nurBeschreibend, t.label === 'Weighted Robust Location' ? [] : [nurBeschr()]));
    }
    if (d.fehler) aus[0]?.footnotes.push(fussZelle(umfrageFehlerSatz(d.fehler as { fehlerCode?: string })));
  } else {
    basis.forEach((t, i) => {
      aus.push(ersetzeFuss(t, nurBeschreibend, i === 0 ? [L('Gewichtete Zählungen und Prozente; sie haben kein eigenes Intervall.', 'Weighted counts and percentages; they have no interval of their own.'), ...(d.e.fehlerCode ? [umfrageFehlerSatz(d.e as { fehlerCode?: string })] : [L('Der Test steht in der Tabelle „Test auf Zusammenhang (Rao-Scott, designbasiert)“.', 'The test is in the table "Test of association (Rao-Scott, design-based)".')])] : []));
      if (i === 0) { const r = tabelleRaoScott(d, e.gewicht?.entwurf); if (r) aus.push(r); }
    });
  }
  return aus;
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Sätze */
/** Die Sätze: der APA-Satz je Mittelwert (höchstens 6) und je Kategorie-Spalte die häufigste Kategorie (höchstens 3); bei der Kreuztabelle der Satz zum Rao-Scott-Test. `basis`: die Sätze der beschreibenden Rechnung. */
export function designSaetze(e: GewichtetE, basis: Saetze, name: Name, wert: Wert): Saetze {
  const d = e.design!;
  const ctx = { gewicht: e.gewicht, name: '' };
  let haupt = '', detail = '', hinweise: string[] = [];
  if (d.art === 'kreuz') {
    if (d.e.fehlerCode) haupt = umfrageFehlerSatz(d.e as { fehlerCode?: string });
    else { const t = umfrageSatz('kreuz', d.e, { ...ctx, name: L(`${name(d.zeile)} und ${name(d.spalte)}`, `${name(d.zeile)} and ${name(d.spalte)}`) }); haupt = t.haupt; detail = t.detail; hinweise = t.hinweise; }
  } else {
    const teile: string[] = [];
    if (d.fehler) teile.push(umfrageFehlerSatz(d.fehler as { fehlerCode?: string }));
    d.mittel?.e.ergebnisse.slice(0, 6).forEach((r: R, i: number) => {
      const t = umfrageSatz('mittel', d.mittel!.e, { ...ctx, name: name(d.mittel!.spalten[i]!), index: i });
      teile.push(t.haupt); if (i === 0) detail = t.detail; hinweise.push(...t.hinweise);
    });
    for (const a of d.anteile.slice(0, 3)) {
      if (a.e.fehlerCode) { teile.push(umfrageFehlerSatz(a.e as { fehlerCode?: string })); continue; }
      const kat = a.e.kategorien as R[], besser = kat.reduce((m, x, i) => (x.p > kat[m]!.p ? i : m), 0), z = kat[besser]!;
      const t = umfrageSatz('anteil', a.e, { ...ctx, name: L(`${zitat(wert(a.spalte, a.werte[z.wert - 1]!))} (${name(a.spalte)})`, `${zitat(wert(a.spalte, a.werte[z.wert - 1]!))} (${name(a.spalte)})`), index: besser, methode: d.anteilKi });
      teile.push(t.haupt); hinweise.push(...t.hinweise);
    }
    haupt = teile.join(' ');
  }
  const uniq = [...new Set(hinweise)];
  return { ...basis, haupt, zusatz: [detail, umfrageMethode(e.gewicht)].filter(Boolean).join(' '), vorsicht: uniq.length ? uniq.join(' ') : basis.vorsicht, apa: '' };
}

