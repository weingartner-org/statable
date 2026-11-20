import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* Wächter (B3, B4): ehrliche Hinweise für Screenreader. Messung: docs/barrierefreiheit/NVDA-REST-B.md. */
const lies = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('B3: Esc mit Screenreader', () => {
  it('Kürzel-Dialog nennt Esc zweimal', () => { expect(lies('../bausteine/Kuerzelliste.svelte')).toContain('Esc zweimal drücken'); });
  it('Hilfe-Artikel Barrierefreiheit nennt Esc zweimal', () => { expect(lies('../hilfe/artikel-barrierefrei.ts')).toContain('Esc zweimal'); });
  it('Rechtliches nennt Esc zweimal', () => { expect(lies('../seiten/Rechtliches.svelte')).toContain('Esc zweimal'); });
});

describe('B4: Zifferntasten in Üben', () => {
  it('kein Hinweis unter jeder Frage (Johannes 13.11.2026: steht nur in der Hilfe)', () => {
    expect(lies('../bausteine/VerstehenUeben.svelte')).not.toContain('NVDA+Leertaste');
  });
  it('Hilfe-Artikel Barrierefreiheit nennt den Fokusmodus für Üben', () => { expect(lies('../hilfe/artikel-barrierefrei.ts')).toContain('NVDA+Leertaste'); });
  it('Antworten sind Knöpfe (Tab erreicht sie), Ziffer ist nur ein Zusatz', () => {
    const q = lies('../bausteine/VerstehenUeben.svelte');
    expect(q).toMatch(/<button type="button" class="ue-antwort"/);
    expect(q).toContain('<kbd aria-hidden="true">');
  });
});
