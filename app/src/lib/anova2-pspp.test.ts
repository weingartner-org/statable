import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import { finde, spalte } from './tabelle';
import { nodeEngine } from './testengine';
import erwartet from './testdaten/anova2-ancova-erwartet.json';

/* Fachblatt Welle 2, Paket A (G3): Liefert PSPP 2.1.1 mit `GLM y BY a b /DESIGN=a b a*b` dieselben Typ-III-Werte wie R?
 * Sollwerte: scripts/anova2-ancova-erwartet.R (car::Anova type 3 mit contr.sum, zweite Quelle afex). Toleranz 1e-8 (relativ, bei Werten unter 1 absolut).
 * Dieser Test hängt NICHT von app/src/lib/anova2.ts ab und ist darum schon vor dem Bau grün (anova2.test.ts ist rot, bis das Modul da ist).
 *
 * Befunde (11 Stellen verglichen, Stand PSPP 2.1.1):
 *  - Fälle a (balanciert), b (unbalanciert, Zellgrößen 4 bis 12) und f (2x2, fehlende y): SS, df, F und p stimmen mit R überein.
 *  - GLM verlangt ZAHLEN als Faktoren: Text-Spalten werden mit der Warnung „a is not a numeric variable. It will not be included in the variable list.“ still
 *    aus dem Modell geworfen (kein Fehler, keine Tabelle). Der Bauer muss Text-Gruppen vorher in Zahlen kodieren (RECODE/AUTORECODE, nur TEMPORARY).
 *  - PSPP lässt bei unbalancierten Daten (b, e, f) die Zeile „Intercept“ weg, bei balancierten (a) steht sie da. Die Tests lesen die Zeilen darum nach Namen.
 *  - Leere Zelle (e): PSPP meldet NICHTS (keine Warnung, kein Fehler) und gibt eine Tabelle aus, deren Zeile „a“ praktisch 0 ist (SS 4e-11, p = 1,000) -
 *    R bricht ab („there are aliased coefficients in the model“). Das Modul muss leere Zellen VOR dem Aufruf selbst erkennen (leereZellen in anova2.ts). */

type Zeile = { ss: number; df: number; f: number; p: number };
type ZeileR = { ss: number; df: number; F: number; p: number };
interface Fall {
  name: string; a_stufen: string[]; b_stufen: string[]; daten: { a: string[]; b: string[]; y: (number | null)[] };
  typ3?: Record<'a' | 'b' | 'a:b', ZeileR> & { fehler: { ss: number; df: number; ms: number } }; typ1_ss?: Record<'a' | 'b' | 'a:b', number>; fehler?: string; n_gueltig: number;
}
const faelle = (erwartet as unknown as { g3: Fall[] }).g3;
const fall = (n: string) => faelle.find(f => f.name === n)!;

