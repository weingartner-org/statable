import { beforeAll, describe, expect, it } from 'vitest';
import { nodeEngine } from './testengine';
import { leseVerzeichnis } from './verzeichnis';
import { NORM_ARTEN, STANINE_GRENZEN, normBefehl, normRechnen } from './normwerte';

/*
 * Vergleichswerte aus R 4.x (Rscript), Daten unten, Zeile 11 = 99 = „keine Angabe“:
 *   v <- ifelse(x==99, NA, x); z <- as.numeric(scale(v))                      # Stichproben-SD (n - 1)
 *   pr <- 100*(sum(v<a) + 0.5*sum(v==a))/n                                    # Mittelrang-Methode
 *   Stanine: 1 + sum(pr >= c(4,11,23,40,60,77,89,96))                        # Grenzen nach Bortz & Döring
 *   Gruppenweise: je Gruppe dasselbe (split())
 *   Norm M = 15, SD = 5: z <- (v-15)/5; 50+10*z; 100+15*z; 100*pnorm(z); pmin(9, pmax(1, round(2*z+5)))
 */
const X = [14, 22, 9, 17, 17, 30, 25, 11, 22, 17, 99, 19];
const G = [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 1];
const DATEN = `DATA LIST LIST /x g.
BEGIN DATA
${X.map((x, i) => `${x} ${G[i]}`).join('\n')}
END DATA.
VARIABLE LABELS x 'Lesetest'.
MISSING VALUES x (99).
FORMATS x (F2.0).
VARIABLE LEVEL x (SCALE) g (NOMINAL).
EXECUTE.`;
const R_Z = [-0.729639, 0.580733, -1.548621, -0.238249, -0.238249, 1.891104, 1.072122, -1.221028, 0.580733, -0.238249, NaN, 0.089344];
const R_PR = [22.727273, 72.727273, 4.545455, 40.909091, 40.909091, 95.454545, 86.363636, 13.636364, 72.727273, 40.909091, NaN, 59.090909];
const R_ST = [3, 6, 2, 5, 5, 8, 7, 3, 6, 5, NaN, 5];
const RG_Z = [-0.53558251954, 0.42023855309, -1.3232038718, -0.36770873395, -0.06300970818, 1.68095421235, 1.19718445544, -1.3132454784, 0.72461164408, -0.36770873395, NaN, -0.05252981914];
const RG_PR = [30, 75, 10, 33.333333333, 50, 91.666666667, 90, 8.333333333, 70, 33.333333333, NaN, 58.333333333];
const RG_ST = [4, 6, 2, 4, 5, 8, 8, 2, 6, 4, NaN, 5];
const RN_Z = [-0.2, 1.4, -1.2, 0.4, 0.4, 3, 2, -0.8, 1.4, 0.4, NaN, 0.8];
const RN_PR = [42.07402906, 91.92433408, 11.50696702, 65.54217416, 65.54217416, 99.8650102, 97.72498681, 21.18553986, 91.92433408, 65.54217416, NaN, 78.81446014];
const RN_ST = [5, 8, 3, 6, 6, 9, 9, 3, 8, 6, NaN, 7];

let e: Awaited<ReturnType<typeof nodeEngine>>;
const verz = () => leseVerzeichnis(e.run('DISPLAY DICTIONARY.'));
/** Werte einer Spalte aus LIST; fehlend → NaN. */
function werte(name: string): number[] {
  const t = e.run(`LIST x g ${name}.`).find(i => i.type === 'table' && i.label === 'Data List') as any;
  const spalte = t.cells.find((c: any) => c.r === 0 && c.t === name).c;
  return t.cells.filter((c: any) => c.c === spalte && c.r > 0).map((c: any) => (c.n === undefined || c.n < -1e300 ? NaN : c.n));
}
function nah(ist: number[], soll: number[], stellen = 5) {
  expect(ist.length).toBe(soll.length);
  soll.forEach((s, i) => { if (Number.isNaN(s)) expect(ist[i], `Zeile ${i + 1}`).toBeNaN(); else expect(ist[i], `Zeile ${i + 1}`).toBeCloseTo(s, stellen); });
}
const sp = () => verz().find(s => s.name === 'x')!;
const lauf = (bezug: Parameters<typeof normBefehl>[2]) => {
  e.run(DATEN);
  const b = normBefehl(sp(), [...NORM_ARTEN], bezug, verz().map(s => s.name));
  const fehler = e.run(b.syntax).filter(i => i.type === 'message' && i.severity === 'error');
  expect(fehler, b.syntax).toEqual([]);
  return b;
};
beforeAll(async () => { e = await nodeEngine(); });

