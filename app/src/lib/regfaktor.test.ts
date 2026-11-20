import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { alsZahl, leseCsv, planeSpalten, zurEngine, type Tabelle } from './einlesen';
import { komma, logistik, saetzeLogistik, saetzeVorhersage, vorhersage } from './ergebnis';
import { regFaktor, regTerme, regressionBefehl, regAlsFaktor, zuVieleStufen, ordinalAlsZahl, type RegFaktor } from './regfaktor';
import { VERFAHREN, logistikBefehl, logistikKodierung, type Ctx } from './verfahren';
import type { Spalte } from './verzeichnis';
import { nodeEngine } from './testengine';
import erwartet from './testdaten/regression-faktor-erwartet.json';

/* Abschlusstest F1: Gruppen-Spalten als Prädiktoren. Sollwerte aus R (scripts/regression-faktor-erwartet.R):
 * lm(punkte ~ factor(studiengang) + lernzeit), Gesamttest anova(lm(punkte ~ lernzeit), lm(punkte ~ factor(studiengang) + lernzeit));
 * glm(hoch ~ factor(studiengang) + lernzeit, binomial), Gesamttest anova(glm ohne, glm mit, test = "Chisq").
 * Daten: abschlusstest-2026-10-09/F-methodik/daten/regression-nominal.csv (90 Personen) mit Text-Spalten. Vorher ging „Studiengang“ als Zahl ein: R² = ,29. */
type Koef = { name: string; b: number; p: number; lo: number; hi: number };
type Lin = { r2: number; f: number; df1: number; df2: number; koef: Koef[]; dr2: number; fFaktor: number; df1Faktor: number; df2Faktor: number; pFaktor: number };
const R = erwartet as unknown as { zahl_mit_lern: Lin; text_mit_lern: Lin; zwei_mit_lern: Lin; nur_faktor: { r2: number; f: number; df1: number; df2: number; p: number; koef: Koef[] }; als_zahl: { r2: number };
  logistisch: { koef: (Koef & { or: number; orLo: number; orHi: number })[]; chi2Faktor: number; dfFaktor: number; pFaktor: number; minus2ll: number } };

let e: Awaited<ReturnType<typeof nodeEngine>>, tab: Tabelle;
const nah = (ist: number, soll: number, tol = 1e-6) => expect(Math.abs(ist - soll), `${ist} gegen ${soll}`).toBeLessThan(tol * Math.max(1, Math.abs(soll)));
const STUDIENGANG = { '1': 'Lehramt', '2': 'Sozialpaed', '3': 'Psychologie' };
const spalteVon = (name: string, o: Partial<Spalte> = {}): Spalte => {
  const plan = planeSpalten(tab).find(p => p.name === name)!;
  return { name, bezeichnung: '', art: plan.art, niveau: 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {}, ...o };
};
const werteVon = (name: string) => { const i = tab.kopf.indexOf(name), plan = planeSpalten(tab).find(p => p.name === name)!; return tab.zeilen.map(z => z[i]).filter(v => v !== null && v !== '').map(v => (plan.art === 'zahl' ? alsZahl(v!, plan.punkt)! : String(v))); };
const spalten: Record<string, Spalte> = {};
const faktor = (n: string): RegFaktor | null => (spalten[n] ? regFaktor(spalten[n]!, werteVon(n), tab.kopf) : null);

beforeAll(async () => {
  e = await nodeEngine();
  tab = leseCsv(readFileSync(new URL('./testdaten/regression-faktor.csv', import.meta.url), 'utf8'));
  const b = zurEngine(tab);
  e.run(b.syntax, { '/import.csv': b.csv });
  e.run("VARIABLE LABELS studiengang 'Studiengang'.\nVALUE LABELS studiengang 1 'Lehramt' 2 'Sozialpaed' 3 'Psychologie'.");
  // wie eine SPSS-Datei aus R/haven: Niveau „Scale“, aber Wertebeschriftungen
  spalten.studiengang = spalteVon('studiengang', { bezeichnung: 'Studiengang', werteLabels: STUDIENGANG });
  spalten.sg_text = spalteVon('sg_text', { niveau: 'nominal' });
  spalten.zwei = spalteVon('zwei', { niveau: 'nominal' });
  spalten.lernzeit = spalteVon('lernzeit');
});

