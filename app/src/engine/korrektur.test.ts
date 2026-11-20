import { describe, expect, it } from 'vitest';
import { nodeEngine } from '../lib/testengine';
import { fisherZweiseitig, korrigiereAusgabe } from './korrektur';
import type { TableItem } from './types';

describe('Kreuztabelle: erwartete Randsummen (PSPP 2.1.1 schrieb Anteile, 2.1.3 rechnet richtig)', () => {
  it('Gesamt-Spalte und Gesamt-Zeile zeigen bei „Erwartet“ die beobachteten Randsummen', async () => {
    const e = await nodeEngine();
    const items = e.run(`DATA LIST FREE /g h.
BEGIN DATA
1 1 1 1 1 2 1 2 1 3 2 1 2 2 2 2 2 2 2 3 2 3 2 3
END DATA.
CROSSTABS /TABLES=g BY h /STATISTICS=CHISQ /CELLS=COUNT ROW EXPECTED.`);
    const tab = () => items.find((i): i is TableItem => i.type === 'table' && i.cells.some(c => c.t === 'Expected'))!;
    const wert = (r: number, c: number) => tab().cells.find(x => x.r === r && x.c === c)?.n;
    const zeilen = (t: string) => [...new Set(tab().cells.filter(c => c.t === t).map(c => c.r))].sort((a, b) => a - b);
    const g = tab().cols - 1;
    expect(wert(zeilen('Expected')[0]!, g)).toBe(5); // PSPP 2.1.3 (78c68f0) rechnet richtig; 2.1.1 gab den Anteil statt 5 - die Korrektur muss dann nichts ändern
    korrigiereAusgabe(items);
    const [a, b, gesamt] = zeilen('Count'), [ea, eb, egesamt] = zeilen('Expected');
    expect(wert(ea!, g)).toBe(wert(a!, g));
    expect(wert(eb!, g)).toBe(wert(b!, g));
    for (let c = tab().headCols[0] + tab().headCols[1]; c < tab().cols; c++) expect(wert(egesamt!, c)).toBe(wert(gesamt!, c));
    expect(wert(ea!, 3)).not.toBe(wert(a!, 3)); // innere Zellen bleiben erwartete Werte
  });
});

describe('Regression: kein Beta bei der Konstanten (wie SPSS und Kurs)', () => {
  it('leert die Beta-Zelle der Konstanten, die anderen bleiben', async () => {
    const e = await nodeEngine();
    const items = e.run(`DATA LIST FREE /x y.
BEGIN DATA
1 2 2 3 3 5 4 4 5 6 6 7
END DATA.
REGRESSION /VARIABLES=x /DEPENDENT=y /STATISTICS=COEFF R.`);
    const tab = items.find((i): i is TableItem => i.type === 'table' && /^Coefficients/.test(i.label))!;
    const beta = tab.cells.find(c => c.t === 'Beta')!.c, konst = tab.cells.find(c => c.t === '(Constant)')!.r, x = tab.cells.find(c => c.t === 'x' && c.c === 0)!.r;
    const zelle = (r: number) => tab.cells.find(c => c.r === r && c.c === beta);
    expect(zelle(konst)?.t ?? '').toBe(''); // PSPP 2.1.3 (107f870) lässt die Zelle leer; 2.1.1 schrieb „.00“
    korrigiereAusgabe(items);
    expect(zelle(konst)?.t ?? '').toBe('');
    expect(zelle(x)?.n).toBeGreaterThan(0.9);
  });
});

describe('Verteilung: Minimum/Maximum als Zahl, nicht als Wertelabel', () => {
  it('zeigt 1 und 5 statt „sehr selten“ und „sehr oft“', async () => {
    const e = await nodeEngine();
    const items = e.run(`DATA LIST FREE /f.
BEGIN DATA
1 2 3 4 5 3 2
END DATA.
VALUE LABELS f 1 'sehr selten' 5 'sehr oft'.
DESCRIPTIVES /VARIABLES=f /STATISTICS=MEAN STDDEV MIN MAX.`);
    const tab = items.find((i): i is TableItem => i.type === 'table' && /^Descriptive Statistics/.test(i.label))!;
    const zelle = (kopf: string) => tab.cells.find(c => !c.h && c.c === tab.cells.find(k => k.h && k.t === kopf)!.c && c.r === tab.headRows[0]);
    expect([zelle('Minimum')?.t, zelle('Maximum')?.t]).toEqual(['1.00', '5.00']); // PSPP 2.1.3 (4f7be31) schreibt die Zahl; 2.1.1 schrieb „sehr selten“, „sehr oft“
    korrigiereAusgabe(items);
    expect([zelle('Minimum')?.t, zelle('Maximum')?.t]).toEqual(['1.00', '5.00']);
    expect(zelle('Mean')?.t).toBe('2.8571'); // andere Zellen bleiben (2.1.3 zeigt das Mittel wie SPSS mit zwei Stellen mehr als das Format, 4f7be31)
  });
});

describe('Erkunden: Quartilsabstand bei Gruppen mit 1 oder 2 Personen (Befund C3)', () => {
  it('n = 1 und n = 2 → leer wie SPSS 32 (pruefdaten/spss-2026-10-29), ab n = 3 unverändert (6,50 = SPSS)', async () => {
    const e = await nodeEngine();
    const items = korrigiereAusgabe(e.run(`DATA LIST FREE /g x.
BEGIN DATA
1 5 2 3 2 4.2 3 1 3 2 3 7 3 8
END DATA.
EXAMINE /VARIABLES=x BY g /STATISTICS=DESCRIPTIVES /PLOT=NONE.`));
    const t = items.filter((i): i is TableItem => i.type === 'table' && i.label === 'Descriptives').at(-1)!;
    const iqr = [...new Set(t.cells.filter(c => c.x && c.t === 'Interquartile Range').map(c => c.r))].sort((a, b) => a - b)
      .map(r => t.cells.find(c => c.r === r && c.c === 4)!);
    expect(iqr.map(z => [z.t, z.n === undefined ? undefined : +z.n.toFixed(6)])).toEqual([["", undefined], ["", undefined], ["6.50", 6.5]]);   // 2.1.1 roh 2,50 und 1,95; 2.1.3 roh ,00 (n = 1, SD als Fehlwert) und 1,20
  });
});

