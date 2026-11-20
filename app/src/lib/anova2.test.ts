import { beforeAll, describe, expect, it } from 'vitest';
import { alsZahl, leseCsv, planeSpalten, zurEngine, type Tabelle } from './einlesen';
import { regFaktor, type RegFaktor } from './regfaktor';
import type { Spalte } from './verzeichnis';
import { nodeEngine } from './testengine';
import { anova2, anova2Befehl, kovarianz, kovarianzBefehl, leereZellen, type Anova2Daten, type AncovaDaten } from './anova2';
import erwartet from './testdaten/anova2-ancova-erwartet.json';

/* Fachblatt Welle 2, Paket A (docs/fachblaetter/WELLE2-PSYCHOLOGIE.md): G3 zweifaktorielle Varianzanalyse, G6 Kovarianzanalyse.
 * Sollwerte: R 4.6.1, scripts/anova2-ancova-erwartet.R -> testdaten/anova2-ancova-erwartet.json (Rohdaten stehen im JSON).
 *   G3: car::Anova(lm(y ~ a*b, contrasts = contr.sum), type = 3), zweite Quelle afex::aov_ez(type = 3) (im Skript per stopifnot gleich, 1e-8);
 *       eta2p mit zweiseitigem 95-%-KI; Zellmittel mit KI und einfache Effekte (emmeans), Holm je Richtung.
 *   G6: car::Anova(lm(y ~ g + x, contrasts = contr.sum), type = 3); zweite Quelle: Regression mit Dummies, F aus der Änderung von R2 (im Skript gleich);
 *       adjustierte Mittel beim Mittelwert der Kovariate (emmeans); Steigungstest anova(lm(y ~ g + x), lm(y ~ g * x)).
 * Toleranz 1e-8 (relativ bei Werten über 1, sonst absolut; p-Werte unter 1e-4 zusätzlich relativ 1e-5). Das KI von eta2p wird gegen die eigene genaue Lösung des
 * Skripts (`lo_genau`/`hi_genau`: uniroot auf der nichtzentralen F-Verteilung, tol 1e-13) geprüft; effectsize::eta_squared selbst löst gröber (bis 1,7e-5 daneben im Fall f)
 * und steht nur als Plausibilitätsprobe (1e-4) im Test. lib/effektki.ts eta2Bereich trifft die genaue Lösung auf 1,2e-9.
 *
 * ---------- API, die der Bauer in app/src/lib/anova2.ts anlegt (diese Tests sind absichtlich rot, bis das Modul da ist) ----------
 *
 *  G3 (Rechenweg: PSPP `GLM y BY a b /DESIGN=a b a*b` liefert SS, df, F, p des Typ-III-Modells; Zellstatistik und einfache Effekte rechnet das Modul aus den Rohdaten
 *      und dem Fehlerterm des Gesamtmodells):
 *    export interface Anova2Daten { a: string[]; b: string[]; y: (number | null)[]; aStufen: string[]; bStufen: string[] }
 *        // a[i], b[i], y[i] = ein Fall; y null (oder NaN) = fehlend, der Fall fällt weg. aStufen/bStufen = Reihenfolge der Stufen (bestimmt die Reihenfolge aller Ergebnislisten).
 *    export function leereZellen(d: Anova2Daten): { a: string; b: string }[]
 *        // Kombinationen aStufe × bStufe ohne gültigen Fall (nach Wegfall fehlender y). PSPP meldet leere Zellen NICHT (anova2-pspp.test.ts) - das Modul fängt sie selbst ab.
 *    export function anova2Befehl(y: string, a: string, b: string): string
 *        // PSPP-Syntax `GLM y BY a b\n  /DESIGN=a b a*b.` Die Faktoren müssen Zahlen sein (Text wirft PSPP still aus dem Modell): Text-Gruppen kodiert der Aufrufer vorher.
 *    export function anova2(items: OutputItem[], d: Anova2Daten): Anova2 | null
 *        // items = Ausgabe von anova2Befehl; null bei leerer Zelle (kein Ergebnis) - auch dann, wenn PSPP eine Tabelle geliefert hat.
 *    export interface Effekt2 { ss: number; df: number; f: number; p: number; etaP: number; etaPLo: number; etaPHi: number }   // etaP = SS / (SS + SS_Fehler), KI 95 % zweiseitig
 *    export interface Zelle2 { a: string; b: string; n: number; mittel: number; sd: number; se: number; lo: number; hi: number }
 *        // se/lo/hi: gepoolter Fehler des Gesamtmodells (sqrt(MSE / n)), t-Quantil mit df_Fehler (wie emmeans); sd = Streuung der Zelle selbst
 *    export interface Einfach2 { stufe: string; df1: number; df2: number; f: number; p: number; pHolm: number }
 *        // Test aller Zellmittel einer Zeile bzw. Spalte gleich, gemeinsamer Fehlerterm (wie emmeans::joint_tests); pHolm: Holm über die Stufen des festen Faktors
 *    export interface Anova2 {
 *      art: 'anova2'; n: number;                        // n = Fälle mit gültigem y
 *      a: Effekt2; b: Effekt2; ab: Effekt2; fehler: { ss: number; df: number; ms: number };
 *      zellen: Zelle2[];                                // erst alle b-Stufen der ersten a-Stufe, dann der zweiten ...
 *      einfachAJeB: Einfach2[];                         // Effekt von A je Stufe von B (stufe = Stufe von B), Reihenfolge bStufen
 *      einfachBJeA: Einfach2[];                         // Effekt von B je Stufe von A, Reihenfolge aStufen
 *      wechselwirkungBedeutsam: boolean;                // ab.p < 0,05
 *    }
 *
 *  G6 (Rechenweg: Regression mit Gruppen-Dummies wie regfaktor.ts; PSPP-Läufe mit demselben Fallsatz; GLM kennt in PSPP 2.1.1 keine Kovariate):
 *    export interface AncovaDaten { g: string[]; x: (number | null)[]; y: (number | null)[] }   // fehlendes x oder y: der Fall fällt weg (listenweise)
 *    export function kovarianzBefehl(ziel: string, gruppe: RegFaktor, kovariate: string): string
 *        // alle PSPP-Läufe, die kovarianz() braucht (mindestens: Regression mit Dummies + Kovariate wie regressionBefehl, Gesamttest der Gruppe ohne Dummies,
 *        // Lauf ohne Kovariate, Lauf mit Produktspalten Gruppe × Kovariate für den Steigungstest); alle auf denselben Fällen
 *    export function kovarianz(items: OutputItem[], d: AncovaDaten): Ancova
 *    export interface Ancova {
 *      art: 'ancova'; n: number; kovariateMittel: number;                     // Mittelwert der Kovariate über die Fälle im Modell
 *      gruppe: Effekt2; kovariate: Effekt2; fehler: { ss: number; df: number; ms: number }; // Typ III; gruppe.df = Stufen - 1
 *      b: number; r2: number;                                                // b = gemeinsame Steigung der Kovariate; r2 des Modells Gruppe + Kovariate
 *      gruppen: { name: string; n: number; mittelRoh: number; mittelAdj: number; se: number; lo: number; hi: number }[];   // Reihenfolge wie RegFaktor.stufen (Vergleichsgruppe zuerst)
 *      paare: { paar: string; diff: number; se: number; df: number; t: number; pHolm: number }[];   // adjustierte Unterschiede, paar = 'Name1 - Name2' (i < j), Holm über alle Paare
 *      steigung: { f: number; df1: number; df2: number; p: number; bedeutsam: boolean };   // Test Gruppe × Kovariate im erweiterten Modell, nur berichtet (bedeutsam: p < 0,05)
 *    }
 *    Adjustiert: mittelAdj = mittelRoh - b·(x̄_Gruppe - x̄); se = sqrt(MSE·(1/n_g + (x̄_g - x̄)² / SSx_innerhalb)); Paar-se = sqrt(MSE·(1/n_i + 1/n_j + (x̄_i - x̄_j)² / SSx_innerhalb)). */

