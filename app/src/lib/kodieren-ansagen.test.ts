/** Stufe 6c (VO2, VO3): Ansagen nach dem Fokuswechsel - Wortlaut und Wächter, dass sie verzögert (NACH_FOKUS_MS) kommen. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { s } from './sitzung.svelte';
import { ansichtSatz, codeBearbeitenSatz } from './kodieren-ansagen';

const quelle = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');
const funktion = (src: string, kopf: string): string => {
  const a = src.indexOf(kopf);
  expect(a, kopf).toBeGreaterThan(-1);
  const b = src.indexOf('\n  }\n', a);
  return src.slice(a, b);
};

describe('Wortlaut', () => {
  it('deutsch', () => {
    s.einst.sprache = 'de';
    expect(ansichtSatz('saetze', 3, 53)).toBe('Ansicht Sätze. Satz 3 von 53.');
    expect(ansichtSatz('text')).toBe('Ansicht Text.');
    expect(codeBearbeitenSatz('Planung')).toBe('Code bearbeiten: Planung.');
  });
  it('englisch', () => {
    s.einst.sprache = 'en';
    expect(ansichtSatz('saetze', 3, 53)).toBe('View sentences. Sentence 3 of 53.');
    expect(ansichtSatz('text')).toBe('View text.');
    expect(codeBearbeitenSatz('Planning')).toBe('Edit code: Planning.');
    s.einst.sprache = 'de';
  });
});

describe('VO2: Ansicht wechseln sagt erst nach dem Fokus an', () => {
  const f = funktion(quelle('../seiten/Kodieren.svelte'), 'async function wechsleAnsicht(');
  it('beide Ansichten über sageSpaeter mit NACH_FOKUS_MS, die alte Ansage wird zurückgenommen', () => {
    expect(f).toContain("sageSpaeter(ansichtSatz('saetze', fokusNr, sSaetze.length), NACH_FOKUS_MS)");
    expect(f).toContain("sageSpaeter(ansichtSatz('text'), NACH_FOKUS_MS)");
    expect((f.match(/nimmAnsicht\?\.\(\)/g) ?? []).length).toBe(2);
    expect(f).not.toMatch(/\bsage\(L\(`Ansicht|\bsage\(L\('Ansicht/);
  });
  it('erst der Fokus, dann die Ansage', () => {
    expect(f.indexOf('saetzeRef?.fokussiere()')).toBeLessThan(f.indexOf("ansichtSatz('saetze'"));
    expect(f.indexOf('textRef?.setzeAuswahl(')).toBeLessThan(f.indexOf("ansichtSatz('text')"));
  });
});

describe('VO3: Code bearbeiten sagt nach dem Fokus ins Feld den Code an', () => {
  const src = quelle('../bausteine/CodeBaum.svelte');
  const f = funktion(src, 'async function oeffneBearbeiten(');
  it('Fokus ins Feld „Name“, danach sageSpaeter mit NACH_FOKUS_MS', () => {
    const fok = f.indexOf("getElementById('ko-baum-name')?.focus()");
    const an = f.indexOf('sageSpaeter(codeBearbeitenSatz(');
    expect(fok).toBeGreaterThan(-1);
    expect(an).toBeGreaterThan(fok);
    expect(f).toContain('NACH_FOKUS_MS)');
  });
  it('Feld mit klarem Namen', () => {
    expect(src).toMatch(/<label for="ko-baum-name">\{L\('Name des Codes', 'Code name'/);
  });
  it('Fertig nimmt eine noch wartende Ansage zurück', () => {
    expect(funktion(src, 'async function fertig(')).toContain('nimmBearbeiten?.()');
  });
});
