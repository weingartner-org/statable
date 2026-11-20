import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import { finde, spalte } from './tabelle';
import { nodeEngine } from './testengine';
import erwartet from './testdaten/friedman-mcnemar-cochran-erwartet.json';

/* Fachblatt Welle 2, Paket C (G5): Was rechnet PSPP 2.1.1 mit `NPAR TESTS /FRIEDMAN`, `/KENDALL`, `/MCNEMAR`, `/COCHRAN`?
 * Sollwerte: scripts/friedman-mcnemar-cochran-erwartet.R (friedman.test, exact2x2::mcnemar.exact, Cochran-Formel). Toleranz 1e-9.
 * Dieser Test hängt NICHT vom Modul (friedman.ts, mcnemarcochran.ts) ab und ist darum schon vor dem Bau grün.
 *
 * Befunde (Stand PSPP 2.1.1):
 *  - FRIEDMAN: chi2, df, p und mittlere Ränge wie R, auch mit Bindungen innerhalb der Personen (PSPP wendet die Bindungskorrektur an wie R) und mit Kommazahlen.
 *  - KENDALL: PSPP gibt Kendalls W selbst aus und es ist gleich chi2 / (n (k - 1)) mit dem bindungskorrigierten chi2 - dieselbe Formel wie im Fachblatt.
 *  - COCHRAN: Q, df, p wie die Formel und rstatix. Die Tabelle „Frequencies“ nennt den ZUERST in den Daten stehenden Wert „Success“ und den anderen „Failure“
 *    (Fall g: „Success (0)“, Fall h: „Success (1)“) - die Namen hängen an der Datenreihenfolge, Q ist davon unabhängig. Nicht in die Oberfläche übernehmen.
 *  - MCNEMAR: PSPP rechnet den EXAKTEN BINOMIALTEST der diskordanten Paare (Spalten „Exact Sig. (2-tailed)“, „Exact Sig. (1-tailed)“, „Point Probability“),
 *    KEIN χ², KEINE Stetigkeitskorrektur. Der zweiseitige Wert ist der DOPPELTE einseitige Wert ohne Deckel bei 1:
 *      b = c = 7 gibt 1,209 (R und Statable: 1), b = c = 0 gibt 2,000 (R und Statable: kein Test).
 *    Für b ≠ c stimmt der Wert mit R (mcnemar.exact und binom.test) auf 1e-9 überein. Odds Ratio und Konfidenzintervall gibt PSPP nicht aus.
 *    => Hilfe-Satz: „Statable prüft mit dem exakten Binomialtest der Paare, die sich verändert haben (wie PSPP, ohne χ²-Näherung und ohne Stetigkeitskorrektur).“
 *       Statable begrenzt p bei 1 und rechnet bei null veränderten Paaren keinen Test; PSPP tut beides nicht. */

interface FriedmanFall { name: string; zeitpunkte: string[]; daten: number[][]; n: number; k: number; chi2: number; df: number; p: number; kendall_w: number; rangsummen: number[] }
interface McNemarFall { name: string; vorher: number[]; nachher: number[]; n: number; b: number; c: number; kein_test: boolean; p?: number; p_doppelt_ungedeckelt?: number }
interface CochranFall { name: string; zeitpunkte: string[]; daten: number[][]; n: number; k: number; q: number; df: number; p: number }
const E = erwartet as unknown as { friedman: FriedmanFall[]; mcnemar: McNemarFall[]; cochran: CochranFall[] };
const fr = (n: string) => E.friedman.find(f => f.name === n)!;
const mc = (n: string) => E.mcnemar.find(f => f.name === n)!;
const co = (n: string) => E.cochran.find(f => f.name === n)!;

/** Gleich bis 1e-9: relativ zum Sollwert (plus 1e-14 absolut, damit Nullen nicht an Rundung scheitern). */
const nah = (ist: number | undefined, soll: number, was: string, tol = 1e-9) => {
  expect(ist, was).toBeTypeOf('number');
  expect(Math.abs(ist! - soll), `${was}: PSPP ${ist} gegen R ${soll}`).toBeLessThanOrEqual(tol * Math.abs(soll) + 1e-14);
};

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

