import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { beiZeit, einWertArt, holm, kaplanAus, kaplanMit, logrank, medianKi, schaetze, schlageEreignis, zeitMarken, type Beob } from './ueberleben';

/* Vergleichswerte aus R: scripts/kaplanmeier-erwartet.R (survival 3.8-6: survfit(conf.type = "log"), summary(times =, extend = TRUE),
 * summary(fit)$table für den Median, survdiff(rho = 0)). Daten: testdaten/kaplanmeier-aml.csv (survival::aml) und kaplanmeier-lung.csv (erste 120 Zeilen von survival::lung,
 * ph.ecog 0-2; status 2 = gestorben, viele Bindungen). */
const lies = (datei: string) => readFileSync(new URL(`./testdaten/${datei}`, import.meta.url), 'utf8').trim().split('\n').slice(1).map(z => z.split(';'));
const aml = lies('kaplanmeier-aml.csv'), lung = lies('kaplanmeier-lung.csv');

const gruppenIndex = (zeilen: string[][], spalte: number) => { const namen = [...new Set(zeilen.map(z => z[spalte]!))].sort(); return { namen, g: (z: string[]) => namen.indexOf(z[spalte]!) }; };
const amlG = gruppenIndex(aml, 2), lungSex = gruppenIndex(lung, 2), lungEcog = gruppenIndex(lung, 3);
const amlBeob = aml.map(z => ({ g: amlG.g(z), t: Number(z[0]), e: Number(z[1]) as 0 | 1 }));
const lungBeobSex = lung.map(z => ({ g: lungSex.g(z), t: Number(z[0]), e: (z[1] === '2' ? 1 : 0) as 0 | 1 }));
const lungBeobEcog = lung.map(z => ({ g: lungEcog.g(z), t: Number(z[0]), e: (z[1] === '2' ? 1 : 0) as 0 | 1 }));
const gruppe = (b: Beob[], g: number, name = '') => schaetze(name, b.filter(x => x.g === g));
const nah = (a: number, b: number, d = 5e-6) => expect(Math.abs(a - b)).toBeLessThan(d);

type Z = [number, number, number, number, number, number];   // Zeit, n.risk, surv, se, lower, upper
const pruefeZeilen = (g: ReturnType<typeof schaetze>, soll: Z[]) => {
  for (const [t, nr, s, se, lo, hi] of soll) {
    const x = beiZeit(g, t);
    expect(x.nRisiko, `n.risk bei ${t}`).toBe(nr);
    nah(x.s, s); if (Number.isNaN(se)) expect(x.se).toBeNaN(); else nah(x.se, se);
    if (Number.isNaN(lo)) expect(x.lo).toBeNaN(); else nah(x.lo, lo);
    if (Number.isNaN(hi)) expect(x.hi).toBeNaN(); else nah(x.hi, hi);
  }
};

