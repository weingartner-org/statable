import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { alsZahl, leseCsv, planeSpalten, zurEngine, type Tabelle } from './einlesen';
import { komma, logistik, logistikWerte, saetzeLogistik } from './ergebnis';
import { finde, spalte } from './tabelle';
import { logistikBefehl, logistikKodierung } from './verfahren';
import type { Spalte } from './verzeichnis';
import { nodeEngine } from './testengine';
import { chiQuadratP } from './verteilung';
import { berichtSatz } from './berichtsatz';
import { s as sitzung, type Blatt } from './sitzung.svelte';

/* Vergleichswerte aus R 4.x (Skript: scripts/logistik-erwartet.R): glm(family = binomial); OR = exp(coef), KI = exp(confint.default) = Wald (das gibt auch PSPP aus).
 * Zielspalte handy_im_bett: PSPP modelliert „nein“ (alphabetisch später) gegen „ja“. PSPP bricht bei Änderungen der Schätzung unter 0,001 ab (Hinweis in der Ausgabe),
 * liegt aber auf 5 Stellen bei R. Der Modelltest fehlt in PSPP und wird hier aus −2LL und den Gruppengrößen gebildet. */
let e: Awaited<ReturnType<typeof nodeEngine>>, schlaf: Tabelle;
beforeAll(async () => {
  e = await nodeEngine();
  schlaf = leseCsv(readFileSync(new URL('./testdaten/schlaf-und-konzentration.csv', import.meta.url), 'utf8'));
  const b = zurEngine(schlaf);
  e.run(b.syntax, { '/import.csv': b.csv });
});
const r5 = (v: number) => Number(v.toFixed(5));

/** Wie das Blatt: Kodierung nach der festen Regel (oder umgekehrt), Befehl mit Hilfsspalte, PSPP rechnet, Ergebnis lesen. */
type Lauf = { k: NonNullable<ReturnType<typeof logistikKodierung>>; befehl: string; items: ReturnType<Awaited<ReturnType<typeof nodeEngine>>['run']>; r: ReturnType<typeof logistik> };
function lauf(eng: Awaited<ReturnType<typeof nodeEngine>>, tab: Tabelle, ziel: string, praed: string[], o: { umgekehrt?: boolean; labels?: Record<string, string> } = {}): Lauf {
  const plan = planeSpalten(tab).find(p => p.name === ziel)!, i = tab.kopf.indexOf(ziel);
  const werte = tab.zeilen.map(z => z[i]).filter(v => v !== null && v !== '').map(v => (plan.art === 'zahl' ? alsZahl(v!, plan.punkt)! : String(v)));
  const sp: Spalte = { name: ziel, bezeichnung: 'Bezeichnung von ' + ziel, art: plan.art, niveau: 'nominal', format: '', fehlend: [], fehlendText: '', werteLabels: o.labels ?? {} };
  const k = logistikKodierung(sp, werte, !!o.umgekehrt, tab.kopf)!;
  const befehl = logistikBefehl(praed, k), items = eng.run(befehl);
  return { k, befehl, items, r: logistik(items, ziel, k) };
}
/** B und Exp(B) so, wie sie in der Tabelle „Variables in the Equation“ auf dem Blatt stehen (PSPP-Ausgabe, nicht das Ergebnisobjekt). */
function tabelleBOr(items: Lauf['items']): Record<string, { b: number; or: number }> {
  const gl = finde(items, /^Variables in the Equation/)!, b = spalte(gl, /^B$/), or = spalte(gl, /^Exp\(B\)$/), aus: Record<string, { b: number; or: number }> = {};
  for (let i = gl.tabelle.headRows[0]; i < gl.t.length; i++) { const n = gl.t[i]![1] || gl.t[i]![0]!; if (n && n !== 'Constant' && gl.n[i]![b] !== undefined) aus[n] = { b: gl.n[i]![b]!, or: gl.n[i]![or]! }; }
  return aus;
}

