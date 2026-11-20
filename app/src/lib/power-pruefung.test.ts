import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { satzPartiell } from './power';

/* S-F2 Prüfung N1 und N2: Zahlenformat der Sätze wie im Ergebnisfeld (Tausendertrennung nach Sprachprofil), echtes Minuszeichen. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
describe('Zahlenformat im Methodensatz (N1)', () => {
  it('N = 4 200 mit Tausendertrennung wie im Ergebnisfeld (ganzZahl des Sprachprofils), nicht „N = 4200“', () => {
    const t = satzPartiell({ rp: 0.05, k: 1, alpha: 0.05, ziel: 0.8, seiten: 2, weg: 'exakt', N: 4200 }, { en: false } as never);
    expect(t).not.toMatch(/N = 4200/); expect(t).toMatch(/N = 4\D200/);
  });
});

describe('Minuszeichen (N2)', () => {
  it('die Fehlersätze der Planen-Seite nutzen „−“ wie der Rest von Statable', async () => {
    const { readFileSync } = await import('node:fs');
    const q = readFileSync(new URL('../bausteine/PlanenF2.svelte', import.meta.url), 'utf8');
    expect(q).not.toMatch(/zwischen -1|von -1\/|between -1|from -1\//);
  });
});
