import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { sitz, reihe } from './kptesthilfe';
import { wlsDaten, wlsCodes, wlsCodeSatz, wlsPunkte, wlsAufruf, wlsLesen, wlsWarnungen, wlsNichtFallgewicht, saetzeWls, tabellenWls, wlsRCode, WLS_SPERREN, type WlsE } from './wls';

/* Gewichtete Regression mit Präzisionsgewichten (Fachblatt KURSPAKET, Abschnitt 5): Gewicht 0 fällt heraus und wird gezählt, negative oder fehlende Gewichte sperren, Warnsätze.
 * Die Rechnung prüft engine/kurspaket.webr.test.ts gegen die Sollwerte. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';

const daten = (o: { y?: (number | null)[]; x?: (number | null)[]; w?: (number | null)[] } = {}) => sitz({ y: o.y ?? reihe(20, 1, 2, 7), x: o.x ?? reihe(20, 0, 1, 5).map((v, i) => v + (i % 3)), w: o.w ?? reihe(20, 1, 0.5, 4) });
const dt = (o: Parameters<typeof daten>[0] = {}, praed = ['x']) => { const q = daten(o); return wlsDaten('y', praed, 'w', q.zeilen, q.spalten); };

describe('Gewichtete Regression: Gewichte und Sperren', () => {
  it('Gewicht 0 fällt heraus und wird gezählt; n ist die Zahl der Zeilen mit Gewicht über 0 (nicht die Summe der Gewichte)', () => {
    const w = reihe(20, 1, 0.5, 4) as (number | null)[]; w[3] = 0; w[8] = 0;
    const d = dt({ w }); expect(d.nullen).toBe(2); expect(d.n).toBe(18); expect(d.negativ).toBe(0);
    const c = wlsCodes(d); expect(c).toContain('nullen'); expect(wlsCodeSatz('nullen', { zahl: 2 }).text).toBe('2 Fälle mit Gewicht 0 fallen heraus.'); expect(wlsCodeSatz('nullen', { zahl: 1 }).text).toBe('1 Fall mit Gewicht 0 fällt heraus.');
  });
  it('ein negatives Gewicht sperrt', () => {
    const w = reihe(20, 1, 0.5, 4) as (number | null)[]; w[5] = -1;
    const d = dt({ w }); expect(d.negativ).toBe(1); expect(wlsCodes(d)).toContain('gewicht-negativ'); expect(WLS_SPERREN.has('gewicht-negativ')).toBe(true);
  });
  it('ein fehlendes Gewicht in einer sonst vollständigen Zeile sperrt; fehlt auch das Ziel, fällt die Zeile nur weg', () => {
    const w = reihe(20, 1, 0.5, 4) as (number | null)[]; w[5] = null;
    expect(wlsCodes(dt({ w }))).toContain('gewicht-fehlt');
    const y = reihe(20, 1, 2, 7) as (number | null)[]; y[5] = null;
    const d = dt({ w, y }); expect(d.gewichtFehlt).toBe(0); expect(d.n).toBe(19); expect(d.ausgelassen).toBe(1); expect(wlsCodes(d)).not.toContain('gewicht-fehlt');
  });
  it('das Gewicht darf nicht zugleich das Ziel oder eine Vorhersagespalte sein', () => {
    const q = daten(); expect(wlsCodes(wlsDaten('y', ['x'], 'y', q.zeilen, q.spalten))).toContain('gleiche-spalte'); expect(wlsCodes(wlsDaten('y', ['x', 'w'], 'w', q.zeilen, q.spalten))).toContain('gleiche-spalte');
  });
  it('zu wenige Fälle mit Gewicht über 0 und eine konstante Vorhersagespalte sperren', () => {
    const w = new Array(20).fill(0) as number[]; w[0] = 1; w[1] = 2; expect(wlsCodes(dt({ w }))).toContain('zu-wenig-faelle');
    expect(wlsCodes(dt({ x: new Array(20).fill(2) }))).toContain('konstant');
  });
  it('Präzisionsgewichte sind nicht das Fallgewicht: der Satz sagt es und nennt „beides zugleich“', () => {
    const t = wlsNichtFallgewicht(); expect(t).toContain('nicht das Fallgewicht'); expect(t).toContain('ändert n'); expect(t).toContain('Beides zugleich'); expect(t).toContain('Gewicht über 0');
  });
  it('Prüfliste: erste Zeile nennt die Fälle mit Gewicht über 0; jede Sperre hat einen Satz ohne R-Meldung', () => {
    expect(wlsPunkte(dt())[0]!.text).toContain('Gewicht über 0');
    for (const c of WLS_SPERREN) { const t = wlsCodeSatz(c, { n: 3, k: 2, zahl: 2, namen: ['x'] }).text; expect(t.length, c).toBeGreaterThan(20); expect(t).not.toMatch(/lm\(|weights|Error/); }
  });
});

describe('Gewichtete Regression: Aufruf', () => {
  it('der Aufruf enthält nur Bezeichner; das Gewicht heißt in R „zeit“, der Name aus der Datei steht nie im Code', () => {
    const boese = `w'); system('x'); ('`, q = sitz({ y: [1, 2, 3, 4, 6], x: [1, 2, 3, 4, 5], [boese]: [1, 1, 2, 2, 3] }), d = wlsDaten('y', ['x'], boese, q.zeilen, q.spalten);
    expect(wlsAufruf(d).code).toBe("tryCatch(sp_wls(d, 'y', c('p01'), character(0), 'zeit'), error = function(e) list(fehler = conditionMessage(e)))");
    expect(d.spalten.map(x => x.name)).toEqual(['y', 'p01', 'zeit']);
  });
  it('R-Text: Zeilen mit Gewicht 0 raus, lm mit weights, Namen maskiert', () => {
    const r = wlsRCode('y', ['a b'], 'Gewicht `2`');
    expect(r).toContain('daten$`Gewicht \\`2\\`` > 0'); expect(r).toContain('weights = `Gewicht \\`2\\``'); expect(r).toContain('y ~ `a b`');
  });
});

const k = (name: string, b: number) => ({ name, b: [b], se: [0.3], t: [b / 0.3], p: [0.01], ki_u: [b - 0.6], ki_o: [b + 0.6] });
const roh = (over: Record<string, unknown> = {}): Record<string, unknown> => ({ n: [18], ausgelassen: [0], nullen: [2], koef: [k('(Intercept)', 1.2), k('p01', 0.8)], r2: [0.61], r2_korr: [0.59], sigma: [2.2], df: [16], f: [25], f_df1: [1], f_df2: [16], f_p: [0.0001], gewicht_min: [0.5], gewicht_max: [2.5], ...over });
const lesen = (o: Record<string, unknown> = {}): WlsE => { const r = wlsLesen(roh(o), dt()); if (!r.ok) throw new Error(r.code); return r.e; };

describe('Gewichtete Regression: Antwort lesen und Sätze', () => {
  it('liest b, SE, t, p, R², σ, df, n und die Zahl der Nullen', () => { const e = lesen(); expect(e.koef.map(x => x.pIdx)).toEqual([-1, 0]); expect(e.n).toBe(18); expect(e.nullen).toBe(2); expect(e.r2).toBe(0.61); expect(e.df).toBe(16); expect(e.fP).toBe(0.0001); });
  it('Fehler und kaputte Antworten werden zu Codes', () => {
    expect(wlsLesen({ fehler: ['negative weight'] }, dt())).toEqual({ ok: false, code: 'gewicht-negativ' }); expect(wlsLesen({ fehler: ['??'] }, dt())).toEqual({ ok: false, code: 'r-fehler' });
    expect(wlsLesen(roh({ koef: [] }), dt())).toEqual({ ok: false, code: 'r-fehler' });
  });
  it('die Warnungen stehen immer: Gewichte aus Wissen über die Messgenauigkeit, nicht aus den Residuen; R² gewichtet; nicht das Fallgewicht', () => {
    const w = wlsWarnungen(lesen()).join(' ');
    expect(w).toContain('Wissen über die Messgenauigkeit'); expect(w).toContain('aus den Residuen derselben Daten'); expect(w).toContain('Standardfehler zu klein'); expect(w).toContain('R² ist gewichtet'); expect(w).toContain('nicht das Fallgewicht'); expect(w).toContain('2 Fälle mit Gewicht 0');
  });
  it('Hauptsatz, Zusatz und Tabellen', () => {
    const st = saetzeWls(lesen(), x => x), t = tabellenWls(lesen(), x => x);
    expect(st.haupt).toContain('Präzisionsgewichte'); expect(st.haupt).toMatch(/R² = ,61/); expect(st.zusatz).toContain('x: b = ');
    expect(t.map(x => x.label)).toEqual(['WLS Koeffizienten', 'WLS Modell']); expect(t[1]!.cells.some(c => c.t.includes('Zeilen mit Gewicht 0'))).toBe(true);
  });
  it('Abnahme 31.10. S3: ein benannter R-Wert („value“) ist eine Zahl, und fehlt p, behauptet der Satz keinen fehlenden Zusammenhang', () => {
    expect(lesen({ f: [26.69], f_p: { value: 1e-14 } }).fP).toBe(1e-14);
    const ohneP = saetzeWls(lesen({ f: [26.69], f_p: [NaN] }), x => x);
    expect(ohneP.haupt).not.toContain('keinen belegbaren'); expect(ohneP.haupt).not.toMatch(/p -/); expect(ohneP.apa).not.toMatch(/p -/);
    expect(saetzeWls(lesen({ f: [26.69], f_p: { value: 1e-14 } }), x => x).haupt).toContain('p < ,001');
  });
  it('englisch', () => { s.einst.sprache = 'en'; try { expect(saetzeWls(lesen(), x => x).haupt).toContain('precision weights'); } finally { s.einst.sprache = 'de'; } });
});
