import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { sitz, reihe } from './kptesthilfe';
import { probitDaten, probitCodes, probitCodeSatz, probitPunkte, probitAufruf, probitLesen, probitWarnungen, saetzeProbit, tabellenProbit, probitRCode, PROBIT_SPERREN, probitKoefZahl, type ProbitE } from './probit';

/* Probit (Fachblatt KURSPAKET, Abschnitt 4): Kodierung des Ziels, Sperren, Warnsätze (nie verschluckt), Einlesen der Antwort. Die Rechnung prüft engine/kurspaket.webr.test.ts gegen die Sollwerte. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';

const daten = (o: { y?: (number | string | null)[]; x?: (number | null)[]; w?: (number | null)[] } = {}) => {
  const y = o.y ?? Array.from({ length: 40 }, (_, i) => (i % 3 === 0 || i % 7 === 0 ? 1 : 0));
  const cols: Record<string, (number | string | null)[]> = { y, x: o.x ?? reihe(40, 0, 1, 9).map((v, i) => v + (y[i] === 1 ? 2 : 0)), w: o.w ?? reihe(40, 1, 0.5, 5) };
  return sitz(cols, typeof y[0] === 'string' ? ['y'] : []);
};
const dt = (o: Parameters<typeof daten>[0] = {}, praed = ['x', 'w']) => { const q = daten(o); return probitDaten('y', praed, q.zeilen, q.spalten); };

describe('Probit: Kodierung und Sperren', () => {
  it('das Ereignis ist der größere Wert (Zahlen) bzw. die zweite Stufe (Text); das Ziel geht als 0/1 nach R', () => {
    const d = dt(); expect(d.ereignis).toBe('1'); expect(d.vergleich).toBe('0'); expect(d.spalten[0]!.werte.every(v => v === 0 || v === 1)).toBe(true);
    expect(d.nEreignis + d.nKein).toBe(40);
    const t = dt({ y: Array.from({ length: 40 }, (_, i) => (i % 2 ? 'b' : 'a')) });
    expect(t.ereignis).toBe('b'); expect(t.vergleich).toBe('a');   // alphabetisch: der später sortierte Wert ist das Ereignis, wie bei der logistischen Regression expect(t.nEreignis).toBe(20);
  });
  it('Codes 2 und 5 (nicht 0 und 1): das Ereignis ist 5', () => { const d = dt({ y: Array.from({ length: 40 }, (_, i) => (i % 2 ? 5 : 2)) }); expect(d.ereignis).toBe('5'); expect(d.nEreignis).toBe(20); });
  it('Fälle mit einer Lücke fallen weg, die Zahl wird genannt', () => {
    const x = reihe(40, 0, 1, 9) as (number | null)[]; x[2] = null; x[9] = null;
    const d = dt({ x }); expect(d.n).toBe(38); expect(d.ausgelassen).toBe(2); const p = probitPunkte(d); expect(p[0]!.text).toContain('38'); expect(p[0]!.klein).toContain('2');
  });
  it('Sperren: kein Ja/Nein-Ziel, nur ein Wert, konstante Spalte, zu wenige Fälle', () => {
    expect(probitCodes(dt({ y: Array.from({ length: 40 }, (_, i) => i % 4) }))).toContain('ziel-keine-zwei');
    expect(probitCodes(dt({ y: new Array(40).fill(1) }))).toContain('ziel-keine-zwei');
    const q = sitz({ y: [0, 1, 0, 1, 0, 1], x: [1, 2, 1, 4, 3, 5], w: [3, 3, 3, 3, 3, 3] }); expect(probitCodes(probitDaten('y', ['x', 'w'], q.zeilen, q.spalten))).toContain('konstant');
    const k = sitz({ y: [0, 1, 0], x: [1, 2, 3], w: [3, 1, 2] }); expect(probitCodes(probitDaten('y', ['x', 'w'], k.zeilen, k.spalten))).toContain('zu-wenig-faelle');
  });
  it('Hinweis bei wenigen Fällen in der kleineren Gruppe (unter 10 je Koeffizient), keine Sperre', () => {
    const y = Array.from({ length: 40 }, (_, i) => (i < 5 ? 1 : 0)), d = dt({ y }), c = probitCodes(d);
    expect(c).toContain('wenige-ereignisse'); expect(PROBIT_SPERREN.has('wenige-ereignisse')).toBe(false); expect(probitCodeSatz('wenige-ereignisse', { kleinste: 5 }).text).toContain('5 Fälle');
  });
  it('jede Sperre hat einen Satz ohne R-Meldung', () => { for (const c of PROBIT_SPERREN) { const t = probitCodeSatz(c, { n: 3, k: 2, namen: ['x'] }).text; expect(t.length, c).toBeGreaterThan(20); expect(t).not.toMatch(/glm|binomial|Error/); } });
  it('Koeffizienten zählen: Gruppen-Spalten mit k Stufen zählen k − 1', () => { expect(probitKoefZahl([{ name: 'a', art: 'zahl', stufen: [] }, { name: 'b', art: 'faktor', stufen: ['x', 'y', 'z'] }])).toBe(3); });
});

describe('Probit: Aufruf', () => {
  it('der Aufruf enthält nur Bezeichner; Namen aus der Datei nie', () => {
    const boese = `x'); system('x'); ('`, q = sitz({ y: [0, 1, 0, 1, 1, 0], [boese]: [1, 2, 3, 5, 4, 3] }), d = probitDaten('y', [boese], q.zeilen, q.spalten);
    expect(probitAufruf(d).code).toBe("tryCatch(sp_probit(d, 'y', c('p01'), character(0)), error = function(e) list(fehler = conditionMessage(e)))");
  });
  it('R-Text: Genauigkeit epsilon 1e-12 und maxit 100, Namen maskiert', () => {
    const r = probitRCode('Ziel y', ['a b', 'c']);
    expect(r).toContain("binomial('probit')"); expect(r).toContain('glm.control(epsilon = 1e-12, maxit = 100)'); expect(r).toContain('`Ziel y` ~ `a b` + c');
  });
});

const koef = (name: string, b: number, p: number) => ({ name, b: [b], se: [0.5], z: [b / 0.5], p: [p], ki_u: [b - 1], ki_o: [b + 1] });
const roh = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  n: [40], ausgelassen: [0], ereignisse: [18], koef: [koef('(Intercept)', -1.5, 0.003), koef('p01', 0.4, 0.001), koef('p02', 0.1, 0.5)], aic: [50.2], devianz: [44.2], null: [54.5], df_res: [37], df_null: [39],
  modelltest: { chi2: [10.3], df: [2], p: [0.006] }, konvergiert: [true], fast_trennbar: [false], warnung: [false], ...over
});
const lesen = (o: Record<string, unknown> = {}): ProbitE => { const r = probitLesen(roh(o), dt()); if (!r.ok) throw new Error(r.code); return r.e; };

describe('Probit: Antwort lesen und Sätze', () => {
  it('liest b, SE, z, p und Intervall je Zeile; die Konstante bekommt Nummer −1, die Vorhersagespalten ihre Nummer', () => {
    const e = lesen(); expect(e.koef.map(k => k.pIdx)).toEqual([-1, 0, 1]); expect(e.koef[1]!.b).toBe(0.4); expect(e.aic).toBe(50.2); expect(e.modelltest.df).toBe(2); expect(e.konvergiert).toBe(true);
  });
  it('Fehler und kaputte Antworten werden zu Codes', () => {
    expect(probitLesen({ fehler: ['outcome must have both values 0 and 1'] }, dt())).toEqual({ ok: false, code: 'ein-wert' });
    expect(probitLesen({ fehler: ['x'] }, dt())).toEqual({ ok: false, code: 'r-fehler' }); expect(probitLesen(roh({ koef: [] }), dt())).toEqual({ ok: false, code: 'r-fehler' }); expect(probitLesen(null, dt())).toEqual({ ok: false, code: 'r-fehler' });
  });
  it('fast trennbare Daten: die Warnung von R wird als Satz gezeigt, nie verschluckt; ebenso keine Konvergenz', () => {
    const w = probitWarnungen(lesen({ fast_trennbar: [true], warnung: [true], konvergiert: [false] })).join(' ');
    expect(w).toContain('fast oder ganz trennbar'); expect(w).toContain('Standardfehler sind dann unzuverlässig'); expect(w).toContain('R hat bei der Rechnung eine Warnung gemeldet'); expect(w).toContain('keine Konvergenz');
    expect(probitWarnungen(lesen()).join(' ')).not.toContain('trennbar');
  });
  it('kein Odds Ratio: b steht auf der Skala der Normalverteilung; Logit und Probit geben fast immer dieselbe Aussage', () => {
    const w = probitWarnungen(lesen()).join(' ');
    expect(w).toContain('Skala der Normalverteilung'); expect(w).toContain('Odds Ratio gibt es nur beim Logit'); expect(w).toContain('fast immer dieselbe Aussage');
    const t = tabellenProbit(lesen(), x => x); expect(t[0]!.footnotes.map(f => f.t).join(' ')).toContain('kein Odds Ratio'); expect(t[0]!.cells.some(c => /odds/i.test(c.t) && c.r === 0)).toBe(false);
  });
  it('der Hauptsatz nennt Ereignis und Vergleich und die Wirkungen; ein nicht belegter Zusammenhang wird so genannt', () => {
    const st = saetzeProbit(lesen(), x => x);
    expect(st.haupt).toContain('Ereignis „1“ (gegen „0“)'); expect(st.zusatz).toContain('x: Ein höherer Wert geht mit einer höheren Wahrscheinlichkeit'); expect(st.zusatz).toContain('w: Ein Zusammenhang lässt sich nicht belegen');
    expect(st.apa).toContain('Probit'); expect(tabellenProbit(lesen(), x => x).map(t => t.label)).toEqual(['Probit Koeffizienten', 'Probit Modell']);
  });
  it('englisch', () => { s.einst.sprache = 'en'; try { expect(saetzeProbit(lesen(), x => x).haupt).toContain('probit model'); } finally { s.einst.sprache = 'de'; } });
});
