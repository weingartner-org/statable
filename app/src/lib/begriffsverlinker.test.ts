/** `fachbegriffeImBereich` (Welle 1): nur sichtbare Fachwort-Knöpfe, in Lesereihenfolge. Attrappen statt DOM. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fachbegriffeImBereich, FACHWORT_HINWEIS_ID } from './begriffsverlinker';

const knopf = (name: string, o: { versteckt?: boolean; flaechen?: number } = {}) =>
  ({ name, closest: (sel: string) => (o.versteckt && sel.includes('[hidden]') ? {} : null), getClientRects: () => ({ length: o.flaechen ?? 1 }) }) as unknown as HTMLButtonElement;
const wurzel = (...k: HTMLButtonElement[]) => ({ querySelectorAll: (sel: string) => { expect(sel).toBe('button.begriff-link'); return k; } }) as unknown as ParentNode;

describe('fachbegriffeImBereich', () => {
  it('liefert die Knöpfe in Reihenfolge', () => {
    const a = knopf('a'), b = knopf('b');
    expect(fachbegriffeImBereich(wurzel(a, b))).toEqual([a, b]);
  });
  it('lässt versteckte aus (hidden, inert, aria-hidden) und solche ohne Fläche (display:none)', () => {
    const a = knopf('a'), weg = knopf('weg', { versteckt: true }), keinePlatz = knopf('leer', { flaechen: 0 });
    expect(fachbegriffeImBereich(wurzel(a, weg, keinePlatz))).toEqual([a]);
  });
  it('ein leerer Bereich gibt eine leere Liste', () => { expect(fachbegriffeImBereich(wurzel())).toEqual([]); });
  it('der Hinweis hat eine feste Id', () => { expect(FACHWORT_HINWEIS_ID).toBe('begriff-hinweis'); });
});

/** Wächter Welle 7: Ein Fachwort-Knopf in `<summary>` ist ein Knopf im Knopf (axe nested-interactive). `summary` muss ausgenommen bleiben. */
describe('Verlinker lässt interaktive Elternteile aus', () => {
  const quelle = readFileSync(new URL('./begriffsverlinker.ts', import.meta.url), 'utf8');
  const ausser = /const AUSSER = '([^']+)'/.exec(quelle)?.[1].split(',') ?? [];
  for (const t of ['a', 'button', 'summary']) it(`${t} ist ausgenommen`, () => { expect(ausser).toContain(t); });
  /** Johannes 07.11.: In Überschriften sind Fachwörter reiner Text (NVDA las jedes Wort als Schalter mit Hinweis). Der Begriff muss im Text darunter anklickbar sein. */
  for (const t of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', '[role="heading"]']) it(`Überschrift ${t} ist ausgenommen`, () => { expect(ausser).toContain(t); });
});
