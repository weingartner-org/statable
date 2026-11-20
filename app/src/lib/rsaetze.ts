/**
 * Sätze, APA-Zeilen und Tabellen zu McDonalds Omega und zur konfirmatorischen Faktorenanalyse (Zahlen: rverfahren.svelte.ts, R/lavaan).
 * Die Tabellen sind echte Tabellen (TableItem) für Blatt, Bericht, Word, PDF und Excel; sie folgen bei jedem Aufruf der Sprache.
 * ⚠ Satzvorlagen und die Einordnung der Fit-Werte (Hu & Bentler 1999) von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { zitat as anfuehrung, iv } from '../i18n/profil';
import { komma, ohneNull, pWert, kurz, alphaWort, aufzaehlung, type Saetze } from './ergebnis';
import { tabelle, fx, fo, fp, fd, type Z } from './mwsaetze';
import { fitUrteil, fitErfuellt, FIT_GRENZEN, type OmegaErg, type CfaErg } from './rverfahren.svelte';
import { kleinste, groesste } from './menge';

const T = L;
const zitat = (t: string) => anfuehrung(kurz(t));
const kiT = (lo: string, hi: string, niveau = 95) => T(`${niveau} %-KI ${iv(lo, hi)}`, `${niveau}% CI ${iv(lo, hi)}`);

/* ------------------------------------------------------------ Omega */

export const omegaKi = (o: OmegaErg): string => (o.lo !== null && o.hi !== null ? kiT(ohneNull(o.lo), ohneNull(o.hi)) : '');
/** Kurzform für die Zeile unter Alpha: „ω = ,74, 95 %-KI [,69; ,78]“. */
export const omegaZeile = (o: OmegaErg) => `ω = ${ohneNull(o.omega)}${omegaKi(o) ? ', ' + omegaKi(o) : ''}`;

/** Hängt Omega an die Sätze der Skala (Alpha). */
export function mitOmega(st: Saetze, o: OmegaErg | undefined): Saetze {
  if (!o) return st;
  const wort = alphaWort(o.omega), z = omegaZeile(o);
  const alsoWie = o.art === 'bootstrap' ? T('Bootstrap-Intervall', 'bootstrap interval') : T('Intervall nach der Delta-Methode', 'delta-method interval');
  const satz = T(`McDonalds Omega (ω total) liegt bei ${ohneNull(o.omega)}${omegaKi(o) ? ` (${omegaKi(o)})` : ''}: ${wort}. Omega lässt zu, dass die Fragen unterschiedlich stark zur Skala beitragen; Alpha nimmt gleiche Beiträge an (tau-Äquivalenz).`,
    `McDonald's omega (total) is ${ohneNull(o.omega)}${omegaKi(o) ? ` (${omegaKi(o)})` : ''}: ${wort}. Omega allows the questions to contribute to the scale to different degrees; alpha assumes equal contributions (tau equivalence).`);
  const hinweise = [
    o.heywood ? T('Die Rechnung liefert für mindestens eine Frage eine negative Restvarianz oder eine Ladung über 1 (Heywood-Fall); Omega ist dann unsicher.', 'The calculation gives at least one question a negative residual variance or a loading above 1 (Heywood case); omega is then uncertain.') : '',
    o.nAlle > o.n ? T(`Es gehen ${o.n} von ${o.nAlle} Personen ein (nur mit allen Antworten).`, `${o.n} of ${o.nAlle} people are included (only those with all answers).`) : ''
  ].filter(Boolean).join(' ');
  const h = o.omegaH !== undefined ? T(` ω hierarchisch (ωh) = ${ohneNull(o.omegaH)} bei ${o.nf} Gruppenfaktoren.`, ` Hierarchical omega (ωh) = ${ohneNull(o.omegaH)} with ${o.nf} group factors.`) : '';
  return {
    ...st,
    zusatz: `${st.zusatz} ${satz}${h}${hinweise ? ' ' + hinweise : ''}`.trim(),
    vorsicht: `${st.vorsicht} ${T(`Omega rechnet ein Ein-Faktor-Modell (lavaan, ML; ${alsoWie}). Messen die Fragen mehr als eine Sache, ist Omega nicht sinnvoll zu deuten; dann hilft die Faktorenanalyse.`, `Omega fits a one-factor model (lavaan, ML; ${alsoWie}). If the questions measure more than one thing, omega cannot be interpreted meaningfully; a factor analysis helps then.`)}`,
    apa: `${st.apa}; ${T('McDonalds', "McDonald's")} ω = ${ohneNull(o.omega)}${omegaKi(o) ? ', ' + omegaKi(o) : ''}`,
    marken: [...st.marken, { text: `ω = ${ohneNull(o.omega)}`, erklaer: 'omega' }]
  };
}