describe('Normwerte - eigene Stichprobe', () => {
  it('z, T, IQ, Stanine, Prozentrang wie R (scale, Mittelrang)', () => {
    const b = lauf({ typ: 'stichprobe' });
    const n = (a: string) => b.neu.find(x => x.art === a)!.name;
    nah(werte(n('z')), R_Z); nah(werte(n('pr')), R_PR, 4); nah(werte(n('stanine')), R_ST);
    nah(werte(n('t')), R_Z.map(z => 50 + 10 * z), 4); nah(werte(n('iq')), R_Z.map(z => 100 + 15 * z), 4);
    // Hilfsspalten sind wieder weg, die Quellspalte unverändert
    expect(verz().map(s => s.name)).toEqual(['x', 'g', ...b.neu.map(x => x.name)]);
    expect(werte('x').filter(Number.isFinite).length).toBe(12);
  });
  it('Spalte mit Bezeichnung, Niveau und Nachkommastellen', () => {
    const b = lauf({ typ: 'stichprobe' });
    const v = verz();
    expect(v.find(s => s.name === 'T_x')!.bezeichnung).toBe('T-Wert Lesetest');
    expect(v.find(s => s.name === 'PR_x')!.bezeichnung).toBe('Prozentrang Lesetest');
    expect(v.find(s => s.name === 'Stanine_x')!.niveau).toBe('ordinal');
    expect(v.find(s => s.name === 'z_x')!.niveau).toBe('metrisch');
    expect(v.find(s => s.name === 'z_x')!.format).toBe('F8.2');
    expect(b.syntax).toContain('RANK x');
  });
  it('getrennt nach Gruppe (auch unsortiert)', () => {
    const b = lauf({ typ: 'stichprobe', gruppe: 'g' });
    const n = (a: string) => b.neu.find(x => x.art === a)!.name;
    nah(werte(n('z')), RG_Z, 5); nah(werte(n('pr')), RG_PR, 4); nah(werte(n('stanine')), RG_ST);
  });
  it('getrennt nach einer TEXT-Gruppe (B2): dieselben Zahlen wie mit der Zahl-Gruppe, Lücke in der Gruppe bleibt leer', () => {
    // Vorher: „IF: Type mismatch invoking MISSING(number) as MISSING(string)“ - die Rechnung scheiterte ohne Grund. R: split(scale(...)) je Gruppe wie oben (RG_*).
    e.run(DATEN.replace('DATA LIST LIST /x g.', 'DATA LIST LIST /x * g (A1).').replace(/^(\d+) ([12])$/gm, (_, x, g) => `${x} ${g === '1' ? 'A' : 'B'}`).replace('VARIABLE LEVEL x (SCALE) g (NOMINAL).', 'VARIABLE LEVEL x (SCALE).'));
    const b = normBefehl(sp(), [...NORM_ARTEN], { typ: 'stichprobe', gruppe: 'g', gruppeText: true }, verz().map(s => s.name));
    expect(e.run(b.syntax).filter(i => i.type === 'message' && i.severity === 'error'), b.syntax).toEqual([]);
    const n = (a: string) => b.neu.find(x => x.art === a)!.name;
    nah(werte(n('z')), RG_Z, 5); nah(werte(n('pr')), RG_PR, 4); nah(werte(n('stanine')), RG_ST);
    expect(b.syntax).toContain("g <> ''");
    // mit Zahl-Gruppe bleibt es bei MISSING()
    expect(normBefehl(sp(), ['z'], { typ: 'stichprobe', gruppe: 'g' }, ['x', 'g']).syntax).toContain('NOT MISSING(g)');
  });
  it('JavaScript-Vorschau rechnet dasselbe', () => {
    const v = X.map(x => (x === 99 ? null : x));
    const o = normRechnen(v, { typ: 'stichprobe' });
    nah(o.map(r => r?.z ?? NaN), R_Z); nah(o.map(r => r?.pr ?? NaN), R_PR, 4); nah(o.map(r => r?.stanine ?? NaN), R_ST);
    const og = normRechnen(v, { typ: 'stichprobe', gruppe: 'g' }, G);
    nah(og.map(r => r?.z ?? NaN), RG_Z); nah(og.map(r => r?.pr ?? NaN), RG_PR, 4); nah(og.map(r => r?.stanine ?? NaN), RG_ST);
  });
  it('Name belegt: z_x2; Sonderzeichen im Titel bleiben in Anführungszeichen heil', () => {
    const b = normBefehl({ name: 'x', bezeichnung: "Leser's Test" }, ['z'], { typ: 'stichprobe' }, ['x', 'Z_X']);
    expect(b.neu[0]!.name).toBe('z_x2');
    expect(b.syntax).toContain("'z-Wert Leser''s Test'");
  });
});

