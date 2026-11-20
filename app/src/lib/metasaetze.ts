/**
 * Sätze, APA-Zeile und Tabellen zur Meta-Analyse (Zahlen: metaanalyse.ts, R: metafor). Die Tabellen sind echte Tabellen (TableItem)
 * für Blatt, Bericht, Word, PDF und Excel; sie folgen bei jedem Aufruf der Sprache.
 * ⚠ Von der Fachperson abzunehmen: Satzvorlagen, Größenwörter (Cohen 1988 für g und r), I²-Wörter (Higgins et al. 2003: etwa 25/50/75 %, Faustregel, keine Grenzen),
 *   Hinweis zu Egger ab k < 10 (Sterne et al. 2011), Hinweis zu k < 5, Satz zum Prädiktionsintervall (Standard wie metafor::predict und JASP; die Variante nach IntHout et al. 2016 mit t(k − 2) unter „Für Fachleute“).
 */
import type { TableItem } from '../engine/types';
import { L, d } from './sitzung.svelte';
import { iv, ki, proz, zitat } from '../i18n/profil';
import { komma, ohneNull, pWert, type Saetze } from './ergebnis';
import { tabelle, fx, fo, fp, fd, type Z } from './mwsaetze';
import { META_K_EGGER, META_K_WENIG, massKurz, rueck, type Meta } from './metaanalyse';

const T = L;
const prozent = (v: number) => proz(komma(v, 0));
/** Intervall mit Semikolon (DE) bzw. Komma (EN), wie überall im Programm. */
/** τ² mit drei Stellen, wenn es unter ,01 liegt (sonst stünde „0,00“ neben einem τ von 0,07). */
const t2 = (v: number) => komma(v, v < 0.01 && v > 0 ? 3 : 2);
const dfText = (d: number) => (Math.abs(d - Math.round(d)) < 1e-9 ? komma(d, 0) : komma(d, 2));

/** Anzeige-Zahl des Effekts: g mit 2 Stellen, r ohne führende Null, Verhältnisse mit 2 Stellen. */
const zeig = (m: Meta, v: number) => { const x = rueck(m)(v); return m.ein.art === 'r' ? ohneNull(x, 2) : komma(x, 2); };
/** Größenwort: Cohen (g: .2/.5/.8, r: .1/.3/.5). Nur für g und r. ⚠ Fachperson. */
export function groessenWort(m: Meta): string {
  if (m.ein.art === 'es') return '';
  const a = Math.abs(rueck(m)(m.est)), [k, mi, g] = m.ein.art === 'smd' ? [0.2, 0.5, 0.8] : [0.1, 0.3, 0.5];
  return a < k ? T('sehr klein', 'very small') : a < mi ? T('klein', 'small') : a < g ? T('mittel', 'medium') : T('groß', 'large');
}
/** Schwellen des Größenworts (Cohen), als Text für den Satz: „Größe: klein (Cohen: 0,2 bis unter 0,5)“. */
export function groessenSchwelle(m: Meta): string {
  const w = groessenWort(m); if (!w) return '';
  const [k, mi, g] = m.ein.art === 'smd' ? [0.2, 0.5, 0.8] : [0.1, 0.3, 0.5], z = (v: number) => (m.ein.art === 'smd' ? komma(v, 1) : ohneNull(v, 1));
  const bis = (a: number, b: number) => T(`${z(a)} bis unter ${z(b)}`, `${z(a)} to below ${z(b)}`);
  const text = w === T('sehr klein', 'very small') ? T(`unter ${z(k)}`, `below ${z(k)}`) : w === T('klein', 'small') ? bis(k, mi) : w === T('mittel', 'medium') ? bis(mi, g) : T(`ab ${z(g)}`, `from ${z(g)}`);
  return `Cohen: ${text}`;
}
/** Wort zu I² (Higgins et al. 2003). ⚠ Fachperson. */
export const i2Wort = (i2: number) => (i2 < 25 ? T('gering', 'low') : i2 < 50 ? T('mäßig', 'moderate') : i2 < 75 ? T('erheblich', 'substantial') : T('hoch', 'high'));   // T51: Higgins et al. (2003) ab 75 % „high“
const pruefName = (m: Meta) => (m.statDf !== null ? 't' : 'z');
const statText = (m: Meta) => (m.statDf !== null ? `t(${dfText(m.statDf)})` : 'z');