/** Gleich bis 1e-8: relativ bei Werten über 1, absolut darunter (SS, F und p liegen oft unter 1). */
const nah = (ist: number | undefined, soll: number, was: string, tol = 1e-8) => {
  expect(ist, was).toBeTypeOf('number');
  expect(Math.abs(ist! - soll), `${was}: PSPP ${ist} gegen R ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
};

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

/** Fall in die Engine laden: Faktoren als Zahlen 1, 2, 3 (Reihenfolge der Stufen), fehlendes y als leeres Feld. */
function lade(f: Fall) {
  const csv = 'a,b,y\n' + f.daten.a.map((a, i) => `${f.a_stufen.indexOf(a) + 1},${f.b_stufen.indexOf(f.daten.b[i]!) + 1},${f.daten.y[i] ?? ''}`).join('\n') + '\n';
  const b = zurEngine(leseCsv(csv));
  e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv });
}
const glm = () => e.run('GLM y BY a b\n  /DESIGN=a b a*b.');

function tabelle(items: ReturnType<typeof glm>) {
  const t = finde(items, /^Tests of Between-Subjects Effects$/);
  if (!t) return null;
  const c = { ss: spalte(t, /^Type III Sum Of Squares$/), df: spalte(t, /^df$/), f: spalte(t, /^F$/), p: spalte(t, /^Sig\.$/) };
  const zeile = (name: string): Zeile => {
    const i = t.t.findIndex(z => z[0] === name);
    expect(i, `Zeile „${name}“ in PSPPs Tabelle`).toBeGreaterThan(0);
    return { ss: t.n[i]![c.ss]!, df: t.n[i]![c.df]!, f: t.n[i]![c.f]!, p: t.n[i]![c.p]! };
  };
  return { fehler: zeile('Error'), a: zeile('a'), b: zeile('b'), ab: zeile('a × b'), zeilen: t.t.map(z => z[0]!) };
}

describe('PSPP GLM (Typ III) gegen R car::Anova(type = 3) und afex', () => {
  for (const name of ['a_balanciert_2x3', 'b_unbalanciert_2x3', 'f_fehlende_werte_2x2']) {
    it(`${name}: SS, df, F und p von a, b, a × b und Fehler wie R (1e-8)`, () => {
      const f = fall(name); lade(f);
      const t = tabelle(glm())!;
      expect(t, 'PSPP gibt die Tabelle „Tests of Between-Subjects Effects“ aus').not.toBeNull();
      const R = f.typ3!;
      for (const [k, ist, soll] of [['a', t.a, R.a], ['b', t.b, R.b], ['a:b', t.ab, R['a:b']]] as const) {
        nah(ist.ss, soll.ss, `${name} ${k} SS`); nah(ist.df, soll.df, `${name} ${k} df`); nah(ist.f, soll.F, `${name} ${k} F`); nah(ist.p, soll.p, `${name} ${k} p`);
      }
      nah(t.fehler.ss, R.fehler.ss, `${name} Fehler SS`); nah(t.fehler.df, R.fehler.df, `${name} Fehler df`);
      nah(t.fehler.ss / t.fehler.df, R.fehler.ms, `${name} Fehler MS`);
    });
  }

  it('Typ III ist wirklich Typ III: bei den ungleichen Zellen (b) liegt SS von b weit von der Typ-I-Zerlegung (nacheinander) entfernt, PSPP trifft Typ III', () => {
    const f = fall('b_unbalanciert_2x3'); lade(f);
    const t = tabelle(glm())!;
    expect(Math.abs(f.typ1_ss!.b - f.typ3!.b.ss), 'Typ I und Typ III unterscheiden sich in diesem Fall').toBeGreaterThan(1);
    expect(Math.abs(t.b.ss - f.typ1_ss!.b)).toBeGreaterThan(1);
    nah(t.b.ss, f.typ3!.b.ss, 'b SS Typ III');
  });

  it('Text als Faktor: PSPP wirft die Spalten still aus dem Modell (Warnung, keine Tabelle) - der Bauer muss in Zahlen kodieren', () => {
    const f = fall('a_balanciert_2x3');
    const csv = 'a,b,y\n' + f.daten.a.map((a, i) => `${a},${f.daten.b[i]},${f.daten.y[i]}`).join('\n') + '\n';
    const b = zurEngine(leseCsv(csv));
    e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv });
    const items = glm();
    expect(tabelle(items)).toBeNull();
    expect(items.some(i => i.type === 'message' && /not a numeric variable/.test(i.text))).toBe(true);
  });

  it('Leere Zelle (e): PSPP schweigt und rechnet etwas anderes als R - darum muss anova2.ts die leere Zelle selbst abfangen', () => {
    const f = fall('e_leere_zelle');
    expect(f.fehler, 'R bricht ab').toMatch(/aliased coefficients/);
    lade(f);
    const items = glm();
    expect(items.some(i => i.type === 'message'), 'PSPP gibt keine Warnung oder Fehlermeldung aus').toBe(false);
    const t = tabelle(items)!;
    expect(t, 'PSPP gibt trotzdem eine Tabelle aus').not.toBeNull();
    expect(t.a.ss, 'Zeile a ist praktisch 0 (Typ-III-Test kann bei leerer Zelle nicht stimmen)').toBeLessThan(1e-6);
  });
});
