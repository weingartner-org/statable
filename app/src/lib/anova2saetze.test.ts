import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { leseCsv, planeSpalten, alsZahl, zurEngine } from './einlesen';
import { regFaktor, type RegFaktor } from './regfaktor';
import type { Spalte } from './verzeichnis';
import { nodeEngine } from './testengine';
import { finde, spalte } from './tabelle';
import { anova2, anova2Lauf, kovarianz, kovarianzBefehl, type Anova2 } from './anova2';
import { saetzeAnova2, saetzeAncova, tabellenAnova2, tabellenAncova, type Anova2E, type AncovaE } from './anova2saetze';
import erwartet from './testdaten/anova2-ancova-erwartet.json';

/* Eigene Tests zu Paket A (G3, G6): Text-Gruppen über anova2Lauf, Levene gegen PSPP ONEWAY, Kernsätze und Tabellen.
 * Die Sollwerte der Zahlen stehen in anova2.test.ts; hier geht es um die Wege, die dort nicht vorkommen (Kodierung von Text im Lauf) und um die Sätze. */
interface G3 { name: string; a_stufen: string[]; b_stufen: string[]; daten: { a: string[]; b: string[]; y: (number | null)[] }; typ3?: { 'a:b': { F: number; p: number } } }
interface G6 { name: string; g_stufen: string[]; daten: { g: string[]; x: (number | null)[]; y: (number | null)[] } }
const J = erwartet as unknown as { g3: G3[]; g6: G6[] };
const f3 = (n: string) => J.g3.find(x => x.name === n)!;
const f6 = (n: string) => J.g6.find(x => x.name === n)!;

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });
afterEach(() => { s.einst.sprache = 'de'; });
const id = (x: string) => x;

/** Fall mit Text-Gruppen laden und über anova2Lauf rechnen (Text wird für PSPP kodiert). */
function lauf3Text(f: G3) {
  const csv = 'a,b,y\n' + f.daten.a.map((a, i) => `${a},${f.daten.b[i]},${f.daten.y[i] ?? ''}`).join('\n') + '\n';
  const tab = leseCsv(csv), b = zurEngine(tab);
  e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv });
  const syn = anova2Lauf('y', { spalte: 'a', text: true, werte: f.a_stufen }, { spalte: 'b', text: true, werte: f.b_stufen }, tab.kopf);
  return { syn, items: e.run(syn), d: { a: f.daten.a, b: f.daten.b, y: f.daten.y, aStufen: f.a_stufen, bStufen: f.b_stufen } };
}
const mit3 = (r: Anova2): Anova2E => ({ ...r, yCol: 'y', aCol: 'a', bCol: 'b' });