describe('Normwerte - Normtabelle (Mittelwert und SD der Norm)', () => {
  it('wie R (pnorm, round(2z+5))', () => {
    const b = lauf({ typ: 'norm', mw: 15, sd: 5 });
    const n = (a: string) => b.neu.find(x => x.art === a)!.name;
    nah(werte(n('z')), RN_Z); nah(werte(n('pr')), RN_PR, 4); nah(werte(n('stanine')), RN_ST);
    nah(werte(n('t')), RN_Z.map(z => 50 + 10 * z), 4); nah(werte(n('iq')), RN_Z.map(z => 100 + 15 * z), 4);
    expect(b.syntax).not.toContain('AGGREGATE');
    const o = normRechnen(X.map(x => (x === 99 ? null : x)), { typ: 'norm', mw: 15, sd: 5 });
    nah(o.map(r => r?.pr ?? NaN), RN_PR, 6); nah(o.map(r => r?.stanine ?? NaN), RN_ST);
  });
  it('Dezimalzahlen werden ohne Exponent in die Syntax geschrieben', () => {
    const b = normBefehl({ name: 'x', bezeichnung: '' }, ['z'], { typ: 'norm', mw: 0.0000001, sd: 12.5 }, ['x']);
    expect(b.syntax).toMatch(/\(x - 0\.0000001\) \/ 12\.5/);
  });
});

describe('Stanine', () => {
  it('Grenzen 4-11-23-40-60-77-89-96 (Prozentrang) und die Normalverteilung: z = ±1,75 … ±0,25', () => {
    expect([...STANINE_GRENZEN]).toEqual([4, 11, 23, 40, 60, 77, 89, 96]);
    // R: round(100*pnorm(c(-1.75,-1.25,-0.75,-0.25,0.25,0.75,1.25,1.75)), 1) = 4.0 10.6 22.7 40.1 59.9 77.3 89.4 96.0
    const ist = [-1.75, -1.25, -0.75, -0.25, 0.25, 0.75, 1.25, 1.75].map(z => normRechnen([15 + 5 * z], { typ: 'norm', mw: 15, sd: 5 })[0]!.pr);
    [4.0, 10.6, 22.7, 40.1, 59.9, 77.3, 89.4, 96.0].forEach((s, i) => expect(ist[i]).toBeCloseTo(s, 1));
  });
});
