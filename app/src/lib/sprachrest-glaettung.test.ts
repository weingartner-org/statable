import { afterEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { ladeSprache } from '../i18n/laufzeit';
import ERW from './testdaten/glaettung-erwartet.json';
import PROG from './testdaten/prognose-erwartet.json';
import {
  prognoseLesen, prognoseLeitplanken, prognoseHauptsatz, prognoseRCode, prognoseModellText, prognoseApa, etsSatz, glaettungName, parameterNameGlaettung, ETS_MODELLE,
  type PrognoseAntwort, type PrognoseE, type PrognoseWahl
} from './prognose';
import { prognoseTabellen } from './prognoseblatt';
import {
  neuCodeSatz, neuHilfeSatz, neuHauptsatz, neuWarnungen, neuApa, neuTabellen, neuRCode, neuLesen, type NeuCode, type NeuE, type NeuModell
} from './modellneu';
import { mehrereCodeSatz, mehrereGrundSatz, mehrereHauptsatz, mehrereWarnungen, mehrereTabellen, type MehrereE, type MehrereZeile } from './mehrere';

/* Leitfaden Falle 12 und 20 für Glättung (ETS), Modell auf neue Daten und mehrere Reihen (Fachblatt GLAETTUNG-SERIEN): Ein fertiger Sprachtext, der in ein anderes `L(…)` eingesetzt wird, bleibt in jeder Sprache deutsch oder englisch.
 * Die Prüfsprache „xx“ setzt jeden übersetzten Text in [Klammern] mit Akzentbuchstaben (i18n/katalog.mjs, `pseudo`); was außerhalb übrig bleibt, ist fest eingesetzter deutscher oder englischer Text.
 * Voraussetzung: `node i18n/katalog.mjs` wurde nach dem letzten Ändern der Texte gelaufen (schreibt sprachen/xx.json). Muster: lib/sprachrest-massnahme.test.ts. Die Übersetzungen in die 13 Sprachen kommen aus einem anderen Auftrag. */
const vorher = s.einst.sprache;
afterEach(() => { s.einst.sprache = vorher; });
const EIGENNAMEN = ['ARIMA', 'ETS', 'Ad', 'KPSS', 'AICc', 'RMSE', 'MAE', 'AIC', 'Ljung', 'Box', 'ar', 'ma', 'sar', 'sma', 'NA', 'stats', 'predict'];
const rest = (t: string): string[] => (t.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) ?? []).filter(w => /[aeiouAEOUcny]/.test(w) && !EIGENNAMEN.includes(w));
const pruefe = (name: string, t: string) => { expect(t, name).toMatch(/^\[/); expect(rest(t), `${name}: Rest außerhalb der Klammern in „${t}“`).toEqual([]); };
const KOEPFE_ROH = /^(AICc|AIC|RMSE|MAE|ΔAICc|Ljung-Box p|σ²)$/;

const J = ERW as unknown as { neue_daten: { b: number[]; namen: string[]; mittel: number[]; loglik: number; sigma2: number; y_neu: number[] } };
const N = J.neue_daten, P = PROG as unknown as Record<string, { y: number[]; mittel: number[]; u80: number[]; o80: number[]; u95: number[]; o95: number[] }>;
const wahl = (o: Partial<PrognoseWahl> = {}): PrognoseWahl => ({ art: 'ets-auto', h: 12, log: false, p: 0, d: 0, q: 0, P: 0, D: 0, Q: 0, konst: false, glaettung: 'einfach', ...o });

const rohEts = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  art: ['glaettung'], glaettung: ['ets'], ets: ['AAdN'], periode: [1], alpha: [0.5], beta: [0.2], gamma: [null], phi: [0.9], loglik: [-418.26], aicc: [849.11], aic: [846.2],
  mittel: [262.8, 263, 263.1], u80: [261, 260, 259], o80: [264.6, 265.9, 267], u95: [260.2, 258.8, 257.4], o95: [265.5, 267.2, 268.8], angepasst: [1, 2, 3], rmse: [1.3], mae: [1], mape: [0.4],
  ljung: { q: 8, h: 10, p: 0.63, fitdf: 0 }, acf_res: [0.1], pruef: { rmse: 3.1, mae: 2.8, rmse_naiv: 0.6, mae_naiv: 0.5 }, pr: [5], ...extra
});
const ets = (extra: Record<string, unknown> = {}): PrognoseAntwort => { const l = prognoseLesen(rohEts(extra)); if (!l.ok) throw new Error('Lesen'); return l.antwort; };
const ohneBand = { u80: [], o80: [], u95: [], o95: [] };
const pe = (w: PrognoseWahl, extra: Record<string, unknown> = {}): PrognoseE => ({ wahl: w, pr: 5, antwort: ets(extra) });
const zeiten = ['Z1', 'Z2', 'Z3'];

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen der Glättung (ETS)', () => {
  it('die neun erklärenden Sätze, die Namen der Glättungsarten und der Parameter', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const c of ETS_MODELLE) pruefe(`ets ${c}`, etsSatz(c));
    pruefe('gedämpft', glaettungName('gedaempft')); pruefe('φ', parameterNameGlaettung('phi'));
  });
  it('Hauptsatz (Automatik, gewähltes Modell, mit und ohne Band, eine und mehrere Zeitpunkte), Modelltext und APA-Zeile', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    pruefe('haupt Automatik, Band', prognoseHauptsatz(pe(wahl()), { name: 'w', zeiten, stellen: 1, automatik: true }));
    pruefe('haupt Automatik, kein Band', prognoseHauptsatz(pe(wahl(), { ets: ['MAM'], ...ohneBand }), { name: 'w', zeiten, stellen: 1, automatik: true }));
    pruefe('haupt gewählt', prognoseHauptsatz(pe(wahl({ art: 'glaettung', glaettung: 'gedaempft' })), { name: 'w', zeiten, stellen: 1, automatik: false }));
    pruefe('haupt ein Zeitpunkt', prognoseHauptsatz(pe(wahl(), { mittel: [262.8], u80: [261], o80: [264.6], u95: [260.2], o95: [265.5] }), { name: 'w', zeiten: ['Z1'], stellen: 1, automatik: true }));
    expect(prognoseModellText(ets({ ets: ['MAM'] }))).toBe('ETS(M,A,M)');
    expect(prognoseApa(pe(wahl()))).toMatch(/^ETS\(A,Ad,N\), AICc = /);
  });
  it('Warnungen: Automatik-Grenze, kein Intervall, φ und α am Rand (drei Fälle), keine Saison', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const codes = new Set<string>();
    const lauf = (w: PrognoseWahl, a: PrognoseAntwort, periode: number, T: number) => { for (const l of prognoseLeitplanken({ wahl: w, antwort: a, T, periode, alleWerteUeber0: true })) { codes.add(l.code); pruefe(`warnung ${l.code}`, l.satz); } };
    lauf(wahl(), ets({ phi: [0.98], alpha: [0.9999], ets: ['MAM'], ...ohneBand }), 30, 300);
    lauf(wahl(), ets({ phi: [0.98], alpha: [0.5] }), 12, 30); lauf(wahl(), ets({ phi: [0.9], alpha: [0.9999] }), 12, 144);
    expect([...codes].sort()).toEqual(['ets-grenze', 'ets-kein-intervall', 'ets-rand', 'immer', 'keine-saison', 'ljung', 'pruef-nicht-besser'].filter(c => codes.has(c)).sort());
    for (const c of ['ets-grenze', 'ets-kein-intervall', 'ets-rand', 'immer', 'keine-saison']) expect(codes.has(c), c).toBe(true);
  });
  it('Tabellen (Titel, Fußnoten, Köpfe) mit und ohne Band, die Automatik-Tabelle und der R-Text', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const mit = pe(wahl({ art: 'glaettung', glaettung: 'gedaempft' })), ohne = pe(wahl(), { ets: ['MAM'], ...ohneBand, wahl_ets: { modell: ['MAM', 'MAdM'], aicc: [1401.4, 1412.5], geprueft: [9] } });
    for (const p of [mit, ohne]) for (const t of prognoseTabellen(p, { name: 'w', zeiten, stellen: 1 })) {
      pruefe(`${t.label}: Titel`, t.title!.t);
      t.footnotes.forEach((f, i) => pruefe(`${t.label}: Fußnote ${i}`, f.t));
      t.cells.filter(c => c.r === 0 && c.t.length > 3 && !KOEPFE_ROH.test(c.t)).forEach(c => pruefe(`${t.label}: Kopf ${c.t}`, c.t));
    }
    const r = prognoseRCode(ohne, 'x', 144); expect(r).toContain('# ['); expect(r).toContain("ets(y, model = 'MAM'");
  });
});

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen von „Modell auf andere Daten“', () => {
  const mo: NeuModell = { p: 0, d: 1, q: 1, P: 0, D: 1, Q: 1, konst: false, drift: false, log: true, periode: 12, namen: N.namen, b: N.b };
  const neu = (extra: Record<string, unknown> = {}, luecken = 0): NeuE => {
    const l = neuLesen({ art: ['arima'], neu: [true], p: [0], d: [1], q: [1], P: [0], D: [1], Q: [1], periode: [12], konst: [false], drift: [false], log: [true], namen: N.namen, b: N.b, se: [], sigma2: [N.sigma2], loglik: [N.loglik], nobs: [131],
      mittel: N.mittel, u80: N.mittel, o80: N.mittel, u95: N.mittel, o95: N.mittel, rmse: [12.3], mae: [9.1], ljung: { q: 26.45, h: 24, p: 0.233, fitdf: 0 }, acf_res: [0.1], pruef: [], pr: [0], ...extra });
    if (!l.ok) throw new Error('Lesen');
    return { von: 'bv', modell: mo, reihe: { spalte: 'neu', raster: 'monatlich', periode: 12, erster: '1949-01-01', t: [1, 2], y: [1, 2], luecken }, h: 12, antwort: l.antwort };
  };
  const ein = { name: 'w', zeiten: Array.from({ length: 12 }, (_, i) => `Z${i}`), stellen: 0 };
  it('Sperren, Fehlercodes und Hilfesatz', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const codes: NeuCode[] = ['zu-viele-luecken', 'ungleich', 'alle-gleich', 'zu-kurz', 'periode', 'log-nicht-positiv', 'modell-passt-nicht', 'kein-modell', 'r-fehler'];
    for (const c of codes) pruefe(`code ${c}`, neuCodeSatz(c, { modell: 12, neu: 4 }));
    pruefe('hilfe', neuHilfeSatz());
  });
  it('Hauptsatz (eine und mehrere Zeitpunkte), jede Warnung und die APA-Zeile', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    pruefe('haupt', neuHauptsatz(neu(), ein));
    pruefe('haupt, ein Zeitpunkt', neuHauptsatz(neu({ mittel: [450], u80: [440], o80: [460], u95: [430], o95: [470] }), { ...ein, zeiten: ['Z1'] }));
    const codes = new Set<string>();
    for (const n of [neu({ ljung: { q: 60, h: 24, p: 0.001, fitdf: 0 } }, 1), neu({}, 2)]) for (const w of neuWarnungen(n, 144)) { codes.add(w.code); pruefe(`warnung ${w.code}`, w.satz); }
    expect([...codes].sort()).toEqual(['ljung', 'log', 'luecken', 'nicht-neu', 'veraenderung']);
    expect(neuApa(neu())).toContain('[');
  });
  it('Tabellen (Titel, Fußnoten, Köpfe) und R-Text', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const t of neuTabellen(neu(), ein)) {
      pruefe(`${t.label}: Titel`, t.title!.t);
      t.footnotes.forEach((f, i) => pruefe(`${t.label}: Fußnote ${i}`, f.t));
      t.cells.filter(c => c.r === 0 && c.t.length > 3 && !KOEPFE_ROH.test(c.t)).forEach(c => pruefe(`${t.label}: Kopf ${c.t}`, c.t));
    }
    const r = neuRCode(neu()); expect(r).toContain('# ['); expect(r).toContain('fixed = unname(b), transform.pars = FALSE');
  });
});

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen von „Mehrere Reihen auf einmal“', () => {
  const ok = (spalte: string, extra: Record<string, unknown> = {}): MehrereZeile => {
    const l = prognoseLesen({ art: ['arima'], p: [0], d: [1], q: [1], P: [0], D: [1], Q: [1], periode: [12], konst: [false], drift: [false], log: [false], namen: ['ma1', 'sma1'], b: [-0.4, -0.5], se: [0.1, 0.1], sigma2: [1], aic: [1], aicc: [857.3], bic: [1], nobs: [60], tauglich: [true],
      mittel: P.deaths!.mittel, u80: P.deaths!.u80, o80: P.deaths!.o80, u95: P.deaths!.u95, o95: P.deaths!.o95, rmse: [250], mae: [200], ljung: { q: 20, h: 24, p: 0.4, fitdf: 2 }, acf_res: [0.1], pruef: { rmse: 200, mae: 150, rmse_naiv: 400, mae_naiv: 300 }, pr: [12], ...extra });
    if (!l.ok) throw new Error('Lesen');
    return { spalte, ok: true, wahl: wahl({ art: 'auto' }), pr: 12, antwort: l.antwort, reihe: { raster: 'monatlich', periode: 12, erster: '1974-01-01', t: [1, 2, 3], y: [1, 2, 3] } };
  };
  const e = (zeilen: MehrereZeile[]): MehrereE => ({ wahl: { spalten: zeilen.map(z => z.spalte), h: 12, log: false }, datum: '', raster: null, periode: null, zeilen });
  const zeitenF = (_r: unknown, h: number) => Array.from({ length: h }, (_, i) => `Z${i}`);
  it('Sperren und die Gründe in den Zeilen', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    pruefe('zu wenige', mehrereCodeSatz('zu-wenige')); pruefe('zu viele', mehrereCodeSatz('zu-viele'));
    for (const c of ['zu-viele-luecken', 'ungleich', 'zu-kurz', 'alle-gleich', 'log-nicht-positiv', 'luecken-nur-selbst', 'r-fehler'] as const) pruefe(`grund ${c}`, mehrereGrundSatz({ art: 'prognose', code: c }));
    pruefe('grund Reihe', mehrereGrundSatz({ art: 'reihe', code: 'zu-kurz' }));
  });
  it('Hauptsatz (alle und teilweise), Warnungen (eine, mehrere, keine auffällige Reihe) und die Hinweise in der Tabelle', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const schlecht = { ljung: { q: 60, h: 24, p: 0.001, fitdf: 2 }, pruef: { rmse: 500, mae: 300, rmse_naiv: 400, mae_naiv: 300 } };
    const fehl: MehrereZeile = { spalte: 'x', ok: false, grund: { art: 'prognose', code: 'zu-kurz' } };
    pruefe('haupt alle', mehrereHauptsatz(e([ok('a'), ok('b')]))); pruefe('haupt teils', mehrereHauptsatz(e([ok('a'), fehl])));
    for (const m of [e([ok('a'), ok('b')]), e([ok('a', schlecht), ok('b')]), e([ok('a', schlecht), ok('b', schlecht)])]) for (const w of mehrereWarnungen(m)) pruefe(`warnung ${w.code}`, w.satz);
    for (const t of mehrereTabellen(e([ok('a', schlecht), fehl]), { name: n => n, zeiten: zeitenF })) {
      pruefe(`${t.label}: Titel`, t.title!.t);
      t.footnotes.forEach((f, i) => pruefe(`${t.label}: Fußnote ${i}`, f.t));
      t.cells.filter(c => c.r === 0 && c.t.length > 3 && !KOEPFE_ROH.test(c.t)).forEach(c => pruefe(`${t.label}: Kopf ${c.t}`, c.t));
    }
    const u = mehrereTabellen(e([ok('a', schlecht)]), { name: n => n, zeiten: zeitenF })[0]!;
    u.cells.filter(c => c.r === 1 && c.c === 9).forEach(c => pruefe('Hinweis', c.t.split('; ')[0]!));
  });
});