function lade(namen: string[], zeilen: number[][]) {
  const csv = namen.join(',') + '\n' + zeilen.map(z => z.join(',')).join('\n') + '\n';
  const b = zurEngine(leseCsv(csv));
  e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv });
}
const spaltenNamen = (k: number) => Array.from({ length: k }, (_, i) => `t${i + 1}`);
/** Wert einer Zeile der zweispaltigen Tabelle „Test Statistics“ (Name | Wert). */
function kenn(items: ReturnType<typeof e.run>) {
  const t = finde(items, /^Test Statistics$/)!;
  expect(t, 'Tabelle „Test Statistics“').not.toBeNull();
  return (name: string) => { const i = t.t.findIndex(z => z[0] === name); expect(i, `Zeile „${name}“`).toBeGreaterThanOrEqual(0); return t.n[i]![1]; };
}

describe('PSPP NPAR TESTS /FRIEDMAN und /KENDALL gegen R friedman.test', () => {
  for (const name of ['a_likert_4_zeitpunkte', 'b_likert_3_zeitpunkte_30', 'c_roundingtimes']) {
    it(`${name}: N, chi2, df, p und mittlere Ränge wie R (1e-9), mit Bindungen innerhalb der Personen`, () => {
      const f = fr(name), nm = spaltenNamen(f.k); lade(nm, f.daten);
      const items = e.run(`NPAR TESTS /FRIEDMAN=${nm.join(' ')}.`);
      const s = kenn(items);
      expect(s('N')).toBe(f.n); nah(s('Chi-Square'), f.chi2, `${name} chi2`); expect(s('df')).toBe(f.df); nah(s('Asymp. Sig.'), f.p, `${name} p`);
      const r = finde(items, /^Ranks$/)!, c = spalte(r, /^Mean Rank$/);
      nm.forEach((z, i) => { const row = r.t.findIndex(x => x[0] === z); nah(r.n[row]![c], f.rangsummen[i]! / f.n, `${name} mittlerer Rang ${z}`); });
    });
    it(`${name}: Kendalls W aus /KENDALL ist chi2 / (n (k - 1)) wie R und rstatix (1e-9)`, () => {
      const f = fr(name), nm = spaltenNamen(f.k); lade(nm, f.daten);
      const s = kenn(e.run(`NPAR TESTS /KENDALL=${nm.join(' ')}.`));
      nah(s("Kendall's W"), f.kendall_w, `${name} W`); nah(s('Chi-Square'), f.chi2, `${name} chi2`);
    });
  }
});

describe('PSPP NPAR TESTS /COCHRAN gegen die Formel Q = (k - 1)(k ΣC² - N²) / (k N - ΣR²) und rstatix', () => {
  for (const name of ['g_3_zeitpunkte_20', 'h_4_zeitpunkte_24']) {
    it(`${name}: N, Q, df und p wie R (1e-9)`, () => {
      const f = co(name), nm = spaltenNamen(f.k); lade(nm, f.daten);
      const items = e.run(`NPAR TESTS /COCHRAN=${nm.join(' ')}.`);
      const t = finde(items, /^Test Statistics$/)!, z = (n: string) => t.n[t.t.findIndex(r => r[0] === n)]![1];
      expect(z('N')).toBe(f.n); nah(z("Cochran's Q"), f.q, `${name} Q`); expect(z('df')).toBe(f.df); nah(z('Asymp. Sig.'), f.p, `${name} p`);
    });
  }
  it('Die Namen „Success“ und „Failure“ hängen an der Reihenfolge der Daten (g: Success = 0, h: Success = 1), Q ist davon frei', () => {
    const gibt = (name: string) => { const f = co(name), nm = spaltenNamen(f.k); lade(nm, f.daten); return finde(e.run(`NPAR TESTS /COCHRAN=${nm.join(' ')}.`), /^Frequencies$/)!.t[1]!.join('|'); };
    expect(gibt('g_3_zeitpunkte_20')).toMatch(/Success \(0\)/);
    expect(gibt('h_4_zeitpunkte_24')).toMatch(/Success \(1\)/);
  });
});

