import { describe, expect, it } from 'vitest';
import { basisWechseln, zeilenDesJahres, vorjahr, verketten, preisIndex, rasterPlatz, indexCodeSatz, type Gut } from './indexzahlen';
import ERW from './testdaten/index-armut-erwartet.json';

/* Abschnitt 3, Teil 1 (Fachblatt Index, Armut, Ungleichheit): Index in JavaScript gegen die Sollwerte aus scripts/index-armut-erwartet.R (R, gegen micEconIndex und von Hand geprüft).
 * Toleranz 1e-9. Die Sollwerte stehen nur in der JSON-Datei, nie in diesem Test. */

const TOL = 1e-9;
const nah = (ist: (number | null)[], soll: (number | null)[], was: string) => {
  expect(ist.length, `${was}: Länge`).toBe(soll.length);
  soll.forEach((s, i) => {
    if (s === null) expect(ist[i], `${was}[${i}] leer`).toBeNull();
    else { expect(ist[i], `${was}[${i}] vorhanden`).not.toBeNull(); expect(Math.abs(ist[i]! - s), `${was}[${i}] (ist ${ist[i]}, soll ${s})`).toBeLessThan(TOL); }
  });
};
const R = ERW.reihe, y = R.y as number[];
const jahre = y.map((_, i) => 1949 + Math.floor(i / 12));
/** Die Monate der Reihe als ISO-Daten: 1949-01-01, 1949-02-01 … */
const isoMonate = y.map((_, i) => `${1949 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}-01`);

describe('Basisperiode wechseln', () => {
  it('Basis ein ganzes Jahr (1955): Mittel des Jahres = 100', () => {
    const r = basisWechseln(y, zeilenDesJahres(jahre, 1955));
    expect(r.ok).toBe(true); if (r.ok) nah(r.werte, R.basis1955, 'basis1955');
  });
  it('Basis ein Zeitpunkt (Januar 1955)', () => {
    const r = basisWechseln(y, [isoMonate.indexOf('1955-01-01')]);
    expect(r.ok).toBe(true); if (r.ok) nah(r.werte, R.basisjan1955, 'basisjan1955');
  });
  it('Fehlt ein Wert der Basisperiode: gesperrt, nichts wird ersetzt', () => {
    const x: (number | null)[] = [...y]; x[75] = null;
    const r = basisWechseln(x, zeilenDesJahres(jahre, 1955));
    expect(r).toMatchObject({ ok: false, code: 'basis-fehlt', fehlend: 1 });
    expect(indexCodeSatz('basis-fehlt', { fehlend: 1 }).text).toMatch(/fehlt ein Wert|A value is missing/);
  });
  it('Basis 0 oder negativ: gesperrt; Basisperiode ohne Zeile: gesperrt', () => {
    expect(basisWechseln([0, 1, 2], [0])).toMatchObject({ ok: false, code: 'basis-null' });
    expect(basisWechseln([-5, 1, 2], [0])).toMatchObject({ ok: false, code: 'basis-null' });
    expect(basisWechseln([1, 2, 3], [])).toMatchObject({ ok: false, code: 'basis-leer' });
    expect(basisWechseln([1, 2, 3], [7])).toMatchObject({ ok: false, code: 'basis-leer' });
  });
  it('Lücken außerhalb der Basis bleiben leer, es wird nichts aufgefüllt', () => {
    const x: (number | null)[] = [10, null, 20, 30];
    const r = basisWechseln(x, [0]);
    expect(r.ok).toBe(true); if (r.ok) { expect(r.werte[1]).toBeNull(); expect(r.werte.filter(v => v === null).length).toBe(1); }
  });
});