describe('G3: Text-Gruppen über anova2Lauf', () => {
  it('der Lauf kodiert Text in Zahlen (TEMPORARY), und das Ergebnis stimmt mit R überein', () => {
    const f = f3('c_wechselwirkung_3x3'), { syn, items, d } = lauf3Text(f);
    expect(syn).toMatch(/TEMPORARY\.\nRECODE a \('a1'=1\) \('a2'=2\) \('a3'=3\) INTO a_F1\.\nRECODE b \('b1'=1\) \('b2'=2\) \('b3'=3\) INTO b_F2\.\nGLM y BY a_F1 b_F2\n  \/DESIGN=a_F1 b_F2 a_F1\*b_F2\.$/);
    expect(items.some(i => i.type === 'message' && i.severity !== 'note')).toBe(false);
    const r = anova2(items, d)!;
    expect(r).not.toBeNull();
    expect(Math.abs(r.ab.f - f.typ3!['a:b'].F)).toBeLessThan(1e-8 * Math.max(1, f.typ3!['a:b'].F));
    expect(r.ab.p).toBeLessThan(0.001);
  });
  it('Zahlen als Faktoren gehen ohne Kodierung durch', () => {
    expect(anova2Lauf('y', { spalte: 'a', text: false, werte: [] }, { spalte: 'b', text: false, werte: [] })).toMatch(/\nGLM y BY a b\n  \/DESIGN=a b a\*b\.$/);
    expect(anova2Lauf('y', { spalte: 'a', text: false, werte: [] }, { spalte: 'b', text: false, werte: [] })).not.toMatch(/TEMPORARY/);
  });
  it('Hilfsspalten bekommen einen Namen, den es noch nicht gibt', () => {
    expect(anova2Lauf('y', { spalte: 'a', text: true, werte: ['x'] }, { spalte: 'b', text: false, werte: [] }, ['a_F1'])).toMatch(/INTO a_F1x\./);
  });
  it('Levene über alle Zellen: dieselben Werte wie PSPP ONEWAY über die Zellen (Abweichung vom Zellmittel)', () => {
    const f = f3('b_unbalanciert_2x3'), { items, d } = lauf3Text(f);
    const r = anova2(items, d)!;
    // PSPP: eine Gruppenspalte mit der Nummer der Zelle
    const csv = 'z,y\n' + f.daten.a.map((a, i) => `${f.a_stufen.indexOf(a) * 10 + f.b_stufen.indexOf(f.daten.b[i]!) + 1},${f.daten.y[i] ?? ''}`).join('\n') + '\n';
    const b = zurEngine(leseCsv(csv));
    e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv });
    const t = finde(e.run('ONEWAY y BY z\n  /STATISTICS=HOMOGENEITY.'), /^Test of Homogeneity of Variances$/)!;
    const z = t.n.findIndex((row, i) => i >= t.tabelle.headRows[0] && row.some(v => v !== undefined)), row = t.n[z]!.filter(v => v !== undefined) as number[];
    expect(row.length).toBeGreaterThanOrEqual(4);
    const [lev, df1, df2, p] = row.slice(-4) as [number, number, number, number];
    expect(spalte(t, /Levene/)).toBeGreaterThanOrEqual(0);
    expect(r.levene!.df1).toBe(df1); expect(r.levene!.df2).toBe(df2);
    expect(Math.abs(r.levene!.f - lev)).toBeLessThan(1e-8 * Math.max(1, lev)); expect(Math.abs(r.levene!.p - p)).toBeLessThan(1e-8);
  });
});

