import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Wächter (Rest-Block B, B11): Ein Bereich (`<section aria-labelledby="x">`) darf nicht nach einer Überschrift heißen,
 *  die selbst den Fokus bekommt (`id="x" tabindex="-1"`). Sonst sagt NVDA beim Fokus "Name, Region, Name, Überschrift".
 *  Lösung: Der Bereich bekommt einen eigenen kurzen Namen (`aria-label`, z. B. "Schritt 2"). */
const SRC = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
function dateien(o: string, aus: string[] = []): string[] {
  for (const n of readdirSync(o)) { const p = join(o, n); if (statSync(p).isDirectory()) { if (n !== 'node_modules') dateien(p, aus); } else if (p.endsWith('.svelte')) aus.push(p); }
  return aus;
}
export function doppelte(code: string): string[] {
  const aus: string[] = [];
  for (const m of code.matchAll(/<(?:section|article)\b[^>]*\baria-labelledby="([^"{}]+)"/g)) {
    const id = m[1]!;
    if (new RegExp(String.raw`<h[1-6]\b[^>]*\bid="${id}"[^>]*\btabindex="-1"`).test(code)) aus.push(id);
  }
  return aus;
}
describe('Wächter: Bereich und fokussierte Überschrift nicht gleichnamig', () => {
  it('erkennt den Fehler (Gegenprobe)', () => {
    expect(doppelte('<section aria-labelledby="a"><h2 id="a" tabindex="-1">X</h2></section>')).toEqual(['a']);
    expect(doppelte('<section aria-label="Schritt 1"><h2 id="a" tabindex="-1">X</h2></section>')).toEqual([]);
    expect(doppelte('<section aria-labelledby="a"><h2 id="a">X</h2></section>')).toEqual([]);
  });
  it('keine .svelte-Datei hat den Fehler (section und article)', () => {
    const f: Record<string, string[]> = {};
    for (const d of dateien(SRC)) { const v = doppelte(readFileSync(d, 'utf8')); if (v.length) f[d.slice(SRC.length)] = v; }
    expect(Object.keys(f)).toEqual([]);
    expect(dateien(SRC).length).toBeGreaterThan(100);
  });
});