describe('Binäre logistische Regression gegen R', () => {
  it('mehrere Prädiktoren: B, OR, Wald-KI, p, Modelltest, Nagelkerke, Trefferquote', () => {
    const r = lauf(e, schlaf, 'handy_im_bett', ['alter', 'konzentration', 'kaffee_tassen']).r;
    expect([r.ereignis, r.referenz, r.n, r.nEreignis, r.nReferenz]).toEqual(['nein', 'ja', 120, 43, 77]);
    expect(r.praediktoren.map(x => x.name)).toEqual(['alter', 'konzentration', 'kaffee_tassen']);
    expect(r.praediktoren.map(x => r5(x.b))).toEqual([0.10234, 0.0461, -0.19812]);
    expect(r.praediktoren.map(x => r5(x.p))).toEqual([0.28405, 0.01023, 0.27153]);
    expect(r.praediktoren.map(x => r5(x.or))).toEqual([1.10776, 1.04718, 0.82027]);
    expect(r.praediktoren.map(x => [r5(x.orLo), r5(x.orHi)])).toEqual([[0.91861, 1.33585], [1.01097, 1.08468], [0.57621, 1.1677]]);
    expect([r5(r.minus2ll), r5(r.chi2), r.df, r5(r.p)]).toEqual([145.34518, 11.2436, 3, 0.01048]);
    expect([ohne(r.nagelkerke), ohne(r.coxSnell), r5(r.treffer)]).toEqual([0.12, 0.09, 0.66667]);
  });
  it('einfach: Satz mit Odds Ratio und KI, APA', () => {
    const r = lauf(e, schlaf, 'handy_im_bett', ['konzentration']).r;
    expect([r5(r.praediktoren[0]!.or), r5(r.praediktoren[0]!.orLo), r5(r.praediktoren[0]!.orHi)]).toEqual([1.05125, 1.01511, 1.08869]);
    const s = saetzeLogistik(r, n => n);
    expect(s.haupt).toBe('Mit jeder Einheit mehr bei „konzentration“ steigt bei „handy_im_bett“ die Chance (Odds) für „nein“ gegenüber „ja“ um den Faktor 1,05: Odds Ratio = 1,05, 95 %-KI [1,02; 1,09].');
    expect(s.apa).toMatch(/^χ²\(1\) = \d+,\d\d, p [=<] ,\d+, Nagelkerke R² = ,\d\d; OR = 1,05, 95 %-KI \[1,02; 1,09\]$/);
    expect(s.marken.map(m => m.text)).toContain('Odds Ratio = 1,05');
  });
  it('mehrere: Sätze nennen Modelltest, eigenen Beitrag und Trefferquote', () => {
    const r = lauf(e, schlaf, 'handy_im_bett', ['alter', 'konzentration', 'kaffee_tassen']).r;
    const s = saetzeLogistik(r, n => n, (_, w) => (w === 'nein' ? 'nein' : 'ja'));
    expect(s.zusatz).toContain('χ²(3) = 11,24, p = ,010');
    expect(s.zusatz).toContain('Einen eigenen Beitrag leistet „konzentration“ (Odds Ratio = 1,05, 95 %-KI [1,01; 1,08])');
    expect(s.zusatz).toContain('Richtig zugeordnet wurden 67 % der Personen; ohne Vorhersage läge die Trefferquote bei 64 %');
    expect(s.apa).toMatch(/^χ²\(3\) = 11,24, p = ,010, Nagelkerke R² = ,12; alter: OR = /);
    expect(s.apa).toContain('konzentration: OR = 1,05, 95 %-KI [1,01; 1,08]');
  });
  it('Nagelkerke ohne Cohens R²-Grenzen (Abschlusstest F6): Zahl mit Hinweis Pseudo-R², keine Wortstufe', () => {
    const r = lauf(e, schlaf, 'handy_im_bett', ['alter', 'konzentration', 'kaffee_tassen']).r;
    for (const n of [0.12, 0.3]) {
      const s = saetzeLogistik({ ...r, nagelkerke: n }, x => x);
      const alles = [s.haupt, s.zusatz, ...s.marken.map(m => m.text)].join(' ');
      expect(alles).not.toMatch(/(klein|mittler|groß)en Anteil|Faustregel|Vorhersage: /);
      expect(s.zusatz).toContain(`Nagelkerkes R² = ${n === 0.3 ? ',30' : ',12'} ist ein Pseudo-R²: nicht wie das R² der linearen Regression als erklärter Anteil zu lesen.`);
      expect(s.marken[0]!.text).toBe(`Nagelkerkes R² = ${n === 0.3 ? ',30' : ',12'} (Pseudo-R²)`);
    }
  });
  it('Modell trägt nicht (Prüfung A13): Überschrift behauptet keine Vorhersage, Wald-Treffer nur mit Vorsicht', () => {
    const r = lauf(e, schlaf, 'handy_im_bett', ['alter', 'konzentration', 'kaffee_tassen']).r;
    const s = saetzeLogistik({ ...r, p: 0.064 }, n => n);
    expect(s.haupt).toContain('nicht deutlich vorhersagen');
    expect(s.zusatz).toContain('kein Beleg');
    expect(s.zusatz).not.toContain('Einen eigenen Beitrag');
  });
  it('Zahlenziel mit Werten 1 und 2 und Ziel 0/1 laufen ebenso', () => {
    e.run('COMPUTE z12 = (handy_im_bett = \'ja\') + 1.\nEXECUTE.');
    const i = schlaf.kopf.indexOf('handy_im_bett');
    const z12 = { ...schlaf, kopf: [...schlaf.kopf, 'z12'], zeilen: schlaf.zeilen.map(z => [...z, z[i] === 'ja' ? 2 : 1]) };
    const r = lauf(e, z12, 'z12', ['konzentration']).r;
    expect([r.ereignis, r.referenz]).toEqual(['2', '1']);   // 2 = „ja“: die Gegenrichtung, OR = 1 / 1,05
    expect(r5(r.praediktoren[0]!.or)).toBe(r5(1 / 1.051254277));
  });
});