describe('G3: Sätze und Tabellen', () => {
  it('Wechselwirkung signifikant: Wechselwirkung zuerst, Haupteffekte nur mit Vorsicht, einfache Effekte mit Holm', () => {
    const { items, d } = lauf3Text(f3('c_wechselwirkung_3x3')), e3 = mit3(anova2(items, d)!);
    const st = saetzeAnova2(e3, id);
    expect(st.haupt).toMatch(/^Der Unterschied zwischen den Gruppen von „a“ hängt von „b“ ab: Die Wechselwirkung ist signifikant \(F\(4, 63\) = [\d,]+, p < ,001, ηp² = ,\d\d\)\.$/);
    expect(st.zusatz).toContain('Haupteffekte nur mit Vorsicht deuten, wenn die Wechselwirkung bedeutsam ist.');
    expect(st.zusatz).toMatch(/Einfache Effekte von „a“ je Stufe von „b“ \(Holm-Korrektur über die 3 Stufen\): „b1“: signifikant \(F\(2, 63\) = [\d,]+, p \(Holm\) < ,001\)/);
    expect(st.apa).toMatch(/^a × b: F\(4, 63\) = [\d,]+, p < ,001, ηp² = ,\d\d, 95 %-KI \[,\d\d; ,\d\d\]; a: F\(2, 63\)/);
    expect(st.marken.some(m => m.text === 'Einfache Effekte mit Holm-Korrektur')).toBe(true);
    s.einst.sprache = 'en';
    const en = saetzeAnova2(e3, id);
    expect(en.haupt).toMatch(/^The difference between the groups of "a" depends on "b": the interaction is significant \(F\(4, 63\) = [\d.]+, p < \.001, ηp² = \.\d\d\)\.$/);
    expect(en.zusatz).toContain('Interpret main effects only with caution when the interaction is significant.');
    expect(en.zusatz).toContain('Simple effects of "a" at each level of "b" (Holm adjustment over the 3 levels)');
  });
  it('Wechselwirkung nicht signifikant: Haupteffekte je für sich, keine einfachen Effekte, keine Wechselwirkungs-Behauptung', () => {
    const { items, d } = lauf3Text(f3('a_balanciert_2x3')), e3 = mit3(anova2(items, d)!);
    expect(e3.wechselwirkungBedeutsam).toBe(false);
    const st = saetzeAnova2(e3, id);
    expect(st.haupt).toMatch(/^Eine Wechselwirkung von „a“ und „b“ belegen die Daten nicht \(F\(2, 54\)/);
    expect(st.haupt).toContain('Die Haupteffekte lassen sich zunächst je für sich lesen.');
    expect(st.zusatz).not.toContain('Einfache Effekte');
    expect(st.zusatz).toMatch(/Haupteffekt von „a“: .*Haupteffekt von „b“: /);
    expect(tabellenAnova2(e3, id).map(t => t.label)).toEqual(['Tests of Between-Subjects Effects', 'Effect Sizes', 'Cell Means', 'Estimated Marginal Means', 'Pairwise Comparisons']);   // Field-Stufe 2: ω², Randmittel des Faktors mit 3 Stufen
    expect(st.zusatz).toContain('Effektstärke Omega-Quadrat (ω²');
    expect(st.zusatz).toContain('Randmittel sind nur zu deuten, wenn die Wechselwirkung klein ist');
  });
  it('Tabellen: Typ III mit Fehlerzeile, Zellmittel, bei signifikanter Wechselwirkung zwei Tabellen einfacher Effekte', () => {
    const { items, d } = lauf3Text(f3('c_wechselwirkung_3x3')), e3 = mit3(anova2(items, d)!);
    const t = tabellenAnova2(e3, id);
    expect(t.map(x => x.label)).toEqual(['Tests of Between-Subjects Effects', 'Effect Sizes', 'Cell Means', 'Estimated Marginal Means', 'Pairwise Comparisons', 'Estimated Marginal Means', 'Pairwise Comparisons', 'Simple Effects', 'Simple Effects']);
    expect(t[0]!.rows).toBe(5);   // Kopf + a × b, a, b, Fehler
    expect(t[1]!.rows).toBe(4);   // Kopf + a × b, a, b (ω²)
    expect(t[2]!.rows).toBe(10);  // Kopf + 9 Zellen
    expect(t[4]!.rows).toBe(4);   // Kopf + 3 Paare
    expect(t[7]!.rows).toBe(4);
  });
  it('ungleiche Zellen: Hinweis auf Typ III; kleine Zelle (n < 10) als Hinweis-Marke', () => {
    const { items, d } = lauf3Text(f3('b_unbalanciert_2x3')), st = saetzeAnova2(mit3(anova2(items, d)!), id);
    expect(st.vorsicht).toContain('Die Zellen sind unterschiedlich groß (n = 4 bis 12); die Quadratsummen vom Typ III prüfen jeden Effekt an den ungewichteten Mittelwerten der Zellen.');
    expect(st.vorsicht).toContain('Die kleinste Zelle hat nur 4 Personen');
    expect(st.marken.find(m => m.erklaer === 'stichprobe')?.hinweis).toBe(true);
  });
});

/* ---------- G6 ---------- */
function lauf6(f: G6): { r: ReturnType<typeof kovarianz>; faktor: RegFaktor } {
  const csv = 'g,x,y\n' + f.daten.g.map((g, i) => `${g},${f.daten.x[i] ?? ''},${f.daten.y[i] ?? ''}`).join('\n') + '\n';
  const tab = leseCsv(csv), plan = planeSpalten(tab).find(p => p.name === 'g')!;
  const sp: Spalte = { name: 'g', bezeichnung: '', art: plan.art, niveau: 'nominal', format: '', fehlend: [], fehlendText: '', werteLabels: {} };
  const i = tab.kopf.indexOf('g');
  const faktor = regFaktor(sp, tab.zeilen.map(z => z[i]).filter(v => v !== null && v !== '').map(v => (plan.art === 'zahl' ? alsZahl(v!, plan.punkt)! : String(v))), tab.kopf)!;
  const b = zurEngine(tab);
  e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv });
  const items = e.run(kovarianzBefehl('y', faktor, 'x'));
  return { r: kovarianz(items, { ...f.daten, stufen: faktor.stufen.map(st => st.name) }), faktor };
}
const mit6 = (r: ReturnType<typeof kovarianz>): AncovaE => ({ ...r, y: 'y', g: 'g', x: 'x' });

