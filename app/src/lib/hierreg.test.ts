import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import { regFaktor, regTerme, type RegFaktor, type RegTerm } from './regfaktor';
import type { Spalte } from './verzeichnis';
import { nodeEngine } from './testengine';
import { hierreg, hierregBefehl } from './hierreg';
import erwartet from './testdaten/hierreg-erwartet.json';

/* Fachblatt Welle 2, Paket B (docs/fachblaetter/WELLE2-PSYCHOLOGIE.md): G4 hierarchische Regression.
 * Sollwerte: R 4.6.1, scripts/hierreg-erwartet.R -> testdaten/hierreg-erwartet.json (Rohdaten stehen im JSON). Sechs Fälle:
 *   a zwei Blöcke · b drei Blöcke · c drei Blöcke mit Lücken NUR in x3 (Block 2) - alle Blöcke auf denselben 63 Fällen · d Block 2 = Gruppen-Prädiktor mit 3 Stufen (df1 = 2)
 *   e datasets::swiss (Mosteller & Tukey 1977; Endmodell = lm(Fertility ~ ., swiss) aus ?swiss, R² ,7067) · f Block ohne Zugewinn (ΔR² < ,0005, korrigiertes R² sinkt).
 * Erste Quelle anova(m_(k-1), m_k) und summary(lm); zweite Quelle die Formel ΔF = ((R²k − R²(k−1)) / df1) / ((1 − R²k) / df2) (im Skript per stopifnot gleich, 1e-10).
 * Toleranz 1e-8 (relativ bei Werten über 1, sonst absolut; p-Werte unter 1e-4 zusätzlich relativ 1e-5).
 *
 * ⚠ FACHLICHER BEFUND zum Fachblatt: `anova(m1, m2, m3)` in EINEM Aufruf rechnet jeden Schritt mit dem Fehlerterm des GRÖSSTEN Modells (stats:::anova.lmlist). Nur der letzte Schritt
 *   ist gleich der paarweisen Rechnung. Für Block 2 von 3 weicht F ab (Fall b: 15,98 paarweise gegen 15,80 in der Liste; Fall c: 5,33 gegen 5,28). Der Test verlangt die paarweise
 *   Rechnung (df2 = df_Fehler des größeren Modells DIESES Schritts, wie SPSS „F Change“ und wie das Fachblatt in „Fallen“ sagt); das JSON hält f_liste zum Vergleich.
 *
 * ---------- API, die der Bauer in app/src/lib/hierreg.ts anlegt (diese Tests sind absichtlich rot, bis das Modul da ist) ----------
 *
 *  Rechenweg: je Block ein eigener PSPP-`REGRESSION`-Lauf (/METHOD=ENTER, PSPP 2.1.1 kennt nur ENTER und keine mehreren Methoden in einem Lauf) mit den Prädiktoren der Blöcke 1 bis k
 *  (Modell k). Vor JEDEM Lauf `TEMPORARY.` + `SELECT IF` auf Ziel und alle Prädiktoren ALLER Blöcke (bei Gruppen-Prädiktoren auf die erste Hilfsspalte), damit alle Läufe dieselben Fälle
 *  haben (PSPP filtert nicht über Läufe hinweg: hierreg-pspp.test.ts). Gruppen-Prädiktoren: Hilfsspalten wie regfaktor.ts (`regRecodes`).
 *
 *    export function hierregBefehl(ziel: string, bloecke: RegTerm[][]): string
 *        // bloecke = 2 oder 3 Blöcke, jeder mit mindestens einem Prädiktor (RegTerm aus regfaktor.ts: Zahlenspalte oder Gruppen-Spalte); sonst Error (throw).
 *        // Ergebnis: ein Skript mit einem REGRESSION-Lauf je Block, /VARIABLES des Laufs k = Spalten der Blöcke 1..k in der Reihenfolge der Blöcke (Gruppe → ihre Hilfsspalten).
 *    export function hierreg(items: OutputItem[], ziel: string, bloecke: RegTerm[][]): Hierreg
 *        // items = Ausgabe von hierregBefehl; bloecke dieselben wie beim Befehl.
 *    export interface HierBlock {
 *      nr: number;                  // 1, 2, 3
 *      spalten: string[];           // Namen der gewählten Spalten dieses Blocks (Gruppen-Spalte unter ihrem Spaltennamen, nicht als Hilfsspalten)
 *      anzahl: number;              // neue Koeffizienten = df1 (Gruppe mit k Stufen zählt k − 1)
 *      r2: number; r2korr: number;  // R² und korrigiertes R² des Modells bis einschließlich dieses Blocks
 *      dr2: number;                 // Block 1: = r2 (gegen das Nullmodell); sonst r2 − r2 des Vorblocks
 *      f: number; df1: number; df2: number; p: number;   // F-Änderung: ((dr2) / df1) / ((1 − r2) / df2), df2 = Rest-df des Modells dieses Blocks, p obere Wahrscheinlichkeit der F-Verteilung
 *    }
 *    export interface HierKoef { name: string; spalte: string; b: number; se: number; t: number; p: number; beta: number }
 *        // spalte = gewählte Spalte (bei Gruppen-Prädiktoren die Gruppen-Spalte); beta = standardisiertes Beta (PSPP „Beta“); Konstante: beta = NaN
 *    export interface Hierreg {
 *      art: 'hierreg'; ziel: string; n: number;             // n = Fälle in ALLEN Blöcken (gleich für jeden Block)
 *      bloecke: HierBlock[];
 *      koeffizienten: HierKoef[];                           // Modell des LETZTEN Blocks, ohne Konstante, Reihenfolge der Spalten Block 1, 2, 3 (Gruppe → Hilfsspalten)
 *      konstante: HierKoef;
 *    }
 *  Nicht Teil dieser Tests: Sätze/Tabellen-Texte (Fachblatt: „Block 2 erklärt über Block 1 hinaus weitere 8 % der Varianz, ΔR² = ,08, F(2, 96) = 5,43, p = ,006.“) - eigener Test beim Bau. */

