import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { leseCsv, zurEngine } from './einlesen';
import { regTerme } from './regfaktor';
import { nodeEngine } from './testengine';
import { betai } from './verteilung';
import { hierreg, hierregBefehl, hierBloecke, hierBlockVon, hierGueltig, hierStandard, leereHier, kopiereHier, type Hierreg, type HierBlock } from './hierreg';
import { saetzeHierreg, tabellenHierreg, blockSatz } from './hierregsaetze';
import erwartet from './testdaten/hierreg-erwartet.json';

/* Eigene Tests zu Paket B (G4): Sätze, APA-Zeile, Tabellen und die Wahl der Blöcke. Die Zahlen gegen R stehen in hierreg.test.ts. */
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });
afterEach(() => { s.einst.sprache = 'de'; });
const id = (x: string) => x;
/** Geschützte Leerzeichen (vor dem Prozentzeichen) als gewöhnliche Leerzeichen. */
const n = (t: string) => t.replace(/[\u00a0\u202f]/g, ' ');

const pF = (f: number, df1: number, df2: number) => betai(df2 / 2, df1 / 2, df2 / (df2 + df1 * f));
/** Ein Block aus R², Vorgänger-R² und den Freiheitsgraden (F und p wie hierreg.ts). */
function block(nr: number, r2: number, vor: number, df1: number, df2: number, spalten: string[]): HierBlock {
  const dr2 = r2 - vor, f = (dr2 / df1) / ((1 - r2) / df2);
  return { nr, spalten, anzahl: df1, r2, r2korr: r2 - 0.01, dr2, f, df1, df2, p: pF(f, df1, df2) };
}
const koef = (name: string, spalte: string, p: number) => ({ name, spalte, b: 0.5, se: 0.2, t: 2.5, p, beta: 0.3 });
function beispiel(): Hierreg {
  // Block 2: ΔR² ≈ ,0813, F(2, 96) = 5,43, p = ,006 (Fachblatt)
  return { art: 'hierreg', ziel: 'y', n: 100, bloecke: [block(1, 0.2, 0, 2, 97, ['x1', 'x2']), block(2, 0.28131, 0.2, 2, 96, ['x3', 'x4'])],
    koeffizienten: [koef('x1', 'x1', 0.3), koef('x2', 'x2', 0.01), koef('x3', 'x3', 0.2), koef('x4', 'x4', 0.001)], konstante: { ...koef('(Constant)', '', 0.9), beta: NaN } };
}