/** Prädiktionsintervall nach IntHout et al. (2016), t mit k − 2 Freiheitsgraden, in der Anzeige-Skala; `null` bei k = 2 (nicht definiert). */
export function piIntHout(m: Meta): string | null {
  return Number.isFinite(m.pitLo) && Number.isFinite(m.pitHi) ? iv(zeig(m, m.pitLo), zeig(m, m.pitHi)) : null;
}

export function metaApa(m: Meta): string {
  const M = massKurz(m.ein, T), kopf = T('Meta-Analyse (Random-Effects-Modell, REML)', 'Meta-analysis (random-effects model, REML)');
  const eff = `${M} = ${zeig(m, m.est)}, ${ki(zeig(m, m.lo), zeig(m, m.hi))}, ${statText(m)} = ${komma(m.stat)}, p ${pWert(m.p)}`;
  const regApa = m.reg ? `; ${T('Meta-Regression', 'meta-regression')}: ${regTest(m)}, p ${pWert(m.reg.qmP)}${Number.isFinite(m.reg.r2) ? `, R² = ${prozent(Math.max(0, m.reg.r2))}` : ''}` : '';
  return `${kopf}: ${eff}; Q(${komma(m.qDf, 0)}) = ${komma(m.q)}, p ${pWert(m.qP)}; I² = ${prozent(m.i2)}; τ² = ${t2(m.tau2)} (k = ${m.k})${regApa}`;
}

/** Meta-Regression: Test aller Moderatoren als Text. Mit Knapp-Hartung ein F-Test (m, k − p Freiheitsgrade; metafor legt den F-Wert in QM ab), sonst Chi-Quadrat (QM, df = m). */
const regTest = (m: Meta) => { const g = m.reg!; return g.df !== null ? `F(${komma(g.qmDf, 0)}, ${dfText(g.df)}) = ${komma(g.qm)}` : `Q_M(${komma(g.qmDf, 0)}) = ${komma(g.qm)}`; };
const regName = (n: string) => (n === '(Intercept)' ? T('Konstante', 'Intercept') : n);
/** Sätze zur Meta-Regression (S-H). ⚠ Von der Fachperson abzunehmen: Faustregel 10 Studien je Moderator (Borenstein et al. 2009, Kap. 20; Higgins & Thompson 2004), R² als Anteil erklärter Heterogenität (Raudenbush 2009), Hinweis „Zusammenhang, keine Ursache“ (die Moderatoren sind Merkmale der Studien, nicht zugewiesen). */
function saetzeReg(m: Meta): { text: string; warnung: string[] } {
  const g = m.reg!, mods = g.namen.slice(1), verh = m.ein.verhaeltnis, art = m.ein.art;
  const sig = g.qmP < 0.05, r2 = Number.isFinite(g.r2) ? g.r2 : NaN;
  // Satzteile als eigene Texte (L), damit sie in jeder Sprache übersetzt werden (Falle 12: nie deutsche oder englische Wörter in fremde Sätze setzen).
  const mitWort = mods.length === 1 ? L('dem Moderator', 'the moderator') : L('den Moderatoren', 'the moderators');
  const namen = mods.map(x => zitat(x)).join(', ');
  const urteil = sig ? L('Die Moderatoren hängen erkennbar mit dem Effekt zusammen', 'the moderators are clearly related to the effect') : L('Die Moderatoren hängen nicht erkennbar mit dem Effekt zusammen', 'the moderators are not clearly related to the effect');
  const erklaert = Number.isFinite(r2) ? L(`; sie erklären ${prozent(Math.max(0, r2))} der Heterogenität zwischen den Studien (R²)`, `; they explain ${prozent(Math.max(0, r2))} of the heterogeneity between studies (R²)`) : '';
  const kopf = T(`Meta-Regression mit ${mitWort} ${namen} (${g.k} Studien): ${urteil} (${regTest(m)}, p ${pWert(g.qmP)})${erklaert}.`, `Meta-regression with ${mitWort} ${namen} (${g.k} studies): ${urteil} (${regTest(m)}, p ${pWert(g.qmP)})${erklaert}.`);
  const koef = mods.map((n, i) => {
    const j = i + 1, b = g.b[j]!, stat = g.df !== null ? `t(${dfText(g.df)})` : 'z';
    const faktor = verh ? L(` Je eine Einheit mehr ändert das Verhältnis um den Faktor ${komma(Math.exp(b), 3)}.`, ` One unit more changes the ratio by a factor of ${komma(Math.exp(b), 3)}.`) : '';
    return T(`${n}: B = ${komma(b, 3)}, ${ki(komma(g.lo[j]!, 3), komma(g.hi[j]!, 3))}, ${stat} = ${komma(g.stat[j]!)}, p ${pWert(g.p[j]!)}.${faktor}`, `${n}: B = ${komma(b, 3)}, ${ki(komma(g.lo[j]!, 3), komma(g.hi[j]!, 3))}, ${stat} = ${komma(g.stat[j]!)}, p ${pWert(g.p[j]!)}.${faktor}`);
  });
  const rest = T(`Restheterogenität: Q(${komma(g.qeDf, 0)}) = ${komma(g.qe)}, p ${pWert(g.qeP)}; I² = ${prozent(g.i2)}; τ² = ${t2(g.tau2)}.`, `Residual heterogeneity: Q(${komma(g.qeDf, 0)}) = ${komma(g.qe)}, p ${pWert(g.qeP)}; I² = ${prozent(g.i2)}; τ² = ${t2(g.tau2)}.`);
  const skala = art === 'r' ? T('Die Koeffizienten stehen auf der Fisher-z-Skala.', 'The coefficients are on the Fisher z scale.') : verh ? T('Die Koeffizienten stehen auf der Log-Skala des Verhältnisses.', 'The coefficients are on the log scale of the ratio.') : '';
  const warnung: string[] = [];
  const nMod = mods.length, modWort = nMod === 1 ? L('Moderator', 'moderator') : L('Moderatoren', 'moderators');
  if (g.k < 10 * nMod) warnung.push(T(`Faustregel: mindestens 10 Studien je Moderator. Mit ${g.k} Studien und ${nMod} ${modWort} ist die Meta-Regression vorläufig und kann leicht zufällig sein (Borenstein et al., 2009; Higgins & Thompson, 2004).`, `Rule of thumb: at least 10 studies per moderator. With ${g.k} studies and ${nMod} ${modWort} the meta-regression is preliminary and may easily be due to chance (Borenstein et al., 2009; Higgins & Thompson, 2004).`));
  warnung.push(T('Moderatoren sind Merkmale der Studien, nicht zufällig zugewiesen: Sie zeigen einen Zusammenhang zwischen den Studien, keine Ursache. Andere Merkmale, die mit dem Moderator zusammenhängen, können ihn erklären.', 'Moderators are characteristics of the studies, not randomly assigned: they show an association between studies, not a cause. Other characteristics related to the moderator may explain it.'));
  return { text: [kopf, ...koef, rest, skala].filter(Boolean).join('\n'), warnung };
}

