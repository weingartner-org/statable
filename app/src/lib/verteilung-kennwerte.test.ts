/** Wie verteilt sich etwas? (Prüfung A8): Median, Quartile, Schiefe, Wölbung aus PSPP gegen R (scripts/verteilung-erwartet.R). */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { korrigiereAusgabe } from '../engine/korrektur';
import { saetzeVerteilung, verteilung } from './ergebnis';
import { VERFAHREN } from './verfahren';
import { nodeEngine } from './testengine';

const R = JSON.parse(readFileSync(new URL('./testdaten/verteilung-erwartet.json', import.meta.url), 'utf8')) as { daten: Record<string, number[]>; erwartet: Record<string, Record<string, number>> };
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

const rechne = (namen: string[], nominal: string[] = []) => {
  const n = Math.max(...namen.map(k => R.daten[k]!.length));
  const zeilen = Array.from({ length: n }, (_, i) => namen.map(k => R.daten[k]![i] ?? '.').join(' '));
  const ctx = { verschieden: (k: string) => new Set(R.daten[k]).size, gueltig: (k: string) => R.daten[k]!.length, istZahl: () => true, nominal: (k: string) => nominal.includes(k) };
  const v = VERFAHREN.find(x => x.id === 'verteilung')!;
  const syntax = v.syntax({ l1: namen, l2: [], l3: [], l4: [] }, ctx);
  const items = korrigiereAusgabe(e.run(`NEW FILE.\nDATA LIST FREE /${namen.join(' ')}.\nBEGIN DATA\n${zeilen.join('\n')}\nEND DATA.\nMISSING VALUES ALL ('.').\n${syntax}`));
  return { syntax, ver: verteilung(items) };
};

describe('Verteilung: Kennzahlen gegen R', () => {
  let syntax = '', ver: ReturnType<typeof verteilung>;
  beforeAll(() => { ({ syntax, ver } = rechne(['einkommen', 'alter', 'zufrieden', 'schlaf', 'klein'])); });
  it('Syntax: Zahlen ohne Tabelle, Likert mit Tabelle, beide mit Median/Quartilen im SPSS-Verfahren', () => {
    expect(syntax).toContain('/FORMAT=NOTABLE');
    expect(syntax.match(/ALGORITHM=COMPATIBLE/g)).toHaveLength(2);
    expect(syntax).toMatch(/FREQUENCIES \/VARIABLES=zufrieden klein\n  \/STATISTICS=MEAN/);
  });
  for (const k of ['einkommen', 'alter', 'zufrieden', 'schlaf', 'klein']) {
    it(`${k}: N, M, SD, Min, Max, Median, Q1, Q3, Schiefe, Wölbung wie R (Typ 6 / G1 / G2)`, () => {
      const z = ver.zahlen.find(x => x.name === k)!, r = R.erwartet[k]!;
      expect(z.n).toBe(r.n);
      for (const w of ['m', 'sd', 'min', 'max', 'median', 'q1', 'q3', 'schiefe', 'kurtosis'] as const) expect(z[w], w).toBeCloseTo(r[w]!, 1);
      // PSPP rundet in der Ausgabe auf zwei Stellen; für Schiefe und Wölbung stimmen sie damit auf 0,01.
      expect(Math.abs(z.schiefe! - r.schiefe!)).toBeLessThan(0.0051);
      expect(Math.abs(z.kurtosis! - r.kurtosis!)).toBeLessThan(0.0051);
      expect(Math.abs(z.q1! - r.q1!)).toBeLessThan(0.0051);
      expect(Math.abs(z.q3! - r.q3!)).toBeLessThan(0.0051);
    });
  }
  it('gestufte Zahlen stehen auch als Häufigkeit; Zahlen mit vielen Werten nicht', () => {
    expect(ver.zahlen.filter(z => z.stufen).map(z => z.name)).toEqual(['zufrieden', 'klein']);
    expect(ver.gruppen.map(g => g.name)).toEqual(['zufrieden', 'klein']);
  });
});

describe('Verteilung: Satz und Tabelle nennen Median und Quartile gleich (B7)', () => {
  it('Spaltenformat ohne Nachkommastellen: der Satz rundet wie die Tabelle („1484“, nicht „1483,5“)', () => {
    const v = VERFAHREN.find(x => x.id === 'verteilung')!;
    const ctx = { verschieden: () => 12, gueltig: () => 12, istZahl: () => true, nominal: () => false };
    const syntax = v.syntax({ l1: ['v'], l2: [], l3: [], l4: [] }, ctx);
    const ver = verteilung(korrigiereAusgabe(e.run(`NEW FILE.\nDATA LIST FREE /v (F6.0).\nBEGIN DATA\n1000 1100 1483 1484 1600 2000 2500 2901 2902 5000 9000 14000\nEND DATA.\n${syntax}`)));
    const z = ver.zahlen[0]!;
    expect(z.qStellen).toBe(0);
    const st = saetzeVerteilung(ver);
    const text = `${st.haupt} ${st.zusatz}`;
    expect(text).not.toMatch(/\d,\d+ \(Q1\)/);   // keine Stelle mehr, als die Tabelle zeigt
    expect(text).toContain(`${String(Math.round(z.q1!))} (Q1)`);
  });
});

