import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import { nodeEngine } from './testengine';
import { hilfsNamen, mittelwert, moderation, moderationBefehl } from './moderation';

/* Vergleichswerte aus R (scripts/mediation-erwartet.R): lm(y ~ xc * wc) auf zentrierten Daten, Handrechnung der einfachen Steigungen aus vcov(),
 * interactions::sim_slopes(…, johnson_neyman = TRUE). */
let e: Awaited<ReturnType<typeof nodeEngine>>;
let roh: ReturnType<typeof leseCsv>;
beforeAll(async () => {
  e = await nodeEngine();
  const text = readFileSync(new URL('./testdaten/mediation-moderation.csv', import.meta.url), 'utf8');
  const b = zurEngine(leseCsv(text));
  e.run(b.syntax, { '/import.csv': b.csv });
  roh = leseCsv(text);
});
const zahl = (v: unknown) => (typeof v === 'string' ? Number(v.replace(',', '.')) : NaN);
function spalten(x: string, w: string, y: string, wUmw?: (v: number) => number) {
  const ix = [x, w, y].map(n => roh.kopf.indexOf(n));
  const z = roh.zeilen.map(r => ix.map(i => zahl(r[i]))).filter(r => r.every(Number.isFinite));
  return { x: z.map(r => r[0]!), w: z.map(r => wUmw ? wUmw(r[1]!) : r[1]!), y: z.map(r => r[2]!) };
}
function rechne(x: string, w: string, y: string, daten: { x: number[]; w: number[]; y: number[] }, wBefehl = w) {
  const h = hilfsNamen([x, w, y]);
  return moderation(e.run(moderationBefehl(x, wBefehl, y, mittelwert(daten.x), mittelwert(daten.w), h)), x, w, y, daten, 150);
}
const r4 = (v: number) => Number(v.toFixed(4));

describe('Moderation gegen R', () => {
  it('stetiger Moderator: Koeffizienten, ΔR², einfache Steigungen, Johnson-Neyman', () => {
    const r = rechne('unterstuetzung', 'belastung', 'leistung', spalten('unterstuetzung', 'belastung', 'leistung'));
    expect(r.n).toBe(146);
    expect([r.konstante.b, r.bx.b, r.bw.b, r.bxw.b].map(r4)).toEqual([40.2706, 2.1059, -1.2248, 1.7324]);
    expect([r.bx.se, r.bw.se, r.bxw.se].map(r4)).toEqual([0.3285, 0.3814, 0.2751]);
    expect(r4(r.bxw.p)).toBe(0); expect(r.pDr2).toBeCloseTo(3.5506551e-9, 12);
    expect([r.r2, r.r2Ohne, r.dr2].map(v => Number(v.toFixed(6)))).toEqual([0.377135, 0.20317, 0.173964]);
    expect(r.fDr2).toBeCloseTo(39.660184, 4); expect(r.df2).toBe(142);
    expect(r.mw).toBeCloseTo(3.53219178, 7); expect(r.sdw).toBeCloseTo(1.20841503, 7);
    const [m1, m0, p1] = r.steigungen;
    expect([m1!.w, m0!.w, p1!.w].map(r4)).toEqual([2.3238, 3.5322, 4.7406]);
    expect([m1!.b, m0!.b, p1!.b].map(r4)).toEqual([0.0125, 2.1059, 4.1993]);
    expect([m1!.se, m0!.se, p1!.se].map(r4)).toEqual([0.4245, 0.3285, 0.5066]);
    expect([m1!.t, p1!.t].map(v => Number(v.toFixed(4)))).toEqual([0.0294, 8.2889]);
    expect(r4(m1!.p)).toBe(0.9766);
    expect([m1!.lo, m1!.hi].map(r4)).toEqual([-0.8266, 0.8516]);
    expect([p1!.lo, p1!.hi].map(r4)).toEqual([3.1978, 5.2008]);
    // Johnson-Neyman (interactions): nicht signifikant zwischen 1,6832 und 2,7299
    expect(r.jn.map(b => b.sig)).toEqual([true, false, true]);
    expect([r.jn[0]!.bis, r.jn[1]!.bis].map(r4)).toEqual([1.6832, 2.7299]);
    expect(r.jn[0]!.von).toBe(1); expect(r.jn[2]!.bis).toBe(6.5);
  });
  it('Moderator mit zwei Werten: Steigung bei beiden Werten, kein Johnson-Neyman', () => {
    e.run('COMPUTE w01 = (belastung > 3.5).\nEXECUTE.');
    const d = spalten('unterstuetzung', 'belastung', 'leistung', v => (v > 3.5 ? 1 : 0));
    const r = rechne('unterstuetzung', 'w01', 'leistung', d);
    expect(r.zwei).toBe(true); expect(r.jn).toEqual([]);
    expect([r.bx.b, r.bw.b, r.bxw.b].map(r4)).toEqual([1.9758, -3.4541, 3.9728]);
    expect(r.steigungen.map(s => s.w)).toEqual([0, 1]);
    expect(r.steigungen.map(s => r4(s.b))).toEqual([0.316, 4.2888]);
    expect(r.steigungen.map(s => r4(s.se))).toEqual([0.414, 0.582]);
    expect(r.steigungen.map(s => r4(s.p))).toEqual([0.4466, 0]);
  });
});

describe('Hilfsspalten', () => {
  it('Namen weichen vergebenen Namen aus', () => {
    expect(hilfsNamen(['a']).xz).toBe('ZX_HILF');
    expect(hilfsNamen(['zx_hilf']).xz).toBe('ZX_HILF1');
  });
  it('die Daten bleiben unverändert (TEMPORARY): Hilfsspalten gibt es danach nicht', () => {
    const d = spalten('unterstuetzung', 'belastung', 'leistung');
    rechne('unterstuetzung', 'belastung', 'leistung', d);
    const msg = e.run('DESCRIPTIVES /VARIABLES=ZX_HILF.');
    expect(msg.some(i => i.type === 'message' && i.severity === 'error')).toBe(true);
  });
});
