/**
 * Tabellen zur diagnostischen Güte (Kreuztabelle 2 × 2) und zur Bland-Altman-Analyse (zwei Zahlenspalten).
 * Echte Tabellen (TableItem) wie bei Mediation: Blatt, Bericht, Word, PDF und Excel zeigen sie wie die PSPP-Tabellen; sie werden bei jedem Aufruf neu gebaut und folgen der Sprache.
 */
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { diagnoseVon, komma, pWert, type Kreuz, type IccErgebnis } from './ergebnis';
import { tabelle, fx, fd, type Z } from './mwsaetze';
import { spaltenName } from './medmodsaetze';

const T = L;
const proz = (v: number): Z => (Number.isFinite(v) ? { t: (v * 100).toFixed(1), n: v * 100 } : '-');
const lr = (v: number): Z => (v === Infinity ? '∞' : fx(v));

/** Kennzahlen des Tests gegen den Referenzstandard; leer, solange die Wahl nicht getroffen ist. */
export function tabelleDiagnose(e: Kreuz): TableItem[] {
  const g = diagnoseVon(e); if (!g) return [];
  const d = g.d;
  const anteil = (bez: string, a: { wert: number; lo: number; hi: number; zaehler: number; nenner: number }): Z[] => [bez, `${a.zaehler} / ${a.nenner}`, proz(a.wert), proz(a.lo), proz(a.hi)];
  const quot = (bez: string, q: { wert: number; lo: number; hi: number }): Z[] => [bez, '-', lr(q.wert), lr(q.lo), lr(q.hi)];
  const kopf = [T('Kennzahl', 'Measure'), T('Anzahl', 'Count'), T('Wert (Anteile in %)', 'Value (proportions in %)'), T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')];
  const zeilen: Z[][] = [
    anteil(T('Sensitivität', 'Sensitivity'), d.se), anteil(T('Spezifität', 'Specificity'), d.sp),
    anteil(T('Positiver Vorhersagewert', 'Positive predictive value'), d.ppv), anteil(T('Negativer Vorhersagewert', 'Negative predictive value'), d.npv),
    anteil(T('Genauigkeit', 'Accuracy'), d.genauigkeit), anteil(T('Häufigkeit der positiven Referenz', 'Prevalence of the positive reference'), d.praevalenz),
    quot(T('Likelihood-Quotient LR+', 'Likelihood ratio LR+'), d.lrPlus), quot(T('Likelihood-Quotient LR−', 'Likelihood ratio LR−'), d.lrMinus),
    ...(d.or ? [quot(T('Odds Ratio (diagnostisch)', 'Odds ratio (diagnostic)'), { wert: d.or.or, lo: d.or.lo, hi: d.or.hi })] : [])
  ];
  const vier = tabelle('Diagnostic Table', T('Test gegen Referenzstandard', 'Test against reference standard'),
    ['', T(`Test positiv (${g.testPositiv})`, `Test positive (${g.testPositiv})`), T('Test negativ', 'Test negative'), T('Gesamt', 'Total')],
    [[T(`Referenz positiv (${g.refPositiv})`, `Reference positive (${g.refPositiv})`), fd(d.rp), fd(d.fn), fd(d.rp + d.fn)], [T('Referenz negativ', 'Reference negative'), fd(d.fp), fd(d.rn), fd(d.fp + d.rn)], [T('Gesamt', 'Total'), fd(d.rp + d.fp), fd(d.fn + d.rn), fd(d.n)]],
    [T(`Referenzstandard: ${g.refName}. Test: ${g.testName}.`, `Reference standard: ${g.refName}. Test: ${g.testName}.`)]);
  const guete = tabelle('Diagnostic Accuracy', T('Diagnostische Güte', 'Diagnostic accuracy'), kopf, zeilen,
    [T('Anteile: Wilson-Intervall. Likelihood-Quotienten: Log-Intervall (Simel et al., 1991). Odds Ratio: Wald-Intervall. Vorhersagewerte gelten nur für die Häufigkeit der positiven Referenz in dieser Stichprobe.',
      'Proportions: Wilson interval. Likelihood ratios: log interval (Simel et al., 1991). Odds ratio: Wald interval. Predictive values only hold for the prevalence of the positive reference in this sample.')]);
  return [vier, guete];
}

/** Bland-Altman: Bias und Übereinstimmungsgrenzen mit ihren 95-%-Intervallen. */
export function tabelleBlandAltman(e: IccErgebnis, name: (n: string) => string = spaltenName): TableItem[] {
  const b = e.ba; if (!b) return [];
  const a = name(e.spalten[0]!), c = name(e.spalten[1]!);
  const zeile = (bez: string, w: number, lo: number, hi: number): Z[] => [bez, fx(w), fx(lo), fx(hi)];
  return [tabelle('Bland-Altman', T('Bland-Altman-Analyse', 'Bland-Altman analysis'),
    [T('Maß', 'Measure'), T('Wert', 'Value'), T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')],
    [zeile('Bias', b.bias, b.biasLo, b.biasHi), zeile(T('Obere Übereinstimmungsgrenze', 'Upper limit of agreement'), b.obere.wert, b.obere.lo, b.obere.hi), zeile(T('Untere Übereinstimmungsgrenze', 'Lower limit of agreement'), b.untere.wert, b.untere.lo, b.untere.hi),
      [T('SD der Differenzen', 'SD of the differences'), fx(b.sd), '-', '-']],
    [T(`Differenz: ${a} minus ${c}, ${b.n} Fälle. Grenzen: Bias ± 1,96 SD; ihre Intervalle exakt nach Carkeet (2015). Steigung der Differenz auf den Mittelwert: ${Number.isFinite(b.steigung) ? komma(b.steigung, 3) : '-'}, p ${Number.isFinite(b.steigungP) ? pWert(b.steigungP) : '= -'}.`,
      `Difference: ${a} minus ${c}, ${b.n} cases. Limits: bias ± 1.96 SD; their intervals exact after Carkeet (2015). Slope of the difference on the mean: ${Number.isFinite(b.steigung) ? komma(b.steigung, 3) : '-'}, p ${Number.isFinite(b.steigungP) ? pWert(b.steigungP) : '= -'}.`)])];
}