describe('Verteilung: Sätze', () => {
  it('schiefe Daten (Einkommen): Median und Quartile im Hauptsatz, Mittelwert als vom Rand gezogen', () => {
    const { ver } = rechne(['einkommen']);
    const st = saetzeVerteilung(ver), r = R.erwartet.einkommen!;
    expect(r.schiefe).toBeGreaterThan(1);
    expect(st.haupt).toMatch(/^Bei „einkommen“ ist die Verteilung schief \(Schiefe = \d,\d\d\)\. Der Median liegt bei \d+(,\d+)?, die mittleren 50 % der Werte zwischen \d+(,\d+)? \(Q1\) und \d+(,\d+)? \(Q3\)\. Der Mittelwert \(.*\) wird hier von einzelnen sehr hohen Werten am Rand gezogen/);
    expect(st.haupt).toContain(`Der Median liegt bei ${String(Math.round(r.median! * 10) / 10).replace('.', ',')}`);
    expect(st.apa).toMatch(/^M = \d+,\d\d, SD = \d+,\d\d, Mdn = \d+,\d\d, n = 200$/);
    expect(st.marken.map(m => m.text)).toContain(`Median = ${String(Math.round(r.median! * 10) / 10).replace('.', ',')}`);
    expect(st.marken.some(m => m.hinweis)).toBe(true);
  });
  it('symmetrische Daten (Alter): M und SD wie bisher, Median in der Zusatzzeile', () => {
    const { ver } = rechne(['alter']);
    const st = saetzeVerteilung(ver);
    expect(Math.abs(R.erwartet.alter!.schiefe!)).toBeLessThan(1);
    expect(st.haupt).toMatch(/^Bei „alter“ liegt der Mittelwert bei \d+,\d; die Werte reichen von \d+ bis \d+\.$/);
    expect(st.zusatz).toMatch(/^Bei „alter“: Der Median liegt bei \d+(,\d+)?, die mittleren 50 % der Werte zwischen \d+(,\d+)? \(Q1\) und \d+(,\d+)? \(Q3\)\. Schiefe = −?\d,\d\d, Wölbung = −?\d,\d\d\.$/);
    expect(st.apa).toMatch(/^M = \d+,\d\d, SD = \d+,\d\d, Mdn = \d+,\d\d, n = 150$/);
  });
  it('Likert-Item: Häufigkeiten UND M, SD, Median', () => {
    const { ver } = rechne(['zufrieden']);
    const st = saetzeVerteilung(ver), r = R.erwartet.zufrieden!;
    expect(ver.zahlen[0]!.m).toBeCloseTo(r.m!, 2);
    expect(st.zusatz).toMatch(/Bei „zufrieden“ ist „[\d.,]+“ mit \d+\s%\sam häufigsten/);
    expect(st.apa).toMatch(/^zufrieden: M = \d,\d\d, SD = \d,\d\d, Mdn = \d,\d\d, n = 120; zufrieden: /);
  });
  it('englisch', async () => {
    const { s } = await import('./sitzung.svelte');
    const vorher = s.einst.sprache; s.einst.sprache = 'en';
    try {
      const st = saetzeVerteilung(rechne(['einkommen']).ver);
      expect(st.haupt).toMatch(/^"einkommen" is skewed \(skewness = \d\.\d\d\)\. The median is \d+(\.\d)?, the middle 50% of values lie between \d+(\.\d+)? \(Q1\) and \d+(\.\d+)? \(Q3\)\./);
      expect(st.apa).toMatch(/^M = \d+\.\d\d, SD = \d+\.\d\d, Mdn = \d+\.\d\d, n = 200$/);
    } finally { s.einst.sprache = vorher; }
  });
  it('alte Projektdateien ohne Median: Satz wie bisher', () => {
    const st = saetzeVerteilung({ art: 'verteilung', zahlen: [{ name: 'x', n: 5, m: 2.86, sd: 1.35, min: 1, max: 5 }], gruppen: [] });
    expect(st.haupt).toBe('Bei „x“ liegt der Mittelwert bei 2,9; die Werte reichen von 1 bis 5.');
    expect(st.apa).toBe('M = 2,86, SD = 1,35, n = 5');
  });
});

describe('Median im Satz (Klickrunde 22.10.): nie gröber als in der Tabelle', () => {
  it('Median 16,5 bei ganzzahligem Spaltenformat steht als 16,5, nicht als 17', async () => {
    const { saetzeVerteilung } = await import('./ergebnis');
    const e = { art: 'verteilung', zahlen: [{ name: 'a', n: 10, m: 17.2, sd: 5, min: 8, max: 30, median: 16.5, q1: 12, q3: 21, qStellen: 0, schiefe: 1.5 }], gruppen: [] } as never;
    const st = saetzeVerteilung(e);
    expect(`${st.haupt} ${st.zusatz}`).toContain('Median liegt bei 16,5'); expect(`${st.haupt} ${st.zusatz}`).not.toMatch(/Median liegt bei 17[,\s]/);
  });
});