describe('PSPP NPAR TESTS /MCNEMAR: exakter Binomialtest, kein χ², keine Stetigkeitskorrektur', () => {
  const mcnemar = (name: string) => {
    const f = mc(name); lade(['vorher', 'nachher'], f.vorher.map((v, i) => [v, f.nachher[i]!]));
    const items = e.run('NPAR TESTS /MCNEMAR=vorher WITH nachher (PAIRED).');
    const t = finde(items, /^Test Statistics$/)!;
    const wert = (kopf: RegExp) => t.n[1]![spalte(t, kopf)];
    return { items, t, wert, kopfzeile: t.t[0]!.join('|') };
  };
  it('Die Tabelle heißt „Exact Sig. (2-tailed)“ und enthält weder χ² noch eine Korrektur', () => {
    const { kopfzeile, items } = mcnemar('d_b12_c4');
    expect(kopfzeile).toMatch(/Exact Sig\. \(2-tailed\)/);
    expect(kopfzeile).not.toMatch(/Chi|Asymp/i);
    expect(items.some(i => i.type === 'table' && /chi/i.test(i.label))).toBe(false);
  });
  it('Die Kreuztabelle zählt vorher in den Zeilen, nachher in den Spalten: b (vorher 1, nachher 0) steht oben rechts', () => {
    const f = mc('d_b12_c4'), { items } = mcnemar('d_b12_c4');
    const k = finde(items, /^vorher & nachher$/)!;
    expect(k.n[2]![2]).toBe(f.b); expect(k.n[3]![1]).toBe(f.c);
  });
  for (const name of ['d_b12_c4', 'e_b3_c0', 'd2_agresti_praesident']) {
    it(`${name}: N und zweiseitiges p wie R mcnemar.exact und binom.test (1e-9), einseitig = die Hälfte`, () => {
      const f = mc(name), { wert } = mcnemar(name);
      expect(wert(/^N$/)).toBe(f.n); nah(wert(/Exact Sig\. \(2-tailed\)/), f.p!, `${name} p`); nah(wert(/Exact Sig\. \(1-tailed\)/), f.p! / 2, `${name} p einseitig`);
    });
  }
  it('b = c = 7: PSPP 2.1.3 deckelt bei 1 wie R (5a9e9cf); 2.1.1 gab 1,209 (doppelter einseitiger Wert)', () => {
    const f = mc('e2_b7_c7'), { wert } = mcnemar('e2_b7_c7');
    expect(f.p).toBe(1);
    nah(wert(/Exact Sig\. \(2-tailed\)/)!, f.p!, 'PSPP = min(1, 2 * P(X <= min(b, c)))');
  });
  it('b = c = 0: PSPP 2.1.3 gibt 1,000 aus (2.1.1: 2,000) und rechnet damit einen „Test“, R hat hier keinen Test - Statable darf PSPP nicht nachsprechen', () => {
    const f = mc('f_keine_diskordanten'), { wert } = mcnemar('f_keine_diskordanten');
    expect(f.kein_test).toBe(true);
    expect(wert(/Exact Sig\. \(2-tailed\)/)).toBe(1);
    expect(wert(/Exact Sig\. \(1-tailed\)/)).toBe(1);
  });
  it('/MCNEMAR=vorher nachher (ohne WITH ... PAIRED) gibt dasselbe aus', () => {
    const f = mc('d_b12_c4'); lade(['vorher', 'nachher'], f.vorher.map((v, i) => [v, f.nachher[i]!]));
    const t = finde(e.run('NPAR TESTS /MCNEMAR=vorher nachher.'), /^Test Statistics$/)!;
    nah(t.n[1]![spalte(t, /Exact Sig\. \(2-tailed\)/)], f.p!, 'p ohne WITH');
  });
});
