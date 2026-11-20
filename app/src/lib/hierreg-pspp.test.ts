import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import { regressionsModelle } from './regressionlesen';
import { nodeEngine } from './testengine';
import erwartet from './testdaten/hierreg-erwartet.json';

/* Fachblatt Welle 2, Paket B (G4): Liefert PSPP 2.1.1 mit einem eigenen REGRESSION-Lauf je Block (cumulativ, auf denselben Fällen) dieselben Werte wie R?
 * Sollwerte: scripts/hierreg-erwartet.R (summary(lm), anova(m_(k-1), m_k), Koeffizienten des letzten Modells). Toleranz 1e-8 (relativ bei Werten über 1, sonst absolut).
 * Dieser Test hängt NICHT von app/src/lib/hierreg.ts ab und ist darum schon vor dem Bau grün (hierreg.test.ts ist rot, bis das Modul da ist).
 *
 * Was der Test festhält:
 *  - Jeder Block ist ein eigener Lauf `REGRESSION /VARIABLES=<Blöcke 1..k> /DEPENDENT=y /METHOD=ENTER` (mehrere /METHOD=ENTER in einem Lauf gehen in PSPP 2.1.1 nicht).
 *    Die Fälle werden VORHER gefiltert (TEMPORARY. SELECT IF auf Ziel und ALLE Spalten ALLER Blöcke), sonst rechnet Block 1 auf mehr Fällen als Block 2.
 *  - ΔR², F-Änderung und p entstehen aus den R² der Läufe (PSPP gibt sie nicht aus): F = ((R²k − R²(k−1)) / df1) / ((1 − R²k) / df2), df1 = neue Prädiktoren, df2 = Rest-df des größeren Modells.
 *  - Gruppen-Prädiktoren gehen als 0/1-Spalten ein (hier fertig in der CSV: g2, g3; das Modul bildet sie mit RECODE, regfaktor.ts). */

type Block = { nr: number; spalten: string[]; anzahl: number; r2: number; r2korr: number; dr2: number; f: number; df1: number; df2: number; p: number; n: number };
type Koef = { name: string; b: number; se: number; t: number; p: number; beta: number };
interface Fall {
  name: string; ziel: string; bloecke_spalten: string[][]; gruppen: string[]; daten: Record<string, (number | null)[]>; n_gueltig: number; n_luecken: number;
  bloecke: Block[]; koeffizienten: Koef[]; konstante: Omit<Koef, 'beta'>; r2_block1_ungefiltert?: number; n_block1_ungefiltert?: number;
}
const faelle = (erwartet as unknown as { faelle: Fall[] }).faelle;
const fall = (n: string) => faelle.find(f => f.name === n)!;