describe('Veränderung zum Vorjahr', () => {
  it('monatlich, nach der Reihenfolge der Zeilen (L = 12)', () => {
    const r = vorjahr(y, 'monatlich');
    expect(r.ok).toBe(true); if (r.ok) nah(r.werte, R.vorjahr as (number | null)[], 'vorjahr');
  });
  it('monatlich, nach dem Datum - auch bei vermischter Reihenfolge der Zeilen', () => {
    const r = vorjahr(y, 'monatlich', isoMonate);
    expect(r.ok).toBe(true); if (r.ok) nah(r.werte, R.vorjahr as (number | null)[], 'vorjahr mit Datum');
    const ord = y.map((_, i) => (i * 7) % y.length);   // 7 ist teilerfremd zu 144: eine Umordnung
    const r2 = vorjahr(ord.map(i => y[i]!), 'monatlich', ord.map(i => isoMonate[i]!));
    expect(r2.ok).toBe(true); if (r2.ok) nah(r2.werte, ord.map(i => (R.vorjahr as (number | null)[])[i]!), 'vorjahr umgeordnet');
  });
  it('Lücke oder Vorwert 0: leer, nichts wird aufgefüllt', () => {
    const x: (number | null)[] = [...y]; x[20] = null; x[40] = 0;
    const r = vorjahr(x, 'monatlich');
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.werte[20]).toBeNull(); expect(r.werte[32]).toBeNull(); expect(r.werte[52]).toBeNull(); expect(r.luecke).toBeGreaterThan(0); expect(r.nullVorwert).toBe(1); }
  });
  it('fehlt ein Monat in den Daten (Zeile fehlt), wird der Vorwert nach dem Datum gesucht, nicht nach der Zeilenzahl', () => {
    const behalte = y.map((_, i) => i).filter(i => i !== 20);
    const r = vorjahr(behalte.map(i => y[i]!), 'monatlich', behalte.map(i => isoMonate[i]!));
    expect(r.ok).toBe(true);
    if (r.ok) { const pos = (i: number) => behalte.indexOf(i); expect(r.werte[pos(32)]).toBeNull(); expect(r.werte[pos(60)]!).toBeCloseTo((R.vorjahr as number[])[60]!, 9); expect(r.ohneVorwert).toBeGreaterThan(12); }
  });
  it('vierteljährlich und jährlich: L = 4 und 1', () => {
    const q = [100, 110, 120, 130, 120, 121, 132, 143];
    const r = vorjahr(q, 'vierteljaehrlich'); expect(r.ok).toBe(true); if (r.ok) { expect(r.l).toBe(4); expect(r.werte.slice(0, 4)).toEqual([null, null, null, null]); expect(r.werte[4]).toBeCloseTo((q[4]! / q[0]!) * 100 - 100, 12); }
    const j = vorjahr([5, 6, 9], 'jaehrlich'); expect(j.ok).toBe(true); if (j.ok) { expect(j.l).toBe(1); expect(j.werte[0]).toBeNull(); expect(j.werte[2]).toBeCloseTo(50, 12); }
  });
  it('wöchentlich (L = 52) nach Datum; täglich und ungleich sind gesperrt', () => {
    const tag0 = Date.UTC(2020, 0, 6), wochen = Array.from({ length: 60 }, (_, i) => new Date(tag0 + i * 7 * 86_400_000).toISOString().slice(0, 10));
    const v = wochen.map((_, i) => 100 + i);
    const r = vorjahr(v, 'woechentlich', wochen); expect(r.ok).toBe(true); if (r.ok) { expect(r.werte[51]).toBeNull(); expect(r.werte[52]).toBeCloseTo((v[52]! / v[0]!) * 100 - 100, 12); }
    expect(vorjahr(v, 'taeglich')).toMatchObject({ ok: false, code: 'raster' });
    expect(vorjahr(v, 'ungleich')).toMatchObject({ ok: false, code: 'raster' });
  });
  it('doppelter Zeitpunkt und zu kurze Reihe sind gesperrt; ungültiges Datum bleibt leer', () => {
    expect(vorjahr([1, 2, 3], 'jaehrlich', ['2020-01-01', '2020-06-01', '2021-01-01'])).toMatchObject({ ok: false, code: 'doppelt' });
    expect(vorjahr([1, 2, 3], 'monatlich')).toMatchObject({ ok: false, code: 'zu-kurz' });
    const r = vorjahr([1, 2, 3], 'jaehrlich', ['2019-01-01', 'kein Datum', '2021-01-01']); expect(r.ok).toBe(true); if (r.ok) { expect(r.ohneDatum).toBe(1); expect(r.werte[1]).toBeNull(); }
  });
  it('rasterPlatz: gültige und ungültige Daten', () => {
    expect(rasterPlatz('2021-02-30', 'monatlich')).toBeNull(); expect(rasterPlatz(null, 'jaehrlich')).toBeNull(); expect(rasterPlatz('2021-05-17', 'jaehrlich')).toBe(2021);
  });
});