type Z = { ss: number; df: number; F: number; p: number };
type Eta = { wert: number; lo: number; hi: number; lo_genau: number; hi_genau: number };
interface G3 {
  name: string; titel: string; quelle: string; a_stufen: string[]; b_stufen: string[]; daten: { a: string[]; b: string[]; y: (number | null)[] }; n_gueltig: number; n_fehlend: number;
  fehler?: string; leere_zelle?: boolean;
  typ3?: { a: Z; b: Z; 'a:b': Z; fehler: { ss: number; df: number; ms: number } }; typ1_ss?: Record<string, number>; eta2p?: Record<'a' | 'b' | 'a:b', Eta>;
  zellmittel?: { a: string; b: string; n: number; mittel: number; se: number; df: number; lo: number; hi: number; sd_roh: number }[];
  einfache_effekte_a_je_b?: { stufe: string; df1: number; df2: number; F: number; p: number; p_holm: number }[];
  einfache_effekte_b_je_a?: { stufe: string; df1: number; df2: number; F: number; p: number; p_holm: number }[];
  wechselwirkung_bedeutsam?: boolean;
}
interface G6 {
  name: string; titel: string; quelle: string; g_stufen: string[]; daten: { g: string[]; x: (number | null)[]; y: (number | null)[] }; n_gueltig: number; n_fehlend: number;
  n_je_gruppe: number[]; kovariate_mittel: number; typ3: { g: Z; x: Z; fehler: { ss: number; df: number; ms: number } };
  regression: { r2: number; koef: { name: string; b: number }[] }; eta2p: Record<'g' | 'x', Eta>;
  adjustiert: { g: string; mittel: number; se: number; df: number; lo: number; hi: number; mittel_roh: number; n: number }[];
  paarvergleiche_holm: { paar: string; diff: number; se: number; df: number; t: number; p_holm: number }[];
  steigung: { F: number; df1: number; df2: number; p: number }; steigung_bedeutsam: boolean;
}
const J = erwartet as unknown as { g3: G3[]; g6: G6[] };