describe('Kaplan-Meier gegen R survival', () => {
  it('aml gesamt: 23 Personen, 18 Ereignisse, Median 27 [18; 45] (wie print/summary; quantile() nennt 48)', () => {
    const g = schaetze('', amlBeob);
    expect([g.n, g.ereignisse, g.zensiert]).toEqual([23, 18, 5]);
    expect([g.median.wert, g.median.lo, g.median.hi]).toEqual([27, 18, 45]);   // summary(fit)$table: 27 18 45
    pruefeZeilen(g, [[10, 18, 0.782609, 0.086006, 0.630958, 0.970709], [20, 13, 0.645963, 0.101143, 0.475258, 0.877982], [30, 9, 0.441684, 0.109518, 0.271676, 0.718078], [50, 1, 0.082816, 0.072662, 0.014835, 0.462327], [100, 1, 0.082816, 0.072662, 0.014835, 0.462327]]);
  });
  it('aml Erhaltungstherapie: Median 31 [18; nicht erreicht]', () => {
    const g = gruppe(amlBeob, 0);
    expect([g.n, g.ereignisse]).toEqual([11, 7]);
    expect(g.median.wert).toBe(31); expect(g.median.lo).toBe(18); expect(g.median.hi).toBeNaN();
    pruefeZeilen(g, [[10, 10, 0.909091, 0.086678, 0.754134, 1], [20, 7, 0.715909, 0.139665, 0.488426, 1], [30, 5, 0.613636, 0.152632, 0.376867, 0.999158], [50, 1, 0.184091, 0.153493, 0.035918, 0.943526], [100, 1, 0.184091, 0.153493, 0.035918, 0.943526]]);
  });
  it('aml ohne Erhaltung: Kurve fällt auf 0, dann keine Streuung', () => {
    const g = gruppe(amlBeob, 1);
    expect([g.n, g.ereignisse]).toEqual([12, 11]);
    expect(g.median.wert).toBe(23); expect(g.median.lo).toBe(8); expect(g.median.hi).toBeNaN();
    pruefeZeilen(g, [[10, 8, 0.666667, 0.136083, 0.446846, 0.994625], [20, 6, 0.583333, 0.142319, 0.361614, 0.940998], [30, 4, 0.291667, 0.138715, 0.114831, 0.740822], [50, 0, 0, NaN, NaN, NaN]]);
  });
  it('aml: Log-Rank χ²(1) = 3,396389, p = 0,06533932; beobachtet 7 / 11, erwartet 10,689336 / 7,310664', () => {
    const l = logrank(amlBeob, 2);
    nah(l.chi2, 3.396389); nah(l.p, 0.06533932, 1e-7); expect(l.df).toBe(1);
    expect(l.beobachtet).toEqual([7, 11]); nah(l.erwartet[0]!, 10.689336); nah(l.erwartet[1]!, 7.310664);
  });
  it('lung nach Geschlecht (Bindungen): Median Frauen 394,5 [305; 641], Männer 239 [181; 364]', () => {
    const f = gruppe(lungBeobSex, 0), m = gruppe(lungBeobSex, 1);
    expect(lungSex.namen).toEqual(['Frauen', 'Männer']);
    expect([f.n, f.ereignisse, m.n, m.ereignisse]).toEqual([42, 36, 76, 71]);
    expect([f.median.wert, f.median.lo, f.median.hi]).toEqual([394.5, 305, 641]);   // S = 0,5 auf einer Strecke: Mitte bis zur nächsten Stufe (summary(fit)$table)
    expect([m.median.wert, m.median.lo, m.median.hi]).toEqual([239, 181, 364]);
    pruefeZeilen(f, [[100, 37, 0.880952, 0.049970, 0.788260, 0.984544], [200, 31, 0.738095, 0.067843, 0.616415, 0.883795], [300, 27, 0.642857, 0.073936, 0.513118, 0.805401], [500, 16, 0.380952, 0.074933, 0.259084, 0.560146], [800, 2, 0.080808, 0.049377, 0.024397, 0.267656]]);
    pruefeZeilen(m, [[100, 60, 0.789474, 0.046764, 0.702938, 0.886663], [200, 43, 0.578947, 0.056634, 0.477938, 0.701304], [300, 33, 0.444308, 0.057274, 0.345112, 0.572017], [500, 19, 0.255814, 0.050484, 0.173758, 0.376621], [800, 6, 0.080783, 0.031597, 0.037531, 0.173880]]);
    const l = logrank(lungBeobSex, 2);
    nah(l.chi2, 2.690822); nah(l.p, 0.1009277433, 1e-7);
    nah(l.erwartet[0]!, 44.29997, 1e-5); nah(l.erwartet[1]!, 62.70003, 1e-5);
  });
  it('lung nach ECOG (drei Gruppen): Medianwerte, Log-Rank χ²(2) = 11,845502, p = 0,002677824', () => {
    const med = [[394, 201, 655], [363, 283, 473], [158, 107, 310]];
    med.forEach((m, i) => { const g = gruppe(lungBeobEcog, i); expect([g.median.wert, g.median.lo, g.median.hi]).toEqual(m); });
    pruefeZeilen(gruppe(lungBeobEcog, 2), [[100, 20, 0.666667, 0.086066, 0.517630, 0.858615], [200, 12, 0.4, 0.089443, 0.258063, 0.620004], [500, 5, 0.166667, 0.068041, 0.074877, 0.370980], [800, 1, 0.033333, 0.032773, 0.004853, 0.228967]]);
    const l = logrank(lungBeobEcog, 3);
    expect(l.df).toBe(2); nah(l.chi2, 11.845502); nah(l.p, 0.002677823801, 1e-8);
    expect(l.beobachtet).toEqual([24, 53, 30]);
    [31.35305, 58.36908, 17.27786].forEach((v, i) => nah(l.erwartet[i]!, v, 1e-4));
  });
  it('lung gesamt: Median 303 [226; 390]', () => {
    const g = schaetze('', lungBeobSex);
    expect([g.n, g.ereignisse]).toEqual([118, 107]);
    expect([g.median.wert, g.median.lo, g.median.hi]).toEqual([303, 226, 390]);
    pruefeZeilen(g, [[100, 97, 0.822034, 0.035211, 0.755840, 0.894025], [500, 35, 0.300618, 0.042425, 0.227976, 0.396408]]);
  });
  it('paarweise Log-Rank mit Holm (survdiff je Paar, p.adjust)', () => {
    const k = kaplanAus(lungBeobEcog.map(b => [b.g, b.t, b.e] as [number, number, 0 | 1]), { zeit: 'zeit', ereignis: 'status', gruppe: 'ecog', gruppenNamen: lungEcog.namen, werte: ['0', '1'], ereignisIndex: 1, zeilen: 120, ausgelassen: 0 });
    expect(k.paarweise.map(p => [p.a, p.b])).toEqual([[0, 1], [0, 2], [1, 2]]);
    [0.542320, 7.583240, 8.800002].forEach((v, i) => nah(k.paarweise[i]!.chi2, v));
    [0.461472814, 0.011782692, 0.009036905].forEach((v, i) => nah(k.paarweise[i]!.pHolm, v, 1e-8));
  });
  it('Holm', () => { expect(holm([0.01, 0.04, 0.03]).map(v => +v.toFixed(6))).toEqual([0.03, 0.06, 0.06]); });
  it('Median: Kurve genau bei 0,5 bis zum Ende, Kurve fällt nie unter 0,5', () => {
    // 4 Personen, Ereignisse bei 1 und 2, danach zensiert: S = .75, .5, danach fällt die Kurve nicht mehr → 2 (wie summary(survfit)$table)
    expect(schaetze('', [{ t: 1, e: 1 }, { t: 2, e: 1 }, { t: 4, e: 0 }, { t: 5, e: 0 }]).median.wert).toBe(2);
    expect(schaetze('', [{ t: 1, e: 1 }, { t: 2, e: 0 }, { t: 3, e: 0 }, { t: 4, e: 0 }]).median.wert).toBeNaN();
    expect(medianKi([]).wert).toBeNaN();
  });
  it('Ereignis umschalten: aus dem Gegenwert wird Ereignis', () => {
    const roh = aml.map(z => [amlG.g(z), Number(z[0]), Number(z[1]) as 0 | 1] as [number, number, 0 | 1]);
    const k = kaplanAus(roh, { zeit: 'zeit', ereignis: 'status', gruppe: 'gruppe', gruppenNamen: amlG.namen, werte: ['0', '1'], ereignisIndex: 1, zeilen: 23, ausgelassen: 0 });
    expect(k.gesamt.ereignisse).toBe(18);
    const u = kaplanMit(k, 0);
    expect(u.gesamt.ereignisse).toBe(5); expect(u.gruppen.map(g => g.ereignisse).reduce((a, b) => a + b, 0)).toBe(5);
  });
  it('Zeitmarken', () => {
    expect(zeitMarken(161)).toEqual([0, 50, 100, 150, 200]);
    expect(zeitMarken(1022)).toEqual([0, 200, 400, 600, 800, 1000, 1200]);
    expect(zeitMarken(0)).toEqual([0, 1]);
  });
  it('Vorschlag fürs Ereignis', () => {
    expect(schlageEreignis([{ schluessel: 0, text: '0' }, { schluessel: 1, text: '1' }])).toEqual({ index: 1, grund: 'null-eins' });
    expect(schlageEreignis([{ schluessel: 1, text: '1' }, { schluessel: 2, text: '2' }])).toEqual({ index: 1, grund: 'eins-zwei' });
    expect(schlageEreignis([{ schluessel: 0, text: 'Studienabbruch' }, { schluessel: 1, text: 'Studium fortgesetzt' }])).toEqual({ index: 0, grund: 'bezeichnung' });
    expect(schlageEreignis([{ schluessel: 'ja', text: 'ja' }, { schluessel: 'nein', text: 'nein' }]).index).toBe(0);
    expect(schlageEreignis([{ schluessel: 'a', text: 'a' }, { schluessel: 'b', text: 'b' }])).toEqual({ index: 1, grund: 'reihenfolge' });
  });
});