describe('Verketten', () => {
  const V = ERW.verkettung, a = V.alt as (number | null)[], b = V.neu as (number | null)[], u = (V.ueberlappung as number) - 1;
  it('auf die neue Basis: a_t · b_u / a_u; auf die alte: b_t · a_u / b_u', () => {
    const r = verketten(a, b, u);
    expect(r.ok).toBe(true);
    if (r.ok) { nah(r.aufNeu, V.auf_neu as number[], 'auf neu'); nah(r.aufAlt, V.auf_alt as number[], 'auf alt'); expect(r.gemeinsam).toEqual([u]); }
  });
  it('ohne Angabe gilt der letzte gemeinsame Zeitpunkt', () => {
    const r = verketten(a, b); expect(r.ok).toBe(true); if (r.ok) expect(r.u).toBe(u);
    const mehr = verketten([90, 95, 100, 104, 108, 110, null], [null, null, 98, 100, 105, 107, 111]);
    expect(mehr.ok).toBe(true); if (mehr.ok) { expect(mehr.gemeinsam).toEqual([2, 3, 4, 5]); expect(mehr.u).toBe(5); }
    const gew = verketten([90, 95, 100, 104, 108, 110, null], [null, null, 98, 100, 105, 107, 111], 3); expect(gew.ok).toBe(true); if (gew.ok) expect(gew.u).toBe(3);
  });
  it('kein gemeinsamer Zeitpunkt: gesperrt, geschätzt wird nie; ein Zeitpunkt, der nicht gemeinsam ist, ebenso', () => {
    expect(verketten([1, 2, null, null], [null, null, 3, 4])).toMatchObject({ ok: false, code: 'kein-gemeinsam' });
    expect(verketten(a, b, 0)).toMatchObject({ ok: false, code: 'u-ungueltig' });
    expect(verketten([100, 0], [100, 50], 1)).toMatchObject({ ok: false, code: 'basis-null' });
    expect(verketten([5, 0], [7, 0])).toMatchObject({ ok: false, code: 'basis-null' });
  });
});

describe('Laspeyres und Paasche', () => {
  const W = ERW.warenkorb, D = W.daten as Record<string, number[]>;
  const gueter: Gut[] = [1, 2, 3].map(k => ({ p: D[`p${k}`]!, q: D[`q${k}`]! }));
  it('Laspeyres, Paasche und Mengenindex gegen die Sollwerte (Basis: erste Periode)', () => {
    const r = preisIndex(gueter, 0);
    expect(r.ok).toBe(true);
    if (r.ok) { nah(r.laspeyres, W.laspeyres, 'Laspeyres'); nah(r.paasche, W.paasche, 'Paasche'); nah(r.menge, W.laspeyres_menge, 'Mengenindex'); expect(r.gesperrt).toEqual([]); }
  });
  it('fehlender Wert oder Preis ≤ 0 sperrt genau diesen Zeitpunkt, es gibt keinen Ersatz', () => {
    const g2: Gut[] = gueter.map(g => ({ p: [...g.p], q: [...g.q] })) as Gut[];
    (g2[1]!.q as (number | null)[])[2] = null; (g2[0]!.p as (number | null)[])[3] = 0;
    const r = preisIndex(g2, 0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.laspeyres[2]).toBeNull(); expect(r.paasche[2]).toBeNull(); expect(r.menge[2]).toBeNull(); expect(r.laspeyres[3]).toBeNull();
      expect(r.gesperrt).toEqual([{ zeile: 2, grund: 'fehlt' }, { zeile: 3, grund: 'preis' }]);
      nah([r.laspeyres[0]!, r.laspeyres[1]!], [W.laspeyres[0], W.laspeyres[1]] as number[], 'unberührte Zeitpunkte');
    }
  });
  it('ungültige Basisperiode, ein einziges Gut und andere Basisperiode', () => {
    const g3: Gut[] = gueter.map(g => ({ p: [...g.p], q: [...g.q] })) as Gut[];
    (g3[2]!.p as (number | null)[])[0] = null;
    expect(preisIndex(g3, 0)).toMatchObject({ ok: false, code: 'basis-ungueltig', grund: 'fehlt' });
    expect(preisIndex([gueter[0]!], 0)).toMatchObject({ ok: false, code: 'zu-wenig-gueter' });
    expect(preisIndex(gueter, 9)).toMatchObject({ ok: false, code: 'basis-leer' });
    const r = preisIndex(gueter, 1); expect(r.ok).toBe(true); if (r.ok) { expect(r.laspeyres[1]).toBeCloseTo(100, 12); expect(r.paasche[1]).toBeCloseTo(100, 12); expect(r.menge[1]).toBeCloseTo(100, 12); }
  });
});