/* Die Hilfsspalte (Ereignis = 1, Vergleichswert = 0): PSPP rechnet direkt mit dem gewünschten Ereignis. Tabellen auf dem Blatt, Satz, Export und R sagen dasselbe. */
describe('Ereignis als Hilfsspalte: Tabelle, Satz und R stimmen überein', () => {
  const text = readFileSync(new URL('./testdaten/logistik-text.csv', import.meta.url), 'utf8').trim().split('\n');
  /** vor: „bestanden“ steht zuerst; rueck: „nicht bestanden“ (PSPP kodiert Text sonst nach erstem Auftreten). */
  const tabText = (reihenfolge: 'vor' | 'rueck'): Tabelle => leseCsv([text[0]!, ...text.slice(1).sort((a, c) => (reihenfolge === 'vor' ? 1 : -1) * (a < c ? -1 : 1))].join('\n'));
  const mit = async (tab: Tabelle, ziel: string, praed: string[], o?: { umgekehrt?: boolean; labels?: Record<string, string> }) => { const eng = await nodeEngine(); const b = zurEngine(tab); eng.run(b.syntax, { '/import.csv': b.csv }); return { eng, ...lauf(eng, tab, ziel, praed, o) }; };
  // Stufenbeispiel „Lernzeit“: Die Chance auf „bestanden“ steigt mit der Lernzeit; „nicht bestanden“ ist die alphabetisch zweite Antwort und damit das Ereignis (OR < 1).
  const lernzeit = (reihenfolge: 'vor' | 'rueck'): Tabelle => {
    let z = 12345; const zufall = () => (z = (z * 1103515245 + 12345) % 2147483648) / 2147483648;
    const zeilen = Array.from({ length: 120 }, (_, i) => { const t = i % 21; return [t, zufall() < 1 / (1 + Math.exp(-(t - 10) * 0.25)) ? 'bestanden' : 'nicht bestanden'] as [number, string]; });
    zeilen.sort((a, c) => (reihenfolge === 'vor' ? 1 : -1) * (a[1] < c[1] ? -1 : a[1] > c[1] ? 1 : 0));
    return leseCsv(['lernzeit,ergebnis', ...zeilen.map(r => r.join(','))].join('\n'));
  };
  const bR = [0.037007, -0.066637], orR = [1.0377, 0.935535], loR = [0.980116, 0.843181], hiR = [1.098668, 1.038004];
  const nah = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(2e-5);
  const gleichR = (r: Lauf['r']) => {
    expect([r.ereignis, r.referenz, r.nEreignis, r.nReferenz]).toEqual(['nicht bestanden', 'bestanden', 17, 73]);
    r.praediktoren.forEach((x, i) => { nah(x.b, bR[i]!); nah(x.or, orR[i]!); nah(x.orLo, loR[i]!); nah(x.orHi, hiR[i]!); });
  };
  it('die Regel: Zahlen der größere Wert, Text die alphabetisch zweite Antwort', () => {
    expect(logistikWerte([0, 1, 1, 0], true)).toEqual({ ereignis: '1', referenz: '0' }); expect(logistikWerte([2, 1, 2], true)).toEqual({ ereignis: '2', referenz: '1' });
    expect(logistikWerte(['bestanden', 'nicht bestanden', 'bestanden'], false)).toEqual({ ereignis: 'nicht bestanden', referenz: 'bestanden' });
    expect(logistikWerte(['ja', 'nein'], false)).toEqual({ ereignis: 'nein', referenz: 'ja' }); expect(logistikWerte([1, 2, 3], true)).toBeUndefined();
  });
  it('Text-Ziel: Exp(B) in der Tabelle = Odds Ratio im Satz, in beiden Zeilenreihenfolgen', async () => {
    for (const reihenfolge of ['vor', 'rueck'] as const) {
      const l = await mit(tabText(reihenfolge), 'ergebnis', ['x1']), t = tabelleBOr(l.items).x1!;
      expect(l.r.ereignis).toBe('nicht bestanden');
      expect(t.or).toBeCloseTo(l.r.praediktoren[0]!.or, 12);
      expect(Math.exp(t.b)).toBeCloseTo(t.or, 10);   // B und Exp(B) der PSPP-Tabelle gehören zur selben Richtung
      const satz = saetzeLogistik(l.r, n => n);
      expect(satz.haupt).toContain(`Odds Ratio = ${komma(t.or)},`);
      expect(satz.haupt).toContain(t.or >= 1 ? 'steigt' : 'sinkt');
    }
  });
  it('Lernzeit/Ergebnis (Ereignis „nicht bestanden“): Tabelle B < 0 und Exp(B) < 1, Satz sagt „sinkt“ - in beiden Zeilenreihenfolgen', async () => {
    const aus = [];
    for (const reihenfolge of ['vor', 'rueck'] as const) {
      const l = await mit(lernzeit(reihenfolge), 'ergebnis', ['lernzeit']), t = tabelleBOr(l.items).lernzeit!;
      expect(t.b).toBeLessThan(0); expect(t.or).toBeLessThan(1);
      expect(t.or).toBeCloseTo(l.r.praediktoren[0]!.or, 12);
      const satz = saetzeLogistik(l.r, n => n);
      expect(satz.haupt).toContain('sinkt'); expect(satz.haupt).toContain(`Odds Ratio = ${komma(t.or)},`);
      expect(satz.haupt).toContain(`95 %-KI [${komma(l.r.praediktoren[0]!.orLo)}; ${komma(l.r.praediktoren[0]!.orHi)}]`);
      aus.push(t.or);
    }
    expect(aus[0]).toBeCloseTo(aus[1]!, 10);
  });
  it('0/1-Ziel: Exp(B) in der Tabelle = Odds Ratio im Satz; Ereignis ist 1, die Werte-Beschriftungen stehen in der Kodierungstabelle', async () => {
    const t01 = leseCsv(['gewonnen,punkte', ...Array.from({ length: 60 }, (_, i) => `${(i * 7 + (i % 3 === 0 ? 1 : 0)) % 10 < 4 + (i % 5) ? 1 : 0},${(i * 7) % 10 + (i % 4)}`)].join('\n'));
    const l = await mit(t01, 'gewonnen', ['punkte'], { labels: { '0': 'verloren', '1': 'gewonnen' } });
    expect([l.r.ereignis, l.r.referenz]).toEqual(['1', '0']);
    const t = tabelleBOr(l.items).punkte!;
    expect(t.or).toBeCloseTo(l.r.praediktoren[0]!.or, 12);
    expect(saetzeLogistik(l.r, n => n, (_, w) => (w === '1' ? 'gewonnen' : 'verloren')).haupt).toContain(`Odds Ratio = ${komma(t.or)},`);
    const kod = finde(l.items, /^Dependent Variable Encoding$/)!;
    expect(kod.t.map((z, i) => [z[0], kod.n[i]![1]]).filter(z => z[1] !== undefined)).toEqual([['verloren', 0], ['gewonnen', 1]]);
  });
  it('Zeilen vorwärts und rückwärts: dieselben Zahlen, gleich R glm (factor mit levels = Vergleichswert, Ereignis)', async () => {
    const v = await mit(tabText('vor'), 'ergebnis', ['x1', 'x2']), r = await mit(tabText('rueck'), 'ergebnis', ['x1', 'x2']);
    gleichR(v.r); gleichR(r.r);
    v.r.praediktoren.forEach((x, i) => nah(x.or, r.r.praediktoren[i]!.or));
    // Tabelle auf dem Blatt (PSPP) = R
    Object.values(tabelleBOr(v.items)).forEach((x, i) => { nah(x.b, bR[i]!); nah(x.or, orR[i]!); });
  });
  it('Ereignis umkehren: Tabelle UND Satz zeigen den Kehrwert, B das andere Vorzeichen (PSPP rechnet neu)', async () => {
    const f = await mit(tabText('vor'), 'ergebnis', ['x1', 'x2']), u = await mit(tabText('vor'), 'ergebnis', ['x1', 'x2'], { umgekehrt: true });
    expect([u.r.ereignis, u.r.referenz, u.r.nEreignis, u.r.nReferenz, u.r.umgekehrt]).toEqual(['bestanden', 'nicht bestanden', 73, 17, true]);
    const tf = tabelleBOr(f.items), tu = tabelleBOr(u.items);
    for (const n of ['x1', 'x2']) {
      expect(tu[n]!.or).toBeCloseTo(1 / tf[n]!.or, 3); expect(tu[n]!.b).toBeCloseTo(-tf[n]!.b, 3);
      expect(tu[n]!.or).toBeCloseTo(u.r.praediktoren[n === 'x1' ? 0 : 1]!.or, 12);   // Satz und Tabelle: dieselbe Zahl
    }
    const soll = [{ b: -0.037007, or: 0.96367, lo: 0.910193, hi: 1.020288 }, { b: 0.066637, or: 1.068908, lo: 0.963387, hi: 1.185985 }];
    u.r.praediktoren.forEach((x, i) => { nah(x.b, soll[i]!.b); nah(x.or, soll[i]!.or); nah(x.orLo, soll[i]!.lo); nah(x.orHi, soll[i]!.hi); });
    nah(u.r.p, f.r.p); nah(u.r.nagelkerke, f.r.nagelkerke); nah(u.r.treffer, f.r.treffer);
    const satz = saetzeLogistik(u.r, n => n);
    expect(satz.apa).toContain(`x1: OR = ${komma(tu.x1!.or)}`); expect(satz.zusatz).toContain('Ereignis: „bestanden“ (gegen „nicht bestanden“), umgekehrt gewählt. ');
    const kod = finde(u.items, /^Dependent Variable Encoding$/)!;
    expect(kod.t.map((z, i) => [z[0], kod.n[i]![1]]).filter(z => z[1] !== undefined)).toEqual([['nicht bestanden', 0], ['bestanden', 1]]);
  });
  it('der Befehl ist lauffähig, ändert die Daten nicht und lässt sich wiederholen (TEMPORARY)', async () => {
    const l = await mit(tabText('vor'), 'ergebnis', ['x1', 'x2']);
    expect(l.befehl).toMatch(/^TEMPORARY\.\nRECODE ergebnis \('nicht bestanden'=1\) \('bestanden'=0\) \(ELSE=SYSMIS\) INTO ergebnis_EV\./);
    expect(l.befehl).toContain("VARIABLE LABELS ergebnis_EV 'Bezeichnung von ergebnis'.");
    expect(l.befehl).toContain("VALUE LABELS ergebnis_EV 1 'nicht bestanden' 0 'bestanden'.");
    const noch = l.eng.run(l.befehl);   // zweiter Lauf: kein „Variable gibt es schon“
    expect(noch.filter(i => i.type === 'message' && i.severity === 'error')).toEqual([]);
    const ds = finde(l.eng.run('DISPLAY DICTIONARY.'), /^Variables$/)!;
    expect(ds.t.map(z => z[0] ?? '').filter(n => /EV\d*$/i.test(n))).toEqual([]);
    expect(ds.t.map(z => z[0])).toEqual(expect.arrayContaining(['ergebnis', 'x1', 'x2']));
  });
  it('Hilfsspalte heißt anders als jede vorhandene Spalte', () => {
    const sp: Spalte = { name: 'ergebnis', bezeichnung: '', art: 'text', niveau: 'nominal', format: '', fehlend: [], fehlendText: '', werteLabels: {} };
    expect(logistikKodierung(sp, ['a', 'b'], false, ['ergebnis'])!.hilfsname).toBe('ergebnis_EV');
    const k = logistikKodierung(sp, ['a', 'b'], false, ['ergebnis', 'Ergebnis_ev'])!;
    expect(k.hilfsname).not.toBe('ergebnis_EV'); expect(k.hilfsname.toUpperCase()).not.toBe('ERGEBNIS_EV');
    expect(logistikKodierung(sp, ['a', 'b', 'c'], false, [])).toBeNull();
  });
  it('Satz nennt das Ereignis; Wertelabels erscheinen statt der Codes (B11)', async () => {
    const r = (await mit(tabText('vor'), 'ergebnis', ['x1', 'x2'])).r;
    expect(saetzeLogistik(r, n => n).zusatz).toContain('Ereignis: „nicht bestanden“ (gegen „bestanden“). ');
    const num = { ...r, ereignis: '1', referenz: '0' };
    const wert = (_: string, w: string) => (w === '1' ? 'ja' : 'nein');
    const st = saetzeLogistik(num, n => n, wert);
    expect(st.haupt).toContain('(„ja“ gegenüber „nein“;'); expect(st.zusatz).toContain('Ereignis: „ja“ (gegen „nein“)');
  });
});