describe('G4: Sätze', () => {
  it('Satz wörtlich nach dem Fachblatt: Block 2 erklärt über Block 1 hinaus weitere 8 % der Varianz', () => {
    const st = saetzeHierreg(beispiel(), id);
    expect(n(st.haupt)).toContain('Block 2 erklärt über Block 1 hinaus weitere 8 % der Varianz, ΔR² = ,08, F(2, 96) = 5,43, p = ,006.');
    expect(n(st.haupt)).toMatch(/^Block 1 erklärt 20 % der Varianz, R² = ,20, F\(2, 97\) = /);
    expect(st.apa).toMatch(/^Block 1: R² = ,20, F\(2, 97\) = [\d,]+, p < ,001; Block 2: ΔR² = ,08, F\(2, 96\) = 5,43, p = ,006$/);
  });
  it('kein bedeutsamer Zuwachs: „keinen bedeutsamen Anteil“, ΔR² genannt', () => {
    const b = block(2, 0.21, 0.2, 2, 96, ['x3', 'x4']);
    expect(b.p).toBeGreaterThan(0.05);
    expect(blockSatz(b)).toMatch(/^Block 2 erklärt über Block 1 hinaus keinen bedeutsamen Anteil, ΔR² = ,01, F\(2, 96\) = 0,6\d, p = ,\d+\.$/);
  });
  it('drei Blöcke: Block 3 geht über die Blöcke 1 und 2 hinaus', () => {
    expect(n(blockSatz(block(3, 0.5, 0.4, 1, 90, ['x5'])))).toMatch(/^Block 3 erklärt über die Blöcke 1 und 2 hinaus weitere 10 % der Varianz, ΔR² = ,10, F\(1, 90\)/);
  });
  it('Zusatz: Blöcke, Fälle in allen Blöcken, Lücken in späteren Blöcken, Koeffizienten; Vorsicht: Reihenfolge begründen, keine Ursache', () => {
    const ohne = saetzeHierreg(beispiel(), id);
    expect(ohne.zusatz).toContain('Block 1: „x1“ und „x2“ · Block 2: „x3“ und „x4“');
    expect(ohne.zusatz).toContain('Alle Blöcke rechnen auf denselben 100 Fällen.');
    expect(ohne.zusatz).not.toContain('fehlen');
    const mit = saetzeHierreg({ ...beispiel(), luecken: 7 }, id);
    expect(mit.zusatz).toContain('7 Fälle fehlen wegen Lücken in späteren Blöcken und fehlen darum auch in Block 1.');
    expect(saetzeHierreg({ ...beispiel(), luecken: 1 }, id).zusatz).toContain('Ein Fall fehlt wegen Lücken in späteren Blöcken und fehlt darum auch in Block 1.');
    expect(mit.zusatz).toContain('tragen „x2“ (B = 0,50, p = ,010) und „x4“ (B = 0,50, p = ,001) jeweils einzeln signifikant bei');
    expect(mit.vorsicht).toContain('nicht eine Ursache');
    expect(mit.vorsicht).toContain('theoretisch zu begründen');
    expect(mit.marken.some(m => m.hinweis && /7 Fälle/.test(m.text))).toBe(true);
  });
  it('englisch: Satz und Zusatz', () => {
    s.einst.sprache = 'en';
    const st = saetzeHierreg({ ...beispiel(), luecken: 2 }, id);
    expect(n(st.haupt)).toContain('Block 2 explains a further 8% of the variance beyond block 1, ΔR² = .08, F(2, 96) = 5.43, p = .006.');
    expect(st.zusatz).toContain('All blocks are calculated on the same 100 cases. 2 cases are missing because of gaps in later blocks and are therefore also left out of block 1.');
    expect(st.apa).toMatch(/Block 2: ΔR² = \.08, F\(2, 96\) = 5\.43, p = \.006$/);
  });
  it('Einzahl und Mehrzahl als ganze Sätze: ein Fall fehlt, ein Prädiktor trägt bei; Mehrzahl daneben', () => {
    const eins = { ...beispiel(), luecken: 1, koeffizienten: beispiel().koeffizienten.map((k, i) => (i === 1 ? k : { ...k, p: 0.5 })) };
    const st = saetzeHierreg(eins, id);
    expect(st.zusatz).toContain('Ein Fall fehlt wegen Lücken in späteren Blöcken und fehlt darum auch in Block 1.');
    expect(st.zusatz).toContain('trägt „x2“ (B = 0,50, p = ,010) einzeln signifikant bei');
    const viele = saetzeHierreg({ ...beispiel(), luecken: 3 }, id);
    expect(viele.zusatz).toContain('3 Fälle fehlen wegen Lücken in späteren Blöcken und fehlen darum auch in Block 1.');
    expect(viele.zusatz).toContain('tragen „x2“ (B = 0,50, p = ,010) und „x4“ (B = 0,50, p = ,001) jeweils einzeln signifikant bei');
    s.einst.sprache = 'en';
    expect(saetzeHierreg(eins, id).zusatz).toContain('One case is missing because of gaps in later blocks and is therefore also left out of block 1.');
    expect(saetzeHierreg(eins, id).zusatz).toContain('„x2“'.replace(/„|“/g, '"') + ' (B = 0.50, p = .010) makes a significant contribution of its own');
    expect(saetzeHierreg({ ...beispiel(), luecken: 3 }, id).zusatz).toContain('make a significant contribution of their own');
  });
  it('Koeffizienten-Tabelle: „beiden Blöcken“ bei zwei, „allen drei Blöcken“ bei drei', () => {
    const titel = (e: Hierreg) => tabellenHierreg(e, id)[1]!.title!.t;
    expect(titel(beispiel())).toBe('Koeffizienten des Modells mit beiden Blöcken');
    expect(titel({ ...beispiel(), bloecke: [...beispiel().bloecke, block(3, 0.3, 0.28131, 1, 95, ['x5'])] })).toBe('Koeffizienten des Modells mit allen drei Blöcken');
    s.einst.sprache = 'en';
    expect(titel(beispiel())).toBe('Coefficients of the model with both blocks');
  });
  it('sinkendes korrigiertes R² wird genannt', () => {
    const b2 = { ...block(2, 0.205, 0.2, 2, 96, ['x3']), r2korr: 0.15 }, b1 = { ...block(1, 0.2, 0, 2, 97, ['x1']), r2korr: 0.18 };
    expect(saetzeHierreg({ ...beispiel(), bloecke: [b1, b2] }, id).zusatz).toContain('Das korrigierte R² sinkt bei Block 2');
  });
  it('Tabellen: Blöcke und Koeffizienten des letzten Modells', () => {
    const t = tabellenHierreg(beispiel(), id);
    expect(t.map(x => x.label)).toEqual(['Hierarchical Regression', 'Hierarchical Regression Coefficients']);
    expect(t[0]!.rows).toBe(3);    // Kopf + 2 Blöcke
    expect(t[1]!.rows).toBe(6);    // Kopf + Konstante + 4
  });
});

