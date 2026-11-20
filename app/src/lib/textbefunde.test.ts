// Abschlusstest 09./10.10.2026, Bereich T (Texte): je Befund mit Satzlogik ein Test (abschlusstest-2026-10-09/T-texte/BERICHT.md).
import { afterEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import * as E from './ergebnis';
import { mannWhitney, wilcoxon } from './rangtests';
import { saetzeMannWhitney, saetzeWilcoxon, rWort } from './rangsaetze';
import { messwiederholung } from './messwiederholung';
import { saetzeMesswiederholung } from './mwsaetze';
import { saetzeMediation, saetzeModeration } from './medmodsaetze';
import { saetzeMehrebenen, iccWort as mebIccWort } from './mehrebenensaetze';
import { bayesZweiGruppen } from './bayessaetze';
import { korrMatrix } from './korrmatrix';
import { saetzeKorrMatrix } from './korrmatrixsaetze';
import { kaplanAus } from './ueberleben';
import { saetzeKaplan } from './ueberlebensaetze';
import { einzelfallAus } from './einzelfall';
import { saetzeEinzelfall } from './einzelfallsaetze';
import { mitOmega } from './rsaetze';
import { kappaAusTabelle } from './uebereinstimmung';

const id = (x: string) => x;
const de = () => { s.einst.sprache = 'de'; };
const en = () => { s.einst.sprache = 'en'; };
afterEach(de);
const alles = (r: { haupt: string; zusatz: string; vorsicht: string; apa: string; marken: { text: string }[] }) => [r.haupt, r.zusatz, r.vorsicht, r.apa, ...r.marken.map(m => m.text)].join(' | ');

const g = (name: string, n: number, m: number, sd: number) => ({ name, n, m, sd, kiLo: m - 1, kiHi: m + 1 });
const zg = (o: Partial<E.ZweiGruppen>): E.ZweiGruppen => ({ art: 'zwei-gruppen', abhaengig: 'Note', gruppenSpalte: 'G', a: g('A', 40, 2.4, 1), b: g('B', 40, 2.9, 1),
  diff: -0.5, t: -2, df: 78, p: 0.049, diffLo: -0.9, diffHi: -0.01, tKlassisch: -2, dfKlassisch: 78, pKlassisch: 0.049, d: -0.497, dLo: -0.94, dHi: -0.05, spGepoolt: 1, ...o });
const kr = (o: Partial<E.Kreuz>): E.Kreuz => ({ art: 'kreuz', gezaehlt: 'Bestanden', gruppen: 'Kurs', chi2: 6.2, df: 1, p: 0.013, n: 100, v: 0.249, stufen: 1, unter5: 0, zellen: 4, minErwartet: 12,
  je: [{ name: 'Online', n: 50, haeufigst: 'ja', anteil: 0.7, gleichauf: ['ja'] }, { name: 'Präsenz', n: 50, haeufigst: 'nein', anteil: 0.54, gleichauf: ['nein'] }],
  zaehlung: { zeilen: ['Online', 'Präsenz'], spalten: ['ja', 'nein'], tab: [[35, 15], [23, 27]] }, ...o });
const kleinKr = (o: Partial<E.Kreuz> = {}) => kr({ n: 20, chi2: 4.0, p: 0.046, fisherP: 0.12, unter5: 2, zellen: 4, minErwartet: 2.5, v: 0.447,
  zaehlung: { zeilen: ['Online', 'Präsenz'], spalten: ['ja', 'nein'], tab: [[8, 2], [4, 6]] },
  je: [{ name: 'Online', n: 10, haeufigst: 'ja', anteil: 0.8, gleichauf: ['ja'] }, { name: 'Präsenz', n: 10, haeufigst: 'nein', anteil: 0.6, gleichauf: ['nein'] }], ...o });
const zs = (o: Partial<E.Zusammenhang>): E.Zusammenhang => ({ art: 'zusammenhang', x: 'Lernzeit', y: 'Note', r: -0.34, p: 0.002, n: 80, kiLo: -0.52, kiHi: -0.13, ...o });

describe('T1 Kreuztabelle: bei ungenauem χ² gilt Fisher für Satz, Marke und sig', () => {
  it('χ² p = ,046, Fisher p = ,120: kein Unterschied behauptet', () => {
    de();
    const st = E.saetzeKreuz(kleinKr());
    expect(st.zusatz).not.toMatch(/Die Gruppen unterscheiden sich darin/);
    expect(st.zusatz).toContain('exakter Test nach Fisher, p = ,120');
    expect(st.zusatz).toContain('darum gilt hier der exakte Test nach Fisher (Chi-Quadrat zum Vergleich: p = ,046)');
    expect(st.marken.find(m => m.erklaer === 'p-wert')!.text).toBe('p = ,120 (Fisher) · über ,05');
    expect(st.apa).toMatch(/^χ²\(1, N = 20\) = 4,00, p = ,046, V = ,45.*; exakter Fisher-Test: p = ,120$/);
    en();
    const st2 = E.saetzeKreuz(kleinKr());
    expect(st2.zusatz).toContain("Fisher's exact test, p = .120");
    expect(st2.zusatz).toContain("so Fisher's exact test is used here (chi-square for comparison: p = .046)");
    expect(st2.apa).toMatch(/; Fisher's exact test: p = \.120$/);
  });
  it('χ² nicht deutlich, Fisher deutlich: Fisher entscheidet', () => {
    de();
    const st = E.saetzeKreuz(kleinKr({ p: 0.07, fisherP: 0.03 }));
    expect(st.zusatz).toMatch(/^Die Gruppen unterscheiden sich darin.*exakter Test nach Fisher, p = ,030\)/);
    expect(st.marken.find(m => m.erklaer === 'p-wert')!.text).toBe('p = ,030 (Fisher) · unter ,05');
  });
  it('genaue Lage: unverändert χ²', () => {
    de();
    const st = E.saetzeKreuz(kr({}));
    expect(st.zusatz).toContain('(p = ,013)');
    expect(st.marken.find(m => m.erklaer === 'p-wert')!.text).toBe('p = ,013 · unter ,05');
  });
});

describe('T2 Mann-Whitney: gleiche Ränge, gleiche Mediane', () => {
  it('identische Gruppen: „gleich hoch“, nicht „höher“', () => {
    de();
    const st = saetzeMannWhitney(mannWhitney('Note', 'Kurs', { name: 'A', werte: [1, 2, 3, 4, 5] }, { name: 'B', werte: [1, 2, 3, 4, 5] })!, id);
    expect(st.haupt).toBe('Bei „Note“ lagen die Werte der Gruppen „A“ und „B“ (Kurs) im Rangvergleich gleich hoch: Median 3 gegen 3.');
    en();
    expect(saetzeMannWhitney(mannWhitney('Note', 'Kurs', { name: 'A', werte: [1, 2, 3, 4, 5] }, { name: 'B', werte: [1, 2, 3, 4, 5] })!, id).haupt).toBe('On "Note", the groups "A" and "B" (Kurs) ranked equally high: median 3 vs. 3.');
  });
  it('gleiche Mediane, Ränge verschieden: erklärt', () => {
    de();
    const st = saetzeMannWhitney(mannWhitney('Note', 'Kurs', { name: 'A', werte: [3, 3, 3, 3, 3, 4, 5, 5, 5] }, { name: 'B', werte: [1, 2, 3, 3, 3, 3, 3, 3, 3] })!, id);
    expect(st.haupt).toBe('Bei „Note“ lagen die Werte der Gruppe „A“ (Kurs) im Rangvergleich höher als die der Gruppe „B“, obwohl beide denselben Median haben (3): Der Unterschied liegt außerhalb der Mitte.');
  });
});

describe('T3 Korrelation bei r ≈ 0', () => {
  it('r = 0 und r = −,004: kaum ein Zusammenhang, keine Tendenz', () => {
    de();
    expect(E.saetzeZusammenhang(zs({ r: 0, p: 1 }), id).haupt).toBe('Zwischen „Lernzeit“ und „Note“ zeigt sich kaum ein Zusammenhang (r = ,00).');
    expect(E.saetzeZusammenhang(zs({ r: -0.004, p: 0.97 }), id).haupt).not.toMatch(/tendenziell/);
    en();
    expect(E.saetzeZusammenhang(zs({ r: 0.02, p: 0.86 }), id).haupt).toBe('There is hardly any relationship between "Lernzeit" and "Note" (r = .02).');
  });
  it('sonst mit Bezugswort', () => {
    de();
    expect(E.saetzeZusammenhang(zs({}), id).haupt).toBe('Wer bei „Lernzeit“ höhere Werte hat, hat bei „Note“ tendenziell niedrigere Werte.');
    expect(E.saetzeZusammenhang(zs({ r: 0.3 }), id).haupt).toBe('Wer bei „Lernzeit“ höhere Werte hat, hat bei „Note“ tendenziell auch höhere Werte.');
  });
  it('Partialkorrelation ebenso', () => {
    de();
    const st = E.saetzeZusammenhang(zs({ r: 0.03, p: 0.8, kontroll: ['Alter'], df: 77, methode: 'pearson' }), id);
    expect(st.haupt).toBe('Wenn man „Alter“ gleich hält, zeigt sich zwischen „Lernzeit“ und „Note“ kaum ein Zusammenhang (pr = ,03).');
  });
});

describe('T4 Wort und Zahl an den Schwellen', () => {
  it('p um ,05 mit vier Stellen', () => {
    de();
    expect(E.pWert(0.0496)).toBe('= ,0496');
    expect(E.pWert(0.0504)).toBe('= ,0504');
    expect(E.pWert(0.0494)).toBe('= ,049');
    expect(E.pWert(0.0506)).toBe('= ,051');
    expect(E.saetzeZweiGruppen(zg({ p: 0.0496 }), id).marken[1]!.text).toBe('p = ,0496 · unter ,05');
  });
  it('Wortstufen am angezeigten Wert', () => {
    de();
    expect(E.effektWort(-0.497)).toBe('mittelgroß');
    expect(E.zusammenhangWort(0.297)).toBe('mittel');
    expect(E.eta2Wort(0.0597)).toBe('mittelgroß');
    expect(E.alphaWort(0.698)).toBe('akzeptabel');
    expect(rWort(0.297)).toBe('mittelgroß');
    const sk = E.saetzeSkala({ art: 'skala', alpha: 0.698, n: 50, fragen: [{ name: 'a', trennschaerfe: 0.5, alphaOhne: 0.6 }, { name: 'b', trennschaerfe: 0.5, alphaOhne: 0.6 }, { name: 'c', trennschaerfe: 0.5, alphaOhne: 0.6 }] });
    expect(sk.haupt).toContain('ist akzeptabel');
    expect(sk.zusatz).not.toMatch(/unsicher/);
  });
});

const pr = (name: string, b: number, beta: number, p: number, lo: number, hi: number): E.Praediktor => ({ name, b, beta, p, lo, hi });
describe('T5/T30 Regression: kleine B, kleiner Anteil', () => {
  it('B = 0,004 mit mehr Stellen', () => {
    de();
    const st = E.saetzeVorhersage({ art: 'vorhersage', ziel: 'Note', r2: 0.001, r2korr: -0.01, f: 0.08, df1: 1, df2: 78, p: 0.78, praediktoren: [pr('Einkommen', 0.004, 0.03, 0.78, -0.024, 0.032)] }, id);
    expect(st.haupt).toBe('Wer bei „Einkommen“ eine Einheit mehr hat, hat bei „Note“ im Schnitt 0,0040 mehr.');
    expect(st.apa).toContain('B = 0,0040, 95 %-KI [−0,0240; 0,0320]');
    expect(st.zusatz).toMatch(/erklärt weniger als 1\s%\sder Unterschiede/);
    en();
    expect(E.saetzeVorhersage({ art: 'vorhersage', ziel: 'Note', r2: 0.18, r2korr: 0.17, f: 17.1, df1: 1, df2: 78, p: 0.0001, praediktoren: [pr('Lernzeit', -0.045, -0.42, 0.0001, -0.067, -0.023)] }, id).haupt)
      .toBe('For each one-unit increase in "Lernzeit", "Note" was 0.045 lower on average.');
  });
});

const lp = (name: string, b: number, p: number, or: number, orLo: number, orHi: number) => ({ name, b, se: 0.2, p, or, orLo, orHi });
const lg = (o: Partial<E.Logistik>): E.Logistik => ({ art: 'logistik', ziel: 'Bestanden', ereignis: '1', referenz: '0', n: 120, nEreignis: 80, nReferenz: 40, minus2ll: 140, chi2: 12.8, df: 1, p: 0.0003, coxSnell: 0.1, nagelkerke: 0.14, treffer: 0.72, praediktoren: [lp('Lernzeit', 0.4, 0.001, 1.49, 1.17, 1.9)], ...o });
describe('T7/T31 Logistische Regression', () => {
  it('Modelltest als Likelihood-Quotienten-Test, keine „Trennung“', () => {
    de();
    const st = E.saetzeLogistik(lg({}), id);
    expect(st.zusatz).toContain('Das Modell passt besser zu den Daten als ein Modell ohne Prädiktoren (Likelihood-Quotienten-Test)');
    expect(st.zusatz).not.toMatch(/trennt/);
    en();
    expect(E.saetzeLogistik(lg({ chi2: 1.2, p: 0.27 }), id).zusatz).toContain('the model does not fit the data clearly better than a model without predictors (likelihood ratio test, χ²(1) = 1.20, p = .270)');
  });
  it('OR = 1,00: praktisch keine Änderung', () => {
    de();
    expect(E.saetzeLogistik(lg({ chi2: 0, p: 0.99, praediktoren: [lp('Alter', 0.001, 0.99, 1.0, 0.9, 1.11)] }), id).haupt)
      .toBe('Mit jeder Einheit mehr bei „Alter“ ändert sich bei „Bestanden“ die Chance (Odds) für „1“ gegenüber „0“ praktisch nicht: Odds Ratio = 1,00, 95 %-KI [0,90; 1,11].');
  });
});

const iccM = (icc: number, lo: number, hi: number) => ({ icc, kiLo: lo, kiHi: hi });
const iccE = (ein: unknown, mit: unknown, o: object = {}): E.IccErgebnis => ({ art: 'icc', spalten: ['R1', 'R2', 'R3'], modell: 'absolut', gesamt: 40, mittelwerte: [3, 3.2, 3.1], icc: { k: 3, n: 40, f: 8.2, df1: 39, df2: 78, p: 0.00001, absolut: { einzel: ein, mittel: mit }, konsistenz: { einzel: ein, mittel: mit } }, ...o } as unknown as E.IccErgebnis);
describe('T8/T9/T55 Kappa und ICC', () => {
  it('KI in einer Stufe: „liegt ganz im Bereich“', () => {
    de();
    const kz = kappaAusTabelle([[20, 5, 0], [4, 15, 3], [1, 2, 10]], 'keins');
    const kap = { art: 'kappa', a: 'A', b: 'B', n: 60, kategorien: [1, 2, 3], tab: [[20, 5, 0], [4, 15, 3], [1, 2, 10]], uebereinstimmung: 0.75, gewicht: 'keins', alle: { keins: kz, linear: kz, quadratisch: kz }, gewichtbar: true, empfohlen: 'keins', quelle: 'eigen', ...kz, kappa: 0.5, kiLo: 0.43, kiHi: 0.58, p: 0.0001 } as unknown as E.Kappa;
    expect(E.saetzeKappa(kap, id).zusatz).toContain('liegt ganz im Bereich „mäßig“');
    expect(E.saetzeIcc(iccE(iccM(0.8, 0.76, 0.84), iccM(0.92, 0.9, 0.94))).zusatz).toContain('liegt ganz im Bereich „gut“');
  });
  it('ICC: Koo & Li als Empfehlung, Untergrenze benannt', () => {
    de();
    const st = E.saetzeIcc(iccE(iccM(0.8, 0.7, 0.88), iccM(0.92, 0.88, 0.95)));
    expect(st.zusatz).toContain('Sie empfehlen, das ganze Intervall zu betrachten: Hier spricht die Untergrenze für „mäßig“.');
    expect(st.zusatz).not.toMatch(/sie beurteilen nach der Untergrenze/);
  });
  it('Konsistenz: fester Unterschied erlaubt, nicht „gleich geordnet“', () => {
    de();
    const st = E.saetzeIcc(iccE(iccM(0.8, 0.7, 0.88), iccM(0.92, 0.88, 0.95), { modell: 'konsistenz' }));
    expect(st.haupt).toContain('Konsistenz: ein fester Unterschied zwischen den Beurteilenden ist erlaubt, die Abstände sollen gleich sein');
    en();
    expect(E.saetzeIcc(iccE(iccM(0.8, 0.7, 0.88), iccM(0.92, 0.88, 0.95), { modell: 'konsistenz' })).haupt).toContain('consistency: a constant difference between raters is allowed, the distances should be the same');
  });
});

describe('T11 Faktorenanalyse: Komponenten und KMO', () => {
  const fa = (o: Partial<E.Faktoren>): E.Faktoren => ({ art: 'faktor', faktoren: [{ nr: 1, fragen: [{ name: 'F1', ladung: 0.8 }, { name: 'F2', ladung: 0.7 }] }, { nr: 2, fragen: [{ name: 'F3', ladung: 0.75 }, { name: 'F4', ladung: -0.6 }] }], erklaert: 0.62, doppelt: [], ohne: [], n: 150, fragen: 4, kmo: { kmo: 0.58, chi2: 120.4, df: 6, p: 0.00001 }, ...o });
  it('KMO unter ,50: kein inhaltliches Ergebnis', () => {
    de();
    const st = E.saetzeFaktoren(fa({ kmo: { kmo: 0.45, chi2: 20, df: 6, p: 0.003 } }));
    expect(st.haupt).toMatch(/^Die Daten eignen sich nicht für eine Faktorenanalyse \(KMO = ,45/);
  });
  it('KMO ,58: „nur knapp“; Komponenten statt Gruppen; APA de wie en', () => {
    de();
    const st = E.saetzeFaktoren(fa({}));
    expect(st.zusatz).toContain('Die Daten eignen sich nur knapp für diese Analyse (KMO = ,58, schwach');
    expect(st.haupt).toBe('Die 4 Fragen bilden 2 Komponenten (Gruppen von Fragen): Jede Komponente fasst die Varianz mehrerer Fragen zusammen.');
    expect(st.zusatz).toContain('Komponente 1: „F1“, „F2“.');
    expect(st.apa).toContain('2 Komponenten mit Eigenwert > 1');
    expect(alles(st)).not.toMatch(/Gruppe \d|\d Gruppen ·/);
  });
});

describe('T12/T17/T18 Mediation, Moderation', () => {
  const P = (b: number, p: number, lo: number, hi: number) => ({ b, se: 0.1, beta: b / 2, t: b / 0.1, p, lo, hi });
  const med = (o: object) => ({ art: 'mediation', x: 'Unterricht', m: 'Motivation', y: 'Leistung', n: 120, gesamt: 125, a: P(0.5, 0.0001, 0.3, 0.7), b: P(0.4, 0.0002, 0.2, 0.6), direkt: P(0.25, 0.03, 0.02, 0.48), total: P(0.45, 0.0001, 0.22, 0.68), r2M: 0.2, r2Y: 0.3, dfM: 118, dfY: 117, ab: 0.2, abLo: 0.09, abHi: 0.33, abSe: 0.06, abStd: 0.1, abStdLo: 0.04, abStdHi: 0.17, anteil: 0.44, ziehungen: 5000, startwert: 1, gueltig: 5000, ...o }) as never;
  it('gegenläufiger direkter Effekt: kompetitive Mediation, nicht „zum Teil“', () => {
    de();
    const st = saetzeMediation(med({ direkt: P(-0.3, 0.02, -0.55, -0.05), total: P(-0.1, 0.4, -0.33, 0.13), anteil: NaN }), id);
    expect(st.haupt).not.toMatch(/zum Teil/);
    expect(st.haupt).toContain('kompetitive Mediation');
    expect(saetzeMediation(med({}), id).haupt).toContain('läuft zum Teil über');
  });
  const RT = (b: number, p: number) => ({ b, se: 0.1, beta: b / 2, t: b / 0.1, p, lo: b - 0.2, hi: b + 0.2 });
  const mod = (o: object) => ({ art: 'moderation', x: 'Lernzeit', w: 'Vorwissen', y: 'Leistung', n: 150, gesamt: 150, mx: 5, mw: 3, sdw: 1, wMin: 1, wMax: 5, xMin: 0, xMax: 10, zwei: false, konstante: RT(10, 0), bx: RT(0.5, 0.001), bw: RT(0.3, 0.01), bxw: RT(0.2, 0.01), r2: 0.3, r2Ohne: 0.27, dr2: 0.03, f2: 0.043, fDr2: 6.4, df2: 146, pDr2: 0.012, vxx: 0.01, vxxw: 0, vww: 0.01, steigungen: [{ label: 'mittel', w: 3, b: 0.5, se: 0.1, t: 5, p: 0.0001, lo: 0.3, hi: 0.7 }], jn: [{ von: 1, bis: 1.6, sig: false }, { von: 1.6, bis: 5, sig: true }], ...o }) as never;
  it('bedingte Effekte, „signifikant“', () => {
    de();
    const st = saetzeModeration(mod({}), id);
    expect(st.vorsicht).toMatch(/^Die Koeffizienten von Lernzeit und Vorwissen sind bedingte Effekte: Sie gelten beim Mittelwert der jeweils anderen Größe \(zentriert\)\./);
    expect(st.zusatz).toContain('ist die Steigung von Lernzeit signifikant bei Vorwissen ab 1,60');
    expect(alles(st)).not.toMatch(/bedeutsam/);
    en();
    expect(saetzeModeration(mod({}), id).vorsicht).toMatch(/^The coefficients of Lernzeit and Vorwissen are conditional effects/);
  });
});

describe('T13/T19 Mehrebenen', () => {
  const meb = (o: object) => ({ art: 'mehrebenen', y: 'Leistung', gruppe: 'Klasse', praed: [{ name: 'SES', art: 'zahl', stufen: [] }], steigung: 'SES', zentriert: true, n: 600, nAlle: 620, ng: 25, gnMin: 18, gnMed: 24, gnMax: 30, gnMittel: 24, yMittel: 50, ySd: 10, nullTau: 9, nullSigma: 91, nullIcc: 0.09, nullKonst: 50, nullKonstSe: 0.7, nullKonstDf: 24, deff: 3.07, mitPraed: true, fest: [{ pIdx: -1, stufe: '', b: 50, se: 0.6, df: 24, t: 80, p: 0, lo: 49, hi: 51 }, { pIdx: 0, stufe: '', b: 2.1, se: 0.4, df: 580, t: 5.2, p: 0.00001, lo: 1.3, hi: 2.9 }], tests: [], tau: 6, sigma: 85, iccVoll: 0.066, r2m: 0.05, r2c: 0.11, aufgeklaert1: 0.066, aufgeklaert2: 0.33, gruppen: [], singular: false, nullSingular: false, konv: false, meldungen: [], ...o }) as never;
  it('zufällige Steigung ist kein Beleg für Unterschiede', () => {
    de();
    const st = saetzeMehrebenen(meb({ tauSteigung: 0.02, korAchSteig: 0.3 }), id);
    expect(alles(st)).not.toMatch(/unterscheidet sich also/);
    expect(alles(st)).toContain('zeigt erst ein Vergleich mit dem Modell ohne zufällige Steigung');
    expect(alles(saetzeMehrebenen(meb({ tauSteigung: 0.02, korAchSteig: 1, singular: true }), id))).not.toMatch(/Geschätzt streuen/);
  });
  it('ICC-Wort nach Hox', () => {
    de();
    expect(mebIccWort(0.09)).toBe('klein');
    expect(mebIccWort(0.12)).toBe('mittel');
    expect(mebIccWort(0.03)).toBe('gering');
  });
});

describe('T14/T18/T61 Messwiederholung', () => {
  const A = [[2, 3, 3], [4, 3, 4], [6, 5, 7], [5, 3, 4], [4, 6, 4], [8, 9, 9], [5, 8, 9], [3, 5, 6], [4, 4, 5], [4, 7, 8], [3, 5, 6], [6, 9, 8], [6, 6, 8], [2, 5, 6], [3, 7, 7], [5, 7, 8]];
  const zn = (i: number) => ['T1', 'T2', 'T3'][i]!;
  it('flacher Verlauf: „bleibt fast gleich“', () => {
    de();
    const flach = A.map((z, i) => [z[0]!, z[0]! + (i % 2 ? 0.5 : -0.5), z[0]! + (i % 2 ? -0.3 : 0.3)]);
    const st = saetzeMesswiederholung(messwiederholung(flach, ['a', 'b', 'c']), zn);
    expect(st.haupt).toMatch(/^Im Schnitt bleibt der Wert über die 3 Zeitpunkte fast gleich: /);
  });
  it('Auf und Ab: „steigt und fällt“', () => {
    de();
    const auf = A.map((z, i) => [z[0]!, z[0]! + 2 + (i % 2 ? 0.5 : -0.5), z[0]! + 1 + (i % 3 ? 0.2 : -0.4)]);
    expect(saetzeMesswiederholung(messwiederholung(auf, ['a', 'b', 'c']), zn).haupt).toMatch(/^Im Schnitt steigt und fällt der Wert über die 3 Zeitpunkte: /);
  });
  it('Wechselwirkung „signifikant“, Hinweis: Einordnung nach ηG², nicht ηp² (F4/T61)', () => {
    de();
    const st = saetzeMesswiederholung(messwiederholung(A, ['a', 'b', 'c'], ['K', 'K', 'K', 'K', 'K', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B', 'B'], 'g'), zn, 'Gruppe');
    expect(st.zusatz).toContain('Wechselwirkung Zeit × Gruppe ist signifikant');
    expect(st.vorsicht).toContain('Die Einordnung folgt ηG², das mit η² aus Gruppenvergleichen vergleichbar ist');
  });
});

describe('T15/T32 Wilcoxon', () => {
  it('keine „einseitige“ Veränderung; APA mit V', () => {
    de();
    const st = saetzeWilcoxon(wilcoxon('vorher', 'nachher', [[3, 5], [4, 6], [2, 3], [5, 5], [3, 6], [4, 7], [2, 4], [3, 3], [5, 8], [4, 5], [3, 2], [2, 5]])!, id);
    expect(st.zusatz).not.toMatch(/einseitig/);
    expect(st.zusatz).toContain('Eine so deutlich in eine Richtung gehende Veränderung wäre selten');
    expect(st.apa).toMatch(/^V = \d/);
    const ns = saetzeWilcoxon(wilcoxon('vorher', 'nachher', [[3, 4], [4, 3], [2, 3], [5, 5], [3, 2], [4, 5], [2, 2], [3, 3], [5, 4], [4, 4]])!, id);
    expect(ns.zusatz).toContain('Ein solches Verhältnis von Anstiegen und Rückgängen kommt auch dann nicht selten vor');
  });
});

describe('T20 Prä-Post: Hinweis zu Cohens Grenzen für dz', () => {
  it('Vorsicht nennt Lakens', () => {
    de();
    const pp: E.PraePost = { art: 'prae-post', vorher: 'v', nachher: 'n', n: 30, m1: 12.1, sd1: 3, m2: 13.4, sd2: 3.2, diff: 1.3, sdDiff: 2.5, diffLo: 0.37, diffHi: 2.23, t: 2.85, df: 29, p: 0.008, r: 0.7, dz: 0.52, dzLo: 0.13, dzHi: 0.9, dav: 0.42 };
    expect(E.saetzePraePost(pp, id).vorsicht).toContain('Die Einordnung folgt dav, das wie d aus Gruppenvergleichen gerechnet ist.');   // F4: Wortstufe aus dav (Lakens 2013)
  });
});

describe('T16/T18/T23 Einzelfall', () => {
  const kopf = { mess: 'Wörter', phase: 'Phase', zeit: 'Woche', fall: 'Kind', phasenA: 'A', phasenB: 'B', zeilen: 0, ausgelassen: 0 } as never;
  const y = [3, 4, 3, 5, 4, 7, 8, 7, 9, 8, 9], istB = y.map((_, i) => i >= 5);
  it('gegenläufige Fälle: kein Richtungs-Hinweis aus dem Mittel', () => {
    de();
    const st = saetzeEinzelfall(einzelfallAus([{ name: 'Ana', y, istB }, { name: 'Ben', y: [8, 9, 8, 9, 8, 5, 4, 5, 3, 4, 4], istB }], kopf));
    expect(st.vorsicht).not.toMatch(/Richtung oben umschalten/);
  });
  it('kein „bedeutsamer“ Trend, Tau-BC nicht berechenbar erklärt', () => {
    de();
    expect(alles(saetzeEinzelfall(einzelfallAus([{ name: '', y, istB }], kopf)))).not.toMatch(/bedeutsam/);
    const y2 = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], istB2 = y2.map((_, i) => i >= 4);
    const st = saetzeEinzelfall(einzelfallAus([{ name: '', y: y2, istB: istB2 }], kopf));
    expect(st.zusatz).not.toMatch(/Tau = - \(p -\)/);
    expect(st.zusatz).toContain('baseline-korrigiertes Tau lässt sich hier nicht berechnen');
  });
});

describe('T18/T22 Kaplan-Meier', () => {
  it('Log-Rank ohne „bedeutsam“, Gruppennamen in Anführung', () => {
    de();
    const roh: [number, number, 0 | 1][] = [];
    for (let i = 0; i < 30; i++) roh.push([i % 2, 1 + (i % 9), (i % 3 === 0 ? 0 : 1) as 0 | 1]);
    const o = { zeit: 'Semester', ereignis: 'Abbruch', gruppe: 'Kohorte', gruppenNamen: ['2020', '2021'], werte: ['nein', 'ja'] as [string, string], ereignisIndex: 1 as const, zeilen: 30, ausgelassen: 0 };
    const st = saetzeKaplan(kaplanAus(roh, o));
    expect(st.zusatz).toMatch(/^Einen Unterschied zwischen den Überlebenskurven belegt der Log-Rank-Test nicht \(χ²\(1\) = .*\) - das heißt nicht, dass es keinen gibt\./);
    expect(st.zusatz).toMatch(/„2020“: \d+\s%/);
  });
});

describe('T25 Bayes-Faktor um 1', () => {
  it('BF₁₀ = 1,0: keine Seite', () => {
    de();
    // t so gewählt, dass BF₁₀ gerundet 1,0 ist (n = 40/38)
    const ts = [1.82, 1.84, 1.86, 1.88, 1.9, 1.92, 1.94, 1.96];
    const z = ts.map(t => bayesZweiGruppen(zg({ a: g('A', 40, 2.4, 1), b: g('B', 38, 2.8, 1), tKlassisch: t }))!).find(b => b.kurz.endsWith('= 1,0'));
    expect(z).toBeDefined();
    expect(z!.satz).toContain('unter beiden Annahmen etwa gleich wahrscheinlich');
    expect(z!.satz).not.toMatch(/1,0-mal/);
  });
});

describe('T26/T27/T28/T33 Kleinigkeiten', () => {
  it('Diagnostik: „mit negativer Referenz“', () => {
    de();
    const st = E.saetzeKreuz(kr({ diagnose: { ref: 'zeilen', refPos: 0, testPos: 0 } as never, zaehlung: { zeilen: ['krank', 'gesund'], spalten: ['positiv', 'negativ'], tab: [[40, 10], [3, 4]] } }));
    expect(st.vorsicht).toContain('mit negativer Referenz');
    expect(st.vorsicht).not.toMatch(/ohne positiver/);
  });
  it('Korrelationsmatrix en: „1 of 6 pairs shows“', () => {
    en();
    const zeilen = Array.from({ length: 30 }, (_, i) => [i, (i * 7) % 11, 30 - i + ((i * 3) % 5), (i * 13) % 17]);
    const st = saetzeKorrMatrix(korrMatrix(['a', 'b', 'c', 'd'], zeilen, { methode: 'pearson' }), id);
    expect(st.haupt).not.toMatch(/1 of \d+ pairs show /);
  });
  it('Omega „lässt zu“', () => {
    de();
    const st = mitOmega({ haupt: '', zusatz: '', vorsicht: '', apa: '', marken: [] }, { omega: 0.8, lo: 0.7, hi: 0.86, art: 'delta', n: 100, nAlle: 100, k: 4, heywood: false } as never);
    expect(st.zusatz).toContain('Omega lässt zu, dass die Fragen unterschiedlich stark zur Skala beitragen; Alpha nimmt gleiche Beiträge an (tau-Äquivalenz).');
  });
  it('Skala-Zusatz ohne führendes Leerzeichen', () => {
    de();
    const st = E.saetzeSkala({ art: 'skala', alpha: 0.6, n: 50, fragen: [{ name: 'a', trennschaerfe: 0.5, alphaOhne: 0.5 }, { name: 'b', trennschaerfe: 0.5, alphaOhne: 0.5 }, { name: 'c', trennschaerfe: 0.5, alphaOhne: 0.5 }] });
    expect(st.zusatz).toBe(st.zusatz.trim());
  });
});