export function saetzeMeta(m: Meta): Saetze {
  const Mk = massKurz(m.ein, T), sig = m.p < 0.05, wort = groessenWort(m);
  const verh = m.ein.verhaeltnis;
  const effZahl = `${Mk} = ${zeig(m, m.est)}, ${ki(zeig(m, m.lo), zeig(m, m.hi))}`;
  const ref = verh ? T('von 1', 'from 1') : T('von null', 'from zero');
  const abw = sig ? T(`Er weicht erkennbar ${ref} ab`, `It differs clearly ${ref}`) : T(`Er weicht nicht erkennbar ${ref} ab`, `It does not differ clearly ${ref}`);
  // Heißt das Maß nur „Effekt“/„Verhältnis“, stünde „bei Effekt = 0,44“: dann nur die Zahl (B8). Mit eigenem Namen (RR, g, r) bleibt er davor.
  const eigenerName = m.ein.art === 'smd' || m.ein.art === 'r' || !!m.ein.massName;
  const effSatz = eigenerName ? effZahl : `${zeig(m, m.est)}, ${ki(zeig(m, m.lo), zeig(m, m.hi))}`;
  // F9 (Abschlusstest): Das Prädiktionsintervall gehört in den Hauptsatz - es zeigt, wie weit die wahren Effekte einzelner Studien streuen (IntHout et al. 2016).
  const piLo = rueck(m)(m.pLo), piHi = rueck(m)(m.pHi), nullWert = verh ? 1 : 0;
  const piNull = piLo <= nullWert && piHi >= nullWert;
  const piSatz = T(` In einer neuen, vergleichbaren Studie ist der wahre Effekt im Bereich ${iv(zeig(m, m.pLo), zeig(m, m.pHi))} zu erwarten (95 %-Prädiktionsintervall)${sig && piNull ? (verh ? L('; er kann dort auch bei 1 oder in der Gegenrichtung liegen, obwohl der gepoolte Effekt von 1 abweicht', '; it may also lie at 1 or in the opposite direction, although the pooled effect differs from 1') : L('; er kann dort auch bei null oder in der Gegenrichtung liegen, obwohl der gepoolte Effekt von null abweicht', '; it may also lie at zero or in the opposite direction, although the pooled effect differs from zero')) : ''}.`,
    ` In a new, comparable study the true effect is expected in the range ${iv(zeig(m, m.pLo), zeig(m, m.pHi))} (95% prediction interval)${sig && piNull ? (verh ? L('; er kann dort auch bei 1 oder in der Gegenrichtung liegen, obwohl der gepoolte Effekt von 1 abweicht', '; it may also lie at 1 or in the opposite direction, although the pooled effect differs from 1') : L('; er kann dort auch bei null oder in der Gegenrichtung liegen, obwohl der gepoolte Effekt von null abweicht', '; it may also lie at zero or in the opposite direction, although the pooled effect differs from zero')) : ''}.`);
  const haupt = T(
    `Über ${m.k} Studien hinweg liegt der gepoolte Effekt bei ${effSatz}${verh ? L(' (Verhältnis; 1 = kein Effekt)', ' (ratio; 1 = no effect)') : ''}. ${abw} (${pruefName(m)}-Test, p ${pWert(m.p)})${wort && sig ? L(`; Größe: ${wort} (${groessenSchwelle(m)})`, `; size: ${wort} (${groessenSchwelle(m)})`) : ''}.`,
    `Across ${m.k} studies the pooled effect is ${effSatz}${verh ? L(' (Verhältnis; 1 = kein Effekt)', ' (ratio; 1 = no effect)') : ''}. ${abw} (${pruefName(m)} test, p ${pWert(m.p)})${wort && sig ? L(`; Größe: ${wort} (${groessenSchwelle(m)})`, `; size: ${wort} (${groessenSchwelle(m)})`) : ''}.`
  ) + piSatz;

  const teile: string[] = [];
  teile.push(T(`Heterogenität: Q(${komma(m.qDf, 0)}) = ${komma(m.q)}, p ${pWert(m.qP)}; I² = ${prozent(m.i2)} (${i2Wort(m.i2)}${Number.isFinite(m.i2Lo) ? L(`, Intervall ${komma(m.i2Lo, 0)} bis ${prozent(m.i2Hi)}`, `, interval ${komma(m.i2Lo, 0)} to ${prozent(m.i2Hi)}`) : ''}); τ² = ${t2(m.tau2)} (τ = ${komma(m.tau, 2)}${Number.isFinite(m.tau2Lo) ? L(`, 95 %-KI für τ² ${iv(t2(m.tau2Lo), t2(m.tau2Hi))}`, `, 95% CI for τ² ${iv(t2(m.tau2Lo), t2(m.tau2Hi))}`) : ''}).`,
    `Heterogeneity: Q(${komma(m.qDf, 0)}) = ${komma(m.q)}, p ${pWert(m.qP)}; I² = ${prozent(m.i2)} (${i2Wort(m.i2)}${Number.isFinite(m.i2Lo) ? L(`, Intervall ${komma(m.i2Lo, 0)} bis ${prozent(m.i2Hi)}`, `, interval ${komma(m.i2Lo, 0)} to ${prozent(m.i2Hi)}`) : ''}); τ² = ${t2(m.tau2)} (τ = ${komma(m.tau, 2)}${Number.isFinite(m.tau2Lo) ? L(`, 95 %-KI für τ² ${iv(t2(m.tau2Lo), t2(m.tau2Hi))}`, `, 95% CI for τ² ${iv(t2(m.tau2Lo), t2(m.tau2Hi))}`) : ''}).`));
  if (Number.isFinite(m.eggerP)) {
    teile.push(T(`Asymmetrie des Trichterdiagramms (Egger-Test): ${m.eggerP < 0.05 ? L('Hinweis auf Asymmetrie', 'evidence of asymmetry') : L('keine erkennbare Asymmetrie', 'no clear asymmetry')}, t(${komma(m.eggerDf, 0)}) = ${komma(m.eggerStat)}, p ${pWert(m.eggerP)}.`,
      `Funnel plot asymmetry (Egger test): ${m.eggerP < 0.05 ? L('Hinweis auf Asymmetrie', 'evidence of asymmetry') : L('keine erkennbare Asymmetrie', 'no clear asymmetry')}, t(${komma(m.eggerDf, 0)}) = ${komma(m.eggerStat)}, p ${pWert(m.eggerP)}.`));
  }

  const reg = m.reg ? saetzeReg(m) : null;
  if (reg) teile.push(reg.text);
  const v: string[] = [];
  if (m.k < META_K_WENIG) v.push(T(`Es sind nur ${m.k} Studien: Die Streuung zwischen den Studien (τ²) und damit das Prädiktionsintervall sind sehr unsicher.`, `There are only ${m.k} studies: the between-study variance (τ²) and thus the prediction interval are very uncertain.`));
  if (m.k < META_K_EGGER) v.push(T(`Bei weniger als ${META_K_EGGER} Studien hat der Egger-Test wenig Aussagekraft (Sterne et al., 2011); ein unauffälliges Ergebnis schließt eine Verzerrung durch unveröffentlichte Studien nicht aus.`, `With fewer than ${META_K_EGGER} studies the Egger test has little power (Sterne et al., 2011); a non-significant result does not rule out bias from unpublished studies.`));
  if (m.i2 >= 75) v.push(d('Die Studien unterscheiden sich stark. Der gepoolte Wert ist dann ein Durchschnitt über sehr verschiedene Effekte; frage, ob die Studien wirklich dasselbe messen.', 'Die Studien unterscheiden sich stark. Der gepoolte Wert ist dann ein Durchschnitt über sehr verschiedene Effekte; fragen Sie, ob die Studien wirklich dasselbe messen.', 'The studies differ greatly. The pooled value is then an average of very different effects; ask whether the studies really measure the same thing.'));
  v.push(m.ein.kh ? T('Gerechnet mit der Anpassung nach Knapp und Hartung (t-Test, k − 1 Freiheitsgrade), wie bei wenigen Studien empfohlen.', 'Calculated with the Knapp-Hartung adjustment (t test, k − 1 degrees of freedom), as recommended with few studies.')
    : T('Ohne die Anpassung nach Knapp und Hartung (z-Test): Bei wenigen Studien fallen Konfidenz- und Prädiktionsintervall damit oft zu schmal aus (IntHout et al., 2014).', 'Without the Knapp-Hartung adjustment (z test): with few studies, the confidence and prediction intervals then often turn out too narrow (IntHout et al., 2014).'));
  if (reg) v.push(...reg.warnung);
  v.push(T('Eine Meta-Analyse fasst die Studien zusammen, wie sie sind; sie verbessert schwache Studien nicht und belegt keine Ursachen.', 'A meta-analysis summarizes the studies as they are; it does not improve weak studies and does not establish causes.'));

  const marken: Saetze['marken'] = [
    { text: `${Mk} = ${zeig(m, m.est)}`, erklaer: 'meta-effekt' },
    { text: `I² = ${prozent(m.i2)}`, erklaer: 'i-quadrat', hinweis: m.i2 >= 75 },
    { text: `τ² = ${t2(m.tau2)}`, erklaer: 'tau-quadrat' },
    { text: `Q: p ${pWert(m.qP)}`, erklaer: 'i-quadrat' },
    { text: `${T('Prädiktionsintervall', 'Prediction interval')} ${iv(zeig(m, m.pLo), zeig(m, m.pHi))}`, erklaer: 'praediktionsintervall' }
  ];
  if (Number.isFinite(m.eggerP)) marken.push({ text: `Egger: p ${pWert(m.eggerP)}`, erklaer: 'funnel-plot', hinweis: m.k < META_K_EGGER });
  if (m.reg) marken.push({ text: `${T('Meta-Regression', 'Meta-regression')}: p ${pWert(m.reg.qmP)}${Number.isFinite(m.reg.r2) ? `, R² = ${prozent(Math.max(0, m.reg.r2))}` : ''}`, erklaer: 'meta-effekt', hinweis: m.reg.k < 10 * (m.reg.namen.length - 1) });
  marken.push({ text: T(`${m.k} Studien`, `${m.k} studies`), erklaer: 'forest-plot', hinweis: m.k < META_K_WENIG });
  return { haupt, zusatz: teile.join('\n'), vorsicht: v.join(' '), apa: metaApa(m), marken };
}

