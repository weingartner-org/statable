import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { kmoJeFrage, type KmoFrage, type KmoFehler } from './kmofrage';
import { faktoren } from './ergebnis';
import { VERFAHREN } from './verfahren';
import { nodeEngine } from './testengine';

/* Sollwerte: docs/fachblaetter/sollwerte/field-stufe1.json (R: psych::KMO und det(cor()) für bfi A1-A5, C1-C5, listenweise, n = 2632). Daten: docs/fachblaetter/sollwerte/bfi-ac.csv. */
const dir = join(__dirname, '../../../docs/fachblaetter/sollwerte');
const soll = JSON.parse(readFileSync(join(dir, 'field-stufe1.json'), 'utf8')).kmo;
const csv = readFileSync(join(dir, 'bfi-ac.csv'), 'utf8').trim().split('\n');
const kopf = csv[0]!.replace(/"/g, '').split(',');
const alle = csv.slice(1).map(z => z.split(',').map(v => (v === 'NA' || v === '' ? NaN : Number(v))));
const voll = alle.filter(z => z.every(Number.isFinite));
const nah = (a: number, b: number, tol = 1e-6, was = '') => expect(Math.abs(a - b) <= tol * Math.abs(b), `${was} ${a} gegen ${b}`).toBe(true);
const g = (r: KmoFrage | KmoFehler): KmoFrage => { if ('fehler' in r) throw new Error(r.fehler); return r; };

describe('KMO je Frage und Determinante gegen R (bfi)', () => {
  const k = g(kmoJeFrage(voll));
  it('Daten wie in R: 2632 Fälle, zehn Fragen', () => { expect(kopf).toEqual(soll.spalten); expect(voll).toHaveLength(soll.n); expect(k.n).toBe(soll.n); });
  it('KMO gesamt, MSA je Frage, Determinante', () => {
    nah(k.kmo, soll.kmo); k.msa.forEach((v, i) => nah(v, soll.msa[i], 1e-6, `MSA ${kopf[i]}`)); nah(k.determinante, soll.determinante);
  });
  it('Anti-Image: Diagonale = MSA, Nebendiagonale symmetrisch und klein', () => {
    k.antiImage.forEach((r, i) => { nah(r[i]!, k.msa[i]!, 1e-12); r.forEach((v, j) => { if (i !== j) { expect(Math.abs(v)).toBeLessThan(1); nah(v, k.antiImage[j]![i]!, 1e-9); } }); });
  });
  it('Fehler: zu wenig Fälle, doppelte Frage, konstante Frage', () => {
    expect(kmoJeFrage([[1, 2, 3], [2, 3, 4]])).toEqual({ fehler: 'zu-wenig-faelle' });
    expect(kmoJeFrage(voll.slice(0, 200).map(z => [z[0]!, z[1]!, z[1]!]))).toEqual({ fehler: 'singulaer' });
    expect(kmoJeFrage(voll.slice(0, 200).map(z => [z[0]!, z[1]!, 3]))).toEqual({ fehler: 'konstant' });
  });
});

describe('Kontrolle: KMO gesamt gleich dem Wert von PSPP', () => {
  let e: Awaited<ReturnType<typeof nodeEngine>>;
  beforeAll(async () => { e = await nodeEngine(); });
  it('PSPP FACTOR liefert dasselbe Gesamt-KMO (listenweise, n = 2632)', () => {
    const v = VERFAHREN.find(x => x.id === 'faktor')!;
    const daten = voll.map(z => z.join(' ')).join('\n');
    e.run(`DATA LIST FREE /${kopf.join(' ')}.\nBEGIN DATA.\n${daten}\nEND DATA.`);
    const r = faktoren(e.run(v.syntax({ l1: kopf, l2: [], l3: [], l4: [] }, {} as never)));
    nah(r.kmo!.kmo, soll.kmo, 1e-6); nah(g(kmoJeFrage(voll)).kmo, r.kmo!.kmo, 1e-6);
  });
});