describe('Gruppen-Spalten erkennen (Text, nominal, Wertebeschriftungen; 2 bis 12 Stufen)', () => {
  it('Studiengang mit Beschriftungen ist ein Faktor mit Vergleichsgruppe Lehramt und zwei Hilfsspalten', () => {
    const f = faktor('studiengang')!;
    expect(f.stufen.map(s => s.name)).toEqual(['Lehramt', 'Sozialpaed', 'Psychologie']);
    expect(f.hilfs).toEqual(['studiengang_2', 'studiengang_3']);
    expect(f.labels).toEqual(['Studiengang: Sozialpaed (gegen Lehramt)', 'Studiengang: Psychologie (gegen Lehramt)']);
    expect(faktor('lernzeit')).toBeNull();
  });
  it('Text: alphabetisch, erste Stufe ist die Vergleichsgruppe (wie R factor)', () => {
    expect(faktor('sg_text')!.stufen.map(s => s.wert)).toEqual(['Lehramt', 'Psychologie', 'Sozialpaed']);
  });
  it('Grenzen: ordinal bleibt Zahl, über 12 Stufen Hinweis statt Faktor', () => {
    const ord = spalteVon('studiengang', { niveau: 'ordinal', werteLabels: STUDIENGANG });
    expect(regAlsFaktor(ord, 3)).toBe(false); expect(ordinalAlsZahl(ord)).toBe(true);
    const nom = spalteVon('lernzeit', { niveau: 'nominal' });
    expect(regAlsFaktor(nom, 13)).toBe(false); expect(zuVieleStufen(nom, 13)).toBe(true);
    expect(regAlsFaktor(nom, 12)).toBe(true);
  });
});

