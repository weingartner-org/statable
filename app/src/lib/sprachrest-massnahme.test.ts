import { afterEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { ladeSprache } from '../i18n/laufzeit';
import ERW from './testdaten/massnahme-erwartet.json';
import {
  massnahmeCodeSatz, massnahmeHauptsatz, massnahmeLjungSatz, massnahmeLeitplanken, massnahmeTabellen, massnahmeRCode, massnahmeHilfeSatz, vorschlagSatz, massnahmeLesen,
  type MassnahmeCode, type MassnahmeE, type VorschlagAntwort
} from './massnahme';
import { grangerCodeSatz, grangerHilfeSatz, grangerLesen, grangerSaetze, grangerWarnungen, grangerTabellen, grangerRCode, type GrangerE, type GrangerFehlerCode } from './granger';

/* Leitfaden Falle 12 und 20 für „Hat die Maßnahme gewirkt?“ und den Granger-Test (Fachblatt MASSNAHME): Ein fertiger Sprachtext, der in ein anderes `L(…)` eingesetzt wird, bleibt in jeder Sprache deutsch oder englisch.
 * Die Prüfsprache „xx“ setzt jeden übersetzten Text in [Klammern] mit Akzentbuchstaben (i18n/katalog.mjs, `pseudo`); was außerhalb übrig bleibt, ist fest eingesetzter deutscher oder englischer Text.
 * Voraussetzung: `node i18n/katalog.mjs` wurde nach dem letzten Ändern der Texte gelaufen (schreibt sprachen/xx.json). Muster: lib/sprachrest-zeitreihen-abrunden.test.ts. Die Übersetzungen in die 13 Sprachen kommen aus einem anderen Auftrag. */
const vorher = s.einst.sprache;
afterEach(() => { s.einst.sprache = vorher; });
const rest = (t: string): string[] => (t.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) ?? []).filter(w => /[aeiouAEOUcny]/.test(w) && !['ARIMA', 'KPSS', 'ACF', 'PACF', 'AICc', 'RMSE', 'MAE', 'AIC', 'ar', 'ma', 'sar', 'sma', 'NA', 'daten', 'ts', 'cbind', 'arima', 'xreg', 'predict', 'nrow', 'exp', 'log', 'rep', 'seq', 'len', 'as', 'numeric', 'fit', 'call', 'lm', 'anova', 'sapply', 'function', 'length', 'idx'].includes(w));
const pruefe = (name: string, t: string) => { expect(t, name).toMatch(/^\[/); expect(rest(t), `${name}: Rest außerhalb der Klammern in „${t}“`).toEqual([]); };

type Wirkung = { name: string; m: number; log: boolean; order: number[]; seasonal: number[]; t0: number; stufe: boolean; impuls: boolean; namen: string[]; b: number[]; se: number[]; z: number[]; p: number[]; kiu: number[]; kio: number[];
  sigma2: number; aicc: number; mittel: number[]; u95: number[]; o95: number[]; ljung: { q: number; h: number; fitdf: number; p: number }; nobs: number };
const WI = (ERW as unknown as { wirkung: Wirkung[] }).wirkung, GR = (ERW as unknown as { granger: { F: number; p: number }[] }).granger;
const me = (n: string, extra: Record<string, unknown> = {}): MassnahmeE => {
  const w = WI.find(x => x.name === n)!;
  const l = massnahmeLesen({ art: [w.stufe && w.impuls ? 'beides' : 'stufe'], t0: [w.t0], p: [w.order[0]], d: [w.order[1]], q: [w.order[2]], P: [w.seasonal[0]], D: [w.seasonal[1]], Q: [w.seasonal[2]], periode: [w.m], konst: [false], log: [w.log],
    namen: w.namen, b: w.b, se: w.se, z: w.z, pw: w.p, kiu: w.kiu, kio: w.kio, sigma2: [w.sigma2], loglik: [-1], aic: [2300], aicc: [w.aicc], nobs: [w.nobs], tauglich: [true], mittel: w.mittel, u95: w.u95, o95: w.o95, ljung: w.ljung, ...extra });
  if (!l.ok) throw new Error('Lesen');
  return { wahl: { t0: w.t0, art: w.stufe && w.impuls ? 'beides' : 'stufe', log: w.log, p: w.order[0]!, d: w.order[1]!, q: w.order[2]!, P: w.seasonal[0]!, D: w.seasonal[1]!, Q: w.seasonal[2]!, konst: false, h: 12 }, antwort: l.antwort };
};
const vorschlag: VorschlagAntwort = { n: 28, d: 1, D: 0, kpss: 0.5, staerke: null, saison: false, geprueft: 12, liste: [{ p: 0, q: 1, P: 0, Q: 0, konst: true, aicc: 300 }] };
const granger = (extra: Record<string, unknown> = {}): GrangerE => {
  const l = grangerLesen({ k: [3], n: [51], xy: { F: [GR[0]!.F], df1: [3], df2: [44], p: [GR[0]!.p] }, yx: { F: [GR[1]!.F], df1: [3], df2: [44], p: [GR[1]!.p] }, kpss_x: [0.7], kpss_y: [0.7], ...extra });
  if (!l.ok) throw new Error('Lesen'); return { antwort: l.antwort };
};

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen von „Hat die Maßnahme gewirkt?“', () => {
  it('Sperren, Fehlercodes und Hilfesatz', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const codes: MassnahmeCode[] = ['zu-viele-luecken', 'ungleich', 'zu-kurz', 'alle-gleich', 'rand', 'zu-wenig-davor', 'zu-wenig-danach', 'kein-zeitpunkt', 'log-nicht-positiv', 'saison-nicht-moeglich', 'nicht-konvergiert', 'luecken-nur-selbst', 'kein-modell', 'vorschlag-konstant', 'vorschlag-zu-kurz', 'r-fehler'];
    for (const c of codes) pruefe(`code ${c}`, massnahmeCodeSatz(c));
    pruefe('hilfe', massnahmeHilfeSatz());
  });
  it('Hauptsatz (Stufe, Stufe und Impuls, Log-Skala, Anstieg und Rückgang), Ljung-Box-Satz und APA-Zeile', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const n of ['seatbelts_stufe', 'seatbelts_beides', 'seatbelts_log', 'nile_stufe_1899']) {
      const m = me(n);
      pruefe(`haupt ${n}`, massnahmeHauptsatz(m, { name: 'w', zeit: 'z' })); pruefe(`ljung ${n}`, massnahmeLjungSatz(m.antwort.ljung!));
    }
    const hoch = me('seatbelts_stufe'); hoch.antwort.b = hoch.antwort.b.map(v => Math.abs(v)); pruefe('haupt Anstieg', massnahmeHauptsatz(hoch, { name: 'w', zeit: 'z' }));
    const imp = me('seatbelts_beides'); imp.antwort.b = imp.antwort.b.map(v => Math.abs(v)); pruefe('haupt Impuls Anstieg', massnahmeHauptsatz(imp, { name: 'w', zeit: 'z' }));
    const nurImpuls: MassnahmeE = { ...imp, antwort: { ...imp.antwort, art: 'impuls', namen: ['ar1', 'sma1', 'impuls'], b: [0.6, -0.8, 40], se: [1, 1, 1], pw: [0, 0, 0.5], kiu: [0, 0, 1], kio: [0, 0, 2] } };
    pruefe('haupt nur Impuls', massnahmeHauptsatz(nurImpuls, { name: 'w', zeit: 'z' }));
    nurImpuls.antwort.b[2] = -40; pruefe('haupt nur Impuls Rückgang', massnahmeHauptsatz(nurImpuls, { name: 'w', zeit: 'z' }));
  });
  it('Warnungen: jede Leitplanke (auch Lücken und kurze Reihe) und der Vorschlag', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const codes = new Set<string>();
    for (const l of massnahmeLeitplanken(me('seatbelts_log', { tauglich: [false], se: [null, 0.1, 0.1] }), { T: 40, luecken: 2 })) { codes.add(l.code); pruefe(`warnung ${l.code}`, l.satz); }
    for (const l of massnahmeLeitplanken(me('seatbelts_log'), { T: 40, luecken: 1 })) pruefe(`warnung ${l.code} (eine Lücke)`, l.satz);
    expect([...codes].sort()).toEqual(['kurz', 'log', 'ljung', 'luecken', 'nicht-tauglich', 'schrittweise', 'se-fehlt', 'ursache', 'vergleich', 'zeitpunkt'].sort());
    pruefe('vorschlag', vorschlagSatz(vorschlag, 1)); pruefe('vorschlag ohne Konstante', vorschlagSatz({ ...vorschlag, liste: [{ ...vorschlag.liste[0]!, konst: false }] }, 1));
  });
  it('Tabellen (Titel, Fußnoten, Köpfe) und R-Text', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const n of ['seatbelts_stufe', 'seatbelts_log']) for (const t of massnahmeTabellen(me(n), { name: 'w', zeit: 'z', zeiten: Array.from({ length: 12 }, (_, i) => `${i}`), stellen: 0 })) {
      pruefe(`${t.label}: Titel`, t.title!.t);
      t.footnotes.forEach((f, i) => pruefe(`${t.label}: Fußnote ${i}`, f.t));
      t.cells.filter(c => c.r === 0 && c.t.length > 3 && !/^(AICc|AIC)$/.test(c.t)).forEach(c => pruefe(`${t.label}: Kopf ${c.t}`, c.t));
    }
    const r = massnahmeRCode(me('seatbelts_beides'), 'passagiere'); expect(r).toContain('# ['); expect(r).toContain('fit$call$xreg <- X');
  });
});

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen des Granger-Tests', () => {
  it('Sperren, Fehlercodes, Hilfesatz, Sätze in beide Richtungen und Warnungen', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const codes: GrangerFehlerCode[] = ['laenge', 'luecken', 'zu-kurz', 'konstant', 'k-ungueltig', 'nicht-eindeutig', 'r-fehler'];
    for (const c of codes) pruefe(`code ${c}`, grangerCodeSatz(c));
    pruefe('hilfe', grangerHilfeSatz());
    for (const t of grangerSaetze(granger(), { x: 'w', y: 'v' })) pruefe('satz', t);
    const w1 = grangerWarnungen(granger(), { x: 'w', y: 'v' }), w2 = grangerWarnungen(granger({ kpss_x: [0.1] }), { x: 'w', y: 'v' });
    expect(w1.map(x => x.code)).toEqual(['ursache', 'stationaer', 'k']); expect(w2.map(x => x.code)).toEqual(['ursache', 'stationaer', 'k']);
    for (const w of [...w1, ...w2]) pruefe(`warnung ${w.code}`, w.satz);
    pruefe('einzelne Reihe', grangerWarnungen(granger({ kpss_y: [0.1] }), { x: 'w', y: 'v' }).find(x => x.code === 'stationaer')!.satz);
  });
  it('Tabellen (Titel, Fußnoten, Köpfe) und R-Text', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const t of grangerTabellen(granger(), { x: 'w', y: 'v' })) {
      pruefe(`${t.label}: Titel`, t.title!.t);
      t.footnotes.forEach((f, i) => pruefe(`${t.label}: Fußnote ${i}`, f.t));
      t.cells.filter(c => c.r === 0 && c.t.length > 3 && !/^(KPSS|df1|df2)$/.test(c.t)).forEach(c => pruefe(`${t.label}: Kopf ${c.t}`, c.t));
    }
    const r = grangerRCode('a', 'b', 3); expect(r).toContain('# ['); expect(r).toContain('anova(m0, m1)');
  });
});