export function tabellenOmega(o: OmegaErg): TableItem[] {
  const zeilen: Z[][] = [[T('McDonalds ω (total, Ein-Faktor-Modell)', "McDonald's ω (total, one-factor model)"), fo(o.omega, 3), o.lo !== null ? fo(o.lo, 3) : '-', o.hi !== null ? fo(o.hi, 3) : '-']];
  if (o.omegaH !== undefined) zeilen.push([T(`ω hierarchisch (${o.nf} Gruppenfaktoren, psych)`, `ω hierarchical (${o.nf} group factors, psych)`), fo(o.omegaH, 3), '-', '-']);
  return [tabelle('McDonald Omega', T('McDonalds Omega', "McDonald's omega"), [T('Koeffizient', 'Coefficient'), T('Schätzung', 'Estimate'), T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')], zeilen,
    [T(`R (lavaan${o.omegaH !== undefined ? L(', psych', ', psych') : ''}) mit ${o.n} Personen, ${o.k} Fragen. ω = (Σλ)² / ((Σλ)² + Σθ) aus einem Ein-Faktor-Modell (ML). Intervall: ${o.art === 'bootstrap' ? L(`Perzentil-Bootstrap, ${o.ziehungen} Ziehungen, fester Startwert`, `percentile bootstrap, ${o.ziehungen} draws, fixed seed`) : L('Delta-Methode (lavaan)', 'delta method (lavaan)')}.${o.fiml ? L(' Fehlende Werte: FIML.', ' Missing values: FIML.') : ''}`,
      `R (lavaan${o.omegaH !== undefined ? L(', psych', ', psych') : ''}) with ${o.n} people, ${o.k} questions. ω = (Σλ)² / ((Σλ)² + Σθ) from a one-factor model (ML). Interval: ${o.art === 'bootstrap' ? L(`Perzentil-Bootstrap, ${o.ziehungen} Ziehungen, fester Startwert`, `percentile bootstrap, ${o.ziehungen} draws, fixed seed`) : L('Delta-Methode (lavaan)', 'delta method (lavaan)')}.${o.fiml ? L(' Fehlende Werte: FIML.', ' Missing values: FIML.') : ''}`)])];
}

/* ------------------------------------------------------------ CFA */

const urteilWort = (u: ReturnType<typeof fitUrteil>) => (u === 'gut' ? T('gut', 'good') : u === 'akzeptabel' ? T('akzeptabel', 'acceptable') : T('nicht ausreichend', 'not sufficient'));
export const faktorName = (c: CfaErg, i: number) => c.faktoren[i]?.name || T(`Faktor ${i + 1}`, `Factor ${i + 1}`);

/** APA-Zeile: χ²(df) = …, p …, CFI, TLI, RMSEA mit 90-%-KI, SRMR. */
export function cfaApa(c: CfaErg): string {
  const f = c.fit, ws = c.schaetzer === 'WLSMV' ? T(' (skaliert)', ' (scaled)') : '';
  return `${T('CFA', 'CFA')}: χ²(${komma(f.df, 0)}) = ${komma(f.chisq)}${ws}, p ${pWert(f.p)}, CFI = ${ohneNull(f.cfi)}, TLI = ${ohneNull(f.tli)}, RMSEA = ${ohneNull(f.rmsea)}, ${kiT(ohneNull(f.rmseaLo), ohneNull(f.rmseaHi), 90)}, SRMR = ${ohneNull(f.srmr)} (n = ${c.n})`;
}

export function saetzeCfa(c: CfaErg): Saetze {
  const f = c.fit, u = fitUrteil(f), ok = fitErfuellt(f), m = c.faktoren.length, p = c.faktoren.reduce((a, x) => a + x.fragen.length, 0);
  const haupt = T(`Das Modell mit ${Lp(m, `${m} Faktor`, `${m} Faktoren`, `${m} factor`, `${m} factors`)} und ${p} Fragen passt ${urteilWort(u)} zu den Daten (CFI = ${ohneNull(f.cfi)}, RMSEA = ${ohneNull(f.rmsea)}, SRMR = ${ohneNull(f.srmr)}).`,
    `The model with ${Lp(m, `${m} Faktor`, `${m} Faktoren`, `${m} factor`, `${m} factors`)} and ${p} questions fits the data ${urteilWort(u)} (CFI = ${ohneNull(f.cfi)}, RMSEA = ${ohneNull(f.rmsea)}, SRMR = ${ohneNull(f.srmr)}).`);
  const niedrig = c.ladungen.filter(l => Math.abs(l.std) < 0.4);
  const lad = T(`Die standardisierten Ladungen liegen zwischen ${ohneNull(Math.min(kleinste(c.ladungen.map(l => Math.abs(l.std)))))} und ${ohneNull(Math.max(groesste(c.ladungen.map(l => Math.abs(l.std)))))}.`,
    `The standardized loadings range from ${ohneNull(Math.min(kleinste(c.ladungen.map(l => Math.abs(l.std)))))} to ${ohneNull(Math.max(groesste(c.ladungen.map(l => Math.abs(l.std)))))}.`);
  const schwach = niedrig.length ? Lp(niedrig.length, ` ${aufzaehlung(niedrig.map(l => zitat(l.frage)))} lädt unter ,40 auf dem Faktor.`, ` ${aufzaehlung(niedrig.map(l => zitat(l.frage)))} laden unter ,40 auf dem Faktor.`, ` ${aufzaehlung(niedrig.map(l => zitat(l.frage)))} loads below .40 on the factor.`, ` ${aufzaehlung(niedrig.map(l => zitat(l.frage)))} load below .40 on the factor.`) : '';
  const faktorKor = c.kor.map(k => T(`${faktorName(c, k.a)} und ${faktorName(c, k.b)} r = ${ohneNull(k.r)}`, `${faktorName(c, k.a)} and ${faktorName(c, k.b)} r = ${ohneNull(k.r)}`)).join('; ');
  const kor = c.kor.length ? T(` Faktorkorrelationen: ${faktorKor}.`, ` Factor correlations: ${faktorKor}.`) : '';
  const chi = T(`χ²(${komma(f.df, 0)}) = ${komma(f.chisq)}, p ${pWert(f.p)}: Der Test fällt bei großen Stichproben schon bei kleinen Abweichungen signifikant aus und wird deshalb mit den Fit-Indizes zusammen gelesen.`,
    `χ²(${komma(f.df, 0)}) = ${komma(f.chisq)}, p ${pWert(f.p)}: with large samples the test is significant even for small misfit and is therefore read together with the fit indices.`);
  const heyw = c.heywood ? T(' Mindestens eine Restvarianz ist negativ oder eine Ladung liegt über 1 (Heywood-Fall): Das Modell ist dann mit Vorsicht zu lesen; oft hilft ein Faktor weniger oder mehr Fragen je Faktor.', ' At least one residual variance is negative or a loading is above 1 (Heywood case): read the model with caution; often one factor fewer or more questions per factor helps.') : '';
  return {
    haupt,
    zusatz: `${chi} ${lad}${schwach}${kor}${heyw}`,
    vorsicht: T('Die Schwellen (CFI und TLI ab ,95, RMSEA bis ,06, SRMR bis ,08) sind Faustregeln nach Hu und Bentler (1999), keine Tests; sie gelten nicht für jedes Modell gleich gut. Ein passendes Modell zeigt nicht, dass die Faktoren das Richtige messen.',
      'The cut-offs (CFI and TLI from .95, RMSEA up to .06, SRMR up to .08) are rules of thumb after Hu and Bentler (1999), not tests; they do not suit every model equally well. A fitting model does not show that the factors measure the right thing.')
      + (c.schaetzer === 'WLSMV' ? T(' Mit WLSMV sind die Schwellen weniger gut belegt.', ' With WLSMV the cut-offs are less well established.') : ''),
    apa: cfaApa(c),
    marken: [
      { text: T(`Passung: ${urteilWort(u)}`, `Fit: ${urteilWort(u)}`), erklaer: 'fit-indizes', hinweis: u === 'unzureichend' },
      { text: `CFI = ${ohneNull(f.cfi)}`, erklaer: 'fit-indizes', hinweis: !ok.cfi },
      { text: `RMSEA = ${ohneNull(f.rmsea)}`, erklaer: 'fit-indizes', hinweis: !ok.rmsea },
      { text: `SRMR = ${ohneNull(f.srmr)}`, erklaer: 'fit-indizes', hinweis: !ok.srmr },
      ...(c.nAlle > c.n ? [{ text: T(`${c.n} von ${c.nAlle} Personen`, `${c.n} of ${c.nAlle} people`), erklaer: 'stichprobe', hinweis: true }] : [])
    ]
  };
}

/** Hängt die CFA an die Sätze der explorativen Faktorenanalyse. */
export function mitCfa(st: Saetze, c: CfaErg | undefined): Saetze {
  if (!c) return st;
  const k = saetzeCfa(c);
  return { ...st, zusatz: `${st.zusatz} ${T('Konfirmatorisch geprüft:', 'Tested confirmatorily:')} ${k.haupt} ${k.zusatz}`.trim(), vorsicht: `${st.vorsicht} ${k.vorsicht}`, apa: `${st.apa}; ${k.apa}`, marken: [...st.marken, ...k.marken] };
}

export function tabellenCfa(c: CfaErg, name: (q: string) => string = q => q): TableItem[] {
  const f = c.fit, ok = fitErfuellt(f), jn = (b: boolean) => (b ? T('ja', 'yes') : T('nein', 'no'));
  const schaetzer = c.schaetzer === 'WLSMV' ? T('WLSMV (ordinale Daten, skalierte Kennwerte)', 'WLSMV (ordinal data, scaled statistics)') : c.fiml ? T('ML mit FIML bei fehlenden Werten', 'ML with FIML for missing values') : T('ML (Maximum Likelihood)', 'ML (maximum likelihood)');
  const fit = tabelle('CFA Fit', T('Konfirmatorische Faktorenanalyse: Passung des Modells', 'Confirmatory factor analysis: model fit'),
    [T('Kennwert', 'Statistic'), T('Wert', 'Value'), T('Richtwert (Hu & Bentler 1999)', 'Guideline (Hu & Bentler 1999)'), T('erfüllt', 'met')],
    [[`χ² (df = ${komma(f.df, 0)})`, fx(f.chisq), `p ${pWert(f.p)}`, '-'],
      ['CFI', fo(f.cfi, 3), `≥ ${ohneNull(FIT_GRENZEN.cfi)}`, jn(ok.cfi)],
      ['TLI', fo(f.tli, 3), `≥ ${ohneNull(FIT_GRENZEN.tli)}`, jn(ok.tli)],
      ['RMSEA', fo(f.rmsea, 3), `≤ ${ohneNull(FIT_GRENZEN.rmsea)}`, jn(ok.rmsea)],
      [T('RMSEA, 90 %-KI', 'RMSEA, 90% CI'), `${ohneNull(f.rmseaLo, 3)} - ${ohneNull(f.rmseaHi, 3)}`, '-', '-'],
      ['SRMR', fo(f.srmr, 3), `≤ ${ohneNull(FIT_GRENZEN.srmr)}`, jn(ok.srmr)]],
    [T(`R (lavaan), ${c.n} Personen${c.nAlle > c.n ? L(` von ${c.nAlle}`, ` of ${c.nAlle}`) : ''}. Schätzer: ${schaetzer}. Die Richtwerte sind Faustregeln, keine Tests.`, `R (lavaan), ${c.n} people${c.nAlle > c.n ? L(` von ${c.nAlle}`, ` of ${c.nAlle}`) : ''}. Estimator: ${schaetzer}. The guidelines are rules of thumb, not tests.`)]);
  const lad = tabelle('CFA Loadings', T('Standardisierte Ladungen', 'Standardized loadings'),
    [T('Faktor', 'Factor'), T('Frage', 'Question'), 'λ', 'SE', 'p', T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')],
    c.ladungen.map(l => [faktorName(c, l.faktor), name(l.frage), fo(l.std), l.se !== null ? fo(l.se, 3) : '-', l.p !== null ? fp(l.p) : '-', l.lo !== null ? fo(l.lo) : '-', l.hi !== null ? fo(l.hi) : '-']),
    [T('Voll standardisierte Lösung (Faktor- und Fragenvarianz = 1).', 'Completely standardized solution (factor and item variance = 1).')]);
  const t: TableItem[] = [fit, lad];
  if (c.kor.length) t.push(tabelle('CFA Factor Correlations', T('Korrelationen der Faktoren', 'Factor correlations'), [T('Faktor 1', 'Factor 1'), T('Faktor 2', 'Factor 2'), 'r', 'SE', 'p'],
    c.kor.map(k => [faktorName(c, k.a), faktorName(c, k.b), fo(k.r), k.se !== null ? fo(k.se, 3) : '-', k.p !== null ? fp(k.p) : '-'])));
  void fd;
  return t;
}
