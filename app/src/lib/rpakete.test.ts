import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import liste from './rpakete.json';

/* Die Liste der R-Pakete auf der Seite „Impressum“ (seiten/Rechtliches.svelte) wird aus dem Paketindex scripts/webr-PACKAGES erzeugt (node scripts/rechtliches-pakete.mjs, von scripts/webr-holen.sh aufgerufen).
 * Dieser Test hält sie aktuell: kommt ein Paket hinzu oder wechselt eine Version, schlägt er an, bis die Liste neu erzeugt ist. */
const wurzel = join(import.meta.dirname, '../../..');
const index = readFileSync(join(wurzel, 'scripts/webr-PACKAGES'), 'utf8');
function lese(text: string): { paket: string; version: string; lizenz: string }[] {
  return text.trim().split('\n\n').map(b => {
    const d: Record<string, string> = {}; let letzte = '';
    for (const z of b.split('\n')) { if (/^\s/.test(z)) d[letzte] += ' ' + z.trim(); else { const i = z.indexOf(': '); letzte = z.slice(0, i); d[letzte] = z.slice(i + 2); } }
    return { paket: d.Package!, version: d.Version!, lizenz: (d.License ?? '').replace(/\s+/g, ' ').trim() };
  }).sort((a, b) => a.paket.toLowerCase().localeCompare(b.paket.toLowerCase(), 'en'));
}

describe('Liste der R-Pakete im Impressum', () => {
  it('stimmt mit dem Paketindex überein (Paket, Version, Lizenz) - sonst: node scripts/rechtliches-pakete.mjs', () => { expect(liste).toEqual(lese(index)); });
  it('nennt die Pakete der späteren Verfahren (survey, mitools, DBI, quantreg, SparseM, MatrixModels, glmnet, foreach, iterators, shape, codetools)', () => {
    const namen = liste.map(p => p.paket);
    for (const n of ['survey', 'mitools', 'DBI', 'quantreg', 'SparseM', 'MatrixModels', 'glmnet', 'foreach', 'iterators', 'shape', 'codetools', 'survival', 'nnet', 'lavaan', 'lme4', 'metafor']) expect(namen, n).toContain(n);
  });
  it('jedes Paket hat Version und Lizenz; keines kommt doppelt vor', () => {
    for (const p of liste) { expect(p.version, p.paket).toMatch(/^[\d.-]+$/); expect(p.lizenz.length, p.paket).toBeGreaterThan(2); }
    expect(new Set(liste.map(p => p.paket)).size).toBe(liste.length);
  });
  it('jedes Paket im ausgelieferten Ordner (falls da) steht in der Liste', () => {
    const m = join(wurzel, 'app/public/webr/manifest.json');
    if (!existsSync(m)) return;   // der Ordner webr/ gehört nicht ins Git
    const pakete = Object.keys(JSON.parse(readFileSync(m, 'utf8')).pakete as Record<string, unknown>);
    expect(liste.map(p => p.paket).sort()).toEqual([...pakete].sort());
  });
  it('die Quelltext-Liste (scripts/webr-QUELLTEXT.txt) nennt jedes Paket der Liste', () => {
    const q = readFileSync(join(wurzel, 'scripts/webr-QUELLTEXT.txt'), 'utf8');
    const fehlt = liste.map(p => p.paket).filter(n => !new RegExp(`\\b${n}\\b`).test(q));
    expect(fehlt).toEqual([]);
  });
});