describe('Lineare Regression mit Gruppen-Spalte gegen R', () => {
  const lauf = (praed: string[]) => { const t = regTerme(praed, faktor), befehl = regressionBefehl('punkte', t); return { befehl, r: vorhersage(e.run(befehl), 'punkte', t) }; };
  const gleichR = (r: ReturnType<typeof vorhersage>, soll: Lin | { r2: number; koef: Koef[] }) => {
    nah(r.r2, soll.r2);
    expect(r.praediktoren.length).toBe(soll.koef.length - 1);
    r.praediktoren.forEach((x, i) => { const k = soll.koef[i + 1]!; nah(x.b, k.b); nah(x.lo, k.lo); nah(x.hi, k.hi); nah(x.p, k.p, 1e-4); });
  };
  it('Zahlen-Code als Faktor: R² = ,60, B wie lm(punkte ~ factor(sg) + lern), Gesamttest wie anova(ohne, mit)', () => {
    const { befehl, r } = lauf(['studiengang', 'lernzeit']);
    expect(befehl).toContain('RECODE studiengang (2=1) (1 3=0) INTO studiengang_2.');
    expect(befehl).toContain('SELECT IF NOT SYSMIS(studiengang_2).');
    expect(komma(r.r2)).toBe('0,60');
    gleichR(r, R.zahl_mit_lern);
    expect(r.praediktoren.map(x => x.name)).toEqual(['Studiengang: Sozialpaed (gegen Lehramt)', 'Studiengang: Psychologie (gegen Lehramt)', 'lernzeit']);
    const f = r.faktoren![0]!;
    expect([f.spalte, f.referenz, f.df1, f.df2]).toEqual(['studiengang', 'Lehramt', R.zahl_mit_lern.df1Faktor, R.zahl_mit_lern.df2Faktor]);
    nah(f.f, R.zahl_mit_lern.fFaktor); nah(f.dr2, R.zahl_mit_lern.dr2); nah(f.p, R.zahl_mit_lern.pFaktor, 1e-4);
    expect(R.als_zahl.r2).toBeLessThan(0.3);   // so falsch war es vorher (Abschlusstest: R² = ,29)
  });
  it('Text-Spalte als Faktor wie factor(sg_text)', () => {
    const { r } = lauf(['lernzeit', 'sg_text']);
    nah(r.r2, R.text_mit_lern.r2);
    const sg = r.praediktoren.filter(x => x.faktor), soll = R.text_mit_lern.koef.filter(k => k.name.startsWith('factor'));
    sg.forEach((x, i) => { nah(x.b, soll[i]!.b); nah(x.lo, soll[i]!.lo); });
    nah(r.faktoren![0]!.f, R.text_mit_lern.fFaktor);
  });
  it('Gruppen-Spalte allein: Gesamttest = Modelltest', () => {
    const { befehl, r } = lauf(['studiengang']);
    expect(befehl).not.toContain('SELECT IF');
    gleichR(r, R.nur_faktor);
    nah(r.faktoren![0]!.f, R.nur_faktor.f); nah(r.faktoren![0]!.p, R.nur_faktor.p, 1e-4);
  });
  it('zwei Stufen (Text): eine Hilfsspalte, Gesamttest = t² der Hilfsspalte = anova(ohne, mit)', () => {
    const { befehl, r } = lauf(['zwei', 'lernzeit']);
    expect(befehl).toContain("RECODE zwei ('nein'=1) ('ja'=0) INTO zwei_2.");
    gleichR(r, R.zwei_mit_lern);
    nah(r.faktoren![0]!.f, R.zwei_mit_lern.fFaktor, 1e-5); nah(r.faktoren![0]!.dr2, R.zwei_mit_lern.dr2, 1e-5);
  });
  it('Frageart „Lässt sich etwas vorhersagen?“ rechnet die Gruppen-Spalte als Faktor (vorher als Zahl: R² = ,29)', () => {
    const v = VERFAHREN.find(x => x.id === 'vorhersage')!;
    const ctx: Ctx = { verschieden: n => new Set(werteVon(n)).size, gueltig: n => werteVon(n).length, istZahl: n => spalten[n]?.art === 'zahl', faktor };
    const r = vorhersage(e.run(v.syntax({ l1: ['punkte'], l2: ['studiengang', 'lernzeit'], l3: [], l4: [] }, ctx)), 'punkte', regTerme(['studiengang', 'lernzeit'], faktor));
    expect(komma(r.r2)).toBe('0,60');
    expect(v.warum({ l1: ['punkte'], l2: ['studiengang', 'lernzeit'], l3: [], l4: [] }, ctx)).toContain('„Studiengang“ ist eine Gruppen-Spalte: Sie geht nicht als Zahl ein, sondern als 2 Vergleiche mit der ersten Gruppe „Lehramt“ (Dummy-Kodierung).');
    // Text-Spalte mit Gruppen ist jetzt als Prädiktor wählbar; Mediation und Moderation bieten Gruppen-Spalten mit drei Stufen nicht an
    expect(v.luecken[1]!.passt(spalten.sg_text!, ctx)).toBe(true);
    for (const id of ['mediation', 'moderation']) expect(VERFAHREN.find(x => x.id === id)!.luecken[0]!.passt(spalten.studiengang!, ctx)).toBe(false);
  });
});