describe('G4: Wahl der Blöcke', () => {
  it('Voreinstellung verteilt gleichmäßig; Wahl überstimmt', () => {
    expect([0, 1, 2, 3, 4].map(i => hierStandard(i, 5, 3))).toEqual([1, 1, 2, 2, 3]);
    const w = { ...leereHier(), an: true };
    expect(hierBloecke(['a', 'b', 'c'], w)).toEqual([['a', 'b'], ['c']]);
    w.block = { a: 2 };
    expect(hierBloecke(['a', 'b', 'c'], w)).toEqual([['b'], ['a', 'c']]);
    expect(hierBlockVon(['a', 'b'], { ...w, anzahl: 2, block: { a: 3 } }, 'a')).toBe(2);   // außerhalb der Blockzahl: letzter Block
  });
  it('gültig nur mit Haken und jedem Block belegt', () => {
    expect(hierGueltig(['a', 'b'], leereHier())).toBe(false);
    expect(hierGueltig(['a', 'b'], { ...leereHier(), an: true })).toBe(true);
    expect(hierGueltig(['a'], { ...leereHier(), an: true })).toBe(false);
    expect(hierGueltig(['a', 'b', 'c'], { an: true, anzahl: 3, block: { a: 1, b: 1, c: 1 } })).toBe(false);   // Blöcke 2 und 3 leer
    expect(hierGueltig(['a', 'b', 'c'], { an: true, anzahl: 3, block: {} })).toBe(true);
    expect(kopiereHier({ an: true, anzahl: 3, block: { a: 2 } })).toEqual({ an: true, anzahl: 3, block: { a: 2 } });
  });
});

describe('G4: Sätze aus echten Läufen', () => {
  it('Fall a und f gegen die gespeicherten Zahlen: Satz nennt ΔR², F und p des Blocks', () => {
    for (const name of ['a_zwei_bloecke', 'f_ohne_zugewinn']) {
      const f = (erwartet as unknown as { faelle: { name: string; ziel: string; bloecke_spalten: string[][]; daten: Record<string, (number | null)[]> }[] }).faelle.find(x => x.name === name)!;
      const namen = Object.keys(f.daten), n = f.daten[f.ziel]!.length;
      const csv = namen.join(',') + '\n' + Array.from({ length: n }, (_, i) => namen.map(k => f.daten[k]![i] ?? '').join(',')).join('\n') + '\n';
      const b = zurEngine(leseCsv(csv));
      e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv });
      const t = f.bloecke_spalten.map(x => regTerme(x));
      const erg = hierreg(e.run(hierregBefehl(f.ziel, t)), f.ziel, t), st = saetzeHierreg(erg, id);
      const b2 = erg.bloecke[1]!;
      expect(st.haupt, name).toContain(`ΔR² = ${b2.dr2.toFixed(2).replace(/^0\./, ',')}, F(${b2.df1}, ${b2.df2})`);
      if (name === 'f_ohne_zugewinn') { expect(st.haupt).toContain('keinen bedeutsamen Anteil'); expect(st.zusatz).toContain('Das korrigierte R² sinkt bei Block 2'); }
    }
  });
});