describe('Beschreiben: „Valid N (listwise)“ zählt die fehlenden Werte ab (Befund C5)', () => {
  it('PSPP schreibt die Zahl aller Fälle; richtig ist alle − fehlend. Mit /MISSING=LISTWISE stimmt PSPP schon', async () => {
    const e = await nodeEngine();
    const items = korrigiereAusgabe(e.run(`DATA LIST LIST /a b.
BEGIN DATA
1 2
2 .
3 99
4 5
. 6
END DATA.
MISSING VALUES b (99).
DESCRIPTIVES /VARIABLES=a b.
DESCRIPTIVES /VARIABLES=a b /MISSING=LISTWISE.
DESCRIPTIVES /VARIABLES=b.
DESCRIPTIVES /VARIABLES=a.`));
    const gueltig = items.filter((i): i is TableItem => i.type === 'table' && /^Descriptive Statistics/.test(i.label))
      .map(t => t.cells.find(c => c.r === t.cells.find(x => x.t === 'Valid N (listwise)')!.r && c.c === 1)!.n);
    expect(gueltig).toEqual([2, 2, 3, 4]);   // vorher 5, 2, 5, 5
  });
});

describe('Bonferroni: Spaltenkopf „(I) Family“ wird zur Gruppenspalte (Befund D4)', () => {
  it('„(I) g“ und „(J) g“ statt „(I) Family“ (deutsch angezeigt als „(I) Familie“)', async () => {
    const e = await nodeEngine();
    const syntax = `DATA LIST LIST /g x y.
BEGIN DATA
1 5 1
1 6 2
1 7 2
2 3 4
2 4 4
2 2 5
3 9 1
3 8 2
3 9 1
END DATA.
ONEWAY x y BY g /STATISTICS=DESCRIPTIVES HOMOGENEITY /POSTHOC=BONFERRONI.`;
    const items = korrigiereAusgabe(e.run(syntax), syntax);
    const koepfe = items.filter((i): i is TableItem => i.type === 'table' && /^Multiple Comparisons/.test(i.label))
      .map(t => t.cells.filter(c => /^\((I|J)\)/.test(c.t)).map(c => c.t));
    expect(koepfe).toEqual([['(I) g', '(J) g'], ['(I) g', '(J) g']]);
  });
});

describe('Nicht berechenbar: „NaN“ und „+Infinit“ werden zu „.“ (Nebenbefund D5)', () => {
  it('Erkunden mit Gruppen aus 1 und 2 Personen: keine Zelle zeigt NaN oder Infinit', async () => {
    const e = await nodeEngine();
    const roh = e.run(`DATA LIST FREE /g x.
BEGIN DATA
1 5 2 3 2 4.2 3 1 3 2 3 7 3 8
END DATA.
EXAMINE /VARIABLES=x BY g /STATISTICS=DESCRIPTIVES /PLOT=NONE.`);
    const schlecht = (items: typeof roh) => items.flatMap(i => (i.type === 'table' ? i.cells : [])).filter(c => /NaN|Infinit/i.test(c.t)).length;
    expect(schlecht(roh)).toBe(0);   // PSPP 2.1.3 (53e6660) schreibt „.“; 2.1.1 schrieb NaN und +Infinit - die Korrektur bleibt für eingefügte Syntax
    expect(schlecht(korrigiereAusgabe(roh))).toBe(0);
  });
});

describe('Exakter Test nach Fisher (Prüfung A2)', () => {
  // R: fisher.test(matrix(c(2,1,1,8), 2, byrow = TRUE))$p.value usw.
  const R: [number[], number][] = [[[2, 1, 1, 8], 0.1272727], [[3, 1, 1, 6], 0.08787879], [[1, 5, 4, 2], 0.2424242], [[5, 0, 2, 6], 0.02097902], [[7, 2, 3, 9], 0.02997312], [[0, 4, 6, 3], 0.06993007]];
  it('zweiseitig wie R, auch wo PSPP 2.1.1 falsch rechnet', () => {
    for (const [z, p] of R) expect(fisherZweiseitig(z[0]!, z[1]!, z[2]!, z[3]!)).toBeCloseTo(p, 6);
  });
  it('steht korrigiert in der Tabelle „Chi-Square Tests“', async () => {
    const e = await nodeEngine();
    const zeilen = [[1, 1, 2], [1, 2, 1], [2, 1, 1], [2, 2, 8]].map(([x, y, k]) => Array(k).fill(`${x} ${y}`).join('\n')).join('\n');
    const items = korrigiereAusgabe(e.run(`DATA LIST FREE /x y.\nBEGIN DATA.\n${zeilen}\nEND DATA.\nCROSSTABS /TABLES=x BY y /STATISTICS=CHISQ /CELLS=COUNT ROW EXPECTED.`));
    const cs = items.find(i => i.type === 'table' && i.label === 'Chi-Square Tests') as { cells: { r: number; c: number; t: string; n?: number }[] };
    const r = cs.cells.find(c => c.t === "Fisher's Exact Test")!.r;
    expect(cs.cells.some(c => c.r === r && c.n !== undefined && Math.abs(c.n - 0.1272727) < 1e-6)).toBe(true);
  });
});