/* ------------------------------------------------------------ Tabellen */

export function tabellenMeta(m: Meta): TableItem[] {
  const t: TableItem[] = [], f = rueck(m), M = massKurz(m.ein, T), r = (v: number) => fx(f(v), m.ein.art === 'r' ? 3 : 2);
  const fuss = T(`R (metafor), Random-Effects-Modell, REML${m.ein.kh ? L(', Anpassung nach Knapp und Hartung', ', Knapp-Hartung adjustment') : ''}. ${m.k} Studien.`, `R (metafor), random-effects model, REML${m.ein.kh ? L(', Anpassung nach Knapp und Hartung', ', Knapp-Hartung adjustment') : ''}. ${m.k} studies.`);
  const skalaFuss = m.ein.art === 'r' ? T('Gerechnet mit Fisher z, Anzeige als r zurückgerechnet (tanh).', 'Calculated with Fisher z, shown back-transformed as r (tanh).') : m.ein.verhaeltnis ? T('Gerechnet auf der Log-Skala, Anzeige zurückgerechnet (exp).', 'Calculated on the log scale, shown back-transformed (exp).') : m.ein.art === 'smd' ? T('Hedges g (Gruppe 1 minus Gruppe 2).', 'Hedges g (group 1 minus group 2).') : '';
  t.push(tabelle('Pooled Effect', T('Gepoolter Effekt', 'Pooled effect'), [T('Maß', 'Measure'), T('Schätzung', 'Estimate'), T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper'), m.statDf !== null ? 't' : 'z', ...(m.statDf !== null ? ['df'] : []), 'p'],
    [[M, r(m.est), r(m.lo), r(m.hi), fx(m.stat), ...(m.statDf !== null ? [fd(m.statDf)] : []), fp(m.p)]], [fuss, skalaFuss].filter(Boolean)));
  t.push(tabelle('Prediction Interval', T('Prädiktionsintervall', 'Prediction interval'), [T('Maß', 'Measure'), T('untere Grenze', 'lower limit'), T('obere Grenze', 'upper limit')], [[M, r(m.pLo), r(m.pHi)]],
    [T(`95 %-Bereich, in dem der wahre Effekt einer neuen, vergleichbaren Studie erwartet wird. Gerechnet wie metafor::predict (${m.statDf !== null ? L('t-Verteilung mit k − 1 Freiheitsgraden, Knapp-Hartung', 't distribution with k − 1 degrees of freedom, Knapp-Hartung') : L('Normalverteilung', 'normal distribution')}); bei wenigen Studien ist das Intervall dadurch eher zu schmal. Die strengere Variante nach IntHout et al. (2016) mit t(k − 2) steht in „Für Fachleute“.`,
      `95% range in which the true effect of a new, comparable study is expected. Calculated as metafor::predict does (${m.statDf !== null ? L('t-Verteilung mit k − 1 Freiheitsgraden, Knapp-Hartung', 't distribution with k − 1 degrees of freedom, Knapp-Hartung') : L('Normalverteilung', 'normal distribution')}); with few studies the interval is therefore rather too narrow. The stricter variant of IntHout et al. (2016) with t(k − 2) is under "For specialists".`)]));
  t.push(tabelle('Heterogeneity', T('Heterogenität', 'Heterogeneity'), [T('Kennwert', 'Statistic'), T('Schätzung', 'Estimate'), T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper'), 'p'],
    [['τ²', fx(m.tau2, 3), ...kiZ3(m.tau2Lo, m.tau2Hi), '-'], ['τ', fx(m.tau, 3), ...kiZ3(m.tauLo, m.tauHi), '-'], ['I² (%)', fx(m.i2, 1), ...(Number.isFinite(m.i2Lo) ? kiZ1(m.i2Lo, m.i2Hi) : ['-', '-']), '-'], ['H²', fx(m.h2, 2), '-', '-', '-'],
      [`Q (df = ${komma(m.qDf, 0)})`, fx(m.q, 2), '-', '-', fp(m.qP)]], [T('τ²: Varianz der wahren Effekte zwischen den Studien (REML); Intervalle über die Profil-Likelihood (metafor::confint).', 'τ²: variance of the true effects between studies (REML); intervals via profile likelihood (metafor::confint).')]));
  t.push(tabelle('Studies', T('Studien', 'Studies'), [T('Studie', 'Study'), m.ein.art === 'r' ? 'r' : M, T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper'), T('Gewicht (%)', 'Weight (%)')],
    m.studien.map(st => [st.name, r(st.yi), r(st.yi - 1.96 * st.sei), r(st.yi + 1.96 * st.sei), fx(st.gewicht, 1)]), [T('Intervall je Studie: Effekt ± 1,96 · SE. Gewicht im Random-Effects-Modell: 1 / (SE² + τ²).', 'Interval per study: effect ± 1.96 · SE. Weight in the random-effects model: 1 / (SE² + τ²).')]));
  if (m.reg) {
    const g = m.reg, stat = g.df !== null ? 't' : 'z';
    t.push(tabelle('Meta-Regression', T('Meta-Regression: Koeffizienten', 'Meta-regression: coefficients'), [T('Moderator', 'Moderator'), 'B', 'SE', stat, ...(g.df !== null ? ['df'] : []), 'p', T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')],
      g.namen.map((n, i) => [regName(n), fx(g.b[i]!, 3), fx(g.se[i]!, 3), fx(g.stat[i]!), ...(g.df !== null ? [fd(g.df)] : []), fp(g.p[i]!), fx(g.lo[i]!, 3), fx(g.hi[i]!, 3)]),
      [T(`R (metafor), Meta-Regression, REML${m.ein.kh ? L(', Anpassung nach Knapp und Hartung', ', Knapp-Hartung adjustment') : ''}. ${g.k} Studien.`, `R (metafor), meta-regression, REML${m.ein.kh ? L(', Anpassung nach Knapp und Hartung', ', Knapp-Hartung adjustment') : ''}. ${g.k} studies.`),
        m.ein.art === 'r' ? T('Koeffizienten auf der Fisher-z-Skala.', 'Coefficients on the Fisher z scale.') : m.ein.verhaeltnis ? T('Koeffizienten auf der Log-Skala; exp(B) ist der Faktor je Einheit des Moderators.', 'Coefficients on the log scale; exp(B) is the factor per unit of the moderator.') : ''].filter(Boolean)));
    t.push(tabelle('Meta-Regression Tests', T('Meta-Regression: Tests und Anpassung', 'Meta-regression: tests and fit'), [T('Kennwert', 'Statistic'), T('Wert', 'Value'), 'df', 'p'],
      [[g.df !== null ? 'F (Moderatoren)' : 'Q_M (Moderatoren)', fx(g.qm, 2), g.df !== null ? `${komma(g.qmDf, 0)}, ${dfText(g.df)}` : komma(g.qmDf, 0), fp(g.qmP)],
        [T('Q_E (Restheterogenität)', 'Q_E (residual heterogeneity)'), fx(g.qe, 2), komma(g.qeDf, 0), fp(g.qeP)],
        ['R² (%)', Number.isFinite(g.r2) ? fx(Math.max(0, g.r2), 1) : '-', '-', '-'], [T('τ² (Rest)', 'τ² (residual)'), fx(g.tau2, 3), '-', '-'], [T('I² (Rest, %)', 'I² (residual, %)'), fx(g.i2, 1), '-', '-']],
      [T('R² ist der Anteil der Heterogenität zwischen den Studien, den die Moderatoren erklären (metafor, bei wenigen Studien ungenau; negative Werte werden 0).', 'R² is the share of the between-study heterogeneity that the moderators explain (metafor; imprecise with few studies; negative values become 0).')]));
  }
  if (Number.isFinite(m.eggerP)) t.push(tabelle('Egger Test', T('Asymmetrie des Trichterdiagramms', 'Funnel plot asymmetry'), [T('Test', 'Test'), 't', 'df', 'p'], [['Egger', fx(m.eggerStat), fd(m.eggerDf), fp(m.eggerP)]],
    [T('Klassischer Egger-Test (gewichtete Regression des Effekts auf den Standardfehler, metafor::regtest, model = "lm").', 'Classic Egger test (weighted regression of the effect on the standard error, metafor::regtest, model = "lm").'), ...(m.k < META_K_EGGER ? [T(`Bei weniger als ${META_K_EGGER} Studien wenig aussagekräftig (Sterne et al., 2011).`, `Of little value with fewer than ${META_K_EGGER} studies (Sterne et al., 2011).`)] : [])]));
  void fo;
  return t;
}
const kiZ3 = (a: number, b: number): Z[] => (Number.isFinite(a) ? [fx(a, 3), fx(b, 3)] : ['-', '-']);
const kiZ1 = (a: number, b: number): Z[] => [fx(a, 1), fx(b, 1)];