/* Prüfung B5: Ereignisspalte mit nur einem Wert. R (scripts/kaplanmeier-erwartet.R, Abschnitt „alle mit Ereignis“): aml mit status = 1 für alle. */
describe('Kaplan-Meier: nur ein Wert in der Ereignisspalte', () => {
  const alle = amlBeob.map(b => ({ ...b, e: 1 as const }));
  it('alle mit Ereignis, gesamt: Median 23 [13; 34] wie R survfit', () => {
    const g = schaetze('', alle);
    expect([g.n, g.ereignisse, g.zensiert]).toEqual([23, 23, 0]);
    expect([g.median.wert, g.median.lo, g.median.hi]).toEqual([23, 13, 34]);
    pruefeZeilen(g, [[10, 18, 0.7826086957, 0.0860061487, 0.6309579106, 0.9707087592], [20, 13, 0.5652173913, 0.1033665264, 0.3949557363, 0.8088772237], [30, 9, 0.3478260870, 0.0993113462, 0.1987590828, 0.6086916134]]);
  });
  it('alle mit Ereignis, je Gruppe: Median 28 [18; NA] und 19,5 [8; NA]; Log-Rank χ²(1) = 2,094231, p = 0,1478561', () => {
    const a = gruppe(alle, 0), b = gruppe(alle, 1);
    expect([a.median.wert, a.median.lo]).toEqual([28, 18]); expect(a.median.hi).toBeNaN();
    expect([b.median.wert, b.median.lo]).toEqual([19.5, 8]); expect(b.median.hi).toBeNaN();
    const l = logrank(alle, 2); nah(l.chi2, 2.094230742); nah(l.p, 0.1478561146, 1e-7);
  });
  it('kaplanAus mit einWert: bleibt beim Umschalten erhalten', () => {
    const roh = aml.map(z => [amlG.g(z), Number(z[0]), 1] as [number, number, 0 | 1]);
    const k = kaplanAus(roh, { zeit: 'zeit', ereignis: 'tod', gruppe: '', gruppenNamen: [''], werte: ['-', '1'], ereignisIndex: 1, zeilen: 23, ausgelassen: 0, einWert: true });
    expect(k.einWert).toBe(true); expect(k.gesamt.zensiert).toBe(0); expect(kaplanMit(k, 1).einWert).toBe(true);
  });
  it('welcher Wert: 0 = zensiert, andere Zahlen = Ereignis (wie R Surv), sonst nach der Bezeichnung', () => {
    expect(einWertArt({ schluessel: 0, text: '0' })).toEqual({ art: 'zensiert', grund: 'null' });
    expect(einWertArt({ schluessel: 1, text: '1' })).toEqual({ art: 'ereignis', grund: 'zahl' });
    expect(einWertArt({ schluessel: 2, text: '2' }).art).toBe('ereignis');
    expect(einWertArt({ schluessel: 1, text: 'gestorben' })).toEqual({ art: 'ereignis', grund: 'bezeichnung' });
    expect(einWertArt({ schluessel: 1, text: 'zensiert' })).toEqual({ art: 'zensiert', grund: 'bezeichnung' });
    expect(einWertArt({ schluessel: 'nein', text: 'nein' }).art).toBe('zensiert');
    expect(einWertArt({ schluessel: 'x', text: 'x' })).toEqual({ art: 'ereignis', grund: 'text' });
  });
});
