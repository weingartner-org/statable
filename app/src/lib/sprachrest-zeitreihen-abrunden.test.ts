import { afterEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { ladeSprache } from '../i18n/laufzeit';
import ABR from './testdaten/zeitreihen-abrunden-erwartet.json';
import { prognoseLesen, prognoseLeitplanken, prognoseCodeSatz, prognoseRCode, type PrognoseE, type PrognoseCode } from './prognose';
import {
  differenzenSaetze, differenzenTabellen, differenzenFehlerSatz, differenzenHilfeSatz, differenzenRCode, periodogrammCodeSatz, periodogrammHauptsatz, periodogrammWarnungen, periodogrammTabellen, periodogrammRCode,
  type DifferenzenE, type PeriodogrammE
} from './zeitreihenabrunden';

/* Leitfaden Falle 12 und 20 für Zeitreihen abrunden (Fachblatt ZEITREIHEN-ABRUNDEN): Ein fertiger Sprachtext, der in ein anderes `L(…)` eingesetzt wird, bleibt in jeder Sprache deutsch oder englisch.
 * Die Prüfsprache „xx“ setzt jeden übersetzten Text in [Klammern] mit Akzentbuchstaben (i18n/katalog.mjs, `pseudo`); was außerhalb übrig bleibt, ist fest eingesetzter deutscher oder englischer Text.
 * Voraussetzung: `node i18n/katalog.mjs` wurde nach dem letzten Ändern der Texte gelaufen (schreibt sprachen/xx.json). Muster: lib/sprachrest-prognose.test.ts. Die Übersetzungen in die 13 Sprachen kommen aus einem anderen Auftrag. */
const vorher = s.einst.sprache;
afterEach(() => { s.einst.sprache = vorher; });
const rest = (t: string): string[] => (t.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) ?? []).filter(w => /[aeiouAEOUcny]/.test(w) && !['ARIMA', 'KPSS', 'ACF', 'PACF', 'AICc', 'RMSE', 'MAE', 'ar', 'ma', 'sar', 'sma', 'NA', 'PACF', 'spec', 'pgram', 'diff', 'acf', 'pacf', 'lag', 'max', 'na', 'pass', 'ts', 'daten'].includes(w));
const pruefe = (name: string, t: string) => { expect(t, name).toMatch(/^\[/); expect(rest(t), `${name}: Rest außerhalb der Klammern in „${t}“`).toEqual([]); };

type P = { name: string; m: number; log: boolean; d: number; D: number; n: number; lags: number; grenze: number; acf: number[]; pacf: number[] };
const PR = (ABR as unknown as { pruefung: P[] }).pruefung;
const diff = (name: string, o: Partial<DifferenzenE['antwort']> = {}, luecken = false): DifferenzenE => {
  const x = PR.find(q => q.name === name)!;
  return { d: x.d, D: x.D, log: x.log, periode: x.m, luecken, antwort: { kpss: [4.5, 0.5, 0.01], sd: [1, 2, 3], r1: [0.9, -0.6, -0.7], nZeile: [x.n, x.n, x.n], n: x.n, lags: x.lags, grenze: x.grenze, acf: x.acf, pacf: x.pacf, staerke: 0.9, ...o } };
};
const pgE = (): PeriodogrammE => ({ antwort: { n: 120, freq: [0.1, 0.2, 0.3], spec: [1, 3, 2], spitzen: [{ periode: 5, anteil: 0.5, index: 2 }] } });
const antwort = () => { const l = prognoseLesen({ art: ['arima'], p: [0], d: [1], q: [1], P: [0], D: [1], Q: [1], periode: [12], mittel: [1, 2], u80: [0, 1], o80: [2, 3], u95: [0, 1], o95: [2, 3], pruef: [], pr: [0] }); if (!l.ok) throw new Error('Lesen'); return l.antwort; };

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen von „Zeitreihen abrunden“', () => {
  it('Lücken in der Prognose: Sperren, Leitplanken luecken und pruef-luecke, Hinweis im R-Text', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const codes: PrognoseCode[] = ['zu-viele-luecken', 'luecken-nur-selbst'];
    for (const c of codes) pruefe(`code ${c}`, prognoseCodeSatz(c));
    const wahl = { art: 'arima' as const, h: 12, log: false, p: 0, d: 1, q: 1, P: 0, D: 0, Q: 0, konst: false, glaettung: 'einfach' as const };
    const ein = (luecken: number) => ({ wahl, antwort: antwort(), T: 144, periode: 12, alleWerteUeber0: true, luecken, pruefLuecke: true });
    for (const k of [1, 5]) { const l = prognoseLeitplanken(ein(k)); expect(l.map(x => x.code)).toEqual(expect.arrayContaining(['luecken', 'pruef-luecke'])); for (const x of l.filter(y => y.code === 'luecken' || y.code === 'pruef-luecke')) pruefe(`leitplanke ${x.code} ${k}`, x.satz); }
    const p: PrognoseE = { wahl, pr: 12, antwort: antwort() };
    const c = prognoseRCode(p, 'passagiere', 144, 5);
    expect(c).toContain('# [');
  });
  it('Differenzen prüfen: Sätze (jeder Code), Hilfe, Fehler, Tabellen und R-Text', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const alle = [diff('air_log_00', { kpss: [4.5, 0.01, 0.01], sd: [1, 2, 3], r1: [-0.6, 0, 0] }), diff('nile_20', { kpss: [1, 0.01, 0.01], sd: [1, 2, 3], r1: [-0.6, 0, -0.7] }), diff('nile_10', {}, true)];
    const codes = new Set<string>();
    for (const e of alle) for (const x of differenzenSaetze(e)) { codes.add(x.code); pruefe(`satz ${x.code}`, x.satz); }
    expect([...codes].sort()).toEqual(['immer', 'kpss', 'luecken', 'r1', 'saison', 'streuung']);
    pruefe('hilfe', differenzenHilfeSatz());
    pruefe('fehler log', differenzenFehlerSatz('log-nicht-positiv')); pruefe('fehler r', differenzenFehlerSatz('r-fehler'));
    for (const e of [alle[0]!, alle[2]!]) for (const t of differenzenTabellen(e, 'w')) {
      pruefe(`${t.label}: Titel`, t.title!.t);
      t.footnotes.forEach((f, i) => pruefe(`${t.label}: Fußnote ${i}`, f.t));
      t.cells.filter(c => c.r === 0 && c.t.length > 3 && !/^(KPSS|ACF|PACF)$/.test(c.t)).forEach(c => pruefe(`${t.label}: Kopf ${c.t}`, c.t));
    }
    const r = differenzenRCode(alle[0]!, 'passagiere'); expect(r).toContain('# ['); expect(r).toContain('pacf(v');
  });
  it('Periodogramm: Sperren, Hauptsatz (mit und ohne Spitze), Warnungen, Tabelle und R-Text', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const c of ['luecken', 'ungleich', 'zu-kurz', 'alle-gleich', 'r-fehler'] as const) pruefe(`code ${c}`, periodogrammCodeSatz(c));
    pruefe('haupt', periodogrammHauptsatz(pgE())); pruefe('haupt ohne Spitze', periodogrammHauptsatz({ antwort: { ...pgE().antwort, spitzen: [] } }));
    for (const w of periodogrammWarnungen()) pruefe(`warnung ${w.code}`, w.satz);
    for (const t of periodogrammTabellen(pgE(), 'w')) {
      pruefe(`${t.label}: Titel`, t.title!.t);
      t.footnotes.forEach((f, i) => pruefe(`${t.label}: Fußnote ${i}`, f.t));
      t.cells.filter(c => c.r === 0).forEach(c => pruefe(`${t.label}: Kopf ${c.t}`, c.t));
    }
    const r = periodogrammRCode('passagiere'); expect(r).toContain('# ['); expect(r).toContain('fast = FALSE');
  });
});