/** Gleich bis 1e-8: relativ bei Werten über 1, absolut darunter. */
const nah = (ist: number | undefined, soll: number, was: string, tol = 1e-8) => {
  expect(ist, was).toBeTypeOf('number');
  expect(Math.abs(ist! - soll), `${was}: PSPP ${ist} gegen R ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
};

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

/** Spaltennamen je Block in PSPP: Gruppen-Spalten als ihre 0/1-Spalten (g → g2, g3; Stufen = sortierte Codes, erste = Vergleichsgruppe). */
function pspBloecke(f: Fall): string[][] {
  return f.bloecke_spalten.map(b => b.flatMap(s => (f.gruppen.includes(s) ? stufen(f, s).slice(1).map(w => `${s}${w}`) : [s])));
}
const stufen = (f: Fall, s: string) => [...new Set(f.daten[s]!.filter((v): v is number => v !== null))].sort((a, b) => a - b);

/** Fall laden: alle Spalten, Gruppen-Spalten zusätzlich als 0/1-Spalten (leer, wenn der Code fehlt). Fehlend = leeres Feld. */
function lade(f: Fall) {
  const spalten: Record<string, (number | null)[]> = { ...f.daten };
  for (const s of f.gruppen) for (const w of stufen(f, s).slice(1)) spalten[`${s}${w}`] = f.daten[s]!.map(v => (v === null ? null : v === w ? 1 : 0));
  const namen = Object.keys(spalten), n = f.daten[f.ziel]!.length;
  const csv = namen.join(',') + '\n' + Array.from({ length: n }, (_, i) => namen.map(k => spalten[k]![i] ?? '').join(',')).join('\n') + '\n';
  const b = zurEngine(leseCsv(csv));
  e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv });
}
/** Ein Lauf je Block; `filtern`: vorher auf die Fälle beschränken, die in Ziel und in ALLEN Blöcken vollständig sind. */
function laufBlock(f: Fall, k: number, filtern: boolean) {
  const alle = pspBloecke(f).flat();
  const vars = pspBloecke(f).slice(0, k + 1).flat();
  const auswahl = filtern ? `TEMPORARY.\nSELECT IF (${[f.ziel, ...alle].map(v => `NOT MISSING(${v})`).join(' AND ')}).\n` : '';
  return regressionsModelle(e.run(`${auswahl}REGRESSION\n  /VARIABLES=${vars.join(' ')}\n  /DEPENDENT=${f.ziel}\n  /METHOD=ENTER\n  /STATISTICS=COEFF R ANOVA CI(95).`))[0]!;
}

describe('PSPP REGRESSION je Block gegen R summary(lm) und anova(m_(k-1), m_k)', () => {
  for (const name of ['a_zwei_bloecke', 'b_drei_bloecke', 'c_luecken_in_block2', 'd_gruppe_in_block2', 'e_swiss', 'f_ohne_zugewinn']) {
    it(`${name}: n, R², korrigiertes R², ΔR², F-Änderung mit df und p je Block wie R (1e-8)`, () => {
      const f = fall(name); lade(f);
      let r2vor = 0, dfRestVor = f.n_gueltig - 1, anzahlVor = 0;
      f.bloecke.forEach((soll, k) => {
        const m = laufBlock(f, k, true);
        expect(m.n, `${name} Block ${soll.nr}: Zahl der Fälle`).toBe(f.n_gueltig);
        nah(m.r2, soll.r2, `${name} Block ${soll.nr} R²`);
        nah(m.r2korr, soll.r2korr, `${name} Block ${soll.nr} korrigiertes R²`);
        const df1 = m.df1 - anzahlVor, df2 = m.df2;
        expect(df1, `${name} Block ${soll.nr}: df1 = neue Koeffizienten (Dummies zählen mit)`).toBe(soll.df1);
        expect(df2, `${name} Block ${soll.nr}: df2 = Rest-df des größeren Modells`).toBe(soll.df2);
        expect(dfRestVor - df2, 'Rest-df sinkt um df1').toBe(df1);
        nah(m.r2 - r2vor, soll.dr2, `${name} Block ${soll.nr} ΔR²`);
        const F = ((m.r2 - r2vor) / df1) / ((1 - m.r2) / df2);
        nah(F, soll.f, `${name} Block ${soll.nr} F-Änderung`);
        r2vor = m.r2; dfRestVor = df2; anzahlVor = m.df1;
      });
    });
  }

  for (const name of ['a_zwei_bloecke', 'b_drei_bloecke', 'c_luecken_in_block2', 'd_gruppe_in_block2', 'e_swiss', 'f_ohne_zugewinn']) {
    it(`${name}: Koeffizienten des letzten Modells (B, SE, t, p, Beta) wie R, in der Reihenfolge der Blöcke`, () => {
      const f = fall(name); lade(f);
      const m = laufBlock(f, f.bloecke.length - 1, true);
      expect(m.terme.length, 'Zahl der Koeffizienten').toBe(f.koeffizienten.length);
      f.koeffizienten.forEach((soll, i) => {
        const ist = m.terme[i]!;
        nah(ist.b, soll.b, `${name} ${soll.name} B`); nah(ist.se, soll.se, `${name} ${soll.name} SE`); nah(ist.t, soll.t, `${name} ${soll.name} t`);
        nah(ist.p, soll.p, `${name} ${soll.name} p`); nah(ist.beta, soll.beta, `${name} ${soll.name} Beta`);
      });
      nah(m.konstante.b, f.konstante.b, `${name} Konstante B`);
    });
  }

  it('Fall c: OHNE Vorab-Filter rechnet Block 1 auf mehr Fällen (n = 70) und weicht von R ab - PSPP filtert nicht über die Läufe hinweg', () => {
    const f = fall('c_luecken_in_block2'); lade(f);
    const ohne = laufBlock(f, 0, false);
    expect(ohne.n).toBe(f.n_block1_ungefiltert);
    expect(ohne.n).toBeGreaterThan(f.n_gueltig);
    nah(ohne.r2, f.r2_block1_ungefiltert!, 'Block 1 ungefiltert gegen R (lm(y ~ x1) auf allen 70)');
    expect(Math.abs(ohne.r2 - f.bloecke[0]!.r2), 'ungefiltert ≠ gefiltert').toBeGreaterThan(1e-3);
    const mit = laufBlock(f, 0, true);
    nah(mit.r2, f.bloecke[0]!.r2, 'Block 1 gefiltert gegen R auf den 63 Fällen');
  });

  it('Fall f (kein Zugewinn): das korrigierte R² sinkt von Block 1 zu Block 2 - PSPP zeigt es', () => {
    const f = fall('f_ohne_zugewinn'); lade(f);
    const m1 = laufBlock(f, 0, true), m2 = laufBlock(f, 1, true);
    expect(m2.r2).toBeGreaterThan(m1.r2);
    expect(m2.r2korr).toBeLessThan(m1.r2korr);
  });
});
