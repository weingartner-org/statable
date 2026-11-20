import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { leseTranskript } from './transkript-lesen';

const ORDNER = new URL('../../../docs/ausbau/beispiele/', import.meta.url);
const bytes = (n: string): Uint8Array => new Uint8Array(readFileSync(new URL(n, ORDNER)));
const csv = (n: string): { kopf: string[]; zeilen: string[][] } => {
  const z = readFileSync(new URL(n, ORDNER), 'utf8').replace(/\r?\n$/, '').split(/\r?\n/).map(s => s.split(','));
  return { kopf: z[0], zeilen: z.slice(1) };
};

describe('Beispielprojekt Hilfesuchen (docs/ausbau/beispiele)', () => {
  it.each([1, 2, 3, 4, 5].map(i => `interview-0${i}.txt`))('%s wird gelesen', async (name) => {
    const roh = await leseTranskript(name, bytes(name));
    const sprecher = [...new Set(roh.beitraege.map(b => b.sprecher))];
    expect(roh.beitraege.length).toBeGreaterThanOrEqual(12);
    expect(sprecher).toHaveLength(2);
    expect(roh.beitraege[0].sprecher).toBe('I');
    const zeiten = roh.beitraege.map(b => b.zeitMs);
    expect(zeiten.every(z => typeof z === 'number')).toBe(true);
    for (let i = 1; i < zeiten.length; i++) expect(zeiten[i]!).toBeGreaterThan(zeiten[i - 1]!);
  });

  it('faelle.csv und umfrage.csv passen zusammen', () => {
    const f = csv('faelle.csv');
    const u = csv('umfrage.csv');
    expect(f.zeilen).toHaveLength(5);
    expect(u.zeilen).toHaveLength(60);
    const ids = new Set(u.zeilen.map(z => z[0]));
    const sidx = f.kopf.indexOf('survey_id');
    for (const z of f.zeilen) expect(ids.has(z[sidx])).toBe(true);
    for (const z of u.zeilen) expect(z).toHaveLength(u.kopf.length);
    for (let k = 1; k <= 6; k++) {
      const col = u.kopf.indexOf('hs' + k);
      for (const z of u.zeilen) expect(z[col] === '' || (+z[col] >= 1 && +z[col] <= 5)).toBe(true);
    }
  });
});
