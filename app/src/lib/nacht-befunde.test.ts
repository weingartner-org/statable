import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { faktoren, saetzeFaktoren } from './ergebnis';
import { VERFAHREN } from './verfahren';
import { nodeEngine } from './testengine';

/** Nachttest 24.10.2026: Befunde aus dem Vergleich mit SPSS 32 (Daten pruefdaten/nacht/nacht.csv, 150 Fälle, simuliert). */
let e: Awaited<ReturnType<typeof nodeEngine>>;
const csv = readFileSync(new URL('../../../pruefdaten/nacht/nacht.csv', import.meta.url), 'utf8').trim().split('\n');
const kopf = csv[0]!.split(',').map(x => x.replace(/"/g, ''));
const spalten = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'a1', 'a2', 'a3', 'a4'];
beforeAll(async () => {
  e = await nodeEngine();
  const zeilen = csv.slice(1).map(z => { const w = z.split(','); return spalten.map(s => { const v = w[kopf.indexOf(s)]!; return v === '' || (s === 'a2' && v === '99') ? '.' : v; }).join(' '); });
  e.run(`DATA LIST FREE /${spalten.join(' ')}.\nBEGIN DATA.\n${zeilen.join('\n')}\nEND DATA.\nCOMPUTE m4R = 6 - m4.\nEXECUTE.`);
});

describe('Nachttest: Faktorenanalyse Hauptachsen mit Promax', () => {
  it('der Satz nennt die Faktorkorrelation mit Vorzeichen wie die Tabelle (SPSS: −,040)', () => {
    const v = VERFAHREN.find(x => x.id === 'faktor')!;
    const w = { l1: ['m1', 'm2', 'm3', 'm4R', 'm5', 'm6', 'a1', 'a2', 'a3', 'a4'], l2: [], l3: [], l4: [] };
    const r = faktoren(e.run(v.syntax(w, { fa: { methode: 'paf', zahl: 2, grenze: null } } as never)));
    expect(r.korrelationen![0]![1]).toBeCloseTo(-0.040, 2);
    expect(saetzeFaktoren(r).zusatz).toContain('Die Faktoren hängen kaum zusammen (r = −,04).');
  });
});

describe('Nachttest: Friedman-Satz nennt die mittleren Ränge', () => {
  it('m1, m2, m3, m5: gleiche Mediane (3), höchster und niedrigster mittlerer Rang wie SPSS (2,54 / 2,42)', async () => {
    const { friedman } = await import('./friedman');
    const { saetzeFriedman } = await import('./friedmansaetze');
    const { s } = await import('./sitzung.svelte');
    s.einst.sprache = 'de';
    const ix = ['m1', 'm2', 'm3', 'm5'].map(n => kopf.indexOf(n));
    const daten = csv.slice(1).map(z => z.split(',')).filter(w => ix.every(i => w[i] !== '')).map(w => ix.map(i => Number(w[i])));
    const f = friedman(daten, ['m1', 'm2', 'm3', 'm5']);
    expect(f.chi2 ?? (f as any).chiQuadrat).toBeCloseTo(1.107, 3);
    const h = saetzeFriedman(f, x => x).haupt;
    expect(h).toContain('am höchsten (mittlerer Rang 2,54, Median 3)');
    expect(h).toContain('am niedrigsten (mittlerer Rang 2,42, Median 3)');
  });
});

describe('Nachttest: Häufigkeiten mit Gleichstand', () => {
  it('nennt gleich häufige Antworten zusammen statt „am häufigsten, dann … mit gleichem Anteil“', async () => {
    const { saetzeVerteilung } = await import('./ergebnis');
    const { s } = await import('./sitzung.svelte');
    s.einst.sprache = 'de';
    const h = (name: string, werte: [string, number][]) => { const n = werte.reduce((a, b) => a + b[1], 0); return { name, n, fehlend: 0, werte: werte.map(([w, k]) => ({ name: w, anzahl: k, anteil: k / n })) }; };
    const zwei = saetzeVerteilung({ art: 'verteilung', zahlen: [], gruppen: [h('Prüfung bestanden', [['nein', 75], ['ja', 75]])] } as never).haupt;
    expect(zwei).toMatch(/Bei „Prüfung bestanden“ sind alle 2 Antworten gleich häufig \(je 50\s%\)\./);
    const teil = saetzeVerteilung({ art: 'verteilung', zahlen: [], gruppen: [h('Note', [['gut', 30], ['sehr gut', 30], ['befriedigend', 20], ['genügend', 10]])] } as never).haupt;
    expect(teil).toMatch(/Bei „Note“ sind „gut“ und „sehr gut“ gleich häufig am häufigsten \(je 33\s%\), dann „befriedigend“ mit 22\s%/);
  });
});

describe('Nachttest: Kartensuche kennt die Stichwörter der Hilfe', () => {
  it('„partiell“, „Kovarianz“, „Friedman“ finden die Karte, in der das Verfahren steckt', async () => {
    const { kartenSuche, kartenStichwoerter } = await import('./fach');
    const { artikelListe } = await import('../hilfe/artikel');
    const sw = kartenStichwoerter(artikelListe('de'));
    expect(kartenSuche('partiell', 'bildung').map(k => k.id)).not.toContain('zusammenhang');
    expect(kartenSuche('partiell', 'bildung', sw).map(k => k.id)).toContain('zusammenhang');
    expect(kartenSuche('Kovarianz', 'bildung', sw).map(k => k.id)).toContain('gruppen');
    expect(kartenSuche('Friedman', 'bildung', sw).map(k => k.id)).toContain('messwiederholung');
    expect(kartenSuche('Shapiro', 'bildung', sw).map(k => k.id)).toContain('verteilung');
    const en = kartenStichwoerter(artikelListe('en'));
    expect(kartenSuche('partial', 'bildung', en).map(k => k.id)).toContain('zusammenhang');
  });
  it('„t-test“, „ttest“ und „t test“ sind dieselbe Suche (englische Oberfläche, Andreas)', async () => {
    const { kartenSuche, kartenStichwoerter } = await import('./fach');
    const { artikelListe } = await import('../hilfe/artikel');
    const en = kartenStichwoerter(artikelListe('en'));
    for (const q of ['t-test', 'ttest', 't test', 'T-Test', 'Mann-Whitney', 'one-sample', 'one sample']) expect(kartenSuche(q, 'bildung', en).length, q).toBeGreaterThan(0);
    expect(kartenSuche('t-test', 'bildung', en).map(k => k.id)).toContain('gruppen');
  });
});

describe('Nachttest: PSPP EXAMINE, Normalitätstests ohne Faktor (Patch 0004)', () => {
  it('jede abhängige Variable hat ihre eigene Zeile (vorher: eine Zeile, beschriftet mit der ersten, Werte der letzten)', async () => {
    const e2 = await nodeEngine();
    e2.run("GET FILE='/nacht.sav'.", { '/nacht.sav': readFileSync(new URL('../../../pruefdaten/nacht/nacht.sav', import.meta.url)) });
    const t = e2.run('EXAMINE VARIABLES=prae post lernzeit /PLOT=NPPLOT.').find(i => i.type === 'table' && (i as { label?: string }).label === 'Tests of Normality') as unknown as { cells: { r: number; c: number; t: string }[] };
    const zeile = (n: string) => { const r = t.cells.find(c => c.c === 0 && c.t === n)!.r; return t.cells.filter(c => c.r === r && c.c > 0).map(c => c.t); };
    expect(zeile('Testwert nachher')[0]).toBe('.99');   // SPSS 32 (listenweise, n = 149): W = .989
    expect(zeile('lernzeit')[0]).toBe('.80');           // SPSS 32: W = .803
    expect(zeile('Testwert vorher')[0]).not.toBe('.80');
  });
});