describe('Sätze mit Gruppen-Spalte (gegenüber der Vergleichsgruppe, kein β-Rang)', () => {
  const name = (n: string) => (n === 'studiengang' ? 'Studiengang' : n);
  it('mehrere Prädiktoren: Gesamttest, Unterschiede in Punkten, β nur für Zahlen-Spalten, APA mit ΔR²', () => {
    const t = regTerme(['studiengang', 'lernzeit'], faktor), st = saetzeVorhersage(vorhersage(e.run(regressionBefehl('punkte', t)), 'punkte', t), name);
    expect(st.haupt.replace(/\u202f|\u00a0/g, ' ')).toBe('„Studiengang“ und „lernzeit“ erklären zusammen 60 % der Unterschiede bei „punkte“.');
    expect(st.zusatz).toContain('„Studiengang“ trägt als Ganzes deutlich bei (ΔR² = ,37, F(2, 86) = 39,76, p < ,001).');
    expect(st.zusatz).toContain('Gegenüber „Lehramt“ hatten bei „punkte“ im Schnitt „Sozialpaed“ 7,69 mehr (95 %-KI [4,85; 10,54]) und „Psychologie“ 4,81 weniger (95 %-KI [1,95; 7,66]), bei gleichen übrigen Angaben.');
    expect(st.zusatz).toMatch(/Einen eigenen Beitrag leistet „lernzeit“ \(β = ,48/);
    expect(st.zusatz).not.toMatch(/Studiengang[^.]*β =|je Einheit|1 mehr/);
    expect(st.vorsicht).toContain('keine Rangfolge');
    // KI wie R effectsize::F_to_eta2(43,11, 3, 86, alternative = "two.sided"): [,47; ,69]
    expect(st.apa).toBe('R² = ,60, 95 %-KI [,47; ,69], F(3, 86) = 43,11, p < ,001; Studiengang: ΔR² = ,37, F(2, 86) = 39,76, p < ,001');
    expect(st.marken.map(m => m.text)).toContain('Studiengang: Vergleichsgruppe „Lehramt“');
  });
  it('nur die Gruppen-Spalte mit zwei Stufen: Satz „mehr als“ die Vergleichsgruppe', () => {
    const t = regTerme(['zwei'], faktor), st = saetzeVorhersage(vorhersage(e.run(regressionBefehl('punkte', t)), 'punkte', t), name);
    expect(st.haupt).toMatch(/^„nein“ \(zwei\) hatte bei „punkte“ im Schnitt \d+,\d\d (mehr|weniger) als „ja“\.$/);
  });
});

describe('Logistische Regression mit Gruppen-Spalte gegen R', () => {
  it('Odds Ratios wie glm(hoch ~ factor(sg) + lern), Gesamttest als Likelihood-Quotienten-Test', () => {
    const sp: Spalte = spalteVon('hoch', { niveau: 'nominal' });
    const k = logistikKodierung(sp, werteVon('hoch'), false, tab.kopf)!, t = regTerme(['studiengang', 'lernzeit'], faktor);
    const befehl = logistikBefehl(['studiengang', 'lernzeit'], k, t), r = logistik(e.run(befehl), 'hoch', k, t);
    expect(befehl).toContain('LOGISTIC REGRESSION hoch_EV WITH studiengang_2 studiengang_3 lernzeit');
    expect(befehl).toContain('LOGISTIC REGRESSION hoch_EV WITH lernzeit');
    r.praediktoren.forEach((x, i) => { const s = R.logistisch.koef[i + 1]!; nah(x.b, s.b, 1e-4); nah(x.or, s.or, 1e-4); nah(x.orLo, s.orLo, 1e-4); nah(x.orHi, s.orHi, 1e-4); });
    nah(r.minus2ll, R.logistisch.minus2ll, 1e-4);
    const f = r.faktoren![0]!;
    expect([f.art, f.df]).toEqual(['lr', 2]);
    nah(f.chi2, R.logistisch.chi2Faktor, 1e-3); nah(f.p, R.logistisch.pFaktor, 1e-3);
    const st = saetzeLogistik(r, n => (n === 'studiengang' ? 'Studiengang' : n));
    expect(st.haupt).toMatch(/^Mit Studiengang und lernzeit lässt sich hoch vorhersagen/);
    expect(st.zusatz).toContain(`„Studiengang“ trägt als Ganzes deutlich bei (Likelihood-Quotienten-Test χ²(2) = ${komma(R.logistisch.chi2Faktor)}, p < ,001).`);
    expect(st.zusatz).toContain('Odds Ratio gegenüber „Lehramt“ (Studiengang): „Sozialpaed“');
  });
});