describe('G6: Sätze und Tabellen', () => {
  it('ungleiche Steigungen: der Satz aus dem Fachblatt steht wörtlich da, in Deutsch und Englisch', () => {
    const { r } = lauf6(f6('h_ungleiche_steigungen'));
    expect(r.steigung.bedeutsam).toBe(true);
    const st = saetzeAncova(mit6(r), id);
    expect(st.haupt).toMatch(/^Die Kovariate wirkt in den Gruppen unterschiedlich\. Die adjustierten Mittelwerte sind dann nur bedingt deutbar\. Bei gleichem Wert in „x“ /);   // die Einschränkung steht zuerst
    expect(st.zusatz.indexOf('Adjustierte Mittelwerte')).toBeGreaterThanOrEqual(0); expect(st.vorsicht).toContain('Test auf gleiche Steigungen');
    expect(st.vorsicht).toContain('Die Kovariate darf nicht von der Gruppe beeinflusst sein, zum Beispiel Vorwissen, das vor der Maßnahme erhoben wurde.');
    expect(st.marken.find(m => m.text.startsWith('Steigungen'))?.hinweis).toBe(true);
    s.einst.sprache = 'en';
    expect(saetzeAncova(mit6(r), id).haupt).toMatch(/^The covariate acts differently in the groups\. The adjusted means can then be interpreted only to a limited extent\. Holding /);
  });
  it('parallele Steigungen: kein Warnsatz, der Test steht nur da; drei Gruppen: Paarvergleiche mit Holm', () => {
    const { r } = lauf6(f6('g_parallel_3_gruppen')), st = saetzeAncova(mit6(r), id);
    expect(st.haupt).not.toContain('wirkt in den Gruppen unterschiedlich'); expect(st.vorsicht).not.toContain('wirkt in den Gruppen unterschiedlich');
    expect(st.vorsicht).toMatch(/Test auf gleiche Steigungen \(Gruppe × Kovariate\): F\(2, \d+\) = [\d,]+, p = ,\d+\./);
    expect(st.haupt).toMatch(/^Bei gleichem Wert in „x“ (unterscheiden sich die Gruppen|belegen die Daten keinen Unterschied zwischen den Gruppen) \(„g“\) in „y“ \(F\(2, \d+\)/);
    expect(st.zusatz).toMatch(/Adjustierte Mittelwerte bei „y“ für „x“ = [\d,]+ \(Mittelwert der 36 Personen\): „g1“ [\d,]+ \[[\d,]+; [\d,]+\] · „g2“/);
    expect(tabellenAncova(mit6(r), id).map(t => t.label)).toEqual(['Tests of Between-Subjects Effects', 'Estimated Marginal Means', 'Pairwise Comparisons', 'Homogeneity of Slopes']);
    expect(tabellenAncova(mit6(r), id)[2]!.rows).toBe(4);   // Kopf + 3 Paare
  });
  it('Gruppe aus Zahlen (1, 2, 3) gibt dieselben Zahlen wie Text', () => {
    const f = f6('g_parallel_3_gruppen'), ziffern: G6 = { ...f, daten: { ...f.daten, g: f.daten.g.map(g => String(Number(g.replace('g', '')))) } };
    const a = lauf6(f).r, b = lauf6(ziffern).r;
    expect(Math.abs(a.gruppe.f - b.gruppe.f)).toBeLessThan(1e-9); expect(b.gruppen.map(g => g.name)).toEqual(['1', '2', '3']);
  });
});
