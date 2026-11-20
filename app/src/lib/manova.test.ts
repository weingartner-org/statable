import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { sitz, reihe } from './kptesthilfe';
import { manovaDaten, manovaCodes, manovaCodeSatz, manovaPunkte, manovaAufruf, manovaLesen, manovaWarnungen, saetzeManova, tabellenManova, manovaRCode, MANOVA_SPERREN, type ManovaE } from './manova';

/* MANOVA (Fachblatt KURSPAKET, Abschnitt 3): Sperren, Hinweise zur Deutung, Einlesen der Antwort. Die Rechnung prüft engine/kurspaket.webr.test.ts gegen die Sollwerte. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';

const gr = (n: number, k: number) => Array.from({ length: n }, (_, i) => `g${Math.floor((i * k) / n)}`);
const daten = (o: { g?: (string | null)[]; y1?: (number | null)[]; y2?: (number | null)[]; y3?: (number | null)[] } = {}) => {
  const cols: Record<string, (number | string | null)[]> = { g: o.g ?? gr(30, 3), y1: o.y1 ?? reihe(30, 0, 1, 7), y2: o.y2 ?? reihe(30, 5, 2, 4).map((v, i) => v + (i % 3)) };
  if (o.y3) cols.y3 = o.y3;
  return sitz(cols, ['g']);
};
const dt = (o: Parameters<typeof daten>[0] = {}, ziele = ['y1', 'y2']) => { const q = daten(o); return manovaDaten('g', ziele, q.zeilen, q.spalten); };

describe('MANOVA: Daten und Sperren', () => {
  it('ohne Probleme: keine Sperre', () => { expect(manovaCodes(dt()).filter(c => MANOVA_SPERREN.has(c))).toEqual([]); });
  it('Fälle mit einer Lücke in einer Zielgröße fallen ganz weg, die Zahl wird genannt', () => {
    const y2 = reihe(30, 5, 2, 4) as (number | null)[]; y2[3] = null; y2[17] = null;
    const d = dt({ y2 }); expect(d.n).toBe(28); expect(d.ausgelassen).toBe(2);
    const p = manovaPunkte(d); expect(p[0]!.text).toContain('28'); expect(p[0]!.klein).toContain('2');
  });
  it('eine Gruppe mit einem Fall; weniger als zwei Zielgrößen; weniger als zwei Gruppen', () => {
    expect(manovaCodes(dt({ g: Array.from({ length: 30 }, (_, i) => (i === 0 ? 'einzeln' : i < 15 ? 'a' : 'b')) }))).toContain('gruppe-ein-fall');
    expect(manovaCodes(dt({}, ['y1']))).toContain('ziele-wenig');
    expect(manovaCodes(dt({ g: new Array(30).fill('a') }))).toContain('gruppen-wenig');
  });
  it('Fälle höchstens so viele wie Zielgrößen plus Gruppen: gesperrt (4 Fälle, 2 Zielgrößen, 2 Gruppen)', () => {
    const q = sitz({ g: ['a', 'a', 'b', 'b'], y1: [1, 2, 3, 5], y2: [2, 1, 4, 3] }, ['g']);
    expect(manovaCodes(manovaDaten('g', ['y1', 'y2'], q.zeilen, q.spalten))).toContain('zu-wenig-faelle');
    expect(manovaCodeSatz('zu-wenig-faelle', { n: 4, q: 2, k: 2 }).text).toContain('mehr Fälle sein als Zielgrößen plus Gruppen');
  });
  it('eine konstante Zielgröße sperrt; eine aus anderen berechenbare auch', () => {
    expect(manovaCodes(dt({ y2: new Array(30).fill(3) }))).toContain('konstant');
    const y1 = reihe(30, 0, 1, 7), y2 = reihe(30, 5, 2, 4).map((v, i) => v + (i % 3)), q = daten({ y1, y2, y3: y1.map((v, i) => 2 * v - y2[i]!) });
    const d = manovaDaten('g', ['y1', 'y2', 'y3'], q.zeilen, q.spalten); expect(manovaCodes(d)).toContain('kollinear');
  });
  it('Hinweis ab |r| > ,9: fast dieselbe Zielgröße (kein Sperre), mit dem Paar im Satz', () => {
    const y1 = reihe(30, 0, 1, 7), y2 = y1.map((v, i) => v * 2 + (i % 2) * 0.1);
    const d = dt({ y1, y2 }); expect(d.rmax).toBeGreaterThan(0.9); expect(manovaCodes(d)).toContain('hoch-korreliert'); expect(MANOVA_SPERREN.has('hoch-korreliert')).toBe(false);
    const p = manovaPunkte(d).find(x => x.text.includes('eng zusammen'))!; expect(p.art).toBe('hinweis'); expect(p.text).toContain('„y1“'); expect(p.text).toContain('„y2“');
    expect(manovaCodes(dt())).not.toContain('hoch-korreliert');
  });
  it('jede Sperre hat einen Satz ohne R-Meldung', () => { for (const c of MANOVA_SPERREN) { const t = manovaCodeSatz(c, { n: 3, q: 2, k: 2, namen: ['x'] }).text; expect(t.length, c).toBeGreaterThan(20); expect(t).not.toMatch(/manova|Error|rank/); } });
});

describe('MANOVA: Aufruf', () => {
  it('Gruppen gehen als Argument, nie in den Code; nur Bezeichner p01, p02', () => {
    const boese = `y1'); system('x'); ('`, q = sitz({ g: ['a', 'b', 'a', 'b'].map(v => v + `'); system('x`), [boese]: [1, 2, 3, 4], y2: [2, 1, 4, 3] }, ['g']), d = manovaDaten('g', [boese, 'y2'], q.zeilen, q.spalten);
    const a = manovaAufruf(d);
    expect(a.code).toBe("tryCatch(sp_manova(d, c('p01', 'p02'), 'g', .sp_arg$stufen), error = function(e) list(fehler = conditionMessage(e)))");
    expect(a.code).not.toContain('system'); expect(a.args.stufen?.length).toBe(2);
  });
  it('R-Text: Namen maskiert, vier Prüfgrößen, einzelne Varianzanalysen', () => {
    const r = manovaRCode('Gruppe', ['a b', 'c']);
    expect(r).toContain("c('a b', 'c')"); expect(r).toContain("'Pillai', 'Wilks', 'Hotelling-Lawley', 'Roy'"); expect(r).toContain('anova(lm(Y[, j] ~ g))');
  });
});

const test = (wert: number, F: number, df1: number, df2: number, p: number) => ({ wert: [wert], F: [F], df1: [df1], df2: [df2], p: [p] });
const roh = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  n: [30], n_alle: [32], ausgelassen: [2], q: [2], k: [3], gruppen: ['a', 'b', 'c'], gruppen_n: [10, 10, 10],
  pillai: test(0.8, 8.5, 4, 54, 1e-5), wilks: test(0.25, 12.2, 4, 52, 1e-6), hotelling: test(2.6, 16.9, 4, 50, 1e-8), roy: test(2.5, 31.2, 2, 27, 1e-8),
  einzeln: [{ F: [9.1], df1: [2], df2: [27], p: [0.001] }, { F: [3.2], df1: [2], df2: [27], p: [0.06] }], rmax: [0.3], ...over
});
const lesen = (o: Record<string, unknown> = {}): ManovaE => { const r = manovaLesen(roh(o), dt()); if (!r.ok) throw new Error(r.code); return r.e; };

describe('MANOVA: Antwort lesen', () => {
  it('liest die vier Prüfgrößen mit F und Freiheitsgraden und die einzelnen Zielgrößen', () => {
    const e = lesen(); expect(e.pillai.wert).toBe(0.8); expect(e.roy.df1).toBe(2); expect(e.einzeln.length).toBe(2); expect(e.einzeln[1]!.p).toBe(0.06); expect(e.k).toBe(3);
  });
  it('Fehler und kaputte Antworten werden zu Codes', () => {
    expect(manovaLesen({ fehler: ['kollinear'] }, dt())).toEqual({ ok: false, code: 'kollinear' });
    expect(manovaLesen({ fehler: ['zu-wenig'] }, dt())).toEqual({ ok: false, code: 'zu-wenig-faelle' });
    expect(manovaLesen(roh({ pillai: {} }), dt())).toEqual({ ok: false, code: 'r-fehler' });
    expect(manovaLesen(roh({ einzeln: [] }), dt())).toEqual({ ok: false, code: 'r-fehler' });
    expect(manovaLesen(null, dt())).toEqual({ ok: false, code: 'r-fehler' });
  });
});

describe('MANOVA: Sätze und Tabellen', () => {
  it('die Hinweise zur Deutung stehen immer: nur die Kombination, kein Schutz vor mehrfachem Testen, Roys p zu klein, Voraussetzungen ohne Test', () => {
    const w = manovaWarnungen(lesen()).join(' ');
    expect(w).toContain('nur, dass sich die Gruppen in der Kombination'); expect(w).toContain('nicht, in welcher Zielgröße oder zwischen welchen Gruppen');
    expect(w).toContain('schützt nur die Spalte p (Holm)'); expect(w).toContain('Roys Wert'); expect(w).toContain('zu klein'); expect(w).toContain('Box-M-Test'); expect(w).toContain('2 Zeilen mit einer Lücke');
    expect(w).not.toContain('eng zusammen');
    expect(manovaWarnungen(lesen({ rmax: [0.95] })).join(' ')).toContain('eng zusammen');
  });
  it('die Hauptzeile ist Pillai; alle vier stehen in der Tabelle, Roy mit dem Satz „obere Grenze“', () => {
    const st = saetzeManova(lesen(), x => x), t = tabellenManova(lesen(), x => x);
    expect(st.haupt).toContain('Pillai'); expect(st.haupt).toContain('unterscheiden sich in der Kombination'); expect(st.zusatz).toContain('Wilks'); expect(st.zusatz).toContain('Roys größte Wurzel');
    expect(t[0]!.cells.filter(c => c.c === 0 && c.r > 0).map(c => c.t)).toEqual([expect.stringContaining('Pillai'), "Wilks' Λ", expect.stringContaining('Hotelling'), expect.stringContaining('Roy')]);
    expect(t[0]!.footnotes.map(f => f.t).join(' ')).toContain('obere Grenze'); expect(t[1]!.footnotes.map(f => f.t).join(' ')).toContain('p (Holm) schützt gegen mehrfaches Testen');
  });
  it('p ≥ ,05: der Satz sagt „lässt sich nicht belegen“, nicht „kein Unterschied“', () => {
    const e = lesen({ pillai: test(0.1, 1.1, 4, 54, 0.4) }), st = saetzeManova(e, x => x);
    expect(st.haupt).toContain('nicht belegen'); expect(st.haupt).toContain('nicht, dass es keinen gibt');
  });
  it('englisch', () => {
    s.einst.sprache = 'en';
    try { expect(saetzeManova(lesen(), x => x).haupt).toContain("Pillai's trace"); expect(manovaWarnungen(lesen()).join(' ')).toContain('upper bound'); } finally { s.einst.sprache = 'de'; }
  });
});

describe('MANOVA: Einzel-F mit Holm-Korrektur', () => {
  it('die Tabelle hat die Spalte p (Holm)', () => {
    const e = lesen(), t = tabellenManova(e).find(x => JSON.stringify(x).includes('MANOVA Einzeln'))!;
    expect(JSON.stringify(t)).toContain('Holm');
  });
});