describe('χ²-Verteilung (Obere Fläche) wie R pchisq(lower.tail = FALSE)', () => {
  it('Werte', () => {
    // R: pchisq(11.243597, 3, lower.tail = FALSE) = 0.01047901; pchisq(3.841459, 1, lower.tail=FALSE) = 0.05; pchisq(0.5, 4, lower.tail=FALSE) = 0.9735
    expect(chiQuadratP(11.243597, 3)).toBeCloseTo(0.01047901, 7);
    expect(chiQuadratP(3.841459, 1)).toBeCloseTo(0.05, 6);
    expect(chiQuadratP(0.5, 4)).toBeCloseTo(0.9735, 4);
    expect(chiQuadratP(0, 2)).toBe(1);
  });
});
const ohne = (v: number) => Number(v.toFixed(2));

/* Abschlusstest N1: Der Bericht (Vorschau, Word, PDF, Excel - alle über berichtSatz) nennt das Ereignis wie das Blatt und folgt dem Umkehren. */
describe('Bericht nennt das Ereignis der Logistik (N1)', () => {
  const blatt = (r: ReturnType<typeof logistik>): Blatt => ({ id: 'l', titel: 't', art: 'logistik', l1: null, l2: null, syntax: '', items: [], ergebnis: { typ: 'logistik', e: r }, imBericht: true, notiz: '', zeit: 0 } as unknown as Blatt);
  it('Einfach und mehrere, de und en, vor und nach „Ereignis umkehren“', () => {
    const vor = lauf(e, schlaf, 'handy_im_bett', ['konzentration', 'alter']).r, um = lauf(e, schlaf, 'handy_im_bett', ['konzentration', 'alter'], { umgekehrt: true }).r;
    const ein = lauf(e, schlaf, 'handy_im_bett', ['konzentration']).r, einUm = lauf(e, schlaf, 'handy_im_bett', ['konzentration'], { umgekehrt: true }).r;
    sitzung.einst.sprache = 'de';
    expect(berichtSatz(blatt(vor))).toContain('Ereignis: „nein“ (gegen „ja“). Statistik:');
    expect(berichtSatz(blatt(um))).toContain('Ereignis: „ja“ (gegen „nein“), umgekehrt gewählt. Statistik:');
    expect(berichtSatz(blatt(ein))).toContain('Ereignis: „nein“ (gegen „ja“). Statistik:');
    expect(berichtSatz(blatt(einUm))).toContain('Ereignis: „ja“ (gegen „nein“), umgekehrt gewählt. Statistik:');
    sitzung.einst.sprache = 'en';
    expect(berichtSatz(blatt(um))).toContain('Event: "ja" (versus "nein"), reversed. Statistics:');
    sitzung.einst.sprache = 'de';
  });
});
