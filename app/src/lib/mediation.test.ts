import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import { nodeEngine } from './testengine';
import { Bootstrap, mediation, mediationBefehl, mediationJackknife } from './mediation';
import { jackknife, normInter } from './bootstrap';

/* Vergleichswerte aus R (scripts/mediation-erwartet.R): lm für die Pfade, boot (20000 Ziehungen, quantile type 7) und lavaan/mediation::mediate für den indirekten Effekt.
 * Der Bootstrap-Startwert von Statable ist ein anderer als der von R: die Grenzen stimmen nur im Rahmen des Zufallsfehlers (hier ±0,02), der Punktschätzer exakt. */
let e: Awaited<ReturnType<typeof nodeEngine>>;
let daten: { x: number[]; m: number[]; y: number[] };
beforeAll(async () => {
  e = await nodeEngine();
  const b = zurEngine(leseCsv(readFileSync(new URL('./testdaten/mediation-moderation.csv', import.meta.url), 'utf8')));
  e.run(b.syntax, { '/import.csv': b.csv });
  const roh = leseCsv(readFileSync(new URL('./testdaten/mediation-moderation.csv', import.meta.url), 'utf8'));
  const sp = (n: string) => roh.kopf.indexOf(n);
  const zahl = (v: unknown) => (typeof v === 'string' ? Number(v.replace(',', '.')) : NaN);
  const z = roh.zeilen.map(r => [r[sp('unterstuetzung')], r[sp('selbstwirksamkeit')], r[sp('wohlbefinden')]].map(zahl)).filter(r => r.every(Number.isFinite));
  daten = { x: z.map(r => r[0]!), m: z.map(r => r[1]!), y: z.map(r => r[2]!) };
});
const r5 = (v: number) => Number(v.toFixed(5));

describe('Mediation gegen R', () => {
  it('Pfade aus PSPP, Gesamt = direkt + indirekt, Bootstrap im Zufallsrahmen', async () => {
    const items = e.run(mediationBefehl('unterstuetzung', 'selbstwirksamkeit', 'wohlbefinden'));
    const r = await mediation(items, 'unterstuetzung', 'selbstwirksamkeit', 'wohlbefinden', daten, 150);
    expect(daten.x.length).toBe(147);
    expect(r.n).toBe(147);
    expect([r.a, r.b, r.direkt, r.total].map(p => r5(p.b))).toEqual([0.465952, 0.911486, 0.416562, 0.841271].map(r5));
    expect([r.a, r.b, r.direkt, r.total].map(p => Number(p.se.toFixed(4)))).toEqual([0.0746, 0.1315, 0.1331, 0.136]);
    expect(Number(r.a.t.toFixed(3))).toBe(6.244);
    expect(Number(r.direkt.p.toFixed(5))).toBe(0.00212);
    expect([r.direkt.lo, r.direkt.hi].map(v => Number(v.toFixed(3)))).toEqual([0.153, 0.68]);
    expect(r.ab).toBeCloseTo(0.42470923, 7);
    expect(r.total.b - r.direkt.b).toBeCloseTo(r.ab, 4);
    expect(r.abStd).toBeCloseTo(0.23068002, 4);
    expect(r.anteil).toBeCloseTo(0.504842, 4);
    expect(Math.abs(r.abLo - 0.273534)).toBeLessThan(0.02);
    expect(Math.abs(r.abHi - 0.583967)).toBeLessThan(0.02);
    expect(Math.abs(r.abSe - 0.079061)).toBeLessThan(0.008);
    expect(r.abLo).toBeLessThan(r.ab); expect(r.abHi).toBeGreaterThan(r.ab);
    expect(r.abStdLo).toBeGreaterThan(0); expect(r.ziehungen).toBe(5000);
  });
  it('fester Startwert: gleiche Daten, gleiches Intervall', async () => {
    const items = e.run(mediationBefehl('unterstuetzung', 'selbstwirksamkeit', 'wohlbefinden'));
    const r1 = await mediation(items, 'unterstuetzung', 'selbstwirksamkeit', 'wohlbefinden', daten, 150);
    const items2 = e.run(mediationBefehl('unterstuetzung', 'selbstwirksamkeit', 'wohlbefinden'));
    const r2 = await mediation(items2, 'unterstuetzung', 'selbstwirksamkeit', 'wohlbefinden', daten, 150);
    expect([r1.abLo, r1.abHi]).toEqual([r2.abLo, r2.abHi]);
    const r3 = await mediation(items2, 'unterstuetzung', 'selbstwirksamkeit', 'wohlbefinden', daten, 150, undefined, 5000, 1);
    expect(r3.abLo).not.toBe(r1.abLo);
  });
  it('Bootstrap rechnet n = 150 × 5000 schnell (< 1 s)', () => {
    const t0 = performance.now(); const b = new Bootstrap(daten.x, daten.m, daten.y); b.weiter(5000);
    expect(performance.now() - t0).toBeLessThan(1000); expect(b.ab.length).toBe(5000);
  });
  it('Quantil wie das R-Paket boot (norm.inter): ganzzahliger Rang = Ordnungsstatistik, Rang unter 1 = kleinster Wert, sonst Interpolation auf der Normalskala', () => {
    expect(normInter([1, 2, 3, 4, 5], [0.5])[0]).toBe(3); expect(normInter([1, 2, 3, 4], [0.025])[0]).toBe(1); expect(normInter([1, 2, 3, 4], [0.975])[0]).toBe(4);
    const q = normInter([1, 2, 3, 4, 5, 6, 7, 8, 9], [0.25])[0]!; expect(q).toBeGreaterThan(2); expect(q).toBeLessThan(3);   // Rang 2,5
  });
  it('Jackknife der Mediation geschlossen aus Summen = allgemeiner Jackknife aus bootstrap.ts', () => {
    const k = mediationJackknife(daten), z = jackknife(idx => { let sx = 0, sm = 0, sy = 0, sxx = 0, sxm = 0, sxy = 0, smm = 0, smy = 0; const n = idx.length; for (const j of idx) { const x = daten.x[j]!, mm = daten.m[j]!, y = daten.y[j]!; sx += x; sm += mm; sy += y; sxx += x * x; sxm += x * mm; sxy += x * y; smm += mm * mm; smy += mm * y; }
      const cxx = sxx - sx * sx / n, cxm = sxm - sx * sm / n, cxy = sxy - sx * sy / n, cmm = smm - sm * sm / n, cmy = smy - sm * sy / n, det = cxx * cmm - cxm * cxm; return (cxm / cxx) * ((cxx * cmy - cxm * cxy) / det); }, daten.x.length);
    expect(k.L.length).toBe(147); k.L.forEach((v, i) => expect(Math.abs(v - z.L[i]!)).toBeLessThan(1e-9 * Math.max(1, Math.abs(v))));
  });
  it('die Daten der Person bleiben unverändert (TEMPORARY)', () => {
    const vorher = e.run('DESCRIPTIVES /VARIABLES=unterstuetzung.');
    e.run(mediationBefehl('unterstuetzung', 'selbstwirksamkeit', 'wohlbefinden'));
    const danach = e.run('DESCRIPTIVES /VARIABLES=unterstuetzung.');
    expect(JSON.stringify(danach)).toBe(JSON.stringify(vorher));
  });
});