/** Gleich bis 1e-8: relativ bei Werten über 1, absolut darunter. */
const nah = (ist: number | undefined, soll: number, was: string, tol = 1e-8) => {
  expect(ist, was).toBeTypeOf('number');
  expect(Math.abs(ist! - soll), `${was}: ist ${ist}, soll ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
};
/** p-Wert: absolut 1e-8, unter 1e-4 zusätzlich relativ 1e-5 (sehr kleine p dürfen nicht im Absoluten untergehen). */
const nahP = (ist: number | undefined, soll: number, was: string) => {
  nah(ist, soll, was);
  if (soll < 1e-4) expect(Math.abs(ist! / soll - 1), `${was}: relativ ist ${ist}, soll ${soll}`).toBeLessThan(1e-5);
};
const nahEffekt = (ist: { ss: number; df: number; f: number; p: number; etaP: number; etaPLo: number; etaPHi: number }, z: Z, eta: Eta, fehlerSs: number, was: string) => {
  nah(ist.ss, z.ss, `${was} SS`); nah(ist.df, z.df, `${was} df`); nah(ist.f, z.F, `${was} F`); nahP(ist.p, z.p, `${was} p`);
  nah(ist.etaP, eta.wert, `${was} eta2p`); nah(ist.etaP, z.ss / (z.ss + fehlerSs), `${was} eta2p aus SS`);
  nah(ist.etaPLo, eta.lo_genau, `${was} eta2p untere Grenze`); nah(ist.etaPHi, eta.hi_genau, `${was} eta2p obere Grenze`);
  // Plausibilitätsprobe gegen effectsize::eta_squared (löst gröber)
  expect(Math.abs(ist.etaPLo - eta.lo), `${was} untere Grenze gegen effectsize`).toBeLessThan(1e-4); expect(Math.abs(ist.etaPHi - eta.hi), `${was} obere Grenze gegen effectsize`).toBeLessThan(1e-4);
};

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

/* ===================== G3 ===================== */
const daten3 = (f: G3): Anova2Daten => ({ a: f.daten.a, b: f.daten.b, y: f.daten.y, aStufen: f.a_stufen, bStufen: f.b_stufen });
/** Fall in die Engine (Faktoren als Zahlen 1, 2, 3 in der Reihenfolge der Stufen) und GLM-Lauf. */
function lauf3(f: G3) {
  const csv = 'a,b,y\n' + f.daten.a.map((a, i) => `${f.a_stufen.indexOf(a) + 1},${f.b_stufen.indexOf(f.daten.b[i]!) + 1},${f.daten.y[i] ?? ''}`).join('\n') + '\n';
  const b = zurEngine(leseCsv(csv));
  e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv });
  return e.run(anova2Befehl('y', 'a', 'b'));
}

describe('G3: PSPP-Befehl', () => {
  it('GLM mit Haupteffekten und Wechselwirkung', () => {
    expect(anova2Befehl('y', 'a', 'b')).toBe('GLM y BY a b\n  /DESIGN=a b a*b.');
  });
});

describe('G3: leere Zelle - kein Ergebnis', () => {
  const f = J.g3.find(x => x.name === 'e_leere_zelle')!;
  it('R bricht ab (aliased coefficients), leereZellen nennt die Zelle a2/b3', () => {
    expect(f.fehler).toMatch(/aliased/);
    expect(leereZellen(daten3(f))).toEqual([{ a: 'a2', b: 'b3' }]);
  });
  it('anova2 liefert null, auch wenn PSPP (schweigend) eine Tabelle ausgibt', () => {
    expect(anova2(lauf3(f), daten3(f))).toBeNull();
  });
  it('alle anderen Fälle haben keine leere Zelle (auch f mit fehlenden y: nach Wegfall bleiben alle Zellen besetzt)', () => {
    for (const g of J.g3.filter(x => x.name !== 'e_leere_zelle')) expect(leereZellen(daten3(g)), g.name).toEqual([]);
  });
  it('fehlende y können eine Zelle leeren: dann zählt die Zelle als leer', () => {
    const d = daten3(J.g3.find(x => x.name === 'f_fehlende_werte_2x2')!);
    const y = d.y.map((v, i) => (d.a[i] === 'a1' && d.b[i] === 'b1' ? null : v));
    expect(leereZellen({ ...d, y })).toEqual([{ a: 'a1', b: 'b1' }]);
  });
});

for (const f of J.g3.filter(x => x.typ3)) {
  describe(`G3 ${f.name}: ${f.titel}`, () => {
    let r: NonNullable<ReturnType<typeof anova2>>;
    beforeAll(() => { r = anova2(lauf3(f), daten3(f))!; });
    const T = f.typ3!;

    it('Typ-III-Tabelle: SS, df, F, p für a, b, a × b und Fehler; n', () => {
      expect(r).not.toBeNull();
      expect(r.art).toBe('anova2');
      expect(r.n).toBe(f.n_gueltig);
      nah(r.fehler.ss, T.fehler.ss, 'Fehler SS'); nah(r.fehler.df, T.fehler.df, 'Fehler df'); nah(r.fehler.ms, T.fehler.ms, 'Fehler MS');
      for (const [k, ist] of [['a', r.a], ['b', r.b], ['a:b', r.ab]] as const) { nah(ist.ss, T[k].ss, `${k} SS`); nah(ist.df, T[k].df, `${k} df`); nah(ist.f, T[k].F, `${k} F`); nahP(ist.p, T[k].p, `${k} p`); }
    });
    it('partielles eta² mit 95-%-KI zweiseitig (effectsize, KI auf die genaue Lösung)', () => {
      nahEffekt(r.a, T.a, f.eta2p!.a, T.fehler.ss, 'a'); nahEffekt(r.b, T.b, f.eta2p!.b, T.fehler.ss, 'b'); nahEffekt(r.ab, T['a:b'], f.eta2p!['a:b'], T.fehler.ss, 'a:b');
    });
    it('Zellmittel mit 95-%-KI (gepoolter Fehler, wie emmeans), n und Streuung je Zelle, Reihenfolge a-Stufe dann b-Stufe', () => {
      // emmeans listet die a-Stufe am schnellsten; die API liefert a-Stufe-dann-b-Stufe
      const soll = f.a_stufen.flatMap(a => f.b_stufen.map(b => f.zellmittel!.find(z => z.a === a && z.b === b)!));
      expect(r.zellen.map(z => `${z.a}/${z.b}`)).toEqual(soll.map(z => `${z.a}/${z.b}`));
      r.zellen.forEach((z, i) => {
        const s = soll[i]!, w = `Zelle ${s.a}/${s.b}`;
        expect(z.n, w).toBe(s.n); nah(z.mittel, s.mittel, `${w} Mittel`); nah(z.sd, s.sd_roh, `${w} SD`); nah(z.se, s.se, `${w} SE`); nah(z.lo, s.lo, `${w} KI unten`); nah(z.hi, s.hi, `${w} KI oben`);
      });
    });
    it('einfache Effekte: Effekt von A je Stufe von B (F, df, p, Holm) wie emmeans::joint_tests mit genauem F', () => {
      expect(r.einfachAJeB.map(x => x.stufe)).toEqual(f.einfache_effekte_a_je_b!.map(x => x.stufe));
      r.einfachAJeB.forEach((x, i) => { const s = f.einfache_effekte_a_je_b![i]!, w = `A je ${s.stufe}`;
        nah(x.df1, s.df1, `${w} df1`); nah(x.df2, s.df2, `${w} df2`); nah(x.f, s.F, `${w} F`); nahP(x.p, s.p, `${w} p`); nahP(x.pHolm, s.p_holm, `${w} p Holm`); });
    });
    it('einfache Effekte: Effekt von B je Stufe von A', () => {
      expect(r.einfachBJeA.map(x => x.stufe)).toEqual(f.einfache_effekte_b_je_a!.map(x => x.stufe));
      r.einfachBJeA.forEach((x, i) => { const s = f.einfache_effekte_b_je_a![i]!, w = `B je ${s.stufe}`;
        nah(x.df1, s.df1, `${w} df1`); nah(x.df2, s.df2, `${w} df2`); nah(x.f, s.F, `${w} F`); nahP(x.p, s.p, `${w} p`); nahP(x.pHolm, s.p_holm, `${w} p Holm`); });
    });
    it('Wechselwirkung bedeutsam genau bei p < ,05', () => {
      expect(r.wechselwirkungBedeutsam).toBe(f.wechselwirkung_bedeutsam);
      expect(r.wechselwirkungBedeutsam).toBe(r.ab.p < 0.05);
    });
  });
}

describe('G3: Besonderheiten der Fälle', () => {
  const lade3 = (n: string) => J.g3.find(x => x.name === n)!;
  it('c: Wechselwirkung über Kreuz ist bedeutsam (p < ,001), die Haupteffekte nicht - Wechselwirkung zuerst deuten', () => {
    const f = lade3('c_wechselwirkung_3x3'), r = anova2(lauf3(f), daten3(f))!;
    expect(r.wechselwirkungBedeutsam).toBe(true); expect(r.ab.p).toBeLessThan(0.001); expect(r.a.p).toBeGreaterThan(0.05); expect(r.b.p).toBeGreaterThan(0.05);
    expect(r.zellen.length).toBe(9); expect(r.einfachAJeB.length).toBe(3); expect(r.einfachAJeB[0]!.df1).toBe(2);
  });
  it('b: ungleiche Zellgrößen 4 bis 12, Typ III (nicht nacheinander): SS von b weicht von Typ I deutlich ab', () => {
    const f = lade3('b_unbalanciert_2x3'), r = anova2(lauf3(f), daten3(f))!;
    expect(r.zellen.map(z => z.n)).toEqual([4, 12, 7, 9, 5, 12]);
    expect(Math.abs(r.b.ss - f.typ1_ss!.b!)).toBeGreaterThan(1);
    nah(r.b.ss, f.typ3!.b.ss, 'b SS Typ III');
  });
  it('f: fehlende y werden listenweise ausgelassen (n = 43)', () => {
    const f = lade3('f_fehlende_werte_2x2'), r = anova2(lauf3(f), daten3(f))!;
    expect(f.n_fehlend).toBe(5); expect(r.n).toBe(43); expect(r.zellen.reduce((s, z) => s + z.n, 0)).toBe(43); expect(r.fehler.df).toBe(39);
  });
  it('d ToothGrowth: veröffentlichte Tabelle (z. B. STHDA „Two-Way ANOVA Test in R“, Crampton 1947/Bliss 1952): SS 205,35 / 2426,43 / 108,32 / Fehler 712,11 (df 54), F 15,572 / 92,000 / 4,107, p ,000231 / ,0219', () => {
    const f = lade3('d_toothgrowth'), r = anova2(lauf3(f), daten3(f))!;
    const rund = (v: number, s: number) => Math.round(v * 10 ** s) / 10 ** s;
    expect([rund(r.a.ss, 2), rund(r.b.ss, 2), rund(r.ab.ss, 2), rund(r.fehler.ss, 2)]).toEqual([205.35, 2426.43, 108.32, 712.11]);
    expect(r.fehler.df).toBe(54);
    expect([rund(r.a.f, 3), rund(r.b.f, 3), rund(r.ab.f, 3)]).toEqual([15.572, 92.0, 4.107]);
    expect([rund(r.a.p, 6), rund(r.ab.p, 4)]).toEqual([0.000231, 0.0219]);
    expect(r.b.p).toBeLessThan(1e-15); // „< 2e-16“ in R; der genaue Wert (4e-18) steht im JSON und wird oben geprüft
  });
});

/* ===================== G6 ===================== */
const csv6 = (f: G6) => 'g,x,y\n' + f.daten.g.map((g, i) => `${g},${f.daten.x[i] ?? ''},${f.daten.y[i] ?? ''}`).join('\n') + '\n';
const daten6 = (f: G6): AncovaDaten => ({ g: f.daten.g, x: f.daten.x, y: f.daten.y });

function lauf6(f: G6) {
  const tab: Tabelle = leseCsv(csv6(f));
  const plan = planeSpalten(tab).find(p => p.name === 'g')!;
  const sp: Spalte = { name: 'g', bezeichnung: '', art: plan.art, niveau: 'nominal', format: '', fehlend: [], fehlendText: '', werteLabels: {} };
  const i = tab.kopf.indexOf('g');
  const werte = tab.zeilen.map(z => z[i]).filter(v => v !== null && v !== '').map(v => (plan.art === 'zahl' ? alsZahl(v!, plan.punkt)! : String(v)));
  const faktor: RegFaktor = regFaktor(sp, werte, tab.kopf)!;
  expect(faktor, 'Gruppen-Spalte wird als Faktor erkannt').not.toBeNull();
  expect(faktor.stufen.map(s => s.name), 'Stufen in der Reihenfolge von R').toEqual(f.g_stufen);
  const b = zurEngine(tab);
  e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv });
  return e.run(kovarianzBefehl('y', faktor, 'x'));
}

for (const f of J.g6) {
  describe(`G6 ${f.name}: ${f.titel}`, () => {
    let r: ReturnType<typeof kovarianz>;
    beforeAll(() => { r = kovarianz(lauf6(f), daten6(f)); });
    const T = f.typ3;

    it('Fälle: n im Modell (listenweise ohne fehlende x und y), Mittelwert der Kovariate, Gruppengrößen', () => {
      expect(r.art).toBe('ancova');
      expect(r.n).toBe(f.n_gueltig);
      nah(r.kovariateMittel, f.kovariate_mittel, 'Mittel der Kovariate');
      expect(r.gruppen.map(g => g.name)).toEqual(f.g_stufen);
      expect(r.gruppen.map(g => g.n)).toEqual(f.n_je_gruppe);
    });
    it('Typ-III-Test der Gruppe und der Kovariate: SS, df, F, p, partielles eta² mit KI; Fehlerterm', () => {
      nah(r.fehler.ss, T.fehler.ss, 'Fehler SS'); nah(r.fehler.df, T.fehler.df, 'Fehler df'); nah(r.fehler.ms, T.fehler.ms, 'Fehler MS');
      nahEffekt(r.gruppe, T.g, f.eta2p.g, T.fehler.ss, 'Gruppe'); nahEffekt(r.kovariate, T.x, f.eta2p.x, T.fehler.ss, 'Kovariate');
      expect(r.gruppe.df).toBe(f.g_stufen.length - 1); expect(r.kovariate.df).toBe(1);
    });
    it('gemeinsame Steigung b und R² des Modells (Gruppe + Kovariate)', () => {
      nah(r.b, f.regression.koef.find(k => k.name === 'x')!.b, 'b der Kovariate'); nah(r.r2, f.regression.r2, 'R²');
    });
    it('adjustierte Mittelwerte beim Mittelwert der Kovariate mit 95-%-KI (emmeans), dazu die rohen Mittel', () => {
      r.gruppen.forEach((g, i) => { const s = f.adjustiert[i]!, w = `Gruppe ${s.g}`;
        expect(g.name).toBe(s.g); nah(g.mittelRoh, s.mittel_roh, `${w} Mittel roh`); nah(g.mittelAdj, s.mittel, `${w} Mittel adjustiert`); nah(g.se, s.se, `${w} SE`); nah(g.lo, s.lo, `${w} KI unten`); nah(g.hi, s.hi, `${w} KI oben`); });
    });
    it('Paarvergleiche der adjustierten Mittel mit Holm', () => {
      expect(r.paare.map(p => p.paar)).toEqual(f.paarvergleiche_holm.map(p => p.paar));
      r.paare.forEach((p, i) => { const s = f.paarvergleiche_holm[i]!, w = `Paar ${s.paar}`;
        nah(p.diff, s.diff, `${w} Differenz`); nah(p.se, s.se, `${w} SE`); nah(p.df, s.df, `${w} df`); nah(p.t, s.t, `${w} t`); nahP(p.pHolm, s.p_holm, `${w} p Holm`); });
    });
    it('Steigungstest Gruppe × Kovariate: F, df, p, nur berichtet', () => {
      nah(r.steigung.f, f.steigung.F, 'Steigung F'); nah(r.steigung.df1, f.steigung.df1, 'Steigung df1'); nah(r.steigung.df2, f.steigung.df2, 'Steigung df2'); nahP(r.steigung.p, f.steigung.p, 'Steigung p');
      expect(r.steigung.bedeutsam).toBe(f.steigung_bedeutsam);
    });
  });
}

describe('G6: Besonderheiten der Fälle', () => {
  const lade6 = (n: string) => J.g6.find(x => x.name === n)!;
  it('h: deutlich ungleiche Steigungen (0,2 gegen 0,9) - Steigungstest bedeutsam (p < ,001); die Gruppe bleibt rechenbar', () => {
    const f = lade6('h_ungleiche_steigungen'), r = kovarianz(lauf6(f), daten6(f));
    expect(r.steigung.bedeutsam).toBe(true); expect(r.steigung.p).toBeLessThan(0.001); expect(r.gruppe.df).toBe(1); expect(r.paare.length).toBe(1);
  });
  it('g: parallele Steigungen - Steigungstest nicht bedeutsam, 3 Gruppen (df 2), 3 Paare', () => {
    const f = lade6('g_parallel_3_gruppen'), r = kovarianz(lauf6(f), daten6(f));
    expect(r.steigung.bedeutsam).toBe(false); expect(r.gruppe.df).toBe(2); expect(r.paare.length).toBe(3);
  });
  it('j: 4 fehlende x und 1 fehlendes y - 31 Fälle im Modell, Kovariatenmittel nur über diese Fälle', () => {
    const f = lade6('j_kovariate_fehlend'), r = kovarianz(lauf6(f), daten6(f));
    expect(f.n_fehlend).toBe(5); expect(r.n).toBe(31); expect(r.fehler.df).toBe(31 - 3 - 1);
    const x = f.daten.x, y = f.daten.y, ok = x.map((v, i) => v !== null && y[i] !== null);
    const mittel = x.filter((v, i): v is number => ok[i]! && v !== null).reduce((s: number, v) => s + v, 0) / ok.filter(Boolean).length;
    nah(r.kovariateMittel, mittel, 'Mittel der Kovariate über die vollständigen Fälle');
  });
  it('i: MASS::anorexia (Hand et al. 1994; Venables & Ripley 2002), n = 72, Stufen CBT, Cont, FT, Vergleichsgruppe CBT', () => {
    const f = lade6('i_anorexia'), r = kovarianz(lauf6(f), daten6(f));
    expect(r.n).toBe(72); expect(r.gruppen.map(g => g.name)).toEqual(['CBT', 'Cont', 'FT']); expect(r.paare.map(p => p.paar)).toEqual(['CBT - Cont', 'CBT - FT', 'Cont - FT']);
  });
});