type Block = { nr: number; spalten: string[]; anzahl: number; r2: number; r2korr: number; dr2: number; f: number; df1: number; df2: number; p: number; n: number };
type Koef = { name: string; b: number; se: number; t: number; p: number; beta: number };
interface Fall {
  name: string; ziel: string; bloecke_spalten: string[][]; gruppen: string[]; daten: Record<string, (number | null)[]>; n_gueltig: number; n_luecken: number;
  bloecke: Block[]; koeffizienten: Koef[]; konstante: Omit<Koef, 'beta'>;
}
const faelle = (erwartet as unknown as { faelle: Fall[] }).faelle;
const fall = (n: string) => faelle.find(f => f.name === n)!;
const NAMEN = faelle.map(f => f.name);

/** Gleich bis 1e-8: relativ bei Werten über 1, absolut darunter; mit `klein` (p-Werte) bei Werten unter 1e-4 zusätzlich relativ 1e-5. */
const nah = (ist: number | undefined, soll: number, was: string, klein = false, tol = 1e-8) => {
  expect(ist, was).toBeTypeOf('number');
  expect(Math.abs(ist! - soll), `${was}: Modul ${ist} gegen R ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
  if (klein && Math.abs(soll) < 1e-4) expect(Math.abs(ist! - soll) / Math.abs(soll), `${was} relativ`).toBeLessThanOrEqual(1e-5);
};

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

/** Gruppen-Spalten als Faktor (Vergleichsgruppe = kleinster Code) - wie die App sie aus dem Verzeichnis baut. */
const gruppenSpalte = (name: string): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'nominal', format: '', fehlend: [], fehlendText: '', werteLabels: { 1: 'A', 2: 'B', 3: 'C' } });
function terme(f: Fall): RegTerm[][] {
  const vergeben = Object.keys(f.daten);
  const faktor = (n: string): RegFaktor | null =>
    f.gruppen.includes(n) ? regFaktor(gruppenSpalte(n), f.daten[n]!.filter((v): v is number => v !== null), vergeben) : null;
  return f.bloecke_spalten.map(b => regTerme(b, faktor));
}
/** Fall in die Engine laden (Rohwerte, fehlend = leeres Feld). */
function lade(f: Fall) {
  const namen = Object.keys(f.daten), n = f.daten[f.ziel]!.length;
  const csv = namen.join(',') + '\n' + Array.from({ length: n }, (_, i) => namen.map(k => f.daten[k]![i] ?? '').join(',')).join('\n') + '\n';
  const b = zurEngine(leseCsv(csv));
  e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv });
}

describe('hierregBefehl: ein Lauf je Block, dieselben Fälle', () => {
  for (const name of NAMEN) {
    it(`${name}: ein REGRESSION-Lauf je Block, kumulierte Spalten, Vorab-Filter auf Ziel und ALLE Spalten ALLER Blöcke`, () => {
      const f = fall(name), t = terme(f);
      const befehl = hierregBefehl(f.ziel, t);
      const laeufe = befehl.split(/(?=^TEMPORARY\.)/m).filter(s => /REGRESSION/.test(s));
      expect(laeufe.length, 'ein Lauf je Block, jeder mit eigenem TEMPORARY.').toBe(f.bloecke.length);
      expect((befehl.match(/^REGRESSION\b/gm) ?? []).length).toBe(f.bloecke.length);
      // Spalten, mit denen PSPP rechnet: Zahlenspalten selbst, Gruppen-Spalten als Hilfsspalten
      const psp = t.map(b => b.flatMap(x => (x.faktor ? x.faktor.hilfs : [x.spalte])));
      laeufe.forEach((lauf, k) => {
        const vars = /\/VARIABLES=([^\n/]*)/.exec(lauf)?.[1]?.trim().split(/\s+/);
        expect(vars, `Block ${k + 1}: /VARIABLES`).toEqual([...psp.slice(0, k + 1).flat(), f.ziel]);   // die Zielspalte steht mit in /VARIABLES (so verlangt es SPSS; PSPP rechnet gleich)
        expect(lauf, `Block ${k + 1}: Ziel`).toMatch(new RegExp(`/DEPENDENT=${f.ziel}\\b`));
        expect(lauf).toMatch(/\/METHOD=ENTER/);
        const auswahl = /SELECT IF([\s\S]*?)\.\s*(?:\n|$)/.exec(lauf)?.[1] ?? '';
        expect(auswahl, `Block ${k + 1}: SELECT IF vor der Regression`).not.toBe('');
        expect(lauf.indexOf('SELECT IF'), 'SELECT IF steht vor REGRESSION').toBeLessThan(lauf.indexOf('REGRESSION'));
        for (const n of [f.ziel, ...t.flat().map(x => (x.faktor ? x.faktor.hilfs[0]! : x.spalte))]) expect(auswahl, `Block ${k + 1}: Filter nennt ${n}`).toContain(n);
      });
    });
  }
  it('nur 2 oder 3 Blöcke, jeder mit mindestens einem Prädiktor', () => {
    const t = regTerme;
    expect(() => hierregBefehl('y', [t(['x1', 'x2'])])).toThrow();
    expect(() => hierregBefehl('y', [t(['x1']), t(['x2']), t(['x3']), t(['x4'])])).toThrow();
    expect(() => hierregBefehl('y', [t(['x1']), t([])])).toThrow();
    expect(() => hierregBefehl('y', [t(['x1']), t(['x2'])])).not.toThrow();
    expect(() => hierregBefehl('y', [t(['x1']), t(['x2']), t(['x3'])])).not.toThrow();
  });
});

describe('hierreg: Blöcke und Koeffizienten gegen R (anova(m_(k-1), m_k), summary(lm))', () => {
  for (const name of NAMEN) {
    const f = fall(name);
    describe(`${name} (n = ${f.n_gueltig}, ${f.bloecke.length} Blöcke)`, () => {
      let erg: ReturnType<typeof hierreg>;
      beforeAll(() => { lade(f); const t = terme(f); erg = hierreg(e.run(hierregBefehl(f.ziel, t)), f.ziel, t); });

      it('Fälle: n gleich für alle Blöcke (listenweise über alle Blöcke), art und Ziel', () => {
        expect(erg.art).toBe('hierreg'); expect(erg.ziel).toBe(f.ziel);
        expect(erg.n).toBe(f.n_gueltig);
        expect(erg.bloecke.length).toBe(f.bloecke.length);
      });
      it('je Block: R², korrigiertes R², ΔR², F-Änderung mit df1/df2 und p wie R (1e-8)', () => {
        f.bloecke.forEach((soll, k) => {
          const b = erg.bloecke[k]!, was = `${name} Block ${soll.nr}`;
          expect(b.nr).toBe(soll.nr); expect(b.spalten, `${was} Spalten`).toEqual(soll.spalten);
          expect(b.anzahl, `${was} neue Koeffizienten (Dummies zählen mit)`).toBe(soll.anzahl);
          nah(b.r2, soll.r2, `${was} R²`); nah(b.r2korr, soll.r2korr, `${was} korrigiertes R²`); nah(b.dr2, soll.dr2, `${was} ΔR²`);
          expect(b.df1, `${was} df1`).toBe(soll.df1); expect(b.df2, `${was} df2 (Rest-df des größeren Modells)`).toBe(soll.df2);
          nah(b.f, soll.f, `${was} F-Änderung`); nah(b.p, soll.p, `${was} p`, true);
        });
      });
      it('ΔR² summiert sich zum R² des letzten Blocks; Block 1 ist gegen das Nullmodell (ΔR² = R²)', () => {
        nah(erg.bloecke.reduce((s, b) => s + b.dr2, 0), erg.bloecke.at(-1)!.r2, `${name} Summe ΔR²`);
        nah(erg.bloecke[0]!.dr2, erg.bloecke[0]!.r2, `${name} Block 1`);
      });
      it('Koeffizienten des letzten Modells: B, SE, t, p, Beta und Konstante wie R, in der Reihenfolge der Blöcke', () => {
        expect(erg.koeffizienten.length).toBe(f.koeffizienten.length);
        f.koeffizienten.forEach((soll, i) => {
          const k = erg.koeffizienten[i]!, was = `${name} ${soll.name}`;
          nah(k.b, soll.b, `${was} B`); nah(k.se, soll.se, `${was} SE`); nah(k.t, soll.t, `${was} t`); nah(k.p, soll.p, `${was} p`, true); nah(k.beta, soll.beta, `${was} Beta`);
        });
        nah(erg.konstante.b, f.konstante.b, `${name} Konstante B`); nah(erg.konstante.se, f.konstante.se, `${name} Konstante SE`);
        // spalte: Gruppen-Spalte unter ihrem Spaltennamen, Dummies mitgezählt
        const erwartetSpalten = f.bloecke_spalten.flat().flatMap(s => (f.gruppen.includes(s) ? Array(f.bloecke.find(b => b.spalten.includes(s))!.anzahl).fill(s) : [s]));
        expect(erg.koeffizienten.map(k => k.spalte)).toEqual(erwartetSpalten);
      });
    });
  }

  it('Fall c: Block 1 rechnet auf den 63 Fällen mit vollständigem x3 - nicht auf allen 70 (R² ,2804 statt des Wertes ohne Filter)', () => {
    const f = fall('c_luecken_in_block2'); lade(f);
    const t = terme(f), erg = hierreg(e.run(hierregBefehl(f.ziel, t)), f.ziel, t);
    expect(erg.n).toBe(63);
    expect(f.n_luecken).toBe(7);
    nah(erg.bloecke[0]!.r2, f.bloecke[0]!.r2, 'Block 1 R² auf 63 Fällen');
    nah(erg.bloecke[0]!.df2, 61, 'Block 1 df2 = 63 − 2');
  });
  it('Fall d: Gruppen-Prädiktor mit 3 Stufen = df1 2, df2 = 82 (87 Fälle: 3 Lücken in g oder y; 4 Koeffizienten + Konstante)', () => {
    const f = fall('d_gruppe_in_block2'); lade(f);
    const t = terme(f), erg = hierreg(e.run(hierregBefehl(f.ziel, t)), f.ziel, t);
    expect(erg.n).toBe(87);
    expect(erg.bloecke[1]!.df1).toBe(2); expect(erg.bloecke[1]!.df2).toBe(82);
    expect(erg.bloecke[1]!.spalten).toEqual(['g']);
  });
  it('Fall f: Block ohne Zugewinn - ΔR² fast 0, p groß, korrigiertes R² sinkt', () => {
    const f = fall('f_ohne_zugewinn'); lade(f);
    const t = terme(f), erg = hierreg(e.run(hierregBefehl(f.ziel, t)), f.ziel, t);
    expect(erg.bloecke[1]!.dr2).toBeGreaterThan(0); expect(erg.bloecke[1]!.dr2).toBeLessThan(5e-4);
    expect(erg.bloecke[1]!.p).toBeGreaterThan(0.5);
    expect(erg.bloecke[1]!.r2korr).toBeLessThan(erg.bloecke[0]!.r2korr);
  });
  it('Fall e (swiss): veröffentlichte Zahlen - R² ,7067, korrigiertes R² ,671, B der fünf Prädiktoren aus ?swiss', () => {
    const f = fall('e_swiss'); lade(f);
    const t = terme(f), erg = hierreg(e.run(hierregBefehl(f.ziel, t)), f.ziel, t);
    const l = erg.bloecke[1]!;
    expect(Math.round(l.r2 * 1e4) / 1e4).toBe(0.7067); expect(Math.round(l.r2korr * 1e3) / 1e3).toBe(0.671);
    expect(l.df1).toBe(3); expect(l.df2).toBe(41);
    expect(erg.koeffizienten.map(k => Math.round(k.b * 1e5) / 1e5)).toEqual([-0.17211, -0.25801, -0.87094, 0.10412, 1.07705]);
  });
});
