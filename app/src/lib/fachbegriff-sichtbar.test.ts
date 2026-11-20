import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { VERFAHREN } from './verfahren';

/** Regel Johannes 30.10.: Jede Alltagsfrage steht zusammen mit ihrem Fachbegriff. */
describe('Fachbegriff immer sichtbar', () => {
  it('jede Karte hat einen Fachbegriff', () => {
    for (const v of VERFAHREN) expect((v.zusatz ?? '').trim(), v.id).not.toBe('');
  });
  it('das Blatt zeigt die gewählte Karte und den Seitentipp mit Fachbegriff', () => {
    const blatt = readFileSync(new URL('../seiten/Blatt.svelte', import.meta.url), 'utf8');
    expect(blatt).toContain("{verfahren.titel.replace('?', '')} ({verfahren.zusatz})");
    expect(blatt).not.toMatch(/zeile: (verfahren|vf)\.titel\b/);
  });
});
